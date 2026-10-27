// ===== ข้อมูล cost / bill management ของทุก lab (ใช้ทั้งหน้า Lab และไฟล์ COST.md ของแต่ละ labs/NN-*) =====
// ⚠ อัตราเป็น "ประมาณการ ap-southeast-1 (USD)" จากความจำ/บล็อกภายนอก ยังไม่ยืนยันกับหน้า pricing ของ AWS
//   (ยืนยันแล้วเฉพาะ: public IPv4 $0.005/ชม. ตามประกาศ AWS ก.พ. 2024 · EKS control plane $0.10/ชม.) → ตรวจที่ https://calculator.aws ก่อนตัดสินใจ
var COST_HRS = 730; // ชม./เดือน
var CR = { nat: 0.059, natGb: 0.045, ipv4: 0.005, alb: 0.0252, t3micro: 0.0132, t3small: 0.0264, t3medium: 0.0528, fgCpu: 0.0506, fgGb: 0.00553, eks: 0.10, rdsMicro: 0.02, rdsSmallMulti: 0.075, aprMemGb: 0.007, ebsGb: 0.1 };
function cH(n, r, q, note, idle) { return { n: n, k: "hr", r: r, q: q || 1, note: note || "", idle: idle !== false }; }   // คิดต่อชั่วโมงที่เปิดอยู่
function cM(n, usd, note, idle) { return { n: n, k: "mo", r: usd, q: 1, note: note || "", idle: idle !== false }; }    // คิดต่อเดือนคงที่
function cU(n, unit, note, idle) { return { n: n, k: "use", unit: unit, note: note || "", idle: !!idle }; }            // คิดตามการใช้ (ไม่มีรายการคงที่)
var COSTD = {
  gen: [
    ["ก่อนสร้างอะไร: ตั้ง Budget", "#c62828", "Billing › **Budgets** › Create budget (Cost budget) ตั้งเพดานเช่น $10 + alert ที่ 50% / 80% / 100% ส่งอีเมล · Budget 2 อันแรกต่อบัญชีฟรี · Budget แจ้งเตือนเฉยๆ **ไม่หยุด** resource ให้เอง"],
    ["ดูว่าเงินไปไหน: Cost Explorer", "#2b6cb0", "Billing › **Cost Explorer** กรอง Group by *Service* แล้วลง *Usage type* เช่น `NatGateway-Hours`, `LoadBalancerUsage`, `PublicIPv4:InUseAddress` · เปิดครั้งแรกรอข้อมูล ~24 ชม. และข้อมูลช้าราว 1 วัน (ไม่ใช่ real-time)"],
    ["Tag ทุก resource", "#6d28d9", "ใส่ tag `Project=pharmacy-lab` ทุก resource (Terraform: `default_tags` ใน provider \"aws\") แล้ว **activate cost allocation tag** ที่ Billing › Cost allocation tags (มีผลหลัง ~24 ชม.) → กรอง Cost Explorer ตาม tag ได้"],
    ["จับค่าผิดปกติ: Cost Anomaly Detection", "#a85a00", "Billing › **Cost Anomaly Detection** สร้าง monitor (ฟรี) + subscription อีเมล · จับกรณี bill พุ่งผิดปกติเช่น Lambda วนลูป, NAT ส่งข้อมูลเยอะ"],
    ["Free tier ไม่ครอบทุกอย่าง", "#1d8102", "Billing › **Free Tier** ดูการใช้เทียบโควต้า · แบบ 12 เดือนแรก (EC2 t3.micro ฯลฯ) กับแบบ always-free (Lambda 1 ล้านครั้ง/เดือน, DynamoDB 25 GB) · **NAT, ALB, RDS Multi-AZ, EKS ไม่อยู่ในฟรีเทียร์ของ lab ใหญ่** และ public IPv4 คิดเงินตั้งแต่ ก.พ. 2024"],
    ["ทำเสร็จต้องลบ", "#c62828", "`terraform destroy` ทุกครั้ง แล้วไล่ตรวจของตกค้างที่ยังคิดเงิน: NAT gateway, Elastic IP ที่ไม่ผูก, ALB, RDS (และ snapshot สุดท้าย), EBS volume/snapshot, CloudWatch log group, S3 bucket, ECR image · ใช้ **Tag Editor / Resource Explorer** หาด้วย tag Project"],
    ["กัน bill shock จาก key รั่ว", "#a85a00", "อย่าเก็บ access key ใน repo (บอทสแกน GitHub เจอแล้วขุดเหรียญ bill หลักแสนได้) · ใช้ role/OIDC แทน (ดู use case 5) · เปิด MFA ที่ root · ตั้ง Budget + Anomaly Detection ไว้เสมอ"],
    ["ที่อยู่ของหน้า Billing", "#2b6cb0", "คอนโซล › ชื่อบัญชีมุมขวาบน › **Billing and cost management**: Bills (บิลรายเดือนแยกบริการ) · Payments · Cost Explorer · Budgets · Cost Anomaly Detection · Cost allocation tags · Free Tier · Savings Plans"]
  ],
  uc: {
    static: {
      title: "เว็บ static (S3 + CloudFront + Route 53 + ACM)", big: "แทบไม่มีค่าเดินเครื่อง: จ่ายตามปริมาณ data transfer + request",
      items: [cM("Route 53 hosted zone ×1", 0.5, "คิดแม้ไม่มีคนเข้าเว็บ"), cU("Route 53 query", "~$0.40 / 1 ล้านครั้ง"), cU("CloudFront", "ฟรี 1 TB + 10 ล้าน request/เดือน (always-free) · เกินคิดตามภูมิภาค ~$0.12/GB (เอเชีย)"), cU("S3 storage + request", "~$0.025/GB-เดือน · เว็บเล็กไม่ถึง $0.1"), cU("CloudFront invalidation", "1,000 path แรกต่อเดือนฟรี · เกิน ~$0.005/path"), cU("ACM public certificate", "ฟรี")],
      drivers: ["data transfer ออกจาก CloudFront (เกินฟรีเทียร์)", "invalidation ถี่/ใช้ wildcard เยอะ", "S3 versioning เก็บของเก่าไม่เคยลบ"],
      cut: ["ตั้ง cache policy ให้ cache hit สูง (ลดการอ่าน S3)", "ใช้ชื่อไฟล์ที่มี hash แทนการ invalidate ทั้งเว็บ", "เลือก Price class ที่จำกัด edge ถ้าผู้ใช้อยู่ภูมิภาคเดียว", "S3 lifecycle ลบ version เก่า"],
      watch: ["Budget $5/เดือน + alert", "CloudFront › Usage reports ดูปริมาณ request/data", "Cost Explorer: Service = CloudFront / S3"],
      stop: "`terraform destroy` (S3 ต้อง empty ก่อน หรือ `force_destroy = true`) · ลบ hosted zone ด้วยถ้าไม่ใช้โดเมนต่อ ($0.50/เดือนหยุด)"
    },
    ecs: {
      title: "ECS Fargate + ALB + RDS", big: "แพงเพราะของที่ ‘เปิดทิ้ง’: NAT + ALB + RDS ไม่ขึ้นกับทราฟฟิก",
      items: [cH("NAT gateway ×1", CR.nat, 1, "+ data processing ~$0.045/GB · เป็นตัวแพงอันดับต้น"), cH("Application Load Balancer", CR.alb, 1, "+ LCU ตามทราฟฟิก"), cH("public IPv4 (NAT 1 + ALB 3 AZ)", CR.ipv4, 4, "คิดตั้งแต่ ก.พ. 2024"),
        cH("Fargate dev: 1 task (.25 vCPU / .5 GB)", 0.25 * CR.fgCpu + 0.5 * CR.fgGb, 1, "ปิดได้ด้วย desired=0"), cH("Fargate prd: 2 tasks (.5 vCPU / 1 GB)", 0.5 * CR.fgCpu + 1 * CR.fgGb, 2),
        cH("RDS Postgres dev (db.t4g.micro, single-AZ)", CR.rdsMicro, 1, "ประมาณ · stop ได้ครั้งละ 7 วัน"), cH("RDS Postgres prd (db.t4g.small, Multi-AZ)", CR.rdsSmallMulti, 1, "ประมาณ · Multi-AZ ≈ 2 เท่า"),
        cM("RDS storage 20 GB ×2 + backup", 6, "ประมาณ"), cM("Secrets Manager ×2", 0.8), cU("CloudWatch Logs", "~$0.5-0.7/GB ingest + เก็บ · ตั้ง retention", true), cU("ECR storage", "~$0.10/GB-เดือน", true)],
      drivers: ["NAT gateway (ชม. + GB ที่ผ่าน เช่น pull image/ส่ง log)", "ALB ต่อชั่วโมง", "RDS (โดยเฉพาะ Multi-AZ prd)", "Fargate × จำนวน task × เวลา"],
      cut: ["dev: RDS single-AZ, task น้อย, desired=0 นอกเวลา", "Fargate Spot สำหรับ dev (ถูกกว่ามาก แต่ถูกเรียกคืนได้)", "ใช้ ALB ตัวเดียวหลาย service (host/path routing)", "NAT เทียบ VPC endpoints: interface endpoint ราว $0.01/ชม./AZ ต่อตัว (ถ้าใช้หลายตัวไม่ได้ถูกกว่า NAT) · S3 gateway endpoint ฟรี", "Savings Plans (Compute) ถ้ารัน prd 24/7 จริง"],
      watch: ["Budget แยกด้วย tag Project", "Cost Explorer: Usage type `NatGateway-Hours`, `LoadBalancerUsage`, `RDS:Multi-AZ`", "Cost Anomaly Detection"],
      stop: "`terraform destroy` · ตรวจ RDS final snapshot กับ automated backup ที่ยังเก็บ (คิดเงินตามขนาด) · ลบ CloudWatch log group และ ECR image"
    },
    sls: {
      title: "Serverless API (API Gateway + Lambda + DynamoDB)", big: "จ่ายตามการเรียกใช้: ไม่มีคนใช้ = ค่าใกล้ศูนย์ แต่ระวังโหลดพุ่ง/วนลูป",
      items: [cU("API Gateway (HTTP API)", "~$1 / 1 ล้าน request (REST API แพงกว่า ~3 เท่า)"), cU("Lambda", "ฟรี 1 ล้าน request + 400,000 GB-วินาที/เดือน · เกิน ~$0.20/ล้าน + ตาม GB-วินาที"), cU("DynamoDB on-demand", "คิดต่อ read/write (ตัวเลขหลัก ~$0.25 / $1.25 ต่อล้านหน่วย) · storage 25 GB แรกฟรี"), cU("DynamoDB PITR (prd)", "~$0.2/GB-เดือน ของ table"), cU("CloudWatch Logs", "~$0.5-0.7/GB ingest · มักเป็นก้อนใหญ่สุดที่คนลืม", true)],
      drivers: ["จำนวน request (และ memory × เวลาของ Lambda)", "log ที่เขียนต่อ request (debug log)", "Lambda เรียกตัวเอง/วนลูป", "DynamoDB scan ตารางใหญ่"],
      cut: ["ตั้ง log retention 7 วัน และไม่ log ระดับ DEBUG บน prd", "right-size memory ของ Lambda (ลองหลายค่า)", "ใช้ HTTP API แทน REST API ถ้าไม่ต้องการฟีเจอร์เพิ่ม", "ใช้ query/GetItem แทน scan"],
      watch: ["Budget $5 + Anomaly Detection (กัน loop)", "ตั้ง Lambda reserved concurrency เป็นเพดาน", "CloudWatch alarm Lambda Invocations/Throttles"],
      stop: "`terraform destroy` (ลบ table = ลบ PITR backup ด้วย) · ลบ log group `/aws/lambda/…`"
    },
    cd: {
      title: "CI/CD: CodePipeline + CodeBuild", big: "ถูก: จ่ายต่อ pipeline + นาทีที่ build · ปลายทาง ECS (use case 2) แพงกว่ามาก",
      items: [cM("CodePipeline (V1) 1 pipeline", 1, "pipeline แรกต่อบัญชีฟรี (ตามเงื่อนไขปัจจุบัน)"), cU("CodeBuild", "คิดต่อนาทีตามขนาดเครื่อง เช่น general1.small ~$0.005/นาที · build 5 นาที ≈ $0.03", false), cU("S3 artifact bucket", "เพนนี · ตั้ง lifecycle ลบของเก่า"), cU("ECR storage", "~$0.10/GB-เดือน · ตั้ง lifecycle เก็บ 10 image ล่าสุด"), cU("Manual approval", "ฟรี"), cU("ปลายทาง ECS/ALB/NAT/RDS", "ดู use case 2 — เป็นก้อนหลักของ lab นี้", true)],
      drivers: ["นาที build × ขนาดเครื่อง × จำนวนครั้งที่ trigger", "ปลายทางที่ deploy (ECS)", "image สะสมใน ECR"],
      cut: ["เปิด docker layer cache (CodeBuild cache) ลดนาที", "trigger เฉพาะ branch/tag ที่ต้องการ", "ECR lifecycle policy", "เล็กที่สุดที่ build ผ่าน (general1.small)"],
      watch: ["Cost Explorer: Service = CodeBuild / CodePipeline", "Budget + alert", "ดูจำนวน build ต่อวันที่ผิดปกติ (trigger วน)"],
      stop: "`terraform destroy` · ลบ pipeline ที่ไม่ใช้ (V1 มีค่าต่อ pipeline ที่ active)"
    },
    gha: {
      title: "GitHub Actions + OIDC → ECR → ECS", big: "ฝั่ง AWS แทบไม่มีค่าเพิ่ม · ค่า build อยู่ที่ GitHub · ข้อดีใหญ่คือไม่มี access key ให้รั่ว",
      items: [cU("GitHub Actions minutes (จ่ายที่ GitHub ไม่ใช่ AWS)", "public repo ฟรี · private บนแผน Free ~2,000 นาที/เดือน (ตรวจเงื่อนไขล่าสุดที่ GitHub)"), cU("IAM OIDC provider + STS", "ฟรี"), cU("ECR storage", "~$0.10/GB-เดือน · ตั้ง lifecycle"), cU("ปลายทาง ECS/ALB/NAT/RDS", "ดู use case 2 — ก้อนหลัก", true)],
      drivers: ["นาทีของ runner (ฝั่ง GitHub)", "ปลายทาง ECS", "image ใน ECR"],
      cut: ["cache dependency/docker layer ใน workflow", "ใช้ concurrency group ยกเลิก run ซ้ำ", "ECR lifecycle policy"],
      watch: ["GitHub › Settings › Billing ดูนาทีที่ใช้", "AWS Budget + Anomaly Detection (กัน key รั่ว: ใช้ OIDC แล้วความเสี่ยงนี้ลดมาก)", "trust policy ต้องจำกัด repo/environment ไม่งั้นคนอื่นขอ role ได้"],
      stop: "`terraform destroy` · ลบ OIDC provider/role ถ้าเลิกใช้ · ปิด workflow ที่ไม่ใช้"
    },
    single: {
      title: "EC2 เครื่องเดียว + Docker Compose + Caddy", big: "ถูกและเดาง่ายที่สุด: เครื่องคิดเงินตลอดที่เปิด (stop เครื่อง ≠ หยุดทุกอย่าง)",
      items: [cH("EC2 t3.small", CR.t3small, 1, "stop เครื่อง = หยุดค่า compute"), cM("EBS gp3 20 GB", 2, "คิดแม้ stop เครื่อง (ประมาณ)"), cH("public IPv4 / Elastic IP", CR.ipv4, 1, "คิดแม้ stop เครื่อง และ EIP ที่ไม่ผูกก็คิด"), cM("Route 53 hosted zone", 0.5), cU("Data transfer ออกอินเทอร์เน็ต", "100 GB/เดือนแรกฟรี (รวมทุกบริการ) · เกินราว $0.12/GB (สิงคโปร์)"), cU("EBS snapshot", "~$0.05/GB-เดือน ของข้อมูลที่เก็บ", false)],
      drivers: ["ชั่วโมงที่เครื่องเปิด", "t3 โหมด Unlimited: CPU เกิน baseline ต่อเนื่องจะมี surplus credit คิดเพิ่ม", "data transfer ออก"],
      cut: ["เปิดเฉพาะตอนใช้ (stop นอกเวลา)", "ถ้าเปิดตลอด: Savings Plans/Reserved ลดได้ราวหนึ่งในสามขึ้นไป", "ตั้ง t3 เป็น Standard ถ้าไม่อยากให้เกิน baseline แล้วคิดเพิ่ม", "ใช้ Graviton (t4g) ถูกกว่า"],
      watch: ["Budget $30/เดือน", "CloudWatch alarm CPUCreditBalance / CPU", "Billing alert สำหรับ EIP idle"],
      stop: "`terraform destroy` · ถ้าแค่ stop: อย่าลืม EIP + EBS ยังคิดเงิน · release EIP ที่ไม่ใช้"
    },
    apr: {
      title: "App Runner (image → URL HTTPS)", big: "มีค่า ‘พื้น’ ตามหน่วยความจำที่จองไว้ แม้ไม่มีคนเรียก + ค่า active ตาม vCPU/memory ตอนรับงาน",
      items: [cH("Provisioned memory dev (0.5 GB ×1 instance)", 0.5 * CR.aprMemGb, 1, "ค่าพื้นตอน idle (ประมาณ)"), cH("Provisioned memory prd (2 GB ×1 instance)", 2 * CR.aprMemGb, 1, "ค่าพื้นตอน idle (ประมาณ)"), cU("Active vCPU + memory", "คิดเพิ่มเฉพาะช่วงที่รับ request (~$0.064/vCPU-ชม. + memory · ประมาณ)", false), cU("ECR storage", "~$0.10/GB-เดือน", false)],
      drivers: ["จำนวน instance ขั้นต่ำ × memory ที่จอง", "ชั่วโมงที่ active (ทราฟฟิก)", "auto scaling สเกลออกหลายตัว"],
      cut: ["ตั้ง min instance = 1 และขนาดเล็กสุดที่พอ", "Pause service ที่ไม่ใช้ (หยุดค่า)", "dev ลบทิ้งนอกเวลา"],
      watch: ["Budget + alert", "App Runner › Metrics ดู Active instances", "Cost Explorer: Service = App Runner"],
      stop: "`terraform destroy` หรือ Pause/Delete service · ⚠ App Runner ปิดรับลูกค้าใหม่แล้ว โปรเจกต์ใหม่พิจารณา ECS Express Mode"
    }
  },
  mainlab: {
    vm: { title: "main lab (VM): k3s + Jenkins + ArgoCD + MariaDB Galera", items: [cH("EC2 t3.micro (bastion)", CR.t3micro, 1), cH("EC2 t3.medium ×6 (jenkins, sonarqube, k8s ×3, dev)", CR.t3medium, 6), cH("EC2 t3.small ×3 (DB Galera)", CR.t3small, 3), cH("NAT gateway ×1", CR.nat, 1, "+ ข้อมูลที่ผ่าน"), cH("ALB", CR.alb, 1), cH("public IPv4 (bastion, jenkins, sonarqube, NAT, ALB ×3)", CR.ipv4, 7), cM("EBS ประมาณ 10 volume ×20 GB", 20, "ประมาณ")], note: "ทำ lab เสร็จใน 1 วัน ~ ไม่กี่ดอลลาร์ แต่ลืมเปิดทิ้งทั้งเดือน = หลายร้อยดอลลาร์ · ลดด้วย `k8s_node_count = 1`, `db_count = 1`" },
    managed: { title: "terraform-managed: EKS + RDS Multi-AZ + SSM", items: [cH("EKS control plane", CR.eks, 1, "$73/เดือนก่อนมี node"), cH("EC2 t3.medium ×3 (node group)", CR.t3medium, 3), cH("RDS db.t4g.small Multi-AZ", CR.rdsSmallMulti, 1, "ประมาณ"), cH("NAT gateway ×1", CR.nat, 1), cH("ALB", CR.alb, 1), cH("public IPv4 (NAT, ALB ×3)", CR.ipv4, 4)], note: "ไม่ต้องดูแล k8s/DB เอง แต่ค่า control plane + Multi-AZ เป็นค่าคงที่ที่แพงกว่าแบบ VM เมื่อรันน้อยชั่วโมง" }
  }
};
// สรุปตัวเลขของรายการ: fixed ต่อชม., ต่อเดือน (730 ชม.), ต่อ n ชม.
function costSum(items) { var hr = 0, mo = 0; items.forEach(function (x) { if (x.k === "hr") hr += x.r * x.q; if (x.k === "mo") mo += x.r * x.q; }); return { hr: hr, month: hr * COST_HRS + mo, perHours: function (n) { return hr * n + mo * (n / COST_HRS); } }; }
