-- Migration: 008_action_explorer_schema.sql
-- Description: Schema for the new Action Explorer (action-first crawling approach)
-- Date: 2025-12-12

-- ============================================
-- EXPLORED ACTIONS TABLE
-- ============================================
-- Stores every action taken during exploration
-- Classification happens AFTER action by observing results

CREATE TABLE IF NOT EXISTS explored_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Page context
    page_url TEXT NOT NULL,
    page_pattern TEXT,              -- Normalized: /jobs/:uuid, /settings/*
    
    -- Element info (what we clicked)
    selector TEXT NOT NULL,
    element_tag TEXT,
    element_text TEXT,
    element_classes TEXT,
    element_id TEXT,
    element_position JSONB,         -- {x, y, width, height}
    
    -- Region for deduplication
    page_region TEXT,               -- 'header', 'sidebar', 'main', 'footer', 'modal'
    exploration_scope TEXT,         -- '*', '/settings/*', exact page
    fingerprint TEXT,               -- Hash for deduplication
    
    -- Action taken
    action_type TEXT NOT NULL DEFAULT 'click',  -- 'click', 'hover'
    
    -- Result observed (AFTER action - this is the key difference!)
    result_type TEXT NOT NULL,      -- 'navigated', 'opened_container', 'modified_data', 'no_effect', 'error'
    
    -- Navigation details (if result_type = 'navigated')
    navigation_target TEXT,         -- Full URL where it navigated
    navigation_pattern TEXT,        -- Normalized: /jobs/:uuid
    
    -- Container details (if result_type = 'opened_container')
    container_type TEXT,            -- 'modal', 'drawer', 'menu', 'dropdown', 'popover'
    container_selector TEXT,
    container_element_count INTEGER,
    
    -- Data modification details (if result_type = 'modified_data')
    modified_endpoints TEXT[],      -- Array of endpoints that received POST/PUT/DELETE
    request_methods TEXT[],         -- Array of methods used
    
    -- Network activity during action
    network_requests JSONB,         -- All requests made during action
    had_data_modification BOOLEAN DEFAULT FALSE,
    
    -- Error details (if result_type = 'error')
    error_message TEXT,
    error_type TEXT,                -- 'timeout', 'not_found', 'intercepted', etc.
    
    -- Hierarchy (for nested exploration)
    parent_action_id UUID REFERENCES explored_actions(id),
    depth INTEGER DEFAULT 0,
    trigger_action_id UUID REFERENCES explored_actions(id),  -- What opened this container
    
    -- Screenshots
    screenshot_url TEXT,            -- For elements and containers
    screenshot_bytes BYTEA,         -- Raw bytes (optional, for deferred upload)
    
    -- Deduplication tracking
    first_seen_on_page TEXT,
    times_encountered INTEGER DEFAULT 1,
    is_duplicate BOOLEAN DEFAULT FALSE,
    canonical_action_id UUID REFERENCES explored_actions(id),
    
    -- Metadata
    exploration_session_id UUID,    -- Group actions by session
    explored_at TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INTEGER,            -- How long the action took
    
    -- Indexes for common queries
    CONSTRAINT valid_result_type CHECK (result_type IN (
        'navigated', 'opened_container', 'modified_data', 'no_effect', 'error', 'skipped'
    )),
    CONSTRAINT valid_action_type CHECK (action_type IN ('click', 'hover', 'focus')),
    CONSTRAINT valid_region CHECK (page_region IN (
        'header', 'sidebar', 'main', 'footer', 'modal', 'drawer', 'menu', 'unknown'
    ))
);

-- ============================================
-- EXPLORATION SESSIONS TABLE
-- ============================================
-- Track each exploration run

CREATE TABLE IF NOT EXISTS exploration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session info
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running',  -- 'running', 'completed', 'failed', 'cancelled'
    
    -- Target
    start_url TEXT NOT NULL,
    environment TEXT DEFAULT 'staging',  -- 'staging', 'production'
    
    -- Statistics
    pages_explored INTEGER DEFAULT 0,
    elements_found INTEGER DEFAULT 0,
    actions_taken INTEGER DEFAULT 0,
    navigations_detected INTEGER DEFAULT 0,
    containers_opened INTEGER DEFAULT 0,
    data_modifications_detected INTEGER DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    
    -- Deduplication stats
    elements_skipped_duplicate INTEGER DEFAULT 0,
    
    -- Configuration used
    config JSONB,
    
    -- Notes
    notes TEXT
);

-- ============================================
-- INDEXES
-- ============================================

-- Fast fingerprint lookup for deduplication
CREATE INDEX IF NOT EXISTS idx_explored_actions_fingerprint 
ON explored_actions(fingerprint);

-- Find all actions for a page
CREATE INDEX IF NOT EXISTS idx_explored_actions_page_url 
ON explored_actions(page_url);

-- Find all actions in a session
CREATE INDEX IF NOT EXISTS idx_explored_actions_session 
ON explored_actions(exploration_session_id);

-- Find by result type
CREATE INDEX IF NOT EXISTS idx_explored_actions_result_type 
ON explored_actions(result_type);

-- Find navigation targets
CREATE INDEX IF NOT EXISTS idx_explored_actions_navigation_target 
ON explored_actions(navigation_target) 
WHERE navigation_target IS NOT NULL;

-- Find data modifications
CREATE INDEX IF NOT EXISTS idx_explored_actions_data_mod 
ON explored_actions(had_data_modification) 
WHERE had_data_modification = TRUE;

-- Find by region for analysis
CREATE INDEX IF NOT EXISTS idx_explored_actions_region 
ON explored_actions(page_region);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE explored_actions IS 'Action-first exploration results. Each row represents one action taken and its observed result.';
COMMENT ON COLUMN explored_actions.result_type IS 'Classified AFTER action by observing network traffic, URL changes, and DOM mutations.';
COMMENT ON COLUMN explored_actions.fingerprint IS 'Hash of (region, selector_base, text, destination, scope) for deduplication across pages.';
COMMENT ON COLUMN explored_actions.had_data_modification IS 'True if any POST/PUT/DELETE/PATCH request was made during this action.';


