// ===== Terraform แบบจำลอง (2/3): provider aws/local ที่คุยกับ AWS จำลอง =====
function tfReqId() { return fakeId("", 8, "0123456789abcdef") + "-" + fakeId("", 4, "0123456789abcdef") + "-" + fakeId("", 4, "0123456789abcdef") + "-" + fakeId("", 4, "0123456789abcdef") + "-" + fakeId("", 12, "0123456789abcdef"); }
function TfAwsError(label, svc, op, code, msg) { var e = new Error(label + ": operation error " + svc + ": " + op + ", https response error StatusCode: 400, RequestID: " + tfReqId() + ", api error " + code + ": " + msg); e.tfAws = true; return e; }
function firstErr(r) { var k = Object.keys(r.errors)[0]; var m = String(r.errors[k]); var mm = /^([A-Za-z.]+): ([\s\S]*)$/.exec(m); return mm ? { code: mm[1], msg: mm[2] } : { code: "InvalidParameterValue", msg: m }; }
function tfOk(r, label, svc, op) { if (r && r.errors) { var f = firstErr(r); throw TfAwsError(label, svc, op, f.code, f.msg); } return r.res; }
function tfGate(act, label, svc, op) {
  var who = whoAmI();
  if (who.err) throw TfAwsError(label, svc, op, who.err, who.msg);
  if (!canDo(who, act)) throw TfAwsError(label, svc, op, "UnauthorizedOperation", "You are not authorized to perform this operation. User: " + who.arn + " is not authorized to perform: " + act + " because no identity-based policy allows the " + act + " action");
}
function tagList(tags) { return Object.keys(tags || {}).filter(function (k) { return k !== "Name"; }).map(function (k) { return { k: k, v: tags[k] }; }); }
function tfSortedKeys(a) { return (a || []).slice().sort(); }
function byArnTg(arn) { return S.tgs.filter(function (t) { return arnOf("tg", t.id, t.name) === arn; })[0] || null; }
function byArnLb(arn) { return S.albs.filter(function (t) { return arnOf("alb", t.id, t.name) === arn; })[0] || null; }
function sgRulesReadable(list) { return list.map(sgKey).sort(); }
function defaultVpcId() { return defaultVpc().id; }
function depViolation(label, svc, op, msg) { return TfAwsError(label, svc, op, "DependencyViolation", msg); }
function tfPutTags(r, tags) { setTags(r, tags); }

