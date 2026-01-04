-- Migration 015: Add logging columns to page_crawls
-- Stores log file URL and performance metrics

ALTER TABLE page_crawls 
ADD COLUMN IF NOT EXISTS log_url TEXT,
ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb;

-- Add index for quick metrics queries
CREATE INDEX IF NOT EXISTS idx_page_crawls_metrics ON page_crawls USING GIN (metrics);

-- Comment
COMMENT ON COLUMN page_crawls.log_url IS 'URL to the log file in Supabase storage';
COMMENT ON COLUMN page_crawls.metrics IS 'Performance metrics: duration, api_calls, errors, phase_times, etc.';










