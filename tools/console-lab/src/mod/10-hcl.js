// ===== HCL: parser + evaluator (พอสำหรับโค้ดใน terraform/ ของ repo นี้) =====
// ไม่มี DOM: ใช้ทดสอบใน node ได้ (node test.js)
var HCL_UNKNOWN = { unknown: true };
function hclErr(msg, file, line) { var e = new Error(msg); e.hcl = { file: file || "", line: line || 0 }; return e; }
function isUnknown(v) { return v === HCL_UNKNOWN; }

function hclTokenize(src, file) {
  var toks = [], i = 0, line = 1, n = src.length;
  function push(t, v, extra) { var o = { t: t, v: v, line: line }; if (extra) for (var k in extra) o[k] = extra[k]; toks.push(o); }
  while (i < n) {
    var c = src[i];
    if (c === "\n") { push("nl", "\n"); line++; i++; continue; }
    if (c === " " || c === "\t" || c === "\r") { i++; continue; }
    if (c === "#" || (c === "/" && src[i + 1] === "/")) { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; } i += 2; continue; }
    if (c === '"') {
      var parts = [], lit = "", startLine = line; i++;
      while (i < n && src[i] !== '"') {
        if (src[i] === "\\") { var e = src[i + 1]; lit += e === "n" ? "\n" : e === "t" ? "\t" : e === '"' ? '"' : e === "\\" ? "\\" : "\\" + e; i += 2; continue; }
        if (src[i] === "$" && src[i + 1] === "{") {
          if (lit) { parts.push({ lit: lit }); lit = ""; }
          var depth = 1, j = i + 2, q = false;
          while (j < n && depth > 0) { if (src[j] === '"' && src[j - 1] !== "\\") q = !q; else if (!q) { if (src[j] === "{") depth++; else if (src[j] === "}") depth--; } j++; }
          parts.push({ expr: src.slice(i + 2, j - 1), line: line }); i = j; continue;
        }
        if (src[i] === "\n") throw hclErr("Unterminated string literal", file, startLine);
        lit += src[i]; i++;
      }
      if (i >= n) throw hclErr("Unterminated string literal", file, startLine);
      i++; if (lit || !parts.length) parts.push({ lit: lit });
      push("str", parts); continue;
    }
    if (c === "<" && src[i + 1] === "<" && /[-A-Za-z_]/.test(src[i + 2] || "")) {
      var m = /^<<(-?)([A-Za-z_][A-Za-z0-9_]*)\n/.exec(src.slice(i));
      if (m) {
        var indent = m[1] === "-", tag = m[2], bodyLines = [], k2 = i + m[0].length, hl = line; line++;
        for (;;) {
          var eol = src.indexOf("\n", k2), ln = eol < 0 ? src.slice(k2) : src.slice(k2, eol);
          if (ln.trim() === tag) { k2 = eol < 0 ? n : eol; break; }
          if (eol < 0) throw hclErr("Unterminated heredoc", file, hl);
          bodyLines.push(ln); k2 = eol + 1; line++;
        }
        if (indent) { var minI = 1e9; bodyLines.forEach(function (l) { if (l.trim()) minI = Math.min(minI, l.length - l.trimStart().length); }); if (minI === 1e9) minI = 0; bodyLines = bodyLines.map(function (l) { return l.slice(minI); }); }
        var text = bodyLines.join("\n") + "\n", hp = [], hl2 = "", h2 = 0;
        while (h2 < text.length) {
          if (text[h2] === "$" && text[h2 + 1] === "{") { if (hl2) { hp.push({ lit: hl2 }); hl2 = ""; } var d2 = 1, j2 = h2 + 2; while (j2 < text.length && d2 > 0) { if (text[j2] === "{") d2++; else if (text[j2] === "}") d2--; j2++; } hp.push({ expr: text.slice(h2 + 2, j2 - 1), line: hl }); h2 = j2; }
          else { hl2 += text[h2]; h2++; }
        }
        if (hl2 || !hp.length) hp.push({ lit: hl2 });
        toks.push({ t: "str", v: hp, line: hl }); i = k2; continue;
      }
    }
    if (/[0-9]/.test(c)) { var s0 = i; while (i < n && /[0-9.]/.test(src[i])) i++; push("num", parseFloat(src.slice(s0, i))); continue; }
    if (/[A-Za-z_]/.test(c)) { var s1 = i; while (i < n && /[A-Za-z0-9_\-]/.test(src[i])) i++; var w = src.slice(s1, i); while (w.length > 1 && w[w.length - 1] === "-") { w = w.slice(0, -1); i--; } push("id", w); continue; }
    var two = src.slice(i, i + 2), three = src.slice(i, i + 3);
    if (three === "...") { push("op", "..."); i += 3; continue; }
    if (["==", "!=", "<=", ">=", "&&", "||", "=>"].indexOf(two) >= 0) { push("op", two); i += 2; continue; }
    if ("{}[](),.=:?+-*/%!<>".indexOf(c) >= 0) { push("op", c); i++; continue; }
    throw hclErr("Invalid character \"" + c + "\"", file, line);
  }
  toks.push({ t: "eof", v: "", line: line });
  return toks;
}

