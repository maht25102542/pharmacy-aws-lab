// Use case 9: Jenkins CI — build ผ่าน → ใส่ password ในโค้ด → SonarQube ล้ม → แก้ → ผ่าน (คลิก/พิมพ์จริงในตัวจำลอง)
const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n); throw e; } } } };
const key = (k, code) => L.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: code === "Enter" ? 13 : 0, text: k === "Enter" ? "\r" : undefined });
// พิมพ์คำสั่งลง Terminal จริง แล้วกด Enter
const term = async (cmd) => { await L.ev(`[].slice.call(document.querySelectorAll("input")).filter(function(e){return e.getBoundingClientRect().width>400})[0].id="__term";1`); await L.type("#__term", cmd); await key("Enter", "Enter"); await L.sleep(500); await L.shot(1); };
const toBrowser = async () => { await L.click(B("Browser", { nth: 0 })); await L.sleep(300); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["build ผ่าน", "🧩"], ["ใส่ password", "⌨️"], ["Sonar ล้ม", "❌"], ["แก้แล้วผ่าน", "✅"]]);
  await L.cap("Use case 9 · Jenkins CI: ด่านตรวจก่อน build image", "use case เก้า Jenkins ซีไอ ก่อนโค้ดจะไปถึง image ต้องผ่านด่านตรวจอัตโนมัติ ถ้าด่านไหนแดง pipeline จะหยุดทันที");
  // เตรียมสภาพแวดล้อม = ของ lab หลัก (Terraform/Ansible/ตั้งค่า Jenkins+Sonar) + build ปกติ 1 รอบ (baseline ของ SonarQube) — บอกในคำบรรยาย
  const ip = JSON.parse(await L.ev(`var r=jkexLoad(""); JSON.stringify({j:r.r.jenkins})`)).j;
  await L.cap("ก่อนเริ่ม: Jenkins/SonarQube ตั้งค่าครบแล้ว และ build ปกติผ่านไป 1 รอบ", "ก่อนเริ่ม สมมติว่า Jenkins กับ SonarQube ตั้งค่าครบแล้วจากแลปหลัก และ build ปกติผ่านไปหนึ่งรอบ เป็นฐานให้ SonarQube เทียบว่าอะไรคือโค้ดใหม่"); await L.hold(1);
  await L.intro(0, "Jenkins", "build ปกติผ่านทุกด่าน", "เริ่มจากดู build ที่ผ่านแล้ว");
  await toBrowser(); await L.ev(`wbGo("http://${ip}:8080/"); render(); 1`); await L.sleep(500);
  await L.cap("① แท็บ Browser › Jenkins › pharmacy-backend: build #1 ผ่าน", "เปิดแท็บ Browser เข้า Jenkins แล้วเลือก job pharmacy backend จะเห็น build หมายเลขหนึ่งผ่านแล้ว");
  await step("job", async () => { await L.click({ t: "pharmacy-backend", tag: "a" }); }); await L.hold(2);
  await L.tick(0, "build ปกติผ่านทุกด่าน", "build ปกติผ่านทุกด่านเรียบร้อย");
  // ใส่ password ในโค้ด
  await L.intro(1, "Terminal", "ทำให้โค้ดมี password ฝังอยู่", "ต่อมา ลองทำพลาดแบบที่ทีมจริงทำบ่อย คือฝัง password ไว้ในโค้ด");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("② เข้า repo-backend แล้วต่อ DB_PASSWORD ท้ายไฟล์เทสต์", "เข้าโฟลเดอร์ repo backend แล้วเติมบรรทัด DB underscore PASSWORD ที่มีรหัสผ่านจริงลงในไฟล์");
  await step("cd", async () => { await term("cd ~/Desktop/work/pharmacy-aws-lab/repo-backend"); });
  await step("echo", async () => { await term(`echo 'DB_PASSWORD = "hunter2-prod"' >> stock/tests/test_api.py`); });
  await L.cap("③ git add · commit · push", "จากนั้น git add, git commit และ git push ขึ้น GitHub");
  await step("add", async () => { await term("git add ."); }); await step("cm", async () => { await term('git commit -m "ทดลอง: secret"'); }); await step("push", async () => { await term("git push"); });
  await L.tick(1, "push โค้ดที่มี password แล้ว", "push เรียบร้อย");
  // build ล้ม
  await L.intro(2, "SonarQube", "ด่านตรวจจับ password ได้", "ต่อมารัน build อีกรอบ แล้วดูว่าด่านไหนแดง");
  await toBrowser(); await L.cap("④ Jenkins › pharmacy-backend › Build with Parameters › Build", "กลับไปที่ Jenkins กด Build with Parameters แล้วกด Build");
  await step("bwp", async () => { await L.click({ t: "Build with Parameters", tag: "a,button", starts: true }); }); await L.hold(1.2);
  await step("build", async () => { await L.click(B("Build", { nth: 0 })); }); await L.hold(1.5);
  await L.cap("⑤ เปิด build #2 › Console Output: SonarQube scan แดง", "เปิด build หมายเลขสอง ดู console output จะเห็นว่า stage SonarQube scan แดง และบอกว่า Quality gate ไม่ผ่าน");
  await L.ev(`W.page="build"; W.bid=jkBuildsOf(S.jk.job).slice(-1)[0].id; W.btab="console"; render(); var pr=[].slice.call(document.querySelectorAll("pre")).sort(function(a,b){return b.scrollHeight-a.scrollHeight})[0]; if(pr){var i=pr.innerText.indexOf("Quality gate status"); if(i>0) pr.scrollTop=pr.scrollHeight*i/pr.innerText.length - 60} 1`); await L.hold(4);
  await L.tick(2, "Quality gate ล้ม ด่านตรวจจับได้", "ด่านตรวจจับ password ได้ pipeline หยุด ไม่มีอะไรหลุดไปถึง E C R");
  // แก้แล้วผ่าน
  await L.intro(3, "แก้แล้ว build ใหม่", "ลบ password แล้วผ่าน", "สุดท้าย ลบ password ออกแล้ว build ใหม่");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("⑥ ลบบรรทัด password → add · commit · push", "ลบบรรทัดที่มี password ออก แล้ว add commit push อีกครั้ง");
  await step("fix", async () => { await term(`sed -i 's/^DB_PASSWORD = .*$//' stock/tests/test_api.py`); });
  await step("add2", async () => { await term("git add ."); }); await step("cm2", async () => { await term('git commit -m "แก้: ลบ password"'); }); await step("push2", async () => { await term("git push"); });
  await toBrowser(); await L.ev(`W.page=""; W.btab=""; render(); 1`); await L.sleep(300);
  await step("job2", async () => { await L.click({ t: "pharmacy-backend", tag: "a" }); }); await L.sleep(300);
  await step("bwp2", async () => { await L.click({ t: "Build with Parameters", tag: "a,button", starts: true }); }); await L.hold(0.8);
  await step("build2", async () => { await L.click(B("Build", { nth: 0 })); }); await L.hold(1.2);
  await L.ev(`W.page="build"; W.bid=jkBuildsOf(S.jk.job).slice(-1)[0].id; W.btab="console"; render(); var pr=[].slice.call(document.querySelectorAll("pre")).sort(function(a,b){return b.scrollHeight-a.scrollHeight})[0]; if(pr) pr.scrollTop=pr.scrollHeight; 1`); await L.hold(3);
  await L.tick(3, "build ผ่านทุกด่านอีกครั้ง", "build ผ่านทุกด่านอีกครั้ง");
  await L.cap("✓ สำเร็จ: ด่านตรวจจับ password ได้ · แก้แล้ว build ผ่าน · image ถึง ECR เฉพาะโค้ดที่ผ่านด่าน", "สรุป ด่านตรวจอัตโนมัติจับ password ที่ฝังในโค้ดได้ก่อนถึง image พอแก้แล้ว build ก็ผ่านและส่ง image ไปที่ E C R ได้");
  await L.encode(require("path").resolve(__dirname, "../videos/usecase9-a.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
