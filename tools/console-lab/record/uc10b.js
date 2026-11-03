// Use case 10 ตอน B: เตรียม Jenkins ให้ปล่อย dev: ปลั๊กอิน/.env/Jenkinsfile (เปิดไฟล์ให้เทียบ) + build ล้มเพราะไม่มี dev-ssh → เพิ่ม credential → build ผ่าน
const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n); throw e; } } } };
const key = (k, code) => L.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: code === "Enter" ? 13 : 0, text: k === "Enter" ? "\r" : undefined });
// พิมพ์คำสั่งลง Terminal จริง แล้วกด Enter
const term = async (cmd) => { await L.ev(`[].slice.call(document.querySelectorAll("input")).filter(function(e){return e.getBoundingClientRect().width>400})[0].id="__term";1`); await L.type("#__term", cmd); await key("Enter", "Enter"); await L.sleep(500); await L.shot(1); };
const toBrowser = async () => { await L.click(B("Browser", { nth: 0 })); await L.sleep(300); };
// เปิดไฟล์ใน Laptop › Files & editor แล้วค้างไว้ให้ผู้ดูหยุดเทียบเอง (ไม่อธิบายทีละบรรทัด): เลื่อนไปที่ anchor แล้วค้างตาม secs; pages>1 = เลื่อนต่อทีละหน้า
const viewFile = async (rel, anchor, secs, pages) => {
  await L.click(B("Laptop", { nth: 0 })); await step("fe", async () => { await L.click({ t: "📁 Files & editor", tag: "button", starts: true }); }); await L.sleep(300);
  await step("f:" + rel, async () => { await L.click({ t: rel, tag: "button" }); }); await L.sleep(500);
  await L.ev(`(function(a){var t=document.getElementById("edtxt"); if(!t) return; var i=a?t.value.indexOf(a):0; if(i<0)i=0; var lh=parseFloat(getComputedStyle(t).lineHeight)||17; t.scrollTop=t.value.slice(0,i).split("\\n").length*lh-lh*2; })(${JSON.stringify(anchor || "")}); 1`);
  await L.hold(secs || 9);
  for (let p = 1; p < (pages || 1); p++) { await L.ev(`(function(){var t=document.getElementById("edtxt"); t.scrollTop+=t.clientHeight-30; })(); 1`); await L.hold(secs || 9); }
};
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["ปลั๊กอิน + .env", "📁"], ["Jenkinsfile", "📁"], ["build ล้ม: ไม่มี dev-ssh", "❌"], ["เพิ่ม credential", "🔑"], ["build ผ่าน → dev", "✅"]]);
  await L.cap("Use case 10 ตอน B · เตรียม Jenkins ให้ปล่อย dev", "use case สิบ ตอน บี เตรียม jenkins ให้ปล่อย dev ได้ จะเปิดไฟล์ที่เกี่ยวข้องให้เทียบ แล้วลองปล่อยดู จะเจอว่าขาดอะไรและเติมให้ครบ"); await L.hold(1);
  // prerequisite: ระบบจาก lab หลักพร้อม (Jenkins/Sonar/ECR/dev VM) แต่ยังไม่มี credential dev-ssh
  const R = JSON.parse(await L.ev(`var r=buildReady("demo"); readyPushCmds().forEach(function(c){shRun(c)}); S.jk.creds=S.jk.creds.filter(function(c){return c.id!=="dev-ssh"}); JSON.stringify({j:r.jenkins,b:r.bastion,rp:REPO,jp:S.insts.filter(function(i){return i.name==="pharmacy-jenkins"})[0].privateIp,d:S.insts.filter(function(i){return i.name==="pharmacy-dev"})[0].privateIp})`));
  await L.cap("ก่อนเริ่ม: ระบบจาก lab หลักพร้อมแล้ว (Jenkins, SonarQube, VM dev) และ push โค้ดขึ้น GitHub แล้ว แต่ยังไม่มี credential สำหรับ ssh ไป dev", "ก่อนเริ่ม ระบบจาก lab หลักพร้อมแล้ว และ push โค้ดขึ้น github แล้ว แต่ยังไม่มี credential สำหรับ ssh ไปเครื่อง dev"); await L.hold(1);
  // 1 ปลั๊กอิน + .env
  await L.intro(0, "ปลั๊กอิน + .env", "ของที่ Ansible ใส่ให้ Jenkins", "เริ่มจากสิ่งที่ ansible ใส่ให้ jenkins ไว้แล้ว");
  await L.cap("① vm-jenkins/plugins.txt (github · ssh-agent) · Dockerfile (openssh-client)", "ไฟล์ plugins dot t x t มี github กับ ssh agent และ Dockerfile ลง openssh client"); await viewFile("vm-jenkins/plugins.txt", "", 9); await viewFile("vm-jenkins/Dockerfile", "", 9);
  await L.cap("② ansible/jenkins.yml เขียน DEV_HOST ลง /opt/jenkins/.env", "ไฟล์ jenkins dot y m l เขียน DEV HOST ลงไฟล์ dot env"); await viewFile("ansible/jenkins.yml", "dev_ip", 11, 2);
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("③ ssh เข้า pharmacy-jenkins · sudo cat /opt/jenkins/.env → เห็น DEV_HOST", "ssh เข้าเครื่อง jenkins แล้วดูไฟล์ dot env จะเห็น DEV HOST ชี้ไปเครื่อง dev");
  await step("ssh", async () => { await term(`ssh -J ubuntu@${R.b} -i ~/.ssh/id_ed25519 ubuntu@${R.jp}`); }); await step("yes", async () => { await term("yes"); });
  await step("env", async () => { await term("sudo cat /opt/jenkins/.env"); }); await L.hold(6);
  await step("ex", async () => { await term("exit"); });
  await L.tick(0, "ปลั๊กอินและ .env พร้อม", "ปลั๊กอินและ dot env พร้อมแล้ว");
  // 2 Jenkinsfile
  await L.intro(1, "Jenkinsfile", "stage ที่ปล่อย dev", "ต่อมา เปิด Jenkinsfile ดู stage ที่ปล่อย dev");
  await L.cap("④ repo-backend/Jenkinsfile › Resolve version (push หรือกดมือ)", "Jenkinsfile ส่วน resolve version"); await viewFile("repo-backend/Jenkinsfile", "stage('Resolve version')", 11);
  await L.cap("⑤ repo-backend/Jenkinsfile › Deploy dev (docker compose): sshagent credentials dev-ssh · ssh ไป DEV_HOST รัน deploy.sh", "และ stage deploy dev ที่ใช้ credential ชื่อ dev ssh ssh ไปรัน deploy dot s h"); await viewFile("repo-backend/Jenkinsfile", "stage('Deploy dev (docker compose)')", 12);
  await L.tick(1, "Jenkinsfile: Deploy dev ใช้ dev-ssh", "stage deploy dev ต้องใช้ credential ชื่อ dev ssh");
  // 3 build ล้ม
  await L.intro(2, "build ล้ม", "ยังไม่มี credential dev-ssh", "ลองปล่อยดู จะเห็นว่าขาดอะไร");
  await toBrowser(); await L.ev(`wbGo("http://${R.j}:8080/"); render(); 1`); await L.sleep(500);
  await L.cap("⑥ Jenkins › pharmacy-backend › Build with Parameters › Build (TARGET_ENV=dev)", "เปิด job pharmacy backend กด Build with Parameters แล้วกด Build");
  await step("job", async () => { await L.click({ t: "pharmacy-backend", tag: "a" }); }); await L.sleep(300);
  await step("bwp", async () => { await L.click({ t: "Build with Parameters", tag: "a,button", starts: true }); }); await L.hold(1.2);
  await step("bld", async () => { await L.click(B("Build", { nth: 0 })); }); await L.hold(1.5);
  await L.ev(`W.page="build"; W.bid=jkBuildsOf(S.jk.job).slice(-1)[0].id; W.btab="console"; render(); var pr=[].slice.call(document.querySelectorAll("pre")).sort(function(a,b){return b.scrollHeight-a.scrollHeight})[0]; if(pr){var i=pr.innerText.indexOf("Could not find credentials"); if(i>0) pr.scrollTop=pr.scrollHeight*i/pr.innerText.length-60;} 1`);
  await L.cap("⑦ Console Output: ERROR: Could not find credentials entry with ID 'dev-ssh' ที่ stage Deploy dev", "console output บอกว่าหา credential ชื่อ dev ssh ไม่เจอ ที่ stage deploy dev"); await L.hold(6);
  await L.tick(2, "build ล้ม: ไม่มี credential dev-ssh", "build ล้มเพราะยังไม่มี credential dev ssh");
  // 4 เพิ่ม credential
  await L.intro(3, "Credentials", "เพิ่ม dev-ssh (SSH private key)", "ต่อมา เพิ่ม credential dev ssh");
  await L.ev(`W.page=""; W.btab=""; render(); 1`); await L.sleep(300);
  await L.cap("⑧ Manage Jenkins › Credentials › Add Credentials › Kind: SSH Username with private key", "ไปที่ Manage Jenkins แล้วเลือก Credentials กด Add Credentials เลือกชนิด SSH Username with private key");
  await step("mj", async () => { await L.click({ t: "Manage Jenkins", tag: "a,button", starts: true }); }); await L.sleep(300);
  await step("cr", async () => { await L.click({ t: "Credentials", tag: "a,button,div", starts: true }); }); await L.sleep(300);
  await step("addc", async () => { await L.click(B("Add Credentials", { nth: 0 })); }); await L.sleep(300);
  await step("kind", async () => { await L.pickBtn("Username with password", "SSH Username with private key"); });
  await L.cap("⑨ Username = ubuntu · Private Key = กุญแจคู่กับ public_key_path · ID = dev-ssh → Create", "ใส่ username เป็น ubuntu ใส่กุญแจส่วนตัวที่คู่กับ public key path และตั้ง ID เป็น dev ssh แล้วกด Create");
  await step("cu", async () => { await L.fill("Username", "ubuntu"); }); await step("ck", async () => { await L.fill("Private Key", "-----BEGIN OPENSSH PRIVATE KEY-----"); }); await step("ci", async () => { await L.fill("ID", "dev-ssh"); }); await L.hold(1.5);
  await step("create", async () => { await L.click(B("Create", { nth: 0 })); }); await L.hold(1.5);
  if (!(await L.ev(`!!jkCred("dev-ssh")`))) { console.log("FAIL cred not created"); await L.finish(); process.exit(1); }
  await L.tick(3, "เพิ่ม credential dev-ssh แล้ว", "เพิ่ม credential dev ssh เรียบร้อย");
  // 5 build ผ่าน
  await L.intro(4, "build ใหม่", "ผ่าน แล้วดูบนเครื่อง dev", "ลองปล่อยอีกรอบ");
  await L.ev(`W.page=""; W.btab=""; render(); 1`); await L.sleep(300);
  await L.cap("⑩ Build with Parameters › Build อีกรอบ → Deploy dev ผ่าน", "กด Build with Parameters แล้ว Build อีกรอบ รอบนี้ stage deploy dev ผ่าน");
  await step("job2", async () => { await L.click({ t: "pharmacy-backend", tag: "a" }); }); await L.sleep(300);
  await step("bwp2", async () => { await L.click({ t: "Build with Parameters", tag: "a,button", starts: true }); }); await L.hold(1);
  await step("bld2", async () => { await L.click(B("Build", { nth: 0 })); }); await L.hold(1.2);
  await L.ev(`W.page="build"; W.bid=jkBuildsOf(S.jk.job).slice(-1)[0].id; W.btab="console"; render(); var pr=[].slice.call(document.querySelectorAll("pre")).sort(function(a,b){return b.scrollHeight-a.scrollHeight})[0]; if(pr){var i=pr.innerText.indexOf("deploy.sh"); if(i>0) pr.scrollTop=pr.scrollHeight*i/pr.innerText.length-60;} 1`); await L.hold(5);
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("⑪ ssh เข้า pharmacy-dev · docker compose ps -a: migrate จบ (Exited 0) · backend รัน (healthy)", "ssh เข้าเครื่อง dev ดู docker compose ps จะเห็น migrate รันจบ และ backend รันอยู่");
  await step("ssh2", async () => { await term(`ssh -J ubuntu@${R.b} -i ~/.ssh/id_ed25519 ubuntu@${R.d}`); }); await step("yes2", async () => { await term("yes"); });
  await step("cd", async () => { await term("cd /opt/pharmacy"); }); await step("ps", async () => { await term("sudo docker compose ps -a"); }); await L.hold(5);
  await L.tick(4, "Jenkins ปล่อย dev ได้", "jenkins ปล่อย dev ได้แล้ว");
  await L.costScene("jkpush", "เรื่องค่าใช้จ่าย Jenkins SonarQube และเครื่อง dev เปิดตลอดคิดเงินทั้งหมด ควรตั้ง Budget และ destroy เมื่อเลิกใช้");
  await L.cap("✓ ตอน B เสร็จ: Jenkins ปล่อย dev ได้ (ปลั๊กอิน · DEV_HOST · dev-ssh · Jenkinsfile) · ตอน C: webhook ให้ push แล้วรันเอง", "สรุป jenkins ปล่อย dev ได้แล้ว ตอนถัดไปตั้ง webhook ให้ push แล้วรันเอง"); await L.hold(1.5);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase10b-a.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
