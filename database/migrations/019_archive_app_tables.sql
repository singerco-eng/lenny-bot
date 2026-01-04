-- Migration 019: Archive Web App Tables for Fresh Start
-- This archives all web app crawling data to start fresh with KB-guided approach
-- KB content (source_urls, content_chunks, kb_videos, video_steps) is PRESERVED

-- ============================================================
-- ARCHIVE EXISTING WEB APP TABLES (Rename to preserve data)
-- ============================================================

-- Archive app_pages
ALTER TABLE IF EXISTS app_pages RENAME TO _archived_app_pages;

-- Archive page_elements  
ALTER TABLE IF EXISTS page_elements RENAME TO _archived_page_elements;

-- Archive page_crawls
ALTER TABLE IF EXISTS page_crawls RENAME TO _archived_page_crawls;

-- Archive element_crawls
ALTER TABLE IF EXISTS element_crawls RENAME TO _archived_element_crawls;

-- Archive global navigation tables
ALTER TABLE IF EXISTS global_nav_items RENAME TO _archived_global_nav_items;
ALTER TABLE IF EXISTS global_nav_menus RENAME TO _archived_global_nav_menus;
ALTER TABLE IF EXISTS global_navigation RENAME TO _archived_global_navigation;

-- Archive page_containers
ALTER TABLE IF EXISTS page_containers RENAME TO _archived_page_containers;

-- Archive crawl tracking
ALTER TABLE IF EXISTS crawl_sessions RENAME TO _archived_crawl_sessions;
ALTER TABLE IF EXISTS crawl_logs RENAME TO _archived_crawl_logs;

-- ============================================================
-- DROP EMPTY/UNUSED TABLES
-- ============================================================

-- Note: product_areas is kept as it has FK dependencies from source_urls and content_chunks
DROP TABLE IF EXISTS video_processing_jobs;

-- Also archive user_flows table if it exists
ALTER TABLE IF EXISTS user_flows RENAME TO _archived_user_flows;

-- ============================================================
-- CREATE FRESH WEB APP SCHEMA (KB-Guided Approach)
-- ============================================================

-- Fresh app_pages table with KB context support
CREATE TABLE IF NOT EXISTS app_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL UNIQUE,
    url_hash TEXT GENERATED ALWAYS AS (encode(sha256(url::bytea), 'hex')) STORED,
    title TEXT,
    page_type TEXT, -- 'list', 'detail', 'form', 'dashboard', etc.
    
    -- Screenshot and AI description
    screenshot_url TEXT,
    ai_description TEXT,
    
    -- KB-guided context
    kb_context_used TEXT[], -- Array of KB article URLs that informed this page
    product_area TEXT,       -- Auto-categorized via embedding similarity
    
    -- Embeddings for semantic search
    embedding vector(1536),
    
    -- Metadata
    crawled_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_page_type CHECK (
        page_type IS NULL OR 
        page_type IN ('list', 'detail', 'form', 'dashboard', 'settings', 'modal', 'other')
    )
);

-- Fresh page_containers for modals, drawers, dropdowns
CREATE TABLE IF NOT EXISTS page_containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES app_pages(id) ON DELETE CASCADE,
    
    container_type TEXT NOT NULL, -- 'modal', 'drawer', 'dropdown', 'popover'
    trigger_selector TEXT,        -- CSS selector that opens this container
    trigger_text TEXT,            -- Button/link text that opens it
    
    -- Screenshot and AI description
    screenshot_url TEXT,
    ai_description TEXT,
    
    -- KB-guided context
    kb_context_used TEXT[],
    
    -- Embeddings
    embedding vector(1536),
    
    -- Metadata
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_container_type CHECK (
        container_type IN ('modal', 'drawer', 'dropdown', 'popover', 'sidebar', 'panel')
    )
);

-- Fresh global navigation table
CREATE TABLE IF NOT EXISTS global_navigation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nav_type TEXT NOT NULL UNIQUE, -- 'header', 'sidebar', 'footer'
    screenshot_url TEXT,
    ai_description TEXT,
    structure JSONB, -- Hierarchical nav structure
    crawled_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fresh nav_items table (simpler than before)
CREATE TABLE IF NOT EXISTS nav_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    navigation_id UUID REFERENCES global_navigation(id) ON DELETE CASCADE,
    
    label TEXT NOT NULL,
    url TEXT,
    icon_name TEXT,
    
    parent_id UUID REFERENCES nav_items(id) ON DELETE CASCADE,
    item_order INTEGER DEFAULT 0,
    depth INTEGER DEFAULT 0,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR NEW TABLES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_app_pages_url_hash ON app_pages(url_hash);
CREATE INDEX IF NOT EXISTS idx_app_pages_page_type ON app_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_app_pages_product_area ON app_pages(product_area);
CREATE INDEX IF NOT EXISTS idx_page_containers_page_id ON page_containers(page_id);
CREATE INDEX IF NOT EXISTS idx_page_containers_type ON page_containers(container_type);
CREATE INDEX IF NOT EXISTS idx_nav_items_navigation_id ON nav_items(navigation_id);
CREATE INDEX IF NOT EXISTS idx_nav_items_parent_id ON nav_items(parent_id);

-- Vector indexes for similarity search
CREATE INDEX IF NOT EXISTS idx_app_pages_embedding ON app_pages 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_page_containers_embedding ON page_containers 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE app_pages IS 'Fresh web app pages table with KB-guided AI descriptions';
COMMENT ON TABLE page_containers IS 'Modals, drawers, and other containers discovered on pages';
COMMENT ON TABLE global_navigation IS 'Top-level navigation structure (header, sidebar, footer)';
COMMENT ON TABLE nav_items IS 'Individual navigation items with hierarchy';

COMMENT ON COLUMN app_pages.kb_context_used IS 'KB article URLs used to generate AI description';
COMMENT ON COLUMN app_pages.product_area IS 'Auto-categorized product area via embedding similarity';
COMMENT ON COLUMN page_containers.kb_context_used IS 'KB article URLs used to generate AI description';

