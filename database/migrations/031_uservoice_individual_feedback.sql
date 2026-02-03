-- ============================================
-- LENNY BOT - UserVoice Individual Feedback Schema
-- ============================================
-- Individual feedback comments that belong to parent roadmap items
-- These do NOT have their own MRR - they are represented by the parent

CREATE TABLE IF NOT EXISTS uservoice_individual_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to parent roadmap item
    parent_feedback_id UUID REFERENCES uservoice_feedback(id) ON DELETE CASCADE,
    parent_title TEXT NOT NULL,  -- Denormalized for easy querying
    
    -- Submitter info
    submitter_name TEXT,
    company TEXT,
    
    -- Content
    comment TEXT NOT NULL,
    submitted_date TEXT,  -- Keep as text since formats vary
    captured_by TEXT,  -- If submitted on behalf of someone
    
    -- Dedup
    identifier_hash BIGINT,  -- Hash of submitter+company+comment for dedup
    
    -- Source tracking
    source TEXT DEFAULT 'roadmap_feedback_image',
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_individual_feedback_parent ON uservoice_individual_feedback(parent_feedback_id);
CREATE INDEX IF NOT EXISTS idx_individual_feedback_parent_title ON uservoice_individual_feedback(parent_title);
CREATE INDEX IF NOT EXISTS idx_individual_feedback_hash ON uservoice_individual_feedback(identifier_hash);
CREATE INDEX IF NOT EXISTS idx_individual_feedback_company ON uservoice_individual_feedback(company);

-- Unique constraint on hash to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_individual_feedback_unique 
    ON uservoice_individual_feedback(identifier_hash) 
    WHERE identifier_hash IS NOT NULL;
