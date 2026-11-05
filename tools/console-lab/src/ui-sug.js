// ---- ช่องแนะนำ (datalist) ให้ "ทุกช่องกรอก": เลือกจากรายการได้ และพิมพ์เองได้เสมอ ----
// เดาชนิดช่องจากข้อความป้ายกำกับ/placeholder แล้วผูก <datalist> ให้เอง (ทำหลังทุกครั้งที่ DOM เปลี่ยน) · ช่องที่มี list อยู่แล้ว (exPick ฯลฯ) ข้ามไป
var SUG_PROJECTS = ["pharmacy", "cafe", "iam"];
function sugRepos() { var o = []; SUG_PROJECTS.forEach(function (p) { o.push(p + "-backend", p + "-frontend"); }); o.push("pharmacy-manifests"); return o; }
function sugImages() { var o = []; SUG_PROJECTS.forEach(function (p) { o.push(p + "/backend", p + "/frontend"); }); return o; }
function sugNames(sfx) { var o = []; SUG_PROJECTS.forEach(function (p) { o.push(p + sfx); }); return o; }
var SUG_RULES = [
  [/az:acr:name/, function () { return ["pharmacyacr01", "cafeacr01", "iamacr01"]; }],
  [/az:(rg|vnet|pip|nsg|asg):name/, function () { var m = (document.activeElement && document.activeElement.getAttribute("data-k")) || ""; return ["pharmacy", "cafe", "iam"].map(function (p) { return p + "-" + (/vnet/.test(m) ? "vnet" : /pip/.test(m) ? "ip" : /nsg/.test(m) ? "nsg" : /asg/.test(m) ? "asg" : "rg"); }); }],
  [/az:vnet:space/, function () { return ["10.0.0.0/16", "10.1.0.0/16", "192.168.0.0/16"]; }],
  [/password|passwd|secret|token|รหัสผ่าน/, null],
  [/email|อีเมล/, function () { return ["maht25102542@users.noreply.github.com", "admin@example.com", "somsri@example.com"]; }],
  [/repo|repository|git url|clone/, sugRepos],
  [/job|pipeline|workflow|project key|sonar/, sugRepos],
  [/image|ecr|registry|acr|docker|container name/, function () { return sugImages().concat(["sample-api", "nginx:1.27-alpine", "python:3.12-slim"]); }],
  [/tag|version|เวอร์ชัน|release/, function () { return ["v1.0.0", "v1.1.0", "v1.2.0", "dev-a1b2c3d", "latest"]; }],
  [/branch|ref/, function () { return ["main", "develop", "release/1.0", "feature/menu"]; }],
  [/cidr|ip range|address space|address prefix|ช่วง ip|source ip|allowed ip|my ip|myip/, function () { return ["10.0.0.0/16", "10.0.1.0/24", "10.0.11.0/24", "0.0.0.0/0", "198.51.100.7/32"]; }],
  [/\bip\b|address|host|ที่อยู่/, function () { return ["10.0.1.10", "203.0.113.10", "198.51.100.7", "localhost"]; }],
  [/port|พอร์ต/, function () { return ["22", "80", "443", "3000", "3306", "5432", "8000", "8080", "9000", "30080", "30443"]; }],
  [/instance type|size|vm size|ขนาด/, function () { return ["t3.micro", "t3.small", "t3.medium", "Standard_B1s", "Standard_B2s", "db.t4g.micro"]; }],
  [/\bami\b/, function () { return ["ami-ubuntu2404", "ami-ubuntu2204", "ami-al2023"]; }],
  [/key ?pair|key name|ssh key|public key|กุญแจ/, function () { return sugNames("-admin"); }],
  [/bucket|storage account/, function () { return ["pharmacy-site-dev", "cafe-assets", "iam-audit-logs", "pharmacy-tf-state"]; }],
  [/domain|hostname|alias|dns|cname|โดเมน/, function () { return ["example.com", "www.example.com", "api.example.com", "pharmacy.example.com", "cafe.example.com", "iam.example.com"]; }],
  [/region|location|ภูมิภาค/, function () { return ["ap-southeast-1", "us-east-1", "southeastasia", "eastasia", "japaneast"]; }],
  [/availability zone|\baz\b|zone/, function () { return ["ap-southeast-1a", "ap-southeast-1b", "ap-southeast-1c", "1", "2", "3"]; }],
  [/subnet/, function () { return ["pharmacy-public-1", "pharmacy-private-1", "cafe-public-1", "iam-private-1"]; }],
  [/security group|nsg|sg name|asg/, function () { return ["pharmacy-alb", "pharmacy-base", "pharmacy-k8s", "cafe-web", "iam-db"]; }],
  [/\bvpc\b|vnet|virtual network/, function () { return sugNames("-vpc"); }],
  [/cluster|eks|aks/, function () { return sugNames("-eks"); }],
  [/database|\bdb\b|rds|schema/, function () { return ["pharmacy_dev", "pharmacy_prd", "cafe_dev", "iam_dev", "pharmacy-db"]; }],
  [/role|policy|iam|permission|สิทธิ์/, function () { return sugNames("-role").concat(["AdministratorAccess", "AmazonEC2ContainerRegistryReadOnly", "AmazonSSMManagedInstanceCore"]); }],
  [/user ?name|username|login|account|ผู้ใช้|บัญชี|owner/, function () { return ["maht25102542", "admin", "somsri", "tf-admin"]; }],
  [/url|link|endpoint|origin|webhook/, function () { return ["https://github.com/maht25102542/pharmacy-backend", "https://github.com/maht25102542/cafe-backend", "https://github.com/maht25102542/iam-backend", "http://localhost:8080"]; }],
  [/tag key|^key$|tag name/, function () { return ["Name", "Project", "Env", "Owner", "ManagedBy"]; }],
  [/tag value|^value$|environment|\benv\b/, function () { return ["pharmacy", "cafe", "iam", "dev", "prd", "terraform"]; }],
  [/descript|note|message|comment|reason|คำอธิบาย|หมายเหตุ/, function () { return ["ฝึก lab", "release v1.0.0", "fix healthz", "ปล่อยขึ้น dev"]; }],
  [/lb|alb|load ?balancer|target group|listener/, function () { return sugNames("-alb").concat(sugNames("-lb")); }],
  [/function|lambda|handler/, function () { return sugNames("-fn"); }],
  [/table|collection/, function () { return ["pharmacy-orders", "cafe-menu", "iam-users"]; }],
  [/name|ชื่อ|title|id\b/, function () { return sugRepos().concat(sugNames("-vpc"), sugNames("-alb"), sugNames("-rg")); }]
];
var SUG_DEFAULT = function () { return SUG_PROJECTS.concat(sugRepos()); };
function sugHint(el) {
  var parts = [el.getAttribute("aria-label"), el.placeholder, el.name, el.id, el.title, el.getAttribute("data-k")];
  var lb = el.closest && el.closest("label"); if (lb) parts.push(lb.textContent.slice(0, 60));
  var prev = el.previousElementSibling; if (prev && !/^(INPUT|SELECT|TEXTAREA)$/.test(prev.tagName)) parts.push(prev.textContent.slice(0, 50));
  var p = el.parentElement; for (var i = 0; p && i < 3; i++, p = p.parentElement) { var f = p.querySelector(":scope > label, :scope > .l, :scope > .azfl, :scope > .azk, :scope > th"); if (f && f !== el) { parts.push(f.textContent.slice(0, 60)); break; } var ps = p.previousElementSibling; if (ps && ps.textContent.length < 50 && !ps.querySelector("input,select")) { parts.push(ps.textContent); break; } }
  return parts.filter(Boolean).join(" ").toLowerCase();
}
var SUG_LISTS = {};
function sugList(key, items) {
  var id = "sug-" + key, dl = document.getElementById(id);
  if (!dl) { dl = document.createElement("datalist"); dl.id = id; dl.setAttribute("data-sug", "1"); document.body.appendChild(dl); SUG_LISTS[key] = 1; }
  var sig = items.join("|"); if (dl.getAttribute("data-sig") !== sig) { dl.textContent = ""; items.forEach(function (v) { var o = document.createElement("option"); o.value = v; dl.appendChild(o); }); dl.setAttribute("data-sig", sig); }
  return id;
}
function sugEnhance() {
  var inputs = document.querySelectorAll('input:not([list]):not([data-nosug])');
  [].forEach.call(inputs, function (el) {
    var t = (el.type || "text").toLowerCase(); if (t !== "text" && t !== "") return;
    if (el.readOnly || el.disabled || el.closest(".term,.edwrap,#term,.fdsr,.azsearch,.bdom,.azflt,.azbsb,.azfbn,.gsearch")) return;
    var hint = sugHint(el), items = null, key = "default";
    for (var i = 0; i < SUG_RULES.length; i++) { if (SUG_RULES[i][0].test(hint)) { key = String(i); if (SUG_RULES[i][1]) items = SUG_RULES[i][1](); else { el.setAttribute("data-nosug", "1"); return; } break; } }
    if (!items) items = SUG_DEFAULT();
    var cur = el.value; if (cur && items.indexOf(cur) < 0) items = [cur].concat(items);
    el.setAttribute("list", sugList(key + (key === "default" ? "" : ""), items)); el.setAttribute("autocomplete", "off");
  });
}
(function () {
  var t = 0, busy = false;
  var mo = new MutationObserver(function (ms) { if (busy) return; if (ms.every(function (m) { return [].every.call(m.addedNodes, function (n) { return n.nodeType === 1 && n.getAttribute && n.getAttribute("data-sug"); }) && !m.removedNodes.length; })) return; clearTimeout(t); t = setTimeout(function () { busy = true; try { sugEnhance(); } catch (e) { /* ช่องแนะนำพังไม่ควรทำให้หน้าล่ม */ } busy = false; }, 40); });
  mo.observe(document.body, { childList: true, subtree: true });
  setTimeout(sugEnhance, 200);
})();
