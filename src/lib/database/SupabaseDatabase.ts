import { VideoEntry } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { BaseDatabase } from './BaseDatabase';
import { videoUrlService } from '../services/videoUrlService';

/**
 * Supabase implementation of the video database
 */
export class SupabaseDatabase extends BaseDatabase {
  constructor() {
    super('SupabaseDB');
  }
  
  async getAllEntries(): Promise<VideoEntry[]> {
    try {
      this.logger.log("Getting all entries from media table");
      
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .select('*, assets(id, name, description, type, creator)')
        .eq('type', 'video')
        .order('created_at', { ascending: false });
      
      if (mediaError) {
        this.logger.error('Error getting media entries:', mediaError);
        return [];
      }
      
      this.logger.log(`Retrieved ${mediaData?.length || 0} media entries`);
      
      const entries: VideoEntry[] = mediaData.map(media => {
        const asset = media.assets && media.assets.length > 0 ? media.assets[0] : null;
        
        return {
          id: media.id,
          url: media.url,
          reviewer_name: media.creator || 'Unknown',
          skipped: false,
          created_at: media.created_at,
          admin_status: media.admin_status || 'Listed',
          user_status: media.user_status || null,
          user_id: media.user_id,
          metadata: {
            title: media.title,
            description: '',
            creator: 'self',
            classification: media.classification || 'art',
            loraName: asset?.name,
            loraDescription: asset?.description,
            assetId: asset?.id,
            isPrimary: false
          }
        };
      });

      const { data: assetMediaData, error: assetMediaError } = await supabase
        .from('assets')
        .select('id, primary_media_id');
      
      if (!assetMediaError && assetMediaData) {
        for (const entry of entries) {
          if (entry.metadata?.assetId) {
            const asset = assetMediaData.find(a => a.id === entry.metadata?.assetId);
            if (asset && asset.primary_media_id === entry.id) {
              entry.metadata.isPrimary = true;
            }
          }
        }
      }
      
      return entries;
    } catch (error) {
      this.logger.error('Error getting entries:', error);
      return [];
    }
  }
  
  async updateEntry(id: string, update: Partial<VideoEntry>): Promise<VideoEntry | null> {
    try {
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .update({
          title: update.metadata?.title,
          classification: update.metadata?.classification,
          creator: update.metadata?.creatorName || update.reviewer_name,
          admin_status: update.admin_status
        })
        .eq('id', id)
        .select()
        .single();
      
      if (mediaError) {
        this.logger.error(`Error updating media ${id}:`, mediaError);
        return null;
      }
      
      if (update.metadata?.assetId) {
        const { error: assetError } = await supabase
          .from('assets')
          .update({
            name: update.metadata.loraName,
            description: update.metadata.loraDescription,
            creator: update.metadata.creatorName || update.reviewer_name,
            admin_status: update.admin_status,
            user_status: update.user_status
          })
          .eq('id', update.metadata.assetId);
        
        if (assetError) {
          this.logger.error(`Error updating asset ${update.metadata.assetId}:`, assetError);
        }
      }
      
      const updatedEntry: VideoEntry = {
        id: mediaData.id,
        url: mediaData.url,
        reviewer_name: mediaData.creator || 'Unknown',
        skipped: update.skipped || false,
        created_at: mediaData.created_at,
        admin_status: mediaData.admin_status || 'Listed',
        user_status: mediaData.user_status || null,
        user_id: mediaData.user_id,
        metadata: {
          title: mediaData.title,
          description: update.metadata?.description || '',
          creator: update.metadata?.creator || 'self',
          classification: mediaData.classification || 'art',
          loraName: update.metadata?.loraName,
          loraDescription: update.metadata?.loraDescription,
          assetId: update.metadata?.assetId,
          isPrimary: update.metadata?.isPrimary || false
        }
      };
      
      return updatedEntry;
    } catch (error) {
      this.logger.error(`Error updating entry ${id}:`, error);
      return null;
    }
  }
  
  async markAsSkipped(id: string): Promise<VideoEntry | null> {
    return this.updateEntry(id, { skipped: true });
  }
  
  async setApprovalStatus(id: string, status: string): Promise<VideoEntry | null> {
    this.logger.log(`Setting admin status for media ${id} to ${status}`);
    return this.updateEntry(id, { admin_status: status });
  }
  
  async getVideoUrl(videoLocation: string): Promise<string> {
    return videoUrlService.getVideoUrl(videoLocation);
  }

  async deleteEntry(id: string): Promise<boolean> {
    this.logger.error("deleteEntry not implemented in base SupabaseDatabase class");
    return false;
  }
  
  async clearAllEntries(): Promise<void> {
    this.logger.error("clearAllEntries not implemented in base SupabaseDatabase class");
  }
  
  async addEntry(entry: Omit<VideoEntry, 'id' | 'created_at' | 'admin_status' | 'user_status'>): Promise<VideoEntry> {
    this.logger.error("addEntry not implemented in base SupabaseDatabase class");
    throw new Error("Method not implemented");
  }
}
