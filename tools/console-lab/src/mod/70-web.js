// ===== เบราว์เซอร์ + Jenkins จำลอง (ไม่มี DOM): เปิด URL ตามเครือข่ายจริงของ lab, รัน pipeline ตาม Jenkinsfile =====
// ponytail: ข้อความและหน้า Jenkins จำลองจากความจำ ไม่ใช่ของจริง; stage ทำตามกฎเงื่อนไข ไม่ได้รัน docker/sonar จริง
function ghInit() {
  if (!S.gh || !S.gh.repos) S.gh = { repos: {}, local: {} };
  if (!S.jk || S.jk.setup === undefined) S.jk = { setup: "unlock", users: [], login: "", creds: [], job: null, builds: [], seq: 0 };
  if (!S.sq) S.sq = { pwdChanged: false, login: false, tokens: [], projects: [] };
  if (!S.argo) S.argo = { login: false, apps: {}, live: {} };
}
function jkInst() { return S.insts.filter(function (i) { return i.state === "running" && ansTag(i, "Role") === "jenkins"; })[0]; }
function jkPwdOf(i) { var h = hash32(i.id), o = ""; for (var k = 0; o.length < 32; k++) o += hash32(h + k); return o.slice(0, 32); }
// ---- เปิด URL: ผ่านด่านเดียวกับ ssh (เครื่องรัน, public IP, route, SG ให้ My IP) แล้วดูว่ามี service ฟังอยู่ไหม
function webReach(inst, port) {
  var sn = find(S.subnets, inst.subnetId), rt = sn ? subnetRtb(sn) : null, steps = [];
  steps.push({ ok: inst.state === "running", t: "เครื่องกำลังรัน", d: inst.state });
  steps.push({ ok: !!inst.publicIp, t: "มี public IPv4", d: inst.publicIp || "ไม่มี" });
  steps.push({ ok: hasIgwRoute(rt), t: "route table ของซอยมี 0.0.0.0/0 → internet gateway", d: hasIgwRoute(rt) ? "มี" : "ไม่มี" });
  var sg = sgAllows(inst.sgIds, port, { ip: S.myIp }); steps.push({ ok: sg, t: "security group เปิด tcp/" + port + " ให้ My IP (" + S.myIp + ")", d: sg ? "มีกฎ" : "ไม่มีกฎที่ครอบ IP นี้" });
  return { ok: steps.every(function (x) { return x.ok; }), steps: steps };
}
function webOpen(raw) {
  var u = String(raw || "").trim(); if (!u) return { err: "ERR_EMPTY", title: "ใส่ URL ก่อน", steps: [] };
  if (!/^https?:\/\//i.test(u)) u = "http://" + u;
  var m = /^(https?):\/\/([^\/:]+)(?::(\d+))?(\/.*)?$/i.exec(u); if (!m) return { err: "ERR_INVALID_URL", title: "URL ไม่ถูกต้อง", steps: [] };
  var host = m[2], port = +m[3] || (/^https/i.test(m[1]) ? 443 : 80), alb = S.albs.filter(function (a) { return a.dns === host; })[0];
  if (/\.execute-api\./.test(host)) { var sr = slsInvoke(host, m[4] || "/", "GET", ""); return sr.err ? sr : { site: "apigw", host: host, path: m[4] || "/", res: sr }; }
  if (/\.ecs\.[a-z0-9-]+\.on\.aws$/i.test(host)) { var xr = expResponse(host, m[4]); if (!xr) return { err: "ERR_NAME_NOT_RESOLVED", host: host, steps: [{ ok: false, t: "มี Express service ที่ใช้ชื่อนี้ และสร้าง ALB/DNS สำเร็จ", d: "ไม่พบ (ยังไม่สร้าง ถูกลบ หรือ provisioning ล้มเหลว)" }] }; var xp = String(m[4] || "/").split("?")[0]; return xr.json ? { site: "api", host: host, path: xp, json: xr.json, health: xp === "/healthz" } : { site: "alb503", host: host }; }
  if (/^[a-z0-9]+\.[a-z0-9-]+\.awsapprunner\.com$/i.test(host)) { var asv = S.aprs.filter(function (x) { return x.url === host.toLowerCase(); })[0]; if (!asv) return { err: "ERR_NAME_NOT_RESOLVED", host: host, steps: [{ ok: false, t: "มี App Runner service ที่ใช้ชื่อนี้", d: "ไม่พบ (ลบแล้ว หรือพิมพ์ผิด)" }] }; var ae = aprEval(asv); if (ae.status !== "RUNNING") return { err: "ERR_CONNECTION_REFUSED", host: host, steps: ae.steps.concat([{ ok: false, t: "service สถานะ RUNNING", d: ae.status + (ae.reason ? " · " + ae.reason : "") }]) }; return { site: "aprun", host: host, svc: asv, json: aprResponse(asv), path: m[4] || "/", steps: ae.steps }; }
  if (/^(www\.)?github\.com$/i.test(host)) return { site: "github", host: host, path: String(m[4] || "/").split("?")[0].replace(/\/+$/, "") || "/" };
  var vhost = ""; if (!/^[\d.]+$/.test(host)) { var aip = dnsA(host); if (aip) { vhost = host; host = aip; } }
  if (S.cfds.length || S.zones.length) {
    var rs = dnsResolve(host);
    if (rs.kind === "cloudfront" || /\.cloudfront\.net$/.test(host) || S.zones.some(function (z) { return host === z.name || host.slice(-z.name.length - 1) === "." + z.name; })) {
      var scheme = /^https/i.test(m[1]) ? "https" : "http", pth = m[4] || "/", hops = [], q = cfRequest(host, pth, scheme);
      for (var hp = 0; hp < 3 && q.status === 301 && q.location; hp++) { hops.push(scheme + "://" + host + pth + " → " + q.location); scheme = "https"; q = cfRequest(host, pth, "https"); }
      return { site: "cf", host: host, path: pth, scheme: scheme, req: q, hops: hops };
    }
  }
  if (alb) {
    if (albPhase(alb) === "provisioning") return { err: "ERR_NAME_NOT_RESOLVED", host: host, steps: [{ ok: false, t: "ALB สถานะ Active", d: "ยัง Provisioning (~3 นาที) DNS ยังไม่พร้อม" }] };
    var l = alb.listeners.filter(function (x) { return x.port === port; })[0];
    if (!l) return { err: "ERR_CONNECTION_REFUSED", host: host, steps: [{ ok: false, t: "ALB มี listener พอร์ต " + port, d: "ไม่มี" }] };
    var h = albHealth(alb).filter(function (r) { return r.l === l && r.state === "healthy"; });
    var tgp = find(S.tgs, l.tgId);
    if (tgp && tgp.ttype === "ip") { var ar = ecsApiResponse(tgp), pth2 = String(m[4] || "/").split("?")[0]; return ar ? { site: "api", host: host, path: pth2, json: pth2 === "/healthz" ? { status: "ok" } : ar, health: pth2 === "/healthz" } : { site: "alb503", host: host }; }
    if (h.length && tgp && tgp.port === 30443 && !argoInst()) return { site: "alb503", host: host }; // ArgoCD ยังไม่ติดตั้ง (ยังไม่รัน ansible) = ไม่มีอะไรตอบที่ NodePort
    return h.length ? { site: tgp && tgp.port === 30443 ? "argocd" : "app", host: host } : { site: "alb503", host: host };
  }
  var inst = S.insts.filter(function (i) { return i.state !== "terminated" && (i.publicIp === host || i.privateIp === host); })[0];
  if (!inst) return { err: /^[\d.]+$/.test(host) ? "ERR_CONNECTION_TIMED_OUT" : "ERR_NAME_NOT_RESOLVED", host: host, steps: [{ ok: false, t: "มีเครื่องที่ใช้ที่อยู่ " + host, d: "ไม่พบ" + (vhost ? " · ชื่อ " + vhost + " ชี้ A record " + host + " ซึ่งไม่ใช่ IP ปัจจุบันของเครื่องใดเลย (public IP เปลี่ยนหลัง stop/start ถ้าไม่ผูก Elastic IP)" : "") }] };
  if (inst.publicIp !== host) return { err: "ERR_CONNECTION_TIMED_OUT", host: host, steps: [{ ok: false, t: "ที่อยู่เป็น IP ส่วนตัว", d: "เข้าจาก laptop ตรงๆ ไม่ได้" }] };
  var r = webReach(inst, port); if (!r.ok) return { err: "ERR_CONNECTION_TIMED_OUT", host: host, steps: r.steps };
  var role = ansTag(inst, "Role"), svc = null, capp = ec2App(inst);
  if (capp && (port === 80 || port === 443)) return ec2Web(inst, capp, port, vhost, host, r, m[1], m[4]);
  if (port === 8080 && role === "jenkins" && rmDocker(inst).length) svc = "jenkins";
  else if (port === 9000 && role === "sonarqube" && rmDocker(inst).length) svc = "sonarqube";
  else if (port === 30443 && role === "k8s_server" && rmHas(inst, "Expose ArgoCD on NodePort 30443")) svc = "argocd";
  if (!svc) return { err: "ERR_CONNECTION_REFUSED", host: host, steps: r.steps.concat([{ ok: false, t: "มี service ฟังพอร์ต " + port + " บนเครื่อง", d: "ไม่มี (ยังไม่ได้รัน ansible-playbook หรือ service ยังไม่ขึ้น)" }]) };
  return { site: svc, host: host, inst: inst };
}
// ---- Jenkins (setup wizard → sign in → job → build)
function jkSetup() { ghInit(); return S.jk.setup; }
function jkUnlock(pw) { var i = jkInst(); if (!i) return false; if (pw !== jkPwdOf(i)) return false; S.jk.setup = "customize"; return true; }
function jkCustomize() { S.jk.setup = "admin"; }
function jkCreateAdmin(o) {
  var er = {}; if (!o.user) er.user = "ต้องกรอก Username"; if (!o.pass) er.pass = "ต้องกรอก Password"; else if (o.pass !== o.pass2) er.pass2 = "Password ไม่ตรงกัน"; if (!o.full) er.full = "ต้องกรอก Full name"; if (!/^\S+@\S+$/.test(o.email || "")) er.email = "E-mail address ไม่ถูกต้อง";
  if (Object.keys(er).length) return { errors: er }; S.jk.users.push({ name: o.user, pass: o.pass }); S.jk.login = o.user; S.jk.setup = "url"; return { res: o.user };
}
function jkSetUrl() { S.jk.setup = "ready"; }
function jkStart() { S.jk.setup = "done"; }
function jkSignIn(u, pw) { var x = S.jk.users.filter(function (y) { return y.name === u && y.pass === pw; })[0]; if (!x) return false; S.jk.login = u; return true; }
function jkSignOut() { S.jk.login = ""; }
function jkAddCred(o) {
  var er = {}; if (!o.id) er.id = "ต้องกรอก ID"; else if (S.jk.creds.some(function (c) { return c.id === o.id; })) er.id = "มี credential ID นี้แล้ว";
  if (o.kind === "secret" ? !o.secret : !(o.user && o.pass)) er.secret = o.kind === "secret" ? "ต้องกรอก Secret" : "ต้องกรอก Username และ Password";
  if (Object.keys(er).length) return { errors: er }; S.jk.creds.push({ id: o.id, kind: o.kind, user: o.user || "", scope: o.scope || "Global", desc: o.desc || "", h: hash32(o.kind === "secret" ? o.secret : o.pass) }); return { res: o.id };
}
function jkCred(id) { return S.jk.creds.filter(function (c) { return c.id === id; })[0]; }
// หนึ่ง repo = หนึ่ง job: pharmacy-backend / pharmacy-frontend (S.jk.job = job ที่เปิดอยู่ตอนนี้ ใช้เป็นตัวชี้ที่ UI และ jkNew อ่าน)
var JK_REPO_RE = /github\.com\/([^\/]+)\/(pharmacy-(backend|frontend))(?:\.git)?$/;
function jkJobs() { if (!S.jk.jobs) S.jk.jobs = S.jk.job ? [S.jk.job] : []; if (S.jk.job && S.jk.jobs.indexOf(S.jk.job) < 0) S.jk.jobs.push(S.jk.job); S.jk.jobs.forEach(function (j) { if (!j.svc) { var m = JK_REPO_RE.exec(j.repo || ""); j.svc = m ? m[3] : "backend"; } if (j.seq == null) j.seq = 0; }); S.jk.builds.forEach(function (b) { if (!b.job && S.jk.jobs[0]) b.job = S.jk.jobs[0].name; }); return S.jk.jobs; }
function jkJob(name) { return jkJobs().filter(function (j) { return j.name === name; })[0]; }
function jkSelect(name) { var j = jkJob(name); if (j) S.jk.job = j; return j; }
function jkBuildsOf(job) { jkJobs(); return S.jk.builds.filter(function (b) { return b.job === (job && job.name); }); }
function jkRepoName(job) { var m = JK_REPO_RE.exec(job.repo || ""); return m ? m[2] : ""; }
function jkCreateJob(o, isNew) {
  var er = {}; if (!/^[A-Za-z0-9_-]+$/.test(o.name || "")) er.name = "ชื่อใช้ได้เฉพาะ A-Z a-z 0-9 _ -"; else if (isNew && jkJob(o.name)) er.name = "A job already exists with the name ‘" + o.name + "’";
  if (!JK_REPO_RE.test(o.repo || "")) er.repo = "Repository URL ต้องเป็น https://github.com/<user>/pharmacy-backend.git หรือ pharmacy-frontend.git (หนึ่ง job ต่อหนึ่ง repo)"; if (!o.script) er.script = "ต้องระบุ Script Path"; if (!o.branch) er.branch = "ต้องระบุ Branch Specifier";
  if (Object.keys(er).length) return { errors: er };
  var old = jkJob(o.name), m = JK_REPO_RE.exec(o.repo), job = { name: o.name, repo: o.repo, svc: m[3], cred: o.cred || "", branch: o.branch, script: o.script, paramsKnown: old ? old.paramsKnown : false, seq: old ? old.seq : 0 };
  if (old) S.jk.jobs[S.jk.jobs.indexOf(old)] = job; else S.jk.jobs.push(job); S.jk.job = job; return { res: o.name };
}
function jkEnv() { var i = jkInst(), e = i && ansVm(i).f.env, o = {}; (e || "").split("\n").forEach(function (l) { var m = /^(\w+)=(.*)$/.exec(l); if (m) o[m[1]] = m[2]; }); return o; }
function jkHasCred(id) { return !!jkCred(id); }
function jkCredErr(id) { return "ERROR: Could not find credentials entry with ID '" + id + "'"; }
// ผลของ deploy บน k8s: image pull ต้องมีสิทธิ์ ECR ที่ role ของ node, frontend ต้องมี backend อยู่ก่อน
function jkNodesOk(envName) {
  var nodes = S.insts.filter(function (i) { return i.state === "running" && (envName === "dev" ? ansTag(i, "Role") === "k8s_dev" : /^k8s_(server|agent)$/.test(ansTag(i, "Role") || "")); });
  return { nodes: nodes, role: nodes.length && nodes.every(function (n) { var r = S.roles.filter(function (x) { return x.profile === n.profile; })[0]; return r && r.policies.some(function (p) { return ANS_ECR_POL.indexOf(p) >= 0; }); }) };
}
// เวลาโดยประมาณของแต่ละ stage (วินาที) ใช้เมื่อเลือก "เวลาเหมือนจริง": ค่าจากความจำ ไม่ได้วัดจริง
var JK_SEC = { "Validate": 1, "Confirm production": 0, "Checkout version": 4, "SonarQube scan": 75, "Test": 20, "Build image": 60, "Scan image": 25, "Push image": 15, "Check image exists": 3, "Update manifest": 6, "Sync ArgoCD": 40 };
function jkReal() { return S.speed === "real"; }
function jkMarkNext(b) { while (b.idx < b.stages.length && b.stages[b.idx].st === "skipped") { b.idx++; } if (b.idx < b.stages.length && b.stages[b.idx].st === "pending") b.stages[b.idx].st = "running"; }
function jkNextDelay(b) { var s = b.stages[b.idx]; return s ? (JK_SEC[s.name] || 1) : 0; }
function jkNew(p, who) {
  var jb = S.jk.job; jkJobs(); p.SERVICE = jb.svc; // service คงที่ต่อ job (repo นี้มีแค่ service เดียว)
  var b = { id: ++jb.seq, job: jb.name, params: p, state: "running", result: "", stages: [], log: [], who: who || S.jk.login || "admin" }; S.jk.seq = (S.jk.seq || 0) + 1; S.jk.builds.push(b);
  b.log.push("Started by user " + b.who, "[Pipeline] Start of Pipeline", "[Pipeline] node", "Running on Jenkins in /var/jenkins_home/workspace/" + jb.name, "[Pipeline] {", "[Pipeline] stage", "[Pipeline] { (Declarative: Checkout SCM)", "[Pipeline] checkout", "The recommended git tool is: NONE");
  var want = [["Validate", 1], ["Confirm production", p.TARGET_ENV === "prd"], ["Checkout version", p.ACTION === "build-and-deploy"], ["Test", p.ACTION === "build-and-deploy"], ["SonarQube scan", p.ACTION === "build-and-deploy"], ["Build image", p.ACTION === "build-and-deploy"], ["Scan image", p.ACTION === "build-and-deploy"], ["Push image", p.ACTION === "build-and-deploy"], ["Check image exists", p.ACTION === "deploy-only"], ["Update manifest", 1], ["Sync ArgoCD", !!p.AUTO_SYNC]];
  b.stages = want.map(function (w) { return { name: w[0], st: w[1] ? "pending" : "skipped" }; });
  // clone ของ job เอง: repo ต้องถูก push ขึ้น GitHub ใต้ user ที่ตรงกับ URL
  var m = JK_REPO_RE.exec(jb.repo), jc = jb.cred;
  b.log.push(jc ? "using credential " + jc : "No credentials specified", "Cloning the remote Git repository", "Cloning repository " + jb.repo);
  if (!ghRepoOf(m[1], m[2])) { b.log.push(" > git fetch --tags --force --progress -- " + jb.repo + " +refs/heads/*:refs/remotes/origin/* # timeout=10", "ERROR: Error cloning remote repo 'origin'", "hudson.plugins.git.GitException: Command \"git fetch --tags --force --progress -- " + jb.repo + " +refs/heads/*:refs/remotes/origin/*\" returned status code 128:", "stderr: remote: Repository not found.", "fatal: repository '" + jb.repo + "/' not found  (ยังไม่ได้ git push repo-" + jb.svc + " ขึ้น GitHub หรือ URL/ชื่อ user ไม่ตรง)", "[Pipeline] }", "[Pipeline] // stage", "[Pipeline] End of Pipeline", "Finished: FAILURE"); b.stages.forEach(function (x) { if (x.st === "pending") x.st = "not run"; }); b.state = "done"; b.result = "FAILURE"; b.stages.unshift({ name: "Declarative: Checkout SCM", st: "failed" }); return b; }
  b.log.push("Checking out Revision " + hash32(jb.repo) + " (" + jb.branch + ")", "[Pipeline] }", "[Pipeline] // stage", "[Pipeline] withEnv", "[Pipeline] {");
  b.stages.unshift({ name: "Declarative: Checkout SCM", st: "success" });
  b.idx = 1; if (jkReal()) { jkMarkNext(b); } else jkAdvance(b); return b;
}
function jkBuildNow() { var j = S.jk.job; if (j.paramsKnown) return null; var b = jkNew({ TARGET_ENV: "dev", SERVICE: j.svc, VERSION: "", ACTION: "build-and-deploy", AUTO_SYNC: false, CHANGE_NOTE: "" }); j.paramsKnown = !(b.stages[0] && b.stages[0].name === "Declarative: Checkout SCM" && b.stages[0].st === "failed"); /* clone ไม่ผ่าน = Jenkins ยังไม่เคยอ่าน Jenkinsfile จึงยังไม่รู้ parameters */ return b; }
function jkWithParams(p) { S.jk.job.paramsKnown = true; return jkNew(p); }
function jkAdvance(b, once) {
  var jb = jkJob(b.job) || S.jk.job, env = jkEnv(), p = b.params, ji = jkInst(), image = (env.ECR_REGISTRY || "") + "/pharmacy/" + p.SERVICE + ":" + p.VERSION, app = "pharmacy-" + p.SERVICE + "-" + p.TARGET_ENV;
  function end(res) { b.log.push("[Pipeline] }", "[Pipeline] // withEnv", "[Pipeline] }", "[Pipeline] // node", "[Pipeline] stage", "[Pipeline] { (Declarative: Post Actions)", "[Pipeline] sh", "+ rm -rf manifests", "[Pipeline] }", "[Pipeline] // stage", "[Pipeline] End of Pipeline"); }
  function fail(s, msg) {
    s.st = "failed"; b.log.push.apply(b.log, msg);
    b.stages.forEach(function (x) { if (x.st === "pending") { x.st = "not run"; b.log.push("[Pipeline] stage", "[Pipeline] { (" + x.name + ")", "Stage \"" + x.name + "\" skipped due to earlier failure(s)", "[Pipeline] }", "[Pipeline] // stage"); } });
    b.log.push("[Pipeline] }", "[Pipeline] // stage"); end(); b.log.push("ERROR: " + (msg[msg.length - 1] || "script returned exit code 1"), "Finished: FAILURE"); b.state = "done"; b.result = "FAILURE";
  }
  while (b.idx < b.stages.length) {
    var s = b.stages[b.idx]; var n = s.name;
    if (s.st === "skipped") { b.log.push("[Pipeline] stage", "[Pipeline] { (" + n + ")", "Stage \"" + n + "\" skipped due to when conditional", "[Pipeline] }", "[Pipeline] // stage"); b.idx++; continue; }
    if (s.st === "waiting") return;
    b.log.push("[Pipeline] stage", "[Pipeline] { (" + n + ")"); s.st = "running";
    if (n === "Validate") { b.log.push("[Pipeline] script", "[Pipeline] {"); if (!p.VERSION) return fail(s, ["[Pipeline] error", "ยังไม่ได้เลือก VERSION (ถ้ารายการว่าง ให้ติด tag ใน Git ก่อน แล้ว build อีกครั้ง)"]); if (p.TARGET_ENV === "prd" && !/^v\d+\.\d+\.\d+$/.test(p.VERSION)) return fail(s, ["[Pipeline] error", "prd รับเฉพาะ tag รูปแบบ v1.2.3 แต่ได้ '" + p.VERSION + "'"]); b.log.push("[Pipeline] }", "[Pipeline] // script"); }
    else if (n === "Confirm production") { s.st = "waiting"; b.state = "waiting"; b.log.push("[Pipeline] input", "Input requested"); return; }
    else if (n === "Checkout version") { var ra = ghRepoOf((JK_REPO_RE.exec(jb.repo) || [])[1], jkRepoName(jb)); b.log.push("[Pipeline] checkout"); if (!ra || ra.tags.indexOf(p.VERSION) < 0) return fail(s, [" > git checkout -f refs/tags/" + p.VERSION, "ERROR: Couldn't find any revision to build. Verify the repository and branch configuration for this job.  (tag " + p.VERSION + " ไม่อยู่บน GitHub: git push origin " + p.VERSION + ")"]); b.log.push("Checking out Revision " + hash32(p.VERSION) + " (refs/tags/" + p.VERSION + ")"); }
    else if (n === "SonarQube scan") {
      b.log.push("[Pipeline] withCredentials"); if (!jkHasCred("sonar-token")) return fail(s, [jkCredErr("sonar-token")]); b.log.push("Masking supported pattern matches of $SONAR_TOKEN", "[Pipeline] {", "[Pipeline] sh");
      var sq = S.insts.filter(function (i) { return i.state === "running" && ansTag(i, "Role") === "sonarqube"; })[0];
      b.log.push("+ docker run --rm --user 0:0 --volumes-from jenkins -w /var/jenkins_home/workspace/" + jb.name + " -e SONAR_HOST_URL -e SONAR_TOKEN sonarsource/sonar-scanner-cli -Dsonar.projectVersion=" + p.VERSION + " -Dsonar.qualitygate.wait=true");
      if (!sq || !rmDocker(sq).length) return fail(s, ["ERROR: SonarQube server [" + (env.SONAR_HOST_URL || "") + "] can not be reached", "ERROR: Error during SonarScanner execution"]);
      if (!sgAllows(sq.sgIds, 9000, { sgIds: ji.sgIds })) return fail(s, ["ERROR: SonarQube server [" + env.SONAR_HOST_URL + "] can not be reached  (connect timed out: SG ของ sonarqube ไม่เปิด 9000 ให้ SG ของ jenkins)", "ERROR: Error during SonarScanner execution"]);
      if (!sqTokenOk(jkCred("sonar-token"))) return fail(s, ["ERROR: Error during SonarScanner execution", "ERROR: Not authorized. Please check the user token in the property 'sonar.token' or the credentials in the properties 'sonar.login' and 'sonar.password'."]);
      sqRecord(p.VERSION, jb.svc); b.log.push("INFO: ANALYSIS SUCCESSFUL, you can find the results at: " + env.SONAR_HOST_URL + "/dashboard?id=pharmacy-" + jb.svc, "INFO: Quality gate status: OK", "[Pipeline] }", "[Pipeline] // withCredentials");
    }
    else if (n === "Test") {
      b.log.push("[Pipeline] sh");
      if (jb.svc === "backend") b.log.push("+ docker run --rm --volumes-from jenkins -w $WORKSPACE python:3.12.7-slim-bookworm sh -c \"pip install -q -r requirements/dev.txt && python -m pytest\"", "...........................                                              [100%]", "27 passed in 0.4s");
      else b.log.push("+ docker run --rm --volumes-from jenkins -w $WORKSPACE node:22.12.0-alpine3.21 sh -c \"npm ci --no-audit --no-fund && npm run lint && npm run typecheck && npm test\"", "added 352 packages in 21s", "> eslint .", "> tsc --noEmit", " Test Files  4 passed (4)", "      Tests  24 passed (24)");
    }
    else if (n === "Build image") {
      b.log.push("[Pipeline] sh", "+ docker build --pull --build-arg APP_VERSION=" + p.VERSION + " -t " + image + " .", jb.svc === "backend" ? "#5 [build 4/4] RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements/prod.txt   (ด่านที่ 1: คอมไพล์ mysqlclient)" : "#6 [build 4/4] RUN npm run build   (ด่านที่ 2: next build -> standalone)", "#9 [runtime] COPY --from=build ...   (ด่านสุดท้าย: เอาเฉพาะของที่ต้องรัน)", "Successfully tagged " + image);
    }
    else if (n === "Scan image") {
      b.log.push("[Pipeline] sh", "+ docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.56.2 image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed " + image, "Total: 0 (HIGH: 0, CRITICAL: 0)");
    }
    else if (n === "Push image") {
      var repo = byName(S.repos, "pharmacy/" + p.SERVICE); b.log.push("[Pipeline] sh", "+ aws ecr get-login-password", "+ docker login --username AWS --password-stdin " + env.ECR_REGISTRY);
      if (!repo) return fail(s, ["Login Succeeded", "+ docker push " + image, "name unknown: The repository with name 'pharmacy/" + p.SERVICE + "' does not exist in the registry with id '000000000000'"]);
      var r = API.ecrAction({ repoId: repo.id, tag: p.VERSION, op: "push", principal: { type: "inst", id: ji.id } }); b.log.push.apply(b.log, r.res.out.split("\n"));
      if (!r.res.ok) return fail(s, [r.res.out.split("\n").pop()]);
    }
    else if (n === "Check image exists") { var rp = byName(S.repos, "pharmacy/" + p.SERVICE); b.log.push("[Pipeline] sh", "+ aws ecr describe-images --repository-name pharmacy/" + p.SERVICE + " --image-ids imageTag=" + p.VERSION); if (!rp || !rp.images.some(function (x) { return x.tag === p.VERSION; })) return fail(s, ["An error occurred (ImageNotFoundException) when calling the DescribeImages operation: The image with imageId {imageDigest:'null', imageTag:'" + p.VERSION + "'} does not exist within the repository with name 'pharmacy/" + p.SERVICE + "' in the registry with id '000000000000'"]); }
    else if (n === "Update manifest") {
      b.log.push("[Pipeline] withCredentials"); if (!jkHasCred("github-token")) return fail(s, [jkCredErr("github-token")]); b.log.push("Masking supported pattern matches of $GIT_USER or $GIT_TOKEN", "[Pipeline] {", "[Pipeline] sh", "+ rm -rf manifests", "+ git clone https://****:****@" + env.MANIFESTS_REPO + " manifests", "Cloning into 'manifests'...");
      var mu = /github\.com\/([^\/]+)\/pharmacy-manifests/.exec(env.MANIFESTS_REPO || ""), mr = mu && ghRepoOf(mu[1], "pharmacy-manifests");
      if (!mr) return fail(s, ["remote: Repository not found.", "fatal: repository 'https://" + env.MANIFESTS_REPO + "/' not found  (" + (/YOUR_GITHUB_USER/.test(env.MANIFESTS_REPO || "") ? "MANIFESTS_REPO ยังเป็น YOUR_GITHUB_USER: แก้ github_user ใน ansible/group_vars/all/main.yml แล้วรัน ansible-playbook jenkins.yml" : "ยังไม่ได้ push repo-manifests ขึ้น GitHub") + ")"]);
      var path = p.TARGET_ENV + "/" + p.SERVICE + "/deployment.yaml", ft = mr.files[path]; b.log.push("+ cd manifests", "+ sed -i \"s|image: .*|image: " + image + "|\" " + path);
      if (ft === undefined) return fail(s, ["sed: can't read " + path + ": No such file or directory"]);
      var nt = ft.replace(/image: .*/g, "image: " + image);
      if (nt === ft) b.log.push("+ git diff --quiet", "manifest เป็นเวอร์ชันนี้อยู่แล้ว ไม่มีอะไรเปลี่ยน"); else { mr.files[path] = nt; mr.n = (mr.n || 0) + 1; b.log.push("+ git diff --quiet", "+ git commit -am \"" + p.SERVICE + " " + p.VERSION + " -> " + p.TARGET_ENV + " (" + (p.CHANGE_NOTE || "") + ") [build " + b.id + "]\"", "[main " + hash32(image + mr.n).slice(0, 7) + "] " + p.SERVICE + " " + p.VERSION + " -> " + p.TARGET_ENV + " (" + (p.CHANGE_NOTE || "") + ") [build " + b.id + "]", " 1 file changed, 1 insertion(+), 1 deletion(-)", "+ git push", "To https://" + env.MANIFESTS_REPO, "   main -> main"); }
      b.log.push("[Pipeline] }", "[Pipeline] // withCredentials");
    }
    else if (n === "Sync ArgoCD") {
      b.log.push("[Pipeline] withCredentials"); if (!jkHasCred("argocd-admin")) return fail(s, [jkCredErr("argocd-admin")]); b.log.push("Masking supported pattern matches of $ARGO_USER or $ARGO_PASS", "[Pipeline] {", "[Pipeline] sh");
      var k1 = S.insts.filter(function (i) { return i.state === "running" && ansTag(i, "Role") === "k8s_server"; })[0];
      b.log.push("+ argocd login " + env.ARGOCD_SERVER + " --username admin --password **** --insecure --grpc-web");
      if (!k1 || !rmHas(k1, "Install ArgoCD")) return fail(s, ["FATA[0000] rpc error: code = Unavailable desc = connection refused  (ArgoCD ยังไม่ติดตั้ง)"]);
      if (!sgAllows(k1.sgIds, 30443, { sgIds: ji.sgIds })) return fail(s, ["FATA[0030] rpc error: code = Unavailable desc = dial tcp " + env.ARGOCD_SERVER + ": i/o timeout  (SG k8s ไม่เปิด 30443 ให้ SG jenkins)"]);
      if (jkCred("argocd-admin").h !== hash32(argoPwdOf(k1)) || jkCred("argocd-admin").user !== "admin") return fail(s, ["FATA[0000] rpc error: code = Unauthenticated desc = Invalid username or password"]);
      b.log.push("'admin:login' logged in successfully", "Context '" + env.ARGOCD_SERVER + "' updated", "+ argocd app sync " + app);
      var ar = argoSync(app, k1); if (ar.err) return fail(s, [ar.err]);
      b.log.push.apply(b.log, ar.log); b.log.push("+ argocd app wait " + app + " --health --timeout 300"); var st = argoStatus(app);
      if (st.health !== "Healthy") return fail(s, ["FATA[0300] Application '" + app + "' health: " + st.health + " — " + st.msg]);
      b.log.push("Health Status: Healthy", "[Pipeline] }", "[Pipeline] // withCredentials");
    }
    s.st = "success"; b.log.push("[Pipeline] }", "[Pipeline] // stage"); b.idx++;
    if (once && b.idx < b.stages.length) { jkMarkNext(b); if (b.idx < b.stages.length) return; }
  }
  b.log.push("[Pipeline] stage", "[Pipeline] { (Declarative: Post Actions)", "[Pipeline] script", "[Pipeline] {", "[Pipeline] echo", p.AUTO_SYNC ? "เสร็จแล้ว: " + app + " รันเวอร์ชัน " + p.VERSION + " และผ่านการตรวจสุขภาพ" : "แก้ manifest แล้ว: เข้า ArgoCD แล้วกด Sync ที่แอป " + app, "[Pipeline] }", "[Pipeline] // script"); end(); b.log.push("Finished: SUCCESS"); b.state = "done"; b.result = "SUCCESS";
}
function jkInput(id, proceed) {
  var b = typeof id === "object" ? id : S.jk.builds.filter(function (x) { return x.id === id && (!S.jk.job || x.job === S.jk.job.name); })[0]; if (!b || b.state !== "waiting") return;
  var s = b.stages[b.idx];
  if (!proceed) { s.st = "failed"; b.stages.forEach(function (x) { if (x.st === "pending") x.st = "not run"; }); b.log.push("Aborted by " + (S.jk.login || "admin"), "[Pipeline] }", "[Pipeline] // stage", "Finished: ABORTED"); b.state = "done"; b.result = "ABORTED"; return; }
  s.st = "success"; b.state = "running"; b.log.push("Approved by " + (S.jk.login || "admin"), "[Pipeline] }", "[Pipeline] // stage"); b.idx++; if (jkReal()) jkMarkNext(b); else jkAdvance(b);
}

// เว็บที่รันด้วย docker compose + Caddy บนเครื่องเดียว: ตัดสินผลจาก user_data + DNS + SG
function ec2Web(inst, app, port, vhost, ip, reach, scheme, path) {
  var steps = reach.steps.slice(), https = port === 443 || /^https/i.test(scheme || "");
  steps.push({ ok: app.up, t: "docker compose ขึ้นแล้ว (user_data บูตครั้งแรกทำงานครบ)", d: app.up ? "docker + compose up" + (app.domain ? " · Caddy โดเมน " + app.domain : " · Caddy :80") : app.why + " → ไม่มีอะไรฟัง port " + port });
  if (!app.up) return { err: "ERR_CONNECTION_REFUSED", host: vhost || ip, steps: steps, inst: inst };
  if (!https) { if (app.domain) { var r2 = webOpen("https://" + app.domain + (path || "/")); r2.redirectedFrom = "http://" + (vhost || ip) + (path || "/") + " → 308 → https://" + app.domain; return r2; } steps.push({ ok: true, t: "Caddy ตอบ HTTP :80", d: "reverse_proxy → app:8000" }); return { site: "compose", host: vhost || ip, inst: inst, app: app, tls: "", steps: steps }; }
  if (!app.domain) { steps.push({ ok: false, t: "มี service ฟัง HTTPS :443", d: "Caddyfile เป็น :80 (ไม่มีชื่อโดเมน) → Caddy ไม่เปิด 443/ไม่ขอใบรับรอง" }); return { err: "ERR_SSL_PROTOCOL_ERROR", host: vhost || ip, steps: steps, inst: inst }; }
  var dns = dnsA(app.domain), p80 = webReach(inst, 80), okDns = dns === inst.publicIp;
  steps.push({ ok: okDns, t: "ชื่อ " + app.domain + " ชี้มาที่เครื่องนี้ (A record = " + inst.publicIp + ")", d: okDns ? "A " + dns : dns ? "A record ชี้ " + dns + " ไม่ใช่ " + inst.publicIp + " (public IP เปลี่ยนหลัง stop/start ถ้าไม่มี Elastic IP)" : "ไม่มี A record ของ " + app.domain });
  steps.push({ ok: p80.ok, t: "Let's Encrypt เข้า port 80 ได้ (HTTP-01 challenge)", d: p80.ok ? "SG เปิด 80 จากเน็ต" : "SG ปิด port 80 → Caddy ขอใบรับรองไม่ได้" });
  if (!okDns || !p80.ok) return { err: "ERR_SSL_PROTOCOL_ERROR", host: vhost || ip, steps: steps, inst: inst };
  var sni = vhost && vhost === app.domain; steps.push({ ok: sni, t: "เข้าด้วยชื่อ " + app.domain + " (SNI ตรงกับใบรับรอง)", d: sni ? "ใบรับรอง Let's Encrypt ใช้ได้" : "เข้าด้วย " + (vhost || ip) + " ใบรับรองไม่ตรง" });
  if (!sni) return { err: "NET::ERR_CERT_COMMON_NAME_INVALID", host: vhost || ip, steps: steps, inst: inst };
  return { site: "compose", host: vhost, inst: inst, app: app, tls: "Let's Encrypt (Caddy)", steps: steps };
}
