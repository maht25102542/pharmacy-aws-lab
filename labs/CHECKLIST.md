# labs/CHECKLIST.md — เช็กลิสต์รันจริงทีละ lab (ทำเมื่อ AWS account ใช้งานได้)

**ยังไม่เคยรันจริงสักครั้ง** · ตัวเลขเงิน/เวลาเป็น **ค่าประมาณจากความจำ** (ap-southeast-1) ดูราคาจริงที่ AWS Pricing ก่อนรัน
ผลที่เจอจริง → จดลง `labs/VERIFY.md` (ท้ายไฟล์ "ผลเทียบจริง") แล้วแก้ Console Lab ตาม

## กฎทุก lab

1. `terraform plan` ก่อนเสมอ · จำนวน resource ในตาราง = ที่ Console Lab นับได้ ถ้า plan จริงต่างมาก ให้จดไว้
2. `terraform destroy` ทันทีหลังลอง (ตั้งเตือนใน AWS Budgets ไว้ก่อน)
3. ทีละ lab · อย่า apply ซ้อนหลาย lab ถ้ายังไม่จำเป็น (ชื่อ resource ชนกัน lab 02/04/05/07 ใช้ ECR `pharmacy/api` ร่วมกัน)
4. lab 02/04/05/07 ต้องมี **image ใน ECR** · repo-backend จริง **ใช้ไม่ได้** (ไม่มี `/healthz`, ใช้ MariaDB) → ใช้ `labs/sample-api/` แทน

## ลำดับที่แนะนำ (ถูก/เร็ว → แพง/นาน)

| ลำดับ | lab | resource | เวลา (ประมาณ) | เงิน (ประมาณ) | ต้องเตรียม |
|---|---|---|---|---|---|
| 1 | 03 Serverless | 24 | 2-3 นาที | เกือบ 0 | — |
| 2 | 01 Static | 18 | 5-20 นาที (ACM + CloudFront) | ต่ำมาก | **domain จริง** + Route 53 zone |
| 3 | 06 เครื่องเดียว | 9 | 3-5 นาที | ต่ำ (t3.small ~$0.03/ชม.) | key pair ในเครื่อง · (ทางเลือก) domain |
| 4 | 02 ECS Fargate | 42 | 15-25 นาที (RDS, NAT, ALB) | **สูงสุดในชุด** (NAT + ALB + RDS ×2 คิดรายชั่วโมง) | image ใน ECR |
| 5 | 07 App Runner | 4 | 5-10 นาที | ต่ำ | lab 02 (ECR) · **account เดิมที่เคยใช้ App Runner** |
| 6 | 05 GitHub Actions | 3 | 1 นาที | ~0 | lab 02 · repo GitHub · (prd) environment reviewers |
| 7 | 04 CodePipeline | 9 | 3 นาที + authorize | ต่ำ | lab 02 · repo GitHub |

---

## Lab 03 · Serverless (เริ่มที่นี่)

**ก่อน:** `aws sts get-caller-identity` ได้ account ที่ถูก · region `ap-southeast-1`

```bash
cd labs/03-serverless && terraform init && terraform plan
```

```bash
terraform apply
```

**เช็ก**
- [ ] output ได้ URL ของ API ทั้ง dev/prd
- [ ] `curl <url>/drugs` ได้ JSON (ตารางอาจว่าง)
- [ ] CloudWatch Logs มี log group ของ Lambda

**ที่น่าจะเจอ:** zip ของ Lambda (`src/app.py`) ถูกแพ็กด้วย `archive_file` — ถ้า plan บอกว่าไฟล์เปลี่ยนทุกครั้ง ให้จดไว้ · เคส "API Gateway เรียก Lambda ไม่ได้" (ลืม `aws_lambda_permission`) ลองถอดแล้ว apply เพื่อดูว่า 500 จริงไหม

**VERIFY.md:** ตาราง Lab 3 ทั้งหมด (จำนวน resource ใน plan จริงอาจไม่ตรง 24 เพราะ sim นับต่างจาก Terraform)

---

## Lab 01 · Static site

**ก่อน:** domain ที่คุณเป็นเจ้าของ + Route 53 hosted zone (หรือให้ Terraform สร้าง แล้วเปลี่ยน NS ที่ registrar) · ใส่ `domain_name` ใน `terraform.tfvars`

```bash
cd labs/01-static-site && terraform init && terraform plan
```

```bash
terraform apply
```

