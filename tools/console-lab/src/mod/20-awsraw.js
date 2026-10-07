// ===== AWS แบบ "ระดับ API" ที่ Terraform ใช้ (ไม่มีการตรวจแบบฟอร์มของ console) =====
// ต่างจาก console: SG ที่สร้างผ่าน API/Terraform ไม่มีกฎขาออกให้เอง, IAM role ไม่มี instance profile ให้เอง
var ACCOUNT = "000000000000";
function arnOf(kind, id, name) {
  var m = { vpc: "ec2:vpc", subnet: "ec2:subnet", sg: "ec2:security-group", rtb: "ec2:route-table", igw: "ec2:internet-gateway", inst: "ec2:instance", key: "ec2:key-pair" };
  if (kind === "role") return "arn:aws:iam::" + ACCOUNT + ":role/" + name;
  if (kind === "profile") return "arn:aws:iam::" + ACCOUNT + ":instance-profile/" + name;
  if (kind === "repo") return "arn:aws:ecr:" + REGION + ":" + ACCOUNT + ":repository/" + name;
  if (kind === "alb") return "arn:aws:elasticloadbalancing:" + REGION + ":" + ACCOUNT + ":loadbalancer/app/" + name + "/" + id.slice(-16);
  if (kind === "tg") return "arn:aws:elasticloadbalancing:" + REGION + ":" + ACCOUNT + ":targetgroup/" + name + "/" + id.slice(-16);
  return "arn:aws:" + m[kind] .split(":")[0] + ":" + REGION + ":" + ACCOUNT + ":" + m[kind].split(":")[1] + "/" + id;
}
function setTags(r, tagMap) { r.tagMap = Object.assign({}, tagMap || {}); if (tagMap && tagMap.Name !== undefined) r.name = tagMap.Name; }
API.createSgRaw = function (o) {
  var r = API.createSg({ name: o.name, desc: o.desc, vpcId: o.vpcId, rows: [] }); if (r.errors) return r;
  var g = r.res; g.outbound = []; // API/Terraform: ไม่มี egress ให้ ต่างจาก console
  return { res: g };
};
API.createRoleRaw = function (o) {
  var n = o.name || "";
  if (!n) return E("name", "ต้องมีชื่อ role"); if (n.length > 64) return E("name", "ชื่อ role ยาวเกิน 64 ตัว");
  if (S.roles.some(function (r) { return r.name.toLowerCase() === n.toLowerCase(); })) return E("name", "EntityAlreadyExists: Role with name " + n + " already exists.");
  var trust = null; try { trust = JSON.parse(o.trust); } catch (e) { return E("trust", "MalformedPolicyDocument: Syntax errors in policy."); }
  var r = { id: rid("role"), name: n, desc: o.desc || "", policies: [], profile: "", trust: trust }; S.roles.push(r); return { res: r };
};
API.createAlbRaw = function (o) {
  var v = find(S.vpcs, o.vpcId), er = {}, m = lbName(o.name, "alb");
  if (m) er.name = m; else if (byName(S.albs, o.name)) er.name = "DuplicateLoadBalancerName: A load balancer with the same name '" + o.name + "' exists, but with different settings";
  var sns = (o.subnetIds || []).map(function (id) { return find(S.subnets, id); }).filter(Boolean), azs = {}; sns.forEach(function (x) { azs[x.az] = 1; });
  if (Object.keys(azs).length < 2) er.subnets = "ValidationError: At least two subnets in two different Availability Zones must be specified";
  if (!o.internal && v && !vpcIgw(v.id)) er.vpc = "InvalidSubnet: VPC " + v.id + " has no internet gateway";
  if (Object.keys(er).length) return { errors: er };
  var a = { id: rid("alb"), name: o.name, scheme: o.internal ? "Internal" : "Internet-facing", vpcId: sns[0].vpcId, subnetIds: sns.map(function (x) { return x.id; }), sgIds: (o.sgIds || []).slice(), listeners: [], dns: o.name + "-" + String(Math.floor(Math.random() * 9e8 + 1e8)) + "." + REGION + ".elb.lab.invalid" };
  S.albs.push(a); return { res: a };
};
function tfSgFlat(blocks, selfId) {
  var out = [];
  (blocks || []).forEach(function (b) {
    var proto = String(b.protocol === undefined ? "tcp" : b.protocol); if (proto === "6") proto = "tcp"; if (proto === "-1" || proto === "all") proto = "-1";
    var from = proto === "-1" ? 0 : +b.from_port, to = proto === "-1" ? 65535 : +b.to_port;
    (b.cidr_blocks || []).forEach(function (c) { out.push({ proto: proto, from: from, to: to, srcKind: "cidr", src: c }); });
    (b.security_groups || []).forEach(function (g) { out.push({ proto: proto, from: from, to: to, srcKind: "sg", src: g }); });
    if (b.self) out.push({ proto: proto, from: from, to: to, srcKind: "sg", src: selfId });
  });
  return out;
}
function fpr(n) { var x = 0, o = []; for (var i = 0; i < 20; i++) { x = (x * 31 + n.charCodeAt(i % n.length) + i * 7) % 256; o.push(("0" + x.toString(16)).slice(-2)); } return o.join(":"); }
function sgKey(r) { return [r.proto, r.from, r.to, r.srcKind, r.src].join("|"); }
