-- ============================================
-- Migration 005: Navigation Categories
-- ============================================
-- Separates the HEADER NAVIGATION from individual pages.
-- 
-- The header navigation is a persistent UI element that appears
-- on every page, containing:
-- - Main nav items (Jobs, Leads, Contacts, Calendar)
-- - Dropdown menus (Track, Tools, Reports, Production)
-- - User menu (Profile)
-- - Admin menu (Settings)
--
-- This migration adds:
-- 1. nav_category column to tag pages with their nav location
-- 2. navigation_items table to define the header menu structure
-- ============================================

-- Add navigation category to pages
ALTER TABLE app_pages 
ADD COLUMN IF NOT EXISTS nav_category TEXT;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_pages_nav_category ON app_pages(nav_category);

-- ============================================
-- NAVIGATION ITEMS - Header menu structure
-- ============================================
CREATE TABLE IF NOT EXISTS navigation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Menu item identification
    name TEXT NOT NULL,           -- Display name (e.g., "Jobs", "Track")
    slug TEXT NOT NULL UNIQUE,    -- URL-safe identifier
    icon TEXT,                    -- Emoji or icon class
    
    -- Menu structure
    parent_id UUID REFERENCES navigation_items(id),  -- For nested menus
    menu_type TEXT NOT NULL DEFAULT 'main',  -- main, dropdown, user_menu, admin_menu
    order_index INTEGER DEFAULT 0,
    
    -- Link behavior
    primary_path TEXT,            -- Main link path (e.g., "/jobs")
    is_dropdown BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Populate navigation items
-- ============================================
INSERT INTO navigation_items (name, slug, icon, menu_type, order_index, primary_path, is_dropdown, description) VALUES
-- Main navigation (always visible)
('Dashboard', 'dashboard', '🏠', 'main', 0, '/dashboard', FALSE, 'Main home page'),
('Jobs', 'jobs', '🔨', 'main', 1, '/jobs', FALSE, 'Job management'),
('Leads', 'leads', '🎯', 'main', 2, '/leads', FALSE, 'Lead management'),
('Contacts', 'contacts', '👥', 'main', 3, '/contacts', FALSE, 'Contact management'),
('Calendar', 'calendar', '📅', 'main', 4, '/calendar', FALSE, 'Calendar and scheduling'),

-- Dropdown menus
('Track', 'track', '📊', 'dropdown', 5, NULL, TRUE, 'Workflow tracking'),
('Reports', 'reports', '📈', 'dropdown', 6, '/reports', TRUE, 'Reports and analytics'),
('Tools', 'tools', '🔧', 'dropdown', 7, NULL, TRUE, 'Utility tools'),
('Production', 'production', '🏭', 'dropdown', 8, NULL, TRUE, 'Production management'),
('Market', 'market', '🛒', 'dropdown', 9, '/market/addons', FALSE, 'Marketplace'),

-- Other main items
('Tasks', 'tasks', '✅', 'main', 10, '/task-manager', FALSE, 'Task management'),
('Automation', 'automation', '⚡', 'main', 11, '/automation', FALSE, 'Workflow automation'),
('Photos', 'photos', '📷', 'main', 12, '/photos', FALSE, 'Photo activity'),

-- User menu (top-right)
('Profile', 'profile', '👤', 'user_menu', 100, '/profile/edit', FALSE, 'User profile'),

-- Admin menu
('Settings', 'settings', '⚙️', 'admin_menu', 101, '/accountsettings', FALSE, 'Company settings')

ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- View: Pages with navigation context
-- ============================================
CREATE OR REPLACE VIEW pages_with_nav AS
SELECT 
    p.id,
    p.path,
    p.title,
    p.page_type,
    p.nav_category,
    n.name as nav_name,
    n.icon as nav_icon,
    n.menu_type,
    p.screenshot_url
FROM app_pages p
LEFT JOIN navigation_items n ON p.nav_category = n.slug;












