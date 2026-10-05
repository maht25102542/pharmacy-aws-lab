# โฟลเดอร์นี้อยู่ที่ไหนในระบบจริง

| ไฟล์ | อยู่บนเครื่อง | path จริง |
|---|---|---|
| `ecr-refresh.sh` | VM `pharmacy-k8s-1` และ `pharmacy-dev` | `/usr/local/bin/ecr-refresh.sh` |
| `ecr-refresh.service` | VM `pharmacy-k8s-1` และ `pharmacy-dev` | `/etc/systemd/system/ecr-refresh.service` |
| `ecr-refresh.timer` | VM `pharmacy-k8s-1` และ `pharmacy-dev` | `/etc/systemd/system/ecr-refresh.timer` |
| `cluster-base.yaml.j2` | VM `pharmacy-k8s-1` และ `pharmacy-dev` | `/opt/cluster-base.yaml` แล้วถูก apply เข้า cluster |

ใครเอาไปวาง: `ansible/k8s.yml` (`pharmacy-dev` ได้ชุดเดียวกัน แต่ namespace เฉพาะ dev)

สิ่งที่อยู่บนเครื่อง Kubernetes แต่ไม่ได้มาจากโฟลเดอร์นี้:

- **k3s** ติดตั้งด้วยสคริปต์ทางการ ไฟล์ตั้งค่าหลักอยู่ที่ `/etc/rancher/k3s/`
- **ArgoCD** รันเป็น pod อยู่ใน namespace `argocd` ของ cluster บน `pharmacy-k8s-1` เท่านั้น และคุม `pharmacy-dev` ผ่าน secret `cluster-pharmacy-dev`
- **FE และ BE** รันเป็น pod ใน namespace `prd` (k8s-1..3) และ `dev` (pharmacy-dev) ตามไฟล์ใน repo manifest
  ไม่มีไฟล์ของแอปวางอยู่บนเครื่องเลย ArgoCD เป็นคนดึงมาจาก GitHub

ดูของจริงบนเครื่อง:

    ssh ubuntu@<IP ของ pharmacy-k8s-1>
    kubectl get nodes
    kubectl get pods -A
