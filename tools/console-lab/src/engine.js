var HOME = "/home/swd", REPO = HOME + "/Desktop/work/pharmacy-aws-lab";
// ============================== logic (no DOM) ==============================
var REGION = "ap-southeast-1", AZS = ["ap-southeast-1a", "ap-southeast-1b", "ap-southeast-1c"];
var MYIP0 = "198.51.100.7";
var POLICY_DEF = {
  AdministratorAccess: { desc: "Provides full access to AWS services and resources.", actions: ["*"] },
  AmazonEC2ContainerRegistryPowerUser: { desc: "Provides full access to Amazon EC2 Container Registry repositories, but does not allow repository deletion or policy changes.", actions: ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:GetRepositoryPolicy", "ecr:DescribeRepositories", "ecr:ListImages", "ecr:DescribeImages", "ecr:BatchGetImage", "ecr:GetLifecyclePolicy", "ecr:GetLifecyclePolicyPreview", "ecr:ListTagsForResource", "ecr:DescribeImageScanFindings", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage"] },
  AmazonEC2ContainerRegistryReadOnly: { desc: "Provides read-only access to Amazon EC2 Container Registry repositories.", actions: ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:GetRepositoryPolicy", "ecr:DescribeRepositories", "ecr:ListImages", "ecr:DescribeImages", "ecr:BatchGetImage", "ecr:GetLifecyclePolicy", "ecr:GetLifecyclePolicyPreview", "ecr:ListTagsForResource", "ecr:DescribeImageScanFindings"] },
  AmazonSSMManagedInstanceCore: { desc: "The policy for Amazon EC2 Role to enable AWS Systems Manager service core functionality.", actions: ["ssm:DescribeAssociation", "ssm:GetDeployablePatchSnapshotForInstance", "ssm:GetDocument", "ssm:DescribeDocument", "ssm:GetManifest", "ssm:GetParameter", "ssm:GetParameters", "ssm:ListAssociations", "ssm:ListInstanceAssociations", "ssm:PutInventory", "ssm:PutComplianceItems", "ssm:PutConfigurePackageResult", "ssm:UpdateAssociationStatus", "ssm:UpdateInstanceAssociationStatus", "ssm:UpdateInstanceInformation", "ssmmessages:CreateControlChannel", "ssmmessages:CreateDataChannel", "ssmmessages:OpenControlChannel", "ssmmessages:OpenDataChannel", "ec2messages:AcknowledgeMessage", "ec2messages:DeleteMessage", "ec2messages:FailMessage", "ec2messages:GetEndpoint", "ec2messages:GetMessages", "ec2messages:SendReply"] },
  AmazonS3ReadOnlyAccess: { desc: "Provides read only access to all buckets via the AWS Management Console. (คำอธิบายและเนื้อหายังไม่ได้ตรวจ)", actions: null },
  CloudWatchAgentServerPolicy: { desc: "Permissions required to use the CloudWatch agent on servers. (คำอธิบายและเนื้อหายังไม่ได้ตรวจ)", actions: null }
};
var POLICIES = Object.keys(POLICY_DEF);
var PUSH_ACTIONS = ["ecr:GetAuthorizationToken", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:BatchCheckLayerAvailability", "ecr:PutImage", "ecr:BatchGetImage"];
var PULL_ACTIONS = ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"];
var ITYPE_INFO = { "t3.micro": [2, 1], "t3.small": [2, 2], "t3.medium": [2, 4], "t3.large": [2, 8], "t4g.small": [2, 2], "c7i-flex.large": [2, 4], "m7i-flex.large": [2, 8], "m5.large": [2, 8] };
var ITYPES = ["t3.micro", "t3.small", "t3.medium", "t3.large", "t4g.small", "c7i-flex.large", "m7i-flex.large", "m5.large"];
var FREE = ["t3.micro", "t3.small", "t4g.micro", "t4g.small", "c7i-flex.large", "m7i-flex.large"];
var AMIS = [["ami-ubuntu2404", "Ubuntu Server 24.04 LTS (HVM), SSD Volume Type"], ["ami-al2023", "Amazon Linux 2023 AMI"], ["ami-ubuntu2204", "Ubuntu Server 22.04 LTS (HVM), SSD Volume Type"]];
var RESERVED = ["0.0.0.0/8", "127.0.0.0/8", "169.254.0.0/16", "224.0.0.0/4"];
var S, UI;

function rid(p) { var s = ""; for (var i = 0; i < 17; i++) s += "0123456789abcdef".charAt(Math.floor(Math.random() * 16)); return p + "-" + s; }
function ip2n(ip) { var p = String(ip).split("."); if (p.length !== 4) return null; var n = 0; for (var i = 0; i < 4; i++) { if (!/^\d{1,3}$/.test(p[i]) || +p[i] > 255) return null; n = n * 256 + (+p[i]); } return n; }
function n2ip(n) { return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join("."); }
function parseCidr(c) {
  var m = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(String(c || "").trim()); if (!m) return null;
  var n = ip2n(m[1]), p = +m[2]; if (n === null || p > 32) return null;
  var size = Math.pow(2, 32 - p); return { base: Math.floor(n / size) * size, given: n, prefix: p, size: size };
}
function canon(c) { var p = parseCidr(c); return !!p && p.base === p.given; }
function within(inner, outer) { var a = parseCidr(inner), b = parseCidr(outer); return !!a && !!b && a.base >= b.base && a.base + a.size <= b.base + b.size; }
function overlap(x, y) { var a = parseCidr(x), b = parseCidr(y); return !!a && !!b && !(a.base + a.size <= b.base || b.base + b.size <= a.base); }
function cidrHas(c, ip) { var p = parseCidr(c), n = ip2n(ip); return !!p && n !== null && n >= p.base && n < p.base + p.size; }
function slug(s) { return String(s || "x").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase() || "x"; }
function E(id, msg) { var o = {}; o[id] = msg; return { errors: o }; }
function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
function byName(list, n) { for (var i = 0; i < list.length; i++) if (list[i].name === n) return list[i]; return null; }
function nm(r) { return r ? (r.name || r.id) : "-"; }

function mkVpc(o) {
  var v = { id: rid("vpc"), name: o.name || "", cidr: o.cidr, dnsHostnames: !!o.dns, dnsResolution: true, isDefault: !!o.isDefault, tenancy: "Default" };
  S.vpcs.push(v);
  S.rtbs.push({ id: rid("rtb"), name: "", vpcId: v.id, main: true, routes: [], assoc: [] });
  S.sgs.push({ id: rid("sg"), name: "default", desc: "default VPC security group", vpcId: v.id, inbound: [], outbound: [{ proto: "-1", from: 0, to: 65535, srcKind: "cidr", src: "0.0.0.0/0" }] });
  var d = S.sgs[S.sgs.length - 1]; d.inbound.push({ proto: "-1", from: 0, to: 65535, srcKind: "sg", src: d.id });
  return v;
}
function fresh() {
  S = { vpcs: [], subnets: [], igws: [], rtbs: [], sgs: [], keys: [], roles: [], repos: [], insts: [], tgs: [], albs: [], users: [], eips: [], policies: [], eipSeq: 0, myIp: MYIP0, newAcct: true, acct: "normal", pubSeq: 10, tf: { inited: false, state: {}, serial: 0, outputs: {} }, laptop: null };
  var v = mkVpc({ cidr: "172.31.0.0/16", dns: true, isDefault: true });
  var g = { id: rid("igw"), name: "", vpcId: v.id }; S.igws.push(g);
  rtbMain(v.id).routes.push({ dest: "0.0.0.0/0", target: g.id });
  ["172.31.0.0/20", "172.31.16.0/20", "172.31.32.0/20"].forEach(function (c, i) { S.subnets.push({ id: rid("subnet"), name: "", vpcId: v.id, az: AZS[i], cidr: c, autoIp: true, isDefault: true }); });
  ensureState();
  labInit();
}
function ensureState() {
  if (!S.laptop) labInit();
  if (!S.tf) S.tf = { inited: false, state: {}, serial: 0, outputs: {} };
  if (!S.acct) S.acct = "normal";
  ["users", "eips", "policies"].forEach(function (k) { if (!S[k]) S[k] = []; });
  if (!S.policies.length) S.policies = POLICIES.map(function (n) { return { id: n, name: n, desc: POLICY_DEF[n].desc }; });
  S.repos.forEach(function (r) { if (!r.images) r.images = []; });
  S.insts.forEach(function (i) { if (!i.volId) i.volId = rid("vol"); if (i.eipId === undefined) i.eipId = null; });
}
function rtbMain(vpcId) { for (var i = 0; i < S.rtbs.length; i++) if (S.rtbs[i].vpcId === vpcId && S.rtbs[i].main) return S.rtbs[i]; return null; }
function defaultVpc() { for (var i = 0; i < S.vpcs.length; i++) if (S.vpcs[i].isDefault) return S.vpcs[i]; return null; }
function defaultSg(vpcId) { for (var i = 0; i < S.sgs.length; i++) if (S.sgs[i].vpcId === vpcId && S.sgs[i].name === "default") return S.sgs[i]; return null; }
function vpcIgw(vpcId) { for (var i = 0; i < S.igws.length; i++) if (S.igws[i].vpcId === vpcId) return S.igws[i]; return null; }
function subnetRtb(sn) {
  for (var i = 0; i < S.rtbs.length; i++) { var r = S.rtbs[i]; if (r.vpcId === sn.vpcId && !r.main && r.assoc.indexOf(sn.id) >= 0) return r; }
  return rtbMain(sn.vpcId);
}
function hasIgwRoute(rt) {
  if (!rt) return false;
  return rt.routes.some(function (x) { var g = /^igw-/.test(x.target) ? find(S.igws, x.target) : null; return x.dest === "0.0.0.0/0" && g && g.vpcId === rt.vpcId; });
}

// ---- name rules
function lbName(n, kind) {
  if (!n) return "ต้องกรอกชื่อ";
  if (n.length > 32) return "ชื่อยาวได้ไม่เกิน 32 ตัวอักษร";
  if (!/^[A-Za-z0-9-]+$/.test(n)) return "ใช้ได้เฉพาะตัวอักษร ตัวเลข และเครื่องหมาย -";
  if (/^-|-$/.test(n)) return "ห้ามขึ้นต้นหรือลงท้ายด้วย -";
  if (kind === "alb" && /^internal-/.test(n)) return "ห้ามขึ้นต้นด้วย internal-";
  return "";
}
function ecrName(n) {
  if (!n) return "ต้องกรอกชื่อ repository";
  if (n.length > 256) return "ยาวได้ไม่เกิน 256 ตัวอักษร";
  if (!/^[a-z]/.test(n)) return "ต้องขึ้นต้นด้วยตัวอักษรพิมพ์เล็ก";
  if (!/^[a-z0-9_.\-\/]+$/.test(n)) return "ใช้ได้เฉพาะตัวพิมพ์เล็ก ตัวเลข - _ . และ /";
  if (/\/\//.test(n)) return "ห้ามมี // ติดกัน";
  return "";
}

// ---- security group rules
function typeRule(t, port) {
  var m = { "SSH": [22, 22], "HTTP": [80, 80], "HTTPS": [443, 443], "MYSQL/Aurora": [3306, 3306] };
  if (m[t]) return { proto: "tcp", from: m[t][0], to: m[t][1] };
  if (t === "All traffic") return { proto: "-1", from: 0, to: 65535 };
  var p = String(port || "").split("-"); var a = +p[0], b = p.length > 1 ? +p[1] : +p[0];
  return { proto: "tcp", from: a, to: b };
}
function normRules(rows, vpcId) {
  var errs = [], out = [];
  rows.forEach(function (r, i) {
    var t = typeRule(r.type, r.port), s = {};
    if (t.proto === "tcp" && !(t.from >= 0 && t.to <= 65535 && t.from <= t.to)) errs.push("กฎที่ " + (i + 1) + ": port range ไม่ถูกต้อง");
    if (r.srcKind === "Anywhere-IPv4") s = { srcKind: "cidr", src: "0.0.0.0/0" };
    else if (r.srcKind === "My IP") s = { srcKind: "cidr", src: S.myIp + "/32" };
    else if (r.srcKind === "Security group") { var rg = find(S.sgs, r.src); if (!rg) errs.push("กฎที่ " + (i + 1) + ": ต้องเลือก security group"); else if (vpcId && rg.vpcId !== vpcId) errs.push("กฎที่ " + (i + 1) + ": อ้างถึง security group ได้เฉพาะ SG ใน VPC เดียวกัน (หรือ VPC ที่ peer กัน)"); s = { srcKind: "sg", src: r.src }; }
    else { if (!parseCidr(r.src)) errs.push("กฎที่ " + (i + 1) + ": CIDR ไม่ถูกต้อง"); s = { srcKind: "cidr", src: String(r.src || "").trim() }; }
    out.push({ proto: t.proto, from: t.from, to: t.to, srcKind: s.srcKind, src: s.src });
  });
  return { errs: errs, rules: out };
}
function sgAllows(sgIds, port, from) {
  for (var i = 0; i < sgIds.length; i++) {
    var g = find(S.sgs, sgIds[i]); if (!g) continue;
    for (var j = 0; j < g.inbound.length; j++) {
      var r = g.inbound[j];
      var portOk = r.proto === "-1" || (r.proto === "tcp" && r.from <= port && port <= r.to);
      if (!portOk) continue;
      if (r.srcKind === "cidr" && from.ip && cidrHas(r.src, from.ip)) return true;
      if (r.srcKind === "sg" && from.sgIds && from.sgIds.indexOf(r.src) >= 0) return true;
    }
  }
  return false;
}
function egressOpen(sgIds) {
  return sgIds.some(function (id) { var g = find(S.sgs, id); return g && g.outbound.some(function (r) { return r.proto === "-1" && r.src === "0.0.0.0/0"; }); });
}

// ---- API: every create/edit validates and returns {res} or {errors}
var API = {};
API.createVpc = function (o) {
  var er = {};
  if (!parseCidr(o.cidr)) er.cidr = "CIDR ไม่ถูกต้อง (รูปแบบ 10.0.0.0/16)";
  else if (!canon(o.cidr)) er.cidr = "CIDR นี้มี bit ของ host ติดอยู่ ลองเปลี่ยนเป็น " + n2ip(parseCidr(o.cidr).base) + "/" + parseCidr(o.cidr).prefix;
  else if (parseCidr(o.cidr).prefix < 16 || parseCidr(o.cidr).prefix > 28) er.cidr = "ขนาดต้องอยู่ระหว่าง /16 ถึง /28";
  else if (RESERVED.some(function (r) { return within(o.cidr, r); })) er.cidr = "ห้ามใช้ช่วงนี้กับ VPC (0.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, 224.0.0.0/4)";
  if (Object.keys(er).length) return { errors: er };
  var v = mkVpc({ name: o.name, cidr: o.cidr.trim(), dns: o.dns });
  return { res: v };
};
API.createVpcAndMore = function (o) {
  var r = API.createVpc({ name: o.name ? o.name + "-vpc" : "", cidr: o.cidr, dns: true }); if (r.errors) return r;
  var v = r.res, g = { id: rid("igw"), name: o.name ? o.name + "-igw" : "", vpcId: v.id }; S.igws.push(g);
  var rt = { id: rid("rtb"), name: o.name ? o.name + "-rtb-public" : "", vpcId: v.id, main: false, routes: [{ dest: "0.0.0.0/0", target: g.id }], assoc: [] }; S.rtbs.push(rt);
  var base = parseCidr(o.cidr).base, n = Math.max(0, Math.min(3, +o.publicCount || 0));
  for (var i = 0; i < n; i++) {
    var sn = { id: rid("subnet"), name: o.name ? o.name + "-subnet-public" + (i + 1) + "-" + AZS[i] : "", vpcId: v.id, az: AZS[i], cidr: n2ip(base + i * 4096) + "/20", autoIp: false };
    S.subnets.push(sn); rt.assoc.push(sn.id);
  }
  return { res: v };
};
API.setDns = function (id, hostnames, resolution) { var v = find(S.vpcs, id); if (!v) return E("_", "ไม่พบ VPC"); v.dnsHostnames = !!hostnames; v.dnsResolution = !!resolution; return { res: v }; };
API.createSubnet = function (o) {
  var v = find(S.vpcs, o.vpcId); if (!v) return E("vpcId", "ต้องเลือก VPC");
  var er = {}, made = [];
  (o.list || []).forEach(function (s, i) {
    var k = "cidr" + i;
    if (!parseCidr(s.cidr)) { er[k] = "CIDR ไม่ถูกต้อง"; return; }
    if (!canon(s.cidr)) { er[k] = "CIDR นี้มี bit ของ host ติดอยู่ ลอง " + n2ip(parseCidr(s.cidr).base) + "/" + parseCidr(s.cidr).prefix; return; }
    var p = parseCidr(s.cidr).prefix; if (p < 16 || p > 28) { er[k] = "ขนาดต้องอยู่ระหว่าง /16 ถึง /28"; return; }
    if (!within(s.cidr, v.cidr)) { er[k] = "ต้องอยู่ในช่วงของ VPC (" + v.cidr + ")"; return; }
    var clash = S.subnets.concat(made).filter(function (x) { return x.vpcId === v.id && overlap(x.cidr, s.cidr); })[0];
    if (clash) { er[k] = "ซ้อนทับกับซอย " + (clash.name || clash.cidr) + " (" + clash.cidr + ")"; return; }
    var az = s.az;
    if (!az) { var cnt = {}; AZS.forEach(function (a) { cnt[a] = 0; }); S.subnets.concat(made).forEach(function (x) { if (x.vpcId === v.id) cnt[x.az]++; }); az = AZS.slice().sort(function (a, b) { return cnt[a] - cnt[b]; })[0]; }
    made.push({ id: rid("subnet"), name: s.name || "", vpcId: v.id, az: az, cidr: s.cidr.trim(), autoIp: false });
  });
  if (Object.keys(er).length) return { errors: er };
  made.forEach(function (x) { S.subnets.push(x); });
  return { res: made };
};
API.setAutoIp = function (id, on) { var s = find(S.subnets, id); if (!s) return E("_", "ไม่พบ subnet"); s.autoIp = !!on; return { res: s }; };
API.createIgw = function (o) { var g = { id: rid("igw"), name: o.name || "", vpcId: null }; S.igws.push(g); return { res: g }; };
API.attachIgw = function (igwId, vpcId) {
  var g = find(S.igws, igwId), v = find(S.vpcs, vpcId);
  if (!g) return E("_", "ไม่พบ internet gateway"); if (!v) return E("vpcId", "ต้องเลือก VPC");
  if (g.vpcId) return E("vpcId", "internet gateway นี้ถูก attach กับ VPC อื่นอยู่แล้ว");
  if (vpcIgw(v.id)) return E("vpcId", "VPC นี้มี internet gateway อยู่แล้ว (1 VPC ต่อได้ 1 ตัว)");
  g.vpcId = v.id; return { res: g };
};
API.createRtb = function (o) {
  if (!find(S.vpcs, o.vpcId)) return E("vpcId", "ต้องเลือก VPC");
  var r = { id: rid("rtb"), name: o.name || "", vpcId: o.vpcId, main: false, routes: [], assoc: [] }; S.rtbs.push(r); return { res: r };
};
API.setRoutes = function (id, rows) {
  var r = find(S.rtbs, id); if (!r) return E("_", "ไม่พบ route table");
  var errs = [], seen = {}, out = [];
  rows.forEach(function (x, i) {
    if (!parseCidr(x.dest)) { errs.push("เส้นทางที่ " + (i + 1) + ": Destination ไม่ถูกต้อง"); return; }
    if (!x.target) { errs.push("เส้นทางที่ " + (i + 1) + ": ต้องเลือก Target"); return; }
    var g = find(S.igws, x.target);
    if (g && g.vpcId !== r.vpcId) { errs.push("เส้นทางที่ " + (i + 1) + ": internet gateway ต้อง attach กับ VPC เดียวกับ route table"); return; }
    var d = x.dest.trim(); if (seen[d]) { errs.push("Destination " + d + " ซ้ำกัน"); return; } seen[d] = 1;
    out.push({ dest: d, target: x.target });
  });
  if (errs.length) return { errors: { _: errs.join(" · ") } };
  r.routes = out; return { res: r };
};
API.setAssoc = function (id, subnetIds) {
  var r = find(S.rtbs, id); if (!r) return E("_", "ไม่พบ route table");
  S.rtbs.forEach(function (x) { if (x.id !== id && !x.main) x.assoc = x.assoc.filter(function (s) { return subnetIds.indexOf(s) < 0; }); });
  r.assoc = subnetIds.slice(); return { res: r };
};
API.createSg = function (o) {
  var er = {}, v = find(S.vpcs, o.vpcId);
  var nmv = String(o.name || "").replace(/\s+$/, ""); o.name = nmv;
  var SGCH = /^[a-zA-Z0-9 ._\-:\/()#,@\[\]+=&;{}!$*]*$/;
  if (!nmv) er.name = "ต้องกรอกชื่อ"; else if (nmv.length > 255) er.name = "ชื่อยาวได้ไม่เกิน 255 ตัวอักษร"; else if (!SGCH.test(nmv)) er.name = "ชื่อมีอักขระที่ไม่อนุญาต (ใช้ได้: a-z A-Z 0-9 ช่องว่าง และ ._-:/()#,@[]+=&;{}!$*)"; else if (/^sg-/.test(nmv)) er.name = "ชื่อห้ามขึ้นต้นด้วย sg-"; else if (S.sgs.some(function (g) { return g.vpcId === o.vpcId && g.name.toLowerCase() === nmv.toLowerCase(); })) er.name = "มี security group ชื่อ " + nmv + " ใน VPC นี้แล้ว (ชื่อไม่แยกตัวพิมพ์ใหญ่เล็ก)";
  if (!o.desc) er.desc = "ต้องกรอก description"; else if (o.desc.length > 255 || !SGCH.test(o.desc)) er.desc = "description ยาวไม่เกิน 255 ตัว และใช้อักขระที่อนุญาตเท่านั้น";
  if (!v) er.vpcId = "ต้องเลือก VPC";
  var n = normRules(o.rows || [], o.vpcId); if (n.errs.length) er.rules = n.errs.join(" · ");
  if (Object.keys(er).length) return { errors: er };
  var g = { id: rid("sg"), name: o.name, desc: o.desc, vpcId: v.id, inbound: n.rules, outbound: [{ proto: "-1", from: 0, to: 65535, srcKind: "cidr", src: "0.0.0.0/0" }] };
  S.sgs.push(g); return { res: g };
};
API.setInbound = function (id, rows) {
  var g = find(S.sgs, id); if (!g) return E("_", "ไม่พบ security group");
  var n = normRules(rows, g.vpcId); if (n.errs.length) return E("rules", n.errs.join(" · "));
  g.inbound = n.rules; return { res: g };
};
API.importKey = function (o) {
  var n = (o.name || ""), er = {};
  if (!n) er.name = "ต้องกรอกชื่อ"; else if (n.length > 255 || /[^\x20-\x7e]/.test(n)) er.name = "ชื่อต้องเป็น ASCII ไม่เกิน 255 ตัว"; else if (/^\s|\s$/.test(n)) er.name = "ห้ามมีช่องว่างหน้า/หลังชื่อ"; else if (byName(S.keys, n)) er.name = "มี key pair ชื่อนี้แล้ว";
  var k = String(o.pub || "").trim();
  if (!k) er.pub = "ต้องวางเนื้อ public key";
  else if (/^ssh-dss/.test(k)) er.pub = "EC2 ไม่รับกุญแจแบบ DSA (ใช้ RSA หรือ ED25519)";
  else if (!/^(ssh-ed25519|ssh-rsa) \S+/.test(k)) er.pub = "รูปแบบไม่ถูกต้อง ต้องเป็น OpenSSH public key ขึ้นต้นด้วย ssh-ed25519 หรือ ssh-rsa";
  if (Object.keys(er).length) return { errors: er };
  var key = { id: rid("key"), name: n, type: /ed25519/.test(k) ? "ed25519" : "rsa", imported: true, pub: k }; S.keys.push(key); return { res: key };
};
API.createKey = function (o) {
  var n = o.name || "", er = {};
  if (!n) er.name = "ต้องกรอกชื่อ"; else if (byName(S.keys, n)) er.name = "มี key pair ชื่อนี้แล้ว";
  if (Object.keys(er).length) return { errors: er };
  var key = { id: rid("key"), name: n, type: (o.type || "RSA").toLowerCase(), imported: false, file: n + "." + (o.fmt || "pem") }; S.keys.push(key); return { res: key };
};
API.createRole = function (o) {
  var n = o.name || "", er = {};
  if (o.entity !== "AWS service") er.entity = "จำลองเฉพาะ AWS service";
  if (o.usecase !== "EC2") er.usecase = "จำลองเฉพาะ use case EC2";
  if (!n) er.name = "ต้องกรอก Role name"; else if (n.length > 64) er.name = "ยาวได้ไม่เกิน 64 ตัวอักษร"; else if (!/^[A-Za-z0-9+=,.@_-]+$/.test(n)) er.name = "ใช้ได้เฉพาะตัวอักษร ตัวเลข และ + = , . @ _ -";
  else if (S.roles.some(function (r) { return r.name.toLowerCase() === n.toLowerCase(); })) er.name = "มี role ชื่อนี้แล้ว (ชื่อซ้ำกันไม่ได้ แม้ต่างกันแค่ตัวพิมพ์ใหญ่เล็ก)";
  if (Object.keys(er).length) return { errors: er };
  var r = { id: rid("role"), name: n, desc: o.desc || "", policies: (o.policies || []).slice(), profile: n }; S.roles.push(r); return { res: r };
};
API.createRepo = function (o) {
  var m = ecrName(o.name || ""); if (m) return E("name", m);
  if (byName(S.repos, o.name)) return E("name", "มี repository ชื่อนี้แล้ว");
  var r = { id: rid("repo"), name: o.name, mutable: o.mutable !== false, enc: o.enc || "AES-256", images: [], forceDelete: !!o.forceDelete, uri: "000000000000.dkr.ecr." + REGION + ".amazonaws.com/" + o.name }; S.repos.push(r); return { res: r };
};
API.launch = function (o) {
  var er = {}, v = find(S.vpcs, o.vpcId);
  if (!v) return E("vpcId", "ต้องเลือก VPC");
  var sn = o.subnetId ? find(S.subnets, o.subnetId) : S.subnets.filter(function (x) { return x.vpcId === v.id; })[0];
  if (!sn) er.subnetId = "VPC นี้ยังไม่มี subnet ให้วางเครื่อง"; else if (sn.vpcId !== v.id) er.subnetId = "subnet นี้ไม่อยู่ใน VPC ที่เลือก";
  var sgIds = (o.sgIds || []).slice();
  if (o.newSg) {
    var r = API.createSg({ name: o.newSg.name, desc: o.newSg.desc, vpcId: v.id, rows: [{ type: "SSH", srcKind: o.newSg.src || "Anywhere-IPv4" }] });
    if (r.errors) { er.newSgName = r.errors.name || r.errors.desc || "สร้าง security group ไม่สำเร็จ"; } else sgIds = [r.res.id];
  } else {
    sgIds = sgIds.filter(function (id) { var g = find(S.sgs, id); return g && g.vpcId === v.id; });
    if (!sgIds.length) { var dg = defaultSg(v.id); if (dg) sgIds = [dg.id]; }
  }
  if (o.profile && !S.roles.some(function (r) { return r.profile === o.profile; })) er.profile = "ไม่พบ instance profile นี้";
  if (S.acct === "free" && FREE.indexOf(o.type) < 0) er.type = "InvalidParameterCombination: The specified instance type is not eligible for Free Tier. (Free plan จำลอง: ใช้ได้เฉพาะ " + FREE.join(", ") + ")";
  var cnt = +o.count || 1; if (cnt < 1 || cnt > 20) er.count = "จำนวนเครื่องต้องอยู่ระหว่าง 1 ถึง 20";
  var size = +o.diskSize; if (!(size >= 8 && size <= 16384)) er.diskSize = "ขนาดดิสก์ 8 ถึง 16384 GiB";
  var hop = +o.hop; if (!(hop >= 1 && hop <= 64)) er.hop = "hop limit ต้องอยู่ระหว่าง 1 ถึง 64";
  if (Object.keys(er).length) { if (o.newSg && !er.newSgName) { /* nothing created */ } return { errors: er }; }
  var made = [], tags = (o.tags || []).filter(function (t) { return t.k; });
  for (var i = 0; i < cnt; i++) {
    var used = S.insts.filter(function (x) { return x.subnetId === sn.id; }).length + made.filter(function (x) { return x.subnetId === sn.id; }).length;
    var pub = (o.autoIp === "Enable") ? "203.0.113." + (S.pubSeq = S.pubSeq % 250 + 1) : "";
    made.push({ id: rid("i"), name: o.name || "", tags: tags, ami: o.ami, type: o.type, keyName: o.keyName || "", vpcId: v.id, subnetId: sn.id, az: sn.az, sgIds: sgIds.slice(), publicIp: pub, hadPub: !!pub, volId: rid("vol"), eipId: null, privateIp: n2ip(parseCidr(sn.cidr).base + 4 + used), profile: o.profile || "", imds: { tokens: o.tokens, hop: hop }, disk: { size: size, type: o.diskType }, state: "running" });
  }
  made.forEach(function (x) { S.insts.push(x); });
  return { res: made };
};
API.createTg = function (o) {
  var er = {}, m = lbName(o.name, "tg"); if (m) er.name = m; else if (byName(S.tgs, o.name)) er.name = "มี target group ชื่อนี้แล้ว";
  var port = +o.port; if (!(port >= 1 && port <= 65535)) er.port = "port ต้องอยู่ระหว่าง 1 ถึง 65535";
  if (!find(S.vpcs, o.vpcId)) er.vpcId = "ต้องเลือก VPC";
  if (o.hcPath && o.hcPath.charAt(0) !== "/") er.hcPath = "Health check path ต้องขึ้นต้นด้วย /";
  if (Object.keys(er).length) return { errors: er };
  var t = { id: rid("tg"), name: o.name, port: port, proto: o.proto || "HTTP", vpcId: o.vpcId, hcPath: o.hcPath || "/", targets: [] };
  (o.targets || []).forEach(function (x) { t.targets.push({ instId: x.instId, port: +x.port || port }); });
  S.tgs.push(t); return { res: t };
};
API.registerTargets = function (tgId, list) {
  var t = find(S.tgs, tgId); if (!t) return E("_", "ไม่พบ target group");
  for (var i = 0; i < list.length; i++) { var x = list[i], inst = find(S.insts, x.instId); if (!inst) return E("_", "ไม่พบเครื่อง"); if (inst.vpcId !== t.vpcId) return E("_", "เครื่อง " + (inst.name || inst.id) + " ไม่อยู่ใน VPC เดียวกับ target group"); }
  t.targets = list.map(function (x) { return { instId: x.instId, port: +x.port || t.port }; }); return { res: t };
};
API.createAlb = function (o) {
  var er = {}, v = find(S.vpcs, o.vpcId), m = lbName(o.name, "alb");
  if (m) er.name = m; else if (byName(S.albs, o.name)) er.name = "มี load balancer ชื่อนี้แล้ว";
  if (!v) er.vpcId = "ต้องเลือก VPC";
  else if (o.scheme === "Internet-facing" && !vpcIgw(v.id)) er.vpcId = "Internet-facing ต้องใช้ VPC ที่มี internet gateway";
  var sns = (o.subnetIds || []).map(function (id) { return find(S.subnets, id); }).filter(Boolean);
  var azs = {}; sns.forEach(function (s) { azs[s.az] = 1; });
  if (Object.keys(azs).length < 2) er.subnetIds = "ต้องเลือก subnet จากอย่างน้อย 2 Availability Zones";
  else if (v && sns.some(function (s) { return s.vpcId !== v.id; })) er.subnetIds = "subnet ต้องอยู่ใน VPC เดียวกัน";
  var sgs = (o.sgIds || []).filter(function (id) { return find(S.sgs, id); });
  if (!sgs.length) er.sgIds = "ต้องเลือก security group อย่างน้อย 1 ตัว";
  var ls = o.listeners || [], seenp = {};
  if (!ls.length) er.listeners = "ต้องมี listener อย่างน้อย 1 อัน";
  ls.forEach(function (l, i) {
    var p = +l.port; if (!(p >= 1 && p <= 65535)) er["lport" + i] = "port ไม่ถูกต้อง"; else if (seenp[p]) er["lport" + i] = "port ซ้ำกับ listener อื่น"; seenp[p] = 1;
    var t = find(S.tgs, l.tgId); if (!t) er["ltg" + i] = "ต้องเลือก target group"; else if (v && t.vpcId !== v.id) er["ltg" + i] = "target group ต้องอยู่ใน VPC เดียวกับ ALB";
  });
  if (Object.keys(er).length) return { errors: er };
  var a = { id: rid("alb"), name: o.name, scheme: o.scheme, vpcId: v.id, subnetIds: sns.map(function (s) { return s.id; }), sgIds: sgs, listeners: ls.map(function (l) { return { proto: "HTTP", port: +l.port, tgId: l.tgId }; }), dns: o.name + "-" + String(Math.floor(Math.random() * 9e8 + 1e8)) + "." + REGION + ".elb.lab.invalid" };
  S.albs.push(a); return { res: a };
};

// ---- diagnostics
function sshCheck(inst, heldKey) {
  if (inst.state === "terminated") return { steps: [{ ok: false, t: "เครื่องถูก terminate แล้ว", d: "กู้คืนหรือเชื่อมต่อไม่ได้" }], out: "ssh: connect to host port 22: No route to host (เครื่องถูกลบแล้ว)", kind: "timeout" };
  var sn = find(S.subnets, inst.subnetId), rt = sn ? subnetRtb(sn) : null, steps = [], timeout = false;
  var run = inst.state === "running";
  steps.push({ ok: run, t: "เครื่องกำลังรัน", d: run ? "state: running" : "เครื่องไม่ได้รัน" });
  var pub = !!inst.publicIp;
  steps.push({ ok: pub, t: "มี public IPv4", d: pub ? inst.publicIp : "ไม่มี public IP: เข้าจากอินเทอร์เน็ตไม่ได้ (ซอยตั้ง auto-assign ไว้ไหม หรือเลือก Enable ตอนเปิดเครื่อง)" });
  var route = hasIgwRoute(rt);
  steps.push({ ok: route, t: "route table ของซอยมีเส้นทาง 0.0.0.0/0 → internet gateway", d: route ? "ใช้ " + (rt.main ? "main route table" : "route table " + nm(rt)) : !rt ? "ไม่พบซอยของเครื่อง" : "ซอยนี้ใช้ " + (rt.main ? "main route table (ยังไม่มีเส้นทางออกเน็ต)" : "route table " + nm(rt) + " ที่ไม่มีเส้นทางออกประตู") + " ลองเช็ก Subnet associations" });
  var sg = sgAllows(inst.sgIds, 22, { ip: S.myIp });
  steps.push({ ok: sg, t: "security group เปิด tcp/22 ให้ My IP (" + S.myIp + ")", d: sg ? "มีกฎ SSH ที่ครอบ IP นี้" : "ไม่มีกฎขาเข้า port 22 ที่ครอบ IP ของคุณ" });
  timeout = !(run && pub && route && sg);
  var out;
  if (timeout) out = "ssh: connect to host " + (inst.publicIp || "<no public ip>") + " port 22: Connection timed out";
  else if (!inst.keyName) out = "ubuntu@" + inst.publicIp + ": Permission denied (publickey).  (เครื่องนี้ไม่ได้ผูก key pair ไว้)";
  else if (heldKey !== inst.keyName) out = "ubuntu@" + inst.publicIp + ": Permission denied (publickey).";
  else out = "Welcome to Ubuntu 24.04 LTS  (จำลอง)  ubuntu@ip-" + inst.privateIp.replace(/\./g, "-") + ":~$";
  steps.push({ ok: !!inst.keyName && heldKey === inst.keyName, skip: timeout, t: "กุญแจที่คุณถือตรงกับ key pair ของเครื่อง", d: (timeout ? "(ยังไปไม่ถึงขั้นนี้เพราะติดที่เครือข่ายก่อน) " : "") + (!inst.keyName ? "เครื่องไม่มี key pair" : (heldKey === inst.keyName ? "ตรงกับ " + inst.keyName : "เครื่องใช้ " + inst.keyName + " แต่คุณถือ " + (heldKey || "(ไม่มี)"))) });
  return { steps: steps, out: out, kind: timeout ? "timeout" : (out.indexOf("Permission denied") >= 0 ? "denied" : "ok") };
}
function sessionCheck(inst) {
  var steps = [], role = inst.profile ? S.roles.filter(function (r) { return r.profile === inst.profile; })[0] : null;
  steps.push({ ok: inst.state === "running", t: "เครื่องกำลังรัน", d: inst.state });
  steps.push({ ok: !!role, t: "เครื่องผูก IAM instance profile", d: role ? role.name : "ไม่มี instance profile (Session Manager ต้องใช้ role)" });
  var pol = !!role && role.policies.indexOf("AmazonSSMManagedInstanceCore") >= 0;
  steps.push({ ok: pol, t: "role มีสิทธิ์ SSM (AmazonSSMManagedInstanceCore)", d: pol ? "มี" : "ไม่มี policy นี้ SSM Agent จะไม่ออนไลน์" });
  var net = internetOut(inst);
  steps.push({ ok: net, t: "เครื่องออกไปหา SSM ได้ (ผ่าน internet gateway)", d: net ? "ได้" : "ออกอินเทอร์เน็ตไม่ได้ (ต้องมี public IP + เส้นทางออก + SG ขาออก หรือใช้ VPC endpoint ซึ่งไม่จำลอง)" });
  var ok = steps.every(function (x) { return x.ok; });
  return { steps: steps, ok: ok, out: ok ? "Session started (Session Manager) ไม่ต้องเปิด port 22 และไม่ต้องมีกุญแจ" : "Your instance isn't connected to Session Manager (SSM Agent not online / ไม่มีสิทธิ์)" };
}
function internetOut(inst) {
  var sn = find(S.subnets, inst.subnetId), rt = sn ? subnetRtb(sn) : null;
  return inst.state === "running" && !!inst.publicIp && hasIgwRoute(rt) && egressOpen(inst.sgIds);
}
function albHealth(alb) {
  var rows = [], azs = alb.subnetIds.map(function (id) { var x = find(S.subnets, id); return x && x.az; });
  alb.listeners.forEach(function (l) {
    var t = find(S.tgs, l.tgId); if (!t) return;
    if (!t.targets.length) rows.push({ l: l, t: t, none: true });
    t.targets.forEach(function (x) {
      var inst = find(S.insts, x.instId), st = "healthy", code = "", desc = "";
      if (!inst || inst.state === "stopped" || inst.state === "terminated") { st = "unused"; code = "Target.InvalidState"; desc = "Target is in the " + (inst ? inst.state : "terminated") + " state"; }
      else if (azs.indexOf(inst.az) < 0) { st = "unused"; code = "Target.NotInUse"; desc = "Target is in an Availability Zone that is not enabled for the load balancer"; }
      else if (!sgAllows(inst.sgIds, x.port, { sgIds: alb.sgIds })) { st = "unhealthy"; code = "Target.Timeout"; desc = "Request timed out"; }
      rows.push({ l: l, t: t, inst: inst, port: x.port, state: st, ok: st === "healthy", code: code, why: code ? code + ": " + desc : "" });
    });
  });
  return rows;
}
function liveInsts(vpcId, subnetId) { return S.insts.filter(function (i) { return i.state !== "terminated" && (!vpcId || i.vpcId === vpcId) && (!subnetId || i.subnetId === subnetId); }); }
API.instState = function (id, act) {
  var i = find(S.insts, id); if (!i) return E("_", "ไม่พบเครื่อง");
  var e = i.eipId ? find(S.eips, i.eipId) : null;
  if (i.state === "terminated") return E("_", "เครื่องที่ terminate แล้วทำอะไรต่อไม่ได้");
  if (act === "stop") { if (i.state !== "running") return E("_", "หยุดได้เฉพาะเครื่องที่ running"); i.state = "stopped"; i.publicIp = e ? e.ip : ""; }
  else if (act === "start") { if (i.state !== "stopped") return E("_", "start ได้เฉพาะเครื่องที่ stopped"); i.state = "running"; i.publicIp = e ? e.ip : (i.hadPub ? "203.0.113." + (S.pubSeq = S.pubSeq % 250 + 1) : ""); }
  else if (act === "reboot") { if (i.state !== "running") return E("_", "reboot ได้เฉพาะเครื่องที่ running"); }
  else if (act === "terminate") { i.state = "terminated"; i.publicIp = ""; if (e) { e.instId = null; i.eipId = null; } }
  else return E("_", "ไม่รู้จัก action");
  return { res: i };
};
API.changeType = function (id, type) {
  var i = find(S.insts, id); if (!i) return E("_", "ไม่พบเครื่อง");
  if (i.state !== "stopped") return E("_", "เปลี่ยน instance type ได้เฉพาะเครื่องที่ stopped (เมนูนี้เป็นสีเทาถ้าเครื่องไม่ stopped)");
  if (ITYPES.indexOf(type) < 0) return E("type", "ไม่พบ instance type นี้");
  i.type = type; return { res: i };
};
API.setInstanceRole = function (id, profile, word) {
  var i = find(S.insts, id); if (!i) return E("_", "ไม่พบเครื่อง");
  if (i.state === "terminated") return E("_", "เครื่องถูก terminate แล้ว");
  if (!profile) {
    if (!i.profile) return E("profile", "เครื่องนี้ไม่มี IAM role ให้ถอด");
    if (String(word || "").trim() !== "Detach") return E("confirm", "พิมพ์ Detach เพื่อยืนยันการถอด role");
    i.profile = ""; return { res: i };
  }
  if (!S.roles.some(function (r) { return r.profile === profile; })) return E("profile", "ไม่พบ instance profile นี้");
  if (i.profile && i.state !== "running") return E("profile", "การ replace role ทำได้เฉพาะเครื่องที่ running (ถ้ายังไม่มี role จะ attach ตอน stopped ได้)");
  i.profile = profile; return { res: i };
};
API.allocEip = function () { S.eipSeq = (S.eipSeq || 0) % 250 + 1; var e = { id: rid("eipalloc"), ip: "192.0.2." + S.eipSeq, instId: null }; S.eips.push(e); return { res: e }; };
API.assocEip = function (eipId, instId) {
  var e = find(S.eips, eipId), i = find(S.insts, instId);
  if (!e) return E("_", "ไม่พบ Elastic IP"); if (!i) return E("instId", "ต้องเลือกเครื่อง"); if (i.state === "terminated") return E("instId", "เครื่องถูก terminate แล้ว");
  if (e.instId) return E("_", "Elastic IP นี้ผูกกับเครื่องอื่นอยู่แล้ว ต้อง Disassociate ก่อน");
  if (i.eipId) return E("instId", "เครื่องนี้มี Elastic IP ผูกอยู่แล้ว");
  e.instId = i.id; i.eipId = e.id; i.publicIp = e.ip; return { res: e };
};
API.disassocEip = function (eipId) {
  var e = find(S.eips, eipId); if (!e || !e.instId) return E("_", "Elastic IP นี้ไม่ได้ผูกกับเครื่องใด");
  var i = find(S.insts, e.instId); e.instId = null;
  if (i) { i.eipId = null; i.publicIp = (i.hadPub && i.state === "running") ? "203.0.113." + (S.pubSeq = S.pubSeq % 250 + 1) : ""; }
  return { res: e };
};
// ---- IAM users / access keys / role policies
function fakeId(prefix, n, chars) { var o = prefix; for (var k = 0; k < n; k++) o += chars.charAt(Math.floor(Math.random() * chars.length)); return o; }
API.createUser = function (o) {
  var n = String(o.name || "").trim(), er = {};
  if (!n) er.name = "ต้องกรอก User name"; else if (n.length > 64) er.name = "ยาวได้ไม่เกิน 64 ตัวอักษร"; else if (!/^[A-Za-z0-9+=,.@_-]+$/.test(n)) er.name = "ใช้ได้เฉพาะตัวอักษร ตัวเลข และ + = , . @ _ -"; else if (S.users.some(function (u) { return u.name.toLowerCase() === n.toLowerCase(); })) er.name = "มี user ชื่อนี้แล้ว";
  var pol = (o.policies || []).filter(function (p) { return POLICIES.indexOf(p) >= 0; });
  if (Object.keys(er).length) return { errors: er };
  var u = { id: rid("user"), name: n, policies: pol, keys: [] }; S.users.push(u); return { res: u };
};
API.setUserPolicies = function (id, pol) { var u = find(S.users, id); if (!u) return E("_", "ไม่พบ user"); u.policies = pol.slice(); return { res: u }; };
API.setRolePolicies = function (id, pol) { var r = find(S.roles, id); if (!r) return E("_", "ไม่พบ role"); r.policies = pol.filter(function (p) { return POLICIES.indexOf(p) >= 0; }); return { res: r }; };
API.createAccessKey = function (userId, usecase, desc) {
  var u = find(S.users, userId); if (!u) return E("_", "ไม่พบ user");
  if (u.keys.length >= 2) return E("_", "user หนึ่งคนมี access key ได้สูงสุด 2 ชุด (ลบชุดเก่าก่อน)");
  var k = { id: fakeId("AKIAEXAMPLE", 9, "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), active: true, desc: desc || "", usecase: usecase || "Other", created: "เมื่อสักครู่" };
  var secret = fakeId("", 40, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+"); k.secretHash = hash32(secret);
  u.keys.push(k); return { res: k, secret: secret };
};
API.accessKeyState = function (userId, keyId, act) {
  var u = find(S.users, userId), k = u && u.keys.filter(function (x) { return x.id === keyId; })[0]; if (!k) return E("_", "ไม่พบ access key");
  if (act === "deactivate") k.active = false; else if (act === "activate") k.active = true;
  else if (act === "delete") { if (k.active) return E("_", "ต้อง Deactivate ก่อนจึงจะลบได้"); u.keys = u.keys.filter(function (x) { return x.id !== keyId; }); }
  else return E("_", "ไม่รู้จัก action");
  return { res: k };
};
// ---- policy evaluation for ECR push/pull from an instance role or an IAM user
function principalActions(p) {
  var pol = [], arn = "", name = "";
  if (p.type === "inst") { var i = find(S.insts, p.id), r = i && S.roles.filter(function (x) { return x.profile === i.profile; })[0]; if (!r) return null; pol = r.policies; arn = "arn:aws:sts::000000000000:assumed-role/" + r.name + "/" + i.id; name = r.name; }
  else { var u = find(S.users, p.id); if (!u) return null; pol = u.policies; arn = "arn:aws:iam::000000000000:user/" + u.name; name = u.name; }
  var acts = []; pol.forEach(function (n) { if (POLICY_DEF[n] && POLICY_DEF[n].actions) acts = acts.concat(POLICY_DEF[n].actions); });
  return { acts: acts, arn: arn, name: name, unknown: pol.filter(function (n) { return POLICY_DEF[n] && !POLICY_DEF[n].actions; }) };
}
function allowsAction(acts, a) { return acts.some(function (x) { return x === "*" || x === a || (x.slice(-1) === "*" && a.indexOf(x.slice(0, -1)) === 0); }); }
API.ecrAction = function (o) {
  var repo = find(S.repos, o.repoId); if (!repo) return E("_", "ไม่พบ repository");
  var steps = [], out = [], tag = String(o.tag || "").trim() || "latest", P = o.principal || {}, inst = P.type === "inst" ? find(S.insts, P.id) : null;
  function fin(ok, line) { if (line) out.push(line); return { res: { ok: ok, steps: steps, out: out.join("\n"), repo: repo } }; }
  var cred = principalActions(P);
  if (P.type === "inst") {
    steps.push({ ok: !!inst && inst.state === "running", t: "เครื่องกำลังรัน", d: inst ? inst.state : "ไม่พบเครื่อง" });
    if (!inst || inst.state !== "running") return fin(false, "เครื่องไม่ได้รัน");
  }
  steps.push({ ok: !!cred, t: "มี credentials (IAM role ของเครื่อง หรือ access key ของ user)", d: cred ? "ใช้ " + cred.arn : "ไม่มี" });
  if (!cred) return fin(false, P.type === "inst" ? "Unable to locate credentials. You can configure credentials by running \"aws configure\".  (เครื่องไม่มี IAM role)" : "Unable to locate credentials.");
  if (inst) { var net = internetOut(inst); steps.push({ ok: net, t: "เครื่องออกไปหา ECR ได้ (public IP + เส้นทางออก + SG ขาออก)", d: net ? "ได้" : "ออกอินเทอร์เน็ตไม่ได้ (VPC endpoint ไม่จำลอง)" }); if (!net) return fin(false, "Could not connect to the endpoint URL: \"https://api.ecr." + REGION + ".amazonaws.com/\" (Connect timeout)"); }
  var reg = repo.uri.split("/")[0], acts = cred.acts;
  var login = allowsAction(acts, "ecr:GetAuthorizationToken");
  steps.push({ ok: login, t: "aws ecr get-login-password: ต้องมี ecr:GetAuthorizationToken", d: login ? "ได้ token (อายุ 12 ชั่วโมง)" : "ไม่มีสิทธิ์" });
  out.push("$ aws ecr get-login-password --region " + REGION + " | docker login --username AWS --password-stdin " + reg);
  if (!login) return fin(false, "An error occurred (AccessDeniedException) when calling the GetAuthorizationToken operation: User: " + cred.arn + " is not authorized to perform: ecr:GetAuthorizationToken on resource: * because no identity-based policy allows the ecr:GetAuthorizationToken action");
  out.push("Login Succeeded");
  steps.push({ ok: !o.aged, t: "token ยังไม่หมดอายุ (อายุ 12 ชั่วโมง)", d: o.aged ? "ผ่านไปเกิน 12 ชั่วโมงหลัง docker login" : "ยังใช้ได้" });
  var need = o.op === "push" ? PUSH_ACTIONS : PULL_ACTIONS, miss = need.filter(function (a) { return !allowsAction(acts, a); });
  out.push(o.op === "push" ? "$ docker push " + repo.uri + ":" + tag : "$ docker pull " + repo.uri + ":" + tag);
  if (o.aged) return fin(false, o.op === "push" ? "no basic auth credentials  (token หมดอายุ ต้อง login ใหม่ เช่นที่ ecr-refresh.timer ทำทุก 6 ชม. ใน lab)" : "Failed to pull image: authorization failed / token expired  (ใน k8s คือ ImagePullBackOff จนกว่า secret ecr-pull จะถูกต่ออายุ)");
  steps.push({ ok: !miss.length, t: (o.op === "push" ? "push" : "pull") + " ต้องมี: " + need.join(", "), d: miss.length ? "ขาด " + miss.join(", ") : "ครบ" });
  if (miss.length) return fin(false, (o.op === "push" ? "denied: " : "Error response from daemon: ") + "User: " + cred.arn + " is not authorized to perform: " + miss[0] + " on resource: arn:aws:ecr:" + REGION + ":000000000000:repository/" + repo.name + " because no identity-based policy allows the " + miss[0] + " action");
  var ex = repo.images.filter(function (x) { return x.tag === tag; })[0];
  if (o.op === "push") {
    steps.push({ ok: !(ex && !repo.mutable), t: "tag " + tag + (ex ? " มีอยู่แล้ว" : " ยังไม่มี") + " และ repo เป็น " + (repo.mutable ? "Mutable" : "Immutable"), d: ex && !repo.mutable ? "Immutable เขียนทับ tag เดิมไม่ได้" : "เขียนได้" });
    if (ex && !repo.mutable) return fin(false, "ImageTagAlreadyExistsException: The image tag '" + tag + "' already exists in the '" + repo.name + "' repository and cannot be overwritten because the repository is immutable.");
    var dg = "sha256:" + fakeId("", 64, "0123456789abcdef"); if (ex) { ex.digest = dg; ex.by = cred.name; } else repo.images.push({ tag: tag, digest: dg, by: cred.name });
    return fin(true, tag + ": digest: " + dg.slice(0, 19) + "… size: 1573  (push สำเร็จ)");
  }
  steps.push({ ok: !!ex, t: "มี image tag " + tag + " ใน repository", d: ex ? "พบ" : "ไม่พบ" });
  if (!ex) return fin(false, "Error response from daemon: manifest for " + repo.uri + ":" + tag + " not found: manifest unknown: Requested image not found");
  return fin(true, "Status: Downloaded newer image for " + repo.uri + ":" + tag + "  (pull สำเร็จ)");
};
// delete plans: what blocks a delete, what goes with it, what must be typed
function delPlan(kind, id) {
  var P = { blockers: [], removes: [], word: "", note: "", button: "Delete", done: "ลบแล้ว", crumb: "", title: "" };
  if (kind === "vpc") {
    var v = find(S.vpcs, id); if (!v) return null;
    P.title = "Delete VPC (" + vname0(v) + ")"; P.crumb = "VPC › Your VPCs › Delete VPC"; P.word = "delete"; P.done = "ลบ VPC แล้ว พร้อมของที่ผูกอยู่";
    liveInsts(v.id).forEach(function (i) { P.blockers.push("ต้อง terminate เครื่อง " + (i.name || i.id) + " ก่อน"); });
    S.albs.filter(function (a) { return a.vpcId === v.id; }).forEach(function (a) { P.blockers.push("ต้องลบ load balancer " + a.name + " ก่อน"); });
    S.subnets.filter(function (x) { return x.vpcId === v.id; }).forEach(function (x) { P.removes.push("subnet " + (x.name || x.id)); });
    S.rtbs.filter(function (x) { return x.vpcId === v.id; }).forEach(function (x) { P.removes.push("route table " + (x.main ? "main " : "") + (x.name || x.id)); });
    S.igws.filter(function (x) { return x.vpcId === v.id; }).forEach(function (x) { P.removes.push("internet gateway " + (x.name || x.id)); });
    S.sgs.filter(function (x) { return x.vpcId === v.id; }).forEach(function (x) { P.removes.push("security group " + x.name); });
    P.note = "ลบ VPC ผ่าน console จะลบ subnet, route table, internet gateway, security group ให้ด้วย (ผ่าน CLI ต้องลบทีละชิ้นเอง)";
  } else if (kind === "igw" || kind === "igw-detach") {
    var g = find(S.igws, id); if (!g) return null;
    if (kind === "igw") { P.title = "Delete internet gateway (" + nm(g) + ")"; P.crumb = "VPC › Internet gateways › Delete"; P.word = "delete"; P.button = "Delete internet gateway"; P.done = "ลบ internet gateway แล้ว"; if (g.vpcId) P.blockers.push("ยัง attach กับ VPC อยู่ ต้อง Actions → Detach from VPC ก่อน"); }
    else { P.title = "Detach from VPC (" + nm(g) + ")"; P.crumb = "VPC › Internet gateways › Detach from VPC"; P.button = "Detach internet gateway"; P.done = "Detach แล้ว"; if (!g.vpcId) P.blockers.push("ไม่ได้ attach กับ VPC ใด"); else liveInsts(g.vpcId).filter(function (i) { return i.publicIp; }).forEach(function (i) { P.blockers.push("เครื่อง " + (i.name || i.id) + " ยังมี public IP " + i.publicIp + " (VPC ที่มีของที่ผูก public IP อยู่ detach ไม่ได้)"); }); }
  } else if (kind === "sg") {
    var sg = find(S.sgs, id); if (!sg) return null;
    P.title = "Delete security group (" + sg.name + ")"; P.crumb = "VPC › Security groups › Delete security groups"; P.word = "Delete"; P.done = "ลบ security group แล้ว";
    if (sg.name === "default") P.blockers.push("ลบ default security group ไม่ได้ (Client.CannotDelete)");
    liveInsts().filter(function (i) { return i.sgIds.indexOf(sg.id) >= 0; }).forEach(function (i) { P.blockers.push("ยังถูกใช้โดยเครื่อง " + (i.name || i.id)); });
    S.albs.filter(function (a) { return a.sgIds.indexOf(sg.id) >= 0; }).forEach(function (a) { P.blockers.push("ยังถูกใช้โดย load balancer " + a.name); });
    S.sgs.filter(function (o) { return o.id !== sg.id && o.inbound.some(function (r) { return r.srcKind === "sg" && r.src === sg.id; }); }).forEach(function (o) { P.blockers.push("ถูกอ้างถึงในกฎของ security group " + o.name); });
  } else if (kind === "subnet") {
    var sn = find(S.subnets, id); if (!sn) return null;
    P.title = "Delete subnet (" + (sn.name || sn.id) + ")"; P.crumb = "VPC › Subnets › Delete subnet"; P.word = "delete"; P.button = "Delete"; P.done = "ลบ subnet แล้ว";
    liveInsts(sn.vpcId, sn.id).forEach(function (i) { P.blockers.push("ยังมีเครื่อง " + (i.name || i.id) + " ในซอยนี้"); });
    S.albs.filter(function (a) { return a.subnetIds.indexOf(sn.id) >= 0; }).forEach(function (a) { P.blockers.push("ยังถูกใช้โดย load balancer " + a.name); });
  } else if (kind === "key") {
    var k = find(S.keys, id); if (!k) return null;
    P.title = "Delete key pair (" + k.name + ")"; P.crumb = "EC2 › Key Pairs › Delete"; P.done = "ลบ key pair แล้ว";
    P.note = "ลบ key pair บน AWS ไม่กระทบเครื่องที่รันอยู่ (กุญแจสาธารณะอยู่ในเครื่องนั้นแล้ว) แต่เครื่องใหม่จะเลือกกุญแจนี้ไม่ได้";
  } else if (kind === "inst") {
    var n = find(S.insts, id); if (!n) return null;
    P.title = "Terminate (delete) instance (" + (n.name || n.id) + ")"; P.crumb = "EC2 › Instances › Terminate"; P.button = "Terminate (delete)"; P.done = "เครื่องเข้าสถานะ terminated แล้ว (จะยังเห็นในรายการอีกสักพัก)";
    P.note = "terminate คือลบถาวร กู้คืนไม่ได้ root volume ถูกลบตามค่าเริ่มต้น และ public IP ถูกคืน";
  } else if (kind === "repo") {
    var rp = find(S.repos, id); if (!rp) return null;
    P.title = "Delete " + rp.name; P.crumb = "ECR › Private repositories › Delete"; P.button = "Delete"; P.done = "ลบ repository แล้ว";
    P.note = "ลบ repository ใน console จะลบ image ทั้งหมดในนั้นด้วย กู้คืนไม่ได้ (ผ่าน Terraform/API ต้องตั้ง force_delete ถ้า repo ไม่ว่าง ข้อนี้มาจากความจำ)";
    rp.images.forEach(function (x) { P.removes.push("image " + x.tag); });
  } else if (kind === "eip") {
    var ep = find(S.eips, id); if (!ep) return null;
    P.title = "Release Elastic IP address (" + ep.ip + ")"; P.crumb = "EC2 › Elastic IPs › Release"; P.button = "Release"; P.done = "Release แล้ว";
    if (ep.instId) P.blockers.push("ยังผูกกับเครื่อง " + nm(find(S.insts, ep.instId)) + " ต้อง Disassociate ก่อน");
    P.note = "เอกสาร: Elastic IP คิดค่าใช้จ่ายทั้งตอนใช้งานและตอนว่าง (ไม่ผูกกับอะไร) ถ้าไม่ใช้แล้วให้ release";
  } else return null;
  return P;
}
function vname0(v) { return v.name || v.id; }
API.del = function (kind, id, word) {
  var P = delPlan(kind, id); if (!P) return E("_", "ไม่พบรายการ");
  if (P.blockers.length) return E("_", P.blockers.join(" · "));
  if (P.word && String(word || "").trim().toLowerCase() !== P.word.toLowerCase()) return E("confirm", "พิมพ์ " + P.word + " เพื่อยืนยัน");
  if (kind === "vpc") { S.subnets = S.subnets.filter(function (x) { return x.vpcId !== id; }); S.rtbs = S.rtbs.filter(function (x) { return x.vpcId !== id; }); S.igws = S.igws.filter(function (x) { return x.vpcId !== id; }); S.sgs = S.sgs.filter(function (x) { return x.vpcId !== id; }); S.vpcs = S.vpcs.filter(function (x) { return x.id !== id; }); }
  else if (kind === "igw") S.igws = S.igws.filter(function (x) { return x.id !== id; });
  else if (kind === "igw-detach") find(S.igws, id).vpcId = null;
  else if (kind === "sg") S.sgs = S.sgs.filter(function (x) { return x.id !== id; });
  else if (kind === "subnet") { S.subnets = S.subnets.filter(function (x) { return x.id !== id; }); S.rtbs.forEach(function (r) { r.assoc = r.assoc.filter(function (a) { return a !== id; }); }); }
  else if (kind === "key") S.keys = S.keys.filter(function (x) { return x.id !== id; });
  else if (kind === "inst") API.instState(id, "terminate");
  else if (kind === "repo") S.repos = S.repos.filter(function (x) { return x.id !== id; });
  else if (kind === "eip") S.eips = S.eips.filter(function (x) { return x.id !== id; });
  return { res: true };
};

// ---- lab checker (compares the console state with what the Terraform lab builds)
function checks() {
  var out = [];
  function add(ok, label, hint) { out.push({ ok: !!ok, label: label, hint: hint || "" }); }
  var vpc = byName(S.vpcs, "pharmacy-vpc");
  add(vpc && vpc.cidr === "10.0.0.0/16", "VPC pharmacy-vpc ช่วง 10.0.0.0/16", "VPC → Your VPCs → Create VPC");
  add(vpc && vpc.dnsHostnames, "เปิด DNS hostnames ของ VPC", "Actions → Edit VPC settings (aws_vpc: enable_dns_hostnames)");
  var s1 = byName(S.subnets, "pharmacy-public-1"), s2 = byName(S.subnets, "pharmacy-public-2");
  add(s1 && s2 && vpc && s1.vpcId === vpc.id && s2.vpcId === vpc.id && s1.cidr === "10.0.1.0/24" && s2.cidr === "10.0.2.0/24", "ซอย pharmacy-public-1 (10.0.1.0/24) และ -2 (10.0.2.0/24) ใน VPC นี้", "VPC → Subnets → Create subnet");
  add(s1 && s2 && s1.az !== s2.az, "2 ซอยอยู่คนละ Availability Zone", "ช่อง Availability Zone ตอนสร้างซอย");
  add(s1 && s2 && s1.autoIp && s2.autoIp, "ซอยทั้งสองเปิด auto-assign public IPv4", "Actions → Edit subnet settings (map_public_ip_on_launch)");
  var g = vpc && vpcIgw(vpc.id);
  add(g, "มี internet gateway attach กับ pharmacy-vpc", "Internet gateways → Create แล้ว Actions → Attach to VPC");
  var rt = S.rtbs.filter(function (r) { return vpc && r.vpcId === vpc.id && !r.main && hasIgwRoute(r); })[0];
  add(rt, "มี route table ที่มีเส้นทาง 0.0.0.0/0 → internet gateway", "Route tables → Edit routes");
  add(rt && s1 && s2 && rt.assoc.indexOf(s1.id) >= 0 && rt.assoc.indexOf(s2.id) >= 0, "route table นั้นผูกกับซอยทั้งสอง (Subnet associations)", "ถ้าขาด ซอยจะใช้ main route table ที่ไม่มีทางออกเน็ต");
  add(byName(S.keys, "pharmacy-admin"), "key pair pharmacy-admin", "EC2 → Key Pairs → Import key pair");
  ["base", "alb", "jenkins", "sonarqube", "k8s", "db"].forEach(function (n) { add(byName(S.sgs, "pharmacy-" + n), "security group pharmacy-" + n, "VPC → Security groups"); });
  var base = byName(S.sgs, "pharmacy-base");
  add(base && sgAllows([base.id], 22, { ip: S.myIp }), "pharmacy-base เปิด SSH ให้ My IP", "Inbound rules: Type SSH, Source My IP");
  var db = byName(S.sgs, "pharmacy-db"), k8s = byName(S.sgs, "pharmacy-k8s");
  add(db && k8s && sgAllows([db.id], 3306, { sgIds: [k8s.id] }) && !sgAllows([db.id], 3306, { ip: "203.0.113.50" }), "pharmacy-db รับ 3306 จาก SG ของ k8s เท่านั้น", "Source = Security group (ไม่ใช่ IP)");
  var rj = byName(S.roles, "pharmacy-jenkins"), rk = byName(S.roles, "pharmacy-k8s");
  add(rj && rj.policies.indexOf("AmazonEC2ContainerRegistryPowerUser") >= 0, "role pharmacy-jenkins ถือ ECR PowerUser", "IAM → Roles → Create role");
  add(rk && rk.policies.indexOf("AmazonEC2ContainerRegistryReadOnly") >= 0, "role pharmacy-k8s ถือ ECR ReadOnly", "");
  add(byName(S.repos, "pharmacy/frontend") && byName(S.repos, "pharmacy/backend"), "ECR repo pharmacy/frontend และ pharmacy/backend", "ECR → Create repository");
  var names = ["jenkins", "sonarqube", "k8s-1", "k8s-2", "k8s-3", "dev", "db-1", "db-2", "db-3"], have = names.filter(function (n) { return liveInsts().some(function (i) { return i.name === "pharmacy-" + n; }); });
  add(have.length === 9, "เครื่องครบ 9 เครื่อง (มี " + have.length + ")", "EC2 → Launch instance (ทำทีละเครื่อง)");
  add(liveInsts().length > 0 && liveInsts().every(function (i) { return i.tags.some(function (t) { return t.k === "Role" && t.v; }); }), "ทุกเครื่องมี tag Role (Ansible ใช้แยกบทบาท)", "Add additional tags: Key Role");
  var tp = byName(S.tgs, "pharmacy-prd"), td = byName(S.tgs, "pharmacy-dev");
  add(tp && tp.port === 30080 && tp.targets.length >= 1, "target group pharmacy-prd port 30080 มีเครื่องลงทะเบียน", "Target Groups → Create → Register targets");
  add(td && td.port === 30081, "target group pharmacy-dev port 30081", "");
  var alb = byName(S.albs, "pharmacy-alb");
  add(alb && alb.listeners.some(function (l) { return l.port === 80 && tp && l.tgId === tp.id; }) && alb.listeners.some(function (l) { return l.port === 8080 && td && l.tgId === td.id; }), "ALB pharmacy-alb: :80 → prd และ :8080 → dev", "Listeners and routing");
  add(alb && albHealth(alb).filter(function (r) { return r.ok; }).length > 0, "ALB เห็นอย่างน้อย 1 เครื่อง healthy", "SG ของ k8s ต้องเปิด 30080-30081 ให้ SG ของ ALB");
  return out;
}

// ---- console actions -> Terraform HCL
function hcl() {
  var map = {};
  function reg(list, type) { list.forEach(function (r) { map[r.id] = type + "." + slug(r.name || r.id.replace(/-/g, "_")); }); }
  var vp = S.vpcs.filter(function (v) { return !v.isDefault; }), vids = vp.map(function (v) { return v.id; });
  reg(vp, "aws_vpc");
  var sn = S.subnets.filter(function (s) { return vids.indexOf(s.vpcId) >= 0; }); reg(sn, "aws_subnet");
  var ig = S.igws.filter(function (g) { return g.vpcId && vids.indexOf(g.vpcId) >= 0; }); reg(ig, "aws_internet_gateway");
  var rt = S.rtbs.filter(function (r) { return vids.indexOf(r.vpcId) >= 0 && !r.main; }); reg(rt, "aws_route_table");
  var sg = S.sgs.filter(function (g) { return vids.indexOf(g.vpcId) >= 0 && g.name !== "default"; }); reg(sg, "aws_security_group");
  reg(S.keys, "aws_key_pair"); reg(S.roles, "aws_iam_role"); reg(S.repos, "aws_ecr_repository");
  var is = liveInsts(); is.forEach(function (i, ix) { map[i.id] = "aws_instance." + slug((i.name || "instance") + (is.filter(function (j) { return j.name === i.name; }).length > 1 ? "_" + (ix + 1) : "")); });
  reg(S.tgs, "aws_lb_target_group"); reg(S.albs, "aws_lb");
  function ref(id, attr) { return map[id] ? map[id] + "." + (attr || "id") : '"' + id + '"'; }
  function tags(t) { var a = t.filter(function (x) { return x.k; }); return a.length ? "  tags = { " + a.map(function (x) { return x.k + ' = "' + x.v + '"'; }).join(", ") + " }\n" : ""; }
  var o = [];
  vp.forEach(function (v) { o.push('resource "aws_vpc" "' + slug(v.name || v.id) + '" {\n  cidr_block = "' + v.cidr + '"\n' + (v.dnsHostnames ? "  enable_dns_hostnames = true\n" : "") + tags(v.name ? [{ k: "Name", v: v.name }] : []) + "}"); });
  sn.forEach(function (s) { o.push('resource "aws_subnet" "' + slug(s.name || s.id) + '" {\n  vpc_id            = ' + ref(s.vpcId) + '\n  cidr_block        = "' + s.cidr + '"\n  availability_zone = "' + s.az + '"\n' + (s.autoIp ? "  map_public_ip_on_launch = true\n" : "") + tags(s.name ? [{ k: "Name", v: s.name }] : []) + "}"); });
  ig.forEach(function (g) { o.push('resource "aws_internet_gateway" "' + slug(g.name || g.id) + '" {\n  vpc_id = ' + ref(g.vpcId) + "\n}"); });
  rt.forEach(function (r) {
    var rs = r.routes.map(function (x) { return '  route {\n    cidr_block = "' + x.dest + '"\n    gateway_id = ' + ref(x.target) + "\n  }\n"; }).join("");
    o.push('resource "aws_route_table" "' + slug(r.name || r.id) + '" {\n  vpc_id = ' + ref(r.vpcId) + "\n" + rs + "}");
    r.assoc.forEach(function (sid) { o.push('resource "aws_route_table_association" "' + slug(nm(r) + "_" + nm(find(S.subnets, sid))) + '" {\n  subnet_id      = ' + ref(sid) + "\n  route_table_id = " + ref(r.id) + "\n}"); });
  });
  sg.forEach(function (g) {
    var ing = g.inbound.map(function (r) { return "  ingress {\n    from_port = " + r.from + "\n    to_port   = " + r.to + '\n    protocol  = "' + r.proto + '"\n    ' + (r.srcKind === "sg" ? (r.src === g.id ? "self = true" : "security_groups = [" + ref(r.src) + "]") : 'cidr_blocks = ["' + r.src + '"]') + "\n  }\n"; }).join("");
    o.push('resource "aws_security_group" "' + slug(g.name) + '" {\n  name        = "' + g.name + '"\n  description = "' + g.desc + '"\n  vpc_id      = ' + ref(g.vpcId) + "\n" + ing + "}");
  });
  S.keys.forEach(function (k) { if (k.imported) o.push('resource "aws_key_pair" "' + slug(k.name) + '" {\n  key_name   = "' + k.name + '"\n  public_key = file("~/.ssh/' + k.name + '.pub")\n}'); });
  S.roles.forEach(function (r) {
    o.push('resource "aws_iam_role" "' + slug(r.name) + '" {\n  name               = "' + r.name + '"\n  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json   # console เขียน trust policy ให้เอง ต้องเขียนเองใน Terraform\n}');
    r.policies.forEach(function (p) { o.push('resource "aws_iam_role_policy_attachment" "' + slug(r.name + "_" + p) + '" {\n  role       = ' + ref(r.id, "name") + '\n  policy_arn = "arn:aws:iam::aws:policy/' + p + '"\n}'); });
    o.push('resource "aws_iam_instance_profile" "' + slug(r.name) + '" {   # console สร้างให้อัตโนมัติ\n  name = "' + r.name + '"\n  role = ' + ref(r.id, "name") + "\n}");
  });
  S.repos.forEach(function (r) { o.push('resource "aws_ecr_repository" "' + slug(r.name) + '" {\n  name = "' + r.name + '"\n}'); });
  is.forEach(function (i) {
    o.push('resource "aws_instance" "' + map[i.id].split(".")[1] + '" {\n  ami           = "' + i.ami + '"\n  instance_type = "' + i.type + '"\n  subnet_id     = ' + ref(i.subnetId) + "\n" + (i.keyName ? '  key_name      = "' + i.keyName + '"\n' : "") + "  vpc_security_group_ids = [" + i.sgIds.map(function (id) { return ref(id); }).join(", ") + "]\n" + (i.profile ? '  iam_instance_profile   = "' + i.profile + '"\n' : "") + "  metadata_options {\n    http_tokens                 = \"" + i.imds.tokens + '"\n    http_put_response_hop_limit = ' + i.imds.hop + "\n  }\n  root_block_device {\n    volume_size = " + i.disk.size + '\n    volume_type = "' + i.disk.type + '"\n  }\n' + tags((i.name ? [{ k: "Name", v: i.name }] : []).concat(i.tags)) + "}");
  });
  S.tgs.forEach(function (t) {
    o.push('resource "aws_lb_target_group" "' + slug(t.name) + '" {\n  port     = ' + t.port + '\n  protocol = "' + t.proto + '"\n  vpc_id   = ' + ref(t.vpcId) + '\n  health_check { path = "' + t.hcPath + '" }\n}');
    t.targets.forEach(function (x) { o.push('resource "aws_lb_target_group_attachment" "' + slug(t.name + "_" + (find(S.insts, x.instId) || {}).name) + '" {\n  target_group_arn = ' + ref(t.id, "arn") + "\n  target_id        = " + ref(x.instId) + "\n  port             = " + x.port + "\n}"); });
  });
  S.albs.forEach(function (a) {
    o.push('resource "aws_lb" "' + slug(a.name) + '" {\n  name               = "' + a.name + '"\n  load_balancer_type = "application"\n  internal           = ' + (a.scheme === "Internal") + "\n  security_groups    = [" + a.sgIds.map(function (id) { return ref(id); }).join(", ") + "]\n  subnets            = [" + a.subnetIds.map(function (id) { return ref(id); }).join(", ") + "]\n}");
    a.listeners.forEach(function (l) { o.push('resource "aws_lb_listener" "' + slug(a.name + "_" + l.port) + '" {\n  load_balancer_arn = ' + ref(a.id, "arn") + "\n  port              = " + l.port + '\n  protocol          = "HTTP"\n  default_action {\n    type             = "forward"\n    target_group_arn = ' + ref(l.tgId, "arn") + "\n  }\n}"); });
  });
  return o.length ? o.join("\n\n") : "# ยังไม่มีอะไรให้แปลง ลองสร้าง VPC หรือกดโหลดตัวอย่างในแท็บ 'ตัวอย่างสำเร็จรูป'";
}

// ---- scenarios: rebuild the Terraform lab through the same API a human click would use
function buildLab(kind) {
  fresh();
  function ok(r) { if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.res; }
  var v = ok(API.createVpc({ name: "pharmacy-vpc", cidr: "10.0.0.0/16", dns: true }));
  var sn = ok(API.createSubnet({ vpcId: v.id, list: [{ name: "pharmacy-public-1", az: AZS[0], cidr: "10.0.1.0/24" }, { name: "pharmacy-public-2", az: AZS[1], cidr: "10.0.2.0/24" }] }));
  sn.forEach(function (s) { API.setAutoIp(s.id, true); });
  var g = ok(API.createIgw({ name: "pharmacy-igw" })); ok(API.attachIgw(g.id, v.id));
  var rt = ok(API.createRtb({ name: "pharmacy-public", vpcId: v.id }));
  ok(API.setRoutes(rt.id, [{ dest: "0.0.0.0/0", target: g.id }]));
  if (kind !== "noassoc") ok(API.setAssoc(rt.id, sn.map(function (s) { return s.id; })));
  ok(API.importKey({ name: "pharmacy-admin", pub: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDEMO demo@lab" }));
  var sgn = {}; ["base", "alb", "jenkins", "sonarqube", "k8s", "db"].forEach(function (n) { sgn[n] = ok(API.createSg({ name: "pharmacy-" + n, desc: "pharmacy " + n, vpcId: v.id, rows: [] })); });
  var me = kind === "wrongip" ? { type: "SSH", srcKind: "Custom", src: "203.0.113.99/32" } : { type: "SSH", srcKind: "My IP" };
  function R(type, port, kindS, src) { return { type: type, port: port, srcKind: kindS, src: src }; }
  ok(API.setInbound(sgn.base.id, [me]));
  ok(API.setInbound(sgn.alb.id, [R("HTTP", "", "Anywhere-IPv4"), R("Custom TCP", "8080", "My IP")]));
  ok(API.setInbound(sgn.jenkins.id, [R("Custom TCP", "8080", "My IP")]));
  ok(API.setInbound(sgn.sonarqube.id, [R("Custom TCP", "9000", "My IP"), R("Custom TCP", "9000", "Security group", sgn.jenkins.id)]));
  ok(API.setInbound(sgn.k8s.id, [R("All traffic", "", "Security group", sgn.k8s.id), R("Custom TCP", "30080-30081", "Security group", sgn.alb.id), R("Custom TCP", "30443", "My IP"), R("Custom TCP", "30443", "Security group", sgn.jenkins.id)]));
  ok(API.setInbound(sgn.db.id, [R("All traffic", "", "Security group", sgn.db.id), R("MYSQL/Aurora", "", "Security group", sgn.k8s.id)]));
  ok(API.createRole({ name: "pharmacy-jenkins", entity: "AWS service", usecase: "EC2", policies: ["AmazonEC2ContainerRegistryPowerUser"] }));
  ok(API.createRole({ name: "pharmacy-k8s", entity: "AWS service", usecase: "EC2", policies: ["AmazonEC2ContainerRegistryReadOnly"] }));
  ok(API.createRepo({ name: "pharmacy/frontend" })); ok(API.createRepo({ name: "pharmacy/backend" }));
  function L(name, role, sgs, sub, prof) { return ok(API.launch({ name: "pharmacy-" + name, tags: [{ k: "Role", v: role }], ami: "ami-ubuntu2404", type: "t3.medium", keyName: "pharmacy-admin", vpcId: v.id, subnetId: sub.id, autoIp: "Enable", sgIds: sgs.map(function (x) { return x.id; }), diskSize: 30, diskType: "gp3", profile: prof || "", tokens: "required", hop: 2, count: 1 }))[0]; }
  L("jenkins", "jenkins", [sgn.base, sgn.jenkins], sn[0], "pharmacy-jenkins"); L("sonarqube", "sonarqube", [sgn.base, sgn.sonarqube], sn[0]);
  var k1 = L("k8s-1", "k8s_server", [sgn.base, sgn.k8s], sn[0], "pharmacy-k8s"), k2 = L("k8s-2", "k8s_agent", [sgn.base, sgn.k8s], sn[1], "pharmacy-k8s"), k3 = L("k8s-3", "k8s_agent", [sgn.base, sgn.k8s], sn[0], "pharmacy-k8s");
  var dv = L("dev", "k8s_dev", [sgn.base, sgn.k8s], sn[0], "pharmacy-k8s");
  L("db-1", "db", [sgn.base, sgn.db], sn[0]); L("db-2", "db", [sgn.base, sgn.db], sn[1]); L("db-3", "db", [sgn.base, sgn.db], sn[0]);
  var tp = ok(API.createTg({ name: "pharmacy-prd", port: 30080, vpcId: v.id, hcPath: "/", targets: [k1, k2, k3].map(function (x) { return { instId: x.id, port: 30080 }; }) }));
  var td = ok(API.createTg({ name: "pharmacy-dev", port: 30081, vpcId: v.id, hcPath: "/", targets: [{ instId: dv.id, port: 30081 }] }));
  if (kind === "ecr") S.repos.forEach(function (rp) { ok(API.ecrAction({ repoId: rp.id, principal: { type: "inst", id: S.insts.filter(function (i) { return i.name === "pharmacy-jenkins"; })[0].id }, op: "push", tag: "v1.0.0" })); });
  ok(API.createAlb({ name: "pharmacy-alb", scheme: "Internet-facing", vpcId: v.id, subnetIds: sn.map(function (s) { return s.id; }), sgIds: [sgn.alb.id], listeners: [{ port: 80, tgId: tp.id }, { port: 8080, tgId: td.id }] }));
}
var RULES = [
 ["VPC: ขนาด IPv4 CIDR ระหว่าง /16 ถึง /28; ห้ามใช้ 0.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, 224.0.0.0/4", 1],
 ["VPC/Subnet: CIDR ที่มี bit ของ host ติด (เช่น 10.0.0.5/16) CLI/API ปรับให้เป็นรูปมาตรฐานเอง แต่พฤติกรรมของ console เอกสารไม่ได้บอก (หน้านี้จำลองเป็น error)", 0],
 ["Subnet: CIDR ต้องมาจากช่วงของ VPC", 1],
 ["Subnet: ขนาด /16-/28 (ใช้ช่วงเดียวกับ VPC) และซอยใน VPC เดียวกันซ้อนทับกันไม่ได้", 0],
 ["Subnet ที่ไม่ใช่ default: auto-assign public IPv4 เริ่มเป็น false (default subnet เป็น true; ซอยที่ wizard ของ EC2 สร้างให้เป็น true)", 1],
 ["Subnet ที่สร้างใหม่ผูกกับ main route table ของ VPC อัตโนมัติ ซอยที่มีเส้นทางตรงไป internet gateway คือ public subnet", 1],
 ["ถ้าไม่เลือก Availability Zone ตอนสร้างซอย AWS เลือกให้ (จำลองเลือกอันที่มีซอยน้อยสุด)", 1],
 ["VPC ใหม่มี main route table และ default security group มาให้", 1],
 ["DNS: enableDnsHostnames เริ่มเป็น false ยกเว้น default VPC, enableDnsSupport เริ่มเป็น true; VPC and more เปิดทั้งสอง; เครื่องมี public DNS hostname เมื่อเปิดทั้งสองและมี public IP", 1],
 ["Internet gateway: Attach ได้เฉพาะ VPC ที่ว่าง, ลบไม่ได้ถ้ายัง attach, detach ไม่ได้ถ้า VPC มีของที่ผูก public IP", 1],
 ["Internet gateway: 1 VPC ต่อได้ 1 ตัว", 0],
 ["Route table: internet gateway ต้อง attach กับ VPC เดียวกัน และ destination ซ้ำกันไม่ได้", 0],
 ["Security group: ชื่อและ description ไม่เกิน 255 ตัว อักขระที่ใช้ได้ a-z A-Z 0-9 ช่องว่าง ._-:/()#,@[]+=&;{}!$* ชื่อห้ามขึ้นต้น sg- ซ้ำกันใน VPC เดียวกันไม่ได้ (ไม่แยกตัวพิมพ์) ช่องว่างท้ายชื่อถูกตัด", 1],
 ["Security group ใหม่ไม่มีกฎขาเข้า และมีกฎขาออกที่ปล่อยทุกอย่าง", 1],
 ["Default security group: ขาเข้าอนุญาตจาก SG ตัวเอง ขาออกปล่อยทั้งหมด แก้กฎได้ ลบไม่ได้ (Client.CannotDelete); เครื่องที่ไม่ได้ระบุ SG ได้ตัวนี้", 1],
 ["กฎ SG อ้างถึง SG อื่นได้เฉพาะ SG ใน VPC เดียวกัน (หรือ VPC ที่ peer กัน)", 1],
 ["ลบ SG ไม่ได้ถ้ายังถูกใช้กับ resource, ถูกอ้างถึงในกฎของ SG อื่น หรือเป็น default; ยืนยันด้วยการพิมพ์ Delete", 1],
 ["ชื่อ Type (SSH, HTTP, HTTPS, MYSQL/Aurora, Custom TCP, All traffic) และ Source (Custom, Anywhere-IPv4, My IP, Security group) ในฟอร์มกฎ SG", 0],
 ["Key pair: ชื่อ ASCII ไม่เกิน 255 ตัว ไม่มีช่องว่างหน้า/หลัง; รับ RSA และ ED25519 ไม่รับ DSA", 1],
 ["ลบ key pair ไม่กระทบเครื่องที่รันอยู่แล้ว", 0],
 ["IAM: สร้าง role สำหรับ EC2 ใน console ได้ instance profile ชื่อเดียวกันให้อัตโนมัติ; ชื่อ role ซ้ำกันไม่ได้แม้ต่างกันแค่ตัวพิมพ์", 1],
 ["IAM: ชื่อ role ยาวไม่เกิน 64 ตัว และอักขระที่ใช้ได้", 0],
 ["ECR: ชื่อขึ้นต้นด้วยตัวอักษร ใช้ตัวพิมพ์เล็ก ตัวเลข - _ . / ห้าม //", 1],
 ["EC2 wizard: VPC เริ่มต้นเป็น default VPC และใน default subnet เครื่องได้ public IP เป็นค่าเริ่มต้น (nondefault subnet เริ่มเป็น Disable ถ้าซอยไม่ได้ตั้ง; หน้านี้ใช้ค่าของซอยเป็นค่าเริ่มต้น และ override ได้ตอนเปิดเครื่อง)", 0],
 ["EC2: สร้าง security group ใหม่ใน wizard จะมีกฎ SSH จากทุก IP ให้อัตโนมัติ", 1],
 ["EC2: บัญชีที่สร้างตั้งแต่ 15 ก.ค. 2025 ใช้ฟรีเฉพาะ t3.micro, t3.small, t4g.micro, t4g.small, c7i-flex.large, m7i-flex.large (หน้านี้แค่เตือน ไม่บล็อก)", 1],
 ["EC2 สถานะ: pending, running, stopping, stopped, shutting-down, terminated; stop แล้ว public IPv4 ถูกคืน start ใหม่ได้ IP ใหม่ (private IP คงเดิม); reboot ไม่เปลี่ยน IP; terminated ยังเห็นในรายการสักพัก", 1],
 ["ECR: ต้องขอ token ด้วย ecr:GetAuthorizationToken (token อายุ 12 ชั่วโมง) แล้ว docker login --username AWS; push ต้องมี InitiateLayerUpload, UploadLayerPart, CompleteLayerUpload, BatchCheckLayerAvailability, PutImage, BatchGetImage; policy PowerUser (อ่าน+เขียน ไม่ลบ repo) และ ReadOnly (ดู+pull) ใช้รายการ action จริงจากเอกสาร", 1],
 ["ECR: repo แบบ Immutable push tag ซ้ำได้ ImageTagAlreadyExistsException; ลบ repo ใน console ลบ image ทั้งหมดด้วย", 1],
 ["ECR: ข้อความ error ของ docker/aws cli (denied, no basic auth credentials, manifest unknown, Unable to locate credentials) และ force_delete ของ Terraform", 0],
 ["Terraform: init ก่อน plan, plan/apply แสดง diff แบบ + ~ -/+ -, error ของ provider ใช้ข้อความรูปแบบ AWS (UnauthorizedOperation, InvalidParameterValue ฯลฯ) — รูปแบบ output จำลองจากความจำ ไม่ใช่ binary จริง", 0],
  ["Ansible dynamic inventory: กรอง tag Project=pharmacy + running, กลุ่ม role_<Role>, ชื่อโฮสต์จาก tag Name, ansible_host = public IP (ตาม inventory/aws_ec2.yml ของ repo)", 1],
  ["Ansible ผลของแต่ละ task (changed/ok, UNREACHABLE จาก SG/route/key, ต้องมีทางออกเน็ตสำหรับ apt/curl/docker, ECR refresh ต้องมีสิทธิ์) เป็นกฎที่เขียนเองตามชื่อ task ไม่ใช่การรันจริง", 0],
  ["บัญชี suspended: ทุกคำสั่ง AWS CLI / Terraform / Ansible inventory ล้มเหลวด้วย AuthFailure (ข้อความจำลองจากความจำ)", 0],
  ["IAM access key: user ละ 2 ชุด, ลบต้อง Deactivate ก่อน, secret ดูได้ครั้งเดียว (Show / Download .csv file)", 1],
 ["IAM: ชื่อ use case ใน Create access key, กล่องยืนยันของ CLI, ขั้นตอนและชื่อช่องของ Create user", 0],
 ["IAM policy JSON ของ AmazonEC2ContainerRegistryPowerUser, ReadOnly และ AmazonSSMManagedInstanceCore ตรงเอกสาร; S3ReadOnly และ CloudWatchAgent ยังไม่ได้ตรวจเนื้อหา", 1],
 ["EC2 Modify IAM role: เครื่องหนึ่งมี 1 role, attach ได้ตอน running/stopped, replace ต้อง running, ถอดพิมพ์ Detach", 1],
 ["EC2 เปลี่ยน instance type ต้อง stop ก่อน (Actions → Instance settings → Change instance type); stop/start แล้ว public IP เปลี่ยนยกเว้นมี Elastic IP", 1],
 ["Elastic IP: Allocate / Associate (Resource type: Instance) / Disassociate; ผูกแล้วแทน public IP อัตโนมัติ, คงอยู่ตอน stop/start, หลุดตอน terminate, คิดเงินทั้งตอนผูกและตอนว่าง", 1],
 ["Elastic IP: การ reassociate ที่ผูกกับเครื่องอื่นอยู่, ชื่อปุ่ม Release, ตาราง Instance Types (vCPU/RAM) และหน้า Volumes", 0],
 ["เมนูและแท็บที่ยืนยันกับเอกสาร: EC2 › Network & Security › Key Pairs, Load Balancing › Load Balancers / Target Groups, VPC › Your VPCs / Subnets / Route tables / Internet gateways / Security groups; แท็บ Resource map (ซอย public สีเขียว private สีฟ้า), Routes, Subnet associations (Explicit / Subnets without explicit associations), Edge associations, Targets", 1],
 ["เมนูซ้ายส่วนที่เหลือ (Instance Types, Volumes, NAT gateways, Network ACLs ฯลฯ), ชื่อแท็บของ instance / SG / ALB / IAM, ช่องค้นหา, ติ๊กเลือกแถว, แผง Summary ของ Launch และชื่อแท็บในหน้า Connect มาจากความจำ ยังไม่ยืนยัน", 0],
 ["Connect: มีวิธี SSH client, EC2 Instance Connect, Session Manager; Session Manager ไม่ต้องมีกฎขาเข้าและไม่ต้องมี key pair แต่ต้องมี instance profile role", 1],
 ["Session Manager: ชื่อ policy AmazonEC2... SSM และเงื่อนไขทางออกเน็ตของ SSM Agent", 0],
 ["ลบ VPC ใน console: ต้อง terminate เครื่องและลบ load balancer ก่อน แล้ว console ลบ subnet, route table, internet gateway, security group ให้ (พิมพ์ delete ยืนยัน)", 1],
 ["ลบ subnet ไม่ได้ถ้ายังมีเครื่องหรือ load balancer ใช้อยู่", 0],
 ["ALB: ชื่อ ≤32 ตัว ตัวอักษร ตัวเลข - ห้ามขึ้นต้น/ลงท้ายด้วย - (ALB ห้ามขึ้นต้น internal-); ต้องเลือก subnet จาก ≥2 AZ; Internet-facing เลือกได้เฉพาะ VPC ที่มี internet gateway", 1],
 ["Target group: ชื่อ ≤32 ตัว; health check ค่าเริ่มต้น HTTP, path /, interval 30s, timeout 5s, healthy 5, unhealthy 2, success code 200; path ต้องเป็น URI ที่ขึ้นต้น /", 1],
 ["Target health: initial, healthy, unhealthy, unused, draining และ reason code เช่น Target.InvalidState, Target.NotInUse, Target.Timeout; ถ้าทุก target ใน group ไม่ healthy ALB จะ fail open", 1],
 ["listener ต้องชี้ target group ใน VPC เดียวกับ ALB", 0],
 ["จำลอง health: เครื่อง running ใน AZ ที่ ALB เปิด และ SG เปิด port ให้ SG ของ ALB = healthy (สมมติแอปตอบ 200); SG ไม่เปิด = Target.Timeout", 0],
 ["เชื่อมต่อ SSH: ต้องมี public IP + route ออก internet gateway + SG เปิด 22 + กุญแจตรง (timeout = เครือข่าย, Permission denied = กุญแจ)", 0]
];
fresh();
