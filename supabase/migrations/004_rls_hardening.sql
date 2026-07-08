-- =========================================================================
-- BIOVISED RLS HARDENING MIGRATION — Phase 2 Security Audit
-- =========================================================================
-- Drops overly permissive public read policies and replaces them with
-- least-privilege policies for every table, storage bucket, and RPC.
-- Run via: supabase migration up or SQL Editor (as superuser / dashboard).
-- =========================================================================

-- ── 1. Drop existing over-permissive policies ─────────────────────────────
DROP POLICY IF EXISTS "Allow public read access for teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow public read access for playlists" ON public.playlists;
DROP POLICY IF EXISTS "Allow public read access for videos" ON public.videos;
DROP POLICY IF EXISTS "Allow public read access for test_series" ON public.test_series;
DROP POLICY IF EXISTS "Allow public read access for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access for batches" ON public.batches;
DROP POLICY IF EXISTS "Allow public read access for institutes" ON public.institutes;
DROP POLICY IF EXISTS "Allow public read access for reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public read access for channels" ON public.channels;
DROP POLICY IF EXISTS "Allow public read access for sync_logs" ON public.sync_logs;
DROP POLICY IF EXISTS "Allow public read access for notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public read access for audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow public read access for layout_blocks" ON public.layout_blocks;
DROP POLICY IF EXISTS "Allow public read access for ingestion_logs" ON public.ingestion_logs;
DROP POLICY IF EXISTS "Allow public read access for ingestion_control" ON public.ingestion_control;
DROP POLICY IF EXISTS "Allow public read access for moderation_reports" ON public.moderation_reports;
DROP POLICY IF EXISTS "Allow public read access for watch_history" ON public.watch_history;
DROP POLICY IF EXISTS "Allow individual write profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access to playlists cache" ON youtube_playlists_cache;
DROP POLICY IF EXISTS "Allow public read access to videos cache" ON youtube_videos_cache;
DROP POLICY IF EXISTS "Allow public read access to channels cache" ON youtube_channels_cache;
DROP POLICY IF EXISTS "Allow service role to manage playlists cache" ON youtube_playlists_cache;
DROP POLICY IF EXISTS "Allow service role to manage videos cache" ON youtube_videos_cache;
DROP POLICY IF EXISTS "Allow service role to manage channels cache" ON youtube_channels_cache;

-- ── 2. Helper: is_admin_or_mod ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_or_mod()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE uid = auth.uid()
      AND role IN ('admin', 'moderator', 'super_admin')
  );
$$;

-- ── 3. TEACHERS ──────────────────────────────────────────────────────────
-- Public: read active teachers.  Admin: full CRUD.
CREATE POLICY "teachers_select_public" ON public.teachers
  FOR SELECT USING (is_active = true OR is_admin_or_mod());

CREATE POLICY "teachers_insert_admin" ON public.teachers
  FOR INSERT WITH CHECK (is_admin_or_mod());

CREATE POLICY "teachers_update_admin" ON public.teachers
  FOR UPDATE USING (is_admin_or_mod());

CREATE POLICY "teachers_delete_admin" ON public.teachers
  FOR DELETE USING (is_admin_or_mod());

-- ── 4. PLAYLISTS ─────────────────────────────────────────────────────────
CREATE POLICY "playlists_select_public" ON public.playlists
  FOR SELECT USING (is_active = true OR is_admin_or_mod());

CREATE POLICY "playlists_insert_admin" ON public.playlists
  FOR INSERT WITH CHECK (is_admin_or_mod());

CREATE POLICY "playlists_update_admin" ON public.playlists
  FOR UPDATE USING (is_admin_or_mod());

CREATE POLICY "playlists_delete_admin" ON public.playlists
  FOR DELETE USING (is_admin_or_mod());

-- ── 5. VIDEOS ────────────────────────────────────────────────────────────
CREATE POLICY "videos_select_public" ON public.videos
  FOR SELECT USING (is_active = true OR is_admin_or_mod());

CREATE POLICY "videos_insert_admin" ON public.videos
  FOR INSERT WITH CHECK (is_admin_or_mod());

CREATE POLICY "videos_update_admin" ON public.videos
  FOR UPDATE USING (is_admin_or_mod());

CREATE POLICY "videos_delete_admin" ON public.videos
  FOR DELETE USING (is_admin_or_mod());

