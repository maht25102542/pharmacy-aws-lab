# labs/06-single-vm/ — Use case 6: เครื่องเดียว (EC2 + Docker Compose + Caddy HTTPS)

รันจากเครื่องคุณ (laptop) · `terraform init && terraform apply -var my_ip=1.2.3.4/32` (ใส่ `-var domain=app.example.com -var zone_id=Z...` เพื่อได้ HTTPS + A record) · `terraform destroy` เมื่อเลิก
`terraform validate` ผ่านแล้ว · **ยังไม่เคย apply บน AWS จริง** · ไม่มี NAT/ALB/RDS จึงถูกที่สุดในทุก use case แต่เครื่องเดียว = จุดล้มเดียว

| ไฟล์ | ทำอะไร | หน้าที่เทียบใน console |
|---|---|---|
| `versions.tf`, `variables.tf` | provider, my_ip, instance_type, domain, zone_id | — |
| `main.tf` | VPC + public subnet + IGW + route table | VPC |
| `security.tf` | SG: 80/443 จากเน็ต, 22 จาก My IP | EC2 › Security Groups |
| `instance.tf` | key pair, EC2 + **user_data** (docker, compose, Caddyfile, `docker compose up`), Elastic IP, A record (ถ้ามี zone_id) | EC2, Elastic IPs, Route 53 |
| `outputs.tf` | public_ip, คำสั่ง ssh | — |

ลองใน Console Lab: Lab › **Use case จริง** › 6 และ Lab › ตัวอย่างสำเร็จรูป › ⑩ (หน้า Launch instance มีช่อง User data พร้อมตัวอย่าง)
เคส error: SG ไม่เปิด 80 · user_data ลืม `docker compose up` · ไม่ผูก Elastic IP แล้ว stop/start · ไม่มี A record

ข้อจำกัดของตัวจำลอง: ไม่ได้รันสคริปต์จริง อ่าน user_data แล้วตัดสินจากรูปแบบ (มี docker install? มี `docker compose up`? Caddyfile มีชื่อโดเมน?) · ใบรับรอง Let's Encrypt จำลองจากเงื่อนไข DNS + port 80
