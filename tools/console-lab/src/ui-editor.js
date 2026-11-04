// Editor (แบบ VS Code) สำหรับหน้าต่างบน Desktop: Explorer เป็นโฟลเดอร์ย่อ/ขยาย, แท็บหลายไฟล์, ไฮไลต์สี, Ctrl+S บันทึก, แถบสถานะ
var ED = { tabs: [], active: null, buf: {}, exp: {}, find: "" };
var ED_T = ["", "#1e1e1e", "#d4d4d4", "#6a9955", "#ce9178", "#c586c0", "#9cdcfe", "#dcdcaa", "#b5cea8", "#569cd6"];
function edKind(p) { var n = p.split("/").pop(); if (/\.tf$|\.tfvars$|\.hcl$/.test(n)) return "hcl"; if (n === "Jenkinsfile") return "jf"; if (n === "Dockerfile") return "df"; if (/\.json$/.test(n)) return "json"; if (/docker-compose/.test(n)) return "dc"; if (/\.ya?ml(\.j2)?$/.test(n)) return "yaml"; return ""; }
function edLang(p) { var k = edKind(p), n = p.split("/").pop(); return { hcl: "Terraform", jf: "Groovy (Jenkinsfile)", df: "Dockerfile", json: "JSON", dc: "YAML (compose)", yaml: "YAML" }[k] || (/\.sh$/.test(n) ? "Shell" : /\.py$/.test(n) ? "Python" : /\.md$/.test(n) ? "Markdown" : "Plain Text"); }
function edIco(n, dir, open) { if (dir) return open ? "📂" : "📁"; if (/\.tf$/.test(n)) return "🏗️"; if (/\.ya?ml/.test(n)) return "📋"; if (/\.sh$/.test(n)) return "⚙️"; if (/\.py$/.test(n)) return "🐍"; if (/\.json$/.test(n)) return "🧾"; if (/\.md$/.test(n)) return "📝"; if (n === "Jenkinsfile" || n === "Dockerfile") return "🧩"; return "📄"; }
function edRO(p) { return /\/\.(ssh|aws)\//.test(p) || /terraform\.tfstate/.test(p); }
function edText(p) { return ED.buf[p] != null ? ED.buf[p] : (fsAll()[p] != null ? fsAll()[p] : ""); }
function edDirty(p) { return ED.buf[p] != null && ED.buf[p] !== (fsAll()[p] != null ? fsAll()[p] : ""); }
function edOpen(p) { if (ED.tabs.indexOf(p) < 0) ED.tabs.push(p); ED.active = p; var parts = p.split("/"); for (var i = 1; i < parts.length; i++) ED.exp[parts.slice(0, i).join("/")] = true; }
function edSave(p) { if (!p || edRO(p) || ED.buf[p] == null) return false; fsWrite(p, ED.buf[p]); delete ED.buf[p]; save(); return true; }
function edTree() {
  var all = fsAll(), root = { d: {}, f: [] };
  Object.keys(all).forEach(function (k) {
    var rel; if (k.indexOf(REPO + "/") === 0) rel = k.slice(REPO.length + 1); else if (k.indexOf(HOME + "/.") === 0) rel = "~/" + k.slice(HOME.length + 1); else return;
    var parts = rel.split("/"), cur = root; parts.slice(0, -1).forEach(function (s) { cur = cur.d[s] = cur.d[s] || { d: {}, f: [] }; }); cur.f.push([parts[parts.length - 1], k]);
  });
  return root;
}
function edHL(text, kind) { var frag = document.createDocumentFragment(); text.split("\n").forEach(function (ln, i, a) { jkxHi(ln, kind, ED_T).forEach(function (n) { frag.appendChild(n); }); frag.appendChild(document.createTextNode(i < a.length - 1 ? "\n" : " ")); }); return frag; }
function editorApp() {
  if (!ED.active) { var pref = REPO + "/ansible/dev.yml", all = fsAll(); edOpen(UI.edit && all[UI.edit] != null ? UI.edit : all[pref] != null ? pref : Object.keys(all).filter(function (k) { return k.indexOf(REPO + "/") === 0; }).sort()[0]); }
  var root = h("div", { cls: "edr" }), tree = h("div", { cls: "edtree" }), main = h("div", { cls: "edmain" }), stat = h("div", { cls: "edstat" });
  function nodes(n, base, depth) {
    var out = [];
    Object.keys(n.d).sort().forEach(function (d) { var path = base ? base + "/" + d : d, open = !!ED.exp[path]; out.push(h("button", { type: "button", cls: "edrow", style: "padding-left:" + (8 + depth * 14) + "px", onclick: function () { ED.exp[path] = !open; render(); } }, [h("span", { cls: "edc", text: open ? "▾" : "▸" }), h("span", { text: edIco(d, true, open) }), h("span", { text: d })])); if (open) nodes(n.d[d], path, depth + 1).forEach(function (x) { out.push(x); }); });
    n.f.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; }).forEach(function (f) { out.push(h("button", { type: "button", cls: "edrow" + (ED.active === f[1] ? " on" : ""), style: "padding-left:" + (22 + depth * 14) + "px", onclick: function () { edOpen(f[1]); render(); } }, [h("span", { text: edIco(f[0], false) }), h("span", { text: f[0] })])); });
    return out;
  }
  tree.appendChild(h("div", { cls: "edh", text: "EXPLORER" })); tree.appendChild(h("div", { cls: "edh2", text: "PHARMACY-AWS-LAB" }));
  nodes(edTree(), "", 0).forEach(function (x) { tree.appendChild(x); });
  var tabs = h("div", { cls: "edtabs" });
  ED.tabs.forEach(function (p) { var n = p.split("/").pop(); tabs.appendChild(h("div", { cls: "edtab" + (p === ED.active ? " on" : ""), title: p.replace(HOME, "~"), onclick: function () { ED.active = p; render(); } }, [h("span", { text: edIco(n, false) }), h("span", { text: n }), h("b", { cls: "edx", "data-p": p, text: edDirty(p) ? "●" : "×", title: "ปิด", onclick: function (e) { e.stopPropagation(); ED.tabs.splice(ED.tabs.indexOf(p), 1); delete ED.buf[p]; if (ED.active === p) ED.active = ED.tabs[ED.tabs.length - 1] || null; render(); } })])); });
  var p = ED.active;
  if (!p) { main.appendChild(tabs); main.appendChild(h("div", { cls: "edwel" }, [h("div", { style: "font-size:3rem", text: "📝" }), h("b", { text: "Code Editor" }), h("span", { text: "เลือกไฟล์จาก Explorer ด้านซ้ายเพื่อเริ่มแก้ · Ctrl+S บันทึก" })])); root.appendChild(tree); root.appendChild(main); return root; }
  var ro = edRO(p), kind = edKind(p), ta = h("textarea", { cls: "edta", spellcheck: "false", wrap: "off", readonly: ro ? "readonly" : null }), pre = h("pre", { cls: "edhl" }), gut = h("div", { cls: "edgut" }), wrap = h("div", { cls: "edwrap" });
  ta.value = edText(p);
  var pos = h("span", { text: "Ln 1, Col 1" });
  function refresh() {
    var t = ta.value; pre.textContent = ""; pre.appendChild(edHL(t, kind)); var n = t.split("\n").length; gut.textContent = ""; var s = []; for (var i = 1; i <= n; i++) s.push(i); gut.textContent = s.join("\n");
    var before = t.slice(0, ta.selectionStart).split("\n"); pos.textContent = "Ln " + before.length + ", Col " + (before[before.length - 1].length + 1);
    var tabx = tabs.querySelector('.edx[data-p="' + p.replace(/"/g, '\\"') + '"]'); if (tabx) tabx.textContent = edDirty(p) ? "●" : "×"; save1.disabled = ro || !edDirty(p);
  }
  var save1 = h("button", { type: "button", cls: "edsave", text: "💾 Save", disabled: true, onclick: function () { if (edSave(p)) { flash("ok", "บันทึก " + p.replace(HOME, "~") + " แล้ว"); refresh(); } } });
  var raf = 0;
  ta.addEventListener("input", function () { ED.buf[p] = ta.value; cancelAnimationFrame(raf); raf = requestAnimationFrame(refresh); });
  ta.addEventListener("keyup", function () { refresh(); }); ta.addEventListener("click", refresh);
  ta.addEventListener("scroll", function () { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gut.scrollTop = ta.scrollTop; });
  ta.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); if (edSave(p)) { flash("ok", "บันทึก " + p.replace(HOME, "~") + " แล้ว"); refresh(); } }
    else if (e.key === "Tab" && !ro) { e.preventDefault(); var s = ta.selectionStart; ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; ED.buf[p] = ta.value; refresh(); }
  });
  wrap.appendChild(gut); wrap.appendChild(h("div", { cls: "edcode" }, [pre, ta]));
  main.appendChild(tabs); main.appendChild(h("div", { cls: "edbc", text: p.replace(REPO + "/", "").replace(HOME, "~").split("/").join("  ›  ") + (ro ? "   🔒 อ่านอย่างเดียว (จัดการผ่านคำสั่ง)" : "") })); main.appendChild(wrap);
  stat.appendChild(pos); stat.appendChild(h("span", { text: "Spaces: 2" })); stat.appendChild(h("span", { text: "UTF-8" })); stat.appendChild(h("span", { text: "LF" })); stat.appendChild(h("span", { text: edLang(p) })); stat.appendChild(save1);
  main.appendChild(stat); root.appendChild(tree); root.appendChild(main);
  setTimeout(function () { refresh(); }, 0);
  return root;
}
