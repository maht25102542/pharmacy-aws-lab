# ค่าใช้จ่าย & bill management — เว็บ static (S3 + CloudFront + Route 53 + ACM)

> แทบไม่มีค่าเดินเครื่อง: จ่ายตามปริมาณ data transfer + request

- เปิดทิ้งไว้ 1 เดือน ≈ **$0.50 (฿18)** (เฉพาะรายการคงที่ · อัตราสมมติ 35 บาท/ดอลลาร์)
- **ราคานี้ถือว่า: ถูกมาก** — เว็บ static เล็กทั่วไปบน AWS จ่ายราว $1–10/เดือน · แทบเป็นต้นทุนที่ถูกที่สุดของวิธี deploy ทั้งหมด เพราะไม่มีเครื่องรันตลอด
- ทำ lab 4 ชั่วโมงแล้ว `terraform destroy` ≈ **$0.00 (฿0)**

| รายการ | คิดตาม | ≈ ต่อเดือน (730 ชม.) | ตอนไม่มีคนใช้ |
|---|---|---|---|
| Route 53 hosted zone ×1 — คิดแม้ไม่มีคนเข้าเว็บ | $0.50/เดือน | $0.50 | คิดเงิน |
| Route 53 query | $0.40 / 1 ล้านครั้ง | – | ไม่คิด |
| CloudFront | ฟรี 1 TB + 10 ล้าน request/เดือน (always-free) · เกินคิด $0.12/GB (เอเชีย) + request HTTPS $0.012 / 10,000 | – | ไม่คิด |
| S3 storage + request | $0.025/GB-เดือน · เว็บเล็กไม่ถึง $0.1 | – | ไม่คิด |
| CloudFront invalidation | 1,000 path แรกต่อเดือนฟรี · เกิน $0.005/path | – | ไม่คิด |
| ACM public certificate | ฟรี | – | ไม่คิด |
| **รวมรายการคงที่** | $0/ชม. | **$0.50 (฿18)** | |

**ตัวอย่างรายการที่คิดตามการใช้** (บวกเพิ่มจากรายการคงที่ด้านบน)

| สถานการณ์ | สมมติว่าใช้ | ≈ ต่อเดือน |
|---|---|---|
| เว็บเล็ก: 10,000 ครั้ง/เดือน (หน้าละ ~2 MB) — หักแล้ว: CloudFront ฟรี 1 TB + 10 ล้าน request | 20 GB ออกจาก CloudFront · 10,000 request · DNS 30,000 query · S3 1 GB | ฿1 ($0.04) |
| เว็บคนเข้าเยอะ: 1 ล้านครั้ง/เดือน (หน้าละ ~2 MB) — หักแล้ว: หักฟรี 1 TB แรก · request ยังอยู่ในโควต้า 10 ล้าน | 2 TB ออกจาก CloudFront · 3 ล้าน request · DNS 3 ล้าน query · S3 1 GB | ฿4,344 ($124) |
| invalidate ทั้งเว็บ `/*` วันละครั้ง — หักแล้ว: 1,000 path แรกต่อเดือนฟรี | 30 path/เดือน | ฿0 ($0.00) |

> ✓ ราคา On-Demand ap-southeast-1 (USD) **ตรวจกับ AWS Price List API เมื่อ 28 ต.ค. 2026** · ไม่รวมภาษี/ค่าโอนข้อมูลตามการใช้จริง · โควต้า free tier มาจากเอกสาร AWS · ราคาเปลี่ยนได้ ตรวจซ้ำที่ <https://calculator.aws> ก่อนตัดสินใจ · แก้ตัวเลขที่ `tools/console-lab/src/mod/61-cost-data.js` แล้วรัน `node gen-cost-md.js`

## อะไรทำให้บิลพุ่ง
- data transfer ออกจาก CloudFront (เกินฟรีเทียร์)
- invalidation ถี่/ใช้ wildcard เยอะ
- S3 versioning เก็บของเก่าไม่เคยลบ

