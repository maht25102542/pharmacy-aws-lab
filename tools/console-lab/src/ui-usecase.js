// ===== Lab › Use case จริง: แต่ละ use case = ภาพรวม + env dev/prd + diagram/แอนิเมชัน + โค้ด Terraform เทียบหน้า console + เคส error =====
// เพิ่ม use case ใหม่ = เพิ่ม object ใน UC (ใช้ตัววาด/แอนิเมชัน/ตารางชุดเดียวกัน)
var UC = [];
var UC_SEL = { id: "static" };

UC.push({
  id: "static", no: 1, video: "videos/usecase1-a.mp4", title: "เว็บ static: S3 + CloudFront + Route 53 + ACM", color: "#e8590c", dir: "labs/01-static-site", loadKind: "static",
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
    { load: "ecs-vpce-s3", t: "ใช้ VPC endpoints แทน NAT แต่ลืม S3 gateway endpoint", sym: "task STOPPED · CannotPullContainerError … starport-layer-bucket … i/o timeout", find: "ECS service › Health ขั้น ✗ 'ผ่าน VPC endpoints' (ขาด s3) · VPC › Endpoints: มี ecr.api/ecr.dkr แต่ไม่มี s3 (Gateway)", fix: "VPC › Endpoints › Create endpoint › com.amazonaws.<region>.s3 (Gateway) ผูก route table ของ private subnet" },
    { load: "ecs-vpce-logs", t: "ไม่มี VPC endpoint ของ CloudWatch Logs (และไม่มี NAT)", sym: "task STOPPED · ResourceInitializationError: failed to validate logger args … logs.<region>.amazonaws.com … i/o timeout", find: "Health ขั้น ✗ ผ่าน VPC endpoints (ขาด logs) · task definition ใช้ awslogs", fix: "สร้าง interface endpoint com.amazonaws.<region>.logs (private DNS ✓ + SG รับ 443 จาก SG ของ task)" },
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
    { t: "เคส error 1: connection ยัง Pending", on: ["gh", "pipe"], bad: ["gh"], flow: [["gh", "ขอโค้ด"], ["pipe", "✗ connection Pending"]], rows: [["อาการ", "#c62828", "ขั้น Source ล้มทันที `Connection is not available`"], ["สาเหตุ", "#a85a00", "Terraform/console สร้าง connection แล้วไม่ได้ authorize กับ GitHub"]] },
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
    { load: "cd-deploy", t: "CONTAINER_NAME ไม่ตรง task definition", sym: "(ข้อความจำลอง) Build ผ่าน แต่ Deploy dev ล้ม: Unable to find container named 'app' · ⚠️ คู่มือ AWS ไม่ระบุพฤติกรรมเมื่อชื่อไม่ตรง ของจริงอาจ ‘Deploy สำเร็จแต่ image ไม่เปลี่ยน’ (อันตรายกว่า เพราะไม่ error) → ตรวจ image ของ task ใน ECS ทุกครั้งหลัง deploy", find: "Deploy dev › Details · CodeBuild › Configuration: CONTAINER_NAME=app เทียบกับ ECS › Task definitions › Container name", fix: "แก้ CONTAINER_NAME = api แล้ว Release change (build ใหม่เพื่อให้ imagedefinitions.json ถูก)" },
    { load: "cd-pass", t: "role ของ pipeline ไม่มี iam:PassRole", sym: "Deploy dev ล้ม: not authorized to perform: iam:PassRole", find: "Deploy dev › Details → IAM › role pharmacy-pipeline › inline policy: ไม่มี iam:PassRole", fix: "เพิ่ม iam:PassRole บน role pharmacy-ecs-* แล้ว Retry stage" }
  ],
  loadBtns: [["โหลดตัวอย่างครบทั้งชุด (build → dev → prd สำเร็จ)", function () { buildCd("cd"); UI.sel = {}; flash("ok", "โหลด use case 4 แล้ว"); go("pipes", {}, "CodePipeline"); }], ["โหลดแบบสร้างเอง (มี role/connection/build project)", function () { buildCd("cd-base"); UI.sel = {}; UI.form = null; flash("ok", "โหลดแล้ว: ไป CodePipeline › Create pipeline"); go("pipe-create", {}, "CodePipeline"); }]],
  errGo: function (e) { buildCd(e.load); UI.sel = { pipes: "pharmacy-api" }; UI.form = null; flash("ok", "โหลดเคส “" + e.t + "” แล้ว เปิด pipeline ดูขั้นที่ล้ม"); go("pipes", {}, "CodePipeline"); }
});

