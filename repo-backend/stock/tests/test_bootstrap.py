import pytest
from django.core.management import call_command

from stock.models import Batch, PurchaseOrder, Sale, Supplier

pytestmark = pytest.mark.django_db


def test_sample_loads_lots_and_sales_and_is_repeatable():
    call_command("bootstrap_app", "--sample")
    n_batch, n_sale = Batch.objects.count(), Sale.objects.count()
    assert n_batch >= 5 and n_sale >= 20
    call_command("bootstrap_app", "--sample")  # รันซ้ำ (ArgoCD PreSync ทุกครั้งที่ deploy) ต้องไม่เพิ่มซ้ำ
    assert Batch.objects.count() == n_batch and Sale.objects.count() == n_sale
    assert Supplier.objects.count() == 3 and set(PurchaseOrder.objects.values_list("status", flat=True)) == {"received", "partial", "ordered", "draft", "cancelled"}
    call_command("bootstrap_app", "--sample")
    assert Supplier.objects.count() == 3 and PurchaseOrder.objects.count() == 5
