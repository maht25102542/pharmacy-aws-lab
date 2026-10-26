// ===== หน้า console ของ Lambda, API Gateway (HTTP API), DynamoDB (use case 3) =====
// หน้าตา/ชื่อแท็บเรียงตามความจำของ console ปี 2025 · wizard หลายส่วนย่อเป็นหน้าเดียว
(function () {
  var lab = NAV.Lab; delete NAV.Lab;
  NAV.Lambda = [["", [["lams", "Functions"], ["lam-apps", "Applications"], ["layers", "Layers"]]], ["Additional resources", [["lam-csc", "Code signing configurations"], ["lam-cp", "Capacity providers"]]]];
  NAV["API Gateway"] = [["", [["apis", "APIs"], ["adoms", "Custom domain names"], ["vlinks", "VPC links"]]], ["Documentation", [[null, "API Gateway documentation"]]]];
  NAV.DynamoDB = [["", [["ddb", "Tables"], ["ddb-items", "Explore items"], ["ddb-partiql", "PartiQL editor"], ["ddb-backups", "Backups"], ["ddb-exports", "Exports to S3"], ["ddb-settings", "Settings"]]]];
  NAV.Lab = lab; NAVHOME.Lambda = "lams"; NAVHOME["API Gateway"] = "apis"; NAVHOME.DynamoDB = "ddb";
  LK.lam = "lams"; LK.api = "apis"; LK.ddb = "ddb"; LK.layer = "layers"; LK.adom = "adoms"; LK.alarm = "alarms";
})();
function lamRoleOpts() { return [["", "เลือก role"]].concat(S.roles.filter(function (r) { return roleTrusts(r, "lambda.amazonaws.com"); }).map(function (r) { return [r.name, r.name]; })); }
function lamFnOpts() { return [["", "เลือก function"]].concat(S.lams.map(function (l) { return [l.name, l.name]; })); }
function slsSel(rows, key) { var id = UI.sel[key]; return rows.filter(function (x) { return x.id === id; })[0] || null; }

