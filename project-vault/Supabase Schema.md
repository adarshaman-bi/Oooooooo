# Supabase Schema 🗄️

The database structure configured inside Supabase PostgreSQL, detailing key tables, relationships, and RLS rules.

- **Migration Path**: `supabase/migrations/004_rls_hardening.sql`
- **Related Notes**: [[dbService]], [[youtubeService]], [[AuthContext]]

---

## 📊 Database Tables

### 1. `public.profiles`
Stores student accounts, configuration, and app onboarding states.
- **Key Columns**: `uid` (UUID, primary key), `email`, `role` (`student`, `moderator`, `admin`, `super_admin`), `exam_type` (`JEE`, `NEET`, `Both`), `preferred_subjects`, `onboarding_completed`.
- **Security**: Only the profile owner or moderators can query or edit.

### 2. `public.videos`
Caches lecture meta, durations, views, and associations.
- **Key Columns**: `id` (YouTube Video ID, primary key), `title`, `video_url`, `duration`, `playlist_id` (foreign key), `views`, `thumbnail_url`, `teacher_name`, `exam_type`.

### 3. `public.teachers`
Verified educator profiles displayed in catalogs.
- **Key Columns**: `id` (Primary key), `name`, `subject`, `rating`, `accuracy`, `video_count`, `followers_count`, `bio`, `is_verified`.

### 4. `public.watch_history`
Saves resuming timelines for lectures.
- **Key Columns**: `id` (Primary key), `user_id` (UUID), `lecture_id` (Video ID), `progress_seconds`, `completed`, `updated_at`.
- **Security**: Users can only read, write, and delete their own watch history records.

---

## 🔒 Row Level Security (RLS) Status
Every table in the database has RLS enabled. Read actions default to public access for active/published items, while mutations are constrained:
- **Write profile**: `auth.uid() = uid`
- **Write reviews**: `auth.uid() = user_id`
- **Ingestion control**: Restricted to `service_role` or admin.
