// ===== Cost & Bill management: การ์ดในหน้า use case ทุกใบ + หน้า Lab รวม =====
function money(n) { return "$" + (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n)); }
function moneyH(n) { return "$" + (n < 1 ? n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") : n.toFixed(2)); }
function costTable(items) {
  var rows = items.map(function (x) {
    var per = x.k === "hr" ? moneyH(x.r * x.q) + "/ชม." + (x.q > 1 ? " (" + x.q + " ตัว)" : "") : x.k === "mo" ? money(x.r * x.q) + "/เดือน" : "ตามการใช้";
    var mo = x.k === "hr" ? money(x.r * x.q * COST_HRS) : x.k === "mo" ? money(x.r * x.q) : "–";
    return h("tr", {}, [h("td", {}, [h("b", { text: x.n }), x.note ? h("div", { cls: "hint", style: "margin:2px 0 0", text: x.note }) : h("span")]), h("td", { text: x.k === "use" ? x.unit : per }), h("td", { style: "text-align:right;white-space:nowrap", text: mo }), h("td", { style: "text-align:center", text: x.idle ? "🔴 คิดเงิน" : "🟢 ไม่คิด" })]);
  });
  var s = costSum(items);
  rows.push(h("tr", { style: "font-weight:700;background:var(--hl,#f3f6f9)" }, [h("td", { text: "รวมรายการคงที่ (ไม่รวมที่คิดตามการใช้)" }), h("td", { text: moneyH(s.hr) + "/ชม." }), h("td", { style: "text-align:right", text: money(s.month) }), h("td")]));
  return h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, [h("th", { text: "รายการ" }), h("th", { text: "คิดตาม" }), h("th", { text: "≈ ต่อเดือน (730 ชม.)" }), h("th", { text: "ตอนไม่มีคนใช้" })])]), h("tbody", {}, rows)])]);
}
function costChips(items) {
  var s = costSum(items), chip = function (lb, val, c) { return h("div", { style: "flex:1;min-width:170px;border:1px solid var(--line);border-left:4px solid " + c + ";border-radius:8px;padding:8px 12px" }, [h("div", { cls: "hint", style: "margin:0", text: lb }), h("div", { style: "font-size:1.4rem;font-weight:800;color:" + c, text: val })]); };
  return h("div", { style: "display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 12px" }, [chip("เปิดทิ้งไว้ 1 เดือน", "≈ " + money(s.month), "#c62828"), chip("ทำ lab 4 ชั่วโมงแล้ว destroy", "≈ " + money(s.perHours(4)), "#1d8102"), chip("ค่าคงที่ต่อชั่วโมง", moneyH(s.hr) + "/ชม.", "#2b6cb0")]);
}
function costCaveat() { return h("p", { cls: "hint" }, rich("⚠ ตัวเลขเป็น ==ประมาณการ== ap-southeast-1 (USD) ไม่รวมภาษี/ค่าโอนข้อมูลจริง · ยังไม่ยืนยันกับหน้า pricing ของ AWS (ยืนยันแล้วเฉพาะ public IPv4 $0.005/ชม. และ EKS $0.10/ชม.) → ตรวจที่ calculator.aws ก่อนตัดสินใจ")); }
function costBlock(c) {
  var out = h("div", {}, [h("div", { cls: "alert", style: "margin:0 0 6px", text: "💰 " + c.big }), costChips(c.items), costTable(c.items)]);
  if (c.drivers) out.appendChild(infoCard([["อะไรทำให้บิลพุ่ง", "#c62828", c.drivers.join(" · ")], ["ลดค่าใช้จ่าย", "#1d8102", c.cut.join(" · ")], ["ตั้งเตือน/จับตา", "#2b6cb0", c.watch.join(" · ")], ["หยุดจ่ายเมื่อเลิกใช้", "#a85a00", c.stop]]));
  out.appendChild(costCaveat()); return out;
}
function costGen() { return infoCard(COSTD.gen); }
FOLD.uccost = 1;
PAGES["lab-cost"] = function () {
  var rows = UC.map(function (u) { var c = COSTD.uc[u.id]; if (!c) return null; var s = costSum(c.items); return h("tr", {}, [h("td", {}, [h("b", { text: u.no + ". " + u.title.split(":")[0] }), h("div", { cls: "hint", style: "margin:2px 0 0", text: c.big })]), h("td", { style: "text-align:right;white-space:nowrap", text: money(s.month) }), h("td", { style: "text-align:right;white-space:nowrap", text: money(s.perHours(4)) }), h("td", {}, [h("button", { cls: "btn", type: "button", style: "white-space:nowrap", text: "รายละเอียด", onclick: function () { UC_SEL.id = u.id; go("lab-uc", {}, "Lab"); } })])]); }).filter(Boolean);
  ["vm", "managed"].forEach(function (k) { var c = COSTD.mainlab[k], s = costSum(c.items); rows.push(h("tr", {}, [h("td", {}, [h("b", { text: c.title }), h("div", { cls: "hint", style: "margin:2px 0 0", text: c.note })]), h("td", { style: "text-align:right;white-space:nowrap", text: money(s.month) }), h("td", { style: "text-align:right;white-space:nowrap", text: money(s.perHours(4)) }), h("td")])); });
  var det = ["vm", "managed"].map(function (k) { var c = COSTD.mainlab[k]; var f = fold("mlc" + k, c.title + ": รายการค่าใช้จ่าย"); f.appendChild(costChips(c.items)); f.appendChild(costTable(c.items)); FOLD["mlc" + k] = 0; return f; });
  return h("div", {}, [crumbEl("Lab › Cost & Billing"), h("h1", { text: "ค่าใช้จ่าย & Bill management (ทุก lab)" }), h("div", { cls: "card" }, [h("div", { cls: "cb" }, [
    h("div", { cls: "alert" }, rich("หลักคิด: ค่าใช้จ่ายมี 2 แบบ — ==คิดตามชั่วโมงที่เปิดอยู่== (NAT, ALB, EC2, RDS, EKS) กับ ==คิดตามการใช้== (Lambda, S3, CloudFront) · lab ที่ลืมลบมักพังด้วยแบบแรก")),
    h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, [h("th", { text: "Lab" }), h("th", { text: "≈ เปิดทิ้ง 1 เดือน" }), h("th", { text: "≈ ทำ 4 ชม." }), h("th")])]), h("tbody", {}, rows)])]),
    costCaveat(), h("h2", { text: "จัดการ bill: ทำอะไร ที่ไหน" }), costGen()].concat(det))])]);
};
(function () { var L = NAV.Lab[0][1]; var i = L.map(function (x) { return x[0]; }).indexOf("lab-ap"); L.splice(i < 0 ? L.length : i + 1, 0, ["lab-cost", "ค่าใช้จ่าย & Bill"]); NAVICO["lab-cost"] = "💰"; })();