-- ── 6. TEST_SERIES ───────────────────────────────────────────────────────
CREATE POLICY "test_series_select_public" ON public.test_series
  FOR SELECT USING (true);

CREATE POLICY "test_series_insert_admin" ON public.test_series
  FOR INSERT WITH CHECK (is_admin_or_mod());

CREATE POLICY "test_series_update_admin" ON public.test_series
  FOR UPDATE USING (is_admin_or_mod());

CREATE POLICY "test_series_delete_admin" ON public.test_series
  FOR DELETE USING (is_admin_or_mod());

-- ── 7. INSTITUTES ────────────────────────────────────────────────────────
CREATE POLICY "institutes_select_public" ON public.institutes
  FOR SELECT USING (true);

CREATE POLICY "institutes_insert_admin" ON public.institutes
  FOR INSERT WITH CHECK (is_admin_or_mod());

CREATE POLICY "institutes_update_admin" ON public.institutes
  FOR UPDATE USING (is_admin_or_mod());

CREATE POLICY "institutes_delete_admin" ON public.institutes
  FOR DELETE USING (is_admin_or_mod());

-- ── 8. BATCHES ───────────────────────────────────────────────────────────
CREATE POLICY "batches_select_public" ON public.batches
  FOR SELECT USING (true);

CREATE POLICY "batches_insert_admin" ON public.batches
  FOR INSERT WITH CHECK (is_admin_or_mod());

CREATE POLICY "batches_update_admin" ON public.batches
  FOR UPDATE USING (is_admin_or_mod());

CREATE POLICY "batches_delete_admin" ON public.batches
  FOR DELETE USING (is_admin_or_mod());

-- ── 9. PROFILES ──────────────────────────────────────────────────────────
-- Users read their own profile.  Admins read any.
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = uid OR is_admin_or_mod());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = uid);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = uid)
  WITH CHECK (auth.uid() = uid);

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (is_admin_or_mod());

-- ── 10. REVIEWS ──────────────────────────────────────────────────────────
-- Public reads non-flagged reviews.  Owner manages own.
CREATE POLICY "reviews_select_public" ON public.reviews
  FOR SELECT USING (is_flagged = false OR user_id = auth.uid()::text OR is_admin_or_mod());

CREATE POLICY "reviews_insert_own" ON public.reviews
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE USING (user_id = auth.uid()::text OR is_admin_or_mod());

CREATE POLICY "reviews_delete_own" ON public.reviews
  FOR DELETE USING (user_id = auth.uid()::text OR is_admin_or_mod());

-- ── 11. CHANNELS ─────────────────────────────────────────────────────────
CREATE POLICY "channels_select_public" ON public.channels
  FOR SELECT USING (is_active = true OR is_admin_or_mod());

CREATE POLICY "channels_insert_admin" ON public.channels
  FOR INSERT WITH CHECK (is_admin_or_mod());

CREATE POLICY "channels_update_admin" ON public.channels
  FOR UPDATE USING (is_admin_or_mod());

CREATE POLICY "channels_delete_admin" ON public.channels
  FOR DELETE USING (is_admin_or_mod());

-- ── 12. SYNC_LOGS — admin-only ────────────────────────────────────────────
CREATE POLICY "sync_logs_select_admin" ON public.sync_logs
  FOR SELECT USING (is_admin_or_mod());

CREATE POLICY "sync_logs_insert_service" ON public.sync_logs
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role' OR is_admin_or_mod());

-- ── 13. NOTIFICATIONS — own only ──────────────────────────────────────────
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_service" ON public.notifications
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role' OR is_admin_or_mod());

-- ── 14. AUDIT_LOGS — admin-only ───────────────────────────────────────────
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT USING (is_admin_or_mod());

CREATE POLICY "audit_logs_insert_service" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role' OR is_admin_or_mod());

-- ── 15. LAYOUT_BLOCKS — public read, admin write ─────────────────────────
CREATE POLICY "layout_blocks_select_public" ON public.layout_blocks
  FOR SELECT USING (is_active = true OR is_admin_or_mod());

CREATE POLICY "layout_blocks_insert_admin" ON public.layout_blocks
  FOR INSERT WITH CHECK (is_admin_or_mod());

CREATE POLICY "layout_blocks_update_admin" ON public.layout_blocks
  FOR UPDATE USING (is_admin_or_mod());

CREATE POLICY "layout_blocks_delete_admin" ON public.layout_blocks
  FOR DELETE USING (is_admin_or_mod());

