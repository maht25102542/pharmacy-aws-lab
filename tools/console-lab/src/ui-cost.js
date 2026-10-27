// ===== Cost & Bill management: การ์ดในหน้า use case ทุกใบ + หน้า Lab รวม =====
function money(n) { return "$" + (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n)); }
function moneyH(n) { return "$" + (n < 1 ? n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") : n.toFixed(2)); }
function costTable(items) {
  var rows = items.map(function (x) {
    var per = x.k === "hr" ? moneyH(x.r * x.q) + "/ชม." + (x.q > 1 ? " (" + x.q + " ตัว)" : "") : x.k === "mo" ? money(x.r * x.q) + "/เดือน" : "ตามการใช้";
    var moU = x.k === "hr" ? x.r * x.q * COST_HRS : x.k === "mo" ? x.r * x.q : null, mo = moU == null ? "–" : baht(moU) + " (" + money(moU) + ")";
    return h("tr", {}, [h("td", {}, [h("b", { text: x.n }), x.note ? h("div", { cls: "hint", style: "margin:2px 0 0", text: x.note }) : h("span")]), h("td", { text: x.k === "use" ? x.unit : per }), h("td", { style: "text-align:right;white-space:nowrap", text: mo }), h("td", { style: "text-align:center", text: x.idle ? "🔴 คิดเงิน" : "🟢 ไม่คิด" })]);
  });
  var s = costSum(items);
  rows.push(h("tr", { style: "font-weight:700;background:var(--hl,#f3f6f9)" }, [h("td", { text: "รวมรายการคงที่ (ไม่รวมที่คิดตามการใช้)" }), h("td", { text: moneyH(s.hr) + "/ชม." }), h("td", { style: "text-align:right", text: baht(s.month) + " (" + money(s.month) + ")" }), h("td")]));
  return h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, [h("th", { text: "รายการ" }), h("th", { text: "คิดตาม" }), h("th", { text: "≈ ต่อเดือน (730 ชม.)" }), h("th", { text: "ตอนไม่มีคนใช้" })])]), h("tbody", {}, rows)])]);
}
function costChips(items) {
  var s = costSum(items), chip = function (lb, usd, c, suf) { return h("div", { cls: "cd-kpi", style: "--c:" + c }, [h("div", { cls: "l", text: lb }), h("div", { cls: "v" }, [baht(usd), suf ? h("small", { text: suf }) : null].filter(Boolean)), h("div", { cls: "u", text: "≈ " + money(usd) + " (USD)" })]); };
  return h("div", { cls: "cd-kpis" }, [chip("เปิดทิ้งไว้ 1 เดือน", s.month, "#c62828"), chip("ทำ lab 4 ชั่วโมงแล้ว destroy", s.perHours(4), "#1d8102"), chip("ค่าคงที่ต่อชั่วโมง", s.hr, "#2b6cb0", "/ชม.")]);
}
function costCaveat() { return h("p", { cls: "hint" }, rich("⚠ ตัวเลขเป็น ==ประมาณการ== ap-southeast-1 (USD) ไม่รวมภาษี/ค่าโอนข้อมูลจริง · ยังไม่ยืนยันกับหน้า pricing ของ AWS (ยืนยันแล้วเฉพาะ public IPv4 $0.005/ชม. และ EKS $0.10/ชม.) → ตรวจที่ calculator.aws ก่อนตัดสินใจ · ค่าเงินบาทใช้อัตราสมมติ " + COST_THB + " บาท/ดอลลาร์ (ปรับที่ COST_THB)")); }
function costBlock(c) {
  var out = h("div", {}, [h("div", { cls: "alert", style: "margin:0 0 6px", text: "💰 " + c.big }), costChips(c.items), costTable(c.items)]);
  if (c.drivers) out.appendChild(infoCard([["อะไรทำให้บิลพุ่ง", "#c62828", c.drivers.join(" · ")], ["ลดค่าใช้จ่าย", "#1d8102", c.cut.join(" · ")], ["ตั้งเตือน/จับตา", "#2b6cb0", c.watch.join(" · ")], ["หยุดจ่ายเมื่อเลิกใช้", "#a85a00", c.stop]]));
  out.appendChild(costCaveat()); return out;
}
function costGen() { return infoCard(COSTD.gen); }
FOLD.uccost = 1;
var CD_SEL = { id: "ecs" }, CD_COL = [["#2a78d6", "#3987e5"], ["#eb6834", "#d95926"], ["#1baf7a", "#199e70"], ["#eda100", "#c98500"], ["#e87ba4", "#d55181"]];
function cdLabs() { // รวม use case + main lab → [{name, items, big, uc?}]
  var out = UC.filter(function (u) { return COSTD.uc[u.id]; }).map(function (u) { var c = COSTD.uc[u.id]; return { id: u.id, name: u.no + ". " + u.title.split(":")[0], color: u.color, items: c.items, big: c.big }; });
  [["vm", "main lab (VM)", "#475569"], ["managed", "managed (EKS)", "#475569"]].forEach(function (x) { var c = COSTD.mainlab[x[0]]; out.push({ id: x[0], name: x[1], color: x[2], items: c.items, big: c.note }); });
  return out.map(function (l) { l.s = costSum(l.items); return l; });
}
function cdBars(labs) { // แท่งแนวนอนชุดเดียว: ค่าเปิดทิ้ง 1 เดือน (บาท) · เรียงมาก→น้อย
  var rows = labs.slice().sort(function (a, b) { return b.s.month - a.s.month; }), max = Math.max.apply(null, rows.map(function (r) { return r.s.month; })) || 1;
  return h("div", { cls: "cd-bars", role: "img", "aria-label": "ค่าใช้จ่ายต่อเดือนของแต่ละ lab" }, rows.map(function (r) {
    var w = Math.max(r.s.month / max * 100, r.s.month > 0 ? 0.8 : 0);
    return h("button", { type: "button", cls: "cd-row" + (CD_SEL.id === r.id ? " on" : ""), title: r.name + " · เปิดทิ้ง 1 เดือน " + baht(r.s.month) + " (" + money(r.s.month) + ") · ทำ 4 ชม. " + baht(r.s.perHours(4)), onclick: function () { CD_SEL.id = r.id; render(); } }, [h("span", { cls: "n", text: r.name }), h("span", { cls: "tr" }, [h("i", { style: "width:" + w + "%;background:" + r.color })]), h("span", { cls: "v" }, [h("b", { text: baht(r.s.month) }), h("small", { text: money(r.s.month) })])]);
  }));
}
function cdStack(lab) { // องค์ประกอบค่าใช้จ่ายของ lab ที่เลือก (เฉพาะรายการคงที่) · 4 อันดับแรก + อื่นๆ
  var items = lab.items.map(function (x) { return { n: x.n, v: x.k === "hr" ? x.r * x.q * COST_HRS : x.k === "mo" ? x.r * x.q : 0 }; }).filter(function (x) { return x.v > 0; }).sort(function (a, b) { return b.v - a.v; });
  var total = items.reduce(function (a, x) { return a + x.v; }, 0); if (!total) return h("p", { cls: "hint", text: "lab นี้ไม่มีรายการคงที่ — จ่ายตามการใช้เท่านั้น (ดูตารางด้านล่าง)" });
  var top = items.slice(0, 4), rest = items.slice(4).reduce(function (a, x) { return a + x.v; }, 0); if (rest > 0) top.push({ n: "อื่นๆ", v: rest });
  var dark = document.documentElement.getAttribute("data-theme") === "dark" || (document.documentElement.getAttribute("data-theme") !== "light" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches), col = function (i) { return CD_COL[Math.min(i, 4)][dark ? 1 : 0]; };
  return h("div", { cls: "cd-stack" }, [h("div", { cls: "bar", role: "img", "aria-label": "สัดส่วนค่าใช้จ่ายของ " + lab.name }, top.map(function (x, i) { return h("i", { title: x.n + " · " + baht(x.v) + "/เดือน (" + Math.round(x.v / total * 100) + "%)", style: "flex:" + x.v + ";background:" + col(i) }); })),
    h("div", { cls: "lg" }, top.map(function (x, i) { return h("div", {}, [h("i", { style: "background:" + col(i) }), h("span", { cls: "t", text: x.n }), h("b", { text: baht(x.v) }), h("small", { text: Math.round(x.v / total * 100) + "%" })]); }))]);
}
PAGES["lab-cost"] = function () {
  var labs = cdLabs(), sel = labs.filter(function (l) { return l.id === CD_SEL.id; })[0] || labs[0];
  var by = labs.slice().sort(function (a, b) { return b.s.month - a.s.month; }), top = by[0], topUc = by.filter(function (l) { return UC.some(function (u) { return u.id === l.id; }); })[0];
  var tile = function (lb, val, sub, c) { return h("div", { cls: "cd-kpi", style: "--c:" + c }, [h("div", { cls: "l", text: lb }), h("div", { cls: "v", text: val }), h("div", { cls: "u", text: sub })]); };
  var kpis = h("div", { cls: "cd-kpis" }, [tile("แพงสุดถ้าลืมลบ (ทุก lab)", baht(top.s.month) + "/เดือน", top.name + " · " + money(top.s.month), "#c62828"), tile("ทำ lab 4 ชม. แล้วลบ (ตัวแพงสุด)", baht(top.s.perHours(4)), top.name + " · " + money(top.s.perHours(4)), "#1d8102"), tile("แพงสุดในกลุ่ม use case", baht(topUc.s.month) + "/เดือน", topUc.name + " · " + money(topUc.s.month), "#a85a00"), tile("ถูกสุด (ตามการใช้)", baht(by[by.length - 1].s.month) + "/เดือน", by[by.length - 1].name, "#2b6cb0")]);
  var det = ["vm", "managed"].map(function (k) { var c = COSTD.mainlab[k]; var f = fold("mlc" + k, c.title + ": รายการค่าใช้จ่าย"); f.appendChild(costChips(c.items)); f.appendChild(costTable(c.items)); FOLD["mlc" + k] = 0; return f; });
  var panel = h("div", { cls: "cd-panel" }, [h("div", { cls: "cd-ph" }, [h("div", {}, [h("b", { text: sel.name }), h("small", { text: sel.big })]), h("button", { cls: "btn", type: "button", style: "white-space:nowrap", text: UC.some(function (u) { return u.id === sel.id; }) ? "เปิด use case นี้" : "ดูตาราง", onclick: function () { if (UC.some(function (u) { return u.id === sel.id; })) { UC_SEL.id = sel.id; go("lab-uc", {}, "Lab"); } } })]), costChips(sel.items), h("div", { cls: "cd-sub", text: "องค์ประกอบของค่าคงที่ (ต่อเดือน)" }), cdStack(sel), costTable(sel.items)]);
  return h("div", { cls: "cd" }, [crumbEl("Lab › Cost & Billing"), h("h1", { text: "ค่าใช้จ่าย & Bill management" }), h("p", { cls: "hint", style: "margin:-6px 0 12px" }, rich("เป็นเงินบาทตามอัตราสมมติ ==" + COST_THB + " บาท/ดอลลาร์== · เปิดทิ้ง = คิดเต็ม 730 ชม./เดือน · คลิกแท่งเพื่อดูรายละเอียด")), kpis,
    h("div", { cls: "cd-grid" }, [h("div", { cls: "cd-card" }, [h("h3", { text: "เปิดทิ้งไว้ 1 เดือน: lab ไหนแพงเท่าไร" }), cdBars(labs)]), h("div", { cls: "cd-card" }, [panel])]),
    h("div", { cls: "alert", style: "margin:14px 0" }, rich("หลักคิด: ==คิดตามชั่วโมงที่เปิดอยู่== (NAT, ALB, EC2, RDS, EKS) แพงถ้าลืมลบ · ==คิดตามการใช้== (Lambda, S3, CloudFront) แทบไม่เสียถ้าไม่มีคนใช้")), costCaveat(),
    h("h2", { text: "จัดการ bill: ทำอะไร ที่ไหน" }), costGen()].concat(det));
};
(function () { var L = NAV.Lab[0][1]; var i = L.map(function (x) { return x[0]; }).indexOf("lab-ap"); L.splice(i < 0 ? L.length : i + 1, 0, ["lab-cost", "ค่าใช้จ่าย & Bill"]); NAVICO["lab-cost"] = "💰"; })();
