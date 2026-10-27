# labs/07-app-runner/ — Use case 7: App Runner (PaaS: ให้ image แล้วได้ URL HTTPS)

รันจากเครื่องคุณ (laptop) · **ต้องมี labs/02-ecs-fargate อยู่ก่อน** (ECR + image) · `terraform init && terraform apply` · **ยังไม่เคย apply บน AWS จริง**

| ไฟล์ | ทำอะไร | หน้าที่เทียบใน console |
|---|---|---|
| `versions.tf`, `variables.tf` | provider, image_tag, port, ขนาดต่อ env | — |
| `iam.tf` | access role (trust build.apprunner.amazonaws.com) + AWSAppRunnerServicePolicyForECRAccess | IAM › Roles › App Runner |
| `main.tf` | service dev + prd (for_each) | App Runner › Create service |
| `outputs.tf` | URL ของแต่ละ env | App Runner › Services |

ลองใน Console Lab: Lab › **Use case จริง** › 7 และ ตัวอย่างสำเร็จรูป › ⑪
เคส error: access role ไม่มี policy ECR · tag ไม่มี · port ผิด · health check path ผิด

💰 ค่าใช้จ่าย & bill management ของ lab นี้: [COST.md](COST.md) (สร้างจาก `tools/console-lab/src/mod/61-cost-data.js` ด้วย `node tools/console-lab/gen-cost-md.js`)
