# ค่าใช้จ่าย & bill management — ECS Express Mode (Fargate + ALB แชร์)

> ไม่มีค่า Express เพิ่ม: จ่ายค่า Fargate + ALB (ตัวเดียวแชร์หลาย service) + public IPv4 + log · ไม่มี NAT ถ้าใช้ default VPC

- เปิดทิ้งไว้ 1 เดือน ≈ **$96.8 (฿3,387)** (เฉพาะรายการคงที่ · อัตราสมมติ 35 บาท/ดอลลาร์)
- **ราคานี้ถือว่า: ปกติ** — API container ขนาดเล็ก (Fargate + ALB แชร์ ไม่มี NAT) ทั่วไปราว $40–110/เดือน · ถูกกว่า use case 2 เพราะใช้ default VPC (ไม่มี NAT) และ ALB ตัวเดียวแชร์ dev+prd · ค่าหลักคือ Fargate ที่เปิดตลอด + ALB + public IPv4
- ทำ lab 4 ชั่วโมงแล้ว `terraform destroy` ≈ **$0.53 (฿19)**

| รายการ | คิดตาม | ≈ ต่อเดือน (730 ชม.) | ตอนไม่มีคนใช้ |
|---|---|---|---|
| Application Load Balancer ×1 (แชร์ dev + prd) — + LCU ตามทราฟฟิก · ALB แชร์ได้ ≤25 service | $0.0252/ชม. | $18.4 | คิดเงิน |
| public IPv4 ของ ALB (3 AZ ใน default VPC) — คิดตั้งแต่ ก.พ. 2024 | $0.015/ชม. | $10.9 | คิดเงิน |
| public IPv4 ของ task (default VPC ให้ public IP ทุก task) — dev 1 + prd 2 ตัว (ตาม min tasks) | $0.015/ชม. | $10.9 | คิดเงิน |
| Fargate dev: 1 task (.25 vCPU / .5 GB) — ตั้ง min=0 ไม่ได้ผ่านตัวจำลอง · ลบ service เมื่อไม่ใช้ | $0.0154/ชม. | $11.3 | คิดเงิน |
| Fargate prd: 2 tasks (.5 vCPU / 1 GB) — min tasks = 2 | $0.0617/ชม. | $45.0 | คิดเงิน |
| CloudWatch alarm (faulty deployment) ×2 — $0.10/alarm-เดือน · Express สร้างให้ service ละ 1 | $0.20/เดือน | $0.20 | คิดเงิน |
| CloudWatch Logs | $0.70/GB ingest + $0.03/GB-เดือน เก็บ · ตั้ง retention | – | คิดเงิน |
| ACM certificate | ฟรี (public cert) | – | ไม่คิด |
| Application Auto Scaling | ฟรี | – | ไม่คิด |
| ECR storage | $0.10/GB-เดือน | – | คิดเงิน |
| **รวมรายการคงที่** | $0.1323/ชม. | **$96.8 (฿3,387)** | |

**ตัวอย่างรายการที่คิดตามการใช้** (บวกเพิ่มจากรายการคงที่ด้านบน)

| สถานการณ์ | สมมติว่าใช้ | ≈ ต่อเดือน |
|---|---|---|
| ทราฟฟิกน้อย: ALB เฉลี่ย 1 LCU · log 2 GB · ออกอินเทอร์เน็ต 50 GB — หักแล้ว: data transfer 100 GB แรกฟรี | dev + prd แชร์ ALB ตัวเดียว | ฿253 ($7.24) |
| ทราฟฟิกกลาง: ALB เฉลี่ย 5 LCU · log 20 GB · ออกอินเทอร์เน็ต 300 GB — หักแล้ว: หัก 100 GB แรกฟรี | task scale ออกเกิน min บางช่วง (ไม่รวมในตัวอย่างนี้) | ฿2,352 ($67.2) |

> ✓ ราคา On-Demand ap-southeast-1 (USD) **ตรวจกับ AWS Price List API เมื่อ 28 ต.ค. 2026** · ไม่รวมภาษี/ค่าโอนข้อมูลตามการใช้จริง · โควต้า free tier มาจากเอกสาร AWS · ราคาเปลี่ยนได้ ตรวจซ้ำที่ <https://calculator.aws> ก่อนตัดสินใจ · แก้ตัวเลขที่ `tools/console-lab/src/mod/61-cost-data.js` แล้วรัน `node gen-cost-md.js`

