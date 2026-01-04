-- Add kb_context_used column to page_actions table
-- This allows tracking KB articles referenced when describing actions

ALTER TABLE page_actions
ADD COLUMN IF NOT EXISTS kb_context_used JSONB;

COMMENT ON COLUMN page_actions.kb_context_used IS 'KB articles referenced when describing this action';