// ---------- Lambda ----------
LISTS.lams = function () {
  return ({ key: "lams", kind: "lam", title: "Functions", crumb: "Lambda › Functions", create: [{ label: "Create function", page: "lam-create" }], actions: [{ label: "Delete", page: "del", kind: "lam" }],
    detail: function (l) { return [["Function name", l.name], ["ARN", l.arn], ["Runtime", l.runtime], ["Handler", l.handler], ["Memory / Timeout", l.memory + " MB / " + l.timeout + " s"], ["Execution role", l.role], ["Last modified", stFmt(l.born)]]; },
    rows: function () { return S.lams; },
    cols: [["Function name", function (l) { return l.name; }], ["Description", function () { return "-"; }], ["Package type", function () { return "Zip"; }], ["Runtime", function (l) { return l.runtime; }], ["Last modified", function (l) { return stFmt(l.born); }]] });
};
PAGES["lam-create"] = function () {
  return formPage({ name: "lam-create", crumb: "Lambda › Functions › Create function", title: "Create function", back: "lams", lead: "ตรงกับ aws_lambda_function · Author from scratch · โค้ดอัปโหลดทีหลังที่แท็บ Code (Upload from .zip)",
    init: function () { return { name: "", runtime: "python3.12", roleMode: "new", role: "", handler: "app.handler", memory: "128", timeout: "10", table: "", appenv: "dev" }; },
    sections: function (V) { return [
      { t: "Basic information", f: [{ id: "name", type: "text", label: "Function name", desc: "ตัวอักษร ตัวเลข - _ ไม่เกิน 64 ตัว", ph: "pharmacy-api-dev" }, { id: "runtime", type: "select", label: "Runtime", opts: function () { return LAM_RUNTIMES.map(function (r) { return [r, r]; }); } }, { id: "arch", type: "radio", label: "Architecture", opts: function () { return [["x86_64", "x86_64"], ["arm64", "arm64 (ถูกกว่า ~20%)"]]; } }] },
      { t: "Permissions", f: [{ id: "roleMode", type: "radio", label: "Execution role", desc: "role ที่ Lambda สวมตอนรัน (ไม่ใช่สิทธิ์ของคนเรียก)", opts: function () { return [["new", "Create a new role with basic Lambda permissions (ได้ AWSLambdaBasicExecutionRole = เขียน log)"], ["existing", "Use an existing role"]]; } }, { id: "role", type: "select", label: "Existing role", show: function (V2) { return V2.roleMode === "existing"; }, opts: function () { return lamRoleOpts(); } }] },
      { t: "Advanced settings (ของจริงแก้ทีหลังที่ Configuration)", f: [{ id: "handler", type: "text", label: "Handler", desc: "ไฟล์.ฟังก์ชัน เช่น app.handler = ไฟล์ app.py ฟังก์ชัน handler" }, { id: "memory", type: "text", label: "Memory (MB)", desc: "128-10240 · CPU เพิ่มตาม memory" }, { id: "timeout", type: "text", label: "Timeout (วินาที)", desc: "1-900 · API Gateway HTTP API รอได้ไม่เกิน 30 วินาที" }, { id: "table", type: "select", label: "Environment variable TABLE_NAME", opts: function () { return [["", "ไม่ตั้ง"]].concat(S.ddb.map(function (t) { return [t.name, t.name]; })); } }, { id: "appenv", type: "text", label: "Environment variable APP_ENV" }] }]; },
    submit: "Create function", onSubmit: function (V) {
      var role = V.role;
      if (V.roleMode === "new") { if (!V.name) return { errors: { name: "ต้องกรอกชื่อ function" } }; var rr = API.createRole({ name: V.name + "-role-" + slsHex(8), entity: "AWS service", usecase: "Lambda", policies: ["AWSLambdaBasicExecutionRole"] }); if (rr.errors) return { errors: { name: rr.errors.name || "สร้าง role ไม่ได้" } }; role = rr.res.name; }
      var env = {}; if (V.table) env.TABLE_NAME = V.table; if (V.appenv) env.APP_ENV = V.appenv;
      var r = API.createLambda({ name: V.name, runtime: V.runtime, handler: V.handler, role: role, memory: V.memory, timeout: V.timeout, env: env });
      if (r.errors) return r; UI.sel.lams = r.res.id; UI.lamTab = "conf"; return { msg: "สร้าง function " + V.name + " แล้ว" + (V.roleMode === "new" ? " (ได้ role ใหม่ " + role + " : เขียน log ได้ แต่ยังแตะ DynamoDB ไม่ได้ ต้องเพิ่ม policy)" : ""), next: "lams" };
    } });
};
PAGES["lam-edit"] = function () {
  var l = slsLam(UI.params.id); if (!l) return h("p", { text: "ไม่พบ function" });
  return formPage({ name: "lam-edit-" + l.name, crumb: "Lambda › " + l.name + " › Edit general configuration", title: "Edit basic settings", back: "lams", lead: "แก้ memory / timeout / handler · บันทึกแล้ว execution environment ถูกสร้างใหม่ (คำขอถัดไปเป็น cold start)",
    init: function () { return { memory: String(l.memory), timeout: String(l.timeout), handler: l.handler }; },
    sections: function () { return [{ t: "General configuration", f: [{ id: "handler", type: "text", label: "Handler" }, { id: "memory", type: "text", label: "Memory (MB)" }, { id: "timeout", type: "text", label: "Timeout (วินาที)" }] }]; },
    submit: "Save", onSubmit: function (V) { var r = API.updateLambda(l.name, { memory: V.memory, timeout: V.timeout, handler: V.handler }); return r.errors ? r : { msg: "บันทึกแล้ว", next: "lams" }; } });
};
PAGES["lam-env-edit"] = function () {
  var l = slsLam(UI.params.id); if (!l) return h("p", { text: "ไม่พบ function" });
  return formPage({ name: "lam-env-edit-" + l.name, crumb: "Lambda › " + l.name + " › Edit environment variables", title: "Edit environment variables", back: "lams", lead: "ตรงกับ block environment { variables = {...} } · โค้ดอ่านด้วย os.environ[\"TABLE_NAME\"] · แก้แล้วมีผลทันทีกับคำขอถัดไป",
    init: function () { return { table: l.env.TABLE_NAME || "", appenv: l.env.APP_ENV || "" }; },
    sections: function () { return [{ t: "Environment variables", f: [{ id: "table", type: "text", label: "TABLE_NAME", desc: "ชื่อ DynamoDB table ที่โค้ดจะอ่าน/เขียน" }, { id: "appenv", type: "text", label: "APP_ENV" }] }]; },
    submit: "Save", onSubmit: function (V) { var env = {}; if (V.table) env.TABLE_NAME = V.table; if (V.appenv) env.APP_ENV = V.appenv; var r = API.updateLambda(l.name, { env: env }); return r.errors ? r : { msg: "บันทึก environment variables แล้ว", next: "lams" }; } });
};
PAGES["lam-perm-add"] = function () {
  var l = slsLam(UI.params.id); if (!l) return h("p", { text: "ไม่พบ function" });
  return formPage({ name: "lam-perm-add-" + l.name, crumb: "Lambda › " + l.name + " › Add permissions", title: "Add permissions", back: "lams", lead: "ตรงกับ aws_lambda_permission (resource-based policy) · ใครเรียก Lambda ตัวนี้ได้ · ไม่มี = API Gateway เรียกไม่ได้ ตอบ 500",
    init: function () { return { sid: "AllowAPIGatewayInvoke", principal: "apigateway.amazonaws.com", source: "" }; },
    sections: function () { return [{ t: "Policy statement", f: [{ id: "sid", type: "text", label: "Statement ID" }, { id: "principal", type: "select", label: "Principal", opts: function () { return [["apigateway.amazonaws.com", "apigateway.amazonaws.com (API Gateway)"], ["s3.amazonaws.com", "s3.amazonaws.com (S3)"], ["events.amazonaws.com", "events.amazonaws.com (EventBridge)"]]; } }, { id: "source", type: "select", label: "Source ARN", desc: "จำกัดว่า API ตัวไหนเรียกได้ (arn:aws:execute-api:…:API_ID/*/*)", opts: function () { return [["", "ไม่จำกัด (ไม่แนะนำ)"]].concat(S.apis.map(function (a) { return [slsExecArn(a) + "/*/*", a.name + " · " + slsExecArn(a) + "/*/*"]; })); } }, { id: "action", type: "select", label: "Action", opts: function () { return [["lambda:InvokeFunction", "lambda:InvokeFunction"]]; } }] }]; },
    submit: "Save", onSubmit: function (V) { var r = API.addLambdaPermission({ fn: l.name, sid: V.sid, principal: V.principal, sourceArn: V.source }); return r.errors ? r : { msg: "เพิ่ม permission แล้ว: " + V.principal + " เรียก " + l.name + " ได้", next: "lams" }; } });
};
DET.lam = [
  ["code", "Code", function (l) { return h("div", {}, [h("p", { cls: "hint", text: "Code source · app.py (ตัวอย่างโค้ดของแล็บ · ของจริงกด Upload from → .zip file)" }), codePre((LABFILES["labs/03-serverless/src/app.py"] || "# app.py").trim(), "an")]); }],
  ["test", "Test", lamTestTab],
  ["monitor", "Monitor", function (l) {
    var lg = S.lamLogs.filter(function (x) { return x.fn === l.name; })[0];
    return h("div", {}, [kvDom([["Invocations", String(l.inv)], ["Errors", String(l.errs)], ["Error rate", l.inv ? Math.round(100 * l.errs / l.inv) + " %" : "-"], ["Log group", lg ? lg.group : "ยังไม่มี (ยังไม่เคยถูกเรียก หรือ role เขียน log ไม่ได้)"]]), lg ? h("button", { cls: "btn", type: "button", text: "View CloudWatch logs", onclick: function () { UI.sel.lgs = lg.group; UI.lgSel = lg.group + "|" + lg.stream; go("lgs", {}, "CloudWatch"); } }) : h("span")]);
  }],
  ["conf", "Configuration", function (l) {
    var role = roleByRef(l.role), pol = S.lperms.filter(function (p) { return p.fn === l.name; }), trig = [];
    S.apis.forEach(function (a) { a.integrations.forEach(function (i) { if (slsFnName(i.uri) === l.name) trig.push([h("a", { href: "#", cls: "lnk", text: "API Gateway: " + a.name, onclick: function (e) { e.preventDefault(); UI.sel.apis = a.id; go("apis", {}, "API Gateway"); } }), a.routes.filter(function (r) { return r.integ === i.id; }).map(function (r) { return r.key; }).join(", ") || "-"]); }); });
    return h("div", {}, [
      h("h3", { text: "General configuration" }), kvDom([["Memory", l.memory + " MB"], ["Timeout", l.timeout + " sec"], ["Handler", l.handler], ["Runtime", l.runtime]]), h("button", { cls: "btn", type: "button", text: "Edit", onclick: function () { go("lam-edit", { id: l.name, from: "lams" }); } }),
      h("h3", { text: "Permissions" }), kvDom([["Execution role", role ? role.name : l.role + " (ไม่พบ)"], ["Policies on role", role ? role.policies.concat((role.inline || []).map(function (p) { return p.name + " (inline)"; })).join(", ") || "ไม่มี" : "-"]]),
      h("h4", { text: "Resource-based policy statements (" + pol.length + ")" }), tbl(["Statement ID", "Principal", "Conditions (Source ARN)", "Action"], pol.map(function (p) { return [p.sid, p.principal, p.sourceArn || "-", p.action]; }), "ไม่มี · ยังไม่มีใครเรียก function นี้ได้ (API Gateway จะได้ 500)"),
      h("button", { cls: "btn", type: "button", text: "Add permissions", onclick: function () { go("lam-perm-add", { id: l.name, from: "lams" }); } }),
      h("h3", { text: "Environment variables (" + Object.keys(l.env).length + ")" }), tbl(["Key", "Value"], Object.keys(l.env).map(function (k) { return [k, l.env[k]]; }), "ไม่มี"), h("button", { cls: "btn", type: "button", text: "Edit", onclick: function () { go("lam-env-edit", { id: l.name, from: "lams" }); } }),
      h("h3", { text: "Triggers" }), tbl(["Trigger", "Routes"], trig, "ไม่มี trigger")]);
  }],
  ["aliases", "Aliases", null], ["versions", "Versions", null]
];

