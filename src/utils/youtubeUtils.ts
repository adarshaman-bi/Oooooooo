/**
 * Antigravity Video Validation Agent
 * Cleans, sanitizes, and verifies YouTube IDs and handles fallback placeholders.
 */

// Helper to extract a clean 11-character YouTube Video ID or Playlist ID
export const extractYoutubeId = (urlOrId: string | null | undefined): string | null => {
  if (!urlOrId) return null;
  
  // If it's already a valid 11-char ID, return it
  if (urlOrId.length === 11 && !urlOrId.includes('/') && !urlOrId.includes('_')) {
    return urlOrId;
  }

  try {
    // Regex matches standard watch URLs, shorts, embeds, and playlist patterns
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlOrId.match(regExp);
    
    if (match && match[2].length === 11) {
      return match[2];
    }
  } catch (e) {
    console.error("Failed parsing video ID:", e);
  }
  
  return null; // Returns null if it's an invalid placeholder like 'live_1_Rohi'
};

// Generates bulletproof thumbnails with a fallback image if the ID is missing/broken
export const getYoutubeThumbnail = (videoUrlOrId: string | null | undefined): string => {
  const validId = extractYoutubeId(videoUrlOrId);
  if (!validId) {
    // Fallback placeholder image when a teacher's video link is broken
    return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80'; 
  }
  return `https://img.youtube.com/vi/${validId}/hqdefault.jpg`;
};

// Generates clean embedded player URLs or watch URLs
export const getYoutubeEmbedUrl = (videoUrlOrId: string | null | undefined): string | null => {
  const validId = extractYoutubeId(videoUrlOrId);
  if (!validId) return null;
  return `https://www.youtube.com/embed/${validId}?rel=0&modestbranding=1`;
};

// Humanizes views count (e.g. 4700000 -> "4.7M views")
export const formatViews = (views: number | string | undefined): string => {
  if (views === undefined) return '0 views';
  const val = typeof views === 'string' ? parseInt(views, 10) : views;
  if (isNaN(val)) return '0 views';
  if (val >= 1000000) {
    return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M views';
  }
  if (val >= 1000) {
    return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K views';
  }
  return val + (val === 1 ? ' view' : ' views');
};

// Humanizes subscribers count (e.g. 2150000 -> "2.15M subscribers")
export const formatSubscribers = (subscribers: number | string | undefined): string => {
  if (subscribers === undefined) return '0 subscribers';
  const val = typeof subscribers === 'string' ? parseInt(subscribers, 10) : subscribers;
  if (isNaN(val)) return '0 subscribers';
  if (val >= 1000000) {
    return (val / 1000000).toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '') + 'M subscribers';
  }
  if (val >= 1000) {
    return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K subscribers';
  }
  return val + (val === 1 ? ' subscriber' : ' subscribers');
};
