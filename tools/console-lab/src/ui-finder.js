// Finder (macOS) สำหรับหน้าต่างบน Desktop: Sidebar Favorites, toolbar ย้อน/ไปข้างหน้า, มุมมองไอคอน, ดับเบิลคลิกเปิดโฟลเดอร์/ไฟล์ (ไฟล์เปิดใน Code Editor), path bar ด้านล่าง
var FD = { path: null, back: [], fwd: [], sel: null };
function fdFileIco(name) {
  var ext = (name.split(".").length > 1 ? name.split(".").pop() : "").slice(0, 4).toUpperCase(), col = /^(TF|TFVA)/.test(ext) ? "#7b42bc" : /^(YML|YAML|J2)/.test(ext) ? "#e0453a" : /^(SH)/.test(ext) ? "#3a8f3a" : /^(PY)/.test(ext) ? "#3572a5" : /^(JSON|MD)/.test(ext) ? "#e0a200" : "#8a8f98";
  return '<svg viewBox="0 0 48 60" class="fdfi"><path d="M5 3a3 3 0 0 1 3-3h24l11 11v46a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="#fff" stroke="#c8cbd2" stroke-width="1.200"/><path d="M32 0v8a3 3 0 0 0 3 3h8z" fill="#e3e5ea" stroke="#c8cbd2" stroke-width="1.200"/>' + (ext ? '<rect x="9" y="38" width="30" height="12" rx="3" fill="' + col + '"/><text x="24" y="47.200" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.500" font-weight="700" fill="#fff">' + ext + "</text>" : "") + "</svg>";
}
function fdGo(p) { if (p === FD.path) return; FD.back.push(FD.path); FD.fwd = []; FD.path = p; FD.sel = null; render(); }
function fdOpenItem(p, isDir) { if (isDir) { fdGo(p); return; } edOpen(p); DESK.wins.files.open = true; DESK.wins.files.min = false; DESK.wins.files.z = ++DESK.z; render(); }
function finderApp() {
  if (!FD.path) FD.path = REPO;
  var root = h("div", { cls: "fdr" }), side = h("div", { cls: "fdside" }), main = h("div", { cls: "fdmain" });
  var fav = [["AirDrop", null, "#2e8cff"], ["Recents", null, "#2e8cff"], ["Applications", "/Applications", "#2e8cff"], ["Desktop", HOME + "/Desktop", "#2e8cff"], ["Documents", HOME + "/Documents", "#2e8cff"], ["Downloads", HOME + "/Downloads", "#2e8cff"], ["pharmacy-aws-lab", REPO, "#2e8cff"]];
  side.appendChild(h("div", { cls: "fdsh", text: "Favorites" }));
  fav.forEach(function (f) { side.appendChild(h("button", { type: "button", cls: "fdsi" + (FD.path === f[1] ? " on" : ""), onclick: function () { if (f[1]) fdGo(f[1]); else flash("info", f[0] + " ไม่มีในเครื่องจำลอง"); } }, [h("i", { style: "background:" + f[2] }), f[0]])); });
  side.appendChild(h("div", { cls: "fdsh", text: "Locations" }));
  side.appendChild(h("button", { type: "button", cls: "fdsi", onclick: function () { fdGo("/"); } }, [h("i", { style: "background:#8a8f98" }), "Macintosh HD"]));
  var name = FD.path === "/" ? "Macintosh HD" : FD.path.split("/").pop();
  var nav = h("div", { cls: "fdtb" }, [h("button", { type: "button", cls: "fdnb", disabled: !FD.back.length, text: "‹", title: "Back", onclick: function () { FD.fwd.push(FD.path); FD.path = FD.back.pop(); FD.sel = null; render(); } }), h("button", { type: "button", cls: "fdnb", disabled: !FD.fwd.length, text: "›", title: "Forward", onclick: function () { FD.back.push(FD.path); FD.path = FD.fwd.pop(); FD.sel = null; render(); } }), h("b", { cls: "fdtt", text: name }), h("span", { cls: "fdsp" }), h("span", { cls: "fdsr", text: "🔍 Search" })]);
  var items = fsList(FD.path).filter(function (e) { return e.name.charAt(0) !== "."; }), grid = h("div", { cls: "fdgrid" });
  items.forEach(function (e) {
    var p = (FD.path === "/" ? "" : FD.path) + "/" + e.name, it = h("button", { type: "button", cls: "fdit" + (FD.sel === p ? " on" : ""), onclick: function () { FD.sel = p; render(); }, ondblclick: function () { fdOpenItem(p, e.dir); } }, [h("span", { cls: "fdic" }), h("span", { cls: "fdnm", text: e.name })]);
    it.firstChild.innerHTML = e.dir ? DESK_ICO_SVG("folder") : fdFileIco(e.name); grid.appendChild(it);
  });
  if (!items.length) grid.appendChild(h("div", { cls: "fdemp", text: "โฟลเดอร์ว่าง" }));
  var crumbs = ["/"].concat(FD.path.split("/").filter(Boolean)), pb = h("div", { cls: "fdpb" }), acc = "";
  crumbs.forEach(function (c, i) { acc = i === 0 ? "/" : (acc === "/" ? "" : acc) + "/" + c; var tgt = acc; pb.appendChild(h("span", { cls: "fdpc", text: i === 0 ? "Macintosh HD" : c, onclick: function () { fdGo(tgt); } })); if (i < crumbs.length - 1) pb.appendChild(h("span", { cls: "fdps", text: "›" })); });
  main.appendChild(nav); main.appendChild(grid); main.appendChild(h("div", { cls: "fdst", text: items.length + " items" })); main.appendChild(pb);
  root.appendChild(side); root.appendChild(main); return root;
}
