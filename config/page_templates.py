"""
Page Template Configuration

Defines which URL patterns represent the SAME UI template.
These pages only need ONE screenshot - additional instances are skipped.

This file can be updated as we learn more about AccuLynx's structure.
"""

# ============================================
# TEMPLATE PATTERNS
# ============================================
# These patterns represent pages where the UI is identical,
# only the data changes. We capture ONE instance of each.
#
# PHILOSOPHY:
# - Sitemap = What SCREENS exist (UI templates)
# - Feature knowledge = What can users DO (comes from KB + AI)
# - We don't need to crawl every custom report/template
# - The agent learns "reports can be customized" from KB, not from 500 report URLs

TEMPLATE_PATTERNS = {
    # Reports - capture ONE of each UI type, not every report instance
    "report_viewer": {
        "patterns": [
            r"/reports/[0-9a-f-]{8,}",  # /reports/uuid (standard reports)
        ],
        "capture_one": True,
        "reason": "Report viewer UI - captures work, only data differs",
        "agent_note": "Users can create custom reports. See KB for report types.",
    },
    
    "report_dashboard": {
        "patterns": [
            r"/reports/dashboards/[0-9a-f-]+",  # Dashboard-style reports
        ],
        "capture_one": True,
        "reason": "Report dashboard UI - same layout, different widgets",
        "agent_note": "Dashboard reports are customizable layouts.",
    },
    
    # Template Manager - same editor UI, different templates
    # NOTE: AccuLynx uses /templatemanager (no hyphen, lowercase)
    "template_editor": {
        "patterns": [
            r"/templatemanager/edit/[0-9a-f-]+",  # Edit template
            r"/templatemanager/print/[0-9a-f-]+",  # Print template
            r"/templatemanager/preview/[0-9a-f-]+",  # Preview template
            r"/templatemanager/[0-9a-f-]+",
            r"/templates/[0-9a-f-]+",
            r"/templates/\d+",
            r"/template-manager/[0-9a-f-]+",
            r"/template-manager/\d+",
            r"/template/[0-9a-f-]+",
            r"/template/\d+",
        ],
        "capture_one": True,
        "reason": "Template editor UI is identical",
        "agent_note": "Users can create custom document templates.",
    },
    
    # Task Manager - individual task views
    "task_detail": {
        "patterns": [
            r"/task-manager/[0-9a-f-]+",
            r"/task/[0-9a-f-]+",
        ],
        "capture_one": True,
        "reason": "Task detail view is identical",
    },
    
    # Automation - individual automation views
    "automation_detail": {
        "patterns": [
            r"/automation/[0-9a-f-]+",
        ],
        "capture_one": True,
        "reason": "Automation detail view is identical",
    },
    
    "company_library": {
        "patterns": [
            r"/CompanyLibraryManager.*",
            r"/companylibrary.*",
            r"/library-manager.*",
            r"/company-library.*",
        ],
        "capture_one": True,
        "reason": "Library manager UI - same interface for different content",
        "agent_note": "Company library stores reusable content blocks.",
    },
    
    # Document/File viewers - same viewer UI, different documents
    "document_viewer": {
        "patterns": [
            r"/documents/[0-9a-f-]+",
            r"/documents/\d+",
            r"/document/[0-9a-f-]+",
            r"/files/[0-9a-f-]+",
            r"/file/[0-9a-f-]+",
            r"/preview/[0-9a-f-]+",
        ],
        "capture_one": True,
        "reason": "Document viewer UI is identical",
    },
    
    # Photo/Image galleries - same gallery UI
    "photo_gallery": {
        "patterns": [
            r"/photos/[0-9a-f-]+",
            r"/photo/[0-9a-f-]+",
            r"/images/[0-9a-f-]+",
            r"/gallery/[0-9a-f-]+",
        ],
        "capture_one": True,
        "reason": "Photo gallery UI is identical",
    },
    
    # Job detail pages - ONLY the base job page, not sub-pages
    # We want ONE /jobs/:id but ALSO capture /jobs/:id/communications, /jobs/:id/orders, etc.
    "jobs": {
        "patterns": [
            r"/jobs/[0-9a-f-]{8,}$",  # /jobs/uuid (anchored - exact match only)
            r"/jobs/\d+$",  # /jobs/123 (anchored)
        ],
        "capture_one": True,
        "reason": "Job detail UI is identical, only job data differs",
    },
    
    # Job sub-pages - capture one of each TYPE
    "job_communications": {
        "patterns": [r"/jobs/[0-9a-f-]+/communications$", r"/jobs/\d+/communications$"],
        "capture_one": True,
        "reason": "Job communications UI is identical",
    },
    "job_estimates": {
        "patterns": [r"/jobs/[0-9a-f-]+/estimates$", r"/jobs/\d+/estimates$"],
        "capture_one": True,
        "reason": "Job estimates UI is identical",
    },
    "job_orders": {
        "patterns": [r"/jobs/[0-9a-f-]+/orders$", r"/jobs/\d+/orders$"],
        "capture_one": True,
        "reason": "Job orders UI is identical",
    },
    "job_documents": {
        "patterns": [r"/jobs/[0-9a-f-]+/documents$", r"/jobs/\d+/documents$"],
        "capture_one": True,
        "reason": "Job documents UI is identical",
    },
    "job_photos": {
        "patterns": [r"/jobs/[0-9a-f-]+/photos$", r"/jobs/\d+/photos$"],
        "capture_one": True,
        "reason": "Job photos UI is identical",
    },
    "job_activity": {
        "patterns": [r"/jobs/[0-9a-f-]+/activity$", r"/jobs/\d+/activity$"],
        "capture_one": True,
        "reason": "Job activity UI is identical",
    },
    "job_history": {
        "patterns": [r"/jobs/[0-9a-f-]+/history$", r"/jobs/\d+/history$"],
        "capture_one": True,
        "reason": "Job history UI is identical",
    },
    "job_files": {
        "patterns": [r"/jobs/[0-9a-f-]+/files$", r"/jobs/\d+/files$"],
        "capture_one": True,
        "reason": "Job files UI is identical",
    },
    "job_contracts": {
        "patterns": [r"/jobs/[0-9a-f-]+/contracts$", r"/jobs/\d+/contracts$"],
        "capture_one": True,
        "reason": "Job contracts UI is identical",
    },
    "job_worksheets": {
        "patterns": [r"/jobs/[0-9a-f-]+/worksheets$", r"/jobs/\d+/worksheets$"],
        "capture_one": True,
        "reason": "Job worksheets UI is identical",
    },
    "job_supplements": {
        "patterns": [r"/jobs/[0-9a-f-]+/supplements$", r"/jobs/\d+/supplements$"],
        "capture_one": True,
        "reason": "Job supplements UI is identical",
    },
    "job_invoices": {
        "patterns": [r"/jobs/[0-9a-f-]+/invoices$", r"/jobs/\d+/invoices$"],
        "capture_one": True,
        "reason": "Job invoices UI is identical",
    },
    "job_production": {
        "patterns": [r"/jobs/[0-9a-f-]+/production$", r"/jobs/\d+/production$"],
        "capture_one": True,
        "reason": "Job production UI is identical",
    },
    "job_financials": {
        "patterns": [r"/jobs/[0-9a-f-]+/financials$", r"/jobs/\d+/financials$"],
        "capture_one": True,
        "reason": "Job financials UI is identical",
    },
    "job_notes": {
        "patterns": [r"/jobs/[0-9a-f-]+/notes$", r"/jobs/\d+/notes$"],
        "capture_one": True,
        "reason": "Job notes UI is identical",
    },
    "job_tasks": {
        "patterns": [r"/jobs/[0-9a-f-]+/tasks$", r"/jobs/\d+/tasks$"],
        "capture_one": True,
        "reason": "Job tasks UI is identical",
    },
    "job_appointments": {
        "patterns": [r"/jobs/[0-9a-f-]+/appointments$", r"/jobs/\d+/appointments$"],
        "capture_one": True,
        "reason": "Job appointments UI is identical",
    },
    "job_overview": {
        "patterns": [r"/jobs/[0-9a-f-]+/overview$", r"/jobs/\d+/overview$"],
        "capture_one": True,
        "reason": "Job overview UI is identical",
    },
    
    # Lead detail pages
    "leads": {
        "patterns": [
            r"/leads/[0-9a-f-]{8,}$",
            r"/leads/\d+$",
        ],
        "capture_one": True,
        "reason": "Lead detail UI is identical",
    },
    
    # Contact detail pages - only the base contact page
    "contacts": {
        "patterns": [
            r"/contacts/[0-9a-f-]{8,}$",  # /contacts/:uuid only
            r"/contacts/[0-9a-f-]+/overview$",  # /contacts/:uuid/overview
            r"/contacts/\d+$",
        ],
        "capture_one": True,
        "reason": "Contact detail UI is identical",
    },
    
    # Estimate detail pages
    "estimates": {
        "patterns": [
            r"/estimates/[0-9a-f-]{8,}$",
            r"/estimates/\d+$",
        ],
        "capture_one": True,
        "reason": "Estimate detail UI is identical",
    },
    
    # Invoice detail pages
    "invoices": {
        "patterns": [
            r"/invoices/[0-9a-f-]{8,}$",
            r"/invoices/\d+$",
        ],
        "capture_one": True,
        "reason": "Invoice detail UI is identical",
    },
}

