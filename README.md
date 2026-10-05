# pharmacy-aws-lab

จำลอง flow การปล่อยระบบแบบที่ใช้งานจริง บน AWS ด้วย VM ทั้งหมด
Terraform สร้างเครื่อง, Ansible ตั้งค่าเครื่อง, Jenkins กับ ArgoCD ปล่อยแอป

> **สถานะ:** ไฟล์ชุดนี้ผ่านการตรวจ syntax แล้ว (Terraform, playbook, YAML, สคริปต์ และแอป backend)
> แต่**ยังไม่เคยรันบน AWS จริง** เพราะบัญชียังถูกระงับ รอบแรกที่รันอาจเจอจุดที่ต้องแก้
> ให้ถือว่าเป็นส่วนหนึ่งของการเรียน และเก็บ error มาไล่ดูทีละจุด

## แผนที่: โฟลเดอร์ไหน อยู่ที่ไหนในระบบจริง

| โฟลเดอร์ | ในระบบจริงอยู่ที่ | ใครเป็นคนเอาไปวาง |
|---|---|---|
| `terraform/` | เครื่องของคุณ (ระบบจริงเก็บใน Git และรันผ่าน CI) | รันเอง |
| `ansible/` | เครื่องของคุณ | รันเอง |
| `vm-jenkins/` | VM `pharmacy-jenkins` ที่ `/opt/jenkins/` | `ansible/jenkins.yml` |
| `vm-sonarqube/` | VM `pharmacy-sonarqube` ที่ `/opt/sonarqube/` | `ansible/sonarqube.yml` |
| `vm-k8s/` | VM `pharmacy-k8s-1` (หลาย path ดูใน `WHERE.md`) | `ansible/k8s.yml` |
| `vm-db/` | VM `pharmacy-db-1`, `-2`, `-3` ที่ `/etc/mysql/mariadb.conf.d/` | `ansible/db.yml` |
| `repo-app/` | GitHub repo `pharmacy-app` | คุณ `git push` |
| `repo-manifests/` | GitHub repo `pharmacy-manifests` | คุณ `git push` ครั้งแรก จากนั้น Jenkins แก้ให้ |

ทุกโฟลเดอร์ `vm-*` และ `repo-*` มีไฟล์ `WHERE.md` บอก path จริงของแต่ละไฟล์
และบรรทัดแรกของไฟล์ตั้งค่าทุกไฟล์มีหมายเหตุ "ของจริงอยู่ที่"

## เครื่องทั้งหมด (9 เครื่องในขนาดเต็ม)

| VM | จำนวน | ทำหน้าที่ | เทียบกับที่ INET |
|---|---|---|---|
| `pharmacy-jenkins` | 1 | รัน pipeline | Jenkins 1 เครื่อง |
| `pharmacy-sonarqube` | 1 | ตรวจคุณภาพโค้ด | SonarQube |
| `pharmacy-k8s-1` | 1 | Kubernetes server ของ prd, ArgoCD, รัน FE และ BE | เครื่อง ArgoCD และเครื่อง FE/BE |
| `pharmacy-k8s-2`, `-3` | 2 | Kubernetes agent ของ prd, รัน FE และ BE | เครื่อง FE/BE |
| `pharmacy-dev` | 1 | k3s เครื่องเดียว รัน FE และ BE ของ dev (ArgoCD ที่ k8s-1 คุมให้) | เครื่อง dev |
| `pharmacy-db-1`, `-2`, `-3` | 3 | MariaDB Galera cluster | DB 3 เครื่อง |

นอกจาก VM ยังมี load balancer (ALB) 1 ตัว และที่เก็บ image (ECR) 2 repo

**ต่างจาก INET ตรงไหน:** ที่นั่นแยก FE 3 เครื่อง และ BE 3 เครื่อง ที่นี่ใช้ 3 เครื่องร่วมกันเพื่อประหยัด
โดย Kubernetes กระจาย FE และ BE อย่างละ 3 ตัวไปบนทั้ง 3 เครื่อง (prd) ส่วน dev แยกไปรันบน `pharmacy-dev` อีก cluster หนึ่ง
ฐานข้อมูลใช้ Galera ชุดเดียวกัน แยกกันด้วย database `pharmacy_dev` / `pharmacy_prd`

## Flow ทั้งหมด

