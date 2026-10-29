// ===== หน้าของ Use case 5 (GitHub Actions + OIDC): IAM Identity providers, role แบบ web identity, แท็บ Actions ของ GitHub จำลอง =====
LK.oidc = "oidcs";
LISTS.oidcs = function () {
  return ({ key: "oidcs", kind: "oidc", title: "Identity providers", crumb: "IAM › Identity providers", create: [{ label: "Add provider", page: "oidc-create" }], actions: [{ label: "Delete", page: "del", kind: "oidc" }],
    detail: function (p) { return [["Provider", p.host], ["Type", "OpenID Connect"], ["ARN", p.arn], ["Audience", p.audiences.join(", ")], ["Creation time", stFmt(p.born)], ["ใช้ทำอะไร", "ให้ GitHub Actions ขอสิทธิ์ AWS ด้วย ID token (ไม่ต้องเก็บ access key ถาวรใน GitHub)"]]; },
    rows: function () { return S.oidcs; }, cols: [["Provider", function (p) { return p.host; }], ["Type", function () { return "OpenID Connect"; }], ["Creation time", function (p) { return stFmt(p.born); }]] });
};
DET.oidc = [["details", "Details", det("oidc")]];
PAGES.oidcs = function () { return listPage(LISTS.oidcs()); };
PAGES["oidc-create"] = function () {
  return formPage({ name: "oidc-create", crumb: "IAM › Identity providers › Add provider", title: "Add an Identity provider", back: "oidcs", lead: "ตรงกับ aws_iam_openid_connect_provider · 1 account ต่อ 1 provider ของ GitHub · ไม่ต้องใส่ thumbprint แล้ว (AWS ตรวจใบรับรองของ GitHub เอง)",
    init: function () { return { type: "oidc", url: "https://token.actions.githubusercontent.com", audience: "sts.amazonaws.com" }; },
    sections: function () { return [{ t: "Provider details", f: [{ id: "type", type: "radio", label: "Provider type", opts: function () { return [["oidc", "OpenID Connect"], ["saml", "SAML (ไม่จำลอง)"]]; } }, { id: "url", type: "text", label: "Provider URL" }, { id: "audience", type: "text", label: "Audience", desc: "GitHub Actions ใช้ sts.amazonaws.com" }] }]; },
    submit: "Add provider", onSubmit: function (V) { var r = API.createOidcProvider({ url: V.url, audience: V.audience }); if (r.errors) return r; UI.sel.oidcs = r.res.id; return { msg: "เพิ่ม provider " + r.res.host + " แล้ว · ต่อไป: สร้าง role แบบ Web identity", next: "oidcs" }; } });
};
PAGES["role-web-create"] = function () {
  return formPage({ name: "role-web-create", crumb: "IAM › Roles › Create role › Web identity", title: "Create role (Web identity)", back: "roles", lead: "ตรงกับ aws_iam_role (assume_role_policy = web identity) + aws_iam_role_policy · console สร้าง trust policy ให้จากช่อง org / repo / branch · ถ้าต้องจับคู่แบบอื่น (เช่น environment) ไป Edit trust policy",
    init: function () { var p = S.oidcs[0]; return { provider: p ? p.arn : "", audience: "sts.amazonaws.com", org: ghUser(), repo: "pharmacy-backend", branch: "", name: "github-actions-deploy", ecr: true, ecs: true }; },
    sections: function (V) { return [
      { t: "Trusted entity", f: [{ id: "provider", type: "select", label: "Identity provider", opts: function () { return [["", "เลือก provider"]].concat(S.oidcs.map(function (p) { return [p.arn, p.host]; })); } }, { id: "audience", type: "select", label: "Audience", opts: function () { var p = S.oidcs.filter(function (x) { return x.arn === V.provider; })[0]; return (p ? p.audiences : ["sts.amazonaws.com"]).map(function (a) { return [a, a]; }); } }, { id: "org", type: "text", label: "GitHub organization", desc: "ชื่อ org หรือ user (ต้องกรอก)" }, { id: "repo", type: "text", label: "GitHub repository - optional", desc: "ว่าง = ทุก repo ใน org assume role นี้ได้ (อันตราย)" }, { id: "branch", type: "text", label: "GitHub branch - optional", desc: "ใส่ main = จำกัดเฉพาะ job ที่รันบน branch main (job ที่ใช้ environment จะไม่ตรง)" }] },
      { t: "Permissions (lab: ติ๊กให้ครบที่ต้องใช้)", f: [{ id: "ecr", type: "check", text: "ECR: login + push (ecr:GetAuthorizationToken, InitiateLayerUpload, …, PutImage)" }, { id: "ecs", type: "check", text: "ECS: RegisterTaskDefinition + UpdateService + iam:PassRole (pharmacy-ecs-*)" }] },
      { t: "Name", f: [{ id: "name", type: "text", label: "Role name" }] }]; },
    submit: "Create role", onSubmit: function (V) {
      var r = API.createRoleWeb({ name: V.name, provider: V.provider, audience: V.audience, org: V.org, repo: V.repo, branch: V.branch }); if (r.errors) return r;
      var st = []; if (V.ecr) st.push({ Effect: "Allow", Action: ["ecr:GetAuthorizationToken"], Resource: ["*"] }, { Effect: "Allow", Action: ["ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage"], Resource: ["arn:aws:ecr:" + REGION + ":" + ACCOUNT + ":repository/pharmacy/api"] });
      if (V.ecs) st.push({ Effect: "Allow", Action: ["ecs:DescribeServices", "ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition", "ecs:UpdateService"], Resource: ["*"] }, { Effect: "Allow", Action: ["iam:PassRole"], Resource: ["arn:aws:iam::" + ACCOUNT + ":role/pharmacy-ecs-*"] });
      if (st.length) r.res.inline = [{ name: "deploy", doc: { Version: "2012-10-17", Statement: st } }];
      return { msg: "สร้าง role " + V.name + " แล้ว · ARN: arn:aws:iam::" + ACCOUNT + ":role/" + V.name, next: "roles" };
    } });
};
PAGES["role-trust-edit"] = function () {
  var r = find(S.roles, UI.params.id); if (!r) return h("p", { text: "ไม่พบ role" });
  var cur = JSON.stringify(r.trust || { Version: "2012-10-17", Statement: [{ Effect: "Allow", Principal: { Service: r.trustSvc || "ec2.amazonaws.com" }, Action: "sts:AssumeRole" }] }, null, 2);
  return formPage({ name: "role-trust-edit-" + r.id, crumb: "IAM › Roles › " + r.name + " › Edit trust policy", title: "Edit trust policy", back: "roles", lead: "ใครสวม role นี้ได้ · แบบ GitHub: Principal.Federated = provider · Condition aud = sts.amazonaws.com · sub = repo:OWNER/REPO:ref:refs/heads/BRANCH หรือ …:environment:NAME หรือ …:* ",
    init: function () { return { json: cur }; }, sections: function () { return [{ t: "Trust policy (JSON)", f: [{ id: "json", type: "area", label: "Policy" }] }]; },
    submit: "Update policy", onSubmit: function (V) { var x = API.setRoleTrust(r.id, V.json); return x.errors ? { errors: { json: String(x.errors[Object.keys(x.errors)[0]]).replace(/^[A-Za-z]+: /, "") } } : { msg: "อัปเดต trust policy ของ " + r.name + " แล้ว", next: "roles" }; } });
};

