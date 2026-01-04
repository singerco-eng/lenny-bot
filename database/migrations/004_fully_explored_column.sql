-- Migration 004: Add fully_explored column to app_pages
-- This tracks pages that have been completely explored (no more sub-pages to discover)

-- Add the column
ALTER TABLE app_pages 
ADD COLUMN IF NOT EXISTS fully_explored BOOLEAN DEFAULT FALSE;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_app_pages_fully_explored 
ON app_pages(fully_explored) 
WHERE fully_explored = TRUE;

-- Comment
COMMENT ON COLUMN app_pages.fully_explored IS 'True if this page has been fully explored and has no more undiscovered sub-pages';

