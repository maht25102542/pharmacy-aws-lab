// ===== ระบบแบบ managed จำลอง: EKS / RDS / Auto Scaling / SSM  (state + API + Terraform provider) =====
// ใช้กับโค้ดใน terraform-managed/ · ตรวจกติกาหลักเท่าที่รู้จากเอกสาร AWS (ไม่ใช่ทุกกรณี)
var EKS_VERS = ["1.31", "1.30", "1.29"];
var RDS_ENGINES = { mariadb: ["10.11", "10.6"], mysql: ["8.0"], postgres: ["16", "15"] };
var RDS_CLASSES = ["db.t4g.micro", "db.t4g.small", "db.t4g.medium", "db.t3.micro", "db.t3.small", "db.m6g.large"];

function mgArn(svc, kind, name) { return "arn:aws:" + svc + ":" + REGION + ":" + ACCOUNT + ":" + kind + "/" + name; }
function roleByRef(ref) { var n = String(ref || "").split("/").pop(); return S.roles.filter(function (r) { return r.name === n; })[0] || null; }
// role เชื่อใจ service ไหน: role จาก Terraform มี trust จริง · role จาก console (use case EC2) เชื่อใจ EC2
function roleTrusts(r, svc) { return !!r && (r.trust ? JSON.stringify(r.trust).indexOf(svc) >= 0 : (r.trustSvc || "ec2.amazonaws.com") === svc); }
function roleLacks(r, need) { return need.filter(function (p) { return !r || r.policies.indexOf(p) < 0; }); }
// ซอยนี้ออกเน็ตได้ไหม (node ต้องออกไปหา EKS/ECR/SSM): ผ่าน NAT หรือ public IP + IGW
function subnetOut(sn) { var rt = subnetRtb(sn); return !!sn && (natRoute(rt) || (hasIgwRoute(rt) && !!sn.autoIp)); }
function mgHex(n) { return fakeId("", n, "0123456789abcdef"); }
function azsOf(subnetIds) { var o = {}; subnetIds.forEach(function (id) { var s = find(S.subnets, id); if (s) o[s.az] = 1; }); return Object.keys(o); }
function mgErr(code, msg) { return code + ": " + msg; }
function mgInstRole(i) { return i.nodeRole ? S.roles.filter(function (r) { return r.name === i.nodeRole; })[0] || null : (i.profile ? S.roles.filter(function (r) { return r.profile === i.profile; })[0] || null : null); }

