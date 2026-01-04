-- Migration: 009_chunk_explorer_schema.sql
-- Description: Schema for chunk-based exploration (logical UI regions)
-- Date: 2025-12-12

-- ============================================
-- EXPLORED CHUNKS TABLE
-- ============================================
-- Stores logical UI regions (filter panels, toolbars, etc.)
-- ONE screenshot per chunk with all elements labeled in metadata

CREATE TABLE IF NOT EXISTS explored_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Page context
    page_url TEXT NOT NULL,
    page_pattern TEXT,
    
    -- Chunk info
    chunk_type TEXT NOT NULL,           -- 'filter_panel', 'toolbar', 'data_table', etc.
    selector TEXT NOT NULL,
    title TEXT,
    
    -- Position on page
    position JSONB,                     -- {x, y, width, height}
    
    -- Elements within this chunk (stored as JSONB array)
    -- Each element has: selector, tag, text, element_type, rel_x, rel_y, width, height
    elements JSONB NOT NULL DEFAULT '[]',
    element_count INTEGER DEFAULT 0,
    
    -- Screenshot of entire chunk (ONE per chunk)
    screenshot_url TEXT,
    screenshot_bytes BYTEA,
    
    -- Exploration results (state changes observed)
    exploration_results JSONB DEFAULT '[]',
    is_explored BOOLEAN DEFAULT FALSE,
    
    -- Session tracking
    exploration_session_id UUID REFERENCES exploration_sessions(id),
    explored_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Deduplication
    fingerprint TEXT,                   -- For matching same chunk across pages
    
    CONSTRAINT valid_chunk_type CHECK (chunk_type IN (
        'header', 'sidebar', 'filter_panel', 'toolbar', 'data_table',
        'card_group', 'tab_panel', 'form', 'modal', 'drawer', 
        'menu', 'footer', 'main_content', 'widget'
    ))
);

-- ============================================
-- CHUNK ELEMENTS TABLE (Optional - for querying individual elements)
-- ============================================
-- If you need to query elements directly, not just via chunk.elements JSONB

CREATE TABLE IF NOT EXISTS chunk_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent chunk
    chunk_id UUID NOT NULL REFERENCES explored_chunks(id) ON DELETE CASCADE,
    
    -- Element info
    selector TEXT NOT NULL,
    tag TEXT,
    text TEXT,
    element_type TEXT,                  -- 'button', 'link', 'input', 'select', etc.
    
    -- Position relative to chunk (for labeling on screenshot)
    rel_x FLOAT,
    rel_y FLOAT,
    width FLOAT,
    height FLOAT,
    
    -- Absolute position on page
    abs_x FLOAT,
    abs_y FLOAT,
    
    -- For form fields
    is_required BOOLEAN DEFAULT FALSE,
    options TEXT[],                     -- For select/radio
    current_value TEXT,
    generated_value TEXT,               -- GPT-generated test value
    
    -- Exploration result for this specific element
    exploration_result JSONB
);

-- ============================================
-- CONSOLIDATED NAVIGATION TABLE
-- ============================================
-- Post-processed navigation patterns (deduped across pages)

CREATE TABLE IF NOT EXISTS navigation_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Pattern (e.g., /jobs/:uuid)
    url_pattern TEXT NOT NULL UNIQUE,
    
    -- Sample navigation target
    sample_url TEXT,
    
    -- Elements that navigate here
    element_texts TEXT[],               -- ['View Job', 'Job Details', etc.]
    element_count INTEGER DEFAULT 0,
    
    -- Pages where this navigation appears
    source_pages TEXT[],
    source_page_count INTEGER DEFAULT 0,
    
    -- Is this a global navigation (appears on many pages)?
    is_global BOOLEAN DEFAULT FALSE,
    
    -- Session that discovered this
    exploration_session_id UUID REFERENCES exploration_sessions(id),
    discovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- UPDATE SESSIONS TABLE
-- ============================================
-- Add chunk-related stats

ALTER TABLE exploration_sessions 
ADD COLUMN IF NOT EXISTS chunks_explored INTEGER DEFAULT 0;

ALTER TABLE exploration_sessions 
ADD COLUMN IF NOT EXISTS chunk_elements_found INTEGER DEFAULT 0;

ALTER TABLE exploration_sessions 
ADD COLUMN IF NOT EXISTS state_changes_observed INTEGER DEFAULT 0;

-- ============================================
-- INDEXES
-- ============================================

-- Find chunks by page
CREATE INDEX IF NOT EXISTS idx_explored_chunks_page_url 
ON explored_chunks(page_url);

-- Find chunks by type
CREATE INDEX IF NOT EXISTS idx_explored_chunks_type 
ON explored_chunks(chunk_type);

-- Find chunks by session
CREATE INDEX IF NOT EXISTS idx_explored_chunks_session 
ON explored_chunks(exploration_session_id);

-- Find chunk elements by chunk
CREATE INDEX IF NOT EXISTS idx_chunk_elements_chunk_id 
ON chunk_elements(chunk_id);

-- Find navigation patterns
CREATE INDEX IF NOT EXISTS idx_navigation_patterns_pattern 
ON navigation_patterns(url_pattern);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE explored_chunks IS 'Logical UI regions detected during exploration. ONE screenshot per chunk with all elements in metadata.';
COMMENT ON COLUMN explored_chunks.elements IS 'JSONB array of elements with relative positions for labeling on screenshot.';
COMMENT ON TABLE navigation_patterns IS 'Consolidated navigation destinations, deduped across pages (e.g., /jobs/:uuid appears 50 times → 1 entry).';


