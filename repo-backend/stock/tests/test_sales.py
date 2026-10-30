from datetime import date, timedelta

import pytest

from stock.models import Batch, Medicine, Sale, StockMovement

pytestmark = pytest.mark.django_db


def sell(api, items, **kw):
    return api.post("/api/sales", {"items": items, **kw}, format="json")


# ---- ขาย
def test_sale_decrements_stock_and_writes_movement(api, para):
    r = sell(api, [{"medicine": para.id, "qty": 3}], payment="cash", paid="200")
    d = r.json()
    assert r.status_code == 201 and d["total"] == "105.00" and d["change"] == "95.00" and d["receipt_no"].startswith("RC-")
    para.refresh_from_db()
    assert para.stock == 17
    m = StockMovement.objects.filter(medicine=para).first()
    assert m.delta == -3 and m.reason == "dispense" and m.note == d["receipt_no"]


def test_price_comes_from_db_not_client(api, para):
    r = sell(api, [{"medicine": para.id, "qty": 1, "unit_price": "0.01"}], paid="35")
    assert r.json()["items"][0]["unit_price"] == "35.00"


def test_receipt_numbers_increment(api, para):
    a = sell(api, [{"medicine": para.id, "qty": 1}]).json()["receipt_no"]
    b = sell(api, [{"medicine": para.id, "qty": 1}]).json()["receipt_no"]
    assert a.endswith("-0001") and b.endswith("-0002")


def test_same_medicine_lines_are_merged(api, para):
    r = sell(api, [{"medicine": para.id, "qty": 2}, {"medicine": para.id, "qty": 3}])
    assert r.status_code == 201 and len(r.json()["items"]) == 1 and r.json()["items"][0]["qty"] == 5


def test_not_enough_stock_is_400_and_nothing_changes(api, para):
    r = sell(api, [{"medicine": para.id, "qty": 21}])
    assert r.status_code == 400 and r.json()["available"] == 20
    para.refresh_from_db()
    assert para.stock == 20 and Sale.objects.count() == 0


def test_validation(api, para):
    assert sell(api, []).status_code == 400
    assert sell(api, [{"medicine": para.id, "qty": 0}]).status_code == 400
    assert sell(api, [{"medicine": 9999, "qty": 1}]).status_code == 400
    assert sell(api, [{"medicine": para.id, "qty": 1}], paid="10").status_code == 400  # จ่ายไม่พอ
    assert sell(api, [{"medicine": para.id, "qty": 1}], discount="99").status_code == 400  # ลดเกินยอด
    assert sell(api, [{"medicine": para.id, "qty": 1}], payment="bitcoin").status_code == 400


def test_discount_and_transfer(api, para):
    d = sell(api, [{"medicine": para.id, "qty": 2}], discount="10", payment="transfer").json()
    assert d["subtotal"] == "70.00" and d["total"] == "60.00" and d["paid"] == "60.00" and d["change"] == "0.00"


def test_inactive_medicine_cannot_be_sold(api, para):
    para.is_active = False
    para.save()
    assert sell(api, [{"medicine": para.id, "qty": 1}]).status_code == 400


def test_sales_require_login():
    from rest_framework.test import APIClient
    assert APIClient().post("/api/sales", {}, format="json").status_code == 401


# ---- ล็อต/FEFO/หมดอายุ
def receive(api, med, qty, lot, expiry):
    return api.post(f"/api/medicines/{med.id}/adjust", {"delta": qty, "reason": "receive", "lot_no": lot, "expiry_date": expiry}, format="json")


def test_receive_creates_batch(api, para):
    r = receive(api, para, 50, "A1", (date.today() + timedelta(days=200)).isoformat())
    assert r.status_code == 200 and r.json()["stock"] == 70
    b = Batch.objects.get()
    assert b.lot_no == "A1" and b.qty_remaining == 50


def test_sale_uses_earliest_expiry_first(api, para):
    soon, later = date.today() + timedelta(days=30), date.today() + timedelta(days=300)
    receive(api, para, 10, "LATER", later.isoformat())
    receive(api, para, 10, "SOON", soon.isoformat())
    sell(api, [{"medicine": para.id, "qty": 15}])  # สต็อกเก่า 20 ไม่มีล็อต: ล็อตที่รู้วันหมดอายุถูกตัดก่อน
    left = {b.lot_no: b.qty_remaining for b in Batch.objects.all()}
    assert left == {"SOON": 0, "LATER": 5}  # SOON หมดก่อน แล้วค่อยแตะ LATER


