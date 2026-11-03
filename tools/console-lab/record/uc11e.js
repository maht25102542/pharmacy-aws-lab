// Use case 11 ตอน E: ปล่อย prd: tag v1.1.0 → Jenkins (prd + ยืนยัน) → manifest → ArgoCD OutOfSync → Sync → pod → เว็บ ALB :80 → rollback deploy-only
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
const openUrl = async (url, direct) => { if (direct) { await L.ev(`wbGo(${JSON.stringify(url)}); render(); 1`); await L.hold(1.2); return; } if (await L.ev(`!![].slice.call(document.querySelectorAll("button")).filter(function(b){return b.innerText.trim()==="— เลือกตัวอย่าง —"})[0]`)) await step("pick", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await L.sleep(300); await step("url", async () => { await L.type("main input[placeholder], main input[type=text]", url); }); await L.click(B("Go")); await L.hold(1.2); };
const argoLogin = async (pw) => {
  await step("au1", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await step("au2", async () => { await L.type("#w-aau", "admin"); });
  await step("ap1", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }); await step("ap2", async () => { await L.type("#w-aap", pw); }); await L.hold(1);
  await step("sin", async () => { await L.click(B("SIGN IN", { nth: 0 })); }); await L.hold(1.5);
};
const jkBuild = async (JURL, opt) => { // เปิด job pharmacy-backend › Build with Parameters ตาม opt แล้ว Build
  await L.ev(`wbGo("${JURL}/"); render(); 1`); await L.sleep(500); await L.ev(`W.page=""; W.btab=""; render(); 1`); await L.sleep(300);
  await step("job", async () => { await L.click({ t: "pharmacy-backend", tag: "a" }); }); await L.sleep(300);
  await step("bwp", async () => { await L.click({ t: "Build with Parameters", tag: "a,button", starts: true }); }); await L.hold(1);
  if (opt.env) await step("env", async () => { await L.pickBtn("dev", opt.env); });
  if (opt.ver) await step("ver", async () => { await L.pickBtn("v1.1.0", opt.ver); });
  if (opt.action) await step("act", async () => { await L.pickBtn("build-and-deploy", opt.action); });
  await L.hold(1.5); await step("bld", async () => { await L.click(B("Build", { nth: 0 })); }); await L.hold(1.5);
};
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["push + tag v1.1.0", "⌨️"], ["Jenkins: prd + ยืนยัน", "🧩"], ["ArgoCD: OutOfSync → Sync", "🐙"], ["pod + เว็บ prd", "🌐"], ["rollback v1.0.0", "↩️"]]);
  await L.cap("Use case 11 ตอน E · ปล่อย prd ด้วย tag + ArgoCD Sync", "use case สิบเอ็ด ตอน อี ปล่อย prd ด้วย tag เวอร์ชัน จากนั้น argo c d ดึงไปใช้ และลองย้อนเวอร์ชัน"); await L.hold(1);
  const R = JSON.parse(await L.ev(`var r=buildReady("demo"); readyPushCmds().forEach(function(c){shRun(c)}); readyBuild("dev"); readyBuild("prd"); S.argo.login=false; JSON.stringify({j:r.jenkins,a:r.argocd,alb:r.alb,b:r.bastion,k:S.insts.filter(function(i){return i.name==="pharmacy-k8s-1"})[0].privateIp,rp:REPO,pw:argoPwdOf(argoInst())})`));
  const JURL = `http://${R.j}:8080`, J = `ssh -J ubuntu@${R.b} -i ~/.ssh/id_ed25519 ubuntu@${R.k}`;
  await L.cap("ก่อนเริ่ม: prd รัน v1.0.0 อยู่แล้ว (lab หลัก) และ ArgoCD มีแอป prd แล้ว (ตอน D) ตอนนี้ปล่อยเวอร์ชันใหม่ v1.1.0", "ก่อนเริ่ม prd รันเวอร์ชัน หนึ่งจุดศูนย์จุดศูนย์ อยู่แล้ว และ argo c d มีแอป prd แล้วจากตอน ดี ตอนนี้ปล่อยเวอร์ชันใหม่ หนึ่งจุดหนึ่งจุดศูนย์"); await L.hold(1);
  // 1 push + tag
  await L.intro(0, "git tag", "ติด tag v1.1.0 แล้ว push", "ขั้นแรก แก้โค้ด ติด tag เวอร์ชัน แล้ว push");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("① repo-backend: แก้ README · commit · git tag v1.1.0 · git push · git push origin v1.1.0 (prd รับเฉพาะ tag vN.N.N)", "แก้ไฟล์ readme commit ติด tag v หนึ่งจุดหนึ่งจุดศูนย์ แล้ว push ทั้งโค้ดและ tag prd รับเฉพาะ tag รูปแบบ v เลขสามชุด");
  await step("cd", async () => { await term(`cd ${R.rp}/repo-backend`); }); await step("ed", async () => { await term(`echo '# release 1.1.0' >> README.md`); });
  for (const [n, c] of [["ad", "git add ."], ["cm", 'git commit -m "release 1.1.0"'], ["tg", "git tag v1.1.0"], ["p1", "git push"], ["p2", "git push origin v1.1.0"]]) await step(n, async () => { await term(c); });
  await L.tick(0, "push + tag v1.1.0 แล้ว", "push และติด tag แล้ว");
  // 2 Jenkins
  await L.intro(1, "Jenkins", "TARGET_ENV=prd · VERSION=v1.1.0 · ยืนยัน", "ต่อมา สั่ง jenkins ปล่อย prd");
  await toBrowser();
  await L.cap("② Jenkins › Build with Parameters: TARGET_ENV=prd · VERSION=v1.1.0 · AUTO_SYNC ไม่ติ๊ก → Build", "ที่ jenkins เลือก target env เป็น prd version เป็น v หนึ่งจุดหนึ่งจุดศูนย์ และไม่ติ๊ก auto sync แล้วกด build");
  await jkBuild(JURL, { env: "prd" }); // VERSION เริ่มต้นเป็น tag ล่าสุด (v1.1.0) อยู่แล้ว
  await L.ev(`W.page="build"; W.bid=jkBuildsOf(S.jk.job).slice(-1)[0].id; W.btab="console"; render(); 1`); await L.hold(1.5);
  await L.cap("③ build หยุดรอที่ Confirm production (Input requested) → กด ยืนยัน", "build หยุดรอที่ confirm production ต้องมีคนกด ยืนยัน ก่อนแตะ prd");
  await L.hold(3); await step("ok", async () => { await L.click({ t: "ยืนยัน", tag: "button", starts: true }); }); await L.hold(2);
  await L.ev(`var pr=[].slice.call(document.querySelectorAll("pre")).sort(function(a,b){return b.scrollHeight-a.scrollHeight})[0]; if(pr){var i=pr.innerText.indexOf("Update manifest"); if(i>0) pr.scrollTop=pr.scrollHeight*i/pr.innerText.length-60;} 1`);
  await L.cap("④ stage Update manifest: Jenkins แก้บรรทัด image: ใน repo manifests แล้วจบ (ไม่ได้สั่ง ArgoCD)", "stage update manifest แก้บรรทัด image ใน repo manifests แล้วจบ ไม่ได้สั่ง argo c d"); await L.hold(5);
  await L.tick(1, "Jenkins แก้ manifest prd แล้ว", "jenkins แก้ manifest ของ prd แล้ว");
  // 3 ArgoCD
  await L.intro(2, "ArgoCD", "เห็น OutOfSync แล้วกด Sync", "ที่ argo c d จะเห็นว่าแอปไม่ตรงกับ git");
  await L.ev(`wbGo("${R.a}"); render(); 1`); await L.sleep(500);
  await L.cap("⑤ ArgoCD ล็อกอิน (admin + รหัสเริ่มต้น) › pharmacy-backend-prd: OutOfSync", "ล็อกอิน argo c d แล้วเปิดแอป backend prd จะเห็นสถานะ out of sync");
  await argoLogin(R.pw); await L.hold(3);
  await step("app", async () => { await L.click({ t: "☆ pharmacy-backend-prd", tag: "div", starts: true }); }); await L.hold(2.5);
  await L.cap("⑥ กด SYNC › SYNCHRONIZE → Synced · Healthy (prd ไม่ auto-sync จึงต้องมีคนกด)", "กด sync แล้ว synchronize รอจนสถานะเป็น synced และ healthy prd ไม่ auto sync จึงต้องมีคนกด");
  await step("sync", async () => { await L.click({ t: "SYNC", tag: "button", starts: true }); }); await L.hold(1.5);
  await step("sync2", async () => { await L.click({ t: "SYNCHRONIZE", tag: "button", starts: true }); }); await L.hold(5);
  await L.tick(2, "ArgoCD sync เรียบร้อย", "argo c d sync เรียบร้อย");
  // 4 pod + เว็บ
  await L.intro(3, "pod + เว็บ prd", "3 replica · เปิดผ่าน ALB :80", "ดู pod และเปิดเว็บ prd");
  await L.click(B("Laptop", { nth: 0 })); await L.click({ t: "⌨️ Terminal", tag: "button", starts: true }); await L.sleep(400);
  await L.cap("⑦ ssh เข้า k8s-1 · get pods -n prd (backend ×3, frontend ×3) · rollout status", "ssh เข้า k8s หนึ่ง ดู pod ของ prd สามตัวต่อบริการ และ rollout status");
  await step("ssh", async () => { await term(J); }); await step("yes", async () => { await term("yes"); });
  await step("pods", async () => { await term("k3s kubectl get pods -n prd"); }); await L.hold(4);
  await step("ro", async () => { await term("k3s kubectl rollout status deployment/backend -n prd"); }); await L.hold(3);
  await toBrowser(); await L.ev(`wbGo("http://${R.alb}"); render(); 1`); await L.sleep(500);
  await L.cap("⑧ แท็บ Browser › http://<ALB> (พอร์ต 80) → เว็บ prd", "เปิด load balancer พอร์ตแปดสิบ จะเห็นเว็บ prd"); await L.hold(4);
  await L.tick(3, "prd รัน v1.1.0 (3 replica)", "prd รันเวอร์ชันใหม่แล้ว");
  // 5 rollback
  await L.intro(4, "rollback", "deploy-only v1.0.0", "สุดท้าย ลองย้อนเวอร์ชันด้วย deploy only");
  await L.cap("⑨ Jenkins › Build with Parameters: TARGET_ENV=prd · VERSION=v1.0.0 · ACTION=deploy-only → ยืนยัน → ArgoCD Sync", "ย้อนเวอร์ชันโดยเลือก prd version หนึ่งจุดศูนย์จุดศูนย์ และ action เป็น deploy only จะใช้ image เดิมไม่ build ใหม่");
  await jkBuild(JURL, { env: "prd", ver: "v1.0.0", action: "deploy-only" });
  await L.ev(`W.page="build"; W.bid=jkBuildsOf(S.jk.job).slice(-1)[0].id; W.btab="console"; render(); 1`); await L.hold(1.5);
  await step("ok2", async () => { await L.click({ t: "ยืนยัน", tag: "button", starts: true }); }); await L.hold(3);
  await L.ev(`wbGo("${R.a}"); render(); 1`); await L.sleep(500);
  await step("app2", async () => { await L.click({ t: "☆ pharmacy-backend-prd", tag: "div", starts: true }); }); await L.hold(2);
  await step("sync3", async () => { await L.click({ t: "SYNC", tag: "button", starts: true }); }); await L.hold(1.2); await step("sync4", async () => { await L.click({ t: "SYNCHRONIZE", tag: "button", starts: true }); }); await L.hold(5);
  await L.tick(4, "ย้อนกลับเป็น v1.0.0 ได้", "ย้อนเวอร์ชันกลับเป็น หนึ่งจุดศูนย์จุดศูนย์ ได้แล้ว");
  await L.costScene("mainvm", "เรื่องค่าใช้จ่าย การปล่อยเวอร์ชันใหม่ไม่เพิ่มค่าใช้จ่าย ค่าใช้จ่ายอยู่ที่ k3s สามเครื่อง load balancer และ NAT ที่เปิดตลอด ควรตั้ง Budget และ destroy เมื่อเลิกใช้");
  await L.cap("✓ สำเร็จ: tag vN.N.N → Jenkins (ยืนยัน) → แก้ manifest → ArgoCD Sync → prd 3 replica · ย้อนด้วย deploy-only", "สรุป prd ปล่อยด้วย tag ผ่านการยืนยัน แล้ว argo c d ดึงไปใช้ และย้อนเวอร์ชันได้ด้วย deploy only"); await L.hold(1.5);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase11e-b.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
