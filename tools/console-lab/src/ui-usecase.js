// ===== Lab › Use case จริง: แต่ละ use case = ภาพรวม + env dev/prd + diagram/แอนิเมชัน + โค้ด Terraform เทียบหน้า console + เคส error =====
// เพิ่ม use case ใหม่ = เพิ่ม object ใน UC (ใช้ตัววาด/แอนิเมชัน/ตารางชุดเดียวกัน)
var UC = [];
var UC_SEL = { id: "static" };

UC.push({
  id: "static", no: 1, title: "เว็บ static: S3 + CloudFront + Route 53 + ACM", color: "#e8590c", dir: "labs/01-static-site", loadKind: "static",
  tag: "นิยมที่สุด · ถูกสุด · ไม่มีเซิร์ฟเวอร์ให้ดูแล",
  intro: [
    ["ใช้ทำอะไร", "#2b6cb0", "เว็บ **ที่เป็นไฟล์** (React/Vue/Next export, เว็บบริษัท, หน้า landing, เอกสาร) ไม่มี backend · ผู้ใช้ทั่วโลกได้ไฟล์จาก **edge ใกล้ตัว** (CloudFront) ส่วน S3 เก็บต้นฉบับแบบส่วนตัว"],
    ["ใครใช้", "#1d8102", "แทบทุกทีมที่ทำ frontend · หลายที่ย้ายมาใช้เพราะ **ไม่ต้องดูแลเซิร์ฟเวอร์ ไม่ต้อง patch ไม่ต้อง scale** และค่าใช้จ่ายต่ำ (จ่ายตามการใช้ ไม่มีเครื่องเปิดทิ้ง)"],
    ["dev vs prd", "#c0392b", "**2 env ในโค้ดเดียว** (`for_each` ตาม `local.envs`): dev = `dev.<โดเมน>` ใช้ทดลองก่อน, prd = `www.<โดเมน>` ผู้ใช้จริง · แต่ละ env มี **bucket + distribution + policy ของตัวเอง** ใช้ **ใบรับรองและ OAC ร่วมกัน**"],
    ["สิ่งที่ต้องรู้", "#a85a00", "① bucket **ไม่เปิด public** ใช้ **OAC** ② ใบรับรอง CloudFront ต้องอยู่ **us-east-1** ③ ปล่อยเวอร์ชันใหม่ = `s3 sync` + **invalidation** ④ ชื่อ bucket ต้อง **ไม่ซ้ำทั้งโลก**"]
  ],
  envs: [["", "dev", "prd"], ["ชื่อเว็บ", "dev.pharmacy.example.com", "www.pharmacy.example.com"], ["S3 bucket", "pharmacy-web-dev-<account>", "pharmacy-web-prd-<account>"], ["CloudFront", "distribution แยก (comment: web dev)", "distribution แยก (comment: web prd)"], ["Bucket policy", "อนุญาตเฉพาะ distribution dev", "อนุญาตเฉพาะ distribution prd"], ["ใช้ร่วมกัน", "OAC ×1, ใบรับรอง ACM ×1 (ครอบ www + dev), hosted zone ×1", ""], ["ของจริงมักแยกต่าง", "state/ไดเรกทอรีต่อ env (หรือ workspace), account แยก dev/prd, dev จำกัด IP หรือ basic auth", ""]],
  nodes: [
    { id: "user", x: 24, y: 170, w: 120, h: 64, t: "ผู้ใช้ (เบราว์เซอร์)", s: "https://www…", c: "#2a4a7a" },
    { id: "dns", ico: "route53", x: 200, y: 40, w: 150, h: 60, t: "Route 53", s: "A (alias) → CloudFront", c: "#0d7c8f" },
    { id: "acm", ico: "acm", x: 420, y: 24, w: 190, h: 60, t: "ACM (us-east-1)", s: "ใบรับรอง Issued", c: "#b8860b" },
    { id: "cf", ico: "cloudfront", x: 420, y: 150, w: 190, h: 100, t: "CloudFront (edge)", s: "cache · TTL 24 ชม. · OAC", c: "#c2410c" },
    { id: "s3prd", ico: "s3bucket", x: 770, y: 200, w: 230, h: 76, t: "S3 prd (ส่วนตัว)", s: "policy: SourceArn = dist prd", c: "#3f8624" },
    { id: "s3dev", ico: "s3bucket", x: 770, y: 70, w: 230, h: 76, t: "S3 dev (ส่วนตัว)", s: "policy: SourceArn = dist dev", c: "#7a8a3a" },
    { id: "ci", ico: "github", x: 420, y: 330, w: 190, h: 70, t: "CI / laptop", s: "aws s3 sync + invalidation", c: "#475569" }
  ],
  links: [["user", "dns"], ["user", "cf"], ["cf", "acm"], ["cf", "s3prd"], ["cf", "s3dev"], ["ci", "s3prd"], ["ci", "cf"]],
  scenes: [
    { t: "DNS: ชื่อเว็บ → CloudFront", on: ["user", "dns"], flow: [["user", "ถามชื่อ"], ["dns", "A alias"], ["user", "ได้ IP edge"]], rows: [["เกิดอะไร", "#0d7c8f", "เบราว์เซอร์ถาม Route 53 ว่า `www.pharmacy.example.com` คือ IP อะไร ➜ record **A แบบ alias** ชี้ไป `dxxxx.cloudfront.net` ➜ ได้ IP ของ edge ใกล้ผู้ใช้"], ["ถ้าไม่ขึ้น", "#c62828", "`NXDOMAIN` = ไม่มี record / ยังไม่ตั้ง NS ที่ผู้ขายโดเมนให้ชี้มา Route 53 (ลอง `dig www.pharmacy.example.com` ใน Terminal)"]] },
    { t: "HTTPS: ใบรับรองจาก ACM", on: ["user", "cf", "acm"], flow: [["user", "TLS hello"], ["cf", "ส่งใบรับรอง"], ["user", "เชื่อถือ"]], rows: [["เกิดอะไร", "#b8860b", "CloudFront ส่งใบรับรอง ACM ที่ครอบ `www` และ `dev` ให้เบราว์เซอร์ตรวจ · **ต้องอยู่ us-east-1 และ Issued** เท่านั้นถึงผูกได้"], ["ถ้าไม่ผ่าน", "#c62828", "ผูกไม่ได้: `InvalidViewerCertificate` (ผิด region / ยัง Pending / ไม่ครอบชื่อ) · เบราว์เซอร์เตือน `ERR_CERT_COMMON_NAME_INVALID` ถ้าไม่ใส่ alias+ใบรับรอง"]] },
    { t: "Cache miss: ไปเอาจาก S3 ผ่าน OAC", on: ["user", "cf", "s3prd"], flow: [["user", "GET /"], ["cf", "miss"], ["s3prd", "เซ็นคำขอ SigV4"], ["cf", "เก็บ cache"], ["user", "200"]], rows: [["เกิดอะไร", "#c2410c", "ไม่มีใน edge ➜ CloudFront **เซ็นคำขอด้วย OAC** ไป S3 ➜ S3 ตรวจ **bucket policy** (Principal = cloudfront.amazonaws.com + `AWS:SourceArn` ตรง distribution) ➜ ส่งไฟล์ ➜ เก็บ cache (`X-Cache: Miss`)"], ["จุดสังเกต", "#a85a00", "เปิด `/` ได้ index.html เพราะตั้ง **Default root object** · โฟลเดอร์ย่อย (`/about/`) ไม่ได้ผลแบบนี้"]] },
    { t: "Cache hit: ตอบจาก edge เลย", on: ["user", "cf"], flow: [["user", "GET /"], ["cf", "hit (Age)"], ["user", "200 เร็ว"]], rows: [["เกิดอะไร", "#1d8102", "ครั้งต่อไปตอบจาก **cache ที่ edge** ไม่ถาม S3 (`X-Cache: Hit from cloudfront`, มี `Age`) ➜ เร็วและประหยัดค่า S3"], ["ข้อแลก", "#a85a00", "ไฟล์ที่เปลี่ยนใน S3 **ไม่ถึงผู้ใช้ทันที** จน TTL หมด (ค่าเริ่มต้น 24 ชม.) หรือ invalidate"]] },
    { t: "ปล่อยเวอร์ชันใหม่: s3 sync", on: ["ci", "s3prd", "user", "cf"], flow: [["ci", "aws s3 sync dist"], ["s3prd", "ไฟล์ใหม่ v2"], ["user", "ยังเห็น v1!"]], rows: [["เกิดอะไร", "#475569", "CI อัปโหลดไฟล์ใหม่ไป S3 ด้วย `aws s3 sync ./dist s3://… --delete` ➜ S3 เป็น v2 แล้ว"], ["แต่", "#c62828", "ผู้ใช้ยังได้ **v1** จาก edge cache ➜ นี่คือเคส ‘ปล่อยแล้วไม่เปลี่ยน’ ที่เจอบ่อยที่สุด (Hard refresh ไม่ช่วย)"]] },
    { t: "Invalidation: ล้างแคช", on: ["ci", "cf", "user"], flow: [["ci", "create-invalidation /*"], ["cf", "ล้าง cache"], ["user", "เห็น v2"]], rows: [["เกิดอะไร", "#1d8102", "`aws cloudfront create-invalidation --paths '/*'` ➜ edge ลบไฟล์ที่ cache ไว้ ➜ คำขอถัดไป miss แล้วเอา **v2** จาก S3"], ["ทางเลือกที่ดีกว่า", "#2b6cb0", "ตั้งชื่อไฟล์มี hash (`app.3f9a.js`) และให้ `index.html` TTL สั้น/invalidate เฉพาะ `/index.html` ➜ เสียค่า invalidation น้อยกว่า"]] },
    { t: "dev vs prd: แยกกันจริง", on: ["user", "cf", "s3dev"], flow: [["user", "dev.pharmacy…"], ["cf", "dist dev"], ["s3dev", "bucket dev"], ["user", "หน้า DEV"]], rows: [["เกิดอะไร", "#7a8a3a", "`dev.…` ใช้ distribution + bucket ของ **dev** · ผู้ใช้จริงไม่เห็น · ปล่อยลอง dev ก่อน แล้วค่อย sync ไป prd"], ["กฎสำคัญ", "#c62828", "policy ของแต่ละ bucket ต้องอ้าง **distribution ของ env ตัวเอง** — อ้างผิดตัว = env นั้น 403"]] },
    { t: "เคส error 1: 403 AccessDenied", on: ["user", "cf", "s3prd"], bad: ["s3prd"], flow: [["user", "GET /"], ["cf", "ส่งไป S3"], ["s3prd", "✗ policy ไม่ตรง"], ["user", "403 XML"]], rows: [["อาการ", "#c62828", "เปิดเว็บเจอ XML `AccessDenied` (HTTP 403 จาก S3 ผ่าน CloudFront)"], ["สาเหตุที่พบบ่อย", "#a85a00", "① ไม่มี/ผิด **bucket policy** (`AWS:SourceArn` ไม่ตรง distribution) ② origin **ไม่ผูก OAC** ③ **ไม่มีไฟล์** นั้นใน bucket (S3 ตอบ 403 ไม่ใช่ 404 เมื่อ OAC ไม่มี ListBucket) ④ ไม่ตั้ง Default root object"], ["ไล่หา", "#2b6cb0", "CloudFront › Origins (OAC?) → S3 › Permissions (policy) → เทียบ distribution ID · Browser ของ lab บอกสาเหตุให้"]] },
    { t: "เคส error 2: ใบรับรองผิด region / ยังไม่ Issued", on: ["cf", "acm"], bad: ["acm"], flow: [["cf", "ขอผูกใบรับรอง"], ["acm", "✗ ผิด region / pending"]], rows: [["อาการ", "#c62828", "ใส่ alias + ใบรับรองแล้ว error `InvalidViewerCertificate: …isn't in us-east-1 region, isn't valid…`"], ["สาเหตุ", "#a85a00", "① ขอใบรับรองไว้ที่ ap-southeast-1 (ไม่ใช่ us-east-1) ② **Pending validation** เพราะไม่ได้สร้าง CNAME ใน Route 53 ③ ใบรับรองไม่ครอบชื่อ alias"], ["แก้", "#1d8102", "ขอใบรับรองใหม่ที่ **us-east-1** → ACM › Create records in Route 53 → รอ Issued → ผูก CloudFront · Terraform: `provider = aws.use1` + `aws_acm_certificate_validation`"]] },
    { t: "เคส error 3: ปล่อยแล้วเห็นของเก่า", on: ["ci", "cf", "user"], bad: ["cf"], flow: [["ci", "sync v3"], ["cf", "✗ ยังมี v2 ใน cache"], ["user", "เห็น v2"]], rows: [["อาการ", "#c62828", "S3 เป็น v3 แล้ว แต่ผู้ใช้เห็น v2 · `X-Cache: Hit from cloudfront`, `Age` เพิ่มเรื่อยๆ"], ["สาเหตุ", "#a85a00", "edge cache ยังไม่หมดอายุ (TTL 24 ชม.) · Hard refresh ล้างแค่แคชเบราว์เซอร์"], ["แก้", "#1d8102", "**Create invalidation** `/*` (หรือ `/index.html`) ➜ ใส่เป็นขั้นสุดท้ายของ CI เสมอ"]] }
  ],
  tf: [
    { type: "aws_s3_bucket", name: "site", file: "labs/01-static-site/s3.tf", console: ["S3 › General purpose buckets › Create bucket", "ใส่ Bucket name (ไม่ซ้ำทั้งโลก) · Region · ปล่อย Block all public access เปิดไว้"], err: "BucketAlreadyExists = ชื่อซ้ำทั้งโลก · ชื่อไม่ผ่านกฎ 3-63 ตัว a-z 0-9 . -" },
    { type: "aws_s3_bucket_public_access_block", name: "site", file: "labs/01-static-site/s3.tf", console: ["Create bucket › Block Public Access settings for this bucket", "ติ๊ก Block all public access (หรือ bucket › Permissions › Block public access › Edit)"], err: "ปิดข้อนี้แล้ว bucket policy แบบ public ถึงจะตั้งได้ (เว็บนี้ไม่ต้อง)" },
    { type: "aws_s3_object", name: "index", file: "labs/01-static-site/s3.tf", console: ["S3 › bucket › Objects › Upload", "เลือกไฟล์ index.html › Upload"], err: "ไม่มี index.html = เปิดเว็บเจอ 403" },
    { type: "aws_cloudfront_origin_access_control", name: "site", file: "labs/01-static-site/cloudfront.tf", console: ["CloudFront › Origin access › Create control setting", "Name · Signing behavior = Sign requests (recommended) · Origin type = S3"], err: "ใช้ OAC กับ S3 static website endpoint ไม่ได้ · ลบ OAC ที่ยังใช้อยู่ไม่ได้" },
    { type: "aws_acm_certificate", name: "site", file: "labs/01-static-site/acm.tf", console: ["ACM › Request certificate (เปลี่ยน region เป็น us-east-1 ก่อน!)", "Request a public certificate › Fully qualified domain name › Add another name › DNS validation"], err: "ผิด region → ผูก CloudFront ไม่ได้ (InvalidViewerCertificate)" },
    { type: "aws_route53_zone", name: "main", file: "labs/01-static-site/route53.tf", console: ["Route 53 › Hosted zones › Create hosted zone", "Domain name · Type = Public hosted zone"], err: "สร้างแล้วต้องตั้ง NS ที่ผู้ขายโดเมน ไม่งั้นอินเทอร์เน็ตไม่รู้จักโซน" },
    { type: "aws_route53_record", name: "cert_validation", file: "labs/01-static-site/acm.tf", console: ["ACM › เลือกใบรับรอง › Create records in Route 53", "(console สร้าง CNAME ให้คลิกเดียว · Terraform ต้องเขียน for_each เอง)"], err: "ไม่สร้าง = Pending validation ตลอด" },
    { type: "aws_acm_certificate_validation", name: "site", file: "labs/01-static-site/acm.tf", console: ["ACM › Certificates › รอ Status = Issued", "(ไม่มีปุ่ม: เป็นการ ‘รอ’ ใน Terraform)"], err: "ไม่ใส่ → CloudFront สร้างก่อนใบรับรอง Issued แล้ว fail" },
    { type: "aws_cloudfront_distribution", name: "site", file: "labs/01-static-site/cloudfront.tf", console: ["CloudFront › Distributions › Create distribution", "Get started (name) → Specify origin (S3 + Use recommended origin settings) → Enable security → (domain + ใบรับรอง)"], err: "CNAMEAlreadyExists · InvalidViewerCertificate · ลืม Default root object = 403" },
    { type: "aws_s3_bucket_policy", name: "site", file: "labs/01-static-site/s3.tf", console: ["S3 › bucket › Permissions › Bucket policy › Edit", "(wizard แบบ recommended ใส่ให้อัตโนมัติ · Terraform ต้องเขียนเอง)"], err: "SourceArn ไม่ตรง distribution = 403 AccessDenied" },
    { type: "aws_route53_record", name: "site", file: "labs/01-static-site/route53.tf", console: ["Route 53 › Hosted zones › เลือกโซน › Create record", "Record name · A · เปิด Alias › Alias to CloudFront distribution"], err: "apex ใช้ CNAME ไม่ได้ · ไม่มี record = NXDOMAIN" }
  ],
  errors: [
    { load: "static-403", t: "403 AccessDenied (bucket policy ผิด distribution)", sym: "prd เปิดแล้วได้ XML AccessDenied · dev ปกติ", find: "Browser (ดูขั้นตอนที่ ✗) → S3 › prd › Permissions › Bucket policy → เทียบ distribution ID กับ CloudFront", fix: "แก้ `AWS:SourceArn` ให้ตรง distribution prd (Terraform: `aws_cloudfront_distribution.site[each.key].arn`)" },
    { load: "static-cert", t: "ใบรับรองผิด region (ap-southeast-1)", sym: "CloudFront › Edit settings ใส่ alias + ใบรับรอง → InvalidViewerCertificate", find: "ACM › เปลี่ยน region เป็น us-east-1 แล้วดูรายการ · ใบรับรองจริงอยู่ ap-southeast-1", fix: "ขอใบรับรองใหม่ที่ us-east-1 (Terraform: `provider = aws.use1`)" },
    { load: "static-cert-pending", t: "ใบรับรอง Pending validation", sym: "ผูกกับ CloudFront ไม่ได้ ใบรับรองไม่ Issued", find: "ACM › ใบรับรอง › Domains: CNAME ยัง Pending · Route 53 ไม่มี record ตรวจสอบ", fix: "ACM › Create records in Route 53 (Terraform: `aws_route53_record.cert_validation` + `aws_acm_certificate_validation`)" },
    { load: "static-stale", t: "ปล่อยแล้วผู้ใช้เห็นของเก่า (cache)", sym: "S3 เป็น v3 แต่เว็บยังเป็น v2 · X-Cache: Hit", find: "Browser: ดู X-Cache/Age · เทียบเนื้อหาที่ S3 › Objects", fix: "CloudFront › Invalidations › Create (`/*`) หรือ `aws cloudfront create-invalidation`" }
  ]
});

