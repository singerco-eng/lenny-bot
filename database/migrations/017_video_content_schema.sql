-- ============================================
-- LENNY BOT - Video Content Schema
-- Migration 017
-- ============================================
-- Schema for storing video content extracted from KB articles
-- Videos are transcribed and analyzed to create step-by-step guides

-- ============================================
-- KB Videos Table
-- ============================================
-- Videos discovered in KB articles

CREATE TABLE IF NOT EXISTS kb_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to source KB article
    source_url_id UUID REFERENCES source_urls(id) ON DELETE SET NULL,
    article_url TEXT,                    -- KB article URL where video was found
    article_title TEXT,                  -- Title of the KB article
    
    -- Video identification
    video_url TEXT NOT NULL,             -- YouTube/Vimeo/hosted URL
    video_id TEXT,                       -- Platform-specific ID (e.g., YouTube video ID)
    video_platform TEXT,                 -- 'youtube', 'vimeo', 'wistia', 'hosted'
    
    -- Video metadata
    title TEXT,
    description TEXT,
    duration_seconds INT,
    thumbnail_url TEXT,
    
    -- Processing status
    status TEXT DEFAULT 'discovered' CHECK (status IN (
        'discovered',      -- Found in KB article
        'downloading',     -- Being downloaded
        'transcribing',    -- Audio being transcribed
        'analyzing',       -- Frames being analyzed
        'completed',       -- Fully processed
        'failed',          -- Processing failed
        'skipped'          -- Intentionally skipped
    )),
    
    -- Full transcript (from Whisper)
    full_transcript TEXT,
    transcript_language TEXT DEFAULT 'en',
    
    -- AI-generated summary
    ai_summary TEXT,                     -- 2-3 paragraph summary
    
    -- Processing metadata
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(video_url)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_videos_source ON kb_videos(source_url_id);
CREATE INDEX IF NOT EXISTS idx_kb_videos_status ON kb_videos(status);
CREATE INDEX IF NOT EXISTS idx_kb_videos_platform ON kb_videos(video_platform);

COMMENT ON TABLE kb_videos IS 'Videos discovered in KB articles, transcribed for Q&A';

-- ============================================
-- Video Steps Table
-- ============================================
-- Timestamped steps extracted from videos

CREATE TABLE IF NOT EXISTS video_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES kb_videos(id) ON DELETE CASCADE,
    
    -- Step identification
    step_number INT NOT NULL,
    
    -- Timing
    timestamp_start FLOAT NOT NULL,      -- Start time in seconds
    timestamp_end FLOAT,                 -- End time in seconds
    timestamp_display TEXT,              -- "1:23" format
    
    -- Content
    narration TEXT,                      -- What's said (from transcript)
    frame_description TEXT,              -- What's shown (GPT-4o vision)
    action_summary TEXT,                 -- Concise: "Click the New Contact button"
    
    -- Screenshot
    frame_screenshot_path TEXT,          -- Local path
    frame_screenshot_url TEXT,           -- Supabase storage URL
    
    -- Metadata
    confidence FLOAT DEFAULT 1.0,        -- AI confidence in step detection
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(video_id, step_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_steps_video ON video_steps(video_id);
CREATE INDEX IF NOT EXISTS idx_video_steps_order ON video_steps(video_id, step_number);

COMMENT ON TABLE video_steps IS 'Timestamped steps from training videos';
COMMENT ON COLUMN video_steps.narration IS 'Transcribed speech for this time segment';
COMMENT ON COLUMN video_steps.frame_description IS 'GPT-4o description of what is shown on screen';
COMMENT ON COLUMN video_steps.action_summary IS 'Concise action like "Click the Save button"';

-- ============================================
-- Video Content Chunks (For RAG)
-- ============================================
-- These link videos to the content_chunks table for unified RAG search

-- Add new content types to support videos
-- The content_chunks table already exists, we just use new content_type values:
-- - 'video_transcript': Full video transcript
-- - 'video_summary': AI summary of video
-- - 'video_step': Individual step from video

-- Helper view to generate content chunks from video data
CREATE OR REPLACE VIEW video_content_for_rag AS
SELECT 
    v.id AS video_id,
    v.source_url_id,
    v.title,
    v.article_title,
    
    -- Full transcript as one chunk
    'video_transcript' AS content_type,
    v.full_transcript AS content,
    v.ai_summary AS summary,
    
    -- For hierarchy
    ARRAY[v.article_title, v.title] AS hierarchy_path
    
FROM kb_videos v
WHERE v.status = 'completed'
  AND v.full_transcript IS NOT NULL

UNION ALL

-- Individual steps as chunks
SELECT 
    v.id AS video_id,
    v.source_url_id,
    v.title || ' - Step ' || s.step_number AS title,
    v.article_title,
    
    'video_step' AS content_type,
    COALESCE(s.action_summary, '') || E'\n\n' ||
    'What is said: ' || COALESCE(s.narration, '') || E'\n\n' ||
    'What is shown: ' || COALESCE(s.frame_description, '') AS content,
    s.action_summary AS summary,
    
    ARRAY[v.article_title, v.title, 'Step ' || s.step_number] AS hierarchy_path
    
FROM kb_videos v
JOIN video_steps s ON s.video_id = v.id
WHERE v.status = 'completed';

-- ============================================
-- Video Processing Queue
-- ============================================
-- Track video processing jobs

CREATE TABLE IF NOT EXISTS video_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES kb_videos(id) ON DELETE CASCADE,
    
    job_type TEXT NOT NULL CHECK (job_type IN (
        'download', 'transcribe', 'extract_frames', 'analyze_frames', 'generate_steps'
    )),
    
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed'
    )),
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Job-specific data
    job_data JSONB DEFAULT '{}',
    result_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_video ON video_processing_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_processing_jobs(status);

-- ============================================
-- Helper Views
-- ============================================

-- Videos needing processing
CREATE OR REPLACE VIEW videos_to_process AS
SELECT 
    id,
    video_url,
    video_platform,
    title,
    status,
    article_title
FROM kb_videos
WHERE status IN ('discovered', 'failed')
ORDER BY created_at;

-- Video processing summary
CREATE OR REPLACE VIEW video_processing_summary AS
SELECT 
    status,
    COUNT(*) AS count,
    COUNT(*) FILTER (WHERE full_transcript IS NOT NULL) AS with_transcript,
    COUNT(*) FILTER (WHERE ai_summary IS NOT NULL) AS with_summary
FROM kb_videos
GROUP BY status;

-- Steps per video
CREATE OR REPLACE VIEW video_step_counts AS
SELECT 
    v.id,
    v.title,
    v.status,
    COUNT(s.id) AS step_count,
    SUM(CASE WHEN s.frame_description IS NOT NULL THEN 1 ELSE 0 END) AS steps_with_frames
FROM kb_videos v
LEFT JOIN video_steps s ON s.video_id = v.id
GROUP BY v.id, v.title, v.status;

-- ============================================
-- Triggers
-- ============================================

-- Update updated_at on kb_videos
CREATE OR REPLACE FUNCTION update_kb_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_kb_videos_updated_at ON kb_videos;
CREATE TRIGGER update_kb_videos_updated_at
    BEFORE UPDATE ON kb_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_kb_videos_updated_at();









