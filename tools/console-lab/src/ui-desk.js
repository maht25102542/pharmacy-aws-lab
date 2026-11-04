// Laptop › Desktop: เดสก์ท็อป Ubuntu จำลอง — หน้าต่างลาก/ย่อ/ขยาย/ปรับขนาดได้ ใช้ Terminal กับ Files & editor เดิมเป็นแอปในหน้าต่าง
var DESK = { z: 11, wins: { term: { open: true, min: false, max: false, x: 90, y: 50, w: 0, h: 0, z: 11 }, files: { open: false, min: false, max: false, x: 120, y: 80, w: 0, h: 0, z: 10 } } };
var DESK_APPS = [["term", "Terminal", "⌨️"], ["files", "Code Editor", "📝"]];
function deskTitle(id) { if (id === "files") return "Code Editor — " + (ED.active ? ED.active.replace(REPO + "/", "").replace(HOME, "~") : "pharmacy-aws-lab"); return (typeof termPrompt === "function" ? termPrompt() : "ubuntu@laptop:~$").replace(/[$#] ?$/, "").replace(/\s+$/, ""); }
function deskBody(id) {
  if (id === "files") return editorApp();
  var el = PAGES[id](); [].slice.call(el.children).forEach(function (c) { if (c.matches && c.matches(".crumb,h1,.ic,.card")) el.removeChild(c); }); return el;
}
function deskOpen(id) { var w = DESK.wins[id]; w.open = true; w.min = false; w.z = ++DESK.z; render(); }
function deskDock(id) { var w = DESK.wins[id]; if (w.open && !w.min && w.z === DESK.z) { w.min = true; } else { w.open = true; w.min = false; w.z = ++DESK.z; } render(); }
function deskClock() { var d = new Date(), D = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."], M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]; return D[d.getDay()] + " " + d.getDate() + " " + M[d.getMonth()] + "  " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
setInterval(function () { var c = document.getElementById("deskclock"); if (c) c.textContent = deskClock(); }, 15000);
PAGES["desk"] = function () {
  var desk = h("div", { cls: "desk", id: "desk" }), top = h("div", { cls: "dtop" }, [h("span", { cls: "dact", text: "Activities", onclick: function () { deskOpen("term"); } }), h("span", { id: "deskclock", cls: "dclk", text: deskClock() }), h("span", { cls: "dsys", title: "เครือข่าย · เสียง · แบตเตอรี่ (จำลอง)" }, ["📶", "🔊", "🔋 87%", h("b", { text: "ubuntu ▾" })])]);
  var dock = h("div", { cls: "ddock" }, DESK_APPS.map(function (a) { var w = DESK.wins[a[0]]; return h("button", { type: "button", cls: "dapp" + (w.open ? " run" : ""), title: a[1], onclick: function () { deskDock(a[0]); } }, [h("span", { text: a[2] })]); }).concat([h("button", { type: "button", cls: "dapp", title: "Browser (เปิดแท็บ Browser)", onclick: function () { go("browser", {}, "Browser"); } }, [h("span", { text: "🌐" })]), h("span", { cls: "dsp" }), h("button", { type: "button", cls: "dapp", title: "Show Applications (จำลอง)", onclick: function () { flash("info", "แอปที่มีในเครื่องนี้: Terminal, Files & editor, Browser"); } }, [h("span", { text: "⋮⋮⋮" })])]));
  var ico = h("button", { type: "button", cls: "dicon", ondblclick: function () { deskOpen("files"); }, onclick: function () { deskOpen("files"); }, title: "เปิด pharmacy-aws-lab" }, [h("span", { text: "📁" }), "pharmacy-aws-lab"]);
  var wp = h("div", { cls: "dwp" }, [ico]);
  desk.appendChild(top); desk.appendChild(dock); desk.appendChild(wp);
  var dw0 = Math.max(520, Math.min(1000, window.innerWidth - 252 - 70 - 100)), dh0 = Math.max(380, window.innerHeight - 190 - 30 - 70);
  DESK_APPS.forEach(function (a) {
    var id = a[0], w = DESK.wins[id]; if (!w.open || w.min) return;
    if (!w.w) { w.w = dw0; w.h = dh0; }
    var win = h("div", { cls: "dw" + (w.max ? " max" : ""), "data-w": id, style: w.max ? "z-index:" + w.z : "left:" + w.x + "px;top:" + w.y + "px;width:" + w.w + "px;height:" + w.h + "px;z-index:" + w.z });
    var tb = h("div", { cls: "dwt" }, [h("span", { cls: "dwtt", text: a[2] + " " + deskTitle(id) }), h("span", { cls: "dwb3" }, [h("button", { type: "button", title: "ย่อ", text: "–", onclick: function (e) { e.stopPropagation(); w.min = true; render(); } }), h("button", { type: "button", title: "ขยาย", text: w.max ? "❐" : "□", onclick: function (e) { e.stopPropagation(); w.max = !w.max; render(); } }), h("button", { type: "button", cls: "x", title: "ปิด", text: "×", onclick: function (e) { e.stopPropagation(); w.open = false; render(); } })])]);
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
