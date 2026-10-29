import pytest
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from conftest import client_for

pytestmark = pytest.mark.django_db
U = get_user_model()
GOOD = "Str0ng-Passw0rd!"


@pytest.fixture
def admin(db):
    return U.objects.create_superuser("boss", password=GOOD)


@pytest.fixture
def admin_api(admin):
    return client_for(admin)


# ---- สิทธิ์: เฉพาะ admin จัดการผู้ใช้ได้
def test_only_admin_can_use_users_api(api, staff_api, admin_api):
    assert APIClient().get("/api/users").status_code == 401
    assert api.get("/api/users").status_code == 403
    assert staff_api.get("/api/users").status_code == 403
    assert admin_api.get("/api/users").status_code == 200


def test_admin_creates_user_with_role(admin_api):
    r = admin_api.post("/api/users", {"username": "somsri", "first_name": "สมศรี", "role": "pharmacist", "password": GOOD}, format="json")
    assert r.status_code == 201 and r.json()["role"] == "pharmacist" and "password" not in r.json()
    u = U.objects.get(username="somsri")
    assert u.is_staff and not u.is_superuser and u.check_password(GOOD)
    # ล็อกอินด้วยบัญชีใหม่ได้จริง และ role ติดมากับ login
    login = APIClient().post("/api/auth/login", {"username": "somsri", "password": GOOD}, format="json").json()
    assert login["user"]["role"] == "pharmacist" and login["user"]["full_name"] == "สมศรี"


def test_create_requires_strong_password_and_unique_username(admin_api, clerk):
    assert admin_api.post("/api/users", {"username": "x1", "password": "short"}, format="json").status_code == 400
    assert admin_api.post("/api/users", {"username": "x2"}, format="json").status_code == 400  # ไม่ใส่รหัส
    assert admin_api.post("/api/users", {"username": "clerk", "password": GOOD}, format="json").status_code == 400


def test_change_role_and_deactivate_revokes_token(admin_api, clerk):
    Token.objects.create(user=clerk)
    r = admin_api.patch(f"/api/users/{clerk.pk}", {"role": "pharmacist"}, format="json")
    assert r.status_code == 200 and r.json()["role"] == "pharmacist"
    r = admin_api.patch(f"/api/users/{clerk.pk}", {"is_active": False}, format="json")
    assert r.status_code == 200 and not Token.objects.filter(user=clerk).exists()
    bad = APIClient().post("/api/auth/login", {"username": "clerk", "password": GOOD}, format="json")
    assert bad.status_code == 401  # บัญชีที่ปิดแล้วล็อกอินไม่ได้


def test_admin_resets_password(admin_api, clerk):
    Token.objects.create(user=clerk)
    assert admin_api.patch(f"/api/users/{clerk.pk}", {"password": "New-Passw0rd-123"}, format="json").status_code == 200
    clerk.refresh_from_db()
    assert clerk.check_password("New-Passw0rd-123") and not Token.objects.filter(user=clerk).exists()


# ---- กันพลาด: ไม่ให้ระบบไม่เหลือแอดมิน
def test_cannot_demote_deactivate_or_delete_self(admin_api, admin):
    assert admin_api.patch(f"/api/users/{admin.pk}", {"role": "clerk"}, format="json").status_code == 400
    assert admin_api.patch(f"/api/users/{admin.pk}", {"is_active": False}, format="json").status_code == 400
    assert admin_api.delete(f"/api/users/{admin.pk}").status_code == 400


def test_cannot_remove_last_admin_but_can_when_another_exists(admin_api):
    other = U.objects.create_superuser("boss2", password=GOOD)
    assert admin_api.patch(f"/api/users/{other.pk}", {"role": "clerk"}, format="json").status_code == 200  # ยังเหลือ boss
    last = U.objects.get(username="boss")
    c2 = client_for(U.objects.create_superuser("boss3", password=GOOD))
    assert c2.delete(f"/api/users/{other.pk}").status_code == 204
    # เหลือ boss กับ boss3: ลบ boss ได้ แต่แล้ว boss3 จะเป็น admin คนสุดท้าย ห้ามลบ
    assert c2.delete(f"/api/users/{last.pk}").status_code == 204
    assert c2.delete(f"/api/users/{U.objects.get(username='boss3').pk}").status_code == 400


def test_delete_user_keeps_stock_history(admin_api, para, clerk):
    c = client_for(clerk)
    assert c.post(f"/api/medicines/{para.pk}/adjust", {"delta": 5, "reason": "receive"}, format="json").status_code == 200
    assert admin_api.delete(f"/api/users/{clerk.pk}").status_code == 204
    mv = admin_api.get("/api/movements").json()["results"][0]
    assert mv["created_by_name"] is None and mv["delta"] == 5


# ---- โปรไฟล์ / เปลี่ยนรหัสผ่านของตัวเอง
def test_me_patch_updates_name_but_not_role(api, clerk):
    r = api.patch("/api/auth/me", {"first_name": "Mali", "role": "admin", "is_staff": True}, format="json")
    assert r.status_code == 200 and r.json()["first_name"] == "Mali" and r.json()["role"] == "clerk"
    clerk.refresh_from_db()
    assert not clerk.is_staff and not clerk.is_superuser


def test_change_password_flow(clerk):
    c = APIClient()
    token = c.post("/api/auth/login", {"username": "clerk", "password": GOOD}, format="json").json()["token"]
    c.credentials(HTTP_AUTHORIZATION="Token " + token)
    assert c.post("/api/auth/change-password", {"old_password": "wrong", "new_password": "Another-Passw0rd-9"}, format="json").status_code == 400
    assert c.post("/api/auth/change-password", {"old_password": GOOD, "new_password": "123"}, format="json").status_code == 400
    assert c.post("/api/auth/change-password", {"old_password": GOOD, "new_password": "Another-Passw0rd-9"}, format="json").status_code == 204
    assert c.get("/api/auth/me").status_code == 401  # token เดิมถูกยกเลิก
    assert APIClient().post("/api/auth/login", {"username": "clerk", "password": "Another-Passw0rd-9"}, format="json").status_code == 200


# ---- Swagger / OpenAPI
def test_swagger_and_schema_are_public_and_complete():
    c = APIClient()
    r = c.get("/api/docs")
    assert r.status_code == 200 and b"swagger" in r.content.lower()
    schema = c.get("/api/schema", {"format": "json"}).json()
    paths = schema["paths"]
    for p in ("/api/auth/login", "/api/auth/change-password", "/api/users", "/api/users/{id}", "/api/medicines", "/api/medicines/{id}/adjust", "/api/movements", "/api/summary"):
        assert p in paths, p
    assert "tokenAuth" in schema["components"]["securitySchemes"]
    assert c.get("/api/redoc").status_code == 200
