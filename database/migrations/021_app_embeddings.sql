-- ============================================================
-- Migration 021: App Embeddings for Pages, Components, Actions
-- ============================================================
-- 
-- Adds embedding support for all crawled app data:
-- - app_pages: embedding column (may exist from 019)
-- - page_components: embedding column (exists from 020)
-- - page_actions: NEW embedding column
--
-- Also creates a unified search function that searches ALL content
-- including KB articles, videos, app pages, components, and actions.
--
-- Created: December 28, 2024
-- ============================================================

-- Ensure pgvector is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- ADD EMBEDDING COLUMNS
-- ============================================================

-- Add embedding to page_actions (new)
ALTER TABLE page_actions 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

ALTER TABLE page_actions 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE page_actions 
ADD COLUMN IF NOT EXISTS kb_context_used TEXT;

ALTER TABLE page_actions 
ADD COLUMN IF NOT EXISTS screenshot_path TEXT;

-- Add vision_description columns for storing GPT-4V analysis
ALTER TABLE app_pages 
ADD COLUMN IF NOT EXISTS vision_description TEXT;

ALTER TABLE page_components 
ADD COLUMN IF NOT EXISTS vision_description TEXT;

ALTER TABLE page_actions 
ADD COLUMN IF NOT EXISTS vision_description TEXT;

-- Ensure app_pages has embedding column (may exist)
ALTER TABLE app_pages 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- ============================================================
-- INDEXES FOR VECTOR SEARCH
-- ============================================================

-- Index for page_actions embeddings
CREATE INDEX IF NOT EXISTS idx_page_actions_embedding 
ON page_actions 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);

-- Index for page_components embeddings (may exist)
CREATE INDEX IF NOT EXISTS idx_page_components_embedding 
ON page_components 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);

-- Index for app_pages embeddings (may exist)
CREATE INDEX IF NOT EXISTS idx_app_pages_embedding 
ON app_pages 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);

-- ============================================================
-- UNIFIED SEARCH FUNCTION (v3 - includes components & actions)
-- ============================================================

