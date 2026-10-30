from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from . import purchasing
from .models import PurchaseOrder, Supplier
from .sales import StaffOnly
from .serializers import POCreateSerializer, PurchaseOrderSerializer, ReceiveSerializer, SupplierSerializer


class ReadAnyWriteStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.method in permissions.SAFE_METHODS or request.user.is_staff


@extend_schema_view(list=extend_schema(parameters=[OpenApiParameter("q", str, description="ค้นหาชื่อ/ผู้ติดต่อ"), OpenApiParameter("active", bool, description="เฉพาะที่ยังใช้งาน")]))
@extend_schema(tags=["suppliers"])
class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierSerializer
    permission_classes = [ReadAnyWriteStaff]

    def get_queryset(self):
        qs = Supplier.objects.all()
        p = self.request.query_params
        if p.get("q"):
            qs = qs.filter(name__icontains=p["q"].strip()) | qs.filter(contact_name__icontains=p["q"].strip())
        if p.get("active") in ("1", "true"):
            qs = qs.filter(is_active=True)
        return qs.order_by("name", "id")

    def destroy(self, request, *args, **kwargs):
        s = self.get_object()
        if s.orders.exists():  # มีประวัติสั่งซื้อแล้ว: ลบไม่ได้ ให้ปิดการใช้งานแทน
            return Response({"detail": "supplier has purchase orders; deactivate it instead"}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


@extend_schema_view(list=extend_schema(parameters=[OpenApiParameter("status", str), OpenApiParameter("supplier", int), OpenApiParameter("q", str, description="เลขที่ PO")]))
@extend_schema(tags=["purchase-orders"])
class PurchaseOrderViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = PurchaseOrderSerializer

    def get_permissions(self):
        # สร้าง/สั่งซื้อ/ยกเลิก/ลบร่าง = เภสัชกรขึ้นไป · รับของเข้าคลัง = ทุกคนที่ล็อกอิน (เหมือนรับเข้าสต็อก)
        return [permissions.IsAuthenticated()] if self.action in ("list", "retrieve", "receive") else [StaffOnly()]

    def get_queryset(self):
        qs = PurchaseOrder.objects.select_related("supplier", "created_by").prefetch_related("items")
        p = self.request.query_params
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        if p.get("supplier"):
            qs = qs.filter(supplier_id=p["supplier"])
        if p.get("q"):
            qs = qs.filter(po_no__icontains=p["q"].strip())
        return qs.order_by("-created_at", "-id")

    @extend_schema(request=POCreateSerializer, responses={201: PurchaseOrderSerializer}, summary="สร้างใบสั่งซื้อ (สถานะร่าง)")
    def create(self, request, *args, **kwargs):
        ser = POCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        sup = Supplier.objects.filter(pk=d["supplier"]).first()
        if sup is None:
            return Response({"supplier": ["supplier not found"]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            po = purchasing.create_po(request.user, sup, [dict(i) for i in d["items"]], d["expected_date"], d["note"])
        except purchasing.POError as e:
            return Response({"detail": e.detail, **e.extra}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PurchaseOrderSerializer(po).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        po = self.get_object()
        if po.status != "draft":
            return Response({"detail": "only a draft can be deleted"}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    def _do(self, fn, po, *a):
        try:
            return Response(PurchaseOrderSerializer(fn(*a) if a else fn(po)).data)
        except purchasing.POError as e:
            return Response({"detail": e.detail, **e.extra}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(request=None, responses=PurchaseOrderSerializer, summary="สั่งซื้อ (ร่าง → สั่งแล้ว)")
    @action(detail=True, methods=["post"])
    def order(self, request, pk=None):
        return self._do(purchasing.mark_ordered, self.get_object())

    @extend_schema(request=None, responses=PurchaseOrderSerializer, summary="ยกเลิก PO (ร่าง/สั่งแล้วที่ยังไม่ได้รับของ)")
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        po = self.get_object()
        if po.status == "ordered" and po.items.filter(qty_received__gt=0).exists():
            return Response({"detail": "cannot cancel: some items were received"}, status=status.HTTP_400_BAD_REQUEST)
        return self._do(purchasing.cancel, po)

    @extend_schema(request=ReceiveSerializer, responses=PurchaseOrderSerializer, summary="รับของเข้าคลัง: เปิดล็อต เพิ่มสต็อก บันทึกประวัติ (รับบางส่วนได้)")
    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        ser = ReceiveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        po = self.get_object()
        return self._do(purchasing.receive, po, request.user, po, [dict(i) for i in ser.validated_data["items"]])


@extend_schema(tags=["purchase-orders"], summary="ยาที่ควรสั่งเพิ่ม (ถึงจุดสั่งซื้อ หักของที่สั่งค้างอยู่)")
@api_view(["GET"])
def reorder_suggestions(_request):
    return Response(purchasing.suggestions())
