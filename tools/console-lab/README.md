# console-lab

คอนโซลจำลอง (ไฟล์เดียว เปิดในเบราว์เซอร์ได้เลย build ด้วย `node build.js`) ไว้ฝึกกดสร้าง VPC, subnet, SG, EC2, ALB, IAM, ECR
แล้วเทียบกับโค้ด Terraform ใน `terraform/` ของ repo นี้ ไม่เรียก AWS จริง

- โครงเมนู: เมนูซ้ายและชื่อกลุ่มเรียงตาม console จริง (รายการที่ยังไม่จำลองเป็นสีจาง), ช่องค้นหาด้านบน, เลือก region, ตารางมีช่องติ๊ก/ค้นหา/กดชื่อเปิดหน้า detail ที่มีแท็บ, Launch มีแผง Summary, Connect มี 4 แท็บ
- Laptop › Terminal: รัน `terraform` (โค้ดจริงของ repo นี้ → 41 resources), `ansible-inventory`, `ansible-playbook site.yml`, `aws configure`, `ssh`, `ssh-keygen` กับ AWS จำลอง; Files & editor แก้ไฟล์ .tf ได้ (playbook .yml รันจากชุดที่ฝังตอน build); เมนูบัญชี: ปกติ / Free plan / suspended
- Deployment lab (Browser): GitHub (`git init/add/commit/remote/push/pull/tag` ใน `repo-backend`/`repo-frontend`/`repo-manifests`) → Jenkins (หนึ่ง job ต่อหนึ่ง repo: pharmacy-backend / pharmacy-frontend, setup wizard, sign in, New Item, Credentials, first-build quirk, Build with Parameters, Console) → SonarQube (เปลี่ยนรหัส, สร้าง token) → ECR → ArgoCD (`kubectl apply -f apps.yaml`, Sync) → ALB. เปิด URL จาก `terraform output` ตามเครือข่ายจำลอง (SG/route/service) → หน้า Jenkins จำลอง (login ด้วย initial password, New Item, Credentials, Build with Parameters, Stage View, Console Output) รัน pipeline ตาม `repo-backend/Jenkinsfile`/`repo-frontend/Jenkinsfile` กับสถานะ AWS จำลอง; `git tag`/`git push` ใน `repo-backend`/`repo-frontend`
- ECR/IAM/EC2: จำลอง docker push/pull เทียบสิทธิ์จริงของ policy (Jenkins=PowerUser push ได้, k8s=ReadOnly push ไม่ได้, token 12 ชม.), IAM user + access key (aws configure), role/policy, Elastic IP, เปลี่ยน instance type, Modify IAM role
- เปิด: `xdg-open tools/console-lab/index.html`
- เช็ก logic: `node tools/console-lab/test.js`
- ส่วนที่ผูกกับ lab นี้: `checks()` (รายการตรวจ), `buildLab()` (ตัวอย่างสำเร็จรูป) และ `RULES` ใน `index.html`
- กฎที่ยังไม่ยืนยันกับเอกสาร AWS มีป้าย "ไม่ยืนยัน" ในแท็บ "กฎที่จำลอง" ตรวจแล้วค่อยเปลี่ยนเลข 0 เป็น 1 ใน `RULES`
- ถ้าจะเพิ่ม lab อื่น ให้แยก `checks()`/`buildLab()` เป็นไฟล์ scenario แล้วค่อยพิจารณาแยก repo
- แท็บ Lab › Jenkins (`src/ui-jenkins.js`): อธิบาย Jenkinsfile / Dockerfile / deployment.yaml / docker-compose ทีละช่วง อ่านไฟล์จริงจาก `LABFILES` (แก้ไฟล์ใน repo-* แล้ว build ใหม่ ต้องปรับ regex ช่วงใน `JKX_SEC` ให้ตรง)
- แท็บ Lab › Ansible (`src/ui-ansible.js`): โค้ด playbook ทีละ play/task + ไฟล์ vm-* + diagram เครื่องทั้ง 9 + แอนิเมชัน `ansible-playbook site.yml` ใช้ `ANSIBLE_PLAN` ที่ build ฝังไว้ (hosts แปลงผ่าน `anHosts`, รายชื่อเครื่องอยู่ใน `AN_MACH`)


## ระบบแบบ managed (EKS + RDS + SSM)
- แถบ **EKS / RDS / SSM** บนสุด: หน้าตาแบบ AWS console ใช้ API เดียวกับ Terraform · ตัวอย่างใน dropdown มีทั้ง pharmacy และ cafe
- Lab › **เทียบ VM กับ Managed**: ตารางเทียบ, แผนภาพการเชื่อมต่อทั้งระบบ, แอนิเมชัน, โค้ดเทียบกัน (ดึงจากไฟล์จริง) และปุ่มโหลดตัวอย่าง 4 แบบ
- เทอร์มินัล: `cd terraform-managed` แล้ว `terraform apply` ได้ (57 resource) · `aws eks update-kubeconfig`, `kubectl get nodes`, `aws ssm start-session`, `aws rds describe-db-instances`
- ข้อจำกัด: จำลองกติกาหลักเท่าที่รู้จากเอกสาร AWS (role/trust, subnet ≥ 2 AZ, node ต้องออกเน็ตได้, DB subnet group ≥ 2 AZ ฯลฯ) ไม่ครบทุกกรณี และยังไม่เคยเทียบกับ AWS จริง

## เครดิตโลโก้/ไอคอน
- ไอคอนบริการ AWS และโลโก้ `aws`: [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) (ใช้ไฟล์ PNG 64px จาก [awslabs/aws-icons-for-plantuml](https://github.com/awslabs/aws-icons-for-plantuml)) ฝังใน `data/icons/` · ใช้เพื่อแสดงแผนภาพเท่านั้น ไม่ได้บ่งว่า AWS รับรองตัวจำลองนี้
- โลโก้เครื่องมือ (GitHub, Jenkins, SonarQube, Argo, Terraform, Ansible, Docker, Kubernetes ฯลฯ): [Simple Icons](https://simpleicons.org/) (CC0) ฝังใน `data/brands/` · เครื่องหมายการค้าเป็นของเจ้าของแต่ละราย
