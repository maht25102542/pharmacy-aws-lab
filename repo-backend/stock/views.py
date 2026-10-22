import socket
from decimal import Decimal

from django.contrib.auth import authenticate
from django.db import transaction
from django.db.models import F, Sum
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import Category, Medicine, StockMovement
from .serializers import MAX_STOCK, AdjustSerializer, CategorySerializer, MedicineSerializer, MovementSerializer


class ReadAnyWriteStaff(permissions.BasePermission):
    """ทุกคนที่ล็อกอินอ่านได้ · แก้ราคา/ลบ/จัดการหมวดหมู่ ได้เฉพาะ staff (เภสัชกรผู้ดูแล)"""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.method in permissions.SAFE_METHODS or request.user.is_staff


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [ReadAnyWriteStaff]
    pagination_class = None  # หมวดหมู่มีไม่กี่อัน ส่งทั้งหมดในครั้งเดียว


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
            med.stock = new
            med.save(update_fields=["stock", "updated_at"])
            StockMovement.objects.create(medicine=med, delta=d["delta"], stock_after=new, reason=d["reason"], note=d["note"], created_by=request.user)
        return Response(MedicineSerializer(med).data)


class MovementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MovementSerializer

    def get_queryset(self):
        qs = StockMovement.objects.select_related("medicine", "created_by")
        if self.request.query_params.get("medicine"):
            qs = qs.filter(medicine_id=self.request.query_params["medicine"])
        return qs


@api_view(["GET"])
def summary(_request):
    meds = Medicine.objects.filter(is_active=True)
    value = meds.aggregate(v=Sum(F("stock") * F("price")))["v"] or 0
    return Response({
        "medicines": meds.count(),
        "low_stock": meds.filter(stock__lte=F("reorder_level")).count(),
        "out_of_stock": meds.filter(stock=0).count(),
        "stock_value": f"{Decimal(str(value)):.2f}",
        "served_by": socket.gethostname(),  # ชื่อ pod ที่ตอบ: รีเฟรชหลายครั้งเห็นสลับระหว่าง replica
    })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([ScopedRateThrottle])
def login(request):
    user = authenticate(username=request.data.get("username", ""), password=request.data.get("password", ""))
    if user is None:
        return Response({"detail": "invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": {"username": user.username, "is_staff": user.is_staff}})


login.cls.throttle_scope = "login"  # ชื่อโควตาใน DEFAULT_THROTTLE_RATES


@api_view(["POST"])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def me(request):
    return Response({"username": request.user.username, "is_staff": request.user.is_staff})
