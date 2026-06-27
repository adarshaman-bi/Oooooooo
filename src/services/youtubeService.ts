import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_API_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

// Initialize Supabase client for caching (service role for server-side writes)
let supabaseClient: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

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

// In-memory simple cache as first layer (15 minutes)
const videoCache: Record<string, CachedData> = {};
const IN_MEMORY_CACHE_DURATION = 15 * 60 * 1000; // 15 Minutes

// Database cache TTL: 24 hours
const DB_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const getLiveTeacherLectures = async (playlistId: string): Promise<SanitizedVideo[]> => {
  // LAYER 1: Check in-memory cache first (fastest)
  const cachedData = videoCache[playlistId];
  if (cachedData && (Date.now() - cachedData.timestamp < IN_MEMORY_CACHE_DURATION)) {
    console.log(`[CACHE] In-memory hit for playlist ${playlistId}`);
    return cachedData.videos;
  }

  // LAYER 2: Check Supabase database cache
  if (supabaseClient) {
    try {
      const { data: dbCache, error: dbError } = await supabaseClient
        .from('youtube_videos_cache')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('published_at', { ascending: false })
        .limit(50);

      if (!dbError && dbCache && dbCache.length > 0) {
        // Check if cache is fresh (< 24 hours old)
        const oldestEntry = dbCache[dbCache.length - 1];
        const cacheAge = Date.now() - new Date(oldestEntry.updated_at).getTime();
        
        if (cacheAge < DB_CACHE_TTL_MS) {
          console.log(`[CACHE] Database hit for playlist ${playlistId} (age: ${Math.round(cacheAge / 60000)}min)`);
          const sanitizedVideos: SanitizedVideo[] = dbCache.map(v => ({
            id: v.id,
            title: v.title,
            thumbnail: v.thumbnail_url || '',
            publishedAt: v.published_at || '',
            description: v.description || ''
          }));
          
          // Update in-memory cache
          videoCache[playlistId] = {
            timestamp: Date.now(),
            videos: sanitizedVideos
          };
          
          return sanitizedVideos;
        } else {
          console.log(`[CACHE] Database stale for playlist ${playlistId} (age: ${Math.round(cacheAge / 3600000)}h), refreshing...`);
        }
      }
    } catch (dbErr: any) {
      console.warn(`[CACHE] Database read failed for ${playlistId}:`, dbErr.message);
      // Continue to YouTube API fallback
    }
  }

  // LAYER 3: YouTube API fetch (only if cache miss or stale)
  let freshVideos: SanitizedVideo[] = [];
  
  try {
    // Fallback check for missing keys
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_DATA_API_V3_KEY') {
      console.warn("⚠️ YouTube API Key missing. Using emergency safety array.");
      
      // Graceful fallback: return whatever is in database even if stale
      if (supabaseClient) {
        const { data: staleData } = await supabaseClient
          .from('youtube_videos_cache')
          .select('*')
          .eq('playlist_id', playlistId)
          .order('published_at', { ascending: false })
          .limit(50);
        
        if (staleData && staleData.length > 0) {
          console.log(`[FALLBACK] Returning stale database data for ${playlistId}`);
          return staleData.map(v => ({
            id: v.id,
            title: v.title,
            thumbnail: v.thumbnail_url || '',
            publishedAt: v.published_at || '',
            description: v.description || ''
          }));
        }
      }
      
      return [];
    }

    console.log(`[API] Fetching from YouTube API for playlist ${playlistId}`);
    const response = await axios.get(GOOGLE_API_URL, {
      params: {
        part: 'snippet,contentDetails',
        maxResults: 50,
        playlistId: playlistId,
        key: YOUTUBE_API_KEY,
      }
    });

    const items = response.data.items || [];

    // Validate and sanitize videos
    freshVideos = items
      .filter((item: any) => {
        const snippet = item.snippet || {};
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

  } catch (error: any) {
    console.error("❌ YouTube API Failed:", error.response?.data || error.message);
    
    // Graceful fallback: return stale database data on API failure
    if (supabaseClient) {
      const { data: staleData } = await supabaseClient
        .from('youtube_videos_cache')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('published_at', { ascending: false })
        .limit(50);
      
      if (staleData && staleData.length > 0) {
        console.log(`[FALLBACK] API failed, returning stale database data for ${playlistId}`);
        return staleData.map(v => ({
          id: v.id,
          title: v.title,
          thumbnail: v.thumbnail_url || '',
          publishedAt: v.published_at || '',
          description: v.description || ''
        }));
      }
    }
    
    return [];
  }

  // LAYER 4: Upsert fresh data to Supabase cache
  if (freshVideos.length > 0 && supabaseClient) {
    try {
      const upsertData = freshVideos.map(v => ({
        id: v.id,
        playlist_id: playlistId,
        title: v.title,
        description: v.description,
        thumbnail_url: v.thumbnail,
        video_url: `https://www.youtube.com/embed/${v.id}`,
        published_at: v.publishedAt,
        updated_at: new Date().toISOString()
      }));

      const { error: upsertError } = await supabaseClient
        .from('youtube_videos_cache')
        .upsert(upsertData, { onConflict: 'id' });

      if (upsertError) {
        console.error('[CACHE] Failed to upsert to database:', upsertError);
      } else {
        console.log(`[CACHE] Updated database cache for ${freshVideos.length} videos in playlist ${playlistId}`);
      }
    } catch (upsertErr: any) {
      console.error('[CACHE] Upsert error:', upsertErr.message);
    }
  }

  // Update in-memory cache
  videoCache[playlistId] = {
    timestamp: Date.now(),
    videos: freshVideos
  };

  return freshVideos;
};
