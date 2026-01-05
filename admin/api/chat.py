"""
Vercel Serverless Function: Chat with Lenny

Handles the Ask Lenny chat feature with streaming SSE responses.
"""
import os
import json
import traceback
from http.server import BaseHTTPRequestHandler
from typing import List, Optional, Dict, Any

# Check for required env vars early
# Support both VITE_ prefixed (from frontend config) and non-prefixed names
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY", "")
# For the key, also try anon key as fallback (may have RLS restrictions)
if not SUPABASE_SERVICE_ROLE_KEY:
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Log env var status (values hidden for security)
print(f"[INIT] SUPABASE_URL set: {bool(SUPABASE_URL)}")
print(f"[INIT] SUPABASE_SERVICE_ROLE_KEY set: {bool(SUPABASE_SERVICE_ROLE_KEY)}")
print(f"[INIT] OPENAI_API_KEY set: {bool(OPENAI_API_KEY)}")

# Models
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 1536
CHAT_MODEL = "gpt-4o"

# System prompt for Lenny
SYSTEM_PROMPT = """You are Lenny, an internal AccuLynx assistant helping the team audit and understand where actions can be taken in the app.

Your PRIMARY job is to help identify WHERE in the AccuLynx UI specific actions, buttons, or features exist. Focus on:
- Which PAGE contains the action
- Which COMPONENT (modal, drawer, dropdown) the action is in
- The exact path/hierarchy: Page → Component → Action

When answering questions about where something is or how to do something:
1. List ALL the places where that action/feature exists
2. Be specific about the UI path (e.g., "Job Overview page → A/R Details section → Take Payment button")
3. Mention if an action opens a drawer/modal or navigates to another page
4. Note if the same action appears in multiple places

This is for internal auditing - be thorough and specific about UI locations, not general explanations."""


def get_supabase():
    """Get Supabase client."""
    from supabase import create_client
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Missing Supabase credentials - check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_openai():
    """Get OpenAI client."""
    from openai import OpenAI
    if not OPENAI_API_KEY:
        raise ValueError("Missing OPENAI_API_KEY env var")
    return OpenAI(api_key=OPENAI_API_KEY)


def generate_embedding(text: str) -> Optional[List[float]]:
    """Generate embedding for text."""
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


def search_app_content(
    query: str,
    content_types: List[str] = None,
    match_count: int = 25,  # Match local: more results for thorough coverage
    match_threshold: float = 0.20  # Match local: lower threshold = find more UI locations
) -> List[Dict[str, Any]]:
    """Search embedded app content."""
    if content_types is None:
        content_types = ['action', 'component', 'page']
    
    print(f"[SEARCH] Generating embedding for: {query[:50]}...")
    query_embedding = generate_embedding(query)
    if not query_embedding:
        print("[SEARCH] Failed to generate embedding")
        return []
    
    try:
        print("[SEARCH] Calling search_app_content RPC...")
        supabase = get_supabase()
        result = supabase.rpc(
            "search_app_content",
            {
                "query_embedding": query_embedding,
                "match_count": match_count,
                "match_threshold": match_threshold,
                "content_types": content_types
            }
        ).execute()
        print(f"[SEARCH] Found {len(result.data or [])} results")
        return result.data or []
    except Exception as e:
        print(f"[ERROR] Search error: {e}")
        traceback.print_exc()
        return []


def search_kb_content(query: str, match_count: int = 3) -> List[Dict[str, Any]]:
    """Search KB articles."""
    query_embedding = generate_embedding(query)
    if not query_embedding:
        return []
    
    try:
        supabase = get_supabase()
        result = supabase.rpc("search_similar_content", {
            "query_embedding": query_embedding,
            "match_threshold": 0.5,
            "match_count": match_count
        }).execute()
        return result.data or []
    except Exception as e:
        print(f"[ERROR] KB search error: {e}")
        return []


def build_context(app_results: List[Dict], kb_results: List[Dict]) -> str:
    """Build context for LLM from search results."""
    context_parts = []
    
    pages = [r for r in app_results if r.get("content_type") == "page"]
    components = [r for r in app_results if r.get("content_type") == "component"]
    actions = [r for r in app_results if r.get("content_type") == "action"]
    
    if actions:
        context_parts.append("=== UI ACTIONS (where users can do things) ===")
        for action in actions[:20]:  # More actions for better coverage
            title = action.get("title", "")
            description = (action.get("description", "") or "")[:400]
            url = action.get("url_or_path", "")
            metadata = action.get("metadata") or {}
            elem_type = metadata.get("element_type", "button")
            page_title = metadata.get("page_title", "")
            opens = metadata.get("opens_component", "")
            navigates = metadata.get("navigates_to", "")
            
            location = f"on page '{page_title}'" if page_title else f"at {url}"
            result_info = ""
            if opens:
                result_info = f" → Opens: {opens}"
            elif navigates:
                result_info = f" → Navigates to: {navigates}"
            
            context_parts.append(f"• {elem_type} '{title}' {location}{result_info}\n  {description}")
    
    if components:
        context_parts.append("\n=== UI COMPONENTS (modals, drawers, panels) ===")
        for comp in components[:8]:
            title = comp.get("title", "")
            description = (comp.get("description", "") or "")[:300]
            metadata = comp.get("metadata") or {}
            comp_type = metadata.get("component_type", "component")
            page_title = metadata.get("page_title", "")
            
            location = f"on '{page_title}'" if page_title else ""
            context_parts.append(f"• {comp_type} '{title}' {location}\n  {description}")
    
    if pages:
        context_parts.append("\n=== PAGES (main screens) ===")
        for page in pages[:5]:
            title = page.get("title", "")
            description = (page.get("description", "") or "")[:200]
            url = page.get("url_or_path", "")
            context_parts.append(f"• Page '{title}' at {url}\n  {description}")
    
    if kb_results:
        context_parts.append("\n=== Related KB Context ===")
        for kb in kb_results[:2]:
            title = kb.get("title", "Help Article")
            content = (kb.get("content", "") or "")[:400]
            context_parts.append(f"• {title}: {content}")
    
    return "\n\n".join(context_parts) if context_parts else "No relevant documentation found."


