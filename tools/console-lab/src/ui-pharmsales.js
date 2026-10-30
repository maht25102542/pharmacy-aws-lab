// ===== Preview: ขายหน้าร้าน / ล็อตยา / ใบเสร็จ / รายงาน ของเว็บร้านยาจำลอง (กฎเดียวกับ backend จริง: stock/services.py, sales.py) =====
var PVD_TODAY = "2026-10-29";
function pvdNowIso() { var d = new Date(); return PVD_TODAY + "T" + pvdPad(d.getHours()) + ":" + pvdPad(d.getMinutes()) + ":" + pvdPad(d.getSeconds()); }
function pvdAddDays(iso, n) { var p = iso.split("-"), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.getUTCFullYear() + "-" + pvdPad(d.getUTCMonth() + 1) + "-" + pvdPad(d.getUTCDate()); }
function pvdDiffDays(a, b) { var f = function (s) { var p = s.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }; return Math.round((f(a) - f(b)) / 86400000); }
function pvdMoney(n) { return (Math.round(n * 100) / 100).toFixed(2); }

function pvdSalesInit(D, R) {
  D.v = 3; D.batches = []; D.sales = []; D.seqB = 0; D.seqS = 0; D.seqSI = 0;
  var fixed = { IBU400: 12, LRT10: 25, CTZ10: -6 };
  D.meds.forEach(function (m) { if (m.stock > 0) { D.batches.push({ id: ++D.seqB, medicine: m.id, lot_no: "L" + m.sku.slice(0, 3) + "2026A", expiry_date: pvdAddDays(PVD_TODAY, fixed[m.sku] !== undefined ? fixed[m.sku] : 120 + Math.floor(R() * 580)), qty_received: m.stock, qty_remaining: m.stock, cost: pvdMoney(Number(m.price) * .7), received_at: "2026-08-20T10:00:00" }); } });
  var pool = D.meds.filter(function (m) { return m.stock >= 40; }), nos = {};
  for (var back = 13; back >= 0; back--) {
    var n = 3 + Math.floor(R() * 4);
    for (var k = 0; k < n; k++) {
      var picks = [], cnt = 1 + Math.floor(R() * 3); while (picks.length < cnt) { var pm = pool[Math.floor(R() * pool.length)]; if (picks.indexOf(pm) < 0) picks.push(pm); }
      var day = pvdAddDays(PVD_TODAY, -back), at = day + "T" + pvdPad(9 + Math.floor(R() * 9)) + ":" + pvdPad(Math.floor(R() * 60)) + ":00";
      var r = pvdCreateSale(D, { id: [1, 4, 5][Math.floor(R() * 3)] }, { items: picks.map(function (p) { return { medicine: p.id, qty: 1 + Math.floor(R() * 3) }; }), payment: ["cash", "cash", "transfer", "card"][Math.floor(R() * 4)] }, { at: at, day: day, seed: true, nos: nos });
      if (r.sale && R() < .04) { r.sale.status = "void"; r.sale.voided_by = 1; r.sale.voided_at = at; r.sale.void_reason = "ลูกค้าเปลี่ยนใจ"; }
    }
  }
  pvdPurchInit(D);
}
function pvdSellable(D, med) {
  var exp = D.batches.filter(function (b) { return b.medicine === med.id && b.expiry_date < PVD_TODAY; }).reduce(function (s, b) { return s + b.qty_remaining; }, 0);
  return Math.max(0, med.stock - exp);
}
function pvdConsume(D, med, qty, incExpired) {
  var left = qty, used = [];
  D.batches.filter(function (b) { return b.medicine === med.id && b.qty_remaining > 0; }).sort(function (a, c) { return a.expiry_date < c.expiry_date ? -1 : a.expiry_date > c.expiry_date ? 1 : a.id - c.id; }).forEach(function (b) {
    if (left <= 0 || (b.expiry_date < PVD_TODAY && !incExpired)) return; var take = Math.min(b.qty_remaining, left); b.qty_remaining -= take; used.push({ batch: b.id, qty: take }); left -= take;
  });
  return used;
}
// opt.seed = ข้อมูลเริ่มต้น (ไม่ตัดสต็อก/ไม่เขียน movement เพราะ stock ถูกคำนวณไว้แล้ว)
function pvdCreateSale(D, me, b, opt) {
  opt = opt || {}; var items = b.items;
  if (!items || !items.length) return { err: { code: 400, body: { items: ["This list may not be empty."] } } };
  if (items.length > 50) return { err: { code: 400, body: { items: ["Ensure this field has no more than 50 elements."] } } };
  var merged = {}, order = [];
  for (var i = 0; i < items.length; i++) { var q = +items[i].qty, id = +items[i].medicine; if (!isFinite(q) || q < 1 || Math.floor(q) !== q) return { err: { code: 400, body: { items: [{ qty: ["Ensure this value is greater than or equal to 1."] }] } } }; if (q > 9999) return { err: { code: 400, body: { items: [{ qty: ["Ensure this value is less than or equal to 9999."] }] } } }; if (merged[id] === undefined) { merged[id] = 0; order.push(id); } merged[id] += q; }
  var payment = b.payment || "cash"; if (["cash", "transfer", "card"].indexOf(payment) < 0) return { err: { code: 400, body: { payment: ["\"" + payment + "\" is not a valid choice."] } } };
  var lines = [], sub = 0;
  for (var j = 0; j < order.length; j++) {
    var med = D.meds.filter(function (m) { return m.id === order[j]; })[0];
    if (!med || !med.is_active) return { err: { code: 400, body: { detail: "medicine not available", medicine: order[j] } } };
    if (!opt.seed && pvdSellable(D, med) < merged[order[j]]) return { err: { code: 400, body: { detail: "not enough stock", medicine: med.id, name: med.name, available: pvdSellable(D, med) } } };
    var line = Math.round(Number(med.price) * merged[order[j]] * 100) / 100; lines.push([med, merged[order[j]], line]); sub += line;
  }
  var disc = Number(b.discount || 0); if (!isFinite(disc) || disc < 0 || disc > sub) return { err: { code: 400, body: { detail: "discount must be between 0 and the subtotal" } } };
  var total = Math.round((sub - disc) * 100) / 100, paid = payment !== "cash" || b.paid === undefined || b.paid === null || b.paid === "" ? total : Number(b.paid);
  if (!isFinite(paid) || paid < total) return { err: { code: 400, body: { detail: "paid is less than total", total: pvdMoney(total) } } };
  var day = opt.day || PVD_TODAY, nos = opt.nos || null, ymd = day.replace(/-/g, "");
  var n = D.sales.filter(function (s) { return s.receipt_no.indexOf("RC-" + ymd + "-") === 0; }).length + 1;
  var sale = { id: ++D.seqS, receipt_no: "RC-" + ymd + "-" + ("000" + n).slice(-4), customer_name: b.customer_name || "", payment: payment, subtotal: pvdMoney(sub), discount: pvdMoney(disc), total: pvdMoney(total), paid: pvdMoney(paid), change: pvdMoney(paid - total), status: "completed", note: b.note || "", created_by: me.id, created_at: opt.at || pvdNowIso(), voided_by: null, voided_at: null, void_reason: "", items: [] };
  lines.forEach(function (l) {
    var med = l[0], used = opt.seed ? [] : pvdConsume(D, med, l[1]);
    sale.items.push({ id: ++D.seqSI, medicine: med.id, sku: med.sku, name: med.name, unit_price: med.price, qty: l[1], line_total: pvdMoney(l[2]), lots: used });
    if (!opt.seed) { med.stock -= l[1]; D.moves.push({ id: ++D.seqMv, medicine: med.id, delta: -l[1], stock_after: med.stock, reason: "dispense", note: sale.receipt_no, created_by: me.id, created_at: sale.created_at }); }
  });
  D.sales.push(sale); return { sale: sale };
}
function pvdVoidSale(D, me, sale, reason) {
  sale.items.forEach(function (it) {
    var med = D.meds.filter(function (m) { return m.id === it.medicine; })[0]; if (!med) return;
    it.lots.forEach(function (u) { var b = D.batches.filter(function (x) { return x.id === u.batch; })[0]; if (b) b.qty_remaining += u.qty; });
    med.stock += it.qty; D.moves.push({ id: ++D.seqMv, medicine: med.id, delta: it.qty, stock_after: med.stock, reason: "adjust", note: "void " + sale.receipt_no, created_by: me.id, created_at: pvdNowIso() });
  });
  sale.status = "void"; sale.voided_by = me.id; sale.voided_at = pvdNowIso(); sale.void_reason = reason || "";
}
function pvdSaleOut(D, s) {
  var u = function (id) { var x = D.users.filter(function (y) { return y.id === id; })[0]; return x ? x.username : null; };
  return { id: s.id, receipt_no: s.receipt_no, customer_name: s.customer_name, payment: s.payment, subtotal: s.subtotal, discount: s.discount, total: s.total, paid: s.paid, change: s.change, status: s.status, note: s.note, created_by_name: u(s.created_by), created_at: s.created_at, voided_by_name: s.voided_by ? u(s.voided_by) : null, voided_at: s.voided_at, void_reason: s.void_reason, items: s.items.map(function (i) { return { id: i.id, medicine: i.medicine, sku: i.sku, name: i.name, unit_price: i.unit_price, qty: i.qty, line_total: i.line_total }; }) };
}
function pvdBatchOut(D, b) { var m = D.meds.filter(function (x) { return x.id === b.medicine; })[0]; return { id: b.id, medicine: b.medicine, medicine_sku: m ? m.sku : "", medicine_name: m ? m.name : "", lot_no: b.lot_no, expiry_date: b.expiry_date, qty_received: b.qty_received, qty_remaining: b.qty_remaining, cost: b.cost, received_at: b.received_at }; }
function pvdSummaryExtra(D) {
  var live = D.batches.filter(function (b) { return b.qty_remaining > 0; }), td = D.sales.filter(function (s) { return s.status === "completed" && s.created_at.slice(0, 10) === PVD_TODAY; });
  return { sales_today: { count: td.length, total: pvdMoney(td.reduce(function (s, x) { return s + Number(x.total); }, 0)) }, expiring_30: live.filter(function (b) { return b.expiry_date >= PVD_TODAY && b.expiry_date <= pvdAddDays(PVD_TODAY, 30); }).length, expired: live.filter(function (b) { return b.expiry_date < PVD_TODAY; }).length, open_orders: D.pos.filter(function (p) { return p.status === "ordered" || p.status === "partial"; }).length };
}
// คืน null ถ้า path นี้ไม่ใช่ของระบบขาย
function pvdSalesApi(D, method, path, Q, b, me, staff) {
  var px = pvdPurchApi(D, method, path, Q, b, me, staff); if (px) return px;
  var forbid = { code: 403, body: { detail: "You do not have permission to perform this action." } };
  if (path === "/api/sales" && method === "POST") { var r = pvdCreateSale(D, me, b); return r.err || { code: 201, body: pvdSaleOut(D, r.sale) }; }
  if (path === "/api/sales" && method === "GET") {
    var q = (Q.q || "").toLowerCase(), l = D.sales.filter(function (s) { var d = s.created_at.slice(0, 10); return (!q || s.receipt_no.toLowerCase().indexOf(q) >= 0 || s.customer_name.toLowerCase().indexOf(q) >= 0) && (!/^\d{4}-\d\d-\d\d$/.test(Q.date_from || "") || d >= Q.date_from) && (!/^\d{4}-\d\d-\d\d$/.test(Q.date_to || "") || d <= Q.date_to) && (!Q.status || s.status === Q.status); }).sort(function (a, c) { return a.created_at < c.created_at ? 1 : a.created_at > c.created_at ? -1 : c.id - a.id; }).map(function (s) { return pvdSaleOut(D, s); });
    return pvdPage(l, Q);
  }
  var sm = /^\/api\/sales\/(\d+)(\/void)?$/.exec(path);
  if (sm) { var sale = D.sales.filter(function (s) { return s.id === +sm[1]; })[0]; if (!sale) return { code: 404, body: { detail: "No Sale matches the given query." } };
    if (sm[2] && method === "POST") { if (!staff) return forbid; if (sale.status === "void") return { code: 400, body: { detail: "sale already void" } }; pvdVoidSale(D, me, sale, b.reason); return { code: 200, body: pvdSaleOut(D, sale) }; }
    if (!sm[2] && method === "GET") return { code: 200, body: pvdSaleOut(D, sale) }; }
  if (path === "/api/reports/sales" && method === "GET") {
    if (!staff) return forbid; var days = Math.min(90, Math.max(1, parseInt(Q.days || "14", 10) || 14)), start = pvdAddDays(PVD_TODAY, -(days - 1)), ok = D.sales.filter(function (s) { var d = s.created_at.slice(0, 10); return s.status === "completed" && d >= start && d <= PVD_TODAY; }), series = [];
    for (var i = 0; i < days; i++) { var d = pvdAddDays(start, i), ds = ok.filter(function (s) { return s.created_at.slice(0, 10) === d; }); series.push({ date: d, count: ds.length, total: pvdMoney(ds.reduce(function (a, x) { return a + Number(x.total); }, 0)) }); }
    var tot = ok.reduce(function (a, x) { return a + Number(x.total); }, 0), agg = {};
    ok.forEach(function (s) { s.items.forEach(function (it) { var a = agg[it.medicine] = agg[it.medicine] || { medicine: it.medicine, sku: it.sku, name: it.name, qty: 0, revenue: 0 }; a.qty += it.qty; a.revenue += Number(it.line_total); }); });
    var top = Object.keys(agg).map(function (k) { return agg[k]; }).sort(function (a, c) { return c.qty - a.qty || (a.name < c.name ? -1 : 1); }).slice(0, 5).map(function (a) { return { medicine: a.medicine, sku: a.sku, name: a.name, qty: a.qty, revenue: pvdMoney(a.revenue) }; });
    return { code: 200, body: { days: series, totals: { count: ok.length, total: pvdMoney(tot), average: pvdMoney(ok.length ? tot / ok.length : 0) }, top: top } };
  }
  if (path === "/api/reports/expiry" && method === "GET") {
    var dd = Math.min(730, Math.max(1, parseInt(Q.days || "90", 10) || 90)), rows = D.batches.filter(function (x) { return x.qty_remaining > 0 && x.expiry_date <= pvdAddDays(PVD_TODAY, dd); }).sort(function (a, c) { return a.expiry_date < c.expiry_date ? -1 : a.expiry_date > c.expiry_date ? 1 : a.id - c.id; }).map(function (x) { var o = pvdBatchOut(D, x); o.days_left = pvdDiffDays(x.expiry_date, PVD_TODAY); o.expired = x.expiry_date < PVD_TODAY; return o; });
    return { code: 200, body: { days: dd, count: rows.length, results: rows } };
  }
  if (path === "/api/batches" && method === "GET") return { code: 200, body: D.batches.filter(function (x) { return x.qty_remaining > 0 && (!Q.medicine || String(x.medicine) === Q.medicine); }).sort(function (a, c) { return a.expiry_date < c.expiry_date ? -1 : 1; }).slice(0, 200).map(function (x) { return pvdBatchOut(D, x); }) };
  return null;
}