function HclParser(toks, file) { this.toks = toks; this.p = 0; this.file = file; }
HclParser.prototype = {
  peek: function () { return this.toks[this.p]; },
  next: function () { return this.toks[this.p++]; },
  is: function (v) { var t = this.peek(); return (t.t === "op" || t.t === "id") && t.v === v; },
  eat: function (v) { if (this.is(v)) { this.p++; return true; } return false; },
  expect: function (v) { var t = this.peek(); if (!this.eat(v)) throw hclErr("Expected \"" + v + "\" but found \"" + (t.t === "nl" ? "end of line" : t.v) + "\"", this.file, t.line); },
  skipNl: function () { while (this.peek().t === "nl") this.p++; },
  body: function (end) {
    var items = [];
    for (;;) {
      this.skipNl(); var t = this.peek();
      if (t.t === "eof") { if (end) throw hclErr("Unclosed configuration block", this.file, t.line); break; }
      if (end && t.t === "op" && t.v === "}") { this.p++; break; }
      if (t.t !== "id") throw hclErr("Argument or block definition required", this.file, t.line);
      this.p++; var nt = this.peek();
      if (nt.t === "op" && nt.v === "=") { this.p++; items.push({ kind: "attr", name: t.v, expr: this.expr(), line: t.line }); this.endOfItem(); continue; }
      var labels = [];
      while (this.peek().t === "str" || (this.peek().t === "id")) { var lt = this.next(); labels.push(lt.t === "str" ? lt.v.map(function (x) { return x.lit || ""; }).join("") : lt.v); }
      this.expect("{");
      items.push({ kind: "block", type: t.v, labels: labels, body: this.body(true), line: t.line });
    }
    return items;
  },
  endOfItem: function () { var t = this.peek(); if (t.t === "nl" || t.t === "eof" || (t.t === "op" && t.v === "}")) return; throw hclErr("Missing newline after argument", this.file, t.line); },
  expr: function () { return this.cond(); },
  cond: function () {
    var c = this.bin(0);
    if (this.eat("?")) { this.skipNl(); var a = this.expr(); this.skipNl(); this.expect(":"); this.skipNl(); var b = this.expr(); return { t: "cond", c: c, a: a, b: b }; }
    return c;
  },
  bin: function (lvl) {
    var ops = [["||"], ["&&"], ["==", "!="], ["<", ">", "<=", ">="], ["+", "-"], ["*", "/", "%"]];
    if (lvl >= ops.length) return this.unary();
    var l = this.bin(lvl + 1);
    for (;;) {
      var t = this.peek();
      if (t.t === "op" && ops[lvl].indexOf(t.v) >= 0) { this.p++; var r = this.bin(lvl + 1); l = { t: "bin", op: t.v, l: l, r: r }; } else return l;
    }
  },
  unary: function () {
    if (this.is("!")) { this.p++; return { t: "un", op: "!", e: this.unary() }; }
    if (this.is("-")) { this.p++; return { t: "un", op: "-", e: this.unary() }; }
    return this.postfix(this.primary());
  },
  postfix: function (e) {
    for (;;) {
      if (this.is(".")) {
        this.p++; var t = this.next();
        if (t.t === "op" && t.v === "*") { e = { t: "splat", e: e, steps: [] }; continue; }
        if (t.t === "num") { e = { t: "idx", e: e, i: { t: "lit", v: t.v } }; continue; }
        if (t.t !== "id") throw hclErr("Invalid attribute name", this.file, t.line);
        e = e.t === "splat" ? { t: "splat", e: e.e, steps: e.steps.concat([{ attr: t.v }]) } : { t: "attr", e: e, n: t.v };
      } else if (this.is("[")) {
        this.p++;
        if (this.is("*")) { this.p++; this.expect("]"); e = { t: "splat", e: e, steps: [] }; continue; }
        var i = this.expr(); this.expect("]");
        e = e.t === "splat" ? { t: "splat", e: e.e, steps: e.steps.concat([{ idx: i }]) } : { t: "idx", e: e, i: i };
      } else return e;
    }
  },
  primary: function () {
    var t = this.next(), self = this;
    if (t.t === "num") return { t: "lit", v: t.v };
    if (t.t === "str") return { t: "tpl", parts: t.v.map(function (p) { if (p.lit !== undefined) return p; var ps = new HclParser(hclTokenize(p.expr, self.file), self.file); var x = ps.expr(); x.line = t.line; return { e: x }; }), line: t.line };
    if (t.t === "op" && t.v === "(") { var e = this.expr(); this.expect(")"); return e; }
    if (t.t === "op" && t.v === "[") return this.listOrFor();
    if (t.t === "op" && t.v === "{") return this.objOrFor();
    if (t.t === "id") {
      if (t.v === "true") return { t: "lit", v: true };
      if (t.v === "false") return { t: "lit", v: false };
      if (t.v === "null") return { t: "lit", v: null };
      if (this.is("(")) { this.p++; var args = []; this.skipNl(); while (!this.is(")")) { args.push(this.expr()); this.skipNl(); if (!this.eat(",")) break; this.skipNl(); } this.expect(")"); return { t: "call", name: t.v, args: args, line: t.line }; }
      return { t: "ref", n: t.v, line: t.line };
    }
    throw hclErr("Invalid expression", this.file, t.line);
  },
  listOrFor: function () {
    this.skipNl();
    if (this.is("for")) { this.p++; var f = this.forHead(); var v = this.expr(); this.skipNl(); var cond = null; if (this.eat("if")) cond = this.expr(); this.skipNl(); this.expect("]"); return { t: "for", obj: false, k: f.k, v: f.v, coll: f.coll, ve: v, cond: cond }; }
    var items = []; while (!this.is("]")) { items.push(this.expr()); this.skipNl(); if (!this.eat(",")) break; this.skipNl(); }
    this.skipNl(); this.expect("]"); return { t: "list", items: items };
  },
  forHead: function () {
    var a = this.next().v, b = null; if (this.eat(",")) b = this.next().v;
    this.expect("in"); var coll = this.expr(); this.skipNl(); this.expect(":"); this.skipNl();
    return b ? { k: a, v: b, coll: coll } : { k: null, v: a, coll: coll };
  },
  objOrFor: function () {
    this.skipNl();
    if (this.is("for")) {
      this.p++; var f = this.forHead(); var ke = this.expr(); this.skipNl(); this.expect("=>"); this.skipNl(); var ve = this.expr(); this.skipNl(); var cond = null; if (this.eat("if")) cond = this.expr(); this.skipNl(); this.expect("}");
      return { t: "for", obj: true, k: f.k, v: f.v, coll: f.coll, ke: ke, ve: ve, cond: cond };
    }
    var ents = [];
    for (;;) {
      this.skipNl(); if (this.is("}")) break;
      var kt = this.peek(), key;
      if (kt.t === "id" && (this.toks[this.p + 1].v === "=" || this.toks[this.p + 1].v === ":")) { this.p++; key = { t: "lit", v: kt.v }; }
      else key = this.expr();
      if (!this.eat("=") && !this.eat(":")) throw hclErr("Missing key/value separator", this.file, this.peek().line);
      this.skipNl(); ents.push({ k: key, v: this.expr() });
      this.skipNl(); if (this.peek().t === "op" && this.peek().v === ",") this.p++;
    }
    this.expect("}"); return { t: "obj", entries: ents };
  }
};
function hclParse(src, file) { return new HclParser(hclTokenize(src, file), file).body(false); }

