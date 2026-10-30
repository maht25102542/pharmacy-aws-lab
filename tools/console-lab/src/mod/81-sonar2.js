// ===== SonarQube จำลอง (รอบไล่เข้ม): issues / rules / quality profiles / quality gates / users / webhooks =====
// ponytail: issue ถูกสร้างจากเนื้อไฟล์จริงของ repo บน GitHub จำลอง (hash ของไฟล์ → จำนวน/ชนิด issue) ไม่ได้วิเคราะห์โค้ดจริง · แก้ไฟล์แล้ว build ใหม่ = issue ใหม่ใน "New Code" และ Quality gate อาจล้ม
var SQ_RULES = [
  ["python:S1481", "Unused local variables should be removed", "SMELL", "Minor", "py"], ["python:S3776", "Cognitive Complexity of functions should not be too high", "SMELL", "Critical", "py"], ["python:S1192", "String literals should not be duplicated", "SMELL", "Critical", "py"], ["python:S1135", "Track uses of \"TODO\" tags", "SMELL", "Info", "py"], ["python:S100", "Function names should comply with a naming convention", "SMELL", "Minor", "py"], ["python:S5754", "\"SystemExit\" should be re-raised", "BUG", "Major", "py"], ["python:S2201", "Return values from functions without side effects should not be ignored", "BUG", "Major", "py"], ["python:S1244", "Floating point numbers should not be tested for equality", "BUG", "Major", "py"], ["python:S2068", "Hard-coded credentials are security-sensitive", "VULN", "Blocker", "py"], ["python:S5144", "Server-side requests should not be vulnerable to forging attacks", "VULN", "Blocker", "py"], ["python:S4502", "Disabling CSRF protections is security-sensitive", "HOTSPOT", "Critical", "py"], ["python:S5122", "Having a permissive Cross-Origin Resource Sharing policy is security-sensitive", "HOTSPOT", "Major", "py"],
  ["typescript:S1481", "Unused local variables and functions should be removed", "SMELL", "Minor", "ts"], ["typescript:S3776", "Cognitive Complexity of functions should not be too high", "SMELL", "Critical", "ts"], ["typescript:S1135", "Track uses of \"TODO\" tags", "SMELL", "Info", "ts"], ["typescript:S2681", "Multiline blocks should be enclosed in curly braces", "BUG", "Major", "ts"], ["typescript:S3923", "All branches in a conditional structure should not have exactly the same implementation", "BUG", "Major", "ts"], ["typescript:S2068", "Hard-coded credentials are security-sensitive", "VULN", "Blocker", "ts"], ["typescript:S5148", "Authorizing an opened window to access back to the originating window is security-sensitive", "HOTSPOT", "Major", "ts"],
  ["docker:S6596", "Specific version tags for image should be used", "SMELL", "Minor", "df"], ["docker:S6471", "Running containers as a privileged user is security-sensitive", "HOTSPOT", "Major", "df"], ["yaml:S6892", "Memory limits should be defined for containers", "SMELL", "Major", "yml"]
];
var SQ_TYPE = { BUG: "Bug", VULN: "Vulnerability", SMELL: "Code Smell", HOTSPOT: "Security Hotspot" }, SQ_SEV = ["Blocker", "Critical", "Major", "Minor", "Info"];
function sqExt(f) { var e = (/\.([A-Za-z0-9]+)$/.exec(f) || [])[1] || ""; return /^(py)$/.test(e) ? "py" : /^(ts|tsx|js|jsx)$/.test(e) ? "ts" : /^Dockerfile/.test(f.split("/").pop()) ? "df" : /^(yaml|yml)$/.test(e) ? "yml" : ""; }
function sqX() {
  var q = S.sq; if (q.x) return q.x;
  q.x = { users: [{ login: "admin", name: "Administrator", email: "", groups: ["sonar-administrators", "sonar-users"], active: true }], webhooks: [], favs: {}, gates: [{ name: "Sonar way", builtin: true, def: true, conds: [{ m: "new_bugs", op: "GT", err: "0" }, { m: "new_vulns", op: "GT", err: "0" }, { m: "new_cov", op: "LT", err: "80" }, { m: "new_dup", op: "GT", err: "3" }] }, { name: "Sonar way for AI Code", builtin: true, conds: [{ m: "new_bugs", op: "GT", err: "0" }, { m: "new_vulns", op: "GT", err: "0" }, { m: "new_cov", op: "LT", err: "80" }] }],
    profiles: ["py", "ts", "df", "yml"].map(function (l) { return { name: "Sonar way", lang: { py: "Python", ts: "JavaScript/TypeScript", df: "Docker", yml: "YAML" }[l], l: l, builtin: true, def: true, off: [] }; }) };
  return q.x;
}
function sqMetricList() { return [["new_bugs", "New Bugs"], ["new_vulns", "New Vulnerabilities"], ["new_cov", "Coverage on New Code (%)"], ["new_dup", "Duplicated Lines on New Code (%)"], ["bugs", "Bugs"], ["vulns", "Vulnerabilities"], ["smells", "Code Smells"], ["cov", "Coverage (%)"], ["dup", "Duplicated Lines (%)"]]; }
// วิเคราะห์ repo → issues + metrics + ประวัติ analysis · คืน p
function sqAnalyze(p, files, version) {
  var X = sqX(), prev = p.fileHash || null, cur = {}, found = [], active = function (rule) { var l = rule[4], pr = X.profiles.filter(function (z) { return z.l === l && z.def; })[0]; return !pr || pr.off.indexOf(rule[0]) < 0; };
  Object.keys(files).sort().forEach(function (f) { var l = sqExt(f); if (!l) return; var hv = hash32(f + files[f]); cur[f] = hv; var pool = SQ_RULES.filter(function (r) { return r[4] === l && active(r); }); if (!pool.length) return; var n = parseInt(hv.slice(0, 2), 16) % 3, lines = Math.max(1, String(files[f]).split("\n").length); for (var i = 0; i < n; i++) { var r = pool[parseInt(hash32(hv + "r" + i).slice(0, 3), 16) % pool.length], ln = 1 + parseInt(hash32(hv + "l" + i).slice(0, 3), 16) % lines; found.push({ key: hash32(p.key + f + r[0] + ln).slice(0, 8), rule: r[0], rname: r[1], type: r[2], sev: r[3], file: f, line: ln, msg: r[1], status: r[2] === "HOTSPOT" ? "TO_REVIEW" : "OPEN", assignee: "", comments: [], created: Date.now() }); } });
  var old = {}; (p.issues || []).forEach(function (i) { old[i.key] = i; }); var idx = (p.history || []).length, hist = p.history = p.history || [];
  p.issues = found.map(function (i) { var o = old[i.key]; if (o) { i.status = o.status; i.assignee = o.assignee; i.comments = o.comments; i.created = o.created; i.isNew = o.isNew && idx > 0 && prev && prev[i.file] !== cur[i.file]; } else i.isNew = idx > 0; return i; });
  var changed = prev ? Object.keys(cur).filter(function (f) { return prev[f] !== cur[f]; }) : [], isOpen = function (i) { return /^(OPEN|CONFIRMED|REOPENED|TO_REVIEW)$/.test(i.status); }, cnt = function (t, nw) { return p.issues.filter(function (i) { return i.type === t && isOpen(i) && (!nw || i.isNew); }).length; };
  p.fileHash = cur; p.version = version; p.lines = Object.keys(files).reduce(function (s, f) { return s + String(files[f]).split("\n").length; }, 0); p.bugs = cnt("BUG"); p.vulns = cnt("VULN"); p.smells = cnt("SMELL"); p.hotspots = cnt("HOTSPOT");
  p.cov = 60 + parseInt(hash32(p.key).slice(0, 2), 16) % 35; p.dup = parseInt(hash32(p.key + "d").slice(0, 1), 16) % 7;
  p.m = { new_bugs: idx > 0 ? cnt("BUG", 1) : null, new_vulns: idx > 0 ? cnt("VULN", 1) : null, new_cov: idx > 0 && changed.length ? 55 + parseInt(hash32(changed.join()).slice(0, 2), 16) % 40 : null, new_dup: idx > 0 && changed.length ? parseInt(hash32(changed.join()).slice(2, 3), 16) % 6 : null, bugs: p.bugs, vulns: p.vulns, smells: p.smells, cov: p.cov, dup: p.dup };
  var ev = sqEvalGate(p); p.qg = ev.ok ? "Passed" : "Failed"; p.qgc = ev.rows;
  hist.push({ version: version, at: Date.now(), qg: p.qg, bugs: p.bugs, vulns: p.vulns, smells: p.smells, cov: p.cov, lines: p.lines });
  (sqX().webhooks || []).forEach(function (w) { w.deliveries = (w.deliveries || []).concat([{ at: Date.now(), project: p.key, code: /\/sonarqube-webhook\/?$/.test(w.url) && jkInst() ? 200 : 0, msg: /\/sonarqube-webhook\/?$/.test(w.url) && jkInst() ? "OK" : "Failed to connect" }]).slice(-10); });
  return p;
}
function sqGateOf(p) { var X = sqX(); return X.gates.filter(function (g) { return g.name === p.gate; })[0] || X.gates.filter(function (g) { return g.def; })[0] || X.gates[0]; }
function sqEvalGate(p) {
  var g = sqGateOf(p), rows = g.conds.map(function (c) { var v = p.m ? p.m[c.m] : null, bad = v !== null && v !== undefined && (c.op === "GT" ? v > +c.err : v < +c.err); return { m: c.m, op: c.op, err: c.err, v: v, bad: bad }; });
  return { ok: !rows.some(function (r) { return r.bad; }), rows: rows, gate: g.name };
}
function sqReeval(p) { var ev = sqEvalGate(p); p.qg = ev.ok ? "Passed" : "Failed"; p.qgc = ev.rows; }
// ---- CRUD
function sqCreateProject(key, name) {
  var er = {}; if (!/^[A-Za-z0-9_.:-]+$/.test(key || "")) er.key = "Key ใช้ได้เฉพาะตัวอักษร ตัวเลข - _ . :"; else if (S.sq.projects.some(function (x) { return x.key === key; })) er.key = "Could not create Project, key already exists: " + key; if (!(name || "").trim()) er.name = "ต้องกรอก Project display name";
  if (Object.keys(er).length) return { errors: er }; var p = { key: key, name: name.trim(), version: "", qg: "—", lines: 0, bugs: 0, vulns: 0, smells: 0, cov: "—", issues: [], history: [], fileHash: null, empty: true }; S.sq.projects.push(p); return { res: p };
}
function sqDeleteProject(key) { S.sq.projects = S.sq.projects.filter(function (x) { return x.key !== key; }); }
function sqGateCreate(name, from) { var X = sqX(), er = {}; if (!/^[A-Za-z0-9 _.-]+$/.test(name || "")) er.name = "ชื่อไม่ถูกต้อง"; else if (X.gates.some(function (g) { return g.name === name; })) er.name = "Quality gate ชื่อนี้มีแล้ว"; if (Object.keys(er).length) return { errors: er }; var src = from && X.gates.filter(function (g) { return g.name === from; })[0]; X.gates.push({ name: name, conds: src ? JSON.parse(JSON.stringify(src.conds)) : [] }); return { res: name }; }
function sqGateDelete(name) { var X = sqX(), g = X.gates.filter(function (x) { return x.name === name; })[0]; if (!g || g.builtin || g.def) return false; X.gates = X.gates.filter(function (x) { return x !== g; }); S.sq.projects.forEach(function (p) { if (p.gate === name) { p.gate = ""; sqReeval(p); } }); return true; }
function sqGateDefault(name) { sqX().gates.forEach(function (g) { g.def = g.name === name; }); S.sq.projects.forEach(function (p) { if (!p.gate) sqReeval(p); }); }
function sqIssueAct(i, act, who) {
  var map = { confirm: "CONFIRMED", resolve: "RESOLVED", fp: "FALSE_POSITIVE", wontfix: "WONTFIX", accept: "ACCEPTED", reopen: "REOPENED", safe: "SAFE", fixed: "FIXED" }; i.status = map[act] || i.status; i.comments.push({ by: who || "admin", text: "Status changed to " + i.status, sys: true, at: Date.now() });
}
function sqRefresh(p) { var isOpen = function (i) { return /^(OPEN|CONFIRMED|REOPENED|TO_REVIEW)$/.test(i.status); }; ["BUG:bugs", "VULN:vulns", "SMELL:smells", "HOTSPOT:hotspots"].forEach(function (z) { var a = z.split(":"); p[a[1]] = p.issues.filter(function (i) { return i.type === a[0] && isOpen(i); }).length; }); if (p.m) { p.m.bugs = p.bugs; p.m.vulns = p.vulns; p.m.smells = p.smells; } sqReeval(p); }
// ฟังก์ชันเดิมที่ Jenkins เรียก: เก็บผลวิเคราะห์ของ repo (อ่านไฟล์จาก GitHub จำลอง)
function sqRecord(version, svc, repoName, branch) {
  svc = svc || "backend"; var k = repoName || "pharmacy-" + svc, p = S.sq.projects.filter(function (x) { return x.key === k; })[0]; if (!p) { p = { key: k, name: /^pharmacy-/.test(k) ? sqPropsName(svc) : k }; S.sq.projects.push(p); }
  var rp = S.gh && S.gh.repos[k], br = String(branch || "main").replace(/^(\*\/|origin\/)/, ""), files = rp ? (br === "main" ? rp.files : (rp.branches || {})[br]) || rp.files : {}; delete p.empty; return sqAnalyze(p, files || {}, version);
}
