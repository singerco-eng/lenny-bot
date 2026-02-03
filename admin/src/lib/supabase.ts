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
    gte: () => builder,
    lte: () => builder,
    ilike: () => builder,
    in: () => builder,
    contains: () => builder,
    order: () => builder,
    range: () => builder,
    limit: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    rpc: () => builder,
    execute: () => mockPromise,
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

export interface ResearchTheme {
  id: string
  name: string
  description?: string
  total_mrr?: number
  sort_order?: number
  created_at?: string
}

export interface ResearchTag {
  id: string
  slug: string
  name: string
  question?: string
  theme_id?: string
  theme?: ResearchTheme
  source?: string
  confidence?: number
  sort_order?: number
  is_approved?: boolean
  created_at?: string
}

export interface ResearchCall {
  id: string
  account_name: string
  account_number?: string
  contact_name?: string
  contact_email?: string
  user_role?: string
  interview_date?: string
  mrr?: number
  active_users?: number
  recording_link?: string
  uses_accupay?: boolean
  uses_qb_desktop?: boolean
  uses_qb_online?: boolean
  uses_sage?: boolean
  uses_manual?: boolean
  is_beta_test?: boolean
  is_mid_dev_interview?: boolean
  interviewer?: string
  no_show?: boolean
  theme?: string
  csv_comment?: string
  transcript?: string
  transcript_file?: string
  product_area_id?: string
  created_at?: string
  updated_at?: string
}

export interface ResearchMoment {
  id: string
  call_id: string
  transcript_excerpt: string
  excerpt_start_char?: number
  excerpt_end_char?: number
  speaker?: string
  speaker_company?: string
  timestamp_label?: string
  context?: string
  embedding?: number[]
  created_at?: string
  created_by?: string
  call?: ResearchCall
  tags?: ResearchTag[]
}

export interface ResearchMomentTag {
  moment_id: string
  tag_id: string
  source?: string
  confidence?: number
  is_approved?: boolean
  created_at?: string
  tag?: ResearchTag
}

export interface SynthesisRun {
  id: string
  run_type: string
  model_used: string
  input_summary?: Record<string, any>
  output_summary?: Record<string, any>
  tokens_used?: number
  cost_usd?: number
  started_at?: string
  completed_at?: string
  status: string
}

export interface ResearchTagSuggestion {
  id: string
  moment_id: string
  tag_id: string
  confidence: number
  reasoning?: string
  synthesis_run_id?: string
  status: string
  reviewed_by?: string
  reviewed_at?: string
  created_at?: string
  moment?: ResearchMoment
  tag?: ResearchTag
}

export interface ResearchReviewStats {
  pending_count: number
  approved_count: number
  rejected_count: number
  avg_pending_confidence?: number
  moments_needing_review: number
  oldest_pending?: string
  last_review_time?: string
}

export interface ResearchPendingByTag {
  tag_id: string
  tag_name: string
  tag_slug: string
  theme_id?: string
  pending_count: number
  avg_confidence: number
  min_confidence: number
  max_confidence: number
}

export interface PendingMomentSuggestion {
  suggestion_id: string
  tag_id: string
  tag_slug: string
  tag_name: string
  confidence: number
  reasoning?: string
}

export interface ResearchPendingByMoment {
  moment_id: string
  call_id: string
  account_name: string
  contact_name?: string
  transcript_excerpt: string
  speaker?: string
  speaker_company?: string
  timestamp_label?: string
  suggestion_count: number
  avg_confidence: number
  suggestions: PendingMomentSuggestion[]
}
