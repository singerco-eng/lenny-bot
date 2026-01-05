-- Migration 027: Display Labels for Sitemap
-- Adds display_label column for human-readable sitemap labels

-- Add display_label to page_actions
ALTER TABLE page_actions
ADD COLUMN IF NOT EXISTS display_label VARCHAR(60);

COMMENT ON COLUMN page_actions.display_label IS
'Short human-readable label for sitemap display (3-5 words max). NULL means use element_text as-is.';

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_page_actions_display_label ON page_actions(display_label);

