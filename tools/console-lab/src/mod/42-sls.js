// ===== Use case 3: Serverless API (Lambda + API Gateway HTTP API + DynamoDB): state + API + ตัวจำลองคำขอ + Terraform provider =====
// คำขอ HTTP ถูกคำนวณจากโครงสร้างปัจจุบันทุกครั้ง (stage → route → integration → permission → Lambda role → table) จึงแก้ต้นเหตุแล้วหายเอง
// ข้อความ error ที่จำลองมาจากความจำเอกสาร/ประสบการณ์ อาจไม่ตรงทุกตัวอักษรกับของจริง
var LAM_RUNTIMES = ["python3.12", "python3.13", "nodejs20.x", "nodejs22.x", "java21", "dotnet8", "provided.al2023"];
function slsFnArn(n) { return "arn:aws:lambda:" + REGION + ":" + ACCOUNT + ":function:" + n; }
function slsTblArn(n) { return "arn:aws:dynamodb:" + REGION + ":" + ACCOUNT + ":table/" + n; }
function slsInvokeArn(n) { return "arn:aws:apigateway:" + REGION + ":lambda:path/2015-03-31/functions/" + slsFnArn(n) + "/invocations"; }
function slsFnName(ref) { var s = String(ref || ""), i = s.indexOf(":function:"); return (i >= 0 ? s.slice(i + 10) : s).split(/[:\/]/)[0]; }
function slsLam(n) { return S.lams.filter(function (x) { return x.name === n; })[0] || null; }
function slsTbl(n) { return S.ddb.filter(function (x) { return x.name === n; })[0] || null; }
function slsApi(id) { return S.apis.filter(function (x) { return x.id === id; })[0] || null; }
function slsApiHost(a) { return a.id + ".execute-api." + REGION + ".amazonaws.com"; }
function slsExecArn(a) { return "arn:aws:execute-api:" + REGION + ":" + ACCOUNT + ":" + a.id; }
function slsHex(n) { return fakeId("", n, "0123456789abcdef"); }
function isSlsLab() { return S.lams.length > 0 || S.apis.length > 0 || S.ddb.length > 0; }

API.createDdbTable = function (o) {
  var er = {}, n = String(o.name || "");
  if (!n) er.name = "ต้องกรอกชื่อ table"; else if (!/^[A-Za-z0-9_.-]{3,255}$/.test(n)) er.name = "ValidationException: ชื่อ table ใช้ตัวอักษร ตัวเลข _ . - ยาว 3-255 ตัว"; else if (slsTbl(n)) er.name = "ResourceInUseException: Table already exists: " + n;
  if (!String(o.key || "")) er.key = "ValidationException: ต้องกำหนด partition key"; else if (!/^[A-Za-z0-9_.-]{1,255}$/.test(o.key)) er.key = "ValidationException: ชื่อ partition key ไม่ถูกต้อง";
  if (Object.keys(er).length) return { errors: er };
  var t = { id: n, name: n, key: o.key, keyType: o.keyType || "S", billing: o.billing === "PROVISIONED" ? "PROVISIONED" : "PAY_PER_REQUEST", pitr: !!o.pitr, items: [], born: Date.now(), arn: slsTblArn(n) }; S.ddb.push(t); return { res: t };
};
API.deleteDdbTable = function (n) { if (!slsTbl(n)) return E("_", "ResourceNotFoundException: Requested resource not found: Table: " + n + " not found"); S.ddb = S.ddb.filter(function (x) { return x.name !== n; }); return { res: true }; };
API.putItem = function (table, item) {
  var t = slsTbl(table); if (!t) return E("_", "ResourceNotFoundException: Requested resource not found");
  if (!item || typeof item !== "object" || item[t.key] === undefined || item[t.key] === "") return E("item", "ValidationException: One or more parameter values were not valid: Missing the key " + t.key + " in the item");
  var i = t.items.findIndex(function (x) { return String(x[t.key]) === String(item[t.key]); }); if (i >= 0) t.items[i] = item; else t.items.push(item); return { res: item };
};
API.deleteItem = function (table, id) { var t = slsTbl(table); if (!t) return E("_", "ResourceNotFoundException: Requested resource not found"); t.items = t.items.filter(function (x) { return String(x[t.key]) !== String(id); }); return { res: true }; };

