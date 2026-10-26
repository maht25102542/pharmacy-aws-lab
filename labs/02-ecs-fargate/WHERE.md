# labs/02-ecs-fargate/ — Use case 2: API ใน container (ECS Fargate + ALB + ECR + RDS) แยก dev / prd

รันจากเครื่องคุณ (laptop) · `terraform init && terraform apply` (ใช้ `terraform destroy` เมื่อเลิก; NAT + ALB + RDS คิดเงินรายชั่วโมง)
`terraform validate` ผ่านแล้ว · **ยังไม่เคย apply บน AWS จริง** · apply แล้ว service จะขึ้นไม่ได้จนกว่าจะ `docker push` image (ดู output `push_commands`)

| ไฟล์ | ทำอะไร | หน้าที่เทียบใน console |
|---|---|---|
| `versions.tf`, `variables.tf` | provider, project/region/my_ip/image_tag | — |
| `main.tf` | `local.envs` = dev / prd (for_each) | — |
| `network.tf` | VPC 3 AZ, public/private subnet, IGW, NAT, route table | VPC |
| `security.tf` | SG สายโซ่ ALB → task → DB | EC2 › Security Groups |
| `ecr.tf` | repo `pharmacy/api` (IMMUTABLE) | ECR |
| `iam.tf` | execution role + task role | IAM |
| `alb.tf` | ALB, target group (IP, /healthz), listener 80/8080 | EC2 › Load Balancers |
| `rds.tf` | Postgres 16 ต่อ env (password ใน Secrets Manager) | RDS |
| `ecs.tf` | log group, cluster, task definition, service | ECS, CloudWatch |
| `outputs.tf` | api_urls, ecr url, db endpoints, push_commands | — |

ลองใน Console Lab: Lab › **Use case จริง** › 2 และ Lab › ตัวอย่างสำเร็จรูป › ⑥
เคส error: private subnet ไม่มี NAT · image tag ไม่มีใน ECR · execution role ขาด policy · SG ของ DB ผิดตัว · health check path ผิด
