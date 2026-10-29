// ===== GitHub จำลอง: Settings ของบัญชี + Developer settings › Personal access tokens (classic / fine-grained) =====
// ข้อความ scope จากเอกสาร docs.github.com (Scopes for OAuth apps); เมนูซ้ายและฟอร์มตามหน้าจริงจากความจำ/เอกสาร (หน้านี้ต้อง login จึงดึงของจริงมาเทียบไม่ได้)
var GH_SET_NAV = [
  [null, [["Public profile", "/settings/profile"], ["Account", "/settings/admin"], ["Appearance", "/settings/appearance"], ["Accessibility", "/settings/accessibility"], ["Notifications", "/settings/notifications"]]],
  ["Access", [["Billing and licensing", "/settings/billing"], ["Emails", "/settings/emails"], ["Password and authentication", "/settings/security"], ["Sessions", "/settings/sessions"], ["SSH and GPG keys", "/settings/keys"], ["Organizations", "/settings/organizations"], ["Enterprises", "/settings/enterprises"], ["Moderation", "/settings/moderation/blocked_users"]]],
  ["Code, planning, and automation", [["Repositories", "/settings/repositories"], ["Codespaces", "/settings/codespaces"], ["Packages", "/settings/packages"], ["Copilot", "/settings/copilot"], ["Pages", "/settings/pages"], ["Saved replies", "/settings/replies"]]],
  ["Security", [["Advanced security", "/settings/security_analysis"], ["Deploy keys", "/settings/keys"]]],
  ["Integrations", [["Applications", "/settings/installations"], ["Scheduled reminders", "/settings/reminders"]]],
  ["Archives", [["Security log", "/settings/security-log"], ["Sponsorship log", "/settings/sponsors-log"]]],
  [null, [["Developer settings", "/settings/apps"]]]
];
var GH_SCOPES = [
  ["repo", "Full control of private repositories", [["repo:status", "Access commit status"], ["repo_deployment", "Access deployment status"], ["public_repo", "Access public repositories"], ["repo:invite", "Access repository invitations"], ["security_events", "Read and write security events"]]],
  ["workflow", "Update GitHub Action workflows", []],
  ["write:packages", "Upload packages to GitHub Package Registry", [["read:packages", "Download packages from GitHub Package Registry"]]],
  ["delete:packages", "Delete packages from GitHub Package Registry", []],
  ["admin:org", "Full control of orgs and teams, read and write org projects", [["write:org", "Read and write org and team membership, read and write org projects"], ["read:org", "Read org and team membership, read org projects"], ["manage_runners:org", "Manage org runners and runner groups"]]],
  ["admin:public_key", "Full control of user public keys", [["write:public_key", "Write user public keys"], ["read:public_key", "Read user public keys"]]],
  ["admin:repo_hook", "Full control of repository hooks", [["write:repo_hook", "Write repository hooks"], ["read:repo_hook", "Read repository hooks"]]],
  ["admin:org_hook", "Full control of organization hooks", []],
  ["gist", "Create gists", []],
  ["notifications", "Access notifications", []],
  ["user", "Update ALL user data", [["read:user", "Read ALL user profile data"], ["user:email", "Access user email addresses (read-only)"], ["user:follow", "Follow and unfollow users"]]],
  ["delete_repo", "Delete repositories", []],
  ["write:discussion", "Read and write team discussions", [["read:discussion", "Read team discussions"]]],
  ["admin:enterprise", "Full control of enterprises", [["manage_runners:enterprise", "Manage enterprise runners and runner groups"], ["manage_billing:enterprise", "Read and write enterprise billing data"], ["read:enterprise", "Read enterprise profile data"]]],
  ["audit_log", "Full control of audit log", [["read:audit_log", "Read access of audit log"]]],
  ["codespace", "Full control of codespaces", [["codespace:secrets", "Ability to create, read, update, and delete codespace secrets"]]],
  ["copilot", "Full control of GitHub Copilot settings and seat assignments", [["manage_billing:copilot", "View and edit Copilot Business seat assignments"]]],
  ["project", "Full control of projects", [["read:project", "Read access of projects"]]],
  ["admin:gpg_key", "Full control of public user GPG keys", [["write:gpg_key", "Write public user GPG keys"], ["read:gpg_key", "Read public user GPG keys"]]],
  ["admin:ssh_signing_key", "Full control of public user SSH signing keys", [["write:ssh_signing_key", "Write public user SSH signing keys"], ["read:ssh_signing_key", "Read public user SSH signing keys"]]]
];
var GH_FG_PERMS = [["Actions", "Workflows, workflow runs and artifacts."], ["Contents", "Repository contents, commits, branches, downloads, releases, and merges."], ["Environments", "Manage repository environments."], ["Metadata", "Search repositories, list collaborators, and access repository metadata."], ["Pull requests", "Pull requests and related comments, assignees, labels, milestones, and merges."], ["Secrets", "Manage Actions repository secrets."], ["Variables", "Manage Actions repository variables."], ["Webhooks", "Manage the post-receive hooks for a repository."], ["Workflows", "Update GitHub Action workflow files."]];
function ghTokenEx() { return ghTokens().slice().reverse().map(function (t) { return [t.token, t.name + " (" + t.kind + ")"]; }); }
function ghSetShell(active, title, kids) {
  var u = ghSess().user, items = [h("div", { cls: "gx-sw" }, [h("span", { cls: "gx-ava gx-ava-l", text: u.slice(0, 1).toUpperCase() }), h("div", {}, [h("b", { text: u }), h("div", { cls: "gx-mut gx-sm", text: "Your personal account" })])])];
  GH_SET_NAV.forEach(function (g) {
    if (g[0]) items.push(h("div", { cls: "gx-sg", text: g[0] }));
    g[1].forEach(function (it) { var on = it[0] === active; items.push(h("a", { href: "#", cls: "gx-si" + (on ? " on" : ""), onclick: function (e) { e.preventDefault(); ghGo(it[1]); } }, [it[0]])); });
  });
  return h("div", { cls: "gh" }, [ghHeader([h("b", { text: "Settings" })]), h("div", { cls: "gx-set" }, [h("nav", { cls: "gx-snav" }, items), h("main", { cls: "gx-scont" }, kids)])]);
}
function ghDevNav(active) {
  var a = function (t, path, ind) { return h("a", { href: "#", cls: "gx-si" + (t === active ? " on" : "") + (ind ? " gx-ind" : ""), onclick: function (e) { e.preventDefault(); ghGo(path); } }, [t]); };
  return [h("div", { cls: "gx-sw" }, [h("b", { text: "Settings / Developer Settings" })]), a("GitHub Apps", "/settings/apps"), a("OAuth Apps", "/settings/developers"), h("div", { cls: "gx-si gx-gp", text: "Personal access tokens" }), a("Fine-grained tokens", "/settings/personal-access-tokens", 1), a("Tokens (classic)", "/settings/tokens", 1)];
}
function ghDevShell(active, kids) { return h("div", { cls: "gh" }, [ghHeader([h("b", { text: "Settings" })]), h("div", { cls: "gx-set" }, [h("nav", { cls: "gx-snav" }, ghDevNav(active)), h("main", { cls: "gx-scont" }, kids)])]); }
function ghPageHead(title, right) { return h("div", { cls: "gx-ph" }, [h("h2", { text: title }), right || null].filter(Boolean)); }
function ghFlash(txt, kind) { return h("div", { cls: "gx-flash" + (kind ? " gx-" + kind : ""), text: txt }); }

