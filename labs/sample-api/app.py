# แอปจิ๋วสำหรับทดสอบ lab 02/04/05/07 (repo-backend จริงไม่มี /healthz และใช้ MariaDB ส่วน lab 02 ใช้ Postgres)
# ตอบ 200 ที่ /healthz และ / · ไม่ต่อ DB · อ่าน APP_ENV, VERSION จาก environment
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path not in ("/", "/healthz"):
            self.send_response(404)
            self.end_headers()
            return
        body = json.dumps({"service": "pharmacy-api", "env": os.getenv("APP_ENV", "?"), "version": os.getenv("VERSION", "?")}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)


HTTPServer(("0.0.0.0", 8000), H).serve_forever()
