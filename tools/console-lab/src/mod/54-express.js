// ===== Use case 8: ECS Express Mode (ให้ image + 2 role ได้ ALB/HTTPS/auto scaling/URL ให้เอง) =====
// โครงสร้างตามเอกสาร AWS (express-service-first-run / express-service-work): task def ตั้งชื่อ container "Main", ALB แชร์ได้ ≤25 service ต่อ VPC ผ่าน host-header rule,
// URL = https://<service-name>.ecs.<region>.on.aws · ข้อความ error ของเคสสิทธิ์ infrastructure role ไม่ได้อยู่ในเอกสาร (เขียนตามรูปแบบ AccessDenied ทั่วไป) ดู labs/VERIFY.md
var EXP_APP_PORT = 8000; // port ที่แอปตัวอย่าง (pharmacy/api) ฟังอยู่จริง
var EXP_INFRA_POLICY = "AmazonECSInfrastructureRoleforExpressGatewayServices";
var EXP_METRICS = ["AVERAGE_CPU", "AVERAGE_MEMORY", "REQUEST_COUNT_PER_TARGET"];
function isExpLab() { return S.exps.length > 0; }
function expOf(cluster, name) { return S.exps.filter(function (x) { return x.cluster === cluster && x.name === name; })[0] || null; }
function expByUrl(host) { return S.exps.filter(function (x) { return x.host === String(host).toLowerCase(); })[0] || null; }
function expHex(n) { return fakeId("", n, "0123456789abcdef"); }
function expRoleName(ref) { var r = ref ? roleByRef(ref) : null; return r ? r.name : String(ref || "").split("/").pop(); }
function expInfraOk(role) { return !!role && roleTrusts(role, "ecs.amazonaws.com") && role.policies.indexOf(EXP_INFRA_POLICY) >= 0; }
function expDefaultName(image) { var m = ecsImage(image), base = (m ? m.repo.split("/").pop() : String(image || "app").split("/").pop().split(":")[0]).replace(/[^A-Za-z0-9_-]/g, "") || "app"; return base + "-" + expHex(8); }
function expRoleArn(n) { return "arn:aws:iam::" + ACCOUNT + ":role/" + n; }
API.createExpress = function (o) {
  var er = {}, image = String(o.image || "").trim(), ex = roleByRef(o.execRole), inf = roleByRef(o.infraRole), cluster = String(o.cluster || "default"), name = String(o.name || "").trim() || expDefaultName(image);
  if (!image) er.image = "ValidationException: Image URI ต้องไม่ว่าง"; else if (!ecsImage(image)) er.image = "InvalidParameterException: ตัวจำลองรองรับเฉพาะ image ใน ECR ของบัญชีนี้ (<account>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag>)";
  if (!o.execRole) er.execRole = "ValidationException: ต้องเลือก Task execution role"; else if (!ex) er.execRole = "InvalidParameterException: ไม่พบ role " + o.execRole;
  if (!o.infraRole) er.infraRole = "ValidationException: ต้องเลือก Infrastructure role"; else if (!inf) er.infraRole = "InvalidParameterException: ไม่พบ role " + o.infraRole;
  else if (!roleTrusts(inf, "ecs.amazonaws.com")) er.infraRole = "InvalidParameterException: Unable to assume the role " + expRoleArn(inf.name) + ". Verify that the role exists and its trust policy allows ecs.amazonaws.com to assume it.";
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(name)) er.name = "ValidationException: ชื่อ service ใช้ตัวอักษร ตัวเลข - _ (ไม่เกิน 63 ตัว)"; else if (expOf(cluster, name) || ecsSvcOf(cluster, name)) er.name = "InvalidParameterException: Creation of service was not idempotent. (มี service ชื่อ " + name + " ใน cluster " + cluster + " แล้ว)";
  var port = o.port === undefined || o.port === "" ? 80 : +o.port; if (!(port >= 1 && port <= 65535)) er.port = "ValidationException: container port ต้อง 1-65535";
  var hp = o.healthPath === undefined || o.healthPath === "" ? "/" : String(o.healthPath); if (hp.charAt(0) !== "/") er.healthPath = "ValidationException: health check path ต้องขึ้นต้นด้วย /";
  var cpu = +(o.cpu || 1024), mem = +(o.memory || 2048);
  if (!(FARGATE_MEM[cpu] && (cpu === 2048 || cpu === 4096 ? mem >= FARGATE_MEM[cpu][0] && mem <= FARGATE_MEM[cpu][1] && mem % 1024 === 0 : FARGATE_MEM[cpu].indexOf(mem) >= 0))) er.memory = "InvalidParameterException: No Fargate configuration exists for given values: " + cpu + " CPU units / " + mem + " MiB memory";
  var mn = o.min === undefined || o.min === "" ? 1 : +o.min, mx = o.max === undefined || o.max === "" ? 20 : +o.max, metric = o.metric || "AVERAGE_CPU", tv = o.target === undefined || o.target === "" ? 60 : +o.target;
  if (!(mn >= 0 && mx >= 1 && mn <= mx)) er.min = "ValidationException: จำนวน task ต่ำสุดต้อง ≤ สูงสุด (min " + mn + " / max " + mx + ")";
  if (EXP_METRICS.indexOf(metric) < 0) er.metric = "ValidationException: auto scaling metric ต้องเป็น " + EXP_METRICS.join(" / ");
  if (!(tv > 0)) er.target = "ValidationException: target value ต้องมากกว่า 0";
  var dv = defaultVpc(), vpcId = o.vpcId || (dv && dv.id), sns = (o.subnetIds && o.subnetIds.length ? o.subnetIds.map(function (id) { return find(S.subnets, id); }) : S.subnets.filter(function (s) { return dv && s.vpcId === dv.id; })).filter(Boolean);
  if (sns.length < 2) er.subnetIds = "InvalidParameterException: ต้องมี subnet อย่างน้อย 2 AZ (ถ้าไม่ระบุ ใช้ default subnet ของ default VPC)"; else if (sns.some(function (s) { return s.vpcId !== sns[0].vpcId; })) er.subnetIds = "InvalidParameterException: subnet ต้องอยู่ VPC เดียวกัน";
  if (Object.keys(er).length) return { errors: er };
  vpcId = sns[0].vpcId; var priv = !sns.every(function (s) { return hasIgwRoute(subnetRtb(s)); }) ? true : false;
  if (!ecsClusterByName(cluster)) ecsOk(API.createEcsCluster({ name: cluster }));
  var x = { id: cluster + "/" + name, name: name, cluster: cluster, host: name.toLowerCase() + ".ecs." + REGION + ".on.aws", image: image, execRole: ex.name, infraRole: inf.name, taskRole: o.taskRole ? expRoleName(o.taskRole) : "", port: port, healthPath: hp, cpu: cpu, memory: mem, arch: o.arch || "X86_64", env: (o.env || []).filter(function (e) { return e && e.name; }), command: o.command || "", metric: metric, target: tv, min: mn, max: mx, vpcId: vpcId, subnetIds: sns.map(function (s) { return s.id; }), publicIp: !priv, logGroup: o.logGroup || "/aws/ecs/" + cluster + "/" + name + "-" + expHex(4), logPrefix: o.logPrefix || "ecs", tags: Object.assign({}, o.tags || {}), born: Date.now(), touched: Date.now(), cert: "arn:aws:acm:" + REGION + ":" + ACCOUNT + ":certificate/" + fakeId("", 8, "0123456789abcdef") + "-" + fakeId("", 4, "0123456789abcdef") + "-" + fakeId("", 12, "0123456789abcdef"), fail: null, deploys: [{ n: 1, born: Date.now(), image: image }] };
  S.exps.push(x);
  if (!expInfraOk(inf)) { x.fail = { stage: "infra", resource: "Application Load Balancer", msg: "AccessDenied: User: arn:aws:sts::" + ACCOUNT + ":assumed-role/" + inf.name + "/ECS is not authorized to perform: elasticloadbalancing:CreateLoadBalancer because no identity-based policy allows the elasticloadbalancing:CreateLoadBalancer action (infrastructure role ไม่มี " + EXP_INFRA_POLICY + ")" }; return { res: x }; }
  // ประกอบ resource ให้เอง: log group, task definition (container "Main"), SG, ALB (แชร์), target group, listener rule, ECS service
  if (!S.lgs.some(function (g) { return g.name === x.logGroup; })) ecsOk(API.createLogGroup({ name: x.logGroup, retention: 0 }));
  var td = ecsOk(API.registerTd({ family: name, cpu: cpu, memory: mem, execRole: ex.name, taskRole: x.taskRole, containers: [{ name: "Main", image: image, port: port, env: x.env, secrets: [], logGroup: x.logGroup, logPrefix: x.logPrefix }] }));
  function R(type, p, k, src) { return { type: type, port: p, srcKind: k, src: src }; }
  var alb = S.albs.filter(function (a) { return a.express && a.vpcId === vpcId && S.exps.filter(function (e) { return e.albId === a.id; }).length < 25; })[0];
  if (!alb) {
    var lsg = ecsOk(API.createSg({ name: "ecs-express-gateway-alb-sg-" + expHex(6), desc: "Security group for ECS Express Mode load balancer", vpcId: vpcId, rows: [] })); ecsOk(API.setInbound(lsg.id, [R("HTTPS", "", "Anywhere-IPv4")]));
    alb = ecsOk(API.createAlbRaw({ name: "ecs-express-gateway-alb-" + expHex(8), vpcId: vpcId, subnetIds: x.subnetIds, sgIds: [lsg.id] })); alb.express = true;
  }
  var ssg = ecsOk(API.createSg({ name: "ecs-express-gateway-service-sg-" + expHex(6), desc: "Security group for ECS Express Mode service " + name, vpcId: vpcId, rows: [] })); ecsOk(API.setInbound(ssg.id, [R("Custom TCP", String(port), "Security group", alb.sgIds[0])]));
  var tg = ecsOk(API.createTg({ name: ("ecs-express-" + name).slice(0, 26) + "-" + expHex(4), port: port, vpcId: vpcId, hcPath: hp, targets: [], targetType: "ip" }));
  alb.listeners.push({ port: 443, proto: "HTTPS", tgId: tg.id, host: x.host }); // 1 listener จริง + host-header rule ต่อ service (แสดงเป็นแถวต่อ service)
  var svc = ecsOk(API.createEcsService({ name: name, cluster: cluster, td: td.family + ":" + td.rev, desired: mn, subnetIds: x.subnetIds, sgIds: [ssg.id], publicIp: x.publicIp, lb: { tgArn: arnOf("tg", tg.id, tg.name), container: "Main", port: port } }));
  svc.express = true; x.albId = alb.id; x.tgId = tg.id; x.sgId = ssg.id; x.tdId = td.id; x.svcId = svc.id;
  return { res: x };
};
function ecsOk(r) { if (r && r.errors) throw new Error(JSON.stringify(r.errors)); return r.res; }
API.updateExpress = function (cluster, name, o) {
  var x = expOf(cluster, name); if (!x) return E("_", "ServiceNotFoundException: Express service not found");
  if (x.fail) return E("_", "InvalidParameterException: service อยู่ในสถานะ provisioning failed (แก้ role แล้วสร้างใหม่)");
  var s = ecsSvcOf(cluster, name), td = ecsTdByRef(s.td), c = td.containers[0];
  if (o.image) { var ni = ecsImage(o.image); if (!ni) return E("image", "InvalidParameterException: image ต้องเป็น ECR URI"); x.image = o.image; x.deploys.unshift({ n: x.deploys.length + 1, born: Date.now(), image: o.image }); x.touched = Date.now(); s.touched = Date.now();
    var ntd = ecsOk(API.registerTd({ family: name, cpu: x.cpu, memory: x.memory, execRole: x.execRole, taskRole: x.taskRole, containers: [{ name: "Main", image: o.image, port: x.port, env: x.env, secrets: [], logGroup: c.logGroup, logPrefix: c.logPrefix }] })); API.updateEcsService(cluster, name, { td: ntd.family + ":" + ntd.rev }); }
  if (o.healthPath !== undefined) { if (String(o.healthPath).charAt(0) !== "/") return E("healthPath", "ValidationException: health check path ต้องขึ้นต้นด้วย /"); x.healthPath = o.healthPath; var tg = find(S.tgs, x.tgId); if (tg) tg.hcPath = o.healthPath; }
  if (o.min !== undefined || o.max !== undefined) { var mn = o.min === undefined ? x.min : +o.min, mx = o.max === undefined ? x.max : +o.max; if (!(mn >= 0 && mx >= 1 && mn <= mx)) return E("min", "ValidationException: จำนวน task ต่ำสุดต้อง ≤ สูงสุด"); x.min = mn; x.max = mx; API.updateEcsService(cluster, name, { desired: mn }); }
  return { res: x };
};
API.deleteExpress = function (cluster, name) {
  var x = expOf(cluster, name); if (!x) return E("_", "ServiceNotFoundException: Express service not found");
  S.exps = S.exps.filter(function (e) { return e !== x; });
  if (x.svcId) { API.deleteEcsService(cluster, name); var td = ecsTdByRef(name); S.tds = S.tds.filter(function (t) { return t.family !== name; }); void td; }
  if (x.albId) { var alb = find(S.albs, x.albId); if (alb) { alb.listeners = alb.listeners.filter(function (l) { return l.tgId !== x.tgId; }); if (!alb.listeners.length) { S.albs = S.albs.filter(function (a) { return a !== alb; }); S.sgs = S.sgs.filter(function (g) { return alb.sgIds.indexOf(g.id) < 0; }); } } }
  if (x.tgId) S.tgs = S.tgs.filter(function (t) { return t.id !== x.tgId; });
  if (x.sgId) S.sgs = S.sgs.filter(function (g) { return g.id !== x.sgId; });
  return { res: true };
};
// สถานะรวมของ Express service
function expEval(x) {
  var s = x.svcId ? ecsSvcOf(x.cluster, x.name) : null;
  if (x.fail) return { status: "Failed", ok: false, svc: null, ev: null, reason: x.fail.msg, steps: [{ ok: true, t: "สร้าง Express service ได้ (role ถูกรับรอง)", d: "ผ่าน" }, { ok: false, t: "infrastructure role ได้รับอนุญาตให้สร้าง " + x.fail.resource + ", target group, security group, auto scaling", d: x.fail.msg }] };
  var ev = ecsEval(s), bad = ev.tasks.filter(function (t) { return (t.state === "STOPPED" || !t.healthy) && !t.warm; })[0];
  return { status: ev.stable ? "Active" : "In progress", ok: ev.stable, svc: s, ev: ev, reason: bad ? bad.reason : "", steps: bad ? bad.steps : ev.tasks[0] ? ev.tasks[0].steps : [] };
}
// ทรัพยากรที่ Express สร้างให้ (แท็บ Resources › Table / Timeline)
function expResources(x) {
  var f = x.fail, alb = x.albId ? find(S.albs, x.albId) : null, st = function (okFlag) { return okFlag ? "Active" : "Failed"; };
  var rows = [["ECS cluster", x.cluster, "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":cluster/" + x.cluster, "Active"], ["Task definition", x.name + ":1", "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":task-definition/" + x.name + ":1", st(!f)]];
  rows.push(["Application Load Balancer", alb ? alb.name : "(ไม่ได้สร้าง)", alb ? arnOf("alb", alb.id, alb.name) : "-", f ? "Failed" : "Active"]);
  rows.push(["Target group", f ? "(ไม่ได้สร้าง)" : (find(S.tgs, x.tgId) || {}).name, f ? "-" : arnOf("tg", x.tgId, (find(S.tgs, x.tgId) || {}).name), f ? "Skipped" : "Active"]);
  rows.push(["Listener rule (host-header)", x.host, "-", f ? "Skipped" : "Active"]);
  rows.push(["Security group", f ? "(ไม่ได้สร้าง)" : (find(S.sgs, x.sgId) || {}).name, f ? "-" : x.sgId, f ? "Skipped" : "Active"]);
  rows.push(["ACM certificate", x.host, x.cert, f ? "Skipped" : "Active"]);
  rows.push(["Application Auto Scaling target + policy", x.metric + " " + x.target + "% (" + x.min + "–" + x.max + " tasks)", "-", f ? "Skipped" : "Active"]);
  rows.push(["CloudWatch log group", x.logGroup, "-", st(!f)]);
  rows.push(["CloudWatch alarm (faulty deployment)", x.name + "-rollback-alarm", "-", f ? "Skipped" : "Active"]);
  rows.push(["ECS service", x.name, "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":service/" + x.cluster + "/" + x.name, f ? "Skipped" : "Active"]);
  return rows;
}
function expResponse(host, path) {
  var x = expByUrl(host); if (!x || x.fail) return null; var tg = find(S.tgs, x.tgId); if (!tg) return null;
  var ar = ecsApiResponse(tg); return ar ? { x: x, json: String(path || "/").split("?")[0] === "/healthz" ? { status: "ok" } : ar } : { x: x, json: null };
}
// ---------- Terraform ----------
TF_SCHEMA.aws_ecs_express_gateway_service = sch(["service_name", "cluster", "execution_role_arn", "infrastructure_role_arn", "task_role_arn", "health_check_path", "cpu", "memory", "cpu_architecture", "primary_container", "network_configuration", "scaling_target", "wait_for_steady_state", "tags"], ["execution_role_arn", "infrastructure_role_arn"], { primary_container: { args: ["image", "container_port", "command"], req: ["image"], blocks: { aws_logs_configuration: { args: ["log_group", "log_stream_prefix"], req: ["log_group"] }, environment: { args: ["name", "value"], req: ["name", "value"] }, secret: { args: ["name", "value_from"], req: ["name", "value_from"] } } }, network_configuration: { args: ["subnets", "security_groups"], req: [] }, scaling_target: { args: ["min_task_count", "max_task_count", "auto_scaling_metric", "auto_scaling_target_value"], req: [] } }, ["tags", "primary_container", "scaling_target", "health_check_path", "cpu", "memory"], ["id", "arn", "service_arn", "service_revision_arn", "ingress_paths"]);
TF_PROV.aws_ecs_express_gateway_service = {
  act: "ecs:CreateExpressGatewayService", svc: "ECS", op: "CreateExpressGatewayService",
  create: function (c) {
    var a = c.attrs, pc = (a.primary_container || [{}])[0] || {}, sc = (a.scaling_target || [{}])[0] || {}, lg = (pc.aws_logs_configuration || [{}])[0] || {}, nc = (a.network_configuration || [{}])[0] || {}, cname = String(a.cluster || "default").split("/").pop(), label = "creating ECS Express Gateway Service (" + (a.service_name || "") + ")";
    var x = ecsTfOk(API.createExpress({ image: pc.image, execRole: a.execution_role_arn, infraRole: a.infrastructure_role_arn, taskRole: a.task_role_arn, cluster: cname, name: a.service_name, port: pc.container_port, healthPath: a.health_check_path, cpu: a.cpu, memory: a.memory, arch: a.cpu_architecture, env: (pc.environment || []).map(function (e) { return { name: e.name, value: e.value }; }), command: (pc.command || []).join(" "), logGroup: lg.log_group, logPrefix: lg.log_stream_prefix, min: sc.min_task_count, max: sc.max_task_count, metric: sc.auto_scaling_metric, target: sc.auto_scaling_target_value, subnetIds: nc.subnets, tags: c.tags }), label, "ECS", "CreateExpressGatewayService");
    var arn = "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":service/" + x.cluster + "/" + x.name;
    if (x.fail) { var we = new Error("waiting for ECS Express Gateway Service (" + arn + ") create: " + x.fail.msg); we.tfAws = true; throw we; }
    return { id: arn, computed: { id: arn, arn: arn, service_arn: arn, service_revision_arn: arn + "/revision/1", ingress_paths: [{ access_type: "PUBLIC", endpoint: x.host }] }, sim: { cluster: x.cluster, name: x.name } };
  },
  update: function (st, d) { var pc = d.primary_container ? (d.primary_container[0] || {}) : null, sc = d.scaling_target ? (d.scaling_target[0] || {}) : null; var r = API.updateExpress(st.sim.cluster, st.sim.name, { image: pc && pc.image, healthPath: d.health_check_path, min: sc && sc.min_task_count, max: sc && sc.max_task_count }); if (r.errors) throw TfAwsError("updating ECS Express Gateway Service (" + st.id + ")", "ECS", "UpdateExpressGatewayService", "InvalidParameterException", String(r.errors[Object.keys(r.errors)[0]]).replace(/^[A-Za-z]+: /, "")); },
  del: function (st) { API.deleteExpress(st.sim.cluster, st.sim.name); },
  read: function (st) { var x = expOf(st.sim.cluster, st.sim.name); return x ? { cfg: {}, computed: { ingress_paths: [{ access_type: "PUBLIC", endpoint: x.host }] } } : null; }
};
// ---------- export Terraform (Express เป็น resource เดียว: ALB/target group/SG/task definition ที่ ECS สร้างให้ไม่ถูกเขียนซ้ำ) ----------
function expOwnedTg(t) { return S.exps.some(function (x) { return x.tgId === t.id; }); }
function expOwnedSg(g) { return S.exps.some(function (x) { return x.sgId === g.id; }) || S.albs.some(function (a) { return a.express && a.sgIds.indexOf(g.id) >= 0; }); }
function expOwnedTd(t) { return S.exps.some(function (x) { return x.svcId && x.name === t.family; }); }
function expHcl(o, ref) {
  S.exps.forEach(function (x) {
    var er = byName(S.roles, x.execRole), ir = byName(S.roles, x.infraRole), env = x.env.map(function (e) { return '\n    environment {\n      name  = "' + e.name + '"\n      value = "' + e.value + '"\n    }'; }).join("");
    var deps = [er && er.policies.map(function (p) { return "aws_iam_role_policy_attachment." + slug(er.name + "_" + p); }), ir && ir.policies.map(function (p) { return "aws_iam_role_policy_attachment." + slug(ir.name + "_" + p); })].filter(Boolean).reduce(function (a, b) { return a.concat(b); }, []);
    o.push(hcm("exp", x.cluster + "/" + x.name) + 'resource "aws_ecs_express_gateway_service" "' + slug(x.cluster + "_" + x.name) + '" {\n  service_name            = "' + x.name + '"\n  cluster                 = aws_ecs_cluster.' + slug(x.cluster) + '.name\n  execution_role_arn      = ' + (er ? ref(er.id, "arn") : '"' + x.execRole + '"') + '\n  infrastructure_role_arn = ' + (ir ? ref(ir.id, "arn") : '"' + x.infraRole + '"') + '\n  health_check_path       = "' + x.healthPath + '"\n  cpu                     = "' + x.cpu + '"\n  memory                  = "' + x.memory + '"\n\n  primary_container {\n    image          = "' + x.image + '"\n    container_port = ' + x.port + '\n\n    aws_logs_configuration {\n      log_group = "' + x.logGroup + '"\n    }' + env + '\n  }\n\n  scaling_target {\n    min_task_count            = ' + x.min + '\n    max_task_count            = ' + x.max + '\n    auto_scaling_metric       = "' + x.metric + '"\n    auto_scaling_target_value = ' + x.target + '\n  }\n' + (deps.length ? '\n  depends_on = [' + deps.join(", ") + ']\n' : "") + '}');
  });
}