**เช็ก**
- [ ] ใบรับรอง ACM ถูกสร้างที่ **us-east-1** (CloudFront ใช้ได้แค่ region นี้)
- [ ] ACM สถานะ Issued (DNS validation ต้องผ่าน = NS ชี้ถูก)
- [ ] เปิด `https://<domain>` ได้ · อัปโหลด `index.html` ไป S3 แล้วเห็นหน้าเว็บ
- [ ] เปิด S3 URL ตรง ๆ ได้ 403 (OAC ทำงาน)

**ที่น่าจะเจอ:** ACM ค้าง `Pending validation` ถ้า NS ยังไม่ propagate (apply ค้างนาน) · CloudFront Deploying 5-15 นาที · เปลี่ยนไฟล์แล้วยังเห็นของเก่า = cache (ลอง invalidation)

**ลบ:** ลบไฟล์ใน S3 ก่อนถ้า destroy ติด `BucketNotEmpty`

---

## Lab 06 · เครื่องเดียว (EC2 + Docker Compose + Caddy)

**ก่อน:** `~/.ssh/id_ed25519.pub` มีอยู่ · `my_ip = "x.x.x.x/32"` · (HTTPS) `domain` + `zone_id` ของ zone ที่มีอยู่

```bash
cd labs/06-single-vm && terraform init && terraform plan -var my_ip=$(curl -s ifconfig.me)/32
```

```bash
terraform apply -var my_ip=$(curl -s ifconfig.me)/32
```

**เช็ก**
- [ ] ssh เข้าได้: `ssh ubuntu@<eip>`
- [ ] `cloud-init status --wait` เสร็จ · อ่าน `/var/log/cloud-init-output.log` ถ้าล้ม
- [ ] `docker ps` เห็น caddy / app / db
- [ ] (ไม่ใส่ domain) `curl http://<eip>/` ได้ · (ใส่ domain) `https://<domain>` ได้ใบรับรอง Let's Encrypt

**ที่น่าจะเจอ**
- ติดตั้ง `docker.io` / `docker-compose-v2` ไม่ผ่าน (⚠️ ชื่อ package ยังไม่ยืนยันบน Ubuntu 24.04) → ดู log cloud-init
- A record ยังไม่ชี้ตอนเครื่องบูต → Caddy retry เอง (รอได้) หรือ `docker compose restart caddy`
- แก้ `user_data` แล้ว apply = stop/start ไม่รันสคริปต์ซ้ำ (ตามเอกสาร)

**VERIFY.md:** ตาราง Lab 6 (โดยเฉพาะแถว ⚠️ package, redirect 308, Elastic IP)

---

## Lab 02 · ECS Fargate + ALB + RDS (แพงสุด)

**ก่อน:** `my_ip` · สร้าง ECR repo แล้ว push image (ขั้นนี้ต้องทำ **ก่อน** service ขึ้น)

```bash
cd labs/02-ecs-fargate && terraform init && terraform plan -var my_ip=$(curl -s ifconfig.me)/32
```

ลำดับแนะนำ: apply เฉพาะ ECR ก่อน → push image → apply ที่เหลือ

```bash
terraform apply -target=aws_ecr_repository.api -var my_ip=$(curl -s ifconfig.me)/32
```

```bash
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.ap-southeast-1.amazonaws.com
```

```bash
docker build -t <account>.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/api:v1.0.0 labs/sample-api && docker push <account>.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/api:v1.0.0
```

```bash
terraform apply -var my_ip=$(curl -s ifconfig.me)/32
```

**เช็ก**
- [ ] ECS service dev/prd: running = desired
- [ ] target group healthy (path `/healthz`)
- [ ] `curl http://<alb-dns>:8080/healthz` (dev) / `:80` (prd) ได้ JSON
- [ ] RDS สถานะ Available (นานสุด)

**ที่น่าจะเจอ:** task ค้าง `CannotPullContainerError` (ยังไม่ push image / ไม่มี NAT/VPC endpoint) · health check ไม่ผ่านถ้า port/path ไม่ตรง · image tag immutable ห้าม push ซ้ำ

**ลบ:** `terraform destroy` — RDS/NAT/ALB คิดเงินรายชั่วโมง อย่าลืม · ECR ตั้ง `force_delete = true` ไว้แล้ว (ลบได้แม้มี image)

**VERIFY.md:** ตาราง Lab 2

---

## Lab 07 · App Runner

**ก่อน:** ⚠️ **App Runner ปิดรับลูกค้าใหม่** — account ใหม่อาจสร้าง service ไม่ได้ (ลอง `plan`/`apply` แล้วดู error จริง นั่นคือข้อมูลที่มีค่า) · ต้องมี ECR + image จาก lab 02

```bash
cd labs/07-app-runner && terraform init && terraform plan
```

