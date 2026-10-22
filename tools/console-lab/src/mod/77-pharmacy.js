// ---- แอป pharmacy จำลอง (ทำตาม repo-backend: Django REST + repo-frontend: Next.js): แต่ละ env มีฐานข้อมูลของตัวเอง (pharmacy_dev / pharmacy_prd)
// ข้อมูลตัวอย่างมีทั้ง dev และ prd (Job backend-migrate รัน bootstrap_app --sample) · ระบบจริงไม่ใส่ตัวอย่างใน prd แต่ใน lab ใส่ไว้ให้เห็นหน้าเว็บ
var PH_SEED = [["Pain relief", [["PCM500", "Paracetamol 500 mg", "box", "35.00", 120, 30], ["IBU400", "Ibuprofen 400 mg", "box", "58.00", 8, 20], ["ASP81", "Aspirin 81 mg", "box", "42.00", 64, 20]]],
  ["Antibiotics", [["AMX500", "Amoxicillin 500 mg", "box", "95.00", 40, 25], ["AZI250", "Azithromycin 250 mg", "box", "180.00", 0, 10]]],
  ["Allergy", [["CTZ10", "Cetirizine 10 mg", "box", "48.00", 75, 20], ["LRT10", "Loratadine 10 mg", "box", "52.00", 12, 15]]],
  ["Digestive", [["ORS01", "Oral rehydration salts", "sachet", "9.00", 300, 100], ["OMP20", "Omeprazole 20 mg", "box", "120.00", 22, 20]]]], PH_MAX = 1000000, PH_PAGE = 10, PH_REASONS = ["receive", "dispense", "adjust", "expired"];