// ---------- GitHub › Actions (ในแท็บ Browser) ----------
var GHB = "#d0d7de";
function ghSt(s) { return s === "success" ? ["✓", "#1a7f37"] : s === "failure" ? ["✗", "#cf222e"] : s === "waiting" ? ["●", "#9a6700"] : ["…", "#0969da"]; }
function wbGhActions(user, name, rp, parts, go2, link) {
  var repo = user + "/" + name, w = ghaWf(repo), F = W.gha = W.gha || { tag: "v1.1.0" }, base = "/" + user + "/" + name + "/actions", box = h("div", {});
  function btn(t, fn, cls) { return h("button", { type: "button", cls: cls || "btn", text: t, onclick: fn }); }
  if (parts[3] === "runs") {
    var run = S.gruns.filter(function (r) { return r.repo === repo && r.id === +parts[4]; })[0];
    if (!run) return h("p", { text: "ไม่พบ run" });
    var s0 = ghSt(run.status);
    box.appendChild(h("div", { style: "margin-bottom:8px" }, [link(base, "← All workflows"), h("h2", { style: "margin:8px 0;font-size:1.25rem" }, [h("span", { style: "color:" + s0[1], text: s0[0] + " " }), (run.trigger === "pull_request" ? "checks" : "deploy") + " #" + run.id + " · " + (run.trigger === "tag" ? "tag " : run.trigger === "pull_request" ? "pull_request " : "push ") + run.ref]), h("div", { cls: "sub", text: "commit " + run.sha.slice(0, 7) + " · " + run.status })]));
    if (run.waiting) box.appendChild(h("div", { style: "border:1px solid #d4a72c;background:#fff8c5;border-radius:6px;padding:10px 14px;margin-bottom:10px" }, [h("b", { text: "Waiting for review: environment “" + (w ? w.prdEnv : "production") + "”" }), h("p", { cls: "sub", text: "ผู้ตรวจที่ตั้งไว้ใน Settings › Environments ต้องกด Approve ก่อน job นี้จะเริ่ม" }), btn("Approve and deploy", function () { API.ghaApprove(repo, run.id, true); W.res = webOpen(W.addr); render(); }, "btn pri"), " ", btn("Reject", function () { API.ghaApprove(repo, run.id, false); W.res = webOpen(W.addr); render(); })]));
    run.jobs.forEach(function (j) {
      var js = ghSt(j.status === "cancelled" ? "failure" : j.status);
      box.appendChild(h("div", { style: "border:1px solid " + GHB + ";border-radius:6px;margin:8px 0;overflow:hidden" }, [h("div", { style: "background:#f6f8fa;padding:8px 12px;font-weight:700", text: j.name + " " + (j.sub ? " · sub: " + j.sub : "") })].concat(j.steps.map(function (s) {
        var st = ghSt(s.ok ? "success" : "failure");
        return h("details", { style: "border-top:1px solid " + GHB + ";padding:6px 12px", open: !s.ok }, [h("summary", { style: "cursor:pointer" }, [h("span", { style: "color:" + st[1] + ";font-weight:800", text: st[0] + " " }), s.name]), h("pre", { style: "background:#0d1117;color:#e6edf3;padding:8px 10px;border-radius:6px;overflow:auto;font-size:.8rem;margin:6px 0", text: s.log.join("\n") }), s.hint ? h("div", { style: "color:#cf222e;font-size:.88rem", text: "💡 " + s.hint }) : h("span")]);
      }).concat(j.steps.length ? [] : [h("div", { style: "padding:8px 12px", cls: "sub", text: "ยังไม่เริ่ม (รออนุมัติ)" })]))));
      void js;
    });
    return box;
  }
  // รายการ run + ตัวแก้ workflow
  var tops = h("div", { style: "display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px" }, [
    btn("git push → main", function () { var r = API.ghaPush(repo, "main"); if (r.skipped) flash("info", r.msg); else if (r.errors) flash("bad", r.errors._); rp.n = (rp.n || 0) + 1; W.res = webOpen(W.addr); render(); }, "btn pri"),
    h("span", { cls: "sub", text: "หรือ tag:" }), h("div", { style: "width:170px" }, [exPick([["v1.1.0", "v1.1.0"], ["v1.2.0", "v1.2.0"], ["v1.0.0 (มีใน ECR แล้ว)", "v1.0.0"]].map(function (x) { return [x[1], x[0]]; }), function () { return F.tag; }, function (v) { F.tag = v; }, F, "_tag", "v1.1.0", "tag", false)]),
    btn("create tag + push", function () { rp.tags = rp.tags || []; if (rp.tags.indexOf(F.tag) < 0) rp.tags.push(F.tag); var r = API.ghaTag(repo, F.tag); if (r.skipped) flash("info", r.msg); else if (r.errors) flash("bad", r.errors._); W.res = webOpen(W.addr); render(); })]);
  box.appendChild(h("h2", { style: "margin:0 0 8px;font-size:1.25rem", text: "All workflows" }));
  if (!w) box.appendChild(h("div", { style: "border:1px dashed " + GHB + ";border-radius:6px;padding:14px;margin-bottom:12px" }, [h("b", { text: "ยังไม่มี workflow" }), h("p", { cls: "sub", text: "สร้างไฟล์ .github/workflows/deploy.yml ใน repo นี้ (ตัวจำลองสร้างจากฟอร์มด้านล่าง · ของจริงเขียน YAML เอง ดูตัวอย่างที่ labs/05-github-actions/workflow/deploy.yml)" })]));
  else box.appendChild(tops);
  // ฟอร์ม workflow
  var cfg = F.wf = F.wf || { name: "deploy", pushBranch: "main", tagPattern: "v*", idToken: true, roleArn: "", region: REGION, ecrRepo: "pharmacy/api", containerName: "api", devCluster: "pharmacy-dev", devService: "pharmacy-api", prdCluster: "pharmacy-prd", prdService: "pharmacy-api", prdEnv: "production", waitStability: true };
  if (w && !F.loaded) { Object.keys(cfg).forEach(function (k) { if (w[k] !== undefined) cfg[k] = w[k]; }); F.loaded = true; }
  function fld(label, key, ex, desc) { return h("div", { style: "margin:6px 0" }, [h("label", { style: "font-weight:600;font-size:.85rem", text: label }), desc ? h("div", { cls: "sub", style: "font-size:.78rem", text: desc }) : h("span"), exPick(ex, function () { return cfg[key]; }, function (v) { cfg[key] = v; }, F, "_" + key, "", label, false)]); }
  var roles = S.roles.map(function (r) { return ["arn:aws:iam::" + ACCOUNT + ":role/" + r.name, r.name]; });
  var form = h("div", { style: "border:1px solid " + GHB + ";border-radius:6px;padding:10px 14px;margin:0 0 12px" }, [
    h("b", { text: (w ? "Edit" : "Create") + " workflow · .github/workflows/deploy.yml" }),
    h("label", { style: "display:flex;gap:8px;align-items:center;margin:8px 0" }, [h("input", { type: "checkbox", checked: cfg.immutable !== false, onchange: function (e) { cfg.immutable = e.target.checked; } }), h("span", { text: "repo สร้างหลัง 15 ก.ค. 2026 (token ส่ง sub แบบ immutable: repo:ORG@<id>/REPO@<id>:…)" })]),
    h("label", { style: "display:flex;gap:8px;align-items:center;margin:8px 0" }, [h("input", { type: "checkbox", checked: !!cfg.idToken, onchange: function (e) { cfg.idToken = e.target.checked; } }), h("span", { text: "permissions: id-token: write (ขอ ID token ให้ OIDC)" })]),
    fld("role-to-assume (ARN ของ role)", "roleArn", roles, "จากหน้า IAM › Roles หรือ output role_arn ของ terraform"),
    fld("on.push.branches (dev deploy อัตโนมัติ)", "pushBranch", [["main", "main"], ["develop", "develop"]]),
    fld("on.push.tags (prd)", "tagPattern", [["v*", "v*"], ["release-*", "release-*"]]),
    fld("CONTAINER_NAME (ชื่อ container ใน task definition)", "containerName", [["api", "api"], ["app", "app"], ["frontend", "frontend"]]),
    fld("ECR repository", "ecrRepo", [["pharmacy/api", "pharmacy/api"], ["pharmacy/frontend", "pharmacy/frontend"]]),
    fld("on.pull_request (รัน checks ตอนเปิด PR)", "onPr", [["true", "true (เปิด)"], ["", "(ไม่ใช้)"]], "token ของ PR ส่ง sub = repo:owner/repo:pull_request — trust policy ที่ผูกแค่ branch main จะไม่ผ่าน"),
    fld("environment ของ job prd (ว่าง = ไม่ต้องอนุมัติ)", "prdEnv", [["production", "production"], ["", "(ไม่ใช้ environment)"]], "ใส่ environment แล้ว sub ของ token จะเป็น …:environment:production ไม่ใช่ branch/tag"),
    btn("Commit changes", function () { cfg.repo = repo; var r = API.saveWorkflow(Object.assign({ repo: repo }, cfg)); if (r.errors) { flash("bad", Object.keys(r.errors).map(function (k) { return r.errors[k]; }).join(" · ")); return; } F.loaded = true; flash("ok", "commit .github/workflows/deploy.yml แล้ว"); W.res = webOpen(W.addr); render(); }, "btn pri")]);
  box.appendChild(h("details", { open: !w }, [h("summary", { style: "cursor:pointer;font-weight:600;margin-bottom:8px", text: w ? "แก้ไข workflow (ตัวจำลองสร้าง YAML จากฟอร์ม)" : "สร้าง workflow" }), form]));
  if (w) box.appendChild(h("details", {}, [h("summary", { style: "cursor:pointer;font-weight:600;margin:6px 0", text: "ดู YAML ที่ได้" }), codePre(ghaYaml(w), "an")]));
  var rows = ghaRunsOf(repo);
  box.appendChild(h("div", { style: "border:1px solid " + GHB + ";border-radius:6px;overflow:hidden;margin-top:10px" }, [h("div", { style: "background:#f6f8fa;padding:8px 12px;font-weight:700", text: rows.length + " workflow runs" })].concat(rows.length ? rows.map(function (r) { var s = ghSt(r.status); return h("div", { style: "border-top:1px solid " + GHB + ";padding:8px 12px;display:flex;gap:10px;align-items:center" }, [h("span", { style: "color:" + s[1] + ";font-weight:800;width:18px", text: s[0] }), link(base + "/runs/" + r.id, "deploy #" + r.id, "font-weight:600"), h("span", { cls: "sub", text: (r.trigger === "tag" ? "tag " : "push ") + r.ref + " · " + r.sha.slice(0, 7) + " · " + r.status })]); }) : [h("div", { style: "padding:12px", cls: "sub", text: "ยังไม่มี run (push ขึ้น main หรือสร้าง tag)" })])));
  return box;
}

