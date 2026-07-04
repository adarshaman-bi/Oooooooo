-- Migration: Add required schema columns for YouTube Integration Contract
-- Run this in your Supabase SQL Editor.

-- Alter public.playlists
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS cover_thumbnail_url TEXT;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS channel_title TEXT;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS channel_thumbnail_url TEXT;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'playlist';
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS total_duration_seconds INTEGER DEFAULT 0;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS subject_tags JSONB;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS exam_tags JSONB;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NOW();

-- Alter public.videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS position_in_playlist INTEGER;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_playable BOOLEAN DEFAULT TRUE;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS embed_url TEXT;