def test_expired_stock_cannot_be_sold(api, para):
    para.stock = 0
    para.save()
    receive(api, para, 10, "OLD", (date.today() - timedelta(days=1)).isoformat())
    r = sell(api, [{"medicine": para.id, "qty": 1}])
    assert r.status_code == 400 and r.json()["available"] == 0


def test_dispose_expired_removes_expired_batch(api, para):
    receive(api, para, 10, "OLD", (date.today() - timedelta(days=5)).isoformat())
    r = api.post(f"/api/medicines/{para.id}/adjust", {"delta": -10, "reason": "expired"}, format="json")
    assert r.status_code == 200 and Batch.objects.get().qty_remaining == 0


def test_expiry_report(api, para):
    receive(api, para, 5, "X", (date.today() + timedelta(days=10)).isoformat())
    receive(api, para, 5, "Y", (date.today() - timedelta(days=2)).isoformat())
    receive(api, para, 5, "Z", (date.today() + timedelta(days=400)).isoformat())
    d = api.get("/api/reports/expiry?days=30").json()
    assert d["count"] == 2 and d["results"][0]["lot_no"] == "Y" and d["results"][0]["expired"] is True and d["results"][1]["days_left"] == 10


# ---- ยกเลิกบิล
def test_void_restores_stock_and_batches(api, staff_api, para):
    receive(api, para, 10, "B1", (date.today() + timedelta(days=60)).isoformat())
    s = sell(api, [{"medicine": para.id, "qty": 25}]).json()  # ใช้ B1 ทั้ง 10 + สต็อกเก่า 15
    assert Batch.objects.get().qty_remaining == 0
    r = staff_api.post(f"/api/sales/{s['id']}/void", {"reason": "ลูกค้าเปลี่ยนใจ"}, format="json")
    assert r.status_code == 200 and r.json()["status"] == "void" and r.json()["void_reason"] == "ลูกค้าเปลี่ยนใจ"
    para.refresh_from_db()
    assert para.stock == 30 and Batch.objects.get().qty_remaining == 10
    assert staff_api.post(f"/api/sales/{s['id']}/void", {}, format="json").status_code == 400  # ยกเลิกซ้ำไม่ได้


def test_clerk_cannot_void(api, para):
    s = sell(api, [{"medicine": para.id, "qty": 1}]).json()
    assert api.post(f"/api/sales/{s['id']}/void", {}, format="json").status_code == 403


def test_list_filters(api, para):
    sell(api, [{"medicine": para.id, "qty": 1}], customer_name="คุณสมศรี")
    sell(api, [{"medicine": para.id, "qty": 1}])
    assert api.get("/api/sales").json()["count"] == 2
    assert api.get("/api/sales?q=สมศรี").json()["count"] == 1
    assert api.get("/api/sales?date_from=2999-01-01").json()["count"] == 0
    assert api.get("/api/sales?status=void").json()["count"] == 0


# ---- รายงาน/สรุป
def test_sales_report_staff_only_and_totals(api, staff_api, para):
    sell(api, [{"medicine": para.id, "qty": 2}])
    sell(api, [{"medicine": para.id, "qty": 1}])
    assert api.get("/api/reports/sales").status_code == 403
    d = staff_api.get("/api/reports/sales?days=7").json()
    assert len(d["days"]) == 7 and d["totals"]["count"] == 2 and d["totals"]["total"] == "105.00" and d["totals"]["average"] == "52.50"
    assert d["top"][0]["sku"] == "PCM500" and d["top"][0]["qty"] == 3 and d["days"][-1]["count"] == 2


def test_void_excluded_from_report_and_summary(api, staff_api, para):
    s = sell(api, [{"medicine": para.id, "qty": 2}]).json()
    staff_api.post(f"/api/sales/{s['id']}/void", {}, format="json")
    assert staff_api.get("/api/reports/sales").json()["totals"]["count"] == 0
    assert api.get("/api/summary").json()["sales_today"] == {"count": 0, "total": "0.00"}


def test_summary_has_sales_and_expiry(api, para):
    sell(api, [{"medicine": para.id, "qty": 2}])
    receive(api, para, 5, "S", (date.today() + timedelta(days=10)).isoformat())
    d = api.get("/api/summary").json()
    assert d["sales_today"] == {"count": 1, "total": "70.00"} and d["expiring_30"] == 1 and d["expired"] == 0
