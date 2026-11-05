// Lab เป็นแอปบน macOS (หน้าต่าง "Lab" ใน dock) + ตัวจัดการ go() บน Desktop: หน้า Laptop → เปิดหน้าต่าง Terminal/VS Code, Browser → Chrome, Lab → หน้าต่าง Lab, หน้า AWS → Chrome (ไม่พาออกจาก Desktop)
var LB = { page: "lab-ap", params: {}, on: false };
function labGo(page, params) { LB.page = page; LB.params = params || {}; UI.form = null; render(); }
function labApp() {
  LB.on = true; DESK.bsvc = "Lab";
  var sv = UI.svc, pg = UI.page, pa = UI.params, main;
  UI.svc = "Lab"; UI.page = LB.page; UI.params = LB.params;
  try { main = PAGES[LB.page] ? PAGES[LB.page]() : h("p", { text: "ไม่พบหน้า" }); } catch (e) { main = h("div", { cls: "alert error", text: "หน้านี้แสดงผลไม่ได้: " + (e && e.message) }); } finally { UI.svc = sv; UI.page = pg; UI.params = pa; }
  var nav = h("nav", { cls: "nav" });
  NAV.Lab.forEach(function (g) {
    if (g[0]) nav.appendChild(h("div", { cls: "grp", text: g[0] }));
    g[1].forEach(function (p) { var on = !!p[0] && (LB.page === p[0] || LB.params.from === p[0]); nav.appendChild(h("button", { type: "button", "data-p": p[0] || null, cls: (p[0] ? "" : "off") + (g[2] ? " mini" : ""), "aria-current": String(on), onclick: function () { if (p[0]) labGo(p[0], {}); } }, NAVICO[p[0]] ? [h("span", { cls: "ni", text: NAVICO[p[0]] }), h("span", { text: p[1] })] : [p[1]])); });
  });
  return h("div", { cls: "awsemb labemb", "data-svc": "Lab" }, [h("div", { cls: "body" }, [nav, h("main", { cls: "main" }, [main])])]);
}
// คืน true ถ้าจัดการเองแล้ว (ไม่ต้องให้ go() พาออกจาก Desktop)
function awsInterceptGo(page, svc, params) {
  if (UI.page !== "desk") return false;
  var f = svc; if (!f) { for (var s in NAV) if (navHas(s, page)) { f = s; break; } }
  var op = function (id) { dmOpen(id); };
  if (page === "desk") { render(); return true; }
  if (page === "term") { op("term"); render(); return true; }
  if (page === "files") { op("files"); render(); return true; }
  if (page === "browser") { op("chrome"); render(); return true; }
  if (f === "Lab" || (!f && /^lab-/.test(page))) { op("lab"); labGo(page, params); return true; }
  if (f === "Laptop" || f === "Browser") return false;
  if (!f && !PAGES[page]) return false;
  // หน้า AWS: เปิดใน Chrome
  if (!AC.on) { op("chrome"); W.res = { site: "awsconsole" }; }
  awsGo(page, params, svc); return true;
}
