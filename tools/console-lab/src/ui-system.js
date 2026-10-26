// ---- แอนิเมชันภาพรวมทั้งระบบ (Lab › Terraform): แบบที่ระบบจริงใช้ — 3 AZ · public/private subnet · NAT · bastion · k3s HA · Galera คนละ AZ
// เครื่องทุกตัวเชื่อมกันยังไง · แต่ละเครื่องมีอะไรติดตัว (Role, Tier, SG, subnet/AZ, แอป FE/BE, env dev/prd) · Load balancer กระจายคำขอ
// · เครื่องล่ม / AZ ล่มแล้วอะไรรอด · SSH ผ่าน bastion · ออกเน็ตผ่าน NAT · เส้นทางส่งมอบ CI/CD
var SYS_C = { prd: "#2563eb", dev: "#0f9d8a", db: "#b45309", tool: "#c0392b", net: "#1d8102", alb: "#8456ce", bas: "#475569", mute: "#64748b" };
// ข้อมูลเครื่อง: [ชื่อ, role tag, env(สี), tier, AZ (a/b/c), SG ตามหน้าที่, แอปที่รัน (ป้าย, สี), พอร์ต/หมายเหตุ]
var SYS_M = [
  ["pharmacy-bastion", "bastion", "bas", "public", "a", ["pharmacy-bastion"], [["SSH", "#475569"]], "SSH :22 จาก My IP เท่านั้น"],
  ["pharmacy-jenkins", "jenkins", "tool", "public", "a", ["pharmacy-base", "pharmacy-jenkins"], [["Jenkins", "#d33833"]], "8080 จาก My IP · IAM: ECR PowerUser"],
  ["pharmacy-sonarqube", "sonarqube", "tool", "public", "a", ["pharmacy-base", "pharmacy-sonarqube"], [["SonarQube", "#2b6cb0"]], "9000 จาก My IP + Jenkins"],
  ["pharmacy-k8s-1", "k8s_server", "prd", "private", "a", ["pharmacy-base", "pharmacy-k8s"], [["FE", "#2563eb"], ["BE", "#7c3aed"], ["ArgoCD", "#ef7b4d"]], "k3s server #1 (leader) · NodePort 30080/30443"],
  ["pharmacy-k8s-2", "k8s_server", "prd", "private", "b", ["pharmacy-base", "pharmacy-k8s"], [["FE", "#2563eb"], ["BE", "#7c3aed"]], "k3s server #2 · NodePort 30080"],
  ["pharmacy-k8s-3", "k8s_server", "prd", "private", "c", ["pharmacy-base", "pharmacy-k8s"], [["FE", "#2563eb"], ["BE", "#7c3aed"]], "k3s server #3 · NodePort 30080"],
  ["pharmacy-dev", "k8s_dev", "dev", "private", "a", ["pharmacy-base", "pharmacy-k8s"], [["FE", "#0f9d8a"], ["BE", "#0b7285"]], "k3s เครื่องเดียว · NodePort 30081"],
  ["pharmacy-db-1", "db", "db", "private", "a", ["pharmacy-base", "pharmacy-db"], [["MariaDB", "#b45309"]], "3306 จาก k8s เท่านั้น · Galera node 1"],
  ["pharmacy-db-2", "db", "db", "private", "b", ["pharmacy-base", "pharmacy-db"], [["MariaDB", "#b45309"]], "3306 จาก k8s เท่านั้น · Galera node 2"],
  ["pharmacy-db-3", "db", "db", "private", "c", ["pharmacy-base", "pharmacy-db"], [["MariaDB", "#b45309"]], "3306 จาก k8s เท่านั้น · Galera node 3"]
];
// สถานะที่ผู้เรียนสร้างจริง (ถ้ามี): IP, subnet, AZ, SG ของเครื่องนั้น · ไม่มี = ใช้ค่าตามโค้ด Terraform
function sysReal(name) {
  var i = (S.insts || []).filter(function (x) { return x.name === name && x.state !== "terminated"; })[0]; if (!i) return null;
  var sn = (S.subnets || []).filter(function (x) { return x.id === i.subnetId; })[0] || {}, sgs = (i.sgIds || []).map(function (id) { var g = (S.sgs || []).filter(function (x) { return x.id === id; })[0]; return g ? g.name : id; });
  return { ip: i.privateIp, subnet: sn.name || sn.id, az: (sn.az || i.az || "").slice(-1), sgs: sgs };
}