-- ── 16. INGESTION_LOGS — admin-only ───────────────────────────────────────
CREATE POLICY "ingestion_logs_select_admin" ON public.ingestion_logs
  FOR SELECT USING (is_admin_or_mod());

CREATE POLICY "ingestion_logs_insert_service" ON public.ingestion_logs
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role' OR is_admin_or_mod());

-- ── 17. INGESTION_CONTROL — admin-only ────────────────────────────────────
CREATE POLICY "ingestion_control_select_admin" ON public.ingestion_control
  FOR SELECT USING (is_admin_or_mod());

CREATE POLICY "ingestion_control_insert_service" ON public.ingestion_control
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role' OR is_admin_or_mod());

CREATE POLICY "ingestion_control_update_service" ON public.ingestion_control
  FOR UPDATE USING (auth.jwt()->>'role' = 'service_role' OR is_admin_or_mod());

-- ── 18. MODERATION_REPORTS ────────────────────────────────────────────────
-- Reporters see own reports.  Admins see all.
CREATE POLICY "moderation_reports_select_own" ON public.moderation_reports
  FOR SELECT USING (reporter_id = auth.uid() OR is_admin_or_mod());

CREATE POLICY "moderation_reports_insert_own" ON public.moderation_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "moderation_reports_update_admin" ON public.moderation_reports
  FOR UPDATE USING (is_admin_or_mod());

-- ── 19. WATCH_HISTORY — own only ──────────────────────────────────────────
CREATE POLICY "watch_history_select_own" ON public.watch_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "watch_history_insert_own" ON public.watch_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "watch_history_update_own" ON public.watch_history
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "watch_history_delete_own" ON public.watch_history
  FOR DELETE USING (user_id = auth.uid());

-- ── 20. TEACHER_FOLLOWERS ─────────────────────────────────────────────────
CREATE POLICY "teacher_followers_select_public" ON public.teacher_followers
  FOR SELECT USING (true);

CREATE POLICY "teacher_followers_insert_own" ON public.teacher_followers
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "teacher_followers_delete_own" ON public.teacher_followers
  FOR DELETE USING (user_id = auth.uid()::text);

-- ── 21. YOUTUBE CACHE TABLES ──────────────────────────────────────────────
CREATE POLICY "youtube_cache_select_public" ON youtube_playlists_cache
  FOR SELECT USING (true);

CREATE POLICY "youtube_cache_select_public" ON youtube_videos_cache
  FOR SELECT USING (true);

CREATE POLICY "youtube_cache_select_public" ON youtube_channels_cache
  FOR SELECT USING (true);

CREATE POLICY "youtube_cache_insert_service" ON youtube_playlists_cache
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "youtube_cache_insert_service" ON youtube_videos_cache
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "youtube_cache_insert_service" ON youtube_channels_cache
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ── 22. STORAGE BUCKETS ───────────────────────────────────────────────────
-- Bucket: user-content (profile images, etc.)
CREATE POLICY "storage_select_public" ON storage.objects
  FOR SELECT USING (bucket_id IN ('user-content', 'public-assets'));

CREATE POLICY "storage_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-content'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-content'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-content'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 23. REALTIME ─────────────────────────────────────────────────────────
-- Only broadcast public data over realtime.
ALTER PUBLICATION supabase_realtime DROP ALL;

-- Add only tables that need realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.layout_blocks;

-- Realtime policies mirror SELECT policies
CREATE POLICY "realtime_teachers_select" ON public.teachers
  FOR SELECT USING (is_active = true)
  WITH CHECK (is_active = true);

-- ── 24. PERFORMANCE INDEXES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_uid_role ON public.profiles(uid, role);
CREATE INDEX IF NOT EXISTS idx_reviews_entity_id ON public.reviews(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id, lecture_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON public.moderation_reports(status);
CREATE INDEX IF NOT EXISTS idx_videos_teacher_id ON public.videos(teacher_id);
CREATE INDEX IF NOT EXISTS idx_videos_playlist_id ON public.videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlists_teacher_id ON public.playlists(teacher_id);
CREATE INDEX IF NOT EXISTS idx_playlists_channel_id ON public.playlists(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON public.channels(is_active);

-- ── 25. VERIFICATION QUERIES ─────────────────────────────────────────────
-- Run these after migration to verify:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- SELECT * FROM storage.policies ORDER BY bucket_id, name;