function ghTokenRow(t, i) {
  var scopes = t.kind === "classic" ? (t.scopes.length ? t.scopes.join(", ") : "No scopes") : Object.keys(t.perms || {}).filter(function (k) { return t.perms[k] !== "No access"; }).map(function (k) { return k + ": " + t.perms[k]; }).join(", ") || "Public repositories (read-only)";
  return h("div", { cls: "gx-trow" }, [h("div", { style: "flex:1;min-width:0" }, [h("b", { text: t.name }), h("span", { cls: "gx-mut", text: " — " + scopes }), h("div", { cls: "gx-mut gx-sm", text: "Never used · Expires " + t.exp })]), h("button", { type: "button", cls: "gx-dbtn", text: "Delete", onclick: function () { var x = S.gh.tokens.splice(i, 1)[0]; S.gh.tokDel.push(x); render(); } })]);
}
function ghNewTokenBanner(t) {
  return h("div", {}, [h("div", { cls: "gx-newtok" }, [h("p", { text: "Make sure to copy your personal access token now. You won’t be able to see it again!" })]), h("div", { cls: "gx-tokrow" }, [h("span", { cls: "gx-ok", text: "✓" }), h("code", { text: t.token }), h("button", { type: "button", cls: "gx-cpy", title: "Copy token", "aria-label": "Copy token", text: "⧉", onclick: function () { try { navigator.clipboard.writeText(t.token); } catch (e) {} flash("ok", "คัดลอก token แล้ว: ไปวางในช่อง Password ของ Jenkins credential"); } }), h("span", { style: "flex:1" }), h("span", { cls: "gx-btn", text: "Configure SSO ▾" }), h("button", { type: "button", cls: "gx-dbtn", text: "Delete", onclick: function () { var k = ghTokens().indexOf(t); if (k >= 0) S.gh.tokDel.push(ghTokens().splice(k, 1)[0]); W.ghNew = null; render(); } })])]);
}
function ghExpDate(days) { var d = new Date(2026, 9, 28); d.setDate(d.getDate() + days); return d.toUTCString().slice(0, 16).replace(",", ""); }

