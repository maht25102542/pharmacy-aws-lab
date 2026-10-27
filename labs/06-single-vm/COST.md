# ค่าใช้จ่าย & bill management — EC2 เครื่องเดียว + Docker Compose + Caddy

> ถูกและเดาง่ายที่สุด: เครื่องคิดเงินตลอดที่เปิด (stop เครื่อง ≠ หยุดทุกอย่าง)

- เปิดทิ้งไว้ 1 เดือน ≈ **$25.4 (฿890)** (เฉพาะรายการคงที่ · อัตราสมมติ 35 บาท/ดอลลาร์)
- ทำ lab 4 ชั่วโมงแล้ว `terraform destroy` ≈ **$0.14 (฿5)**

| รายการ | คิดตาม | ≈ ต่อเดือน (730 ชม.) | ตอนไม่มีคนใช้ |
|---|---|---|---|
| EC2 t3.small — stop เครื่อง = หยุดค่า compute | $0.0264/ชม. | $19.3 | คิดเงิน |
| EBS gp3 20 GB — คิดแม้ stop เครื่อง (ประมาณ) | $2.00/เดือน | $2.00 | คิดเงิน |
| public IPv4 / Elastic IP — คิดแม้ stop เครื่อง และ EIP ที่ไม่ผูกก็คิด | $0.005/ชม. | $3.65 | คิดเงิน |
| Route 53 hosted zone | $0.50/เดือน | $0.50 | คิดเงิน |
| Data transfer ออกอินเทอร์เน็ต | 100 GB/เดือนแรกฟรี (รวมทุกบริการ) · เกินราว $0.12/GB (สิงคโปร์) | – | ไม่คิด |
| EBS snapshot | ~$0.05/GB-เดือน ของข้อมูลที่เก็บ | – | ไม่คิด |
| **รวมรายการคงที่** | $0.0314/ชม. | **$25.4 (฿890)** | |

> ⚠ ตัวเลขเป็น **ประมาณการ** ap-southeast-1 (USD) ไม่รวมภาษี/ค่าโอนข้อมูลจริง และ **ยังไม่ยืนยันกับหน้า pricing ของ AWS** (ยืนยันแล้วเฉพาะ public IPv4 $0.005/ชม. กับ EKS $0.10/ชม.) → ตรวจที่ <https://calculator.aws> ก่อนตัดสินใจ · แก้ตัวเลขที่ `tools/console-lab/src/mod/61-cost-data.js` แล้วรัน `node gen-cost-md.js`

## อะไรทำให้บิลพุ่ง
- ชั่วโมงที่เครื่องเปิด
- t3 โหมด Unlimited: CPU เกิน baseline ต่อเนื่องจะมี surplus credit คิดเพิ่ม
- data transfer ออก

## ลดค่าใช้จ่าย
- เปิดเฉพาะตอนใช้ (stop นอกเวลา)
- ถ้าเปิดตลอด: Savings Plans/Reserved ลดได้ราวหนึ่งในสามขึ้นไป
- ตั้ง t3 เป็น Standard ถ้าไม่อยากให้เกิน baseline แล้วคิดเพิ่ม
- ใช้ Graviton (t4g) ถูกกว่า

## ตั้งเตือน / จับตา
- Budget $30/เดือน
- CloudWatch alarm CPUCreditBalance / CPU
- Billing alert สำหรับ EIP idle

## หยุดจ่ายเมื่อเลิกใช้
`terraform destroy` · ถ้าแค่ stop: อย่าลืม EIP + EBS ยังคิดเงิน · release EIP ที่ไม่ใช้

## จัดการ bill ทั่วไป (ทุก lab)
- **ก่อนสร้างอะไร: ตั้ง Budget**: Billing › **Budgets** › Create budget (Cost budget) ตั้งเพดานเช่น $10 + alert ที่ 50% / 80% / 100% ส่งอีเมล · Budget 2 อันแรกต่อบัญชีฟรี · Budget แจ้งเตือนเฉยๆ **ไม่หยุด** resource ให้เอง
- **ดูว่าเงินไปไหน: Cost Explorer**: Billing › **Cost Explorer** กรอง Group by *Service* แล้วลง *Usage type* เช่น `NatGateway-Hours`, `LoadBalancerUsage`, `PublicIPv4:InUseAddress` · เปิดครั้งแรกรอข้อมูล ~24 ชม. และข้อมูลช้าราว 1 วัน (ไม่ใช่ real-time)
- **Tag ทุก resource**: ใส่ tag `Project=pharmacy-lab` ทุก resource (Terraform: `default_tags` ใน provider "aws") แล้ว **activate cost allocation tag** ที่ Billing › Cost allocation tags (มีผลหลัง ~24 ชม.) → กรอง Cost Explorer ตาม tag ได้
- **จับค่าผิดปกติ: Cost Anomaly Detection**: Billing › **Cost Anomaly Detection** สร้าง monitor (ฟรี) + subscription อีเมล · จับกรณี bill พุ่งผิดปกติเช่น Lambda วนลูป, NAT ส่งข้อมูลเยอะ
- **Free tier ไม่ครอบทุกอย่าง**: Billing › **Free Tier** ดูการใช้เทียบโควต้า · แบบ 12 เดือนแรก (EC2 t3.micro ฯลฯ) กับแบบ always-free (Lambda 1 ล้านครั้ง/เดือน, DynamoDB 25 GB) · **NAT, ALB, RDS Multi-AZ, EKS ไม่อยู่ในฟรีเทียร์ของ lab ใหญ่** และ public IPv4 คิดเงินตั้งแต่ ก.พ. 2024
- **ทำเสร็จต้องลบ**: `terraform destroy` ทุกครั้ง แล้วไล่ตรวจของตกค้างที่ยังคิดเงิน: NAT gateway, Elastic IP ที่ไม่ผูก, ALB, RDS (และ snapshot สุดท้าย), EBS volume/snapshot, CloudWatch log group, S3 bucket, ECR image · ใช้ **Tag Editor / Resource Explorer** หาด้วย tag Project
- **กัน bill shock จาก key รั่ว**: อย่าเก็บ access key ใน repo (บอทสแกน GitHub เจอแล้วขุดเหรียญ bill หลักแสนได้) · ใช้ role/OIDC แทน (ดู use case 5) · เปิด MFA ที่ root · ตั้ง Budget + Anomaly Detection ไว้เสมอ
- **ที่อยู่ของหน้า Billing**: คอนโซล › ชื่อบัญชีมุมขวาบน › **Billing and cost management**: Bills (บิลรายเดือนแยกบริการ) · Payments · Cost Explorer · Budgets · Cost Anomaly Detection · Cost allocation tags · Free Tier · Savings Plans

ดูในหน้า Console Lab: Lab › **ค่าใช้จ่าย & Bill** และ Lab › Use case จริง › EC2…
