-- ============================================
-- Migration 003: App Scraping Schema
-- ============================================
-- Tables for mapping the AccuLynx web application:
-- - Pages and navigation structure
-- - UI elements on each page
-- - Actions and their results
-- - User flows and workflows
-- ============================================

-- ============================================
-- APP PAGES - All discovered pages/screens
-- ============================================
CREATE TABLE IF NOT EXISTS app_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Page identification
    url TEXT NOT NULL,
    url_pattern TEXT,  -- Regex pattern for dynamic URLs (e.g., /jobs/:id)
    path TEXT NOT NULL,  -- URL path without domain
    
    -- Page metadata
    title TEXT,
    page_type TEXT,  -- dashboard, list, detail, form, modal, settings
    
    -- Navigation context
    parent_page_id UUID REFERENCES app_pages(id),
    menu_path TEXT[],  -- ['Settings', 'Users', 'Add User']
    depth INTEGER DEFAULT 0,  -- How deep in navigation hierarchy
    
    -- Content analysis
    description TEXT,  -- GPT-generated description of page purpose
    primary_actions TEXT[],  -- Main things users do here
    
    -- Screenshots
    screenshot_url TEXT,
    screenshot_description TEXT,
    
    -- Product area classification
    product_area_id UUID REFERENCES product_areas(id),
    
    -- State tracking
    requires_data BOOLEAN DEFAULT FALSE,  -- Does page need existing data to show content?
    is_dynamic BOOLEAN DEFAULT FALSE,  -- Does URL have dynamic segments?
    
    -- Scrape tracking
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    last_analyzed_at TIMESTAMPTZ,
    analysis_status TEXT DEFAULT 'pending',  -- pending, in_progress, completed, failed
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    UNIQUE(url)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_pages_path ON app_pages(path);
CREATE INDEX IF NOT EXISTS idx_app_pages_type ON app_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_app_pages_parent ON app_pages(parent_page_id);
CREATE INDEX IF NOT EXISTS idx_app_pages_status ON app_pages(analysis_status);

-- ============================================
-- UI ELEMENTS - Interactive elements on pages
-- ============================================
CREATE TABLE IF NOT EXISTS ui_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent page
    page_id UUID NOT NULL REFERENCES app_pages(id) ON DELETE CASCADE,
    
    -- Element identification
    element_type TEXT NOT NULL,  -- button, link, input, select, checkbox, tab, menu_item, table_action
    selector TEXT,  -- CSS selector or unique identifier
    
    -- Element content
    label TEXT,  -- Visible text
    aria_label TEXT,
    placeholder TEXT,
    icon TEXT,  -- Icon class/name if present
    
    -- Position & context
    location TEXT,  -- header, sidebar, main, footer, modal, table_row
    parent_element_id UUID REFERENCES ui_elements(id),
    order_index INTEGER,  -- Order within parent/location
    
    -- Behavior hints
    is_primary_action BOOLEAN DEFAULT FALSE,
    is_destructive BOOLEAN DEFAULT FALSE,  -- Delete, cancel, etc.
    is_navigation BOOLEAN DEFAULT FALSE,  -- Leads to another page
    is_form_submit BOOLEAN DEFAULT FALSE,
    requires_confirmation BOOLEAN DEFAULT FALSE,
    
    -- For form elements
    input_type TEXT,  -- text, email, date, number, etc.
    is_required BOOLEAN,
    validation_rules JSONB,
    options JSONB,  -- For select/radio/checkbox
    
    -- Screenshots
    screenshot_url TEXT,  -- Cropped screenshot of this element
    
    -- Analysis
    description TEXT,  -- GPT description of what this element does
    
    -- Tracking
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ui_elements_page ON ui_elements(page_id);
CREATE INDEX IF NOT EXISTS idx_ui_elements_type ON ui_elements(element_type);

