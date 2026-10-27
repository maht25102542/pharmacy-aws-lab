# ค่าใช้จ่าย & bill management — ECS Fargate + ALB + RDS

> แพงเพราะของที่ ‘เปิดทิ้ง’: NAT + ALB + RDS ไม่ขึ้นกับทราฟฟิก

- เปิดทิ้งไว้ 1 เดือน ≈ **$208 (฿7,297)** (เฉพาะรายการคงที่ · อัตราสมมติ 35 บาท/ดอลลาร์)
- **ราคานี้ถือว่า: ปกติ** — ระบบ API สำหรับ production ของทีมเล็ก (ALB + NAT + RDS + container) ทั่วไปราว $100–300/เดือน · ปกติสำหรับระบบใช้จริง แต่ถ้าเป็น dev/ทดลอง ถือว่าแพง: ลด NAT เหลือตัวเดียว, RDS single-AZ, ปิดนอกเวลา
- ทำ lab 4 ชั่วโมงแล้ว `terraform destroy` ≈ **$1.14 (฿40)**

| รายการ | คิดตาม | ≈ ต่อเดือน (730 ชม.) | ตอนไม่มีคนใช้ |
|---|---|---|---|
| NAT gateway ×1 — + data processing ~$0.045/GB · เป็นตัวแพงอันดับต้น | $0.059/ชม. | $43.1 | คิดเงิน |
| Application Load Balancer — + LCU ตามทราฟฟิก | $0.0252/ชม. | $18.4 | คิดเงิน |
| public IPv4 (NAT 1 + ALB 3 AZ) — คิดตั้งแต่ ก.พ. 2024 | $0.02/ชม. | $14.6 | คิดเงิน |
| Fargate dev: 1 task (.25 vCPU / .5 GB) — ปิดได้ด้วย desired=0 | $0.0154/ชม. | $11.3 | คิดเงิน |
| Fargate prd: 2 tasks (.5 vCPU / 1 GB) | $0.0617/ชม. | $45.0 | คิดเงิน |
| RDS Postgres dev (db.t4g.micro, single-AZ) — ประมาณ · stop ได้ครั้งละ 7 วัน | $0.02/ชม. | $14.6 | คิดเงิน |
| RDS Postgres prd (db.t4g.small, Multi-AZ) — ประมาณ · Multi-AZ ≈ 2 เท่า | $0.075/ชม. | $54.8 | คิดเงิน |
| RDS storage 20 GB ×2 + backup — ประมาณ | $6.00/เดือน | $6.00 | คิดเงิน |
| Secrets Manager ×2 | $0.80/เดือน | $0.80 | คิดเงิน |
| CloudWatch Logs | ~$0.5-0.7/GB ingest + เก็บ · ตั้ง retention | – | คิดเงิน |
| ECR storage | ~$0.10/GB-เดือน | – | คิดเงิน |
| **รวมรายการคงที่** | $0.2763/ชม. | **$208 (฿7,297)** | |

> ⚠ ตัวเลขเป็น **ประมาณการ** ap-southeast-1 (USD) ไม่รวมภาษี/ค่าโอนข้อมูลจริง และ **ยังไม่ยืนยันกับหน้า pricing ของ AWS** (ยืนยันแล้วเฉพาะ public IPv4 $0.005/ชม. กับ EKS $0.10/ชม.) → ตรวจที่ <https://calculator.aws> ก่อนตัดสินใจ · แก้ตัวเลขที่ `tools/console-lab/src/mod/61-cost-data.js` แล้วรัน `node gen-cost-md.js`

## อะไรทำให้บิลพุ่ง
- NAT gateway (ชม. + GB ที่ผ่าน เช่น pull image/ส่ง log)
- ALB ต่อชั่วโมง
- RDS (โดยเฉพาะ Multi-AZ prd)
- Fargate × จำนวน task × เวลา

## ลดค่าใช้จ่าย
- dev: RDS single-AZ, task น้อย, desired=0 นอกเวลา
- Fargate Spot สำหรับ dev (ถูกกว่ามาก แต่ถูกเรียกคืนได้)
- ใช้ ALB ตัวเดียวหลาย service (host/path routing)
- NAT เทียบ VPC endpoints: interface endpoint ราว $0.01/ชม./AZ ต่อตัว (ถ้าใช้หลายตัวไม่ได้ถูกกว่า NAT) · S3 gateway endpoint ฟรี
- Savings Plans (Compute) ถ้ารัน prd 24/7 จริง

## ตั้งเตือน / จับตา
- Budget แยกด้วย tag Project
- Cost Explorer: Usage type `NatGateway-Hours`, `LoadBalancerUsage`, `RDS:Multi-AZ`
- Cost Anomaly Detection

## หยุดจ่ายเมื่อเลิกใช้
`terraform destroy` · ตรวจ RDS final snapshot กับ automated backup ที่ยังเก็บ (คิดเงินตามขนาด) · ลบ CloudWatch log group และ ECR image

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
