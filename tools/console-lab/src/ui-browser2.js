// ===== กรอบ browser จริง (แท็บ + แถบ URL + กุญแจ + ป้ายสถานะ) ใช้กับทุกเว็บในแท็บ Browser =====
var BWI = {
  back: '<path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  fwd: '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  reload: '<path d="M19 12a7 7 0 1 1-2.1-5M19 4v4h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/>',
  warn: '<path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v5M12 18v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  sad: '<path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3v4h4M9.5 14.5c1.5-1.5 3.5-1.5 5 0M9.5 11h.01M14.5 11h.01" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
};
function bwSvg(k, n) { return '<svg viewBox="0 0 24 24" width="' + n + '" height="' + n + '" aria-hidden="true">' + BWI[k] + '</svg>'; }
// o = { url, title, ico (emoji/ข้อความสั้น), status, statusText, secure ("Let's Encrypt" ...), body (node), steps (list ของ mgSteps), stepsTitle }
function wbWin(o) {
  var u = o.url || "", https = /^https:/i.test(u), m = /^(https?:\/\/)([^\/]+)(.*)$/i.exec(u) || ["", "", u, ""];
  var cls = o.status ? (o.status < 300 ? "ok" : o.status < 500 ? "warn" : "bad") : "";
  var bar = h("div", { cls: "bw-bar" }, [
    h("button", { type: "button", cls: "bw-nav", "aria-label": "Back", title: "Back", html: bwSvg("back", 18), disabled: whCan(-1) ? null : "disabled", onclick: function () { whGo(-1); } }), h("button", { type: "button", cls: "bw-nav", "aria-label": "Forward", title: "Forward", html: bwSvg("fwd", 18), disabled: whCan(1) ? null : "disabled", onclick: function () { whGo(1); } }),
    h("button", { type: "button", cls: "bw-nav", "aria-label": "Reload", title: "Reload", html: bwSvg("reload", 18), onclick: function () { wbGo(W.addr); } }),
    h("div", { cls: "bw-url" }, [h("span", { cls: "bw-lock " + (https && !o.insecure ? "ok" : "no"), title: https ? (o.secure || "Connection is secure") : "Not secure", html: bwSvg(https && !o.insecure ? "lock" : "warn", 15) + (https && !o.insecure ? "" : "<b>Not secure</b>") }),
      h("span", { cls: "bw-u" }, [h("span", { cls: "d", text: m[1] }), h("span", { cls: "h", text: m[2] }), h("span", { cls: "d", text: m[3] })])]),
    o.status ? h("span", { cls: "bw-chip " + cls, text: o.status + (o.statusText ? " " + o.statusText : "") }) : h("span")]);
  var win = h("div", { cls: "bw" }, [
    h("div", { cls: "bw-tabs" }, [h("span", { cls: "bw-dots" }, [h("i"), h("i"), h("i")]), h("div", { cls: "bw-tab" }, [(/^@/.test(o.ico || "") ? h("span", { cls: "ico" }, [svcLogo(o.ico.slice(1), 16)]) : h("span", { cls: "ico", text: o.ico || "🌐" })), h("span", { cls: "t", text: o.title || m[2] })])]),
    bar, h("div", { cls: "bw-vp" }, [o.body])]);
  var out = h("div", { cls: "bwrap" }, [win]);
  if (o.extra) out.appendChild(o.extra);
  if (o.steps && o.steps.length) out.appendChild(h("div", { cls: "bw-why" }, [h("h4", { text: o.stepsTitle || "เบื้องหลัง: ตัวจำลองตรวจอะไรบ้าง" }), mgSteps(o.steps)]));
  return out;
}
// หน้า error แบบ Chrome จริง
function wbErrBody(host, err, detail) {
  var why = err === "ERR_CONNECTION_REFUSED" ? host + " refused to connect." : err === "ERR_NAME_NOT_RESOLVED" ? "ไม่พบเซิร์ฟเวอร์ของ " + host + " (DNS ไม่ตอบ)" : /CERT|SSL/.test(err) ? "การเชื่อมต่อกับ " + host + " ไม่ปลอดภัย (ใบรับรอง HTTPS มีปัญหา)" : host + " took too long to respond.";
  var cert = /CERT|SSL/.test(err);
  return h("div", { cls: "bw-err" }, [h("div", { cls: "eic", html: bwSvg(cert ? "warn" : "sad", 56) }), h("h1", { text: cert ? "Your connection is not private" : "This site can’t be reached" }), h("p", { text: why }), h("small", { text: err }),
    h("div", {}, [h("button", { type: "button", cls: "bw-btn", text: "Reload", onclick: function () { wbGo(W.addr); } })])].concat(detail ? [h("p", { cls: "dt", text: detail })] : []));
}
// เนื้อหา JSON: ตาราง (ถ้ามี items) / Pretty / Raw
function wbJsonBody(obj, o) {
  o = o || {}; var items = obj && Array.isArray(obj.items) && obj.items.length && typeof obj.items[0] === "object" ? obj.items : null;
  var mode = W.jv || (items ? "table" : "pretty"); if (mode === "table" && !items) mode = "pretty";
  var tabs = h("div", { cls: "bw-jt" }, [items ? ["table", "Table"] : null, ["pretty", "Pretty"], ["raw", "Raw"]].filter(Boolean).map(function (t) { return h("button", { type: "button", cls: mode === t[0] ? "on" : "", text: t[1], onclick: function () { W.jv = t[0]; render(); } }); }));
  var view;
  if (mode === "table") { var keys = Object.keys(items[0]); view = h("div", { cls: "twrap" }, [h("table", { cls: "bw-tbl" }, [h("thead", {}, [h("tr", {}, keys.map(function (k) { return h("th", { text: k }); }))]), h("tbody", {}, items.map(function (it) { return h("tr", {}, keys.map(function (k) { return h("td", { text: String(it[k]) }); })); }))])]); }
  else if (mode === "raw") view = h("pre", { cls: "bw-raw", text: JSON.stringify(obj) });
  else { var pt = JKX.theme; JKX.theme = "github"; view = codePre(JSON.stringify(obj, null, 2), "an"); JKX.theme = pt; } // กรอบ browser สว่างเสมอ → ใช้ธีมโค้ดสว่าง
  var meta = Object.keys(obj || {}).filter(function (k) { return typeof obj[k] !== "object"; }).slice(0, 5);
  return h("div", { cls: "bw-json" }, [h("div", { cls: "bw-jh" }, [h("div", {}, [h("b", { text: o.title || "JSON response" }), h("span", { cls: "bw-ct", text: "application/json" })]), tabs]),
    meta.length ? h("div", { cls: "bw-meta" }, meta.map(function (k) { return h("span", {}, [h("i", { text: k }), " " + String(obj[k])]); })) : h("span"), view]);
}
