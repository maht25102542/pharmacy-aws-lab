from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .models import Batch, Sale, SaleItem
from .serializers import BatchSerializer, SaleCreateSerializer, SaleSerializer, VoidSerializer
from .services import SaleError, create_sale, void_sale


class StaffOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


def _d(v, default=None):
    try:
        return date.fromisoformat(v)
    except (TypeError, ValueError):
        return default


@extend_schema_view(list=extend_schema(parameters=[OpenApiParameter("q", str, description="เลขใบเสร็จหรือชื่อลูกค้า"), OpenApiParameter("date_from", str, description="YYYY-MM-DD"), OpenApiParameter("date_to", str, description="YYYY-MM-DD"), OpenApiParameter("status", str, description="completed | void")]))
@extend_schema(tags=["sales"])
class SaleViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = SaleSerializer

    def get_queryset(self):
        qs = Sale.objects.select_related("created_by", "voided_by").prefetch_related("items")
        p = self.request.query_params
        if p.get("q"):
            q = p["q"].strip()
            qs = qs.filter(receipt_no__icontains=q) | qs.filter(customer_name__icontains=q)
        if _d(p.get("date_from")):
            qs = qs.filter(created_at__date__gte=_d(p["date_from"]))
        if _d(p.get("date_to")):
            qs = qs.filter(created_at__date__lte=_d(p["date_to"]))
        if p.get("status") in ("completed", "void"):
            qs = qs.filter(status=p["status"])
        return qs.order_by("-created_at", "-id")

    @extend_schema(request=SaleCreateSerializer, responses={201: SaleSerializer}, summary="ขายหน้าร้าน: ตัดสต็อกแบบ FEFO และออกเลขใบเสร็จ (ราคาใช้ของในระบบ ไม่ใช้ที่ client ส่ง)")
    def create(self, request, *args, **kwargs):
        ser = SaleCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        try:
            sale = create_sale(request.user, [dict(i) for i in d["items"]], d["payment"], d["paid"], d["discount"], d["customer_name"], d["note"])
        except SaleError as e:
            return Response({"detail": e.detail, **e.extra}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=VoidSerializer, responses=SaleSerializer, summary="ยกเลิกบิล (เภสัชกร/ผู้ดูแล): คืนสต็อกและล็อตเดิม")
    @action(detail=True, methods=["post"], permission_classes=[StaffOnly])
    def void(self, request, pk=None):
        sale = self.get_object()
        ser = VoidSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            sale = void_sale(request.user, sale, ser.validated_data["reason"])
        except SaleError as e:
            return Response({"detail": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SaleSerializer(sale).data)


@extend_schema(tags=["reports"], parameters=[OpenApiParameter("days", int, description="ย้อนหลังกี่วัน (1-90, ปริยาย 14)")], summary="ยอดขายรายวัน + ยาขายดี (เภสัชกร/ผู้ดูแล)")
@api_view(["GET"])
@permission_classes([StaffOnly])
def sales_report(request):
    try:
        days = min(90, max(1, int(request.query_params.get("days", 14))))
    except ValueError:
        days = 14
    today = timezone.localdate()
    start = today - timedelta(days=days - 1)
    qs = Sale.objects.filter(status="completed", created_at__date__gte=start, created_at__date__lte=today)
    per = {r["d"]: r for r in qs.annotate(d=TruncDate("created_at")).values("d").annotate(n=Count("id"), t=Sum("total"))}
    series = []
    for i in range(days):
        d = start + timedelta(days=i)
        r = per.get(d)
        series.append({"date": d.isoformat(), "count": r["n"] if r else 0, "total": f"{Decimal(str(r['t'])):.2f}" if r else "0.00"})
    total = qs.aggregate(t=Sum("total"), n=Count("id"))
    top = SaleItem.objects.filter(sale__in=qs).values("medicine", "sku", "name").annotate(qty=Sum("qty"), revenue=Sum("line_total")).order_by("-qty", "name")[:5]
    n, t = total["n"] or 0, Decimal(str(total["t"] or 0))
    return Response({
        "days": series,
        "totals": {"count": n, "total": f"{t:.2f}", "average": f"{(t / n if n else Decimal(0)):.2f}"},
        "top": [{"medicine": r["medicine"], "sku": r["sku"], "name": r["name"], "qty": r["qty"], "revenue": f"{Decimal(str(r['revenue'])):.2f}"} for r in top],
    })


@extend_schema(tags=["reports"], parameters=[OpenApiParameter("days", int, description="หมดอายุภายในกี่วัน (1-730, ปริยาย 90) · ล็อตที่หมดอายุแล้วแสดงเสมอ")], summary="ล็อตยาใกล้หมดอายุ/หมดอายุแล้ว (ที่ยังเหลือในสต็อก)")
@api_view(["GET"])
def expiry_report(request):
    try:
        days = min(730, max(1, int(request.query_params.get("days", 90))))
    except ValueError:
        days = 90
    today = timezone.localdate()
    qs = Batch.objects.select_related("medicine").filter(qty_remaining__gt=0, expiry_date__isnull=False, expiry_date__lte=today + timedelta(days=days)).order_by("expiry_date", "id")
    rows = []
    for b in qs:
        row = BatchSerializer(b).data
        row["days_left"] = (b.expiry_date - today).days
        row["expired"] = b.expiry_date < today
        rows.append(row)
    return Response({"days": days, "count": len(rows), "results": rows})


@extend_schema(tags=["reports"], summary="ล็อตของยาทุกตัว (ตัวกรอง medicine)", parameters=[OpenApiParameter("medicine", int)])
@api_view(["GET"])
def batches(request):
    qs = Batch.objects.select_related("medicine").filter(qty_remaining__gt=0)
    if request.query_params.get("medicine"):
        qs = qs.filter(medicine_id=request.query_params["medicine"])
    return Response(BatchSerializer(qs.order_by("expiry_date", "id")[:200], many=True).data)
