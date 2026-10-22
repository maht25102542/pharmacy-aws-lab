"""ตั้งค่าสำหรับเทสต์: ใช้ค่าเดียวกับ settings จริง แต่อนุญาต SECRET_KEY ปลอม และบังคับ sqlite ในหน่วยความจำ"""
import os

os.environ.setdefault("DJANGO_ALLOW_INSECURE_KEY", "1")
os.environ.pop("DB_HOST", None)

from .settings import *  # noqa: E402,F401,F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # เทสต์เร็วขึ้น (ไม่ใช้ใน production)