// ---------- API Gateway ----------
function apiInvokeUrl(a, s) { return "https://" + slsApiHost(a) + (s.name === "$default" ? "" : "/" + s.name); }
LISTS.apis = function () {
  return ({ key: "apis", kind: "api", title: "APIs", crumb: "API Gateway › APIs", create: [{ label: "Create API", page: "api-create" }], actions: [{ label: "Delete", page: "del", kind: "api" }],
    detail: function (a) { return [["Name", a.name], ["API ID", a.id], ["Protocol", a.protocol], ["Endpoint", "https://" + slsApiHost(a)], ["Stages", a.stages.map(function (s) { return s.name; }).join(", ") || "-"], ["Routes", String(a.routes.length)]]; },
    rows: function () { return S.apis; },
    cols: [["Name", function (a) { return a.name; }], ["Description", function () { return "-"; }], ["ID", function (a) { return a.id; }], ["Protocol", function (a) { return a.protocol; }], ["Created", function (a) { return stFmt(a.born); }]] });
};
PAGES["api-create"] = function () {
  return formPage({ name: "api-create", crumb: "API Gateway › APIs › Create API › HTTP API › Build", title: "Create and configure integrations", back: "apis", lead: "ตรงกับ aws_apigatewayv2_api + integration + route + stage · แบบ console ทำให้ทีเดียวและ ==เพิ่ม permission ให้ Lambda ให้เอง== (Terraform ต้องเขียน aws_lambda_permission เอง)",
    init: function () { return { name: "", fn: "", m1: "GET", p1: "/drugs", m2: "POST", p2: "/drugs", stage: "dev" }; },
    sections: function () { var meth = function () { return [["GET", "GET"], ["POST", "POST"], ["PUT", "PUT"], ["DELETE", "DELETE"], ["ANY", "ANY"]]; }; return [
      { t: "Step 1: Create and configure integrations", f: [{ id: "name", type: "text", label: "API name", ph: "pharmacy-api-dev" }, { id: "fn", type: "select", label: "Integration: Lambda function", opts: function () { return lamFnOpts(); } }] },
      { t: "Step 2: Configure routes", f: [{ id: "m1", type: "select", label: "Route 1 · Method", opts: meth }, { id: "p1", type: "text", label: "Route 1 · Resource path", ph: "/drugs" }, { id: "m2", type: "select", label: "Route 2 · Method", opts: function () { return [["", "ไม่ใช้"]].concat(meth()); } }, { id: "p2", type: "text", label: "Route 2 · Resource path", ph: "/drugs" }] },
      { t: "Step 3: Define stages", f: [{ id: "stage", type: "text", label: "Stage name", desc: "ได้ URL https://<api-id>.execute-api.<region>.amazonaws.com/<stage> · ใส่ $default = ไม่มี /stage ต่อท้าย" }] }]; },
    submit: "Create", onSubmit: function (V) {
      var routes = [V.m1 + " " + V.p1]; if (V.m2) routes.push(V.m2 + " " + V.p2); var r = API.createApiQuick({ name: V.name, fn: V.fn, routes: routes, stage: V.stage });
      if (r.errors) return mgErrMap(r, { fn: "fn" }); UI.sel.apis = r.res.id; UI.apiTab = "stages"; return { msg: "สร้าง API " + V.name + " แล้ว · เปิดที่ Browser: " + apiInvokeUrl(r.res, r.res.stages[0]) + (routes[0].split(" ")[1] || ""), next: "apis" };
    } });
};
PAGES["api-route-create"] = function () {
  var a = slsApi(UI.params.id); if (!a) return h("p", { text: "ไม่พบ API" });
  return formPage({ name: "api-route-create-" + a.id, crumb: "API Gateway › " + a.name + " › Routes › Create", title: "Create route", back: "apis", lead: "ตรงกับ aws_apigatewayv2_route · route key = METHOD + path · ต้อง attach integration ไม่งั้นเรียกแล้ว 500",
    init: function () { return { method: "GET", path: "/drugs", integ: a.integrations[0] ? a.integrations[0].id : "" }; },
    sections: function () { return [{ t: "Route details", f: [{ id: "method", type: "select", label: "Method", opts: function () { return [["GET", "GET"], ["POST", "POST"], ["PUT", "PUT"], ["DELETE", "DELETE"], ["ANY", "ANY"]]; } }, { id: "path", type: "text", label: "Resource path", desc: "เช่น /drugs หรือ /drugs/{id} หรือ /{proxy+}" }, { id: "integ", type: "select", label: "Attach integration", opts: function () { return [["", "ไม่ attach"]].concat(a.integrations.map(function (i) { return [i.id, slsFnName(i.uri) + " (" + i.id + ")"]; })); } }] }]; },
    submit: "Create", onSubmit: function (V) { var r = API.addApiRoute(a.id, { key: V.method + " " + V.path, target: V.integ }); return r.errors ? mgErrMap(r, { key: "path" }) : { msg: "สร้าง route " + V.method + " " + V.path + " แล้ว", next: "apis" }; } });
};
PAGES["api-stage-create"] = function () {
  var a = slsApi(UI.params.id); if (!a) return h("p", { text: "ไม่พบ API" });
  return formPage({ name: "api-stage-create-" + a.id, crumb: "API Gateway › " + a.name + " › Stages › Create", title: "Create stage", back: "apis", lead: "ตรงกับ aws_apigatewayv2_stage · 1 stage = 1 URL (dev / prd) · Auto-deploy = แก้ route แล้วใช้ทันที",
    init: function () { return { name: "prd", auto: true }; },
    sections: function () { return [{ t: "Stage details", f: [{ id: "name", type: "text", label: "Stage name" }, { id: "auto", type: "check", text: "Enable automatic deployment" }] }]; },
    submit: "Create", onSubmit: function (V) { var r = API.addApiStage(a.id, { name: V.name, auto: V.auto }); return r.errors ? r : { msg: "สร้าง stage " + V.name + " แล้ว: " + apiInvokeUrl(a, r.res), next: "apis" }; } });
};
DET.api = [
  ["routes", "Routes", function (a) {
    return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Create", onclick: function () { go("api-route-create", { id: a.id, from: "apis" }); } }), tbl(["Route", "Integration", "Lambda function"], a.routes.map(function (r) { var i = a.integrations.filter(function (x) { return x.id === r.integ; })[0]; return [r.key, i ? i.id : tagp("ไม่มี integration", "bad"), i ? slsFnName(i.uri) : "-"]; }), "ยังไม่มี route (เรียกอะไรก็ได้ 404)")]);
  }],
  ["integ", "Integrations", function (a) { return tbl(["Integration ID", "Type", "Target", "Payload format"], a.integrations.map(function (i) { return [i.id, "Lambda (AWS_PROXY)", slsFnName(i.uri), i.payload]; }), "ไม่มี integration"); }],
  ["stages", "Stages", function (a) {
    return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Create", onclick: function () { go("api-stage-create", { id: a.id, from: "apis" }); } }), tbl(["Stage", "Invoke URL", "Auto-deploy"], a.stages.map(function (s) { return [s.name, apiInvokeUrl(a, s), s.auto ? "Enabled" : "Disabled"]; }), "ไม่มี stage (เรียกอะไรก็ได้ 404)"), h("p", { cls: "hint", text: "ก๊อป URL ไปเปิดที่แท็บ Browser (เติม path เช่น /drugs ต่อท้าย)" })]);
  }],
  ["auth", "Authorization", null], ["cors", "CORS", null], ["log", "Monitoring", null]
];

