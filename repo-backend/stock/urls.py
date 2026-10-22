from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter(trailing_slash=False)
router.register("medicines", views.MedicineViewSet, basename="medicine")
router.register("categories", views.CategoryViewSet, basename="category")
router.register("movements", views.MovementViewSet, basename="movement")

urlpatterns = [
    path("auth/login", views.login),
    path("auth/logout", views.logout),
    path("auth/me", views.me),
    path("summary", views.summary),
    path("", include(router.urls)),
]
