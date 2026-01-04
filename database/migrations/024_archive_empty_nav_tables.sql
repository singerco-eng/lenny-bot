-- ============================================
-- Mark Empty Navigation Tables as Deprecated
-- ============================================
-- These tables were created for the Python crawler approach
-- but are not used in the AI Agent approach.
-- 
-- Note: _archived_global_navigation already exists with data
-- so we just add comments to mark the empty tables as deprecated.
-- ============================================

-- Mark global_navigation as deprecated (empty, not used in AI Agent approach)
COMMENT ON TABLE global_navigation IS 
'DEPRECATED: Was for Python crawler approach. Empty. Not used in AI Agent approach.';

-- Mark nav_items as deprecated (empty, not used in AI Agent approach)
COMMENT ON TABLE nav_items IS 
'DEPRECATED: Was for Python crawler approach. Empty. Not used in AI Agent approach.';

