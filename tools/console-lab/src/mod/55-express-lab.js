// ===== Use case 8 (ECS Express Mode): สร้าง lab ผ่าน API, ตัวตรวจ, ลบ =====
function buildExpress(kind) {
  buildEcs("ecs"); // ใช้ ECR + image v1.0.0 จาก lab 02 (ไม่ใช้ ALB/RDS/cluster ของ lab นั้น)
  function ok(r) { if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.res; }
  S.ecsc = []; S.esvcs = []; S.tds = []; S.albs = []; S.tgs = []; S.rds = []; S.lgs = [];
  S.roles = S.roles.filter(function (r) { return !/^pharmacy-ecs-/.test(r.name); });
  if (kind === "exp-base") { S.expKind = kind; return; }
  ok(API.createRole({ name: "pharmacy-express-execution", entity: "AWS service", usecase: "ECS", policies: kind === "exp-exec" ? [] : ["AmazonECSTaskExecutionRolePolicy"] }));
  ok(API.createRole({ name: "pharmacy-express-infrastructure", entity: "AWS service", usecase: "ECSService", policies: kind === "exp-infra" ? [] : [EXP_INFRA_POLICY] }));
  ok(API.createEcsCluster({ name: "pharmacy-express" }));
  var E2 = { dev: { cpu: 256, memory: 512, min: 1, max: 2 }, prd: { cpu: 512, memory: 1024, min: 2, max: 6 } };
  Object.keys(E2).forEach(function (e) {
    ok(API.createLogGroup({ name: "/ecs/pharmacy-express-" + e, retention: 7 }));
    ok(API.createExpress({ image: ecsRepoUri() + ":" + (kind === "exp-tag" && e === "prd" ? "v9.9.9" : "v1.0.0"), execRole: "pharmacy-express-execution", infraRole: "pharmacy-express-infrastructure", cluster: "pharmacy-express", name: "pharmacy-api-" + e, port: kind === "exp-port" && e === "prd" ? 8080 : 8000, healthPath: kind === "exp-health" && e === "prd" ? "/health" : "/healthz", cpu: E2[e].cpu, memory: E2[e].memory, min: E2[e].min, max: E2[e].max, env: [{ name: "APP_ENV", value: e }], logGroup: "/ecs/pharmacy-express-" + e }));
  });
  S.expKind = kind;
}
function checksExpress() {
  var out = []; function add(ok, label, hint) { out.push({ ok: !!ok, label: label, hint: hint || "" }); }
  var repo = byName(S.repos, "pharmacy/api"), xr = roleByRef("pharmacy-express-execution"), ir = roleByRef("pharmacy-express-infrastructure");
  add(repo && repo.images.some(function (i) { return i.tag === "v1.0.0"; }), "ECR pharmacy/api มี image v1.0.0", "docker push ขึ้น ECR (lab 02)");
  add(xr && roleTrusts(xr, "ecs-tasks.amazonaws.com") && xr.policies.indexOf("AmazonECSTaskExecutionRolePolicy") >= 0, "execution role: trust ecs-tasks + AmazonECSTaskExecutionRolePolicy", "IAM › Create role › Elastic Container Service Task");
  add(ir && expInfraOk(ir), "infrastructure role: trust ecs.amazonaws.com + " + EXP_INFRA_POLICY, "IAM › Create role › Elastic Container Service › แนบ policy นี้");
  ["dev", "prd"].forEach(function (e) {
    var x = expOf("pharmacy-express", "pharmacy-api-" + e), ev = x && expEval(x);
    add(x && x.port === EXP_APP_PORT && (x.healthPath === "/healthz" || x.healthPath === "/"), e + ": container port 8000 + health check path /healthz", "ECS › Express mode › Configuration");
    add(ev && ev.status === "Active", e + ": Express service Active (task healthy, steady state)", "ดูข้อ ✗ ในแท็บ Overview / Resources");
    var r = x && webOpen("https://" + x.host + "/"); add(r && r.site === "api", e + ": เปิด URL HTTPS ได้ (200)", "เปิดที่ Browser");
  });
  var albs = S.albs.filter(function (a) { return a.express; }); add(albs.length === 1 && S.exps.length === 2, "dev + prd อยู่ cluster เดียวกัน แชร์ ALB ตัวเดียว (host-header rule)", "Express แชร์ ALB ให้เองเมื่อ VPC เดียวกัน");
  return out;
}
function expDelPlan(kind, id, P) { if (kind !== "exp") return false; var x = S.exps.filter(function (e) { return e.id === id; })[0]; if (!x) return false; P.title = "Delete Express service " + x.name; P.crumb = "Amazon ECS › Express mode › Delete"; P.word = "delete"; P.done = "ลบ Express service แล้ว (URL ใช้ไม่ได้ ALB/target group/SG ของ service นี้ถูกลบด้วย)"; return true; }
function expDelDo(kind, id) { if (kind !== "exp") return { res: true }; var x = S.exps.filter(function (e) { return e.id === id; })[0]; return x ? API.deleteExpress(x.cluster, x.name) : { res: true }; }