API.createLambda = function (o) {
  var er = {}, n = String(o.name || ""), role = roleByRef(o.role), mem = +o.memory || 128, to = +o.timeout || 3;
  if (!n) er.name = "ต้องกรอกชื่อ function"; else if (!/^[A-Za-z0-9_-]{1,64}$/.test(n)) er.name = "ValidationException: ชื่อ function ใช้ตัวอักษร ตัวเลข - _ ไม่เกิน 64 ตัว"; else if (slsLam(n)) er.name = "ResourceConflictException: Function already exist: " + n;
  if (LAM_RUNTIMES.indexOf(o.runtime) < 0) er.runtime = "InvalidParameterValueException: Value " + (o.runtime || "") + " at 'runtime' failed to satisfy constraint: Member must satisfy enum value set: [" + LAM_RUNTIMES.join(", ") + "]";
  if (!/^[A-Za-z0-9_.\/-]+$/.test(String(o.handler || ""))) er.handler = "InvalidParameterValueException: handler ไม่ถูกต้อง (รูปแบบ ไฟล์.ฟังก์ชัน เช่น app.handler)";
  if (!o.role) er.role = "ต้องเลือก execution role"; else if (!role || !roleTrusts(role, "lambda.amazonaws.com")) er.role = "InvalidParameterValueException: The role defined for the function cannot be assumed by Lambda.";
  if (!(mem >= 128 && mem <= 10240)) er.memory = "ValidationException: memory ต้อง 128-10240 MB"; if (!(to >= 1 && to <= 900)) er.timeout = "ValidationException: timeout ต้อง 1-900 วินาที";
  if (Object.keys(er).length) return { errors: er };
  var l = { id: n, name: n, arn: slsFnArn(n), runtime: o.runtime, handler: o.handler, memory: mem, timeout: to, role: role.name, env: Object.assign({}, o.env || {}), born: Date.now(), inv: 0, errs: 0, warm: false, tagMap: {} }; S.lams.push(l); return { res: l };
};
API.updateLambda = function (n, o) {
  var l = slsLam(n); if (!l) return E("_", "ResourceNotFoundException: Function not found: " + slsFnArn(n));
  if (o.memory !== undefined) { if (!(+o.memory >= 128 && +o.memory <= 10240)) return E("memory", "ValidationException: memory ต้อง 128-10240 MB"); l.memory = +o.memory; }
  if (o.timeout !== undefined) { if (!(+o.timeout >= 1 && +o.timeout <= 900)) return E("timeout", "ValidationException: timeout ต้อง 1-900 วินาที"); l.timeout = +o.timeout; }
  if (o.env) l.env = Object.assign({}, o.env); if (o.handler) l.handler = o.handler;
  if (o.role) { var r = roleByRef(o.role); if (!r || !roleTrusts(r, "lambda.amazonaws.com")) return E("role", "InvalidParameterValueException: The role defined for the function cannot be assumed by Lambda."); l.role = r.name; }
  l.warm = false; return { res: l }; // แก้ config = execution environment ใหม่ (cold start)
};
API.deleteLambda = function (n) { if (!slsLam(n)) return E("_", "ResourceNotFoundException: Function not found: " + slsFnArn(n)); S.lams = S.lams.filter(function (x) { return x.name !== n; }); S.lperms = S.lperms.filter(function (p) { return p.fn !== n; }); return { res: true }; };
API.addLambdaPermission = function (o) {
  var n = slsFnName(o.fn), er = {};
  if (!slsLam(n)) return E("fn", "ResourceNotFoundException: Function not found: " + slsFnArn(n));
  if (!o.sid) er.sid = "ต้องกรอก Statement ID"; else if (S.lperms.some(function (p) { return p.fn === n && p.sid === o.sid; })) er.sid = "ResourceConflictException: The statement id (" + o.sid + ") provided already exists. Please provide a new statement id, or remove the existing statement.";
  if (!o.principal) er.principal = "ต้องกรอก Principal (เช่น apigateway.amazonaws.com)";
  if (Object.keys(er).length) return { errors: er };
  var p = { fn: n, sid: o.sid, principal: o.principal, sourceArn: o.sourceArn || "", action: o.action || "lambda:InvokeFunction" }; S.lperms.push(p); return { res: p };
};
API.removeLambdaPermission = function (fn, sid) { S.lperms = S.lperms.filter(function (p) { return !(p.fn === fn && p.sid === sid); }); return { res: true }; };

