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
    ["Virtual private cloud", [["vpcs", "Your VPCs"], ["subnets", "Subnets"], ["rtbs", "Route tables"], ["igws", "Internet gateways"], ["nats", "NAT gateways"], [null, "Egress-only internet gateways"], [null, "Carrier gateways"], [null, "DHCP option sets"], [null, "Elastic IPs"], [null, "Managed prefix lists"], [null, "NAT gateways"], [null, "Peering connections"]]],
    ["Security", [[null, "Network ACLs"], ["sgs", "Security groups"]]]],
  EC2: [["", [["ec2-dash", "Dashboard"], [null, "EC2 Global View"], [null, "Events"]]],
    ["Instances", [["insts", "Instances"], ["itypes", "Instance Types"], [null, "Launch Templates"], [null, "Spot Requests"], [null, "Savings Plans"], [null, "Reserved Instances"], [null, "Dedicated Hosts"], [null, "Capacity Reservations"]]],
    ["Images", [[null, "AMIs"], [null, "AMI Catalog"]]],
    ["Elastic Block Store", [["volumes", "Volumes"], [null, "Snapshots"], [null, "Lifecycle Manager"]]],
    ["Network & Security", [["sgs", "Security Groups"], ["eips", "Elastic IPs"], [null, "Placement Groups"], ["keys", "Key Pairs"], [null, "Network Interfaces"]]],
    ["Load Balancing", [["albs", "Load Balancers"], ["tgs", "Target Groups"], [null, "Trust Stores"]]],
    ["Auto Scaling", [[null, "Auto Scaling Groups"]]]],
  IAM: [["", [[null, "Dashboard"]]], ["Access management", [[null, "User groups"], ["users", "Users"], ["roles", "Roles"], ["policies", "Policies"], [null, "Identity providers"], [null, "Account settings"]]]],
  Laptop: [["เครื่องของคุณ (จำลอง)", [["term", "Terminal"], ["files", "Files & editor"]]]],
  ECR: [["Private registry", [["repos", "Repositories"], [null, "Features & Settings"]]], ["Public registry", [[null, "Repositories"]]]]
};
var NAVHOME = { VPC: "vpc-dash", EC2: "ec2-dash", IAM: "roles", ECR: "repos", Laptop: "term" };
UI = { svc: "VPC", page: "vpc-dash", params: {}, sel: {}, filter: {}, dtab: {}, form: null, menu: false, banner: null, tab: "check" };

function navHas(svc, page) { return NAV[svc].some(function (g) { return g[1].some(function (p) { return p[0] === page; }); }); }
function go(page, params, svc) {
  UI.page = page; UI.params = params || {}; UI.form = null; UI.menu = false;
  if (page !== "ak-retrieve") { UI.secrets = {}; UI.showSecret = false; }
  if (svc) UI.svc = svc; else if (!navHas(UI.svc, page)) { for (var s in NAV) if (navHas(s, page)) { UI.svc = s; break; } }
  render();
}
function flash(kind, msg) { UI.banner = { kind: kind, msg: msg }; }
function crumbEl(text) {
  var parts = String(text).split(" › "), box = h("div", { cls: "crumb" });
  parts.forEach(function (p, i) {
    if (i) box.appendChild(document.createTextNode(" › "));
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
  var y = window.scrollY; save();
  document.getElementById("myip").value = S.myIp; document.getElementById("acct").value = S.acct || "normal";
  var sv = document.getElementById("svc"); sv.textContent = "";
  Object.keys(NAV).forEach(function (k) { sv.appendChild(h("button", { type: "button", text: k, "aria-current": String(k === UI.svc), onclick: function () { go(NAVHOME[k], {}, k); } })); });
  var nv = document.getElementById("nav"); nv.textContent = "";
  NAV[UI.svc].forEach(function (g) {
    if (g[0]) nv.appendChild(h("div", { cls: "grp", text: g[0] }));
    g[1].forEach(function (p) {
      var on = !!p[0] && (UI.page === p[0] || UI.params.from === p[0]);
      nv.appendChild(h("button", { type: "button", text: p[1], cls: p[0] ? "" : "off", title: p[0] ? "" : "ยังไม่ได้จำลองหน้านี้", "aria-current": String(on), onclick: function () { if (p[0]) go(p[0], {}, UI.svc); else { flash("info", "หน้า \"" + p[1] + "\" มีอยู่ใน console จริงแต่ยังไม่ได้จำลอง"); render(); } } }));
    });
  });
  var m = document.getElementById("main"); m.textContent = "";
  if (UI.banner) { m.appendChild(h("div", { cls: "alert " + UI.banner.kind, text: UI.banner.msg, role: "status" })); UI.banner = null; }
  var P = PAGES[UI.page]; m.appendChild(P ? P() : h("p", { text: "ไม่พบหน้า" }));
  renderLab();
  window.scrollTo(0, y);
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
  inp.addEventListener("input", function () {
    var q = inp.value.trim(); box.textContent = ""; if (!q) { box.hidden = true; return; }
    var r = searchHits(q);
    if (r.nav.length) box.appendChild(h("div", { cls: "gh", text: "Services / Features" }));
    r.nav.forEach(function (x) { box.appendChild(h("button", { type: "button", text: x.label, onclick: function () { inp.value = ""; close(); go(x.page, {}, x.svc); } })); });
    if (r.res.length) box.appendChild(h("div", { cls: "gh", text: "Resources" }));
    r.res.forEach(function (x) { box.appendChild(h("button", { type: "button", text: x.label, onclick: function () { inp.value = ""; close(); go("detail", { kind: x.kind, id: x.id, from: LK[x.kind] }); } })); });
    if (!r.nav.length && !r.res.length) box.appendChild(h("div", { cls: "gh", text: "ไม่พบผลลัพธ์" }));
    box.hidden = false;
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".gsearch")) close(); if (!e.target.closest(".regwrap")) document.getElementById("regmenu").hidden = true; });
  document.getElementById("regbtn").addEventListener("click", function () { var m = document.getElementById("regmenu"); m.hidden = !m.hidden; });
})();

// ---- generic list page
function actionMenu(acts, sel, from) {
  var out = [];
  if (!acts || !acts.length) return out;
  var items = sel ? acts.filter(function (a) { return !a.when || a.when(sel); }) : [];
  out.push(h("button", { cls: "btn", type: "button", text: "Actions ▾", disabled: !sel || !items.length, onclick: function () { UI.menu = !UI.menu; render(); } }));
  if (UI.menu && sel) out.push(h("div", { cls: "menu" }, items.map(function (a) {
    return h("button", { type: "button", text: a.label, onclick: function () {
      if (a.run) { var x = a.run(sel); UI.menu = false; flash(x.errors ? "bad" : "ok", x.errors ? Object.keys(x.errors).map(function (k) { return x.errors[k]; }).join(" · ") : a.msg); render(); }
      else go(a.page, { id: sel.id, from: from, kind: a.kind });
    } });
  })));
  return out;
}
function listPage(o) {
  var all = o.rows(), selId = UI.sel[o.key], sel = all.filter(function (r) { return r.id === selId; })[0];
  var wrap = h("div");
  wrap.appendChild(crumbEl(o.crumb));
  var acts = h("div", { cls: "sp" }, actionMenu(o.actions, sel, o.key));
  (o.create || []).forEach(function (c) { acts.appendChild(h("button", { cls: "btn pri", type: "button", text: c.label, onclick: function () { go(c.page, { from: o.key }); } })); });
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: o.title + " (" + (sel ? 1 : 0) + "/" + all.length + ")" }), acts]));
  var tbody = h("tbody");
  function pick(r) { UI.sel[o.key] = r.id === UI.sel[o.key] ? null : r.id; UI.menu = false; render(); }
  function fill() {
    var q = (UI.filter[o.key] || "").toLowerCase(); tbody.textContent = "";
    var rows = q ? all.filter(function (r) { return (r.id + " " + o.cols.map(function (c) { var v = c[1](r); return typeof v === "string" ? v : (v && v.textContent) || ""; }).join(" ")).toLowerCase().indexOf(q) >= 0; }) : all;
    if (!rows.length) { tbody.appendChild(h("tr", {}, [h("td", { cls: "empty", colspan: String(o.cols.length + 1), text: all.length ? "ไม่มีรายการที่ตรงกับตัวกรอง" : (o.empty || "ยังไม่มีรายการ") })])); return; }
    rows.forEach(function (r) {
      var cells = [h("td", {}, [h("input", { type: "checkbox", checked: r.id === selId, "aria-label": "เลือก " + nm(r), onclick: function (e) { e.stopPropagation(); }, onchange: function () { pick(r); } })])];
      o.cols.forEach(function (c, i) {
        var v = c[1](r);
        if (i === 0 && o.kind) { var t = typeof v === "string" && v !== "-" ? v : r.id; v = h("a", { href: "#", cls: "lnk", text: t, onclick: function (e) { e.preventDefault(); e.stopPropagation(); go("detail", { kind: o.kind, id: r.id, from: o.key }); } }); }
        cells.push(h("td", {}, [v]));
      });
      tbody.appendChild(h("tr", { cls: r.id === selId ? "sel" : "", onclick: function () { pick(r); } }, cells));
    });
  }
  fill();
  wrap.appendChild(h("div", { cls: "finder" }, [h("input", { type: "search", placeholder: "Find " + o.title.toLowerCase() + " by attribute or tag", value: UI.filter[o.key] || "", "aria-label": "Filter " + o.title, oninput: function (e) { UI.filter[o.key] = e.target.value; fill(); } })]));
  wrap.appendChild(h("div", { cls: "card" }, [h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, [h("th", { text: "" })].concat(o.cols.map(function (c) { return h("th", { text: c[0] }); })))]), tbody])])]));
  if (sel && o.kind) wrap.appendChild(h("div", { cls: "card" }, [detailView(o.kind, sel, UI.dtab[o.key], function (t) { UI.dtab[o.key] = t; render(); })]));
  else if (all.length) wrap.appendChild(h("p", { cls: "hint", text: "ติ๊กแถวเพื่อดูรายละเอียดด้านล่างและใช้เมนู Actions · กดชื่อหรือ ID เพื่อเปิดหน้ารายละเอียดเต็ม" }));
  return wrap;
}

