-- ============================================
-- LENNY BOT - Q&A Crawler Schema
-- Migration 016
-- ============================================
-- Simplified schema for Q&A Agent approach
-- Adds AI descriptions and page containers table
-- 
-- This migration ADDS to existing schema without breaking it.
-- Deprecated tables remain intact for potential future Action Agent use.

-- ============================================
-- Add AI description columns to app_pages
-- ============================================

-- AI-generated description of the page
ALTER TABLE app_pages 
ADD COLUMN IF NOT EXISTS ai_description TEXT;

-- When the description was generated
ALTER TABLE app_pages 
ADD COLUMN IF NOT EXISTS description_generated_at TIMESTAMPTZ;

-- Index for finding pages without descriptions
CREATE INDEX IF NOT EXISTS idx_app_pages_no_description 
ON app_pages(id) 
WHERE ai_description IS NULL;

COMMENT ON COLUMN app_pages.ai_description IS 'GPT-4o generated description of page contents for RAG';
COMMENT ON COLUMN app_pages.description_generated_at IS 'When the AI description was generated';

-- ============================================
-- Page Containers Table
-- ============================================
-- Stores screenshots and descriptions of modals, drawers, dropdowns, etc.
-- These are containers that appear when interacting with the page.

CREATE TABLE IF NOT EXISTS page_containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to parent page
    page_id UUID REFERENCES app_pages(id) ON DELETE CASCADE,
    
    -- Container identification
    container_type TEXT NOT NULL CHECK (container_type IN (
        'modal', 'drawer', 'dropdown', 'tab', 'accordion', 'popover', 'menu', 'panel'
    )),
    container_name TEXT,              -- Human-readable name (e.g., "Create Task")
    
    -- What opens this container
    trigger_selector TEXT,            -- CSS selector of trigger element
    trigger_text TEXT,                -- Text of trigger button/link
    
    -- Screenshots
    screenshot_path TEXT,             -- Local file path
    screenshot_url TEXT,              -- Supabase storage URL
    
    -- AI description
    ai_description TEXT,              -- GPT-4o description of container contents
    
    -- Metadata
    crawled_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicates
    UNIQUE(page_id, container_type, trigger_text)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_containers_page 
ON page_containers(page_id);

CREATE INDEX IF NOT EXISTS idx_page_containers_type 
ON page_containers(container_type);

CREATE INDEX IF NOT EXISTS idx_page_containers_no_description 
ON page_containers(id) 
WHERE ai_description IS NULL;

COMMENT ON TABLE page_containers IS 'Containers (modals, drawers, dropdowns) discovered during Q&A crawling';
COMMENT ON COLUMN page_containers.ai_description IS 'GPT-4o generated description of container contents for RAG';

-- ============================================
-- Q&A Crawl Sessions Table
-- ============================================
-- Tracks Q&A crawler runs (simpler than action_explorer sessions)

CREATE TABLE IF NOT EXISTS qa_crawl_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session info
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    
    -- Statistics
    pages_crawled INT DEFAULT 0,
    containers_found INT DEFAULT 0,
    descriptions_generated INT DEFAULT 0,
    errors INT DEFAULT 0,
    
    -- Configuration
    config JSONB DEFAULT '{}',
    
    -- Notes
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_qa_sessions_status 
ON qa_crawl_sessions(status);

CREATE INDEX IF NOT EXISTS idx_qa_sessions_date 
ON qa_crawl_sessions(started_at DESC);

COMMENT ON TABLE qa_crawl_sessions IS 'Tracks Q&A crawler runs';

-- ============================================
-- Helper Views
-- ============================================

-- View: Pages missing AI descriptions
CREATE OR REPLACE VIEW pages_needing_descriptions AS
SELECT 
    id,
    url,
    title,
    page_type,
    screenshot_url
FROM app_pages
WHERE ai_description IS NULL
  AND is_bad = FALSE
  AND screenshot_url IS NOT NULL
ORDER BY display_name;

-- View: Containers missing AI descriptions
CREATE OR REPLACE VIEW containers_needing_descriptions AS
SELECT 
    pc.id,
    pc.container_type,
    pc.container_name,
    pc.trigger_text,
    pc.screenshot_url,
    ap.url AS page_url,
    ap.title AS page_title
FROM page_containers pc
JOIN app_pages ap ON pc.page_id = ap.id
WHERE pc.ai_description IS NULL
  AND pc.screenshot_url IS NOT NULL
ORDER BY ap.title, pc.container_name;

-- View: Q&A coverage summary
CREATE OR REPLACE VIEW qa_coverage_summary AS
SELECT 
    'pages' AS entity_type,
    COUNT(*) AS total,
    COUNT(ai_description) AS with_description,
    COUNT(*) - COUNT(ai_description) AS missing_description
FROM app_pages
WHERE is_bad = FALSE

UNION ALL

SELECT 
    'containers' AS entity_type,
    COUNT(*) AS total,
    COUNT(ai_description) AS with_description,
    COUNT(*) - COUNT(ai_description) AS missing_description
FROM page_containers;

-- ============================================
-- Deprecation Comments
-- ============================================
-- Add comments to deprecated tables (informational only)

COMMENT ON TABLE explored_actions IS 
'DEPRECATED for Q&A Agent. Kept for potential future Action Agent use. See DEPRECATED.md';

COMMENT ON TABLE page_elements IS 
'DEPRECATED for Q&A Agent. Kept for potential future Action Agent use. See DEPRECATED.md';

-- ============================================
-- Sample Queries
-- ============================================
-- Uncomment to test

-- Get all pages with descriptions:
-- SELECT url, title, LEFT(ai_description, 100) AS description_preview
-- FROM app_pages
-- WHERE ai_description IS NOT NULL
-- LIMIT 10;

-- Get all containers for a page:
-- SELECT container_type, container_name, trigger_text, LEFT(ai_description, 100) AS description_preview
-- FROM page_containers
-- WHERE page_id = 'your-page-id';

-- Get coverage stats:
-- SELECT * FROM qa_coverage_summary;











