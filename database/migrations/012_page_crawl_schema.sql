-- Migration: 012_page_crawl_schema.sql
-- Description: Schema for page crawl results with screenshots and labeled elements
-- Date: 2025-12-13

-- ============================================
-- PAGE CRAWLS TABLE
-- ============================================
-- Stores crawl results for each page with screenshots

CREATE TABLE IF NOT EXISTS page_crawls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session info
    session_id TEXT NOT NULL,
    page_url TEXT NOT NULL,
    page_title TEXT,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Statistics
    elements_discovered INTEGER DEFAULT 0,
    elements_labeled INTEGER DEFAULT 0,
    forms_detected INTEGER DEFAULT 0,
    forms_filled INTEGER DEFAULT 0,
    containers_explored INTEGER DEFAULT 0,
    
    -- Screenshots (Supabase URLs)
    initial_screenshot_url TEXT,
    labeled_screenshot_url TEXT,
    form_labeled_screenshot_url TEXT,
    form_filled_screenshot_url TEXT,
    
    -- Local paths (for reference)
    screenshot_dir TEXT,
    
    -- Status
    status TEXT DEFAULT 'running',  -- running, completed, failed
    error_message TEXT,
    
    -- Metadata
    config JSONB,  -- Crawl configuration used
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAGE ELEMENTS TABLE
-- ============================================
-- Stores labeled elements discovered on a page

CREATE TABLE IF NOT EXISTS page_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to page crawl
    page_crawl_id UUID REFERENCES page_crawls(id) ON DELETE CASCADE,
    
    -- Element identification
    element_index INTEGER NOT NULL,  -- The numbered label (0, 1, 2, etc.)
    selector TEXT NOT NULL,
    
    -- Element metadata
    tag TEXT,
    element_type TEXT,  -- 'button', 'link', 'input', 'select', etc.
    text_content TEXT,
    
    -- Classification
    category TEXT,  -- 'input', 'navigation', 'container_trigger', 'save_action', 'button', 'other'
    
    -- Labels (human-readable)
    label TEXT,  -- From placeholder, aria-label, or AI
    ai_label TEXT,  -- AI-detected label
    ai_field_type TEXT,  -- AI-detected field type
    
    -- Function description
    function_description TEXT,  -- What does this element do?
    
    -- Position and region
    region TEXT,  -- 'header', 'sidebar', 'main', 'footer'
    position_x FLOAT,
    position_y FLOAT,
    width FLOAT,
    height FLOAT,
    
    -- Additional attributes
    href TEXT,
    aria_label TEXT,
    placeholder TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    is_disabled BOOLEAN DEFAULT FALSE,
    
    -- Exploration result (if clicked)
    was_clicked BOOLEAN DEFAULT FALSE,
    click_result TEXT,  -- 'navigated', 'opened_container', 'no_effect', 'error'
    destination_url TEXT,
    opened_container_type TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_page_crawls_session 
ON page_crawls(session_id);

CREATE INDEX IF NOT EXISTS idx_page_crawls_url 
ON page_crawls(page_url);

CREATE INDEX IF NOT EXISTS idx_page_elements_crawl 
ON page_elements(page_crawl_id);

CREATE INDEX IF NOT EXISTS idx_page_elements_category 
ON page_elements(category);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE page_crawls IS 'Page crawl results with screenshots and statistics';
COMMENT ON TABLE page_elements IS 'Labeled elements discovered during page crawl';
COMMENT ON COLUMN page_elements.element_index IS 'The numbered badge shown in the screenshot (0, 1, 2, ...)';
COMMENT ON COLUMN page_elements.function_description IS 'Human-readable description of what the element does';











