from django.conf import settings
from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    """liveness: แอปยังตอบอยู่ไหม (ไม่แตะ DB เพื่อไม่ให้ DB ล่มแล้ว pod ถูกรีสตาร์ททั้งหมด)"""
    return JsonResponse({"status": "ok", "version": settings.APP_VERSION})


def ready(_request):
    """readiness: พร้อมรับ traffic ก็ต่อเมื่อต่อ DB ได้"""
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
    except Exception as exc:  # noqa: BLE001 - ทุกข้อผิดพลาดของ DB = ยังไม่พร้อม
        return JsonResponse({"status": "not ready", "error": exc.__class__.__name__}, status=503)
    return JsonResponse({"status": "ready"})


urlpatterns = [
    path("api/health", health),
    path("api/ready", ready),
    path("api/", include("stock.urls")),
    path("admin/", admin.site.urls),
]