def format_sources(app_results: List[Dict], kb_results: List[Dict]) -> List[Dict]:
    """Format sources for response."""
    sources = []
    
    for r in app_results[:8]:
        sources.append({
            "id": r.get("id", ""),
            "content_type": r.get("content_type", ""),
            "title": r.get("title", ""),
            "description": (r.get("description", "") or "")[:150],
            "url_or_path": r.get("url_or_path", ""),
            "screenshot_url": r.get("screenshot_url"),
            "similarity": r.get("similarity", 0)
        })
    
    for kb in kb_results[:2]:
        sources.append({
            "id": kb.get("chunk_id", kb.get("id", "")),
            "content_type": "article",
            "title": kb.get("title", "Knowledge Base Article"),
            "description": (kb.get("content", "") or "")[:150],
            "url_or_path": kb.get("source_url", ""),
            "similarity": kb.get("similarity", 0)
        })
    
    sources.sort(key=lambda x: x.get("similarity", 0), reverse=True)
    return sources[:8]


class handler(BaseHTTPRequestHandler):
    """Vercel serverless handler."""
    
    def log_message(self, format, *args):
        """Override to use print for Vercel logs."""
        print(f"[HTTP] {args[0]}")
    
    def _send_json_error(self, status: int, message: str):
        """Send a JSON error response."""
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())
    
    def do_GET(self):
        """Health check endpoint."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        
        health = {
            "status": "ok",
            "service": "Lenny Chat API",
            "env_check": {
                "SUPABASE_URL": bool(SUPABASE_URL),
                "SUPABASE_SERVICE_ROLE_KEY": bool(SUPABASE_SERVICE_ROLE_KEY),
                "OPENAI_API_KEY": bool(OPENAI_API_KEY)
            }
        }
        self.wfile.write(json.dumps(health).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    
    def do_POST(self):
        """Handle chat request."""
        print("[POST] Chat request received")
        
        # Check env vars first
        if not OPENAI_API_KEY:
            print("[ERROR] Missing OPENAI_API_KEY")
            self._send_json_error(500, "Server misconfigured: Missing OPENAI_API_KEY")
            return
        
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            print("[ERROR] Missing Supabase credentials")
            self._send_json_error(500, "Server misconfigured: Missing Supabase credentials")
            return
        
        # Set up SSE response
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        
        try:
            # Parse request body
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))
            
            message = data.get("message", "")
            history = data.get("history", [])
            
            print(f"[POST] Message: {message[:100]}...")
            
            if not message:
                self._send_event("error", {"message": "No message provided"})
                self._send_event("done", {})
                return
            
            # Search for context
            print("[POST] Searching for context...")
            app_results = search_app_content(message)
            kb_results = search_kb_content(message)
            
            # Send sources first
            sources = format_sources(app_results, kb_results)
            print(f"[POST] Sending {len(sources)} sources")
            self._send_event("sources", {"sources": sources})
            
            # Build context and messages
            context = build_context(app_results, kb_results)
            
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "system", "content": f"Here's what I found in the AccuLynx documentation:\n\n{context}"}
            ]
            
            for msg in history[-6:]:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
            
            messages.append({"role": "user", "content": message})
            
            # Stream response
            print("[POST] Starting OpenAI stream...")
            client = get_openai()
            stream = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=messages,
                max_tokens=1500,
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    self._send_event("content", {"text": content})
            
            print("[POST] Stream complete")
            self._send_event("done", {})
            
        except Exception as e:
            print(f"[ERROR] Chat error: {e}")
            traceback.print_exc()
            self._send_event("error", {"message": str(e)})
            self._send_event("done", {})
    
    def _send_event(self, event_type: str, data: dict):
        """Send SSE event."""
        payload = {"type": event_type, **data}
        try:
            self.wfile.write(f"data: {json.dumps(payload)}\n\n".encode())
            self.wfile.flush()
        except Exception as e:
            print(f"[ERROR] Failed to send event: {e}")
