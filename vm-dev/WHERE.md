# vm-dev: ไฟล์ที่ Ansible วางบน VM `pharmacy-dev`

dev ใช้ **docker compose** เครื่องเดียว (ไม่มี k3s / ArgoCD) · prd ใช้ k3s + ArgoCD (`vm-k8s/`)

| ไฟล์ในโฟลเดอร์นี้ | อยู่ที่ไหนจริง | หมายเหตุ |
|---|---|---|
| `docker-compose.yml` | VM `pharmacy-dev` `/opt/pharmacy/docker-compose.yml` | migrate → backend → frontend |
| `.env.j2` | VM `pharmacy-dev` `/opt/pharmacy/.env` (สิทธิ์ 0600) | Ansible เรนเดอร์ใส่รหัสผ่านและ IP ของ DB |
| `deploy.sh` | VM `pharmacy-dev` `/opt/pharmacy/deploy.sh` | Jenkins ssh เข้ามาเรียก: login ECR, แก้ tag, `compose pull`, `up -d` |

ใครเอาไปวาง: `ansible/dev.yml`
