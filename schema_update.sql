-- =========================================================================
-- DATABASE LAYER: MONITORED CHANNELS & VIDEO REVIEWS SCHEMAS
-- =========================================================================

-- Create monitored_channels table
CREATE TABLE IF NOT EXISTS public.monitored_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id TEXT NOT NULL UNIQUE,
    custom_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create video_reviews table
CREATE TABLE IF NOT EXISTS public.video_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating NUMERIC(3, 2) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.monitored_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_reviews ENABLE ROW LEVEL SECURITY;

-- Set up RLS Policies
DROP POLICY IF EXISTS "Allow public read access for monitored_channels" ON public.monitored_channels;
CREATE POLICY "Allow public read access for monitored_channels" 
    ON public.monitored_channels FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access for video_reviews" ON public.video_reviews;
CREATE POLICY "Allow public read access for video_reviews" 
    ON public.video_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert video_reviews" ON public.video_reviews;
CREATE POLICY "Allow authenticated users to insert video_reviews" 
    ON public.video_reviews FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to update/delete their own reviews" ON public.video_reviews;
CREATE POLICY "Allow users to update/delete their own reviews" 
    ON public.video_reviews FOR UPDATE 
    USING (auth.uid() = user_id);

-- Seed monitored_channels with verified educational coaching platforms (PW, Unacademy, Allen)
INSERT INTO public.monitored_channels (channel_id, custom_name)
VALUES 
    ('UCphU2bAGmw304CFAzy0EnCw', 'Physics Wallah - Alakh Pandey'),
    ('UC63V9iYI_vL-P_i36-1WlY9A', 'Unacademy JEE'),
    ('UC3dLaNdfNsc_zT_S_zT8_sw', 'Allen Career Institute')
ON CONFLICT (channel_id) DO NOTHING;

-- Create teacher_followers table
CREATE TABLE IF NOT EXISTS public.teacher_followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id VARCHAR(255) NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, user_id)
);

-- Enable RLS
ALTER TABLE public.teacher_followers ENABLE ROW LEVEL SECURITY;

-- Set up RLS Policies
DROP POLICY IF EXISTS "Allow public read access for teacher_followers" ON public.teacher_followers;
CREATE POLICY "Allow public read access for teacher_followers" 
    ON public.teacher_followers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to follow/unfollow" ON public.teacher_followers;
CREATE POLICY "Allow authenticated users to follow/unfollow" 
    ON public.teacher_followers FOR ALL USING (auth.uid() = user_id);