// ---- resource detail: tabs shared by the bottom panel and the full detail page
function kvDom(list) { var dl = h("dl", { cls: "kv" }); list.forEach(function (kv) { dl.appendChild(h("dt", { text: kv[0] })); dl.appendChild(h("dd", {}, kv[1])); }); return dl; }
function tbl(head, rows, empty) {
  if (!rows.length) return h("p", { cls: "hint", text: empty || "ไม่มีรายการ" });
  return h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, head.map(function (x) { return h("th", { text: x }); }))]), h("tbody", {}, rows.map(function (r) { return h("tr", { style: "cursor:default" }, r.map(function (c) { return h("td", {}, [c]); })); }))])]);
}
function summ(kind, r) { return kvDom(LISTS[LK[kind]]().detail(r)); }
function det(kind) { return function (r) { return summ(kind, r); }; }
function tagsTab(r) { var t = (r.name ? [["Name", r.name]] : []).concat((r.tags || []).map(function (x) { return [x.k, x.v]; })); return tbl(["Key", "Value"], t, "ไม่มี tag"); }
function ruleType(r) { if (r.proto === "-1") return "All traffic"; var m = { 22: "SSH", 80: "HTTP", 443: "HTTPS", 3306: "MYSQL/Aurora" }; return r.from === r.to && m[r.from] ? m[r.from] : "Custom TCP"; }
function srcText(r) { return r.srcKind === "sg" ? nm(find(S.sgs, r.src)) + " (" + r.src.slice(0, 11) + ")" : r.src; }
function ruleRows(list) { return list.map(function (r) { return [ruleType(r), r.proto === "-1" ? "All" : "TCP", r.proto === "-1" ? "All" : (r.from === r.to ? String(r.from) : r.from + " - " + r.to), srcText(r)]; }); }
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
function rtbRoutes(r) { var v = find(S.vpcs, r.vpcId); return tbl(["Destination", "Target", "Status", "Propagated"], [[v.cidr, "local", "Active", "No"]].concat(r.routes.map(function (x) { return [x.dest, x.target.indexOf("igw-") === 0 ? "igw: " + nm(find(S.igws, x.target)) : x.target, "Active", "No"]; }))); }
function rtbAssoc(r) {
  var ex = r.assoc.map(function (id) { return find(S.subnets, id); }).filter(Boolean);
  var imp = S.subnets.filter(function (x) { return x.vpcId === r.vpcId && !S.rtbs.some(function (t) { return !t.main && t.vpcId === r.vpcId && t.assoc.indexOf(x.id) >= 0; }); });
  return h("div", {}, [h("h4", { text: "Explicit subnet associations" }), tbl(["Name", "Subnet ID", "IPv4 CIDR"], ex.map(function (x) { return [x.name || "-", x.id, x.cidr]; }), "ไม่มี"), h("h4", { text: "Subnets without explicit associations" }), tbl(["Name", "Subnet ID", "IPv4 CIDR"], imp.map(function (x) { return [x.name || "-", x.id, x.cidr]; }), "ไม่มี"), h("p", { cls: "hint", text: "ซอยที่ไม่ได้ผูกกับ route table ใดจะใช้ main route table ของ VPC โดยอัตโนมัติ" })]);
}
function subRoute(r) { var rt = subnetRtb(r); return h("div", {}, [h("p", { text: "Route table: " + (rt.main ? "main (" + rt.id + ")" : nm(rt)) }), rtbRoutes(rt)]); }
function sgRules(kind) { return function (r) { return tbl(["Type", "Protocol", "Port range", kind === "in" ? "Source" : "Destination"], ruleRows(kind === "in" ? r.inbound : r.outbound), "ไม่มีกฎ (ปิดทุกอย่าง)"); }; }
function instSec(r) { return h("div", {}, [kvDom([["IAM Role", r.profile || "-"], ["Key pair assigned at launch", r.keyName || "-"]]), r.sgIds.map(function (id) { var g = find(S.sgs, id); return g ? h("div", {}, [h("h4", { text: "Security group: " + g.name }), tbl(["Type", "Protocol", "Port range", "Source"], ruleRows(g.inbound), "ไม่มีกฎขาเข้า")]) : null; })]); }
function instNet(r) { var v = find(S.vpcs, r.vpcId); var dns = v && v.dnsHostnames && v.dnsResolution && r.publicIp ? "ec2-" + r.publicIp.replace(/\./g, "-") + "." + REGION + ".compute.lab.invalid" : "-"; return kvDom([["VPC ID", vname(r.vpcId)], ["Subnet ID", nm(find(S.subnets, r.subnetId))], ["Availability Zone", r.az], ["Private IPv4 addresses", r.privateIp], ["Public IPv4 address", r.publicIp || "-"], ["Public IPv4 DNS", dns], ["Auto-assigned public IP at launch", r.hadPub ? "Yes" : "No"]]); }
function instSto(r) { return tbl(["Volume", "Device", "Size", "Type", "Delete on termination"], [["root volume", "/dev/sda1", r.disk.size + " GiB", r.disk.type, "Yes"]]); }
function tgHealth(r) {
  var lb = S.albs.filter(function (a) { return a.listeners.some(function (l) { return l.tgId === r.id; }); })[0];
  return r.targets.map(function (x) {
    var i = find(S.insts, x.instId), st, code;
    if (!lb) { st = "unused"; code = "Target.NotInUse: Target group is not configured to receive traffic from the load balancer"; }
    else { var row = albHealth(lb).filter(function (q) { return q.t && q.t.id === r.id && q.inst && q.inst.id === x.instId; })[0]; st = row ? row.state : "unused"; code = row ? row.why : ""; }
    return [x.instId, i ? (i.name || "-") : "-", String(x.port), i ? i.az : "-", tagp(st, st === "healthy" ? "ok" : (st === "unused" ? "warn" : "bad")), code || "-"];
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
function roleTrust(r) { return h("pre", { cls: "hcl", text: JSON.stringify({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Principal: { Service: "ec2.amazonaws.com" }, Action: "sts:AssumeRole" }] }, null, 2) }); }
var DET = {
  vpc: [["details", "Details", det("vpc")], ["map", "Resource map", vpcMap], ["cidrs", "CIDRs", function (r) { return tbl(["CIDR", "Type", "Status"], [[r.cidr, "IPv4 (primary)", "Associated"]]); }], ["flow", "Flow logs", null], ["tags", "Tags", tagsTab]],
  subnet: [["details", "Details", det("subnet")], ["flow", "Flow logs", null], ["route", "Route table", subRoute], ["nacl", "Network ACL", null], ["cidrres", "CIDR reservations", null], ["share", "Sharing", null], ["tags", "Tags", tagsTab]],
  rtb: [["details", "Details", det("rtb")], ["routes", "Routes", rtbRoutes], ["assoc", "Subnet associations", rtbAssoc], ["edge", "Edge associations", function () { return h("p", { cls: "hint", text: "ไม่มี" }); }], ["prop", "Route propagation", null], ["tags", "Tags", tagsTab]],
  igw: [["details", "Details", det("igw")], ["tags", "Tags", tagsTab]],
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
function polJson(name) { var d = POLICY_DEF[name]; return d.actions ? h("pre", { cls: "hcl", text: JSON.stringify({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: d.actions.length === 1 ? d.actions[0] : d.actions, Resource: "*" }] }, null, 2) }) : h("p", { cls: "hint", text: "ยังไม่ได้ตรวจเนื้อหา policy นี้กับเอกสาร จึงไม่แสดงและไม่ถูกนับเวลาประเมินสิทธิ์ในตัวจำลอง" }); }
DET.user = [["perm", "Permissions", function (u) { return h("div", {}, [tbl(["Policy name", "Type"], u.policies.map(function (p) { return [p, "AWS managed"]; }), "ไม่มี permission"), h("p", { cls: "hint", text: "เอกสาร IAM แนะนำให้จัดสิทธิ์ผ่าน group แต่แนบ policy ให้ user ตรง ๆ ก็ได้" })]); }], ["groups", "Groups", null], ["tags", "Tags", null], ["sec", "Security credentials", accessKeysTab], ["adv", "Last Accessed", null]];
DET.policy = [["perm", "Permissions", function (r) { return h("div", {}, [kvDom([["Description", r.desc]]), polJson(r.name)]); }], ["used", "Entities attached", function (r) { return tbl(["Type", "Name"], usedBy(r.name), "ยังไม่ได้แนบกับอะไร"); }], ["ver", "Policy versions", null]];
DET.eip = [["details", "Details", det("eip")]];
DET.repo = [["images", "Images", function (r) { return h("div", {}, [kvDom([["URI", r.uri], ["Tag immutability", r.mutable ? "Mutable" : "Immutable"]]), h("h4", { text: "Images (" + r.images.length + ")" }), tbl(["Image tag", "Digest", "Pushed by"], r.images.map(function (x) { return [x.tag, x.digest.slice(0, 19) + "…", x.by]; }), "ยังไม่มี image กด Actions → Docker push / pull เพื่อจำลองการ push"), h("p", { cls: "hint", text: "Actions → View push commands ดูคำสั่งจริง · ใน lab นี้ Jenkins เป็นคน push และ k8s เป็นคน pull" })]); }], ["details", "Details", det("repo")]];
function detailView(kind, r, tab, setTab) {
  var cfg = DET[kind], cur = cfg.filter(function (t) { return t[0] === tab; })[0] || cfg[0], box = h("div");
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
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: (r.name || r.id) }), bar]));
  wrap.appendChild(h("div", { cls: "hint", text: r.id }));
  wrap.appendChild(h("div", { cls: "card" }, [detailView(kind, r, tab, function (t) { UI.params.tab = t; render(); })]));
  return wrap;
};

function tagp(t, k) { return h("span", { cls: "tag " + (k || ""), text: t }); }
function vname(id) { var v = find(S.vpcs, id); return v ? (v.name || v.id) + (v.isDefault ? " (default)" : "") : "-"; }