CREATE OR REPLACE FUNCTION search_app_content(
    query_embedding vector(1536),
    match_count int DEFAULT 20,
    match_threshold float DEFAULT 0.5,
    content_types text[] DEFAULT ARRAY['page', 'component', 'action', 'article', 'video']
)
RETURNS TABLE (
    id text,
    content_type text,
    title text,
    description text,
    url_or_path text,
    screenshot_url text,
    parent_info text,
    similarity float,
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    
    -- App Pages
    SELECT 
        ap.id::text,
        'page'::text as content_type,
        COALESCE(ap.title, 'Untitled Page')::text as title,
        COALESCE(ap.vision_description, ap.ai_description, '')::text as description,
        ap.url_pattern::text as url_or_path,
        ap.screenshot_path::text as screenshot_url,
        COALESCE(pa.name, 'Uncategorized')::text as parent_info,
        1 - (ap.embedding <=> query_embedding) as similarity,
        jsonb_build_object(
            'product_area', pa.name,
            'kb_context', ap.kb_context_used,
            'has_screenshot', ap.screenshot_path IS NOT NULL
        ) as metadata
    FROM app_pages ap
    LEFT JOIN product_areas pa ON ap.product_area_id = pa.id
    WHERE ap.embedding IS NOT NULL
      AND 'page' = ANY(content_types)
      AND 1 - (ap.embedding <=> query_embedding) >= match_threshold
    
    UNION ALL
    
    -- Page Components
    SELECT 
        pc.id::text,
        'component'::text,
        COALESCE(pc.component_name, 'Unnamed Component')::text,
        COALESCE(pc.vision_description, pc.ai_description, '')::text,
        ap.url_pattern::text,
        pc.screenshot_path::text,
        COALESCE(ap.title, ap.url_pattern)::text,
        1 - (pc.embedding <=> query_embedding),
        jsonb_build_object(
            'component_type', pc.component_type,
            'page_title', ap.title,
            'kb_context', pc.kb_context_used,
            'has_screenshot', pc.screenshot_path IS NOT NULL
        )
    FROM page_components pc
    JOIN app_pages ap ON pc.page_id = ap.id
    WHERE pc.embedding IS NOT NULL
      AND 'component' = ANY(content_types)
      AND 1 - (pc.embedding <=> query_embedding) >= match_threshold
    
    UNION ALL
    
    -- Page Actions
    SELECT 
        pa.id::text,
        'action'::text,
        COALESCE(pa.element_text, 'Unnamed Action')::text,
        COALESCE(pa.vision_description, pa.description, pa.predicted_action, '')::text,
        ap.url_pattern::text,
        pa.screenshot_path::text,
        COALESCE(ap.title, ap.url_pattern)::text,
        1 - (pa.embedding <=> query_embedding),
        jsonb_build_object(
            'element_type', pa.element_type,
            'explored', pa.explored,
            'page_title', ap.title,
            'opens_component', pc.component_name,
            'navigates_to', nav.url_pattern
        )
    FROM page_actions pa
    JOIN app_pages ap ON pa.page_id = ap.id
    LEFT JOIN page_components pc ON pa.opens_component_id = pc.id
    LEFT JOIN app_pages nav ON pa.navigates_to_page_id = nav.id
    WHERE pa.embedding IS NOT NULL
      AND 'action' = ANY(content_types)
      AND 1 - (pa.embedding <=> query_embedding) >= match_threshold
    
    UNION ALL
    
    -- KB Articles (content_chunks)
    SELECT 
        cc.id::text,
        'article'::text,
        COALESCE(su.title, 'KB Article')::text,
        cc.content::text,
        su.url::text,
        cc.screenshot_url::text,
        COALESCE(parea.name, 'Knowledge Base')::text,
        1 - (cc.embedding <=> query_embedding),
        jsonb_build_object(
            'source_type', 'knowledge_base',
            'product_area', parea.name,
            'chunk_index', cc.chunk_index
        )
    FROM content_chunks cc
    LEFT JOIN source_urls su ON cc.source_url_id = su.id
    LEFT JOIN product_areas parea ON cc.product_area_id = parea.id
    WHERE cc.embedding IS NOT NULL
      AND 'article' = ANY(content_types)
      AND 1 - (cc.embedding <=> query_embedding) >= match_threshold
    
    UNION ALL
    
    -- Video Steps
    SELECT 
        vs.id::text,
        'video'::text,
        COALESCE(kv.title || ' - Step ' || vs.step_number::text, 'Video Step')::text,
        vs.step_description::text,
        kv.kb_article_url::text,
        vs.frame_url::text,
        COALESCE(kv.title, 'Video')::text,
        1 - (vs.embedding <=> query_embedding),
        jsonb_build_object(
            'step_number', vs.step_number,
            'timestamp', vs.timestamp_seconds,
            'video_title', kv.title
        )
    FROM video_steps vs
    JOIN kb_videos kv ON vs.video_id = kv.id
    WHERE vs.embedding IS NOT NULL
      AND 'video' = ANY(content_types)
      AND 1 - (vs.embedding <=> query_embedding) >= match_threshold
    
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- ============================================================
-- HELPER VIEW: Embedding Statistics
-- ============================================================

CREATE OR REPLACE VIEW app_embedding_stats AS
SELECT 
    'app_pages' as table_name,
    COUNT(*) as total_rows,
    COUNT(embedding) as with_embedding,
    COUNT(*) - COUNT(embedding) as without_embedding,
    ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 1) as percent_embedded
FROM app_pages
UNION ALL
SELECT 
    'page_components',
    COUNT(*),
    COUNT(embedding),
    COUNT(*) - COUNT(embedding),
    ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 1)
FROM page_components
UNION ALL
SELECT 
    'page_actions',
    COUNT(*),
    COUNT(embedding),
    COUNT(*) - COUNT(embedding),
    ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 1)
FROM page_actions
UNION ALL
SELECT 
    'content_chunks',
    COUNT(*),
    COUNT(embedding),
    COUNT(*) - COUNT(embedding),
    ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 1)
FROM content_chunks;

-- ============================================================
-- COMMENT
-- ============================================================
COMMENT ON FUNCTION search_app_content IS 
'Unified semantic search across all AccuLynx content: KB articles, videos, app pages, components, and actions. 
Use content_types parameter to filter: ARRAY[''page'', ''component'', ''action'', ''article'', ''video'']';


