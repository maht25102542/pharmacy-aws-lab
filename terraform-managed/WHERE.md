# terraform-managed/ — ระบบแบบ managed (EKS + RDS + SSM)

โฟลเดอร์ทางเลือกของ `terraform/` (แบบ VM) · รันจากเครื่องคุณเหมือนกัน แต่ **อย่า apply ทั้งสองชุดพร้อมกันใน account เดียวกัน** (ชื่อ resource ชนกัน)

ยังไม่เคย `terraform validate` หรือ apply (ไม่มี terraform ในเครื่องที่เขียน และ account AWS ถูกระงับ) คาดว่าจะเจอ error ตอนรันครั้งแรก

| ไฟล์ | แทนอะไรในแบบ VM |
|---|---|
| `eks.tf` | k3s ×3 + dev VM + `ansible/k8s.yml` |
| `rds.tf` | Galera ×3 + `vm-db/` + `ansible/db.yml` |
| `iam.tf` + `instances.tf` | bastion + key pair + SSH (ใช้ SSM แทน) |
| `loadbalancer.tf` | ผูก target group กับ ASG ของ node แทนผูกทีละเครื่อง |
| `network.tf`, `ecr.tf`, `versions.tf` | เหมือนเดิม |

ไม่เปลี่ยน: Jenkinsfile, repo-manifests, ArgoCD (ลงใน EKS ด้วย `kubectl apply` แทน Ansible)
ต้องทำเอง: ลง ArgoCD + สร้าง Secret `db-credentials` จาก Secrets Manager + ตั้งค่า Jenkins/SonarQube (Ansible ต้องใช้ connection `aws_ssm` แทน ssh)

## ลองใน Console Lab
`tools/console-lab` รันโฟลเดอร์นี้ได้ในเทอร์มินัลจำลอง (`cd terraform-managed; terraform init; terraform apply`) และมีหน้า EKS / RDS / SSM ให้กดสร้างเอง · Lab › เทียบ VM กับ Managed
