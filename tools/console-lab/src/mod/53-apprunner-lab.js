// ===== Use case 7 (App Runner): สร้าง lab ผ่าน API, ตัวตรวจ, ลบ, HCL =====
function buildApr(kind) {
  buildEcs("ecs"); // ใช้ ECR + image v1.0.0 จาก lab 02 (ไม่ใช้ ECS)
  function ok(r) { if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.res; }
  S.ecsc = []; S.esvcs = []; S.tds = [];
  var role = null;
  if (kind !== "apr-base") { role = ok(API.createRole({ name: "pharmacy-apprunner-ecr", entity: "AWS service", usecase: "AppRunner", policies: kind === "apr-role" ? [] : ["AWSAppRunnerServicePolicyForECRAccess"] })); }
  if (kind === "apr-base") return;
  ["dev", "prd"].forEach(function (e) { ok(API.createAppRunner({ name: "pharmacy-api-" + e, image: ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com/pharmacy/api:" + (kind === "apr-tag" && e === "prd" ? "v9.9.9" : "v1.0.0"), port: kind === "apr-port" && e === "prd" ? 8080 : 8000, cpu: e === "prd" ? "1024" : "256", memory: e === "prd" ? "2048" : "512", accessRole: role.name, auto: false, healthProtocol: "HTTP", healthPath: kind === "apr-health" && e === "prd" ? "/health" : "/healthz", env: { APP_ENV: e } })); });
  S.aprKind = kind;
}
function checksApr() {
  var out = []; function add(ok, label, hint) { out.push({ ok: !!ok, label: label, hint: hint || "" }); }
  var role = roleByRef("pharmacy-apprunner-ecr"), repo = byName(S.repos, "pharmacy/api");
  add(repo && repo.images.some(function (i) { return i.tag === "v1.0.0"; }), "ECR pharmacy/api มี image v1.0.0", "docker push ขึ้น ECR (lab 02)");
  add(role && roleTrusts(role, "build.apprunner.amazonaws.com") && role.policies.indexOf("AWSAppRunnerServicePolicyForECRAccess") >= 0, "access role: trust build.apprunner.amazonaws.com + AWSAppRunnerServicePolicyForECRAccess", "IAM › Create role › App Runner");
  ["dev", "prd"].forEach(function (e) { var s = aprSvc("pharmacy-api-" + e), ev = s && aprEval(s); add(s && +s.port === 8000 && s.health.path === "/healthz" && s.health.protocol === "HTTP", e + ": port 8000 + health check HTTP /healthz", "Configuration › Health check"); add(ev && ev.status === "RUNNING", e + ": service RUNNING", "ดูข้อ ✗ ในแท็บ Overview"); var r = s && webOpen("https://" + s.url + "/"); add(r && r.site === "aprun", e + ": เปิด URL HTTPS ได้", "Browser"); });
  return out;
}
function aprDelPlan(kind, id, P) { if (kind !== "apr") return false; var s = aprSvc(id); if (!s) return false; P.title = "Delete service " + s.name; P.crumb = "App Runner › Services › Delete"; P.word = "delete"; P.done = "ลบ service แล้ว (URL ใช้ไม่ได้)"; return true; }
function aprDelDo(kind, id) { return kind === "apr" ? API.deleteAppRunner(id) : { res: true }; }
function aprHcl(o, ref) { S.aprs.forEach(function (s) { var r = s.accessRole ? byName(S.roles, s.accessRole) : null; o.push(hcm("apr", s.name) + 'resource "aws_apprunner_service" "' + slug(s.name) + '" {\n  service_name = "' + s.name + '"\n\n  source_configuration {\n    auto_deployments_enabled = ' + s.auto + '\n\n    authentication_configuration {\n      access_role_arn = ' + (r ? ref(r.id, "arn") : '"' + s.accessRole + '"') + '\n    }\n\n    image_repository {\n      image_identifier      = "' + s.image + '"\n      image_repository_type = "ECR"\n\n      image_configuration {\n        port = "' + s.port + '"\n      }\n    }\n  }\n\n  instance_configuration {\n    cpu    = "' + s.cpu + '"\n    memory = "' + s.memory + '"\n  }\n\n  health_check_configuration {\n    protocol = "' + s.health.protocol + '"\n    path     = "' + s.health.path + '"\n  }\n}'); }); }
