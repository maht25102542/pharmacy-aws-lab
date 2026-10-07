// YAML ส่วนย่อยพอสำหรับ playbook ใน repo นี้ (map, list, block scalar | >, flow [] {}, quote) ไม่มี dependency
// ตรวจกับ PyYAML ได้ด้วย: python3 -c "import yaml,json,sys;print(json.dumps(yaml.safe_load(open(sys.argv[1]))))" ไฟล์.yml
function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === "\\" && q === '"') i++; else if (c === q) q = null; }
    else if (c === '"' || c === "'") { if (i === 0 || /[\s\[{,:]/.test(s[i - 1])) q = c; }
    else if (c === "#" && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i).replace(/\s+$/, "");
  }
  return s.replace(/\s+$/, "");
}
function scalar(t) {
  t = t.trim();
  if (t === "") return null;
  if (t[0] === '"') return JSON.parse(t.replace(/\\\//g, "/"));
  if (t[0] === "'") return t.slice(1, -1).replace(/''/g, "'");
  if (t === "true" || t === "True") return true;
  if (t === "false" || t === "False") return false;
  if (t === "null" || t === "~") return null;
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  if (/^-?\d+\.\d+$/.test(t)) return parseFloat(t);
  return t;
}
function flow(t) {
  let i = 0;
  function ws() { while (i < t.length && /\s/.test(t[i])) i++; }
  function val() {
    ws();
    if (t[i] === "[") { i++; const a = []; ws(); while (t[i] !== "]") { a.push(val()); ws(); if (t[i] === ",") i++; ws(); } i++; return a; }
    if (t[i] === "{") {
      i++; const o = {}; ws();
      while (t[i] !== "}") { const k = key(); ws(); if (t[i] === ":") { i++; o[k] = val(); } else o[k] = null; ws(); if (t[i] === ",") i++; ws(); }
      i++; return o;
    }
    return str(false);
  }
  function key() { ws(); return String(str(true)); }
  function str(isKey) {
    ws(); const st = i;
    if (t[i] === '"' || t[i] === "'") { const q = t[i]; i++; while (i < t.length && (t[i] !== q || (q === '"' && t[i - 1] === "\\"))) i++; i++; return scalar(t.slice(st, i)); }
    while (i < t.length && !(/[,\]}]/.test(t[i]) || (t[i] === ":" && (isKey || /\s|[,\]}]|$/.test(t[i + 1] || " "))))) i++;
    return scalar(t.slice(st, i));
  }
  return val();
}
function parse(text) {
  const raw = text.replace(/\r/g, "").split("\n"), L = raw.map((s) => s), n = L.length;
  let p = 0;
  const indentOf = (s) => s.length - s.trimStart().length;
  function skip() { while (p < n && (L[p].trim() === "" || L[p].trim()[0] === "#")) p++; }
  function keyOf(s) {
    const t = stripComment(s), ind = t.length - t.trimStart().length, u = t.trimStart();
    if (!u || /^[\[{#]/.test(u) || /^-(\s|$)/.test(u)) return null;
    let q = null, cut = -1;
    for (let i = 0; i < u.length; i++) {
      const c = u[i];
      if (q) { if (c === "\\" && q === '"') i++; else if (c === q) q = null; }
      else if ((c === '"' || c === "'") && i === 0) q = c;
      else if (c === ":" && (i + 1 === u.length || /\s/.test(u[i + 1]))) { cut = i; break; }
    }
    if (cut < 1) return null;
    const k = u.slice(0, cut).trim(), rest = u.slice(cut + 1).trim();
    const kv = scalar(k);
    return { key: kv === null ? k : String(kv), rest, indent: ind };
  }
  function block(ind, ch, parent) {
    const lines = []; let first = null;
    while (p < n) {
      const s = L[p];
      if (s.trim() === "") { lines.push(""); p++; continue; }
      const i = indentOf(s); if (i <= parent) break;
      if (first === null) first = i; lines.push(s.slice(Math.min(first, i))); p++;
    }
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    if (ch === "|") return lines.join("\n") + "\n";
    let out = "", prev = null;
    lines.forEach((l) => { if (l === "") out += "\n"; else { if (prev !== null && prev !== "" && !/^\s/.test(l) && !/^\s/.test(prev)) out += " "; else if (prev !== null && prev !== "" ) out += "\n"; out += l; } prev = l; });
    return out + "\n";
  }
  function inline(rest, parentIndent) {
    rest = stripComment(rest).trim();
    if (rest === "|" || rest === ">" || /^[|>][+-]?$/.test(rest)) return block(0, rest[0], parentIndent);
    if (rest[0] === "[" || rest[0] === "{") return flow(rest);
    return scalar(rest);
  }
  function node(minIndent) {
    skip(); if (p >= n) return null;
    const i = indentOf(L[p]); if (i < minIndent) return null;
    const t = L[p].trim();
    if (t === "-" || t.startsWith("- ")) return seq(i);
    if (keyOf(L[p])) return map(i);
    const v = inline(t, i - 1); p++; return v;
  }
  function seq(ind) {
    const out = [];
    for (;;) {
      skip(); if (p >= n || indentOf(L[p]) !== ind) break;
      const t = L[p].trim(); if (!(t === "-" || t.startsWith("- "))) break;
      const rest = t === "-" ? "" : t.slice(2).trimStart(), off = ind + (t.length - rest.length);
      if (rest === "") { p++; out.push(node(ind + 1)); continue; }
      if (keyOf(" ".repeat(off) + rest) && !/^["'\[{]/.test(rest)) { L[p] = " ".repeat(off) + rest; out.push(map(off)); continue; }
      p++; out.push(inline(rest, ind));
    }
    return out;
  }
  function map(ind) {
    const o = {};
    for (;;) {
      skip(); if (p >= n || indentOf(L[p]) !== ind) break;
      const k = keyOf(L[p]); if (!k) break;
      p++;
      if (k.rest === "" || /^#/.test(k.rest)) {
        skip();
        if (p < n && (indentOf(L[p]) > ind || (indentOf(L[p]) === ind && /^-(\s|$)/.test(L[p].trim())))) o[k.key] = node(ind);
        else o[k.key] = null;
      } else o[k.key] = inline(k.rest, ind);
    }
    return o;
  }
  return node(0);
}
module.exports = { parse };
