// ===== GitHub จำลอง: แท็บ Issues / Discussions / Projects / Security / Insights + หน้า Settings ที่เหลือ (Collaborators, Tags, Rules, Copilot, Pages, Keys ...) — กดทำงานได้จริง เก็บใน rp =====
function ghMe() { return (ghSess() || {}).user || "you"; }
function ghTimeAgo(t) { var s = Math.max(0, Math.round((Date.now() - (t || Date.now())) / 1000)); return s < 60 ? "just now" : s < 3600 ? Math.floor(s / 60) + " minutes ago" : Math.floor(s / 3600) + " hours ago"; }
function ghTabsState(rp) { rp.issues = rp.issues || []; rp.discs = rp.discs || []; rp.proj = rp.proj || { todo: [], doing: [], done: [] }; rp.sec = rp.sec || { policy: false, dependabot: true, scanning: false, secrets: true }; rp.set = rp.set || {}; return rp; }
function ghOpenCount(rp) { return ghTabsState(rp).issues.filter(function (i) { return i.state === "open"; }).length; }

// Issues และ Discussions ใช้ component เดียวกัน (kind = "issues" | "discussions")
function wbGhThreads(user, name, rp, kind, sub) {
  ghTabsState(rp); var isI = kind === "issues", list = isI ? rp.issues : rp.discs, base = "/" + user + "/" + name + "/" + kind, F = W.ght = W.ght || { tab: "open", cat: "General" };
  var one = isI ? "issue" : "discussion", wrap = function (kids, right) { return h("div", { cls: "gx-quick" }, [h("div", { cls: "gx-ph" }, [h("h2", { text: isI ? "Issues" : "Discussions" }), right || null])].concat(kids)); };
  if (sub[0] === "new") {
    return wrap([h("div", { cls: "gx-fld" }, [h("label", { for: "gh-ttl", text: "Add a title" }), h("input", { type: "text", id: "gh-ttl", cls: "gx-in gx-w", placeholder: "Title" })]),
      isI ? null : h("div", { cls: "gx-fld" }, [h("label", { text: "Category" }), h("select", { id: "gh-cat", cls: "gx-in" }, ["General", "Ideas", "Q&A", "Show and tell", "Announcements"].map(function (c) { return h("option", { text: c }); }))]),
      h("div", { cls: "gx-fld" }, [h("label", { for: "gh-bd", text: "Add a description" }), h("textarea", { id: "gh-bd", cls: "gx-in gx-w", rows: "6", placeholder: "Leave a comment" })]),
      h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-green gx-sm2", text: isI ? "Submit new issue" : "Start discussion", onclick: function () {
        var t = (document.getElementById("gh-ttl").value || "").trim(); if (!t) { flash("bad", "Title can't be blank"); return; }
        var n = list.reduce(function (m, x) { return Math.max(m, x.n); }, 0) + 1; list.push({ n: n, title: t, body: document.getElementById("gh-bd").value, state: "open", by: ghMe(), t: Date.now(), cat: (document.getElementById("gh-cat") || {}).value || "", comments: [] }); save(); ghGo(base + "/" + n); } }), h("button", { type: "button", cls: "gx-btn", text: "Cancel", onclick: function () { ghGo(base); } })])]);
  }
  var num = parseInt(sub[0], 10), it = list.filter(function (x) { return x.n === num; })[0];
  if (num && !it) return wrap([h("p", { cls: "gx-mut", text: "404 — #" + num + " not found" })]);
  if (it) {
    var box = h("textarea", { id: "gh-cm", cls: "gx-in gx-w", rows: "4", placeholder: "Leave a comment" }), post = function (close) { var v = box.value.trim(); if (v) it.comments.push({ by: ghMe(), text: v, t: Date.now() }); if (close) it.state = it.state === "open" ? "closed" : "open"; if (v || close) { save(); render(); } };
    return wrap([h("h3", { text: it.title + " #" + it.n }), h("span", { cls: "gh-badge", text: it.state === "open" ? "● Open" : "✓ Closed" }), h("p", { cls: "gx-mut gx-sm", text: it.by + " opened this " + ghTimeAgo(it.t) + " · " + it.comments.length + " comments" }),
      h("div", { cls: "gx-tbox" }, [h("div", { cls: "gx-trow" }, [h("div", {}, [h("b", { text: it.by }), h("div", { text: it.body || "No description provided." })])])].concat(it.comments.map(function (c) { return h("div", { cls: "gx-trow" }, [h("div", {}, [h("b", { text: c.by }), h("span", { cls: "gx-mut gx-sm", text: " commented " + ghTimeAgo(c.t) }), h("div", { text: c.text })])]); }))),
      box, h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-btn", text: it.state === "open" ? "Close " + one : "Reopen " + one, onclick: function () { post(true); } }), h("button", { type: "button", cls: "gx-green gx-sm2", text: "Comment", onclick: function () { post(false); } })]), h("a", { href: "#", cls: "gh-a", text: "← back to " + kind, onclick: function (e) { e.preventDefault(); ghGo(base); } })]);
  }
  var q = (F.q || "").toLowerCase(), shown = list.filter(function (x) { return x.state === F.tab && (!q || x.title.toLowerCase().indexOf(q) >= 0); }).reverse(), cnt = function (s) { return list.filter(function (x) { return x.state === s; }).length; };
  var tabBtn = function (s, t) { return h("a", { href: "#", cls: "gx-tab2" + (F.tab === s ? " on" : ""), text: t + " " + cnt(s), onclick: function (e) { e.preventDefault(); F.tab = s; render(); } }); };
  var newBtn = h("button", { type: "button", cls: "gx-green gx-sm2", text: isI ? "New issue" : "New discussion", onclick: function () { ghGo(base + "/new"); } });
  if (!list.length) return wrap([h("div", { cls: "gx-tbox" }, [h("div", { cls: "gx-blank" }, [h("h3", { text: isI ? "Welcome to issues!" : "Welcome to Discussions!" }), h("p", { cls: "gx-mut", text: isI ? "Issues are used to track todos, bugs, feature requests, and more." : "Discussions are for conversations that need to be open and accessible to everyone." }), newBtn])])]);
  return wrap([h("input", { type: "text", cls: "gx-in gx-w", placeholder: "Search all " + kind, value: F.q || "", oninput: function (e) { F.q = e.target.value; render(); var el = document.querySelector(".gx-quick input"); if (el) { el.focus(); el.setSelectionRange(99, 99); } } }),
    h("div", { cls: "gx-tabs2" }, [tabBtn("open", "Open"), tabBtn("closed", "Closed")]), h("div", { cls: "gx-tbox" }, shown.length ? shown.map(function (x) { return h("div", { cls: "gx-trow" }, [h("a", { href: "#", cls: "gh-a b", text: x.title, onclick: function (e) { e.preventDefault(); ghGo(base + "/" + x.n); } }), h("span", { style: "flex:1" }), h("span", { cls: "gx-mut gx-sm", text: "#" + x.n + " by " + x.by + " · " + x.comments.length + " comments" })]); }) : [h("div", { cls: "gx-blank", text: "No " + F.tab + " " + kind + " match your search." })])], newBtn);
}

// Projects: board 3 คอลัมน์ เพิ่ม/ย้าย/ลบการ์ดได้
function wbGhProjects(user, name, rp) {
  ghTabsState(rp); var cols = [["todo", "Todo"], ["doing", "In Progress"], ["done", "Done"]];
  var add = function (k) { var v = (document.getElementById("gh-pj-" + k).value || "").trim(); if (v) { rp.proj[k].push(v); save(); render(); } };
  return h("div", { cls: "gx-quick" }, [h("div", { cls: "gx-ph" }, [h("h2", { text: "Projects — board" })]), h("div", { style: "display:grid;grid-template-columns:repeat(3,1fr);gap:12px" }, cols.map(function (c, ci) {
    return h("div", { cls: "gx-tbox", style: "padding:8px" }, [h("b", { text: c[1] + " (" + rp.proj[c[0]].length + ")" })].concat(rp.proj[c[0]].map(function (t, ti) {
      var mv = function (to) { return function () { rp.proj[c[0]].splice(ti, 1); if (to) rp.proj[to].push(t); save(); render(); }; };
      return h("div", { cls: "gx-trow" }, [h("span", { text: t, style: "flex:1" }), ci > 0 ? h("button", { type: "button", cls: "gx-btn", text: "←", onclick: function () { rp.proj[c[0]].splice(ti, 1); rp.proj[cols[ci - 1][0]].push(t); save(); render(); } }) : null, ci < 2 ? h("button", { type: "button", cls: "gx-btn", text: "→", onclick: function () { rp.proj[c[0]].splice(ti, 1); rp.proj[cols[ci + 1][0]].push(t); save(); render(); } }) : null, h("button", { type: "button", cls: "gx-trash", text: "🗑", onclick: mv(null) })]);
    })).concat([h("input", { type: "text", id: "gh-pj-" + c[0], cls: "gx-in gx-w", placeholder: "+ Add item", onkeydown: function (e) { if (e.key === "Enter") add(c[0]); } })]));
  }))]);
}

// Security: overview + เปิด/ปิดฟีเจอร์
function wbGhSecurity(user, name, rp) {
  ghTabsState(rp); var S1 = rp.sec, row = function (k, t, d) { return h("div", { cls: "gx-trow" }, [h("div", { style: "flex:1" }, [h("b", { text: t }), h("div", { cls: "gx-mut gx-sm", text: d })]), h("span", { cls: "gh-badge", text: S1[k] ? "Enabled" : "Disabled" }), h("button", { type: "button", cls: "gx-btn", text: S1[k] ? "Disable" : "Enable", onclick: function () { S1[k] = !S1[k]; save(); render(); } })]); };
  return h("div", { cls: "gx-quick" }, [h("div", { cls: "gx-ph" }, [h("h2", { text: "Security overview" })]), h("div", { cls: "gx-tbox" }, [row("policy", "Security policy", "Tell people how to report vulnerabilities (SECURITY.md)"), row("dependabot", "Dependabot alerts", S1.dependabot ? "0 open alerts — no vulnerable dependencies found" : "Get notified when dependencies are vulnerable"), row("scanning", "Code scanning", "Find vulnerabilities in code with CodeQL"), row("secrets", "Secret scanning", S1.secrets ? "0 leaked secrets detected" : "Detect secrets committed to the repo")])]);
}

// Insights: pulse + contributors + languages จากข้อมูลจริงของ repo
function wbGhInsights(user, name, rp) {
  ghTabsState(rp); var files = rp.files || {}, byLang = {}, tot = 0; Object.keys(files).forEach(function (k) { var e = (/\.([A-Za-z0-9]+)$/.exec(k) || [])[1], l = GH_LANG[e]; if (l) { byLang[l[0]] = (byLang[l[0]] || 0) + files[k].length; tot += files[k].length; } });
  var stat = function (t, v) { return h("div", { cls: "gx-trow" }, [h("b", { text: v }), h("span", { cls: "gx-mut", text: t })]); };
  return h("div", { cls: "gx-quick" }, [h("div", { cls: "gx-ph" }, [h("h2", { text: "Pulse" })]), h("div", { cls: "gx-tbox" }, [stat("Commits on main", String((rp.n || 0) + 1)), stat("Contributors", "1 (" + user + ")"), stat("Tags", String((rp.tags || []).length)), stat("Open issues", String(ghOpenCount(rp))), stat("Closed issues", String(rp.issues.filter(function (i) { return i.state === "closed"; }).length)), stat("Workflow runs", String((typeof ghaRunsOf === "function" ? ghaRunsOf(user + "/" + name) : []).length))]),
    h("h3", { text: "Languages" }), h("div", { cls: "gx-tbox" }, Object.keys(byLang).sort(function (a, b) { return byLang[b] - byLang[a]; }).map(function (l) { return stat(l, (byLang[l] * 100 / tot).toFixed(1) + "%"); }))]);
}

// Settings ที่เหลือ: รายการ + เพิ่ม/ลบ (Collaborators, Deploy keys, Tag/branch rules, Pages, Copilot ...)
var GH_RS_LISTS = {
  "/access": ["Collaborators and teams", "Invite a collaborator", "username", "Add people"],
  "/roles": ["Team and member roles", "Add a member role", "role name (เช่น triage)", "Add role"],
  "/tag_protection": ["Tag protection rules", "Protect tag pattern", "pattern (เช่น v*)", "Add rule"],
  "/rules": ["Rulesets", "New ruleset", "ruleset name", "Create ruleset"],
  "/keys": ["Deploy keys", "Add deploy key", "title", "Add key"],
  "/installations": ["GitHub Apps", "Install app", "app name", "Install"],
  "/notifications": ["Email notifications", "Add address", "email", "Add"]
};
function wbGhSetList(user, name, rp, p, shell) {
  var cfg = GH_RS_LISTS[p]; if (!cfg) return null; ghTabsState(rp); var L = rp.set[p] = rp.set[p] || (p === "/access" ? [user + " (Owner)"] : []);
  return shell(cfg[0], null, [h("div", { cls: "gx-tbox" }, L.length ? L.map(function (x, i) { return h("div", { cls: "gx-trow" }, [h("span", { text: x, style: "flex:1" }), p === "/access" && i === 0 ? null : h("button", { type: "button", cls: "gx-trash", text: "🗑", onclick: function () { L.splice(i, 1); save(); render(); } })]); }) : [h("div", { cls: "gx-blank", text: "Nothing here yet." })]),
    h("div", { cls: "gx-fld" }, [h("label", { text: cfg[1] }), h("input", { type: "text", id: "gh-sl", cls: "gx-in gx-w", placeholder: cfg[2] }), h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-green gx-sm2", text: cfg[3], onclick: function () { var v = document.getElementById("gh-sl").value.trim(); if (!v) { flash("bad", "Value can't be blank"); return; } L.push(v); save(); render(); } })])])]);
}
function wbGhSetToggle(user, name, rp, p, shell) {
  if (p !== "/pages" && p !== "/copilot" && p !== "/security_analysis") return null; ghTabsState(rp); var T = rp.set[p] = rp.set[p] || {};
  var opt = p === "/pages" ? [["Build and deployment source", ["Deploy from a branch", "GitHub Actions"]]] : [], on = !!T.on, ttl = p === "/pages" ? "GitHub Pages" : p === "/copilot" ? "Copilot" : "Advanced security";
  return shell(ttl, null, [h("div", { cls: "gx-fld" }, [h("label", { cls: "gx-rad" }, [h("input", { type: "checkbox", checked: on ? "checked" : null, onchange: function (e) { T.on = e.target.checked; save(); render(); } }), " Enable " + ttl]), on && p === "/pages" ? h("p", { cls: "gx-mut gx-sm", text: "Your site is live at https://" + user + ".github.io/" + name + "/" }) : null])].concat(opt.map(function (o) { return h("div", { cls: "gx-fld" }, [h("label", { text: o[0] }), h("select", { cls: "gx-in", onchange: function (e) { T.src = e.target.value; save(); } }, o[1].map(function (x) { return h("option", { text: x, selected: T.src === x ? "selected" : null }); }))]); })));
}
// Branches: เพิ่ม/ลบ branch protection rule
function wbGhBranchRules(user, name, rp, shell) {
  ghTabsState(rp); var R = rp.set.branchRules = rp.set.branchRules || [];
  return shell("Branches", null, [h("div", { cls: "gx-fld" }, [h("label", { text: "Default branch" }), h("div", { cls: "gx-trow gx-tbox" }, [h("b", { text: "main" })])]), h("div", { cls: "gx-fld" }, [h("label", { text: "Branch protection rules" }), h("div", { cls: "gx-tbox" }, R.length ? R.map(function (x, i) { return h("div", { cls: "gx-trow" }, [h("b", { text: x }), h("span", { cls: "gx-mut gx-sm", text: "Require a pull request before merging", style: "flex:1" }), h("button", { type: "button", cls: "gx-trash", text: "🗑", onclick: function () { R.splice(i, 1); save(); render(); } })]); }) : [h("div", { cls: "gx-blank", text: "No branch protection rules defined yet." })]), h("input", { type: "text", id: "gh-br", cls: "gx-in gx-w", placeholder: "Branch name pattern (เช่น main)" }), h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-green gx-sm2", text: "Add classic branch protection rule", onclick: function () { var v = document.getElementById("gh-br").value.trim(); if (!v) { flash("bad", "Branch name pattern can't be blank"); return; } R.push(v); save(); render(); } })])])]);
}

// ===== Pull requests: compare branch → main, Create, Merge/Close (branch มาจาก git checkout -b + git push origin <branch>) =====
function ghDiff(rp, br) { var a = rp.files || {}, b = (rp.branches || {})[br] || {}, o = []; Object.keys(b).forEach(function (k) { if (!(k in a)) o.push({ f: k, s: "added", p: b[k].split("\n").length, m: 0 }); else if (a[k] !== b[k]) o.push({ f: k, s: "modified", p: Math.max(1, b[k].split("\n").length - a[k].split("\n").length + 1), m: 1 }); }); Object.keys(a).forEach(function (k) { if (!(k in b)) o.push({ f: k, s: "deleted", p: 0, m: a[k].split("\n").length }); }); return o; }
// diff ระดับบรรทัด: ตัด prefix/suffix ที่เหมือนกัน เหลือส่วนกลางเป็น −/+ พร้อม context 2 บรรทัด
function ghHunk(rp, f, src) { var a = ((rp.files || {})[f] || "").split("\n"), b = (src[f] || "").split("\n"); if (!(f in (rp.files || {}))) a = []; if (!(f in src)) b = []; var p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++; var s = 0; while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++; var o = []; a.slice(Math.max(0, p - 2), p).forEach(function (x) { o.push(["  ", x]); }); a.slice(p, a.length - s).forEach(function (x) { o.push(["- ", x]); }); b.slice(p, b.length - s).forEach(function (x) { o.push(["+ ", x]); }); b.slice(b.length - s, b.length - s + 2).forEach(function (x) { o.push(["  ", x]); }); return h("pre", { cls: "gx-diff" }, o.map(function (l) { return h("div", { style: l[0] === "+ " ? "background:#dafbe1" : l[0] === "- " ? "background:#ffebe9" : "", text: l[0] + l[1] }); })); }
function wbGhPrs(user, name, rp, sub) {
  ghTabsState(rp); rp.prs = rp.prs || []; var base = "/" + user + "/" + name + "/pulls", wrap = function (kids, right) { return h("div", { cls: "gx-quick" }, [h("div", { cls: "gx-ph" }, [h("h2", { text: "Pull requests" }), right || null])].concat(kids)); }, F = W.ghp = W.ghp || { tab: "open" };
  var brs = Object.keys(rp.branches || {});
  if (sub[0] === "new" || sub[0] === "compare") {
    var sel = sub[1] || brs[0], df = sel ? ghDiff(rp, sel) : [], used = rp.prs.some(function (x) { return x.head === sel && x.state === "open"; });
    return wrap([h("div", { cls: "gx-fld" }, [h("label", { text: "Compare changes" }), h("div", { style: "display:flex;gap:8px;align-items:center" }, [h("span", { cls: "gx-btn", text: "base: main" }), "←", h("select", { cls: "gx-in", onchange: function (e) { ghGo(base + "/compare/" + e.target.value); } }, [h("option", { text: "(เลือก branch)", value: "" })].concat(brs.map(function (b) { return h("option", { text: "compare: " + b, value: b, selected: b === sel ? "selected" : null }); })))])]),
      !brs.length ? h("p", { cls: "gx-mut", text: "ยังไม่มี branch อื่นบน GitHub — ใน Terminal: git checkout -b feature/x → แก้ไฟล์ → git add . → git commit -m ... → git push -u origin feature/x" }) : null,
      sel && !df.length ? h("p", { cls: "gx-mut", text: "There isn’t anything to compare. main is up to date with all commits from " + sel + "." }) : null,
      sel && df.length ? h("div", {}, [h("div", { cls: "gx-fld" }, [h("label", { for: "gh-prt", text: "Add a title" }), h("input", { type: "text", id: "gh-prt", cls: "gx-in gx-w", value: sel.replace(/[-_\/]/g, " ") })]), h("div", { cls: "gx-fld" }, [h("label", { text: "Add a description" }), h("textarea", { id: "gh-prb", cls: "gx-in gx-w", rows: "5" })]),
        h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-green gx-sm2", disabled: used ? "disabled" : null, text: used ? "A pull request already exists" : "Create pull request", onclick: function () { var n = rp.prs.reduce(function (m, x) { return Math.max(m, x.n); }, 0) + 1; rp.prs.push({ n: n, title: document.getElementById("gh-prt").value || sel, body: document.getElementById("gh-prb").value, head: sel, state: "open", by: ghMe(), t: Date.now(), comments: [] }); save(); if (typeof API !== "undefined" && API.ghaPr) API.ghaPr(user + "/" + name, sel); ghGo(base + "/" + n); } })]),
        h("h3", { text: df.length + " changed files" }), h("div", { cls: "gx-tbox" }, df.map(function (x) { return h("div", { cls: "gx-trow" }, [h("code", { text: x.f, style: "flex:1" }), h("span", { cls: "gx-mut gx-sm", text: x.s }), h("b", { style: "color:#1a7f37", text: "+" + x.p }), h("b", { style: "color:#cf222e", text: "−" + x.m })]); }))]) : null]);
  }
  var num = parseInt(sub[0], 10), pr = rp.prs.filter(function (x) { return x.n === num; })[0];
  if (num && !pr) return wrap([h("p", { cls: "gx-mut", text: "404 — pull request #" + num + " not found" })]);
  if (pr) {
    var df2 = pr.state === "merged" ? pr.diff : ghDiff(rp, pr.head), box = h("textarea", { cls: "gx-in gx-w", rows: "3", placeholder: "Leave a comment" }), chk = pr.state === "open" ? ghMergeBlock(rp, pr) : "";
    var done = function (s) { pr.state = s; if (s === "merged") { pr.diff = df2; rp.files = JSON.parse(JSON.stringify(rp.branches[pr.head])); rp.n = (rp.n || 0) + 1; if (API.ghaPush) API.ghaPush(user + "/" + name, "main"); } save(); render(); };
    return wrap([h("h3", { text: pr.title + " #" + pr.n }), h("span", { cls: "gh-badge", text: pr.state === "open" ? "● Open" : pr.state === "merged" ? "⑂ Merged" : "✓ Closed" }), h("p", { cls: "gx-mut gx-sm", text: pr.by + " wants to merge 1 commit into main from " + pr.head + " · " + ghTimeAgo(pr.t) }),
      pr.body ? h("div", { cls: "gx-tbox" }, [h("div", { cls: "gx-trow", text: pr.body })]) : null, h("h3", { text: "Files changed (" + df2.length + ")" }), h("div", { cls: "gx-tbox" }, df2.map(function (x) { return h("details", { cls: "gx-trow", style: "display:block" }, [h("summary", { style: "cursor:pointer;display:flex;gap:12px" }, [h("code", { text: x.f, style: "flex:1" }), h("span", { cls: "gx-mut gx-sm", text: x.s }), h("b", { style: "color:#1a7f37", text: "+" + x.p }), h("b", { style: "color:#cf222e", text: "−" + x.m })]), ghHunk(rp, x.f, pr.state === "merged" ? rp.files : rp.branches[pr.head] || {})]); })),
      pr.state === "open" ? ghReviewBox(user, name, rp, pr) : null, (pr.reviews || []).length ? h("div", { cls: "gx-tbox" }, pr.reviews.map(function (r) { return h("div", { cls: "gx-trow" }, [h("b", { text: r.by }), h("span", { text: r.state === "approved" ? " approved these changes" : r.state === "changes" ? " requested changes" : " reviewed", style: "color:" + (r.state === "approved" ? "#1a7f37" : r.state === "changes" ? "#cf222e" : "#59636e") }), r.text ? h("span", { cls: "gx-mut", text: " — " + r.text }) : null]); })) : null,
      (function () { var cr = (typeof ghaRunsOf === "function" ? ghaRunsOf(user + "/" + name) : []).filter(function (r) { return r.trigger === "pull_request" && r.ref === pr.head; })[0]; return cr ? h("div", { cls: "gx-tbox" }, [h("div", { cls: "gx-trow" }, [h("b", { text: (cr.status === "success" ? "✓ All checks have passed" : "✗ Some checks were not successful"), style: "flex:1;color:" + (cr.status === "success" ? "#1a7f37" : "#cf222e") }), h("a", { href: "#", cls: "gh-a", text: "checks #" + cr.id + " — Details", onclick: function (e) { e.preventDefault(); ghGo("/" + user + "/" + name + "/actions/runs/" + cr.id); } })])]) : null; })(),
      pr.state === "open" ? h("div", { cls: "gx-tbox" }, [h("div", { cls: "gx-trow" }, [h("span", { text: chk ? "⚠ " + chk : "✓ This branch has no conflicts with the base branch", style: "flex:1" }), h("button", { type: "button", cls: "gx-green gx-sm2", text: "Merge pull request", onclick: function () { if (chk) { flash("bad", "Merging is blocked: " + chk); render(); return; } done("merged"); } }), h("button", { type: "button", cls: "gx-btn", text: "Close pull request", onclick: function () { done("closed"); } })])]) : null,
      h("a", { href: "#", cls: "gh-a", text: "← back to pull requests", onclick: function (e) { e.preventDefault(); ghGo(base); } })]);
  }
  var cnt = function (s) { return rp.prs.filter(function (x) { return x.state === s; }).length; }, shown = rp.prs.filter(function (x) { return F.tab === "open" ? x.state === "open" : x.state !== "open"; }).reverse();
  return wrap([h("div", { cls: "gx-tabs2" }, [h("a", { href: "#", cls: "gx-tab2" + (F.tab === "open" ? " on" : ""), text: "Open " + cnt("open"), onclick: function (e) { e.preventDefault(); F.tab = "open"; render(); } }), h("a", { href: "#", cls: "gx-tab2" + (F.tab !== "open" ? " on" : ""), text: "Closed " + (cnt("closed") + cnt("merged")), onclick: function (e) { e.preventDefault(); F.tab = "closed"; render(); } })]),
    h("div", { cls: "gx-tbox" }, shown.length ? shown.map(function (x) { return h("div", { cls: "gx-trow" }, [h("a", { href: "#", cls: "gh-a b", text: x.title, onclick: function (e) { e.preventDefault(); ghGo(base + "/" + x.n); } }), h("span", { style: "flex:1" }), h("span", { cls: "gx-mut gx-sm", text: "#" + x.n + " " + x.state + " · " + x.head + " → main" })]); }) : [h("div", { cls: "gx-blank" }, [h("h3", { text: "Welcome to pull requests!" }), h("p", { cls: "gx-mut", text: "Pull requests help you collaborate on code with other people." })])])], h("button", { type: "button", cls: "gx-green gx-sm2", text: "New pull request", onclick: function () { ghGo(base + "/new"); } }));
}

// ===== dropdown ตัวอย่างให้ทุกช่องกรอกของหน้า GitHub: เลือกตัวอย่างหรือพิมพ์เองได้ (ใส่ค่าแล้วยิง input event ให้ handler เดิมเก็บค่า) =====
var GH_EX = [
  [/^gh-ttl$/, ["Bug: login fails with wrong token", "Add /healthz endpoint", "Upgrade Django to 5.2"]],
  [/^gh-bd$|^gh-cm$|^gh-prb$|Leave a comment/, ["Steps to reproduce: 1) login 2) open stock page", "LGTM 👍", "Please add a test for this change"]],
  [/^gh-prt$/, ["Add NEW.md", "Fix image tag in deployment.yaml", "Update terraform plan"]],
  [/^gh-pj-/, ["Write README", "Fix CI pipeline", "Deploy to dev"]],
  [/^gh-br$|Branch name pattern/, ["main", "release/*", "v*"]],
  [/^gh-envn$|^Name$/, ["production", "staging", "dev"]],
  [/^gh-sn$/, ["AWS_ROLE_ARN", "ECR_REGISTRY", "SONAR_TOKEN"]],
  [/^gh-sv$/, ["arn:aws:iam::123456789012:role/gha-deploy", "123456789012.dkr.ecr.ap-southeast-1.amazonaws.com"]],
  [/^gh-hurl$|^https:\/\/example\.com\/postreceive/, ["http://203.0.113.15:8080/github-webhook/", "https://example.com/postreceive"]],
  [/^gh-tnote$|^gh-fname$/, ["jenkins-pharmacy", "argocd-read", "ci-lab"]],
  [/^Bio$/, ["DevOps learner · AWS, Terraform, Jenkins", "Pharmacy app maintainer"]],
  [/^invite|^username$|^username/i, ["maht25102542", "demo-user", "teammate"]],
  [/^role name|^Add a member|\(เช่น triage\)/, ["triage", "maintain"]],
  [/^Description$/, ["Used by Jenkins to push image tags to pharmacy-manifests"]],
  [/^Username$|^username$/, ["maht25102542", "demo-user", "teammate"]],
  [/^gh-nrn$/, ["pharmacy-backend", "pharmacy-frontend", "pharmacy-manifests"]],
  [/^gh-nrd$/, ["Django REST backend", "Next.js frontend", "GitOps manifests"]],
  [/^gh-rtag$|^Choose a tag/, ["v1.0.0", "v1.1.0", "v2.0.0"]],
  [/^gh-rtt$|^Release title/, ["v1.0.0", "Release 1.1 — bug fixes"]],
  [/^gh-rbd$|^Describe this release/, ["First release", "Bug fixes and image tag updates"]],
  [/^Search all|^Search for people/, ["login", "bug", "maht25102542"]],
  [/^Wait timer/, ["0", "5", "30"]],
  [/^pattern|เช่น v\*/, ["v*", "release-*"]],
  [/^ruleset name/, ["protect-main", "require-pr"]],
  [/^title$/, ["deploy-key-ci", "argocd-read"]],
  [/^app name/, ["argocd", "jenkins"]],
  [/^email$/, ["me@example.com"]]
];
function ghExFor(el) { var hit = null; [el.id, el.getAttribute("aria-label"), el.getAttribute("placeholder")].forEach(function (k) { if (!hit && k) GH_EX.some(function (g) { if (g[0].test(k)) { hit = g[1]; return true; } }); }); return hit; }
function ghDecorate() {
  [].forEach.call(document.querySelectorAll("#main .gh input[type=text], #main .gh textarea"), function (el) {
    if (el.dataset.exd || el.readOnly || el.disabled) return; var ex = ghExFor(el); if (!ex) return; el.dataset.exd = "1";
    var s = h("select", { cls: "gx-in gx-exsel", "aria-label": "ตัวอย่าง: " + (el.getAttribute("aria-label") || el.id || el.placeholder || "ช่องกรอก"), onchange: function (e) { var v = e.target.value; e.target.selectedIndex = 0; if (v === "\u0000") { el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); el.focus(); return; } if (!v) return; el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); } }, [h("option", { value: "", text: "— เลือกตัวอย่าง —" })].concat(ex.map(function (x) { return h("option", { value: x, text: x }); })).concat([h("option", { value: "\u0000", text: "ไม่ระบุ — พิมพ์เอง" })]));
    el.parentNode.insertBefore(s, el);
  });
}
var ghRender0 = render; render = function () { ghRender0(); ghDecorate(); };

// branch protection rule ที่ main = ต้องมี approve ≥1 (จากคนที่ไม่ใช่เจ้าของ PR) และไม่มี changes requested ค้างอยู่
function ghMergeBlock(rp, pr) { if ((rp.set.branchRules || []).indexOf("main") < 0) return ""; var last = {}; (pr.reviews || []).forEach(function (r) { last[r.by] = r.state; }); var st = Object.keys(last).map(function (k) { return last[k]; }); if (st.indexOf("changes") >= 0) return "Changes requested — resolve before merging"; if (st.indexOf("approved") < 0) return "At least 1 approving review is required by reviewers with write access (branch protection rule on main)"; return ""; }
function ghReviewBox(user, name, rp, pr) {
  var F = W.ghrv = W.ghrv || { as: "teammate" }, collab = (rp.set["/access"] || []).map(function (x) { return x.replace(/ \(.*$/, ""); }).filter(function (x) { return x !== pr.by; }), who = ["teammate", "reviewer-bot"].concat(collab).filter(function (x, i, a) { return a.indexOf(x) === i; });
  var box = h("textarea", { id: "gh-prc", cls: "gx-in gx-w", rows: "3", placeholder: "Leave a comment" }), sub = function (st) { pr.reviews = (pr.reviews || []).concat([{ by: F.as, state: st, text: box.value.trim(), t: Date.now() }]); save(); render(); };
  return h("div", { cls: "gx-tbox", style: "padding:12px" }, [h("b", { text: "Review changes" }), h("div", { cls: "gx-mut gx-sm", text: "ผู้ตรวจ (GitHub ไม่ให้ approve PR ของตัวเอง จึงเลือกว่าจะตรวจในนามใคร)" }), h("select", { cls: "gx-in", "aria-label": "Review as", onchange: function (e) { F.as = e.target.value; } }, who.map(function (x) { return h("option", { text: x, selected: x === F.as ? "selected" : null }); })), box,
    h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-btn", text: "Comment", onclick: function () { sub("comment"); } }), h("button", { type: "button", cls: "gx-btn", text: "Request changes", onclick: function () { sub("changes"); } }), h("button", { type: "button", cls: "gx-green gx-sm2", text: "Approve", onclick: function () { sub("approved"); } })])]);
}
