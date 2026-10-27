// ===== หน้า console ของ App Runner (use case 7) =====
(function () {
  var lab = NAV.Lab; delete NAV.Lab;
  NAV["App Runner"] = [["", [["aprs", "Services"]]], ["Documentation", [[null, "App Runner documentation"]]]];
  NAV.Lab = lab; NAVHOME["App Runner"] = "aprs"; LK.apr = "aprs"; SVC_ICO["App Runner"] = "ecs"; SVC_NAME["App Runner"] = "App Runner";
})();
function aprImgOpts() { var o = [["", "เลือก image"]]; S.repos.forEach(function (r) { r.images.forEach(function (i) { o.push([ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com/" + r.name + ":" + i.tag, r.name + ":" + i.tag]); }); }); return o; }
function aprStatTag(e) { return e.status === "RUNNING" ? tagp("Running", "ok") : e.status === "CREATE_FAILED" ? tagp("Create failed", "bad") : tagp("Operation in progress", "warn"); }
LISTS.aprs = function () {
  return ({ key: "aprs", kind: "apr", title: "Services", crumb: "App Runner › Services", create: [{ label: "Create an App Runner service", page: "apr-create" }], actions: [{ label: "Deploy", page: "apr-deploy", needsSel: true }, { label: "Delete", page: "del", kind: "apr" }],
    detail: function (s) { var e = aprEval(s); return [["Service name", s.name], ["Default domain", "https://" + s.url], ["Status", e.status], ["Image", s.image], ["Port", String(s.port)], ["CPU / Memory", APR_CPU[s.cpu] + " / " + APR_MEM[s.memory]], ["Access role", s.accessRole || "-"], ["Health check", s.health.protocol + (s.health.protocol === "HTTP" ? " " + s.health.path : "")]]; },
    rows: function () { return S.aprs; },
    cols: [["Service name", function (s) { return s.name; }], ["Status", function (s) { return aprStatTag(aprEval(s)); }], ["Domain", function (s) { return s.url; }], ["Source", function (s) { return "ECR"; }], ["Created", function (s) { return stFmt(s.born); }]] });
};
PAGES.aprs = function () { return listPage(LISTS.aprs()); };
PAGES["apr-deploy"] = function () { var s = aprSvc(UI.sel.aprs) || S.aprs.filter(function (x) { return x.id === UI.sel.aprs; })[0]; if (!s) return h("p", { text: "เลือก service ในรายการก่อน" }); API.deployAppRunner(s.name); UI.banner = { kind: "ok", msg: "เริ่ม deployment ใหม่ของ " + s.name + " (ดึง image tag เดิมซ้ำ)" }; setTimeout(function () { go("aprs"); }, 0); return h("p", { text: "กำลัง deploy…" }); };
PAGES["apr-create"] = function () {
  return formPage({ name: "apr-create", crumb: "App Runner › Services › Create", title: "Create service", back: "aprs", lead: "ตรงกับ aws_apprunner_service · ได้ URL HTTPS + scale ให้เอง · ไม่ต้องมี cluster / ALB / NAT",
    init: function () { var im = aprImgOpts()[1], ro = cdRoleOpts("build.apprunner.amazonaws.com")[1]; return { image: im ? im[0] : "", port: "8000", name: "", cpu: "1 vCPU", memory: "2 GB", role: ro ? ro[0] : "", hp: "HTTP", path: "/healthz", env: "dev" }; },
    sections: function () { return [
      { t: "Step 1: Source", f: [{ id: "image", type: "select", label: "Container image URI (Amazon ECR)", opts: aprImgOpts }, { id: "role", type: "select", label: "ECR access role", desc: "ต้องเป็น role ที่ trust build.apprunner.amazonaws.com + AWSAppRunnerServicePolicyForECRAccess · ECR ส่วนตัวขาดไม่ได้", opts: function () { return cdRoleOpts("build.apprunner.amazonaws.com"); } }] },
      { t: "Step 2: Service settings", f: [{ id: "name", type: "text", label: "Service name", ph: "pharmacy-api-dev" }, { id: "cpu", type: "select", label: "vCPU", opts: function () { return Object.keys(APR_CPU).map(function (k) { return [APR_CPU[k], APR_CPU[k]]; }); }, onchange: function (V) { var c = aprNum(V.cpu, APR_CPU); if ((APR_PAIRS[c] || []).map(function (k) { return APR_MEM[k]; }).indexOf(V.memory) < 0) V.memory = APR_MEM[(APR_PAIRS[c] || [])[0]] || ""; } }, { id: "memory", type: "select", label: "Memory", desc: "ตัวเลือกเปลี่ยนตาม vCPU (App Runner รองรับ 11 คู่)", opts: function (V) { var c = aprNum(V.cpu, APR_CPU); return (APR_PAIRS[c] || []).map(function (k) { return [APR_MEM[k], APR_MEM[k]]; }); } }, { id: "port", type: "text", label: "Port", desc: "port ที่แอปฟังจริง (แอปตัวอย่างฟัง 8000) · ผิด = health check ไม่ผ่าน" }, { id: "env", type: "text", label: "Environment variable APP_ENV" }, { id: "hp", type: "select", label: "Health check protocol", opts: function () { return [["TCP", "TCP (default)"], ["HTTP", "HTTP"]]; } }, { id: "path", type: "text", label: "Health check path", show: function (V) { return V.hp === "HTTP"; } }] }]; },
    submit: "Create & deploy", onSubmit: function (V) {
      var r = API.createAppRunner({ name: V.name, image: V.image, port: V.port, cpu: V.cpu, memory: V.memory, accessRole: V.role, healthProtocol: V.hp, healthPath: V.path, env: { APP_ENV: V.env } });
      if (r.errors) return mgErrMap(r, { name: "name", image: "image", port: "port", cpu: "cpu", memory: "memory" }); UI.sel.aprs = r.res.id; return { msg: "สร้าง service " + V.name + " แล้ว · เปิด https://" + r.res.url + "/healthz ที่ Browser", next: "aprs" };
    } });
};
PAGES["apr-edit"] = function () {
  var s = aprSvc(UI.params.name) || S.aprs.filter(function (x) { return x.id === UI.sel.aprs; })[0]; if (!s) return h("p", { text: "เลือก service ก่อน" });
  return formPage({ name: "apr-edit-" + s.name, crumb: "App Runner › " + s.name + " › Configuration › Edit", title: "Edit configuration", back: "aprs", lead: "แก้แล้ว App Runner deploy ใหม่เอง · ตรงกับการแก้ aws_apprunner_service แล้ว apply",
    init: function () { return { image: s.image, port: String(s.port), role: s.accessRole, hp: s.health.protocol, path: s.health.path }; },
    sections: function () { return [{ t: "Source and deployment", f: [{ id: "image", type: "select", label: "Container image URI", opts: aprImgOpts }, { id: "role", type: "select", label: "ECR access role", opts: function () { return cdRoleOpts("build.apprunner.amazonaws.com"); } }] }, { t: "Service settings", f: [{ id: "port", type: "text", label: "Port" }, { id: "hp", type: "select", label: "Health check protocol", opts: function () { return [["TCP", "TCP"], ["HTTP", "HTTP"]]; } }, { id: "path", type: "text", label: "Health check path", show: function (V) { return V.hp === "HTTP"; } }] }]; },
    submit: "Save changes", onSubmit: function (V) { API.updateAppRunner(s.name, { image: V.image, port: V.port, accessRole: V.role, healthProtocol: V.hp, healthPath: V.path }); return { msg: "บันทึกแล้ว · deployment ใหม่เริ่ม", next: "aprs" }; } });
};
DET.apr = [
  ["ov", "Overview", function (s) {
    var e = aprEval(s); return h("div", {}, [kvDom([["Status", e.status], ["Default domain", "https://" + s.url], ["Latest deployment", "#" + s.deploys[0].n + " · " + stFmt(s.deploys[0].born)]]), e.reason ? h("div", { cls: "alert bad", text: e.reason }) : h("span"), h("h4", { text: "ขั้นที่ตัวจำลองตรวจ" }), mgSteps(e.steps), h("p", { cls: "hint", text: "ก๊อป Default domain ไปเปิดที่แท็บ Browser" })]);
  }],
  ["logs", "Logs", function (s) { var e = aprEval(s); return h("div", {}, [h("p", { cls: "hint", text: "Event log + Application log (ของจริงอยู่ CloudWatch log group /aws/apprunner/" + s.name + "/…)" }), codePre(e.logs.join("\n"), "an")]); }],
  ["conf", "Configuration", function (s) { return h("div", {}, [h("button", { cls: "btn", type: "button", text: "Edit", onclick: function () { go("apr-edit", { name: s.name, from: "aprs" }); } }), kvDom([["Image", s.image], ["Port", String(s.port)], ["CPU / Memory", APR_CPU[s.cpu] + " / " + APR_MEM[s.memory]], ["Access role", s.accessRole || "ไม่ได้ตั้ง"], ["Health check", s.health.protocol + (s.health.protocol === "HTTP" ? " " + s.health.path : "")], ["Environment", JSON.stringify(s.env)], ["Auto deploy", s.auto ? "On" : "Off (กด Deploy เอง)"]])]); }]
];
function wbAprun(r) {
  return h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("h2", { text: "App Runner · " + r.svc.name }), h("div", { cls: "hint", text: "GET https://" + r.host + r.path + " → 200 OK" }), codePre(JSON.stringify(r.json, null, 2), "an"), h("h4", { text: "ขั้นที่ตัวจำลองตรวจ" }), mgSteps(r.steps || [])])]);
}

// ---------- ภาพรวม: เลือกแบบไหน ----------
var AP_ROWS = [
  ["① ดูแลเครื่องเอง", "EC2 + Docker Compose + Caddy", "ทีมเล็ก/ฟรีแลนซ์/MVP", "สูง (patch, backup)", "฿ ต่ำสุด", { uc: "single" }],
  ["① ดูแลเครื่องเอง", "k3s + Jenkins + ArgoCD บน VM", "เรียนรู้ / on-prem / คุมต้นทุน", "สูงมาก", "฿ กลาง (VM หลายเครื่อง)", { lab: "lab-check", note: "main lab (README.md)" }],
  ["② Managed container", "ECS Fargate + ALB + RDS", "ทีมกลาง · นิยมสุดบน AWS", "ต่ำ", "฿ กลาง", { uc: "ecs" }],
  ["② Managed container", "EKS + RDS + ArgoCD", "ต้อง k8s จริง / มี platform team", "กลาง", "฿ สูง (EKS ~$73/เดือน + node)", { lab: "lab-managed", note: "Lab › เทียบ VM กับ Managed (ArgoCD ใช้ของ main lab)" }],
  ["② Managed container", "App Runner + ECR (legacy)", "⚠️ ปิดรับลูกค้าใหม่แล้ว · ของใหม่ใช้ ECS Express Mode", "ต่ำมาก", "฿ ต่ำ-กลาง", { uc: "apr" }],
  ["③ ไม่มี server", "API Gateway + Lambda + DynamoDB", "งานเป็นช่วง ๆ / event", "ต่ำมาก", "฿ จ่ายตามใช้", { uc: "sls" }],
  ["③ ไม่มี server", "S3 + CloudFront + Route 53 + ACM", "เว็บ static / SPA", "ต่ำมาก", "฿ ต่ำสุด", { uc: "static" }],
  ["+ CI/CD (ปล่อยลง ECS)", "GitHub Actions + OIDC (นิยมสุด)", "code อยู่ GitHub", "ต่ำ", "฿ ต่ำ", { uc: "gha" }],
  ["+ CI/CD (ปล่อยลง ECS)", "CodePipeline + CodeBuild", "ทีมที่ใช้ AWS ล้วน", "ต่ำ", "฿ ต่ำ", { uc: "cd" }]
];
var AP_COL = { "①": "#8c4fff", "②": "#d9480f", "③": "#7d4acf", "+": "#2e7d32" };
PAGES["lab-ap"] = function () {
  var groups = [], cur = null;
  AP_ROWS.forEach(function (r) { if (!cur || cur.name !== r[0]) { cur = { name: r[0], rows: [] }; groups.push(cur); } cur.rows.push(r); });
  var body = groups.map(function (g) {
    var col = AP_COL[g.name.charAt(0)] || "#475569";
    return h("div", { style: "margin:0 0 18px" }, [h("h3", { style: "margin:0 0 8px;color:" + col, text: g.name }), h("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px" }, g.rows.map(function (r) {
      var o = r[5], u = o.uc ? UC.filter(function (x) { return x.id === o.uc; })[0] : null;
      var btn = u ? h("button", { cls: "btn pri", type: "button", text: "เปิด Use case " + u.no, onclick: function () { UC_SEL.id = u.id; go("lab-uc", {}, "Lab"); } }) : h("button", { cls: "btn", type: "button", text: "เปิด", onclick: function () { go(o.lab, {}, "Lab"); } });
      return h("div", { style: "border:1px solid var(--line,#d5dbdb);border-left:4px solid " + col + ";border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;background:#fff" }, [
        h("b", { text: r[1] }), h("div", { cls: "hint", text: r[2] }),
        h("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, [tagp("ดูแล: " + r[3]), tagp(r[4])]),
        o.note ? h("div", { cls: "hint", text: o.note }) : h("span"), h("div", { style: "margin-top:auto" }, [btn])]);
    }))]);
  });
  return h("div", {}, [crumbEl("Lab › เลือกแบบไหน"), h("h1", { text: "เลือกวิธี deploy แบบไหน (ทุกแบบ)" }), h("div", { cls: "card" }, [h("div", { cls: "cb" }, [
    h("p", { cls: "hint", text: "3 หมู่ตามว่าแอปรันที่ไหน + CI/CD เป็นอีกแกน (ปล่อยลง ECS) · ทุกใบมี lab ให้ลองใน simulator" })].concat(body, [
    h("div", { cls: "alert", text: "เริ่มจาก static/serverless ถ้าได้ → ไม่ได้ก็ ECS Fargate (หรือ ECS Express Mode ถ้าอยากง่ายแบบ PaaS) → ต้อง k8s จริง ๆ ค่อย EKS · เครื่องเดียวเหมาะ MVP/ภายใน · k3s+Jenkins ไว้เรียนรู้" })]))])]);
};
(function () { var L = NAV.Lab[0][1]; var i = L.map(function (x) { return x[0]; }).indexOf("lab-uc"); L.splice(i < 0 ? L.length : i, 0, ["lab-ap", "เลือกแบบไหน (ทุกแบบ)"]); NAVICO["lab-ap"] = "🧩"; })();
