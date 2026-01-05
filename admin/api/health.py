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
        
        response = {
            "status": "ok",
            "message": "Vercel Python function is working!",
            "env_vars": {
                "SUPABASE_URL": bool(os.environ.get("SUPABASE_URL")),
                "SUPABASE_SERVICE_ROLE_KEY": bool(os.environ.get("SUPABASE_SERVICE_ROLE_KEY")),
                "OPENAI_API_KEY": bool(os.environ.get("OPENAI_API_KEY"))
            }
        }
        
        self.wfile.write(json.dumps(response, indent=2).encode())