// ---- evaluator
function hclRefs(e, out) {
  out = out || [];
  if (!e || typeof e !== "object") return out;
  if (e.t === "ref") { out.push({ root: e.n, node: e }); return out; }
  if (e.t === "attr" || e.t === "idx") { var r = hclTraversal(e); if (r) { out.push(r); if (e.t === "idx") hclRefs(e.i, out); var inner = e; while (inner && (inner.t === "attr" || inner.t === "idx")) { if (inner.t === "idx") hclRefs(inner.i, out); inner = inner.e; } return out; } }
  ["e", "l", "r", "c", "a", "b", "i", "coll", "ve", "ke", "cond"].forEach(function (k) { if (e[k]) hclRefs(e[k], out); });
  ["args", "items"].forEach(function (k) { (e[k] || []).forEach(function (x) { hclRefs(x, out); }); });
  (e.parts || []).forEach(function (p) { if (p.e) hclRefs(p.e, out); });
  (e.entries || []).forEach(function (x) { hclRefs(x.k, out); hclRefs(x.v, out); });
  (e.steps || []).forEach(function (s) { if (s.idx) hclRefs(s.idx, out); });
  return out;
}
function hclTraversal(e) {
  var steps = [], cur = e;
  while (cur && (cur.t === "attr" || cur.t === "idx")) { steps.unshift(cur.t === "attr" ? { attr: cur.n } : { idx: cur.i }); cur = cur.e; }
  if (!cur || cur.t !== "ref") return null;
  return { root: cur.n, steps: steps };
}
// ผูก address ที่ resource/data/var/local อ้างถึง เช่น aws_vpc.main, data.aws_ami.ubuntu, var.region
function hclDeps(expr) {
  var deps = [];
  hclRefs(expr, []).forEach(function (r) {
    var root = r.root, steps = r.steps || [];
    var a = steps[0] && steps[0].attr, b = steps[1] && steps[1].attr;
    if (root === "var" && a) deps.push("var." + a);
    else if (root === "local" && a) deps.push("local." + a);
    else if (root === "data" && a && b) deps.push("data." + a + "." + b);
    else if (/^[a-z0-9]+_[a-z0-9_]+$/.test(root) && a) deps.push(root + "." + a);
  });
  var seen = {}; return deps.filter(function (d) { if (seen[d]) return false; seen[d] = 1; return true; });
}

