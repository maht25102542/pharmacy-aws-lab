// AWS console เปิดในหน้าต่าง Chrome/Safari บน Desktop: ใช้หน้า AWS จำลองชุดเดียวกับแท็บบน (VPC/EC2/…) แต่ฝังในหน้าต่างเบราว์เซอร์
var AC = { svc: "EC2", page: "ec2-dash", params: {}, on: false, menu: false };
var AWS_HOST = "console.aws.amazon.com";
function awsSvcs() { return Object.keys(NAV).filter(function (k) { return !/^(Laptop|Browser|Lab)$/.test(k); }); }
function awsSlug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function awsUrl() { return "https://" + AWS_HOST + "/" + awsSlug(AC.svc) + "/home?region=ap-southeast-1#/" + AC.page; }
function isAwsUrl(u) { return new RegExp("^https?://" + AWS_HOST.replace(/\./g, "\\.") + "(/|$|\\?|#)", "i").test(String(u || "")); }
function awsFromUrl(u) {
  var m = new RegExp("^https?://" + AWS_HOST.replace(/\./g, "\\.") + "/([^/?#]*)", "i").exec(u || ""), seg = m && m[1], sv = awsSvcs().filter(function (s) { return awsSlug(s) === seg; })[0];
  if (!sv) { sv = "EC2"; }
  var hp = /#\/([\w-]+)/.exec(u || ""), pg = hp && navHas(sv, hp[1]) ? hp[1] : NAVHOME[sv] || NAV[sv][0][1][0][0];
  AC.svc = sv; AC.page = pg; AC.params = {}; W.acs = sv; W.acp = pg;
}
function awsTitle() { return (SVC_NAME[AC.svc] || AC.svc) + " Management Console"; }
function awsGo(page, params, svc) {
  if (svc) AC.svc = svc; else if (!navHas(AC.svc, page)) { awsSvcs().some(function (s) { if (navHas(s, page)) { AC.svc = s; return true; } return false; }); }
  AC.page = page; AC.params = params || {}; UI.form = null; AC.menu = false; W.acs = AC.svc; W.acp = AC.page; W.addr = awsUrl(); render();
}
// go() ที่เรียกจากหน้า AWS ที่ฝังอยู่ ให้ไปเปลี่ยนหน้าในหน้าต่าง ไม่พาออกจาก Desktop
function awsInterceptGo(page, svc) {
  if (!(AC.on && UI.page === "desk")) return false;
  if (svc && !/^(Laptop|Browser|Lab)$/.test(svc) === false) return false;
  if (!svc) { var found = null; for (var s in NAV) if (navHas(s, page)) { found = s; break; } if (found && /^(Laptop|Browser|Lab)$/.test(found)) return false; if (!found && !PAGES[page]) return false; } /* หน้าย่อยที่ไม่อยู่ในเมนู (เช่น vpc-create) ถือเป็นหน้าของบริการที่เปิดอยู่ */
  return true;
}
function awsEmbed() {
  if (W.acs && (W.acs !== AC.svc || W.acp !== AC.page)) { AC.svc = W.acs; AC.page = W.acp || AC.page; AC.params = {}; } // ย้อน/ไปข้างหน้า (whGo คืนค่า W.acs/acp)
  var sv = UI.svc, pg = UI.page, pa = UI.params, main;
  UI.svc = AC.svc; UI.page = AC.page; UI.params = AC.params;
  try { main = PAGES[AC.page] ? PAGES[AC.page]() : h("p", { text: "ไม่พบหน้า" }); } catch (e) { main = h("div", { cls: "alert error", text: "หน้านี้แสดงผลไม่ได้: " + (e && e.message) }); } finally { UI.svc = sv; UI.page = pg; UI.params = pa; }
  W.acs = AC.svc; W.acp = AC.page; W.addr = awsUrl();
  var nav = h("nav", { cls: "nav" });
  NAV[AC.svc].forEach(function (g) {
    if (g[0]) nav.appendChild(h("div", { cls: "grp", text: g[0] }));
    g[1].forEach(function (p) { var on = !!p[0] && AC.page === p[0]; nav.appendChild(h("button", { type: "button", cls: p[0] ? "" : "off", "aria-current": String(on), onclick: function () { if (p[0]) awsGo(p[0], {}, AC.svc); } }, [p[1]])); });
  });
  var svcBtn = h("button", { type: "button", cls: "svcbtn", "aria-haspopup": "true", "aria-expanded": "false", html: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1.400"/><circle cx="8" cy="3" r="1.400"/><circle cx="13" cy="3" r="1.400"/><circle cx="3" cy="8" r="1.400"/><circle cx="8" cy="8" r="1.400"/><circle cx="13" cy="8" r="1.400"/><circle cx="3" cy="13" r="1.400"/><circle cx="8" cy="13" r="1.400"/><circle cx="13" cy="13" r="1.400"/></svg> Services' }), svcMenu = h("div", { cls: "svcmenu", hidden: "hidden" });
  svcMenuInit(svcBtn, svcMenu, true);
  var top = h("header", { cls: "top awsetop" }, [h("span", { cls: "awslogo", text: "aws" }), h("span", { cls: "svcwrap" }, [svcBtn, svcMenu]), h("div", { cls: "gsearch" }, [h("input", { type: "search", placeholder: "Search   [Alt+S]", "aria-label": "Search" })]), h("div", { cls: "hright" }, [h("button", { type: "button", cls: "pillr", text: "Asia Pacific (Singapore) ▾" }), h("span", { cls: "acctname", text: "tf-admin @ 0000-0000-0000 ▾" })])]);
  return h("div", { cls: "awsemb", "data-svc": AC.svc }, [top, h("div", { cls: "body" }, [nav, h("main", { cls: "main" }, [main])])]);
}

document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".svcwrap")) return; [].forEach.call(document.querySelectorAll(".awsemb .svcmenu"), function (m) { m.hidden = true; }); });
