-- ============================================
-- Tiered Crawl System
-- ============================================
-- Adds priority tracking for actions/components
-- and page-level crawl completion tracking.
-- ============================================

-- Add priority column to page_actions
ALTER TABLE page_actions 
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';

COMMENT ON COLUMN page_actions.priority IS 
'Action priority tier: high (primary actions), medium (icon buttons, menu items), low (filters, toggles)';

-- Add priority column to page_components
ALTER TABLE page_components 
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';

COMMENT ON COLUMN page_components.priority IS 
'Component priority tier: high (critical modals), medium (supporting drawers), low (minor panels)';

-- Add crawl completion tracking to app_pages
ALTER TABLE app_pages 
ADD COLUMN IF NOT EXISTS crawl_tier_completed VARCHAR(20) DEFAULT 'none';

COMMENT ON COLUMN app_pages.crawl_tier_completed IS 
'Tracks crawl progress: none (not started), tier1 (high priority done), tier2 (medium done), full (all done)';

-- Create index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_page_actions_priority 
ON page_actions(priority);

CREATE INDEX IF NOT EXISTS idx_page_components_priority 
ON page_components(priority);

CREATE INDEX IF NOT EXISTS idx_app_pages_crawl_tier 
ON app_pages(crawl_tier_completed);






