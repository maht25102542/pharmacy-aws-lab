const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n, e.message.slice(0, 300)); await L.finish(); process.exit(1); } } } };
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
const txt = async (a = 0, n = 900) => (await L.ev(`document.querySelector("main,.main").innerText`)).replace(/\s+/g, " ").slice(a, a + n);
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["OIDC provider", "IAM"], ["IAM role", "IAM"], ["Workflow", "🐱"], ["deploy dev", "ECS"], ["deploy prd", "ECS"]]);
  await L.cap("Use case 5 · GitHub Actions + OIDC → ECR → ECS (dev อัตโนมัติ / prd ต้องอนุมัติ)", "use case ห้า ใช้ GitHub Actions ปล่อยแอปลง AWS โดยไม่ต้องเก็บ access key ไว้ใน GitHub เลย ใช้ OIDC ให้ GitHub ขอสิทธิ์ชั่วคราวจาก AWS แทน dev ปล่อยอัตโนมัติ ส่วน prd ต้องมีคนอนุมัติ"); await L.hold(1);
  await L.ev(`buildGha("gha-base"); UI.sel={}; render(); 1`);
  await L.cap("เตรียมไว้แล้ว: ECS cluster dev/prd + ECR (lab 02) และ GitHub repo pharmacy-backend", "ที่เตรียมไว้ให้แล้วคือ ECS cluster ทั้ง dev กับ prd ECR และ GitHub repo ชื่อ pharmacy backend"); await L.hold(1);
  // 1 provider
  await L.intro(0, "IAM", "ให้ AWS เชื่อใจ GitHub (OIDC provider)", "ขั้นแรก ให้ AWS ไว้ใจ GitHub โดยเพิ่ม OIDC provider ใน IAM");
  await L.cap("① IAM › Identity providers › Add provider", "เปิด IAM ไปที่ Identity providers แล้วกด Add provider"); await svc("IAM", "Security, Identity, & Compliance"); await L.click(B("Identity providers")); await L.click(B("Add provider", { nth: 0 }));
  await L.cap("② URL ของ GitHub + audience sts.amazonaws.com (ใส่ให้แล้ว) → Add provider", "ใส่ URL ของ GitHub token actions กับ audience เป็น sts amazonaws com ระบบกรอกให้แล้ว กด Add provider"); await L.hold(2.5); await L.click(B("Add provider", { nth: 0 })); await L.hold(1.2);
  await L.tick(0, "OIDC provider พร้อมแล้ว", "AWS ไว้ใจ GitHub แล้ว");
  // 2 role
  await L.intro(1, "IAM role", "สิทธิ์ที่ GitHub ได้รับชั่วคราว", "ต่อมาสร้าง role ที่ GitHub จะสวมเพื่อปล่อยแอป");
  await L.cap("③ Roles › Create role (Web identity / GitHub)", "ไปที่ Roles แล้วเลือก Create role แบบ Web identity"); await L.click(B("Roles")); await L.click(B("Create role (Web identity", { starts: true }));
  await L.cap("④ จำกัดเฉพาะ repo pharmacy-backend (ห้ามเว้นว่างทั้ง org) + ติ๊กสิทธิ์ ECR กับ ECS", "จุดสำคัญคือต้องจำกัด role ให้ใช้ได้เฉพาะ repo pharmacy backend ห้ามปล่อยว่างทั้ง organization และติ๊กสิทธิ์ที่ต้องใช้ คือ ECR กับ ECS"); await L.hold(3);
  await L.cap("⑤ Create role", "กด Create role"); await L.click(B("Create role", { nth: 0 })); await L.hold(1.2);
  await L.tick(1, "role พร้อมแล้ว", "สร้าง role เรียบร้อย");
  // 3 workflow
  await L.intro(2, "GitHub", "workflow สั่งให้ Actions ทำงาน", "ตอนนี้ไปที่ GitHub สร้าง workflow ที่สั่งให้ Actions ปล่อยแอป");
  const url = await L.ev(`"https://github.com/" + ghUser() + "/pharmacy-backend/actions"`);
  await L.cap("⑥ แท็บ Browser → GitHub repo › Actions", "เปิดแท็บ Browser ไปที่หน้า Actions ของ repo"); await L.click(B("Browser", { nth: 0 }));
  await step("gh1", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); });
  await step("gh2", async () => { await L.sleep(400); await L.type("main input[placeholder], main input[type=text]", url); });
  await L.click(B("Go")); await L.hold(1.5);
  await L.cap("⑦ Create workflow: ใส่ ARN ของ role · push main = dev · tag v* = prd · environment production = ต้องอนุมัติ", "สร้าง workflow ใส่ role ที่เพิ่งสร้าง push เข้า main คือ ปล่อย dev ส่วน tag ขึ้นต้นด้วย v คือ ปล่อย prd และตั้ง environment production เพื่อให้ต้องมีคนอนุมัติ");
  await step("role", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "github-actions-deploy"); }); await L.hold(2);
  await L.click(B("Commit changes")); await L.hold(1.5);
  await L.tick(2, "workflow พร้อมแล้ว", "workflow ถูก commit เข้า repo แล้ว");
  // 4 dev
  await L.intro(3, "deploy dev", "push main ปล่อย dev อัตโนมัติ", "ลอง push เข้า main ดู ระบบจะปล่อย dev ให้เองอัตโนมัติ");
  await L.cap("⑧ git push → main → job deploy-dev ทำงาน", "กด git push เข้า main"); await L.click(B("git push", { starts: true })); await L.hold(1.5);
  await L.cap("เปิด run ดูทีละขั้น: assume role ด้วย OIDC → login ECR → build/push → deploy ECS", "เปิด run ดูทีละขั้น ขอสิทธิ์ผ่าน OIDC ล็อกอิน ECR สร้างและ push image แล้วปล่อยลง ECS"); await L.click({ t: "deploy #1", tag: "a" }); await L.hold(3);
  console.log("RUN1", await txt(380, 1500));
  await L.tick(3, "dev ปล่อยสำเร็จ", "dev ปล่อยสำเร็จ");
  // 5 prd
  await L.intro(4, "deploy prd", "tag v* + คนอนุมัติ", "ต่อไป prd ปล่อยโดยสร้าง tag และต้องรอคนอนุมัติ");
  await L.cap("⑨ สร้าง tag v1.1.0 → job deploy-prd รอ approval", "กลับไปหน้า Actions แล้วสร้าง tag เวอร์ชัน v1.1.0"); await L.click({ t: "Actions", tag: "a", starts: true }); await L.hold(1);
  await L.click(B("create tag + push")); await L.hold(1.5);
  await L.cap("⑩ run #2 หยุดรอที่ environment production → Approve and deploy", "run ของ tag หยุดรอ เพราะ environment production ตั้งให้ต้องมีคนอนุมัติ ผู้ตรวจกด Approve and deploy"); await L.click({ t: "deploy #2", tag: "a" }); await L.hold(2.5);
  await L.click(B("Approve and deploy")); await L.hold(2.5);
  console.log("PRD2", await txt(380, 900));
  await L.tick(4, "prd ปล่อยสำเร็จ", "อนุมัติแล้ว prd ปล่อยสำเร็จ");
  await L.cap("✓ สำเร็จ: OIDC ไม่มี access key · dev อัตโนมัติ · prd ต้องมีคนอนุมัติ", "สรุป ไม่ต้องเก็บ access key ไว้ใน GitHub เลย dev ปล่อยอัตโนมัติเมื่อ push ส่วน prd ต้องผ่านคนอนุมัติ ข้อควรจำคือ role ต้องจำกัดเฉพาะ repo ของเรา"); await L.hold(1);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase5.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
