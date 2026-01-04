-- ============================================
-- LENNY BOT - Vector Embeddings Schema
-- Migration 018
-- ============================================
-- Enables semantic search using pgvector extension
-- Embeddings are generated using OpenAI's text-embedding-ada-002 (1536 dimensions)

-- ============================================
-- Enable pgvector extension
-- ============================================
-- This must be enabled by Supabase (usually already available)
-- If not, go to Supabase Dashboard > Database > Extensions > Enable "vector"

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Add embedding column to content_chunks
-- ============================================

ALTER TABLE content_chunks 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Index for fast similarity search (IVFFlat - good balance of speed/accuracy)
-- Lists = sqrt(num_rows) is a good starting point, we'll use 100 for ~10k rows
CREATE INDEX IF NOT EXISTS idx_content_chunks_embedding 
ON content_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- Add embedding column to video_steps
-- ============================================
-- Each step can also be searched semantically

ALTER TABLE video_steps
ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_video_steps_embedding
ON video_steps
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- Add embedding to kb_videos (for summaries)
-- ============================================

ALTER TABLE kb_videos
ADD COLUMN IF NOT EXISTS summary_embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_kb_videos_embedding
ON kb_videos
USING ivfflat (summary_embedding vector_cosine_ops)
WITH (lists = 50);

-- ============================================
-- Semantic Search Function
-- ============================================
-- Finds content similar to a query embedding

CREATE OR REPLACE FUNCTION match_content(
    query_embedding vector(1536),
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
    id uuid,
    content text,
    title text,
    content_type text,
    source_url text,
    hierarchy_path text[],
    screenshot_url text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.content,
        cc.title,
        cc.content_type,
        su.url as source_url,
        cc.hierarchy_path,
        cc.screenshot_url,
        1 - (cc.embedding <=> query_embedding) as similarity
    FROM content_chunks cc
    LEFT JOIN source_urls su ON cc.source_url_id = su.id
    WHERE cc.embedding IS NOT NULL
      AND 1 - (cc.embedding <=> query_embedding) > match_threshold
    ORDER BY cc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- Search Video Steps Function
-- ============================================

CREATE OR REPLACE FUNCTION match_video_steps(
    query_embedding vector(1536),
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
    id uuid,
    video_id uuid,
    step_number int,
    action_summary text,
    narration text,
    frame_description text,
    video_title text,
    article_title text,
    timestamp_start float,
    frame_screenshot_url text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vs.id,
        vs.video_id,
        vs.step_number,
        vs.action_summary,
        vs.narration,
        vs.frame_description,
        kv.title as video_title,
        kv.article_title,
        vs.timestamp_start,
        vs.frame_screenshot_url,
        1 - (vs.embedding <=> query_embedding) as similarity
    FROM video_steps vs
    JOIN kb_videos kv ON vs.video_id = kv.id
    WHERE vs.embedding IS NOT NULL
      AND 1 - (vs.embedding <=> query_embedding) > match_threshold
    ORDER BY vs.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- Unified Search Function (searches all content)
-- ============================================

CREATE OR REPLACE FUNCTION search_all_content(
    query_embedding vector(1536),
    match_count int DEFAULT 10,
    match_threshold float DEFAULT 0.6
)
RETURNS TABLE (
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
    
    -- Content chunks (KB articles)
    SELECT 
        'article'::text as content_type,
        cc.title,
        cc.content,
        su.url as source_url,
        cc.screenshot_url,
        1 - (cc.embedding <=> query_embedding) as similarity,
        jsonb_build_object(
            'hierarchy', cc.hierarchy_path,
            'keywords', cc.keywords
        ) as metadata
    FROM content_chunks cc
    LEFT JOIN source_urls su ON cc.source_url_id = su.id
    WHERE cc.embedding IS NOT NULL
      AND 1 - (cc.embedding <=> query_embedding) > match_threshold
    
    UNION ALL
    
    -- Video steps
    SELECT 
        'video_step'::text as content_type,
        kv.title || ' - Step ' || vs.step_number as title,
        COALESCE(vs.action_summary, '') || E'\n' || COALESCE(vs.narration, '') as content,
        kv.article_url as source_url,
        vs.frame_screenshot_url as screenshot_url,
        1 - (vs.embedding <=> query_embedding) as similarity,
        jsonb_build_object(
            'video_title', kv.title,
            'step_number', vs.step_number,
            'timestamp', vs.timestamp_start
        ) as metadata
    FROM video_steps vs
    JOIN kb_videos kv ON vs.video_id = kv.id
    WHERE vs.embedding IS NOT NULL
      AND 1 - (vs.embedding <=> query_embedding) > match_threshold
    
    UNION ALL
    
    -- Video summaries
    SELECT 
        'video_summary'::text as content_type,
        kv.title,
        kv.ai_summary as content,
        kv.article_url as source_url,
        kv.thumbnail_url as screenshot_url,
        1 - (kv.summary_embedding <=> query_embedding) as similarity,
        jsonb_build_object(
            'duration', kv.duration_seconds,
            'article_title', kv.article_title
        ) as metadata
    FROM kb_videos kv
    WHERE kv.summary_embedding IS NOT NULL
      AND 1 - (kv.summary_embedding <=> query_embedding) > match_threshold
    
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- ============================================
-- Embedding Stats View
-- ============================================

CREATE OR REPLACE VIEW embedding_stats AS
SELECT 
    'content_chunks' as table_name,
    COUNT(*) as total_rows,
    COUNT(embedding) as with_embedding,
    COUNT(*) - COUNT(embedding) as without_embedding,
    ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 1) as percent_embedded
FROM content_chunks

UNION ALL

SELECT 
    'video_steps' as table_name,
    COUNT(*) as total_rows,
    COUNT(embedding) as with_embedding,
    COUNT(*) - COUNT(embedding) as without_embedding,
    ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 1) as percent_embedded
FROM video_steps

UNION ALL

SELECT 
    'kb_videos (summaries)' as table_name,
    COUNT(*) as total_rows,
    COUNT(summary_embedding) as with_embedding,
    COUNT(*) - COUNT(summary_embedding) as without_embedding,
    ROUND(100.0 * COUNT(summary_embedding) / NULLIF(COUNT(*), 0), 1) as percent_embedded
FROM kb_videos
WHERE ai_summary IS NOT NULL;

COMMENT ON VIEW embedding_stats IS 'Shows embedding coverage across all tables';