# ============================================
# UNIQUE PAGES (Always capture)
# ============================================
# These patterns should ALWAYS be captured, even if they have IDs
# (because each one is genuinely different)

UNIQUE_PATTERNS = [
    # Settings pages - each settings section is different
    r"/settings/[^/]+",
    r"/accountsettings/[^/]+",
    
    # Report glossary - different from report viewer
    r"/reports/glossary",
    
    # New/Create forms - always capture
    r"/[^/]+/new",
    r"/[^/]+/create",
    
    # List pages (no ID) - always capture
    r"^/[^/]+$",  # Single segment like /jobs, /leads
]

# ============================================
# GENERIC ID PATTERNS (Catch-all)
# ============================================
# Any URL with an ID-like segment that doesn't match a specific template
# is treated as a generic detail page - only capture ONE per base path.

GENERIC_ID_REGEX = [
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",  # UUID
    r"[0-9a-f]{20,}",  # Long hex ID
    r"\d{5,}",  # 5+ digit number
]

def has_id_segment(path: str) -> bool:
    """Check if path contains an ID-like segment."""
    for pattern in GENERIC_ID_REGEX:
        if re.search(pattern, path, re.IGNORECASE):
            return True
    return False

def get_path_without_id(path: str) -> str:
    """Replace ID segments with :id placeholder."""
    result = path
    for pattern in GENERIC_ID_REGEX:
        result = re.sub(pattern, ":id", result, flags=re.IGNORECASE)
    return result

