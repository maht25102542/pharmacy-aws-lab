// ===== Use case 2 (ECS Fargate): สร้าง lab ผ่าน API เหมือนกดใน console, ตัวตรวจ, ลบ, HCL, คำสั่ง aws =====
var ECS_ENVS = { dev: { tasks: 1, cpu: 256, memory: 512, port: 8080, multiAz: false, cls: "db.t4g.micro", backup: 1 }, prd: { tasks: 2, cpu: 512, memory: 1024, port: 80, multiAz: true, cls: "db.t4g.small", backup: 7 } };
function isEcsLab() { return S.ecsc.length > 0 || S.esvcs.length > 0 || S.tds.length > 0; }
function ecsRepoUri() { return ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com/pharmacy/api"; }

function buildEcs(kind) {
  fresh();
  function ok(r) { if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.res; }
  var v = ok(API.createVpc({ name: "pharmacy-vpc", cidr: "10.0.0.0/16", dns: true }));
  var pub = ok(API.createSubnet({ vpcId: v.id, list: [0, 1, 2].map(function (i) { return { name: "pharmacy-public-" + (i + 1), az: AZS[i], cidr: "10.0." + (i + 1) + ".0/24" }; }) })); pub.forEach(function (s) { API.setAutoIp(s.id, true); });
  var prv = ok(API.createSubnet({ vpcId: v.id, list: [0, 1, 2].map(function (i) { return { name: "pharmacy-private-" + (i + 1), az: AZS[i], cidr: "10.0." + (i + 11) + ".0/24" }; }) }));
  var g = ok(API.createIgw({ name: "pharmacy-igw" })); ok(API.attachIgw(g.id, v.id));
  var rt = ok(API.createRtb({ name: "pharmacy-public", vpcId: v.id })); ok(API.setRoutes(rt.id, [{ dest: "0.0.0.0/0", target: g.id }])); ok(API.setAssoc(rt.id, pub.map(function (s) { return s.id; })));
  var eip = ok(API.allocEip()), nat = { id: rid("nat"), name: "pharmacy-nat", vpcId: v.id, subnetId: pub[0].id, eipId: eip.id, state: "available", born: Date.now() }; S.nats.push(nat);
  var rp = ok(API.createRtb({ name: "pharmacy-private", vpcId: v.id })); ok(API.setRoutes(rp.id, kind === "ecs-pull" ? [] : [{ dest: "0.0.0.0/0", target: nat.id }])); ok(API.setAssoc(rp.id, prv.map(function (s) { return s.id; })));
  function R(type, port, k, src) { return { type: type, port: port, srcKind: k, src: src }; }
  var sg = {}; ["alb", "task", "db"].forEach(function (n) { sg[n] = ok(API.createSg({ name: "pharmacy-" + n, desc: "pharmacy " + n, vpcId: v.id, rows: [] })); });
  ok(API.setInbound(sg.alb.id, [R("HTTP", "", "Anywhere-IPv4"), R("Custom TCP", "8080", "My IP")]));
  ok(API.setInbound(sg.task.id, [R("Custom TCP", "8000", "Security group", sg.alb.id)]));
  ok(API.setInbound(sg.db.id, kind === "ecs-db" ? [R("PostgreSQL", "", "Security group", sg.alb.id)] : [R("PostgreSQL", "", "Security group", sg.task.id)]));
  ok(API.createRole({ name: "pharmacy-ecs-execution", entity: "AWS service", usecase: "ECS", policies: kind === "ecs-role" ? ["SecretsManagerReadWrite"] : ["AmazonECSTaskExecutionRolePolicy", "SecretsManagerReadWrite"] }));
  ok(API.createRole({ name: "pharmacy-ecs-task", entity: "AWS service", usecase: "ECS", policies: [] }));
  var repo = ok(API.createRepo({ name: "pharmacy/api", mutable: false }));
  if (!S.laptop.creds) { var tu = API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, tk = API.createAccessKey(tu.id, "CLI", ""); S.laptop.creds = { id: tk.res.id, secretHash: hash32(tk.secret), region: "ap-southeast-1" }; S.laptop.awsRegion = "ap-southeast-1"; }
  var adm = S.users.filter(function (u) { return u.name === "tf-admin"; })[0];
  if (kind !== "ecs-image") ok(API.ecrAction({ repoId: repo.id, principal: { type: "user", id: adm.id }, op: "push", tag: "v1.0.0" }));
  S.laptop.dockerReg = ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com";
  var dsg = ok(API.createDbSubnetGroup({ name: "pharmacy-api-db", desc: "pharmacy api db", subnetIds: prv.map(function (s) { return s.id; }) })), dbs = {};
  Object.keys(ECS_ENVS).forEach(function (e) { dbs[e] = ok(API.createRds({ id: "pharmacy-api-" + e, engine: "postgres", version: "16", cls: ECS_ENVS[e].cls, storage: 20, user: "pharmacy", manage: true, multiAz: ECS_ENVS[e].multiAz, subnetGroup: dsg.name, sgIds: [sg.db.id], backupDays: ECS_ENVS[e].backup, skipSnap: true })); });
  var alb0 = null, tgs = {};
  Object.keys(ECS_ENVS).forEach(function (e) { tgs[e] = ok(API.createTg({ name: "pharmacy-api-" + e, port: 8000, vpcId: v.id, hcPath: kind === "ecs-health" && e === "prd" ? "/health" : "/healthz", targets: [], targetType: "ip" })); });
  alb0 = ok(API.createAlb({ name: "pharmacy-api-alb", scheme: "Internet-facing", vpcId: v.id, subnetIds: pub.map(function (s) { return s.id; }), sgIds: [sg.alb.id], listeners: Object.keys(ECS_ENVS).map(function (e) { return { port: ECS_ENVS[e].port, tgId: tgs[e].id }; }) }));
  Object.keys(ECS_ENVS).forEach(function (e) { ok(API.createLogGroup({ name: "/ecs/pharmacy-api-" + e, retention: 14 })); });
  if (kind !== "ecs-base") Object.keys(ECS_ENVS).forEach(function (e) {
    var E2 = ECS_ENVS[e], cl = ok(API.createEcsCluster({ name: "pharmacy-" + e }));
    var td = ok(API.registerTd({ family: "pharmacy-api-" + e, cpu: E2.cpu, memory: E2.memory, execRole: "pharmacy-ecs-execution", taskRole: "pharmacy-ecs-task", containers: [{ name: "api", image: ecsRepoUri() + ":v1.0.0", port: 8000, env: [{ name: "APP_ENV", value: e }, { name: "DB_HOST", value: dbs[e].address }], secrets: [{ name: "DB_PASSWORD", valueFrom: dbs[e].secretArn + ":password::" }], logGroup: "/ecs/pharmacy-api-" + e, logPrefix: "api" }] }));
    ok(API.createEcsService({ name: "pharmacy-api", cluster: cl.name, td: td.family + ":" + td.rev, desired: E2.tasks, subnetIds: prv.map(function (s) { return s.id; }), sgIds: [sg.task.id], publicIp: false, lb: { tgArn: arnOf("tg", tgs[e].id, tgs[e].name), container: "api", port: 8000 } }));
  });
  S.ecsKind = kind; void alb0;
}

function checksEcs() {
  var out = []; function add(ok, label, hint) { out.push({ ok: !!ok, label: label, hint: hint || "" }); }
  var sgn = function (n) { return byName(S.sgs, "pharmacy-" + n); }, alb = S.albs[0], repo = byName(S.repos, "pharmacy/api"), vpc = byName(S.vpcs, "pharmacy-vpc");
  var pr = [1, 2, 3].map(function (i) { return byName(S.subnets, "pharmacy-private-" + i); });
  add(vpc && pr.every(function (x) { return x; }) && S.nats.length, "VPC 3 AZ: private subnet ×3 + NAT gateway", "VPC → Create VPC / Subnets / NAT gateways");
  add(pr.every(function (x) { return x && natRoute(subnetRtb(x)); }), "private route table มี 0.0.0.0/0 → NAT (task ดึง image ได้)", "VPC → Route tables → pharmacy-private → Edit routes");
  add(sgn("alb") && sgn("task") && sgn("db"), "security group 3 ชั้น: alb / task / db", "EC2 → Security Groups");
  add(sgn("task") && alb && sgAllows([sgn("task").id], 8000, { sgIds: [sgn("alb").id] }), "SG task รับ port 8000 จาก SG ของ ALB", "pharmacy-task: Custom TCP 8000 ← pharmacy-alb");
  add(sgn("db") && sgn("task") && sgAllows([sgn("db").id], 5432, { sgIds: [sgn("task").id] }) && !sgAllows([sgn("db").id], 5432, { ip: "203.0.113.5" }), "SG DB รับ 5432 จาก SG ของ task เท่านั้น", "pharmacy-db: PostgreSQL ← pharmacy-task");
  var xr = byName(S.roles, "pharmacy-ecs-execution");
  add(xr && roleTrusts(xr, "ecs-tasks.amazonaws.com") && xr.policies.indexOf("AmazonECSTaskExecutionRolePolicy") >= 0, "execution role: trust ecs-tasks + AmazonECSTaskExecutionRolePolicy", "IAM → Create role → Elastic Container Service Task → แนบ policy");
  add(xr && xr.policies.indexOf("SecretsManagerReadWrite") >= 0, "execution role อ่านรหัสผ่านจาก Secrets Manager ได้", "แนบ SecretsManagerReadWrite (ของจริงเขียน policy เฉพาะ secret)");
  add(repo && repo.images.some(function (i) { return i.tag === "v1.0.0"; }), "ECR pharmacy/api มี image tag v1.0.0 (docker push แล้ว)", "docker build → docker push (ดู output push_commands)");
  ["dev", "prd"].forEach(function (e) {
    var db = S.rds.filter(function (r) { return r.id === "pharmacy-api-" + e; })[0], tg = byName(S.tgs, "pharmacy-api-" + e), cl = ecsClusterByName("pharmacy-" + e), sv = cl && ecsSvcOf(cl.name, "pharmacy-api"), ev = sv && ecsEval(sv);
    add(db && db.engine === "postgres" && db.multiAz === ECS_ENVS[e].multiAz && !db.publicly, e + ": RDS postgres " + (ECS_ENVS[e].multiAz ? "Multi-AZ" : "Single-AZ") + " ไม่ public", "RDS → Create database");
    add(tg && tg.ttype === "ip" && tg.hcPath === "/healthz", e + ": target group แบบ IP + health check /healthz", "EC2 → Target Groups → Create (Target type: IP addresses)");
    add(alb && alb.listeners.some(function (l) { return l.port === ECS_ENVS[e].port && tg && l.tgId === tg.id; }), e + ": ALB listener :" + ECS_ENVS[e].port + " → target group", "EC2 → Load Balancers → Listeners");
    add(sv && ev && ev.td && ev.td.cpu === ECS_ENVS[e].cpu && ev.td.containers[0].port === 8000, e + ": task definition Fargate " + ECS_ENVS[e].cpu + " CPU / " + ECS_ENVS[e].memory + " MiB, container port 8000", "ECS → Task definitions → Create");
    add(sv && sv.desired === ECS_ENVS[e].tasks && ev.healthy === sv.desired, e + ": service รัน " + ECS_ENVS[e].tasks + " task และ healthy ครบ", "ECS → Cluster → Services → ดู Health / Events");
    if (e === "prd") add(sv && ev && new Set(ev.tasks.map(function (t) { return t.az; })).size === 2, "prd: task กระจาย 2 AZ", "เลือก subnet private หลาย AZ ตอนสร้าง service");
  });
  add(alb && albHealth(alb).length && albHealth(alb).every(function (r) { return r.ok; }), "ALB เห็น target healthy ทุกตัว", "ถ้า unhealthy: ดู health check path และ SG task");
  ["dev", "prd"].forEach(function (e) { var tg = byName(S.tgs, "pharmacy-api-" + e), r = tg && ecsApiResponse(tg); add(r && r.db === "connected", e + ": เรียก API ผ่าน ALB ได้และต่อ DB ได้", "Browser: เปิด URL ของ ALB"); });
  return out;
}

// ---------- ลบจาก console ----------
function ecsDelPlan(kind, id, P) {
  if (kind === "esvc") { var s = S.esvcs.filter(function (x) { return x.id === id; })[0]; if (!s) return false; P.title = "Delete service " + s.name; P.crumb = "ECS › Clusters › " + s.cluster + " › Delete service"; P.word = "delete"; P.done = "ลบ service แล้ว (task หยุดทั้งหมด)"; P.note = "ของจริงควรตั้ง desired = 0 ก่อน หรือเลือก Force delete"; }
  else if (kind === "ecsc") { var c = S.ecsc.filter(function (x) { return x.id === id; })[0]; if (!c) return false; P.title = "Delete cluster " + c.name; P.crumb = "ECS › Clusters › Delete cluster"; P.word = "delete " + c.name; P.done = "ลบ cluster แล้ว"; S.esvcs.filter(function (x) { return x.cluster === c.name; }).forEach(function (x) { P.blockers.push("ต้องลบ service " + x.name + " ก่อน"); }); }
  else if (kind === "lg") { var g = S.lgs.filter(function (x) { return x.id === id; })[0]; if (!g) return false; P.title = "Delete log group " + g.name; P.crumb = "CloudWatch › Log groups › Delete"; P.word = "delete"; P.done = "ลบ log group แล้ว (log ทั้งหมดหาย)"; }
  else if (kind === "td") { var t = S.tds.filter(function (x) { return x.id === id; })[0]; if (!t) return false; P.title = "Deregister " + t.id; P.crumb = "ECS › Task definitions › Deregister"; P.word = "deregister"; P.done = "Deregister แล้ว"; S.esvcs.filter(function (x) { return x.td === t.id; }).forEach(function (x) { P.blockers.push("service " + x.name + " ยังใช้ revision นี้อยู่"); }); }
  else return slsDelPlan(kind, id, P); return true;
}
function ecsDelDo(kind, id) {
  if (kind === "esvc") { var s = S.esvcs.filter(function (x) { return x.id === id; })[0]; return API.deleteEcsService(s.cluster, s.name); }
  if (kind === "ecsc") return API.deleteEcsCluster(id); if (kind === "lg") return API.deleteLogGroup(id); if (kind === "td") return API.deregisterTd(id); return slsDelDo(kind, id);
}

// ---------- HCL จากของที่กดใน console ----------
function ecsHcl(o, ref) {
  var sl = slug;
  S.lgs.forEach(function (g) { o.push(hcm("lg", g.name) + 'resource "aws_cloudwatch_log_group" "' + sl(g.name) + '" {\n  name              = "' + g.name + '"\n  retention_in_days = ' + (g.retention || 0) + "\n}"); });
  S.ecsc.forEach(function (c) { o.push(hcm("ecsc", c.name) + 'resource "aws_ecs_cluster" "' + sl(c.name) + '" {\n  name = "' + c.name + '"\n}'); });
  S.tds.forEach(function (t) {
    var c = t.containers[0] || {}, rr = function (n) { var r = byName(S.roles, n); return r ? ref(r.id, "arn") : '"' + n + '"'; };
    o.push(hcm("ecstd", t.id) + 'resource "aws_ecs_task_definition" "' + sl(t.family) + '" {\n  family                   = "' + t.family + '"\n  requires_compatibilities = ["FARGATE"]\n  network_mode             = "awsvpc"   # Fargate ใช้ awsvpc: task มี IP ของตัวเอง\n  cpu                      = ' + t.cpu + "\n  memory                   = " + t.memory + "\n  execution_role_arn       = " + rr(t.execRole) + "   # ให้ ECS ดึง image / เขียน log / อ่าน secret\n" + (t.taskRole ? "  task_role_arn            = " + rr(t.taskRole) + "   # ให้โค้ดในคอนเทนเนอร์เรียก AWS\n" : "") + "\n  container_definitions = jsonencode([{\n    name         = \"" + c.name + '"\n    image        = "' + c.image + '"\n    essential    = true\n    portMappings = [{ containerPort = ' + (c.port || 0) + " }]\n    environment  = [" + (c.env || []).map(function (e) { return '{ name = "' + e.name + '", value = "' + e.value + '" }'; }).join(", ") + "]\n    secrets      = [" + (c.secrets || []).map(function (e) { return '{ name = "' + e.name + '", valueFrom = "' + e.valueFrom + '" }'; }).join(", ") + '] \n    logConfiguration = { logDriver = "awslogs", options = { "awslogs-group" = "' + (c.logGroup || "") + '", "awslogs-region" = "' + REGION + '", "awslogs-stream-prefix" = "' + (c.logPrefix || "api") + '" } }\n  }])\n}');
  });
  S.esvcs.forEach(function (s) {
    var td = ecsTdByRef(s.td), tg = s.lb && byArnTg(s.lb.tgArn);
    o.push(hcm("ecssvc", s.cluster + "/" + s.name) + 'resource "aws_ecs_service" "' + sl(s.cluster + "_" + s.name) + '" {\n  name            = "' + s.name + '"\n  cluster         = aws_ecs_cluster.' + sl(s.cluster) + '.id\n  task_definition = aws_ecs_task_definition.' + sl(td ? td.family : s.td) + '.arn\n  desired_count   = ' + s.desired + '\n  launch_type     = "FARGATE"\n\n  network_configuration {\n    subnets          = [' + s.subnetIds.map(function (id) { return ref(id); }).join(", ") + "]\n    security_groups  = [" + s.sgIds.map(function (id) { return ref(id); }).join(", ") + "]\n    assign_public_ip = " + s.publicIp + (s.publicIp ? "   # ⚠ task ได้ public IP: ปกติใช้ private + NAT" : "") + "\n  }\n" + (tg ? "\n  load_balancer {\n    target_group_arn = " + ref(tg.id, "arn") + '\n    container_name   = "' + s.lb.container + '"\n    container_port   = ' + s.lb.port + "\n  }\n" : "") + "\n  # listener + NAT ต้องพร้อมก่อน (depends_on) ไม่งั้น service สร้างไม่ผ่านหรือ task ดึง image ไม่ได้\n}");
  });
}

// ---------- คำสั่ง aws ecs / logs ----------
function shAwsEcs(a, w, need) {
  var op = a[0] + " " + a[1];
  function arg(n) { var i = a.indexOf(n); return i >= 0 ? a[i + 1] : ""; }
  function svcOf() { var cl = arg("--cluster"), nm = arg("--service") || arg("--services"), s = S.esvcs.filter(function (x) { return x.cluster === cl.split("/").pop() && x.name === nm; })[0]; return s; }
  if (op === "ecs list-clusters") return need("ecs:ListClusters", "ListClusters", function () { return ["{", '    "clusterArns": [' + S.ecsc.map(function (c) { return '"arn:aws:ecs:' + REGION + ":" + ACCOUNT + ":cluster/" + c.name + '"'; }).join(", ") + "]", "}"]; });
  if (op === "ecs list-services") return need("ecs:ListServices", "ListServices", function () { var cl = arg("--cluster").split("/").pop(); return ["{", '    "serviceArns": [' + S.esvcs.filter(function (s) { return s.cluster === cl; }).map(function (s) { return '"arn:aws:ecs:' + REGION + ":" + ACCOUNT + ":service/" + cl + "/" + s.name + '"'; }).join(", ") + "]", "}"]; });
  if (op === "ecs describe-services") return need("ecs:DescribeServices", "DescribeServices", function () {
    var s = svcOf(); if (!s) return ["{", '    "services": [], "failures": [{ "reason": "MISSING" }]', "}"]; var e = ecsEval(s);
    return ["{", '    "services": [{', '        "serviceName": "' + s.name + '", "status": "ACTIVE", "launchType": "FARGATE",', '        "desiredCount": ' + s.desired + ", \"runningCount\": " + e.running + ", \"pendingCount\": 0,", '        "taskDefinition": "arn:aws:ecs:' + REGION + ":" + ACCOUNT + ":task-definition/" + s.td + '",', '        "events": [' + e.events.slice(0, 3).map(function (x) { return '{ "message": "' + x.replace(/"/g, "'") + '" }'; }).join(", ") + "]", "    }]", "}"];
  });
  if (op === "ecs list-tasks") return need("ecs:ListTasks", "ListTasks", function () { var s = svcOf() || S.esvcs.filter(function (x) { return x.cluster === arg("--cluster").split("/").pop(); })[0]; if (!s) return ["{", '    "taskArns": []', "}"]; return ["{", '    "taskArns": [' + ecsEval(s).tasks.map(function (t) { return '"arn:aws:ecs:' + REGION + ":" + ACCOUNT + ":task/" + s.cluster + "/" + t.id + '"'; }).join(", ") + "]", "}"]; });
  if (op === "ecs update-service") return need("ecs:UpdateService", "UpdateService", function () { var cl = arg("--cluster").split("/").pop(), nm = arg("--service"), r = API.updateEcsService(cl, nm, { desired: arg("--desired-count") === "" ? undefined : arg("--desired-count") }); if (r.errors) return ["", "An error occurred (" + String(r.errors[Object.keys(r.errors)[0]]).replace(": ", ") when calling the UpdateService operation: ")]; return ["{", '    "service": { "serviceName": "' + nm + '", "desiredCount": ' + r.res.desired + " }", "}"]; });
  if (op === "logs tail") return need("logs:GetLogEvents", "GetLogEvents", function () {
    var g = a[2], ll = S.lamLogs.filter(function (x) { return x.group === g; })[0]; if (ll) return ll.lines.map(function (l) { return new Date().toISOString().replace("T", " ").slice(0, 19) + " " + ll.stream + " " + l; });
    if (!S.lgs.some(function (x) { return x.name === g; })) return ["", "An error occurred (ResourceNotFoundException) when calling the FilterLogEvents operation: The specified log group does not exist."];
    var out = []; S.esvcs.forEach(function (s) { var td = ecsTdByRef(s.td); if (!td || td.containers[0].logGroup !== g) return; ecsEval(s).tasks.forEach(function (t) { (t.logs || []).forEach(function (l) { out.push(new Date().toISOString().replace("T", " ").slice(0, 19) + " " + (td.containers[0].logPrefix || "api") + "/" + td.containers[0].name + "/" + t.id.slice(0, 8) + " " + l); }); }); });
    return out.length ? out : ["(ไม่มี log: task ยังไม่เคยเริ่ม หรือ execution role เขียน log ไม่ได้ หรือ task ติดที่ขั้นดึง image จึงไม่มี log ของแอป)"];
  });
  return shAwsSls(a, w, need);
}
