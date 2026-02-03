-- ============================================
-- LENNY BOT - Research Synthesis Schema
-- Migration 033
-- ============================================
-- Phase 2: AI Synthesis & Auto-Tagging Support
-- ============================================

-- ============================================
-- Synthesis Runs - Track AI Analysis Sessions
-- ============================================

CREATE TABLE synthesis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type TEXT NOT NULL,  -- 'theme_discovery', 'auto_tagging', 'embedding_generation'
    model_used TEXT NOT NULL,  -- 'claude-sonnet-4-20250514', 'text-embedding-3-small', etc.
    input_summary JSONB,  -- Stats about input data
    output_summary JSONB,  -- Stats about results
    tokens_used INTEGER,
    cost_usd DECIMAL(10,4),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running'  -- 'running', 'completed', 'failed'
);

CREATE INDEX idx_synthesis_runs_type ON synthesis_runs(run_type);
CREATE INDEX idx_synthesis_runs_status ON synthesis_runs(status);
CREATE INDEX idx_synthesis_runs_started ON synthesis_runs(started_at DESC);

-- ============================================
-- Research Tag Suggestions - Pending AI Tags
-- ============================================

CREATE TABLE research_tag_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moment_id UUID REFERENCES research_moments(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES research_tags(id) ON DELETE CASCADE,
    confidence FLOAT NOT NULL,
    reasoning TEXT,
    synthesis_run_id UUID REFERENCES synthesis_runs(id),
    status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(moment_id, tag_id)
);

CREATE INDEX idx_tag_suggestions_status ON research_tag_suggestions(status);
CREATE INDEX idx_tag_suggestions_moment ON research_tag_suggestions(moment_id);
CREATE INDEX idx_tag_suggestions_confidence ON research_tag_suggestions(confidence DESC);
CREATE INDEX idx_tag_suggestions_run ON research_tag_suggestions(synthesis_run_id);

-- ============================================
-- Review Queue Statistics View
-- ============================================

CREATE VIEW research_review_stats AS
SELECT
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    AVG(confidence) FILTER (WHERE status = 'pending') as avg_pending_confidence,
    COUNT(DISTINCT moment_id) FILTER (WHERE status = 'pending') as moments_needing_review,
    MIN(created_at) FILTER (WHERE status = 'pending') as oldest_pending,
    MAX(reviewed_at) FILTER (WHERE status IN ('approved', 'rejected')) as last_review_time
FROM research_tag_suggestions;

-- ============================================
-- Pending Items by Tag View
-- ============================================

CREATE VIEW research_pending_by_tag AS
SELECT
    rt.id as tag_id,
    rt.name as tag_name,
    rt.slug as tag_slug,
    rt.theme_id,
    COUNT(*) as pending_count,
    AVG(rts.confidence) as avg_confidence,
    MIN(rts.confidence) as min_confidence,
    MAX(rts.confidence) as max_confidence
FROM research_tag_suggestions rts
JOIN research_tags rt ON rts.tag_id = rt.id
WHERE rts.status = 'pending'
GROUP BY rt.id, rt.name, rt.slug, rt.theme_id
ORDER BY pending_count DESC;

-- ============================================
-- Pending Items by Moment View (with context)
-- ============================================

CREATE VIEW research_pending_by_moment AS
SELECT
    rm.id as moment_id,
    rm.call_id,
    rc.account_name,
    rc.contact_name,
    rm.transcript_excerpt,
    rm.speaker,
    rm.speaker_company,
    rm.timestamp_label,
    COUNT(*) as suggestion_count,
    AVG(rts.confidence) as avg_confidence,
    ARRAY_AGG(
        jsonb_build_object(
            'suggestion_id', rts.id,
            'tag_id', rt.id,
            'tag_slug', rt.slug,
            'tag_name', rt.name,
            'confidence', rts.confidence,
            'reasoning', rts.reasoning
        ) ORDER BY rts.confidence DESC
    ) as suggestions
FROM research_tag_suggestions rts
JOIN research_moments rm ON rts.moment_id = rm.id
JOIN research_calls rc ON rm.call_id = rc.id
JOIN research_tags rt ON rts.tag_id = rt.id
WHERE rts.status = 'pending'
GROUP BY rm.id, rm.call_id, rc.account_name, rc.contact_name,
         rm.transcript_excerpt, rm.speaker, rm.speaker_company, rm.timestamp_label
ORDER BY avg_confidence DESC;

-- ============================================
-- Helper Function: Approve Tag Suggestion
-- ============================================

CREATE OR REPLACE FUNCTION approve_tag_suggestion(
    p_suggestion_id UUID,
    p_reviewer TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_moment_id UUID;
    v_tag_id UUID;
    v_confidence FLOAT;
BEGIN
    -- Get suggestion details
    SELECT moment_id, tag_id, confidence INTO v_moment_id, v_tag_id, v_confidence
    FROM research_tag_suggestions
    WHERE id = p_suggestion_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Insert into moment_tags (or update if exists)
    INSERT INTO research_moment_tags (moment_id, tag_id, source, confidence, is_approved)
    VALUES (v_moment_id, v_tag_id, 'system', v_confidence, true)
    ON CONFLICT (moment_id, tag_id) DO UPDATE
    SET source = 'system',
        confidence = EXCLUDED.confidence,
        is_approved = true;
    
    -- Mark suggestion as approved
    UPDATE research_tag_suggestions
    SET status = 'approved',
        reviewed_by = p_reviewer,
        reviewed_at = NOW()
    WHERE id = p_suggestion_id;
    
    RETURN TRUE;
END;
$$;

-- ============================================
-- Helper Function: Reject Tag Suggestion
-- ============================================

CREATE OR REPLACE FUNCTION reject_tag_suggestion(
    p_suggestion_id UUID,
    p_reviewer TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE research_tag_suggestions
    SET status = 'rejected',
        reviewed_by = p_reviewer,
        reviewed_at = NOW()
    WHERE id = p_suggestion_id AND status = 'pending';
    
    RETURN FOUND;
END;
$$;

-- ============================================
-- Helper Function: Bulk Approve High Confidence
-- ============================================

CREATE OR REPLACE FUNCTION bulk_approve_suggestions(
    p_min_confidence FLOAT DEFAULT 0.85,
    p_tag_ids UUID[] DEFAULT NULL,
    p_reviewer TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
    v_suggestion RECORD;
BEGIN
    FOR v_suggestion IN
        SELECT id
        FROM research_tag_suggestions
        WHERE status = 'pending'
          AND confidence >= p_min_confidence
          AND (p_tag_ids IS NULL OR tag_id = ANY(p_tag_ids))
    LOOP
        IF approve_tag_suggestion(v_suggestion.id, p_reviewer) THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- ============================================
-- Helper Function: Bulk Reject Low Confidence
-- ============================================

CREATE OR REPLACE FUNCTION bulk_reject_suggestions(
    p_max_confidence FLOAT DEFAULT 0.5,
    p_tag_ids UUID[] DEFAULT NULL,
    p_reviewer TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE research_tag_suggestions
    SET status = 'rejected',
        reviewed_by = p_reviewer,
        reviewed_at = NOW()
    WHERE status = 'pending'
      AND confidence <= p_max_confidence
      AND (p_tag_ids IS NULL OR tag_id = ANY(p_tag_ids));
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
