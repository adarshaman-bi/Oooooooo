import { YouTubeVideo } from '../types';

// ─── ID Extraction ────────────────────────────────────────────────────────────

/**
 * Extracts a clean 11-character YouTube Video ID from a URL, embed path, or raw ID.
 * YouTube IDs consist of [A-Za-z0-9_-] — underscores are valid, so we do NOT reject
 * strings that contain them.
 * Returns null if the input does not contain a valid 11-char video ID.
 */
export const extractYoutubeId = (urlOrId: string | null | undefined): string | null => {
  if (!urlOrId) return null;

  // Fast path: already a bare 11-char YouTube ID (alphanumeric + _ + -)
  if (urlOrId.length === 11 && !urlOrId.includes('/') && !urlOrId.includes('?')) {
    return urlOrId;
  }

  try {
    // Matches standard watch URLs, shorts, embeds, and playlist patterns
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = urlOrId.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
  } catch (e) {
    console.error('Failed parsing video ID:', e);
  }

  return null;
};

// ─── Thumbnail / Embed ────────────────────────────────────────────────────────

/** Returns an hqdefault YouTube thumbnail URL, or null if the video ID is invalid. */
export const getYoutubeThumbnail = (videoUrlOrId: string | null | undefined): string | null => {
  const validId = extractYoutubeId(videoUrlOrId);
  if (!validId) return null;
  return `https://img.youtube.com/vi/${validId}/hqdefault.jpg`;
};

/** Returns a clean YouTube embed URL with privacy-safe defaults, or null for invalid IDs. */
export const getYoutubeEmbedUrl = (videoUrlOrId: string | null | undefined): string | null => {
  const validId = extractYoutubeId(videoUrlOrId);
  if (!validId) return null;
  return `https://www.youtube.com/embed/${validId}?rel=0&modestbranding=1`;
};

// ─── Count Formatters ─────────────────────────────────────────────────────────

/**
 * Shared count formatter. Converts a raw number or numeric string to a human-readable
 * abbreviated string (e.g. 4_700_000 → "4.7M").
 */
export function formatCount(
  value: number | string | undefined,
  singular: string,
  plural: string
): string {
  if (value === undefined || value === null) return `0 ${plural}`;
  const val = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(val)) return `0 ${plural}`;
  if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(1).replace(/\.0$/, '') + `M ${plural}`;
  }
  if (val >= 1_000) {
    return (val / 1_000).toFixed(1).replace(/\.0$/, '') + `K ${plural}`;
  }
  return val + (val === 1 ? ` ${singular}` : ` ${plural}`);
}

/** Formats a view count — e.g. 4_700_000 → "4.7M views" */
export const formatViews = (views: number | string | undefined): string =>
  formatCount(views, 'view', 'views');

/** Formats a subscriber count — e.g. 2_150_000 → "2.2M subscribers" */
export const formatSubscribers = (subscribers: number | string | undefined): string =>
  formatCount(subscribers, 'subscriber', 'subscribers');

// ─── Duration Parsing ─────────────────────────────────────────────────────────

/**
 * Parses a duration string (ISO 8601 PT format or "HH:MM:SS" / "MM:SS" / "Xm Ys") into seconds.
 * Returns 0 for unrecognised formats rather than throwing.
 */