UC.push({
  id: "gha", no: 5, title: "GitHub Actions + OIDC → ECR → ECS (CI/CD ที่นิยมที่สุด)", color: "#24292f", dir: "labs/05-github-actions", loadKind: "gha",
  tag: "โค้ดอยู่ GitHub อยู่แล้ว ไม่ต้องมีเครื่อง CI · ไม่มี access key ถาวร · ต่อยอดจาก use case 2",
  intro: [
    ["ใช้ทำอะไร", "#2b6cb0", "push โค้ดขึ้น **GitHub** → **GitHub Actions** (รันบนเครื่องของ GitHub) build image → push **ECR** → deploy **ECS dev** อัตโนมัติ · สร้าง **tag** → รอ **คนอนุมัติ** → deploy **ECS prd**"],
    ["ทำไมนิยม", "#1d8102", "ไม่ต้องดูแล Jenkins · config เป็น YAML อยู่กับโค้ด · ฟรีสำหรับ repo ส่วนตัวในระดับหนึ่ง · มี action สำเร็จรูปของ AWS (configure-credentials, ecr-login, ecs-deploy)"],
    ["เรื่องสำคัญ: OIDC", "#c0392b", "สมัยก่อนเก็บ **AWS access key** เป็น secret ใน GitHub (รั่ว = อันตราย หมุนยาก) · ตอนนี้ใช้ **OIDC**: GitHub ออก **ID token** ให้ทุก job → job ขอ `AssumeRoleWithWebIdentity` → ได้ **credential ชั่วคราว** · AWS เชื่อ token เพราะมี **OIDC provider** + **trust policy** ที่ระบุว่า repo ไหน/branch ไหน/environment ไหนขอ role นี้ได้"],
    ["สิ่งที่ต้องรู้", "#a85a00", "① workflow ต้องมี `permissions: id-token: write` ② trust policy ต้องจับคู่ **sub** ให้ตรง: job ปกติ = `repo:O/R:ref:refs/heads/main` แต่ job ที่ใส่ `environment:` ส่ง sub = `repo:O/R:environment:NAME` (**ไม่ใช่ branch/tag**) ③ ห้ามใช้ `repo:ORG/*` (ทุก repo ใน org assume ได้) ④ role ต้องมีสิทธิ์ ECR + ECS + **iam:PassRole** ⑤ tag image ห้ามซ้ำ (ECR immutable) ⑥ **repo ที่สร้างหลัง 15 ก.ค. 2026 ส่ง sub แบบ immutable** `repo:O@<id>/R@<id>:…` (repo เก่าไม่เปลี่ยน) · trust แบบเก่าจะ Not authorized · TF lab ใส่ทั้งสองแบบ · sim: ติ๊ก ‘repo สร้างหลัง 15 ก.ค. 2026’ ที่ฟอร์ม workflow หรือโหลดเคส gha-immutable"]
  ],
  envs: [["", "dev", "prd"], ["ทริกเกอร์", "push เข้า branch main", "push tag v*"], ["อนุมัติ", "ไม่ต้อง", "ต้อง (GitHub Environment production + Required reviewers)"], ["sub ใน token", "repo:O/R:ref:refs/heads/main", "repo:O/R:environment:production"], ["tag image", "commit sha 7 ตัว", "ชื่อ tag (เช่น v1.1.0)"], ["ปลายทาง", "ECS pharmacy-dev", "ECS pharmacy-prd"]],
  nodes: [
    { id: "dev", ico: "github", x: 24, y: 160, w: 140, h: 64, t: "นักพัฒนา", s: "git push / tag", c: "#475569" },
    { id: "gh", ico: "github", x: 230, y: 40, w: 190, h: 80, t: "GitHub Actions", s: "workflow + ID token", c: "#24292f" },
    { id: "oidc", ico: "iam", x: 230, y: 300, w: 190, h: 70, t: "IAM OIDC + role", s: "trust: aud + sub", c: "#1d8102" },
    { id: "ecr", ico: "ecr", x: 520, y: 40, w: 190, h: 70, t: "ECR pharmacy/api", s: "tag = sha / v1.1.0", c: "#d9480f" },
    { id: "ecsdev", ico: "ecs", x: 520, y: 170, w: 190, h: 70, t: "ECS dev", s: "pharmacy-api", c: "#d9480f" },
    { id: "human", x: 520, y: 300, w: 190, h: 64, t: "ผู้อนุมัติ", s: "Review deployments", c: "#7d4acf" },
    { id: "ecsprd", ico: "ecs", x: 800, y: 300, w: 190, h: 70, t: "ECS prd", s: "pharmacy-api", c: "#d9480f" }
  ],
  links: [["dev", "gh"], ["gh", "oidc"], ["gh", "ecr"], ["gh", "ecsdev"], ["ecsdev", "human"], ["human", "ecsprd"], ["oidc", "ecsprd"]],
  scenes: [
    { t: "push main → workflow เริ่ม", on: ["dev", "gh"], flow: [["dev", "git push main"], ["gh", "รัน job deploy-dev"]], rows: [["เกิดอะไร", "#24292f", "GitHub เริ่ม workflow บนเครื่องของ GitHub (runner) · ออก **ID token** ให้ job (ถ้ามี `id-token: write`) ที่ระบุ repo, branch, environment"]] },
    { t: "ขอ role ด้วย OIDC (ไม่มี key)", on: ["gh", "oidc"], flow: [["gh", "ส่ง ID token"], ["oidc", "ตรวจ provider + aud + sub"], ["gh", "ได้ credential ชั่วคราว"]], rows: [["เกิดอะไร", "#1d8102", "action `configure-aws-credentials` เรียก STS `AssumeRoleWithWebIdentity` · AWS ตรวจว่า **provider เชื่อถือ**, **aud = sts.amazonaws.com**, **sub ตรงกับ trust policy** → ให้ credential อายุสั้น (ประมาณ 1 ชม.)"]] },
    { t: "build + push image", on: ["gh", "ecr"], flow: [["gh", "docker build"], ["ecr", "login + push :sha"]], rows: [["เกิดอะไร", "#d9480f", "login ECR ด้วย credential ชั่วคราว · build บน runner · push tag = commit sha (ไม่ซ้ำ ECR immutable จึงไม่ชน)"]] },
    { t: "deploy dev", on: ["gh", "ecsdev", "ecr"], flow: [["gh", "render task definition"], ["ecsdev", "register revision ใหม่"], ["ecr", "ดึง image ใหม่"], ["ecsdev", "รอ stable"]], rows: [["เกิดอะไร", "#d9480f", "`amazon-ecs-render-task-definition` เปลี่ยน image ของ container ชื่อที่ระบุ · `amazon-ecs-deploy-task-definition` update service แล้วรอ servicesStable (`wait-for-service-stability: true`)"]] },
    { t: "tag v* → รออนุมัติ", on: ["dev", "gh", "human"], flow: [["dev", "git tag v1.1.0 + push"], ["gh", "job deploy-prd รอ environment"], ["human", "Review → Approve"]], rows: [["เกิดอะไร", "#7d4acf", "job ที่ใส่ `environment: production` หยุดรอจนผู้ตรวจที่ตั้งไว้กด Approve · พอเริ่ม token จะมี **sub = repo:O/R:environment:production**"]] },
    { t: "deploy prd", on: ["human", "oidc", "ecsprd"], flow: [["human", "Approved"], ["oidc", "assume role (sub แบบ environment)"], ["ecsprd", "deploy + รอ stable"]], rows: [["เกิดอะไร", "#1d8102", "trust policy ต้องมี sub แบบ environment อยู่ในรายการ (Terraform ของ lab ใส่ไว้ทั้ง branch และ environment)"]] },
    { t: "เคส error 1: ไม่มี id-token / provider", on: ["gh", "oidc"], bad: ["oidc"], flow: [["gh", "ขอ role"], ["oidc", "✗ ไม่มี token / provider"]], rows: [["อาการ", "#c62828", "ขั้น Configure AWS credentials ล้ม: `Credentials could not be loaded…` (ไม่มี id-token: write) หรือ `No OpenIDConnect provider found` (ลืมสร้าง provider)"]] },
    { t: "เคส error 2: sub ไม่ตรง (environment)", on: ["human", "oidc"], bad: ["oidc"], flow: [["human", "Approved"], ["oidc", "✗ sub ไม่ตรง trust"]], rows: [["อาการ", "#c62828", "dev ผ่าน แต่ prd: `Not authorized to perform sts:AssumeRoleWithWebIdentity`"], ["สาเหตุ", "#a85a00", "trust ผูกแค่ `…:ref:refs/heads/main` แต่ job ที่ใช้ environment ส่ง sub เป็น `…:environment:production`"]] },
    { t: "เคส error 3: สิทธิ์/ชื่อ container", on: ["gh", "ecr", "ecsdev"], bad: ["ecsdev"], flow: [["gh", "push/deploy"], ["ecsdev", "✗ AccessDenied / container"]], rows: [["อาการ", "#c62828", "`denied … ecr:InitiateLayerUpload` · `Could not find container definition with matching name` · `not authorized to perform: iam:PassRole`"]] }
  ],
  tf: [
    { type: "aws_iam_openid_connect_provider", name: "github", file: "labs/05-github-actions/oidc.tf", console: ["IAM › Identity providers › Add provider", "Provider type = OpenID Connect · Provider URL = https://token.actions.githubusercontent.com · Audience = sts.amazonaws.com"], err: "ไม่มี provider = No OpenIDConnect provider found · มีแล้วสร้างซ้ำ = EntityAlreadyExists" },
    { type: "aws_iam_role", name: "deploy", file: "labs/05-github-actions/iam.tf", console: ["IAM › Roles › Create role › Web identity", "Identity provider · Audience = sts.amazonaws.com · GitHub organization / repository / branch → (environment ต้องไป Edit trust policy เอง)"], err: "sub ไม่ตรง = Not authorized to perform sts:AssumeRoleWithWebIdentity · ห้ามเว้น repository (ทุก repo ใน org ใช้ได้)" },
    { type: "aws_iam_role_policy", name: "deploy", file: "labs/05-github-actions/iam.tf", console: ["IAM › role › Add permissions › Create inline policy", "ECR login+push · ECS Register/Update · iam:PassRole บน pharmacy-ecs-*"], err: "ขาด ECR = denied ตอน push · ขาด PassRole = deploy ล้ม" }
  ],
  errors: [
    { load: "gha-perm", t: "workflow ไม่มี permissions: id-token: write", sym: "ขั้น Configure AWS credentials ล้ม · Credentials could not be loaded", find: "Browser › github.com/<user>/pharmacy-backend/actions › run ล่าสุด › ขั้นที่ ✗ (ข้อความจริงอาจต่าง)", fix: "ใส่ permissions: id-token: write (และ contents: read) ใน workflow แล้ว push ใหม่" },
    { load: "gha-provider", t: "ไม่มี OIDC provider ใน AWS", sym: "No OpenIDConnect provider found in your account for https://token.actions.githubusercontent.com", find: "IAM › Identity providers: ว่าง", fix: "Add provider (OpenID Connect · URL ของ GitHub · audience sts.amazonaws.com)" },
    { load: "gha-sub", t: "trust ผูกแค่ branch main แต่ job prd ใช้ environment", sym: "dev ผ่าน แต่ prd ล้ม: Not authorized to perform sts:AssumeRoleWithWebIdentity", find: "run prd › ขั้น Configure credentials › 💡 บอก sub ที่ส่งไป (…:environment:production) เทียบกับ IAM › role › Trust relationships", fix: "Edit trust policy: เพิ่ม sub `repo:O/R:environment:production` (ใช้ StringLike / ใส่เป็นรายการ)" },
    { load: "gha-ecr", t: "role ไม่มีสิทธิ์ push ECR", sym: "login ผ่าน แต่ docker push: denied … ecr:InitiateLayerUpload", find: "ขั้น Build, tag, and push image › log", fix: "เพิ่ม ecr:InitiateLayerUpload, UploadLayerPart, CompleteLayerUpload, PutImage, BatchCheckLayerAvailability บน repo pharmacy/api" },
    { load: "gha-deploy", t: "CONTAINER_NAME ไม่ตรง task definition", sym: "Could not find container definition with matching name 'app' (ถ้อยคำอาจต่าง)", find: "ขั้น Render Amazon ECS task definition › 💡 บอกชื่อ container ที่มีจริง", fix: "แก้ CONTAINER_NAME ให้ตรง (api)" },
    { load: "gha-immutable", t: "repo ใหม่ส่ง sub แบบ immutable", sym: "ขั้น Configure AWS credentials ล้ม: Not authorized to perform sts:AssumeRoleWithWebIdentity ทั้งที่ trust ดูถูก", find: "run › ขั้น ✗ บอก sub ที่ job ส่ง (มี @<id>) เทียบกับ IAM › role › Trust relationships", fix: "แก้ trust sub เป็น `repo:ORG@*/REPO@*:…` (StringLike) หรือใส่ id จริง · ของ lab TF ทำไว้แล้ว" },
    { load: "gha-pass", t: "role ไม่มี iam:PassRole", sym: "ขั้น Deploy ล้ม: not authorized to perform: iam:PassRole on resource …role/pharmacy-ecs-execution", find: "ขั้น Deploy Amazon ECS task definition › log", fix: "เพิ่ม iam:PassRole บน role pharmacy-ecs-*" }
  ],
  loadBtns: [["โหลดตัวอย่างครบทั้งชุด (dev + prd สำเร็จ)", function () { buildGha("gha"); UI.sel = {}; flash("ok", "โหลด use case 5 แล้ว"); go("browser", {}, "Browser"); W.addr = "https://github.com/" + ghUser() + "/pharmacy-backend/actions"; wbGo(W.addr); }], ["โหลดแบบสร้างเอง (มี repo + ECS)", function () { buildGha("gha-base"); UI.sel = {}; UI.form = null; flash("ok", "โหลดแล้ว: IAM › Identity providers → Add provider → Create role (Web identity) → Browser › repo › Actions"); go("oidc-create", {}, "IAM"); }]],
  errGo: function (e) { buildGha(e.load); UI.sel = {}; UI.form = null; flash("ok", "โหลดเคส “" + e.t + "” แล้ว เปิดแท็บ Actions ดู run ที่ล้ม"); go("browser", {}, "Browser"); W.addr = "https://github.com/" + ghUser() + "/pharmacy-backend/actions"; wbGo(W.addr); }
});

