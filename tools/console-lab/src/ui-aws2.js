// ===== หน้า console ของ EKS / RDS / Systems Manager (ระบบแบบ managed) =====
// ใช้หน้าตา/ตัวช่วยเดียวกับ VPC/EC2: LISTS (ตาราง) + formPage (แบบฟอร์ม) · กดสร้างแล้ว API เดียวกับที่ Terraform (terraform-managed/) เรียก
(function () {
  var lab = NAV.Lab; delete NAV.Lab;
  NAV.EKS = [["Amazon Elastic Kubernetes Service", [["eks", "Clusters"], ["ngs", "Node groups"], ["eks-nodes", "Nodes"]]]];
  NAV.RDS = [["Amazon RDS", [["rds", "Databases"], ["dbsg", "Subnet groups"]]]];
  NAV.SSM = [["AWS Systems Manager", [["ssm-sessions", "Session Manager"], ["ssm-fleet", "Fleet Manager (managed nodes)"]]]];
  NAV.Lab = lab;
  NAVHOME.EKS = "eks"; NAVHOME.RDS = "rds"; NAVHOME.SSM = "ssm-sessions";
  LK.eks = "eks"; LK.ng = "ngs"; LK.rds = "rds"; LK.dbsg = "dbsg";
DET.eks = [["details", "Details", det("eks")]]; DET.ng = [["details", "Details", det("ng")]]; DET.rds = [["details", "Details", det("rds")]]; DET.dbsg = [["details", "Details", det("dbsg")]];
})();

function mgSteps(list) { return h("div", { cls: "steps" }, list.map(function (x) { return h("div", {}, [h("b", { text: x.skip ? "–" : (x.ok ? "✓" : "✗"), style: "color:var(--" + (x.skip ? "muted" : (x.ok ? "ok" : "bad")) + ")" }), h("span", {}, [h("b", { text: x.t }), h("div", { cls: "hint", text: x.d })])]); })); }
function mgVpcDefault() { var v = S.vpcs.filter(function (x) { return !x.isDefault; })[0] || defaultVpc(); return v ? v.id : ""; }
function mgVpcOpts() { return S.vpcs.map(function (v) { return [v.id, vname(v.id)]; }); }
function mgSubnetOpts(V) { return S.subnets.filter(function (s) { return s.vpcId === V.vpcId; }).map(function (s) { return [s.id, (s.name || s.id) + " · " + s.az + " · " + s.cidr + (s.autoIp ? " (public)" : " (private)")]; }); }
function mgRoleOpts(svc) { return [["", "เลือก role"]].concat(S.roles.filter(function (r) { return roleTrusts(r, svc); }).map(function (r) { return [r.name, r.name + (r.policies.length ? "  (" + r.policies.length + " policies)" : "")]; })); }
function mgSubnetNames(ids) { return ids.map(function (id) { var s = find(S.subnets, id); return s ? (s.name || s.id) + " (" + s.az.replace(REGION, "") + ")" : id; }).join(", "); }
function mgAge(c) { return fmtT(c.born || t0()); }
function mgErrMap(r, map) { if (!r.errors) return r; var o = {}; Object.keys(r.errors).forEach(function (k) { o[map[k] || k] = r.errors[k]; }); return { errors: o }; }
function mgHint(text) { return { type: "custom", id: "h" + String(text).length, render: function () { return h("div", { cls: "hint", text: text }); } }; }