// ---- generic form
function formPage(o) {
  if (!UI.form || UI.form.name !== o.name) { UI.form = { name: o.name, v: o.init(), errors: {}, step: 0 }; }
  var F = UI.form, V = F.v, wrap = h("div");
  wrap.appendChild(crumbEl(o.crumb));
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: o.title })]));
  if (o.info) wrap.appendChild(h("div", { cls: "alert info", text: o.info }));
  if (o.warn && o.warn(V)) wrap.appendChild(h("div", { cls: "alert warn", text: o.warn(V) }));
  var keys = Object.keys(F.errors);
  if (keys.length) wrap.appendChild(h("div", { cls: "alert bad", role: "alert" }, [h("b", { text: "ตรวจพบ " + keys.length + " ข้อที่ต้องแก้" }), h("ul", {}, keys.map(function (k) { return h("li", { text: F.errors[k] }); }))]));
  var card = h("div", { cls: "card" });
  o.sections(V).forEach(function (sec) {
    if (sec.step != null && sec.step !== F.step) return;
    var s = h("div", { cls: "sec" }); if (sec.t) s.appendChild(h("h2", { text: sec.t }));
    sec.f.forEach(function (f) { if (f && (!f.show || f.show(V))) s.appendChild(field(f, V, F)); });
    card.appendChild(s);
  });
  var last = !o.steps || F.step === o.steps - 1;
  var bar = h("div", { cls: "actions" });
  bar.appendChild(h("button", { cls: "btn", type: "button", text: "Cancel", onclick: function () { go(o.back || UI.params.from || NAVHOME[UI.svc]); } }));
  if (o.steps && F.step > 0) bar.appendChild(h("button", { cls: "btn", type: "button", text: "Previous", onclick: function () { F.step--; render(); } }));
  bar.appendChild(h("button", { cls: "btn pri", type: "button", text: last ? o.submit : "Next", onclick: function () {
    if (!last) { F.step++; F.errors = {}; render(); return; }
    var r = o.onSubmit(V);
    if (r && r.errors) { F.errors = r.errors; render(); return; }
    flash("ok", (r && r.msg) || "สร้างสำเร็จ"); var next = (r && r.next) || o.back || UI.params.from || NAVHOME[UI.svc]; go(next, (r && r.nextParams) || {});
  } }));
  if (o.summary) {
    var side = h("div", { cls: "card side" }, [h("div", { cls: "ch", text: "Summary" }), h("div", { cls: "cb" }, [o.summary(V)]), bar]);
    wrap.appendChild(h("div", { cls: "split" }, [card, side]));
  } else { card.appendChild(bar); wrap.appendChild(card); }
  return wrap;
}
function field(f, V, F) {
  var err = F.errors[f.id], box = h("div", { cls: "f" + (err ? " bad" : "") });
  if (f.type === "custom") { box.appendChild(f.render(V, function () { render(); })); return box; }
  if (f.label) box.appendChild(h("label", { cls: "l", text: f.label + (f.req ? " *" : ""), "for": "f-" + f.id }));
  var opts = f.opts ? f.opts(V) : [];
  if (f.type === "text") box.appendChild(h("input", { type: "text", id: "f-" + f.id, value: V[f.id] == null ? "" : V[f.id], placeholder: f.ph || "", oninput: function (e) { V[f.id] = e.target.value; } }));
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
function inp(r, k, ph, rerender) { return h("input", { type: "text", value: r[k] == null ? "" : r[k], placeholder: ph || "", "aria-label": ph || k, oninput: function (e) { r[k] = e.target.value; } }); }
function sel(r, k, opts, label) { return h("select", { "aria-label": label || k, onchange: function (e) { r[k] = e.target.value; render(); } }, opts.map(function (o) { return h("option", { value: o[0], text: o[1], selected: String(o[0]) === String(r[k]) ? "selected" : null }); })); }
function sgOpts(vpcId, blank) { var a = S.sgs.filter(function (g) { return !vpcId || g.vpcId === vpcId; }).map(function (g) { return [g.id, g.name + " (" + g.id.slice(0, 11) + ")"]; }); return blank ? [["", "เลือก security group"]].concat(a) : a; }
function ruleCols(vpcId, selfId) {
  var T = ["SSH", "HTTP", "HTTPS", "MYSQL/Aurora", "Custom TCP", "All traffic"].map(function (x) { return [x, x]; });
  var SK = ["Custom", "Anywhere-IPv4", "My IP", "Security group"].map(function (x) { return [x, x]; });
  return [
    function (r) { return sel(r, "type", T, "Type"); },
    function (r) { return r.type === "Custom TCP" ? inp(r, "port", "port เช่น 8080 หรือ 30080-30081") : h("div", { cls: "hint", text: r.type === "All traffic" ? "All / 0-65535" : "TCP / " + typeRule(r.type).from }); },
    function (r) { return h("div", {}, [sel(r, "srcKind", SK, "Source"), r.srcKind === "Custom" ? inp(r, "src", "CIDR เช่น 203.0.113.0/24") : (r.srcKind === "Security group" ? sel(r, "src", sgOpts(vpcId, true), "Security group") : h("div", { cls: "hint", text: r.srcKind === "My IP" ? S.myIp + "/32" : "0.0.0.0/0" }))]); }
  ];
}
function ruleEditor(V, key, vpcId, selfId) { return rowsEditor("Inbound rules", V[key], ruleCols(vpcId, selfId), function () { return { type: "SSH", srcKind: "My IP", port: "", src: "" }; }, "Add rule"); }
function ruleRowsFrom(sg) { return sg.inbound.map(function (r) { var t = ruleType(r); return { type: t, port: r.from === r.to ? String(r.from) : r.from + "-" + r.to, srcKind: r.srcKind === "sg" ? "Security group" : "Custom", src: r.src }; }); }

// ---- pages
LISTS.vpcs = function () {
  return ({ key: "vpcs", kind: "vpc", title: "Your VPCs", crumb: "VPC › Your VPCs", create: [{ label: "Create VPC", page: "vpc-create" }], actions: [{ label: "Edit VPC settings", page: "vpc-dns" }, { label: "Delete VPC", page: "del", kind: "vpc" }],
    rows: function () { return S.vpcs; }, cols: [["Name", function (r) { return r.name || "-"; }], ["VPC ID", function (r) { return r.id; }], ["IPv4 CIDR", function (r) { return r.cidr; }], ["Default VPC", function (r) { return r.isDefault ? "Yes" : "No"; }], ["DNS hostnames", function (r) { return r.dnsHostnames ? "Enabled" : "Disabled"; }]],
    detail: function (r) { var g = vpcIgw(r.id), m = rtbMain(r.id); return [["VPC ID", r.id], ["DNS hostnames", r.dnsHostnames ? "Enabled" : "Disabled"], ["DNS resolution", r.dnsResolution ? "Enabled" : "Disabled"], ["Main route table", m ? m.id : "-"], ["Internet gateway", g ? (g.name || g.id) : "ไม่มี"], ["Subnets", String(S.subnets.filter(function (s) { return s.vpcId === r.id; }).length)], ["Default security group", (defaultSg(r.id) || {}).id || "-"]]; } });
};
PAGES["vpc-create"] = function () {
  return formPage({ name: "vpc-create", crumb: "VPC › Your VPCs › Create VPC", title: "Create VPC", back: "vpcs",
    init: function () { return { mode: "VPC only", name: "", cidr: "", ipv6: "No IPv6 CIDR block", tenancy: "Default", azs: 2, pub: 2, priv: 2, nat: "none", s3: false, dnsHost: true, dnsRes: true }; },
    sections: function (V) { return [{ t: "VPC settings", f: [
      { id: "mode", type: "radio", label: "Resources to create", opts: function () { return [["VPC only", "VPC only"], ["VPC and more", "VPC and more"]]; }, hint: "VPC and more สร้าง subnet, internet gateway และ route table ให้ในครั้งเดียว" },
      { id: "name", type: "text", label: V.mode === "VPC only" ? "Name tag" : "Name tag auto-generation (Auto-generate: ใส่ชื่อนำหน้า)", ph: "pharmacy-vpc", hint: "ไม่บังคับ" },
      { id: "cidr", type: "text", label: "IPv4 CIDR block (IPv4 CIDR manual input)", ph: "10.0.0.0/16", req: true },
      { id: "ipv6", type: "radio", label: "IPv6 CIDR block", opts: function () { return [["No IPv6 CIDR block", "No IPv6 CIDR block"], ["Amazon-provided IPv6 CIDR block", "Amazon-provided IPv6 CIDR block", "ไม่จำลอง"]]; } },
      { id: "tenancy", type: "select", label: "Tenancy", opts: function () { return [["Default", "Default"], ["Dedicated", "Dedicated"]]; } },
      { id: "azs", type: "select", label: "Number of Availability Zones (AZs)", show: function (V) { return V.mode === "VPC and more"; }, opts: function () { return [[1, "1"], [2, "2"], [3, "3"]]; } },
      { id: "pub", type: "select", label: "Number of public subnets", show: function (V) { return V.mode === "VPC and more"; }, opts: function () { return [[0, "0"], [1, "1"], [2, "2"], [3, "3"]]; } },
      { id: "priv", type: "select", label: "Number of private subnets", show: function (V) { return V.mode === "VPC and more"; }, opts: function () { return [[0, "0"], [1, "1"], [2, "2"], [3, "3"]]; } },
      { id: "nat", type: "radio", label: "NAT gateways ($)", show: function (V) { return V.mode === "VPC and more"; }, opts: function () { return [["none", "None"], ["1az", "In 1 AZ"], ["perAz", "1 per AZ"]]; }, hint: "NAT gateway คิดเงินรายชั่วโมง (ไม่ใส่ราคา เพราะยังไม่ได้ยืนยัน)" },
      { id: "s3", type: "radio", label: "VPC endpoints", show: function (V) { return V.mode === "VPC and more"; }, opts: function () { return [[false, "None"], [true, "S3 Gateway"]]; } },
      { id: "dnsHost", type: "check", label: "Enable DNS hostnames", show: function (V) { return V.mode === "VPC and more"; } },
      { id: "dnsRes", type: "check", label: "Enable DNS resolution", show: function (V) { return V.mode === "VPC and more"; } }] }]; },
    submit: "Create VPC",
    onSubmit: function (V) { var r = V.mode === "VPC only" ? API.createVpc({ name: V.name, cidr: V.cidr, dns: false }) : API.createVpcAndMore({ name: V.name, cidr: V.cidr, azs: V.azs, pub: V.pub, priv: V.priv, nat: V.nat, s3: V.s3 === true || V.s3 === "true", dnsHost: V.dnsHost, dnsRes: V.dnsRes }); if (r.errors) return r; UI.sel.vpcs = r.res.id; return { msg: "สร้าง VPC " + r.res.id + " แล้ว" + (V.mode === "VPC only" ? " (มี main route table และ default security group มาให้อัตโนมัติ)" : " พร้อมซอย internet gateway และ route table") }; } });
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
    rows: function () { return S.subnets; }, cols: [["Name", function (r) { return r.name || "-"; }], ["Subnet ID", function (r) { return r.id; }], ["VPC", function (r) { return vname(r.vpcId); }], ["IPv4 CIDR", function (r) { return r.cidr; }], ["Availability Zone", function (r) { return r.az; }], ["Auto-assign public IP", function (r) { return r.autoIp ? "Yes" : "No"; }]],
    detail: function (r) { var rt = subnetRtb(r); return [["Route table", rt ? (rt.main ? "main (" + rt.id + ")" : nm(rt)) : "-"], ["เส้นทางออกอินเทอร์เน็ต", hasIgwRoute(rt) ? tagp("Public subnet (มีเส้นทางตรงไป internet gateway)", "ok") : tagp("Private subnet (ไม่มีเส้นทางตรง)", "warn")], ["Auto-assign public IPv4", r.autoIp ? "Enabled" : "Disabled"]]; } });
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
            h("div", { cls: "f" + (e ? " bad" : "") }, [h("label", { cls: "l", text: "IPv4 subnet CIDR block (Manual input)" }), inp(s, "cidr", "10.0." + (i + 1) + ".0/24"), e ? h("div", { cls: "err", text: e }) : null]),
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
    detail: function (r) { return [["Internet gateway ID", r.id], ["State", r.vpcId ? "Attached" : "Detached"], ["VPC ID", r.vpcId ? vname(r.vpcId) : "-"]]; }, rows: function () { return S.igws; }, cols: [["Name", function (r) { return r.name || "-"; }], ["Internet gateway ID", function (r) { return r.id; }], ["State", function (r) { return r.vpcId ? tagp("Attached", "ok") : tagp("Detached", "warn"); }], ["VPC ID", function (r) { return r.vpcId ? vname(r.vpcId) : "-"; }]] });
};
LISTS.nats = function () {
  return ({ key: "nats", kind: "nat", title: "NAT gateways", crumb: "VPC › NAT gateways", create: [], actions: [{ label: "Delete NAT gateway", page: "del", kind: "nat" }],
    detail: function (r) { return [["NAT gateway ID", r.id], ["State", r.state], ["VPC", vname(r.vpcId)], ["Subnet", r.subnetId], ["Elastic IP allocation ID", r.eipId]]; }, rows: function () { return S.nats; },
    cols: [["Name", function (r) { return r.name || "-"; }], ["NAT gateway ID", function (r) { return r.id; }], ["State", function (r) { return tagp(r.state, "ok"); }], ["VPC", function (r) { return vname(r.vpcId); }], ["Subnet", function (r) { return r.subnetId; }]] });
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
LISTS.rtbs = function () {
  return ({ key: "rtbs", kind: "rtb", title: "Route tables", crumb: "VPC › Route tables", create: [{ label: "Create route table", page: "rtb-create" }], actions: [{ label: "Edit routes", page: "rtb-routes" }, { label: "Subnet associations → Edit subnet associations", page: "rtb-assoc", when: function (r) { return !r.main; } }],
    rows: function () { return S.rtbs; }, cols: [["Name", function (r) { return r.name || "-"; }], ["Route table ID", function (r) { return r.id; }], ["VPC", function (r) { return vname(r.vpcId); }], ["Main", function (r) { return r.main ? "Yes" : "No"; }], ["Explicit subnet associations", function (r) { return r.main ? "-" : (r.assoc.length ? r.assoc.map(function (id) { return nm(find(S.subnets, id)); }).join(", ") : "-"); }]],
    detail: function (r) { return [["Routes", h("div", {}, [h("div", { text: find(S.vpcs, r.vpcId).cidr + " → local" })].concat(r.routes.map(function (x) { return h("div", { text: x.dest + " → " + (x.target.indexOf("igw-") === 0 ? "igw " + nm(find(S.igws, x.target)) : x.target) }); })))]]; } });
};
PAGES["rtb-create"] = function () {
  return formPage({ name: "rtb-create", crumb: "VPC › Route tables › Create route table", title: "Create route table", back: "rtbs", init: function () { var d = S.vpcs.filter(function (v) { return !v.isDefault; })[0]; return { name: "", vpcId: d ? d.id : "" }; },
    sections: function () { return [{ t: "Route table settings", f: [{ id: "name", type: "text", label: "Name", ph: "pharmacy-public" }, { id: "vpcId", type: "select", label: "VPC", req: true, opts: function () { return [["", "Select a VPC"]].concat(S.vpcs.map(function (v) { return [v.id, vname(v.id)]; })); } }] }]; },
    submit: "Create route table", onSubmit: function (V) { var r = API.createRtb(V); if (r.errors) return r; UI.sel.rtbs = r.res.id; return { msg: "สร้างแล้ว ตอนนี้มีแค่เส้นทาง local ต้อง Edit routes และ Subnet associations ต่อ" }; } });
};
PAGES["rtb-routes"] = function () {
  var r = find(S.rtbs, UI.params.id);
  return formPage({ name: "rtb-routes", crumb: "VPC › Route tables › Edit routes", title: "Edit routes (" + nm(r) + ")", back: "rtbs",
    init: function () { return { rows: r.routes.map(function (x) { return { dest: x.dest, target: x.target }; }) }; },
    sections: function (V) { var tg = [["", "Select target"]].concat(S.igws.filter(function (g) { return g.vpcId === r.vpcId; }).map(function (g) { return [g.id, "Internet Gateway · " + nm(g)]; })); return [{ t: "Routes", f: [{ type: "custom", id: "rows", render: function (V) {
      var box = h("div"); box.appendChild(h("div", { cls: "row r2" }, [h("div", { text: find(S.vpcs, r.vpcId).cidr + " (Destination)" }), h("div", { text: "local (Target)" }), h("span")]));
      box.appendChild(rowsEditor("", V.rows, [function (x) { return inp(x, "dest", "Destination เช่น 0.0.0.0/0"); }, function (x) { return sel(x, "target", tg, "Target"); }], function () { return { dest: "", target: "" }; }, "Add route")); return box; } }] }]; },
    submit: "Save changes", onSubmit: function (V) { var x = API.setRoutes(r.id, V.rows); return x.errors ? x : { msg: "บันทึกเส้นทางแล้ว" }; } });
};
PAGES["rtb-assoc"] = function () {
  var r = find(S.rtbs, UI.params.id);
  return formPage({ name: "rtb-assoc", crumb: "VPC › Route tables › Subnet associations › Edit subnet associations", title: "Edit subnet associations (" + nm(r) + ")", back: "rtbs",
    init: function () { return { ids: r.assoc.slice() }; },
    sections: function () { return [{ t: "Available subnets", f: [{ id: "ids", type: "multi", opts: function () { return S.subnets.filter(function (s) { return s.vpcId === r.vpcId; }).map(function (s) { return [s.id, nm(s) + " · " + s.cidr + " · " + s.az]; }); }, hint: "ซอยที่ไม่ได้ติ๊กและไม่ได้ผูกกับ route table ใดจะใช้ main route table ของ VPC" }] }]; },
    submit: "Save associations", onSubmit: function (V) { var x = API.setAssoc(r.id, V.ids); return x.errors ? x : { msg: "บันทึกแล้ว" }; } });
};
LISTS.sgs = function () {
  return ({ key: "sgs", kind: "sg", title: "Security groups", crumb: "VPC › Security groups", create: [{ label: "Create security group", page: "sg-create" }], actions: [{ label: "Edit inbound rules", page: "sg-inbound" }, { label: "Delete security groups", page: "del", kind: "sg" }],
    rows: function () { return S.sgs; }, cols: [["Name", function (r) { return r.name; }], ["Security group ID", function (r) { return r.id; }], ["VPC", function (r) { return vname(r.vpcId); }], ["Inbound rules", function (r) { return String(r.inbound.length); }]],
    detail: function (r) { return [["Description", r.desc], ["Inbound rules", h("div", {}, r.inbound.length ? r.inbound.map(function (x) { return h("div", { cls: "mono", text: (x.proto === "-1" ? "All traffic" : "tcp " + (x.from === x.to ? x.from : x.from + "-" + x.to)) + "  ←  " + (x.srcKind === "sg" ? "sg " + nm(find(S.sgs, x.src)) : x.src) }); }) : "ไม่มี (ปิดทุกอย่าง)")], ["Outbound rules", "All traffic → 0.0.0.0/0"]]; } });
};
PAGES["sg-create"] = function () {
  return formPage({ name: "sg-create", crumb: "VPC › Security groups › Create security group", title: "Create security group", back: "sgs",
    init: function () { var d = S.vpcs.filter(function (v) { return !v.isDefault; })[0]; return { name: "", desc: "", vpcId: d ? d.id : defaultVpc().id, rows: [] }; },
    sections: function (V) { return [{ t: "Basic details", f: [{ id: "name", type: "text", label: "Security group name", req: true, hint: "แก้ชื่อและ description ไม่ได้หลังสร้าง" }, { id: "desc", type: "text", label: "Description", req: true }, { id: "vpcId", type: "select", label: "VPC", opts: function () { return S.vpcs.map(function (v) { return [v.id, vname(v.id)]; }); } }] },
      { t: "Inbound rules", f: [{ type: "custom", id: "rules", render: function (V) { var box = h("div"); box.appendChild(ruleEditor(V, "rows", V.vpcId)); var e = UI.form.errors.rules; if (e) box.appendChild(h("div", { cls: "err", text: e })); return box; } }] },
      { t: "Outbound rules", f: [{ type: "custom", id: "out", render: function () { return h("div", { cls: "hint", text: "Allow all traffic → 0.0.0.0/0 (ค่าเริ่มต้นของ console)" }); } }] }]; },
    submit: "Create security group", onSubmit: function (V) { var r = API.createSg(V); if (r.errors) return r; UI.sel.sgs = r.res.id; return { msg: "สร้างแล้ว" }; } });
};
PAGES["sg-inbound"] = function () {
  var g = find(S.sgs, UI.params.id);
  return formPage({ name: "sg-inbound", crumb: "VPC › Security groups › Edit inbound rules", title: "Edit inbound rules (" + g.name + ")", back: "sgs", init: function () { return { rows: ruleRowsFrom(g) }; },
    sections: function () { return [{ t: "Inbound rules", f: [{ type: "custom", id: "rules", render: function (V) { var box = h("div"); box.appendChild(ruleEditor(V, "rows", g.vpcId, g.id)); var e = UI.form.errors.rules; if (e) box.appendChild(h("div", { cls: "err", text: e })); return box; } }] }]; },
    submit: "Save rules", onSubmit: function (V) { var r = API.setInbound(g.id, V.rows); return r.errors ? r : { msg: "บันทึกกฎแล้ว" }; } });
};
LISTS.keys = function () {
  return ({ key: "keys", kind: "key", title: "Key pairs", crumb: "EC2 › Network & Security › Key Pairs", create: [{ label: "Import key pair", page: "key-import" }, { label: "Create key pair", page: "key-create" }], actions: [{ label: "Delete key pair", page: "del", kind: "key" }],
    detail: function (r) { return [["Key pair name", r.name], ["ID", r.id], ["Type", r.type], ["Source", r.imported ? "Imported" : "Created by EC2"], ["Fingerprint", fpr(r.name)]]; }, rows: function () { return S.keys; }, cols: [["Name", function (r) { return r.name; }], ["Type", function (r) { return r.type; }], ["Source", function (r) { return r.imported ? "Imported" : "Created by EC2"; }]] });
};
PAGES["key-import"] = function () {
  return formPage({ name: "key-import", crumb: "EC2 › Key Pairs › Import key pair", title: "Import key pair", back: "keys", init: function () { return { name: "", pub: "" }; },
    sections: function () { return [{ t: "", f: [{ id: "name", type: "text", label: "Name", req: true, ph: "pharmacy-admin" }, { id: "pub", type: "area", label: "Public key contents", req: true, ph: "ssh-ed25519 AAAA... you@laptop", hint: "วางเนื้อไฟล์ .pub หรือกด Browse เลือกไฟล์ (หน้านี้จำลองเฉพาะช่องวาง)" }] }]; },
    submit: "Import key pair", onSubmit: function (V) { var r = API.importKey(V); return r.errors ? r : { msg: "Import key pair " + V.name + " แล้ว" }; } });
};
PAGES["key-create"] = function () {
  return formPage({ name: "key-create", crumb: "EC2 › Key Pairs › Create key pair", title: "Create key pair", back: "keys", init: function () { return { name: "", type: "ED25519", fmt: "pem" }; },
    sections: function () { return [{ t: "Key pair", f: [{ id: "name", type: "text", label: "Name", req: true }, { id: "type", type: "radio", label: "Key pair type", opts: function () { return [["RSA", "RSA"], ["ED25519", "ED25519"]]; } }, { id: "fmt", type: "radio", label: "Private key file format", opts: function () { return [["pem", ".pem (OpenSSH)"], ["ppk", ".ppk (PuTTY)"]]; } }] }]; },
    submit: "Create key pair", onSubmit: function (V) { var r = API.createKey(V); return r.errors ? r : { msg: "สร้างแล้ว ไฟล์ " + r.res.file + " ถูกดาวน์โหลดอัตโนมัติ นี่คือโอกาสเดียวที่จะเก็บ private key (จำลอง) และ AWS ยังรู้จักกุญแจนี้แม้คุณทำไฟล์หาย" }; } });
};
LISTS.roles = function () {
  return ({ key: "roles", kind: "role", title: "Roles", crumb: "IAM › Roles", create: [{ label: "Create role", page: "role-create" }],
    actions: [{ label: "Add permissions / detach policies", page: "role-perm" }], rows: function () { return S.roles; }, cols: [["Role name", function (r) { return r.name; }], ["Trusted entities", function () { return "AWS Service: ec2"; }], ["Policies", function (r) { return String(r.policies.length); }]],
    detail: function (r) { return [["Permissions policies", r.policies.length ? h("div", {}, r.policies.map(function (p) { return h("div", { text: p }); })) : "ไม่มี"], ["Instance profile", r.profile + "  (สร้างให้อัตโนมัติ ชื่อเดียวกับ role)"], ["Description", r.desc || "-"]]; } });
};
PAGES["role-create"] = function () {
  return formPage({ name: "role-create", crumb: "IAM › Roles › Create role", title: "Create role", back: "roles", steps: 3,
    init: function () { return { entity: "AWS service", usecase: "", policies: [], q: "", name: "", desc: "" }; },
    sections: function (V) { return [
      { step: 0, t: "Step 1: Select trusted entity", f: [{ id: "entity", type: "radio", label: "Trusted entity type", opts: function () { return [["AWS service", "AWS service"], ["AWS account", "AWS account", "ไม่จำลอง"], ["Web identity", "Web identity", "ไม่จำลอง"]].map(function (o, i) { return i ? [o[0], o[1], o[2]] : o; }); } },
        { id: "usecase", type: "select", label: "Service or use case", opts: function () { return [["", "Choose a service or use case"], ["EC2", "EC2"], ["Lambda", "Lambda (ไม่จำลอง)"]]; } }] },
      { step: 1, t: "Step 2: Add permissions", f: [{ id: "q", type: "text", label: "Permissions policies (ค้นหา)", ph: "ECR" }, { id: "policies", type: "multi", opts: function (V) { return POLICIES.filter(function (p) { return !V.q || p.toLowerCase().indexOf(V.q.toLowerCase()) >= 0; }).map(function (p) { return [p, p]; }); } }] },
      { step: 2, t: "Step 3: Name, review, and create", f: [{ id: "name", type: "text", label: "Role name", req: true, ph: "pharmacy-jenkins" }, { id: "desc", type: "text", label: "Description" }] }]; },
    submit: "Create role", onSubmit: function (V) { var r = API.createRole(V); if (r.errors) return r; return { msg: "สร้าง role " + V.name + " แล้ว และได้ instance profile ชื่อ " + V.name + " ให้อัตโนมัติ" }; } });
};
LISTS.repos = function () {
  return ({ key: "repos", kind: "repo", title: "Private repositories", crumb: "ECR › Private registry › Repositories", create: [{ label: "Create repository", page: "repo-create" }],
    detail: function (r) { return [["Repository name", r.name], ["URI", r.uri], ["Image tag immutability", r.mutable ? "Mutable" : "Immutable"], ["Encryption", r.enc], ["Images", String(r.images.length)]]; }, actions: [{ label: "View push commands", page: "ecr-cmds" }, { label: "Docker push / pull (จำลอง)", page: "ecr-run" }, { label: "Delete", page: "del", kind: "repo" }], rows: function () { return S.repos; }, cols: [["Repository name", function (r) { return r.name; }], ["URI", function (r) { return r.uri; }], ["Tag immutability", function (r) { return r.mutable ? "Mutable" : "Immutable"; }]] });
};
PAGES["repo-create"] = function () {
  return formPage({ name: "repo-create", crumb: "ECR › Private repositories › Create repository", title: "Create repository", back: "repos", init: function () { return { name: "", mut: "Mutable", enc: "AES-256" }; },
    sections: function () { return [{ t: "General settings", f: [{ id: "name", type: "text", label: "Repository name", req: true, ph: "pharmacy/frontend", hint: "ใช้ namespace/ชื่อ ได้ เช่น project-a/nginx-web-app" }, { id: "mut", type: "radio", label: "Image tag immutability", opts: function () { return [["Mutable", "Mutable"], ["Immutable", "Immutable"]]; } }, { id: "enc", type: "radio", label: "Encryption configuration", opts: function () { return [["AES-256", "AES-256"], ["AWS KMS", "AWS KMS", "เสียเงินเพิ่ม"]]; } }] }]; },
    submit: "Create", onSubmit: function (V) { var r = API.createRepo({ name: V.name, mutable: V.mut === "Mutable", enc: V.enc }); return r.errors ? r : { msg: "สร้าง repository แล้ว URI: " + r.res.uri }; } });
};
LISTS.insts = function () {
  return ({ key: "insts", kind: "inst", title: "Instances", crumb: "EC2 › Instances", create: [{ label: "Launch instances", page: "launch" }],
    actions: [
      { label: "Connect (ทดสอบ SSH)", page: "ssh", when: function (r) { return r.state !== "terminated"; } },
      { label: "Instance state → Reboot instance", run: function (r) { return API.instState(r.id, "reboot"); }, msg: "reboot แล้ว IP ไม่เปลี่ยน", when: function (r) { return r.state === "running"; } },
      { label: "Instance state → Stop instance", run: function (r) { return API.instState(r.id, "stop"); }, msg: "stop แล้ว public IPv4 ที่ได้อัตโนมัติถูกคืน (private IP และ Elastic IP ยังอยู่) ไม่คิดค่าเครื่องแต่ยังคิดค่าดิสก์ ถ้าต้องการ IP คงที่ให้ใช้ Elastic IP", when: function (r) { return r.state === "running"; } },
      { label: "Instance state → Start instance", run: function (r) { return API.instState(r.id, "start"); }, msg: "start แล้ว ถ้าเครื่องเคยมี public IP จะได้ IP ใหม่ที่ไม่ใช่ตัวเดิม (ระวัง Ansible/SSH config ที่จด IP เก่าไว้)", when: function (r) { return r.state === "stopped"; } },
      { label: "Instance settings → Change instance type", page: "inst-type", when: function (r) { return r.state !== "terminated"; } },
      { label: "Security → Modify IAM role", page: "inst-role", when: function (r) { return r.state !== "terminated"; } },
      { label: "Instance state → Terminate (delete) instance", page: "del", kind: "inst", when: function (r) { return r.state !== "terminated"; } }],
    rows: function () { return S.insts; }, cols: [["Name", function (r) { return r.name || "-"; }], ["Instance ID", function (r) { return r.id; }], ["Instance state", function (r) { return stateTag(r.state); }], ["Instance type", function (r) { return r.type; }], ["Public IPv4 address", function (r) { return r.publicIp || "-"; }], ["Private IPv4 address", function (r) { return r.privateIp; }], ["Subnet", function (r) { return nm(find(S.subnets, r.subnetId)); }], ["Key name", function (r) { return r.keyName || "-"; }]],
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
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: "Connect to instance" }), h("div", { cls: "sp" }, [h("button", { cls: "btn", type: "button", text: "Cancel", onclick: function () { go("insts"); } })])]));
  wrap.appendChild(h("div", { cls: "hint", text: (inst.name || "") + " (" + inst.id + ")" }));
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
    body.appendChild(h("p", { text: "เชื่อมต่อผ่าน EC2 Instance Connect: ไม่ต้องใช้ไฟล์กุญแจ (ใช้สิทธิ์ IAM ของคุณ) แต่เครื่องต้องเข้าถึงได้ทาง port 22 เหมือน SSH" }));
    body.appendChild(steps(net));
    body.appendChild(h("pre", { cls: "term", text: okEic ? "Connected (EC2 Instance Connect)  — ไม่ต้องมีกุญแจ" : "Failed to connect to your instance. EC2 Instance Connect is unable to connect to your instance (ติดที่เครือข่ายตามข้อ ✗)" }));
    body.appendChild(h("p", { cls: "hint", text: "เอกสาร: EC2 Instance Connect ต้องมีกฎขาเข้า และสิทธิ์ IAM แต่ไม่ต้องมี key pair และไม่ต้องมี instance profile (จำลองเงื่อนไข port 22 ด้วยกฎ SSH เดียวกับ My IP; ช่วง IP ของบริการ EIC ไม่ได้จำลอง)" }));
  } else if (UI.ctab === "ssm") {
    var c = sessionCheck(inst);
    body.appendChild(h("p", { text: "เชื่อมต่อผ่าน Session Manager: ไม่ต้องเปิด port 22 และไม่ต้องมีกุญแจ แต่เครื่องต้องมี IAM role ที่มีสิทธิ์ SSM และ SSM Agent ที่ออนไลน์" }));
    body.appendChild(steps(c.steps));
    body.appendChild(h("pre", { cls: "term", text: c.out }));
    body.appendChild(h("p", { cls: "hint", text: "เอกสาร: Session Manager ไม่ต้องมีกฎขาเข้าและไม่ต้องมี key pair แต่ต้องมี instance profile role (ชื่อ policy AmazonSSMManagedInstanceCore และเงื่อนไขทางออกเน็ตมาจากความจำ ยังไม่ยืนยัน)" }));
  } else body.appendChild(h("p", { cls: "hint", text: "EC2 serial console มีใน console จริงแต่ยังไม่ได้จำลอง" }));
  card.appendChild(body); wrap.appendChild(card);
  return wrap;
};
PAGES.launch = function () {
  var dv = defaultVpc();
  return formPage({ name: "launch", crumb: "EC2 › Instances › Launch an instance", title: "Launch an instance", back: "insts",
    init: function () { return { name: "", tags: [], ami: "ami-ubuntu2404", type: "t3.micro", keyName: "", vpcId: dv.id, subnetId: "", autoIp: "Enable", sgMode: "existing", sgIds: [defaultSg(dv.id).id], nsName: "", nsDesc: "", nsSrc: "Anywhere-IPv4", diskSize: "8", diskType: "gp3", profile: "", tokens: "optional", hop: "1", count: "1", _ipTouched: false, _sn: "" }; },
    warn: function (V) { return S.acct === "free" && FREE.indexOf(V.type) < 0 ? "Instance type " + V.type + " ไม่อยู่ในรายการใช้ฟรีของบัญชีที่สร้างตั้งแต่ 15 ก.ค. 2025 (อาจถูกบล็อกหรือคิดเงิน หน้านี้แค่เตือน)" : ""; },
    sections: function (V) {
      var sn = V.subnetId ? find(S.subnets, V.subnetId) : S.subnets.filter(function (x) { return x.vpcId === V.vpcId; })[0];
      if (V._sn !== (sn ? sn.id : "")) { V._sn = sn ? sn.id : ""; V.autoIp = sn && sn.autoIp ? "Enable" : "Disable"; }
      return [
      { t: "Name and tags", f: [{ id: "name", type: "text", label: "Name", ph: "pharmacy-jenkins" }, { type: "custom", id: "tags", render: function (V) { return rowsEditor("Add additional tags", V.tags, [function (r) { return inp(r, "k", "Key เช่น Role"); }, function (r) { return inp(r, "v", "Value เช่น jenkins"); }], function () { return { k: "", v: "" }; }, "Add tag"); } }] },
      { t: "Application and OS Images (Amazon Machine Image)", f: [{ id: "ami", type: "select", label: "Quick Start", opts: function () { return AMIS; } }] },
      { t: "Instance type", f: [{ id: "type", type: "select", label: "Instance type", opts: function () { return ITYPES.map(function (t) { return [t, t + (FREE.indexOf(t) >= 0 ? "   Free tier eligible" : "")]; }); } }] },
      { t: "Key pair (login)", f: [{ id: "keyName", type: "select", label: "Key pair name", opts: function () { return [["", "Proceed without a key pair (not recommended)"]].concat(S.keys.map(function (k) { return [k.name, k.name]; })); } },
        { type: "custom", id: "newkey", render: function (V, rr) {
          var nk = V._nk, box = h("div", {});
          if (!nk) { box.appendChild(h("a", { href: "#", text: "Create new key pair", onclick: function (e) { e.preventDefault(); V._nk = { name: "", type: "ED25519", fmt: "pem", err: "" }; rr(); } })); return box; }
          var nm = h("input", { type: "text", value: nk.name, "aria-label": "New key pair name", oninput: function (e) { nk.name = e.target.value; } });
          function rad(k, label, opts) { return h("div", { cls: "opt" }, [h("b", { text: label + "  " })].concat(opts.map(function (o) { return h("label", {}, [h("input", { type: "radio", name: "nk" + k, checked: nk[k] === o[0], onchange: function () { nk[k] = o[0]; } }), " " + o[1] + "  "]); }))); }
          box.appendChild(h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("b", { text: "Create key pair" }), h("p", {}, ["Key pair name ", nm]), rad("type", "Key pair type", [["RSA", "RSA"], ["ED25519", "ED25519"]]), rad("fmt", "Private key file format", [["pem", ".pem"], ["ppk", ".ppk"]]),
            nk.err ? h("p", { cls: "err", text: nk.err }) : null,
            h("button", { type: "button", cls: "btn", text: "Cancel", onclick: function () { V._nk = null; rr(); } }), " ",
            h("button", { type: "button", cls: "btn pri", text: "Create key pair", onclick: function () { var r = API.createKey({ name: nk.name, type: nk.type, fmt: nk.fmt }); if (r.errors) { nk.err = r.errors.name; rr(); return; } V.keyName = r.res.name; V._nk = null; flash("ok", "สร้าง key pair " + r.res.name + " แล้ว ไฟล์ " + r.res.file + " ถูกดาวน์โหลดอัตโนมัติ นี่คือโอกาสเดียวที่จะเก็บ private key (จำลอง) และเลือกให้ในฟอร์มแล้ว"); rr(); } })])]));
          return box; } }] },
      { t: "Network settings", f: [
        { id: "vpcId", type: "select", label: "VPC", opts: function () { return S.vpcs.map(function (v) { return [v.id, vname(v.id) + " · " + v.cidr]; }); }, onchange: function (V) { V.subnetId = ""; V.sgIds = [defaultSg(V.vpcId).id]; } },
        { id: "subnetId", type: "select", label: "Subnet", opts: function (V) { return [["", "No preference"]].concat(S.subnets.filter(function (x) { return x.vpcId === V.vpcId; }).map(function (x) { return [x.id, nm(x) + " · " + x.az + " · " + x.cidr]; })); } },
        { id: "autoIp", type: "select", label: "Auto-assign Public IP", opts: function () { return [["Enable", "Enable"], ["Disable", "Disable"]]; }, hint: "ค่าเริ่มต้นตามซอยที่เลือก (ซอยที่ไม่ใช่ default เริ่มเป็น Disable ถ้ายังไม่ได้ติ๊กที่ Edit subnet settings)" },
        { id: "sgMode", type: "radio", label: "Firewall (security groups)", opts: function () { return [["new", "Create security group"], ["existing", "Select existing security group"]]; } },
        { id: "sgIds", type: "multi", label: "Common security groups", show: function (V) { return V.sgMode === "existing"; }, opts: function (V) { return sgOpts(V.vpcId); } },
        { id: "nsName", type: "text", label: "Security group name", show: function (V) { return V.sgMode === "new"; } }, { id: "nsDesc", type: "text", label: "Description", show: function (V) { return V.sgMode === "new"; } },
        { id: "nsSrc", type: "select", label: "Allow SSH traffic from", show: function (V) { return V.sgMode === "new"; }, opts: function () { return [["Anywhere-IPv4", "Anywhere (0.0.0.0/0)"], ["My IP", "My IP"]]; }, hint: "wizard ใส่กฎ SSH ให้เอง ค่าเริ่มต้นเปิดจากทุก IP ซึ่งไม่ปลอดภัยสำหรับของจริง" }] },
      { t: "Configure storage", f: [{ id: "diskSize", type: "text", label: "Size (GiB)" }, { id: "diskType", type: "select", label: "Volume type", opts: function () { return [["gp3", "gp3"], ["gp2", "gp2"]]; } }] },
      { t: "Advanced details", f: [{ id: "profile", type: "select", label: "IAM instance profile", opts: function () { return [["", "-"]].concat(S.roles.map(function (r) { return [r.profile, r.profile]; })); } },
        { id: "tokens", type: "select", label: "Metadata version", opts: function () { return [["optional", "V1 and V2 (token optional)"], ["required", "V2 only (token required)"]]; } },
        { id: "hop", type: "text", label: "Metadata response hop limit", hint: "Jenkins รันใน container ต้อง 2" }] },
    ]; },
    summary: function (V) {
      var gs = V.sgMode === "new" ? ["(สร้างใหม่) " + (V.nsName || "-")] : V.sgIds.map(function (id) { return nm(find(S.sgs, id)); });
      var am = AMIS.filter(function (a) { return a[0] === V.ami; })[0];
      return h("div", {}, [h("div", { cls: "f" }, [h("label", { cls: "l", text: "Number of instances" }), h("input", { type: "text", value: V.count, "aria-label": "Number of instances", oninput: function (e) { V.count = e.target.value; } })]),
        kvDom([["Software Image (AMI)", am ? am[1] : V.ami], ["Virtual server type (instance type)", V.type], ["Firewall (security group)", gs.join(", ") || "-"], ["Storage (volumes)", V.diskSize + " GiB " + V.diskType]])]);
    },
    submit: "Launch instance",
    onSubmit: function (V) { var r = API.launch({ name: V.name, tags: V.tags, ami: V.ami, type: V.type, keyName: V.keyName, vpcId: V.vpcId, subnetId: V.subnetId, autoIp: V.autoIp, sgIds: V.sgIds, newSg: V.sgMode === "new" ? { name: V.nsName, desc: V.nsDesc, src: V.nsSrc } : null, diskSize: V.diskSize, diskType: V.diskType, profile: V.profile, tokens: V.tokens, hop: V.hop, count: V.count });
      if (r.errors) { var e = r.errors; if (e.newSgName) e.nsName = e.newSgName; return r; }
      UI.sel.insts = r.res[0].id; return { msg: "เปิดเครื่อง " + r.res.length + " เครื่องแล้ว" + (r.res[0].publicIp ? "" : " (ไม่มี public IP)") }; } });
};
LISTS.tgs = function () {
  return ({ key: "tgs", kind: "tg", title: "Target groups", crumb: "EC2 › Load Balancing › Target Groups", create: [{ label: "Create target group", page: "tg-create" }], actions: [{ label: "Register targets", page: "tg-register" }],
    rows: function () { return S.tgs; }, cols: [["Name", function (r) { return r.name; }], ["Port", function (r) { return r.proto + ": " + r.port; }], ["Target type", function () { return "Instance"; }], ["VPC", function (r) { return vname(r.vpcId); }], ["Registered targets", function (r) { return String(r.targets.length); }]],
    detail: function (r) { return [["Health checks", "HTTP · path " + r.hcPath + " · port: traffic port · interval 30s · timeout 5s · healthy 5 · unhealthy 2 · success codes 200"], ["Targets", r.targets.length ? h("div", {}, r.targets.map(function (x) { return h("div", { text: nm(find(S.insts, x.instId)) + " : " + x.port }); })) : "ยังไม่มี"]]; } });
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
    init: function () { var d = S.vpcs.filter(function (v) { return !v.isDefault; })[0]; return { ttype: "Instances", name: "", proto: "HTTP", port: "80", ipt: "IPv4", vpcId: d ? d.id : defaultVpc().id, hcPath: "/", targets: [] }; },
    sections: function (V) { return [
      { step: 0, t: "Specify group details", f: [{ id: "ttype", type: "radio", label: "Choose a target type", opts: function () { return [["Instances", "Instances"], ["IP addresses", "IP addresses", "ไม่จำลอง"], ["Lambda function", "Lambda function", "ไม่จำลอง"]]; } },
        { id: "name", type: "text", label: "Target group name", req: true, ph: "pharmacy-prd" }, { id: "proto", type: "select", label: "Protocol", opts: function () { return [["HTTP", "HTTP"]]; } }, { id: "port", type: "text", label: "Port", hint: "พอร์ตที่ ALB ส่งต่อไปที่เครื่อง (NodePort ของ frontend)" },
        { id: "ipt", type: "radio", label: "IP address type", opts: function () { return [["IPv4", "IPv4"]]; } }, { id: "vpcId", type: "select", label: "VPC", opts: function () { return S.vpcs.map(function (v) { return [v.id, vname(v.id)]; }); } },
        { id: "hcPath", type: "text", label: "Health checks → Health check path" }] },
      { step: 1, t: "Register targets", f: [tgTargetsField(function (V) { return V.vpcId; })] }]; },
    submit: "Create target group", onSubmit: function (V) { var r = API.createTg({ name: V.name, port: V.port, proto: V.proto, vpcId: V.vpcId, hcPath: V.hcPath, targets: V.targets }); if (r.errors) { UI.form.step = 0; return r; } UI.sel.tgs = r.res.id; return { msg: "สร้าง target group แล้ว" }; } });
};
PAGES["tg-register"] = function () {
  var t = find(S.tgs, UI.params.id);
  return formPage({ name: "tg-register", crumb: "EC2 › Target Groups › Register targets", title: "Register targets (" + t.name + ")", back: "tgs", init: function () { return { port: String(t.port), targets: t.targets.map(function (x) { return { instId: x.instId, port: String(x.port) }; }) }; },
    sections: function () { return [{ t: "Available instances", f: [tgTargetsField(function () { return t.vpcId; })] }]; },
    submit: "Include as pending below → Register", onSubmit: function (V) { var r = API.registerTargets(t.id, V.targets); return r.errors ? r : { msg: "ลงทะเบียน " + V.targets.length + " เครื่องแล้ว" }; } });
};
LISTS.albs = function () {
  return ({ key: "albs", kind: "alb", title: "Load balancers", crumb: "EC2 › Load Balancing › Load Balancers", create: [{ label: "Create load balancer", page: "alb-create" }],
    rows: function () { return S.albs; }, cols: [["Name", function (r) { return r.name; }], ["DNS name", function (r) { return r.dns; }], ["State", function () { return tagp("Active", "ok"); }], ["VPC", function (r) { return vname(r.vpcId); }], ["Type", function () { return "application"; }], ["Scheme", function (r) { return r.scheme; }]],
    detail: function (r) { var hs = albHealth(r); return [["Listeners", h("div", {}, r.listeners.map(function (l) { return h("div", { text: "HTTP:" + l.port + " → " + nm(find(S.tgs, l.tgId)) }); }))], ["Availability Zones", r.subnetIds.map(function (id) { return find(S.subnets, id).az; }).join(", ")], ["Security groups", r.sgIds.map(function (id) { return nm(find(S.sgs, id)); }).join(", ")],
      ["Target health", h("div", {}, hs.length ? hs.map(function (x) { return x.none ? h("div", { text: x.t.name + ": ยังไม่มี target ลงทะเบียน" }) : h("div", {}, [tagp(x.state, x.ok ? "ok" : (x.state === "unused" ? "warn" : "bad")), " " + x.t.name + " · " + nm(x.inst) + ":" + x.port + (x.ok ? "" : "  — " + x.why)]); }) : "-")],
      ["หมายเหตุ", h("div", { cls: "hint" }, ["จำลองว่าแอปตอบ 200 ที่ health check path (lab นี้ยังไม่มีแอปจริง)", failOpen(hs) ? " · target group " + failOpen(hs) + " ไม่มี target ที่ healthy เลย ALB จะ fail open คือส่งคำขอไปทุกตัวโดยไม่สนสถานะ" : ""])]]; } });
};
PAGES["alb-create"] = function () {
  return formPage({ name: "alb-create", crumb: "EC2 › Load Balancers › Create Application Load Balancer", title: "Create Application Load Balancer", back: "albs",
    init: function () { var d = S.vpcs.filter(function (v) { return !v.isDefault; })[0] || defaultVpc(); return { name: "", scheme: "Internet-facing", ipt: "IPv4", vpcId: d.id, subnetIds: [], sgIds: [defaultSg(d.id).id], listeners: [{ port: "80", tgId: "" }] }; },
    sections: function (V) { return [
      { t: "Basic configuration", f: [{ id: "name", type: "text", label: "Load balancer name", req: true, ph: "pharmacy-alb" }, { id: "scheme", type: "radio", label: "Scheme", opts: function () { return [["Internet-facing", "Internet-facing"], ["Internal", "Internal"]]; } }, { id: "ipt", type: "radio", label: "Load balancer IP address type", opts: function () { return [["IPv4", "IPv4"]]; } }] },
      { t: "Network mapping", f: [{ id: "vpcId", type: "select", label: "VPC", opts: function (V) { return S.vpcs.filter(function (v) { return V.scheme !== "Internet-facing" || vpcIgw(v.id); }).map(function (v) { return [v.id, vname(v.id) + " · " + v.cidr]; }); }, hint: "Internet-facing เลือกได้เฉพาะ VPC ที่มี internet gateway", onchange: function (V) { V.subnetIds = []; V.sgIds = [defaultSg(V.vpcId).id]; } },
        { id: "subnetIds", type: "multi", label: "Availability Zones and subnets", opts: function (V) { return S.subnets.filter(function (s) { return s.vpcId === V.vpcId; }).map(function (s) { return [s.id, s.az + " · " + nm(s) + " · " + s.cidr]; }); }, hint: "ต้องเลือกจากอย่างน้อย 2 AZ" }] },
      { t: "Security groups", f: [{ id: "sgIds", type: "multi", label: "Security groups", opts: function (V) { return sgOpts(V.vpcId); }, hint: "ค่าเริ่มต้นจะติ๊ก default security group ของ VPC ให้ เปลี่ยนเป็นของเรา" }] },
      { t: "Listeners and routing", f: [{ type: "custom", id: "listeners", render: function (V) {
        var tg = [["", "Select a target group"]].concat(S.tgs.filter(function (t) { return t.vpcId === V.vpcId; }).map(function (t) { return [t.id, t.name + " (" + t.port + ")"]; }));
        var box = h("div"); V.listeners.forEach(function (l, i) { var e1 = UI.form.errors["lport" + i], e2 = UI.form.errors["ltg" + i];
          box.appendChild(h("div", { cls: "row r3" }, [h("div", {}, [h("div", { cls: "hint", text: "Protocol : Port" }), h("div", { cls: "row r2", style: "grid-template-columns: 90px 1fr" }, [h("span", { text: "HTTP :" }), inp(l, "port", "80")]), e1 ? h("div", { cls: "err", text: e1 }) : null]), h("div", {}, [h("div", { cls: "hint", text: "Default action → Forward to" }), sel(l, "tgId", tg, "target group"), e2 ? h("div", { cls: "err", text: e2 }) : null]), V.listeners.length > 1 ? h("button", { cls: "btn", type: "button", text: "Remove", onclick: function () { V.listeners.splice(i, 1); render(); } }) : h("span")])); });
        box.appendChild(h("button", { cls: "btn", type: "button", text: "Add listener", onclick: function () { V.listeners.push({ port: "", tgId: "" }); render(); } })); return box; } }] }]; },
    submit: "Create load balancer", onSubmit: function (V) { var r = API.createAlb({ name: V.name, scheme: V.scheme, vpcId: V.vpcId, subnetIds: V.subnetIds, sgIds: V.sgIds, listeners: V.listeners }); if (r.errors) return r; UI.sel.albs = r.res.id; return { msg: "สร้าง ALB แล้ว เลือกแถวเพื่อดู Target health" }; } });
};