```bash
terraform apply
```

**เช็ก**
- [ ] service dev/prd สถานะ Running
- [ ] `curl https://<service_url>/healthz` ได้ JSON
- [ ] ลอง `-var port=8080` → ดูข้อความ error จริงตอน health check ล้ม (จดลง VERIFY.md)
- [ ] ลอง `-var image_tag=v9.9.9` → ดูข้อความ error ตอนดึง image ไม่ได้ + `terraform apply` error ว่าอะไร

**ที่น่าจะเจอ:** apply รอ service จนเสร็จ (สูงสุด 20 นาทีตามโค้ด provider) · service ที่ล้มค้างอยู่ใน AWS ต้อง destroy/ลบเอง

**VERIFY.md:** ตาราง Lab 7 — **ข้อความ error ทุกแถวยังเป็น ⚠️ เดา** ตรงนี้ได้ข้อมูลจริงมากสุด

---

## Lab 05 · GitHub Actions + OIDC

**ก่อน:** lab 02 พร้อม (cluster/service dev + prd) · repo GitHub ตามตัวแปร `github_repo` · ⚠️ ถ้ามี OIDC provider ของ GitHub ใน account อยู่แล้ว apply จะ error (มีได้ 1 ตัว) → `terraform import` หรือใช้ตัวเดิม

```bash
cd labs/05-github-actions && terraform init && terraform plan -var github_repo=<owner>/<repo>
```

```bash
terraform apply -var github_repo=<owner>/<repo>
```

**ต่อ:** คัดลอก `workflow/deploy.yml` ไป `.github/workflows/deploy.yml` ของ repo · แก้ `role-to-assume` เป็น output `role_arn` · ตั้ง Environment `production` (+ Required reviewers)

**เช็ก**
- [ ] push `main` → job dev ผ่าน (assume role ได้, push ECR, deploy ECS)
- [ ] push tag `v1.1.0` → job prd รออนุมัติ → กด approve → deploy
- [ ] ลองถอด `permissions: id-token: write` → จดข้อความ error จริง
- [ ] repo ใหม่ (หลัง 15 ก.ค. 2026) → ดู `sub` ที่ส่งจริง (ใน log ของ configure-aws-credentials หรือ debug token) ว่ามี `@<id>` ไหม

**ที่น่าจะเจอ:** `Not authorized to perform sts:AssumeRoleWithWebIdentity` (sub ไม่ตรง) · Required reviewers ใน **private repo** อาจต้องใช้แผนเสียเงินของ GitHub (จากความจำ ยังไม่ได้เช็ก) · job ที่ใส่ `environment:` ส่ง sub แบบ environment ไม่ใช่ branch

**VERIFY.md:** ตาราง Lab 5 (แถวที่ ❌/⚠️ ทั้งหมด)

---

## Lab 04 · CodePipeline + CodeBuild

**ก่อน:** lab 02 พร้อม · repo GitHub ตาม `github_repo` (buildspec อยู่ inline ใน `codebuild.tf` ไม่ต้องมีไฟล์ใน repo)

```bash
cd labs/04-cicd && terraform init && terraform plan -var github_repo=<owner>/<repo>
```

```bash
terraform apply -var github_repo=<owner>/<repo>
```

**ต่อ (ต้องทำมือ):** CodePipeline › Settings › Connections › กด **Update pending connection** แล้ว authorize GitHub → จากนั้นกด Release change

**เช็ก**
- [ ] connection สถานะ Available (ก่อนหน้านั้น Source ล้ม `Connection is not available`)
- [ ] Build ผ่าน (ต้องเปิด Privileged mode ถึง `docker build` ได้)
- [ ] deploy ลง ECS dev → Manual approval → prd
- [ ] `container_name` ตรง task definition (ไม่งั้น Deploy ล้ม)

**ที่น่าจะเจอ:** Build ล้ม `Cannot connect to the Docker daemon` (ลืม Privileged) · Deploy ล้มเรื่องชื่อ container (⚠️ ถ้อยคำ error ยังเดา) · role ขาด `iam:PassRole`

**VERIFY.md:** ตาราง Lab 4

---

## หลังทดสอบทุก lab

- [ ] `terraform destroy` ครบทุก lab (ลำดับกลับ: 04 → 05 → 07 → 02 → 06 → 01 → 03)
- [ ] ตรวจ console: ไม่เหลือ NAT Gateway, ALB, RDS, Elastic IP ที่ไม่ได้ผูก
- [ ] จดผลลง `labs/VERIFY.md` → ส่งข้อความ error ที่ต่างจากตัวจำลองมาแก้
