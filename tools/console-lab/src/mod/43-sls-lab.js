// ===== Use case 3 (Serverless API): สร้าง lab ผ่าน API เหมือนกดใน console, ตัวตรวจ, ลบ, HCL, คำสั่ง aws / curl =====
var SLS_ENVS = { dev: { memory: 128, pitr: false, logDays: 7 }, prd: { memory: 256, pitr: true, logDays: 30 } };
var SLS_SEED = { dev: [["1", "Paracetamol 500mg", 120, 2.5], ["2", "Amoxicillin 250mg", 60, 8], ["3", "Vitamin C 1000mg", 200, 5]], prd: [["1", "Paracetamol 500mg", 480, 2.5], ["2", "Amoxicillin 250mg", 150, 8]] };
function slsRoleName(e) { return "pharmacy-api-" + e + "-lambda"; }
function slsDdbDoc(e, tbl) { return { Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: ["dynamodb:Scan", "dynamodb:GetItem", "dynamodb:PutItem"], Resource: [slsTblArn(tbl || "pharmacy-drugs-" + e)] }] }; }

function buildSls(kind) {
  fresh();
  function ok(r) { if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.res; }
  if (!S.laptop.creds) { var tu = API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, tk = API.createAccessKey(tu.id, "CLI", ""); S.laptop.creds = { id: tk.res.id, secretHash: hash32(tk.secret), region: "ap-southeast-1" }; S.laptop.awsRegion = "ap-southeast-1"; }
  Object.keys(SLS_ENVS).forEach(function (e) {
    var E2 = SLS_ENVS[e], bad = e === "prd", rn = slsRoleName(e), tn = "pharmacy-drugs-" + e, fnN = "pharmacy-api-" + e;
    var role = ok(API.createRole({ name: rn, entity: "AWS service", usecase: "Lambda", policies: ["AWSLambdaBasicExecutionRole"] }));
    if (!(bad && kind === "sls-perm")) role.inline = [{ name: "ddb-access", doc: slsDdbDoc(e) }];
    ok(API.createDdbTable({ name: tn, key: "id", keyType: "S", billing: "PAY_PER_REQUEST", pitr: E2.pitr }));
    SLS_SEED[e].forEach(function (x) { ok(API.putItem(tn, { id: x[0], name: x[1], stock: x[2], price: x[3] })); });
    ok(API.createLogGroup({ name: "/aws/lambda/" + fnN, retention: E2.logDays }));
    if (kind === "sls-base") return;
    ok(API.createLambda({ name: fnN, runtime: "python3.12", handler: "app.handler", role: rn, memory: E2.memory, timeout: 10, env: { TABLE_NAME: bad && kind === "sls-table" ? "pharmacy-drug-prd" : tn, APP_ENV: e } }));
    var a = ok(API.createApi({ name: fnN, protocol: "HTTP" })), ig = ok(API.addApiIntegration(a.id, { uri: slsInvokeArn(fnN), payload: "2.0" }));
    ["GET /drugs", "POST /drugs"].forEach(function (k) { ok(API.addApiRoute(a.id, { key: bad && kind === "sls-route" && k === "GET /drugs" ? "GET /drug" : k, target: ig.id })); });
    ok(API.addApiStage(a.id, { name: e, auto: true }));
    if (!(bad && kind === "sls-invoke")) ok(API.addLambdaPermission({ fn: fnN, sid: "AllowAPIGatewayInvoke", principal: "apigateway.amazonaws.com", sourceArn: slsExecArn(a) + "/*/*" }));
  });
  S.slsKind = kind;
}

