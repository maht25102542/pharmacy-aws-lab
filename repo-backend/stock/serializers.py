from rest_framework import serializers

from .models import Batch, Category, Medicine, PurchaseOrder, PurchaseOrderItem, Sale, SaleItem, StockMovement, Supplier

MAX_STOCK = 1_000_000


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class MedicineSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Medicine
        fields = ["id", "sku", "name", "category", "category_name", "unit", "price", "stock", "reorder_level", "low_stock", "is_active", "updated_at"]
        read_only_fields = ["stock"]  # สต็อกเปลี่ยนผ่าน /adjust เท่านั้น เพื่อให้มีประวัติทุกครั้ง

    def validate_price(self, v):
        if v < 0:
            raise serializers.ValidationError("price must be >= 0")
        return v


class AdjustSerializer(serializers.Serializer):
    delta = serializers.IntegerField(min_value=-MAX_STOCK, max_value=MAX_STOCK)
    reason = serializers.ChoiceField(choices=[r[0] for r in StockMovement.REASONS], default="adjust")
    note = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    lot_no = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")  # ใช้ตอนรับเข้า: ระบุล็อต
    expiry_date = serializers.DateField(required=False, allow_null=True, default=None)  # วันหมดอายุของล็อตที่รับเข้า
    cost = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, min_value=0, default=0)

    def validate_delta(self, v):
        if v == 0:
            raise serializers.ValidationError("delta must not be 0")
        return v


class MovementSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    medicine_sku = serializers.CharField(source="medicine.sku", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = StockMovement
        fields = ["id", "medicine", "medicine_sku", "medicine_name", "delta", "stock_after", "reason", "note", "created_by_name", "created_at"]


class BatchSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    medicine_sku = serializers.CharField(source="medicine.sku", read_only=True)

    class Meta:
        model = Batch
        fields = ["id", "medicine", "medicine_sku", "medicine_name", "lot_no", "expiry_date", "qty_received", "qty_remaining", "cost", "received_at"]


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = ["id", "medicine", "sku", "name", "unit_price", "qty", "line_total"]


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True, default=None)
    voided_by_name = serializers.CharField(source="voided_by.username", read_only=True, default=None)

    class Meta:
        model = Sale
        fields = ["id", "receipt_no", "customer_name", "payment", "subtotal", "discount", "total", "paid", "change", "status", "note", "created_by_name", "created_at", "voided_by_name", "voided_at", "void_reason", "items"]


class SaleLineSerializer(serializers.Serializer):
    medicine = serializers.IntegerField(min_value=1)
    qty = serializers.IntegerField(min_value=1, max_value=9999)


class SaleCreateSerializer(serializers.Serializer):
    items = SaleLineSerializer(many=True, min_length=1, max_length=50)
    payment = serializers.ChoiceField(choices=[p[0] for p in Sale.PAYMENTS], default="cash")
    paid = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True, min_value=0, default=None)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=0, default=0)
    customer_name = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    note = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")


class VoidSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")


class SupplierSerializer(serializers.ModelSerializer):
    open_orders = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = ["id", "name", "contact_name", "phone", "email", "address", "is_active", "open_orders", "created_at"]

    def get_open_orders(self, obj):
        return obj.orders.filter(status__in=["ordered", "partial"]).count()


class POItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "medicine", "sku", "name", "qty_ordered", "qty_received", "unit_cost"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = POItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = PurchaseOrder
        fields = ["id", "po_no", "supplier", "supplier_name", "status", "expected_date", "note", "total", "created_by_name", "created_at", "ordered_at", "received_at", "items"]


class POLineSerializer(serializers.Serializer):
    medicine = serializers.IntegerField(min_value=1)
    qty = serializers.IntegerField(min_value=1, max_value=100000)
    unit_cost = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)


class POCreateSerializer(serializers.Serializer):
    supplier = serializers.IntegerField(min_value=1)
    expected_date = serializers.DateField(required=False, allow_null=True, default=None)
    note = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    items = POLineSerializer(many=True, min_length=1, max_length=100)


class ReceiveLineSerializer(serializers.Serializer):
    item = serializers.IntegerField(min_value=1)
    qty = serializers.IntegerField(min_value=1, max_value=MAX_STOCK)
    lot_no = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    expiry_date = serializers.DateField(required=False, allow_null=True, default=None)


class ReceiveSerializer(serializers.Serializer):
    items = ReceiveLineSerializer(many=True, min_length=1, max_length=100)