// ---------- DynamoDB ----------
LISTS.ddb = function () {
  return ({ key: "ddb", kind: "ddb", title: "Tables", crumb: "DynamoDB › Tables", create: [{ label: "Create table", page: "ddb-create" }], actions: [{ label: "Delete", page: "del", kind: "ddb" }],
    detail: function (t) { return [["Table name", t.name], ["ARN", t.arn], ["Status", okIco("Active")], ["Partition key", t.key + " (" + (t.keyType === "N" ? "Number" : "String") + ")"], ["Capacity mode", t.billing === "PAY_PER_REQUEST" ? "On-demand" : "Provisioned"], ["Point-in-time recovery", t.pitr ? "On" : "Off"], ["Item count", String(t.items.length)]]; },
    rows: function () { return S.ddb; },
    cols: [["Name", function (t) { return t.name; }], ["Status", function () { return okIco("Active"); }], ["Partition key", function (t) { return t.key + " (" + t.keyType + ")"; }], ["Sort key", function () { return "-"; }], ["Indexes", function () { return "0"; }], ["Capacity mode", function (t) { return t.billing === "PAY_PER_REQUEST" ? "On-demand" : "Provisioned"; }], ["Item count", function (t) { return String(t.items.length); }]] });
};
PAGES["ddb-create"] = function () {
  return formPage({ name: "ddb-create", crumb: "DynamoDB › Tables › Create table", title: "Create table", back: "ddb", lead: "ตรงกับ aws_dynamodb_table · NoSQL: ไม่ต้องกำหนด column ล่วงหน้า กำหนดแค่ key · On-demand = จ่ายตามคำขอ ไม่ต้องเดา capacity",
    init: function () { return { name: "", key: "id", keyType: "S", billing: "PAY_PER_REQUEST", pitr: false }; },
    sections: function () { return [{ t: "Table details", f: [{ id: "name", type: "text", label: "Table name", ph: "pharmacy-drugs-dev" }, { id: "key", type: "text", label: "Partition key" }, { id: "keyType", type: "select", label: "Partition key type", opts: function () { return [["S", "String"], ["N", "Number"]]; } }] }, { t: "Table settings", f: [{ id: "billing", type: "radio", label: "Capacity mode", opts: function () { return [["PAY_PER_REQUEST", "On-demand (แนะนำ)"], ["PROVISIONED", "Provisioned (กำหนด RCU/WCU เอง)"]]; } }, { id: "pitr", type: "check", text: "Turn on point-in-time recovery (กู้ย้อนหลังได้ 35 วัน · prd ควรเปิด)" }] }]; },
    submit: "Create table", onSubmit: function (V) { var r = API.createDdbTable({ name: V.name, key: V.key, keyType: V.keyType, billing: V.billing, pitr: V.pitr }); if (r.errors) return r; UI.sel.ddb = r.res.id; return { msg: "สร้าง table " + V.name + " แล้ว (Active)", next: "ddb" }; } });
};
PAGES["ddb-item-create"] = function () {
  var t = slsTbl(UI.params.id); if (!t) return h("p", { text: "ไม่พบ table" });
  return formPage({ name: "ddb-item-create", crumb: "DynamoDB › " + t.name + " › Create item", title: "Create item", back: "ddb", lead: "ตรงกับ aws dynamodb put-item · ต้องมี partition key (" + t.key + ") · attribute อื่นเพิ่มได้เสรี",
    init: function () { return { id: "", name: "", stock: "", price: "" }; },
    sections: function () { return [{ t: "Attributes", f: [{ id: "id", type: "text", label: t.key + " (partition key)" }, { id: "name", type: "text", label: "name" }, { id: "stock", type: "text", label: "stock (Number)" }, { id: "price", type: "text", label: "price (Number)" }] }]; },
    submit: "Create item", onSubmit: function (V) { var it = {}; it[t.key] = V.id; if (V.name) it.name = V.name; if (V.stock !== "") it.stock = +V.stock; if (V.price !== "") it.price = +V.price; var r = API.putItem(t.name, it); return r.errors ? mgErrMap(r, { item: "id" }) : { msg: "เพิ่ม item แล้ว", next: "ddb" }; } });
};
function ddbItemsView(t) {
  var cols = []; t.items.forEach(function (it) { Object.keys(it).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); }); cols = [t.key].concat(cols.filter(function (k) { return k !== t.key; }));
  return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Create item", onclick: function () { go("ddb-item-create", { id: t.name, from: "ddb" }); } }), h("p", { cls: "hint", text: "Scan: ผลลัพธ์ " + t.items.length + " items (ของจริงมี Query ด้วย key เร็วกว่า Scan)" }), tbl(cols, t.items.map(function (it) { return cols.map(function (k) { return it[k] === undefined ? "-" : String(it[k]); }); }), "ไม่มี item · table ว่าง (Lambda GET จะได้ count 0)")]);
}
DET.ddb = [
  ["items", "Items", ddbItemsView],
  ["overview", "Overview", function (t) { return kvDom([["Partition key", t.key + " (" + t.keyType + ")"], ["Capacity mode", t.billing], ["Table ARN", t.arn], ["Item count", String(t.items.length)]]); }],
  ["backups", "Backups", function (t) { return h("div", {}, [kvDom([["Point-in-time recovery (PITR)", t.pitr ? "On (กู้ย้อนหลังได้ 35 วัน)" : "Off"]]), h("button", { cls: "btn", type: "button", text: t.pitr ? "Turn off PITR" : "Turn on PITR", onclick: function () { t.pitr = !t.pitr; flash("ok", "PITR " + (t.pitr ? "เปิด" : "ปิด") + "แล้ว"); render(); } })]); }],
  ["monitor", "Monitor", null], ["indexes", "Indexes", null], ["capacity", "Additional settings", null]
];
PAGES["ddb-items"] = function () {
  var t = slsSel(S.ddb, "ddb") || S.ddb[0], w = h("div");
  w.appendChild(crumbEl("DynamoDB › Explore items")); w.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: "Explore items" })]));
  if (!S.ddb.length) { w.appendChild(h("p", { cls: "hint", text: "ยังไม่มี table · สร้างที่ Tables › Create table" })); return w; }
  w.appendChild(h("div", { cls: "card" }, [h("div", { cls: "cb" }, [h("label", { cls: "l", text: "Table" }), h("select", { onchange: function (e) { UI.sel.ddb = e.target.value; render(); } }, S.ddb.map(function (x) { return h("option", { value: x.id, selected: x === t, text: x.name }); })), ddbItemsView(t)])]));
  return w;
};
["lams", "apis", "ddb", "layers", "adoms", "alarms"].forEach(function (k) { PAGES[k] = function () { return listPage(LISTS[k]()); }; });

