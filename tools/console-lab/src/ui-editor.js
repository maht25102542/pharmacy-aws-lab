// Editor (แบบ VS Code) สำหรับหน้าต่างบน Desktop: Explorer เป็นโฟลเดอร์ย่อ/ขยาย, แท็บหลายไฟล์, ไฮไลต์สี, Ctrl+S บันทึก, แถบสถานะ
var ED = { tabs: [], active: null, buf: {}, exp: {}, find: "" };
var ED_T = ["", "#1e1e1e", "#d4d4d4", "#6a9955", "#ce9178", "#c586c0", "#9cdcfe", "#dcdcaa", "#b5cea8", "#569cd6"];
function edKind(p) { var n = p.split("/").pop(); if (/\.tf$|\.tfvars$|\.hcl$/.test(n)) return "hcl"; if (n === "Jenkinsfile") return "jf"; if (n === "Dockerfile") return "df"; if (/\.json$/.test(n)) return "json"; if (/docker-compose/.test(n)) return "dc"; if (/\.ya?ml(\.j2)?$/.test(n)) return "yaml"; return ""; }
function edLang(p) { var k = edKind(p), n = p.split("/").pop(); return { hcl: "Terraform", jf: "Groovy (Jenkinsfile)", df: "Dockerfile", json: "JSON", dc: "YAML (compose)", yaml: "YAML" }[k] || (/\.sh$/.test(n) ? "Shell" : /\.py$/.test(n) ? "Python" : /\.md$/.test(n) ? "Markdown" : "Plain Text"); }
function edIco(n, dir, open) { if (dir) return open ? "📂" : "📁"; if (/\.tf$/.test(n)) return "🏗️"; if (/\.ya?ml/.test(n)) return "📋"; if (/\.sh$/.test(n)) return "⚙️"; if (/\.py$/.test(n)) return "🐍"; if (/\.json$/.test(n)) return "🧾"; if (/\.md$/.test(n)) return "📝"; if (n === "Jenkinsfile" || n === "Dockerfile") return "🧩"; return "📄"; }
function edGlyph(n, dir, open) {
  if (dir) return '<svg viewBox="0 0 16 16" class="edg"><path d="' + (open ? "M4 6l4 4 4-4" : "M6 4l4 4-4 4") + '" fill="none" stroke="#c5c5c5" stroke-width="1.400" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var c = /\.tf/.test(n) ? "#a074c4" : /\.ya?ml|\.j2/.test(n) ? "#e5655c" : /\.sh$/.test(n) ? "#89e051" : /\.py$/.test(n) ? "#519aba" : /\.json$/.test(n) ? "#cbcb41" : /\.md$/.test(n) ? "#519aba" : n === "Jenkinsfile" ? "#d24939" : n === "Dockerfile" ? "#519aba" : "#a8acb3";
  return '<svg viewBox="0 0 16 16" class="edg"><path d="M3.500 1.500h6l3 3v10h-9z" fill="none" stroke="' + c + '" stroke-width="1.200" stroke-linejoin="round"/><path d="M9.500 1.500v3h3" fill="none" stroke="' + c + '" stroke-width="1.200"/><rect x="5.500" y="8" width="5" height="1.600" rx=".8" fill="' + c + '"/><rect x="5.500" y="11" width="3.400" height="1.400" rx=".7" fill="' + c + '" opacity=".7"/></svg>';
}
var ED_ACT = {
  files: '<path d="M17.500 0h-9L7 1.500V6H2.500L1 7.500v15.100L2.500 24h12l1.500-1.500V18h4.500l1.500-1.500V4zm0 2.100l2.400 2.400h-2.400zM15 22.500H2.500v-15H7v9l1.500 1.500H15zm6-6H8.500v-15H16v4.500l1.500 1.500H21z" transform="scale(.8) translate(2 1)"/>',
  search: '<path d="M15.250 0a8.250 8.250 0 0 0-6.180 13.720L1 21.800l1.200 1.200 8.050-8.080A8.250 8.250 0 1 0 15.250.010zm0 15a6.750 6.750 0 1 1 0-13.500 6.750 6.750 0 0 1 0 13.500z" transform="scale(.82) translate(2 1)"/>',
  scm: '<path d="M21.500 2.500a3 3 0 0 0-1.500 5.600v1.900a1.500 1.500 0 0 1-1.500 1.500h-6A4.500 4.500 0 0 0 9.500 12.400V7.900a3 3 0 1 0-1.500 0v8.200a3 3 0 1 0 1.500 0v-1.100a4.500 4.500 0 0 1 3.500-1.500h5.500a3 3 0 0 0 3-3V8.100a3 3 0 0 0-.5-5.600zM8.750 4.500a1.500 1.500 0 1 1-1.500 1.500 1.500 1.500 0 0 1 1.500-1.500zm0 15a1.500 1.500 0 1 1 1.500-1.500 1.500 1.500 0 0 1-1.500 1.500zm12.750-12a1.500 1.500 0 1 1 1.500-1.500 1.500 1.500 0 0 1-1.500 1.500z" transform="scale(.82) translate(1 1)"/>',
  run: '<path d="M6 2l15 10L6 22zm1.500 2.800v14.400L18.300 12z" transform="scale(.9) translate(1 1)"/>',
  ext: '<path d="M13 1h9v9h-9zm1.500 1.500v6h6v-6zM2 12h9v9H2zm1.500 1.500v6h6v-6zM13 12h9v9h-9zm1.500 1.500v6h6v-6zM2 1h9v9H2zm1.500 1.500v6h6v-6z" transform="scale(.82) translate(2 2)"/>',
  acct: '<path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 1.500a3.500 3.500 0 1 1 0 7 3.500 3.500 0 0 1 0-7zM4 21c0-4 3.500-6.500 8-6.500s8 2.500 8 6.500h-1.500c0-3-2.800-5-6.500-5s-6.500 2-6.500 5z" transform="scale(.82) translate(2 2)"/>',
  gear: '<path d="M19.500 12.900l1.900 1.500-1.900 3.300-2.300-.9a7.500 7.500 0 0 1-1.500.9l-.4 2.500h-3.800l-.4-2.500a7.500 7.500 0 0 1-1.500-.9l-2.300.9-1.900-3.300 1.900-1.500a7.500 7.500 0 0 1 0-1.800L5.400 9.600l1.900-3.300 2.300.9a7.500 7.500 0 0 1 1.500-.9l.4-2.500h3.800l.4 2.500a7.500 7.500 0 0 1 1.500.9l2.300-.9 1.900 3.300-1.900 1.500a7.500 7.500 0 0 1 0 1.800zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" transform="scale(.82) translate(1 0)" fill-rule="evenodd"/>'
};
function edAct(k) { return '<svg viewBox="0 0 24 24" class="edai" fill="currentColor">' + ED_ACT[k] + "</svg>"; }
function edSearchView(box) {
  var q = h("input", { cls: "edsq", type: "text", placeholder: "Search", value: ED.find || "", spellcheck: "false" }), res = h("div", { cls: "edsres" });
  function run() {
    ED.find = q.value; res.textContent = ""; if (!q.value) return; var rx = null; try { rx = new RegExp(q.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); } catch (e) { return; }
    var all = fsAll(), n = 0, files = 0;
    Object.keys(all).filter(function (k) { return k.indexOf(REPO + "/") === 0 && typeof all[k] === "string"; }).sort().forEach(function (k) {
      var hits = []; all[k].split("\n").forEach(function (ln, i) { if (rx.test(ln) && hits.length < 50) hits.push([i + 1, ln]); }); if (!hits.length) return; files++; n += hits.length;
      res.appendChild(h("div", { cls: "edsf" }, [h("span", { html: edGlyph(k.split("/").pop()) }), h("b", { text: k.split("/").pop() }), h("span", { cls: "edsc", text: String(hits.length) })]));
      hits.slice(0, 8).forEach(function (hit) { var i0 = hit[1].search(rx), m = hit[1].match(rx)[0]; res.appendChild(h("div", { cls: "edsl", onclick: function () { edOpen(k); ED.goto = hit[0]; render(); } }, [hit[1].slice(Math.max(0, i0 - 16), i0).replace(/^\s+/, ""), h("mark", { text: m }), hit[1].slice(i0 + m.length, i0 + m.length + 60)])); });
    });
    res.insertBefore(h("div", { cls: "edssum", text: n + " results in " + files + " files" }), res.firstChild);
  }
  q.addEventListener("input", run); box.appendChild(h("div", { cls: "edh", text: "SEARCH" })); box.appendChild(h("div", { cls: "edsqw" }, [q])); box.appendChild(res); setTimeout(function () { run(); if (!q.value) q.focus(); }, 0);
}
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
  if (!ED.active && ED.tabs.length === 0 && !ED.closedAll) { var pref = REPO + "/ansible/dev.yml", all0 = fsAll(); edOpen(UI.edit && all0[UI.edit] != null ? UI.edit : all0[pref] != null ? pref : Object.keys(all0).filter(function (k) { return k.indexOf(REPO + "/") === 0; }).sort()[0]); }
  var root = h("div", { cls: "edr" }), act = h("div", { cls: "edact" }), side = h("div", { cls: "edtree" }), main = h("div", { cls: "edmain" }), stat = h("div", { cls: "edstat" });
  ED.view = ED.view || "files";
  [["files", "Explorer"], ["search", "Search"], ["scm", "Source Control"], ["run", "Run and Debug"], ["ext", "Extensions"]].forEach(function (a) { act.appendChild(h("button", { type: "button", cls: "edab" + (ED.view === a[0] ? " on" : ""), title: a[1], html: edAct(a[0]), onclick: function () { if (a[0] === "files" || a[0] === "search") { ED.view = ED.view === a[0] ? "" : a[0]; render(); } else flash("info", a[1] + " ไม่ได้จำลองใน editor นี้"); } })); });
  act.appendChild(h("span", { cls: "edsp" })); ["acct", "gear"].forEach(function (k) { act.appendChild(h("button", { type: "button", cls: "edab", html: edAct(k), title: k === "gear" ? "Manage" : "Accounts", onclick: function () { flash("info", "ไม่ได้จำลอง"); } })); });
  function nodes(n, base, depth) {
    var out = [];
    Object.keys(n.d).sort().forEach(function (d) { var path = base ? base + "/" + d : d, open = !!ED.exp[path]; out.push(h("button", { type: "button", cls: "edrow", style: "padding-left:" + (6 + depth * 12) + "px", onclick: function () { ED.exp[path] = !open; render(); } }, [h("span", { html: edGlyph(d, true, open) }), h("span", { text: d })])); if (open) nodes(n.d[d], path, depth + 1).forEach(function (x) { out.push(x); }); });
    n.f.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; }).forEach(function (f) { out.push(h("button", { type: "button", cls: "edrow" + (ED.active === f[1] ? " on" : ""), style: "padding-left:" + (6 + depth * 12 + 16) + "px", onclick: function () { edOpen(f[1]); ED.closedAll = false; render(); } }, [h("span", { html: edGlyph(f[0]) }), h("span", { text: f[0] })])); });
    return out;
  }
  if (ED.view === "files") {
    side.appendChild(h("div", { cls: "edh" }, [h("span", { text: "EXPLORER" }), h("span", { cls: "edmore", text: "···" })]));
    side.appendChild(h("button", { type: "button", cls: "edh2", onclick: function () { ED.rootClosed = !ED.rootClosed; render(); } }, [h("span", { html: edGlyph("", true, !ED.rootClosed) }), "PHARMACY-AWS-LAB"]));
    if (!ED.rootClosed) nodes(edTree(), "", 0).forEach(function (x) { side.appendChild(x); });
  } else if (ED.view === "search") edSearchView(side);
  var tabs = h("div", { cls: "edtabs" });
  ED.tabs.forEach(function (p) { var n = p.split("/").pop(); tabs.appendChild(h("div", { cls: "edtab" + (p === ED.active ? " on" : ""), title: p.replace(HOME, "~"), onclick: function () { ED.active = p; render(); } }, [h("span", { html: edGlyph(n) }), h("span", { text: n }), h("b", { cls: "edx", "data-p": p, text: edDirty(p) ? "●" : "×", title: "Close", onclick: function (e) { e.stopPropagation(); ED.tabs.splice(ED.tabs.indexOf(p), 1); delete ED.buf[p]; if (ED.active === p) ED.active = ED.tabs[ED.tabs.length - 1] || null; if (!ED.tabs.length) ED.closedAll = true; render(); } })])); });
  var p = ED.active, bar = [act]; if (ED.view) bar.push(side);
  stat.appendChild(h("span", { cls: "edsl1", html: '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M5 2.500a1.500 1.500 0 1 1 1 1.410v3.200a3.500 3.500 0 0 1 2-.6h1.500a1.500 1.500 0 0 0 1.500-1.500v-.1a1.500 1.500 0 1 1 1.500 0v.1A3 3 0 0 1 9.500 8H8a2 2 0 0 0-2 2v1.100a1.500 1.500 0 1 1-1 0V3.900A1.500 1.500 0 0 1 5 2.500z"/></svg> main' })); stat.appendChild(h("span", { text: "⊗ 0  ⚠ 0" })); stat.appendChild(h("span", { cls: "edsp" }));
  if (!p) {
    main.appendChild(tabs); main.appendChild(h("div", { cls: "edwel" }, [h("div", { html: '<svg viewBox="0 0 24 24" width="120" height="120" fill="#3a3d41"><path d="M23.150 2.587L18.210.21a1.494 1.494 0 0 0-1.705.29l-9.460 8.630-4.120-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.740L3.899 12 .326 15.260a1 1 0 0 0 .001 1.479L1.650 17.940a.999.999 0 0 0 1.276.057l4.120-3.128 9.460 8.630a1.492 1.492 0 0 0 1.704.290l4.942-2.377A1.500 1.500 0 0 0 24 20.060V3.939a1.500 1.500 0 0 0-.850-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>' }), h("div", { cls: "edkb" }, [["Open File", "Explorer ด้านซ้าย"], ["Save", "Ctrl+S"], ["Find in Files", "Search ด้านซ้าย"]].map(function (r) { return h("div", {}, [h("span", { text: r[0] }), h("kbd", { text: r[1] })]); }))]));
    stat.appendChild(h("span", { text: "Ln 1, Col 1" })); root.appendChild(act); if (ED.view) root.appendChild(side); root.appendChild(h("div", { cls: "edcol" }, [main, stat])); return root;
  }
  var ro = edRO(p), kind = edKind(p), ta = h("textarea", { cls: "edta", spellcheck: "false", wrap: "off", readonly: ro ? "readonly" : null }), pre = h("pre", { cls: "edhl" }), gut = h("div", { cls: "edgut" }), wrap = h("div", { cls: "edwrap" }), cur = h("div", { cls: "edcur" });
  ta.value = edText(p);
  var pos = h("span", { text: "Ln 1, Col 1" });
  function lh() { return parseFloat(getComputedStyle(ta).lineHeight) || 20.5; }
  function refresh() {
    var t = ta.value; pre.textContent = ""; pre.appendChild(edHL(t, kind)); var n = t.split("\n").length, before = t.slice(0, ta.selectionStart).split("\n"), ln = before.length;
    gut.textContent = ""; for (var i = 1; i <= n; i++) gut.appendChild(h("div", { cls: i === ln ? "on" : "", text: String(i) }));
    pos.textContent = "Ln " + ln + ", Col " + (before[before.length - 1].length + 1); cur.style.top = (8 + (ln - 1) * lh() - ta.scrollTop) + "px"; gut.scrollTop = ta.scrollTop;
    var tabx = tabs.querySelector('.edx[data-p="' + p.replace(/"/g, '\\"') + '"]'); if (tabx) tabx.textContent = edDirty(p) ? "●" : "×"; save1.disabled = ro || !edDirty(p);
  }
  var save1 = h("button", { type: "button", cls: "edsave", text: "Save", disabled: true, onclick: function () { if (edSave(p)) { flash("ok", "บันทึก " + p.replace(HOME, "~") + " แล้ว"); refresh(); } } });
  var raf = 0;
  ta.addEventListener("input", function () { ED.buf[p] = ta.value; cancelAnimationFrame(raf); raf = requestAnimationFrame(refresh); });
  ta.addEventListener("keyup", refresh); ta.addEventListener("click", refresh);
  ta.addEventListener("scroll", function () { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gut.scrollTop = ta.scrollTop; cur.style.top = (8 + (ta.value.slice(0, ta.selectionStart).split("\n").length - 1) * lh() - ta.scrollTop) + "px"; });
  ta.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); if (edSave(p)) { flash("ok", "บันทึก " + p.replace(HOME, "~") + " แล้ว"); refresh(); } }
    else if (e.key === "Tab" && !ro) { e.preventDefault(); var s = ta.selectionStart; ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; ED.buf[p] = ta.value; refresh(); }
  });
  wrap.appendChild(gut); wrap.appendChild(h("div", { cls: "edcode" }, [cur, pre, ta]));
  var parts = p.replace(REPO + "/", "").replace(HOME, "~").split("/"), bc = h("div", { cls: "edbc" }); parts.forEach(function (x, i) { if (i) bc.appendChild(h("span", { cls: "edbs", text: "›" })); if (i === parts.length - 1) bc.appendChild(h("span", { html: edGlyph(x) })); bc.appendChild(h("span", { text: x })); }); if (ro) bc.appendChild(h("span", { cls: "edro", text: "  🔒 Read-only" }));
  main.appendChild(tabs); main.appendChild(bc); main.appendChild(wrap);
  stat.appendChild(pos); stat.appendChild(h("span", { text: "Spaces: 2" })); stat.appendChild(h("span", { text: "UTF-8" })); stat.appendChild(h("span", { text: "LF" })); stat.appendChild(h("span", { text: edLang(p) })); stat.appendChild(save1);
  root.appendChild(act); if (ED.view) root.appendChild(side); root.appendChild(h("div", { cls: "edcol" }, [main, stat]));
  setTimeout(function () { refresh(); if (ED.goto) { var l = ED.goto; ED.goto = 0; var off = 0, ls = ta.value.split("\n"); for (var i = 0; i < l - 1; i++) off += ls[i].length + 1; ta.focus(); ta.setSelectionRange(off, off); ta.scrollTop = Math.max(0, (l - 6) * lh()); refresh(); } }, 0);
  return root;
}
