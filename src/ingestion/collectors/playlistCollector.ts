import { fetchAllChannelPlaylists } from '../api/youtubeClient';
import { supabase } from '../../utils/supabaseClient';
import { DbSeeder } from '../db/dbSeeder';

export class PlaylistCollector {
  /**
   * Crawls all playlists hosted on a channel and pushes new playlists to the staging DB.
   */
  static async collectChannelPlaylists(runId: string, channelId: string): Promise<any[]> {
    console.log(`📡 [PlaylistCollector] Crawling playlists for channel ${channelId}...`);
    try {
      const playlists = await fetchAllChannelPlaylists(channelId);
      
      // Save raw response payload to snapshots layer
      await DbSeeder.saveSourceSnapshot(runId, channelId, 'channel_playlists', playlists);

      return playlists;
    } catch (e: any) {
      console.error(`❌ [PlaylistCollector] Failed to crawl playlists for channel ${channelId}:`, e);
      throw e;
    }
  }
}