LISTS.users = function () {
  return ({ key: "users", kind: "user", title: "Users", crumb: "IAM › Users", create: [{ label: "Create user", page: "user-create" }],
    actions: [{ label: "Add permissions / detach policies", page: "user-perm" }],
    detail: function (r) { return [["User name", r.name], ["ARN", "arn:aws:iam::000000000000:user/" + r.name], ["Permissions", r.policies.join(", ") || "ไม่มี"], ["Access keys", r.keys.length + " ชุด"]]; },
    rows: function () { return S.users; }, cols: [["User name", function (r) { return r.name; }], ["Permissions policies", function (r) { return String(r.policies.length); }], ["Access keys", function (r) { return r.keys.map(function (k) { return k.id + (k.active ? "" : " (inactive)"); }).join(", ") || "-"; }]] });
};
LISTS.policies = function () {
  return ({ key: "policies", kind: "policy", title: "Policies", crumb: "IAM › Policies",
    detail: function (r) { return [["Policy name", r.name], ["Type", "AWS managed"], ["ARN", "arn:aws:iam::aws:policy/" + r.name], ["Description", r.desc]]; },
    rows: function () { return S.policies; }, cols: [["Policy name", function (r) { return r.name; }], ["Type", function () { return "AWS managed"; }], ["Used by", function (r) { return String(S.roles.filter(function (x) { return x.policies.indexOf(r.name) >= 0; }).length + S.users.filter(function (x) { return x.policies.indexOf(r.name) >= 0; }).length) + " entities"; }], ["เนื้อหา policy", function (r) { return POLICY_DEF[r.name].actions ? tagp("ตรวจกับเอกสารแล้ว", "ok") : tagp("ยังไม่ได้ตรวจ", "warn"); }]] });
};
LISTS.eips = function () {
  return ({ key: "eips", kind: "eip", title: "Elastic IP addresses", crumb: "EC2 › Elastic IPs", create: [{ label: "Allocate Elastic IP address", page: "eip-alloc" }],
    actions: [{ label: "Associate Elastic IP address", page: "eip-assoc", when: function (r) { return !r.instId; } }, { label: "Disassociate Elastic IP address", run: function (r) { return API.disassocEip(r.id); }, msg: "Disassociate แล้ว เครื่องได้ public IP อัตโนมัติตัวใหม่ (ถ้าซอยตั้งไว้)", when: function (r) { return !!r.instId; } }, { label: "Release Elastic IP addresses", page: "del", kind: "eip" }],
    detail: function (r) { return [["Allocated IPv4 address", r.ip], ["Allocation ID", r.id], ["Associated instance ID", r.instId ? nm(find(S.insts, r.instId)) : "-"], ["ค่าใช้จ่าย", "คิดเงินทั้งตอนผูกและตอนว่าง"]]; },
    rows: function () { return S.eips; }, cols: [["Allocated IPv4 address", function (r) { return r.ip; }], ["Allocation ID", function (r) { return r.id; }], ["Associated instance ID", function (r) { return r.instId ? nm(find(S.insts, r.instId)) : "-"; }]] });
};
LISTS.itypes = function () {
  return ({ key: "itypes", title: "Instance types", crumb: "EC2 › Instance Types", empty: "-",
    rows: function () { return ITYPES.map(function (t) { return { id: t, name: t }; }); },
    cols: [["Instance type", function (r) { return r.name; }], ["vCPUs", function (r) { return String(ITYPE_INFO[r.name][0]); }], ["Memory (GiB)", function (r) { return String(ITYPE_INFO[r.name][1]); }], ["Free tier eligible (บัญชีหลัง 15 ก.ค. 2025)", function (r) { return FREE.indexOf(r.name) >= 0 ? tagp("Yes", "ok") : tagp("No", "warn"); }]] });
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
PAGES["ec2-dash"] = function () { return tilesPage("EC2 › Dashboard", "Dashboard", [["Instances (running)", liveInsts().filter(function (i) { return i.state === "running"; }).length, "insts"], ["Key pairs", S.keys.length, "keys"], ["Security groups", S.sgs.length, "sgs"], ["Load balancers", S.albs.length, "albs"], ["Target groups", S.tgs.length, "tgs"]], [["Launch instance", "launch", "insts"]]); };

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
    h("p", { cls: "hint", text: "ใน lab นี้ Jenkins ทำขั้น 1, 2, 4 ให้ใน Jenkinsfile (stage 'Build and push image') ด้วย $ECR_REGISTRY จาก /opt/jenkins/.env" })])]));
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
  return formPage({ name: "user-create", crumb: "IAM › Users › Create user", title: "Create user", back: "users", steps: 3, info: "เอกสาร IAM แนะนำให้ใช้ IAM role หรือ federation แทน user ที่มี access key ระยะยาว หน้านี้จำลองไว้ให้เห็นขั้นตอนตอนตั้ง aws configure สำหรับรัน terraform",
    init: function () { return { name: "", pol: ["AdministratorAccess"] }; },
    sections: function () { return [
      { step: 0, t: "Step 1: Specify user details", f: [{ id: "name", type: "text", label: "User name", req: true, ph: "terraform-admin" }] },
      { step: 1, t: "Step 2: Set permissions (Attach policies directly)", f: [{ id: "pol", type: "multi", opts: function () { return POLICIES.map(function (p) { return [p, p]; }); }, hint: "รัน terraform apply ของ lab นี้ต้องมีสิทธิ์สร้าง VPC, EC2, IAM, ECR, ELB จึงใช้ AdministratorAccess เฉพาะบัญชีฝึกนี้" }] },
      { step: 2, t: "Step 3: Review and create", f: [{ type: "custom", id: "rv", render: function (V) { return kvDom([["User name", V.name || "-"], ["Permissions", V.pol.join(", ") || "ไม่มี"]]); } }] }]; },
    submit: "Create user", onSubmit: function (V) { var x = API.createUser({ name: V.name, policies: V.pol }); if (x.errors) { UI.form.step = 0; return x; } UI.sel.users = x.res.id; return { msg: "สร้าง user " + V.name + " แล้ว ไปที่ Security credentials เพื่อสร้าง access key", next: "detail", nextParams: { kind: "user", id: x.res.id, from: "users", tab: "sec" } }; } });
};
PAGES["ak-create"] = function () {
  var u = find(S.users, UI.params.id);
  return formPage({ name: "ak-create-" + u.id, crumb: "IAM › Users › " + u.name + " › Create access key", title: "Create access key", back: "users", steps: 2,
    init: function () { return { use: "Command Line Interface (CLI)", ack: false, desc: "" }; },
    sections: function (V) { return [
      { step: 0, t: "Access key best practices & alternatives", f: [{ id: "use", type: "radio", label: "Use case", opts: function () { return ["Command Line Interface (CLI)", "Local code", "Application running on an AWS compute service", "Third-party service", "Application running outside AWS", "Other"].map(function (x) { return [x, x]; }); }, hint: "ชื่อ use case และกล่องยืนยันมาจากความจำ (เอกสารบอกให้เลือก use case แล้วกด Next)" }, { id: "ack", type: "check", text: "I understand the above recommendation and want to proceed to create an access key.", show: function (V) { return V.use === "Command Line Interface (CLI)"; } }] },
      { step: 1, t: "Set description tag - optional", f: [{ id: "desc", type: "text", label: "Description tag value", ph: "aws configure บนเครื่องเรา" }] }]; },
    submit: "Create access key", onSubmit: function (V) {
      if (V.use === "Command Line Interface (CLI)" && !V.ack) { UI.form.step = 0; return E("ack", "ต้องติ๊กยืนยันก่อนไปต่อ"); }
      var x = API.createAccessKey(u.id, V.use, V.desc); if (x.errors) return x;
      UI.secrets = UI.secrets || {}; UI.secrets[x.res.id] = x.secret; return { msg: "สร้าง access key แล้ว", next: "ak-retrieve", nextParams: { id: u.id, key: x.res.id } }; } });
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
function termPrompt() { return "swd@laptop:" + S.laptop.cwd.replace(HOME, "~") + "$ "; }
function termRun(raw) {
  var out = document.getElementById("termout"), r;
  if (TERM.ask) { var a = TERM.ask; TERM.ask = null; TERM.lines.push(a.label + (a.secret ? "" : raw)); r = a.done(raw); }
  else { TERM.lines.push(termPrompt() + raw); if (raw.trim()) TERM.hist.push(raw); TERM.hi = TERM.hist.length; r = shRun(raw); }
  if (r.clear) TERM.lines = [];
  r.lines.forEach(function (l) { TERM.lines.push.apply(TERM.lines, String(l).split("\n")); });
  if (r.ask) { TERM.ask = r.ask; }
  if (r.edit) { UI.edit = r.edit; UI.editDraft = null; go("files", {}, "Laptop"); return; }
  save(); renderLab(); termDraw();
}
function termDraw() {
  var out = document.getElementById("termout"), lab = document.getElementById("termlab"), inp = document.getElementById("terminp"); if (!out) return;
  out.textContent = TERM.lines.join("\n"); out.scrollTop = out.scrollHeight;
  lab.textContent = TERM.ask ? TERM.ask.label : termPrompt(); inp.type = TERM.ask && TERM.ask.secret ? "password" : "text"; inp.focus();
}
PAGES["term"] = function () {
  var inp = h("input", { id: "terminp", type: "text", autocomplete: "off", spellcheck: "false", "aria-label": "command", onkeydown: function (e) {
    if (e.key === "Enter") { var v = inp.value; inp.value = ""; termRun(v); }
    else if (e.key === "ArrowUp" && !TERM.ask) { if (TERM.hi > 0) inp.value = TERM.hist[--TERM.hi]; e.preventDefault(); }
    else if (e.key === "ArrowDown" && !TERM.ask) { TERM.hi = Math.min(TERM.hist.length, TERM.hi + 1); inp.value = TERM.hist[TERM.hi] || ""; e.preventDefault(); }
  } });
  var box = h("div", {}, [crumbEl("Laptop › Terminal"), h("h1", { text: "Terminal" }), h("p", { cls: "sub", text: "เครื่อง laptop จำลอง: รัน terraform / ansible / aws cli / ssh กับ AWS จำลองในหน้านี้ ผลสะท้อนในเมนู VPC, EC2, IAM, ECR ทันที" }),
    h("pre", { cls: "term", id: "termout", style: "min-height:320px;max-height:520px;overflow:auto" }), h("div", { cls: "termrow" }, [h("span", { id: "termlab", cls: "termlab" }), inp])]);
  setTimeout(termDraw, 0); return box;
};
PAGES["files"] = function () {
  var all = fsAll(), ks = Object.keys(all).filter(function (k) { return k.indexOf(REPO + "/") === 0 || k.indexOf(HOME + "/.") === 0; }).sort(), cur = UI.edit && all[UI.edit] !== undefined ? UI.edit : null;
  var ro = cur && (/\/\.(ssh|aws)\//.test(cur) || /terraform\.tfstate$/.test(cur));
  var ta = h("textarea", { id: "edtxt", rows: 24, spellcheck: "false", style: "width:100%;font-family:var(--mono);font-size:.82rem" }); ta.value = cur ? all[cur] : "";
  var list = h("div", { cls: "filelist" }, ks.map(function (k) { return h("button", { type: "button", cls: "fbtn", text: k.replace(REPO + "/", "").replace(HOME, "~"), "aria-current": String(k === cur), onclick: function () { UI.edit = k; go("files", {}, "Laptop"); } }); }));
  return h("div", {}, [crumbEl("Laptop › Files & editor"), h("h1", { text: "Files & editor" }), h("p", { cls: "sub", text: "แก้ไฟล์ Terraform/Ansible ใน repo จำลองได้ แล้วไปรัน terraform plan ใน Terminal จะเห็นผลทันที (ยกเว้น playbook .yml ของ Ansible ที่ยังรันจากชุดที่ฝังตอน build)" }),
    h("div", { cls: "filewrap" }, [list, h("div", {}, [h("p", { cls: "mono", text: cur ? cur.replace(HOME, "~") : "เลือกไฟล์ทางซ้าย" }), ta,
      cur ? h("p", {}, [h("button", { type: "button", cls: "btn pri", text: "Save", disabled: ro, onclick: function () { fsWrite(cur, ta.value); flash("ok", "บันทึก " + cur.replace(HOME, "~") + " แล้ว"); go("files", {}, "Laptop"); } }), ro ? h("small", { text: "  ไฟล์นี้จัดการผ่านคำสั่ง (ssh-keygen / aws configure / terraform) ไม่แก้ตรง ๆ" }) : null]) : null])])]);
};

// ---- lab panel
function renderLab() {
  var lab = document.getElementById("lab"); lab.textContent = "";
  var T = [["check", "ตรวจกับ Terraform"], ["hcl", "HCL ที่เทียบเท่า"], ["rules", "กฎที่จำลอง"], ["scen", "ตัวอย่างสำเร็จรูป"], ["fault", "ปัญหาโลกจริง"]];
  lab.appendChild(h("div", { cls: "tabs2", role: "tablist" }, T.map(function (t) { return h("button", { type: "button", text: t[1], "aria-current": String(UI.tab === t[0]), onclick: function () { UI.tab = t[0]; renderLab(); } }); })));
  var box = h("div", { cls: "card" }), cb = h("div", { cls: "cb" });
  if (UI.tab === "check") {
    var c = checks(), n = c.filter(function (x) { return x.ok; }).length;
    cb.appendChild(h("p", { text: "สิ่งที่คุณกดมาตรงกับที่โค้ด Terraform ของ lab สร้างแล้ว " + n + " จาก " + c.length + " ข้อ" }));
    cb.appendChild(h("div", { cls: "prog" }, [h("i", { style: "width:" + Math.round(100 * n / c.length) + "%" })]));
    cb.appendChild(h("ul", { cls: "chk" }, c.map(function (x) { return h("li", { cls: x.ok ? "ok" : "no" }, [h("span", { cls: "m", text: x.ok ? "✓" : "✗" }), h("span", {}, [x.label, x.hint && !x.ok ? h("small", { text: "วิธี: " + x.hint }) : null])]); })));
  } else if (UI.tab === "hcl") {
    cb.appendChild(h("p", { text: "สิ่งที่คุณกดไป แปลงเป็นโค้ด Terraform ตรง ๆ (ไม่ได้ย่อด้วย count/for_each เหมือนใน repo จริง จึงยาวกว่า) ใช้เทียบว่าแต่ละคลิกกลายเป็นบรรทัดไหน" }));
    cb.appendChild(h("pre", { cls: "hcl", text: hcl() }));
  } else if (UI.tab === "rules") {
    cb.appendChild(h("p", { text: "กฎที่หน้านี้ตรวจให้ แต่ละข้อบอกว่ายืนยันจากเอกสาร AWS แล้วหรือยัง" }));
    cb.appendChild(h("ul", { cls: "chk" }, RULES.map(function (r) { return h("li", {}, [h("span", { cls: "m" }, [h("span", { cls: "tag " + (r[1] ? "ok" : "warn"), text: r[1] ? "ตรงเอกสาร" : "ไม่ยืนยัน" })]), h("span", { text: r[0] })]); })));
  } else if (UI.tab === "fault") {
    var FL = [["vcpuQuota", "โควตา vCPU = 5 (default บัญชีใหม่ตามเอกสาร)", "ที่ vCPU เกิน 5 (เครื่องที่ 3 ที่ใช้ 2 vCPU) terraform apply ล้มด้วย VcpuLimitExceeded แก้: Service Quotas → Running On-Demand Standard instances → Request increase หรือใช้ cheap-mode (k8s_node_count=1, db_count=1)"],
      ["azMissing", "instance type บาง AZ ไม่มี (t3.medium ใน AZ ที่ 2)", "RunInstances ล้มด้วย Unsupported แก้: เปลี่ยน instance type หรือเลือก AZ อื่น"],
      ["providerLock", "lock file ล็อก provider aws เวอร์ชันเก่า (4.67.0)", "terraform init ล้ม แก้: terraform init -upgrade"],
      ["eventual", "eventual consistency: instance profile ใหม่ยังไม่พร้อมตอน RunInstances", "apply ครั้งแรกล้มที่ aws_instance ที่ผูก profile แก้: รัน terraform apply ซ้ำ (state เก็บของที่สร้างแล้ว)"]];
    cb.appendChild(h("p", { text: "เปิดปัญหาที่มักเจอบน AWS จริงแต่ปกติไม่เกิดในตัวจำลอง แล้วลองรัน terraform ใน Laptop › Terminal ข้อความ error ส่วนใหญ่จำลองจากความจำ ไม่ใช่ยืนยันจากของจริง" }));
    cb.appendChild(h("ul", { cls: "chk" }, FL.map(function (f) { return h("li", {}, [h("label", {}, [h("input", { type: "checkbox", checked: !!S.faults[f[0]], onchange: function (e) { if (e.target.checked) S.faults[f[0]] = true; else delete S.faults[f[0]]; save(); } }), " ", h("b", { text: f[1] })]), h("small", { text: f[2] })]); })));
    cb.appendChild(h("p", { cls: "sub", text: "ที่เกิดอยู่แล้วโดยไม่ต้องเปิด: AMI ไม่เจอถ้า owners/ชื่อ filter ไม่ตรง, โควตาตามเอกสาร (Elastic IP/VPC/IGW 5 ต่อ region, SG rule 60), Free plan ใช้ได้เฉพาะ instance type ในรายการ (เลือกเมนูบัญชีด้านบน), ALB/EC2/NAT แสดง Still creating... ตามเวลาโดยประมาณ" }));
  } else {
    var sc = [["full", "Lab ครบทั้งชุด", "สร้างทุกอย่างตามโค้ด Terraform ผ่านฟังก์ชันเดียวกับที่ฟอร์มใช้ ใช้ดูหน้า Instances, Connect, Load balancers และเทียบ HCL"],
      ["noassoc", "ลืมผูกซอยกับ route table", "ทุกอย่างครบ ยกเว้น Subnet associations ลอง Connect เครื่องไหนก็ได้ จะเจอ timeout ให้หาว่าติดที่ข้อไหน"],
      ["ecr", "ECR: Jenkins push แล้ว k8s pull", "ครบทั้งชุดและมี image v1.0.0 ใน repo แล้ว ไปที่ ECR › Repositories › Actions › Docker push / pull ลองรันจาก k8s (ReadOnly) ว่า push ได้ไหม และติ๊กกล่อง token หมดอายุ"],
      ["wrongip", "SG เปิด SSH ให้ IP ผิด", "ลอง Connect ดูว่าเจออะไร เทียบกับเมื่อแก้ My IP ด้านบนให้เป็น 203.0.113.99 (IP ที่กฎอนุญาต)"]];
    cb.appendChild(h("div", { cls: "scen" }, sc.map(function (s) { return h("div", {}, [h("p", {}, [h("b", { text: s[1] }), h("br"), s[2]]), h("button", { cls: "btn pri", type: "button", text: "โหลด", onclick: function () { try { buildLab(s[0]); UI.sel = {}; UI.form = null; flash("ok", "โหลด '" + s[1] + "' แล้ว ไปดูที่ EC2 › Instances"); go("insts", {}, "EC2"); } catch (e) { flash("bad", "โหลดไม่สำเร็จ: " + e.message); render(); } } })]); })));
  }
  box.appendChild(cb); lab.appendChild(box);
}

// ---- top bar controls
document.getElementById("myip").addEventListener("change", function (e) { var v = e.target.value.trim(); if (ip2n(v) === null) { flash("bad", "My IP ไม่ถูกต้อง"); e.target.value = S.myIp; } else S.myIp = v; render(); });
document.getElementById("acct").addEventListener("change", function (e) { S.acct = e.target.value; S.newAcct = S.acct === "free"; render(); });
document.getElementById("reset").addEventListener("click", function () { fresh(); UI.sel = {}; UI.form = null; UI.held = null; flash("info", "ล้างสถานะแล้ว เหลือแค่ default VPC เหมือนบัญชีใหม่"); go("vpc-dash", {}, "VPC"); });
load(); render();
