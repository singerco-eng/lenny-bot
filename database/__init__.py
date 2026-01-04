# Database module
from .supabase_client import get_supabase_client, supabase
from .models import (
    ProductAreaDB,
    SourceURL,
    ContentChunk,
    Embedding,
    ScrapeSession,
)

__all__ = [
    "get_supabase_client",
    "supabase",
    "ProductAreaDB",
    "SourceURL",
    "ContentChunk",
    "Embedding",
    "ScrapeSession",
]

