const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n, e.message.slice(0, 300)); await L.finish(); process.exit(1); } } } };
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["ECR repo", "ECR"], ["push image", "ECR"], ["IAM role", "IAM"], ["App Runner", "App Runner"], ["เปิดเว็บ", "🌐"]]);
  await L.cap("Use case 7 · App Runner: ให้ image แล้วได้ URL HTTPS", "use case เจ็ด App Runner แค่ให้ container image แล้ว AWS จัดการที่เหลือให้ ได้ URL แบบ HTTPS พร้อมสเกลอัตโนมัติ ไม่ต้องมี cluster ไม่ต้องมี load balancer"); await L.hold(1);
  // สมมติว่าตั้งค่า aws CLI บนเครื่องเราแล้ว (user tf-admin) — ทำเงียบๆ เพราะเป็นขั้น Terraform/CLI ของ lab อื่น
  await L.ev(`fresh(); var tu=API.createUser({name:"tf-admin",policies:["AdministratorAccess"]}).res, tk=API.createAccessKey(tu.id,"CLI",""); S.laptop.creds={id:tk.res.id,secretHash:hash32(tk.secret),region:"ap-southeast-1"}; S.laptop.awsRegion="ap-southeast-1"; S.laptop.dockerReg=ACCOUNT+".dkr.ecr."+REGION+".amazonaws.com"; UI.sel={}; render(); 1`);
  await L.cap("ก่อนเริ่ม: เครื่องเรามี aws CLI และ docker พร้อมใช้ (user tf-admin)", "ก่อนเริ่ม สมมติว่าเครื่องเรามี aws CLI และ docker พร้อมใช้ ด้วย IAM user ชื่อ tf admin"); await L.hold(1);
  // 1 ECR repo
  await L.intro(0, "ECR", "ที่เก็บ container image", "ขั้นแรก สร้างที่เก็บ image ใน ECR");
  await L.cap("① Services › Containers › Elastic Container Registry › Create repository", "เปิด Services เลือกหมวด Containers แล้วเลือก Elastic Container Registry กด Create repository"); await svc("Elastic Container Registry", "Containers"); await L.click(B("Create repository", { nth: 0 }));
  await L.cap("② ชื่อ repository pharmacy/api · เปิด Tag immutability (กัน tag ถูกเขียนทับ)", "ตั้งชื่อ repository ว่า pharmacy slash api และเปิด Tag immutability เพื่อไม่ให้ใครเขียนทับ tag เดิมได้");
  await step("rname", async () => { await L.fill("Repository name", "pharmacy/api"); });
  await step("rimm", async () => { await L.click(B("Enabled", { nth: 0 })); });
  await L.hold(1); await L.cap("③ Create repository", "กด Create repository"); await L.click(B("Create repository", { nth: 0 })); await L.hold(1.5);
  await L.tick(0, "repository พร้อมแล้ว", "สร้าง repository เรียบร้อย");
  // 2 push
  await L.intro(1, "Push image", "ส่ง image ขึ้น ECR", "ต่อมา build image แล้ว push ขึ้น repository");
  await L.cap("④ เลือก repository › Actions › Docker push / pull (จำลองการรัน docker ในเครื่องเรา)", "เลือก repository แล้วเมนู Actions เลือก Docker push หน้านี้จำลองการรันคำสั่ง docker บนเครื่องเรา");
  await step("rsel", async () => { await L.click({ t: "pharmacy/api", tag: "a,td", starts: true }); }); await L.click(B("Actions")); await L.click(B("Docker push", { starts: true }));
  await L.cap("⑤ รันในนามอะไร: IAM user tf-admin · การกระทำ push · image tag v1.0.0", "ตั้งว่าใครเป็นคนรัน คือ user tf admin การกระทำคือ push และ image tag เป็น v หนึ่งจุดศูนย์จุดศูนย์");
  await L.hold(2.5); await L.cap("⑥ Run → aws ecr get-login-password | docker login → docker push", "กด Run ระบบจะล็อกอินเข้า ECR ด้วยคำสั่ง aws ecr get login password แล้ว docker push image ขึ้นไป"); await L.click(B("Run", { nth: 0 })); await L.hold(3);
  await L.tick(1, "push สำเร็จ", "push image สำเร็จ");
  // 3 IAM role
  await L.intro(2, "IAM", "role ให้ App Runner ดึง image", "ต่อมา IAM ต้องสร้าง role ให้ App Runner มีสิทธิ์ดึง image จาก ECR ที่เป็นแบบส่วนตัว");
  await L.cap("⑦ IAM › Roles › Create role", "เปิด IAM ไปที่ Roles แล้วกด Create role"); await svc("IAM", "Security, Identity, & Compliance"); await L.click(B("Roles")); await L.click(B("Create role", { nth: 0 }));
  await L.cap("⑧ Trusted entity = AWS service › use case App Runner", "เลือก trusted entity เป็น AWS service และ use case เป็น App Runner เพื่อให้ App Runner เป็นคนมาใช้ role นี้");
  await step("usecase", async () => { await L.pickBtn("EC2", "App Runner"); }); await L.hold(0.8); await L.click(B("Next"));
  await L.cap("⑨ นโยบาย AWSAppRunnerServicePolicyForECRAccess ติ๊กไว้ให้แล้ว (อ่าน image จาก ECR)", "ระบบติ๊กนโยบาย AppRunner ServicePolicy ForECRAccess ไว้ให้ นโยบายนี้ให้สิทธิ์อ่าน image จาก ECR"); await L.hold(2.5); await L.click(B("Next"));
  await L.cap("⑩ ตั้งชื่อ role: pharmacy-apprunner-ecr → Create role", "ตั้งชื่อ role ว่า pharmacy apprunner ecr แล้วกด Create role");
  await step("rn", async () => { await L.fill("Role name", "pharmacy-apprunner-ecr"); });
  await L.click(B("Create role", { nth: 0 })); await L.hold(1);
  await L.tick(2, "role สร้างแล้ว", "สร้าง role เรียบร้อย");
  // 4 App Runner
  await L.intro(3, "App Runner", "รัน container ให้ได้ URL HTTPS", "นี่คือ App Runner บริการรัน container แบบจัดการให้ทั้งหมด");
  await L.cap("⑪ App Runner › Create an App Runner service", "เปิด App Runner แล้วกด Create an App Runner service"); await svc("App Runner", "Containers"); await L.click(B("Create an App Runner service"));
  await L.cap("⑫ Source: เลือก image pharmacy/api:v1.0.0 และ access role ที่เพิ่งสร้าง", "ขั้นแรก เลือก image ที่เพิ่ง push คือ pharmacy slash api เวอร์ชัน v หนึ่งจุดศูนย์จุดศูนย์ และเลือก role ที่เพิ่งสร้าง");
  await step("img", async () => { await L.choose("Container image URI", "pharmacy/api:v1.0.0"); });
  await step("rol", async () => { await L.choose("ECR access role", "pharmacy-apprunner-ecr"); });
  await L.cap("⑬ ชื่อ service pharmacy-api-dev · ขนาด 0.25 vCPU", "ตั้งชื่อ service ว่า pharmacy api dev และเลือกขนาดเล็ก ศูนย์จุดสองห้า vCPU เพราะเป็นสภาพแวดล้อม dev");
  await step("sn", async () => { await L.fill("Service name", "pharmacy-api-dev"); });
  await step("cpu", async () => { await L.choose("vCPU", "0.25 vCPU"); });
  await L.cap("⑭ Port 8000 (ต้องตรงกับที่แอปฟัง) · Health check HTTP path /healthz", "port ต้องตรงกับที่แอปฟังคือ แปดพัน และ health check ใช้โปรโตคอล HTTP ที่ path healthz");
  await step("port", async () => { await L.fill("Port", "8000"); });
  await step("hp", async () => { await L.choose("Health check protocol", "HTTP"); });
  await step("hpath", async () => { await L.fill("Health check path", "/healthz"); });
  await L.cap("⑮ Create & deploy", "กด Create and deploy"); await L.click(B("Create & deploy")); await L.hold(1.5);
  await L.tick(3, "service Running", "service ขึ้นสถานะ Running แล้ว");
  // browser
  await L.intro(4, "Browser", "ทดสอบเปิด URL จริง", "มาทดสอบเปิดเว็บกัน");
  const url = await L.ev(`"https://" + S.aprs[0].url + "/healthz"`);
  await L.cap("⑯ แท็บ Browser → เปิด https://…awsapprunner.com/healthz", "ไปที่แท็บ Browser แล้วเปิด URL ของ service ต่อท้ายด้วย healthz"); await L.click(B("Browser", { nth: 0 }));
  await step("br", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); });
  await step("br2", async () => { await L.sleep(400); await L.type("main input[placeholder], main input[type=text]", url); });
  await L.click(B("Go")); await L.hold(2.5);
  await L.tick(4, "เปิดได้ HTTPS 200", "เปิดได้แล้ว ตอบกลับสถานะสองร้อย");
  await L.costScene("apr", "เรื่องค่าใช้จ่าย App Runner มีค่าพื้นตามหน่วยความจำที่จองไว้แม้ไม่มีคนเรียก ประมาณสิบสามดอลลาร์ต่อเดือนสำหรับ dev กับ prd บวกค่า active ตอนมีทราฟฟิก ถ้าไม่ใช้ให้ pause หรือลบ service และตั้ง Budget ไว้เสมอ");
  await L.cap("✓ สำเร็จ: image ใน ECR → App Runner → URL HTTPS พร้อมใช้", "สรุป ให้แค่ image กับ role แล้วได้ URL แบบ HTTPS ทันที แต่ต้องรู้ว่า App Runner ปิดรับลูกค้าใหม่แล้ว โปรเจกต์ใหม่ AWS แนะนำ ECS Express Mode"); await L.hold(1);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase7.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
