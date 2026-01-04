-- Migration: 014_crawl_scoring.sql
-- Description: Add scoring columns to page_crawls for quality assessment
-- Date: 2025-12-13

-- Add scoring columns to page_crawls
ALTER TABLE page_crawls
ADD COLUMN IF NOT EXISTS crawl_score INTEGER DEFAULT 0;
-- Score 0-100 based on completeness

ALTER TABLE page_crawls
ADD COLUMN IF NOT EXISTS score_breakdown JSONB;
-- Detailed breakdown: { labels: 20, forms: 15, screenshots: 20, ... }

ALTER TABLE page_crawls
ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

ALTER TABLE page_crawls
ADD COLUMN IF NOT EXISTS score_notes TEXT;
-- Any notes about the scoring

-- Index for finding low-quality crawls
CREATE INDEX IF NOT EXISTS idx_page_crawls_score 
ON page_crawls(crawl_score);

COMMENT ON COLUMN page_crawls.crawl_score IS 'Quality score 0-100 based on completeness';
COMMENT ON COLUMN page_crawls.score_breakdown IS 'JSON breakdown of score components';











