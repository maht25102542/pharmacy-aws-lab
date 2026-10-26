# labs/VERIFY.md — เช็กลิสต์เทียบ Console Lab กับ AWS จริง (ทำเมื่อบัญชี AWS ใช้งานได้)

ตัวจำลองเขียนจากเอกสาร + ความจำ ยังไม่เคยเทียบกับ AWS จริง · รัน lab จริงแล้วเทียบคำตอบตามนี้ ถ้าไม่ตรงให้แก้ที่ `tools/console-lab/src/mod/` (ข้อความ error) แล้วแจ้งในตารางท้ายไฟล์

## Lab 3 (labs/03-serverless)
| ทำ | ควรเห็นจริง | ในตัวจำลอง |
|---|---|---|
| `terraform apply` ก่อน zip | `Error: unable to load "./build/app.zip": open ./build/app.zip: no such file or directory` (ข้อความอาจต่างเล็กน้อยตามเวอร์ชัน provider) | ตรงตามนี้ |
| `curl <api_url>` ไม่มี `aws_lambda_permission` | `{"message":"Internal Server Error"}` HTTP 500 · Lambda Monitor: Invocations = 0 · `aws lambda get-policy` → `ResourceNotFoundException: The resource you requested does not exist.` | ตรงตามนี้ |
| route ผิด | `{"message":"Not Found"}` HTTP 404 | ตรงตามนี้ |
| role ไม่มี dynamodb:Scan | 500 + log: `[ERROR] ClientError: An error occurred (AccessDeniedException) when calling the Scan operation: User: arn:aws:sts::<acct>:assumed-role/<role>/<fn> is not authorized to perform: dynamodb:Scan on resource: <table-arn> because no identity-based policy allows the dynamodb:Scan action` | ตรงตามนี้ |
| ปุ่ม Test Lambda เมื่อ error | `errorMessage` / `errorType` / `stackTrace` + REPORT | ตรงตามนี้ (stackTrace เป็นตัวอย่าง) |
| สร้าง Lambda ทันทีหลังสร้าง role | บางครั้ง `InvalidParameterValueException: The role defined for the function cannot be assumed by Lambda` (IAM propagation) | **ไม่จำลอง** (ในตัวจำลองผ่านเสมอ ถ้า trust ถูก) |

## Lab 4 (labs/04-cicd) — ข้อความทั้งหมดมาจากความจำ (ค้นเว็บยืนยันไม่ได้ตอนเขียน) ตรวจก่อนเชื่อ
| ทำ | ควรเห็นจริง | ในตัวจำลอง |
|---|---|---|
| execution แรกหลัง apply (connection Pending) | Source ล้ม · ข้อความเกี่ยวกับ connection ไม่ใช่สถานะ Available | `Unable to use Connection: <arn>. The connection is not in the Available status` (ถ้อยคำอาจต่าง) |
| CodeBuild ไม่ privileged | log: `Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?` | ตรงตามนี้ (ข้อความนี้เจอบ่อยมาก) |
| role CodeBuild ไม่มี ECR | `AccessDeniedException … ecr:GetAuthorizationToken` / `denied: … ecr:InitiateLayerUpload` | ตรงตามนี้ |
| imagedefinitions.json ชื่อ container ผิด | Deploy ล้ม (ข้อความจริงอาจเป็นเรื่อง task definition / container) | `Unable to find container named 'app' in task definition …` (**ไม่แน่ใจถ้อยคำ**) |
| ไม่มี iam:PassRole | `… is not authorized to perform: iam:PassRole on resource: arn:aws:iam::…:role/…` | ตรงตามนี้ |
| authorize connection นอก Terraform แล้ว plan | `Objects have changed outside of Terraform` (connection_status PENDING → AVAILABLE) | ตรงตามนี้ |
| ขั้น Approve | execution หยุดรอ · ปุ่ม Review → Approve/Reject | ตรงตามนี้ |

## ที่ยังต่างจากของจริงแน่นอน
- เวลา: ของจริง ALB/NAT/RDS/CloudFront ใช้เวลาหลายนาที ตัวจำลองมี "ความเร็ว" ให้เลือกแต่ไม่แม่นเป๊ะ
- ตัวเลข Duration / Init Duration / Max Memory Used เป็นค่าสุ่มแบบคงที่ ไม่ใช่การวัดจริง
- ข้อความ error ของ Terraform แบบ `operation error <Svc>: <Op>, https response error StatusCode: 400, RequestID: …, api error <Code>: …` อาจเป็น `…, <Code>: …` (ไม่มี "api error") ใน exception ที่ SDK รู้จัก (เช่น Lambda/DynamoDB) ยังไม่ได้ยืนยัน
- หน้าที่เป็นหน้าว่างใน console (Applications, Code signing, VPC links, Exports, Namespaces, Dashboards ฯลฯ) จำลองเฉพาะ empty state

## ผลเทียบจริง (กรอกเมื่อทดสอบ)
| วันที่ | lab | ข้อ | ผล | แก้แล้ว? |
|---|---|---|---|---|