UC.push({
  id: "ecs", no: 2, title: "API ใน container: ECS Fargate + ALB + ECR + RDS", color: "#d9480f", dir: "labs/02-ecs-fargate", loadKind: "ecs",
  tag: "ทีมเล็ก-กลางนิยม · ได้ container โดยไม่ต้องดูแล Kubernetes หรือเครื่อง",
  intro: [
    ["ใช้ทำอะไร", "#2b6cb0", "รัน **backend API ที่เป็น container** (Django/Node/Go) โดย **ไม่ต้องมีเครื่อง** ไม่ต้องดูแล k8s · AWS รัน task ให้ตาม CPU/RAM ที่ขอ · มี **ALB** กระจายโหลด + **RDS** เก็บข้อมูล"],
    ["ใครใช้", "#1d8102", "ทีมที่อยากได้ container แต่ไม่อยากแบก Kubernetes (EKS) · เหมาะ API ทั่วไป · ถ้าต้องการ ecosystem k8s ค่อยย้ายไป EKS"],
    ["dev vs prd", "#c0392b", "**2 env ในโค้ดเดียว** (`for_each` ตาม `local.envs`): dev = 1 task เล็ก DB single-AZ พอร์ต 8080 · prd = 2 task ใหญ่กว่า DB **Multi-AZ** พอร์ต 80 · แต่ละ env มี cluster / service / target group / DB ของตัวเอง ใช้ VPC + ECR ร่วมกัน"],
    ["สิ่งที่ต้องรู้", "#a85a00", "① task อยู่ **private subnet** ออกเน็ตผ่าน **NAT** (ไปดึง ECR/Secrets/Logs) ② image ต้อง **docker push** ก่อนสร้าง service ③ **execution role** ≠ task role ④ target group ต้องเป็นแบบ **IP** ⑤ SG ต่อกันเป็นสาย: ALB → task → DB ⑥ health check path ต้องตรงกับที่แอปตอบ"]
  ],
  envs: [["", "dev", "prd"], ["เข้า API", "ALB :8080", "ALB :80"], ["Task (Fargate)", "1 task · 0.25 vCPU / 0.5 GB", "2 task · 0.5 vCPU / 1 GB"], ["RDS Postgres 16", "db.t4g.micro · single-AZ", "db.t4g.small · Multi-AZ"], ["ECS cluster", "pharmacy-dev", "pharmacy-prd"], ["ใช้ร่วมกัน", "VPC 3 AZ + NAT · ECR repo pharmacy/api · ALB", "เหมือน dev"]],
  nodes: [
    { id: "user", x: 24, y: 160, w: 120, h: 64, t: "ผู้ใช้ / frontend", s: "GET /api/…", c: "#2a4a7a" },
    { id: "alb", ico: "alb", x: 220, y: 150, w: 170, h: 80, t: "ALB (public)", s: "dev :8080 · prd :80", c: "#8c4fff" },
    { id: "task", ico: "ecs", x: 480, y: 150, w: 200, h: 90, t: "ECS Fargate tasks", s: "private subnet · port 8000", c: "#d9480f" },
    { id: "rds", ico: "rds", x: 780, y: 150, w: 210, h: 80, t: "RDS Postgres", s: "SG: รับจาก task เท่านั้น", c: "#2e6bd0" },
    { id: "ecr", ico: "ecr", x: 480, y: 30, w: 200, h: 64, t: "ECR (pharmacy/api)", s: "image v1.0.0", c: "#d9480f" },
    { id: "nat", ico: "natgw", x: 220, y: 320, w: 170, h: 64, t: "NAT Gateway", s: "ทางออกเน็ตของ task", c: "#0d7c8f" },
    { id: "log", ico: "cloudwatch", x: 780, y: 320, w: 210, h: 64, t: "CloudWatch Logs", s: "/ecs/pharmacy-api-env", c: "#c2185b" },
    { id: "ci", ico: "github", x: 480, y: 320, w: 200, h: 64, t: "laptop / CI", s: "docker build + push", c: "#475569" }
  ],
  links: [["user", "alb"], ["alb", "task"], ["task", "rds"], ["task", "nat"], ["nat", "ecr"], ["task", "log"], ["ci", "ecr"]],
  scenes: [
    { t: "ส่งภาพขึ้น ECR ก่อน", on: ["ci", "ecr"], flow: [["ci", "docker build/tag"], ["ecr", "docker push v1.0.0"]], rows: [["เกิดอะไร", "#475569", "login ECR → build → push · repo เป็น **IMMUTABLE** (tag เดิมเขียนทับไม่ได้) · ต้องมี image ก่อนสร้าง service"]] },
    { t: "Service เริ่ม task", on: ["task", "ecr", "nat"], flow: [["task", "Fargate เริ่ม task"], ["nat", "ออกเน็ต"], ["ecr", "ดึง image"], ["task", "แอปเริ่ม"]], rows: [["เกิดอะไร", "#d9480f", "Fargate ใช้ **execution role** ดึง image ผ่าน **NAT** (task อยู่ private subnet) แล้วรันคอนเทนเนอร์"]] },
    { t: "แอปต่อฐานข้อมูล", on: ["task", "rds"], flow: [["task", "อ่าน DB_PASSWORD"], ["rds", "รับ :5432"], ["task", "connected"]], rows: [["เกิดอะไร", "#2e6bd0", "รหัสผ่านมาจาก **Secrets Manager** (RDS สร้างให้) · SG ของ DB รับ 5432 จาก SG ของ task เท่านั้น"]] },
    { t: "ALB health check", on: ["alb", "task"], flow: [["alb", "GET /healthz"], ["task", "200"]], rows: [["เกิดอะไร", "#8c4fff", "target group (แบบ IP) ตรวจ `/healthz` · ผ่านแล้วถึงรับ traffic · ไม่ผ่าน = ECS ฆ่า task แล้วเริ่มใหม่วน"]] },
    { t: "คำขอจากผู้ใช้", on: ["user", "alb", "task", "rds"], flow: [["user", "GET /api/drugs"], ["alb", "เลือก task"], ["task", "query"], ["rds", "ข้อมูล"], ["user", "200 JSON"]], rows: [["เกิดอะไร", "#1d8102", "ALB กระจายไป task ตัวใดตัวหนึ่ง · ที่ Browser ลองกด Go ซ้ำ จะเห็น `task`/`az` สลับกัน (prd มี 2 task)"]] },
    { t: "ส่ง log ไป CloudWatch", on: ["task", "log"], flow: [["task", "stdout"], ["log", "log stream"]], rows: [["เกิดอะไร", "#c2185b", "awslogs driver ส่ง stdout ไป **log group** · 1 task = 1 stream · ไม่มี log group/สิทธิ์ = ไม่เห็น log"]] },
    { t: "เคส error 1: task ดึง image ไม่ได้", on: ["task", "nat", "ecr"], bad: ["nat"], flow: [["task", "ขอ image"], ["nat", "✗ ไม่มีทาง/ไม่มี image"]], rows: [["อาการ", "#c62828", "task STOPPED วนซ้ำ · `ResourceInitializationError` (ไม่มี NAT) หรือ `CannotPullContainerError` (ไม่มี tag)"], ["สาเหตุ", "#a85a00", "route 0.0.0.0/0 → NAT หาย · หรือยังไม่ docker push"]] },
    { t: "เคส error 2: role ขาดสิทธิ์", on: ["task", "ecr"], bad: ["task"], flow: [["task", "ใช้ execution role"], ["ecr", "✗ AccessDenied"]], rows: [["อาการ", "#c62828", "ดึง image/secret ไม่ได้ ทั้งที่เน็ตปกติ"], ["สาเหตุ", "#a85a00", "execution role ไม่มี AmazonECSTaskExecutionRolePolicy"]] },
    { t: "เคส error 3: แอปต่อ DB ไม่ได้", on: ["task", "rds"], bad: ["rds"], flow: [["task", "connect :5432"], ["rds", "✗ SG ไม่รับ"]], rows: [["อาการ", "#c62828", "task เริ่มแล้วล้ม ใน Logs เจอ connection timeout"], ["สาเหตุ", "#a85a00", "SG ของ DB รับจาก SG ผิดตัว (เช่นของ ALB) แทนที่จะเป็นของ task"]] },
    { t: "เคส error 4: health check ไม่ผ่าน", on: ["alb", "task"], bad: ["task"], flow: [["alb", "GET /health"], ["task", "✗ 404"]], rows: [["อาการ", "#c62828", "task ขึ้นแล้วถูกฆ่าซ้ำ · Events: failed ELB health checks"], ["สาเหตุ", "#a85a00", "target group ตรวจ path ที่แอปไม่มี (/health ≠ /healthz)"]] }
  ],
  tf: [
    { type: "aws_ecr_repository", name: "api", file: "labs/02-ecs-fargate/ecr.tf", console: ["ECR › Private repositories › Create repository", "Repository name = pharmacy/api · Tag immutability = Enabled"], err: "push tag เดิมซ้ำ = ImageTagAlreadyExistsException" },
    { type: "aws_security_group", name: "alb", file: "labs/02-ecs-fargate/security.tf", console: ["EC2 › Security Groups › Create", "Inbound: HTTP 80 / Custom TCP 8080 จาก Anywhere"], err: "ไม่เปิด port = เปิด ALB ไม่ติด (timeout)" },
    { type: "aws_security_group", name: "task", file: "labs/02-ecs-fargate/security.tf", console: ["EC2 › Security Groups › Create", "Inbound: Custom TCP 8000 · Source = Security group ของ ALB"], err: "Source ผิด = ALB เข้า task ไม่ได้ (Target.Timeout)" },
    { type: "aws_security_group", name: "db", file: "labs/02-ecs-fargate/security.tf", console: ["EC2 › Security Groups › Create", "Inbound: PostgreSQL 5432 · Source = Security group ของ task"], err: "ชี้ SG ผิดตัว = แอปต่อ DB ไม่ได้ (เคส ecs-db)" },
    { type: "aws_iam_role", name: "execution", file: "labs/02-ecs-fargate/iam.tf", console: ["IAM › Roles › Create role", "AWS service › Elastic Container Service Task › แนบ AmazonECSTaskExecutionRolePolicy (+ SecretsManagerReadWrite)"], err: "ไม่มี policy = ดึง image ไม่ได้ (เคส ecs-role)" },
    { type: "aws_iam_role", name: "task", file: "labs/02-ecs-fargate/iam.tf", console: ["IAM › Roles › Create role", "AWS service › Elastic Container Service Task (ไม่แนบ policy ก็ได้)"], err: "ใช้ role นี้แทน execution role ไม่ได้ · มันคนละหน้าที่" },
    { type: "aws_db_instance", name: "db", file: "labs/02-ecs-fargate/rds.tf", console: ["RDS › Databases › Create database", "PostgreSQL 16 · Templates dev/test หรือ prod · Multi-AZ · Manage master credentials in Secrets Manager"], err: "ลืมเลือก SG = ต่อไม่ได้ · ชื่อ DB ซ้ำ = DBInstanceAlreadyExists" },
    { type: "aws_lb", name: "main", file: "labs/02-ecs-fargate/alb.tf", console: ["EC2 › Load Balancers › Create › Application Load Balancer", "Internet-facing · VPC · 3 public subnet · SG ของ ALB"], err: "ใช้ private subnet = เปิดจากเน็ตไม่ได้" },
    { type: "aws_lb_target_group", name: "api", file: "labs/02-ecs-fargate/alb.tf", console: ["EC2 › Target Groups › Create", "Target type = IP addresses · port 8000 · Health check path = /healthz"], err: "เลือก Instance = ผูกกับ Fargate ไม่ได้ · path ผิด = unhealthy (เคส ecs-health)" },
    { type: "aws_lb_listener", name: "api", file: "labs/02-ecs-fargate/alb.tf", console: ["ALB › Listeners › Add listener", "HTTP :80 (prd) / :8080 (dev) → Forward to target group"], err: "ไม่มี listener = สร้าง service ผูก TG ไม่ได้" },
    { type: "aws_cloudwatch_log_group", name: "api", file: "labs/02-ecs-fargate/ecs.tf", console: ["CloudWatch › Log groups › Create log group", "Name = /ecs/pharmacy-api-dev · Retention 2 weeks"], err: "ไม่ตั้ง retention = เก็บตลอด (ค่าใช้จ่ายสะสม)" },
    { type: "aws_ecs_cluster", name: "main", file: "labs/02-ecs-fargate/ecs.tf", console: ["ECS › Clusters › Create cluster", "Cluster name · Infrastructure = AWS Fargate"], err: "ลบ cluster ที่ยังมี service = ClusterContainsServicesException" },
    { type: "aws_ecs_task_definition", name: "api", file: "labs/02-ecs-fargate/ecs.tf", console: ["ECS › Task definitions › Create new task definition", "Fargate · CPU/Memory · Execution role · Container: image URI, port 8000, env, secrets, awslogs"], err: "CPU/Memory คู่ผิด = InvalidParameter · image tag ไม่มี = CannotPullContainerError" },
    { type: "aws_ecs_service", name: "api", file: "labs/02-ecs-fargate/ecs.tf", console: ["ECS › Cluster › Services › Create", "Task definition · Desired tasks · private subnets + SG ของ task · Public IP off · Load balancer = ALB + target group"], err: "private subnet ไม่มี NAT = task ดึง image ไม่ได้ (เคส ecs-pull)" }
  ],
  errors: [
    { load: "ecs-pull", t: "task ดึง image ไม่ได้ (private subnet ไม่มี NAT)", sym: "service ไม่ stable · task STOPPED วนซ้ำ · ResourceInitializationError", find: "ECS › cluster › service › Health → ขั้น ✗ 'Task ออกเน็ตได้' → VPC › Route tables ของ private ไม่มี 0.0.0.0/0 → NAT", fix: "เพิ่ม route 0.0.0.0/0 → NAT Gateway ที่ private route table แล้ว Update service (Force new deployment)" },
    { load: "ecs-image", t: "image tag ไม่มีใน ECR", sym: "CannotPullContainerError … not found", find: "ECR › pharmacy/api › Images ไม่มี v1.0.0 (ดู Health ขั้น ✗ Image)", fix: "Laptop: docker login → build → tag → push v1.0.0 แล้วรอ ECS ลองใหม่" },
    { load: "ecs-role", t: "execution role ขาด AmazonECSTaskExecutionRolePolicy", sym: "ดึง image/ข้อมูล secret ไม่ได้ AccessDenied", find: "Health ขั้น ✗ Execution role → IAM › Roles › pharmacy-ecs-execution › Permissions", fix: "IAM › Add permissions › Attach policies › AmazonECSTaskExecutionRolePolicy" },
    { load: "ecs-db", t: "SG ของ DB ไม่รับจาก task", sym: "task เริ่มแล้วล้ม · Logs: connection timeout", find: "Service › Logs / Health ขั้น ✗ ต่อฐานข้อมูล → EC2 › SG ของ DB › Inbound", fix: "แก้ Source ของกฎ PostgreSQL 5432 เป็น SG ของ task (ไม่ใช่ของ ALB)" },
    { load: "ecs-health", t: "prd health check path ผิด (/health)", sym: "task ขึ้นแต่ถูกฆ่าซ้ำ · Events: failed ELB health checks · เปิด API ไม่ติด", find: "EC2 › Target Groups › prd › Health checks · Targets แสดง unhealthy 404", fix: "แก้ Health check path เป็น /healthz" }
  ],
  loadBtns: [["โหลดตัวอย่างครบทั้งชุด (dev + prd)", function () { buildEcs("ecs"); UI.sel = {}; flash("ok", "โหลด use case 2 แล้ว"); go("ecsc", {}, "ECS"); }], ["โหลดแบบสร้างเอง (มีเครือข่าย/ECR/ALB/RDS/role)", function () { buildEcs("ecs-base"); UI.sel = {}; UI.form = null; flash("ok", "โหลดแล้ว: เริ่มที่ CloudWatch › สร้าง log group แล้ว ECS › cluster › task definition › service"); go("lg-create", {}, "CloudWatch"); }]],
  errGo: function (e) { buildEcs(e.load); UI.sel = {}; UI.form = null; flash("ok", "โหลดเคส “" + e.t + "” แล้ว ไปดู ECS › cluster › service › Health"); go("ecsc", {}, "ECS"); }
});

