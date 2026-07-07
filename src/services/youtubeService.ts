import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { normalizeYoutubeVideoResource, getDurationInSeconds, isAcademicContent } from '../utils/youtubeUtils.js';

dotenv.config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || (import.meta as any).env?.VITE_YOUTUBE_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';
let isYoutubeServiceApiKeyValid = true;

// Initialize Supabase client for caching (service role for server-side writes)
let supabaseClient: ReturnType<typeof createClient> | null = null;
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_URL.trim() !== '' && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY.trim() !== '';
if (isSupabaseConfigured) {
  supabaseClient = createClient(SUPABASE_URL.trim(), SUPABASE_SERVICE_ROLE_KEY.trim(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
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

async function fetchVideoStatsBatch(videoIds: string[], apiKey: string): Promise<Map<string, any>> {
  const statsMap = new Map<string, any>();

  // Chunk into batches of 50 (YouTube API limit per call)
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    try {
      const res = await axios.get(`${YOUTUBE_BASE}/videos`, {
        params: {
          part: 'snippet,contentDetails,status,statistics',
          id: chunk.join(','),
          key: apiKey,
        },
      });

      for (const v of (res.data.items || [])) {
        statsMap.set(v.id, v);
      }
    } catch (err: any) {
      console.warn(`[STATS] Failed to fetch stats batch:`, err.message);
    }
  }

  return statsMap;
}

function filterColumns(payload: any, allowedColumns: string[]) {
  if (allowedColumns.length === 0) return payload;
  const filtered: any = {};
  for (const key of Object.keys(payload)) {
    if (allowedColumns.includes(key)) {
      filtered[key] = payload[key];
    }
  }
  return filtered;
}

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
      const isChannel = playlistId.startsWith('UC');
      const { data: dbCache, error: dbError } = (await (isChannel
        ? supabaseClient
            .from('videos')
            .select('*')
            .eq('channel_id', playlistId)
        : supabaseClient
            .from('videos')
            .select('*')
            .eq('playlist_id', playlistId)
      )
        .order('publish_date', { ascending: false })
        .limit(200)) as any;

      if (!dbError && dbCache && dbCache.length > 0) {
        // Filter out unplayable/inactive lectures in Javascript for compatibility
        const activeLectures = dbCache.filter((v: any) => v.is_playable !== false && v.is_active !== false);

        const newestEntry = dbCache[0];
        const cacheAge = Date.now() - new Date(newestEntry.updated_at || newestEntry.created_at).getTime();

        if (cacheAge < DB_CACHE_TTL_MS) {
          console.log(`[CACHE] Database hit for playlist ${playlistId} (age: ${Math.round(cacheAge / 60000)}min, ${activeLectures.length} playable videos)`);
          const sanitizedVideos: SanitizedVideo[] = activeLectures.map((v: any) => ({
            id: v.id,
            title: v.title,
            thumbnail: v.thumbnail_url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
            publishedAt: v.publish_date || v.created_at || '',
            description: v.description || '',
            viewCount: v.view_count !== undefined ? v.view_count : (v.views || 0),
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
  const dbVideos: any[] = [];

  const apiKey = YOUTUBE_API_KEY;
  const isDemo = !apiKey || apiKey === 'YOUR_YOUTUBE_DATA_API_V3_KEY' || apiKey.startsWith('MY_') || apiKey.length < 5 || !isYoutubeServiceApiKeyValid;

  if (isDemo) {
    console.warn('⚠️ YouTube API Key missing or marked invalid. Returning stale database data if available.');
    return returnStaleDBData(playlistId);
  }

  // Stage 0: Detect Schema Columns
  let detectedPlaylistColumns: string[] = [];
  let detectedVideoColumns: string[] = [];

  if (supabaseClient) {
    try {
      const { data: plSample } = await supabaseClient.from('playlists').select('*').limit(1);
      detectedPlaylistColumns = plSample && plSample.length > 0 ? Object.keys(plSample[0]) : [];
    } catch (err: any) {
      console.warn('⚠️ [CACHE] Playlists schema detection failed:', err.message);
    }

    try {
      const { data: vidSample } = await supabaseClient.from('videos').select('*').limit(1);
      detectedVideoColumns = vidSample && vidSample.length > 0 ? Object.keys(vidSample[0]) : [];
    } catch (err: any) {
      console.warn('⚠️ [CACHE] Videos schema detection failed:', err.message);
    }
  }

  try {
    console.log(`[API] Stage 3: Fetching playlistItems for ${playlistId}...`);

    // Fetch Playlist Info to get channel information
    const plInfoRes = await axios.get(`${YOUTUBE_BASE}/playlists`, {
      params: {
        part: 'snippet,contentDetails',
        id: playlistId,
        key: apiKey,
      },
    });
    const plItem = plInfoRes.data.items?.[0];
    const channelId = plItem?.snippet?.channelId || '';
    const playlistTitle = plItem?.snippet?.title || '';
    const playlistDescription = plItem?.snippet?.description || '';

    // Fetch Channel details to get display channelTitle and channelThumbnailUrl
    let channelTitle = '';
    let channelThumbnailUrl = '';
    if (channelId) {
      const chRes = await axios.get(`${YOUTUBE_BASE}/channels`, {
        params: {
          part: 'snippet',
          id: channelId,
          key: apiKey,
        },
      });
      const channelItem = chRes.data.items?.[0];
      channelTitle = channelItem?.snippet?.title || '';
      channelThumbnailUrl = channelItem?.snippet?.thumbnails?.high?.url || channelItem?.snippet?.thumbnails?.default?.url || '';
    }

    // Stage 3 — Deep video expansion (paginated)
    let pageToken: string | undefined;
    const playlistVideoRefs: Array<{ videoId: string; position: number }> = [];
    let currentPos = 0;

    do {
      const itemsRes = await axios.get(`${YOUTUBE_BASE}/playlistItems`, {
        params: {
          part: 'snippet,contentDetails',
          playlistId: playlistId,
          maxResults: 50,
          pageToken: pageToken,
          key: apiKey,
        },
      });

      for (const item of itemsRes.data.items || []) {
        const vidId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        if (vidId) {
          playlistVideoRefs.push({ videoId: vidId, position: currentPos++ });
        }
      }
      pageToken = itemsRes.data.nextPageToken;
    } while (pageToken);

    if (playlistVideoRefs.length === 0) {
      console.warn(`[API] No videos found in playlist ${playlistId}`);
      return returnStaleDBData(playlistId);
    }

    console.log(`[API] Stage 3 complete: ${playlistVideoRefs.length} videos extracted from ${playlistId}`);

    // Stage 4 — Statistics ingestion (batched in groups of 50)
    const videoIds = playlistVideoRefs.map(item => item.videoId);
    console.log(`[API] Stage 4: Fetching stats for ${videoIds.length} videos...`);
    const statsMap = await fetchVideoStatsBatch(videoIds, apiKey);
    console.log(`[API] Stage 4 complete: Stats fetched for ${statsMap.size} videos`);

    let totalDurationSeconds = 0;
    let playableLecturesCount = 0;
    let coverThumbnailUrl = '';

    // Merge items + stats and filter them
    for (const ref of playlistVideoRefs) {
      const video = statsMap.get(ref.videoId);
      
      // Handle unavailable videos
      if (!video) {
        console.warn(`⚠️ [API Ingestion] Video ${ref.videoId} is private or deleted. Storing with is_playable = false.`);
        
        const dbVideoRow = {
          id: ref.videoId,
          video_id: ref.videoId,
          playlist_id: playlistId,
          position_in_playlist: ref.position,
          position: ref.position,
          title: 'Unavailable Video',
          description: 'This video is private or deleted.',
          channel_id: channelId,
          channel_title: channelTitle,
          teacher_name: channelTitle,
          thumbnail_url: 'https://i.ytimg.com/vi/placeholder/hqdefault.jpg',
          duration_seconds: 0,
          duration: '0:00',
          view_count: 0,
          views: 0,
          like_count: 0,
          likes_count: 0,
          published_at: new Date().toISOString(),
          publish_date: new Date().toISOString(),
          is_playable: false,
          is_active: false,
          embed_url: `https://www.youtube.com/embed/${ref.videoId}`,
          video_url: `https://www.youtube.com/watch?v=${ref.videoId}`,
          category: 'lecture',
          content_type: 'lecture',
          updated_at: new Date().toISOString(),
        };

        dbVideos.push(filterColumns(dbVideoRow, detectedVideoColumns));
        continue;
      }

      const title = video.snippet?.title || '';
      const durationISO = video.contentDetails?.duration || '';
      const durationSec = getDurationInSeconds(durationISO);
      const privacyStatus = video.status?.privacyStatus;

      // Filter out private/deleted, under 20 mins, and strategy/clickbait
      if (privacyStatus === 'private' || privacyStatus === 'deleted') {
        console.log(`[API Filter] Skipping private/deleted video: ${ref.videoId}`);
        continue;
      }
      if (durationSec < 1200) {
        console.log(`[API Filter] Skipping video ${ref.videoId} (under 20 mins: ${durationISO})`);
        continue;
      }
      if (!isAcademicContent(title, video.snippet?.description)) {
        console.log(`[API Filter] Skipping non-academic video ${ref.videoId} (${title})`);
        continue;
      }

      // Thumbnail fallback chain (maxres -> standard -> high -> medium -> default)
      const sn = video.snippet || {};
      const thumbs = sn.thumbnails || {};
      const thumbnailUrl =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        `https://i.ytimg.com/vi/${ref.videoId}/hqdefault.jpg`;

      if (playableLecturesCount === 0) {
        coverThumbnailUrl = thumbnailUrl;
      }

      totalDurationSeconds += durationSec;
      playableLecturesCount++;

      freshVideos.push({
        id: ref.videoId,
        title: title,
        thumbnail: thumbnailUrl,
        publishedAt: sn.publishedAt || new Date().toISOString(),
        description: sn.description || '',
        viewCount: parseInt(video.statistics?.viewCount || '0', 10),
        duration: parseISO8601Duration(durationISO),
      });

      const dbVideoRow = {
        id: ref.videoId,
        video_id: ref.videoId,
        playlist_id: playlistId,
        position_in_playlist: ref.position,
        position: ref.position,
        title: title,
        description: sn.description || '',
        channel_id: channelId,
        channel_title: channelTitle,
        teacher_name: channelTitle,
        thumbnail_url: thumbnailUrl,
        duration_seconds: durationSec,
        duration: parseISO8601Duration(durationISO),
        view_count: parseInt(video.statistics?.viewCount || '0', 10),
        views: parseInt(video.statistics?.viewCount || '0', 10),
        like_count: parseInt(video.statistics?.likeCount || '0', 10),
        likes_count: parseInt(video.statistics?.likeCount || '0', 10),
        published_at: sn.publishedAt || new Date().toISOString(),
        publish_date: sn.publishedAt || new Date().toISOString(),
        is_playable: true,
        is_active: true,
        embed_url: `https://www.youtube.com/embed/${ref.videoId}`,
        video_url: `https://www.youtube.com/watch?v=${ref.videoId}`,
        category: 'lecture',
        content_type: 'lecture',
        updated_at: new Date().toISOString(),
      };

      dbVideos.push(filterColumns(dbVideoRow, detectedVideoColumns));
    }

    // Classify content type
    const titleLower = playlistTitle.toLowerCase();
    const descLower = playlistDescription.toLowerCase();
    const isOneShot = titleLower.includes('one shot') || titleLower.includes('oneshot') || descLower.includes('one shot') || descLower.includes('oneshot');
    const contentType = isOneShot ? 'one_shot' : 'playlist';

    // ═══════════════════════════════════════════════════════════════════
    // LAYER 4: Upsert fresh data to Supabase `public.videos` table & `public.playlists`
    // ═══════════════════════════════════════════════════════════════════
    if (dbVideos.length > 0 && supabaseClient) {
      try {
        // Upsert Playlist first to avoid foreign key constraints
        const plRow = {
          id: playlistId,
          playlist_id: playlistId,
          title: playlistTitle,
          description: playlistDescription,
          channel_id: channelId,
          channel_title: channelTitle,
          channel_thumbnail_url: channelThumbnailUrl,
          cover_thumbnail_url: coverThumbnailUrl,
          thumbnail: coverThumbnailUrl,
          content_type: contentType,
          lectures_count: playableLecturesCount,
          total_duration_seconds: totalDurationSeconds,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true
        };

        const { error: plUpdError } = await (supabaseClient
          .from('playlists') as any)
          .upsert(filterColumns(plRow, detectedPlaylistColumns));

        if (plUpdError) {
          console.error('[CACHE] Failed to upsert playlist metadata:', plUpdError.message);
        }

        // Upsert videos
        const uniqueDBVideosMap = new Map();
        for (const p of dbVideos) {
          uniqueDBVideosMap.set(p.id, p);
        }
        const uniqueDBVideos = Array.from(uniqueDBVideosMap.values());
        const { error: upsertError } = (await supabaseClient
          .from('videos')
          .upsert(uniqueDBVideos as any, { onConflict: 'id' })) as any;

        if (upsertError) {
          console.error('[CACHE] Failed to upsert to videos table:', upsertError.message);
        } else {
          console.log(`[CACHE] Updated database cache: ${dbVideos.length} videos in playlist ${playlistId}`);
        }
      } catch (upsertErr: any) {
        console.error('[CACHE] Upsert error:', upsertErr.message);
      }
    }
  } catch (error: any) {
    const apiError = error.response?.data?.error;
    const errorMsg = apiError
      ? `${apiError.message} (Code: ${apiError.code}, Reason: ${apiError.errors?.[0]?.reason || 'unknown'})`
      : error.message;
    console.warn('[WARNING] YouTube API Multi-Stage Fetch Failed:', errorMsg);
    if (apiError?.message?.includes('API key not valid') || apiError?.code === 400 || apiError?.code === 403) {
      isYoutubeServiceApiKeyValid = false;
    }
    return returnStaleDBData(playlistId);
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
    const isChannel = playlistId.startsWith('UC');
    const { data: staleData } = (await (isChannel
      ? supabaseClient
          .from('videos')
          .select('*')
          .eq('channel_id', playlistId)
      : supabaseClient
          .from('videos')
          .select('*')
          .eq('playlist_id', playlistId)
    )
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
