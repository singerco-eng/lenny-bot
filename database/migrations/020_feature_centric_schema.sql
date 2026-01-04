-- ============================================================
-- Migration 020: Feature-Centric Schema for KB-Guided Crawling
-- ============================================================
-- 
-- This schema models AccuLynx from a FEATURE perspective:
-- - Features are user-facing actions (e.g., "Create Appointment")
-- - Components are UI elements that enable features (drawers, modals, forms)
-- - Pages are where we find these components
-- - Actions are clickable elements we discover during crawling
--
-- NOTE: This migration handles both fresh installs and upgrades from
-- migration 019. It uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS
-- to be idempotent.
--
-- Created: December 24, 2024
-- ============================================================

-- ============================================================
-- PRODUCT AREAS (from Global Context)
-- ============================================================
-- Hierarchical categorization of AccuLynx functionality

CREATE TABLE IF NOT EXISTS product_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES product_areas(id),
    kb_article_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to product_areas (if table existed from 019)
ALTER TABLE product_areas ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES product_areas(id);
ALTER TABLE product_areas ADD COLUMN IF NOT EXISTS kb_article_count INTEGER DEFAULT 0;

-- Ensure unique constraint on name exists (needed for ON CONFLICT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'product_areas_name_key' AND conrelid = 'product_areas'::regclass
    ) THEN
        ALTER TABLE product_areas ADD CONSTRAINT product_areas_name_key UNIQUE (name);
    END IF;
EXCEPTION WHEN duplicate_table THEN
    -- Constraint already exists, ignore
END $$;

-- Make slug nullable if it's NOT NULL (existing schema from 019)
ALTER TABLE product_areas ALTER COLUMN slug DROP NOT NULL;

-- Seed with main product areas from Global Context
INSERT INTO product_areas (name, slug, description) VALUES
    ('Job Management', 'job-management', 'Core job tracking, status, and workflow'),
    ('Leads', 'leads', 'Lead capture, qualification, and conversion'),
    ('Contacts', 'contacts', 'Customer and contact management'),
    ('Calendar', 'calendar', 'Scheduling appointments and crew assignments'),
    ('Communications', 'communications', 'Emails, texts, job messages, portal messages, crew messages'),
    ('Estimates', 'estimates', 'Creating estimates and proposals'),
    ('Orders', 'orders', 'Material ordering and supplier integrations'),
    ('Labor', 'labor', 'Labor tracking and crew management'),
    ('Payments', 'payments', 'Payment collection and processing'),
    ('Documents', 'documents', 'Smart Docs and document management'),
    ('Reporting', 'reporting', 'Business reports and analytics'),
    ('Settings', 'settings', 'Company and location configuration'),
    ('User Management', 'user-management', 'User accounts, roles, and permissions')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- FEATURES (User-facing functionality)
-- ============================================================
-- A feature is something a user can DO in AccuLynx
-- e.g., "Create Appointment", "Send Email", "Generate Estimate"

CREATE TABLE IF NOT EXISTS features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name TEXT NOT NULL,                           -- e.g., "Create Appointment"
    slug TEXT UNIQUE,                             -- e.g., "create-appointment"
    description TEXT,                             -- What this feature does
    
    -- Classification
    product_area_id UUID REFERENCES product_areas(id),
    feature_type TEXT,                            -- 'action', 'view', 'setting', 'report'
    
    -- KB Context
    kb_documented BOOLEAN DEFAULT FALSE,          -- Is this in the KB?
    kb_article_ids TEXT[],                        -- Related KB article IDs
    kb_video_ids TEXT[],                          -- Related video IDs
    kb_summary TEXT,                              -- AI summary of KB content for this feature
    
    -- Discovery
    discovered_by TEXT,                           -- 'kb', 'crawl', 'manual'
    discovery_confidence FLOAT,                   -- 0.0 to 1.0
    
    -- Status
    status TEXT DEFAULT 'discovered',             -- 'discovered', 'verified', 'deprecated'
    needs_review BOOLEAN DEFAULT FALSE,
    review_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_features_product_area ON features(product_area_id);
CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
CREATE INDEX IF NOT EXISTS idx_features_needs_review ON features(needs_review) WHERE needs_review = TRUE;

-- ============================================================
-- APP PAGES (Crawled pages)
-- ============================================================
-- Pages we've visited in the AccuLynx app
-- Note: Table may already exist from migration 019, so we add missing columns

CREATE TABLE IF NOT EXISTS app_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns that don't exist yet (safe if they already exist)
-- Note: Existing schema from 019 has different column names, we'll add what's missing
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS url_pattern TEXT;
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS product_area_id UUID REFERENCES product_areas(id);
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS parent_page_id UUID REFERENCES app_pages(id);
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS ai_description_model TEXT;
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS screenshot_path TEXT;
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS crawl_status TEXT DEFAULT 'pending';
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS crawl_depth INTEGER DEFAULT 0;
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMPTZ;
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS crawl_error TEXT;
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE;
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE app_pages ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
-- Note: embedding, ai_description, screenshot_url, page_type already exist from 019

