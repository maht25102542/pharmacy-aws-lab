// Use case 10: deploy dev ปกติ: ตั้ง webhook + job ดู develop → git push develop → Jenkins รันเอง → compose บน pharmacy-dev → เว็บ dev (คลิก/พิมพ์จริงในตัวจำลอง)
const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n); throw e; } } } };
const key = (k, code) => L.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: code === "Enter" ? 13 : 0, text: k === "Enter" ? "\r" : undefined });
// พิมพ์คำสั่งลง Terminal จริง แล้วกด Enter
const term = async (cmd) => { await L.ev(`[].slice.call(document.querySelectorAll("input")).filter(function(e){return e.getBoundingClientRect().width>400})[0].id="__term";1`); await L.type("#__term", cmd); await key("Enter", "Enter"); await L.sleep(500); await L.shot(1); };
const toBrowser = async () => { await L.click(B("Browser", { nth: 0 })); await L.sleep(300); };
const openUrl = async (url, direct) => { if (direct) { await L.ev(`wbGo(${JSON.stringify(url)}); render(); 1`); await L.hold(1.2); return; } if (await L.ev(`!![].slice.call(document.querySelectorAll("button")).filter(function(b){return b.innerText.trim()==="— เลือกตัวอย่าง —"})[0]`)) await step("pick", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await L.sleep(300); await step("url", async () => { await L.type("main input[placeholder], main input[type=text]", url); }); await L.click(B("Go")); await L.hold(1.2); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["เตรียม develop", "⌨️"], ["Webhook", "🐱"], ["Job ดู develop", "🧩"], ["git push develop", "⌨️"], ["Jenkins รันเอง", "✅"], ["เว็บ dev", "🌐"]]);
  await L.cap("Use case 10 · deploy dev ปกติ: git push develop แล้ว Jenkins รันเอง", "use case สิบ วิธีที่ทีมจริงปล่อย dev ทุกวัน แค่ push โค้ดเข้า branch develop แล้ว Jenkins ตรวจ build และปล่อยขึ้นเว็บ dev ให้เอง ไม่มีใครต้องไปกด build"); await L.hold(1);
  // prerequisite = lab หลัก (Terraform/Ansible/Jenkins/Sonar ตั้งค่าแล้ว + dev ปล่อยด้วยมือครั้งแรกแล้ว)
  const R = JSON.parse(await L.ev(`var r=jkexLoad("").r; JSON.stringify({j:r.jenkins,alb:r.alb,u:r.user})`));
  const REPO = await L.ev(`REPO`), JURL = `http://${R.j}:8080`, GH = `https://github.com/${R.u}/pharmacy-backend`;
  await L.cap("ก่อนเริ่ม: ระบบจาก lab หลักพร้อมแล้ว (Jenkins, SonarQube, VM dev รัน docker compose) และ dev ปล่อยด้วยมือไปแล้วหนึ่งรอบ", "ก่อนเริ่ม ระบบจาก lab หลักต้องพร้อม คือ Jenkins กับ SonarQube ตั้งค่าแล้ว VM dev รัน docker compose และ dev ถูกปล่อยด้วยมือมาแล้วหนึ่งรอบ ในวิดีโอนี้เราจะทำให้การปล่อยครั้งต่อไปเกิดขึ้นเองเมื่อ push"); await L.hold(1);
  // 1 สร้าง develop
  await L.intro(0, "Terminal", "สร้าง branch develop แล้ว push ขึ้น GitHub", "ขั้นแรก สร้าง branch develop แล้ว push ขึ้น GitHub");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("① เข้า repo-backend · git switch -c develop · git push -u origin develop", "เข้าโฟลเดอร์ repo backend สร้าง branch develop แล้ว push ขึ้น GitHub ตอนนี้ยังไม่มี webhook จึงยังไม่มีอะไรเกิดขึ้นที่ Jenkins");
  await step("cd", async () => { await term(`cd ${REPO}/repo-backend`); });
  await step("sw", async () => { await term("git switch -c develop"); });
  await step("pu", async () => { await term("git push -u origin develop"); });
  await L.tick(0, "branch develop อยู่บน GitHub แล้ว", "branch develop อยู่บน GitHub แล้ว แต่ยังไม่มี build เพราะยังไม่ได้ตั้ง webhook");
  // 2 webhook
  await L.intro(1, "GitHub", "ตั้ง webhook ให้ยิงมาที่ Jenkins", "ต่อมา ตั้ง webhook ที่ GitHub ให้บอก Jenkins ทุกครั้งที่มีการ push");
  await toBrowser();
  await L.cap("② GitHub › repo pharmacy-backend › Settings › Webhooks › Add webhook", "เปิดหน้า Settings ของ repo ไปที่ Webhooks แล้วกด Add webhook"); await openUrl(GH + "/settings/hooks/new");
  await L.cap("หน้า Settings ต้องล็อกอิน GitHub ก่อน (ตัวจำลองรับชื่อและรหัสอะไรก็ได้)", "หน้า Settings ต้องล็อกอิน GitHub ก่อน ตัวจำลองรับชื่อผู้ใช้และรหัสผ่านอะไรก็ได้");
  await step("lg1", async () => { await L.type("#login_field", R.u); }); await step("lg2", async () => { await L.type("#password", "lab-password"); }); await step("lg3", async () => { await L.click(B("Sign in", { nth: 0 })); }); await L.hold(1.2);
  if (!(await L.ev(`!!document.getElementById("gh-hurl")`))) await openUrl(GH + "/settings/hooks/new");
  await L.cap("③ Payload URL = http://<Jenkins>:8080/github-webhook/ · Just the push event → Add webhook", "ใส่ Payload URL เป็นที่อยู่ของ Jenkins ตามด้วย github dash webhook เลือก Just the push event แล้วกด Add webhook");
  await step("hurl", async () => { await L.type("#gh-hurl", `${JURL}/github-webhook/`); }); await L.hold(1.5);
  await step("hadd", async () => { await L.click(B("Add webhook", { nth: 0 })); }); await L.hold(1.5);
  await L.tick(1, "webhook ชี้ไป Jenkins แล้ว", "ตั้ง webhook เรียบร้อย GitHub จะยิงมาที่ Jenkins ทุกครั้งที่ push");
  // 3 job
  await L.intro(2, "Jenkins job", "ให้ job ดู branch develop", "ต่อมา ตั้ง job ใน Jenkins ให้ดู branch develop");
  await openUrl(JURL + "/", true);
  await L.ev(`W.page=""; W.btab=""; W.cfgSec=""; render(); 1`); await L.sleep(300);
  await L.cap("④ pharmacy-backend › Configure › Pipeline › Branch Specifier = */develop", "เปิด job pharmacy backend ไปที่ Configure แท็บ Pipeline แล้วเปลี่ยน Branch Specifier เป็น star slash develop");
  await step("job", async () => { await L.click({ t: "pharmacy-backend", tag: "a" }); }); await L.sleep(300);
  await step("cfg", async () => { await L.click({ t: "Configure", tag: "a,button", starts: true }); }); await L.sleep(300);
  await step("trg", async () => { await L.click({ t: "Triggers", tag: "a,button", starts: true }); }); await L.hold(2);
  await L.cap("⑤ Triggers: ติ๊ก GitHub hook trigger for GITScm polling (ติ๊กไว้แล้ว) · Jenkinsfile มี triggers { githubPush() } ด้วย", "แท็บ Triggers ต้องติ๊ก GitHub hook trigger ไว้ ซึ่งติ๊กอยู่แล้ว และใน Jenkinsfile ก็มี githubPush ประกาศไว้ด้วย");
  await step("pip", async () => { await L.click({ t: "Pipeline", tag: "a,button", starts: true }); }); await L.sleep(300);
  await step("br", async () => { await L.fill("Branch Specifier", "*/develop"); }); await L.hold(1.2);
  await step("sv", async () => { await L.click(B("Save", { nth: 0 })); }); await L.hold(1.2);
  await L.tick(2, "job ดู branch develop แล้ว", "job ดู branch develop แล้ว");
  // 4 push
  await L.intro(3, "Terminal", "แก้โค้ดแล้ว push เข้า develop", "ถึงเวลาลอง แก้โค้ดแล้ว push เข้า develop");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("⑥ แก้ README · git add · commit · push", "แก้ไฟล์ readme เล็กน้อย แล้ว git add git commit และ git push");
  await step("ed", async () => { await term(`echo '# แก้ไขเล็กน้อยบน develop' >> README.md`); });
  await step("ad", async () => { await term("git add ."); }); await step("cm", async () => { await term('git commit -m "แก้: ข้อความ README"'); }); await step("ps", async () => { await term("git push"); });
  await L.tick(3, "push เข้า develop แล้ว", "push เข้า develop เรียบร้อย ต่อไปไม่ต้องกดอะไรอีก");
  // 5 Jenkins รันเอง
  await L.intro(4, "Jenkins", "build เริ่มเองจาก push", "ลองกลับไปดู Jenkins จะเห็นว่ามี build ใหม่เกิดขึ้นเอง");
  await toBrowser(); await L.ev(`W.page=""; W.btab=""; render(); 1`); await L.sleep(300);
  await L.cap("⑦ Jenkins › pharmacy-backend: build #2 เกิดเอง · Started by GitHub push · tag dev-<sha7>", "เปิด job pharmacy backend จะเห็น build หมายเลขสอง เกิดขึ้นเอง ที่หัว console บอกว่า Started by GitHub push และ tag ของ image ขึ้นต้นด้วย dev ตามด้วยรหัส commit");
  await step("job2", async () => { await L.click({ t: "pharmacy-backend", tag: "a" }); }); await L.hold(1.5);
  await L.ev(`W.page="build"; W.bid=jkBuildsOf(S.jk.job).slice(-1)[0].id; W.btab="console"; render(); var pr=[].slice.call(document.querySelectorAll("pre")).sort(function(a,b){return b.scrollHeight-a.scrollHeight})[0]; if(pr) pr.scrollTop=0; 1`); await L.hold(3);
  await L.cap("⑧ ตรวจ → push ECR → Deploy dev (ssh ไปสั่ง docker compose บน pharmacy-dev)", "build ผ่านด่านตรวจ แล้ว push image ขึ้น E C R จากนั้น stage Deploy dev ssh เข้าเครื่อง dev ไปสั่ง docker compose ให้ดึง image ใหม่");
  await L.ev(`var pr=[].slice.call(document.querySelectorAll("pre")).sort(function(a,b){return b.scrollHeight-a.scrollHeight})[0]; if(pr){var i=pr.innerText.indexOf("Deploy dev"); if(i>0) pr.scrollTop=pr.scrollHeight*i/pr.innerText.length;} 1`); await L.hold(3.5);
  await L.tick(4, "Jenkins ตรวจและปล่อย dev เอง", "Jenkins ตรวจและปล่อย dev ให้เองโดยไม่มีใครกด build");
  // 6 เว็บ
  await L.intro(5, "เว็บ dev", "เปิดผ่าน ALB พอร์ต 8080", "สุดท้าย เปิดเว็บ dev ผ่าน load balancer พอร์ตแปดศูนย์แปดศูนย์");
  await L.cap("⑨ แท็บ Browser › http://<ALB>:8080 → เว็บ dev ที่เป็น image ใหม่", "เปิด ALB พอร์ตแปดศูนย์แปดศูนย์ จะเห็นเว็บ dev ที่รัน image ใหม่");
  await openUrl(`http://${R.alb}:8080`, true); await L.hold(3);
  await L.tick(5, "เว็บ dev ขึ้นด้วย image ใหม่", "เว็บ dev ขึ้นด้วย image ใหม่แล้ว");
  await L.costScene("jkpush", "เรื่องค่าใช้จ่าย เหมือน use case เก้า Jenkins กับ SonarQube คือ EC2 สองเครื่องที่เปิดตลอด และ VM dev อีกเครื่องที่รัน docker compose การ push ถี่ขึ้นแทบไม่เพิ่มค่าใช้จ่าย ควรตั้ง Budget และ destroy เมื่อเลิกใช้");
  await L.cap("✓ สำเร็จ: git push develop → webhook → Jenkins ตรวจ+build+ปล่อย dev เอง · prd ยังกดเองด้วย tag vN.N.N", "สรุป dev ปล่อยเองทุกครั้งที่ push เข้า develop ส่วน prd ยังกดเองด้วย tag เวอร์ชัน และผ่านคนอนุมัติ"); await L.hold(1.5);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase10-b.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
