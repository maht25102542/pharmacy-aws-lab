// ===== Use case 4: CI/CD (CodePipeline + CodeBuild → ECR → ECS dev → อนุมัติ → ECS prd) =====
// รัน pipeline = คำนวณทีละขั้นจากโครงสร้างปัจจุบัน (สิทธิ์ role, connection, สิทธิ์ ECR, privileged mode, ECS service) แล้วเก็บผลไว้ใน execution
// ข้อความ error ที่ระบุว่า "จำจากเอกสาร/ประสบการณ์" อาจไม่ตรงทุกตัวอักษรกับของจริง (ดู labs/VERIFY.md)
function iamPat(p) { return new RegExp("^" + String(p).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$", "i"); }
// role นี้ทำ action นี้กับ resource นี้ได้ไหม: ดูทั้ง managed policy ที่แนบและ inline policy (Allow เท่านั้น ไม่รองรับ Deny/Condition)
function iamCan(role, action, arn) {
  if (!role) return false; var ok = false;
  (role.policies || []).forEach(function (n) { var d = POLICY_DEF[n]; if (d && d.actions.some(function (a) { return iamPat(a).test(action); })) ok = true; });
  if (ok) return true;
  return (role.inline || []).some(function (p) { return [].concat(p.doc.Statement || []).some(function (s) { if (s.Effect !== "Allow") return false; return [].concat(s.Action || []).some(function (a) { return iamPat(a).test(action); }) && [].concat(s.Resource || ["*"]).some(function (r) { return r === "*" || iamPat(r).test(arn || "*"); }); }); });
}
function cdNotAuth(role, action, arn, sess) { return "User: arn:aws:sts::" + ACCOUNT + ":assumed-role/" + (role ? role.name : "?") + "/" + sess + " is not authorized to perform: " + action + " on resource: " + arn + " because no identity-based policy allows the " + action + " action"; }
function cdHex(n) { return fakeId("", n, "0123456789abcdef"); }
function cdUuid() { return cdHex(8) + "-" + cdHex(4) + "-" + cdHex(4) + "-" + cdHex(4) + "-" + cdHex(12); }
function cdPipe(n) { return S.pipes.filter(function (p) { return p.name === n; })[0] || null; }
function cdProj(n) { return S.cbps.filter(function (p) { return p.name === n; })[0] || null; }
function cdConn(arn) { return S.conns.filter(function (c) { return c.arn === arn; })[0] || null; }
function isCdLab() { return S.pipes.length > 0 || S.cbps.length > 0 || S.conns.length > 0; }
function cdBucketArn(n) { return "arn:aws:s3:::" + n; }

// ---------- connection ----------
API.createConnection = function (o) {
  var n = String(o.name || ""); if (!n) return E("name", "ต้องกรอกชื่อ connection"); if (!/^[A-Za-z0-9_.-]{1,32}$/.test(n)) return E("name", "ValidationException: ชื่อ connection ใช้ตัวอักษร ตัวเลข _ . - ไม่เกิน 32 ตัว");
  if (S.conns.some(function (c) { return c.name === n; })) return E("name", "ResourceAlreadyExistsException: Connection with name " + n + " already exists");
  var c = { id: n, name: n, provider: o.provider || "GitHub", arn: "arn:aws:codestar-connections:" + REGION + ":" + ACCOUNT + ":connection/" + cdUuid(), status: "PENDING", born: Date.now() }; S.conns.push(c); return { res: c };
};
API.authorizeConnection = function (n) { var c = S.conns.filter(function (x) { return x.name === n; })[0]; if (!c) return E("_", "ResourceNotFoundException: Connection not found"); c.status = "AVAILABLE"; return { res: c }; };
API.deleteConnection = function (n) { S.conns = S.conns.filter(function (c) { return c.name !== n; }); return { res: true }; };

// ---------- CodeBuild project ----------
var CB_IMAGES = ["aws/codebuild/standard:7.0", "aws/codebuild/standard:6.0", "aws/codebuild/amazonlinux2-x86_64-standard:5.0", "aws/codebuild/amazonlinux-aarch64-standard:3.0"];
API.createCbProject = function (o) {
  var er = {}, n = String(o.name || ""), role = roleByRef(o.role);
  if (!n) er.name = "ต้องกรอกชื่อ project"; else if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,254}$/.test(n)) er.name = "InvalidInputException: Invalid project name: " + n + " (ตัวอักษร ตัวเลข - _ ยาว 2-255 เริ่มด้วยตัวอักษร/ตัวเลข)"; else if (cdProj(n)) er.name = "ResourceAlreadyExistsException: Project already exists: arn:aws:codebuild:" + REGION + ":" + ACCOUNT + ":project/" + n;
  if (!o.role) er.role = "ต้องเลือก service role"; else if (!role || !roleTrusts(role, "codebuild.amazonaws.com")) er.role = "InvalidInputException: CodeBuild is not authorized to perform: sts:AssumeRole on arn:aws:iam::" + ACCOUNT + ":role/" + String(o.role).split("/").pop();
  if (CB_IMAGES.indexOf(o.image) < 0) er.image = "InvalidInputException: Invalid image: " + (o.image || "") + " (เลือกจาก managed image)";
  if (Object.keys(er).length) return { errors: er };
  var p = { id: n, name: n, arn: "arn:aws:codebuild:" + REGION + ":" + ACCOUNT + ":project/" + n, role: role.name, image: o.image, compute: o.compute || "BUILD_GENERAL1_SMALL", privileged: !!o.privileged, env: Object.assign({}, o.env || {}), buildspec: o.buildspec || "", builds: [], born: Date.now() }; S.cbps.push(p); return { res: p };
};
API.updateCbProject = function (n, o) { var p = cdProj(n); if (!p) return E("_", "ResourceNotFoundException: Project cannot be found: " + n); if (o.privileged !== undefined) p.privileged = !!o.privileged; if (o.env) p.env = Object.assign({}, o.env); if (o.role) { var r = roleByRef(o.role); if (!r || !roleTrusts(r, "codebuild.amazonaws.com")) return E("role", "InvalidInputException: CodeBuild is not authorized to perform: sts:AssumeRole on arn:aws:iam::" + ACCOUNT + ":role/" + o.role); p.role = r.name; } return { res: p }; };
API.deleteCbProject = function (n) { S.cbps = S.cbps.filter(function (p) { return p.name !== n; }); return { res: true }; };

