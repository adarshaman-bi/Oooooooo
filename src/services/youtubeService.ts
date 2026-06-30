import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';

// Initialize Supabase client for caching (service role for server-side writes)
let supabaseClient: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ── Types ──

interface CachedData {
  timestamp: number;
  videos: SanitizedVideo[];
}

export interface SanitizedVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  description: string;
  viewCount: number;
  duration: string;
}

// ── Caching Constants ──

// In-memory simple cache as first layer (15 minutes)
const videoCache: Record<string, CachedData> = {};
const IN_MEMORY_CACHE_DURATION = 15 * 60 * 1000; // 15 Minutes

// Database cache TTL: 24 hours
const DB_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── ISO 8601 Duration Parser ──

/**
 * Parses ISO 8601 duration (e.g. PT1H14M3S) into a human-readable string.
 * Returns "1h 14m" or "14:03" style format.
 */
function parseISO8601Duration(iso: string): string {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ── Stage 3: Deep Video Expansion via playlistItems (with pagination) ──

interface RawPlaylistItem {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  position: number;
}

async function fetchAllPlaylistItems(playlistId: string, apiKey: string): Promise<RawPlaylistItem[]> {
  const items: RawPlaylistItem[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      part: 'snippet,contentDetails',
      playlistId: playlistId,
      maxResults: '50',
      key: apiKey,
    };
    if (pageToken) params.pageToken = pageToken;

    const res = await axios.get(`${YOUTUBE_BASE}/playlistItems`, { params });
    const data = res.data;

    for (const item of (data.items || [])) {
      const sn = item.snippet || {};
      const cd = item.contentDetails || {};
      const videoId = cd.videoId || sn.resourceId?.videoId || '';
      if (!videoId || sn.title === 'Private video' || sn.title === 'Deleted video') continue;

      const thumbs = sn.thumbnails || {};
      const thumbnailUrl =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        '';

      items.push({
        videoId,
        title: sn.title || 'Untitled Lecture',
        description: (sn.description || '').substring(0, 500),
        publishedAt: cd.videoPublishedAt || sn.publishedAt || '',
        thumbnailUrl,
        position: sn.position ?? items.length,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

// ── Stage 4: Statistics Ingestion via videos.list ──

interface VideoStats {
  viewCount: number;
  duration: string;
}

async function fetchVideoStatsBatch(videoIds: string[], apiKey: string): Promise<Map<string, VideoStats>> {
  const statsMap = new Map<string, VideoStats>();

  // Chunk into batches of 50 (YouTube API limit per call)
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    try {
      const res = await axios.get(`${YOUTUBE_BASE}/videos`, {
        params: {
          part: 'statistics,contentDetails',
          id: chunk.join(','),
          key: apiKey,
        },
      });

      for (const v of (res.data.items || [])) {
        statsMap.set(v.id, {
          viewCount: parseInt(v.statistics?.viewCount ?? '0', 10),
          duration: v.contentDetails?.duration ?? 'PT0S',
        });
      }
    } catch (err: any) {
      console.warn(`[STATS] Failed to fetch stats batch:`, err.message);
    }
  }

  return statsMap;
}

// ── Main Export: getLiveTeacherLectures ──

export const getLiveTeacherLectures = async (playlistId: string): Promise<SanitizedVideo[]> => {
  // ═══════════════════════════════════════════════════════════════════
  // LAYER 1: Check in-memory cache first (fastest, 15-minute window)
  // ═══════════════════════════════════════════════════════════════════
  const cachedData = videoCache[playlistId];
  if (cachedData && (Date.now() - cachedData.timestamp < IN_MEMORY_CACHE_DURATION)) {
    console.log(`[CACHE] In-memory hit for playlist ${playlistId}`);
    return cachedData.videos;
  }

  // ═══════════════════════════════════════════════════════════════════
  // LAYER 2: Check Supabase `public.videos` table (24-hour TTL)
  // ═══════════════════════════════════════════════════════════════════
  if (supabaseClient) {
    try {
      const { data: dbCache, error: dbError } = (await supabaseClient
        .from('videos')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('publish_date', { ascending: false })
        .limit(200)) as any;

      if (!dbError && dbCache && dbCache.length > 0) {
        // Check if cache is fresh (< 24 hours old)
        const newestEntry = dbCache[0];
        const cacheAge = Date.now() - new Date(newestEntry.updated_at || newestEntry.created_at).getTime();

        if (cacheAge < DB_CACHE_TTL_MS) {
          console.log(`[CACHE] Database hit for playlist ${playlistId} (age: ${Math.round(cacheAge / 60000)}min, ${dbCache.length} videos)`);
          const sanitizedVideos: SanitizedVideo[] = dbCache.map((v: any) => ({
            id: v.id,
            title: v.title,
            thumbnail: v.thumbnail_url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
            publishedAt: v.publish_date || v.created_at || '',
            description: '',
            viewCount: v.views || 0,
            duration: v.duration || '',
          }));

          // Warm the in-memory cache
          videoCache[playlistId] = {
            timestamp: Date.now(),
            videos: sanitizedVideos,
          };

          return sanitizedVideos;
        } else {
          console.log(`[CACHE] Database stale for playlist ${playlistId} (age: ${Math.round(cacheAge / 3600000)}h), refreshing...`);
        }
      }
    } catch (dbErr: any) {
      console.warn(`[CACHE] Database read failed for ${playlistId}:`, dbErr.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // LAYER 3: Full YouTube API Multi-Stage Deep Fetch
  // ═══════════════════════════════════════════════════════════════════
  let freshVideos: SanitizedVideo[] = [];

  const apiKey = YOUTUBE_API_KEY;
  const isDemo = !apiKey || apiKey === 'YOUR_YOUTUBE_DATA_API_V3_KEY' || apiKey.startsWith('MY_') || apiKey.length < 5;

  if (isDemo) {
    console.warn('⚠️ YouTube API Key missing. Returning stale database data if available.');
    return returnStaleDBData(playlistId);
  }

  try {
    console.log(`[API] Stage 3: Fetching playlistItems for ${playlistId}...`);

    // Stage 3 — Deep video expansion (paginated)
    const rawItems = await fetchAllPlaylistItems(playlistId, apiKey);

    if (rawItems.length === 0) {
      console.warn(`[API] No videos found in playlist ${playlistId}`);
      return returnStaleDBData(playlistId);
    }

    console.log(`[API] Stage 3 complete: ${rawItems.length} videos extracted from ${playlistId}`);

    // Stage 4 — Statistics ingestion (batched in groups of 50)
    const videoIds = rawItems.map(item => item.videoId);
    console.log(`[API] Stage 4: Fetching stats for ${videoIds.length} videos...`);
    const statsMap = await fetchVideoStatsBatch(videoIds, apiKey);
    console.log(`[API] Stage 4 complete: Stats fetched for ${statsMap.size} videos`);

    // Merge items + stats into SanitizedVideo[]
    freshVideos = rawItems.map(item => {
      const stats = statsMap.get(item.videoId);
      return {
        id: item.videoId,
        title: item.title,
        thumbnail: item.thumbnailUrl || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
        publishedAt: item.publishedAt,
        description: item.description,
        viewCount: stats?.viewCount ?? 0,
        duration: stats ? parseISO8601Duration(stats.duration) : '',
      };
    });
  } catch (error: any) {
    console.error('❌ YouTube API Multi-Stage Fetch Failed:', error.response?.data || error.message);
    return returnStaleDBData(playlistId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // LAYER 4: Upsert fresh data to Supabase `public.videos` table
  // ═══════════════════════════════════════════════════════════════════
  if (freshVideos.length > 0 && supabaseClient) {
    try {
      const upsertData = freshVideos.map(v => ({
        id: v.id,
        title: v.title,
        video_url: `https://www.youtube.com/watch?v=${v.id}`,
        duration: v.duration,
        category: 'lecture',
        playlist_id: playlistId,
        views: v.viewCount,
        thumbnail_url: v.thumbnail,
        content_type: 'lecture',
        publish_date: v.publishedAt || new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = (await supabaseClient
        .from('videos')
        .upsert(upsertData as any, { onConflict: 'id' })) as any;

      if (upsertError) {
        console.error('[CACHE] Failed to upsert to videos table:', upsertError);
      } else {
        console.log(`[CACHE] Updated database cache: ${freshVideos.length} videos in playlist ${playlistId}`);
      }
    } catch (upsertErr: any) {
      console.error('[CACHE] Upsert error:', upsertErr.message);
    }
  }

  // Warm in-memory cache
  videoCache[playlistId] = {
    timestamp: Date.now(),
    videos: freshVideos,
  };

  return freshVideos;
};

// ── Helper: Return stale DB data as fallback ──

async function returnStaleDBData(playlistId: string): Promise<SanitizedVideo[]> {
  if (!supabaseClient) return [];

  try {
    const { data: staleData } = (await supabaseClient
      .from('videos')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('publish_date', { ascending: false })
      .limit(200)) as any;

    if (staleData && staleData.length > 0) {
      console.log(`[FALLBACK] Returning stale database data for ${playlistId} (${staleData.length} videos)`);
      return staleData.map((v: any) => ({
        id: v.id,
        title: v.title,
        thumbnail: v.thumbnail_url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
        publishedAt: v.publish_date || v.created_at || '',
        description: '',
        viewCount: v.views || 0,
        duration: v.duration || '',
      }));
    }
  } catch (err: any) {
    console.warn(`[FALLBACK] Failed to read stale data:`, err.message);
  }

  return [];
}