export function parseDurationToSeconds(duration: string | undefined | null): number {
  if (!duration) return 0;
  const d = duration.toLowerCase().trim();

  // ISO 8601 PT format: PT1H30M45S
  if (d.startsWith('pt')) {
    let secs = 0;
    const h = d.match(/(\d+)h/);
    const m = d.match(/(\d+)m/);
    const s = d.match(/(\d+)s/);
    if (h) secs += parseInt(h[1], 10) * 3600;
    if (m) secs += parseInt(m[1], 10) * 60;
    if (s) secs += parseInt(s[1], 10);
    return secs;
  }

  // HH:MM:SS or MM:SS
  const parts = d.split(':');
  if (parts.length === 3) {
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
  }
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  // "Xm Ys" shorthand
  const hMatch = d.match(/(\d+)\s*h/);
  const mMatch = d.match(/(\d+)\s*m/);
  const sMatch = d.match(/(\d+)\s*s/);
  if (hMatch || mMatch || sMatch) {
    return (hMatch ? parseInt(hMatch[1], 10) * 3600 : 0) +
           (mMatch ? parseInt(mMatch[1], 10) * 60  : 0) +
           (sMatch ? parseInt(sMatch[1], 10)        : 0);
  }

  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapVideoRow(v: any): YouTubeVideo {
  return {
    id: v.id,
    videoId: v.id,
    playlistId: v.playlist_id || '',
    channelId: v.channel_id || '',
    channelName: v.channel_name || '',
    title: v.title || '',
    description: v.description || '',
    thumbnail: v.thumbnail_url || '',
    duration: v.duration || '',
    durationSeconds: parseDurationToSeconds(v.duration),
    publishedAt: v.publish_date || v.created_at || new Date().toISOString(),
    importedAt: v.created_at || new Date().toISOString(),
    subject: v.subject || '',
    topic: '',
    examTags: v.exam_type ? [v.exam_type] : [],
    isActive: v.is_active !== false,
    position: 0,
    viewCount: Number(v.views) || 0,
    likeCount: Number(v.likes_count) || 0,
    viewsCount: v.views || 0,
    likesCount: v.likes_count || 0,
    examType: v.exam_type || 'Both',
    verified: v.verified || false
  } as unknown as YouTubeVideo;
}

// Helper to parse ISO 8601 duration (e.g. PT1H14M3S -> "1h 14m")
export function parseISO8601Duration(iso: string): string {
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

// Unified normalizer for raw YouTube API video resources (from videos.list)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeYoutubeVideoResource(vItem: any) {
  const videoId = vItem.id;
  const sn = vItem.snippet || {};
  const cd = vItem.contentDetails || {};
  const stats = vItem.statistics || {};

  const thumbs = sn.thumbnails || {};
  const thumbnailUrl =
    thumbs.maxres?.url ||
    thumbs.standard?.url ||
    thumbs.high?.url ||
    thumbs.medium?.url ||
    thumbs.default?.url ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    id: videoId,
    title: sn.title || 'Untitled Lecture',
    video_url: `https://www.youtube.com/watch?v=${videoId}`,
    duration: parseISO8601Duration(cd.duration || 'PT0S'),
    category: 'lecture',
    views: parseInt(stats.viewCount || '0', 10),
    thumbnail_url: thumbnailUrl,
    likes_count: parseInt(stats.likeCount || '0', 10),
    publish_date: sn.publishedAt || new Date().toISOString(),
    is_active: true,
    updated_at: new Date().toISOString()
  };
}

// Helper: Converts ISO 8601 duration (e.g., PT1H23M45S) to total seconds
export function getDurationInSeconds(isoDuration: string | undefined | null): number {
  if (!isoDuration) return 0;
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Helper: Validates that the video is academic and not strategy/clickbait or kids/entertainment junk
export function isAcademicContent(title: string | undefined | null, description?: string | null): boolean {
  if (!title) return false;
  const lowerTitle = title.toLowerCase();
  const lowerDesc = (description || '').toLowerCase();

  // 1. Non-Academic/Kids/Entertainment Denylist
  const junkKeywords = [
    'cocomelon', 'cartoon', 'rhyme', 'nursery', 'peppa pig', 'chuchu tv',
    'kids song', 'baby', 'sleep music', 'lullaby', 'watoto', 'singizi',
    'toy', 'playdoh', 'hindi kahani', 'kahaniya', 'animation for kids',
    'music video', 'official song', 'official music', 'funny video', 'prank',
    'gaming', 'gameplay', 'game', 'song for kids', 'song for children',
    'strategy', 'mistake', 'good news', 'motivation', 'roadmap', 'surprise',
    'announcement', 'cutoff', 'giveaway', 'postponed', 'news'
  ];

  if (junkKeywords.some(keyword => lowerTitle.includes(keyword) || lowerDesc.includes(keyword))) {
    return false;
  }

  return true;
}


