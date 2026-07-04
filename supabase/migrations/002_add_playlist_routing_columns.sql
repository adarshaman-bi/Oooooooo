-- Migration: Add playlist routing and channel link columns to support Home dashboard features
-- Run this in your Supabase SQL Editor if you are using the remote database, or run via CLI migrations.

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT;

ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'playlist';
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT FALSE;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS video_ids JSONB;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS cover_thumbnail_url TEXT;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS lectures_count INTEGER DEFAULT 0;
