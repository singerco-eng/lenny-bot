-- ============================================
-- LENNY BOT - Add Header Screenshot Columns
-- Migration 011
-- ============================================
-- Adds missing header_screenshot columns to global_navigation table
-- These were being saved by code but columns didn't exist

-- Add header screenshot columns to global_navigation
ALTER TABLE global_navigation 
ADD COLUMN IF NOT EXISTS header_screenshot_path TEXT;

ALTER TABLE global_navigation 
ADD COLUMN IF NOT EXISTS header_screenshot_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN global_navigation.header_screenshot_path IS 'Local filesystem path to the header overview screenshot';
COMMENT ON COLUMN global_navigation.header_screenshot_url IS 'Supabase Storage public URL for the header overview screenshot';











