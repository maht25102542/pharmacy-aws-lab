// ===== Use case 5: GitHub Actions + OIDC → ECR → ECS (CI/CD ที่นิยมที่สุด: ไม่มี access key ถาวรเก็บใน GitHub) =====
// GitHub ออก ID token (JWT) ให้ทุก job → job ขอ STS AssumeRoleWithWebIdentity → ได้ credential ชั่วคราว → push ECR + deploy ECS
// สิ่งสำคัญคือ claim "sub" ใน token ที่ trust policy ของ role ต้องจับคู่ให้ตรง (ขึ้นกับ branch / tag / environment ของ job)
// ข้อความ error ที่ระบุว่า "จากความจำ" ดู labs/VERIFY.md
var GHA_ISSUER = "token.actions.githubusercontent.com";
function ghaOidc() { return S.oidcs.filter(function (o) { return o.host === GHA_ISSUER; })[0] || null; }
function isGhaLab() { return S.oidcs.length > 0 || S.gwf.length > 0; }
function ghaWf(repo) { return S.gwf.filter(function (w) { return w.repo === repo; })[0] || null; }
API.createOidcProvider = function (o) {
  var er = {}, u = String(o.url || "").trim(), m = /^https:\/\/([A-Za-z0-9.-]+)(\/.*)?$/.exec(u), aud = String(o.audience || "").trim();
  if (!m) er.url = "InvalidInput: Invalid Open ID Connect Provider URL (ต้องขึ้นต้น https://)"; else if (S.oidcs.some(function (x) { return x.url === u; })) er.url = "EntityAlreadyExists: Provider with url " + u + " already exists.";
  if (!aud) er.audience = "InvalidInput: Audience (client ID) ต้องไม่ว่าง (ของ GitHub Actions ใช้ sts.amazonaws.com)";
  if (Object.keys(er).length) return { errors: er };
  var p = { id: m[1], host: m[1] + (m[2] || ""), url: u, audiences: [aud], arn: "arn:aws:iam::" + ACCOUNT + ":oidc-provider/" + m[1] + (m[2] || ""), born: Date.now() }; S.oidcs.push(p); return { res: p };
};
API.deleteOidcProvider = function (id) { S.oidcs = S.oidcs.filter(function (o) { return o.id !== id; }); return { res: true }; };
// role แบบ Web identity (หน้า IAM › Create role › Web identity): console สร้าง trust policy ให้จากช่อง org / repo / branch
function ghaSubPattern(org, repo, branch, env) {
  if (!org) return "";
  if (!repo) return "repo:" + org + "/*";
  if (env) return "repo:" + org + "/" + repo + ":environment:" + env;
  if (branch) return "repo:" + org + "/" + repo + ":ref:refs/heads/" + branch;
  return "repo:" + org + "/" + repo + ":*";
}
API.createRoleWeb = function (o) {
  var er = {}, p = S.oidcs.filter(function (x) { return x.arn === o.provider; })[0];
  if (!p) er.provider = "ต้องเลือก identity provider (IAM › Identity providers › Add provider ก่อน)";
  if (!String(o.org || "").trim()) er.org = "ต้องกรอก GitHub organization (หรือชื่อ user)";
  if (p && o.audience && p.audiences.indexOf(o.audience) < 0) er.audience = "InvalidInput: audience " + o.audience + " ไม่อยู่ในรายการของ provider (" + p.audiences.join(", ") + ")";
  if (Object.keys(er).length) return { errors: er };
  var sub = o.sub || ghaSubPattern(o.org.trim(), String(o.repo || "").trim(), String(o.branch || "").trim(), String(o.env || "").trim()), cond = { StringEquals: {} }; cond.StringEquals[p.host + ":aud"] = o.audience || p.audiences[0]; cond[/[*?]/.test(sub) ? "StringLike" : "StringEquals"] = cond[/[*?]/.test(sub) ? "StringLike" : "StringEquals"] || {}; cond[/[*?]/.test(sub) ? "StringLike" : "StringEquals"][p.host + ":sub"] = sub;
  var r = API.createRoleRaw({ name: o.name, trust: JSON.stringify({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Principal: { Federated: p.arn }, Action: "sts:AssumeRoleWithWebIdentity", Condition: cond }] }), desc: o.desc || "" });
  if (r.errors) return r; r.res.policies = (o.policies || []).slice(); return r;
};
// trust policy ของ role จับคู่ token (aud + sub) ได้ไหม
function ghaTrust(role, sub, aud) {
  var t = role && role.trust; if (!t) return { ok: false, why: "role นี้ไม่มี trust policy แบบ web identity" };
  var st = [].concat(t.Statement || []).filter(function (s) { return s.Effect === "Allow" && [].concat(s.Action || []).some(function (a) { return /AssumeRoleWithWebIdentity$/.test(a); }); });
  if (!st.length) return { ok: false, why: "trust policy ไม่อนุญาต sts:AssumeRoleWithWebIdentity (อนุญาตแค่ " + JSON.stringify(t).slice(0, 80) + "…)" };
  var prov = ghaOidc(); if (!prov) return { ok: false, why: "ไม่มี OIDC provider" };
  var why = [];
  var hit = st.some(function (s) {
    var fed = [].concat((s.Principal || {}).Federated || []); if (fed.indexOf(prov.arn) < 0) { why.push("Principal.Federated ไม่ใช่ " + prov.arn); return false; }
    var c = s.Condition || {}, ok = true;
    ["StringEquals", "StringLike"].forEach(function (op) { var m = c[op] || {}; Object.keys(m).forEach(function (k) { var vals = [].concat(m[k]), want = k.slice(prov.host.length + 1); var actual = want === "aud" ? aud : want === "sub" ? sub : null; if (actual === null) return; var match = vals.some(function (v) { return op === "StringEquals" ? v === actual : new RegExp("^" + String(v).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$").test(actual); }); if (!match) { ok = false; why.push("เงื่อนไข " + want + " " + (op === "StringEquals" ? "=" : "like") + " " + vals.join(" | ") + " ไม่ตรงกับค่าที่ GitHub ส่ง (" + actual + ")"); } }); });
    return ok;
  });
  return { ok: hit, why: why.join(" · ") };
}
// ---------- workflow ----------
function ghaYaml(w) {
  var perms = "permissions:\n  id-token: write   # ขอ ID token ของ GitHub (OIDC) · ไม่ใส่ = ขอ role ไม่ได้\n  contents: read\n";
  var L = ["name: " + (w.name || "deploy"), "on:", "  push:", "    branches: [" + (w.pushBranch || "main") + "]", w.tagPattern ? "    tags: [\"" + w.tagPattern + "\"]" : "", "", w.idToken ? perms : "# (ไม่ได้ตั้ง permissions: id-token: write)\npermissions:\n  contents: read\n", "env:", "  AWS_REGION: " + (w.region || "ap-southeast-1"), "  ECR_REPOSITORY: " + (w.ecrRepo || "pharmacy/api"), "  CONTAINER_NAME: " + (w.containerName || "api"), "", "jobs:",
    "  deploy-dev:", "    if: github.ref_type == 'branch'", "    runs-on: " + (w.runner || "ubuntu-latest"), "    steps:", "      - uses: actions/checkout@v4", "      - uses: aws-actions/configure-aws-credentials@v4", "        with:", "          role-to-assume: " + (w.roleArn || "arn:aws:iam::<account>:role/<role>"), "          aws-region: ${{ env.AWS_REGION }}", "      - id: ecr", "        uses: aws-actions/amazon-ecr-login@v2", "      - run: |", "          docker build -t ${{ steps.ecr.outputs.registry }}/$ECR_REPOSITORY:${{ github.sha }} .", "          docker push ${{ steps.ecr.outputs.registry }}/$ECR_REPOSITORY:${{ github.sha }}", "      - id: td", "        uses: aws-actions/amazon-ecs-render-task-definition@v1", "        with:", "          task-definition-family: pharmacy-api-dev   # ใช้ task definition ล่าสุดของ family นี้", "          container-name: ${{ env.CONTAINER_NAME }}", "          image: ${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}", "      - uses: aws-actions/amazon-ecs-deploy-task-definition@v2", "        with:", "          task-definition: ${{ steps.td.outputs.task-definition }}", "          cluster: " + (w.devCluster || "pharmacy-dev"), "          service: " + (w.devService || "pharmacy-api"), "          wait-for-service-stability: " + (w.waitStability === false ? "false" : "true"),
    "", "  deploy-prd:", "    if: github.ref_type == 'tag'", "    runs-on: " + (w.runner || "ubuntu-latest"), w.prdEnv ? "    environment: " + w.prdEnv + "   # ตั้ง Required reviewers ที่ Settings › Environments (คนอนุมัติก่อน deploy prd)" : "    # (ไม่มี environment: ไม่ต้องอนุมัติ)", "    steps:", "      # … เหมือน deploy-dev แต่ cluster: " + (w.prdCluster || "pharmacy-prd") + " และ tag image = ${{ github.ref_name }}"];
  return L.filter(function (x, i) { return x !== "" || i === 0 || L[i - 1] !== ""; }).join("\n") + "\n";
}
API.saveWorkflow = function (o) {
  var er = {}, repo = String(o.repo || "");
  if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(repo)) er.repo = "ต้องเป็นรูปแบบ owner/repo";
  if (!/^arn:aws:iam::\d{12}:role\/[\w+=,.@\/-]+$/.test(String(o.roleArn || ""))) er.roleArn = "role-to-assume ต้องเป็น ARN ของ role (arn:aws:iam::<account>:role/<ชื่อ>)";
  if (!String(o.pushBranch || "").trim()) er.pushBranch = "ต้องระบุ branch ที่ทริกเกอร์ (เช่น main)";
  if (Object.keys(er).length) return { errors: er };
  var w = ghaWf(repo); if (!w) { w = { repo: repo }; S.gwf.push(w); }
  ["name", "pushBranch", "tagPattern", "idToken", "roleArn", "region", "ecrRepo", "containerName", "devCluster", "devService", "prdCluster", "prdService", "prdEnv", "waitStability", "runner"].forEach(function (k) { if (o[k] !== undefined) w[k] = o[k]; });
  ghInit(); var parts = repo.split("/"), rp = S.gh.repos[parts[1]]; if (rp && rp.user === parts[0]) { rp.files = rp.files || {}; rp.files[".github/workflows/deploy.yml"] = ghaYaml(w); }
  return { res: w };
};
// ---------- รัน ----------
function ghaSha() { return fakeId("", 40, "0123456789abcdef"); }
function ghaStep(name, ok, log, hint) { return { name: name, ok: ok, log: log || [], hint: hint || "" }; }
function ghaRunJob(w, kind, ctx) {
  var steps = [], role = null, env = kind === "prd" ? w.prdEnv : "", sub, cl = kind === "prd" ? w.prdCluster : w.devCluster, sv = kind === "prd" ? w.prdService : w.devService, parts = w.repo.split("/"), tag = kind === "prd" ? ctx.ref : ctx.sha.slice(0, 7), sess = "GitHubActions";
  function push(s) { steps.push(s); return s.ok; }
  push(ghaStep("Set up job", true, ["Runner: " + (w.runner || "ubuntu-latest"), "Job: deploy-" + kind + (env ? " · environment: " + env : "")]));
  push(ghaStep("Checkout (actions/checkout@v4)", true, ["HEAD is now at " + ctx.sha.slice(0, 7)]));
  // configure-aws-credentials (OIDC)
  sub = env ? "repo:" + w.repo + ":environment:" + env : kind === "prd" ? "repo:" + w.repo + ":ref:refs/tags/" + ctx.ref : "repo:" + w.repo + ":ref:refs/heads/" + ctx.ref;
  if (!w.idToken) { push(ghaStep("Configure AWS credentials (OIDC)", false, ["Run aws-actions/configure-aws-credentials@v4", "Error: Credentials could not be loaded, please check your action inputs: Could not load credentials from any providers"], "workflow ไม่มี permissions: id-token: write → GitHub ไม่ออก ID token ให้ job นี้ (ข้อความจริงอาจต่าง)")); return { steps: steps, ok: false, sub: sub }; }
  var prov = ghaOidc(); if (!prov) { push(ghaStep("Configure AWS credentials (OIDC)", false, ["Error: Could not assume role with OIDC: No OpenIDConnect provider found in your account for https://" + GHA_ISSUER], "IAM › Identity providers ยังไม่มี provider ของ GitHub")); return { steps: steps, ok: false, sub: sub }; }
  role = roleByRef(w.roleArn);
  var tr = role ? ghaTrust(role, sub, "sts.amazonaws.com") : { ok: false, why: "ไม่พบ role " + w.roleArn };
  if (!tr.ok) { push(ghaStep("Configure AWS credentials (OIDC)", false, ["Run aws-actions/configure-aws-credentials@v4", "Error: Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity"], "job นี้ส่ง sub = " + sub + " · " + (tr.why || "trust policy ไม่ตรง"))); return { steps: steps, ok: false, sub: sub }; }
  push(ghaStep("Configure AWS credentials (OIDC)", true, ["Assuming role with OIDC (sub: " + sub + ")", "Authenticated as assumedRoleId " + (role ? role.name : "")]));
  var ecrLogin = iamCan(role, "ecr:GetAuthorizationToken", "*");
  if (!push(ghaStep("Login to Amazon ECR (amazon-ecr-login@v2)", ecrLogin, ecrLogin ? ["Logging into registry " + ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com", "Login Succeeded"] : ["Error: " + cdNotAuth(role, "ecr:GetAuthorizationToken", "*", sess).replace(/^User/, "User")], ecrLogin ? "" : "role ของ GitHub Actions ไม่มี ecr:GetAuthorizationToken"))) return { steps: steps, ok: false, sub: sub };
  var repo = S.repos.filter(function (r) { return r.name === (w.ecrRepo || ""); })[0], rarn = repo ? "arn:aws:ecr:" + REGION + ":" + ACCOUNT + ":repository/" + repo.name : "", miss = repo ? ["ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:BatchCheckLayerAvailability"].filter(function (a) { return !iamCan(role, a, rarn); }) : [];
  var pushLog = ["docker build -t " + ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com/" + w.ecrRepo + ":" + tag + " .", "Successfully built " + cdHex(12), "The push refers to repository [" + ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com/" + w.ecrRepo + "]"], pushOk = true;
  if (!repo) { pushOk = false; pushLog.push("name unknown: The repository with name '" + w.ecrRepo + "' does not exist in the registry with id '" + ACCOUNT + "'"); }
  else if (miss.length) { pushOk = false; pushLog.push("denied: " + cdNotAuth(role, miss.indexOf("ecr:InitiateLayerUpload") >= 0 ? "ecr:InitiateLayerUpload" : miss[0], rarn, sess)); }
  else if (repo.images.some(function (x) { return x.tag === tag; }) && !repo.mutable) { pushOk = false; pushLog.push("tag invalid: The image tag '" + tag + "' already exists in the '" + repo.name + "' repository and cannot be overwritten because the repository is immutable."); }
  else { var dg = "sha256:" + cdHex(64); repo.images.push({ tag: tag, digest: dg, by: "github-actions" }); pushLog.push(tag + ": digest: " + dg.slice(0, 19) + "… size: 1573"); }
  if (!push(ghaStep("Build, tag, and push image", pushOk, pushLog, pushOk ? "" : miss.length ? "role ขาดสิทธิ์ push ECR: " + miss[0] : "ดูข้อความ error ด้านบน"))) return { steps: steps, ok: false, sub: sub };
  var svc = ecsSvcOf(cl, sv), td = svc && ecsTdByRef(svc.td), cn = w.containerName;
  if (!svc) { push(ghaStep("Render Amazon ECS task definition", false, ["Error: Unable to find service " + sv + " in cluster " + cl], "cluster/service ไม่ตรงกับที่ lab 02 สร้าง")); return { steps: steps, ok: false, sub: sub }; }
  var hasC = td.containers.some(function (c) { return c.name === cn; });
  if (!push(ghaStep("Render Amazon ECS task definition (amazon-ecs-render-task-definition@v1)", hasC, hasC ? ["Rendering " + td.id + " · container " + cn + " → image " + ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com/" + w.ecrRepo + ":" + tag] : ["Error: Could not find container definition with matching name '" + cn + "' in task definition " + td.id], hasC ? "" : "CONTAINER_NAME ต้องตรงกับชื่อ container ใน task definition (" + td.containers.map(function (c) { return c.name; }).join(", ") + ") · ข้อความจริงอาจต่าง"))) return { steps: steps, ok: false, sub: sub };
  var need = ["ecs:DescribeServices", "ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition", "ecs:UpdateService"].filter(function (a) { return !iamCan(role, a, "*"); }), pass = [td.execRole, td.taskRole].filter(Boolean).filter(function (rn) { return !iamCan(role, "iam:PassRole", "arn:aws:iam::" + ACCOUNT + ":role/" + String(rn).split("/").pop()); });
  var dl = ["Registering the task definition…"], dok = true;
  if (need.length) { dok = false; dl.push("Error: " + cdNotAuth(role, need[0], "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":service/" + cl + "/" + sv, sess)); }
  else if (pass.length) { dok = false; dl.push("Error: " + cdNotAuth(role, "iam:PassRole", "arn:aws:iam::" + ACCOUNT + ":role/" + String(pass[0]).split("/").pop(), sess)); }
  else {
    var nr = API.registerTd({ family: td.family, cpu: td.cpu, memory: td.memory, execRole: td.execRole, taskRole: td.taskRole, containers: td.containers.map(function (c) { return Object.assign({}, c, { image: c.name === cn ? ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com/" + w.ecrRepo + ":" + tag : c.image }); }) });
    if (nr.errors) { dok = false; dl.push("Error: " + String(nr.errors[Object.keys(nr.errors)[0]])); }
    else { API.updateEcsService(cl, sv, { td: nr.res.id }); dl.push("Task definition registered: " + nr.res.id, "Updating the service " + sv + " in the cluster " + cl); if (w.waitStability !== false) { var e = ecsEval(svc, true); if (!e.stable) { dok = false; dl.push("Error: Resource is not in the state servicesStable"); } else dl.push("Service is stable"); } }
  }
  push(ghaStep("Deploy Amazon ECS task definition (amazon-ecs-deploy-task-definition@v2)", dok, dl, dok ? "" : need.length ? "role ขาดสิทธิ์ ECS: " + need[0] : pass.length ? "role ขาด iam:PassRole บน " + pass[0] : "service ไม่ stable: ดูหน้า Health ใน ECS"));
  return { steps: steps, ok: dok, sub: sub };
}
function ghaRunsOf(repo) { return S.gruns.filter(function (r) { return r.repo === repo; }); }
function ghaNew(w, trigger, ref) {
  var sha = ghaSha(), n = ghaRunsOf(w.repo).length + 1, kind = trigger === "tag" ? "prd" : "dev", run = { id: n, repo: w.repo, trigger: trigger, ref: ref, sha: sha, status: "in_progress", kind: kind, born: Date.now(), jobs: [], waiting: false };
  S.gruns.unshift(run);
  if (kind === "prd" && w.prdEnv) { run.waiting = true; run.status = "waiting"; run.jobs = [{ name: "deploy-prd", status: "waiting", steps: [] }]; return run; }
  ghaFinish(w, run); return run;
}
function ghaFinish(w, run) { var r = ghaRunJob(w, run.kind, { sha: run.sha, ref: run.ref }); run.jobs = [{ name: "deploy-" + run.kind, status: r.ok ? "success" : "failure", steps: r.steps, sub: r.sub }]; run.waiting = false; run.status = r.ok ? "success" : "failure"; }
API.ghaPush = function (repo, branch) { var w = ghaWf(repo); if (!w) return E("_", "ยังไม่มี workflow (.github/workflows/deploy.yml)"); if (branch !== w.pushBranch) return { res: null, skipped: true, msg: "branch " + branch + " ไม่ตรงกับ on.push.branches (" + w.pushBranch + ") workflow ไม่รัน" }; return { res: ghaNew(w, "push", branch) }; };
API.ghaTag = function (repo, tag) { var w = ghaWf(repo); if (!w) return E("_", "ยังไม่มี workflow"); if (!w.tagPattern || !new RegExp("^" + w.tagPattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$").test(tag)) return { res: null, skipped: true, msg: "tag " + tag + " ไม่ตรงกับ on.push.tags (" + (w.tagPattern || "ไม่ได้ตั้ง") + ") workflow ไม่รัน" }; return { res: ghaNew(w, "tag", tag) }; };
API.ghaApprove = function (repo, id, ok) { var w = ghaWf(repo), run = S.gruns.filter(function (r) { return r.repo === repo && r.id === +id; })[0]; if (!w || !run || !run.waiting) return E("_", "ไม่มี deployment ที่รออนุมัติ"); if (!ok) { run.waiting = false; run.status = "failure"; run.jobs = [{ name: "deploy-prd", status: "cancelled", steps: [ghaStep("Review deployments", false, ["Deployment to " + w.prdEnv + " was rejected"], "")] }]; return { res: run }; } ghaFinish(w, run); return { res: run }; };
// ---------- Terraform ----------
TF_SCHEMA.aws_iam_openid_connect_provider = sch(["url", "client_id_list", "thumbprint_list", "tags"], ["url", "client_id_list"], {}, ["tags", "thumbprint_list", "client_id_list"], ["id", "arn"]);
TF_PROV.aws_iam_openid_connect_provider = {
  act: "iam:CreateOpenIDConnectProvider", svc: "IAM", op: "CreateOpenIDConnectProvider",
  create: function (c) { var a = c.attrs, p = ecsTfOk(API.createOidcProvider({ url: a.url, audience: (a.client_id_list || [])[0] }), "creating IAM OIDC Provider (" + a.url + ")", "IAM", "CreateOpenIDConnectProvider"); return { id: p.arn, computed: { id: p.arn, arn: p.arn }, sim: { id: p.id } }; },
  update: function () {}, del: function (st) { API.deleteOidcProvider(st.sim.id); },
  read: function (st) { return S.oidcs.some(function (o) { return o.id === st.sim.id; }) ? { cfg: {}, computed: {} } : null; }
};
