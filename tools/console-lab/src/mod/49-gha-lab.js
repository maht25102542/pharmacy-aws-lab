// ===== Use case 5 (GitHub Actions + OIDC): สร้าง lab ผ่าน API เหมือนกดใน console, ตัวตรวจ, ลบ, HCL =====
var GHA_REPO_NAME = "pharmacy-backend";
function ghaRoleDoc(kind) {
  var rarn = "arn:aws:ecr:" + REGION + ":" + ACCOUNT + ":repository/pharmacy/api", st = [];
  st.push({ Effect: "Allow", Action: ["ecr:GetAuthorizationToken"], Resource: ["*"] });
  if (kind !== "gha-ecr") st.push({ Effect: "Allow", Action: ["ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage"], Resource: [rarn] });
  st.push({ Effect: "Allow", Action: ["ecs:DescribeServices", "ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition", "ecs:UpdateService"], Resource: ["*"] });
  if (kind !== "gha-pass") st.push({ Effect: "Allow", Action: ["iam:PassRole"], Resource: ["arn:aws:iam::" + ACCOUNT + ":role/pharmacy-ecs-*"] });
  return { Version: "2012-10-17", Statement: st };
}
function buildGha(kind) {
  buildEcs("ecs"); // ปลายทาง deploy = ECS ของ lab 02
  function ok(r) { if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.res; }
  ghInit(); var user = ghUser(); S.gh.repos[GHA_REPO_NAME] = { user: user, files: { Dockerfile: "FROM python:3.12-slim\nCOPY . /app\nCMD [\"gunicorn\", \"config.wsgi\"]\n", "README.md": "# pharmacy-backend\n" }, tags: [], n: 3 };
  if (kind === "gha-base") return;
  var prov = kind === "gha-provider" ? null : ok(API.createOidcProvider({ url: "https://" + GHA_ISSUER, audience: "sts.amazonaws.com" }));
  var role = null;
  if (prov) { role = ok(API.createRoleWeb({ name: "github-actions-deploy", provider: prov.arn, audience: "sts.amazonaws.com", org: user, repo: GHA_REPO_NAME, branch: kind === "gha-sub" ? "main" : "", env: "", sub: kind === "gha-sub" ? "repo:" + user + "/" + GHA_REPO_NAME + ":ref:refs/heads/main" : "repo:" + user + "/" + GHA_REPO_NAME + ":*", policies: [] })); role.inline = [{ name: "deploy", doc: ghaRoleDoc(kind) }]; }
  else ok(API.createRoleRaw({ name: "github-actions-deploy", trust: JSON.stringify({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Principal: { Federated: "arn:aws:iam::" + ACCOUNT + ":oidc-provider/" + GHA_ISSUER }, Action: "sts:AssumeRoleWithWebIdentity" }] }) })).inline = [{ name: "deploy", doc: ghaRoleDoc(kind) }];
  ok(API.saveWorkflow({ repo: user + "/" + GHA_REPO_NAME, name: "deploy", pushBranch: "main", tagPattern: "v*", idToken: kind !== "gha-perm", immutable: kind === "gha-immutable", roleArn: "arn:aws:iam::" + ACCOUNT + ":role/github-actions-deploy", region: REGION, ecrRepo: "pharmacy/api", containerName: kind === "gha-deploy" ? "app" : "api", devCluster: "pharmacy-dev", devService: "pharmacy-api", prdCluster: "pharmacy-prd", prdService: "pharmacy-api", prdEnv: "production", waitStability: true }));
  var rp = S.gh.repos[GHA_REPO_NAME]; rp.n++;
  var r1 = API.ghaPush(user + "/" + GHA_REPO_NAME, "main").res;
  if (kind === "gha" || kind === "gha-sub") { rp.tags.push("v1.1.0"); var r2 = API.ghaTag(user + "/" + GHA_REPO_NAME, "v1.1.0").res; if (r2 && r2.waiting) API.ghaApprove(user + "/" + GHA_REPO_NAME, r2.id, true); }
  void r1; S.ghaKind = kind;
}
function checksGha() {
  var out = []; function add(ok, label, hint) { out.push({ ok: !!ok, label: label, hint: hint || "" }); }
  var user = ghUser(), repo = user + "/" + GHA_REPO_NAME, w = ghaWf(repo), prov = ghaOidc(), role = roleByRef("github-actions-deploy"), runs = ghaRunsOf(repo);
  add(prov && prov.audiences.indexOf("sts.amazonaws.com") >= 0, "IAM OIDC provider ของ GitHub (" + GHA_ISSUER + ") audience sts.amazonaws.com", "IAM › Identity providers › Add provider › OpenID Connect");
  add(role && role.trust && JSON.stringify(role.trust).indexOf("AssumeRoleWithWebIdentity") >= 0 && prov && JSON.stringify(role.trust).indexOf(prov.arn) >= 0, "role github-actions-deploy: trust = web identity ของ provider นี้", "IAM › Create role › Web identity");
  add(role && !/repo:[^:\/]+\/\*"/.test(JSON.stringify(role.trust || {})) && /repo:[^"]+\/pharmacy-backend/.test(JSON.stringify(role.trust || {})), "trust จำกัดเฉพาะ repo pharmacy-backend (ไม่ใช่ทั้ง org)", "ช่อง GitHub repository ต้องกรอก · ห้าม repo:ORG/* (ทุก repo ใน org assume role ได้)");
  add(role && iamCan(role, "ecr:PutImage", "arn:aws:ecr:" + REGION + ":" + ACCOUNT + ":repository/pharmacy/api") && iamCan(role, "ecr:GetAuthorizationToken", "*"), "role: login + push ECR", "แนบ policy ECR ให้ role");
  add(role && iamCan(role, "ecs:UpdateService", "*") && iamCan(role, "iam:PassRole", "arn:aws:iam::" + ACCOUNT + ":role/pharmacy-ecs-execution"), "role: ecs:UpdateService + iam:PassRole", "เพิ่มใน inline policy");
  add(w && w.idToken, "workflow มี permissions: id-token: write", "แก้ workflow (ไม่ใส่ = ขอ ID token ไม่ได้)");
  add(w && w.containerName === "api", "CONTAINER_NAME = api (ตรง task definition)", "ชื่อ container ใน task definition");
  var dev = runs.filter(function (r) { return r.kind === "dev"; })[0], prd = runs.filter(function (r) { return r.kind === "prd"; })[0];
  add(dev && dev.status === "success", "push main → deploy dev สำเร็จ", "ดู run ล่าสุดที่แท็บ Actions ของ repo");
  add(prd && prd.status === "success", "tag v* → อนุมัติ environment production → deploy prd สำเร็จ", "สร้าง tag v1.1.0 (v1.0.0 มีใน ECR แล้ว repo เป็น Immutable) แล้ว Review deployments → Approve");
  return out;
}
function ghaDelPlan(kind, id, P) { if (kind === "apr") return aprDelPlan(kind, id, P); if (kind !== "oidc") return false; var o = S.oidcs.filter(function (x) { return x.id === id; })[0]; if (!o) return false; P.title = "Delete OIDC provider " + o.host; P.crumb = "IAM › Identity providers › Delete"; P.word = "confirm"; P.done = "ลบ provider แล้ว: GitHub Actions ขอ role ไม่ได้อีก (เจอ No OpenIDConnect provider found)"; S.roles.forEach(function (r) { if (r.trust && JSON.stringify(r.trust).indexOf(o.arn) >= 0) P.note = "role " + r.name + " อ้าง provider นี้อยู่"; }); return true; }
function ghaDelDo(kind, id) { if (kind === "apr") return aprDelDo(kind, id); return kind === "oidc" ? API.deleteOidcProvider(id) : { res: true }; }
function ghaHcl(o, ref) { S.oidcs.forEach(function (p) { o.push(hcm("oidc", p.host) + 'resource "aws_iam_openid_connect_provider" "' + slug(p.id) + '" {\n  url            = "' + p.url + '"\n  client_id_list = ["' + p.audiences.join('", "') + '"]\n}'); }); }
