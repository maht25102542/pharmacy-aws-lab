import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

from stock.models import Category, Medicine


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()  # โควตา login นับใน cache: ล้างทุกเทสต์ไม่ให้ชนกัน


@pytest.fixture
def staff(db):
    return get_user_model().objects.create_user("pharmacist", password="Str0ng-Passw0rd!", is_staff=True)


@pytest.fixture
def clerk(db):
    return get_user_model().objects.create_user("clerk", password="Str0ng-Passw0rd!")


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def api(clerk):
    return client_for(clerk)


@pytest.fixture
def staff_api(staff):
    return client_for(staff)


@pytest.fixture
def cat(db):
    return Category.objects.create(name="Pain relief")


@pytest.fixture
def para(cat):
    return Medicine.objects.create(sku="PCM500", name="Paracetamol 500 mg", category=cat, price="35.00", stock=20, reorder_level=10)
