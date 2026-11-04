// Laptop › Desktop: เดสก์ท็อป macOS จำลอง — หน้าต่างลาก/ย่อ/ขยาย/ปรับขนาดได้ ใช้ Terminal กับ Files & editor เดิมเป็นแอปในหน้าต่าง
var DESK = { z: 11, wins: { term: { open: true, min: false, max: false, x: 90, y: 44, w: 0, h: 0, z: 11 }, files: { open: false, min: false, max: false, x: 120, y: 70, w: 0, h: 0, z: 10 } } };
var DESK_APPS = [["term", "Terminal", ">_", "mi-term"], ["files", "Code Editor", "</>", "mi-code"]];
function deskTitle(id) { if (id === "files") return "Code Editor — " + (ED.active ? ED.active.replace(REPO + "/", "").replace(HOME, "~") : "pharmacy-aws-lab"); return "swd — zsh — 96×28"; }
function deskBody(id) {
  if (id === "files") return editorApp();
  var el = PAGES[id](); [].slice.call(el.children).forEach(function (c) { if (c.matches && c.matches(".crumb,h1,.ic,.card")) el.removeChild(c); }); return el;
}
function deskOpen(id) { var w = DESK.wins[id]; w.open = true; w.min = false; w.z = ++DESK.z; render(); }
function deskDock(id) { var w = DESK.wins[id]; if (w.open && !w.min && w.z === DESK.z) { w.min = true; } else { w.open = true; w.min = false; w.z = ++DESK.z; } render(); }
function deskClock() { var d = new Date(), D = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."], M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]; return D[d.getDay()] + " " + d.getDate() + " " + M[d.getMonth()] + "  " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
setInterval(function () { var c = document.getElementById("deskclock"); if (c) c.textContent = deskClock(); }, 15000);
PAGES["desk"] = function () {
  var desk = h("div", { cls: "desk", id: "desk" }), tops = DESK_APPS.filter(function (a) { var w = DESK.wins[a[0]]; return w.open && !w.min; }).sort(function (x, y) { return DESK.wins[y[0]].z - DESK.wins[x[0]].z; })[0], appn = tops ? tops[1] : "Finder";
  var apple = document.createElementNS("http://www.w3.org/2000/svg", "svg"); apple.setAttribute("viewBox", "0 0 24 24"); apple.setAttribute("class", "dapl"); apple.innerHTML = '<path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.800 2.300-1.600 2.800-.4 6.900 1.200 9.200.8 1.100 1.700 2.400 2.900 2.300 1.200 0 1.600-.7 3-.7s1.800.7 3 .7c1.300 0 2.100-1.100 2.800-2.200.9-1.300 1.300-2.500 1.300-2.600-.1 0-2.500-1-2.500-3.800zM14.200 5.900c.6-.8 1.100-1.800.9-2.900-.9 0-2 .6-2.700 1.400-.6.700-1.100 1.800-1 2.800 1 .1 2.100-.5 2.800-1.300z"/>';
  var top = h("div", { cls: "dtop" }, [h("div", { cls: "dml" }, [apple, h("b", { text: appn })].concat((appn === "Finder" ? ["File", "Edit", "View", "Go", "Window", "Help"] : appn === "Terminal" ? ["Shell", "Edit", "View", "Window", "Help"] : ["File", "Edit", "Selection", "View", "Go", "Run", "Window", "Help"]).map(function (m) { return h("span", { text: m }); }))), h("div", { cls: "dmr", title: "สถานะเครื่อง (จำลอง)" }, ["🔋 87%", "📶", "🔍", h("span", { id: "deskclock", text: deskClock() })])]);
  var dock = h("div", { cls: "ddock" }, [h("button", { type: "button", cls: "dapp mi-find", title: "Finder → โฟลเดอร์ pharmacy-aws-lab", onclick: function () { deskOpen("files"); } }, [h("span", { text: "🗂️" })])].concat(DESK_APPS.map(function (a) { var w = DESK.wins[a[0]]; return h("button", { type: "button", cls: "dapp " + a[3] + (w.open ? " run" : ""), title: a[1], onclick: function () { deskDock(a[0]); } }, [h("span", { text: a[2] })]); })).concat([h("button", { type: "button", cls: "dapp mi-web", title: "Safari → แท็บ Browser", onclick: function () { go("browser", {}, "Browser"); } }, [h("span", { text: "🧭" })]), h("span", { cls: "dsep" }), h("button", { type: "button", cls: "dapp", title: "Trash (จำลอง)", style: "background:rgba(255,255,255,.3)", onclick: function () { flash("info", "ถังขยะว่างเปล่า"); } }, [h("span", { text: "🗑️" })])]));
  var ico = h("button", { type: "button", cls: "dicon", ondblclick: function () { deskOpen("files"); }, onclick: function () { deskOpen("files"); }, title: "เปิด pharmacy-aws-lab" }, [h("span", { text: "📁" }), "pharmacy-aws-lab"]);
  var wp = h("div", { cls: "dwp" }, [ico]);
  desk.appendChild(top); desk.appendChild(dock); desk.appendChild(wp);
  var dw0 = Math.max(520, Math.min(1000, window.innerWidth - 252 - 70 - 170)), dh0 = Math.max(340, window.innerHeight - 190 - 40 - 110);
  DESK_APPS.forEach(function (a) {
    var id = a[0], w = DESK.wins[id]; if (!w.open || w.min) return;
    if (!w.w) { w.w = dw0; w.h = dh0; }
    var win = h("div", { cls: "dw" + (w.max ? " max" : ""), "data-w": id, style: w.max ? "z-index:" + w.z : "left:" + w.x + "px;top:" + w.y + "px;width:" + w.w + "px;height:" + w.h + "px;z-index:" + w.z });
    var tb = h("div", { cls: "dwt" }, [h("span", { cls: "dwb3" }, [h("button", { type: "button", cls: "x", title: "ปิด", text: "×", onclick: function (e) { e.stopPropagation(); w.open = false; render(); } }), h("button", { type: "button", cls: "m", title: "ย่อ", text: "−", onclick: function (e) { e.stopPropagation(); w.min = true; render(); } }), h("button", { type: "button", cls: "z", title: "ขยาย", text: "+", onclick: function (e) { e.stopPropagation(); w.max = !w.max; render(); } })]), h("span", { cls: "dwtt", text: deskTitle(id) })]);
    tb.addEventListener("dblclick", function () { w.max = !w.max; render(); });
    tb.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button") || w.max) return; var sx = e.clientX, sy = e.clientY, ox = w.x, oy = w.y, bx = desk.clientWidth, by = desk.clientHeight; tb.setPointerCapture(e.pointerId); w.z = ++DESK.z; win.style.zIndex = w.z;
      function mv(ev) { w.x = Math.max(-w.w + 90, Math.min(bx - 90, ox + ev.clientX - sx)); w.y = Math.max(32, Math.min(by - 40, oy + ev.clientY - sy)); win.style.left = w.x + "px"; win.style.top = w.y + "px"; }
      function up() { tb.removeEventListener("pointermove", mv); tb.removeEventListener("pointerup", up); }
      tb.addEventListener("pointermove", mv); tb.addEventListener("pointerup", up);
    });
    win.addEventListener("pointerdown", function () { if (w.z !== DESK.z) { w.z = ++DESK.z; win.style.zIndex = w.z; } });
    win.appendChild(tb); win.appendChild(h("div", { cls: "dwbody" }, [deskBody(id)])); desk.appendChild(win);
    win.addEventListener("mouseup", function () { if (!w.max && win.offsetWidth > 200) { w.w = win.offsetWidth; w.h = win.offsetHeight; } });
  });
  setTimeout(function () { var i = document.getElementById("terminp"); if (i) i.focus(); }, 30);
  return h("div", {}, [desk]);
};
NAV.Laptop[0][1].unshift(["desk", "Desktop"]); NAVICO.desk = "🖥️"; NAVHOME.Laptop = "desk";
