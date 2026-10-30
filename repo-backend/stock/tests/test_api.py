import pytest
from rest_framework.test import APIClient

from stock.models import Medicine, StockMovement

pytestmark = pytest.mark.django_db


# ---- auth
def test_endpoints_require_login():
    c = APIClient()
    for url in ("/api/medicines", "/api/categories", "/api/movements", "/api/summary", "/api/auth/me"):
        assert c.get(url).status_code == 401


def test_login_returns_token_then_token_works(clerk):
    c = APIClient()
    r = c.post("/api/auth/login", {"username": "clerk", "password": "Str0ng-Passw0rd!"}, format="json")
    u = r.json()["user"]
    assert r.status_code == 200 and u["username"] == "clerk" and u["role"] == "clerk" and u["is_staff"] is False
    c.credentials(HTTP_AUTHORIZATION="Token " + r.json()["token"])
    assert c.get("/api/auth/me").json()["username"] == "clerk"


def test_login_wrong_password_is_401(clerk):
    r = APIClient().post("/api/auth/login", {"username": "clerk", "password": "nope"}, format="json")
    assert r.status_code == 401 and "token" not in r.json()


def test_login_is_throttled(clerk):
    c = APIClient()
    codes = [c.post("/api/auth/login", {"username": "clerk", "password": "x"}, format="json").status_code for _ in range(12)]
    assert codes[-1] == 429


def test_logout_deletes_token(clerk):
    c = APIClient()
    tok = c.post("/api/auth/login", {"username": "clerk", "password": "Str0ng-Passw0rd!"}, format="json").json()["token"]
    c.credentials(HTTP_AUTHORIZATION="Token " + tok)
    assert c.post("/api/auth/logout").status_code == 204
    assert c.get("/api/auth/me").status_code == 401


# ---- medicines
def test_create_and_list(api, cat):
    r = api.post("/api/medicines", {"sku": "IBU400", "name": "Ibuprofen 400 mg", "category": cat.id, "price": "58.00", "reorder_level": 20}, format="json")
    assert r.status_code == 201 and r.json()["stock"] == 0 and r.json()["category_name"] == "Pain relief"
    lst = api.get("/api/medicines").json()
    assert lst["count"] == 1 and lst["results"][0]["sku"] == "IBU400"


def test_create_validates(api):
    assert api.post("/api/medicines", {"sku": "X", "name": ""}, format="json").status_code == 400
    assert api.post("/api/medicines", {"sku": "X", "name": "x", "price": "-1"}, format="json").status_code == 400


def test_stock_cannot_be_set_directly(api, para):
    r = api.patch(f"/api/medicines/{para.id}", {"stock": 999, "name": "Renamed"}, format="json")
    assert r.status_code == 200 and r.json()["stock"] == 20 and r.json()["name"] == "Renamed"


def test_duplicate_sku_rejected(api, para):
    assert api.post("/api/medicines", {"sku": "PCM500", "name": "dup"}, format="json").status_code == 400


def test_search_filter_and_pagination(api, cat):
    for i in range(25):
        Medicine.objects.create(sku=f"S{i:02}", name=f"Drug {i:02}", category=cat, stock=i, reorder_level=5)
    assert api.get("/api/medicines").json()["count"] == 25
    assert len(api.get("/api/medicines").json()["results"]) == 10
    assert len(api.get("/api/medicines?page=3").json()["results"]) == 5
    assert api.get("/api/medicines?q=drug 07").json()["count"] == 1
    assert api.get("/api/medicines?q=S07").json()["count"] == 1
    assert api.get("/api/medicines?low_stock=1").json()["count"] == 6  # stock 0..5
    assert api.get(f"/api/medicines?category={cat.id}").json()["count"] == 25
    assert api.get("/api/medicines?category=9999").json()["count"] == 0


def test_delete_is_staff_only(api, staff_api, para):
    assert api.delete(f"/api/medicines/{para.id}").status_code == 403
    assert staff_api.delete(f"/api/medicines/{para.id}").status_code == 204


