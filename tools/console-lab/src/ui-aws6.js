// ===== หน้า console ของ CodePipeline, CodeBuild, Connections (use case 4) =====
// หน้าตา/ชื่อแท็บเรียงตามความจำของ console ปี 2025 · wizard สร้าง pipeline ย่อเป็นหน้าเดียว
(function () {
  var lab = NAV.Lab; delete NAV.Lab;
  NAV.CodePipeline = [["", [["pipes", "Pipelines"]]], ["Settings", [["conns", "Connections"]]]];
  NAV.CodeBuild = [["Build", [["cbps", "Build projects"], ["cb-builds", "Build history"]]]];
  NAV.Lab = lab; NAVHOME.CodePipeline = "pipes"; NAVHOME.CodeBuild = "cbps";
  LK.pipe = "pipes"; LK.cbp = "cbps"; LK.conn = "conns";
})();
var CD_COL = { Succeeded: ["#1d8102", "#f2fcf3"], Failed: ["#c62828", "#fdf3f1"], InProgress: ["#0972d3", "#f2f8fd"], Waiting: ["#a85a00", "#fffbea"], NotRun: ["#5f6b7a", "#ffffff"] };
function cdBadge(s) { return s === "Succeeded" ? okIco("Succeeded") : s === "Failed" ? tagp("Failed", "bad") : s === "Waiting" || s === "InProgress" ? tagp(s === "Waiting" ? "Waiting for approval" : "In progress", "warn") : tagp("No executions yet", "warn"); }
function cdRoleOpts(svc) { return [["", "เลือก role"]].concat(S.roles.filter(function (r) { return roleTrusts(r, svc); }).map(function (r) { return [r.name, r.name]; })); }
function cdStageCard(p, i, ex) {
  var v = cdStageView(p, i), c = CD_COL[v.status] || CD_COL.NotRun, hdr = h("div", { style: "display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800" }, [h("span", { text: p.stages[i].name }), cdBadge(v.status)]), card = h("div", { style: "flex:1 1 190px;min-width:180px;border:2px solid " + c[0] + ";background:" + c[1] + ";border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px" }, [hdr]);
  v.actions.forEach(function (a, k) {
    var ad = p.stages[i].actions[k], ac = CD_COL[a.status] || CD_COL.NotRun, box = h("div", { style: "border:1px solid " + ac[0] + ";background:var(--surface,#fff);border-radius:8px;padding:8px 10px;font-size:.85rem;overflow-wrap:anywhere" }, [h("div", { style: "font-weight:700", text: a.name }), h("div", { cls: "hint", text: ad.category + " · " + ad.provider }), h("div", { style: "color:" + ac[0] + ";font-weight:700", text: a.status === "Waiting" ? "Waiting for approval" : a.status === "NotRun" ? "No executions yet" : a.status })]);
    if (a.summary) box.appendChild(h("div", { cls: "hint", text: a.summary }));
    if (a.err) box.appendChild(h("div", { style: "color:#c62828;margin-top:4px;word-break:break-word", text: a.err }));
    if (a.status === "Waiting" && v.exec) box.appendChild(h("button", { cls: "btn pri", type: "button", style: "margin-top:6px", text: "Review", onclick: function () { go("pipe-approve", { id: p.name, ex: v.exec.id, from: "pipes" }); } }));
    if (ad.provider === "CodeBuild" && a.buildId) { var pr = cdProj(ad.cfg.ProjectName); if (pr) box.appendChild(h("a", { href: "#", cls: "lnk", style: "display:block;margin-top:4px", text: "View build logs", onclick: function (e) { e.preventDefault(); UI.sel.cbps = pr.id; UI.cbLog = a.buildId; go("cbps", {}, "CodeBuild"); } })); }
    if (ad.provider === "ECS") box.appendChild(h("a", { href: "#", cls: "lnk", style: "display:block;margin-top:4px", text: "View service in ECS", onclick: function (e) { e.preventDefault(); var s = ecsSvcOf(ad.cfg.ClusterName, ad.cfg.ServiceName); if (s) { go("ecs-svc", { id: s.id, from: "ecsc" }, "ECS"); } else flash("bad", "ไม่พบ service " + ad.cfg.ClusterName + "/" + ad.cfg.ServiceName); } }));
    card.appendChild(box);
  });
  if (v.status === "Failed" && v.exec) card.appendChild(h("button", { cls: "btn", type: "button", text: "Retry stage", onclick: function () { var r = API.retryStage(p.name, v.exec.id, i); if (r.errors) flash("bad", r.errors._); else flash("ok", "Retry " + p.stages[i].name + " แล้ว"); render(); } }));
  return card;
}
function cdPipeView(p) {
  var ex = p.execs[0], wrap = h("div", {}), row = h("div", { style: "display:flex;gap:10px;flex-wrap:wrap;align-items:stretch;margin:8px 0" });
  wrap.appendChild(h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px" }, [h("button", { cls: "btn pri", type: "button", text: "Release change", onclick: function () { var r = API.startPipeline(p.name); flash(r.errors ? "bad" : "ok", r.errors ? r.errors._ : "เริ่ม execution " + r.res.id.slice(0, 8) + " (commit " + r.res.commit.slice(0, 8) + ")"); render(); } }), h("span", { cls: "hint", style: "align-self:center", text: ex ? "execution ล่าสุด " + ex.id.slice(0, 8) + " · " + ex.status + " · commit " + ex.commit.slice(0, 8) : "ยังไม่เคยรัน" })]));
  p.stages.forEach(function (s, i) { row.appendChild(cdStageCard(p, i, ex)); if (i < p.stages.length - 1) row.appendChild(h("div", { style: "align-self:center;font-size:1.4rem;color:#5f6b7a", text: "→" })); });
  wrap.appendChild(row); return wrap;
}
LISTS.pipes = function () {
  return ({ key: "pipes", kind: "pipe", title: "Pipelines", crumb: "CodePipeline › Pipelines", create: [{ label: "Create pipeline", page: "pipe-create" }], actions: [{ label: "Delete pipeline", page: "del", kind: "pipe" }],
    detail: function (p) { return [["Pipeline name", p.name], ["ARN", p.arn], ["Service role", p.role], ["Artifact store", "S3 · " + p.bucket], ["Stages", p.stages.map(function (s) { return s.name; }).join(" → ")], ["Latest execution", p.execs[0] ? p.execs[0].status : "-"]]; },
    rows: function () { return S.pipes; },
    cols: [["Name", function (p) { return p.name; }], ["Latest execution status", function (p) { return p.execs[0] ? (p.execs[0].status === "Succeeded" ? okIco("Succeeded") : tagp(p.execs[0].status, p.execs[0].status === "Failed" ? "bad" : "warn")) : "-"; }], ["Latest source revisions", function (p) { return p.execs[0] ? p.execs[0].commit.slice(0, 8) : "-"; }], ["Most recent execution", function (p) { return p.execs[0] ? stFmt(p.execs[0].born) : "-"; }]] });
};
DET.pipe = [
  ["view", "Pipeline", cdPipeView],
  ["history", "Execution history", function (p) { return tbl(["Execution ID", "Status", "Source revision", "Started", "Failed at"], p.execs.map(function (e) { var f = e.stages.filter(function (s) { return s.status === "Failed"; })[0]; return [e.id.slice(0, 8), e.status === "Succeeded" ? okIco("Succeeded") : tagp(e.status, e.status === "Failed" ? "bad" : "warn"), e.commit.slice(0, 8) + " " + e.msg, stFmt(e.born), f ? f.name : "-"]; }), "ยังไม่มี execution"); }],
  ["conf", "Settings", function (p) { return h("div", {}, [kvDom([["Service role", p.role], ["Artifact store", p.bucket]]), tbl(["Stage", "Action", "Provider", "Configuration"], p.stages.reduce(function (acc, s) { return acc.concat(s.actions.map(function (a) { return [s.name, a.name, a.provider, Object.keys(a.cfg).map(function (k) { return k + "=" + a.cfg[k]; }).join("\n")]; })); }, []), "")]); }],
  ["trig", "Triggers", null], ["tags", "Tags", null]
];
PAGES["pipe-create"] = function () {
  return formPage({ name: "pipe-create", crumb: "CodePipeline › Pipelines › Create pipeline", title: "Create new pipeline", back: "pipes", lead: "ตรงกับ aws_codepipeline · wizard จริงมี 7 ขั้น ที่นี่รวมเป็นหน้าเดียว · console สร้าง service role ให้เองได้ (Terraform ต้องเขียน policy เอง)",
    init: function () { return { name: "", bucket: "", roleMode: "new", role: "", conn: "", repo: "YOUR_GITHUB_USER/pharmacy-backend", branch: "main", proj: "", devCluster: "", devSvc: "", approve: true, prdCluster: "", prdSvc: "" }; },
    sections: function () { return [
      { t: "Step 1: Choose pipeline settings", f: [{ id: "name", type: "text", label: "Pipeline name", ph: "pharmacy-api" }, { id: "bucket", type: "select", label: "Artifact store (S3 bucket)", opts: function () { return [["", "เลือก bucket"]].concat(S.buckets.map(function (b) { return [b.name, b.name]; })); } }, { id: "roleMode", type: "radio", label: "Service role", opts: function () { return [["new", "New service role (console ใส่สิทธิ์ที่ต้องใช้ให้ครบ)"], ["existing", "Existing service role"]]; } }, { id: "role", type: "select", label: "Role name", show: function (V) { return V.roleMode === "existing"; }, opts: function () { return cdRoleOpts("codepipeline.amazonaws.com"); } }] },
      { t: "Step 2: Add source stage", f: [{ id: "conn", type: "select", label: "Connection (GitHub App)", desc: "ต้องสถานะ Available · Pending = Source ล้ม", opts: function () { return [["", "เลือก connection"]].concat(S.conns.map(function (c) { return [c.arn, c.name + " · " + c.status]; })); } }, { id: "repo", type: "text", label: "Repository name" }, { id: "branch", type: "text", label: "Branch name" }] },
      { t: "Step 3: Add build stage", f: [{ id: "proj", type: "select", label: "Project name (CodeBuild)", opts: function () { return [["", "เลือก project"]].concat(S.cbps.map(function (p) { return [p.name, p.name]; })); } }] },
      { t: "Step 4: Add deploy stage (dev)", f: [{ id: "devCluster", type: "select", label: "Cluster name", opts: function () { return [["", "เลือก cluster"]].concat(S.ecsc.map(function (c) { return [c.name, c.name]; })); } }, { id: "devSvc", type: "text", label: "Service name", ph: "pharmacy-api" }] },
      { t: "Step 5: Approval + deploy stage (prd)", f: [{ id: "approve", type: "check", text: "เพิ่ม Manual approval ก่อน deploy prd" }, { id: "prdCluster", type: "select", label: "Cluster name (prd)", opts: function () { return [["", "ไม่มี stage prd"]].concat(S.ecsc.map(function (c) { return [c.name, c.name]; })); } }, { id: "prdSvc", type: "text", label: "Service name (prd)", ph: "pharmacy-api" }] }]; },
    submit: "Create pipeline", onSubmit: function (V) {
      var role = V.role, conn = cdConn(V.conn), pr = cdProj(V.proj);
      var A = function (n, c, pv, cfg) { return { name: n, category: c, provider: pv, cfg: cfg }; }, st = [{ name: "Source", actions: [A("Source", "Source", "CodeStarSourceConnection", { ConnectionArn: V.conn, FullRepositoryId: V.repo, BranchName: V.branch })] }, { name: "Build", actions: [A("Build", "Build", "CodeBuild", { ProjectName: V.proj })] }, { name: "Deploy-dev", actions: [A("Deploy", "Deploy", "ECS", { ClusterName: V.devCluster, ServiceName: V.devSvc, FileName: "imagedefinitions.json" })] }];
      if (V.approve) st.push({ name: "Approve", actions: [A("Approval", "Approval", "Manual", { CustomData: "ตรวจ dev แล้วอนุมัติ" })] });
      if (V.prdCluster) st.push({ name: "Deploy-prd", actions: [A("Deploy", "Deploy", "ECS", { ClusterName: V.prdCluster, ServiceName: V.prdSvc, FileName: "imagedefinitions.json" })] });
      if (V.roleMode === "new") { if (!V.name) return { errors: { name: "ต้องกรอกชื่อ pipeline" } }; var rr = API.createRole({ name: "AWSCodePipelineServiceRole-" + V.name, entity: "AWS service", usecase: "CodePipeline", policies: [] }); if (rr.errors) return { errors: { name: rr.errors.name || "สร้าง role ไม่ได้" } }; var bk = cdBucketArn(V.bucket); rr.res.inline = [{ name: "PipelinePolicy", doc: { Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject", "s3:GetObjectVersion", "s3:GetBucketVersioning"], Resource: [bk, bk + "/*"] }, { Effect: "Allow", Action: ["codestar-connections:UseConnection"], Resource: ["*"] }, { Effect: "Allow", Action: ["codebuild:StartBuild", "codebuild:BatchGetBuilds"], Resource: ["*"] }, { Effect: "Allow", Action: ["ecs:*"], Resource: ["*"] }, { Effect: "Allow", Action: ["iam:PassRole"], Resource: ["*"] }] } }]; role = rr.res.name; }
      var r = API.createPipeline({ name: V.name, role: role, bucket: V.bucket, stages: st }); if (r.errors) return mgErrMap(r, { stages: "conn" }); UI.sel.pipes = r.res.id; void conn; void pr;
      var ex = r.res.execs[0]; return { msg: "สร้าง pipeline " + V.name + " แล้ว · รัน execution แรกให้เอง: " + ex.status + (ex.status === "Failed" ? " (เปิด pipeline ดูขั้นที่ล้ม)" : ""), next: "pipes" };
    } });
};
PAGES["pipe-approve"] = function () {
  var p = cdPipe(UI.params.id); if (!p) return h("p", { text: "ไม่พบ pipeline" });
  return formPage({ name: "pipe-approve-" + UI.params.ex, crumb: "CodePipeline › " + p.name + " › Review approval", title: "Review", back: "pipes", lead: "ผู้อนุมัติเห็นว่า dev ใช้งานได้แล้วจึงให้ผ่านไป deploy prd · Reject = execution นี้จบแบบ Failed",
    init: function () { return { decision: "approve", note: "" }; }, sections: function () { return [{ t: "Approve or reject the revision", f: [{ id: "decision", type: "radio", label: "Decision", opts: function () { return [["approve", "Approve"], ["reject", "Reject"]]; } }, { id: "note", type: "text", label: "Comments - optional", ph: "dev ผ่าน smoke test แล้ว" }] }]; },
    submit: "Submit", onSubmit: function (V) { var r = API.approveStage(p.name, UI.params.ex, V.decision === "approve", V.note); return r.errors ? { errors: { decision: String(r.errors._) } } : { msg: V.decision === "approve" ? "อนุมัติแล้ว: ไป deploy prd ต่อ (" + r.res.status + ")" : "Reject แล้ว: execution นี้ Failed", next: "pipes" }; } });
};

// ---------- CodeBuild ----------
LISTS.cbps = function () {
  return ({ key: "cbps", kind: "cbp", title: "Build projects", crumb: "CodeBuild › Build projects", create: [{ label: "Create project", page: "cbp-create" }], actions: [{ label: "Edit", page: "cbp-edit", needsSel: true }, { label: "Delete", page: "del", kind: "cbp" }],
    detail: function (p) { return [["Name", p.name], ["ARN", p.arn], ["Service role", p.role], ["Environment image", p.image], ["Compute", p.compute], ["Privileged", p.privileged ? "Enabled" : "Disabled (docker build ใช้ไม่ได้)"], ["Last build", p.builds[0] ? p.builds[0].status : "-"]]; },
    rows: function () { return S.cbps; },
    cols: [["Name", function (p) { return p.name; }], ["Source provider", function () { return "CodePipeline"; }], ["Repository", function () { return "-"; }], ["Last build status", function (p) { var b = p.builds[0]; return b ? (b.status === "SUCCEEDED" ? okIco("Succeeded") : tagp(b.status, "bad")) : "No builds"; }], ["Description", function () { return "-"; }]] });
};
function cdBuildLogView(p) {
  var sel = UI.cbLog, b = p.builds.filter(function (x) { return x.id === sel; })[0] || p.builds[0]; if (!b) return h("p", { cls: "hint", text: "ยังไม่มี build" });
  return h("div", {}, [kvDom([["Build run", p.name + ":" + b.id.split(":").pop().slice(0, 8)], ["Status", b.status === "SUCCEEDED" ? okIco("Succeeded") : tagp(b.status, "bad")], ["Source version", b.commit.slice(0, 8)], ["Reason", b.reason || "-"]]), h("h4", { text: "Phase details" }), tbl(["Phase", "Status", "Detail"], b.phases.map(function (x) { return [x.name, x.ok ? okIco("SUCCEEDED") : tagp("FAILED", "bad"), x.d || "-"]; }), ""), h("h4", { text: "Build logs (CloudWatch /aws/codebuild/" + p.name + ")" }), codePre(b.logs.join("\n"), "an")]);
}
DET.cbp = [
  ["hist", "Build history", function (p) { return h("div", {}, [tbl(["Build run", "Status", "Source version", "Submitted", ""], p.builds.map(function (b) { return [b.id.split(":").pop().slice(0, 8), b.status === "SUCCEEDED" ? okIco("Succeeded") : tagp(b.status, "bad"), b.commit.slice(0, 8), stFmt(b.born), h("button", { cls: "btn", type: "button", text: "View logs", onclick: function () { UI.cbLog = b.id; render(); } })]; }), "ยังไม่มี build · Release change ที่ pipeline"), cdBuildLogView(p)]); }],
  ["conf", "Configuration", function (p) { return kvDom([["Service role", p.role], ["Image", p.image], ["Compute type", p.compute], ["Privileged", p.privileged ? "Enabled" : "Disabled"], ["Environment variables", Object.keys(p.env).map(function (k) { return k + " = " + p.env[k]; }).join("\n") || "-"]]); }],
  ["spec", "Buildspec", function (p) { return codePre(p.buildspec || (LABFILES["labs/04-cicd/codebuild.tf"] || "").split("<<-EOT")[1].split("EOT")[0].replace(/^      /gm, "").trim(), "an"); }],
  ["trig", "Build triggers", null], ["metrics", "Metrics", null]
];
PAGES["cb-builds"] = function () {
  var rows = []; S.cbps.forEach(function (p) { p.builds.forEach(function (b) { rows.push([p.name + ":" + b.id.split(":").pop().slice(0, 8), b.status === "SUCCEEDED" ? okIco("Succeeded") : tagp(b.status, "bad"), p.name, b.commit.slice(0, 8), stFmt(b.born)]); }); });
  return h("div", {}, [crumbEl("CodeBuild › Build history"), h("div", { cls: "card" }, [h("div", { cls: "ch", text: "Build history (" + rows.length + ")" }), h("div", { cls: "cb" }, [tbl(["Build run", "Status", "Project", "Source version", "Submitted"], rows, "ยังไม่มี build")])])]);
};
function cdBuildspecDefault() { return (LABFILES["labs/04-cicd/codebuild.tf"] || "").split("<<-EOT")[1].split("EOT")[0].replace(/^      /gm, "").trim(); }
PAGES["cbp-create"] = function () {
  return formPage({ name: "cbp-create", crumb: "CodeBuild › Build projects › Create build project", title: "Create build project", back: "cbps", lead: "ตรงกับ aws_codebuild_project · role ใหม่ที่ console สร้างให้ มีแค่ log + S3 ==ไม่มีสิทธิ์ ECR== (ต้องแนบเอง ไม่งั้น push ไม่ได้) · docker build ต้องเปิด Privileged",
    init: function () { return { name: "", roleMode: "new", role: "", image: "aws/codebuild/standard:7.0", privileged: false, ecr: "", container: "api" }; },
    sections: function () { return [
      { t: "Project configuration", f: [{ id: "name", type: "text", label: "Project name", ph: "pharmacy-api-build" }] },
      { t: "Source", f: [{ id: "src", type: "select", label: "Source provider", opts: function () { return [["pipeline", "No source (ได้โค้ดจาก CodePipeline)"]]; } }] },
      { t: "Environment", f: [{ id: "image", type: "select", label: "Image", opts: function () { return CB_IMAGES.map(function (i) { return [i, i]; }); } }, { id: "privileged", type: "check", text: "Privileged: Enable this flag if you want to build Docker images or want your builds to get elevated privileges" }, { id: "roleMode", type: "radio", label: "Service role", opts: function () { return [["new", "New service role (log + S3 เท่านั้น)"], ["existing", "Existing service role"]]; } }, { id: "role", type: "select", label: "Role name", show: function (V) { return V.roleMode === "existing"; }, opts: function () { return cdRoleOpts("codebuild.amazonaws.com"); } }, { id: "ecr", type: "text", label: "Environment variable ECR_REPO_URL", ph: ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com/pharmacy/api" }, { id: "container", type: "text", label: "Environment variable CONTAINER_NAME", desc: "ต้องตรงกับชื่อ container ใน task definition ของ ECS" }] }]; },
    submit: "Create build project", onSubmit: function (V) {
      var role = V.role; if (V.roleMode === "new") { if (!V.name) return { errors: { name: "ต้องกรอกชื่อ project" } }; var rr = API.createRole({ name: "codebuild-" + V.name + "-service-role", entity: "AWS service", usecase: "CodeBuild", policies: [] }); if (rr.errors) return { errors: { name: rr.errors.name || "สร้าง role ไม่ได้" } }; rr.res.inline = [{ name: "CodeBuildBasePolicy", doc: { Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"], Resource: ["*"] }, { Effect: "Allow", Action: ["s3:PutObject", "s3:GetObject", "s3:GetObjectVersion", "s3:GetBucketAcl", "s3:GetBucketLocation"], Resource: ["arn:aws:s3:::*"] }] } }]; role = rr.res.name; }
      var env = {}; if (V.ecr) env.ECR_REPO_URL = V.ecr; if (V.container) env.CONTAINER_NAME = V.container;
      var r = API.createCbProject({ name: V.name, role: role, image: V.image, privileged: V.privileged, env: env, buildspec: "" }); if (r.errors) return r; UI.sel.cbps = r.res.id; return { msg: "สร้าง project " + V.name + " แล้ว" + (V.roleMode === "new" ? " · role ใหม่ยังไม่มีสิทธิ์ ECR: ไป IAM แนบ AmazonEC2ContainerRegistryPowerUser" : ""), next: "cbps" };
    } });
};
PAGES["cbp-edit"] = function () {
  var p = cdProj(UI.params.id || UI.sel.cbps); if (!p) return h("div", {}, [h("p", { text: "เลือก project ในรายการก่อน" }), h("button", { cls: "btn", type: "button", text: "กลับ", onclick: function () { go("cbps", {}, "CodeBuild"); } })]);
  return formPage({ name: "cbp-edit-" + p.name, crumb: "CodeBuild › " + p.name + " › Edit environment", title: "Edit Environment", back: "cbps", lead: "แก้ Privileged / service role / ตัวแปร แล้ว Release change หรือ Retry stage Build",
    init: function () { return { privileged: p.privileged, role: p.role, ecr: p.env.ECR_REPO_URL || "", container: p.env.CONTAINER_NAME || "" }; },
    sections: function () { return [{ t: "Environment", f: [{ id: "privileged", type: "check", text: "Privileged" }, { id: "role", type: "select", label: "Service role", opts: function () { return cdRoleOpts("codebuild.amazonaws.com"); } }, { id: "ecr", type: "text", label: "ECR_REPO_URL" }, { id: "container", type: "text", label: "CONTAINER_NAME" }] }]; },
    submit: "Update environment", onSubmit: function (V) { var env = {}; if (V.ecr) env.ECR_REPO_URL = V.ecr; if (V.container) env.CONTAINER_NAME = V.container; var r = API.updateCbProject(p.name, { privileged: V.privileged, env: env, role: V.role }); return r.errors ? r : { msg: "อัปเดต project แล้ว", next: "cbps" }; } });
};

// ---------- Connections ----------
LISTS.conns = function () {
  return ({ key: "conns", kind: "conn", title: "Connections", crumb: "Developer Tools › Settings › Connections", create: [{ label: "Create connection", page: "conn-create" }], actions: [{ label: "Delete", page: "del", kind: "conn" }],
    detail: function (c) { return [["Name", c.name], ["Provider", c.provider], ["ARN", c.arn], ["Status", c.status === "AVAILABLE" ? okIco("Available") : tagp("Pending", "warn")]]; },
    rows: function () { return S.conns; },
    cols: [["Name", function (c) { return c.name; }], ["Provider", function (c) { return c.provider; }], ["Status", function (c) { return c.status === "AVAILABLE" ? okIco("Available") : tagp("Pending", "warn"); }], ["ARN", function (c) { return c.arn; }]] });
};
DET.conn = [["info", "Details", function (c) {
  return h("div", {}, [kvDom([["Status", c.status === "AVAILABLE" ? "Available" : "Pending"], ["Provider", c.provider], ["ARN", c.arn]]), c.status === "AVAILABLE" ? h("span") : h("div", {}, [h("div", { cls: "alert info", text: "Connection นี้ยัง Pending: ต้องไป GitHub ติดตั้ง AWS Connector for GitHub app แล้วอนุญาต repo (Terraform สร้างได้แค่สถานะ Pending)" }), h("button", { cls: "btn pri", type: "button", text: "Update pending connection", onclick: function () { go("conn-authorize", { id: c.name, from: "conns" }); } })])]);
}], ["tags", "Tags", null]];
PAGES["conn-create"] = function () {
  return formPage({ name: "conn-create", crumb: "Developer Tools › Settings › Connections › Create connection", title: "Create a connection", back: "conns", lead: "ตรงกับ aws_codestarconnections_connection · สร้างแล้วเป็น Pending เสมอ ต้อง authorize เอง",
    init: function () { return { provider: "GitHub", name: "" }; }, sections: function () { return [{ t: "Select a provider", f: [{ id: "provider", type: "select", label: "Provider", opts: function () { return [["GitHub", "GitHub"], ["Bitbucket", "Bitbucket"], ["GitLab", "GitLab.com"]]; } }, { id: "name", type: "text", label: "Connection name", ph: "pharmacy-github" }] }]; },
    submit: "Connect to GitHub", onSubmit: function (V) { var r = API.createConnection({ name: V.name, provider: V.provider }); if (r.errors) return r; UI.sel.conns = r.res.id; return { msg: "สร้าง connection " + V.name + " แล้ว (Pending) · กด Update pending connection เพื่อ authorize", next: "conns" }; } });
};
PAGES["conn-authorize"] = function () {
  var c = S.conns.filter(function (x) { return x.name === UI.params.id; })[0]; if (!c) return h("p", { text: "ไม่พบ connection" });
  return formPage({ name: "conn-authorize-" + c.name, crumb: "Connections › " + c.name + " › Connect to GitHub", title: "Connect to GitHub", back: "conns", lead: "จำลองหน้า GitHub: ติดตั้ง AWS Connector for GitHub ให้ account/org ของคุณ แล้วเลือก repo ที่อนุญาต",
    init: function () { return { app: "install", scope: "selected" }; }, sections: function () { return [{ t: "GitHub app", f: [{ id: "app", type: "radio", label: "AWS Connector for GitHub", opts: function () { return [["install", "Install a new app (เลือก account/org ของ GitHub)"]]; } }, { id: "scope", type: "radio", label: "Repository access", opts: function () { return [["selected", "Only select repositories"], ["all", "All repositories"]]; } }] }]; },
    submit: "Complete connection", onSubmit: function () { var r = API.authorizeConnection(c.name); return r.errors ? r : { msg: "Connection " + c.name + " เป็น Available แล้ว", next: "conns" }; } });
};
["pipes", "cbps", "conns"].forEach(function (k) { PAGES[k] = function () { return listPage(LISTS[k]()); }; });
