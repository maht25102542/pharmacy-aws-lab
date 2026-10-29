// ===== Jenkins: Declarative Pipeline parser + runner =====
// ใช้กับ (1) job แบบ "Pipeline script" และ (2) Jenkinsfile ใน repo ที่ไม่ใช่ pipeline ของ pharmacy (pipeline ของ pharmacy = มี stage 'Update manifest' → ใช้ flow เดิมที่ต่อ ECR/manifests/Argo)
// ponytail: parser แบบ regex + จับคู่ปีกกา ไม่ใช่ Groovy จริง — รองรับ environment / parameters / when / parallel / post / script{} และ step echo, sh, sleep, error, checkout, archiveArtifacts, junit · ถ้าต้องการ Groovy เต็ม ต้องใช้ parser จริง
function jkBlock(t, from) {
  var d = 0, q = "";
  for (var i = from; i < t.length; i++) {
    var c = t[i], tri = t.substr(i, 3);
    if (q) { if (c === "\\") i++; else if (q.length === 3 ? tri === q : c === q) { if (q.length === 3) i += 2; q = ""; } continue; }
    if (tri === "'''" || tri === '"""') { q = tri; i += 2; continue; }
    if (c === "'" || c === '"') { q = c; continue; }
    if (c === "{") d++; else if (c === "}") { d--; if (!d) return [t.slice(from + 1, i), i]; }
  }
  return [t.slice(from + 1), t.length];
}
function jkFind(t, kw) { var m = new RegExp("\\b" + kw + "\\s*\\{").exec(t); if (!m) return null; var o = m.index + m[0].length - 1, b = jkBlock(t, o); return { inner: b[0], start: m.index, end: b[1] }; }
function jkStagesIn(t) { var out = [], re = /\bstage\s*\(\s*(['"])([^'"]+)\1\s*\)\s*\{/g, m; while ((m = re.exec(t))) { var b = jkBlock(t, m.index + m[0].length - 1); out.push({ name: m[2], body: b[0] }); re.lastIndex = b[1] + 1; } return out; }
function jkSteps(t) {
  var out = [], re = /\b(echo|sh|error|sleep|checkout|git|archiveArtifacts|junit)\b\s*\(?\s*(?:time:\s*)?(?:'''([\s\S]*?)'''|"""([\s\S]*?)"""|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|(\d+)|(scm))?/g, m;
  while ((m = re.exec(t))) { var v = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : m[6] !== undefined ? m[6] : m[7] || ""; if (m[1] === "sh" && !v) continue; out.push({ t: m[1], v: v }); }
  return out;
}
function jkWhen(body) {
  var w = jkFind(body, "when"); if (!w) return null; var out = [], m, re;
  re = /\bbranch\s+['"]([^'"]+)['"]/g; while ((m = re.exec(w.inner))) out.push({ k: "branch", v: m[1] });
  re = /\benvironment\s+name:\s*['"](\w+)['"]\s*,\s*value:\s*['"]([^'"]*)['"]/g; while ((m = re.exec(w.inner))) out.push({ k: "env", n: m[1], v: m[2] });
  var ex = jkFind(w.inner, "expression"); if (ex) out.push({ k: "expr", v: ex.inner.replace(/^\s*return\s+/, "").trim() });
  return { conds: out, start: w.start, end: w.end };
}
function jkParseStage(name, body) {
  var w = jkWhen(body), b2 = w ? body.slice(0, w.start) + body.slice(w.end + 1) : body, par = jkFind(b2, "parallel");
  if (par) return { name: name, when: w, parallel: jkStagesIn(par.inner).map(function (k) { return jkParseStage(k.name, k.body); }) };
  var st = jkFind(b2, "steps"); return { name: name, when: w, steps: jkSteps(st ? st.inner : b2) };
}
function jkParsePipeline(txt) {
  txt = String(txt || ""); var out = { env: {}, params: [], stages: [], post: {} }, e = jkFind(txt, "environment"), m;
  if (e) { var re = /(\w+)\s*=\s*(?:'([^']*)'|"([^"]*)")/g; while ((m = re.exec(e.inner))) out.env[m[1]] = m[2] !== undefined ? m[2] : m[3]; }
  var p = jkFind(txt, "parameters");
  if (p) { var rp = /\b(string|choice|booleanParam|text|password)\s*\(([^)]*)\)/g; while ((m = rp.exec(p.inner))) { var a = m[2], nm = /name:\s*['"]([^'"]+)['"]/.exec(a), dv = /defaultValue:\s*(?:['"]([^'"]*)['"]|(true|false))/.exec(a), ch = /choices:\s*\[([^\]]*)\]/.exec(a); if (nm) out.params.push({ type: m[1] === "booleanParam" ? "Boolean" : m[1] === "choice" ? "Choice" : "String", name: nm[1], def: m[1] === "choice" && ch ? ch[1].replace(/['"\s]/g, "").split(",").join("\n") : dv ? (dv[1] !== undefined ? dv[1] : dv[2]) : "" }); } }
  var sg = jkFind(txt, "stages"), pt = jkFind(txt, "post");
  out.stages = jkStagesIn(sg ? sg.inner : txt).map(function (s) { return jkParseStage(s.name, s.body); });
  if (pt) ["always", "success", "failure"].forEach(function (k) { var b = jkFind(pt.inner, k); if (b) out.post[k] = jkSteps(b.inner); });
  return out;
}
function jkIsPharmacyPipeline(txt) { return /stage\s*\(\s*['"]Update manifest['"]/.test(String(txt || "")); }
function jkInterp(b, s) { var c = b.ctx || { env: {}, params: {} }; return String(s).replace(/\$\{(?:params\.|env\.)?(\w+)\}|\$(\w+)/g, function (m0, a, bb) { var k = a || bb; return c.params[k] !== undefined ? c.params[k] : c.env[k] !== undefined ? c.env[k] : m0; }); }
function jkWhenOk(b, w) {
  if (!w || !w.conds.length) return true; var c = b.ctx;
  return w.conds.every(function (x) { if (x.k === "branch") return x.v === c.env.BRANCH_NAME; if (x.k === "env") return c.env[x.n] === x.v; var e = x.v, mm = /^(?:params|env)\.(\w+)\s*==\s*['"]([^'"]*)['"]$/.exec(e), pm = /^(?:params|env)\.(\w+)$/.exec(e); if (e === "true") return true; if (e === "false") return false; if (mm) return String(c.params[mm[1]] !== undefined ? c.params[mm[1]] : c.env[mm[1]]) === mm[2]; if (pm) return c.params[pm[1]] === true || c.params[pm[1]] === "true"; return true; });
}
// ผลลัพธ์จำลองของคำสั่ง sh ที่พบบ่อย (ไม่ได้รันจริง) · คืน [บรรทัดผลลัพธ์, exit code]
function jkShOut(cmd, b) {
  var c = cmd.trim(), m;
  if ((m = /^echo\s+(.*)$/.exec(c))) return [[m[1].replace(/^(['"])(.*)\1$/, "$2")], 0];
  if (/^pwd$/.test(c)) return [["/var/jenkins_home/workspace/" + b.job], 0];
  if (/^date/.test(c)) return [["Thu Oct 29 09:41:07 UTC 2026"], 0];
  if (/^ls\b/.test(c)) { var j = jkJob(b.job), rp = j && j.repo ? S.gh.repos[jkRepoName(j)] : null, f = rp ? Object.keys(rp.files).filter(function (x) { return x.indexOf("/") < 0; }) : ["Jenkinsfile"]; return [f.length ? f : ["(empty)"], 0]; }
  if (/^docker build/.test(c)) return [["#1 [internal] load build definition from Dockerfile", "#5 [3/4] RUN pip install -r requirements.txt", "#8 exporting to image", "Successfully built " + hash32(c).slice(0, 12)], 0];
  if (/^docker (push|login)/.test(c)) return [["The push refers to repository", "latest: digest: sha256:" + hash32(c).slice(0, 16) + " size: 1573"], 0];
  if (/^(pytest|python -m pytest)/.test(c)) return [["collected 24 items", "24 passed in 3.12s"], 0];
  if (/^(npm|yarn|pnpm)( run)? test/.test(c)) return [["Test Suites: 3 passed, 3 total", "Tests: 18 passed, 18 total"], 0];
  if (/^(npm|yarn|pnpm)( run)? build/.test(c)) return [["Creating an optimized production build ...", "Compiled successfully"], 0];
  if (/^(npm|pip) install/.test(c)) return [["added 312 packages in 8s"], 0];
  if (/^terraform (fmt|validate)/.test(c)) return [["Success! The configuration is valid."], 0];
  if (/^terraform plan/.test(c)) return [["Plan: 0 to add, 0 to change, 0 to destroy."], 0];
  if ((m = /^exit\s+(\d+)/.exec(c))) return [[], +m[1]];
  if (/^false$/.test(c)) return [[], 1];
  return [["(ตัวจำลอง: ไม่ได้รันคำสั่งจริง)"], 0];
}
function jkGenericStart(b, jb, txt, pre) {
  var P = jkParsePipeline(txt), params = {}; P.params.forEach(function (p) { params[p.name] = p.type === "Boolean" ? p.def === "true" : String(p.def).split("\n")[0]; }); Object.keys(b.params || {}).forEach(function (k) { if ((params[k] !== undefined || P.params.some(function (x) { return x.name === k; })) && b.params[k] !== "" && b.params[k] !== undefined) params[k] = b.params[k]; });
  var env = Object.assign({ BUILD_NUMBER: String(b.id), JOB_NAME: jb.name, BRANCH_NAME: String(jb.branch || "main").replace(/^(\*\/|origin\/)/, ""), WORKSPACE: "/var/jenkins_home/workspace/" + jb.name }, P.env);
  b.ctx = { env: env, params: params }; b.generic = true; b.postSteps = P.post; jb.genParams = P.params; jb.paramsKnown = P.params.length > 0;
  var list = []; P.stages.forEach(function (s) { if (s.parallel) { list.push({ name: s.name, st: "pending", steps: [{ t: "echo", v: "Parallel: " + s.parallel.map(function (k) { return k.name; }).join(" | ") }], when: s.when }); s.parallel.forEach(function (k) { list.push({ name: s.name + " › " + k.name, st: "pending", steps: k.steps, when: k.when, inPar: s.name }); }); } else list.push({ name: s.name, st: "pending", steps: s.steps, when: s.when }); });
  if (Object.keys(P.post).length) list.push({ name: "Post Actions", st: "pending", post: true });
  b.stages = (pre ? b.stages : []).concat(list); b.idx = pre ? b.stages.length - list.length : 0;
  if (!list.length || (list.length === 1 && list[0].post)) { b.log.push("WorkflowScript: no stages found", "Finished: FAILURE"); b.state = "done"; b.result = "FAILURE"; return b; }
  if (jkReal(b)) jkMarkNext(b); else jkInlineAdvance(b); return b;
}
function jkInlineStart(b, jb) { b.log.push("Started by user " + b.who, "[Pipeline] Start of Pipeline", "[Pipeline] node", "Running on Jenkins in /var/jenkins_home/workspace/" + jb.name, "[Pipeline] {"); return jkGenericStart(b, jb, jb.inline, false); }
function jkRunSteps(b, steps) {
  for (var k = 0; k < steps.length; k++) {
    var t = steps[k], v = jkInterp(b, t.v);
    if (t.t === "echo") b.log.push("[Pipeline] echo", v);
    else if (t.t === "sleep") b.log.push("[Pipeline] sleep", "Sleeping for " + v + " sec");
    else if (t.t === "error") { b.log.push("[Pipeline] error"); return v; }
    else if (t.t === "checkout" || t.t === "git") b.log.push("[Pipeline] checkout", "Cloning the remote Git repository");
    else if (t.t === "archiveArtifacts") b.log.push("[Pipeline] archiveArtifacts", "Archiving artifacts: " + v);
    else if (t.t === "junit") b.log.push("[Pipeline] junit", "Recording test results: " + v);
    else { b.log.push("[Pipeline] sh"); var cmds = v.split("\n").map(function (x) { return x.trim(); }).filter(Boolean); for (var i = 0; i < cmds.length; i++) { b.log.push("+ " + cmds[i]); var r = jkShOut(cmds[i], b); r[0].forEach(function (l) { b.log.push(l); }); if (r[1]) return "script returned exit code " + r[1]; } }
  }
  return "";
}
function jkInlineAdvance(b, once) {
  while (b.idx < b.stages.length) {
    var s = b.stages[b.idx], bad = "";
    if (s.post) { b.idx++; continue; }
    if (!jkWhenOk(b, s.when)) { s.st = "skipped"; b.log.push("[Pipeline] stage", "[Pipeline] { (" + s.name + ")", "Stage \"" + s.name + "\" skipped due to when conditional", "[Pipeline] }", "[Pipeline] // stage"); b.idx++; continue; }
    s.st = "running"; b.log.push("[Pipeline] stage", "[Pipeline] { (" + s.name + ")"); bad = jkRunSteps(b, s.steps || []);
    if (bad) { s.st = "failed"; b.log.push("[Pipeline] }", "[Pipeline] // stage"); b.stages.forEach(function (x) { if (x.st === "pending" && !x.post) x.st = "not run"; }); jkInlineFinish(b, false, bad); return; }
    s.st = "success"; b.log.push("[Pipeline] }", "[Pipeline] // stage"); b.idx++;
    if (once && jkReal(b)) { if (b.idx < b.stages.length && !b.stages[b.idx].post) { jkMarkNext(b); return; } if (b.idx < b.stages.length) { b.idx++; } break; }
  }
  if (b.idx >= b.stages.length || (b.stages[b.idx] && b.stages[b.idx].post)) jkInlineFinish(b, true, "");
}
function jkInlineFinish(b, ok, why) {
  var ps = b.postSteps || {}, run = function (k) { if (ps[k]) { b.log.push("[Pipeline] stage", "[Pipeline] { (Declarative: Post Actions)"); jkRunSteps(b, ps[k]); b.log.push("[Pipeline] }", "[Pipeline] // stage"); } };
  run("always"); run(ok ? "success" : "failure"); b.stages.forEach(function (x) { if (x.post) x.st = "success"; });
  if (ok) { b.log.push("[Pipeline] }", "[Pipeline] // node", "[Pipeline] End of Pipeline", "Finished: SUCCESS"); b.state = "done"; b.result = "SUCCESS"; } else { b.log.push("[Pipeline] End of Pipeline", "ERROR: " + why, "Finished: FAILURE"); b.state = "done"; b.result = "FAILURE"; }
}
