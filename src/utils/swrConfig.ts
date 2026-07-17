import { supabase, fetchPaginatedData } from './supabaseClient';

export const SWR_KEYS = {
  PLAYLISTS: 'active_playlists',
  TEACHERS: 'active_teachers',
  CHANNELS: 'active_channels',
  RECENT_VIDEOS: 'recent_videos'
};

export const swrOptions = {
  dedupingInterval: 5 * 60 * 1000, // 5 minutes cache TTL
  revalidateOnFocus: false, // Prevent background refetch on tab focus to maintain a stable/flicker-free UI
  revalidateOnReconnect: false, // Prevent reconnect refetches from flashing skeleton loaders
  keepPreviousData: true, // Keep returning cached data during background revalidations instead of setting to undefined
  shouldRetryOnError: false
};

// Narrow column lists for performance
const PLAYLIST_FIELDS = 'id, title, category, thumbnail, description, teacher_id, lectures_count, exam_type, cover_thumbnail_url, channel_title, channel_id, channel_thumbnail_url, content_type, total_duration_seconds, subject_tags, exam_tags, created_at, updated_at';
const TEACHER_FIELDS = 'id, name, avatar, subject, subjects, rating, followers_count, bio, exams, is_verified, created_at, features';
const CHANNEL_FIELDS = 'id, name, avatar, subscribers, description, exams, added_at';
export const VIDEO_FIELDS = 'id, title, video_url, duration, category, playlist_id, views, thumbnail_url, subject, exam_type, content_type, teacher_id, teacher_name, likes_count, duration_seconds, is_active, created_at, updated_at';

// Global Fetchers
export const fetchActivePlaylists = async () => {
  const { data, error } = await supabase
    .from('playlists')
    .select(PLAYLIST_FIELDS)
    .eq('is_active', true)
    .gt('lectures_count', 0)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const fetchActiveTeachers = async () => {
  const { data, error } = await supabase
    .from('teachers')
    .select(TEACHER_FIELDS)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const fetchActiveChannels = async () => {
  const { data, error } = await supabase
    .from('channels')
    .select(CHANNEL_FIELDS)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const fetchRecentVideoPreviews = async () => {
  const { data, error } = await supabase
    .from('videos')
    .select(VIDEO_FIELDS)
    .eq('is_active', true)
    .order('created_at', { ascending: false, nullsFirst: false })
    .range(0, 199); // Top 200 recent videos
  if (error) throw error;
  return data || [];
};

