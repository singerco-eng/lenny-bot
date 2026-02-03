-- ============================================
-- LENNY BOT - Research Calls Schema
-- Migration 032
-- ============================================
-- Research Calls + Moments for Payments Research Phase 1
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Research Themes
-- ============================================

CREATE TABLE research_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    total_mrr DECIMAL(12,2),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Research Tags
-- ============================================

CREATE TABLE research_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    question TEXT,
    theme_id UUID REFERENCES research_themes(id),
    source TEXT NOT NULL DEFAULT 'provided',
    confidence FLOAT,
    sort_order INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_tags_theme ON research_tags(theme_id);

-- ============================================
-- Research Calls
-- ============================================

CREATE TABLE research_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- From CSV
    account_name TEXT NOT NULL,
    account_number TEXT,
    contact_name TEXT,
    contact_email TEXT,
    user_role TEXT,
    interview_date DATE,
    mrr DECIMAL(12,2),
    active_users INTEGER,
    recording_link TEXT,
    -- Integration flags
    uses_accupay BOOLEAN DEFAULT false,
    uses_qb_desktop BOOLEAN DEFAULT false,
    uses_qb_online BOOLEAN DEFAULT false,
    uses_sage BOOLEAN DEFAULT false,
    uses_manual BOOLEAN DEFAULT false,
    -- Engagement flags
    is_beta_test BOOLEAN DEFAULT false,
    is_mid_dev_interview BOOLEAN DEFAULT false,
    -- Interview metadata
    interviewer TEXT,
    no_show BOOLEAN DEFAULT false,
    -- Content
    theme TEXT,
    csv_comment TEXT,
    transcript TEXT,
    transcript_file TEXT,
    -- Metadata
    product_area_id UUID REFERENCES product_areas(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_calls_account ON research_calls(account_name);
CREATE INDEX IF NOT EXISTS idx_research_calls_date ON research_calls(interview_date);
CREATE INDEX IF NOT EXISTS idx_research_calls_theme ON research_calls(theme);

-- ============================================
-- Research Moments
-- ============================================

CREATE TABLE research_moments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES research_calls(id) ON DELETE CASCADE,
    transcript_excerpt TEXT NOT NULL,
    excerpt_start_char INTEGER,
    excerpt_end_char INTEGER,
    speaker TEXT,
    speaker_company TEXT,
    timestamp_label TEXT,
    context TEXT,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_moments_call ON research_moments(call_id);
CREATE INDEX IF NOT EXISTS idx_research_moments_embedding
ON research_moments
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);

-- ============================================
-- Research Moment Tags
-- ============================================

CREATE TABLE research_moment_tags (
    moment_id UUID REFERENCES research_moments(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES research_tags(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'user',
    confidence FLOAT,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (moment_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_research_moment_tags_tag ON research_moment_tags(tag_id);

-- ============================================
-- Search Function
-- ============================================

CREATE OR REPLACE FUNCTION search_research_moments(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    filter_tags text[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    call_id UUID,
    account_name TEXT,
    contact_name TEXT,
    transcript_excerpt TEXT,
    speaker TEXT,
    speaker_company TEXT,
    timestamp_label TEXT,
    similarity float,
    tags text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rm.id,
        rm.call_id,
        rc.account_name,
        rc.contact_name,
        rm.transcript_excerpt,
        rm.speaker,
        rm.speaker_company,
        rm.timestamp_label,
        1 - (rm.embedding <=> query_embedding) as similarity,
        ARRAY_AGG(rt.name) as tags
    FROM research_moments rm
    JOIN research_calls rc ON rm.call_id = rc.id
    LEFT JOIN research_moment_tags rmt ON rm.id = rmt.moment_id
    LEFT JOIN research_tags rt ON rmt.tag_id = rt.id
    WHERE rm.embedding IS NOT NULL
      AND 1 - (rm.embedding <=> query_embedding) > match_threshold
      AND (filter_tags IS NULL OR rt.slug = ANY(filter_tags))
    GROUP BY rm.id, rc.account_name, rc.contact_name
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- ============================================
-- Seed Data
-- ============================================

INSERT INTO research_themes (name, description, total_mrr, sort_order) VALUES
('neg (-) and pos (+) entries', 'Flexibility to handle credits, refunds, journal entries', 182798.00, 1),
('Automatically add expenses', 'Auto-create job payment entries from payroll/commissions', 71653.00, 2),
('More ways to view info on page', 'Data entry speed, navigation, filtering improvements', 40335.00, 3),
('Add more information to each entry', 'Document attachments, trade tracking for profitability', 31520.00, 4),
('Link payments to invoices', 'Split payments, auto-link, create invoices from payments', 17285.00, 5);

INSERT INTO research_tags (slug, name, question, sort_order) VALUES
('vendors', 'Vendors', 'Do you use the Vendor List?', 1),
('account-type', 'Account Type', 'Do you use Account Types?', 2),
('company-expenses', 'Company Expenses', 'Do you have any Company Expenses?', 3),
('receivables', 'Receivables', 'Using Receivables', 4),
('payables', 'Payables', 'Using Payables', 5),
('additional-expenses', 'Additional Expenses', 'Using Additional Expenses', 6),
('receivables-payables-terminology', 'Receivables & Payables', 'Do you like the terminology', 7),
('add-button', 'Add Button', 'Instead of 3 dot menu', 8),
('payment-method', 'Payment Method', 'Separating Payment Method', 9),
('link-invoice', 'Link Invoice', 'Would you like to Link Payments to Invoices from this page?', 10),
('check-number', 'Check Number', 'Would you like to see the Check number on the grid?', 11),
('extra-notes', 'Extra Notes Field', 'Would you use the Notes field?', 12),
('upload-documents', 'Upload Documents', 'Would you use the Upload of additional documents?', 13),
('split', 'Split', 'Would you use the Split?', 14),
('create-invoice', 'Create Invoice', 'Would you like to create an invoice from this page?', 15),
('memorize', 'Memorize', 'Would you find Memorize a transaction useful?', 16),
('trades', 'Trades', 'Do you want to attach a trade to your payables?', 17),
('paying-info-fields', 'Fields for Paying Info', 'Do you want to record when you paid an expense?', 18),
('parent-pay', 'Parent Pay', 'Do you need parent/child relationship in Payables?', 19),
('ap-combo', 'AP Combo', 'Combine Receivables & Payables with Payment Processing?', 20),
('ap-no-invoice-downpayment', 'AP-dash no Inv down', 'Users who don''t create invoice before downpayment?', 21),
('sales-view', 'Sales view', 'Allow Sales Reps to edit the page?', 22),
('accounting-software', 'Acct (Software) used', 'What accounting package do you use?', 23),
('transaction-types', 'Transaction Types', 'Label individual transactions in some way?', 24);