function phState(env) {
  S.ph = S.ph || {};
  if (!S.ph[env] || S.ph[env].v !== 2) { // state เก่า (ก่อนเปลี่ยนเป็น Django/Next.js) ไม่มี sku/price: ทิ้งแล้วสร้างใหม่
    var st = S.ph[env] = { v: 2, seq: 0, cats: [], meds: [], moves: [], mseq: 0 };
    PH_SEED.forEach(function (c, ci) { st.cats.push({ id: ci + 1, name: c[0] }); c[1].forEach(function (x) { st.meds.push({ id: ++st.seq, sku: x[0], name: x[1], cat: ci + 1, unit: x[2], price: x[3], stock: x[4], reorder: x[5] }); }); });
  }
  return S.ph[env];
}
// รหัสผ่านแอดมินของเว็บ = django_admin_password ใน ansible/group_vars/all/main.yml (Ansible ใส่ใน Secret app-secrets)
function phAdminPw() { var t = ""; try { t = fsRead(REPO + "/ansible/group_vars/all/main.yml") || ""; } catch (e) {} var m = /django_admin_password:\s*"([^"]*)"/.exec(t); return m ? m[1] : "ChangeMe-Admin-123456"; }
// DB ใช้ได้เมื่อ Ansible bootstrap Galera บนเครื่อง db แล้ว (ขั้น "Start a new cluster" ของ db.yml)
function phDbUp() { return S.insts.some(function (i) { return i.state === "running" && ansTag(i, "Role") === "db" && rmHas(i, "Start a new cluster"); }); }
function phInt(v) { return typeof v === "number" && isFinite(v) && Math.floor(v) === v; }
function phView(st, m) { var c = st.cats.filter(function (x) { return x.id === m.cat; })[0]; return { id: m.id, sku: m.sku, name: m.name, category: m.cat || null, category_name: c ? c.name : null, unit: m.unit, price: m.price, stock: m.stock, reorder_level: m.reorder, low_stock: m.stock <= m.reorder, is_active: true }; }
function phPage(all, page) { var n = Math.max(1, Math.ceil(all.length / PH_PAGE)), p = +page || 1; if (p < 1 || p > n) return { code: 404, body: { detail: "Invalid page." } }; return { code: 200, body: { count: all.length, next: p < n ? "?page=" + (p + 1) : null, previous: p > 1 ? "?page=" + (p - 1) : null, results: all.slice((p - 1) * PH_PAGE, p * PH_PAGE) } }; }
function phQuery(path) { var q = {}, i = path.indexOf("?"); if (i < 0) return [path, q]; path.slice(i + 1).split("&").forEach(function (kv) { var p = kv.split("="); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " ")); }); return [path.slice(0, i), q]; }
// เลียนแบบ API ของ backend (Django REST): คืน { code, body } · auth = มี token แล้วหรือยัง (ผ่าน cookie ของ Next)
function phApi(env, method, rawPath, body, dbUp, auth) {
  var pq = phQuery(rawPath), path = pq[0], Q = pq[1], b = body && typeof body === "object" ? body : {}, bad = function (o) { return { code: 400, body: o }; };
  if (path === "/api/health") return { code: 200, body: { status: "ok", version: "v1.0.0" } };
  var down = { code: 500, body: { detail: "Server Error: OperationalError (2003, \"Can't connect to MySQL server on 'galera' ([Errno -2] Name or service not known)\")" } };
  if (path === "/api/ready") return dbUp ? { code: 200, body: { status: "ready" } } : { code: 503, body: { status: "not ready", error: "OperationalError" } };
  if (path === "/api/auth/login" && method === "POST") {
    if (!dbUp) return down;
    return b.username === "admin" && b.password === phAdminPw() ? { code: 200, body: { token: "tok_" + hash32(env + "tok").slice(0, 12), user: { username: "admin", is_staff: true } } } : { code: 401, body: { detail: "invalid username or password" } };
  }
  if (!auth) return { code: 401, body: { detail: "Authentication credentials were not provided." } };
  if (!dbUp) return down;
  var st = phState(env);
  if (path === "/api/auth/me") return { code: 200, body: { username: "admin", is_staff: true } };
  if (path === "/api/categories" && method === "GET") return { code: 200, body: st.cats.slice() };
  if (path === "/api/summary") { var act = st.meds, val = act.reduce(function (s, m) { return s + m.stock * Number(m.price); }, 0); return { code: 200, body: { medicines: act.length, low_stock: act.filter(function (m) { return m.stock <= m.reorder; }).length, out_of_stock: act.filter(function (m) { return m.stock === 0; }).length, stock_value: val.toFixed(2), served_by: "" } }; }
  if (path === "/api/movements" && method === "GET") {
    var mv = st.moves.slice().reverse().filter(function (x) { return !Q.medicine || x.medicine === +Q.medicine; }).map(function (x) { var m = st.meds.filter(function (y) { return y.id === x.medicine; })[0] || {}; return { id: x.id, medicine: x.medicine, medicine_sku: m.sku, medicine_name: m.name, delta: x.delta, stock_after: x.stock_after, reason: x.reason, note: x.note, created_by_name: "admin", created_at: x.at }; });
    return phPage(mv, Q.page);
  }
  if (path === "/api/medicines" && method === "GET") {
    var q = (Q.q || "").trim().toLowerCase(), list = st.meds.filter(function (m) { return (!q || m.name.toLowerCase().indexOf(q) >= 0 || m.sku.toLowerCase().indexOf(q) >= 0) && (!Q.category || m.cat === +Q.category) && (Q.low_stock !== "1" || m.stock <= m.reorder); });
    list.sort(function (x, y) { return x.name < y.name ? -1 : x.name > y.name ? 1 : x.id - y.id; });
    return phPage(list.map(function (m) { return phView(st, m); }), Q.page);
  }
  if (path === "/api/medicines" && method === "POST") {
    var sku = String(b.sku == null ? "" : b.sku).trim(), name = String(b.name == null ? "" : b.name).trim(), err = {};
    if (!sku) err.sku = ["This field may not be blank."]; else if (sku.length > 32) err.sku = ["Ensure this field has no more than 32 characters."];
    if (!name) err.name = ["This field may not be blank."]; else if (name.length > 200) err.name = ["Ensure this field has no more than 200 characters."];
    var price = b.price == null || b.price === "" ? "0" : String(b.price); if (!/^-?\d+(\.\d{1,2})?$/.test(price)) err.price = ["A valid number is required."]; else if (+price < 0) err.price = ["price must be >= 0"];
    var rl = b.reorder_level == null ? 10 : b.reorder_level; if (!phInt(rl) || rl < 0) err.reorder_level = ["A valid integer is required."];
    if (!err.sku && st.meds.some(function (m) { return m.sku === sku; })) err.sku = ["medicine with this sku already exists."];
    if (Object.keys(err).length) return bad(err);
    var m = { id: ++st.seq, sku: sku, name: name, cat: b.category ? +b.category : null, unit: b.unit || "box", price: (+price).toFixed(2), stock: 0, reorder: rl }; st.meds.push(m); return { code: 201, body: phView(st, m) };
  }
  var pm = /^\/api\/medicines\/(\d+)(\/adjust)?$/.exec(path), med = pm && st.meds.filter(function (x) { return x.id === +pm[1]; })[0];
  if (pm && pm[2] && method === "POST") {
    var d = b.delta, reason = b.reason == null ? "adjust" : b.reason, e2 = {};
    if (!phInt(d)) e2.delta = ["A valid integer is required."]; else if (d === 0) e2.delta = ["delta must not be 0"]; else if (Math.abs(d) > PH_MAX) e2.delta = ["Ensure this value is less than or equal to " + PH_MAX + "."];
    if (PH_REASONS.indexOf(reason) < 0) e2.reason = ["\"" + reason + "\" is not a valid choice."];
    if (Object.keys(e2).length) return bad(e2);
    if (!med) return { code: 404, body: { detail: "medicine not found" } };
    var ns = med.stock + d; if (ns < 0) return bad({ detail: "stock cannot go below 0", stock: med.stock }); if (ns > PH_MAX) return bad({ detail: "stock cannot exceed " + PH_MAX, stock: med.stock });
    med.stock = ns; st.moves.push({ id: ++st.mseq, medicine: med.id, delta: d, stock_after: ns, reason: reason, note: String(b.note || ""), at: new Date(2026, 9, 22, 9, 0, st.mseq).toISOString() }); return { code: 200, body: phView(st, med) };
  }
  if (pm && !pm[2] && method === "DELETE") { if (!med) return { code: 404, body: { detail: "No Medicine matches the given query." } }; st.meds = st.meds.filter(function (x) { return x !== med; }); st.moves = st.moves.filter(function (x) { return x.medicine !== med.id; }); return { code: 204, body: null }; }
  if (pm && !pm[2] && method === "PATCH") { if (!med) return { code: 404, body: { detail: "No Medicine matches the given query." } }; if (typeof b.name === "string" && b.name.trim()) med.name = b.name.trim(); if (b.price != null && /^\d+(\.\d{1,2})?$/.test(String(b.price))) med.price = (+b.price).toFixed(2); if (phInt(b.reorder_level) && b.reorder_level >= 0) med.reorder = b.reorder_level; return { code: 200, body: phView(st, med) }; }
  return { code: 404, body: { detail: "Not found." } };
}