// ---------- EKS ----------
LISTS["eks"] = function () {
  return ({ key: "eks", kind: "eks", title: "Clusters", crumb: "Amazon EKS › Clusters", create: [{ label: "Create cluster", page: "eks-create" }],
    actions: [{ label: "Add node group", page: "eks-ng-create" }, { label: "Delete cluster", page: "del", kind: "eks" }],
    detail: function (c) { return [["Cluster name", c.name], ["Status", eksPhase(c) === "ACTIVE" ? okIco("Active") : tagp("Creating", "warn")], ["Kubernetes version", c.version], ["API server endpoint", c.endpoint], ["Cluster ARN", mgArn("eks", "cluster", c.name)], ["Cluster IAM role", c.roleArn], ["Cluster security group", c.sgId], ["VPC", vcol(c.vpcId)], ["Subnets", mgSubnetNames(c.subnetIds)], ["API endpoint access", (c.pub ? "Public" : "") + (c.pub && c.priv ? " and " : "") + (c.priv ? "Private" : "")], ["Public access source allowlist", c.pub ? c.cidrs.join(", ") : "-"], ["Authentication mode", c.authMode === "API" ? "EKS API" : "EKS API and ConfigMap"], ["Node groups", String(S.ngs.filter(function (g) { return g.cluster === c.name; }).length)], ["Created", mgAge(c)]]; },
    rows: function () { return S.eks; },
    cols: [["Cluster name", function (c) { return c.name; }], ["Status", function (c) { return eksPhase(c) === "ACTIVE" ? okIco("Active") : tagp("Creating", "warn"); }], ["Kubernetes version", function (c) { return c.version; }], ["Support period", function () { return "Standard support"; }], ["Provider", function () { return "EKS"; }], ["Endpoint access", function (c) { return (c.pub ? "Public" : "") + (c.pub && c.priv ? " + private" : c.priv ? "Private" : ""); }]] });
};
PAGES["eks-create"] = function () {
  return formPage({ name: "eks-create", crumb: "Amazon EKS › Clusters › Create EKS cluster", title: "Configure cluster", back: "eks",
    lead: "EKS ดูแล control plane (API server, etcd) ให้ เราเลือก role, เครือข่าย และใครเรียก API ได้ · ตรงกับ aws_eks_cluster ใน terraform-managed/eks.tf",
    init: function () { return { name: "", version: EKS_VERS[0], roleArn: "", vpcId: mgVpcDefault(), subnetIds: [], access: "both", cidr: "0.0.0.0/0", authMode: "API" }; },
    sections: function (V) { return [
      { t: "Cluster configuration", f: [
        { id: "name", type: "text", label: "Name", desc: "ชื่อ cluster ใช้ตัวอักษร ตัวเลข - _ (ไม่เกิน 100 ตัว)", ph: "pharmacy-eks" },
        { id: "version", type: "select", label: "Kubernetes version", opts: function () { return EKS_VERS.map(function (v) { return [v, v + (v === EKS_VERS[0] ? "  (standard support)" : "")]; }); } },
        { id: "roleArn", type: "select", label: "Cluster service role", desc: "role ที่ EKS ใช้จัดการทรัพยากรแทนเรา (trust = eks.amazonaws.com + AmazonEKSClusterPolicy)", opts: function () { return mgRoleOpts("eks.amazonaws.com"); } },
        mgHint("ไม่มี role? ไปที่ IAM › Roles › Create role › AWS service › EKS › EKS - Cluster · role สำหรับ node (EC2) เอาไปใช้ตรงนี้ไม่ได้")] },
      { t: "Networking", f: [
        { id: "vpcId", type: "select", label: "VPC", opts: function () { return mgVpcOpts(); }, onchange: function (V2) { V2.subnetIds = []; } },
        { id: "subnetIds", type: "multi", label: "Subnets", desc: "ต้องอยู่ ≥ 2 AZ · ของจริงวาง control plane ENI ใน private subnet", opts: function (V2) { return mgSubnetOpts(V2); } },
        { id: "access", type: "radio", label: "Cluster endpoint access", opts: function () { return [["public", "Public — kubectl จากอินเทอร์เน็ต (จำกัด IP ได้)"], ["both", "Public and private — node เรียกผ่านใน VPC, เราเรียกจากเน็ต"], ["private", "Private — เรียกได้เฉพาะจากใน VPC"]]; } },
        { id: "cidr", type: "text", label: "Public access source allowlist (CIDR)", show: function (V2) { return V2.access !== "private"; }, desc: "0.0.0.0/0 = ทุกคนเรียก API ได้ (เสี่ยง) · แนะนำ IP ของเรา /32", ph: "198.51.100.7/32" }] },
      { t: "Cluster authentication mode", f: [{ id: "authMode", type: "radio", opts: function () { return [["API", "EKS API (แนะนำ)"], ["API_AND_CONFIG_MAP", "EKS API and ConfigMap"]]; } }] }]; },
    submit: "Create", onSubmit: function (V) {
      var r = API.createEks({ name: V.name, version: V.version, roleArn: V.roleArn, subnetIds: V.subnetIds, pub: V.access !== "private", priv: V.access !== "public", cidrs: V.access === "private" ? [] : String(V.cidr || "").split(",").map(function (x) { return x.trim(); }), authMode: V.authMode });
      if (r.errors) return mgErrMap(r, { cidrs: "cidr", pub: "access" });
      UI.sel["eks"] = r.res.id; return { msg: "สร้าง cluster " + V.name + " แล้ว (Active) · ต่อไป: Add node group เพื่อให้มี worker node", next: "eks" };
    } });
};
LISTS["ngs"] = function () {
  return ({ key: "ngs", kind: "ng", title: "Node groups", crumb: "Amazon EKS › Node groups", create: [{ label: "Add node group", page: "eks-ng-create" }],
    actions: [{ label: "Delete node group", page: "del", kind: "ng" }],
    detail: function (g) { var a = S.asgs.filter(function (x) { return x.name === g.asg; })[0]; return [["Node group name", g.name], ["Cluster", g.cluster], ["Status", ngPhase(g) === "ACTIVE" ? okIco("Active") : tagp("Creating", "warn")], ["Node IAM role", g.roleArn], ["Instance types", g.types.join(", ")], ["Desired / Min / Max", g.desired + " / " + g.min + " / " + g.max], ["Subnets", mgSubnetNames(g.subnetIds)], ["Auto Scaling group", g.asg], ["ผูก target group", a && a.tgArns.length ? a.tgArns.map(function (x) { return (byArnTg(x) || {}).name; }).join(", ") : "ยังไม่ได้ผูก (EC2 › Auto Scaling groups)"]]; },
    rows: function () { return S.ngs; },
    cols: [["Node group name", function (g) { return g.name; }], ["Cluster", function (g) { return g.cluster; }], ["Desired size", function (g) { return String(g.desired); }], ["AMI release version", function () { return "AL2023 (EKS optimized)"; }], ["Instance types", function (g) { return g.types.join(", "); }], ["Status", function (g) { return ngPhase(g) === "ACTIVE" ? okIco("Active") : tagp("Creating", "warn"); }]] });
};
PAGES["eks-ng-create"] = function () {
  var pre = UI.params.id && byName(S.eks, UI.params.id) ? UI.params.id : (S.eks[0] || {}).name || "";
  return formPage({ name: "eks-ng-create", crumb: "Amazon EKS › Clusters › Add node group", title: "Configure node group", back: "ngs",
    lead: "node group = Auto Scaling group ของเครื่อง worker ที่ EKS สร้างและดูแลให้ · ตรงกับ aws_eks_node_group ใน terraform-managed/eks.tf",
    init: function () { return { cluster: pre, name: "", roleArn: "", subnetIds: [], types: "t3.medium", desired: "3", min: "3", max: "6", disk: "20" }; },
    sections: function (V) { var c = byName(S.eks, V.cluster); V.vpcId = c ? c.vpcId : mgVpcDefault(); return [
      { t: "Node group configuration", f: [
        { id: "cluster", type: "select", label: "Cluster", opts: function () { return [["", "เลือก cluster"]].concat(S.eks.map(function (x) { return [x.name, x.name]; })); }, onchange: function (V2) { V2.subnetIds = []; } },
        { id: "name", type: "text", label: "Name", ph: "pharmacy-nodes" },
        { id: "roleArn", type: "select", label: "Node IAM role", desc: "role ของเครื่อง node (trust = EC2) ต้องมี AmazonEKSWorkerNodePolicy, AmazonEKS_CNI_Policy, ECR ReadOnly (+ SSM ถ้าจะเข้าด้วย Session Manager)", opts: function () { return mgRoleOpts("ec2.amazonaws.com"); } }] },
      { t: "Compute and scaling configuration", f: [
        { id: "types", type: "select", label: "Instance types", opts: function () { return ["t3.small", "t3.medium", "t3.large", "m5.large"].filter(function (t) { return VCPU[t] !== undefined; }).map(function (t) { return [t, t]; }); } },
        { id: "disk", type: "text", label: "Disk size (GiB)" },
        { id: "desired", type: "text", label: "Desired size" }, { id: "min", type: "text", label: "Minimum size" }, { id: "max", type: "text", label: "Maximum size" }] },
      { t: "Networking", f: [{ id: "subnetIds", type: "multi", label: "Subnets", desc: "node ต้อง ‘ออกเน็ตได้’ (NAT หรือ public IP + IGW) ไม่งั้น NodeCreationFailure · เลือก private ครบ 3 AZ ให้กระจายเครื่อง", opts: function (V2) { return mgSubnetOpts(V2); } }] }]; },
    submit: "Create", onSubmit: function (V) {
      var r = API.createNodegroup({ cluster: V.cluster, name: V.name, roleArn: V.roleArn, subnetIds: V.subnetIds, types: [V.types], desired: V.desired, min: V.min, max: V.max, disk: V.disk });
      if (r.errors) return mgErrMap(r, { _create: "name", scaling: "desired" });
      return { msg: "สร้าง node group " + V.name + " แล้ว: " + r.res.desired + " node ขึ้นใน EC2 (ดูที่ EC2 › Instances) · อย่าลืมผูก Auto Scaling group กับ target group ถ้าจะให้ ALB เห็น", next: "ngs" };
    } });
};
LISTS["eks-nodes"] = function () {
  return ({ key: "eks-nodes", title: "Nodes", crumb: "Amazon EKS › Nodes (compute)", create: [], actions: [],
    rows: function () { return S.insts.filter(function (i) { return i.nodeRole && i.state !== "terminated"; }); },
    cols: [["Node name", function (i) { return "ip-" + i.privateIp.replace(/\./g, "-") + "." + REGION + ".compute.internal"; }], ["Instance type", function (i) { return i.type; }], ["Node group", function (i) { var a = S.asgs.filter(function (x) { return x.name === i.asg; })[0]; return a ? a.ng : "-"; }], ["Status", function (i) { return i.state === "running" ? okIco("Ready") : okIco(i.state, "warn"); }], ["Availability Zone", function (i) { return i.az; }], ["Internal IP", function (i) { return i.privateIp; }], ["Public IP", function (i) { return i.publicIp || "-  (ไม่มี)"; }], ["Instance ID", function (i) { return i.id; }]] });
};

