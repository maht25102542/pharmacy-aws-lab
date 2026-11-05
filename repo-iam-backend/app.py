# iam-backend: ตัวอย่างเล็กสุด (ระบบจัดการผู้ใช้และสิทธิ์ (users / roles / permissions)) ตอบ /healthz ให้ ALB และ /api/users
from flask import Flask, jsonify

app = Flask(__name__)


@app.get("/healthz")
def healthz():
    return "ok"


@app.get("/api/users")
def users():
    return jsonify([])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
