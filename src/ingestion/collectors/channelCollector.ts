import { youtubeRequest } from '../api/youtubeClient';
import { supabase } from '../../utils/supabaseClient';

export class ChannelCollector {
  /**
   * Fetches official channel metadata from YouTube API and saves a raw snapshot.
   */
  static async collectChannelMetadata(runId: string, channelId: string): Promise<any> {
    console.log(`📡 [ChannelCollector] Fetching channel metadata for ${channelId}...`);
    try {
      const data = await youtubeRequest('channels', {
        part: 'snippet,statistics,brandingSettings',
        id: channelId
      });

      const channelItem = data?.items?.[0];
      if (!channelItem) {
        throw new Error(`Channel ${channelId} not found on YouTube.`);
      }

      return channelItem;
    } catch (e: any) {
      console.error(`❌ [ChannelCollector] Failed to fetch channel ${channelId}:`, e);
      throw e;
    }
  }
}
