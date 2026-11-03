// Use case 12 ตอน 1: เขียน Jenkinsfile (Pipeline script) ① hello ② หลาย stage ③ environment + parameters
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
  s1: "pipeline {\n  agent any\n  stages {\n    stage('Hello') {\n      steps {\n        echo 'Hello Jenkins'\n      }\n    }\n  }\n}\n",
  s2: "pipeline {\n  agent any\n  stages {\n    stage('Build') {\n      steps { sh 'docker build -t pharmacy-api .' }\n    }\n    stage('Test') {\n      steps { sh 'pytest' }\n    }\n    stage('Deploy') {\n      steps { echo 'Deploying...' }\n    }\n  }\n}\n",
  s3: "pipeline {\n  agent any\n  environment {\n    APP = 'pharmacy-api'\n  }\n  parameters {\n    choice(name: 'TARGET_ENV', choices: ['dev', 'prd'])\n  }\n  stages {\n    stage('Build') {\n      steps { sh 'docker build -t ${APP} .' }\n    }\n    stage('Test') {\n      steps { sh 'pytest' }\n    }\n    stage('Deploy') {\n      steps { echo \"Deploying ${APP} to ${params.TARGET_ENV}\" }\n    }\n  }\n}\n"
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
  await L.plan([["① hello", "🧩"], ["② หลาย stage", "🧩"], ["③ environment + parameters", "🧩"]]);
  await L.cap("Use case 12 ตอน 1 · เขียน Jenkinsfile ตั้งแต่ศูนย์: hello → หลาย stage → parameters", "use case สิบสอง ตอน หนึ่ง เขียน jenkinsfile ตั้งแต่ศูนย์ ทีละขั้น พิมพ์ในหน้า jenkins แล้วกด build ดูผลทันที"); await L.hold(1);
  const R = JSON.parse(await L.ev(`var r=buildReady("demo"); S.jk.jobs=[]; S.jk.builds=[]; S.jk.job=null; JSON.stringify({j:r.jenkins})`));
  const JURL = `http://${R.j}:8080`;
  await L.cap("ก่อนเริ่ม: Jenkins ติดตั้งและตั้งค่าแล้ว (ตอน 0 ของ use case 10) ยังไม่มี job · เปิด Jenkins ที่แท็บ Browser", "ก่อนเริ่ม jenkins ติดตั้งและตั้งค่าแล้วจากตอน ศูนย์ ของ use case สิบ ยังไม่มี job"); await L.hold(1);
  // ① hello
  await L.intro(0, "① hello", "pipeline + stage + echo", "ขั้นแรก เขียน pipeline ที่เล็กที่สุด");
  await toBrowser(); await L.ev(`wbGo("${JURL}/"); render(); W.page=""; render(); 1`); await L.sleep(500);
  await L.cap("Dashboard › New Item › ชื่อ hello-pipeline › Pipeline › OK", "กด new item ตั้งชื่อ hello pipeline เลือกชนิด pipeline แล้วกด ok");
  await step("ni", async () => { await L.click({ t: "New Item", tag: "a" }); }); await L.sleep(400);
  await step("n1", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await step("n2", async () => { await L.sleep(300); await L.type("main input[placeholder]", "hello-pipeline"); }); await L.hold(1);
  await step("ok", async () => { await L.click(B("OK", { nth: 0 })); }); await L.hold(1.5);
  await L.cap("Configure › Pipeline › Definition = Pipeline script → พิมพ์ Jenkinsfile ขั้นที่ ①: pipeline { agent any · stages { stage('Hello') { steps { echo 'Hello Jenkins' } } } }", "ในหน้า configure เปลี่ยน definition เป็น pipeline script แล้วพิมพ์สคริปต์ขั้นแรก pipeline agent any stages stage hello steps echo hello jenkins");
  await L.ev(`var sel=document.querySelector('select[aria-label="Definition"]'); sel.value="script"; sel.dispatchEvent(new Event("change",{bubbles:true})); 1`); await L.sleep(500);
  await freeText();
  await step("t1", async () => { await L.type("main textarea", SC.s1); }); await L.hold(3);
  await step("sv1", async () => { await L.click(B("Save", { nth: 0 })); }); await L.hold(1.5);
  await L.cap("Build Now → Console Output: [Pipeline] echo · Hello Jenkins · Finished: SUCCESS", "กด build now แล้วดู console output จะเห็นบรรทัด echo และข้อความ hello jenkins และ finished success");
  await doBuild(); await showConsole(6);
  await L.tick(0, "① hello pipeline ผ่าน", "ขั้นแรกผ่านแล้ว");
  // ② หลาย stage
  await L.intro(1, "② หลาย stage", "Build → Test → Deploy", "ต่อมา เพิ่มหลาย stage");
  await jobPage(JURL);
  await L.cap("Configure: เพิ่ม stage Build (sh 'docker build') · Test (sh 'pytest') · Deploy → Save → Build Now → Stage View เรียง 3 ช่อง", "แก้สคริปต์เพิ่มสาม stage คือ build test และ deploy แต่ละ stage รันคำสั่งด้วย sh แล้ว build ที่ stage view จะเห็นสามช่องเรียงกัน");
  await setScript(SC.s2); await doBuild(); await L.hold(3);
  await showConsole(5);
  await L.tick(1, "② หลาย stage ผ่าน (Stage View 3 ช่อง)", "ขั้นที่สองผ่าน");
  // ③ environment + parameters
  await L.intro(2, "③ environment + parameters", "ตัวแปร + ปุ่ม Build with Parameters", "ต่อมา เพิ่มตัวแปรและพารามิเตอร์");
  await jobPage(JURL);
  await L.cap("Configure: environment { APP = 'pharmacy-api' } · parameters { choice(name: 'TARGET_ENV', choices: ['dev','prd']) } → Save → Build Now (ครั้งแรกยังเป็น Build Now)", "เพิ่ม environment กำหนดตัวแปร app และ parameters เป็น choice ชื่อ target env เลือก dev หรือ prd แล้วบันทึก build แรกหลังเพิ่ม parameters ยังเป็น build now");
  await setScript(SC.s3); await doBuild(); await L.hold(2);
  await jobPage(JURL);
  await L.cap("หลัง build รอบแรก ปุ่มเปลี่ยนเป็น Build with Parameters → เลือก TARGET_ENV = prd → Build → Console: Deploying pharmacy-api to prd", "หลัง build รอบแรก ปุ่มเปลี่ยนเป็น build with parameters เลือก target env เป็น prd แล้วกด build ใน console จะเห็นข้อความ deploying pharmacy api to prd");
  await step("bwp", async () => { await L.click({ t: "Build with Parameters", tag: "a,button", starts: true }); }); await L.hold(1.5);
  await step("tp", async () => { await L.pickBtn("dev", "prd"); }); await L.hold(1.5); await step("bb", async () => { await L.click(B("Build", { nth: 0 })); }); await L.hold(2); await showConsole(6);
  await L.tick(2, "③ environment + parameters ผ่าน", "ขั้นที่สามผ่าน");
  await L.costScene("jenkinsfile", "เรื่องค่าใช้จ่าย การเขียน pipeline ใน jenkins ไม่เสียเพิ่ม ค่าใช้จ่ายคือเครื่อง jenkins ที่เปิดตลอด ควรตั้ง Budget และ destroy เมื่อเลิกใช้");
  await L.cap("✓ ตอน 1 เสร็จ: เขียน pipeline ได้ 3 ระดับ (hello · หลาย stage · parameters) · ตอน 2: when, post, parallel, error", "สรุป เขียน pipeline ได้สามระดับ ตอนถัดไป when post parallel และ error"); await L.hold(1.5);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase12a-a.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
