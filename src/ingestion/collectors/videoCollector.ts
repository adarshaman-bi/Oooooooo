import { fetchAllPlaylistItems, fetchVideoDetailsBatch } from '../api/youtubeClient';
import { DbSeeder } from '../db/dbSeeder';

export interface ResourceLink {
  type: 'pdf' | 'telegram' | 'drive' | 'app_link' | 'other';
  url: string;
}

export class VideoCollector {
  /**
   * Crawls all videos inside a playlist and enriches details via batch queries.
   */
  static async collectPlaylistVideos(runId: string, playlistId: string): Promise<any[]> {
    console.log(`📡 [VideoCollector] Crawling videos for playlist ${playlistId}...`);
    try {
      const items = await fetchAllPlaylistItems(playlistId);
      
      // Save raw response payload to snapshots layer
      await DbSeeder.saveSourceSnapshot(runId, playlistId, 'playlist_items', items);

      return items;
    } catch (e: any) {
      console.error(`❌ [VideoCollector] Failed to crawl videos for playlist ${playlistId}:`, e);
      throw e;
    }
  }

  /**
   * Parse descriptions to extract official notes, PDFs, Drive links, and assignments
   */
  static extractResourceLinks(description: string | undefined | null): ResourceLink[] {
    if (!description) return [];
    const links: ResourceLink[] = [];

    // Simple URL regex matching
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = description.match(urlRegex);

    if (matches) {
      for (const url of matches) {
        const cleanUrl = url.replace(/[.,;:]$/, ''); // clean trailing punctuation
        const lowerUrl = cleanUrl.toLowerCase();

        if (lowerUrl.includes('.pdf')) {
          links.push({ type: 'pdf', url: cleanUrl });
        } else if (lowerUrl.includes('t.me') || lowerUrl.includes('telegram')) {
          links.push({ type: 'telegram', url: cleanUrl });
        } else if (lowerUrl.includes('drive.google.com')) {
          links.push({ type: 'drive', url: cleanUrl });
        } else if (lowerUrl.includes('physicswallah.live') || lowerUrl.includes('pw.live')) {
          links.push({ type: 'app_link', url: cleanUrl });
        }
      }
    }

    return links;
  }
}
