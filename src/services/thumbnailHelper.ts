import { Playlist, Lecture } from '../types';
import { supabase } from '../utils/supabaseClient';

const thumbnailCache: Record<string, string> = {};
const pendingQueries = new Set<string>();

const fetchFirstVideoThumbnail = async (playlistId: string) => {
  if (pendingQueries.has(playlistId)) return;
  pendingQueries.add(playlistId);

  const resolveFirstId = (docs: any[]): boolean => {
    const sorted = [...docs].sort((a, b) => {
      const posA = a.position ?? 0;
      const posB = b.position ?? 0;
      return posA - posB;
    });
    const videoData = sorted[0];
    const firstVideoId = videoData?.videoId || videoData?.youtubeVideoId || videoData?.id;
    if (firstVideoId) {
      const thumbUrl = `https://i.ytimg.com/vi/${firstVideoId}/maxresdefault.jpg`;
      thumbnailCache[playlistId] = thumbUrl;
      window.dispatchEvent(new CustomEvent('thumbnail-resolved', { detail: { playlistId, url: thumbUrl } }));
      return true;
    }
    return false;
  };

  try {
    const { data, error } = await supabase.from('videos')
      .select('*')
      .eq('playlist_id', playlistId)
      .limit(10);
    if (error) {
      console.warn(`Failed resolving thumbnail for playlist ${playlistId}:`, error);
      pendingQueries.delete(playlistId);
    } else if (data && data.length > 0) {
      resolveFirstId(data);
    } else {
      pendingQueries.delete(playlistId);
    }
  } catch (err) {
    console.warn(`Failed resolving thumbnail for playlist ${playlistId}:`, err);
    pendingQueries.delete(playlistId);
  }
};

export const getPlaylistThumbnail = (playlist: Playlist): string => {
  if (playlist.thumbnailUrl && (playlist.thumbnailUrl.startsWith('http://') || playlist.thumbnailUrl.startsWith('https://'))) {
    return playlist.thumbnailUrl;
  }
  const playlistId = playlist.id;
  if (playlistId) {
    if (thumbnailCache[playlistId]) {
      return thumbnailCache[playlistId];
    }
    fetchFirstVideoThumbnail(playlistId);
  }

  return 'https://img.youtube.com/vi/9Bv_M6e8858/hqdefault.jpg';
};

export const getLectureThumbnail = (lec: Lecture): string => {
  if (lec.thumbnailUrl && (lec.thumbnailUrl.startsWith('http://') || lec.thumbnailUrl.startsWith('https://'))) {
    return lec.thumbnailUrl;
  }

  const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
  if (!lec.source && (lec.videoUrl?.includes('youtube') || lec.videoUrl?.includes('youtu.be') || YOUTUBE_ID_REGEX.test(lec.id))) {
    lec.source = 'youtube';
  }

  if (lec.id && YOUTUBE_ID_REGEX.test(lec.id) && lec.source === 'youtube') {
    return `https://img.youtube.com/vi/${lec.id}/hqdefault.jpg`;
  }

  if (lec.videoUrl) {
    const embedMatch = lec.videoUrl.match(/embed\/([^?]+)/);
    if (embedMatch && embedMatch[1] && YOUTUBE_ID_REGEX.test(embedMatch[1])) {
      return `https://img.youtube.com/vi/${embedMatch[1]}/hqdefault.jpg`;
    }
    const watchMatch = lec.videoUrl.match(/v=([^&]+)/);
    if (watchMatch && watchMatch[1] && YOUTUBE_ID_REGEX.test(watchMatch[1])) {
      return `https://img.youtube.com/vi/${watchMatch[1]}/hqdefault.jpg`;
    }
  }

  if (lec.playlistId) {
    if (thumbnailCache[lec.playlistId]) {
      return thumbnailCache[lec.playlistId];
    }
    fetchFirstVideoThumbnail(lec.playlistId);
  }

  return 'https://img.youtube.com/vi/9Bv_M6e8858/hqdefault.jpg';
};
