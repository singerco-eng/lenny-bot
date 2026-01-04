-- Migration 007: Navigation Tracking
-- Adds columns to track where navigation elements lead to
-- This enables building sitemap connections from element data

-- Add navigation columns to ui_elements
ALTER TABLE ui_elements 
    ADD COLUMN IF NOT EXISTS navigation_target TEXT,      -- The path/URL this element navigates to
    ADD COLUMN IF NOT EXISTS navigation_type TEXT,        -- 'internal', 'external', 'anchor', 'javascript'
    ADD COLUMN IF NOT EXISTS target_page_id UUID REFERENCES app_pages(id) ON DELETE SET NULL;

-- Index for querying navigation elements
CREATE INDEX IF NOT EXISTS idx_ui_elements_nav_target ON ui_elements(navigation_target);
CREATE INDEX IF NOT EXISTS idx_ui_elements_nav_type ON ui_elements(navigation_type);
CREATE INDEX IF NOT EXISTS idx_ui_elements_target_page ON ui_elements(target_page_id);

-- View for navigation connections (sitemap edges)
CREATE OR REPLACE VIEW navigation_connections AS
SELECT 
    source.id as source_page_id,
    source.path as source_path,
    source.title as source_title,
    ue.id as element_id,
    ue.element_text as link_text,
    ue.ai_description as link_description,
    ue.navigation_target,
    ue.navigation_type,
    target.id as target_page_id,
    target.path as target_path,
    target.title as target_title,
    CASE 
        WHEN ue.metadata->>'is_header_element' = 'true' THEN 'header'
        WHEN ue.metadata->>'location' = 'header' THEN 'header'
        ELSE 'content'
    END as link_location
FROM ui_elements ue
JOIN app_pages source ON ue.page_id = source.id
LEFT JOIN app_pages target ON (
    ue.navigation_target = target.path 
    OR ue.target_page_id = target.id
)
WHERE ue.element_label = 'navigation'
  AND ue.navigation_type = 'internal'
  AND ue.navigation_target IS NOT NULL;

-- Summary view for page connectivity
CREATE OR REPLACE VIEW page_connectivity AS
SELECT 
    ap.id as page_id,
    ap.path,
    ap.title,
    COUNT(DISTINCT outgoing.target_page_id) as outgoing_links,
    COUNT(DISTINCT incoming.source_page_id) as incoming_links,
    array_agg(DISTINCT outgoing.target_path) FILTER (WHERE outgoing.target_path IS NOT NULL) as links_to,
    array_agg(DISTINCT incoming.source_path) FILTER (WHERE incoming.source_path IS NOT NULL) as linked_from
FROM app_pages ap
LEFT JOIN navigation_connections outgoing ON ap.id = outgoing.source_page_id
LEFT JOIN navigation_connections incoming ON ap.id = incoming.target_page_id
GROUP BY ap.id, ap.path, ap.title;

COMMENT ON COLUMN ui_elements.navigation_target IS 'The destination path/URL for navigation elements';
COMMENT ON COLUMN ui_elements.navigation_type IS 'Type of navigation: internal, external, anchor, javascript';
COMMENT ON COLUMN ui_elements.target_page_id IS 'Foreign key to the target page if navigation_type is internal';