// ---------- EKS ----------
API.createEks = function (o) {
  var er = {}, n = String(o.name || "");
  if (!n) er.name = "ต้องกรอกชื่อ cluster"; else if (!/^[0-9A-Za-z][A-Za-z0-9\-_]*$/.test(n) || n.length > 100) er.name = "InvalidParameterException: Cluster name ใช้ได้เฉพาะตัวอักษร ตัวเลข - _ (ขึ้นต้นด้วยตัวอักษร/ตัวเลข ไม่เกิน 100 ตัว)";
  else if (byName(S.eks, n)) er.name = "ResourceInUseException: Cluster already exists with name: " + n;
  var role = roleByRef(o.roleArn);
  if (!role || !roleTrusts(role, "eks.amazonaws.com")) er.roleArn = "InvalidParameterException: Role with arn: " + (o.roleArn || "(ไม่ได้เลือก)") + " could not be assumed because it does not exist or the trust policy that is attached to it does not trust EKS (eks.amazonaws.com)";
  else if (roleLacks(role, ["AmazonEKSClusterPolicy"]).length) er.roleArn = "InvalidParameterException: role " + role.name + " ต้องมี policy AmazonEKSClusterPolicy";
  var sns = (o.subnetIds || []).map(function (id) { return find(S.subnets, id); }).filter(Boolean);
  if (azsOf(sns.map(function (s) { return s.id; })).length < 2) er.subnetIds = "InvalidParameterException: Subnets specified must be in at least two different AZs";
  else if (sns.some(function (s) { return s.vpcId !== sns[0].vpcId; })) er.subnetIds = "InvalidParameterException: Subnets ต้องอยู่ใน VPC เดียวกัน";
  var pub = o.pub !== false, priv = !!o.priv, cidrs = (o.cidrs || []).filter(Boolean);
  if (!pub && !priv) er.pub = "InvalidParameterException: ต้องเปิด endpoint อย่างน้อยหนึ่งแบบ (public หรือ private)";
  cidrs.forEach(function (c) { if (!parseCidr(c)) er.cidrs = "InvalidParameterException: CIDR ไม่ถูกต้อง: " + c; });
  var ver = o.version || EKS_VERS[0]; if (EKS_VERS.indexOf(ver) < 0) er.version = "InvalidParameterException: เวอร์ชัน " + ver + " ไม่รองรับในตัวจำลอง (" + EKS_VERS.join(", ") + ")";
  if (Object.keys(er).length) return { errors: er };
  var sg = API.createSgRaw({ name: "eks-cluster-sg-" + n + "-" + (1000000000 + Math.floor(Math.random() * 8999999999)), desc: "EKS created security group applied to ENI that is attached to EKS Control Plane master nodes, as well as any managed workloads.", vpcId: sns[0].vpcId }).res;
  sg.inbound = [{ proto: "-1", from: 0, to: 65535, srcKind: "sg", src: sg.id, desc: "" }]; sg.outbound = [{ proto: "-1", from: 0, to: 65535, srcKind: "cidr", src: "0.0.0.0/0" }];
  var c = { id: n, name: n, version: ver, roleArn: role.name, vpcId: sns[0].vpcId, subnetIds: sns.map(function (s) { return s.id; }), sgId: sg.id, pub: pub, priv: priv, cidrs: cidrs.length ? cidrs : ["0.0.0.0/0"], state: "ACTIVE", endpoint: "https://" + mgHex(32).toUpperCase() + ".gr7." + REGION + ".eks.amazonaws.com", authMode: o.authMode || "API", born: Date.now(), tagMap: {} };
  S.eks.push(c); return { res: c };
};
API.deleteEks = function (name) {
  var c = byName(S.eks, name); if (!c) return E("_", "ResourceNotFoundException: No cluster found for name: " + name);
  if (S.ngs.some(function (g) { return g.cluster === name; })) return E("_", "ResourceInUseException: Cluster has nodegroups attached");
  S.sgs = S.sgs.filter(function (g) { return g.id !== c.sgId; }); S.eks = S.eks.filter(function (x) { return x !== c; }); return { res: true };
};
API.createNodegroup = function (o) {
  var er = {}, c = byName(S.eks, o.cluster), n = String(o.name || "");
  if (!c) er.cluster = "ResourceNotFoundException: No cluster found for name: " + (o.cluster || ""); else if (eksPhase(c) !== "ACTIVE") er.cluster = "ResourceInUseException: Cluster '" + c.name + "' is not in ACTIVE state (โหมดเหมือนจริง: EKS ใช้ ~9 นาทีสร้าง control plane) [ข้อความนี้ตัวจำลองเขียนเอง: ถ้อยคำจริงของ AWS ไม่ทราบ]";
  if (!n) er.name = "ต้องกรอกชื่อ node group"; else if (!/^[0-9A-Za-z][A-Za-z0-9\-_]*$/.test(n) || n.length > 63) er.name = "InvalidParameterException: ชื่อ node group ใช้ได้เฉพาะตัวอักษร ตัวเลข - _ ไม่เกิน 63 ตัว";
  else if (c && S.ngs.some(function (g) { return g.cluster === c.name && g.name === n; })) er.name = "ResourceInUseException: NodeGroup already exists with name " + n + " and cluster name " + c.name;
  var role = roleByRef(o.roleArn), sns = (o.subnetIds || []).map(function (id) { return find(S.subnets, id); }).filter(Boolean);
  var d = +o.desired, mn = +o.min, mx = +o.max;
  if (!(mn >= 0 && mx >= 1 && mn <= mx && d >= mn && d <= mx)) er.scaling = "InvalidParameterException: ต้อง min ≤ desired ≤ max และ max ≥ 1";
  if (!sns.length) er.subnetIds = "InvalidParameterException: ต้องเลือก subnet"; else if (c && sns.some(function (s) { return s.vpcId !== c.vpcId; })) er.subnetIds = "InvalidParameterException: subnet ต้องอยู่ใน VPC เดียวกับ cluster";
  var types = (o.types && o.types.length ? o.types : ["t3.medium"]);
  if (types.some(function (t) { return VCPU[t] === undefined; })) er.types = "InvalidParameterException: instance type ไม่รู้จัก";
  if (Object.keys(er).length) return { errors: er };
  // ข้อผิดพลาดจริงที่เจอบ่อย: node สร้างได้แต่ไม่ join cluster → NodeCreationFailure (AWS รอ ~20 นาทีแล้วจึง fail)
  var why = [];
  if (!role || !roleTrusts(role, "ec2.amazonaws.com")) why.push("InvalidParameterException: role " + (o.roleArn || "") + " ต้องเชื่อใจ ec2.amazonaws.com");
  else {
    var lack = roleLacks(role, ["AmazonEKSWorkerNodePolicy", "AmazonEKS_CNI_Policy"]); if (roleLacks(role, ["AmazonEC2ContainerRegistryReadOnly"]).length && roleLacks(role, ["AmazonEC2ContainerRegistryPowerUser"]).length) lack.push("AmazonEC2ContainerRegistryReadOnly");
    if (lack.length) why.push("NodeCreationFailure: Instances failed to join the kubernetes cluster (role " + role.name + " ขาด policy: " + lack.join(", ") + ")");
  }
  if (!why.length && sns.some(function (s) { return !subnetOut(s); })) why.push("NodeCreationFailure: Instances failed to join the kubernetes cluster (ซอยที่เลือกออกอินเทอร์เน็ตไม่ได้ node จึงเรียก EKS API/ECR ไม่ได้ · ต้องมี NAT หรือ public IP + IGW)");
  if (why.length) return { errors: { _create: why[0] } };
  var asg = { id: "eks-" + n + "-" + mgHex(8) + "-" + mgHex(4) + "-" + mgHex(4) + "-" + mgHex(12), cluster: c.name, ng: n, instIds: [], tgArns: [], min: mn, max: mx, desired: d };
  asg.name = asg.id; var made = [];
  for (var i = 0; i < d; i++) {
    var sn = sns[i % sns.length], r = API.launch({ name: c.name + "-" + n + "-Node", tags: [{ k: "eks:cluster-name", v: c.name }, { k: "eks:nodegroup-name", v: n }, { k: "kubernetes.io/cluster/" + c.name, v: "owned" }], ami: "ami-al2023", type: types[0], keyName: "", vpcId: c.vpcId, subnetId: sn.id, autoIp: sn.autoIp ? "Enable" : "Disable", sgIds: [c.sgId], diskSize: +o.disk || 20, diskType: "gp3", tokens: "required", hop: 2 });
    if (r.errors) { made.forEach(function (x) { API.instState(x.id, "terminate"); }); return { errors: { _create: "Ec2LaunchTemplate: " + (r.errors._quota || r.errors._az || r.errors.type || "สร้าง node ไม่สำเร็จ") } }; }
    var inst = r.res[0]; inst.nodeRole = role.name; inst.asg = asg.name; made.push(inst); asg.instIds.push(inst.id);
  }
  var g = { id: c.name + ":" + n, cluster: c.name, name: n, roleArn: role.name, subnetIds: sns.map(function (s) { return s.id; }), types: types, desired: d, min: mn, max: mx, asg: asg.name, state: "ACTIVE", born: Date.now(), tagMap: {} };
  S.ngs.push(g); S.asgs.push(asg); return { res: g };
};
API.deleteNodegroup = function (cluster, name) {
  var g = S.ngs.filter(function (x) { return x.cluster === cluster && x.name === name; })[0]; if (!g) return E("_", "ResourceNotFoundException: No node group found for name: " + name);
  var a = S.asgs.filter(function (x) { return x.name === g.asg; })[0];
  if (a) { a.instIds.forEach(function (id) { var i = find(S.insts, id); if (i && i.state !== "terminated") API.instState(id, "terminate"); a.tgArns.forEach(function (arn) { var t = byArnTg(arn); if (t) t.targets = t.targets.filter(function (x) { return x.instId !== id; }); }); }); S.asgs = S.asgs.filter(function (x) { return x !== a; }); }
  S.ngs = S.ngs.filter(function (x) { return x !== g; }); return { res: true };
};
API.asgAttach = function (asgName, tgArn) {
  var a = S.asgs.filter(function (x) { return x.name === asgName; })[0], t = byArnTg(tgArn);
  if (!a) return E("_", "ValidationError: AutoScalingGroup name not found - " + asgName); if (!t) return E("_", "ValidationError: Provided Target Groups does not exist: " + tgArn);
  a.instIds.forEach(function (id) { if (!t.targets.some(function (x) { return x.instId === id; })) t.targets.push({ instId: id, port: t.port }); });
  if (a.tgArns.indexOf(tgArn) < 0) a.tgArns.push(tgArn); return { res: a };
};
API.asgDetach = function (asgName, tgArn) { var a = S.asgs.filter(function (x) { return x.name === asgName; })[0], t = byArnTg(tgArn); if (a) a.tgArns = a.tgArns.filter(function (x) { return x !== tgArn; }); if (a && t) t.targets = t.targets.filter(function (x) { return a.instIds.indexOf(x.instId) < 0; }); };

