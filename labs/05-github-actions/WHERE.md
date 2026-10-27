# labs/05-github-actions/ — Use case 5: GitHub Actions + OIDC → ECR → ECS (dev อัตโนมัติ, prd ต้องอนุมัติ)

รันจากเครื่องคุณ (laptop) · **ต้องมี labs/02-ecs-fargate อยู่ก่อน** · `terraform init && terraform apply` · `terraform validate` ผ่านแล้ว · **ยังไม่เคย apply บน AWS จริง**
หลัง apply: คัดลอก `workflow/deploy.yml` ไปไว้ที่ repo `.github/workflows/deploy.yml` แล้วแก้ `role-to-assume` เป็นค่าจาก output `role_arn` · ตั้ง GitHub Environment `production` + Required reviewers

| ไฟล์ | ทำอะไร | หน้าที่เทียบใน console |
|---|---|---|
| `versions.tf`, `variables.tf` | provider (>= 5.81), github_repo / branch / prd_environment | — |
| `main.tf` | account id + รายการ `sub` ที่อนุญาต (branch + environment) | — |
| `oidc.tf` | OIDC provider ของ GitHub | IAM › Identity providers |
| `iam.tf` | role (trust = web identity, จำกัด aud + sub) + policy ECR/ECS/PassRole | IAM › Roles › Web identity |
| `workflow/deploy.yml` | workflow ตัวอย่าง (ไม่ใช่ Terraform) | GitHub › repo › Actions |

ลองใน Console Lab: Lab › **Use case จริง** › 5 และ Lab › ตัวอย่างสำเร็จรูป › ⑨
เคส error: ไม่มี `id-token: write` · ไม่มี OIDC provider · trust ผูกแค่ branch (job ที่ใส่ environment ส่ง sub คนละแบบ) · role ไม่มีสิทธิ์ ECR · CONTAINER_NAME ผิด · ไม่มี iam:PassRole

💰 ค่าใช้จ่าย & bill management ของ lab นี้: [COST.md](COST.md) (สร้างจาก `tools/console-lab/src/mod/61-cost-data.js` ด้วย `node tools/console-lab/gen-cost-md.js`)
