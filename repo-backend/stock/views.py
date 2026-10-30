import socket
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import authenticate
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .accounts import user_payload
from .models import Batch, Category, Medicine, Sale, StockMovement
from .serializers import MAX_STOCK, AdjustSerializer, CategorySerializer, MedicineSerializer, MovementSerializer
from .services import consume


class ReadAnyWriteStaff(permissions.BasePermission):
    """ทุกคนที่ล็อกอินอ่านได้ · แก้ราคา/ลบ/จัดการหมวดหมู่ ได้เฉพาะ staff (เภสัชกรผู้ดูแล)"""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.method in permissions.SAFE_METHODS or request.user.is_staff


@extend_schema(tags=["categories"])
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [ReadAnyWriteStaff]
    pagination_class = None  # หมวดหมู่มีไม่กี่อัน ส่งทั้งหมดในครั้งเดียว


@extend_schema_view(list=extend_schema(parameters=[OpenApiParameter("q", str, description="ค้นหาจากชื่อหรือ SKU"), OpenApiParameter("category", int, description="id หมวดหมู่"), OpenApiParameter("low_stock", bool, description="เฉพาะที่สต็อกต่ำกว่าจุดสั่งซื้อ")]))
@extend_schema(tags=["medicines"])
class MedicineViewSet(viewsets.ModelViewSet):
    serializer_class = MedicineSerializer

    def get_permissions(self):
        # เพิ่ม/ปรับสต็อกได้ทุกคนที่ล็อกอิน · ลบได้เฉพาะ staff
        return [ReadAnyWriteStaff()] if self.action == "destroy" else [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Medicine.objects.select_related("category")
        p = self.request.query_params
        if p.get("q"):
            q = p["q"].strip()
            qs = qs.filter(name__icontains=q) | qs.filter(sku__icontains=q)
        if p.get("category"):
            qs = qs.filter(category_id=p["category"])
        if p.get("low_stock") in ("1", "true"):
            qs = qs.filter(stock__lte=F("reorder_level"))
        return qs.order_by("name", "id")

    @extend_schema(request=AdjustSerializer, responses=MedicineSerializer, summary="รับเข้า/จ่ายออก/ปรับยอดสต็อก (บันทึกประวัติทุกครั้ง)")
    @action(detail=True, methods=["post"])
    def adjust(self, request, pk=None):
        ser = AdjustSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        with transaction.atomic():
            # ล็อกแถวนี้ไว้ระหว่างคำนวณ: สองคนกดพร้อมกันจะไม่ทำให้ยอดเพี้ยน
            med = Medicine.objects.select_for_update().filter(pk=pk).first()
            if med is None:
                return Response({"detail": "medicine not found"}, status=status.HTTP_404_NOT_FOUND)
            new = med.stock + d["delta"]
            if new < 0:
                return Response({"detail": "stock cannot go below 0", "stock": med.stock}, status=status.HTTP_400_BAD_REQUEST)
            if new > MAX_STOCK:
                return Response({"detail": f"stock cannot exceed {MAX_STOCK}", "stock": med.stock}, status=status.HTTP_400_BAD_REQUEST)
            if d["delta"] > 0 and d["reason"] == "receive":  # รับเข้า = เปิดล็อตใหม่ (ระบุเลขล็อต/วันหมดอายุ/ต้นทุนได้)
                Batch.objects.create(medicine=med, lot_no=d["lot_no"] or f"L{timezone.localdate():%y%m%d}", expiry_date=d["expiry_date"], qty_received=d["delta"], qty_remaining=d["delta"], cost=d["cost"], created_by=request.user)
            elif d["delta"] < 0:  # จ่ายออก/ทิ้ง = ตัดล็อตที่หมดอายุก่อน (ทิ้งยาหมดอายุตัดล็อตหมดอายุได้)
                consume(med, -d["delta"], include_expired=d["reason"] == "expired")
            med.stock = new
            med.save(update_fields=["stock", "updated_at"])
            StockMovement.objects.create(medicine=med, delta=d["delta"], stock_after=new, reason=d["reason"], note=d["note"], created_by=request.user)
        return Response(MedicineSerializer(med).data)


@extend_schema(tags=["movements"], parameters=[OpenApiParameter("medicine", int, description="กรองตาม id ยา")])
class MovementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MovementSerializer

    def get_queryset(self):
        qs = StockMovement.objects.select_related("medicine", "created_by")
        if self.request.query_params.get("medicine"):
            qs = qs.filter(medicine_id=self.request.query_params["medicine"])
        return qs


@extend_schema(tags=["summary"])
@api_view(["GET"])
def summary(_request):
    today = timezone.localdate()
    today_sales = Sale.objects.filter(status="completed", created_at__date=today)
    live = Batch.objects.filter(qty_remaining__gt=0, expiry_date__isnull=False)
    meds = Medicine.objects.filter(is_active=True)
    value = meds.aggregate(v=Sum(F("stock") * F("price")))["v"] or 0
    return Response({
        "medicines": meds.count(),
        "low_stock": meds.filter(stock__lte=F("reorder_level")).count(),
        "out_of_stock": meds.filter(stock=0).count(),
        "stock_value": f"{Decimal(str(value)):.2f}",
        "sales_today": {"count": today_sales.count(), "total": f"{Decimal(str(today_sales.aggregate(t=Sum('total'))['t'] or 0)):.2f}"},
        "expiring_30": live.filter(expiry_date__gte=today, expiry_date__lte=today + timedelta(days=30)).count(),
        "expired": live.filter(expiry_date__lt=today).count(),
        "served_by": socket.gethostname(),  # ชื่อ pod ที่ตอบ: รีเฟรชหลายครั้งเห็นสลับระหว่าง replica
    })


@extend_schema(tags=["auth"], auth=[], summary="ล็อกอิน (ได้ token)")
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([ScopedRateThrottle])
def login(request):
    user = authenticate(username=request.data.get("username", ""), password=request.data.get("password", ""))
    if user is None:
        return Response({"detail": "invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": user_payload(user)})


login.cls.throttle_scope = "login"  # ชื่อโควตาใน DEFAULT_THROTTLE_RATES


@extend_schema(tags=["auth"], request=None, responses={204: None})
@api_view(["POST"])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