// ---------- Browser: เว็บบนเครื่องเดียว (docker compose + Caddy) ----------
function wbCompose(r) {
  var i = r.inst, a = r.app, json = { service: "pharmacy-api", env: "single-vm", db: "connected", served_by: "compose@" + (i.name || i.id) };
  var extra = h("div", { cls: "bw-why" }, [r.redirectedFrom ? h("div", { cls: "hint", text: "↪ " + r.redirectedFrom }) : h("span"), h("h4", { text: "pharmacy · รันด้วย docker compose บนเครื่องเดียว" }),
    kvDom([["URL", (r.tls ? "https://" : "http://") + r.host], ["TLS", r.tls || "ไม่มี (HTTP)"], ["EC2", (i.name || i.id) + " · " + i.type + " · " + i.state + " · " + (i.publicIp || "ไม่มี public IP")], ["containers", "caddy ✓ · app ✓ · db ✓ (docker compose up -d)"], ["Caddyfile", a.domain ? a.domain + " { reverse_proxy app:8000 }" : ":80 { reverse_proxy app:8000 }"]])]);
  return wbWin({ url: W.addr || (r.tls ? "https://" : "http://") + r.host, title: "pharmacy API", ico: "💊", status: 200, statusText: "OK", insecure: !r.tls, secure: r.tls, body: pharmBody(json), steps: r.steps || [], stepsTitle: "ขั้นที่ตัวจำลองตรวจ", extra: extra });
}
