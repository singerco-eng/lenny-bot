"""
Pydantic models for App Scraping data.

These models represent the structure of the AccuLynx web application:
- Pages and navigation
- UI elements and their actions
- User flows and workflows
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ============================================
# ENUMS
# ============================================

class PageType(str, Enum):
    DASHBOARD = "dashboard"
    LIST = "list"
    DETAIL = "detail"
    FORM = "form"
    MODAL = "modal"
    SETTINGS = "settings"
    REPORT = "report"
    CALENDAR = "calendar"
    UNKNOWN = "unknown"


class ElementType(str, Enum):
    BUTTON = "button"
    LINK = "link"
    INPUT = "input"
    SELECT = "select"
    CHECKBOX = "checkbox"
    RADIO = "radio"
    TAB = "tab"
    MENU_ITEM = "menu_item"
    TABLE_ACTION = "table_action"
    DROPDOWN = "dropdown"
    MODAL_TRIGGER = "modal_trigger"
    ICON_BUTTON = "icon_button"
    SEARCH = "search"
    DATE_PICKER = "date_picker"
    FILE_UPLOAD = "file_upload"
    TOGGLE = "toggle"


class ElementLocation(str, Enum):
    HEADER = "header"
    SIDEBAR = "sidebar"
    MAIN = "main"
    FOOTER = "footer"
    MODAL = "modal"
    TABLE_ROW = "table_row"
    TOOLBAR = "toolbar"
    BREADCRUMB = "breadcrumb"
    TAB_BAR = "tab_bar"
    FORM = "form"


class TriggerType(str, Enum):
    CLICK = "click"
    SUBMIT = "submit"
    HOVER = "hover"
    CHANGE = "change"
    FOCUS = "focus"
    DOUBLE_CLICK = "double_click"
    RIGHT_CLICK = "right_click"


class ActionType(str, Enum):
    NAVIGATE = "navigate"
    OPEN_MODAL = "open_modal"
    CLOSE_MODAL = "close_modal"
    SUBMIT_FORM = "submit_form"
    TOGGLE = "toggle"
    EXPAND = "expand"
    COLLAPSE = "collapse"
    FILTER = "filter"
    SORT = "sort"
    SEARCH = "search"
    API_CALL = "api_call"
    DOWNLOAD = "download"
    UPLOAD = "upload"
    DELETE = "delete"
    REFRESH = "refresh"
    COPY = "copy"
    PRINT = "print"


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class FlowType(str, Enum):
    CREATE = "create"
    EDIT = "edit"
    DELETE = "delete"
    PROCESS = "process"
    REPORT = "report"
    IMPORT = "import"
    EXPORT = "export"


# ============================================
# PAGE MODELS
# ============================================

class AppPage(BaseModel):
    """A page/screen in the AccuLynx application."""
    id: Optional[str] = None
    url: str
    url_pattern: Optional[str] = None
    path: str
    title: Optional[str] = None
    page_type: Optional[PageType] = PageType.UNKNOWN
    
    parent_page_id: Optional[str] = None
    menu_path: list[str] = Field(default_factory=list)
    depth: int = 0
    
    description: Optional[str] = None
    primary_actions: list[str] = Field(default_factory=list)
    
    screenshot_url: Optional[str] = None
    screenshot_description: Optional[str] = None
    
    product_area_id: Optional[str] = None
    
    requires_data: bool = False
    is_dynamic: bool = False
    
    analysis_status: AnalysisStatus = AnalysisStatus.PENDING
    
    metadata: dict = Field(default_factory=dict)


class PageState(BaseModel):
    """A specific state a page can be in."""
    id: Optional[str] = None
    page_id: str
    state_name: str
    description: Optional[str] = None
    trigger_description: Optional[str] = None
    preconditions: list[str] = Field(default_factory=list)
    visible_elements: list[str] = Field(default_factory=list)
    hidden_elements: list[str] = Field(default_factory=list)
    screenshot_url: Optional[str] = None


# ============================================
# UI ELEMENT MODELS
# ============================================

class UIElement(BaseModel):
    """An interactive element on a page."""
    id: Optional[str] = None
    page_id: str
    element_type: ElementType
    selector: Optional[str] = None
    
    label: Optional[str] = None
    aria_label: Optional[str] = None
    placeholder: Optional[str] = None
    icon: Optional[str] = None
    
    location: Optional[ElementLocation] = None
    parent_element_id: Optional[str] = None
    order_index: Optional[int] = None
    
    is_primary_action: bool = False
    is_destructive: bool = False
    is_navigation: bool = False
    is_form_submit: bool = False
    requires_confirmation: bool = False
    
    input_type: Optional[str] = None
    is_required: Optional[bool] = None
    validation_rules: Optional[dict] = None
    options: Optional[list] = None
    
    screenshot_url: Optional[str] = None
    description: Optional[str] = None
    
    metadata: dict = Field(default_factory=dict)


class UIAction(BaseModel):
    """An action that can be triggered by a UI element."""
    id: Optional[str] = None
    element_id: str
    trigger_type: TriggerType = TriggerType.CLICK
    action_type: ActionType
    
    result_url: Optional[str] = None
    result_page_id: Optional[str] = None
    opens_modal: bool = False
    modal_title: Optional[str] = None
    
    changes_data: bool = False
    is_reversible: Optional[bool] = None
    
    creates_entity: Optional[str] = None
    updates_entity: Optional[str] = None
    deletes_entity: Optional[str] = None
    
    possible_errors: list[str] = Field(default_factory=list)
    validation_messages: list[str] = Field(default_factory=list)
    
    before_screenshot_url: Optional[str] = None
    after_screenshot_url: Optional[str] = None
    
    description: Optional[str] = None
    test_status: Optional[str] = None
    
    metadata: dict = Field(default_factory=dict)


# ============================================
# FLOW MODELS
# ============================================

class UserFlow(BaseModel):
    """A multi-step user workflow."""
    id: Optional[str] = None
    name: str
    slug: str
    description: Optional[str] = None
    
    flow_type: Optional[FlowType] = None
    entity_type: Optional[str] = None
    product_area_id: Optional[str] = None
    
    starting_page_id: Optional[str] = None
    ending_page_id: Optional[str] = None
    
    step_count: Optional[int] = None
    estimated_duration_seconds: Optional[int] = None
    requires_external_data: bool = False
    
    prerequisites: list[str] = Field(default_factory=list)
    required_permissions: list[str] = Field(default_factory=list)
    
    is_complete: bool = False
    
    metadata: dict = Field(default_factory=dict)


class FlowStep(BaseModel):
    """A single step in a user flow."""
    id: Optional[str] = None
    flow_id: str
    step_number: int
    
    page_id: Optional[str] = None
    action_id: Optional[str] = None
    
    instruction: str
    input_data: Optional[dict] = None
    
    expected_result: Optional[str] = None
    expected_page_id: Optional[str] = None
    
    screenshot_url: Optional[str] = None
    
    is_conditional: bool = False
    condition_description: Optional[str] = None
    on_success_step: Optional[int] = None
    on_failure_step: Optional[int] = None
    
    metadata: dict = Field(default_factory=dict)


# ============================================
# NAVIGATION MODELS
# ============================================

class NavigationEdge(BaseModel):
    """A navigation link between two pages."""
    id: Optional[str] = None
    from_page_id: str
    to_page_id: str
    via_element_id: Optional[str] = None
    via_action_id: Optional[str] = None
    edge_type: Optional[str] = None
    label: Optional[str] = None


class MenuItem(BaseModel):
    """A menu item discovered during navigation."""
    text: str
    href: Optional[str] = None
    selector: str
    has_submenu: bool = False
    children: list["MenuItem"] = Field(default_factory=list)
    icon: Optional[str] = None
    is_active: bool = False


# For recursive model
MenuItem.model_rebuild()


# ============================================
# SCRAPE SESSION
# ============================================

class AppScrapeSession(BaseModel):
    """Tracks an app scraping session."""
    id: Optional[str] = None
    session_type: str
    status: str = "running"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    pages_discovered: int = 0
    pages_analyzed: int = 0
    elements_found: int = 0
    actions_tested: int = 0
    flows_recorded: int = 0
    
    errors: list[dict] = Field(default_factory=list)
    notes: Optional[str] = None
    metadata: dict = Field(default_factory=dict)

