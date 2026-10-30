"""ตรรกะขาย/ล็อตยา แยกจาก view เพื่อให้ bootstrap_app ใช้สร้างข้อมูลตัวอย่างด้วยกฎเดียวกัน"""
from datetime import date
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from .models import Batch, Medicine, Sale, SaleItem, StockMovement


class SaleError(Exception):
    def __init__(self, detail, **extra):
        super().__init__(detail)
        self.detail, self.extra = detail, extra


def sellable(med, today=None):
    """จำนวนที่ขายได้: สต็อกรวม ลบของล็อตที่หมดอายุแล้ว (ห้ามขายยาหมดอายุ)"""
    today = today or date.today()
    expired = sum(b.qty_remaining for b in med.batches.all() if b.expiry_date and b.expiry_date < today)
    return max(0, med.stock - expired)


def consume(med, qty, today=None, include_expired=False):
    """ตัดล็อตแบบ FEFO คืนรายการ [{"batch","qty"}] · ส่วนที่เกินล็อต = สต็อกเก่าที่ไม่มีล็อต (ไม่ต้องบันทึก)"""
    today, left, used = today or date.today(), qty, []
    for b in med.batches.select_for_update().filter(qty_remaining__gt=0).order_by("expiry_date", "id"):
        if left <= 0:
            break
        if b.expiry_date and b.expiry_date < today and not include_expired:
            continue
        take = min(b.qty_remaining, left)
        b.qty_remaining -= take
        b.save(update_fields=["qty_remaining"])
        used.append({"batch": b.id, "qty": take})
        left -= take
    return used


def next_receipt_no(day):
    n = Sale.objects.filter(receipt_no__startswith=f"RC-{day:%Y%m%d}-").count() + 1
    return f"RC-{day:%Y%m%d}-{n:04d}"


def create_sale(user, items, payment="cash", paid=None, discount=0, customer_name="", note="", today=None):
    """items = [{"medicine": id, "qty": n}] · ราคามาจากฐานข้อมูลเสมอ ไม่เชื่อราคาที่ client ส่งมา"""
    if not items:
        raise SaleError("no items")
    merged = {}
    for it in items:
        merged[it["medicine"]] = merged.get(it["medicine"], 0) + int(it["qty"])
    discount = Decimal(str(discount or 0))
    for attempt in range(3):
        try:
            with transaction.atomic():
                meds = {m.id: m for m in Medicine.objects.select_for_update().prefetch_related("batches").filter(id__in=merged).order_by("id")}
                lines, subtotal = [], Decimal("0")
                for mid, qty in merged.items():
                    m = meds.get(mid)
                    if m is None or not m.is_active:
                        raise SaleError("medicine not available", medicine=mid)
                    if qty < 1:
                        raise SaleError("qty must be >= 1", medicine=mid)
                    if sellable(m, today) < qty:
                        raise SaleError("not enough stock", medicine=mid, name=m.name, available=sellable(m, today))
                    line = (m.price * qty).quantize(Decimal("0.01"))
                    lines.append((m, qty, line))
                    subtotal += line
                if discount < 0 or discount > subtotal:
                    raise SaleError("discount must be between 0 and the subtotal")
                total = subtotal - discount
                paid = total if payment != "cash" or paid in (None, "") else Decimal(str(paid))
                if paid < total:
                    raise SaleError("paid is less than total", total=str(total))
                day = (today or timezone.localdate())
                sale = Sale.objects.create(receipt_no=next_receipt_no(day), customer_name=customer_name, payment=payment, subtotal=subtotal, discount=discount, total=total, paid=paid, change=paid - total, note=note, created_by=user)
                for m, qty, line in lines:
                    used = consume(m, qty, today)
                    SaleItem.objects.create(sale=sale, medicine=m, sku=m.sku, name=m.name, unit_price=m.price, qty=qty, line_total=line, lots=used)
                    m.stock -= qty
                    m.save(update_fields=["stock", "updated_at"])
                    StockMovement.objects.create(medicine=m, delta=-qty, stock_after=m.stock, reason="dispense", note=sale.receipt_no, created_by=user)
                return sale
        except IntegrityError:  # เลขใบเสร็จชนกัน (สองเครื่องขายพร้อมกัน): ลองใหม่
            if attempt == 2:
                raise
    raise SaleError("could not allocate receipt number")


def void_sale(user, sale, reason=""):
    with transaction.atomic():
        sale = Sale.objects.select_for_update().get(pk=sale.pk)
        if sale.status == "void":
            raise SaleError("sale already void")
        for it in sale.items.select_related("medicine"):
            m = Medicine.objects.select_for_update().get(pk=it.medicine_id)
            for u in it.lots:
                Batch.objects.filter(pk=u["batch"]).update(qty_remaining=F("qty_remaining") + u["qty"])
            m.stock += it.qty
            m.save(update_fields=["stock", "updated_at"])
            StockMovement.objects.create(medicine=m, delta=it.qty, stock_after=m.stock, reason="adjust", note=f"void {sale.receipt_no}", created_by=user)
        sale.status, sale.voided_by, sale.voided_at, sale.void_reason = "void", user, timezone.now(), reason
        sale.save(update_fields=["status", "voided_by", "voided_at", "void_reason"])
        return sale