function checksSls() {
  var out = []; function add(ok, label, hint) { out.push({ ok: !!ok, label: label, hint: hint || "" }); }
  ["dev", "prd"].forEach(function (e) {
    var E2 = SLS_ENVS[e], tn = "pharmacy-drugs-" + e, t = slsTbl(tn), fn = slsLam("pharmacy-api-" + e), role = roleByRef(slsRoleName(e)), api = S.apis.filter(function (a) { return a.name === "pharmacy-api-" + e; })[0];
    add(t && t.key === "id" && t.billing === "PAY_PER_REQUEST" && t.pitr === E2.pitr, e + ": DynamoDB " + tn + " (PAY_PER_REQUEST" + (E2.pitr ? " + point-in-time recovery" : "") + ")", "DynamoDB → Tables → Create table");
    add(role && roleTrusts(role, "lambda.amazonaws.com") && slsHasLogs(role), e + ": role เชื่อใจ lambda.amazonaws.com + AWSLambdaBasicExecutionRole (เขียน log)", "IAM → Create role → Lambda");
    add(t && slsCan(role, "dynamodb:Scan", t.arn) && slsCan(role, "dynamodb:PutItem", t.arn), e + ": role มีสิทธิ์ Scan/PutItem บน table ของ env นี้", "IAM → role → Add permissions → Create inline policy (dynamodb:Scan, PutItem บน table นี้)");
    add(fn && fn.runtime === "python3.12" && fn.memory === E2.memory && fn.env.TABLE_NAME === tn && fn.env.APP_ENV === e, e + ": Lambda python3.12 " + E2.memory + " MB · TABLE_NAME=" + tn, "Lambda → Create function (Configuration → Environment variables)");
    add(S.lgs.some(function (g) { return g.name === "/aws/lambda/pharmacy-api-" + e && g.retention === E2.logDays; }), e + ": log group /aws/lambda/pharmacy-api-" + e + " เก็บ " + E2.logDays + " วัน", "CloudWatch → Log groups → Create / Edit retention");
    add(api && api.protocol === "HTTP" && api.stages.some(function (s) { return s.name === e; }), e + ": HTTP API + stage '" + e + "'", "API Gateway → Create API → HTTP API → Stages");
    add(api && ["GET /drugs", "POST /drugs"].every(function (k) { return api.routes.some(function (r) { return r.key === k && api.integrations.some(function (i) { return i.id === r.integ && slsFnName(i.uri) === "pharmacy-api-" + e; }); }); }), e + ": route GET /drugs + POST /drugs → Lambda", "API Gateway → Routes → Create (แล้ว Attach integration)");
    add(api && fn && S.lperms.some(function (p) { return p.fn === fn.name && p.principal === "apigateway.amazonaws.com" && p.sourceArn.indexOf(api.id) >= 0; }), e + ": Lambda อนุญาต API Gateway เรียก (resource-based policy)", "Lambda → Configuration → Permissions → Resource-based policy → Add permission");
    var r = api && slsInvoke(slsApiHost(api), "/" + e + "/drugs", "GET", ""); add(r && r.status === 200 && r.body.count === SLS_SEED[e].length, e + ": GET /drugs ผ่าน API ได้ " + SLS_SEED[e].length + " รายการจาก DynamoDB", "Browser: เปิด URL ของ API (ดูขั้นตอนที่ ✗)");
  });
  return out;
}

