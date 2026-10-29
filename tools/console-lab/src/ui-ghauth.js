// ===== GitHub จำลอง: login / dashboard / header / เมนูรูปโปรไฟล์ — โครงข้อความและสีตาม github.com จริง (ดึง HTML+render หน้า /login จริงมาเทียบ) =====
// หน้าหลัง login (dashboard, settings) ไม่ได้เปิดดูจากของจริงได้ → ทำตามเอกสาร docs.github.com + Primer; ไม่ใช่การ copy พิกเซล
var GH_MARK = "M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z";
function ghSvg(d, size, extra) {
  var NS = "http://www.w3.org/2000/svg", s = document.createElementNS(NS, "svg"), p = document.createElementNS(NS, "path");
  s.setAttribute("viewBox", "0 0 16 16"); s.setAttribute("width", size || 16); s.setAttribute("height", size || 16); s.setAttribute("aria-hidden", "true"); s.style.fill = "currentColor"; s.style.display = "inline-block"; s.style.verticalAlign = "text-bottom";
  p.setAttribute("d", d); s.appendChild(p); if (extra) s.setAttribute("class", extra); return s;
}
function ghStroke(kind, size) { // ไอคอนเส้นง่ายๆ ใช้ในแถบบน (แทน octicons)
  var NS = "http://www.w3.org/2000/svg", s = document.createElementNS(NS, "svg"), g = document.createElementNS(NS, "g");
  s.setAttribute("viewBox", "0 0 16 16"); s.setAttribute("width", size || 16); s.setAttribute("height", size || 16); g.setAttribute("fill", "none"); g.setAttribute("stroke", "currentColor"); g.setAttribute("stroke-width", "1.5"); g.setAttribute("stroke-linecap", "round"); g.setAttribute("stroke-linejoin", "round");
  var add = function (t, a) { var e = document.createElementNS(NS, t); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); g.appendChild(e); };
  if (kind === "menu") { add("path", { d: "M2 4h12M2 8h12M2 12h12" }); }
  else if (kind === "search") { add("circle", { cx: 7, cy: 7, r: 4.5 }); add("path", { d: "M10.5 10.5 14 14" }); }
  else if (kind === "plus") { add("path", { d: "M8 3v10M3 8h10" }); }
  else if (kind === "caret") { add("path", { d: "M4.5 6.5 8 10l3.5-3.5" }); }
  else if (kind === "issue") { add("circle", { cx: 8, cy: 8, r: 6 }); add("circle", { cx: 8, cy: 8, r: 1, fill: "currentColor" }); }
  else if (kind === "pr") { add("circle", { cx: 4, cy: 3.5, r: 1.6 }); add("circle", { cx: 4, cy: 12.5, r: 1.6 }); add("circle", { cx: 12, cy: 12.5, r: 1.6 }); add("path", { d: "M4 5.1v5.8M12 10.9V6.5a2 2 0 0 0-2-2H8M9.5 3 8 4.5 9.5 6" }); }
  else if (kind === "inbox") { add("path", { d: "M2 9l1.8-5.5h8.4L14 9v4H2zM2 9h3.5l1 1.5h3L11 9H14" }); }
  s.appendChild(g); return s;
}
function ghSess() { ghInit(); return S.gh.session && S.gh.session.user ? S.gh.session : null; }
function ghGo(path) { W.addr = "https://github.com" + path; W.res = webOpen(W.addr); W.page = ""; W.ghMenu = false; W.ghPlus = false; render(); }
function ghLinkEl(path, kids, cls) { return h("a", { href: "#", cls: cls || "", onclick: function (e) { e.preventDefault(); ghGo(path); } }, [].concat(kids)); }
function ghBtnSq(kind, title, on) { return h("button", { type: "button", cls: "gx-sq", title: title, "aria-label": title, onclick: on || function () {} }, [ghStroke(kind, 16)]); }

