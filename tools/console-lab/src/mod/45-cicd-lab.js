// ===== Use case 4 (CI/CD): สร้าง lab ผ่าน API เหมือนกดใน console, ตัวตรวจ, ลบ, HCL, คำสั่ง aws =====
function cdBucketName() { return "pharmacy-pipeline-" + ACCOUNT; }
function cdBuildDoc(kind) {
  var st = [{ Effect: "Allow", Action: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"], Resource: ["*"] }, { Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject", "s3:GetObjectVersion"], Resource: [cdBucketArn(cdBucketName()) + "/*"] }];
  if (kind !== "cd-ecr") st.push({ Effect: "Allow", Action: ["ecr:GetAuthorizationToken"], Resource: ["*"] }, { Effect: "Allow", Action: ["ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"], Resource: ["arn:aws:ecr:" + REGION + ":" + ACCOUNT + ":repository/pharmacy/api"] });
  return { Version: "2012-10-17", Statement: st };
}
function cdPipeDoc(kind, connArn, projArn) {
  var st = [{ Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject", "s3:GetObjectVersion", "s3:GetBucketVersioning"], Resource: [cdBucketArn(cdBucketName()), cdBucketArn(cdBucketName()) + "/*"] }, { Effect: "Allow", Action: ["codestar-connections:UseConnection"], Resource: [connArn] }, { Effect: "Allow", Action: ["codebuild:StartBuild", "codebuild:BatchGetBuilds"], Resource: [projArn] }, { Effect: "Allow", Action: ["ecs:DescribeServices", "ecs:DescribeTaskDefinition", "ecs:DescribeTasks", "ecs:ListTasks", "ecs:RegisterTaskDefinition", "ecs:UpdateService"], Resource: ["*"] }];
  if (kind !== "cd-pass") st.push({ Effect: "Allow", Action: ["iam:PassRole"], Resource: ["arn:aws:iam::" + ACCOUNT + ":role/pharmacy-ecs-*"] });
  return { Version: "2012-10-17", Statement: st };
}
function cdStages(connArn, kind) {
  var A = function (name, category, provider, cfg) { return { name: name, category: category, provider: provider, cfg: cfg }; }, ecs = function (e) { return { ClusterName: "pharmacy-" + e, ServiceName: "pharmacy-api", FileName: "imagedefinitions.json" }; };
  return [{ name: "Source", actions: [A("GitHub", "Source", "CodeStarSourceConnection", { ConnectionArn: connArn, FullRepositoryId: "YOUR_GITHUB_USER/pharmacy-backend", BranchName: "main" })] }, { name: "Build", actions: [A("DockerBuild", "Build", "CodeBuild", { ProjectName: "pharmacy-api-build" })] }, { name: "DeployDev", actions: [A("EcsDev", "Deploy", "ECS", ecs("dev"))] }, { name: "Approve", actions: [A("PromoteToProd", "Approval", "Manual", { CustomData: "ตรวจ dev แล้วกดอนุมัติเพื่อ deploy prd" })] }, { name: "DeployPrd", actions: [A("EcsPrd", "Deploy", "ECS", ecs("prd"))] }];
}
function buildCd(kind) {
  buildEcs("ecs"); // ปลายทางของ pipeline = ECS จาก lab 02
  function ok(r) { if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.res; }
  ok(API.createBucket({ name: cdBucketName(), region: REGION }));
  var conn = ok(API.createConnection({ name: "pharmacy-github", provider: "GitHub" })); if (kind !== "cd-conn") API.authorizeConnection(conn.name);
  var rb = ok(API.createRole({ name: "pharmacy-codebuild", entity: "AWS service", usecase: "CodeBuild", policies: [] })); rb.inline = [{ name: "build", doc: cdBuildDoc(kind) }];
  var pr = ok(API.createCbProject({ name: "pharmacy-api-build", role: "pharmacy-codebuild", image: "aws/codebuild/standard:7.0", privileged: kind !== "cd-docker", env: { ECR_REPO_URL: ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com/pharmacy/api", CONTAINER_NAME: kind === "cd-deploy" ? "app" : "api" } }));
  var rp = ok(API.createRole({ name: "pharmacy-pipeline", entity: "AWS service", usecase: "CodePipeline", policies: [] })); rp.inline = [{ name: "pipeline", doc: cdPipeDoc(kind, conn.arn, pr.arn) }];
  if (kind !== "cd-base") {
    var p = ok(API.createPipeline({ name: "pharmacy-api", role: "pharmacy-pipeline", bucket: cdBucketName(), stages: cdStages(conn.arn, kind) }));
    if (kind === "cd") { var ex = p.execs[0]; if (ex.stages[3].status === "Waiting") API.approveStage(p.name, ex.id, true, "dev ผ่านแล้ว"); }
  }
  S.cdKind = kind;
}
function cdLatest(p) { return p && p.execs[0] || null; }
function checksCd() {
  var out = []; function add(ok, label, hint) { out.push({ ok: !!ok, label: label, hint: hint || "" }); }
  var b = S.buckets.filter(function (x) { return x.name === cdBucketName(); })[0], conn = S.conns[0], pr = cdProj("pharmacy-api-build"), p = cdPipe("pharmacy-api"), rb = roleByRef("pharmacy-codebuild"), rp = roleByRef("pharmacy-pipeline");
  add(b && b.block.acls && b.block.policy, "S3 bucket เก็บ artifact (ส่วนตัว)", "S3 → Create bucket");
  add(conn && conn.status === "AVAILABLE", "GitHub connection สถานะ AVAILABLE (authorize แล้ว)", "Settings → Connections → Update pending connection");
  add(rb && roleTrusts(rb, "codebuild.amazonaws.com") && iamCan(rb, "ecr:GetAuthorizationToken", "*") && iamCan(rb, "ecr:PutImage", "arn:aws:ecr:" + REGION + ":" + ACCOUNT + ":repository/pharmacy/api"), "role CodeBuild: trust codebuild + login/push ECR", "IAM → role pharmacy-codebuild → แนบ AmazonEC2ContainerRegistryPowerUser");
  add(pr && pr.privileged, "CodeBuild เปิด Privileged mode (docker build ได้)", "CodeBuild → project → Edit → Environment → Privileged");
  add(pr && pr.env.CONTAINER_NAME === "api" && /pharmacy\/api$/.test(pr.env.ECR_REPO_URL || ""), "ตัวแปร CONTAINER_NAME = api และ ECR_REPO_URL ชี้ pharmacy/api", "ชื่อ container ต้องตรง task definition");
  add(rp && roleTrusts(rp, "codepipeline.amazonaws.com") && iamCan(rp, "iam:PassRole", "arn:aws:iam::" + ACCOUNT + ":role/pharmacy-ecs-execution"), "role Pipeline: trust codepipeline + iam:PassRole (execution/task role ของ ECS)", "เพิ่ม iam:PassRole ใน policy ของ pharmacy-pipeline");
  add(p && p.stages.map(function (s) { return s.name; }).join(">") === "Source>Build>DeployDev>Approve>DeployPrd", "pipeline ครบ 5 ขั้น Source → Build → DeployDev → Approve → DeployPrd", "CodePipeline → Create pipeline");
  var ex = cdLatest(p), dev = S.esvcs.filter(function (s) { return s.cluster === "pharmacy-dev"; })[0], prd = S.esvcs.filter(function (s) { return s.cluster === "pharmacy-prd"; })[0];
  add(ex && ex.stages[0].status === "Succeeded" && ex.stages[1].status === "Succeeded", "execution ล่าสุด: Source + Build สำเร็จ (image ถูก push ขึ้น ECR)", "ดูขั้นที่ล้มใน pipeline › กด Details");
  add(ex && ex.stages[2].status === "Succeeded" && dev && !/:1$/.test(dev.td) && ecsEval(dev).stable, "DeployDev: service dev ใช้ task definition revision ใหม่และ stable", "ECS › pharmacy-dev › Services");
  add(ex && ex.stages[4].status === "Succeeded" && prd && !/:1$/.test(prd.td) && ecsEval(prd).stable, "DeployPrd: หลังอนุมัติ service prd ใช้ revision ใหม่และ stable", "กด Review ที่ขั้น Approve");
  return out;
}
// ---------- ลบจาก console ----------
function cdDelPlan(kind, id, P) {
  if (kind === "pipe") { var p = cdPipe(id); if (!p) return false; P.title = "Delete pipeline " + p.name; P.crumb = "CodePipeline › Pipelines › Delete"; P.word = "delete"; P.done = "ลบ pipeline แล้ว (ECS ที่ deploy ไปแล้วยังรันต่อ)"; }
  else if (kind === "cbp") { var c = cdProj(id); if (!c) return false; P.title = "Delete build project " + c.name; P.crumb = "CodeBuild › Build projects › Delete"; P.word = "delete"; P.done = "ลบ project แล้ว"; S.pipes.forEach(function (x) { if (x.stages.some(function (s) { return s.actions.some(function (a) { return a.cfg.ProjectName === c.name; }); })) P.note = "pipeline " + x.name + " ยังใช้ project นี้ ลบแล้วขั้น Build จะล้ม"; }); }
  else if (kind === "conn") { var n = S.conns.filter(function (x) { return x.id === id; })[0]; if (!n) return false; P.title = "Delete connection " + n.name; P.crumb = "Settings › Connections › Delete"; P.word = "delete"; P.done = "ลบ connection แล้ว"; S.pipes.forEach(function (x) { if (x.stages.some(function (s) { return s.actions.some(function (a) { return a.cfg.ConnectionArn === n.arn; }); })) P.note = "pipeline " + x.name + " ใช้ connection นี้อยู่ ลบแล้วขั้น Source จะล้ม"; }); }
  else return false; return true;
}
function cdDelDo(kind, id) { if (kind === "pipe") return API.deletePipeline(id); if (kind === "cbp") return API.deleteCbProject(id); if (kind === "conn") return API.deleteConnection(id); return { res: true }; }
// ---------- HCL จากของที่กดใน console ----------
function cdHcl(o, ref) {
  var sl = slug;
  S.conns.forEach(function (c) { o.push(hcm("cdconn", c.name) + 'resource "aws_codestarconnections_connection" "' + sl(c.name) + '" {\n  name          = "' + c.name + '"\n  provider_type = "' + c.provider + '"   # สถานะ PENDING จนกว่าจะ authorize ใน console\n}'); });
  S.cbps.forEach(function (p) { var r = byName(S.roles, p.role); o.push(hcm("cdproj", p.name) + 'resource "aws_codebuild_project" "' + sl(p.name) + '" {\n  name         = "' + p.name + '"\n  service_role = ' + (r ? ref(r.id, "arn") : '"' + p.role + '"') + '\n\n  source {\n    type = "CODEPIPELINE"\n  }\n\n  artifacts {\n    type = "CODEPIPELINE"\n  }\n\n  environment {\n    compute_type    = "' + p.compute + '"\n    image           = "' + p.image + '"\n    type            = "LINUX_CONTAINER"\n    privileged_mode = ' + p.privileged + "   # false = docker build ใช้ไม่ได้\n" + Object.keys(p.env).map(function (k) { return '\n    environment_variable {\n      name  = "' + k + '"\n      value = "' + p.env[k] + '"\n    }\n'; }).join("") + "  }\n}"); });
  S.pipes.forEach(function (p) { var r = byName(S.roles, p.role); o.push(hcm("cdpipe", p.name) + 'resource "aws_codepipeline" "' + sl(p.name) + '" {\n  name     = "' + p.name + '"\n  role_arn = ' + (r ? ref(r.id, "arn") : '"' + p.role + '"') + '\n\n  artifact_store {\n    location = "' + p.bucket + '"\n    type     = "S3"\n  }\n' + p.stages.map(function (s) { return '\n  stage {\n    name = "' + s.name + '"\n' + s.actions.map(function (a) { return '\n    action {\n      name     = "' + a.name + '"\n      category = "' + a.category + '"\n      owner    = "AWS"\n      provider = "' + a.provider + '"\n      version  = "1"\n\n      configuration = {\n' + Object.keys(a.cfg).map(function (k) { return "        " + k + ' = "' + a.cfg[k] + '"\n'; }).join("") + "      }\n    }\n"; }).join("") + "  }\n"; }).join("") + "}"); });
}
// ---------- คำสั่ง aws codepipeline / codebuild ----------
function cdStateLines(p) {
  var lines = ["{", '    "pipelineName": "' + p.name + '",', '    "stageStates": ['];
  p.stages.forEach(function (s, i) { var v = cdStageView(p, i); lines.push('        { "stageName": "' + s.name + '", "latestExecution": { "status": "' + v.status + '"' + (v.exec ? ', "pipelineExecutionId": "' + v.exec.id + '"' : "") + " }" + (v.err ? ', "error": ' + JSON.stringify(v.err) : "") + " }" + (i < p.stages.length - 1 ? "," : "")); });
  return lines.concat(["    ]", "}"]);
}
function cdStageView(p, i) { for (var k = 0; k < p.execs.length; k++) { var s = p.execs[k].stages[i]; if (s.status !== "NotRun") return { status: s.status, exec: p.execs[k], err: (s.actions.filter(function (a) { return a.err; })[0] || {}).err || "", actions: s.actions }; } return { status: "NotRun", exec: null, err: "", actions: p.stages[i].actions.map(function (a) { return { name: a.name, status: "NotRun", summary: "", err: "" }; }) }; }
function shAwsCd(a, w, need) {
  var op = a[0] + " " + a[1];
  function arg(n) { var i = a.indexOf(n); return i >= 0 ? a[i + 1] : ""; }
  if (op === "codepipeline list-pipelines") return need("codepipeline:ListPipelines", "ListPipelines", function () { return ["{", '    "pipelines": [' + S.pipes.map(function (p) { return '{ "name": "' + p.name + '", "version": 1 }'; }).join(", ") + "]", "}"]; });
  if (op === "codepipeline get-pipeline-state") return need("codepipeline:GetPipelineState", "GetPipelineState", function () { var p = cdPipe(arg("--name")); if (!p) return ["", "An error occurred (PipelineNotFoundException) when calling the GetPipelineState operation: Pipeline '" + arg("--name") + "' does not exist"]; return cdStateLines(p); });
  if (op === "codepipeline start-pipeline-execution") return need("codepipeline:StartPipelineExecution", "StartPipelineExecution", function () { var r = API.startPipeline(arg("--name")); if (r.errors) return ["", "An error occurred (PipelineNotFoundException) when calling the StartPipelineExecution operation: " + String(r.errors._).replace(/^[A-Za-z]+: /, "")]; return ["{", '    "pipelineExecutionId": "' + r.res.id + '"', "}"]; });
  if (op === "codebuild list-projects") return need("codebuild:ListProjects", "ListProjects", function () { return ["{", '    "projects": [' + S.cbps.map(function (p) { return '"' + p.name + '"'; }).join(", ") + "]", "}"]; });
  return null;
}
