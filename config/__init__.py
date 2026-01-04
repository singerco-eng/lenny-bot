# Config module
from .settings import settings
from .product_areas import PRODUCT_AREAS, get_flat_product_areas, get_classification_prompt
from .noise_patterns import (
    KB_NOISE_SELECTORS,
    KB_NOISE_TEXT_PATTERNS,
    KB_CONTENT_SELECTORS,
    APP_IMPORTANT_ELEMENTS,
    APP_NOISE_ELEMENTS,
    MIN_ARTICLE_LENGTH,
    MIN_CHUNK_LENGTH,
    MAX_CHUNK_LENGTH,
    should_skip_url,
    estimate_content_quality,
)

__all__ = [
    "settings",
    "PRODUCT_AREAS",
    "get_flat_product_areas",
    "get_classification_prompt",
    "KB_NOISE_SELECTORS",
    "KB_NOISE_TEXT_PATTERNS", 
    "KB_CONTENT_SELECTORS",
    "should_skip_url",
    "estimate_content_quality",
]