// ---- เมนูรูปโปรไฟล์ (ข้อความตามเมนูจริงของ github.com)
function ghAvatarMenu(user) {
  var item = function (ic, t, path, extra) { return h("a", { href: "#", cls: "gx-mi gx-mic" + (extra || ""), onclick: function (e) { e.preventDefault(); if (path === "!out") { S.gh.session = null; ghGo("/login"); } else if (path === "!status") { W.ghMenu = false; W.ghStatus = true; render(); } else if (path === "!repos" || path === "!projects") { W.ghPT = path === "!repos" ? "repositories" : "projects"; ghGo("/" + user); } else if (path) ghGo(path); else { W.ghMenu = false; render(); } } }, [h("span", { cls: "gx-mico", text: ic }), t]); };
  return h("div", { cls: "gx-menu" }, [
    h("div", { cls: "gx-mh2" }, [h("span", { cls: "gx-ava gx-ava-s2", text: user.slice(0, 1).toUpperCase() }), h("div", {}, [h("b", { text: user }), h("div", { cls: "gx-mut gx-sm", text: user }), (S.gh.status || {}).text ? h("div", { cls: "gx-mut gx-sm", text: (S.gh.status.emoji || "") + " " + S.gh.status.text }) : null]), h("span", { cls: "gx-x", text: "✕", onclick: function () { W.ghMenu = false; render(); } })]),
    item("☺", "Set status", "!status"), h("div", { cls: "gx-ms" }),
    item("👤", "Your profile", "/" + user), h("div", { cls: "gx-ms" }),
    item("▢", "Your repositories", "!repos"), item("▦", "Your projects", "!projects"), item("▥", "Your organizations"), item("◍", "Your enterprises"), item("☆", "Your stars"), item("♡", "Your sponsors"), item("‹›", "Your gists"),
    h("div", { cls: "gx-ms" }), item("⇧", "Upgrade"), item("⚗", "Feature preview"), item("⚙", "Settings", "/settings/profile"), item("✦", "Copilot settings"),
    h("div", { cls: "gx-ms" }), item("", "GitHub Docs"), item("", "GitHub Support"), item("", "GitHub Community"), h("div", { cls: "gx-ms" }), item("", "Sign out", "!out")
  ]);
}
function ghHeader(ctxKids) {
  var u = ghSess(), jump = ctxKids === undefined;
  var left = [ghBtnSq("menu", "Open global navigation menu"), ghLinkEl("/", ghSvg(GH_MARK, 32), "gx-mark"), h("div", { cls: "gx-ctx" }, ctxKids || [])];
  if (!u) return h("header", { cls: "gx-hd" }, [h("div", { cls: "gx-hl" }, [ghLinkEl("/", ghSvg(GH_MARK, 32), "gx-mark"), h("div", { cls: "gx-ctx" }, ctxKids || [])]), h("div", { cls: "gx-hr" }, [h("span", { cls: "gx-sbox" }, [ghStroke("search", 16), h("span", { text: "Search or jump to…" })]), ghLinkEl("/login", "Sign in", "gx-btn"), ghLinkEl("/signup", "Sign up", "gx-btn gx-btn-o")])]);
  var ava = h("button", { type: "button", cls: "gx-ava", "aria-label": "Open user navigation menu", onclick: function () { W.ghMenu = !W.ghMenu; render(); } }, [u.user.slice(0, 1).toUpperCase()]);
  return h("header", { cls: "gx-hd" }, [h("div", { cls: "gx-hl" }, left), h("div", { cls: "gx-hr" }, [
    jump ? h("span", { cls: "gx-sbox" }, [ghStroke("search", 16), h("span", { style: "flex:1", text: "Search or jump to…" }), h("kbd", { cls: "gx-kbd", text: "/" })]) : h("span", { cls: "gx-sbox" }, [ghStroke("search", 16), h("span", { style: "flex:1", text: "Type " }), h("kbd", { cls: "gx-kbd", text: "/" }), h("span", { text: " to search" }), h("span", { cls: "gx-term", text: ">_" })]),
    h("span", { cls: "gx-avawrap" }, [h("span", { cls: "gx-pair", onclick: function () { W.ghPlus = !W.ghPlus; W.ghMenu = false; render(); } }, [ghBtnSq("plus", "Create new…"), h("span", { cls: "gx-caret" }, [ghStroke("caret", 12)])]), W.ghPlus ? h("div", { cls: "gx-menu gx-plus" }, [["▢ New repository", "/new"], ["⇩ Import repository", ""], null, ["▭ New codespace", ""], ["‹› New gist", ""], null, ["▦ New organization", ""]].map(function (it) { return it ? h("a", { href: "#", cls: "gx-mi", onclick: function (e) { e.preventDefault(); W.ghPlus = false; if (it[1]) ghGo(it[1]); else render(); } }, [it[0]]) : h("div", { cls: "gx-ms" }); })) : null]),
    ghBtnSq("issue", "Issues"), ghBtnSq("pr", "Pull requests"), ghBtnSq("inbox", "You have no unread notifications"),
    h("div", { cls: "gx-avawrap" }, [ava, W.ghMenu ? ghAvatarMenu(u.user) : null].filter(Boolean))
  ])]);
}
function ghFooterLinks() { return h("footer", { cls: "gx-ft" }, ["Terms", "Privacy", "Docs", "Contact GitHub Support", "Manage cookies", "Do not share my personal information"].map(function (t) { return h("a", { href: "#", text: t, onclick: function (e) { e.preventDefault(); } }); })); }

