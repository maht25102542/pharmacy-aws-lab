// System Settings (แอปบน macOS): ตัวควบคุมของตัวจำลอง — ความเร็ว / ธีม / สี / Reset (My IP + บัญชีอยู่ใน AWS console ที่เมนูบัญชีมุมขวาบน)
var ST = { pane: "general", q: "" };
var ST_PANES = [["general", "General", "ความเร็วของตัวจำลอง", "#8a8a90"], ["appearance", "Appearance", "ธีมและสี", "#2a7fff"], ["reset", "Reset", "ล้างข้อมูลตัวจำลอง", "#ff453a"], ["preview", "Preview เว็บ", "GitHub · Jenkins · SonarQube · Argo CD · เว็บร้านยา", "#ff9f0a"], ["about", "About", "เกี่ยวกับ", "#34c759"]];
function stSet(id, v) { var el = document.getElementById(id); if (!el) return; el.value = v; el.dispatchEvent(new Event("change")); }
function stOpts(id) { var el = document.getElementById(id); return el ? [].map.call(el.options, function (o) { return [o.value, o.textContent]; }) : []; }
function stCur(id) { var el = document.getElementById(id); return el ? el.value : ""; }
function stSeg(id, opts) { return h("div", { cls: "stseg" }, opts.map(function (o) { return h("button", { type: "button", cls: stCur(id) === o[0] ? "on" : "", text: o[1], onclick: function () { stSet(id, o[0]); render(); } }); })); }
function stSel(id) { return h("select", { cls: "stsel", "aria-label": id, onchange: function (e) { stSet(id, e.target.value); render(); } }, stOpts(id).map(function (o) { return h("option", { value: o[0], text: o[1], selected: stCur(id) === o[0] ? "selected" : null }); })); }
function stRow(label, sub, ctl) { return h("div", { cls: "strow" }, [h("div", { cls: "stl" }, [h("b", { text: label }), sub ? h("small", { text: sub }) : null]), ctl]); }
function settingsReset() { fresh(); UI.sel = {}; UI.form = null; UI.held = null; if (typeof AC !== "undefined") { AC.svc = "EC2"; AC.page = "ec2-dash"; } W.res = null; W.addr = ""; if (typeof TERM !== "undefined") { TERM.lines = []; } flash("info", "ล้างสถานะแล้ว เหลือแค่ default VPC เหมือนบัญชีใหม่"); render(); }
function settingsApp() {
  var side = h("div", { cls: "stside" }), main = h("div", { cls: "stmain" });
  var q = h("input", { type: "search", cls: "stq", placeholder: "Search", value: ST.q, oninput: function (e) { ST.q = e.target.value; render(); } });
  setTimeout(function () { if (ST.q) { q.focus(); q.setSelectionRange(ST.q.length, ST.q.length); } }, 0);
  side.appendChild(h("div", { cls: "stqw" }, [h("span", { html: typeof fdSym === "function" ? fdSym("search") : "" }), q]));
  ST_PANES.filter(function (p) { return !ST.q || (p[1] + p[2]).toLowerCase().indexOf(ST.q.toLowerCase()) >= 0; }).forEach(function (p) {
    side.appendChild(h("button", { type: "button", cls: "stsi" + (ST.pane === p[0] ? " on" : ""), onclick: function () { ST.pane = p[0]; render(); } }, [h("i", { style: "background:" + p[3], text: p[1].charAt(0) }), h("span", { text: p[1] })]));
  });
  var cur = ST_PANES.filter(function (p) { return p[0] === ST.pane; })[0] || ST_PANES[0];
  main.appendChild(h("h2", { text: cur[1] }));
  if (cur[0] === "general") main.appendChild(h("div", { cls: "stgrp" }, [stRow("ความเร็วของตัวจำลอง", "เสร็จทันที = ผลออกเลย · เวลาเหมือนจริง = รอตามเวลา AWS จริง (เช่น สร้าง NAT ~ 1 นาที)", stSeg("speedsel", stOpts("speedsel")))]));
  if (cur[0] === "appearance") main.appendChild(h("div", { cls: "stgrp" }, [stRow("Appearance", "โหมดสว่าง/มืด ของทั้งหน้า", stSeg("theme", stOpts("theme"))), stRow("สีธีม", "ชุดสีของหน้า Lab (ค่าเริ่มต้น: ผสม พื้นชานม)", stSel("pal"))]));
  if (cur[0] === "reset") main.appendChild(h("div", { cls: "stgrp" }, [stRow("Reset ข้อมูลตัวจำลอง", "ล้าง VPC/EC2/ฯลฯ ที่สร้างไว้ทั้งหมด กลับเป็นบัญชีใหม่ที่มีแค่ default VPC (ไม่แตะไฟล์ที่คุณแก้)", h("button", { type: "button", cls: "stbtn", text: "Reset…", onclick: settingsReset }))]));
  if (cur[0] === "preview") {
    main.appendChild(h("div", { cls: "alert info", text: "ⓘ หน้านี้ใช้ข้อมูลตัวอย่างแยกจาก lab ของคุณ (ไม่แตะของจริง) — เปลี่ยนไปหัวข้ออื่นเพื่อกลับมาใช้ข้อมูล lab ของคุณ" }));
    var sv = UI.svc, pg = UI.page; UI.svc = "Lab"; UI.page = "lab-preview"; var pvp;
    try { pvp = PAGES["lab-preview"](); } catch (e) { pvp = h("div", { cls: "alert error", text: "แสดงผลไม่ได้: " + (e && e.message) }); } finally { UI.svc = sv; UI.page = pg; }
    [].slice.call(pvp.children).forEach(function (c) { if (c.matches && c.matches(".crumb,h1")) pvp.removeChild(c); }); main.appendChild(pvp);
  }
  if (cur[0] === "about") main.appendChild(h("div", { cls: "stgrp" }, [stRow("Console Lab", "จำลอง AWS console + Terraform + Ansible + Jenkins/ArgoCD ไม่ได้เรียก AWS จริง", h("span", { cls: "stver", text: "macOS (จำลอง)" })), stRow("My IP / บัญชี", "ตั้งใน AWS console (Chrome) ที่เมนูชื่อบัญชีมุมขวาบน", h("span", { cls: "stver", text: S.myIp }))]));
  return h("div", { cls: "stapp" }, [side, main]);
}
