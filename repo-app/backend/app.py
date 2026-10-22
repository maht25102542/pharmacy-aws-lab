"""Backend ของร้านขายยา: API เล็ก ๆ ที่อ่านรายการยาจากฐานข้อมูล Galera"""
import os
import socket

import pymysql
from flask import Flask, jsonify, request

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


MAX_STOCK = 1_000_000


def list_medicines(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id, name, stock FROM medicines ORDER BY name")
        return [{"id": i, "name": n, "stock": s} for i, n, s in cur.fetchall()]


def add_medicine(conn, name, stock):
    with conn.cursor() as cur:
        cur.execute("INSERT INTO medicines (name, stock) VALUES (%s, %s)", (name, stock))
        return cur.lastrowid


def adjust_stock(conn, med_id, delta=None, stock=None):
    """คืน (สถานะ, stock ปัจจุบัน): ok | missing | negative
    UPDATE ครั้งเดียวและไม่ยอมให้ติดลบ กันสองคนกดพร้อมกันแล้วค่อยเพี้ยน"""
    with conn.cursor() as cur:
        if stock is not None:
            cur.execute("UPDATE medicines SET stock = %s WHERE id = %s", (stock, med_id))
            changed = 1
        else:
            cur.execute(
                "UPDATE medicines SET stock = stock + %s WHERE id = %s AND stock + %s >= 0",
                (delta, med_id, delta),
            )
            changed = cur.rowcount
        cur.execute("SELECT stock FROM medicines WHERE id = %s", (med_id,))
        row = cur.fetchone()
    if row is None:
        return "missing", None
    if stock is None and delta != 0 and changed == 0:
        return "negative", row[0]
    return "ok", row[0]


def read_int(data, key):
    v = data.get(key)
    return v if isinstance(v, int) and not isinstance(v, bool) else None


def with_db(work):
    """เปิด-ปิด connection และแปลง error ของฐานข้อมูลเป็น 503"""
    try:
        conn = connect()
        try:
            ensure_schema(conn)
            return work(conn)
        finally:
            conn.close()
    except pymysql.err.IntegrityError:
        return jsonify(error="medicine already exists"), 409
    except pymysql.MySQLError as exc:
        return jsonify(error=f"database unavailable: {exc}"), 503


@app.get("/api/medicines")
def medicines():
    return with_db(lambda conn: jsonify(medicines=list_medicines(conn)))


@app.post("/api/medicines")
def create_medicine():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    stock = read_int(data, "stock")
    if not name or len(name) > 100:
        return jsonify(error="name is required (max 100 characters)"), 400
    if stock is None or not 0 <= stock <= MAX_STOCK:
        return jsonify(error=f"stock must be an integer 0-{MAX_STOCK}"), 400
    return with_db(
        lambda conn: (
            jsonify(id=add_medicine(conn, name, stock), name=name, stock=stock),
            201,
        )
    )


@app.patch("/api/medicines/<int:med_id>")
def update_stock(med_id):
    data = request.get_json(silent=True) or {}
    delta, stock = read_int(data, "delta"), read_int(data, "stock")
    if (delta is None) == (stock is None):
        return jsonify(error="send exactly one of: delta, stock (integers)"), 400
    if stock is not None and not 0 <= stock <= MAX_STOCK:
        return jsonify(error=f"stock must be 0-{MAX_STOCK}"), 400
    if delta is not None and abs(delta) > MAX_STOCK:
        return jsonify(error="delta is too large"), 400

    def work(conn):
        status, current = adjust_stock(conn, med_id, delta=delta, stock=stock)
        if status == "missing":
            return jsonify(error="medicine not found"), 404
        if status == "negative":
            return jsonify(error="stock cannot go below zero", stock=current), 409
        return jsonify(id=med_id, stock=current)

    return with_db(work)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
