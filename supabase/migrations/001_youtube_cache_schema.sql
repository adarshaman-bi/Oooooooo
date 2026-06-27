-- YouTube Cache Schema Migration
-- Run this in your Supabase SQL Editor to create the cache tables

-- Table for caching playlist metadata
CREATE TABLE IF NOT EXISTS youtube_playlists_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  channel_id TEXT,
  video_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- Table for caching video/lecture metadata
CREATE TABLE IF NOT EXISTS youtube_videos_cache (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  published_at TIMESTAMPTZ,
  duration TEXT,
  view_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- Table for caching channel profiles
CREATE TABLE IF NOT EXISTS youtube_channels_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  custom_name TEXT,
  logo_url TEXT,
  banner_url TEXT,
  subscriber_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  playlists JSONB,
  live_stream JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_youtube_videos_playlist ON youtube_videos_cache(playlist_id);
CREATE INDEX IF NOT EXISTS idx_youtube_playlists_channel ON youtube_playlists_cache(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_updated ON youtube_videos_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_youtube_playlists_updated ON youtube_playlists_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_youtube_channels_updated ON youtube_channels_cache(updated_at);

-- Enable Row Level Security (optional, adjust policies as needed)
ALTER TABLE youtube_playlists_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_videos_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_channels_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust based on your security requirements)
CREATE POLICY IF NOT EXISTS "Allow public read access to playlists cache" 
  ON youtube_playlists_cache FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read access to videos cache" 
  ON youtube_videos_cache FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read access to channels cache" 
  ON youtube_channels_cache FOR SELECT USING (true);

-- Allow service role to insert/update
CREATE POLICY IF NOT EXISTS "Allow service role to manage playlists cache" 
  ON youtube_playlists_cache FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Allow service role to manage videos cache" 
  ON youtube_videos_cache FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Allow service role to manage channels cache" 
  ON youtube_channels_cache FOR ALL USING (auth.jwt()->>'role' = 'service_role');
