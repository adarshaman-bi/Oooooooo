-- =========================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR BIOVISED (CLEAN DEPLOY)
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.teachers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    avatar VARCHAR(1024),
    rating NUMERIC(3, 2) DEFAULT 4.5,
    accuracy INTEGER DEFAULT 90,
    video_count INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    bio TEXT,
    is_verified BOOLEAN DEFAULT TRUE,
    subjects JSONB,
    exams JSONB,
    features JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.playlists (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    thumbnail VARCHAR(1024),
    description TEXT,
    teacher_id VARCHAR(255) REFERENCES public.teachers(id) ON DELETE SET NULL,
    lectures_count INTEGER DEFAULT 0,
    exam_type VARCHAR(100) DEFAULT 'Both',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.videos (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    video_url VARCHAR(1024) NOT NULL,
    duration VARCHAR(50),
    category VARCHAR(255) DEFAULT 'lecture',
    playlist_id VARCHAR(255) REFERENCES public.playlists(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    thumbnail_url VARCHAR(1024),
    subject VARCHAR(255),
    exam_type VARCHAR(100) DEFAULT 'Both',
    content_type VARCHAR(50) DEFAULT 'lecture',
    teacher_id VARCHAR(255),
    teacher_name VARCHAR(255),
    institute_id VARCHAR(255),
    institute_name VARCHAR(255),
    likes_count INTEGER DEFAULT 0,
    publish_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.test_series (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    total_tests INTEGER DEFAULT 20,
    category VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    features JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.institutes (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo VARCHAR(1024),
    description TEXT,
    rating NUMERIC(3, 2) DEFAULT 4.5,
    review_count INTEGER DEFAULT 0,
    trust_score INTEGER DEFAULT 90,
    followers_count INTEGER DEFAULT 0,
    official_links JSONB,
    exams JSONB,
    is_verified BOOLEAN DEFAULT TRUE,
    features JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.batches (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    institute_id VARCHAR(255),
    institute_name VARCHAR(255),
    subject VARCHAR(255),
    teacher_id VARCHAR(255),
    teacher_name VARCHAR(255),
    price NUMERIC(10, 2),
    discount_price NUMERIC(10, 2),
    features JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    exam_type VARCHAR(100) DEFAULT 'NEET',
    appearing_year VARCHAR(50) DEFAULT '2026',
    preferred_subjects JSONB,
    watched_content JSONB,
    saved_content JSONB,
    hidden_content JSONB,
    liked_content JSONB,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    login_type VARCHAR(50) DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
    id VARCHAR(255) PRIMARY KEY,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    user_display_name VARCHAR(255),
    rating NUMERIC(3, 2) DEFAULT 5.0,
    comment TEXT,
    is_flagged BOOLEAN DEFAULT FALSE,
    features JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.channels (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(1024),
    website VARCHAR(1024),
    exams JSONB,
    institute_id VARCHAR(255),
    teacher_id VARCHAR(255),
    subscribers VARCHAR(100),
    playlists_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_logs (
    id VARCHAR(255) PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    channel_id VARCHAR(255),
    playlists_imported INTEGER DEFAULT 0,
    videos_imported INTEGER DEFAULT 0,
    quota_used INTEGER DEFAULT 0,
    status VARCHAR(50),
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    admin_user_id UUID,
    action_type VARCHAR(50),
    target_collection VARCHAR(100),
    target_document_id VARCHAR(255),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(50),
    delta_changes JSONB
);

CREATE TABLE IF NOT EXISTS public.layout_blocks (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB
);

CREATE TABLE IF NOT EXISTS public.ingestion_logs (
    id VARCHAR(255) PRIMARY KEY,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    status VARCHAR(50),
    logs JSONB
);

CREATE TABLE IF NOT EXISTS public.ingestion_control (
    id VARCHAR(255) PRIMARY KEY,
    is_running BOOLEAN DEFAULT FALSE,
    last_run TIMESTAMPTZ,
    config JSONB
);

CREATE TABLE IF NOT EXISTS public.moderation_reports (
    id VARCHAR(255) PRIMARY KEY,
    reporter_id UUID NOT NULL,
    reporter_name VARCHAR(255),
    target_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    commentary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.watch_history (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL,
    lecture_id VARCHAR(255) NOT NULL,
    progress_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Allow public read access for playlists" ON public.playlists FOR SELECT USING (true);
CREATE POLICY "Allow public read access for videos" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Allow public read access for test_series" ON public.test_series FOR SELECT USING (true);
CREATE POLICY "Allow public read access for profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read access for batches" ON public.batches FOR SELECT USING (true);
CREATE POLICY "Allow public read access for institutes" ON public.institutes FOR SELECT USING (true);
CREATE POLICY "Allow public read access for reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow public read access for channels" ON public.channels FOR SELECT USING (true);
CREATE POLICY "Allow public read access for sync_logs" ON public.sync_logs FOR SELECT USING (true);
CREATE POLICY "Allow public read access for notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow public read access for audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow public read access for layout_blocks" ON public.layout_blocks FOR SELECT USING (true);
CREATE POLICY "Allow public read access for ingestion_logs" ON public.ingestion_logs FOR SELECT USING (true);
CREATE POLICY "Allow public read access for ingestion_control" ON public.ingestion_control FOR SELECT USING (true);
CREATE POLICY "Allow public read access for moderation_reports" ON public.moderation_reports FOR SELECT USING (true);
CREATE POLICY "Allow public read access for watch_history" ON public.watch_history FOR SELECT USING (true);

-- Fixed comparison formatting
CREATE POLICY "Allow individual write profile" ON public.profiles 
    FOR ALL USING (auth.uid()::text = uid::text);
