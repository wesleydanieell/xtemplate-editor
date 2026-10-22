#!/usr/bin/env python3
"""Serve only the staged browser build to devices on a trusted local network.

Build first with: npm run desktop:assets
Then: python3 scripts/serve-lan.py --host 192.168.1.5 --port 8766

The process is a read-only static server and has NO filesystem upload endpoint.
Each browser edits its own independent document in memory. It is not sync.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]/'dist-web'
class AppHandler(SimpleHTTPRequestHandler):
    def list_directory(self,path):
        self.send_error(403,'Directory listing disabled')
        return None
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Cache-Control','no-store')
        super().end_headers()
    def translate_path(self,path):
        path=super().translate_path(path)
        target=Path(path).resolve()
        if not target.is_relative_to(ROOT.resolve()) or any(p.startswith('.') for p in target.relative_to(ROOT.resolve()).parts):
            return str(ROOT/'__forbidden__')
        return str(target)

def main():
    parser=argparse.ArgumentParser(description='Serve XTemplate Studio build on a trusted LAN')
    parser.add_argument('--host',required=True,help='IPv4 address of your computer on the Wi-Fi/LAN')
    parser.add_argument('--port',type=int,default=8766)
    args=parser.parse_args()
    if not (ROOT/'index.html').is_file():
        parser.error('No staged build found. Run npm run desktop:assets first.')
    server=ThreadingHTTPServer((args.host,args.port),partial(AppHandler,directory=str(ROOT)))
    print(f'XTemplate Studio LAN preview: http://{args.host}:{args.port}/',flush=True)
    print('Trusted private networks only · Static files only · No synchronized editing',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
