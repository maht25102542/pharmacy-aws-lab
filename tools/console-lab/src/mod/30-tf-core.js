// ===== Terraform แบบจำลอง (1/3): schema, โหลดโค้ด, ตรวจ (validate), ประเมินค่า =====
// ใช้ตัวอ่าน HCL จริง (10-hcl.js) กับไฟล์ .tf ใน laptop จึงแก้โค้ดแล้ว plan ใหม่ได้
var TF_META = ["count", "for_each", "depends_on", "lifecycle", "provider"];
function sch(args, req, blocks, inPlace, computed) { return { args: args, req: req || [], blocks: blocks || {}, inPlace: inPlace || ["tags"], computed: computed || ["id", "arn"] }; }
var TF_SCHEMA = {
  aws_vpc: sch(["cidr_block", "enable_dns_hostnames", "enable_dns_support", "instance_tenancy", "tags"], ["cidr_block"], {}, ["tags", "enable_dns_hostnames", "enable_dns_support"], ["id", "arn", "main_route_table_id", "default_security_group_id", "owner_id"]),
  aws_internet_gateway: sch(["vpc_id", "tags"], [], {}, ["tags"]),
  aws_subnet: sch(["vpc_id", "cidr_block", "availability_zone", "map_public_ip_on_launch", "tags"], ["vpc_id", "cidr_block"], {}, ["tags", "map_public_ip_on_launch"]),
  aws_route_table: sch(["vpc_id", "route", "tags"], ["vpc_id"], { route: { args: ["cidr_block", "gateway_id"], req: ["cidr_block"] } }, ["tags", "route"]),
  aws_route_table_association: sch(["subnet_id", "route_table_id"], ["route_table_id"], {}, [], ["id"]),
  aws_security_group: sch(["name", "name_prefix", "description", "vpc_id", "ingress", "egress", "revoke_rules_on_delete", "tags"], [], { ingress: { args: ["from_port", "to_port", "protocol", "cidr_blocks", "ipv6_cidr_blocks", "security_groups", "self", "description"], req: ["from_port", "to_port", "protocol"] }, egress: { args: ["from_port", "to_port", "protocol", "cidr_blocks", "ipv6_cidr_blocks", "security_groups", "self", "description"], req: ["from_port", "to_port", "protocol"] } }, ["tags", "ingress", "egress"]),
  aws_key_pair: sch(["key_name", "key_name_prefix", "public_key", "tags"], ["public_key"], {}, ["tags"], ["id", "arn", "fingerprint", "key_pair_id"]),
  aws_iam_role: sch(["name", "assume_role_policy", "description", "path", "tags"], ["assume_role_policy"], {}, ["tags", "description"]),
  aws_iam_role_policy_attachment: sch(["role", "policy_arn"], ["role", "policy_arn"], {}, [], ["id"]),
  aws_iam_instance_profile: sch(["name", "role", "path", "tags"], [], {}, ["tags", "role"]),
  aws_ecr_repository: sch(["name", "force_delete", "image_tag_mutability", "tags"], ["name"], {}, ["tags", "force_delete", "image_tag_mutability"], ["id", "arn", "repository_url"]),
  aws_instance: sch(["ami", "instance_type", "subnet_id", "key_name", "vpc_security_group_ids", "iam_instance_profile", "associate_public_ip_address", "user_data", "metadata_options", "root_block_device", "tags"], ["ami", "instance_type"], { metadata_options: { args: ["http_tokens", "http_put_response_hop_limit", "http_endpoint"], req: [] }, root_block_device: { args: ["volume_size", "volume_type", "delete_on_termination"], req: [] } }, ["tags", "instance_type", "vpc_security_group_ids", "iam_instance_profile"], ["id", "arn", "public_ip", "private_ip", "public_dns", "instance_state"]),
  aws_lb: sch(["name", "load_balancer_type", "internal", "security_groups", "subnets", "tags"], [], {}, ["tags"], ["id", "arn", "dns_name", "vpc_id"]),
  aws_lb_target_group: sch(["name", "port", "protocol", "vpc_id", "target_type", "health_check", "tags"], [], { health_check: { args: ["path", "port", "protocol", "interval", "timeout", "healthy_threshold", "unhealthy_threshold", "matcher", "enabled"], req: [] } }, ["tags", "health_check"]),
  aws_lb_target_group_attachment: sch(["target_group_arn", "target_id", "port"], ["target_group_arn", "target_id"], {}, [], ["id"]),
  aws_lb_listener: sch(["load_balancer_arn", "port", "protocol", "default_action", "tags"], ["load_balancer_arn"], { default_action: { args: ["type", "target_group_arn"], req: ["type"] } }, ["tags"]),
  local_file: sch(["filename", "content", "file_permission", "directory_permission"], ["filename"], {}, [], ["id"])
};
var TF_DATA_SCHEMA = {
  aws_availability_zones: { args: ["state", "all_availability_zones"], req: [], blocks: {} },
  aws_ami: { args: ["most_recent", "owners", "name_regex", "filter"], req: [], blocks: { filter: { args: ["name", "values"], req: ["name", "values"] } } },
  aws_caller_identity: { args: [], req: [], blocks: {} },
  aws_iam_policy_document: { args: ["version", "statement"], req: [], blocks: { statement: { args: ["effect", "actions", "resources", "principals", "sid"], req: [], blocks: { principals: { args: ["type", "identifiers"], req: ["type", "identifiers"] } } } } }
};
function tfAttrsOf(items) { var o = {}; items.forEach(function (i) { if (i.kind === "attr") o[i.name] = i; }); return o; }
function tfLoad(files) {
  var cfg = { files: files, vars: {}, locals: {}, res: {}, data: {}, outputs: {}, providers: {}, terraform: null, errors: [] };
  function err(file, line, summary, detail, ctx) { cfg.errors.push({ file: file, line: line, summary: summary, detail: detail, ctx: ctx || "" }); }
  Object.keys(files).sort().forEach(function (fn) {
    var items; try { items = hclParse(files[fn], fn); } catch (e) { err(fn, e.hcl ? e.hcl.line : 0, "Invalid syntax", e.message); return; }
    items.forEach(function (it) {
      if (it.kind === "attr") { err(fn, it.line, "Unsupported argument", "An argument named \"" + it.name + "\" is not expected here."); return; }
      var l = it.labels;
      if (it.type === "variable") cfg.vars[l[0]] = { name: l[0], file: fn, line: it.line, attrs: tfAttrsOf(it.body) };
      else if (it.type === "locals") it.body.forEach(function (a) { if (a.kind === "attr") cfg.locals[a.name] = { name: a.name, file: fn, line: a.line, expr: a.expr }; });
      else if (it.type === "output") cfg.outputs[l[0]] = { name: l[0], file: fn, line: it.line, attrs: tfAttrsOf(it.body) };
      else if (it.type === "provider") cfg.providers[l[0]] = { file: fn, line: it.line, body: it.body };
      else if (it.type === "terraform") cfg.terraform = { file: fn, line: it.line, body: it.body };
      else if (it.type === "resource" || it.type === "data") {
        var addr = (it.type === "data" ? "data." : "") + l[0] + "." + l[1], tbl = it.type === "data" ? cfg.data : cfg.res;
        if (l.length !== 2) { err(fn, it.line, "Invalid block definition", "Either a quoted string block label or an opening brace (\"{\") is expected here."); return; }
        if (tbl[addr]) { err(fn, it.line, "Duplicate " + it.type + " configuration", "A " + it.type + " named \"" + l[1] + "\" was already declared at " + tbl[addr].file + ":" + tbl[addr].line + "."); return; }
        tbl[addr] = { addr: addr, kind: it.type, type: l[0], name: l[1], file: fn, line: it.line, body: it.body, attrs: tfAttrsOf(it.body) };
      } else err(fn, it.line, "Unsupported block type", "Blocks of type \"" + it.type + "\" are not expected here.");
    });
  });
  return cfg;
}
function tfCheckBody(cfg, node, items, spec, path, err) {
  var names = {}; var allowed = spec.args.concat(Object.keys(spec.blocks || {}));
  items.forEach(function (i) {
    names[i.kind === "attr" ? i.name : i.type] = 1;
    if (i.kind === "attr") {
      if (!path && TF_META.indexOf(i.name) >= 0) return;
      if (spec.args.indexOf(i.name) < 0) err(node, i.line, "Unsupported argument", "An argument named \"" + i.name + "\" is not expected here.");
    } else {
      if (!path && TF_META.indexOf(i.type) >= 0) return;
      var bs = spec.blocks && spec.blocks[i.type];
      if (!bs) err(node, i.line, "Unsupported block type", "Blocks of type \"" + i.type + "\" are not expected here.");
      else tfCheckBody(cfg, node, i.body, bs, i.type, err);
    }
  });
  (spec.req || []).forEach(function (r) { if (!names[r]) err(node, node.line, "Missing required argument", "The argument \"" + r + "\" is required, but no definition was found."); });
}
function tfValidate(cfg) {
  var errs = cfg.errors.slice();
  function err(node, line, summary, detail) { errs.push({ file: node.file, line: line, summary: summary, detail: detail, ctx: node.kind === "data" ? "in data \"" + node.type + "\" \"" + node.name + "\"" : "in resource \"" + node.type + "\" \"" + node.name + "\"", addr: node.addr }); }
  Object.keys(cfg.res).forEach(function (a) {
    var n = cfg.res[a], sc = TF_SCHEMA[n.type];
    if (!sc) { err(n, n.line, "Invalid resource type", "The provider " + (/^local_/.test(n.type) ? "hashicorp/local" : "hashicorp/aws") + " does not support resource type \"" + n.type + "\" (หรือชนิดนี้ Console Lab ยังไม่ได้จำลอง ชนิดที่จำลอง: " + Object.keys(TF_SCHEMA).join(", ") + ")."); return; }
    tfCheckBody(cfg, n, n.body, sc, "", err);
  });
  Object.keys(cfg.data).forEach(function (a) {
    var n = cfg.data[a], sc = TF_DATA_SCHEMA[n.type];
    if (!sc) { err(n, n.line, "Invalid data source", "The provider hashicorp/aws does not support data source \"" + n.type + "\" (หรือ Console Lab ยังไม่ได้จำลอง)."); return; }
    tfCheckBody(cfg, n, n.body, sc, "", err);
  });
  // อ้างถึงของที่ไม่มี
  function chk(node, expr, ctxLabel) {
    tfDepsOf(expr).forEach(function (d) {
      var m;
      if ((m = /^var\.(.+)$/.exec(d)) && !cfg.vars[m[1]]) errs.push({ file: node.file, line: node.line, summary: "Reference to undeclared input variable", detail: "An input variable with the name \"" + m[1] + "\" has not been declared. This variable can be declared with a variable \"" + m[1] + "\" {} block.", ctx: ctxLabel });
      else if ((m = /^local\.(.+)$/.exec(d)) && !cfg.locals[m[1]]) errs.push({ file: node.file, line: node.line, summary: "Reference to undeclared local value", detail: "A local value with the name \"" + m[1] + "\" has not been declared.", ctx: ctxLabel });
      else if (/^data\./.test(d) && !cfg.data[d]) errs.push({ file: node.file, line: node.line, summary: "Reference to undeclared resource", detail: "A data resource \"" + d.split(".")[1] + "\" \"" + d.split(".")[2] + "\" has not been declared in the root module.", ctx: ctxLabel });
      else if (/^[a-z0-9]+_[a-z0-9_]+\./.test(d) && !/^(var|local|data)\./.test(d) && !cfg.res[d]) errs.push({ file: node.file, line: node.line, summary: "Reference to undeclared resource", detail: "A managed resource \"" + d.split(".")[0] + "\" \"" + d.split(".")[1] + "\" has not been declared in the root module.", ctx: ctxLabel });
    });
  }
  function walkItems(node, items, ctxLabel) { items.forEach(function (i) { if (i.kind === "attr") chk(node, i.expr, ctxLabel); else walkItems(node, i.body, ctxLabel); }); }
  Object.keys(cfg.res).forEach(function (a) { var n = cfg.res[a]; walkItems(n, n.body, "in resource \"" + n.type + "\" \"" + n.name + "\""); });
  Object.keys(cfg.data).forEach(function (a) { var n = cfg.data[a]; walkItems(n, n.body, "in data \"" + n.type + "\" \"" + n.name + "\""); });
  Object.keys(cfg.locals).forEach(function (k) { chk(cfg.locals[k], cfg.locals[k].expr, "in locals"); });
  Object.keys(cfg.outputs).forEach(function (k) { var o = cfg.outputs[k]; if (o.attrs.value) chk(o, o.attrs.value.expr, "in output \"" + k + "\""); });
  return errs;
}
function tfDepsOf(expr) { return hclDeps(expr); }
// ---- ลำดับการทำงาน (topological) ตามการอ้างถึงกัน
function tfNodeDeps(cfg, node) {
  var d = [];
  (function walk(items) { items.forEach(function (i) { if (i.kind === "attr") d = d.concat(hclDeps(i.expr)); else walk(i.body); }); })(node.body);
  var depsOn = node.attrs.depends_on; if (depsOn) d = d.concat(hclDeps(depsOn.expr));
  var seen = {}; return d.filter(function (x) { if (seen[x] || x === node.addr || /^(var|local)\./.test(x)) return false; if (!cfg.res[x] && !cfg.data[x]) return false; seen[x] = 1; return true; });
}
function tfOrder(cfg) {
  var nodes = {}; Object.keys(cfg.data).forEach(function (a) { nodes[a] = cfg.data[a]; }); Object.keys(cfg.res).forEach(function (a) { nodes[a] = cfg.res[a]; });
  var order = [], mark = {};
  function visit(a, stack) {
    if (mark[a] === 2) return; if (mark[a] === 1) { var cyc = stack.slice(stack.indexOf(a)).concat([a]); var e = new Error("Cycle: " + cyc.join(", ")); e.tfCycle = cyc; throw e; }
    mark[a] = 1; var n = nodes[a]; n.deps = tfNodeDeps(cfg, n); n.deps.forEach(function (d) { visit(d, stack.concat([a])); }); mark[a] = 2; order.push(n);
  }
  Object.keys(nodes).sort().forEach(function (a) { visit(a, []); });
  return order;
}
// ---- ค่า unknown / การประเมิน
function tfHasUnknown(v) { if (isUnknown(v)) return true; if (Array.isArray(v)) return v.some(tfHasUnknown); if (v && typeof v === "object") return Object.keys(v).some(function (k) { return k.indexOf("__") !== 0 && tfHasUnknown(v[k]); }); return false; }
function tfStrip(v) { if (isUnknown(v)) return "(known after apply)"; if (Array.isArray(v)) return v.map(tfStrip); if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { if (k.indexOf("__") !== 0) o[k] = tfStrip(v[k]); }); return o; } return v; }
function tfEvalBody(items, ctx) {
  var o = {};
  items.forEach(function (it) {
    if (it.kind === "attr") { if (TF_META.indexOf(it.name) >= 0 && !ctx.keepMeta) return; o[it.name] = hclEval(it.expr, ctx); }
    else { if (TF_META.indexOf(it.type) >= 0) return; (o[it.type] = o[it.type] || []).push(tfEvalBody(it.body, ctx)); }
  });
  return o;
}
function tfMultiObj(instMap, kind) { var o = { __multi: true }; Object.keys(instMap).forEach(function (k) { o[k] = instMap[k]; }); return o; }
function tfMakeEnv(cfg, varVals) {
  var env = { cfg: cfg, vars: varVals, res: {}, data: {}, locals: {}, busy: {}, defaultTags: {}, region: "ap-southeast-1" };
  env.baseCtx = function (node) {
    var ctx = { file: node ? node.file : "", vars: {}, home: HOME, readFile: function (p) { return fsRead(normPath(p, REPO + "/terraform")); },
      lookup: function (n) {
        if (Object.prototype.hasOwnProperty.call(this.vars, n)) return this.vars[n];
        if (n === "var") return env.vars;
        if (n === "local") return env.localObj;
        if (n === "data") return env.dataObj;
        if (n === "path") return { module: ".", root: ".", cwd: "." };
        if (n === "terraform") return { workspace: "default" };
        if (n === "count" && this.count) return this.count;
        if (n === "each" && this.each) return this.each;
        if (env.resObj[n]) return env.resObj[n];
        throw hclErr("Reference to undeclared resource; A managed resource \"" + n + "\" has not been declared in the root module.", this.file, 0);
      },
      child: function () { var c = Object.create(ctx); c.vars = Object.assign({}, ctx.vars); return c; } };
    return ctx;
  };
  env.localObj = {}; Object.keys(cfg.locals).forEach(function (k) {
    Object.defineProperty(env.localObj, k, { enumerable: true, get: function () {
      if (k in env.locals) return env.locals[k]; if (env.busy["local." + k]) throw hclErr("Cycle: local." + k, cfg.locals[k].file, cfg.locals[k].line);
      env.busy["local." + k] = 1; env.locals[k] = hclEval(cfg.locals[k].expr, env.baseCtx(cfg.locals[k])); delete env.busy["local." + k]; return env.locals[k]; } });
  });
  env.dataObj = {}; Object.keys(cfg.data).forEach(function (a) { var n = cfg.data[a]; env.dataObj[n.type] = env.dataObj[n.type] || {}; Object.defineProperty(env.dataObj[n.type], n.name, { enumerable: true, get: function () { if (!(a in env.data)) throw hclErr("Data source " + a + " ยังไม่ถูกอ่าน", n.file, n.line); return env.data[a]; } }); });
  env.resObj = {}; Object.keys(cfg.res).forEach(function (a) { var n = cfg.res[a]; env.resObj[n.type] = env.resObj[n.type] || {}; Object.defineProperty(env.resObj[n.type], n.name, { enumerable: true, get: function () { if (!(a in env.res)) throw hclErr("Reference to resource " + a + " before it is evaluated", n.file, n.line); var r = env.res[a]; return r.multi ? tfMultiObj(r.inst) : r.inst[""]; } }); });
  return env;
}
// ตัวแปร: tfvars + -var + default; ที่ยังขาด (ไม่มี default) คืนใน missing
function tfVarValues(cfg, tfvarsText, cli) {
  var given = {}, missing = [], vals = {}, errs = [];
  function addAttrs(text, fn) { hclParse(text, fn).forEach(function (i) { if (i.kind === "attr") given[i.name] = hclEval(i.expr, { file: fn, vars: {}, lookup: function (n) { throw hclErr("Variables not allowed", fn, i.line); }, child: function () { return this; } }); }); }
  try { if (tfvarsText) addAttrs(tfvarsText, "terraform.tfvars"); } catch (e) { errs.push({ file: "terraform.tfvars", line: e.hcl ? e.hcl.line : 0, summary: "Invalid syntax", detail: e.message }); }
  Object.keys(cli || {}).forEach(function (k) { given[k] = cli[k]; });
  Object.keys(cfg.vars).forEach(function (k) {
    var v = cfg.vars[k];
    if (k in given) vals[k] = given[k];
    else if (v.attrs.default) vals[k] = hclEval(v.attrs.default.expr, { file: v.file, vars: {}, lookup: function () { throw hclErr("Variables may not be used here.", v.file, v.line); }, child: function () { return this; } });
    else missing.push(k);
  });
  return { vals: vals, missing: missing, errs: errs };
}
