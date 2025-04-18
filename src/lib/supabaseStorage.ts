
import { supabase } from '@/integrations/supabase/client';
import { VideoFile } from './types';

class SupabaseVideoStorage {
  private readonly DEBUG = true;
  private readonly BUCKET_NAME = 'videos';

  // Upload a video to Supabase Storage
  async uploadVideo(videoFile: VideoFile): Promise<{ url: string; storagePath: string }> {
    try {
      this.log(`Uploading video ${videoFile.id} to Supabase Storage`);
      
      // Create a folder-like structure with video ID
      const filePath = `${videoFile.id}.webm`;
      
      // Upload the file (handle both Blob and File objects)
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, videoFile.blob, {
          contentType: 'video/webm',
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);
      
      this.log(`Video uploaded successfully, URL: ${urlData.publicUrl}, Path: ${filePath}`);
      return {
        url: urlData.publicUrl,
        storagePath: filePath
      };
    } catch (error) {
      this.error('Failed to upload video:', error);
      throw error;
    }
  }

  // Delete a video from Supabase Storage
  async deleteVideo(fileUrl: string): Promise<boolean> {
    try {
      // Extract the file path from the URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts[pathParts.length - 1];
      
      this.log(`Deleting video from Supabase Storage: ${filePath}`);
      
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);
      
      if (error) {
        throw error;
      }
      
      this.log(`Video deleted from Supabase Storage: ${filePath}`);
      return true;
    } catch (error) {
      this.error('Failed to delete video from Supabase Storage:', error);
      return false;
    }
  }

  // Get a video URL from Supabase Storage
  getVideoUrl(fileUrl: string): string {
    return fileUrl; // Already a public URL
  }
  
  // Regenerate a public URL for a video
  async refreshVideoUrl(storagePath: string): Promise<string | null> {
    try {
      if (!storagePath) {
        this.warn('Cannot refresh URL: No storage path provided');
        return null;
      }
      
      this.log(`Regenerating public URL for path: ${storagePath}`);
      
      const { data } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(storagePath);
      
      if (data && data.publicUrl) {
        this.log(`Regenerated URL: ${data.publicUrl}`);
        return data.publicUrl;
      }
      
      return null;
    } catch (error) {
      this.error('Failed to refresh video URL:', error);
      return null;
    }
  }
  
  // Utility methods for logging
  private log(...args: any[]): void {
    if (this.DEBUG) console.log('[SupabaseStorage]', ...args);
  }

  private warn(...args: any[]): void {
    if (this.DEBUG) console.warn('[SupabaseStorage]', ...args);
  }

  private error(...args: any[]): void {
    console.error('[SupabaseStorage]', ...args);
  }
}

export const supabaseStorage = new SupabaseVideoStorage();