// ---------- หน้าเว็บจำลอง (หน้าตาเดียวกับ repo-frontend: PosPanel, ReceiptsPanel, ReportsPanel) ----------
var PV_PAYL = { cash: "เงินสด", transfer: "โอนเงิน", card: "บัตร" };
function pvFeSales(me) {
  var F = PV.fe, C = F.cart = F.cart || [], P = F.pos = F.pos || { q: "", disc: "", pay: "cash", paid: "", cust: "", err: "" };
  var meds = pvFeApi("GET", "/api/medicines?page=1" + (P.q ? "&q=" + encodeURIComponent(P.q) : "")).body.results;
  var subtotal = C.reduce(function (s, l) { return s + Math.round(l.price * 100) * l.qty; }, 0) / 100, dN = P.disc === "" ? 0 : (/^\d+(\.\d{1,2})?$/.test(P.disc) ? Number(P.disc) : NaN), d = isNaN(dN) ? 0 : Math.min(Math.max(dN, 0), subtotal), total = Math.round((subtotal - d) * 100) / 100;
  var paidN = P.pay === "cash" ? (/^\d+(\.\d{1,2})?$/.test(P.paid.replace(/,/g, "")) ? Number(P.paid.replace(/,/g, "")) : NaN) : total, change = isNaN(paidN) ? NaN : Math.round((paidN - total) * 100) / 100;
  var canPay = C.length > 0 && !isNaN(dN) && (P.pay !== "cash" || (!isNaN(change) && change >= 0));
  var add = function (m) { var i = C.map(function (l) { return l.id; }).indexOf(m.id); if (m.stock <= 0) return; if (i < 0) C.push({ id: m.id, name: m.name, sku: m.sku, price: Number(m.price), qty: 1, max: m.stock }); else C[i].qty = Math.min(C[i].qty + 1, m.stock); render(); };
  var setq = function (l, q) { if (!isFinite(q) || q < 1) { F.cart = C.filter(function (x) { return x !== l; }); } else l.qty = Math.min(Math.floor(q), l.max); render(); };
  var left = h("div", { cls: "card flush" }, [h("div", { cls: "toolbar", style: "padding:16px 16px 0" }, [h("div", { style: "min-width:230px" }, [pvEx("ค้นหายา", P, "q", ["Para", "Amox", "Ibuprofen", "PCM500", "ASP81"], "ค้นหาชื่อหรือรหัสยา", "text", false, null, true)])]),
    h("table", {}, [h("thead", {}, [h("tr", {}, ["ยา", "ราคา", "คงเหลือ", ""].map(function (x, i) { return h("th", { cls: i === 1 || i === 2 ? "num" : "", text: x }); }))]), h("tbody", {}, meds.map(function (m) { return h("tr", {}, [h("td", {}, [m.name, h("div", { cls: "muted", text: m.sku })]), h("td", { cls: "num", text: pvBaht(m.price) }), h("td", { cls: "num", text: m.stock + " " + m.unit }), h("td", {}, [h("button", { type: "button", cls: "sm pri", disabled: m.stock === 0, "aria-label": "เพิ่ม " + m.name, text: m.stock === 0 ? "หมด" : "+ เพิ่ม", onclick: function () { add(m); } })])]); }))])]);
  var right = h("div", { cls: "card cart" }, [h("h2", { text: "ตะกร้า (" + C.reduce(function (s, l) { return s + l.qty; }, 0) + " ชิ้น)" }), C.length ? null : h("div", { cls: "empty", text: "เลือกยาจากรายการทางซ้าย" })].concat(C.map(function (l) {
    return h("div", { cls: "cartline" }, [h("div", { cls: "grow" }, [h("b", { text: l.name }), h("div", { cls: "muted", text: pvBaht(l.price) + " × " + l.qty + " = " + pvBaht(l.price * l.qty) })]), h("button", { type: "button", cls: "sm", "aria-label": "ลด " + l.name, text: "−", onclick: function () { setq(l, l.qty - 1); } }), h("input", { cls: "qty", value: String(l.qty), "aria-label": "จำนวน " + l.name, onchange: function (e) { setq(l, Number(e.target.value)); } }), h("button", { type: "button", cls: "sm", disabled: l.qty >= l.max, "aria-label": "เพิ่ม " + l.name, text: "+", onclick: function () { setq(l, l.qty + 1); } }), h("button", { type: "button", cls: "sm danger", "aria-label": "ลบ " + l.name, text: "✕", onclick: function () { F.cart = C.filter(function (x) { return x !== l; }); render(); } })]);
  }), [h("div", { cls: "form", style: "margin-top:14px" }, [pvEx("ชื่อลูกค้า (ถ้ามี)", P, "cust", ["คุณสมศรี", "คุณมานี", "คุณประเสริฐ"], "เช่น คุณสมศรี"), h("div", { cls: "grid2" }, [pvEx("ส่วนลด (บาท)", P, "disc", ["10", "20", "50"], "0"), h("label", {}, ["ชำระด้วย", h("select", { "aria-label": "วิธีชำระเงิน", onchange: function (e) { P.pay = e.target.value; render(); } }, Object.keys(PV_PAYL).map(function (k) { return h("option", { value: k, text: PV_PAYL[k], selected: P.pay === k ? "selected" : null }); }))])]), P.pay === "cash" ? pvEx("รับเงินมา (บาท)", P, "paid", [String(total), "100", "200", "500", "1000"], String(total)) : null].filter(Boolean)),
    h("dl", { cls: "rc-sum big" }, [h("dt", { text: "รวม" }), h("dd", { text: pvBaht(subtotal) })].concat(d > 0 ? [h("dt", { text: "ส่วนลด" }), h("dd", { text: "-" + pvBaht(d) })] : [], [h("dt", {}, [h("b", { text: "ยอดสุทธิ" })]), h("dd", {}, [h("b", { text: pvBaht(total) })])], P.pay === "cash" ? [h("dt", { text: "เงินทอน" }), h("dd", { style: change < 0 ? "color:var(--out)" : "", text: isNaN(change) ? "-" : pvBaht(change) })] : [])),
    P.err ? h("div", { cls: "err", role: "alert", text: P.err }) : null,
    h("button", { type: "button", cls: "pri", style: "width:100%;padding:12px", disabled: !canPay, text: "ชำระเงิน", onclick: function () {
      var r = pvFeApi("POST", "/api/sales", { items: C.map(function (l) { return { medicine: l.id, qty: l.qty }; }), payment: P.pay, paid: P.pay === "cash" ? P.paid.replace(/,/g, "") : undefined, discount: d, customer_name: P.cust });
      if (r.code >= 400) { P.err = r.body.detail || JSON.stringify(r.body); if (r.body.available !== undefined) P.err += " (" + r.body.name + " เหลือ " + r.body.available + ")"; render(); return; }
      P.err = ""; F.cart = []; P.disc = ""; P.paid = ""; P.cust = ""; F.modal = { t: "receipt", id: r.body.id, fresh: true }; render();
    } })].filter(Boolean)));
  return h("div", {}, [pvHead("ขายหน้าร้าน", "เลือกยา → คิดเงิน → ออกใบเสร็จ · สต็อกถูกตัดอัตโนมัติ (ล็อตที่หมดอายุก่อนออกก่อน)"), h("div", { cls: "pos" }, [left, right])]);
}
function pvReceiptBody(s) {
  return h("div", { cls: "receipt", id: "receipt" }, [h("div", { cls: "rc-head" }, [h("b", { text: "Pharmacy · ร้านยา" }), h("div", { cls: "muted", text: "ใบเสร็จรับเงิน" })]), h("div", { cls: "rc-meta" }, [h("span", {}, ["เลขที่ ", h("b", { text: s.receipt_no })]), h("span", { text: pvDt(s.created_at) }), h("span", { text: "พนักงาน: " + (s.created_by_name || "-") }), s.customer_name ? h("span", { text: "ลูกค้า: " + s.customer_name }) : null].filter(Boolean)),
    s.status === "void" ? h("div", { cls: "rc-void", text: "ยกเลิกแล้ว" + (s.void_reason ? ": " + s.void_reason : "") + " (โดย " + (s.voided_by_name || "-") + ")" }) : null,
    h("table", {}, [h("thead", {}, [h("tr", {}, ["รายการ", "ราคา", "จำนวน", "รวม"].map(function (x, i) { return h("th", { cls: i ? "num" : "", text: x }); }))]), h("tbody", {}, s.items.map(function (i) { return h("tr", {}, [h("td", {}, [i.name, h("div", { cls: "muted", text: i.sku })]), h("td", { cls: "num", text: pvBaht(i.unit_price) }), h("td", { cls: "num", text: String(i.qty) }), h("td", { cls: "num", text: pvBaht(i.line_total) })]); }))]),
    h("dl", { cls: "rc-sum" }, [h("dt", { text: "รวม" }), h("dd", { text: pvBaht(s.subtotal) })].concat(Number(s.discount) > 0 ? [h("dt", { text: "ส่วนลด" }), h("dd", { text: "-" + pvBaht(s.discount) })] : [], [h("dt", {}, [h("b", { text: "ยอดสุทธิ" })]), h("dd", {}, [h("b", { text: pvBaht(s.total) })]), h("dt", { text: "ชำระ (" + PV_PAYL[s.payment] + ")" }), h("dd", { text: pvBaht(s.paid) }), h("dt", { text: "เงินทอน" }), h("dd", { text: pvBaht(s.change) })])), h("div", { cls: "rc-foot muted", text: "ขอบคุณที่ใช้บริการ" })].filter(Boolean));
}
function pvReceiptModal(M) {
  var F = PV.fe, r = pvFeApi("GET", "/api/sales/" + M.id); if (r.code !== 200) { F.modal = null; return h("span"); } var s = r.body, me = pvFeMe(), close = function () { F.modal = null; render(); }; M.reason = M.reason || "";
  var bar = [h("button", { type: "button", cls: "pri", text: "พิมพ์", onclick: function () { flash("ok", "สั่งพิมพ์ใบเสร็จ (จำลอง)"); render(); } })];
  if (me.role !== "clerk" && s.status === "completed" && !M.fresh) bar.push(pvEx("เหตุผลที่ยกเลิก", M, "reason", ["ลูกค้าเปลี่ยนใจ", "ขายผิดรายการ", "คีย์ซ้ำ"], "เหตุผลที่ยกเลิก", "text", false, null, true), h("button", { type: "button", cls: "danger", text: "ยกเลิกบิล", onclick: function () { var v = pvFeApi("POST", "/api/sales/" + s.id + "/void", { reason: M.reason }); if (v.code >= 400) flash("bad", v.body.detail); render(); } }));
  bar.push(h("button", { type: "button", text: M.fresh ? "ปิด · ขายรายการต่อไป" : "ปิด", onclick: close }));
  return h("div", { cls: "modalbg", onclick: function (e) { if (e.target === e.currentTarget) close(); } }, [h("div", { cls: "modal" }, [pvReceiptBody(s), h("div", { cls: "toolbar noprint", style: "margin-top:14px" }, bar)])]);
}
function pvFeReceipts(me) {
  var F = PV.fe, R = F.rc = F.rc || { q: "", from: "", to: "", st: "", p: 1 };
  var qs = "?page=" + R.p + (R.q ? "&q=" + encodeURIComponent(R.q) : "") + (R.from ? "&date_from=" + R.from : "") + (R.to ? "&date_to=" + R.to : "") + (R.st ? "&status=" + R.st : ""), r = pvFeApi("GET", "/api/sales" + qs);
  if (r.code === 404) { R.p = 1; return pvFeReceipts(me); }
  var dateIn = function (k, label) { return h("label", {}, [label + " ", h("input", { type: "date", value: R[k], "aria-label": label, onchange: function (e) { R[k] = e.target.value; R.p = 1; render(); } })]); };
  return h("div", {}, [pvHead("ใบเสร็จ", "ประวัติการขายทั้งหมด · ยกเลิกบิลได้โดยเภสัชกร/ผู้ดูแล (คืนสต็อกให้)"), h("div", { cls: "card flush" }, [h("div", { cls: "toolbar", style: "padding:16px 16px 0" }, [h("div", { style: "min-width:230px" }, [pvEx("ค้นหาใบเสร็จ", R, "q", ["RC-2026102", "สมศรี"], "เลขใบเสร็จหรือชื่อลูกค้า", "text", false, function () { R.p = 1; }, true)]), dateIn("from", "ตั้งแต่"), dateIn("to", "ถึง"), h("select", { "aria-label": "สถานะ", onchange: function (e) { R.st = e.target.value; R.p = 1; render(); } }, [["", "ทุกสถานะ"], ["completed", "สำเร็จ"], ["void", "ยกเลิก"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: R.st === o[0] ? "selected" : null }); }))]),
    h("table", {}, [h("thead", {}, [h("tr", {}, ["เลขที่", "เวลา", "ลูกค้า", "ชำระ", "ยอดสุทธิ", "สถานะ", ""].map(function (x, i) { return h("th", { cls: i === 4 ? "num" : "", text: x }); }))]), h("tbody", {}, r.body.results.map(function (s) { return h("tr", {}, [h("td", {}, [h("b", { text: s.receipt_no })]), h("td", { cls: "muted", text: pvDt(s.created_at) }), h("td", { text: s.customer_name || "-" }), h("td", { text: PV_PAYL[s.payment] }), h("td", { cls: "num", text: pvBaht(s.total) }), h("td", {}, [h("span", { cls: "badge " + (s.status === "void" ? "out" : "ok"), text: s.status === "void" ? "ยกเลิก" : "สำเร็จ" })]), h("td", {}, [h("button", { type: "button", cls: "sm", text: "ดูใบเสร็จ", onclick: function () { F.modal = { t: "receipt", id: s.id }; render(); } })])]); }).concat(r.body.results.length ? [] : [h("tr", {}, [h("td", { colSpan: 7, cls: "empty", text: "ไม่พบใบเสร็จ" })])]))]), pvPager(r.body.count, R.p, function (p) { R.p = p; render(); })])]);
}
function pvFeReports(me, staff) {
  var F = PV.fe, Rp = F.rp = F.rp || { days: 14, exp: 90 }, rep = staff ? pvFeApi("GET", "/api/reports/sales?days=" + Rp.days).body : null, ex = pvFeApi("GET", "/api/reports/expiry?days=" + Rp.exp).body;
  var sel = function (key, opts, label) { return h("select", { "aria-label": label, onchange: function (e) { Rp[key] = Number(e.target.value); render(); } }, opts.map(function (o) { return h("option", { value: o[0], text: o[1], selected: Rp[key] === o[0] ? "selected" : null }); })); };
  var max = rep ? Math.max.apply(null, [1].concat(rep.days.map(function (d) { return Number(d.total); }))) : 1, stat = function (n, l) { return h("div", { cls: "card stat" }, [h("div", {}, [h("div", { cls: "n", text: n }), h("div", { cls: "l", text: l })])]); };
  var c1 = h("div", { cls: "card" }, [h("div", { cls: "toolbar" }, [h("h2", { style: "margin:0", text: "ยอดขายรายวัน" }), h("span", { cls: "sp" }), sel("days", [[7, "7 วัน"], [14, "14 วัน"], [30, "30 วัน"]], "ช่วงเวลา")])].concat(!rep ? [h("div", { cls: "empty", text: "รายงานยอดขายดูได้เฉพาะเภสัชกรและผู้ดูแลระบบ" })] : [
    h("div", { cls: "cards", style: "margin-bottom:12px" }, [stat(pvBaht(rep.totals.total), "ยอดขายรวม " + Rp.days + " วัน"), stat(String(rep.totals.count), "จำนวนบิล"), stat(pvBaht(rep.totals.average), "เฉลี่ยต่อบิล")]),
    h("div", { cls: "chart", role: "img", "aria-label": "กราฟยอดขายรายวัน" }, rep.days.map(function (d) { var p = d.date.split("-"); return h("div", { cls: "col", title: d.date + ": " + pvBaht(d.total) + " (" + d.count + " บิล)" }, [h("div", { cls: "barwrap" }, [h("i", { style: "height:" + (Number(d.total) / max * 100) + "%" })]), h("span", { text: Number(p[2]) + "/" + Number(p[1]) })]); })),
    h("h2", { style: "margin-top:20px", text: "ยาขายดี (จำนวนชิ้น)" }), h("table", {}, [h("thead", {}, [h("tr", {}, ["ยา", "ขายได้", "รายได้"].map(function (x, i) { return h("th", { cls: i ? "num" : "", text: x }); }))]), h("tbody", {}, rep.top.map(function (t) { return h("tr", {}, [h("td", {}, [t.name + " ", h("span", { cls: "muted", text: "(" + t.sku + ")" })]), h("td", { cls: "num", text: String(t.qty) }), h("td", { cls: "num", text: pvBaht(t.revenue) })]); }))])]));
  var c2 = h("div", { cls: "card flush" }, [h("div", { cls: "toolbar", style: "padding:16px 16px 0" }, [h("h2", { style: "margin:0", text: "ยาใกล้หมดอายุ / หมดอายุแล้ว" }), h("span", { cls: "sp" }), sel("exp", [[30, "ภายใน 30 วัน"], [90, "ภายใน 90 วัน"], [180, "ภายใน 180 วัน"]], "หมดอายุภายใน")]),
    h("table", {}, [h("thead", {}, [h("tr", {}, ["ยา", "ล็อต", "วันหมดอายุ", "คงเหลือ", "สถานะ"].map(function (x, i) { return h("th", { cls: i === 3 ? "num" : "", text: x }); }))]), h("tbody", {}, ex.results.map(function (r) { var st = r.days_left < 0 ? "out" : r.days_left <= 30 ? "low" : "ok"; return h("tr", {}, [h("td", {}, [r.medicine_name + " ", h("span", { cls: "muted", text: "(" + r.medicine_sku + ")" })]), h("td", { text: r.lot_no }), h("td", { text: r.expiry_date }), h("td", { cls: "num", text: String(r.qty_remaining) }), h("td", {}, [h("span", { cls: "badge " + st, text: r.days_left < 0 ? "หมดอายุแล้ว " + (-r.days_left) + " วัน" : "อีก " + r.days_left + " วัน" })])]); }).concat(ex.results.length ? [] : [h("tr", {}, [h("td", { colSpan: 5, cls: "empty", text: "ไม่มีล็อตที่ใกล้หมดอายุ 🎉" })])]))]),
    ex.results.some(function (r) { return r.expired; }) ? h("div", { cls: "notice bad", style: "margin:16px", text: "มีล็อตหมดอายุแล้ว: ขายไม่ได้ · ไปที่ สต็อกยา → จ่ายออก → เหตุผล \"หมดอายุ/ทิ้ง\" เพื่อตัดออกจากสต็อก" }) : null].filter(Boolean));
  return h("div", {}, [pvHead("รายงาน", "ยอดขาย ยาขายดี และยาที่ใกล้หมดอายุ"), c1, c2]);
}