-- ============================================
-- UI ACTIONS - What happens when elements are triggered
-- ============================================
CREATE TABLE IF NOT EXISTS ui_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What triggers this action
    element_id UUID NOT NULL REFERENCES ui_elements(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL,  -- click, submit, hover, change, focus
    
    -- What happens
    action_type TEXT NOT NULL,  -- navigate, open_modal, close_modal, submit_form, 
                                -- toggle, expand, filter, sort, api_call, download
    
    -- Result details
    result_url TEXT,  -- If navigation
    result_page_id UUID REFERENCES app_pages(id),
    opens_modal BOOLEAN DEFAULT FALSE,
    modal_title TEXT,
    
    -- State changes
    changes_data BOOLEAN DEFAULT FALSE,  -- Does this modify data?
    is_reversible BOOLEAN,  -- Can action be undone?
    
    -- For form submissions
    creates_entity TEXT,  -- 'lead', 'job', 'estimate', etc.
    updates_entity TEXT,
    deletes_entity TEXT,
    
    -- Error states
    possible_errors TEXT[],
    validation_messages TEXT[],
    
    -- Screenshots
    before_screenshot_url TEXT,
    after_screenshot_url TEXT,
    
    -- Analysis
    description TEXT,
    
    -- Tracking
    tested_at TIMESTAMPTZ,
    test_status TEXT,  -- pending, success, failed, skipped
    
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ui_actions_element ON ui_actions(element_id);
CREATE INDEX IF NOT EXISTS idx_ui_actions_type ON ui_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_ui_actions_result_page ON ui_actions(result_page_id);

-- ============================================
-- USER FLOWS - Multi-step workflows
-- ============================================
CREATE TABLE IF NOT EXISTS user_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Flow identification
    name TEXT NOT NULL,  -- 'Create Lead', 'Submit Estimate', etc.
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Classification
    flow_type TEXT,  -- create, edit, delete, process, report
    entity_type TEXT,  -- lead, job, estimate, invoice, etc.
    product_area_id UUID REFERENCES product_areas(id),
    
    -- Flow metadata
    starting_page_id UUID REFERENCES app_pages(id),
    ending_page_id UUID REFERENCES app_pages(id),
    
    -- Complexity
    step_count INTEGER,
    estimated_duration_seconds INTEGER,
    requires_external_data BOOLEAN DEFAULT FALSE,  -- Needs data from outside AccuLynx
    
    -- Prerequisites
    prerequisites TEXT[],  -- What must exist before this flow can run
    required_permissions TEXT[],
    
    -- Tracking
    documented_at TIMESTAMPTZ DEFAULT NOW(),
    last_tested_at TIMESTAMPTZ,
    is_complete BOOLEAN DEFAULT FALSE,
    
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_user_flows_type ON user_flows(flow_type);
CREATE INDEX IF NOT EXISTS idx_user_flows_entity ON user_flows(entity_type);

-- ============================================
-- FLOW STEPS - Individual steps in a flow
-- ============================================
CREATE TABLE IF NOT EXISTS flow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent flow
    flow_id UUID NOT NULL REFERENCES user_flows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    
    -- Step details
    page_id UUID REFERENCES app_pages(id),
    action_id UUID REFERENCES ui_actions(id),
    
    -- What user does
    instruction TEXT NOT NULL,  -- "Click the 'Create Lead' button"
    input_data JSONB,  -- Any data to enter
    
    -- Expected result
    expected_result TEXT,
    expected_page_id UUID REFERENCES app_pages(id),
    
    -- Screenshots
    screenshot_url TEXT,
    
    -- Branching
    is_conditional BOOLEAN DEFAULT FALSE,
    condition_description TEXT,
    on_success_step INTEGER,
    on_failure_step INTEGER,
    
    -- Tracking
    metadata JSONB DEFAULT '{}',
    
    UNIQUE(flow_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_flow_steps_flow ON flow_steps(flow_id);

-- ============================================
-- PAGE STATES - Different states a page can be in
-- ============================================
CREATE TABLE IF NOT EXISTS page_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent page
    page_id UUID NOT NULL REFERENCES app_pages(id) ON DELETE CASCADE,
    
    -- State identification
    state_name TEXT NOT NULL,  -- 'empty', 'with_data', 'loading', 'error', 'filtered'
    description TEXT,
    
    -- How to reach this state
    trigger_description TEXT,
    preconditions TEXT[],
    
    -- What's different
    visible_elements TEXT[],  -- Elements only visible in this state
    hidden_elements TEXT[],   -- Elements hidden in this state
    
    -- Screenshot
    screenshot_url TEXT,
    
    metadata JSONB DEFAULT '{}',
    
    UNIQUE(page_id, state_name)
);

CREATE INDEX IF NOT EXISTS idx_page_states_page ON page_states(page_id);

-- ============================================
-- NAVIGATION EDGES - Graph of page relationships
-- ============================================
CREATE TABLE IF NOT EXISTS navigation_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Edge definition
    from_page_id UUID NOT NULL REFERENCES app_pages(id) ON DELETE CASCADE,
    to_page_id UUID NOT NULL REFERENCES app_pages(id) ON DELETE CASCADE,
    
    -- How to navigate
    via_element_id UUID REFERENCES ui_elements(id),
    via_action_id UUID REFERENCES ui_actions(id),
    
    -- Edge metadata
    edge_type TEXT,  -- menu, link, button, breadcrumb, redirect
    label TEXT,  -- The text user clicks
    
    -- Tracking
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(from_page_id, to_page_id, via_element_id)
);

