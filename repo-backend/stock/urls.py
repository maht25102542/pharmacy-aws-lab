from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import accounts, views

router = DefaultRouter(trailing_slash=False)
router.register("medicines", views.MedicineViewSet, basename="medicine")
router.register("categories", views.CategoryViewSet, basename="category")
router.register("movements", views.MovementViewSet, basename="movement")
router.register("users", accounts.UserViewSet, basename="user")

urlpatterns = [
    path("auth/login", views.login),
    path("auth/logout", views.logout),
    path("auth/me", accounts.me),
    path("auth/change-password", accounts.change_password),
    path("summary", views.summary),
    path("", include(router.urls)),
]