// ---------- Browser: ตอบจาก API Gateway ----------
function wbApigw(r) {
  var x = r.res, st = x.status, col = st < 300 ? "#1d8102" : st < 500 ? "#a85a00" : "#c62828", rs = { 200: "OK", 201: "Created", 400: "Bad Request", 404: "Not Found", 500: "Internal Server Error" }[st] || "";
  return h("div", { cls: "card" }, [h("div", { cls: "cb" }, [
    h("div", { style: "font-weight:800;color:" + col, text: "HTTP/2 " + st + " " + rs }), h("div", { cls: "hint", text: "GET " + r.host + r.path + (x.fn ? " → Lambda " + x.fn + (x.cold === undefined ? " (ไม่ได้ถูกเรียก)" : x.cold ? " (cold start)" : " (warm)") : "") }),
    codePre(JSON.stringify(x.body, null, 2), "an"),
    h("h4", { text: "ขั้นที่ API Gateway ทำกับคำขอนี้" }), mgSteps(x.steps),
    h("p", { cls: "hint", text: st === 200 ? "กด Go ซ้ำได้ · ดู log ของ Lambda ที่ CloudWatch › Log groups › /aws/lambda/…" : "500 จาก API Gateway ไม่บอกสาเหตุ: ไล่ตามขั้นที่ ✗ แล้วดู log ของ Lambda (ถ้ามี) · 404 = stage/route ไม่ตรง" })])]);
}

// ---------- Lambda › Test ----------
var LAM_TEST_TPL = { get: JSON.stringify({ version: "2.0", routeKey: "GET /drugs", rawPath: "/drugs", requestContext: { http: { method: "GET", path: "/drugs" } }, body: "" }, null, 2), post: JSON.stringify({ version: "2.0", routeKey: "POST /drugs", rawPath: "/drugs", requestContext: { http: { method: "POST", path: "/drugs" } }, body: "{\"name\":\"Aspirin 100mg\",\"stock\":30}" }, null, 2), empty: "{}" };
function lamTestTab(l) {
  UI.lamTest = UI.lamTest || {}; var T = UI.lamTest; if (T.fn !== l.name) { T.fn = l.name; T.ev = LAM_TEST_TPL.get; T.res = null; T.tpl = "get"; }
  var ta = h("textarea", { rows: 12, style: "width:100%;font-family:ui-monospace,monospace;font-size:.85rem", "aria-label": "Event JSON", oninput: function (e) { T.ev = e.target.value; } }); ta.value = T.ev;
  var w = h("div", {}, [h("h3", { text: "Test event" }), h("p", { cls: "hint", text: "ยิง function ตรง ๆ ไม่ผ่าน API Gateway (event รูปแบบ HTTP API payload v2.0) · เทียบ CLI: aws lambda invoke --function-name " + l.name + " --payload '{…}' out.json" }),
    h("div", { cls: "f" }, [h("label", { cls: "l", text: "Template (Event name)" }), h("select", { onchange: function (e) { T.tpl = e.target.value; T.ev = LAM_TEST_TPL[e.target.value]; render(); } }, [["get", "apigateway-http-api · GET /drugs"], ["post", "apigateway-http-api · POST /drugs"], ["empty", "hello-world · {}"]].map(function (o) { return h("option", { value: o[0], selected: T.tpl === o[0], text: o[1] }); }))]), ta,
    h("button", { cls: "btn pri", type: "button", text: "Test", onclick: function () { T.res = slsInvokeDirect(l.name, T.ev); render(); } })]);
  var r = T.res; if (!r) return w;
  if (r.fnErr) { w.appendChild(h("div", { cls: "alert bad", text: r.fnErr })); return w; }
  var ex = r.ex, col = r.failed ? "#c62828" : "#1d8102";
  w.appendChild(h("div", { cls: "alert " + (r.failed ? "bad" : "ok"), style: "margin-top:12px" }, [h("b", { text: "Execution result: " + (r.failed ? "failed" : "succeeded") }), h("span", { text: r.failed ? " · error จาก handler (ไม่ใช่ error ของ API Gateway)" : "" })]));
  w.appendChild(h("h4", { text: "Response" })); w.appendChild(codePre(JSON.stringify(r.payload, null, 2), "an"));
  w.appendChild(h("h4", { text: "Function logs" })); w.appendChild(codePre(ex.lines.join("\n"), "an"));
  w.appendChild(kvDom([["Request ID", ex.rid], ["Duration", ex.dur + ".12 ms"], ["Billed duration", (ex.dur + 1) + " ms"], ["Resources configured", l.memory + " MB"], ["Init duration", ex.cold ? ex.ini + ".30 ms (cold start)" : "- (warm)"]]));
  void col; return w;
}