function hclCidrsubnet(prefix, newbits, netnum) {
  var m = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(prefix); if (!m) throw new Error("invalid CIDR expression: " + prefix);
  var base = ip2n(m[1]), pl = +m[2] + newbits; if (pl > 32) throw new Error("insufficient address space to extend prefix of /" + m[2] + " by " + newbits + " bits");
  if (netnum >= Math.pow(2, newbits)) throw new Error("prefix extension of " + newbits + " bits does not accommodate a subnet numbered " + netnum);
  var size = Math.pow(2, 32 - pl); return n2ip(Math.floor(base / Math.pow(2, 32 - (+m[2]))) * Math.pow(2, 32 - (+m[2])) + netnum * size) + "/" + pl;
}
var HCL_FUNCS = {
  cidrsubnet: function (a) { return hclCidrsubnet(a[0], a[1], a[2]); },
  toset: function (a) { var seen = {}, o = []; a[0].forEach(function (x) { var k = JSON.stringify(x); if (!seen[k]) { seen[k] = 1; o.push(x); } }); return o.sort(); },
  tolist: function (a) { return a[0].slice(); }, tostring: function (a) { return String(a[0]); }, tonumber: function (a) { return Number(a[0]); },
  length: function (a) { return Array.isArray(a[0]) ? a[0].length : typeof a[0] === "string" ? a[0].length : Object.keys(a[0]).length; },
  join: function (a) { return a[1].join(a[0]); }, concat: function (a) { return [].concat.apply([], a); },
  merge: function (a) { var o = {}; a.forEach(function (m) { if (m) Object.keys(m).forEach(function (k) { o[k] = m[k]; }); }); return o; },
  keys: function (a) { return Object.keys(a[0]).sort(); }, values: function (a) { return Object.keys(a[0]).sort().map(function (k) { return a[0][k]; }); },
  lookup: function (a) { var m = a[0]; return m && Object.prototype.hasOwnProperty.call(m, a[1]) ? m[a[1]] : a[2]; },
  element: function (a) { return a[0][a[1] % a[0].length]; }, contains: function (a) { return a[0].indexOf(a[1]) >= 0; },
  upper: function (a) { return String(a[0]).toUpperCase(); }, lower: function (a) { return String(a[0]).toLowerCase(); },
  max: function (a) { return Math.max.apply(null, a); }, min: function (a) { return Math.min.apply(null, a); },
  jsonencode: function (a) { return JSON.stringify(a[0]); }, replace: function (a) { return String(a[0]).split(a[1]).join(a[2]); },
  trimspace: function (a) { return String(a[0]).trim(); }, basename: function (a) { return String(a[0]).split("/").pop(); },
  pathexpand: function (a, c) { return String(a[0]).replace(/^~/, (c && c.home) || "/home/swd"); },
  file: function (a, c) { var v = c && c.readFile ? c.readFile(a[0]) : null; if (v === null || v === undefined) throw new Error("Invalid value for \"path\" parameter: no file exists at " + a[0] + "; this function works only with files that are distributed as part of the configuration source code, so if this file will be created by a resource in this configuration you must instead obtain this result from an attribute of that resource."); return v; }
};
function hclStr(v) { if (v === null || v === undefined) return ""; if (typeof v === "boolean" || typeof v === "number") return String(v); if (typeof v === "object") throw new Error("Invalid template interpolation value: cannot include a " + (Array.isArray(v) ? "list" : "map") + " in a string template"); return String(v); }
function hclEval(e, ctx) {
  switch (e.t) {
    case "lit": return e.v;
    case "tpl": {
      var out = "";
      for (var i = 0; i < e.parts.length; i++) { var p = e.parts[i]; if (p.lit !== undefined) out += p.lit; else { var v = hclEval(p.e, ctx); if (isUnknown(v)) return HCL_UNKNOWN; out += hclStr(v); } }
      return out;
    }
    case "list": { var a = []; for (var k = 0; k < e.items.length; k++) { var x = hclEval(e.items[k], ctx); a.push(x); } return a; }
    case "obj": { var o = {}; e.entries.forEach(function (en) { var key = hclEval(en.k, ctx); o[isUnknown(key) ? "?" : String(key)] = hclEval(en.v, ctx); }); return o; }
    case "ref": return ctx.lookup(e.n, e);
    case "attr": { var b = hclEval(e.e, ctx); if (isUnknown(b)) return HCL_UNKNOWN; if (b === null || typeof b !== "object") throw hclErr("Unsupported attribute; This value does not have an attribute named \"" + e.n + "\".", ctx.file, e.line); if (!(e.n in b)) { if (b.__unknownAttrs) return HCL_UNKNOWN; throw hclErr("Unsupported attribute; This object does not have an attribute named \"" + e.n + "\".", ctx.file, e.line); } return b[e.n]; }
    case "idx": { var bb = hclEval(e.e, ctx), ii = hclEval(e.i, ctx); if (isUnknown(bb) || isUnknown(ii)) return HCL_UNKNOWN; if (bb === null || typeof bb !== "object") throw hclErr("Invalid index; This value does not have any indices.", ctx.file, e.line); if (Array.isArray(bb) && !(ii in bb)) throw hclErr("Invalid index; The given key does not identify an element in this collection value.", ctx.file, e.line); if (!Array.isArray(bb) && !(ii in bb)) { if (bb.__unknownAttrs) return HCL_UNKNOWN; throw hclErr("Invalid index; The given key does not identify an element in this collection value.", ctx.file, e.line); } return bb[ii]; }
    case "splat": {
      var base = hclEval(e.e, ctx); if (isUnknown(base)) return HCL_UNKNOWN;
      var arr = Array.isArray(base) ? base : (base && base.__multi ? Object.keys(base).filter(function (kk) { return kk !== "__multi"; }).sort(function (x, y) { return x - y; }).map(function (kk) { return base[kk]; }) : (base === null || base === undefined ? [] : [base]));
      return arr.map(function (el) { var cur = el; e.steps.forEach(function (s) { if (isUnknown(cur)) return; if (s.attr) { if (!(s.attr in cur)) { if (cur.__unknownAttrs) { cur = HCL_UNKNOWN; return; } throw hclErr("Unsupported attribute; This object does not have an attribute named \"" + s.attr + "\".", ctx.file, e.line); } cur = cur[s.attr]; } else { var q = hclEval(s.idx, ctx); cur = cur[q]; } }); return cur; });
    }
    case "call": {
      var f = HCL_FUNCS[e.name]; if (!f) throw hclErr("Call to unknown function; There is no function named \"" + e.name + "\".", ctx.file, e.line);
      var args = e.args.map(function (x) { return hclEval(x, ctx); }); if (args.some(isUnknown)) return HCL_UNKNOWN;
      try { return f(args, ctx); } catch (er) { if (er.hcl) throw er; throw hclErr("Error in function call; Call to function \"" + e.name + "\" failed: " + er.message, ctx.file, e.line); }
    }
    case "un": { var u = hclEval(e.e, ctx); if (isUnknown(u)) return HCL_UNKNOWN; return e.op === "!" ? !u : -u; }
    case "bin": {
      var l = hclEval(e.l, ctx), r = hclEval(e.r, ctx); if (isUnknown(l) || isUnknown(r)) return HCL_UNKNOWN;
      switch (e.op) { case "+": return l + r; case "-": return l - r; case "*": return l * r; case "/": return l / r; case "%": return l % r;
        case "==": return JSON.stringify(l) === JSON.stringify(r); case "!=": return JSON.stringify(l) !== JSON.stringify(r);
        case "<": return l < r; case ">": return l > r; case "<=": return l <= r; case ">=": return l >= r; case "&&": return l && r; case "||": return l || r; }
      throw hclErr("Unsupported operator", ctx.file, e.line);
    }
    case "cond": { var c = hclEval(e.c, ctx); if (isUnknown(c)) return HCL_UNKNOWN; return c ? hclEval(e.a, ctx) : hclEval(e.b, ctx); }
    case "for": {
      var coll = hclEval(e.coll, ctx); if (isUnknown(coll)) return HCL_UNKNOWN;
      var items = Array.isArray(coll) ? coll.map(function (v, i) { return [i, v]; }) : Object.keys(coll).filter(function (k) { return k !== "__multi"; }).sort(function (x, y) { return /^\d+$/.test(x) && /^\d+$/.test(y) ? x - y : (x < y ? -1 : 1); }).map(function (k) { return [k, coll[k]]; });
      var res = e.obj ? {} : [];
      items.forEach(function (kv) {
        var sub = ctx.child(); if (e.k) sub.vars[e.k] = kv[0]; sub.vars[e.v] = kv[1];
        if (e.cond && !hclEval(e.cond, sub)) return;
        if (e.obj) res[String(hclEval(e.ke, sub))] = hclEval(e.ve, sub); else res.push(hclEval(e.ve, sub));
      });
      return res;
    }
  }
  throw hclErr("Unsupported expression", ctx.file, e.line);
}
