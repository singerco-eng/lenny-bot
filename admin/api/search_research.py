"""
Vercel Serverless Function: Semantic Search for Research Moments

Handles semantic search across research interview moments using embeddings.
"""
import os
import json
import traceback
from http.server import BaseHTTPRequestHandler
from typing import List, Optional, Dict, Any

# Environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY", "")
if not SUPABASE_SERVICE_ROLE_KEY:
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Embedding model
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


def get_supabase():
    """Get Supabase client."""
    from supabase import create_client
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Missing Supabase credentials")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_openai():
    """Get OpenAI client."""
    from openai import OpenAI
    if not OPENAI_API_KEY:
        raise ValueError("Missing OPENAI_API_KEY")
    return OpenAI(api_key=OPENAI_API_KEY)


def generate_embedding(text: str) -> Optional[List[float]]:
    """Generate embedding for search query."""
    if not text or not text.strip():
        return None
    
    text = text.replace("\n", " ").strip()[:30000]
    
    try:
        client = get_openai()
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text,
            dimensions=EMBEDDING_DIMENSIONS,
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"[ERROR] Embedding error: {e}")
        traceback.print_exc()
        return None


def search_research_moments(
    query_embedding: List[float],
    match_threshold: float = 0.5,
    match_count: int = 20,
    filter_tags: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """Search research moments using embedding similarity."""
    try:
        supabase = get_supabase()
        result = supabase.rpc("search_research_moments", {
            "query_embedding": query_embedding,
            "match_threshold": match_threshold,
            "match_count": match_count,
            "filter_tags": filter_tags
        }).execute()
        return result.data or []
    except Exception as e:
        print(f"[ERROR] Search error: {e}")
        traceback.print_exc()
        return []


def find_similar_moments(moment_id: str, match_count: int = 10) -> List[Dict[str, Any]]:
    """Find moments similar to a given moment."""
    try:
        supabase = get_supabase()
        
        # Get the moment's embedding
        result = supabase.table("research_moments").select(
            "embedding"
        ).eq("id", moment_id).single().execute()
        
        if not result.data or not result.data.get("embedding"):
            return []
        
        embedding = result.data["embedding"]
        
        # Search for similar moments (excluding the original)
        similar = supabase.rpc("search_research_moments", {
            "query_embedding": embedding,
            "match_threshold": 0.6,
            "match_count": match_count + 1  # +1 because it will include itself
        }).execute()
        
        # Filter out the original moment
        results = [r for r in (similar.data or []) if r.get("id") != moment_id]
        return results[:match_count]
        
    except Exception as e:
        print(f"[ERROR] Find similar error: {e}")
        traceback.print_exc()
        return []


class handler(BaseHTTPRequestHandler):
    """Vercel serverless handler."""
    
    def log_message(self, format, *args):
        print(f"[HTTP] {args[0]}")
    
    def _send_json(self, status: int, data: dict):
        """Send JSON response."""
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    
    def do_GET(self):
        """Health check."""
        self._send_json(200, {
            "status": "ok",
            "service": "Research Semantic Search API",
            "env_check": {
                "SUPABASE_URL": bool(SUPABASE_URL),
                "OPENAI_API_KEY": bool(OPENAI_API_KEY)
            }
        })
    
    def do_POST(self):
        """Handle search request."""
        print("[POST] Search request received")
        
        if not OPENAI_API_KEY:
            self._send_json(500, {"error": "Missing OPENAI_API_KEY"})
            return
        
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            self._send_json(500, {"error": "Missing Supabase credentials"})
            return
        
        try:
            # Parse request
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))
            
            action = data.get("action", "search")
            
            if action == "search":
                # Semantic search
                query = data.get("query", "")
                tags = data.get("tags", [])
                threshold = data.get("threshold", 0.5)
                limit = data.get("limit", 20)
                
                if not query.strip():
                    self._send_json(400, {"error": "Query is required"})
                    return
                
                print(f"[SEARCH] Query: {query[:50]}...")
                
                # Generate embedding
                embedding = generate_embedding(query)
                if not embedding:
                    self._send_json(500, {"error": "Failed to generate embedding"})
                    return
                
                # Search
                results = search_research_moments(
                    query_embedding=embedding,
                    match_threshold=threshold,
                    match_count=limit,
                    filter_tags=tags if tags else None
                )
                
                print(f"[SEARCH] Found {len(results)} results")
                self._send_json(200, {"results": results})
                
            elif action == "similar":
                # Find similar moments
                moment_id = data.get("moment_id", "")
                limit = data.get("limit", 10)
                
                if not moment_id:
                    self._send_json(400, {"error": "moment_id is required"})
                    return
                
                print(f"[SIMILAR] Finding similar to: {moment_id}")
                
                results = find_similar_moments(moment_id, limit)
                
                print(f"[SIMILAR] Found {len(results)} similar moments")
                self._send_json(200, {"results": results})
                
            else:
                self._send_json(400, {"error": f"Unknown action: {action}"})
                
        except Exception as e:
            print(f"[ERROR] {e}")
            traceback.print_exc()
            self._send_json(500, {"error": str(e)})
