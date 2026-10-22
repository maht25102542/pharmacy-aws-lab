from django.contrib import admin

from .models import Category, Medicine, StockMovement

admin.site.register(Category)


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "stock", "reorder_level", "is_active")
    search_fields = ("sku", "name")
    list_filter = ("category", "is_active")


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("created_at", "medicine", "delta", "stock_after", "reason", "created_by")
    readonly_fields = [f.name for f in StockMovement._meta.fields]  # ประวัติแก้ไม่ได้
