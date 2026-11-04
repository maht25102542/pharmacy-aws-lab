// ---- Lab › เทียบ VM กับ Managed: ระบบแบบ VM (terraform/) เทียบกับแบบ managed EKS + RDS + SSM (terraform-managed/)
// ข้อมูลทุกตัวเลขและโค้ดดึงจากไฟล์จริงใน LABFILES (build.js ฝังให้) ไม่พิมพ์ซ้ำ
var MG = { topic: "k8s" };

// ดึงบล็อก resource เดียวออกจากไฟล์ .tf (นับปีกกาให้ครบ)
function mgBlock(file, type, name) {
  var t = LABFILES[file] || "", head = 'resource "' + type + '" "' + name + '"', i = t.indexOf(head), d = 0, j;
  if (i < 0) return "# (ไม่พบ " + head + " ใน " + file + ")";
  for (j = t.indexOf("{", i); j < t.length; j++) { if (t[j] === "{") d++; else if (t[j] === "}" && --d === 0) break; }
  return t.slice(i, j + 1);
}
function mgLines(files) { return files.reduce(function (a, f) { return a + (LABFILES[f] || "").split("\n").filter(function (l) { return l.trim() && l.trim().charAt(0) !== "#"; }).length; }, 0); }
function mgFiles(re) { return Object.keys(LABFILES).filter(function (f) { return re.test(f); }); }
function mgRes(re) { return mgFiles(re).reduce(function (a, f) { return a + (LABFILES[f].match(/^resource "/gm) || []).length; }, 0); }

// หัวข้อเทียบ: [id, ชื่อ, โค้ดแบบ VM, โค้ดแบบ managed, [สิ่งที่เราดูแลเอง], [สิ่งที่ AWS ดูแลให้]]
function mgTopics() {
  return [
    ["k8s", "Kubernetes",
      { f: "terraform/instances.tf › k8s ×3 + dev", t: mgBlock("terraform/instances.tf", "aws_instance", "k8s"), kind: "hcl", extra: "ansible/k8s.yml" },
      { f: "terraform-managed/eks.tf", t: mgBlock("terraform-managed/eks.tf", "aws_eks_cluster", "main") + "\n\n" + mgBlock("terraform-managed/eks.tf", "aws_eks_node_group", "main"), kind: "hcl" },
      ["ติดตั้ง k3s, `--cluster-init` และ join ทีละเครื่อง", "ต่ออายุ etcd, อัปเกรดเวอร์ชันเอง", "ต่ออายุ token ECR ทุก 12 ชม. (`ecr-refresh.timer`)", "แยก dev เป็นอีกเครื่อง"],
      ["control plane (API server, etcd) หลาย AZ", "อัปเกรดเวอร์ชันกดเดียว", "node ดึง image จาก ECR ได้เองผ่าน IAM role", "node เสียถูกสร้างแทนอัตโนมัติ (Auto Scaling)"]],
    ["db", "ฐานข้อมูล",
      { f: "terraform/instances.tf › db ×3", t: mgBlock("terraform/instances.tf", "aws_instance", "db"), kind: "hcl", extra: "ansible/db.yml + vm-db/60-galera.cnf.j2" },
      { f: "terraform-managed/rds.tf", t: mgBlock("terraform-managed/rds.tf", "aws_db_instance", "main"), kind: "hcl" },
      ["bootstrap cluster แรก, join node, ตรวจ quorum", "backup เอง, patch เอง", "รหัสผ่านเป็นข้อความใน `group_vars`", "ไม่มี health check หน้า DB (สุ่ม node)"],
      ["Multi-AZ: standby คนละ AZ สลับให้เองใน 1-2 นาที", "backup อัตโนมัติ + point-in-time restore", "patch ช่วงเวลาที่ตั้งไว้", "รหัสผ่านอยู่ Secrets Manager และหมุนให้"]],
    ["access", "เข้าเครื่อง (SSH)",
      { f: "terraform/instances.tf › bastion + security.tf", t: mgBlock("terraform/instances.tf", "aws_instance", "bastion") + "\n\n" + mgBlock("terraform/security.tf", "aws_security_group", "base"), kind: "hcl", extra: "ansible/group_vars/internal.yml (ProxyCommand)" },
      { f: "terraform-managed/iam.tf › SSM", t: mgBlock("terraform-managed/iam.tf", "aws_iam_role_policy_attachment", "jenkins") + "\n\n" + mgBlock("terraform-managed/instances.tf", "aws_instance", "sonarqube"), kind: "hcl" },
      ["เครื่อง bastion 1 ตัว ที่ต้องอัปเดต/เฝ้าดู", "เปิด port 22 ให้ My IP", "จัดการ key pair และแจกกุญแจ", "ไม่มีประวัติว่าใครพิมพ์อะไร"],
      ["ไม่มี port 22 เลย (เครื่องไม่ต้องมี public IP)", "สิทธิ์ผ่าน IAM (ถอนสิทธิ์คนออกได้ทันที)", "log ทุก session ไป CloudWatch/S3", "ไม่มีเครื่อง bastion ให้ดูแล"]],
    ["lb", "Load balancer → node",
      { f: "terraform/loadbalancer.tf › attachment ทีละเครื่อง", t: mgBlock("terraform/loadbalancer.tf", "aws_lb_target_group_attachment", "prd") + "\n\n" + mgBlock("terraform/loadbalancer.tf", "aws_lb_target_group_attachment", "argocd"), kind: "hcl" },
      { f: "terraform-managed/loadbalancer.tf › ผูกกับ ASG", t: mgBlock("terraform-managed/loadbalancer.tf", "aws_autoscaling_attachment", "t"), kind: "hcl" },
      ["ลงทะเบียนเครื่องทีละตัว (เพิ่มเครื่อง = แก้ Terraform)", "node ที่ถูกแทนที่ต้องกลับมาผูกเอง"],
      ["node ใหม่ลงทะเบียนเข้า ALB เองผ่าน Auto Scaling group", "node ที่ตายถูกถอดออกให้"]]
  ];
}

function mgStats() {
  var vm = { res: mgRes(/^terraform\/[^/]+\.tf$/), tf: mgLines(mgFiles(/^terraform\/[^/]+\.tf$/)), ops: mgLines(["ansible/k8s.yml", "ansible/db.yml"].concat(mgFiles(/^vm-(k8s|db)\//))), vms: 10 },
    mg = { res: mgRes(/^terraform-managed\/[^/]+\.tf$/), tf: mgLines(mgFiles(/^terraform-managed\/[^/]+\.tf$/)), ops: 0, vms: 2 };
  return [vm, mg];
}

// ตารางเทียบ: เรื่อง | แบบ VM | แบบ managed | ราคา
var MG_ROWS = [
  ["เข้าเครื่องดูแล", "bastion + SSH key + SG port 22", "SSM Session Manager (ไม่มี port 22)", "SSM ฟรี · bastion t3.micro ประหยัดได้เล็กน้อย", "#475569"],
  ["Kubernetes", "k3s ×3 HA + dev VM · Ansible ลง/join/ต่อ token", "EKS: AWS ดูแล control plane", "EKS คิดค่า control plane ต่อ cluster เพิ่มจากค่า node (เช็กราคาปัจจุบัน)", "#0f9d8a"],
  ["ฐานข้อมูล", "Galera ×3 · bootstrap/quorum ดูแลเอง", "RDS MariaDB Multi-AZ (standby + backup ให้)", "แพงกว่า VM ที่ขนาดใกล้กัน (Multi-AZ = จ่ายเครื่องสำรองด้วย) แลกกับไม่ต้องดูแล · เช็กราคาจริงก่อน", "#b45309"],
  ["ออกเน็ตของ private", "NAT gateway ตัวเดียว", "NAT gateway ตัวเดียว (เหมือนเดิม)", "ค่า NAT เท่าเดิม", "#e8590c"],
  ["รหัสผ่าน DB", "ข้อความเปล่าใน `group_vars/all/main.yml`", "Secrets Manager สร้างและหมุนให้", "คิดต่อ secret ต่อเดือน (เล็กน้อย)", "#7c3aed"],
  ["ล่ม 1 AZ", "k8s ยังรอด 2/3, DB รอด 2/3 · ต้องมีคนไปดู", "EKS node ย้ายเอง, RDS สลับ standby อัตโนมัติ", "—", "#c62828"]
];

function mgTable() {
  var w = h("div", { style: "overflow-x:auto;margin:0 0 14px" }), tb = h("table", { style: "width:100%;border-collapse:collapse;font-size:.86rem" });
  tb.appendChild(h("tr", {}, ["เรื่อง", "แบบ VM (terraform/)", "แบบ managed (terraform-managed/)", "ค่าใช้จ่าย / หมายเหตุ"].map(function (t, i) { return h("th", { style: "text-align:left;padding:8px 10px;border-bottom:2px solid var(--accent);color:" + (i === 1 ? "#c62828" : i === 2 ? "#1d8102" : "inherit"), text: t }); })));
  MG_ROWS.forEach(function (r) {
    tb.appendChild(h("tr", {}, [
      h("td", { style: "padding:8px 10px;border-bottom:1px solid var(--ctl-line);font-weight:700;border-left:4px solid " + r[4], text: r[0] }),
      h("td", { style: "padding:8px 10px;border-bottom:1px solid var(--ctl-line);background:rgba(198,40,40,.05)" }, rich(r[1])),
      h("td", { style: "padding:8px 10px;border-bottom:1px solid var(--ctl-line);background:rgba(29,129,2,.06)" }, rich(r[2])),
      h("td", { style: "padding:8px 10px;border-bottom:1px solid var(--ctl-line);color:var(--muted,#5f6b7a)" }, rich(r[3]))
    ]));
  });
  w.appendChild(tb); return w;
}

function mgCompare() {
  var T = mgTopics(), cur = T.filter(function (t) { return t[0] === MG.topic; })[0] || T[0], box = h("div");
  var chips = h("div", { cls: "chips" }, T.map(function (t) { return h("button", { cls: "chip" + (t[0] === cur[0] ? " on" : ""), type: "button", text: t[1], onclick: function () { MG.topic = t[0]; render(); } }); }));
  box.appendChild(chips);
  var side = function (title, col, c, own, tag) {
    return h("div", { style: "min-width:0;border:1px solid " + col + ";border-top:5px solid " + col + ";border-radius:10px;padding:10px 12px;background:" + col + "0d" }, [
      h("div", { style: "font-weight:800;color:" + col + ";margin-bottom:2px", text: title }),
      h("div", { style: "font-size:.78rem;margin-bottom:8px", text: "ที่มา: " + c.f + (c.extra ? " + " + c.extra : "") }),
      codePre(c.t, c.kind),
      h("div", { style: "margin-top:10px;font-weight:700;font-size:.84rem;color:" + col, text: tag }),
      h("ul", { style: "margin:4px 0 0;padding-left:18px;font-size:.85rem;line-height:1.6" }, own.map(function (o) { return h("li", {}, rich(o)); }))
    ]);
  };
  box.appendChild(h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:14px" }, [
    side("แบบ VM (เราดูแลเอง)", "#c62828", cur[2], cur[4], "ภาระที่เราต้องทำ"),
    side("แบบ managed (AWS ดูแลให้)", "#1d8102", cur[3], cur[5], "AWS ทำให้")
  ]));
  return box;
}

function mgStatCards() {
  var S2 = mgStats(), vm = S2[0], mg = S2[1], w = h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 14px" });
  [["VM ที่ต้องดูแล", vm.vms, mg.vms, "เครื่อง"], ["resource ใน Terraform", vm.res, mg.res, "ตัว"], ["บรรทัด Terraform", vm.tf, mg.tf, "บรรทัด (ไม่นับ comment)"], ["บรรทัด Ansible + config ของ k8s/DB", vm.ops, mg.ops, "บรรทัด (แบบ managed ไม่ต้องใช้)"]].forEach(function (c) {
    w.appendChild(h("div", { style: "border:1px solid var(--ctl-line);border-radius:10px;padding:10px 12px" }, [
      h("div", { style: "font-size:.78rem;color:var(--muted,#5f6b7a)", text: c[0] }),
      h("div", { style: "font-size:1.35rem;font-weight:800;margin-top:2px" }, [h("span", { style: "color:#c62828", text: String(c[1]) }), h("span", { style: "color:var(--muted,#5f6b7a);font-weight:400", text: "  →  " }), h("span", { style: "color:#1d8102", text: String(c[2]) })]),
      h("div", { style: "font-size:.74rem;color:var(--muted,#5f6b7a)", text: c[3] })
    ]));
  });
  return w;
}

// ---- แอนิเมชัน: 5 แถว (เข้าเครื่อง, k8s, DB, ต่อ ALB, ล่ม 1 AZ) ซ้ายแบบ VM ขวาแบบ managed
function mgAnim() {
  var W = 1040, H = 470, svg = sv("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", style: "max-width:1040px;font-family:inherit", role: "img", "aria-label": "เทียบระบบแบบ VM กับแบบ managed ทีละส่วน" });
  var tx = function (x, y, t, o) { o = o || {}; return sv("text", { x: x, y: y, "font-size": o.sz || 12, "font-weight": o.b ? 700 : 400, fill: o.c || "currentColor", "text-anchor": o.a || "start" }, [t]); };
  var rows = [
    ["เข้าเครื่อง", "bastion + SSH :22 + key pair", "SSM Session Manager · ไม่มี port 22", "#475569"],
    ["Kubernetes", "k3s ×3 (เรา join/อัปเกรด) + dev VM", "EKS · AWS ดูแล control plane", "#0f9d8a"],
    ["ฐานข้อมูล", "Galera ×3 (เรา bootstrap/ตรวจ quorum)", "RDS Multi-AZ · primary + standby", "#b45309"],
    ["ต่อ ALB", "ผูก node ทีละเครื่อง", "ผูกกับ Auto Scaling group", "#c0392b"],
    ["ล่ม 1 AZ", "คนต้องเข้าไปดู/แก้", "สลับให้เองอัตโนมัติ", "#c62828"]
  ], y0 = 64, rh = 70, boxes = [], cap = h("div", { style: "min-height:5em;margin:8px 0" }), lay = {};
  svg.appendChild(tx(40, 28, "แบบ VM (terraform/)", { b: 1, c: "#c62828", sz: 14 })); svg.appendChild(tx(560, 28, "แบบ managed (terraform-managed/)", { b: 1, c: "#1d8102", sz: 14 }));
  rows.forEach(function (r, i) {
    var y = y0 + i * rh, g = sv("g", {}, []);
    g.appendChild(tx(40, y + 4, r[0], { b: 1, sz: 11, c: r[3] }));
    g.appendChild(sv("rect", { x: 40, y: y + 10, width: 440, height: 46, rx: 9, fill: "rgba(198,40,40,.07)", stroke: "#c62828", "stroke-width": 1.5 }));
    g.appendChild(tx(54, y + 38, r[1], { sz: 12 }));
    g.appendChild(sv("path", { d: "M486 " + (y + 33) + " L546 " + (y + 33), stroke: r[3], "stroke-width": 2.5, "marker-end": "url(#mgar)" }));
    g.appendChild(sv("rect", { x: 560, y: y + 10, width: 440, height: 46, rx: 9, fill: "rgba(29,129,2,.08)", stroke: "#1d8102", "stroke-width": 1.5 }));
    g.appendChild(tx(574, y + 38, r[2], { sz: 12 }));
    g.style.transition = "opacity .5s"; g.style.opacity = ".18"; svg.appendChild(g); boxes.push(g); lay[i] = y;
  });
  svg.insertBefore(sv("defs", {}, [sv("marker", { id: "mgar", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, [sv("path", { d: "M0 0 L10 5 L0 10 z", fill: "#64748b" })])]), svg.firstChild);
  var fail = sv("g", {}, [sv("rect", { x: 40, y: y0 + 4 * rh + 10, width: 440, height: 46, rx: 9, fill: "none", stroke: "#c62828", "stroke-width": 3, "stroke-dasharray": "6 4" }), sv("rect", { x: 560, y: y0 + 4 * rh + 10, width: 440, height: 46, rx: 9, fill: "none", stroke: "#1d8102", "stroke-width": 3 })]);
  fail.style.opacity = "0"; fail.style.transition = "opacity .4s"; svg.appendChild(fail);
  function light(n) { boxes.forEach(function (g, i) { g.style.opacity = i === n ? "1" : (n === -1 ? ".18" : ".35"); }); }
  var SC = [
    [0, [["แบบ VM", "#c62828", "ต้องมี **bastion** (เครื่องที่เปิด :22 ให้ My IP) ทุกคนใช้ key pair ร่วมกัน · ถอดคนออก = เปลี่ยนกุญแจทั้งชุด"], ["แบบ managed", "#1d8102", "เครื่องติด **IAM role + SSM agent** · เข้าด้วย `aws ssm start-session` ไม่เปิด port ใดเลย · สิทธิ์ผูกกับ IAM ของแต่ละคน และมี log"]]],
    [1, [["แบบ VM", "#c62828", "`ansible/k8s.yml` ลง k3s, `--cluster-init`, join, ต่อ token ECR ทุก 12 ชม. · อัปเกรดเวอร์ชัน = ทำเอง"], ["แบบ managed", "#1d8102", "`aws_eks_cluster` + `aws_eks_node_group` · AWS ดูแล **control plane** (API server, etcd) · node ดึง image ECR ด้วย IAM role ไม่มี token หมดอายุ"]]],
    [2, [["แบบ VM", "#c62828", "Galera 3 node · **เรา** bootstrap, join, ตรวจ quorum, backup, patch · backend ต่อผ่าน Service ที่สุ่ม node (ไม่มี health check)"], ["แบบ managed", "#1d8102", "`aws_db_instance` `multi_az = true` · มี **standby** อีก AZ · backup 7 วัน · รหัสผ่านใน **Secrets Manager** (ไม่เป็นข้อความเปล่าอีก)"]]],
    [3, [["แบบ VM", "#c62828", "`aws_lb_target_group_attachment` ทีละเครื่อง · เพิ่ม/เปลี่ยนเครื่อง = แก้ Terraform แล้ว apply"], ["แบบ managed", "#1d8102", "`aws_autoscaling_attachment` ผูกกับ ASG ของ node · node ใหม่ลงทะเบียนเข้า ALB เอง"]]],
    [4, [["AZ a ล่ม — แบบ VM", "#c62828", "k8s ยังรอด 2/3 และ DB 2/3 แต่ **คนต้องตามดู** (node หาย, Jenkins/bastion หาย, NAT หาย)"], ["AZ a ล่ม — แบบ managed", "#1d8102", "RDS **สลับ standby** อัตโนมัติ 1-2 นาที · EKS ย้าย pod ไป node AZ อื่น · ASG สร้าง node ใหม่ · ข้อจำกัดเดียวกัน: NAT ตัวเดียวยังเป็นจุดอ่อน"]]]
  ];
  function say(i) { cap.textContent = ""; cap.appendChild(h("h3", { style: "margin:4px 0 8px", text: (i + 1) + ". " + rows[i][0] })); cap.appendChild(infoCard(SC[i][1])); fail.style.opacity = i === 4 ? "1" : "0"; light(i); }
  function reset() { light(-1); fail.style.opacity = "0"; cap.textContent = ""; cap.appendChild(infoCard([["ดูอะไร", "#2563eb", "กด ==▶ เล่น== เพื่อดูทีละเรื่อง: **เข้าเครื่อง → Kubernetes → ฐานข้อมูล → ต่อ ALB → ล่ม 1 AZ**"]])); }
  var P = jkxPlayer(reset, function (P) { P.start(SC.map(function (s, i) { return [i === 0 ? 400 : 2600, function () { say(i); }]; }).concat([[2600, function () { light(-1); fail.style.opacity = "0"; cap.appendChild(infoCard([["สรุป", "#1d8102", "แบบ managed **ลดงานที่ต้องดูแลเอง** (ไม่มี bastion, k3s, Galera) แต่ **จ่ายแพงกว่า** และผูกกับ AWS · ฝึกเข้าใจข้างในด้วยแบบ VM ก่อน แล้วใช้แบบ managed ตอนทำจริง"]])); }]])); }, "▶ เล่น: เทียบทีละเรื่อง");
  var wrap = h("div", {}, [h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 6px" }, P.ctl), cap, svg]);
  reset(); return wrap;
}


// ---- แผนภาพการเชื่อมต่อทั้งระบบ (แบบ managed): ใครคุยกับใคร ผ่าน port ไหน ทีละสถานการณ์
var MG_ICO = { alb: "elb", igw: "igw", nat: "nat", eks: "eks", rdsP: "rds", rdsS: "rds", ssm: "ssm", ecr: "ecr", sec: "secrets", jenkins: "jenkins", sonar: "sonarqubeserver", gh: "github", albb: "elb", albc: "elb" };
function mgSystem() {
  var W = 1040, H = 760, svg = sv("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", style: "max-width:1040px;font-family:inherit", role: "img", "aria-label": "แผนภาพการเชื่อมต่อทุกส่วนของระบบแบบ managed" });
  var tx = function (x, y, t, o) { o = o || {}; return sv("text", { x: x, y: y, "font-size": o.sz || 11, "font-weight": o.b ? 700 : 400, fill: o.c || "currentColor", "text-anchor": o.a || "start" }, [t]); };
  var bx = function (x, y, w, hh, fill, stroke, dash, sw) { return sv("rect", { x: x, y: y, width: w, height: hh, rx: 8, fill: fill, stroke: stroke, "stroke-width": sw || 1.6, "stroke-dasharray": dash || null }); };
  var N = {}, lines = [], COL = { a: 40, b: 365, c: 690 }, CW = 310, AZC = { a: "#2563eb", b: "#8456ce", c: "#0f9d8a" };
  // node(id, x, y, w, h, title, sub, color, dashed)
  function node(id, x, y, w, hh, t, sub, col, dash) { var h2 = hh;
    var g = sv("g", {}, [bx(x, y, w, hh, "#fff", col, dash), tx(x + w / 2, y + 16, t, { a: "middle", b: 1, c: col, sz: 11 })]);
    if (sub) g.appendChild(tx(x + w / 2, y + 30, sub, { a: "middle", sz: 9, c: "#64748b" }));
    var mi = svgIco(MG_ICO[id] || (/^pod[a-c]ArgoCD$/.test(id) ? "argo" : /^node[abc]$/.test(id) ? "ec2" : null), x + 6, y + 5, h2 > 40 ? 24 : 18); if (mi) g.appendChild(mi);
    svg.appendChild(g); N[id] = { cx: x + w / 2, cy: y + hh / 2, x: x, y: y, w: w, h: hh, g: g }; return N[id];
  }
  // ----- โครง: VPC, subnet ต่อ AZ -----
  svg.appendChild(bx(20, 150, 1000, 590, "rgba(37,99,235,.03)", "#2563eb", null, 2)); svg.appendChild(tx(36, 170, "VPC pharmacy-vpc · 10.0.0.0/16", { b: 1, c: "#2563eb", sz: 12 }));
  ["a", "b", "c"].forEach(function (z, i) {
    var x = COL[z], c = AZC[z];
    svg.appendChild(bx(x, 205, CW, 100, c + "10", c, "6 4")); svg.appendChild(tx(x + 10, 221, "public-" + (i + 1) + " · 10.0." + (i + 1) + ".0/24 · AZ " + z, { b: 1, c: c, sz: 10 }));
    svg.appendChild(bx(x, 318, CW, 410, c + "0d", c)); svg.appendChild(tx(x + 10, 334, "private-" + (i + 1) + " · 10.0." + (i + 11) + ".0/24 · AZ " + z, { b: 1, c: c, sz: 10 }));
  });
  node("alb", 230, 178, 580, 24, "Application Load Balancer · :80 prd · :8080 dev · :8443 ArgoCD", "", "#8456ce");
  node("igw", 215, 130, 120, 32, "Internet gateway", "", "#f2711c");
  node("nat", 200, 236, 120, 56, "NAT gateway", "ออกเน็ตอย่างเดียว", "#e8590c");
  node("albb", 400, 240, 190, 50, "ALB node (AZ b)", "AWS จัดการให้", "#8456ce", "4 3"); node("albc", 740, 240, 190, 50, "ALB node (AZ c)", "AWS จัดการให้", "#8456ce", "4 3");
  ["a", "b", "c"].forEach(function (z) {
    var x = COL[z] + 10, c = AZC[z], nd = node("node" + z, x, 346, 290, 128, "EKS worker node · AZ " + z, "SG ของ cluster · ไม่มี public IP", c);
    ["FE", "BE"].concat(z === "a" ? ["ArgoCD"] : []).forEach(function (p, k) { var pw = z === "a" ? 86 : 130; node("pod" + z + p, x + 12 + k * (pw + 8), 404, pw, 52, p, "pod", p === "FE" ? "#2563eb" : p === "BE" ? "#7c3aed" : "#e8590c"); });
  });
  node("rdsP", COL.a + 10, 496, 290, 70, "RDS MariaDB · primary (writer)", "Multi-AZ · :3306 จาก node เท่านั้น", "#b45309");
  node("rdsS", COL.b + 10, 496, 290, 70, "RDS · standby (สำรองคนละ AZ)", "ซิงก์ทุกการเขียน · สลับให้อัตโนมัติ", "#b45309", "5 3");
  node("jenkins", COL.a + 10, 590, 290, 60, "Jenkins (EC2)", ":8080 · ไม่มี public IP · SSM", "#c0392b");
  node("sonar", COL.b + 10, 590, 290, 60, "SonarQube (EC2)", ":9000 จาก Jenkins เท่านั้น · SSM", "#0f766e");
  node("free", COL.c + 10, 496, 290, 154, "ว่าง", "เพิ่ม node / replica ได้ตรงนี้ (ASG กระจายให้)", "#94a3b8", "5 4");
  // ----- นอก VPC: บริการที่ AWS ดูแล + คน -----
  node("users", 20, 20, 110, 60, "ผู้ใช้เว็บ", "อินเทอร์เน็ต", "#2a4a7a"); node("admin", 150, 20, 120, 60, "ผู้ดูแล (เรา)", "laptop · IAM + My IP", "#475569");
  node("ssm", 290, 20, 130, 60, "SSM", "Session Manager", "#475569"); node("eks", 440, 20, 170, 60, "EKS control plane", "API server + etcd (AWS ดูแล)", "#0f9d8a");
  node("ecr", 630, 20, 110, 60, "ECR", "image ของเรา", "#e8590c"); node("sec", 760, 20, 120, 60, "Secrets Manager", "รหัสผ่าน DB", "#7c3aed"); node("gh", 900, 20, 120, 60, "GitHub", "3 repo", "#334155");
  // ----- เส้นเชื่อม: [ฉากที่ใช้, จุด, สี, ป้าย, ตำแหน่งป้าย] -----
  function link(sc, pts, col, label, lx, ly, dash) {
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0] + " " + p[1]; }).join(" "), g = sv("g", {}, [sv("path", { d: d, fill: "none", stroke: col, "stroke-width": 2.2, "stroke-dasharray": dash || null, "marker-end": "url(#mgs-" + col.slice(1) + ")" })]);
    if (label) g.appendChild(tx(lx, ly, label, { sz: 9, b: 1, c: col, a: "middle" }));
    g.style.opacity = "0"; g.style.transition = "opacity .4s"; svg.appendChild(g); lines.push({ sc: sc, g: g, pts: pts });
  }
  var defs = sv("defs", {}, []), cols = ["#2563eb", "#7c3aed", "#475569", "#0f9d8a", "#c0392b", "#b45309", "#e8590c"];
  cols.forEach(function (c) { defs.appendChild(sv("marker", { id: "mgs-" + c.slice(1), viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, [sv("path", { d: "M0 0 L10 5 L0 10 z", fill: c })])); }); svg.insertBefore(defs, svg.firstChild);
  var B = N.alb, FEb = N.podbFE, BEc = N.podcBE, P = N.rdsP;
  // 0 ผู้ใช้เข้าเว็บ
  link([0], [[75, 80], [75, 112], [275, 112], [275, 130]], "#2563eb", ":80", 175, 106);
  link([0], [[275, 162], [275, 178]], "#2563eb", "", 0, 0);
  link([0], [[520, 202], [520, 330], [FEb.cx, 330], [FEb.cx, 404]], "#2563eb", "NodePort 30080", 600, 326);
  link([0], [[FEb.x + FEb.w, 430], [BEc.x, 430]], "#7c3aed", "Service backend :8000", 660, 418);
  link([0], [[BEc.cx, BEc.y + BEc.h], [BEc.cx, 482], [P.cx + 100, 482], [P.cx + 100, 496]], "#b45309", ":3306", 600, 478);
  // 1 SSM (agent ออกไปหา SSM ผ่าน NAT: ไม่มีขาเข้า)
  link([1], [[250, 80], [250, 100], [380, 100], [380, 80]], "#475569", "start-session (IAM)", 315, 94);
  link([1], [[N.jenkins.x, 620], [30, 620], [30, 264], [200, 264]], "#475569", "SSM agent ออกไปหา SSM", 150, 584, "5 4");
  link([1], [[210, 236], [210, 112], [330, 112], [330, 80]], "#475569", "ผ่าน NAT → IGW", 270, 124, "5 4");
  // 2 kubectl
  link([2], [[230, 80], [230, 108], [525, 108], [525, 80]], "#0f9d8a", "kubectl · :443 (เฉพาะ My IP)", 380, 124);
  link([2], [[560, 80], [560, 330], [N.nodeb.cx + 60, 330], [N.nodeb.cx + 60, 346]], "#0f9d8a", "ENI ใน private subnet", 640, 326, "5 4");
  // 3 CI/CD
  link([3], [[960, 80], [960, 120], [N.jenkins.cx + 30, 120], [N.jenkins.cx + 30, 590]], "#c0392b", "tag → build", 985, 300, "");
  link([3], [[N.jenkins.x + N.jenkins.w, 620], [N.sonar.x, 620]], "#0f766e", ":9000 scan", 340, 612);
  link([3], [[N.jenkins.cx - 30, 650], [N.jenkins.cx - 30, 700], [690, 700], [690, 120], [685, 80]], "#e8590c", "docker push", 500, 694);
  link([3], [[N.podaArgoCD.cx, 404], [N.podaArgoCD.cx, 392], [900, 392], [900, 80]], "#334155", "ArgoCD ดู manifests", 960, 388, "5 4");
  link([3], [[N.nodeb.cx - 60, 346], [N.nodeb.cx - 60, 328], [700, 328], [700, 80]], "#e8590c", "node ดึง image (IAM role)", 560, 322, "5 4");
  // 4 รหัสผ่าน DB + ซิงก์
  link([4], [[N.podbBE.cx, 404], [N.podbBE.cx, 332], [820, 332], [820, 80]], "#7c3aed", "อ่าน secret db-credentials", 880, 328, "5 4");
  link([4], [[N.rdsP.x + N.rdsP.w, 531], [N.rdsS.x, 531]], "#b45309", "sync ทุกการเขียน", 345, 524);
  link([4], [[820, 80], [820, 100], [N.rdsP.x + 60, 100], [N.rdsP.x + 60, 496]], "#7c3aed", "", 0, 0, "2 4");
  // 5 AZ a ล่ม
  link([5], [[N.rdsP.x + N.rdsP.w, 531], [N.rdsS.x, 531]], "#c62828", "standby ขึ้นเป็น writer", 345, 524);
  link([5], [[N.nodea.cx, 346], [N.nodea.cx, 330], [N.nodeb.cx, 330], [N.nodeb.cx, 346]], "#c62828", "pod ถูกย้าย", 300, 326);
  var fail = sv("g", {}, [bx(COL.a, 318, CW, 410, "rgba(198,40,40,.12)", "#c62828", null, 3), tx(COL.a + CW / 2, 716, "AZ a ล่ม", { a: "middle", b: 1, c: "#c62828", sz: 13 })]); fail.style.opacity = "0"; fail.style.transition = "opacity .4s"; svg.appendChild(fail);
  var failPub = sv("g", {}, [bx(COL.a, 205, CW, 100, "rgba(198,40,40,.12)", "#c62828", null, 3)]); failPub.style.opacity = "0"; failPub.style.transition = "opacity .4s"; svg.appendChild(failPub);
  // packet
  var pk = sv("circle", { r: 8, fill: "#ff9900", stroke: "#fff", "stroke-width": 2 }), pkl = tx(0, 0, "", { sz: 10, b: 1, c: "#c2500c" }); pk.style.opacity = "0"; svg.appendChild(pk); svg.appendChild(pkl);
  function mv(x, y, t) { pk.style.opacity = "1"; pk.style.transition = "transform .7s ease-in-out"; pk.style.transform = "translate(" + x + "px," + y + "px)"; pkl.setAttribute("x", x + 12); pkl.setAttribute("y", y - 10); pkl.textContent = t || ""; }
  function hidePk() { pk.style.opacity = "0"; pkl.textContent = ""; }
  var cap = h("div", { style: "min-height:6em;margin:8px 0" }), cur = -1;
  function show(sc) { cur = sc; lines.forEach(function (l) { l.g.style.opacity = l.sc.indexOf(sc) >= 0 ? "1" : "0"; }); fail.style.opacity = sc === 5 ? "1" : "0"; failPub.style.opacity = sc === 5 ? "1" : "0"; Object.keys(N).forEach(function (k) { N[k].g.style.opacity = sc === 5 && /^(nodea|poda|rdsP|jenkins|nat)/.test(k) ? ".35" : "1"; }); }
  var SC = [
    ["ผู้ใช้เข้าเว็บ", [["ทางเดิน", "#2563eb", "**ผู้ใช้ → IGW → ALB :80 → node :30080 (FE) → Service backend (BE) → RDS :3306**"], ["จุดสังเกต", "#7c3aed", "ผู้ใช้เห็นแค่ **ALB** · node และ DB ไม่มี public IP · SG ของ node รับ NodePort จาก **SG ของ ALB** เท่านั้น"]]],
    ["เข้าเครื่อง (SSM)", [["ทางเดิน", "#475569", "เราสั่ง `aws ssm start-session` (ยืนยันด้วย **IAM**) → SSM → **agent บนเครื่อง** ที่ต่อออกไปหา SSM เอง ผ่าน NAT → IGW"], ["ไม่มีขาเข้า", "#1d8102", "**ไม่เปิด port 22 เลย** · เครื่องไม่มี public IP · ถอนสิทธิ์ IAM = เข้าไม่ได้ทันที · เปิด Jenkins ด้วย port-forward `localhost:8080`"]]],
    ["kubectl", [["ทางเดิน", "#0f9d8a", "laptop → **EKS API :443** (เปิดเฉพาะ `my_ip` ใน `public_access_cidrs`) · control plane คุยกับ node ผ่าน **ENI ใน private subnet**"], ["ใครดูแล", "#1d8102", "control plane (API + etcd) อยู่นอก VPC และ **AWS ดูแลให้** ไม่มีเครื่องให้ลง/อัปเกรด"]]],
    ["CI/CD", [["ทางเดิน", "#c0392b", "tag ใน GitHub → **Jenkins** → SonarQube :9000 → `docker push` **ECR** → แก้ `image:` ใน manifests → **ArgoCD** (ใน cluster) ดึง manifests แล้วอัปเดต"], ["ดึง image", "#e8590c", "node ดึง image จาก ECR ด้วย **IAM role ของ node** (ไม่มี token หมดอายุ 12 ชม. เหมือนแบบ VM)"]]],
    ["รหัสผ่านและ DB", [["รหัสผ่าน", "#7c3aed", "รหัสผ่าน DB อยู่ใน **Secrets Manager** (หมุนให้) · เราสร้าง Secret `db-credentials` ใน cluster จากค่านี้ (**ต้องทำเอง**)"], ["Multi-AZ", "#b45309", "RDS **primary ซิงก์ทุกการเขียนไป standby** คนละ AZ · แอปต่อที่ endpoint เดียว ไม่ต้องรู้ว่าตัวไหนเป็น writer"]]],
    ["AZ a ล่ม", [["สิ่งที่เกิด", "#c62828", "node AZ a, **RDS primary**, Jenkins และ **NAT** หายพร้อมกัน"], ["ที่รอด", "#1d8102", "RDS **สลับ standby** (AZ b) เป็น writer อัตโนมัติ · pod ย้ายไป node AZ b/c · ALB ตัด node ที่ตายออก"], ["ที่หาย", "#c62828", "**Jenkins** และ **NAT** อยู่ AZ a ตัวเดียว → build ไม่ได้ · private ออกเน็ตไม่ได้ (ข้อจำกัดของ lab เพื่อประหยัด)"]]]
  ];
  function say(i) { cap.textContent = ""; cap.appendChild(h("h3", { style: "margin:4px 0 8px", text: (i + 1) + ". " + SC[i][0] })); cap.appendChild(infoCard(SC[i][1])); show(i); }
  var PATH = [
    [[75, 90, "ผู้ใช้"], [275, 146, "IGW"], [520, 190, "ALB"], [FEb.cx, FEb.cy, "FE"], [BEc.cx, BEc.cy, "BE"], [P.cx + 100, 531, "RDS writer"]],
    [[250, 90, "เรา"], [355, 50, "SSM"], [260, 264, "NAT"], [N.jenkins.cx, 620, "agent"]],
    [[230, 90, "kubectl"], [525, 50, "EKS API"], [N.nodeb.cx + 60, 400, "node"]],
    [[960, 60, "git tag"], [N.jenkins.cx + 30, 620, "Jenkins"], [N.sonar.cx, 620, "Sonar"], [690, 700, "push ECR"], [N.podaArgoCD.cx, 430, "ArgoCD"]],
    [[N.podbBE.cx, 430, "BE"], [820, 50, "secret"], [P.cx + 60, 531, "RDS"], [N.rdsS.cx, 531, "standby"]],
    [[N.rdsP.cx, 531, "primary ✗"], [N.rdsS.cx, 531, "standby → writer"], [N.nodeb.cx, 420, "pod ย้าย"]]
  ];
  function reset() { cur = -1; lines.forEach(function (l) { l.g.style.opacity = "0"; }); fail.style.opacity = "0"; failPub.style.opacity = "0"; Object.keys(N).forEach(function (k) { N[k].g.style.opacity = "1"; }); hidePk(); cap.textContent = ""; cap.appendChild(infoCard([["ดูอะไร", "#2563eb", "กด ==▶ เล่น== เพื่อดูใครคุยกับใครทีละสถานการณ์: **ผู้ใช้ → เข้าเครื่อง (SSM) → kubectl → CI/CD → รหัสผ่านและ DB → AZ ล่ม**"]])); }
  var PL = jkxPlayer(reset, function (PL) {
    var st = [];
    SC.forEach(function (s, i) { st.push([i === 0 ? 400 : 1200, function () { hidePk(); say(i); }]); PATH[i].forEach(function (p) { st.push([800, function () { mv(p[0], p[1], p[2]); }]); }); });
    st.push([1200, function () { hidePk(); show(-1); cap.appendChild(infoCard([["สรุป", "#1d8102", "ทุกอย่างคุยกันผ่าน **SG ที่อ้างกันเอง** · ทางเข้ามี 2 ทาง: **ALB** (ผู้ใช้) และ **IAM/SSM** (ผู้ดูแล) · ส่วนที่เหลือไม่มี public IP"]])); }]);
    PL.start(st);
  }, "▶ เล่น: ดูการเชื่อมต่อ");
  var wrap = h("div", {}, [h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 6px" }, PL.ctl), cap, svg]);
  reset(); return wrap;
}

function mgSysCard() {
  var card = h("div", { cls: "card", style: "margin-bottom:14px;padding:8px 14px 14px" }), f = fold("sysan", "แอนิเมชัน: ระบบแบบ managed (EKS + RDS + SSM) ใครคุยกับใคร ผ่าน port ไหน");
  f.appendChild(mgSystem()); card.appendChild(f); return card;
}
function managedTab() {
  var cb = h("div", { cls: "cb" });
  cb.appendChild(infoCard([
    ["ทำอะไร", "#2b6cb0", "เทียบระบบ **แบบ VM** (ที่ lab นี้ใช้เรียนรู้) กับ **แบบ managed** ที่ใช้ทำจริง: **EKS + RDS + SSM** · โค้ดจริงอยู่ที่ `terraform-managed/`"],
    ["เหมือนกัน", "#1d8102", "เครือข่าย 3 AZ, public/private, NAT, ALB, ECR, Jenkinsfile, repo-manifests, ArgoCD"],
    ["เปลี่ยน", "#c0392b", "bastion → **SSM** · k3s ×3 + dev → **EKS** · Galera ×3 → **RDS Multi-AZ** · target group ผูกกับ **ASG**"],
    ["สถานะโค้ด", "#b45309", "ผ่าน `terraform validate` แล้ว · **ยังไม่เคย apply บน AWS จริง** (account ระงับ) คาดว่าเจอ error ตอนรันครั้งแรก · ต้องลง ArgoCD และสร้าง Secret ของ DB เอง"]
  ]));
  cb.appendChild(infoCard([
    ["ลองจริง (กดสร้าง)", "#7c3aed", "โหลดตัวอย่างแล้วไปกดดูที่แถบ **EKS / RDS / SSM** (หน้าตาแบบ AWS console) · ของที่กดสร้างถูกแปลงเป็นโค้ด Terraform ที่ Lab › Terraform และตรวจกับโค้ดจริงที่ Lab › ตรวจกับ Terraform"],
    ["ลองจริง (Terminal)", "#0f9d8a", "เปิด Laptop › Terminal แล้วรัน **terraform-managed/** ได้เลย (สร้าง 57 resource) ตามคำสั่งด้านล่าง"]]));
  cb.appendChild(h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px" }, [["managed", "โหลด Managed ครบทั้งชุด"], ["managed-base", "เตรียมเครือข่าย แล้วสร้าง EKS/RDS เอง"], ["managed-badrole", "ล้ม: node ไม่ join (role ขาด policy)"], ["managed-nonat", "ล้ม: private ไม่มี NAT (SSM ออฟไลน์)"]].map(function (b) {
    return h("button", { cls: "btn" + (b[0] === "managed" ? " pri" : ""), type: "button", text: b[1], onclick: function () { try { buildManaged(b[0]); UI.sel = {}; UI.form = null; flash("ok", "โหลด '" + b[1] + "' แล้ว"); go(b[0] === "managed-base" ? "eks-create" : "eks", {}, "EKS"); } catch (e) { flash("bad", "โหลดไม่สำเร็จ: " + e.message); render(); } } });
  })));
  cb.appendChild(codePre(["cd ~/Desktop/work/pharmacy-aws-lab/terraform-managed", "terraform init", "terraform apply                       # ใส่ my_ip เช่น 198.51.100.7/32 แล้วพิมพ์ yes", "aws eks update-kubeconfig --region ap-southeast-1 --name pharmacy-eks", "kubectl get nodes                     # node 3 เครื่อง Ready", "aws ssm start-session --target <instance-id>   # เข้า Jenkins ไม่ต้องมี key/bastion (ดู id จาก terraform output)", "aws rds describe-db-instances         # MultiAZ true + endpoint"].join("\n"), "an"));
  cb.appendChild(h("div", { style: "display:flex;gap:8px;margin:12px 0" }, [foldBar(), codeThemeSel()]));
  cb.appendChild(mgStatCards());
  var f1 = fold("mgtab", "ตารางเทียบ: เปลี่ยนอะไร ได้อะไร เสียอะไร"); f1.appendChild(mgTable()); cb.appendChild(f1);
  var f0 = fold("mgsys", "แผนภาพการเชื่อมต่อทั้งระบบ (แบบ managed): ใครคุยกับใคร ผ่าน port ไหน"); f0.appendChild(mgSystem()); cb.appendChild(f0);
  var f2 = fold("mganim", "แอนิเมชัน: เทียบทีละเรื่อง (เข้าเครื่อง → k8s → DB → ALB → ล่ม 1 AZ)"); f2.appendChild(mgAnim()); cb.appendChild(f2);
  var f3 = fold("mgcode", "โค้ดเทียบกัน: ซ้ายแบบ VM · ขวาแบบ managed (ดึงจากไฟล์จริง)"); f3.appendChild(mgCompare()); cb.appendChild(f3);
  return cb;
}
FOLD.mgsys = 1; FOLD.mgtab = 1; FOLD.mganim = 1; FOLD.mgcode = 1;
PAGES["lab-managed"] = function () { return h("div", {}, [crumbEl("Lab › เทียบ VM กับ Managed"), h("h1", { text: "เทียบ VM กับ Managed" }), h("div", { cls: "card" }, [managedTab()])]); };
