"""
Simple HTTP server to serve the Waffledom frontend.
Browsers block API calls from file:// pages (CORS 'null' origin).
Run this to serve the frontend on http://localhost:5500
"""
import http.server
import socketserver
import webbrowser
import os

PORT = 5500
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Suppress noisy logs
        pass

print(f"=== Waffledom Frontend Server ===")
print(f"Serving: {DIRECTORY}")
print(f"Open browser at: http://localhost:{PORT}")
print(f"Press Ctrl+C to stop.")
print()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    webbrowser.open(f"http://localhost:{PORT}/index.html")
    httpd.serve_forever()
