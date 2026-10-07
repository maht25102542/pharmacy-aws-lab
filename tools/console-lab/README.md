# console-lab

คอนโซลจำลอง (ไฟล์เดียว เปิดในเบราว์เซอร์ได้เลย build ด้วย `node build.js`) ไว้ฝึกกดสร้าง VPC, subnet, SG, EC2, ALB, IAM, ECR
แล้วเทียบกับโค้ด Terraform ใน `terraform/` ของ repo นี้ ไม่เรียก AWS จริง

- โครงเมนู: เมนูซ้ายและชื่อกลุ่มเรียงตาม console จริง (รายการที่ยังไม่จำลองเป็นสีจาง), ช่องค้นหาด้านบน, เลือก region, ตารางมีช่องติ๊ก/ค้นหา/กดชื่อเปิดหน้า detail ที่มีแท็บ, Launch มีแผง Summary, Connect มี 4 แท็บ
- Laptop › Terminal: รัน `terraform` (โค้ดจริงของ repo นี้ → 41 resources), `ansible-inventory`, `ansible-playbook site.yml`, `aws configure`, `ssh`, `ssh-keygen` กับ AWS จำลอง; Files & editor แก้ไฟล์ .tf ได้ (playbook .yml รันจากชุดที่ฝังตอน build); เมนูบัญชี: ปกติ / Free plan / suspended
- ECR/IAM/EC2: จำลอง docker push/pull เทียบสิทธิ์จริงของ policy (Jenkins=PowerUser push ได้, k8s=ReadOnly push ไม่ได้, token 12 ชม.), IAM user + access key (aws configure), role/policy, Elastic IP, เปลี่ยน instance type, Modify IAM role
- เปิด: `xdg-open tools/console-lab/index.html`
- เช็ก logic: `node tools/console-lab/test.js`
- ส่วนที่ผูกกับ lab นี้: `checks()` (รายการตรวจ), `buildLab()` (ตัวอย่างสำเร็จรูป) และ `RULES` ใน `index.html`
- กฎที่ยังไม่ยืนยันกับเอกสาร AWS มีป้าย "ไม่ยืนยัน" ในแท็บ "กฎที่จำลอง" ตรวจแล้วค่อยเปลี่ยนเลข 0 เป็น 1 ใน `RULES`
- ถ้าจะเพิ่ม lab อื่น ให้แยก `checks()`/`buildLab()` เป็นไฟล์ scenario แล้วค่อยพิจารณาแยก repo
