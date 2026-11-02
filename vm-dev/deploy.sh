#!/bin/sh
# ของจริงอยู่ที่: VM pharmacy-dev ที่ /opt/pharmacy/deploy.sh (Ansible วางให้) · Jenkins ssh เข้ามาเรียก:
#   ssh ubuntu@pharmacy-dev sudo /opt/pharmacy/deploy.sh backend dev-a1b2c3d
# ทำอะไร: ล็อกอิน ECR (ด้วย IAM role ของเครื่อง ไม่มี access key) → แก้ tag ของ service นั้นใน .env → compose pull → up -d
set -eu
SERVICE="${1:?ใส่ชื่อ service: backend หรือ frontend}"
TAG="${2:?ใส่ tag ของ image}"
case "$SERVICE" in backend) VAR=BACKEND_TAG ;; frontend) VAR=FRONTEND_TAG ;; *) echo "service ต้องเป็น backend หรือ frontend" >&2; exit 2 ;; esac
cd /opt/pharmacy
ECR_REGISTRY="$(sed -n 's/^ECR_REGISTRY=//p' .env)"   # อ่านเฉพาะบรรทัดนี้ (ไม่ source ทั้งไฟล์ เพราะรหัสผ่านอาจมีอักขระพิเศษ)
aws ecr get-login-password --region "${AWS_REGION:-ap-southeast-1}" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
sed -i "s|^$VAR=.*|$VAR=$TAG|" .env
# up -d <service> เริ่มตัวที่ depends_on ให้ด้วย: backend ใหม่ = migrate รันใหม่ก่อน (tag เปลี่ยน compose จึงสร้าง container migrate ใหม่)
# frontend ใหม่ต้องมี backend อยู่ก่อน (ปล่อย backend ก่อนครั้งแรก ตาม README)
docker compose pull "$SERVICE"
docker compose up -d "$SERVICE"
docker compose ps
