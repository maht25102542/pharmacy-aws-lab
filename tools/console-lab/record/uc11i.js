// Use case 11 ตอน D+: ทำความรู้จัก ArgoCD ที่ลงแล้ว: ชี้ task ใน k8s.yml · ดู pod/svc บน k8s-1 · ALB :8443 ใน EC2 console · ล็อกอินครั้งแรก · เปลี่ยนรหัส · สำรวจ Settings
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
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
const argoLogin = async (pw) => {
  await step("au1", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await step("au2", async () => { await L.type("#w-aau", "admin"); });
  await step("ap1", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await step("ap2", async () => { await L.type("#w-aap", pw); }); await L.hold(1);
  await step("sin", async () => { await L.click(B("SIGN IN", { nth: 0 })); }); await L.hold(1.5);
};
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["k8s.yml ลง ArgoCD", "🎛️"], ["ArgoCD บนเครื่อง", "⌨️"], ["ALB :8443 (console)", "EC2"], ["ล็อกอิน + เปลี่ยนรหัส", "🐙"], ["สำรวจ Settings", "🐙"]]);
  await L.cap("Use case 11 ตอน D+ · ArgoCD ที่ลงแล้ว: เข้าใช้ครั้งแรก", "use case สิบเอ็ด ตอน ดี พลัส ดู argo c d ที่ ansible ลงไว้แล้ว เข้าใช้งานครั้งแรก เปลี่ยนรหัส และดูเมนู settings"); await L.hold(1);
  const R = JSON.parse(await L.ev(`buildAnsibleLab("ans-half"); JSON.stringify({b:S.insts.filter(function(i){return i.name==="pharmacy-bastion"})[0].publicIp,a:"http://"+S.albs[0].dns+":8443",pw:argoPwdOf(argoInst()),rp:REPO})`));
  await L.cap("ก่อนเริ่ม: k3s 3 เครื่อง + ArgoCD ถูกลงด้วย ansible k8s.yml แล้ว (ตอน D) ตอนนี้ทำความรู้จัก ArgoCD", "ก่อนเริ่ม k three s สามเครื่องและ argo c d ถูกลงด้วย ansible k eight s dot y m l แล้วจากตอน ดี ตอนนี้ทำความรู้จัก argo c d"); await L.hold(1);
  let J = "";
  // 1 k8s.yml
  await L.intro(0, "Ansible", "task ที่ลง ArgoCD", "เริ่มจากดูว่า ansible ลง argo c d ยังไง");
  await L.cap("ชี้ไฟล์: ansible/k8s.yml › Create argocd namespace → Install ArgoCD (kubectl apply install.yaml) → Expose ArgoCD on NodePort 30443 (ไฮไลต์)", "ไฟล์ k eight s dot y m l สามขั้นที่ไฮไลต์ สร้าง namespace argo c d ติดตั้งด้วย kubectl apply ไฟล์ install และเปิดพอร์ต nodeport สามหมื่นสี่ร้อยสี่สิบสามให้ ALB เข้ามาได้"); await viewFile("ansible/k8s.yml", "- name: Create argocd namespace", 14, 1, "nodePort");
  await L.tick(0, "ArgoCD ลงด้วย k8s.yml (3 task)", "argo c d ลงด้วยสามขั้นนี้");
  // 2 บนเครื่อง
  await L.intro(1, "k8s-1", "pod + service ของ ArgoCD", "ต่อมา เข้าไปดูในเครื่อง k eight s หนึ่ง");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("cd ansible → ssh เข้า k8s-1 (กลุ่ม role_k8s_server[0]) · k3s kubectl get pods -n argocd · get svc -n argocd (argocd-server = NodePort 443:30443)", "เข้าเครื่อง k eight s หนึ่ง ดู pod ของ argo c d ทั้งหมดและ service ซึ่ง argo c d server เป็น nodeport พอร์ตสามหมื่นสี่ร้อยสี่สิบสาม");
  await step("cdA", async () => { await term(`cd ${R.rp}/ansible`); }); R.k = await L.ev(`ansInventory().groups.role_k8s_server[0].privateIp`); J = `ssh -J ubuntu@${R.b} -i ~/.ssh/id_ed25519 ubuntu@${R.k}`;
  await step("ssh", async () => { await term(J); }); await step("yes", async () => { await term("yes"); });
  await step("pods", async () => { await term("k3s kubectl get pods -n argocd"); }); await L.hold(4);
  await step("svc", async () => { await term("k3s kubectl get svc -n argocd"); }); await L.hold(4);
  await L.cap("ดึงรหัสผ่านเริ่มต้นของ admin จาก secret argocd-initial-admin-secret (base64 -d)", "ดึงรหัสผ่านเริ่มต้นของ admin จาก secret แล้วถอดรหัส base sixty four");
  await step("pw", async () => { await term("k3s kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"); }); await L.hold(4);
  await step("ex", async () => { await term("exit"); });
  await L.tick(1, "pod/svc ArgoCD + รหัสเริ่มต้น", "ได้รหัสผ่านเริ่มต้นแล้ว");
  // 3 ALB
  await L.intro(2, "ALB :8443", "ทางเข้าหน้า ArgoCD", "ต่อมา ดูว่าหน้า argo c d เข้าถึงได้ยังไง");
  await L.cap("AWS console: EC2 › Load Balancers › pharmacy-alb › Listeners: พอร์ต 8443 (HTTPS) → target group pharmacy-argocd", "ที่คอนโซล aws ไปที่ EC2 load balancers เลือก pharmacy alb แท็บ listeners จะเห็นพอร์ตแปดสี่สี่สาม ส่งไป target group ของ argo c d");
  await svc("EC2", "Compute"); await step("lbs", async () => { await L.click(B("Load Balancers")); }); await L.sleep(500);
  await step("alb", async () => { await L.click({ t: "pharmacy-alb", tag: "td,a,button,span", starts: true }); }); await L.sleep(500);
  await step("lis", async () => { await L.click({ t: "Listeners", tag: "button,a,div,span", starts: true }); }); await L.hold(6);
  await L.cap("EC2 › Target Groups › pharmacy-argocd: พอร์ต 30443 (HTTPS) · เครื่อง k8s ทั้ง 3 ต้อง healthy", "ที่ target groups เลือก pharmacy argo c d พอร์ตสามหมื่นสี่ร้อยสี่สิบสาม ตรวจว่าเครื่อง k eight s สามเครื่อง healthy");
  await step("tgs", async () => { await L.click(B("Target Groups")); }); await L.sleep(500);
  await step("tga", async () => { await L.click({ t: "pharmacy-argocd", tag: "td,a,button,span", starts: true }); }); await L.hold(6);
  await L.tick(2, "ALB :8443 → target group pharmacy-argocd", "ทางเข้าหน้า argo c d ผ่าน load balancer พอร์ตแปดสี่สี่สาม");
  // 4 ล็อกอิน + เปลี่ยนรหัส
  await L.intro(3, "ล็อกอิน", "admin + รหัสเริ่มต้น → เปลี่ยนรหัส", "ต่อมา ล็อกอินด้วยรหัสเริ่มต้นแล้วเปลี่ยนรหัสทันที");
  await toBrowser(); await L.ev(`wbGo("${R.a}"); render(); 1`); await L.sleep(600);
  await L.cap("Browser › http://<ALB>:8443 (เบราว์เซอร์เตือนใบรับรอง เพราะเป็นแบบออกเอง) → admin + รหัสเริ่มต้น → SIGN IN", "เปิด ALB พอร์ตแปดสี่สี่สาม เบราว์เซอร์จะเตือนเรื่องใบรับรองเพราะเป็นแบบออกเอง ล็อกอินด้วย admin และรหัสเริ่มต้น");
  await argoLogin(R.pw); await L.hold(2);
  await L.cap("User Info › UPDATE PASSWORD: Current password · New password · Confirm → เปลี่ยนรหัสเริ่มต้นทันที (ไม่ควรใช้รหัสเริ่มต้นต่อ)", "ไปที่ user info กด update password ใส่รหัสเดิม รหัสใหม่ และยืนยัน เปลี่ยนรหัสเริ่มต้นทันที");
  await step("ui", async () => { await L.click({ t: "User Info", tag: "a,button,div,span", starts: true }); }); await L.sleep(400);
  await step("up", async () => { await L.click({ t: "🔒 UPDATE PASSWORD", tag: "button" }); }); await L.sleep(400);
  await step("p1", async () => { await L.type('input[aria-label="Current password"]', R.pw); }); await step("p2", async () => { await L.type('input[aria-label="New password"]', "Pharmacy-Argo-2026!"); }); await step("p3", async () => { await L.type('input[aria-label="Confirm new password"]', "Pharmacy-Argo-2026!"); }); await L.hold(1.5);
  await step("up2", async () => { await L.click({ t: "UPDATE PASSWORD", tag: "button" }); }); await L.hold(2.5);
  await L.tick(3, "ล็อกอิน + เปลี่ยนรหัสผ่านแล้ว", "ล็อกอินและเปลี่ยนรหัสผ่านแล้ว");
  // 5 Settings
  await L.intro(4, "Settings", "Repositories · Clusters · Projects · Accounts", "สุดท้าย ดูเมนู settings ของ argo c d");
  await L.cap("Settings: Repositories (repo ที่เชื่อม) · Clusters (in-cluster) · Projects (default) · Accounts (admin)", "ในเมนู settings มี repositories คือ repo ที่เชื่อมไว้ clusters คือ cluster ที่ดูแล projects และ accounts");
  await step("st", async () => { await L.click({ t: "Settings", tag: "a,button,div,span", starts: true }); }); await L.hold(3);
  for (const n of ["Repositories", "Clusters", "Projects", "Accounts"]) {
    await step("s" + n, async () => { await L.click({ t: n, tag: "a,button,div,span", starts: true }); }); await L.hold(3.5);
    await step("b" + n, async () => { await L.click({ t: "Settings", tag: "a,button,div,span", starts: true }); }); await L.sleep(500);
  }
  await L.tick(4, "สำรวจ Settings แล้ว", "ดูเมนู settings ครบแล้ว");
  await L.costScene("mainvm", "เรื่องค่าใช้จ่าย argo c d รันบนเครื่อง k three s ที่มีอยู่แล้ว ไม่คิดเงินเพิ่ม ค่าใช้จ่ายอยู่ที่เครื่องสามเครื่อง load balancer และ NAT ที่เปิดตลอด ควรตั้ง Budget และ destroy เมื่อเลิกใช้");
  await L.cap("✓ ตอน D+ เสร็จ: เข้า ArgoCD ได้ · เปลี่ยนรหัสแล้ว · รู้จักเมนู Settings · ต่อ: ตอน E ปล่อย prd", "สรุป เข้า argo c d ได้ เปลี่ยนรหัสแล้ว และรู้จักเมนู settings ตอนถัดไปปล่อย prd"); await L.hold(1.5);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase11i-a.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
