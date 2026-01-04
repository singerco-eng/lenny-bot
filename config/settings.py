"""
Application settings loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    """Application configuration."""
    
    # Supabase API
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_anon_key: str = Field(..., env="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(..., env="SUPABASE_SERVICE_ROLE_KEY")
    
    # Direct Database Access (for migrations)
    database_url: Optional[str] = Field(default=None, env="DATABASE_URL")
    database_url_direct: Optional[str] = Field(default=None, env="DATABASE_URL_DIRECT")
    supabase_db_password: Optional[str] = Field(default=None, env="SUPABASE_DB_PASSWORD")
    supabase_db_host: Optional[str] = Field(default=None, env="SUPABASE_DB_HOST")
    supabase_db_port: int = Field(default=5432, env="SUPABASE_DB_PORT")
    supabase_db_name: str = Field(default="postgres", env="SUPABASE_DB_NAME")
    supabase_db_user: Optional[str] = Field(default=None, env="SUPABASE_DB_USER")
    
    # OpenAI
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")
    vision_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-large"
    embedding_dimensions: int = 1536  # Reduced from 3072 for pgvector compatibility
    
    # Browser settings
    chrome_debug_port: int = Field(default=9222, env="CHROME_DEBUG_PORT")
    browser_profile_path: Path = Field(default=Path("./browser-data"), env="BROWSER_PROFILE_PATH")
    
    # AccuLynx URLs
    acculynx_kb_url: str = Field(
        default="https://support.acculynx.com/hc/en-us",
        env="ACCULYNX_KB_URL"
    )
    acculynx_app_url: str = Field(
        default="https://my.acculynx.com/dashboard",
        env="ACCULYNX_APP_URL"
    )
    acculynx_app_domain: str = Field(
        default="my.acculynx.com",
        env="ACCULYNX_APP_DOMAIN"
    )
    
    # Scraping settings
    scrape_delay: float = Field(default=2.0, env="SCRAPE_DELAY")
    max_concurrent_pages: int = Field(default=3, env="MAX_CONCURRENT_PAGES")
    screenshot_quality: int = Field(default=80, env="SCREENSHOT_QUALITY")
    
    # Paths
    data_dir: Path = Path("./data")
    screenshots_dir: Path = Path("./data/screenshots")
    raw_data_dir: Path = Path("./data/raw")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"
    
    def ensure_directories(self):
        """Create necessary directories if they don't exist."""
        self.data_dir.mkdir(exist_ok=True)
        self.screenshots_dir.mkdir(parents=True, exist_ok=True)
        self.raw_data_dir.mkdir(parents=True, exist_ok=True)
        self.browser_profile_path.mkdir(exist_ok=True)
    
    def get_database_url(self, direct: bool = True) -> str:
        """
        Get the database connection URL.
        
        Args:
            direct: If True, use direct connection (port 5432).
                   If False, use transaction pooler (port 6543).
        
        Returns:
            PostgreSQL connection string
        """
        # Prefer explicit connection strings
        if direct and self.database_url_direct:
            return self.database_url_direct
        if not direct and self.database_url:
            return self.database_url
        
        # Build from components
        if self.supabase_db_host and self.supabase_db_password and self.supabase_db_user:
            port = self.supabase_db_port if direct else 6543
            return f"postgresql://{self.supabase_db_user}:{self.supabase_db_password}@{self.supabase_db_host}:{port}/{self.supabase_db_name}"
        
        raise ValueError(
            "Database connection not configured. Set DATABASE_URL or individual DB components in .env"
        )


# Singleton settings instance - defer creation to avoid import errors
_settings: Optional[Settings] = None

def get_settings() -> Settings:
    """Get the settings singleton, creating it if needed."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings

# For backwards compatibility
settings = property(lambda self: get_settings())

# Create on import (will fail gracefully if .env not present)
try:
    settings = Settings()
except Exception:
    settings = None  # Will be created when .env is available

