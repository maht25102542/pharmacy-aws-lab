from rest_framework import serializers

from .models import Category, Medicine, StockMovement

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