// ---------- หน้าว่างแบบ console จริง (บริการนี้ไม่มีอะไรให้ดูใน lab) ----------
function emptyPage(crumb, title, what, msg, btn) {
  return function () { return h("div", {}, [crumbEl(crumb), h("div", { cls: "card" }, [h("div", { cls: "ch" }, [h("b", { text: title + " (0)" }), h("span", { cls: "sp" })]), h("div", { cls: "cb", style: "text-align:center;padding:28px 12px" }, [h("div", { style: "font-weight:700", text: "No " + what }), h("p", { cls: "hint", text: msg }), btn ? h("button", { cls: "btn", type: "button", text: btn, onclick: function () { flash("info", "หน้านี้ใน lab ไม่มีข้อมูลให้จำลองต่อ (จำลองเฉพาะหน้าจอและสถานะว่าง) · ดูรายละเอียดในเอกสาร AWS"); render(); } }) : h("span")])])]); };
}
PAGES["lam-apps"] = emptyPage("Lambda › Applications", "Applications", "applications", "Application = ชุด Lambda + resource ที่ปล่อยด้วย AWS SAM / CloudFormation เป็นก้อนเดียว (lab นี้ใช้ Terraform แทน)", "Create application");
PAGES["lam-csc"] = emptyPage("Lambda › Code signing configurations", "Code signing configurations", "code signing configurations", "บังคับให้ deploy ได้เฉพาะ zip ที่เซ็นด้วย AWS Signer", "Create configuration");
PAGES["lam-cp"] = emptyPage("Lambda › Capacity providers", "Capacity providers", "capacity providers", "กำหนดชนิดเครื่องที่ใช้รัน Lambda (ต่อยอดจาก Lambda managed instances)", "Create capacity provider");
PAGES["vlinks"] = emptyPage("API Gateway › VPC links", "VPC links", "VPC links", "ให้ API เรียกบริการใน VPC (เช่น ALB/ECS ภายใน) โดยไม่ผ่านอินเทอร์เน็ต", "Create");
PAGES["ddb-exports"] = emptyPage("DynamoDB › Exports to S3", "Exports to S3", "exports", "ส่งข้อมูลทั้ง table (หรือ ณ จุดเวลา PITR) ไป S3 โดยไม่กิน capacity", "Export to S3");
PAGES["ddb-settings"] = emptyPage("DynamoDB › Settings", "Settings", "settings changes", "ตั้งค่าระดับ account/region ของ DynamoDB เช่น default capacity mode", "");
PAGES["ecs-ns"] = emptyPage("Amazon ECS › Namespaces", "Namespaces", "namespaces", "Namespace (AWS Cloud Map) ให้ service ใน cluster เรียกกันด้วยชื่อ (Service Connect)", "Create namespace");
PAGES["ecs-acct"] = emptyPage("Amazon ECS › Account settings", "Account settings", "settings changes", "เช่น awsvpc trunking, container instance long ARN format · Fargate ไม่ต้องตั้ง", "");
PAGES["cw-dash"] = emptyPage("CloudWatch › Dashboards", "Custom dashboards", "dashboards", "หน้ารวมกราฟของ metric/log ที่เลือกเอง (ดูตัวเลขจริงที่ All metrics)", "Create dashboard");
PAGES["cw-ai"] = emptyPage("CloudWatch › AI Operations", "AI Operations", "investigations", "ให้ AI ช่วยไล่หาสาเหตุจาก metric/log/trace (ไม่จำลอง)", "");
PAGES["cw-anom"] = emptyPage("CloudWatch › Log Anomalies", "Log anomaly detectors", "anomaly detectors", "ตรวจรูปแบบ log ผิดปกติอัตโนมัติ (ต้องเปิดต่อ log group)", "Configure anomaly detector");
PAGES["cw-apps"] = emptyPage("CloudWatch › Application Signals › Services", "Services", "services", "ภาพรวมสุขภาพของ service ที่ instrument ด้วย Application Signals (ไม่จำลอง)", "Enable Application Signals");

// ---------- Lambda › Layers ----------
LISTS.layers = function () {
  return ({ key: "layers", kind: "layer", title: "Layers", crumb: "Lambda › Layers", create: [{ label: "Create layer", page: "layer-create" }], actions: [{ label: "Delete", page: "del", kind: "layer" }],
    detail: function (x) { var v = x.versions[x.versions.length - 1]; return [["Layer name", x.name], ["Latest version", String(v.v)], ["ARN", v.arn], ["Compatible runtimes", v.runtimes.join(", ")], ["Description", v.desc || "-"]]; },
    rows: function () { return S.layers; },
    cols: [["Layer name", function (x) { return x.name; }], ["Latest version", function (x) { return String(x.versions.length); }], ["Compatible runtimes", function (x) { return x.versions[x.versions.length - 1].runtimes.join(", "); }], ["Created", function (x) { return stFmt(x.born); }]] });
};
PAGES["layer-create"] = function () {
  return formPage({ name: "layer-create", crumb: "Lambda › Layers › Create layer", title: "Create layer", back: "layers", lead: "Layer = zip ของ library/ไฟล์ที่ใช้ร่วมกันหลาย function (ตรงกับ aws_lambda_layer_version) · ต้องมีไฟล์ zip ก่อน: เปิดเทอร์มินัล Laptop แล้ว zip layer.zip app.py",
    init: function () { return { name: "", desc: "", file: "", runtimes: ["python3.12"] }; },
    sections: function () { return [{ t: "Layer configuration", f: [{ id: "name", type: "text", label: "Name" }, { id: "desc", type: "text", label: "Description - optional" }, { id: "file", type: "text", label: "Upload a .zip file (path บน laptop)", desc: "ไฟล์ว่าง/ไม่ใช่ zip = InvalidParameterValueException: Uploaded file must be a non-empty zip" }, { id: "runtimes", type: "multi", label: "Compatible runtimes", opts: function () { return LAM_RUNTIMES.map(function (r) { return [r, r]; }); } }] }]; },
    submit: "Create", onSubmit: function (V) { var r = API.createLayer({ name: V.name, desc: V.desc, file: V.file, runtimes: V.runtimes }); if (r.errors) return r; UI.sel.layers = r.res.id; return { msg: "สร้าง layer " + V.name + " version " + r.res.versions.length + " แล้ว", next: "layers" }; } });
};
DET.layer = [["ver", "Versions", function (x) { return tbl(["Version", "ARN", "Runtimes", "Created"], x.versions.map(function (v) { return [String(v.v), v.arn, v.runtimes.join(", "), stFmt(v.born)]; }), "ไม่มี"); }], ["info", "Details", det("layer")]];