// ---------- ลบจาก console ----------
function slsDelPlan(kind, id, P) {
  if (kind === "lam") { var l = slsLam(id); if (!l) return false; P.title = "Delete function " + l.name; P.crumb = "Lambda › Functions › Delete"; P.word = "confirm"; P.done = "ลบ function แล้ว (API ที่ชี้มาจะตอบ 500)"; S.apis.forEach(function (a) { if (a.integrations.some(function (i) { return slsFnName(i.uri) === l.name; })) P.note = "API " + a.name + " ยังมี integration ชี้ function นี้ ลบแล้วจะตอบ 500"; }); }
  else if (kind === "api") { var a = slsApi(id); if (!a) return false; P.title = "Delete API " + a.name; P.crumb = "API Gateway › APIs › Delete"; P.word = "confirm"; P.done = "ลบ API แล้ว URL เดิมใช้ไม่ได้"; }
  else if (kind === "ddb") { var t = slsTbl(id); if (!t) return false; P.title = "Delete table " + t.name; P.crumb = "DynamoDB › Tables › Delete"; P.word = "confirm"; P.done = "ลบ table แล้ว (ข้อมูล " + t.items.length + " รายการหาย)"; S.lams.filter(function (x) { return x.env.TABLE_NAME === t.name; }).forEach(function (x) { P.note = "Lambda " + x.name + " ยังอ้าง table นี้ใน TABLE_NAME"; }); }
  else if (kind === "layer") { var ly = S.layers.filter(function (x) { return x.id === id; })[0]; if (!ly) return false; P.title = "Delete layer " + ly.name; P.crumb = "Lambda › Layers › Delete"; P.word = "delete"; P.done = "ลบ layer ทุก version แล้ว"; }
  else if (kind === "adom") { var d0 = S.adoms.filter(function (x) { return x.id === id; })[0]; if (!d0) return false; P.title = "Delete domain name " + d0.name; P.crumb = "API Gateway › Custom domain names › Delete"; P.word = "confirm"; P.done = "ลบ custom domain แล้ว"; }
  else if (kind === "alarm") { var al = S.alarms.filter(function (x) { return x.id === id; })[0]; if (!al) return false; P.title = "Delete alarm " + al.name; P.crumb = "CloudWatch › Alarms › Delete"; P.word = "delete"; P.done = "ลบ alarm แล้ว"; }
  else return false; return true;
}
function slsDelDo(kind, id) {
  if (kind === "layer") return API.deleteLayer(id); if (kind === "adom") return API.deleteApiDomain(id); if (kind === "alarm") { S.alarms = S.alarms.filter(function (x) { return x.id !== id; }); return { res: true }; } if (kind === "lam") return API.deleteLambda(id); if (kind === "api") return API.deleteApi(id); if (kind === "ddb") return API.deleteDdbTable(id); return { res: true }; }

// ---------- HCL จากของที่กดใน console ----------
function slsHcl(o, ref) {
  var sl = slug;
  S.ddb.forEach(function (t) { o.push(hcm("ddb", t.name) + 'resource "aws_dynamodb_table" "' + sl(t.name) + '" {\n  name         = "' + t.name + '"\n  billing_mode = "' + t.billing + '"\n  hash_key     = "' + t.key + '"\n\n  attribute {\n    name = "' + t.key + '"\n    type = "' + t.keyType + '"\n  }\n' + (t.pitr ? "\n  point_in_time_recovery {\n    enabled = true\n  }\n" : "") + "}"); });
  S.lams.forEach(function (l) { var r = byName(S.roles, l.role); o.push(hcm("lamfn", l.name) + 'resource "aws_lambda_function" "' + sl(l.name) + '" {\n  function_name = "' + l.name + '"\n  role          = ' + (r ? ref(r.id, "arn") : '"' + l.role + '"') + '\n  runtime       = "' + l.runtime + '"\n  handler       = "' + l.handler + '"\n  filename      = "${path.module}/build/app.zip"   # zip โค้ด (console: Upload from .zip)\n  memory_size   = ' + l.memory + "\n  timeout       = " + l.timeout + "\n\n  environment {\n    variables = {\n" + Object.keys(l.env).map(function (k) { return "      " + k + ' = "' + l.env[k] + '"'; }).join("\n") + "\n    }\n  }\n}"); });
  S.apis.forEach(function (a) {
    var an = sl(a.name);
    o.push(hcm("apigw", a.name) + 'resource "aws_apigatewayv2_api" "' + an + '" {\n  name          = "' + a.name + '"\n  protocol_type = "' + a.protocol + '"\n}');
    a.integrations.forEach(function (i) { o.push(hcm("apiint", a.name + "/" + i.id) + 'resource "aws_apigatewayv2_integration" "' + an + "_" + sl(i.id) + '" {\n  api_id                 = aws_apigatewayv2_api.' + an + '.id\n  integration_type       = "AWS_PROXY"\n  integration_uri        = "' + i.uri + '"\n  integration_method     = "POST"\n  payload_format_version = "' + i.payload + '"\n}'); });
    a.routes.forEach(function (r) { o.push(hcm("apiroute", a.name + " " + r.key) + 'resource "aws_apigatewayv2_route" "' + an + "_" + sl(r.key) + '" {\n  api_id    = aws_apigatewayv2_api.' + an + '.id\n  route_key = "' + r.key + '"\n' + (r.integ ? "  target    = \"integrations/${aws_apigatewayv2_integration." + an + "_" + sl(r.integ) + ".id}\"\n" : "") + "}"); });
    a.stages.forEach(function (s) { o.push(hcm("apistage", a.name + "/" + s.name) + 'resource "aws_apigatewayv2_stage" "' + an + "_" + sl(s.name) + '" {\n  api_id      = aws_apigatewayv2_api.' + an + '.id\n  name        = "' + s.name + '"\n  auto_deploy = ' + s.auto + "\n}"); });
  });
  S.lperms.forEach(function (p) { o.push(hcm("lamperm", p.fn + " ← " + p.principal) + 'resource "aws_lambda_permission" "' + sl(p.fn + "_" + p.sid) + '" {\n  statement_id  = "' + p.sid + '"\n  action        = "lambda:InvokeFunction"\n  function_name = "' + p.fn + '"\n  principal     = "' + p.principal + '"\n' + (p.sourceArn ? '  source_arn    = "' + p.sourceArn + '"\n' : "") + "}"); });
}