// ---------- RDS ----------
API.createDbSubnetGroup = function (o) {
  var er = {}, n = String(o.name || "");
  if (!n) er.name = "ต้องกรอกชื่อ subnet group"; else if (!/^[a-z0-9._ -]{1,255}$/.test(n)) er.name = "InvalidParameterValue: ชื่อ DB subnet group ใช้ได้เฉพาะตัวพิมพ์เล็ก ตัวเลข . _ - และช่องว่าง";
  else if (byName(S.dbsg, n)) er.name = "DBSubnetGroupAlreadyExists: The DB subnet group '" + n + "' already exists.";
  var sns = (o.subnetIds || []).map(function (id) { return find(S.subnets, id); }).filter(Boolean);
  if (!sns.length) er.subnetIds = "InvalidParameterValue: ต้องเลือก subnet"; else if (sns.some(function (s) { return s.vpcId !== sns[0].vpcId; })) er.subnetIds = "InvalidVPCNetworkStateFault: Subnets ต้องอยู่ VPC เดียวกัน";
  else if (azsOf(sns.map(function (s) { return s.id; })).length < 2) er.subnetIds = "DBSubnetGroupDoesNotCoverEnoughAZs: The DB subnet group doesn't meet Availability Zone (AZ) coverage requirement. Current AZ coverage: " + azsOf(sns.map(function (s) { return s.id; })).join(", ") + ". Add subnets to cover at least 2 AZs.";
  if (Object.keys(er).length) return { errors: er };
  var g = { id: n, name: n, desc: o.desc || "Created from the RDS Management Console", vpcId: sns[0].vpcId, subnetIds: sns.map(function (s) { return s.id; }), tagMap: {} }; S.dbsg.push(g); return { res: g };
};
API.createRds = function (o) {
  var er = {}, id = String(o.id || ""), sg = byName(S.dbsg, o.subnetGroup), eng = o.engine || "mariadb";
  if (!id) er.id = "ต้องกรอก DB instance identifier"; else if (!/^[a-z][a-z0-9-]*$/.test(id) || /--|-$/.test(id) || id.length > 63) er.id = "InvalidParameterValue: Identifier ต้องขึ้นต้นด้วยตัวพิมพ์เล็ก ใช้ได้เฉพาะ a-z 0-9 - (ห้าม -- และห้ามลงท้าย -) ไม่เกิน 63 ตัว";
  else if (S.rds.some(function (r) { return r.id === id; })) er.id = "DBInstanceAlreadyExists: DB instance already exists";
  if (!RDS_ENGINES[eng]) er.engine = "InvalidParameterValue: engine " + eng + " ไม่รองรับในตัวจำลอง (" + Object.keys(RDS_ENGINES).join(", ") + ")";
  else if (RDS_ENGINES[eng].indexOf(o.version || RDS_ENGINES[eng][0]) < 0) er.version = "InvalidParameterCombination: Cannot find version " + o.version + " for " + eng;
  if (!/^db\./.test(o.cls || "")) er.cls = "InvalidParameterValue: Invalid DB Instance class: " + (o.cls || "");
  var st = +o.storage; if (!(st >= 20 && st <= 65536)) er.storage = "InvalidParameterValue: Invalid storage size for engine name " + eng + " and storage type gp3: " + o.storage + " (ขั้นต่ำ 20 GiB)";
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,15}$/.test(o.user || "")) er.user = "InvalidParameterValue: MasterUsername ต้องขึ้นต้นด้วยตัวอักษร ใช้ a-z 0-9 _ ไม่เกิน 16 ตัว";
  if (!o.manage) { if (!o.password) er.password = "InvalidParameterValue: ต้องใส่รหัสผ่าน หรือเลือกให้ Secrets Manager จัดการ"; else if (String(o.password).length < 8 || /[\/@" ]/.test(o.password)) er.password = "InvalidParameterValue: The parameter MasterUserPassword is not a valid password (อย่างน้อย 8 ตัว และห้ามมี / @ \" หรือช่องว่าง)"; }
  if (!sg) er.subnetGroup = "DBSubnetGroupNotFoundFault: DB subnet group '" + (o.subnetGroup || "") + "' does not exist (ต้องสร้าง DB subnet group ก่อน)";
  var sgs = (o.sgIds || []).map(function (x) { return find(S.sgs, x); }).filter(Boolean);
  if (sg && sgs.some(function (g) { return g.vpcId !== sg.vpcId; })) er.sgIds = "InvalidParameterCombination: security group ต้องอยู่ VPC เดียวกับ DB subnet group";
  if (Object.keys(er).length) return { errors: er };
  var azs = azsOf(sg.subnetIds), pAz = azs[0], sAz = o.multiAz ? azs[1] : "";
  var dflt = sg.vpcId ? defaultSg(sg.vpcId) : null, r = { id: id, born: Date.now(), engine: eng, version: o.version || RDS_ENGINES[eng][0], cls: o.cls, storage: st, multiAz: !!o.multiAz, subnetGroup: sg.name, vpcId: sg.vpcId, sgIds: sgs.length ? sgs.map(function (g) { return g.id; }) : (dflt ? [dflt.id] : []), user: o.user, manage: !!o.manage, secretArn: o.manage ? "arn:aws:secretsmanager:" + REGION + ":" + ACCOUNT + ":secret:rds!db-" + mgHex(8) + "-" + mgHex(4) + "-" + mgHex(4) + "-" + mgHex(4) + "-" + mgHex(12) + "-" + mgHex(6) : "", publicly: !!o.publicly, backupDays: o.backupDays === undefined ? 7 : +o.backupDays, encrypted: o.encrypted !== false, skipSnap: !!o.skipSnap, az: pAz, standbyAz: sAz, state: "available", address: id + ".c" + mgHex(11) + "." + REGION + ".rds.amazonaws.com", port: eng === "postgres" ? 5432 : 3306, dbName: o.dbName || "", tagMap: {} };
  S.rds.push(r); return { res: r };
};
API.rdsFailover = function (id) { var r = S.rds.filter(function (x) { return x.id === id; })[0]; if (!r) return E("_", "DBInstanceNotFound: DBInstance " + id + " not found."); if (!r.multiAz) return E("_", "InvalidParameterCombination: Cannot failover a non-Multi-AZ instance"); var t = r.az; r.az = r.standbyAz; r.standbyAz = t; return { res: r }; };
API.deleteRds = function (id, skip) {
  var r = S.rds.filter(function (x) { return x.id === id; })[0]; if (!r) return E("_", "DBInstanceNotFound: DBInstance " + id + " not found.");
  if (r.deletionProtection) return E("_", "InvalidParameterCombination: Cannot delete protected DB Instance, please disable deletion protection and try again.");
  if (!skip && !r.skipSnap) return E("_", "InvalidParameterCombination: FinalDBSnapshotIdentifier is required unless SkipFinalSnapshot is specified.");
  S.rds = S.rds.filter(function (x) { return x !== r; }); return { res: true };
};
API.deleteDbSubnetGroup = function (n) { var g = byName(S.dbsg, n); if (!g) return E("_", "DBSubnetGroupNotFoundFault: DB subnet group '" + n + "' does not exist"); if (S.rds.some(function (r) { return r.subnetGroup === n; })) return E("_", "InvalidDBSubnetGroupStateFault: Cannot delete the subnet group '" + n + "' because at least one database instance is still using it."); S.dbsg = S.dbsg.filter(function (x) { return x !== g; }); return { res: true }; };
// node/เครื่องไหนต่อ DB ได้ไหม: SG ของ DB ต้องเปิด port ให้ SG ของเครื่อง + อยู่ VPC เดียวกัน
function rdsReach(inst, r) { return !!inst && !!r && inst.state === "running" && inst.vpcId === r.vpcId && sgAllows(r.sgIds, r.port, { sgIds: inst.sgIds, ip: inst.privateIp }); }
// ผูก SG rule แบบ Terraform (aws_security_group_rule)
API.sgRuleRaw = function (o) {
  var g = find(S.sgs, o.sgId); if (!g) return E("_", "InvalidGroup.NotFound: The security group '" + o.sgId + "' does not exist");
  var rows = []; if (o.srcSg) { if (!find(S.sgs, o.srcSg)) return E("_", "InvalidGroup.NotFound: The security group '" + o.srcSg + "' does not exist"); rows.push({ srcKind: "sg", src: o.srcSg }); }
  (o.cidrs || []).forEach(function (c) { rows.push({ srcKind: "cidr", src: c }); }); if (o.self) rows.push({ srcKind: "sg", src: g.id });
  if (!rows.length) return E("_", "ValidationError: ต้องระบุ source_security_group_id, cidr_blocks หรือ self");
  var list = o.type === "egress" ? g.outbound : g.inbound, proto = String(o.proto) === "-1" ? "-1" : String(o.proto || "tcp").toLowerCase(), added = [];
  rows.forEach(function (x) { var rule = { proto: proto, from: proto === "-1" ? 0 : +o.from, to: proto === "-1" ? 65535 : +o.to, srcKind: x.srcKind, src: x.src, desc: o.desc || "" }; if (list.some(function (y) { return y.proto === rule.proto && y.from === rule.from && y.to === rule.to && y.srcKind === rule.srcKind && y.src === rule.src; })) return; list.push(rule); added.push(rule); });
  if (!added.length) return E("_", "InvalidPermission.Duplicate: the specified rule already exists");
  return { res: added };
};
API.sgRuleDel = function (sgId, type, rules) { var g = find(S.sgs, sgId); if (!g) return; var key = function (y) { return [y.proto, y.from, y.to, y.srcKind, y.src].join("|"); }, ks = rules.map(key), keep = function (y) { return ks.indexOf(key(y)) < 0; }; if (type === "egress") g.outbound = g.outbound.filter(keep); else g.inbound = g.inbound.filter(keep); };

// ---------- schema ----------
TF_SCHEMA.aws_eks_cluster = sch(["name", "role_arn", "version", "vpc_config", "access_config", "tags"], ["name", "role_arn", "vpc_config"], { vpc_config: { args: ["subnet_ids", "endpoint_private_access", "endpoint_public_access", "public_access_cidrs", "security_group_ids"], req: ["subnet_ids"] }, access_config: { args: ["authentication_mode", "bootstrap_cluster_creator_admin_permissions"], req: [] } }, ["tags", "version"], ["id", "arn", "endpoint", "platform_version", "status", "created_at"]);
TF_SCHEMA.aws_eks_node_group = sch(["cluster_name", "node_group_name", "node_group_name_prefix", "node_role_arn", "subnet_ids", "instance_types", "ami_type", "capacity_type", "disk_size", "scaling_config", "tags"], ["cluster_name", "node_role_arn", "subnet_ids", "scaling_config"], { scaling_config: { args: ["desired_size", "min_size", "max_size"], req: ["desired_size", "min_size", "max_size"] } }, ["tags", "scaling_config"], ["id", "arn", "status", "resources"]);
TF_SCHEMA.aws_db_subnet_group = sch(["name", "name_prefix", "description", "subnet_ids", "tags"], ["subnet_ids"], {}, ["tags", "description", "subnet_ids"], ["id", "arn", "vpc_id"]);
TF_SCHEMA.aws_db_instance = sch(["identifier", "engine", "engine_version", "instance_class", "allocated_storage", "storage_type", "storage_encrypted", "username", "password", "manage_master_user_password", "multi_az", "db_subnet_group_name", "vpc_security_group_ids", "publicly_accessible", "backup_retention_period", "skip_final_snapshot", "final_snapshot_identifier", "deletion_protection", "db_name", "tags"], ["instance_class"], {}, ["tags", "instance_class", "multi_az", "allocated_storage", "backup_retention_period", "deletion_protection", "skip_final_snapshot", "vpc_security_group_ids", "publicly_accessible", "password", "manage_master_user_password"], ["id", "arn", "address", "endpoint", "port", "status", "resource_id", "master_user_secret"]);
TF_SCHEMA.aws_autoscaling_attachment = sch(["autoscaling_group_name", "lb_target_group_arn", "elb"], ["autoscaling_group_name"], {}, [], ["id"]);
TF_SCHEMA.aws_security_group_rule = sch(["type", "from_port", "to_port", "protocol", "security_group_id", "source_security_group_id", "cidr_blocks", "self", "description"], ["type", "from_port", "to_port", "protocol", "security_group_id"], {}, [], ["id"]);

// ---------- Terraform provider ----------
function mgTfFail(label, svc, op, msg) { var m = /^([A-Za-z.]+): ([\s\S]*)$/.exec(msg); return TfAwsError(label, svc, op, m ? m[1] : "InvalidParameterValue", m ? m[2] : msg); }
function mgTfOk(r, label, svc, op) { if (r && r.errors) { var k = Object.keys(r.errors)[0]; throw mgTfFail(label, svc, op, String(r.errors[k])); } return r.res; }
var MG_ROLE_SVC = {};
TF_PROV.aws_eks_cluster = {
  act: "eks:CreateCluster", svc: "EKS", op: "CreateCluster",
  create: function (c) {
    var a = c.attrs, v = (a.vpc_config || [{}])[0], ac = (a.access_config || [{}])[0];
    var cl = mgTfOk(API.createEks({ name: a.name, version: a.version, roleArn: a.role_arn, subnetIds: v.subnet_ids || [], pub: v.endpoint_public_access, priv: !!v.endpoint_private_access, cidrs: v.public_access_cidrs || [], authMode: ac.authentication_mode }), "creating EKS Cluster (" + a.name + ")", "EKS", "CreateCluster"); cl.tagMap = Object.assign({}, c.tags);
    var vc = Object.assign({}, v, { cluster_security_group_id: cl.sgId, vpc_id: cl.vpcId, endpoint_public_access: cl.pub, endpoint_private_access: cl.priv, public_access_cidrs: cl.cidrs, subnet_ids: cl.subnetIds });
    return { id: cl.name, computed: { id: cl.name, arn: mgArn("eks", "cluster", cl.name), endpoint: cl.endpoint, platform_version: "eks.1", status: "ACTIVE", version: cl.version, vpc_config: [vc] } };
  },
  update: function (st, d, ch) { var c = byName(S.eks, st.id); if (!c) return; if (ch.indexOf("version") >= 0) { if (EKS_VERS.indexOf(d.version) < 0 || EKS_VERS.indexOf(d.version) > EKS_VERS.indexOf(c.version)) throw TfAwsError("updating EKS Cluster (" + c.name + ") version", "EKS", "UpdateClusterVersion", "InvalidParameterException", "Unsupported Kubernetes minor version update from " + c.version + " to " + d.version + " (อัปได้ทีละ 1 minor ขึ้นเท่านั้น)"); c.version = d.version; } c.tagMap = Object.assign({}, d.tags); },
  del: function (st) { var r = API.deleteEks(st.id); if (r.errors) throw mgTfFail("deleting EKS Cluster (" + st.id + ")", "EKS", "DeleteCluster", r.errors._); },
  read: function (st) { return byName(S.eks, st.id) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_eks_node_group = {
  act: "eks:CreateNodegroup", svc: "EKS", op: "CreateNodegroup",
  create: function (c) {
    var a = c.attrs, sc = (a.scaling_config || [{}])[0], nm = a.node_group_name || "terraform-" + mgHex(20);
    var g = mgTfOk(API.createNodegroup({ cluster: a.cluster_name, name: nm, roleArn: a.node_role_arn, subnetIds: a.subnet_ids || [], types: a.instance_types, desired: sc.desired_size, min: sc.min_size, max: sc.max_size, disk: a.disk_size }), "creating EKS Node Group (" + a.cluster_name + ":" + nm + ")", "EKS", "CreateNodegroup");
    return { id: a.cluster_name + ":" + nm, computed: { id: a.cluster_name + ":" + nm, arn: mgArn("eks", "nodegroup", a.cluster_name + "/" + nm + "/" + mgHex(8)), status: "ACTIVE", node_group_name: nm, resources: [{ autoscaling_groups: [{ name: g.asg }], remote_access_security_group_id: "" }] }, sim: { cluster: a.cluster_name, name: nm } };
  },
  update: function (st, d) { var g = S.ngs.filter(function (x) { return x.cluster === st.sim.cluster && x.name === st.sim.name; })[0]; if (!g) return; var sc = (d.scaling_config || [{}])[0], a = S.asgs.filter(function (x) { return x.name === g.asg; })[0]; g.desired = sc.desired_size; g.min = sc.min_size; g.max = sc.max_size; if (a) { a.desired = g.desired; a.min = g.min; a.max = g.max; } },
  del: function (st) { var r = API.deleteNodegroup(st.sim.cluster, st.sim.name); if (r.errors) throw mgTfFail("deleting EKS Node Group (" + st.id + ")", "EKS", "DeleteNodegroup", r.errors._); },
  read: function (st) { return S.ngs.some(function (x) { return x.cluster === st.sim.cluster && x.name === st.sim.name; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_db_subnet_group = {
  act: "rds:CreateDBSubnetGroup", svc: "RDS", op: "CreateDBSubnetGroup",
  create: function (c) { var a = c.attrs, nm = a.name || "terraform-" + mgHex(20), g = mgTfOk(API.createDbSubnetGroup({ name: nm, desc: a.description || "Managed by Terraform", subnetIds: a.subnet_ids || [] }), "creating RDS DB Subnet Group (" + nm + ")", "RDS", "CreateDBSubnetGroup"); g.tagMap = Object.assign({}, c.tags); return { id: g.name, computed: { id: g.name, arn: mgArn("rds", "subgrp", g.name), name: g.name, vpc_id: g.vpcId, description: a.description || "Managed by Terraform" } }; },
  update: function (st, d) { var g = byName(S.dbsg, st.id); if (g) { g.subnetIds = (d.subnet_ids || g.subnetIds).slice(); g.tagMap = Object.assign({}, d.tags); } },
  del: function (st) { var r = API.deleteDbSubnetGroup(st.id); if (r.errors) throw mgTfFail("deleting RDS DB Subnet Group (" + st.id + ")", "RDS", "DeleteDBSubnetGroup", r.errors._); },
  read: function (st) { return byName(S.dbsg, st.id) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_db_instance = {
  act: "rds:CreateDBInstance", svc: "RDS", op: "CreateDBInstance",
  create: function (c) {
    var a = c.attrs, label = "creating RDS DB Instance (" + (a.identifier || "") + ")";
    if (!a.engine) throw TfAwsError(label, "RDS", "CreateDBInstance", "InvalidParameterCombination", "engine: required unless a snapshot is provided");
    if (a.manage_master_user_password && a.password) throw TfAwsError(label, "RDS", "CreateDBInstance", "InvalidParameterCombination", "password: conflicts with manage_master_user_password");
    var r = mgTfOk(API.createRds({ id: a.identifier, engine: a.engine, version: a.engine_version, cls: a.instance_class, storage: a.allocated_storage, user: a.username, password: a.password, manage: !!a.manage_master_user_password, multiAz: !!a.multi_az, subnetGroup: a.db_subnet_group_name, sgIds: a.vpc_security_group_ids, publicly: !!a.publicly_accessible, backupDays: a.backup_retention_period, encrypted: a.storage_encrypted, skipSnap: !!a.skip_final_snapshot, dbName: a.db_name }), label, "RDS", "CreateDBInstance");
    r.deletionProtection = !!a.deletion_protection; r.tagMap = Object.assign({}, c.tags);
    return { id: r.id, computed: { id: r.id, arn: mgArn("rds", "db", r.id), address: r.address, endpoint: r.address + ":" + r.port, port: r.port, status: "available", resource_id: "db-" + mgHex(26).toUpperCase(), master_user_secret: r.manage ? [{ secret_arn: r.secretArn, secret_status: "active", kms_key_id: "arn:aws:kms:" + REGION + ":" + ACCOUNT + ":key/" + mgHex(8) + "-" + mgHex(4) + "-" + mgHex(4) + "-" + mgHex(4) + "-" + mgHex(12) }] : [] } };
  },
  update: function (st, d) { var r = S.rds.filter(function (x) { return x.id === st.id; })[0]; if (!r) return; r.cls = d.instance_class || r.cls; r.multiAz = !!d.multi_az; if (r.multiAz && !r.standbyAz) r.standbyAz = azsOf((byName(S.dbsg, r.subnetGroup) || { subnetIds: [] }).subnetIds).filter(function (z) { return z !== r.az; })[0] || ""; if (!r.multiAz) r.standbyAz = ""; r.storage = +d.allocated_storage || r.storage; r.backupDays = +d.backup_retention_period || 0; r.deletionProtection = !!d.deletion_protection; r.skipSnap = !!d.skip_final_snapshot; if (d.vpc_security_group_ids) r.sgIds = d.vpc_security_group_ids.slice(); r.tagMap = Object.assign({}, d.tags); },
  del: function (st) { var rr = S.rds.filter(function (x) { return x.id === st.id; })[0]; var r = API.deleteRds(st.id, rr && rr.skipSnap); if (r.errors) throw mgTfFail("deleting RDS DB Instance (" + st.id + ")", "RDS", "DeleteDBInstance", r.errors._); },
  read: function (st) { return S.rds.some(function (x) { return x.id === st.id; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_autoscaling_attachment = {
  act: "autoscaling:AttachLoadBalancerTargetGroups", svc: "Auto Scaling", op: "AttachLoadBalancerTargetGroups",
  create: function (c) { var a = c.attrs; mgTfOk(API.asgAttach(a.autoscaling_group_name, a.lb_target_group_arn), "creating Auto Scaling Attachment (" + a.autoscaling_group_name + ")", "Auto Scaling", "AttachLoadBalancerTargetGroups"); var id = "terraform-" + mgHex(26); return { id: id, computed: { id: id }, sim: { asg: a.autoscaling_group_name, tg: a.lb_target_group_arn } }; },
  update: function () {}, del: function (st) { API.asgDetach(st.sim.asg, st.sim.tg); },
  read: function (st) { var a = S.asgs.filter(function (x) { return x.name === st.sim.asg; })[0]; return a && a.tgArns.indexOf(st.sim.tg) >= 0 ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_security_group_rule = {
  act: "ec2:AuthorizeSecurityGroupIngress", svc: "EC2", op: "AuthorizeSecurityGroupIngress",
  create: function (c) {
    var a = c.attrs, r = mgTfOk(API.sgRuleRaw({ sgId: a.security_group_id, type: a.type, from: a.from_port, to: a.to_port, proto: a.protocol, srcSg: a.source_security_group_id, cidrs: a.cidr_blocks, self: a.self, desc: a.description }), "creating Security Group Rule", "EC2", "AuthorizeSecurityGroupIngress"); var id = "sgrule-" + mgHex(10);
    return { id: id, computed: { id: id }, sim: { sg: a.security_group_id, type: a.type, rules: r } };
  },
  update: function () {}, del: function (st) { API.sgRuleDel(st.sim.sg, st.sim.type, st.sim.rules); },
  read: function (st) { var g = find(S.sgs, st.sim.sg); return g ? { cfg: {}, computed: {} } : null; }
};

// ---------- ลบจาก console (ใช้หน้า "del" กลาง) ----------
function mgDelPlan(kind, id, P) {
  if (kind === "eks") {
    var c = byName(S.eks, id); if (!c) return false;
    P.title = "Delete cluster " + c.name; P.crumb = "EKS › Clusters › Delete"; P.word = "delete"; P.done = "ลบ cluster แล้ว (control plane ถูกลบ ค่า EKS หยุดคิด)"; P.note = "ต้องลบ node group ทั้งหมดก่อน แล้ว AWS ลบ control plane และ security group ที่ EKS สร้างให้";
    S.ngs.filter(function (g) { return g.cluster === c.name; }).forEach(function (g) { P.blockers.push("ต้องลบ node group " + g.name + " ก่อน"); });
  } else if (kind === "ng") {
    var g = S.ngs.filter(function (x) { return x.id === id; })[0]; if (!g) return false;
    P.title = "Delete node group " + g.name; P.crumb = "EKS › Clusters › " + g.cluster + " › Delete node group"; P.word = g.name; P.done = "ลบ node group แล้ว (node ถูก terminate ถอดออกจาก target group)";
    var a = S.asgs.filter(function (x) { return x.name === g.asg; })[0]; if (a) a.instIds.forEach(function (i) { P.removes.push("EC2 node " + i); });
  } else if (kind === "rds") {
    var r = S.rds.filter(function (x) { return x.id === id; })[0]; if (!r) return false;
    P.title = "Delete " + r.id + "?"; P.crumb = "RDS › Databases › Delete"; P.word = "delete me"; P.done = "ลบ DB แล้ว"; P.note = "console จะถามว่าจะเก็บ final snapshot ไหม ตัวจำลองข้ามขั้นนี้ (ข้อมูลหายถาวร) · backup อัตโนมัติถูกลบพร้อมกัน"; P.button = "Delete";
    if (r.deletionProtection) P.blockers.push("เปิด deletion protection อยู่ ต้องปิดก่อน (Modify)");
  } else if (kind === "dbsg") {
    var d = byName(S.dbsg, id); if (!d) return false;
    P.title = "Delete DB subnet group " + d.name; P.crumb = "RDS › Subnet groups › Delete"; P.word = "delete"; P.done = "ลบ subnet group แล้ว";
    S.rds.filter(function (x) { return x.subnetGroup === d.name; }).forEach(function (x) { P.blockers.push("DB " + x.id + " ยังใช้ subnet group นี้อยู่"); });
  } else return stDelPlan(kind, id, P);
  return true;
}
function mgDelDo(kind, id) {
  var r; if (/^(bucket|cfd|zone|cert|oac|esvc|ecsc|lg|td|lam|api|ddb|layer|adom|alarm|pipe|cbp|conn|vpce)$/.test(kind)) { r = stDelDo(kind, id); return r && r.errors ? r : { res: true }; }
  if (kind === "eks") r = API.deleteEks(id); else if (kind === "ng") { var g = S.ngs.filter(function (x) { return x.id === id; })[0]; r = API.deleteNodegroup(g.cluster, g.name); }
  else if (kind === "rds") r = API.deleteRds(id, true); else if (kind === "dbsg") r = API.deleteDbSubnetGroup(id);
  return r && r.errors ? r : { res: true };
}

// ---------- โค้ด HCL จากของที่กดใน console (แท็บ Terraform) ----------
function mgHcl(o, ref, map) {
  var q = function (a) { return a.map(function (x) { return '"' + x + '"'; }).join(", "); }, roleRef = function (n) { var r = byName(S.roles, n); return r ? ref(r.id, "arn") : '"' + n + '"'; };
  S.dbsg.forEach(function (g) { o.push(hcm("dbsg", g.name) + 'resource "aws_db_subnet_group" "' + slug(g.name) + '" {\n  name       = "' + g.name + '"\n  subnet_ids = [' + g.subnetIds.map(function (id) { return ref(id); }).join(", ") + "]\n}"); });
  S.eks.forEach(function (c) { o.push(hcm("eks", c.name) + 'resource "aws_eks_cluster" "' + slug(c.name) + '" {\n  name     = "' + c.name + '"\n  role_arn = ' + roleRef(c.roleArn) + '\n  version  = "' + c.version + '"\n\n  vpc_config {\n    subnet_ids              = [' + c.subnetIds.map(function (id) { return ref(id); }).join(", ") + "]\n    endpoint_private_access = " + c.priv + "\n    endpoint_public_access  = " + c.pub + "\n    public_access_cidrs     = [" + q(c.cidrs) + "]   # kubectl เข้าได้เฉพาะ IP เหล่านี้\n  }\n\n  access_config {\n    authentication_mode = \"" + c.authMode + "\"\n  }\n}"); });
  S.ngs.forEach(function (g) { o.push(hcm("ng", g.cluster + "/" + g.name) + 'resource "aws_eks_node_group" "' + slug(g.name) + '" {\n  cluster_name    = aws_eks_cluster.' + slug(g.cluster) + '.name\n  node_group_name = "' + g.name + '"\n  node_role_arn   = ' + roleRef(g.roleArn) + "\n  subnet_ids      = [" + g.subnetIds.map(function (id) { return ref(id); }).join(", ") + "]\n  instance_types  = [" + q(g.types) + "]\n\n  scaling_config {\n    desired_size = " + g.desired + "\n    min_size     = " + g.min + "\n    max_size     = " + g.max + "\n  }\n\n  # node ต้องออกเน็ตได้ตั้งแต่บูต: รอ NAT + route table ให้พร้อมก่อน (ไม่งั้น NodeCreationFailure)\n  depends_on = [aws_nat_gateway.<ชื่อ NAT>, aws_route_table_association.<private>]\n}"); });
  S.rds.forEach(function (r) { o.push(hcm("rds", r.id) + 'resource "aws_db_instance" "' + slug(r.id) + '" {\n  identifier        = "' + r.id + '"\n  engine            = "' + r.engine + '"\n  engine_version    = "' + r.version + '"\n  instance_class    = "' + r.cls + '"\n  allocated_storage = ' + r.storage + "\n\n  username                    = \"" + r.user + "\"\n" + (r.manage ? "  manage_master_user_password = true   # Secrets Manager สร้างและหมุนรหัสให้\n" : "  password                    = var.db_password   # อย่าฝังรหัสผ่านในโค้ด\n") + "\n  multi_az               = " + r.multiAz + "   # true = มี standby คนละ AZ สลับให้เอง\n  db_subnet_group_name   = aws_db_subnet_group." + slug(r.subnetGroup) + ".name\n  vpc_security_group_ids = [" + r.sgIds.map(function (id) { return ref(id); }).join(", ") + "]\n  publicly_accessible    = " + r.publicly + "\n  backup_retention_period = " + r.backupDays + "\n  skip_final_snapshot     = true   # ฝึกเท่านั้น\n}"); });
  S.asgs.forEach(function (a) { a.tgArns.forEach(function (arn) { var t = byArnTg(arn); if (t) o.push(hcm("asgatt", a.ng + " → " + t.name) + 'resource "aws_autoscaling_attachment" "' + slug(a.ng + "_" + t.name) + '" {\n  autoscaling_group_name = aws_eks_node_group.' + slug(a.ng) + ".resources[0].autoscaling_groups[0].name\n  lb_target_group_arn    = " + ref(t.id, "arn") + "\n}"); }); });
}

// ---------- ตัวตรวจ + สร้าง lab แบบ managed ----------
function isManagedLab() { return S.eks.length > 0 || S.rds.length > 0; }
function checksManaged() {
  var out = []; function add(ok, label, hint) { out.push({ ok: !!ok, label: label, hint: hint || "" }); }
  var vpc = byName(S.vpcs, "pharmacy-vpc"), pu = [1, 2, 3].map(function (i) { return byName(S.subnets, "pharmacy-public-" + i); }), pr = [1, 2, 3].map(function (i) { return byName(S.subnets, "pharmacy-private-" + i); });
  var c = byName(S.eks, "pharmacy-eks"), g = c && S.ngs.filter(function (x) { return x.cluster === c.name; })[0], db = S.rds.filter(function (x) { return x.id === "pharmacy-db"; })[0];
  var nodes = g ? S.insts.filter(function (i) { return i.nodeRole && i.state === "running" && S.asgs.some(function (a) { return a.name === i.asg && a.ng === g.name; }); }) : [];
  var sgn = function (n) { return byName(S.sgs, "pharmacy-" + n); }, csg = c && find(S.sgs, c.sgId);
  add(vpc && vpc.cidr === "10.0.0.0/16", "VPC pharmacy-vpc ช่วง 10.0.0.0/16", "VPC → Your VPCs → Create VPC");
  add(pu.every(function (x) { return x && x.autoIp; }) && pr.every(function (x) { return x && !x.autoIp; }), "subnet public ×3 (auto-assign IP) และ private ×3 (ไม่มี public IP) อยู่ 3 AZ", "VPC → Subnets");
  add(pu.every(function (x, i) { return x && pr[i] && x.az === pr[i].az; }) && azsOf(pu.map(function (x) { return x && x.id; })).length === 3, "public-N กับ private-N อยู่ AZ เดียวกัน ครบ 3 AZ", "เลือก AZ ตอนสร้าง subnet");
  add(vpc && vpcIgw(vpc.id) && S.rtbs.some(function (r) { return hasIgwRoute(r) && pu.every(function (x) { return x && r.assoc.indexOf(x.id) >= 0; }); }), "public route table (0.0.0.0/0 → IGW) ผูก public ครบ 3", "VPC → Route tables");
  add(S.nats.some(function (n) { var s = find(S.subnets, n.subnetId); return s && /public/.test(s.name); }) && pr.every(function (x) { return x && natRoute(subnetRtb(x)); }), "NAT gateway ใน public + private route table (0.0.0.0/0 → NAT) ผูก private ครบ 3", "VPC → NAT gateways");
  ["alb", "jenkins", "sonarqube", "db"].forEach(function (n) { add(sgn(n), "security group pharmacy-" + n, "EC2 → Security Groups"); });
  add(!sgn("bastion") && !S.keys.length, "ไม่มี bastion / ไม่มี key pair (เข้าเครื่องผ่าน SSM อย่างเดียว)", "ลบ bastion และ key pair ออก");
  var rc = byName(S.roles, "pharmacy-eks-cluster"), rn = byName(S.roles, "pharmacy-eks-node");
  add(rc && roleTrusts(rc, "eks.amazonaws.com") && rc.policies.indexOf("AmazonEKSClusterPolicy") >= 0, "role pharmacy-eks-cluster (trust EKS + AmazonEKSClusterPolicy)", "IAM → Roles → Create role → EKS - Cluster");
  add(rn && roleTrusts(rn, "ec2.amazonaws.com") && roleLacks(rn, ["AmazonEKSWorkerNodePolicy", "AmazonEKS_CNI_Policy", "AmazonEC2ContainerRegistryReadOnly", "AmazonSSMManagedInstanceCore"]).length === 0, "role pharmacy-eks-node (WorkerNode, CNI, ECR ReadOnly, SSM)", "IAM → Roles → Create role (EC2) แล้วแนบ 4 policy");
  add(S.repos.length >= 2, "ECR repo pharmacy/frontend และ pharmacy/backend", "ECR → Create repository");
  add(c && c.state === "ACTIVE" && c.subnetIds.length === 3 && pr.every(function (x) { return x && c.subnetIds.indexOf(x.id) >= 0; }), "EKS cluster pharmacy-eks (Active) ใช้ private subnet ครบ 3", "EKS → Create cluster");
  add(c && c.pub && c.cidrs.indexOf("0.0.0.0/0") < 0 && c.cidrs.some(function (x) { return cidrHas(x, S.myIp); }), "API endpoint เปิดเฉพาะ My IP (ไม่ใช่ 0.0.0.0/0)", "EKS → Networking → Manage → Public access: จำกัด CIDR");
  add(g && nodes.length === g.desired && azsOf(nodes.map(function (i) { return i.subnetId; })).length === 3, "node group ขึ้น node ครบ 3 เครื่อง กระจาย 3 AZ", "EKS → Compute → Add node group (desired 3)");
  add(csg && ["alb"].every(function () { return sgAllows([csg.id], 30080, { sgIds: sgn("alb") ? [sgn("alb").id] : [] }) && sgAllows([csg.id], 30443, { sgIds: sgn("alb") ? [sgn("alb").id] : [] }); }), "SG ของ cluster เปิด NodePort 30080-30081 และ 30443 ให้ SG ของ ALB", "แก้ inbound ของ SG eks-cluster-sg-*");
  add(db && db.engine === "mariadb" && db.multiAz && !db.publicly && db.encrypted, "RDS pharmacy-db: mariadb, Multi-AZ, ไม่ public, เข้ารหัส", "RDS → Create database");
  add(db && db.manage, "รหัสผ่าน DB ให้ Secrets Manager จัดการ (ไม่ตั้งรหัสเอง)", "Create database → Credentials: Managed in AWS Secrets Manager");
  add(db && csg && sgAllows(db.sgIds, 3306, { sgIds: [csg.id] }) && !sgAllows(db.sgIds, 3306, { ip: "203.0.113.5" }), "SG ของ DB รับ 3306 จาก SG ของ cluster เท่านั้น", "SG pharmacy-db: MYSQL/Aurora ← SG ของ cluster");
  add(db && nodes.length && nodes.every(function (n) { return rdsReach(n, db); }), "ทุก node ต่อ DB (3306) ได้", "ตรวจ SG ของ DB และ VPC");
  var live = function (n) { return S.insts.filter(function (i) { return i.name === n && i.state !== "terminated"; })[0]; }, jk = live("pharmacy-jenkins"), sq = live("pharmacy-sonarqube");
  add(jk && sq && !jk.publicIp && !sq.publicIp && /private/.test((find(S.subnets, jk.subnetId) || {}).name || "") && /private/.test((find(S.subnets, sq.subnetId) || {}).name || ""), "Jenkins และ SonarQube อยู่ private ไม่มี public IP", "EC2 → Launch (subnet private, ปิด auto-assign public IP)");
  add(jk && sq && sessionCheck(jk).ok && sessionCheck(sq).ok && nodes.every(function (n) { return sessionCheck(n).ok; }), "ทุกเครื่อง (Jenkins, SonarQube, node) ออนไลน์ใน Session Manager", "ผูก role ที่มี AmazonSSMManagedInstanceCore + มีทางออก NAT");
  var tp = byName(S.tgs, "pharmacy-prd"), ta = byName(S.tgs, "pharmacy-argocd"), alb = S.albs[0];
  add(tp && tp.port === 30080 && ta && ta.port === 30443 && byName(S.tgs, "pharmacy-dev"), "target group pharmacy-prd (30080), pharmacy-dev (30081), pharmacy-argocd (30443 HTTPS)", "EC2 → Target Groups");
  add(g && S.asgs.some(function (a) { return a.ng === g.name && a.tgArns.length >= 2; }), "ผูก Auto Scaling group ของ node group กับ target group (node ลงทะเบียน ALB เอง)", "EC2 → Auto Scaling Groups → Integrations → Load balancing");
  add(alb && alb.subnetIds.length === 3 && alb.listeners.map(function (l) { return l.port; }).sort().join() === "80,8080,8443", "ALB ใน public ครบ 3 AZ และมี listener 80 / 8080 / 8443", "EC2 → Load Balancers → Create");
  add(alb && albHealth(alb).length && albHealth(alb).every(function (r) { return r.ok; }), "ALB เห็น target healthy ทุกตัว", "ถ้า unhealthy: ดู SG ของ cluster และ target group");
  return out;
}
function buildManaged(kind) {
  fresh();
  function ok(r) { if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.res; }
  var v = ok(API.createVpc({ name: "pharmacy-vpc", cidr: "10.0.0.0/16", dns: true }));
  var pub = ok(API.createSubnet({ vpcId: v.id, list: [0, 1, 2].map(function (i) { return { name: "pharmacy-public-" + (i + 1), az: AZS[i], cidr: "10.0." + (i + 1) + ".0/24" }; }) })); pub.forEach(function (s) { API.setAutoIp(s.id, true); });
  var prv = ok(API.createSubnet({ vpcId: v.id, list: [0, 1, 2].map(function (i) { return { name: "pharmacy-private-" + (i + 1), az: AZS[i], cidr: "10.0." + (i + 11) + ".0/24" }; }) }));
  var g = ok(API.createIgw({ name: "pharmacy-igw" })); ok(API.attachIgw(g.id, v.id));
  var rt = ok(API.createRtb({ name: "pharmacy-public", vpcId: v.id })); ok(API.setRoutes(rt.id, [{ dest: "0.0.0.0/0", target: g.id }])); ok(API.setAssoc(rt.id, pub.map(function (s) { return s.id; })));
  var eip = ok(API.allocEip()), nat = { id: rid("nat"), name: "pharmacy-nat", vpcId: v.id, subnetId: pub[0].id, eipId: eip.id, state: "available", born: Date.now() }; S.nats.push(nat);
  var rp = ok(API.createRtb({ name: "pharmacy-private", vpcId: v.id })); ok(API.setRoutes(rp.id, [{ dest: "0.0.0.0/0", target: nat.id }])); ok(API.setAssoc(rp.id, prv.map(function (s) { return s.id; })));
  function R(type, port, k, src) { return { type: type, port: port, srcKind: k, src: src }; }
  var sg = {}; ["alb", "jenkins", "sonarqube", "db"].forEach(function (n) { sg[n] = ok(API.createSg({ name: "pharmacy-" + n, desc: "pharmacy " + n, vpcId: v.id, rows: [] })); });
  ok(API.setInbound(sg.alb.id, [R("HTTP", "", "Anywhere-IPv4"), R("Custom TCP", "8080", "My IP"), R("Custom TCP", "8443", "My IP")]));
  ok(API.setInbound(sg.sonarqube.id, [R("Custom TCP", "9000", "Security group", sg.jenkins.id)]));
  [sg.jenkins, sg.sonarqube].forEach(function (x) { x.outbound = [{ proto: "-1", from: 0, to: 65535, srcKind: "cidr", src: "0.0.0.0/0" }]; });
  var rc = ok(API.createRole({ name: "pharmacy-eks-cluster", entity: "AWS service", usecase: "EKS", policies: [] }));
  var pol = ["AmazonEKSWorkerNodePolicy", "AmazonEKS_CNI_Policy", "AmazonEC2ContainerRegistryReadOnly", "AmazonSSMManagedInstanceCore"];
  var rn = ok(API.createRole({ name: "pharmacy-eks-node", entity: "AWS service", usecase: "EC2", policies: kind === "managed-badrole" ? pol.filter(function (p) { return p !== "AmazonEKS_CNI_Policy"; }) : pol }));
  ok(API.createRole({ name: "pharmacy-jenkins", entity: "AWS service", usecase: "EC2", policies: ["AmazonEC2ContainerRegistryPowerUser", "AmazonSSMManagedInstanceCore"] }));
  ok(API.createRole({ name: "pharmacy-sonarqube", entity: "AWS service", usecase: "EC2", policies: ["AmazonSSMManagedInstanceCore"] }));
  ok(API.createRepo({ name: "pharmacy/frontend" })); ok(API.createRepo({ name: "pharmacy/backend" }));
  function L(name, role, sub, sgs, prof) { return ok(API.launch({ name: "pharmacy-" + name, tags: [{ k: "Project", v: "pharmacy" }, { k: "Role", v: role }, { k: "Tier", v: "private" }], ami: "ami-ubuntu2404", type: "t3.medium", keyName: "", vpcId: v.id, subnetId: sub.id, autoIp: "Disable", sgIds: sgs.map(function (x) { return x.id; }), profile: prof, diskSize: 30, diskType: "gp3", tokens: "required", hop: 2 }))[0]; }
  var base = kind === "managed-base" || kind === "managed-badrole";
  if (base) { return mgFinish(); }
  var jk = L("jenkins", "jenkins", prv[0], [sg.jenkins], "pharmacy-jenkins"); L("sonarqube", "sonarqube", prv[1], [sg.sonarqube], "pharmacy-sonarqube"); void jk;
  var c = ok(API.createEks({ name: "pharmacy-eks", version: "1.31", roleArn: rc.name, subnetIds: prv.map(function (s) { return s.id; }), pub: true, priv: true, cidrs: [S.myIp + "/32"] }));
  var ng = ok(API.createNodegroup({ cluster: c.name, name: "pharmacy-nodes", roleArn: rn.name, subnetIds: prv.map(function (s) { return s.id; }), types: ["t3.medium"], desired: 3, min: 3, max: 6 }));
  API.sgRuleRaw({ sgId: c.sgId, type: "ingress", from: 30080, to: 30081, proto: "tcp", srcSg: sg.alb.id, desc: "NodePort prd/dev from ALB" }); API.sgRuleRaw({ sgId: c.sgId, type: "ingress", from: 30443, to: 30443, proto: "tcp", srcSg: sg.alb.id, desc: "ArgoCD from ALB" }); API.sgRuleRaw({ sgId: c.sgId, type: "ingress", from: 30443, to: 30443, proto: "tcp", srcSg: sg.jenkins.id, desc: "ArgoCD API from Jenkins" });
  ok(API.setInbound(sg.db.id, [R("MYSQL/Aurora", "", "Security group", c.sgId)]));
  var dsg = ok(API.createDbSubnetGroup({ name: "pharmacy-db", desc: "pharmacy db", subnetIds: prv.map(function (s) { return s.id; }) }));
  ok(API.createRds({ id: "pharmacy-db", engine: "mariadb", version: "10.11", cls: "db.t4g.small", storage: 20, user: "pharmacy", manage: true, multiAz: true, subnetGroup: dsg.name, sgIds: [sg.db.id], backupDays: 7, skipSnap: true }));
  var inst = S.insts.filter(function (i) { return i.asg === ng.asg; });
  var tp = ok(API.createTg({ name: "pharmacy-prd", port: 30080, vpcId: v.id, hcPath: "/healthz" })), td = ok(API.createTg({ name: "pharmacy-dev", port: 30081, vpcId: v.id, hcPath: "/healthz" })), ta = ok(API.createTg({ name: "pharmacy-argocd", port: 30443, proto: "HTTPS", vpcId: v.id, hcPath: "/healthz" }));
  [tp, td, ta].forEach(function (t) { ok(API.asgAttach(ng.asg, arnOf("tg", t.id, t.name))); }); void inst;
  ok(API.createAlb({ name: "pharmacy-alb", scheme: "Internet-facing", vpcId: v.id, subnetIds: pub.map(function (s) { return s.id; }), sgIds: [sg.alb.id], listeners: [{ port: 80, tgId: tp.id }, { port: 8080, tgId: td.id }, { port: 8443, tgId: ta.id }] }));
  if (kind === "managed-nonat") { var prt = byName(S.rtbs, "pharmacy-private"); prt.routes = []; }
  return mgFinish();
  function mgFinish() { if (!S.laptop.creds) { var tu = API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, tk = API.createAccessKey(tu.id, "CLI", ""); S.laptop.creds = { id: tk.res.id, secretHash: hash32(tk.secret), region: "ap-southeast-1" }; S.laptop.awsRegion = "ap-southeast-1"; } S.managedKind = kind; }
}
