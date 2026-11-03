// Use case 12 ตอน 2: when + post · parallel + error (ล้มตั้งใจ) แล้วแก้ให้ผ่าน
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
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
const putf = async (id, value) => { // ช่อง wbEx ที่มีตัวอย่าง: เลือก "ไม่ระบุ" ก่อน แล้วพิมพ์เอง
  await step("pk" + id, async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await step("ty" + id, async () => { await L.sleep(250); await L.type("#" + id, value); });
};
const SC = {
  s3: "pipeline {\n  agent any\n  environment {\n    APP = 'pharmacy-api'\n  }\n  parameters {\n    choice(name: 'TARGET_ENV', choices: ['dev', 'prd'])\n  }\n  stages {\n    stage('Build') {\n      steps { sh 'docker build -t ${APP} .' }\n    }\n    stage('Test') {\n      steps { sh 'pytest' }\n    }\n    stage('Deploy') {\n      steps { echo \"Deploying ${APP} to ${params.TARGET_ENV}\" }\n    }\n  }\n}\n",
  s4: "pipeline {\n  agent any\n  environment {\n    APP = 'pharmacy-api'\n  }\n  parameters {\n    choice(name: 'TARGET_ENV', choices: ['dev', 'prd'])\n  }\n  stages {\n    stage('Build') {\n      steps { sh 'docker build -t ${APP} .' }\n    }\n    stage('Deploy') {\n      when { expression { params.TARGET_ENV == 'prd' } }\n      steps { echo \"Deploying ${APP} to ${params.TARGET_ENV}\" }\n    }\n  }\n  post {\n    always { echo 'Pipeline finished' }\n    failure { echo 'Pipeline failed' }\n  }\n}\n",
  s5: "pipeline {\n  agent any\n  stages {\n    stage('Checks') {\n      parallel {\n        stage('Lint') { steps { sh 'echo lint ok' } }\n        stage('Unit tests') { steps { sh 'pytest' } }\n      }\n    }\n    stage('Quality gate') {\n      steps { error 'Quality gate failed' }\n    }\n    stage('Deploy') {\n      steps { echo 'Deploying...' }\n    }\n  }\n  post {\n    failure { echo 'Pipeline failed' }\n  }\n}\n",
  s5ok: "pipeline {\n  agent any\n  stages {\n    stage('Checks') {\n      parallel {\n        stage('Lint') { steps { sh 'echo lint ok' } }\n        stage('Unit tests') { steps { sh 'pytest' } }\n      }\n    }\n    stage('Quality gate') {\n      steps { echo 'Quality gate passed' }\n    }\n    stage('Deploy') {\n      steps { echo 'Deploying...' }\n    }\n  }\n  post {\n    failure { echo 'Pipeline failed' }\n  }\n}\n"
};
const freeText = async () => { // ช่อง Script: ปุ่มตัวอย่างต้องเลือก "ไม่ระบุ — พิมพ์เอง" ก่อนถึงจะพิมพ์ได้ แล้วล้างตัวอย่างเดิม
  const cur = await L.ev(`(function(){ var b=[].slice.call(document.querySelectorAll("main button")).filter(function(x){return /^(ตัวอย่าง:|— เลือกตัวอย่าง —)/.test(x.innerText.trim())})[0]; return b ? b.innerText.trim() : ""; })()`);
  if (cur) await step("fr", async () => { await L.pickBtn(cur, "ไม่ระบุ"); }); await L.sleep(500);
  await L.ev(`var t=document.querySelector("main textarea"); if(t){ t.value=""; t.dispatchEvent(new Event("input",{bubbles:true})); t.focus(); } 1`);
};
const jobPage = async (JURL) => { await L.ev(`wbGo("${JURL}/"); render(); W.page=""; W.btab=""; W.cfgSec=""; render(); 1`); await L.sleep(400); await step("jb", async () => { await L.click({ t: "hello-pipeline", tag: "a" }); }); await L.sleep(400); };
const setScript = async (text) => { // Configure › Pipeline › Definition = Pipeline script › ล้างตัวอย่าง แล้วพิมพ์สคริปต์ → Save
  await step("cfg", async () => { await L.click({ t: "Configure", tag: "a,button", starts: true }); }); await L.sleep(500);
  await step("pip", async () => { await L.click({ t: "Pipeline", tag: "a,button", starts: true }); }); await L.sleep(500);
  await L.ev(`var sel=document.querySelector('select[aria-label="Definition"]'); if(sel && sel.value!=="script"){ sel.value="script"; sel.dispatchEvent(new Event("change",{bubbles:true})); } 1`); await L.sleep(500);
  await freeText();
  await step("typ", async () => { await L.type("main textarea", text); }); await L.hold(3);
  await step("sv", async () => { await L.click(B("Save", { nth: 0 })); }); await L.hold(1.5);
};
const doBuild = async () => { // กด Build with Parameters (ถ้ามี) ไม่งั้น Build Now
  const hasP = await L.ev(`!![].slice.call(document.querySelectorAll("a,button")).filter(function(e){return /^Build with Parameters/.test(e.innerText.trim())})[0]`);
  if (hasP) { await step("bwp", async () => { await L.click({ t: "Build with Parameters", tag: "a,button", starts: true }); }); await L.hold(1.5); await step("bb", async () => { await L.click(B("Build", { nth: 0 })); }); }
  else await step("bn", async () => { await L.click({ t: "Build Now", tag: "a,button", starts: true }); });
  await L.hold(2);
};
const showConsole = async (secs) => { await L.ev(`W.page="build"; W.bid=jkBuildsOf(S.jk.job).slice(-1)[0].id; W.btab="console"; render(); var pr=[].slice.call(document.querySelectorAll("pre")).sort(function(a,b){return b.scrollHeight-a.scrollHeight})[0]; if(pr) pr.scrollTop=pr.scrollHeight; 1`); await L.hold(secs || 5); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["④ when + post", "🧩"], ["⑤ parallel + error", "🧩"], ["แก้ให้ผ่าน", "✅"]]);
  await L.cap("Use case 12 ตอน 2 · when, post, parallel และ error (ล้มตั้งใจ)", "use case สิบสอง ตอน สอง เขียน when กับ post และ parallel กับ error ทำให้ build ล้มตั้งใจ แล้วแก้ให้ผ่าน"); await L.hold(1);
  const R = JSON.parse(await L.ev(`var r=buildReady("demo"); S.jk.jobs=[]; S.jk.builds=[]; S.jk.job=null; jkCreateJob({name:"hello-pipeline",defn:"script",inline:${JSON.stringify(SC.s3)}},true); jkSelect("hello-pipeline"); jkNew({}); JSON.stringify({j:r.jenkins})`));
  const JURL = `http://${R.j}:8080`;
  await L.cap("ก่อนเริ่ม: มี job hello-pipeline จากตอน 1 (สคริปต์ขั้น ③ ที่มี parameters) และ build ไปแล้วหนึ่งรอบ", "ก่อนเริ่ม มี job hello pipeline จากตอนที่หนึ่ง สคริปต์ขั้นสามที่มี parameters และ build ไปแล้วหนึ่งรอบ"); await L.hold(1);
  await toBrowser(); await L.ev(`wbGo("${JURL}/"); render(); W.page=""; render(); 1`); await L.sleep(500);
  // ④ when + post
  await L.intro(0, "④ when + post", "ข้าม stage ตามเงื่อนไข + รันท้ายเสมอ", "ขั้นแรก เขียน when และ post");
  await jobPage(JURL);
  await L.cap("Configure: stage('Deploy') { when { expression { params.TARGET_ENV == 'prd' } } … } · post { always { echo … } failure { echo … } } → Save", "เพิ่ม when ที่ stage deploy ให้รันเฉพาะเมื่อ target env เป็น prd และเพิ่ม post สองแบบคือ always รันเสมอ และ failure รันเมื่อล้ม แล้วบันทึก");
  await setScript(SC.s4);
  await L.cap("Build with Parameters: TARGET_ENV = dev → Console: Stage \"Deploy\" skipped due to when conditional · post always รันท้ายสุด", "build ด้วย target env เป็น dev จะเห็นว่า stage deploy ถูกข้าม เพราะเงื่อนไข when ไม่ตรง และ post always ยังรันท้ายสุด");
  await doBuild(); await L.hold(2); await showConsole(7);
  await jobPage(JURL);
  await L.cap("Build with Parameters: TARGET_ENV = prd → Deploy รัน (เงื่อนไขตรง)", "ลอง build ด้วย target env เป็น prd ตอนนี้ stage deploy รัน เพราะเงื่อนไขตรง");
  await step("bwp", async () => { await L.click({ t: "Build with Parameters", tag: "a,button", starts: true }); }); await L.hold(1.2);
  await step("tp", async () => { await L.pickBtn("dev", "prd"); }); await L.hold(1); await step("bb", async () => { await L.click(B("Build", { nth: 0 })); }); await L.hold(2); await showConsole(6);
  await L.tick(0, "④ when ข้าม stage · post รันท้ายเสมอ", "when และ post ผ่าน");
  // ⑤ parallel + error
  await L.intro(1, "⑤ parallel + error", "รันขนาน + ล้มตั้งใจ", "ต่อมา เขียน parallel และ error ให้ล้มตั้งใจ");
  await jobPage(JURL);
  await L.cap("Configure: stage('Checks') { parallel { Lint · Unit tests } } · stage('Quality gate') { steps { error 'Quality gate failed' } } · post failure → Save → Build", "เขียน stage checks ที่รัน lint กับ unit tests ขนานกัน แล้วเพิ่ม stage quality gate ที่เรียก error ให้ล้มตั้งใจ");
  await setScript(SC.s5); await doBuild(); await L.hold(2);
  await jobPage(JURL); await L.hold(5);
  await L.cap("ผล: Stage View — Checks เขียว · Quality gate แดง · Deploy = not run · Console: ERROR: Quality gate failed · Finished: FAILURE · post failure ทำงาน", "ผลคือ checks ผ่าน quality gate เป็นสีแดง และ deploy ไม่รัน เพราะ stage ก่อนหน้าล้ม console บอกว่า quality gate failed และ post failure ยังทำงาน");
  await showConsole(8);
  await L.tick(1, "⑤ parallel + error: ล้มตามที่ตั้งใจ", "ล้มตามที่ตั้งใจ");
  // แก้ให้ผ่าน
  await L.intro(2, "แก้ให้ผ่าน", "เปลี่ยน error เป็น echo", "สุดท้าย แก้ให้ผ่าน");
  await jobPage(JURL);
  await L.cap("แก้: เปลี่ยน error 'Quality gate failed' เป็น echo 'Quality gate passed' → Save → Build → SUCCESS · Deploy รัน", "แก้โดยเปลี่ยน error เป็น echo แล้วบันทึกและ build ใหม่ รอบนี้ผ่านทุก stage");
  await setScript(SC.s5ok); await doBuild(); await L.hold(2); await jobPage(JURL); await L.hold(4); await showConsole(6);
  await L.tick(2, "แก้แล้วผ่านทุก stage", "แก้แล้วผ่านทุก stage");
  await L.costScene("jenkinsfile", "เรื่องค่าใช้จ่าย การเขียน pipeline ไม่เสียเพิ่ม ค่าใช้จ่ายคือเครื่อง jenkins ที่เปิดตลอด ควรตั้ง Budget และ destroy เมื่อเลิกใช้");
  await L.cap("✓ ตอน 2 เสร็จ: when ข้าม stage · post รันท้ายเสมอ · parallel รันขนาน · error ทำให้ล้ม (stage ถัดไป not run) · ต่อไปย้ายสคริปต์เข้า Jenkinsfile ใน repo", "สรุป when ข้าม stage post รันท้ายเสมอ parallel รันขนาน และ error ทำให้ล้ม ต่อไปย้ายสคริปต์ไปเป็นไฟล์ jenkinsfile ใน repo"); await L.hold(1.5);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase12b-a.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
