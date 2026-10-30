"""สร้างข้อมูลเริ่มต้นแบบรันซ้ำได้ (idempotent): ผู้ดูแลระบบจาก env + (เลือกได้) ข้อมูลยาตัวอย่าง
รันหลัง migrate ใน Job ของ Kubernetes:  python manage.py bootstrap_app [--sample]"""
import os
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from stock.models import Batch, Category, Medicine, Sale
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

    def sample_lots_and_sales(self):
        """ล็อต (มีของใกล้หมดอายุ/หมดอายุแล้วให้เห็นในรายงาน) + ใบเสร็จย้อนหลัง 14 วัน · รันซ้ำไม่เพิ่มซ้ำ"""
        if Batch.objects.exists() or Sale.objects.exists():
            return
        today, rnd = timezone.localdate(), random.Random(2026)
        for m in Medicine.objects.all():
            days = {"IBU400": 12, "LRT10": 25, "AZI250": -9}.get(m.sku, rnd.randint(150, 700))  # ibuprofen/loratadine ใกล้หมดอายุ · azithromycin หมดอายุแล้ว
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