var API_ROUTE_RE = /^(\$default|(ANY|GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD) \/\S*)$/;
API.createApi = function (o) {
  var n = String(o.name || ""); if (!n) return E("name", "ต้องกรอกชื่อ API"); if (S.apis.some(function (a) { return a.name === n && false; })) return E("name", "ซ้ำ");
  var a = { id: fakeId("", 10, "abcdefghijklmnopqrstuvwxyz0123456789"), name: n, protocol: o.protocol || "HTTP", integrations: [], routes: [], stages: [], born: Date.now(), tagMap: {} }; S.apis.push(a); return { res: a };
};
API.addApiIntegration = function (apiId, o) {
  var a = slsApi(apiId); if (!a) return E("_", "NotFoundException: Invalid API identifier specified " + ACCOUNT + ":" + apiId);
  var u = String(o.uri || ""); if (!/^arn:aws:lambda:[a-z0-9-]+:\d+:function:[\w-]+(:[\w$-]+)?$/.test(u) && !/^arn:aws:apigateway:[a-z0-9-]+:lambda:path\/2015-03-31\/functions\/arn:aws:lambda:[a-z0-9-]+:\d+:function:[\w-]+(:[\w$-]+)?\/invocations$/.test(u)) return E("uri", "BadRequestException: Integration URI should be a valid ARN of Lambda function (arn:aws:lambda:… หรือ invoke ARN)");
  var i = { id: fakeId("", 8, "abcdefghijklmnopqrstuvwxyz0123456789"), uri: u, type: "AWS_PROXY", payload: o.payload || "2.0" }; a.integrations.push(i); return { res: i };
};
API.addApiRoute = function (apiId, o) {
  var a = slsApi(apiId); if (!a) return E("_", "NotFoundException: Invalid API identifier specified");
  var k = String(o.key || "").trim(); if (!API_ROUTE_RE.test(k)) return E("key", "BadRequestException: Route key ต้องเป็น \"METHOD /path\" (เช่น GET /drugs) หรือ $default");
  if (a.routes.some(function (r) { return r.key === k; })) return E("key", "ConflictException: Route with key " + k + " already exists");
  var tid = String(o.target || "").replace(/^integrations\//, ""); if (tid && !a.integrations.some(function (i) { return i.id === tid; })) return E("target", "BadRequestException: Unable to find Integration by id: " + tid);
  var r = { id: fakeId("", 7, "abcdefghijklmnopqrstuvwxyz0123456789"), key: k, integ: tid }; a.routes.push(r); return { res: r };
};
API.addApiStage = function (apiId, o) {
  var a = slsApi(apiId); if (!a) return E("_", "NotFoundException: Invalid API identifier specified");
  var n = String(o.name || ""); if (!/^[A-Za-z0-9_$-]+$/.test(n)) return E("name", "BadRequestException: Stage name ใช้ตัวอักษร ตัวเลข _ - หรือ $default");
  if (a.stages.some(function (s) { return s.name === n; })) return E("name", "ConflictException: Stage with name " + n + " already exists");
  var s = { name: n, auto: o.auto !== false }; a.stages.push(s); return { res: s };
};
API.deleteApi = function (id) { if (!slsApi(id)) return E("_", "NotFoundException: Invalid API identifier specified " + ACCOUNT + ":" + id); S.apis = S.apis.filter(function (a) { return a.id !== id; }); return { res: true }; };
// เหมือน Quick create ใน console: API + Lambda integration + route + stage + (console เพิ่ม permission ให้เอง)
API.createApiQuick = function (o) {
  var fn = slsFnName(o.fn); if (!slsLam(fn)) return E("fn", "ResourceNotFoundException: Function not found: " + slsFnArn(fn));
  var r = API.createApi({ name: o.name }); if (r.errors) return r; var a = r.res, ig = API.addApiIntegration(a.id, { uri: slsFnArn(fn) }).res;
  (o.routes && o.routes.length ? o.routes : ["$default"]).forEach(function (k) { API.addApiRoute(a.id, { key: k, target: ig.id }); });
  API.addApiStage(a.id, { name: o.stage || "$default", auto: true });
  API.addLambdaPermission({ fn: fn, sid: "apigateway-" + a.id + "-" + slsHex(6), principal: "apigateway.amazonaws.com", sourceArn: slsExecArn(a) + "/*" });
  return { res: a };
};

// ---------- สิทธิ์ DynamoDB ของ role ----------
function slsCan(role, action, arn) {
  if (!role) return false; var ps = role.policies || [];
  if (ps.indexOf("AdministratorAccess") >= 0 || ps.indexOf("AmazonDynamoDBFullAccess") >= 0) return true;
  if (ps.indexOf("AmazonDynamoDBReadOnlyAccess") >= 0 && /^dynamodb:(Scan|Query|GetItem|BatchGetItem|Describe)/.test(action)) return true;
  return (role.inline || []).some(function (p) { return [].concat(p.doc.Statement || []).some(function (s) { if (s.Effect !== "Allow") return false; var acts = [].concat(s.Action || []), rs = [].concat(s.Resource || []); return acts.some(function (x) { return x === "*" || x === "dynamodb:*" || x.toLowerCase() === action.toLowerCase(); }) && rs.some(function (r) { return r === "*" || r === arn || (r.slice(-1) === "*" && arn.indexOf(r.slice(0, -1)) === 0); }); }); });
}
function slsHasLogs(role) { return !!role && (role.policies.indexOf("AWSLambdaBasicExecutionRole") >= 0 || role.policies.indexOf("AdministratorAccess") >= 0); }

// ---------- จำลองคำขอผ่าน API Gateway ----------
function slsMatchRoute(a, method, path) {
  function pm(pattern, p) { var ps = pattern.split("/"), xs = p.split("/"); for (var i = 0; i < ps.length; i++) { if (/^\{[^}]+\+\}$/.test(ps[i])) return true; if (i >= xs.length) return false; if (!/^\{[^}]+\}$/.test(ps[i]) && ps[i] !== xs[i]) return false; } return ps.length === xs.length; }
  var best = null;
  a.routes.forEach(function (r) { if (r.key === "$default") return; var sp = r.key.indexOf(" "), m = r.key.slice(0, sp), pt = r.key.slice(sp + 1); if ((m === method || m === "ANY") && pm(pt, path)) { var sc = (m === method ? 2 : 0) + (pt.indexOf("{") < 0 ? 4 : 0); if (!best || sc > best.sc) best = { r: r, sc: sc }; } });
  return best ? best.r : (a.routes.filter(function (r) { return r.key === "$default"; })[0] || null);
}
function slsLog(fn, role, lines) {
  if (!slsHasLogs(role)) return false; var g = "/aws/lambda/" + fn.name;
  if (!S.lgs.some(function (x) { return x.name === g; })) S.lgs.push({ id: g, name: g, retention: 0, born: Date.now(), tagMap: {}, auto: true });
  var lg = S.lamLogs.filter(function (x) { return x.fn === fn.name; })[0]; if (!lg) { lg = { fn: fn.name, group: g, stream: new Date().toISOString().slice(0, 10).replace(/-/g, "/") + "/[$LATEST]" + slsHex(32), lines: [] }; S.lamLogs.push(lg); }
  lg.lines = lg.lines.concat(lines).slice(-60); return true;
}
function slsInvoke(host, rawPath, method, bodyText) {
  var m = /^([a-z0-9]+)\.execute-api\./.exec(host), a = m && slsApi(m[1]), res = { steps: [], status: 0, body: null, fn: "" };
  function st(ok, t, d) { res.steps.push({ ok: ok, t: t, d: d }); return ok; }
  if (!a) return { err: "ERR_NAME_NOT_RESOLVED", host: host, steps: [{ ok: false, t: "API ID ในชื่อโฮสต์มีอยู่จริง", d: "ไม่พบ API " + (m ? m[1] : host) + " (ลบไปแล้ว หรือพิมพ์ผิด)" }] };
  var full = String(rawPath || "/").split("?")[0] || "/", first = full.split("/")[1], stg = a.stages.filter(function (s) { return s.name === first; })[0], path = full;
  if (stg) path = full.slice(first.length + 1) || "/"; else stg = a.stages.filter(function (s) { return s.name === "$default"; })[0] || null;
  res.api = a; res.stage = stg ? stg.name : ""; res.path = path; res.method = method;
  a.reqs = (a.reqs || 0) + 1;
  function fin(status, body) { res.status = status; res.body = body; if (status >= 500) a.e5 = (a.e5 || 0) + 1; else if (status >= 400) a.e4 = (a.e4 || 0) + 1; return res; }
  if (!st(!!stg, "Stage ตรงกับ URL (" + (first ? "/" + first : "/") + ")", stg ? "stage " + stg.name + (stg.auto ? " · auto deploy" : "") : "API นี้ไม่มี stage ชื่อ '" + first + "' และไม่มี $default · stages: " + (a.stages.map(function (s) { return s.name; }).join(", ") || "ไม่มีเลย"))) return fin(404, { message: "Not Found" });
  var rt = slsMatchRoute(a, method, path);
  if (!st(!!rt, "มี route ที่ตรง " + method + " " + path, rt ? "route " + rt.key : "ไม่มี route ตรง · routes: " + (a.routes.map(function (r) { return r.key; }).join(", ") || "ไม่มี"))) return fin(404, { message: "Not Found" });
  var ig = a.integrations.filter(function (i) { return i.id === rt.integ; })[0], fn = ig && slsLam(slsFnName(ig.uri));
  if (!st(!!ig, "route ชี้ integration", ig ? "integration " + ig.id : "route ไม่มี target")) return fin(500, { message: "Internal Server Error" });
  if (!st(!!fn, "integration ชี้ Lambda ที่มีอยู่", fn ? fn.name : "ไม่พบ function " + slsFnName(ig.uri))) return fin(500, { message: "Internal Server Error" });
  res.fn = fn.name;
  var perm = S.lperms.some(function (p) { return p.fn === fn.name && p.principal === "apigateway.amazonaws.com" && (!p.sourceArn || p.sourceArn.indexOf(":" + a.id + "/") >= 0 || p.sourceArn.indexOf(":" + a.id) >= 0); });
  if (!st(perm, "Lambda อนุญาต API Gateway เรียก (resource-based policy)", perm ? "มี statement principal apigateway.amazonaws.com" : "ไม่มี permission → API Gateway เรียก " + fn.name + " ไม่ได้ · access log ของ API: integrationErrorMessage = \"Invalid permissions on Lambda function\" · Lambda จึงไม่เคยถูกเรียก = ไม่มี log")) return fin(500, { message: "Internal Server Error" });
  var ex = slsExec(fn, method, path, bodyText, st);
  res.cold = ex.cold; res.dur = ex.dur; return fin(ex.status, ex.body);
}
function slsSrcLine(needle) { var t = (LABFILES["labs/03-serverless/src/app.py"] || "").split("\n"), i = -1; t.forEach(function (l, k) { if (i < 0 && l.indexOf(needle) >= 0) i = k; }); return { n: i + 1, s: i >= 0 ? t[i].trim() : needle }; }
// รัน handler ของ Lambda หนึ่งครั้ง (ใช้ร่วมกันทั้งผ่าน API Gateway และปุ่ม Test): คืน status/body ของ response + log + error แบบ Python runtime
function slsExec(fn, method, path, bodyText, st) {
  st = st || function (ok) { return ok; };
  var role = roleByRef(fn.role), rid0 = slsHex(8) + "-" + slsHex(4) + "-" + slsHex(4) + "-" + slsHex(4) + "-" + slsHex(12), cold = !fn.warm, dur = 20 + (parseInt(hash32(rid0).slice(0, 3), 16) % 60), ini = 300 + (parseInt(hash32(fn.name).slice(0, 3), 16) % 200), tn = fn.env.TABLE_NAME, tbl = tn ? slsTbl(tn) : null, hasLog = slsHasLogs(role);
  var lines = ["START RequestId: " + rid0 + " Version: $LATEST", method + " " + path + " env=" + (fn.env.APP_ENV || "None")], out = { status: 200, body: null, err: null, rid: rid0, cold: cold, dur: dur, ini: ini };
  fn.warm = true; fn.inv++;
  var need = method === "GET" ? "dynamodb:Scan" : "dynamodb:PutItem", opn = need.split(":")[1] === "Scan" ? "Scan" : "PutItem", src = slsSrcLine(method === "GET" ? "table.scan()" : "table.put_item"), emsg = "", etype = "";
  if (!tn) { etype = "KeyError"; emsg = "'TABLE_NAME'"; }
  else if (!st(!!tbl, "Lambda ใช้ table ตามตัวแปร TABLE_NAME", tbl ? "TABLE_NAME=" + tn : "TABLE_NAME=" + tn + " ไม่ตรงกับ table ใดเลย")) { etype = "ResourceNotFoundException"; emsg = "An error occurred (ResourceNotFoundException) when calling the " + opn + " operation: Requested resource not found"; }
  else if (!st(slsCan(role, need, slsTblArn(tbl.name)), "Lambda role มีสิทธิ์ " + need, slsCan(role, need, slsTblArn(tbl.name)) ? role.name + " ผ่าน" : "role " + (role ? role.name : "?") + " ไม่มี " + need + " บน " + slsTblArn(tbl.name))) { etype = "ClientError"; emsg = "An error occurred (AccessDeniedException) when calling the " + opn + " operation: User: arn:aws:sts::" + ACCOUNT + ":assumed-role/" + role.name + "/" + fn.name + " is not authorized to perform: " + need + " on resource: " + slsTblArn(tbl.name) + " because no identity-based policy allows the " + need + " action"; }
  if (etype) {
    fn.errs++; var tb = ["Traceback (most recent call last):", "  File \"/var/task/app.py\", line " + src.n + ", in handler", "    " + src.s].concat(etype === "KeyError" ? [] : ["  File \"/var/lang/lib/python3.12/site-packages/boto3/resources/factory.py\", line 581, in do_action", "    response = action(self, *args, **kwargs)", "  File \"/var/lang/lib/python3.12/site-packages/botocore/client.py\", line 1078, in _make_api_call", "    raise error_class(parsed_response, operation_name)"]);
    if (etype === "KeyError") tb = ["Traceback (most recent call last):", "  File \"/var/task/app.py\", line 9, in <module>", "    table = boto3.resource(\"dynamodb\").Table(os.environ[\"TABLE_NAME\"])"]; 
    lines.push("[ERROR] " + etype + ": " + emsg); tb.forEach(function (l) { lines.push(l); }); out.status = 500; out.body = { message: "Internal Server Error" }; out.err = { type: etype, msg: emsg, stack: tb.slice(1) };
  } else if (method === "GET") { out.body = { env: fn.env.APP_ENV || null, function: fn.name, count: tbl.items.length, items: tbl.items.slice(0, 20) }; }
  else { var it = null; try { it = JSON.parse(bodyText || ""); } catch (e) { it = null; } if (!it || typeof it !== "object") { out.status = 400; out.body = { message: "invalid json body" }; } else { if (it[tbl.key] === undefined) it[tbl.key] = slsHex(8); API.putItem(tbl.name, it); out.status = 201; out.body = { id: it[tbl.key], function: fn.name }; } }
  lines.push("END RequestId: " + rid0, "REPORT RequestId: " + rid0 + "\tDuration: " + dur + ".12 ms\tBilled Duration: " + (dur + 1) + " ms\tMemory Size: " + fn.memory + " MB\tMax Memory Used: " + Math.min(fn.memory - 20, 62 + dur % 20) + " MB" + (cold ? "\tInit Duration: " + ini + ".30 ms" : ""));
  out.lines = lines; var wrote = slsLog(fn, role, lines); st(wrote || !hasLog, "Lambda เขียน log ไป CloudWatch ได้", hasLog ? "log group /aws/lambda/" + fn.name : "role ไม่มี AWSLambdaBasicExecutionRole → function ทำงานได้แต่ไม่มี log (ดีบักยาก)");
  return out;
}
// ปุ่ม Test ใน Lambda console / aws lambda invoke: ไม่ผ่าน API Gateway · คืนผลแบบที่ Lambda คืนจริง (error = errorMessage/errorType/stackTrace)
function slsInvokeDirect(name, eventText) {
  var fn = slsLam(name); if (!fn) return { fnErr: "ResourceNotFoundException: Function not found: " + slsFnArn(name) };
  var ev; try { ev = JSON.parse(eventText || "{}"); } catch (e) { return { fnErr: "InvalidRequestContentException: Could not parse request body into json: " + e.message }; }
  var rc = (ev.requestContext || {}).http || {}, method = (rc.method || String(ev.routeKey || "GET /").split(" ")[0] || "GET").toUpperCase(), path = ev.rawPath || rc.path || "/", ex = slsExec(fn, method, path, ev.body || "", null);
  var payload = ex.err ? { errorMessage: ex.err.msg, errorType: ex.err.type, requestId: ex.rid, stackTrace: ex.err.stack } : { statusCode: ex.status, headers: { "content-type": "application/json" }, body: JSON.stringify(ex.body) };
  return { ex: ex, payload: payload, failed: !!ex.err, fn: fn };
}

