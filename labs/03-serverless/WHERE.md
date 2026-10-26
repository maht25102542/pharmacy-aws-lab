# labs/03-serverless/ — Use case 3: Serverless API (API Gateway HTTP API + Lambda + DynamoDB) แยก dev / prd

รันจากเครื่องคุณ (laptop) · ก่อน apply ต้อง zip โค้ด: `mkdir -p build && cd src && zip ../build/app.zip app.py` (ดู output `zip_command`; ไม่ zip = apply ล้ม `unable to load "./build/app.zip"`) แล้ว `terraform init && terraform apply` (`terraform destroy` เมื่อเลิก)
`terraform validate` ผ่านแล้ว · **ยังไม่เคย apply บน AWS จริง** · ไม่มี NAT/ALB/เครื่อง จึงแทบไม่มีค่าใช้จ่ายตอนไม่มีคำขอ

| ไฟล์ | ทำอะไร | หน้าที่เทียบใน console |
|---|---|---|
| `versions.tf`, `variables.tf` | provider aws (ap-southeast-1), project/region | — |
| `main.tf` | `local.envs` = dev / prd (for_each ทุก resource) | — |
| `dynamodb.tf` | table ต่อ env (PAY_PER_REQUEST, prd เปิด PITR) | DynamoDB |
| `iam.tf` | role ของ Lambda ต่อ env: AWSLambdaBasicExecutionRole + inline policy แตะเฉพาะ table ของ env | IAM |
| `lambda.tf` | log group, function (python3.12), permission ให้ API Gateway เรียก | Lambda, CloudWatch |
| `apigw.tf` | HTTP API, integration, route GET/POST /drugs, stage (ชื่อ env) | API Gateway |
| `outputs.tf` | api_urls, tables, zip_command | — |
| `src/app.py` | โค้ด handler (payload v2.0): GET = scan, POST = put_item | Lambda › Code |

ลองใน Console Lab: Lab › **Use case จริง** › 3 และ Lab › ตัวอย่างสำเร็จรูป › ⑦
เคส error: Lambda ไม่มีสิทธิ์ DynamoDB · API Gateway ไม่มี permission เรียก Lambda · route พิมพ์ผิด (404) · TABLE_NAME ผิด