UC.push({
  id: "sls", no: 3, title: "Serverless API: API Gateway + Lambda + DynamoDB", color: "#7d4acf", dir: "labs/03-serverless", loadKind: "sls",
  tag: "ไม่มีเซิร์ฟเวอร์เลย · จ่ายตามคำขอ · นิยมกับ API เล็ก-กลาง งานที่ traffic ขึ้นลงมาก",
  intro: [
    ["ใช้ทำอะไร", "#2b6cb0", "ทำ **API ที่ไม่มีเครื่อง** เลย: ผู้ใช้เรียก **API Gateway** → ปลุก **Lambda** รันโค้ดแค่ตอนมีคำขอ → อ่าน/เขียน **DynamoDB** · ไม่มีอะไรให้ patch/scale · ไม่มีคำขอ = ไม่เสียเงิน"],
    ["ใครใช้", "#1d8102", "ทีมที่อยากส่งงานเร็ว · API ภายในองค์กร · งาน event (อัปโหลด, ตั้งเวลา) · ระบบที่ traffic กระชากเป็นช่วง ๆ · ข้อจำกัด: cold start, เวลารันสูงสุด 15 นาที, ติด lock-in กับ AWS"],
    ["dev vs prd", "#c0392b", "**2 env ในโค้ดเดียว** (`for_each` ตาม `local.envs`): dev = Lambda 128 MB, ไม่เปิด PITR, log เก็บ 7 วัน · prd = 256 MB, **เปิด point-in-time recovery**, log 30 วัน · แต่ละ env มี **API + Lambda + role + table ของตัวเอง** (ไม่ปนข้อมูลกัน)"],
    ["สิ่งที่ต้องรู้", "#a85a00", "① Lambda ใช้ **execution role** (สิทธิ์ของโค้ด) ② API Gateway ต้องมี **permission** ถึงเรียก Lambda ได้ (console ใส่ให้เอง · Terraform ต้องเขียนเอง) ③ route key ต้องตรงทั้ง METHOD และ path ④ ตัวแปร `TABLE_NAME` ชี้ table ⑤ 500 จาก API Gateway ไม่บอกสาเหตุ ต้องไล่ log ใน CloudWatch ⑥ ปลุกครั้งแรก = cold start"]
  ],
  envs: [["", "dev", "prd"], ["URL", "https://<id>.execute-api…/dev/drugs", "https://<id>.execute-api…/prd/drugs"], ["Lambda", "python3.12 · 128 MB · 10 s", "python3.12 · 256 MB · 10 s"], ["DynamoDB", "pharmacy-drugs-dev · on-demand · ไม่มี PITR", "pharmacy-drugs-prd · on-demand · เปิด PITR"], ["Log (CloudWatch)", "เก็บ 7 วัน", "เก็บ 30 วัน"], ["role ของ Lambda", "pharmacy-api-dev-lambda (แตะได้แค่ table dev)", "pharmacy-api-prd-lambda (แตะได้แค่ table prd)"]],
  nodes: [
    { id: "user", x: 24, y: 160, w: 120, h: 64, t: "ผู้ใช้ / frontend", s: "GET /prd/drugs", c: "#2a4a7a" },
    { id: "api", ico: "apigw", x: 220, y: 150, w: 180, h: 80, t: "API Gateway (HTTP)", s: "stage · route · integration", c: "#c2185b" },
    { id: "fn", ico: "lambda", x: 490, y: 150, w: 190, h: 80, t: "Lambda", s: "python3.12 · app.handler", c: "#d9480f" },
    { id: "ddb", ico: "dynamodb", x: 780, y: 150, w: 210, h: 80, t: "DynamoDB", s: "pharmacy-drugs-env", c: "#2e6bd0" },
    { id: "role", ico: "iam", x: 490, y: 30, w: 190, h: 64, t: "IAM role (Lambda)", s: "log + แตะเฉพาะ table นี้", c: "#1d8102" },
    { id: "log", ico: "cloudwatch", x: 490, y: 320, w: 190, h: 64, t: "CloudWatch Logs", s: "/aws/lambda/…", c: "#c2185b" },
    { id: "ci", ico: "github", x: 220, y: 320, w: 180, h: 64, t: "laptop / CI", s: "zip + terraform apply", c: "#475569" }
  ],
  links: [["user", "api"], ["api", "fn"], ["fn", "ddb"], ["fn", "role"], ["fn", "log"], ["ci", "fn"]],
  scenes: [
    { t: "ปล่อยโค้ด: zip + apply", on: ["ci", "fn"], flow: [["ci", "zip app.py"], ["fn", "สร้าง function"]], rows: [["เกิดอะไร", "#475569", "zip โค้ด → `terraform apply` สร้าง table, role, function, API · เปลี่ยนโค้ด = อัปโหลด zip ใหม่ (ไม่ต้อง deploy เครื่อง)"]] },
    { t: "คำขอเข้า API Gateway", on: ["user", "api"], flow: [["user", "GET /prd/drugs"], ["api", "จับ stage + route"]], rows: [["เกิดอะไร", "#c2185b", "API Gateway ดู **stage** (prd) แล้วหา **route** `GET /drugs` · ไม่ตรง = 404 `{\"message\":\"Not Found\"}`"]] },
    { t: "API Gateway ปลุก Lambda", on: ["api", "fn"], flow: [["api", "invoke"], ["fn", "cold start (ครั้งแรก)"]], rows: [["เกิดอะไร", "#d9480f", "ตรวจ **permission** ว่า API นี้เรียก Lambda นี้ได้ → สร้าง execution environment (ครั้งแรกช้า = cold start) แล้วรัน `handler`"]] },
    { t: "Lambda อ่าน DynamoDB", on: ["fn", "role", "ddb"], flow: [["fn", "สวม role"], ["role", "อนุญาต Scan"], ["ddb", "scan table"], ["fn", "ได้รายการ"]], rows: [["เกิดอะไร", "#2e6bd0", "โค้ดอ่าน `TABLE_NAME` → เรียก DynamoDB ด้วยสิทธิ์ของ **role** (ไม่ใช่สิทธิ์ผู้ใช้) · role แตะได้เฉพาะ table ของ env นี้"]] },
    { t: "ตอบกลับ + เขียน log", on: ["fn", "log", "api", "user"], flow: [["fn", "return 200"], ["log", "START/END/REPORT"], ["api", "ส่งต่อ"], ["user", "200 JSON"]], rows: [["เกิดอะไร", "#1d8102", "Lambda คืน JSON → API Gateway ส่งให้ผู้ใช้ · ทุกคำขอเขียน log (Duration, Memory, Init Duration ถ้า cold) ไป CloudWatch"]] },
    { t: "dev vs prd: แยกกันจริง", on: ["user", "api", "fn", "ddb"], flow: [["user", "/dev/drugs"], ["api", "API dev"], ["fn", "Lambda dev"], ["ddb", "table dev"]], rows: [["เกิดอะไร", "#7d4acf", "`/dev/…` ใช้ API + Lambda + table ของ **dev** เท่านั้น · ข้อมูลทดสอบไม่ปนกับ prd · role ของ dev แตะ table prd ไม่ได้"]] },
    { t: "เคส error 1: Lambda ไม่มีสิทธิ์ DynamoDB", on: ["fn", "role", "ddb"], bad: ["role"], flow: [["fn", "Scan"], ["role", "✗ AccessDenied"]], rows: [["อาการ", "#c62828", "ผู้ใช้เห็นแค่ `500 Internal Server Error` · ใน log: `AccessDeniedException … not authorized to perform dynamodb:Scan`"], ["สาเหตุ", "#a85a00", "role ไม่มี policy แตะ table (หรือชี้ ARN ผิด table)"]] },
    { t: "เคส error 2: API Gateway เรียก Lambda ไม่ได้", on: ["api", "fn"], bad: ["fn"], flow: [["api", "invoke"], ["fn", "✗ ไม่มี permission"]], rows: [["อาการ", "#c62828", "500 เหมือนกัน แต่ **Lambda ไม่มี log เลย** (ไม่เคยถูกเรียก) · Monitor แสดง Invocations = 0"], ["สาเหตุ", "#a85a00", "ไม่มี `aws_lambda_permission` (console ใส่ให้เอง ตอนเขียน Terraform ลืมบ่อย)"]] },
    { t: "เคส error 3: route/stage ไม่ตรง → 404", on: ["user", "api"], bad: ["api"], flow: [["user", "GET /prd/drugs"], ["api", "✗ ไม่มี route"]], rows: [["อาการ", "#c62828", "`404 {\"message\":\"Not Found\"}` ตั้งแต่ API Gateway (ยังไม่ถึง Lambda)"], ["สาเหตุ", "#a85a00", "route key พิมพ์ผิด (`GET /drug`) หรือ URL ขาดชื่อ stage"]] },
    { t: "เคส error 4: TABLE_NAME ผิด", on: ["fn", "ddb"], bad: ["ddb"], flow: [["fn", "scan pharmacy-drug-prd"], ["ddb", "✗ ไม่มี table"]], rows: [["อาการ", "#c62828", "500 · ใน log: `ResourceNotFoundException: Requested resource not found`"], ["สาเหตุ", "#a85a00", "environment variable ชี้ชื่อ table ผิด (พิมพ์เองแทนที่จะอ้างจาก resource)"]] }
  ],
  tf: [
    { type: "aws_dynamodb_table", name: "drugs", file: "labs/03-serverless/dynamodb.tf", console: ["DynamoDB › Tables › Create table", "Table name · Partition key (id, String) · Capacity mode = On-demand · Turn on point-in-time recovery (prd)"], err: "ชื่อซ้ำ = ResourceInUseException · hash_key ไม่อยู่ใน attribute = ValidationException" },
    { type: "aws_iam_role", name: "lambda", file: "labs/03-serverless/iam.tf", console: ["IAM › Roles › Create role", "AWS service › Lambda (trust lambda.amazonaws.com)"], err: "trust ผิด = Lambda สร้างไม่ได้ ('role cannot be assumed by Lambda')" },
    { type: "aws_iam_role_policy_attachment", name: "logs", file: "labs/03-serverless/iam.tf", console: ["IAM › role › Add permissions › Attach policies", "AWSLambdaBasicExecutionRole (หรือติ๊กตอนสร้าง function แบบ 'Create a new role')"], err: "ไม่แนบ = function ทำงานแต่ไม่มี log" },
    { type: "aws_iam_role_policy", name: "ddb", file: "labs/03-serverless/iam.tf", console: ["IAM › role › Add permissions › Create inline policy", "Service DynamoDB · Actions Scan/GetItem/PutItem · Resources = ARN ของ table"], err: "ขาด/ผิด table = AccessDeniedException ใน log (เคส sls-perm)" },
    { type: "aws_cloudwatch_log_group", name: "api", file: "labs/03-serverless/lambda.tf", console: ["CloudWatch › Log groups › Create log group", "ชื่อ /aws/lambda/<ชื่อ function> · Retention (console สร้างให้เองแต่ Never expire)"], err: "ไม่สร้างเอง = Lambda สร้างให้ตอนเรียกครั้งแรก เก็บตลอดไป" },
    { type: "aws_lambda_function", name: "api", file: "labs/03-serverless/lambda.tf", console: ["Lambda › Functions › Create function", "Author from scratch · Runtime · Execution role · (Configuration) Memory/Timeout · Environment variables TABLE_NAME · Code: Upload .zip"], err: "TABLE_NAME พิมพ์ผิด = 500 (เคส sls-table)" },
    { type: "aws_apigatewayv2_api", name: "api", file: "labs/03-serverless/apigw.tf", console: ["API Gateway › Create API › HTTP API › Build", "API name"], err: "เลือก REST API แทน HTTP = คนละ resource (aws_api_gateway_*) แพงกว่า" },
    { type: "aws_apigatewayv2_integration", name: "lambda", file: "labs/03-serverless/apigw.tf", console: ["API Gateway › Integrations › Create", "Integration type = Lambda function · เลือก function (payload 2.0)"], err: "ใส่ ARN ผิดรูปแบบ = BadRequest · ใช้ function ARN แทน invoke_arn" },
    { type: "aws_apigatewayv2_route", name: "get_drugs", file: "labs/03-serverless/apigw.tf", console: ["API Gateway › Routes › Create", "Method GET · path /drugs · แล้ว Attach integration"], err: "key พิมพ์ผิด = 404 (เคส sls-route) · route ไม่ attach integration = 500" },
    { type: "aws_apigatewayv2_stage", name: "env", file: "labs/03-serverless/apigw.tf", console: ["API Gateway › Stages › Create", "Stage name (dev/prd) · Enable automatic deployment"], err: "ขาดชื่อ stage ใน URL = 404" },
    { type: "aws_lambda_permission", name: "apigw", file: "labs/03-serverless/lambda.tf", console: ["Lambda › Configuration › Permissions › Resource-based policy › Add permissions", "(console ใส่ให้อัตโนมัติตอนผูก API) · Principal apigateway.amazonaws.com · Source ARN = execute-arn ของ API"], err: "ขาด = 500 และ Lambda ไม่มี log (เคส sls-invoke)" }
  ],
  errors: [
    { load: "sls-perm", t: "Lambda ไม่มีสิทธิ์ DynamoDB (prd)", sym: "prd เปิดแล้ว 500 Internal Server Error · dev ปกติ", find: "Browser (ดูขั้นตอน) → CloudWatch › /aws/lambda/pharmacy-api-prd › log stream: AccessDeniedException … dynamodb:Scan → IAM › role pharmacy-api-prd-lambda › Permissions", fix: "เพิ่ม inline policy: dynamodb:Scan/GetItem/PutItem บน ARN ของ table prd (Terraform: aws_iam_role_policy)" },
    { load: "sls-invoke", t: "API Gateway เรียก Lambda ไม่ได้ (ลืม permission)", sym: "500 เหมือนกัน แต่ Lambda ไม่มี log · Monitor: Invocations = 0", find: "Browser ขั้น ✗ 'Lambda อนุญาต API Gateway เรียก' → Lambda › Configuration › Permissions › Resource-based policy ว่าง", fix: "Add permissions: principal apigateway.amazonaws.com + Source ARN ของ API (Terraform: aws_lambda_permission)" },
    { load: "sls-route", t: "route พิมพ์ผิด → 404", sym: "404 {\"message\":\"Not Found\"} ตั้งแต่ API Gateway", find: "API Gateway › API › Routes: เห็น GET /drug (ตกตัว s) ไม่ตรง GET /drugs", fix: "แก้ route key ใน Terraform/console ให้ตรง แล้ว apply (auto-deploy มีผลทันที)" },
    { load: "sls-table", t: "TABLE_NAME ผิดชื่อ table", sym: "500 · log: ResourceNotFoundException: Requested resource not found", find: "Lambda › Configuration › Environment variables: TABLE_NAME=pharmacy-drug-prd (ตกตัว s) เทียบกับ DynamoDB › Tables", fix: "ใช้ aws_dynamodb_table.drugs[each.key].name แทนการพิมพ์เอง" }
  ],
  loadBtns: [["โหลดตัวอย่างครบทั้งชุด (dev + prd)", function () { buildSls("sls"); UI.sel = {}; flash("ok", "โหลด use case 3 แล้ว"); go("apis", {}, "API Gateway"); }], ["โหลดแบบสร้างเอง (มี table/role/log group)", function () { buildSls("sls-base"); UI.sel = {}; UI.form = null; flash("ok", "โหลดแล้ว: สร้าง Lambda → API Gateway → Add permission เอง แล้วเปิดที่ Browser"); go("lam-create", {}, "Lambda"); }]],
  errGo: function (e) { buildSls(e.load); UI.sel = {}; UI.form = null; flash("ok", "โหลดเคส “" + e.t + "” แล้ว ไปเปิด API ที่ Browser"); go("browser", {}, "Browser"); var a = S.apis.filter(function (x) { return /prd/.test(x.name); })[0]; if (a) { W.addr = "https://" + slsApiHost(a) + "/prd/drugs"; wbGo(W.addr); } }
});

