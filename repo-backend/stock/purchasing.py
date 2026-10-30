"""ใบสั่งซื้อ/รับของเข้าคลัง: รับของ = เปิดล็อต + เพิ่มสต็อก + บันทึก StockMovement ใน transaction เดียว (ใช้ตรรกะเดียวกับ /adjust รับเข้า)"""
from datetime import date
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from .models import Batch, Medicine, PurchaseOrder, PurchaseOrderItem, StockMovement
from .serializers import MAX_STOCK

OPEN = ("ordered", "partial")


class POError(Exception):
    def __init__(self, detail, **extra):
        super().__init__(detail)
        self.detail, self.extra = detail, extra


def next_po_no(day):
    n = PurchaseOrder.objects.filter(po_no__startswith=f"PO-{day:%Y%m%d}-").count() + 1
    return f"PO-{day:%Y%m%d}-{n:04d}"


def create_po(user, supplier, items, expected_date=None, note=""):
    if not supplier.is_active:
        raise POError("supplier is inactive")
    merged = {}
    for it in items:
        k = it["medicine"]
        if k in merged:
            raise POError("duplicate medicine in items", medicine=k)
        merged[k] = it
    for attempt in range(3):
        try:
            with transaction.atomic():
                meds = {m.id: m for m in Medicine.objects.filter(id__in=merged)}
                po = PurchaseOrder.objects.create(po_no=next_po_no(timezone.localdate()), supplier=supplier, expected_date=expected_date, note=note, created_by=user)
                total = Decimal("0")
                for mid, it in merged.items():
                    m = meds.get(mid)
                    if m is None:
                        raise POError("medicine not found", medicine=mid)
                    cost = Decimal(str(it["unit_cost"]))
                    PurchaseOrderItem.objects.create(po=po, medicine=m, sku=m.sku, name=m.name, qty_ordered=it["qty"], unit_cost=cost)
                    total += cost * it["qty"]
                po.total = total.quantize(Decimal("0.01"))
                po.save(update_fields=["total"])
                return po
        except IntegrityError:
            if attempt == 2:
                raise
    raise POError("could not allocate PO number")


def mark_ordered(po):
    if po.status != "draft":
        raise POError("only a draft can be ordered")
    po.status, po.ordered_at = "ordered", timezone.now()
    po.save(update_fields=["status", "ordered_at"])
    return po


def cancel(po):
    if po.status not in ("draft", "ordered"):
        raise POError("only a draft or an ordered PO with nothing received can be cancelled")
    po.status = "cancelled"
    po.save(update_fields=["status"])
    return po


def receive(user, po, lines):
    """lines = [{"item": id, "qty": n, "lot_no": "", "expiry_date": date|None}] · รับได้ไม่เกินที่ค้าง"""
    with transaction.atomic():
        po = PurchaseOrder.objects.select_for_update().get(pk=po.pk)
        if po.status not in OPEN:
            raise POError("this PO is not open for receiving", status=po.status)
        items = {i.id: i for i in po.items.select_for_update()}
        seen = set()
        for ln in lines:
            it = items.get(ln["item"])
            if it is None or it.id in seen:
                raise POError("invalid or duplicate item", item=ln["item"])
            seen.add(it.id)
            if ln["qty"] > it.qty_ordered - it.qty_received:
                raise POError("receiving more than ordered", item=it.id, remaining=it.qty_ordered - it.qty_received)
            med = Medicine.objects.select_for_update().get(pk=it.medicine_id)
            if med.stock + ln["qty"] > MAX_STOCK:
                raise POError(f"stock cannot exceed {MAX_STOCK}", item=it.id)
            Batch.objects.create(medicine=med, lot_no=ln.get("lot_no") or f"{po.po_no[-13:]}", expiry_date=ln.get("expiry_date"), qty_received=ln["qty"], qty_remaining=ln["qty"], cost=it.unit_cost, created_by=user)
            med.stock += ln["qty"]
            med.save(update_fields=["stock", "updated_at"])
            StockMovement.objects.create(medicine=med, delta=ln["qty"], stock_after=med.stock, reason="receive", note=po.po_no, created_by=user)
            it.qty_received += ln["qty"]
            it.save(update_fields=["qty_received"])
        full = all(i.qty_received >= i.qty_ordered for i in items.values())
        po.status = "received" if full else "partial"
        if full:
            po.received_at = timezone.now()
        po.save(update_fields=["status", "received_at"])
        return po


def on_order(med_id):
    """จำนวนที่สั่งไปแล้วแต่ยังไม่ได้รับ (เฉพาะ PO ที่เปิดอยู่)"""
    qs = PurchaseOrderItem.objects.filter(medicine_id=med_id, po__status__in=OPEN)
    return sum(i.qty_ordered - i.qty_received for i in qs)


def suggestions():
    """ยาที่ถึงจุดสั่งซื้อ: แนะนำให้สั่งถึง 3 เท่าของจุดสั่งซื้อ หักของที่สั่งค้างอยู่ · ต้นทุนล่าสุดจากล็อตล่าสุด"""
    out = []
    for m in Medicine.objects.filter(is_active=True):
        if m.stock > m.reorder_level:
            continue
        pending = on_order(m.id)
        need = max(m.reorder_level * 3 - m.stock - pending, 0)
        if need == 0:
            continue
        last = Batch.objects.filter(medicine=m).order_by("-id").first()
        out.append({"medicine": m.id, "sku": m.sku, "name": m.name, "stock": m.stock, "reorder_level": m.reorder_level, "on_order": pending, "suggested_qty": need, "last_cost": f"{(last.cost if last else Decimal(str(m.price)) * Decimal('0.7')):.2f}"})
    return sorted(out, key=lambda r: (r["stock"], r["name"]))
