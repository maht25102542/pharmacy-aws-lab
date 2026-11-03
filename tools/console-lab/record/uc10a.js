// Use case 10 ตอน A: เตรียมเครื่อง dev (docker compose): เปิดไฟล์ SG/Ansible/compose/deploy.sh/.env ให้ผู้ดูหยุดเทียบเอง + รัน dev.yml + ดูในเครื่อง
const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n); throw e; } } } };
const key = (k, code) => L.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: code === "Enter" ? 13 : 0, text: k === "Enter" ? "\r" : undefined });
// พิมพ์คำสั่งลง Terminal จริง แล้วกด Enter
const term = async (cmd) => { await L.ev(`[].slice.call(document.querySelectorAll("input")).filter(function(e){return e.getBoundingClientRect().width>400})[0].id="__term";1`); await L.type("#__term", cmd); await key("Enter", "Enter"); await L.sleep(500); await L.shot(1); };
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
const toBrowser = async () => { await L.click(B("Browser", { nth: 0 })); await L.sleep(300); };
// เปิดไฟล์ใน Laptop › Files & editor แล้วค้างไว้ให้ผู้ดูหยุดเทียบเอง (ไม่อธิบายทีละบรรทัด): เลื่อนไปที่ anchor แล้วค้างตาม secs; pages>1 = เลื่อนต่อทีละหน้า
const viewFile = async (rel, anchor, secs, pages, endAnchor) => { // เปิดไฟล์ใน Files & editor · anchor..endAnchor = ช่วงที่ไฮไลต์ (ชี้ว่าไฟล์นี้ตรงกับสิ่งที่เพิ่งกด)
  await L.click(B("Laptop", { nth: 0 })); await step("fe", async () => { await L.click({ t: "📁 Files & editor", tag: "button", starts: true }); }); await L.sleep(300);
  await step("f:" + rel, async () => { await L.click({ t: rel, tag: "button" }); }); await L.sleep(500);
  await L.ev(`(function(a,e){var t=document.getElementById("edtxt"); if(!t) return; var i=a?t.value.indexOf(a):0; if(i<0)i=0; var lh=parseFloat(getComputedStyle(t).lineHeight)||17; t.scrollTop=t.value.slice(0,i).split("\\n").length*lh-lh*2; if(a){ var j=e?t.value.indexOf(e,i+a.length):-1; if(j<0){ j=t.value.indexOf("\\n\\n",i); if(j<0) j=Math.min(t.value.length,i+400); } else j+=e.length; t.focus({preventScroll:true}); t.setSelectionRange(i,j); } })(${JSON.stringify(anchor || "")},${JSON.stringify(endAnchor || "")}); 1`);
  await L.hold(secs || 9);
  for (let p = 1; p < (pages || 1); p++) { await L.ev(`(function(){var t=document.getElementById("edtxt"); t.scrollTop+=t.clientHeight-30; })(); 1`); await L.hold(secs || 9); }
};
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["SG ของ dev", "EC2"], ["สร้าง EC2 dev", "EC2"], ["Ansible dev.yml", "🎛️"], ["compose · deploy.sh · .env", "📁"], ["ดูบนเครื่อง dev", "⌨️"]]);
  await L.cap("Use case 10 ตอน A · เตรียมเครื่อง dev (docker compose)", "use case สิบ ตอน เอ เตรียมเครื่อง dev ที่รัน docker compose ในตอนนี้จะเปิดไฟล์ที่ใช้ตั้งค่าทีละไฟล์ ให้กดหยุดวิดีโอแล้วเทียบกับของตัวเองได้"); await L.hold(1);
  await L.ev(`buildAnsibleLab("ans-half"); S.insts=S.insts.filter(function(i){return i.name!=="pharmacy-dev"}); UI.sel={}; render(); 1`);
  const R = JSON.parse(await L.ev(`JSON.stringify({b:S.insts.filter(function(i){return i.name==="pharmacy-bastion"})[0].publicIp,rp:REPO})`));
  await L.cap("ก่อนเริ่ม: เครือข่าย, Security Group, IAM role และเครื่องอื่นพร้อมแล้ว (lab หลัก) ตอนนี้ยังไม่มีเครื่อง dev: สร้างเองบน AWS console", "ก่อนเริ่ม เครือข่าย security group และ IAM role พร้อมแล้ว รวมถึงเครื่องอื่นของ lab หลัก ตอนนี้ยังไม่มีเครื่อง dev จะสร้างเองบน AWS console"); await L.hold(1);
  // 1 SG ของ dev (ดูบน console)
  await L.intro(0, "EC2", "Security Group ของ dev", "เริ่มจากดู security group ของ dev บน AWS console");
  await L.cap("① EC2 › Security Groups › pharmacy-dev › Inbound rules: ALB เข้า :3000 · Jenkins เข้า :22", "เปิด EC2 ไปที่ Security Groups เลือก pharmacy dev ดู inbound rules จะเห็น ALB เข้าได้พอร์ตสามพัน และ jenkins เข้าได้พอร์ตยี่สิบสอง");
  await svc("EC2", "Compute"); await step("sgs", async () => { await L.click(B("Security Groups")); }); await L.sleep(400);
  await step("sgdev", async () => { await L.click({ t: "pharmacy-dev", tag: "td,a,button,span", starts: true }); }); await L.hold(6);
  await L.cap("ชี้ไฟล์: terraform/security.tf › resource aws_security_group.dev (ไฮไลต์) = SG ที่เพิ่งเปิดดูใน console · ingress 3000 จาก ALB · ingress 22 จาก Jenkins = Inbound rules 2 ข้อ", "ไฟล์ terraform security dot t f ส่วนที่ไฮไลต์ คือ security group ตัวเดียวกับที่เพิ่งเปิดดูในคอนโซล สอง ingress ตรงกับ inbound rules สองข้อ");
  await viewFile("terraform/security.tf", 'resource "aws_security_group" "dev"', 11, 1, "\n}\n");
  await L.tick(0, "SG ของ dev (ALB :3000 · Jenkins :22)", "security group ของ dev พร้อมแล้ว");
  // 2 สร้าง EC2 dev
  await L.intro(1, "EC2", "สร้างเครื่อง pharmacy-dev", "ต่อมา สร้างเครื่อง pharmacy dev ที่รัน docker compose");
  await L.cap("② EC2 › Instances › Launch instances · ชื่อ pharmacy-dev · Tags: Project=pharmacy · Role=dev · Tier=private", "ไปที่ Instances กด Launch instances ตั้งชื่อ pharmacy dev และเพิ่ม tag สามตัว project role และ tier ค่า role เป็น dev เพราะ ansible ใช้ tag นี้แยกกลุ่มเครื่อง");
  await svc("EC2", "Compute"); await step("inst", async () => { await L.click(B("Instances")); }); await step("launch", async () => { await L.click(B("Launch instances")); }); await L.sleep(800);
  await step("name", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await step("name2", async () => { await L.sleep(400); await L.type("main input[placeholder]", "pharmacy-dev"); });
  for (const [k, v] of [["Project", "pharmacy"], ["Role", "dev"], ["Tier", "private"]]) {
    await step("addtag" + k, async () => { await L.click(B("Add tag", { nth: 0 })); }); await L.sleep(300);
    await step("tk" + k, async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await step("tv" + k, async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await L.sleep(300);
    await step("tki" + k, async () => { await L.type('main input[placeholder^="Key"]:placeholder-shown', k); }); await step("tvi" + k, async () => { await L.type('main input[placeholder^="Value"]:placeholder-shown', v); });
  }
  await L.hold(1.5);
  await L.cap("③ Instance type t3.medium · Key pair pharmacy-admin", "เลือกขนาด t three medium และ key pair ชื่อ pharmacy admin");
  await step("type", async () => { await L.pick(B("t3.micro", { starts: true }), "t3.medium"); });
  await step("key", async () => { await L.pick(B("Proceed without", { starts: true }), "pharmacy-admin"); });
  await L.cap("④ Network › Edit: VPC pharmacy-vpc · private subnet · ไม่มี public IP · Security groups: pharmacy-base + pharmacy-dev", "ตั้งค่าเครือข่าย เลือก VPC ของเรา subnet แบบ private ไม่เปิด public IP และเลือก security group สองตัว คือ pharmacy base กับ pharmacy dev");
  await step("edit", async () => { await L.click(B("Edit")); await L.pick(B("vpc-", { starts: true }), "pharmacy-vpc"); });
  await step("subnet", async () => { await L.pick(B("No preference"), "pharmacy-private-1"); });
  try { await L.pick(B("Enable"), "Disable"); } catch (e) { console.log("SOFT pubip (private subnet = ไม่มี public IP อยู่แล้ว)"); }
  await step("sgdef", async () => { await L.click({ t: "default", tag: "label", starts: true }); });
  await step("sgb", async () => { await L.click({ t: "pharmacy-base", tag: "label", starts: true }); }); await step("sgd", async () => { await L.click({ t: "pharmacy-dev", tag: "label", starts: true }); }); await L.hold(1.5);
  await L.cap("⑤ Advanced details › IAM instance profile: pharmacy-k8s (ให้เครื่องดึง image จาก ECR ด้วย role ไม่ต้องมี access key)", "ในส่วน advanced เลือก IAM instance profile เป็น pharmacy k eight s เพื่อให้เครื่องดึง image จาก E C R ด้วย role ไม่ต้องใช้ access key");
  await step("iam", async () => { await L.pick(B("-", { nth: 0 }), "pharmacy-k8s"); }); await L.hold(1.5);
  await L.cap("⑥ Launch instance", "กด Launch instance"); await step("go", async () => { await L.click(B("Launch instance", { nth: 0 })); }); await L.hold(2.5);
  if (!(await L.ev(`S.insts.some(function(i){return i.name==="pharmacy-dev"})`))) { console.log("FAIL dev instance not created"); await L.finish(); process.exit(1); }
  R.d = await L.ev(`S.insts.filter(function(i){return i.name==="pharmacy-dev"})[0].privateIp`);
  await L.tick(1, "EC2 pharmacy-dev (Running)", "เครื่อง pharmacy dev รันแล้ว");
  await L.cap("ชี้ไฟล์: terraform/instances.tf › resource aws_instance.dev (ไฮไลต์) ← Launch instance ที่เพิ่งกด: tags ↔ tags {} · SG 2 ตัว ↔ vpc_security_group_ids · IAM profile ↔ iam_instance_profile · private subnet ↔ subnet_id", "ไฟล์ instances dot t f ส่วนที่ไฮไลต์ คือสิ่งที่เพิ่งกดสร้าง tag ตรงกับ tags security group ตรงกับ vpc security group ids และ IAM profile ตรงกับ iam instance profile"); await viewFile("terraform/instances.tf", 'resource "aws_instance" "dev"', 13, 1, "\n}\n");
  // 2 Ansible
  await L.intro(2, "Ansible", "ลง docker + วางไฟล์บนเครื่อง dev", "ต่อมา ใช้ Ansible ลง docker และวางไฟล์บนเครื่อง dev");
  await L.cap("⑦ ansible/dev.yml: task Install Docker (ลง docker + compose plugin บนเครื่องที่ tag Role=dev)", "ไฟล์ dev dot y m l task แรก ลง docker และ compose plugin บนเครื่องที่มี tag role เป็น dev"); await viewFile("ansible/dev.yml", "- name: Install Docker", 9, 1, "update_cache: true");
  await L.cap("⑧ task Copy docker-compose.yml + Copy deploy.sh (วางไฟล์ลง /opt/pharmacy)", "task ถัดมาวางไฟล์ compose และ deploy dot s h ลงโฟลเดอร์ opt pharmacy"); await viewFile("ansible/dev.yml", "- name: Copy docker-compose.yml", 9, 1, 'mode: "0755"');
  await L.cap("⑨ task Render .env (template vm-dev/.env.j2 → /opt/pharmacy/.env รหัสผ่าน 0600)", "และ task สุดท้ายเรนเดอร์ไฟล์ dot env จาก template ใส่รหัสผ่านและไอพีของฐานข้อมูล"); await viewFile("ansible/dev.yml", "- name: Render /opt/pharmacy/.env", 9, 1, "force: false");
  await L.cap("⑩ Terminal › cd ansible · ansible-playbook dev.yml", "แล้วรันคำสั่ง ansible playbook dev dot y m l");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await step("cdA", async () => { await term(`cd ${R.rp}/ansible`); });
  await L.cap("Ansible หาเครื่องจาก tag: กลุ่ม role_dev = pharmacy-dev (ที่เพิ่งสร้าง)", "ansible หาเครื่องจาก tag ที่ตั้งไว้ กลุ่ม role dev คือเครื่อง pharmacy dev ที่เพิ่งสร้าง");
  await step("inv", async () => { await term("ansible-inventory --graph"); }); await L.hold(5);
  await step("pb", async () => { await term("ansible-playbook dev.yml"); }); await L.hold(8);
  await L.tick(2, "Ansible เตรียมเครื่อง dev เสร็จ", "ansible รันผ่าน เครื่อง dev พร้อมแล้ว");
  // 3 compose
  await L.intro(3, "docker-compose.yml", "migrate → backend → frontend", "ไฟล์ docker compose ที่ ansible วางไว้บนเครื่อง dev");
  await L.cap("⑪ vm-dev/docker-compose.yml (อยู่ที่ /opt/pharmacy บนเครื่อง dev)", "ไฟล์ docker compose dot y m l อยู่ที่ opt pharmacy บนเครื่อง dev"); await viewFile("vm-dev/docker-compose.yml", "", 11, 3);
  // 4 deploy.sh / .env
  await L.intro(3, "deploy.sh · .env", "ตัวที่ Jenkins ssh มาเรียก", "สองไฟล์สุดท้าย deploy dot s h กับ dot env");
  await L.cap("⑫ vm-dev/deploy.sh (Jenkins ssh มาเรียก: login ECR → แก้ tag → compose pull/up)", "ไฟล์ deploy dot s h ที่ jenkins จะ ssh มาเรียก"); await viewFile("vm-dev/deploy.sh", "", 12, 1);
  await L.cap("⑬ vm-dev/.env.j2 (Ansible เรนเดอร์เป็น /opt/pharmacy/.env รหัสผ่านอยู่ที่นี่ที่เดียว)", "และไฟล์ dot env เจ สอง ที่ ansible เรนเดอร์เป็น dot env บนเครื่อง"); await viewFile("vm-dev/.env.j2", "", 11, 1);
  await L.tick(3, "deploy.sh และ .env", "ครบทั้งสองไฟล์");
  // 5 ดูบนเครื่อง dev
  await L.intro(4, "เครื่อง dev", "ssh เข้าไปดูของจริง", "สุดท้าย ssh เข้าเครื่อง dev ไปดูของที่ ansible วางไว้");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("⑭ ssh ผ่าน bastion เข้า pharmacy-dev · ls -a /opt/pharmacy · sudo cat .env", "ssh ผ่าน bastion เข้าเครื่อง dev ดูไฟล์ในโฟลเดอร์ opt pharmacy และไฟล์ dot env");
  await step("ssh", async () => { await term(`ssh -J ubuntu@${R.b} -i ~/.ssh/id_ed25519 ubuntu@${R.d}`); }); await step("yes", async () => { await term("yes"); });
  await step("ls", async () => { await term("ls -a /opt/pharmacy"); });
  await step("env", async () => { await term("sudo cat /opt/pharmacy/.env"); }); await L.hold(5);
  await L.cap("⑮ cd /opt/pharmacy · sudo docker compose ps: ยังว่าง เพราะ Jenkins ยังไม่เคยมาสั่ง deploy (ดูตอน B/C)", "เข้าโฟลเดอร์ แล้วดู docker compose ps ตอนนี้ยังว่าง เพราะ jenkins ยังไม่เคยมาสั่ง deploy");
  await step("cd2", async () => { await term("cd /opt/pharmacy"); }); await step("ps", async () => { await term("sudo docker compose ps"); }); await L.hold(4);
  await L.tick(4, "เครื่อง dev พร้อมรับ deploy", "เครื่อง dev พร้อมรับการ deploy จาก jenkins แล้ว");
  await L.costScene("jkpush", "เรื่องค่าใช้จ่าย เครื่อง dev เป็น E C 2 หนึ่งเครื่องที่เปิดตลอดและคิดเงินแม้ไม่มีคนใช้ ควรตั้ง Budget และ destroy เมื่อเลิกใช้");
  await L.cap("✓ ตอน A เสร็จ: เครื่อง dev พร้อม (SG · docker · compose · deploy.sh · .env) · ตอน B: ตั้ง Jenkins ให้ปล่อย dev ได้", "สรุป เครื่อง dev พร้อมแล้ว ตอนถัดไปตั้ง jenkins ให้ปล่อย dev ได้"); await L.hold(1.5);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase10a-c.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
