# labs/VERIFY.md — เช็กลิสต์เทียบ Console Lab กับ AWS จริง (ทำเมื่อบัญชี AWS ใช้งานได้)

ตัวจำลองเขียนจากเอกสาร + ความจำ ยังไม่เคยเทียบกับ AWS จริง · รัน lab จริงแล้วเทียบคำตอบตามนี้ ถ้าไม่ตรงให้แก้ที่ `tools/console-lab/src/mod/` (ข้อความ error) แล้วแจ้งในตารางท้ายไฟล์

## Lab 2 (labs/02-ecs-fargate) — ยืนยันจากเอกสาร/Knowledge Center แล้ว
| ทำ | ควรเห็นจริง | ในตัวจำลอง | ยืนยัน |
|---|---|---|---|
| private subnet ไม่มี NAT/endpoint | task STOPPED: `ResourceInitializationError: unable to pull secrets or registry auth: The task cannot pull registry auth from Amazon ECR: …` | ตรง | ✅ [Knowledge Center](https://www.repost.aws/knowledge-center/ecs-image-pull-error-ecr) |
| image tag ไม่มีใน ECR | `CannotPullContainerError: pull image manifest has been retried 5 time(s): failed to resolve ref <uri>: <uri>: not found` | ตรง | ✅ [Knowledge Center](https://repost.aws/knowledge-center/ecs-pull-container-error) · [ECS docs](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_cannot_pull_image.html) |
| ทางออกอื่นแทน NAT | VPC endpoints: `ecr.dkr`, `ecr.api` (interface) + `s3` (gateway) (+ `secretsmanager`, `logs` ถ้าใช้) | **ไม่จำลอง** (ตัวจำลองมีแค่ NAT / public IP) | — |

## Lab 3 (labs/03-serverless)
| ทำ | ควรเห็นจริง | ในตัวจำลอง |
|---|---|---|
| `terraform apply` ก่อน zip | `Error: unable to load "./build/app.zip": open ./build/app.zip: no such file or directory` (ข้อความอาจต่างเล็กน้อยตามเวอร์ชัน provider) | ตรงตามนี้ |
| `curl <api_url>` ไม่มี `aws_lambda_permission` | `{"message":"Internal Server Error"}` HTTP 500 · Lambda Monitor: Invocations = 0 · `aws lambda get-policy` → `ResourceNotFoundException: The resource you requested does not exist.` | ตรงตามนี้ |
| route ผิด | `{"message":"Not Found"}` HTTP 404 | ตรงตามนี้ |
| role ไม่มี dynamodb:Scan | 500 + log: `[ERROR] ClientError: An error occurred (AccessDeniedException) when calling the Scan operation: User: arn:aws:sts::<acct>:assumed-role/<role>/<fn> is not authorized to perform: dynamodb:Scan on resource: <table-arn> because no identity-based policy allows the dynamodb:Scan action` | ตรงตามนี้ |
| ปุ่ม Test Lambda เมื่อ error | `errorMessage` / `errorType` / `stackTrace` + REPORT | ตรงตามนี้ (stackTrace เป็นตัวอย่าง) |
| สร้าง Lambda ทันทีหลังสร้าง role | บางครั้ง `InvalidParameterValueException: The role defined for the function cannot be assumed by Lambda` (IAM propagation) | **ไม่จำลอง** (ในตัวจำลองผ่านเสมอ ถ้า trust ถูก) |

## Lab 4 (labs/04-cicd) — ค้นเว็บยืนยันแล้วบางส่วน (อ้างอิงท้ายตาราง)
| ทำ | ควรเห็นจริง | ในตัวจำลอง | ยืนยัน |
|---|---|---|---|
| connection ที่ Terraform/CloudFormation สร้าง | สถานะ PENDING เสมอ ต้องทำต่อใน console: Update pending connection → ติดตั้ง GitHub app → Complete connection | ตรง | ✅ เอกสาร AWS/Pulumi |
| execution แรกหลัง apply (connection Pending) | Source ล้ม · ข้อความแนว `Connection is not available.` | `Connection is not available. (<arn> …Pending…)` | ⚠️ บล็อกคู่มือ ไม่ใช่เอกสารทางการ |
| role pipeline ไม่มี `codestar-connections:UseConnection` | `Unable to use Connection: <arn>. The provided role does not have sufficient permissions.` | ตรง | ✅ หลายรายงานตรงกัน |
| CodeBuild ไม่ privileged | log: `Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?` | ตรง | ✅ ข้อความมาตรฐาน Docker |
| role CodeBuild ไม่มี ECR | `AccessDeniedException … ecr:GetAuthorizationToken` / `denied: … ecr:InitiateLayerUpload` | ตรง | ✅ รูปแบบ IAM มาตรฐาน |
| imagedefinitions.json `name` ไม่ตรง container | Deploy ล้ม · เอกสาร: `name` ต้องตรงชื่อ container ใน task definition (case-sensitive) | `Unable to find container named 'app' in task definition …` | ❌ **ถ้อยคำจริงไม่ทราบ** ดู Details ใน console จริงแล้วแก้ |
| ไม่มี iam:PassRole | `… is not authorized to perform: iam:PassRole on resource: arn:aws:iam::…:role/<execution role>` (เห็นชื่อ role ที่ต้อง pass) | ตรง | ✅ รูปแบบเดียวกับรายงาน ECS อื่น |
| authorize connection นอก Terraform แล้ว plan | `Objects have changed outside of Terraform` (connection_status PENDING → AVAILABLE) | ตรง | ✅ พฤติกรรม Terraform |
| ขั้น Approve | execution หยุดรอ · Review → Approve/Reject | ตรง | ✅ |

แหล่ง: [Update a pending connection](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-update.html) · [CloudFormation Connection](https://docs.amazonaws.cn/AWSCloudFormation/latest/UserGuide/aws-resource-codestarconnections-connection.html) · [Pulumi codestarconnections](https://www.pulumi.com/registry/packages/aws/api-docs/codestarconnections/connection/) · [imagedefinitions.json reference](https://docs.aws.amazon.com/codepipeline/latest/userguide/file-reference.html) · [UseConnection permission](https://haydnjmorris.medium.com/solving-permissions-error-with-aws-codepipeline-c93cfc000285)

## ที่ยังต่างจากของจริงแน่นอน
- เวลา: ของจริง ALB/NAT/RDS/CloudFront ใช้เวลาหลายนาที ตัวจำลองมี "ความเร็ว" ให้เลือกแต่ไม่แม่นเป๊ะ
- ตัวเลข Duration / Init Duration / Max Memory Used เป็นค่าสุ่มแบบคงที่ ไม่ใช่การวัดจริง
- ข้อความ error ของ Terraform แบบ `operation error <Svc>: <Op>, https response error StatusCode: 400, RequestID: …, api error <Code>: …` อาจเป็น `…, <Code>: …` (ไม่มี "api error") ใน exception ที่ SDK รู้จัก (เช่น Lambda/DynamoDB) ยังไม่ได้ยืนยัน
- หน้าที่เป็นหน้าว่างใน console (Applications, Code signing, VPC links, Exports, Namespaces, Dashboards ฯลฯ) จำลองเฉพาะ empty state

## ผลเทียบจริง (กรอกเมื่อทดสอบ)
| วันที่ | lab | ข้อ | ผล | แก้แล้ว? |
|---|---|---|---|---|