UC.push({
  id: "single", no: 6, video: "videos/usecase6-a.mp4", title: "เครื่องเดียว: EC2 + Docker Compose + Caddy", color: "#8c4fff", dir: "labs/06-single-vm", loadKind: "single",
  tag: "ง่ายสุด ถูกสุด · ทีมเล็ก/ฟรีแลนซ์/โปรเจกต์เริ่มต้นนิยมมาก · ต้องดูแลเครื่องเอง",
  intro: [
    ["ใช้ทำอะไร", "#2b6cb0", "รัน **ทั้งระบบบนเครื่อง EC2 เครื่องเดียว** ด้วย **Docker Compose**: app + ฐานข้อมูล + **Caddy** (reverse proxy ที่ขอใบรับรอง HTTPS จาก Let's Encrypt ให้อัตโนมัติ) · ไม่มี ALB / NAT / k8s / RDS"],
    ["ใครใช้", "#1d8102", "สตาร์ทอัพช่วงแรก · ฟรีแลนซ์/เอเจนซี่ · เครื่องมือภายใน · งานที่ traffic น้อย-กลาง · ค่าใช้จ่ายหลักร้อย-พันบาท/เดือน (เทียบ ECS+ALB+RDS ที่ ALB อย่างเดียวก็ ~600 บาท/เดือน)"],
    ["ข้อแลกเปลี่ยน", "#c0392b", "**จุดล้มเดียว** (เครื่องดับ = เว็บดับ) · **ต้อง patch/backup เอง** · scale ได้แค่ขยายเครื่อง · deploy มักเป็น `ssh` + `docker compose pull && up -d` หรือ GitHub Actions ผ่าน SSH · ข้อมูลอยู่ในดิสก์เครื่อง (ต้อง snapshot EBS)"],
    ["สิ่งที่ต้องรู้", "#a85a00", "① **user_data รันครั้งเดียวตอนบูตแรก** แก้ทีหลังไม่รันซ้ำ ② SG ต้องเปิด **80 + 443** (80 ใช้ให้ Let's Encrypt ตรวจโดเมน) ③ **Elastic IP** ไม่งั้น public IP เปลี่ยนทุกครั้งที่ stop/start แล้ว DNS ชี้ผิด ④ ชื่อใน Caddyfile ต้องตรงกับ A record ⑤ SSH เปิดเฉพาะ My IP ⑥ ต้อง snapshot EBS / backup DB เอง"]
  ],
  envs: [["", "dev (ทำเหมือนกัน)", "prd"], ["เครื่อง", "t3.micro/small แยกเครื่อง", "t3.small ขึ้นไป"], ["โดเมน", "dev.<โดเมน>", "app.<โดเมน>"], ["ข้อมูล", "ทิ้งได้", "snapshot EBS รายวัน"], ["การปล่อย", "ssh + docker compose pull", "เหมือนกัน (หรือ GitHub Actions)"], ["หมายเหตุ", "ใช้ Terraform stack เดียวต่อเครื่อง (copy โฟลเดอร์ ตั้ง var ต่างกัน)", ""]],
  nodes: [
    { id: "user", x: 24, y: 160, w: 120, h: 64, t: "ผู้ใช้", s: "https://app…", c: "#2a4a7a" },
    { id: "dns", ico: "route53", x: 210, y: 30, w: 170, h: 64, t: "Route 53", s: "A → Elastic IP", c: "#0d7c8f" },
    { id: "ec2", ico: "ec2", x: 450, y: 130, w: 220, h: 100, t: "EC2 เครื่องเดียว", s: "Elastic IP · SG 80/443", c: "#d9480f" },
    { id: "caddy", x: 760, y: 40, w: 220, h: 64, t: "Caddy (container)", s: ":80 :443 + Let's Encrypt", c: "#8c4fff" },
    { id: "app", x: 760, y: 150, w: 220, h: 64, t: "app (container)", s: "reverse_proxy → :8000", c: "#2e6bd0" },
    { id: "db", x: 760, y: 260, w: 220, h: 64, t: "Postgres (container)", s: "volume บน EBS", c: "#1d8102" },
    { id: "le", x: 450, y: 320, w: 220, h: 64, t: "Let's Encrypt", s: "ตรวจโดเมนผ่าน port 80", c: "#475569" },
    { id: "me", ico: "github", x: 210, y: 320, w: 170, h: 64, t: "คุณ (ssh / CI)", s: "port 22 เฉพาะ My IP", c: "#475569" }
  ],
  links: [["user", "dns"], ["user", "ec2"], ["ec2", "caddy"], ["caddy", "app"], ["app", "db"], ["caddy", "le"], ["me", "ec2"]],
  scenes: [
    { t: "บูตครั้งแรก: user_data ทำงาน", on: ["ec2", "caddy", "app", "db"], flow: [["ec2", "cloud-init อ่าน user_data"], ["app", "apt install docker"], ["caddy", "docker compose up -d"]], rows: [["เกิดอะไร", "#d9480f", "ตอนบูตครั้งแรก cloud-init รันสคริปต์: ติดตั้ง docker → เขียน `docker-compose.yml` + `Caddyfile` → `docker compose up -d` · **รันครั้งเดียว** (แก้ user_data ทีหลังเครื่องเดิมไม่รันซ้ำ)"]] },
    { t: "DNS: ชื่อ → Elastic IP", on: ["user", "dns"], flow: [["user", "ถาม app.โดเมน"], ["dns", "A = Elastic IP"]], rows: [["เกิดอะไร", "#0d7c8f", "A record ชี้ Elastic IP (IP ตรึง ไม่เปลี่ยนตอน stop/start) · TTL 60 วินาทีให้เปลี่ยนได้เร็ว"]] },
    { t: "Caddy ขอใบรับรอง HTTPS", on: ["caddy", "le", "ec2"], flow: [["caddy", "ขอใบรับรอง app.โดเมน"], ["le", "ท้า HTTP-01 ที่ :80"], ["caddy", "ได้ใบรับรอง"]], rows: [["เกิดอะไร", "#8c4fff", "Caddy เห็นชื่อโดเมนใน Caddyfile → ขอใบรับรองจาก **Let's Encrypt** เอง · Let's Encrypt ต้องเข้า **port 80** ของเครื่อง และชื่อต้องชี้มาที่เครื่องนี้ · ต่ออายุอัตโนมัติ"]] },
    { t: "คำขอของผู้ใช้", on: ["user", "ec2", "caddy", "app", "db"], flow: [["user", "https://app.โดเมน"], ["caddy", "TLS + reverse_proxy"], ["app", "ประมวลผล"], ["db", "query"], ["user", "200"]], rows: [["เกิดอะไร", "#1d8102", "SG ผ่าน 443 → Caddy ถอด TLS → ส่งต่อ app:8000 ผ่านเครือข่ายภายใน docker → app ต่อ Postgres → ตอบกลับ"]] },
    { t: "ปล่อยเวอร์ชันใหม่", on: ["me", "ec2", "app"], flow: [["me", "ssh / GitHub Actions"], ["app", "docker compose pull && up -d"]], rows: [["เกิดอะไร", "#475569", "เข้า ssh (22 เฉพาะ My IP) หรือให้ CI ทำ: `docker compose pull && docker compose up -d` · มี downtime สั้น ๆ ตอน container รีสตาร์ท (ต่างจาก ECS ที่ rolling update)"]] },
    { t: "เคส error 1: เปิดไม่ติด (SG / ไม่มี compose up)", on: ["user", "ec2"], bad: ["ec2"], flow: [["user", "https://app…"], ["ec2", "✗ timeout / refused"]], rows: [["อาการ", "#c62828", "`ERR_CONNECTION_TIMED_OUT` (SG ไม่เปิด 80/443) หรือ `ERR_CONNECTION_REFUSED` (เครื่องขึ้นแต่ไม่มี container เพราะ user_data ลืม `docker compose up`)"]] },
    { t: "เคส error 2: IP เปลี่ยน (ไม่มี Elastic IP)", on: ["dns", "ec2"], bad: ["dns"], flow: [["dns", "A ชี้ IP เก่า"], ["ec2", "✗ IP ใหม่"]], rows: [["อาการ", "#c62828", "stop/start เครื่องแล้วเว็บเปิดไม่ได้ · public IP เปลี่ยน แต่ A record ยังชี้ IP เก่า"], ["แก้", "#1d8102", "ผูก Elastic IP แล้วแก้ A record (หรือ terraform: aws_eip.instance)"]] },
    { t: "เคส error 3: HTTPS ไม่ได้ (DNS / port 80)", on: ["caddy", "le"], bad: ["le"], flow: [["caddy", "ขอใบรับรอง"], ["le", "✗ ตรวจโดเมนไม่ผ่าน"]], rows: [["อาการ", "#c62828", "`ERR_SSL_PROTOCOL_ERROR` · ใน log ของ Caddy: challenge failed"], ["สาเหตุ", "#a85a00", "A record ไม่ชี้เครื่องนี้ หรือ SG ปิด port 80 จึง Let's Encrypt เข้าไม่ได้"]] }
  ],
  tf: [
    { type: "aws_vpc", name: "main", file: "labs/06-single-vm/main.tf", console: ["VPC › Create VPC", "VPC only · CIDR 10.0.0.0/16 · เปิด DNS hostnames"], err: "ใช้ VPC เริ่มต้นก็ได้ (ไม่ต้องสร้างเอง)" },
    { type: "aws_security_group", name: "web", file: "labs/06-single-vm/security.tf", console: ["EC2 › Security Groups › Create", "Inbound: HTTP 80 + HTTPS 443 จาก Anywhere · SSH 22 จาก My IP"], err: "ไม่เปิด 80 = เปิดเว็บไม่ได้และ Let's Encrypt ตรวจโดเมนไม่ได้ (เคส single-sg)" },
    { type: "aws_instance", name: "web", file: "labs/06-single-vm/instance.tf", console: ["EC2 › Launch instances", "Ubuntu 24.04 · t3.small · key pair · SG ข้างบน · Storage 20 GiB gp3 · Advanced › User data = สคริปต์ docker + compose + Caddyfile + docker compose up"], err: "ลืม docker compose up = connection refused (เคส single-noup) · user_data รันครั้งเดียว" },
    { type: "aws_eip", name: "web", file: "labs/06-single-vm/instance.tf", console: ["EC2 › Elastic IPs › Allocate Elastic IP address", "Allocate แล้ว Actions › Associate Elastic IP address → เลือก instance"], err: "ไม่ผูก = IP เปลี่ยนหลัง stop/start (เคส single-eip) · ไม่ผูกกับเครื่องที่ใช้แล้วคิดเงินค่า IP ว่าง" },
    { type: "aws_route53_record", name: "web", file: "labs/06-single-vm/instance.tf", console: ["Route 53 › Hosted zones › Create record", "Record name · Type A · Value = Elastic IP · TTL 60 (ไม่ใช่ Alias)"], err: "ไม่มี record = ชื่อ resolve ไม่ได้ (เคส single-dns)" }
  ],
  errors: [
    { load: "single-sg", t: "SG ไม่เปิด port 80", sym: "เปิดเว็บ timeout · HTTPS ก็ไม่ได้", find: "Browser › ดูขั้นที่ ✗ · EC2 › Security Groups › Inbound rules", fix: "เพิ่ม HTTP 80 จาก Anywhere (ต้องใช้ให้ Let's Encrypt ตรวจโดเมนด้วย)" },
    { load: "single-noup", t: "user_data ลืม docker compose up", sym: "ERR_CONNECTION_REFUSED ทั้งที่เครื่อง running", find: "Browser ขั้น ✗ 'docker compose ขึ้นแล้ว' · ssh เข้าไปดู `docker ps` (ว่าง)", fix: "ssh เข้าไปรัน `cd /opt/app && docker compose up -d` (แก้ user_data ในเครื่องเดิมไม่รันซ้ำ) · หรือ replace เครื่องด้วย user_data ที่ถูก" },
    { load: "single-eip", t: "ไม่ผูก Elastic IP แล้ว stop/start", sym: "เว็บเคยเปิดได้ แต่หลัง stop/start เปิดไม่ได้ (ERR_CONNECTION_TIMED_OUT)", find: "EC2 › เครื่อง › Public IPv4 address ≠ IP ใน Route 53 A record", fix: "Allocate + Associate Elastic IP แล้วแก้ A record เป็น IP ตรึง" },
    { load: "single-dns", t: "ยังไม่มี A record ของโดเมน", sym: "ชื่อไม่ resolve (NXDOMAIN)", find: "Browser › กล่องเหตุผลบอก record ที่มีอยู่ใน zone", fix: "Route 53 › Create record (A) ชื่อ app → IP ของเครื่อง" }
  ],
  loadBtns: [["โหลดตัวอย่างครบทั้งชุด", function () { buildSingle("single"); UI.sel = {}; flash("ok", "โหลด use case 6 แล้ว"); go("browser", {}, "Browser"); W.addr = "https://" + SINGLE_DOMAIN + "/"; wbGo(W.addr); }], ["โหลดแบบสร้างเอง (มีเครือข่าย/SG/key/zone)", function () { buildSingle("single-base"); UI.sel = {}; UI.form = null; flash("ok", "โหลดแล้ว: Launch instance (ใส่ User data) → Elastic IP → A record"); go("launch", {}, "EC2"); }]],
  errGo: function (e) { buildSingle(e.load); UI.sel = {}; UI.form = null; flash("ok", "โหลดเคส “" + e.t + "” แล้ว เปิดเว็บที่ Browser"); go("browser", {}, "Browser"); W.addr = "https://" + SINGLE_DOMAIN + "/"; wbGo(W.addr); }
});