CREATE INDEX IF NOT EXISTS idx_app_pages_product_area ON app_pages(product_area_id);
CREATE INDEX IF NOT EXISTS idx_app_pages_crawl_status ON app_pages(crawl_status);
CREATE INDEX IF NOT EXISTS idx_app_pages_needs_review ON app_pages(needs_review) WHERE needs_review = TRUE;

-- ============================================================
-- PAGE COMPONENTS (UI elements on pages)
-- ============================================================
-- Modals, drawers, dropdowns, tabs, etc.

CREATE TABLE IF NOT EXISTS page_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES app_pages(id) ON DELETE CASCADE,
    
    -- Identity
    component_type TEXT NOT NULL,                 -- 'modal', 'drawer', 'dropdown', 'tab', 'form', 'section'
    component_name TEXT,                          -- Human-readable name
    
    -- How to access
    trigger_selector TEXT,                        -- CSS selector that opens this
    trigger_text TEXT,                            -- Button/link text
    trigger_action TEXT,                          -- 'click', 'hover', 'focus'
    
    -- Content
    screenshot_url TEXT,
    screenshot_path TEXT,
    ai_description TEXT,
    kb_context_used TEXT,
    
    -- Classification
    action_classification TEXT,                   -- 'explore', 'document_only', 'skip'
    
    -- Review
    needs_review BOOLEAN DEFAULT FALSE,
    review_notes TEXT,
    
    -- Embedding
    embedding vector(1536),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_components_page ON page_components(page_id);
CREATE INDEX IF NOT EXISTS idx_page_components_type ON page_components(component_type);
CREATE INDEX IF NOT EXISTS idx_page_components_classification ON page_components(action_classification);

-- ============================================================
-- FEATURE LOCATIONS (Where features appear)
-- ============================================================
-- Maps features to pages/components where they can be accessed

CREATE TABLE IF NOT EXISTS feature_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    
    -- Location (one of these should be set)
    page_id UUID REFERENCES app_pages(id) ON DELETE CASCADE,
    component_id UUID REFERENCES page_components(id) ON DELETE CASCADE,
    
    -- How to access
    access_path TEXT,                             -- e.g., "Jobs > Job Detail > Appointments Tab > New Appointment"
    trigger_element TEXT,                         -- What to click/interact with
    
    -- Context
    is_primary_location BOOLEAN DEFAULT FALSE,    -- Is this the main place for this feature?
    location_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_locations_feature ON feature_locations(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_locations_page ON feature_locations(page_id);
CREATE INDEX IF NOT EXISTS idx_feature_locations_component ON feature_locations(component_id);

-- ============================================================
-- PAGE ACTIONS (Clickable elements discovered during crawl)
-- ============================================================
-- Every interactive element we find on a page

CREATE TABLE IF NOT EXISTS page_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES app_pages(id) ON DELETE CASCADE,
    
    -- Element info
    element_type TEXT,                            -- 'button', 'link', 'input', 'dropdown', 'tab'
    element_text TEXT,                            -- Visible text
    element_selector TEXT,                        -- CSS selector
    element_aria_label TEXT,                      -- Accessibility label
    
    -- Classification
    action_classification TEXT NOT NULL,          -- 'explore', 'document_only', 'skip'
    classification_reason TEXT,                   -- Why this classification
    classification_source TEXT,                   -- 'ai', 'kb_match', 'manual', 'rule'
    
    -- What it does
    predicted_action TEXT,                        -- What we think clicking does
    actual_result TEXT,                           -- What actually happened (after exploration)
    opens_component_id UUID REFERENCES page_components(id),
    navigates_to_page_id UUID REFERENCES app_pages(id),
    
    -- Feature mapping
    feature_id UUID REFERENCES features(id),      -- If this action is part of a feature
    
    -- Status
    explored BOOLEAN DEFAULT FALSE,
    exploration_error TEXT,
    
    -- Review
    needs_review BOOLEAN DEFAULT FALSE,
    review_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_actions_page ON page_actions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_actions_classification ON page_actions(action_classification);
CREATE INDEX IF NOT EXISTS idx_page_actions_feature ON page_actions(feature_id);
CREATE INDEX IF NOT EXISTS idx_page_actions_needs_review ON page_actions(needs_review) WHERE needs_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_page_actions_unexplored ON page_actions(explored) WHERE explored = FALSE AND action_classification = 'explore';

-- ============================================================
-- CRAWL SESSIONS (Track crawl runs)
-- ============================================================

CREATE TABLE IF NOT EXISTS crawl_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session info
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running',                -- 'running', 'completed', 'failed', 'cancelled'
    
    -- Scope
    target_product_area TEXT,                     -- Which product area we're focusing on
    target_pages TEXT[],                          -- Specific pages to crawl
    
    -- Stats
    pages_crawled INTEGER DEFAULT 0,
    components_found INTEGER DEFAULT 0,
    actions_discovered INTEGER DEFAULT 0,
    features_identified INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    
    -- Notes
    notes TEXT,
    error_log TEXT
);

