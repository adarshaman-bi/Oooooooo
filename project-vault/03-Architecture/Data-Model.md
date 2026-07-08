# Data Model

## Supabase PostgreSQL Schemas

### 1. profiles
- **Columns**: `uid` (UUID), `email` (VARCHAR), `role` (VARCHAR), `exam_type` (VARCHAR), `onboarding_completed` (BOOLEAN).
- **RLS**: `profiles_select_own`, `profiles_update_own`.

### 2. videos
- **Columns**: `id` (VARCHAR), `title` (VARCHAR), `video_url` (VARCHAR), `duration` (VARCHAR), `playlist_id` (VARCHAR), `views` (INTEGER).
- **RLS**: `videos_select_public`, `videos_insert_admin`.

### 3. watch_history
- **Columns**: `id` (VARCHAR), `user_id` (UUID), `lecture_id` (VARCHAR), `progress_seconds` (INTEGER), `completed` (BOOLEAN).
- **RLS**: `watch_history_select_own`, `watch_history_insert_own`.
