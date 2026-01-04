-- Migration 006: UI Elements Schema
-- Stores all interactive elements discovered during action mapping

-- Drop existing tables if they exist (for clean re-run)
DROP VIEW IF EXISTS container_contents;
DROP VIEW IF EXISTS page_element_summary;
DROP TABLE IF EXISTS ui_elements CASCADE;
DROP TABLE IF EXISTS ui_containers CASCADE;

-- UI Elements - every interactive element on each page
CREATE TABLE ui_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES app_pages(id) ON DELETE CASCADE,
    
    -- Element identification
    selector TEXT NOT NULL,
    element_tag TEXT,  -- button, a, input, div, select, etc.
    element_text TEXT,
    aria_label TEXT,
    element_id TEXT,  -- HTML id attribute
    element_classes TEXT,  -- CSS classes
    
    -- Classification (heuristics)
    element_type TEXT,  -- button, link, input, dropdown, tab, toggle, etc.
    element_label TEXT,  -- navigation, destructive, create_save, dropdown_menu, filter_control, etc.
    
    -- Exploration state
    was_explored BOOLEAN DEFAULT FALSE,
    was_skipped BOOLEAN DEFAULT FALSE,
    skip_reason TEXT,  -- "navigation", "destructive", "create_save", "not_visible"
    
    -- Screenshots (full page with element highlighted)
    before_screenshot_url TEXT,
    after_screenshot_url TEXT,
    
    -- What happened when interacted with
    action_result TEXT,  -- "opened_modal", "opened_dropdown", "state_change", "navigated", "nothing"
    revealed_element_count INT DEFAULT 0,
    
    -- Position & size (for visualization)
    position_x INT,
    position_y INT,
    width INT,
    height INT,
    is_visible BOOLEAN DEFAULT TRUE,
    is_in_viewport BOOLEAN DEFAULT TRUE,
    
    -- AI enrichment (populated later)
    ai_description TEXT,
    
    metadata JSONB DEFAULT '{}',
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    explored_at TIMESTAMP WITH TIME ZONE
);

-- UI Containers - modals, drawers, dropdowns, accordions
CREATE TABLE ui_containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_element_id UUID REFERENCES ui_elements(id) ON DELETE CASCADE,
    page_id UUID REFERENCES app_pages(id) ON DELETE CASCADE,
    
    -- Container identification
    container_type TEXT NOT NULL,  -- modal, drawer, dropdown, accordion, popover, panel
    container_selector TEXT,
    container_title TEXT,
    
    -- Screenshot of opened container
    screenshot_url TEXT,
    
    -- Stats
    element_count INT DEFAULT 0,
    has_form BOOLEAN DEFAULT FALSE,
    has_save_action BOOLEAN DEFAULT FALSE,
    has_cancel_action BOOLEAN DEFAULT FALSE,
    
    metadata JSONB DEFAULT '{}',
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add parent_container_id column after ui_containers table exists
ALTER TABLE ui_elements 
    ADD COLUMN IF NOT EXISTS parent_container_id UUID REFERENCES ui_containers(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ui_elements_page ON ui_elements(page_id);
CREATE INDEX IF NOT EXISTS idx_ui_elements_explored ON ui_elements(was_explored);
CREATE INDEX IF NOT EXISTS idx_ui_elements_skipped ON ui_elements(was_skipped);
CREATE INDEX IF NOT EXISTS idx_ui_elements_type ON ui_elements(element_type);
CREATE INDEX IF NOT EXISTS idx_ui_elements_label ON ui_elements(element_label);
CREATE INDEX IF NOT EXISTS idx_ui_elements_container ON ui_elements(parent_container_id);

CREATE INDEX IF NOT EXISTS idx_ui_containers_page ON ui_containers(page_id);
CREATE INDEX IF NOT EXISTS idx_ui_containers_trigger ON ui_containers(trigger_element_id);
CREATE INDEX IF NOT EXISTS idx_ui_containers_type ON ui_containers(container_type);

-- View for easy querying of page element summary
CREATE OR REPLACE VIEW page_element_summary AS
SELECT 
    ap.id as page_id,
    ap.path,
    ap.title,
    COUNT(ue.id) as total_elements,
    COUNT(CASE WHEN ue.was_explored THEN 1 END) as explored_count,
    COUNT(CASE WHEN ue.was_skipped THEN 1 END) as skipped_count,
    COUNT(CASE WHEN ue.element_label = 'navigation' THEN 1 END) as nav_elements,
    COUNT(CASE WHEN ue.element_label = 'destructive' THEN 1 END) as destructive_elements,
    COUNT(CASE WHEN ue.element_label = 'create_save' THEN 1 END) as save_elements,
    COUNT(CASE WHEN ue.element_type = 'button' THEN 1 END) as buttons,
    COUNT(CASE WHEN ue.element_type = 'input' THEN 1 END) as inputs,
    COUNT(CASE WHEN ue.element_type = 'dropdown' THEN 1 END) as dropdowns
FROM app_pages ap
LEFT JOIN ui_elements ue ON ue.page_id = ap.id
GROUP BY ap.id, ap.path, ap.title;

-- View for container contents
CREATE OR REPLACE VIEW container_contents AS
SELECT 
    uc.id as container_id,
    uc.container_type,
    uc.container_title,
    ap.path as page_path,
    te.element_text as trigger_text,
    COUNT(ue.id) as element_count,
    array_agg(DISTINCT ue.element_type) as element_types
FROM ui_containers uc
JOIN app_pages ap ON uc.page_id = ap.id
LEFT JOIN ui_elements te ON uc.trigger_element_id = te.id
LEFT JOIN ui_elements ue ON ue.parent_container_id = uc.id
GROUP BY uc.id, uc.container_type, uc.container_title, ap.path, te.element_text;

