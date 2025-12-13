#!/usr/bin/env python3
"""
Simple HTTP server to serve the Sudoku frontend on localhost.
Run this to access the app at http://localhost:3000
"""
import http.server
import socketserver
import os
from pathlib import Path

# Change to frontend directory
frontend_dir = Path(__file__).parent / "frontend"
os.chdir(frontend_dir)

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow API requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

Handler = MyHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"✅ Sudoku Frontend Server Running!")
    print(f"📱 Open in browser: http://localhost:{PORT}")
    print(f"🎮 Play game: http://localhost:{PORT}/play.html")
    print(f"\n⚙️  Backend API: http://localhost:8000")
    print(f"\nPress Ctrl+C to stop the server")
    httpd.serve_forever()
