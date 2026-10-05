#!/usr/bin/env bash
# ของจริงอยู่ที่: VM pharmacy-k8s-1 และ pharmacy-dev  /usr/local/bin/ecr-refresh.sh
#
# รหัสผ่านของ ECR มีอายุ 12 ชั่วโมง สคริปต์นี้ขอรหัสใหม่แล้วเก็บเป็น secret ชื่อ ecr-pull
# ใน namespace ที่ระบุใน $NAMESPACES (จาก /etc/default/ecr-refresh) เพื่อให้ Kubernetes ดึง image ได้
# ถูกเรียกทุก 6 ชั่วโมงโดย ecr-refresh.timer
# (ถ้าใช้ EKS จะไม่ต้องมีสคริปต์นี้ เพราะ EKS ดึงจาก ECR ได้เอง)
set -euo pipefail

TOKEN="$(/snap/bin/aws ecr get-login-password --region "$AWS_REGION")"

for ns in $NAMESPACES; do
  /usr/local/bin/k3s kubectl create secret docker-registry ecr-pull \
    --namespace "$ns" \
    --docker-server="$ECR_REGISTRY" \
    --docker-username=AWS \
    --docker-password="$TOKEN" \
    --dry-run=client -o yaml | /usr/local/bin/k3s kubectl apply -f -
done
