"""Backend ของร้านขายยา: API เล็ก ๆ ที่อ่านรายการยาจากฐานข้อมูล Galera"""
import os
import socket

import pymysql
from flask import Flask, jsonify

app = Flask(__name__)

VERSION = os.getenv("APP_VERSION", "dev")
APP_ENV = os.getenv("APP_ENV", "local")

SEED = [
    ("Paracetamol 500 mg", 120),
    ("Loratadine 10 mg", 45),
    ("ORS powder", 80),
]


def connect():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "galera"),
        user=os.getenv("DB_USER", "pharmacy"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "pharmacy_dev"),
        connect_timeout=3,
        autocommit=True,
    )


def ensure_schema(conn):
    with conn.cursor() as cur:
        cur.execute(
            "CREATE TABLE IF NOT EXISTS medicines ("
            "id INT AUTO_INCREMENT PRIMARY KEY, "
            "name VARCHAR(100) NOT NULL UNIQUE, "
            "stock INT NOT NULL)"
        )
        cur.executemany(
            "INSERT IGNORE INTO medicines (name, stock) VALUES (%s, %s)", SEED
        )


@app.get("/api/health")
def health():
    return jsonify(status="ok")


@app.get("/api/version")
def version():
    return jsonify(
        service="backend", version=VERSION, env=APP_ENV, host=socket.gethostname()
    )


@app.get("/api/medicines")
def medicines():
    try:
        conn = connect()
        try:
            ensure_schema(conn)
            with conn.cursor() as cur:
                cur.execute("SELECT name, stock FROM medicines ORDER BY name")
                rows = [{"name": n, "stock": s} for n, s in cur.fetchall()]
        finally:
            conn.close()
        return jsonify(medicines=rows)
    except pymysql.MySQLError as exc:
        return jsonify(error=f"database unavailable: {exc}"), 503


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
