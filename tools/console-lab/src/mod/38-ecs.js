// ===== Use case 2: ECS Fargate + ALB + ECR + RDS (state + API + ตัวตัดสินสถานะ task + Terraform provider) =====
// สถานะของ task ไม่ได้เก็บไว้ แต่ "คำนวณจากโครงสร้างพื้นฐานปัจจุบัน" ทุกครั้ง (role, NAT, image ใน ECR, SG, health check) จึงแก้ต้นเหตุแล้วหายเอง
// ข้อความ error ที่ระบุว่าจำจากเอกสาร/ประสบการณ์ อาจไม่ตรงทุกตัวอักษรกับของจริง
var FARGATE_MEM = { 256: [512, 1024, 2048], 512: [1024, 2048, 3072, 4096], 1024: [2048, 3072, 4096, 5120, 6144, 7168, 8192], 2048: [4096, 16384], 4096: [8192, 30720] };
var APP_HEALTH_PATH = "/healthz"; // path ที่แอปตัวอย่าง (pharmacy/api) ตอบ 200
function ecsHex(n) { return fakeId("", n, "0123456789abcdef"); }
function ecsFamilyName(f) { return /^[A-Za-z0-9_-]{1,255}$/.test(String(f || "")); }
function ecsTdByRef(ref) { var m = /(?:task-definition\/)?([A-Za-z0-9_-]+)(?::(\d+))?$/.exec(String(ref || "")); if (!m) return null; var list = S.tds.filter(function (t) { return t.family === m[1] && (!m[2] || t.rev === +m[2]); }); return list.sort(function (a, b) { return b.rev - a.rev; })[0] || null; }
function ecsImage(img) { var m = /^(\d+)\.dkr\.ecr\.([a-z0-9-]+)\.amazonaws\.com\/([^:@]+)(?::(.+))?$/.exec(String(img || "")); return m ? { acct: m[1], region: m[2], repo: m[3], tag: m[4] || "latest" } : null; }
function ecsClusterByName(n) { return S.ecsc.filter(function (c) { return c.name === n; })[0] || null; }
function ecsSvcOf(cluster, name) { return S.esvcs.filter(function (s) { return s.cluster === cluster && s.name === name; })[0] || null; }