// ตัวอย่าง request body / พารามิเตอร์ใน Swagger (dropdown ใน Try it out): ขายสำเร็จ + กรณีผิดพลาดที่ backend ตอบ 400
var PV_SALES_EX_DONE = false;
function pvSalesEx() {
  if (PV_SALES_EX_DONE) return; PV_SALES_EX_DONE = true;
  var J = function (o) { return JSON.stringify(o, null, 2); }, add = function (k, arr) { PV_BODY_EX[k] = (PV_BODY_EX[k] || []).concat(arr.map(function (x) { return typeof x === "string" ? x : J(x); })); };
  add("POST/api/sales", [
    { items: [{ medicine: 1, qty: 2 }], payment: "cash", paid: "100" },
    { items: [{ medicine: 1, qty: 3 }, { medicine: 3, qty: 1 }], payment: "transfer", customer_name: "คุณสมศรี" },
    { items: [{ medicine: 2, qty: 1 }], payment: "card", discount: 5 },
    { items: [{ medicine: 1, qty: 2 }], payment: "cash", paid: "200", discount: 10, customer_name: "คุณมานี", note: "ลูกค้าประจำ" },
    { items: [{ medicine: 1, qty: 5000 }], payment: "cash" },
    { items: [{ medicine: 1, qty: 1 }], payment: "cash", paid: "1" },
    { items: [], payment: "cash" },
    { items: [{ medicine: 1, qty: 1 }], payment: "bitcoin" }
  ]);
  add("POST/api/sales/{id}/void", [{ reason: "ลูกค้าเปลี่ยนใจ" }, { reason: "ขายผิดรายการ" }, { reason: "คีย์ซ้ำ" }, {}]);
  add("POST/api/categories", [{ name: "Vitamins" }, { name: "First aid" }, { name: "" }]);
  add("POST/api/medicines", [{ sku: "VIT500", name: "Vitamin C 500 mg", category: 1, unit: "box", price: "89.00", reorder_level: 15 }, { sku: "PCM500", name: "ซ้ำ SKU", price: "10" }, { sku: "BAD", name: "ราคาติดลบ", price: "-1" }, { sku: "", name: "" }]);
  add("PATCH/api/auth/me", [{ first_name: "สมชาย", last_name: "ใจดี" }, { email: "admin@pharmacy.local" }]);
  add("POST/api/auth/change-password", [{ old_password: "Pharmacy-Admin-2026!", new_password: "Another-Str0ng-Pass!" }, { old_password: "ผิด", new_password: "Another-Str0ng-Pass!" }, { old_password: "Pharmacy-Admin-2026!", new_password: "short" }]);
  PV_OPS.push(
    ["suppliers", "GET", "/api/suppliers", "รายการผู้จัดจำหน่าย", [["q", "ค้นหาชื่อ/ผู้ติดต่อ"], ["active", "เฉพาะที่ใช้งาน (1)"], ["page", "หน้า"]], null, true], ["suppliers", "POST", "/api/suppliers", "เพิ่มผู้จัดจำหน่าย (เภสัชกรขึ้นไป)", [], { name: "บริษัท เอเชียเมด จำกัด", contact_name: "คุณสมชาย", phone: "02-123-4567" }, true], ["suppliers", "PATCH", "/api/suppliers/{id}", "แก้ไข/ปิดใช้งาน", [["id", "id ผู้จัดจำหน่าย"]], { is_active: false }, true], ["suppliers", "DELETE", "/api/suppliers/{id}", "ลบ (ลบไม่ได้ถ้ามี PO)", [["id", "id ผู้จัดจำหน่าย"]], null, true],
    ["purchase-orders", "GET", "/api/purchase-orders", "รายการใบสั่งซื้อ", [["status", "draft | ordered | partial | received | cancelled"], ["supplier", "id ผู้จัดจำหน่าย"], ["q", "เลขที่ PO"], ["page", "หน้า"]], null, true], ["purchase-orders", "POST", "/api/purchase-orders", "สร้างใบสั่งซื้อ (สถานะร่าง · เภสัชกรขึ้นไป)", [], { supplier: 1, expected_date: "2026-11-05", items: [{ medicine: 1, qty: 50, unit_cost: "24.50" }] }, true], ["purchase-orders", "GET", "/api/purchase-orders/{id}", "รายละเอียด PO", [["id", "id ใบสั่งซื้อ"]], null, true], ["purchase-orders", "POST", "/api/purchase-orders/{id}/order", "สั่งซื้อ (ร่าง → สั่งแล้ว)", [["id", "id ใบสั่งซื้อ"]], null, true], ["purchase-orders", "POST", "/api/purchase-orders/{id}/receive", "รับของเข้าคลัง: เปิดล็อต เพิ่มสต็อก (รับบางส่วนได้)", [["id", "id ใบสั่งซื้อ"]], { items: [{ item: 1, qty: 10, lot_no: "L2610A", expiry_date: "2027-12-31" }] }, true], ["purchase-orders", "POST", "/api/purchase-orders/{id}/cancel", "ยกเลิก PO", [["id", "id ใบสั่งซื้อ"]], null, true], ["purchase-orders", "DELETE", "/api/purchase-orders/{id}", "ลบร่าง", [["id", "id ใบสั่งซื้อ"]], null, true], ["purchase-orders", "GET", "/api/reorder-suggestions", "ยาที่ควรสั่งเพิ่ม (หักของที่สั่งค้าง)", [], null, true]);
  add("POST/api/suppliers", [{ name: "บริษัท เอเชียเมด จำกัด", contact_name: "คุณสมชาย", phone: "02-123-4567", email: "sales@asiamed.example" }, { name: "ร้านยาส่งสมบูรณ์", phone: "081-234-5678" }, { name: "บริษัท ยาดี จำกัด" }, {}]);
  add("PATCH/api/suppliers/{id}", [{ is_active: false }, { is_active: true }, { phone: "099-999-9999" }, { name: "เมดิคอล ซัพพลาย" }]);
  add("POST/api/purchase-orders", [{ supplier: 1, expected_date: "2026-11-05", items: [{ medicine: 1, qty: 50, unit_cost: "24.50" }] }, { supplier: 2, note: "ด่วน", items: [{ medicine: 2, qty: 30, unit_cost: "40" }, { medicine: 3, qty: 20, unit_cost: "29.40" }] }, { supplier: 999, items: [{ medicine: 1, qty: 5, unit_cost: "10" }] }, { supplier: 1, items: [] }, { supplier: 1, items: [{ medicine: 1, qty: 0, unit_cost: "10" }] }, { supplier: 1, items: [{ medicine: 1, qty: 5, unit_cost: "10" }, { medicine: 1, qty: 5, unit_cost: "10" }] }]);
  add("POST/api/purchase-orders/{id}/receive", [{ items: [{ item: 1, qty: 10, lot_no: "L2610A", expiry_date: "2027-12-31" }] }, { items: [{ item: 1, qty: 5 }] }, { items: [{ item: 1, qty: 99999 }] }, { items: [{ item: 999, qty: 1 }] }]);
  PV_PARAM_EX.date_to = ["2026-10-29", "2026-10-25", "2026-10-20"];
  PV_PARAM_EX.date_from = ["2026-10-20", "2026-10-25", "2026-10-29"];
  PV_PARAM_EX.id = ["1", "2", "3", "5", "8", "12", "40", "999"];
}

