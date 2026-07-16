import crypto from 'crypto';
import { supabase } from '../../utils/supabaseClient';
import { OverrideHandler } from './overrideHandler';

export class DbSeeder {
  /**
   * Helper to calculate a SHA-256 hash string for raw payloads to deduplicate snapshots.
   */
  static getPayloadHash(payload: any): string {
    const jsonStr = JSON.stringify(payload);
    return crypto.createHash('sha256').update(jsonStr).digest('hex');
  }

  /**
   * Saves raw API payload to the RAW LAYER (source_snapshots).
   */
  static async saveSourceSnapshot(runId: string, entityId: string, entityType: string, rawPayload: any): Promise<string | null> {
    try {
      const hash = this.getPayloadHash(rawPayload);
      
      // Attempt insert
      const { data, error } = await supabase
        .from('source_snapshots')
        .insert({
          run_id: runId,
          entity_id: entityId,
          entity_type: entityType,
          raw_payload: rawPayload,
          raw_payload_hash: hash
        })
        .select('id');
      
      if (error) {
        // If conflict on hash, fetch the existing ID
        const { data: existing } = await supabase
          .from('source_snapshots')
          .select('id')
          .eq('entity_id', entityId)
          .eq('entity_type', entityType)
          .eq('raw_payload_hash', hash);
        
        return existing?.[0]?.id || null;
      }
      
      return data?.[0]?.id || null;
    } catch (e) {
      console.error('[DbSeeder] Failed to save source snapshot:', e);
      return null;
    }
  }

  /**
   * Syncs staging playlist records.
   */
  static async syncStagingPlaylist(runId: string, playlist: {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    videoCount: number;
    channelId: string;
    sourceSnapshotId: string | null;
    contentType: string;
    academicType: string;
  }): Promise<void> {
    const isLocked = await OverrideHandler.isPlaylistLocked(playlist.id);
    if (isLocked) {
      console.log(`[DbSeeder] Playlist ${playlist.id} is locked. Crawler update skipped.`);
      return;
    }

    try {
      // Get current title to log mutations
      const { data: current } = await supabase
        .from('staging_playlists')
        .select('title')
        .eq('id', playlist.id)
        .limit(1);

      if (current && current.length > 0 && current[0].title !== playlist.title) {
        await OverrideHandler.logMutation({
          runId,
          entityId: playlist.id,
          entityType: 'playlist',
          fieldName: 'title',
          oldValue: current[0].title,
          newValue: playlist.title
        });
      }

      await supabase.from('staging_playlists').upsert({
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        thumbnail_url: playlist.thumbnailUrl,
        video_count: playlist.videoCount,
        channel_id: playlist.channelId,
        source_snapshot_id: playlist.sourceSnapshotId,
        content_type: playlist.contentType,
        academic_type: playlist.academicType,
        taxonomy_version: 'v1.0.0',
        last_synced_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('[DbSeeder] Failed to sync staging playlist:', e);
    }
  }

  /**
   * Syncs staging video records.
   */
  static async syncStagingVideo(runId: string, video: {
    id: string;
    title: string;
    videoUrl: string;
    durationSeconds: number;
    thumbnailUrl: string;
    playlistId: string;
    sourceSnapshotId: string | null;
    contentType: string;
    academicType: string;
  }): Promise<void> {
    const isLocked = await OverrideHandler.isVideoLocked(video.id);
    if (isLocked) {
      return;
    }

    try {
      await supabase.from('staging_videos').upsert({
        id: video.id,
        title: video.title,
        video_url: video.videoUrl,
        duration_seconds: video.durationSeconds,
        thumbnail_url: video.thumbnailUrl,
        playlist_id: video.playlistId,
        source_snapshot_id: video.sourceSnapshotId,
        content_type: video.contentType,
        academic_type: video.academicType,
        taxonomy_version: 'v1.0.0',
        last_synced_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('[DbSeeder] Failed to sync staging video:', e);
    }
  }

  /**
   * Publishes high-confidence staging items directly into the public tables.
   */
  static async publishHighConfidenceItems(runId: string): Promise<void> {
    try {
      // 1. Fetch approved staging playlists
      const { data: playlists } = await supabase
        .from('staging_playlists')
        .select('*')
        .eq('review_status', 'pending')
        .gte('confidence_score', 80.0);
      
      if (playlists) {
        for (const pl of playlists) {
          // Publish to public.playlists
          await supabase.from('playlists').upsert({
            id: pl.id,
            title: pl.title,
            description: pl.description,
            thumbnail: pl.thumbnail_url,
            category: pl.academic_type || 'playlist',
            lectures_count: pl.video_count,
            is_active: true,
            updated_at: new Date().toISOString()
          });
        }
      }

      // 2. Fetch approved staging videos
      const { data: videos } = await supabase
        .from('staging_videos')
        .select('*')
        .eq('review_status', 'pending')
        .gte('confidence_score', 80.0);
      
      if (videos) {
        for (const v of videos) {
          // Resolve playlist category
          const { data: pl } = await supabase
            .from('staging_playlists')
            .select('academic_type')
            .eq('id', v.playlist_id)
            .single();

          // Publish to public.videos
          await supabase.from('videos').upsert({
            id: v.id,
            title: v.title,
            video_url: v.video_url,
            duration: `${Math.floor(v.duration_seconds / 60)}m`,
            playlist_id: v.playlist_id,
            thumbnail_url: v.thumbnail_url,
            subject: pl?.academic_type || 'Unknown',
            is_active: true,
            updated_at: new Date().toISOString()
          });
        }
      }
      
      console.log(`✨ [DbSeeder] Successfully published high confidence items to production.`);
    } catch (e) {
      console.error('[DbSeeder] Failed to publish items:', e);
    }
  }
}
