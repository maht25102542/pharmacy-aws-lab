// ===== ส่วนเสริมที่ทำให้แท็บ/หน้าที่เคยเป็นสีเทาใช้งานได้: Lambda versions/aliases, API CORS, DynamoDB GSI + deletion protection =====
API.publishVersion = function (name, desc) {
  var l = slsLam(name); if (!l) return E("_", "ResourceNotFoundException: Function not found: " + slsFnArn(name));
  l.versions = l.versions || []; var last = l.versions[l.versions.length - 1];
  if (last && last.rev === (l.rev || 0)) return { res: last, same: true }; // ไม่มีอะไรเปลี่ยนตั้งแต่ version ล่าสุด: Lambda คืน version เดิม
  var v = { v: l.versions.length + 1, rev: l.rev || 0, desc: desc || "", born: Date.now(), memory: l.memory, timeout: l.timeout, env: Object.assign({}, l.env) }; l.versions.push(v); return { res: v };
};
API.createAlias = function (name, o) {
  var l = slsLam(name); if (!l) return E("_", "ResourceNotFoundException: Function not found: " + slsFnArn(name));
  var n = String(o.name || ""); if (!/^(?!^[0-9]+$)([a-zA-Z0-9-_]+)$/.test(n)) return E("name", "ValidationException: alias ใช้ตัวอักษร ตัวเลข - _ และห้ามเป็นตัวเลขล้วน");
  l.aliases = l.aliases || []; if (l.aliases.some(function (a) { return a.name === n; })) return E("name", "ResourceConflictException: Alias already exists: " + slsFnArn(name) + ":" + n);
  var ver = String(o.version || "$LATEST"); if (ver !== "$LATEST" && !(l.versions || []).some(function (v) { return String(v.v) === ver; })) return E("version", "ResourceNotFoundException: Function not found: " + slsFnArn(name) + ":" + ver);
  var a = { name: n, version: ver, born: Date.now(), desc: o.desc || "" }; l.aliases.push(a); return { res: a };
};
API.deleteAlias = function (name, alias) { var l = slsLam(name); if (l) l.aliases = (l.aliases || []).filter(function (a) { return a.name !== alias; }); return { res: true }; };
API.setApiCors = function (id, o) {
  var a = slsApi(id); if (!a) return E("_", "NotFoundException: Invalid API identifier specified");
  var origins = String(o.origins || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
  if (origins.indexOf("*") >= 0 && o.credentials) return E("origins", "BadRequestException: Access-Control-Allow-Origin ห้ามเป็น * เมื่อเปิด Access-Control-Allow-Credentials");
  var bad = origins.filter(function (x) { return x !== "*" && !/^https?:\/\/[^\s/]+$/.test(x); }); if (bad.length) return E("origins", "BadRequestException: origin ต้องเป็น scheme://host[:port] ไม่มี path (" + bad[0] + ")");
  a.cors = { origins: origins, methods: String(o.methods || "").split(",").map(function (x) { return x.trim().toUpperCase(); }).filter(Boolean), headers: String(o.headers || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean), maxAge: +o.maxAge || 0, credentials: !!o.credentials }; return { res: a };
};
API.createGsi = function (table, o) {
  var t = slsTbl(table); if (!t) return E("_", "ResourceNotFoundException: Requested resource not found: Table: " + table + " not found");
  t.gsis = t.gsis || []; var n = String(o.name || "");
  if (!/^[A-Za-z0-9_.-]{3,255}$/.test(n)) return E("name", "ValidationException: ชื่อ index ใช้ตัวอักษร ตัวเลข _ . - ยาว 3-255 ตัว");
  if (t.gsis.some(function (g) { return g.name === n; })) return E("name", "ValidationException: One or more parameter values were not valid. Index already exists: " + n);
  if (!o.key || o.key === t.key && false) return E("key", "ValidationException: ต้องกำหนด partition key ของ index");
  if (t.billing === "PROVISIONED" && !(+o.rcu > 0 && +o.wcu > 0)) return E("rcu", "ValidationException: table แบบ Provisioned ต้องกำหนด read/write capacity ของ index");
  var g = { name: n, key: o.key, keyType: o.keyType || "S", projection: o.projection || "ALL", status: "ACTIVE", born: Date.now() }; t.gsis.push(g); return { res: g };
};
API.setDdbProtection = function (table, on) { var t = slsTbl(table); if (!t) return E("_", "ResourceNotFoundException: Requested resource not found: Table: " + table + " not found"); t.protect = !!on; return { res: t }; };
// deletion protection: ทับ deleteDdbTable เดิม
(function () { var orig = API.deleteDdbTable; API.deleteDdbTable = function (n) { var t = slsTbl(n); if (t && t.protect) return E("_", "ValidationException: Resource cannot be deleted as it is currently protected against deletion. Disable deletion protection first."); return orig(n); }; })();
// Terraform: aws_dynamodb_table.deletion_protection_enabled + global_secondary_index
TF_SCHEMA.aws_dynamodb_table.args.push("deletion_protection_enabled", "global_secondary_index");
TF_SCHEMA.aws_dynamodb_table.blocks.global_secondary_index = { args: ["name", "hash_key", "projection_type", "read_capacity", "write_capacity"], req: ["name", "hash_key", "projection_type"] };
TF_SCHEMA.aws_dynamodb_table.inPlace.push("deletion_protection_enabled", "global_secondary_index");
(function () {
  var p = TF_PROV.aws_dynamodb_table, oc = p.create, ou = p.update;
  p.create = function (c) { var r = oc(c), a = c.attrs, t = slsTbl(r.sim.name); t.protect = !!a.deletion_protection_enabled; (a.global_secondary_index || []).forEach(function (g) { var attr = (a.attribute || []).filter(function (x) { return x.name === g.hash_key; })[0]; var x = API.createGsi(t.name, { name: g.name, key: g.hash_key, keyType: attr ? attr.type : "S", projection: g.projection_type, rcu: g.read_capacity, wcu: g.write_capacity }); if (x.errors) throw TfAwsError("creating DynamoDB Table (" + a.name + ")", "DynamoDB", "CreateTable", "ValidationException", String(x.errors[Object.keys(x.errors)[0]]).replace(/^[A-Za-z]+: /, "")); }); return r; };
  p.update = function (st, d) { ou(st, d); var t = slsTbl(st.sim.name); if (t && d.deletion_protection_enabled !== undefined) t.protect = !!d.deletion_protection_enabled; };
  var od = p.del; p.del = function (st) { var r = API.deleteDdbTable(st.sim.name); if (r.errors) throw TfAwsError("deleting DynamoDB Table (" + st.sim.name + ")", "DynamoDB", "DeleteTable", "ValidationException", String(r.errors._).replace(/^[A-Za-z]+: /, "")); void od; };
})();