var TF_PROV = {
  aws_vpc: {
    act: "ec2:CreateVpc", svc: "EC2", op: "CreateVpc", what: "EC2 VPC",
    create: function (c) {
      var a = c.attrs, v = tfOk(API.createVpc({ name: (c.tags || {}).Name || "", cidr: a.cidr_block, dns: false }), "creating EC2 VPC", "EC2", "CreateVpc");
      API.setDns(v.id, !!a.enable_dns_hostnames, a.enable_dns_support !== false); tfPutTags(v, c.tags);
      return { id: v.id, computed: { id: v.id, arn: arnOf("vpc", v.id), cidr_block: v.cidr, main_route_table_id: rtbMain(v.id).id, default_security_group_id: defaultSg(v.id).id, owner_id: ACCOUNT } };
    },
    update: function (st, d) { var v = find(S.vpcs, st.id); API.setDns(v.id, !!d.enable_dns_hostnames, d.enable_dns_support !== false); tfPutTags(v, d.tags); },
    del: function (st) {
      var v = find(S.vpcs, st.id); if (!v) return;
      var dep = liveInsts(v.id).length || S.albs.some(function (x) { return x.vpcId === v.id; }) || S.subnets.some(function (x) { return x.vpcId === v.id; }) || S.igws.some(function (x) { return x.vpcId === v.id; }) || S.rtbs.some(function (x) { return x.vpcId === v.id && !x.main; }) || S.sgs.some(function (x) { return x.vpcId === v.id && x.name !== "default"; });
      if (dep) throw depViolation("deleting EC2 VPC (" + v.id + ")", "EC2", "DeleteVpc", "The vpc '" + v.id + "' has dependencies and cannot be deleted.");
      S.rtbs = S.rtbs.filter(function (x) { return x.vpcId !== v.id; }); S.sgs = S.sgs.filter(function (x) { return x.vpcId !== v.id; }); S.vpcs = S.vpcs.filter(function (x) { return x.id !== v.id; });
    },
    read: function (st) { var v = find(S.vpcs, st.id); return v ? { cfg: { enable_dns_hostnames: v.dnsHostnames, enable_dns_support: v.dnsResolution, tags: v.tagMap || (v.name ? { Name: v.name } : {}) }, computed: {} } : null; }
  },
  aws_internet_gateway: {
    act: "ec2:CreateInternetGateway", svc: "EC2", op: "CreateInternetGateway",
    create: function (c) {
      var g = tfOk(API.createIgw({ name: (c.tags || {}).Name || "" }), "creating EC2 Internet Gateway", "EC2", "CreateInternetGateway"); tfPutTags(g, c.tags);
      if (c.attrs.vpc_id) tfOk(API.attachIgw(g.id, c.attrs.vpc_id), "attaching EC2 Internet Gateway (" + g.id + ") to VPC (" + c.attrs.vpc_id + ")", "EC2", "AttachInternetGateway");
      return { id: g.id, computed: { id: g.id, arn: arnOf("igw", g.id), owner_id: ACCOUNT } };
    },
    update: function (st, d) { var g = find(S.igws, st.id); tfPutTags(g, d.tags); },
    del: function (st) {
      var g = find(S.igws, st.id); if (!g) return;
      if (g.vpcId) { var p = delPlan("igw-detach", g.id); if (p.blockers.length) throw depViolation("detaching EC2 Internet Gateway (" + g.id + ") from VPC (" + g.vpcId + ")", "EC2", "DetachInternetGateway", "Network " + g.vpcId + " has some mapped public address(es). Please unmap those public address(es) before detaching the gateway."); g.vpcId = null; }
      S.igws = S.igws.filter(function (x) { return x.id !== g.id; });
    },
    read: function (st) { var g = find(S.igws, st.id); return g ? { cfg: { vpc_id: g.vpcId, tags: g.tagMap || (g.name ? { Name: g.name } : {}) }, computed: {} } : null; }
  },
  aws_subnet: {
    act: "ec2:CreateSubnet", svc: "EC2", op: "CreateSubnet",
    create: function (c) {
      var a = c.attrs, r = tfOk(API.createSubnet({ vpcId: a.vpc_id, list: [{ name: (c.tags || {}).Name || "", az: a.availability_zone || "", cidr: a.cidr_block }] }), "creating EC2 Subnet", "EC2", "CreateSubnet"), s = r[0];
      if (a.map_public_ip_on_launch) API.setAutoIp(s.id, true); tfPutTags(s, c.tags);
      return { id: s.id, computed: { id: s.id, arn: arnOf("subnet", s.id), availability_zone: s.az, cidr_block: s.cidr, owner_id: ACCOUNT } };
    },
    update: function (st, d) { var s = find(S.subnets, st.id); API.setAutoIp(s.id, !!d.map_public_ip_on_launch); tfPutTags(s, d.tags); },
    del: function (st) {
      var s = find(S.subnets, st.id); if (!s) return; var p = delPlan("subnet", s.id);
      if (p.blockers.length) throw depViolation("deleting EC2 Subnet (" + s.id + ")", "EC2", "DeleteSubnet", "The subnet '" + s.id + "' has dependencies and cannot be deleted.");
      API.del("subnet", s.id, "delete");
    },
    read: function (st) { var s = find(S.subnets, st.id); return s ? { cfg: { map_public_ip_on_launch: s.autoIp, tags: s.tagMap || (s.name ? { Name: s.name } : {}) }, computed: {} } : null; }
  },
  aws_route_table: {
    act: "ec2:CreateRouteTable", svc: "EC2", op: "CreateRouteTable",
    rows: function (a) { return (a.route || []).map(function (x) { return { dest: x.cidr_block, target: x.gateway_id }; }); },
    create: function (c) {
      var t = tfOk(API.createRtb({ name: (c.tags || {}).Name || "", vpcId: c.attrs.vpc_id }), "creating Route Table", "EC2", "CreateRouteTable"); tfPutTags(t, c.tags);
      var rows = TF_PROV.aws_route_table.rows(c.attrs);
      if (rows.length) { var x = API.setRoutes(t.id, rows); if (x.errors) { var f = firstErr(x); throw TfAwsError("creating Route in Route Table (" + t.id + ") with destination (" + rows[0].dest + ")", "EC2", "CreateRoute", f.code, f.msg); } }
      return { id: t.id, computed: { id: t.id, arn: arnOf("rtb", t.id), owner_id: ACCOUNT } };
    },
    update: function (st, d) { var t = find(S.rtbs, st.id); tfPutTags(t, d.tags); var x = API.setRoutes(t.id, TF_PROV.aws_route_table.rows(d)); if (x.errors) { var f = firstErr(x); throw TfAwsError("updating Route Table (" + t.id + ")", "EC2", "ReplaceRoute", f.code, f.msg); } },
    del: function (st) { var t = find(S.rtbs, st.id); if (!t) return; if (t.assoc.length) throw depViolation("deleting Route Table (" + t.id + ")", "EC2", "DeleteRouteTable", "The routeTable '" + t.id + "' has dependencies and cannot be deleted."); S.rtbs = S.rtbs.filter(function (x) { return x.id !== t.id; }); },
    read: function (st) { var t = find(S.rtbs, st.id); return t ? { cfg: { route: t.routes.map(function (x) { return { cidr_block: x.dest, gateway_id: x.target }; }), tags: t.tagMap || (t.name ? { Name: t.name } : {}) }, computed: {} } : null; }
  },
  aws_route_table_association: {
    act: "ec2:AssociateRouteTable", svc: "EC2", op: "AssociateRouteTable",
    create: function (c) {
      var t = find(S.rtbs, c.attrs.route_table_id), sn = find(S.subnets, c.attrs.subnet_id);
      if (!t) throw TfAwsError("creating Route Table Association", "EC2", "AssociateRouteTable", "InvalidRouteTableID.NotFound", "The routeTable ID '" + c.attrs.route_table_id + "' does not exist");
      if (!sn) throw TfAwsError("creating Route Table Association", "EC2", "AssociateRouteTable", "InvalidSubnetID.NotFound", "The subnet ID '" + c.attrs.subnet_id + "' does not exist");
      API.setAssoc(t.id, t.assoc.filter(function (x) { return x !== sn.id; }).concat([sn.id]));
      var id = rid("rtbassoc"); return { id: id, computed: { id: id }, sim: { rtb: t.id, subnet: sn.id } };
    },
    update: function () {},
    del: function (st) { var t = find(S.rtbs, st.sim.rtb); if (t) t.assoc = t.assoc.filter(function (x) { return x !== st.sim.subnet; }); },
    read: function (st) { var t = find(S.rtbs, st.sim.rtb); return t && t.assoc.indexOf(st.sim.subnet) >= 0 ? { cfg: {}, computed: {} } : null; }
  },
  aws_security_group: {
    act: "ec2:CreateSecurityGroup", svc: "EC2", op: "CreateSecurityGroup",
    rules: function (blocks, selfId, vpcId, label) {
      var flat = tfSgFlat(blocks, selfId);
      flat.forEach(function (r) { if (r.srcKind === "sg") { var g = find(S.sgs, r.src); if (!g) throw TfAwsError(label, "EC2", "AuthorizeSecurityGroupIngress", "InvalidGroup.NotFound", "The security group '" + r.src + "' does not exist"); if (g.vpcId !== vpcId) throw TfAwsError(label, "EC2", "AuthorizeSecurityGroupIngress", "InvalidGroup.NotFound", "You have specified two resources that belong to different networks."); } else if (!parseCidr(r.src)) throw TfAwsError(label, "EC2", "AuthorizeSecurityGroupIngress", "InvalidParameterValue", "Invalid CIDR " + r.src); });
      return flat;
    },
    create: function (c) {
      var a = c.attrs, vpcId = a.vpc_id || defaultVpcId(), nm0 = a.name || ("terraform-" + fakeId("", 14, "0123456789"));
      var g = tfOk(API.createSgRaw({ name: nm0, desc: a.description === undefined ? "Managed by Terraform" : a.description, vpcId: vpcId }), "creating Security Group (" + nm0 + ")", "EC2", "CreateSecurityGroup"); tfPutTags(g, Object.assign({}, c.tags, { Name: (c.tags || {}).Name !== undefined ? c.tags.Name : undefined })); if ((c.tags || {}).Name === undefined) g.name = nm0;
      try { g.inbound = TF_PROV.aws_security_group.rules(a.ingress, g.id, vpcId, "authorizing Security Group (" + g.id + ") Ingress Rules"); g.outbound = TF_PROV.aws_security_group.rules(a.egress, g.id, vpcId, "authorizing Security Group (" + g.id + ") Egress Rules"); }
      catch (e) { S.sgs = S.sgs.filter(function (x) { return x.id !== g.id; }); throw e; }
      return { id: g.id, computed: { id: g.id, arn: arnOf("sg", g.id), name: g.name, vpc_id: vpcId, owner_id: ACCOUNT } };
    },
    update: function (st, d) { var g = find(S.sgs, st.id); if (d.tags) tfPutTags(g, Object.assign({}, d.tags)); g.name = st.computed.name; g.inbound = TF_PROV.aws_security_group.rules(d.ingress, g.id, g.vpcId, "updating Security Group (" + g.id + ") Ingress Rules"); g.outbound = TF_PROV.aws_security_group.rules(d.egress, g.id, g.vpcId, "updating Security Group (" + g.id + ") Egress Rules"); },
    del: function (st) { var g = find(S.sgs, st.id); if (!g) return; var p = delPlan("sg", g.id); if (p.blockers.length) throw depViolation("deleting Security Group (" + g.id + ")", "EC2", "DeleteSecurityGroup", "resource " + g.id + " has a dependent object"); S.sgs = S.sgs.filter(function (x) { return x.id !== g.id; }); },
    read: function (st) { var g = find(S.sgs, st.id); return g ? { cfg: { __ingress: sgRulesReadable(g.inbound), __egress: sgRulesReadable(g.outbound) }, computed: {} } : null; }
  },
  aws_key_pair: {
    act: "ec2:ImportKeyPair", svc: "EC2", op: "ImportKeyPair",
    create: function (c) {
      var a = c.attrs, nm0 = a.key_name || ("terraform-" + fakeId("", 14, "0123456789"));
      var k = tfOk(API.importKey({ name: nm0, pub: String(a.public_key || "").trim() }), "importing EC2 Key Pair (" + nm0 + ")", "EC2", "ImportKeyPair");
      if (!/^(ssh-ed25519|ssh-rsa) /.test(String(a.public_key || ""))) { S.keys = S.keys.filter(function (x) { return x.id !== k.id; }); throw TfAwsError("importing EC2 Key Pair (" + nm0 + ")", "EC2", "ImportKeyPair", "InvalidKey.Format", "Key is not in valid OpenSSH public key format"); }
      return { id: nm0, computed: { id: nm0, key_name: nm0, key_pair_id: k.id, fingerprint: fpr(nm0), arn: arnOf("key", k.id) }, sim: { key: k.id } };
    },
    update: function () {}, del: function (st) { S.keys = S.keys.filter(function (x) { return x.id !== st.sim.key; }); },
    read: function (st) { return find(S.keys, st.sim.key) ? { cfg: {}, computed: {} } : null; }
  },
  aws_iam_role: {
    act: "iam:CreateRole", svc: "IAM", op: "CreateRole",
    create: function (c) {
      var a = c.attrs, nm0 = a.name || ("terraform-" + fakeId("", 14, "0123456789"));
      var r = tfOk(API.createRoleRaw({ name: nm0, trust: a.assume_role_policy, desc: a.description }), "creating IAM Role (" + nm0 + ")", "IAM", "CreateRole"); tfPutTags(r, Object.assign({}, c.tags, { Name: undefined }));
      return { id: nm0, computed: { id: nm0, name: nm0, arn: arnOf("role", r.id, nm0), unique_id: "AROAEXAMPLE" + r.id.slice(-9).toUpperCase() }, sim: { role: r.id } };
    },
    update: function (st, d) { var r = find(S.roles, st.sim.role); r.desc = d.description || ""; },
    del: function (st) {
      var r = find(S.roles, st.sim.role); if (!r) return;
      if (r.policies.length) throw TfAwsError("deleting IAM Role (" + r.name + ")", "IAM", "DeleteRole", "DeleteConflict", "Cannot delete entity, must detach all policies first.");
      if (r.profile) throw TfAwsError("deleting IAM Role (" + r.name + ")", "IAM", "DeleteRole", "DeleteConflict", "Cannot delete entity, must remove roles from instance profile first.");
      S.roles = S.roles.filter(function (x) { return x.id !== r.id; });
    },
    read: function (st) { return find(S.roles, st.sim.role) ? { cfg: {}, computed: {} } : null; }
  },
  aws_iam_role_policy_attachment: {
    act: "iam:AttachRolePolicy", svc: "IAM", op: "AttachRolePolicy",
    create: function (c) {
      var a = c.attrs, r = S.roles.filter(function (x) { return x.name === a.role; })[0], pn = String(a.policy_arn || "").split("/").pop(), label = "attaching IAM Policy (" + a.policy_arn + ") to IAM Role (" + a.role + ")";
      if (!r) throw TfAwsError(label, "IAM", "AttachRolePolicy", "NoSuchEntity", "The role with name " + a.role + " cannot be found.");
      if (POLICIES.indexOf(pn) < 0 || !/^arn:aws:iam::aws:policy\//.test(a.policy_arn)) throw TfAwsError(label, "IAM", "AttachRolePolicy", "NoSuchEntity", "Policy " + a.policy_arn + " does not exist or is not attachable.");
      if (r.policies.indexOf(pn) < 0) r.policies.push(pn);
      var id = a.role + "-" + fakeId("", 26, "0123456789abcdef"); return { id: id, computed: { id: id }, sim: { role: r.id, policy: pn } };
    },
    update: function () {}, del: function (st) { var r = find(S.roles, st.sim.role); if (r) r.policies = r.policies.filter(function (x) { return x !== st.sim.policy; }); },
    read: function (st) { var r = find(S.roles, st.sim.role); return r && r.policies.indexOf(st.sim.policy) >= 0 ? { cfg: {}, computed: {} } : null; }
  },
  aws_iam_instance_profile: {
    act: "iam:CreateInstanceProfile", svc: "IAM", op: "CreateInstanceProfile",
    create: function (c) {
      var a = c.attrs, nm0 = a.name || ("terraform-" + fakeId("", 14, "0123456789")), label = "creating IAM Instance Profile (" + nm0 + ")";
      if (S.roles.some(function (x) { return x.profile === nm0; })) throw TfAwsError(label, "IAM", "CreateInstanceProfile", "EntityAlreadyExists", "Instance Profile " + nm0 + " already exists.");
      var r = S.roles.filter(function (x) { return x.name === a.role; })[0];
      if (a.role && !r) throw TfAwsError("adding IAM Role (" + a.role + ") to IAM Instance Profile (" + nm0 + ")", "IAM", "AddRoleToInstanceProfile", "NoSuchEntity", "The role with name " + a.role + " cannot be found.");
      if (r) r.profile = nm0;
      S.tf.fresh = S.tf.fresh || {}; S.tf.fresh[nm0] = S.tf.serial;
      return { id: nm0, computed: { id: nm0, name: nm0, arn: arnOf("profile", nm0, nm0), role: a.role || "" }, sim: { role: r ? r.id : null, profile: nm0 } };
    },
    update: function () {},
    del: function (st) { var r = find(S.roles, st.sim.role); if (r && r.profile === st.sim.profile) r.profile = ""; },
    read: function (st) { var r = find(S.roles, st.sim.role); return r && r.profile === st.sim.profile ? { cfg: {}, computed: {} } : null; }
  },
  aws_ecr_repository: {
    act: "ecr:CreateRepository", svc: "ECR", op: "CreateRepository",
    create: function (c) {
      var a = c.attrs, r = tfOk(API.createRepo({ name: a.name, mutable: a.image_tag_mutability !== "IMMUTABLE", forceDelete: !!a.force_delete }), "creating ECR Repository (" + a.name + ")", "ECR", "CreateRepository"); tfPutTags(r, Object.assign({}, c.tags, { Name: undefined }));
      return { id: a.name, computed: { id: a.name, arn: arnOf("repo", r.id, a.name), repository_url: r.uri, registry_id: ACCOUNT }, sim: { repo: r.id } };
    },
    update: function (st, d) { var r = find(S.repos, st.sim.repo); r.mutable = d.image_tag_mutability !== "IMMUTABLE"; r.forceDelete = !!d.force_delete; },
    del: function (st) { var r = find(S.repos, st.sim.repo); if (!r) return; if (r.images.length && !st.cfg.force_delete) throw TfAwsError("deleting ECR Repository (" + r.name + ")", "ECR", "DeleteRepository", "RepositoryNotEmptyException", "The repository with name '" + r.name + "' in registry with id '" + ACCOUNT + "' cannot be deleted because it still contains images"); S.repos = S.repos.filter(function (x) { return x.id !== r.id; }); },
    read: function (st) { var r = find(S.repos, st.sim.repo); return r ? { cfg: { image_tag_mutability: r.mutable ? "MUTABLE" : "IMMUTABLE" }, computed: {} } : null; }
  },
  aws_instance: {
    act: "ec2:RunInstances", svc: "EC2", op: "RunInstances",
    create: function (c) {
      var a = c.attrs, label = "creating EC2 Instance", sn = a.subnet_id ? find(S.subnets, a.subnet_id) : S.subnets.filter(function (x) { return x.vpcId === defaultVpcId(); })[0];
      if (a.subnet_id && !sn) throw TfAwsError(label, "EC2", "RunInstances", "InvalidSubnetID.NotFound", "The subnet ID '" + a.subnet_id + "' does not exist");
      if (!AMIS.some(function (x) { return x[0] === a.ami; })) throw TfAwsError(label, "EC2", "RunInstances", "InvalidAMIID.NotFound", "The image id '[" + a.ami + "]' does not exist");
      if (a.key_name && !byName(S.keys, a.key_name)) throw TfAwsError(label, "EC2", "RunInstances", "InvalidKeyPair.NotFound", "The key pair '" + a.key_name + "' does not exist");
      if (S.faults.eventual && a.iam_instance_profile && S.tf.fresh && S.tf.fresh[a.iam_instance_profile] === S.tf.serial && !(S.tf.hit || {})[a.iam_instance_profile]) { S.tf.hit = S.tf.hit || {}; S.tf.hit[a.iam_instance_profile] = 1; throw TfAwsError(label, "EC2", "RunInstances", "InvalidParameterValue", "Value (" + a.iam_instance_profile + ") for parameter iamInstanceProfile.name is invalid. Invalid IAM Instance Profile name"); }
      if (a.iam_instance_profile && !S.roles.some(function (x) { return x.profile === a.iam_instance_profile; })) throw TfAwsError(label, "EC2", "RunInstances", "InvalidParameterValue", "Value (" + a.iam_instance_profile + ") for parameter iamInstanceProfile.name is invalid. Invalid IAM Instance Profile name");
      var md = (a.metadata_options || [{}])[0], rb = (a.root_block_device || [{}])[0];
      var autoIp = a.associate_public_ip_address === undefined ? (sn && sn.autoIp ? "Enable" : "Disable") : (a.associate_public_ip_address ? "Enable" : "Disable");
      var made = tfOk(API.launch({ name: (c.tags || {}).Name || "", tags: tagList(c.tags), ami: a.ami, type: a.instance_type, keyName: a.key_name || "", vpcId: sn.vpcId, subnetId: sn.id, autoIp: autoIp, sgIds: a.vpc_security_group_ids || [], diskSize: rb.volume_size || 8, diskType: rb.volume_type || "gp2", profile: a.iam_instance_profile || "", tokens: md.http_tokens === "required" ? "required" : "optional", hop: md.http_put_response_hop_limit || 1, count: 1 }), label, "EC2", "RunInstances"), i = made[0];
      return { id: i.id, computed: { id: i.id, arn: arnOf("inst", i.id), public_ip: i.publicIp, private_ip: i.privateIp, public_dns: i.publicIp ? "ec2-" + i.publicIp.replace(/\./g, "-") + "." + REGION + ".compute.lab.invalid" : "", instance_state: "running", subnet_id: sn.id, availability_zone: i.az } };
    },
    update: function (st, d, changed) {
      var i = find(S.instsAll || S.insts, st.id); if (!i) return;
      if (changed.indexOf("tags") >= 0) { var nm0 = (d.tags || {}).Name; i.name = nm0 === undefined ? i.name : nm0; i.tags = tagList(d.tags); }
      if (changed.indexOf("vpc_security_group_ids") >= 0) i.sgIds = (d.vpc_security_group_ids || []).slice();
      if (changed.indexOf("iam_instance_profile") >= 0) { var x = API.setInstanceRole(i.id, d.iam_instance_profile || "", "Detach"); if (x.errors) { var f = firstErr(x); throw TfAwsError("updating EC2 Instance (" + i.id + ") IAM Instance Profile", "EC2", "ReplaceIamInstanceProfileAssociation", f.code, f.msg); } }
      if (changed.indexOf("instance_type") >= 0) { var was = i.state; if (was === "running") API.instState(i.id, "stop"); var y = API.changeType(i.id, d.instance_type); if (y.errors) throw TfAwsError("updating EC2 Instance (" + i.id + ") instance type", "EC2", "ModifyInstanceAttribute", "InvalidParameterValue", firstErr(y).msg); if (was === "running") API.instState(i.id, "start"); }
    },
    del: function (st) { var i = find(S.insts, st.id); if (i && i.state !== "terminated") API.instState(i.id, "terminate"); },
    read: function (st) {
      var i = find(S.insts, st.id); if (!i || i.state === "terminated") return null;
      var tg = Object.assign({}, i.name ? { Name: i.name } : {}); (i.tags || []).forEach(function (t) { tg[t.k] = t.v; });
      return { cfg: { instance_type: i.type, vpc_security_group_ids: tfSortedKeys(i.sgIds), iam_instance_profile: i.profile || undefined, tags: tg }, computed: { public_ip: i.publicIp, private_ip: i.privateIp, public_dns: i.publicIp ? "ec2-" + i.publicIp.replace(/\./g, "-") + "." + REGION + ".compute.lab.invalid" : "", instance_state: i.state } };
    }
  },
  aws_lb: {
    act: "elasticloadbalancing:CreateLoadBalancer", svc: "Elastic Load Balancing v2", op: "CreateLoadBalancer",
    create: function (c) {
      var a = c.attrs, label = "creating ELBv2 Application Load Balancer (" + a.name + ")";
      if (a.load_balancer_type && a.load_balancer_type !== "application") throw TfAwsError(label, "Elastic Load Balancing v2", "CreateLoadBalancer", "ValidationError", "Console Lab จำลองเฉพาะ load_balancer_type = \"application\"");
      var lb = tfOk(API.createAlbRaw({ name: a.name, internal: !!a.internal, subnetIds: a.subnets, sgIds: a.security_groups }), label, "Elastic Load Balancing v2", "CreateLoadBalancer"); tfPutTags(lb, Object.assign({}, c.tags, { Name: undefined }));
      return { id: arnOf("alb", lb.id, lb.name), computed: { id: arnOf("alb", lb.id, lb.name), arn: arnOf("alb", lb.id, lb.name), dns_name: lb.dns, vpc_id: lb.vpcId }, sim: { lb: lb.id } };
    },
    update: function () {}, del: function (st) { S.albs = S.albs.filter(function (x) { return x.id !== st.sim.lb; }); },
    read: function (st) { return find(S.albs, st.sim.lb) ? { cfg: {}, computed: {} } : null; }
  },
  aws_lb_target_group: {
    act: "elasticloadbalancing:CreateTargetGroup", svc: "Elastic Load Balancing v2", op: "CreateTargetGroup",
    create: function (c) {
      var a = c.attrs, label = "creating ELBv2 Target Group (" + a.name + ")", hc = (a.health_check || [{}])[0];
      var t = tfOk(API.createTg({ name: a.name, port: a.port, proto: a.protocol, vpcId: a.vpc_id, hcPath: hc.path || "/", targets: [] }), label, "Elastic Load Balancing v2", "CreateTargetGroup"); tfPutTags(t, Object.assign({}, c.tags, { Name: undefined }));
      var arn = arnOf("tg", t.id, t.name); return { id: arn, computed: { id: arn, arn: arn, name: t.name }, sim: { tg: t.id } };
    },
    update: function () {},
    del: function (st) { var t = find(S.tgs, st.sim.tg); if (!t) return; if (S.albs.some(function (a) { return a.listeners.some(function (l) { return l.tgId === t.id; }); })) throw TfAwsError("deleting ELBv2 Target Group (" + st.id + ")", "Elastic Load Balancing v2", "DeleteTargetGroup", "ResourceInUse", "Target group '" + st.id + "' is currently in use by a listener or a rule"); S.tgs = S.tgs.filter(function (x) { return x.id !== t.id; }); },
    read: function (st) { return find(S.tgs, st.sim.tg) ? { cfg: {}, computed: {} } : null; }
  },
  aws_lb_target_group_attachment: {
    act: "elasticloadbalancing:RegisterTargets", svc: "Elastic Load Balancing v2", op: "RegisterTargets",
    create: function (c) {
      var a = c.attrs, t = byArnTg(a.target_group_arn), label = "registering ELBv2 Target Group (" + a.target_group_arn + ") Target (" + a.target_id + ")";
      if (!t) throw TfAwsError(label, "Elastic Load Balancing v2", "RegisterTargets", "TargetGroupNotFound", "One or more target groups not found");
      var i = find(S.insts, a.target_id); if (!i) throw TfAwsError(label, "Elastic Load Balancing v2", "RegisterTargets", "InvalidTarget", "The following targets are not valid: " + a.target_id);
      if (i.vpcId !== t.vpcId) throw TfAwsError(label, "Elastic Load Balancing v2", "RegisterTargets", "InvalidTarget", "The following targets are not in the target group VPC: " + a.target_id);
      t.targets.push({ instId: i.id, port: +a.port || t.port }); var id = "terraform-" + fakeId("", 26, "0123456789abcdef"); return { id: id, computed: { id: id }, sim: { tg: t.id, inst: i.id } };
    },
    update: function () {}, del: function (st) { var t = find(S.tgs, st.sim.tg); if (t) t.targets = t.targets.filter(function (x) { return x.instId !== st.sim.inst; }); },
    read: function (st) { var t = find(S.tgs, st.sim.tg); return t && t.targets.some(function (x) { return x.instId === st.sim.inst; }) ? { cfg: {}, computed: {} } : null; }
  },
  aws_lb_listener: {
    act: "elasticloadbalancing:CreateListener", svc: "Elastic Load Balancing v2", op: "CreateListener",
    create: function (c) {
      var a = c.attrs, lb = byArnLb(a.load_balancer_arn), da = (a.default_action || [{}])[0], t = byArnTg(da.target_group_arn), label = "creating ELBv2 Listener (" + a.load_balancer_arn + ")";
      if (!lb) throw TfAwsError(label, "Elastic Load Balancing v2", "CreateListener", "LoadBalancerNotFound", "One or more load balancers not found");
      if (!t) throw TfAwsError(label, "Elastic Load Balancing v2", "CreateListener", "TargetGroupNotFound", "One or more target groups not found");
      var port = +a.port || 80; if (lb.listeners.some(function (l) { return l.port === port; })) throw TfAwsError(label, "Elastic Load Balancing v2", "CreateListener", "DuplicateListener", "A listener already exists on this port for this load balancer");
      if (t.vpcId !== lb.vpcId) throw TfAwsError(label, "Elastic Load Balancing v2", "CreateListener", "InvalidConfigurationRequest", "Target group " + t.name + " must be in the same VPC as the load balancer");
      lb.listeners.push({ proto: "HTTP", port: port, tgId: t.id }); var id = lb.id + ":" + port; return { id: id, computed: { id: id, arn: id }, sim: { lb: lb.id, port: port } };
    },
    update: function () {}, del: function (st) { var lb = find(S.albs, st.sim.lb); if (lb) lb.listeners = lb.listeners.filter(function (l) { return l.port !== st.sim.port; }); },
    read: function (st) { var lb = find(S.albs, st.sim.lb); return lb && lb.listeners.some(function (l) { return l.port === st.sim.port; }) ? { cfg: {}, computed: {} } : null; }
  },
  local_file: {
    act: null,
    create: function (c) { var p = normPath(c.attrs.filename, REPO + "/terraform"); fsWrite(p, c.attrs.content === undefined ? "" : c.attrs.content); return { id: hash32(c.attrs.content || "") + hash32(p), computed: { id: hash32(c.attrs.content || "") + hash32(p) }, sim: { path: p } }; },
    update: function () {}, del: function (st) { fsRemove(st.sim.path); },
    read: function (st) { return fsRead(st.sim.path) !== null ? { cfg: {}, computed: {} } : null; }
  }
};
// ---- data sources
function tfReadData(node, env, attrs) {
  var t = node.type;
  if (t === "aws_availability_zones") { var who = whoAmI(); if (who.err) throw TfAwsError("reading Availability Zones", "EC2", "DescribeAvailabilityZones", who.err, who.msg); return { names: AZS.slice(), zone_ids: ["apse1-az2", "apse1-az1", "apse1-az3"], id: REGION }; }
  if (t === "aws_caller_identity") { var w = whoAmI(); if (w.err) throw TfAwsError("Retrieving AWS account details", "STS", "GetCallerIdentity", w.err, w.msg); return { account_id: ACCOUNT, arn: w.arn, user_id: w.userId, id: ACCOUNT }; }
  if (t === "aws_ami") {
    var who2 = whoAmI(); if (who2.err) throw TfAwsError("reading EC2 AMIs", "EC2", "DescribeImages", who2.err, who2.msg);
    var pats = []; (attrs.filter || []).forEach(function (f) { if (f.name === "name") pats = pats.concat(f.values || []); });
    var map = [["ubuntu-noble-24.04", "ami-ubuntu2404"], ["ubuntu-jammy-22.04", "ami-ubuntu2204"], ["al2023", "ami-al2023"]];
    var hit = null; map.forEach(function (m) { if (!hit && pats.some(function (p) { return String(p).indexOf(m[0]) >= 0 || (m[0] === "al2023" && /al2023/.test(p)); })) hit = m[1]; });
    var own = {"ami-ubuntu2404": "099720109477", "ami-ubuntu2204": "099720109477", "ami-al2023": "137112412989"};
    if (hit && (attrs.owners || []).length && (attrs.owners || []).indexOf(own[hit]) < 0 && (attrs.owners || []).indexOf(own[hit] === "137112412989" ? "amazon" : "x") < 0) hit = null;
    if (!hit) throw hclErr("Your query returned no results. Please change your search criteria and try again.", node.file, node.line);
    return { id: hit, name: AMIS.filter(function (a) { return a[0] === hit; })[0][1], owner_id: (attrs.owners || [])[0] || "" };
  }
  if (t === "aws_iam_policy_document") {
    var stmts = (attrs.statement || []).map(function (s) {
      var o = { Effect: s.effect || "Allow" }; if (s.actions) o.Action = s.actions.length === 1 ? s.actions[0] : s.actions; if (s.resources) o.Resource = s.resources.length === 1 ? s.resources[0] : s.resources;
      if (s.principals) { o.Principal = {}; s.principals.forEach(function (p) { o.Principal[p.type] = (p.identifiers || []).length === 1 ? p.identifiers[0] : p.identifiers; }); }
      return o;
    });
    var json = JSON.stringify({ Version: attrs.version || "2012-10-17", Statement: stmts }, null, 2);
    return { json: json, id: hash32(json) };
  }
  return {};
}
