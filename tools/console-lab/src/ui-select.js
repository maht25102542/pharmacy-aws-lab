// ---- dropdown สวย: แทน <select> ด้วยปุ่ม + รายการลอย (select จริงยังอยู่ใน DOM แบบซ่อน ให้ handler เดิมและเทสต์ทำงานเหมือนเดิม)
var CSEL = { open: null };
function cselClose() { if (CSEL && CSEL.open) { CSEL.open.list.remove(); CSEL.open.btn.setAttribute("aria-expanded", "false"); CSEL.open = null; } }
function cselSync(sel, btn) {
  var o = sel.options[sel.selectedIndex]; btn.textContent = ""; btn.appendChild(document.createTextNode(o ? o.textContent : ""));
  btn.classList.toggle("ph", !o || o.value === "" || /^—/.test(o.textContent)); btn.disabled = sel.disabled;
}
function cselOpen(sel, btn) {
  cselClose();
  var list = document.createElement("div"), act = sel.selectedIndex, opts = [].slice.call(sel.options), items = [];
  list.className = "csel-list"; list.setAttribute("role", "listbox");
  function mark() { items.forEach(function (it, i) { it.classList.toggle("act", i === act); if (i === act) it.scrollIntoView({ block: "nearest" }); }); }
  function choose(i) { var o = opts[i]; if (!o || o.disabled) return; cselClose(); if (sel.selectedIndex !== i) { sel.selectedIndex = i; cselSync(sel, btn); sel.dispatchEvent(new Event("change", { bubbles: true })); } btn.focus(); }
  opts.forEach(function (o, i) {
    var it = document.createElement("div"); it.className = "csel-opt" + (i === sel.selectedIndex ? " sel" : "") + (o.disabled ? " dis" : "") + (/^—/.test(o.textContent) ? " ph" : ""); it.setAttribute("role", "option"); it.setAttribute("aria-selected", String(i === sel.selectedIndex));
    var t = document.createElement("span"); t.textContent = o.textContent; it.appendChild(t);
    if (i === sel.selectedIndex) { var ck = document.createElement("span"); ck.className = "ck"; ck.textContent = "✓"; it.appendChild(ck); }
    it.addEventListener("mousedown", function (e) { e.preventDefault(); choose(i); }); it.addEventListener("mousemove", function () { act = i; mark(); });
    items.push(it); list.appendChild(it);
  });
  document.body.appendChild(list);
  var r = btn.getBoundingClientRect(), vh = window.innerHeight, below = vh - r.bottom - 12, above = r.top - 12, h = Math.min(list.scrollHeight, 340), up = below < Math.min(h, 200) && above > below;
  list.style.minWidth = r.width + "px"; list.style.maxWidth = Math.max(r.width, Math.min(520, window.innerWidth - 24)) + "px"; list.style.left = Math.max(8, Math.min(r.left, window.innerWidth - list.offsetWidth - 8)) + "px";
  list.style.maxHeight = Math.max(120, Math.min(340, up ? above : below)) + "px"; list.style[up ? "bottom" : "top"] = (up ? vh - r.top + 4 : r.bottom + 4) + "px";
  btn.setAttribute("aria-expanded", "true"); CSEL.open = { list: list, btn: btn, sel: sel, move: function (d) { act = Math.max(0, Math.min(opts.length - 1, act + d)); while (opts[act] && opts[act].disabled && act > 0 && act < opts.length - 1) act += d; mark(); }, to: function (i) { act = i; mark(); }, pick: function () { choose(act); }, find: function (ch) { for (var k = 1; k <= opts.length; k++) { var j = (act + k) % opts.length; if (opts[j].textContent.trim().charAt(0).toLowerCase() === ch) { act = j; mark(); return; } } } };
  mark();
}
function cselKey(e) {
  var o = CSEL.open, btn = e.currentTarget, sel = btn.__sel;
  if (!o) { if (/^(ArrowDown|ArrowUp|Enter| )$/.test(e.key)) { e.preventDefault(); cselOpen(sel, btn); } return; }
  if (e.key === "Escape") { e.preventDefault(); cselClose(); } else if (e.key === "ArrowDown") { e.preventDefault(); o.move(1); } else if (e.key === "ArrowUp") { e.preventDefault(); o.move(-1); } else if (e.key === "Home") { e.preventDefault(); o.to(0); } else if (e.key === "End") { e.preventDefault(); o.to(sel.options.length - 1); } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.pick(); } else if (e.key === "Tab") cselClose(); else if (e.key.length === 1) o.find(e.key.toLowerCase());
}
function enhanceSelects() {
  cselClose();
  [].forEach.call(document.querySelectorAll("select"), function (sel) {
    if (sel.__cs) { cselSync(sel, sel.__cs); return; }
    if (sel.multiple || sel.closest(".termrow") || sel.hasAttribute("data-native") || !sel.parentNode) return;
    var p = sel.parentNode, fill = sel.offsetWidth > 0 && sel.offsetWidth >= p.clientWidth - 4, pcs = window.getComputedStyle(p), wrap = document.createElement("span"), btn = document.createElement("button");
    wrap.className = "csel" + (fill ? " fill" : ""); if (fill && /flex/.test(pcs.display)) wrap.style.flex = "1";
    p.insertBefore(wrap, sel); wrap.appendChild(sel);
    btn.type = "button"; btn.className = "csel-btn"; btn.setAttribute("aria-haspopup", "listbox"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", sel.getAttribute("aria-label") || (sel.id && document.querySelector('label[for="' + sel.id + '"]') ? document.querySelector('label[for="' + sel.id + '"]').textContent : "เลือก"));
    btn.__sel = sel; sel.__cs = btn; sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true");
    btn.addEventListener("click", function () { if (CSEL.open && CSEL.open.btn === btn) cselClose(); else cselOpen(sel, btn); }); btn.addEventListener("keydown", cselKey);
    wrap.appendChild(btn); cselSync(sel, btn);
  });
}
document.addEventListener("mousedown", function (e) { if (CSEL.open && !CSEL.open.list.contains(e.target) && e.target !== CSEL.open.btn) cselClose(); });
window.addEventListener("resize", cselClose);
window.addEventListener("scroll", function (e) { if (CSEL.open && !CSEL.open.list.contains(e.target)) cselClose(); }, true);
enhanceSelects(); // render() รอบแรกรันก่อนไฟล์นี้ถูกโหลด จึงเรียกซ้ำตรงนี้ให้ select ในแถบบนสวยตั้งแต่เปิดหน้า
// ลากคลุมข้อความในหัวข้อพับได้เพื่อ copy: ถ้ามีข้อความถูกเลือกอยู่ ไม่ให้คลิกนั้นสลับเปิด/ปิด
document.addEventListener("click", function (e) { var sm = e.target.closest && e.target.closest(".main details > summary"); if (sm && String(window.getSelection()).length) e.preventDefault(); }, true);
