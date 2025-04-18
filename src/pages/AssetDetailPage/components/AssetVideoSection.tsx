import React, { useState, useEffect, useMemo } from 'react';
import { VideoEntry, LoraAsset, VideoDisplayStatus } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import VideoCard from '@/components/video/VideoCard';
import LoRAVideoUploader from '@/components/lora/LoRAVideoUploader';
import { useAuth } from '@/hooks/useAuth';
import { Logger } from '@/lib/logger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Masonry from 'react-masonry-css';
import { DummyCard, generateDummyItems } from '@/components/common/DummyCard';
import { useLocation } from 'react-router-dom';

const logger = new Logger('AssetVideoSection');

const breakpointColumnsObj = {
  default: 3,
  1100: 3,
  700: 2,
  500: 1
};

const isVideoEntry = (item: VideoEntry | { type: 'dummy' }): item is VideoEntry => {
  return !('type' in item && item.type === 'dummy');
};

interface AssetVideoSectionProps {
  asset: LoraAsset | null;
  videos: VideoEntry[];
  isAdmin: boolean;
  onOpenLightbox: (video: VideoEntry) => void;
  handleApproveVideo: (videoId: string) => Promise<void>;
  handleDeleteVideo: (videoId: string) => Promise<void>;
  handleRejectVideo: (videoId: string) => Promise<void>;
  handleSetPrimaryMedia: (mediaId: string) => Promise<void>;
  isAuthorized: boolean;
  onStatusChange: (videoId: string, newStatus: VideoDisplayStatus, type: 'assetMedia' | 'user') => void;
}

const AssetVideoSection: React.FC<AssetVideoSectionProps> = ({
  asset,
  videos,
  isAdmin,
  onOpenLightbox,
  handleApproveVideo,
  handleDeleteVideo,
  handleRejectVideo,
  handleSetPrimaryMedia,
  isAuthorized,
  onStatusChange
}) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isLoraPage = pathname.includes('/assets/loras/');
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [classification, setClassification] = useState<'all' | 'generation' | 'art'>('all');
  
  const handleHoverChange = (videoId: string, isHovering: boolean) => {
    logger.log(`Hover change: ${videoId}, ${isHovering}`);
    setHoveredVideoId(isHovering ? videoId : null);
  };
  
  const sortedAndFilteredVideos = useMemo(() => {
    if (!videos) return [];
    
    let currentVideos = videos;
    if (classification !== 'all') {
      currentVideos = videos.filter(video => {
        const videoClassification = video.metadata?.classification?.toLowerCase();
        if (classification === 'generation') {
          return videoClassification === 'generation';
        }
        if (classification === 'art') {
          return videoClassification === 'art';
        }
        return false;
      });
    }

    return currentVideos.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      
      const statusOrder: Record<VideoDisplayStatus, number> = { 'Pinned': 1, 'View': 2, 'Hidden': 3 };
      const statusA = a.assetMediaDisplayStatus || 'View';
      const statusB = b.assetMediaDisplayStatus || 'View';
      
      const orderA = statusOrder[statusA] ?? 2;
      const orderB = statusOrder[statusB] ?? 2;

      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [videos, classification]);

  const getItemsWithDummies = <T extends VideoEntry>(
    allItems: T[]
  ): Array<T | { type: 'dummy'; id: string; colorClass: string }> => {
    if (allItems.length > 4 && allItems.length < 10) {
      const dummyItems = generateDummyItems(6, allItems.length);
      return [...allItems, ...dummyItems];
    } else {
      return allItems;
    }
  };

  const videosToDisplay = useMemo(() => {
    if (isAuthorized) {
      logger.log(`Authorized user, showing all videos: ${sortedAndFilteredVideos.length}`);
      return sortedAndFilteredVideos;
    } else {
      logger.log(`Non-authorized user, filtering out hidden videos`);
      const filtered = sortedAndFilteredVideos.filter(video => video.assetMediaDisplayStatus !== 'Hidden');
      logger.log(`Filtered videos count: ${filtered.length}`);
      return filtered;
    }
  }, [sortedAndFilteredVideos, isAuthorized]);

  const itemsToDisplay = useMemo(() => getItemsWithDummies(videosToDisplay), [videosToDisplay]);
  
  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-muted-foreground">Videos made with this:</h2>
        <Select 
          value={classification} 
          onValueChange={(value: string) => setClassification(value as 'all' | 'generation' | 'art')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Videos</SelectItem>
            <SelectItem value="generation">Generation</SelectItem>
            <SelectItem value="art">Art</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="mb-4">
        <LoRAVideoUploader 
          assetId={asset?.id || ''} 
          assetName={asset?.name || ''} 
          onUploadsComplete={() => { /* TODO: Consider refetch or update */ }}
          isLoggedIn={!!user}
        />
      </div>
      
      {videosToDisplay.length > 0 ? (
        <div className="relative masonry-fade-container pt-6 max-h-[85vh] md:max-h-[70vh] lg:max-h-[85vh]">
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {itemsToDisplay.map(item => {
              if (isVideoEntry(item)) {
                return (
                  <VideoCard
                    key={item.id}
                    video={item}
                    isAdmin={isAdmin}
                    isAuthorized={isAuthorized}
                    onOpenLightbox={onOpenLightbox}
                    onApproveVideo={handleApproveVideo}
                    onDeleteVideo={handleDeleteVideo}
                    onRejectVideo={handleRejectVideo}
                    onSetPrimaryMedia={handleSetPrimaryMedia}
                    isHovering={hoveredVideoId === item.id}
                    onHoverChange={(isHovering) => handleHoverChange(item.id, isHovering)}
                    onUpdateLocalVideoStatus={onStatusChange}
                  />
                );
              } else {
                return (
                  <DummyCard
                    key={item.id}
                    id={item.id}
                    colorClass={item.colorClass}
                  />
                );
              }
            })}
          </Masonry>
          {!isLoraPage && <div className="fade-overlay-element"></div>}
        </div>
      ) : (
        <EmptyState 
          title="No Videos"
          description={classification === 'all' 
            ? "No videos are currently associated with this LoRA."
            : `No ${classification} videos found for this LoRA.`}
        />
      )}
    </div>
  );
};

export default AssetVideoSection;
