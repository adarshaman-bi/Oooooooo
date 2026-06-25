import axios from 'axios';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // Keep this in your .env file
const GOOGLE_API_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

interface CachedData {
  timestamp: number;
  videos: SanitizedVideo[];
}

interface SanitizedVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  description: string;
}

// In-memory simple cache to prevent quota draining on page reloads
const videoCache: Record<string, CachedData> = {};
const CACHE_DURATION = 15 * 60 * 1000; // 15 Minutes

export const getLiveTeacherLectures = async (playlistId: string): Promise<SanitizedVideo[]> => {
  // 1. Antigravity Guard: Check cache first
  const cachedData = videoCache[playlistId];
  if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
    return cachedData.videos;
  }

  // 2. Fallback check for missing keys
  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_DATA_API_V3_KEY') {
    console.warn("⚠️ Antigravity Warn: YOUTUBE_API_KEY is missing. Using emergency safety array.");
    return [];
  }

  try {
    const response = await axios.get(GOOGLE_API_URL, {
      params: {
        part: 'snippet,contentDetails',
        maxResults: 12,
        playlistId: playlistId,
        key: YOUTUBE_API_KEY,
      }
    });

    const items = response.data.items || [];

    // 3. Purge Agent: Validate and remove any videos that don't have functional content
    const sanitizedVideos: SanitizedVideo[] = items
      .filter((item: any) => {
        const snippet = item.snippet || {};
        // Strip out items deleted by YouTube or missing genuine thumbnails
        return (
          snippet.title && 
          snippet.thumbnails && 
          snippet.thumbnails.high?.url && 
          (snippet.resourceId?.videoId || item.contentDetails?.videoId)
        );
      })
      .map((item: any) => ({
        id: item.snippet.resourceId?.videoId || item.contentDetails?.videoId || '',
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        publishedAt: item.snippet.publishedAt,
        description: item.snippet.description || ''
      }));

    // Save to cache
    videoCache[playlistId] = {
      timestamp: Date.now(),
      videos: sanitizedVideos
    };

    return sanitizedVideos;

  } catch (error: any) {
    // 4. Ultimate Process Protection: Log the API error but return an empty state instead of crashing port 3001
    console.error("❌ YouTube Fetcher Failed gracefully:", error.response?.data || error.message);
    return []; 
  }
};
