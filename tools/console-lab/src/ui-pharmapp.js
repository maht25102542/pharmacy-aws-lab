// ===== เว็บ Pharmacy Stock (หน้าตาแอปจริงของร้านยา) ใช้ร่วมกันทุก use case ที่เปิดเว็บ: main lab (มี login) · ECS · Express · App Runner · เครื่องเดียว =====
// ข้อมูลมาจาก phApi (เลียนแบบ Django REST ของ repo-backend) แยกตาม env · ธีมสว่างเสมอ (เป็นหน้าเว็บในเบราว์เซอร์จำลอง ไม่ตามธีมของคอนโซล)
function pharmApp(cfg) {
  var env = cfg.env, P = W.ph = W.ph || { msg: "", err: false, hits: 0, auth: {}, view: "stock", page: 1, mpage: 1, low: false }, F = W.f, replicas = cfg.replicas || 1, up = cfg.up !== false, authed = !cfg.login || !!P.auth[env];
  var d = function (cls, kids, at) { return h("div", Object.assign({ cls: cls }, at || {}), kids || []); }, sp = function (cls, text) { return h("span", { cls: cls, text: text }); };
  function call(method, path, body) {
    P.hits++; var r = phApi(env, method, path, body, up, cfg.login ? P.auth[env] : true); r.pod = cfg.pod || ("backend-" + hash32(env + "be").slice(0, 9) + "-" + hash32("pod" + (P.hits % replicas)).slice(0, 5)); P.pod = r.pod;
    if (r.code === 401 && cfg.login && path !== "/api/auth/login") P.auth[env] = false; if (r.body && r.body.served_by === "") r.body.served_by = r.pod; return r;
  }
  function act(fn) { return function () { var r = fn(); P.msg = r.code >= 400 ? (r.body && (r.body.detail || Object.keys(r.body).map(function (k) { return k + ": " + [].concat(r.body[k]).join(", "); }).join(" · "))) || "error " + r.code : r.okMsg || ""; P.err = r.code >= 400; render(); }; }
  var btn = function (l, fn, cls) { return h("button", { type: "button", cls: "pa-btn " + (cls || ""), text: l, onclick: fn }); };
  var envPill = sp("pa-env " + (env === "dev" ? "dev" : "prd"), env === "single-vm" ? "SINGLE VM" : env.toUpperCase());
  var money = function (n) { return "฿" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var foot = function () { var chips = (cfg.foot || []).concat(P.pod && !cfg.pod ? [["ตอบโดย pod", P.pod]] : []); return chips.length ? d("pa-foot", chips.map(function (c) { return h("span", { cls: "pa-chip" }, [h("i", { text: c[0] }), String(c[1])]); })) : h("span"); };
  var brand = d("pa-brand", [d("pa-logo", [], { text: "Rx" }), h("b", { text: "Pharmacy Stock" })]);
  if (!authed) {
    if (F.lu == null) F.lu = "admin"; if (F.lp == null) F.lp = "";
    return d("pa", [d("pa-login", [
      d("pa-lhero", [d("pa-logo big", [], { text: "Rx" }), h("h1", { text: "Pharmacy Stock" }), h("p", { text: "ระบบจัดการสต็อกยาสำหรับร้านยา" }), h("ul", {}, [h("li", { text: "ดูยาคงเหลือและยาใกล้หมดทันที" }), h("li", { text: "บันทึกการรับ-จ่ายยาทุกครั้ง" }), h("li", { text: "แยกข้อมูล dev / prd ชัดเจน" })]), sp("pa-chip light", env.toUpperCase() + " · Next.js + Django REST")]),
      d("pa-lform", [h("h2", { text: "เข้าสู่ระบบ" }), h("p", { cls: "pa-sub", text: "ใช้บัญชีแอดมินของระบบ" }), wbEx("ชื่อผู้ใช้", "lu", ["admin"], "ชื่อผู้ใช้"), wbEx("รหัสผ่าน", "lp", [phAdminPw(), "wrong-password"], "รหัสผ่าน"),
        btn("เข้าสู่ระบบ", act(function () { var r = call("POST", "/api/auth/login", { username: F.lu, password: F.lp }); if (r.code === 200) { P.auth[env] = true; F.lp = ""; r.okMsg = ""; } return r; }), "pri full"),
        d("pa-msg " + (P.err ? "err" : "ok"), [], { text: P.err ? P.msg : "", role: "status" }), h("p", { cls: "pa-hint", text: "รหัสแอดมินคือ django_admin_password ใน ansible/group_vars/all/main.yml (Secret app-secrets) · ล็อกอินผิดหลายครั้งใน 1 นาที backend จะตอบ 429" })])])]);
  }
  var tab = function (id, label) { return h("a", { href: "#", cls: "pa-tab" + (P.view === id ? " on" : ""), text: label, onclick: function (e) { e.preventDefault(); P.view = id; render(); } }); };
  var top = d("pa-top", [brand, d("pa-tabs", [tab("stock", "สต็อกยา"), tab("moves", "ประวัติการเคลื่อนไหว")]), sp("pa-sp"), envPill, cfg.login ? d("pa-user", [sp("pa-ava", "A"), sp("", "admin"), btn("ออกจากระบบ", function () { P.auth[env] = false; P.msg = ""; render(); }, "ghost")]) : d("pa-user", [sp("pa-ava", "A"), sp("", "admin")])]);
  var msg = d("pa-msg " + (P.err ? "err" : "ok"), [], { text: P.msg, role: "status" });
  if (P.view === "moves") {
    var mv = call("GET", "/api/movements?page=" + P.mpage), mpages = mv.code === 200 ? Math.max(1, Math.ceil(mv.body.count / PH_PAGE)) : 1;
    var mrows = mv.code !== 200 ? [h("tr", {}, [h("td", { colspan: "6", cls: "pa-bad", text: (mv.body && mv.body.detail) || "error" })])] : mv.body.results.map(function (x) { return h("tr", {}, [h("td", {}, [h("b", { text: x.medicine_name }), h("div", { cls: "pa-mono", text: x.medicine_sku })]), h("td", { text: x.reason }), h("td", { cls: "r" }, [sp("pa-delta " + (x.delta > 0 ? "up" : "down"), (x.delta > 0 ? "+" : "") + x.delta)]), h("td", { cls: "r", text: String(x.stock_after) }), h("td", { text: x.created_by_name }), h("td", { cls: "pa-sub", text: x.note })]); });
    if (mv.code === 200 && !mrows.length) mrows = [h("tr", {}, [h("td", { colspan: "6", cls: "pa-empty", text: "ยังไม่มีประวัติ: กด รับเข้า/จ่ายออก ที่หน้าสต็อกยาแล้วจะมาแสดงที่นี่" })])];
    return d("pa", [top, d("pa-body", [d("pa-head", [h("div", {}, [h("h2", { text: "ประวัติการเคลื่อนไหวของสต็อก" }), h("p", { cls: "pa-sub", text: "ทุกการรับเข้า/จ่ายออกถูกบันทึกไว้ตรวจย้อนหลัง" })])]), msg,
      d("pa-card", [h("table", { cls: "pa-table" }, [h("thead", {}, [h("tr", {}, ["ยา", "เหตุผล", "เปลี่ยน", "คงเหลือ", "โดย", "หมายเหตุ"].map(function (t, i) { return h("th", { cls: i === 2 || i === 3 ? "r" : "", text: t }); }))]), h("tbody", {}, mrows)])]),
      d("pa-pager", [sp("pa-sub", mv.code === 200 ? mv.body.count + " รายการ · หน้า " + P.mpage + "/" + mpages : ""), btn("ก่อนหน้า", function () { if (P.mpage > 1) { P.mpage--; render(); } }), btn("ถัดไป", function () { if (P.mpage < mpages) { P.mpage++; render(); } })])]), foot()]);
  }
  if (F.sq == null) F.sq = "";
  var sum = call("GET", "/api/summary"), list = call("GET", "/api/medicines?page=" + P.page + (F.sq ? "&q=" + encodeURIComponent(F.sq) : "") + (P.low ? "&low_stock=1" : ""));
  if (cfg.login && !P.auth[env]) { P.msg = "session หมดอายุ: ล็อกอินใหม่"; P.err = true; return pharmApp(cfg); }
  var pages = list.code === 200 ? Math.max(1, Math.ceil(list.body.count / PH_PAGE)) : 1;
  var kpi = sum.code === 200 ? d("pa-kpis", [["💊", "รายการยาที่ใช้งาน", sum.body.medicines, "teal"], ["⚠️", "ใกล้หมด / ต้องสั่งเพิ่ม", sum.body.low_stock, "amber"], ["⛔", "หมดสต็อก", sum.body.out_of_stock, "red"], ["💰", "มูลค่าสต็อกรวม", money(sum.body.stock_value), "blue"]].map(function (c) { return d("pa-kpi " + c[3], [sp("ic", c[0]), d("v", [], { text: String(c[2]) }), d("l", [], { text: c[1] })]); })) : d("pa-msg err", [], { text: "โหลดตัวเลขสรุปไม่ได้ (backend ไม่ตอบ): " + ((sum.body && sum.body.detail) || "error " + sum.code) });
  var rows = list.code !== 200 ? [h("tr", {}, [h("td", { colspan: "6", cls: "pa-bad", text: (list.body && list.body.detail) || "error" })])] : list.body.results.map(function (m) {
    var st = m.stock === 0 ? ["หมด", "red"] : m.stock <= m.reorder_level ? ["ใกล้หมด", "amber"] : ["ปกติ", "green"], pct = Math.max(3, Math.min(100, Math.round(m.stock / Math.max(1, m.reorder_level * 3) * 100)));
    return h("tr", {}, [h("td", {}, [h("b", { text: m.name }), h("div", { cls: "pa-meta" }, [sp("pa-mono", m.sku), m.category_name ? sp("pa-tag", m.category_name) : null])]), h("td", { cls: "r", text: money(m.price) }),
      h("td", { cls: "r" }, [h("b", { text: String(m.stock) }), " " + m.unit, d("pa-bar " + st[1], [h("i", { style: "width:" + pct + "%" })])]), h("td", {}, [sp("pa-st " + st[1], st[0])]),
      h("td", { cls: "r" }, [d("pa-acts", [btn("＋ รับเข้า", function () { P.adj = { id: m.id, sign: 1 }; F.aq = ""; render(); }, "sm in"), btn("－ จ่ายออก", function () { P.adj = { id: m.id, sign: -1 }; F.aq = ""; render(); }, "sm out"), btn("ลบ", act(function () { var r = call("DELETE", "/api/medicines/" + m.id); r.okMsg = "ลบ " + m.name + " แล้ว"; if (P.adj && P.adj.id === m.id) P.adj = null; return r; }), "sm ghost")])])]);
  });
  if (list.code === 200 && !rows.length) rows = [h("tr", {}, [h("td", { colspan: "5", cls: "pa-empty", text: "ไม่พบรายการ" + (env === "prd" ? " · กด “+ เพิ่มยา” เพื่อเพิ่มรายการแรก" : "") })])];
  var am = P.adj && list.code === 200 ? list.body.results.filter(function (x) { return x.id === P.adj.id; })[0] : null, adjPanel = null;
  if (am) { if (F.ar2 == null) F.ar2 = P.adj.sign > 0 ? "receive" : "dispense"; if (F.an2 == null) F.an2 = ""; adjPanel = d("pa-panel", [h("b", { text: (P.adj.sign > 0 ? "รับเข้า" : "จ่ายออก") + ": " + am.name }), sp("pa-sub", "  คงเหลือ " + am.stock + " " + am.unit), d("pa-row", [wbEx("จำนวน", "aq", ["1", "5", "10", "50", "9999"], "จำนวน"), wbEx("เหตุผล", "ar2", PH_REASONS, "เหตุผล"), wbEx("หมายเหตุ", "an2", ["PO-1001", "ใบสั่งยา #25"], "หมายเหตุ")]),
    d("pa-row", [btn("บันทึก", act(function () { if (!/^\d+$/.test(String(F.aq).trim()) || Number(F.aq) <= 0) return { code: 400, body: { detail: "จำนวนต้องเป็นเลขจำนวนเต็มมากกว่า 0" } }; var r = call("POST", "/api/medicines/" + am.id + "/adjust", { delta: Number(F.aq) * P.adj.sign, reason: F.ar2, note: F.an2 }); if (r.code === 200) { r.okMsg = "บันทึกแล้ว คงเหลือ " + r.body.stock; P.adj = null; F.aq = ""; F.an2 = null; F.ar2 = null; } return r; }), "pri"), btn("ยกเลิก", function () { P.adj = null; render(); })])]); }
  if (F.as == null) { F.as = ""; F.an = ""; F.ap = "0"; F.ar = "10"; }
  var addPanel = P.addOpen ? d("pa-panel", [h("b", { text: "เพิ่มยาใหม่" }), d("pa-row", [wbEx("รหัส (SKU)", "as", ["VITC1000", "AMX250"], "SKU"), wbEx("ชื่อยา", "an", ["Vitamin C 1000 mg", "Amoxicillin 250 mg"], "ชื่อยา"), wbEx("ราคา (บาท)", "ap", ["0", "25", "99.50"], "ราคา"), wbEx("จุดสั่งซื้อ", "ar", ["10", "20", "50"], "จุดสั่งซื้อ")]),
    d("pa-row", [btn("บันทึกรายการ", act(function () { var r = call("POST", "/api/medicines", { sku: F.as, name: F.an, price: F.ap, reorder_level: F.ar === "" || isNaN(Number(F.ar)) ? null : Number(F.ar) }); if (r.code === 201) { r.okMsg = "เพิ่มแล้ว (จำนวนเริ่มต้น 0: กด รับเข้า เพื่อให้มีประวัติ)"; F.as = ""; F.an = ""; F.ap = "0"; F.ar = "10"; P.addOpen = false; } return r; }), "pri"), btn("ปิด", function () { P.addOpen = false; render(); })])]) : null;
  return d("pa", [top, d("pa-body", [d("pa-head", [h("div", {}, [h("h2", { text: "สต็อกยา" }), h("p", { cls: "pa-sub", text: "ติดตามยาคงเหลือ ราคา และสถานะแบบเรียลไทม์" + (sum.code === 200 && sum.body.served_by ? " · backend: " + sum.body.served_by : "") })]), btn("＋ เพิ่มยา", function () { P.addOpen = !P.addOpen; render(); }, "pri")]), msg, kpi, addPanel || h("span"),
    d("pa-card", [d("pa-tools", [wbEx("ค้นหา (ชื่อหรือรหัส)", "sq", ["para", "ibu", "ORS"], "ค้นหา"), h("label", { cls: "pa-check" }, [h("input", { type: "checkbox", checked: P.low, onchange: function (e) { P.low = e.target.checked; P.page = 1; render(); } }), " เฉพาะใกล้หมด"]), btn("ค้นหา", function () { P.page = 1; render(); }, "pri")]), adjPanel || h("span"),
      h("table", { cls: "pa-table" }, [h("thead", {}, [h("tr", {}, ["ยา", "ราคา", "คงเหลือ", "สถานะ", ""].map(function (t, i) { return h("th", { cls: i === 1 || i === 2 ? "r" : "", text: t }); }))]), h("tbody", {}, rows)])]),
    d("pa-pager", [sp("pa-sub", list.code === 200 ? list.body.count + " รายการ · หน้า " + P.page + "/" + pages : ""), btn("ก่อนหน้า", function () { if (P.page > 1) { P.page--; render(); } }), btn("ถัดไป", function () { if (P.page < pages) { P.page++; render(); } })])]), foot()]);
}
// main lab: เว็บผ่าน ALB → Next.js (frontend) → Django (backend) บน k3s · dev = :8080, prd = :80
function wbPharmacy(res) {
  var env = /:8080/.test(W.addr) ? "dev" : "prd", be = argoStatus("pharmacy-backend-" + env), fe = argoStatus("pharmacy-frontend-" + env), tag = function (st) { return st && st.live ? st.live.split(":").pop() : "-"; }, replicas = env === "prd" ? 3 : 1;
  return h("div", { cls: "pa-wrap" }, [pharmApp({ env: env, login: true, up: phDbUp(), replicas: replicas, foot: [["Frontend", tag(fe)], ["Backend", tag(be)], ["env", env], ["replicas", String(replicas)]] }), h("p", { cls: "sub", style: "margin:10px 2px 0", text: "จำลองตาม repo-backend (Django REST) + repo-frontend (Next.js) · ข้อมูลแยกตาม env: dev ใช้ DB pharmacy_dev, prd ใช้ DB pharmacy_prd" + (replicas > 1 ? " · กดซ้ำจะเห็นชื่อ pod ที่ตอบสลับกัน (prd มี 3 replica)" : "") })]);
}
// use case อื่น (ECS / Express / App Runner / เครื่องเดียว): path "/" = หน้าเว็บ · /healthz และ /api/* ยังเป็น JSON
function pharmBody(json) {
  var foot = Object.keys(json || {}).filter(function (k) { return k !== "service" && k !== "env"; }).map(function (k) { return [k, String(json[k])]; });
  return pharmApp({ env: String(json && json.env || "prd"), login: false, up: true, pod: json && (json.task ? "task-" + json.task : json.served_by) || "", foot: foot });
}