# ============================================
# HELPER FUNCTIONS
# ============================================

import re
from typing import Optional, Tuple


def get_template_key(path: str) -> Optional[str]:
    """
    Check if a path matches a known template pattern.
    
    Returns the template key (e.g., "reports", "jobs") if matched,
    or None if this is a unique page.
    """
    # First check if it's a known unique pattern
    for unique_pattern in UNIQUE_PATTERNS:
        if re.match(unique_pattern, path):
            return None  # Don't treat as template
    
    # Check specific template patterns
    for key, config in TEMPLATE_PATTERNS.items():
        if config.get("capture_one", False):
            for pattern in config["patterns"]:
                if re.match(pattern, path):
                    return key
    
    # Fallback: If path has an ID-like segment, treat as generic template
    # This catches things like /TemplateManager/uuid that we haven't explicitly configured
    if has_id_segment(path):
        # Use the base path as the template key
        base_path = get_path_without_id(path)
        return f"generic:{base_path}"
    
    return None


def get_template_base_path(path: str) -> Tuple[str, bool]:
    """
    Get the base path for template deduplication.
    
    Returns:
        (base_path, is_template)
        
    Example:
        /reports/abc-123 → ("/reports/:template", True)
        /settings/users → ("/settings/users", False)
    """
    template_key = get_template_key(path)
    
    if template_key:
        # This is a template page - return generic path
        config = TEMPLATE_PATTERNS[template_key]
        return f"/{template_key}/:template", True
    
    return path, False


def should_skip_template_instance(path: str, captured_templates: set) -> Tuple[bool, Optional[str]]:
    """
    Check if we should skip this page because we already have a template instance.
    
    Args:
        path: URL path to check
        captured_templates: Set of template keys we've already captured
        
    Returns:
        (should_skip, reason)
    """
    template_key = get_template_key(path)
    
    if template_key and template_key in captured_templates:
        # Handle generic template keys (dynamically generated)
        if template_key.startswith("generic:"):
            return True, f"Same UI template: {template_key.replace('generic:', '')}"
        
        # Handle predefined template patterns
        if template_key in TEMPLATE_PATTERNS:
            config = TEMPLATE_PATTERNS[template_key]
            return True, config.get("reason", "Duplicate template UI")
        
        # Fallback for any other captured template
        return True, "Duplicate template UI"
    
    return False, None


# ============================================
# FEATURE INVENTORY
# ============================================
# This captures WHAT CAPABILITIES exist, separate from screenshots.
# Populated from KB analysis + manual observation.
# The agent uses this to understand "what can users do" without
# needing to crawl every instance.

FEATURE_INVENTORY = {
    "reports": {
        "description": "AccuLynx reporting system",
        "capabilities": [
            "View pre-built system reports",
            "Create custom reports with report builder",
            "Create dashboard-style report layouts",
            "Schedule reports for email delivery",
            "Export reports to various formats",
        ],
        "user_customizable": True,
        "kb_sections": ["Reports & Analytics"],
    },
    "templates": {
        "description": "Document template system",
        "capabilities": [
            "Create custom document templates",
            "Use merge fields for dynamic content",
            "Manage company library of reusable blocks",
            "Template categories: Estimates, Contracts, Emails, etc.",
        ],
        "user_customizable": True,
        "kb_sections": ["Settings & Admin"],
    },
    # Add more as we discover them...
}

# ============================================
# FOR ADDING NEW PATTERNS
# ============================================
# When you discover a new "same UI" pattern, add it here:
#
# "new_pattern_name": {
#     "patterns": [r"/path/pattern/[0-9a-f-]+"],
#     "capture_one": True,
#     "reason": "Why this is the same UI",
#     "agent_note": "Context for the agent about this feature",
# },

