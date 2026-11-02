// ---- หน้า Jenkins: ไฟล์ที่ใช้ปล่อยจริง (Jenkinsfile / Dockerfile / deployment.yaml / docker-compose) อธิบายทีละช่วง
// แต่ละช่วงบอก 3 อย่าง: ทำอะไร · ถ้าไม่มีจะเป็นอย่างไร · ค่าแต่ละตัวมาจากไหน (ป้ายสี)
var JKX = { spd: "1", file: "jf", svc: "backend", env: "prd", view: "sec", theme: "card" };

// ป้ายที่มาของค่า: [regex ที่ใช้กับบรรทัดโค้ด, ข้อความป้าย, สี, คำอธิบายตอนชี้]
var JKX_SRC = {
  hcl: [], json: [],
  jf: [
    [/env\.ECR_REGISTRY|\$ECR_REGISTRY|\$ARGOCD_SERVER|\$MANIFESTS_REPO|SONAR_HOST_URL/, "/opt/jenkins/.env", "#7b3fe4", "Ansible (jenkins.yml) เขียนไว้ในเครื่อง Jenkins"],
    [/params\.|\$VERSION|\$TARGET_ENV|\$CHANGE_NOTE/, "ช่องตอนกด Build", "#0972d3", "คนเลือกในหน้า Build with Parameters"],
    [/credentialsId: '[\w-]+'/, "Credential ใน Jenkins", "#c0392b", "สร้างเองในหน้า Manage Jenkins › Credentials (ไม่อยู่ใน Git)"],
    [/\$GIT_USER|\$GIT_TOKEN|\$SONAR_TOKEN|\$ARGO_USER|\$ARGO_PASS/, "จาก credential", "#c0392b", "มีค่าเฉพาะในบล็อก withCredentials และถูกปิดบังใน log"],
    [/\$WORKSPACE|\$BUILD_NUMBER|STAGE_NAME/, "Jenkins ใส่ให้", "#546e7a", "ตัวแปรที่ Jenkins สร้างเองทุก build"],
    [/\$IMAGE|\$SERVICE|\$APP\b|\$\{env\.APP\}/, "environment {}", "#1d8102", "คำนวณไว้ที่บล็อก environment ด้านบน"],
    [/aws ecr/, "IAM role ของ VM", "#a85a00", "ไม่มี access key: สิทธิ์มาจาก instance profile (Terraform สร้าง)"]
  ],
  df: [
    [/^FROM /, "Docker Hub", "#546e7a", "base image ล็อกเวอร์ชันตายตัว ไม่ใช้ latest"],
    [/^ARG /, "Jenkins ส่งมา", "#0972d3", "docker build --build-arg APP_VERSION=$VERSION (stage Build image)"],
    [/^COPY (app\.py|index\.html|nginx\.conf)/, "ไฟล์ใน repo", "#1d8102", "ไฟล์ที่ Jenkins checkout มาตาม tag"],
    [/^EXPOSE /, "ต้องตรง deployment.yaml", "#0972d3", "containerPort ใน deployment.yaml ต้องเป็นเลขเดียวกัน"],
    [/^USER /, "ต้องตรง deployment.yaml", "#0972d3", "runAsUser ใน deployment.yaml ต้องเป็นเลขเดียวกัน"]
  ],
  yaml: [
    [/^\s+image:/, "Jenkins เขียนทับ", "#d33833", "stage Update manifest ใช้ sed แก้บรรทัดนี้ทุกครั้งที่ปล่อย"],
    [/name: (db-credentials|app-secrets)/, "Secret จาก Ansible", "#c0392b", "สร้างตอนติดตั้ง cluster (Ansible › cluster-base.yaml.j2) ไม่อยู่ใน Git"],
    [/value: http:\/\/backend/, "Service backend", "#1d6fb8", "ชื่อ Service ของ backend ใน namespace เดียวกัน (ส่วน Service ของ deployment.yaml ฝั่ง backend)"],
    [/argocd\.argoproj\.io\/hook/, "ArgoCD hook", "#ef7b4d", "ArgoCD รัน Job นี้ก่อน sync (PreSync) ทุกครั้งที่ปล่อย"],
    [/ecr-pull/, "ecr-refresh timer", "#a85a00", "systemd timer บนเครื่อง k3s ต่ออายุรหัสผ่าน ECR ทุก 12 ชม."],
    [/^\s+namespace:/, "ArgoCD", "#ef7b4d", "destination.namespace ใน apps.yaml ต้องตรงกัน"],
    [/nodePort:/, "Target group ของ ALB", "#1d6fb8", "Terraform ชี้ target group มาที่พอร์ตนี้"],
    [/^\s+replicas:/, "แก้ใน Git", "#1d8102", "คุณแก้เลขนี้ใน Git แล้ว ArgoCD ปรับ cluster ให้ตรง"],
    [/path: \/(api|healthz)/, "endpoint ในแอป", "#0972d3", "app.py / nginx.conf ต้องมี path นี้จริง ไม่งั้น pod ไม่ผ่าน probe"],
    [/runAsUser|containerPort/, "ต้องตรง Dockerfile", "#0972d3", "USER / EXPOSE ใน Dockerfile ต้องเป็นเลขเดียวกัน"]
  ],
  dc: [
    [/\$\{DB_/, "ตัวแปรเครื่องคุณ", "#546e7a", "อ่านจาก environment ของเครื่องนักพัฒนา ถ้าไม่มีใช้ค่าหลัง :-"],
    [/^\s+image:/, "Docker Hub", "#546e7a", "ล็อกเวอร์ชัน"],
    [/BACKEND_URL/, "ชี้ไป backend", "#1d6fb8", "ที่อยู่ backend ที่หน้าเว็บส่งต่อ /api ไปหา"]
  ]
};

// ช่วงของแต่ละไฟล์: [regex ของบรรทัดเริ่มช่วง, ชื่อช่วง, ทำอะไร, ถ้าไม่มี/ถ้าทำแบบเล่นๆ จะเป็นอย่างไร]
var JKX_SEC = {
  jf: [
    [/^\/\/ ของจริง/, "ไฟล์นี้คืออะไร", "คอมเมนต์หัวไฟล์: บอกว่าไฟล์อยู่ที่ไหน ใครรัน ต้องมีตัวแปรและ credential อะไรรออยู่", "คนใหม่เปิดมาเจอก็รู้ว่าต้องเตรียมอะไรก่อน build ครั้งแรก"],
    [/^pipeline \{/, "โครง pipeline", "agent any = รันบนเครื่อง Jenkins นี้เลย ใน Jenkinsfile ที่เหลือเรียงเป็น stage ต่อกัน", ""],
    [/^  options \{/, "options: กันระบบพัง", "ไม่ให้รันซ้อน · มีเพดานเวลา · เก็บประวัติแค่ 30 ครั้ง", "แบบเล่นๆ: build ค้างกินเครื่องทั้งคืน กดซ้ำแล้วสองงานเขียน manifest ชนกัน ดิสก์เต็มด้วยประวัติเก่า"],
    [/^  parameters \{/, "parameters: ช่องที่คนกรอกตอน Build", "ทุกอย่างที่เปลี่ยนต่อการปล่อยหนึ่งครั้งมาจากช่องพวกนี้ ไม่ต้องแก้ไฟล์", "แบบเล่นๆ: ฝังค่า dev/prd ไว้ในโค้ด ต้องแก้ไฟล์ทุกครั้งที่เปลี่ยนปลายทาง"],
    [/^  environment \{/, "environment: ตัวแปรที่คำนวณครั้งเดียว", "IMAGE ประกอบจาก ECR_REGISTRY + ชื่อ + VERSION ครั้งเดียว ทุก stage ใช้ร่วมกัน", "แบบเล่นๆ: พิมพ์ชื่อ image ซ้ำทุก stage แล้วสะกดไม่ตรงกันสักที่"],
    [/stage\('Validate'\)/, "Validate: ตรวจก่อนทำอะไร", "VERSION ต้องไม่ว่าง · prd รับเฉพาะ tag แบบ v1.2.3", "ล้มเร็วที่สุดโดยยังไม่แตะระบบอะไร"],
    [/stage\('Confirm production'\)/, "Confirm production: รอคนกดยืนยัน", "เฉพาะ prd: pipeline หยุดรอให้คนกดก่อนแตะ production", "แบบเล่นๆ: เลือก prd ผิดช่องแล้วปล่อยขึ้นจริงทันที"],
    [/stage\('Checkout version'\)/, "Checkout version: ดึงโค้ดตาม tag", "ดึงโค้ดของ tag นั้นพอดี ไม่ใช่ main ล่าสุด", "แบบเล่นๆ: build จาก main แล้วไม่รู้ว่า image นี้คือโค้ดของเวอร์ชันไหน"],
    [/stage\('Test'\)/, "Test: รันเทสต์ก่อนสร้าง image", "รันในกล่อง docker ชั่วคราว (--rm) ไม่ต้องลง Python/Node บนเครื่อง Jenkins · backend: pytest · frontend: npm ci → lint → typecheck → vitest", "เทสต์ไม่ผ่านก็หยุดทันที ไม่เสียเวลา build"],
    [/stage\('SonarQube scan'\)/, "SonarQube scan: ตรวจคุณภาพโค้ด", "ส่งโค้ดให้ SonarQube วิเคราะห์ แล้วรอผล Quality gate", "ไม่ผ่านเกณฑ์ = หยุด (qualitygate.wait=true) ไม่งั้นแค่ส่งไปดูเฉยๆ ไม่มีผลต่อการปล่อย"],
    [/stage\('Build image'\)/, "Build image: สร้าง image ตาม Dockerfile", "--pull เอา base image ล่าสุดทุกครั้ง · tag = VERSION ไม่ใช้ latest", "แบบเล่นๆ: tag latest ทุกครั้ง ย้อนเวอร์ชันไม่ได้เพราะไม่รู้ว่าตัวเก่าคือตัวไหน"],
    [/stage\('Scan image'\)/, "Scan image: สแกนช่องโหว่ก่อน push", "Trivy: เจอ HIGH/CRITICAL ที่มีตัวแก้แล้ว = ล้มเหลว", "ล้มเร็ว: ตรวจก่อน push จึงไม่มี image ที่มีช่องโหว่ไปอยู่ใน ECR"],
    [/stage\('Push image'\)/, "Push image: ส่งขึ้น ECR", "ขอรหัสผ่านชั่วคราวผ่าน IAM role ของเครื่อง แล้ว push", "แบบเล่นๆ: ฝัง AWS access key ไว้ใน Jenkins ถ้ารั่วคือรั่วถาวร"],
    [/stage\('Check image exists'\)/, "Check image exists: deploy-only", "ใช้ตอน promote dev→prd หรือย้อนเวอร์ชัน: เช็กว่า image มีใน ECR แล้ว ไม่ build ใหม่", "ของที่ขึ้น prd คือ image ตัวเดียวกับที่ทดสอบใน dev เป๊ะ"],
    [/stage\('Update manifest'\)/, "Update manifest: บอก Git ว่าจะรันเวอร์ชันไหน", "แก้บรรทัด image: ใน repo manifests แล้ว push · ถ้าชนกันให้ pull --rebase แล้วลองใหม่ (สูงสุด 3 ครั้ง)", "นี่คือ GitOps: การปล่อย = commit หนึ่งอัน ย้อนเวอร์ชัน = revert commit"],
    [/stage\('Sync ArgoCD'\)/, "Sync ArgoCD: สั่งให้ cluster ตามทัน", "เฉพาะติ๊ก AUTO_SYNC: สั่ง sync แล้วรอจน health ผ่าน", "ไม่ติ๊ก = เข้าไปกด Sync เองใน ArgoCD (prd ควรเป็นแบบนี้)"],
    [/^  post \{/, "post: เก็บกวาด + รายงาน", "always ลบโฟลเดอร์ manifests (มี token ใน URL) และ image ในเครื่อง · success/failure บอกผล", "แบบเล่นๆ: token ค้างอยู่ใน workspace, ดิสก์เต็มด้วย image เก่า"]
  ],
  "df-backend": [
    [/^# ของจริง/, "หัวไฟล์", "บอกว่าไฟล์อยู่ที่ไหน", ""],
    [/^# ── ด่านที่ 1/, "ด่านที่ 1 (build): คอมไพล์ mysqlclient", "ลง compiler + header ของ MariaDB แล้วแปลงแพ็กเกจเป็นไฟล์ wheel ด่านนี้ไม่ถูกส่งขึ้น ECR", "ถ้าใส่ทุกอย่างด่านเดียว image จะพก compiler/header ติดไปด้วย ใหญ่และช่องโหว่เยอะ"],
    [/^# ── ด่านที่ 2/, "ด่านที่ 2 (runtime): image ที่ส่งขึ้น ECR จริง", "เริ่มจาก base ใหม่ที่สะอาด ไม่มีเครื่องมือ build", "เล็กกว่า ช่องโหว่น้อยกว่า pull เร็วกว่า"],
    [/^# PYTHONUNBUFFERED/, "ENV: ตัวแปรของ container", "log ออก stdout ทันที · ไม่เขียนไฟล์ .pyc (รองรับ filesystem อ่านอย่างเดียว) · APP_VERSION มาจากที่ Jenkins ส่งให้", ""],
    [/^# ไลบรารี MariaDB/, "ไลบรารี client + ผู้ใช้ธรรมดา (ไม่ใช่ root)", "ลงเฉพาะ libmariadb3 (ตัวที่ mysqlclient เรียกตอนรัน) · สร้าง user uid 10001 ไม่มี shell", "แอปโดนเจาะแล้วผู้โจมตีก็ไม่ได้สิทธิ์ root ใน container"],
    [/^WORKDIR \/app/, "ติดตั้งแพ็กเกจ + ใส่โค้ด", "ติดตั้งจาก wheel (ไม่ต่ออินเทอร์เน็ต) แล้วลบทิ้ง · COPY โค้ดทีหลังสุด", "ลำดับนี้ทำให้ cache ใช้ได้: แก้โค้ดไม่ต้องติดตั้งแพ็กเกจใหม่"],
    [/^# รวมไฟล์ static/, "collectstatic: เตรียมไฟล์ static ตอน build", "รวมไฟล์ CSS/JS ของหน้า admin ไว้ใน image (WhiteNoise เสิร์ฟจากตรงนี้)", "ตอนรัน filesystem อ่านอย่างเดียวอยู่ เขียนไฟล์เพิ่มไม่ได้ จึงต้องทำตอน build"],
    [/^USER 10001/, "สลับไปเป็นผู้ใช้ธรรมดาก่อนรัน", "ทุกคำสั่งหลังบรรทัดนี้ (รวมถึงตอนแอปรัน) ใช้ uid 10001", "ลืมบรรทัดนี้ = รันเป็น root ทั้งที่สร้าง user ไว้แล้ว"],
    [/^# ให้ docker รู้สถานะ/, "HEALTHCHECK: ให้ docker รู้สถานะ", "เรียก /api/health ทุก 30 วินาที (ใน Kubernetes ใช้ probe ของ Deployment แทน)", ""],
    [/^# --worker-tmp-dir/, "CMD: คำสั่งรันแอป", "gunicorn (ไม่ใช่ manage.py runserver) · 2 worker x 2 thread · graceful-timeout รอคำขอค้างเสร็จก่อนปิด", "runserver เป็นเซิร์ฟเวอร์สำหรับ dev ไม่ใช่สำหรับรับ traffic จริง"]
  ],
  "df-frontend": [
    [/^# ของจริง/, "หัวไฟล์", "บอกว่าไฟล์อยู่ที่ไหน", ""],
    [/^# ── ด่านที่ 1/, "ด่านที่ 1 (deps): ติดตั้งแพ็กเกจ", "COPY เฉพาะ package.json + package-lock.json ก่อน แล้ว npm ci (ติดตั้งตาม lockfile เป๊ะ)", "แก้โค้ดแล้ว layer นี้ใช้ cache เดิม ไม่ต้องโหลดแพ็กเกจใหม่ทุกครั้ง"],
    [/^# ── ด่านที่ 2/, "ด่านที่ 2 (build): next build", "เอา node_modules + โค้ดมา build เป็นโฟลเดอร์ standalone ด่านนี้ไม่ถูกส่งขึ้น ECR", "ไม่งั้น image จะพก node_modules ทั้งก้อนกับซอร์สโค้ดไปด้วย"],
    [/^# ── ด่านที่ 3/, "ด่านที่ 3 (runtime): image ที่ส่งขึ้น ECR จริง", "base ใหม่ที่สะอาด + label บอกเวอร์ชัน", "เล็กกว่า ช่องโหว่น้อยกว่า pull เร็วกว่า"],
    [/^# NODE_ENV=production/, "ENV: ตัวแปรของ container", "production mode · รับคำขอจากนอก container (HOSTNAME 0.0.0.0) · APP_VERSION แสดงท้ายหน้าเว็บ · BACKEND_URL ตั้งที่ deployment.yaml", ""],
    [/^# ผู้ใช้ธรรมดา/, "สร้างผู้ใช้ธรรมดา (ไม่ใช่ root)", "สร้าง user uid 10001 ไม่มี shell", "แอปโดนเจาะแล้วผู้โจมตีก็ไม่ได้สิทธิ์ root ใน container"],
    [/^COPY --from=build --chown/, "ใส่เฉพาะผลลัพธ์ที่ build แล้ว", "เอาแค่ standalone (server.js + ของที่ต้องใช้) กับไฟล์ static · เตรียมโฟลเดอร์ cache", "ไม่มีซอร์สโค้ด TypeScript, ไม่มี devDependencies ใน image"],
    [/^USER 10001/, "สลับไปเป็นผู้ใช้ธรรมดาก่อนรัน", "ทุกคำสั่งหลังบรรทัดนี้ใช้ uid 10001 · EXPOSE 3000", "ลืมบรรทัดนี้ = รันเป็น root"],
    [/^HEALTHCHECK/, "HEALTHCHECK", "เรียก /healthz ทุก 30 วินาที", ""],
    [/^CMD/, "CMD: คำสั่งรันแอป", "node server.js (ไม่ต้องมี npm ตอนรัน)", "ไม่รันผ่าน npm: ได้สัญญาณปิด (SIGTERM) ตรงกับแอป ปิดตัวสุภาพได้"]
  ],
  yaml: [
    [/^# (Backend|Frontend)/, "หัวไฟล์", "บอกว่าแอป ArgoCD ตัวไหนใช้ไฟล์นี้ และ Jenkins แก้เฉพาะบรรทัดไหน", ""],
    [/^apiVersion: apps/, "Deployment: จำนวน pod และวิธีอัปเดต", "RollingUpdate maxUnavailable 0 + maxSurge 1: สร้างตัวใหม่ก่อน ตัวใหม่พร้อมแล้วค่อยปิดตัวเก่า", "แบบเล่นๆ: ปิดตัวเก่าทั้งหมดก่อนแล้วค่อยเปิดตัวใหม่ ผู้ใช้เจอเว็บล่มทุกครั้งที่ปล่อย"],
    [/^      automountServiceAccountToken/, "ระดับ pod: ความปลอดภัยและการปิดตัว", "ไม่แนบ token ของ Kubernetes · เวลาปิดตัวสุภาพ 30 วิ · ห้ามรันเป็น root · seccomp จำกัด system call", "แบบเล่นๆ: pod ถือ token เรียก API ของ cluster ได้ ถ้าโดนเจาะก็ใช้ต่อได้"],
    [/topologySpreadConstraints/, "กระจาย pod ไปคนละเครื่อง", "pod จากแอปเดียวกันไม่กองบนเครื่องเดียว", "เครื่องเดียวล่ม = แอปล่มทั้งหมด ทั้งที่มี 3 replica"],
    [/^      containers:/, "container: image และพอร์ต", "image: บรรทัดเดียวที่ Jenkins แก้ · imagePullPolicy IfNotPresent เพราะ tag ไม่เปลี่ยนเนื้อ", ""],
    [/^          env:/, "ตัวแปร + รหัสผ่านฐานข้อมูล", "ค่าทั่วไปใส่ตรงนี้ รหัสผ่านดึงจาก Secret", "แบบเล่นๆ: ใส่รหัสผ่านในไฟล์นี้ แล้วมันอยู่ใน Git ถาวร"],
    [/^          securityContext:/, "container: ถอดสิทธิ์ให้เหลือน้อยที่สุด", "ขอสิทธิ์เพิ่มไม่ได้ · เขียนไฟล์ลง container ไม่ได้ · ถอด Linux capabilities ทั้งหมด", "ผู้โจมตีที่เข้ามาได้ วางไฟล์/ติดตั้งเครื่องมือเพิ่มไม่ได้"],
    [/^          startupProbe/, "probe 3 ตัว: ใครมีหน้าที่อะไร", "startup = รอแอปเริ่มเสร็จ · readiness = พร้อมรับ traffic ไหม (ไม่ผ่านแค่หยุดส่งคำขอ) · liveness = ยังมีชีวิตไหม (ไม่ผ่านต่อเนื่อง = รีสตาร์ท)", "ไม่มี readiness: pod ที่ต่อ DB ไม่ได้ก็ยังได้คำขอ · ไม่มี liveness: pod ค้างแล้วไม่มีใครรีสตาร์ท"],
    [/^          lifecycle:/, "preStop: ปิดตัวไม่ให้คำขอตกหล่น", "รอ 5 วินาทีให้ Service เลิกส่งคำขอมาก่อน แล้วค่อยปิดจริง", "ไม่มี: ช่วงปิด pod บางคำขอถูกส่งไปหา pod ที่กำลังจะตาย"],
    [/^          resources:/, "resources: จองและตั้งเพดาน", "requests = จองไว้ให้ (ใช้เลือกเครื่องที่ pod ลง) · limits = เพดาน (memory เกิน = ถูกปิด)", "ไม่ตั้ง: pod ตัวเดียวกิน memory จนเครื่องล่มทั้งเครื่อง"],
    [/^          volumeMounts:/, "พื้นที่เดียวที่เขียนไฟล์ได้", "nginx ต้องเขียนไฟล์ชั่วคราว จึงให้เขียนได้เฉพาะ /tmp (emptyDir) ที่เหลืออ่านอย่างเดียว", ""],
    [function (l, i) { return l[i] === "---" && /^kind: Service/m.test(l.slice(i, i + 8).join("\n")); }, "Service: ประตูเข้าหา pod", "รวม pod ทุกตัวที่ label ตรงกันเป็นที่อยู่เดียว · NodePort = พอร์ตที่ ALB ส่งเข้ามา (backend เป็น ClusterIP ภายในเท่านั้น)", "ถ้าไม่มี Service: ไม่มีที่อยู่คงที่ให้เรียก pod เพราะ pod เกิดดับตลอด"],
    [function (l, i) { return l[i] === "---" && /^kind: Job/m.test(l.slice(i, i + 8).join("\n")); }, "Job backend-migrate: อัปเดตตารางก่อนปล่อย", "ArgoCD PreSync hook: รัน manage.py migrate + สร้างแอดมินครั้งแรก ก่อนทุกครั้งที่ปล่อย · ล้มเหลว = ไม่ปล่อยเวอร์ชันใหม่", "ทำใน pod ทุกตัวไม่ได้: 3 replica เริ่มพร้อมกันแล้วแย่งแก้ตารางชนกัน"],
    [function (l, i) { return l[i] === "---" && /^kind: PodDisruptionBudget/m.test(l.slice(i, i + 8).join("\n")); }, "PodDisruptionBudget: กันถูกปิดพร้อมกัน", "ตอนบำรุงเครื่อง (drain) ต้องเหลือ pod อย่างน้อย 2 ตัวเสมอ", "ไม่มี: drain เครื่องเดียวอาจปิด pod ของแอปนี้พร้อมกันทั้งหมด"]
  ],
  "dc-backend": [
    [/^# ของจริง/, "ไฟล์นี้ใช้ทำอะไร", "รันบนเครื่องนักพัฒนาเท่านั้น: ได้ backend + MariaDB ในเครื่องเดียว ไม่ได้ขึ้น server", "ไม่ต้องรอ Galera ของ lab ก็ลองแก้โค้ดได้"],
    [/^x-app-env/, "ตัวแปรที่ใช้ร่วมกัน", "ประกาศชุด environment ครั้งเดียว (&app-env) แล้วให้ migrate กับ backend ใช้ซ้ำ (*app-env)", "ไม่ต้องก๊อปค่าเดียวกันสองที่ แล้วแก้ที่หนึ่งลืมอีกที่"],
    [/^  db:/, "db: MariaDB ในเครื่อง", "healthcheck บอกว่า DB พร้อมจริง · ข้อมูลเก็บใน volume", "ไม่มี healthcheck: migrate เริ่มก่อน DB พร้อมแล้วล้ม"],
    [/^  # งานครั้งเดียว/, "migrate: งานครั้งเดียวก่อนแอปเริ่ม", "สร้างตาราง + แอดมิน + ยาตัวอย่าง (ใน Kubernetes คือ Job แบบ PreSync)", "แอปเริ่มก่อนมีตาราง = ทุกคำขอ error"],
    [/^  backend:/, "backend: แอปของเรา", "build จาก Dockerfile เดียวกับที่ Jenkins ใช้ · รอ migrate เสร็จค่อยเริ่ม · ตั้งความปลอดภัยเหมือนใน Kubernetes", "รันแบบเดียวกับ production จะเจอปัญหา (เช่น เขียนไฟล์ไม่ได้) ตั้งแต่ก่อน push"]
  ],
  "dc-frontend": [
    [/^# ของจริง/, "ไฟล์นี้ใช้ทำอะไร", "รันบนเครื่องนักพัฒนาเท่านั้น: เปิดหน้าเว็บ Next.js ที่ต่อกับ backend บนเครื่องคุณ", "เห็นหน้าเว็บจริงก่อน push"],
    [/^  frontend:/, "frontend: แอปของเรา", "build จาก Dockerfile เดียวกับที่ Jenkins ใช้ · BACKEND_URL ชี้ไป backend · ตั้งความปลอดภัยเหมือนใน Kubernetes (อ่านอย่างเดียว เขียนได้เฉพาะ /tmp และ cache)", "รันแบบเดียวกับ production จะเจอปัญหา (เช่น เขียนไฟล์ไม่ได้) ตั้งแต่ก่อน push"]
  ]
};

function jkxText() {
  var f = JKX.file;
  if (f === "jf") return LABFILES["repo-" + JKX.svc + "/Jenkinsfile"] || "";
  if (f === "df") return LABFILES["repo-" + JKX.svc + "/Dockerfile"] || "";
  if (f === "yaml") return LABFILES["repo-manifests/" + JKX.env + "/" + JKX.svc + "/deployment.yaml"] || "";
  return LABFILES["repo-" + JKX.svc + "/docker-compose.yml"] || "";
}

// แบ่งไฟล์เป็นช่วงตาม regex ที่เรียงลำดับ (yaml: แบ่งตามเอกสารก่อน แล้วจึงแบ่ง Deployment ต่อ)
function jkxSplit(text, kind) {
  var secs = JKX_SEC[kind === "df" || kind === "dc" ? kind + "-" + JKX.svc : kind], lines = text.split("\n"), out = [], cur = null, si = -1, i, j;
  for (i = 0; i < lines.length; i++) {
    for (j = si + 1; j < secs.length; j++) if (secs[j][0].test ? secs[j][0].test(lines[i]) : secs[j][0](lines, i)) { si = j; cur = { sec: secs[j], lines: [], start: i }; out.push(cur); break; }
    if (!cur) { cur = { sec: [null, "หัวไฟล์", "", ""], lines: [], start: i }; out.push(cur); }
    cur.lines.push(lines[i]);
  }
  // ตัดบรรทัดว่างท้ายช่วง
  out.forEach(function (s) { while (s.lines.length && !s.lines[s.lines.length - 1].trim()) s.lines.pop(); });
  return out.filter(function (s) { return s.lines.length; });
}

// ---- ธีมสีของโค้ด: [พื้น, ตัวอักษร, คอมเมนต์, string, keyword, key (yaml/ชื่อ), ตัวแปร $X, flag --x, ตัวเลข, ค่าคงที่, เลขบรรทัด]
var JKX_THEME = {
  card: ["ตามสีการ์ด (ค่าเริ่มต้น)", "transparent", "var(--cd-fg)", "var(--cd-cm)", "var(--cd-str)", "var(--cd-kw)", "var(--cd-var)", "var(--cd-flag)", "var(--cd-num)", "var(--cd-const)", "var(--cd-ln)"],
  github: ["สว่าง (GitHub)", "#f6f8fa", "#24292f", "#6e7781", "#0a3069", "#cf222e", "#116329", "#953800", "#8250df", "#0550ae", "#8c959f"],
  dracula: ["มืด (Dracula)", "#282a36", "#f8f8f2", "#7b86b8", "#f1fa8c", "#ff79c6", "#8be9fd", "#ffb86c", "#bd93f9", "#bd93f9", "#6272a4"],
  monokai: ["Monokai", "#272822", "#f8f8f2", "#88846f", "#e6db74", "#f92672", "#a6e22e", "#fd971f", "#ae81ff", "#ae81ff", "#75715e"],
  solar: ["Solarized เข้ม", "#002b36", "#93a1a1", "#586e75", "#2aa198", "#859900", "#268bd2", "#cb4b16", "#d33682", "#6c71c4", "#586e75"]
};
var JKX_KW = {
  jf: "pipeline agent any options parameters environment stages stage steps when expression post always success failure withCredentials script echo sh choice string booleanParam gitParameter usernamePassword string input timeout disableConcurrentBuilds buildDiscarder logRotator def if else for in return",
  df: "FROM AS ARG LABEL ENV RUN COPY WORKDIR USER EXPOSE HEALTHCHECK CMD ENTRYPOINT ADD VOLUME",
  yaml: "", dc: "", an: "", json: "", hcl: "resource data variable output locals provider terraform module for_each count depends_on lifecycle"
};
var JKX_RE = /((?:^|\s)(?:\/\/|#).*)|('[^']*'|"[^"]*")|(\$\{?[A-Za-z_][\w.]*\}?)|((?:^|\s)--?[a-zA-Z][\w-]*)|(\b\d+\b)|([A-Za-z_][\w.\/-]*)/g;
// แปลงหนึ่งบรรทัดเป็น span สี (ใช้ regex เดียวแยกส่วน: คอมเมนต์ string ตัวแปร flag ตัวเลข คำ)
function jkxHi(ln, kind, T) {
  var out = [], last = 0, kws = {}, m, add = function (txt, col, extra) { if (txt) out.push(h("span", { style: (col ? "color:" + col : "") + (extra || ""), text: txt })); };
  (JKX_KW[kind] || "").split(" ").forEach(function (w) { if (w) kws[w] = 1; });
  JKX_RE.lastIndex = 0;
  while ((m = JKX_RE.exec(ln))) {
    add(ln.slice(last, m.index), T[2]);
    var t = m[0], lead = /^\s/.test(t) && (m[1] || m[4]) ? t.charAt(0) : "", body = lead ? t.slice(1) : t, nxt = ln.charAt(JKX_RE.lastIndex);
    add(lead, T[2]);
    if (m[1]) add(body, T[3], ";font-style:italic");
    else if (m[2]) add(body, kind === "json" && nxt === ":" ? T[5] : T[4]);
    else if (m[3]) add(body, T[6], ";font-weight:600");
    else if (m[4]) add(body, T[7]);
    else if (m[5]) add(body, T[8]);
    else if (/^(true|false|null|any)$/.test(body)) add(body, T[9]);
    else if (kws[body] && (kind !== "df" || m.index === ln.search(/\S/))) add(body, T[5], ";font-weight:700");
    else if ((kind === "yaml" || kind === "dc" || kind === "an") && nxt === ":") add(body, T[5]);
    else if (kind === "jf" && /^[a-z]\w*$/.test(body) && nxt === ":") add(body, T[9]);
    else if (kind === "hcl" && /^[a-z_][\w-]*$/.test(body) && /^\s*=[^=]/.test(ln.slice(JKX_RE.lastIndex))) add(body, T[5]);
    else if (kind === "hcl" && /^aws_[a-z_]+$/.test(body)) add(body, T[6], ";font-weight:600");
    else add(body, T[2]);
    last = JKX_RE.lastIndex;
  }
  add(ln.slice(last), T[2]);
  return out;
}
function jkxLine(ln, kind, num, stripe, tag, secIdx) {
  var T = JKX_THEME[JKX.theme] || JKX_THEME.github, isCm = /^\s*(\/\/|#)/.test(ln);
  var row = h("div", { style: "display:flex;white-space:pre-wrap" + (stripe ? ";border-left:4px solid " + stripe + (T[1] === "transparent" && stripe !== "transparent" ? ";background:" + hexA(stripe, 0.09) : "") : "") }, [h("span", { style: "flex:none;width:2.6em;text-align:right;padding-right:10px;user-select:none;color:" + T[10], text: num == null ? "" : String(num) })]);
  if (secIdx != null) row.setAttribute("data-s", String(secIdx));
  var body = h("span", { style: "flex:1" }, jkxHi(ln, kind, T));
  row.appendChild(body);
  if (tag) row.appendChild(h("span", { style: "flex:none;margin-left:10px;font:700 .68rem/1.7 var(--ui,system-ui);color:" + stripe + ";white-space:nowrap", text: tag }));
  if (!isCm) (JKX_SRC[kind] || []).forEach(function (r) { if (r[0].test(ln)) body.appendChild(h("span", { title: r[3], style: "display:inline-block;margin-left:8px;padding:0 6px;border-radius:9px;font:600 .68rem/1.5 var(--ui,system-ui);color:" + r[2] + ";background:" + hexA(r[2], 0.18) + ";border:1px solid " + hexA(r[2], 0.55) + ";white-space:nowrap", text: "◀ " + r[1] })); });
  return row;
}
var JKX_PAL = ["#d33833", "#1d6fb8", "#a85a00", "#1d8102", "#7b3fe4", "#00838f"];
// มุมมองไฟล์เต็ม: โค้ดต่อกันเป็นก้อนเดียว เส้นสีด้านซ้ายบอกว่าบรรทัดนี้อยู่ช่วงไหน
function jkxFull(secs, kind, text) {
  var T = JKX_THEME[JKX.theme] || JKX_THEME.github, box = h("div", { style: "font-family:var(--mono);font-size:.8rem;line-height:1.6;background:" + T[1] + ";color:" + T[2] + ";border-radius:8px;padding:10px 0;overflow-x:auto" + (T[1] === "transparent" ? ";border:1px solid var(--line)" : "") }), total = 0;
  var all = (text == null ? jkxText() : text).replace(/\n+$/, "").split("\n"), owner = [];
  secs.forEach(function (s, n) { for (var i = 0; i < s.lines.length; i++) owner[s.start + i] = { n: n, first: i === 0 }; });
  all.forEach(function (l, i) { var o = owner[i], col = o ? JKX_PAL[o.n % JKX_PAL.length] : "transparent"; box.appendChild(jkxLine(l, kind, i + 1, col, o && o.first ? (o.n + 1) + ". " + secs[o.n].sec[1] : "", o ? o.n : null)); total++; });
  return box;
}

function jkxCode(secs, kind) {
  var box = h("div", { style: "font-family:var(--mono);font-size:.8rem;line-height:1.6" }), pal = JKX_PAL;
  secs.forEach(function (s, n) {
    var col = pal[n % pal.length];
    var el = h("div", { id: "jx-" + n, "data-k": String(n), style: "border-left:5px solid " + col + ";background:" + hexA(col, 0.07) + ";border-radius:6px;margin:0 0 10px;overflow-x:auto" });
    el.appendChild(h("div", { style: "padding:7px 12px;border-bottom:1px solid " + hexA(col, 0.25) + ";font-family:var(--ui,system-ui);font-size:.88rem;line-height:1.5" }, [
      h("b", { style: "color:" + col, text: (n + 1) + ". " + s.sec[1] }),
      s.sec[2] ? h("div", { text: "ทำอะไร: " + s.sec[2] }) : null,
      s.sec[3] ? h("div", { style: "color:#555", text: (/^แบบเล่นๆ/.test(s.sec[3]) ? "เทียบกับ" : "ผลที่ได้: ") + s.sec[3].replace(/^ผลที่ได้: /, "") }) : null]));
    var T = JKX_THEME[JKX.theme] || JKX_THEME.github;
    el.appendChild(h("div", { style: "padding:8px 0;background:" + T[1] + ";color:" + T[2] + ";border-radius:0 0 6px 0" }, s.lines.map(function (l, i) { return jkxLine(l, kind, s.start + i + 1); })));
    box.appendChild(el);
  });
  return box;
}

// ---- แอนิเมชัน 1: Jenkinsfile — stage เรียงกันไป ปรับให้ล้มที่ขั้นใดก็ได้ ดูว่าอะไรถูกกันไว้
// ตัวเล่นแอนิเมชันกลาง: ▶ เล่น / ⏸ หยุดชั่วคราว (กดอีกครั้ง = เล่นต่อ) / ⏹ รีเซ็ต เหมือนแท็บ Terraform
// steps = [[รอกี่ ms, ฟังก์ชัน], ...] · ฟังก์ชันตัดขั้นที่เหลือทิ้งได้ด้วย P.steps.length = P.i
function jkxPlayer(onReset, onPlay, playText) {
  var P = { steps: [], i: 0, paused: false, busy: false, timer: null }, play = h("button", { cls: "btn pri", type: "button", text: playText || "▶ เล่น" }), pause = h("button", { cls: "btn", type: "button", text: "⏸ หยุดชั่วคราว", disabled: true }), rst = h("button", { cls: "btn", type: "button", text: "⏹ รีเซ็ต" });
  function sync() { play.disabled = P.busy; pause.disabled = !P.busy; pause.textContent = P.paused ? "▶ เล่นต่อ" : "⏸ หยุดชั่วคราว"; }
  P.step = function () {
    if (P.paused) return;
    if (P.i >= P.steps.length) { P.busy = false; sync(); return; }
    var s = P.steps[P.i]; P.timer = setTimeout(function () { P.i++; s[1](); P.step(); }, s[0] * (+JKX.spd || 1));
  };
  P.reset = function () { clearTimeout(P.timer); P.steps = []; P.i = 0; P.busy = false; P.paused = false; onReset(); sync(); };
  P.start = function (steps) { P.reset(); P.steps = steps; P.busy = true; sync(); P.step(); };
  play.onclick = function () { onPlay(P); }; rst.onclick = P.reset;
  pause.onclick = function () { if (!P.busy) return; P.paused = !P.paused; if (P.paused) clearTimeout(P.timer); sync(); if (!P.paused) P.step(); };
  // ความเร็วเล่น: ช้า (ดูทีละขั้น) / ปกติ / เร็ว · เปลี่ยนระหว่างเล่นได้ มีผลกับขั้นถัดไป
  var spd = h("label", { style: "font-size:.82rem;display:inline-flex;gap:6px;align-items:center" }, ["ความเร็ว", h("select", { "aria-label": "ความเร็วแอนิเมชัน", onchange: function (e) { JKX.spd = e.target.value; } }, [["2.2", "ช้า"], ["1", "ปกติ"], ["0.45", "เร็ว"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: String(JKX.spd || "1") === o[0] ? "selected" : null }); }))]);
  P.ctl = [play, pause, rst, spd]; sync();
  return P;
}
function jkxChain() {
  var list = JKX_SEC.jf.filter(function (s) { return /^stage/.test(s[0].source); }).map(function (s) { return /'([^']+)'/.exec(s[0].source)[1]; });
  var failAt = JKX.failAt || "", boxes = [], msg = h("div", { style: "margin:8px 0;min-height:2.6em;font-size:.9rem" }), btn;
  var row = h("div", { style: "display:flex;flex-wrap:wrap;gap:6px;align-items:center" });
  list.forEach(function (n, i) {
    var b = h("div", { "data-n": n, style: "padding:6px 10px;border-radius:6px;border:2px solid #879596;background:#f4f4f4;color:#333;font-size:.8rem;transition:all .3s", text: n });
    boxes.push(b); row.appendChild(b); if (i < list.length - 1) row.appendChild(h("span", { text: "→", style: "opacity:.6" }));
  });
  var FT2 = [], secs = jkxSplit(jkxText(), "jf"), pv = h("div", { style: "margin:10px 0 4px" });
  function secOf(name) { var k = -1; secs.forEach(function (x, i) { if (k < 0 && x.sec[0] && x.sec[0].test && x.sec[0].test("    stage('" + name + "') {")) k = i; }); return k; }
  // แสดงโค้ดของ stage ที่กำลังทำ ใต้แอนิเมชันเลย (ไม่ต้องเลื่อนลงไปหา) + ทำให้ช่วงเดียวกันในโค้ดด้านล่างสว่างขึ้น
  function focus(name, state) {
    var k = secOf(name), x = secs[k]; pv.textContent = "";
    [].forEach.call(document.querySelectorAll("#main [id^='jx-'], #main [data-s]"), function (e) { var me = e.id ? e.id === "jx-" + k : e.getAttribute("data-s") === String(k); e.classList.toggle("hdim", k >= 0 && !me); e.classList.toggle("hlive", k >= 0 && me); });
    if (!x) return;
    var col = state === "bad" ? "#c62828" : state === "ok" ? "#1d8102" : "#0972d3", T = JKX_THEME[JKX.theme] || JKX_THEME.github;
    pv.appendChild(h("div", { style: "border-left:5px solid " + col + ";background:" + hexA(col, 0.09) + ";border-radius:8px;overflow:hidden" }, [
      h("div", { style: "padding:8px 14px;font-size:.9rem;line-height:1.55;border-bottom:1px solid " + hexA(col, 0.25) }, [h("b", { style: "color:" + col, text: (state === "bad" ? "✗ ล้มที่ " : state === "ok" ? "✓ ผ่าน " : "▶ กำลังทำ ") + name }), x.sec[2] ? h("div", {}, [h("span", { style: "color:var(--muted)", text: "ทำอะไร: " }), x.sec[2]]) : null, x.sec[3] ? h("div", { style: "color:var(--muted)", text: x.sec[3] }) : null]),
      h("div", { style: "font-family:var(--mono);font-size:.78rem;line-height:1.55;padding:6px 0;background:" + T[1] + ";color:" + T[2] }, x.lines.map(function (l, i) { return jkxLine(l, "jf", x.start + i + 1); }))]));
  }
  function clearFocus() { pv.textContent = ""; [].forEach.call(document.querySelectorAll("#main .hdim, #main .hlive"), function (e) { e.classList.remove("hdim", "hlive"); }); }
  function setB(b, st) { var m = { idle: ["#879596", "#f4f4f4", "#333"], run: ["#0972d3", "#d6e9ff", "#0a3d8f"], ok: ["#1d8102", "#d2f0cc", "#145a24"], bad: ["#c62828", "#f8c9c9", "#8a1212"], skip: ["#bbb", "#eee", "#888"] }[st]; b.style.borderColor = m[0]; b.style.background = m[1]; b.style.color = m[2]; }
  function reset() { clearFocus(); boxes.forEach(function (b) { setB(b, "idle"); }); msg.textContent = failAt ? "กด ▶ เพื่อดู build ที่ล้มที่ขั้น " + failAt : "กด ▶ เพื่อดู build ที่ผ่านทุกขั้น"; }
  var WHY = { "Validate": "ยังไม่แตะระบบอะไรเลย", "Test": "ยังไม่เสียเวลา build ยังไม่มีอะไรไปถึง ECR", "SonarQube scan": "ยังไม่มี image ถูกสร้าง", "Build image": "ยังไม่มีอะไรไปถึง ECR", "Scan image": "image มีช่องโหว่ แต่ยังไม่ถูก push จึงไม่มีตัวเสียไปอยู่ใน ECR", "Push image": "manifest ยังเป็นเวอร์ชันเดิม ผู้ใช้ไม่เห็นอะไรเปลี่ยน", "Update manifest": "image อยู่ใน ECR แล้วแต่ยังไม่มีใครสั่งให้รัน ระบบยังรันเวอร์ชันเดิมอยู่", "Sync ArgoCD": "manifest แก้แล้ว กด Sync เองใน ArgoCD ได้" };
  var P = jkxPlayer(reset, function (P) {
    var steps = [];
    boxes.forEach(function (b, bi) {
      var n = b.getAttribute("data-n");
      steps.push([250, function () { setB(b, "run"); msg.textContent = "กำลังทำ: " + n; focus(n, "run"); }]);
      steps.push([650, function () {
        if (n === failAt) {
          setB(b, "bad"); focus(n, "bad"); msg.textContent = "ล้มที่ " + n + " → หยุดทันที: " + (WHY[n] || "");
          boxes.slice(bi + 1).forEach(function (x) { setB(x, "skip"); }); P.steps.length = P.i;
        } else { setB(b, "ok"); focus(n, "ok"); }
      }]);
    });
    steps.push([300, function () { msg.textContent = "ผ่านทุกขั้น: เว็บรันเวอร์ชันใหม่"; }]);
    P.start(steps);
  }); btn = P.ctl;
  var sel = h("label", { style: "font-size:.82rem" }, ["จำลองให้ล้มที่ ", h("select", { "aria-label": "ล้มที่", onchange: function (e) { JKX.failAt = e.target.value; render(); } }, [["", "ไม่ล้ม (ผ่านหมด)"]].concat(list.map(function (n) { return [n, n]; })).map(function (o) { return h("option", { value: o[0], text: o[1], selected: o[0] === failAt ? "selected" : null }); }))]);
  var wrap = h("div", {}, [h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 8px" }, btn.concat([sel])), row, msg, pv,
    h("p", { cls: "hint", text: "สังเกต: stage ที่ถูกกันไว้ก่อน (Test, Scan image) อยู่หน้า Push image ทั้งหมด ของเสียจึงไม่ไปถึง ECR (ล้มเร็ว)" })]);
  reset(); return wrap;
}

// ---- แอนิเมชัน 2: Dockerfile สองด่าน
function jkxLayers() {
  var back = JKX.svc === "backend", box = function (t, sub, col, id) { return h("div", { id: id, style: "flex:1;min-width:200px;border:2px solid " + col + ";border-radius:8px;background:" + hexA(col, 0.08) + ";padding:8px 12px;transition:all .4s" }, [h("b", { style: "color:" + col, text: t }), h("div", { style: "font-size:.82rem", text: sub })]); };
  var a = box(back ? "ด่านที่ 1: build" : "ด่านที่ 1-2: deps + next build", back ? "ลง compiler แล้วคอมไพล์ mysqlclient เป็นไฟล์ wheel" : "npm ci แล้ว next build (มี node_modules, TypeScript, devDependencies)", "#a85a00", "jx-l1");
  var b = box(back ? "ด่านที่ 2: runtime" : "ด่านที่ 3: runtime", back ? "เอาเฉพาะ wheel มาติดตั้ง + โค้ด + user uid 10001" : "เอาเฉพาะ standalone + static + user uid 10001", "#1d8102", "jx-l2");
  var c = box("image ที่ขึ้น ECR", back ? "มีแต่ด่านที่ 2 (ด่านที่ 1 ถูกทิ้ง)" : "มีแต่ด่านที่ 3 (ด่านที่ 1-2 ถูกทิ้ง)", "#d33833", "jx-l3");
  var ar = function () { return h("span", { style: "align-self:center;font-size:1.3rem", text: "→" }); };
  var all = [a, b, c], aTxt = a.querySelector("div").textContent;
  var P = jkxPlayer(function () { all.forEach(function (x) { x.style.opacity = "1"; x.style.boxShadow = "none"; }); a.querySelector("div").textContent = aTxt; }, function (P) {
    var st = [[100, function () { all.forEach(function (x) { x.style.opacity = ".25"; }); }]];
    all.forEach(function (x, i) { st.push([i ? 1000 : 600, function () { x.style.opacity = "1"; x.style.boxShadow = "0 0 0 4px rgba(255,153,0,.4)"; if (i) all[i - 1].style.boxShadow = "none"; }]); });
    st.push([900, function () { c.style.boxShadow = "none"; }], [1200, function () { a.style.opacity = ".25"; a.querySelector("div").textContent = "ถูกทิ้ง: ไม่ได้ขึ้น ECR"; }]);
    P.start(st);
  });
  return h("div", {}, [h("div", { style: "display:flex;gap:10px;flex-wrap:wrap;margin:0 0 8px" }, P.ctl), h("div", { style: "display:flex;flex-wrap:wrap;gap:8px" }, [a, ar(), b, ar(), c])]);
}

// ---- แอนิเมชัน 3: Rolling update ตามค่า replicas / maxSurge 1 / maxUnavailable 0
function jkxRoll() {
  var n = JKX.env === "prd" ? 3 : 1, pods = [], cnt = h("div", { style: "margin:8px 0;font-weight:600" }), msg = h("div", { style: "min-height:2.4em;font-size:.9rem" }), row = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;min-height:54px" });
  var C = { v1: ["#1d6fb8", "#d6e9ff"], boot: ["#b36b00", "#fff1cc"], v2: ["#1d8102", "#d2f0cc"], term: ["#999", "#eee"] };
  function draw() {
    row.textContent = ""; var ready = pods.filter(function (p) { return p.s === "v1" || p.s === "v2" || p.s === "term"; }).length;
    pods.forEach(function (p) { var c = C[p.s]; row.appendChild(h("div", { style: "width:92px;padding:6px;border:2px solid " + c[0] + ";background:" + c[1] + ";border-radius:8px;text-align:center;font-size:.76rem;opacity:" + (p.s === "term" ? ".6" : "1"), text: ({ v1: "เวอร์ชันเก่า\nพร้อม", boot: "เวอร์ชันใหม่\nกำลังเริ่ม", v2: "เวอร์ชันใหม่\nพร้อม", term: "กำลังปิด\n(preStop 5 วิ)" })[p.s] })); row.lastChild.style.whiteSpace = "pre-line"; });
    cnt.textContent = "pod ที่ใช้งานได้ตอนนี้: " + pods.filter(function (p) { return p.s === "v1" || p.s === "v2"; }).length + " / ต้องมีอย่างน้อย " + n + " เสมอ (maxUnavailable: 0)";
  }
  function reset() { pods = []; for (var i = 0; i < n; i++) pods.push({ s: "v1" }); draw(); msg.textContent = "ตอนนี้ทุกตัวรันเวอร์ชันเก่า · กด ▶ เมื่อ Jenkins แก้ image: แล้ว ArgoCD sync"; }
  var P = jkxPlayer(reset, function (P) {
    var st = [], i;
    function at(d, fn, txt) { st.push([d, function () { fn(); draw(); if (txt) msg.textContent = txt; }]); }
    for (i = 0; i < n; i++) (function (k) {
      at(k ? 1100 : 400, function () { pods.push({ s: "boot" }); }, "maxSurge: 1 → สร้าง pod ใหม่เพิ่มอีก 1 ตัว (ตัวเก่ายังทำงานครบ) · startupProbe รอแอปเริ่ม");
      at(1100, function () { pods[pods.length - 1].s = "v2"; }, "readinessProbe ผ่าน (/api/ready หรือ /healthz) → เริ่มรับ traffic");
      at(1100, function () { var o = pods.filter(function (p) { return p.s === "v1"; })[0]; o.s = "term"; }, "ถอดตัวเก่าออกจาก Service ก่อน แล้ว preStop รอ 5 วิ คำขอที่กำลังมาไม่ตกหล่น");
      at(1100, function () { var j = pods.map(function (p) { return p.s; }).indexOf("term"); pods.splice(j, 1); }, k === n - 1 ? "ครบ: ทุกตัวเป็นเวอร์ชันใหม่ ผู้ใช้ไม่เคยเจอช่วงล่ม" : "ปิดตัวเก่าเสร็จ ทำตัวถัดไป");
    })(i);
    P.start(st);
  }, "▶ เล่น: ปล่อยเวอร์ชันใหม่");
  reset();
  return h("div", {}, [h("div", { style: "display:flex;gap:10px;align-items:center;margin:0 0 6px;flex-wrap:wrap" }, P.ctl.concat([h("span", { cls: "hint", text: "replicas = " + n + " (" + JKX.env + ")" })])), row, cnt, msg]);
}

function jenkinsTab() {
  var cb = h("div", { cls: "cb" }), kind = JKX.file, text = jkxText(), secs = jkxSplit(text, kind);
  function seg(label, key, opts) { return h("label", { style: "font-size:.82rem" }, [label + " ", h("select", { "aria-label": label, onchange: function (e) { JKX[key] = e.target.value; render(); } }, opts.map(function (o) { return h("option", { value: o[0], text: o[1], selected: JKX[key] === o[0] ? "selected" : null }); }))]); }
  cb.appendChild(infoCard([["ทำอะไร", "#2b6cb0", "อธิบายไฟล์ปล่อยจริง**ทีละช่วง**: ทำอะไร · เทียบกับวิธี ==แบบเล่นๆ== · ผลที่ได้"], ["ป้ายสีท้ายบรรทัด", "#a85a00", "บอกว่าค่านั้น**มาจากไหน**: คนกรอก · `.env` · credential · Jenkins ใส่ให้ (ชี้ป้ายเพื่ออ่านคำอธิบาย)"]]));
  cb.appendChild(h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 12px" }, [
    seg("ไฟล์", "file", [["jf", "Jenkinsfile"], ["df", "Dockerfile"], ["yaml", "deployment.yaml"], ["dc", "docker-compose.yml"]]),
    seg("มุมมอง", "view", [["sec", "แบ่งเป็นช่วง + คำอธิบาย"], ["full", "ไฟล์เต็มต่อเนื่อง"]]),
    seg("ธีมโค้ด", "theme", Object.keys(JKX_THEME).map(function (k) { return [k, JKX_THEME[k][0]]; })),
    seg("แอป (repo)", "svc", [["backend", "backend"], ["frontend", "frontend"]]),
    kind === "yaml" ? seg("env", "env", [["dev", "dev"], ["prd", "prd"]]) : null,
    foldBar()]));
  var src = { jf: "repo-" + JKX.svc + "/Jenkinsfile", df: "repo-" + JKX.svc + "/Dockerfile", yaml: "repo-manifests/" + JKX.env + "/" + JKX.svc + "/deployment.yaml", dc: "repo-" + JKX.svc + "/docker-compose.yml" }[kind];
  var anim = kind === "jf" ? ["jxa", "แอนิเมชัน: ลำดับ stage และการล้มเร็ว", jkxChain] : kind === "df" ? ["jxa", "แอนิเมชัน: จาก Dockerfile เป็น image บน ECR", jkxLayers] : kind === "yaml" ? ["jxa", "แอนิเมชัน: ปล่อยเวอร์ชันใหม่โดยไม่ล่ม (RollingUpdate)", jkxRoll] : null;
  if (anim) { var a = fold(anim[0], anim[1]), card = h("div", { cls: "card", style: "margin-bottom:14px;padding:8px 14px 12px" }); a.appendChild(anim[2]()); card.appendChild(a); cb.appendChild(card); }
  var cd = fold("jxc", src + (JKX.view === "full" ? " (ไฟล์เต็ม · เส้นสีซ้าย = ช่วง)" : " (" + secs.length + " ช่วง)")); cd.className = "fold card"; cd.style.padding = "8px 14px 12px"; cd.appendChild(JKX.view === "full" ? jkxFull(secs, kind) : jkxCode(secs, kind)); cb.appendChild(cd);
  return cb;
}
PAGES["lab-jenkins"] = function () { return h("div", {}, [crumbEl("Lab › Jenkins"), h("h1", { text: "Jenkins" }), h("div", { cls: "card" }, [jenkinsTab()])]); };
FOLD.jxa = 1; FOLD.jxc = 1;

// ตัวเลือกธีมโค้ด ใช้ร่วมกันทุกหน้าที่มีโค้ด (Jenkins, ลำดับการปล่อย, Terraform) เลือกที่หนึ่งเปลี่ยนทุกที่
function codeThemeSel() {
  return h("label", { style: "font-size:.82rem;display:inline-flex;gap:6px;align-items:center" }, ["ธีมโค้ด", h("select", { "aria-label": "ธีมโค้ด", onchange: function (e) { JKX.theme = e.target.value; render(); } }, Object.keys(JKX_THEME).map(function (k) { return h("option", { value: k, text: JKX_THEME[k][0], selected: JKX.theme === k ? "selected" : null }); }))]);
}

// กล่องโค้ดสำเร็จรูป (ใช้ธีมที่เลือก + ไฮไลต์ตามชนิด): ใช้แทน <pre> ธรรมดาทุกที่ที่แสดงโค้ด
function codePre(text, kind) {
  var T = JKX_THEME[JKX.theme] || JKX_THEME.github;
  return h("div", { style: "font-family:var(--mono);font-size:.8rem;line-height:1.6;background:" + (T[1] === "transparent" ? "var(--code-bg)" : T[1]) + ";color:" + T[2] + ";border-radius:10px;padding:10px 0;overflow:auto;max-height:420px" + (T[1] === "transparent" ? ";border:1px solid color-mix(in srgb, var(--accent) 20%, transparent)" : "") }, String(text).split("\n").map(function (l, i) { return jkxLine(l, kind, i + 1); }));
}

function jkxViewSel() {
  return h("label", { style: "font-size:.82rem;display:inline-flex;gap:6px;align-items:center" }, ["มุมมอง", h("select", { "aria-label": "มุมมอง", onchange: function (e) { JKX.view = e.target.value; render(); } }, [["sec", "แบ่งเป็นช่วง + คำอธิบาย"], ["full", "ไฟล์เต็มต่อเนื่อง"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: JKX.view === o[0] ? "selected" : null }); }))]);
}
// คำอธิบายของแต่ละบล็อกในหน้าลำดับการปล่อย: ดึงจากตารางช่วงของ Jenkinsfile (JKX_SEC) ตัวเดียวกับหน้า Jenkins
function flowNote(b) {
  var line = { head: "// ของจริงอยู่ที่", params: "  parameters {", env: "  environment {", post: "  post {" }[b.id] || "    stage('" + b.id + "') {", e = null;
  if (b.id === "git") return ["คุณติด tag เวอร์ชันแล้ว push ขึ้น GitHub", "แบบเล่นๆ: build จาก main แล้วไม่รู้ว่า image นี้คือโค้ดของเวอร์ชันไหน", "tag คือป้ายบอกว่าโค้ดตอนนี้คือเวอร์ชันไหน Jenkins จะดึงโค้ดตาม tag นี้พอดี"];
  if (b.id === "apps") return ["บอก ArgoCD ว่าต้องดู repo ไหน โฟลเดอร์ไหน และ sync แบบไหน", "แบบเล่นๆ: สั่ง kubectl apply เองทุกครั้ง ไม่มีใครเฝ้าดูว่า cluster ตรงกับ Git หรือไม่", " apply ครั้งเดียวตอนตั้งระบบ แล้ว ArgoCD เฝ้า repo เอง · dev sync เอง · prd ให้คนกด Sync เพื่อควบคุมเวลาปล่อย"];
  if (b.id === "deploy") return ["ไฟล์ที่ Jenkins แก้บรรทัด image: แล้ว ArgoCD นำไปใช้จริงบน Kubernetes", "", "ที่เหลือ (จำนวน pod, probe, สิทธิ์, resources) คุณแก้ใน Git ตามปกติ · ดูทีละช่วงที่แท็บ Jenkins (ไฟล์ปล่อยจริง) › deployment.yaml"];
  JKX_SEC.jf.forEach(function (sec) { if (!e && sec[0].test(line)) e = sec; });
  return e ? [e[2], e[3] && /^แบบเล่นๆ/.test(e[3]) ? e[3] : "", e[3] && !/^แบบเล่นๆ/.test(e[3]) ? e[3] : ""] : null;
}

// ---- ข้อความอ่านง่าย: **ตัวหนาสีเน้น**  ==ไฮไลต์เหลือง==  `โค้ด`  + ชิปอัตโนมัติสำหรับ ไฟล์ / เวอร์ชัน / IP / พอร์ต / aws_resource
function rich(str) {
  var out = [], re = /\*\*(.+?)\*\*|==(.+?)==|`([^`]+)`|(\bv\d+\.\d+\.\d+\b|\b\d{1,3}(?:\.\d{1,3}){3}(?:\/\d+)?|\baws_[a-z_]+|[\w-]+(?:[./][\w-]+)*\.(?:tf|ya?ml|json|j2|sh|py|env)\b|\bJenkinsfile\b|:\d{4,5}\b)/g, last = 0, m;
  str = String(str);
  while ((m = re.exec(str))) {
    if (m.index > last) out.push(document.createTextNode(str.slice(last, m.index)));
    if (m[1] != null) out.push(h("b", { cls: "rb", text: m[1] })); else if (m[2] != null) out.push(h("mark", { cls: "rhl", text: m[2] })); else out.push(h("code", { cls: "rch", text: m[3] != null ? m[3] : m[4] }));
    last = re.lastIndex;
  }
  if (last < str.length) out.push(document.createTextNode(str.slice(last)));
  return out;
}
// กล่องสรุปแบบแถวมีป้าย: rows = [[ป้าย, สี, ข้อความ(รองรับ markup ของ rich)]] · ใช้แทนย่อหน้ายาวๆ
function infoCard(rows) {
  return h("div", { cls: "ic" }, rows.map(function (r) { return h("div", { cls: "ic-row", style: "--c:" + r[1] }, [h("div", { cls: "ic-lb", text: r[0] }), h("div", { cls: "ic-tx" }, rich(r[2]))]); }));
}

// ---- หน้า "กฎที่จำลอง": จัดกลุ่มตามบริการ มีตัวกรอง (ตรงเอกสาร/ไม่ยืนยัน/กลุ่ม) ค้นหา และสรุปตัวเลข
var RULE_GROUPS = [["VPC", /^(VPC|Default VPC|DNS|ลบ VPC)/, "#1d6fb8"], ["Subnet", /^(Subnet|ถ้าไม่เลือก Availability Zone|ลบ subnet)/, "#00838f"], ["Elastic IP", /^Elastic IP/, "#b36b00"], ["Load balancer", /^(ALB|Target group|Target health|listener|จำลอง health)/, "#0b7285"], ["Internet gateway", /^Internet gateway/, "#a85a00"], ["Route table", /^Route table/, "#7b3fe4"],
  ["Security group", /^(Security group|Default security group|กฎ SG|ลบ SG|ชื่อ Type)/, "#c0392b"], ["Key pair", /^(Key pair|ลบ key pair)/, "#8a5a00"], ["IAM", /^IAM/, "#1d8102"], ["ECR", /^ECR/, "#d33833"], ["EC2", /^(EC2|Connect|Session Manager|เชื่อมต่อ SSH)/, "#a85a00"], ["เมนู console", /^(เมนู)/, "#8250df"],
  ["Terraform", /^Terraform/, "#7b3fe4"], ["Ansible", /^Ansible/, "#c0392b"], ["ArgoCD", /^ArgoCD/, "#ef7b4d"], ["SonarQube", /^SonarQube/, "#2b6cb0"], ["Jenkins", /^Jenkins/, "#d33833"],
  ["โควตา / Free plan", /^(Default quota|ข้อความ error ของ quota|Free plan|บัญชี)/, "#546e7a"], ["หน้าตา console", /^(หน้าตา|หน้าที่|หน้า AWS|ปุ่ม|สีปุ่ม)/, "#8250df"]];
function ruleGroup(t) { for (var i = 0; i < RULE_GROUPS.length; i++) if (RULE_GROUPS[i][1].test(t)) return RULE_GROUPS[i][0]; return "อื่นๆ"; }
function rulesView() {
  var R = UI.rl = UI.rl || { f: "all", g: "", q: "", _c: {} }, items = RULES.map(function (r) { return { t: r[0], ok: !!r[1], g: ruleGroup(r[0]) }; }), nOk = items.filter(function (x) { return x.ok; }).length, box = h("div");
  var colOf = function (g) { var f = RULE_GROUPS.filter(function (x) { return x[0] === g; })[0]; return f ? f[2] : "#879596"; };
  box.appendChild(h("div", { cls: "tiles", style: "margin-bottom:14px" }, [["ทั้งหมด", items.length, "var(--fg)"], ["ตรงเอกสาร AWS", nOk, "var(--ok)"], ["ยังไม่ยืนยัน", items.length - nOk, "var(--warn)"]].map(function (c) { return h("div", { cls: "tile" }, [h("b", { style: "color:" + c[2], text: String(c[1]) }), h("span", { text: c[0] })]); })));
  box.appendChild(h("div", { cls: "prog", title: Math.round(100 * nOk / items.length) + "% ยืนยันแล้ว" }, [h("i", { style: "width:" + Math.round(100 * nOk / items.length) + "%" })]));
  box.appendChild(infoCard([["ตรงเอกสาร", "#1d8102", "ตรวจกับเอกสาร/ข้อมูลของ AWS แล้ว **เชื่อถือได้**"], ["ยังไม่ยืนยัน", "#b36b00", "จำลองจาก==ความจำ/การคาด== ยังไม่ได้เทียบกับของจริง **อย่าเพิ่งเชื่อ 100%**"]]));
  var chip = function (label, n, on, fn) { return h("button", { type: "button", cls: "chip" + (on ? " on" : ""), onclick: fn }, [label, h("span", { cls: "n", text: String(n) })]); };
  var base = items.filter(function (x) { return (R.f === "all" || (R.f === "ok") === x.ok) && (!R.q || x.t.toLowerCase().indexOf(R.q.toLowerCase()) >= 0); });
  box.appendChild(h("div", { cls: "chips" }, [chip("ทั้งหมด", items.length, R.f === "all", function () { R.f = "all"; render(); }), chip("✓ ตรงเอกสาร", nOk, R.f === "ok", function () { R.f = "ok"; render(); }), chip("? ไม่ยืนยัน", items.length - nOk, R.f === "no", function () { R.f = "no"; render(); })]));
  var gs = [], seen = {}; items.forEach(function (x) { if (!seen[x.g]) { seen[x.g] = 1; gs.push(x.g); } });
  box.appendChild(h("div", { cls: "chips" }, [chip("ทุกกลุ่ม", base.length, !R.g, function () { R.g = ""; render(); })].concat(gs.map(function (g) { var n = base.filter(function (x) { return x.g === g; }).length; return n ? chip(g, n, R.g === g, function () { R.g = R.g === g ? "" : g; render(); }) : null; }))));
  box.appendChild(h("div", { style: "display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin:8px 0 14px" }, [h("div", { cls: "f", style: "min-width:260px;margin:0" }, [h("label", { cls: "l", text: "ค้นหาในกฎ" }), exPick([["SG", "SG"], ["CIDR", "CIDR"], ["quota", "quota"], ["token", "token"], ["Free plan", "Free plan"]], function () { return R.q; }, function (v) { R.q = v; }, R._c, "q", "คำที่ต้องการหา", "ค้นหากฎ", false)]), h("button", { type: "button", cls: "btn pri", text: "ค้นหา", onclick: function () { render(); } }), R.q ? h("button", { type: "button", cls: "btn", text: "ล้างคำค้น", onclick: function () { R.q = ""; R._c.q = false; render(); } }) : null]));
  var shown = base.filter(function (x) { return !R.g || x.g === R.g; });
  if (!shown.length) box.appendChild(h("div", { cls: "ic" }, [h("div", { cls: "ic-row", style: "--c:#879596" }, [h("div", { cls: "ic-lb", text: "ไม่พบ" }), h("div", { cls: "ic-tx", text: "ไม่มีกฎที่ตรงกับตัวกรองนี้" })])]));
  gs.forEach(function (g) {
    var rows = shown.filter(function (x) { return x.g === g; }); if (!rows.length) return;
    var c = colOf(g);
    box.appendChild(h("div", { cls: "rg", style: "--c:" + c }, [h("div", { cls: "rg-h" }, [h("b", { text: g }), h("span", { cls: "n", text: rows.length + " ข้อ" })])].concat(rows.map(function (x) {
      return h("div", { cls: "rg-r" }, [h("span", { cls: "rg-b " + (x.ok ? "ok" : "no"), text: x.ok ? "✓ ตรงเอกสาร" : "? ไม่ยืนยัน" }), h("div", { cls: "rg-t" }, rich(x.t))]);
    }))));
  });
  return box;
}

// ปุ่มขยาย/ยุบทั้งหมด: กลุ่มปุ่มติดกัน (segmented) ใช้ทุกหน้าที่มีส่วนพับได้
function foldBar() {
  return h("div", { cls: "fbar", role: "group", "aria-label": "ขยาย/ยุบทั้งหมด" }, [h("button", { type: "button", cls: "ex", text: "ขยายทั้งหมด", onclick: function () { foldAll(true); } }), h("button", { type: "button", cls: "co", text: "ยุบทั้งหมด", onclick: function () { foldAll(false); } })]);
}
