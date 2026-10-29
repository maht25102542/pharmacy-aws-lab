"""บัญชีผู้ใช้: บทบาท (role) และการจัดการผู้ใช้ — เฉพาะผู้ดูแลระบบ (admin) เท่านั้นที่สร้าง/แก้/ลบผู้ใช้ได้

บทบาทเก็บด้วยธง is_superuser / is_staff ของ Django (ไม่เพิ่มตารางใหม่):
  admin      = is_superuser  จัดการผู้ใช้ + ทุกอย่างของเภสัชกร
  pharmacist = is_staff      แก้ราคา/ลบยา/จัดการหมวดหมู่ + งานของพนักงาน
  clerk      = ธงทั้งคู่ปิด  ดูสต็อก รับเข้า/จ่ายออก
"""
from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

User = get_user_model()
ROLES = ["admin", "pharmacist", "clerk"]


def role_of(user):
    return "admin" if user.is_superuser else "pharmacist" if user.is_staff else "clerk"


def apply_role(user, role):
    user.is_superuser = role == "admin"
    user.is_staff = role in ("admin", "pharmacist")


def user_payload(user):
    """รูปแบบเดียวกันทุกที่ที่ส่งข้อมูลผู้ใช้กลับ (login, me, users)"""
    return {"id": user.pk, "username": user.username, "first_name": user.first_name, "last_name": user.last_name,
            "full_name": user.get_full_name() or user.username, "email": user.email, "role": role_of(user), "is_staff": user.is_staff}


def validate_new_password(value, user=None):
    try:
        password_validation.validate_password(value, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages))
    return value


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class UserSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=ROLES, default="clerk")
    password = serializers.CharField(write_only=True, required=False, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "role", "is_active", "password", "last_login", "date_joined"]
        read_only_fields = ["last_login", "date_joined"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["role"] = role_of(instance)
        return data

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "password is required"})
        if attrs.get("password"):
            validate_new_password(attrs["password"], self.instance)
        return attrs

    def create(self, validated):
        role, password = validated.pop("role", "clerk"), validated.pop("password")
        user = User(**validated)
        apply_role(user, role)
        user.set_password(password)
        user.save()
        return user

    def update(self, user, validated):
        role, password = validated.pop("role", None), validated.pop("password", None)
        for k, v in validated.items():
            setattr(user, k, v)
        if role:
            apply_role(user, role)
        if password:
            user.set_password(password)
        user.save()
        if password or validated.get("is_active") is False:
            Token.objects.filter(user=user).delete()  # รหัสเปลี่ยน/ปิดบัญชี = ต้องล็อกอินใหม่
        return user


def _is_last_admin(user):
    return user.is_superuser and user.is_active and not User.objects.filter(is_superuser=True, is_active=True).exclude(pk=user.pk).exists()


@extend_schema(tags=["users"])
class UserViewSet(viewsets.ModelViewSet):
    """จัดการผู้ใช้ (admin เท่านั้น): สร้าง แก้ไขบทบาท เปิด/ปิดบัญชี รีเซ็ตรหัสผ่าน ลบ"""
    queryset = User.objects.order_by("username")
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get("q")
        return qs.filter(username__icontains=q.strip()) if q else qs

    def perform_update(self, serializer):
        user, new = serializer.instance, serializer.validated_data
        demoting = new.get("role", role_of(user)) != "admin" or new.get("is_active") is False
        if user.pk == self.request.user.pk and demoting:
            raise serializers.ValidationError({"detail": "cannot demote or deactivate yourself"})
        if demoting and _is_last_admin(user):
            raise serializers.ValidationError({"detail": "at least one active admin is required"})
        serializer.save()

    def perform_destroy(self, user):
        if user.pk == self.request.user.pk:
            raise serializers.ValidationError({"detail": "cannot delete yourself"})
        if _is_last_admin(user):
            raise serializers.ValidationError({"detail": "at least one active admin is required"})
        user.delete()  # ประวัติสต็อกยังอยู่ (created_by ตั้งเป็น NULL)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)


class ProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)


@extend_schema(tags=["auth"], methods=["GET"], responses=UserSerializer)
@extend_schema(tags=["auth"], methods=["PATCH"], request=ProfileSerializer, responses=UserSerializer)
@api_view(["GET", "PATCH"])
def me(request):
    """ข้อมูลของตัวเอง · แก้ชื่อ/อีเมลของตัวเองได้ (บทบาทแก้ได้โดย admin ที่ /api/users เท่านั้น)"""
    if request.method == "PATCH":
        ser = ProfileSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        for k, v in ser.validated_data.items():
            setattr(request.user, k, v)
        request.user.save()
    return Response(user_payload(request.user))


@extend_schema(tags=["auth"], request=ChangePasswordSerializer, responses={204: OpenApiResponse(description="เปลี่ยนแล้ว ต้องล็อกอินใหม่")})
@api_view(["POST"])
def change_password(request):
    """เปลี่ยนรหัสผ่านของตัวเอง (ต้องใส่รหัสเดิม) · token เดิมถูกยกเลิก"""
    ser = ChangePasswordSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    if not request.user.check_password(ser.validated_data["old_password"]):
        return Response({"old_password": ["incorrect password"]}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_new_password(ser.validated_data["new_password"], request.user)
    except serializers.ValidationError as exc:
        return Response({"new_password": exc.detail}, status=status.HTTP_400_BAD_REQUEST)
    request.user.set_password(ser.validated_data["new_password"])
    request.user.save()
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