// ---------- RDS ----------
function mgRdsRole(r) { return r.multiAz ? "Instance (Multi-AZ)" : "Instance"; }
LISTS["rds"] = function () {
  return ({ key: "rds", kind: "rds", title: "Databases", crumb: "Amazon RDS › Databases", create: [{ label: "Create database", page: "rds-create" }],
    actions: [{ label: "Reboot with failover", btn: false, grp: "Actions", run: function (r) { return API.rdsFailover(r.id); }, msg: "สลับ standby เป็น writer แล้ว (endpoint เดิมไม่เปลี่ยน · ของจริงใช้เวลา ~1-2 นาที)", when: function (r) { return r.multiAz; } }, { label: "Delete", page: "del", kind: "rds" }],
    detail: function (r) { var reach = S.insts.filter(function (i) { return i.nodeRole && i.state === "running"; }), okN = reach.filter(function (i) { return rdsReach(i, r); }).length; return [["DB identifier", r.id], ["Status", okIco("Available")], ["Engine", r.engine + " " + r.version], ["DB instance class", r.cls], ["Storage", r.storage + " GiB gp3 · " + (r.encrypted ? "encrypted" : "not encrypted")], ["Multi-AZ", r.multiAz ? "Yes — primary " + r.az + " / standby " + r.standbyAz : "No (" + r.az + ")"], ["Endpoint", r.address], ["Port", String(r.port)], ["VPC / DB subnet group", vcol(r.vpcId) + " / " + r.subnetGroup], ["VPC security groups", r.sgIds.map(function (id) { return (find(S.sgs, id) || {}).name || id; }).join(", ")], ["Publicly accessible", r.publicly ? tagp("Yes", "bad") : "No"], ["Master credentials", r.manage ? "Managed in Secrets Manager: " + r.secretArn : "Self managed (" + r.user + ")"], ["Automated backups", r.backupDays + " days"], ["ต่อได้จาก EKS node", okN + " / " + reach.length + " node (SG 3306 + VPC เดียวกัน)"]]; },
    rows: function () { return S.rds; },
    cols: [["DB identifier", function (r) { return r.id; }], ["Status", function (r) { return rdsPhase(r) === "available" ? okIco("Available") : tagp("Creating", "warn"); }], ["Role", mgRdsRole], ["Engine", function (r) { return r.engine === "mariadb" ? "MariaDB" : r.engine === "mysql" ? "MySQL Community" : "PostgreSQL"; }], ["Region & AZ", function (r) { return r.az + (r.standbyAz ? " (standby " + r.standbyAz.replace(REGION, "") + ")" : ""); }], ["Size", function (r) { return r.cls; }], ["Endpoint", function (r) { return r.address; }]] });
};
PAGES["rds-create"] = function () {
  var dg = byName(S.dbsg, "pharmacy-db") || S.dbsg[0];
  return formPage({ name: "rds-create", crumb: "Amazon RDS › Databases › Create database", title: "Create database", back: "rds",
    lead: "Standard create · ตรงกับ aws_db_subnet_group + aws_db_instance ใน terraform-managed/rds.tf · ต้องมี DB subnet group (≥ 2 AZ) ก่อน",
    init: function () { return { engine: "mariadb", version: "10.11", tpl: "prod", id: "", user: "pharmacy", cred: "manage", password: "", cls: "db.t4g.small", storage: "20", vpcId: mgVpcDefault(), subnetGroup: dg ? dg.name : "", publicly: "no", sgIds: [], backup: "7" }; },
    sections: function (V) { return [
      { t: "Engine options", f: [
        { id: "engine", type: "radio", label: "Engine type", opts: function () { return [["mariadb", "MariaDB"], ["mysql", "MySQL"], ["postgres", "PostgreSQL"]]; }, onchange: function (V2) { V2.version = RDS_ENGINES[V2.engine][0]; } },
        { id: "version", type: "select", label: "Engine version", opts: function (V2) { return (RDS_ENGINES[V2.engine] || []).map(function (x) { return [x, x]; }); } },
        { id: "tpl", type: "radio", label: "Templates", opts: function () { return [["prod", "Production — Multi-AZ, backup 7 วัน"], ["dev", "Dev/Test — Single-AZ"]]; }, onchange: function (V2) { V2.backup = V2.tpl === "prod" ? "7" : "1"; } }] },
      { t: "Settings", f: [
        { id: "id", type: "text", label: "DB instance identifier", ph: "pharmacy-db", desc: "ขึ้นต้นด้วยตัวพิมพ์เล็ก ใช้ a-z 0-9 - (ห้าม -- และห้ามลงท้าย -)" },
        { id: "user", type: "text", label: "Master username" },
        { id: "cred", type: "radio", label: "Credentials management", opts: function () { return [["manage", "Managed in AWS Secrets Manager (แนะนำ: สุ่มรหัสและหมุนให้)"], ["self", "Self managed (ตั้งรหัสเอง)"]]; } },
        { id: "password", type: "text", label: "Master password", show: function (V2) { return V2.cred === "self"; }, desc: "อย่างน้อย 8 ตัว ห้ามมี / @ \" หรือช่องว่าง", ph: "(อย่าใช้รหัสจริงใน lab)" }] },
      { t: "Instance configuration and storage", f: [
        { id: "cls", type: "select", label: "DB instance class", opts: function () { return RDS_CLASSES.map(function (x) { return [x, x]; }); } },
        { id: "storage", type: "text", label: "Allocated storage (GiB)", desc: "gp3 ขั้นต่ำ 20 GiB" }] },
      { t: "Connectivity", f: [
        { id: "vpcId", type: "select", label: "Virtual private cloud (VPC)", opts: function () { return mgVpcOpts(); }, onchange: function (V2) { V2.sgIds = []; var g = S.dbsg.filter(function (x) { return x.vpcId === V2.vpcId; })[0]; V2.subnetGroup = g ? g.name : ""; } },
        { id: "subnetGroup", type: "select", label: "DB subnet group", desc: "ยังไม่มี? RDS › Subnet groups › Create DB subnet group (ต้องครอบ ≥ 2 AZ)", opts: function (V2) { return [["", "เลือก subnet group"]].concat(S.dbsg.filter(function (g) { return g.vpcId === V2.vpcId; }).map(function (g) { return [g.name, g.name]; })); } },
        { id: "publicly", type: "radio", label: "Public access", opts: function () { return [["no", "No — เฉพาะเครื่องใน VPC"], ["yes", "Yes — มี public IP (ไม่ควรสำหรับ DB)"]]; } },
        { id: "sgIds", type: "multi", label: "VPC security groups", desc: "แนะนำ SG ที่รับ 3306 จาก SG ของ EKS cluster เท่านั้น", opts: function (V2) { return sgOpts(V2.vpcId); } }] },
      { t: "Additional configuration", f: [{ id: "backup", type: "text", label: "Backup retention (days)" }] }]; },
    submit: "Create database", onSubmit: function (V) {
      var r = API.createRds({ id: V.id, engine: V.engine, version: V.version, cls: V.cls, storage: V.storage, user: V.user, manage: V.cred === "manage", password: V.password, multiAz: V.tpl === "prod", subnetGroup: V.subnetGroup, sgIds: V.sgIds, publicly: V.publicly === "yes", backupDays: V.backup, skipSnap: true });
      if (r.errors) return r;
      return { msg: "สร้าง DB " + V.id + " แล้ว (Available" + (V.tpl === "prod" ? " · Multi-AZ มี standby คนละ AZ" : "") + ") · endpoint: " + r.res.address, next: "rds" };
    } });
};
LISTS["dbsg"] = function () {
  return ({ key: "dbsg", kind: "dbsg", title: "Subnet groups", crumb: "Amazon RDS › Subnet groups", create: [{ label: "Create DB subnet group", page: "rds-sg-create" }], actions: [{ label: "Delete", page: "del", kind: "dbsg" }],
    detail: function (g) { return [["Name", g.name], ["Description", g.desc], ["VPC", vcol(g.vpcId)], ["Subnets", mgSubnetNames(g.subnetIds)], ["Availability Zones", azsOf(g.subnetIds).join(", ")]]; },
    rows: function () { return S.dbsg; },
    cols: [["Name", function (g) { return g.name; }], ["Description", function (g) { return g.desc; }], ["Status", function () { return okIco("Complete"); }], ["VPC", function (g) { return vcol(g.vpcId); }], ["Availability Zones", function (g) { return azsOf(g.subnetIds).map(function (z) { return z.replace(REGION, ""); }).join(", "); }]] });
};
PAGES["rds-sg-create"] = function () {
  return formPage({ name: "rds-sg-create", crumb: "Amazon RDS › Subnet groups › Create DB subnet group", title: "Create DB subnet group", back: "dbsg",
    init: function () { return { name: "", desc: "", vpcId: mgVpcDefault(), subnetIds: [] }; },
    sections: function () { return [
      { t: "Subnet group details", f: [{ id: "name", type: "text", label: "Name", ph: "pharmacy-db", desc: "ตัวพิมพ์เล็ก ตัวเลข . _ - และช่องว่าง" }, { id: "desc", type: "text", label: "Description", ph: "pharmacy db subnets" }, { id: "vpcId", type: "select", label: "VPC", opts: function () { return mgVpcOpts(); }, onchange: function (V2) { V2.subnetIds = []; } }] },
      { t: "Add subnets", f: [{ id: "subnetIds", type: "multi", label: "Subnets", desc: "เลือกให้ครอบอย่างน้อย 2 AZ (Multi-AZ ต้องใช้) · ของจริงเลือก private subnet ครบ 3 AZ", opts: function (V2) { return mgSubnetOpts(V2); } }] }]; },
    submit: "Create", onSubmit: function (V) { var r = API.createDbSubnetGroup({ name: V.name, desc: V.desc, subnetIds: V.subnetIds }); return r.errors ? r : { msg: "สร้าง subnet group " + V.name + " แล้ว", next: "dbsg" }; } });
};

