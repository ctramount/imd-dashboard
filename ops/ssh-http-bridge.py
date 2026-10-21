#!/usr/bin/env python3
"""Plain-HTTP relay to localhost:22, so SSH works through proxies that strip WebSocket upgrades.
POST /ssh-poll/open -> session id. POST /ssh-poll/up/<id> (body = bytes to sshd). GET /ssh-poll/down/<id> waits up to
20 s for bytes from sshd (204 when idle, 410 when closed). It only reaches the sshd port 22 already serves (key-only),
so it exposes nothing new. Listens on 127.0.0.1:8082; Caddy forwards /ssh-poll/* to it."""
import secrets, socket, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import os
TARGET_PORT = int(os.environ.get("BRIDGE_TARGET_PORT", "22"))
SESSIONS = {}
LOCK = threading.Lock()
IDLE = 300

class Session:
    def __init__(self):
        self.sock = socket.create_connection(("127.0.0.1", TARGET_PORT))
        self.buf = bytearray()
        self.closed = False
        self.cv = threading.Condition()
        self.seen = time.time()
        threading.Thread(target=self.reader, daemon=True).start()
    def reader(self):
        try:
            while True:
                d = self.sock.recv(65536)
                if not d:
                    break
                with self.cv:
                    self.buf += d
                    self.cv.notify_all()
        except OSError:
            pass
        with self.cv:
            self.closed = True
            self.cv.notify_all()

def reaper():
    while True:
        time.sleep(30)
        with LOCK:
            for k, s in list(SESSIONS.items()):
                if time.time() - s.seen > IDLE or (s.closed and not s.buf):
                    try: s.sock.close()
                    except OSError: pass
                    del SESSIONS[k]

class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, *a): pass
    def reply(self, code, body=b"", ctype="application/octet-stream"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)
    def session(self, sid):
        with LOCK:
            s = SESSIONS.get(sid)
        if s: s.seen = time.time()
        return s
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else b""
        parts = self.path.strip("/").split("/")
        if parts == ["ssh-poll", "open"]:
            sid = secrets.token_hex(16)
            with LOCK:
                SESSIONS[sid] = Session()
            return self.reply(200, sid.encode(), "text/plain")
        if len(parts) == 3 and parts[:2] == ["ssh-poll", "up"]:
            s = self.session(parts[2])
            if not s or s.closed: return self.reply(410)
            try: s.sock.sendall(body)
            except OSError: return self.reply(410)
            return self.reply(204)
        self.reply(404)
    def do_GET(self):
        parts = self.path.strip("/").split("/")
        if len(parts) == 3 and parts[:2] == ["ssh-poll", "down"]:
            s = self.session(parts[2])
            if not s: return self.reply(410)
            with s.cv:
                s.cv.wait_for(lambda: s.buf or s.closed, timeout=20)
                data, s.buf = bytes(s.buf), bytearray()
                closed = s.closed
            if data: return self.reply(200, data)
            return self.reply(410 if closed else 204)
        self.reply(404)

threading.Thread(target=reaper, daemon=True).start()
ThreadingHTTPServer(("127.0.0.1", 8082), H).serve_forever()