// ---- หน้า Tokens (classic) ----
function wbGhTokens() {
  var list = ghTokens().filter(function (t) { return t.kind === "classic"; }), G = W.gt = W.gt || {};
  var dd = h("div", { cls: "gx-ddw" }, [h("button", { type: "button", cls: "gx-green gx-sm2", onclick: function () { G.open = !G.open; render(); } }, ["Generate new token ", ghStroke("caret", 12)]), G.open ? h("div", { cls: "gx-menu gx-ddm" }, [
    h("a", { href: "#", cls: "gx-mi", onclick: function (e) { e.preventDefault(); G.open = false; ghGo("/settings/personal-access-tokens/new"); } }, [h("b", { text: "Generate new token" }), h("span", { cls: "gx-mut gx-sm", text: " Fine-grained, repo-scoped" })]),
    h("a", { href: "#", cls: "gx-mi", onclick: function (e) { e.preventDefault(); G.open = false; ghGo("/settings/tokens/new"); } }, [h("b", { text: "Generate new token (classic)" }), h("span", { cls: "gx-mut gx-sm", text: " For general use" })])]) : null].filter(Boolean));
  var kids = [ghPageHead("Personal access tokens (classic)", dd)];
  if (W.ghNew) { kids.push(ghNewTokenBanner(W.ghNew)); }
  kids.push(h("p", { cls: "gx-mut", text: "Tokens you have generated that can be used to access the GitHub API." }));
  kids.push(h("div", { cls: "gx-tbox" }, list.length ? list.map(function (t) { return ghTokenRow(t, ghTokens().indexOf(t)); }) : [h("div", { cls: "gx-blank", text: "No personal access tokens (classic) yet." })]));
  kids.push(h("p", { cls: "gx-mut gx-sm", text: "Personal access tokens (classic) function like ordinary OAuth access tokens. They can be used instead of a password for Git over HTTPS, or can be used to authenticate to the API over Basic Authentication." }));
  return ghDevShell("Tokens (classic)", kids);
}
function wbGhTokenNew() {
  var F = W.gtn = W.gtn || { note: "", exp: "30", scopes: {} }, setScope = function (n, v) { F.scopes[n] = v; render(); };
  var rows = [];
  GH_SCOPES.forEach(function (s) {
    var kids = [s].concat(s[2].length ? s[2].map(function (c) { return [c[0], c[1], true]; }) : []);
    rows.push(h("div", { cls: "gx-sc" }, [h("label", {}, [h("input", { type: "checkbox", checked: F.scopes[s[0]] ? "checked" : null, onchange: function (e) { setScope(s[0], e.target.checked); s[2].forEach(function (c) { F.scopes[c[0]] = e.target.checked; }); render(); } }), h("b", { text: s[0] }), h("span", { text: " " + s[1] })])].concat(s[2].map(function (c) { return h("label", { cls: "gx-sub" }, [h("input", { type: "checkbox", checked: F.scopes[c[0]] ? "checked" : null, onchange: function (e) { setScope(c[0], e.target.checked); } }), h("b", { text: c[0] }), h("span", { text: " " + c[1] })]); }))));
  });
  var gen = function () {
    var note = (document.getElementById("gh-tnote") || {}).value || ""; F.note = note;
    if (!note.trim()) { F.err = "Note can't be blank"; render(); return; }
    var sc = Object.keys(F.scopes).filter(function (k) { return F.scopes[k]; }), days = F.exp === "never" ? 0 : +F.exp;
    var t = { kind: "classic", name: note.trim(), scopes: sc, token: ghTokenValue("classic"), exp: days ? ghExpDate(days) : "never" }; ghTokens().push(t); W.ghNew = t; F.note = ""; F.scopes = {}; F.err = ""; ghGo("/settings/tokens");
  };
  var body = [ghPageHead("New personal access token (classic)"), h("p", { cls: "gx-mut", text: "Personal access tokens (classic) function like ordinary OAuth access tokens. They can be used instead of a password for Git over HTTPS, or can be used to authenticate to the API over Basic Authentication." }),
    h("div", { cls: "gx-fld" }, [h("label", { for: "gh-tnote", text: "Note" }), h("input", { type: "text", id: "gh-tnote", cls: "gx-in gx-w", value: F.note, oninput: function (e) { F.note = e.target.value; }, "aria-describedby": "gh-thint" }), F.err ? h("div", { cls: "gx-ferr", text: F.err }) : null, h("div", { id: "gh-thint", cls: "gx-mut gx-sm", text: "What’s this token for?" })]),
    h("div", { cls: "gx-fld" }, [h("label", { for: "gh-texp", text: "Expiration" }), h("select", { id: "gh-texp", cls: "gx-in gx-sel", onchange: function (e) { F.exp = e.target.value; render(); } }, [["7", "7 days"], ["30", "30 days"], ["60", "60 days"], ["90", "90 days"], ["never", "No expiration"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: F.exp === o[0] ? "selected" : null }); })), h("span", { cls: "gx-mut gx-sm", text: F.exp === "never" ? " The token will never expire!" : " The token will expire on " + ghExpDate(+F.exp) })]),
    h("div", { cls: "gx-fld" }, [h("label", { text: "Select scopes" }), h("p", { cls: "gx-mut gx-sm", text: "Scopes define the access for personal tokens. Read more about OAuth scopes." })]),
    h("div", { cls: "gx-tbox gx-scopes" }, rows),
    h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-green gx-sm2", text: "Generate token", onclick: gen }), h("button", { type: "button", cls: "gx-btn", text: "Cancel", onclick: function () { ghGo("/settings/tokens"); } })])];
  return ghDevShell("Tokens (classic)", body);
}
// ---- Fine-grained ----
function wbGhFgList() {
  var list = ghTokens().filter(function (t) { return t.kind === "fine-grained"; });
  var kids = [ghPageHead("Fine-grained personal access tokens", h("button", { type: "button", cls: "gx-green gx-sm2", text: "Generate new token", onclick: function () { ghGo("/settings/personal-access-tokens/new"); } }))];
  if (W.ghNew && W.ghNew.kind === "fine-grained") kids.push(ghNewTokenBanner(W.ghNew));
  kids.push(h("p", { cls: "gx-mut", text: "These are fine-grained, repository-scoped tokens suitable for personal API use and for using Git over HTTPS." }));
  kids.push(h("div", { cls: "gx-tbox" }, list.length ? list.map(function (t) { return ghTokenRow(t, ghTokens().indexOf(t)); }) : [h("div", { cls: "gx-blank", text: "You have not created any fine-grained personal access tokens." })]));
  return ghDevShell("Fine-grained tokens", kids);
}
function wbGhFgNew() {
  var F = W.gfn = W.gfn || { name: "", exp: "30", desc: "", repo: "public", perms: { Metadata: "Read-only" } }, user = ghSess().user;
  var gen = function () {
    var nm = (document.getElementById("gh-fname") || {}).value || ""; F.name = nm; if (!nm.trim()) { F.err = "Token name can't be blank"; render(); return; }
    var days = +F.exp, t = { kind: "fine-grained", name: nm.trim(), perms: Object.assign({}, F.perms), repoAccess: F.repo, token: ghTokenValue("fg"), exp: ghExpDate(days) }; ghTokens().push(t); W.ghNew = t; F.name = ""; F.err = ""; ghGo("/settings/personal-access-tokens");
  };
  var perm = GH_FG_PERMS.map(function (p) { return h("div", { cls: "gx-prm" }, [h("div", {}, [h("b", { text: p[0] }), h("div", { cls: "gx-mut gx-sm", text: p[1] })]), p[0] === "Metadata" ? h("span", { cls: "gx-mut", text: "Read-only" }) : h("select", { cls: "gx-in gx-sel gx-sm3", "aria-label": p[0], onchange: function (e) { F.perms[p[0]] = e.target.value; } }, ["No access", "Read-only", "Read and write"].map(function (o) { return h("option", { value: o, text: o, selected: (F.perms[p[0]] || "No access") === o ? "selected" : null }); }))]); });
  var radio = function (v, t) { return h("label", { cls: "gx-rad" }, [h("input", { type: "radio", name: "gh-repoacc", checked: F.repo === v ? "checked" : null, onchange: function () { F.repo = v; render(); } }), " " + t]); };
  var body = [ghPageHead("New fine-grained personal access token"), h("p", { cls: "gx-mut", text: "Create a fine-grained, repository-scoped token suitable for personal API use and for using Git over HTTPS." }),
    h("div", { cls: "gx-fld" }, [h("label", { for: "gh-fname", text: "Token name" }), h("input", { type: "text", id: "gh-fname", cls: "gx-in gx-w", value: F.name, oninput: function (e) { F.name = e.target.value; } }), F.err ? h("div", { cls: "gx-ferr", text: F.err }) : null]),
    h("div", { cls: "gx-fld" }, [h("label", { text: "Expiration" }), h("select", { cls: "gx-in gx-sel", onchange: function (e) { F.exp = e.target.value; render(); } }, [["7", "7 days"], ["30", "30 days (" + ghExpDate(30) + ")"], ["60", "60 days"], ["90", "90 days"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: F.exp === o[0] ? "selected" : null }); }))]),
    h("div", { cls: "gx-fld" }, [h("label", { text: "Description" }), h("textarea", { cls: "gx-in gx-w gx-ta", placeholder: "Description", "aria-label": "Description", oninput: function (e) { F.desc = e.target.value; } })]),
    h("div", { cls: "gx-fld" }, [h("label", { text: "Resource owner" }), h("div", { cls: "gx-in gx-sel", text: user })]),
    h("div", { cls: "gx-fld" }, [h("label", { text: "Repository access" }), radio("public", "Public repositories (read-only)"), radio("all", "All repositories"), radio("select", "Only select repositories")]),
    h("div", { cls: "gx-fld" }, [h("label", { text: "Permissions" }), h("p", { cls: "gx-mut gx-sm", text: "Read our permissions documentation for information about specific permissions." }), h("div", { cls: "gx-tbox" }, perm)]),
    h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-green gx-sm2", text: "Generate token", onclick: gen }), h("button", { type: "button", cls: "gx-btn", text: "Cancel", onclick: function () { ghGo("/settings/personal-access-tokens"); } })])];
  return ghDevShell("Fine-grained tokens", body);
}
function wbGhDevApps(which) { return ghDevShell(which === "oauth" ? "OAuth Apps" : "GitHub Apps", [ghPageHead(which === "oauth" ? "OAuth Apps" : "GitHub Apps", h("span", { cls: "gx-btn", text: which === "oauth" ? "New OAuth App" : "New GitHub App" })), h("div", { cls: "gx-tbox" }, [h("div", { cls: "gx-blank", text: which === "oauth" ? "No OAuth applications" : "No GitHub Apps" })])]); }
function wbGhProfile() {
  var u = ghSess().user, F = W.gpf = W.gpf || { name: "", mail: "", bio: "", url: "" }, f = function (l, k, ta) { return h("div", { cls: "gx-fld" }, [h("label", { text: l }), h(ta ? "textarea" : "input", Object.assign({ cls: "gx-in gx-w" + (ta ? " gx-ta" : ""), value: F[k], oninput: function (e) { F[k] = e.target.value; } }, ta ? {} : { type: "text" }))]); };
  return ghSetShell("Public profile", "Public profile", [ghPageHead("Public profile"), f("Name", "name"), h("p", { cls: "gx-mut gx-sm", text: "Your name may appear around GitHub where you contribute or are mentioned. You can remove it at any time." }), f("Public email", "mail"), f("Bio", "bio", true), f("URL", "url"), h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-green gx-sm2", text: "Update profile", onclick: function () { flash("ok", "Profile updated successfully"); } })]), h("p", { cls: "gx-mut gx-sm", text: "Signed in as " + u })]);
}
function wbGhSettings(parts) {
  var p = parts.slice(1).join("/");
  if (p === "profile" || p === "") return wbGhProfile();
  if (p === "tokens") { var v = wbGhTokens(); W.ghNew = null; return v; }
  if (p === "tokens/new") return wbGhTokenNew();
  if (p === "personal-access-tokens") { var v2 = wbGhFgList(); W.ghNew = null; return v2; }
  if (p === "personal-access-tokens/new") return wbGhFgNew();
  if (p === "apps") return wbGhDevApps("apps");
  if (p === "developers") return wbGhDevApps("oauth");
  var name = ""; GH_SET_NAV.forEach(function (g) { g[1].forEach(function (it) { if (it[1] === "/settings/" + p) name = it[0]; }); });
  return ghSetShell(name || "Public profile", name, [ghPageHead(name || "Settings"), h("p", { cls: "gx-mut", text: "หน้านี้ของ GitHub ยังไม่ได้จำลอง (ใน lab ใช้ Developer settings › Personal access tokens และ Settings ของ repo)" })]);
}
