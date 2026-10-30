"""สร้างข้อมูลเริ่มต้นแบบรันซ้ำได้ (idempotent): ผู้ดูแลระบบจาก env + (เลือกได้) ข้อมูลยาตัวอย่าง
รันหลัง migrate ใน Job ของ Kubernetes:  python manage.py bootstrap_app [--sample]"""
import os
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from stock import purchasing
from stock.models import Batch, Category, Medicine, PurchaseOrder, Sale, Supplier
from stock.services import SaleError, create_sale

SAMPLE = [
    ("Pain relief", [("PCM500", "Paracetamol 500 mg", "box", "35.00", 120, 30), ("IBU400", "Ibuprofen 400 mg", "box", "58.00", 8, 20), ("ASP81", "Aspirin 81 mg", "box", "42.00", 64, 20)]),
    ("Antibiotics", [("AMX500", "Amoxicillin 500 mg", "box", "95.00", 40, 25), ("AZI250", "Azithromycin 250 mg", "box", "180.00", 0, 10)]),
    ("Allergy", [("CTZ10", "Cetirizine 10 mg", "box", "48.00", 75, 20), ("LRT10", "Loratadine 10 mg", "box", "52.00", 12, 15)]),
    ("Digestive", [("ORS01", "Oral rehydration salts", "sachet", "9.00", 300, 100), ("OMP20", "Omeprazole 20 mg", "box", "120.00", 22, 20)]),
]


class Command(BaseCommand):
    help = "create the admin user (from env) and optional sample medicines"

    def add_arguments(self, parser):
        parser.add_argument("--sample", action="store_true", help="load sample medicines (dev only)")

    def handle(self, *args, **opts):
        user, password = os.environ.get("DJANGO_ADMIN_USER", "admin"), os.environ.get("DJANGO_ADMIN_PASSWORD")
        U = get_user_model()
        if password and not U.objects.filter(username=user).exists():
            U.objects.create_superuser(user, password=password)
            self.stdout.write(f"created admin user {user}")
        if opts["sample"]:
            for cat, items in SAMPLE:
                c, _ = Category.objects.get_or_create(name=cat)
                for sku, name, unit, price, stock, reorder in items:
                    Medicine.objects.get_or_create(sku=sku, defaults={"name": name, "category": c, "unit": unit, "price": price, "stock": stock, "reorder_level": reorder})
            self.stdout.write("sample medicines loaded")
            self.sample_lots_and_sales()
            self.sample_purchasing()

    def sample_lots_and_sales(self):
        """ล็อต (มีของใกล้หมดอายุ/หมดอายุแล้วให้เห็นในรายงาน) + ใบเสร็จย้อนหลัง 14 วัน · รันซ้ำไม่เพิ่มซ้ำ"""
        if Batch.objects.exists() or Sale.objects.exists():
            return
        today, rnd = timezone.localdate(), random.Random(2026)
        for m in Medicine.objects.all():
            days = {"IBU400": 12, "LRT10": 25, "OMP20": -9}.get(m.sku, rnd.randint(150, 700))  # ibuprofen/loratadine ใกล้หมดอายุ · omeprazole หมดอายุแล้ว
            if m.stock:
                Batch.objects.create(medicine=m, lot_no=f"L{m.sku[:3]}{today.year}A", expiry_date=today + timedelta(days=days), qty_received=m.stock, qty_remaining=m.stock, cost=(m.price * 7 / 10).quantize(m.price))
        meds = list(Medicine.objects.filter(stock__gte=60))
        user = get_user_model().objects.filter(is_superuser=True).first()
        for back in range(13, -1, -1):
            for _ in range(rnd.randint(2, 5)):
                picks = rnd.sample(meds, rnd.randint(1, 3))
                try:
                    sale = create_sale(user, [{"medicine": p.id, "qty": rnd.randint(1, 3)} for p in picks], payment=rnd.choice(["cash", "cash", "transfer", "card"]))
                except SaleError:  # สต็อกตัวอย่างหมดก่อน: ข้ามใบนั้น
                    continue
                when = timezone.now() - timedelta(days=back, hours=rnd.randint(0, 8))
                Sale.objects.filter(pk=sale.pk).update(created_at=when)
        self.stdout.write("sample lots and sales loaded")

    def sample_purchasing(self):
        """ผู้จัดจำหน่าย 3 ราย + ใบสั่งซื้อทุกสถานะ (รับครบ/รับบางส่วน/สั่งแล้ว/ร่าง/ยกเลิก) · รันซ้ำไม่เพิ่มซ้ำ"""
        if Supplier.objects.exists():
            return
        user = get_user_model().objects.filter(is_superuser=True).first()
        sups = [Supplier.objects.create(name=n, contact_name=c, phone=ph, email=e, address=a) for n, c, ph, e, a in [
            ("บริษัท ยาดี จำกัด", "คุณสมหญิง ใจดี", "02-111-2222", "sales@yadee.example", "99 ถ.พระราม 4 กรุงเทพฯ"),
            ("เมดิคอล ซัพพลาย", "คุณวิชัย มั่นคง", "053-222-333", "order@medsupply.example", "12 ถ.นิมมานเหมินท์ เชียงใหม่"),
            ("ไทยฟาร์มา ดิสทริบิวชั่น", "คุณนภา สุขสันต์", "043-777-888", "", "5 ถ.มิตรภาพ ขอนแก่น")]]
        meds = list(Medicine.objects.order_by("id")[:8])
        def po(sup, picks, status, days_ago):
            o = purchasing.create_po(user, sup, [{"medicine": m.id, "qty": q, "unit_cost": (m.price * 7 / 10).quantize(m.price)} for m, q in picks], note="ตัวอย่าง")
            when = timezone.now() - timedelta(days=days_ago)
            PurchaseOrder.objects.filter(pk=o.pk).update(created_at=when)
            if status != "draft":
                purchasing.mark_ordered(o)
            return o
        a = po(sups[0], [(meds[0], 60), (meds[1], 40)], "received", 12)
        purchasing.receive(user, a, [{"item": i.id, "qty": i.qty_ordered, "lot_no": f"PO{a.id}-{i.id}", "expiry_date": timezone.localdate() + timedelta(days=500)} for i in a.items.all()])
        b = po(sups[1], [(meds[2], 80), (meds[3], 30)], "partial", 6)
        i0 = b.items.first()
        purchasing.receive(user, b, [{"item": i0.id, "qty": 50, "lot_no": f"PO{b.id}-A", "expiry_date": timezone.localdate() + timedelta(days=400)}])
        po(sups[2], [(meds[4], 100)], "ordered", 2)
        po(sups[0], [(meds[5], 25), (meds[6], 25)], "draft", 1)
        c = po(sups[1], [(meds[7], 10)], "ordered", 9)
        purchasing.cancel(c)
        self.stdout.write("sample suppliers and purchase orders loaded")
