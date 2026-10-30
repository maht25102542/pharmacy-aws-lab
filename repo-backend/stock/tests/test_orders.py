from datetime import date, timedelta

import pytest

from stock.models import Batch, Medicine, PurchaseOrder, StockMovement, Supplier

pytestmark = pytest.mark.django_db


@pytest.fixture
def sup():
    return Supplier.objects.create(name="บริษัท ยาดี จำกัด", contact_name="คุณสมหญิง", phone="02-111-2222")


def mk_po(staff_api, sup, para, qty=50, cost="20.00"):
    r = staff_api.post("/api/purchase-orders", {"supplier": sup.id, "items": [{"medicine": para.id, "qty": qty, "unit_cost": cost}]}, format="json")
    assert r.status_code == 201, r.json()
    return r.json()


# ---- ผู้จัดจำหน่าย
def test_supplier_crud_staff_only(api, staff_api):
    assert api.post("/api/suppliers", {"name": "X"}, format="json").status_code == 403
    r = staff_api.post("/api/suppliers", {"name": "Pharma Co", "phone": "081"}, format="json")
    assert r.status_code == 201 and r.json()["open_orders"] == 0
    assert api.get("/api/suppliers").json()["count"] == 1  # พนักงานอ่านได้
    assert staff_api.post("/api/suppliers", {"name": "Pharma Co"}, format="json").status_code == 400  # ชื่อซ้ำ
    assert staff_api.patch(f"/api/suppliers/{r.json()['id']}", {"is_active": False}, format="json").json()["is_active"] is False


def test_supplier_with_orders_cannot_be_deleted(staff_api, sup, para):
    mk_po(staff_api, sup, para)
    r = staff_api.delete(f"/api/suppliers/{sup.id}")
    assert r.status_code == 400 and Supplier.objects.filter(pk=sup.id).exists()
    other = Supplier.objects.create(name="ไม่มีประวัติ")
    assert staff_api.delete(f"/api/suppliers/{other.id}").status_code == 204


def test_supplier_search(staff_api, sup):
    assert staff_api.get("/api/suppliers?q=ยาดี").json()["count"] == 1
    assert staff_api.get("/api/suppliers?q=ไม่มี").json()["count"] == 0


# ---- สร้าง PO
def test_create_po_total_and_number(staff_api, sup, para):
    po = mk_po(staff_api, sup, para, qty=50, cost="20.50")
    assert po["status"] == "draft" and po["total"] == "1025.00" and po["po_no"].startswith("PO-") and po["po_no"].endswith("-0001")
    assert mk_po(staff_api, sup, para)["po_no"].endswith("-0002")


def test_clerk_cannot_create_or_order(api, staff_api, sup, para):
    assert api.post("/api/purchase-orders", {"supplier": sup.id, "items": [{"medicine": para.id, "qty": 1, "unit_cost": "1"}]}, format="json").status_code == 403
    po = mk_po(staff_api, sup, para)
    assert api.post(f"/api/purchase-orders/{po['id']}/order").status_code == 403


def test_create_validation(staff_api, sup, para):
    bad = lambda body: staff_api.post("/api/purchase-orders", body, format="json").status_code  # noqa: E731
    assert bad({"supplier": sup.id, "items": []}) == 400
    assert bad({"supplier": 999, "items": [{"medicine": para.id, "qty": 1, "unit_cost": "1"}]}) == 400
    assert bad({"supplier": sup.id, "items": [{"medicine": 999, "qty": 1, "unit_cost": "1"}]}) == 400
    assert bad({"supplier": sup.id, "items": [{"medicine": para.id, "qty": 0, "unit_cost": "1"}]}) == 400
    assert bad({"supplier": sup.id, "items": [{"medicine": para.id, "qty": 1, "unit_cost": "-1"}]}) == 400
    assert bad({"supplier": sup.id, "items": [{"medicine": para.id, "qty": 1, "unit_cost": "1"}, {"medicine": para.id, "qty": 2, "unit_cost": "1"}]}) == 400
    sup.is_active = False
    sup.save()
    assert bad({"supplier": sup.id, "items": [{"medicine": para.id, "qty": 1, "unit_cost": "1"}]}) == 400