function sysAnim() {
  var W = 1040, H = 900, svg = sv("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", style: "max-width:1040px;font-family:inherit", role: "img", "aria-label": "แผนภาพระบบทั้งหมด 3 AZ" }), layers = {}, cards = {}, count = {}, up = {}, ci = 0;
  var tx = function (x, y, t, o) { o = o || {}; var e = sv("text", { x: x, y: y, "font-size": o.sz || 11, "font-weight": o.b ? 700 : 400, fill: o.c || "currentColor", "text-anchor": o.a || "start" }, [t]); if (o.halo) { e.style.paintOrder = "stroke"; e.style.stroke = "var(--surface, #fff)"; e.style.strokeWidth = "5px"; e.style.strokeLinejoin = "round"; } return e; };
  var box = function (x, y, w, hh, r, fill, stroke, sw, dash) { return sv("rect", { x: x, y: y, width: w, height: hh, rx: r, fill: fill, stroke: stroke, "stroke-width": sw || 1.5, "stroke-dasharray": dash || null }); };
  function L(layer, e) { (layers[layer] = layers[layer] || []).push(e); e.style.opacity = "0"; e.style.transition = "opacity .5s"; svg.appendChild(e); return e; }
  function show(names, on) { [].concat(names).forEach(function (n) { (layers[n] || []).forEach(function (e) { e.style.opacity = on === false ? "0" : "1"; }); }); }
  function chip(layer, x, y, w, t, col) { L(layer, sv("g", {}, [box(x, y, w, 15, 7, col + "22", col, 1), tx(x + w / 2, y + 11, t, { a: "middle", sz: 9, b: 1, c: col })])); }
  var COL = { a: 40, b: 365, c: 690 }, CW = 310, AZC = { a: "#2563eb", b: "#8456ce", c: "#0f9d8a" }, AZN = { a: 1, b: 2, c: 3 };

  // ---------- โครงเครือข่าย ----------
  svg.appendChild(sv("g", {}, [box(30, 22, 130, 50, 25, "#eef3fa", "#8aa4c8"), tx(95, 44, "Internet", { a: "middle", b: 1, c: "#2a4a7a", sz: 13 }), tx(95, 60, "ผู้ใช้เว็บ / เรา", { a: "middle", c: "#2a4a7a", sz: 10 })]));
  L("net", sv("g", {}, [box(20, 96, 1000, 700, 14, "rgba(37,99,235,.03)", "#2563eb", 2), tx(36, 116, "VPC pharmacy-vpc · 10.0.0.0/16", { b: 1, c: "#2563eb", sz: 12, halo: 1 })]));
  L("net", sv("g", {}, [box(238, 74, 100, 38, 8, "#fff3e8", "#f2711c", 2), tx(288, 91, "Internet gateway", { a: "middle", b: 1, c: "#c2500c", sz: 10 }), tx(288, 105, "public → 0.0.0.0/0", { a: "middle", sz: 8, c: "#c2500c" })]));
  L("net", sv("line", { x1: 160, y1: 47, x2: 288, y2: 74, stroke: "#f2711c", "stroke-width": 2 }));
  ["a", "b", "c"].forEach(function (z) {
    var x = COL[z], col = AZC[z], n = AZN[z];
    L("net", sv("g", {}, [box(x, 158, CW, 176, 10, col + "0d", col, 1.5, "6 4"), tx(x + 10, 175, "public-" + n + " · 10.0." + n + ".0/24 · AZ " + z, { b: 1, c: col, sz: 11 }), tx(x + 10, 190, "route 0.0.0.0/0 → IGW · ได้ public IP", { sz: 9, c: SYS_C.mute })]));
    L("net", sv("g", {}, [box(x, 346, CW, 440, 10, col + "14", col, 1.5), tx(x + 10, 363, "private-" + n + " · 10.0." + (n + 10) + ".0/24 · AZ " + z, { b: 1, c: col, sz: 11 }), tx(x + 10, 378, "route 0.0.0.0/0 → NAT · ไม่มี public IP", { sz: 9, c: SYS_C.mute })]));
  });

  // ---------- การ์ดเครื่อง ----------
  var slot = { a: { pub: 0, prv: 0 }, b: { pub: 0, prv: 0 }, c: { pub: 0, prv: 0 } };
  SYS_M.forEach(function (m) {
    var name = m[0], real0 = sysReal(name), az = real0 && real0.az ? real0.az : m[4], pub = m[3] === "public", col = SYS_C[m[2]];
    var sl = pub ? slot[az].pub++ : slot[az].prv++, x, y, w, hh;
    if (pub) { w = 148; hh = 70; x = COL[az] + 8 + (sl % 2) * 154; y = 198 + Math.floor(sl / 2) * 78; } else { w = CW - 20; hh = 122; x = COL[az] + 10; y = 388 + sl * 132; }
    var ip = real0 ? real0.ip : "10.0." + (pub ? AZN[az] : AZN[az] + 10) + ".x", sub = real0 ? real0.subnet : (pub ? "public-" : "private-") + AZN[az], sgs = real0 && real0.sgs.length ? real0.sgs : m[5];
    var short = name.replace("pharmacy-", ""), body = sv("g", {}, [box(x, y, w, hh, 10, "#fff", col, 2), tx(x + 8, y + 16, "🖥 " + short, { b: 1, sz: pub ? 11 : 12 })]);
    var c = cards[name] = { x: x, y: y, w: w, h: hh, cx: x + w / 2, glow: body.firstChild, cnt: null, m: m, az: az, pub: pub }; L("mach", body);
    if (pub) {
      chip("role", x + 6, y + 22, w - 12, "Role = " + m[1], col); chip("sg", x + 6, y + 40, w - 12, "SG " + sgs.map(function (g) { return g.replace("pharmacy-", ""); }).join("+"), "#c2410c");
      L("app", sv("g", {}, [box(x + 6, y + 56, w - 12, 12, 5, m[6][0][1], m[6][0][1]), tx(x + w / 2, y + 66, m[6][0][0], { a: "middle", b: 1, c: "#fff", sz: 8 })]));
      up[name] = true; return;
    }
    chip("role", x + w - 138, y + 6, 128, "Role = " + m[1], col);
    chip("net", x + 8, y + 24, w - 16, String(sub).replace(/^pharmacy-/, "") + " · AZ " + az + " · " + ip, AZC[az]);
    sgs.forEach(function (g, k) { chip("sg", x + 8 + k * 138, y + 44, 134, "SG " + g.replace("pharmacy-", ""), "#c2410c"); });
    c.pods = {}; var ay = y + 66, aw = Math.floor((w - 16) / m[6].length) - 6;
    m[6].forEach(function (a, k) { var ax = x + 8 + k * (aw + 6); L("app", sv("g", {}, [box(ax, ay, aw, 26, 7, a[1], a[1]), tx(ax + aw / 2, ay + 17, a[0], { a: "middle", b: 1, c: "#fff", sz: 11 })])); c.pods[a[0]] = [ax + aw / 2, ay + 13]; });
    L("app", tx(x + 8, y + 108, m[7], { sz: 9, c: SYS_C.mute }));
    c.cnt = tx(x + w - 8, y + 108, "", { sz: 10, b: 1, c: col, a: "end" }); L("lb", c.cnt);
    up[name] = true;
  });
  // NAT (public-1) + EIP
  var natR = (S.nats || []).filter(function (n) { return n.state !== "deleted"; })[0], natX = COL.a + 8 + 154, natY = 198 + 74, nat = { cx: natX + 74, y: natY };
  L("net", sv("g", {}, [box(natX, natY, 148, 64, 10, "#fff", "#e8590c", 2), tx(natX + 8, natY + 14, "🌐 NAT gateway", { b: 1, sz: 11 }), tx(natX + 8, natY + 28, "Elastic IP ถาวร", { sz: 9, c: SYS_C.mute }), tx(natX + 8, natY + 41, natR ? "สถานะ: " + natR.state : "private ออกเน็ตทางนี้", { sz: 9, c: "#e8590c", b: 1 }), tx(natX + 8, natY + 55, "ตัวเดียว (ประหยัด)", { sz: 8, c: SYS_C.mute })]));
  // ---------- ALB + เส้น target group ----------
  L("alb", sv("g", {}, [box(330, 124, 400, 26, 10, "#8456ce22", "#8456ce", 2), tx(530, 141, "Application Load Balancer · ครบ 3 AZ · :80 prd · :8080 dev · :8443 ArgoCD", { a: "middle", b: 1, c: "#8456ce", sz: 10 })]));
  L("alb", sv("line", { x1: 288, y1: 112, x2: 430, y2: 124, stroke: "#8456ce", "stroke-width": 2 }));
  ["b", "c"].forEach(function (z) { L("alb", sv("g", {}, [box(COL[z] + 8, 198, 148, 44, 8, "#8456ce12", "#8456ce", 1, "4 3"), tx(COL[z] + 82, 215, "ALB node", { a: "middle", b: 1, c: "#8456ce", sz: 10 }), tx(COL[z] + 82, 229, "AWS จัดการให้ ไม่ใช่เครื่องเรา", { a: "middle", sz: 8, c: SYS_C.mute })])); });
  ["pharmacy-k8s-1", "pharmacy-k8s-2", "pharmacy-k8s-3"].forEach(function (n) { var c = cards[n]; c.line = L("alb", sv("line", { x1: 520, y1: 150, x2: c.cx, y2: c.y, stroke: SYS_C.prd, "stroke-width": 2, "stroke-dasharray": "5 4" })); });
  L("alb", sv("line", { x1: 620, y1: 150, x2: cards["pharmacy-dev"].cx, y2: cards["pharmacy-dev"].y, stroke: SYS_C.dev, "stroke-width": 2, "stroke-dasharray": "5 4" }));
  L("alb", tx(470, 262, "target group prd :30080 → k8s 3 เครื่อง (private)", { sz: 9, b: 1, c: SYS_C.prd, halo: 1 }));
  // CI/CD node ด้านล่าง
  L("cicd", sv("g", {}, [box(360, 812, 150, 44, 10, "#f6f8fa", "#475569", 1.5), tx(435, 831, "GitHub", { a: "middle", b: 1, sz: 12 }), tx(435, 846, "โค้ด 2 repo + manifests", { a: "middle", sz: 9, c: SYS_C.mute })]));
  L("cicd", sv("g", {}, [box(540, 812, 150, 44, 10, "#fff3e0", "#ff9900", 1.5), tx(615, 831, "ECR (AWS)", { a: "middle", b: 1, sz: 12 }), tx(615, 846, "เก็บ image ตามเวอร์ชัน", { a: "middle", sz: 9, c: SYS_C.mute })]));
  L("cicd", tx(710, 834, "③ ArgoCD อ่าน manifests · ④ node ดึง image ผ่าน NAT", { sz: 9, b: 1, c: "#ef7b4d" }));
  // ตำนาน
  svg.appendChild(sv("g", {}, [tx(40, 822, "สี:", { b: 1, sz: 10 })].concat([["prd", "prd"], ["dev", "dev"], ["db", "database"], ["tool", "CI/CD"], ["bas", "bastion"]].map(function (l, k) { return sv("g", {}, [box(66 + k * 56, 812, 10, 10, 3, SYS_C[l[0]], SYS_C[l[0]], 1), tx(80 + k * 56, 821, l[1], { sz: 8 })]); })).concat([tx(40, 842, "จุดส้ม = คำขอ prd · เขียวอมฟ้า = คำขอ dev · ม่วง = SSH ผู้ดูแล", { sz: 9, c: SYS_C.mute }), tx(40, 856, "เส้นประ = ทางที่ ALB ส่งคำขอไป", { sz: 9, c: SYS_C.mute })])));
  var pk = sv("g", {}, [sv("circle", { r: 9, fill: "#ff9900", stroke: "#fff", "stroke-width": 2 }), tx(0, 24, "", { a: "middle", b: 1, sz: 10, halo: 1 })]); pk.style.opacity = "0"; pk.style.transform = "translate(95px,47px)"; svg.appendChild(pk);
  function move(x, y, label, col) { var d = (0.45 * (+JKX.spd || 1)).toFixed(2); pk.style.transition = "transform " + d + "s ease-in-out, opacity .3s"; pk.style.opacity = "1"; pk.firstChild.setAttribute("fill", col || "#ff9900"); pk.lastChild.textContent = label || ""; pk.style.transform = "translate(" + x + "px," + y + "px)"; }
  function hidePk() { pk.style.opacity = "0"; }

  // ---------- คำอธิบาย + ไทม์ไลน์ ----------
  var cap = h("div", { style: "margin:10px 0" }), tl = h("div", { cls: "chips", style: "margin:10px 0 6px" });
  var SC = [
    ["เครือข่าย 3 AZ", "net", [["อะไร", "#2563eb", "**VPC** `10.0.0.0/16` ซอยเป็น **public** 3 อัน และ **private** 3 อัน กระจาย **3 AZ** (a, b, c) · **IGW** คือประตูออกเน็ต · **NAT** ให้เครื่องใน private ออกเน็ตได้แต่ ==ขาเข้าเข้าไม่ได้=="], ["ทำไมแยก", "#1d8102", "เครื่องที่เก็บ**แอปและข้อมูล**อยู่ private ไม่มี public IP ==ไม่มีทางถูกเข้าตรงจากอินเทอร์เน็ต== · มีแค่ ALB และ bastion ที่เปิดหน้าบ้าน"]]],
    ["เครื่อง 10 ตัว", "mach", [["อะไร", "#2563eb", "**public:** bastion, Jenkins, SonarQube (+ NAT) · **private:** k8s ×3 (HA), dev, DB ×3"], ["วางยังไง", "#1d8102", "k8s และ DB อย่างละ 3 ตัว **คนละ AZ** · dev, Jenkins, SonarQube อยู่ AZ a (ตัวเดียว)"]]],
    ["Role + Tier", "role", [["ป้าย Role", "#7b3fe4", "นามบัตรของเครื่อง (`bastion`, `jenkins`, `k8s_server`, `k8s_dev`, `db`, `sonarqube`) · **Ansible** แยกกลุ่ม `role_*` จากป้ายนี้"], ["ป้าย Tier", "#475569", "`public` / `private` · บอกว่าเครื่องไหนมี public IP (ต้องผ่าน bastion หรือไม่)"]]],
    ["Security group", "sg", [["อะไร", "#c2410c", "**SG** = firewall ติดตัวเครื่อง · **bastion** รับ SSH จาก ==My IP== ที่เดียว · เครื่องอื่นมี `base` = รับ SSH จาก **SG ของ bastion เท่านั้น**"], ["เช่น", "#2563eb", "`k8s` รับ NodePort จาก ==ALB เท่านั้น== · `db` รับ **3306** จาก SG ของ k8s เท่านั้น · `jenkins`/`sonarqube` เปิด UI เฉพาะ My IP"]]],
    ["แอปบนเครื่อง", "app", [["อะไร", "#2563eb", "**k8s ×3** รัน FE กับ BE (prd) + **ArgoCD** ที่ k8s-1 · **dev** รัน FE/BE ของ dev · **db ×3** เป็น MariaDB Galera · **Jenkins/SonarQube** รันใน docker"], ["k3s HA", "#7c3aed", "k8s ทั้ง 3 เป็น **server** (มี etcd ในตัว) ล่มได้ 1 เครื่อง cluster ยังทำงาน · ตัวแรกเริ่ม `--cluster-init` ที่เหลือมา join"]]],
    ["Load balancer", "alb", [["อะไร", "#8456ce", "**ALB** อยู่ public ครบ 3 AZ รับคำขอแล้วส่งเข้า k8s ใน **private** · `:80` → prd (NodePort `30080`) · `:8080` → dev (`30081`) · `:8443` → ArgoCD"], ["ตรวจสุขภาพ", "#1d8102", "ALB เรียก `/healthz` ตลอด · ==เครื่องที่ไม่ตอบ== ไม่ถูกส่งคำขอ"]]],
    ["คำขอ prd", "lbprd", [["เห็นอะไร", "#2563eb", "เข้าเว็บ prd 6 ครั้ง ALB ส่ง==วนทีละเครื่อง== (**round-robin**) k8s-1 → 2 → 3 → 1 …"], ["ต่อจาก FE", "#7c3aed", "FE เรียก **BE** ผ่าน Service `backend` (สุ่ม pod ทั้ง cluster จึงข้ามเครื่อง/AZ ได้) · BE ต่อ DB ผ่าน Service `galera` เลือก node ที่ว่าง"]]],
    ["เครื่องล่ม", "health", [["เหตุการณ์", "#c0392b", "**k8s-2 ล่ม** · health check `/healthz` ไม่ผ่าน → ALB ==ตัดออกจากวง== ส่งให้ k8s-1 กับ k8s-3"], ["ผลต่อผู้ใช้", "#1d8102", "ผู้ใช้ไม่รู้ตัว · k8s-2 กลับมา ALB ใส่กลับเอง"]]],
    ["AZ a ล่มทั้งโซน", "azdown", [["เหตุการณ์", "#c0392b", "ตึก **AZ a ทั้งหลังดับ** · เครื่องใน AZ a หายหมด (k8s-1, db-1, dev, bastion, NAT, Jenkins, SonarQube)"], ["ที่ยังรอด ✓", "#1d8102", "**เว็บ prd** (k8s-2, 3 ใน AZ b, c รับต่อ) · **DB** (เหลือ db-2, db-3 = เสียงข้างมาก ==2 ใน 3== ยังรับ-เขียนได้) · k3s **ยังมี etcd 2 ใน 3**"], ["ที่หาย ✗", "#c0392b", "dev, **ArgoCD** (อยู่บน k8s-1), Jenkins, SonarQube, bastion (อยู่ AZ a ตัวเดียว) · **NAT** อยู่ AZ a ➜ private ออกเน็ตไม่ได้ (pod ที่รันอยู่ปกติ แต่ดึง image ใหม่ไม่ได้) ➜ ระบบจริงใช้ NAT ต่อ AZ"]]],
    ["คำขอ dev", "lbdev", [["เห็นอะไร", "#0f9d8a", "เข้า `:8080` = **dev** ส่งไป pharmacy-dev → FE → BE → DB ชื่อ `pharmacy_dev`"], ["ทำไมแยก", "#1d8102", "ทดสอบเวอร์ชันใหม่บน dev ==ไม่กระทบ prd== · ใช้ Galera ชุดเดียวกัน แต่คนละฐานข้อมูล"]]],
    ["SSH ผ่าน bastion", "ssh", [["ลำดับ", "#475569", "ผู้ดูแล (หรือ **Ansible**) ต่อ SSH เข้า **bastion** ก่อน (SG รับจาก My IP) แล้วกระโดดต่อไป **private IP** ของ k8s-2 (SG ของ k8s-2 รับ SSH จาก SG ของ bastion)"], ["ทำไม", "#1d8102", "เครื่องภายในไม่ต้องเปิด SSH ออกอินเทอร์เน็ต · ==ทางเข้าเดียว== ตรวจ/ปิดได้ที่เดียว"]]],
    ["ออกเน็ตผ่าน NAT", "nat", [["เห็นอะไร", "#e8590c", "k8s-2 (private) ดึง image จาก **ECR** ➜ ส่งออกทาง **NAT** ➜ IGW ➜ อินเทอร์เน็ต · คำตอบกลับมาทางเดิม"], ["ข้อจำกัด", "#1d8102", "NAT ให้แค่ ==ขาออก== · ใครจากเน็ตเริ่มต่อเข้า k8s-2 ตรงๆ ไม่ได้"]]],
    ["ส่งมอบ CI/CD", "cicd", [["ลำดับ", "#c0392b", "① **Jenkins** build แล้ว push image ขึ้น **ECR** ② แก้ `image:` ใน manifests ③ **ArgoCD** เห็นแล้วสั่ง cluster ④ node **ดึง image** (ผ่าน NAT)"], ["ทำไม", "#1d8102", "Git เป็นแหล่งความจริงเดียว · ย้อนเวอร์ชัน = ย้อน commit"]]]
  ];
  function sync() { tl.textContent = ""; SC.forEach(function (s, i) { tl.appendChild(h("span", { cls: "chip" + (i === ci ? " on" : ""), style: "cursor:default" }, [(i + 1) + ". " + s[0]])); }); }
  function say(i) { ci = i; sync(); cap.textContent = ""; cap.appendChild(h("h3", { style: "margin:4px 0 8px", text: (i + 1) + ". " + SC[i][0] })); cap.appendChild(infoCard(SC[i][2])); }
  function setCnt(n) { var c = cards[n]; if (c && c.cnt) c.cnt.textContent = "รับแล้ว " + (count[n] || 0) + " คำขอ"; }
  function glow(n, on, col) { var c = cards[n]; if (!c || !up[n]) return; c.glow.setAttribute("stroke-width", on ? 4 : 2); c.glow.setAttribute("fill", on ? (col || "#2563eb") + "18" : "#fff"); }
  function down(n, bad, why) {
    var c = cards[n]; up[n] = !bad; c.glow.setAttribute("stroke", bad ? "#c62828" : SYS_C[c.m[2]]); c.glow.setAttribute("fill", bad ? "#fde8e8" : "#fff"); c.glow.setAttribute("stroke-width", 2);
    if (c.line) { c.line.setAttribute("stroke", bad ? "#c62828" : SYS_C.prd); c.line.setAttribute("stroke-dasharray", bad ? "2 5" : "5 4"); }
    if (c.cnt) c.cnt.textContent = bad ? "✗ " + (why || "ล่ม") : "รับแล้ว " + (count[n] || 0) + " คำขอ";
  }
  function reset() {
    Object.keys(layers).forEach(function (k) { show(k, false); }); hidePk(); count = {}; ci = 0;
    Object.keys(cards).forEach(function (n) { down(n, false); glow(n, false); if (cards[n].cnt) cards[n].cnt.textContent = ""; });
    sync(); cap.textContent = ""; cap.appendChild(infoCard([["ดูอะไร", "#2563eb", "กด ==▶ เล่น== เพื่อดูทีละฉาก: **เครือข่าย 3 AZ → เครื่อง → Role → Security group → แอป → Load balancer → คำขอ → เครื่องล่ม → AZ ล่ม → dev → SSH ผ่าน bastion → NAT → CI/CD**"], ["ปรับความเร็ว", "#1d8102", "เลือก ช้า / ปกติ / เร็ว ที่ปุ่มด้านบน · หยุดชั่วคราวได้ทุกเมื่อ"]]));
  }
  var P = jkxPlayer(reset, function (P) {
    var st = [], prd = ["pharmacy-k8s-1", "pharmacy-k8s-2", "pharmacy-k8s-3"], dbs = ["pharmacy-db-1", "pharmacy-db-2", "pharmacy-db-3"], rr = 0, dbi = 0, J = cards["pharmacy-jenkins"];
    function scene(i, layer, wait) { st.push([wait || 900, function () { say(i); show(layer); }]); }
    function request(env, k) {
      // เลือกเครื่องตอนเล่นจริง (ไม่ใช่ตอนสร้างลำดับ) เพราะเครื่องที่ล่มเปลี่ยนไปตามฉาก
      var c = {}, col = env === "prd" ? "#ff9900" : "#0f9d8a";
      st.push([350, function () {
        var alive = env === "prd" ? prd.filter(function (x) { return up[x]; }) : ["pharmacy-dev"], dalive = dbs.filter(function (x) { return up[x]; });
        c.n = alive[rr % alive.length]; c.be = env === "prd" ? alive[(rr + 1) % alive.length] : c.n; c.db = dalive[dbi++ % dalive.length]; rr++;
        c.a = cards[c.n]; c.b = cards[c.be]; c.d = cards[c.db]; c.fe = c.a.pods && c.a.pods.FE || [c.a.cx, c.a.y + 70]; c.bp = c.b.pods && c.b.pods.BE || [c.b.cx, c.b.y + 70];
        move(520, 137, "คำขอ " + (k + 1), col);
      }]);
      st.push([500, function () { move(c.a.cx, c.a.y - 4, env + " → " + c.n.replace("pharmacy-", ""), col); glow(c.n, true, col); }]);
      st.push([500, function () { move(c.fe[0], c.fe[1], "FE", col); count[c.n] = (count[c.n] || 0) + 1; setCnt(c.n); }]);
      st.push([500, function () { move(c.bp[0], c.bp[1], "BE", col); glow(c.be, true, col); }]);
      st.push([500, function () { move(c.d.cx, c.d.y + 50, "DB " + c.db.slice(-1), col); glow(c.db, true, SYS_C.db); }]);
      st.push([350, function () { hidePk(); glow(c.n, false); glow(c.be, false); glow(c.db, false); }]);
    }
    scene(0, ["net"]); scene(1, ["mach"]); scene(2, ["role"]); scene(3, ["sg"]); scene(4, ["app"]); scene(5, ["alb", "lb"]);
    scene(6, [], 600); for (var i = 0; i < 6; i++) request("prd", i);
    scene(7, [], 600); st.push([900, function () { down("pharmacy-k8s-2", true, "health check ไม่ผ่าน → ALB ตัดออก"); rr = 0; }]); for (i = 0; i < 4; i++) request("prd", 6 + i);
    st.push([800, function () { down("pharmacy-k8s-2", false); say(7); }]);
    scene(8, [], 900); st.push([1100, function () { Object.keys(cards).forEach(function (n) { if (cards[n].az === "a") down(n, true, "AZ a ดับ"); }); rr = 0; }]); for (i = 0; i < 4; i++) request("prd", 10 + i);
    st.push([1200, function () { Object.keys(cards).forEach(function (n) { down(n, false); }); say(8); }]);
    scene(9, [], 600); for (i = 0; i < 2; i++) request("dev", i);
    scene(10, [], 700); var B = cards["pharmacy-bastion"], K2 = cards["pharmacy-k8s-2"];
    st.push([700, function () { move(288, 93, "SSH จาก My IP", "#7c3aed"); }], [800, function () { move(B.cx, B.y, "bastion", "#7c3aed"); glow("pharmacy-bastion", true, "#475569"); }], [900, function () { move(K2.cx, K2.y - 4, "→ k8s-2 (private IP)", "#7c3aed"); glow("pharmacy-k8s-2", true, "#7c3aed"); }], [900, function () { hidePk(); glow("pharmacy-bastion", false); glow("pharmacy-k8s-2", false); }]);
    scene(11, [], 700); st.push([700, function () { move(K2.cx, K2.y + 40, "docker pull ECR", "#e8590c"); }], [900, function () { move(nat.cx, nat.y + 40, "NAT", "#e8590c"); }], [900, function () { move(288, 93, "IGW", "#e8590c"); }], [900, function () { move(95, 47, "ECR / เน็ต", "#e8590c"); }], [800, function () { hidePk(); }]);
    scene(12, ["cicd"], 900); st.push([1000, function () { move(J.cx, J.y + J.h, "image v1.0.0", "#c0392b"); }], [900, function () { move(615, 812, "ECR", "#c0392b"); }], [900, function () { move(435, 812, "manifests", "#c0392b"); }], [900, function () { move(cards["pharmacy-k8s-1"].pods.ArgoCD[0], cards["pharmacy-k8s-1"].pods.ArgoCD[1], "ArgoCD อ่าน manifests", "#ef7b4d"); }], [900, function () { hidePk(); }]);
    st.push([700, function () { cap.appendChild(infoCard([["สรุป", "#1d8102", "**เครือข่ายเดียว** แยก public/private 3 AZ · แอปและข้อมูล**ไม่มี public IP** · เข้าได้ทางเดียว: ALB (ผู้ใช้) และ bastion (ผู้ดูแล) · k8s/DB **คนละ AZ** ทน AZ ล่มได้ · **Git → Jenkins → ECR → ArgoCD** ส่งของใหม่ขึ้นย้อนกลับได้"]])); }]);
    P.start(st);
  }, "▶ เล่น: ระบบทั้งหมด");
  var wrap = h("div", {}, [h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 6px" }, P.ctl), tl, cap, svg]);
  reset(); return wrap;
}
function sysAnimCard() {
  var card = h("div", { cls: "card", style: "margin-bottom:14px;padding:8px 14px 14px" }), f = fold("sysan", "แอนิเมชัน: ระบบทั้งหมดแบบที่ใช้จริง · 3 AZ, private subnet, bastion, NAT, Load balance (ใช้ค่าจริงที่คุณสร้าง ถ้ามี)"); f.appendChild(sysAnim()); card.appendChild(f); return card;
}
FOLD.sysan = 1;