UC.push({
  id: "cd", no: 4, title: "CI/CD: CodePipeline + CodeBuild → ECR → ECS dev → prd", color: "#2e7d32", dir: "labs/04-cicd", loadKind: "cd",
  tag: "ปล่อยของอัตโนมัติ ไม่ต้อง docker build/push เอง · ต่อยอดจาก use case 2",
  intro: [
    ["ใช้ทำอะไร", "#2b6cb0", "แทนที่ที่ต้อง `docker build/push` และกด update service เอง: push โค้ดขึ้น GitHub → **CodePipeline** ดึงโค้ด → **CodeBuild** build + push image ขึ้น ECR → deploy **ECS dev** → **คนอนุมัติ** → deploy **ECS prd**"],
    ["ใครใช้", "#1d8102", "ทีมที่ใช้ AWS ล้วน (ไม่อยากดูแล Jenkins เอง) · เทียบกับ lab หลัก: Jenkins + ArgoCD ทำงานแบบเดียวกันแต่ต้องดูแลเครื่อง · ที่นี่ทุกอย่างเป็น managed"],
    ["dev vs prd", "#c0392b", "pipeline เดียวส่งไปทั้งสอง env ตามลำดับ: **dev อัตโนมัติ** → ตรวจ → **กด Approve** → prd · image ตัวเดียวกัน (tag = commit 8 ตัว) ไม่ build ใหม่ระหว่าง env · rollback = Release change ของ commit เก่า"],
    ["สิ่งที่ต้องรู้", "#a85a00", "① GitHub **connection** ต้อง authorize ใน console (Terraform ทำให้ไม่ได้ ติด Pending) ② CodeBuild ต้องเปิด **Privileged** ถึงจะ docker build ได้ ③ role ของ CodeBuild ต้องมี **ECR** เอง ④ ขั้น Deploy ต้อง **iam:PassRole** ⑤ `CONTAINER_NAME` ใน build ต้องตรงชื่อ container ใน task definition ⑥ ล้มที่ขั้นไหน กด **Retry stage** ได้หลังแก้"]
  ],
  envs: [["", "dev", "prd"], ["ทริกเกอร์", "อัตโนมัติหลัง Build ผ่าน", "หลังคนกด Approve"], ["ECS cluster / service", "pharmacy-dev / pharmacy-api", "pharmacy-prd / pharmacy-api"], ["Image", "pharmacy/api:<commit 8 ตัว>", "ตัวเดียวกับที่ dev ทดสอบ"], ["Task definition", "สร้าง revision ใหม่ทุกครั้ง", "สร้าง revision ใหม่ทุกครั้ง"], ["ใช้ร่วมกัน", "bucket artifact · connection · CodeBuild project · pipeline เดียว", "เหมือน dev"]],
  nodes: [
    { id: "gh", ico: "github", x: 24, y: 40, w: 150, h: 64, t: "GitHub", s: "push → main", c: "#475569" },
    { id: "pipe", ico: "codepipeline", x: 250, y: 150, w: 190, h: 80, t: "CodePipeline", s: "Source → Build → Deploy", c: "#2e7d32" },
    { id: "build", ico: "codebuild", x: 520, y: 30, w: 190, h: 70, t: "CodeBuild", s: "docker build + push", c: "#c2185b" },
    { id: "ecr", ico: "ecr", x: 800, y: 30, w: 190, h: 70, t: "ECR pharmacy/api", s: "tag = commit", c: "#d9480f" },
    { id: "dev", ico: "ecs", x: 520, y: 170, w: 190, h: 70, t: "ECS dev", s: "service pharmacy-api", c: "#d9480f" },
    { id: "human", x: 520, y: 300, w: 190, h: 64, t: "คนอนุมัติ", s: "Review → Approve", c: "#7d4acf" },
    { id: "prd", ico: "ecs", x: 800, y: 300, w: 190, h: 70, t: "ECS prd", s: "service pharmacy-api", c: "#d9480f" },
    { id: "iam", ico: "iam", x: 250, y: 320, w: 190, h: 64, t: "IAM roles", s: "codebuild · pipeline", c: "#1d8102" }
  ],
  links: [["gh", "pipe"], ["pipe", "build"], ["build", "ecr"], ["pipe", "dev"], ["dev", "human"], ["human", "prd"], ["iam", "pipe"], ["ecr", "dev"]],
  scenes: [
    { t: "push โค้ด → pipeline เริ่ม", on: ["gh", "pipe"], flow: [["gh", "git push main"], ["pipe", "Source: ดึง commit"]], rows: [["เกิดอะไร", "#2e7d32", "pipeline ใช้ **connection** ดึงโค้ดจาก GitHub (ต้อง Available) เก็บเป็น artifact ใน S3 · ใช้ role ของ pipeline"]] },
    { t: "CodeBuild: build + push image", on: ["pipe", "build", "ecr"], flow: [["pipe", "StartBuild"], ["build", "ecr login + docker build"], ["ecr", "docker push :<commit>"], ["pipe", "imagedefinitions.json"]], rows: [["เกิดอะไร", "#c2185b", "CodeBuild รัน buildspec: login ECR → `docker build` (ต้อง Privileged) → push tag = commit 8 ตัว → เขียน `imagedefinitions.json` {name, imageUri}"]] },
    { t: "Deploy dev: ECS ใช้ image ใหม่", on: ["pipe", "dev", "ecr"], flow: [["pipe", "Deploy (ECS)"], ["dev", "register task def ใหม่"], ["ecr", "ดึง image ใหม่"], ["dev", "rolling update → stable"]], rows: [["เกิดอะไร", "#d9480f", "action ECS อ่าน imagedefinitions.json → สร้าง **task definition revision ใหม่** (เปลี่ยนแค่ image ของ container ชื่อนั้น) → update service → รอ steady state"]] },
    { t: "รออนุมัติ", on: ["dev", "human"], flow: [["dev", "dev พร้อมให้ตรวจ"], ["human", "เปิด dev ตรวจ → Approve"]], rows: [["เกิดอะไร", "#7d4acf", "stage Approve หยุดรอ · คนตรวจที่ dev (Browser: เปิด ALB :8080) แล้วกด **Review → Approve** (หรือ Reject = จบ Failed)"]] },
    { t: "Deploy prd: image ตัวเดียวกัน", on: ["human", "prd", "ecr"], flow: [["human", "Approved"], ["prd", "register task def ใหม่"], ["ecr", "ดึง image เดิม"], ["prd", "stable (2 tasks)"]], rows: [["เกิดอะไร", "#1d8102", "prd ได้ image **ตัวเดียวกับที่ dev ทดสอบ** (ไม่ build ใหม่) · prd มี 2 task กระจาย AZ"]] },
    { t: "Rollback = release commit เก่า", on: ["gh", "pipe", "prd"], flow: [["gh", "เลือก commit เก่า"], ["pipe", "Release change"], ["prd", "task def กลับ image เดิม"]], rows: [["เกิดอะไร", "#475569", "ECR เก็บ image เก่าไว้ (tag ไม่ซ้ำ) · ปล่อย commit ก่อนหน้าผ่าน pipeline เดิม = rollback ที่ตรวจสอบย้อนหลังได้"]] },
    { t: "เคส error 1: connection ยัง Pending", on: ["gh", "pipe"], bad: ["gh"], flow: [["gh", "ขอโค้ด"], ["pipe", "✗ connection Pending"]], rows: [["อาการ", "#c62828", "ขั้น Source ล้มทันที `The connection is not in the Available status`"], ["สาเหตุ", "#a85a00", "Terraform/console สร้าง connection แล้วไม่ได้ authorize กับ GitHub"]] },
    { t: "เคส error 2: docker daemon / ECR", on: ["pipe", "build", "ecr"], bad: ["build"], flow: [["pipe", "StartBuild"], ["build", "✗ docker / ECR"]], rows: [["อาการ", "#c62828", "`Cannot connect to the Docker daemon` (ไม่เปิด Privileged) หรือ `AccessDeniedException … ecr:GetAuthorizationToken` (role ไม่มี ECR)"], ["แก้", "#1d8102", "เปิด Privileged / แนบสิทธิ์ ECR แล้ว Retry stage Build"]] },
    { t: "เคส error 3: deploy ไม่ผ่าน (container name)", on: ["pipe", "dev"], bad: ["dev"], flow: [["pipe", "Deploy"], ["dev", "✗ container ไม่ตรง"]], rows: [["อาการ", "#c62828", "build ผ่านแต่ Deploy dev: `Unable to find container named 'app' in task definition`"], ["สาเหตุ", "#a85a00", "CONTAINER_NAME ใน CodeBuild ไม่ตรงชื่อ container ใน task definition (api)"]] },
    { t: "เคส error 4: iam:PassRole", on: ["iam", "pipe", "dev"], bad: ["iam"], flow: [["pipe", "RegisterTaskDefinition"], ["iam", "✗ PassRole ถูกปฏิเสธ"]], rows: [["อาการ", "#c62828", "Deploy dev: `not authorized to perform: iam:PassRole on resource: …role/pharmacy-ecs-execution`"], ["สาเหตุ", "#a85a00", "ECS ต้อง 'ส่งต่อ' execution/task role เดิมให้ revision ใหม่ role ของ pipeline ต้องมีสิทธิ์นี้"]] }
  ],
  tf: [
    { type: "aws_s3_bucket", name: "artifacts", file: "labs/04-cicd/artifacts.tf", console: ["S3 › Create bucket (หรือให้ CodePipeline wizard สร้าง default bucket ให้)", "Bucket name · Block all public access"], err: "pipeline หา bucket ไม่เจอ = InvalidStructureException" },
    { type: "aws_codestarconnections_connection", name: "github", file: "labs/04-cicd/artifacts.tf", console: ["Developer Tools › Settings › Connections › Create connection", "Provider = GitHub · Connection name · Connect to GitHub → Install a new app → Connect"], err: "Terraform สร้างได้แค่ Pending (เคส cd-conn)" },
    { type: "aws_iam_role", name: "codebuild", file: "labs/04-cicd/iam.tf", console: ["IAM › Roles › Create role", "AWS service › CodeBuild (trust codebuild.amazonaws.com)"], err: "trust ผิด = CodeBuild is not authorized to perform: sts:AssumeRole" },
    { type: "aws_iam_role_policy", name: "codebuild", file: "labs/04-cicd/iam.tf", console: ["IAM › role › Add permissions", "log + s3 artifact + ECR (login + push) — console wizard ให้แค่ log+s3"], err: "ขาด ECR = AccessDeniedException (เคส cd-ecr)" },
    { type: "aws_codebuild_project", name: "build", file: "labs/04-cicd/codebuild.tf", console: ["CodeBuild › Build projects › Create project", "Source: No source (CodePipeline) · Environment: managed image + Privileged ✓ · Service role · env vars ECR_REPO_URL / CONTAINER_NAME · Buildspec"], err: "ไม่ติ๊ก Privileged = Cannot connect to the Docker daemon (เคส cd-docker)" },
    { type: "aws_iam_role", name: "pipeline", file: "labs/04-cicd/iam.tf", console: ["IAM › Roles › Create role", "AWS service › CodePipeline (หรือให้ wizard สร้าง service role ให้)"], err: "trust ผิด = CodePipeline is not authorized to perform AssumeRole" },
    { type: "aws_iam_role_policy", name: "pipeline", file: "labs/04-cicd/iam.tf", console: ["IAM › role › Add permissions › Create inline policy", "s3 · codestar-connections:UseConnection · codebuild:StartBuild · ecs:* · iam:PassRole"], err: "ขาด PassRole = Deploy ล้ม (เคส cd-pass)" },
    { type: "aws_codepipeline", name: "api", file: "labs/04-cicd/pipeline.tf", console: ["CodePipeline › Pipelines › Create pipeline", "Settings → Source (GitHub connection, repo, branch) → Build (CodeBuild) → Deploy (ECS: cluster, service, imagedefinitions.json) → เพิ่ม stage Approve + Deploy prd"], err: "รัน execution แรกให้เองทันที · ไม่ใส่ depends_on policy = execution แรกล้มสิทธิ์ไม่พอ" }
  ],
  errors: [
    { load: "cd-conn", t: "GitHub connection ยัง Pending", sym: "pipeline ล้มทันทีที่ขั้น Source", find: "CodePipeline › pipeline › Source › Details · Settings › Connections: Status = Pending", fix: "Connections › Update pending connection › Connect → แล้ว Retry stage / Release change" },
    { load: "cd-docker", t: "CodeBuild ไม่เปิด Privileged mode", sym: "ขั้น Build ล้ม · log: Cannot connect to the Docker daemon at unix:///var/run/docker.sock", find: "pipeline › Build › View build logs · CodeBuild › project › Configuration: Privileged = Disabled", fix: "Edit environment → ติ๊ก Privileged แล้ว Retry stage (Terraform: privileged_mode = true)" },
    { load: "cd-ecr", t: "role ของ CodeBuild ไม่มีสิทธิ์ ECR", sym: "ขั้น Build ล้มตอน login ECR · AccessDeniedException ecr:GetAuthorizationToken", find: "View build logs → IAM › role pharmacy-codebuild › Permissions", fix: "แนบ AmazonEC2ContainerRegistryPowerUser (หรือ inline เฉพาะ repo) แล้ว Retry stage Build" },
    { load: "cd-deploy", t: "CONTAINER_NAME ไม่ตรง task definition", sym: "Build ผ่าน แต่ Deploy dev ล้ม: Unable to find container named 'app'", find: "Deploy dev › Details · CodeBuild › Configuration: CONTAINER_NAME=app เทียบกับ ECS › Task definitions › Container name", fix: "แก้ CONTAINER_NAME = api แล้ว Release change (build ใหม่เพื่อให้ imagedefinitions.json ถูก)" },
    { load: "cd-pass", t: "role ของ pipeline ไม่มี iam:PassRole", sym: "Deploy dev ล้ม: not authorized to perform: iam:PassRole", find: "Deploy dev › Details → IAM › role pharmacy-pipeline › inline policy: ไม่มี iam:PassRole", fix: "เพิ่ม iam:PassRole บน role pharmacy-ecs-* แล้ว Retry stage" }
  ],
  loadBtns: [["โหลดตัวอย่างครบทั้งชุด (build → dev → prd สำเร็จ)", function () { buildCd("cd"); UI.sel = {}; flash("ok", "โหลด use case 4 แล้ว"); go("pipes", {}, "CodePipeline"); }], ["โหลดแบบสร้างเอง (มี role/connection/build project)", function () { buildCd("cd-base"); UI.sel = {}; UI.form = null; flash("ok", "โหลดแล้ว: ไป CodePipeline › Create pipeline"); go("pipe-create", {}, "CodePipeline"); }]],
  errGo: function (e) { buildCd(e.load); UI.sel = { pipes: "pharmacy-api" }; UI.form = null; flash("ok", "โหลดเคส “" + e.t + "” แล้ว เปิด pipeline ดูขั้นที่ล้ม"); go("pipes", {}, "CodePipeline"); }
});

