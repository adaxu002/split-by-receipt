"""Local-only server; serves only public app assets, never keys or Python sources."""
import json
import os
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, unquote
from receipt import extract, ReceiptError, scanning_configured

ROOT = Path(__file__).resolve().parent


def load_env():
    path = ROOT / '.env'
    if path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                if key.strip() in ('RECEIPT_PROVIDER', 'KIMI_API_KEY', 'KIMI_MODEL', 'KIMI_BASE_URL', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'PORT'):
                    os.environ.setdefault(key.strip(), value.strip().strip('\"\''))


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, body, mime='application/json'):
        data = json.dumps(body).encode() if mime == 'application/json' else body
        self.send_response(code)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        self.wfile.write(data)

    def allowed(self):
        expected = {f'localhost:{self.server.server_port}', f'127.0.0.1:{self.server.server_port}'}
        if self.headers.get('Host') not in expected:
            return False
        origin = self.headers.get('Origin')
        return not origin or origin in {f'http://{h}' for h in expected}

    def do_GET(self):
        if not self.allowed():
            return self.reply(403, {'message': 'Local requests only.'})
        path = unquote(urlsplit(self.path).path)
        if path == '/api/health':
            return self.reply(200, {'ready': True, 'scanningConfigured': scanning_configured()})
        if path == '/':
            file, mime = ROOT / 'index.html', 'text/html; charset=utf-8'
        elif path.startswith('/assets/'):
            file = (ROOT / path.lstrip('/')).resolve()
            if not file.is_relative_to(ROOT / 'assets') or file.suffix not in ('.js', '.css'):
                return self.reply(404, {'message': 'Not found.'})
            mime = 'text/javascript; charset=utf-8' if file.suffix == '.js' else 'text/css; charset=utf-8'
        else:
            return self.reply(404, {'message': 'Not found.'})
        if not file.is_file():
            return self.reply(404, {'message': 'Not found.'})
        self.reply(200, file.read_bytes(), mime)

    def do_POST(self):
        if not self.allowed():
            return self.reply(403, {'message': 'Local requests only.'})
        if self.path != '/api/receipt/parse':
            return self.reply(404, {'message': 'Not found.'})
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.reply(415, {'message': 'Expected JSON.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 14_100_000:
                return self.reply(413, {'message': 'Please use an image under 10 MB.'})
            self.connection.settimeout(100)
            payload = json.loads(self.rfile.read(length))
            self.reply(200, extract(payload))
        except (ReceiptError, ValueError, UnicodeError) as error:
            self.reply(422, {'message': str(error) if isinstance(error, ReceiptError) else 'Invalid upload data.'})
        except Exception:
            self.reply(500, {'message': 'Scan failed. Please try again or use manual entry.'})


if __name__ == '__main__':
    load_env()
    port = int(os.environ.get('PORT', '8080'))
    print(f'Split by Receipt: http://localhost:{port}', flush=True)
    print('Scanning configured.' if scanning_configured() else 'No API key: demo and manual entry available.', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
