// Finder (macOS) สำหรับหน้าต่างบน Desktop: Sidebar Favorites, toolbar ย้อน/ไปข้างหน้า, มุมมองไอคอน, ดับเบิลคลิกเปิดโฟลเดอร์/ไฟล์ (ไฟล์เปิดใน Code Editor), path bar ด้านล่าง
var FD = { path: null, back: [], fwd: [], sel: null };
function fdFileIco(name) {
  var ext = (name.split(".").length > 1 ? name.split(".").pop() : "").slice(0, 4).toUpperCase(), col = /^(TF|TFVA)/.test(ext) ? "#7b42bc" : /^(YML|YAML|J2)/.test(ext) ? "#e0453a" : /^(SH)/.test(ext) ? "#3a8f3a" : /^(PY)/.test(ext) ? "#3572a5" : /^(JSON|MD)/.test(ext) ? "#e0a200" : "#8a8f98";
  return '<svg viewBox="0 0 48 60" class="fdfi"><path d="M5 3a3 3 0 0 1 3-3h24l11 11v46a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="#fff" stroke="#c8cbd2" stroke-width="1.200"/><path d="M32 0v8a3 3 0 0 0 3 3h8z" fill="#e3e5ea" stroke="#c8cbd2" stroke-width="1.200"/>' + (ext ? '<rect x="9" y="38" width="30" height="12" rx="3" fill="' + col + '"/><text x="24" y="47.200" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.500" font-weight="700" fill="#fff">' + ext + "</text>" : "") + "</svg>";
}
var FD_SI = {
  airdrop: '<circle cx="8" cy="9.500" r="1.200" fill="currentColor"/><path d="M5 12a4.300 4.300 0 0 1 0-6.100M11 12a4.300 4.300 0 0 0 0-6.100M3 14a7 7 0 0 1 0-10M13 14a7 7 0 0 0 0-10" fill="none" stroke="currentColor" stroke-width="1.300" stroke-linecap="round"/>',
  recents: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.300"/><path d="M8 4.500V8l2.300 1.500" fill="none" stroke="currentColor" stroke-width="1.300" stroke-linecap="round"/>',
  apps: '<path d="M8 1.800l1.500 3.700 3.800.4-2.900 2.600.9 3.800L8 10.300l-3.300 2 .9-3.800L2.700 5.900l3.800-.4z" fill="none" stroke="currentColor" stroke-width="1.200" stroke-linejoin="round"/>',
  desktop: '<rect x="1.800" y="2.500" width="12.400" height="8" rx="1.300" fill="none" stroke="currentColor" stroke-width="1.300"/><path d="M5.500 13.500h5M8 10.500v3" stroke="currentColor" stroke-width="1.300" stroke-linecap="round"/>',
  doc: '<path d="M3.800 1.800h5.200l3.200 3.200v9.200H3.800z" fill="none" stroke="currentColor" stroke-width="1.300" stroke-linejoin="round"/><path d="M9 1.800V5h3.200" fill="none" stroke="currentColor" stroke-width="1.300"/>',
  down: '<circle cx="8" cy="8" r="6.200" fill="none" stroke="currentColor" stroke-width="1.300"/><path d="M8 4.800v5.200M5.800 8.200L8 10.400l2.200-2.200" fill="none" stroke="currentColor" stroke-width="1.300" stroke-linecap="round" stroke-linejoin="round"/>',
  folder: '<path d="M1.800 4.200a1.200 1.200 0 0 1 1.200-1.200h3l1.300 1.500H13a1.200 1.200 0 0 1 1.200 1.200v6.300a1.200 1.200 0 0 1-1.200 1.200H3a1.200 1.200 0 0 1-1.200-1.200z" fill="none" stroke="currentColor" stroke-width="1.300" stroke-linejoin="round"/>',
  hd: '<rect x="1.800" y="5" width="12.400" height="6" rx="1.500" fill="none" stroke="currentColor" stroke-width="1.300"/><circle cx="11.500" cy="8" r=".8" fill="currentColor"/>',
  search: '<circle cx="6.800" cy="6.800" r="4.400" fill="none" stroke="currentColor" stroke-width="1.400"/><path d="M10.200 10.200L14 14" stroke="currentColor" stroke-width="1.400" stroke-linecap="round"/>',
  back: '<path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round"/>',
  fwd: '<path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round"/>',
  grid: '<rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor"/><rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor"/><rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor"/><rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor"/>'
};
function fdSym(k) { return '<svg viewBox="0 0 16 16" class="fdsy" width="16" height="16">' + FD_SI[k] + "</svg>"; }
function fdGo(p) { if (p === FD.path) return; FD.back.push(FD.path); FD.fwd = []; FD.path = p; FD.sel = null; render(); }
function fdOpenItem(p, isDir) { if (isDir) { fdGo(p); return; } edOpen(p); DESK.wins.files.open = true; DESK.wins.files.min = false; DESK.wins.files.z = ++DESK.z; render(); }
function finderApp() {
  if (!FD.path) FD.path = REPO;
  var root = h("div", { cls: "fdr" }), side = h("div", { cls: "fdside" }), main = h("div", { cls: "fdmain" });
  var fav = [["AirDrop", null, "airdrop"], ["Recents", null, "recents"], ["Applications", "/Applications", "apps"], ["Desktop", HOME + "/Desktop", "desktop"], ["Documents", HOME + "/Documents", "doc"], ["Downloads", HOME + "/Downloads", "down"], ["pharmacy-aws-lab", REPO, "folder"]];
  side.appendChild(h("div", { cls: "fdsh", text: "Favorites" }));
  fav.forEach(function (f) { side.appendChild(h("button", { type: "button", cls: "fdsi" + (FD.path === f[1] ? " on" : ""), onclick: function () { if (f[1]) fdGo(f[1]); else flash("info", f[0] + " ไม่มีในเครื่องจำลอง"); } }, [h("span", { cls: "fdsy2", html: fdSym(f[2]) }), f[0]])); });
  side.appendChild(h("div", { cls: "fdsh", text: "Locations" }));
  side.appendChild(h("button", { type: "button", cls: "fdsi", onclick: function () { fdGo("/"); } }, [h("span", { cls: "fdsy2 g", html: fdSym("hd") }), "Macintosh HD"]));
  var name = FD.path === "/" ? "Macintosh HD" : FD.path.split("/").pop();
  var nav = h("div", { cls: "fdtb" }, [h("span", { cls: "fdnbg" }, [h("button", { type: "button", cls: "fdnb", disabled: !FD.back.length, html: fdSym("back"), title: "Back", onclick: function () { FD.fwd.push(FD.path); FD.path = FD.back.pop(); FD.sel = null; render(); } }), h("button", { type: "button", cls: "fdnb", disabled: !FD.fwd.length, html: fdSym("fwd"), title: "Forward", onclick: function () { FD.back.push(FD.path); FD.path = FD.fwd.pop(); FD.sel = null; render(); } })]), h("b", { cls: "fdtt", text: name }), h("span", { cls: "fdsp" }), h("span", { cls: "fdvw", html: fdSym("grid") }), h("span", { cls: "fdsr", html: fdSym("search") + " Search" })]);
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