```
คุณ ──git push + ติด tag──▶ GitHub: pharmacy-app
                                  │
คุณ ──กด build ใน Jenkins──────────┤
                                  ▼
                  VM pharmacy-jenkins
                    1. ดึงโค้ดตาม tag
                    2. ส่งให้ VM pharmacy-sonarqube ตรวจ
                    3. docker build, push ขึ้น ECR
                    4. แก้บรรทัด image ใน GitHub: pharmacy-manifests
                    5. (ถ้าติ๊ก AUTO_SYNC) สั่ง ArgoCD sync
                                  │
                                  ▼
                  ArgoCD (ใน VM pharmacy-k8s-1)
                    อ่าน manifest แล้วปรับทั้ง 2 cluster (prd: k8s-*, dev: pharmacy-dev)
                                  │
                                  ▼
ผู้ใช้ ──▶ ALB :80 ──▶ frontend x3 ──▶ backend x3 ──▶ VM pharmacy-db-1,2,3
```

## สิ่งที่ต้องมีก่อนเริ่ม

- บัญชี AWS ที่ใช้งานได้ และรัน `aws configure` แล้ว
- Terraform
- Ansible พร้อมไลบรารี AWS: `pip install ansible boto3 botocore`
- กุญแจ SSH ที่ `~/.ssh/id_ed25519` (สร้างด้วย `ssh-keygen -t ed25519`)
- บัญชี GitHub และ Personal Access Token ที่มีสิทธิ์เขียน repo

## ขั้นตอน

### 1. สร้าง repo บน GitHub

สร้าง repo เปล่า 2 อัน: `pharmacy-app` และ `pharmacy-manifests`
(ตั้ง `pharmacy-manifests` เป็น public จะง่ายสุด เพราะ ArgoCD อ่านได้เลย ในนั้นไม่มีรหัสผ่าน)

แก้ `YOUR_GITHUB_USER` ในไฟล์ `repo-manifests/argocd-apps/apps.yaml` แล้ว push ทั้งสองโฟลเดอร์:

```bash
cd repo-manifests
git init -b main && git add . && git commit -m "initial manifests"
git remote add origin https://github.com/YOUR_GITHUB_USER/pharmacy-manifests.git
git push -u origin main

cd ../repo-app
git init -b main && git add . && git commit -m "initial app"
git remote add origin https://github.com/YOUR_GITHUB_USER/pharmacy-app.git
git push -u origin main
git tag v1.0.0 && git push origin v1.0.0
```

### 2. สร้างเครื่องด้วย Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars    # แล้วใส่ IP ของคุณ
terraform init
terraform plan
terraform apply
```

จดค่าจาก output ไว้: `jenkins_url`, `sonarqube_url`, `argocd_url`, `site_prd`, `site_dev`

### 3. ตั้งค่าเครื่องด้วย Ansible

แก้ `ansible/group_vars/all/main.yml` (ชื่อ GitHub และรหัสผ่าน) แล้วรอประมาณ 1 นาทีให้เครื่องบูตเสร็จ

```bash
cd ../ansible
ansible-inventory --graph      # ต้องเห็นเครื่องครบทุกกลุ่ม
ansible-playbook site.yml
```

### 4. ตั้งค่าครั้งแรกในหน้าเว็บ (ทำครั้งเดียว)

**SonarQube** เปิด `sonarqube_url` เข้าด้วย `admin` / `admin` แล้วเปลี่ยนรหัสผ่าน
ไปที่ My Account > Security สร้าง token เก็บไว้

**ArgoCD** SSH เข้า `pharmacy-k8s-1` แล้วดูรหัสผ่านเริ่มต้นและลงทะเบียนแอป:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo
kubectl apply -f https://raw.githubusercontent.com/YOUR_GITHUB_USER/pharmacy-manifests/main/argocd-apps/apps.yaml
```

เปิด `argocd_url` (เบราว์เซอร์จะเตือนเรื่องใบรับรอง เพราะเป็นแบบออกเอง) เข้าด้วย `admin`
จะเห็น 4 แอป (dev 2 แอปชี้ไป cluster `pharmacy-dev` ที่ Ansible ลงทะเบียนให้แล้ว) สถานะยังไม่ปกติ เพราะยังไม่มี image จนกว่าจะปล่อยครั้งแรก

**Jenkins** เปิด `jenkins_url` ดูรหัสผ่านเริ่มต้นด้วยคำสั่งนี้บน VM `pharmacy-jenkins`:

