// ---- แท็บ Lab › "ลำดับการปล่อย": ภาพ + animation + โค้ดที่ตรงกัน (Jenkinsfile, deployment.yaml, apps.yaml) เหมือนแท็บ HCL ของ Terraform
FOLD.fanim = 1; FOLD.fcode = 1;
var FLOW = { env: "dev", action: "build-and-deploy", svc: "backend", sync: false }, FT = [];
var FNODE = { you: [20, 150, "คุณ (Laptop)", "git push · กด Build", "#546e7a"], gh: [210, 150, "GitHub", "", "#24292f"], jk: [400, 150, "Jenkins", "", "#d33833"], sq: [400, 30, "SonarQube", ":9000", "#2e7d32"], ecr: [400, 300, "ECR", "", "#a85a00"], mf: [610, 150, "GitHub", "pharmacy-manifests", "#24292f"], ar: [810, 150, "ArgoCD", "", "#ef7b4d"], k8: [810, 300, "k3s cluster", "", "#326ce5"], alb: [610, 440, "ALB", "", "#d81b60"], br: [400, 440, "Browser", "ผู้ใช้เปิดเว็บ", "#546e7a"] };
var FICO = { you: "terraform", gh: "github", jk: "jenkins", sq: "sonarqubeserver", ecr: "ecr", mf: "github", ar: "argo", k8: "kubernetes", alb: "elb", br: null };
var FEDGE = [["you", "gh"], ["you", "jk"], ["gh", "jk"], ["jk", "sq"], ["jk", "ecr"], ["jk", "mf"], ["mf", "ar"], ["ar", "k8"], ["ecr", "k8"], ["br", "alb"], ["alb", "k8"]];
var FSTAGE = {
  git: ["#546e7a", "คำสั่ง git ที่คุณพิมพ์", "Terminal บน laptop"], params: ["#8456ce", "พารามิเตอร์ของ job (หน้า Build with Parameters)", "Jenkins"], env: ["#6d4c41", "ตัวแปรของ pipeline (ชื่อ image, ชื่อแอป ArgoCD)", "Jenkins"], head: ["#879596", "หัวไฟล์ + ตัวเลือกของ pipeline", "Jenkins"],
  "Validate": ["#0972d3", "ตรวจ VERSION (prd รับเฉพาะ vN.N.N)", "Jenkins"], "Confirm production": ["#d63f9e", "หยุดรอคนกดยืนยัน (เฉพาะ prd)", "Jenkins"], "Checkout version": ["#00a1c9", "ดึงโค้ดตาม tag จาก GitHub", "Jenkins ← GitHub"], "SonarQube scan": ["#2e7d32", "ส่งโค้ดให้ SonarQube ตรวจ + รอ Quality gate", "Jenkins → SonarQube :9000"],
  "Test": ["#a85a00", "รันเทสต์ในกล่องชั่วคราว", "Jenkins (docker run --rm)"], "Build image": ["#a85a00", "docker build เป็น image ตาม tag", "Jenkins (docker build)"], "Scan image": ["#a85a00", "Trivy สแกนช่องโหว่ก่อน push", "Jenkins (trivy)"], "Push image": ["#a85a00", "push ขึ้น ECR ด้วย IAM role", "Jenkins → ECR (IAM role PowerUser)"], "Check image exists": ["#a85a00", "เช็กว่า image มีใน ECR แล้ว (deploy-only)", "Jenkins → ECR"], "Update manifest": ["#c62828", "แก้บรรทัด image: ใน repo manifests แล้ว push", "Jenkins → GitHub pharmacy-manifests"],
  "Sync ArgoCD": ["#ef7b4d", "สั่ง ArgoCD sync แล้วรอ Healthy (เมื่อติ๊ก AUTO_SYNC)", "Jenkins → ArgoCD :30443"], post: ["#879596", "ทำความสะอาด + สรุปผล", "Jenkins"], apps: ["#5c6bc0", "ประกาศแอปให้ ArgoCD: ดึงจาก repo ไหน ไป cluster ไหน sync เองไหม", "ArgoCD (บน k8s-1)"], deploy: ["#326ce5", "Deployment + Service ของ k3s: บรรทัด image: คือสิ่งที่ Jenkins แก้", "k3s cluster"]
};
function flowCfgInfo() {
  var c = FLOW, u = (S.ready && S.ready.user) || ghUser(), reg = String((S.tf && S.tf.outputs && S.tf.outputs.ecr_registry) || "000000000000.dkr.ecr.ap-southeast-1.amazonaws.com").replace(/^"|"$/g, "");
  return { c: c, u: u, V: "v1.0.0", reg: reg, repo: "pharmacy-" + c.svc, app: "pharmacy-" + c.svc + "-" + c.env, img: reg + "/pharmacy/" + c.svc + ":v1.0.0", port: c.env === "dev" ? 8080 : 80, n: c.env === "prd" ? 3 : 1, build: c.action === "build-and-deploy" };
}
function flowSteps() {
  var I = flowCfgInfo(), c = I.c, st = [], si = "pharmacy/" + c.svc + ":" + I.V, q = function (k, from, to, code, t, w, n, path) { st.push({ k: k, path: path || (from && to ? [from, to] : [from]), lit: path || (from && to ? [from, to] : [from]), code: code, t: t, w: w, n: n || "" }); };
  if (I.build) q("git", "you", "gh", "git", "git push tag", "คุณส่งโค้ดเวอร์ชัน " + I.V + " ขึ้น GitHub (repo " + I.repo + ")");
  q("params", "you", "jk", "params", "กด Build with Parameters ใน Jenkins", "เลือก env=" + c.env + " · VERSION=" + I.V + " · ACTION=" + c.action + (c.env === "prd" ? " · AUTO_SYNC=" + (c.sync ? "ติ๊ก" : "ไม่ติ๊ก") : ""), "service ผูกกับ job " + I.repo + " อยู่แล้ว ไม่ต้องเลือก");
  q("Validate", "jk", null, "Validate", "Validate (ตรวจค่าที่เลือก)", "VERSION ต้องไม่ว่าง" + (c.env === "prd" ? " และต้องเป็นรูป vN.N.N" : ""), c.env === "prd" ? "prd รับเฉพาะ tag แบบ v1.2.3" : "");
  if (c.env === "prd") q("Confirm production", "jk", null, "Confirm production", "รอคนกดยืนยัน", "Jenkins หยุดรอให้กด 'ยืนยัน' ก่อนแตะ production", "มีเฉพาะ prd");
  if (I.build) {
    q("Checkout version", "gh", "jk", "Checkout version", "ดึงโค้ดตาม tag", "ได้โค้ดของ " + I.V + " พอดี (ไม่ใช่ main ล่าสุด)");
    q("Test", "jk", null, "Test", "รันเทสต์", c.svc === "backend" ? "pytest 27 ข้อ (Django + sqlite) ในกล่อง python ชั่วคราว" : "npm ci → lint → typecheck → vitest ในกล่อง node ชั่วคราว", "เทสต์ไม่ผ่าน = หยุดก่อนเสียเวลา build");
    q("SonarQube scan", "jk", "sq", "SonarQube scan", "SonarQube ตรวจโค้ด", "ส่งโค้ดไปตรวจที่พอร์ต 9000 แล้วรอ Quality gate", "ไม่ผ่าน = pipeline หยุดที่ขั้นนี้");
    q("Build image", "jk", null, "Build image", "docker build เป็น image " + si, c.svc === "backend" ? "build ตาม Dockerfile 2 ด่าน (คอมไพล์ mysqlclient → image เล็กรันด้วย user ไม่ใช่ root)" : "build ตาม Dockerfile 3 ด่าน (npm ci → next build → image standalone เล็ก)", "tag = เวอร์ชัน ไม่ใช้ latest");
    q("Scan image", "jk", null, "Scan image", "Trivy สแกนช่องโหว่ใน image", "เจอ HIGH/CRITICAL ที่มีตัวแก้ = หยุด ก่อนที่ image จะออกไปถึง ECR", "ล้มเร็ว ดีกว่าปล่อย image มีช่องโหว่");
    q("Push image", "jk", "ecr", "Push image", "push image ขึ้น ECR", "ได้ image " + si + " เก็บไว้ใน ECR", "Jenkins ใช้ IAM role PowerUser ไม่ต้องฝัง access key");
  } else q("Check image exists", "jk", "ecr", "Check image exists", "เช็กว่า image มีใน ECR", "deploy-only: ไม่ build ใหม่ ใช้ image เดิม " + si, "คือตัวเดียวกับที่ทดสอบใน dev");
  q("Update manifest", "jk", "mf", "Update manifest", "แก้ image: ใน repo manifests", "Jenkins แก้บรรทัด image: ของ " + c.env + "/" + c.svc + "/deployment.yaml เป็น …/" + si + " แล้ว push", "ดูโค้ดด้านล่าง: บรรทัดเดิมถูกขีดฆ่า บรรทัดใหม่สีเขียว");
  if (c.env === "dev") q("apps", "mf", "ar", "apps", "ArgoCD เห็นว่า manifests เปลี่ยน", "แอป " + I.app + " ตั้ง auto-sync จึงนำไปใช้เอง", "ดู syncPolicy.automated ใน apps.yaml");
  else if (c.sync) q("Sync ArgoCD", "jk", "ar", "Sync ArgoCD", "Jenkins สั่ง ArgoCD sync", "แล้วรอจนสถานะ Healthy", "เพราะติ๊ก AUTO_SYNC");
  else { q("apps", "mf", "ar", "apps", "ArgoCD เห็นว่า manifests เปลี่ยน", "แอป " + I.app + " ไม่ auto-sync จึงขึ้นสถานะ OutOfSync", "prd รอให้คนตัดสินใจ"); q("Sync ArgoCD", "you", "ar", "apps", "คุณกด SYNC ใน ArgoCD", "ตัดสินใจเองว่าจะปล่อยจริงตอนไหน"); }
  q("deploy", "ar", "k8", "deploy", "ArgoCD ปรับ Deployment บน k3s", "namespace " + c.env + " เปลี่ยนไปใช้ image ใหม่");
  q("deploy", "ecr", "k8", "deploy", "k3s ดึง image จาก ECR", "node โหลด " + si + " มาไว้ในเครื่อง", "ต้องมี secret ecr-pull (ต่ออายุทุก 12 ชม.) ไม่งั้นขึ้น ImagePullBackOff");
  q("deploy", "k8", null, "deploy", "pod ใหม่เริ่มทำงาน", I.n + " replica พอ readinessProbe ผ่านจึงรับ traffic", "rolling update: pod เก่าไม่หยุดจนกว่าตัวใหม่พร้อม");
  q("deploy", "br", "k8", "deploy", "ผู้ใช้เปิดเว็บ", "เบราว์เซอร์ → ALB พอร์ต " + I.port + " → k3s → pod ตอบ", "", ["br", "alb", "k8"]);
  return st;
}
function flowMsg(el, n, s) {
  el.textContent = ""; el.appendChild(h("div", { style: "font-size:1.02rem", text: n + ") " + s.t })); el.appendChild(h("div", { style: "font-weight:400", text: s.w })); if (s.n) el.appendChild(h("div", { style: "font-weight:400;font-size:.82rem;opacity:.75", text: "ℹ " + s.n }));
}
// ---- โค้ด: Jenkinsfile แยกเป็นบล็อกตาม stage + deployment.yaml + apps.yaml
function flowBlocks() {
  var I = flowCfgInfo(), c = I.c, jf = (LABFILES["repo-" + c.svc + "/Jenkinsfile"] || "").split("\n"), out = [], i;
  function span(startRe, endRe, from) { var a = -1, b = -1; for (i = from || 0; i < jf.length; i++) if (a < 0 && startRe.test(jf[i])) a = i; else if (a >= 0 && endRe.test(jf[i])) { b = i; break; } return [a, b]; }
  var ps = span(/^  parameters \{/, /^  \}$/), es = span(/^  environment \{/, /^  \}$/), po = span(/^  post \{/, /^  \}$/);
  out.push({ id: "git", key: "git", text: "# ที่ Terminal ของ laptop (ใน repo " + "repo-" + c.svc + ")\ngit tag " + I.V + "\ngit push origin " + I.V });
  out.push({ id: "head", key: "head", text: jf.slice(0, ps[0]).join("\n") });
  out.push({ id: "params", key: "params", text: jf.slice(ps[0], ps[1] + 1).join("\n") });
  out.push({ id: "env", key: "env", text: jf.slice(es[0], es[1] + 1).join("\n") });
  for (i = 0; i < jf.length; i++) { var m = /^    stage\('(.+)'\) \{/.exec(jf[i]); if (m) { var e = span(new RegExp("^    stage\\('" + m[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "'\\) \\{"), /^    \}$/, i); out.push({ id: m[1], key: m[1], text: jf.slice(e[0], e[1] + 1).join("\n") }); i = e[1]; } }
  out.push({ id: "post", key: "post", text: jf.slice(po[0], po[1] + 1).join("\n") });
  var ap = (LABFILES["repo-manifests/argocd-apps/apps.yaml"] || "").replace(/YOUR_GITHUB_USER/g, I.u).split(/^---$/m).filter(function (d) { return d.indexOf("name: " + I.app) >= 0; })[0] || "";
  out.push({ id: "apps", key: "apps", text: "# repo pharmacy-manifests › argocd-apps/apps.yaml (เฉพาะแอป " + I.app + ")\n" + ap.trim() });
  out.push({ id: "deploy", key: "deploy", text: "# repo pharmacy-manifests › " + c.env + "/" + c.svc + "/deployment.yaml\n" + (LABFILES["repo-manifests/" + c.env + "/" + c.svc + "/deployment.yaml"] || "").trim() });
  return out;
}
function flowFullView() {
  var I = flowCfgInfo(), c = I.c, T = JKX_THEME[JKX.theme] || JKX_THEME.github, box = h("div"), jtxt = LABFILES["repo-" + c.svc + "/Jenkinsfile"] || "", dpath = "repo-manifests/" + c.env + "/" + c.svc + "/deployment.yaml", dtxt = LABFILES[dpath] || "";
  var ap = (LABFILES["repo-manifests/argocd-apps/apps.yaml"] || "").replace(/YOUR_GITHUB_USER/g, I.u).split(/^---$/m).filter(function (d) { return d.indexOf("name: " + I.app) >= 0; })[0] || "";
  function head(t) { return h("div", { style: "font-weight:700;margin:14px 0 6px;font-family:var(--ui,system-ui)", text: t }); }
  box.appendChild(head("repo-" + c.svc + "/Jenkinsfile")); box.appendChild(jkxFull(jkxSplit(jtxt, "jf"), "jf", jtxt));
  box.appendChild(head("repo-manifests/argocd-apps/apps.yaml (เฉพาะแอป " + I.app + ")")); box.appendChild(codePre(ap.trim(), "yaml"));
  box.appendChild(head(dpath)); box.appendChild(jkxFull(jkxSplit(dtxt, "yaml"), "yaml", dtxt));
  return box;
}
function flowCodeView() {
  if (JKX.view === "full") return flowFullView();
  var T = JKX_THEME[JKX.theme] || JKX_THEME.github, box = h("div", { style: "font-family:var(--mono);font-size:.8rem;line-height:1.6" }), I = flowCfgInfo(), seenImg = false;
  flowBlocks().forEach(function (b) {
    var d = FSTAGE[b.key] || ["#879596", b.key, ""], col = d[0], sn = /^(Validate|Confirm production|Checkout version|Test|SonarQube scan|Build image|Scan image|Push image|Check image exists|Update manifest|Sync ArgoCD)$/.test(b.key), kind = b.id === "apps" || b.id === "deploy" ? "yaml" : "jf";
    var note = flowNote(b), el = h("div", { id: "fb-" + b.id, "data-k": b.key, style: "border-left:5px solid " + col + ";background:" + hexA(col, 0.09) + ";border-radius:6px;margin:0 0 10px;overflow-x:auto" });
    el.appendChild(h("div", { style: "padding:7px 12px;border-bottom:1px solid " + hexA(col, 0.25) + ";font-family:var(--ui,system-ui);font-size:.88rem;line-height:1.5" }, [h("b", { style: "color:" + col, text: (sn ? "stage │ " : "") + b.id + " : " + d[1] }), h("div", { text: "รัน/ใช้ที่: " + d[2] })].concat(note ? [note[0] ? h("div", { text: "ทำอะไร: " + note[0] }) : null, note[1] ? h("div", { style: "color:var(--muted)", text: "เทียบกับ" + note[1].replace(/^แบบเล่นๆ:?\s*/, "แบบเล่นๆ: ") }) : null, note[2] ? h("div", { style: "color:var(--muted)", text: "ผลที่ได้: " + note[2] }) : null] : [])));
    var code = h("div", { style: "padding:8px 0;background:" + T[1] + ";color:" + T[2] + ";border-radius:0 0 6px 0" });
    b.text.split("\n").forEach(function (ln, i) {
      var row = jkxLine(ln, kind, i + 1);
      if (b.id === "deploy" && !seenImg && /^\s*image: /.test(ln)) { seenImg = true; row.id = "fimgold"; row = h("div", { id: "fimg" }, [row, h("div", { id: "fimgnew", style: "display:none;background:rgba(29,129,2,.22);font-weight:700;color:#4ade80;padding-left:3.4em;white-space:pre-wrap", text: "+" + ln.replace(/image: .*/, "image: " + I.img) })]); }
      code.appendChild(row);
    });
    el.appendChild(code); box.appendChild(el);
  });
  return box;
}
function flowJump(id) { var el = document.getElementById("fb-" + id); if (!el) return; var dd = el.closest("details"); if (dd && !dd.open) { dd.open = true; FOLD.fcode = 1; } el.scrollIntoView({ behavior: "smooth", block: "center" }); el.style.outline = "3px solid #ff9900"; setTimeout(function () { el.style.outline = ""; }, 1400); }
function flowAnim() {
  var I = flowCfgInfo(), c = I.c, steps = flowSteps(), W2 = 980, H2 = 540, svg = sv("svg", { viewBox: "0 0 " + W2 + " " + H2, width: "100%", style: "max-width:" + W2 + "px;font-family:inherit", role: "img", "aria-label": "แผนภาพลำดับการปล่อย" }), el = {};
  var sub = { gh: I.repo, jk: "job " + I.repo, ecr: "pharmacy/" + c.svc, ar: "app " + I.app, k8: (c.env === "dev" ? "pharmacy-dev" : "k8s-1..3") + " · pod ×" + I.n, alb: "พอร์ต " + I.port };
  FEDGE.forEach(function (e) { var a = FNODE[e[0]], b = FNODE[e[1]]; svg.appendChild(sv("line", { x1: a[0] + 70, y1: a[1] + 30, x2: b[0] + 70, y2: b[1] + 30, stroke: "#b6bec9", "stroke-width": 2, "stroke-dasharray": "5 4" })); });
  Object.keys(FNODE).forEach(function (k) { var n = FNODE[k], g = sv("g", {}), r = sv("rect", { x: n[0], y: n[1], width: 140, height: 62, rx: 10, fill: hexA(n[4], 0.10), stroke: n[4], "stroke-width": 2 }); g.appendChild(r); var fi = svgIco(FICO[k], n[0] + 6, n[1] + 6, 24); if (fi) g.appendChild(fi); g.appendChild(sv("text", { x: n[0] + 70, y: n[1] + 26, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: "currentColor" }, [n[2]])); g.appendChild(sv("text", { x: n[0] + 70, y: n[1] + 46, "text-anchor": "middle", "font-size": 10.5, fill: "currentColor" }, [(sub[k] || n[3]).slice(0, 26)])); var ck = sv("text", { x: n[0] + 124, y: n[1] + 18, "font-size": 16, fill: "#1d8102", "font-weight": 700 }, ["✓"]); ck.style.opacity = "0"; g.appendChild(ck); el[k] = { r: r, ck: ck, col: n[4] }; svg.appendChild(g); });
  var pk = sv("circle", { r: 9, cx: 0, cy: 0, fill: "#ff9900", stroke: "#fff", "stroke-width": 2 }); pk.style.opacity = "0"; pk.style.transition = "transform .7s ease-in-out, opacity .3s"; svg.appendChild(pk);
  var msg = h("div", { id: "fmsg", style: "min-height:4.2em;margin:8px 0;font-weight:600;line-height:1.6;padding:8px 12px;border-left:4px solid #ff9900;background:rgba(255,153,0,.08);border-radius:4px", text: "กด ▶ เพื่อดูลำดับการปล่อยทีละขั้น (ปรับ env / ACTION / service ได้ด้านบน)" });
  var PH = { git: 0, params: 0, "Validate": 1, "Confirm production": 1, "Checkout version": 1, "Test": 1, "SonarQube scan": 1, "Build image": 1, "Scan image": 1, "Push image": 1, "Check image exists": 1, "Update manifest": 2, apps: 2, "Sync ArgoCD": 2, deploy: 3 }, PHN = [["1  ส่งโค้ด + สั่งปล่อย", "#546e7a"], ["2  Jenkins ตรวจและสร้าง image", "#d33833"], ["3  ส่งมอบให้ ArgoCD", "#ef7b4d"], ["4  รันจริงบน k3s", "#326ce5"]], list = h("div", { style: "margin:8px 0" }), lastPh = -1;
  steps.forEach(function (s, i) {
    var ph = PH[s.k]; if (ph !== lastPh) { lastPh = ph; list.appendChild(h("div", { style: "margin:14px 0 4px;padding:3px 10px;border-radius:4px;font-weight:700;font-size:.85rem;color:" + PHN[ph][1] + ";background:" + hexA(PHN[ph][1], 0.10), text: PHN[ph][0] })); }
    list.appendChild(h("a", { href: "#", style: "display:grid;grid-template-columns:30px 1fr;gap:6px;padding:5px 4px;text-decoration:none;color:inherit;border-bottom:1px dashed var(--line,#d3dae3)", onclick: function (e) { e.preventDefault(); flowJump(s.code); } }, [h("span", { style: "font-weight:700;color:" + PHN[ph][1], text: String(i + 1) }), h("span", {}, [h("div", { style: "font-weight:600", text: s.t }), h("div", { style: "font-size:.82rem;opacity:.75", text: s.w })])]));
  });
  var idx = 0, paused = false, pbtn = null, done = {};
  function mid(k) { var n = FNODE[k]; return [n[0] + 70, n[1] + 31]; }
  function lit(keys, on) { Object.keys(el).forEach(function (k) { el[k].r.setAttribute("stroke-width", keys.indexOf(k) >= 0 && on ? 5 : 2); el[k].r.setAttribute("fill", keys.indexOf(k) >= 0 && on ? hexA(el[k].col, 0.28) : hexA(el[k].col, 0.10)); }); }
  function mark(k) { done[k] = 1; el[k].ck.style.opacity = "1"; }
  function codeOn(s) { var bl = [].slice.call(document.querySelectorAll("#main [id^='fb-']")); bl.forEach(function (b) { b.classList.toggle("hdim", b.getAttribute("data-k") !== s.code); b.classList.toggle("hlive", b.getAttribute("data-k") === s.code); }); var t = document.getElementById("fb-" + s.code); if (t) { t.style.outline = "3px solid #ff9900"; setTimeout(function () { t.style.outline = ""; }, 900); } if (s.k === "Update manifest") { var o = document.getElementById("fimgold"), nw = document.getElementById("fimgnew"); if (o && nw) { o.style.textDecoration = "line-through"; o.style.color = "#c62828"; nw.style.display = "block"; } } }
  function reset() { FT.forEach(clearTimeout); FT = []; idx = 0; paused = false; done = {}; if (pbtn) { pbtn.textContent = "⏸ หยุดชั่วคราว"; pbtn.disabled = true; } lit([], false); Object.keys(el).forEach(function (k) { el[k].ck.style.opacity = "0"; }); pk.style.opacity = "0"; [].forEach.call(document.querySelectorAll("#main [id^='fb-']"), function (b) { b.classList.remove("hdim", "hlive"); }); var o = document.getElementById("fimgold"), nw = document.getElementById("fimgnew"); if (o && nw) { o.style.textDecoration = ""; o.style.color = ""; nw.style.display = "none"; } msg.textContent = ""; }
  function tick() {
    FT.forEach(clearTimeout); FT = []; if (paused) return;
    if (idx >= steps.length) { lit([], false); msg.textContent = ""; msg.appendChild(h("div", { style: "font-size:1.02rem;color:#1d8102", text: "✓ เสร็จ: " + c.svc + " " + I.V + " รันบน " + c.env + " แล้ว" })); msg.appendChild(h("div", { style: "font-weight:400", text: "เปิดเว็บผ่าน ALB พอร์ต " + I.port + " ได้เลย" })); if (pbtn) pbtn.disabled = true; return; }
    var s = steps[idx++], spd = +document.getElementById("fspd").value * 1000, p = s.path;
    lit(s.lit, true); flowMsg(msg, idx, s); codeOn(s);
    var a = mid(p[0]); pk.style.transition = "none"; pk.style.transform = "translate(" + a[0] + "px," + a[1] + "px)"; pk.style.opacity = "1"; void pk.getBoundingClientRect(); pk.style.transition = "transform .7s ease-in-out, opacity .3s";
    for (var h2 = 1; h2 < p.length; h2++) (function (hop) { FT.push(setTimeout(function () { var b = mid(p[hop]); pk.style.transform = "translate(" + b[0] + "px," + b[1] + "px)"; }, hop * 700)); })(h2);
    FT.push(setTimeout(function () { s.lit.forEach(mark); if (p.length === 1) pk.style.opacity = "0"; }, Math.max(spd * 0.7, (p.length) * 700)));
    FT.push(setTimeout(tick, Math.max(spd, p.length * 700 + 400)));
  }
  function run() { reset(); pbtn.disabled = false; tick(); }
  function pauseToggle() { if (!steps.length || (idx >= steps.length && !paused)) return; paused = !paused; pbtn.textContent = paused ? "▶ เล่นต่อ" : "⏸ หยุดชั่วคราว"; if (!paused) tick(); else { FT.forEach(clearTimeout); FT = []; } }
  function sel(label, key, opts) { return h("label", { style: "font-size:.82rem" }, [label + " ", h("select", { "aria-label": label, onchange: function (e) { FLOW[key] = e.target.value; render(); } }, opts.map(function (o) { return h("option", { value: o[0], text: o[1], selected: FLOW[key] === o[0] ? "selected" : null }); }))]); }
  var ctl = h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 6px" }, [
    h("button", { cls: "btn pri", type: "button", text: "▶ เล่น: ลำดับการปล่อย", onclick: run }), (pbtn = h("button", { cls: "btn", type: "button", text: "⏸ หยุดชั่วคราว", disabled: true, onclick: pauseToggle })), h("button", { cls: "btn", type: "button", text: "⏹ รีเซ็ต", onclick: reset }),
    sel("TARGET_ENV", "env", [["dev", "dev"], ["prd", "prd"]]), sel("ACTION", "action", [["build-and-deploy", "build-and-deploy"], ["deploy-only", "deploy-only"]]), sel("service (repo)", "svc", [["backend", "backend"], ["frontend", "frontend"]]),
    c.env === "prd" ? h("label", { style: "font-size:.82rem" }, [h("input", { type: "checkbox", checked: !!c.sync, onchange: function (e) { FLOW.sync = e.target.checked; render(); } }), " AUTO_SYNC"]) : null,
    h("label", { style: "font-size:.82rem" }, ["ความเร็ว ", h("select", { id: "fspd", "aria-label": "ความเร็ว" }, [["2.6", "ช้า"], ["1.6", "ปกติ"], ["0.9", "เร็ว"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: o[0] === "1.6" ? "selected" : null }); }))])]);
  return [ctl, msg, svg, h("p", { cls: "hint", style: "margin:10px 0 0", text: "ขั้นตอนทั้งหมด จัดเป็น 4 ช่วง (กดข้อไหนเลื่อนไปดูโค้ดที่ตรงกัน):" }), list];
}
function flowTab() {
  var cb = h("div"); cb.appendChild(infoCard([["ภาพรวม", "#2b6cb0", "การปล่อยแอป**หนึ่งครั้ง**: ตั้งแต่ `git push` จนผู้ใช้เปิดเว็บเห็น**เวอร์ชันใหม่**"], ["วิธีใช้", "#1d8102", "กด ==▶ เล่น== แล้วโค้ดที่เกี่ยวข้องจะ**สว่างขึ้นทีละขั้น** (หน้าตาเหมือนแท็บ Terraform)"], ["โค้ดที่เกี่ยว", "#7b3fe4", "`Jenkinsfile` · `apps.yaml` · `deployment.yaml`"]]));
  cb.appendChild(h("div", { style: "display:flex;gap:8px;margin:0 0 10px" }, [foldBar(), jkxViewSel(), codeThemeSel()]));
  var a = fold("fanim", "แอนิเมชัน: ลำดับการปล่อย (git push → Jenkins → ECR → ArgoCD → เว็บ)"), card = h("div", { cls: "card", style: "margin-bottom:14px;padding:8px 14px 12px" }); flowAnim().forEach(function (x) { a.appendChild(x); }); card.appendChild(a); cb.appendChild(card);
  var cd = fold("fcode", (JKX.view === "full" ? "โค้ดทั้งไฟล์ต่อเนื่อง (Jenkinsfile ของ repo-" + FLOW.svc + " + manifests) · เส้นสีซ้าย = ช่วง" : "โค้ดที่ตรงกับแต่ละขั้น (Jenkinsfile ของ repo-" + FLOW.svc + " + manifests) · ขีดสีแต่ละกล่อง = stage เดียวกับในภาพ")); cd.className = "fold card"; cd.style.padding = "8px 14px 12px"; cd.appendChild(flowCodeView()); cb.appendChild(cd);
  return cb;
}
