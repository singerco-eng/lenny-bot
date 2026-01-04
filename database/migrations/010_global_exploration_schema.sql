-- ============================================
-- LENNY BOT - Global Exploration Schema
-- Migration 010
-- ============================================
-- Tables for storing global navigation and reusable components
-- These are explored ONCE per session and apply across all pages

-- ============================================
-- Global Navigation (Header menus, app-wide nav)
-- ============================================
CREATE TABLE IF NOT EXISTS global_navigation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session tracking
    session_id TEXT NOT NULL,
    explored_at TIMESTAMPTZ DEFAULT NOW(),
    base_url TEXT NOT NULL,
    
    -- Summary stats
    total_menus INT DEFAULT 0,
    total_items INT DEFAULT 0,
    total_destinations INT DEFAULT 0,
    
    -- Complete navigation structure (JSON)
    navigation_data JSONB NOT NULL DEFAULT '{}',
    
    -- Screenshots storage path prefix
    screenshots_dir TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_global_nav_session ON global_navigation(session_id);
CREATE INDEX IF NOT EXISTS idx_global_nav_explored ON global_navigation(explored_at DESC);

-- ============================================
-- Global Navigation Menus (Individual menus)
-- ============================================
CREATE TABLE IF NOT EXISTS global_nav_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    global_navigation_id UUID REFERENCES global_navigation(id) ON DELETE CASCADE,
    
    -- Menu identification
    name TEXT NOT NULL,
    trigger_selector TEXT NOT NULL,
    menu_type TEXT NOT NULL CHECK (menu_type IN (
        'dropdown', 'mega_menu', 'hover_menu', 'direct_link', 'accordion'
    )),
    
    -- Screenshot
    screenshot_path TEXT,
    screenshot_url TEXT,  -- If stored in Supabase storage
    
    -- Position in header
    position_x INT,
    position_y INT,
    
    -- Items in this menu (JSON array for simplicity)
    items JSONB NOT NULL DEFAULT '[]',
    item_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nav_menus_global ON global_nav_menus(global_navigation_id);
CREATE INDEX IF NOT EXISTS idx_nav_menus_name ON global_nav_menus(name);

-- ============================================
-- Global Navigation Items (Individual menu items)
-- ============================================
CREATE TABLE IF NOT EXISTS global_nav_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id UUID REFERENCES global_nav_menus(id) ON DELETE CASCADE,
    parent_item_id UUID REFERENCES global_nav_items(id) ON DELETE CASCADE,  -- For sub-menus
    
    -- Item details
    text TEXT NOT NULL,
    selector TEXT NOT NULL,
    destination_url TEXT,  -- NULL if opens submenu
    item_type TEXT DEFAULT 'link' CHECK (item_type IN ('link', 'button', 'submenu_trigger')),
    
    -- Sub-menu tracking
    opens_submenu BOOLEAN DEFAULT FALSE,
    submenu_item_count INT DEFAULT 0,
    
    -- Position in menu
    sort_order INT DEFAULT 0,
    
    -- Icon if present
    icon_class TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nav_items_menu ON global_nav_items(menu_id);
CREATE INDEX IF NOT EXISTS idx_nav_items_parent ON global_nav_items(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_nav_items_destination ON global_nav_items(destination_url);

-- ============================================
-- Global Components (Reusable UI components)
-- ============================================
CREATE TABLE IF NOT EXISTS global_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Component identification
    component_type TEXT NOT NULL CHECK (component_type IN (
        'file_picker', 'date_picker', 'time_picker', 'datetime_picker',
        'color_picker', 'address_autocomplete', 'contact_selector',
        'lead_selector', 'user_selector', 'team_selector', 'job_selector',
        'rich_text_editor', 'image_cropper', 'signature_pad',
        'phone_input', 'currency_input', 'multi_select', 'tag_input',
        'search_combo', 'custom'
    )),
    
    -- Fingerprint for deduplication
    fingerprint TEXT UNIQUE NOT NULL,
    
    -- Detection pattern
    trigger_selector TEXT,  -- What opens this component
    container_selector TEXT,  -- The component container
    
    -- Where first discovered
    first_seen_url TEXT,
    first_seen_context TEXT,  -- Parent container selector if applicable
    
    -- Label/purpose
    label TEXT,
    description TEXT,
    
    -- Screenshot
    screenshot_path TEXT,
    screenshot_url TEXT,
    
    -- Usage patterns (how to interact)
    interaction_pattern JSONB DEFAULT '{}',
    
    -- Stats
    times_seen INT DEFAULT 1,
    pages_seen_on TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_components_type ON global_components(component_type);
CREATE INDEX IF NOT EXISTS idx_components_fingerprint ON global_components(fingerprint);
CREATE INDEX IF NOT EXISTS idx_components_trigger ON global_components(trigger_selector);

-- ============================================
-- AI Form Detection Results
-- ============================================
CREATE TABLE IF NOT EXISTS ai_detected_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Where detected
    page_url TEXT NOT NULL,
    container_selector TEXT,  -- If in a modal/container
    session_id TEXT NOT NULL,
    
    -- Form details from AI
    form_name TEXT NOT NULL,
    form_description TEXT,
    confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Fields detected (JSON array)
    fields JSONB NOT NULL DEFAULT '[]',
    field_count INT DEFAULT 0,
    
    -- Buttons
    submit_button JSONB,  -- {text, selector, position}
    cancel_button JSONB,
    
    -- Screenshot used for detection
    screenshot_path TEXT,
    
    -- Processing status
    status TEXT DEFAULT 'detected' CHECK (status IN (
        'detected', 'matched', 'filled', 'submitted', 'failed', 'skipped'
    )),
    
    -- Cross-reference with DOM elements
    dom_inputs_matched INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_forms_page ON ai_detected_forms(page_url);
CREATE INDEX IF NOT EXISTS idx_ai_forms_session ON ai_detected_forms(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_forms_status ON ai_detected_forms(status);

-- ============================================
-- Trigger for updated_at on global_components
-- ============================================
DROP TRIGGER IF EXISTS update_global_components_updated_at ON global_components;
CREATE TRIGGER update_global_components_updated_at
    BEFORE UPDATE ON global_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Helper Views
-- ============================================

-- View: Complete navigation sitemap
CREATE OR REPLACE VIEW navigation_sitemap AS
SELECT 
    gn.base_url,
    gnm.name AS menu_name,
    gni.text AS item_text,
    gni.destination_url,
    gni.opens_submenu,
    gnm.screenshot_path
FROM global_navigation gn
JOIN global_nav_menus gnm ON gnm.global_navigation_id = gn.id
JOIN global_nav_items gni ON gni.menu_id = gnm.id
WHERE gni.parent_item_id IS NULL  -- Top-level items only
ORDER BY gnm.name, gni.sort_order;

-- View: Component usage summary
CREATE OR REPLACE VIEW component_usage AS
SELECT 
    component_type,
    COUNT(*) AS unique_instances,
    SUM(times_seen) AS total_sightings,
    array_agg(DISTINCT label) AS labels
FROM global_components
GROUP BY component_type
ORDER BY unique_instances DESC;

-- ============================================
-- Sample Data (for testing)
-- ============================================
-- Uncomment to insert sample data

-- INSERT INTO global_navigation (session_id, base_url, total_menus, navigation_data)
-- VALUES (
--     'test-session-001',
--     'https://stage-my.acculynx.com',
--     5,
--     '{"menus": {"New": {"items": []}, "Recent": {"items": []}}}'
-- );











