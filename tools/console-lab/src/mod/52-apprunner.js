// ===== Use case 7: AWS App Runner (PaaS สำหรับ container: ให้ image ได้ URL HTTPS + scale ให้เอง) =====
// สถานะคำนวณจากโครงสร้างปัจจุบัน (image ใน ECR, access role, port, health check) · ข้อความ error จากความจำ ดู labs/VERIFY.md
var APR_APP_PORT = 8000; // port ที่แอปตัวอย่าง (pharmacy/api) ฟังอยู่จริง
var APR_CPU = { "256": "0.25 vCPU", "512": "0.5 vCPU", "1024": "1 vCPU", "2048": "2 vCPU", "4096": "4 vCPU" };
var APR_MEM = { "512": "0.5 GB", "1024": "1 GB", "2048": "2 GB", "3072": "3 GB", "4096": "4 GB", "6144": "6 GB", "8192": "8 GB", "10240": "10 GB", "12288": "12 GB" };
var APR_PAIRS = { "256": ["512", "1024"], "512": ["1024"], "1024": ["2048", "3072", "4096"], "2048": ["4096", "6144"], "4096": ["8192", "10240", "12288"] }; // 11 คู่ตามเอกสาร App Runner (release 2023-04-05)
function isAprLab() { return S.aprs.length > 0; }
function aprSvc(n) { return S.aprs.filter(function (x) { return x.name === n; })[0] || null; }
function aprNum(v, map) { var s = String(v || "").trim(); var k = Object.keys(map).filter(function (x) { return map[x] === s || map[x].toLowerCase().replace(/ /g, "") === s.toLowerCase().replace(/ /g, ""); })[0]; return k || s; }
API.createAppRunner = function (o) {
  var er = {}, n = String(o.name || "");
  if (!n) er.name = "ต้องกรอกชื่อ service"; else if (!/^[A-Za-z0-9][A-Za-z0-9_-]{3,39}$/.test(n)) er.name = "ValidationException: ชื่อ service ยาว 4-40 ตัว ใช้ตัวอักษร ตัวเลข - _ และขึ้นต้นด้วยตัวอักษร/ตัวเลข"; else if (aprSvc(n)) er.name = "InvalidRequestException: Service with the provided name already exists (" + n + ")";
  if (!/^\d+\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\/[^:@]+(:[\w.-]+)?$/.test(String(o.image || ""))) er.image = "InvalidRequestException: Image identifier ต้องเป็น ECR URI (<account>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag>)";
  var port = +o.port; if (!(port >= 1 && port <= 65535)) er.port = "ValidationException: port ต้อง 1-65535";
  var cpu = aprNum(o.cpu, APR_CPU), mem = aprNum(o.memory, APR_MEM);
  if (!APR_CPU[cpu]) er.cpu = "ValidationException: cpu ต้องเป็นหนึ่งใน " + Object.keys(APR_CPU).join(", ") + " (หรือ 0.25/0.5/1/2/4 vCPU)";
  if (!APR_MEM[mem]) er.memory = "ValidationException: memory ต้องเป็นหนึ่งใน " + Object.keys(APR_MEM).join(", ");
  else if (APR_CPU[cpu] && APR_PAIRS[cpu].indexOf(mem) < 0) er.memory = "InvalidRequestException: คู่ CPU " + APR_CPU[cpu] + " กับ memory " + APR_MEM[mem] + " ไม่รองรับ (" + APR_CPU[cpu] + " ใช้ได้: " + APR_PAIRS[cpu].map(function (m) { return APR_MEM[m]; }).join(", ") + ")";
  if (Object.keys(er).length) return { errors: er };
  var id = fakeId("", 10, "abcdefghijklmnopqrstuvwxyz0123456789"), s = { id: id, name: n, image: o.image, port: port, cpu: cpu, memory: mem, accessRole: o.accessRole ? roleByRef(o.accessRole) && roleByRef(o.accessRole).name || String(o.accessRole).split("/").pop() : "", auto: !!o.auto, health: { protocol: o.healthProtocol || "TCP", path: o.healthPath || "/" }, env: Object.assign({}, o.env || {}), url: id + "." + REGION + ".awsapprunner.com", born: Date.now(), touched: Date.now(), deploys: [{ n: 1, born: Date.now(), image: o.image }], tagMap: {} };
  S.aprs.push(s); return { res: s };
};
API.deployAppRunner = function (n) { var s = aprSvc(n); if (!s) return E("_", "ResourceNotFoundException: Service not found"); s.touched = Date.now(); s.deploys.unshift({ n: s.deploys.length + 1, born: Date.now(), image: s.image }); return { res: s }; };
API.updateAppRunner = function (n, o) { var s = aprSvc(n); if (!s) return E("_", "ResourceNotFoundException: Service not found"); ["image", "port", "accessRole", "auto"].forEach(function (k) { if (o[k] !== undefined) s[k] = k === "port" ? +o[k] : o[k]; }); if (o.healthPath !== undefined) s.health.path = o.healthPath; if (o.healthProtocol) s.health.protocol = o.healthProtocol; if (o.env) s.env = Object.assign({}, o.env); s.touched = Date.now(); s.deploys.unshift({ n: s.deploys.length + 1, born: Date.now(), image: s.image }); return { res: s }; };
API.deleteAppRunner = function (n) { S.aprs = S.aprs.filter(function (x) { return x.name !== n; }); return { res: true }; };
// ตัดสินสถานะ service จากโครงสร้างปัจจุบัน
function aprEval(s) {
  var steps = [], m = /^(\d+)\.dkr\.ecr\.([a-z0-9-]+)\.amazonaws\.com\/([^:@]+)(?::(.+))?$/.exec(s.image || ""), repo = m ? S.repos.filter(function (r) { return r.name === m[3]; })[0] : null, tag = m ? (m[4] || "latest") : "", role = s.accessRole ? roleByRef(s.accessRole) : null;
  function fail(reason, extra) { return { status: "CREATE_FAILED", ok: false, steps: steps, reason: reason, logs: extra || [] }; }
  var hasRole = !!role && roleTrusts(role, "build.apprunner.amazonaws.com") && (role.policies.indexOf("AWSAppRunnerServicePolicyForECRAccess") >= 0 || iamCan(role, "ecr:GetAuthorizationToken", "*") && iamCan(role, "ecr:BatchGetImage", "*"));
  steps.push({ ok: hasRole, t: "access role ให้ App Runner ดึง image จาก ECR ส่วนตัว (trust build.apprunner.amazonaws.com + AWSAppRunnerServicePolicyForECRAccess)", d: hasRole ? role.name : !s.accessRole ? "ไม่ได้ตั้ง access role" : !role ? "ไม่พบ role " + s.accessRole : !roleTrusts(role, "build.apprunner.amazonaws.com") ? "trust ของ role ไม่ใช่ build.apprunner.amazonaws.com" : "role ขาด policy ECR" });
  if (!hasRole) return fail("Failed to pull your application image. Be sure you configured your service to use a valid access role with the required permissions to access ECR.", ["[AppRunner] Failed to pull image " + s.image + ": access denied (ไม่มี/ใช้ access role ไม่ได้)"]);
  var hasImg = !!repo && repo.images.some(function (x) { return x.tag === tag; });
  steps.push({ ok: hasImg, t: "image มีใน ECR (repo + tag)", d: hasImg ? s.image : !repo ? "ไม่มี repo " + (m ? m[3] : "?") : "repo " + repo.name + " ไม่มี tag " + tag });
  if (!hasImg) return fail("Failed to pull your application image. CannotPullContainerError: image " + s.image + " not found", ["[AppRunner] image not found: " + s.image]);
  var portOk = +s.port === APR_APP_PORT;
  steps.push({ ok: portOk, t: "port ที่ตั้ง (" + s.port + ") ตรงกับ port ที่แอปฟังจริง (" + APR_APP_PORT + ")", d: portOk ? "ตรง" : "แอปฟัง :" + APR_APP_PORT + " แต่ service ตั้ง :" + s.port });
  var logs = ["[AppRunner] Pulling image " + s.image, "[AppRunner] Successfully pulled your application image.", "[AppRunner] Provisioning instances and deploying image for privately accessible service.", "[App] INFO starting pharmacy-api env=" + (s.env.APP_ENV || "?"), "[App] INFO listening on :" + APR_APP_PORT];
  if (!portOk) return fail("Health check failed on protocol `" + s.health.protocol + "` [Port: '" + s.port + "'], failure threshold is 5 times. Check your configured port number. For more information, read the application logs.", logs.concat(["[AppRunner] Health check failed on protocol `" + s.health.protocol + "` [Port: '" + s.port + "'] (connection refused)", "[AppRunner] Deployment failed"]));
  var hcOk = s.health.protocol !== "HTTP" || s.health.path === APP_HEALTH_PATH;
  steps.push({ ok: hcOk, t: "health check " + s.health.protocol + (s.health.protocol === "HTTP" ? " " + s.health.path : "") + " ผ่าน", d: hcOk ? "ผ่าน" : "แอปไม่มี path " + s.health.path + " (ได้ 404) · path ที่ตอบ 200 คือ " + APP_HEALTH_PATH });
  if (!hcOk) return fail("Health check failed with status code 404 on path '" + s.health.path + "'. Check your configured health check path.", logs.concat(["[AppRunner] GET " + s.health.path + " → 404", "[AppRunner] Deployment failed"]));
  var warm = labReal() && Date.now() - (s.touched || 0) < 240000;
  return { status: warm ? "OPERATION_IN_PROGRESS" : "RUNNING", ok: true, steps: steps, reason: "", logs: logs.concat([warm ? "[AppRunner] Deployment in progress…" : "[AppRunner] Deployment completed successfully", "[AppRunner] Your application is running on " + s.url]) };
}
function aprResponse(s) { var e = aprEval(s); if (e.status !== "RUNNING") return null; var m = /:(.+)$/.exec(s.image); return { service: "pharmacy-api", env: s.env.APP_ENV || "?", version: m ? m[1] : "latest", platform: "aws-app-runner", port: s.port }; }
// ---------- Terraform ----------
TF_SCHEMA.aws_apprunner_service = sch(["service_name", "source_configuration", "instance_configuration", "health_check_configuration", "tags"], ["service_name", "source_configuration"], { source_configuration: { args: ["auto_deployments_enabled"], req: [], blocks: { authentication_configuration: { args: ["access_role_arn"], req: [] }, image_repository: { args: ["image_identifier", "image_repository_type"], req: ["image_identifier", "image_repository_type"], blocks: { image_configuration: { args: ["port", "runtime_environment_variables"], req: [] } } } } }, instance_configuration: { args: ["cpu", "memory", "instance_role_arn"], req: [] }, health_check_configuration: { args: ["protocol", "path", "interval", "timeout", "healthy_threshold", "unhealthy_threshold"], req: [] } }, ["tags", "instance_configuration", "health_check_configuration", "source_configuration"], ["id", "arn", "service_id", "service_url", "status"]);
TF_PROV.aws_apprunner_service = {
  act: "apprunner:CreateService", svc: "App Runner", op: "CreateService",
  create: function (c) {
    var a = c.attrs, sc = (a.source_configuration || [{}])[0] || {}, au = ((sc.authentication_configuration || [{}])[0] || {}).access_role_arn, ir = (sc.image_repository || [{}])[0] || {}, ic = (ir.image_configuration || [{}])[0] || {}, inst = (a.instance_configuration || [{}])[0] || {}, hc = (a.health_check_configuration || [{}])[0] || {};
    if (ir.image_repository_type && ir.image_repository_type !== "ECR") throw TfAwsError("creating App Runner Service (" + a.service_name + ")", "App Runner", "CreateService", "InvalidRequestException", "ตัวจำลองรองรับเฉพาะ image_repository_type = ECR");
    var s = ecsTfOk(API.createAppRunner({ name: a.service_name, image: ir.image_identifier, port: ic.port || 8080, cpu: inst.cpu || "1024", memory: inst.memory || "2048", accessRole: au, auto: sc.auto_deployments_enabled !== false, healthProtocol: hc.protocol || "TCP", healthPath: hc.path || "/", env: ic.runtime_environment_variables || {} }), "creating App Runner Service (" + a.service_name + ")", "App Runner", "CreateService");
    var arn = "arn:aws:apprunner:" + REGION + ":" + ACCOUNT + ":service/" + s.name + "/" + s.id, ev = aprEval(s);
    if (!ev.ok) { var we = new Error("waiting for App Runner Service (" + arn + ") create: unexpected state 'CREATE_FAILED', wanted target 'RUNNING'. last error: %!s(<nil>)"); we.tfAws = true; throw we; } // provider: waiter ใน service.go (Pending=OPERATION_IN_PROGRESS, Target=RUNNING) · ข้อความส่วน "unexpected state" มาจาก retry package ยังไม่ได้ยืนยัน
    return { id: arn, computed: { id: arn, arn: arn, service_id: s.id, service_url: s.url, status: aprEval(s).status }, sim: { name: s.name } };
  },
  update: function (st, d) { var sc = d.source_configuration ? d.source_configuration[0] || {} : null, ir = sc && (sc.image_repository || [{}])[0] || {}, ic = (ir.image_configuration || [{}])[0] || {}; API.updateAppRunner(st.sim.name, { image: ir.image_identifier, port: ic.port, env: ic.runtime_environment_variables }); },
  del: function (st) { API.deleteAppRunner(st.sim.name); },
  read: function (st) { return aprSvc(st.sim.name) ? { cfg: {}, computed: { status: aprEval(aprSvc(st.sim.name)).status } } : null; }
};
