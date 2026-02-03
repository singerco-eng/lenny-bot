-- ============================================
-- LENNY BOT - UserVoice Feedback Schema
-- ============================================
-- Schema for storing and analyzing customer feedback from UserVoice
-- Run this in Supabase SQL Editor

-- ============================================
-- UserVoice Feedback Items
-- ============================================
CREATE TABLE IF NOT EXISTS uservoice_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core content
    title TEXT NOT NULL,
    body TEXT,  -- Full description/body text
    
    -- Metrics
    vote_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    accounts_count INTEGER DEFAULT 0,  -- Number of accounts requesting this
    revenue TEXT,  -- MRR of requesting accounts (e.g. "$45.9K")
    
    -- Submitter info
    submitter TEXT,
    
    -- Classification
    status TEXT DEFAULT 'open' CHECK (status IN (
        'open', 'under_review', 'planned', 'in_progress', 
        'shipped', 'declined', 'duplicate', 'unknown'
    )),
    category TEXT,  -- High-level category (automations, workflows, etc.)
    subcategory TEXT,  -- More specific sub-category
    
    -- User context
    persona_type TEXT,  -- 'sales_rep', 'ops_manager', 'admin', 'owner', 'unknown'
    company_size TEXT,  -- 'small', 'medium', 'enterprise', 'unknown'
    
    -- Pain/Gain analysis
    pain_category TEXT,  -- Primary pain point category
    gain_sought TEXT,  -- What benefit they're seeking
    
    -- Feature mapping
    related_features TEXT[],  -- Which AccuLynx features this relates to
    automation_type TEXT,  -- 'trigger', 'action', 'filter', 'workflow', 'integration'
    tags TEXT[],  -- Tags from UserVoice
    
    -- Source tracking
    source TEXT DEFAULT 'uservoice',
    original_id TEXT,  -- Original UserVoice ID if available
    submitted_date DATE,
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Extraction metadata
    extraction_confidence FLOAT DEFAULT 0.5,  -- How confident we are in the parsing
    raw_text TEXT,  -- Original raw text before parsing
    page_number INTEGER,  -- Which PDF page this came from
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_uservoice_vote_count ON uservoice_feedback(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_uservoice_accounts_count ON uservoice_feedback(accounts_count DESC);
CREATE INDEX IF NOT EXISTS idx_uservoice_category ON uservoice_feedback(category);
CREATE INDEX IF NOT EXISTS idx_uservoice_pain ON uservoice_feedback(pain_category);
CREATE INDEX IF NOT EXISTS idx_uservoice_status ON uservoice_feedback(status);
CREATE INDEX IF NOT EXISTS idx_uservoice_automation_type ON uservoice_feedback(automation_type);
CREATE INDEX IF NOT EXISTS idx_uservoice_tags ON uservoice_feedback USING gin(tags);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_uservoice_fts ON uservoice_feedback 
    USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, '')));

-- ============================================
-- UserVoice Embeddings
-- ============================================
CREATE TABLE IF NOT EXISTS uservoice_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID REFERENCES uservoice_feedback(id) ON DELETE CASCADE,
    embedding vector(1536),
    model TEXT DEFAULT 'text-embedding-3-large',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(feedback_id)
);

-- Vector similarity index
CREATE INDEX IF NOT EXISTS idx_uservoice_embeddings_vector ON uservoice_embeddings 
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- ============================================
-- UserVoice Topics (Aggregated themes)
-- ============================================
CREATE TABLE IF NOT EXISTS uservoice_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Aggregated metrics
    total_votes INTEGER DEFAULT 0,
    feedback_count INTEGER DEFAULT 0,
    avg_votes FLOAT DEFAULT 0,
    
    -- Classification
    automation_relevance TEXT CHECK (automation_relevance IN (
        'trigger', 'action', 'filter', 'workflow', 'integration', 'ui', 'general'
    )),
    priority_tier TEXT CHECK (priority_tier IN ('P0', 'P1', 'P2', 'P3')),
    
    -- Keywords for matching
    keywords TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link table for feedback to topics (many-to-many)
CREATE TABLE IF NOT EXISTS uservoice_feedback_topics (
    feedback_id UUID REFERENCES uservoice_feedback(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES uservoice_topics(id) ON DELETE CASCADE,
    relevance_score FLOAT DEFAULT 1.0,
    PRIMARY KEY (feedback_id, topic_id)
);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to search UserVoice feedback by similarity
CREATE OR REPLACE FUNCTION search_uservoice_feedback(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    feedback_id UUID,
    title TEXT,
    body TEXT,
    vote_count INT,
    category TEXT,
    pain_category TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uf.id AS feedback_id,
        uf.title,
        uf.body,
        uf.vote_count,
        uf.category,
        uf.pain_category,
        1 - (ue.embedding <=> query_embedding) AS similarity
    FROM uservoice_embeddings ue
    JOIN uservoice_feedback uf ON ue.feedback_id = uf.id
    WHERE 1 - (ue.embedding <=> query_embedding) > match_threshold
    ORDER BY ue.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- Analytics Views
-- ============================================

-- View: Feedback summary by category
CREATE OR REPLACE VIEW uservoice_category_summary AS
SELECT 
    category,
    COUNT(*) AS feedback_count,
    SUM(vote_count) AS total_votes,
    ROUND(AVG(vote_count)::numeric, 1) AS avg_votes,
    MAX(vote_count) AS max_votes
FROM uservoice_feedback
WHERE category IS NOT NULL
GROUP BY category
ORDER BY total_votes DESC;

-- View: Feedback summary by pain category
CREATE OR REPLACE VIEW uservoice_pain_summary AS
SELECT 
    pain_category,
    COUNT(*) AS feedback_count,
    SUM(vote_count) AS total_votes,
    ROUND(AVG(vote_count)::numeric, 1) AS avg_votes
FROM uservoice_feedback
WHERE pain_category IS NOT NULL
GROUP BY pain_category
ORDER BY total_votes DESC;

-- View: Top voted items
CREATE OR REPLACE VIEW uservoice_top_voted AS
SELECT 
    id,
    title,
    vote_count,
    accounts_count,
    revenue,
    category,
    pain_category,
    automation_type,
    status
FROM uservoice_feedback
ORDER BY vote_count DESC
LIMIT 100;

-- View: Top by accounts (breadth of demand)
CREATE OR REPLACE VIEW uservoice_by_accounts AS
SELECT 
    id,
    title,
    vote_count,
    accounts_count,
    revenue,
    category,
    pain_category,
    automation_type
FROM uservoice_feedback
ORDER BY accounts_count DESC
LIMIT 100;

-- View: Automation type breakdown
CREATE OR REPLACE VIEW uservoice_automation_types AS
SELECT 
    automation_type,
    COUNT(*) AS feedback_count,
    SUM(vote_count) AS total_votes,
    ROUND(AVG(vote_count)::numeric, 1) AS avg_votes
FROM uservoice_feedback
WHERE automation_type IS NOT NULL
GROUP BY automation_type
ORDER BY total_votes DESC;

-- ============================================
-- Trigger for updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_uservoice_feedback_updated_at ON uservoice_feedback;
CREATE TRIGGER update_uservoice_feedback_updated_at
    BEFORE UPDATE ON uservoice_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_uservoice_topics_updated_at ON uservoice_topics;
CREATE TRIGGER update_uservoice_topics_updated_at
    BEFORE UPDATE ON uservoice_topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
