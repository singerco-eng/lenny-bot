-- ============================================
-- LENNY BOT - Initial Database Schema
-- ============================================
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- Product Areas (Taxonomy)
-- ============================================
CREATE TABLE IF NOT EXISTS product_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_id UUID REFERENCES product_areas(id) ON DELETE SET NULL,
    description TEXT,
    keywords TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for parent lookups
CREATE INDEX IF NOT EXISTS idx_product_areas_parent ON product_areas(parent_id);

-- ============================================
-- Source URLs (What we've scraped)
-- ============================================
CREATE TABLE IF NOT EXISTS source_urls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT UNIQUE NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('knowledge_base', 'web_app')),
    title TEXT,
    last_scraped_at TIMESTAMPTZ,
    scrape_status TEXT DEFAULT 'pending' CHECK (scrape_status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
    product_area_id UUID REFERENCES product_areas(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_source_urls_status ON source_urls(scrape_status);
CREATE INDEX IF NOT EXISTS idx_source_urls_type ON source_urls(source_type);
CREATE INDEX IF NOT EXISTS idx_source_urls_product_area ON source_urls(product_area_id);

-- ============================================
-- Content Chunks (Clean, processed content)
-- ============================================
CREATE TABLE IF NOT EXISTS content_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_url_id UUID REFERENCES source_urls(id) ON DELETE CASCADE,
    product_area_id UUID REFERENCES product_areas(id) ON DELETE SET NULL,
    
    -- Content
    content_type TEXT NOT NULL CHECK (content_type IN (
        'article', 'screenshot_description', 'feature_description',
        'how_to', 'faq', 'ui_element', 'workflow'
    )),
    title TEXT,
    content TEXT NOT NULL,
    
    -- For screenshots
    screenshot_url TEXT,
    screenshot_description TEXT,
    
    -- Metadata
    hierarchy_path TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    quality_score FLOAT DEFAULT 0.5 CHECK (quality_score >= 0 AND quality_score <= 1),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_chunks_source ON content_chunks(source_url_id);
CREATE INDEX IF NOT EXISTS idx_content_chunks_product_area ON content_chunks(product_area_id);
CREATE INDEX IF NOT EXISTS idx_content_chunks_type ON content_chunks(content_type);
CREATE INDEX IF NOT EXISTS idx_content_chunks_quality ON content_chunks(quality_score DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_content_chunks_fts ON content_chunks 
    USING gin(to_tsvector('english', coalesce(title, '') || ' ' || content));

-- ============================================
-- Embeddings (Vector store)
-- ============================================
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_chunk_id UUID REFERENCES content_chunks(id) ON DELETE CASCADE,
    embedding vector(1536), -- text-embedding-3-large with dimensions=1536
    model TEXT DEFAULT 'text-embedding-3-large',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One embedding per chunk
    UNIQUE(content_chunk_id)
);

-- Vector similarity index (HNSW for approximate nearest neighbor)
-- Using 1536 dimensions for compatibility (pgvector limit is 2000)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings 
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- ============================================
-- Scrape Sessions (Tracking runs)
-- ============================================
CREATE TABLE IF NOT EXISTS scrape_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_type TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    urls_processed INT DEFAULT 0,
    chunks_created INT DEFAULT 0,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    notes TEXT
);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to search for similar content using embeddings
CREATE OR REPLACE FUNCTION search_similar_content(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    chunk_id UUID,
    content TEXT,
    title TEXT,
    product_area_name TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id AS chunk_id,
        cc.content,
        cc.title,
        pa.name AS product_area_name,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    JOIN content_chunks cc ON e.content_chunk_id = cc.id
    LEFT JOIN product_areas pa ON cc.product_area_id = pa.id
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for content_chunks
DROP TRIGGER IF EXISTS update_content_chunks_updated_at ON content_chunks;
CREATE TRIGGER update_content_chunks_updated_at
    BEFORE UPDATE ON content_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (Optional but recommended)
-- ============================================
-- Uncomment these if you want to enable RLS

-- ALTER TABLE product_areas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE source_urls ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE content_chunks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scrape_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Storage Bucket for Screenshots
-- ============================================
-- Run this separately in Supabase Dashboard > Storage
-- Or use the API:
-- 
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('screenshots', 'screenshots', true);

-- ============================================
-- Summary Views
-- ============================================

-- View for content stats by product area
CREATE OR REPLACE VIEW content_stats AS
SELECT 
    pa.name AS product_area,
    pa.slug AS product_area_slug,
    COUNT(DISTINCT su.id) AS url_count,
    COUNT(DISTINCT cc.id) AS chunk_count,
    COUNT(DISTINCT e.id) AS embedded_count,
    AVG(cc.quality_score) AS avg_quality
FROM product_areas pa
LEFT JOIN source_urls su ON su.product_area_id = pa.id
LEFT JOIN content_chunks cc ON cc.product_area_id = pa.id
LEFT JOIN embeddings e ON e.content_chunk_id = cc.id
GROUP BY pa.id, pa.name, pa.slug
ORDER BY chunk_count DESC;

-- View for scraping progress
CREATE OR REPLACE VIEW scrape_progress AS
SELECT 
    source_type,
    scrape_status,
    COUNT(*) AS url_count
FROM source_urls
GROUP BY source_type, scrape_status
ORDER BY source_type, scrape_status;

