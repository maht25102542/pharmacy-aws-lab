# labs/01-static-site/ — Use case 1: เว็บ static (S3 + CloudFront + Route 53 + ACM) แยก dev / prd

รันจากเครื่องคุณ (laptop) · `terraform init && terraform apply` (ใช้ `terraform destroy` เมื่อเลิก)
`terraform validate` ผ่านแล้ว · **ยังไม่เคย apply บน AWS จริง** · ต้องมีโดเมนจริงและตั้ง NS ที่ผู้ขายโดเมนให้ชี้ `name_servers` จึงจะเปิดจากอินเทอร์เน็ตได้ (`example.com` ใช้ในตัวจำลองเท่านั้น)

| ไฟล์ | ทำอะไร | หน้าที่เทียบใน console |
|---|---|---|
| `versions.tf` | provider aws (ap-southeast-1) + alias `use1` (us-east-1 สำหรับ ACM ของ CloudFront) | — |
| `main.tf` | `local.envs` = dev / prd (ใช้ `for_each` ทุก resource) | — |
| `s3.tf` | bucket ส่วนตัว ×2, Block public access, bucket policy (OAC + `AWS:SourceArn`), index.html | S3 |
| `acm.tf` | ใบรับรอง (www + dev), CNAME ตรวจสอบ, รอ Issued | ACM, Route 53 |
| `cloudfront.tf` | OAC + distribution ×2 | CloudFront |
| `route53.tf` | hosted zone + A (alias) www/dev | Route 53 |

ลองใน Console Lab: Lab › **Use case จริง** (diagram, แอนิเมชัน, โค้ดเทียบหน้า console, เคส error) และ Lab › ตัวอย่างสำเร็จรูป › ⑤
เคส error ที่จำลอง: 403 AccessDenied (policy ผิด distribution) · ใบรับรองผิด region · ใบรับรอง Pending validation · ปล่อยแล้วเห็นของเก่า (cache)

💰 ค่าใช้จ่าย & bill management ของ lab นี้: [COST.md](COST.md) (สร้างจาก `tools/console-lab/src/mod/61-cost-data.js` ด้วย `node tools/console-lab/gen-cost-md.js`)
