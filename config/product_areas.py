"""
AccuLynx Product Area Taxonomy

This defines the hierarchical structure of AccuLynx product areas
for content classification.
"""
from typing import TypedDict


class ProductArea(TypedDict):
    name: str
    slug: str
    description: str
    keywords: list[str]
    children: list["ProductArea"] | None


# Main taxonomy - will be used for GPT classification prompts
PRODUCT_AREAS: list[ProductArea] = [
    {
        "name": "CRM & Contacts",
        "slug": "crm-contacts",
        "description": "Customer relationship management, leads, and contact management",
        "keywords": ["lead", "contact", "customer", "prospect", "client", "communication", "email", "call", "note"],
        "children": [
            {
                "name": "Lead Management",
                "slug": "lead-management",
                "description": "Capturing, tracking, and converting leads",
                "keywords": ["lead", "prospect", "conversion", "source", "capture"],
                "children": None
            },
            {
                "name": "Customer Records",
                "slug": "customer-records",
                "description": "Managing customer information and history",
                "keywords": ["customer", "record", "history", "profile", "info"],
                "children": None
            },
            {
                "name": "Communication",
                "slug": "communication",
                "description": "Emails, calls, texts, and communication tracking",
                "keywords": ["email", "call", "text", "sms", "message", "communication"],
                "children": None
            }
        ]
    },
    {
        "name": "Jobs & Projects",
        "slug": "jobs-projects",
        "description": "Job creation, management, and workflow",
        "keywords": ["job", "project", "work order", "workflow", "pipeline", "status"],
        "children": [
            {
                "name": "Job Creation",
                "slug": "job-creation",
                "description": "Creating and setting up new jobs",
                "keywords": ["create", "new job", "setup", "add job"],
                "children": None
            },
            {
                "name": "Job Workflow",
                "slug": "job-workflow",
                "description": "Job pipeline, stages, and status management",
                "keywords": ["workflow", "pipeline", "stage", "status", "milestone"],
                "children": None
            },
            {
                "name": "Job Details",
                "slug": "job-details",
                "description": "Job information, documents, and attachments",
                "keywords": ["details", "document", "attachment", "file", "photo"],
                "children": None
            }
        ]
    },
    {
        "name": "Estimating & Proposals",
        "slug": "estimating-proposals",
        "description": "Measurements, estimates, and proposal generation",
        "keywords": ["estimate", "proposal", "measurement", "quote", "price", "bid"],
        "children": [
            {
                "name": "Measurements",
                "slug": "measurements",
                "description": "Roof and property measurements",
                "keywords": ["measurement", "roof", "square", "pitch", "area"],
                "children": None
            },
            {
                "name": "Material Calculation",
                "slug": "material-calculation",
                "description": "Calculating materials and quantities",
                "keywords": ["material", "quantity", "calculate", "order", "supply"],
                "children": None
            },
            {
                "name": "Proposal Generation",
                "slug": "proposal-generation",
                "description": "Creating and sending proposals to customers",
                "keywords": ["proposal", "template", "send", "sign", "contract"],
                "children": None
            }
        ]
    },
    {
        "name": "Scheduling & Calendar",
        "slug": "scheduling-calendar",
        "description": "Crew scheduling, appointments, and calendar management",
        "keywords": ["schedule", "calendar", "appointment", "crew", "date", "time"],
        "children": [
            {
                "name": "Crew Scheduling",
                "slug": "crew-scheduling",
                "description": "Assigning and managing crew schedules",
                "keywords": ["crew", "team", "assign", "labor"],
                "children": None
            },
            {
                "name": "Appointments",
                "slug": "appointments",
                "description": "Customer appointments and meetings",
                "keywords": ["appointment", "meeting", "visit", "inspection"],
                "children": None
            },
            {
                "name": "Calendar Views",
                "slug": "calendar-views",
                "description": "Calendar display and navigation",
                "keywords": ["calendar", "view", "day", "week", "month"],
                "children": None
            }
        ]
    },
    {
        "name": "Financials",
        "slug": "financials",
        "description": "Invoicing, payments, and financial management",
        "keywords": ["invoice", "payment", "money", "financial", "accounting", "quickbooks"],
        "children": [
            {
                "name": "Invoicing",
                "slug": "invoicing",
                "description": "Creating and managing invoices",
                "keywords": ["invoice", "bill", "charge"],
                "children": None
            },
            {
                "name": "Payments",
                "slug": "payments",
                "description": "Payment processing and tracking",
                "keywords": ["payment", "pay", "receive", "credit card", "check"],
                "children": None
            },
            {
                "name": "QuickBooks Integration",
                "slug": "quickbooks",
                "description": "QuickBooks sync and integration",
                "keywords": ["quickbooks", "qb", "sync", "accounting"],
                "children": None
            }
        ]
    },
    {
        "name": "Reports & Analytics",
        "slug": "reports-analytics",
        "description": "Reporting, dashboards, and business analytics",
        "keywords": ["report", "analytics", "dashboard", "metric", "kpi", "chart"],
        "children": [
            {
                "name": "Sales Reports",
                "slug": "sales-reports",
                "description": "Sales performance and pipeline reports",
                "keywords": ["sales", "revenue", "closed", "won"],
                "children": None
            },
            {
                "name": "Production Reports",
                "slug": "production-reports",
                "description": "Job production and completion reports",
                "keywords": ["production", "completion", "job", "crew"],
                "children": None
            },
            {
                "name": "Custom Reports",
                "slug": "custom-reports",
                "description": "Building custom reports",
                "keywords": ["custom", "builder", "export"],
                "children": None
            }
        ]
    },
    {
        "name": "Mobile App",
        "slug": "mobile-app",
        "description": "AccuLynx mobile applications",
        "keywords": ["mobile", "app", "ios", "android", "phone", "tablet", "field"],
        "children": [
            {
                "name": "iOS App",
                "slug": "ios-app",
                "description": "AccuLynx for iPhone and iPad",
                "keywords": ["ios", "iphone", "ipad", "apple"],
                "children": None
            },
            {
                "name": "Android App",
                "slug": "android-app",
                "description": "AccuLynx for Android devices",
                "keywords": ["android", "google", "samsung"],
                "children": None
            },
            {
                "name": "Field Features",
                "slug": "field-features",
                "description": "Features designed for field use",
                "keywords": ["field", "onsite", "photo", "signature"],
                "children": None
            }
        ]
    },
    {
        "name": "Integrations",
        "slug": "integrations",
        "description": "Third-party integrations and connections",
        "keywords": ["integration", "connect", "sync", "api", "third-party"],
        "children": [
            {
                "name": "EagleView",
                "slug": "eagleview",
                "description": "EagleView measurement integration",
                "keywords": ["eagleview", "aerial", "measurement"],
                "children": None
            },
            {
                "name": "CompanyCam",
                "slug": "companycam",
                "description": "CompanyCam photo integration",
                "keywords": ["companycam", "photo", "image"],
                "children": None
            },
            {
                "name": "Other Integrations",
                "slug": "other-integrations",
                "description": "Other third-party integrations",
                "keywords": ["integration", "connect", "partner"],
                "children": None
            }
        ]
    },
    {
        "name": "Settings & Admin",
        "slug": "settings-admin",
        "description": "Account settings and administration",
        "keywords": ["settings", "admin", "configuration", "setup", "user", "permission"],
        "children": [
            {
                "name": "User Management",
                "slug": "user-management",
                "description": "Managing users and accounts",
                "keywords": ["user", "account", "invite", "deactivate"],
                "children": None
            },
            {
                "name": "Permissions & Roles",
                "slug": "permissions-roles",
                "description": "User permissions and role management",
                "keywords": ["permission", "role", "access", "security"],
                "children": None
            },
            {
                "name": "Company Settings",
                "slug": "company-settings",
                "description": "Company-wide configuration",
                "keywords": ["company", "organization", "branding", "defaults"],
                "children": None
            }
        ]
    },
    {
        "name": "Getting Started",
        "slug": "getting-started",
        "description": "Onboarding, tutorials, and getting started guides",
        "keywords": ["getting started", "onboarding", "tutorial", "learn", "beginner", "start"],
        "children": [
            {
                "name": "Onboarding",
                "slug": "onboarding",
                "description": "Initial setup and onboarding",
                "keywords": ["onboard", "setup", "first", "initial"],
                "children": None
            },
            {
                "name": "Best Practices",
                "slug": "best-practices",
                "description": "Recommended workflows and practices",
                "keywords": ["best practice", "recommend", "tip", "advice"],
                "children": None
            },
            {
                "name": "FAQs",
                "slug": "faqs",
                "description": "Frequently asked questions",
                "keywords": ["faq", "question", "answer", "common"],
                "children": None
            }
        ]
    }
]


def get_flat_product_areas() -> list[dict]:
    """Flatten the hierarchy for database insertion."""
    flat = []
    
    def _flatten(areas: list[ProductArea], parent_slug: str | None = None):
        for area in areas:
            flat.append({
                "name": area["name"],
                "slug": area["slug"],
                "parent_slug": parent_slug,
                "description": area["description"],
                "keywords": area["keywords"]
            })
            if area["children"]:
                _flatten(area["children"], area["slug"])
    
    _flatten(PRODUCT_AREAS)
    return flat


def get_classification_prompt() -> str:
    """Generate a prompt for GPT to classify content into product areas."""
    areas_text = []
    
    def _format(areas: list[ProductArea], indent: int = 0):
        for area in areas:
            prefix = "  " * indent
            areas_text.append(f"{prefix}- {area['name']} ({area['slug']}): {area['description']}")
            if area["children"]:
                _format(area["children"], indent + 1)
    
    _format(PRODUCT_AREAS)
    
    return f"""Classify the following content into one of these AccuLynx product areas:

{chr(10).join(areas_text)}

Return only the slug of the most appropriate product area (e.g., "job-workflow" or "invoicing").
If the content spans multiple areas, choose the primary one.
If unsure, return "getting-started".
"""

