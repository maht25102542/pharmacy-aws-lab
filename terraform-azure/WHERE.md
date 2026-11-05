# terraform-azure/ — ระบบแบบ VM บน Azure (คู่ขนานของ terraform/)

รันจากเครื่องคุณ: `az login` → `cp terraform.tfvars.example terraform.tfvars` → `terraform init && terraform apply` · เสร็จแล้ว `terraform destroy` ทุกครั้ง · ชุดนี้ไม่เขียน `ansible/group_vars/all/terraform.yml` (ชุด AWS เขียน) ค่า ACR ดูจาก output

ยังไม่เคย apply บน Azure (ไม่มี subscription ที่ใช้ทดสอบ) คาดว่าจะเจอ error ตอนรันครั้งแรก

| ไฟล์ | เทียบกับ terraform/ (AWS) |
|---|---|
| `network.tf` | VPC + 3 subnet/ชั้น → VNet + 1 subnet/ชั้น (คร่อมทุก zone) · NAT gateway ผูกกับ subnet |
| `security.tf` | Security group → ASG (ป้ายกลุ่ม) + NSG (กฎผูก subnet) · ต้องมี deny VirtualNetwork เอง |
| `instances.tf` | EC2 + key pair → `azurerm_linux_virtual_machine` (key ฝังในเครื่อง) · AZ → `zone` |
| `acr.tf` | ECR + IAM instance profile → ACR + managed identity + role AcrPush/AcrPull |
| `loadbalancer.tf` | ALB (L7) → Standard Load Balancer (L4) + probe `/healthz` |
| `outputs.tf` | เหมือนเดิม แต่ `acr_login_server` แทน `ecr_registry` |

ไม่เปลี่ยน: Jenkinsfile (ยกเว้น login registry), repo-manifests, ArgoCD
ต้องทำเอง: Ansible inventory แบบ `azure.azcollection.azure_rm` (ป้าย Project/Role/Tier ตรงกับ AWS) · แก้ `ECR_REGISTRY` → ACR และขั้น login (`az login --identity` + `az acr login`) 

## ลองใน Console Lab
เปิด Terminal จำลอง: `cd terraform-azure` → `az login` → `terraform apply` (71 resource) แล้วเปิด Chrome ไป `portal.azure.com` ดู Virtual machines / NSG / Load balancers / ACR ได้ · `az acr login --name <ชื่อ>` ใช้ได้