// ---- หน้า /login (ข้อความ/ปุ่ม/ลำดับตามหน้าจริง)
function wbGhLogin(returnTo, notice) {
  var G = W.gl = W.gl || { u: "", p: "", err: "" };
  var input = function (id, type, key, extra) { return h("input", Object.assign({ type: type, id: id, cls: "gx-in", autocomplete: type === "password" ? "current-password" : "username", value: G[key], oninput: function (e) { G[key] = e.target.value; }, onkeydown: function (e) { if (e.key === "Enter") { e.preventDefault(); sub(); } } }, extra || {})); };
  var sub = function () {
    var u = (document.getElementById("login_field") || {}).value || "", p = (document.getElementById("password") || {}).value || ""; G.u = u; G.p = p;
    if (!u.trim() || !p) { G.err = "Incorrect username or password."; render(); return; }
    var name = u.indexOf("@") > 0 ? u.split("@")[0] : u.trim(); // รับชื่ออะไรก็ได้ (lab จำลอง ไม่ตรวจรหัสผ่าน)
    S.gh.session = { user: name }; G.err = ""; G.p = ""; W.ghMenu = false;
    var rt = returnTo && returnTo.charAt(0) === "/" ? returnTo : "/"; ghGo(rt);
  };
  var kids = [
    h("div", { cls: "gx-lh" }, [ghSvg(GH_MARK, 48), h("h1", { text: "Sign in to GitHub" })]),
    notice ? h("div", { cls: "gx-flash", text: notice }) : null,
    G.err ? h("div", { cls: "gx-flash gx-err", role: "alert", text: G.err }) : null,
    h("div", { cls: "gx-form" }, [
      h("label", { for: "login_field", text: "Username or email address" }), input("login_field", "text", "u"),
      h("div", { cls: "gx-prow" }, [h("label", { for: "password", text: "Password" }), h("a", { href: "#", cls: "gx-lnk", text: "Forgot password?", onclick: function (e) { e.preventDefault(); } })]), input("password", "password", "p"),
      h("button", { type: "button", cls: "gx-green", text: "Sign in", onclick: sub })
    ]),
    h("div", { cls: "gx-or" }, [h("span", { text: "or" })]),
    h("button", { type: "button", cls: "gx-alt" }, [h("span", { cls: "gx-g", text: "G" }), "Continue with Google"]),
    h("button", { type: "button", cls: "gx-alt" }, [ghSvg("M11.2 8.5c0-1.6 1.3-2.4 1.4-2.4-.8-1.1-1.9-1.3-2.3-1.3-1-.1-1.9.6-2.4.6s-1.3-.6-2.1-.5c-1.1 0-2.1.6-2.6 1.6-1.1 1.9-.3 4.8.8 6.4.5.8 1.2 1.6 2 1.6.8 0 1.1-.5 2.1-.5s1.3.5 2.1.5 1.4-.8 1.9-1.5c.6-.9.8-1.7.9-1.8-.1 0-1.8-.7-1.8-2.6zM9.6 3.6c.4-.5.7-1.2.6-1.9-.6 0-1.4.4-1.8.9-.4.4-.7 1.1-.6 1.8.7.1 1.4-.3 1.8-.8z", 16), "Continue with Apple"]),
    h("p", { cls: "gx-new" }, ["New to GitHub? ", h("a", { href: "#", text: "Create an account", onclick: function (e) { e.preventDefault(); } })]),
    h("p", { cls: "gx-new" }, [h("a", { href: "#", text: "Sign in with a passkey", onclick: function (e) { e.preventDefault(); } })])
  ].filter(Boolean);
  return h("div", { cls: "gx-page gx-login" }, [h("div", { cls: "gx-lwrap" }, kids), ghFooterLinks()]);
}