function ucCur() { return UC.filter(function (u) { return u.id === UC_SEL.id; })[0] || UC[0]; }
function ucNodeBox(svg, n, tx) {
  var ic = n.ico ? svgIco(n.ico, n.x + 8, n.y + 8, 30) : null, ox = ic ? 22 : 0, g = sv("g", {}, [sv("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 10, fill: "#fff", stroke: n.c, "stroke-width": 2 }), tx(n.x + n.w / 2 + ox, n.y + 22, n.t, { a: "middle", b: 1, c: n.c, sz: 13 }), tx(n.x + n.w / 2 + ox, n.y + 40, n.s, { a: "middle", sz: 10, c: "#64748b" })]); if (ic) g.appendChild(ic);
  g.style.transition = "opacity .45s"; g.style.opacity = ".3"; svg.appendChild(g); return g;
}
function ucAnim(u) {
  var W = 1040, H = 440, svg = sv("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", style: "max-width:1040px;font-family:inherit", role: "img", "aria-label": "ภาพรวมและแอนิเมชัน " + u.title });
  var tx = function (x, y, t, o) { o = o || {}; return sv("text", { x: x, y: y, "font-size": o.sz || 11, "font-weight": o.b ? 700 : 400, fill: o.c || "currentColor", "text-anchor": o.a || "start" }, [t]); };
  var N = {}, E = [];
  u.links.forEach(function (l) { var a = u.nodes.filter(function (n) { return n.id === l[0]; })[0], b = u.nodes.filter(function (n) { return n.id === l[1]; })[0]; var ln = sv("line", { x1: a.x + a.w / 2, y1: a.y + a.h / 2, x2: b.x + b.w / 2, y2: b.y + b.h / 2, stroke: "#94a3b8", "stroke-width": 2, "stroke-dasharray": "5 5" }); ln.style.transition = "opacity .4s"; ln.style.opacity = ".25"; svg.appendChild(ln); E.push({ a: l[0], b: l[1], el: ln }); });
  u.nodes.forEach(function (n) { N[n.id] = { n: n, g: ucNodeBox(svg, n, tx), cx: n.x + n.w / 2, cy: n.y + n.h / 2 }; });
  var pk = sv("circle", { r: 9, fill: "#ff9900", stroke: "#fff", "stroke-width": 2 }), pkl = tx(0, 0, "", { sz: 11, b: 1, c: "#c2500c" }); pk.style.opacity = "0"; svg.appendChild(pk); svg.appendChild(pkl);
  var cap = h("div", { style: "min-height:7em;margin:8px 0" });
  function mv(id, label) { var n = N[id]; pk.style.opacity = "1"; pk.style.transition = "transform .8s ease-in-out"; pk.style.transform = "translate(" + n.cx + "px," + (n.cy + 6) + "px)"; pkl.setAttribute("x", n.cx + 14); pkl.setAttribute("y", n.cy - 10); pkl.textContent = label || ""; }
  function light(sc) {
    Object.keys(N).forEach(function (k) { var on = !sc || sc.on.indexOf(k) >= 0, bad = sc && sc.bad && sc.bad.indexOf(k) >= 0; N[k].g.style.opacity = sc ? (on ? "1" : ".18") : ".3"; N[k].g.firstChild.setAttribute("stroke", bad ? "#c62828" : N[k].n.c); N[k].g.firstChild.setAttribute("fill", bad ? "#fde8e8" : "#fff"); N[k].g.firstChild.setAttribute("stroke-width", bad ? 4 : 2); });
    E.forEach(function (e) { var used = sc && sc.flow.some(function (f, i) { var p = i ? sc.flow[i - 1][0] : null; return p && ((p === e.a && f[0] === e.b) || (p === e.b && f[0] === e.a)); }); e.el.style.opacity = used ? "1" : (sc ? ".1" : ".25"); e.el.setAttribute("stroke", used ? (sc.bad ? "#c62828" : "#ea580c") : "#94a3b8"); e.el.setAttribute("stroke-dasharray", used ? "" : "5 5"); });
  }
  function say(i) { var sc = u.scenes[i]; cap.textContent = ""; cap.appendChild(h("h3", { style: "margin:4px 0 8px", text: (i + 1) + ". " + sc.t })); cap.appendChild(infoCard(sc.rows)); light(sc); pk.style.opacity = "0"; pkl.textContent = ""; }
  function reset() { light(null); pk.style.opacity = "0"; pkl.textContent = ""; cap.textContent = ""; cap.appendChild(infoCard([["ดูอะไร", "#2563eb", "กด ==▶ เล่น== ดูทีละฉาก: " + u.scenes.map(function (s) { return "**" + s.t.replace(/:.*/, "") + "**"; }).join(" → ")]])); }
  var P = jkxPlayer(reset, function (P) {
    var st = []; u.scenes.forEach(function (sc, i) { st.push([i === 0 ? 400 : 1300, function () { say(i); }]); sc.flow.forEach(function (f) { st.push([850, function () { mv(f[0], f[1]); }]); }); });
    st.push([1200, function () { light(null); pk.style.opacity = "0"; pkl.textContent = ""; }]); P.start(st);
  }, "▶ เล่น: ทุกฉาก");
  var chips = h("div", { cls: "chips" }, u.scenes.map(function (s, i) { return h("button", { cls: "chip" + (/error/.test(s.t) ? "" : ""), type: "button", style: /error/.test(s.t) ? "border-color:#c62828;color:#c62828" : "", text: (i + 1) + ". " + s.t, onclick: function () { P.reset(); say(i); s.flow.forEach(function (f, k) { setTimeout(function () { mv(f[0], f[1]); }, 300 + k * 900); }); } }); }));
  var wrap = h("div", {}, [h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 6px" }, P.ctl), chips, cap, svg]); reset(); return wrap;
}
function ucTfTable(u) {
  var box = h("div"), sel = UC_SEL.tf || 0; if (sel >= u.tf.length) sel = 0;
  var list = h("div", { style: "display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:14px;align-items:start" });
  var left = h("div", { style: "display:flex;flex-direction:column;gap:4px" }, u.tf.map(function (r, i) { return h("button", { cls: "btn" + (i === sel ? " pri" : ""), type: "button", style: "text-align:left;white-space:normal", text: (i + 1) + ". " + r.type + "." + r.name, onclick: function () { UC_SEL.tf = i; render(); } }); }));
  var r = u.tf[sel], code = mgBlock(r.file, r.type, r.name);
  var right = h("div", {}, [h("div", { cls: "ic" }, [["โค้ด Terraform", "#6d28d9", "`" + r.file + "` · resource `" + r.type + "." + r.name + "`"]].concat([["กดที่ console", "#0972d3", r.console[0]], ["ช่องที่กรอก", "#1d8102", r.console[1]], ["Error ที่เจอ", "#c62828", r.err]]).map(function (x) { return h("div", { cls: "ic-row", style: "--c:" + x[1] }, [h("div", { cls: "ic-lb", text: x[0] }), h("div", { cls: "ic-tx" }, rich(x[2]))]); })), codePre(code, "hcl")]);
  list.appendChild(left); list.appendChild(right); box.appendChild(list); return box;
}
function ucErrTable(u) {
  var w = h("div", { style: "display:grid;gap:10px" });
  u.errors.forEach(function (e) {
    w.appendChild(h("div", { style: "border:1px solid #c6282855;border-left:5px solid #c62828;border-radius:10px;padding:10px 14px;background:#c628280a" }, [h("div", { style: "font-weight:800;color:#c62828;margin-bottom:6px", text: e.t }),
      h("div", { cls: "ic" }, [["อาการ", "#c62828", e.sym], ["ไล่หา", "#2b6cb0", e.find], ["แก้", "#1d8102", e.fix]].map(function (x) { return h("div", { cls: "ic-row", style: "--c:" + x[1] }, [h("div", { cls: "ic-lb", text: x[0] }), h("div", { cls: "ic-tx" }, rich(x[2]))]); })),
      h("button", { cls: "btn pri", type: "button", text: "โหลดเคสนี้", onclick: function () { try { if (u.errGo) { u.errGo(e); return; } buildStatic(e.load); UI.sel = {}; UI.form = null; flash("ok", "โหลดเคส “" + e.t + "” แล้ว ไปเปิดเว็บที่ Browser"); go("browser", {}, "Browser"); W.addr = "https://www.pharmacy.example.com"; wbGo(W.addr); } catch (er) { flash("bad", "โหลดไม่สำเร็จ: " + er.message); render(); } } })]));
  });
  return w;
}
function ucTab() {
  var u = ucCur(), cb = h("div", { cls: "cb" });
  cb.appendChild(h("div", { cls: "chips" }, UC.map(function (x) { return h("button", { cls: "chip" + (x.id === u.id ? " on" : ""), type: "button", text: x.no + ". " + x.title.split(":")[0], onclick: function () { UC_SEL.id = x.id; UC_SEL.tf = 0; render(); } }); }).concat([2, 3, 4].filter(function (n) { return !UC.some(function (x) { return x.no === n; }); }).map(function (n) { return h("button", { cls: "chip", type: "button", disabled: true, style: "opacity:.45", text: n + ". " + ["", "", "ECS Fargate + ALB + RDS", "Serverless API", "CI/CD → ECS"][n] + " (กำลังจะทำ)" }); }))));
  cb.appendChild(h("h2", { style: "margin:10px 0 2px;color:" + u.color, text: "Use case " + u.no + " · " + u.title }));
  cb.appendChild(h("div", { cls: "hint", style: "margin:0 0 10px", text: u.tag + " · โค้ดจริง: " + u.dir + "/ (ผ่าน terraform validate)" }));
  cb.appendChild(infoCard(u.intro));
  var loadBar = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin:10px 0" }, [h("button", { cls: "btn pri", type: "button", text: "โหลดตัวอย่างครบทั้งชุด", onclick: function () { buildStatic("static"); UI.sel = {}; flash("ok", "โหลด use case 1 แล้ว"); go("cfds", {}, "CloudFront"); } }), h("button", { cls: "btn", type: "button", text: "โหลดแบบสร้างเอง (มีโซน + ใบรับรอง)", onclick: function () { buildStatic("static-base"); UI.sel = {}; flash("ok", "โหลดแล้ว: เริ่มที่ S3 › Create bucket"); go("bucket-create", {}, "S3"); } }), h("button", { cls: "btn", type: "button", text: "รัน Terraform ใน Terminal", onclick: function () { go("term", {}, "Laptop"); S.laptop.cwd = REPO + "/" + u.dir; flash("ok", "ไปที่ " + u.dir + " แล้ว: terraform init → terraform apply"); render(); } })]);
  if (u.loadBtns) loadBar = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin:10px 0" }, u.loadBtns.map(function (b, i) { return h("button", { cls: "btn" + (i ? "" : " pri"), type: "button", text: b[0], onclick: function () { try { b[1](); } catch (er) { flash("bad", "โหลดไม่สำเร็จ: " + er.message); render(); } } }); }));
  cb.appendChild(loadBar);
  var f1 = fold("ucenv", "dev vs prd: ต่างกันตรงไหน"); f1.appendChild(h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, u.envs[0].map(function (x, i) { return h("th", { style: i === 1 ? "color:#0f9d8a" : i === 2 ? "color:#c0392b" : "", text: x || "รายการ" }); }))]), h("tbody", {}, u.envs.slice(1).map(function (r) { var tds = [h("td", { style: "font-weight:700", text: r[0] }), h("td", { colspan: r[2] ? null : "2", text: r[1] })]; if (r[2]) tds.push(h("td", { text: r[2] })); return h("tr", {}, tds); }))])])); cb.appendChild(f1);
  var f2 = fold("ucanim", "diagram + แอนิเมชัน: ใครคุยกับใคร (ปกติ " + u.scenes.filter(function (x) { return !/error/.test(x.t); }).length + " ฉาก + error " + u.scenes.filter(function (x) { return /error/.test(x.t); }).length + " ฉาก)"); f2.appendChild(ucAnim(u)); cb.appendChild(f2);
  var f3 = fold("uctf", "โค้ด Terraform เทียบกับการกดบน AWS console (เลือก resource ทางซ้าย)"); f3.appendChild(ucTfTable(u)); cb.appendChild(f3);
  var f4 = fold("ucerr", "เคส error " + u.errors.length + " แบบ: อาการ → ไล่หา → แก้ (กดโหลดแล้วลองเอง)"); f4.appendChild(ucErrTable(u)); cb.appendChild(f4);
  return cb;
}
FOLD.ucenv = 1; FOLD.ucanim = 1; FOLD.uctf = 1; FOLD.ucerr = 1;
PAGES["lab-uc"] = function () { return h("div", {}, [crumbEl("Lab › Use case จริง"), h("h1", { text: "Use case จริง (top 4)" }), h("div", { cls: "card" }, [ucTab()])]); };
(function () { var L = NAV.Lab[0][1]; var i = L.map(function (x) { return x[0]; }).indexOf("lab-managed"); L.splice(i < 0 ? L.length : i + 1, 0, ["lab-uc", "Use case จริง (top 4)"]); NAVICO["lab-uc"] = "🧭"; })();
