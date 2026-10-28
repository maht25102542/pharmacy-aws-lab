# ค่าใช้จ่าย & bill management ของทุก lab

> ✓ ราคา On-Demand ap-southeast-1 (USD) **ตรวจกับ AWS Price List API เมื่อ 28 ต.ค. 2026** · ไม่รวมภาษี/ค่าโอนข้อมูลตามการใช้จริง · โควต้า free tier มาจากเอกสาร AWS · ราคาเปลี่ยนได้ ตรวจซ้ำที่ <https://calculator.aws> ก่อนตัดสินใจ · แก้ตัวเลขที่ `tools/console-lab/src/mod/61-cost-data.js` แล้วรัน `node gen-cost-md.js`

## จัดการ bill ทั่วไป
- **ก่อนสร้างอะไร: ตั้ง Budget**: Billing › **Budgets** › Create budget (Cost budget) ตั้งเพดานเช่น $10 + alert ที่ 50% / 80% / 100% ส่งอีเมล · Budget 2 อันแรกต่อบัญชีฟรี · Budget แจ้งเตือนเฉยๆ **ไม่หยุด** resource ให้เอง
- **ดูว่าเงินไปไหน: Cost Explorer**: Billing › **Cost Explorer** กรอง Group by `Service` แล้วลง `Usage type` เช่น `NatGateway-Hours`, `LoadBalancerUsage`, `PublicIPv4:InUseAddress` · เปิดครั้งแรกรอข้อมูล ~24 ชม. และข้อมูลช้าราว 1 วัน (ไม่ใช่ real-time)
- **Tag ทุก resource**: ใส่ tag `Project=pharmacy-lab` ทุก resource (Terraform: `default_tags` ใน provider "aws") แล้ว **activate cost allocation tag** ที่ Billing › Cost allocation tags (มีผลหลัง ~24 ชม.) → กรอง Cost Explorer ตาม tag ได้
- **จับค่าผิดปกติ: Cost Anomaly Detection**: Billing › **Cost Anomaly Detection** สร้าง monitor (ฟรี) + subscription อีเมล · จับกรณี bill พุ่งผิดปกติเช่น Lambda วนลูป, NAT ส่งข้อมูลเยอะ
- **Free tier ไม่ครอบทุกอย่าง**: Billing › **Free Tier** ดูการใช้เทียบโควต้า · แบบ 12 เดือนแรก (EC2 t3.micro ฯลฯ) กับแบบ always-free (Lambda 1 ล้านครั้ง/เดือน, DynamoDB 25 GB) · **NAT, ALB, RDS Multi-AZ, EKS ไม่อยู่ในฟรีเทียร์ของ lab ใหญ่** และ public IPv4 คิดเงินตั้งแต่ ก.พ. 2024
- **ทำเสร็จต้องลบ**: `terraform destroy` ทุกครั้ง แล้วไล่ตรวจของตกค้างที่ยังคิดเงิน: NAT gateway, Elastic IP ที่ไม่ผูก, ALB, RDS (และ snapshot สุดท้าย), EBS volume/snapshot, CloudWatch log group, S3 bucket, ECR image · ใช้ **Tag Editor / Resource Explorer** หาด้วย tag Project
- **กัน bill shock จาก key รั่ว**: อย่าเก็บ access key ใน repo (บอทสแกน GitHub เจอแล้วขุดเหรียญ bill หลักแสนได้) · ใช้ role/OIDC แทน (ดู use case 5) · เปิด MFA ที่ root · ตั้ง Budget + Anomaly Detection ไว้เสมอ
- **ที่อยู่ของหน้า Billing**: คอนโซล › ชื่อบัญชีมุมขวาบน › **Billing and cost management**: Bills (บิลรายเดือนแยกบริการ) · Payments · Cost Explorer · Budgets · Cost Anomaly Detection · Cost allocation tags · Free Tier · Savings Plans

## main lab (VM): k3s + Jenkins + ArgoCD + MariaDB Galera

- เปิดทิ้ง 1 เดือน ≈ **$405** · ทำ 4 ชม. ≈ **$2.22**
- ทำ lab เสร็จใน 1 วัน ~ ไม่กี่ดอลลาร์ แต่ลืมเปิดทิ้งทั้งเดือน = หลายร้อยดอลลาร์ · ลดด้วย `k8s_node_count = 1`, `db_count = 1`

| รายการ | คิดตาม | ≈ ต่อเดือน (730 ชม.) | ตอนไม่มีคนใช้ |
|---|---|---|---|
| EC2 t3.micro (bastion) | $0.0132/ชม. | $9.64 | คิดเงิน |
| EC2 t3.medium ×6 (jenkins, sonarqube, k8s ×3, dev) | $0.3168/ชม. | $231 | คิดเงิน |
| EC2 t3.small ×3 (DB Galera) | $0.0792/ชม. | $57.8 | คิดเงิน |
| NAT gateway ×1 — + ข้อมูลที่ผ่าน | $0.059/ชม. | $43.1 | คิดเงิน |
| ALB | $0.0252/ชม. | $18.4 | คิดเงิน |
| public IPv4 (bastion, jenkins, sonarqube, NAT, ALB ×3) | $0.035/ชม. | $25.6 | คิดเงิน |
| EBS gp3 10 volume ×20 GB — $0.096/GB-เดือน | $19.2/เดือน | $19.2 | คิดเงิน |
| **รวมรายการคงที่** | $0.5284/ชม. | **$405 (฿14,173)** | |

## terraform-managed: EKS + RDS Multi-AZ + SSM

- เปิดทิ้ง 1 เดือน ≈ **$339** · ทำ 4 ชม. ≈ **$1.86**
- ไม่ต้องดูแล k8s/DB เอง แต่ค่า control plane + Multi-AZ เป็นค่าคงที่ที่แพงกว่าแบบ VM เมื่อรันน้อยชั่วโมง

| รายการ | คิดตาม | ≈ ต่อเดือน (730 ชม.) | ตอนไม่มีคนใช้ |
|---|---|---|---|
| EKS control plane — $73/เดือนก่อนมี node | $0.1/ชม. | $73.0 | คิดเงิน |
| EC2 t3.medium ×3 (node group) | $0.1584/ชม. | $116 | คิดเงิน |
| RDS db.t4g.small Multi-AZ | $0.102/ชม. | $74.5 | คิดเงิน |
| NAT gateway ×1 | $0.059/ชม. | $43.1 | คิดเงิน |
| ALB | $0.0252/ชม. | $18.4 | คิดเงิน |
| public IPv4 (NAT, ALB ×3) | $0.02/ชม. | $14.6 | คิดเงิน |
| **รวมรายการคงที่** | $0.4646/ชม. | **$339 (฿11,871)** | |

## lab ย่อย
ดูไฟล์ `COST.md` ในแต่ละ `labs/NN-*/`
