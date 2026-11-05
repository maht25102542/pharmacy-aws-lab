# cafe-backend: ตัวอย่างเล็กสุด (ร้านกาแฟ (เมนู ออเดอร์ สต็อกเมล็ดกาแฟ)) ตอบ /healthz ให้ ALB และ /api/menu
from flask import Flask, jsonify

app = Flask(__name__)


@app.get("/healthz")
def healthz():
    return "ok"


@app.get("/api/menu")
def menu():
    return jsonify([])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