// ---------- Systems Manager ----------
function ssmRows() { return S.insts.filter(function (i) { return i.state !== "terminated"; }); }
function ssmPage(fleet) {
  var wrap = h("div"), rows = ssmRows(), sel = find(S.insts, UI.ssmSel), card = h("div", { cls: "card" }), body = h("div", { cls: "cb" });
  wrap.appendChild(crumbEl("AWS Systems Manager › " + (fleet ? "Fleet Manager" : "Session Manager")));
  wrap.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: fleet ? "Fleet Manager · Managed nodes" : "Session Manager" })]));
  body.appendChild(h("p", { cls: "hint", text: fleet ? "เครื่องที่ SSM Agent ออนไลน์ = ‘Managed node’ · ต้องมี IAM role (AmazonSSMManagedInstanceCore) และทางออกไปหา SSM (NAT/IGW หรือ VPC endpoint)" : "เข้าเครื่องโดยไม่ต้องมี key pair, bastion หรือ port 22 · สิทธิ์ผ่าน IAM · เลือกเครื่องแล้วกด Start session" }));
  var tb = h("tbody");
  rows.forEach(function (i) {
    var c = sessionCheck(i), role = mgInstRole(i);
    tb.appendChild(h("tr", { cls: i.id === (sel || {}).id ? "sel" : "" }, [h("td", { text: i.name || "-" }), h("td", { text: i.id }), h("td", {}, [c.ok ? okIco("Online") : tagp("Connection lost / ไม่ได้ลงทะเบียน", "bad")]), h("td", { text: role ? role.name : "(ไม่มี role)" }), h("td", { text: i.privateIp + (i.publicIp ? " / " + i.publicIp : " / (ไม่มี public IP)") }),
      h("td", {}, [fleet ? "" : h("button", { cls: "btn", type: "button", text: "Start session", onclick: function () { UI.ssmSel = i.id; render(); } })])]));
  });
  if (!rows.length) tb.appendChild(h("tr", {}, [h("td", { cls: "empty", colspan: "6", text: "ยังไม่มีเครื่อง · สร้างด้วย Terraform ใน terraform-managed/ หรือโหลดตัวอย่างจาก Lab › ตัวอย่างสำเร็จรูป" })]));
  body.appendChild(h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, ["Name", "Instance ID", "Ping status", "IAM role", "IP (private / public)", ""].map(function (t) { return h("th", { text: t }); }))]), tb])]));
  if (sel && !fleet) {
    var c2 = sessionCheck(sel), w = whoAmI(), iam = !w.err && canDo(w, "ssm:StartSession");
    var st = [{ ok: !w.err, t: "คุณเรียก AWS ได้ (aws configure แล้ว)", d: w.err ? "ยังไม่ได้ตั้งค่า credentials" : w.arn }, { ok: iam, t: "สิทธิ์ IAM ของคุณมี ssm:StartSession", d: iam ? "มี" : "ไม่มี (ถอนสิทธิ์ = เข้าไม่ได้ทันที)" }].concat(c2.steps);
    body.appendChild(h("h2", { text: "Start session › " + (sel.name || sel.id) }));
    body.appendChild(mgSteps(st));
    var ok = st.every(function (x) { return x.ok; });
    body.appendChild(h("pre", { cls: "term", text: ok ? "Starting session with SessionId: " + (w.arn || "user").split("/").pop() + "-" + sel.id.slice(2, 12) + "\nsh-5.2$ hostname\nip-" + sel.privateIp.replace(/\./g, "-") + "." + REGION + ".compute.internal\nsh-5.2$" : "Your instance isn't connected to Session Manager (TargetNotConnected) · แก้ข้อ ✗ ข้างบน" }));
    body.appendChild(h("p", { cls: "hint", text: "เปิดหน้าเว็บของเครื่องที่ไม่มี public IP: aws ssm start-session --target " + sel.id + " --document-name AWS-StartPortForwardingSession --parameters portNumber=8080,localPortNumber=8080  (พิมพ์ใน Laptop › Terminal)" }));
  }
  card.appendChild(body); wrap.appendChild(card); return wrap;
}
PAGES["ssm-sessions"] = function () { return ssmPage(false); };
PAGES["ssm-fleet"] = function () { return ssmPage(true); };
["eks", "ngs", "eks-nodes", "rds", "dbsg"].forEach(function (k) { PAGES[k] = function () { return listPage(LISTS[k]()); }; });