// ---------- API Gateway › Custom domain names ----------
LISTS.adoms = function () {
  return ({ key: "adoms", kind: "adom", title: "Custom domain names", crumb: "API Gateway › Custom domain names", create: [{ label: "Create", page: "adom-create" }], actions: [{ label: "Delete", page: "del", kind: "adom" }],
    detail: function (d) { return [["Domain name", d.name], ["Endpoint type", d.type], ["API Gateway domain name (ชี้ DNS มาที่นี่)", d.target], ["ACM certificate", d.cert], ["สิ่งที่ต้องทำต่อ", "Route 53 › สร้าง record A (alias) " + d.name + " → " + d.target + " · แล้วสร้าง API mapping ผูก API + stage"]]; },
    rows: function () { return S.adoms; }, cols: [["Domain name", function (d) { return d.name; }], ["Endpoint type", function (d) { return d.type; }], ["API Gateway domain name", function (d) { return d.target; }], ["Status", function () { return okIco("Available"); }]] });
};
PAGES["adom-create"] = function () {
  return formPage({ name: "adom-create", crumb: "API Gateway › Custom domain names › Create", title: "Create domain name", back: "adoms", lead: "ใช้ชื่อโดเมนของเราแทน https://<id>.execute-api… · ต้องมีใบรับรอง ACM ที่ Issued (REGIONAL = ใน region เดียวกับ API · EDGE = us-east-1)",
    init: function () { return { name: "", cert: "", type: "REGIONAL" }; },
    sections: function () { return [{ t: "Domain details", f: [{ id: "name", type: "text", label: "Domain name" }, { id: "type", type: "radio", label: "Endpoint type", opts: function () { return [["REGIONAL", "Regional"], ["EDGE", "Edge-optimized"]]; } }, { id: "cert", type: "select", label: "ACM certificate", opts: function () { return [["", "เลือกใบรับรอง"]].concat(S.certs.map(function (c) { return [c.arn, c.names.join(", ") + " · " + acmStatus(c)]; })); } }] }]; },
    submit: "Add domain name", onSubmit: function (V) { var r = API.createApiDomain({ name: V.name, cert: V.cert, type: V.type }); return r.errors ? r : { msg: "เพิ่ม domain " + V.name + " แล้ว · ต่อไปสร้าง record ใน Route 53 ชี้ไป " + r.res.target, next: "adoms" }; } });
};

