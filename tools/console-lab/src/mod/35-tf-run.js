// ===== Terraform แบบจำลอง (3/3): plan / apply / destroy / state / output และการจัดรูปแบบข้อความ =====
function tagList(tags) { return Object.keys(tags || {}).filter(function (k) { return k !== "Name"; }).map(function (k) { return { k: k, v: tags[k] }; }); }
function tfSortedKeys(a) { return (a || []).slice().sort(); }
function tfInstLabel(node, key, multi, isCount) { return node.addr + (multi ? (isCount ? "[" + key + "]" : "[" + JSON.stringify(key) + "]") : ""); }

// ---- ข้อความ error รูปแบบเดียวกับ Terraform
function tfFmtError(summary, detail, where) {
  var out = ["╷", "│ Error: " + summary, "│ "];
  if (where) {
    if (where.addr) out.push("│   with " + where.addr + ",");
    if (where.file) out.push("│   on " + where.file + " line " + where.line + (where.ctx ? ", " + where.ctx : "") + ":");
    if (where.file && where.src) out.push("│   " + where.line + ": " + where.src);
    out.push("│ ");
  }
  String(detail || "").split("\n").forEach(function (l) { out.push("│ " + l); });
  out.push("╵"); return out;
}
function tfSrcLine(cfg, file, line) { var t = cfg && cfg.files[file]; return t ? (t.split("\n")[line - 1] || "").replace(/\s+$/, "") : ""; }
function tfErrFrom(e, cfg, node, addr) {
  if (e.tfAws) { var m = /^([^:]+?: operation error [^:]+: [^,]+, https response error StatusCode: \d+, RequestID: [0-9a-f-]+, api error [A-Za-z.]+)(: [\s\S]*)?$/.exec(e.message); return tfFmtError(m ? m[1].replace(/^(.*?): operation error/, "$1: operation error") : e.message, "", node ? { addr: addr, file: node.file, line: node.line, ctx: node.kind === "data" ? "in data \"" + node.type + "\" \"" + node.name + "\"" : "in resource \"" + node.type + "\" \"" + node.name + "\"", src: tfSrcLine(cfg, node.file, node.line) } : null).map(function (l, i) { return l; }); }
  var h = e.hcl || {}, msg = e.message, sm = msg, dt = "";
  var parts = msg.split("; "); if (parts.length > 1 && /^[A-Z]/.test(parts[0]) && parts[0].length < 60) { sm = parts[0]; dt = parts.slice(1).join("; "); }
  var file = h.file || (node && node.file), line = h.line || (node && node.line);
  return tfFmtError(sm, dt, file ? { addr: addr, file: file, line: line, ctx: node ? (node.kind === "data" ? "in data \"" + node.type + "\" \"" + node.name + "\"" : "in resource \"" + node.type + "\" \"" + node.name + "\"") : "", src: tfSrcLine(cfg, file, line) } : (addr ? { addr: addr } : null));
}
// ---- แสดงค่าแบบ Terraform
function tfFmtVal(v, ind, pre) {
  ind = ind || ""; pre = pre || ""; if (v === HCL_UNKNOWN || isUnknown(v)) return "(known after apply)";
  if (v === null || v === undefined) return "null"; if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "string") { if (/^\s*[{\[]/.test(v)) { try { var j = JSON.parse(v); return "jsonencode(\n" + JSON.stringify(j, null, 2).split("\n").map(function (l) { return ind + "    " + pre + l; }).join("\n") + "\n" + ind + "  )"; } catch (e) {} } return JSON.stringify(v); }
  if (Array.isArray(v)) { if (!v.length) return "[]"; return "[\n" + v.map(function (x) { return ind + "    " + pre + tfFmtVal(x, ind + "    ", pre) + ","; }).join("\n") + "\n" + ind + "  ]"; }
  var ks = Object.keys(v).filter(function (k) { return k.indexOf("__") !== 0; }); if (!ks.length) return "{}";
  return "{\n" + ks.map(function (k) { return ind + "    " + pre + JSON.stringify(k) + " = " + tfFmtVal(v[k], ind + "    ", pre); }).join("\n") + "\n" + ind + "  }";
}
function tfOutFmt(v, ind) {
  ind = ind || ""; if (isUnknown(v)) return "(known after apply)"; if (v === null) return "null"; if (typeof v === "string") return JSON.stringify(v); if (typeof v !== "object") return String(v);
  if (Array.isArray(v)) return v.length ? "[\n" + v.map(function (x) { return ind + "  " + tfOutFmt(x, ind + "  ") + ","; }).join("\n") + "\n" + ind + "]" : "[]";
  var ks = Object.keys(v).filter(function (k) { return k.indexOf("__") !== 0; }); if (!ks.length) return "{}";
  return "{\n" + ks.map(function (k) { return ind + "  " + JSON.stringify(k) + " = " + tfOutFmt(v[k], ind + "  "); }).join("\n") + "\n" + ind + "}";
}
// ---- ค่าที่ใช้เปรียบเทียบ (canonical) ระหว่างโค้ดกับ state
function tfCanon(type, attrs, tags, selfId) {
  var o = {}; Object.keys(attrs).forEach(function (k) { o[k] = attrs[k]; });
  var sc = TF_SCHEMA[type];
  if (sc && sc.args.indexOf("tags") >= 0) { o.tags = Object.assign({}, tags || {}); }
  if (type === "aws_security_group") {
    if (!tfHasUnknown(attrs.ingress)) o.__ingress = sgRulesReadable(tfSgFlat(attrs.ingress, selfId || "(self)")); else o.__ingress = HCL_UNKNOWN;
    if (!tfHasUnknown(attrs.egress)) o.__egress = sgRulesReadable(tfSgFlat(attrs.egress, selfId || "(self)")); else o.__egress = HCL_UNKNOWN;
    delete o.ingress; delete o.egress;
  }
  if (type === "aws_instance") { if (o.vpc_security_group_ids && !tfHasUnknown(o.vpc_security_group_ids)) o.vpc_security_group_ids = tfSortedKeys(o.vpc_security_group_ids); }
  if (type === "aws_route_table" && o.route && !tfHasUnknown(o.route)) o.route = o.route.map(function (r) { return { cidr_block: r.cidr_block, gateway_id: r.gateway_id }; });
  return o;
}
function tfStable(v) { if (Array.isArray(v)) return v.map(tfStable); if (v && typeof v === "object") { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = tfStable(v[k]); }); return o; } return v; }
function tfSame(a, b) { return JSON.stringify(tfStable(tfStrip(a))) === JSON.stringify(tfStable(tfStrip(b))); }
function tfDiff(desired, old) {
  var keys = {}, out = []; Object.keys(desired).forEach(function (k) { keys[k] = 1; }); Object.keys(old).forEach(function (k) { keys[k] = 1; });
  Object.keys(keys).sort().forEach(function (k) {
    var d = desired[k], o = old[k];
    if (d === undefined && o === undefined) return;
    if (tfHasUnknown(d)) { out.push({ k: k, old: o, nw: d }); return; }
    if (d === undefined && (o === null || o === "" || (Array.isArray(o) && !o.length) || (o && typeof o === "object" && !Object.keys(o).length))) return;
    if (o === undefined && (d === null || d === false || d === "" || (Array.isArray(d) && !d.length))) return;
    if (!tfSame(d, o)) out.push({ k: k, old: o, nw: d });
  });
  return out;
}
// ---- เตรียมการทำงาน: วิเคราะห์โค้ด + ตัวแปร + login ผู้ใช้ AWS
function tfPrepare(o) {
  var files = tfFilesIn(o.dir), names = Object.keys(files);
  if (!names.length) return { fail: ["╷", "│ Error: No configuration files", "│ ", "│ Plan requires configuration to be present. Planning without a configuration would mark everything for destruction, which is normally not what is desired. If you would like to destroy everything, run Terraform with the -destroy option or create an empty configuration file.", "╵"] };
  var cfg = tfLoad(files), errs = tfValidate(cfg);
  if (errs.length) return { fail: tfFmtErrors(errs, cfg) };
  var tfv = fsRead(o.dir + "/terraform.tfvars"), vv = tfVarValues(cfg, tfv, o.cli);
  if (vv.errs.length) return { fail: tfFmtErrors(vv.errs, cfg) };
  return { cfg: cfg, vars: vv.vals, missing: vv.missing, files: files };
}
function tfFmtErrors(errs, cfg) {
  var out = []; errs.forEach(function (e) { out = out.concat(tfFmtError(e.summary, e.detail, e.file ? { addr: e.addr, file: e.file, line: e.line, ctx: e.ctx, src: tfSrcLine(cfg, e.file, e.line) } : null)); }); return out;
}
function tfRequireInit(out) {
  if (!S.tf.inited) { out.push.apply(out, ["╷", "│ Error: Required plugins are not installed", "│ ", "│ The installed provider plugins are not consistent with the packages selected in the dependency lock file:", "│   - registry.terraform.io/hashicorp/aws: there is no package for registry.terraform.io/hashicorp/aws cached in .terraform/providers", "│ ", "│ Terraform uses external plugins to integrate with a variety of different infrastructure services. To download the plugins required for this configuration, run:", "│   terraform init", "╵"]); return false; }
  return true;
}
// ---- หัวใจ: ประเมินทีละ resource ตามลำดับ แล้วตัดสินใจ create/update/replace/noop (plan) หรือลงมือจริง (apply)
function tfExec(o) {
  var P = o.prep, cfg = P.cfg, env = tfMakeEnv(cfg, P.vars), apply = o.mode === "apply", actions = [], errors = [], log = [], out = o.out;
  var order; try { order = tfOrder(cfg); } catch (e) { if (e.tfCycle) return { fail: tfFmtError("Cycle", "Cycle: " + e.tfCycle.join(", ")) }; throw e; }
  var pv = cfg.providers.aws, who0 = whoAmI();
  if (who0.err) return { fail: tfFmtError("Retrieving AWS account details", "validating provider credentials: retrieving caller identity from STS: operation error STS: GetCallerIdentity, https response error StatusCode: 403, RequestID: " + tfReqId() + ", api error " + who0.err + ": " + who0.msg + (who0.err === "NoCredentialProviders" ? "\nPlease see https://registry.terraform.io/providers/hashicorp/aws for more information about providing credentials." : ""), pv ? { file: pv.file, line: pv.line, ctx: "in provider \"aws\"", src: tfSrcLine(cfg, pv.file, pv.line) } : null) };
  try { if (pv) { var ba = tfEvalBody(pv.body, env.baseCtx({ file: pv.file })); env.region = ba.region || env.region; var dt = ba.default_tags && ba.default_tags[0]; env.defaultTags = (dt && dt.tags) || {}; } } catch (e) { return { fail: tfErrFrom(e, cfg, null, null) }; }
  var wanted = {}, st = S.tf.state, drift = [];
  // refresh: อ่านสถานะจริงจาก AWS จำลองเทียบกับ state
  Object.keys(st).forEach(function (k) {
    var s = st[k], pr = TF_PROV[s.type], rd = pr && pr.read ? pr.read(s) : { cfg: {}, computed: {} };
    if (!rd) { drift.push({ addr: k, gone: true }); delete st[k]; return; }
    var ch = [];
    Object.keys(rd.cfg || {}).forEach(function (ck) {
      if (!(ck in s.cfg)) return;
      var cur = s.cfg[ck], nw = rd.cfg[ck];
      if (ck === "tags" ? !tfSame(Object.assign({}, nw), Object.assign({}, cur)) : !tfSame(nw, cur)) { ch.push({ k: ck, old: cur, nw: nw }); s.cfg[ck] = nw; }
    });
    Object.keys(rd.computed || {}).forEach(function (ck) { if (!tfSame(s.computed[ck], rd.computed[ck])) { if (ck !== "instance_state") ch.push({ k: ck, old: s.computed[ck], nw: rd.computed[ck] }); s.computed[ck] = rd.computed[ck]; } });
    if (ch.length) drift.push({ addr: k, changes: ch });
  });
  var failed = null;
  for (var ni = 0; ni < order.length && !failed; ni++) {
    var node = order[ni];
    try {
      if (node.kind === "data") { var dctx = env.baseCtx(node); var dattrs = tfEvalBody(node.body, dctx); env.data[node.addr] = tfReadData(node, env, dattrs); continue; }
      var instList = tfInstances(node, env), multi = instList.multi, isCount = instList.isCount, resMap = {};
      instList.items.forEach(function (it) { wanted[tfInstLabel(node, it.key, multi, isCount)] = 1; });
      for (var ii = 0; ii < instList.items.length && !failed; ii++) {
        var it = instList.items[ii], addr = tfInstLabel(node, it.key, multi, isCount), ctx = env.baseCtx(node);
        if (isCount) ctx.count = { index: +it.key }; else if (multi) ctx.each = { key: it.key, value: it.value };
        var attrs = tfEvalBody(node.body, ctx), sc = TF_SCHEMA[node.type], tags = null;
        if (sc.args.indexOf("tags") >= 0) tags = Object.assign({}, env.defaultTags, attrs.tags || {});
        var old = st[addr], canon = tfCanon(node.type, attrs, tags, old && old.id), act = "create", diffs = [];
        if (old) { diffs = tfDiff(canon, old.cfg); if (!diffs.length) act = "noop"; else act = diffs.every(function (d) { return sc.inPlace.indexOf(d.k) >= 0 || d.k === "__ingress" || d.k === "__egress"; }) ? "update" : "replace"; if (act === "update" && diffs.some(function (d) { return d.k === "__ingress" || d.k === "__egress"; }) && sc.inPlace.indexOf("ingress") < 0) act = "replace"; }
        var action = { addr: addr, node: node, type: node.type, name: node.name, key: it.key, multi: multi, isCount: isCount, act: act, diffs: diffs, canon: canon, attrs: attrs, tags: tags, old: old, deps: node.deps || [] };
        var value;
        if (apply && act !== "noop") {
          var pr = TF_PROV[node.type];
          try {
            if (pr.act) tfGate(pr.act, "", pr.svc, pr.op);
            if (act === "create" || act === "replace") {
              if (act === "replace") { out.push(addr + ": Destroying... [id=" + old.id + "]"); pr.del(old); delete st[addr]; out.push(addr + ": Destruction complete after 0s"); }
              out.push(addr + ": Creating...");
              var made = pr.create({ attrs: attrs, tags: tags, node: node, key: it.key });
              st[addr] = { type: node.type, name: node.name, key: it.key, id: made.id, cfg: tfStripCanon(tfCanon(node.type, attrs, tags, made.id)), computed: made.computed, sim: made.sim || {}, deps: node.deps || [], file: node.file, line: node.line };
              out.push(addr + ": Creation complete after " + (1 + Math.floor(Math.random() * 3)) + "s [id=" + made.id + "]");
            } else if (act === "update") {
              out.push(addr + ": Modifying... [id=" + old.id + "]");
              pr.update(old, attrs, diffs.map(function (d) { return d.k; }));
              old.cfg = tfStripCanon(canon); out.push(addr + ": Modifications complete after 1s [id=" + old.id + "]");
            }
            action.done = true;
          } catch (e) { failed = { e: e, node: node, addr: addr }; break; }
        }
        var cur = st[addr];
        var comp = cur ? cur.computed : {};
        if (act === "replace" && !apply) comp = {};
        var val = Object.assign({}, attrs); if (sc.args.indexOf("tags") >= 0) val.tags = attrs.tags;
        Object.assign(val, comp); if (!cur || (act === "replace" && !apply) || (act === "create" && !apply)) val.__unknownAttrs = true;
        resMap[it.key] = val; actions.push(action);
      }
      env.res[node.addr] = { multi: multi, inst: multi ? resMap : { "": resMap[""] } };
    } catch (e) { failed = { e: e, node: node, addr: node.addr }; }
  }
  // ของที่อยู่ใน state แต่ไม่อยู่ในโค้ดแล้ว → destroy (ลบย้อนลำดับพึ่งพา)
  var orphans = Object.keys(st).filter(function (k) { return !wanted[k]; });
  orphans.forEach(function (k) { actions.push({ addr: k, type: st[k].type, name: st[k].name, act: "destroy", old: st[k], node: { file: st[k].file, line: st[k].line, kind: "resource", type: st[k].type, name: st[k].name }, deps: st[k].deps || [] }); });
  var dres = null;
  if (apply && !failed) dres = tfApplyDestroys(actions.filter(function (a) { return a.act === "destroy"; }), cfg, out);
  if (dres) failed = dres;
  var outputs = {}, outErr = null;
  if (!failed) Object.keys(cfg.outputs).sort().forEach(function (k) { try { outputs[k] = hclEval(cfg.outputs[k].attrs.value.expr, env.baseCtx(cfg.outputs[k])); } catch (e) { if (!outErr) outErr = { e: e, node: cfg.outputs[k], addr: "output." + k }; } });
  if (outErr && !failed) failed = outErr;
  return { actions: actions, failed: failed, outputs: outputs, drift: drift, env: env, cfg: cfg };
}
function tfStripCanon(c) { var o = {}; Object.keys(c).forEach(function (k) { if (!tfHasUnknown(c[k])) o[k] = JSON.parse(JSON.stringify(c[k], function (kk, vv) { return vv === undefined ? null : vv; })); }); return o; }
function tfInstances(node, env) {
  var ctx = env.baseCtx(node), c = node.attrs.count, fe = node.attrs.for_each, items = [];
  if (c) { var n = hclEval(c.expr, ctx); if (isUnknown(n)) throw hclErr("Invalid count argument; The \"count\" value depends on resource attributes that cannot be determined until apply, so Terraform cannot predict how many instances will be created.", node.file, c.line); for (var i = 0; i < n; i++) items.push({ key: String(i), value: i }); return { items: items, multi: true, isCount: true }; }
  if (fe) { var v = hclEval(fe.expr, ctx); if (isUnknown(v)) throw hclErr("Invalid for_each argument; The \"for_each\" set includes values derived from resource attributes that cannot be determined until apply.", node.file, fe.line); if (Array.isArray(v)) v.forEach(function (x) { items.push({ key: String(x), value: x }); }); else Object.keys(v).forEach(function (k) { items.push({ key: k, value: v[k] }); }); return { items: items, multi: true, isCount: false }; }
  return { items: [{ key: "", value: null }], multi: false, isCount: false };
}
function tfApplyDestroys(list, cfg, out) {
  // ลบ dependents ก่อน: เรียงตามความลึกของ deps จากมากไปน้อย
  var depth = {}; function dp(a, seen) { if (a in depth) return depth[a]; var s = S.tf.state[a]; var d = 0; ((s && s.deps) || []).forEach(function (x) { Object.keys(S.tf.state).forEach(function (k) { if (k === x || k.indexOf(x + "[") === 0) d = Math.max(d, 1 + dp(k)); }); }); depth[a] = d; return d; }
  list.sort(function (a, b) { return dp(b.addr) - dp(a.addr); });
  for (var i = 0; i < list.length; i++) {
    var a = list[i], s = S.tf.state[a.addr], pr = TF_PROV[s.type];
    try { out.push(a.addr + ": Destroying... [id=" + s.id + "]"); pr.del(s); delete S.tf.state[a.addr]; out.push(a.addr + ": Destruction complete after 1s"); }
    catch (e) { return { e: e, node: { file: s.file, line: s.line, kind: "resource", type: s.type, name: s.name }, addr: a.addr, cfg: cfg }; }
  }
  return null;
}
// ---- แสดง plan
function tfPlanText(res, o) {
  var out = [], acts = res.actions.filter(function (a) { return a.act !== "noop"; });
  if (res.drift.length) {
    out.push("Note: Objects have changed outside of Terraform", "", "Terraform detected the following changes made outside of Terraform since the last \"terraform apply\" which may have affected this plan:", "");
    res.drift.forEach(function (d) { if (d.gone) out.push("  # " + d.addr + " has been deleted", "  - resource ... {  (หายไปจาก AWS)  }", ""); else { out.push("  # " + d.addr + " has changed", "  ~ resource {"); d.changes.forEach(function (c) { out.push("      ~ " + c.k + " = " + tfOutFmt(c.old) + " -> " + tfOutFmt(c.nw)); }); out.push("    }", ""); } });
    out.push("Unless you have made equivalent changes to your configuration, or ignored the relevant attributes using ignore_changes, the following plan may include actions to undo or respond to these changes.", "", "─────────────────────────────────────────────────────────────────────────────", "");
  }
  var ocNow = Object.keys(res.outputs).filter(function (k) { var old = S.tf.outputs[k]; return old === undefined || !tfSame(old, res.outputs[k]); });
  if (!acts.length && !ocNow.length) { out.push("No changes. Your infrastructure matches the configuration.", "", "Terraform has compared your real infrastructure against your configuration and found no differences, so no changes are needed."); return out; }
  if (acts.length) out.push("Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:", "  + create", "  ~ update in-place", "  - destroy", "-/+ destroy and then create replacement", "", "Terraform will perform the following actions:", "");
  var add = 0, chg = 0, del = 0;
  acts.forEach(function (a) {
    var sym = { create: "+", update: "~", replace: "-/+", destroy: "-" }[a.act], word = { create: "will be created", update: "will be updated in-place", replace: "must be replaced", destroy: "will be destroyed" }[a.act];
    out.push("  # " + a.addr + " " + word, "  " + sym + " resource \"" + a.type + "\" \"" + a.name + "\" {");
    var sc = TF_SCHEMA[a.type], cm = (sc ? sc.computed : []);
    if (a.act === "create" || a.act === "replace") {
      add++; if (a.act === "replace") { add += 0; del++; }
      var rows = []; cm.forEach(function (k) { if (!(k in (a.canon || {}))) rows.push([k, "(known after apply)"]); });
      var blockKeys = sc ? Object.keys(sc.blocks || {}) : [], blockOut = [];
      Object.keys(a.canon).forEach(function (k) {
        if (k.indexOf("__") === 0) return; var d = a.diffs && a.diffs.filter(function (x) { return x.k === k; })[0];
        if (blockKeys.indexOf(k) >= 0 && Array.isArray(a.canon[k]) && a.canon[k].every(function (x) { return x && typeof x === "object" && !Array.isArray(x); })) { a.canon[k].forEach(function (bo) { blockOut.push("      + " + k + " {"); var bks = Object.keys(bo).sort(), bw = Math.max.apply(null, bks.map(function (z) { return z.length; }).concat([1])); bks.forEach(function (z) { blockOut.push("          + " + z + " ".repeat(bw - z.length) + " = " + tfFmtVal(bo[z], "          ", "+ ")); }); blockOut.push("        }"); }); return; }
        rows.push([k, tfFmtVal(a.canon[k], "      ", "+ "), d ? "# forces replacement" : ""]);
      });
      if (a.canon.__ingress) rows.push(["ingress", isUnknown(a.canon.__ingress) ? "(known after apply)" : "[ " + a.canon.__ingress.length + " rule(s) ]"]); if (a.canon.__egress) rows.push(["egress", isUnknown(a.canon.__egress) ? "(known after apply)" : "[ " + a.canon.__egress.length + " rule(s) ]"]);
      rows.sort(function (x, y) { return x[0] < y[0] ? -1 : 1; }); var w = Math.max.apply(null, rows.map(function (r) { return r[0].length; }).concat([2]));
      rows.forEach(function (r) { out.push("      " + (a.act === "replace" ? "~ " : "+ ") + (r[0] + " ".repeat(w - r[0].length)) + " = " + r[1] + (r[2] ? " " + r[2] : "")); }); blockOut.forEach(function (l) { out.push(l); });
    } else if (a.act === "update") {
      chg++; a.diffs.forEach(function (d) { out.push("      ~ " + (d.k.indexOf("__") === 0 ? d.k.slice(2) : d.k) + " = " + (d.k.indexOf("__") === 0 ? "(rules changed)" : tfOutFmt(d.old).replace(/\n\s*/g, " ") + " -> " + tfOutFmt(d.nw).replace(/\n\s*/g, " "))); }); out.push("        # (other attributes unchanged)");
    } else { del++; Object.keys(a.old.cfg).forEach(function (k) { if (k.indexOf("__") !== 0) out.push("      - " + k + " = " + tfOutFmt(a.old.cfg[k]).replace(/\n\s*/g, " ") + " -> null"); }); }
    out.push("    }", "");
  });
  if (acts.length) out.push("Plan: " + (acts.filter(function (a) { return a.act === "create"; }).length + acts.filter(function (a) { return a.act === "replace"; }).length) + " to add, " + acts.filter(function (a) { return a.act === "update"; }).length + " to change, " + (acts.filter(function (a) { return a.act === "destroy"; }).length + acts.filter(function (a) { return a.act === "replace"; }).length) + " to destroy.");
  var oc = Object.keys(res.outputs).filter(function (k) { var old = S.tf.outputs[k]; return old === undefined || !tfSame(old, res.outputs[k]); });
  if (oc.length) { out.push("", "Changes to Outputs:"); oc.forEach(function (k) { out.push("  + " + k + " = " + (tfHasUnknown(res.outputs[k]) ? "(known after apply)" : tfOutFmt(res.outputs[k]).replace(/\n/g, "\n    "))); }); }
  return out;
}
function tfOutputsText(outs) {
  var ks = Object.keys(outs).sort(); if (!ks.length) return [];
  var out = ["", "Outputs:", ""]; ks.forEach(function (k) { out.push(k + " = " + tfOutFmt(outs[k])); }); return out;
}
function tfCounts(actions) { var a = 0, c = 0, d = 0; actions.forEach(function (x) { if (x.done) { if (x.act === "create") a++; else if (x.act === "update") c++; else if (x.act === "replace") { a++; d++; } } }); actions.forEach(function (x) { if (x.act === "destroy" && !S.tf.state[x.addr]) d++; }); return { a: a, c: c, d: d }; }
