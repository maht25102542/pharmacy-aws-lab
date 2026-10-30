from django.contrib import admin

from .models import Batch, Category, Medicine, Sale, SaleItem, StockMovement

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


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ("medicine", "lot_no", "expiry_date", "qty_remaining", "qty_received")
    list_filter = ("expiry_date",)
    search_fields = ("medicine__name", "lot_no")


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = [f.name for f in SaleItem._meta.fields]
    can_delete = False


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("receipt_no", "created_at", "total", "payment", "status", "created_by")
    list_filter = ("status", "payment")
    search_fields = ("receipt_no", "customer_name")
    inlines = [SaleItemInline]
