# labs/08-ecs-express/ — Use case 8: ECS Express Mode (PaaS แบบ AWS แนะนำแทน App Runner สำหรับโปรเจกต์ใหม่)

รันจากเครื่องคุณ (laptop) · **ต้องมี labs/02-ecs-fargate อยู่ก่อน** (ECR + image) · `terraform init && terraform apply` · **ยังไม่เคย apply บน AWS จริง** (ต้อง provider 6.x ที่มี `aws_ecs_express_gateway_service`)

| ไฟล์ | ทำอะไร | หน้าที่เทียบใน console |
|---|---|---|
| `versions.tf`, `variables.tf` | provider, image_tag, port, ขนาด/scaling ต่อ env | — |
| `iam.tf` | execution role (ECS tasks) + infrastructure role (ecs.amazonaws.com) | IAM › Roles › Elastic Container Service |
| `main.tf` | cluster + log group + Express service dev + prd (for_each) | ECS › Express mode › Create |
| `outputs.tf` | URL (endpoint) ของแต่ละ env | ECS › Express services |

ลองใน Console Lab: Lab › **Use case จริง** › 8
เคส error: execution role ไม่มี policy · infrastructure role ไม่มี policy · tag ไม่มี · port ผิด · health check path ผิด

💰 ค่าใช้จ่าย & bill management ของ lab นี้: [COST.md](COST.md) (สร้างจาก `tools/console-lab/src/mod/61-cost-data.js` ด้วย `node tools/console-lab/gen-cost-md.js`)
