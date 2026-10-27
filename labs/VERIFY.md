# labs/VERIFY.md — เช็กลิสต์เทียบ Console Lab กับ AWS จริง (ทำเมื่อบัญชี AWS ใช้งานได้)

ตัวจำลองเขียนจากเอกสาร + ความจำ ยังไม่เคยเทียบกับ AWS จริง · รัน lab จริงแล้วเทียบคำตอบตามนี้ ถ้าไม่ตรงให้แก้ที่ `tools/console-lab/src/mod/` (ข้อความ error) แล้วแจ้งในตารางท้ายไฟล์

## Lab 2 (labs/02-ecs-fargate) — ยืนยันจากเอกสาร/Knowledge Center แล้ว
| ทำ | ควรเห็นจริง | ในตัวจำลอง | ยืนยัน |
|---|---|---|---|
| private subnet ไม่มี NAT/endpoint | task STOPPED: `ResourceInitializationError: unable to pull secrets or registry auth: The task cannot pull registry auth from Amazon ECR: …` | ตรง | ✅ [Knowledge Center](https://www.repost.aws/knowledge-center/ecs-image-pull-error-ecr) |
| image tag ไม่มีใน ECR | `CannotPullContainerError: pull image manifest has been retried 5 time(s): failed to resolve ref <uri>: <uri>: not found` | ตรง | ✅ [Knowledge Center](https://repost.aws/knowledge-center/ecs-pull-container-error) · [ECS docs](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_cannot_pull_image.html) |
| ทางออกอื่นแทน NAT (ยืนยันแล้ว: เอกสาร AWS ระบุว่า `i/o timeout` / `context deadline exceeded` ใน ResourceInitializationError = ปัญหา network ระหว่าง task กับบริการ · [เอกสาร](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/resource-initialization-error.html)) | VPC endpoints: `ecr.dkr`, `ecr.api` (interface) + `s3` (gateway) (+ `secretsmanager`, `logs` ถ้าใช้) · interface ต้อง private DNS + SG รับ 443 จาก task | จำลองแล้ว (scenario `ecs-vpce*`) · ข้อความ timeout ของ s3/logs/secretsmanager เรียบเรียงจากรูปแบบข้อความจริง ไม่ใช่ถอดคำต่อคำ | ⚠️ [guide](https://dev.to/danquack/private-fargate-deployment-with-vpc-endpoints-1h0p) |

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
| imagedefinitions.json `name` ไม่ตรง container | Deploy ล้ม · เอกสาร: `name` ต้องตรงชื่อ container ใน task definition (case-sensitive) | `Unable to find container named 'app' in task definition …` + ต่อท้ายว่าข้อความนี้ตัวจำลองเขียนเอง | ❌ **ไม่ทราบทั้งถ้อยคำและพฤติกรรม**: เปิดอ่านหน้า [Troubleshooting](https://docs.aws.amazon.com/codepipeline/latest/userguide/troubleshooting.html) และ [file-reference](https://docs.aws.amazon.com/codepipeline/latest/userguide/file-reference.html) แล้ว ไม่มีรายการเรื่องชื่อ container ไม่ตรง (มีแต่ `Exception while trying to read the task definition artifact file` ของ CodeDeployToECS) · ของจริงอาจ **สำเร็จแต่ image ไม่เปลี่ยน** ต้องทดลองจริงแล้วแก้ `src/mod/44-cicd.js` (ค้น "Unable to find container") |
| ไม่มี iam:PassRole | `… is not authorized to perform: iam:PassRole on resource: arn:aws:iam::…:role/<execution role>` (เห็นชื่อ role ที่ต้อง pass) | ตรง | ✅ รูปแบบเดียวกับรายงาน ECS อื่น |
| authorize connection นอก Terraform แล้ว plan | `Objects have changed outside of Terraform` (connection_status PENDING → AVAILABLE) | ตรง | ✅ พฤติกรรม Terraform |
| ขั้น Approve | execution หยุดรอ · Review → Approve/Reject | ตรง | ✅ |

แหล่ง: [Update a pending connection](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-update.html) · [CloudFormation Connection](https://docs.amazonaws.cn/AWSCloudFormation/latest/UserGuide/aws-resource-codestarconnections-connection.html) · [Pulumi codestarconnections](https://www.pulumi.com/registry/packages/aws/api-docs/codestarconnections/connection/) · [imagedefinitions.json reference](https://docs.aws.amazon.com/codepipeline/latest/userguide/file-reference.html) · [UseConnection permission](https://haydnjmorris.medium.com/solving-permissions-error-with-aws-codepipeline-c93cfc000285)

## Lab 5 (labs/05-github-actions) — อ่าน README ของ aws-actions/configure-aws-credentials แล้ว
| ทำ | ควรเห็นจริง | ในตัวจำลอง | ยืนยัน |
|---|---|---|---|
| trust ไม่ตรง sub/aud | `Not authorized to perform sts:AssumeRoleWithWebIdentity` | ตรง | ✅ README ([aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials)) |
| job ที่ใส่ `environment:` | sub มีส่วน `environment:<ชื่อ>` (README: "Workflows running in GitHub environments will include an environment:<ENVIRONMENT_NAME> stanza") | sub = `repo:O/R:environment:NAME` | ✅ ตามหลักการ (README ไม่เขียนรูปเต็ม) |
| ไม่มี `permissions: id-token: write` | README บอกแค่ว่า "ต้องมี" ไม่มีข้อความ error | `Credentials could not be loaded, please check your action inputs: Could not load credentials from any providers` | ❌ **ไม่พบในเอกสาร** ถ้อยคำจากความจำ |
| ไม่มี OIDC provider | README ไม่มีข้อความ | `No OpenIDConnect provider found in your account for https://token.actions.githubusercontent.com` | ❌ จากความจำ |
| render task definition หา container ไม่เจอ | ไม่ทราบ | `Could not find container definition with matching name '…'` | ❌ จากความจำ |
| deploy ไม่ stable | `Resource is not in the state servicesStable` | ตรง | ⚠️ จากความจำ (ข้อความของ ECS waiter) |
| รูปแบบ sub รุ่นใหม่ | README ว่ามี "immutable sub" `repo:ORG@<org id>/REPO@<repo id>:…` (repo ใหม่/opt-in) ตัวจำลองใช้แบบเดิม `repo:ORG/REPO:…` | แบบเดิม | ⚠️ ถ้า repo ของคุณส่งแบบใหม่ trust แบบเดิมจะ `Not authorized…` ตรวจ token จริงก่อน |
| `ForAllValues:` ใน trust | README เตือนว่าอย่าใช้ใน Allow (ผ่านได้เมื่อ claim หาย/พิมพ์ผิด) | ไม่จำลอง | ✅ README |

## Lab 6 (labs/06-single-vm) — จำลองจากพฤติกรรมที่รู้ ไม่ได้ค้นข้อความ error (ไม่มีข้อความ error ของ AWS เกี่ยวข้อง)
| ทำ | ควรเห็นจริง | ในตัวจำลอง | ยืนยัน |
|---|---|---|---|
| user_data ลืม `docker compose up` | เครื่อง running แต่ไม่มี container · `ERR_CONNECTION_REFUSED` | ตรง | ✅ พฤติกรรมพื้นฐาน |
| SG ปิด 80/443 | timeout | ตรง | ✅ |
| stop/start ไม่มี Elastic IP | public IP เปลี่ยน (ตามเอกสาร EC2) | ตรง | ✅ |
| แก้ user_data หลังเครื่องรันแล้ว | cloud-init รันสคริปต์เฉพาะบูตครั้งแรก (ค่าเริ่มต้น) · terraform จะ stop/start หรือ replace ตาม provider | ตัวจำลองไม่จำลองการแก้ user_data ทีหลัง | ⚠️ ไม่ได้เปิดอ่านเอกสาร cloud-init/provider |
| Caddy ขอใบรับรองไม่ผ่าน (DNS/port 80) | Caddy log: ACME challenge failed · เบราว์เซอร์เจอ TLS error (รูปแบบ error ขึ้นกับเบราว์เซอร์) | `ERR_SSL_PROTOCOL_ERROR` | ⚠️ จากความจำ |
| เข้าด้วย IP แทนชื่อโดเมน (Caddy ใช้ชื่อ) | ใบรับรองไม่ตรงชื่อ | `NET::ERR_CERT_COMMON_NAME_INVALID` | ⚠️ จากความจำ |

## Lab 7 (labs/07-app-runner) — ข้อความ error เขียนจากความจำ ยังไม่ได้ค้นเอกสาร
| ทำ | ควรเห็นจริง | ในตัวจำลอง | ยืนยัน |
|---|---|---|---|
| access role ไม่มี policy ECR / ดึง image ไม่ได้ | Create failed · "Failed to pull your application image. Be sure you configured your service to use a valid access role…" | ตรง (ข้อความจากความจำ) | ⚠️ ค้นเอกสารแล้ว **ไม่พบข้อความ event log** (เอกสารบอกแค่ให้อ่าน service events/logs) |
| port ไม่ตรง | "Health check failed on protocol `TCP` [Port: '8080'], failure threshold is 5 times…" | ตรง | ⚠️ ข้อความไม่พบในเอกสาร · default ยืนยันแล้ว: TCP, path `/`, interval 5, timeout 2, healthy 1, unhealthy 5 |
| HTTP health check path 404 | Health check failed … status code | ข้อความย่อเอง | ⚠️ |
| ค่า cpu/memory ที่จับคู่ได้ | 256/512 → 0.25 vCPU ได้ 0.5-2 GB ฯลฯ | ตารางจากความจำ | ⚠️ |
| คู่ cpu/memory | 11 คู่ตามเอกสาร (0.25→0.5/1 · 0.5→1 · 1→2/3/4 · 2→4/6 · 4→8/10/12 GB) | ตรง | ✅ จากเอกสาร (release 2023-04-05) |
| App Runner ปิดรับลูกค้าใหม่ | เอกสาร availability-change: ลูกค้าเดิมสร้าง service ใหม่ได้ ไม่มี feature ใหม่ · แนะนำ ECS Express Mode (วันที่ไม่ได้ระบุในหน้าเอกสาร) | ใส่คำเตือนใน UC #7 ไม่ระบุวันที่ | ✅ จากเอกสาร (วันที่ยืนยันไม่ได้) |
| `terraform apply` เมื่อ service CREATE_FAILED | apply error + service ค้าง | `waiting for App Runner Service (<arn>) create: unexpected state 'CREATE_FAILED', wanted target 'RUNNING'. last error: %!s(<nil>)` | ✅ ส่วนหน้า+Target/Pending จาก service.go · ⚠️ ส่วน unexpected state/last error จากความจำ · service ค้างอยู่ใน AWS (ID ถูก set ก่อน wait) |
| URL รูปแบบ `<id>.<region>.awsapprunner.com` | เอกสารไม่ได้ระบุรูปแบบ (บอกแค่ *.awsapprunner.com อยู่ใน Public Suffix List) | ใช้ `<id>.<region>.awsapprunner.com` | ⚠️ รูปแบบจากความจำ |
| access role: trust `build.apprunner.amazonaws.com` + `AWSAppRunnerServicePolicyForECRAccess`, ต้องมีสำหรับ ECR ส่วนตัว (ECR Public ไม่ต้อง) | ตามเอกสาร | ตรง | ✅ |
| TF defaults: port "8080", cpu 1024, memory 2048, auto_deployments_enabled true | ตามโค้ด provider | ตรง | ✅ |
| สถานะ RUNNING / OPERATION_IN_PROGRESS / CREATE_FAILED | ชื่อสถานะ API | ตรง | ✅ |

## ที่ยังต่างจากของจริงแน่นอน
- เวลา: ของจริง ALB/NAT/RDS/CloudFront ใช้เวลาหลายนาที ตัวจำลองมี "ความเร็ว" ให้เลือกแต่ไม่แม่นเป๊ะ
- ตัวเลข Duration / Init Duration / Max Memory Used เป็นค่าสุ่มแบบคงที่ ไม่ใช่การวัดจริง
- ข้อความ error ของ Terraform แบบ `operation error <Svc>: <Op>, https response error StatusCode: 400, RequestID: …, api error <Code>: …` อาจเป็น `…, <Code>: …` (ไม่มี "api error") ใน exception ที่ SDK รู้จัก (เช่น Lambda/DynamoDB) ยังไม่ได้ยืนยัน
- หน้าที่เป็นหน้าว่างใน console (Applications, Code signing, VPC links, Exports, Namespaces, Dashboards ฯลฯ) จำลองเฉพาะ empty state

## ผลเทียบจริง (กรอกเมื่อทดสอบ)
| วันที่ | lab | ข้อ | ผล | แก้แล้ว? |
|---|---|---|---|---|

## เวลา (โหมดความเร็ว "เหมือนจริง") — ค่าประมาณจากความจำ ไม่ได้วัด
| resource | ตัวจำลองใช้ | หมายเหตุ |
|---|---|---|
| NAT gateway | ~60 วินาที (pending) | เดิม |
| ALB | ~3 นาที (provisioning) | เดิม |
| RDS single-AZ / Multi-AZ | ~6 / ~12 นาที (Creating: app ต่อ DB ไม่ได้) | ของจริง 5-20 นาที ขึ้นกับขนาด |
| ECS service หลัง create/update | PENDING ~45 วินาที → health check รอบแรก ~30 วินาที | ขึ้นกับขนาด image |
| CodePipeline ต่อขั้น | Source ~8 วินาที · Build ~100 วินาที · Deploy ECS ~80 วินาที | pipeline ผลคำนวณล่วงหน้าแต่เปิดเผยเมื่อครบเวลา (หน้ารีเฟรชเอง) |
| EKS cluster / node group | Creating ~9 นาที / ~2.5 นาที (สร้าง node group ตอน cluster ยัง Creating = `ResourceInUseException … not in ACTIVE state` ⚠️ ถ้อยคำจากความจำ) | ของจริง cluster ~10-15 นาที |
| CloudFront | Deploying ~4 นาทีหลังสร้าง/แก้ แล้วเป็น Deployed | ของจริงมัก 3-10 นาที |
| CloudFront invalidation | In progress ~1 นาที (แคชยังไม่ล้างระหว่างนั้น) แล้ว Completed | ของจริงมักไม่กี่สิบวินาที-นาที |
| ACM DNS validation | หลังเจอ CNAME รอ ~2.5 นาทีก่อน Issued (terraform รอใน aws_acm_certificate_validation) | ของจริงมัก 1-30 นาที |
| terraform destroy | RDS ~4 นาที · EKS ~5 นาที · node group ~3 นาที · CloudFront ~7 นาที (ต้อง disable ก่อน) · NAT ~1 นาที · ECS service ~1.5 นาที | แสดง `Still destroying…` |
| terraform apply | EKS ~9 นาที · RDS ~6/13 นาที · CloudFront ~4 นาที · interface endpoint ~90 วินาที ฯลฯ | แสดง `Still creating…` ตามเวลา |
| ลบ RDS / EKS / node group ใน console | แสดง Deleting ~4 / ~5 / ~3 นาที แล้วหาย · สร้างชื่อเดิมระหว่างนั้นไม่ได้ (`…AlreadyExists`) | ลบ resource อื่นใน console ยังหายทันที |

## แท็บ/หน้าที่เป็น "คำอธิบาย" ไม่ใช่ข้อมูลจริง
แท็บที่ console จริงมีแต่ lab ไม่มีข้อมูลส่วนนั้น (ไม่ได้ซ่อน/ปิดสีเทาแล้ว แต่แสดงข้อความบอกชัด): Flow logs, CIDR reservations, Sharing (RAM), Last Accessed (Access Advisor), Revoke sessions, Zero-ETL, Data migrations (DMS), S3 Management/Access Points, DNSSEC, WAF/Logging ของ CloudFront, Scheduled tasks ของ ECS, Applications/Code signing ของ Lambda ฯลฯ · ที่มีข้อมูลจริง: Tags, Monitoring/Metrics (ค่าสะสมของ lab), Lambda Versions/Aliases, API CORS/Authorization, DynamoDB Indexes (GSI) + Deletion protection, EKS Resources/Nodes/Update history, Network ACL (default), pipeline Triggers

## ตัวเลขเวลา: เอกสาร AWS บอกอะไรจริง ๆ (เปิดอ่านแล้ว)
| เรื่อง | เอกสารระบุ | ตัวจำลองใช้ |
|---|---|---|
| EKS cluster | "Cluster provisioning takes several minutes." (ไม่ระบุตัวเลข) | ~9 นาที (จากความจำ) |
| RDS | "it can take several minutes for the new instance to be available" | 6 / 12 นาที (จากความจำ) |
| ACM DNS validation | "might continue to display … Pending validation for up to 30 minutes" · หมดเวลาที่ 72 ชม. | ~2.5 นาที (อยู่ในช่วงที่เอกสารยอมรับ) |
| CloudFront invalidation | ส่งไปทุก edge "within a few seconds" แล้วแต่ละ edge เริ่มทันที (ไม่ระบุเวลาจบ) | ~1 นาที (จากความจำ) |
| CloudFront Deploying | ไม่ระบุตัวเลข | ~4 นาที (จากความจำ) |
| NAT gateway / ALB | ไม่ระบุตัวเลข (ALB: พร้อมเมื่อมี healthy target ครบทุก AZ) | ~1 / ~3 นาที (จากความจำ) |
สรุป: เอกสารยืนยันเฉพาะ "หลายนาที" และ ACM "สูงสุด 30 นาที" ตัวเลขอื่นเป็นค่ากลางที่ผมประมาณ ไม่มีแหล่งทางการ
