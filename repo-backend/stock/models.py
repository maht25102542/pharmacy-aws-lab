from django.conf import settings
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Medicine(models.Model):
    sku = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="medicines")
    unit = models.CharField(max_length=20, default="box")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=10)  # สต็อกต่ำกว่าหรือเท่านี้ = ควรสั่งเพิ่ม
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.sku} {self.name}"

    @property
    def low_stock(self):
        return self.stock <= self.reorder_level


class StockMovement(models.Model):
    """ประวัติทุกครั้งที่สต็อกเปลี่ยน (ใครทำ เมื่อไหร่ เพราะอะไร) ไม่แก้ไม่ลบ"""
    REASONS = [("receive", "รับเข้า"), ("dispense", "จ่ายออก"), ("adjust", "ปรับยอด"), ("expired", "หมดอายุ/ทิ้ง")]
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name="movements")
    delta = models.IntegerField()
    stock_after = models.PositiveIntegerField()
    reason = models.CharField(max_length=10, choices=REASONS, default="adjust")
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
