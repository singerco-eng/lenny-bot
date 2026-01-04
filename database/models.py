"""
Pydantic models for database entities.
"""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional
import uuid


class SourceType(str, Enum):
    KNOWLEDGE_BASE = "knowledge_base"
    WEB_APP = "web_app"


class ScrapeStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class ContentType(str, Enum):
    ARTICLE = "article"
    SCREENSHOT_DESCRIPTION = "screenshot_description"
    FEATURE_DESCRIPTION = "feature_description"
    HOW_TO = "how_to"
    FAQ = "faq"
    UI_ELEMENT = "ui_element"
    WORKFLOW = "workflow"


class SessionStatus(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# ============================================
# Database Models
# ============================================

class ProductAreaDB(BaseModel):
    """Product area in the database."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    keywords: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True


class SourceURL(BaseModel):
    """A URL that has been or will be scraped."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    source_type: SourceType
    title: Optional[str] = None
    last_scraped_at: Optional[datetime] = None
    scrape_status: ScrapeStatus = ScrapeStatus.PENDING
    product_area_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True


class ContentChunk(BaseModel):
    """A processed chunk of content ready for embedding."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_url_id: str
    product_area_id: Optional[str] = None
    
    # Content
    content_type: ContentType
    title: Optional[str] = None
    content: str
    
    # For screenshots
    screenshot_url: Optional[str] = None
    screenshot_description: Optional[str] = None
    
    # Metadata
    hierarchy_path: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    quality_score: float = 0.5
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True


class Embedding(BaseModel):
    """Vector embedding for a content chunk."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content_chunk_id: str
    embedding: list[float]  # 3072 dimensions for text-embedding-3-large
    model: str = "text-embedding-3-large"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True


class ScrapeSession(BaseModel):
    """Tracking for a scraping run."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_type: str  # "kb_scrape", "app_scrape", "embedding_generation"
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    urls_processed: int = 0
    chunks_created: int = 0
    status: SessionStatus = SessionStatus.RUNNING
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================
# Request/Response Models
# ============================================

class ContentChunkCreate(BaseModel):
    """Data needed to create a new content chunk."""
    source_url_id: str
    product_area_id: Optional[str] = None
    content_type: ContentType
    title: Optional[str] = None
    content: str
    screenshot_url: Optional[str] = None
    screenshot_description: Optional[str] = None
    hierarchy_path: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    quality_score: float = 0.5


class SourceURLCreate(BaseModel):
    """Data needed to create a new source URL record."""
    url: str
    source_type: SourceType
    title: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class SimilaritySearchResult(BaseModel):
    """Result from a vector similarity search."""
    chunk_id: str
    content: str
    title: Optional[str] = None
    product_area: Optional[str] = None
    similarity_score: float
    metadata: dict = Field(default_factory=dict)