// ---------- pipeline ----------
var CD_REQ = { CodeStarSourceConnection: ["ConnectionArn", "FullRepositoryId", "BranchName"], CodeBuild: ["ProjectName"], ECS: ["ClusterName", "ServiceName"], Manual: [] };
API.createPipeline = function (o) {
  var er = {}, n = String(o.name || ""), role = roleByRef(o.role), st = o.stages || [];
  if (!n) er.name = "ต้องกรอกชื่อ pipeline"; else if (!/^[A-Za-z0-9.@_-]{1,100}$/.test(n)) er.name = "InvalidPipelineNameException: ชื่อ pipeline ใช้ตัวอักษร ตัวเลข . @ - _ ไม่เกิน 100 ตัว"; else if (cdPipe(n)) er.name = "PipelineNameInUseException: The pipeline with name '" + n + "' already exists";
  if (!o.role) er.role = "ต้องเลือก service role"; else if (!role || !roleTrusts(role, "codepipeline.amazonaws.com")) er.role = "InvalidStructureException: CodePipeline is not authorized to perform AssumeRole on role arn:aws:iam::" + ACCOUNT + ":role/" + String(o.role).split("/").pop();
  if (!S.buckets.some(function (b) { return b.name === o.bucket; })) er.bucket = "InvalidStructureException: The bucket named '" + (o.bucket || "") + "' does not exist (artifact store)";
  if (st.length < 2) er.stages = "InvalidStructureException: Pipeline ต้องมีอย่างน้อย 2 stage";
  else if (!st[0].actions.length || st[0].actions[0].category !== "Source") er.stages = "InvalidStructureException: Stage แรกต้องเป็น Source";
  else st.forEach(function (s) { if (!er.stages && !s.actions.length) er.stages = "InvalidStructureException: Stage '" + s.name + "' ต้องมี action อย่างน้อย 1"; s.actions.forEach(function (a) { var req = CD_REQ[a.provider]; if (!req && !er.stages) er.stages = "InvalidActionDeclarationException: Action '" + a.name + "' provider " + a.provider + " ไม่รองรับในตัวจำลอง"; (req || []).forEach(function (k) { if (!er.stages && !(a.cfg && a.cfg[k])) er.stages = "InvalidActionDeclarationException: Action configuration for action '" + a.name + "' is missing required configuration '" + k + "'"; }); }); });
  if (Object.keys(er).length) return { errors: er };
  var p = { id: n, name: n, role: role.name, bucket: o.bucket, stages: st.map(function (s) { return { name: s.name, actions: s.actions.map(function (a) { return { name: a.name, category: a.category, provider: a.provider, cfg: Object.assign({}, a.cfg || {}) }; }) }; }), execs: [], born: Date.now(), arn: "arn:aws:codepipeline:" + REGION + ":" + ACCOUNT + ":" + n }; S.pipes.push(p);
  API.startPipeline(n); // CodePipeline เริ่มรันครั้งแรกเองทันทีที่สร้างเสร็จ
  return { res: p };
};
API.deletePipeline = function (n) { S.pipes = S.pipes.filter(function (p) { return p.name !== n; }); return { res: true }; };
API.startPipeline = function (n, commit) {
  var p = cdPipe(n); if (!p) return E("_", "PipelineNotFoundException: Pipeline with name '" + n + "' does not exist");
  var c = commit || cdHex(40), ex = { id: cdUuid(), status: "InProgress", commit: c, msg: "Update " + (p.execs.length + 1), born: Date.now(), stages: p.stages.map(function (s) { return { name: s.name, status: "NotRun", actions: s.actions.map(function (a) { return { name: a.name, status: "NotRun", summary: "", err: "" }; }) }; }), art: {} };
  p.execs.unshift(ex); cdRunFrom(p, ex, 0); return { res: ex };
};
API.retryStage = function (n, execId, si) { var p = cdPipe(n), ex = p && p.execs.filter(function (e) { return e.id === execId; })[0]; if (!ex || ex.stages[si].status !== "Failed") return E("_", "StageNotRetryableException: Stage ไม่อยู่ในสถานะ Failed"); ex.status = "InProgress"; cdRunFrom(p, ex, si); return { res: ex }; };
API.approveStage = function (n, execId, ok, note) {
  var p = cdPipe(n), ex = p && p.execs.filter(function (e) { return e.id === execId; })[0], si = ex ? ex.stages.findIndex(function (s) { return s.status === "Waiting"; }) : -1;
  if (si < 0) return E("_", "ApprovalAlreadyCompletedException: ไม่มีขั้นที่รออนุมัติ");
  var a = ex.stages[si].actions[0]; a.note = note || "";
  if (ok) { a.status = "Succeeded"; a.summary = "Approved" + (note ? ": " + note : ""); ex.stages[si].status = "Succeeded"; cdRunFrom(p, ex, si + 1); }
  else { a.status = "Failed"; a.err = "Rejected" + (note ? ": " + note : ""); a.summary = a.err; ex.stages[si].status = "Failed"; ex.status = "Failed"; }
  return { res: ex };
};
function cdRunFrom(p, ex, from) {
  var role = roleByRef(p.role);
  for (var i = from; i < p.stages.length; i++) {
    var sd = p.stages[i], sx = ex.stages[i]; sx.status = "InProgress";
    for (var j = 0; j < sd.actions.length; j++) {
      var ad = sd.actions[j], ax = sx.actions[j]; ax.status = "InProgress"; ax.err = "";
      if (ad.provider === "Manual") { ax.status = "Waiting"; ax.summary = ad.cfg.CustomData || "Waiting for approval"; sx.status = "Waiting"; ex.status = "InProgress"; return; }
      var r = ad.provider === "CodeStarSourceConnection" ? cdSource(p, ad, ex, role) : ad.provider === "CodeBuild" ? cdBuildAction(p, ad, ex, role) : cdEcsDeploy(p, ad, ex, role);
      ax.status = r.ok ? "Succeeded" : "Failed"; ax.summary = r.summary || ""; ax.err = r.ok ? "" : r.err; ax.buildId = r.buildId || ax.buildId;
      if (!r.ok) { sx.status = "Failed"; ex.status = "Failed"; return; }
    }
    sx.status = "Succeeded";
  }
  ex.status = "Succeeded";
}
function cdSource(p, ad, ex, role) {
  var c = cdConn(ad.cfg.ConnectionArn), sess = "pipeline-" + cdHex(6);
  if (!c) return { err: "Unable to use Connection: " + ad.cfg.ConnectionArn + ". The connection does not exist (ถูกลบ หรือ ARN ผิด)" };
  if (!iamCan(role, "codestar-connections:UseConnection", c.arn)) return { err: "Unable to use Connection: " + c.arn + ". The provided role does not have sufficient permissions." };
  if (c.status !== "AVAILABLE") return { err: "Connection is not available. (" + c.arn + " อยู่ในสถานะ " + c.status + " · ไป Developer Tools › Settings › Connections › Update pending connection แล้ว Complete connection)" };
  if (!iamCan(role, "s3:PutObject", cdBucketArn(p.bucket) + "/x")) return { err: "The provided role does not have sufficient permissions to write to the artifact bucket " + p.bucket + " (" + cdNotAuth(role, "s3:PutObject", cdBucketArn(p.bucket) + "/x", sess).split(" because")[0] + ")" };
  ex.art.source = { commit: ex.commit, repo: ad.cfg.FullRepositoryId, branch: ad.cfg.BranchName };
  return { ok: true, summary: ad.cfg.FullRepositoryId + "@" + ad.cfg.BranchName + " · " + ex.commit.slice(0, 8) + " " + ex.msg };
}
function cdBuildAction(p, ad, ex, role) {
  var pr = cdProj(ad.cfg.ProjectName), sess = "pipeline-" + cdHex(6);
  if (!pr) return { err: "Project cannot be found: arn:aws:codebuild:" + REGION + ":" + ACCOUNT + ":project/" + ad.cfg.ProjectName };
  if (!iamCan(role, "codebuild:StartBuild", pr.arn)) return { err: "Action failed: " + cdNotAuth(role, "codebuild:StartBuild", pr.arn, sess) };
  var b = cdRunBuild(pr, ex.commit, p); ex.art.image = b.ok ? b.artifact : null; return { ok: b.ok, buildId: b.id, summary: b.ok ? "Build " + b.num + " succeeded · " + b.imageUri : "", err: "Build " + b.num + " failed: " + b.reason + " (ดูรายละเอียดที่ CodeBuild › Build history › log)" };
}
// รัน buildspec มาตรฐานของ lab: ecr login → docker build → docker push → เขียน imagedefinitions.json
function cdRunBuild(pr, commit, p) {
  var role = roleByRef(pr.role), num = pr.builds.length + 1, id = pr.name + ":" + cdUuid(), tag = commit.slice(0, 8), url = pr.env.ECR_REPO_URL || "", m = /^(\d+)\.dkr\.ecr\.([a-z0-9-]+)\.amazonaws\.com\/(.+)$/.exec(url), rname = m ? m[3] : "", sess = "AWSCodeBuild-" + cdUuid(), logs = [], b = { id: id, num: num, status: "IN_PROGRESS", born: Date.now(), commit: commit, logs: logs, phases: [], ok: false, reason: "", imageUri: "" };
  var lgn = "/aws/codebuild/" + pr.name; if (iamCan(role, "logs:CreateLogStream", "*") && !S.lgs.some(function (g) { return g.name === lgn; })) S.lgs.push({ id: lgn, name: lgn, retention: 0, born: Date.now(), tagMap: {}, auto: true });
  function L() { for (var i = 0; i < arguments.length; i++) logs.push(arguments[i]); }
  function ph(n, ok, d) { b.phases.push({ name: n, ok: ok, d: d || "" }); }
  function fail(phase, cmd, msg, reason) { L(msg, "", "[Container] " + new Date().toISOString().replace("T", " ").slice(0, 19) + " Command did not exit successfully " + cmd + " exit status 1", "[Container] Phase complete: " + phase + " State: FAILED", "[Container] Phase context status code: COMMAND_EXECUTION_ERROR Message: Error while executing command: " + cmd + ". Reason: exit status 1"); ph(phase, false, reason); b.status = "FAILED"; b.reason = reason; pr.builds.unshift(b); return b; }
  L("[Container] Running on CodeBuild On-demand", "[Container] Waiting for DOWNLOAD_SOURCE", "[Container] Phase complete: DOWNLOAD_SOURCE State: SUCCEEDED", "[Container] Entering phase INSTALL", "[Container] Phase complete: INSTALL State: SUCCEEDED", "[Container] Entering phase PRE_BUILD", "[Container] Running command aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPO_URL");
  if (!iamCan(role, "ecr:GetAuthorizationToken", "*")) return fail("PRE_BUILD", "aws ecr get-login-password", "An error occurred (AccessDeniedException) when calling the GetAuthorizationToken operation: " + cdNotAuth(role, "ecr:GetAuthorizationToken", "*", sess) + "\nError: Cannot perform an interactive login from a non TTY device", "ecr:GetAuthorizationToken ถูกปฏิเสธ (role ของ CodeBuild ไม่มีสิทธิ์ ECR)");
  L("Login Succeeded", "[Container] Phase complete: PRE_BUILD State: SUCCEEDED", "[Container] Entering phase BUILD", "[Container] Running command docker build -t $ECR_REPO_URL:$IMAGE_TAG .");
  if (!pr.privileged) return fail("BUILD", "docker build -t $ECR_REPO_URL:$IMAGE_TAG .", "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?", "docker build ใช้ไม่ได้: โปรเจกต์ไม่ได้เปิด Privileged mode");
  L("Step 1/6 : FROM python:3.12-slim", "Successfully built " + cdHex(12), "Successfully tagged " + url + ":" + tag, "[Container] Phase complete: BUILD State: SUCCEEDED", "[Container] Entering phase POST_BUILD", "[Container] Running command docker push $ECR_REPO_URL:$IMAGE_TAG", "The push refers to repository [" + url + "]");
  var repo = S.repos.filter(function (r) { return r.name === rname; })[0];
  if (!repo) return fail("POST_BUILD", "docker push $ECR_REPO_URL:$IMAGE_TAG", "name unknown: The repository with name '" + rname + "' does not exist in the registry with id '" + ACCOUNT + "'", "repository " + (rname || "(ECR_REPO_URL ว่าง)") + " ไม่มีใน ECR");
  var rarn = "arn:aws:ecr:" + REGION + ":" + ACCOUNT + ":repository/" + repo.name, miss = ["ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:BatchCheckLayerAvailability"].filter(function (a) { return !iamCan(role, a, rarn); });
  if (miss.length) return fail("POST_BUILD", "docker push $ECR_REPO_URL:$IMAGE_TAG", "denied: " + cdNotAuth(role, miss.indexOf("ecr:InitiateLayerUpload") >= 0 ? "ecr:InitiateLayerUpload" : miss[0], rarn, sess), "push ถูกปฏิเสธ ขาดสิทธิ์ " + miss[0]);
  if (repo.images.some(function (x) { return x.tag === tag; }) && !repo.mutable) return fail("POST_BUILD", "docker push $ECR_REPO_URL:$IMAGE_TAG", "tag invalid: The image tag '" + tag + "' already exists in the '" + repo.name + "' repository and cannot be overwritten because the repository is immutable.", "tag " + tag + " มีอยู่แล้วและ repo เป็น Immutable");
  var dg = "sha256:" + cdHex(64); repo.images.push({ tag: tag, digest: dg, by: "codebuild/" + pr.name }); L(tag + ": digest: " + dg.slice(0, 19) + "… size: 1573", "[Container] Running command printf '[{\"name\":\"%s\",\"imageUri\":\"%s\"}]' $CONTAINER_NAME $ECR_REPO_URL:$IMAGE_TAG > imagedefinitions.json");
  if (!iamCan(role, "s3:PutObject", cdBucketArn(p.bucket) + "/x")) return fail("UPLOAD_ARTIFACTS", "(upload artifacts)", "[Container] Phase context status code: CLIENT_ERROR Message: AccessDenied: Access Denied (s3:PutObject บน " + p.bucket + ")", "อัปโหลด artifact ไป S3 ไม่ได้ (role ของ CodeBuild ไม่มี s3:PutObject)");
  L("[Container] Phase complete: POST_BUILD State: SUCCEEDED", "[Container] Phase complete: UPLOAD_ARTIFACTS State: SUCCEEDED");
  b.ok = true; b.status = "SUCCEEDED"; b.imageUri = url + ":" + tag; b.artifact = [{ name: pr.env.CONTAINER_NAME || "", imageUri: b.imageUri }]; ph("BUILD", true); pr.builds.unshift(b); return b;
}
function cdEcsDeploy(p, ad, ex, role) {
  var sess = "pipeline-" + cdHex(6), art = ex.art.image, cl = ad.cfg.ClusterName, sn = ad.cfg.ServiceName, file = ad.cfg.FileName || "imagedefinitions.json";
  if (!art) return { err: "Exception while trying to read the task definition artifact file from: image (ไม่มี artifact จากขั้น Build)" };
  if (file !== "imagedefinitions.json") return { err: "Exception while trying to read the task definition artifact file from: " + file + " (ไม่พบไฟล์นี้ใน artifact · ไฟล์ที่ build เขียนคือ imagedefinitions.json)" };
  var svc = ecsSvcOf(cl, sn); if (!svc) return { err: "Unable to find service " + sn + " in cluster " + cl + " (ไม่พบ service · ตรวจ ClusterName/ServiceName และว่า lab 02 สร้างไว้แล้ว)" };
  var td = ecsTdByRef(svc.td);
  var miss = ["ecs:DescribeServices", "ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition", "ecs:UpdateService"].filter(function (a) { return !iamCan(role, a, "*"); });
  if (miss.length) return { err: "Action failed: " + cdNotAuth(role, miss[0], "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":service/" + cl + "/" + sn, sess) };
  var pass = [td.execRole, td.taskRole].filter(Boolean).filter(function (rn) { return !iamCan(role, "iam:PassRole", "arn:aws:iam::" + ACCOUNT + ":role/" + String(rn).split("/").pop()); });
  if (pass.length) return { err: "Action failed: " + cdNotAuth(role, "iam:PassRole", "arn:aws:iam::" + ACCOUNT + ":role/" + String(pass[0]).split("/").pop(), sess) };
  var def = art.filter(function (x) { return td.containers.some(function (c) { return c.name === x.name; }); })[0];
  if (!def) return { err: "Unable to find container named '" + (art[0] || {}).name + "' in task definition " + td.id + " (imagedefinitions.json ต้องใช้ชื่อ container เดิมของ task definition: " + td.containers.map(function (c) { return c.name; }).join(", ") + ")" };
  var cs = td.containers.map(function (c) { return Object.assign({}, c, { image: c.name === def.name ? def.imageUri : c.image, logGroup: c.logGroup }); });
  var nr = API.registerTd({ family: td.family, cpu: td.cpu, memory: td.memory, execRole: td.execRole, taskRole: td.taskRole, containers: cs }); if (nr.errors) return { err: "RegisterTaskDefinition failed: " + String(nr.errors[Object.keys(nr.errors)[0]]) };
  API.updateEcsService(cl, sn, { td: nr.res.id });
  var e = ecsEval(svc), bad = e.tasks.filter(function (t) { return t.state === "STOPPED" || !t.healthy; })[0];
  if (!e.stable) return { err: "Deployment of " + sn + " did not reach a steady state (revision " + nr.res.id + ")" + (bad ? ": " + bad.reason : ""), summary: "" };
  return { ok: true, summary: "Deployed " + nr.res.id + " (" + def.imageUri.split(":").pop() + ") · " + e.healthy + "/" + svc.desired + " tasks healthy" };
}

// ---------- Terraform schema + provider ----------
TF_SCHEMA.aws_codestarconnections_connection = sch(["name", "provider_type", "tags"], ["name"], {}, ["tags"], ["id", "arn", "connection_status"]);
TF_SCHEMA.aws_codebuild_project = sch(["name", "service_role", "description", "build_timeout", "source", "artifacts", "environment", "tags"], ["name", "service_role", "source", "artifacts", "environment"], { source: { args: ["type", "buildspec", "location"], req: ["type"] }, artifacts: { args: ["type"], req: ["type"] }, environment: { args: ["compute_type", "image", "type", "privileged_mode"], req: ["compute_type", "image", "type"], blocks: { environment_variable: { args: ["name", "value", "type"], req: ["name", "value"] } } } }, ["tags", "environment", "source", "description"], ["id", "arn"]);
TF_SCHEMA.aws_codepipeline = sch(["name", "role_arn", "pipeline_type", "artifact_store", "stage", "tags"], ["name", "role_arn", "artifact_store", "stage"], { artifact_store: { args: ["location", "type"], req: ["location", "type"] }, stage: { args: ["name"], req: ["name"], blocks: { action: { args: ["name", "category", "owner", "provider", "version", "configuration", "input_artifacts", "output_artifacts", "run_order", "namespace"], req: ["name", "category", "owner", "provider", "version"] } } } }, ["tags", "stage"], ["id", "arn"]);
TF_PROV.aws_codestarconnections_connection = {
  act: "codestar-connections:CreateConnection", svc: "CodeStar connections", op: "CreateConnection",
  create: function (c) { var a = c.attrs, x = ecsTfOk(API.createConnection({ name: a.name, provider: a.provider_type }), "creating CodeStar Connections Connection (" + a.name + ")", "CodeStar connections", "CreateConnection"); return { id: x.arn, computed: { id: x.arn, arn: x.arn, connection_status: "PENDING" }, sim: { name: x.name } }; },
  update: function () {}, del: function (st) { API.deleteConnection(st.sim.name); },
  read: function (st) { var c = S.conns.filter(function (x) { return x.name === st.sim.name; })[0]; return c ? { cfg: {}, computed: { connection_status: c.status } } : null; }
};
TF_PROV.aws_codebuild_project = {
  act: "codebuild:CreateProject", svc: "CodeBuild", op: "CreateProject",
  create: function (c) {
    var a = c.attrs, env = (a.environment || [{}])[0] || {}, vars = {}; (env.environment_variable || []).forEach(function (v) { vars[v.name] = v.value; });
    var p = ecsTfOk(API.createCbProject({ name: a.name, role: a.service_role, image: env.image, compute: env.compute_type, privileged: !!env.privileged_mode, env: vars, buildspec: ((a.source || [{}])[0] || {}).buildspec || "" }), "creating CodeBuild Project (" + a.name + ")", "CodeBuild", "CreateProject");
    return { id: p.arn, computed: { id: p.arn, arn: p.arn }, sim: { name: p.name } };
  },
  update: function (st, d) { var env = d.environment ? (d.environment[0] || {}) : null, vars = null; if (env) { vars = {}; (env.environment_variable || []).forEach(function (v) { vars[v.name] = v.value; }); } var r = API.updateCbProject(st.sim.name, { privileged: env ? !!env.privileged_mode : undefined, env: vars || undefined, role: d.service_role }); if (r.errors) throw TfAwsError("updating CodeBuild Project (" + st.sim.name + ")", "CodeBuild", "UpdateProject", "InvalidInputException", String(r.errors[Object.keys(r.errors)[0]]).replace(/^[A-Za-z]+: /, "")); },
  del: function (st) { API.deleteCbProject(st.sim.name); },
  read: function (st) { return cdProj(st.sim.name) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_codepipeline = {
  act: "codepipeline:CreatePipeline", svc: "CodePipeline", op: "CreatePipeline",
  create: function (c) {
    var a = c.attrs, stages = (a.stage || []).map(function (s) { return { name: s.name, actions: (s.action || []).map(function (x) { return { name: x.name, category: x.category, provider: x.provider, cfg: x.configuration || {} }; }) }; });
    var p = ecsTfOk(API.createPipeline({ name: a.name, role: a.role_arn, bucket: ((a.artifact_store || [{}])[0] || {}).location, stages: stages }), "creating CodePipeline (" + a.name + ")", "CodePipeline", "CreatePipeline");
    return { id: p.name, computed: { id: p.name, arn: p.arn }, sim: { name: p.name } };
  },
  update: function () {}, del: function (st) { API.deletePipeline(st.sim.name); },
  read: function (st) { return cdPipe(st.sim.name) ? { cfg: {}, computed: {} } : null; }
};
