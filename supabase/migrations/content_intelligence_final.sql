-- =========================================================================
-- CONTENT INTELLIGENCE PLATFORM SCHEMA MIGRATION
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ingestion Run Log & Health Monitoring
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schema_version VARCHAR(50) DEFAULT '1.0.0',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'running',
    api_quota_remaining INTEGER,
    failed_crawls_count INTEGER DEFAULT 0,
    processed_items_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    summary JSONB DEFAULT '{}'::jsonb
);

-- 2. Taxonomy Versioning
CREATE TABLE IF NOT EXISTS public.taxonomy_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Seed initial taxonomy version
INSERT INTO public.taxonomy_versions (version, description, is_active)
VALUES ('v1.0.0', 'Initial taxonomy matching rules for PW, Allen, and Competishun', true)
ON CONFLICT (version) DO NOTHING;

-- 3. Rule Engine Metadata
CREATE TABLE IF NOT EXISTS public.classification_rules (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'RULE_PHYSICS_014'
    name VARCHAR(255) NOT NULL,
    priority INTEGER NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'subject', 'chapter', 'teacher', 'series'
    rule_version VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Crawl Queue for Resumability
CREATE TABLE IF NOT EXISTS public.crawl_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'channel', 'playlist', 'video'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Raw Source API Snapshots (Auditability & Deduplication)
CREATE TABLE IF NOT EXISTS public.source_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'channel', 'playlist', 'video'
    raw_payload JSONB NOT NULL,
    raw_payload_hash VARCHAR(64) NOT NULL, -- Hash to deduplicate redundant payloads
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_id, entity_type, raw_payload_hash)
);

-- 6. Staging Tables with Manual Verification Overrides & Locks
CREATE TABLE IF NOT EXISTS public.staging_playlists (
    id VARCHAR(255) PRIMARY KEY, -- Immutable YouTube Playlist ID
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(1024),
    video_count INTEGER DEFAULT 0,
    channel_id VARCHAR(255) NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    lock_reason VARCHAR(255),          -- Explain audit trail for locked entities
    locked_by UUID,                    -- Moderator UUID
    confidence_score NUMERIC(5, 2) DEFAULT 100.0,
    classification_status VARCHAR(50) DEFAULT 'pending',
    review_status VARCHAR(50) DEFAULT 'pending',
    source_snapshot_id UUID REFERENCES public.source_snapshots(id) ON DELETE SET NULL,
    content_type VARCHAR(50) DEFAULT 'playlist',
    academic_type VARCHAR(50),
    content_fingerprint VARCHAR(64),   -- Content checksum (e.g. video-id list hash)
    taxonomy_version VARCHAR(50) REFERENCES public.taxonomy_versions(version),
    last_synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.staging_videos (
    id VARCHAR(255) PRIMARY KEY, -- Immutable YouTube Video ID
    title VARCHAR(255) NOT NULL,
    video_url VARCHAR(1024) NOT NULL,
    duration_seconds INTEGER,
    thumbnail_url VARCHAR(1024),
    playlist_id VARCHAR(255) REFERENCES public.staging_playlists(id) ON DELETE CASCADE,
    is_locked BOOLEAN DEFAULT FALSE,
    lock_reason VARCHAR(255),
    locked_by UUID,
    confidence_score NUMERIC(5, 2) DEFAULT 100.0,
    classification_status VARCHAR(50) DEFAULT 'pending',
    review_status VARCHAR(50) DEFAULT 'pending',
    source_snapshot_id UUID REFERENCES public.source_snapshots(id) ON DELETE SET NULL,
    content_type VARCHAR(50) DEFAULT 'lecture',
    academic_type VARCHAR(50),
    content_fingerprint VARCHAR(64),
    taxonomy_version VARCHAR(50) REFERENCES public.taxonomy_versions(version),
    last_synced_at TIMESTAMPTZ
);

-- 7. Teacher, Chapter & Topic Aliases
CREATE TABLE IF NOT EXISTS public.teacher_aliases (
    id SERIAL PRIMARY KEY,
    teacher_id VARCHAR(255) REFERENCES public.teachers(id) ON DELETE CASCADE,
    alias VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chapter_aliases (
    id SERIAL PRIMARY KEY,
    chapter_code VARCHAR(100) NOT NULL,
    alias VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.topic_aliases (
    id SERIAL PRIMARY KEY,
    topic_code VARCHAR(100) NOT NULL,
    alias VARCHAR(255) UNIQUE NOT NULL
);

-- 8. Change Review Dashboard Log
CREATE TABLE IF NOT EXISTS public.change_review_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES public.ingestion_runs(id) ON DELETE SET NULL,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'playlist', 'video', 'teacher'
    field_name VARCHAR(100) NOT NULL,  -- 'title', 'subject', 'teacher_id'
    old_value TEXT,
    new_value TEXT,
    confidence_score NUMERIC(5, 2) NOT NULL,
    matched_rule_id VARCHAR(100) REFERENCES public.classification_rules(id) ON DELETE SET NULL,
    evidence JSONB NOT NULL,            -- Array of matching signals/rules matched
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Detailed Mutation Change History
CREATE TABLE IF NOT EXISTS public.change_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES public.ingestion_runs(id) ON DELETE SET NULL,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    modified_by UUID,                  -- System or moderator UUID
    modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Topics Entity (Chapter -> Topic -> Lecture)
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
    code VARCHAR(100) PRIMARY KEY, -- Canonical Immutable Topic ID (e.g. 'TOPIC_RELATIVE_MOTION')
    chapter_code VARCHAR(100) NOT NULL, -- References public.syllabus_chapters
    name VARCHAR(255) NOT NULL, -- Display Name
    sort_order INTEGER NOT NULL
);

-- 11. Video Relationships (Recommendation & Lineage Engine)
CREATE TABLE IF NOT EXISTS public.video_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_video_id VARCHAR(255) NOT NULL,
    target_video_id VARCHAR(255) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL, -- 'prerequisite_of', 'revision_of', 'practice_after', 'same_topic', 'duplicate_of', 'continued_in', 'recommended_after'
    evidence JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_video_id, target_video_id, relationship_type)
);

