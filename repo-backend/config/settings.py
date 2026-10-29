"""ตั้งค่า Django: ทุกอย่างที่เปลี่ยนตามเครื่อง/สภาพแวดล้อมอ่านจาก environment variable
(ใน Kubernetes มาจาก deployment.yaml และ Secret db-credentials ไม่มีรหัสผ่านในโค้ด)"""
import logging
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def env(name, default=None):
    return os.environ.get(name, default)


def env_bool(name, default=False):
    return env(name, str(default)).lower() in ("1", "true", "yes")


DEBUG = env_bool("DJANGO_DEBUG", False)
APP_VERSION = env("APP_VERSION", "dev")

# production ต้องตั้ง SECRET_KEY เอง: ลืมตั้งแล้วแอปไม่ยอมเริ่ม (ดีกว่าเงียบๆ ใช้ค่าตั้งต้นที่ใครก็รู้)
SECRET_KEY = env("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG and not env_bool("DJANGO_ALLOW_INSECURE_KEY", False):
        raise RuntimeError("DJANGO_SECRET_KEY is required when DJANGO_DEBUG is off")
    SECRET_KEY = "insecure-local-only"

ALLOWED_HOSTS = [h.strip() for h in env("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "drf_spectacular",
    "drf_spectacular_sidecar",  # ไฟล์ Swagger UI มากับแพ็กเกจ ไม่โหลดจาก CDN (ใช้ใน VPC ที่ออกเน็ตไม่ได้)
    "stock",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # เสิร์ฟไฟล์ static ของ admin เอง ไม่ต้องมี nginx
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

# ไม่ตั้ง DB_HOST = ใช้ sqlite (เทสต์/ลองบนเครื่อง) · ตั้ง DB_HOST = MariaDB (Galera ใน lab)
if env("DB_HOST"):
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.mysql",
        "HOST": env("DB_HOST"),
        "PORT": env("DB_PORT", "3306"),
        "NAME": env("DB_NAME", "pharmacy"),
        "USER": env("DB_USER", "pharmacy"),
        "PASSWORD": env("DB_PASSWORD", ""),
        "CONN_MAX_AGE": 60,  # ใช้ connection ซ้ำ 60 วินาที ไม่ต่อใหม่ทุกคำขอ
        "OPTIONS": {"charset": "utf8mb4", "connect_timeout": 5},
    }}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": env("SQLITE_PATH", str(BASE_DIR / "db.sqlite3"))}}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Bangkok"
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"  # docker build รัน collectstatic ลงที่นี่ ตอนรันไม่ต้องเขียนไฟล์
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.TokenAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {"login": "10/min"},  # กันเดารหัสผ่านรัวๆ
}

# log ออก stdout เท่านั้น: Kubernetes เก็บให้เอง (kubectl logs) ไม่เขียนไฟล์ลง container
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", "INFO")},
}
logging.captureWarnings(True)

SPECTACULAR_SETTINGS = {
    "TITLE": "Pharmacy Stock API",
    "DESCRIPTION": "API ระบบสต็อกร้านยา: ยา หมวดหมู่ การรับเข้า/จ่ายออก และการจัดการผู้ใช้\n\n"
                   "วิธีทดลอง: POST /api/auth/login เอา token ที่ได้ไปใส่ปุ่ม Authorize ด้วยรูปแบบ `Token <token>`",
    "VERSION": APP_VERSION,
    "SERVE_INCLUDE_SCHEMA": False,
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
    "COMPONENT_SPLIT_REQUEST": True,
    "SWAGGER_UI_SETTINGS": {"persistAuthorization": True, "displayRequestDuration": True},
}
