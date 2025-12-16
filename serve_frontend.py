#!/usr/bin/env python3
"""
Simple HTTP server to serve the Sudoku frontend on localhost.
Run this to access the app at http://localhost:3000
"""
import http.server
import socketserver
import os
import socket
import sys
from pathlib import Path

# Change to frontend directory
frontend_dir = Path(__file__).parent / "frontend"
os.chdir(frontend_dir)

PORT = 3000

def is_port_in_use(port):
    """Check if a port is already in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('', port))
            return False
        except OSError:
            return True

def find_available_port(start_port, max_attempts=10):
    """Find an available port starting from start_port."""
    for i in range(max_attempts):
        port = start_port + i
        if not is_port_in_use(port):
            return port
    return None

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

# Check if port is in use and find alternative if needed
if is_port_in_use(PORT):
    print(f"⚠️  Port {PORT} is already in use.")
    alternative_port = find_available_port(PORT)
    if alternative_port:
        print(f"🔄 Using alternative port: {alternative_port}")
        PORT = alternative_port
    else:
        print(f"❌ Could not find an available port. Please free up port {PORT} or another port.")
        print(f"💡 To free port {PORT}, run: netstat -ano | findstr :{PORT}")
        print(f"   Then kill the process using: taskkill /F /PID <PID>")
        sys.exit(1)

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"✅ Sudoku Frontend Server Running!")
        print(f"📱 Open in browser: http://localhost:{PORT}")
        print(f"🎮 Play game: http://localhost:{PORT}/play.html")
        print(f"\n⚙️  Backend API: http://localhost:8000")
        print(f"\nPress Ctrl+C to stop the server")
        httpd.serve_forever()
except OSError as e:
    print(f"❌ Error starting server: {e}")
    print(f"💡 Port {PORT} may be in use. Try:")
    print(f"   1. Kill the process using the port")
    print(f"   2. Use a different port by modifying PORT in this script")
    sys.exit(1)
