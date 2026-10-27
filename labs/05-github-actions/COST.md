# ค่าใช้จ่าย & bill management — GitHub Actions + OIDC → ECR → ECS

> ฝั่ง AWS แทบไม่มีค่าเพิ่ม · ค่า build อยู่ที่ GitHub · ข้อดีใหญ่คือไม่มี access key ให้รั่ว

- เปิดทิ้งไว้ 1 เดือน ≈ **$0.00 (฿0)** (เฉพาะรายการคงที่ · อัตราสมมติ 35 บาท/ดอลลาร์)
- ทำ lab 4 ชั่วโมงแล้ว `terraform destroy` ≈ **$0.00 (฿0)**

| รายการ | คิดตาม | ≈ ต่อเดือน (730 ชม.) | ตอนไม่มีคนใช้ |
|---|---|---|---|
| GitHub Actions minutes (จ่ายที่ GitHub ไม่ใช่ AWS) | public repo ฟรี · private บนแผน Free ~2,000 นาที/เดือน (ตรวจเงื่อนไขล่าสุดที่ GitHub) | – | ไม่คิด |
| IAM OIDC provider + STS | ฟรี | – | ไม่คิด |
| ECR storage | ~$0.10/GB-เดือน · ตั้ง lifecycle | – | ไม่คิด |
| ปลายทาง ECS/ALB/NAT/RDS — true | ดู use case 2 — ก้อนหลัก | – | ไม่คิด |
| **รวมรายการคงที่** | $0/ชม. | **$0.00 (฿0)** | |

> ⚠ ตัวเลขเป็น **ประมาณการ** ap-southeast-1 (USD) ไม่รวมภาษี/ค่าโอนข้อมูลจริง และ **ยังไม่ยืนยันกับหน้า pricing ของ AWS** (ยืนยันแล้วเฉพาะ public IPv4 $0.005/ชม. กับ EKS $0.10/ชม.) → ตรวจที่ <https://calculator.aws> ก่อนตัดสินใจ · แก้ตัวเลขที่ `tools/console-lab/src/mod/61-cost-data.js` แล้วรัน `node gen-cost-md.js`

## อะไรทำให้บิลพุ่ง
- นาทีของ runner (ฝั่ง GitHub)
- ปลายทาง ECS
- image ใน ECR

## ลดค่าใช้จ่าย
- cache dependency/docker layer ใน workflow
- ใช้ concurrency group ยกเลิก run ซ้ำ
- ECR lifecycle policy

## ตั้งเตือน / จับตา
- GitHub › Settings › Billing ดูนาทีที่ใช้
- AWS Budget + Anomaly Detection (กัน key รั่ว: ใช้ OIDC แล้วความเสี่ยงนี้ลดมาก)
- trust policy ต้องจำกัด repo/environment ไม่งั้นคนอื่นขอ role ได้

## หยุดจ่ายเมื่อเลิกใช้
`terraform destroy` · ลบ OIDC provider/role ถ้าเลิกใช้ · ปิด workflow ที่ไม่ใช้

## จัดการ bill ทั่วไป (ทุก lab)
- **ก่อนสร้างอะไร: ตั้ง Budget**: Billing › **Budgets** › Create budget (Cost budget) ตั้งเพดานเช่น $10 + alert ที่ 50% / 80% / 100% ส่งอีเมล · Budget 2 อันแรกต่อบัญชีฟรี · Budget แจ้งเตือนเฉยๆ **ไม่หยุด** resource ให้เอง
- **ดูว่าเงินไปไหน: Cost Explorer**: Billing › **Cost Explorer** กรอง Group by *Service* แล้วลง *Usage type* เช่น `NatGateway-Hours`, `LoadBalancerUsage`, `PublicIPv4:InUseAddress` · เปิดครั้งแรกรอข้อมูล ~24 ชม. และข้อมูลช้าราว 1 วัน (ไม่ใช่ real-time)
- **Tag ทุก resource**: ใส่ tag `Project=pharmacy-lab` ทุก resource (Terraform: `default_tags` ใน provider "aws") แล้ว **activate cost allocation tag** ที่ Billing › Cost allocation tags (มีผลหลัง ~24 ชม.) → กรอง Cost Explorer ตาม tag ได้
- **จับค่าผิดปกติ: Cost Anomaly Detection**: Billing › **Cost Anomaly Detection** สร้าง monitor (ฟรี) + subscription อีเมล · จับกรณี bill พุ่งผิดปกติเช่น Lambda วนลูป, NAT ส่งข้อมูลเยอะ
- **Free tier ไม่ครอบทุกอย่าง**: Billing › **Free Tier** ดูการใช้เทียบโควต้า · แบบ 12 เดือนแรก (EC2 t3.micro ฯลฯ) กับแบบ always-free (Lambda 1 ล้านครั้ง/เดือน, DynamoDB 25 GB) · **NAT, ALB, RDS Multi-AZ, EKS ไม่อยู่ในฟรีเทียร์ของ lab ใหญ่** และ public IPv4 คิดเงินตั้งแต่ ก.พ. 2024
- **ทำเสร็จต้องลบ**: `terraform destroy` ทุกครั้ง แล้วไล่ตรวจของตกค้างที่ยังคิดเงิน: NAT gateway, Elastic IP ที่ไม่ผูก, ALB, RDS (และ snapshot สุดท้าย), EBS volume/snapshot, CloudWatch log group, S3 bucket, ECR image · ใช้ **Tag Editor / Resource Explorer** หาด้วย tag Project
- **กัน bill shock จาก key รั่ว**: อย่าเก็บ access key ใน repo (บอทสแกน GitHub เจอแล้วขุดเหรียญ bill หลักแสนได้) · ใช้ role/OIDC แทน (ดู use case 5) · เปิด MFA ที่ root · ตั้ง Budget + Anomaly Detection ไว้เสมอ
- **ที่อยู่ของหน้า Billing**: คอนโซล › ชื่อบัญชีมุมขวาบน › **Billing and cost management**: Bills (บิลรายเดือนแยกบริการ) · Payments · Cost Explorer · Budgets · Cost Anomaly Detection · Cost allocation tags · Free Tier · Savings Plans

ดูในหน้า Console Lab: Lab › **ค่าใช้จ่าย & Bill** และ Lab › Use case จริง › GitHub…