-- 12. Isolated AI Metadata Layer (Separate from Ground Truth)
CREATE TABLE IF NOT EXISTS public.video_ai_metadata (
    video_id VARCHAR(255) PRIMARY KEY REFERENCES public.videos(id) ON DELETE CASCADE,
    summary TEXT,
    difficulty VARCHAR(50), -- 'easy', 'medium', 'hard'
    prerequisites TEXT[],
    learning_objectives TEXT[],
    estimated_study_time INTEGER, -- minutes
    important_formulas TEXT[],
    key_pyq_timestamps JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Event Logger
CREATE TABLE IF NOT EXISTS public.ingestion_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES public.ingestion_runs(id) ON DELETE SET NULL,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- 'playlist_renamed', 'teacher_changed', 'series_merged', 'video_removed'
    details JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Coverage Snapshots History
CREATE TABLE IF NOT EXISTS public.coverage_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE DEFAULT CURRENT_DATE,
    subject VARCHAR(255) NOT NULL,
    class_tag VARCHAR(50) NOT NULL,
    chapters_expected INTEGER NOT NULL,
    chapters_detected INTEGER NOT NULL,
    coverage_percentage NUMERIC(5, 2) NOT NULL,
    missing_chapters TEXT[] NOT NULL,
    extra_chapters TEXT[] NOT NULL
);

-- =========================================================================
-- RLS POLICIES & PERMISSIONS
-- =========================================================================

-- Enable Row Level Security (RLS)
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_review_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ai_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all public-facing intelligence tables
DROP POLICY IF EXISTS "Allow public read access for ingestion_runs" ON public.ingestion_runs;
CREATE POLICY "Allow public read access for ingestion_runs" ON public.ingestion_runs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access for taxonomy_versions" ON public.taxonomy_versions;
CREATE POLICY "Allow public read access for taxonomy_versions" ON public.taxonomy_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access for classification_rules" ON public.classification_rules;
CREATE POLICY "Allow public read access for classification_rules" ON public.classification_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access for staging_playlists" ON public.staging_playlists;
CREATE POLICY "Allow public read access for staging_playlists" ON public.staging_playlists FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access for staging_videos" ON public.staging_videos;
CREATE POLICY "Allow public read access for staging_videos" ON public.staging_videos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access for syllabus_topics" ON public.syllabus_topics;
CREATE POLICY "Allow public read access for syllabus_topics" ON public.syllabus_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access for video_relationships" ON public.video_relationships;
CREATE POLICY "Allow public read access for video_relationships" ON public.video_relationships FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access for video_ai_metadata" ON public.video_ai_metadata;
CREATE POLICY "Allow public read access for video_ai_metadata" ON public.video_ai_metadata FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access for coverage_snapshots" ON public.coverage_snapshots;
CREATE POLICY "Allow public read access for coverage_snapshots" ON public.coverage_snapshots FOR SELECT USING (true);

-- Allow system/service_role to perform all write/mutate operations
-- Note: Supabase service_role bypasses RLS by default, but we declare policies explicitly for safety.
CREATE POLICY "Allow service_role full control on ingestion_runs" ON public.ingestion_runs FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full control on crawl_queue" ON public.crawl_queue FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full control on source_snapshots" ON public.source_snapshots FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full control on staging_playlists" ON public.staging_playlists FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full control on staging_videos" ON public.staging_videos FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full control on change_review_log" ON public.change_review_log FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full control on change_history" ON public.change_history FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full control on video_relationships" ON public.video_relationships FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full control on ingestion_events" ON public.ingestion_events FOR ALL TO service_role USING (true);