// ===== ผู้จัดจำหน่าย / ใบสั่งซื้อ (ตรงกับ stock/purchasing.py + orders.py ของ backend จริง) =====
function pvdPurchInit(D) {
  D.suppliers = [["บริษัท ยาดี จำกัด", "คุณสมหญิง ใจดี", "02-111-2222", "sales@yadee.example", "99 ถ.พระราม 4 กรุงเทพฯ"], ["เมดิคอล ซัพพลาย", "คุณวิชัย มั่นคง", "053-222-333", "order@medsupply.example", "12 ถ.นิมมานเหมินท์ เชียงใหม่"], ["ไทยฟาร์มา ดิสทริบิวชั่น", "คุณนภา สุขสันต์", "043-777-888", "", "5 ถ.มิตรภาพ ขอนแก่น"]].map(function (x, i) { return { id: i + 1, name: x[0], contact_name: x[1], phone: x[2], email: x[3], address: x[4], is_active: true, created_at: "2026-08-15T10:00:00" }; });
  D.seqSup = 3; D.pos = []; D.seqPO = 0; D.seqPOI = 0;
  var meds = D.meds.slice(0, 8), mk = function (sup, picks, daysAgo) { var r = pvdCreatePO(D, { id: 1 }, { supplier: sup, items: picks.map(function (p) { return { medicine: p[0].id, qty: p[1], unit_cost: pvdMoney(Number(p[0].price) * .7) }; }) }, { at: pvdAddDays(PVD_TODAY, -daysAgo) + "T10:00:00" }); return r.po; };
  var a = mk(1, [[meds[0], 60], [meds[1], 40]], 12); a.status = "ordered"; a.ordered_at = a.created_at; pvdReceivePO(D, { id: 1 }, a, a.items.map(function (i) { return { item: i.id, qty: i.qty_ordered, lot_no: "PO" + a.id + "-" + i.id, expiry_date: pvdAddDays(PVD_TODAY, 500) }; }), { seed: true });
  var b = mk(2, [[meds[2], 80], [meds[3], 30]], 6); b.status = "ordered"; b.ordered_at = b.created_at; pvdReceivePO(D, { id: 1 }, b, [{ item: b.items[0].id, qty: 50, lot_no: "PO" + b.id + "-A", expiry_date: pvdAddDays(PVD_TODAY, 400) }], { seed: true });
  var c = mk(3, [[meds[4], 100]], 2); c.status = "ordered"; c.ordered_at = c.created_at;
  mk(1, [[meds[5], 25], [meds[6], 25]], 1);
  var d = mk(2, [[meds[7], 10]], 9); d.status = "cancelled";
}
function pvdCreatePO(D, me, b, opt) {
  opt = opt || {}; var items = b.items;
  if (!items || !items.length) return { err: { code: 400, body: { items: ["This list may not be empty."] } } };
  var sup = D.suppliers.filter(function (s) { return s.id === +b.supplier; })[0]; if (!sup) return { err: { code: 400, body: { supplier: ["supplier not found"] } } };
  if (!sup.is_active) return { err: { code: 400, body: { detail: "supplier is inactive" } } };
  var seen = {}, total = 0, lines = [];
  for (var i = 0; i < items.length; i++) { var it = items[i], q = +it.qty, c = Number(it.unit_cost), id = +it.medicine;
    if (!isFinite(q) || q < 1 || Math.floor(q) !== q) return { err: { code: 400, body: { items: [{ qty: ["Ensure this value is greater than or equal to 1."] }] } } };
    if (!isFinite(c) || c < 0) return { err: { code: 400, body: { items: [{ unit_cost: ["Ensure this value is greater than or equal to 0."] }] } } };
    if (seen[id]) return { err: { code: 400, body: { detail: "duplicate medicine in items", medicine: id } } }; seen[id] = 1;
    var med = D.meds.filter(function (m) { return m.id === id; })[0]; if (!med) return { err: { code: 400, body: { detail: "medicine not found", medicine: id } } };
    lines.push({ id: ++D.seqPOI, medicine: med.id, sku: med.sku, name: med.name, qty_ordered: q, qty_received: 0, unit_cost: pvdMoney(c) }); total += Math.round(c * 100) * q; }
  var day = (opt.at || PVD_TODAY).slice(0, 10), ymd = day.replace(/-/g, ""), n = D.pos.filter(function (p) { return p.po_no.indexOf("PO-" + ymd + "-") === 0; }).length + 1;
  var po = { id: ++D.seqPO, po_no: "PO-" + ymd + "-" + ("000" + n).slice(-4), supplier: sup.id, status: "draft", expected_date: b.expected_date || null, note: b.note || "", total: pvdMoney(total / 100), created_by: me.id, created_at: opt.at || pvdNowIso(), ordered_at: null, received_at: null, items: lines };
  D.pos.push(po); return { po: po };
}
function pvdReceivePO(D, me, po, lines, opt) {
  if (po.status !== "ordered" && po.status !== "partial") return { err: { code: 400, body: { detail: "this PO is not open for receiving", status: po.status } } };
  var seen = {}, plan = [];
  for (var i = 0; i < lines.length; i++) { var ln = lines[i], it = po.items.filter(function (x) { return x.id === +ln.item; })[0], q = +ln.qty;
    if (!it || seen[it.id]) return { err: { code: 400, body: { detail: "invalid or duplicate item", item: ln.item } } }; seen[it.id] = 1;
    if (!isFinite(q) || q < 1 || Math.floor(q) !== q) return { err: { code: 400, body: { items: [{ qty: ["Ensure this value is greater than or equal to 1."] }] } } };
    if (q > it.qty_ordered - it.qty_received) return { err: { code: 400, body: { detail: "receiving more than ordered", item: it.id, remaining: it.qty_ordered - it.qty_received } } };
    if (ln.expiry_date && !/^\d{4}-\d\d-\d\d$/.test(ln.expiry_date)) return { err: { code: 400, body: { items: [{ expiry_date: ["Date has wrong format. Use one of these formats instead: YYYY-MM-DD."] }] } } };
    plan.push([it, q, ln]); }
  plan.forEach(function (p) { var it = p[0], q = p[1], ln = p[2], med = D.meds.filter(function (m) { return m.id === it.medicine; })[0];
    D.batches.push({ id: ++D.seqB, medicine: med.id, lot_no: ln.lot_no || po.po_no.slice(-13), expiry_date: ln.expiry_date || "2099-12-31", qty_received: q, qty_remaining: q, cost: it.unit_cost, received_at: pvdNowIso() });
    med.stock += q; if (!(opt && opt.seed)) D.moves.push({ id: ++D.seqMv, medicine: med.id, delta: q, stock_after: med.stock, reason: "receive", note: po.po_no, created_by: me.id, created_at: pvdNowIso() });
    it.qty_received += q; });
  var full = po.items.every(function (i) { return i.qty_received >= i.qty_ordered; }); po.status = full ? "received" : "partial"; if (full) po.received_at = pvdNowIso(); return { po: po };
}
function pvdPOOut(D, p) { var s = D.suppliers.filter(function (x) { return x.id === p.supplier; })[0], u = D.users.filter(function (x) { return x.id === p.created_by; })[0]; return { id: p.id, po_no: p.po_no, supplier: p.supplier, supplier_name: s ? s.name : "", status: p.status, expected_date: p.expected_date, note: p.note, total: p.total, created_by_name: u ? u.username : null, created_at: p.created_at, ordered_at: p.ordered_at, received_at: p.received_at, items: p.items.map(function (i) { return { id: i.id, medicine: i.medicine, sku: i.sku, name: i.name, qty_ordered: i.qty_ordered, qty_received: i.qty_received, unit_cost: i.unit_cost }; }) }; }
function pvdSupOut(D, s) { return { id: s.id, name: s.name, contact_name: s.contact_name, phone: s.phone, email: s.email, address: s.address, is_active: s.is_active, open_orders: D.pos.filter(function (p) { return p.supplier === s.id && (p.status === "ordered" || p.status === "partial"); }).length, created_at: s.created_at }; }
function pvdOnOrder(D, medId) { var n = 0; D.pos.forEach(function (p) { if (p.status === "ordered" || p.status === "partial") p.items.forEach(function (i) { if (i.medicine === medId) n += i.qty_ordered - i.qty_received; }); }); return n; }
function pvdPurchApi(D, method, path, Q, b, me, staff) {
  var forbid = { code: 403, body: { detail: "You do not have permission to perform this action." } }, bad = function (o) { return { code: 400, body: o }; };
  if (path === "/api/reorder-suggestions" && method === "GET") {
    return { code: 200, body: D.meds.filter(function (m) { return m.is_active && m.stock <= m.reorder_level; }).map(function (m) { var pend = pvdOnOrder(D, m.id), need = Math.max(m.reorder_level * 3 - m.stock - pend, 0), last = D.batches.filter(function (x) { return x.medicine === m.id; }).sort(function (a, c) { return c.id - a.id; })[0]; return need ? { medicine: m.id, sku: m.sku, name: m.name, stock: m.stock, reorder_level: m.reorder_level, on_order: pend, suggested_qty: need, last_cost: last ? last.cost : pvdMoney(Number(m.price) * .7) } : null; }).filter(Boolean).sort(function (a, c) { return a.stock - c.stock || (a.name < c.name ? -1 : 1); }) };
  }
  if (path === "/api/suppliers" && method === "GET") { var q = (Q.q || "").toLowerCase(); return pvdPage(D.suppliers.filter(function (s) { return (!q || s.name.toLowerCase().indexOf(q) >= 0 || s.contact_name.toLowerCase().indexOf(q) >= 0) && (!(Q.active === "1" || Q.active === "true") || s.is_active); }).sort(function (a, c) { return a.name < c.name ? -1 : 1; }).map(function (s) { return pvdSupOut(D, s); }), Q); }
  if (path === "/api/suppliers" && method === "POST") { if (!staff) return forbid; if (!b.name) return bad({ name: ["This field is required."] }); if (D.suppliers.some(function (s) { return s.name === b.name; })) return bad({ name: ["supplier with this name already exists."] }); var ns = { id: ++D.seqSup, name: b.name, contact_name: b.contact_name || "", phone: b.phone || "", email: b.email || "", address: b.address || "", is_active: true, created_at: pvdNowIso() }; D.suppliers.push(ns); return { code: 201, body: pvdSupOut(D, ns) }; }
  var sm = /^\/api\/suppliers\/(\d+)$/.exec(path);
  if (sm) { var sup = D.suppliers.filter(function (s) { return s.id === +sm[1]; })[0]; if (!sup) return { code: 404, body: { detail: "No Supplier matches the given query." } };
    if (method === "GET") return { code: 200, body: pvdSupOut(D, sup) }; if (!staff) return forbid;
    if (method === "DELETE") { if (D.pos.some(function (p) { return p.supplier === sup.id; })) return bad({ detail: "supplier has purchase orders; deactivate it instead" }); D.suppliers = D.suppliers.filter(function (s) { return s !== sup; }); return { code: 204, body: null }; }
    if (method === "PATCH") { if (b.name !== undefined && (!b.name || D.suppliers.some(function (s) { return s !== sup && s.name === b.name; }))) return bad({ name: [b.name ? "supplier with this name already exists." : "This field may not be blank."] }); ["name", "contact_name", "phone", "email", "address", "is_active"].forEach(function (k) { if (b[k] !== undefined) sup[k] = b[k]; }); return { code: 200, body: pvdSupOut(D, sup) }; } }
  if (path === "/api/purchase-orders" && method === "GET") { var qq = (Q.q || "").toLowerCase(); return pvdPage(D.pos.filter(function (p) { return (!Q.status || p.status === Q.status) && (!Q.supplier || String(p.supplier) === Q.supplier) && (!qq || p.po_no.toLowerCase().indexOf(qq) >= 0); }).sort(function (a, c) { return a.created_at < c.created_at ? 1 : a.created_at > c.created_at ? -1 : c.id - a.id; }).map(function (p) { return pvdPOOut(D, p); }), Q); }
  if (path === "/api/purchase-orders" && method === "POST") { if (!staff) return forbid; var r = pvdCreatePO(D, me, b); return r.err || { code: 201, body: pvdPOOut(D, r.po) }; }
  var pm = /^\/api\/purchase-orders\/(\d+)(\/(order|cancel|receive))?$/.exec(path);
  if (pm) { var po = D.pos.filter(function (p) { return p.id === +pm[1]; })[0]; if (!po) return { code: 404, body: { detail: "No PurchaseOrder matches the given query." } };
    if (!pm[2] && method === "GET") return { code: 200, body: pvdPOOut(D, po) };
    if (!pm[2] && method === "DELETE") { if (!staff) return forbid; if (po.status !== "draft") return bad({ detail: "only a draft can be deleted" }); D.pos = D.pos.filter(function (p) { return p !== po; }); return { code: 204, body: null }; }
    if (pm[3] === "receive" && method === "POST") { var rr = pvdReceivePO(D, me, po, b.items || []); return rr.err || { code: 200, body: pvdPOOut(D, po) }; }
    if (pm[3] === "order" && method === "POST") { if (!staff) return forbid; if (po.status !== "draft") return bad({ detail: "only a draft can be ordered" }); po.status = "ordered"; po.ordered_at = pvdNowIso(); return { code: 200, body: pvdPOOut(D, po) }; }
    if (pm[3] === "cancel" && method === "POST") { if (!staff) return forbid; if (po.status === "ordered" && po.items.some(function (i) { return i.qty_received > 0; })) return bad({ detail: "cannot: some items were received" }); if (po.status !== "draft" && po.status !== "ordered") return bad({ detail: "only a draft or an ordered PO with nothing received can be cancelled" }); po.status = "cancelled"; return { code: 200, body: pvdPOOut(D, po) }; } }
  return null;
}

