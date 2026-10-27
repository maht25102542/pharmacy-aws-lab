const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n, e.message.slice(0, 300)); await L.finish(); process.exit(1); } } } };
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["ECR image", "ECR"], ["IAM role", "IAM"], ["App Runner", "App Runner"], ["เปิดเว็บ", "🌐"]]);
  await L.cap("Use case 7 · App Runner: ให้ image แล้วได้ URL HTTPS", "use case เจ็ด App Runner แค่ให้ container image แล้ว AWS จัดการที่เหลือให้ ได้ URL แบบ HTTPS พร้อมสเกลอัตโนมัติ ไม่ต้องมี cluster ไม่ต้องมี load balancer"); await L.hold(1);
  await L.ev(`buildApr("apr-base"); UI.sel={}; render(); 1`);
  await L.cap("เตรียมไว้แล้ว: ECR repository pharmacy/api มี image v1.0.0", "ที่เตรียมไว้ให้แล้วคือ image ชื่อ pharmacy slash api เวอร์ชัน v1.0.0 ใน ECR");
  await L.intro(0, "ECR", "ที่เก็บ container image", "นี่คือ ECR ที่เก็บ container image ของเรา");
  await L.tick(0, "image พร้อมใน ECR", "image พร้อมให้ดึงไปใช้แล้ว");
  // IAM role
  await L.intro(1, "IAM", "role ให้ App Runner ดึง image", "ต่อมา IAM ต้องสร้าง role ให้ App Runner มีสิทธิ์ดึง image จาก ECR ที่เป็นแบบส่วนตัว");
  await L.cap("① IAM › Roles › Create role", "เปิด IAM ไปที่ Roles แล้วกด Create role"); await svc("IAM"); await L.click(B("Roles")); await L.click(B("Create role"));
  await L.cap("② Trusted entity = AWS service › use case App Runner", "เลือก trusted entity เป็น AWS service และ use case เป็น App Runner เพื่อให้ App Runner เป็นคนมาใช้ role นี้");
  await step("usecase", async () => { await L.pickBtn("EC2", "App Runner"); }); await L.hold(0.8); await L.click(B("Next"));
  await L.cap("③ นโยบายถูกเลือกให้แล้ว: AWSAppRunnerServicePolicyForECRAccess", "ระบบเลือกนโยบาย AppRunner ServicePolicy ForECRAccess ให้แล้ว นโยบายนี้ให้สิทธิ์อ่าน image จาก ECR"); await L.hold(1.5); await L.click(B("Next"));
  await L.cap("④ ตั้งชื่อ role: pharmacy-apprunner-ecr → Create role", "ตั้งชื่อ role ว่า pharmacy apprunner ecr แล้วกด Create role");
  await step("rname", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); });
  await step("rname2", async () => { await L.sleep(400); await L.type("main input[placeholder]", "pharmacy-apprunner-ecr"); });
  await L.click(B("Create role")); await L.hold(1);
  await L.tick(1, "role สร้างแล้ว", "สร้าง role เรียบร้อย");
  // App Runner
  await L.intro(2, "App Runner", "รัน container ให้ได้ URL HTTPS", "นี่คือ App Runner บริการรัน container แบบจัดการให้ทั้งหมด");
  await L.cap("⑤ App Runner › Create an App Runner service", "เปิด App Runner แล้วกด Create an App Runner service"); await svc("App Runner", "Containers"); await L.click(B("Create an App Runner service"));
  await L.cap("⑥ Source: image จาก ECR + access role ที่เพิ่งสร้าง (เลือกให้แล้ว)", "ขั้นแรก ระบบเลือก image จาก ECR และ role ที่เพิ่งสร้างให้แล้ว"); await L.hold(2.5);
  await L.cap("⑦ ตั้งชื่อ service + ขนาด 0.25 vCPU", "ตั้งชื่อ service ว่า pharmacy api dev และเลือกขนาดเล็ก ศูนย์จุดสองห้า vCPU เพราะเป็นสภาพแวดล้อม dev");
  await step("sname", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); });
  await step("sname2", async () => { await L.sleep(400); await L.type("main input[placeholder]", "pharmacy-api-dev"); });
  await step("cpu", async () => { await L.pick(B("1 vCPU", { starts: true }), "0.25 vCPU"); });
  await L.cap("⑧ Port 8000 + Health check HTTP /healthz (ค่าเริ่มต้นตรงกับแอปแล้ว)", "port ต้องตรงกับที่แอปฟังคือ แปดพัน และ health check แบบ HTTP ที่ path healthz ค่าเริ่มต้นตรงกับแอปแล้ว"); await L.hold(2.5);
  await L.cap("⑨ Create & deploy", "กด Create and deploy"); await L.click(B("Create & deploy")); await L.hold(1.5);
  await L.tick(2, "service Running", "service ขึ้นสถานะ Running แล้ว");
  // Browser
  await L.intro(3, "Browser", "ทดสอบเปิด URL จริง", "มาทดสอบเปิดเว็บกัน");
  await L.cap("⑩ แท็บ Browser → เปิด https://…awsapprunner.com/healthz", "ไปที่แท็บ Browser แล้วเปิด URL ของ service ต่อท้ายด้วย healthz"); await L.click(B("Browser", { nth: 0 }));
  const url = await L.ev(`"https://" + S.aprs[0].url + "/healthz"`);
  await step("br", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); });
  await step("br2", async () => { await L.sleep(400); await L.type("main input[placeholder], main input[type=text]", url); });
  await L.click(B("Go")); await L.hold(2.5);
  console.log("END", (await L.ev(`document.body.innerText`)).replace(/\s+/g, " ").slice(0, 700));
  await L.tick(3, "เปิดได้ HTTPS 200", "เปิดได้แล้ว ตอบกลับสถานะสองร้อย");
  await L.costScene("apr", "เรื่องค่าใช้จ่าย App Runner มีค่าพื้นตามหน่วยความจำที่จองไว้แม้ไม่มีคนเรียก ประมาณสิบสามดอลลาร์ต่อเดือนสำหรับ dev กับ prd บวกค่า active ตอนมีทราฟฟิก ถ้าไม่ใช้ให้ pause หรือลบ service และตั้ง Budget ไว้เสมอ");
  await L.cap("✓ สำเร็จ: image ใน ECR → App Runner → URL HTTPS พร้อมใช้", "สรุป ให้แค่ image กับ role แล้วได้ URL แบบ HTTPS ทันที แต่ต้องรู้ว่า App Runner ปิดรับลูกค้าใหม่แล้ว โปรเจกต์ใหม่ AWS แนะนำ ECS Express Mode"); await L.hold(1);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase7.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
