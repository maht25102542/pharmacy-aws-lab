"""ทดสอบ backend โดยไม่ต้องมีฐานข้อมูล: แทนที่ฟังก์ชันที่คุยกับ DB ด้วยของปลอม
รัน: pip install -r requirements.txt -r requirements-dev.txt && pytest backend"""
import pymysql
import pytest

import app as backend


class FakeConn:
    def close(self):
        pass


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(backend, "connect", lambda: FakeConn())
    monkeypatch.setattr(backend, "ensure_schema", lambda conn: None)
    return backend.app.test_client()


def test_health_and_version(client):
    assert client.get("/api/health").get_json() == {"status": "ok"}
    v = client.get("/api/version").get_json()
    assert v["service"] == "backend" and "host" in v


def test_list(client, monkeypatch):
    monkeypatch.setattr(backend, "list_medicines", lambda c: [{"id": 1, "name": "ORS", "stock": 5}])
    assert client.get("/api/medicines").get_json() == {"medicines": [{"id": 1, "name": "ORS", "stock": 5}]}


@pytest.mark.parametrize(
    "body",
    [{}, {"name": "  ", "stock": 1}, {"name": "x" * 101, "stock": 1}, {"name": "A"}, {"name": "A", "stock": -1},
     {"name": "A", "stock": True}, {"name": "A", "stock": "5"}, {"name": "A", "stock": backend.MAX_STOCK + 1}],
)
def test_create_rejects_bad_input(client, body):
    r = client.post("/api/medicines", json=body)
    assert r.status_code == 400 and "error" in r.get_json()


def test_create_ok_and_trims_name(client, monkeypatch):
    seen = {}
    monkeypatch.setattr(backend, "add_medicine", lambda c, n, s: seen.update(n=n, s=s) or 7)
    r = client.post("/api/medicines", json={"name": " Aspirin ", "stock": 10})
    assert r.status_code == 201 and r.get_json() == {"id": 7, "name": "Aspirin", "stock": 10}
    assert seen == {"n": "Aspirin", "s": 10}


def test_create_duplicate_is_409(client, monkeypatch):
    def boom(c, n, s):
        raise pymysql.err.IntegrityError(1062, "dup")
    monkeypatch.setattr(backend, "add_medicine", boom)
    assert client.post("/api/medicines", json={"name": "A", "stock": 1}).status_code == 409


def test_database_down_is_503(monkeypatch):
    def down():
        raise pymysql.err.OperationalError(2003, "cannot connect")
    monkeypatch.setattr(backend, "connect", down)
    r = backend.app.test_client().get("/api/medicines")
    assert r.status_code == 503 and "database unavailable" in r.get_json()["error"]


@pytest.mark.parametrize("body", [{}, {"delta": 1, "stock": 1}, {"delta": "1"}, {"delta": True}])
def test_patch_needs_exactly_one_integer_field(client, body):
    assert client.patch("/api/medicines/1", json=body).status_code == 400


def test_patch_limits(client):
    assert client.patch("/api/medicines/1", json={"stock": -1}).status_code == 400
    assert client.patch("/api/medicines/1", json={"delta": backend.MAX_STOCK + 1}).status_code == 400


@pytest.mark.parametrize("status,code", [("missing", 404), ("negative", 409), ("ok", 200)])
def test_patch_status_mapping(client, monkeypatch, status, code):
    monkeypatch.setattr(backend, "adjust_stock", lambda c, i, delta=None, stock=None: (status, 3))
    assert client.patch("/api/medicines/1", json={"delta": -5}).status_code == code
