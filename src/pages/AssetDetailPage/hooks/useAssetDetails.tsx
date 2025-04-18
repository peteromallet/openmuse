import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LoraAsset, VideoEntry, VideoDisplayStatus, VideoMetadata } from '@/lib/types';
import { toast } from 'sonner';
import { videoUrlService } from '@/lib/services/videoUrlService';
import { Logger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

const logger = new Logger('useAssetDetails');

// Helper type guard for allowed model strings
const isValidModel = (model: string | undefined): model is VideoMetadata['model'] => {
  if (!model) return false;
  const allowedModels = ['wan', 'hunyuan', 'ltxv', 'cogvideox', 'animatediff'];
  return allowedModels.includes(model.toLowerCase());
};

export const useAssetDetails = (assetId: string | undefined) => {
  const [asset, setAsset] = useState<LoraAsset | null>(null);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataFetchAttempted, setDataFetchAttempted] = useState(false);
  const [creatorDisplayName, setCreatorDisplayName] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();

  const fetchAssetDetails = useCallback(async () => {
    if (!assetId) {
      toast.error('No asset ID provided');
      setIsLoading(false);
      setDataFetchAttempted(true);
      return;
    }

    setIsLoading(true);
    try {
      logger.log('[useAssetDetails] Fetching core asset details for ID:', assetId);
      
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select(`*, primaryVideo:primary_media_id(*)`)
        .eq('id', assetId)
        .maybeSingle();

      if (assetError) {
        logger.error('[useAssetDetails] Error fetching asset:', assetError);
        throw assetError;
      }

      if (!assetData) {
        logger.error('[useAssetDetails] No asset found with ID:', assetId);
        setAsset(null);
        setVideos([]);
        setIsLoading(false);
        setDataFetchAttempted(true);
        return;
      }

      logger.log(`[useAssetDetails] Fetched asset user_status: ${assetData.user_status}`);

      logger.log(`[useAssetDetails] Fetching asset_media joined with media for asset ID: ${assetId}`);
      const { data: assetMediaJoinData, error: assetMediaJoinError } = await supabase
        .from('asset_media')
        .select(`
          status,
          is_primary,
          media:media_id!inner(*)
        `)
        .eq('asset_id', assetId);

      if (assetMediaJoinError) {
        logger.error('[useAssetDetails] Error fetching asset_media joined data:', assetMediaJoinError);
        throw assetMediaJoinError;
      }

      const fetchedAssetMedia = assetMediaJoinData || [];
      logger.log(`[useAssetDetails] Fetched ${fetchedAssetMedia.length} asset_media join records.`);
      logger.log('[loraorderingbug] Raw asset_media join data:', fetchedAssetMedia);

      const pVideo = assetData.primaryVideo;
      logger.log(`[VideoLightboxDebug] Processing asset: ${assetData.id}, Fetched Primary Video Data (pVideo):`, {
          exists: !!pVideo,
          id: pVideo?.id,
          url: pVideo?.url,
          placeholder: pVideo?.placeholder_image,
          title: pVideo?.title
      });

      const validModel = isValidModel(assetData.lora_base_model) ? assetData.lora_base_model : undefined;

      const processedAsset: LoraAsset = {
          id: assetData.id,
          name: assetData.name,
          description: assetData.description,
          creator: assetData.creator,
          type: assetData.type,
          created_at: assetData.created_at,
          user_id: assetData.user_id,
          primary_media_id: assetData.primary_media_id,
          admin_status: assetData.admin_status,
          user_status: assetData.user_status,
          lora_type: assetData.lora_type,
          lora_base_model: assetData.lora_base_model,
          model_variant: assetData.model_variant,
          lora_link: assetData.lora_link,
          primaryVideo: pVideo ? {
              id: pVideo.id,
              url: pVideo.url,
              reviewer_name: (pVideo as any)?.creator || '',
              skipped: false,
              created_at: pVideo.created_at,
              assetMediaDisplayStatus: (pVideo as any)?.status as VideoDisplayStatus || 'View',
              user_id: pVideo.user_id,
              user_status: (pVideo as any)?.user_status as VideoDisplayStatus || null,
              metadata: {
                  title: pVideo.title || '',
                  placeholder_image: pVideo.placeholder_image || null,
                  description: pVideo.description,
                  creator: (pVideo as any)?.creator ? 'self' : undefined,
                  creatorName: (pVideo as any)?.creator_name,
                  classification: (pVideo as any)?.classification,
                  loraName: assetData.name,
                  assetId: assetData.id,
                  loraType: assetData.lora_type,
                  model: validModel,
                  modelVariant: assetData.model_variant,
              }
          } : undefined
      };
      
      setAsset(processedAsset);

      const convertedVideos: VideoEntry[] = await Promise.all(
        fetchedAssetMedia
          .filter(item => item.media)
          .map(async (item: any) => {
          const media = item.media;
          logger.log(`{ITEMSHOWINGBUG} Processing joined item for VideoEntry (media ID: ${media?.id}, asset_media status: ${item.status}, is_primary: ${item.is_primary}):`, item);
          try {
            const videoUrl = media.url ? await videoUrlService.getVideoUrl(media.url) : null; 
            if (!videoUrl) {
              logger.warn(`[useAssetDetails] Could not get video URL for media ID: ${media.id}`);
              return null;
            }
            
            const isPrimary = item.is_primary === true; 
 
            const assignedStatus = (item.status as VideoDisplayStatus) || 'View'; 
            logger.log(`[loraorderingbug] Processing Video ${media.id}: Assigned status '${assignedStatus}' (from asset_media.status: ${item.status}, is_primary: ${item.is_primary})`);

            return {
              id: media.id,
              url: videoUrl,
              associatedAssetId: assetId,
              is_primary: isPrimary,
              reviewer_name: media.creator || 'Unknown',
              skipped: false,
              created_at: media.created_at,
              assetMediaDisplayStatus: assignedStatus,
              user_id: media.user_id,
              user_status: (media.user_status as VideoDisplayStatus) || null,
              metadata: {
                title: media.title || '',
                description: media.description || '',
                placeholder_image: media.placeholder_image || null,
                classification: media.classification,
                model: processedAsset.lora_base_model || media.type,
                loraName: processedAsset.name,
                loraDescription: processedAsset.description,
                assetId: processedAsset.id,
                loraType: processedAsset.lora_type,
                loraLink: processedAsset.lora_link,
                creator: media.creator ? 'self' : undefined,
                creatorName: media.creator_name,
                modelVariant: processedAsset.model_variant,
              }
            } as VideoEntry;
          } catch (error) {
            logger.error(`[useAssetDetails] Error processing video ${media.id}:`, error);
            return null;
          }
        })
      );

      const validVideos = convertedVideos.filter(v => v !== null) as VideoEntry[];
      logger.log(`[useAssetDetails] Processed ${validVideos.length} valid videos from join data.`);

      const isViewerAuthorized = isAdmin || (!!user && user.id === assetData?.user_id);
      logger.log(`[useAssetDetails] Viewer authorization check: isAdmin=${isAdmin}, user.id=${user?.id}, asset.user_id=${assetData?.user_id}, isAuthorized=${isViewerAuthorized}`);

      const filteredVideos = isViewerAuthorized
        ? validVideos
        : validVideos.filter(v => v.assetMediaDisplayStatus !== 'Hidden');
      logger.log(`[useAssetDetails] Filtered videos count (Hidden removed for non-auth): ${filteredVideos.length}`);

      const statusOrder: { [key in VideoDisplayStatus]: number } = { Pinned: 1, View: 2, Hidden: 3 };
      
      const sortedVideos = filteredVideos.sort((a, b) => {
        // Get statuses with default 'View'
        const statusA = a.assetMediaDisplayStatus || 'View';
        const statusB = b.assetMediaDisplayStatus || 'View';

        // Special case: Primary video should be first unless it's hidden
        if (statusA !== 'Hidden' && statusB !== 'Hidden') {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
        }

        // Then sort by status
        const orderA = statusOrder[statusA] || 2;
        const orderB = statusOrder[statusB] || 2;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }

        // If same status, sort by date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      logger.log(`[useAssetDetails] Sorted videos count: ${sortedVideos.length}`);

      logger.log('[loraorderingbug] Final sorted video IDs and statuses (before setting state):', sortedVideos.map(v => `${v.id} (Status: ${v.assetMediaDisplayStatus}, Primary: ${v.is_primary})`));

      setVideos(sortedVideos);
      logger.log('{ITEMSHOWINGBUG} Final VideoEntry array being set to state:', sortedVideos);

    } catch (error) {
      logger.error('[useAssetDetails] Error in fetchAssetDetails:', error);
      toast.error('Failed to load asset details');
      setAsset(null);
      setVideos([]);
    } finally {
      setIsLoading(false);
      setDataFetchAttempted(true);
    }
  }, [assetId, user, isAdmin]);

  useEffect(() => {
    if (!dataFetchAttempted && assetId) {
      fetchAssetDetails();
    }
  }, [fetchAssetDetails, dataFetchAttempted, assetId]);

  useEffect(() => {
    const fetchCreatorProfile = async () => {
      if (asset?.user_id) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', asset.user_id)
          .maybeSingle();
        
        logger.log('[useAssetDetails] Asset User Profile fetch result:', { profile, error });
        
        if (profile && !error) {
          setCreatorDisplayName(profile.display_name || profile.username);
        }
      }
    };
    if (asset?.user_id) {
      fetchCreatorProfile();
    } else {
      setCreatorDisplayName(null);
    }
  }, [asset]);

  const getCreatorName = () => {
    return creatorDisplayName || asset?.creator || 'Unknown';
  };
  
  const updateAssetUserStatus = useCallback(async (newStatus: string) => {
      const isAuthorized = isAdmin || (!!user && user.id === asset?.user_id);

      if (!isAuthorized) {
          logger.warn('[updateAssetUserStatus] Unauthorized attempt to update asset status.');
          toast.error("You don't have permission to change this asset's status.");
          return;
      }
      if (!asset) {
          logger.warn('[updateAssetUserStatus] Asset data not available.');
          return;
      }

      const optimisticPreviousStatus = asset.user_status;
      setAsset(prev => prev ? { ...prev, user_status: newStatus } : null);

      try {
          logger.log(`[updateAssetUserStatus] Updating assets table for ID ${asset.id}, setting user_status to ${newStatus}`);
          const { error } = await supabase
              .from('assets')
              .update({ user_status: newStatus })
              .eq('id', asset.id);

          if (error) throw error;

          toast.success(`Asset status updated to ${newStatus}`);

      } catch (error) {
          logger.error(`[updateAssetUserStatus] Error setting status to ${newStatus}:`, error);
          toast.error(`Failed to set status to ${newStatus}`);
          setAsset(prev => prev ? { ...prev, user_status: optimisticPreviousStatus } : null);
      }
  }, [user, isAdmin, asset]);

  const updateLocalVideoStatus = useCallback((videoId: string, newStatus: VideoDisplayStatus, type: 'assetMedia' | 'user') => {
    setVideos(prevVideos => {
      const statusOrder: { [key in VideoDisplayStatus]: number } = { Pinned: 1, View: 2, Hidden: 3 };
      
      const updatedVideos = prevVideos.map(video => {
        if (video.id === videoId) {
          logger.log(`[useAssetDetails/updateLocalVideoStatus] Updating video ${videoId} - Setting ${type} status to ${newStatus}`);
          return { 
            ...video, 
            assetMediaDisplayStatus: type === 'assetMedia' ? newStatus : video.assetMediaDisplayStatus,
            user_status: type === 'user' ? newStatus : video.user_status
          };
        }
        return video;
      });
      
      const sortedVideos = updatedVideos.sort((a, b) => {
         const statusA = a.assetMediaDisplayStatus || 'View';
        const statusB = b.assetMediaDisplayStatus || 'View';

        if (statusA !== 'Hidden' && statusB !== 'Hidden') {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
        }

        const orderA = statusOrder[statusA] || 2;
        const orderB = statusOrder[statusB] || 2;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      logger.log(`[useAssetDetails/updateLocalVideoStatus] State updated for video ${videoId}. New sorted order:`, sortedVideos.map(v => `${v.id} (Status: ${v.assetMediaDisplayStatus})`));
      return sortedVideos;
    });
  }, []);

  const updateLocalPrimaryMedia = useCallback((newPrimaryMediaId: string | null) => {
    setAsset(prevAsset => {
      if (!prevAsset) return null;
      return { ...prevAsset, primary_media_id: newPrimaryMediaId };
    });
    setVideos(prevVideos => prevVideos.map(v => ({
      ...v,
      is_primary: v.id === newPrimaryMediaId
    })));
  }, []);
  
  const removeVideoLocally = useCallback((videoId: string) => {
     setVideos(prevVideos => prevVideos.filter(v => v.id !== videoId));
     logger.log(`[useAssetDetails] Video ${videoId} removed locally.`);
  }, []);

  return {
    asset,
    videos,
    isLoading,
    dataFetchAttempted,
    creatorDisplayName,
    getCreatorName,
    fetchAssetDetails,
    setAsset,
    setDataFetchAttempted,
    updateLocalVideoStatus,
    updateLocalPrimaryMedia,
    removeVideoLocally,
    updateAssetUserStatus
  };
};
