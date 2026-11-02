// ===== stage Test ของ Jenkins จำลอง: อ่านโค้ดจริงใน GitHub จำลอง (repo-backend / repo-frontend) =====
// นับจำนวนเทสต์จริง · ล้มได้เมื่อผู้เรียนแก้โค้ด/เทสต์ให้พัง (เหมือนที่ pytest / eslint / tsc / vitest ของจริงจะล้ม)
var JKT_BASE = { be: 71, fe: 52 };  // ผลของ repo ตั้งต้น (pytest 71 / vitest 52 ที่รันจริงด้วย podman)
function jkTestFiles(jb) {
  var k = jkRepoName(jb), rp = S.gh && S.gh.repos[k]; if (!rp) return null;
  var br = String(jb.branch || "*/main").replace(/^(\*\/|origin\/|refs\/heads\/)/, "");
  return br === "main" ? rp.files : (rp.branches || {})[br] || rp.files;
}
function jkCountRx(files, nameRx, rx) { var n = 0; Object.keys(files).forEach(function (f) { if (nameRx.test(f)) n += (String(files[f]).match(rx) || []).length; }); return n; }
function jkBaseCount(prefix, nameRx, rx) { var n = 0; Object.keys(LABFILES).forEach(function (f) { if (f.indexOf(prefix) === 0 && nameRx.test(f.slice(prefix.length))) n += (String(LABFILES[f]).match(rx) || []).length; }); return n; }
function jkLineOf(text, idx) { return String(text).slice(0, idx).split("\n").length; }
// คืน { out: [บรรทัดผลลัพธ์], ok, err: [บรรทัดแจ้งล้ม] }
function jkTestRun(jb) {
  var files = jkTestFiles(jb); if (!files) return null;
  return jb.svc === "backend" ? jkTestBackend(jb, files) : jkTestFrontend(files);
}
function jkTestBackend(jb, files) {
  var tf = /^stock\/tests\/test_[^\/]*\.py$/, cur = jkCountRx(files, tf, /^def test_/gm), base = jkBaseCount("repo-backend/", tf, /^def test_/gm), total = Math.max(0, JKT_BASE.be + cur - base);
  var names = Object.keys(files).filter(function (f) { return tf.test(f); }).sort(), per = names.map(function (f) { return [f, (String(files[f]).match(/^def test_/gm) || []).length]; }), sum = per.reduce(function (s, x) { return s + x[1]; }, 0);
  if (per.length && total > sum) per[per.length - 1][1] += total - sum;  // เทสต์แบบ parametrize/ลูป ที่ pytest นับเพิ่ม
  var out = ["============================= test session starts ==============================", "platform linux -- Python 3.12.7, pytest-9.1.1", "rootdir: /var/jenkins_home/workspace/" + jb.name, "configfile: pytest.ini", "plugins: django-4.14.0", "collected " + total + " items", ""], bad = [];
  names.forEach(function (f) { var txt = String(files[f]), rx = /^\s*(assert\s+(False|0)\b|raise\s+AssertionError|pytest\.fail\()/gm, m; while ((m = rx.exec(txt))) { var head = txt.slice(0, m.index), fn = /def (test_\w+)\(/g, last = null, x; while ((x = fn.exec(head))) last = x[1]; bad.push({ f: f, line: jkLineOf(txt, m.index) + (m[0].charAt(0) === "\n" ? 1 : 0), fn: last || "test", code: m[0].trim() }); } });
  var passed = Math.max(0, total - bad.length);
  var done = 0;
  per.forEach(function (x) { done += x[1]; var fails = bad.filter(function (b) { return b.f === x[0]; }).length, dots = Array(Math.max(0, x[1] - fails) + 1).join(".") + Array(fails + 1).join("F"); out.push(x[0] + " " + dots + "  [" + Math.round(100 * done / Math.max(1, total)) + "%]"); });
  out.push("");
  if (bad.length) {
    out.push("=================================== FAILURES ===================================");
    bad.forEach(function (b) { out.push("_" + Array(30).join("_") + " " + b.fn + " " + Array(30).join("_"), b.f + ":" + b.line + ": in " + b.fn, "    " + b.code, "E   AssertionError", ""); });
    out.push("=========================== short test summary info ============================"); bad.forEach(function (b) { out.push("FAILED " + b.f + "::" + b.fn + " - AssertionError"); });
    out.push("========================= " + bad.length + " failed, " + passed + " passed in 4.87s =========================");
    return { out: out, ok: false, err: ["script returned exit code 1", "Test ล้ม " + bad.length + " ข้อ (" + bad[0].f + ":" + bad[0].line + ") — แก้เทสต์/โค้ดให้ผ่านก่อน pipeline จึงไปต่อได้"] };
  }
  out.push("============================== " + total + " passed in 4.87s ==============================");
  return { out: out, ok: true };
}
function jkTestFrontend(files) {
  var src = Object.keys(files).filter(function (f) { return /^src\/.*\.(ts|tsx)$/.test(f); }), tf = /^src\/.*\.test\.tsx?$/, cur = jkCountRx(files, tf, /^\s*it\(/gm), base = jkBaseCount("repo-frontend/", tf, /^\s*it\(/gm), total = Math.max(0, JKT_BASE.fe + cur - base), nfiles = Object.keys(files).filter(function (f) { return tf.test(f); }).length;
  var out = ["added 352 packages in 21s", "", "> pharmacy-frontend@1.0.0 lint", "> eslint ."], dbg = [];
  src.forEach(function (f) { var m = /^[ \t]*debugger;?/m.exec(files[f]); if (m) dbg.push([f, jkLineOf(files[f], m.index)]); });
  if (dbg.length) { dbg.forEach(function (d) { out.push("", "/var/jenkins_home/workspace/" + d[0], "  " + d[1] + ":3  error  Unexpected 'debugger' statement  no-debugger"); }); out.push("", "✖ " + dbg.length + " problem (" + dbg.length + " error, 0 warnings)"); return { out: out, ok: false, err: ["npm error Lifecycle script `lint` failed with error: code 1", "script returned exit code 1", "eslint ล้ม — ลบ debugger ออกจากโค้ดแล้ว push ใหม่"] }; }
  out.push("", "> pharmacy-frontend@1.0.0 typecheck", "> tsc --noEmit"); var ty = [];
  src.forEach(function (f) { var m = /:\s*number\s*=\s*"[^"]*"/.exec(files[f]); if (m) ty.push([f, jkLineOf(files[f], m.index)]); });
  if (ty.length) { ty.forEach(function (d) { out.push(d[0] + "(" + d[1] + ",7): error TS2322: Type 'string' is not assignable to type 'number'."); }); return { out: out, ok: false, err: ["npm error Lifecycle script `typecheck` failed with error: code 2", "script returned exit code 2", "tsc ล้ม — ชนิดข้อมูลไม่ตรง แก้ให้ถูกชนิดแล้ว push ใหม่"] }; }
  out.push("", "> pharmacy-frontend@1.0.0 test", "> vitest run", ""); var failed = [];
  Object.keys(files).filter(function (f) { return tf.test(f); }).sort().forEach(function (f) { var rx = /expect\((true|false|1|0)\)\.toBe\((true|false|1|2|0)\)/g, m, txt = String(files[f]); while ((m = rx.exec(txt))) { if (m[1] !== m[2]) failed.push([f, jkLineOf(txt, m.index), m[0]]); } });
  Object.keys(files).filter(function (f) { return tf.test(f); }).sort().forEach(function (f) { var n = (String(files[f]).match(/^\s*it\(/gm) || []).length, bad = failed.filter(function (x) { return x[0] === f; }).length; out.push(" " + (bad ? "❯ " : "✓ ") + f + " (" + n + " tests" + (bad ? " | " + bad + " failed" : "") + ") 9ms"); });
  if (failed.length) { failed.forEach(function (x) { out.push("", " FAIL  " + x[0], "AssertionError: expected " + /\((\w+)\)\.toBe/.exec(x[2])[1] + " to be " + /toBe\((\w+)\)/.exec(x[2])[1] + " // Object.is equality", " ❯ " + x[0] + ":" + x[1]); }); out.push("", " Test Files  " + failed.length + " failed | " + Math.max(0, nfiles - failed.length) + " passed (" + nfiles + ")", "      Tests  " + failed.length + " failed | " + Math.max(0, total - failed.length) + " passed (" + total + ")"); return { out: out, ok: false, err: ["script returned exit code 1", "vitest ล้ม " + failed.length + " ข้อ — แก้เทสต์/โค้ดให้ผ่านก่อน"] }; }
  out.push("", " Test Files  " + nfiles + " passed (" + nfiles + ")", "      Tests  " + total + " passed (" + total + ")");
  return { out: out, ok: true };
}
// ---- stage Scan image (Trivy จำลอง): อ่าน Dockerfile + requirements/package.json จริง · เจอ base image / แพ็กเกจเก่าที่มีช่องโหว่ HIGH/CRITICAL แล้วล้ม
var JKS_IMG = [[/^FROM\s+python:3\.(?:[0-9]|10)(?:[.-]|\s|$)/i, "python (base image)", "CVE-2023-24329", "HIGH", "3.12.7"], [/^FROM\s+node:(?:1[0-8]|[0-9])(?:[.-]|\s|$)/i, "node (base image)", "CVE-2023-44487", "HIGH", "22.12.0"], [/^FROM\s+\S*:latest\b/i, "latest tag (base image)", "DS001", "HIGH", "pin a version"]];
var JKS_PKG = [["django", /^django==(?:[0-3]\.|4\.[01]\.)/i, "CVE-2023-36053", "HIGH", "5.2"], ["requests", /^requests==2\.(?:[0-9]|1[0-9]|2[0-9]|30)\./i, "CVE-2023-32681", "HIGH", "2.32.3"], ["pyyaml", /^pyyaml==(?:[0-4]\.|5\.[0-3]\.)/i, "CVE-2020-14343", "CRITICAL", "6.0.2"], ["pillow", /^pillow==(?:[0-8]\.|9\.[0-4]\.)/i, "CVE-2023-4863", "CRITICAL", "11.0.0"]];
var JKS_NPM = [["next", /^(?:[0-9]|1[0-3])\./, "CVE-2024-34351", "HIGH", "15.0.0"], ["lodash", /^[0-3]\.|^4\.(?:[0-9]|1[0-6])\./, "CVE-2021-23337", "HIGH", "4.17.21"], ["axios", /^0\./, "CVE-2023-45857", "HIGH", "1.7.0"], ["minimist", /^0\./, "CVE-2021-44906", "CRITICAL", "1.2.8"]];
function jkScanRun(jb) {
  var files = jkTestFiles(jb); if (!files) return null; var hit = [];
  String(files.Dockerfile || "").split("\n").forEach(function (t, i) { JKS_IMG.forEach(function (r) { if (r[0].test(t.trim())) hit.push({ f: "Dockerfile", ln: i + 1, pkg: r[1], id: r[2], sev: r[3], fix: r[4], ver: t.trim().split(/\s+/)[1] }); }); });
  if (jb.svc === "backend") Object.keys(files).filter(function (f) { return /^requirements\/.*\.txt$|^requirements\.txt$/.test(f); }).forEach(function (f) { String(files[f]).split("\n").forEach(function (t, i) { JKS_PKG.forEach(function (r) { if (r[1].test(t.trim())) hit.push({ f: f, ln: i + 1, pkg: r[0], id: r[2], sev: r[3], fix: r[4], ver: t.trim().split("==")[1] }); }); }); });
  else { var pj; try { pj = JSON.parse(files["package.json"] || "{}"); } catch (e) { pj = {}; } var dp = Object.assign({}, pj.dependencies, pj.devDependencies), lines = String(files["package.json"] || "").split("\n"); JKS_NPM.forEach(function (r) { var v = dp[r[0]]; if (v && r[1].test(String(v).replace(/^[\^~]/, ""))) hit.push({ f: "package.json", ln: Math.max(1, lines.findIndex(function (l) { return l.indexOf('"' + r[0] + '"') >= 0; }) + 1), pkg: r[0], id: r[2], sev: r[3], fix: r[4], ver: String(v) }); }); }
  var c = hit.filter(function (h) { return h.sev === "CRITICAL"; }).length, hi = hit.length - c, out = ["", "Total: " + hit.length + " (HIGH: " + hi + ", CRITICAL: " + c + ")"];
  if (!hit.length) return { out: out, ok: true };
  out.push("", "┌──────────────┬────────────────┬──────────┬───────────┬───────────────┐", "│ Library      │ Vulnerability  │ Severity │ Installed │ Fixed Version │", "├──────────────┼────────────────┼──────────┼───────────┼───────────────┤");
  hit.forEach(function (h) { out.push("│ " + h.pkg.slice(0, 12).padEnd(12) + " │ " + h.id.padEnd(14) + " │ " + h.sev.padEnd(8) + " │ " + String(h.ver).slice(0, 9).padEnd(9) + " │ " + h.fix.slice(0, 13).padEnd(13) + " │   (" + h.f + ":" + h.ln + ")"); });
  out.push("└──────────────┴────────────────┴──────────┴───────────┴───────────────┘");
  return { out: out, ok: false, err: ["script returned exit code 1", "Trivy พบช่องโหว่ " + hit.length + " รายการ (" + hit[0].f + ":" + hit[0].ln + " " + hit[0].pkg + ") — อัปเกรดเป็น Fixed Version แล้ว push ใหม่"] };
}
// ---- โจทย์ฝึก "ทำให้ pipeline ล้ม แล้วแก้" (แสดงใน Lab › Jenkins pipeline) · cmds รันในเทอร์มินัลจำลองได้จริง (test.js เช็กทุกข้อ)
var JKEX = [
  { id: "test", svc: "backend", stage: "Test", c: "#c0392b", t: "เทสต์พัง → ล้มที่ Test", why: "เทสต์ล้มคือด่านแรกที่ทีมจริงเจอทุกวัน: pipeline หยุดก่อนถึง build image", cmds: ["echo \"assert False\" >> stock/tests/test_api.py"], see: "stage **Test** แดง · log มี `FAILURES` และไฟล์:บรรทัดที่พัง · stage หลังจากนั้นขึ้น not run", fix: ["sed -i 's/^assert False$//' stock/tests/test_api.py"] },
  { id: "secret", svc: "backend", stage: "SonarQube scan", c: "#8456ce", t: "password ฝังในโค้ด → ล้มที่ SonarQube", why: "secret รั่วใน git คือเหตุที่ทีมติด Quality Gate บ่อยที่สุด", cmds: ["echo 'DB_PASSWORD = \"hunter2-prod\"' >> stock/tests/test_api.py"], see: "stage **SonarQube scan** แดง · `QUALITY GATE STATUS: FAILED` · เปิดหน้า SonarQube › Issues เห็น Vulnerability `S2068` ที่บรรทัดนั้น", fix: ["sed -i 's/^DB_PASSWORD = .*$//' stock/tests/test_api.py"] },
  { id: "cve", svc: "backend", stage: "Scan image", c: "#0f9d8a", t: "แพ็กเกจเก่ามี CVE → ล้มที่ Scan image", why: "CVE ใหม่ออกทุกสัปดาห์ แพ็กเกจที่ล็อกเวอร์ชันไว้นานๆ จะค่อยๆ กลายเป็นช่องโหว่เอง", cmds: ["echo \"requests==2.19.0\" >> requirements/base.txt"], see: "stage **Scan image** แดง · ตาราง Trivy บอก `CVE-2023-32681` · Fixed Version `2.32.3` · stage Push image ไม่ถูกรัน", fix: ["sed -i 's/^requests==2.19.0$//' requirements/base.txt"] },
  { id: "img", svc: "frontend", stage: "Scan image", c: "#0f9d8a", t: "base image เก่า → ล้มที่ Scan image", why: "repo ที่ไม่ได้แตะนานมักยังชี้ base image เวอร์ชันเก่าที่หมดอายุซัพพอร์ต", cmds: ["sed -i 's/node:22.12.0-alpine3.21/node:14-alpine/' Dockerfile"], see: "stage **Scan image** แดง · ตาราง Trivy บอก `node (base image)` · Fixed Version `22.12.0`", fix: ["sed -i 's/node:14-alpine/node:22.12.0-alpine3.21/' Dockerfile"] },
  { id: "lint", svc: "frontend", stage: "Test", c: "#c0392b", t: "เหลือ debugger ในโค้ด → ล้มที่ lint", why: "lint จับของที่ลืมลบก่อนขึ้น prd (frontend รัน lint → typecheck → vitest ตามลำดับ)", cmds: ["echo \"debugger;\" >> src/lib/client.ts"], see: "stage **Test** แดงตั้งแต่ `eslint` · `no-debugger` พร้อมไฟล์:บรรทัด · ยังไม่ถึง typecheck/vitest (ล้มเร็ว)", fix: ["sed -i 's/^debugger;$//' src/lib/client.ts"] }
];
// โหลดสถานการณ์ use case 9: ตั้งค่าครบ + push 3 repo + build ปกติ 1 รอบ (baseline ของ Sonar) แล้วทำให้พังตามข้อ id (ไม่ระบุ = ปกติ) · คืน {r, ex}
function jkexLoad(id) {
  var r = buildReady("demo"), ex = JKEX.filter(function (x) { return x.id === id; })[0]; readyPushCmds().forEach(function (c) { shRun(c); });
  ["backend", "frontend"].forEach(function (svc) { jkSelect("pharmacy-" + svc); jkNew({ TARGET_ENV: "dev", SERVICE: svc, VERSION: "v1.0.0", ACTION: "build-and-deploy", AUTO_SYNC: false, CHANGE_NOTE: "" }); });
  if (ex) { shRun("cd " + REPO + "/repo-" + ex.svc); ex.cmds.forEach(function (c) { shRun(c); }); shRun("git add ."); shRun("git commit -m \"ทดลอง: " + ex.id + "\""); shRun("git push"); jkSelect("pharmacy-" + ex.svc); }
  return { r: r, ex: ex };
}
