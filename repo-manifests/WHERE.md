# โฟลเดอร์นี้อยู่ที่ไหนในระบบจริง

ทั้งโฟลเดอร์นี้คือ **GitHub repo ชื่อ `pharmacy-manifests`** ไม่ได้อยู่บน VM ไหนเลย

| ไฟล์ | ใครเขียน | ใครอ่าน |
|---|---|---|
| `prd/*/deployment.yaml` | Jenkins แก้ทุกบรรทัด `image:` ทุกครั้งที่ปล่อย prd (backend มี 2 บรรทัด: Deployment และ Job `backend-migrate`) | ArgoCD (ใน Kubernetes บน VM `pharmacy-k8s-*`) |
| `argocd-apps/apps.yaml` | คุณ apply ครั้งเดียวตอนตั้งระบบ | ArgoCD ใช้รู้ว่าต้องดู repo ไหน โฟลเดอร์ไหน |

นี่คือจุดเชื่อมระหว่าง Jenkins กับ ArgoCD: Jenkins เขียนไฟล์ลงที่นี่ และ ArgoCD คอยอ่านจากที่นี่

(dev ไม่อยู่ใน repo นี้แล้ว: รันด้วย docker compose ที่ `vm-dev/`)

`prd/backend/deployment.yaml` มี Job `backend-migrate` (ArgoCD PreSync hook) รัน `manage.py migrate` ก่อนปล่อยทุกครั้ง ล้มเหลว = ไม่ปล่อยเวอร์ชันใหม่

อยากรู้ว่าตอนนี้ prd รันเวอร์ชันอะไร: เปิด `prd/backend/deployment.yaml` ดูบรรทัด `image:`
อยากย้อนเวอร์ชัน: ย้อน commit ใน repo นี้ หรือรัน Jenkins แบบ deploy-only ด้วยเวอร์ชันเก่า
