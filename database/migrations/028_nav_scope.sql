-- Migration 028: Navigation Scope
-- Adds nav_scope to classify global vs page-specific navigation

-- Add nav_scope column to page_actions
ALTER TABLE page_actions
ADD COLUMN IF NOT EXISTS nav_scope VARCHAR(20) DEFAULT 'page_specific';

COMMENT ON COLUMN page_actions.nav_scope IS
'Navigation scope: app_global (all pages), job_global (all job pages), contact_global, page_specific';

-- Add nav_scope column to page_components (for shared components like Job Header)
ALTER TABLE page_components
ADD COLUMN IF NOT EXISTS nav_scope VARCHAR(20) DEFAULT 'page_specific';

COMMENT ON COLUMN page_components.nav_scope IS
'Navigation scope: app_global, job_global, contact_global, page_specific';

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_page_actions_nav_scope ON page_actions(nav_scope);
CREATE INDEX IF NOT EXISTS idx_page_components_nav_scope ON page_components(nav_scope);

