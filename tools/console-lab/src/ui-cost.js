// ===== Cost & Bill management: การ์ดในหน้า use case ทุกใบ + หน้า Lab รวม =====
function money(n) { return "$" + (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n)); }
function moneyH(n) { return "$" + (n < 1 ? n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") : n.toFixed(2)); }
var CG = { red: ["#e0556f", "#f59a7a"], green: ["#6aa81a", "#6fe0b5"], amber: ["#d97706", "#f59e0b"], blue: ["#2563eb", "#7c3aed"], slate: ["#334155", "#64748b"] };
var CG_LV = [["#6aa81a", "#6fe0b5"], ["#5f9512", "#a9d94f"], ["#b8780c", "#f5c04a"], ["#cc5a1f", "#f7a46a"], ["#d04a66", "#f58a9e"]]; // ไล่ตามระดับราคา (เขียว→แดง)
function gstyle(g) { return "--g1:" + g[0] + ";--g2:" + g[1]; }
function bahtS(usd, perHr) { var b = usd * COST_THB; if (b <= 0) return "ฟรี"; if (b < (perHr ? 0.01 : 1)) return perHr ? "<฿0.01" : "<฿1"; return baht(usd).replace(/(\.\d)$/, "$1").replace(/^฿(\d)\.(\d)$/, function (m) { return perHr ? "฿" + b.toFixed(2) : m; }); }
function usdS(n) { return n <= 0 ? "$0" : n < 0.01 ? "<$0.01" : money(n); }
function riskOf(month) { var b = month * COST_THB; return b < 100 ? ["ต่ำ", "#22a559", "แทบไม่มีโอกาสบิลบาน"] : b < 1500 ? ["กลาง", "#e08e0b", "ลืมลบนานๆ เริ่มรู้สึก"] : ["สูง", "#dc3545", "ลืมลบ 1 เดือน = บิลก้อนใหญ่"]; }
function costEx(ex) {
  if (!ex || !ex.length) return h("span");
  var rows = ex.map(function (x) { return h("tr", {}, [h("td", {}, [h("b", { text: x.n }), x.free ? h("div", { cls: "hint", style: "margin:2px 0 0", text: "หักแล้ว: " + x.free }) : h("span")]), h("td", { text: x.a }), h("td", { style: "text-align:right;white-space:nowrap;font-weight:700", text: baht(x.usd) + " (" + usdS(x.usd) + ")" })]); });
  return h("div", { style: "margin-top:12px" }, [h("div", { cls: "hint", style: "margin:0 0 6px", text: "📊 ตัวอย่างรายการที่คิดตามการใช้ (สมมติการใช้ → ค่าใช้จ่ายต่อเดือน · บวกเพิ่มจากรายการคงที่ด้านบน)" }), h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, [h("th", { text: "สถานการณ์" }), h("th", { text: "สมมติว่าใช้" }), h("th", { text: "≈ ต่อเดือน" })])]), h("tbody", {}, rows)])])]);
}
function costTable(items, ex) {
  var rows = items.map(function (x) {
    var per = x.k === "hr" ? moneyH(x.r * x.q) + "/ชม." + (x.q > 1 ? " (" + x.q + " ตัว)" : "") : x.k === "mo" ? money(x.r * x.q) + "/เดือน" : "ตามการใช้";
    var moU = x.k === "hr" ? x.r * x.q * COST_HRS : x.k === "mo" ? x.r * x.q : null, mo = moU == null ? "–" : baht(moU) + " (" + money(moU) + ")";
    return h("tr", {}, [h("td", {}, [h("b", { text: x.n }), x.note ? h("div", { cls: "hint", style: "margin:2px 0 0", text: x.note }) : h("span")]), h("td", { text: x.k === "use" ? x.unit : per }), h("td", { style: "text-align:right;white-space:nowrap", text: mo }), h("td", { style: "text-align:center" }, [h("span", { cls: "cd-idle " + (x.idle ? "on" : "off"), title: x.idle ? "เครื่อง/ทรัพยากรนี้คิดเงินต่อเนื่อง แม้ไม่มีใครใช้" : "ไม่มีผู้ใช้ = ไม่เสียเงิน", text: x.idle ? "คิดเงินตลอด" : "ไม่คิดเงิน" })])]);
  });
  var s = costSum(items);
  rows.push(h("tr", { cls: "cd-total" }, [h("td", { text: "รวมรายการคงที่ (ไม่รวมที่คิดตามการใช้)" }), h("td", { text: s.hr > 0 ? moneyH(s.hr) + "/ชม." : "–" }), h("td", { style: "text-align:right", text: baht(s.month) + " (" + money(s.month) + ")" }), h("td")]));
  return h("div", {}, [h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, [h("th", { text: "รายการ" }), h("th", { text: "คิดตาม" }), h("th", { text: "≈ ต่อเดือน (730 ชม.)" }), h("th", { text: "ตอนไม่มีคนใช้" })])]), h("tbody", {}, rows)])]), costEx(ex)]);
}
function costChips(items, bench) {
  var s = costSum(items), vi = bench ? costVerdict(s.month, bench).i : null;
  var chip = function (lb, val, sub, g, suf, ic) { return h("div", { cls: "cd-kpi", style: gstyle(g) }, [h("span", { cls: "ic", text: ic }), h("div", { cls: "l", text: lb }), h("div", { cls: "v" }, [val, suf ? h("small", { text: suf }) : null].filter(Boolean)), h("div", { cls: "u", text: sub })]); };
  return h("div", { cls: "cd-kpis" }, [chip("เปิดทิ้งไว้ 1 เดือน", bahtS(s.month), "≈ " + usdS(s.month), vi == null ? CG.red : CG_LV[vi], "", "📅"), chip("ทำ lab 4 ชม. แล้ว destroy", bahtS(s.perHours(4)), "≈ " + usdS(s.perHours(4)), CG.green, "", "⏳"), chip("ค่าคงที่ต่อชั่วโมง", bahtS(s.hr, true), "≈ " + usdS(s.hr), CG.blue, s.hr > 0 ? "/ชม." : "", "🕒")]);
}
function costCaveat() { return h("p", { cls: "hint" }, rich("✓ ราคา On-Demand ap-southeast-1 (USD) ตรวจกับ AWS Price List API เมื่อ 28 ต.ค. 2026 · ไม่รวมภาษี/ค่าโอนข้อมูลตามการใช้จริง · โควต้า free tier มาจากเอกสาร AWS · ราคาเปลี่ยนได้ ตรวจซ้ำที่ calculator.aws ก่อนตัดสินใจ · ค่าเงินบาทใช้อัตราสมมติ " + COST_THB + " บาท/ดอลลาร์ (ปรับที่ COST_THB)")); }
function costVerdictCard(c, vd, lv) { // ราคานี้ถูก/ปกติ/แพง? พร้อมสเกลเทียบเกณฑ์
  var m = costSum(c.items).month, top = c.bench[c.bench.length - 1] * 1.4, pos = Math.min(m / top, 1) * 100, seg = [0].concat(c.bench).concat([top]);
  var stops = COST_LV.map(function (l, i) { return l[2] + " " + (((seg[i] + seg[i + 1]) / 2) / top * 100).toFixed(1) + "%"; }).join(", ");
  var bar = h("div", { cls: "cd-scale", role: "img", "aria-label": "ราคานี้ถือว่า" + vd.label }, [h("div", { cls: "g", style: "background:linear-gradient(90deg," + stops + ")" })].concat(c.bench.map(function (bv) { return h("i", { style: "left:" + (bv / top * 100) + "%", title: baht(bv) }); }), [h("b", { style: "left:" + pos + "%" }, [h("span", { text: bahtS(m) })])]));
  return h("div", { cls: "cd-verdict", style: "--c:" + vd.color }, [h("div", { cls: "hd" }, [h("span", { cls: "q", text: "ราคานี้ถือว่า" }), h("span", { cls: "lv", text: vd.label }), h("span", { cls: "q2", text: "(ใช้งานจริงทั้งเดือน)" })]), bar,
    h("div", { cls: "sc" }, COST_LV.map(function (l, i) { return h("span", { text: l[0], style: "flex:" + (seg[i + 1] - seg[i]) + (i === vd.i ? ";color:" + l[1] + ";font-weight:800" : "") }); })),
    h("ul", {}, [h("li", {}, [h("b", { text: "เทียบกับทั่วไป: " }), c.benchRef]), h("li", {}, [h("b", { text: "ความเห็น: " }), c.benchWhy]), h("li", {}, [h("b", { text: "ถ้าแค่ฝึก lab 4 ชม. แล้วลบ: " }), h("span", { style: "color:" + lv[1] + ";font-weight:800", text: lv[0] }), " (" + bahtS(costSum(c.items).perHours(4)) + ") — ถูกกว่ามากเทียบกับเปิดทิ้ง จึงต้อง destroy ทุกครั้ง"])])]);
}
function costBlock(c) {
  var rk = riskOf(costSum(c.items).month), cs0 = costSum(c.items), vd = c.bench ? costVerdict(cs0.month, c.bench) : null, lv = costLabVerdict(cs0.perHours(4));
  var out = h("div", {}, [h("div", { cls: "cd-call", style: "--c:" + rk[1] }, [h("div", { cls: "ic", text: "💰" }), h("div", { cls: "tx" }, [h("b", { text: c.big }), h("small", { text: "ความเสี่ยงบิลบาน: " + rk[0] + " · " + rk[2] })]), h("span", { cls: "rk", text: rk[0] })]), costChips(c.items, c.bench), vd ? costVerdictCard(c, vd, lv) : h("span"), costTable(c.items, c.ex)]);
  if (c.drivers) out.appendChild(infoCard([["อะไรทำให้บิลพุ่ง", "#c62828", c.drivers.join(" · ")], ["ลดค่าใช้จ่าย", "#1d8102", c.cut.join(" · ")], ["ตั้งเตือน/จับตา", "#2b6cb0", c.watch.join(" · ")], ["หยุดจ่ายเมื่อเลิกใช้", "#a85a00", c.stop]]));
  out.appendChild(costCaveat()); return out;
}
function costGen() { // คู่มือจัดการ bill เป็นการ์ดเรียงเป็นขั้น
  return h("div", { cls: "cd-guide" }, COSTD.gen.map(function (g, i) { return h("div", { cls: "gc", style: "--c:" + g[1] }, [h("div", { cls: "hd" }, [h("span", { cls: "no", text: String(i + 1) }), h("b", { text: g[0] })]), h("div", { cls: "bd" }, rich(g[2]))]); }));
}
FOLD.uccost = 1;
var CDB_SEL = { id: "ecs" }, CDB_COL = [["#2a78d6", "#3987e5"], ["#eb6834", "#d95926"], ["#1baf7a", "#199e70"], ["#eda100", "#c98500"], ["#e87ba4", "#d55181"]];
function cdLabs() { // รวม use case + main lab → [{name, items, big, uc?}]
  var out = UC.filter(function (u) { return COSTD.uc[u.id]; }).map(function (u) { var c = COSTD.uc[u.id]; return { id: u.id, name: u.no + ". " + u.title.split(":")[0], color: u.color, items: c.items, big: c.big, bench: c.bench }; });
  [["vm", "main lab (VM)", "#475569"], ["managed", "managed (EKS)", "#475569"]].forEach(function (x) { var c = COSTD.mainlab[x[0]]; out.push({ id: x[0], name: x[1], color: x[2], items: c.items, big: c.note, bench: c.bench }); });
  return out.map(function (l) { l.s = costSum(l.items); return l; });
}
function cdBars(labs) { // แท่งแนวนอนชุดเดียว: ค่าเปิดทิ้ง 1 เดือน (บาท) · เรียงมาก→น้อย
  var rows = labs.slice().sort(function (a, b) { return b.s.month - a.s.month; }), max = Math.max.apply(null, rows.map(function (r) { return r.s.month; })) || 1;
  return h("div", { cls: "cd-bars", role: "img", "aria-label": "ค่าใช้จ่ายต่อเดือนของแต่ละ lab" }, rows.map(function (r) {
    var w = Math.max(r.s.month / max * 100, r.s.month > 0 ? 0.8 : 0);
    return h("button", { type: "button", cls: "cd-row" + (CDB_SEL.id === r.id ? " on" : ""), title: r.name + " · เปิดทิ้ง 1 เดือน " + baht(r.s.month) + " (" + money(r.s.month) + ") · ทำ 4 ชม. " + baht(r.s.perHours(4)), onclick: function () { CDB_SEL.id = r.id; render(); } }, [h("span", { cls: "n" }, [r.name, r.bench ? (function () { var v = costVerdict(r.s.month, r.bench); return h("em", { cls: "vd", style: "--c:" + v.color, text: v.label }); })() : null].filter(Boolean)), h("span", { cls: "tr" }, [h("i", { style: "width:" + w + "%;background:" + (r.bench ? costVerdict(r.s.month, r.bench).fill : r.color) })]), h("span", { cls: "v" }, [h("b", { text: baht(r.s.month) }), h("small", { text: money(r.s.month) })])]);
  }));
}
function cdStack(lab) { // องค์ประกอบค่าใช้จ่ายของ lab ที่เลือก (เฉพาะรายการคงที่) · 4 อันดับแรก + อื่นๆ
  var items = lab.items.map(function (x) { return { n: x.n, v: x.k === "hr" ? x.r * x.q * COST_HRS : x.k === "mo" ? x.r * x.q : 0 }; }).filter(function (x) { return x.v > 0; }).sort(function (a, b) { return b.v - a.v; });
  var total = items.reduce(function (a, x) { return a + x.v; }, 0); if (!total) return h("p", { cls: "hint", text: "lab นี้ไม่มีรายการคงที่ — จ่ายตามการใช้เท่านั้น (ดูตารางด้านล่าง)" });
  var top = items.slice(0, 4), rest = items.slice(4).reduce(function (a, x) { return a + x.v; }, 0); if (rest > 0) top.push({ n: "อื่นๆ", v: rest });
  var dark = document.documentElement.getAttribute("data-theme") === "dark" || (document.documentElement.getAttribute("data-theme") !== "light" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches), col = function (i) { return CDB_COL[Math.min(i, 4)][dark ? 1 : 0]; };
  return h("div", { cls: "cd-stack" }, [h("div", { cls: "bar", role: "img", "aria-label": "สัดส่วนค่าใช้จ่ายของ " + lab.name }, top.map(function (x, i) { return h("i", { title: x.n + " · " + baht(x.v) + "/เดือน (" + Math.round(x.v / total * 100) + "%)", style: "flex:" + x.v + ";background:" + col(i) }); })),
    h("div", { cls: "lg" }, top.map(function (x, i) { return h("div", {}, [h("i", { style: "background:" + col(i) }), h("span", { cls: "t", text: x.n }), h("b", { text: baht(x.v) }), h("small", { text: Math.round(x.v / total * 100) + "%" })]); }))]);
}
PAGES["lab-cost"] = function () {
  var labs = cdLabs(), sel = labs.filter(function (l) { return l.id === CDB_SEL.id; })[0] || labs[0];
  var by = labs.slice().sort(function (a, b) { return b.s.month - a.s.month; }), top = by[0], topUc = by.filter(function (l) { return UC.some(function (u) { return u.id === l.id; }); })[0];
  var tile = function (lb, val, sub, g, ic) { return h("div", { cls: "cd-kpi", style: gstyle(g) }, [h("span", { cls: "ic", text: ic }), h("div", { cls: "l", text: lb }), h("div", { cls: "v", text: val }), h("div", { cls: "u", text: sub })]); };
  var kpis = h("div", { cls: "cd-kpis" }, [tile("แพงสุดถ้าลืมลบ (ทุก lab)", baht(top.s.month) + "/เดือน", top.name + " · " + money(top.s.month), CG_LV[4], "🔥"), tile("ทำ lab 4 ชม. แล้วลบ (ตัวแพงสุด)", baht(top.s.perHours(4)), top.name + " · " + money(top.s.perHours(4)), CG.green, "⏳"), tile("แพงสุดในกลุ่ม use case", baht(topUc.s.month) + "/เดือน", topUc.name + " · " + money(topUc.s.month), CG_LV[2], "📦"), tile("ถูกสุด (ตามการใช้)", baht(by[by.length - 1].s.month) + "/เดือน", by[by.length - 1].name, CG_LV[0], "🌱")]);
  var det = ["vm", "managed"].map(function (k) { var c = COSTD.mainlab[k]; var f = fold("mlc" + k, c.title + ": รายการค่าใช้จ่าย"); f.appendChild(costChips(c.items)); f.appendChild(costTable(c.items, c.ex)); FOLD["mlc" + k] = 0; return f; });
  var panel = h("div", { cls: "cd-panel" }, [h("div", { cls: "cd-ph" }, [h("div", {}, [h("b", { text: sel.name }), h("small", { text: sel.big })]), h("button", { cls: "btn", type: "button", style: "white-space:nowrap", text: UC.some(function (u) { return u.id === sel.id; }) ? "เปิด use case นี้" : "ไปที่แท็บค่าใช้จ่าย", onclick: function () { if (UC.some(function (u) { return u.id === sel.id; })) { UC_SEL.id = sel.id; UC_SEL.sec = "cost"; go("lab-uc", {}, "Lab"); } } })]), costChips(sel.items, sel.bench), h("div", { cls: "cd-sub", text: "องค์ประกอบของค่าคงที่ (ต่อเดือน)" }), cdStack(sel)]);
  var detail = h("div", { cls: "cd-card", style: "margin-top:14px" }, [h("h3", { text: "รายการค่าใช้จ่ายของ " + sel.name }), costTable(sel.items, sel.ex)]);
  return h("div", { cls: "cd" }, [crumbEl("Lab › Cost & Billing"), h("h1", { text: "ค่าใช้จ่าย & Bill management" }), h("p", { cls: "hint", style: "margin:-6px 0 12px" }, rich("เป็นเงินบาทตามอัตราสมมติ **" + COST_THB + " บาท/ดอลลาร์** · เปิดทิ้ง = คิดเต็ม 730 ชม./เดือน · คลิกแท่งเพื่อดูรายละเอียด")), kpis,
    h("div", { cls: "cd-grid" }, [h("div", { cls: "cd-card" }, [h("h3", { text: "เปิดทิ้งไว้ 1 เดือน: lab ไหนแพงเท่าไร" }), cdBars(labs)]), h("div", { cls: "cd-card" }, [panel])]), detail,
    h("div", { cls: "cd-rule" }, [h("div", { cls: "r1" }, [h("b", { text: "คิดตามชั่วโมงที่เปิดอยู่" }), h("span", { text: "NAT · ALB · EC2 · RDS · EKS" }), h("em", { text: "แพงถ้าลืมลบ" })]), h("div", { cls: "r2" }, [h("b", { text: "คิดตามการใช้" }), h("span", { text: "Lambda · S3 · CloudFront" }), h("em", { text: "แทบไม่เสียถ้าไม่มีคนใช้" })])]), costCaveat(),
    h("h2", { text: "จัดการ bill: ทำอะไร ที่ไหน" }), costGen()].concat(det));
};
(function () { var L = NAV.Lab[0][1]; var i = L.map(function (x) { return x[0]; }).indexOf("lab-ap"); L.splice(i < 0 ? L.length : i + 1, 0, ["lab-cost", "ค่าใช้จ่าย & Bill"]); NAVICO["lab-cost"] = "💰"; })();