API.createLogGroup = function (o) {
  var n = String(o.name || ""); if (!n) return E("name", "ต้องกรอกชื่อ log group"); if (!/^[.\-_\/#A-Za-z0-9]{1,512}$/.test(n)) return E("name", "InvalidParameterException: ชื่อ log group ใช้ตัวอักษร ตัวเลข . - _ / # เท่านั้น (ไม่เกิน 512 ตัว)");
  if (S.lgs.some(function (g) { return g.name === n; })) return E("name", "ResourceAlreadyExistsException: The specified log group already exists");
  var g = { id: n, name: n, retention: +o.retention || 0, born: Date.now(), tagMap: {} }; S.lgs.push(g); return { res: g };
};
API.createEcsCluster = function (o) {
  var n = String(o.name || ""); if (!n) return E("name", "ต้องกรอกชื่อ cluster"); if (!/^[A-Za-z0-9_-]{1,255}$/.test(n)) return E("name", "InvalidParameterException: ชื่อ cluster ใช้ตัวอักษร ตัวเลข - _ (ไม่เกิน 255 ตัว)");
  if (ecsClusterByName(n)) return E("name", "InvalidParameterException: Cluster ชื่อนี้มีอยู่แล้ว");
  var c = { id: n, name: n, born: Date.now(), tagMap: {} }; S.ecsc.push(c); return { res: c };
};
API.registerTd = function (o) {
  var er = {}, cpu = +o.cpu, mem = +o.memory;
  if (!ecsFamilyName(o.family)) er.family = "ClientException: family ใช้ตัวอักษร ตัวเลข - _ (ไม่เกิน 255 ตัว)";
  var okMem = FARGATE_MEM[cpu] && (cpu === 2048 || cpu === 4096 ? mem >= FARGATE_MEM[cpu][0] && mem <= FARGATE_MEM[cpu][1] && mem % 1024 === 0 : FARGATE_MEM[cpu].indexOf(mem) >= 0);
  if (!okMem) er.memory = "ClientException: No Fargate configuration exists for given values: " + (o.cpu || "?") + " CPU units / " + (o.memory || "?") + " MiB memory (ตัวอย่างที่ใช้ได้: 256/512, 512/1024, 1024/2048)";
  var cs = (o.containers || []).filter(function (c) { return c && c.name; });
  if (!cs.length) er.container = "ClientException: ต้องมี container อย่างน้อย 1 ตัว (ชื่อ + image)";
  cs.forEach(function (c) { if (!c.image) er.image = "ClientException: container " + c.name + " ต้องระบุ image"; if (c.port && !(+c.port >= 1 && +c.port <= 65535)) er.port = "ClientException: container port ต้อง 1-65535"; });
  if (Object.keys(er).length) return { errors: er };
  var rev = S.tds.filter(function (t) { return t.family === o.family; }).reduce(function (m, t) { return Math.max(m, t.rev); }, 0) + 1;
  var t = { id: o.family + ":" + rev, family: o.family, rev: rev, cpu: cpu, memory: mem, execRole: o.execRole || "", taskRole: o.taskRole || "", containers: cs.map(function (c) { return { name: c.name, image: c.image, port: +c.port || 0, env: (c.env || []).filter(function (e) { return e.name; }), secrets: (c.secrets || []).filter(function (e) { return e.name; }), logGroup: c.logGroup || "", logPrefix: c.logPrefix || "api" }; }), arn: "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":task-definition/" + o.family + ":" + rev, born: Date.now(), tagMap: {} };
  S.tds.push(t); return { res: t };
};
API.createEcsService = function (o) {
  var er = {}, cl = ecsClusterByName(o.cluster), td = ecsTdByRef(o.td), n = String(o.name || "");
  if (!cl) er.cluster = "ClusterNotFoundException: Cluster not found."; if (!td) er.td = "InvalidParameterException: Unable to describe task definition " + (o.td || "") + " (ต้อง register task definition ก่อน)";
  if (!n) er.name = "ต้องกรอกชื่อ service"; else if (!/^[A-Za-z0-9_-]{1,255}$/.test(n)) er.name = "InvalidParameterException: ชื่อ service ใช้ตัวอักษร ตัวเลข - _"; else if (cl && ecsSvcOf(cl.name, n)) er.name = "InvalidParameterException: Creation of service was not idempotent. (service ชื่อนี้มีอยู่แล้วใน cluster)";
  var sns = (o.subnetIds || []).map(function (id) { return find(S.subnets, id); }).filter(Boolean);
  if (!sns.length) er.subnetIds = "InvalidParameterException: ต้องเลือก subnet อย่างน้อย 1 (network mode awsvpc)"; else if (sns.some(function (s) { return s.vpcId !== sns[0].vpcId; })) er.subnetIds = "InvalidParameterException: subnet ต้องอยู่ใน VPC เดียวกัน";
  var sgs = (o.sgIds || []).map(function (id) { return find(S.sgs, id); }).filter(Boolean); if (sns.length && sgs.some(function (g) { return g.vpcId !== sns[0].vpcId; })) er.sgIds = "InvalidParameterException: security group ต้องอยู่ VPC เดียวกับ subnet";
  if (!(+o.desired >= 0 && +o.desired <= 100)) er.desired = "InvalidParameterException: desired count ต้อง 0-100";
  var lb = null;
  if (o.lb && o.lb.tgArn) {
    var tg = byArnTg(o.lb.tgArn); lb = { tgArn: o.lb.tgArn, container: o.lb.container, port: +o.lb.port };
    if (!tg) er.lb = "InvalidParameterException: target group ไม่มีอยู่: " + o.lb.tgArn;
    else if (tg.ttype !== "ip") er.lb = "InvalidParameterException: The provided target group " + o.lb.tgArn + " has target type " + (tg.ttype || "instance") + ", which is incompatible with the awsvpc network mode specified in the task definition.";
    else if (!S.albs.some(function (a) { return a.listeners.some(function (l) { return l.tgId === tg.id; }); })) er.lb = "InvalidParameterException: The target group with targetGroupArn " + o.lb.tgArn + " does not have an associated load balancer. (ต้องมี listener ชี้ target group นี้ก่อน)";
    else if (td && !td.containers.some(function (c) { return c.name === lb.container && c.port === lb.port; })) er.lb = "InvalidParameterException: The container " + lb.container + " did not have a container port " + lb.port + " defined. (ตรวจ container name และ port ใน task definition)";
  }
  if (Object.keys(er).length) return { errors: er };
  var s = { id: cl.name + "/" + n, name: n, cluster: cl.name, td: td.family + ":" + td.rev, desired: +o.desired, subnetIds: sns.map(function (x) { return x.id; }), sgIds: sgs.map(function (g) { return g.id; }), publicIp: !!o.publicIp, lb: lb, born: Date.now(), touched: Date.now(), tagMap: {}, vpcId: sns[0].vpcId };
  S.esvcs.push(s); return { res: s };
};
API.updateEcsService = function (cluster, name, o) {
  var s = ecsSvcOf(cluster, name); if (!s) return E("_", "ServiceNotFoundException: Service not found.");
  if (o.desired !== undefined) { if (!(+o.desired >= 0 && +o.desired <= 100)) return E("desired", "InvalidParameterException: desired count ต้อง 0-100"); s.desired = +o.desired; }
  if (o.td) { var td = ecsTdByRef(o.td); if (!td) return E("td", "InvalidParameterException: ไม่พบ task definition " + o.td); if (s.td !== td.family + ":" + td.rev) s.touched = Date.now(); s.td = td.family + ":" + td.rev; }
  if (o.sgIds) s.sgIds = o.sgIds.slice(); return { res: s };
};
API.deleteEcsService = function (cluster, name) { var s = ecsSvcOf(cluster, name); if (!s) return E("_", "ServiceNotFoundException: Service not found."); S.esvcs = S.esvcs.filter(function (x) { return x !== s; }); return { res: true }; };
API.deleteEcsCluster = function (name) { var c = ecsClusterByName(name); if (!c) return E("_", "ClusterNotFoundException: Cluster not found."); if (S.esvcs.some(function (s) { return s.cluster === name; })) return E("_", "ClusterContainsServicesException: The Cluster cannot be deleted while Services are active."); S.ecsc = S.ecsc.filter(function (x) { return x !== c; }); return { res: true }; };
API.deleteLogGroup = function (name) { S.lgs = S.lgs.filter(function (g) { return g.name !== name; }); return { res: true }; };
API.deregisterTd = function (id) { S.tds = S.tds.filter(function (t) { return t.id !== id; }); return { res: true }; };

// ---------- ตัวตัดสินสถานะ task (เรียงตามลำดับจริงที่ Fargate ทำตอนเริ่ม task) ----------
function ecsTaskId(svc, i) { var h0 = hash32(svc.cluster + "/" + svc.name + "#" + i), o = ""; for (var k = 0; o.length < 32; k++) o += hash32(h0 + k); return o.slice(0, 32); }
function ecsLogsFor(td, lines) { var c = td.containers[0]; return { group: c.logGroup, stream: (c.logPrefix || "api") + "/" + c.name, lines: lines }; }
function ecsDiagTask(svc, td, sn, idx) {
  var c = td.containers[0], steps = [], img = ecsImage(c.image), role = roleByRef(td.execRole), rt = sn ? subnetRtb(sn) : null, out = { steps: steps, state: "RUNNING", healthy: true, reason: "", stage: "" };
  function fail(stage, reason, logs) { out.state = "STOPPED"; out.healthy = false; out.reason = reason; out.stage = stage; out.logs = logs || []; return out; }
  // 1) execution role (ดึง image ECR + เขียน log)
  var roleOk = !!role && roleTrusts(role, "ecs-tasks.amazonaws.com") && role.policies.indexOf("AmazonECSTaskExecutionRolePolicy") >= 0;
  steps.push({ ok: roleOk, t: "Execution role มีสิทธิ์ดึง image ECR + เขียน log", d: roleOk ? role.name + " (trust ecs-tasks + AmazonECSTaskExecutionRolePolicy)" : !role ? "ไม่พบ role " + (td.execRole || "(ไม่ได้ตั้ง)") : !roleTrusts(role, "ecs-tasks.amazonaws.com") ? "role " + role.name + " ไม่ได้เชื่อใจ ecs-tasks.amazonaws.com" : "role " + role.name + " ขาด AmazonECSTaskExecutionRolePolicy" });
  if (!roleOk) return fail("role", "ResourceInitializationError: unable to pull secrets or registry auth: execution resource retrieval failed: unable to retrieve ecr registry auth: service call has been retried 3 time(s): AccessDeniedException: User: arn:aws:sts::" + ACCOUNT + ":assumed-role/" + (role ? role.name : "(none)") + "/" + ecsHex(32) + " is not authorized to perform: ecr:GetAuthorizationToken on resource: * because no identity-based policy allows the ecr:GetAuthorizationToken action");
  // 2) เส้นทางออกเน็ต (ไปหา ECR / Secrets Manager / CloudWatch Logs)
  var net = (!!svc.publicIp && hasIgwRoute(rt)) || natRoute(rt), eg = egressOpen(svc.sgIds), viaVpce = false;
  if (!net && eg && sn && S.vpces.some(function (v) { return v.vpcId === sn.vpcId; })) {
    var miss = vpceNeeds(td).filter(function (n) { return !vpceReach(n, sn, svc.sgIds); });
    steps.push({ ok: !miss.length, t: "Task ติดต่อบริการ AWS ผ่าน VPC endpoints (" + vpceNeeds(td).join(", ") + ")", d: miss.length ? "ขาด/ใช้ไม่ได้: " + miss.join(", ") + " (interface ต้อง private DNS + SG รับ 443 จาก SG ของ task · s3 ต้องเป็น gateway ที่ผูก route table ของ private subnet)" : "ครบ ไม่ต้องใช้ NAT" });
    if (miss.length) return fail("network", vpceFailMsg(miss[0], "", c.image, idx));
    viaVpce = true;
  }
  if (!viaVpce) steps.push({ ok: net && eg, t: "Task ออกเน็ตได้ (NAT หรือ public IP + IGW, SG ขาออกเปิด 443)", d: net && eg ? (natRoute(rt) ? "ผ่าน NAT" : "ผ่าน public IP + IGW") : !net ? "ซอย " + (sn ? sn.name : "?") + " ไม่มีเส้นทางออกเน็ต (ไม่มี NAT และไม่ได้ให้ public IP)" : "SG ของ task ไม่มีกฎขาออก" });
  if (!viaVpce && !(net && eg)) return fail("network", "ResourceInitializationError: unable to pull secrets or registry auth: The task cannot pull registry auth from Amazon ECR: There is a connection issue between the task and Amazon ECR. Check your task network configuration. RequestError: send request failed caused by: Post \"https://api.ecr." + REGION + ".amazonaws.com/\": dial tcp 52.77.84." + (10 + idx) + ":443: i/o timeout");
  // 3) image มีใน ECR
  var repo = img ? S.repos.filter(function (r) { return r.name === img.repo; })[0] : null, has = !!repo && repo.images.some(function (x) { return x.tag === img.tag; });
  steps.push({ ok: has, t: "Image มีใน ECR (repo + tag)", d: has ? c.image : !img ? "image ไม่ใช่รูปแบบ ECR: " + c.image : !repo ? "ไม่มี repo " + img.repo : "repo " + img.repo + " ไม่มี tag " + img.tag + " (docker push ก่อน)" });
  if (!has) return fail("image", "CannotPullContainerError: pull image manifest has been retried 5 time(s): failed to resolve ref " + c.image + ": " + c.image + ": not found");
  // 4) secrets
  var sec = (c.secrets || []).map(function (x) { return String(x.valueFrom || "").replace(/:[^:\/]*:[^:]*:[^:]*$/, "").replace(/:password::$/, ""); }), secOk = true, secWhy = "ไม่ใช้ secret";
  if (sec.length) { var hasPol = !!role && role.policies.indexOf("SecretsManagerReadWrite") >= 0; var known = sec.every(function (a) { return S.rds.some(function (r) { return r.secretArn && a.indexOf(r.secretArn) === 0; }); }); secOk = hasPol && known; secWhy = !known ? "ไม่พบ secret ตาม ARN ที่ระบุ" : !hasPol ? "execution role ไม่มีสิทธิ์ secretsmanager:GetSecretValue" : "อ่าน secret ได้"; }
  steps.push({ ok: secOk, t: "Execution role อ่าน secret (รหัสผ่าน DB) ได้", d: secWhy });
  if (!secOk) return fail("secret", "ResourceInitializationError: unable to pull secrets or registry auth: execution resource retrieval failed: unable to retrieve secret from asm: service call has been retried 1 time(s): " + (secWhy.indexOf("ไม่พบ") === 0 ? "ResourceNotFoundException: Secrets Manager can't find the specified secret." : "AccessDeniedException: User: arn:aws:sts::" + ACCOUNT + ":assumed-role/" + role.name + "/" + ecsHex(32) + " is not authorized to perform: secretsmanager:GetSecretValue on resource: " + sec[0] + " because no identity-based policy allows the secretsmanager:GetSecretValue action"));
  // 5) แอปเริ่มทำงานและต่อ DB
  var envDb = (c.env || []).filter(function (e) { return e.name === "DB_HOST"; })[0], db = envDb ? S.rds.filter(function (r) { return r.address === envDb.value; })[0] : null, hasPw = (c.secrets || []).some(function (x) { return x.name === "DB_PASSWORD"; });
  var dbOk = true, dbWhy = "ไม่ได้ตั้ง DB_HOST (แอปรันแบบไม่มีฐานข้อมูล)";
  if (envDb) { if (!db) { dbOk = false; dbWhy = "DB_HOST " + envDb.value + " ไม่ตรงกับ RDS ใดเลย"; } else if (rdsPhase(db) !== "available") { dbOk = false; dbWhy = "RDS " + db.id + " ยังอยู่ในสถานะ Creating (โหมดเหมือนจริง: Multi-AZ ~12 นาที · single ~6 นาที)"; } else if (db.vpcId !== (sn && sn.vpcId) || !sgAllows(db.sgIds, db.port, { sgIds: svc.sgIds })) { dbOk = false; dbWhy = "SG ของ DB (" + db.id + ") ไม่รับ port " + db.port + " จาก SG ของ task"; } else if (!hasPw) { dbOk = false; dbWhy = "ไม่มี DB_PASSWORD (secret) ให้แอป login"; } else dbWhy = "ต่อ " + db.id + ":" + db.port + " ได้"; }
  steps.push({ ok: dbOk, t: "แอปต่อฐานข้อมูล (RDS) ได้ตอนเริ่ม", d: dbWhy });
  var hdr = ["INFO  starting pharmacy-api env=" + ((c.env || []).filter(function (e) { return e.name === "APP_ENV"; })[0] || { value: "?" }).value + " task=" + ecsTaskId(svc, idx).slice(0, 8)];
  if (!dbOk) return fail("db", "Essential container in task exited", hdr.concat(!db || rdsPhase(db) !== "available" ? ["ERROR could not translate host name \"" + (envDb ? envDb.value : "") + "\" to address: Name or service not known"] : !hasPw ? ["FATAL  password authentication failed for user \"pharmacy\""] : ["ERROR psycopg.OperationalError: connection to server at \"" + db.address + "\" (10.0.11.77), port " + db.port + " failed: Connection timed out (Is the server running on that host and accepting TCP/IP connections?)", "FATAL  cannot start: database unreachable (exit 1)"]));
  out.logs = hdr.concat(envDb ? ["INFO  connected to postgres " + db.address + ":" + db.port] : ["WARN  DB_HOST not set: running without database"], ["INFO  listening on :" + (c.port || 8000)]);
  // 6) ALB health check
  if (svc.lb) {
    var tg = byArnTg(svc.lb.tgArn), alb = tg && S.albs.filter(function (a) { return a.listeners.some(function (l) { return l.tgId === tg.id; }); })[0];
    var sgOk = !alb || sgAllows(svc.sgIds, svc.lb.port, { sgIds: alb.sgIds }), pathOk = !tg || tg.hcPath === APP_HEALTH_PATH || (!!svc.express && tg.hcPath === "/"), portOk = !svc.express || +svc.lb.port === EXP_APP_PORT;
    steps.push({ ok: sgOk, t: "SG ของ task รับ port " + svc.lb.port + " จาก SG ของ ALB", d: sgOk ? "มีกฎ" : "ไม่มีกฎ ALB เข้า task ไม่ได้ (Target.Timeout)" });
    steps.push({ ok: pathOk, t: "Health check path ตรงกับที่แอปตอบ 200 (" + APP_HEALTH_PATH + ")", d: pathOk ? "target group ใช้ " + (tg ? tg.hcPath : "-") : "target group ตรวจ " + tg.hcPath + " แต่แอปตอบ 404 (ต้อง " + APP_HEALTH_PATH + ")" });
    if (svc.express) steps.push({ ok: portOk, t: "container port (" + svc.lb.port + ") ตรงกับ port ที่แอปฟังจริง (" + EXP_APP_PORT + ")", d: portOk ? "ตรง" : "แอปฟัง :" + EXP_APP_PORT + " แต่ตั้งไว้ :" + svc.lb.port });
    if (!sgOk) { out.healthy = false; out.reason = "Task failed ELB health checks in (target-group " + svc.lb.tgArn + ")"; out.code = "Target.Timeout"; out.why = "Request timed out"; out.stage = "lb-sg"; out.logs.push("(ไม่มีคำขอเข้ามาเลย เพราะ SG ของ task ไม่รับจาก ALB)"); }
    else if (!portOk) { out.healthy = false; out.reason = "Task failed ELB health checks in (target-group " + svc.lb.tgArn + ")"; out.code = "Target.FailedHealthChecks"; out.why = "Health checks failed"; out.stage = "lb-port"; out.logs.push("INFO  listening on :" + EXP_APP_PORT + " (แต่ ALB ตรวจที่ :" + svc.lb.port + " → connection refused)"); }
    else if (!pathOk) { out.healthy = false; out.reason = "Task failed ELB health checks in (target-group " + svc.lb.tgArn + ")"; out.code = "Target.FailedHealthChecks"; out.why = "Health checks failed with these codes: [404]"; out.stage = "lb-path"; out.logs.push("INFO  GET " + tg.hcPath + " 404 (ELB-HealthChecker/2.0)"); }
    else out.logs.push("INFO  GET /healthz 200 (ELB-HealthChecker/2.0)");
  }
  return out;
}
function ecsEval(svc, settled) {
  var td = ecsTdByRef(svc.td), tasks = [], n = svc.subnetIds.length || 1;
  if (!td) return { svc: svc, td: null, tasks: [], running: 0, healthy: 0, stopped: 0, events: ["(service " + svc.name + ") task definition " + svc.td + " ไม่พบ"] };
  for (var i = 0; i < svc.desired; i++) { var sn = find(S.subnets, svc.subnetIds[i % n]), d = ecsDiagTask(svc, td, sn, i), cidr = sn ? parseCidr(sn.cidr) : null; d.id = ecsTaskId(svc, i); d.idx = i; d.subnet = sn; d.az = sn ? sn.az : ""; d.ip = cidr ? n2ip(cidr.base + 40 + i) : "-"; var wm = settled ? 0 : ecsWarm(svc); if (wm && d.state === "RUNNING" && d.healthy) { d.warm = true; d.healthy = false; if (wm === 1) { d.state = "PENDING"; d.reason = "Task is provisioning / pulling image (โหมดเหมือนจริง: รอ ~45 วินาที)"; } else { d.code = "Elb.InitialHealthChecking"; d.why = "Initial health checks in progress"; d.reason = "Target registration / initial health checks in progress"; } } tasks.push(d); }
  var running = tasks.filter(function (t) { return t.state === "RUNNING"; }).length, healthy = tasks.filter(function (t) { return t.state === "RUNNING" && t.healthy; }).length, events = [];
  if (svc.desired) { var fa = tasks.filter(function (t) { return t.state === "STOPPED"; })[0], un = tasks.filter(function (t) { return t.state === "RUNNING" && !t.healthy && !t.warm; })[0];
    events.push("(service " + svc.name + ") has started " + svc.desired + " tasks: " + tasks.map(function (t) { return "(task " + t.id.slice(0, 8) + ")"; }).join(" ") + ".");
    if (fa) events.unshift("(service " + svc.name + ") (task " + fa.id.slice(0, 8) + ") stopped: " + fa.reason + " · ECS จะลองใหม่ต่อเนื่อง (service ยังไม่ stable)");
    if (un) events.unshift("(service " + svc.name + ") (task " + un.id.slice(0, 8) + ") failed ELB health checks in (target-group " + svc.lb.tgArn.split("/")[1] + ") · ECS จะหยุด task แล้วเริ่มตัวใหม่วนไป");
    if (healthy === svc.desired) events.unshift("(service " + svc.name + ") has reached a steady state."); }
  return { svc: svc, td: td, tasks: tasks, running: running, healthy: healthy, stopped: tasks.length - running, events: events, stable: svc.desired > 0 && healthy === svc.desired };
}
// task ที่ผูกกับ target group นี้ (ใช้ใน albHealth)
function ecsAlbTargets(tg) {
  var arn = arnOf("tg", tg.id, tg.name), out = [];
  S.esvcs.forEach(function (s) { if (!s.lb || s.lb.tgArn !== arn) return; ecsEval(s).tasks.forEach(function (t) { if (t.state === "RUNNING") out.push({ task: t, svc: s, port: s.lb.port }); }); });
  return out;
}
// คำขอ HTTP ที่ผ่าน ALB เข้า task ตัวหนึ่ง (round-robin ตามลำดับ)
function ecsApiResponse(tg) {
  var ts = ecsAlbTargets(tg).filter(function (x) { return x.task.healthy; }); if (!ts.length) return null;
  S.ecsRr = ((S.ecsRr || 0) + 1); var x = ts[S.ecsRr % ts.length], td = ecsTdByRef(x.svc.td), c = td.containers[0], env = (c.env || []).filter(function (e) { return e.name === "APP_ENV"; })[0];
  return { service: "pharmacy-api", env: env ? env.value : "?", version: (ecsImage(c.image) || { tag: "?" }).tag, task: x.task.id.slice(0, 8), az: x.task.az, db: (c.env || []).some(function (e) { return e.name === "DB_HOST"; }) ? "connected" : "not configured", tasksBehindAlb: ts.length };
}

// ---------- schema ----------
TF_SCHEMA.aws_cloudwatch_log_group = sch(["name", "name_prefix", "retention_in_days", "tags"], [], {}, ["tags", "retention_in_days"], ["id", "arn"]);
TF_SCHEMA.aws_ecs_cluster = sch(["name", "tags"], ["name"], {}, ["tags"], ["id", "arn"]);
TF_SCHEMA.aws_ecs_task_definition = sch(["family", "container_definitions", "cpu", "memory", "network_mode", "requires_compatibilities", "execution_role_arn", "task_role_arn", "tags"], ["family", "container_definitions"], {}, ["tags"], ["id", "arn", "revision", "arn_without_revision"]);
TF_SCHEMA.aws_ecs_service = sch(["name", "cluster", "task_definition", "desired_count", "launch_type", "network_configuration", "load_balancer", "health_check_grace_period_seconds", "tags"], ["name"], { network_configuration: { args: ["subnets", "security_groups", "assign_public_ip"], req: ["subnets"] }, load_balancer: { args: ["target_group_arn", "container_name", "container_port"], req: ["container_name", "container_port"] } }, ["tags", "desired_count", "task_definition", "health_check_grace_period_seconds", "network_configuration"], ["id", "arn"]);

// ---------- Terraform provider ----------
function ecsTfOk(r, label, svc, op) { if (r && r.errors) { var k = Object.keys(r.errors)[0], m = /^([A-Za-z.]+): ([\s\S]*)$/.exec(String(r.errors[k])); throw TfAwsError(label, svc, op, m ? m[1] : "InvalidParameterException", m ? m[2] : String(r.errors[k])); } return r.res; }
TF_PROV.aws_cloudwatch_log_group = {
  act: "logs:CreateLogGroup", svc: "CloudWatch Logs", op: "CreateLogGroup",
  create: function (c) { var a = c.attrs, g = ecsTfOk(API.createLogGroup({ name: a.name || "terraform-" + ecsHex(10), retention: a.retention_in_days }), "creating CloudWatch Logs Log Group (" + a.name + ")", "CloudWatch Logs", "CreateLogGroup"); g.tagMap = Object.assign({}, c.tags); return { id: g.name, computed: { id: g.name, arn: "arn:aws:logs:" + REGION + ":" + ACCOUNT + ":log-group:" + g.name } }; },
  update: function (st, d) { var g = S.lgs.filter(function (x) { return x.name === st.id; })[0]; if (g) g.retention = +d.retention_in_days || 0; },
  del: function (st) { API.deleteLogGroup(st.id); },
  read: function (st) { return S.lgs.some(function (x) { return x.name === st.id; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_ecs_cluster = {
  act: "ecs:CreateCluster", svc: "ECS", op: "CreateCluster",
  create: function (c) { var a = c.attrs, x = ecsTfOk(API.createEcsCluster({ name: a.name }), "creating ECS Cluster (" + a.name + ")", "ECS", "CreateCluster"); x.tagMap = Object.assign({}, c.tags); return { id: "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":cluster/" + a.name, computed: { id: "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":cluster/" + a.name, arn: "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":cluster/" + a.name } , sim: { name: a.name } }; },
  update: function () {}, del: function (st) { var r = API.deleteEcsCluster(st.sim.name); if (r.errors) throw TfAwsError("deleting ECS Cluster (" + st.id + ")", "ECS", "DeleteCluster", "ClusterContainsServicesException", r.errors._.replace(/^[A-Za-z]+: /, "")); },
  read: function (st) { return ecsClusterByName(st.sim.name) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_ecs_task_definition = {
  act: "ecs:RegisterTaskDefinition", svc: "ECS", op: "RegisterTaskDefinition",
  create: function (c) {
    var a = c.attrs, defs; try { defs = JSON.parse(a.container_definitions); } catch (e) { throw TfAwsError("creating ECS Task Definition (" + a.family + ")", "ECS", "RegisterTaskDefinition", "ClientException", "Invalid JSON in container_definitions"); }
    var cs = defs.map(function (d) { var lc = d.logConfiguration && d.logConfiguration.options || {}; return { name: d.name, image: d.image, port: ((d.portMappings || [])[0] || {}).containerPort || 0, env: (d.environment || []).map(function (e) { return { name: e.name, value: e.value }; }), secrets: (d.secrets || []).map(function (e) { return { name: e.name, valueFrom: e.valueFrom }; }), logGroup: lc["awslogs-group"] || "", logPrefix: lc["awslogs-stream-prefix"] || "api" }; });
    var t = ecsTfOk(API.registerTd({ family: a.family, cpu: a.cpu, memory: a.memory, execRole: a.execution_role_arn, taskRole: a.task_role_arn, containers: cs }), "creating ECS Task Definition (" + a.family + ")", "ECS", "RegisterTaskDefinition"); t.tagMap = Object.assign({}, c.tags);
    return { id: t.arn, computed: { id: t.arn, arn: t.arn, revision: t.rev, arn_without_revision: t.arn.replace(/:\d+$/, "") }, sim: { id: t.id } };
  },
  update: function () {}, del: function (st) { API.deregisterTd(st.sim.id); },
  read: function (st) { return S.tds.some(function (t) { return t.id === st.sim.id; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_ecs_service = {
  act: "ecs:CreateService", svc: "ECS", op: "CreateService",
  create: function (c) {
    var a = c.attrs, nc = (a.network_configuration || [{}])[0], lb = (a.load_balancer || [])[0], cname = String(a.cluster || "").split("/").pop();
    var s = ecsTfOk(API.createEcsService({ name: a.name, cluster: cname, td: a.task_definition, desired: a.desired_count === undefined ? 1 : a.desired_count, subnetIds: nc.subnets || [], sgIds: nc.security_groups || [], publicIp: !!nc.assign_public_ip, lb: lb ? { tgArn: lb.target_group_arn, container: lb.container_name, port: lb.container_port } : null }), "creating ECS Service (" + a.name + ")", "ECS", "CreateService"); s.tagMap = Object.assign({}, c.tags);
    var arn = "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":service/" + cname + "/" + a.name; return { id: arn, computed: { id: arn, arn: arn }, sim: { cluster: cname, name: a.name } };
  },
  update: function (st, d) { var r = API.updateEcsService(st.sim.cluster, st.sim.name, { desired: d.desired_count, td: d.task_definition }); if (r.errors) throw TfAwsError("updating ECS Service (" + st.id + ")", "ECS", "UpdateService", "InvalidParameterException", String(r.errors[Object.keys(r.errors)[0]]).replace(/^[A-Za-z]+: /, "")); },
  del: function (st) { API.deleteEcsService(st.sim.cluster, st.sim.name); },
  read: function (st) { return ecsSvcOf(st.sim.cluster, st.sim.name) ? { cfg: {}, computed: {} } : null; }
};
