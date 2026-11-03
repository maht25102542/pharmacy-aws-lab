// Use case 10 ตอน 0: ติดตั้ง Jenkins แบบพากด: ansible jenkins.yml + ดูบน VM + ดูใน EC2 console + wizard ครั้งแรก (Unlock · plugins · admin · URL)
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
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["ansible jenkins.yml", "🎛️"], ["Jenkins ขึ้นบน VM", "⌨️"], ["Unlock + plugins", "🧩"], ["สร้าง admin", "🧩"], ["URL + พร้อมใช้", "✅"]]);
  await L.cap("Use case 10 ตอน 0 · ติดตั้ง Jenkins (Ansible + เปิดครั้งแรก)", "use case สิบ ตอน ศูนย์ ติดตั้ง jenkins ด้วย ansible แล้วเปิดใช้งานครั้งแรกทีละหน้า"); await L.hold(1);
  const R = JSON.parse(await L.ev(`buildAnsibleLab("ans-half"); var J=S.insts.filter(function(i){return i.name==="pharmacy-jenkins"})[0]; JSON.stringify({b:S.insts.filter(function(i){return i.name==="pharmacy-bastion"})[0].publicIp,jp:J.privateIp,jpub:J.publicIp,rp:REPO})`));
  await L.cap("ก่อนเริ่ม: Terraform สร้างเครื่อง pharmacy-jenkins แล้ว (lab หลัก) ตอนนี้ยังไม่มี Jenkins บนเครื่อง", "ก่อนเริ่ม เครื่อง pharmacy jenkins ถูกสร้างจาก terraform แล้ว แต่ยังไม่มี jenkins บนเครื่อง"); await L.hold(1);
  // 1 ansible
  await L.intro(0, "Ansible", "ลง docker + วาง compose แล้วรัน Jenkins", "ขั้นแรก ใช้ ansible ลง docker และรัน jenkins");
  await L.cap("ชี้ไฟล์: ansible/jenkins.yml › task Install Docker (ไฮไลต์) ลง docker + compose + buildx บนเครื่องที่ tag Role=jenkins", "ไฟล์ jenkins dot y m l task แรกลง docker บนเครื่องที่ tag role เป็น jenkins"); await viewFile("ansible/jenkins.yml", "- name: Install Docker", 9, 1, "update_cache: true");
  await L.cap("ชี้ไฟล์: task Copy Jenkins files (vm-jenkins/ → /opt/jenkins) · Write .env · Build and start Jenkins (docker compose up -d --build)", "task ถัดมาวางไฟล์จากโฟลเดอร์ vm jenkins ลง opt jenkins เขียนไฟล์ dot env แล้วสั่ง docker compose up"); await viewFile("ansible/jenkins.yml", "- name: Copy Jenkins files", 10, 1, "changed_when: true");
  await L.cap("ชี้ไฟล์: vm-jenkins/docker-compose.yml (image ที่ build จาก Dockerfile · พอร์ต 8080 · mount docker.sock) และ plugins.txt", "ไฟล์ docker compose ของ jenkins กำหนดพอร์ตแปดศูนย์แปดศูนย์ และเมานต์ docker sock"); await viewFile("vm-jenkins/docker-compose.yml", "", 10, 1);
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("cd ansible · ansible-playbook jenkins.yml", "รัน ansible playbook jenkins dot y m l");
  await step("cdA", async () => { await term(`cd ${R.rp}/ansible`); }); await step("pb", async () => { await term("ansible-playbook jenkins.yml"); }); await L.hold(7);
  await L.tick(0, "Ansible ลง Jenkins เสร็จ", "ansible ลง jenkins เสร็จ");
  // 2 บน VM
  await L.intro(1, "เครื่อง Jenkins", "docker ps + รหัสผ่านเริ่มต้น", "ต่อมา เข้าไปดูในเครื่อง jenkins และเอารหัสผ่านเริ่มต้น");
  await L.cap("ssh ผ่าน bastion เข้า pharmacy-jenkins · sudo docker ps (container jenkins รันอยู่ :8080)", "ssh ผ่าน bastion เข้าเครื่อง jenkins ดู docker ps จะเห็น container jenkins รันที่พอร์ตแปดศูนย์แปดศูนย์");
  await step("ssh", async () => { await term(`ssh -J ubuntu@${R.b} -i ~/.ssh/id_ed25519 ubuntu@${R.jp}`); }); await step("yes", async () => { await term("yes"); });
  await step("dps", async () => { await term("sudo docker ps"); }); await L.hold(4);
  await L.cap("sudo docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword → รหัสผ่านเริ่มต้น (ใช้ครั้งเดียวตอน Unlock)", "ดึงรหัสผ่านเริ่มต้นจากไฟล์ initial admin password ใช้ครั้งเดียวตอน unlock");
  await step("pw", async () => { await term("sudo docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword"); }); await L.hold(4);
  const PW = await L.ev(`jkPwdOf(jkInst())`);
  await step("ex", async () => { await term("exit"); });
  await L.cap("AWS console: EC2 › Instances › pharmacy-jenkins → Public IPv4 (ใช้เปิดหน้า Jenkins :8080) · SG pharmacy-jenkins เปิด 8080 ให้ My IP", "ที่คอนโซล aws ไปที่ EC2 instances เลือก pharmacy jenkins ดู public ไอพี สำหรับเปิดหน้า jenkins พอร์ตแปดศูนย์แปดศูนย์ และ security group เปิดพอร์ตนี้ให้ไอพีของเรา");
  await svc("EC2", "Compute"); await step("inst", async () => { await L.click(B("Instances")); }); await L.sleep(500);
  await step("jk", async () => { await L.click({ t: "pharmacy-jenkins", tag: "td,a,button,span", starts: true }); }); await L.hold(6);
  await L.tick(1, "Jenkins รันบนเครื่อง (docker) + ได้รหัสเริ่มต้น", "jenkins รันบนเครื่องแล้ว และได้รหัสผ่านเริ่มต้น");
  // 3 Unlock + plugins
  await L.intro(2, "Unlock + plugins", "เปิด Jenkins ครั้งแรก", "ต่อมา เปิดหน้า jenkins ครั้งแรก");
  await toBrowser(); await L.ev(`wbGo("http://${R.jpub}:8080/"); render(); 1`); await L.sleep(600);
  await L.cap("แท็บ Browser › http://<public IP>:8080 → Unlock Jenkins: วางรหัสผ่านเริ่มต้น → Continue", "เปิด public ไอพีพอร์ตแปดศูนย์แปดศูนย์ จะเจอหน้า unlock jenkins วางรหัสผ่านเริ่มต้นแล้วกด continue");
  await putf("w-pw", PW); await L.hold(1.2); await step("cont", async () => { await L.click(B("Continue", { nth: 0 })); }); await L.hold(1.5);
  await L.cap("Customize Jenkins: Install suggested plugins (ใน lab ลง plugin มาใน image แล้วจาก plugins.txt)", "หน้า customize เลือก install suggested plugins ใน lab ปลั๊กอินถูกลงมาใน image แล้วจากไฟล์ plugins dot t x t");
  await step("sug", async () => { await L.click({ t: "Install suggested plugins", tag: "div,b,button,span" }); }); await L.hold(2.5);
  await L.tick(2, "Unlock + ติดตั้ง plugin แล้ว", "unlock และติดตั้งปลั๊กอินแล้ว");
  // 4 admin
  await L.intro(3, "admin", "Create First Admin User", "สร้างผู้ดูแลคนแรก");
  await L.cap("Create First Admin User: Username admin · Password · Confirm · Full name · E-mail → Save and Continue", "กรอก username เป็น admin ตั้งรหัสผ่าน ยืนยันรหัสผ่าน ชื่อเต็ม และอีเมล แล้วกด save and continue");
  await putf("w-au", "admin"); await putf("w-ap", "Pharmacy-Lab-2026!"); await putf("w-ap2", "Pharmacy-Lab-2026!"); await putf("w-af", "Pharmacy Admin"); await putf("w-ae", "admin@pharmacy.lab"); await L.hold(1.5);
  await step("sc", async () => { await L.click(B("Save and Continue", { nth: 0 })); }); await L.hold(1.5);
  await L.tick(3, "สร้างผู้ดูแล admin แล้ว", "สร้างผู้ดูแลเรียบร้อย");
  // 5 URL
  await L.intro(4, "URL + พร้อมใช้", "Instance Configuration", "สุดท้าย ตั้ง url ของ jenkins");
  await L.cap("Instance Configuration: Jenkins URL = http://<public IP>:8080/ → Save and Finish → Start using Jenkins", "ตั้ง jenkins url เป็นที่อยู่ที่เราเปิด แล้วกด save and finish และ start using jenkins");
  await step("sf", async () => { await L.click(B("Save and Finish", { nth: 0 })); }); await L.hold(1.5);
  await step("start", async () => { await L.click(B("Start using Jenkins", { nth: 0 })); }); await L.hold(3);
  await L.tick(4, "Jenkins พร้อมใช้งาน (Dashboard)", "jenkins พร้อมใช้งานแล้ว");
  await L.costScene("jkpush", "เรื่องค่าใช้จ่าย jenkins คือ E C 2 หนึ่งเครื่องที่คิดเงินตลอดเวลาที่เปิด แม้ไม่มีใคร build ควรตั้ง Budget และ destroy เมื่อเลิกใช้");
  await L.cap("✓ ตอน 0 เสร็จ: Jenkins ติดตั้งและตั้งค่าเริ่มต้นแล้ว · ตอน A–C: เตรียมเครื่อง dev, job, webhook", "สรุป jenkins ติดตั้งและตั้งค่าเริ่มต้นเสร็จ ตอนถัดไปเตรียมเครื่อง dev สร้าง job และ webhook"); await L.hold(1.5);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase10i-a.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
