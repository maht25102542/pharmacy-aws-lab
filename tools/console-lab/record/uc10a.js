// Use case 10 ตอน A: เตรียมเครื่อง dev (docker compose): เปิดไฟล์ SG/Ansible/compose/deploy.sh/.env ให้ผู้ดูหยุดเทียบเอง + รัน dev.yml + ดูในเครื่อง
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
  await L.plan([["SG + VM dev", "🏗️"], ["Ansible dev.yml", "🎛️"], ["docker-compose.yml", "📁"], ["deploy.sh · .env", "📁"], ["ดูบนเครื่อง dev", "⌨️"]]);
  await L.cap("Use case 10 ตอน A · เตรียมเครื่อง dev (docker compose)", "use case สิบ ตอน เอ เตรียมเครื่อง dev ที่รัน docker compose ในตอนนี้จะเปิดไฟล์ที่ใช้ตั้งค่าทีละไฟล์ ให้กดหยุดวิดีโอแล้วเทียบกับของตัวเองได้"); await L.hold(1);
  await L.ev(`buildAnsibleLab("ans-half"); UI.sel={}; render(); 1`);
  const R = JSON.parse(await L.ev(`JSON.stringify({b:S.insts.filter(function(i){return i.name==="pharmacy-bastion"})[0].publicIp,d:S.insts.filter(function(i){return i.name==="pharmacy-dev"})[0].privateIp,rp:REPO})`));
  await L.cap("ก่อนเริ่ม: Terraform สร้างเครื่องครบแล้ว และ Ansible ตั้ง DB กับ k3s (prd) แล้ว ตอนนี้เหลือเตรียมเครื่อง dev", "ก่อนเริ่ม Terraform สร้างเครื่องครบแล้ว และ Ansible ตั้งฐานข้อมูลกับ k3s ของ prd เสร็จแล้ว ตอนนี้เหลือเตรียมเครื่อง dev"); await L.hold(1);
  // 1 Terraform
  await L.intro(0, "Terraform", "SG ของ dev + VM pharmacy-dev", "เริ่มจากฝั่ง Terraform ไฟล์ security dot t f มี security group ของ dev");
  await L.cap("① terraform/security.tf › aws_security_group.dev (ALB เข้า :3000 · Jenkins เข้า :22)", "ไฟล์ security dot t f ส่วน security group ของ dev"); await viewFile("terraform/security.tf", 'resource "aws_security_group" "dev"', 11);
  await L.cap("② terraform/instances.tf › aws_instance.dev (SG base + dev · Role = dev)", "ไฟล์ instances dot t f ส่วนเครื่อง dev"); await viewFile("terraform/instances.tf", "VM: dev", 10);
  await L.tick(0, "SG และ VM dev (จาก Terraform)", "สองไฟล์นี้ Terraform สร้างให้แล้ว");
  // 2 Ansible
  await L.intro(1, "Ansible", "ลง docker + วางไฟล์บนเครื่อง dev", "ต่อมา ใช้ Ansible ลง docker และวางไฟล์บนเครื่อง dev");
  await L.cap("③ ansible/dev.yml", "ไฟล์ dev dot y m l"); await viewFile("ansible/dev.yml", "", 12, 2);
  await L.cap("④ Terminal › cd ansible · ansible-playbook dev.yml", "แล้วรันคำสั่ง ansible playbook dev dot y m l");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await step("cdA", async () => { await term(`cd ${R.rp}/ansible`); });
  await step("pb", async () => { await term("ansible-playbook dev.yml"); }); await L.hold(8);
  await L.tick(1, "Ansible เตรียมเครื่อง dev เสร็จ", "ansible รันผ่าน เครื่อง dev พร้อมแล้ว");
  // 3 compose
  await L.intro(2, "docker-compose.yml", "migrate → backend → frontend", "ไฟล์ docker compose ที่ ansible วางไว้บนเครื่อง dev");
  await L.cap("⑤ vm-dev/docker-compose.yml (อยู่ที่ /opt/pharmacy บนเครื่อง dev)", "ไฟล์ docker compose dot y m l อยู่ที่ opt pharmacy บนเครื่อง dev"); await viewFile("vm-dev/docker-compose.yml", "", 11, 3);
  await L.tick(2, "compose: migrate → backend → frontend", "นี่คือไฟล์ compose");
  // 4 deploy.sh / .env
  await L.intro(3, "deploy.sh · .env", "ตัวที่ Jenkins ssh มาเรียก", "สองไฟล์สุดท้าย deploy dot s h กับ dot env");
  await L.cap("⑥ vm-dev/deploy.sh (Jenkins ssh มาเรียก: login ECR → แก้ tag → compose pull/up)", "ไฟล์ deploy dot s h ที่ jenkins จะ ssh มาเรียก"); await viewFile("vm-dev/deploy.sh", "", 12, 1);
  await L.cap("⑦ vm-dev/.env.j2 (Ansible เรนเดอร์เป็น /opt/pharmacy/.env รหัสผ่านอยู่ที่นี่ที่เดียว)", "และไฟล์ dot env เจ สอง ที่ ansible เรนเดอร์เป็น dot env บนเครื่อง"); await viewFile("vm-dev/.env.j2", "", 11, 1);
  await L.tick(3, "deploy.sh และ .env", "ครบทั้งสองไฟล์");
  // 5 ดูบนเครื่อง dev
  await L.intro(4, "เครื่อง dev", "ssh เข้าไปดูของจริง", "สุดท้าย ssh เข้าเครื่อง dev ไปดูของที่ ansible วางไว้");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("⑧ ssh ผ่าน bastion เข้า pharmacy-dev · ls -a /opt/pharmacy · sudo cat .env", "ssh ผ่าน bastion เข้าเครื่อง dev ดูไฟล์ในโฟลเดอร์ opt pharmacy และไฟล์ dot env");
  await step("ssh", async () => { await term(`ssh -J ubuntu@${R.b} -i ~/.ssh/id_ed25519 ubuntu@${R.d}`); }); await step("yes", async () => { await term("yes"); });
  await step("ls", async () => { await term("ls -a /opt/pharmacy"); });
  await step("env", async () => { await term("sudo cat /opt/pharmacy/.env"); }); await L.hold(5);
  await L.cap("⑨ cd /opt/pharmacy · sudo docker compose ps: ยังว่าง เพราะ Jenkins ยังไม่เคยมาสั่ง deploy (ดูตอน B/C)", "เข้าโฟลเดอร์ แล้วดู docker compose ps ตอนนี้ยังว่าง เพราะ jenkins ยังไม่เคยมาสั่ง deploy");
  await step("cd2", async () => { await term("cd /opt/pharmacy"); }); await step("ps", async () => { await term("sudo docker compose ps"); }); await L.hold(4);
  await L.tick(4, "เครื่อง dev พร้อมรับ deploy", "เครื่อง dev พร้อมรับการ deploy จาก jenkins แล้ว");
  await L.costScene("jkpush", "เรื่องค่าใช้จ่าย เครื่อง dev เป็น E C 2 หนึ่งเครื่องที่เปิดตลอดและคิดเงินแม้ไม่มีคนใช้ ควรตั้ง Budget และ destroy เมื่อเลิกใช้");
  await L.cap("✓ ตอน A เสร็จ: เครื่อง dev พร้อม (SG · docker · compose · deploy.sh · .env) · ตอน B: ตั้ง Jenkins ให้ปล่อย dev ได้", "สรุป เครื่อง dev พร้อมแล้ว ตอนถัดไปตั้ง jenkins ให้ปล่อย dev ได้"); await L.hold(1.5);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase10a-a.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
