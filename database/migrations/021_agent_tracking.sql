-- ============================================
-- Migration 021: Agent Tracking & Session Reports
-- ============================================
-- Adds fields to track which AI agent ran a session,
-- their post-run reports, and handoff information.
--
-- This enables multi-agent workflows where agents can
-- pick up each other's work with full context.

-- ============================================
-- Add agent tracking to crawl_sessions
-- ============================================

-- Which AI model ran this session
ALTER TABLE crawl_sessions 
ADD COLUMN IF NOT EXISTS agent_model TEXT;
-- e.g., 'claude-opus-4-20250514', 'gpt-4o', 'claude-3-sonnet'

-- Structured session report for handoff
ALTER TABLE crawl_sessions 
ADD COLUMN IF NOT EXISTS session_report TEXT;
-- Summary of what was accomplished

-- What should the next agent work on
ALTER TABLE crawl_sessions 
ADD COLUMN IF NOT EXISTS next_steps TEXT;
-- Specific recommendations for continuation

-- Any blockers or issues encountered
ALTER TABLE crawl_sessions 
ADD COLUMN IF NOT EXISTS blockers TEXT;
-- Things that prevented progress

-- Last checkpoint (for recovery)
ALTER TABLE crawl_sessions 
ADD COLUMN IF NOT EXISTS last_checkpoint TEXT;
-- Where were we when session ended

-- Checkpoint timestamp
ALTER TABLE crawl_sessions 
ADD COLUMN IF NOT EXISTS checkpoint_at TIMESTAMPTZ;

COMMENT ON COLUMN crawl_sessions.agent_model IS 'AI model identifier (e.g., claude-opus-4-20250514, gpt-4o)';
COMMENT ON COLUMN crawl_sessions.session_report IS 'Summary of what was accomplished during this session';
COMMENT ON COLUMN crawl_sessions.next_steps IS 'Recommendations for the next agent to continue work';
COMMENT ON COLUMN crawl_sessions.blockers IS 'Issues or blockers encountered during the session';
COMMENT ON COLUMN crawl_sessions.last_checkpoint IS 'Last checkpoint description for recovery';
COMMENT ON COLUMN crawl_sessions.checkpoint_at IS 'When the last checkpoint was saved';

-- ============================================
-- Add agent tracking to page_actions
-- ============================================
-- Track which agent classified/explored each action

ALTER TABLE page_actions
ADD COLUMN IF NOT EXISTS classified_by TEXT;
-- e.g., 'claude-opus-4-20250514'

ALTER TABLE page_actions
ADD COLUMN IF NOT EXISTS explored_by TEXT;
-- Which agent explored this action

ALTER TABLE page_actions
ADD COLUMN IF NOT EXISTS explored_at TIMESTAMPTZ;
-- When it was explored

COMMENT ON COLUMN page_actions.classified_by IS 'Which AI model classified this action';
COMMENT ON COLUMN page_actions.explored_by IS 'Which AI model explored this action';
COMMENT ON COLUMN page_actions.explored_at IS 'When this action was explored';

-- ============================================
-- Agent Activity Log
-- ============================================
-- Captures agent decisions and reasoning for learning

CREATE TABLE IF NOT EXISTS agent_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session context
    session_id UUID REFERENCES crawl_sessions(id) ON DELETE SET NULL,
    agent_model TEXT NOT NULL,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Activity details
    activity_type TEXT NOT NULL,
    -- 'classify', 'explore', 'skip', 'save', 'flag', 'checkpoint', 'error'
    
    target_type TEXT,
    -- 'page', 'component', 'action', 'element'
    
    target_id UUID,
    -- ID of the target entity
    
    target_ref TEXT,
    -- Human-readable reference (e.g., url_pattern, element_text)
    
    -- Reasoning
    reasoning TEXT,
    -- Why the agent made this decision
    
    -- Outcome
    outcome TEXT,
    -- What happened as a result
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_agent_log_session ON agent_activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_log_model ON agent_activity_log(agent_model);
CREATE INDEX IF NOT EXISTS idx_agent_log_type ON agent_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_agent_log_date ON agent_activity_log(created_at DESC);

COMMENT ON TABLE agent_activity_log IS 'Log of AI agent decisions and activities for learning and debugging';

-- ============================================
-- View: Session Handoff Summary
-- ============================================
-- Quick view for agents picking up previous work

CREATE OR REPLACE VIEW session_handoff AS
SELECT 
    cs.id,
    cs.agent_model,
    cs.started_at,
    cs.ended_at,
    cs.status,
    cs.target_product_area,
    cs.pages_crawled,
    cs.components_found,
    cs.actions_discovered,
    cs.session_report,
    cs.next_steps,
    cs.blockers,
    cs.last_checkpoint,
    cs.checkpoint_at
FROM crawl_sessions cs
ORDER BY cs.started_at DESC
LIMIT 10;

COMMENT ON VIEW session_handoff IS 'Recent session summaries for agent handoff';

-- ============================================
-- View: Agent Performance
-- ============================================
-- Track agent effectiveness over time

CREATE OR REPLACE VIEW agent_performance AS
SELECT 
    agent_model,
    COUNT(*) as total_sessions,
    SUM(pages_crawled) as total_pages,
    SUM(components_found) as total_components,
    SUM(actions_discovered) as total_actions,
    AVG(pages_crawled) as avg_pages_per_session,
    MIN(started_at) as first_session,
    MAX(started_at) as last_session
FROM crawl_sessions
WHERE agent_model IS NOT NULL
GROUP BY agent_model
ORDER BY total_sessions DESC;

COMMENT ON VIEW agent_performance IS 'Aggregate performance metrics by AI model';







