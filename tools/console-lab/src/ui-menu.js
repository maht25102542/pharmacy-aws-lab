// เมนูบาร์ macOS บน Desktop: Apple + เมนูของแอปที่อยู่หน้าสุด (กดแล้วมี dropdown ใช้งานได้จริงหลายรายการ)
function dmFront() { var t = DESK_APPS.filter(function (a) { var w = DESK.wins[a[0]]; return w.open && !w.min; }).sort(function (x, y) { return DESK.wins[y[0]].z - DESK.wins[x[0]].z; })[0]; return t ? t[0] : null; }
function dmClose() { var f = dmFront(); if (f) DESK.wins[f].open = false; }
function dmMin() { var f = dmFront(); if (f) DESK.wins[f].min = true; }
function dmZoom() { var f = dmFront(); if (f) DESK.wins[f].max = !DESK.wins[f].max; }
function dmOpen(id) { if (id === "term" && typeof ED !== "undefined") ED.termOpen = false; DESK.wins[id].open = true; DESK.wins[id].min = false; DESK.wins[id].z = ++DESK.z; }
function dmInfo(t) { return function () { flash("info", t); }; }
function dmExec(cmd) { document.execCommand(cmd); }
function dmNewTerm() { if (DESK.wins.files.open && !DESK.wins.files.min) { ED.termOpen = true; DESK.wins.term.open = false; } else dmOpen("term"); }
function dmGoDir(p) { return function () { FD.path = p; dmOpen("finder"); }; }
function dmWin() { return [["Minimize", "⌘M", dmMin], ["Zoom", "", dmZoom], "-", ["Finder", "", function () { dmOpen("finder"); }], ["Terminal", "", function () { dmOpen("term"); }], ["Code", "", function () { dmOpen("files"); }], ["Google Chrome", "", function () { dmOpen("chrome"); }], ["Safari", "", function () { dmOpen("safari"); }], ["Lab", "", function () { dmOpen("lab"); }], ["System Settings", "", function () { dmOpen("settings"); }]]; }
function dmEdit() { return [["Undo", "⌘Z", function () { dmExec("undo"); }], ["Redo", "⇧⌘Z", function () { dmExec("redo"); }], "-", ["Cut", "⌘X", function () { dmExec("cut"); }], ["Copy", "⌘C", function () { dmExec("copy"); }], ["Paste", "⌘V", null], ["Select All", "⌘A", function () { dmExec("selectAll"); }]]; }
function dmHelp(app) { return [["Search", "", null], "-", [app + " Help", "", dmInfo("Help ไม่ได้จำลอง")]]; }
function deskMenus(app) {
  var quit = function () { dmClose(); };
  if (app === "Terminal") return [["Terminal", [["About Terminal", "", dmInfo("Terminal (จำลอง) · zsh")], "-", ["Settings…", "⌘,", dmInfo("ตั้งค่าธีม Terminal ที่หน้า Laptop › Terminal")], "-", ["Quit Terminal", "⌘Q", quit]]],
    ["Shell", [["New Window", "⌘N", function () { dmOpen("term"); }], "-", ["Close Window", "⌘W", dmClose]]],
    ["Edit", [["Copy", "⌘C", function () { dmExec("copy"); }], ["Paste", "⌘V", null], ["Select All", "⌘A", function () { dmExec("selectAll"); }], "-", ["Clear to Start", "⌘K", function () { TERM.lines = []; }]]],
    ["View", [["Bigger", "⌘+", function () { termSet("size", { s: "m", m: "l", l: "xl", xl: "xl" }[termPref("size", "m")]); }], ["Smaller", "⌘-", function () { termSet("size", { xl: "l", l: "m", m: "s", s: "s" }[termPref("size", "m")]); }]]],
    ["Window", dmWin()], ["Help", dmHelp("Terminal")]];
  if (app === "Code") return [["Code", [["About Visual Studio Code", "", dmInfo("Visual Studio Code (จำลอง)")], "-", ["Settings", "⌘,", dmInfo("Settings ไม่ได้จำลอง")], "-", ["Quit Visual Studio Code", "⌘Q", quit]]],
    ["File", [["New File", "⌘N", dmInfo("New File ยังไม่ได้จำลอง")], ["Open Folder…", "⌘O", function () { ED.view = "files"; }], "-", ["Save", "⌘S", function () { edSave(ED.active); }], ["Save All", "⌥⌘S", function () { ED.tabs.forEach(edSave); }], "-", ["Close Editor", "⌘W", function () { if (ED.active) { var p = ED.active; ED.tabs.splice(ED.tabs.indexOf(p), 1); delete ED.buf[p]; ED.active = ED.tabs[ED.tabs.length - 1] || null; if (!ED.tabs.length) ED.closedAll = true; } }], ["Close Window", "⇧⌘W", dmClose]]],
    ["Edit", dmEdit().concat([["-"], ["Find in Files", "⇧⌘F", function () { ED.view = "search"; }]])],
    ["Selection", [["Select All", "⌘A", function () { dmExec("selectAll"); }]]],
    ["View", [["Explorer", "⇧⌘E", function () { ED.view = "files"; }], ["Search", "⇧⌘F", function () { ED.view = "search"; }], "-", ["Terminal", "⌃`", function () { edToggleTerm(); }]]],
    ["Go", [["Go to File…", "⌘P", dmInfo("Go to File ยังไม่ได้จำลอง — ใช้ Search ใน sidebar แทน")]]],
    ["Run", [["Start Debugging", "F5", dmInfo("Run/Debug ไม่ได้จำลอง")]]],
    ["Terminal", [["New Terminal", "⌃⇧`", dmNewTerm], ["Toggle Terminal", "⌃`", function () { edToggleTerm(); }], "-", ["Kill Terminal", "", function () { ED.termOpen = false; }]]],
    ["Window", dmWin()], ["Help", dmHelp("Code")]];
  if (app === "Google Chrome" || app === "Safari") { var ch = app === "Google Chrome"; return [[app, [["About " + app, "", dmInfo(app + " (จำลอง)")], "-", ["Settings…", "⌘,", dmInfo("Settings ไม่ได้จำลอง")], "-", ["Quit " + app, "⌘Q", quit]]],
    ["File", [["New Window", "⌘N", function () { dmOpen(ch ? "chrome" : "safari"); }], ["New Tab", "⌘T", dmInfo("ตัวจำลองมีแท็บเดียวต่อหน้าต่าง")], "-", ["Close Window", "⇧⌘W", dmClose]]],
    ["Edit", dmEdit()],
    ["View", [["Reload Page", "⌘R", function () { if (W.addr) wbGo(W.addr); }]]],
    [ch ? "History" : "History", [["Back", "⌘[", function () { if (whCan(-1)) whGo(-1); }], ["Forward", "⌘]", function () { if (whCan(1)) whGo(1); }]]],
    ["Bookmarks", [["Add Bookmark…", "⌘D", dmInfo("Bookmark ไม่ได้จำลอง")]]],
    ["Window", dmWin()], ["Help", dmHelp(app)]]; }
  if (app === "System Settings") return [["System Settings", [["About System Settings", "", dmInfo("ตัวควบคุมของตัวจำลอง")], "-", ["Quit System Settings", "⌘Q", quit]]], ["Edit", dmEdit()], ["Window", dmWin()], ["Help", dmHelp("System Settings")]];
  if (app === "Lab") return [["Lab", [["About Lab", "", dmInfo("Lab (จำลอง) — ศูนย์รวม use case / Terraform / Ansible / Jenkins")], "-", ["Quit Lab", "⌘Q", quit]]],
    ["File", [["Close Window", "⌘W", dmClose]]], ["Edit", dmEdit()], ["Window", dmWin()], ["Help", dmHelp("Lab")]];
  return [["Finder", [["About Finder", "", dmInfo("Finder (จำลอง)")], "-", ["Settings…", "⌘,", dmInfo("Settings ไม่ได้จำลอง")], "-", ["Empty Trash…", "⇧⌘⌫", dmInfo("ถังขยะว่างเปล่า")]]],
    ["File", [["New Finder Window", "⌘N", function () { FD.path = REPO; dmOpen("finder"); }], "-", ["Close Window", "⌘W", dmClose]]],
    ["Edit", dmEdit()],
    ["View", [["as Icons", "⌘1", null], ["as List", "⌘2", dmInfo("มุมมองรายการไม่ได้จำลอง")]]],
    ["Go", [["Back", "⌘[", function () { if (FD.back && FD.back.length) { FD.fwd.push(FD.path); FD.path = FD.back.pop(); } }], "-", ["Applications", "⇧⌘A", dmGoDir("/Applications")], ["Desktop", "⇧⌘D", dmGoDir(HOME + "/Desktop")], ["Documents", "⇧⌘O", dmGoDir(HOME + "/Documents")], ["Downloads", "⌥⌘L", dmGoDir(HOME + "/Downloads")], ["Home", "⇧⌘H", dmGoDir(HOME)], ["pharmacy-aws-lab", "", dmGoDir(REPO)]]],
    ["Window", dmWin()], ["Help", dmHelp("Finder")]];
}
function deskAppleMenu() { return [["About This Mac", "", dmInfo("Mac จำลอง · macOS (Big Sur style)")], "-", ["System Settings…", "", function () { dmOpen("settings"); }], ["App Store…", "", dmInfo("ไม่ได้จำลอง")], "-", ["Recent Items", "", null], "-", ["Force Quit…", "⌥⌘⎋", function () { dmClose(); }], "-", ["Sleep", "", dmInfo("Mac จำลอง ไม่เข้าสู่โหมดพัก")], ["Restart…", "", dmInfo("Mac จำลอง ไม่รีสตาร์ท")], ["Shut Down…", "", dmInfo("Mac จำลอง ไม่ปิดเครื่อง")], "-", ["Lock Screen", "⌃⌘Q", dmInfo("ล็อกหน้าจอไม่ได้จำลอง")], ["Log Out swd…", "⇧⌘Q", dmInfo("Log out ไม่ได้จำลอง")]]; }
function dmMenu(key, label, items, bold, icon) {
  var wrap = h("span", { cls: "dmi", "data-k": key }), btn = h("button", { type: "button", cls: "dmb" + (bold ? " b" : "") + (DESK.menu === key ? " on" : ""), onclick: function () { dmShow(DESK.menu === key ? null : key); }, onmouseenter: function () { if (DESK.menu != null && DESK.menu !== key) dmShow(key); } }, [icon || label]);
  var dd = h("div", { cls: "dmd", style: DESK.menu === key ? "" : "display:none" }, items.map(function (it) {
    if (it === "-" || it[0] === "-") return h("div", { cls: "dmsep" });
    return h("button", { type: "button", cls: "dmit" + (it[2] ? "" : " dis"), onclick: function () { if (!it[2]) return; DESK.menu = null; try { it[2](); } catch (e) { flash("bad", String(e && e.message || e)); } render(); } }, [h("span", { text: it[0] }), h("em", { text: it[1] || "" })]);
  }));
  wrap.appendChild(btn); wrap.appendChild(dd); return wrap;
}
function dmShow(key) { DESK.menu = key; [].forEach.call(document.querySelectorAll(".dmi"), function (m) { var on = m.getAttribute("data-k") === key; m.querySelector(".dmd").style.display = on ? "" : "none"; m.querySelector(".dmb").classList.toggle("on", on); }); }
document.addEventListener("pointerdown", function (e) { if (DESK.menu != null && !(e.target.closest && e.target.closest(".dmi"))) dmShow(null); }, true);
