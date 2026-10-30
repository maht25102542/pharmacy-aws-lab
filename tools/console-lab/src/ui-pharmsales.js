// ===== Preview: ขายหน้าร้าน / ล็อตยา / ใบเสร็จ / รายงาน ของเว็บร้านยาจำลอง (กฎเดียวกับ backend จริง: stock/services.py, sales.py) =====
var PVD_TODAY = "2026-10-29";
function pvdNowIso() { var d = new Date(); return PVD_TODAY + "T" + pvdPad(d.getHours()) + ":" + pvdPad(d.getMinutes()) + ":" + pvdPad(d.getSeconds()); }
function pvdAddDays(iso, n) { var p = iso.split("-"), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.getUTCFullYear() + "-" + pvdPad(d.getUTCMonth() + 1) + "-" + pvdPad(d.getUTCDate()); }
function pvdDiffDays(a, b) { var f = function (s) { var p = s.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }; return Math.round((f(a) - f(b)) / 86400000); }
function pvdMoney(n) { return (Math.round(n * 100) / 100).toFixed(2); }

function pvdSalesInit(D, R) {
  D.batches = []; D.sales = []; D.seqB = 0; D.seqS = 0; D.seqSI = 0;
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
  for (var i = 0; i < items.length; i++) { var q = +items[i].qty, id = +items[i].medicine; if (!isFinite(q) || q < 1 || Math.floor(q) !== q || q > 9999) return { err: { code: 400, body: { items: [{ qty: ["Ensure this value is greater than or equal to 1."] }] } } }; if (merged[id] === undefined) { merged[id] = 0; order.push(id); } merged[id] += q; }
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
  return { sales_today: { count: td.length, total: pvdMoney(td.reduce(function (s, x) { return s + Number(x.total); }, 0)) }, expiring_30: live.filter(function (b) { return b.expiry_date >= PVD_TODAY && b.expiry_date <= pvdAddDays(PVD_TODAY, 30); }).length, expired: live.filter(function (b) { return b.expiry_date < PVD_TODAY; }).length };
}
// คืน null ถ้า path นี้ไม่ใช่ของระบบขาย
function pvdSalesApi(D, method, path, Q, b, me, staff) {
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
