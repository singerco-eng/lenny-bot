"""
AccuLynx Header Navigation Structure

Defines the actual navigation menu structure of AccuLynx.
This is used to organize pages into their proper navigation categories.

The header typically has:
- Main nav items (Jobs, Leads, Contacts, Calendar, etc.)
- Dropdowns (Track, Tools, Reports, etc.)
- User menu (Profile, Settings)
- Company menu (Account Settings)
"""

# Primary header navigation items
# Each item defines which URL paths belong under it
HEADER_NAVIGATION = {
    # Main Navigation (always visible in header)
    "Dashboard": {
        "icon": "🏠",
        "paths": ["/dashboard"],
        "description": "Main home page",
        "order": 0,
    },
    
    "Jobs": {
        "icon": "🔨",
        "paths": ["/jobs"],
        "path_patterns": [r"^/jobs(/|$)"],
        "description": "Job management",
        "order": 1,
    },
    
    "Leads": {
        "icon": "🎯",
        "paths": ["/leads", "/lead/new"],
        "path_patterns": [r"^/leads?(/|$)"],
        "description": "Lead management",
        "order": 2,
    },
    
    "Contacts": {
        "icon": "👥",
        "paths": ["/contacts", "/contacts/new"],
        "path_patterns": [r"^/contacts(/|$)"],
        "description": "Contact management",
        "order": 3,
    },
    
    "Calendar": {
        "icon": "📅",
        "paths": ["/calendar", "/workschedule"],
        "description": "Calendar and scheduling",
        "order": 4,
    },
    
    # Track dropdown menu
    "Track": {
        "icon": "📊",
        "is_dropdown": True,
        "paths": [],
        "path_patterns": [r"^/track(/|$)"],
        "children": [
            "/track/permits",
            "/track/commissions",
            "/track/pre-commissions", 
            "/track/invoices/open-invoices",
            "/track/invoices/overdue-invoices",
            "/track/paymentprocessing",
            "/track/paymentdisputes",
            "/track/worksheets",
            "/track/supplements",
            "/track/job-progress",
            "/track/submitted-jobs",
            "/track/submitted-orders",
            "/track/financing",
            "/track/mortgage-checks",
            "/track/measurements",
            "/track/signatures",
        ],
        "description": "Workflow tracking and monitoring",
        "order": 5,
    },
    
    # Reports dropdown
    "Reports": {
        "icon": "📈",
        "is_dropdown": True,
        "paths": ["/reports"],
        "path_patterns": [r"^/reports(/|$)"],
        "children": [
            "/reports/dashboards",
            "/reports/schedules",
            "/reports/glossary",
        ],
        "description": "Reports and analytics",
        "order": 6,
    },
    
    # Tools dropdown
    "Tools": {
        "icon": "🔧",
        "is_dropdown": True,
        "paths": [],
        "path_patterns": [r"^/tools(/|$)"],
        "children": [
            "/tools/email-templates",
            "/tools/labor-manager",
            "/tools/labor-documents",
            "/tools/laborchecklists",
            "/tools/staffdirectory",
            "/tools/marketingexpenses",
            "/announcements",
            "/company-documents",
            "/companylibrarymanager",
            "/templatemanager",
            "/apikeys",
        ],
        "description": "Utility tools and managers",
        "order": 7,
    },
    
    # Production dropdown (if separate)
    "Production": {
        "icon": "🏭",
        "is_dropdown": True,
        "paths": [],
        "path_patterns": [r"^/production(/|$)"],
        "children": [
            "/production/scheduler",
            "/production/order-manager",
        ],
        "description": "Production management",
        "order": 8,
    },
    
    # Market / Integrations
    "Market": {
        "icon": "🛒",
        "paths": ["/market/addons"],
        "path_patterns": [r"^/market(/|$)"],
        "children": [
            "/market/app-connections",
            "/market/app-connections/api-keys",
            "/qbhome",
        ],
        "description": "Marketplace and integrations",
        "order": 9,
    },
    
    # Task Manager
    "Tasks": {
        "icon": "✅",
        "paths": ["/task-manager"],
        "path_patterns": [r"^/task-manager(/|$)"],
        "description": "Task management",
        "order": 10,
    },
    
    # Automation
    "Automation": {
        "icon": "⚡",
        "paths": ["/automation"],
        "path_patterns": [r"^/automation(/|$)"],
        "description": "Workflow automation",
        "order": 11,
    },
    
    # Photos
    "Photos": {
        "icon": "📷",
        "paths": ["/photos"],
        "description": "Job photo activity",
        "order": 12,
    },
    
    # User Profile menu (top-right dropdown)
    "Profile": {
        "icon": "👤",
        "is_user_menu": True,
        "paths": ["/profile/edit"],
        "path_patterns": [r"^/profile(-settings)?(/|$)"],
        "children": [
            "/profile/settings",
            "/profile-settings/security",
            "/profile-settings/calendar-sync",
        ],
        "description": "User profile and preferences",
        "order": 100,
    },
    
    # Account Settings (company admin)
    "Settings": {
        "icon": "⚙️",
        "is_admin_menu": True,
        "paths": ["/accountsettings"],
        "path_patterns": [r"^/(accountsettings|locationsettings|jobsettings)(/|$)"],
        "description": "Company-wide settings and configuration",
        "order": 101,
    },
}


def get_nav_category(path: str) -> str:
    """
    Determine which navigation category a path belongs to.
    
    Returns the nav item name (e.g., "Jobs", "Track", "Settings")
    """
    import re
    path = path.lower()
    
    for nav_name, config in HEADER_NAVIGATION.items():
        # Check exact paths
        if path in [p.lower() for p in config.get("paths", [])]:
            return nav_name
        
        # Check children
        if path in [p.lower() for p in config.get("children", [])]:
            return nav_name
        
        # Check patterns
        for pattern in config.get("path_patterns", []):
            if re.match(pattern, path, re.IGNORECASE):
                return nav_name
    
    return "Other"


def get_all_nav_items() -> list:
    """Get all navigation items in order."""
    return sorted(
        HEADER_NAVIGATION.items(),
        key=lambda x: x[1].get("order", 999)
    )












