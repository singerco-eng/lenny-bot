"""
Simple health check - no external dependencies.
Visit /api/health to test if Vercel functions work at all.
"""
import os
import json
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        # Check both naming conventions
        supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
        openai_key = os.environ.get("OPENAI_API_KEY")
        
        response = {
            "status": "ok",
            "message": "Vercel Python function is working!",
            "env_vars": {
                "SUPABASE_URL": bool(supabase_url),
                "SUPABASE_URL_source": "SUPABASE_URL" if os.environ.get("SUPABASE_URL") else ("VITE_SUPABASE_URL" if os.environ.get("VITE_SUPABASE_URL") else "NOT SET"),
                "SUPABASE_KEY": bool(supabase_key),
                "SUPABASE_KEY_source": "SUPABASE_SERVICE_ROLE_KEY" if os.environ.get("SUPABASE_SERVICE_ROLE_KEY") else ("VITE_SUPABASE_ANON_KEY" if os.environ.get("VITE_SUPABASE_ANON_KEY") else "NOT SET"),
                "OPENAI_API_KEY": bool(openai_key)
            }
        }
        
        self.wfile.write(json.dumps(response, indent=2).encode())

