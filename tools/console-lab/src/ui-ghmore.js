// ===== GitHub จำลอง: New repository · Quick setup (repo ว่าง) · Releases (สร้าง tag ผ่านเว็บ → trigger workflow) · Pull requests / Issues (หน้าว่าง) =====
// ข้อความตามหน้าจริงจากความจำ/เอกสาร (ต้อง login จึงดึงของจริงมาเทียบไม่ได้)
function wbGhNew() {
  ghInit(); var u = ghSess().user, F = W.gnr = W.gnr || { name: "", desc: "", vis: "public", readme: false, ign: "No .gitignore", lic: "No license" };
  var nm = (F.name || "").trim(), taken = nm && S.gh.repos[nm], bad = nm && !/^[A-Za-z0-9._-]+$/.test(nm);
  var msg = !nm ? null : bad ? h("div", { cls: "gx-ferr", text: "Repository name may only contain letters, numbers, '.', '-' and '_'." }) : taken ? h("div", { cls: "gx-ferr", text: "The repository " + nm + " already exists on this account." }) : h("div", { cls: "gx-okm" }, [h("span", { cls: "gx-okc", text: "✓" }), " " + nm + " is available."]);
  var rd = function (v, t, d) { return h("label", { cls: "gx-rad gx-radbig" }, [h("input", { type: "radio", name: "gh-vis", checked: F.vis === v ? "checked" : null, onchange: function () { F.vis = v; render(); } }), h("span", {}, [h("b", { text: " " + t }), h("div", { cls: "gx-mut gx-sm", text: d })])]); };
  var create = function () {
    var n = ((document.getElementById("gh-nrn") || {}).value || "").trim(); F.name = n; if (!n) { F.err = "Repository name is required"; render(); return; }
    if (!/^[A-Za-z0-9._-]+$/.test(n) || S.gh.repos[n]) { render(); return; }
    var files = F.readme ? { "README.md": "# " + n + "\n" } : {}; S.gh.repos[n] = { user: u, files: files, tags: [], n: F.readme ? 1 : 0, empty: !F.readme, vis: F.vis, desc: F.desc };
    W.gnr = null; ghGo("/" + u + "/" + n);
  };
  return h("div", { cls: "gx-newrepo" }, [
    h("h1", { text: "Create a new repository" }),
    h("p", { cls: "gx-mut", text: "A repository contains all project files, including the revision history. Already have a project repository elsewhere? Import a repository." }),
    h("p", { cls: "gx-mut gx-sm", text: "Required fields are marked with an asterisk (*)." }),
    h("h3", { cls: "gx-step" }, [h("span", { cls: "gx-stepn", text: "1" }), "General"]),
    h("div", { style: "display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap" }, [
      h("div", { cls: "gx-fld" }, [h("label", { text: "Owner *" }), h("div", { cls: "gx-in gx-sel", text: u + " ▾" })]), h("span", { style: "padding-bottom:14px", text: "/" }),
      h("div", { cls: "gx-fld" }, [h("label", { for: "gh-nrn", text: "Repository name *" }), h("input", { type: "text", id: "gh-nrn", cls: "gx-in", value: F.name, autocomplete: "off", oninput: function (e) { F.name = e.target.value; F.err = ""; }, onblur: function () { render(); }, onkeydown: function (e) { if (e.key === "Enter") { e.preventDefault(); render(); } } }), F.err ? h("div", { cls: "gx-ferr", text: F.err }) : null].filter(Boolean))]),
    msg,
    h("p", { cls: "gx-mut gx-sm" }, ["Great repository names are short and memorable. How about ", h("a", { href: "#", cls: "gx-grn", text: "pharmacy-backend", onclick: function (e) { e.preventDefault(); F.name = "pharmacy-backend"; render(); } }), "?"]),
    h("div", { cls: "gx-fld" }, [h("label", { for: "gh-nrd", text: "Description" }), h("input", { type: "text", id: "gh-nrd", cls: "gx-in gx-w", maxlength: "350", value: F.desc, oninput: function (e) { F.desc = e.target.value; } }), h("div", { cls: "gx-mut gx-sm", text: "0 / 350 characters" })]),
    h("h3", { cls: "gx-step" }, [h("span", { cls: "gx-stepn", text: "2" }), "Configuration"]),
    h("div", { cls: "gx-fld" }, [h("label", { text: "Choose visibility *" }), rd("public", "Public", "Anyone on the internet can see this repository. You choose who can commit."), rd("private", "Private", "You choose who can see and commit to this repository.")]),
    h("div", { cls: "gx-tbox" }, [
      h("div", { cls: "gx-trow" }, [h("div", { style: "flex:1" }, [h("b", { text: "Add README" }), h("div", { cls: "gx-mut gx-sm", text: "READMEs can be used as longer descriptions. About READMEs" })]), h("label", { cls: "gx-rad" }, [h("input", { type: "checkbox", checked: F.readme ? "checked" : null, onchange: function (e) { F.readme = e.target.checked; render(); } }), F.readme ? " On" : " Off"])]),
      h("div", { cls: "gx-trow" }, [h("div", { style: "flex:1" }, [h("b", { text: "Add .gitignore" }), h("div", { cls: "gx-mut gx-sm", text: ".gitignore tells git which files not to track. About ignoring files" })]), h("span", { cls: "gx-btn", text: F.ign + " ▾" })]),
      h("div", { cls: "gx-trow" }, [h("div", { style: "flex:1" }, [h("b", { text: "Add license" }), h("div", { cls: "gx-mut gx-sm", text: "Licenses explain how others can use your code. About licenses" })]), h("span", { cls: "gx-btn", text: F.lic + " ▾" })])]),
    h("p", { cls: "gx-mut gx-sm", text: F.readme ? "⚠ ติ๊ก Add README = repo มี commit แรกแล้ว: git push จากเครื่องจะถูกปฏิเสธ (fetch first) ต้อง git pull ก่อน · ถ้าจะ push ของที่มีอยู่แล้ว ให้ปล่อย README เป็น Off" : "You are creating a " + F.vis + " repository in your personal account." }),
    h("div", { cls: "gx-act", style: "justify-content:flex-end" }, [h("button", { type: "button", cls: "gx-green gx-sm2", text: "Create repository", onclick: create })])
  ]);
}
function wbGhQuick(user, name, rp, link) {
  var url = "https://github.com/" + user + "/" + name + ".git", code = function (t) { return h("pre", { cls: "gx-code", text: t }); };
  return h("div", { cls: "gx-quick" }, [
    h("div", { cls: "gx-qbox" }, [h("h2", { text: "Quick setup — if you’ve done this kind of thing before" }), h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, [h("span", { cls: "gx-btn gx-on", text: "HTTPS" }), h("span", { cls: "gx-btn", text: "SSH" }), h("code", { cls: "gx-urlbox", text: url })]), h("p", { cls: "gx-mut", text: "Get started by creating a new file or uploading an existing file. We recommend every repository include a README, LICENSE, and .gitignore." })]),
    h("h3", { text: "…or create a new repository on the command line" }), code('echo "# ' + name + '" >> README.md\ngit init\ngit add README.md\ngit commit -m "first commit"\ngit branch -M main\ngit remote add origin ' + url + "\ngit push -u origin main"),
    h("h3", { text: "…or push an existing repository from the command line" }), code("git remote add origin " + url + "\ngit branch -M main\ngit push -u origin main"),
    h("p", { cls: "gx-mut gx-sm", text: "หมายเหตุ lab: ตัวจำลอง git ใช้ git init -b main ได้ (ไม่มี git branch -M)" })]);
}
function wbGhReleases(user, name, rp, sub, link) {
  rp.releases = rp.releases || []; var base = "/" + user + "/" + name, rf = W.grl = W.grl || { tag: "", title: "", body: "" };
  if (sub[0] === "edit") return wbGhRelEdit(user, name, rp, sub[1]);
  if (sub[0] === "new") {
    var pub = function () {
      var tag = ((document.getElementById("gh-rtag") || {}).value || "").trim(), title = ((document.getElementById("gh-rtt") || {}).value || "").trim(), body = (document.getElementById("gh-rbd") || {}).value || "";
      if (!tag) { flash("bad", "Choose a tag for this release"); return; } if (!/^[^\s~^:?*\[\\]+$/.test(tag)) { flash("bad", "Tag name is invalid"); return; } if (rp.releases.some(function (r) { return r.tag === tag; })) { flash("bad", "Release tag " + tag + " already exists"); return; }
      var isNew = rp.tags.indexOf(tag) < 0; if (isNew) rp.tags.push(tag); rp.releases.unshift({ tag: tag, title: title || tag, body: body, n: rp.releases.length + 1 });
      var extra = ""; if (isNew && typeof ghaWf === "function" && ghaWf(user + "/" + name)) { var r = API.ghaTag(user + "/" + name, tag); extra = r.skipped ? " · workflow ไม่รัน: " + r.msg : " · workflow ถูก trigger (ดูแท็บ Actions)"; } W.grl = null; flash("ok", "Release " + tag + " published" + extra); ghGo(base + "/releases");
    };
    return h("div", { cls: "gx-quick" }, [h("h2", { text: "New release" }), h("div", { cls: "gx-relrow" }, [h("span", { cls: "gx-btn gx-big" }, ["🏷 ", h("input", { type: "text", id: "gh-rtag", cls: "gx-tagin", list: "gh-tags", placeholder: "Choose a tag", value: rf.tag, oninput: function (e) { rf.tag = e.target.value; render(); } }), " ▾"]), h("datalist", { id: "gh-tags" }, rp.tags.map(function (t) { return h("option", { value: t }); })), h("span", { cls: "gx-btn gx-big" }, ["⑂ Target:  ", h("b", { text: "main" }), " ▾"])]), rf.tag ? h("p", { cls: "gx-hint" }, [rp.tags.indexOf(rf.tag) < 0 ? "Excellent! This tag will be created from the target when you publish this release." : "Existing tag. Publishing uses this tag."]) : null, h("input", { type: "text", id: "gh-rtt", cls: "gx-in gx-w gx-rtit", placeholder: "Release title", value: rf.title, oninput: function (e) { rf.title = e.target.value; } }), h("div", { cls: "gx-wp" }, [h("span", { cls: "on", text: "Write" }), h("span", { text: "Preview" })]), h("div", { cls: "gx-tool" }, [h("span", { text: "H  B  I   ☰  ‹›  🔗   ⁝  ①  ☑   @  ↗  ↩" }), h("span", { style: "flex:1" }), h("span", { cls: "gx-btn gx-xs" }, ["Previous tag: ", h("b", { text: "auto" }), " ▾"]), h("span", { cls: "gx-btn gx-xs", text: "Generate release notes" })]), h("textarea", { id: "gh-rbd", cls: "gx-in gx-w gx-ta gx-rbd", placeholder: "Describe this release", oninput: function (e) { rf.body = e.target.value; } }), h("label", { cls: "gx-rad" }, [h("input", { type: "checkbox", checked: "checked" }), " Set as the latest release"]), h("div", { cls: "gx-act" }, [h("button", { type: "button", cls: "gx-green gx-sm2", text: "Publish release", onclick: pub }), h("button", { type: "button", cls: "gx-btn", text: "Save draft" })])]);
  }
  var rows = rp.releases.map(function (r) { return h("div", { cls: "gx-trow" }, [h("div", { style: "flex:1" }, [h("b", { text: r.title }), h("span", { cls: "gx-badge2", text: r === rp.releases[0] ? "Latest" : "" }), h("div", { cls: "gx-mut gx-sm", text: "🏷 " + r.tag + " · " + (r.body || "No description provided.") })])]); });
  rows.forEach(function (row, i) { row.appendChild(h("button", { type: "button", cls: "gx-btn", text: "Edit", onclick: function () { ghGo(base + "/releases/edit/" + rp.releases[i].tag); } })); row.appendChild(h("button", { type: "button", cls: "gx-trash", title: "Delete release", text: "🗑", onclick: function () { rp.releases.splice(i, 1); save(); render(); } })); });
  return h("div", { cls: "gx-quick" }, [h("div", { cls: "gx-ph" }, [h("h2", { text: "Releases" }), h("button", { type: "button", cls: "gx-green gx-sm2", text: "Draft a new release", onclick: function () { ghGo(base + "/releases/new"); } })]), h("div", { cls: "gx-tbox" }, rows.length ? rows : [h("div", { cls: "gx-blank" }, [h("h3", { text: "There aren’t any releases here" }), h("p", { cls: "gx-mut", text: "Releases are powered by tags. " + (rp.tags.length ? "มี " + rp.tags.length + " tag แล้ว (ดูที่ Tags) ยังไม่มี release" : "") })])])]);
}
function wbGhPulls(user, name, kind) {
  var title = kind === "issues" ? "Welcome to issues!" : "Welcome to pull requests!", txt = kind === "issues" ? "Issues are used to track todos, bugs, feature requests, and more. As issues are created, they’ll appear here in a searchable and filterable list." : "Pull requests help you collaborate on code with other people. As pull requests are created, they’ll appear here in a searchable and filterable list.";
  return h("div", { cls: "gx-quick" }, [h("div", { cls: "gx-ph" }, [h("h2", { text: kind === "issues" ? "Issues" : "Pull requests" }), h("span", { cls: "gx-btn gx-btn-o", text: kind === "issues" ? "New issue" : "New pull request" })]), h("div", { cls: "gx-tbox" }, [h("div", { cls: "gx-blank" }, [h("h3", { text: title }), h("p", { cls: "gx-mut", text: txt }), kind === "issues" ? null : h("p", { cls: "gx-mut gx-sm", text: "lab นี้มีแค่ branch main: New pull request จึงขึ้น “There isn’t anything to compare. main is up to date with all commits from main.” (การสร้าง PR จริงจะทำในเคส Terraform ผ่าน pipeline)" })].filter(Boolean))])]);
}
