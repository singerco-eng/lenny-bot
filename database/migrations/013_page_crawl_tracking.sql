-- Migration: 013_page_crawl_tracking.sql
-- Description: Add crawl tracking columns to app_pages
-- Date: 2025-12-13

-- Add crawl tracking columns to app_pages
ALTER TABLE app_pages
ADD COLUMN IF NOT EXISTS crawl_status TEXT DEFAULT 'pending';
-- pending, in_progress, completed, failed

ALTER TABLE app_pages
ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMPTZ;

ALTER TABLE app_pages
ADD COLUMN IF NOT EXISTS last_crawl_id UUID REFERENCES page_crawls(id);

ALTER TABLE app_pages
ADD COLUMN IF NOT EXISTS elements_count INTEGER DEFAULT 0;

ALTER TABLE app_pages
ADD COLUMN IF NOT EXISTS forms_count INTEGER DEFAULT 0;

-- Index for finding uncrawled pages
CREATE INDEX IF NOT EXISTS idx_app_pages_crawl_status 
ON app_pages(crawl_status);

-- Comments
COMMENT ON COLUMN app_pages.crawl_status IS 'Crawl status: pending, in_progress, completed, failed';
COMMENT ON COLUMN app_pages.last_crawled_at IS 'When the page was last fully crawled';
COMMENT ON COLUMN app_pages.last_crawl_id IS 'Reference to the most recent page crawl';
COMMENT ON COLUMN app_pages.elements_count IS 'Number of interactive elements discovered';
COMMENT ON COLUMN app_pages.forms_count IS 'Number of forms detected on the page';