// ---------- Terraform schema + provider ----------
TF_SCHEMA.aws_dynamodb_table = sch(["name", "billing_mode", "hash_key", "range_key", "read_capacity", "write_capacity", "attribute", "point_in_time_recovery", "tags"], ["name", "hash_key"], { attribute: { args: ["name", "type"], req: ["name", "type"] }, point_in_time_recovery: { args: ["enabled"], req: ["enabled"] } }, ["tags", "point_in_time_recovery", "read_capacity", "write_capacity"], ["id", "arn"]);
TF_SCHEMA.aws_lambda_function = sch(["function_name", "role", "handler", "runtime", "filename", "source_code_hash", "memory_size", "timeout", "description", "environment", "tags"], ["function_name", "role"], { environment: { args: ["variables"], req: [] } }, ["tags", "memory_size", "timeout", "environment", "description", "handler", "source_code_hash"], ["id", "arn", "invoke_arn", "qualified_arn", "version"]);
TF_SCHEMA.aws_lambda_permission = sch(["statement_id", "action", "function_name", "principal", "source_arn"], ["action", "function_name", "principal"], {}, [], ["id"]);
TF_SCHEMA.aws_apigatewayv2_api = sch(["name", "protocol_type", "description", "tags"], ["name", "protocol_type"], {}, ["tags", "description"], ["id", "arn", "api_endpoint", "execution_arn"]);
TF_SCHEMA.aws_apigatewayv2_integration = sch(["api_id", "integration_type", "integration_uri", "integration_method", "payload_format_version"], ["api_id", "integration_type"], {}, ["integration_uri", "payload_format_version"], ["id"]);
TF_SCHEMA.aws_apigatewayv2_route = sch(["api_id", "route_key", "target"], ["api_id", "route_key"], {}, ["target"], ["id"]);
TF_SCHEMA.aws_apigatewayv2_stage = sch(["api_id", "name", "auto_deploy", "tags"], ["api_id", "name"], {}, ["tags", "auto_deploy"], ["id", "arn", "invoke_url"]);
TF_SCHEMA.aws_iam_role_policy = sch(["name", "role", "policy"], ["role", "policy"], {}, ["policy"], ["id"]);