// ---------- DynamoDB: PartiQL editor / Backups ----------
PAGES["ddb-partiql"] = function () {
  UI.pq = UI.pq || { sql: "SELECT * FROM \"" + ((S.ddb[0] || {}).name || "table") + "\"", res: null };
  var w = formPage({ name: "ddb-partiql", crumb: "DynamoDB › PartiQL editor", title: "PartiQL editor", back: "ddb", lead: "เขียน SQL-like กับ DynamoDB: SELECT / INSERT / UPDATE / DELETE (เทียบ CLI: aws dynamodb execute-statement --statement \"…\")",
    init: function () { return { sql: UI.pq.sql }; }, sections: function () { return [{ t: "Statement", f: [{ id: "sql", type: "area", label: "Query" }] }]; },
    submit: "Run", onSubmit: function (V) { UI.pq.sql = V.sql; UI.pq.res = slsPartiql(V.sql); return { msg: "รัน statement แล้ว", next: "ddb-partiql" }; } });
  var r = UI.pq.res; if (!r) return w;
  if (r.err) { w.appendChild(h("div", { cls: "alert bad", text: r.err })); return w; }
  var cols = []; (r.rows || []).forEach(function (it) { Object.keys(it).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
  w.appendChild(h("div", { cls: "card", style: "margin-top:12px" }, [h("div", { cls: "ch", text: r.msg }), h("div", { cls: "cb" }, [cols.length ? tbl(cols, r.rows.map(function (it) { return cols.map(function (k) { return it[k] === undefined ? "-" : String(it[k]); }); }), "") : h("p", { cls: "hint", text: "ไม่มี item ที่ตรง" })])])); return w;
};
PAGES["ddb-backups"] = function () {
  return h("div", {}, [crumbEl("DynamoDB › Backups"), h("div", { cls: "card" }, [h("div", { cls: "ch", text: "Point-in-time recovery (PITR)" }), h("div", { cls: "cb" }, [tbl(["Table", "PITR", "Earliest restore time", ""], S.ddb.map(function (t) { return [t.name, t.pitr ? okIco("On") : tagp("Off", "warn"), t.pitr ? stFmt(t.born) : "-", h("button", { cls: "btn", type: "button", text: t.pitr ? "Turn off" : "Turn on", onclick: function () { t.pitr = !t.pitr; flash("ok", "PITR " + (t.pitr ? "เปิด" : "ปิด") + "แล้ว: " + t.name); render(); } })]; }), "ไม่มี table"), h("p", { cls: "hint", text: "PITR กู้ table ย้อนหลังได้ถึง 35 วัน (กู้ = สร้าง table ใหม่) · prd ควรเปิด · On-demand backup (snapshot ตามสั่ง) ไม่ได้จำลอง" })])])]);
};

// ---------- CloudWatch: alarms / Live Tail / Logs Insights / All metrics ----------
LISTS.alarms = function () {
  return ({ key: "alarms", kind: "alarm", title: "Alarms", crumb: "CloudWatch › Alarms › All alarms", create: [{ label: "Create alarm", page: "alarm-create" }], actions: [{ label: "Delete", page: "del", kind: "alarm" }],
    detail: function (a) { var p = a.metric.split("|"); return [["Alarm name", a.name], ["State", slsAlarmState(a)], ["Metric", p[0] + " · " + p[1] + " · " + p[2]], ["Condition", p[1] + " " + a.op + " " + a.threshold + " (Sum, 5 minutes)"]]; },
    rows: function () { return S.alarms; }, cols: [["Name", function (a) { return a.name; }], ["State", function (a) { var s = slsAlarmState(a); return s === "ALARM" ? tagp("In alarm", "bad") : s === "OK" ? okIco("OK") : tagp("Insufficient data", "warn"); }], ["Conditions", function (a) { return a.metric.split("|")[1] + " " + a.op + " " + a.threshold; }]] });
};
PAGES["alarm-create"] = function () {
  return formPage({ name: "alarm-create", crumb: "CloudWatch › Alarms › Create alarm", title: "Create alarm", back: "alarms", lead: "เฝ้า metric แล้วเปลี่ยนสถานะ OK ↔ ALARM (ของจริงต่อ SNS ส่งแจ้งเตือนได้) · ใน lab นับตัวเลขสะสมตั้งแต่เริ่ม lab",
    init: function () { return { name: "", metric: "", op: ">=", threshold: "1" }; },
    sections: function () { return [{ t: "Metric and conditions", f: [{ id: "metric", type: "select", label: "Select metric", opts: function () { return [["", "เลือก metric"]].concat(slsMetrics().map(function (m) { return [m[0] + "|" + m[1] + "|" + m[2], m[0] + " · " + m[1] + " · " + m[2] + "  (ตอนนี้ " + m[3] + ")"]; })); } }, { id: "op", type: "select", label: "Whenever the metric is…", opts: function () { return [[">=", "Greater/Equal (>=)"], [">", "Greater (>)"], ["<", "Lower (<)"]]; } }, { id: "threshold", type: "text", label: "than… (threshold)" }, { id: "name", type: "text", label: "Alarm name" }] }]; },
    submit: "Create alarm", onSubmit: function (V) { var r = API.createAlarm({ name: V.name, metric: V.metric, op: V.op, threshold: V.threshold }); return r.errors ? r : { msg: "สร้าง alarm " + V.name + " แล้ว (สถานะ " + slsAlarmState(r.res) + ")", next: "alarms" }; } });
};
PAGES["cw-live"] = function () {
  UI.live = UI.live || { group: "", filter: "", res: null };
  var w = formPage({ name: "cw-live", crumb: "CloudWatch › Logs › Live Tail", title: "Live Tail", back: "lgs", lead: "ดู log ที่เพิ่งเข้ามาแบบสด (เทียบ CLI: aws logs tail <group> --follow)",
    init: function () { return { group: UI.live.group, filter: UI.live.filter }; }, sections: function () { return [{ t: "Filter", f: [{ id: "group", type: "select", label: "Log group", opts: function () { return [["", "เลือก log group"]].concat(S.lgs.map(function (g) { return [g.name, g.name]; })); } }, { id: "filter", type: "text", label: "Filter pattern - optional" }] }]; },
    submit: "Start", onSubmit: function (V) { if (!V.group) return { errors: { group: "ต้องเลือก log group" } }; UI.live.group = V.group; UI.live.filter = V.filter; var r = slsInsights(V.group, V.filter ? "filter @message like /" + V.filter + "/" : "limit 200"); UI.live.res = r; return { msg: "เริ่ม Live Tail แล้ว", next: "cw-live" }; } });
  var r = UI.live.res; if (r) w.appendChild(h("div", { cls: "card", style: "margin-top:12px" }, [h("div", { cls: "ch", text: UI.live.group + " · " + (r.rows || []).length + " events" }), h("div", { cls: "cb" }, [(r.rows || []).length ? codePre(r.rows.map(function (x) { return x["@message"]; }).join("\n"), "an") : h("p", { cls: "hint", text: "ยังไม่มี event (function ยังไม่ถูกเรียก หรือ role เขียน log ไม่ได้ หรือ filter ไม่ตรง)" })])]));
  return w;
};
PAGES["cw-insights"] = function () {
  UI.ins = UI.ins || { group: "", q: "fields @timestamp, @message | sort @timestamp desc | limit 20", res: null };
  var w = formPage({ name: "cw-insights", crumb: "CloudWatch › Logs Insights", title: "Logs Insights", back: "lgs", lead: "ค้น log ด้วยภาษา query (รองรับแบบย่อ: fields, filter @message like /…/, sort, limit, stats count(*))",
    init: function () { return { group: UI.ins.group, q: UI.ins.q }; }, sections: function () { return [{ t: "Query", f: [{ id: "group", type: "select", label: "Select log group(s)", opts: function () { return [["", "เลือก log group"]].concat(S.lgs.map(function (g) { return [g.name, g.name]; })); } }, { id: "q", type: "area", label: "Query" }] }]; },
    submit: "Run query", onSubmit: function (V) { if (!V.group) return { errors: { group: "ต้องเลือก log group" } }; UI.ins.group = V.group; UI.ins.q = V.q; UI.ins.res = slsInsights(V.group, V.q); return { msg: "รัน query แล้ว", next: "cw-insights" }; } });
  var r = UI.ins.res; if (!r) return w;
  if (r.err) { w.appendChild(h("div", { cls: "alert bad", text: r.err })); return w; }
  var cols = []; r.rows.forEach(function (x) { Object.keys(x).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
  w.appendChild(h("div", { cls: "card", style: "margin-top:12px" }, [h("div", { cls: "ch", text: "Logs · " + r.rows.length + " records matched" }), h("div", { cls: "cb" }, [tbl(cols, r.rows.map(function (x) { return cols.map(function (k) { return String(x[k]); }); }), "No data")])])); return w;
};
PAGES["cw-metrics"] = function () {
  var m = slsMetrics(), ns = []; m.forEach(function (x) { if (ns.indexOf(x[0]) < 0) ns.push(x[0]); });
  return h("div", {}, [crumbEl("CloudWatch › Metrics › All metrics"), h("div", { cls: "card" }, [h("div", { cls: "ch", text: "Browse (" + m.length + " metrics จาก lab นี้)" }), h("div", { cls: "cb" }, [h("p", { cls: "hint", text: "ตัวเลข = ผลรวมสะสมตั้งแต่เริ่ม lab (ของจริงเป็นกราฟตามเวลา)" }), tbl(["Namespace", "Metric name", "Dimensions", "Sum"], m.map(function (x) { return [x[0], x[1], x[2], String(x[3])]; }), "ยังไม่มี metric · สร้าง Lambda / API / ECS service แล้วลองเรียกใช้")])])]);
};
