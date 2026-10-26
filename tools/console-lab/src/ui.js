// ============================== UI ==============================
function h(tag, p, kids) {
  var e = document.createElement(tag); p = p || {};
  Object.keys(p).forEach(function (k) {
    if (p[k] == null && k !== "value") return;
    if (k === "selected") { e.selected = !!p[k]; return; }
    if (k === "cls") e.className = p[k]; else if (k === "text") e.textContent = p[k];
    else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), p[k]);
    else if (k === "value") e.value = p[k]; else if (k === "checked") e.checked = !!p[k]; else if (k === "disabled") e.disabled = !!p[k];
    else e.setAttribute(k, p[k]);
  });
  (function add(k) { if (k == null || k === false) return; if (Array.isArray(k)) return k.forEach(add); e.appendChild(typeof k === "string" ? document.createTextNode(k) : k); })(kids);
  return e;
}
function save() { try { sessionStorage.setItem("console-lab-v1", JSON.stringify(S)); } catch (e) {} }
function load() { try { var j = sessionStorage.getItem("console-lab-v1"); if (j) { var x = JSON.parse(j); if (x && x.vpcs) { S = x; ensureState(); } } } catch (e) {} }

var PAGES = {}, LISTS = {};
var NAV = {
  VPC: [["", [["vpc-dash", "VPC dashboard"]]],
    ["Virtual private cloud", [["vpcs", "Your VPCs"], ["subnets", "Subnets"], ["rtbs", "Route tables"], ["igws", "Internet gateways"], ["nats", "NAT gateways"], [null, "Egress-only internet gateways"], [null, "Carrier gateways"], [null, "DHCP option sets"], [null, "Elastic IPs"], [null, "Managed prefix lists"], [null, "Peering connections"]]],
    ["Security", [[null, "Network ACLs"], ["sgs", "Security groups"]]]],
  EC2: [["", [["ec2-dash", "Dashboard"], [null, "EC2 Global View"], [null, "Events"]]],
    ["Instances", [["insts", "Instances"], ["itypes", "Instance Types"], [null, "Launch Templates"], [null, "Spot Requests"], [null, "Savings Plans"], [null, "Reserved Instances"], [null, "Dedicated Hosts"], [null, "Capacity Reservations"]]],
    ["Images", [[null, "AMIs"], [null, "AMI Catalog"]]],
    ["Elastic Block Store", [["volumes", "Volumes"], [null, "Snapshots"], [null, "Lifecycle Manager"]]],
    ["Network & Security", [["sgs", "Security Groups"], ["eips", "Elastic IPs"], [null, "Placement Groups"], ["keys", "Key Pairs"], [null, "Network Interfaces"]]],
    ["Load Balancing", [["albs", "Load Balancers"], ["tgs", "Target Groups"], [null, "Trust Stores"]]],
    ["Auto Scaling", [[null, "Auto Scaling Groups"]]]],
  IAM: [["", [[null, "Dashboard"]]], ["Access management", [[null, "User groups"], ["users", "Users"], ["roles", "Roles"], ["policies", "Policies"], [null, "Identity providers"], [null, "Account settings"]]]],
  Laptop: [["เครื่องของคุณ (จำลอง)", [["term", "Terminal"], ["files", "Files & editor"], ["faults", "ปัญหาโลกจริง"]]]],
  ECR: [["Private registry", [["repos", "Repositories"], [null, "Features & Settings"]]], ["Public registry", [[null, "Repositories"]]]],
  Browser: [["", [["browser", "Browser"]]]],
  Lab: [["เครื่องมือของตัวจำลอง", [["lab-check", "ตรวจกับ Terraform"], ["lab-hcl", "Terraform"], ["lab-ansible", "Ansible"], ["lab-flow", "ลำดับการปล่อย (Jenkins → ArgoCD)"], ["lab-jenkins", "Jenkins (ไฟล์ปล่อยจริง)"], ["lab-rules", "กฎที่จำลอง"], ["lab-managed", "เทียบ VM กับ Managed"], ["lab-scen", "ตัวอย่างสำเร็จรูป"]]]]
};
var NAVICO = { term: "⌨️", files: "📁", faults: "🧯", browser: "🌐", "lab-check": "✅", "lab-hcl": "🏗️", "lab-ansible": "🎛️", "lab-flow": "🚀", "lab-jenkins": "🧩", "lab-rules": "📏", "lab-scen": "🎬", "lab-managed": "☁️" };
var NAVHOME = { VPC: "vpc-dash", EC2: "ec2-dash", IAM: "roles", ECR: "repos", Laptop: "term", Browser: "browser", Lab: "lab-check" };
UI = { svc: "VPC", page: "vpc-dash", params: {}, sel: {}, filter: {}, pg: {}, dtab: {}, form: null, menu: false, banner: null, tab: "check" };

function navHas(svc, page) { return NAV[svc].some(function (g) { return g[1].some(function (p) { return p[0] === page; }); }); }
function go(page, params, svc) {
  UI.page = page; UI.params = params || {}; UI.form = null; UI.menu = false;
  if (page !== "ak-retrieve") { UI.secrets = {}; UI.showSecret = false; }
  if (svc) UI.svc = svc; else if (!navHas(UI.svc, page)) { for (var s in NAV) if (navHas(s, page)) { UI.svc = s; break; } }
  render();
}
function flash(kind, msg) { UI.banner = { kind: kind, msg: msg }; }

// ---- ไอคอน SVG (วาดเอง เส้นง่ายๆ ไม่ใช้ asset ของ AWS) ใช้ innerHTML กับสตริงตายตัวเท่านั้น
var ICONS = {
  refresh: '<path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.7M13.4 2.2v3h-3"/>', check: '<circle cx="8" cy="8" r="6.3"/><path d="M5.2 8.2l2 2 3.7-4"/>', pause: '<circle cx="8" cy="8" r="6.3"/><path d="M6.4 5.6v4.8M9.6 5.6v4.8"/>', minus: '<circle cx="8" cy="8" r="6.3"/><path d="M5 8h6"/>', clock: '<circle cx="8" cy="8" r="6.3"/><path d="M8 4.6V8l2.4 1.6"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.2"/><path d="M10.5 3.5v-1h-8v8h1"/>', ext: '<path d="M9.5 2.5h4v4M13.5 2.5L7.5 8.5M12 9v3.5H3.5V4H7"/>', chevR: '<path d="M6 3.5L10.5 8 6 12.5"/>', chevD: '<path d="M3 6l5 5 5-5"/>', chevL: '<path d="M10 3.5L5.5 8l4.5 4.5"/>', info: '<circle cx="8" cy="8" r="6.3"/><path d="M8 7.2v3.6M8 5v.1"/>', warn: '<path d="M8 2.2L14.2 13H1.8z"/><path d="M8 6.6v3M8 11.2v.1"/>', search: '<circle cx="6.8" cy="6.8" r="4.4"/><path d="M10.2 10.2L14 14"/>'
};
function icoEl(name, size, color) { var s = document.createElement("span"); s.className = "ico"; s.style.color = color || ""; s.innerHTML = '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>"; return s; }
function crumbEl(text) {
  var parts = String(text).split(" › "), box = h("div", { cls: "crumb" });
  parts.forEach(function (p, i) {
    if (i) box.appendChild(h("span", { cls: "cs", style: "margin:0 6px" }, [icoEl("chevR", 12)]));
    var tgt = null;
    if (i < parts.length - 1) {
      if (NAV[p]) tgt = [NAVHOME[p], p];
      else Object.keys(NAV).forEach(function (sv) { NAV[sv].forEach(function (g) { g[1].forEach(function (it) { if (!tgt && it[0] && it[1].toLowerCase() === p.toLowerCase()) tgt = [it[0], sv]; }); }); });
    }
    box.appendChild(tgt ? h("a", { href: "#", text: p, onclick: function (e) { e.preventDefault(); go(tgt[0], {}, tgt[1]); } }) : document.createTextNode(p));
  });
  return box;
}

function render() {
  var y = window.scrollY; save(); document.body.setAttribute("data-svc", UI.svc);
  document.getElementById("myip").value = S.myIp; document.getElementById("acct").value = S.acct || "normal"; document.getElementById("speedsel").value = S.speed || "instant";
  var sv = document.getElementById("svc"); sv.textContent = "";
  var aws = !!SVC_ICO[UI.svc]; if (aws) sv.appendChild(h("button", { type: "button", cls: "cur-svc", "aria-current": "true", title: "บริการที่เปิดอยู่ (เปลี่ยนที่เมนู Services)", onclick: function () { go(NAVHOME[UI.svc], {}, UI.svc); } }, [awsIco(SVC_ICO[UI.svc], 18), SVC_NAME[UI.svc] || UI.svc]));
  ["Laptop", "Browser", "Lab"].forEach(function (k) { sv.appendChild(h("button", { type: "button", "aria-current": String(k === UI.svc), onclick: function () { go(NAVHOME[k], {}, k); } }, [k])); });
  if (typeof svcRemember === "function") svcRemember(UI.svc);
  var nv = document.getElementById("nav"); nv.textContent = ""; var NT = { EC2: "EC2", IAM: "Identity and Access Management (IAM)", ECR: "Amazon Elastic Container Registry", EKS: "Amazon Elastic Kubernetes Service", RDS: "Aurora and RDS", SSM: "AWS Systems Manager", S3: "Amazon S3", CloudFront: "CloudFront", "Route 53": "Route 53", ACM: "AWS Certificate Manager", ECS: "Amazon Elastic Container Service", CloudWatch: "CloudWatch", Lambda: "AWS Lambda", "API Gateway": "API Gateway", DynamoDB: "DynamoDB", CodePipeline: "Developer Tools › CodePipeline", CodeBuild: "Developer Tools › CodeBuild" }; if (NT[UI.svc]) nv.appendChild(h("div", { cls: "navtitle" }, [awsIco(SVC_ICO[UI.svc], 22), NT[UI.svc], icoEl("chevL", 14)]));
  NAV[UI.svc].forEach(function (g) {
    if (g[0]) nv.appendChild(h("div", { cls: "grp", text: g[0] }));
    g[1].forEach(function (p) {
      var on = !!p[0] && (UI.page === p[0] || UI.params.from === p[0]);
      nv.appendChild(h("button", { type: "button", cls: p[0] ? "" : "off", title: p[0] ? "" : "ยังไม่ได้จำลองหน้านี้", "aria-current": String(on), onclick: function () { if (p[0]) go(p[0], {}, UI.svc); else { flash("info", "หน้า \"" + p[1] + "\" มีอยู่ใน console จริงแต่ยังไม่ได้จำลอง"); render(); } } }, NAVICO[p[0]] ? [h("span", { cls: "ni", text: NAVICO[p[0]] }), h("span", { text: p[1] })] : [p[1]]));
    });
  });
  var m = document.getElementById("main"); m.textContent = "";
  if (UI.banner) { var awsSvc = /^(VPC|EC2|IAM|ECR|EKS|RDS|SSM|S3|CloudFront|Route 53|ACM|ECS|CloudWatch|Lambda|API Gateway|DynamoDB|CodePipeline|CodeBuild)$/.test(UI.svc); m.appendChild(UI.banner.kind === "ok" && awsSvc ? h("div", { cls: "sb", role: "status" }, [icoEl("check", 18), UI.banner.msg]) : h("div", { cls: "alert " + UI.banner.kind, text: UI.banner.msg, role: "status" })); UI.banner = null; }
  var P = PAGES[UI.page];
  // หน้าใดหน้าหนึ่งพัง (เช่น state เก่าใน sessionStorage ไม่ตรงรูปแบบใหม่) ต้องไม่ทำให้ทั้งหน้าว่าง: แสดงข้อผิดพลาด + ปุ่มล้าง state
  try { m.appendChild(P ? P() : h("p", { text: "ไม่พบหน้า" })); } catch (e) { m.textContent = ""; m.appendChild(h("div", { cls: "alert error", role: "alert" }, [h("b", { text: "หน้านี้แสดงผลไม่ได้: " }), String(e && e.message), h("div", { style: "margin-top:8px" }, [h("button", { type: "button", cls: "btn pri", text: "ล้าง state เก่าแล้วเริ่มใหม่ (Reset)", onclick: function () { try { sessionStorage.removeItem("console-lab-v1"); } catch (x) {} location.reload(); } })])])); }
  if (typeof enhanceSelects === "function") enhanceSelects();
  window.scrollTo(0, y); wbTick(); instTick();
}

// ---- global search + region menu (header)
var LK = { user: "users", policy: "policies", eip: "eips", vpc: "vpcs", subnet: "subnets", rtb: "rtbs", igw: "igws", nat: "nats", sg: "sgs", key: "keys", role: "roles", repo: "repos", inst: "insts", tg: "tgs", alb: "albs" };
function searchHits(q) {
  q = q.toLowerCase(); var out = { nav: [], res: [] };
  Object.keys(NAV).forEach(function (sv) { NAV[sv].forEach(function (g) { g[1].forEach(function (it) { if (it[0] && it[1].toLowerCase().indexOf(q) >= 0) out.nav.push({ label: sv + " › " + it[1], page: it[0], svc: sv }); }); }); });
  Object.keys(LK).forEach(function (k) { S[LK[k]].forEach(function (r) { if (out.res.length < 12 && ((r.name || "").toLowerCase().indexOf(q) >= 0 || (r.id || "").toLowerCase().indexOf(q) >= 0)) out.res.push({ label: k + ": " + (r.name || r.id), kind: k, id: r.id }); }); });
  return out;
}
(function () {
  var inp = document.getElementById("gsearch"), box = document.getElementById("gres");
  function close() { box.hidden = true; box.textContent = ""; }
  document.addEventListener("click", function (e) { if (!e.target.closest(".gsearch")) close(); if (!e.target.closest(".regwrap")) document.getElementById("regmenu").hidden = true; });
  document.getElementById("regbtn").addEventListener("click", function () { var m = document.getElementById("regmenu"); m.hidden = !m.hidden; });
})();

// ---- generic list page
function actionMenu(acts, sel, from) {
  var out = [];
  if (!acts || !acts.length) return out;
  var items = sel ? acts.filter(function (a) { return !a.when || a.when(sel); }) : [];
  function runAct(a) { if (a.run) { var x = a.run(sel); UI.menu = false; flash(x.errors ? "bad" : "ok", x.errors ? Object.keys(x.errors).map(function (k) { return x.errors[k]; }).join(" · ") : a.msg); render(); } else go(a.page, { id: sel.id, from: from, kind: a.kind }); }
  items.filter(function (a) { return a.btn; }).forEach(function (a) { out.push(h("button", { cls: "btn", type: "button", text: a.label, onclick: function () { runAct(a); } })); });
  if (sel && !items.length) return out;
  var groups = []; acts.forEach(function (a) { if (!a.btn) { var g = a.grp || "Actions"; if (groups.indexOf(g) < 0) groups.push(g); } });
  groups.forEach(function (g) {
    var gi = items.filter(function (a) { return !a.btn && (a.grp || "Actions") === g; });
    out.push(h("button", { cls: "btn", type: "button", "aria-haspopup": "true", "aria-expanded": String(UI.menu === g), disabled: !sel || !gi.length, onclick: function () { UI.menu = UI.menu === g ? false : g; render(); } }, [g, icoEl("chevD", 16)]));
    if (UI.menu === g && sel) out.push(h("div", { cls: "menu" }, gi.map(function (a) { return h("button", { type: "button", text: a.label, onclick: function () { runAct(a); } }); })));
  });
  return out;
}
function listPage(o) {
  var all = o.rows(), selId = UI.sel[o.key], sel = all.filter(function (r) { return r.id === selId; })[0];
  var wrap = h("div");
  wrap.appendChild(crumbEl(o.crumb));
  var tools = h("div", { cls: "sp", style: "display:flex;gap:8px;flex-wrap:wrap;position:relative" }, [h("button", { cls: "btn", type: "button", title: "Refresh", "aria-label": "Refresh", style: "padding:3px 10px", onclick: function () { render(); } }, [icoEl("refresh", 16)])].concat(actionMenu(o.actions, sel, o.key)));
  (o.create || []).forEach(function (c) { tools.appendChild(h("button", { cls: "btn pri", type: "button", text: c.label, onclick: function () { go(c.page, { from: o.key }); } })); });
  var tbody = h("tbody"), pagerEl = h("span", { cls: "sub", style: "white-space:nowrap;display:inline-flex;gap:8px;align-items:center" });
  function pager(n, np) { var pg = UI.pg[o.key] || 1; pagerEl.textContent = ""; pagerEl.appendChild(h("button", { cls: "btn", type: "button", style: "padding:0 8px", text: "‹", disabled: pg <= 1, "aria-label": "Previous page", onclick: function () { UI.pg[o.key] = pg - 1; fill(); } })); pagerEl.appendChild(h("span", { text: String(pg) + (np > 1 ? " / " + np : "") })); pagerEl.appendChild(h("button", { cls: "btn", type: "button", style: "padding:0 8px", text: "›", disabled: pg >= np, "aria-label": "Next page", onclick: function () { UI.pg[o.key] = pg + 1; fill(); } })); }
  function pick(r) { UI.sel[o.key] = r.id === UI.sel[o.key] ? null : r.id; UI.menu = false; render(); }
  function fill() {
    var q = (UI.filter[o.key] || "").toLowerCase(); tbody.textContent = "";
    var rows = q ? all.filter(function (r) { return (r.id + " " + o.cols.map(function (c) { var v = c[1](r); return typeof v === "string" ? v : (v && v.textContent) || ""; }).join(" ")).toLowerCase().indexOf(q) >= 0; }) : all;
    if (!rows.length) { tbody.appendChild(h("tr", {}, [h("td", { cls: "empty", colspan: String(o.cols.length + 1), text: all.length ? "No matches. We can’t find a match." : (o.empty || "No resources to display") })])); pager(0, 1); return; }
    var PS = 30, np = Math.max(1, Math.ceil(rows.length / PS)), pg = Math.min(Math.max(1, UI.pg[o.key] || 1), np); UI.pg[o.key] = pg; pager(rows.length, np);
    rows.slice((pg - 1) * PS, pg * PS).forEach(function (r) {
      var cells = [h("td", {}, [h("input", { type: "checkbox", checked: r.id === selId, "aria-label": "เลือก " + nm(r), onclick: function (e) { e.stopPropagation(); }, onchange: function () { pick(r); } })])];
      o.cols.forEach(function (c, i) {
        var v = c[1](r);
        var c0 = o.cols[0][1](r), unnamed = typeof c0 === "string" && c0 === "-" && /^(Name)$/.test(o.cols[0][0]) && /ID$/.test((o.cols[1] || [""])[0]);
        if (o.kind && ((i === 0 && !unnamed) || (i === 1 && unnamed))) { var t = typeof v === "string" && v !== "-" ? v : r.id; v = h("a", { href: "#", cls: "lnk", text: t, onclick: function (e) { e.preventDefault(); e.stopPropagation(); go("detail", { kind: o.kind, id: r.id, from: o.key }); } }); }
        cells.push(h("td", {}, [v]));
      });
      tbody.appendChild(h("tr", { cls: r.id === selId ? "sel" : "", onclick: function () { pick(r); } }, cells));
    });
  }
  fill();
  var head = h("div", { cls: "ch", style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px" }, [h("div", { style: "flex:1;min-width:200px" }, [h("h2", { style: "margin:0;font-size:1.15rem" }, [o.title + " (" + (sel ? "1/" : "") + all.length + ")", h("a", { href: "#", cls: "infolink", text: "Info", onclick: function (e) { e.preventDefault(); } })]), o.desc ? h("div", { cls: "sub", style: "font-weight:400;margin-top:2px", text: o.desc }) : null]), tools]);
  var finder = h("div", { style: "display:flex;gap:12px;align-items:center;padding:0 16px 10px" }, [h("div", { cls: "finder", style: "flex:1;margin:0;position:relative" }, [h("input", { type: "search", placeholder: "Find " + o.title.toLowerCase() + " by attribute or tag", value: UI.filter[o.key] || "", "aria-label": "Filter " + o.title, oninput: function (e) { UI.filter[o.key] = e.target.value; UI.pg[o.key] = 1; fill(); } })]), pagerEl, h("span", { cls: "sub", text: "⚙" })]);
  wrap.appendChild(h("div", { cls: "card" }, [head, finder, h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, [h("th", { text: "" })].concat(o.cols.map(function (c, i) { return h("th", { text: c[0] + (i === 0 ? " ▲" : "") }); })))]), tbody])])]));
  if (sel && o.kind) wrap.appendChild(h("div", { cls: "card" }, [detailView(o.kind, sel, UI.dtab[o.key], function (t) { UI.dtab[o.key] = t; render(); })]));
  else if (all.length) wrap.appendChild(h("p", { cls: "hint", text: "ติ๊กแถวเพื่อดูรายละเอียดด้านล่างและใช้เมนู Actions · กดชื่อหรือ ID เพื่อเปิดหน้ารายละเอียดเต็ม" }));
  return wrap;
}

// ---- resource detail: tabs shared by the bottom panel and the full detail page
function kvDom(list) { var dl = h("dl", { cls: "kv kvg" }); list.forEach(function (kv) { dl.appendChild(h("div", {}, [h("dt", { text: kv[0] }), h("dd", {}, kv[1])])); }); return dl; }
function tbl(head, rows, empty) {
  if (!rows.length) return h("p", { cls: "hint", text: empty || "ไม่มีรายการ" });
  return h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, head.map(function (x) { return h("th", { text: x }); }))]), h("tbody", {}, rows.map(function (r) { return h("tr", { style: "cursor:default" }, r.map(function (c) { return h("td", {}, [c]); })); }))])]);
}
function summ(kind, r) { return kvDom(LISTS[LK[kind]]().detail(r)); }
function det(kind) { return function (r) { return summ(kind, r); }; }
function tagsTab(r) { var t = (r.name ? [["Name", r.name]] : []).concat((r.tags || []).map(function (x) { return [x.k, x.v]; })); return tbl(["Key", "Value"], t, "ไม่มี tag"); }
function ruleType(r) { if (r.proto === "-1") return "All traffic"; var m = { 22: "SSH", 80: "HTTP", 443: "HTTPS", 3306: "MYSQL/Aurora", 5432: "PostgreSQL" }; return r.from === r.to && m[r.from] ? m[r.from] : "Custom TCP"; }
function srcText(r) { return r.srcKind === "sg" ? nm(find(S.sgs, r.src)) + " (" + r.src.slice(0, 11) + ")" : r.src; }
function ruleRows(list) { return list.map(function (r) { return [ruleType(r), r.proto === "-1" ? "All" : "TCP", r.proto === "-1" ? "All" : (r.from === r.to ? String(r.from) : r.from + " - " + r.to), srcText(r)]; }); }
function stateIcon(st, r) { if (r) st = instPhase(r).state; var T = { pending: ["clock", "#5f6b7a", "Pending"], stopping: ["clock", "#5f6b7a", "Stopping"], "shutting-down": ["clock", "#5f6b7a", "Shutting-down"], running: ["check", "#1d8102", "Running"], stopped: ["pause", "#5f6b7a", "Stopped"], terminated: ["minus", "#5f6b7a", "Terminated"] }[st]; return h("span", { style: "color:" + T[1] + ";white-space:nowrap;display:inline-flex;gap:6px;align-items:center" }, [icoEl(T[0], 15), T[2]]); }
function stateTag(st) { var T = { running: ["Running", "ok"], stopped: ["Stopped", "warn"], terminated: ["Terminated", "bad"] }; return tagp(T[st][0], T[st][1]); }
function vpcMap(r) {
  var sn = S.subnets.filter(function (x) { return x.vpcId === r.id; }), rt = S.rtbs.filter(function (x) { return x.vpcId === r.id; }), ig = vpcIgw(r.id);
  function col(t, kids) { return h("div", {}, [h("h4", { text: t })].concat(kids)); }
  return h("div", {}, [h("div", { cls: "hint", text: "VPC " + vname0(r) + " · " + r.cidr + " · ซอยสีเขียว = public (มีเส้นทางตรงไป internet gateway), สีฟ้า = private" }),
    h("div", { cls: "rmap" }, [
      col("Subnets", sn.length ? sn.map(function (x) { var pub = hasIgwRoute(subnetRtb(x)); return h("div", { cls: "rbox " + (pub ? "pub" : "prv") }, [x.name || x.id, h("small", { text: x.az + " · " + x.cidr + " · " + (pub ? "public" : "private") })]); }) : [h("div", { cls: "hint", text: "ยังไม่มี subnet" })]),
      col("Route tables", rt.map(function (x) { return h("div", { cls: "rbox" }, [(x.main ? "main · " : "") + (x.name || x.id), h("small", { text: x.assoc.length ? "ผูก: " + x.assoc.map(function (id) { return nm(find(S.subnets, id)); }).join(", ") : (x.main ? "ซอยที่ไม่ได้ผูกกับ table อื่น" : "ยังไม่ผูกกับซอยใด") })]); })),
      col("Network connections", ig ? [h("div", { cls: "rbox" }, ["Internet gateway · " + nm(ig), h("small", { text: rt.filter(function (x) { return x.routes.some(function (e) { return e.target === ig.id; }); }).length + " route table ชี้มาที่นี่" })])] : [h("div", { cls: "hint", text: "ไม่มี internet gateway" })])])]);
}
function rtbRows(r) { var v = find(S.vpcs, r.vpcId); return [[v.cidr, "local", "Active", "No"]].concat(r.routes.map(function (x) { var bh = /\(blackhole\)/.test(x.target); return [x.dest, bh ? x.target.replace(" (blackhole)", "") : x.target, bh ? "Blackhole" : "Active", "No"]; })); }
function rtbRoutes(r) {
  var rows = rtbRows(r).map(function (x) { return [x[0], x[1], x[2] === "Active" ? okIco("Active") : h("span", { style: "color:#d91515" }, ["Blackhole"]), x[3]]; });
  return h("div", {}, [h("div", { style: "display:flex;gap:10px;align-items:center;margin-bottom:8px" }, [h("b", { text: "Routes (" + rows.length + ")" }), h("span", { style: "margin-left:auto" }, [h("button", { cls: "btn", type: "button", text: "Edit routes", onclick: function () { go("rtb-routes", { id: r.id, from: "rtbs" }); } })])]), h("div", { style: "display:flex;gap:8px;margin-bottom:8px" }, [h("div", { cls: "finder", style: "flex:1;margin:0" }, [h("input", { type: "search", placeholder: "Filter routes", "aria-label": "Filter routes" })]), h("select", { "aria-label": "Route filter" }, [h("option", { text: "Both" }), h("option", { text: "Static" }), h("option", { text: "Propagated" })])]), tbl(["Destination", "Target", "Status", "Propagated"], rows)]);
}
function rtbAssoc(r) {
  var ex = r.assoc.map(function (id) { return find(S.subnets, id); }).filter(Boolean);
  var imp = S.subnets.filter(function (x) { return x.vpcId === r.vpcId && !S.rtbs.some(function (t) { return !t.main && t.vpcId === r.vpcId && t.assoc.indexOf(x.id) >= 0; }); });
  function sect(title, desc, rows, empty) {
    var head = h("div", { style: "display:flex;gap:10px;align-items:center;margin:6px 0" }, [h("b", { text: title }), h("span", { style: "margin-left:auto" }, [h("button", { cls: "btn", type: "button", text: "Edit subnet associations", disabled: r.main, onclick: function () { go("rtb-assoc", { id: r.id, from: "rtbs" }); } })])]);
    return h("div", { style: "margin-bottom:18px" }, [head, desc ? h("div", { cls: "hint", text: desc }) : null, h("div", { cls: "finder", style: "margin:6px 0" }, [h("input", { type: "search", placeholder: "Find subnet association", "aria-label": "Find subnet association" })]), rows.length ? tbl(["Name", "Subnet ID", "IPv4 CIDR", "IPv6 CIDR"], rows) : h("div", { style: "text-align:center;padding:14px" }, [h("b", { text: "No subnet associations" }), h("div", { cls: "hint", text: empty })])]);
  }
  return h("div", {}, [sect("Explicit subnet associations (" + ex.length + ")", "", ex.map(function (x) { return [x.name || "-", x.id, x.cidr, "-"]; }), "You do not have any subnet associations."), sect("Subnets without explicit associations (" + imp.length + ")", "The following subnets have not been explicitly associated with any route tables and are therefore associated with the main route table:", imp.map(function (x) { return [x.name || "-", x.id, x.cidr, "-"]; }), "All subnets in this VPC are explicitly associated.")]);
}
function subRoute(r) { var rt = subnetRtb(r); return h("div", {}, [h("p", { text: "Route table: " + (rt.main ? "main (" + rt.id + ")" : nm(rt)) }), rtbRoutes(rt)]); }
function sgrId(g, i, k) { return "sgr-0" + hash32(g.id + k + i) + hash32(k + g.id + i) + hash32(i + g.id).slice(0, 3); }
function sgRules(kind) { return function (r) { var list = kind === "in" ? r.inbound : r.outbound; if (kind === "out" && !list.length) list = [{ proto: "-1", from: 0, to: 65535, srcKind: "cidr", src: "0.0.0.0/0" }]; var rows = ruleRows(list).map(function (x, i) { return ["–", sgrId(r, i, kind), "IPv4", x[0], x[1], x[2], x[3], list[i].desc || "–"]; }); return h("div", {}, [h("div", { style: "display:flex;gap:8px;align-items:center;margin-bottom:8px" }, [h("b", { text: (kind === "in" ? "Inbound rules" : "Outbound rules") + " (" + rows.length + ")" }), h("span", { style: "margin-left:auto;display:flex;gap:8px" }, [h("button", { cls: "btn", type: "button", text: "Manage tags" }), h("button", { cls: "btn", type: "button", text: kind === "in" ? "Edit inbound rules" : "Edit outbound rules", onclick: function () { go(kind === "in" ? "sg-inbound" : "sg-outbound", { id: r.id, from: "sgs" }); } })])]), tbl(["Name", "Security group rule ID", "IP version", "Type", "Protocol", "Port range", kind === "in" ? "Source" : "Destination", "Description"], rows, "ไม่มีกฎ (ปิดทุกอย่าง)")]); }; }
function instSec(r) { return h("div", {}, [kvDom([["IAM Role", r.profile || "-"], ["Key pair assigned at launch", r.keyName || "-"]]), r.sgIds.map(function (id) { var g = find(S.sgs, id); return g ? h("div", {}, [h("h4", { text: "Security group: " + g.name }), tbl(["Type", "Protocol", "Port range", "Source"], ruleRows(g.inbound), "ไม่มีกฎขาเข้า")]) : null; })]); }
function instNet(r) { var v = find(S.vpcs, r.vpcId); var dns = v && v.dnsHostnames && v.dnsResolution && r.publicIp ? "ec2-" + r.publicIp.replace(/\./g, "-") + "." + REGION + ".compute.lab.invalid" : "-"; return kvDom([["VPC ID", vname(r.vpcId)], ["Subnet ID", nm(find(S.subnets, r.subnetId))], ["Availability Zone", r.az], ["Private IPv4 addresses", r.privateIp], ["Public IPv4 address", r.publicIp || "-"], ["Public IPv4 DNS", dns], ["Auto-assigned public IP at launch", r.hadPub ? "Yes" : "No"]]); }
function instSto(r) { return tbl(["Volume", "Device", "Size", "Type", "Delete on termination"], [["root volume", "/dev/sda1", r.disk.size + " GiB", r.disk.type, "Yes"]]); }
function tgHealth(r) {
  var lb = S.albs.filter(function (a) { return a.listeners.some(function (l) { return l.tgId === r.id; }); })[0];
  return r.targets.map(function (x) {
    var i = find(S.insts, x.instId), st, code;
    if (!lb) { st = "unused"; code = "Target.NotInUse: Target group is not configured to receive traffic from the load balancer"; }
    else { var row = albHealth(lb).filter(function (q) { return q.t && q.t.id === r.id && q.inst && q.inst.id === x.instId; })[0]; st = row ? row.state : "unused"; code = row ? row.why : ""; }
    return [x.instId, i ? (i.name || "-") : "-", String(x.port), i ? i.az : "-", tagp(st, st === "healthy" ? "ok" : (st === "unused" || st === "initial" ? "warn" : "bad")), code || "-"];
  });
}
function tgTargets(r) { return h("div", {}, [summ("tg", r), h("h4", { text: "Registered targets (" + r.targets.length + ")" }), tbl(["Instance ID", "Name", "Port", "Zone", "Health status", "Health status details"], tgHealth(r), "ยังไม่มี target กด Actions → Register targets"), h("p", { cls: "hint", text: "จำลองว่าแอปตอบ 200 ที่ health check path" })]); }
function tgHc(r) { return kvDom([["Protocol", "HTTP"], ["Path", r.hcPath], ["Port", "Traffic port"], ["Healthy threshold", "5"], ["Unhealthy threshold", "2"], ["Timeout", "5 seconds"], ["Interval", "30 seconds"], ["Success codes", "200"]]); }
function albList(r) { return h("div", {}, [summ("alb", r), h("h4", { text: "Listeners and rules" }), tbl(["Protocol:Port", "Default action"], r.listeners.map(function (l) { return ["HTTP:" + l.port, "Forward to target group " + nm(find(S.tgs, l.tgId))]; }))]); }
function albMap(r) {
  var hs = albHealth(r);
  return h("div", { cls: "rmap" }, [
    h("div", {}, [h("h4", { text: "Listeners" })].concat(r.listeners.map(function (l) { return h("div", { cls: "rbox" }, ["HTTP:" + l.port, h("small", { text: "→ " + nm(find(S.tgs, l.tgId)) })]); }))),
    h("div", {}, [h("h4", { text: "Target groups" })].concat(r.listeners.map(function (l) { var t = find(S.tgs, l.tgId); var rows = hs.filter(function (x) { return x.t && x.t.id === l.tgId && !x.none; }); var good = rows.filter(function (x) { return x.ok; }).length; return h("div", { cls: "rbox " + (rows.length && !good ? "prv" : "pub") }, [nm(t), h("small", { text: good + "/" + rows.length + " healthy" })]); }))),
    h("div", {}, [h("h4", { text: "Targets" })].concat(hs.filter(function (x) { return !x.none; }).map(function (x) { return h("div", { cls: "rbox " + (x.ok ? "pub" : "prv") }, [nm(x.inst) + ":" + x.port, h("small", { text: x.state + (x.code ? " · " + x.code : "") })]); })))]);
}
function roleTrust(r) { return codePre(JSON.stringify({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Principal: { Service: "ec2.amazonaws.com" }, Action: "sts:AssumeRole" }] }, null, 2), "json"); }
var DET = {
  vpc: [["details", "Details", det("vpc")], ["map", "Resource map", vpcMap], ["cidrs", "CIDRs", function (r) { return tbl(["CIDR", "Type", "Status"], [[r.cidr, "IPv4 (primary)", "Associated"]]); }], ["flow", "Flow logs", null], ["tags", "Tags", tagsTab]],
  subnet: [["details", "Details", det("subnet")], ["flow", "Flow logs", null], ["route", "Route table", subRoute], ["nacl", "Network ACL", null], ["cidrres", "CIDR reservations", null], ["share", "Sharing", null], ["tags", "Tags", tagsTab]],
  rtb: [["details", "Details", det("rtb")], ["routes", "Routes", rtbRoutes], ["assoc", "Subnet associations", rtbAssoc], ["edge", "Edge associations", function () { return h("p", { cls: "hint", text: "ไม่มี" }); }], ["prop", "Route propagation", null], ["tags", "Tags", tagsTab]],
  igw: [["details", "Details", det("igw")], ["tags", "Tags", tagsTab]],
  nat: [["details", "Details", det("nat")], ["sec", "Secondary IPv4 addresses", function () { return tbl(["Private IPv4 address", "Network interface ID", "Status", "Failure message"], [], "Secondary IPv4 addresses are not available for this nat gateway."); }], ["mon", "Monitoring", null], ["tags", "Tags", tagsTab]],
  sg: [["details", "Details", det("sg")], ["in", "Inbound rules", sgRules("in")], ["out", "Outbound rules", sgRules("out")], ["share", "Sharing", null], ["assoc", "VPC associations", null], ["tags", "Tags", tagsTab]],
  inst: [["details", "Details", det("inst")], ["status", "Status and alarms", null], ["mon", "Monitoring", null], ["sec", "Security", instSec], ["net", "Networking", instNet], ["sto", "Storage", instSto], ["tags", "Tags", tagsTab]],
  key: [["details", "Details", det("key")]],
  role: [["perm", "Permissions", function (r) { return h("div", {}, [summ("role", r), h("h4", { text: "Permissions policies" }), tbl(["Policy name", "Type"], r.policies.map(function (p) { return [p, "AWS managed"]; }), "ไม่มี policy")]); }], ["trust", "Trust relationships", roleTrust], ["tags", "Tags", null], ["adv", "Last Accessed", null], ["rev", "Revoke sessions", null]],
  repo: [["images", "Images", function (r) { return h("div", {}, [kvDom([["URI", r.uri]]), h("p", { cls: "hint", text: "ยังไม่มี image กด View push commands ใน console จริงเพื่อดูคำสั่ง docker push (Jenkins ทำให้ใน lab นี้)" })]); }], ["details", "Details", det("repo")]],
  tg: [["targets", "Targets", tgTargets], ["mon", "Monitoring", null], ["hc", "Health checks", tgHc], ["attr", "Attributes", null], ["tags", "Tags", tagsTab]],
  alb: [["listeners", "Listeners and rules", albList], ["net", "Network mapping", function (r) { return tbl(["Availability Zone", "Subnet"], r.subnetIds.map(function (id) { var x = find(S.subnets, id); return [x.az, nm(x) + " · " + x.cidr]; })); }], ["map", "Resource map", albMap], ["sec", "Security", function (r) { return tbl(["Security group", "ID"], r.sgIds.map(function (id) { var g = find(S.sgs, id); return [g.name, g.id]; })); }], ["mon", "Monitoring", null], ["integ", "Integrations", null], ["attr", "Attributes", null], ["cap", "Capacity", null], ["tags", "Tags", tagsTab]]
};
function accessKeysTab(u) {
  var box = h("div"), two = u.keys.length >= 2;
  box.appendChild(kvDom([["Console sign-in", "Disabled (จำลองเฉพาะ access key)"]]));
  box.appendChild(h("div", { cls: "titlebar" }, [h("h4", { text: "Access keys (" + u.keys.length + "/2)" }), h("div", { cls: "sp" }, [h("button", { cls: "btn pri", type: "button", text: "Create access key", disabled: two, title: two ? "มี access key ครบ 2 ชุดแล้ว ต้องลบก่อน" : "", onclick: function () { go("ak-create", { id: u.id, from: "users" }); } })])]));
  box.appendChild(tbl(["Access key ID", "Status", "Description", "Actions"], u.keys.map(function (k) {
    var acts = [h("button", { cls: "btn", type: "button", text: k.active ? "Deactivate" : "Activate", onclick: function () { var x = API.accessKeyState(u.id, k.id, k.active ? "deactivate" : "activate"); flash(x.errors ? "bad" : "ok", x.errors ? x.errors._ : "เปลี่ยนสถานะแล้ว"); render(); } }), " ", h("button", { cls: "btn", type: "button", text: "Delete", onclick: function () { var x = API.accessKeyState(u.id, k.id, "delete"); flash(x.errors ? "bad" : "ok", x.errors ? x.errors._ : "ลบ access key แล้ว"); render(); } })];
    return [k.id, tagp(k.active ? "Active" : "Inactive", k.active ? "ok" : "warn"), k.desc || "-", h("span", {}, acts)];
  }), "ยังไม่มี access key"));
  box.appendChild(h("p", { cls: "hint", text: "เอกสาร: ลบ access key ต้อง Deactivate ก่อน และ user หนึ่งคนมีได้สูงสุด 2 ชุด secret แสดงได้ครั้งเดียวตอนสร้าง นำไปใช้กับ aws configure (ใส่ region ap-southeast-1)" }));
  return box;
}
function usedBy(name) { return S.roles.filter(function (x) { return x.policies.indexOf(name) >= 0; }).map(function (x) { return ["Role", x.name]; }).concat(S.users.filter(function (x) { return x.policies.indexOf(name) >= 0; }).map(function (x) { return ["User", x.name]; })); }
function polJson(name) { var d = POLICY_DEF[name]; return d.actions ? codePre(JSON.stringify({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: d.actions.length === 1 ? d.actions[0] : d.actions, Resource: "*" }] }, null, 2), "json") : h("p", { cls: "hint", text: "ยังไม่ได้ตรวจเนื้อหา policy นี้กับเอกสาร จึงไม่แสดงและไม่ถูกนับเวลาประเมินสิทธิ์ในตัวจำลอง" }); }
DET.user = [["perm", "Permissions", function (u) { return h("div", {}, [tbl(["Policy name", "Type"], u.policies.map(function (p) { return [p, "AWS managed"]; }), "ไม่มี permission"), h("p", { cls: "hint", text: "เอกสาร IAM แนะนำให้จัดสิทธิ์ผ่าน group แต่แนบ policy ให้ user ตรง ๆ ก็ได้" })]); }], ["groups", "Groups", null], ["tags", "Tags", null], ["sec", "Security credentials", accessKeysTab], ["adv", "Last Accessed", null]];
DET.policy = [["perm", "Permissions", function (r) { return h("div", {}, [kvDom([["Description", r.desc]]), polJson(r.name)]); }], ["used", "Entities attached", function (r) { return tbl(["Type", "Name"], usedBy(r.name), "ยังไม่ได้แนบกับอะไร"); }], ["ver", "Policy versions", null]];
DET.eip = [["details", "Details", det("eip")]];
DET.repo = [["images", "Images", function (r) { return h("div", {}, [kvDom([["URI", r.uri], ["Tag immutability", r.mutable ? "Mutable" : "Immutable"]]), h("h4", { text: "Images (" + r.images.length + ")" }), tbl(["Image tag", "Digest", "Pushed by"], r.images.map(function (x) { return [x.tag, x.digest.slice(0, 19) + "…", x.by]; }), "ยังไม่มี image กด Actions → Docker push / pull เพื่อจำลองการ push"), h("p", { cls: "hint", text: "Actions → View push commands ดูคำสั่งจริง · ใน lab นี้ Jenkins เป็นคน push และ k8s เป็นคน pull" })]); }], ["details", "Details", det("repo")]];
function detailView(kind, r, tab, setTab, skipDetails) {
  var cfg = DET[kind].filter(function (t) { return !(skipDetails && t[0] === "details"); }), cur = cfg.filter(function (t) { return t[0] === tab; })[0] || cfg[0], box = h("div");
  box.appendChild(h("div", { cls: "dtabs", role: "tablist" }, cfg.map(function (t) { return h("button", { type: "button", role: "tab", text: t[1], cls: t[2] ? "" : "off", "aria-selected": String(t === cur), onclick: function () { setTab(t[0]); } }); })));
  box.appendChild(h("div", { cls: "dbody" }, [cur[2] ? cur[2](r) : h("p", { cls: "hint", text: "แท็บนี้มีใน console จริงแต่ยังไม่ได้จำลอง" })]));
  return box;
}
PAGES.detail = function () {
  var kind = UI.params.kind, r = S[LK[kind]] ? find(S[LK[kind]], UI.params.id) : null;
  if (!r) return h("div", {}, [h("p", { text: "ไม่พบรายการนี้ (อาจถูกลบแล้ว)" }), h("button", { cls: "btn", type: "button", text: "กลับ", onclick: function () { go(LK[kind] || NAVHOME[UI.svc]); } })]);
  var cfg = LISTS[LK[kind]](), tab = UI.params.tab, wrap = h("div");
  wrap.appendChild(crumbEl(cfg.crumb + " › " + (r.name || r.id)));
  var bar = h("div", { cls: "sp" }, actionMenu(cfg.actions, r, LK[kind]));
  if (kind === "inst" && r.state !== "terminated") bar.appendChild(h("button", { cls: "btn pri", type: "button", text: "Connect", onclick: function () { go("ssh", { id: r.id, from: "insts" }); } }));
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: (kind === "inst" ? r.id + (r.name ? " (" + r.name + ")" : "") : r.name ? r.id + " / " + r.name : r.id) }), bar]));
  var split = /^(vpc|subnet|rtb|igw|sg)$/.test(kind);
  if (split) wrap.appendChild(h("div", { cls: "card" }, [h("div", { cls: "ch" }, ["Details", h("a", { href: "#", cls: "infolink", text: "Info", onclick: function (e) { e.preventDefault(); } })]), h("div", { cls: "cb" }, [summ(kind, r)])]));
  wrap.appendChild(h("div", { cls: "card" }, [detailView(kind, r, tab, function (t) { UI.params.tab = t; render(); }, split)]));
  return wrap;
};

function tagp(t, k) { return h("span", { cls: "tag " + (k || ""), text: t }); }
function vname(id) { var v = find(S.vpcs, id); return v ? (v.name || v.id) + (v.isDefault ? " (default)" : "") : "-"; }

// ---- generic form
function formPage(o) {
  if (!UI.form || UI.form.name !== o.name) { UI.form = { name: o.name, v: o.init(), errors: {}, step: 0 }; }
  var F = UI.form, V = F.v, wrap = h("div");
  wrap.appendChild(crumbEl(o.crumb));
  var secs = o.sections(V), wiz = !!o.steps || !!o.cards, stepNames = {};
  secs.forEach(function (s) { if (s.step != null) stepNames[s.step] = String(s.t || "").replace(/^Step \d+:\s*/, "").replace(/\s*\(.*\)$/, ""); });
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", {}, [wiz && o.steps && stepNames[F.step] ? stepNames[F.step] : o.title, o.cards ? h("a", { href: "#", cls: "infolink", text: "Info", onclick: function (e) { e.preventDefault(); } }) : null])]));
  if (o.lead) wrap.appendChild(h("p", { text: o.lead }));
  if (o.info) wrap.appendChild(h("div", { cls: "alert info", text: o.info }));
  if (o.warn && o.warn(V)) wrap.appendChild(h("div", { cls: "alert warn", text: o.warn(V) }));
  var keys = Object.keys(F.errors);
  if (keys.length) wrap.appendChild(h("div", { cls: "alert bad", role: "alert" }, [h("b", { text: "ตรวจพบ " + keys.length + " ข้อที่ต้องแก้" }), h("ul", {}, keys.map(function (k) { return h("li", { text: F.errors[k] }); }))]));
  var card = h("div", { cls: wiz ? "" : "card" });
  secs.forEach(function (sec) {
    if (sec.step != null && sec.step !== F.step) return;
    var s = h("div", { cls: wiz ? "card" : "sec" }), heading = wiz ? sec.ct : sec.t, body = wiz ? h("div", { cls: "cb" }) : s;
    if (heading) (wiz ? s : body).appendChild(wiz ? h("div", { cls: "ch" }, [heading]) : h("h2", {}, [heading, o.sectionInfo ? h("a", { href: "#", cls: "infolink", text: "Info", onclick: function (e) { e.preventDefault(); } }) : null]));
    sec.f.forEach(function (f) { if (f && (!f.show || f.show(V))) body.appendChild(field(f, V, F)); });
    if (wiz) s.appendChild(body); card.appendChild(s);
  });
  var last = !o.steps || F.step === o.steps - 1;
  var bar = h("div", { cls: "actions", style: wiz ? "justify-content:flex-end;background:transparent;border:0" : "" });
  bar.appendChild(wiz ? h("a", { href: "#", style: "align-self:center;margin-right:10px;color:#0972d3;font-weight:700;text-decoration:none", text: "Cancel", onclick: function (e) { e.preventDefault(); go(o.back || UI.params.from || NAVHOME[UI.svc]); } }) : h("button", { cls: "btn", type: "button", text: "Cancel", onclick: function () { go(o.back || UI.params.from || NAVHOME[UI.svc]); } }));
  if (o.steps && F.step > 0) bar.appendChild(h("button", { cls: "btn", type: "button", text: "Previous", onclick: function () { F.step--; render(); } }));
  bar.appendChild(h("button", { cls: "btn pri", type: "button", text: last ? o.submit : "Next", onclick: function () {
    if (!last) { F.step++; F.errors = {}; render(); return; }
    var r = o.onSubmit(V);
    if (r && r.errors) { F.errors = r.errors; render(); return; }
    flash("ok", (r && r.msg) || "สร้างสำเร็จ"); var next = (r && r.next) || o.back || UI.params.from || NAVHOME[UI.svc]; go(next, (r && r.nextParams) || {});
  } }));
  if (o.preview) { card.appendChild(bar); wrap.appendChild(h("div", { cls: "split", style: "grid-template-columns:minmax(0,1fr) minmax(0,1.1fr)" }, [card, h("div", { cls: "card side" }, [h("div", { cls: "ch" }, ["Preview"]), h("div", { cls: "cb" }, [o.preview(V)])])])); }
  else if (o.summary) {
    var side = h("div", { cls: "card side" }, [h("div", { cls: "ch", text: "Summary" }), h("div", { cls: "cb" }, [o.summary(V)]), bar]);
    wrap.appendChild(h("div", { cls: "split" }, [card, side]));
  } else if (wiz && !o.steps) { card.appendChild(bar); wrap.appendChild(card); }
  else if (wiz) {
    var nav = h("div", { style: "width:200px;flex:none;font-size:.88rem" }, Object.keys(stepNames).map(function (k) { var on = +k === F.step; return h("div", { style: "padding:8px 0;border-bottom:1px solid #e9ebed" }, [h("div", { cls: "sub", style: "font-size:.75rem", text: "Step " + (+k + 1) }), h("div", { style: on ? "font-weight:700" : "color:#0972d3", text: stepNames[k] })]); }));
    card.appendChild(bar); wrap.appendChild(h("div", { style: "display:flex;gap:24px;align-items:flex-start" }, [nav, h("div", { style: "flex:1;min-width:0" }, [card])]));
  } else { card.appendChild(bar); wrap.appendChild(card); }
  return wrap;
}

// ---- ช่องกรอกแบบ dropdown ตัวอย่าง + "ไม่ระบุ (พิมพ์เอง)"
var CUSTOM = "__custom__";
var EXF = {
  "vpc-create.name": ["pharmacy-vpc", "pharmacy"], "vpc-create.cidr": ["10.0.0.0/16", "172.16.0.0/16", "192.168.0.0/16", "10.1.0.0/16"],
  "subnet-create.name": ["pharmacy-public-1", "pharmacy-public-2", "pharmacy-private-1"], "subnet-create.cidr": ["10.0.1.0/24", "10.0.2.0/24", "10.0.128.0/20", "10.1.1.0/24", "10.1.2.0/24", "10.1.128.0/20"],
  "subnet-edit.name": ["pharmacy-public-1", "pharmacy-private-1"],
  "igw-create.name": ["pharmacy-igw"], "rtb-create.name": ["pharmacy-public", "pharmacy-private"], "rtb-routes.dest": ["0.0.0.0/0", "10.0.0.0/16", "10.1.0.0/16"],
  "sg-create.name": ["pharmacy-base", "pharmacy-alb", "pharmacy-jenkins", "pharmacy-sonarqube", "pharmacy-k8s", "pharmacy-db"],
  "sg-create.desc": ["pharmacy base", "pharmacy alb", "pharmacy jenkins", "pharmacy sonarqube", "pharmacy k8s", "pharmacy db"],
  "*.src": ["203.0.113.0/24", "10.0.0.0/16", "172.31.0.0/16", "10.1.0.0/16"], "*.port": ["22", "80", "8080", "9000", "30080", "30080-30081", "30443", "3306"],
  "key-import.name": ["pharmacy-admin", "pharmacy-admin-manual"], "key-create.name": ["pharmacy-admin", "pharmacy-admin-manual"],
  "role-create.name": ["pharmacy-jenkins", "pharmacy-k8s", "pharmacy-sonarqube", "pharmacy-eks-cluster", "pharmacy-eks-node"], "role-create.desc": ["Jenkins push image to ECR", "k8s pull image from ECR", "EKS control plane", "EKS worker node"], "role-create.q": ["ECR", "SSM", "EKS", "AdministratorAccess"],
  "repo-create.name": ["pharmacy/frontend", "pharmacy/backend"],
  "bucket-create.name": ["pharmacy-web-dev-000000000000", "pharmacy-web-prd-000000000000", "pharmacy-logs-000000000000"], "obj-upload-.key": ["index.html", "about.html", "error.html", "assets/app.js"],
  "cf-create.name": ["pharmacy web dev", "pharmacy web prd"], "cf-create.root": ["index.html"], "cf-create.domain": ["www.pharmacy.example.com", "dev.pharmacy.example.com"], "cf-edit-.aliases": ["www.pharmacy.example.com", "dev.pharmacy.example.com", "www.pharmacy.example.com, pharmacy.example.com"], "cf-edit-.root": ["index.html"], "cf-inv-.paths": ["/*", "/index.html", "/assets/*"], "cf-err-.page": ["/index.html", "/error.html"],
  "oac-create.name": ["pharmacy-web-oac"], "oac-create.desc": ["CloudFront reads private S3 buckets", "pharmacy web OAC"],
  "zone-create.name": ["pharmacy.example.com"], "rec-create-.name": ["www", "dev", "api"], "rec-create-.value": ["192.0.2.10", "pharmacy.example.com"], "rec-create-.ttl": ["60", "300"],
  "cert-create.domain": ["www.pharmacy.example.com", "*.pharmacy.example.com", "pharmacy.example.com"], "cert-create.extra": ["dev.pharmacy.example.com"],
  "rds-create.password": ["pharmacy-Lab-Pass-2026"],
  "pipe-create.name": ["pharmacy-api", "pharmacy-api-dev"], "pipe-create.repo": ["YOUR_GITHUB_USER/pharmacy-backend", "maht25102542/pharmacy-backend", "maht25102542/pharmacy-frontend"], "pipe-create.branch": ["main", "develop"], "pipe-create.devSvc": ["pharmacy-api"], "pipe-create.prdSvc": ["pharmacy-api"], "pipe-approve-.note": ["dev ผ่าน smoke test แล้ว", "ตรวจหน้าจอ dev แล้ว ผ่าน", "ยังไม่ผ่าน: stock แสดงผิด"],
  "cbp-create.name": ["pharmacy-api-build", "pharmacy-frontend-build"], "cbp-create.ecr": ["000000000000.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/api", "000000000000.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/frontend"], "cbp-create.container": ["api", "frontend", "app"], "cbp-edit-.ecr": ["000000000000.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/api"], "cbp-edit-.container": ["api", "frontend", "app"], "conn-create.name": ["pharmacy-github", "cafe-github"],
  "layer-create.name": ["pharmacy-shared-libs", "pharmacy-utils"], "layer-create.file": ["layer.zip", "~/layer.zip", "build/app.zip"], "layer-create.desc": ["shared python libs", "pharmacy common utils"],
  "adom-create.name": ["api.pharmacy.example.com", "dev-api.pharmacy.example.com"], "alarm-create.name": ["pharmacy-api-prd-5xx", "pharmacy-api-prd-errors", "pharmacy-lambda-errors"], "alarm-create.threshold": ["1", "5", "10"],
  "ddb-partiql.sql": ["SELECT * FROM \"pharmacy-drugs-dev\"", "SELECT * FROM \"pharmacy-drugs-prd\" WHERE id='1'", "INSERT INTO \"pharmacy-drugs-dev\" VALUE {'id':'9','name':'Ibuprofen 200mg','stock':50,'price':4}", "UPDATE \"pharmacy-drugs-dev\" SET stock=100 WHERE id='1'", "DELETE FROM \"pharmacy-drugs-dev\" WHERE id='9'", "SELECT * FROM \"pharmacy-drug-prd\""],
  "cw-insights.q": ["fields @timestamp, @message | sort @timestamp desc | limit 20", "fields @timestamp, @message | filter @message like /ERROR/ | limit 20", "filter @message like /REPORT/ | stats count(*)"], "cw-live.filter": ["ERROR", "REPORT", "AccessDenied"],
  "lam-create.name": ["pharmacy-api-dev", "pharmacy-api-prd", "pharmacy-orders-dev"], "lam-create.handler": ["app.handler", "index.handler", "main.lambda_handler"], "lam-create.memory": ["128", "256", "512", "1024"], "lam-create.timeout": ["3", "10", "30"], "lam-create.appenv": ["dev", "prd"],
  "lam-edit-.memory": ["128", "256", "512", "1024"], "lam-edit-.timeout": ["3", "10", "30"], "lam-edit-.handler": ["app.handler", "index.handler"], "lam-env-edit-.table": ["pharmacy-drugs-dev", "pharmacy-drugs-prd", "pharmacy-drug-prd"], "lam-env-edit-.appenv": ["dev", "prd"], "lam-perm-add-.sid": ["AllowAPIGatewayInvoke", "AllowS3Invoke"],
  "api-create.name": ["pharmacy-api-dev", "pharmacy-api-prd"], "api-create.p1": ["/drugs", "/orders", "/{proxy+}"], "api-create.p2": ["/drugs", "/orders"], "api-create.stage": ["dev", "prd", "$default"], "api-route-create-.path": ["/drugs", "/drugs/{id}", "/{proxy+}"], "api-stage-create-.name": ["dev", "prd"],
  "ddb-create.name": ["pharmacy-drugs-dev", "pharmacy-drugs-prd", "pharmacy-orders-dev"], "ddb-create.key": ["id", "order_id", "drug_id"],
  "ddb-item-create.id": ["1", "2", "3", "9"], "ddb-item-create.name": ["Paracetamol 500mg", "Amoxicillin 250mg", "Vitamin C 1000mg", "Latte", "Espresso", "Croissant"], "ddb-item-create.stock": ["10", "120", "480"], "ddb-item-create.price": ["2.5", "5", "8", "65"],
  "ecs-create.name": ["pharmacy-dev", "pharmacy-prd"], "ecs-td-create.family": ["pharmacy-api-dev", "pharmacy-api-prd"], "ecs-td-create.cname": ["api"], "ecs-td-create.image": ["000000000000.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/api:v1.0.0"], "ecs-td-create.port": ["8000"], "ecs-td-create.appenv": ["dev", "prd"],
  "ecs-svc-create.name": ["pharmacy-api"], "ecs-svc-create.desired": ["1", "2"], "ecs-svc-edit-.desired": ["0", "1", "2", "4"], "lg-create.name": ["/ecs/pharmacy-api-dev", "/ecs/pharmacy-api-prd"],
  "eks-create.name": ["pharmacy-eks"], "eks-ng-create.name": ["pharmacy-nodes"], "eks-ng-create.disk": ["20", "50"], "eks-ng-create.desired": ["3", "1"], "eks-ng-create.min": ["3", "1"], "eks-ng-create.max": ["6", "3"], "eks-create.cidr": ["0.0.0.0/0", "198.51.100.7/32"],
  "rds-create.id": ["pharmacy-db", "pharmacy-db-dev"], "rds-create.user": ["pharmacy"], "rds-create.storage": ["20", "50", "100"], "rds-create.backup": ["7", "1", "0"], "rds-sg-create.name": ["pharmacy-db"], "rds-sg-create.desc": ["pharmacy db subnets", "private subnets for DB"],
  "launch.name": ["pharmacy-jenkins", "pharmacy-sonarqube", "pharmacy-k8s-1", "pharmacy-dev", "pharmacy-db-1"], "launch.nsName": ["pharmacy-base", "pharmacy-jenkins", "pharmacy-k8s", "pharmacy-db"],
  "launch.nsDesc": ["pharmacy base", "pharmacy jenkins", "pharmacy k8s", "pharmacy db"], "launch.diskSize": ["8", "20", "30", "50"], "launch.hop": ["1", "2"],
  "tg-create.name": ["pharmacy-prd", "pharmacy-dev"], "tg-create.hcPath": ["/", "/healthz", "/api/health"], "alb-create.name": ["pharmacy-alb"],
  "user-create.name": ["terraform-admin", "pharmacy-ci"], "user-create.desc": ["aws configure บนเครื่องเรา", "terraform CLI"], "ak-create-.desc": ["aws configure บนเครื่องเรา", "terraform CLI"],
  "eip-alloc.bg": [REGION], "*.k": ["Name", "Role", "Tier", "Env", "Project"], "*.v": ["pharmacy", "jenkins", "sonarqube", "bastion", "k8s_server", "k8s_dev", "db", "prd", "dev"],
  "*.tag": ["v1.0.0", "v1.1.0", "dev-1"], "*.dest": ["0.0.0.0/0", "10.0.0.0/16", "10.1.0.0/16"], "*.cidr": ["10.0.1.0/24", "10.0.2.0/24", "10.1.1.0/24", "10.1.2.0/24"], "*.nk": ["pharmacy-admin", "pharmacy-admin-manual"]
};
function exFor(id) { var fn = UI.form ? UI.form.name : ""; var hit = EXF[fn + "." + id] || EXF["*." + id]; if (!hit && fn.slice(-1) === "-") hit = null; if (!hit) Object.keys(EXF).some(function (k) { if (k.indexOf(".") > 0 && k.slice(-id.length - 1) === "." + id && k.charAt(k.length - id.length - 2) === "-" && fn.indexOf(k.slice(0, k.length - id.length - 1)) === 0) { hit = EXF[k]; return true; } }); return hit ? hit.map(function (x) { return [x, x]; }) : null; }
// ex: [[val,label]]; get/set ค่า; flag = object+key ที่จำว่าเลือก "พิมพ์เอง" ไว้
// ทุก dropdown ตัวอย่าง: ถ้ามีค่าที่ขึ้นต้น pharmacy ให้เพิ่มคู่ cafe ต่อท้ายอัตโนมัติ (เพิ่ม ไม่แทนที่) สำหรับทดสอบโดยไม่ต้องพิมพ์
function cafeEx(ex) { var out = ex.slice(); ex.forEach(function (e) { var v = String(e[0]), l = String(e[1]); if ((/pharmacy/i.test(v) || /pharmacy/i.test(l)) && !/github\.com\//.test(v)) { var cv = v.replace(/pharmacy/g, "cafe"), cl = l.replace(/pharmacy/g, "cafe"); if (!out.some(function (o) { return String(o[0]) === cv; })) out.push([cv, cl]); } }); return out; }
function exPick(ex, get, set, flag, fk, ph, aria, area, type, id) {
  ex = cafeEx(ex);
  var cur = get() == null ? "" : String(get()), has = ex.some(function (e) { return e[0] === cur; }), custom = flag[fk] || (cur !== "" && !has);
  var opts = [];
  if (!custom && cur === "") opts.push(["", "— เลือกตัวอย่าง —"]);
  ex.forEach(function (e) { opts.push(e); }); opts.push([CUSTOM, "ไม่ระบุ — พิมพ์เอง"]);
  var s = h("select", { "aria-label": aria, onchange: function (e) { var v = e.target.value; if (v === CUSTOM) { flag[fk] = true; if (has) set(""); } else { flag[fk] = false; set(v); } render(); } }, opts.map(function (o) { return h("option", { value: o[0], text: o[1], selected: (custom ? o[0] === CUSTOM : String(o[0]) === cur) ? "selected" : null }); }));
  var box = h("div", {}, [s]);
  if (custom) { var t = h(area ? "textarea" : "input", { style: "width:100%;margin-top:6px", placeholder: ph || "", type: area ? null : (type || "text"), id: id || null, "aria-label": aria + " (พิมพ์เอง)", oninput: function (e) { set(e.target.value); } }); if (area) t.value = cur; else t.value = cur; box.appendChild(t); }
  return box;
}
// ---- แอนิเมชันอธิบายเครือข่าย (VPC → Subnet → IGW → Route table → ผูก subnet → packet วิ่งเข้าเครื่อง) ใช้ค่าจริงจากสถานะ
var NT = [], NA = { forget: false };
function sv(tag, at, kids) { var e = document.createElementNS("http://www.w3.org/2000/svg", tag); Object.keys(at || {}).forEach(function (k) { if (at[k] != null) e.setAttribute(k, at[k]); }); (kids || []).forEach(function (c) { e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); return e; }
function netData() {
  var v = S.vpcs.filter(function (x) { return !x.isDefault; })[0]; if (!v) return null;
  var sns = S.subnets.filter(function (x) { return x.vpcId === v.id; }), ig = vpcIgw(v.id), rts = S.rtbs.filter(function (r) { return r.vpcId === v.id && !r.main; }), main = rtbMain(v.id);
  var rt = rts.filter(function (r) { return hasIgwRoute(r); })[0] || rts[0];
  var asns = rts.length > 1 && rt ? sns.filter(function (x) { return rt.assoc.indexOf(x.id) >= 0; }) : sns; // หลาย route table (แบบจริง): แอนิเมชันวาดเฉพาะฝั่ง public
  return { v: v, sns: sns, asns: asns, ig: ig, rt: rt, main: main, insts: liveInsts(v.id) };
}
// ---- ทบทวน Subnet: ตัวเลข IP มาจากไหน / IP ที่ AWS สงวน / IP ที่ใช้จริง
// ---- ส่วนยุบ/ขยาย (details) ของแท็บ HCL: จำสถานะข้ามการ render
var FOLD = { anim: 1, review: 1, sgan: 1, diag: 1, code: 1 };
function fold(key, title, count) {
  var d = h("details", { cls: "fold", open: FOLD[key] ? "open" : null, style: "margin:0 0 10px" }), sm = h("summary", { style: "font-weight:700;font-size:1.02rem" }, [title]);
  d.appendChild(sm); d.addEventListener("toggle", function () { FOLD[key] = d.open ? 1 : 0; }); return d;
}
function foldAll(on) { Object.keys(FOLD).forEach(function (k) { FOLD[k] = on ? 1 : 0; }); [].forEach.call(document.querySelectorAll("#main details.fold"), function (d) { d.open = !!on; }); }
function ip2n(ip) { var p = ip.split(".").map(Number); return ((p[0] * 256 + p[1]) * 256 + p[2]) * 256 + p[3]; }
function n2ip(n) { return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join("."); }
function subnetReview(D) {
  var box = fold("review", "ทบทวน Subnet: ตัวเลข IP มาจากไหน"); box.style.marginTop = "14px"; box.style.borderTop = "1px solid var(--line,#d3dae3)"; box.style.paddingTop = "8px";
  var vb = +D.v.cidr.split("/")[1], vt = Math.pow(2, 32 - vb);
  box.appendChild(h("p", { cls: "hint", style: "margin:0 0 8px", text: "CIDR เขียนเป็น ที่อยู่เริ่มต้น/จำนวนบิตที่ล็อก · เลขหลัง / ยิ่งมาก = ล็อกมาก = เหลือที่อยู่น้อย (ซอยเล็ก) · VPC " + D.v.cidr + " ล็อก " + vb + " บิต เหลือ " + (32 - vb) + " บิต → 2^" + (32 - vb) + " = " + vt.toLocaleString() + " ที่อยู่ · ตัดเป็นซอย /24 ได้ " + Math.pow(2, 24 - vb) + " ซอย (10.0.0.0/24, 10.0.1.0/24 … ตามที่เลือกใช้)" }));
  D.sns.forEach(function (sn) {
    var pb = +sn.cidr.split("/")[1], total = Math.pow(2, 32 - pb), base = ip2n(sn.cidr.split("/")[0]), usable = total - 5, ins = D.insts.filter(function (x) { return x.subnetId === sn.id; });
    var usedN = ins.map(function (x) { return ip2n(x.privateIp); });
    var per = Math.max(1, total / 256), cells = h("div", { style: "display:grid;grid-template-columns:repeat(16,11px);gap:1px;flex:none", title: "1 ช่อง = " + per + " IP" });
    for (var c = 0; c < Math.min(256, total); c++) {
      var lo = base + c * per, hi = lo + per - 1, rsv = [base, base + 1, base + 2, base + 3, base + total - 1].some(function (a) { return a >= lo && a <= hi; }), used = usedN.some(function (a) { return a >= lo && a <= hi; });
      cells.appendChild(h("div", { style: "width:11px;height:11px;border-radius:2px;background:" + (used ? "#1d8102" : rsv ? "#c62828" : "rgba(95,107,122,.25)") }));
    }
    var rows = [[n2ip(base), "Network address", "ที่อยู่ของซอยเอง ใช้กับเครื่องไม่ได้"], [n2ip(base + 1), "VPC router", "ตัวกลางส่ง packet ตาม route table"], [n2ip(base + 2), "DNS ของ Amazon", "ตัวแปลงชื่อเป็น IP ในวง VPC"], [n2ip(base + 3), "สงวนไว้ใช้อนาคต", "AWS ไม่ให้ใช้"], [n2ip(base + total - 1), "Broadcast", "AWS ไม่รองรับ broadcast แต่ยังสงวนไว้"]];
    box.appendChild(h("div", { style: "display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;margin:0 0 14px;padding:10px 12px;border:1px solid var(--line,#d3dae3);border-radius:8px" }, [
      h("div", {}, [h("div", { style: "font-weight:700;margin-bottom:4px", text: (sn.name || sn.id) + " · " + sn.cidr }), cells,
        h("div", { style: "font-size:.75rem;margin-top:6px;display:flex;gap:10px;flex-wrap:wrap" }, [["#c62828", "สงวนโดย AWS 5"], ["#1d8102", "ใช้จริง " + ins.length], ["rgba(95,107,122,.5)", "ว่าง " + (usable - ins.length)]].map(function (l) { return h("span", {}, [h("span", { style: "display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;background:" + l[0] }), l[1]]); })),
        per > 1 ? h("div", { cls: "hint", style: "font-size:.72rem", text: "(1 ช่อง = " + per + " IP)" }) : null]),
      h("div", { style: "flex:1;min-width:300px;font-size:.88rem;line-height:1.6" }, [
        h("div", {}, ["① ", h("b", { text: sn.cidr }), " = ล็อก " + pb + " บิต → เหลือ 32 − " + pb + " = " + (32 - pb) + " บิต → 2^" + (32 - pb) + " = ", h("b", { text: total.toLocaleString() }), " ที่อยู่ (" + n2ip(base) + " – " + n2ip(base + total - 1) + ")"]),
        h("div", {}, ["② AWS สงวน 5 ที่อยู่ของทุกซอย → ใช้ได้ " + total.toLocaleString() + " − 5 = ", h("b", { text: usable.toLocaleString() }), " (" + n2ip(base + 4) + " – " + n2ip(base + total - 2) + ")"]),
        h("div", {}, ["③ ใช้จริงตอนนี้ ", h("b", { text: String(ins.length) }), " เครื่อง" + (ins.length ? ": " + ins.map(function (x) { return x.privateIp + " (" + (x.name || x.id) + ")"; }).join(", ") : "") + " → เหลือว่าง ", h("b", { text: (usable - ins.length).toLocaleString() })]),
        tbl(["ที่อยู่สงวน", "คืออะไร", "ทำไมใช้ไม่ได้"], rows, ""),
        h("div", { cls: "hint", style: "font-size:.78rem", text: "private IP ของเครื่องถูกแจกจากช่วงที่ว่าง " + n2ip(base + 4) + " – " + n2ip(base + total - 2) + " · AWS จริงแจกตัวไหนก็ได้ในช่วงนี้ (ภาพจริงมีเครื่องได้ 10.0.1.115) simulator แจกเรียง .4 .5 .6 ให้อ่านง่าย · public IP เป็นคนละเรื่อง มาจากกองกลางของ AWS ไม่ได้อยู่ในช่วงนี้" })])]));
  });
  box.appendChild(h("div", { cls: "hint", style: "margin-bottom:4px", text: "เลือกขนาดซอย (เทียบเร็ว):" }));
  box.appendChild(tbl(["CIDR", "บิตที่เหลือ", "ที่อยู่ทั้งหมด", "ใช้ได้จริง (−5)", "หมายเหตุ"], [["/16", "16", "65,536", "65,531", "ใหญ่สุดที่ VPC ยอม มักใช้เป็น VPC ทั้งก้อน"], ["/20", "12", "4,096", "4,091", "ซอยใหญ่"], ["/24", "8", "256", "251", "ที่นิยมสุดสำหรับซอย (lab นี้ใช้)"], ["/28", "4", "16", "11", "เล็กสุดที่ AWS ยอม"]]));
  return box;
}
function netAnim() {
  var D = netData(), card = h("div", { cls: "card", style: "margin-bottom:14px" }), body = fold("anim", "แอนิเมชัน: เครือข่ายนี้ทำงานยังไง (ใช้ค่าจริงที่คุณสร้าง)"); body.style.margin = "0"; body.style.padding = "8px 14px 12px";
  card.appendChild(body);
  if (!D || !D.asns.length) { body.appendChild(h("p", { cls: "hint", text: "ยังไม่มี VPC/Subnet ให้วาด · สร้าง VPC กับ subnet ก่อน หรือโหลด Lab ครบทั้งชุด" })); return card; }
  var W = 920, H = Math.max(330, 60 + D.asns.length * 112), n = D.asns.length, svg = sv("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", style: "max-width:" + W + "px;font-family:inherit", role: "img", "aria-label": "แผนภาพเครือข่าย VPC" });
  var hid = function (e, id) { e.setAttribute("data-s", id); e.style.opacity = "0"; e.style.transition = "opacity .5s"; return e; };
  var T = function (x, y, t, o) { o = o || {}; return sv("text", { x: x, y: y, "font-size": o.sz || 13, "font-weight": o.b ? 700 : 400, fill: o.c || "currentColor", "text-anchor": o.a || "start" }, [t]); };
  // internet
  var inet = sv("g", {}, [sv("rect", { x: 12, y: H / 2 - 44, width: 110, height: 88, rx: 44, fill: "#eef3fa", stroke: "#8aa4c8" }), T(67, H / 2 - 4, "Internet", { a: "middle", b: 1, c: "#2a4a7a" }), T(67, H / 2 + 14, "(ผู้ใช้/เรา)", { a: "middle", sz: 11, c: "#2a4a7a" })]);
  svg.appendChild(inet);
  // VPC
  var vx = 190, vw = W - vx - 12;
  svg.appendChild(hid(sv("g", {}, [sv("rect", { x: vx, y: 12, width: vw, height: H - 24, rx: 10, fill: "rgba(9,114,211,.06)", stroke: "#0972d3", "stroke-width": 2 }), T(vx + 12, 34, "VPC " + (D.v.name || D.v.id) + "  ·  " + D.v.cidr, { b: 1, c: "#0972d3" }), T(vx + 12, 51, "= " + Math.pow(2, 32 - +D.v.cidr.split("/")[1]).toLocaleString() + " ที่อยู่ IP ส่วนตัว (ใครอยู่นอก VPC มองไม่เห็น)", { sz: 11 })]), "vpc"));
  // route table (left inside)
  var rx = vx + 18, rw = 235, ry = 76, rtRoutes = D.rt ? D.rt.routes : [], rh = 62 + (rtRoutes.length + 1) * 18;
  var rtG = sv("g", {}, [sv("rect", { x: rx, y: ry, width: rw, height: rh, rx: 8, fill: "rgba(132,86,206,.10)", stroke: "#8456ce", "stroke-width": 1.5 }), T(rx + 10, ry + 20, "Route table " + (D.rt ? (D.rt.name || D.rt.id) : "main"), { b: 1, c: "#8456ce" }), T(rx + 10, ry + 40, "ปลายทาง → ไปทางไหน", { sz: 11 }), T(rx + 10, ry + 58, D.v.cidr + "  →  local (ในวงเดียวกัน)", { sz: 12 })]);
  rtRoutes.forEach(function (x, i) { var tg = x.target.indexOf("igw-") === 0 ? "igw " + nm(find(S.igws, x.target)) : x.target; rtG.appendChild(T(rx + 10, ry + 76 + i * 18, x.dest + "  →  " + tg, { sz: 12, b: 1, c: "#8456ce" })); });
  if (!rtRoutes.length) rtG.appendChild(T(rx + 10, ry + 76, "(ไม่มี route ออกนอก VPC)", { sz: 12, c: "#c62828" }));
  svg.appendChild(hid(rtG, "rt"));
  // igw on VPC edge
  var iy = H / 2 - 22, igG = sv("g", {}, [sv("rect", { x: vx - 28, y: iy, width: 56, height: 44, rx: 7, fill: "#fff3e8", stroke: "#f2711c", "stroke-width": 2 }), T(vx, iy + 19, "IGW", { a: "middle", b: 1, c: "#c2500c" }), T(vx, iy + 34, D.ig ? "attached" : "ไม่มี", { a: "middle", sz: 10, c: "#c2500c" })]);
  svg.appendChild(hid(igG, "igw"));
  svg.appendChild(hid(sv("line", { x1: 122, y1: H / 2, x2: vx - 28, y2: H / 2, stroke: "#f2711c", "stroke-width": 2, "stroke-dasharray": D.ig ? "" : "5 4" }), "igw"));
  // subnets
  var sx = rx + rw + 70, sw = W - sx - 24, sh = Math.min(100, (H - 96) / n - 10), pos = {};
  D.asns.forEach(function (sn, i) {
    var y = 70 + i * ((H - 96) / n), rt = subnetRtb(sn), explicit = D.rt && D.rt.assoc.indexOf(sn.id) >= 0 && !NA.forget, here = D.insts.filter(function (x) { return x.subnetId === sn.id; });
    var eff = explicit ? D.rt : (D.rt && D.rt.assoc.indexOf(sn.id) >= 0 ? D.main : rt), isPub = hasIgwRoute(eff), col = isPub ? "#1d8102" : "#5f6b7a";
    pos[sn.id] = { y: y + sh / 2, explicit: explicit, isPub: isPub, inst: here[0] };
    var g = sv("g", {}, [sv("rect", { x: sx, y: y, width: sw, height: sh, rx: 8, fill: isPub ? "rgba(29,129,2,.08)" : "rgba(95,107,122,.10)", stroke: col, "stroke-width": 1.5 }),
      T(sx + 10, y + 19, "Subnet " + (sn.name || sn.id), { b: 1, c: col }), T(sx + 10, y + 36, sn.cidr + "  ·  " + sn.az + "  ·  " + (Math.pow(2, 32 - +sn.cidr.split("/")[1]) - 5) + " IP ใช้ได้", { sz: 11 }),
      T(sx + 10, y + 53, isPub ? "PUBLIC: route 0.0.0.0/0 → IGW" : "PRIVATE: ไม่มีทางตรงออกเน็ต" + (NA.forget && D.rt && D.rt.assoc.indexOf(sn.id) >= 0 ? " (ลืมผูก → ใช้ main table)" : ""), { sz: 11, b: 1, c: col })]);
    var bw = (sw - 30) / 2; here.slice(0, 2).forEach(function (ins, k) { g.appendChild(sv("rect", { x: sx + 10 + k * (bw + 10), y: y + 61, width: bw, height: 30, rx: 5, fill: "#fff", stroke: "#0f766e" })); g.appendChild(T(sx + 16 + k * (bw + 10), y + 73, "🖥 " + (ins.name || ins.id), { sz: 10, b: 1 })); g.appendChild(T(sx + 16 + k * (bw + 10), y + 86, ins.publicIp || "(ไม่มี public IP)", { sz: 10 })); });
    svg.appendChild(hid(g, "sn" + i));
    // association line RT -> subnet
    svg.appendChild(hid(sv("line", { x1: rx + rw, y1: ry + rh / 2, x2: sx, y2: y + sh / 2, stroke: explicit ? "#8456ce" : "#c62828", "stroke-width": 2, "stroke-dasharray": explicit ? "" : "5 4" }), "as" + i));
    var lab = T((rx + rw + sx) / 2, (ry + rh / 2 + y + sh / 2) / 2 - 4, explicit ? "ผูกแล้ว" : "ไม่ได้ผูก", { sz: 10, a: "middle", c: explicit ? "#8456ce" : "#c62828", b: 1 }); svg.appendChild(hid(lab, "as" + i));
  });
  // packet
  var pk = sv("circle", { r: 9, cx: 0, cy: 0, fill: "#ff9900", stroke: "#fff", "stroke-width": 2 }); pk.style.opacity = "0"; pk.style.transition = "transform .9s ease-in-out, opacity .3s"; pk.setAttribute("id", "npk");
  var pkl = T(0, 0, "", { sz: 11, b: 1 }); pkl.setAttribute("id", "npkl");
  svg.appendChild(pk);
  body.appendChild(h("p", { cls: "hint", style: "margin:0 0 8px", text: "(ภาพนี้แสดง public subnet กับทางเข้าจากเน็ต · private subnet, NAT และ bastion ดูในแอนิเมชันระบบทั้งหมดด้านล่าง) กด ▶ ดูทีละขั้น: สร้าง VPC → Subnet → IGW → Route table → ผูก subnet → ส่ง packet จากอินเทอร์เน็ตเข้าเครื่อง (ผลลัพธ์ตอนท้ายคำนวณจากค่าจริงของคุณ ไม่ใช่ภาพจำลอง)" }));
  var spd = h("select", { id: "nspd", "aria-label": "ความเร็ว" }, [["2.6", "ช้า"], ["1.7", "ปกติ"], ["0.9", "เร็ว"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: o[0] === "1.7" ? "selected" : null }); }));
  var msg = h("div", { id: "nmsg", style: "min-height:2.6em;margin:8px 0;font-weight:600;line-height:1.5" , text: "" }), res = h("div", { id: "nres", style: "margin:6px 0" });
  var tgt = D.insts.filter(function (x) { return D.asns.some(function (sn) { return sn.id === x.subnetId; }); })[0];
  function show(id, on) { [].forEach.call(svg.querySelectorAll('[data-s="' + id + '"]'), function (e) { e.style.opacity = on ? "1" : "0"; }); }
  var steps = [], idx = 0, paused = false, pbtn = null;
  function setP(on) { paused = on; if (pbtn) { pbtn.textContent = on ? "▶ เล่นต่อ" : "⏸ หยุดชั่วคราว"; pbtn.disabled = idx >= steps.length && !on; } }
  function tick() { NT.forEach(clearTimeout); NT = []; if (paused || idx >= steps.length) { if (idx >= steps.length) setP(false), pbtn && (pbtn.disabled = true); return; } var st = steps[idx++]; st[0](); if (st[1]) msg.textContent = st[1]; NT.push(setTimeout(tick, +spd.value * 1000)); }
  function reset() { NT.forEach(clearTimeout); NT = []; steps = []; idx = 0; paused = false; if (pbtn) { pbtn.textContent = "⏸ หยุดชั่วคราว"; pbtn.disabled = true; } [].forEach.call(svg.querySelectorAll("[data-s]"), function (e) { e.style.opacity = "0"; }); pk.style.opacity = "0"; pk.setAttribute("fill", "#ff9900"); msg.textContent = ""; res.textContent = ""; pkl.textContent = ""; }
  function pauseToggle() { if (!steps.length || (idx >= steps.length && !paused)) return; if (paused) { setP(false); tick(); } else { NT.forEach(clearTimeout); NT = []; setP(true); } }
  function run() {
    reset(); var d = +spd.value * 1000;
    function at(fn, txt) { steps.push([fn, txt]); }
    var cidrSz = Math.pow(2, 32 - +D.v.cidr.split("/")[1]);
    at(function () { show("vpc", 1); }, "① VPC = เครือข่ายส่วนตัวของเรา ช่วง " + D.v.cidr + " = ล็อก " + D.v.cidr.split("/")[1] + " บิต เหลือ " + (32 - +D.v.cidr.split("/")[1]) + " บิต → " + cidrSz.toLocaleString() + " IP ทุกอย่างอยู่ในกรอบนี้ ตอนนี้ยังออกอินเทอร์เน็ตไม่ได้");
    D.asns.forEach(function (sn, i) { at(function () { show("sn" + i, 1); }, "② Subnet " + (sn.name || sn.id) + " = ซอยย่อย " + sn.cidr + " อยู่ใน " + sn.az + " ที่เดียว · /" + sn.cidr.split("/")[1] + " → เหลือ " + (32 - +sn.cidr.split("/")[1]) + " บิต → 2^" + (32 - +sn.cidr.split("/")[1]) + " = " + Math.pow(2, 32 - +sn.cidr.split("/")[1]) + " IP − 5 ที่ AWS สงวน = " + (Math.pow(2, 32 - +sn.cidr.split("/")[1]) - 5) + " ใช้ได้ (ดูตารางทบทวนด้านล่าง) · public/private ดูที่ route ไม่ใช่ชื่อ"); });
    at(function () { show("igw", 1); }, D.ig ? "③ Internet gateway (" + nm(D.ig) + ") = ประตูเดียวของ VPC สู่อินเทอร์เน็ต ต้อง attach กับ VPC แต่มีประตูแล้วยัง 'ไม่มีใครรู้ว่าต้องเดินไปประตู'" : "③ ยังไม่มี Internet gateway → VPC นี้ปิดตาย ออกเน็ตไม่ได้เลย");
    at(function () { show("rt", 1); }, "④ Route table = ตารางเส้นทาง (ป้ายบอกทาง) ตอบคำถามเดียว: \"packet นี้ไปที่ IP ปลายทางนี้ ให้ส่งทางไหน?\" · บรรทัด 1: ปลายทางอยู่ในวง " + D.v.cidr + " (เช่น " + D.v.cidr.replace(/\.0\.0\/\d+$/, ".1.5") + ") → local = ส่งกันเองในเครือข่ายเรา ไม่ออกนอก · " + (D.rt && D.rt.routes.length ? "บรรทัด 2: ปลายทางอื่นทั้งหมด (" + D.rt.routes.map(function (x) { return x.dest; }).join(", ") + " เช่น 8.8.8.8) → IGW = ส่งออกประตูอินเทอร์เน็ต · ถ้าตรงหลายบรรทัด เลือกบรรทัดที่วงเล็กกว่า (เจาะจงกว่า) ก่อน" : "ยังไม่มีบรรทัดที่ 2 (ไม่มีทางออกนอก VPC) ปลายทางนอกวงนี้ packet จึงไปไหนไม่ได้"));
    D.asns.forEach(function (sn, i) { at(function () { show("as" + i, 1); }, pos[sn.id] && pos[sn.id].explicit ? "⑤ ผูก (association) " + (sn.name || sn.id) + " กับ route table นี้ → ซอยนี้ใช้ป้ายบอกทางชุดนี้" : "⑤ " + (sn.name || sn.id) + " ไม่ได้ถูกผูกกับ route table นี้ → ตกไปใช้ main route table (ไม่มีทางออก) = เส้นแดงขาดๆ · นี่คือสาเหตุ timeout ที่พบบ่อย"); });
    // packet
    if (tgt) {
      var sn = find(S.subnets, tgt.subnetId), p = pos[sn.id], i = D.asns.indexOf(sn), ck = sshCheck(tgt, tgt.keyName || ""), bad = ck.steps.filter(function (x) { return !x.ok && !x.skip; })[0]; if (NA.forget && D.rt && D.rt.assoc.indexOf(sn.id) >= 0) bad = { t: "route table ของซอยมีเส้นทาง 0.0.0.0/0 → internet gateway", d: "(จำลอง) ซอยนี้ไม่ได้ถูกผูก จึงใช้ main route table ที่ไม่มีทางออก" };
      function mv(x, y, txt) { pk.style.transform = "translate(" + x + "px," + y + "px)"; if (txt) msg.textContent = txt; }
      at(function () { pk.style.opacity = "1"; pk.style.transition = "none"; mv(67, H / 2); void pk.getBoundingClientRect(); pk.style.transition = "transform .9s ease-in-out, opacity .3s"; }, "⑥ ลองส่ง packet จากอินเทอร์เน็ต (SSH port 22) ไปที่ " + (tgt.name || tgt.id) + (tgt.publicIp ? " ที่ " + tgt.publicIp : " (เครื่องนี้ไม่มี public IP)"));
      at(function () { mv(vx, H / 2); }, "→ ถึง IGW: IGW แปลง public IP " + (tgt.publicIp || "?") + " เป็น private IP " + tgt.privateIp + " ของเครื่อง");
      at(function () { mv(rx + rw / 2, ry + rh / 2); }, "→ ดู route table: ปลายทาง " + tgt.privateIp + " อยู่ในวง " + D.v.cidr + " → local ส่งต่อได้");
      at(function () { if (p.explicit && p.isPub) mv(sx + 60, p.y); else { mv((rx + rw + sx) / 2, ry + rh / 2 + 30); pk.setAttribute("fill", "#c62828"); } }, p.explicit && p.isPub ? "→ ซอย " + (sn.name || sn.id) + " ผูกกับ route table ที่มีทางออก IGW ผ่าน" : "✗ ซอย " + (sn.name || sn.id) + " ไม่มีเส้นทางไปกลับ IGW → packet หายเงียบๆ");
      at(function () { if (!bad) mv(sx + 70, p.y + 14, ""); }, bad ? "✗ " + (NA.forget ? "ผลกรณีจำลอง" : "ผลจริง") + ": " + bad.t + " — " + bad.d : "✓ ผลจริงจากค่าที่คุณตั้ง: ผ่านทุกด่านจนถึง security group และ key pair");
      steps.push([function () { res.textContent = ""; res.appendChild(h("div", { cls: "alert " + (bad ? "bad" : "info"), text: (NA.forget ? "ผลลัพธ์กรณีจำลอง (ไม่ใช่ค่าจริง) " : "ผลลัพธ์จริง ") + "(SSH จาก My IP " + S.myIp + " ไป " + (tgt.name || tgt.id) + "): " + (bad ? "✗ ไม่ผ่านที่ \"" + bad.t + "\" → " + bad.d : "✓ " + ck.out) })); }, ""]);
    } else at(function () {}, "(ยังไม่มีเครื่องใน subnet เหล่านี้ จึงไม่ส่ง packet ลองสร้าง/โหลดเครื่องก่อน)");
    pbtn.disabled = false; tick();
  }
  var ctl = h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, [
    h("button", { cls: "btn pri", type: "button", text: "▶ เล่นอธิบายเครือข่าย", onclick: run }),
    (pbtn = h("button", { cls: "btn", type: "button", text: "⏸ หยุดชั่วคราว", disabled: true, onclick: pauseToggle })),
    h("button", { cls: "btn", type: "button", text: "⏹ รีเซ็ต", onclick: reset }),
    h("label", { style: "font-size:.8rem" }, ["ความเร็ว ", spd]),
    h("label", { style: "font-size:.8rem" }, [h("input", { type: "checkbox", checked: NA.forget, onchange: function (e) { NA.forget = e.target.checked; render(); } }), " ลองกรณี \"ลืมผูก subnet\" (ดูเฉยๆ ไม่แก้ค่าจริง)"])]);
  body.appendChild(ctl); body.appendChild(msg); body.appendChild(svg); body.appendChild(res); body.appendChild(subnetReview(D));
  return card;
}
// ---- แอนิเมชัน Security group: ใคร (เรา / คนแปลกหน้า) เข้า port ไหนได้บ้าง ใช้ sgAllows จริง
var ST = [], STR = "192.0.2.50";
function sgAnim() {
  var card = h("div", { cls: "card", style: "margin-bottom:14px" }), body = fold("sgan", "แอนิเมชัน: Security group ใครเข้าได้บ้าง (0.0.0.0/0 ควรใช้ตรงไหน)"); body.style.margin = "0"; body.style.padding = "8px 14px 12px"; card.appendChild(body);
  var vids = S.vpcs.filter(function (v) { return !v.isDefault; }).map(function (v) { return v.id; }), sgs = S.sgs.filter(function (g) { return vids.indexOf(g.vpcId) >= 0 && g.name !== "default" && g.inbound.length; });
  if (!sgs.length) { body.appendChild(h("p", { cls: "hint", text: "ยังไม่มี security group ที่มีกฎขาเข้า · สร้างหรือโหลด Lab ครบทั้งชุดก่อน" })); return card; }
  body.appendChild(h("div", { cls: "alert info", style: "margin:0 0 8px", text: "จำง่ายๆ: 0.0.0.0/0 ใน route table = ปกติ (ทางออกเริ่มต้น) · ใน security group ใช้เฉพาะ port เว็บสาธารณะ 80/443 · ที่เหลือจำกัด IP (/32) หรืออ้าง SG อื่น" }));
  var rowsAll = [], tbody = h("tbody");
  sgs.forEach(function (g) {
    tbody.appendChild(h("tr", { style: "cursor:default;background:" + hexA("#c62828", 0.07) }, [h("td", { colspan: "6" }, [h("b", { text: "🛡 " + g.name })])]));
    g.inbound.forEach(function (r) {
      var rk = sgRuleRisk(g, r), port = r.proto === "-1" ? 22 : r.from, me = r.srcKind === "sg" ? false : sgAllows([g.id], port, { ip: S.myIp }), st = r.srcKind === "sg" ? false : sgAllows([g.id], port, { ip: STR });
      var cMe = h("td", { cls: "rs", style: "min-width:110px" }), cSt = h("td", { cls: "rs", style: "min-width:110px" }), cRk = h("td", { cls: "rs" });
      tbody.appendChild(h("tr", { style: "cursor:default" }, [h("td", { text: ruleType(r) }), h("td", { text: r.proto === "-1" ? "ทุก port" : (r.from === r.to ? String(r.from) : r.from + "-" + r.to) }), h("td", { text: srcText(r) }), cMe, cSt, cRk]));
      rowsAll.push({ g: g, r: r, rk: rk, me: me, st: st, sgSrc: r.srcKind === "sg", cMe: cMe, cSt: cSt, cRk: cRk });
    });
  });
  var msg = h("div", { id: "sgmsg", style: "min-height:2.6em;margin:8px 0;font-weight:600;line-height:1.5" }), score = h("div", { style: "margin:8px 0" }), spd = h("select", { "aria-label": "ความเร็ว", id: "sgspd" }, [["1.6", "ช้า"], ["0.9", "ปกติ"], ["0.4", "เร็ว"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: o[0] === "0.9" ? "selected" : null }); }));
  var idx = 0, paused = false, pbtn = null, steps = [];
  function pill(ok, t) { return h("span", { style: "display:inline-block;padding:1px 8px;border-radius:10px;font-weight:700;font-size:.82rem;color:#fff;background:" + (ok ? "#1d8102" : "#c62828") }, [t]); }
  function reset() { ST.forEach(clearTimeout); ST = []; steps = []; idx = 0; paused = false; if (pbtn) { pbtn.textContent = "⏸ หยุดชั่วคราว"; pbtn.disabled = true; } rowsAll.forEach(function (x) { x.cMe.textContent = ""; x.cSt.textContent = ""; x.cRk.textContent = ""; x.cMe.parentNode.style.background = ""; }); msg.textContent = ""; score.textContent = ""; }
  function tick() { ST.forEach(clearTimeout); ST = []; if (paused) return; if (idx >= steps.length) { if (pbtn) pbtn.disabled = true; return; } var s0 = steps[idx++]; s0(); ST.push(setTimeout(tick, +spd.value * 1000)); }
  function run() {
    reset();
    rowsAll.forEach(function (x) {
      var port = x.r.proto === "-1" ? "ทุก port" : "port " + (x.r.from === x.r.to ? x.r.from : x.r.from + "-" + x.r.to);
      steps.push(function () { x.cMe.parentNode.style.background = hexA("#ff9900", 0.18); msg.textContent = "🛡 " + x.g.name + " · กฎ " + port + " ← " + srcText(x.r) + " · ส่ง packet จาก 👤 คุณ (" + S.myIp + ") ..."; x.cMe.appendChild(x.sgSrc ? h("span", { cls: "hint", text: "ไม่ใช่ IP (อ้าง SG)" }) : pill(x.me, x.me ? "✓ ผ่าน" : "✗ ถูกทิ้ง")); });
      steps.push(function () { msg.textContent = "🛡 " + x.g.name + " · กฎ " + port + " · ส่ง packet จาก 🕵 คนแปลกหน้า (" + STR + ") ..." + (x.sgSrc ? " (ไม่ว่าจะ IP ไหนก็ผ่านไม่ได้ ต้องมาจากเครื่องใน SG นั้นเท่านั้น)" : ""); x.cSt.appendChild(x.sgSrc ? h("span", { cls: "hint", text: "ผ่านไม่ได้ (ไม่อยู่ใน SG)" }) : pill(!x.st, x.st ? (x.rk.lvl === "ok" ? "✓ เข้าได้ (ตั้งใจ: เว็บสาธารณะ)" : "✗ เข้าได้!") : "✓ ถูกบล็อก")); x.cSt.firstChild.style.background = x.sgSrc ? "" : (x.st ? (x.rk.lvl === "ok" ? "#0972d3" : "#c62828") : "#1d8102"); });
      steps.push(function () { x.cMe.parentNode.style.background = ""; msg.textContent = RISK_ICON[x.rk.lvl] + " " + x.rk.why; x.cRk.appendChild(h("span", { style: "font-weight:700;color:" + ({ ok: "#1d8102", warn: "#b36b00", bad: "#c62828" })[x.rk.lvl], text: RISK_ICON[x.rk.lvl] + " " + ({ ok: "เหมาะสม", warn: "ทบทวน", bad: "เสี่ยง" })[x.rk.lvl] })); });
    });
    steps.push(function () {
      var open = rowsAll.filter(function (x) { return x.r.srcKind === "cidr" && x.r.src === "0.0.0.0/0"; }), badN = rowsAll.filter(function (x) { return x.rk.lvl === "bad"; }), okOpen = open.filter(function (x) { return x.rk.lvl === "ok"; });
      msg.textContent = "สรุป"; score.textContent = ""; score.appendChild(h("div", { cls: "alert " + (badN.length ? "bad" : "info"), text: "กฎทั้งหมด " + rowsAll.length + " ข้อ · เปิดทั้งโลก (0.0.0.0/0) " + open.length + " ข้อ (เหมาะสม " + okOpen.length + ": " + (okOpen.map(function (x) { return x.g.name + " " + x.r.from; }).join(", ") || "-") + ") · ที่เสี่ยง " + badN.length + " ข้อ" + (badN.length ? ": " + badN.map(function (x) { return x.g.name + " port " + x.r.from; }).join(", ") + " → แก้ Source เป็น My IP/32 หรืออ้าง SG" : " → ไม่มีกฎเสี่ยง ตรงหลัก (เปิดทั้งโลกเฉพาะเว็บสาธารณะ)") }));
      if (pbtn) pbtn.disabled = true;
    });
    pbtn.disabled = false; tick();
  }
  function pauseToggle() { if (!steps.length || (idx >= steps.length && !paused)) return; paused = !paused; pbtn.textContent = paused ? "▶ เล่นต่อ" : "⏸ หยุดชั่วคราว"; if (!paused) tick(); else { ST.forEach(clearTimeout); ST = []; } }
  body.appendChild(h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, [h("button", { cls: "btn pri", type: "button", text: "▶ เล่น: ใครเข้าได้บ้าง", onclick: run }), (pbtn = h("button", { cls: "btn", type: "button", text: "⏸ หยุดชั่วคราว", disabled: true, onclick: pauseToggle })), h("button", { cls: "btn", type: "button", text: "⏹ รีเซ็ต", onclick: reset }), h("label", { style: "font-size:.8rem" }, ["ความเร็ว ", spd])]));
  body.appendChild(msg);
  body.appendChild(h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, ["Type", "Port", "Source ที่อนุญาต", "👤 คุณ (My IP " + S.myIp + ")", "🕵 คนแปลกหน้า (" + STR + ")", "ประเมิน"].map(function (x) { return h("th", { text: x }); }))]), tbody])]));
  body.appendChild(score);
  body.appendChild(h("p", { cls: "hint", text: "ผลผ่าน/ถูกบล็อกคำนวณจากกฎจริงที่คุณมี (ฟังก์ชันตรวจเดียวกับหน้า Connect) · security group เป็น firewall แบบ drop เงียบ: ที่ถูกบล็อกจะ timeout ไม่มีข้อความปฏิเสธ · ป้าย ✅⚠️❌ เป็นหลักทั่วไป ไม่ใช่ผลสแกนความปลอดภัย" }));
  return card;
}
// แผนภาพ "สร้างอะไรก่อน-หลัง" ของแท็บ HCL
var HCL_GRP = { vpc: ["VPC", "#0972d3"], subnet: ["Subnet", "#00a1c9"], igw: ["Internet gateway", "#f2711c"], eip: ["Elastic IP", "#c47d00"], nat: ["NAT gateway", "#e8590c"], rtb: ["Route table", "#8456ce"], rtba: ["ผูก subnet↔route table", "#d63f9e"], sg: ["Security group", "#c62828"], key: ["Key pair", "#8a9a00"], role: ["IAM role", "#1d8102"], attach: ["แนบ policy", "#7cb518"], profile: ["Instance profile", "#4f5bd5"], ecr: ["ECR", "#a85a00"], instance: ["EC2 instance", "#0f766e"], tg: ["Target group", "#b8860b"], tgatt: ["ลงทะเบียน target", "#6d4c41"], alb: ["Load balancer", "#d81b60"], listener: ["Listener", "#546e7a"], eks: ["EKS cluster", "#0f9d8a"], lg: ["CloudWatch log group", "#c2410c"], ecsc: ["ECS cluster", "#d97706"], ecstd: ["ECS task definition", "#b45309"], ecssvc: ["ECS service", "#0f766e"], s3: ["S3 bucket", "#3f8624"], pab: ["Block public access", "#7a8a3a"], obj: ["ไฟล์ใน bucket", "#8a6d3b"], oac: ["OAC", "#8456ce"], zone: ["Route 53 zone", "#0d7c8f"], cert: ["ACM certificate", "#b8860b"], certrec: ["CNAME ตรวจสอบ", "#a35a00"], certval: ["รอ Issued", "#6a8a00"], cfd: ["CloudFront", "#c2410c"], s3pol: ["Bucket policy", "#c62828"], r53: ["Route 53 record", "#2563eb"], dbsg: ["DB subnet group", "#a35a00"], ng: ["EKS node group", "#2e7d32"], rds: ["RDS database", "#b45309"], asgatt: ["ผูก ASG↔target group", "#5e35b1"] };
// animation: เล่นลำดับ apply (ซ้าย→ขวา) / destroy (ขวา→ซ้าย) บนแผนภาพ + โค้ด
var HT = [];
function hclAnim(mode) {
  HT.forEach(clearTimeout); HT = [];
  var boxes = [].slice.call(document.querySelectorAll("#main [data-l]")), blocks = [].slice.call(document.querySelectorAll("#main [id^='hb-']")), msg = document.getElementById("hmsg"), dur = (+((document.getElementById("hspd") || {}).value) || 1.4) * 1000;
  function setSt(b, t, c) { var st = b.querySelector(".hst"); if (st) { st.textContent = t; st.style.color = c || ""; } }
  function reset() { boxes.concat(blocks).forEach(function (e) { e.classList.remove("hdim", "hlive", "hgone", "hcreating"); }); boxes.forEach(function (b) { setSt(b, ""); }); }
  reset();
  if (mode === "reset") { if (msg) msg.textContent = "กด ▶ เพื่อดู Terraform สร้างทีละขั้น (กล่องและโค้ดจะสว่างขึ้นตามลำดับ)"; return; }
  var layers = boxes.reduce(function (a, b) { var l = +b.getAttribute("data-l"); if (a.indexOf(l) < 0) a.push(l); return a; }, []).sort(function (x, y) { return x - y; }), ap = mode === "apply";
  if (!ap) layers.reverse(); else boxes.concat(blocks).forEach(function (e) { e.classList.add("hdim"); });
  layers.forEach(function (L, idx) {
    var inL = boxes.filter(function (b) { return +b.getAttribute("data-l") === L; }), keys = inL.map(function (b) { return b.getAttribute("data-k"); });
    if (!inL.length) return;
    var names = inL.map(function (b) { return b.firstChild.textContent.replace(/ ×.*/, ""); }).join(", "), t0 = idx * dur;
    HT.push(setTimeout(function () {
      if (msg) msg.textContent = ap ? "ขั้นที่ " + L + ": สร้าง " + names + (inL.length > 1 ? " พร้อมกัน" : "") + (L > 1 ? " (รอขั้นก่อนหน้าเสร็จก่อน เพราะต้องอ้างถึงมัน)" : " (ไม่ต้องรอใคร)") : "ลบขั้นที่ " + L + " ก่อน: " + names + " (ต้องลบตัวที่อ้างถึงคนอื่นก่อน ไม่งั้น AWS ฟ้อง DependencyViolation)";
      inL.forEach(function (b) { b.classList.remove("hdim"); b.classList.add(ap ? "hcreating" : "hlive"); setSt(b, ap ? "Still creating..." : "Destroying...", ap ? "#b36b00" : "#d91515"); });
      blocks.forEach(function (e) { if (keys.indexOf(e.getAttribute("data-k")) >= 0) { e.classList.remove("hdim"); e.classList.add("hlive"); } });
    }, t0));
    HT.push(setTimeout(function () {
      inL.forEach(function (b) { b.classList.remove("hcreating"); if (ap) setSt(b, "✓ Creation complete", "#1d8102"); else { b.classList.add("hgone"); setSt(b, "✓ Destruction complete", "#5f6b7a"); } });
      if (!ap) blocks.forEach(function (e) { if (keys.indexOf(e.getAttribute("data-k")) >= 0) e.classList.add("hgone"); });
      if (idx === layers.length - 1 && msg) msg.textContent = ap ? "เสร็จ: Apply complete! สร้างครบ " + boxes.length + " กลุ่ม ลองกด ◀ เพื่อดูตอนลบ (ย้อนลำดับ)" : "เสร็จ: Destroy complete! ลบย้อนจากขวาไปซ้าย กด ⏹ รีเซ็ตเพื่อกลับ";
    }, t0 + dur * 0.7));
  });
}
function hclDiagram() {
  var layers = hclPlan(), n = layers.reduce(function (a, l) { return a + l.length; }, 0), wrap = fold("diag", "แผนภาพลำดับการสร้าง (อ่านซ้ายไปขวา) · สีเดียวกันในโค้ดด้านล่าง"); wrap.className = "fold card"; wrap.style.padding = "8px 14px 12px"; wrap.style.margin = "0 0 14px";
  wrap.appendChild(h("p", { cls: "hint", style: "margin:0 0 8px", text: "Terraform สร้างอันที่ไม่พึ่งกันพร้อมกัน แล้วรออันที่ต้องอ้างถึง · ลบ (destroy) ย้อนลำดับนี้จากขวาไปซ้าย · แต่ละกล่องบอกว่าต้องมีอะไรก่อน และกดเมนูไหนใน console" }));
  if (!n) { wrap.appendChild(h("p", { cls: "hint", text: "ยังไม่มี resource ให้วาด" })); return wrap; }
  var present = {}; layers.forEach(function (l) { l.forEach(function (b) { present[b.key] = 1; }); });
  var legend = h("div", { style: "display:flex;gap:10px;flex-wrap:wrap;margin:0 0 8px;font-size:.8rem" });
  Object.keys(HCL_GRP).forEach(function (k) { if (!present[k]) return; var g = HCL_GRP[k]; legend.appendChild(h("span", { style: "border:1px solid " + hexA(g[1], 0.35) + ";border-left:5px solid " + g[1] + ";background:" + hexA(g[1], 0.1) + ";padding:2px 10px;border-radius:8px;font-weight:600;color:color-mix(in srgb, " + g[1] + " 72%, var(--fg))", text: g[0] })); });
  wrap.appendChild(legend);
  var ctl = h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 6px" }, [
    h("button", { cls: "btn pri", type: "button", text: "▶ เล่น: terraform apply", onclick: function () { hclAnim("apply"); } }),
    h("button", { cls: "btn", type: "button", text: "◀ เล่น: terraform destroy", onclick: function () { hclAnim("destroy"); } }),
    h("button", { cls: "btn", type: "button", text: "⏹ รีเซ็ต", onclick: function () { hclAnim("reset"); } }),
    h("label", { style: "font-size:.8rem" }, ["ความเร็ว ", h("select", { id: "hspd", "aria-label": "ความเร็ว animation" }, [["2.4", "ช้า"], ["1.4", "ปกติ"], ["0.6", "เร็ว"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: o[0] === "1.4" ? "selected" : null }); }))])]);
  wrap.appendChild(ctl);
  wrap.appendChild(h("div", { id: "hmsg", cls: "hint", style: "min-height:1.4em;margin:0 0 6px;font-weight:600", text: "กด ▶ เพื่อดู Terraform สร้างทีละขั้น (กล่องและโค้ดจะสว่างขึ้นตามลำดับ)" }));
  var row = h("div", { style: "display:flex;gap:6px;align-items:stretch;overflow-x:auto;padding-bottom:6px" });
  layers.forEach(function (l, i) {
    if (!l.length) return;
    if (row.children.length) row.appendChild(h("div", { style: "align-self:center;font-size:1.3rem;color:var(--accent);font-weight:700", text: "→" }));
    row.appendChild(h("div", { style: "min-width:128px;flex:1 1 0" }, [h("div", { style: "display:inline-block;font-weight:700;margin-bottom:8px;font-size:.8rem;padding:3px 12px;border-radius:999px;background:var(--accent-bg);color:var(--accent);border:1px solid color-mix(in srgb, var(--accent) 25%, transparent)", text: "ขั้นที่ " + (i + 1) + (i === 0 ? " · ไม่ต้องรอใคร" : "") })].concat(l.map(function (b) {
      var g = HCL_GRP[b.key], nm2 = b.names.filter(Boolean), shown = nm2.slice(0, 4).join(", ") + (nm2.length > 4 ? " +" + (nm2.length - 4) : "");
      return h("div", { "data-k": b.key, "data-l": String(i + 1), title: "กดเพื่อดูโค้ดของ " + b.label + " · กดที่: " + b.where, onclick: function () { var el = document.querySelector("[id^=\"hb-\"][data-k=\"" + b.key + "\"]"); if (el) hclJump(el.id.slice(3)); }, style: "overflow-wrap:anywhere;cursor:pointer;border:1px solid " + hexA(g[1], 0.3) + ";border-left:5px solid " + g[1] + ";border-radius:10px;padding:9px 12px;margin-bottom:8px;background:" + hexA(g[1], 0.09) + ";transition:box-shadow .15s" }, [h("div", { style: "font-weight:700;color:color-mix(in srgb, " + g[1] + " 72%, var(--fg))", text: b.label + " × " + b.names.length }), shown ? h("div", { style: "font-size:.78rem;margin:2px 0 4px;word-break:break-word", text: shown }) : null, b.needs ? h("div", { style: "font-size:.75rem;line-height:1.5" }, [h("span", { style: "color:var(--muted);font-weight:600", text: "ต้องมีก่อน  " }), b.needs]) : null, h("div", { style: "font-size:.75rem;line-height:1.5" }, [h("span", { style: "color:var(--muted);font-weight:600", text: "กดที่  " }), b.where]), h("div", { cls: "hst", style: "font-size:.78rem;font-weight:600;min-height:1em" })]);
    }))));
  });
  wrap.appendChild(row);
  return wrap;
}
// โค้ด HCL แบบแยกสีตามกลุ่ม: แถบ+พื้นหลังของบล็อก, comment, และ "ลิงก์" ชื่อ resource ที่อ้างถึง (กดเพื่อกระโดดไปบล็อกนั้น)
var HCL_TYPE = { aws_vpc: "vpc", aws_subnet: "subnet", aws_internet_gateway: "igw", aws_eks_cluster: "eks", aws_cloudwatch_log_group: "lg", aws_ecs_cluster: "ecsc", aws_ecs_task_definition: "ecstd", aws_ecs_service: "ecssvc", aws_s3_bucket: "s3", aws_s3_bucket_public_access_block: "pab", aws_s3_object: "obj", aws_cloudfront_origin_access_control: "oac", aws_route53_zone: "zone", aws_acm_certificate: "cert", aws_acm_certificate_validation: "certval", aws_cloudfront_distribution: "cfd", aws_s3_bucket_policy: "s3pol", aws_route53_record: "r53", aws_eks_node_group: "ng", aws_db_subnet_group: "dbsg", aws_db_instance: "rds", aws_autoscaling_attachment: "asgatt", aws_eip: "eip", aws_nat_gateway: "nat", aws_route_table: "rtb", aws_route_table_association: "rtba", aws_security_group: "sg", aws_key_pair: "key", aws_iam_role: "role", aws_iam_role_policy_attachment: "attach", aws_iam_instance_profile: "profile", aws_ecr_repository: "ecr", aws_instance: "instance", aws_lb_target_group: "tg", aws_lb_target_group_attachment: "tgatt", aws_lb: "alb", aws_lb_listener: "listener" };
function hexA(hex, a) { var n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
function hclJump(id) { var el = document.getElementById("hb-" + id); if (!el) return; var dd = el.closest("details"); if (dd && !dd.open) { dd.open = true; FOLD.code = 1; } el.scrollIntoView({ behavior: "smooth", block: "center" }); el.style.outline = "3px solid #ff9900"; setTimeout(function () { el.style.outline = ""; }, 1400); }
function hclView() {
  var T = JKX_THEME[JKX.theme] || JKX_THEME.github, full = JKX.view === "full", blocks = hcl().split(/\n\n(?=# )/), box = h("div", { style: "font-family:var(--mono);font-size:.8rem;line-height:1.6" }), ln0 = 0;
  var LBL = { "คืออะไร": "คืออะไร", "กดที่": "กดที่ console", "ต้องมีก่อน": "ต้องมีก่อน" };
  blocks.forEach(function (b) {
    var m = /resource "(aws_[a-z_]+)" "([^"]+)"/.exec(b), key = m && HCL_TYPE[m[1]], g = key ? HCL_GRP[key] : null, col = g ? g[1] : "#879596", lines = b.split("\n"), head = [];
    // มุมมองแบ่งช่วง: ดึงคอมเมนต์ต้นบล็อก (ชื่อขั้น / คืออะไร / กดที่ / ต้องมีก่อน) ไปไว้ในหัวการ์ด เหลือแต่โค้ดจริงด้านล่าง
    var start = 0; if (!full) { while (start < lines.length && /^#/.test(lines[start])) start++; head = lines.slice(0, start); } 
    var el = h("div", { id: m ? "hb-" + m[1] + "." + m[2] : null, "data-k": key || "", style: "border-left:5px solid " + col + ";background:" + hexA(col, 0.09) + ";border-radius:6px;margin:0 0 10px;white-space:pre-wrap;overflow-x:auto" });
    if (head.length) {
      var title = head.filter(function (l) { return /^# ──/.test(l); })[0], info = head.filter(function (l) { return !/^# ──/.test(l); });
      el.appendChild(h("div", { style: "padding:7px 12px;border-bottom:1px solid " + hexA(col, 0.25) + ";font-family:var(--ui,system-ui);font-size:.88rem;line-height:1.55;white-space:normal" }, [h("b", { style: "color:" + col, text: title ? title.replace(/^# ── ?/, "") : "" })].concat(info.map(function (l) {
        var mm = /^#\s*([^:]+):\s*(.*)$/.exec(l); return mm ? h("div", {}, [h("span", { style: "color:var(--muted)", text: (LBL[mm[1]] || mm[1]) + ": " }), mm[2]]) : h("div", { style: "color:var(--muted)", text: l.replace(/^#\s*/, "") });
      }))));
    }
    var code = h("div", { style: "padding:8px 0;background:" + T[1] + ";color:" + T[2] + ";border-radius:0 6px 6px 0" });
    var RC = { "✅": "#1d8102", "⚠": "#b36b00", "❌": "#c62828" }, cur = null;
    lines.slice(start).forEach(function (ln) {
      var row = h("div"), rm0 = /^\s+# (✅|⚠️|❌) /.exec(ln);
      if (rm0) { cur = RC[rm0[1].charAt(0)] || RC[rm0[1]]; row.appendChild(h("b", { style: "color:" + cur + ";background:" + hexA(cur, 0.14) + ";padding:0 4px;border-radius:3px", text: ln })); }
      else if (cur && /cidr_blocks|security_groups|self = true/.test(ln)) { var lc = /"0\.0\.0\.0\/0"/.test(ln) && cur === RC["✅"] ? "#b36b00" : cur; row.appendChild(h("span", { style: "background:" + hexA(lc, 0.16) + ";border-left:3px solid " + lc + ";padding:0 4px;display:inline-block" + (lc === "#b36b00" ? ";font-weight:700" : ""), title: lc === "#b36b00" ? "เปิดทั้งโลก (0.0.0.0/0) แต่ตั้งใจ เพราะเป็น port เว็บสาธารณะ" : "", text: ln })); }
      else if (/^# ──/.test(ln)) row.appendChild(h("b", { style: "color:" + col, text: ln }));
      else if (/^\s*#/.test(ln)) row.appendChild(h("span", { style: "color:" + T[3] + ";font-style:italic", text: ln }));
      else {
        var parts = ln.split(/(aws_[a-z_]+\.[a-z0-9_]+)/);
        parts.forEach(function (t) {
          var rr = /^(aws_[a-z_]+)\.([a-z0-9_]+)$/.exec(t), tk = rr && HCL_TYPE[rr[1]];
          if (tk) row.appendChild(h("a", { href: "#", title: "กระโดดไปที่ " + t + " → " + HCL_GRP[tk][0], style: "color:" + HCL_GRP[tk][1] + ";font-weight:700;text-decoration:underline dotted", text: t, onclick: function (e) { e.preventDefault(); hclJump(t); } }));
          else jkxHi(t, "hcl", T).forEach(function (n) { row.appendChild(n); });
        });
      }
      row.style.flex = "1"; ln0++;
      code.appendChild(h("div", { style: "display:flex" }, [h("span", { style: "flex:none;width:2.8em;text-align:right;padding-right:10px;user-select:none;color:" + T[10], text: String(ln0 + (full ? 0 : 0)) }), row]));
    });
    ln0 += full ? 1 : 0;
    if (code.childNodes.length) el.appendChild(code); box.appendChild(el);
  });
  return box;
}
function field(f, V, F) {
  var err = F.errors[f.id], box = h("div", { cls: "f" + (err ? " bad" : ""), style: f.wide ? "max-width:none" : null });
  if (f.type === "custom") { box.appendChild(f.render(V, function () { render(); })); return box; }
  if (f.label) box.appendChild(h("label", { cls: "l", "for": "f-" + f.id }, [f.label + (f.req ? " *" : ""), f.info ? h("a", { href: "#", cls: "infolink", text: "Info", onclick: function (e) { e.preventDefault(); } }) : null]));
  if (f.desc) box.appendChild(h("div", { cls: "hint", style: "margin:-2px 0 6px", text: f.desc }));
  var opts = f.opts ? f.opts(V) : [];
  var exs = (f.type === "text" || f.type === "area") && !f.noex ? (f.ex ? f.ex.map(function (x) { return [x, x]; }) : exFor(f.id)) : null;
  if (f.type === "rcards") box.appendChild(h("div", { cls: "rcards", style: f.stack ? "flex-direction:column;gap:8px" : "" }, opts.map(function (o) { return h("div", { cls: "rcard" + (V[f.id] === o[0] ? " on" : ""), onclick: function () { V[f.id] = o[0]; if (f.onchange) f.onchange(V); render(); } }, [h("span", { style: "flex:none;width:14px;height:14px;border-radius:50%;border:2px solid " + (V[f.id] === o[0] ? "#0972d3;background:radial-gradient(#0972d3 45%,#fff 50%)" : "#879596"), text: "" }), h("div", {}, [h("div", { text: o[1] }), o[2] ? h("div", { cls: "sub", style: "font-size:.8rem", text: o[2] }) : null])]); })));
  else if (f.type === "seg") box.appendChild(h("div", { cls: "seg" }, opts.map(function (o) { return h("button", { type: "button", cls: String(V[f.id]) === String(o[0]) ? "on" : "", text: o[1], onclick: function () { V[f.id] = o[0]; if (f.onchange) f.onchange(V); render(); } }); })));
  else if (exs) box.appendChild(exPick(exs, function () { return V[f.id]; }, function (v) { V[f.id] = v; }, V, "_c_" + f.id, f.ph, f.label || f.id, f.type === "area"));
  else if (f.type === "text") box.appendChild(h("input", { type: "text", id: "f-" + f.id, value: V[f.id] == null ? "" : V[f.id], placeholder: f.ph || "", oninput: function (e) { V[f.id] = e.target.value; } }));
  else if (f.type === "area") box.appendChild(h("textarea", { id: "f-" + f.id, value: V[f.id] || "", placeholder: f.ph || "", oninput: function (e) { V[f.id] = e.target.value; } }));
  else if (f.type === "select") box.appendChild(h("select", { id: "f-" + f.id, onchange: function (e) { V[f.id] = e.target.value; if (f.onchange) f.onchange(V); render(); } }, opts.map(function (o) { return h("option", { value: o[0], text: o[1], selected: String(o[0]) === String(V[f.id]) ? "selected" : null }); })));
  else if (f.type === "radio") opts.forEach(function (o) { box.appendChild(h("label", { cls: "opt" }, [h("input", { type: "radio", name: "f-" + f.id, checked: V[f.id] === o[0], disabled: !!o[2], onchange: function () { V[f.id] = o[0]; if (f.onchange) f.onchange(V); render(); } }), h("span", {}, [o[1], o[2] ? h("small", { text: "  (" + o[2] + ")" }) : null])])); });
  else if (f.type === "check") box.appendChild(h("label", { cls: "opt" }, [h("input", { type: "checkbox", checked: !!V[f.id], onchange: function (e) { V[f.id] = e.target.checked; render(); } }), h("span", { text: f.text })]));
  else if (f.type === "multi") opts.forEach(function (o) { var arr = V[f.id] || (V[f.id] = []); box.appendChild(h("label", { cls: "opt" }, [h("input", { type: "checkbox", checked: arr.indexOf(o[0]) >= 0, onchange: function (e) { var i = arr.indexOf(o[0]); if (e.target.checked && i < 0) arr.push(o[0]); if (!e.target.checked && i >= 0) arr.splice(i, 1); render(); } }), h("span", { text: o[1] })])); });
  if (f.hint) box.appendChild(h("div", { cls: "hint", text: f.hint }));
  if (err) box.appendChild(h("div", { cls: "err", text: err }));
  return box;
}
function rowsEditor(label, arr, cols, blank, addText) {
  var box = h("div"); if (label) box.appendChild(h("div", { cls: "hint", text: label }));
  arr.forEach(function (r, i) {
    var cells = cols.map(function (c) { return c(r, arr); }).filter(Boolean);
    cells.push(h("button", { cls: "btn", type: "button", text: "Remove", onclick: function () { arr.splice(i, 1); render(); } }));
    box.appendChild(h("div", { cls: "row r" + cells.length }, cells));
  });
  box.appendChild(h("button", { cls: "btn", type: "button", text: addText, onclick: function () { arr.push(blank()); render(); } }));
  return box;
}
function inp(r, k, ph, rerender, exList) {
  var exs = exList ? exList.map(function (x) { return [x, x]; }) : exFor(k); if (exs) return exPick(exs, function () { return r[k]; }, function (v) { r[k] = v; }, r, "_c_" + k, ph, ph || k, false);
  return h("input", { type: "text", value: r[k] == null ? "" : r[k], placeholder: ph || "", "aria-label": ph || k, oninput: function (e) { r[k] = e.target.value; } }); }
function sel(r, k, opts, label) { return h("select", { "aria-label": label || k, onchange: function (e) { r[k] = e.target.value; render(); } }, opts.map(function (o) { return h("option", { value: o[0], text: o[1], selected: String(o[0]) === String(r[k]) ? "selected" : null }); })); }
function sgOpts(vpcId, blank) { var a = S.sgs.filter(function (g) { return !vpcId || g.vpcId === vpcId; }).map(function (g) { return [g.id, g.name + " (" + g.id.slice(0, 11) + ")"]; }); return blank ? [["", "เลือก security group"]].concat(a) : a; }
// ---- ตารางแก้กฎ SG (Edit inbound/outbound rules) หัวคอลัมน์ตามคอนโซลจริง
function ruleRowsFrom(sg, dir) { var list = dir === "out" ? sg.outbound : sg.inbound; return list.map(function (r, i) { var t = ruleType(r); return { rid: sgrId(sg, i, dir === "out" ? "out" : "in"), type: t, port: r.from === r.to ? String(r.from) : r.from + "-" + r.to, srcKind: r.srcKind === "sg" ? "Security group" : (r.src === "0.0.0.0/0" ? "Anywhere-IPv4" : "Custom"), src: r.src, desc: r.desc || "" }; }); }
function rulePort(x) { if (x.type === "Custom TCP") return x.port || ""; if (x.type === "All traffic") return "0-65535"; var t = typeRule(x.type); return String(t.from); }
function ruleSig(x) { return x.type + "|" + rulePort(x) + "|" + (x.srcKind === "Anywhere-IPv4" ? "0.0.0.0/0" : x.srcKind === "My IP" ? S.myIp + "/32" : x.src) + "|" + (x.desc || ""); }
function ruleTable(V, dir, vpcId, saved) {
  var T = ["SSH", "HTTP", "HTTPS", "MYSQL/Aurora", "PostgreSQL", "Custom TCP", "All traffic"].map(function (x) { return [x, x]; }), SK = ["Custom", "Anywhere-IPv4", "My IP", "Security group"].map(function (x) { return [x, x]; }), rows = V.rows, wrap = h("div");
  var open = rows.some(function (x) { return x.srcKind === "Anywhere-IPv4" || (x.srcKind === "Custom" && /^0\.0\.0\.0\/0$/.test((x.src || "").trim())); });
  var head = ["Security group rule ID", "Type", "Protocol", "Port range", dir === "out" ? "Destination" : "Source", "Description - optional", ""], tb = h("table", { cls: "rt" }, [h("thead", {}, [h("tr", {}, head.map(function (x) { return h("th", { text: x }); }))])]), body = h("tbody");
  rows.forEach(function (r, i) {
    var port = r.type === "Custom TCP" ? inp(r, "port", "8080 หรือ 30080-30081") : h("span", { text: r.type === "All traffic" ? "All" : String(typeRule(r.type).from) }), proto = r.type === "All traffic" ? "All" : "TCP";
    var srcCell = h("div", { style: "display:flex;flex-direction:column;gap:6px;min-width:230px" }, [sel(r, "srcKind", SK, "Source"), r.srcKind === "Custom" ? inp(r, "src", "Search / CIDR เช่น 203.0.113.0/24") : (r.srcKind === "Security group" ? sel(r, "src", sgOpts(vpcId, true), "Security group") : null), (r.srcKind === "Anywhere-IPv4" || r.srcKind === "My IP" || (r.srcKind === "Custom" && (r.src || "").trim())) ? h("span", { style: "display:inline-flex;align-items:center;gap:6px;border:1px solid var(--cs-ctl-bd,#7d8998);border-radius:8px;padding:0 8px;background:var(--cs-sel-bg,#f2f8fd);width:max-content;font-size:.82rem" }, [r.srcKind === "Anywhere-IPv4" ? "0.0.0.0/0" : r.srcKind === "My IP" ? S.myIp + "/32" : r.src.trim()]) : null]);
    body.appendChild(h("tr", { style: "cursor:default;vertical-align:top" }, [h("td", { text: r.rid || "-" }), h("td", {}, [sel(r, "type", T, "Type")]), h("td", { text: proto }), h("td", {}, [port]), h("td", {}, [srcCell]), h("td", { style: "min-width:200px" }, [inp(r, "desc", "Description", false, ["SSH จาก My IP", "เว็บสาธารณะ", "Jenkins UI", "SonarQube UI", "ArgoCD UI", "ALB ไป k8s NodePort", "MariaDB จาก k8s", "cafe web"])]), h("td", {}, [h("button", { cls: "btn", type: "button", text: "Delete", onclick: function () { rows.splice(i, 1); render(); } })])]));
  });
  tb.appendChild(body); wrap.appendChild(h("div", { cls: "twrap" }, [tb]));
  wrap.appendChild(h("button", { cls: "btn", type: "button", style: "margin-top:10px", text: "Add rule", onclick: function () { rows.push({ rid: "", type: "SSH", srcKind: "My IP", port: "", src: "", desc: "" }); render(); } }));
  if (open && dir !== "out") wrap.appendChild(h("div", { cls: "alert warn", style: "margin-top:10px", text: "⚠ Rules with source of 0.0.0.0/0 or ::/0 allow all IP addresses to access your instance. We recommend setting security group rules to allow access from known IP addresses only." }));
  if (V.preview) {
    var before = {}, after = {}; saved.forEach(function (x) { before[ruleSig(x)] = x; }); rows.forEach(function (x) { after[ruleSig(x)] = x; });
    var add = Object.keys(after).filter(function (k) { return !before[k]; }), del = Object.keys(before).filter(function (k) { return !after[k]; });
    wrap.appendChild(h("div", { cls: "card", style: "margin-top:12px" }, [h("div", { cls: "ch", text: "Preview changes" }), h("div", { cls: "cb" }, [!add.length && !del.length ? h("p", { cls: "hint", text: "No changes" }) : h("div", {}, [h("b", { text: "Rules to add (" + add.length + ")" }), h("ul", {}, add.map(function (k) { return h("li", { text: k.split("|").slice(0, 3).join(" · ") }); })), h("b", { text: "Rules to delete (" + del.length + ")" }), h("ul", {}, del.map(function (k) { return h("li", { text: k.split("|").slice(0, 3).join(" · ") }); }))])])]));
  }
  return wrap;
}
// ---- pages
// ---- ตัวช่วยแสดงผลให้เหมือนคอนโซลจริง
var OWNER = "000000000000";
function t0() { if (!S.t0) S.t0 = Date.now(); return S.t0; }
function fmtT(ts) { var d = new Date(ts), o = -d.getTimezoneOffset(); return d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" }) + ", " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + " (UTC" + (o >= 0 ? "+" : "-") + ("0" + Math.floor(Math.abs(o) / 60)).slice(-2) + ":" + ("0" + Math.abs(o) % 60).slice(-2) + ")"; }
function okIco(t, kind) { var c = kind === "warn" ? "#5f6b7a" : "#1d8102"; return h("span", { style: "color:" + c + ";white-space:nowrap;display:inline-flex;gap:6px;align-items:center" }, [icoEl(kind === "warn" ? "clock" : "check", 15), t]); }
function vcol(id) { var v = find(S.vpcs, id); return v ? v.id + (v.name ? " | " + v.name : "") : "-"; }
function azId(az) { return { a: "apse1-az2", b: "apse1-az1", c: "apse1-az3" }[az.slice(-1)] || az; }
function eniOf(id) { return "eni-0" + hash32(id + "eni") + hash32("e" + id).slice(0, 8); }
function subFree(sn) { var m = /\/(\d+)$/.exec(sn.cidr || ""), n = m ? Math.pow(2, 32 - +m[1]) - 5 : 0; return Math.max(0, n - S.insts.filter(function (i) { return i.subnetId === sn.id && i.state !== "terminated"; }).length); }
LISTS.vpcs = function () {
  return ({ key: "vpcs", kind: "vpc", title: "Your VPCs", crumb: "VPC › Your VPCs", create: [{ label: "Create VPC", page: "vpc-create" }], actions: [{ label: "Edit VPC settings", page: "vpc-dns" }, { label: "Delete VPC", page: "del", kind: "vpc" }],
    rows: function () { return S.vpcs; }, cols: [["Name", function (r) { return r.name || "-"; }], ["VPC ID", function (r) { return r.id; }], ["IPv4 CIDR", function (r) { return r.cidr; }], ["Default VPC", function (r) { return r.isDefault ? "Yes" : "No"; }], ["DNS hostnames", function (r) { return r.dnsHostnames ? "Enabled" : "Disabled"; }]],
    detail: function (r) { var g = vpcIgw(r.id), m = rtbMain(r.id); return [["VPC ID", r.id], ["DNS hostnames", r.dnsHostnames ? "Enabled" : "Disabled"], ["DNS resolution", r.dnsResolution ? "Enabled" : "Disabled"], ["Main route table", m ? m.id : "-"], ["Internet gateway", g ? (g.name || g.id) : "ไม่มี"], ["Subnets", String(S.subnets.filter(function (s) { return s.vpcId === r.id; }).length)], ["Default security group", (defaultSg(r.id) || {}).id || "-"]]; } });
};
function vpcPreview(V) {
  var p = (V.name || "project").trim() || "project", more = V.mode === "VPC and more", nAz = +V.azs || 2, pub = +V.pub || 0, priv = +V.priv || 0, azs = AZS.slice(0, nAz);
  function box(t, s, kids) { return h("div", { style: "background:var(--surface);border-radius:8px;padding:12px;min-width:170px;flex:1" }, [h("b", { text: t }), s ? h("div", { cls: "sub", text: s }) : null].concat(kids)); }
  function chip(n, c) { return h("div", { style: "background:var(--code-bg);border-radius:4px;padding:6px 8px;margin:6px 0;font-size:.78rem;word-break:break-all;" + (c ? "border-left:4px solid " + c : "") , text: n }); }
  var cols = [box("VPC", "Your AWS virtual network", [h("a", { href: "#", cls: "infolink", text: "Show details", onclick: function (e) { e.preventDefault(); } }), chip(p + "-vpc")])];
  if (more) {
    var sn = azs.map(function (z, i) { var rows = []; if (i < pub) rows.push(chip(p + "-subnet-public" + (i + 1) + "-" + z, "#1d8102")); if (i < priv) rows.push(chip(p + "-subnet-private" + (i + 1) + "-" + z, "#0972d3")); return rows.length ? h("div", {}, [h("b", { style: "font-size:.82rem", text: z })].concat(rows)) : null; }).filter(Boolean);
    var rt = []; if (pub) rt.push(chip(p + "-rtb-public")); azs.forEach(function (z, i) { if (i < priv) rt.push(chip(p + "-rtb-private" + (i + 1) + "-" + z)); });
    var nets = []; if (pub) nets.push(chip(p + "-igw")); if (V.nat === "1az" && pub) nets.push(chip(p + "-nat-public1-" + azs[0])); if (V.nat === "perAz") azs.slice(0, pub).forEach(function (z, i) { nets.push(chip(p + "-nat-public" + (i + 1) + "-" + z)); }); if (V.s3 === true || V.s3 === "true") nets.push(chip(p + "-vpce-s3"));
    cols.push(box("Subnets (" + (Math.min(pub, nAz) + Math.min(priv, nAz)) + ")", "Subnets within this VPC", sn), box("Route tables (" + rt.length + ")", "Route network traffic to resources", rt), box("Network connections (" + nets.length + ")", "Connections to other networks", nets));
  }
  return h("div", { style: "background:var(--bg);border-radius:8px;padding:10px;display:flex;gap:10px;overflow-x:auto" }, cols);
}
PAGES["vpc-create"] = function () {
  return formPage({ name: "vpc-create", crumb: "VPC › Your VPCs › Create VPC", title: "Create VPC", back: "vpcs",
    init: function () { return { mode: "VPC only", name: "", cidr: "", ipv6: "No IPv6 CIDR block", tenancy: "Default", azs: 2, pub: 2, priv: 2, nat: "none", s3: false, dnsHost: true, dnsRes: true }; },
    preview: function (V) { return vpcPreview(V); },
    sections: function (V) { var more = function (V) { return V.mode === "VPC and more"; }; return [{ t: "VPC settings", f: [
      { id: "mode", type: "rcards", label: "Resources to create", info: 1, desc: "Create only the VPC resource or the VPC and other networking resources.", opts: function () { return [["VPC only", "VPC only"], ["VPC and more", "VPC and more"]]; } },
      { id: "name", type: "text", label: V.mode === "VPC only" ? "Name tag - optional" : "Name tag auto-generation", info: 1, desc: V.mode === "VPC only" ? "Creates a tag with a key of 'Name' and a value that you specify." : "Enter a value for the Name tag. This value will be used to auto-generate Name tags for all resources in the VPC.", ph: "pharmacy" },
      { id: "cidr", type: "text", label: "IPv4 CIDR block", info: 1, desc: "Determine the starting IP and the size of your VPC using CIDR notation.", ph: "10.0.0.0/16", req: true, hint: "CIDR block size must be between /16 and /28." },
      { id: "ipv6", type: "radio", label: "IPv6 CIDR block", info: 1, opts: function () { return [["No IPv6 CIDR block", "No IPv6 CIDR block"], ["Amazon-provided IPv6 CIDR block", "Amazon-provided IPv6 CIDR block", "ไม่จำลอง"]]; } },
      { id: "tenancy", type: "select", label: "Tenancy", info: 1, opts: function () { return [["Default", "Default"], ["Dedicated", "Dedicated"]]; } },
      { id: "azs", type: "select", label: "Number of Availability Zones (AZs)", info: 1, desc: "Choose the number of AZs in which to provision subnets. We recommend at least two AZs for high availability.", show: more, opts: function () { return [[1, "1"], [2, "2"], [3, "3"]]; } },
      { id: "pub", type: "select", label: "Number of public subnets", info: 1, desc: "The number of public subnets to add to your VPC. Use public subnets for web applications that need to be publicly accessible over the internet.", show: more, opts: function () { return [[0, "0"], [1, "1"], [2, "2"], [3, "3"]]; } },
      { id: "priv", type: "select", label: "Number of private subnets", info: 1, desc: "The number of private subnets to add to your VPC. Use private subnets to secure backend resources that don't need public access.", show: more, opts: function () { return [[0, "0"], [1, "1"], [2, "2"], [3, "3"]]; } },
      { id: "nat", type: "seg", label: "NAT gateways ($)", info: 1, desc: "Choose the number of Availability Zones (AZs) in which to create NAT gateways. Note that there is a charge for each NAT gateway. (หน้าจริงปี 2025 มีตัวเลือก Regional - new เพิ่ม ยังไม่จำลอง)", show: more, opts: function () { return [["none", "None"], ["1az", "In 1 AZ"], ["perAz", "1 per AZ"]]; } },
      { id: "s3", type: "seg", label: "VPC endpoints", info: 1, desc: "Endpoints can help reduce NAT gateway charges and improve security by accessing S3 directly from the VPC. By default, full access policy is used. You can customize this policy at any time.", show: more, opts: function () { return [[false, "None"], [true, "S3 Gateway"]]; } },
      { id: "dnsHost", type: "check", label: "DNS options", info: 1, text: "Enable DNS hostnames", show: more },
      { id: "dnsRes", type: "check", text: "Enable DNS resolution", show: more }] }]; },
    submit: "Create VPC",
    onSubmit: function (V) { var r = V.mode === "VPC only" ? API.createVpc({ name: V.name, cidr: V.cidr, dns: false }) : API.createVpcAndMore({ name: V.name, cidr: V.cidr, azs: V.azs, pub: V.pub, priv: V.priv, nat: V.nat, s3: V.s3 === true || V.s3 === "true", dnsHost: V.dnsHost, dnsRes: V.dnsRes }); if (r.errors) return r; UI.sel.vpcs = r.res.id; return { msg: "สร้าง VPC " + (r.res.name || r.res.id) + " แล้ว" }; } });
};
PAGES["vpc-dns"] = function () {
  var v = find(S.vpcs, UI.params.id);
  return formPage({ name: "vpc-dns", crumb: "VPC › Your VPCs › Edit VPC settings", title: "Edit VPC settings", back: "vpcs",
    init: function () { return { host: v.dnsHostnames, res: v.dnsResolution }; },
    sections: function () { return [{ t: "DNS settings", f: [{ id: "host", type: "check", label: "DNS hostnames", text: "Enable" }, { id: "res", type: "check", label: "DNS resolution", text: "Enable" }] }]; },
    submit: "Save changes", onSubmit: function (V) { var r = API.setDns(v.id, V.host, V.res); return r.errors ? r : { msg: "บันทึกแล้ว" }; } });
};
LISTS.subnets = function () {
  return ({ key: "subnets", kind: "subnet", title: "Subnets", crumb: "VPC › Subnets", create: [{ label: "Create subnet", page: "subnet-create" }], actions: [{ label: "Edit subnet settings", page: "subnet-edit" }, { label: "Delete subnet", page: "del", kind: "subnet" }],
    rows: function () { return S.subnets; }, cols: [["Name", function (r) { return r.name || "-"; }], ["Subnet ID", function (r) { return r.id; }], ["State", function () { return okIco("Available"); }], ["VPC", function (r) { return vcol(r.vpcId); }], ["IPv4 CIDR", function (r) { return r.cidr; }], ["IPv6 CIDR", function () { return "-"; }], ["Available IPv4 addresses", function (r) { return String(subFree(r)); }], ["Availability Zone", function (r) { return r.az; }], ["Availability Zone ID", function (r) { return azId(r.az); }]],
    detail: function (r) { var rt = subnetRtb(r); return [["Subnet ID", r.id], ["Subnet ARN", "arn:aws:ec2:" + REGION + ":" + OWNER + ":subnet/" + r.id], ["State", okIco("Available")], ["IPv4 CIDR", r.cidr], ["IPv6 CIDR", "-"], ["Available IPv4 addresses", String(subFree(r))], ["Availability Zone", r.az], ["Availability Zone ID", azId(r.az)], ["Network border group", REGION], ["VPC", vcol(r.vpcId)], ["Route table", rt ? rt.id + (rt.name ? " | " + rt.name : "") : "-"], ["Default subnet", "No"], ["Auto-assign public IPv4 address", r.autoIp ? "Yes" : "No"], ["Auto-assign IPv6 address", "No"], ["Owner", OWNER], ["เส้นทางออกอินเทอร์เน็ต (lab)", hasIgwRoute(rt) ? tagp("Public subnet (มีเส้นทางตรงไป internet gateway)", "ok") : tagp("Private subnet (ไม่มีเส้นทางตรง)", "warn")]]; } });
};
PAGES["subnet-create"] = function () {
  return formPage({ name: "subnet-create", crumb: "VPC › Subnets › Create subnet", title: "Create subnet", back: "subnets",
    init: function () { var d = S.vpcs.filter(function (v) { return !v.isDefault; })[0]; return { vpcId: d ? d.id : "", list: [{ name: "", az: "", cidr: "" }] }; },
    sections: function (V) { return [{ t: "VPC", f: [{ id: "vpcId", type: "select", label: "VPC ID", req: true, opts: function () { return [["", "Select a VPC"]].concat(S.vpcs.map(function (v) { return [v.id, vname(v.id) + " · " + v.cidr]; })); } }] },
      { t: "Subnet settings", f: [{ type: "custom", id: "list", render: function (V) {
        var box = h("div"); V.list.forEach(function (s, i) {
          var e = UI.form.errors["cidr" + i];
          box.appendChild(h("div", { cls: "card" }, [h("div", { cls: "ch", text: "Subnet " + (i + 1) + " of " + V.list.length }), h("div", { cls: "cb" }, [
            h("div", { cls: "f" }, [h("label", { cls: "l", text: "Subnet name" }), inp(s, "name", "pharmacy-public-" + (i + 1))]),
            h("div", { cls: "f" }, [h("label", { cls: "l", text: "Availability Zone" }), sel(s, "az", [["", "No preference"]].concat(AZS.map(function (a) { return [a, a]; })), "Availability Zone")]),
            h("div", { cls: "f" + (e ? " bad" : "") }, [h("label", { cls: "l", text: "IPv4 subnet CIDR block (Manual input)" }), inp(s, "cidr", "10.0." + (i + 1) + ".0/24", false, ["10.0.1.0/24", "10.0.2.0/24", "10.0.128.0/20", "10.0.129.0/24", "10.1.1.0/24", "10.1.2.0/24", "10.1.128.0/20", "10.1.129.0/24"]), e ? h("div", { cls: "err", text: e }) : null]),
            V.list.length > 1 ? h("button", { cls: "btn", type: "button", text: "Remove", onclick: function () { V.list.splice(i, 1); render(); } }) : null])]));
        });
        box.appendChild(h("button", { cls: "btn", type: "button", text: "Add new subnet", onclick: function () { V.list.push({ name: "", az: "", cidr: "" }); render(); } }));
        return box; } }] }]; },
    submit: "Create subnet", onSubmit: function (V) { var r = API.createSubnet({ vpcId: V.vpcId, list: V.list }); if (r.errors) return r; return { msg: "สร้าง " + r.res.length + " subnet แล้ว ค่า auto-assign public IPv4 เริ่มเป็น Disabled (ต้องไปติ๊กเองใน Edit subnet settings)" }; } });
};
PAGES["subnet-edit"] = function () {
  var s = find(S.subnets, UI.params.id);
  return formPage({ name: "subnet-edit", crumb: "VPC › Subnets › Edit subnet settings", title: "Edit subnet settings", back: "subnets",
    init: function () { return { on: s.autoIp }; },
    sections: function () { return [{ t: "Auto-assign IP settings", f: [{ id: "on", type: "check", text: "Enable auto-assign public IPv4 address" }] }]; },
    submit: "Save", onSubmit: function (V) { var r = API.setAutoIp(s.id, V.on); return r.errors ? r : { msg: "บันทึกแล้ว" }; } });
};
LISTS.igws = function () {
  return ({ key: "igws", kind: "igw", title: "Internet gateways", crumb: "VPC › Internet gateways", create: [{ label: "Create internet gateway", page: "igw-create" }], actions: [{ label: "Attach to VPC", page: "igw-attach", when: function (r) { return !r.vpcId; } }, { label: "Detach from VPC", page: "del", kind: "igw-detach", when: function (r) { return !!r.vpcId; } }, { label: "Delete internet gateway", page: "del", kind: "igw" }],
    detail: function (r) { return [["Internet gateway ID", r.id], ["State", r.vpcId ? okIco("Attached") : tagp("Detached", "warn")], ["VPC ID", r.vpcId ? vcol(r.vpcId) : "-"], ["Owner", OWNER]]; }, rows: function () { return S.igws; }, cols: [["Name", function (r) { return r.name || "-"; }], ["Internet gateway ID", function (r) { return r.id; }], ["State", function (r) { return r.vpcId ? okIco("Attached") : tagp("Detached", "warn"); }], ["VPC ID", function (r) { return r.vpcId ? vcol(r.vpcId) : "-"; }], ["Owner", function () { return OWNER; }]] });
};
function natEip(r) { return find(S.eips, r.eipId); }
function natPriv(r) { var sn = find(S.subnets, r.subnetId), m = /^(\d+\.\d+\.\d+)\./.exec(sn ? sn.cidr : ""); return m ? m[1] + "." + (10 + (parseInt(hash32(r.id).slice(0, 2), 16) % 200)) : "-"; }
function natState(r) { var p = natPhase(r); return p === "available" ? okIco("Available") : okIco(p === "pending" ? "Pending" : p, "warn"); }
LISTS.nats = function () {
  return ({ key: "nats", kind: "nat", title: "NAT gateways", crumb: "VPC › NAT gateways", create: [], actions: [{ label: "Delete NAT gateway", page: "del", kind: "nat" }],
    detail: function (r) { var e = natEip(r), sn = find(S.subnets, r.subnetId); return [["NAT gateway ID", r.id], ["Connectivity type", "Public"], ["State", natState(r)], ["State message", "-"], ["NAT gateway ARN", "arn:aws:ec2:" + REGION + ":" + OWNER + ":natgateway/" + r.id], ["Primary public IPv4 address", e ? e.ip : "-"], ["Primary private IPv4 address", natPriv(r)], ["Primary network interface ID", eniOf(r.id)], ["VPC", vcol(r.vpcId)], ["Subnet", sn ? sn.id + (sn.name ? " | " + sn.name : "") : r.subnetId], ["Created", fmtT(r.born || t0())], ["Deleted", "-"]]; }, rows: function () { return S.nats; },
    cols: [["Name", function (r) { return r.name || "-"; }], ["NAT gateway ID", function (r) { return r.id; }], ["Connectivity type", function () { return "Public"; }], ["State", natState], ["State message", function () { return "-"; }], ["Primary public IPv4 address", function (r) { var e = natEip(r); return e ? e.ip : "-"; }], ["Primary private IPv4 address", natPriv], ["Primary network interface ID", function (r) { return eniOf(r.id); }], ["VPC", function (r) { return vcol(r.vpcId); }], ["Subnet", function (r) { var sn = find(S.subnets, r.subnetId); return sn ? sn.id + (sn.name ? " | " + sn.name : "") : r.subnetId; }]] });
};
PAGES["igw-create"] = function () {
  return formPage({ name: "igw-create", crumb: "VPC › Internet gateways › Create internet gateway", title: "Create internet gateway", back: "igws", init: function () { return { name: "" }; },
    sections: function () { return [{ t: "Internet gateway settings", f: [{ id: "name", type: "text", label: "Name tag", ph: "pharmacy-igw" }] }]; },
    submit: "Create internet gateway", onSubmit: function (V) { var r = API.createIgw(V); UI.sel.igws = r.res.id; return { msg: "สร้างแล้ว สถานะ Detached ต้อง Actions → Attach to VPC ต่อ" }; } });
};
PAGES["igw-attach"] = function () {
  var g = find(S.igws, UI.params.id);
  return formPage({ name: "igw-attach", crumb: "VPC › Internet gateways › Attach to VPC", title: "Attach to VPC (" + nm(g) + ")", back: "igws", init: function () { return { vpcId: "" }; },
    sections: function () { return [{ t: "VPC", f: [{ id: "vpcId", type: "select", label: "Available VPCs", opts: function () { return [["", "Select a VPC"]].concat(S.vpcs.filter(function (v) { return !vpcIgw(v.id); }).map(function (v) { return [v.id, vname(v.id)]; })); } }] }]; },
    submit: "Attach internet gateway", onSubmit: function (V) { var r = API.attachIgw(g.id, V.vpcId); return r.errors ? r : { msg: "Attach แล้ว" }; } });
};
function rtbExp(r) { if (r.main || !r.assoc.length) return "-"; return r.assoc.length === 1 ? r.assoc[0] : r.assoc.length + " subnets"; }
LISTS.rtbs = function () {
  return ({ key: "rtbs", kind: "rtb", title: "Route tables", crumb: "VPC › Route tables", create: [{ label: "Create route table", page: "rtb-create" }], actions: [{ label: "Edit routes", page: "rtb-routes" }, { label: "Edit subnet associations", page: "rtb-assoc", when: function (r) { return !r.main; } }, { label: "Delete route table", page: "del", kind: "rtb" }],
    rows: function () { return S.rtbs; }, cols: [["Name", function (r) { return r.name || "-"; }], ["Route table ID", function (r) { return r.id; }], ["Explicit subnet associations", rtbExp], ["Edge associations", function () { return "-"; }], ["Main", function (r) { return r.main ? "Yes" : "No"; }], ["VPC", function (r) { return vcol(r.vpcId); }], ["Owner ID", function () { return OWNER; }]],
    detail: function (r) { return [["Route table ID", r.id], ["Main", r.main ? "Yes" : "No"], ["Explicit subnet associations", rtbExp(r)], ["Edge associations", "-"], ["VPC", vcol(r.vpcId)], ["Owner ID", OWNER]]; } });
};
PAGES["rtb-create"] = function () {
  return formPage({ name: "rtb-create", crumb: "VPC › Route tables › Create route table", title: "Create route table", back: "rtbs", init: function () { var d = S.vpcs.filter(function (v) { return !v.isDefault; })[0]; return { name: "", vpcId: d ? d.id : "" }; },
    sections: function () { return [{ t: "Route table settings", f: [{ id: "name", type: "text", label: "Name", ph: "pharmacy-public" }, { id: "vpcId", type: "select", label: "VPC", req: true, opts: function () { return [["", "Select a VPC"]].concat(S.vpcs.map(function (v) { return [v.id, vname(v.id)]; })); } }] }]; },
    submit: "Create route table", onSubmit: function (V) { var r = API.createRtb(V); if (r.errors) return r; UI.sel.rtbs = r.res.id; return { msg: "สร้างแล้ว ตอนนี้มีแค่เส้นทาง local ต้อง Edit routes และ Subnet associations ต่อ" }; } });
};
PAGES["rtb-routes"] = function () {
  var r = find(S.rtbs, UI.params.id);
  return formPage({ name: "rtb-routes", crumb: "VPC › Route tables › " + r.id + " › Edit routes", title: "Edit routes", back: "rtbs",
    init: function () { return { rows: r.routes.map(function (x) { return { dest: x.dest, target: x.target }; }) }; },
    sections: function (V) { var tg = [["", "Select target"]].concat(S.igws.filter(function (g) { return g.vpcId === r.vpcId; }).map(function (g) { return [g.id, "Internet Gateway · " + g.id + (g.name ? " (" + g.name + ")" : "")]; })).concat(S.nats.filter(function (n) { return n.vpcId === r.vpcId; }).map(function (n) { return [n.id, "NAT Gateway · " + n.id + (n.name ? " (" + n.name + ")" : "")]; })); return [{ ct: "", f: [{ type: "custom", wide: true, id: "rows", render: function (V) {
      var v = find(S.vpcs, r.vpcId), tb = h("table", {}, [h("thead", {}, [h("tr", {}, ["Destination", "Target", "Status", "Propagated", ""].map(function (x) { return h("th", { text: x }); }))])]), body = h("tbody");
      body.appendChild(h("tr", { style: "cursor:default" }, [h("td", { text: v.cidr }), h("td", { text: "local" }), h("td", {}, [okIco("Active")]), h("td", { text: "No" }), h("td")]));
      V.rows.forEach(function (x, i) { body.appendChild(h("tr", { style: "cursor:default" }, [h("td", {}, [inp(x, "dest", "0.0.0.0/0")]), h("td", {}, [sel(x, "target", tg, "Target")]), h("td", { text: "-" }), h("td", { text: "No" }), h("td", {}, [h("button", { cls: "btn", type: "button", text: "Remove", onclick: function () { V.rows.splice(i, 1); render(); } })])])); });
      tb.appendChild(body); return h("div", {}, [h("div", { cls: "twrap" }, [tb]), h("button", { cls: "btn", type: "button", style: "margin-top:10px", text: "Add route", onclick: function () { V.rows.push({ dest: "", target: "" }); render(); } })]); } }] }]; },
    submit: "Save changes", onSubmit: function (V) { var x = API.setRoutes(r.id, V.rows); return x.errors ? x : { msg: "Updated routes for " + r.id + " successfully" }; } });
};
PAGES["rtb-assoc"] = function () {
  var r = find(S.rtbs, UI.params.id);
  return formPage({ name: "rtb-assoc", crumb: "VPC › Route tables › Subnet associations › Edit subnet associations", title: "Edit subnet associations (" + nm(r) + ")", back: "rtbs",
    init: function () { return { ids: r.assoc.slice() }; },
    sections: function () { return [{ t: "Available subnets", f: [{ id: "ids", type: "multi", opts: function () { return S.subnets.filter(function (s) { return s.vpcId === r.vpcId; }).map(function (s) { return [s.id, nm(s) + " · " + s.cidr + " · " + s.az]; }); }, hint: "ซอยที่ไม่ได้ติ๊กและไม่ได้ผูกกับ route table ใดจะใช้ main route table ของ VPC" }] }]; },
    submit: "Save associations", onSubmit: function (V) { var x = API.setAssoc(r.id, V.ids); return x.errors ? x : { msg: "บันทึกแล้ว" }; } });
};
LISTS.sgs = function () {
  return ({ key: "sgs", kind: "sg", title: "Security Groups", crumb: "EC2 › Security Groups", create: [{ label: "Create security group", page: "sg-create" }], actions: [{ label: "Edit inbound rules", page: "sg-inbound" }, { label: "Delete security groups", page: "del", kind: "sg" }],
    rows: function () { return S.sgs; }, cols: [["Name", function () { return "–"; }], ["Security group ID", function (r) { return r.id; }], ["Security group name", function (r) { return r.name; }], ["VPC ID", function (r) { return vname(r.vpcId); }], ["Description", function (r) { return r.desc; }], ["Owner", function () { return "000000000000"; }], ["Inbound rules count", function (r) { return String(r.inbound.length); }], ["Outbound rules count", function (r) { return String(r.outbound.length || 1); }]],
    detail: function (r) { return [["Security group name", r.name], ["Security group ID", r.id], ["Description", r.desc], ["VPC ID", vname(r.vpcId)], ["Owner", "000000000000"], ["Inbound rules count", r.inbound.length + " Permission entries"], ["Outbound rules count", (r.outbound.length || 1) + " Permission entries"]]; } });
};
PAGES["sg-create"] = function () {
  return formPage({ name: "sg-create", crumb: "EC2 › Security Groups › Create security group", title: "Create security group", back: "sgs", cards: true, lead: "A security group acts as a virtual firewall for your instance to control inbound and outbound traffic. To create a new security group, complete the fields below.",
    init: function () { var d = S.vpcs.filter(function (v) { return !v.isDefault; })[0]; return { name: "", desc: "", vpcId: d ? d.id : defaultVpc().id, rows: [] }; },
    sections: function (V) { return [{ t: "Basic details", ct: "Basic details", f: [{ id: "name", type: "text", label: "Security group name", info: 1, req: true, hint: "Name cannot be edited after creation." }, { id: "desc", type: "text", label: "Description", info: 1, req: true, ph: "Allows SSH access to developers" }, { id: "vpcId", type: "select", label: "VPC", info: 1, opts: function () { return S.vpcs.map(function (v) { return [v.id, vname(v.id)]; }); } }] },
      { t: "Inbound rules", ct: "Inbound rules", f: [{ type: "custom", wide: true, id: "rules", render: function (V) { var box = h("div"); if (!V.rows.length) box.appendChild(h("p", { style: "text-align:center", cls: "sub", text: "This security group has no inbound rules." })); box.appendChild(ruleTable({ rows: V.rows, preview: false }, "in", V.vpcId, [])); var e = UI.form.errors.rules; if (e) box.appendChild(h("div", { cls: "err", text: e })); return box; } }] },
      { t: "Outbound rules", ct: "Outbound rules", f: [{ type: "custom", id: "out", render: function () { return tbl(["Type", "Protocol", "Port range", "Destination", "Description - optional"], [["All traffic", "All", "All", "Custom  0.0.0.0/0", ""]]); } }] }]; },
    submit: "Create security group", onSubmit: function (V) { var r = API.createSg(V); if (r.errors) return r; UI.sel.sgs = r.res.id; return { msg: "Security group (" + r.res.id + " | " + r.res.name + ") was created successfully" }; } });
};
function sgRulesPage(dir) {
  var g = find(S.sgs, UI.params.id), nm2 = dir === "out" ? "outbound" : "inbound", Cap = dir === "out" ? "Outbound" : "Inbound", pg = dir === "out" ? "sg-outbound" : "sg-inbound";
  return formPage({ name: pg, crumb: "EC2 › Security Groups › " + g.id + " - " + g.name + " › Edit " + nm2 + " rules", title: "Edit " + nm2 + " rules", back: "sgs", cards: true, lead: dir === "out" ? "Outbound rules control the outgoing traffic that's allowed to leave the instance." : "Inbound rules control the incoming traffic that's allowed to reach the instance.", init: function () { return { rows: ruleRowsFrom(g, dir), preview: false }; },
    sections: function () { return [{ t: Cap + " rules", ct: Cap + " rules", f: [{ type: "custom", wide: true, id: "rules", render: function (V) { var box = h("div"); box.appendChild(ruleTable(V, dir, g.vpcId, ruleRowsFrom(g, dir))); var e = UI.form.errors.rules; if (e) box.appendChild(h("div", { cls: "err", text: e })); box.appendChild(h("button", { cls: "btn", type: "button", style: "margin-top:10px", text: V.preview ? "Hide preview" : "Preview changes", onclick: function () { V.preview = !V.preview; render(); } })); return box; } }] }]; },
    submit: "Save rules", onSubmit: function (V) { var r = dir === "out" ? API.setOutbound(g.id, V.rows) : API.setInbound(g.id, V.rows); return r.errors ? r : { msg: Cap + " security group rules successfully modified on security group (" + g.id + " | " + g.name + ")" }; } });
}
PAGES["sg-inbound"] = function () { return sgRulesPage("in"); };
PAGES["sg-outbound"] = function () { return sgRulesPage("out"); };
LISTS.keys = function () {
  return ({ key: "keys", kind: "key", title: "Key pairs", crumb: "EC2 › Network & Security › Key Pairs", create: [{ label: "Create key pair", page: "key-create" }], actions: [{ label: "Import key pair", page: "key-import", btn: true }, { label: "Delete key pair", page: "del", kind: "key" }],
    detail: function (r) { return [["Key pair name", r.name], ["Key pair ID", r.id], ["Type", r.type], ["Created", fmtT(r.born || t0())], ["Fingerprint", fpr(r.name)], ["Source", r.imported ? "Imported" : "Created by EC2"]]; }, rows: function () { return S.keys; }, cols: [["Name", function (r) { return r.name; }], ["Type", function (r) { return r.type; }], ["Created", function (r) { return fmtT(r.born || t0()); }], ["Fingerprint", function (r) { return fpr(r.name); }], ["ID", function (r) { return r.id; }]] });
};
PAGES["key-import"] = function () {
  return formPage({ name: "key-import", crumb: "EC2 › Key Pairs › Import key pair", title: "Import key pair", back: "keys", init: function () { return { name: "", pub: "" }; },
    sections: function () { return [{ t: "", f: [{ id: "name", type: "text", label: "Name", req: true, ph: "pharmacy-admin" }, { id: "pub", type: "area", ex: ["ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILabLaptopKeyExample0000000000000000000000000 swd@laptop"], label: "Public key contents", req: true, ph: "ssh-ed25519 AAAA... you@laptop", hint: "วางเนื้อไฟล์ .pub หรือกด Browse เลือกไฟล์ (หน้านี้จำลองเฉพาะช่องวาง)" }] }]; },
    submit: "Import key pair", onSubmit: function (V) { var r = API.importKey(V); return r.errors ? r : { msg: "Import key pair " + V.name + " แล้ว" }; } });
};
PAGES["key-create"] = function () {
  return formPage({ name: "key-create", crumb: "EC2 › Key Pairs › Create key pair", title: "Create key pair", back: "keys", init: function () { return { name: "", type: "ED25519", fmt: "pem" }; },
    sections: function () { return [{ t: "Key pair", f: [{ id: "name", type: "text", label: "Name", req: true, desc: "The name can include up to 255 ASCII characters. It can't include leading or trailing spaces." }, { id: "type", type: "radio", label: "Key pair type", info: true, opts: function () { return [["RSA", "RSA"], ["ED25519", "ED25519"]]; } }, { id: "fmt", type: "radio", label: "Private key file format", opts: function () { return [["pem", ".pem   For use with OpenSSH"], ["ppk", ".ppk   For use with PuTTY"]]; } }] }]; },
    submit: "Create key pair", onSubmit: function (V) { var r = API.createKey(V); return r.errors ? r : { msg: "สร้างแล้ว ไฟล์ " + r.res.file + " ถูกดาวน์โหลดอัตโนมัติ นี่คือโอกาสเดียวที่จะเก็บ private key (จำลอง) และ AWS ยังรู้จักกุญแจนี้แม้คุณทำไฟล์หาย" }; } });
};
LISTS.roles = function () {
  return ({ key: "roles", kind: "role", title: "Roles", desc: "An IAM role is an identity you can create that has specific permissions with credentials that are valid for short durations. Roles can be assumed by entities that you trust.", crumb: "IAM › Roles", create: [{ label: "Create role", page: "role-create" }],
    actions: [{ label: "Add permissions / detach policies", page: "role-perm" }], rows: function () { return S.roles; }, cols: [["Role name", function (r) { return r.name; }], ["Trusted entities", function () { return "AWS Service: ec2"; }], ["Last activity", function () { return "-"; }]],
    detail: function (r) { return [["Creation date", fmtT(r.born || t0())], ["ARN", "arn:aws:iam::" + OWNER + ":role/" + r.name], ["Last activity", "-"], ["Maximum session duration", "1 hour"], ["Instance profile ARN", "arn:aws:iam::" + OWNER + ":instance-profile/" + r.profile], ["Description", r.desc || "-"], ["Permissions policies (lab)", r.policies.length ? h("div", {}, r.policies.map(function (p) { return h("div", { text: p }); })) : "ไม่มี"]]; } });
};
var ROLE_UC = [["EC2", "Allows EC2 instances to call AWS services on your behalf."], ["EC2 Role for AWS Systems Manager", "Allows EC2 instances to call AWS services like CloudWatch and Systems Manager on your behalf."], ["EC2 Spot Fleet Role", "Allows EC2 Spot Fleet to request and terminate Spot Instances on your behalf."], ["EC2 - Spot Fleet Auto Scaling", "Allows Auto Scaling to access and update EC2 spot fleets on your behalf."], ["EC2 - Spot Fleet Tagging", "Allows EC2 to launch spot instances and attach tags to the launched instances on your behalf."], ["EC2 - Spot Instances", "Allows EC2 Spot Instances to launch and manage spot instances on your behalf."], ["EC2 - Spot Fleet", "Allows EC2 Spot Fleet to launch and manage spot fleet instances on your behalf."], ["EC2 - Scheduled Instances", "Allows EC2 Scheduled Instances to manage instances on your behalf."]];
function roleTrustDoc(V) { return codePre(JSON.stringify({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: ["sts:AssumeRole"], Principal: { Service: [V && V.usecase === "EKS" ? "eks.amazonaws.com" : V && V.usecase === "ECS" ? "ecs-tasks.amazonaws.com" : V && V.usecase === "Lambda" ? "lambda.amazonaws.com" : V && V.usecase === "CodeBuild" ? "codebuild.amazonaws.com" : V && V.usecase === "CodePipeline" ? "codepipeline.amazonaws.com" : "ec2.amazonaws.com"] } }] }, null, 2), "json"); }
PAGES["role-create"] = function () {
  return formPage({ name: "role-create", crumb: "IAM › Roles › Create role", title: "Create role", back: "roles", steps: 3,
    init: function () { return { entity: "AWS service", usecase: "EC2", uc2: "EC2", policies: [], q: "", ptype: "All types", name: "", desc: "" }; },
    sections: function (V) { return [
      { step: 0, t: "Select trusted entity", ct: "Trusted entity type", f: [{ id: "entity", type: "rcards", stack: true, opts: function () { return [["AWS service", "AWS service", "Allow AWS services like EC2, Lambda, or others to perform actions in this account."], ["AWS account", "AWS account", "Allow entities in other AWS accounts belonging to you or a 3rd party to perform actions in this account."], ["Web identity", "Web identity", "Allows users federated by the specified external web identity provider to assume this role to perform actions in this account."], ["SAML 2.0 federation", "SAML 2.0 federation", "Allow users federated with SAML 2.0 from a corporate directory to perform actions in this account."], ["Custom trust policy", "Custom trust policy", "Create a custom trust policy to enable others to perform actions in this account."]]; } }] },
      { step: 0, t: "Select trusted entity", ct: "Use case", f: [{ id: "usecase", type: "select", label: "Service or use case", opts: function () { return [["", "Choose a service or use case"], ["EC2", "EC2"], ["EKS", "EKS"], ["ECS", "Elastic Container Service"], ["Lambda", "Lambda"], ["CodeBuild", "CodeBuild"], ["CodePipeline", "CodePipeline"], ["S3", "S3"]]; }, onchange: function (V) { if (V.usecase === "EKS") { V.uc2 = "EKS - Cluster"; V.policies = ["AmazonEKSClusterPolicy"]; } else if (V.usecase === "ECS") { V.uc2 = "Elastic Container Service Task"; V.policies = []; } else if (V.usecase === "Lambda") { V.uc2 = "Lambda"; V.policies = ["AWSLambdaBasicExecutionRole"]; } else if (V.usecase === "CodeBuild" || V.usecase === "CodePipeline") { V.uc2 = V.usecase; V.policies = []; } else if (V.usecase === "EC2") { V.uc2 = "EC2"; V.policies = []; } } },
        { type: "custom", id: "uc2", show: function (V) { return V.usecase === "EC2" || V.usecase === "EKS" || V.usecase === "ECS" || V.usecase === "Lambda" || V.usecase === "CodeBuild" || V.usecase === "CodePipeline"; }, render: function (V) { var b = h("div", {}, [h("div", { cls: "hint", text: "Choose a use case for the specified service." }), h("div", { cls: "l", text: "Use case" })]); (V.usecase === "EKS" ? [["EKS - Cluster", "Allows access to other AWS service resources that are required to operate clusters managed by EKS."]] : V.usecase === "ECS" ? [["Elastic Container Service Task", "Allows ECS tasks to call AWS services on your behalf."]] : V.usecase === "Lambda" ? [["Lambda", "Allows Lambda functions to call AWS services on your behalf."]] : V.usecase === "CodeBuild" ? [["CodeBuild", "Allows CodeBuild to call AWS services on your behalf."]] : V.usecase === "CodePipeline" ? [["CodePipeline", "Allows CodePipeline to call AWS services on your behalf."]] : ROLE_UC).forEach(function (o) { b.appendChild(h("label", { cls: "opt", style: "align-items:flex-start;margin:6px 0" }, [h("input", { type: "radio", name: "uc2", checked: V.uc2 === o[0], onchange: function () { V.uc2 = o[0]; render(); } }), h("span", {}, [h("div", { text: o[0] }), h("div", { cls: "sub", style: "font-size:.8rem", text: o[1] })])])); }); return b; } }] },
      { step: 1, t: "Add permissions", ct: "Permissions policies (" + V.policies.length + "/" + POLICIES.length + ")", f: [{ type: "custom", wide: true, id: "policies", render: function (V) {
        var box = h("div"), q = (V.q || "").toLowerCase(), list = POLICIES.filter(function (p) { return !q || p.toLowerCase().indexOf(q) >= 0; });
        box.appendChild(h("div", { cls: "hint", text: "Choose one or more policies to attach to your new role." }));
        box.appendChild(h("div", { style: "display:flex;gap:10px;align-items:center;margin:8px 0" }, [h("div", { cls: "finder", style: "flex:1;margin:0" }, [h("input", { type: "search", placeholder: "Search", "aria-label": "Search policies", value: V.q || "", oninput: function (e) { V.q = e.target.value; render(); var el = document.querySelector('[aria-label="Search policies"]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } } })]), h("select", { "aria-label": "Filter by Type", style: "width:180px;flex:none" }, [h("option", { text: "All types" }), h("option", { text: "AWS managed" }), h("option", { text: "Customer managed" })]), h("span", { cls: "sub", text: list.length + " matches" })]));
        box.appendChild(h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, [h("th", { text: "" }), h("th", { text: "Policy name" }), h("th", { text: "Type" }), h("th", { text: "Description" })])]), h("tbody", {}, list.map(function (p) { var on = V.policies.indexOf(p) >= 0, d = (S.policies.filter(function (x) { return x.name === p; })[0] || {}).desc || "-"; return h("tr", { cls: on ? "sel" : "", style: "cursor:default" }, [h("td", {}, [h("input", { type: "checkbox", checked: on, "aria-label": "Select " + p, onchange: function (e) { var i = V.policies.indexOf(p); if (e.target.checked && i < 0) V.policies.push(p); if (!e.target.checked && i >= 0) V.policies.splice(i, 1); render(); } })]), h("td", {}, [h("a", { href: "#", cls: "lnk", text: p, onclick: function (e) { e.preventDefault(); } })]), h("td", { text: "AWS managed" }), h("td", { text: d })]); }))])]));
        box.appendChild(h("p", { cls: "hint", text: "▸ Set permissions boundary - optional" })); return box; } }] },
      { step: 2, t: "Name, review, and create", ct: "Role details", f: [{ id: "name", type: "text", label: "Role name", req: true, ph: "pharmacy-jenkins", desc: "Enter a meaningful name to identify this role. Maximum 64 characters. Use alphanumeric and '+=,.@-_' characters." }, { id: "desc", type: "text", label: "Description", desc: "Add a short explanation for this role. Maximum 1000 characters.", ph: "Allows EC2 instances to call AWS services on your behalf." }] },
      { step: 2, t: "Name, review, and create", ct: "Step 1: Select trusted entities", f: [{ type: "custom", wide: true, id: "trustdoc", render: function (V) { return roleTrustDoc(V); } }] },
      { step: 2, t: "Name, review, and create", ct: "Step 2: Add permissions", f: [{ type: "custom", wide: true, id: "permrev", render: function (V) { return tbl(["Policy name", "Type"], V.policies.map(function (p) { return [p, "AWS managed"]; }), "No policies selected"); } }] },
      { step: 2, t: "Name, review, and create", ct: "Step 3: Add tags", f: [{ type: "custom", id: "tagsrev", render: function () { return h("p", { cls: "hint", text: "Add tags - optional. No tags associated with the resource." }); } }] }]; },
    submit: "Create role", onSubmit: function (V) { var r = API.createRole(V); if (r.errors) return r; return { msg: "Role " + V.name + " created. (และได้ instance profile ชื่อ " + V.name + " ให้อัตโนมัติ)" }; } });
};
LISTS.repos = function () {
  return ({ key: "repos", kind: "repo", title: "Private repositories", crumb: "ECR › Private registry › Repositories", create: [{ label: "Create repository", page: "repo-create" }],
    detail: function (r) { return [["Repository name", r.name], ["URI", r.uri], ["Image tag immutability", r.mutable ? "Mutable" : "Immutable"], ["Encryption", r.enc], ["Images", String(r.images.length)]]; }, actions: [{ label: "View push commands", page: "ecr-cmds" }, { label: "Docker push / pull (จำลอง)", page: "ecr-run" }, { label: "Delete", page: "del", kind: "repo" }], rows: function () { return S.repos; }, cols: [["Repository name", function (r) { return r.name; }], ["URI", function (r) { return r.uri; }], ["Created at", function () { return "October 07, 2026, 09:00:00 (UTC+07)"; }], ["Tag immutability", function (r) { return r.mutable ? "Disabled" : "Enabled"; }], ["Scan frequency", function () { return "Manual"; }], ["Encryption type", function (r) { return r.enc; }], ["Pull through cache", function () { return "Inactive"; }]] });
};
PAGES["repo-create"] = function () {
  return formPage({ name: "repo-create", crumb: "Amazon ECR › Repositories › Create repository", title: "Create repository", back: "repos", init: function () { return { vis: "private", name: "", mut: false, enc: "AES-256" }; },
    sections: function (V) { return [{ t: "General settings", f: [
      { id: "vis", type: "radio", label: "Visibility settings", info: 1, desc: "Choose the visibility setting for the repository.", opts: function () { return [["private", "Private — Access is managed by IAM and repository policy permissions."], ["public", "Public — Publicly visible and accessible for image pulls.", "ไม่จำลอง"]]; } },
      { type: "custom", id: "uriName", render: function (V) { return h("div", {}, [h("div", { cls: "l", style: "font-weight:600;font-size:.86rem", text: "Repository name" }), h("div", { cls: "hint", style: "margin-bottom:6px", text: "Provide a concise name. A developer should be able to identify the repository contents by the name." }), h("div", { style: "display:flex;gap:8px;align-items:center" }, [h("span", { style: "white-space:nowrap", text: "000000000000.dkr.ecr." + REGION + ".amazonaws.com/" }), h("div", { style: "flex:1" }, [exPick([["pharmacy/frontend", "pharmacy/frontend"], ["pharmacy/backend", "pharmacy/backend"]], function () { return V.name; }, function (v) { V.name = v; }, V, "_c_name", "pharmacy/frontend", "Repository name", false)])]), h("div", { cls: "hint", text: (V.name || "").length + " out of 256 characters maximum (2 minimum). The name must start with a letter and can only contain lowercase letters, numbers, hyphens, underscores, periods and forward slashes." }), F2err("name")]); } },
      { id: "mut", type: "seg", label: "Tag immutability", info: 1, desc: "Enable tag immutability to prevent image tags from being overwritten by subsequent image pushes using the same tag. Disable tag immutability to allow image tags to be overwritten.", opts: function () { return [[false, "Disabled"], [true, "Enabled"]]; } },
      { type: "custom", id: "infobox", render: function () { return h("div", { cls: "alert info", text: "ⓘ Once a repository is created, the visibility setting of the repository can't be changed." }); } }] },
      { t: "Encryption settings", f: [{ id: "enc", type: "seg", label: "KMS encryption", info: 1, desc: "You can use AWS Key Management Service (KMS) to encrypt images stored in this repository, instead of using the default encryption settings.", opts: function () { return [["AES-256", "Disabled (AES-256)"], ["AWS KMS", "Enabled (AWS KMS)"]]; } }] }]; },
    submit: "Create repository", onSubmit: function (V) { var r = API.createRepo({ name: V.name, mutable: !(V.mut === true || V.mut === "true"), enc: V.enc }); return r.errors ? r : { msg: "Successfully created repository " + r.res.name }; } });
};
function F2err(k) { var e = UI.form && UI.form.errors && UI.form.errors[k]; return e ? h("div", { cls: "err", style: "color:var(--bad)", text: e }) : null; }
LISTS.insts = function () {
  return ({ key: "insts", kind: "inst", title: "Instances", crumb: "EC2 › Instances", create: [{ label: "Launch instances", page: "launch" }],
    actions: [
      { label: "Connect", btn: true, page: "ssh", when: function (r) { return r.state !== "terminated"; } },
      { label: "Reboot instance", grp: "Instance state", run: function (r) { return API.instState(r.id, "reboot"); }, msg: "reboot แล้ว IP ไม่เปลี่ยน", when: function (r) { return r.state === "running"; } },
      { label: "Stop instance", grp: "Instance state", run: function (r) { return API.instState(r.id, "stop"); }, msg: "stop แล้ว public IPv4 ที่ได้อัตโนมัติถูกคืน (private IP และ Elastic IP ยังอยู่) ไม่คิดค่าเครื่องแต่ยังคิดค่าดิสก์ ถ้าต้องการ IP คงที่ให้ใช้ Elastic IP", when: function (r) { return r.state === "running"; } },
      { label: "Start instance", grp: "Instance state", run: function (r) { return API.instState(r.id, "start"); }, msg: "start แล้ว ถ้าเครื่องเคยมี public IP จะได้ IP ใหม่ที่ไม่ใช่ตัวเดิม (ระวัง Ansible/SSH config ที่จด IP เก่าไว้)", when: function (r) { return r.state === "stopped"; } },
      { label: "Change instance type", page: "inst-type", when: function (r) { return r.state !== "terminated"; } },
      { label: "Modify IAM role", page: "inst-role", when: function (r) { return r.state !== "terminated"; } },
      { label: "Terminate (delete) instance", grp: "Instance state", page: "del", kind: "inst", when: function (r) { return r.state !== "terminated"; } }],
    rows: function () { return S.insts; }, cols: [["Name", function (r) { return r.name || "-"; }], ["Instance ID", function (r) { return r.id; }], ["Instance state", function (r) { return stateIcon(r.state, r); }], ["Instance type", function (r) { return r.type; }], ["Status check", function (r) { var ph = instPhase(r); return ph.check === "2/2 checks passed" ? h("span", { style: "display:inline-flex;gap:6px;align-items:center;white-space:nowrap" }, [icoEl("check", 15, "#1d8102"), "2/2 checks passed"]) : ph.check === "Initializing" ? h("span", { style: "display:inline-flex;gap:6px;align-items:center;white-space:nowrap" }, [icoEl("clock", 15, "#5f6b7a"), "Initializing"]) : "–"; }], ["Alarm status", function () { return "No alarms  +"; }], ["Availability Zone", function (r) { return r.az; }], ["Public IPv4 DNS", function (r) { var v = find(S.vpcs, r.vpcId); return v && v.dnsHostnames && v.dnsResolution && r.publicIp ? "ec2-" + r.publicIp.replace(/\./g, "-") + "." + REGION + ".compute.lab.invalid" : "–"; }], ["Public IPv4 address", function (r) { return r.publicIp || "–"; }], ["Private IPv4 address", function (r) { return r.privateIp; }], ["Subnet", function (r) { return nm(find(S.subnets, r.subnetId)); }], ["Key name", function (r) { return r.keyName || "-"; }]],
    detail: function (r) {
      var v = find(S.vpcs, r.vpcId), dns = v && v.dnsHostnames && v.dnsResolution && r.publicIp ? "ec2-" + r.publicIp.replace(/\./g, "-") + "." + REGION + ".compute.lab.invalid" : "-";
      var rows = [["Instance ID", r.id], ["Instance state", stateTag(r.state)], ["Public IPv4 address", r.publicIp || "-"], ["Private IPv4 addresses", r.privateIp], ["Public IPv4 DNS", dns + (dns === "-" && r.publicIp ? "  (VPC ต้องเปิดทั้ง DNS hostnames และ DNS resolution)" : "")], ["Instance type", r.type], ["Security groups", r.sgIds.map(function (id) { return nm(find(S.sgs, id)); }).join(", ")], ["IAM Role", r.profile || "-"], ["Elastic IP", r.eipId ? (find(S.eips, r.eipId) || {}).ip : "-"], ["Metadata", "tokens: " + r.imds.tokens + ", hop limit: " + r.imds.hop], ["Tags", r.tags.map(function (t) { return t.k + "=" + t.v; }).join(", ") || "-"]];
      if (r.state === "terminated") { rows.push(["สถานะ", "terminated: ลบถาวรแล้ว กู้คืนไม่ได้ รายการนี้จะหายไปเองในไม่ช้า"]); return rows; }
      var d = sshCheck(r, r.keyName);
      rows.push(["เข้าจาก My IP ทาง SSH", d.kind === "timeout" ? tagp("เข้าไม่ได้ (timeout) กด Connect ดูสาเหตุ", "bad") : tagp("เครือข่ายผ่าน", "ok")], ["ออกอินเทอร์เน็ตได้", internetOut(r) ? tagp("ได้", "ok") : tagp("ไม่ได้", "bad")]);
      if (r.state === "stopped") rows.push(["ค่าใช้จ่าย", "stopped: ไม่คิดค่าเครื่อง แต่ยังคิดค่าดิสก์ EBS"]);
      return rows;
    } });
};
PAGES.ssh = function () {
  var inst = find(S.insts, UI.params.id); UI.held = UI.held == null ? (inst.keyName || "") : UI.held; UI.ctab = UI.ctab || "eic";
  var wrap = h("div");
  wrap.appendChild(crumbEl("EC2 › Instances › " + (inst.name || inst.id) + " › Connect to instance"));
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", {}, ["Connect to instance", h("a", { href: "#", cls: "infolink", text: "Info", onclick: function (e) { e.preventDefault(); } })]), h("div", { cls: "sp" }, [h("button", { cls: "btn", type: "button", text: "Cancel", onclick: function () { go("insts"); } })])]));
  wrap.appendChild(h("p", { text: "Connect to your instance " + inst.id + (inst.name ? " (" + inst.name + ")" : "") + " using any of these options" }));
  var T = [["eic", "EC2 Instance Connect"], ["ssm", "Session Manager"], ["ssh", "SSH client"], ["serial", "EC2 serial console"]];
  var card = h("div", { cls: "card" });
  card.appendChild(h("div", { cls: "dtabs", role: "tablist" }, T.map(function (t) { return h("button", { type: "button", role: "tab", text: t[1], cls: t[0] === "serial" ? "off" : "", "aria-selected": String(UI.ctab === t[0]), onclick: function () { UI.ctab = t[0]; render(); } }); })));
  var body = h("div", { cls: "dbody" });
  function steps(list) { return h("div", { cls: "steps" }, list.map(function (s) { return h("div", {}, [h("b", { text: s.skip ? "–" : (s.ok ? "✓" : "✗"), style: "color:var(--" + (s.skip ? "muted" : (s.ok ? "ok" : "bad")) + ")" }), h("span", {}, [h("b", { text: s.t }), h("div", { cls: "hint", text: s.d })])]); })); }
  if (UI.ctab === "ssh") {
    var v = find(S.vpcs, inst.vpcId), dns = v && v.dnsHostnames && v.dnsResolution && inst.publicIp ? "ec2-" + inst.publicIp.replace(/\./g, "-") + "." + REGION + ".compute.lab.invalid" : (inst.publicIp || inst.privateIp);
    var d = sshCheck(inst, UI.held), kn = inst.keyName || "<key>";
    body.appendChild(h("ol", {}, [h("li", { text: "Open an SSH client." }), h("li", { text: "Locate your private key file. The key used to launch this instance is " + kn + ".pem" }), h("li", {}, ["Run this command, if necessary, to ensure your key is not publicly viewable: ", h("code", { text: "chmod 400 " + kn + ".pem" })]), h("li", {}, ["Connect to your instance using its Public DNS: ", h("code", { text: dns })])]));
    body.appendChild(h("div", { cls: "f" }, [h("label", { cls: "l", text: "กุญแจ private ที่คุณถืออยู่ในเครื่อง (ส่วนจำลอง)" }), sel(UI, "held", [["", "(ไม่มีกุญแจ)"]].concat(S.keys.map(function (k) { return [k.name, k.name + ".pem"]; })).concat([["other-key", "กุญแจอื่นที่ไม่เกี่ยวกับเครื่องนี้"]]), "กุญแจ")]));
    body.appendChild(h("pre", { cls: "term", text: "$ ssh -i " + (UI.held || "<key>") + ".pem ubuntu@" + dns + "\n" + d.out }));
    body.appendChild(steps(d.steps));
    body.appendChild(h("p", { cls: "hint", text: d.kind === "timeout" ? "timeout = ติดที่เครือข่าย (ข้อ ✗ ข้างบน) ยังไปไม่ถึงขั้นตรวจกุญแจ" : d.kind === "denied" ? "Permission denied = ถึงเครื่องแล้ว แต่กุญแจไม่ตรง" : "เข้าได้" }));
  } else if (UI.ctab === "eic") {
    var d2 = sshCheck(inst, inst.keyName), net = d2.steps.slice(0, 4), okEic = net.every(function (x) { return x.ok; });
    body.appendChild(kvDom([["Instance ID", "⧉ " + inst.id + (inst.name ? " (" + inst.name + ")" : "")]]));
    body.appendChild(h("div", { cls: "f" }, [h("label", { cls: "l", text: "Connection Type" }), h("div", { cls: "rcards" }, [h("div", { cls: "rcard on" }, [h("span", { style: "flex:none;width:14px;height:14px;border-radius:50%;border:2px solid #0972d3;background:radial-gradient(#0972d3 45%,#fff 50%)" }), h("div", {}, [h("div", { text: "Connect using EC2 Instance Connect" }), h("div", { cls: "sub", style: "font-size:.8rem", text: "Connect using the EC2 Instance Connect browser-based client, with a public IPv4 address." })])]), h("div", { cls: "rcard", style: "opacity:.6" }, [h("span", { style: "flex:none;width:14px;height:14px;border-radius:50%;border:2px solid #879596" }), h("div", {}, [h("div", { text: "Connect using EC2 Instance Connect Endpoint" }), h("div", { cls: "sub", style: "font-size:.8rem", text: "Connect using the EC2 Instance Connect browser-based client, with a private IPv4 address and a VPC endpoint. (ไม่จำลอง)" })])])])]));
    body.appendChild(kvDom([["Public IP address", "⧉ " + (inst.publicIp || "-")]]));
    body.appendChild(h("div", { cls: "f" }, [h("label", { cls: "l", text: "User name" }), h("div", { cls: "hint", text: "Enter the user name defined in the AMI used to launch the instance. If you didn't define a custom user name, use the default user name, " + (/ubuntu/i.test(inst.ami || "") ? "ubuntu" : "ec2-user") + "." }), (UI.cu = UI.cu || { v: /ubuntu/i.test(inst.ami || "") ? "ubuntu" : "ec2-user" }, exPick([["ubuntu", "ubuntu"], ["ec2-user", "ec2-user"], ["root", "root"]], function () { return UI.cu.v; }, function (v) { UI.cu.v = v; }, UI.cu, "_c", "ubuntu", "User name", false))]));
    body.appendChild(h("div", { cls: "alert info", text: "ⓘ Note: In most cases, the default user name, " + (/ubuntu/i.test(inst.ami || "") ? "ubuntu" : "ec2-user") + ", is correct. However, read your AMI usage instructions to check if the AMI owner has changed the default AMI user name." }));
    body.appendChild(steps(net));
    body.appendChild(h("pre", { cls: "term", text: okEic ? "Connected (EC2 Instance Connect)  — ไม่ต้องมีกุญแจ" : "Failed to connect to your instance. EC2 Instance Connect is unable to connect to your instance (ติดที่เครือข่ายตามข้อ ✗)" }));
    body.appendChild(h("p", { cls: "hint", text: "เอกสาร: EC2 Instance Connect ต้องมีกฎขาเข้า และสิทธิ์ IAM แต่ไม่ต้องมี key pair และไม่ต้องมี instance profile (จำลองเงื่อนไข port 22 ด้วยกฎ SSH เดียวกับ My IP; ช่วง IP ของบริการ EIC ไม่ได้จำลอง)" }));
  } else if (UI.ctab === "ssm") {
    var c = sessionCheck(inst);
    body.appendChild(h("b", { text: "Session Manager usage:" })); body.appendChild(h("ul", {}, ["Connect to your instance without SSH keys, a bastion host, or opening any inbound ports.", "Sessions are secured using an AWS Key Management Service key.", "You can log session commands and details in an Amazon S3 bucket or CloudWatch Logs log group.", "Configure sessions on the Session Manager Preferences page."].map(function (x) { return h("li", { text: x }); })));
    body.appendChild(h("p", { cls: "hint", text: "ตัวจำลอง: เครื่องต้องมี IAM role ที่มีสิทธิ์ SSM และ SSM Agent ที่ออนไลน์" }));
    body.appendChild(steps(c.steps));
    body.appendChild(h("pre", { cls: "term", text: c.out }));
    body.appendChild(h("p", { cls: "hint", text: "เอกสาร: Session Manager ไม่ต้องมีกฎขาเข้าและไม่ต้องมี key pair แต่ต้องมี instance profile role (ชื่อ policy AmazonSSMManagedInstanceCore และเงื่อนไขทางออกเน็ตมาจากความจำ ยังไม่ยืนยัน)" }));
  } else body.appendChild(h("p", { cls: "hint", text: "EC2 serial console มีใน console จริงแต่ยังไม่ได้จำลอง" }));
  card.appendChild(body); wrap.appendChild(card);
  return wrap;
};
PAGES.launch = function () {
  var dv = defaultVpc();
  return formPage({ name: "launch", crumb: "EC2 › Instances › Launch an instance", title: "Launch an instance", back: "insts", sectionInfo: true,
    init: function () { return { name: "", tags: [], ami: "ami-ubuntu2404", type: "t3.micro", keyName: "", vpcId: dv.id, subnetId: "", autoIp: "Enable", sgMode: "existing", sgIds: [defaultSg(dv.id).id], nsName: "launch-wizard-" + (S.sgs.filter(function (g) { return /^launch-wizard-\d+$/.test(g.name); }).length + 1), nsDesc: "", nsSrc: "Anywhere-IPv4", nsSsh: true, nsHttps: false, nsHttp: false, _netEdit: false, diskSize: "8", diskType: "gp3", profile: "", tokens: "optional", hop: "1", count: "1", _ipTouched: false, _sn: "" }; },
    warn: function (V) { return S.acct === "free" && FREE.indexOf(V.type) < 0 ? "Instance type " + V.type + " ไม่อยู่ในรายการใช้ฟรีของบัญชีที่สร้างตั้งแต่ 15 ก.ค. 2025 (อาจถูกบล็อกหรือคิดเงิน หน้านี้แค่เตือน)" : ""; },
    sections: function (V) {
      var sn = V.subnetId ? find(S.subnets, V.subnetId) : S.subnets.filter(function (x) { return x.vpcId === V.vpcId; })[0];
      if (V._sn !== (sn ? sn.id : "")) { V._sn = sn ? sn.id : ""; V.autoIp = sn && sn.autoIp ? "Enable" : "Disable"; }
      return [
      { t: "Name and tags", f: [{ id: "name", type: "text", label: "Name", ph: "pharmacy-jenkins" }, { type: "custom", id: "tags", render: function (V) { return rowsEditor("Add additional tags", V.tags, [function (r) { return inp(r, "k", "Key เช่น Role"); }, function (r) { return inp(r, "v", "Value เช่น jenkins"); }], function () { return { k: "", v: "" }; }, "Add tag"); } }] },
      { t: "Application and OS Images (Amazon Machine Image)", f: [{ id: "ami", type: "select", label: "Quick Start", opts: function () { return AMIS; } }] },
      { t: "Instance type", f: [{ id: "type", type: "select", label: "Instance type", hint: "Family: " + String(V.type).split(".")[0] + "    " + (VCPU[V.type] || 2) + " vCPU    " + (MEMGIB[V.type] || 4) + " GiB Memory    Current generation: true" + (FREE.indexOf(V.type) >= 0 ? "    Free tier eligible" : "") + "   ·   Compare instance types   ·   Get advice", opts: function () { return ITYPES.map(function (t) { return [t, t + (FREE.indexOf(t) >= 0 ? "   Free tier eligible" : "")]; }); } }] },
      { t: "Key pair (login)", f: [{ id: "keyName", type: "select", label: "Key pair name - required", desc: "You can use a key pair to securely connect to your instance. Ensure that you have access to the selected key pair before you launch the instance.", opts: function () { return [["", "Proceed without a key pair (not recommended)"]].concat(S.keys.map(function (k) { return [k.name, k.name]; })); } },
        { type: "custom", id: "newkey", render: function (V, rr) {
          var nk = V._nk, box = h("div", {});
          if (!nk) { box.appendChild(h("a", { href: "#", text: "↻   Create new key pair", onclick: function (e) { e.preventDefault(); V._nk = { name: "", type: "ED25519", fmt: "pem", err: "" }; rr(); } })); return box; }
          var nm = exPick([["pharmacy-admin", "pharmacy-admin"], ["pharmacy-admin-manual", "pharmacy-admin-manual"]], function () { return nk.name; }, function (v) { nk.name = v; }, nk, "_c", "ชื่อ key pair", "New key pair name", false);
          function rad(k, label, opts) { return h("div", { cls: "opt" }, [h("b", { text: label + "  " })].concat(opts.map(function (o) { return h("label", {}, [h("input", { type: "radio", name: "nk" + k, checked: nk[k] === o[0], onchange: function () { nk[k] = o[0]; } }), " " + o[1] + "  "]); }))); }
          box.appendChild(h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("b", { text: "Create key pair" }), h("p", {}, ["Key pair name ", nm]), rad("type", "Key pair type", [["RSA", "RSA"], ["ED25519", "ED25519"]]), rad("fmt", "Private key file format", [["pem", ".pem"], ["ppk", ".ppk"]]),
            nk.err ? h("p", { cls: "err", text: nk.err }) : null,
            h("button", { type: "button", cls: "btn", text: "Cancel", onclick: function () { V._nk = null; rr(); } }), " ",
            h("button", { type: "button", cls: "btn pri", text: "Create key pair", onclick: function () { var r = API.createKey({ name: nk.name, type: nk.type, fmt: nk.fmt }); if (r.errors) { nk.err = r.errors.name; rr(); return; } V.keyName = r.res.name; V._nk = null; flash("ok", "สร้าง key pair " + r.res.name + " แล้ว ไฟล์ " + r.res.file + " ถูกดาวน์โหลดอัตโนมัติ นี่คือโอกาสเดียวที่จะเก็บ private key (จำลอง) และเลือกให้ในฟอร์มแล้ว"); rr(); } })])]));
          return box; } }] },
      { t: "Network settings", f: [
        { type: "custom", id: "nethead", render: function (V, rr) { var sn0 = V.subnetId ? find(S.subnets, V.subnetId) : null, ed = !!V._netEdit; return h("div", {}, [h("div", { style: "display:flex;justify-content:flex-end" }, [h("button", { cls: "btn", type: "button", text: ed ? "Done" : "Edit", onclick: function () { V._netEdit = !V._netEdit; rr(); } })]), ed ? null : kvDom([["Network", vname(V.vpcId) + " · " + (find(S.vpcs, V.vpcId) || {}).cidr], ["Subnet", sn0 ? nm(sn0) + " · " + sn0.az + " · " + sn0.cidr : "No preference (Default subnet in any availability zone)"], ["Auto-assign public IP", V.autoIp], ["", "Additional charges apply when outside of free tier allowance"]])]); } },
        { id: "vpcId", type: "select", label: "VPC", info: 1, show: function (V) { return V._netEdit; }, opts: function () { return S.vpcs.map(function (v) { return [v.id, vname(v.id) + " · " + v.cidr]; }); }, onchange: function (V) { V.subnetId = ""; V.sgIds = [defaultSg(V.vpcId).id]; } },
        { id: "subnetId", type: "select", label: "Subnet", info: 1, show: function (V) { return V._netEdit; }, opts: function (V) { return [["", "No preference"]].concat(S.subnets.filter(function (x) { return x.vpcId === V.vpcId; }).map(function (x) { return [x.id, nm(x) + " · " + x.az + " · " + x.cidr]; })); } },
        { id: "autoIp", type: "select", label: "Auto-assign public IP", info: 1, show: function (V) { return V._netEdit; }, opts: function () { return [["Enable", "Enable"], ["Disable", "Disable"]]; }, hint: "ค่าเริ่มต้น Enable เมื่อใช้ default subnet และ Disable เมื่อใช้ subnet ที่ไม่ใช่ default (ตามเอกสาร EC2)" },
        { id: "sgMode", type: "rcards", label: "Firewall (security groups)", info: 1, desc: "A security group is a set of firewall rules that control the traffic for your instance. Add rules to allow specific traffic to reach your instance.", opts: function () { return [["new", "Create security group"], ["existing", "Select existing security group"]]; } },
        { id: "sgIds", type: "multi", label: "Common security groups", show: function (V) { return V.sgMode === "existing"; }, opts: function (V) { return sgOpts(V.vpcId); } },
        { type: "custom", id: "newsg", show: function (V) { return V.sgMode === "new"; }, render: function (V, rr) { return h("div", {}, [h("p", { text: "We'll create a new security group called '" + V.nsName + "' with the following rules:" }), h("label", { cls: "opt" }, [h("input", { type: "checkbox", checked: !!V.nsSsh, onchange: function (e) { V.nsSsh = e.target.checked; rr(); } }), h("span", {}, ["Allow SSH traffic from", h("small", { style: "display:block", text: "Helps you connect to your instance" })]), h("select", { "aria-label": "SSH source", onchange: function (e) { V.nsSrc = e.target.value; rr(); } }, [["Anywhere-IPv4", "Anywhere 0.0.0.0/0"], ["My IP", "My IP " + S.myIp + "/32"], ["Custom", "Custom"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: V.nsSrc === o[0] ? "selected" : null }); })), V.nsSrc === "Custom" ? exPick([["203.0.113.0/24", "203.0.113.0/24"], ["10.0.0.0/16", "10.0.0.0/16"], [S.myIp + "/32", S.myIp + "/32"]], function () { return V.nsCidr; }, function (v) { V.nsCidr = v; }, V, "_cnsc", "Add CIDR block", "SSH source CIDR", false) : null]), h("label", { cls: "opt" }, [h("input", { type: "checkbox", checked: !!V.nsHttps, onchange: function (e) { V.nsHttps = e.target.checked; } }), h("span", {}, ["Allow HTTPS traffic from the internet", h("small", { style: "display:block", text: "To set up an endpoint, for example when creating a web server" })])]), h("label", { cls: "opt" }, [h("input", { type: "checkbox", checked: !!V.nsHttp, onchange: function (e) { V.nsHttp = e.target.checked; } }), h("span", {}, ["Allow HTTP traffic from the internet", h("small", { style: "display:block", text: "To set up an endpoint, for example when creating a web server" })])]), V.nsSsh && V.nsSrc === "Anywhere-IPv4" ? h("div", { cls: "alert warn", style: "margin-top:8px" }, ["⚠ Rules with source of 0.0.0.0/0 allow all IP addresses to access your instance. We recommend setting security group rules to allow access from known IP addresses only."]) : null]); } },
        { id: "nsName", type: "text", label: "Security group name", req: true, show: function (V) { return V.sgMode === "new" && V._netEdit; }, hint: "ชื่อและ description แก้ไม่ได้หลังสร้าง" }, { id: "nsDesc", type: "text", label: "Description", req: true, show: function (V) { return V.sgMode === "new" && V._netEdit; }, desc: "ของจริง wizard เติมให้ เช่น launch-wizard-N created <วันเวลา> · แก้ไม่ได้หลังสร้าง" },
        { type: "custom", id: "nsrules", show: function (V) { return V.sgMode === "new" && V._netEdit; }, render: function (V) { var src = V.nsSrc === "Custom" ? (V.nsCidr || "…") : V.nsSrc === "My IP" ? S.myIp + "/32" : "0.0.0.0/0", rows = []; if (V.nsSsh) rows.push(["SSH", "22", src]); if (V.nsHttps) rows.push(["HTTPS", "443", "0.0.0.0/0"]); if (V.nsHttp) rows.push(["HTTP", "80", "0.0.0.0/0"]); return h("div", {}, [h("div", { cls: "l", text: "Inbound Security Group Rules" })].concat(rows.length ? rows.map(function (x, i) { return h("div", { style: "border:1px solid var(--line,#d3dae3);border-radius:6px;padding:8px 12px;margin:6px 0" }, ["▾ Security group rule " + (i + 1) + " (TCP, " + x[1] + ", " + x[2] + ")", h("div", { cls: "hint", text: "Type: " + x[0] + " · Protocol: TCP · Port range: " + x[1] + " · Source: " + x[2] })]); }) : [h("div", { cls: "hint", text: "ไม่มีกฎขาเข้า (ติ๊ก SSH/HTTP/HTTPS ด้านบนเพื่อเพิ่ม)" })])); } }] },
      { t: "Configure storage", f: [{ id: "diskSize", type: "text", label: "Size (GiB)" }, { id: "diskType", type: "select", label: "Volume type", opts: function () { return [["gp3", "gp3"], ["gp2", "gp2"]]; } }] },
      { t: "Advanced details", f: [{ id: "profile", type: "select", label: "IAM instance profile", opts: function () { return [["", "-"]].concat(S.roles.map(function (r) { return [r.profile, r.profile]; })); } },
        { id: "tokens", type: "select", label: "Metadata version", opts: function () { return [["optional", "V1 and V2 (token optional)"], ["required", "V2 only (token required)"]]; } },
        { id: "hop", type: "text", label: "Metadata response hop limit", hint: "Jenkins รันใน container ต้อง 2" }] },
    ]; },
    summary: function (V) {
      var gs = V.sgMode === "new" ? ["(สร้างใหม่) " + (V.nsName || "-")] : V.sgIds.map(function (id) { return nm(find(S.sgs, id)); });
      var am = AMIS.filter(function (a) { return a[0] === V.ami; })[0];
      return h("div", {}, [h("div", { cls: "f" }, [h("label", { cls: "l", text: "Number of instances" }), exPick([["1", "1"], ["2", "2"], ["3", "3"], ["9", "9"]], function () { return V.count; }, function (v) { V.count = v; }, V, "_ccount", "1", "Number of instances", false)]),
        kvDom([["Software Image (AMI)", am ? am[1] : V.ami], ["Virtual server type (instance type)", V.type], ["Firewall (security group)", gs.join(", ") || "-"], ["Storage (volumes)", V.diskSize + " GiB " + V.diskType]])]);
    },
    submit: "Launch instance",
    onSubmit: function (V) { var r = API.launch({ name: V.name, tags: V.tags, ami: V.ami, type: V.type, keyName: V.keyName, vpcId: V.vpcId, subnetId: V.subnetId, autoIp: V.autoIp, sgIds: V.sgIds, newSg: V.sgMode === "new" ? { name: V.nsName, desc: V.nsDesc || (V.nsName + " created " + new Date().toISOString().slice(0, 19)), src: V.nsSrc === "Custom" ? (V.nsCidr || "") : V.nsSrc, ssh: V.nsSsh, https: V.nsHttps, http: V.nsHttp } : null, diskSize: V.diskSize, diskType: V.diskType, profile: V.profile, tokens: V.tokens, hop: V.hop, count: V.count });
      if (r.errors) { var e = r.errors; if (e.newSgName) e.nsName = e.newSgName; return r; }
      UI.sel.insts = r.res[0].id; return { msg: "Successfully initiated launch of instance (" + r.res.map(function (x) { return x.id; }).join(", ") + ")" + (r.res[0].publicIp ? "" : "  (ไม่มี public IP)") }; } });
};
function tgArn(r) { return "arn:aws:elasticloadbalancing:" + REGION + ":" + OWNER + ":targetgroup/" + r.name + "/" + hash32(r.id) + hash32(r.name); }
function tgLb(r) { return S.albs.filter(function (a) { return a.listeners.some(function (l) { return l.tgId === r.id; }); })[0]; }
function tgCount(r) { var rows = tgHealth(r), c = { healthy: 0, unhealthy: 0, unused: 0, initial: 0 }; rows.forEach(function (x) { var st = x[4].textContent; if (c[st] != null) c[st]++; }); return c; }
LISTS.tgs = function () {
  return ({ key: "tgs", kind: "tg", title: "Target groups", crumb: "EC2 › Load Balancing › Target Groups", create: [{ label: "Create target group", page: "tg-create" }], actions: [{ label: "Register targets", page: "tg-register" }],
    rows: function () { return S.tgs; }, cols: [["Name", function (r) { return r.name; }], ["ARN", function (r) { return tgArn(r); }], ["Port", function (r) { return String(r.port); }], ["Protocol", function (r) { return r.proto; }], ["Target type", function () { return "Instance"; }], ["Load balancer", function (r) { var a = tgLb(r); return a ? a.name : "None associated"; }], ["VPC ID", function (r) { return r.vpcId; }]],
    detail: function (r) { var c = tgCount(r), a = tgLb(r); return [["Target type", "Instance"], ["Protocol : Port", r.proto + ": " + r.port], ["Protocol version", "HTTP1"], ["VPC", r.vpcId], ["IP address type", "IPv4"], ["Load balancer", a ? a.name : "None associated"], ["Total targets", String(r.targets.length)], ["Healthy", String(c.healthy)], ["Unhealthy", String(c.unhealthy)], ["Unused", String(c.unused)], ["Initial", String(c.initial)], ["Draining", "0"]]; } });
};
function failOpen(hs) { var by = {}; hs.forEach(function (x) { if (x.none) return; (by[x.t.name] = by[x.t.name] || []).push(x.ok); }); var n = Object.keys(by).filter(function (k) { return by[k].length && by[k].every(function (v) { return !v; }); }); return n.join(", "); }
function tgTargetsField(vpcFn) {
  return { type: "custom", id: "targets", render: function (V) {
    var box = h("div"), list = S.insts.filter(function (i) { return i.vpcId === vpcFn(V); });
    if (!list.length) box.appendChild(h("div", { cls: "hint", text: "ไม่มีเครื่องใน VPC นี้ (ข้ามได้ แล้วค่อย Register targets ทีหลัง)" }));
    list.forEach(function (i) { var cur = V.targets.filter(function (x) { return x.instId === i.id; })[0];
      box.appendChild(h("div", { cls: "row r2" }, [h("label", { cls: "opt" }, [h("input", { type: "checkbox", checked: !!cur, onchange: function (e) { if (e.target.checked) V.targets.push({ instId: i.id, port: V.port }); else V.targets = V.targets.filter(function (x) { return x.instId !== i.id; }); render(); } }), h("span", { text: nm(i) + " · " + i.privateIp })]), cur ? inp(cur, "port", "port") : h("span"), h("span")])); });
    return box; } };
}
PAGES["tg-create"] = function () {
  return formPage({ name: "tg-create", crumb: "EC2 › Load Balancing › Target Groups › Create target group", title: "Create target group", back: "tgs", steps: 2,
    init: function () { var d = S.vpcs.filter(function (v) { return !v.isDefault; })[0]; return { ttype: "Instances", name: "", proto: "HTTP", pver: "HTTP1", hcProto: "HTTP", port: "80", ipt: "IPv4", vpcId: d ? d.id : defaultVpc().id, hcPath: "/", targets: [] }; },
    sections: function (V) { return [
      { step: 0, t: "Specify group details", ct: "Basic configuration", f: [{ id: "ttype", type: "rcards", stack: true, label: "Choose a target type", opts: function () { return [["Instances", "Instances", "Supports load balancing to instances within a specific VPC. Facilitates the use of Amazon EC2 Auto Scaling to manage and scale your EC2 capacity."], ["IP addresses", "IP addresses", "Supports load balancing to VPC and on-premises resources. ECS Fargate (awsvpc) ใช้แบบนี้ เพราะ task มี IP ของตัวเอง ไม่ใช่ instance"], ["Lambda function", "Lambda function", "Facilitates routing to a single Lambda function. (ไม่จำลอง)"], ["Application Load Balancer", "Application Load Balancer", "Offers the flexibility for a Network Load Balancer to accept and route TCP requests within a specific VPC. (ไม่จำลอง)"]]; } },
        { id: "name", type: "text", label: "Target group name", req: true, ph: "pharmacy-prd", desc: "A maximum of 32 alphanumeric characters including hyphens are allowed, but the name must not begin or end with a hyphen." }, { id: "proto", type: "select", label: "Protocol", opts: function () { return [["HTTP", "HTTP"]]; } }, { id: "port", type: "text", label: "Port", desc: "1-65535. พอร์ตที่ ALB ส่งต่อไปที่เครื่อง (NodePort ของ frontend)" },
        { id: "ipt", type: "rcards", stack: true, label: "IP address type", desc: "Only targets with the indicated IP address type can be registered to this target group.", opts: function () { return [["IPv4", "IPv4", "Each instance has a default network interface (eth0) that is assigned the primary private IPv4 address."]]; } }, { id: "vpcId", type: "select", label: "VPC", desc: "Select the VPC with the instances that you want to include in the target group.", opts: function () { return S.vpcs.map(function (v) { return [v.id, vname(v.id) + " · " + v.cidr]; }); } },
        { id: "pver", type: "rcards", stack: true, label: "Protocol version", opts: function () { return [["HTTP1", "HTTP1", "Send requests to targets using HTTP/1.1. Supported when the request protocol is HTTP/1.1 or HTTP/2."], ["HTTP2", "HTTP2", "Send requests to targets using HTTP/2. Supported when the request protocol is HTTP/2 or gRPC, but gRPC-specific features are not available. (ไม่จำลอง)"]]; } }] },
      { step: 0, t: "Specify group details", ct: "Health checks", f: [{ id: "hcProto", type: "select", label: "Health check protocol", opts: function () { return [["HTTP", "HTTP"]]; } }, { id: "hcPath", type: "text", label: "Health check path", desc: "Use the default path of \"/\" to ping the root, or specify a custom path if preferred." }] },
      { step: 1, t: "Register targets", f: [tgTargetsField(function (V) { return V.vpcId; })] }]; },
    submit: "Create target group", onSubmit: function (V) { var r = API.createTg({ name: V.name, port: V.port, proto: V.proto, vpcId: V.vpcId, hcPath: V.hcPath, targets: V.ttype === "IP addresses" ? [] : V.targets, targetType: V.ttype === "IP addresses" ? "ip" : "instance" }); if (r.errors) { UI.form.step = 0; return r; } UI.sel.tgs = r.res.id; return { msg: "สร้าง target group แล้ว" }; } });
};
PAGES["tg-register"] = function () {
  var t = find(S.tgs, UI.params.id);
  return formPage({ name: "tg-register", crumb: "EC2 › Target Groups › Register targets", title: "Register targets (" + t.name + ")", back: "tgs", init: function () { return { port: String(t.port), targets: t.targets.map(function (x) { return { instId: x.instId, port: String(x.port) }; }) }; },
    sections: function () { return [{ t: "Available instances", f: [tgTargetsField(function () { return t.vpcId; })] }]; },
    submit: "Include as pending below → Register", onSubmit: function (V) { var r = API.registerTargets(t.id, V.targets); return r.errors ? r : { msg: "ลงทะเบียน " + V.targets.length + " เครื่องแล้ว" }; } });
};
function albArn(r) { return "arn:aws:elasticloadbalancing:" + REGION + ":" + OWNER + ":loadbalancer/app/" + r.name + "/" + hash32(r.id) + hash32(r.name); }
function lbSub(r) { return r.subnetIds.map(function (id) { return find(S.subnets, id); }).filter(Boolean); }
LISTS.albs = function () {
  return ({ key: "albs", kind: "alb", title: "Load balancers", desc: "Elastic Load Balancing automatically distributes incoming application traffic across multiple targets and virtual appliances.", crumb: "EC2 › Load Balancing › Load Balancers", create: [{ label: "Create load balancer", page: "alb-type" }],
    rows: function () { return S.albs; }, cols: [["Name", function (r) { return r.name; }], ["DNS name", function (r) { return r.dns; }], ["State", function (r) { return albPhase(r) === "active" ? okIco("Active") : okIco("Provisioning", "warn"); }], ["VPC ID", function (r) { return r.vpcId; }], ["Availability Zones", function (r) { return lbSub(r).map(function (x) { return x.az; }).filter(function (z, i, a) { return a.indexOf(z) === i; }).length + " Availability Zones"; }], ["Type", function () { return "application"; }], ["Date created", function (r) { return fmtT(r.born || t0()); }]],
    detail: function (r) { var hs = albHealth(r); return [["Load balancer type", "Application"], ["Status", albPhase(r) === "active" ? okIco("Active") : okIco("Provisioning", "warn")], ["VPC", r.vpcId], ["IP address type", "IPv4"], ["Scheme", r.scheme], ["Hosted zone", "Z1LMS91P8CMLE5"], ["Availability Zones", h("div", {}, lbSub(r).map(function (x) { return h("div", { text: x.id + " (" + azId(x.az) + ")" }); }))], ["Date created", fmtT(r.born || t0())], ["Load balancer ARN", albArn(r)], ["DNS name", r.dns + " (A Record)"],
      ["Target health (lab)", h("div", {}, hs.length ? hs.map(function (x) { return x.none ? h("div", { text: x.t.name + ": ยังไม่มี target ลงทะเบียน" }) : h("div", {}, [tagp(x.state, x.ok ? "ok" : (x.state === "unused" || x.state === "initial" ? "warn" : "bad")), " " + x.t.name + " · " + nm(x.inst) + ":" + x.port + (x.ok ? "" : "  — " + x.why)]); }) : "-")],
      ["หมายเหตุ (lab)", h("div", { cls: "hint" }, ["จำลองว่าแอปตอบ 200 ที่ health check path (lab นี้ยังไม่มีแอปจริง)", failOpen(hs) ? " · target group " + failOpen(hs) + " ไม่มี target ที่ healthy เลย ALB จะ fail open คือส่งคำขอไปทุกตัวโดยไม่สนสถานะ" : ""])]]; } });
};
PAGES["alb-type"] = function () {
  var wrap = h("div"), cards = [["Application Load Balancer", "Choose an Application Load Balancer when you need a flexible feature set for your applications with HTTP and HTTPS traffic. Operating at the request level, Application Load Balancers provide advanced routing and visibility features targeted at application architectures, including microservices and containers.", "alb-create"], ["Network Load Balancer", "Choose a Network Load Balancer when you need ultra-high performance, TLS offloading at scale, centralized certificate deployment, support for UDP, and static IP addresses for your applications. Operating at the connection level, Network Load Balancers are capable of handling millions of requests per second securely while maintaining ultra-low latencies.", ""], ["Gateway Load Balancer", "Choose a Gateway Load Balancer when you need to deploy and manage a fleet of third-party virtual appliances that support GENEVE. These appliances enable you to improve security, compliance, and policy controls.", ""]];
  wrap.appendChild(crumbEl("EC2 › Load balancers › Select load balancer type"));
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: "Compare and select load balancer type" })]));
  wrap.appendChild(h("p", { cls: "hint", text: "A complete feature-by-feature comparison along with our product details is available here." }));
  wrap.appendChild(h("div", { cls: "card" }, [h("div", { cls: "ch", text: "Load balancer types" }), h("div", { cls: "cb", style: "display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px" }, cards.map(function (c) { return h("div", { style: "display:flex;flex-direction:column;gap:10px" }, [h("h3", { style: "margin:0" }, [c[0], h("a", { href: "#", cls: "infolink", text: "Info", onclick: function (e) { e.preventDefault(); } })]), h("div", { cls: "hint", text: c[1] }), h("div", {}, [h("button", { cls: "btn", type: "button", text: "Create", disabled: !c[2], title: c[2] ? "" : "ไม่จำลอง (lab นี้ใช้ ALB)", onclick: function () { go(c[2], { from: "albs" }); } })])]); }))]));
  wrap.appendChild(h("div", { cls: "card" }, [h("div", { cls: "cb" }, ["▸ Classic Load Balancer - previous generation"])]));
  return wrap;
};
PAGES["alb-create"] = function () {
  return formPage({ name: "alb-create", crumb: "EC2 › Load balancers › Create Application Load Balancer", title: "Create Application Load Balancer", back: "albs", sectionInfo: true,
    init: function () { var d = S.vpcs.filter(function (v) { return !v.isDefault; })[0] || defaultVpc(); return { name: "", scheme: "Internet-facing", ipt: "IPv4", vpcId: d.id, subnetIds: [], sgIds: [defaultSg(d.id).id], listeners: [{ port: "80", tgId: "" }] }; },
    sections: function (V) { return [
      { t: "Basic configuration", f: [{ id: "name", type: "text", label: "Load balancer name", req: true, ph: "pharmacy-alb", desc: "Name must be unique within your AWS account and can't be changed after the load balancer is created. A maximum of 32 alphanumeric characters including hyphens are allowed, but the name must not begin or end with a hyphen." }, { id: "scheme", type: "rcards", stack: true, label: "Scheme", desc: "Scheme can't be changed after the load balancer is created.", opts: function () { return [["Internet-facing", "Internet-facing", "An internet-facing load balancer routes requests from clients over the internet to targets. Requires a public subnet."], ["Internal", "Internal", "An internal load balancer routes requests from clients to targets using private IP addresses."]]; } }, { id: "ipt", type: "rcards", stack: true, label: "Load balancer IP address type", desc: "Select the type of IP addresses that your subnets use.", opts: function () { return [["IPv4", "IPv4", "Recommended for internal load balancers."], ["Dualstack", "Dualstack", "Includes IPv4 and IPv6 addresses. (ไม่จำลอง)"]]; } }] },
      { t: "Network mapping", f: [{ id: "vpcId", type: "select", label: "VPC", desc: "The load balancer routes traffic to targets in the selected VPC. Internet-facing load balancers can only select a VPC that has an internet gateway.", opts: function (V) { return S.vpcs.filter(function (v) { return V.scheme !== "Internet-facing" || vpcIgw(v.id); }).map(function (v) { return [v.id, vname(v.id) + " · " + v.cidr]; }); }, hint: "Internet-facing เลือกได้เฉพาะ VPC ที่มี internet gateway", onchange: function (V) { V.subnetIds = []; V.sgIds = [defaultSg(V.vpcId).id]; } },
        { id: "subnetIds", type: "multi", label: "Availability Zones and subnets", opts: function (V) { return S.subnets.filter(function (s) { return s.vpcId === V.vpcId; }).map(function (s) { return [s.id, s.az + " · " + nm(s) + " · " + s.cidr]; }); }, hint: "ต้องเลือกจากอย่างน้อย 2 AZ" }] },
      { t: "Security groups", f: [{ id: "sgIds", type: "multi", label: "Security groups", opts: function (V) { return sgOpts(V.vpcId); }, hint: "ค่าเริ่มต้นจะติ๊ก default security group ของ VPC ให้ เปลี่ยนเป็นของเรา" }] },
      { t: "Listeners and routing", f: [{ type: "custom", wide: true, id: "listeners", render: function (V) {
        var tg = [["", "Select a target group"]].concat(S.tgs.filter(function (t) { return t.vpcId === V.vpcId; }).map(function (t) { return [t.id, t.name + " (" + t.port + ")"]; }));
        var box = h("div"); V.listeners.forEach(function (l, i) { var e1 = UI.form.errors["lport" + i], e2 = UI.form.errors["ltg" + i];
          box.appendChild(h("div", { cls: "row r3" }, [h("div", {}, [h("div", { cls: "hint", text: "Protocol : Port" }), h("div", { cls: "row r2", style: "grid-template-columns: 90px 1fr" }, [h("span", { text: "HTTP :" }), inp(l, "port", "80")]), e1 ? h("div", { cls: "err", text: e1 }) : null]), h("div", {}, [h("div", { cls: "hint", text: "Default action → Forward to" }), sel(l, "tgId", tg, "target group"), e2 ? h("div", { cls: "err", text: e2 }) : null]), V.listeners.length > 1 ? h("button", { cls: "btn", type: "button", text: "Remove", onclick: function () { V.listeners.splice(i, 1); render(); } }) : h("span")])); });
        box.appendChild(h("button", { cls: "btn", type: "button", text: "Add listener", onclick: function () { V.listeners.push({ port: "", tgId: "" }); render(); } })); return box; } }] }]; },
    summary: function (V) { var sg = V.sgIds.map(function (id) { return nm(find(S.sgs, id)); }), sn = V.subnetIds.map(function (id) { return find(S.subnets, id); }).filter(Boolean); return h("div", {}, [h("div", { cls: "hint", text: "Review and confirm your configurations. Estimated costs doesn't include usage-based costs, for example from LCU." }), h("h4", { text: "Basic configuration" }), h("div", { text: V.name || "-" }), h("div", { cls: "hint", text: V.scheme + " · " + V.ipt }), h("h4", { text: "Security groups" }), h("div", { cls: "hint", text: sg.join(", ") || "-" }), h("h4", { text: "Network mapping" }), h("div", { cls: "hint", text: "VPC " + vname(V.vpcId) }), h("div", { cls: "hint", text: sn.map(function (x) { return x.az + ": " + nm(x); }).join(" · ") || "-" }), h("h4", { text: "Listeners and routing" }), h("div", { cls: "hint", text: V.listeners.map(function (l) { var t = find(S.tgs, l.tgId); return "HTTP:" + (l.port || "?") + " → " + (t ? t.name : "-"); }).join(" · ") })]); },
    submit: "Create load balancer", onSubmit: function (V) { var r = API.createAlb({ name: V.name, scheme: V.scheme, vpcId: V.vpcId, subnetIds: V.subnetIds, sgIds: V.sgIds, listeners: V.listeners }); if (r.errors) return r; UI.sel.albs = r.res.id; return { msg: "สร้าง ALB แล้ว เลือกแถวเพื่อดู Target health" }; } });
};

LISTS.users = function () {
  return ({ key: "users", kind: "user", title: "Users", crumb: "IAM › Users", create: [{ label: "Create user", page: "user-create" }],
    actions: [{ label: "Add permissions / detach policies", page: "user-perm" }],
    detail: function (r) { return [["User name", r.name], ["ARN", "arn:aws:iam::000000000000:user/" + r.name], ["Permissions", r.policies.join(", ") || "ไม่มี"], ["Access keys", r.keys.length + " ชุด"]]; },
    rows: function () { return S.users; }, desc: "An IAM user is an identity with long-term credentials that is used to interact with AWS in an account.", cols: [["User name", function (r) { return r.name; }], ["Path", function () { return "/"; }], ["Group", function () { return "0"; }], ["Last activity", function () { return "-"; }], ["MFA", function () { return "-"; }], ["Password age", function () { return "-"; }], ["Console last sign-in", function () { return "-"; }], ["Access key ID", function (r) { return r.keys.map(function (k) { return (k.active ? "Active - " : "Inactive - ") + k.id; }).join(", ") || "-"; }]] });
};
LISTS.policies = function () {
  return ({ key: "policies", kind: "policy", title: "Policies", desc: "A policy is an object in AWS that defines permissions.", crumb: "IAM › Policies",
    detail: function (r) { return [["Policy name", r.name], ["Type", "AWS managed"], ["ARN", "arn:aws:iam::aws:policy/" + r.name], ["Description", r.desc]]; },
    rows: function () { return S.policies; }, cols: [["Policy name", function (r) { return r.name; }], ["Type", function () { return "AWS managed"; }], ["Used as", function (r) { var n = S.roles.filter(function (x) { return x.policies.indexOf(r.name) >= 0; }).length + S.users.filter(function (x) { return x.policies.indexOf(r.name) >= 0; }).length; return n ? "Permissions policy (" + n + ")" : "None"; }], ["Description", function (r) { return r.desc; }], ["เนื้อหา policy (lab)", function (r) { return POLICY_DEF[r.name].actions ? tagp("ตรวจกับเอกสารแล้ว", "ok") : tagp("ยังไม่ได้ตรวจ", "warn"); }]] });
};
LISTS.eips = function () {
  return ({ key: "eips", kind: "eip", title: "Elastic IP addresses", crumb: "EC2 › Elastic IPs", create: [{ label: "Allocate Elastic IP address", page: "eip-alloc" }],
    actions: [{ label: "Associate Elastic IP address", page: "eip-assoc", when: function (r) { return !r.instId; } }, { label: "Disassociate Elastic IP address", run: function (r) { return API.disassocEip(r.id); }, msg: "Disassociate แล้ว เครื่องได้ public IP อัตโนมัติตัวใหม่ (ถ้าซอยตั้งไว้)", when: function (r) { return !!r.instId; } }, { label: "Release Elastic IP addresses", page: "del", kind: "eip" }],
    detail: function (r) { return [["Allocated IPv4 address", r.ip], ["Type", "Public IP"], ["Allocation ID", r.id], ["Associated instance ID", r.instId || "-"], ["Private IP address", (r.instId && (find(S.insts, r.instId) || {}).privateIp) || "-"], ["ค่าใช้จ่าย (lab)", "คิดเงินทั้งตอนผูกและตอนว่าง"]]; },
    rows: function () { return S.eips; }, cols: [["Name", function () { return "-"; }], ["Allocated IPv4 address", function (r) { return r.ip; }], ["Type", function () { return "Public IP"; }], ["Allocation ID", function (r) { return r.id; }], ["Reverse DNS record", function () { return "-"; }], ["Associated instance ID", function (r) { return r.instId || "-"; }], ["Private IP address", function (r) { var i = r.instId && find(S.insts, r.instId); return i ? i.privateIp : "-"; }], ["Association ID", function (r) { return r.instId ? "eipassoc-0" + hash32(r.id) + hash32(r.instId).slice(0, 8) : "-"; }], ["Network interface ID", function (r) { return r.instId ? eniOf(r.instId) : "-"; }]] });
};
function itArch(t) { var f = t.split(".")[0]; return /^(a1|mac2)/.test(f) || /^[a-z]+\d+[a-z]*g[a-z]*$/.test(f) && !/^g\d/.test(f) ? "arm64" : "x86_64"; }
function itNet(n) { var m = /^(Up to )?(\d+(?:\.\d+)?) Megabit$/.exec(n); return m ? (m[1] || "") + (+m[2] / 1000) + " Gigabit" : n; }
LISTS.itypes = function () {
  return ({ key: "itypes", title: "Instance types", desc: "ราคา/สเปกจากข้อมูลราคา On-Demand ของ AWS (Singapore, Linux) ทั้ง " + ITYPE_ALL.length + " ตัว · launch ใน lab นี้ได้เฉพาะ 8 ตัวที่มีใน wizard", crumb: "EC2 › Instance Types", empty: "-",
    rows: function () { return ITYPE_ALL.map(function (x) { return { id: x[0], name: x[0], x: x }; }); },
    cols: [["Instance type", function (r) { return r.name; }], ["On-Demand Linux base pricing", function (r) { return r.x[5].toFixed(4) + " USD per Hour"; }], ["vCPUs", function (r) { return String(r.x[1]); }], ["Architecture", function (r) { return itArch(r.name); }], ["Memory (GiB)", function (r) { return String(r.x[2]); }], ["Storage", function (r) { return r.x[3]; }], ["Network performance", function (r) { return itNet(r.x[4]); }], ["Free tier eligible (บัญชีหลัง 15 ก.ค. 2025)", function (r) { return FREE.indexOf(r.name) >= 0 ? tagp("Yes", "ok") : tagp("No", "warn"); }]] });
};
LISTS.volumes = function () {
  return ({ key: "volumes", title: "Volumes", crumb: "EC2 › Volumes", empty: "ยังไม่มี volume (root volume ของเครื่องจะโผล่ที่นี่)",
    rows: function () { return liveInsts().map(function (i) { return { id: i.volId, name: i.volId, inst: i }; }); },
    cols: [["Volume ID", function (r) { return r.id; }], ["Size", function (r) { return r.inst.disk.size + " GiB"; }], ["Type", function (r) { return r.inst.disk.type; }], ["Volume state", function () { return tagp("In-use", "ok"); }], ["Attached instance", function (r) { return nm(r.inst) + " (" + r.inst.state + ")"; }], ["Availability Zone", function (r) { return r.inst.az; }]] });
};
Object.keys(LISTS).forEach(function (k) { PAGES[k] = function () { return listPage(LISTS[k]()); }; });
function tilesPage(crumb, title, tiles, buttons) {
  var wrap = h("div"); wrap.appendChild(crumbEl(crumb));
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: title }), h("div", { cls: "sp" }, buttons.map(function (b) { return h("button", { cls: "btn pri", type: "button", text: b[0], onclick: function () { go(b[1], { from: b[2] }); } }); }))]));
  wrap.appendChild(h("div", { cls: "card" }, [h("div", { cls: "ch", text: "Resources (Asia Pacific (Singapore))" }), h("div", { cls: "cb" }, [h("div", { cls: "tiles" }, tiles.map(function (t) { return h("button", { cls: "tile", type: "button", onclick: function () { go(t[2]); } }, [h("b", { text: String(t[1]) }), h("span", { text: t[0] })]); }))])]));
  return wrap;
}
PAGES["vpc-dash"] = function () { return tilesPage("VPC › VPC dashboard", "VPC dashboard", [["VPCs", S.vpcs.length, "vpcs"], ["Subnets", S.subnets.length, "subnets"], ["Route tables", S.rtbs.length, "rtbs"], ["Internet gateways", S.igws.length, "igws"], ["Security groups", S.sgs.length, "sgs"]], [["Create VPC", "vpc-create", "vpcs"]]); };
PAGES["ec2-dash"] = function () {
  var w = tilesPage("EC2 › Dashboard", "Dashboard", [["Instances (running)", liveInsts().filter(function (i) { return i.state === "running"; }).length, "insts"], ["Key pairs", S.keys.length, "keys"], ["Security groups", S.sgs.length, "sgs"], ["Load balancers", S.albs.length, "albs"], ["Target groups", S.tgs.length, "tgs"]], []);
  var dv = S.vpcs.filter(function (v) { return v.isDefault; })[0];
  var cards = h("div", { cls: "awscards", style: "margin-bottom:14px" }, [
    h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("h3", {}, ["Launch instance"]), h("p", { cls: "sub", text: "To get started, launch an Amazon EC2 instance, which is a virtual server in the cloud." }), h("div", { style: "display:flex;gap:8px" }, [h("button", { cls: "btn pri", type: "button", text: "Launch instance ▾", onclick: function () { go("launch", {}, "EC2"); } })]), h("p", { cls: "sub", style: "margin-top:12px", text: "Note: Your instances will launch in the Asia Pacific (Singapore) Region" })])]),
    h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("h3", {}, ["Service health"]), h("div", {}, [h("button", { cls: "btn", type: "button" }, ["AWS Health Dashboard ", icoEl("ext", 14)])]), h("div", { cls: "sub", style: "margin-top:10px", text: "Region" }), h("div", { text: "Asia Pacific (Singapore)" }), h("div", { cls: "sub", style: "margin-top:8px", text: "Status" }), h("div", { style: "color:#1d8102;display:flex;gap:6px;align-items:center" }, [icoEl("check", 15), "This service is operating normally."])])]),
    h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("h3", {}, ["Account attributes"]), h("div", { cls: "sub", text: "Default VPC" }), h("div", {}, [h("a", { href: "#", text: dv ? dv.id : "-", onclick: function (e) { e.preventDefault(); go("vpcs", {}, "VPC"); } })]), h("div", { cls: "sub", style: "margin-top:8px", text: "Settings" }), h("div", {}, ["Data protection and security", h("br"), "Allowed AMIs", h("br"), "Zones", h("br"), "EC2 Serial Console", h("br"), "Default credit specification", h("br"), "EC2 console preferences"].map(function (x) { return typeof x === "string" ? h("a", { href: "#", style: "display:block;text-decoration:none", text: x, onclick: function (e) { e.preventDefault(); } }) : null; }).filter(Boolean))])])]);
  w.insertBefore(cards, w.children[2]); return w;
};

function principalOpts() {
  return liveInsts().filter(function (i) { return i.state === "running"; }).map(function (i) { return ["inst:" + i.id, "เครื่อง " + (i.name || i.id) + (i.profile ? "  (role: " + i.profile + ")" : "  (ไม่มี role)")]; }).concat(S.users.map(function (u) { return ["user:" + u.id, "IAM user " + u.name + " (aws configure บนเครื่องเรา)"]; }));
}
PAGES["ecr-cmds"] = function () {
  var r = find(S.repos, UI.params.id), reg = r.uri.split("/")[0], wrap = h("div");
  wrap.appendChild(crumbEl("ECR › Private repositories › " + r.name + " › Push commands"));
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: "Push commands for " + r.name }), h("div", { cls: "sp" }, [h("button", { cls: "btn", type: "button", text: "Close", onclick: function () { go("repos"); } })])]));
  wrap.appendChild(h("div", { cls: "card" }, [h("div", { cls: "cb" }, [
    h("p", { text: "ต้องมี AWS CLI และ Docker ติดตั้งแล้ว และ IAM principal ที่มีสิทธิ์ push (เช่น AmazonEC2ContainerRegistryPowerUser)" }),
    h("h4", { text: "1. Authenticate Docker to your registry (token อายุ 12 ชั่วโมง)" }), h("pre", { cls: "term", text: "aws ecr get-login-password --region " + REGION + " | docker login --username AWS --password-stdin " + reg }),
    h("h4", { text: "2. Build your Docker image" }), h("pre", { cls: "term", text: "docker build -t " + r.name + " ." }),
    h("h4", { text: "3. Tag your image" }), h("pre", { cls: "term", text: "docker tag " + r.name + ":latest " + r.uri + ":latest" }),
    h("h4", { text: "4. Push the image" }), h("pre", { cls: "term", text: "docker push " + r.uri + ":latest" }),
    h("p", { cls: "hint", text: "ใน lab นี้ Jenkins ทำขั้น 1, 2, 4 ให้ใน Jenkinsfile (stages 'Build image' และ 'Push image') ด้วย $ECR_REGISTRY จาก /opt/jenkins/.env" })])]));
  return wrap;
};
PAGES["ecr-run"] = function () {
  var r = find(S.repos, UI.params.id), wrap = h("div");
  if (!UI.run || UI.run.repo !== r.id) UI.run = { repo: r.id, who: "", op: "push", tag: "v1.0.0", aged: false, res: null };
  var R = UI.run, opts = principalOpts(); if (!R.who && opts.length) R.who = opts[0][0];
  wrap.appendChild(crumbEl("ECR › Private repositories › " + r.name + " › Docker push / pull (จำลอง)"));
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: "Docker push / pull · " + r.name }), h("div", { cls: "sp" }, [h("button", { cls: "btn", type: "button", text: "กลับ", onclick: function () { go("repos"); } })])]));
  var card = h("div", { cls: "card" }), cb = h("div", { cls: "cb" });
  cb.appendChild(h("div", { cls: "f" }, [h("label", { cls: "l", text: "รันจาก (ใครถือ credentials)" }), sel(R, "who", opts.length ? opts : [["", "ไม่มีเครื่องที่รันอยู่และไม่มี IAM user"]], "who")]));
  cb.appendChild(h("div", { cls: "f" }, [h("label", { cls: "l", text: "การกระทำ" }), sel(R, "op", [["push", "docker push"], ["pull", "docker pull"]], "op")]));
  cb.appendChild(h("div", { cls: "f" }, [h("label", { cls: "l", text: "Image tag" }), inp(R, "tag", "v1.0.0")]));
  cb.appendChild(h("label", { cls: "opt" }, [h("input", { type: "checkbox", checked: R.aged, onchange: function (e) { R.aged = e.target.checked; render(); } }), h("span", { text: "จำลองว่าผ่านไป 13 ชั่วโมงหลัง docker login (token อายุ 12 ชั่วโมง)" })]));
  cb.appendChild(h("div", { cls: "actions" }, [h("button", { cls: "btn pri", type: "button", text: "Run", onclick: function () { var w = R.who.split(":"); var x = API.ecrAction({ repoId: r.id, principal: { type: w[0], id: w.slice(1).join(":") }, op: R.op, tag: R.tag, aged: R.aged }); R.res = x.errors ? { ok: false, out: Object.keys(x.errors).map(function (k) { return x.errors[k]; }).join(" · "), steps: [] } : x.res; render(); } })]));
  if (R.res) {
    cb.appendChild(h("pre", { cls: "term", text: R.res.out }));
    cb.appendChild(h("div", { cls: "steps" }, R.res.steps.map(function (st) { return h("div", {}, [h("b", { text: st.ok ? "✓" : "✗", style: "color:var(--" + (st.ok ? "ok" : "bad") + ")" }), h("span", {}, [h("b", { text: st.t }), h("div", { cls: "hint", text: st.d })])]); })));
  }
  card.appendChild(cb); wrap.appendChild(card);
  wrap.appendChild(h("p", { cls: "hint", text: "ข้อความ error เลียนจากรูปแบบจริงของ AWS CLI และ Docker (ยังไม่ยืนยันเป๊ะ) สิทธิ์ที่ต้องใช้และอายุ token 12 ชั่วโมงตรงเอกสาร ECR" }));
  return wrap;
};
PAGES["role-perm"] = function () {
  var r = find(S.roles, UI.params.id);
  return formPage({ name: "role-perm-" + r.id, crumb: "IAM › Roles › " + r.name + " › Add permissions", title: "Add permissions · " + r.name, back: "roles", init: function () { return { pol: r.policies.slice() }; },
    sections: function () { return [{ t: "Permissions policies", f: [{ id: "pol", type: "multi", opts: function () { return POLICIES.map(function (p) { return [p, p + (POLICY_DEF[p].actions ? "" : "  (ยังไม่ได้ตรวจเนื้อหา)")]; }); }, hint: "ติ๊ก = แนบกับ role ไม่ติ๊ก = ถอด policy ออก ผลมีกับทุกเครื่องที่ใช้ role นี้" }] }]; },
    submit: "Save", onSubmit: function (V) { var x = API.setRolePolicies(r.id, V.pol); return x.errors ? x : { msg: "บันทึกแล้ว" }; } });
};
PAGES["user-perm"] = function () {
  var u = find(S.users, UI.params.id);
  return formPage({ name: "user-perm-" + u.id, crumb: "IAM › Users › " + u.name + " › Add permissions", title: "Add permissions · " + u.name, back: "users", init: function () { return { pol: u.policies.slice() }; },
    sections: function () { return [{ t: "Permissions policies", f: [{ id: "pol", type: "multi", opts: function () { return POLICIES.map(function (p) { return [p, p]; }); } }] }]; },
    submit: "Save", onSubmit: function (V) { var x = API.setUserPolicies(u.id, V.pol); return x.errors ? x : { msg: "บันทึกแล้ว" }; } });
};
PAGES["user-create"] = function () {
  return formPage({ name: "user-create", crumb: "IAM › Users › Create user", title: "Create user", back: "users", steps: 3,
    init: function () { return { name: "", pol: ["AdministratorAccess"], permMode: "attach" }; },
    sections: function (V) { return [
      { step: 0, t: "Step 1: Specify user details", ct: "User details", f: [{ id: "name", type: "text", label: "User name", req: true, ph: "terraform-admin", desc: "The user name can have up to 64 characters. Valid characters: A-Z, a-z, 0-9, and + = , . @ _ - (hyphen)" },
        { type: "custom", id: "console", render: function () { return h("div", {}, [h("label", { cls: "opt" }, [h("input", { type: "checkbox", disabled: true }), h("span", {}, ["Provide user access to the AWS Management Console - optional", h("small", { text: "If you're providing console access to a person, it's a best practice to manage their access in IAM Identity Center. (ไม่จำลอง)" })])]), h("div", { cls: "alert info", style: "margin-top:10px", text: "ⓘ If you are creating programmatic access through access keys or service-specific credentials for AWS CodeCommit or Amazon Keyspaces, you can generate them after you create this IAM user. Learn more" })]); } }] },
      { step: 1, t: "Step 2: Set permissions", ct: "Permissions options", f: [{ id: "permMode", type: "rcards", opts: function () { return [["group", "Add user to group", "Add user to an existing group, or create a new one. We recommend using groups to manage user permissions by job function."], ["copy", "Copy permissions", "Copy all group memberships, attached managed policies, and inline policies from an existing user."], ["attach", "Attach policies directly", "Attach a managed policy directly to a user. As a best practice, we recommend attaching policies to a group instead. Then, add the user to the appropriate group."]]; }, onchange: function (V) { V.permMode = "attach"; } }] },
      { step: 1, t: "Step 2: Set permissions", ct: "Permissions policies (" + V.pol.length + "/1204)", f: [{ id: "pol", type: "multi", opts: function () { return POLICIES.map(function (p) { return [p, p]; }); }, hint: "รัน terraform apply ของ lab นี้ต้องมีสิทธิ์สร้าง VPC, EC2, IAM, ECR, ELB จึงใช้ AdministratorAccess เฉพาะบัญชีฝึกนี้" }] },
      { step: 2, t: "Step 3: Review and create", ct: "User details", f: [{ type: "custom", id: "rv", render: function (V) { return kvDom([["User name", V.name || "-"], ["Console password type", "None"], ["Require password reset", "No"]]); } }] },
      { step: 2, t: "Step 3: Review and create", ct: "Permissions summary", f: [{ type: "custom", id: "rv2", render: function (V) { return tbl(["Name", "Type", "Used as"], V.pol.map(function (p) { return [p, "AWS managed", "Permissions policy"]; }), "ไม่มี permissions"); } }] }]; },
    submit: "Create user", onSubmit: function (V) { var x = API.createUser({ name: V.name, policies: V.pol }); if (x.errors) { UI.form.step = 0; return x; } UI.sel.users = x.res.id; return { msg: "User created successfully: " + V.name + " (ไปที่ Security credentials เพื่อสร้าง access key)", next: "detail", nextParams: { kind: "user", id: x.res.id, from: "users", tab: "sec" } }; } });
};
PAGES["ak-create"] = function () {
  var u = find(S.users, UI.params.id);
  var USE = [["Command Line Interface (CLI)", "You plan to use this access key to enable the AWS CLI to access your AWS account."], ["Local code", "You plan to use this access key to enable application code in a local development environment to access your AWS account."], ["Application running on an AWS compute service", "You plan to use this access key to enable application code running on an AWS compute service like Amazon EC2, Amazon ECS, or AWS Lambda to access your AWS account."], ["Third-party service", "You plan to use this access key to enable access for a third-party application or service that monitors or manages your AWS resources."], ["Application running outside AWS", "You plan to use this access key to authenticate workloads running in your data center or other infrastructure outside of AWS that needs to access your AWS resources."], ["Other", "Your use case is not listed here."]];
  return formPage({ name: "ak-create-" + u.id, crumb: "IAM › Users › " + u.name + " › Create access key", title: "Create access key", back: "users", steps: 2,
    init: function () { return { use: "Command Line Interface (CLI)", ack: false, desc: "" }; },
    sections: function (V) { return [
      { step: 0, t: "Step 1: Access key best practices & alternatives", ct: "Use case", f: [{ id: "use", type: "rcards", stack: true, opts: function () { return USE.map(function (x) { return [x[0], x[0], x[1]]; }); } },
        { type: "custom", id: "bp", render: function (V) { return V.use === "Command Line Interface (CLI)" ? h("div", {}, [h("div", { cls: "alert warn" }, [h("b", { text: "Alternative recommended" }), h("ul", {}, [h("li", { text: "Use AWS CloudShell, a browser-based CLI, to run commands directly from the AWS Management Console." }), h("li", { text: "Use the AWS CLI V2 and enable authentication through a user in IAM Identity Center." })])]), h("label", { cls: "opt" }, [h("input", { type: "checkbox", checked: !!V.ack, onchange: function (e) { V.ack = e.target.checked; } }), h("span", { text: "I understand the above recommendation and want to proceed to create an access key." })])]) : h("div", { cls: "alert info" }, [h("b", { text: "It's okay to use an access key for this use case, but follow the best practices:" }), h("ul", {}, ["Never store your access key in plain text, in a code repository, or in code.", "Disable or delete access keys when no longer needed.", "Enable least-privilege permissions.", "Rotate access keys regularly."].map(function (x) { return h("li", { text: x }); }))]); } }] },
      { step: 1, t: "Step 2: Set description tag - optional", ct: "Description tag", f: [{ id: "desc", type: "text", label: "Description tag value", desc: "Describe the purpose of this access key and where it will be used. A good description will help you rotate this access key confidently later.", ph: "aws configure บนเครื่องเรา" }] }]; },
    submit: "Create access key", onSubmit: function (V) {
      if (V.use === "Command Line Interface (CLI)" && !V.ack) { UI.form.step = 0; return E("ack", "ต้องติ๊กยืนยันก่อนไปต่อ"); }
      var x = API.createAccessKey(u.id, V.use, V.desc); if (x.errors) return x;
      UI.secrets = UI.secrets || {}; UI.secrets[x.res.id] = x.secret; return { msg: "Access key created", next: "ak-retrieve", nextParams: { id: u.id, key: x.res.id } }; } });
};
PAGES["ak-retrieve"] = function () {
  var u = find(S.users, UI.params.id), k = u && u.keys.filter(function (x) { return x.id === UI.params.key; })[0], sec = (UI.secrets || {})[UI.params.key], wrap = h("div");
  wrap.appendChild(crumbEl("IAM › Users › " + (u ? u.name : "-") + " › Retrieve access keys"));
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: "Retrieve access keys" })]));
  if (!k) { wrap.appendChild(h("p", { text: "ไม่พบ access key" })); return wrap; }
  var card = h("div", { cls: "card" }), cb = h("div", { cls: "cb" }), shown = !!UI.showSecret;
  cb.appendChild(h("div", { cls: "alert warn", text: "นี่เป็นโอกาสเดียวที่จะบันทึก secret access key (หลังกด Done จะดูอีกไม่ได้ ต้องสร้างชุดใหม่) ค่าด้านล่างเป็นของปลอมสำหรับจำลอง ใช้กับ AWS จริงไม่ได้" }));
  cb.appendChild(kvDom([["Access key", k.id], ["Secret access key", sec ? (shown ? sec : "******************") : "(หมดโอกาสดูแล้ว)"]]));
  cb.appendChild(h("div", { cls: "actions" }, [h("button", { cls: "btn", type: "button", text: shown ? "Hide" : "Show", disabled: !sec, onclick: function () { UI.showSecret = !UI.showSecret; render(); } }), h("button", { cls: "btn pri", type: "button", text: "Done", onclick: function () { delete UI.secrets[k.id]; UI.showSecret = false; go("detail", { kind: "user", id: u.id, from: "users", tab: "sec" }); } })]));
  cb.appendChild(h("p", { cls: "hint", text: "ต่อไป: aws configure → ใส่ Access key ID, Secret access key, region ap-southeast-1, output json แล้วรัน terraform init/plan/apply (ปุ่ม Download .csv file มีใน console จริง หน้านี้ไม่จำลอง)" }));
  card.appendChild(cb); wrap.appendChild(card); return wrap;
};
PAGES["eip-alloc"] = function () {
  return formPage({ name: "eip-alloc", crumb: "EC2 › Elastic IPs › Allocate Elastic IP address", title: "Allocate Elastic IP address", back: "eips", info: "เอกสาร: Elastic IP คิดค่าใช้จ่ายทั้งตอนผูกกับเครื่องและตอนว่าง",
    init: function () { return { pool: "Amazon's pool of IPv4 addresses" }; },
    sections: function () { return [{ t: "Elastic IP address settings", f: [{ id: "bg", type: "text", label: "Network border group", hint: ".", ph: REGION }, { id: "pool", type: "radio", label: "Public IPv4 address pool", opts: function () { return [["Amazon's pool of IPv4 addresses", "Amazon's pool of IPv4 addresses"], ["byoip", "Public IPv4 address that you bring to your AWS account", "ไม่จำลอง"]]; } }] }]; },
    submit: "Allocate", onSubmit: function () { var x = API.allocEip(); UI.sel.eips = x.res.id; return { msg: "Allocate แล้ว ได้ " + x.res.ip + " (ยังไม่ผูกกับเครื่อง และคิดค่าใช้จ่ายอยู่)" }; } });
};
PAGES["eip-assoc"] = function () {
  var e = find(S.eips, UI.params.id);
  return formPage({ name: "eip-assoc-" + e.id, crumb: "EC2 › Elastic IPs › Associate Elastic IP address", title: "Associate Elastic IP address (" + e.ip + ")", back: "eips", info: "ต้องให้เครื่องอยู่ใน public subnet (มีเส้นทางไป internet gateway) ถึงจะติดต่อเน็ตด้วย IP นี้ได้ และ public IP อัตโนมัติเดิมของเครื่องจะถูกคืน",
    init: function () { return { inst: "" }; },
    sections: function () { return [{ t: "", f: [{ id: "res", type: "radio", label: "Resource type", opts: function () { return [["Instance", "Instance"], ["Network interface", "Network interface", "ไม่จำลอง"]]; } }, { id: "inst", type: "select", label: "Instance", opts: function () { return [["", "Choose an instance"]].concat(liveInsts().map(function (i) { return [i.id, nm(i) + " · " + i.state + " · " + (i.publicIp || "no public IP")]; })); } }] }]; },
    submit: "Associate", onSubmit: function (V) { var x = API.assocEip(e.id, V.inst); return x.errors ? x : { msg: "Associate แล้ว IP นี้อยู่กับเครื่องตลอด แม้ stop/start" }; } });
};
PAGES["inst-type"] = function () {
  var i = find(S.insts, UI.params.id);
  return formPage({ name: "inst-type-" + i.id, crumb: "EC2 › Instances › " + nm(i) + " › Change instance type", title: "Change instance type", back: "insts", info: i.state === "stopped" ? null : "เครื่องต้อง stopped ก่อน (Instance state → Stop instance) เมนูนี้ใน console จะเป็นสีเทาถ้าเครื่องไม่ stopped",
    init: function () { return { type: i.type }; },
    sections: function () { return [{ t: "", f: [{ id: "type", type: "select", label: "Instance type", opts: function () { return ITYPES.map(function (t) { return [t, t + (FREE.indexOf(t) >= 0 ? "   Free tier eligible" : "")]; }); } }] }]; },
    submit: "Change", onSubmit: function (V) { var x = API.changeType(i.id, V.type); return x.errors ? x : { msg: "เปลี่ยนเป็น " + V.type + " แล้ว กด Start instance เพื่อเปิดเครื่อง (เครื่องที่ไม่มี Elastic IP จะได้ public IP ใหม่)" }; } });
};
PAGES["inst-role"] = function () {
  var i = find(S.insts, UI.params.id);
  return formPage({ name: "inst-role-" + i.id, crumb: "EC2 › Instances › " + nm(i) + " › Modify IAM role", title: "Modify IAM role", back: "insts", info: "เครื่องหนึ่งมีได้ 1 role · attach ได้ทั้งตอน running และ stopped · replace ต้อง running · ถอดต้องพิมพ์ Detach",
    init: function () { return { profile: i.profile, confirm: "" }; },
    sections: function (V) { return [{ t: "", f: [{ id: "profile", type: "select", label: "IAM role", opts: function () { return [["", "No IAM Role"]].concat(S.roles.map(function (r) { return [r.profile, r.profile]; })); } }, { id: "confirm", type: "text", label: "พิมพ์ Detach เพื่อยืนยัน", show: function (V) { return !V.profile && !!i.profile; } }] }]; },
    submit: "Update IAM role", onSubmit: function (V) { var x = API.setInstanceRole(i.id, V.profile, V.confirm); return x.errors ? x : { msg: "อัปเดต role แล้ว (Session Manager และการ push/pull ECR จะเปลี่ยนตาม)" }; } });
};

PAGES.del = function () {
  var kind = UI.params.kind, id = UI.params.id, plan = delPlan(kind, id), back = UI.params.from || NAVHOME[UI.svc];
  if (!plan) return h("p", { text: "ไม่พบรายการ" });
  return formPage({ name: "del-" + kind + "-" + id, crumb: plan.crumb, title: plan.title, back: back, info: plan.blockers.length ? null : plan.note,
    init: function () { return { confirm: "" }; },
    sections: function () {
      var f = [];
      if (plan.blockers.length) f.push({ type: "custom", id: "bl", render: function () { return h("div", { cls: "alert bad" }, [h("b", { text: "ทำไม่ได้ ต้องจัดการสิ่งเหล่านี้ก่อน" }), h("ul", {}, plan.blockers.map(function (b) { return h("li", { text: b }); }))]); } });
      else {
        if (plan.removes.length) f.push({ type: "custom", id: "rm", render: function () { return h("div", {}, [h("div", { cls: "hint", text: "จะถูกลบพร้อมกัน:" }), h("ul", {}, plan.removes.map(function (b) { return h("li", { text: b }); }))]); } });
        if (plan.word) f.push({ id: "confirm", type: "text", label: "พิมพ์ " + plan.word + " เพื่อยืนยัน", ph: plan.word });
      }
      return [{ t: "", f: f }];
    },
    submit: plan.blockers.length ? "ปิด" : plan.button,
    onSubmit: function (V) { if (plan.blockers.length) return { msg: "ยังไม่ได้เปลี่ยนอะไร", next: back }; var r = API.del(kind, id, V.confirm); return r.errors ? r : { msg: plan.done }; } });
};

// ---- Laptop: terminal + files
var TERM = { lines: ["Console Lab terminal (จำลอง) พิมพ์ help ดูคำสั่ง", "ลองตามลำดับ: aws configure → cd ~/Desktop/work/pharmacy-aws-lab/terraform → terraform init → terraform apply → cd ../ansible → ansible-inventory --graph → ansible-playbook site.yml", ""], hist: [], hi: 0, ask: null };
function termPrompt() { var ri = rmInst(); if (ri) return rmPrompt(ri); return "swd@laptop:" + S.laptop.cwd.replace(HOME, "~") + "$ "; }
function termRun(raw) {
  if (TERM.busy) return;
  var r;
  if (TERM.ask) { var a = TERM.ask; TERM.ask = null; TERM.lines.push(a.label + (a.secret ? "" : raw)); r = a.done(raw); }
  else { TERM.lines.push(termPrompt() + raw); if (raw.trim()) TERM.hist.push(raw); TERM.hi = TERM.hist.length; r = shRun(raw); }
  if (r.clear) TERM.lines = [];
  var out = []; r.lines.forEach(function (l) { out.push.apply(out, String(l).split("\n")); });
  function finish() {
    TERM.busy = null; if (r.ask) TERM.ask = r.ask;
    if (r.edit) { UI.edit = r.edit; UI.editDraft = null; go("files", {}, "Laptop"); return; }
    save(); termDraw();
  }
  if (S.speed !== "real" || out.length < 2) { TERM.lines.push.apply(TERM.lines, out); finish(); return; }
  var plan = timingPlan(out), i = 0, timer = null;
  TERM.busy = { skip: function () { clearTimeout(timer); TERM.lines.push.apply(TERM.lines, out.slice(i)); finish(); } };
  (function step() {
    if (i >= out.length) { finish(); return; }
    timer = setTimeout(function () { TERM.lines.push(out[i]); i++; termDraw(); step(); }, plan[i]);
  })();
  termDraw();
}
// ---- ธีม + ไฮไลต์สีของ Terminal (laptop/VM)
var TERM_THEMES = {
  navy: ["เข้ม (ค่าเริ่มต้น)", { bg: "#0b1118", fg: "#d9e4ef", user: "#8fd18f", path: "#7aa7ff", cmd: "#ffffff", err: "#ff6b6b", ok: "#7ee787", warn: "#f2cc60", dim: "#7d8896", head: "#79c0ff" }],
  ubuntu: ["Ubuntu", { bg: "#300a24", fg: "#eeeeec", user: "#8ae234", path: "#729fcf", cmd: "#ffffff", err: "#ef2929", ok: "#8ae234", warn: "#fce94f", dim: "#ad7fa8", head: "#34e2e2" }],
  dracula: ["Dracula", { bg: "#282a36", fg: "#f8f8f2", user: "#50fa7b", path: "#bd93f9", cmd: "#ffffff", err: "#ff5555", ok: "#50fa7b", warn: "#f1fa8c", dim: "#6272a4", head: "#8be9fd" }],
  solar: ["Solarized Dark", { bg: "#002b36", fg: "#93a1a1", user: "#859900", path: "#268bd2", cmd: "#eee8d5", err: "#dc322f", ok: "#859900", warn: "#b58900", dim: "#586e75", head: "#2aa198" }],
  monokai: ["Monokai", { bg: "#272822", fg: "#f8f8f2", user: "#a6e22e", path: "#66d9ef", cmd: "#ffffff", err: "#f92672", ok: "#a6e22e", warn: "#e6db74", dim: "#75715e", head: "#ae81ff" }],
  matrix: ["Matrix (เขียวบนดำ)", { bg: "#000000", fg: "#33ff66", user: "#00ff41", path: "#00cc33", cmd: "#b6ffc8", err: "#ff3b3b", ok: "#00ff41", warn: "#ccff33", dim: "#1a8f3a", head: "#66ffcc" }],
  light: ["สว่าง (Light)", { bg: "#fbfbfb", fg: "#24292f", user: "#1a7f37", path: "#0969da", cmd: "#000000", err: "#cf222e", ok: "#1a7f37", warn: "#9a6700", dim: "#6e7781", head: "#0550ae" }]
};
function termPref(k, d) { try { return localStorage.getItem("console-lab-term-" + k) || d; } catch (e) { return d; } }
function termSet(k, v) { try { localStorage.setItem("console-lab-term-" + k, v); } catch (e) {} }
function termApplyTheme() {
  var w = document.getElementById("termwrap"); if (!w) return; var t = (TERM_THEMES[termPref("theme", "navy")] || TERM_THEMES.navy)[1], fs = { s: ".74rem", m: ".84rem", l: ".98rem", xl: "1.12rem" }[termPref("size", "m")] || ".84rem";
  Object.keys(t).forEach(function (k) { w.style.setProperty("--t-" + (k === "user" ? "user" : k === "path" ? "path" : k === "cmd" ? "cmd" : k === "err" ? "err" : k === "ok" ? "ok" : k === "warn" ? "warn" : k === "dim" ? "dim" : k === "head" ? "head" : k), t[k]); });
  w.style.setProperty("--t-bg", t.bg); w.style.setProperty("--t-fg", t.fg); w.style.setProperty("--t-fs", fs);
}
function escH(x) { return String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function termHtml(ln) {
  var m = /^([A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+):([^$#]*)([$#]) ?(.*)$/.exec(ln);
  if (m) { var cm = /^(\S+)(.*)$/.exec(m[4]); return '<span class="tu">' + escH(m[1]) + '</span>:<span class="tp">' + escH(m[2]) + "</span>" + escH(m[3]) + " " + (cm ? '<span class="tc">' + escH(cm[1]) + "</span>" + escH(cm[2]) : ""); }
  var e = escH(ln);
  if (/^\s*$/.test(ln)) return e;
  if (/^(PLAY|TASK) \[|^PLAY RECAP|^Terraform will perform|^Apply complete|^Plan:|^Outputs:|^Initializing|^Terraform has been successfully/.test(ln)) return /^Apply complete|successfully/.test(ln) ? '<span class="to"><b>' + e + "</b></span>" : /^Plan:/.test(ln) ? '<span class="tw"><b>' + e + "</b></span>" : '<span class="th">' + e + "</span>";
  if (/\bfatal:|FAILED|UNREACHABLE|^Error:|^│ Error|\bError\b|denied|not found|No such file|refused|timed out|Permission denied|failed=[1-9]|unreachable=[1-9]|✗/i.test(ln)) return '<span class="te">' + e + "</span>";
  if (/^(ok|changed|skipping|failed|fatal):|ok=\d+|Creation complete|Destruction complete|SUCCESS|Finished: SUCCESS|\bhealthy\b|✓|Welcome to|Reading state|^\s*\+ /.test(ln)) return /^changed:|^\s*~ /.test(ln) ? '<span class="tw">' + e + "</span>" : '<span class="to">' + e + "</span>";
  if (/^changed:|^\s*~ |Still creating|Still destroying|Warning|WARN|UNSTABLE/.test(ln)) return '<span class="tw">' + e + "</span>";
  if (/^\s*- |Destroying\.\.\.|will be destroyed/.test(ln)) return '<span class="te">' + e + "</span>";
  if (/^\s*#|^Console Lab|^ลอง|^\(/.test(ln)) return '<span class="td">' + e + "</span>";
  return e;
}
function termDraw() {
  var out = document.getElementById("termout"), lab = document.getElementById("termlab"), inp = document.getElementById("terminp"); if (!out) return;
  out.innerHTML = TERM.lines.map(termHtml).join("\n"); out.scrollTop = out.scrollHeight; termApplyTheme();
  var sk = document.getElementById("termskip"); if (sk) sk.hidden = !TERM.busy;
  var pl = TERM.busy ? "(กำลังรัน...) " : TERM.ask ? TERM.ask.label : termPrompt(), pm = !TERM.busy && !TERM.ask && /^([^:]+@[^:]+):([^$#]*)([$#] ?)$/.exec(pl); if (pm) lab.innerHTML = escH(pm[1]) + ':<span class="tp">' + escH(pm[2]) + "</span>" + escH(pm[3]); else lab.textContent = pl; inp.type = TERM.ask && TERM.ask.secret ? "password" : "text"; inp.focus();
}
// รันคำสั่งใน Terminal แทนผู้ใช้ (แสดง prompt + คำสั่ง + ผลลัพธ์ใน Terminal ให้เห็นเหมือนพิมพ์เอง)
function termExec(c) { TERM.lines.push(termPrompt() + c); var r = shRun(c); (r.lines || []).forEach(function (l) { String(l).split("\n").forEach(function (x) { TERM.lines.push(x); }); }); }
function readyPanel() {
  if (!S.ready) return null;
  var st = readyState(), u = S.ready.user, ip = function (n) { return (S.insts.filter(function (i) { return i.name === n; })[0] || {}).publicIp; }, alb = S.albs[0] && S.albs[0].dns;
  function goBrowser(url, page) { go("browser", {}, "Browser"); wbGo(url); if (page) { W.page = page; render(); } }
  function step(n, done, title, hint, label, dis, fn) { return h("div", { style: "display:flex;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--line,#d3dae3);flex-wrap:wrap" }, [h("span", { style: "width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#fff;background:" + (done ? "#1d8102" : "#5f6b7a"), text: done ? "✓" : String(n) }), h("div", { style: "flex:1;min-width:240px" }, [h("b", { text: title }), h("div", { cls: "hint", text: hint })]), h("button", { cls: "btn pri", type: "button", text: label, disabled: dis, onclick: fn })]); }
  function chip(t, fn) { return h("button", { cls: "btn", type: "button", text: t, onclick: fn }); }
  return h("div", { cls: "card", style: "margin-bottom:12px" }, [h("div", { cls: "ch", text: "ปุ่มลัดตัวอย่าง 'พร้อมปล่อย' (ไม่ต้องพิมพ์) · GitHub user: " + u }), h("div", { cls: "cb" }, [
    step(1, st.pushed, "git push ทั้ง 3 repo", "สั่ง git init/add/commit/remote/push (+ tag v1.0.0) ให้ทีละคำสั่ง ดูผลใน Terminal ด้านล่าง", "▶ push ให้", false, function () { readyPushCmds().forEach(termExec); termDraw(); render(); }),
    step(2, st.dev, "Jenkins build dev: backend → frontend", "เหมือนเปิด Jenkins › Build with Parameters (dev, v1.0.0) แล้วดู Build History", "▶ build dev ให้", !st.pushed, function () { readyBuild("dev"); goBrowser("http://" + ip("pharmacy-jenkins") + ":8080", "history"); }),
    step(3, !!st.dev && !!alb && webOpen("http://" + alb + ":8080").site === "app", "เปิดเว็บ pharmacy (dev)", "ผ่าน ALB พอร์ต 8080: ดูสต็อกยา กด − / + และเพิ่มยาใหม่ได้", "▶ เปิดเว็บ dev", !st.dev, function () { goBrowser("http://" + alb + ":8080"); }),
    step(4, st.prd, "ปล่อยขึ้น prd (deploy-only ใช้ image เดิมจาก dev)", "backend → frontend, AUTO_SYNC และกดยืนยัน production ให้", "▶ ปล่อย prd ให้", !st.dev, function () { readyBuild("prd"); goBrowser("http://" + alb); }),
    h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line,#d3dae3);padding-top:10px" }, [h("span", { cls: "hint", style: "align-self:center", text: "เปิดใน Browser:" }), chip("Jenkins", function () { goBrowser("http://" + ip("pharmacy-jenkins") + ":8080"); }), chip("SonarQube", function () { goBrowser("http://" + ip("pharmacy-sonarqube") + ":9000"); }), chip("ArgoCD", function () { goBrowser("https://" + ip("pharmacy-k8s-1") + ":30443"); }), chip("GitHub backend", function () { goBrowser("https://github.com/" + u + "/pharmacy-backend"); }), chip("GitHub frontend", function () { goBrowser("https://github.com/" + u + "/pharmacy-frontend"); }), chip("GitHub manifests", function () { goBrowser("https://github.com/" + u + "/pharmacy-manifests"); })])])]);
}
PAGES["term"] = function () {
  var inp = h("input", { id: "terminp", type: "text", autocomplete: "off", spellcheck: "false", "aria-label": "command", onkeydown: function (e) {
    if (e.key === "c" && e.ctrlKey && TERM.busy) { TERM.busy.skip(); e.preventDefault(); }
    else if (e.key === "Enter") { var v = inp.value; inp.value = ""; termRun(v); }
    else if (e.key === "ArrowUp" && !TERM.ask) { if (TERM.hi > 0) inp.value = TERM.hist[--TERM.hi]; e.preventDefault(); }
    else if (e.key === "ArrowDown" && !TERM.ask) { TERM.hi = Math.min(TERM.hist.length, TERM.hi + 1); inp.value = TERM.hist[TERM.hi] || ""; e.preventDefault(); }
  } });
  var box = h("div", { id: "termwrap" }, [crumbEl("Laptop › Terminal"), h("h1", { text: "Terminal" }), readyPanel(), infoCard([["ทำอะไร", "#2b6cb0", "เครื่อง laptop จำลอง: รัน `terraform` · `ansible` · `aws` cli · `ssh` กับ AWS จำลอง"], ["ผลที่เห็น", "#1d8102", "สะท้อนในเมนู **VPC, EC2, IAM, ECR** ทันที"]]),
    h("div", { cls: "termbar" }, [h("label", {}, ["ความเร็ว ", h("select", { id: "termspeed", "aria-label": "ความเร็ว", onchange: function (e) { S.speed = e.target.value; save(); } }, [["instant", "เสร็จทันที"], ["real", "เวลาเหมือนจริง (ประมาณ ใช้เวลาหลายนาที)"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: (S.speed || "instant") === o[0] ? "selected" : null }); }))]), h("label", {}, ["ธีม ", h("select", { id: "termtheme", "aria-label": "ธีม Terminal", onchange: function (e) { termSet("theme", e.target.value); termApplyTheme(); } }, Object.keys(TERM_THEMES).map(function (k) { return h("option", { value: k, text: TERM_THEMES[k][0], selected: termPref("theme", "navy") === k ? "selected" : null }); }))]), h("label", {}, ["ขนาดตัวอักษร ", h("select", { id: "termsize", "aria-label": "ขนาดตัวอักษร Terminal", onchange: function (e) { termSet("size", e.target.value); termApplyTheme(); } }, [["s", "เล็ก"], ["m", "กลาง"], ["l", "ใหญ่"], ["xl", "ใหญ่มาก"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: termPref("size", "m") === o[0] ? "selected" : null }); }))]), h("button", { type: "button", id: "termskip", cls: "btn", hidden: true, text: "ข้าม (Ctrl+C) แสดงที่เหลือทันที", onclick: function () { if (TERM.busy) TERM.busy.skip(); } })]),
    h("pre", { cls: "term", id: "termout", style: "min-height:320px;max-height:520px;overflow:auto" }), h("div", { cls: "termrow" }, [h("span", { id: "termlab", cls: "termlab" }), inp])]);
  setTimeout(termDraw, 0); return box;
};
PAGES["files"] = function () {
  var all = fsAll(), ks = Object.keys(all).filter(function (k) { return k.indexOf(REPO + "/") === 0 || k.indexOf(HOME + "/.") === 0; }).sort(), cur = UI.edit && all[UI.edit] !== undefined ? UI.edit : null;
  var ro = cur && (/\/\.(ssh|aws)\//.test(cur) || /terraform\.tfstate$/.test(cur));
  var TH = JKX_THEME[JKX.theme] || JKX_THEME.github, ta = h("textarea", { id: "edtxt", rows: 24, spellcheck: "false", style: "width:100%;font-family:var(--mono);font-size:.82rem;background:" + TH[1] + ";color:" + TH[2] + ";caret-color:" + TH[5] }); ta.value = cur ? all[cur] : "";
  var list = h("div", { cls: "filelist" }, ks.map(function (k) { return h("button", { type: "button", cls: "fbtn", text: k.replace(REPO + "/", "").replace(HOME, "~"), "aria-current": String(k === cur), onclick: function () { UI.edit = k; go("files", {}, "Laptop"); } }); }));
  return h("div", {}, [crumbEl("Laptop › Files & editor"), h("h1", { text: "Files & editor" }), infoCard([["ทำอะไร", "#2b6cb0", "แก้ไฟล์ Terraform/Ansible ใน repo จำลอง แล้วรัน `terraform plan` ใน Terminal ==เห็นผลทันที=="], ["ข้อยกเว้น", "#a85a00", "playbook `.yml` ของ Ansible ยังรันจาก**ชุดที่ฝังตอน build** (แก้แล้วไม่มีผล)"]]),
    h("div", { cls: "filewrap" }, [list, h("div", {}, [h("p", { cls: "mono", text: cur ? cur.replace(HOME, "~") : "เลือกไฟล์ทางซ้าย" }), ta,
      cur ? h("p", {}, [h("button", { type: "button", cls: "btn pri", text: "Save", disabled: ro, onclick: function () { fsWrite(cur, ta.value); flash("ok", "บันทึก " + cur.replace(HOME, "~") + " แล้ว"); go("files", {}, "Laptop"); } }), ro ? h("small", { text: "  ไฟล์นี้จัดการผ่านคำสั่ง (ssh-keygen / aws configure / terraform) ไม่แก้ตรง ๆ" }) : null]) : null])])]);
};

PAGES["faults"] = function () {
  var FL = [["vcpuQuota", "โควตา vCPU = 5", "default ของบัญชีใหม่ตามเอกสาร", "เมื่อ vCPU ที่รันเกิน 5 (เครื่องที่ 3 ที่ใช้ 2 vCPU) terraform apply ล้มด้วย VcpuLimitExceeded", "Service Quotas → Running On-Demand Standard instances → Request increase หรือใช้ cheap-mode (k8s_node_count=1, db_count=1)"],
    ["azMissing", "instance type บาง AZ ไม่มี", "t3.medium ใน AZ ที่ 2", "RunInstances ล้มด้วย Unsupported", "เปลี่ยน instance type หรือเลือก AZ อื่น"],
    ["providerLock", "lock file ล็อก provider aws เวอร์ชันเก่า", "4.67.0 แต่ config ต้องการ >= 5.0", "terraform init ล้ม", "terraform init -upgrade"],
    ["eventual", "eventual consistency", "instance profile ใหม่ยังไม่พร้อมตอน RunInstances", "apply ครั้งแรกล้มที่ aws_instance ที่ผูก profile", "รัน terraform apply ซ้ำ (state เก็บของที่สร้างแล้ว)"]];
  var box = h("div", {}, [crumbEl("Laptop › ปัญหาโลกจริง"), h("h1", { text: "ปัญหาโลกจริง (จำลอง)" }),
    infoCard([["ทำอะไร", "#2b6cb0", "เปิดปัญหาที่มักเจอบน AWS จริงแต่ปกติไม่เกิดในตัวจำลอง แล้วลองรัน `terraform` ที่ Laptop › Terminal"], ["ข้อควรระวัง", "#c0392b", "ข้อความ error ส่วนใหญ่==จำลองจากความจำ== ไม่ได้ยืนยันกับของจริง"]])]);
  FL.forEach(function (f) {
    var on = !!S.faults[f[0]];
    box.appendChild(h("div", { cls: "card", style: "margin:10px 0" }, [h("div", { cls: "cb" }, [
      h("label", { style: "display:flex;gap:8px;align-items:center;font-weight:600" }, [h("input", { type: "checkbox", checked: on, onchange: function (e) { if (e.target.checked) S.faults[f[0]] = true; else delete S.faults[f[0]]; save(); render(); } }), f[1], h("span", { cls: "tag " + (on ? "warn" : "ok"), text: on ? "เปิดอยู่" : "ปิด" })]),
      h("div", { cls: "sub", style: "margin:4px 0 10px" }, rich(f[2])),
      infoCard([["จะเกิด", "#c0392b", f[3]], ["วิธีแก้", "#1d8102", f[4]]])])]));
  });
  box.appendChild(h("h2", { text: "ที่เกิดอยู่แล้วโดยไม่ต้องเปิด" })); box.appendChild(infoCard([["AMI", "#7b3fe4", "ไม่เจอถ้า `owners` / ชื่อ filter **ไม่ตรง**"], ["โควตา", "#a85a00", "ตามเอกสาร: Elastic IP / VPC / IGW **5 ต่อ region** · SG rule **60**"], ["Free plan", "#c0392b", "ใช้ได้เฉพาะ instance type ในรายการ (เมนู ==บัญชี== ด้านบน)"], ["เวลาสร้าง", "#1d6fb8", "ALB / EC2 / NAT แสดง `Still creating...` ตาม**เวลาโดยประมาณ**"]]));
  return box;
};

// ---- Browser: เปิด URL ของ lab (Jenkins ฯลฯ) ผ่านเครือข่ายจำลอง
var ITM = null;
function instTick() { if (ITM || S.speed !== "real" || !(S.insts.some(function (i) { return instPhase(i).transient; }) || S.nats.some(function (n) { return natPhase(n) !== "available"; }) || S.albs.some(function (a) { return albPhase(a) !== "active"; }) || labBusy())) return; ITM = setTimeout(function () { ITM = null; render(); }, 3000); }
var WTM = null;
function wbTick() {
  if (WTM || !S.jk || !S.jk.builds) return;
  var b = S.jk.builds.filter(function (x) { return x.state === "running" && x.idx < x.stages.length && jkReal(); })[0], needArgo = S.speed === "real" && Object.keys(S.argo.apps).some(function (n) { var st = argoStatus(n); return st && st.health === "Progressing"; });
  if (!b && !needArgo) return;
  WTM = setTimeout(function () { WTM = null; if (b && S.jk.builds.indexOf(b) >= 0 && b.state === "running") jkAdvance(b, true); render(); }, b ? jkNextDelay(b) * 1000 : 3000);
}
var W = { addr: "", res: null, page: "", f: {}, bid: 0, lg: "" };
function wbGo(a) { W.addr = a; W.res = webOpen(a); W.page = ""; W.sq = ""; W.ar = ""; W.sp = ""; W.lg = ""; render(); }
function wbBadge(r) { return h("span", { cls: "tag " + (r === "SUCCESS" ? "ok" : r === "FAILURE" || r === "ABORTED" ? "bad" : "warn"), text: r || "RUNNING" }); }
function wbSel(label, id, opts, get, set) { return h("div", { cls: "f" }, [h("label", { cls: "l", text: label }), h("select", { id: "w-" + id, "aria-label": label, onchange: function (e) { set(e.target.value); render(); } }, opts.map(function (o) { return h("option", { value: o[0], text: o[1], selected: String(o[0]) === String(get()) ? "selected" : null }); }))]); }
function wbEx(label, key, ex, ph, type, id) { var F = W.f; return h("div", { cls: "f" }, [h("label", { cls: "l", text: label }), exPick(ex.map(function (x) { return typeof x === "string" ? [x, x] : x; }), function () { return F[key]; }, function (v) { F[key] = v; }, F, "_c" + key, ph, label, false, type, id)]); }
function wbF(label, id, kids) { if (kids && kids.tagName === "INPUT") kids.setAttribute("aria-label", label); return h("div", { cls: "f" }, [h("label", { cls: "l", text: label, "for": "w-" + id }), kids]); }
function wbText(id, key, ph, type) { var F = W.f; return h("input", { type: type || "text", id: "w-" + id, "aria-label": id, placeholder: ph || "", value: F[key] == null ? "" : F[key], oninput: function (e) { F[key] = e.target.value; } }); }
function wbErr(er) { return er ? h("div", { cls: "err", text: typeof er === "string" ? er : Object.keys(er).map(function (k) { return er[k]; }).join(" · ") }) : null; }
function wbGoPage(p) { return function () { W.page = p; W.lg = ""; render(); }; }
function wbNA(what) { return function () { W.lg = what + " — ยังไม่ได้จำลองหน้านี้"; render(); }; }
var WICON = { "New Item": "＋", "People": "👥", "Build History": "🕘", "Manage Jenkins": "⚙", "My Views": "▤", "Status": "▤", "Changes": "‹›", "Build Now": "▷", "Build with Parameters": "▷", "Configure": "⚙", "Delete Pipeline": "🗑", "Full Stage View": "🔍", "Stages": "◈", "Rename": "✎", "Pipeline Syntax": "?", "Console Output": "▣", "Edit Build Information": "✎", "Timings": "◔", "Git Build Data": "◆", "Pipeline Overview": "⑂", "Pipeline Console": "▣", "Restart from Stage": "↻", "Replay": "↪", "Pipeline Steps": "☰", "Workspaces": "▭" };
function wbSideJ(items, active) { return items.filter(Boolean).map(function (x) { var on = x[0] === active; return h("div", { style: "padding:9px 12px;border-radius:10px;display:flex;gap:12px;align-items:center;cursor:pointer;" + (on ? "background:#ececf2;font-weight:600" : ""), onclick: x[1] }, [h("span", { style: "width:20px;text-align:center;color:#444", text: WICON[x[0].replace(/^Delete build.*/, "Delete Pipeline")] || "•" }), h("span", { style: "color:#1f2933", text: x[0] })]); }); }
function wbPill(label, onclick, accent) { return h("button", { type: "button", style: "border:0;border-radius:10px;padding:9px 16px;font-size:.9rem;cursor:pointer;background:" + (accent ? "#e3f4e8;color:#1b7a3b" : "#f1f3f6;color:#1f2933"), text: label, onclick: onclick }); }
function wbCircle(res, size) { var c = res === "SUCCESS" ? ["#1b9e3e", "✓"] : res === "FAILURE" ? ["#d33", "✕"] : res === "ABORTED" ? ["#888", "–"] : ["#0b6aa2", "…"]; return h("span", { style: "display:inline-flex;align-items:center;justify-content:center;width:" + size + "px;height:" + size + "px;border-radius:50%;border:3px solid " + c[0] + ";color:" + c[0] + ";font-weight:700;font-size:" + Math.round(size * .55) + "px", text: c[1] }); }
function wbJLog(lines) {
  return h("pre", { style: "background:#f1f1f1;border-radius:10px;padding:16px 20px;font-family:var(--mono);font-size:.84rem;line-height:1.55;white-space:pre-wrap;overflow-x:auto;margin:0;max-height:620px" }, lines.map(function (l) { var pip = /^\[Pipeline\]/.test(l); var m = /^(Started by user |Approved by |Aborted by )(\S+)$/.exec(l), n = /^(Running on )(\S+)( in .*)$/.exec(l); return h("div", { style: pip ? "color:#8c8c8c" : "color:#111" }, m ? [m[1], h("span", { style: "color:#0b6bcb", text: m[2] })] : n ? [n[1], h("span", { style: "color:#0b6bcb", text: n[2] }), n[3]] : [l || " "]); }));
}
function wbJenkins(res) {
  var su = jkSetup(), F = W.f, gh = ansVars().github_user || "YOUR_GITHUB_USER", ip = res.host;
  function page(inner, crumbs, userBar) {
    return h("div", { style: "border:1px solid #d5d8e0;border-radius:10px;overflow:hidden;background:#fff" }, [
      h("div", { style: "display:flex;gap:16px;padding:12px 32px;background:#000;align-items:center" }, [h("span", { style: "font-size:1.5rem", text: "🤵" }), h("b", { style: "font-family:Georgia,serif;font-size:1.6rem;color:#fff", text: "Jenkins" }), h("span", { style: "margin-left:auto" }), userBar ? [h("input", { type: "text", disabled: true, placeholder: "🔍  Search (⌘+K)", "aria-label": "Search", style: "width:260px;border-radius:8px;border:0;padding:8px 12px;background:#fff" }), h("span", { style: "color:#fff;font-weight:600", text: "👤 " + S.jk.login + " ▾" }), h("a", { href: "#", style: "color:#fff;font-weight:600;text-decoration:none", text: "⇥ log out", onclick: function (e) { e.preventDefault(); jkSignOut(); render(); } })] : null]),
      crumbs ? h("div", { style: "padding:12px 32px;background:#f5f6f8;font-size:.9rem" }, crumbs.reduce(function (acc, c, i) {
        var to = c === "Dashboard" ? "dash" : S.jk.job && c === S.jk.job.name ? "job" : c === "Manage Jenkins" ? "manage" : c === "Credentials" ? "creds" : "";
        if (i) acc.push("   ›   "); acc.push(to && i < crumbs.length - 1 ? h("a", { href: "#", style: "color:#1a5a8f;text-decoration:none", text: c, onclick: function (e) { e.preventDefault(); W.page = to; W.lg = ""; render(); } }) : c); return acc; }, [])) : null, inner,
      h("div", { style: "padding:10px 20px;text-align:right;font-size:.8rem;color:#222" }, "REST API      Jenkins 2.426.1")]);
  }
  function two(side, main) { return h("div", { style: "display:flex;gap:36px;padding:26px 40px 32px;min-height:380px" }, [h("div", { style: "width:210px;flex:none" }, side), h("div", { style: "flex:1;min-width:0" }, main)]); }
  // --- setup wizard
  function wiz(title, kids, footer) { return h("div", { style: "border:1px solid #d5d8e0;border-radius:6px;overflow:hidden;background:#fff" }, [h("div", { style: "padding:14px 18px;border-bottom:1px solid #e3e6ee;font-weight:600", text: "Getting Started" }), h("div", { style: "padding:30px 40px;min-height:300px;background:linear-gradient(#f5f5f5,#fff 120px)" }, [h("h1", { style: "font-size:2.4rem;margin:0 0 14px", text: title })].concat(kids)), footer ? h("div", { style: "padding:12px 18px;border-top:1px solid #e3e6ee;text-align:right" }, footer) : null]); }
  var blue = function (t, f) { return h("button", { type: "button", style: "background:#2b6cb0;color:#fff;border:0;border-radius:6px;padding:9px 20px;cursor:pointer", text: t, onclick: f }); };
  if (su === "unlock") return wiz("Unlock Jenkins", [h("p", { style: "font-size:1.05rem", text: "To ensure Jenkins is securely set up by the administrator, a password has been written to the log (not sure where to find it?) and this file on the server:" }), h("p", {}, [h("code", { style: "background:#fdecef;color:#b3124b;padding:3px 8px;border-radius:4px", text: "/var/jenkins_home/secrets/initialAdminPassword" })]), h("p", { style: "font-size:1.05rem", text: "Please copy the password from either location and paste it below." }), h("p", { cls: "sub", text: "(ดูจากเครื่อง: sudo docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword)" }), wbEx("Administrator password", "pw", [[jkPwdOf(jkInst()), "รหัสจาก initialAdminPassword"]], "", "password", "w-pw"), wbErr(W.lg)], blue("Continue", function () { if (jkUnlock(F.pw)) { W.lg = ""; F.pw = ""; } else W.lg = "Invalid password"; render(); }));
  if (su === "customize") return wiz("Customize Jenkins", [h("p", { style: "font-size:1.05rem", text: "Plugins extend Jenkins with additional features to support many different needs." }), h("div", { style: "display:flex;gap:18px;flex-wrap:wrap" }, [["Install suggested plugins", "Install plugins the Jenkins community finds most useful."], ["Select plugins to install", "Select and install plugins most suitable for your needs."]].map(function (o) { return h("div", { style: "flex:1;min-width:240px;border:1px solid #d5d8e0;border-radius:6px;padding:20px;cursor:pointer;background:#fff", onclick: function () { jkCustomize(); render(); } }, [h("b", { style: "font-size:1.2rem", text: o[0] }), h("p", { cls: "sub", text: o[1] })]); })), h("p", { cls: "sub", text: "(plugin ของ lab ติดตั้งมาใน image แล้ว: workflow-aggregator, git, git-parameter, credentials-binding, pipeline-stage-view, blueocean)" })]);
  if (su === "admin") { ["au", "ap", "ap2", "af", "ae"].forEach(function (k) { if (F[k] == null) F[k] = ""; }); return wiz("Create First Admin User", [wbEx("Username", "au", ["admin", "swd"], "", "text", "w-au"), wbEx("Password", "ap", ["Pharmacy-Lab-2026!", "ChangeMe-123"], "", "password", "w-ap"), wbEx("Confirm password", "ap2", ["Pharmacy-Lab-2026!", "ChangeMe-123"], "", "password", "w-ap2"), wbEx("Full name", "af", ["Pharmacy Admin", "Lab Admin"], "", "text", "w-af"), wbEx("E-mail address", "ae", ["admin@pharmacy.lab", "me@example.com"], "", "text", "w-ae"), wbErr(W.lg)], blue("Save and Continue", function () { var r = jkCreateAdmin({ user: F.au, pass: F.ap, pass2: F.ap2, full: F.af, email: F.ae }); W.lg = r.errors ? r.errors : ""; render(); })); }
  if (su === "url") { if (F.ju == null) F.ju = "http://" + ip + ":8080/"; return wiz("Instance Configuration", [wbEx("Jenkins URL:", "ju", ["http://" + ip + ":8080/"], "", "text", "w-ju"), h("p", { cls: "sub", text: "The Jenkins URL is used to provide the root URL for absolute links to various Jenkins resources." })], blue("Save and Finish", function () { jkSetUrl(); render(); })); }
  if (su === "ready") return wiz("Jenkins is ready!", [h("p", { style: "font-size:1.05rem", text: "Your Jenkins setup is complete." })], blue("Start using Jenkins", function () { jkStart(); W.page = "dash"; render(); }));
  if (!S.jk.login) { ["lu", "lp"].forEach(function (k) { if (F[k] == null) F[k] = ""; }); return page(h("div", { style: "padding:40px;display:flex;justify-content:center" }, [h("div", { style: "width:360px" }, [h("h2", { text: "Sign in to Jenkins" }), wbEx("Username", "lu", S.jk.users.map(function (u) { return u.name; }), "", "text", "w-lu"), wbEx("Password", "lp", S.jk.users.map(function (u) { return [u.pass, "รหัสของ " + u.name]; }), "", "password", "w-lp"), wbErr(W.lg), blue("Sign in", function () { W.lg = jkSignIn(F.lu, F.lp) ? "" : "Invalid username or password"; render(); })])]), null, false); }
  // --- ใช้งานจริง
  jkJobs(); var pg = W.page || "dash", J = S.jk.job, ALLB = S.jk.builds, builds = J ? jkBuildsOf(J) : [], STG = ["Declarative: Checkout SCM", "Validate", "Confirm production", "Checkout version", "Test", "SonarQube scan", "Build image", "Scan image", "Push image", "Check image exists", "Update manifest", "Sync ArgoCD", "Declarative: Post Actions"];
  var gSide = function (act) { return wbSideJ([["New Item", wbGoPage("newitem")], ["People", wbNA("People")], ["Build History", wbGoPage("history")], ["Manage Jenkins", wbGoPage("manage")], ["My Views", wbNA("My Views")]], act); };
  var title = function (t, extra) { return h("div", { style: "display:flex;align-items:center;gap:12px;margin-bottom:14px" }, [h("h1", { style: "margin:0;font-size:1.7rem", text: t }), h("span", { style: "margin-left:auto;display:flex;gap:8px" }, extra || [])]); };
  var na = W.lg && /ยังไม่ได้จำลอง/.test(W.lg) ? h("div", { cls: "alert info", text: W.lg }) : null;
  function jobTable() {
    if (!S.jk.jobs.length) return h("div", {}, [h("h1", { style: "font-size:1.7rem", text: "Welcome to Jenkins!" }), h("p", { text: "This page is where your Jenkins jobs will be displayed. To get started, you can set up distributed builds or start building a software project." }), h("h3", { text: "Start building your software project" }), h("div", { style: "border:1px solid #d5d8e0;border-radius:10px;padding:16px;width:260px;cursor:pointer", onclick: wbGoPage("newitem") }, [h("b", { text: "＋ Create a job" })])]);
    return h("div", {}, [title("All"), h("table", { cls: "tbl" }, [h("tr", {}, ["S", "W", "Name ↓", "Last Success", "Last Failure", "Last Duration"].map(function (x) { return h("th", { text: x }); }))].concat(S.jk.jobs.map(function (jj) {
      var bl = jkBuildsOf(jj), ok = bl.filter(function (b) { return b.result === "SUCCESS"; }).pop(), bad = bl.filter(function (b) { return b.result === "FAILURE"; }).pop(), last = bl[bl.length - 1];
      return h("tr", {}, [h("td", {}, [last ? wbCircle(last.result, 22) : "—"]), h("td", { text: last && last.result === "SUCCESS" ? "☀" : last ? "☁" : "" }), h("td", {}, [h("a", { href: "#", style: "font-weight:600", text: jj.name, onclick: function (e) { e.preventDefault(); jkSelect(jj.name); W.f.p = null; W.page = "job"; render(); } })]), h("td", { text: ok ? "#" + ok.id : "N/A" }), h("td", { text: bad ? "#" + bad.id : "N/A" }), h("td", { text: last ? "1 min 12 sec" : "N/A" })]);
    })))]);
  }
  function stageView() {
    if (!builds.length) return h("p", { cls: "sub", text: "No builds yet." });
    return h("div", { style: "overflow-x:auto" }, [h("table", { cls: "tbl", style: "table-layout:fixed;width:100%" }, [h("tr", {}, [h("th", { style: "width:44px", text: "" })].concat(STG.map(function (n) { return h("th", { style: "white-space:normal;word-break:break-word;font-size:.68rem;line-height:1.2;vertical-align:bottom;text-align:center;padding:8px 2px", text: n }); })))].concat(builds.slice().reverse().map(function (b) { return h("tr", {}, [h("td", {}, [h("a", { href: "#", style: "font-weight:600", text: "#" + b.id, onclick: function (e) { e.preventDefault(); W.bid = b.id; W.btab = "status"; W.page = "build"; render(); } })])].concat(STG.map(function (n) { var s = b.stages.filter(function (x) { return x.name === n; })[0]; if (!s && n === "Declarative: Post Actions") s = b.result ? { st: "success" } : null; var c = !s || s.st === "skipped" ? ["#f1f1f1", "#999", "-"] : s.st === "success" ? ["#c9f0cf", "#145a24", "1s"] : s.st === "failed" ? ["#f8c9c9", "#8a1212", "failed"] : s.st === "waiting" ? ["#ffe9a8", "#6b4e00", "paused"] : s.st === "running" ? ["#cfe3ff", "#0a3d8f", "…"] : ["#f1f1f1", "#999", "·"]; return h("td", { style: "background:" + c[0] + ";color:" + c[1] + ";text-align:center;min-width:0;padding:10px 4px", text: c[2] }); }))); })))]);
  }
  var crumbs = function () { var c = ["Dashboard"]; if (/^(job|params|build|configure)$/.test(pg) && J) c.push(J.name); if (pg === "build") c.push("#" + W.bid); if (pg === "params") c.push("Build with Parameters"); if (pg === "configure") c.push("Configuration"); if (pg === "newitem") c.push("All", "New Item"); if (pg === "creds" || pg === "gcreds") c.push("Manage Jenkins", "Credentials"); if (pg === "manage") c.push("Manage Jenkins"); if (pg === "history") c.push("Build History"); return c; };
  if (pg === "dash") return page(two(gSide("Dashboard"), [na, jobTable(), h("h3", { text: "Build Queue" }), h("p", { cls: "sub", text: "No builds in the queue." }), h("h3", { text: "Build Executor Status" }), h("p", { cls: "sub", text: "1 Idle · 2 Idle" })]), crumbs(), true);
  if (pg === "history") return page(two(gSide("Build History"), [title("Build History of Jenkins"), ALLB.length ? h("table", { cls: "tbl" }, [h("tr", {}, ["S", "Build", "Parameters"].map(function (x) { return h("th", { text: x }); }))].concat(ALLB.slice().reverse().map(function (b) { return h("tr", {}, [h("td", {}, [wbCircle(b.result, 20)]), h("td", {}, [h("a", { href: "#", text: b.job + " #" + b.id, onclick: function (e) { e.preventDefault(); jkSelect(b.job); W.bid = b.id; W.btab = "console"; W.page = "build"; render(); } })]), h("td", { text: b.params.VERSION ? b.params.TARGET_ENV + " / " + b.params.VERSION : "(ไม่มี parameters)" })]); }))) : h("p", { text: "No builds." })]), crumbs(), true);
  if (pg === "manage") return page(two(gSide("Manage Jenkins"), [title("Manage Jenkins"), h("h3", { text: "Security" }), h("div", { style: "border:1px solid #d5d8e0;border-radius:10px;padding:14px 16px;width:300px;cursor:pointer", onclick: wbGoPage("creds") }, [h("b", { text: "🔑 Credentials" }), h("div", { cls: "sub", text: "Configure credentials" })]), h("h3", { text: "System Configuration" }), h("p", { cls: "sub", text: "System · Tools · Plugins · Nodes (ยังไม่จำลองหน้าเหล่านี้; plugin ถูกติดตั้งมากับ image แล้ว)" })]), crumbs(), true);
  if (pg === "creds") return page(two(gSide("Manage Jenkins"), [title("Credentials"), h("h3", { text: "Stores scoped to Jenkins" }), h("table", { cls: "tbl" }, [h("tr", {}, ["P", "Store ↓", "Domains"].map(function (x) { return h("th", { text: x }); })), h("tr", {}, [h("td", { text: "🔑" }), h("td", { text: "System" }), h("td", {}, [h("a", { href: "#", text: "(global)", onclick: function (e) { e.preventDefault(); W.page = "gcreds"; render(); } })])])])]), crumbs(), true);
  if (pg === "gcreds") {
    var C = F; C.ck = C.ck || "userpass"; ["ci", "cu", "cp", "cs", "cd"].forEach(function (k) { if (C[k] == null) C[k] = ""; });
    var form = !W.addCred ? null : h("div", { style: "background:#f5f6f8;border-radius:12px;padding:16px 20px;margin-top:14px" }, [h("h3", { text: "New credentials" }), wbSel("Kind", "ck", [["userpass", "Username with password"], ["secret", "Secret text"]], function () { return C.ck; }, function (v) { C.ck = v; }), h("div", { cls: "f" }, [h("label", { cls: "l", text: "Scope" }), h("select", { "aria-label": "Scope" }, [h("option", { text: "Global (Jenkins, nodes, items, all child items, etc)" })])]), C.ck === "secret" ? wbEx("Secret", "cs", ["squ_exampleSonarToken"], "token จาก SonarQube") : [wbEx("Username", "cu", ["admin", "me"], "username"), wbEx("Password", "cp", ["ghp_exampleToken", "ChangeMe-123"], "password")], wbEx("ID", "ci", ["github-token", "sonar-token", "argocd-admin"], "github-token"), wbEx("Description", "cd", ["GitHub token", "SonarQube token", "ArgoCD admin"], "optional"), wbErr(W.lg), h("button", { cls: "btn pri", type: "button", text: "Create", onclick: function () { var r = jkAddCred({ id: C.ci, kind: C.ck, user: C.cu, pass: C.cp, secret: C.cs, desc: C.cd }); if (r.errors) W.lg = r.errors; else { W.lg = ""; W.addCred = false; C.ci = ""; C.cs = ""; C.cp = ""; C.cd = ""; } render(); } }), " ", h("button", { cls: "btn", type: "button", text: "Cancel", onclick: function () { W.addCred = false; render(); } })]);
    return page(two(gSide("Manage Jenkins"), [title("Global credentials (unrestricted)", [W.addCred ? null : wbPill("＋ Add Credentials", function () { W.addCred = true; render(); }, false)].filter(Boolean)), h("p", { cls: "sub", text: "Credentials that should be available irrespective of domain specification to requirements matching." }), h("table", { cls: "tbl" }, [h("tr", {}, ["ID", "Name", "Kind", "Description"].map(function (x) { return h("th", { text: x }); }))].concat(S.jk.creds.map(function (c) { return h("tr", {}, [h("td", { text: c.id }), h("td", { text: (c.user ? c.user + "/****** " : "") + (c.desc || c.id) }), h("td", { text: c.kind === "secret" ? "Secret text" : "Username with password" }), h("td", { text: c.desc || "" })]); }))), form]), crumbs(), true);
  }
  if (pg === "newitem" || pg === "configure") {
    var isNew = pg === "newitem" && !W.cfgOpen;
    if (pg === "configure" && !W.cfgOpen) { W.cfgOpen = "edit"; F.jn = J.name; F.jr = J.repo; F.jc = J.cred; F.jb = J.branch; F.js = J.script; }
    ["jn", "jr", "jc", "jb", "js"].forEach(function (k) { if (F[k] == null) F[k] = ""; }); if (!F.jb) F.jb = "*/main"; if (!F.js) F.js = "Jenkinsfile";
    if (isNew) { var TY = [["Freestyle project", "Classic, general-purpose job type that checks out from up to one SCM, executes build steps serially, followed by post-build steps like archiving artifacts and sending email notifications.", 0], ["Pipeline", "Orchestrates long-running activities that can span multiple build agents. Suitable for building pipelines (formerly known as workflows) and/or organizing complex activities that do not easily fit in free-style job type.", 1], ["Multi-configuration project", "Suitable for projects that need a large number of different configurations, such as testing on multiple environments, platform-specific builds, etc.", 0], ["Folder", "Creates a container that stores nested items in it. Useful for grouping things together.", 0], ["Multibranch Pipeline", "Creates a set of Pipeline projects according to detected branches in one SCM repository.", 0], ["Organization Folder", "Creates a set of multibranch project subfolders by scanning for repositories.", 0]];
      return page(two(gSide("New Item"), [title("New Item"), wbEx("Enter an item name", "jn", ["pharmacy-backend", "pharmacy-frontend"], "pharmacy-backend"), h("div", { cls: "f" }, [h("label", { cls: "l", text: "Select an item type" }), h("div", {}, TY.map(function (t) { return h("div", { style: "display:flex;gap:14px;padding:12px 14px;border-radius:10px;margin:4px 0;" + (t[2] ? "background:#f1f1f6;" : "opacity:.55;"), title: t[2] ? "" : "ยังไม่จำลองชนิดนี้" }, [h("span", { style: "font-size:1.6rem;width:34px", text: t[0] === "Pipeline" ? "⑂" : t[0] === "Folder" ? "🗀" : "◻" }), h("div", {}, [h("div", { text: t[0] }), h("div", { cls: "sub", text: t[1] })])]); }))]), wbErr(W.lg), h("button", { type: "button", style: "background:#0b6bcb;color:#fff;border:0;border-radius:10px;padding:10px 34px;cursor:pointer", text: "OK", onclick: function () { if (!/^[A-Za-z0-9_-]+$/.test(F.jn || "")) { W.lg = "» This field cannot be empty, please enter a valid name"; } else if (jkJob(F.jn)) { W.lg = "» A job already exists with the name ‘" + F.jn + "’"; } else { W.lg = ""; W.cfgOpen = "new"; } render(); } })]), crumbs(), true); }
    return page(two(wbSideJ([["General", wbNA("General")], ["Advanced Project Options", wbNA("Advanced")], ["Pipeline", function () {}]], "Pipeline"), [title("Configure"), h("h2", { text: "Pipeline" }), h("div", { cls: "f" }, [h("label", { cls: "l", text: "Definition" }), h("select", { "aria-label": "Definition" }, [h("option", { text: "Pipeline script from SCM" })])]), h("div", { cls: "f" }, [h("label", { cls: "l", text: "SCM" }), h("select", { "aria-label": "SCM" }, [h("option", { text: "Git" })])]), h("h3", { text: "Repositories" }), wbEx("Repository URL", "jr", ["https://github.com/" + gh + "/pharmacy-backend.git", "https://github.com/" + gh + "/pharmacy-frontend.git"], "https://github.com/<user>/pharmacy-backend.git"), wbSel("Credentials", "jc", [["", "- none -"]].concat(S.jk.creds.map(function (c) { return [c.id, (c.user ? c.user + "/****** " : "") + (c.desc || c.id)]; })), function () { return F.jc; }, function (v) { F.jc = v; }), h("h3", { text: "Branches to build" }), wbEx("Branch Specifier (blank for 'any')", "jb", ["*/main"], "*/main"), wbEx("Script Path", "js", ["Jenkinsfile"], "Jenkinsfile"), wbErr(W.lg), h("button", { type: "button", style: "background:#0b6bcb;color:#fff;border:0;border-radius:10px;padding:10px 34px;cursor:pointer", text: "Save", onclick: function () { var r = W.cfgOpen === "new" ? jkCreateJob({ name: F.jn, repo: F.jr, cred: F.jc, branch: F.jb, script: F.js }, true) : jkCreateJob({ name: S.jk.job.name, repo: F.jr, cred: F.jc, branch: F.jb, script: F.js }); if (r.errors) W.lg = r.errors; else { W.lg = ""; W.cfgOpen = ""; W.page = "job"; F.p = null; F.jn = ""; F.jr = ""; F.jc = ""; } render(); } })]), crumbs(), true);
  }
  if (pg === "job" || pg === "params" || pg === "build") {
    if (!J) { W.page = "dash"; return wbJenkins(res); }
    var jSide = wbSideJ([["Status", wbGoPage("job")], ["Changes", wbNA("Changes")], J.paramsKnown ? ["Build with Parameters", function () { W.page = "params"; render(); }] : ["Build Now", function () { jkBuildNow(); W.page = "job"; render(); }], ["Configure", function () { W.cfgOpen = ""; W.page = "configure"; render(); }], ["Delete Pipeline", wbNA("Delete Pipeline")], ["Full Stage View", wbGoPage("job")], ["Stages", wbNA("Stages")], ["Rename", wbNA("Rename")], ["Pipeline Syntax", wbNA("Pipeline Syntax")]], pg === "job" ? "Status" : "");
    if (pg === "params") {
      if (F.p && F.p.SERVICE !== J.svc) F.p = null; var P = F.p = F.p || { TARGET_ENV: "dev", SERVICE: J.svc, VERSION: "", ACTION: "build-and-deploy", AUTO_SYNC: false, CHANGE_NOTE: "" }, rp = S.gh.repos[jkRepoName(J)], tags = rp ? rp.tags.slice().sort().reverse() : []; if ((!P.VERSION || tags.indexOf(P.VERSION) < 0) && tags.length) P.VERSION = tags[0]; if (!tags.length) P.VERSION = "";
      return page(two(jSide, [title("Pipeline " + J.name), h("p", { text: "This build requires parameters:" }), wbSel("TARGET_ENV", "pe", [["dev", "dev"], ["prd", "prd"]], function () { return P.TARGET_ENV; }, function (v) { P.TARGET_ENV = v; }), wbSel("VERSION", "pv", tags.length ? tags.map(function (t) { return [t, t]; }) : [["", "(รายการว่าง: ยังไม่มี tag บน GitHub)"]], function () { return P.VERSION; }, function (v) { P.VERSION = v; }), wbSel("ACTION", "pa", [["build-and-deploy", "build-and-deploy"], ["deploy-only", "deploy-only"]], function () { return P.ACTION; }, function (v) { P.ACTION = v; }), h("label", { cls: "opt" }, [h("input", { type: "checkbox", checked: !!P.AUTO_SYNC, onchange: function (e) { P.AUTO_SYNC = e.target.checked; } }), h("span", { text: "AUTO_SYNC — ให้ Jenkins สั่ง ArgoCD sync ทันที (ไม่ติ๊ก = เข้าไปกด Sync เองใน ArgoCD)" })]), wbEx("CHANGE_NOTE", "pnote", ["TICKET-123", "first release"], "เลข ticket หรือเหตุผล"), h("button", { type: "button", style: "background:#0b6bcb;color:#fff;border:0;border-radius:10px;padding:10px 34px;cursor:pointer", text: "Build", onclick: function () { P.CHANGE_NOTE = F.pnote || ""; var b = jkWithParams(Object.assign({}, P)); W.bid = b.id; W.btab = "console"; W.page = "build"; render(); } })]), crumbs(), true);
    }
    if (pg === "build") {
      var b = builds.filter(function (x) { return x.id === W.bid; })[0]; if (!b) { W.page = "job"; return wbJenkins(res); }
      var tab = W.btab || "status", bSide = wbSideJ([["Status", function () { W.btab = "status"; render(); }], ["Changes", wbNA("Changes")], ["Console Output", function () { W.btab = "console"; render(); }], ["Edit Build Information", wbNA("Edit Build Information")], ["Delete build ‘#" + b.id + "’", wbNA("Delete build")], ["Timings", wbNA("Timings")], ["Git Build Data", wbNA("Git Build Data")], ["Pipeline Overview", wbNA("Pipeline Overview")], ["Pipeline Console", function () { W.btab = "console"; render(); }], ["Restart from Stage", wbNA("Restart from Stage")], ["Replay", wbNA("Replay")], ["Pipeline Steps", wbNA("Pipeline Steps")], ["Workspaces", wbNA("Workspaces")]], tab === "console" ? "Console Output" : "Status");
      var waiting = b.state === "waiting" ? h("div", { cls: "alert warn" }, ["Input requested — ปล่อย " + b.params.SERVICE + " " + b.params.VERSION + " ขึ้น PRD ใช่ไหม? ", h("button", { cls: "btn pri", type: "button", text: "ยืนยัน", onclick: function () { jkInput(b, true); render(); } }), " ", h("button", { cls: "btn", type: "button", text: "Abort", onclick: function () { jkInput(b, false); render(); } })]) : null;
      var rs = b.result || (b.state === "waiting" ? "WAITING" : "RUNNING"), mu = /github\.com\/([^\/]+)\//.exec(J.repo), when = "Oct 7, 2026, 9:" + (10 + b.id) + ":34 AM";
      var main = tab === "console" ? [h("div", { style: "display:flex;align-items:center;gap:12px;margin-bottom:14px" }, [wbCircle(b.result, 34), h("h1", { style: "margin:0;font-size:1.7rem", text: "Console Output" }), h("span", { style: "margin-left:auto;display:flex;gap:8px" }, [wbPill("⤓ Download", wbNA("Download")), wbPill("⧉ Copy", wbNA("Copy")), wbPill("View as plain text", wbNA("View as plain text"))])]), na, waiting, wbJLog(b.log)] : [h("div", { style: "display:flex;gap:14px;align-items:flex-start" }, [wbCircle(b.result, 34), h("h1", { style: "margin:0;font-size:1.7rem", text: "Build #" + b.id + " (" + when + ")" }), h("div", { style: "margin-left:auto;text-align:right;font-size:.9rem" }, [wbPill("Keep this build forever", wbNA("Keep this build forever")), h("div", { style: "margin-top:10px", text: "Started " + (J.seq - b.id + 1) + " min ago" }), h("div", { text: "Took " + (b.result ? "17 sec" : "…") })])]), na, waiting, h("p", { style: "margin:18px 0 6px 48px", cls: "sub", text: "✎ Add description" }), h("div", { style: "display:flex;gap:16px;margin:14px 0" }, [h("span", { style: "font-size:1.6rem", text: "◔" }), h("div", {}, ["Started by user ", h("a", { href: "#", text: b.who })])]), h("div", { style: "display:flex;gap:16px;margin:14px 0" }, [h("span", { style: "font-size:1.6rem", text: "⏱" }), h("div", {}, ["This run spent:", h("ul", {}, [h("li", { text: "6 ms waiting;" }), h("li", { text: "17 sec build duration;" }), h("li", { text: "17 sec total from scheduled to completion." })])])]), h("div", { style: "display:flex;gap:16px;margin:14px 0" }, [h("b", { style: "font-size:1.2rem", text: "◆git" }), h("div", {}, [h("div", {}, [h("b", { text: "Revision" }), ": " + hash32(J.repo + b.id) + hash32("a" + b.id) + hash32("b" + b.id)]), h("div", {}, [h("b", { text: "Repository" }), ": ", h("a", { href: "#", text: J.repo })]), h("ul", {}, [h("li", { text: "refs/remotes/origin/" + (J.branch || "*/main").replace("*/", "") })])])]), h("h3", { text: "Parameters" }), h("table", { cls: "tbl" }, Object.keys(b.params).map(function (k) { return h("tr", {}, [h("td", { text: k }), h("td", { text: String(b.params[k]) })]); }))];
      return page(two(bSide, main), crumbs(), true);
    }
    var lb = builds[builds.length - 1], lok = builds.filter(function (x) { return x.result === "SUCCESS"; }).pop(), lbad = builds.filter(function (x) { return x.result === "FAILURE"; }).pop();
    return page(two(jSide, [na, title(J.name, []), h("p", { cls: "sub", text: "✎ Add description" }), h("p", { cls: "sub", text: "Repository: " + J.repo + "  ·  Branch: " + J.branch + "  ·  Script Path: " + J.script }), h("h3", { text: "Stage View" }), stageView(), h("h3", { text: "Permalinks" }), h("ul", {}, [lb ? h("li", { text: "Last build (#" + lb.id + ")" }) : null, lok ? h("li", { text: "Last successful build (#" + lok.id + ")" }) : null, lbad ? h("li", { text: "Last failed build (#" + lbad.id + ")" }) : null].filter(Boolean))]), crumbs(), true);
  }
  W.page = "dash"; return wbJenkins(res);
}
// ---- SonarQube (หน้าตาอ้างอิงภาพจาก docs.sonarsource.com)
function wbSonar(res) {
  var F = W.f, pg = W.sq || (S.sq.login ? "projects" : "login");
  function bar() {
    var nav = ["Projects", "Portfolios", "Issues", "Rules", "Quality profiles", "Quality gates", "Administration", "More"];
    return h("div", { style: "display:flex;gap:22px;padding:0 18px;height:54px;background:#fff;border-bottom:1px solid #e1e5ea;align-items:center;overflow-x:auto" }, [h("span", { style: "color:#555", text: "▯" }), h("span", { style: "font-weight:700;color:#236a97;font-size:1.1rem", text: "〰 SonarQube " }), h("span", { style: "color:#236a97;font-size:.8rem;margin-left:-14px;margin-top:14px", text: "server" })].concat(S.sq.login ? nav.map(function (n) { return h("a", { href: "#", style: "text-decoration:none;color:#1d2433;font-weight:600;font-size:.92rem;white-space:nowrap", title: n === "Projects" ? "" : "ยังไม่ได้จำลองหน้านี้", text: n, onclick: function (e) { e.preventDefault(); if (n === "Projects") { W.sq = "projects"; render(); } } }); }).concat([h("span", { style: "margin-left:auto;color:#555", text: "🔍   🔔   ?" }), h("span", { style: "position:relative" }, [h("span", { style: "display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:6px;background:#17a085;color:#fff;font-weight:700;cursor:pointer", text: "A", onclick: function () { W.menu = !W.menu; render(); } }), W.menu ? h("div", { style: "position:absolute;right:0;top:36px;background:#fff;border:1px solid #d5d8e0;border-radius:6px;width:170px;z-index:5;box-shadow:0 2px 8px rgba(0,0,0,.12)" }, [h("div", { style: "padding:10px 14px;font-weight:700", text: "Administrator" }), h("div", { style: "padding:10px 14px;cursor:pointer;background:#f5f6f8", text: "My account", onclick: function () { W.menu = false; W.sq = "acct"; render(); } }), h("div", { style: "padding:10px 14px;cursor:pointer", text: "Log out", onclick: function () { S.sq.login = false; W.menu = false; W.sq = "login"; render(); } })]) : null])]) : []));
  }
  function frame(inner) { return h("div", { style: "border:1px solid #d5d8e0;border-radius:6px;overflow:visible;background:#fff" }, [bar(), inner]); }
  function pad(k) { return h("div", { style: "padding:20px 26px;min-height:340px;background:#f8f9fb" }, k); }
  function rate(n, c) { var col = { A: ["#d4f5dc", "#1b7a3b"], B: ["#e6f3b8", "#5a7a00"], C: ["#fdeabf", "#9a6500"], D: ["#fbd9b5", "#a1530a"], E: ["#f8cbcb", "#a31212"] }[n] || ["#eee", "#444"]; return h("span", { style: "display:inline-block;width:30px;height:30px;line-height:30px;border-radius:50%;text-align:center;background:" + col[0] + ";color:" + col[1] + ";font-weight:700", text: n }); }
  if (!S.sq.login) { ["sl", "sp"].forEach(function (k) { if (F[k] == null) F[k] = ""; }); return frame(h("div", { style: "padding:40px;display:flex;justify-content:center;background:#f8f9fb" }, [h("div", { style: "width:340px;background:#fff;border:1px solid #d5d8e0;border-radius:8px;padding:24px" }, [h("h2", { style: "text-align:center", text: "Log in to SonarQube" }), wbEx("Login", "sl", ["admin"], "", "text", "w-sl"), wbEx("Password", "sp", S.sq.pwdChanged ? [[S.sq.pass, "รหัสที่ตั้งไว้"], "admin"] : [["admin", "admin (ค่าเริ่มต้น)"]], "", "password", "w-sp"), wbErr(W.lg), h("button", { cls: "btn pri", type: "button", text: "Log in", onclick: function () { var r = sqLogin(F.sl, F.sp); if (!r.ok) W.lg = "Authentication failed"; else { W.lg = ""; W.sq = r.mustChange ? "chpw" : "projects"; } render(); } })])])); }
  if (!S.sq.pwdChanged && pg !== "chpw") pg = W.sq = "chpw";
  if (pg === "chpw") { ["so", "sn", "sc"].forEach(function (k) { if (F[k] == null) F[k] = ""; }); return frame(pad([h("div", { style: "max-width:420px;margin:0 auto;background:#fff;border:1px solid #d5d8e0;border-radius:8px;padding:24px" }, [h("h2", { text: "Update your password" }), h("p", { text: "This account should not use the default password." }), wbEx("Old Password", "so", [S.sq.pwdChanged ? [S.sq.pass, "รหัสปัจจุบัน"] : ["admin", "admin (ค่าเริ่มต้น)"]], "", "password", "w-so"), wbEx("New Password", "sn", ["Pharmacy-Lab-2026!", "Sonar-Pharmacy-01"], "ยาวอย่างน้อย 12 ตัว", "password", "w-sn"), wbEx("Confirm Password", "sc", ["Pharmacy-Lab-2026!", "Sonar-Pharmacy-01"], "", "password", "w-sc"), wbErr(W.lg), h("button", { cls: "btn pri", type: "button", text: "Update", onclick: function () { var r = sqChangePw(F.so, F.sn, F.sc); if (r.errors) W.lg = r.errors; else { W.lg = ""; W.sq = "projects"; } render(); } })])])); }
  if (pg === "acct") {
    ["tn", "tt", "te"].forEach(function (k) { if (F[k] == null) F[k] = ""; }); if (!F.te) F.te = "30 days";
    var side = h("div", { style: "width:220px;flex:none;border-right:1px solid #e1e5ea;background:#fff;padding:14px 10px" }, [h("div", { style: "padding:6px 10px 14px" }, [h("b", { text: "Administrator" }), h("div", { cls: "sub", text: "User" })])].concat([["Profile", 0], ["Security", 1], ["Notifications", 0], ["Projects", 0], ["Appearance", 0]].map(function (x) { return h("div", { style: "padding:9px 12px;border-radius:6px;" + (x[1] ? "background:#eef0fb;color:#4a55c9;font-weight:600;outline:1px solid #d33;outline-offset:-1px" : "color:#333;opacity:.8"), text: x[0] }); })));
    var main = h("div", { style: "flex:1;padding:20px 30px;background:#fff" }, [h("div", { cls: "sub", text: "My account  /  Security" }), h("h1", { style: "margin:6px 0 16px", text: "Security" }), h("p", { style: "max-width:640px", text: "If you want to enforce security by not providing credentials of a real SonarQube user to run your code scan or to invoke web services, you can provide a User Token as a replacement of the user login. This will increase the security of your installation by not letting your analysis user's password going through your network." }), h("h2", { text: "Generate Tokens" }),
      h("div", { style: "display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap" }, [h("div", { style: "min-width:200px" }, [wbEx("Name", "tn", ["jenkins", "ci-token"], "Enter Token Name")]), h("div", {}, [wbSel("Type", "tt", [["", "Select Token Type"], ["User Token", "User Token"], ["Project Analysis Token", "Project Analysis Token"], ["Global Analysis Token", "Global Analysis Token"]], function () { return F.tt; }, function (v) { F.tt = v; })]), h("div", {}, [wbSel("Expires in", "te", [["30 days", "30 days"], ["90 days", "90 days"], ["365 days", "365 days"], ["No expiration", "No expiration"]], function () { return F.te; }, function (v) { F.te = v; })]), h("button", { type: "button", style: "background:#4a55c9;color:#fff;border:0;border-radius:6px;padding:9px 18px;cursor:pointer;margin-bottom:12px", text: "Generate", onclick: function () { var r = sqGenToken({ name: F.tn, type: F.tt || "User Token" }); if (r.errors) { W.lg = r.errors; W.tok = ""; } else { W.lg = ""; W.tok = r.res; } render(); } })]),
      wbErr(W.lg), W.tok ? h("div", { cls: "alert info" }, ["New token: ", h("code", { text: W.tok }), " — คัดลอกตอนนี้ จะไม่แสดงอีก (นำไปใส่ Jenkins credential sonar-token)"]) : null,
      h("table", { cls: "tbl", style: "margin-top:18px" }, [h("tr", {}, ["Name", "Type", "Project", "Last use", "Created", "Expiration", ""].map(function (x) { return h("th", { text: x }); }))].concat(S.sq.tokens.map(function (t) { return h("tr", {}, [h("td", { text: t.name }), h("td", { text: t.type.replace(" Token", "") }), h("td", { text: "" }), h("td", { text: "Never" }), h("td", { text: "Oct 7, 2026" }), h("td", { text: "Nov 6, 2026" }), h("td", {}, [h("button", { cls: "btn", type: "button", style: "color:#c00", text: "Revoke", onclick: function () { S.sq.tokens = S.sq.tokens.filter(function (x) { return x !== t; }); render(); } })])]); })))]);
    return frame(h("div", { style: "display:flex;min-height:380px" }, [side, main]));
  }
  if (pg === "project") {
    var p = S.sq.projects[0] || { name: "", version: "", key: "" };
    var side2 = h("div", { style: "width:220px;flex:none;border-right:1px solid #e1e5ea;background:#fff;padding:14px 10px" }, [h("div", { style: "padding:6px 10px 14px;display:flex;gap:10px;align-items:center" }, [h("span", { style: "background:#17a085;color:#fff;border-radius:4px;padding:3px 8px;font-weight:700", text: p.name.slice(0, 1) }), h("div", {}, [h("b", { text: p.name }), h("div", { cls: "sub", text: "Project" })])])].concat(["Overview", "Dashboards", "Analysis", "   Summary", "   Issues", "   Security hotspots", "Architecture", "Reporting", "Policies", "Project", "Project settings"].map(function (x) { return h("div", { style: "padding:8px 12px;border-radius:6px;white-space:pre;" + (/Summary/.test(x) ? "background:#eef0fb;color:#4a55c9;font-weight:600" : "color:#333;opacity:.8"), text: x }); })));
    function mc(t, v, sub, rt) { return h("div", { style: "padding:14px 18px;border-top:1px solid #e1e5ea" }, [h("div", { style: "font-weight:600", text: t }), h("div", { style: "display:flex;align-items:center;gap:10px;margin-top:8px" }, [h("span", { style: "font-size:1.6rem;font-weight:600", text: v }), h("span", { cls: "sub", text: sub }), h("span", { style: "margin-left:auto" }, [rt || ""])])]); }
    var main2 = h("div", { style: "flex:1;background:#f8f9fb" }, [h("div", { style: "padding:16px 24px;background:#fff" }, [h("div", { cls: "sub", text: p.name + "  /  Summary" }), h("h1", { style: "margin:6px 0", text: "Summary" }), h("div", { cls: "sub", text: p.lines + " Lines of Code  ·  Version " + p.version + "  ·  Last analysis just now" })]), h("div", { style: "padding:18px 24px;display:flex;gap:16px;align-items:center" }, [h("span", { style: "display:inline-block;width:68px;height:68px;line-height:68px;text-align:center;background:#d4f5dc;color:#1b7a3b;font-size:2rem;border-radius:6px", text: "✓" }), h("div", {}, [h("div", { cls: "sub", text: "Quality gate" }), h("div", { style: "font-size:2rem;font-weight:700", text: "Passed" })])]), h("div", { style: "margin:0 24px;background:#fff;border:1px solid #e1e5ea;border-radius:6px" }, [h("div", { style: "display:flex;border-bottom:1px solid #e1e5ea" }, [h("div", { style: "padding:12px 24px;color:#555", text: "New Code" }), h("div", { style: "padding:12px 24px;color:#4a55c9;font-weight:600;border-bottom:3px solid #4a55c9", text: "Overall Code" })]), h("div", { style: "display:grid;grid-template-columns:repeat(3,1fr)" }, [mc("Security", String(p.vulns), "Open issues", rate("A")), mc("Reliability", String(p.bugs), "Open issues", rate("A")), mc("Maintainability", String(p.smells), "Open issues", rate("A")), mc("Accepted issues", "0", "Valid issues that were not fixed"), mc("Coverage", p.cov === "—" ? "0.0%" : p.cov, "On lines to cover."), mc("Duplications", "0.0%", "On " + p.lines + " lines.")])])]);
    return frame(h("div", { style: "display:flex;min-height:420px" }, [side2, main2]));
  }
  // projects list
  return frame(pad([h("h1", { style: "margin:0 0 14px", text: "Projects" }), S.sq.projects.length ? S.sq.projects.map(function (p) { return h("div", { style: "background:#fff;border:1px solid #e1e5ea;border-radius:8px;padding:14px 18px;margin:10px 0;cursor:pointer", onclick: function () { W.sq = "project"; render(); } }, [h("div", { style: "display:flex;gap:12px;align-items:center;flex-wrap:wrap" }, [h("b", { style: "color:#4a55c9;font-size:1.05rem", text: p.name }), h("span", { style: "background:#d4f5dc;color:#1b7a3b;border-radius:4px;padding:2px 10px;font-size:.8rem;font-weight:700", text: "Passed" }), h("span", { cls: "sub", text: "Last analysis: just now  ·  " + p.lines + " Lines of Code" })]), h("div", { style: "display:flex;gap:30px;margin-top:12px;flex-wrap:wrap" }, [["Security", String(p.vulns)], ["Reliability", String(p.bugs)], ["Maintainability", String(p.smells)], ["Hotspots Reviewed", "—"], ["Coverage", p.cov], ["Duplications", "0.0%"]].map(function (m) { return h("div", {}, [h("div", { style: "font-size:1.2rem;font-weight:600;display:flex;gap:8px;align-items:center" }, [m[1], /^(Security|Reliability|Maintainability)$/.test(m[0]) ? rate("A") : null]), h("div", { cls: "sub", text: m[0] })]); }))]); }) : h("p", { text: "0 projects  (ยังไม่มีโปรเจกต์: จะถูกสร้างอัตโนมัติเมื่อ Jenkins สแกนครั้งแรก)" })]));
}
// ---- Argo CD (หน้าตาอ้างอิงภาพจาก argo-cd.readthedocs.io)
function wbArgo(res) {
  var F = W.f;
  if (!S.argo.login) { ["au", "ap"].forEach(function (k) { if (F["a" + k] == null) F["a" + k] = ""; }); return h("div", { style: "background:#1e2e3e;border-radius:6px;padding:40px 20px;display:flex;justify-content:center" }, [h("div", { style: "background:#fff;border-radius:6px;padding:22px;width:380px" }, [h("h2", { text: "🐙 Argo CD" }), wbEx("Username", "aau", ["admin"], "", "text", "w-aau"), wbEx("Password", "aap", [[argoPwdOf(argoInst()), "รหัสจาก argocd-initial-admin-secret"]], "", "password", "w-aap"), h("p", { cls: "sub", text: "รหัสเริ่มต้นของ admin: บน pharmacy-k8s-1 รัน kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d" }), wbErr(W.lg), h("button", { cls: "btn pri", type: "button", text: "SIGN IN", onclick: function () { W.lg = argoLogin(F.aau, F.aap) ? "" : "Invalid username or password"; render(); } })])]); }
  var names = Object.keys(S.argo.apps), sel = W.ar && S.argo.apps[W.ar] ? W.ar : "", sts = {}; names.forEach(function (n) { sts[n] = argoStatus(n); });
  var HI = { Healthy: ["♥", "#18be94"], Degraded: ["💔", "#e96d76"], Missing: ["⬤", "#f4c030"], Progressing: ["◌", "#0dadea"], Suspended: ["⏸", "#766f94"], Unknown: ["?", "#ccd6dd"] }, SI = { Synced: ["✔", "#18be94"], OutOfSync: ["⬆", "#f4c030"], Unknown: ["?", "#ccd6dd"] };
  var pill = function (t, f, dis) { return h("button", { type: "button", disabled: !!dis, style: "background:#6d7f8b;color:#fff;border:0;border-radius:18px;padding:8px 16px;font-weight:600;font-size:.8rem;cursor:" + (dis ? "default" : "pointer") + ";opacity:" + (dis ? .6 : 1), text: t, onclick: f }); };
  var nav = h("div", { style: "width:170px;background:#1e2e3e;color:#cfd8e3;flex:none;padding:12px 0" }, [h("div", { style: "padding:6px 16px 16px;color:#fff;font-weight:700", text: "🐙 argo  v3.3.6" })].concat([["Applications", "▤", 1], ["Settings", "⚙", 0], ["User Info", "👤", 0], ["Documentation", "▭", 0]].map(function (x) { return h("div", { style: "padding:11px 16px;" + (x[2] ? "background:#2c4156;color:#fff" : "opacity:.75"), text: x[1] + "  " + x[0] }); })));
  function filters() {
    var cnt = function (k, v) { return names.filter(function (n) { return sts[n][k] === v; }).length; };
    function box(label, key, v, icon) { return h("label", { style: "display:flex;gap:8px;align-items:center;padding:3px 0;font-size:.85rem" }, [h("input", { type: "checkbox", checked: !!(W.fl && W.fl[key + v]), onchange: function (e) { W.fl = W.fl || {}; W.fl[key + v] = e.target.checked; render(); } }), icon ? h("span", { style: "color:" + icon[1], text: icon[0] }) : null, label, h("span", { style: "margin-left:auto;color:#6d7f8b", text: String(cnt(key, v)) })]); }
    return h("div", { style: "width:190px;flex:none;color:#cfd8e3;padding:6px 14px" }, [h("div", { style: "text-align:center;opacity:.8;margin-bottom:8px", text: "Resource filters" }), h("div", { style: "font-size:.75rem;margin:8px 0 4px", text: "NAME" }), h("input", { type: "text", "aria-label": "NAME filter", placeholder: "NAME", style: "width:100%;background:#0f1a26;color:#fff;border:0;padding:6px" }), h("div", { style: "font-size:.75rem;margin:12px 0 4px", text: "SYNC STATUS" })].concat(["Synced", "OutOfSync"].map(function (v) { return box(v, "sync", v, SI[v]); }), [h("div", { style: "font-size:.75rem;margin:12px 0 4px", text: "HEALTH STATUS" })], ["Progressing", "Suspended", "Healthy", "Degraded", "Missing", "Unknown"].map(function (v) { return box(v, "health", v, HI[v]); })));
  }
  function visible() { var fl = W.fl || {}, any = Object.keys(fl).some(function (k) { return fl[k]; }); return names.filter(function (n) { if (!any) return true; var s = sts[n]; var sy = ["Synced", "OutOfSync"].filter(function (v) { return fl["sync" + v]; }), he = ["Progressing", "Suspended", "Healthy", "Degraded", "Missing", "Unknown"].filter(function (v) { return fl["health" + v]; }); return (!sy.length || sy.indexOf(s.sync) >= 0) && (!he.length || he.indexOf(s.health) >= 0); }); }
  var shell = function (crumb, body, side) { return h("div", { style: "display:flex;border:1px solid #1e2e3e;border-radius:6px;overflow:hidden;background:#dee6eb;min-height:420px" }, [nav, side || null, h("div", { style: "flex:1;min-width:0" }, [h("div", { style: "background:#fff;padding:12px 18px;font-weight:600;border-bottom:1px solid #e1e5ea" }, crumb), body])]); };
  if (!sel) {
    var tiles = !names.length ? h("p", { style: "padding:18px", text: "No applications available to you just yet. (ยังไม่ได้ kubectl apply -f apps.yaml บน pharmacy-k8s-1)" }) : h("div", { style: "display:flex;gap:14px;flex-wrap:wrap;padding:14px" }, visible().map(function (n) { var st = sts[n], a = st.app, hi = HI[st.health] || HI.Unknown, si = SI[st.sync] || SI.Unknown; return h("div", { style: "width:340px;max-width:100%;background:#fff;border-left:5px solid " + hi[1] + ";border-radius:3px;padding:12px 16px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.12)", onclick: function () { W.ar = n; W.sp = ""; render(); } }, [h("b", { style: "color:#495763;font-size:1.05rem", text: n }), h("table", { style: "width:100%;font-size:.82rem;margin:8px 0" }, [["Project:", a.project || "default"], ["Labels:", ""], ["Status:", h("span", {}, [h("span", { style: "color:" + hi[1] }, [hi[0] + " "]), st.health, "  ", h("span", { style: "color:" + si[1] }, [si[0] + " "]), st.sync])], ["Repository:", a.repoURL], ["Target Revision:", "main"], ["Path:", a.path], ["Destination:", a.destName || "https://kubernetes.default.svc"], ["Namespace:", a.ns]].map(function (r) { return h("tr", {}, [h("td", { style: "color:#6d7f8b;width:104px;padding:2px 4px;border:0", text: r[0] }), h("td", { style: "word-break:break-all;padding:2px 4px;border:0" }, [r[1]])]); })), h("div", { style: "display:flex;gap:8px" }, [pill("⟳ SYNC", function (e) { e.stopPropagation(); W.ar = n; W.sp = n; W.lg = ""; render(); }), pill("↻ REFRESH", function (e) { e.stopPropagation(); render(); }), pill("✖ DELETE", function (e) { e.stopPropagation(); delete S.argo.apps[n]; render(); })])]); }));
    return shell(["Applications"], h("div", {}, [h("div", { style: "padding:12px 14px;display:flex;gap:10px;background:#fff" }, [pill("＋ NEW APP", function () {}, 1), pill("⟳ SYNC APPS", function () {}, 1)]), h("div", { style: "display:flex" }, [filters(), h("div", { style: "flex:1;min-width:0" }, [tiles])])]));
  }
  // ---- หน้ารายละเอียดของแอป + resource tree
  var st = sts[sel], a = st.app, hi = HI[st.health] || HI.Unknown, si = SI[st.sync] || SI.Unknown, sha = hash32(st.repoImage || "").slice(0, 7), svc = /backend/.test(sel) ? "backend" : "frontend";
  var rp0 = (function () { var um = /github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/.exec(a.repoURL || ""); return um && ghRepoOf(um[1], um[2]); })(), dep = rp0 && rp0.files[a.path + "/deployment.yaml"], reps = dep && /replicas:\s*(\d+)/.exec(dep) ? +/replicas:\s*(\d+)/.exec(dep)[1] : 1;
  var node = function (kind, name, tag, badge, ico) { return h("div", { style: "background:#fff;border-radius:3px;padding:8px 12px;min-width:200px;box-shadow:0 1px 3px rgba(0,0,0,.15);display:flex;gap:10px;align-items:center" }, [h("span", { style: "font-size:1.3rem;color:#7a8a96", text: ico }), h("div", {}, [h("div", { style: "font-size:.88rem", text: name }), h("div", { style: "font-size:.75rem;color:" + hi[1], text: hi[0] + " " + (badge || "") })]), h("span", { style: "margin-left:auto;background:#e1e8ee;border-radius:3px;padding:1px 6px;font-size:.72rem", text: tag })]); };
  var showRes = st.live !== null && st.live !== undefined && st.sync !== "Unknown", podState = st.health === "Healthy" ? "running 1/1" : st.health === "Progressing" ? "ContainerCreating 0/1" : (/ImagePull|InvalidImage|ErrImage/.test(st.msg) ? "ImagePullBackOff 0/1" : "CrashLoopBackOff 0/1");
  var tree = h("div", { style: "display:flex;gap:40px;align-items:center;padding:30px;overflow-x:auto" }, [h("div", { style: "width:90px;height:90px;border-radius:50%;background:#8da0ad;color:#fff;display:flex;align-items:center;justify-content:center;font-size:.8rem;text-align:center;flex:none", text: sel.replace("pharmacy-", "") }), showRes ? h("div", { style: "display:flex;flex-direction:column;gap:14px" }, [node("svc", svc, "svc", "", "⛁"), node("deploy", svc, "rev:1 deploy", "", "⟳")]) : h("div", { cls: "sub", text: st.sync === "Unknown" ? "(เปรียบเทียบไม่ได้: ดูข้อความ error ด้านบน)" : "(ยังไม่มี resource ใน cluster: ยังไม่ได้ sync)" }), showRes ? node("rs", svc + "-" + hash32(st.live).slice(0, 8), "rs", "", "⧉") : null, showRes ? h("div", { style: "display:flex;flex-direction:column;gap:10px" }, Array.apply(null, Array(reps)).map(function (_, i) { return node("pod", svc + "-" + hash32(st.live).slice(0, 8) + "-" + hash32(sel + i).slice(0, 5), podState + " pod", "", "▣"); })) : null].filter(Boolean));
  var sp = W.sp === sel ? h("div", { style: "position:absolute;right:0;top:0;width:340px;background:#fff;border-left:1px solid #d5d8e0;padding:16px;height:100%;box-shadow:-2px 0 8px rgba(0,0,0,.12)" }, [h("h3", { text: "SYNC APPLICATION" }), h("p", { text: "Synchronize " + sel + " ให้ตรงกับ Git (" + (st.repoImage || "-") + ")" }), h("div", { style: "display:flex;gap:8px" }, [h("button", { cls: "btn pri", type: "button", text: "SYNCHRONIZE", onclick: function () { var r = argoSyncApp(sel); W.lg = r.err || ""; W.sp = ""; render(); } }), h("button", { cls: "btn", type: "button", text: "CANCEL", onclick: function () { W.sp = ""; render(); } })])]) : null;
  var head = h("div", { style: "background:#fff;padding:10px 18px;display:flex;gap:30px;flex-wrap:wrap;border-bottom:1px solid #e1e5ea" }, [h("div", {}, [h("div", { cls: "sub", style: "font-size:.72rem", text: "APP HEALTH" }), h("div", { style: "font-size:1.4rem;color:" + hi[1], text: hi[0] + " " + st.health })]), h("div", {}, [h("div", { cls: "sub", style: "font-size:.72rem", text: "SYNC STATUS" }), h("div", { style: "font-size:1.4rem;color:" + si[1], text: si[0] + " " + st.sync }), h("div", { cls: "sub", text: (st.sync === "Synced" ? "To " : "From ") + "main (" + sha + ")" })]), h("div", {}, [h("div", { cls: "sub", style: "font-size:.72rem", text: "LAST SYNC" }), S.argo.live[sel] || a.auto ? h("div", { style: "font-size:1.2rem;color:#18be94", text: "Sync OK  ✔" }) : h("div", { cls: "sub", text: "ยังไม่เคย sync" }), h("div", { cls: "sub", text: "To main (" + sha + ")" })])]);
  var toolbar = h("div", { style: "background:#fff;padding:10px 14px;display:flex;gap:8px;flex-wrap:wrap" }, [pill("APP DETAILS", function () {}, 1), pill("APP DIFF", function () {}, 1), pill("⟳ SYNC", function () { W.sp = sel; W.lg = ""; render(); }), pill("SYNC STATUS", function () {}, 1), pill("HISTORY AND ROLLBACK", function () {}, 1), pill("✖ DELETE", function () { delete S.argo.apps[sel]; W.ar = ""; render(); }), pill("↻ REFRESH ▾", function () { render(); })]);
  return shell([h("a", { href: "#", style: "color:#0dadea;text-decoration:none", text: "Applications", onclick: function (e) { e.preventDefault(); W.ar = ""; W.sp = ""; render(); } }), "  /  " + sel], h("div", { style: "position:relative;min-height:380px" }, [toolbar, head, st.msg ? h("div", { cls: "err", style: "padding:8px 18px;background:#fff", text: st.msg }) : null, W.lg ? h("div", { cls: "err", style: "padding:8px 18px;background:#fff", text: W.lg }) : null, tree, sp]));
}
// ---- เว็บ pharmacy ผ่าน ALB
// ---- หน้าเว็บ GitHub จำลอง (อ่านอย่างเดียว): หน้า repo, เปิดโฟลเดอร์/ไฟล์, tags  ใช้ข้อมูลจาก git push ใน Terminal
function wbGithub(r) {
  ghInit(); var parts = r.path.split("/").filter(Boolean), GH = "#0969da", B = "#d0d7de";
  function go2(path) { return function (e) { if (e) e.preventDefault(); W.addr = "https://github.com" + path; W.res = webOpen(W.addr); render(); }; }
  function link(path, text, st) { return h("a", { href: "#", style: "color:" + GH + ";text-decoration:none;" + (st || ""), text: text, onclick: go2(path) }); }
  function shell(kids) { return h("div", { style: "background:#fff;color:#1f2328;border:1px solid " + B + ";border-radius:6px;overflow:hidden;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif" }, [h("div", { style: "background:#24292f;color:#fff;padding:12px 20px;display:flex;gap:16px;align-items:center" }, [h("b", { style: "font-size:1.1rem", text: "⌥ GitHub" }), h("span", { style: "margin-left:auto;font-size:.85rem;opacity:.85", text: "(จำลอง · อ่านอย่างเดียว)" })]), h("div", { style: "padding:20px 24px" }, kids)]); }
  if (parts.length < 2) return shell([h("h1", { style: "margin:0 0 8px", text: "Where the world builds software" }), h("p", { text: "หน้า GitHub จำลองแสดงเฉพาะ repo ที่คุณ git push จาก Terminal (ใน lab นี้ push แล้ว repo ถูกสร้างให้เอง) ลองเปิด:" }), h("ul", {}, ["pharmacy-backend", "pharmacy-frontend", "pharmacy-manifests"].map(function (n) { var u = ghUser(); return h("li", {}, [link("/" + u + "/" + n, "github.com/" + u + "/" + n)]); }))]);
  var user = parts[0], name = parts[1], rp = ghRepoOf(user, name);
  if (!rp) return shell([h("div", { style: "text-align:center;padding:40px 0" }, [h("h1", { style: "font-size:3rem;margin:0", text: "404" }), h("p", { text: "This is not the web page you are looking for." }), h("p", { cls: "sub", text: "ไม่พบ repo " + user + "/" + name + " (ยังไม่ได้ git push จาก Terminal หรือชื่อผู้ใช้/ชื่อ repo ไม่ตรง)" })])]);
  var files = rp.files || {}, mode = parts[2] || "", ref = parts[3] || "main", rest = parts.slice(4).join("/"), base = "/" + user + "/" + name;
  var head = h("div", { style: "display:flex;gap:8px;align-items:center;margin-bottom:12px;font-size:1.25rem" }, [h("span", { text: "▢" }), link("/" + user, user), "/", h("b", { text: name }), h("span", { style: "border:1px solid " + B + ";border-radius:2em;padding:0 8px;font-size:.75rem;color:#59636e;margin-left:6px", text: "Public" })]);
  var tabs = h("div", { style: "display:flex;gap:18px;border-bottom:1px solid " + B + ";margin-bottom:16px;font-size:.92rem" }, [["Code", "", 1], ["Issues", "", 0], ["Pull requests", "", 0], ["Actions", "", 0], ["Settings", "", 0]].map(function (t) { return h("span", { style: "padding:8px 4px;" + (t[2] ? "border-bottom:2px solid #fd8c73;font-weight:600" : "color:#59636e"), text: t[0] }); }));
  var tags = (rp.tags || []).slice().sort().reverse(), commits = (rp.n || 0) + 1;
  if (mode === "tags") return shell([head, tabs, h("h2", { style: "font-size:1.2rem", text: "Tags" }), tags.length ? h("ul", {}, tags.map(function (t) { return h("li", {}, [h("b", { text: t })]); })) : h("p", { cls: "sub", text: "ยังไม่มี tag (ใน Terminal: git tag v1.0.0 && git push origin v1.0.0)" }), link(base, "← กลับไปที่ Code")]);
  var isFile = mode === "blob" && Object.prototype.hasOwnProperty.call(files, rest), dir = mode === "tree" ? rest : "";
  var crumb = h("div", { style: "margin:0 0 10px;font-size:1rem" }, [link(base, name, "font-weight:700")].concat(rest ? rest.split("/").reduce(function (acc, seg, i, arr) { var pth = arr.slice(0, i + 1).join("/"); return acc.concat([" / ", i === arr.length - 1 && isFile ? h("b", { text: seg }) : link(base + "/tree/main/" + pth, seg)]); }, []) : []));
  if (isFile) {
    var lines = String(files[rest]).split("\n"); if (/\n$/.test(files[rest])) lines.pop();
    return shell([head, tabs, crumb, h("div", { style: "border:1px solid " + B + ";border-radius:6px;overflow:hidden" }, [h("div", { style: "background:#f6f8fa;padding:8px 14px;border-bottom:1px solid " + B + ";font-size:.85rem;color:#59636e", text: lines.length + " lines · " + files[rest].length + " bytes" }), h("pre", { style: "margin:0;padding:10px 14px;overflow:auto;font-size:.8rem;line-height:1.5;max-height:520px" }, [lines.map(function (l, i) { return (i + 1) + "\t" + l; }).join("\n")])])]);
  }
  if (mode === "blob") return shell([head, tabs, h("p", { text: "404 - ไม่พบไฟล์ " + rest })]);
  var pre = dir ? dir + "/" : "", seen = {}, entries = [];
  Object.keys(files).forEach(function (k) { if (k.indexOf(pre) !== 0) return; var rem = k.slice(pre.length), seg = rem.split("/")[0], isDir = rem.indexOf("/") >= 0; if (!seen[seg]) { seen[seg] = 1; entries.push({ name: seg, dir: isDir }); } });
  entries.sort(function (a, b) { return a.dir !== b.dir ? (a.dir ? -1 : 1) : a.name < b.name ? -1 : 1; });
  var rows = (dir ? [{ up: 1 }] : []).concat(entries).map(function (e) { if (e.up) return h("tr", {}, [h("td", { colspan: "2" }, [link(dir.indexOf("/") > 0 ? base + "/tree/main/" + dir.split("/").slice(0, -1).join("/") : base, "..")])]); return h("tr", {}, [h("td", { style: "padding:6px 14px;border-top:1px solid " + B }, [(e.dir ? "📁 " : "📄 "), link(base + (e.dir ? "/tree/main/" : "/blob/main/") + pre + e.name, e.name, "color:#1f2328")])]); });
  var bar = h("div", { style: "display:flex;gap:14px;align-items:center;margin-bottom:12px;flex-wrap:wrap" }, [h("span", { style: "border:1px solid " + B + ";border-radius:6px;padding:3px 12px;background:#f6f8fa;font-weight:600", text: "⎇ main" }), link(base + "/tags", tags.length + " Tags", "color:#1f2328"), h("span", { style: "color:#59636e", text: commits + " Commits" }), h("span", { style: "margin-left:auto;background:#1f883d;color:#fff;border-radius:6px;padding:4px 14px;font-weight:600", text: "<> Code ▾" })]);
  var clone = h("div", { style: "margin-top:14px;font-size:.85rem;color:#59636e" }, ["Clone: ", h("code", { text: "https://github.com/" + user + "/" + name + ".git" })]);
  return shell([head, tabs, bar, crumb, Object.keys(files).length ? h("table", { style: "width:100%;border:1px solid " + B + ";border-radius:6px;border-collapse:separate;border-spacing:0;font-size:.92rem" }, [h("tbody", {}, rows)]) : h("p", { cls: "sub", text: "repo ว่าง (ยังไม่มีไฟล์)" }), clone]);
}
function wbPharmacy(res) {
  var env = /:8080/.test(W.addr) ? "dev" : "prd", be = argoStatus("pharmacy-backend-" + env), fe = argoStatus("pharmacy-frontend-" + env), P = W.ph = W.ph || { msg: "", err: false, hits: 0, auth: {}, view: "stock", page: 1, mpage: 1, low: false }, F = W.f;
  var tag = function (st) { return st && st.live ? st.live.split(":").pop() : "-"; }, replicas = env === "prd" ? 3 : 1, up = phDbUp(), authed = !!P.auth[env];
  // คำขอผ่าน Next.js (BFF): ถ้าตอบ 401 = cookie หมดอายุ/ยังไม่ล็อกอิน → กลับหน้า login
  function call(method, path, body) {
    P.hits++; var r = phApi(env, method, path, body, up, P.auth[env]); r.pod = "backend-" + hash32(env + "be").slice(0, 9) + "-" + hash32("pod" + (P.hits % replicas)).slice(0, 5); P.pod = r.pod;
    if (r.code === 401 && path !== "/api/auth/login") P.auth[env] = false; if (r.body && r.body.served_by === "") r.body.served_by = r.pod; return r;
  }
  function act(fn) { return function () { var r = fn(); P.msg = r.code >= 400 ? (r.body && (r.body.detail || Object.keys(r.body).map(function (k) { return k + ": " + [].concat(r.body[k]).join(", "); }).join(" · "))) || "error " + r.code : r.okMsg || ""; P.err = r.code >= 400; render(); }; }
  var tf = function (t, st) { return h("th", { style: "text-align:" + (st || "left"), text: t }); }, B = function (l, fn, cls) { return h("button", { type: "button", cls: (cls || "btn") + " sm", text: l, onclick: fn }); };
  var shell = function (kids) { return h("div", { cls: "card", style: "background:#f5f7fa;color:#1b2733" }, [h("div", { cls: "cb", style: "max-width:860px" }, kids.concat([h("div", { role: "status", style: "min-height:1.4em;font-size:14px;color:" + (P.err ? "#b91c1c" : "#15803d"), text: P.msg }), h("p", { cls: "sub", text: "จำลองตาม repo-backend (Django REST) + repo-frontend (Next.js) · ข้อมูลแยกตาม env: dev ใช้ DB pharmacy_dev, prd ใช้ DB pharmacy_prd (แต่ละ DB มียาตัวอย่างของตัวเอง แก้ฝั่งหนึ่งอีกฝั่งไม่เปลี่ยน)" + (replicas > 1 ? " · รีเฟรช/กดซ้ำจะเห็นชื่อ pod ที่ตอบสลับกัน (prd มี 3 replica)" : "") })]))]); };
  if (!authed) {
    if (F.lu == null) F.lu = "admin"; if (F.lp == null) F.lp = "";
    return shell([h("h1", { style: "margin:0 0 12px", text: "💊 Pharmacy Stock" }), h("div", { style: "max-width:340px" }, [wbEx("ชื่อผู้ใช้", "lu", ["admin"], "ชื่อผู้ใช้"), wbEx("รหัสผ่าน", "lp", [phAdminPw(), "wrong-password"], "รหัสผ่าน"), h("div", { style: "margin-top:8px" }, [B("เข้าสู่ระบบ", act(function () { var r = call("POST", "/api/auth/login", { username: F.lu, password: F.lp }); if (r.code === 200) { P.auth[env] = true; F.lp = ""; r.okMsg = ""; } return r; }), "btn pri")]), h("p", { cls: "sub", text: "รหัสแอดมินคือ django_admin_password ใน ansible/group_vars/all/main.yml (Secret app-secrets) · ล็อกอินผิดหลายครั้งใน 1 นาที backend จะตอบ 429" })])]);
  }
  var nav = h("div", { style: "display:flex;gap:16px;align-items:center;background:#0f766e;color:#fff;padding:8px 14px;border-radius:8px;margin-bottom:14px" }, [h("b", { text: "💊 Pharmacy" }), h("a", { href: "#", style: "color:#fff;" + (P.view === "stock" ? "text-decoration:underline" : "opacity:.85"), text: "สต็อกยา", onclick: function (e) { e.preventDefault(); P.view = "stock"; render(); } }), h("a", { href: "#", style: "color:#fff;" + (P.view === "moves" ? "text-decoration:underline" : "opacity:.85"), text: "ประวัติการเคลื่อนไหว", onclick: function (e) { e.preventDefault(); P.view = "moves"; render(); } }), h("span", { style: "flex:1" }), h("button", { type: "button", cls: "btn sm", style: "color:#0f766e", text: "ออกจากระบบ", onclick: function () { P.auth[env] = false; P.msg = ""; render(); } })]);
  var head = h("div", { style: "color:#64748b;font-size:13px;margin-bottom:10px", text: "Frontend " + tag(fe) + " · Backend " + tag(be) + " (" + env + ")" });
  if (P.view === "moves") {
    var mv = call("GET", "/api/movements?page=" + P.mpage), mrows = mv.code !== 200 ? [h("tr", {}, [h("td", { colspan: "6", style: "color:#b91c1c", text: (mv.body && mv.body.detail) || "error" })])] : mv.body.results.map(function (x) { return h("tr", {}, [h("td", { text: x.medicine_name + " (" + x.medicine_sku + ")" }), h("td", { text: x.reason }), h("td", { style: "text-align:right;color:" + (x.delta > 0 ? "#15803d" : "#b91c1c"), text: (x.delta > 0 ? "+" : "") + x.delta }), h("td", { style: "text-align:right", text: String(x.stock_after) }), h("td", { text: x.created_by_name }), h("td", { text: x.note })]); });
    if (mv.code === 200 && !mrows.length) mrows = [h("tr", {}, [h("td", { colspan: "6", text: "ยังไม่มีประวัติ" })])];
    var mpages = mv.code === 200 ? Math.max(1, Math.ceil(mv.body.count / PH_PAGE)) : 1;
    return shell([nav, head, h("h2", { text: "ประวัติการเคลื่อนไหวของสต็อก" }), h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, [tf("ยา"), tf("เหตุผล"), tf("เปลี่ยน", "right"), tf("คงเหลือ", "right"), tf("โดย"), tf("หมายเหตุ")])]), h("tbody", {}, mrows)])]), h("div", { style: "display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:8px" }, [h("span", { cls: "sub", text: mv.code === 200 ? mv.body.count + " รายการ · หน้า " + P.mpage + "/" + mpages : "" }), B("ก่อนหน้า", function () { if (P.mpage > 1) { P.mpage--; render(); } }), B("ถัดไป", function () { if (P.mpage < mpages) { P.mpage++; render(); } })])]);
  }
  if (F.sq == null) F.sq = "";
  var sum = call("GET", "/api/summary"), q = "/api/medicines?page=" + P.page + (F.sq ? "&q=" + encodeURIComponent(F.sq) : "") + (P.low ? "&low_stock=1" : ""), list = call("GET", q);
  if (!P.auth[env]) { P.msg = "session หมดอายุ: ล็อกอินใหม่"; P.err = true; return wbPharmacy(res); }
  var cards = sum.code === 200 ? h("div", { style: "display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px" }, [["รายการยาที่ใช้งาน", sum.body.medicines, "#1b2733"], ["ใกล้หมด / ต้องสั่งเพิ่ม", sum.body.low_stock, "#b45309"], ["หมดสต็อก", sum.body.out_of_stock, "#b91c1c"], ["มูลค่าสต็อกรวม", "฿" + Number(sum.body.stock_value).toLocaleString("en-US", { minimumFractionDigits: 2 }), "#1b2733"]].map(function (c) { return h("div", { style: "background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px" }, [h("div", { style: "font-size:1.5rem;font-weight:700;color:" + c[2], text: String(c[1]) }), h("div", { style: "font-size:.8rem;color:#64748b", text: c[0] })]); })) : h("div", { style: "color:#b91c1c;margin-bottom:10px", text: "โหลดตัวเลขสรุปไม่ได้ (backend ไม่ตอบ)" });
  var pages = list.code === 200 ? Math.max(1, Math.ceil(list.body.count / PH_PAGE)) : 1;
  var rows = list.code !== 200 ? [h("tr", {}, [h("td", { colspan: "6", style: "color:#b91c1c", text: (list.body && list.body.detail) || "error" })])] : list.body.results.map(function (m) {
    var st = m.stock === 0 ? ["หมด", "#fee2e2", "#b91c1c"] : m.stock <= m.reorder_level ? ["ใกล้หมด", "#fef3c7", "#b45309"] : ["ปกติ", "#dcfce7", "#15803d"];
    return h("tr", {}, [h("td", { text: m.sku }), h("td", { text: m.name }), h("td", { style: "text-align:right", text: "฿" + Number(m.price).toFixed(2) }), h("td", { style: "text-align:right", text: m.stock + " " + m.unit }), h("td", {}, [h("span", { style: "padding:1px 9px;border-radius:20px;font-size:.78rem;font-weight:600;background:" + st[1] + ";color:" + st[2], text: st[0] })]),
      h("td", { style: "white-space:nowrap" }, [B("+ รับเข้า", function () { P.adj = { id: m.id, sign: 1 }; F.aq = ""; render(); }), " ", B("− จ่ายออก", function () { P.adj = { id: m.id, sign: -1 }; F.aq = ""; render(); }), " ", B("ลบ", act(function () { var r = call("DELETE", "/api/medicines/" + m.id); r.okMsg = "ลบ " + m.name + " แล้ว"; if (P.adj && P.adj.id === m.id) P.adj = null; return r; }))])]);
  });
  if (list.code === 200 && !rows.length) rows = [h("tr", {}, [h("td", { colspan: "6", text: "ไม่พบรายการ" + (env === "prd" ? " (เพิ่มยาด้วยฟอร์มด้านล่าง)" : "") })])];
  var adjPanel = null, am = P.adj && list.code === 200 ? list.body.results.filter(function (x) { return x.id === P.adj.id; })[0] : null;
  if (am) { if (F.ar2 == null) F.ar2 = P.adj.sign > 0 ? "receive" : "dispense"; if (F.an2 == null) F.an2 = ""; adjPanel = h("div", { style: "background:#fff;border:1px solid #0f766e;border-radius:10px;padding:10px 14px;margin:10px 0" }, [h("b", { text: (P.adj.sign > 0 ? "รับเข้า" : "จ่ายออก") + ": " + am.name + "  (คงเหลือ " + am.stock + " " + am.unit + ")" }), h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, [wbEx("จำนวน", "aq", ["1", "5", "10", "50", "9999"], "จำนวน"), wbEx("เหตุผล", "ar2", PH_REASONS, "เหตุผล"), wbEx("หมายเหตุ", "an2", ["PO-1001", "ใบสั่งยา #25"], "หมายเหตุ")]), h("div", { style: "display:flex;gap:8px" }, [B("บันทึก", act(function () { if (!/^\d+$/.test(String(F.aq).trim()) || Number(F.aq) <= 0) return { code: 400, body: { detail: "จำนวนต้องเป็นเลขจำนวนเต็มมากกว่า 0" } }; var r = call("POST", "/api/medicines/" + am.id + "/adjust", { delta: Number(F.aq) * P.adj.sign, reason: F.ar2, note: F.an2 }); if (r.code === 200) { r.okMsg = "บันทึกแล้ว คงเหลือ " + r.body.stock; P.adj = null; F.aq = ""; F.an2 = null; F.ar2 = null; } return r; }), "btn pri"), B("ยกเลิก", function () { P.adj = null; render(); })])]); }
  if (F.as == null) { F.as = ""; F.an = ""; F.ap = "0"; F.ar = "10"; }
  var form = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin:10px 0" }, [wbEx("รหัส (SKU)", "as", ["VITC1000", "AMX250"], "SKU"), wbEx("ชื่อยา", "an", ["Vitamin C 1000 mg", "Amoxicillin 250 mg"], "ชื่อยา"), wbEx("ราคา (บาท)", "ap", ["0", "25", "99.50"], "ราคา"), wbEx("จุดสั่งซื้อ", "ar", ["10", "20", "50"], "จุดสั่งซื้อ"), h("button", { type: "button", cls: "btn pri", style: "align-self:flex-end", text: "+ เพิ่มยา", onclick: act(function () { var r = call("POST", "/api/medicines", { sku: F.as, name: F.an, price: F.ap, reorder_level: F.ar === "" || isNaN(Number(F.ar)) ? null : Number(F.ar) }); if (r.code === 201) { r.okMsg = "เพิ่มแล้ว (จำนวนเริ่มต้น 0: กด รับเข้า เพื่อให้มีประวัติ)"; F.as = ""; F.an = ""; F.ap = "0"; F.ar = "10"; } return r; }) })]);
  return shell([nav, head, h("h2", { text: "สต็อกยา" }), cards, h("div", { style: "color:#64748b;font-size:13px;margin-bottom:8px", text: sum.code === 200 ? "ตอบโดย backend pod: " + sum.body.served_by : "" }),
    h("div", { style: "display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap" }, [wbEx("ค้นหา (ชื่อหรือรหัส)", "sq", ["para", "ibu", "ORS"], "ค้นหา"), h("label", { style: "padding-bottom:8px" }, [h("input", { type: "checkbox", checked: P.low, onchange: function (e) { P.low = e.target.checked; P.page = 1; render(); } }), " เฉพาะใกล้หมด"]), B("ค้นหา", function () { P.page = 1; render(); })]),
    h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, [tf("รหัส"), tf("ชื่อยา"), tf("ราคา", "right"), tf("คงเหลือ", "right"), tf("สถานะ"), tf("")])]), h("tbody", {}, rows)])]),
    h("div", { style: "display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:8px" }, [h("span", { cls: "sub", text: list.code === 200 ? list.body.count + " รายการ · หน้า " + P.page + "/" + pages : "" }), B("ก่อนหน้า", function () { if (P.page > 1) { P.page--; render(); } }), B("ถัดไป", function () { if (P.page < pages) { P.page++; render(); } })]),
    adjPanel || h("span"), h("h2", { text: "เพิ่มยาใหม่" }), form]);
}
PAGES.browser = function () {
  var urls = []; ["jenkins_url", "sonarqube_url", "argocd_url", "site_prd", "site_dev"].forEach(function (k) { if (S.tf.outputs[k]) urls.push(String(S.tf.outputs[k])); });
  S.cfds.forEach(function (d) { d.aliases.forEach(function (a) { urls.push("https://" + a); }); urls.push("https://" + d.domain); });
  var gu = ghUser(); (S.gh && S.gh.repos ? Object.keys(S.gh.repos) : []).forEach(function (n) { urls.push("https://github.com/" + S.gh.repos[n].user + "/" + n); }); if (!(S.gh && S.gh.repos && Object.keys(S.gh.repos).length)) urls.push("https://github.com/" + gu + "/pharmacy-backend");
  S.apis.forEach(function (a) { a.stages.forEach(function (s) { urls.push("https://" + slsApiHost(a) + (s.name === "$default" ? "" : "/" + s.name) + "/drugs"); }); });
  S.albs.forEach(function (a) { a.listeners.forEach(function (l) { var t = find(S.tgs, l.tgId); if (t && t.ttype === "ip" && a.dns) urls.push("http://" + a.dns + (l.port === 80 ? "" : ":" + l.port) + "/api/drugs"); }); });
  var ex = (urls.length ? urls : ["http://203.0.113.15:8080"]).map(function (x) { return [x, x]; });
  var bar = h("div", { cls: "addrbar" }, [h("span", { cls: "gl", text: "🌐" }), h("div", { style: "flex:1" }, [exPick(ex, function () { return W.addr; }, function (v) { W.addr = v; }, W, "_cu", "http://203.0.113.15:8080", "URL", false)]), h("button", { cls: "btn pri", type: "button", text: "Go", onclick: function () { wbGo(W.addr); } })]);
  var r = W.res, view;
  var noOut = !urls.some(function (u) { return /^https?:\/\/(?!github\.com)/.test(u); });
  if (!r && noOut) view = h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("h2", { text: "ยังไม่มี link ของ Jenkins / SonarQube / ArgoCD / เว็บ" }), h("p", { text: "link พวกนี้มาจาก terraform output หลังสร้างเครื่องแล้ว (state ถูกล้างเมื่อกด Reset หรือเปิดแท็บใหม่)" }), h("p", { text: "ทางลัด: Lab › ตัวอย่างสำเร็จรูป › \"พร้อมปล่อย\" แล้วกดโหลด จะได้ครบทุก link ทันที หรือทำเองที่แท็บ Laptop: terraform apply" }), h("button", { type: "button", cls: "btn pri", text: "ไปที่ ตัวอย่างสำเร็จรูป", onclick: function () { go("lab-scen", {}, "Lab"); } })])]);
  else if (!r) view = infoCard([["ทำอะไร", "#2b6cb0", "เลือก URL จาก `terraform output` (หรือพิมพ์เอง) แล้วกด ==Go=="], ["ตัวจำลองตรวจ", "#1d8102", "เหมือน `ssh`: เครื่อง**รันอยู่** · มี **public IP** · **route** · **security group** · service ที่ฟัง**พอร์ต**นั้น"]]);
  else if (r && r.site === "cf") view = wbCloudFront(r);
  else if (r.err) view = h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("h2", { text: "This site can’t be reached" }), h("p", { text: r.host ? (r.err === "ERR_CONNECTION_REFUSED" ? r.host + " refused to connect." : r.err === "ERR_NAME_NOT_RESOLVED" ? "ไม่พบเซิร์ฟเวอร์ " + r.host : r.host + " took too long to respond.") : r.title }), h("p", { cls: "sub", text: r.err }), h("details", {}, [h("summary", { text: "ตัวจำลองบอกเหตุผล (ไม่มีในเบราว์เซอร์จริง)" }), h("ul", { cls: "chk" }, (r.steps || []).map(function (x) { return h("li", { cls: x.ok ? "ok" : "no" }, [h("span", { cls: "m", text: x.ok ? "✓" : "✗" }), h("span", {}, [x.t, h("small", { text: x.d })])]); }))])])]);
  else if (r.site === "jenkins") view = wbJenkins(r);
  else if (r.site === "sonarqube") view = wbSonar(r);
  else if (r.site === "argocd") view = wbArgo(r);
  else if (r.site === "app") view = wbPharmacy(r);
  else if (r.site === "apigw") view = wbApigw(r);
  else if (r.site === "api") view = h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("div", { cls: "hint", text: "GET " + r.host + r.path + " → 200 OK · Content-Type: application/json" }), codePre(JSON.stringify(r.json, null, 2), "an"), h("p", { cls: "hint", text: r.health ? "นี่คือ path ที่ ALB ใช้ health check" : "กด Go ซ้ำ: ALB สลับไป task ตัวอื่น (task / az เปลี่ยน) = load balancing" })])]);
  else if (r.site === "github") view = wbGithub(r);
  else if (r.site === "alb503") view = h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("h2", { text: "503 Service Temporarily Unavailable" }), h("p", { cls: "sub", text: "ALB ตอบได้ แต่ไม่มี target ที่ healthy (ดู EC2 › Target Groups › Targets)" })])]);
  else view = h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("h2", { text: r.site === "sonarqube" ? "SonarQube" : r.site === "argocd" ? "Argo CD" : "pharmacy" }), h("p", { cls: "sub", text: "เข้าถึงได้ (เครือข่ายถูกต้อง) แต่ตัวจำลองยังไม่มีหน้าเว็บของบริการนี้" })])]);
  if (r && !r.err && /^(jenkins|sonarqube|argocd|app|github)$/.test(r.site)) view = h("div", { cls: "bwin" }, [view]);
  var spd = h("label", { style: "display:block;margin:6px 0" }, ["ความเร็ว ", h("select", { "aria-label": "ความเร็ว", onchange: function (e) { S.speed = e.target.value; save(); render(); } }, [["instant", "เสร็จทันที"], ["real", "เวลาเหมือนจริง (build หลายนาที)"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: (S.speed || "instant") === o[0] ? "selected" : null }); }))]);
  return h("div", {}, [crumbEl("Browser"), h("h1", { text: "Browser" }), spd, bar, view]);
};

// ---- lab panel
function labBody(tab) {
  var cb = h("div", { cls: "cb" });
  if (tab === "check") {
    var c = checks(), n = c.filter(function (x) { return x.ok; }).length;
    cb.appendChild(infoCard([["ความคืบหน้า", n === c.length ? "#1d8102" : "#2b6cb0", "สิ่งที่คุณกดมาตรงกับโค้ด Terraform ของ lab แล้ว **" + n + "** จาก **" + c.length + "** ข้อ"]]));
    cb.appendChild(h("div", { cls: "prog" }, [h("i", { style: "width:" + Math.round(100 * n / c.length) + "%" })]));
    cb.appendChild(h("ul", { cls: "chk" }, c.map(function (x) { return h("li", { cls: x.ok ? "ok" : "no" }, [h("span", { cls: "m", text: x.ok ? "✓" : "✗" }), h("span", {}, [x.label, x.hint && !x.ok ? h("small", { text: "วิธี: " + x.hint }) : null])]); })));
  } else if (tab === "flow") {
    cb.appendChild(flowTab());
  } else if (tab === "hcl") {
    cb.appendChild(infoCard([["ทำอะไร", "#2b6cb0", "สิ่งที่คุณ**กดใน console** ถูกแปลงเป็นโค้ด Terraform ตรงๆ"], ["ต่างจาก repo จริง", "#a85a00", "ไม่ย่อด้วย `count` / `for_each` จึง==ยาวกว่า== ของจริง"], ["ใช้ทำอะไร", "#1d8102", "เทียบว่า**แต่ละคลิก**กลายเป็น**บรรทัดไหน**"]]));
    cb.appendChild(h("div", { style: "display:flex;gap:8px;margin:0 0 10px" }, [foldBar(), jkxViewSel(), codeThemeSel()]));
    if (isStaticLab()) { var sk = h("div", { cls: "card", style: "margin-bottom:14px;padding:8px 14px 14px" }), sf = fold("sysan", "แอนิเมชัน: เว็บ static (S3 + CloudFront + Route 53 + ACM) ใครคุยกับใคร"); sf.appendChild(ucAnim(UC[0])); sk.appendChild(sf); cb.appendChild(sk); }
    else { cb.appendChild(netAnim()); cb.appendChild(sgAnim()); cb.appendChild(isManagedLab() ? mgSysCard() : sysAnimCard()); }
    cb.appendChild(hclDiagram());
    var cd = fold("code", "โค้ด HCL (" + hcl().split(/\n\n(?=# )/).length + " บล็อก) · กดชื่อ resource สีที่ขีดเส้นประเพื่อกระโดดไปบล็อกที่อ้างถึง"); cd.className = "fold card"; cd.style.padding = "8px 14px 12px"; cd.appendChild(hclView()); cb.appendChild(cd);
  } else if (tab === "rules") {
    cb.appendChild(rulesView());
  } else {
    var sc = [["static", "เว็บ static ครบทั้งชุด (dev + prd)", "สร้างตาม **labs/01-static-site/**: S3 ส่วนตัว ×2 + **CloudFront** (OAC) + **Route 53** + ใบรับรอง **ACM** (us-east-1) · เปิด `https://www.pharmacy.example.com` (prd) และ `https://dev.pharmacy.example.com` (dev) ที่ **Browser**"],
      ["static-base", "เว็บ static: มีโซน + ใบรับรอง แล้วสร้างเอง", "มี **Route 53 zone**, **ใบรับรอง Issued (us-east-1)** และ OAC แล้ว · ลองสร้าง **S3 bucket → อัปโหลด → CloudFront (wizard) → Route 53 record** ตามลำดับ แล้วเทียบกับ Lab › Terraform"],
      ["static-403", "ล้ม: prd เปิดแล้ว 403 AccessDenied (bucket policy ผิด)", "dev ปกติ แต่ **prd 403** · bucket policy ของ prd อ้าง `AWS:SourceArn` ของ distribution ==dev== · ดูที่ Browser แล้วไล่ดู OAC → bucket policy → distribution ID"],
      ["static-cert", "ล้ม: ใบรับรองผิด region ผูก CloudFront ไม่ได้", "ใบรับรองถูกขอใน ==ap-southeast-1== (ไม่ใช่ us-east-1) · ลอง CloudFront › Edit settings ใส่ alias + ใบรับรอง จะเจอ `InvalidViewerCertificate` · แก้โดยขอใบรับรองใหม่ที่ us-east-1"],
      ["static-cert-pending", "ล้ม: ใบรับรอง Pending validation (ยังไม่สร้าง CNAME)", "ขอใบรับรองที่ us-east-1 แล้ว แต่ยัง ==Pending validation== เพราะไม่มี CNAME ตรวจสอบใน Route 53 · ลองผูกกับ CloudFront จะ error · แก้ที่ ACM › Create records in Route 53"],
      ["static-stale", "ล้ม: ปล่อยเวอร์ชันใหม่แล้วผู้ใช้ยังเห็นของเก่า (cache)", "S3 มี index.html ==version 3== แล้ว แต่ prd ยังตอบ ==version 2== จาก edge cache (X-Cache: Hit) · Hard refresh ไม่ช่วย · แก้ด้วย **Create invalidation** `/*`"],
      ["ecs", "ECS Fargate ครบทั้งชุด (dev + prd)", "สร้างตาม **labs/02-ecs-fargate/**: ECR + ALB + ECS Fargate + RDS Postgres · dev 1 task/prd 2 task · เปิด API ที่ Browser", ""],
      ["ecs-base", "ECS: มีเครือข่าย/ECR/ALB/RDS/role แล้วสร้าง cluster-task-service เอง", "มีทุกอย่างยกเว้น log group, cluster, task definition, service · ลองสร้างเองใน ECS", ""],
      ["ecs-pull", "ECS ล้ม: task ดึง image ไม่ได้ (private subnet ไม่มี NAT)", "ไม่มีเส้นทาง 0.0.0.0/0 → NAT · เปิด service › Health ดูขั้นที่ ✗", ""],
      ["ecs-image", "ECS ล้ม: image tag ไม่มีใน ECR", "ยังไม่ได้ docker push v1.0.0 · CannotPullContainerError", ""],
      ["ecs-role", "ECS ล้ม: execution role ขาด AmazonECSTaskExecutionRolePolicy", "ดึง image/เขียน log ไม่ได้ · แก้ที่ IAM", ""],
      ["ecs-db", "ECS ล้ม: SG ของ DB ไม่รับจาก task", "แอปต่อ Postgres ไม่ได้ ดู Logs ของ task", ""],
      ["ecs-vpce", "ECS ไม่มี NAT: ใช้ VPC endpoints แทน (ผ่าน)", "private subnet ไม่มี 0.0.0.0/0 → NAT แต่มี endpoint **ecr.api + ecr.dkr + s3 (gateway) + logs + secretsmanager** · task ขึ้นปกติ · ถูกกว่า NAT ถ้า traffic น้อย", ""],
      ["ecs-vpce-s3", "ECS ล้ม: มี endpoint ECR แต่ลืม S3 gateway endpoint", "ดึง manifest ได้แต่ดึง layer ไม่ได้ (layer อยู่บน S3) · `CannotPullContainerError … starport-layer-bucket … i/o timeout`", ""],
      ["ecs-vpce-logs", "ECS ล้ม: ไม่มี endpoint ของ CloudWatch Logs", "task เริ่มไม่ได้เพราะ awslogs ต่อ logs. ไม่ได้ · `failed to validate logger args … i/o timeout`", ""],
      ["ecs-health", "ECS ล้ม: prd health check path ผิด (/health)", "task ขึ้นแต่ ALB ตรวจ /health ได้ 404 · ถูก stop วนซ้ำ", ""],
      ["sls", "Serverless API ครบทั้งชุด (dev + prd)", "สร้างตาม **labs/03-serverless/**: API Gateway (HTTP API) + **Lambda** + **DynamoDB** · เปิด `GET /drugs` ที่ Browser · ไม่มีเซิร์ฟเวอร์ให้ดูแลเลย", ""],
      ["sls-base", "Serverless: มี table/role/log group แล้วสร้าง Lambda + API เอง", "มี DynamoDB ×2 (+ข้อมูลตัวอย่าง), role ของ Lambda, log group · ลองสร้าง function → API → permission เอง", ""],
      ["sls-perm", "Serverless ล้ม: Lambda ไม่มีสิทธิ์ DynamoDB (prd 500)", "role ของ prd ไม่มี policy แตะ DynamoDB · API ตอบ 500 · ต้องไปอ่าน log ใน CloudWatch", ""],
      ["sls-invoke", "Serverless ล้ม: API Gateway เรียก Lambda ไม่ได้ (ลืม permission)", "prd ไม่มี `aws_lambda_permission` · 500 แต่ ==Lambda ไม่เคยถูกเรียก (ไม่มี log)== · ความต่างระหว่าง console กับ Terraform", ""],
      ["sls-route", "Serverless ล้ม: route พิมพ์ผิด (GET /drug) → 404", "stage/route ไม่ตรงกับ URL ที่เรียก · 404 {\"message\":\"Not Found\"}", ""],
      ["sls-table", "Serverless ล้ม: TABLE_NAME ผิดชื่อ table", "env var ชี้ table ที่ไม่มี · ResourceNotFoundException ใน log · 500", ""],
      ["cd", "CI/CD ครบทั้งชุด: GitHub → CodeBuild → ECR → ECS dev → อนุมัติ → prd", "สร้างตาม **labs/04-cicd/** บน ECS ของ lab 02: connection (Available) + CodeBuild + pipeline 5 ขั้น · execution แรกผ่านทั้ง dev และ prd แล้ว · กด **Release change** เพื่อปล่อยรอบใหม่", ""],
      ["cd-base", "CI/CD: มี connection/role/build project แล้วสร้าง pipeline เอง", "มี bucket, role, connection (Available), CodeBuild project · ลองสร้าง pipeline ใน CodePipeline", ""],
      ["cd-conn", "CI/CD ล้ม: GitHub connection ยัง Pending", "Terraform สร้าง connection ได้แต่ต้อง authorize เอง · ขั้น Source ล้ม", ""],
      ["cd-docker", "CI/CD ล้ม: CodeBuild ไม่เปิด Privileged mode", "`Cannot connect to the Docker daemon` ตอน docker build", ""],
      ["cd-ecr", "CI/CD ล้ม: role ของ CodeBuild ไม่มีสิทธิ์ ECR", "AccessDeniedException ตอน login ECR · แก้ที่ IAM แล้ว Retry stage", ""],
      ["cd-deploy", "CI/CD ล้ม: CONTAINER_NAME ไม่ตรง task definition", "build ผ่านแต่ขั้น Deploy dev หา container ไม่เจอ", ""],
      ["cd-pass", "CI/CD ล้ม: role ของ pipeline ไม่มี iam:PassRole", "Deploy dev ล้ม · is not authorized to perform: iam:PassRole", ""],
      ["managed", "Managed: EKS + RDS + SSM ครบทั้งชุด", "สร้างตาม **terraform-managed/**: EKS + node group 3 AZ · RDS Multi-AZ · Jenkins/SonarQube private เข้าผ่าน **SSM** (ไม่มี bastion) · ไปดู **EKS, RDS, SSM** บนแถบบน แล้วเทียบ `HCL` ที่ Lab › Terraform"],
      ["managed-base", "Managed: เตรียมเครือข่าย แล้วสร้าง EKS/RDS เอง", "มี VPC 3 AZ, NAT, SG, role ครบ **แต่ยังไม่มี EKS / RDS / ALB** · ลองกด **EKS › Create cluster → Add node group** และ **RDS › Subnet groups → Create database** ตามลำดับที่ Terraform ใช้"],
      ["managed-badrole", "Managed ล้ม: node ไม่ join (role ขาด CNI policy)", "role ของ node ขาด `AmazonEKS_CNI_Policy` · สร้าง cluster แล้วกด **Add node group** จะเจอ ==NodeCreationFailure== · หา policy ที่ขาดแล้วแก้ที่ IAM"],
      ["managed-nonat", "Managed ล้ม: private subnet ไม่มี NAT", "ครบทั้งชุดแต่ลบเส้นทาง `0.0.0.0/0 → NAT` ของ private · เปิด **SSM › Session Manager** ดูเครื่องออฟไลน์ แล้วหาว่าขาดอะไร"],
      ["full", "Lab ครบทั้งชุด", "สร้าง**ทุกอย่าง**ตามโค้ด Terraform · ใช้ดูหน้า **Instances, Connect, Load balancers** และเทียบ `HCL`"],
      ["noassoc", "ลืมผูกซอยกับ route table", "ทุกอย่างครบ **ยกเว้น Subnet associations** · ลอง Connect เครื่องไหนก็ได้ จะเจอ ==timeout== ให้หาว่าติดที่ข้อไหน"],
      ["ecr", "ECR: Jenkins push แล้ว k8s pull", "ครบทั้งชุด + มี image v1.0.0 ใน repo แล้ว · ไปที่ **ECR › Repositories › Actions › Docker push / pull** ลองรันจาก k8s (ReadOnly) ว่า ==push ได้ไหม== และติ๊ก token หมดอายุ"],
      ["ready", "พร้อมปล่อย: Terraform + Ansible เสร็จแล้ว รอ git push", "ตั้งไว้ให้แล้ว: `terraform apply` + `ansible-playbook site.yml` · **Jenkins** (admin, credentials 3 ตัว, job 2 ตัว) · **SonarQube** (token) · **ArgoCD** (4 แอป) ➜ เหลือให้คุณ ==git push== → Jenkins build → ArgoCD → เปิดเว็บ pharmacy ผ่านลิงก์ ALB ใน Browser (แทนที่สถานะปัจจุบันทั้งหมด)"],
      ["ans", "Ansible: พร้อมรัน (Terraform เสร็จแล้ว)", "`terraform apply` เสร็จแล้ว **เครื่องขึ้นครบ 10 ตัว** (bastion + 9 เครื่องภายใน) · Terminal อยู่ในโฟลเดอร์ `ansible/` · ลอง `ansible-inventory --graph` แล้ว `ansible-playbook site.yml` (เข้าเครื่องภายใน ==ผ่าน bastion==) ดูผลที่ **Lab › Ansible**"],
      ["ans-half", "Ansible: ทำไปครึ่งทาง (db + k8s เสร็จแล้ว)", "รัน `db.yml` กับ `k8s.yml` ให้แล้ว · เหลือ `sonarqube.yml` และ `jenkins.yml` · ลองรัน **ทีละบทบาท** แล้วเช็กว่า `site.yml` ซ้ำจะ ==ข้ามสิ่งที่เสร็จแล้ว=="],
      ["ans-sg", "Ansible ล้ม: SG เปิด SSH ให้ IP ผิด", "เครื่องขึ้นครบแต่ **bastion** เปิด SSH ให้ 203.0.113.99 เท่านั้น · `ansible-playbook` จะเจอ ==UNREACHABLE ทุกเครื่อง== (ทุกเครื่องต้องผ่าน bastion) · หาสาเหตุแล้วแก้ที่ **EC2 › Security groups › pharmacy-bastion**"],
      ["ans-nonat", "Ansible ล้ม: private subnet ไม่มี NAT", "ลบเส้นทาง `0.0.0.0/0 → NAT` ของ route table **private** · **k8s / DB** (ไม่มี public IP) ออกเน็ตไม่ได้ ==apt ล้ม== แต่ Jenkins/SonarQube (public) ยังผ่าน · แก้ที่ **VPC › Route tables › pharmacy-private** เพิ่มเส้นทาง NAT กลับ"],
      ["ans-noegress", "Ansible ล้ม: เครื่องออกเน็ตไม่ได้", "ลบ **outbound** ของ SG ที่ Jenkins ใช้ · task ที่ต้อง `apt` / `curl` / `docker` จะ ==ล้ม== · แก้ outbound เป็น All traffic 0.0.0.0/0 แล้วรัน `jenkins.yml` ใหม่"],
      ["wrongip", "SG เปิด SSH ให้ IP ผิด", "ลอง Connect ดูว่าเจออะไร · เทียบกับเมื่อแก้ **My IP** ด้านบนเป็น 203.0.113.99 (IP ที่กฎอนุญาต)"]];
    UI.scen = UI.scen || { user: "maht25102542" };
    function readyLoad() {
      var r = buildReady(UI.scen.user), u = r.user, G = "https://github.com/" + u + "/";
      TERM.lines = ["โหลด 'พร้อมปล่อย' แล้ว: Terraform apply + Ansible site.yml เสร็จ, Jenkins/SonarQube/ArgoCD ตั้งค่าไว้แล้ว (GitHub user = " + u + ")", "",
        "ลิงก์ (แท็บ Browser):  Jenkins http://" + r.jenkins + ":8080  (admin / Pharmacy-Lab-2026!)  ·  SonarQube http://" + r.sonar + ":9000  ·  ArgoCD " + r.argocd, "",
        "ขั้นถัดไป ทำตามลำดับ:", "  1) git push 3 repo:  cd repo-manifests / repo-backend / repo-frontend  แล้วทำ  git init -b main · git add . · git commit -m initial · git remote add origin " + G + "<repo>.git · git push -u origin main", "     (repo-backend กับ repo-frontend ติด tag ด้วย:  git tag v1.0.0 · git push origin v1.0.0)",
        "  2) Jenkins (แท็บ Browser): job pharmacy-backend → Build with Parameters (dev, v1.0.0) แล้วทำ pharmacy-frontend  [backend ก่อน frontend]",
        "  3) ArgoCD: แอป dev sync เอง (ถ้ายัง ให้ kubectl apply -f https://raw.githubusercontent.com/" + u + "/pharmacy-manifests/main/argocd-apps/apps.yaml บน pharmacy-k8s-1)",
        "  4) เปิด http://" + r.alb + ":8080 (dev) ในแท็บ Browser: เพิ่มยา/ปรับสต็อกได้", ""];
      TERM.hist = []; TERM.hi = 0; TERM.ask = null; UI.sel = {}; UI.form = null; flash("ok", "โหลดสถานการณ์ 'พร้อมปล่อย' แล้ว อ่านขั้นถัดไปใน Terminal"); go("term", {}, "Laptop");
    }
    function ansLoad(kind) {
      buildAnsibleLab(kind);
      var G = { ans: ["โหลด 'Ansible พร้อมรัน' แล้ว: `terraform apply` เสร็จ (เครื่องขึ้นครบ 10 ตัว) · Terminal อยู่ที่ ansible/", "", "ลองตามลำดับ:", "  1) ansible-inventory --graph        ดูว่าเจอเครื่อง/กลุ่ม role ครบไหม (มี role_bastion + กลุ่ม internal)", "  2) ansible-playbook db.yml            รันทีละบทบาท (หรือ ansible-playbook site.yml ทั้งชุด)", "  3) ดูโค้ด + แอนิเมชันที่ Lab › Ansible · ดูผลที่ EC2 / Browser", ""],
        "ans-half": ["โหลด 'Ansible ทำไปครึ่งทาง' แล้ว: db.yml กับ k8s.yml รันเสร็จแล้ว", "", "ลองตามลำดับ:", "  1) ansible-playbook sonarqube.yml", "  2) ansible-playbook jenkins.yml", "  3) ansible-playbook site.yml         รันทั้งชุดซ้ำ ดูว่าข้ามสิ่งที่เสร็จแล้ว (changed น้อยลง)", ""],
        "ans-sg": ["โหลด 'Ansible ล้ม: SG ผิด IP' แล้ว: เครื่องขึ้นครบ แต่ SG ของ bastion เปิด SSH ให้ 203.0.113.99 เท่านั้น", "", "ลองตามลำดับ:", "  1) ansible-inventory --graph         ยังเห็นเครื่องครบ (ถาม AWS ได้)", "  2) ansible-playbook jenkins.yml      จะเจอ UNREACHABLE (ต่อ bastion ไม่ได้ ทุกเครื่องเลยเข้าไม่ได้)", "  3) หาสาเหตุ → แก้ที่ EC2 › Security groups › pharmacy-bastion › Inbound (SSH = My IP) → รันใหม่", "  4) ลองเอง: ssh -J ubuntu@<bastion public IP> -i ~/.ssh/id_ed25519 ubuntu@<private IP ของ k8s-1>", ""],
        "ans-nonat": ["โหลด 'Ansible ล้ม: ไม่มี NAT' แล้ว: route table private ไม่มีเส้นทางออกเน็ต", "", "ลองตามลำดับ:", "  1) ansible-playbook db.yml           SSH ผ่าน bastion ได้ แต่ apt ล้ม (Network is unreachable)", "  2) ansible-playbook jenkins.yml      ผ่าน เพราะ Jenkins อยู่ public subnet ออกทาง IGW", "  3) แก้ที่ VPC › Route tables › pharmacy-private › Edit routes: 0.0.0.0/0 → NAT gateway แล้วรัน db.yml ใหม่", ""],
        "ans-noegress": ["โหลด 'Ansible ล้ม: เครื่องออกเน็ตไม่ได้' แล้ว: ลบ outbound ของ SG ที่ Jenkins ใช้", "", "ลองตามลำดับ:", "  1) ansible-playbook jenkins.yml      SSH เข้าได้ แต่ task apt/docker ล้ม", "  2) แก้ที่ EC2 › Security groups › Outbound rules เป็น All traffic 0.0.0.0/0", "  3) รัน ansible-playbook jenkins.yml ใหม่", ""] }[kind];
      TERM.lines = G; TERM.hist = []; TERM.hi = 0; TERM.ask = null; UI.sel = {}; UI.form = null; flash("ok", "โหลดตัวอย่าง Ansible แล้ว อ่านขั้นถัดไปใน Terminal"); go("term", {}, "Laptop");
    }
    var scenCard = (function (s) { var extra = s[0] === "ready" ? h("div", { cls: "f", style: "margin:6px 0" }, [h("label", { cls: "l", text: "GitHub user ที่จะใช้ push" }), exPick([["maht25102542", "maht25102542"], ["me", "me"], ["demo-user", "demo-user"]], function () { return UI.scen.user; }, function (v) { UI.scen.user = v; }, UI.scen, "_cu", "ชื่อ GitHub ของคุณ", "GitHub user", false)]) : null; return h("div", {}, [h("p", {}, [h("b", { text: s[1] }), h("br")].concat(rich(s[2]))), extra, h("button", { cls: "btn pri", type: "button", text: "โหลด", onclick: function () { try { if (s[0] === "ready") { readyLoad(); return; } if (/^ans/.test(s[0])) { ansLoad(s[0]); return; } if (/^static/.test(s[0])) { buildStatic(s[0]); UI.sel = {}; UI.form = null; flash("ok", "โหลด “" + s[1] + "” แล้ว ไปดูที่แถบ S3 / CloudFront / Route 53 / ACM และเปิดเว็บที่ Browser"); go(s[0] === "static-base" ? "bucket-create" : "cfds", {}, s[0] === "static-base" ? "S3" : "CloudFront"); return; } if (/^cd/.test(s[0])) { buildCd(s[0]); UI.sel = {}; UI.form = null; flash("ok", "โหลด '" + s[1] + "' แล้ว ไปดูที่ CodePipeline / CodeBuild"); go(s[0] === "cd-base" ? "pipe-create" : "pipes", {}, "CodePipeline"); return; } if (/^sls/.test(s[0])) { buildSls(s[0]); UI.sel = {}; UI.form = null; flash("ok", "โหลด '" + s[1] + "' แล้ว ไปดูที่แถบ Lambda / API Gateway / DynamoDB และเปิด API ที่ Browser"); go(s[0] === "sls-base" ? "lam-create" : "apis", {}, s[0] === "sls-base" ? "Lambda" : "API Gateway"); return; } if (/^ecs/.test(s[0])) { buildEcs(s[0]); UI.sel = {}; UI.form = null; flash("ok", "โหลด '" + s[1] + "' แล้ว ไปดูที่แถบ ECS / CloudWatch / ECR"); go(s[0] === "ecs-base" ? "ecs-create" : "ecsc", {}, "ECS"); return; } if (/^managed/.test(s[0])) { buildManaged(s[0]); UI.sel = {}; UI.form = null; flash("ok", "โหลด '" + s[1] + "' แล้ว ไปดูที่แถบ EKS / RDS / SSM"); go(s[0] === "managed-base" ? "eks-create" : "eks", {}, "EKS"); return; } buildLab(s[0]); UI.sel = {}; UI.form = null; flash("ok", "โหลด '" + s[1] + "' แล้ว ไปดูที่ EC2 › Instances"); go("insts", {}, "EC2"); } catch (e) { flash("bad", "โหลดไม่สำเร็จ: " + e.message); render(); } } })]); });
    scenGroups(cb, sc, scenCard);
  }
  return cb;
}

[["lab-check", "check", "ตรวจกับ Terraform"], ["lab-hcl", "hcl", "Terraform"], ["lab-flow", "flow", "ลำดับการปล่อย (Jenkins → ArgoCD)"], ["lab-rules", "rules", "กฎที่จำลอง"], ["lab-scen", "scen", "ตัวอย่างสำเร็จรูป"]].forEach(function (t) {
  PAGES[t[0]] = function () { return h("div", {}, [crumbEl("Lab › " + t[2]), h("h1", { text: t[2] }), h("div", { cls: "card" }, [labBody(t[1])])]); };
});

// ---- top bar controls
document.getElementById("myip").addEventListener("change", function (e) { var v = e.target.value.trim(); if (ip2n(v) === null) { flash("bad", "My IP ไม่ถูกต้อง"); e.target.value = S.myIp; } else S.myIp = v; render(); });
document.getElementById("acct").addEventListener("change", function (e) { S.acct = e.target.value; S.newAcct = S.acct === "free"; render(); });
(function () { var sel = document.getElementById("theme"), saved = ""; try { saved = sessionStorage.getItem("console-lab-theme") || ""; } catch (e) {} sel.value = saved; if (saved) document.documentElement.setAttribute("data-theme", saved);
  sel.addEventListener("change", function (e) { var v = e.target.value; if (v) document.documentElement.setAttribute("data-theme", v); else document.documentElement.removeAttribute("data-theme"); try { sessionStorage.setItem("console-lab-theme", v); } catch (x) {} }); })();
document.getElementById("speedsel").addEventListener("change", function (e) { S.speed = e.target.value; save(); render(); });
document.getElementById("reset").addEventListener("click", function () { fresh(); UI.sel = {}; UI.form = null; UI.held = null; flash("info", "ล้างสถานะแล้ว เหลือแค่ default VPC เหมือนบัญชีใหม่"); go("vpc-dash", {}, "VPC"); });
load(); render();
