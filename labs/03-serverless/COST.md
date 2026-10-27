# ค่าใช้จ่าย & bill management — Serverless API (API Gateway + Lambda + DynamoDB)

> จ่ายตามการเรียกใช้: ไม่มีคนใช้ = ค่าใกล้ศูนย์ แต่ระวังโหลดพุ่ง/วนลูป

- เปิดทิ้งไว้ 1 เดือน ≈ **$0.00** (เฉพาะรายการคงที่)
- ทำ lab 4 ชั่วโมงแล้ว `terraform destroy` ≈ **$0.00**

| รายการ | คิดตาม | ≈ ต่อเดือน (730 ชม.) | ตอนไม่มีคนใช้ |
|---|---|---|---|
| API Gateway (HTTP API) | ~$1 / 1 ล้าน request (REST API แพงกว่า ~3 เท่า) | – | ไม่คิด |
| Lambda | ฟรี 1 ล้าน request + 400,000 GB-วินาที/เดือน · เกิน ~$0.20/ล้าน + ตาม GB-วินาที | – | ไม่คิด |
| DynamoDB on-demand | คิดต่อ read/write (ตัวเลขหลัก ~$0.25 / $1.25 ต่อล้านหน่วย) · storage 25 GB แรกฟรี | – | ไม่คิด |
| DynamoDB PITR (prd) | ~$0.2/GB-เดือน ของ table | – | ไม่คิด |
| CloudWatch Logs — true | ~$0.5-0.7/GB ingest · มักเป็นก้อนใหญ่สุดที่คนลืม | – | ไม่คิด |
| **รวมรายการคงที่** | $0/ชม. | **$0.00** | |

> ⚠ ตัวเลขเป็น **ประมาณการ** ap-southeast-1 (USD) ไม่รวมภาษี/ค่าโอนข้อมูลจริง และ **ยังไม่ยืนยันกับหน้า pricing ของ AWS** (ยืนยันแล้วเฉพาะ public IPv4 $0.005/ชม. กับ EKS $0.10/ชม.) → ตรวจที่ <https://calculator.aws> ก่อนตัดสินใจ · แก้ตัวเลขที่ `tools/console-lab/src/mod/61-cost-data.js` แล้วรัน `node gen-cost-md.js`

## อะไรทำให้บิลพุ่ง
- จำนวน request (และ memory × เวลาของ Lambda)
- log ที่เขียนต่อ request (debug log)
- Lambda เรียกตัวเอง/วนลูป
- DynamoDB scan ตารางใหญ่

## ลดค่าใช้จ่าย
- ตั้ง log retention 7 วัน และไม่ log ระดับ DEBUG บน prd
- right-size memory ของ Lambda (ลองหลายค่า)
- ใช้ HTTP API แทน REST API ถ้าไม่ต้องการฟีเจอร์เพิ่ม
- ใช้ query/GetItem แทน scan

## ตั้งเตือน / จับตา
- Budget $5 + Anomaly Detection (กัน loop)
- ตั้ง Lambda reserved concurrency เป็นเพดาน
- CloudWatch alarm Lambda Invocations/Throttles

## หยุดจ่ายเมื่อเลิกใช้
`terraform destroy` (ลบ table = ลบ PITR backup ด้วย) · ลบ log group `/aws/lambda/…`

## จัดการ bill ทั่วไป (ทุก lab)
- **ก่อนสร้างอะไร: ตั้ง Budget**: Billing › **Budgets** › Create budget (Cost budget) ตั้งเพดานเช่น $10 + alert ที่ 50% / 80% / 100% ส่งอีเมล · Budget 2 อันแรกต่อบัญชีฟรี · Budget แจ้งเตือนเฉยๆ **ไม่หยุด** resource ให้เอง
- **ดูว่าเงินไปไหน: Cost Explorer**: Billing › **Cost Explorer** กรอง Group by *Service* แล้วลง *Usage type* เช่น `NatGateway-Hours`, `LoadBalancerUsage`, `PublicIPv4:InUseAddress` · เปิดครั้งแรกรอข้อมูล ~24 ชม. และข้อมูลช้าราว 1 วัน (ไม่ใช่ real-time)
- **Tag ทุก resource**: ใส่ tag `Project=pharmacy-lab` ทุก resource (Terraform: `default_tags` ใน provider "aws") แล้ว **activate cost allocation tag** ที่ Billing › Cost allocation tags (มีผลหลัง ~24 ชม.) → กรอง Cost Explorer ตาม tag ได้
- **จับค่าผิดปกติ: Cost Anomaly Detection**: Billing › **Cost Anomaly Detection** สร้าง monitor (ฟรี) + subscription อีเมล · จับกรณี bill พุ่งผิดปกติเช่น Lambda วนลูป, NAT ส่งข้อมูลเยอะ
- **Free tier ไม่ครอบทุกอย่าง**: Billing › **Free Tier** ดูการใช้เทียบโควต้า · แบบ 12 เดือนแรก (EC2 t3.micro ฯลฯ) กับแบบ always-free (Lambda 1 ล้านครั้ง/เดือน, DynamoDB 25 GB) · **NAT, ALB, RDS Multi-AZ, EKS ไม่อยู่ในฟรีเทียร์ของ lab ใหญ่** และ public IPv4 คิดเงินตั้งแต่ ก.พ. 2024
- **ทำเสร็จต้องลบ**: `terraform destroy` ทุกครั้ง แล้วไล่ตรวจของตกค้างที่ยังคิดเงิน: NAT gateway, Elastic IP ที่ไม่ผูก, ALB, RDS (และ snapshot สุดท้าย), EBS volume/snapshot, CloudWatch log group, S3 bucket, ECR image · ใช้ **Tag Editor / Resource Explorer** หาด้วย tag Project
- **กัน bill shock จาก key รั่ว**: อย่าเก็บ access key ใน repo (บอทสแกน GitHub เจอแล้วขุดเหรียญ bill หลักแสนได้) · ใช้ role/OIDC แทน (ดู use case 5) · เปิด MFA ที่ root · ตั้ง Budget + Anomaly Detection ไว้เสมอ
- **ที่อยู่ของหน้า Billing**: คอนโซล › ชื่อบัญชีมุมขวาบน › **Billing and cost management**: Bills (บิลรายเดือนแยกบริการ) · Payments · Cost Explorer · Budgets · Cost Anomaly Detection · Cost allocation tags · Free Tier · Savings Plans

ดูในหน้า Console Lab: Lab › **ค่าใช้จ่าย & Bill** และ Lab › Use case จริง › Serverless…
