-- ============================================================
-- Migration 021: Cleanup Legacy Tables
-- ============================================================
-- 
-- Removes/archives legacy tables from the Action Explorer approach
-- that are no longer needed for KB-guided crawling.
--
-- Created: December 24, 2024
-- ============================================================

-- ============================================================
-- ARCHIVE LEGACY TABLES (preserve data, rename)
-- ============================================================

-- ai_detected_forms (0 rows, from Action Explorer)
ALTER TABLE IF EXISTS ai_detected_forms RENAME TO _archived_ai_detected_forms;

-- embeddings (0 rows, old embedding approach - now use pgvector columns)
ALTER TABLE IF EXISTS embeddings RENAME TO _archived_embeddings;

-- explored_actions (0 rows, from Action Explorer)
ALTER TABLE IF EXISTS explored_actions RENAME TO _archived_explored_actions;

-- global_components (4 rows, from Action Explorer)
ALTER TABLE IF EXISTS global_components RENAME TO _archived_global_components;

-- ============================================================
-- DROP EMPTY/DUPLICATE TABLES
-- ============================================================

-- page_containers was created in migration 019 but will be replaced 
-- by page_components in migration 020. Drop it since it's empty.
DROP TABLE IF EXISTS page_containers;

-- ============================================================
-- SUMMARY
-- ============================================================
-- 
-- After this migration:
-- - 4 legacy tables archived (prefixed with _archived_)
-- - 1 duplicate table dropped (page_containers)
-- 
-- Total archived tables: 10 (6 from migration 019 + 4 from this migration)
-- 
-- These can all be dropped later once we're confident the new
-- KB-guided crawling approach is working well.
-- ============================================================







