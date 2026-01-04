"""
Supabase client initialization and helpers.
"""
from supabase import create_client, Client
from config.settings import settings


_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """Get or create the Supabase client singleton."""
    global _supabase_client
    
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key  # Use service role for full access
        )
    
    return _supabase_client


# Convenience alias
supabase = get_supabase_client


class SupabaseStorage:
    """Helper for Supabase Storage operations."""
    
    SCREENSHOTS_BUCKET = "screenshots"
    
    @classmethod
    def upload_screenshot(
        cls,
        file_path: str,
        file_data: bytes,
        content_type: str = "image/png"
    ) -> str:
        """
        Upload a screenshot to Supabase Storage.
        
        Args:
            file_path: Path within the bucket (e.g., "kb/article-123.png")
            file_data: Raw image bytes
            content_type: MIME type
            
        Returns:
            Public URL of the uploaded file
        """
        client = get_supabase_client()
        
        # Upload file
        client.storage.from_(cls.SCREENSHOTS_BUCKET).upload(
            file_path,
            file_data,
            {"content-type": content_type}
        )
        
        # Get public URL
        return client.storage.from_(cls.SCREENSHOTS_BUCKET).get_public_url(file_path)
    
    @classmethod
    def delete_screenshot(cls, file_path: str) -> None:
        """Delete a screenshot from storage."""
        client = get_supabase_client()
        client.storage.from_(cls.SCREENSHOTS_BUCKET).remove([file_path])

