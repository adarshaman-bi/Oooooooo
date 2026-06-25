// src/services/LectureSerializer.ts
import { MediaResolverService } from './MediaResolverService'; // Implemented in Phase 2

export interface RawRowJoinResult {
  video_id: string;
  video_title: string;
  video_description: string | null;
  video_thumbnail_path: string; // Aligned with updated SQL alias
  video_duration: number;
  channel_id: string;
  channel_name: string;
  channel_avatar_path: string | null;
  channel_banner_path: string | null;
  raw_subscriber_count: number;
}

export interface LectureWithChannelDTO {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  channel: {
    id: string;
    name: string;
    avatarUrl: string;
    bannerUrl: string | null;
    subscriberCountFormatted: string;
  };
}

export function formatSubscriberCount(count: number): string {
  if (!count || isNaN(count)) return "0";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return count.toString();
}

/**
 * FIXED CORE CONTROLLER
 * Explicitly resolves relative DB storage tags into absolute CDN Delivery Edge addresses
 */
export function serializeRelationToDTO(rawRow: RawRowJoinResult): LectureWithChannelDTO {
  return {
    id: rawRow.video_id,
    title: rawRow.video_title,
    description: rawRow.video_description || "",
    
    // Outputs raw string path directly from the database record, leaving resolution to the client-side component layer
    thumbnailUrl: rawRow.video_thumbnail_path || "",
    
    duration: Number(rawRow.video_duration) || 0,
    channel: {
      id: rawRow.channel_id,
      name: rawRow.channel_name || "Verified Educator",
      
      // Outputs raw string path directly
      avatarUrl: rawRow.channel_avatar_path || "",
      
      // Outputs raw string path directly
      bannerUrl: rawRow.channel_banner_path || null,
      
      subscriberCountFormatted: formatSubscriberCount(Number(rawRow.raw_subscriber_count) || 0)
    }
  };
}
