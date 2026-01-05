import { createClient, SupabaseClient } from '@supabase/supabase-js'

// These will be loaded from environment variables in production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if env vars are configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Create a mock query builder for when Supabase is not configured
const createMockQueryBuilder = () => {
  const mockError = { message: 'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to admin/.env' }
  const mockResult = { data: null, error: mockError }
  const mockPromise = Promise.resolve(mockResult)
  
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    single: () => mockPromise,
    then: (resolve: any) => mockPromise.then(resolve),
  }
  return builder
}

// Create client only if configured, otherwise use a mock that throws helpful errors
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from: () => createMockQueryBuilder(),
    } as unknown as SupabaseClient

// Database types
export interface ProductArea {
  id: string
  name: string
  description?: string
}

export interface AppPage {
  id: string
  url_pattern: string
  url?: string
  title?: string
  ai_description?: string
  screenshot_path?: string
  kb_context_used?: string[]
  product_area_id?: string
  product_area?: ProductArea
  crawl_status?: string
  last_crawled_at?: string
}

export interface PageComponent {
  id: string
  page_id: string
  component_name: string
  component_type: string
  ai_description?: string
  screenshot_path?: string
  kb_context_used?: string[]
  priority?: string
}

export interface PageAction {
  id: string
  page_id: string
  element_text: string
  display_label?: string  // Human-friendly label for display (if set, use instead of element_text)
  element_type?: string
  action_classification?: string
  description?: string
  kb_context_used?: string[]
  priority?: string
  explored?: boolean
  navigates_to_page_id?: string
  opens_component_id?: string
  parent_component_id?: string
  nav_scope?: 'app_global' | 'job_global' | 'contact_global' | 'page_specific'
  navigates_to_page?: AppPage
  opens_component?: PageComponent
}

