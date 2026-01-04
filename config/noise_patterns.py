"""
Noise Patterns for Content Filtering

Defines patterns and elements to filter out during content processing
to ensure clean, valuable data for the knowledge base.
"""

# CSS selectors for elements to remove from KB pages
KB_NOISE_SELECTORS = [
    # Navigation
    "header",
    "nav",
    ".navbar",
    ".navigation",
    ".breadcrumbs",
    ".breadcrumb",
    
    # Footer
    "footer",
    ".footer",
    
    # Sidebars
    ".sidebar",
    "aside",
    ".side-navigation",
    
    # Zendesk-specific (AccuLynx uses Zendesk for KB)
    ".article-votes",
    ".article-subscribe",
    ".article-share",
    ".article-relatives",
    ".article-footer",
    ".search-form",
    ".search-container",
    ".sub-nav",
    ".section-tree",
    
    # Promotional
    ".promotion",
    ".banner",
    ".cta",
    ".upgrade-prompt",
    
    # Interactive elements that aren't content
    ".cookie-banner",
    ".cookie-notice",
    ".modal",
    ".popup",
    
    # Social
    ".social-share",
    ".social-links",
]

# Text patterns to remove (regex patterns)
KB_NOISE_TEXT_PATTERNS = [
    r"Was this article helpful\?.*",
    r"\d+ out of \d+ found this helpful",
    r"Have more questions\? Submit a request",
    r"Recently viewed articles",
    r"Related articles",
    r"©.*AccuLynx.*",
    r"All rights reserved",
    r"Privacy Policy",
    r"Terms of Service",
]

# Selectors for elements to KEEP (whitelist approach for articles)
KB_CONTENT_SELECTORS = [
    ".article-body",
    ".article-content",
    ".article",
    "article",
    ".content-body",
    "main",
]

# For screenshot descriptions, these elements should be highlighted/described
APP_IMPORTANT_ELEMENTS = [
    # Forms
    "form",
    "input",
    "select",
    "textarea",
    "button",
    
    # Data displays
    "table",
    ".data-grid",
    ".list",
    
    # Navigation
    ".menu",
    ".tabs",
    ".nav-tabs",
    
    # Actions
    ".action-button",
    ".toolbar",
    ".actions",
]

# Things to ignore in app screenshots
APP_NOISE_ELEMENTS = [
    # User-specific data (privacy)
    ".user-avatar",
    ".user-name",
    
    # Timestamps that don't matter
    ".timestamp",
    ".last-updated",
    
    # Notifications (ephemeral)
    ".toast",
    ".notification",
    ".alert-dismissible",
]

# Minimum content length thresholds
MIN_ARTICLE_LENGTH = 100  # characters
MIN_CHUNK_LENGTH = 50  # characters
MAX_CHUNK_LENGTH = 2000  # characters (for embedding efficiency)

# Content quality indicators
QUALITY_INDICATORS = {
    "high": [
        "step-by-step",
        "how to",
        "guide",
        "tutorial",
        "example",
        "tip",
        "note:",
        "important:",
    ],
    "low": [
        "coming soon",
        "under construction",
        "placeholder",
        "todo",
        "tbd",
    ]
}


def should_skip_url(url: str) -> bool:
    """Check if a URL should be skipped during scraping."""
    skip_patterns = [
        "/search",
        "/login",
        "/logout",
        "/signup",
        "/register",
        "/password",
        "/oauth",
        "/api/",
        "/subscription",  # Zendesk subscription pages
        "/followers",     # Zendesk follower pages
        "/community",     # Community forums
        "/requests",      # Support ticket requests
        ".pdf",
        ".zip",
        ".xlsx",
    ]
    return any(pattern in url.lower() for pattern in skip_patterns)


def estimate_content_quality(text: str) -> float:
    """
    Estimate content quality on a 0-1 scale.
    Used for prioritizing chunks during retrieval.
    """
    if len(text) < MIN_ARTICLE_LENGTH:
        return 0.1
    
    text_lower = text.lower()
    score = 0.5  # base score
    
    # Check for quality indicators
    for indicator in QUALITY_INDICATORS["high"]:
        if indicator in text_lower:
            score += 0.1
    
    for indicator in QUALITY_INDICATORS["low"]:
        if indicator in text_lower:
            score -= 0.2
    
    # Bonus for structured content
    if any(marker in text for marker in ["1.", "2.", "•", "-", "*"]):
        score += 0.1
    
    # Bonus for having headers
    if any(marker in text for marker in ["#", "##", "###"]):
        score += 0.1
    
    return max(0.0, min(1.0, score))

