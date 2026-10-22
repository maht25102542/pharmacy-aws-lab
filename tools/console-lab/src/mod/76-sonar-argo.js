// ===== SonarQube + ArgoCD จำลอง (ไม่มี DOM) =====
// ponytail: ข้อความและค่าเริ่มต้นจำลองจากความจำ; นโยบายรหัสผ่าน SonarQube (>= 12 ตัว) ไม่ยืนยัน
function sqPropsName(svc) { var t = LABFILES["repo-" + svc + "/sonar-project.properties"] || "", m = /sonar\.projectName=(.*)/.exec(t); return m ? m[1].trim() : "pharmacy-" + svc; }
function sqLogin(u, pw) {
  var cur = S.sq.pwdChanged ? S.sq.pass : "admin"; if (u !== "admin" || pw !== cur) return { ok: false };
  S.sq.login = true; return { ok: true, mustChange: !S.sq.pwdChanged };
}
function sqChangePw(old, nw, conf) {
  var er = {}, cur = S.sq.pwdChanged ? S.sq.pass : "admin"; if (old !== cur) er.old = "รหัสผ่านเดิมไม่ถูกต้อง"; if (!nw || nw.length < 12) er.nw = "รหัสผ่านใหม่ต้องยาวอย่างน้อย 12 ตัวอักษร"; else if (nw === old) er.nw = "รหัสผ่านใหม่ต้องไม่ซ้ำรหัสเดิม"; if (nw !== conf) er.conf = "รหัสผ่านไม่ตรงกัน";
  if (Object.keys(er).length) return { errors: er }; S.sq.pass = nw; S.sq.pwdChanged = true; return { res: true };
}
function sqGenToken(o) {
  var er = {}; if (!o.name) er.name = "ต้องกรอก Name"; else if (S.sq.tokens.some(function (t) { return t.name === o.name; })) er.name = "มี token ชื่อนี้แล้ว";
  if (Object.keys(er).length) return { errors: er }; var v = "squ_" + hash32(o.name + S.sq.tokens.length) + hash32(o.name + "x") + hash32(o.name + "y") + hash32("z" + o.name) + hash32("w" + o.name); S.sq.tokens.push({ name: o.name, type: o.type || "User Token", value: v }); return { res: v };
}
function sqTokenOk(cred) { return !!cred && S.sq.tokens.some(function (t) { return hash32(t.value) === cred.h; }); }
function sqRecord(version, svc) { svc = svc || "backend"; var k = "pharmacy-" + svc, p = S.sq.projects.filter(function (x) { return x.key === k; })[0]; if (!p) { p = { key: k, name: sqPropsName(svc) }; S.sq.projects.push(p); } p.version = version; p.qg = "Passed"; p.lines = 1240; p.bugs = 0; p.vulns = 0; p.smells = 12; p.cov = "—"; }
// ---- ArgoCD
function argoInst() { return S.insts.filter(function (i) { return i.state === "running" && ansTag(i, "Role") === "k8s_server" && rmHas(i, "Install ArgoCD"); })[0]; }
function argoPwdOf(i) { var h = hash32(i.id + "argo"), o = ""; for (var k = 0; o.length < 16; k++) o += hash32(h + k); return o.slice(0, 16); }
function argoLogin(u, pw) { var i = argoInst(); if (!i || u !== "admin" || pw !== argoPwdOf(i)) return false; S.argo.login = true; return true; }
function argoParse(text) {
  var out = []; String(text).split(/^---\s*$/m).forEach(function (d) {
    if (!/kind:\s*Application\b/.test(d)) return; var g = function (re) { var m = re.exec(d); return m ? m[1].trim() : ""; };
    out.push({ name: g(/metadata:[\s\S]*?\n\s+name:\s*(\S+)/), repoURL: g(/repoURL:\s*(\S+)/), path: g(/path:\s*(\S+)/), destName: g(/destination:[\s\S]*?\n\s+name:\s*(\S+)/), destServer: g(/destination:[\s\S]*?\n\s+server:\s*(\S+)/), ns: g(/destination:[\s\S]*?\n\s+namespace:\s*(\S+)/), auto: /automated:/.test(d) });
  }); return out;
}
// kubectl apply -f <url|path> บน pharmacy-k8s-1 : อ่านไฟล์จาก GitHub snapshot (raw.githubusercontent.com) หรือไฟล์บน VM (ไม่มี)
function argoApply(target) {
  var m = /^https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/main\/(.+)$/.exec(target || "");
  if (!m) return ["error: the path \"" + target + "\" does not exist"];
  var rp = ghRepoOf(m[1], m[2]), txt = rp && rp.files[m[3]];
  if (txt === undefined || !rp) return ["error: unable to read URL \"" + target + "\", server reported 404 Not Found, status code=404"];
  var apps = argoParse(txt); if (!apps.length) return ["error: no objects passed to apply"];
  return apps.map(function (a) { var ex = !!S.argo.apps[a.name]; S.argo.apps[a.name] = a; return "application.argoproj.io/" + a.name + (ex ? " configured" : " created"); });
}
function argoPlaceholder(img) { return !img || img === "WAITING_FOR_FIRST_JENKINS_DEPLOY"; }
function argoStatus(name) {
  var a = S.argo.apps[name]; if (!a) return null;
  var um = /github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/.exec(a.repoURL || ""), rp = um && ghRepoOf(um[1], um[2]), env = a.ns, svc = /backend/.test(name) ? "backend" : "frontend", k1 = argoInst();
  if (!rp) return { sync: "Unknown", health: "Missing", msg: "ComparisonError: rpc error: code = Unknown desc = authentication required: Repository not found  (" + a.repoURL + ")", app: a };
  if (a.destName && !(k1 && rmHas(k1, "Apply cluster secret"))) return { sync: "Unknown", health: "Missing", msg: "cluster '" + a.destName + "' has not been added to Argo CD (ansible ลงทะเบียนให้ตอนรัน k8s.yml)", app: a };
  var repoImage = ghImageOf(rp, a.path); S.argo.at = S.argo.at || {}; S.argo.seen = S.argo.seen || {}; if (S.argo.seen[name] !== repoImage) { S.argo.seen[name] = repoImage; if (S.speed === "real" && a.auto) S.argo.at[name] = Date.now(); }
  var live = a.auto ? repoImage : S.argo.live[name] || null, sync = live === null ? "OutOfSync" : live === repoImage ? "Synced" : "OutOfSync", health = "Healthy", msg = "";
  if (live === null) { health = "Missing"; msg = "ยังไม่ได้ sync (resource ยังไม่ถูกสร้างใน cluster)"; }
  else if (argoPlaceholder(live)) { health = "Degraded"; msg = "InvalidImageName: image " + (live || "(ว่าง)") + " (ยังไม่มี Jenkins deploy ครั้งแรก)"; }
  else {
    var repo = byName(S.repos, "pharmacy/" + svc), tag = live.split(":").pop(), nd = jkNodesOk(env === "dev" ? "dev" : "prd");
    if (!nd.role) { health = "Degraded"; msg = "ImagePullBackOff: node ไม่มีสิทธิ์ดึง image จาก ECR (role ของ k8s ต้องมี AmazonEC2ContainerRegistryReadOnly)"; }
    else if (!repo || !repo.images.some(function (x) { return x.tag === tag; })) { health = "Degraded"; msg = "ErrImagePull: manifest for " + live + " not found"; }
    else if (svc === "frontend") { var be = argoStatus("pharmacy-backend-" + (env === "dev" ? "dev" : "prd")); if (!be || be.health !== "Healthy") { health = "Degraded"; msg = "CrashLoopBackOff: nginx: host not found in upstream \"backend\" (deploy backend ก่อน)"; } }
  }
  if (health === "Healthy" && S.speed === "real" && S.argo.at[name] && Date.now() - S.argo.at[name] < 20000) { health = "Progressing"; msg = "Waiting for rollout to finish: 0 of 1 updated replicas are available (~20 วินาที)"; }
  return { sync: sync, health: health, msg: msg, repoImage: repoImage, live: live, app: a };
}
function argoSyncApp(name) { var st = argoStatus(name); if (st && S.speed === "real") { S.argo.at = S.argo.at || {}; S.argo.at[name] = Date.now(); } if (!st) return { err: "FATA[0000] rpc error: code = NotFound desc = applications.argoproj.io \"" + name + "\" not found" }; if (st.sync === "Unknown") return { err: "FATA[0000] rpc error: code = FailedPrecondition desc = " + st.msg }; S.argo.live[name] = st.repoImage; return { st: argoStatus(name) }; }
function argoSync(name, k1) {
  var r = argoSyncApp(name); if (r.err) return r;
  var l = ["Name:               " + name, "Project:            default", "Sync Status:        Synced to main", "Health Status:      " + r.st.health];
  return { log: l };
}
function argoHealthy(name) { var s = argoStatus(name); return !!s && s.health === "Healthy"; }
function appLayer() { return (S.jk && S.jk.builds.length > 0) || (S.argo && Object.keys(S.argo.apps).length > 0); }