// ---------- หน้าเว็บจำลอง: สั่งซื้อยา / ผู้จัดจำหน่าย ----------
var PV_POL = { draft: "ร่าง", ordered: "สั่งแล้ว", partial: "รับบางส่วน", received: "รับครบ", cancelled: "ยกเลิก" }, PV_POB = { draft: "off", ordered: "pharmacist", partial: "low", received: "ok", cancelled: "out" };
function pvFeOrders(me, staff) {
  var F = PV.fe, O = F.od = F.od || { q: "", st: "", p: 1 }, r = pvFeApi("GET", "/api/purchase-orders?page=" + O.p + (O.st ? "&status=" + O.st : "") + (O.q ? "&q=" + encodeURIComponent(O.q) : ""));
  if (r.code === 404) { O.p = 1; return pvFeOrders(me, staff); }
  return h("div", {}, [pvHead("สั่งซื้อยา", "สร้างใบสั่งซื้อ → ส่งซัพพลายเออร์ → รับของเข้าคลัง (เปิดล็อตและเพิ่มสต็อกให้อัตโนมัติ รับบางส่วนได้)"), h("div", { cls: "card flush" }, [h("div", { cls: "toolbar", style: "padding:16px 16px 0" }, [h("div", { style: "min-width:200px" }, [pvEx("ค้นหา PO", O, "q", ["PO-2026102"], "เลขที่ PO", "text", false, function () { O.p = 1; }, true)]), h("select", { "aria-label": "สถานะ", onchange: function (e) { O.st = e.target.value; O.p = 1; render(); } }, [["", "ทุกสถานะ"]].concat(Object.keys(PV_POL).map(function (k) { return [k, PV_POL[k]]; })).map(function (o) { return h("option", { value: o[0], text: o[1], selected: O.st === o[0] ? "selected" : null }); })), h("span", { cls: "sp" }), staff ? h("button", { type: "button", cls: "pri", text: "+ สร้างใบสั่งซื้อ", onclick: function () { F.modal = { t: "pocreate" }; render(); } }) : null].filter(Boolean)),
    h("table", {}, [h("thead", {}, [h("tr", {}, ["เลขที่", "ผู้จัดจำหน่าย", "สร้างเมื่อ", "กำหนดรับ", "ยอดรวม", "สถานะ", ""].map(function (x, i) { return h("th", { cls: i === 4 ? "num" : "", text: x }); }))]), h("tbody", {}, r.body.results.map(function (o) { return h("tr", {}, [h("td", {}, [h("b", { text: o.po_no })]), h("td", { text: o.supplier_name }), h("td", { cls: "muted", text: new Date(o.created_at).toLocaleDateString("th-TH") }), h("td", { text: o.expected_date || "-" }), h("td", { cls: "num", text: pvBaht(o.total) }), h("td", {}, [h("span", { cls: "badge " + PV_POB[o.status], text: PV_POL[o.status] })]), h("td", {}, [h("button", { type: "button", cls: "sm", text: "เปิดดู", onclick: function () { F.modal = { t: "poview", id: o.id }; render(); } })])]); }).concat(r.body.results.length ? [] : [h("tr", {}, [h("td", { colSpan: 7, cls: "empty", text: "ยังไม่มีใบสั่งซื้อ" })])]))]), pvPager(r.body.count, O.p, function (p) { O.p = p; render(); })])]);
}
function pvFeSuppliers(me, staff) {
  var F = PV.fe, Sx = F.sp = F.sp || { q: "", p: 1 }, r = pvFeApi("GET", "/api/suppliers?page=" + Sx.p + (Sx.q ? "&q=" + encodeURIComponent(Sx.q) : ""));
  if (r.code === 404) { Sx.p = 1; return pvFeSuppliers(me, staff); }
  var del = function (s) { var d = pvFeApi("DELETE", "/api/suppliers/" + s.id); if (d.code >= 400) flash("bad", d.body.detail); render(); };
  return h("div", {}, [pvHead("ผู้จัดจำหน่าย", "รายชื่อบริษัท/ร้านที่สั่งยาเข้ามา · แก้ไขได้โดยเภสัชกร/ผู้ดูแล"), h("div", { cls: "card flush" }, [h("div", { cls: "toolbar", style: "padding:16px 16px 0" }, [h("div", { style: "min-width:230px" }, [pvEx("ค้นหาผู้จัดจำหน่าย", Sx, "q", ["ยาดี", "เมดิคอล", "ไทยฟาร์มา"], "ค้นหาชื่อหรือผู้ติดต่อ", "text", false, function () { Sx.p = 1; }, true)]), h("span", { cls: "sp" }), staff ? h("button", { type: "button", cls: "pri", text: "+ เพิ่มผู้จัดจำหน่าย", onclick: function () { F.modal = { t: "supedit" }; render(); } }) : null].filter(Boolean)),
    h("table", {}, [h("thead", {}, [h("tr", {}, ["ชื่อ", "ผู้ติดต่อ", "โทร", "PO ค้างอยู่", "สถานะ", ""].map(function (x, i) { return h("th", { cls: i === 3 ? "num" : "", text: x }); }))]), h("tbody", {}, r.body.results.map(function (s) { return h("tr", {}, [h("td", {}, [h("b", { text: s.name }), h("div", { cls: "muted", text: s.address })]), h("td", { text: s.contact_name || "-" }), h("td", { text: s.phone || "-" }), h("td", { cls: "num", text: String(s.open_orders) }), h("td", {}, [h("span", { cls: "badge " + (s.is_active ? "ok" : "off"), text: s.is_active ? "ใช้งาน" : "ปิดใช้งาน" })]), h("td", { style: "white-space:nowrap" }, staff ? [h("button", { type: "button", cls: "sm", text: "แก้ไข", onclick: function () { F.modal = { t: "supedit", s: s }; render(); } }), " ", h("button", { type: "button", cls: "sm", text: s.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน", onclick: function () { pvFeApi("PATCH", "/api/suppliers/" + s.id, { is_active: !s.is_active }); render(); } }), " ", h("button", { type: "button", cls: "sm danger", text: "ลบ", onclick: function () { del(s); } })] : [])]); }).concat(r.body.results.length ? [] : [h("tr", {}, [h("td", { colSpan: 6, cls: "empty", text: "ไม่พบผู้จัดจำหน่าย" })])]))]), pvPager(r.body.count, Sx.p, function (p) { Sx.p = p; render(); })])]);
}
function pvPurchModal(M) {
  var F = PV.fe, close = function () { F.modal = null; render(); }, me = pvFeMe(), staff = me.role !== "clerk", f = M.f = M.f || {};
  var wrap = function (kids, wide) { return h("div", { cls: "modalbg", onclick: function (e) { if (e.target === e.currentTarget) close(); } }, [h("div", { cls: "modal", style: wide ? "min-width:min(760px,94vw)" : "" }, [h("div", { cls: "form" }, kids)])]); }, err = h("div", { cls: "err", role: "alert" });
  if (M.t === "supedit") { var S0 = M.s; if (f.name === undefined) { f.name = S0 ? S0.name : ""; f.contact = S0 ? S0.contact_name : ""; f.phone = S0 ? S0.phone : ""; f.email = S0 ? S0.email : ""; f.addr = S0 ? S0.address : ""; }
    return wrap([h("strong", { text: S0 ? "แก้ไข " + S0.name : "เพิ่มผู้จัดจำหน่าย" }), pvEx("ชื่อบริษัท/ร้าน", f, "name", ["บริษัท เอเชียเมด จำกัด", "ร้านยาส่งสมบูรณ์", "วีเฟอร์มา"], "ชื่อ"), h("div", { cls: "grid2" }, [pvEx("ผู้ติดต่อ", f, "contact", ["คุณสมชาย", "คุณมานี"], "ผู้ติดต่อ"), pvEx("โทร", f, "phone", ["02-123-4567", "081-234-5678"], "เบอร์โทร"), pvEx("อีเมล", f, "email", ["sales@example.com"], "อีเมล"), pvEx("ที่อยู่", f, "addr", ["99 ถ.สุขุมวิท กรุงเทพฯ"], "ที่อยู่")]), err, h("div", { cls: "toolbar" }, [h("button", { type: "button", cls: "pri", text: "บันทึก", onclick: function () { var body = { name: f.name, contact_name: f.contact, phone: f.phone, email: f.email, address: f.addr }, r = S0 ? pvFeApi("PATCH", "/api/suppliers/" + S0.id, body) : pvFeApi("POST", "/api/suppliers", body); if (r.code >= 400) { err.textContent = r.body.detail || JSON.stringify(r.body); return; } F.modal = null; render(); } }), h("button", { type: "button", text: "ยกเลิก", onclick: close })])]); }
  if (M.t === "pocreate") { if (!f.lines) { f.lines = []; f.sup = ""; f.exp = ""; f.note = ""; f.mq = ""; }
    var sups = pvFeApi("GET", "/api/suppliers?active=1").body.results, sugg = pvFeApi("GET", "/api/reorder-suggestions").body, has = function (id) { return f.lines.some(function (l) { return l.medicine === id; }); };
    var found = f.mq ? pvFeApi("GET", "/api/medicines?q=" + encodeURIComponent(f.mq)).body.results.slice(0, 5) : [], total = f.lines.reduce(function (s, l) { return s + (/^\d+$/.test(l.qty) ? Number(l.qty) : 0) * (/^\d+(\.\d{1,2})?$/.test(l.cost) ? Math.round(Number(l.cost) * 100) : 0); }, 0) / 100;
    return wrap([h("strong", { text: "สร้างใบสั่งซื้อ" }), h("div", { cls: "grid2" }, [h("label", {}, ["ผู้จัดจำหน่าย", h("select", { "aria-label": "ผู้จัดจำหน่าย", onchange: function (e) { f.sup = e.target.value; } }, [h("option", { value: "", text: "เลือก…" })].concat(sups.map(function (s) { return h("option", { value: String(s.id), text: s.name, selected: String(s.id) === f.sup ? "selected" : null }); })))]), h("label", {}, ["กำหนดรับของ", h("input", { type: "date", value: f.exp, "aria-label": "กำหนดรับของ", onchange: function (e) { f.exp = e.target.value; } })])]),
      sugg.length ? h("div", { cls: "notice" }, ["ยาที่ควรสั่ง " + sugg.length + " รายการ ", h("button", { type: "button", cls: "sm", text: "เติมทั้งหมดลงรายการ", onclick: function () { sugg.filter(function (x) { return !has(x.medicine); }).forEach(function (x) { f.lines.push({ medicine: x.medicine, sku: x.sku, name: x.name, qty: String(x.suggested_qty), cost: x.last_cost }); }); render(); } })]) : null,
      pvEx("เพิ่มยา", f, "mq", ["Para", "Amox", "Ibuprofen", "Cetirizine"], "ค้นหาชื่อหรือรหัสยา", "text", false, null, false),
      found.length ? h("ul", { cls: "mini" }, found.map(function (m) { return h("li", {}, [h("div", { cls: "grow" }, [h("b", { text: m.name }), h("span", { cls: "muted", text: m.sku + " · คงเหลือ " + m.stock })]), h("button", { type: "button", cls: "sm", disabled: has(m.id), text: has(m.id) ? "เพิ่มแล้ว" : "+ เพิ่ม", onclick: function () { f.lines.push({ medicine: m.id, sku: m.sku, name: m.name, qty: "10", cost: (Number(m.price) * .7).toFixed(2) }); f.mq = ""; render(); } })]); })) : null,
      h("table", {}, [h("thead", {}, [h("tr", {}, ["ยา", "จำนวน", "ต้นทุน/หน่วย", ""].map(function (x) { return h("th", { text: x }); }))]), h("tbody", {}, f.lines.map(function (l, i) { return h("tr", {}, [h("td", {}, [l.name, h("div", { cls: "muted", text: l.sku })]), h("td", {}, [h("input", { cls: "qty", value: l.qty, "aria-label": "จำนวน " + l.name, oninput: function (e) { l.qty = e.target.value; } })]), h("td", {}, [h("input", { cls: "qty", style: "width:90px", value: l.cost, "aria-label": "ต้นทุน " + l.name, oninput: function (e) { l.cost = e.target.value; } })]), h("td", {}, [h("button", { type: "button", cls: "sm danger", text: "✕", "aria-label": "ลบ " + l.name, onclick: function () { f.lines.splice(i, 1); render(); } })])]); }).concat(f.lines.length ? [] : [h("tr", {}, [h("td", { colSpan: 4, cls: "empty", text: "ยังไม่มีรายการ" })])]))]),
      pvEx("หมายเหตุ", f, "note", ["ด่วน", "ส่งภายในสัปดาห์นี้"], "หมายเหตุ"), h("div", {}, [h("b", { text: "ยอดรวม " + pvBaht(total) })]), err,
      h("div", { cls: "toolbar" }, [h("button", { type: "button", cls: "pri", text: "บันทึกเป็นร่าง", onclick: function () {
        if (!f.sup) { err.textContent = "เลือกผู้จัดจำหน่ายก่อน"; return; } if (!f.lines.length) { err.textContent = "เพิ่มยาอย่างน้อย 1 รายการ"; return; }
        for (var i = 0; i < f.lines.length; i++) { var l = f.lines[i]; if (!/^\d+$/.test(l.qty) || Number(l.qty) < 1) { err.textContent = "จำนวนของ " + l.name + " ต้องเป็นเลขจำนวนเต็มมากกว่า 0"; return; } if (!/^\d+(\.\d{1,2})?$/.test(l.cost)) { err.textContent = "ราคาต้นทุนของ " + l.name + " ไม่ถูกต้อง"; return; } }
        var r = pvFeApi("POST", "/api/purchase-orders", { supplier: Number(f.sup), expected_date: f.exp || null, note: f.note, items: f.lines.map(function (l) { return { medicine: l.medicine, qty: Number(l.qty), unit_cost: l.cost }; }) });
        if (r.code >= 400) { err.textContent = r.body.detail || JSON.stringify(r.body); return; } F.modal = { t: "poview", id: r.body.id }; render(); } }), h("button", { type: "button", text: "ยกเลิก", onclick: close })])], true); }
  var rr = pvFeApi("GET", "/api/purchase-orders/" + M.id); if (rr.code !== 200) { F.modal = null; return h("span"); } var po = rr.body, got = po.items.some(function (i) { return i.qty_received > 0; }), act = { order: po.status === "draft", receive: po.status === "ordered" || po.status === "partial", cancel: po.status === "draft" || (po.status === "ordered" && !got), remove: po.status === "draft" }; M.rv = M.rv || {};
  var call = function (path, body) { var x = pvFeApi("POST", "/api/purchase-orders/" + po.id + "/" + path, body); if (x.code >= 400) { err.textContent = x.body.detail || JSON.stringify(x.body); return false; } render(); return true; };
  return wrap([h("div", { cls: "toolbar", style: "margin-bottom:0" }, [h("strong", { text: po.po_no }), h("span", { cls: "badge " + PV_POB[po.status], text: PV_POL[po.status] }), h("span", { cls: "sp" }), h("span", { cls: "muted", text: po.supplier_name })]), h("div", { cls: "muted", text: "สร้างโดย " + (po.created_by_name || "-") + " · " + pvDt(po.created_at) + (po.expected_date ? " · กำหนดรับ " + po.expected_date : "") + (po.note ? " · " + po.note : "") }),
    h("table", {}, [h("thead", {}, [h("tr", {}, ["ยา", "สั่ง", "รับแล้ว", "ต้นทุน"].concat(act.receive ? ["รับครั้งนี้ / ล็อต / หมดอายุ"] : []).map(function (x, i) { return h("th", { cls: i > 0 && i < 4 ? "num" : "", text: x }); }))]), h("tbody", {}, po.items.map(function (i) { var rem = Math.max(0, i.qty_ordered - i.qty_received), v = M.rv[i.id] = M.rv[i.id] || { qty: "", lot: "", exp: "" }; return h("tr", {}, [h("td", {}, [i.name, h("div", { cls: "muted", text: i.sku })]), h("td", { cls: "num", text: String(i.qty_ordered) }), h("td", { cls: "num", text: String(i.qty_received) }), h("td", { cls: "num", text: pvBaht(i.unit_cost) })].concat(act.receive ? [h("td", {}, [rem > 0 ? h("div", { style: "display:flex;gap:6px" }, [h("input", { cls: "qty", value: v.qty, placeholder: "≤" + rem, "aria-label": "รับ " + i.name, oninput: function (e) { v.qty = e.target.value; } }), h("input", { style: "width:110px", value: v.lot, placeholder: "เลขล็อต", "aria-label": "ล็อต " + i.name, oninput: function (e) { v.lot = e.target.value; } }), h("input", { type: "date", value: v.exp, "aria-label": "หมดอายุ " + i.name, onchange: function (e) { v.exp = e.target.value; } })]) : h("span", { cls: "muted", text: "รับครบ" })])] : [])); }))]),
    h("div", {}, [h("b", { text: "ยอดรวม " + pvBaht(po.total) })]), err,
    h("div", { cls: "toolbar noprint" }, [act.order && staff ? h("button", { type: "button", cls: "pri", text: "สั่งซื้อ", onclick: function () { call("order"); } }) : null, act.receive ? h("button", { type: "button", cls: "pri", text: "รับของเข้าคลัง", onclick: function () { var items = po.items.filter(function (i) { return M.rv[i.id] && M.rv[i.id].qty; }).map(function (i) { return { item: i.id, qty: Number(M.rv[i.id].qty), lot_no: M.rv[i.id].lot, expiry_date: M.rv[i.id].exp || null }; }); if (!items.length) { err.textContent = "ใส่จำนวนที่รับอย่างน้อย 1 รายการ"; return; } if (items.some(function (x) { return !Number.isInteger(x.qty) || x.qty < 1; })) { err.textContent = "จำนวนที่รับต้องเป็นเลขจำนวนเต็มมากกว่า 0"; return; } if (call("receive", { items: items })) M.rv = {}; } }) : null, act.cancel && staff ? h("button", { type: "button", cls: "danger", text: "ยกเลิก PO", onclick: function () { call("cancel"); } }) : null, act.remove && staff ? h("button", { type: "button", cls: "danger", text: "ลบร่าง", onclick: function () { var x = pvFeApi("DELETE", "/api/purchase-orders/" + po.id); if (x.code >= 400) err.textContent = x.body.detail; else { F.modal = null; render(); } } }) : null, h("span", { cls: "sp" }), h("button", { type: "button", text: "ปิด", onclick: close })].filter(Boolean))], true);
}
