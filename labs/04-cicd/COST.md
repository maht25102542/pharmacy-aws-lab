# ค่าใช้จ่าย & bill management — CI/CD: CodePipeline + CodeBuild

> ถูก: จ่ายต่อ pipeline + นาทีที่ build · ปลายทาง ECS (use case 2) แพงกว่ามาก

- เปิดทิ้งไว้ 1 เดือน ≈ **$1.00 (฿35)** (เฉพาะรายการคงที่ · อัตราสมมติ 35 บาท/ดอลลาร์)
- **ราคานี้ถือว่า: ถูกมาก** — pipeline CI/CD ของ AWS เองทั่วไปราว $1–10/เดือน (ยังไม่รวมปลายทาง) · ถูก: ค่าจริงอยู่ที่ปลายทางที่ deploy ไปมากกว่าตัว pipeline
- ทำ lab 4 ชั่วโมงแล้ว `terraform destroy` ≈ **$0.01 (฿0)**

| รายการ | คิดตาม | ≈ ต่อเดือน (730 ชม.) | ตอนไม่มีคนใช้ |
|---|---|---|---|
| CodePipeline (V1) 1 pipeline — pipeline แรกต่อบัญชีฟรี (ตามเงื่อนไขปัจจุบัน) | $1.00/เดือน | $1.00 | คิดเงิน |
| CodeBuild | คิดต่อนาทีตามขนาดเครื่อง เช่น general1.small ~$0.005/นาที · build 5 นาที ≈ $0.03 | – | ไม่คิด |
| S3 artifact bucket | เพนนี · ตั้ง lifecycle ลบของเก่า | – | ไม่คิด |
| ECR storage | ~$0.10/GB-เดือน · ตั้ง lifecycle เก็บ 10 image ล่าสุด | – | ไม่คิด |
| Manual approval | ฟรี | – | ไม่คิด |
| ปลายทาง ECS/ALB/NAT/RDS — true | ดู use case 2 — เป็นก้อนหลักของ lab นี้ | – | ไม่คิด |
| **รวมรายการคงที่** | $0/ชม. | **$1.00 (฿35)** | |

> ⚠ ตัวเลขเป็น **ประมาณการ** ap-southeast-1 (USD) ไม่รวมภาษี/ค่าโอนข้อมูลจริง และ **ยังไม่ยืนยันกับหน้า pricing ของ AWS** (ยืนยันแล้วเฉพาะ public IPv4 $0.005/ชม. กับ EKS $0.10/ชม.) → ตรวจที่ <https://calculator.aws> ก่อนตัดสินใจ · แก้ตัวเลขที่ `tools/console-lab/src/mod/61-cost-data.js` แล้วรัน `node gen-cost-md.js`

## อะไรทำให้บิลพุ่ง
- นาที build × ขนาดเครื่อง × จำนวนครั้งที่ trigger
- ปลายทางที่ deploy (ECS)
- image สะสมใน ECR

## ลดค่าใช้จ่าย
- เปิด docker layer cache (CodeBuild cache) ลดนาที
- trigger เฉพาะ branch/tag ที่ต้องการ
- ECR lifecycle policy
- เล็กที่สุดที่ build ผ่าน (general1.small)

## ตั้งเตือน / จับตา
- Cost Explorer: Service = CodeBuild / CodePipeline
- Budget + alert
- ดูจำนวน build ต่อวันที่ผิดปกติ (trigger วน)

## หยุดจ่ายเมื่อเลิกใช้
`terraform destroy` · ลบ pipeline ที่ไม่ใช้ (V1 มีค่าต่อ pipeline ที่ active)

## จัดการ bill ทั่วไป (ทุก lab)
- **ก่อนสร้างอะไร: ตั้ง Budget**: Billing › **Budgets** › Create budget (Cost budget) ตั้งเพดานเช่น $10 + alert ที่ 50% / 80% / 100% ส่งอีเมล · Budget 2 อันแรกต่อบัญชีฟรี · Budget แจ้งเตือนเฉยๆ **ไม่หยุด** resource ให้เอง
- **ดูว่าเงินไปไหน: Cost Explorer**: Billing › **Cost Explorer** กรอง Group by *Service* แล้วลง *Usage type* เช่น `NatGateway-Hours`, `LoadBalancerUsage`, `PublicIPv4:InUseAddress` · เปิดครั้งแรกรอข้อมูล ~24 ชม. และข้อมูลช้าราว 1 วัน (ไม่ใช่ real-time)
- **Tag ทุก resource**: ใส่ tag `Project=pharmacy-lab` ทุก resource (Terraform: `default_tags` ใน provider "aws") แล้ว **activate cost allocation tag** ที่ Billing › Cost allocation tags (มีผลหลัง ~24 ชม.) → กรอง Cost Explorer ตาม tag ได้
- **จับค่าผิดปกติ: Cost Anomaly Detection**: Billing › **Cost Anomaly Detection** สร้าง monitor (ฟรี) + subscription อีเมล · จับกรณี bill พุ่งผิดปกติเช่น Lambda วนลูป, NAT ส่งข้อมูลเยอะ
- **Free tier ไม่ครอบทุกอย่าง**: Billing › **Free Tier** ดูการใช้เทียบโควต้า · แบบ 12 เดือนแรก (EC2 t3.micro ฯลฯ) กับแบบ always-free (Lambda 1 ล้านครั้ง/เดือน, DynamoDB 25 GB) · **NAT, ALB, RDS Multi-AZ, EKS ไม่อยู่ในฟรีเทียร์ของ lab ใหญ่** และ public IPv4 คิดเงินตั้งแต่ ก.พ. 2024
- **ทำเสร็จต้องลบ**: `terraform destroy` ทุกครั้ง แล้วไล่ตรวจของตกค้างที่ยังคิดเงิน: NAT gateway, Elastic IP ที่ไม่ผูก, ALB, RDS (และ snapshot สุดท้าย), EBS volume/snapshot, CloudWatch log group, S3 bucket, ECR image · ใช้ **Tag Editor / Resource Explorer** หาด้วย tag Project
- **กัน bill shock จาก key รั่ว**: อย่าเก็บ access key ใน repo (บอทสแกน GitHub เจอแล้วขุดเหรียญ bill หลักแสนได้) · ใช้ role/OIDC แทน (ดู use case 5) · เปิด MFA ที่ root · ตั้ง Budget + Anomaly Detection ไว้เสมอ
- **ที่อยู่ของหน้า Billing**: คอนโซล › ชื่อบัญชีมุมขวาบน › **Billing and cost management**: Bills (บิลรายเดือนแยกบริการ) · Payments · Cost Explorer · Budgets · Cost Anomaly Detection · Cost allocation tags · Free Tier · Savings Plans

ดูในหน้า Console Lab: Lab › **ค่าใช้จ่าย & Bill** และ Lab › Use case จริง › CI/CD:…