TF_PROV.aws_dynamodb_table = {
  act: "dynamodb:CreateTable", svc: "DynamoDB", op: "CreateTable",
  create: function (c) {
    var a = c.attrs, attrs = a.attribute || [], hk = attrs.filter(function (x) { return x.name === a.hash_key; })[0], billing = a.billing_mode || "PROVISIONED", L = "creating DynamoDB Table (" + a.name + ")";
    if (!hk) throw TfAwsError(L, "DynamoDB", "CreateTable", "ValidationException", "One or more parameter values were not valid. Some index key attributes are not defined in AttributeDefinitions. Keys: [" + a.hash_key + "], AttributeDefinitions: [" + attrs.map(function (x) { return x.name; }).join(", ") + "]");
    if (billing === "PROVISIONED" && !(a.read_capacity && a.write_capacity)) throw TfAwsError(L, "DynamoDB", "CreateTable", "ValidationException", "One or more parameter values were not valid: ReadCapacityUnits and WriteCapacityUnits must both be specified when BillingMode is PROVISIONED");
    var t = ecsTfOk(API.createDdbTable({ name: a.name, key: a.hash_key, keyType: hk.type, billing: billing, pitr: ((a.point_in_time_recovery || [{}])[0] || {}).enabled }), L, "DynamoDB", "CreateTable");
    return { id: t.name, computed: { id: t.name, arn: t.arn }, sim: { name: t.name } };
  },
  update: function (st, d) { var t = slsTbl(st.sim.name); if (t && d.point_in_time_recovery) t.pitr = !!((d.point_in_time_recovery || [{}])[0] || {}).enabled; },
  del: function (st) { API.deleteDdbTable(st.sim.name); },
  read: function (st) { return slsTbl(st.sim.name) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_lambda_function = {
  act: "lambda:CreateFunction", svc: "Lambda", op: "CreateFunction",
  create: function (c) {
    var a = c.attrs, env = ((a.environment || [{}])[0] || {}).variables || {}, L = "creating Lambda Function (" + a.function_name + ")";
    if (a.filename && fsRead(normPath(a.filename, S.tfCur || REPO + "/terraform")) === null) throw new Error("unable to load \"" + a.filename + "\": open " + a.filename + ": no such file or directory");
    var l = ecsTfOk(API.createLambda({ name: a.function_name, runtime: a.runtime || "", handler: a.handler || "", role: a.role, memory: a.memory_size, timeout: a.timeout, env: env }), L, "Lambda", "CreateFunction"); l.tagMap = Object.assign({}, c.tags);
    return { id: l.name, computed: { id: l.name, arn: l.arn, invoke_arn: slsInvokeArn(l.name), qualified_arn: l.arn + ":$LATEST", version: "$LATEST" }, sim: { name: l.name } };
  },
  update: function (st, d) { var r = API.updateLambda(st.sim.name, { memory: d.memory_size, timeout: d.timeout, env: d.environment ? ((d.environment[0] || {}).variables || {}) : undefined, handler: d.handler }); if (r.errors) throw TfAwsError("updating Lambda Function (" + st.sim.name + ")", "Lambda", "UpdateFunctionConfiguration", "InvalidParameterValueException", String(r.errors[Object.keys(r.errors)[0]]).replace(/^[A-Za-z]+: /, "")); },
  del: function (st) { API.deleteLambda(st.sim.name); },
  read: function (st) { return slsLam(st.sim.name) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_lambda_permission = {
  act: "lambda:AddPermission", svc: "Lambda", op: "AddPermission",
  create: function (c) { var a = c.attrs, sid = a.statement_id || "terraform-" + slsHex(10), p = ecsTfOk(API.addLambdaPermission({ fn: a.function_name, sid: sid, principal: a.principal, sourceArn: a.source_arn, action: a.action }), "creating Lambda Permission (" + sid + ")", "Lambda", "AddPermission"); return { id: sid, computed: { id: sid }, sim: { fn: p.fn, sid: sid } }; },
  update: function () {}, del: function (st) { API.removeLambdaPermission(st.sim.fn, st.sim.sid); },
  read: function (st) { return S.lperms.some(function (p) { return p.fn === st.sim.fn && p.sid === st.sim.sid; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_apigatewayv2_api = {
  act: "apigateway:POST", svc: "ApiGatewayV2", op: "CreateApi",
  create: function (c) { var a = c.attrs; if (["HTTP", "WEBSOCKET"].indexOf(a.protocol_type) < 0) throw TfAwsError("creating API Gateway v2 API (" + a.name + ")", "ApiGatewayV2", "CreateApi", "BadRequestException", "Invalid protocol type " + a.protocol_type + " (HTTP หรือ WEBSOCKET)"); var x = ecsTfOk(API.createApi({ name: a.name, protocol: a.protocol_type }), "creating API Gateway v2 API (" + a.name + ")", "ApiGatewayV2", "CreateApi"); x.tagMap = Object.assign({}, c.tags); return { id: x.id, computed: { id: x.id, arn: "arn:aws:apigateway:" + REGION + "::/apis/" + x.id, api_endpoint: "https://" + slsApiHost(x), execution_arn: slsExecArn(x) }, sim: { id: x.id } }; },
  update: function () {}, del: function (st) { API.deleteApi(st.sim.id); },
  read: function (st) { return slsApi(st.sim.id) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_apigatewayv2_integration = {
  act: "apigateway:POST", svc: "ApiGatewayV2", op: "CreateIntegration",
  create: function (c) { var a = c.attrs, i = ecsTfOk(API.addApiIntegration(a.api_id, { uri: a.integration_uri, payload: a.payload_format_version || "1.0" }), "creating API Gateway v2 Integration", "ApiGatewayV2", "CreateIntegration"); return { id: i.id, computed: { id: i.id }, sim: { api: a.api_id, id: i.id } }; },
  update: function (st, d) { var a = slsApi(st.sim.api), i = a && a.integrations.filter(function (x) { return x.id === st.sim.id; })[0]; if (i) { if (d.integration_uri) i.uri = d.integration_uri; if (d.payload_format_version) i.payload = d.payload_format_version; } },
  del: function (st) { var a = slsApi(st.sim.api); if (a) a.integrations = a.integrations.filter(function (x) { return x.id !== st.sim.id; }); },
  read: function (st) { var a = slsApi(st.sim.api); return a && a.integrations.some(function (x) { return x.id === st.sim.id; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_apigatewayv2_route = {
  act: "apigateway:POST", svc: "ApiGatewayV2", op: "CreateRoute",
  create: function (c) { var a = c.attrs, r = ecsTfOk(API.addApiRoute(a.api_id, { key: a.route_key, target: a.target }), "creating API Gateway v2 Route (" + a.route_key + ")", "ApiGatewayV2", "CreateRoute"); return { id: r.id, computed: { id: r.id }, sim: { api: a.api_id, id: r.id } }; },
  update: function (st, d) { var a = slsApi(st.sim.api), r = a && a.routes.filter(function (x) { return x.id === st.sim.id; })[0]; if (r && d.target) r.integ = String(d.target).replace(/^integrations\//, ""); },
  del: function (st) { var a = slsApi(st.sim.api); if (a) a.routes = a.routes.filter(function (x) { return x.id !== st.sim.id; }); },
  read: function (st) { var a = slsApi(st.sim.api); return a && a.routes.some(function (x) { return x.id === st.sim.id; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_apigatewayv2_stage = {
  act: "apigateway:POST", svc: "ApiGatewayV2", op: "CreateStage",
  create: function (c) { var a = c.attrs, s = ecsTfOk(API.addApiStage(a.api_id, { name: a.name, auto: a.auto_deploy }), "creating API Gateway v2 Stage (" + a.name + ")", "ApiGatewayV2", "CreateStage"), ap = slsApi(a.api_id); return { id: a.name, computed: { id: a.name, arn: "arn:aws:apigateway:" + REGION + "::/apis/" + a.api_id + "/stages/" + a.name, invoke_url: "https://" + slsApiHost(ap) + "/" + (a.name === "$default" ? "" : a.name) }, sim: { api: a.api_id, name: a.name } }; },
  update: function (st, d) { var a = slsApi(st.sim.api), s = a && a.stages.filter(function (x) { return x.name === st.sim.name; })[0]; if (s && d.auto_deploy !== undefined) s.auto = !!d.auto_deploy; },
  del: function (st) { var a = slsApi(st.sim.api); if (a) a.stages = a.stages.filter(function (x) { return x.name !== st.sim.name; }); },
  read: function (st) { var a = slsApi(st.sim.api); return a && a.stages.some(function (x) { return x.name === st.sim.name; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_iam_role_policy = {
  act: "iam:PutRolePolicy", svc: "IAM", op: "PutRolePolicy",
  create: function (c) {
    var a = c.attrs, r = roleByRef(a.role), nm = a.name || "terraform-" + slsHex(10), L = "putting IAM Role Policy (" + a.role + ":" + nm + ")", doc;
    if (!r) throw TfAwsError(L, "IAM", "PutRolePolicy", "NoSuchEntity", "The role with name " + a.role + " cannot be found.");
    try { doc = JSON.parse(a.policy); } catch (e) { throw TfAwsError(L, "IAM", "PutRolePolicy", "MalformedPolicyDocument", "Syntax errors in policy."); }
    r.inline = (r.inline || []).filter(function (x) { return x.name !== nm; }).concat([{ name: nm, doc: doc }]); var id = r.name + ":" + nm; return { id: id, computed: { id: id }, sim: { role: r.id, name: nm } };
  },
  update: function (st, d) { var r = find(S.roles, st.sim.role), p = r && (r.inline || []).filter(function (x) { return x.name === st.sim.name; })[0]; if (p && d.policy) p.doc = JSON.parse(d.policy); },
  del: function (st) { var r = find(S.roles, st.sim.role); if (r) r.inline = (r.inline || []).filter(function (x) { return x.name !== st.sim.name; }); },
  read: function (st) { var r = find(S.roles, st.sim.role); return r && (r.inline || []).some(function (x) { return x.name === st.sim.name; }) ? { cfg: {}, computed: {} } : null; }
};

// ---------- Layers / custom domain / alarms / metrics / PartiQL ----------
API.createLayer = function (o) {
  var er = {}, n = String(o.name || ""), f = o.file ? fsRead(o.file) : null;
  if (!n) er.name = "ต้องกรอกชื่อ layer"; else if (!/^[A-Za-z0-9_-]{1,140}$/.test(n)) er.name = "ValidationException: layer name ใช้ตัวอักษร ตัวเลข - _ (ไม่เกิน 140 ตัว)";
  if (!o.file || f === null || String(f).indexOf("PK") !== 0) er.file = "InvalidParameterValueException: Uploaded file must be a non-empty zip (สร้างด้วยคำสั่ง zip ในเทอร์มินัลก่อน เช่น zip layer.zip app.py)";
  if (!(o.runtimes || []).length) er.runtimes = "ต้องเลือก compatible runtime อย่างน้อย 1";
  if (Object.keys(er).length) return { errors: er };
  var l = S.layers.filter(function (x) { return x.name === n; })[0]; if (!l) { l = { id: n, name: n, versions: [], born: Date.now() }; S.layers.push(l); }
  var v = { v: l.versions.length + 1, desc: o.desc || "", runtimes: o.runtimes.slice(), born: Date.now(), arn: "arn:aws:lambda:" + REGION + ":" + ACCOUNT + ":layer:" + n + ":" + (l.versions.length + 1) }; l.versions.push(v); return { res: l };
};
API.deleteLayer = function (n) { S.layers = S.layers.filter(function (x) { return x.name !== n; }); return { res: true }; };
API.createApiDomain = function (o) {
  var er = {}, n = String(o.name || "").toLowerCase(), c = S.certs.filter(function (x) { return x.arn === o.cert; })[0];
  if (!/^(\*\.)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(n)) er.name = "BadRequestException: Domain name ไม่ถูกต้อง (เช่น api.pharmacy.example.com)"; else if (S.adoms.some(function (d) { return d.name === n; })) er.name = "ConflictException: The domain name you provided already exists.";
  if (!c) er.cert = "BadRequestException: ต้องเลือก ACM certificate"; else if (acmStatus(c) !== "ISSUED") er.cert = "BadRequestException: Certificate " + c.names[0] + " ยังไม่ Issued (สถานะ " + acmStatus(c) + ") · สร้าง CNAME ตรวจสอบก่อน";
  else if (!c.names.some(function (x) { return x === n || (x.slice(0, 2) === "*." && n.split(".").slice(1).join(".") === x.slice(2)); })) er.cert = "BadRequestException: Certificate ไม่ครอบชื่อ " + n + " (ครอบ " + c.names.join(", ") + ")";
  else if ((o.type || "REGIONAL") === "EDGE" ? c.region && c.region !== "us-east-1" : c.region && c.region !== REGION) er.cert = "BadRequestException: Certificate ต้องอยู่ region เดียวกับ endpoint (REGIONAL = " + REGION + " · EDGE = us-east-1) แต่นี่อยู่ " + c.region;
  if (Object.keys(er).length) return { errors: er };
  var d = { id: n, name: n, cert: c.arn, type: o.type || "REGIONAL", target: "d-" + fakeId("", 10, "abcdefghijklmnopqrstuvwxyz0123456789") + ".execute-api." + REGION + ".amazonaws.com", born: Date.now() }; S.adoms.push(d); return { res: d };
};
API.deleteApiDomain = function (n) { S.adoms = S.adoms.filter(function (x) { return x.name !== n; }); return { res: true }; };
// metric รวมของ sim (นับตั้งแต่เริ่ม lab): ใช้ทั้งหน้า All metrics และ alarm
function slsMetrics() {
  var m = [];
  S.lams.forEach(function (l) { m.push(["AWS/Lambda", "Invocations", "FunctionName=" + l.name, l.inv], ["AWS/Lambda", "Errors", "FunctionName=" + l.name, l.errs]); });
  S.apis.forEach(function (a) { m.push(["AWS/ApiGateway", "Count", "ApiId=" + a.id + " (" + a.name + ")", a.reqs || 0], ["AWS/ApiGateway", "4xx", "ApiId=" + a.id + " (" + a.name + ")", a.e4 || 0], ["AWS/ApiGateway", "5xx", "ApiId=" + a.id + " (" + a.name + ")", a.e5 || 0]); });
  S.ddb.forEach(function (t) { m.push(["AWS/DynamoDB", "ItemCount", "TableName=" + t.name, t.items.length]); });
  S.esvcs.forEach(function (s) { m.push(["ECS/ContainerInsights", "RunningTaskCount", "ServiceName=" + s.name + ",ClusterName=" + s.cluster, ecsEval(s).running]); });
  return m;
}
API.createAlarm = function (o) {
  var er = {}, n = String(o.name || "");
  if (!n) er.name = "ต้องกรอกชื่อ alarm"; else if (S.alarms.some(function (a) { return a.name === n; })) er.name = "ชื่อ alarm ซ้ำ (การสร้างซ้ำจะเขียนทับ)";
  if (!slsMetrics().some(function (x) { return x[0] + "|" + x[1] + "|" + x[2] === o.metric; })) er.metric = "ต้องเลือก metric";
  if (!(+o.threshold >= 0)) er.threshold = "Threshold ต้องเป็นตัวเลข ≥ 0";
  if (Object.keys(er).length) return { errors: er };
  var a = { id: n, name: n, metric: o.metric, threshold: +o.threshold, op: o.op || ">=", born: Date.now() }; S.alarms.push(a); return { res: a };
};
function slsAlarmState(a) { var x = slsMetrics().filter(function (m) { return m[0] + "|" + m[1] + "|" + m[2] === a.metric; })[0]; if (!x) return "INSUFFICIENT_DATA"; var v = x[3]; return (a.op === ">" ? v > a.threshold : a.op === "<" ? v < a.threshold : v >= a.threshold) ? "ALARM" : "OK"; }
// PartiQL แบบย่อ: SELECT / INSERT / UPDATE / DELETE บน table เดียว
function slsPartiql(sql) {
  var q = String(sql || "").trim().replace(/;$/, ""), m;
  function bad() { return { err: "ValidationException: Statement wasn't well formed, can't be processed: " + (q ? "Unexpected token near '" + q.split(/\s+/).slice(0, 3).join(" ") + "'" : "empty statement") }; }
  function tbl(n) { var t = slsTbl(n.replace(/^"|"$/g, "")); return t || null; }
  function where(w, t) { if (!w) return function () { return true; }; var c = /^(\w+)\s*=\s*'?([^']*)'?$/.exec(w.trim()); if (!c) return null; return function (it) { return String(it[c[1]]) === c[2]; }; }
  function missing(n) { return { err: "ResourceNotFoundException: Requested resource not found: Table: " + n.replace(/"/g, "") + " not found" }; }
  if ((m = /^SELECT\s+(\*|[\w, ]+)\s+FROM\s+("[^"]+"|\w+)(?:\s+WHERE\s+(.+))?$/i.exec(q))) { var t = tbl(m[2]); if (!t) return missing(m[2]); var f = where(m[3]); if (!f) return bad(); var rows = t.items.filter(f); if (m[1] !== "*") { var cols = m[1].split(",").map(function (x) { return x.trim(); }); rows = rows.map(function (r) { var o = {}; cols.forEach(function (c) { if (r[c] !== undefined) o[c] = r[c]; }); return o; }); } return { rows: rows, msg: "Completed · " + rows.length + " items returned" }; }
  if ((m = /^INSERT\s+INTO\s+("[^"]+"|\w+)\s+VALUE\s+(\{[\s\S]*\})$/i.exec(q))) { var t2 = tbl(m[1]); if (!t2) return missing(m[1]); var it; try { it = JSON.parse(m[2].replace(/'/g, '"')); } catch (e) { return bad(); } if (it[t2.key] !== undefined && t2.items.some(function (x) { return String(x[t2.key]) === String(it[t2.key]); })) return { err: "DuplicateItemException: Duplicate primary key exists in table" }; var r = API.putItem(t2.name, it); return r.errors ? { err: String(r.errors[Object.keys(r.errors)[0]]) } : { rows: [], msg: "Completed · 1 item inserted" }; }
  if ((m = /^UPDATE\s+("[^"]+"|\w+)\s+SET\s+(\w+)\s*=\s*('[^']*'|[\d.]+)\s+WHERE\s+(.+)$/i.exec(q))) { var t3 = tbl(m[1]); if (!t3) return missing(m[1]); var f3 = where(m[4]); if (!f3) return bad(); var n3 = 0; t3.items.forEach(function (x) { if (f3(x)) { x[m[2]] = m[3][0] === "'" ? m[3].slice(1, -1) : +m[3]; n3++; } }); return { rows: [], msg: "Completed · " + n3 + " item(s) updated" }; }
  if ((m = /^DELETE\s+FROM\s+("[^"]+"|\w+)\s+WHERE\s+(.+)$/i.exec(q))) { var t4 = tbl(m[1]); if (!t4) return missing(m[1]); var f4 = where(m[2]); if (!f4) return bad(); var b = t4.items.length; t4.items = t4.items.filter(function (x) { return !f4(x); }); return { rows: [], msg: "Completed · " + (b - t4.items.length) + " item(s) deleted" }; }
  return bad();
}
// Logs Insights แบบย่อ: fields / filter @message like /x/ / sort / limit / stats count(*)
function slsInsights(group, query) {
  var lg = S.lamLogs.filter(function (x) { return x.group === group; }), rows = [];
  S.esvcs.forEach(function (s) { var td = ecsTdByRef(s.td); if (td && td.containers[0].logGroup === group) ecsEval(s).tasks.forEach(function (t) { (t.logs || []).forEach(function (l) { rows.push({ stream: (td.containers[0].logPrefix || "api") + "/" + td.containers[0].name + "/" + t.id.slice(0, 8), msg: l }); }); }); });
  lg.forEach(function (x) { x.lines.forEach(function (l) { x.stream && String(l).split("\n").forEach(function (ln) { rows.push({ stream: x.stream, msg: ln }); }); }); });
  var parts = String(query || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean), lim = 1000, stats = false;
  for (var i = 0; i < parts.length; i++) { var p = parts[i], m;
    if (/^fields\b/i.test(p) || /^sort\b/i.test(p)) continue;
    if ((m = /^filter\s+@message\s+like\s+\/(.*)\/$/i.exec(p))) { var re; try { re = new RegExp(m[1], "i"); } catch (e) { return { err: "MalformedQueryException: invalid regex /" + m[1] + "/" }; } rows = rows.filter(function (r) { return re.test(r.msg); }); continue; }
    if ((m = /^limit\s+(\d+)$/i.exec(p))) { lim = +m[1]; continue; }
    if (/^stats\s+count\(\*\)$/i.test(p)) { stats = true; continue; }
    return { err: "MalformedQueryException: unexpected symbol found " + p.split(/\s+/)[0] + " at line 1 and position " + String(query).indexOf(p) };
  }
  if (stats) return { rows: [{ "count(*)": rows.length }] };
  return { rows: rows.slice(0, lim).map(function (r) { return { "@timestamp": new Date().toISOString().replace("T", " ").slice(0, 23), "@message": r.msg, "@logStream": r.stream }; }) };
}
