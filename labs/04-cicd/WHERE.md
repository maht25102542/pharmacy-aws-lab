# labs/04-cicd/ — Use case 4: CI/CD (CodePipeline + CodeBuild → ECR → ECS dev → อนุมัติ → ECS prd)

รันจากเครื่องคุณ (laptop) · **ต้องมี labs/02-ecs-fargate อยู่ก่อน** (cluster pharmacy-dev / pharmacy-prd, service pharmacy-api, ECR repo pharmacy/api) · `terraform init && terraform apply` (`terraform destroy` เมื่อเลิก)
`terraform validate` ผ่านแล้ว · **ยังไม่เคย apply บน AWS จริง** · หลัง apply ต้อง authorize GitHub connection ใน console (Terraform ทำให้ไม่ได้) แล้ว Release change

| ไฟล์ | ทำอะไร | หน้าที่เทียบใน console |
|---|---|---|
| `versions.tf`, `variables.tf` | provider, github_repo / branch / ecr_repo / container_name | — |
| `main.tf` | account id, ECR URL, ปลายทาง deploy (cluster ของ dev/prd) | — |
| `artifacts.tf` | S3 bucket เก็บ artifact + **GitHub connection (Pending)** | S3, Developer Tools › Connections |
| `iam.tf` | role + policy ของ CodeBuild (log, S3, ECR) และของ Pipeline (S3, connection, build, ECS, **PassRole**) | IAM |
| `codebuild.tf` | project: buildspec docker build/push, **privileged_mode = true**, env ECR_REPO_URL / CONTAINER_NAME | CodeBuild |
| `pipeline.tf` | 5 ขั้น Source → Build → DeployDev → Approve → DeployPrd (depends_on policy กัน execution แรกล้ม) | CodePipeline |
| `outputs.tf` | pipeline_name, connection_status, authorize_hint | — |

ลองใน Console Lab: Lab › **Use case จริง** › 4 และ Lab › ตัวอย่างสำเร็จรูป › ⑧
เคส error: connection Pending · ไม่เปิด Privileged · role CodeBuild ไม่มี ECR · CONTAINER_NAME ไม่ตรง task definition · pipeline role ไม่มี iam:PassRole
