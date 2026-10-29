// ===== GitHub จำลอง: แท็บ Issues / Discussions / Projects / Security / Insights + หน้า Settings ที่เหลือ (Collaborators, Tags, Rules, Copilot, Pages, Keys ...) — กดทำงานได้จริง เก็บใน rp =====
function ghMe() { return (ghSess() || {}).user || "you"; }
function ghTabsState(rp) { rp.issues = rp.issues || []; rp.discs = rp.discs || []; rp.proj = rp.proj || { backlog: [], todo: [], doing: [], review: [], done: [] }; rp.sec = rp.sec || { policy: false, dependabot: true, scanning: false, secrets: true }; rp.set = rp.set || {}; return rp; }
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
        var n = list.reduce(function (m, x) { return Math.max(m, x.n); }, 0) + 1; list.push({ n: n, title: t, body: document.getElementById("gh-bd").value, state: "open", by: ghMe(), t: Date.now(), cat: (document.getElementById("gh-cat") || {}).value || "", comments: [] }); if (isI) ghProjAuto(rp, "Issue", n, t, "todo"); save(); ghGo(base + "/" + n); } }), h("button", { type: "button", cls: "gx-btn", text: "Cancel", onclick: function () { ghGo(base); } })])]);
  }
  var num = parseInt(sub[0], 10), it = list.filter(function (x) { return x.n === num; })[0];
  if (num && !it) return wrap([h("p", { cls: "gx-mut", text: "404 — #" + num + " not found" })]);
  if (it) {
    var box = h("textarea", { id: "gh-cm", cls: "gx-in gx-w", rows: "4", placeholder: "Leave a comment" }), post = function (close) { var v = box.value.trim(); if (!v && !close) { flash("bad", "Comment can’t be blank"); render(); return; } if (v) it.comments.push({ by: ghMe(), text: v, t: Date.now() }); if (close) { it.state = it.state === "open" ? "closed" : "open"; if (isI) ghProjMove(rp, "Issue", it.n, it.state === "closed" ? "done" : "todo"); } if (v || close) { save(); render(); } };
    return wrap([h("h3", { text: it.title + " #" + it.n }), ghEditTitle(it), ghMeta(it), h("span", { cls: "gh-badge", text: it.state === "open" ? "● Open" : "✓ Closed" }), h("p", { cls: "gx-mut gx-sm", text: it.by + " opened this " + ghTimeAgo(it.t) + " · " + it.comments.length + " comments" }),
      ghThreadBox(it),
      box, h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-btn", text: it.state === "open" ? "Close " + one : "Reopen " + one, onclick: function () { post(true); } }), h("button", { type: "button", cls: "gx-green gx-sm2", text: "Comment", onclick: function () { post(false); } })]), h("button", { type: "button", cls: "gx-btn", style: "color:#cf222e", text: W.ghdi === it ? "Confirm delete " + one : "Delete " + one, onclick: function () { if (W.ghdi !== it) { W.ghdi = it; flash("info", "กดอีกครั้งเพื่อยืนยันการลบ"); render(); return; } list.splice(list.indexOf(it), 1); W.ghdi = null; save(); ghGo(base); } }), h("a", { href: "#", cls: "gh-a", text: "← back to " + kind, onclick: function (e) { e.preventDefault(); ghGo(base); } })]);
  }
  var q = (F.q || "").toLowerCase(), shown = list.filter(function (x) { return x.state === F.tab && (!q || x.title.toLowerCase().indexOf(q) >= 0); }).reverse(), cnt = function (s) { return list.filter(function (x) { return x.state === s; }).length; };
  var tabBtn = function (s, t) { return h("a", { href: "#", cls: "gx-tab2" + (F.tab === s ? " on" : ""), text: t + " " + cnt(s), onclick: function (e) { e.preventDefault(); F.tab = s; render(); } }); };
  var newBtn = h("button", { type: "button", cls: "gx-green gx-sm2", text: isI ? "New issue" : "New discussion", onclick: function () { ghGo(base + "/new"); } });
  if (!list.length) return wrap([h("div", { cls: "gx-tbox" }, [h("div", { cls: "gx-blank" }, [h("h3", { text: isI ? "Welcome to issues!" : "Welcome to Discussions!" }), h("p", { cls: "gx-mut", text: isI ? "Issues are used to track todos, bugs, feature requests, and more." : "Discussions are for conversations that need to be open and accessible to everyone." }), newBtn])])]);
  return wrap([isI ? h("a", { href: "#", cls: "gh-a", text: "🏷 Manage labels", onclick: function (e) { e.preventDefault(); ghGo("/" + user + "/" + name + "/labels"); } }) : null, h("input", { type: "text", cls: "gx-in gx-w", placeholder: "Search all " + kind, value: F.q || "", oninput: function (e) { F.q = e.target.value; render(); var el = document.querySelector(".gx-quick input"); if (el) { el.focus(); el.setSelectionRange(99, 99); } } }),
    h("div", { cls: "gx-tabs2" }, [tabBtn("open", "Open"), tabBtn("closed", "Closed")]), h("div", { cls: "gx-tbox" }, shown.length ? shown.map(function (x) { return h("div", { cls: "gx-trow" }, [h("a", { href: "#", cls: "gh-a b", text: x.title, onclick: function (e) { e.preventDefault(); ghGo(base + "/" + x.n); } }), h("span", { style: "flex:1" }), h("span", { cls: "gx-mut gx-sm", text: "#" + x.n + " by " + x.by + " · " + x.comments.length + " comments" + ((x.labels || []).length ? " · " + x.labels.join(", ") : "") })]); }) : [h("div", { cls: "gx-blank", text: "No " + F.tab + " " + kind + " match your search." })])], newBtn);
}

// Projects: board 3 คอลัมน์ เพิ่ม/ย้าย/ลบการ์ดได้
// Security: overview + เปิด/ปิดฟีเจอร์
// Insights: pulse + contributors + languages จากข้อมูลจริงของ repo
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
function wbGhSetToggle(user, name, rp, p, shell) {
  if (p !== "/pages" && p !== "/copilot" && p !== "/security_analysis") return null; ghTabsState(rp); var T = rp.set[p] = rp.set[p] || {};
  var opt = p === "/pages" ? [["Build and deployment source", ["Deploy from a branch", "GitHub Actions"]]] : [], on = !!T.on, ttl = p === "/pages" ? "GitHub Pages" : p === "/copilot" ? "Copilot" : "Advanced security";
  return shell(ttl, null, [h("div", { cls: "gx-fld" }, [h("label", { cls: "gx-rad" }, [h("input", { type: "checkbox", checked: on ? "checked" : null, onchange: function (e) { T.on = e.target.checked; save(); render(); } }), " Enable " + ttl]), on && p === "/pages" ? h("p", { cls: "gx-mut gx-sm", text: "Your site is live at https://" + user + ".github.io/" + name + "/" }) : null])].concat(opt.map(function (o) { return h("div", { cls: "gx-fld" }, [h("label", { text: o[0] }), h("select", { cls: "gx-in", onchange: function (e) { T.src = e.target.value; save(); } }, o[1].map(function (x) { return h("option", { text: x, selected: T.src === x ? "selected" : null }); }))]); })));
}
// Branches: เพิ่ม/ลบ branch protection rule
// ===== Pull requests: compare branch → main, Create, Merge/Close (branch มาจาก git checkout -b + git push origin <branch>) =====
function ghDiff(rp, br, base) { var a = (!base || base === "main" ? rp.files : (rp.branches || {})[base]) || {}, b = (rp.branches || {})[br] || {}, o = []; Object.keys(b).forEach(function (k) { if (!(k in a)) o.push({ f: k, s: "added", p: b[k].split("\n").length, m: 0 }); else if (a[k] !== b[k]) o.push({ f: k, s: "modified", p: Math.max(1, b[k].split("\n").length - a[k].split("\n").length + 1), m: 1 }); }); /* ponytail: ไม่นับไฟล์ที่ branch ไม่มี เป็น deleted — snapshot มาจากโฟลเดอร์ local ที่อาจไม่มีไฟล์ของ main · ถ้าต้อง rm ไฟล์ใน PR ค่อยเพิ่ม */ return o; }
// diff ระดับบรรทัด: ตัด prefix/suffix ที่เหมือนกัน เหลือส่วนกลางเป็น −/+ พร้อม context 2 บรรทัด
function ghHunk(rp, f, src, baseF) { var A = baseF || rp.files || {}, a = (A[f] || "").split("\n"), b = (src[f] || "").split("\n"); if (!(f in A)) a = []; if (!(f in src)) b = []; var p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++; var s = 0; while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++; var o = []; a.slice(Math.max(0, p - 2), p).forEach(function (x) { o.push(["  ", x]); }); a.slice(p, a.length - s).forEach(function (x) { o.push(["- ", x]); }); b.slice(p, b.length - s).forEach(function (x) { o.push(["+ ", x]); }); b.slice(b.length - s, b.length - s + 2).forEach(function (x) { o.push(["  ", x]); }); return h("pre", { cls: "gx-diff" }, o.map(function (l) { return h("div", { style: l[0] === "+ " ? "background:#dafbe1" : l[0] === "- " ? "background:#ffebe9" : "", text: l[0] + l[1] }); })); }
function wbGhPrs(user, name, rp, sub) {
  ghTabsState(rp); rp.prs = rp.prs || []; var base = "/" + user + "/" + name + "/pulls", wrap = function (kids, right) { return h("div", { cls: "gx-quick" }, [h("div", { cls: "gx-ph" }, [h("h2", { text: "Pull requests" }), right || null])].concat(kids)); }, F = W.ghp = W.ghp || { tab: "open" };
  var brs = Object.keys(rp.branches || {});
  if (sub[0] === "new" || sub[0] === "compare") {
    var bs = W.ghBase && (W.ghBase === "main" || (rp.branches || {})[W.ghBase]) ? W.ghBase : ((rp.branches || {}).develop ? "develop" : "main"), heads = brs.filter(function (b) { return b !== bs; }), sel = sub[1] && heads.indexOf(sub[1]) >= 0 ? sub[1] : heads[0], df = sel ? ghDiff(rp, sel, bs) : [], used = rp.prs.some(function (x) { return x.head === sel && x.base === bs && x.state === "open"; });
    return wrap([h("div", { cls: "gx-fld" }, [h("label", { text: "Compare changes" }), h("div", { style: "display:flex;gap:8px;align-items:center" }, [h("select", { cls: "gx-in", "aria-label": "base branch", onchange: function (e) { W.ghBase = e.target.value; ghGo(base + "/compare/" + (sel || "")); } }, ["main"].concat(brs).map(function (b) { return h("option", { text: "base: " + b, value: b, selected: b === bs ? "selected" : null }); })), "←", h("select", { cls: "gx-in", "aria-label": "compare branch", onchange: function (e) { ghGo(base + "/compare/" + e.target.value); } }, [h("option", { text: "(เลือก branch)", value: "" })].concat(heads.map(function (b) { return h("option", { text: "compare: " + b, value: b, selected: b === sel ? "selected" : null }); })))])]),
      !brs.length ? h("p", { cls: "gx-mut", text: "ยังไม่มี branch อื่นบน GitHub — ใน Terminal: git checkout -b feature/x → แก้ไฟล์ → git add . → git commit -m ... → git push -u origin feature/x" }) : null,
      sel && !df.length ? h("p", { cls: "gx-mut", text: "There isn’t anything to compare. " + bs + " is up to date with all commits from " + sel + ". (ไฟล์ของ " + sel + " เหมือน " + bs + " ทุกไฟล์ — ลอง Add file / Edit ใน branch " + sel + " หรือ git commit + git push ก่อน แล้วค่อยเปิด PR)" }) : null,
      sel && df.length ? h("div", {}, (used ? [ghExistingPr(user, name, rp, sel, bs)] : [h("div", { cls: "gx-fld" }, [h("label", { for: "gh-prt", text: "Add a title" }), h("input", { type: "text", id: "gh-prt", cls: "gx-in gx-w", value: sel.replace(/[-_\/]/g, " ") })]), h("div", { cls: "gx-fld" }, [h("label", { text: "Add a description" }), h("textarea", { id: "gh-prb", cls: "gx-in gx-w", rows: "5" })]),
        h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-green gx-sm2", disabled: used ? "disabled" : null, text: used ? "A pull request already exists" : "Create pull request", onclick: function () { var n = rp.prs.reduce(function (m, x) { return Math.max(m, x.n); }, 0) + 1; rp.prs.push({ n: n, title: document.getElementById("gh-prt").value || sel, body: document.getElementById("gh-prb").value, head: sel, base: bs, state: "open", by: ghMe(), t: Date.now(), comments: [] }); ghProjAuto(rp, "PR", n, rp.prs[rp.prs.length - 1].title, "review"); save(); if ((bs === "main" || bs === "develop") && typeof API !== "undefined" && API.ghaPr) API.ghaPr(user + "/" + name, sel); ghGo(base + "/" + n); } })])]).concat([
        h("h3", { text: df.length + " changed files" }), h("div", { cls: "gx-tbox" }, df.map(function (x) { return h("div", { cls: "gx-trow" }, [h("code", { text: x.f, style: "flex:1" }), h("span", { cls: "gx-mut gx-sm", text: x.s }), h("b", { style: "color:#1a7f37", text: "+" + x.p }), h("b", { style: "color:#cf222e", text: "−" + x.m })]); }))])) : null]);
  }
  var num = parseInt(sub[0], 10), pr = rp.prs.filter(function (x) { return x.n === num; })[0];
  if (num && !pr) return wrap([h("p", { cls: "gx-mut", text: "404 — pull request #" + num + " not found" })]);
  if (pr) {
    var pb = pr.base || "main", bf = pb === "main" ? rp.files : (rp.branches || {})[pb] || {}, df2 = pr.state === "merged" ? pr.diff : ghDiff(rp, pr.head, pb), box = h("textarea", { cls: "gx-in gx-w", rows: "3", placeholder: "Leave a comment" }), chk = pr.state === "open" ? ghMergeBlock(rp, pr) : "";
    var done = function (s) { pr.state = s; if (s === "merged" && pr.secFix) ((rp.secAlerts || {}).dep || []).forEach(function (a) { if (a.n === pr.secFix) a.state = "fixed"; }); ghProjMove(rp, "PR", pr.n, s === "merged" ? "done" : "backlog"); if (s === "merged") { pr.diff = df2; var chm = {}; df2.forEach(function (x) { chm[x.f] = [bf[x.f] === undefined ? null : bf[x.f], rp.branches[pr.head][x.f]]; bf[x.f] = rp.branches[pr.head][x.f]; }); if (pb !== "main") { rp.blog = rp.blog || {}; rp.blog[pb] = (rp.blog[pb] || rp.log || []).concat([{ m: ghMergeMsg(pr, user), t: Date.now(), ch: chm }]); ghFireHooks(name, "push", pb); if (API.ghaPush) API.ghaPush(user + "/" + name, pb); save(); render(); return; } rp.log = (rp.log || []).concat([{ m: ghMergeMsg(pr, user), t: Date.now(), ch: chm }]); rp.n = (rp.n || 0) + 1; if (API.ghaPush) API.ghaPush(user + "/" + name, "main"); ghFireHooks(name, "push"); } save(); render(); };
    return wrap([h("h3", { text: pr.title + " #" + pr.n }), ghEditTitle(pr), ghMeta(pr), h("span", { cls: "gh-badge", text: pr.state === "open" ? "● Open" : pr.state === "merged" ? "⑂ Merged" : "✓ Closed" }), h("p", { cls: "gx-mut gx-sm", text: pr.by + " wants to merge 1 commit into " + pb + " from " + pr.head + " · " + ghTimeAgo(pr.t) }),
      ghThreadBox(pr), ghCommentBox(pr), pr.state === "closed" ? h("button", { type: "button", cls: "gx-btn", text: "Reopen pull request", onclick: function () { pr.state = "open"; save(); render(); } }) : null, h("h3", { text: "Files changed (" + df2.length + ")" }), h("div", { cls: "gx-tbox" }, df2.map(function (x) { return h("details", { cls: "gx-trow", style: "display:block" }, [h("summary", { style: "cursor:pointer;display:flex;gap:12px" }, [h("code", { text: x.f, style: "flex:1" }), h("span", { cls: "gx-mut gx-sm", text: x.s }), h("b", { style: "color:#1a7f37", text: "+" + x.p }), h("b", { style: "color:#cf222e", text: "−" + x.m })]), ghHunk(rp, x.f, pr.state === "merged" ? bf : (rp.branches || {})[pr.head] || {}, pr.state === "merged" ? {} : bf)]); })),
      pr.state === "open" ? ghReviewBox(user, name, rp, pr) : null, (pr.reviews || []).length ? h("div", { cls: "gx-tbox" }, pr.reviews.map(function (r) { return h("div", { cls: "gx-trow" }, [h("b", { text: r.by }), h("span", { text: r.state === "approved" ? " approved these changes" : r.state === "changes" ? " requested changes" : " reviewed", style: "color:" + (r.state === "approved" ? "#1a7f37" : r.state === "changes" ? "#cf222e" : "#59636e") }), r.text ? h("span", { cls: "gx-mut", text: " — " + r.text }) : null]); })) : null,
      (function () { var cr = (typeof ghaRunsOf === "function" ? ghaRunsOf(user + "/" + name) : []).filter(function (r) { return r.trigger === "pull_request" && r.ref === pr.head; })[0]; return cr ? h("div", { cls: "gx-tbox" }, [h("div", { cls: "gx-trow" }, [h("b", { text: (cr.status === "success" ? "✓ All checks have passed" : "✗ Some checks were not successful"), style: "flex:1;color:" + (cr.status === "success" ? "#1a7f37" : "#cf222e") }), h("a", { href: "#", cls: "gh-a", text: "checks #" + cr.id + " — Details", onclick: function (e) { e.preventDefault(); ghGo("/" + user + "/" + name + "/actions/runs/" + cr.id); } })])]) : null; })(),
      pr.state === "open" ? h("div", { cls: "gx-tbox" }, [h("div", { cls: "gx-trow" }, [h("span", { text: chk ? "⚠ " + chk : "✓ This branch has no conflicts with the base branch", style: "flex:1" }), ghMergeSel(), h("button", { type: "button", cls: "gx-green gx-sm2", text: "Merge pull request", onclick: function () { if (chk) { flash("bad", "Merging is blocked: " + chk); render(); return; } done("merged"); } }), h("button", { type: "button", cls: "gx-btn", text: "Close pull request", onclick: function () { done("closed"); } })])]) : null,
      ghDelBranchBtn(rp, pr), h("a", { href: "#", cls: "gh-a", text: "← back to pull requests", onclick: function (e) { e.preventDefault(); ghGo(base); } })]);
  }
  var cnt = function (s) { return rp.prs.filter(function (x) { return x.state === s; }).length; }, shown = rp.prs.filter(function (x) { return F.tab === "open" ? x.state === "open" : x.state !== "open"; }).reverse();
  return wrap([h("div", { cls: "gx-tabs2" }, [h("a", { href: "#", cls: "gx-tab2" + (F.tab === "open" ? " on" : ""), text: "Open " + cnt("open"), onclick: function (e) { e.preventDefault(); F.tab = "open"; render(); } }), h("a", { href: "#", cls: "gx-tab2" + (F.tab !== "open" ? " on" : ""), text: "Closed " + (cnt("closed") + cnt("merged")), onclick: function (e) { e.preventDefault(); F.tab = "closed"; render(); } })]),
    h("div", { cls: "gx-tbox" }, shown.length ? shown.map(function (x) { return h("div", { cls: "gx-trow" }, [h("a", { href: "#", cls: "gh-a b", text: x.title, onclick: function (e) { e.preventDefault(); ghGo(base + "/" + x.n); } }), h("span", { style: "flex:1" }), h("span", { cls: "gx-mut gx-sm", text: "#" + x.n + " " + x.state + " · " + x.head + " → " + (x.base || "main") })]); }) : [h("div", { cls: "gx-blank" }, [h("h3", { text: "Welcome to pull requests!" }), h("p", { cls: "gx-mut", text: "Pull requests help you collaborate on code with other people." })])])], h("button", { type: "button", cls: "gx-green gx-sm2", text: "New pull request", onclick: function () { ghGo(base + "/new"); } }));
}

// ===== dropdown ตัวอย่างให้ทุกช่องกรอกของหน้า GitHub: เลือกตัวอย่างหรือพิมพ์เองได้ (ใส่ค่าแล้วยิง input event ให้ handler เดิมเก็บค่า) =====
var GH_EX = [
  [/^gh-ttl$/, ["Bug: login fails with wrong token", "Add /healthz endpoint", "Upgrade Django to 5.2"]],
  [/^gh-bd$|^gh-cm$|^gh-prb$|Leave a comment/, ["Steps to reproduce: 1) login 2) open stock page", "LGTM 👍", "Please add a test for this change"]],
  [/^gh-prt$/, ["Add NEW.md", "Fix image tag in deployment.yaml", "Update terraform plan"]],
  [/^gh-pj-|^Edit card$/, ["เขียน README", "แก้ CI pipeline", "Deploy ขึ้น dev", "ทำ API docs", "เพิ่ม test ให้ stock"]],
  [/^gh-br$|Branch name pattern/, ["main", "develop", "release/*", "v*"]],
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
  [/^gh-stt$|^What/, ["On call tonight", "Reviewing PRs", "Deploying to prd"]],
  [/^gh-upn$|^Project name/, ["Pharmacy release board", "Sprint 1"]],
  [/^Go to file$/, [".github/workflows/deploy.yml", "Jenkinsfile", "Dockerfile", "README.md"]],
  [/^gh-fpath$|^path\/to\/file/, ["docs/NOTES.md", "scripts/deploy.sh", ".github/workflows/ci.yml"]],
  [/^gh-fbody$|^Edit file$/, ["# Notes\nHello from the lab", "echo deploy"]],
  [/^gh-cmsg$|^Commit message$/, ["Add notes", "Update deploy config", "Fix typo"]],
  [/^gh-cbr$|^feature\/my-change/, ["feature/my-change", "feature/login", "develop", "fix/typo", "docs/update"]],
  [/^gh-delc$|^Confirm repository name/, ["maht25102542/pharmacy-backend"]],
  [/^Search GitHub$/, ["pharmacy", "deploy", "Jenkinsfile"]],
  [/^gh-rname$/, ["pharmacy-backend", "pharmacy-api", "pharmacy-web"]],
  [/^gh-ssht$|^Key title/, ["laptop-key", "jenkins-ci"]],
  [/^gh-sshk$|^SSH key$/, ["ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExampleKeyForLab me@example.com"]],
  [/^gh-em$|^Email address$|^Email$/, ["me@example.com", "cafe@example.com"]],
  [/^gh-abd$|^Description$/, ["Pharmacy stock backend (Django REST)", "Cafe ordering API"]],
  [/^gh-abw$|^Website$/, ["https://example.com", "http://203.0.113.15:8080"]],
  [/^gh-abt$|^Topics/, ["aws, terraform, jenkins, argocd", "django, mariadb"]],
  [/^gh-nbr$|^New branch name|^Find or create/, ["develop", "feature/login", "feature/new-menu", "hotfix/typo"]],
  [/^gh-tte$|^Title$/, ["Bug: login fails with wrong token", "Add /healthz endpoint"]],
  [/^gh-sue$|^gh-suu$|^Username$/, ["maht25102542", "demo-user", "cafe-owner"]],
  [/^Edit card$|^Edit value$|^Edit comment$/, ["Write README", "triage", "release-*", "notes"]],
  [/^Label name$/, ["bug", "wontfix", "priority: high"]], [/^Label description$/, ["Something isn't working", "This will not be worked on"]],
  [/^Release title$|^New secret value$|^Variable value$/, ["v1.0.0", "Release 1.1 — bug fixes", "arn:aws:iam::123456789012:role/gha-deploy"]], [/^Payload URL$/, ["http://203.0.113.15:8080/github-webhook/"]], [/^New branch name$/, ["develop", "feature/login", "release/1.0"]],
  [/^Leave a comment$/, ["LGTM 👍", "Please add a test"]],
  [/^Wait timer/, ["0", "5", "30"]],
  [/^pattern|เช่น v\*/, ["v*", "release-*"]],
  [/^ruleset name/, ["protect-main", "require-pr"]],
  [/^title$/, ["deploy-key-ci", "argocd-read"]],
  [/^app name/, ["argocd", "jenkins"]],
  [/^email$/, ["me@example.com"]]
];
function ghExFor(el) { var hit = null; if (el.getAttribute("data-ex")) { try { return JSON.parse(el.getAttribute("data-ex")); } catch (e) {} } [el.id, el.getAttribute("aria-label"), el.getAttribute("placeholder")].forEach(function (k) { if (!hit && k) GH_EX.some(function (g) { if (g[0].test(k)) { hit = g[1]; return true; } }); }); return hit; }
function ghDecorate() {
  // ช่องค้นหาบน header: ใช้ datalist ของเบราว์เซอร์ (dropdown ตัวอย่างโดยไม่เบียด layout)
  var sin = document.querySelector("#main .gx-sin"); if (sin) { sin.setAttribute("list", "gh-sg"); if (!document.getElementById("gh-sg")) document.body.appendChild(h("datalist", { id: "gh-sg" }, ["pharmacy", "cafe", "deploy", "Jenkinsfile", "Dockerfile"].map(function (x) { return h("option", { value: x }); }))); }
  [].forEach.call(document.querySelectorAll("#main .gh input[type=text], #main .gh textarea"), function (el) {
    if (el.dataset.exd || el.readOnly || el.disabled || el.closest(".gx-hd")) return; var ex = ghExFor(el); if (!ex) return; if (!el.getAttribute("data-ex")) ex = cafeEx(ex.map(function (x) { return [x, x]; })).map(function (e) { return e[0]; }); el.dataset.exd = "1";
    var s = h("select", { cls: "gx-in gx-exsel", "aria-label": "ตัวอย่าง: " + (el.getAttribute("aria-label") || el.id || el.placeholder || "ช่องกรอก"), onchange: function (e) { var v = e.target.value; e.target.selectedIndex = 0; if (v === "\u0000") { el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); el.focus(); return; } if (!v) return; el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); } }, [h("option", { value: "", text: "— เลือกตัวอย่าง —" })].concat(ex.map(function (x) { return h("option", { value: x, text: x }); })).concat([h("option", { value: "\u0000", text: "ไม่ระบุ — พิมพ์เอง" })]));
    el.parentNode.insertBefore(s, el);
  });
}
// เมนูที่กดไม่ได้/ยังไม่ได้จำลอง → จาง (เฉพาะในหน้าเว็บจำลอง ไม่แตะ AWS console)
function ghDimDead() {
  var CL = /(^|\s)[a-z0-9]+-(btn|tab|ni|si|a|link|item)(\s|$)|(^|\s)btn(\s|$)/;
  [].forEach.call(document.querySelectorAll("#main a, #main button, #main [class]"), function (el) {
    if (el.classList.contains("na-dim") || el.disabled || el.type === "submit" || el.tagName === "SELECT" || el.tagName === "OPTION" || el.closest(".pf, .pvx, .csel, select, textarea, label, summary") || /csel/.test(el.className)) return;
    if (el.hasAttribute("data-nh") && el.closest(".gh, .jx, [class*=sq-], [class*=ag-]")) { el.classList.add("na-dim"); if (!el.title) el.title = "ยังไม่ได้จำลองหน้านี้"; return; }
    var tag = el.tagName; if (tag !== "A" && tag !== "BUTTON" && !CL.test(el.className || "")) return; if (!el.closest(".gh, .jx, [class*=sq-], [class*=ag-]")) return;
    if (tag === "A" && el.getAttribute("href") && el.getAttribute("href") !== "#") return;
    if (el.hasAttribute("data-nh")) { el.classList.add("na-dim"); return; }
    for (var p = el; p && p !== document.body; p = p.parentElement) if (HAS.has(p)) return;
    if (el.querySelector("input, select, textarea")) return;
    el.classList.add("na-dim"); if (!el.title) el.title = "ยังไม่ได้จำลองหน้านี้";
  });
}
// ===== Code ▾ (clone) · Go to file · Commits · Branches · โปรไฟล์ · Set status =====
function wbGhFind(user, name, rp) {
  var F = W.ghf = W.ghf || { q: "" }, q = (F.q || "").toLowerCase(), all = Object.keys(rp.files || {}).sort().filter(function (f) { return !q || f.toLowerCase().indexOf(q) >= 0; }).slice(0, 60);
  return h("div", { cls: "gx-quick" }, [h("div", { cls: "gx-ph" }, [h("h2", { text: "Go to file" })]), h("input", { type: "text", cls: "gx-in gx-w", placeholder: "Go to file", "aria-label": "Go to file", value: F.q, oninput: function (e) { F.q = e.target.value; render(); var el = document.querySelector(".gx-quick input:not(.gx-exsel)"); if (el) { el.focus(); el.setSelectionRange(99, 99); } } }),
    h("div", { cls: "gx-tbox" }, all.length ? all.map(function (f) { return h("div", { cls: "gx-trow" }, [h("a", { href: "#", cls: "gh-a", text: f, onclick: function (e) { e.preventDefault(); ghGo("/" + user + "/" + name + "/blob/main/" + f); } })]); }) : [h("div", { cls: "gx-blank", text: "No matching files." })])]);
}
function wbGhUserProfile(user) {
  ghInit(); var T = W.ghPT || "overview", me = ghSess() && ghSess().user === user, repos = Object.keys(S.gh.repos).filter(function (n) { return S.gh.repos[n].user === user; }), st = S.gh.status || {}, UP = S.gh.uprojects = S.gh.uprojects || [];
  var tab = function (k, t) { return h("a", { href: "#", cls: "gx-tab2" + (T === k ? " on" : ""), text: t, onclick: function (e) { e.preventDefault(); W.ghPT = k; render(); } }); };
  var repoRow = function (n) { var r = S.gh.repos[n]; return h("div", { cls: "gx-trow" }, [h("a", { href: "#", cls: "gh-a b", text: n, onclick: function (e) { e.preventDefault(); W.ghPT = ""; ghGo("/" + user + "/" + n); } }), h("span", { cls: "gh-badge", text: r.vis === "private" ? "Private" : "Public" }), h("span", { style: "flex:1" }), h("span", { cls: "gx-mut gx-sm", text: (Object.keys(r.files || {}).length) + " files · " + ((r.tags || []).length) + " tags" })]); };
  var starred = Object.keys(S.gh.repos).filter(function (n) { return (S.gh.repos[n].stars || []).indexOf(user) >= 0; }), body = T === "stars" ? [h("div", { cls: "gx-ph" }, [h("h2", { text: "Stars" })]), h("div", { cls: "gx-tbox" }, starred.length ? starred.map(repoRow) : [h("div", { cls: "gx-blank", text: "No starred repositories yet." })])] : T === "repositories" ? [h("div", { cls: "gx-ph" }, [h("h2", { text: "Repositories" }), me ? h("button", { type: "button", cls: "gx-green gx-sm2", text: "New", onclick: function () { ghGo("/new"); } }) : null]), h("div", { cls: "gx-tbox" }, repos.length ? repos.map(repoRow) : [h("div", { cls: "gx-blank", text: user + " doesn’t have any public repositories yet." })])]
    : T === "projects" ? [h("div", { cls: "gx-ph" }, [h("h2", { text: "Projects" }), me ? h("button", { type: "button", cls: "gx-green gx-sm2", text: "New project", onclick: function () { var n = (document.getElementById("gh-upn") || {}).value || ""; if (!n.trim()) { flash("bad", "Project name can't be blank"); render(); return; } UP.push(n.trim()); save(); render(); } }) : null]), me ? h("input", { type: "text", id: "gh-upn", cls: "gx-in gx-w", placeholder: "Project name" }) : null, h("div", { cls: "gx-tbox" }, UP.length ? UP.map(function (p, i) { if (W.ghup === i) return ghInline("Project name", p, function (v) { UP[i] = v; W.ghup = -1; save(); render(); }, function () { W.ghup = -1; render(); }); return h("div", { cls: "gx-trow" }, [h("b", { text: p }), h("span", { style: "flex:1" }), h("button", { type: "button", cls: "gx-btn", text: "Rename", onclick: function () { W.ghup = i; render(); } }), h("button", { type: "button", cls: "gx-trash", text: "🗑", onclick: function () { UP.splice(i, 1); save(); render(); } })]); }) : [h("div", { cls: "gx-blank", text: "No projects yet." })])]
    : [h("div", { cls: "gx-ph" }, [h("h2", { text: "Popular repositories" })]), h("div", { cls: "gx-tbox" }, repos.length ? repos.slice(0, 6).map(repoRow) : [h("div", { cls: "gx-blank", text: user + " doesn’t have any public repositories yet." })])];
  return h("div", { cls: "gx-quick" }, [h("div", { style: "display:flex;gap:16px;align-items:center;margin-bottom:12px" }, [h("span", { cls: "gx-ava", style: "width:72px;height:72px;font-size:32px", text: user.slice(0, 1).toUpperCase() }), h("div", {}, [h("h2", { text: user, style: "margin:0" }), h("div", { cls: "gx-mut", text: user }), st.text ? h("div", { text: (st.emoji || "") + " " + st.text }) : null, me ? h("button", { type: "button", cls: "gx-btn", text: "Set status", onclick: function () { W.ghStatus = true; render(); } }) : null])]), h("div", { cls: "gx-tabs2" }, [tab("overview", "Overview"), tab("repositories", "Repositories " + repos.length), tab("projects", "Projects " + UP.length), tab("stars", "Stars")])].concat(body));
}
// กล่อง Set status (เปิดจากเมนูรูปโปรไฟล์ / หน้าโปรไฟล์) — วางทับหน้า
function ghStatusModal() {
  var F = W.ghsf = W.ghsf || { emoji: "💊", text: (S.gh.status || {}).text || "" }, close = function () { W.ghStatus = false; render(); };
  return h("div", { cls: "gx-menu", style: "position:fixed;left:50%;top:120px;transform:translateX(-50%);width:420px;padding:16px;z-index:50;text-align:left" }, [h("b", { text: "Edit status" }), h("div", { cls: "gx-fld" }, [h("select", { cls: "gx-in", "aria-label": "Emoji", onchange: function (e) { F.emoji = e.target.value; } }, ["💊", "🏖️", "🤒", "🎯", "💻"].map(function (x) { return h("option", { text: x, selected: x === F.emoji ? "selected" : null }); })), h("input", { type: "text", id: "gh-stt", cls: "gx-in gx-w", placeholder: "What’s happening?", value: F.text, oninput: function (e) { F.text = e.target.value; } })]),
    h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-green gx-sm2", text: "Set status", onclick: function () { S.gh.status = F.text.trim() ? { emoji: F.emoji, text: F.text.trim() } : null; save(); close(); } }), h("button", { type: "button", cls: "gx-btn", text: "Clear status", onclick: function () { S.gh.status = null; F.text = ""; save(); close(); } }), h("button", { type: "button", cls: "gx-btn", text: "Cancel", onclick: close })])]);
}
var ghRender0 = render; render = function () { ghRender0(); if (W.jkq !== undefined && document.querySelector("#main .jx")) document.querySelector("#main .jx").appendChild(jkSearchModal()); var jtb = document.querySelector("#main .jx table"); if (jtb) jtb.style.zoom = { s: ".85", m: "1", l: "1.15" }[W.jkIc || "l"]; if (W.ghStatus && document.querySelector("#main .gh")) { document.querySelector("#main .gh").appendChild(ghStatusModal()); } ghDecorate(); ghDimDead(); };

// branch protection rule ที่ main = ต้องมี approve ≥1 (จากคนที่ไม่ใช่เจ้าของ PR) และไม่มี changes requested ค้างอยู่
function ghMergeBlock(rp, pr) { if ((rp.set.branchRules || []).indexOf(pr.base || "main") < 0) return ""; var last = {}; (pr.reviews || []).forEach(function (r) { last[r.by] = r.state; }); var st = Object.keys(last).map(function (k) { return last[k]; }); if (st.indexOf("changes") >= 0) return "Changes requested — resolve before merging"; if (st.indexOf("approved") < 0) return "At least 1 approving review is required by reviewers with write access (branch protection rule on main)"; return ""; }
function ghReviewBox(user, name, rp, pr) {
  var F = W.ghrv = W.ghrv || { as: "teammate" }, collab = (rp.set["/access"] || []).map(function (x) { return x.replace(/ \(.*$/, ""); }).filter(function (x) { return x !== pr.by; }), who = ["teammate", "reviewer-bot"].concat(collab).filter(function (x, i, a) { return a.indexOf(x) === i; });
  var box = h("textarea", { id: "gh-prc", cls: "gx-in gx-w", rows: "3", placeholder: "Leave a comment" }), sub = function (st) { pr.reviews = (pr.reviews || []).concat([{ by: F.as, state: st, text: box.value.trim(), t: Date.now() }]); save(); render(); };
  return h("div", { cls: "gx-tbox", style: "padding:12px" }, [h("b", { text: "Review changes" }), h("div", { cls: "gx-mut gx-sm", text: "ผู้ตรวจ (GitHub ไม่ให้ approve PR ของตัวเอง จึงเลือกว่าจะตรวจในนามใคร)" }), h("select", { cls: "gx-in", "aria-label": "Review as", onchange: function (e) { F.as = e.target.value; } }, who.map(function (x) { return h("option", { text: x, selected: x === F.as ? "selected" : null }); })), box,
    h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-btn", text: "Comment", onclick: function () { sub("comment"); } }), h("button", { type: "button", cls: "gx-btn", text: "Request changes", onclick: function () { sub("changes"); } }), h("button", { type: "button", cls: "gx-green gx-sm2", text: "Approve", onclick: function () { sub("approved"); } })])]);
}

// ===== พื้นฐานที่ต้องมี: สลับ branch · Add file / Edit / Delete file (commit ตรงหรือแยก branch) · ค้นหา · รายการ Issues/PRs รวม · แจ้งเตือน · Settings: visibility/ลบ repo =====
function ghCommit(user, name, rp, br, path, content, msg, newBranch, oldPath) {
  var src = br === "main" ? rp.files : (rp.branches || {})[br] || rp.files, copy = JSON.parse(JSON.stringify(src)); if (content === null) delete copy[path]; else copy[path] = content; if (oldPath) delete copy[oldPath];
  var target = newBranch || br;
  if (target === "main") { var chg = {}; chg[path] = [src[path] === undefined ? null : src[path], content]; rp.files = copy; rp.n = (rp.n || 0) + 1; rp.log = (rp.log || []).concat([{ m: msg, t: Date.now(), ch: chg }]); ghFireHooks(name, "push"); if (typeof API !== "undefined" && API.ghaPush) API.ghaPush(user + "/" + name, "main"); }
  else { rp.branches = rp.branches || {}; rp.branches[target] = copy; rp.blog = rp.blog || {}; rp.blog[target] = (rp.blog[target] || (br === "main" ? rp.log : rp.blog[br]) || rp.log || []).concat([{ m: msg, t: Date.now(), ch: { [path]: [src[path] === undefined ? null : src[path], content] } }]); ghFireHooks(name, "push", target); if (API.ghaPush) API.ghaPush(user + "/" + name, target); if ((rp.prs || []).some(function (x) { return x.head === target && x.state === "open"; }) && API.ghaPr) API.ghaPr(user + "/" + name, target); }
  save(); return target;
}
function wbGhAddMenu(user, name, br) {
  var base = "/" + user + "/" + name;
  return h("div", { cls: "gx-menu", style: "left:0;top:36px;width:240px;padding:8px;text-align:left" }, [h("a", { href: "#", cls: "gx-mi", text: "＋ Create new file", onclick: function (e) { e.preventDefault(); W.ghAdd = false; ghGo(base + "/new/" + br); } }), h("a", { href: "#", cls: "gx-mi", text: "⇪ Upload files (จำลอง: ใช้ Create new file แทน)", onclick: function (e) { e.preventDefault(); W.ghAdd = false; ghGo(base + "/new/" + br); } })]);
}
function wbGhEditor(user, name, rp, mode, br, rest) {
  var key = mode + "|" + br + "|" + rest, E = W.ghEd = W.ghEd && W.ghEd.key === key ? W.ghEd : { key: key, path: mode === "new" ? "" : rest, content: mode === "edit" ? String((((br === "main" ? rp.files : (rp.branches || {})[br]) || {})[rest]) || "") : "", msg: "", target: "direct", nb: "" };
  var base = "/" + user + "/" + name, verb = mode === "new" ? "Create" : mode === "edit" ? "Update" : "Delete", file = mode === "new" ? E.path : rest;
  if (mode !== "new" && !(rest in (((br === "main" ? rp.files : (rp.branches || {})[br]) || {})))) return h("p", { cls: "gx-mut", text: "404 — ไม่พบไฟล์ " + rest });
  var radio = function (v, t) { return h("label", { cls: "gx-rad" }, [h("input", { type: "radio", name: "gh-ct", checked: E.target === v ? "checked" : null, onchange: function () { E.target = v; render(); } }), " " + t]); };
  return h("div", { cls: "gx-quick" }, [h("div", { cls: "gx-ph" }, [h("h2", { text: mode === "new" ? "Create new file" : verb + " " + rest }), h("span", { cls: "gx-mut", text: "branch: " + br })]),
    mode !== "delete" ? h("div", { cls: "gx-fld" }, [h("label", { for: "gh-fpath", text: mode === "new" ? "Name your file…" : "File name (เปลี่ยน path = ย้าย/เปลี่ยนชื่อไฟล์)" }), h("input", { type: "text", id: "gh-fpath", cls: "gx-in gx-w", placeholder: "path/to/file.txt", value: E.path, oninput: function (e) { E.path = e.target.value; } })]) : null,
    mode !== "delete" ? h("div", { cls: "gx-fld" }, [h("label", { text: "Edit file" }), h("textarea", { id: "gh-fbody", cls: "gx-in gx-w", rows: "12", style: "font-family:monospace", oninput: function (e) { E.content = e.target.value; } }, [E.content])]) : h("p", { cls: "gx-mut", text: "ไฟล์นี้จะถูกลบ: " + rest }),
    h("div", { cls: "gx-tbox", style: "padding:12px" }, [h("b", { text: "Commit changes" }), h("input", { type: "text", id: "gh-cmsg", cls: "gx-in gx-w", placeholder: verb + " " + (file || "file"), "aria-label": "Commit message", value: E.msg, oninput: function (e) { E.msg = e.target.value; } }), radio("direct", "Commit directly to the " + br + " branch"), radio("branch", "Create a new branch for this commit and start a pull request"), E.target === "branch" ? h("input", { type: "text", id: "gh-cbr", cls: "gx-in gx-w", placeholder: "feature/my-change", "aria-label": "New branch name", value: E.nb, oninput: function (e) { E.nb = e.target.value; } }) : null,
      h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-green gx-sm2", text: E.target === "branch" ? "Propose changes" : "Commit changes", onclick: function () {
        var p = (mode === "delete" ? rest : E.path).trim().replace(/^\/+/, ""); if (!p) { flash("bad", "Name your file"); render(); return; } if ((mode === "new" || (mode === "edit" && p !== rest)) && p in ((br === "main" ? rp.files : (rp.branches || {})[br]) || {})) { flash("bad", "A file with that name already exists"); render(); return; }
        var nb = E.target === "branch" ? E.nb.trim() : ""; if (E.target === "branch" && (!/^[\w./-]+$/.test(nb) || nb === "main" || (rp.branches || {})[nb])) { flash("bad", "Invalid or existing branch name"); render(); return; }
        var t = ghCommit(user, name, rp, br, p, mode === "delete" ? null : E.content, E.msg.trim() || (mode === "edit" && p !== rest ? "Rename " + rest + " to " + p : verb + " " + p), nb, mode === "edit" && p !== rest ? rest : ""); W.ghEd = null; if (t !== "main" && nb) ghGo(base + "/pulls/compare/" + t); else ghGo(base); } }), h("button", { type: "button", cls: "gx-btn", text: "Cancel", onclick: function () { W.ghEd = null; ghGo(base); } })])])]);
}
function wbGhGlobal(kind) {
  var me = ghSess().user, q = (W.ghQ || "").toLowerCase(), repos = Object.keys(S.gh.repos).filter(function (n) { return S.gh.repos[n].user === me; }), wrap = function (title, kids) { return h("div", { cls: "gx-quick" }, [h("div", { cls: "gx-ph" }, [h("h2", { text: title })])].concat(kids)); }, row = function (txt, sub, path) { return h("div", { cls: "gx-trow" }, [h("a", { href: "#", cls: "gh-a b", text: txt, onclick: function (e) { e.preventDefault(); ghGo(path); } }), h("span", { style: "flex:1" }), h("span", { cls: "gx-mut gx-sm", text: sub })]); };
  if (kind === "notifications") return wrap("Notifications", [h("div", { cls: "gx-tbox" }, [h("div", { cls: "gx-blank" }, [h("h3", { text: "All caught up!" }), h("p", { cls: "gx-mut", text: "Take a break, merge a few pull requests, or start a discussion." })])])]);
  if (kind === "issues" || kind === "pulls") { var items = []; repos.forEach(function (n) { var r = S.gh.repos[n]; (kind === "issues" ? r.issues || [] : r.prs || []).forEach(function (x) { items.push(row(x.title, n + " #" + x.n + " · " + x.state, "/" + me + "/" + n + "/" + (kind === "issues" ? "issues" : "pulls") + "/" + x.n)); }); }); return wrap(kind === "issues" ? "Issues" : "Pull requests", [h("div", { cls: "gx-tbox" }, items.length ? items : [h("div", { cls: "gx-blank", text: "No " + (kind === "issues" ? "issues" : "pull requests") + " yet." })])]); }
  var hits = []; repos.forEach(function (n) { if (!q || n.toLowerCase().indexOf(q) >= 0) hits.push(row(me + "/" + n, "repository", "/" + me + "/" + n)); });
  var fl = []; if (q) repos.forEach(function (n) { Object.keys(S.gh.repos[n].files || {}).forEach(function (f) { if (f.toLowerCase().indexOf(q) >= 0 || String(S.gh.repos[n].files[f]).toLowerCase().indexOf(q) >= 0) fl.push(row(f, n, "/" + me + "/" + n + "/blob/main/" + f)); }); });
  return wrap('Results for "' + (W.ghQ || "") + '"', [h("h3", { text: "Repositories (" + hits.length + ")" }), h("div", { cls: "gx-tbox" }, hits.length ? hits : [h("div", { cls: "gx-blank", text: "No repositories matched." })]), h("h3", { text: "Code (" + fl.length + ")" }), h("div", { cls: "gx-tbox" }, fl.length ? fl.slice(0, 40) : [h("div", { cls: "gx-blank", text: q ? "No code matched." : "Type a search term." })])]);
}
function wbGhDanger(user, name, rp) {
  var F = W.ghdz = W.ghdz || { c: "" };
  return h("div", { cls: "gx-danger" }, [h("b", { text: "Danger Zone" }), h("div", { cls: "gx-trow" }, [h("div", { style: "flex:1" }, [h("b", { text: "Change repository visibility" }), h("div", { cls: "gx-mut gx-sm", text: "This repository is currently " + (rp.vis === "private" ? "private" : "public") + "." })]), h("button", { type: "button", cls: "gx-btn", text: "Change visibility", onclick: function () { rp.vis = rp.vis === "private" ? "public" : "private"; save(); render(); } })]),
    h("div", { cls: "gx-trow" }, [h("div", { style: "flex:1" }, [h("b", { text: "Delete this repository" }), h("div", { cls: "gx-mut gx-sm", text: "Type " + user + "/" + name + " to confirm. Once deleted there is no going back." }), h("input", { type: "text", id: "gh-delc", cls: "gx-in gx-w", "aria-label": "Confirm repository name", "data-ex": JSON.stringify([user + "/" + name]), value: F.c, oninput: function (e) { F.c = e.target.value; F.err = ""; } }), F.err ? h("div", { cls: "gx-sm", style: "color:#cf222e", text: F.err }) : null]), h("button", { type: "button", cls: "gx-btn", style: "color:#cf222e", text: "Delete this repository", onclick: function () { if (F.c.trim() !== user + "/" + name) { F.err = "ข้อความไม่ตรง — ต้องพิมพ์ " + user + "/" + name + " (เลือกจาก dropdown ด้านบนได้)"; render(); return; } delete S.gh.repos[name]; F.c = ""; F.err = ""; save(); ghGo("/"); } })])]);
}
