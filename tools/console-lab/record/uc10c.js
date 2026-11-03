// Use case 10 ตอน C: webhook ละเอียด: SG 8080 ให้ GitHub (เปิดไฟล์) + trigger ใน Jenkinsfile/job + ตั้ง webhook ที่ GitHub (secret) + push develop + Recent delivery
const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n); throw e; } } } };
const key = (k, code) => L.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: code === "Enter" ? 13 : 0, text: k === "Enter" ? "\r" : undefined });
// พิมพ์คำสั่งลง Terminal จริง แล้วกด Enter
const term = async (cmd) => { await L.ev(`[].slice.call(document.querySelectorAll("input")).filter(function(e){return e.getBoundingClientRect().width>400})[0].id="__term";1`); await L.type("#__term", cmd); await key("Enter", "Enter"); await L.sleep(500); await L.shot(1); };
const toBrowser = async () => { await L.click(B("Browser", { nth: 0 })); await L.sleep(300); };
// เปิดไฟล์ใน Laptop › Files & editor แล้วค้างไว้ให้ผู้ดูหยุดเทียบเอง (ไม่อธิบายทีละบรรทัด): เลื่อนไปที่ anchor แล้วค้างตาม secs; pages>1 = เลื่อนต่อทีละหน้า
const viewFile = async (rel, anchor, secs, pages, endAnchor) => { // เปิดไฟล์ใน Files & editor · anchor..endAnchor = ช่วงที่ไฮไลต์ (ชี้ว่าไฟล์นี้ตรงกับสิ่งที่เพิ่งกด)
  await L.click(B("Laptop", { nth: 0 })); await step("fe", async () => { await L.click({ t: "📁 Files & editor", tag: "button", starts: true }); }); await L.sleep(300);
  await step("f:" + rel, async () => { await L.click({ t: rel, tag: "button" }); }); await L.sleep(500);
  await L.ev(`(function(a,e){var t=document.getElementById("edtxt"); if(!t) return; var i=a?t.value.indexOf(a):0; if(i<0)i=0; var lh=parseFloat(getComputedStyle(t).lineHeight)||17; t.scrollTop=t.value.slice(0,i).split("\\n").length*lh-lh*2; if(a){ var j=e?t.value.indexOf(e,i+a.length):-1; if(j<0){ j=t.value.indexOf("\\n\\n",i); if(j<0) j=Math.min(t.value.length,i+400); } else j+=e.length; t.focus({preventScroll:true}); t.setSelectionRange(i,j); } })(${JSON.stringify(anchor || "")},${JSON.stringify(endAnchor || "")}); 1`);
  await L.hold(secs || 9);
  for (let p = 1; p < (pages || 1); p++) { await L.ev(`(function(){var t=document.getElementById("edtxt"); t.scrollTop+=t.clientHeight-30; })(); 1`); await L.hold(secs || 9); }
};
const openUrl = async (url, direct) => { if (direct) { await L.ev(`wbGo(${JSON.stringify(url)}); render(); 1`); await L.hold(1.2); return; } if (await L.ev(`!![].slice.call(document.querySelectorAll("button")).filter(function(b){return b.innerText.trim()==="— เลือกตัวอย่าง —"})[0]`)) await step("pick", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await L.sleep(300); await step("url", async () => { await L.type("main input[placeholder], main input[type=text]", url); }); await L.click(B("Go")); await L.hold(1.2); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["SG 8080 ← GitHub", "🏗️"], ["trigger ใน Jenkins", "🧩"], ["webhook ที่ GitHub", "🐱"], ["git push develop", "⌨️"], ["Recent delivery", "✅"]]);
  await L.cap("Use case 10 ตอน C · ตั้ง webhook ให้ push แล้ว Jenkins รันเอง", "use case สิบ ตอน ซี ตั้ง webhook ให้ push แล้ว jenkins รันเอง จะเปิดไฟล์ที่เกี่ยวข้องให้เทียบ แล้วตั้งค่าที่ jenkins กับ github และลอง push"); await L.hold(1);
  const R = JSON.parse(await L.ev(`var r=buildReady("demo"); readyPushCmds().forEach(function(c){shRun(c)}); readyBuild("dev"); JSON.stringify({j:r.jenkins,u:r.user,rp:REPO})`));
  const JURL = `http://${R.j}:8080`, GH = `https://github.com/${R.u}/pharmacy-backend`;
  await L.cap("ก่อนเริ่ม: ตอน A และ B เสร็จแล้ว (เครื่อง dev, Jenkins ปล่อย dev ด้วยมือได้) ตอนนี้ทำให้ push แล้วรันเอง", "ก่อนเริ่ม ตอน เอ และ บี เสร็จแล้ว เครื่อง dev พร้อมและ jenkins ปล่อย dev ด้วยมือได้ ตอนนี้ทำให้ push แล้วรันเอง"); await L.hold(1);
  // 1 SG
  await L.intro(0, "Security Group", "เปิด 8080 ให้ IP ของ GitHub", "ขั้นแรก ต้องให้ github ส่งคำขอเข้ามาที่ jenkins ได้");
  await L.cap("① terraform/security.tf › SG pharmacy-jenkins: ingress 8080 จาก github_hook_cidrs", "ไฟล์ security dot t f ส่วน security group ของ jenkins มี rule เปิดพอร์ตแปดศูนย์แปดศูนย์ให้ IP ของ github"); await viewFile("terraform/security.tf", "GitHub webhook", 11);
  await L.cap("② terraform/variables.tf › github_hook_cidrs (ค่าจริงดูที่ api.github.com/meta ช่อง hooks)", "และตัวแปร github hook cidrs ใน variables dot t f ค่าจริงเปลี่ยนได้ ดูที่ api dot github dot com slash meta"); await viewFile("terraform/variables.tf", 'variable "github_hook_cidrs"', 10);
  await L.tick(0, "SG เปิด 8080 ให้ GitHub (Terraform)", "security group เปิดให้ github เข้า jenkins ได้แล้ว");
  // 2 trigger
  await L.intro(1, "trigger", "Jenkinsfile + job ต้องรับ webhook", "ต่อมา ฝั่ง jenkins ต้องรู้ว่าจะรับ webhook");
  await L.cap("③ repo-backend/Jenkinsfile › triggers { githubPush() } (ใช้ปลั๊กอิน github)", "ใน jenkinsfile มี triggers github push ซึ่งใช้ปลั๊กอิน github"); await viewFile("repo-backend/Jenkinsfile", "triggers {", 10);
  await toBrowser(); await L.ev(`wbGo("${JURL}/"); render(); 1`); await L.sleep(500);
  await L.cap("④ Jenkins › pharmacy-backend › Configure › Triggers: ติ๊ก GitHub hook trigger · Pipeline: Branch Specifier = */develop", "ใน job ต้องติ๊ก github hook trigger ที่แท็บ triggers และตั้ง branch specifier เป็น star slash develop ที่แท็บ pipeline");
  await step("job", async () => { await L.click({ t: "pharmacy-backend", tag: "a" }); }); await L.sleep(300);
  await step("cfg", async () => { await L.click({ t: "Configure", tag: "a,button", starts: true }); }); await L.sleep(300);
  await step("trg", async () => { await L.click({ t: "Triggers", tag: "a,button", starts: true }); }); await L.hold(3);
  await step("pip", async () => { await L.click({ t: "Pipeline", tag: "a,button", starts: true }); }); await L.sleep(300);
  await step("br", async () => { await L.fill("Branch Specifier", "*/develop"); }); await L.hold(1.5);
  await step("sv", async () => { await L.click(B("Save", { nth: 0 })); }); await L.hold(1.2);
  await L.cap("⑤ กันคนอื่นยิง webhook ปลอม: Manage Jenkins › Credentials › Add Credentials › Secret text · ID = github-webhook-secret (ค่าเดียวกับ Secret ที่จะใส่ที่ GitHub)", "กันไม่ให้คนอื่นยิง webhook ปลอมมาสั่ง build ด้วยการสร้าง credential แบบ secret text ชื่อ github webhook secret ค่าเดียวกับ secret ที่จะใส่ที่ github แล้วเลือกเป็น shared secret ที่หน้า system ของ jenkins ตัวจำลองข้ามหน้านั้น");
  await L.ev(`W.page=""; W.btab=""; W.cfgSec=""; render(); 1`); await L.sleep(300);
  await step("mj", async () => { await L.click({ t: "Manage Jenkins", tag: "a,button", starts: true }); }); await L.sleep(300);
  await step("cr", async () => { await L.click({ t: "Credentials", tag: "a,button,div", starts: true }); }); await L.sleep(300);
  await step("addc", async () => { await L.click(B("Add Credentials", { nth: 0 })); }); await L.sleep(300);
  await step("kind", async () => { await L.pickBtn("Username with password", "Secret text"); });
  await step("cs", async () => { await L.fill("Secret", "lab-webhook-secret"); }); await step("ci", async () => { await L.fill("ID", "github-webhook-secret"); }); await L.hold(1.5);
  await step("create", async () => { await L.click(B("Create", { nth: 0 })); }); await L.hold(1.5);
  if (!(await L.ev(`!!jkCred("github-webhook-secret")`))) { console.log("FAIL secret cred not created"); await L.finish(); process.exit(1); }
  await L.tick(1, "Jenkins รับ webhook แล้ว", "jenkins พร้อมรับ webhook ที่ branch develop");
  // 3 webhook ที่ GitHub
  await L.intro(2, "GitHub", "ตั้ง webhook (URL · content type · secret · event)", "ต่อมา ตั้ง webhook ที่ github");
  await L.cap("⑥ repo › Settings › Webhooks › Add webhook (ต้องล็อกอินก่อน)", "เปิดหน้า settings ของ repo ที่ webhooks ต้องล็อกอินก่อน");
  await openUrl(GH + "/settings/hooks/new");
  await step("lg1", async () => { await L.type("#login_field", R.u); }); await step("lg2", async () => { await L.type("#password", "lab-password"); }); await step("lg3", async () => { await L.click(B("Sign in", { nth: 0 })); }); await L.hold(1.2);
  if (!(await L.ev(`!!document.getElementById("gh-hurl")`))) await openUrl(GH + "/settings/hooks/new");
  await L.cap("⑦ Payload URL = http://<Jenkins>:8080/github-webhook/ · Content type application/json · Secret (ค่าเดียวกับใน Jenkins) · Just the push event", "ใส่ payload url เป็นที่อยู่ jenkins ตามด้วย github dash webhook ชนิดข้อมูลเป็น json ตั้ง secret และเลือกเฉพาะ push event");
  await step("hurl", async () => { await L.type("#gh-hurl", `${JURL}/github-webhook/`); }); await L.hold(1.2);
  await step("hsec", async () => { await L.type('input[aria-label="Secret"]', "lab-webhook-secret"); }); await L.hold(1.5);
  await step("hadd", async () => { await L.click(B("Add webhook", { nth: 0 })); }); await L.hold(2);
  await L.tick(2, "ตั้ง webhook ที่ GitHub แล้ว", "ตั้ง webhook เรียบร้อย");
  // 4 push
  await L.intro(3, "Terminal", "สร้าง develop แล้ว push", "ลอง push เข้า branch develop");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("⑧ git switch -c develop · แก้ README · add · commit · git push -u origin develop", "สร้าง branch develop แก้ไฟล์ readme แล้ว add commit และ push");
  await step("cd", async () => { await term(`cd ${R.rp}/repo-backend`); }); await step("sw", async () => { await term("git switch -c develop"); });
  await step("ed", async () => { await term(`echo '# ทดสอบ webhook' >> README.md`); }); await step("ad", async () => { await term("git add ."); }); await step("cm", async () => { await term('git commit -m "ทดสอบ webhook"'); });
  await step("ps", async () => { await term("git push -u origin develop"); }); await L.hold(2);
  await L.tick(3, "push develop แล้ว", "push เข้า develop เรียบร้อย");
  // 5 Recent delivery + build
  await L.intro(4, "ผลลัพธ์", "GitHub: delivery 200 · Jenkins: build เกิดเอง", "ลองดูผลทั้งสองฝั่ง");
  await toBrowser(); await L.ev(`wbGo("${GH}/settings/hooks"); render(); 1`); await L.hold(1);
  await L.cap("⑨ GitHub › Settings › Webhooks: Recent delivery 200 · Jenkins เริ่ม build (tag dev-<sha7>)", "ที่หน้า webhooks ของ github จะเห็น delivery ล่าสุดเป็น สองร้อย และข้อความว่า jenkins เริ่ม build แล้ว"); await L.hold(5);
  await L.ev(`wbGo("${JURL}/"); render(); 1`); await L.sleep(400);
  await L.cap("⑩ Jenkins › pharmacy-backend: build ใหม่เกิดเอง · Started by GitHub push", "ที่ jenkins จะเห็น build ใหม่เกิดขึ้นเอง ขึ้นว่า started by github push");
  await step("job2", async () => { await L.click({ t: "pharmacy-backend", tag: "a" }); }); await L.hold(1.5);
  await L.ev(`W.page="build"; W.bid=jkBuildsOf(S.jk.job).slice(-1)[0].id; W.btab="console"; render(); var pr=[].slice.call(document.querySelectorAll("pre")).sort(function(a,b){return b.scrollHeight-a.scrollHeight})[0]; if(pr) pr.scrollTop=0; 1`); await L.hold(5);
  await L.tick(4, "push แล้ว Jenkins รันเอง", "push แล้ว jenkins รันเองได้แล้ว");
  await L.costScene("jkpush", "เรื่องค่าใช้จ่าย webhook ไม่มีค่าใช้จ่ายเพิ่ม ค่าใช้จ่ายอยู่ที่เครื่อง jenkins sonarqube และเครื่อง dev ที่เปิดตลอด ควรตั้ง Budget และ destroy เมื่อเลิกใช้");
  await L.cap("✓ ตอน C เสร็จ: SG · trigger · webhook · push develop → Jenkins รันเอง (ดูภาพรวมในวิดีโอสุดท้าย)", "สรุป ตั้ง security group trigger และ webhook ครบ push แล้ว jenkins รันเอง"); await L.hold(1.5);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase10c-b.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
