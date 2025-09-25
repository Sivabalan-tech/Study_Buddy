#!/usr/bin/env python3
"""
Simple HTTP server for serving the frontend files
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.absolute()

class FrontendHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler to serve frontend files"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SCRIPT_DIR, **kwargs)
    
    def end_headers(self):
        # Add CORS headers to allow frontend-backend communication
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def run_server(port=3000):
    """Run the HTTP server"""
    try:
        with socketserver.TCPServer(("", port), FrontendHandler) as httpd:
            print(f"🚀 Frontend server running at http://localhost:{port}")
            print(f"📁 Serving files from: {SCRIPT_DIR}")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {port} is already in use. Please try a different port.")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    run_server(port)