## อะไรทำให้บิลพุ่ง
- จำนวน task × ขนาด × เวลา (Fargate เปิดตลอด)
- public IPv4 ของ ALB + ทุก task
- ALB ต่อชั่วโมง + LCU
- log ที่เขียน

## ลดค่าใช้จ่าย
- dev: ลดเหลือ 1 task เล็กสุด หรือลบ service นอกเวลา
- แชร์ ALB เดียวกันหลาย service (Express ทำให้เองเมื่ออยู่ VPC เดียวกัน)
- ใส่ task ใน private subnet + NAT/VPC endpoint จะเสีย NAT แทน (ไม่ถูกลง) · ใช้ default VPC ถูกสุดสำหรับ lab
- ตั้ง log retention 7 วัน

## ตั้งเตือน / จับตา
- Budget + Anomaly Detection
- Cost Explorer: Usage type `LoadBalancerUsage`, `PublicIPv4:InUseAddress`, Fargate
- ดู desired/running tasks ใน cluster

## หยุดจ่ายเมื่อเลิกใช้
`terraform destroy` (ลบ service ต้องให้ policy ของ role อยู่ก่อน มิฉะนั้นค้าง DRAINING) · ลบ log group `/ecs/pharmacy-express-*` ที่ค้าง

## จัดการ bill ทั่วไป (ทุก lab)
- **ก่อนสร้างอะไร: ตั้ง Budget**: Billing › **Budgets** › Create budget (Cost budget) ตั้งเพดานเช่น $10 + alert ที่ 50% / 80% / 100% ส่งอีเมล · Budget 2 อันแรกต่อบัญชีฟรี · Budget แจ้งเตือนเฉยๆ **ไม่หยุด** resource ให้เอง
- **ดูว่าเงินไปไหน: Cost Explorer**: Billing › **Cost Explorer** กรอง Group by `Service` แล้วลง `Usage type` เช่น `NatGateway-Hours`, `LoadBalancerUsage`, `PublicIPv4:InUseAddress` · เปิดครั้งแรกรอข้อมูล ~24 ชม. และข้อมูลช้าราว 1 วัน (ไม่ใช่ real-time)
- **Tag ทุก resource**: ใส่ tag `Project=pharmacy-lab` ทุก resource (Terraform: `default_tags` ใน provider "aws") แล้ว **activate cost allocation tag** ที่ Billing › Cost allocation tags (มีผลหลัง ~24 ชม.) → กรอง Cost Explorer ตาม tag ได้
- **จับค่าผิดปกติ: Cost Anomaly Detection**: Billing › **Cost Anomaly Detection** สร้าง monitor (ฟรี) + subscription อีเมล · จับกรณี bill พุ่งผิดปกติเช่น Lambda วนลูป, NAT ส่งข้อมูลเยอะ
- **Free tier ไม่ครอบทุกอย่าง**: Billing › **Free Tier** ดูการใช้เทียบโควต้า · แบบ 12 เดือนแรก (EC2 t3.micro ฯลฯ) กับแบบ always-free (Lambda 1 ล้านครั้ง/เดือน, DynamoDB 25 GB) · **NAT, ALB, RDS Multi-AZ, EKS ไม่อยู่ในฟรีเทียร์ของ lab ใหญ่** และ public IPv4 คิดเงินตั้งแต่ ก.พ. 2024
- **ทำเสร็จต้องลบ**: `terraform destroy` ทุกครั้ง แล้วไล่ตรวจของตกค้างที่ยังคิดเงิน: NAT gateway, Elastic IP ที่ไม่ผูก, ALB, RDS (และ snapshot สุดท้าย), EBS volume/snapshot, CloudWatch log group, S3 bucket, ECR image · ใช้ **Tag Editor / Resource Explorer** หาด้วย tag Project
- **กัน bill shock จาก key รั่ว**: อย่าเก็บ access key ใน repo (บอทสแกน GitHub เจอแล้วขุดเหรียญ bill หลักแสนได้) · ใช้ role/OIDC แทน (ดู use case 5) · เปิด MFA ที่ root · ตั้ง Budget + Anomaly Detection ไว้เสมอ
- **ที่อยู่ของหน้า Billing**: คอนโซล › ชื่อบัญชีมุมขวาบน › **Billing and cost management**: Bills (บิลรายเดือนแยกบริการ) · Payments · Cost Explorer · Budgets · Cost Anomaly Detection · Cost allocation tags · Free Tier · Savings Plans

ดูในหน้า Console Lab: Lab › **ค่าใช้จ่าย & Bill** และ Lab › Use case จริง › ECS…
