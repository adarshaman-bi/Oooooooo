import { supabase } from './supabaseClient';

export const SWR_KEYS = {
  PLAYLISTS: 'active_playlists',
  TEACHERS: 'active_teachers',
  CHANNELS: 'active_channels',
  VIDEOS: 'active_videos'
};

export const swrOptions = {
  dedupingInterval: 5 * 60 * 1000, // 5 minutes cache TTL
  revalidateOnFocus: false, // Prevent background refetch on tab focus to maintain a stable/flicker-free UI
  revalidateOnReconnect: false, // Prevent reconnect refetches from flashing skeleton loaders
  keepPreviousData: true, // Keep returning cached data during background revalidations instead of setting to undefined
  shouldRetryOnError: false
};

// Global Fetchers
export const fetchActivePlaylists = async () => {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
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
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const fetchActiveChannels = async () => {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const fetchActiveVideos = async () => {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data || [];
};

