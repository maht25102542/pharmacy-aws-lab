// Use case 11 ตอน D: เตรียม prd: ansible k8s.yml (k3s HA 3 เครื่อง + ArgoCD) · ล็อกอิน ArgoCD · เปิด apps.yaml/deployment.yaml · kubectl apply → 2 แอป
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
  await L.plan([["EC2 k3s ×3 (console)", "EC2"], ["ansible k8s.yml", "🎛️"], ["ล็อกอิน ArgoCD", "🐙"], ["apps.yaml", "📁"], ["deployment.yaml", "📁"], ["kubectl apply", "⌨️"]]);
  await L.cap("Use case 11 ตอน D · เตรียม prd: k3s 3 เครื่อง + ArgoCD", "use case สิบเอ็ด ตอน ดี เตรียม prd ที่ใช้ k3s สามเครื่องกับ argo c d จะรัน ansible เปิดไฟล์ที่ต้องตั้ง และสร้างแอปใน argo c d"); await L.hold(1);
  const R = JSON.parse(await L.ev(`buildAnsibleLab("ans"); S.insts=S.insts.filter(function(i){return i.name!=="pharmacy-k8s-1"}); var u=ghUser(); ["repo-backend","repo-frontend"].forEach(function(d){ shRun("cd "+REPO+"/"+d); ["git init -b main","git add .","git commit -m initial","git remote add origin https://github.com/"+u+"/pharmacy-"+d.slice(5)+".git","git push -u origin main","git tag v1.0.0","git push origin v1.0.0"].forEach(function(c){shRun(c)}); }); JSON.stringify({b:S.insts.filter(function(i){return i.name==="pharmacy-bastion"})[0].publicIp,a:"http://"+S.albs[0].dns+":8443",u:u,rp:REPO})`));
  let J = "";
  await L.cap("ก่อนเริ่ม: เครื่อง/ฐานข้อมูลพร้อมแล้ว (lab หลัก) และ push repo backend/frontend ขึ้น GitHub แล้ว ตอนนี้เตรียม cluster prd", "ก่อนเริ่ม เครื่องและฐานข้อมูลพร้อมแล้วจาก lab หลัก และ push repo backend กับ frontend แล้ว ตอนนี้เตรียม cluster prd"); await L.hold(1);
  // 0 EC2 บน console: สร้างเครื่อง k3s (k8s-1 ทำให้ดู · k8s-2, k8s-3 คือ launch ซ้ำคนละ AZ)
  await L.intro(0, "EC2", "สร้างเครื่อง k3s บน console", "ก่อนลง k3s ต้องมีเครื่องก่อน สร้างเครื่อง k eight s หนึ่งบน AWS console");
  await L.cap("① EC2 › Instances › Launch instances · ชื่อ pharmacy-k8s-1 · Tags: Project=pharmacy · Role=k8s_server · Tier=private", "เปิด EC2 ไปที่ Instances กด Launch instances ตั้งชื่อ pharmacy k eight s หนึ่ง และเพิ่ม tag role เป็น k eight s server เครื่องอื่นของ cluster ต้องทำซ้ำอีกสองเครื่องคนละ availability zone");
  await svc("EC2", "Compute"); await step("inst", async () => { await L.click(B("Instances")); }); await step("launch", async () => { await L.click(B("Launch instances")); }); await L.sleep(800);
  await step("name", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await step("name2", async () => { await L.sleep(400); await L.type("main input[placeholder]", "pharmacy-k8s-1"); });
  for (const [k, v] of [["Project", "pharmacy"], ["Role", "k8s_server"], ["Tier", "private"]]) {
    await step("addtag" + k, async () => { await L.click(B("Add tag", { nth: 0 })); }); await L.sleep(300);
    await step("tk" + k, async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await step("tv" + k, async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await L.sleep(300);
    await step("tki" + k, async () => { await L.type('main input[placeholder^="Key"]:placeholder-shown', k); }); await step("tvi" + k, async () => { await L.type('main input[placeholder^="Value"]:placeholder-shown', v); });
  }
  await L.hold(1.5);
  await L.cap("② t3.medium · key pair pharmacy-admin · Network: pharmacy-vpc · private subnet (AZ a) · SG pharmacy-base + pharmacy-k8s", "เลือก t three medium key pair ของเรา เครือข่ายเป็น VPC ของเรา subnet แบบ private ใน zone เอ และ security group สองตัว คือ pharmacy base กับ pharmacy k eight s");
  await step("type", async () => { await L.pick(B("t3.micro", { starts: true }), "t3.medium"); });
  await step("key", async () => { await L.pick(B("Proceed without", { starts: true }), "pharmacy-admin"); });
  await step("edit", async () => { await L.click(B("Edit")); await L.pick(B("vpc-", { starts: true }), "pharmacy-vpc"); });
  await step("subnet", async () => { await L.pick(B("No preference"), "pharmacy-private-1"); });
  await step("sgdef", async () => { await L.click({ t: "default", tag: "label", starts: true }); });
  await step("sgb", async () => { await L.click({ t: "pharmacy-base", tag: "label", starts: true }); }); await step("sgd", async () => { await L.click({ t: "pharmacy-k8s", tag: "label", starts: true }); }); await L.hold(1.5);
  await L.cap("③ Advanced details › IAM instance profile: pharmacy-k8s (ดึง image จาก ECR ได้) → Launch instance", "ส่วน advanced เลือก IAM instance profile เป็น pharmacy k eight s เพื่อดึง image จาก E C R ได้ แล้วกด launch");
  await step("iam", async () => { await L.pick(B("-", { nth: 0 }), "pharmacy-k8s"); }); await L.hold(1);
  await step("go", async () => { await L.click(B("Launch instance", { nth: 0 })); }); await L.hold(2.5);
  if (!(await L.ev(`S.insts.some(function(i){return i.name==="pharmacy-k8s-1"})`))) { console.log("FAIL k8s-1 not created"); await L.finish(); process.exit(1); }
  await L.cap("④ EC2 › Instances: เห็น pharmacy-k8s-1, 2, 3 คนละ AZ (2 และ 3 สร้างซ้ำแบบเดียวกัน หรือใช้ Terraform count) · SG pharmacy-k8s inbound: เครื่อง k3s คุยกันเอง + ALB เข้า :30080 · :30443", "ตอนนี้มีเครื่อง k eight s สามเครื่องคนละ zone เครื่องสองและสามสร้างซ้ำแบบเดียวกัน หรือจะใช้ terraform count ก็ได้ และ security group ของ k eight s เปิดให้เครื่องคุยกันเอง และ ALB เข้าได้พอร์ตสามหมื่นแปดสิบกับสามหมื่นสี่ร้อยสี่สิบสาม");
  await L.hold(4); await step("sgs", async () => { await L.click(B("Security Groups")); }); await L.sleep(400);
  await step("sgk", async () => { await L.click({ t: "pharmacy-k8s", tag: "td,a,button,span", starts: true }); }); await L.hold(2);
  await step("inb", async () => { await L.click({ t: "Inbound rules", tag: "button,a,div,span", starts: true }); }); await L.hold(6);
  await L.tick(0, "EC2 k3s ×3 (k8s-1 สร้างบน console)", "เครื่อง k three s พร้อมแล้ว");
  // 1 ansible
  await L.intro(1, "Ansible", "k3s HA 3 เครื่อง + ArgoCD", "ขั้นแรก ใช้ ansible ลง k3s สามเครื่องแบบ เอชเอ และลง argo c d");
  await L.cap("① ansible/k8s.yml (k8s-1 --cluster-init · k8s-2,3 join ทีละเครื่อง · ลง ArgoCD บน k8s-1)", "ไฟล์ k eight s dot y m l"); await viewFile("ansible/k8s.yml", "", 12, 2);
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("② cd ansible · ansible-playbook k8s.yml", "แล้วรัน ansible playbook k eight s dot y m l");
  await step("cdA", async () => { await term(`cd ${R.rp}/ansible`); }); R.k = await L.ev(`ansInventory().groups.role_k8s_server[0].privateIp`); J = `ssh -J ubuntu@${R.b} -i ~/.ssh/id_ed25519 ubuntu@${R.k}`; await step("pb", async () => { await term("ansible-playbook k8s.yml"); }); await L.hold(8);
  await L.cap("③ ssh เข้า k8s-1 · k3s kubectl get nodes (3 เครื่อง Ready) · get pods -n argocd", "ssh เข้าเครื่อง k8s หนึ่ง ดู nodes สามเครื่อง และ pod ของ argo c d");
  await step("ssh", async () => { await term(J); }); await step("yes", async () => { await term("yes"); });
  await step("nodes", async () => { await term("k3s kubectl get nodes"); }); await L.hold(3);
  await step("argopods", async () => { await term("k3s kubectl get pods -n argocd"); }); await L.hold(4);
  await L.tick(1, "k3s 3 เครื่อง + ArgoCD พร้อม", "k three s สามเครื่องและ argo c d พร้อมแล้ว");
  // 2 login
  await L.intro(2, "ArgoCD", "รหัสผ่านเริ่มต้น + เข้า UI ผ่าน ALB :8443", "ต่อมา ดึงรหัสผ่านเริ่มต้นของ argo c d แล้วเข้า หน้า UI");
  await L.cap("④ kubectl -n argocd get secret argocd-initial-admin-secret … | base64 -d", "ดึงรหัสผ่านเริ่มต้นจาก secret แล้วถอดรหัส base sixty four");
  await step("pw", async () => { await term("k3s kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"); }); await L.hold(4);
  const PW = await L.ev(`argoPwdOf(argoInst())`);
  await step("ex", async () => { await term("exit"); });
  await toBrowser(); await L.ev(`wbGo("${R.a}"); render(); 1`); await L.sleep(500);
  await L.cap("⑤ แท็บ Browser › http://<ALB>:8443 › admin + รหัสที่ได้ → SIGN IN", "เปิด ALB พอร์ตแปดสี่สี่สาม ล็อกอินด้วย admin และรหัสที่ได้");
  await argoLogin(PW);
  await L.tick(2, "เข้า ArgoCD ได้", "เข้า argo c d ได้แล้ว");
  // 3 apps.yaml
  await L.intro(3, "apps.yaml", "ประกาศแอป prd ให้ ArgoCD", "ต่อมา ประกาศแอปที่ argo c d จะดูแล");
  await L.cap("⑥ repo-manifests/argocd-apps/apps.yaml: repoURL · path · destination · ไม่มี automated (prd ต้องมีคนกด Sync)", "ไฟล์ apps dot y m l บอกว่าดึงจาก repo ไหน โฟลเดอร์ไหน ไป cluster ไหน และ prd ไม่มี automated ต้องมีคนกด sync"); await viewFile("repo-manifests/argocd-apps/apps.yaml", "", 12);
  await L.tick(3, "apps.yaml (prd 2 แอป)", "ไฟล์ประกาศแอป");
  // 4 deployment
  await L.intro(4, "deployment.yaml", "สิ่งที่ ArgoCD เอาไปใช้", "และไฟล์ที่ argo c d เอาไปสร้างของใน cluster");
  await L.cap("⑦ repo-manifests/prd/backend/deployment.yaml: replicas 3 · probe 3 ตัว · บรรทัด image: คือที่ Jenkins แก้ · Job backend-migrate (PreSync)", "ไฟล์ deployment dot y m l ของ backend มี replicas สามตัว probe สามแบบ บรรทัด image ที่ jenkins แก้ และ job migrate ที่รันก่อน sync"); await viewFile("repo-manifests/prd/backend/deployment.yaml", "", 11, 3);
  await L.tick(4, "deployment.yaml (prd)", "ไฟล์ deployment");
  // 5 push manifests + apply
  await L.intro(5, "kubectl apply", "push manifests แล้วสร้าง 2 แอป", "สุดท้าย push repo manifests ขึ้น github แล้วสร้างแอปใน argo c d");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("⑧ repo-manifests: แก้ YOUR_GITHUB_USER → ชื่อ GitHub · git init/add/commit/push", "ในโฟลเดอร์ repo manifests แก้ชื่อ github ในไฟล์ apps แล้ว push ขึ้น github");
  await step("cdm", async () => { await term(`cd ${R.rp}/repo-manifests`); }); await step("sed", async () => { await term(`sed -i 's/YOUR_GITHUB_USER/${R.u}/g' argocd-apps/apps.yaml`); });
  for (const [n, c] of [["gi", "git init -b main"], ["ga", "git add ."], ["gc", 'git commit -m "manifests prd"'], ["gr", `git remote add origin https://github.com/${R.u}/pharmacy-manifests.git`], ["gp", "git push -u origin main"]]) await step(n, async () => { await term(c); });
  await L.cap("⑨ ssh เข้า k8s-1 · kubectl apply -f …/apps.yaml → application created ×2", "ssh เข้า k8s หนึ่ง แล้ว kubectl apply ไฟล์ apps dot y m l ได้แอปสองตัว");
  await step("ssh2", async () => { await term(J); }); await step("yes2", async () => { await term("yes"); });
  await step("apply", async () => { await term(`k3s kubectl apply -f https://raw.githubusercontent.com/${R.u}/pharmacy-manifests/main/argocd-apps/apps.yaml`); }); await L.hold(3);
  await step("apps", async () => { await term("k3s kubectl get applications -n argocd"); }); await L.hold(4);
  await toBrowser(); await L.ev(`wbGo("${R.a}"); render(); 1`); await L.hold(1);
  await L.cap("⑩ ArgoCD › Applications: pharmacy-backend-prd / pharmacy-frontend-prd (ยังไม่ Synced: prd รอคนกด Sync)", "กลับมาที่หน้า argo c d จะเห็นสองแอปของ prd ยังไม่ synced เพราะรอคนกด sync"); await L.hold(5);
  await L.tick(5, "สร้าง 2 แอป prd ใน ArgoCD", "สร้างแอป prd ใน argo c d แล้ว");
  await L.costScene("mainvm", "เรื่องค่าใช้จ่าย prd ใช้ k3s สามเครื่องกับ load balancer และ NAT ที่คิดเงินรายชั่วโมงตลอดเวลาที่เปิด ควรตั้ง Budget และ terraform destroy เมื่อเลิกใช้");
  await L.cap("✓ ตอน D เสร็จ: k3s HA + ArgoCD + apps.yaml · ตอน E: ปล่อย prd ด้วย tag แล้ว Sync", "สรุป cluster prd พร้อมแล้ว ตอนถัดไปปล่อย prd ด้วย tag แล้วกด sync"); await L.hold(1.5);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase11d-d.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