# ---- flow
def test_order_then_receive_partial_then_full(api, staff_api, sup, para):
    po = mk_po(staff_api, sup, para, qty=50, cost="20.00")
    assert staff_api.post(f"/api/purchase-orders/{po['id']}/receive", {"items": [{"item": po["items"][0]["id"], "qty": 1}]}, format="json").status_code == 400  # ยังเป็นร่าง
    assert staff_api.post(f"/api/purchase-orders/{po['id']}/order").json()["status"] == "ordered"
    assert staff_api.post(f"/api/purchase-orders/{po['id']}/order").status_code == 400  # สั่งซ้ำไม่ได้
    iid = po["items"][0]["id"]
    exp = (date.today() + timedelta(days=365)).isoformat()
    r = api.post(f"/api/purchase-orders/{po['id']}/receive", {"items": [{"item": iid, "qty": 30, "lot_no": "LOT-A", "expiry_date": exp}]}, format="json")  # พนักงานรับของได้
    assert r.status_code == 200 and r.json()["status"] == "partial" and r.json()["items"][0]["qty_received"] == 30
    para.refresh_from_db()
    assert para.stock == 50  # 20 เดิม + 30
    b = Batch.objects.get()
    assert b.lot_no == "LOT-A" and b.qty_remaining == 30 and str(b.cost) == "20.00"
    m = StockMovement.objects.filter(medicine=para, reason="receive").first()
    assert m.delta == 30 and m.note == po["po_no"]
    r = api.post(f"/api/purchase-orders/{po['id']}/receive", {"items": [{"item": iid, "qty": 20}]}, format="json")
    assert r.json()["status"] == "received" and r.json()["received_at"]
    para.refresh_from_db()
    assert para.stock == 70
    assert api.post(f"/api/purchase-orders/{po['id']}/receive", {"items": [{"item": iid, "qty": 1}]}, format="json").status_code == 400  # ปิดแล้ว


def test_cannot_receive_more_than_ordered(staff_api, sup, para):
    po = mk_po(staff_api, sup, para, qty=10)
    staff_api.post(f"/api/purchase-orders/{po['id']}/order")
    r = staff_api.post(f"/api/purchase-orders/{po['id']}/receive", {"items": [{"item": po["items"][0]["id"], "qty": 11}]}, format="json")
    assert r.status_code == 400 and r.json()["remaining"] == 10
    para.refresh_from_db()
    assert para.stock == 20 and Batch.objects.count() == 0  # ไม่เปลี่ยนอะไรเลย


def test_cancel_rules(staff_api, sup, para):
    a = mk_po(staff_api, sup, para)
    assert staff_api.post(f"/api/purchase-orders/{a['id']}/cancel").json()["status"] == "cancelled"
    assert staff_api.post(f"/api/purchase-orders/{a['id']}/cancel").status_code == 400
    b = mk_po(staff_api, sup, para)
    staff_api.post(f"/api/purchase-orders/{b['id']}/order")
    staff_api.post(f"/api/purchase-orders/{b['id']}/receive", {"items": [{"item": b["items"][0]["id"], "qty": 1}]}, format="json")
    assert staff_api.post(f"/api/purchase-orders/{b['id']}/cancel").status_code == 400  # รับของไปแล้ว


def test_delete_only_draft(staff_api, sup, para):
    a = mk_po(staff_api, sup, para)
    assert staff_api.delete(f"/api/purchase-orders/{a['id']}").status_code == 204
    b = mk_po(staff_api, sup, para)
    staff_api.post(f"/api/purchase-orders/{b['id']}/order")
    assert staff_api.delete(f"/api/purchase-orders/{b['id']}").status_code == 400


def test_list_filters_and_open_orders(api, staff_api, sup, para):
    a = mk_po(staff_api, sup, para)
    b = mk_po(staff_api, sup, para)
    staff_api.post(f"/api/purchase-orders/{b['id']}/order")
    assert api.get("/api/purchase-orders").json()["count"] == 2
    assert api.get("/api/purchase-orders?status=ordered").json()["count"] == 1
    assert api.get(f"/api/purchase-orders?q={a['po_no']}").json()["count"] == 1
    assert api.get(f"/api/purchase-orders?supplier={sup.id}").json()["count"] == 2
    assert api.get("/api/summary").json()["open_orders"] == 1
    assert api.get(f"/api/suppliers/{sup.id}").json()["open_orders"] == 1


# ---- แนะนำสั่งซื้อ
def test_reorder_suggestions_subtract_on_order(api, staff_api, sup, cat):
    low = Medicine.objects.create(sku="LOW1", name="ยาใกล้หมด", category=cat, price="100", stock=4, reorder_level=10)
    Medicine.objects.create(sku="OK1", name="ยาปกติ", category=cat, price="10", stock=500, reorder_level=10)
    s = api.get("/api/reorder-suggestions").json()
    assert len(s) == 1 and s[0]["sku"] == "LOW1" and s[0]["suggested_qty"] == 26 and s[0]["on_order"] == 0 and s[0]["last_cost"] == "70.00"
    po = staff_api.post("/api/purchase-orders", {"supplier": sup.id, "items": [{"medicine": low.id, "qty": 26, "unit_cost": "70"}]}, format="json").json()
    staff_api.post(f"/api/purchase-orders/{po['id']}/order")
    assert api.get("/api/reorder-suggestions").json() == []  # สั่งไปแล้วครบ ไม่แนะนำซ้ำ