## ลดค่าใช้จ่าย
- ตั้ง cache policy ให้ cache hit สูง (ลดการอ่าน S3)
- ใช้ชื่อไฟล์ที่มี hash แทนการ invalidate ทั้งเว็บ
- เลือก Price class ที่จำกัด edge ถ้าผู้ใช้อยู่ภูมิภาคเดียว
- S3 lifecycle ลบ version เก่า

## ตั้งเตือน / จับตา
- Budget $5/เดือน + alert
- CloudFront › Usage reports ดูปริมาณ request/data
- Cost Explorer: Service = CloudFront / S3

## หยุดจ่ายเมื่อเลิกใช้
`terraform destroy` (S3 ต้อง empty ก่อน หรือ `force_destroy = true`) · ลบ hosted zone ด้วยถ้าไม่ใช้โดเมนต่อ ($0.50/เดือนหยุด)

## จัดการ bill ทั่วไป (ทุก lab)
- **ก่อนสร้างอะไร: ตั้ง Budget**: Billing › **Budgets** › Create budget (Cost budget) ตั้งเพดานเช่น $10 + alert ที่ 50% / 80% / 100% ส่งอีเมล · Budget 2 อันแรกต่อบัญชีฟรี · Budget แจ้งเตือนเฉยๆ **ไม่หยุด** resource ให้เอง
- **ดูว่าเงินไปไหน: Cost Explorer**: Billing › **Cost Explorer** กรอง Group by `Service` แล้วลง `Usage type` เช่น `NatGateway-Hours`, `LoadBalancerUsage`, `PublicIPv4:InUseAddress` · เปิดครั้งแรกรอข้อมูล ~24 ชม. และข้อมูลช้าราว 1 วัน (ไม่ใช่ real-time)
- **Tag ทุก resource**: ใส่ tag `Project=pharmacy-lab` ทุก resource (Terraform: `default_tags` ใน provider "aws") แล้ว **activate cost allocation tag** ที่ Billing › Cost allocation tags (มีผลหลัง ~24 ชม.) → กรอง Cost Explorer ตาม tag ได้
- **จับค่าผิดปกติ: Cost Anomaly Detection**: Billing › **Cost Anomaly Detection** สร้าง monitor (ฟรี) + subscription อีเมล · จับกรณี bill พุ่งผิดปกติเช่น Lambda วนลูป, NAT ส่งข้อมูลเยอะ
- **Free tier ไม่ครอบทุกอย่าง**: Billing › **Free Tier** ดูการใช้เทียบโควต้า · แบบ 12 เดือนแรก (EC2 t3.micro ฯลฯ) กับแบบ always-free (Lambda 1 ล้านครั้ง/เดือน, DynamoDB 25 GB) · **NAT, ALB, RDS Multi-AZ, EKS ไม่อยู่ในฟรีเทียร์ของ lab ใหญ่** และ public IPv4 คิดเงินตั้งแต่ ก.พ. 2024
- **ทำเสร็จต้องลบ**: `terraform destroy` ทุกครั้ง แล้วไล่ตรวจของตกค้างที่ยังคิดเงิน: NAT gateway, Elastic IP ที่ไม่ผูก, ALB, RDS (และ snapshot สุดท้าย), EBS volume/snapshot, CloudWatch log group, S3 bucket, ECR image · ใช้ **Tag Editor / Resource Explorer** หาด้วย tag Project
- **กัน bill shock จาก key รั่ว**: อย่าเก็บ access key ใน repo (บอทสแกน GitHub เจอแล้วขุดเหรียญ bill หลักแสนได้) · ใช้ role/OIDC แทน (ดู use case 5) · เปิด MFA ที่ root · ตั้ง Budget + Anomaly Detection ไว้เสมอ
- **ที่อยู่ของหน้า Billing**: คอนโซล › ชื่อบัญชีมุมขวาบน › **Billing and cost management**: Bills (บิลรายเดือนแยกบริการ) · Payments · Cost Explorer · Budgets · Cost Anomaly Detection · Cost allocation tags · Free Tier · Savings Plans

ดูในหน้า Console Lab: Lab › **ค่าใช้จ่าย & Bill** และ Lab › Use case จริง › เว็บ…