UC.push({
  id: "apr", no: 7, title: "App Runner: ให้ image แล้วได้ URL HTTPS", color: "#c2185b", dir: "labs/07-app-runner", loadKind: "apr",
  tag: "⚠️ ปิดรับลูกค้าใหม่แล้ว (ลูกค้าเดิมใช้ต่อได้ ไม่มี feature ใหม่) · โปรเจกต์ใหม่ AWS แนะนำ ECS Express Mode",
  intro: [
    ["ใช้ทำอะไร", "#2b6cb0", "ให้ **container image** (จาก ECR) แล้ว **App Runner** จัดการที่เหลือ: URL HTTPS, load balancing, scale (ไม่ลงถึง 0: เก็บ instance ขั้นต่ำ 1 ตัว ช่วงว่างคิดเงินแค่ memory), deploy · ไม่มี cluster / ALB / NAT / task definition"],
    ["สถานะ", "#c62828", "**App Runner ปิดรับ customer ใหม่แล้ว** · คนที่ใช้อยู่ยังสร้าง service ใหม่ได้ · AWS ไม่เพิ่ม feature · โปรเจกต์ใหม่ใช้ **ECS Express Mode** (image + 2 role → ได้ Fargate + ALB + autoscale) · lab นี้ไว้เข้าใจแนวคิด PaaS + อ่านระบบเก่า"], ["ใครใช้", "#1d8102", "ทีมที่มี App Runner อยู่แล้ว · เว็บ/API container ขนาดเล็ก-กลาง"],
    ["ข้อแลกเปลี่ยน", "#c0392b", "คุมเครือข่าย/เครื่องได้น้อย (เข้า VPC ผ่าน VPC connector) · ไม่มี sidecar/EFS · แพงต่อ vCPU กว่า Fargate · ต้อง **access role** ดึง ECR ส่วนตัว"],
    ["สิ่งที่ต้องรู้", "#a85a00", "① **port** ต้องตรงกับที่แอปฟัง ② health check แบบ TCP ผ่านง่าย แบบ HTTP ต้องมี path ที่ตอบ 200 ③ access role ≠ instance role (อันแรกให้ AWS ดึง image · อันหลังให้แอปเรียก AWS) ④ แก้ image tag แล้วต้อง deploy (หรือเปิด auto deploy)"]
  ],
  envs: [["", "dev", "prd"], ["CPU / Memory", "0.25 vCPU / 0.5 GB", "1 vCPU / 2 GB"], ["image tag", "v1.0.0 (หรือ latest)", "vN.N.N เท่านั้น"], ["Auto deploy", "เปิดได้", "ปิด กด deploy เอง"], ["URL", "<id>.<region>.awsapprunner.com", "เหมือนกัน + custom domain"]],
  nodes: [
    { id: "user", x: 24, y: 150, w: 120, h: 64, t: "ผู้ใช้", s: "https://…awsapprunner.com", c: "#2a4a7a" },
    { id: "ar", x: 260, y: 130, w: 240, h: 100, t: "App Runner service", s: "HTTPS + LB + autoscale ในตัว", c: "#c2185b" },
    { id: "inst", x: 600, y: 130, w: 220, h: 100, t: "Instances (container)", s: "port 8000 · health check", c: "#2e6bd0" },
    { id: "role", ico: "iam", x: 260, y: 300, w: 240, h: 64, t: "ECR access role", s: "trust build.apprunner…", c: "#c0392b" },
    { id: "ecr", ico: "ecr", x: 600, y: 300, w: 220, h: 64, t: "ECR", s: "pharmacy/api:v1.0.0", c: "#d9480f" }
  ],
  links: [["user", "ar"], ["ar", "inst"], ["ar", "role"], ["role", "ecr"], ["ecr", "inst"]],
  scenes: [
    { t: "สร้าง service: ดึง image", on: ["ar", "role", "ecr"], flow: [["ar", "สวม access role"], ["role", "GetAuthorizationToken"], ["ecr", "pull image"]], rows: [["เกิดอะไร", "#c2185b", "App Runner สวม **access role** (trust `build.apprunner.amazonaws.com`) ไปดึง image จาก ECR ส่วนตัว · role ไม่มี policy ECR = ดึงไม่ได้"]] },
    { t: "รัน + health check", on: ["ar", "inst"], flow: [["ar", "start instance"], ["inst", "ฟัง :8000"], ["ar", "health check"]], rows: [["เกิดอะไร", "#2e6bd0", "start container แล้วยิง health check (TCP เช็ค port เปิด · HTTP เช็ค path ได้ 200) ผ่านติดต่อกัน = RUNNING · ไม่ผ่านตามจำนวนครั้ง = Create failed"]] },
    { t: "คำขอของผู้ใช้", on: ["user", "ar", "inst"], flow: [["user", "GET /healthz"], ["ar", "TLS + LB"], ["inst", "200"]], rows: [["เกิดอะไร", "#1d8102", "App Runner ถอด TLS ให้ (ใบรับรองของ AWS) แล้วส่งต่อ instance · scale ตาม concurrent requests"]] },
    { t: "เคส error 1: ดึง image ไม่ได้", on: ["ar", "role", "ecr"], bad: ["role"], flow: [["ar", "สวม role"], ["role", "✗ access denied"]], rows: [["อาการ", "#c62828", "Create failed · Failed to pull your application image"], ["สาเหตุ", "#a85a00", "role ไม่มี AWSAppRunnerServicePolicyForECRAccess / trust ผิด / tag ไม่มีใน ECR"]] },
    { t: "เคส error 2: health check ไม่ผ่าน", on: ["ar", "inst"], bad: ["inst"], flow: [["ar", "health check"], ["inst", "✗ refused / 404"]], rows: [["อาการ", "#c62828", "Create failed · Health check failed on protocol …"], ["สาเหตุ", "#a85a00", "port ไม่ตรงกับที่แอปฟัง · หรือ path ของ HTTP health check ผิด (404)"]] }
  ],
  tf: [
    { type: "aws_iam_role", name: "access", file: "labs/07-app-runner/iam.tf", console: ["IAM › Roles › Create role", "AWS service › App Runner (trust build.apprunner.amazonaws.com)"], err: "trust ผิด = Failed to pull image (เคส apr-role)" },
    { type: "aws_iam_role_policy_attachment", name: "access", file: "labs/07-app-runner/iam.tf", console: ["IAM › Roles › role › Add permissions", "AWSAppRunnerServicePolicyForECRAccess"], err: "ลืมแนบ = ดึง image ไม่ได้ (เคส apr-role)" },
    { type: "aws_apprunner_service", name: "api", file: "labs/07-app-runner/main.tf", console: ["App Runner › Create service", "Source: ECR + access role · Port · vCPU/Memory · Health check"], err: "port/health path ผิด = health check ไม่ผ่าน (เคส apr-port / apr-health) · tag ไม่มี = apr-tag" }
  ],
  errors: [
    { load: "apr-role", t: "access role ไม่มี policy ECR", sym: "Create failed · Failed to pull your application image", find: "App Runner › service › Overview ขั้น ✗ · IAM › role › Permissions", fix: "แนบ AWSAppRunnerServicePolicyForECRAccess (trust ต้องเป็น build.apprunner.amazonaws.com)" },
    { load: "apr-tag", t: "tag image ไม่มีใน ECR", sym: "Create failed · Failed to pull image (not found)", find: "service › Configuration › Image เทียบกับ ECR › Images", fix: "แก้ tag เป็นที่มีจริง หรือ push tag นั้นก่อน" },
    { load: "apr-port", t: "port ไม่ตรงกับที่แอปฟัง", sym: "Create failed · Health check failed on protocol TCP/HTTP [Port: '8080']", find: "Logs แท็บ: แอปฟัง :8000 · Configuration ตั้ง 8080", fix: "Edit › Port = 8000" },
    { load: "apr-health", t: "health check path ผิด", sym: "Create failed · Health check failed with status code 404", find: "Overview ขั้น ✗ บอก path ที่ตอบ 200", fix: "Edit › Health check path = /healthz" }
  ],
  loadBtns: [["โหลดตัวอย่างครบทั้งชุด", function () { buildApr("apr"); UI.sel = {}; flash("ok", "โหลด use case 7 แล้ว"); go("aprs", {}, "App Runner"); }], ["โหลดแบบสร้างเอง (มี image ใน ECR)", function () { buildApr("apr-base"); UI.sel = {}; flash("ok", "โหลดแล้ว"); go("apr-create", {}, "App Runner"); }]],
  errGo: function (e) { buildApr(e.load); UI.sel = {}; UI.form = null; flash("ok", "โหลดเคส “" + e.t + "” แล้ว ดู service ที่ App Runner"); go("aprs", {}, "App Runner"); }
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
  var w = h("div", { cls: "uc-errs" });
  u.errors.forEach(function (e) {
    w.appendChild(h("div", { cls: "uc-err" }, [h("div", { cls: "uc-err-t", text: e.t }),
      h("div", { cls: "ic" }, [["อาการ", "#c62828", e.sym], ["ไล่หา", "#2b6cb0", e.find], ["แก้", "#1d8102", e.fix]].map(function (x) { return h("div", { cls: "ic-row", style: "--c:" + x[1] }, [h("div", { cls: "ic-lb", text: x[0] }), h("div", { cls: "ic-tx" }, rich(x[2]))]); })),
      h("button", { cls: "btn pri", type: "button", text: "โหลดเคสนี้", onclick: function () { try { if (u.errGo) { u.errGo(e); return; } buildStatic(e.load); UI.sel = {}; UI.form = null; flash("ok", "โหลดเคส “" + e.t + "” แล้ว ไปเปิดเว็บที่ Browser"); go("browser", {}, "Browser"); W.addr = "https://www.pharmacy.example.com"; wbGo(W.addr); } catch (er) { flash("bad", "โหลดไม่สำเร็จ: " + er.message); render(); } } })]));
  });
  return w;
}
// หมู่ตามแกน "แอปรันที่ไหน" + แกน CI/CD แยก (CI/CD 4,5 ปล่อยลง ECS ของ use case 2)
var UC_GRP = [["ดูแลเครื่องเอง", ["single"], "#8c4fff"], ["Managed container", ["ecs", "apr"], "#d9480f"], ["ไม่มี server เลย", ["static", "sls"], "#7d4acf"], ["CI/CD (ปล่อยลง ECS)", ["cd", "gha"], "#2e7d32"]];
// player: ดับเบิลคลิก/แตะครึ่งขวา = ข้าม 5 วิ, ครึ่งซ้าย = ย้อน 5 วิ, คลิกเดียว = เล่น/หยุด + ปุ่มเปิด-ปิดเสียง
var VI = {
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>', pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>',
  back: '<path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" fill="currentColor"/><text x="12" y="16" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor">5</text>',
  fwd: '<g transform="translate(24,0) scale(-1,1)"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" fill="currentColor"/></g><text x="12" y="16" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor">5</text>',
  vol: '<path d="M3 9v6h4l5 5V4L7 9zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  mute: '<path d="M3 9v6h4l5 5V4L7 9z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
};
function viSvg(k, n) { return '<svg viewBox="0 0 24 24" width="' + n + '" height="' + n + '" aria-hidden="true">' + VI[k] + '</svg>'; }
function ucVideo(src) {
  // เซิร์ฟเวอร์ artifact ไม่รองรับ HTTP Range → ข้าม/ย้อนเวลาไม่ได้ ถ้าสตรีมตรงๆ จึงโหลดทั้งไฟล์เป็น blob ก่อน (~4 MB)
  var v = h("video", { controls: true, volume: 1, preload: "auto", style: "display:block;width:100%" });
  var note = h("div", { cls: "hint", style: "margin:6px 0", text: "กำลังโหลดวิดีโอ…" });
  fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(function (b) { v.src = URL.createObjectURL(new Blob([b], { type: "video/mp4" })); note.remove(); })
    .catch(function () { v.src = src; note.textContent = "โหลดแบบสตรีม (ข้ามช่วงเวลาอาจใช้ไม่ได้)"; });
  var wrap = h("div", { style: "position:relative;width:100%;max-width:960px;border-radius:8px;overflow:hidden;background:#000" }, [v]);
  [-1, 1].forEach(function (dir) {
    var last = 0, tm = null;
    var fl = h("div", { style: "position:absolute;top:42%;" + (dir > 0 ? "right" : "left") + ":10%;padding:10px 18px;border-radius:999px;background:rgba(0,0,0,.65);color:#fff;font:700 18px sans-serif;opacity:0;transition:opacity .2s;pointer-events:none", text: dir > 0 ? "+5 วินาที" : "−5 วินาที" });
    var z = h("div", { style: "position:absolute;top:0;bottom:48px;width:50%;cursor:pointer;" + (dir > 0 ? "right:0" : "left:0"), onclick: function () {
      var n = Date.now();
      if (n - last < 350) { clearTimeout(tm); last = n; v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + dir * 5)); fl.style.opacity = 1; setTimeout(function () { fl.style.opacity = 0; }, 500); }
      else { last = n; tm = setTimeout(function () { if (v.paused) v.play(); else v.pause(); }, 350); }
    } });
    wrap.appendChild(z); wrap.appendChild(fl);
  });
  // ปุ่มกลางจอ: ถอย 5 วิ / เล่น-หยุด / ข้าม 5 วิ (โชว์ตอนหยุดหรือขยับเมาส์)
  function seek(d) { v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + d)); }
  var bst = "pointer-events:auto;cursor:pointer;border:0;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font:700 15px sans-serif;display:flex;align-items:center;justify-content:center;";
  var pp = h("button", { type: "button", "aria-label": "เล่น/หยุด", style: bst + "width:64px;height:64px", html: viSvg("play", 32), onclick: function () { if (v.paused) v.play(); else v.pause(); } });
  var cbar = h("div", { style: "position:absolute;left:0;right:0;top:0;bottom:48px;display:flex;align-items:center;justify-content:center;gap:22px;pointer-events:none;transition:opacity .25s" }, [
    h("button", { type: "button", "aria-label": "ถอยหลัง 5 วินาที", style: bst + "width:52px;height:52px", html: viSvg("back", 30), onclick: function () { seek(-5); } }), pp,
    h("button", { type: "button", "aria-label": "ข้ามไปข้างหน้า 5 วินาที", style: bst + "width:52px;height:52px", html: viSvg("fwd", 30), onclick: function () { seek(5); } })]);
  var hideT = null;
  function showBar() { cbar.style.opacity = 1; clearTimeout(hideT); if (!v.paused) hideT = setTimeout(function () { cbar.style.opacity = 0; }, 2500); }
  v.addEventListener("play", function () { pp.innerHTML = viSvg("pause", 32); showBar(); }); v.addEventListener("pause", function () { pp.innerHTML = viSvg("play", 32); showBar(); });
  wrap.addEventListener("mousemove", showBar); wrap.addEventListener("touchstart", showBar);
  wrap.appendChild(cbar);
  var mute = h("button", { cls: "btn", type: "button", style: "display:inline-flex;align-items:center;gap:6px", html: viSvg("vol", 18) + " เสียง: เปิด", onclick: function () { v.muted = !v.muted; mute.innerHTML = viSvg(v.muted ? "mute" : "vol", 18) + (v.muted ? " เสียง: ปิด" : " เสียง: เปิด"); } });
  // วินิจฉัยเสียง: ปุ่มทดสอบเสียง (beep) + บอกว่า browser ถอดรหัสเสียงจากไฟล์ได้ไหม
  var diag = h("div", { cls: "hint", style: "margin:6px 0 0", text: "เสียงในวิดีโอ: ยังไม่ได้เล่น" });
  var beep = h("button", { cls: "btn", type: "button", text: "ทดสอบเสียงเครื่อง", onclick: function () { try { var c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = 660; g.gain.value = 0.15; o.connect(g); g.connect(c.destination); o.start(); setTimeout(function () { o.stop(); c.close(); }, 500); diag.textContent = "ส่งเสียงบี๊บแล้ว ถ้าไม่ได้ยิน = ลำโพง/ระดับเสียงของแท็บหรือเครื่องปิดอยู่ (ไม่เกี่ยวกับไฟล์วิดีโอ)"; } catch (e) { diag.textContent = "browser นี้เล่นเสียงทดสอบไม่ได้"; } } });
  var chk = 0; v.addEventListener("timeupdate", function () {
    if (chk || v.currentTime < 3) return; chk = 1;
    var n = v.webkitAudioDecodedByteCount, hasA = v.mozHasAudio;
    if (v.muted || v.volume === 0) diag.textContent = "เสียงในวิดีโอ: ถูกปิดอยู่ (muted / volume 0) กดปุ่มลำโพงเพื่อเปิด";
    else if (n === 0 || hasA === false) diag.textContent = "เสียงในวิดีโอ: browser นี้ถอดรหัสเสียงของไฟล์ไม่ได้ (ลองใช้ Chrome/Edge/Safari ล่าสุด)";
    else diag.textContent = "เสียงในวิดีโอ: ตรวจพบและกำลังเล่น" + (n ? " (" + n + " bytes)" : "") + " ถ้าไม่ได้ยิน ให้กด 'ทดสอบเสียงเครื่อง'";
  });
  return h("div", {}, [note, wrap, h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px" }, [mute, beep, h("span", { cls: "hint", style: "margin:0", text: "ดับเบิลคลิก/แตะครึ่งขวาของจอ = ข้าม 5 วินาที · ครึ่งซ้าย = ย้อน 5 วินาที · คลิกเดียว = เล่น/หยุด" })]), diag]);
}
function ucTab() {
  var u = ucCur(), cb = h("div", { cls: "cb" });
  UC_GRP.forEach(function (g) { var ids = UC.filter(function (x) { return g[1].indexOf(x.id) >= 0; }); if (!ids.length) return; cb.appendChild(h("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0" }, [h("b", { style: "min-width:150px;color:" + g[2], text: g[0] }), h("div", { cls: "chips", style: "margin:0" }, ids.map(function (x) { return h("button", { cls: "chip" + (x.id === u.id ? " on" : ""), type: "button", text: x.no + ". " + x.title.split(":")[0], onclick: function () { UC_SEL.id = x.id; UC_SEL.tf = 0; render(); } }); }))])); });
  cb.appendChild(h("h2", { style: "margin:10px 0 2px;color:" + u.color, text: "Use case " + u.no + " · " + u.title }));
  cb.appendChild(h("div", { cls: "hint", style: "margin:0 0 10px", text: u.tag + " · โค้ดจริง: " + u.dir + "/ (ผ่าน terraform validate)" }));
  cb.appendChild(infoCard(u.intro));
  var loadBar = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin:10px 0" }, [h("button", { cls: "btn pri", type: "button", text: "โหลดตัวอย่างครบทั้งชุด", onclick: function () { buildStatic("static"); UI.sel = {}; flash("ok", "โหลด use case 1 แล้ว"); go("cfds", {}, "CloudFront"); } }), h("button", { cls: "btn", type: "button", text: "โหลดแบบสร้างเอง (มีโซน + ใบรับรอง)", onclick: function () { buildStatic("static-base"); UI.sel = {}; flash("ok", "โหลดแล้ว: เริ่มที่ S3 › Create bucket"); go("bucket-create", {}, "S3"); } }), h("button", { cls: "btn", type: "button", text: "รัน Terraform ใน Terminal", onclick: function () { go("term", {}, "Laptop"); S.laptop.cwd = REPO + "/" + u.dir; flash("ok", "ไปที่ " + u.dir + " แล้ว: terraform init → terraform apply"); render(); } })]);
  if (u.loadBtns) loadBar = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin:10px 0" }, u.loadBtns.map(function (b, i) { return h("button", { cls: "btn" + (i ? "" : " pri"), type: "button", text: b[0], onclick: function () { try { b[1](); } catch (er) { flash("bad", "โหลดไม่สำเร็จ: " + er.message); render(); } } }); }));
  cb.appendChild(loadBar);
  if (u.video) { var fv = fold("ucvid", "วิดีโอ: คลิกเมนูทีละขั้นจนสำเร็จ (มีเสียงบรรยาย)"); fv.appendChild(ucVideo(u.video)); cb.appendChild(fv); }
  var f1 = fold("ucenv", "dev vs prd: ต่างกันตรงไหน"); f1.appendChild(h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, u.envs[0].map(function (x, i) { return h("th", { style: i === 1 ? "color:#0f9d8a" : i === 2 ? "color:#c0392b" : "", text: x || "รายการ" }); }))]), h("tbody", {}, u.envs.slice(1).map(function (r) { var tds = [h("td", { style: "font-weight:700", text: r[0] }), h("td", { colspan: r[2] ? null : "2", text: r[1] })]; if (r[2]) tds.push(h("td", { text: r[2] })); return h("tr", {}, tds); }))])])); cb.appendChild(f1);
  var f2 = fold("ucanim", "diagram + แอนิเมชัน: ใครคุยกับใคร (ปกติ " + u.scenes.filter(function (x) { return !/error/.test(x.t); }).length + " ฉาก + error " + u.scenes.filter(function (x) { return /error/.test(x.t); }).length + " ฉาก)"); f2.appendChild(ucAnim(u)); cb.appendChild(f2);
  var f3 = fold("uctf", "โค้ด Terraform เทียบกับการกดบน AWS console (เลือก resource ทางซ้าย)"); f3.appendChild(ucTfTable(u)); cb.appendChild(f3);
  var f4 = fold("ucerr", "เคส error " + u.errors.length + " แบบ: อาการ → ไล่หา → แก้ (กดโหลดแล้วลองเอง)"); f4.appendChild(ucErrTable(u)); cb.appendChild(f4);
  return cb;
}
FOLD.ucvid = 1; FOLD.ucenv = 1; FOLD.ucanim = 1; FOLD.uctf = 1; FOLD.ucerr = 1;
PAGES["lab-uc"] = function () { return h("div", {}, [crumbEl("Lab › Use case จริง"), h("h1", { text: "Use case จริง (7 แบบ)" }), h("div", { cls: "card" }, [ucTab()])]); };
(function () { var L = NAV.Lab[0][1]; var i = L.map(function (x) { return x[0]; }).indexOf("lab-managed"); L.splice(i < 0 ? L.length : i + 1, 0, ["lab-uc", "Use case จริง (7 แบบ)"]); NAVICO["lab-uc"] = "🧭"; })();
