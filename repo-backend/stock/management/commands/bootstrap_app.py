"""สร้างข้อมูลเริ่มต้นแบบรันซ้ำได้ (idempotent): ผู้ดูแลระบบจาก env + (เลือกได้) ข้อมูลยาตัวอย่าง
รันหลัง migrate ใน Job ของ Kubernetes:  python manage.py bootstrap_app [--sample]"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from stock.models import Category, Medicine

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