// ---- หน้าแรกหลัง login (Dashboard): sidebar Top repositories + Home feed
function wbGhDashboard(user) {
  ghInit(); var names = Object.keys(S.gh.repos), desc = { "pharmacy-backend": "Django + DRF", "pharmacy-frontend": "Next.js / TypeScript", "pharmacy-manifests": "Kubernetes manifests / ArgoCD" };
  var nav = [["⌂", "Home", true], ["▢", "Repositories", false], ["▦", "Projects", false], ["⬡", "Packages", false], ["☆", "Stars", false], ["▤", "Gists", false]].map(function (x) { return h("a", { href: "#", cls: "gx-dn" + (x[2] ? " on" : ""), onclick: function (e) { e.preventDefault(); if (x[1] === "Repositories") ghGo("/" + user + "?tab=repositories"); } }, [h("span", { cls: "gx-dni", text: x[0] }), x[1]]); });
  var left = h("aside", { cls: "gx-dl" }, [h("div", { cls: "gx-dctx" }, [h("span", { cls: "gx-ava gx-ava-s2", text: user.slice(0, 1).toUpperCase() }), h("b", { text: user + " ⌄" })])].concat(nav, [h("div", { cls: "gx-dsep" }), h("b", { cls: "gx-dra", text: "Recent activity" }), h("p", { cls: "gx-mut gx-sm", text: "When you take actions across GitHub, we’ll show them here." })]));
  var cards = names.length ? names.map(function (n) { var r = S.gh.repos[n]; return h("div", { cls: "gx-rrow" }, [h("span", { cls: "gx-rri", text: "▢" }), h("div", { style: "flex:1;min-width:0" }, [h("a", { href: "#", cls: "gx-rrn", text: r.user + "/" + n, onclick: function (e) { e.preventDefault(); ghGo("/" + r.user + "/" + n); } }), h("div", { cls: "gx-rrd", text: desc[n] || "" })]), h("span", { cls: "gx-mut gx-sm", text: "2 days ago" })]); }) : [h("div", { cls: "gx-rrow" }, [h("span", { cls: "gx-mut", text: "You don’t have any repositories yet." })])];
  var feed = h("main", { cls: "gx-dm" }, [h("h1", { cls: "gx-dh", text: "Home" }), h("b", { cls: "gx-dsub", text: "Start your next project" }), h("div", { cls: "gx-crc" }, [h("span", { cls: "gx-crci", text: "▢" }), h("div", {}, [h("b", { text: "Create a repository" }), h("p", { cls: "gx-mut", text: "Repositories are where you store your code, manage issues, and connect with your collaborators." }), h("button", { type: "button", cls: "gx-green gx-sm2", text: "New repository", onclick: function () { ghGo("/new"); } })]), h("span", { cls: "gx-x", text: "✕" })]), h("div", { cls: "gx-rh" }, [h("b", { text: "Recent repositories" }), h("a", { href: "#", text: "View all", onclick: function (e) { e.preventDefault(); ghGo("/" + user + "?tab=repositories"); } })]), h("div", { cls: "gx-rlist" }, cards)]);
  var right = h("aside", { cls: "gx-dr" }, [h("div", { cls: "gx-rc" }, [h("b", { text: "Latest changes" }), h("ul", { cls: "gx-lc" }, [["2 days ago", "GitHub Actions: larger runners now generally available"], ["3 days ago", "Dependabot version updates now support more ecosystems"], ["5 days ago", "Code scanning now supports more languages"]].map(function (x) { return h("li", {}, [h("span", { cls: "gx-mut gx-sm", text: x[0] }), h("div", { text: x[1] })]); })), h("a", { href: "#", cls: "gx-sm", text: "View changelog →", onclick: function (e) { e.preventDefault(); } })]), h("div", { cls: "gx-rc" }, [h("b", { text: "Explore repositories" })].concat([["github/docs", "The GitHub documentation"], ["github/linguist", "Language detection library"], ["github/roadmap", "The GitHub roadmap"]].map(function (x) { return h("div", { cls: "gx-er" }, [h("span", { cls: "gx-eri", text: "◍" }), h("div", { style: "flex:1" }, [h("b", { text: x[0] }), h("div", { cls: "gx-mut gx-sm", text: x[1] })]), h("span", { cls: "gx-btn gx-xs", text: "☆ Star" })]); }), [h("a", { href: "#", cls: "gx-sm", text: "View more →", onclick: function (e) { e.preventDefault(); } })]))]);
  return h("div", { cls: "gx-page gx-dash" }, [h("div", { cls: "gx-dcols" }, [left, feed, right])]);
}