-- ============================================================
-- REVIEW QUEUE (Items needing human review)
-- ============================================================
-- Aggregated view of all items needing review

CREATE OR REPLACE VIEW review_queue AS
SELECT 
    'page' as item_type,
    id as item_id,
    title as item_name,
    review_notes,
    COALESCE(crawled_at, updated_at) as created_at
FROM app_pages WHERE needs_review = TRUE
UNION ALL
SELECT 
    'component' as item_type,
    id as item_id,
    component_name as item_name,
    review_notes,
    created_at
FROM page_components WHERE needs_review = TRUE
UNION ALL
SELECT 
    'action' as item_type,
    id as item_id,
    element_text as item_name,
    review_notes,
    created_at
FROM page_actions WHERE needs_review = TRUE
UNION ALL
SELECT 
    'feature' as item_type,
    id as item_id,
    name as item_name,
    review_notes,
    created_at
FROM features WHERE needs_review = TRUE
ORDER BY created_at DESC;

-- ============================================================
-- HELPER FUNCTION: Search all content including app pages
-- ============================================================

CREATE OR REPLACE FUNCTION search_all_content_v2(
    query_embedding vector(1536),
    match_count int DEFAULT 10,
    match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
    id text,
    content_type text,
    title text,
    content text,
    source_url text,
    screenshot_url text,
    similarity float,
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- KB Articles
    SELECT 
        cc.id::text,
        'article'::text as content_type,
        COALESCE(su.title, 'Untitled')::text as title,
        cc.content::text,
        su.url::text as source_url,
        NULL::text as screenshot_url,
        1 - (cc.embedding <=> query_embedding) as similarity,
        jsonb_build_object('chunk_index', cc.chunk_index) as metadata
    FROM content_chunks cc
    LEFT JOIN source_urls su ON cc.source_url_id = su.id
    WHERE cc.embedding IS NOT NULL
      AND 1 - (cc.embedding <=> query_embedding) >= match_threshold
    
    UNION ALL
    
    -- Video Steps
    SELECT 
        vs.id::text,
        'video_step'::text,
        COALESCE(kv.title || ' - Step ' || vs.step_number::text, 'Video Step')::text,
        vs.step_description::text,
        kv.kb_article_url::text,
        vs.frame_url::text,
        1 - (vs.embedding <=> query_embedding),
        jsonb_build_object('step_number', vs.step_number, 'timestamp', vs.timestamp_seconds)
    FROM video_steps vs
    JOIN kb_videos kv ON vs.video_id = kv.id
    WHERE vs.embedding IS NOT NULL
      AND 1 - (vs.embedding <=> query_embedding) >= match_threshold
    
    UNION ALL
    
    -- Video Summaries
    SELECT 
        kv.id::text,
        'video_summary'::text,
        COALESCE(kv.title, 'Video')::text,
        kv.ai_summary::text,
        kv.kb_article_url::text,
        kv.thumbnail_url::text,
        1 - (kv.embedding <=> query_embedding),
        jsonb_build_object('duration', kv.duration_seconds, 'platform', kv.platform)
    FROM kb_videos kv
    WHERE kv.embedding IS NOT NULL
      AND kv.ai_summary IS NOT NULL
      AND 1 - (kv.embedding <=> query_embedding) >= match_threshold
    
    UNION ALL
    
    -- App Pages (NEW)
    SELECT 
        ap.id::text,
        'app_page'::text,
        COALESCE(ap.title, 'App Page')::text,
        ap.ai_description::text,
        ap.url::text,
        ap.screenshot_url::text,
        1 - (ap.embedding <=> query_embedding),
        jsonb_build_object('page_type', ap.page_type, 'product_area', pa.name)
    FROM app_pages ap
    LEFT JOIN product_areas pa ON ap.product_area_id = pa.id
    WHERE ap.embedding IS NOT NULL
      AND ap.ai_description IS NOT NULL
      AND 1 - (ap.embedding <=> query_embedding) >= match_threshold
    
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- ============================================================
-- INDEXES for performance
-- ============================================================

-- Ensure we have good indexes for common queries
CREATE INDEX IF NOT EXISTS idx_features_slug ON features(slug);
CREATE INDEX IF NOT EXISTS idx_app_pages_url_pattern ON app_pages(url_pattern);