# ---- adjust stock
def test_adjust_up_and_down_records_history(api, para, clerk):
    r = api.post(f"/api/medicines/{para.id}/adjust", {"delta": 5, "reason": "receive", "note": "PO-1"}, format="json")
    assert r.status_code == 200 and r.json()["stock"] == 25
    r = api.post(f"/api/medicines/{para.id}/adjust", {"delta": -7, "reason": "dispense"}, format="json")
    assert r.json()["stock"] == 18
    mv = list(StockMovement.objects.filter(medicine=para).order_by("id"))
    assert [(m.delta, m.stock_after, m.reason, m.created_by) for m in mv] == [(5, 25, "receive", clerk), (-7, 18, "dispense", clerk)]


def test_adjust_cannot_go_negative(api, para):
    r = api.post(f"/api/medicines/{para.id}/adjust", {"delta": -21}, format="json")
    assert r.status_code == 400 and r.json()["stock"] == 20
    para.refresh_from_db()
    assert para.stock == 20 and not StockMovement.objects.exists()


@pytest.mark.parametrize("body", [{"delta": 0}, {"delta": "abc"}, {}, {"delta": 1, "reason": "gift"}, {"delta": 2_000_000}])
def test_adjust_rejects_bad_input(api, para, body):
    assert api.post(f"/api/medicines/{para.id}/adjust", body, format="json").status_code == 400


def test_adjust_missing_medicine_404(api):
    assert api.post("/api/medicines/999/adjust", {"delta": 1}, format="json").status_code == 404


def test_adjust_cannot_exceed_max(api, para):
    r = api.post(f"/api/medicines/{para.id}/adjust", {"delta": 1_000_000}, format="json")
    assert r.status_code == 400


# ---- movements, summary, categories
def test_movements_list_and_filter(api, para):
    other = Medicine.objects.create(sku="O1", name="Other", stock=1)
    api.post(f"/api/medicines/{para.id}/adjust", {"delta": 1}, format="json")
    api.post(f"/api/medicines/{other.id}/adjust", {"delta": 1}, format="json")
    assert api.get("/api/movements").json()["count"] == 2
    r = api.get(f"/api/movements?medicine={para.id}").json()
    assert r["count"] == 1 and r["results"][0]["medicine_sku"] == "PCM500" and r["results"][0]["created_by_name"] == "clerk"


def test_summary(api, para):
    Medicine.objects.create(sku="Z", name="Zero", price="10", stock=0, reorder_level=5)
    Medicine.objects.create(sku="OFF", name="Inactive", stock=0, is_active=False)
    r = api.get("/api/summary").json()
    assert r.pop("served_by")
    assert r == {"medicines": 2, "low_stock": 1, "out_of_stock": 1, "stock_value": "700.00", "sales_today": {"count": 0, "total": "0.00"}, "expiring_30": 0, "expired": 0, "open_orders": 0}


def test_categories_write_staff_only(api, staff_api):
    assert api.post("/api/categories", {"name": "Vitamins"}, format="json").status_code == 403
    assert staff_api.post("/api/categories", {"name": "Vitamins"}, format="json").status_code == 201
    assert [c["name"] for c in api.get("/api/categories").json()] == ["Vitamins"]


# ---- health, errors, bootstrap
def test_health_needs_no_login_or_db():
    r = APIClient().get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_ready_ok_and_503(monkeypatch):
    assert APIClient().get("/api/ready").status_code == 200
    from django.db import connection

    def boom(*a, **k):
        raise RuntimeError("secret detail")
    monkeypatch.setattr(connection, "cursor", boom)
    r = APIClient().get("/api/ready")
    assert r.status_code == 503 and "secret" not in r.content.decode()


def test_unknown_route_404_and_bad_json_400(api):
    assert api.get("/api/nope").status_code == 404
    assert api.post("/api/medicines", "{bad", content_type="application/json").status_code == 400


def test_bootstrap_is_idempotent(monkeypatch):
    from django.contrib.auth import get_user_model
    from django.core.management import call_command

    monkeypatch.setenv("DJANGO_ADMIN_PASSWORD", "Another-Str0ng-Pw!")
    call_command("bootstrap_app", "--sample")
    call_command("bootstrap_app", "--sample")
    assert get_user_model().objects.filter(username="admin", is_superuser=True).count() == 1
    assert Medicine.objects.count() == 9
