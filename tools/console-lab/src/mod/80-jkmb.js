// ===== Jenkins Multibranch Pipeline: สแกน repo บน GitHub จำลอง → สร้าง job ลูกต่อ branch / PR (ชื่อ "parent/branch") แล้ว build ที่เจอใหม่ =====
// ponytail: ลูกเป็น job ธรรมดาใน S.jk.jobs ที่มี .parent → job page/build/Blue Ocean ใช้โค้ดเดิม · ซ่อนจาก Dashboard ระดับบน
function jkMbKids(p) { return (S.jk.jobs || []).filter(function (j) { return j.parent === p.name; }); }
function jkMbChildName(p, key) { return p.name + "/" + key.replace(/\//g, "%2F"); }
function jkMbWanted(p) {
  var m = JK_REPO_RE.exec(p.repo || ""), rp = m && ghRepoOf(m[1], m[2]); if (!rp) return null;
  var has = function (f) { return !!f && (p.script || "Jenkinsfile") in f; }, out = [];
  if (has(rp.files)) out.push({ key: "main", kind: "branch", branch: "main" });
  Object.keys(rp.branches || {}).forEach(function (b) { if (has(rp.branches[b])) out.push({ key: b, kind: "branch", branch: b }); });
  (rp.prs || []).filter(function (x) { return x.state === "open" && has((rp.branches || {})[x.head]); }).forEach(function (x) { out.push({ key: "PR-" + x.n, kind: "pr", branch: x.head, title: x.title }); });
  return out;
}
// สแกนใหม่: เพิ่ม/ลบ job ลูก + build ตัวที่เพิ่งเจอ (ตามพฤติกรรม Jenkins) · คืน {added, removed, log}
function jkMbScan(p) {
  var log = ["Started by user " + (S.jk.login || "admin"), "Starting branch indexing...", "Examining " + p.repo], want = jkMbWanted(p), added = [], removed = [], keep = S.jk.job;
  if (!want) { log.push("ERROR: Could not fetch branches from source " + p.repo, "(repo ยังไม่ได้ push ขึ้น GitHub หรือ URL/ชื่อ user ไม่ตรง)", "Finished: FAILURE"); p.scanLog = log; p.scanOk = false; return { added: added, removed: removed, log: log, ok: false }; }
  var kids = jkMbKids(p);
  want.forEach(function (w) {
    log.push("  Checking " + (w.kind === "pr" ? "pull request " + w.key : "branch " + w.branch), "    ‘" + (p.script || "Jenkinsfile") + "’ found", "    Met criteria");
    var cn = jkMbChildName(p, w.key), c = kids.filter(function (k) { return k.name === cn; })[0];
    if (!c) { c = { name: cn, parent: p.name, mbKey: w.key, kind: w.kind, repo: p.repo, cred: p.cred || "", script: p.script || "Jenkinsfile", branch: "*/" + w.branch, svc: p.svc, defn: "scm", paramsKnown: false, seq: 0 }; S.jk.jobs.push(c); added.push(c); log.push("    Scheduled build for " + (w.kind === "pr" ? w.key : w.branch)); }
    else { c.branch = "*/" + w.branch; log.push("    Changes detected: " + w.key); }
  });
  kids.forEach(function (k) { if (!want.some(function (w) { return jkMbChildName(p, w.key) === k.name; })) { removed.push(k.name); log.push("  Deleting dead item: " + k.mbKey); S.jk.builds = S.jk.builds.filter(function (b) { return b.job !== k.name; }); S.jk.jobs = S.jk.jobs.filter(function (j) { return j !== k; }); } });
  added.forEach(function (c) { jkSelect(c.name); jkBuildNow(); });
  S.jk.job = keep && S.jk.jobs.indexOf(keep) >= 0 ? keep : p;
  log.push("Finished: SUCCESS"); p.scanLog = log; p.scanOk = true; return { added: added, removed: removed, log: log, ok: true };
}
// webhook: push / pull_request → สแกน แล้ว build branch นั้น (ถ้าไม่ใช่ตัวที่เพิ่งสร้าง)
function jkMbHook(p, ev, branch) {
  var before = jkMbKids(p).map(function (k) { return k.name; }), r = jkMbScan(p); if (!r.ok) return "สแกนไม่สำเร็จ";
  var key = ev === "pull_request" ? null : branch, c = key ? jkMbKids(p).filter(function (k) { return k.name === jkMbChildName(p, key); })[0] : null;
  if (c && before.indexOf(c.name) >= 0) { jkSelect(c.name); if (c.paramsKnown) jkNew({ TARGET_ENV: "dev", VERSION: "", ACTION: "build-and-deploy", AUTO_SYNC: false, CHANGE_NOTE: "" }, "GitHub webhook"); else jkBuildNow(); return "scan + build " + key; }
  return "scan" + (r.added.length ? " → สร้าง " + r.added.map(function (x) { return x.mbKey; }).join(", ") + " และ build" : " (ไม่มีอะไรใหม่)");
}

function jkCreateMb(o, isNew) {
  var er = {}; if (!/^[A-Za-z0-9_-]+$/.test(o.name || "")) er.name = "ชื่อใช้ได้เฉพาะ A-Z a-z 0-9 _ -"; else if (isNew && jkJob(o.name)) er.name = "A job already exists with the name ‘" + o.name + "’";
  if (!JK_REPO_RE.test(o.repo || "")) er.repo = "Repository URL ต้องเป็นรูปแบบ https://github.com/<user>/<repo>.git"; if (!o.script) er.script = "ต้องระบุ Script Path";
  if (Object.keys(er).length) return { errors: er };
  var mm = JK_REPO_RE.exec(o.repo), p = jkJob(o.name); if (!p) { p = { name: o.name, mb: true, defn: "scm", branch: "*/main", paramsKnown: false, seq: 0 }; S.jk.jobs.push(p); }
  p.repo = o.repo; p.cred = o.cred || ""; p.script = o.script; p.svc = jkSvcOf(mm[2]); S.jk.job = p; jkMbScan(p); S.jk.job = p; return { res: o.name };
}
