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


class Batch(models.Model):
    """ล็อตยา: การรับเข้าหนึ่งครั้ง = หนึ่งล็อต มีวันหมดอายุ (ขายแบบ FEFO: หมดอายุก่อนออกก่อน)"""
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name="batches")
    lot_no = models.CharField(max_length=40)
    expiry_date = models.DateField(null=True, blank=True)
    qty_received = models.PositiveIntegerField()
    qty_remaining = models.PositiveIntegerField()
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # ต้นทุนต่อหน่วย
    received_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["expiry_date", "id"]
        indexes = [models.Index(fields=["expiry_date"])]

    def __str__(self):
        return f"{self.medicine.sku} lot {self.lot_no}"


class Sale(models.Model):
    """ใบเสร็จขายหน้าร้าน (ขายแล้วตัดสต็อกทันที · ยกเลิกบิลแล้วคืนสต็อก)"""
    PAYMENTS = [("cash", "เงินสด"), ("transfer", "โอนเงิน"), ("card", "บัตร")]
    STATUSES = [("completed", "สำเร็จ"), ("void", "ยกเลิก")]
    receipt_no = models.CharField(max_length=20, unique=True)
    customer_name = models.CharField(max_length=120, blank=True)
    payment = models.CharField(max_length=10, choices=PAYMENTS, default="cash")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    paid = models.DecimalField(max_digits=12, decimal_places=2)
    change = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUSES, default="completed")
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="sales")
    created_at = models.DateTimeField(auto_now_add=True)
    voided_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="voided_sales")
    voided_at = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["created_at"])]

    def __str__(self):
        return self.receipt_no


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT, related_name="sale_items")
    sku = models.CharField(max_length=32)  # เก็บสำเนาชื่อ/ราคา ณ ตอนขาย: แก้ราคายาทีหลังไม่กระทบใบเสร็จเก่า
    name = models.CharField(max_length=200)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    qty = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    lots = models.JSONField(default=list)  # [{"batch": id, "qty": n}] ตัดจากล็อตไหนบ้าง ไว้คืนตอนยกเลิกบิล
