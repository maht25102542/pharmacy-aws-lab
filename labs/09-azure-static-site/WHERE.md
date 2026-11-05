# labs/09-azure-static-site/ — Use case 9: เว็บ static บน Azure (Storage static website) แยก dev / prd

รันจากเครื่องคุณ (laptop): `az login` → `cp terraform.tfvars.example terraform.tfvars` → `terraform init && terraform apply` (`terraform destroy` เมื่อเลิก)
`terraform validate` ผ่านแล้ว (ได้ Warning เรื่อง `storage_container_name` deprecated) · **ยังไม่เคย apply บน Azure จริง** · ไม่ต้องมีโดเมน (เปิดจากที่อยู่ `*.z23.web.core.windows.net` ได้เลย) · เทียบกับ `labs/01-static-site/` (AWS S3 + CloudFront)

| ไฟล์ | ทำอะไร | เทียบกับ AWS lab 01 |
|---|---|---|
| `versions.tf` | provider azurerm (ต้อง `az login`, ระบุ subscription_id) | provider aws |
| `main.tf` | `local.envs` = dev / prd (`for_each` ทุก resource) | เหมือนกัน |
| `storage.tf` | resource group, storage account ×2, static website, `index.html` + `404.html` | S3 bucket + policy + object |
| `outputs.tf` | URL เว็บของแต่ละ env | URL ของ CloudFront |

ที่ต่างจาก AWS: ไม่มี CloudFront/Route 53/ACM (ยังไม่จำลอง Front Door, DNS zone) · ชื่อ storage account ต้องไม่ซ้ำทั้งโลก (พิมพ์เล็ก+ตัวเลข 3-24 ตัว) · static website เปิดให้คนทั่วไปอ่านผ่าน endpoint ของมันเอง ไม่ต้องตั้ง public access ที่ container

ลองใน Console Lab: Terminal จำลอง `cd labs/09-azure-static-site` → `az login` → `terraform apply` (9 resource) แล้วเปิด Chrome ไปที่ `site_urls` · ดู account ที่ `portal.azure.com` › Storage accounts