```bash
sudo docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

ปลั๊กอินถูกติดตั้งมาใน image แล้ว จากนั้นไปที่ Manage Jenkins > Credentials เพิ่ม 3 รายการ:

| ID | ชนิด | ค่า |
|---|---|---|
| `github-token` | Username with password | ชื่อ GitHub และ Personal Access Token |
| `sonar-token` | Secret text | token จาก SonarQube |
| `argocd-admin` | Username with password | `admin` และรหัสผ่าน ArgoCD |

สร้าง job: New Item > Pipeline > เลือก "Pipeline script from SCM" > Git >
ใส่ URL ของ `pharmacy-app` เลือก credential `github-token` และ branch `*/main`

กด Build ครั้งแรกหนึ่งครั้งเพื่อให้ Jenkins อ่านรายการช่องติ๊กจาก Jenkinsfile (รอบนี้จะล้มเหลว ซึ่งปกติ)
รอบถัดไปปุ่มจะเปลี่ยนเป็น Build with Parameters และมีรายการ tag ให้เลือก

### 5. ปล่อยครั้งแรก

ปล่อย **backend ก่อน** แล้วค่อย frontend (frontend ต้องเห็น service ของ backend ถึงจะเริ่มทำงานได้)

1. `TARGET_ENV=dev`, `SERVICE=backend`, `VERSION=v1.0.0`, `ACTION=build-and-deploy`
2. `TARGET_ENV=dev`, `SERVICE=frontend`, ค่าที่เหลือเหมือนกัน
3. เปิด `site_dev` ดูผล
4. ปล่อย prd ด้วย `ACTION=deploy-only` เพื่อใช้ image ตัวเดียวกับที่ทดสอบใน dev แล้ว
   ลองทั้งแบบติ๊กและไม่ติ๊ก `AUTO_SYNC`
5. เปิด `site_prd` แล้วกดรีเฟรชหลายครั้ง ช่อง "ตอบโดย" จะสลับไปมาระหว่าง backend 3 ตัว

### 6. ลบทุกอย่างเมื่อเลิกใช้

```bash
cd terraform
terraform destroy
```

## ค่าใช้จ่าย

ขนาดเต็มคือ 9 เครื่องและ load balancer 1 ตัว ซึ่งคิดเงินรายชั่วโมงตลอดเวลาที่เปิด
ผมประมาณคร่าว ๆ ว่าราว 10 ดอลลาร์ต่อวันถ้าเปิดทิ้งไว้ (เช็กราคาปัจจุบันของ region ที่ใช้ก่อน)

- ลองครั้งแรกด้วยขนาดประหยัด: ตั้ง `k8s_node_count = 1` และ `db_count = 1` ใน `terraform.tfvars`
- เลิกเล่นแต่ละครั้งให้ `terraform destroy` เสมอ สร้างใหม่ได้ด้วย 2 คำสั่ง
- ตั้งการแจ้งเตือนงบประมาณใน AWS Budgets ไว้ก่อนเริ่ม
- บัญชี Free plan อาจจำกัดขนาดเครื่องที่ใช้ได้ ถ้า apply แล้วติด ให้ลดขนาดใน `instance_types`

## จุดที่ตัดให้ง่ายกว่าระบบจริง

| ในชุดนี้ | ระบบจริงควรเป็น |
|---|---|
| ทุกเครื่องมี public IP | เครื่องอยู่ใน subnet ส่วนตัว เข้าผ่าน bastion หรือ VPN |
| HTTP | HTTPS พร้อมใบรับรอง |
| รหัสผ่านเป็นข้อความใน `group_vars` | ansible-vault หรือ AWS Secrets Manager |
| state ของ Terraform อยู่ในเครื่อง | เก็บบน S3 ให้ทีมใช้ร่วมกัน |
| Jenkins รันเป็น root และถือ docker.sock | แยก agent สำหรับ build และจำกัดสิทธิ์ |
| backend ต่อ Galera ผ่าน Service ที่สุ่มเครื่อง ไม่ตรวจสุขภาพ | มี HAProxy หรือ ProxySQL หน้า Galera |
| dev ใช้ DB Galera ชุดเดียวกับ prd (แยกแค่ชื่อ database) และ SG เดียวกับ k8s | DB และเครือข่ายแยกชุด |
| k3s และสคริปต์ต่ออายุรหัส ECR | EKS (ดึงจาก ECR ได้เอง) |
