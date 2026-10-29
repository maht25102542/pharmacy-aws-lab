// ===== ข้อมูลตัวอย่างร้านยาก้อนใหญ่ + API จำลองตาม repo-backend (Django REST) ใช้ในหน้า Preview (แยกจาก state ของ lab) =====
// รหัสผ่านตัวอย่าง: admin = Pharmacy-Admin-2026! · คนอื่น = Pharmacy-Staff-2026!
var PVD_CATS = [
  ["Pain relief", "box", [["PCM500", "Paracetamol 500 mg", 35, 40], ["PCM120", "Paracetamol syrup 120 mg/5 ml", 45, 20], ["IBU400", "Ibuprofen 400 mg", 58, 30], ["ASP81", "Aspirin 81 mg", 42, 30], ["NPX250", "Naproxen 250 mg", 72, 20], ["DCF50", "Diclofenac 50 mg", 66, 20]]],
  ["Antibiotics", "box", [["AMX500", "Amoxicillin 500 mg", 95, 30], ["AMC625", "Amoxicillin/Clavulanate 625 mg", 210, 15], ["AZI250", "Azithromycin 250 mg", 180, 12], ["CPX500", "Ciprofloxacin 500 mg", 150, 15], ["DXC100", "Doxycycline 100 mg", 88, 20], ["CFX400", "Cefixime 400 mg", 240, 10]]],
  ["Allergy", "box", [["CTZ10", "Cetirizine 10 mg", 48, 25], ["LRT10", "Loratadine 10 mg", 52, 20], ["CLP4", "Chlorpheniramine 4 mg", 18, 40], ["FXF180", "Fexofenadine 180 mg", 165, 12], ["DPH25", "Diphenhydramine 25 mg", 38, 20]]],
  ["Digestive", "box", [["ORS01", "Oral rehydration salts", 9, 120], ["OMP20", "Omeprazole 20 mg", 120, 25], ["ESM40", "Esomeprazole 40 mg", 190, 15], ["DOM10", "Domperidone 10 mg", 62, 20], ["LOP2", "Loperamide 2 mg", 34, 20], ["SMT500", "Simethicone 80 mg", 55, 20]]],
  ["Cold & Cough", "bottle", [["BRH60", "Bromhexine syrup 60 ml", 65, 20], ["DXM15", "Dextromethorphan syrup 60 ml", 78, 15], ["ACC200", "Acetylcysteine 200 mg", 110, 15], ["PSE60", "Pseudoephedrine 60 mg", 40, 20], ["LZG20", "Throat lozenges", 29, 40]]],
  ["Vitamins", "bottle", [["VTC1000", "Vitamin C 1000 mg", 220, 20], ["VTD1000", "Vitamin D3 1000 IU", 260, 15], ["B12", "Vitamin B complex", 140, 20], ["ZNC15", "Zinc 15 mg", 175, 15], ["FE65", "Ferrous fumarate 65 mg", 90, 20], ["CAL600", "Calcium 600 mg", 195, 15]]],
  ["Diabetes", "box", [["MTF500", "Metformin 500 mg", 60, 40], ["GLB5", "Glibenclamide 5 mg", 48, 25], ["GLM2", "Glimepiride 2 mg", 95, 20], ["SIT50", "Sitagliptin 50 mg", 420, 10]]],
  ["Cardiovascular", "box", [["AML5", "Amlodipine 5 mg", 70, 30], ["ENL10", "Enalapril 10 mg", 68, 25], ["ATV20", "Atorvastatin 20 mg", 155, 25], ["SMV20", "Simvastatin 20 mg", 98, 25], ["LSR50", "Losartan 50 mg", 110, 25], ["MPL50", "Metoprolol 50 mg", 82, 20]]],
  ["Skin care", "tube", [["HCT1", "Hydrocortisone cream 1%", 58, 20], ["CLT1", "Clotrimazole cream 1%", 62, 20], ["BTD", "Betadine solution 30 ml", 45, 30], ["FUS2", "Fusidic acid cream 2%", 130, 12], ["CLM", "Calamine lotion", 40, 20]]],
  ["Eye & Ear", "bottle", [["AT05", "Artificial tears 0.5%", 120, 15], ["CMX", "Chloramphenicol eye drops", 70, 15], ["OTC", "Ear drops (ofloxacin)", 95, 10]]],
  ["First aid", "pack", [["BND", "Adhesive bandage 100 pcs", 85, 20], ["GZ4", "Sterile gauze 4x4", 60, 25], ["ALC70", "Alcohol 70% 450 ml", 55, 40], ["THM", "Digital thermometer", 190, 8], ["MSK50", "Surgical mask 50 pcs", 99, 30]]],
  ["Women's health", "box", [["OCP", "Oral contraceptive", 130, 20], ["PRG", "Pregnancy test", 45, 30], ["FOL5", "Folic acid 5 mg", 35, 30]]]
];
var PVD_USERS = [
  [1, "admin", "สมชาย", "ใจดี", "admin@pharmacy.local", "admin", 1, "2026-10-29T09:12:00"], [2, "somsri", "สมศรี", "รักษาดี", "somsri@pharmacy.local", "pharmacist", 1, "2026-10-29T08:40:00"],
  [3, "manee", "มานี", "มีสุข", "manee@pharmacy.local", "pharmacist", 1, "2026-10-28T17:05:00"], [4, "prasert", "ประเสริฐ", "ศรีสุวรรณ", "prasert@pharmacy.local", "clerk", 1, "2026-10-29T08:55:00"],
  [5, "wichai", "วิชัย", "พงษ์ไทย", "wichai@pharmacy.local", "clerk", 1, "2026-10-27T13:20:00"], [6, "napa", "นภา", "แสงทอง", "napa@pharmacy.local", "clerk", 1, "2026-10-28T10:30:00"],
  [7, "kanda", "กานดา", "วงศ์ดี", "kanda@pharmacy.local", "clerk", 0, "2026-09-02T11:00:00"], [8, "tester", "", "", "", "clerk", 1, null]
];
function pvdRng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function pvdPad(n) { return n < 10 ? "0" + n : "" + n; }
function pvdIso(ms) { var d = new Date(ms); return d.getFullYear() + "-" + pvdPad(d.getMonth() + 1) + "-" + pvdPad(d.getDate()) + "T" + pvdPad(d.getHours()) + ":" + pvdPad(d.getMinutes()) + ":" + pvdPad(d.getSeconds()); }
function pvdBuild() {
  var R = pvdRng(20261029), D = { cats: [], meds: [], moves: [], users: [], tokens: {}, seqU: 8, seqM: 0, seqMv: 0 }, now = Date.UTC(2026, 9, 29, 9, 30) - 7 * 3600000;
  PVD_CATS.forEach(function (c, ci) { D.cats.push({ id: ci + 1, name: c[0] }); c[2].forEach(function (x) { var init = 30 + Math.floor(R() * 220); D.meds.push({ id: ++D.seqM, sku: x[0], name: x[1], category: ci + 1, unit: c[1], price: x[2].toFixed(2), stock: init, reorder_level: x[3], is_active: true, created_at: pvdIso(now - 60 * 86400000), updated_at: pvdIso(now - 60 * 86400000), _t0: init }); }); });
  PVD_USERS.forEach(function (u) { D.users.push({ id: u[0], username: u[1], first_name: u[2], last_name: u[3], email: u[4], role: u[5], is_active: !!u[6], last_login: u[7], date_joined: "2026-08-15T10:00:00" }); });
  var staff = [1, 2, 3, 4, 5, 6], notes = { receive: ["ใบสั่งซื้อ PO-", "รับของจาก supplier ", "ล็อตใหม่ "], dispense: ["ขายหน้าร้าน", "ตามใบสั่งแพทย์", "ขายส่ง", "คนไข้ประจำ"], adjust: ["นับสต็อกจริง", "แก้ยอดผิด"], expired: ["หมดอายุ ทิ้ง", "แพ็กเกจชำรุด"] };
  for (var i = 0; i < 520; i++) {
    var m = D.meds[Math.floor(R() * D.meds.length)], pr = R(), reason = pr < .3 ? "receive" : pr < .86 ? "dispense" : pr < .94 ? "adjust" : "expired", mag = reason === "receive" ? 20 + Math.floor(R() * 120) : reason === "dispense" ? 1 + Math.floor(R() * 12) : reason === "adjust" ? 1 + Math.floor(R() * 8) : 1 + Math.floor(R() * 6);
    var delta = reason === "receive" ? mag : reason === "adjust" ? (R() < .5 ? mag : -mag) : -mag; if (m.stock + delta < 0) delta = reason === "receive" ? mag : -m.stock; if (delta === 0) continue;
    m.stock += delta; var nt = notes[reason], note = nt[Math.floor(R() * nt.length)]; if (reason === "receive" && /PO-|ล็อต/.test(note)) note += (1000 + Math.floor(R() * 8999));
    D.moves.push({ id: ++D.seqMv, medicine: m.id, delta: delta, stock_after: m.stock, reason: reason, note: note, created_by: staff[Math.floor(R() * staff.length)], created_at: pvdIso(now - (520 - i) * 2.4 * 3600000 * (0.6 + R() * .8) * 0.5) });
  }
  D.moves.sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; }); D.moves.forEach(function (x, k) { x.id = k + 1; }); D.seqMv = D.moves.length;
  var TARGET = { AZI250: 0, IBU400: 8, LRT10: 12, ATV20: 20, CTZ10: 22, ESM40: 9 }, t = now - 3600000;
  D.meds.forEach(function (m) { if (TARGET[m.sku] !== undefined && TARGET[m.sku] !== m.stock) { var dl = TARGET[m.sku] - m.stock; m.stock = TARGET[m.sku]; D.moves.push({ id: 0, medicine: m.id, delta: dl, stock_after: m.stock, reason: dl < 0 ? "dispense" : "receive", note: dl < 0 ? "ขายหน้าร้าน" : "ล็อตใหม่", created_by: 4, created_at: pvdIso(t += 60000) }); } m.updated_at = pvdIso(now - Math.floor(R() * 5) * 86400000); });
  D.moves.sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; }); D.moves.forEach(function (x, k) { x.id = k + 1; }); D.seqMv = D.moves.length;
  return D;
}
function pvdPw(u) { return u.username === "admin" ? "Pharmacy-Admin-2026!" : "Pharmacy-Staff-2026!"; }
function pvdUserOut(u) { return { id: u.id, username: u.username, first_name: u.first_name, last_name: u.last_name, email: u.email, role: u.role, is_active: u.is_active, last_login: u.last_login, date_joined: u.date_joined }; }
function pvdMe(u) { return { id: u.id, username: u.username, first_name: u.first_name, last_name: u.last_name, full_name: (u.first_name + " " + u.last_name).trim() || u.username, email: u.email, role: u.role, is_staff: u.role !== "clerk" }; }
function pvdMedOut(D, m) { var c = D.cats.filter(function (x) { return x.id === m.category; })[0]; return { id: m.id, sku: m.sku, name: m.name, category: m.category, category_name: c ? c.name : null, unit: m.unit, price: m.price, stock: m.stock, reorder_level: m.reorder_level, low_stock: m.stock <= m.reorder_level, is_active: m.is_active, updated_at: m.updated_at }; }
function pvdMvOut(D, x) { var m = D.meds.filter(function (y) { return y.id === x.medicine; })[0], u = D.users.filter(function (y) { return y.id === x.created_by; })[0]; return { id: x.id, medicine: x.medicine, medicine_sku: m ? m.sku : "", medicine_name: m ? m.name : "", delta: x.delta, stock_after: x.stock_after, reason: x.reason, note: x.note, created_by_name: u ? u.username : null, created_at: x.created_at }; }
function pvdPage(list, q) { var n = Math.max(1, Math.ceil(list.length / 10)), p = +q.page || 1; if (p < 1 || p > n) return { code: 404, body: { detail: "Invalid page." } }; return { code: 200, body: { count: list.length, next: p < n ? "?page=" + (p + 1) : null, previous: p > 1 ? "?page=" + (p - 1) : null, results: list.slice((p - 1) * 10, p * 10) } }; }
// เลียนแบบ API ของ backend: คืน { code, body } · token = "Token xxx" ที่ได้จาก /api/auth/login
function pvdApi(D, method, rawPath, body, token) {
  var qi = rawPath.indexOf("?"), path = qi < 0 ? rawPath : rawPath.slice(0, qi), Q = {}; if (qi >= 0) rawPath.slice(qi + 1).split("&").forEach(function (kv) { var p = kv.split("="); if (p[0]) Q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " ")); });
  var b = body && typeof body === "object" ? body : {}, bad = function (o) { return { code: 400, body: o }; }, uid = token && D.tokens[token];
  if (path === "/api/health") return { code: 200, body: { status: "ok", version: "v1.0.0" } };
  if (path === "/api/ready") return { code: 200, body: { status: "ready" } };
  if (path === "/api/auth/login" && method === "POST") {
    var u = D.users.filter(function (x) { return x.username === b.username; })[0];
    if (!u || !u.is_active || pvdPw(u) !== b.password) return { code: 401, body: { detail: "invalid username or password" } };
    var tk = "tok" + hash32(u.username + D.seqMv) + hash32(String(u.id) + "pv") + hash32("k" + u.id); D.tokens[tk] = u.id; u.last_login = pvdIso(Date.UTC(2026, 9, 29, 9, 35) - 7 * 3600000);
    return { code: 200, body: { token: tk, user: { id: u.id, username: u.username, first_name: u.first_name, last_name: u.last_name, full_name: pvdMe(u).full_name, email: u.email, role: u.role, is_staff: u.role !== "clerk" } } };
  }
  var me = D.users.filter(function (x) { return x.id === uid && x.is_active; })[0];
  if (!me) return { code: 401, body: { detail: "Authentication credentials were not provided." } };
  var staff = me.role !== "clerk", admin = me.role === "admin", forbid = { code: 403, body: { detail: "You do not have permission to perform this action." } };
  if (path === "/api/auth/logout") { delete D.tokens[token]; return { code: 204, body: null }; }
  if (path === "/api/auth/me") { if (method === "PATCH") ["first_name", "last_name", "email"].forEach(function (k) { if (typeof b[k] === "string") me[k] = b[k]; }); return { code: 200, body: pvdMe(me) }; }
  if (path === "/api/auth/change-password" && method === "POST") { if (b.old_password !== pvdPw(me)) return bad({ old_password: ["incorrect password"] }); if (!b.new_password || b.new_password.length < 10) return bad({ new_password: ["This password is too short. It must contain at least 10 characters."] }); me.pw = b.new_password; delete D.tokens[token]; return { code: 204, body: null }; }
  if (path === "/api/summary") { var act = D.meds.filter(function (m) { return m.is_active; }); return { code: 200, body: { medicines: act.length, low_stock: act.filter(function (m) { return m.stock <= m.reorder_level; }).length, out_of_stock: act.filter(function (m) { return m.stock === 0; }).length, stock_value: act.reduce(function (s, m) { return s + m.stock * Number(m.price); }, 0).toFixed(2), served_by: "backend-7d9c6b5f4-x2k9p" } }; }
  if (path === "/api/categories") { if (method === "GET") return { code: 200, body: D.cats }; if (!staff) return forbid; if (!b.name) return bad({ name: ["This field is required."] }); var c = { id: D.cats.length + 1, name: b.name }; D.cats.push(c); return { code: 201, body: c }; }
  if (path === "/api/movements") { var mv = D.moves.filter(function (x) { return !Q.medicine || String(x.medicine) === Q.medicine; }).slice().reverse().map(function (x) { return pvdMvOut(D, x); }); return pvdPage(mv, Q); }
  if (path === "/api/medicines" && method === "GET") { var q = (Q.q || "").toLowerCase(), l = D.meds.filter(function (m) { return (!q || m.name.toLowerCase().indexOf(q) >= 0 || m.sku.toLowerCase().indexOf(q) >= 0) && (!Q.category || String(m.category) === Q.category) && (!(Q.low_stock === "1" || Q.low_stock === "true") || m.stock <= m.reorder_level); }).sort(function (a, c2) { return a.name < c2.name ? -1 : 1; }); return pvdPage(l.map(function (m) { return pvdMedOut(D, m); }), Q); }
  if (path === "/api/medicines" && method === "POST") { if (!b.sku || !b.name) return bad({ sku: ["This field is required."] }); if (D.meds.some(function (m) { return m.sku === b.sku; })) return bad({ sku: ["medicine with this sku already exists."] }); var nm = { id: ++D.seqM, sku: b.sku, name: b.name, category: b.category ? +b.category : null, unit: b.unit || "box", price: Number(b.price || 0).toFixed(2), stock: 0, reorder_level: +b.reorder_level || 10, is_active: true, created_at: pvdIso(Date.now()), updated_at: pvdIso(Date.now()) }; D.meds.push(nm); return { code: 201, body: pvdMedOut(D, nm) }; }
  var mm = /^\/api\/medicines\/(\d+)(\/adjust)?$/.exec(path); if (mm) { var med = D.meds.filter(function (m) { return m.id === +mm[1]; })[0]; if (!med) return { code: 404, body: { detail: "No Medicine matches the given query." } };
    if (mm[2] && method === "POST") { var dl = +b.delta; if (!isFinite(dl) || dl === 0 || Math.floor(dl) !== dl) return bad({ delta: ["delta must not be 0"] }); if (med.stock + dl < 0) return bad({ detail: "stock cannot go below 0", stock: med.stock }); med.stock += dl; D.moves.push({ id: ++D.seqMv, medicine: med.id, delta: dl, stock_after: med.stock, reason: b.reason || "adjust", note: b.note || "", created_by: me.id, created_at: pvdIso(Date.now()) }); return { code: 200, body: pvdMedOut(D, med) }; }
    if (method === "GET") return { code: 200, body: pvdMedOut(D, med) }; if (method === "DELETE") { if (!staff) return forbid; D.meds = D.meds.filter(function (m) { return m !== med; }); D.moves = D.moves.filter(function (x) { return x.medicine !== med.id; }); return { code: 204, body: null }; }
    if (method === "PATCH") { ["name", "unit", "reorder_level", "price"].forEach(function (k) { if (b[k] !== undefined) med[k] = k === "price" ? Number(b[k]).toFixed(2) : b[k]; }); return { code: 200, body: pvdMedOut(D, med) }; } }
  if (path === "/api/users" || /^\/api\/users\/\d+$/.test(path)) {
    if (!admin) return forbid; var um = /\/(\d+)$/.exec(path), tu = um && D.users.filter(function (x) { return x.id === +um[1]; })[0];
    if (!um && method === "GET") return { code: 200, body: D.users.filter(function (x) { return !Q.q || x.username.indexOf(Q.q) >= 0; }).sort(function (a, c3) { return a.username < c3.username ? -1 : 1; }).map(pvdUserOut) };
    if (!um && method === "POST") { if (!b.username) return bad({ username: ["This field is required."] }); if (D.users.some(function (x) { return x.username === b.username; })) return bad({ username: ["A user with that username already exists."] }); if (!b.password || b.password.length < 10) return bad({ password: ["This password is too short. It must contain at least 10 characters."] }); var nu = { id: ++D.seqU, username: b.username, first_name: b.first_name || "", last_name: b.last_name || "", email: b.email || "", role: b.role || "clerk", is_active: true, last_login: null, date_joined: pvdIso(Date.now()) }; D.users.push(nu); return { code: 201, body: pvdUserOut(nu) }; }
    if (!tu) return { code: 404, body: { detail: "No User matches the given query." } };
    var lastAdmin = tu.role === "admin" && tu.is_active && !D.users.some(function (x) { return x !== tu && x.role === "admin" && x.is_active; });
    if (method === "GET") return { code: 200, body: pvdUserOut(tu) };
    if (method === "DELETE") { if (tu.id === me.id) return bad({ detail: "cannot delete yourself" }); if (lastAdmin) return bad({ detail: "at least one active admin is required" }); D.users = D.users.filter(function (x) { return x !== tu; }); return { code: 204, body: null }; }
    if (method === "PATCH") { var dem = (b.role && b.role !== "admin" && tu.role === "admin") || b.is_active === false; if (dem && tu.id === me.id) return bad({ detail: "cannot demote or deactivate yourself" }); if (dem && lastAdmin) return bad({ detail: "at least one active admin is required" }); ["first_name", "last_name", "email", "role", "is_active"].forEach(function (k) { if (b[k] !== undefined) tu[k] = b[k]; }); if (b.password) { if (b.password.length < 10) return bad({ password: ["This password is too short. It must contain at least 10 characters."] }); Object.keys(D.tokens).forEach(function (k) { if (D.tokens[k] === tu.id) delete D.tokens[k]; }); } if (b.is_active === false) Object.keys(D.tokens).forEach(function (k) { if (D.tokens[k] === tu.id) delete D.tokens[k]; }); return { code: 200, body: pvdUserOut(tu) }; }
  }
  return { code: 404, body: { detail: "Not found." } };
}