CREATE INDEX IF NOT EXISTS idx_nav_edges_from ON navigation_edges(from_page_id);
CREATE INDEX IF NOT EXISTS idx_nav_edges_to ON navigation_edges(to_page_id);

-- ============================================
-- APP SCRAPE SESSIONS - Track scraping progress
-- ============================================
CREATE TABLE IF NOT EXISTS app_scrape_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    session_type TEXT NOT NULL,  -- navigation_crawl, element_analysis, action_testing, flow_recording
    
    status TEXT DEFAULT 'running',  -- running, completed, failed, paused
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Progress
    pages_discovered INTEGER DEFAULT 0,
    pages_analyzed INTEGER DEFAULT 0,
    elements_found INTEGER DEFAULT 0,
    actions_tested INTEGER DEFAULT 0,
    flows_recorded INTEGER DEFAULT 0,
    
    -- Errors
    errors JSONB DEFAULT '[]',
    
    notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- ============================================
-- HELPFUL VIEWS
-- ============================================

-- View: Page with element counts
CREATE OR REPLACE VIEW page_summary AS
SELECT 
    p.id,
    p.url,
    p.title,
    p.page_type,
    p.product_area_id,
    pa.name as product_area_name,
    p.analysis_status,
    COUNT(DISTINCT e.id) as element_count,
    COUNT(DISTINCT a.id) as action_count,
    COUNT(DISTINCT ne.id) as outgoing_links
FROM app_pages p
LEFT JOIN product_areas pa ON p.product_area_id = pa.id
LEFT JOIN ui_elements e ON e.page_id = p.id
LEFT JOIN ui_actions a ON a.element_id = e.id
LEFT JOIN navigation_edges ne ON ne.from_page_id = p.id
GROUP BY p.id, p.url, p.title, p.page_type, p.product_area_id, pa.name, p.analysis_status;

-- View: Navigation tree
CREATE OR REPLACE VIEW navigation_tree AS
WITH RECURSIVE nav_tree AS (
    -- Root pages (no parent)
    SELECT 
        id,
        url,
        title,
        menu_path,
        0 as level,
        ARRAY[id] as path
    FROM app_pages
    WHERE parent_page_id IS NULL
    
    UNION ALL
    
    -- Child pages
    SELECT 
        p.id,
        p.url,
        p.title,
        p.menu_path,
        nt.level + 1,
        nt.path || p.id
    FROM app_pages p
    JOIN nav_tree nt ON p.parent_page_id = nt.id
)
SELECT * FROM nav_tree;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Get all actions available on a page
CREATE OR REPLACE FUNCTION get_page_actions(page_uuid UUID)
RETURNS TABLE (
    element_id UUID,
    element_label TEXT,
    element_type TEXT,
    action_type TEXT,
    action_description TEXT,
    result_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as element_id,
        e.label as element_label,
        e.element_type,
        a.action_type,
        a.description as action_description,
        a.result_url
    FROM ui_elements e
    JOIN ui_actions a ON a.element_id = e.id
    WHERE e.page_id = page_uuid
    ORDER BY e.order_index;
END;
$$ LANGUAGE plpgsql;

-- Function: Get flow steps in order
CREATE OR REPLACE FUNCTION get_flow_steps(flow_uuid UUID)
RETURNS TABLE (
    step_number INTEGER,
    instruction TEXT,
    page_title TEXT,
    expected_result TEXT,
    screenshot_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fs.step_number,
        fs.instruction,
        p.title as page_title,
        fs.expected_result,
        fs.screenshot_url
    FROM flow_steps fs
    LEFT JOIN app_pages p ON fs.page_id = p.id
    WHERE fs.flow_id = flow_uuid
    ORDER BY fs.step_number;
END;
$$ LANGUAGE plpgsql;


