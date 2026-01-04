-- Add description column to page_actions table
-- This allows agents to document what each action does

ALTER TABLE page_actions 
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN page_actions.description IS 'Human-readable description of what this action does';






