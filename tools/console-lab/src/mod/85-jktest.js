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
  per.forEach(function (x) { var fails = bad.filter(function (b) { return b.f === x[0]; }).length, dots = Array(Math.max(0, x[1] - fails) + 1).join(".") + Array(fails + 1).join("F"); out.push(x[0] + " " + dots + "  [" + Math.min(100, Math.round(100 * out.length / Math.max(1, per.length + 7))) + "%]"); });
  out.push("");
  if (bad.length) {
    out.push("=================================== FAILURES ===================================");
    bad.forEach(function (b) { out.push("_" + Array(30).join("_") + " " + b.fn + " " + Array(30).join("_"), b.f + ":" + b.line + ": in " + b.fn, "    " + b.code, "E   AssertionError", ""); });
    out.push("=========================== short test summary info ============================"); bad.forEach(function (b) { out.push("FAILED " + b.f + "::" + b.fn + " - AssertionError"); });
    out.push("========================= " + bad.length + " failed, " + passed + " passed in 4.87s =========================");
    return { out: out, ok: false, err: ["script returned exit code 1", "ERROR: Test ล้ม " + bad.length + " ข้อ (" + bad[0].f + ":" + bad[0].line + ") — แก้เทสต์/โค้ดให้ผ่านก่อน pipeline จึงไปต่อได้"] };
  }
  out.push("============================== " + total + " passed in 4.87s ==============================");
  return { out: out, ok: true };
}
function jkTestFrontend(files) {
  var src = Object.keys(files).filter(function (f) { return /^src\/.*\.(ts|tsx)$/.test(f); }), tf = /^src\/.*\.test\.tsx?$/, cur = jkCountRx(files, tf, /^\s*it\(/gm), base = jkBaseCount("repo-frontend/", tf, /^\s*it\(/gm), total = Math.max(0, JKT_BASE.fe + cur - base), nfiles = Object.keys(files).filter(function (f) { return tf.test(f); }).length;
  var out = ["added 352 packages in 21s", "", "> pharmacy-frontend@1.0.0 lint", "> eslint ."], dbg = [];
  src.forEach(function (f) { var m = /^[ \t]*debugger;?/m.exec(files[f]); if (m) dbg.push([f, jkLineOf(files[f], m.index)]); });
  if (dbg.length) { dbg.forEach(function (d) { out.push("", "/var/jenkins_home/workspace/" + d[0], "  " + d[1] + ":3  error  Unexpected 'debugger' statement  no-debugger"); }); out.push("", "✖ " + dbg.length + " problem (" + dbg.length + " error, 0 warnings)"); return { out: out, ok: false, err: ["npm error Lifecycle script `lint` failed with error: code 1", "script returned exit code 1", "ERROR: eslint ล้ม — ลบ debugger ออกจากโค้ดแล้ว push ใหม่"] }; }
  out.push("", "> pharmacy-frontend@1.0.0 typecheck", "> tsc --noEmit"); var ty = [];
  src.forEach(function (f) { var m = /:\s*number\s*=\s*"[^"]*"/.exec(files[f]); if (m) ty.push([f, jkLineOf(files[f], m.index)]); });
  if (ty.length) { ty.forEach(function (d) { out.push(d[0] + "(" + d[1] + ",7): error TS2322: Type 'string' is not assignable to type 'number'."); }); return { out: out, ok: false, err: ["npm error Lifecycle script `typecheck` failed with error: code 2", "script returned exit code 2", "ERROR: tsc ล้ม — ชนิดข้อมูลไม่ตรง แก้ให้ถูกชนิดแล้ว push ใหม่"] }; }
  out.push("", "> pharmacy-frontend@1.0.0 test", "> vitest run", ""); var failed = [];
  Object.keys(files).filter(function (f) { return tf.test(f); }).sort().forEach(function (f) { var rx = /expect\((true|false|1|0)\)\.toBe\((true|false|1|2|0)\)/g, m, txt = String(files[f]); while ((m = rx.exec(txt))) { if (m[1] !== m[2]) failed.push([f, jkLineOf(txt, m.index), m[0]]); } });
  Object.keys(files).filter(function (f) { return tf.test(f); }).sort().forEach(function (f) { var n = (String(files[f]).match(/^\s*it\(/gm) || []).length, bad = failed.filter(function (x) { return x[0] === f; }).length; out.push(" " + (bad ? "❯ " : "✓ ") + f + " (" + n + " tests" + (bad ? " | " + bad + " failed" : "") + ") 9ms"); });
  if (failed.length) { failed.forEach(function (x) { out.push("", " FAIL  " + x[0], "AssertionError: expected " + /\((\w+)\)\.toBe/.exec(x[2])[1] + " to be " + /toBe\((\w+)\)/.exec(x[2])[1] + " // Object.is equality", " ❯ " + x[0] + ":" + x[1]); }); out.push("", " Test Files  " + failed.length + " failed | " + Math.max(0, nfiles - failed.length) + " passed (" + nfiles + ")", "      Tests  " + failed.length + " failed | " + Math.max(0, total - failed.length) + " passed (" + total + ")"); return { out: out, ok: false, err: ["script returned exit code 1", "ERROR: vitest ล้ม " + failed.length + " ข้อ — แก้เทสต์/โค้ดให้ผ่านก่อน"] }; }
  out.push("", " Test Files  " + nfiles + " passed (" + nfiles + ")", "      Tests  " + total + " passed (" + total + ")");
  return { out: out, ok: true };
}
