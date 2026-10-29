// ===== หน้า GitHub จำลอง (repo / ไฟล์ / tags / Actions) หน้าตาตามของจริง: header, แท็บพร้อมตัวเลข, commit ล่าสุด, README, About, ภาษา · อ่านอย่างเดียว =====
var GH_LANG = { py: ["Python", "#3572A5"], ts: ["TypeScript", "#3178c6"], tsx: ["TypeScript", "#3178c6"], js: ["JavaScript", "#f1e05a"], yaml: ["YAML", "#cb171e"], yml: ["YAML", "#cb171e"], json: ["JSON", "#8a8a8a"], tf: ["HCL", "#844fba"], md: ["Markdown", "#083fa1"], css: ["CSS", "#563d7c"], html: ["HTML", "#e34c26"], sh: ["Shell", "#89e051"], j2: ["Jinja", "#a52a22"] };
var GH_MSG = { ".github": "Add deploy workflow", Dockerfile: "Add Dockerfile", "README.md": "Initial commit", Jenkinsfile: "Add Jenkinsfile", "requirements": "Pin dependencies", "package.json": "Set up Next.js", "config": "Add Django settings", "manage.py": "Initial commit" };
function ghKind(name) { var e = (/\.([A-Za-z0-9]+)$/.exec(name) || [])[1] || ""; return e === "yml" || e === "yaml" ? "yaml" : e === "json" ? "json" : e === "tf" ? "hcl" : /^Dockerfile/.test(name) ? "df" : e === "py" ? "jf" : "txt"; }
function ghMd(text) {
  var out = h("div", { cls: "gh-md" }), lines = String(text).split("\n"), i = 0, para = [];
  var flush = function () { if (para.length) { out.appendChild(h("p", { text: para.join(" ") })); para = []; } };
  var inl = function (t) { var kids = [], re = /`([^`]+)`|\*\*([^*]+)\*\*/g, last = 0, m; while ((m = re.exec(t))) { if (m.index > last) kids.push(t.slice(last, m.index)); kids.push(m[1] ? h("code", { text: m[1] }) : h("b", { text: m[2] })); last = re.lastIndex; } if (last < t.length) kids.push(t.slice(last)); return kids; };
  while (i < lines.length) {
    var l = lines[i];
    if (/^```/.test(l)) { flush(); var buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); out.appendChild(codePre(buf.join("\n"), "txt")); }
    else if (/^#{1,3}\s/.test(l)) { flush(); var lv = /^(#+)/.exec(l)[1].length; out.appendChild(h("h" + lv, {}, inl(l.replace(/^#+\s*/, "")))); }
    else if (/^\s*[-*]\s/.test(l)) { flush(); var ul = h("ul", {}); while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) ul.appendChild(h("li", {}, inl(lines[i++].replace(/^\s*[-*]\s*/, "")))); i--; out.appendChild(ul); }
    else if (!l.trim()) flush(); else para.push(l.trim());
    i++;
  }
  flush(); return out;
}
function d0(cls, kids) { return h("div", { cls: cls }, kids); }
function wbGithub(r) {
  ghInit(); var parts = r.path.split("/").filter(Boolean);
  if (parts[0] === "login") return d0("gh gx-bare", [wbGhLogin(W.ghRet)]);
  var needAuth = parts[0] === "new" || parts[0] === "settings" || (parts.length >= 3 && parts[2] === "settings");
  if (needAuth && !ghSess()) { W.ghRet = r.path; return d0("gh gx-bare", [wbGhLogin(r.path)]); }
  if (!parts.length && ghSess()) return d0("gh", [ghHeader(), wbGhDashboard(ghSess().user)]);
  if (parts[0] === "new" && parts.length === 1 && ghSess()) return d0("gh", [ghHeader([h("b", { text: "Create a new repository" })]), wbGhNew()]);
  if (parts[0] === "settings" && parts.length < 3 + 1 && ghSess() && !(parts[1] === "profile" && false)) { var sv = wbGhSettings(parts); if (sv) return sv; }
  if (parts[0] === "settings" && ghSess()) return wbGhSettings(parts);
  var d = function (cls, kids, at) { return h("div", Object.assign({ cls: cls }, at || {}), kids || []); };
  function go2(path) { return function (e) { if (e) e.preventDefault(); W.addr = "https://github.com" + path; W.res = webOpen(W.addr); render(); }; }
  function link(path, text, cls) { return h("a", { href: "#", cls: cls || "gh-a", text: text, onclick: go2(path) }); }
  var mark = function (sz) { return h("span", { cls: "gh-mark", style: "font-size:" + (sz || 22) + "px", text: "⌥" }); };
  var gh = function (kids, rp, user) { return d("gh", [ghHeader(parts.length >= 2 ? [ghLinkEl("/" + parts[0], parts[0]), " / ", h("b", { text: parts[1] })] : null), d("gh-main", kids)]); };
  if (parts.length < 2) return gh([h("h1", { text: "Where the world builds software" }), h("p", { cls: "gh-mut", text: "หน้า GitHub จำลองแสดงเฉพาะ repo ที่คุณ git push จาก Terminal (ใน lab นี้ push แล้ว repo ถูกสร้างให้เอง) เปิดตัวอย่างจากช่อง URL ด้านบน" })]);
  var user = parts[0], name = parts[1], rp = ghRepoOf(user, name);
  if (!rp) return gh([d("gh-404", [h("h1", { text: "404" }), h("p", { text: "This is not the web page you are looking for." }), h("p", { cls: "gh-mut", text: parts[0] === "settings" || parts[0] === "new" ? "หน้านี้ของ GitHub ยังไม่ได้จำลอง (กำลังทำทีละหน้า)" : "ไม่พบ repo " + user + "/" + name + " (ยังไม่ได้ git push จาก Terminal)" })])], null, user);
  var files = rp.files || {}, mode = parts[2] || "", rest = parts.slice(4).join("/"), base = "/" + user + "/" + name, tags = (rp.tags || []).slice().sort().reverse(), commits = (rp.n || 0) + 1, runs = (typeof ghaRunsOf === "function" ? ghaRunsOf(user + "/" + name) : []).length;
  var head = d("gh-rhead", [d("gh-title", [h("span", { cls: "gh-repoic", text: rp.vis === "private" ? "🔒" : "▢" }), link("/" + user, user), h("span", { cls: "gh-mut", text: "/" }), link(base, name, "gh-a b"), h("span", { cls: "gh-badge", text: rp.vis === "private" ? "Private" : "Public" })]), d("gh-btns", [["✎ Edit Pins ▾", ""], ["◉ Watch", "1 ▾"], ["⑂ Fork", "0 ▾"], ["☆ Star", "0"]].map(function (b) { return h("span", { cls: "gh-btn" }, [b[0], b[1] ? h("span", { cls: "gh-cnt", text: b[1] }) : null].filter(Boolean)); }))]);
  var tabsFor = function (active) { return d("gh-tabs", [["Code", "‹›", ""], ["Issues", "◌", String(ghOpenCount(rp) || "0")], ["Pull requests", "⇄", String((rp.prs || []).filter(function (x) { return x.state === "open"; }).length || "0")], ["Discussions", "▤", ""], ["Actions", "▷", runs ? String(runs) : ""], ["Projects", "▦", "0"], ["Security", "⛨", ""], ["Insights", "⌇", ""], ["Settings", "⚙", ""]].map(function (t) { var on = t[0] === active, live = /^(Code|Pull requests|Actions|Settings)$/.test(t[0]), kids = [t[0]].concat(t[2] ? [h("span", { cls: "gh-cnt", text: t[2] })] : []); return live ? h("a", { href: "#", cls: "gh-tab" + (on ? " on" : ""), "data-ic": t[1], onclick: go2(t[0] === "Code" ? base : t[0] === "Settings" ? base + "/settings" : t[0] === "Issues" ? base + "/issues" : t[0] === "Pull requests" ? base + "/pulls" : t[0] === "Actions" ? base + "/actions" : base + "/" + t[0].toLowerCase()) }, kids) : h("span", { cls: "gh-tab dim", "data-ic": t[1] }, kids); })); };
  if (mode === "releases") return gh([head, tabsFor("Code"), d("gh-pad", [wbGhReleases(user, name, rp, parts.slice(3), link)])], rp, user);
  if (mode === "issues" || mode === "discussions") return gh([head, tabsFor(mode === "issues" ? "Issues" : "Discussions"), d("gh-pad", [wbGhThreads(user, name, rp, mode, parts.slice(3))])], rp, user);
  if (mode === "projects" || mode === "security" || mode === "insights") return gh([head, tabsFor(mode[0].toUpperCase() + mode.slice(1)), d("gh-pad", [(mode === "projects" ? wbGhProjects : mode === "security" ? wbGhSecurity : wbGhInsights)(user, name, rp)])], rp, user);
  if (mode === "pulls") return gh([head, tabsFor("Pull requests"), d("gh-pad", [wbGhPrs(user, name, rp, parts.slice(3))])], rp, user);
  if (!mode && rp.empty && !Object.keys(files).length) return gh([head, tabsFor("Code"), d("gh-pad", [wbGhQuick(user, name, rp, link)])], rp, user);
  if (mode === "settings") return gh([head, tabsFor("Settings"), d("gh-pad", [wbGhRepoSettings(user, name, rp, parts.slice(3))])], rp, user);
  if (mode === "actions") { var wfx = typeof ghaWf === "function" ? ghaWf(user + "/" + name) : null, runsN = typeof ghaRunsOf === "function" ? ghaRunsOf(user + "/" + name).length : 0, sl = function (t, on, ind) { return d("gx-asi" + (on ? " on" : "") + (ind ? " ind" : ""), [t]); };
    var side = d("gx-aside", [d("gx-ahd", [h("b", { text: "Actions" }), h("span", { cls: "gx-btn gx-xs", text: "New workflow" })]), sl("All workflows", true), d("gx-asp"), sl(wfx ? "deploy" : ".github/workflows", false), d("gx-ahd2", ["Management"]), sl("⛁ Caches", false), sl("⚑ Deployments", false), sl("▤ Attestations", false), sl("⌘ Runners", false)]);
    var bar = d("gx-abar", [h("b", { text: runsN + " workflow run" + (runsN === 1 ? "" : "s") }), h("span", { style: "flex:1" }), ["Event", "Status", "Branch", "Actor"].map(function (x) { return h("span", { cls: "gx-fl", text: x + " ▾" }); })]);
    return gh([head, tabsFor("Actions"), d("gx-aw", [side, d("gx-amain", [d("gx-atop", [h("h2", { text: "All workflows" }), h("span", { cls: "gx-sbox2", text: "⌕ Filter workflow runs" })]), bar, wbGhActions(user, name, rp, parts, go2, link)])])], rp, user); }
  var tabs = tabsFor("Code");
  if (mode === "tags") return gh([head, tabs, d("gh-pad", [h("h2", { text: "Tags" }), tags.length ? d("gh-card", tags.map(function (t) { return d("gh-row", [h("b", { text: "🏷 " + t }), h("span", { cls: "gh-mut", text: "ชี้ commit " + hash32(user + name + t).slice(0, 7) })]); })) : h("p", { cls: "gh-mut", text: "ยังไม่มี tag (ใน Terminal: git tag v1.0.0 && git push origin v1.0.0)" }), link(base, "← กลับไปหน้า Code")])], rp, user);
  var isFile = mode === "blob" && Object.prototype.hasOwnProperty.call(files, rest), dir = mode === "tree" ? rest : "";
  var crumb = d("gh-crumb", [link(base, name, "gh-a b")].concat(rest ? rest.split("/").reduce(function (acc, seg, i, arr) { var pth = arr.slice(0, i + 1).join("/"); return acc.concat([h("span", { cls: "gh-mut", text: "/" }), i === arr.length - 1 && isFile ? h("b", { text: seg }) : link(base + "/tree/main/" + pth, seg)]); }, []) : []));
  if (isFile) {
    var txt = String(files[rest]).replace(/\n$/, ""), lines = txt.split("\n").length;
    return gh([head, tabs, d("gh-pad", [crumb, d("gh-card", [d("gh-fhead", [h("span", { cls: "gh-mut", text: lines + " lines · " + files[rest].length + " bytes" }), h("span", { cls: "gh-sp" }), h("span", { cls: "gh-btn", text: "Raw" }), h("span", { cls: "gh-btn", text: "Copy" })]), codePre(txt, ghKind(rest))])])], rp, user);
  }
  if (mode === "blob") return gh([head, tabs, d("gh-pad", [h("p", { text: "404 - ไม่พบไฟล์ " + rest })])], rp, user);
  var pre = dir ? dir + "/" : "", seen = {}, entries = [];
  Object.keys(files).forEach(function (k) { if (k.indexOf(pre) !== 0) return; var rem = k.slice(pre.length), seg = rem.split("/")[0], isDir = rem.indexOf("/") >= 0; if (!seen[seg]) { seen[seg] = 1; entries.push({ name: seg, dir: isDir }); } });
  entries.sort(function (a, b) { return a.dir !== b.dir ? (a.dir ? -1 : 1) : a.name < b.name ? -1 : 1; });
  var rows = (dir ? [{ up: 1 }] : []).concat(entries).map(function (e) {
    if (e.up) return d("gh-row", [link(dir.indexOf("/") > 0 ? base + "/tree/main/" + dir.split("/").slice(0, -1).join("/") : base, "..")]);
    var p = pre + e.name, target = base + (e.dir ? "/tree/main/" : "/blob/main/") + p, msg = GH_MSG[e.name] || GH_MSG[e.name.replace(/\.[^.]+$/, "")] || "Update " + e.name;
    return d("gh-row", [h("span", { cls: "gh-fic", text: e.dir ? "📁" : "📄" }), link(target, e.name, "gh-a fn"), h("span", { cls: "gh-msg", text: msg }), h("span", { cls: "gh-when", text: "2 hours ago" })]);
  });
  var latest = d("gh-latest", [h("span", { cls: "gh-ava s", text: user.slice(0, 1).toUpperCase() }), h("b", { text: user }), h("span", { cls: "gh-msg2", text: commits > 1 ? "Update deploy" : "Initial commit" }), h("span", { cls: "gh-sp" }), h("span", { cls: "gh-mut mono", text: hash32(user + name + commits).slice(0, 7) + " · 2 hours ago" }), h("span", { cls: "gh-hist", text: "⟲ " + commits + " Commits" })]);
  var bar = d("gh-bar", [h("span", { cls: "gh-btn b", text: "⎇ main ▾" }), h("span", { cls: "gh-mut", text: "⎇ 1 Branch" }), link(base + "/tags", "🏷 " + tags.length + " Tags", "gh-a mut"), h("span", { cls: "gh-sp" }), h("span", { cls: "gh-btn", text: "Go to file" }), h("span", { cls: "gh-btn green", text: "<> Code ▾" })]);
  var table = Object.keys(files).length ? d("gh-card", [latest].concat(rows)) : h("p", { cls: "gh-mut", text: "repo ว่าง (ยังไม่มีไฟล์)" });
  var readme = !dir && files["README.md"] ? d("gh-card", [h("div", { cls: "gh-fhead" }, [h("b", { text: "📖 README.md" })]), d("gh-readme", [ghMd(files["README.md"])])]) : null;
  var lang = {}, tot = 0; Object.keys(files).forEach(function (k) { var e = (/\.([A-Za-z0-9]+)$/.exec(k) || [])[1], L = GH_LANG[e] || (/^Dockerfile/.test(k.split("/").pop()) ? ["Dockerfile", "#384d54"] : null), n = String(files[k]).length; if (L && e !== "md") { lang[L[0]] = lang[L[0]] || { c: L[1], n: 0 }; lang[L[0]].n += n; tot += n; } });
  var langs = Object.keys(lang).sort(function (a, b) { return lang[b].n - lang[a].n; }), about = d("gh-side", [d("gh-box", [h("h3", { text: "About" }), h("p", { text: ((files["README.md"] || "").split("\n").filter(function (l) { return l.trim() && !/^#/.test(l); })[0] || "Pharmacy " + name).slice(0, 160) }), d("gh-topics", ["aws", "terraform", "pharmacy", "devops"].map(function (t) { return h("span", { cls: "gh-topic", text: t }); })), h("p", { cls: "gh-mut sm", text: "☆ 0 stars · ◉ 1 watching · ⑂ 0 forks" })]),
    d("gh-box", [h("h3", { text: "Releases" }), tags.length ? h("div", {}, [h("b", { text: tags[0] }), h("span", { cls: "gh-badge g", text: "Latest" }), h("div", { cls: "gh-mut sm", text: tags.length + " tag" + (tags.length > 1 ? "s" : "") })]) : h("p", { cls: "gh-mut sm", text: "No releases published" })]),
    (function () { var en = Object.keys((rp.envs) || {}); if (!en.length && typeof ghEnvReview === "function") { try { ghEnvReview(user + "/" + name, "production"); } catch (e) {} en = Object.keys(rp.envs || {}); } return en.length && (typeof ghaWf === "function" && ghaWf(user + "/" + name)) ? d("gh-box", [h("h3", {}, ["Environments ", h("span", { cls: "gh-cnt", text: String(en.length) })]), d("gx-envs", en.slice(0, 3).map(function (n) { return d("gx-env", [h("span", { text: "🚀" }), h("b", { text: n }), h("span", { cls: "gx-active", text: "Active" })]); }))]) : null; })(),
    tot ? d("gh-box", [h("h3", { text: "Languages" }), d("gh-langbar", langs.map(function (k) { return h("i", { style: "width:" + Math.max(2, Math.round(100 * lang[k].n / tot)) + "%;background:" + lang[k].c }); })), d("gh-langs", langs.map(function (k) { return h("span", {}, [h("i", { style: "background:" + lang[k].c }), h("b", { text: k }), " " + Math.round(100 * lang[k].n / tot) + "%"]); }))]) : null].filter(Boolean));
  return gh([head, tabs, d("gh-cols", [d("gh-left", [bar, crumb.children.length > 1 ? crumb : null, table, readme].filter(Boolean)), about]), h("p", { cls: "gh-mut sm gh-clone" }, ["Clone: ", h("code", { text: "https://github.com/" + user + "/" + name + ".git" })])], rp, user);
}
