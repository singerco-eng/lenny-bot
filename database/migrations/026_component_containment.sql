-- ============================================
-- Migration 026: Component Containment Schema
-- ============================================
-- Adds ability to track:
-- 1. Which actions are INSIDE which components (parent_component_id)
-- 2. What capabilities a component has (capabilities array)
-- 
-- This enables queries like:
-- - "What components can send email?"
-- - "What actions are inside the Email Composer Drawer?"
-- ============================================

-- 1. Add parent_component_id to actions
-- This tracks when an action is INSIDE a component (not just opens it)
ALTER TABLE page_actions 
ADD COLUMN IF NOT EXISTS parent_component_id UUID REFERENCES page_components(id);

COMMENT ON COLUMN page_actions.parent_component_id IS 
'The component this action is INSIDE of (e.g., Send button inside Email Composer Drawer). Different from opens_component_id which tracks what the action OPENS.';

-- 2. Add capabilities array to components
-- Structured tags for what a component can DO
ALTER TABLE page_components 
ADD COLUMN IF NOT EXISTS capabilities TEXT[];

COMMENT ON COLUMN page_components.capabilities IS 
'Array of capability tags: send_email, send_sms, send_portal_message, create_task, create_appointment, upload_file, edit_contact, make_payment, etc.';

-- 3. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_page_actions_parent_component 
ON page_actions(parent_component_id);

CREATE INDEX IF NOT EXISTS idx_page_components_capabilities 
ON page_components USING GIN(capabilities);

-- 4. Create helper view for capability search
CREATE OR REPLACE VIEW component_capabilities AS
SELECT 
    c.id,
    c.component_name,
    c.component_type,
    c.capabilities,
    p.url_pattern as page_pattern,
    p.title as page_title,
    c.ai_description,
    c.screenshot_path
FROM page_components c
JOIN app_pages p ON c.page_id = p.id
WHERE c.capabilities IS NOT NULL AND array_length(c.capabilities, 1) > 0;

-- 5. Create helper function to find components by capability
CREATE OR REPLACE FUNCTION find_components_by_capability(cap TEXT)
RETURNS TABLE (
    component_name TEXT,
    component_type TEXT,
    page_pattern TEXT,
    description TEXT,
    all_capabilities TEXT[]
)
LANGUAGE sql
AS $$
    SELECT 
        c.component_name,
        c.component_type,
        p.url_pattern,
        c.ai_description,
        c.capabilities
    FROM page_components c
    JOIN app_pages p ON c.page_id = p.id
    WHERE cap = ANY(c.capabilities)
    ORDER BY c.component_name;
$$;

-- Example usage:
-- SELECT * FROM find_components_by_capability('send_email');
-- SELECT * FROM find_components_by_capability('create_task');

