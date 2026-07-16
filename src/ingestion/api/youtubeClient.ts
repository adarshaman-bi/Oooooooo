import axios from 'axios';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  console.warn('⚠️ [YouTubeClient] Missing YOUTUBE_API_KEY in environment variables.');
}

// Simple sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Robust YouTube API Request Client with built-in exponential backoff retries for transient
 * rate-limiting (429) or server (5xx) errors.
 */
export async function youtubeRequest(
  endpoint: string,
  params: Record<string, any> = {},
  retries = 5,
  delay = 1000
): Promise<any> {
  const url = `https://www.googleapis.com/youtube/v3/${endpoint}`;
  const requestParams = {
    ...params,
    key: YOUTUBE_API_KEY,
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, { params: requestParams });
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const isTransient = status === 429 || (status >= 500 && status < 600);
      
      if (isTransient && i < retries - 1) {
        console.warn(
          `⚠️ [YouTubeClient] Rate limit or transient error (${status}) on ${endpoint}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`
        );
        await sleep(delay);
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}

/**
 * Fetch all playlist items (videos) inside a playlist, recursively resolving page tokens.
 */
export async function fetchAllPlaylistItems(playlistId: string): Promise<any[]> {
  let allItems: any[] = [];
  let pageToken: string | undefined;

  do {
    const data = await youtubeRequest('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: 50,
      pageToken,
    });
    
    if (data && data.items) {
      allItems = allItems.concat(data.items);
    }
    pageToken = data?.nextPageToken;
  } while (pageToken);

  return allItems;
}

/**
 * Fetch all playlists hosted on a specific channel, recursively resolving page tokens.
 */
export async function fetchAllChannelPlaylists(channelId: string): Promise<any[]> {
  let allPlaylists: any[] = [];
  let pageToken: string | undefined;

  do {
    const data = await youtubeRequest('playlists', {
      part: 'snippet,contentDetails',
      channelId,
      maxResults: 50,
      pageToken,
    });
    
    if (data && data.items) {
      allPlaylists = allPlaylists.concat(data.items);
    }
    pageToken = data?.nextPageToken;
  } while (pageToken);

  return allPlaylists;
}

/**
 * Batch fetch video enrichment details (like duration and stats) for a list of video IDs (up to 50 at a time).
 */
export async function fetchVideoDetailsBatch(videoIds: string[]): Promise<any[]> {
  if (videoIds.length === 0) return [];
  
  // YouTube API allows batching up to 50 IDs at a time
  const chunks: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  let allVideoDetails: any[] = [];
  for (const chunk of chunks) {
    const data = await youtubeRequest('videos', {
      part: 'snippet,contentDetails,statistics',
      id: chunk.join(','),
    });
    if (data && data.items) {
      allVideoDetails = allVideoDetails.concat(data.items);
    }
  }

  return allVideoDetails;
}