// ---------- คำสั่ง aws dynamodb / lambda / apigatewayv2 + curl ----------
function slsAttrVal(v) { if (v && v.S !== undefined) return v.S; if (v && v.N !== undefined) return +v.N; if (v && v.BOOL !== undefined) return !!v.BOOL; return v; }
function slsTyped(x) { return typeof x === "number" ? { N: String(x) } : typeof x === "boolean" ? { BOOL: x } : { S: String(x) }; }
function shAwsSls(a, w, need) {
  var op = a[0] + " " + a[1];
  function arg(n) { var i = a.indexOf(n); return i >= 0 ? a[i + 1] : ""; }
  if (op === "dynamodb list-tables") return need("dynamodb:ListTables", "ListTables", function () { return ["{", '    "TableNames": [' + S.ddb.map(function (t) { return '"' + t.name + '"'; }).join(", ") + "]", "}"]; });
  if (op === "dynamodb describe-table") return need("dynamodb:DescribeTable", "DescribeTable", function () { var t = slsTbl(arg("--table-name")); if (!t) return ["", "An error occurred (ResourceNotFoundException) when calling the DescribeTable operation: Requested resource not found"]; return ["{", '    "Table": { "TableName": "' + t.name + '", "TableStatus": "ACTIVE", "KeySchema": [{ "AttributeName": "' + t.key + '", "KeyType": "HASH" }], "BillingModeSummary": { "BillingMode": "' + t.billing + '" }, "ItemCount": ' + t.items.length + ', "TableArn": "' + t.arn + '" }', "}"]; });
  if (op === "dynamodb scan") return need("dynamodb:Scan", "Scan", function () { var t = slsTbl(arg("--table-name")); if (!t) return ["", "An error occurred (ResourceNotFoundException) when calling the Scan operation: Requested resource not found"]; return ["{", '    "Items": [' + t.items.map(function (it) { var o = {}; Object.keys(it).forEach(function (k) { o[k] = slsTyped(it[k]); }); return JSON.stringify(o); }).join(", ") + "],", '    "Count": ' + t.items.length + ", \"ScannedCount\": " + t.items.length, "}"]; });
  if (op === "dynamodb put-item") return need("dynamodb:PutItem", "PutItem", function () {
    var t = slsTbl(arg("--table-name")); if (!t) return ["", "An error occurred (ResourceNotFoundException) when calling the PutItem operation: Requested resource not found"];
    var raw; try { raw = JSON.parse(arg("--item")); } catch (e) { return ["", "Error parsing parameter '--item': Invalid JSON: " + e.message]; }
    var it = {}; Object.keys(raw).forEach(function (k) { it[k] = slsAttrVal(raw[k]); }); var r = API.putItem(t.name, it); if (r.errors) return ["", "An error occurred (ValidationException) when calling the PutItem operation: " + String(r.errors[Object.keys(r.errors)[0]]).replace(/^[A-Za-z]+: /, "")]; return [];
  });
  if (op === "lambda list-functions") return need("lambda:ListFunctions", "ListFunctions", function () { return ["{", '    "Functions": [' + S.lams.map(function (l) { return '{ "FunctionName": "' + l.name + '", "Runtime": "' + l.runtime + '", "MemorySize": ' + l.memory + ", \"Timeout\": " + l.timeout + ' }'; }).join(", ") + "]", "}"]; });
  if (op === "lambda get-function-configuration") return need("lambda:GetFunctionConfiguration", "GetFunctionConfiguration", function () { var l = slsLam(slsFnName(arg("--function-name"))); if (!l) return ["", "An error occurred (ResourceNotFoundException) when calling the GetFunctionConfiguration operation: Function not found: " + slsFnArn(arg("--function-name"))]; return ["{", '    "FunctionName": "' + l.name + '", "Runtime": "' + l.runtime + '", "Handler": "' + l.handler + '",', '    "Role": "' + arnOf("role", (byName(S.roles, l.role) || {}).id || "x", l.role) + '", "MemorySize": ' + l.memory + ", \"Timeout\": " + l.timeout + ",", '    "Environment": { "Variables": ' + JSON.stringify(l.env) + " }", "}"]; });
  if (op === "apigatewayv2 get-apis") return need("apigateway:GET", "GetApis", function () { return ["{", '    "Items": [' + S.apis.map(function (x) { return '{ "ApiId": "' + x.id + '", "Name": "' + x.name + '", "ProtocolType": "' + x.protocol + '", "ApiEndpoint": "https://' + slsApiHost(x) + '" }'; }).join(", ") + "]", "}"]; });
  if (op === "lambda invoke") return need("lambda:InvokeFunction", "Invoke", function () {
    var fnN = slsFnName(arg("--function-name")), pl = arg("--payload") || "{}", outf = a.filter(function (x, i) { return x[0] !== "-" && i > 1 && a[i - 1][0] !== "-"; }).pop();
    var r = slsInvokeDirect(fnN, pl); if (r.fnErr) return ["", "An error occurred (" + r.fnErr.split(":")[0] + ") when calling the Invoke operation: " + r.fnErr.replace(/^[A-Za-z]+: /, "")];
    if (outf) fsWrite(outf, JSON.stringify(r.payload)); return ["{", '    "StatusCode": 200,'].concat(r.failed ? ['    "FunctionError": "Unhandled",'] : []).concat(['    "ExecutedVersion": "$LATEST"', "}"]);
  });
  if (op === "lambda get-policy") return need("lambda:GetPolicy", "GetPolicy", function () {
    var fnN = slsFnName(arg("--function-name")); if (!slsLam(fnN)) return ["", "An error occurred (ResourceNotFoundException) when calling the GetPolicy operation: Function not found: " + slsFnArn(fnN)];
    var ps = S.lperms.filter(function (p) { return p.fn === fnN; }); if (!ps.length) return ["", "An error occurred (ResourceNotFoundException) when calling the GetPolicy operation: The resource you requested does not exist."];
    var doc = { Version: "2012-10-17", Id: "default", Statement: ps.map(function (p) { var s = { Sid: p.sid, Effect: "Allow", Principal: { Service: p.principal }, Action: p.action, Resource: slsFnArn(fnN) }; if (p.sourceArn) s.Condition = { ArnLike: { "AWS:SourceArn": p.sourceArn } }; return s; }) };
    return ["{", '    "Policy": ' + JSON.stringify(JSON.stringify(doc)) + ",", '    "RevisionId": "' + slsHex(8) + "-" + slsHex(4) + "-" + slsHex(4) + "-" + slsHex(4) + "-" + slsHex(12) + '"', "}"];
  });
  if (op === "lambda add-permission") return need("lambda:AddPermission", "AddPermission", function () {
    var fnN = slsFnName(arg("--function-name")), r = API.addLambdaPermission({ fn: fnN, sid: arg("--statement-id"), principal: arg("--principal"), sourceArn: arg("--source-arn"), action: arg("--action") || "lambda:InvokeFunction" });
    if (r.errors) { var m = /^([A-Za-z]+): ([\s\S]*)$/.exec(String(r.errors[Object.keys(r.errors)[0]])); return ["", "An error occurred (" + (m ? m[1] : "InvalidParameterValueException") + ") when calling the AddPermission operation: " + (m ? m[2] : String(r.errors[Object.keys(r.errors)[0]]))]; }
    return ["{", '    "Statement": ' + JSON.stringify(JSON.stringify({ Sid: arg("--statement-id"), Effect: "Allow", Principal: { Service: arg("--principal") }, Action: arg("--action") || "lambda:InvokeFunction", Resource: slsFnArn(fnN) })), "}"];
  });
  if (op === "dynamodb execute-statement") return need("dynamodb:PartiQLSelect", "ExecuteStatement", function () { var r = slsPartiql(arg("--statement")); if (r.err) return ["", "An error occurred (" + r.err.split(":")[0] + ") when calling the ExecuteStatement operation: " + r.err.replace(/^[A-Za-z]+: /, "")]; return ["{", '    "Items": [' + (r.rows || []).map(function (it) { var o = {}; Object.keys(it).forEach(function (k) { o[k] = slsTyped(it[k]); }); return JSON.stringify(o); }).join(", ") + "]", "}"]; });
  return null;
}
function shZip(a) {
  var args = a.filter(function (x) { return x[0] !== "-"; }); if (args.length < 2) return { lines: ["zip error: Nothing to do! (" + (args[0] || "") + ")"] };
  var outp = /\.zip$/.test(args[0]) ? args[0] : args[0] + ".zip", names = [], lines = [];
  args.slice(1).forEach(function (f) { if (fsRead(f) === null) lines.push("\tzip warning: name not matched: " + f); else { names.push(f); lines.push("  adding: " + f + " (deflated 56%)"); } });
  if (!names.length) return { lines: lines.concat(["", "zip error: Nothing to do! (" + outp + ")"]) };
  fsWrite(outp, "PK\u0003\u0004 " + names.join(",")); return { lines: lines };
}
function shCurl(a) {
  var meth = "GET", body = "", url = "", head = false, i;
  for (i = 0; i < a.length; i++) { var x = a[i]; if (x === "-X" || x === "--request") meth = String(a[++i] || "GET").toUpperCase(); else if (x === "-d" || x === "--data" || x === "--data-raw") { body = a[++i] || ""; if (meth === "GET") meth = "POST"; } else if (x === "-H" || x === "--header" || x === "-o") i++; else if (x === "-i" || x === "--include") head = true; else if (x[0] !== "-") url = x; }
  if (!url) return { lines: ["curl: try 'curl --help' for more information"] };
  var m = /^(?:https?:\/\/)?([^\/:]+)(?::(\d+))?(\/[^\s]*)?$/.exec(url); if (!m) return { lines: ["curl: (3) URL rejected: Malformed input to a URL function"] };
  var r;
  if (/\.execute-api\./.test(m[1])) r = slsInvoke(m[1], m[3] || "/", meth, body);
  else { var w0 = webOpen(url); if (w0.site === "api") return { lines: [(head ? "HTTP/1.1 200 OK" : "") , JSON.stringify(w0.json)].filter(function (x) { return x !== ""; }) }; return { lines: ["curl: จำลองเฉพาะ URL ของ API Gateway / ALB ของ API (เว็บอื่นเปิดที่แท็บ Browser)"] }; }
  if (r.err) return { lines: ["curl: (6) Could not resolve host: " + m[1]] };
  var reason = { 200: "OK", 201: "Created", 400: "Bad Request", 404: "Not Found", 500: "Internal Server Error" }[r.status] || "";
  return { lines: (head ? ["HTTP/2 " + r.status + " " + reason, "content-type: application/json", ""] : []).concat([JSON.stringify(r.body)]) };
}
