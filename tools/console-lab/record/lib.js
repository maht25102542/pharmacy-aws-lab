// CDP driver จิ๋ว (ไม่ใช้ dependency): ขับ Chrome headless, ถ่ายเฟรม, ซ้อน cursor + caption
const { spawn } = require("child_process"), fs = require("fs"), path = require("path");
const OUT = __dirname + "/frames", PORT = 20000 + Math.floor(Math.random() * 20000), PROF = "/tmp/claude-1000/recprof-" + process.pid;
let ws, id = 0, pending = {}, chrome, frames = [], n = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function start(url, w = 1280, h = 800) {
  fs.rmSync(OUT, { recursive: true, force: true });  fs.mkdirSync(OUT, { recursive: true });
  chrome = spawn("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=" + PORT, "--user-data-dir=" + PROF, `--window-size=${w},${h}`, "about:blank"], { stdio: "ignore" });
  let tg; for (let i = 0; i < 50 && !tg; i++) { await sleep(200); try { tg = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page"); } catch (e) {} }
  ws = new WebSocket(tg.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } };
  await send("Page.enable"); await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url }); await sleep(1500); await ev(OVERLAY);
}
function send(method, params = {}) { return new Promise((res) => { const i = ++id; pending[i] = res; ws.send(JSON.stringify({ id: i, method, params })); }); }
async function ev(expr) { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description || r.result.exceptionDetails)); return r.result && r.result.result && r.result.result.value; }
async function shot(sec = 0.8) { const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 72 }); const f = OUT + "/f" + String(++n).padStart(5, "0") + ".jpg"; fs.writeFileSync(f, Buffer.from(r.result.data, "base64")); frames.push([f, sec]); }
const OVERLAY = `(function(){ if(document.getElementById("__cur"))return; var c=document.createElement("div"); c.id="__cur"; c.style.cssText="position:fixed;z-index:99999;width:22px;height:22px;border-radius:50%;background:rgba(255,153,0,.55);border:2px solid #c45500;pointer-events:none;left:640px;top:400px;transition:none;box-shadow:0 0 0 4px rgba(255,153,0,.25)"; document.body.appendChild(c); var b=document.createElement("div"); b.id="__cap"; b.style.cssText="position:fixed;z-index:99998;left:0;right:0;bottom:0;padding:12px 20px;background:rgba(15,25,40,.92);color:#fff;pointer-events:none;font:600 18px 'IBM Plex Sans Thai',sans-serif;text-align:left;display:none;pointer-events:none"; document.body.appendChild(b); })()`;
async function cap(t) { await ev(`(function(){var b=document.getElementById("__cap"); b.style.display=${JSON.stringify(!!t)}?"block":"none"; b.textContent=${JSON.stringify(t || "")};})()`); }
// หา element: sel = css, หรือ {t:"ข้อความ", tag:"button|a|*"} (ข้อความตรง/ขึ้นต้น, ต้องมองเห็น)
const FIND = `function __find(q){ var els; if(q.label){ var ls=[].slice.call(document.querySelectorAll(".l,label,h3,h4,b,dt")).filter(function(e){var x=(e.innerText||"").trim().replace(/\\s+/g," "); return x.indexOf(q.label)===0 && e.getBoundingClientRect().width>2}); var lab=ls[q.nth||0]; if(!lab) return null; var c=lab; for(var i=0;i<4&&c;i++){ c=c.parentElement; var f=c&&[].slice.call(c.querySelectorAll(q.kind||"select,input:not([type=radio]):not([type=checkbox]),textarea")).filter(function(e){return lab.compareDocumentPosition(e)&4})[0]; if(f) return f; } return null; } if(typeof q==="string") els=[].slice.call(document.querySelectorAll(q)); else { els=[].slice.call(document.querySelectorAll(q.tag||"button,a,[role=button],li,div,span,label,option,td,th,h2,h3")); var t=q.t; els=els.filter(function(e){ var x=(e.innerText||e.textContent||"").trim().replace(/\\s+/g," "); return q.starts? x.indexOf(t)===0 : q.has? x.indexOf(t)>=0 : x===t; }); }
 els=els.filter(function(e){ var r=e.getBoundingClientRect(); return r.width>2&&r.height>2&&getComputedStyle(e).visibility!=="hidden"; }); els.sort(function(a,b){ return a.getBoundingClientRect().width*a.getBoundingClientRect().height-b.getBoundingClientRect().width*b.getBoundingClientRect().height; }); return els[q.nth||0]||null; }`;
async function where(q) { return await ev(`(function(){ ${FIND} var e=__find(${JSON.stringify(q)}); if(!e) return null; e.scrollIntoView({block:"center"}); var r=e.getBoundingClientRect(); return {x:r.left+Math.min(r.width/2,40+r.width*.3),y:r.top+r.height/2};})()`); }
async function moveTo(p) { const cur = await ev(`(function(){var c=document.getElementById("__cur");return {x:parseFloat(c.style.left)+11,y:parseFloat(c.style.top)+11}})()`); for (let i = 1; i <= 3; i++) { const x = cur.x + (p.x - cur.x) * i / 3, y = cur.y + (p.y - cur.y) * i / 3; await ev(`(function(){var c=document.getElementById("__cur");c.style.left=${x - 11}+"px";c.style.top=${y - 11}+"px"})()`); if (i < 3) await shot(0.12); } await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y }); }
async function click(q, label) { const p = await where(q); if (!p) throw new Error("ไม่พบ: " + JSON.stringify(q) + "\n" + (await dump())); await moveTo(p); await shot(0.5); await ev(`(function(){var c=document.getElementById("__cur");c.style.background="rgba(255,153,0,.95)"})()`); await send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); await sleep(250); await ev(`(function(){var c=document.getElementById("__cur");c.style.background="rgba(255,153,0,.55)"})()`); await shot(0.7); }
async function type(q, text) { const p = await where(q); if (!p) throw new Error("ไม่พบช่อง: " + JSON.stringify(q) + "\n" + (await dump())); await moveTo(p); await send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 3 }); await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 3 }); await send("Input.insertText", { text }); await sleep(150); await shot(0.8); }
// select แบบ custom ของแอป: คลิกปุ่ม .csel-btn ของ select นั้น แล้วคลิก .csel-opt ที่ข้อความขึ้นต้นตรง
async function pick(q, opt) {
  const sel = typeof q === "object" && q.label ? q : q;
  const idx = await ev(`(function(){ ${FIND} var s=__find(${JSON.stringify(sel)}); if(!s) return -1; var all=[].slice.call(document.querySelectorAll("select")); s.setAttribute("data-rec","1"); var b=s.parentElement.querySelector(".csel-btn")||s.nextElementSibling; if(!b) return -2; b.setAttribute("data-rec-btn","1"); return 1;})()`);
  if (idx < 0) throw new Error("ไม่พบ select: " + JSON.stringify(q) + " (" + idx + ")\n" + (await dump()));
  await click("[data-rec-btn='1']"); await sleep(150);
  const ok = await ev(`(function(){ var o=[].slice.call(document.querySelectorAll(".csel-opt")).filter(function(e){return e.getBoundingClientRect().width>2 && (e.innerText||"").trim().indexOf(${JSON.stringify(opt)})===0})[0]; return o?1:[].slice.call(document.querySelectorAll(".csel-opt")).map(function(e){return e.innerText.trim()}).join(" | ");})()`);
  if (ok !== 1) throw new Error("ไม่มีตัวเลือก " + opt + " ใน: " + ok);
  await shot(0.6); const op = await where({ t: opt, starts: true, tag: ".csel-opt" }); await moveTo(op); await shot(0.7);
  await ev(`(function(){ var o=[].slice.call(document.querySelectorAll(".csel-opt")).filter(function(e){return e.getBoundingClientRect().width>2 && (e.innerText||"").trim().indexOf(${JSON.stringify(opt)})===0})[0]; o.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,cancelable:true})); })()`); await sleep(200); await shot(0.8);
  await ev(`document.querySelectorAll("[data-rec],[data-rec-btn]").forEach(function(e){e.removeAttribute("data-rec");e.removeAttribute("data-rec-btn")})`);
}
async function pickBtn(btnText, optHas) {
  await click({ t: btnText, tag: "button" }); await sleep(150);
  const sel = { t: optHas, has: true, tag: ".csel-opt" }; const op = await where(sel); if (!op) throw new Error("ไม่พบตัวเลือก " + optHas);
  await shot(0.5); await moveTo(op); await shot(0.7);
  await ev(`(function(){ var o=[].slice.call(document.querySelectorAll(".csel-opt")).filter(function(e){return e.getBoundingClientRect().width>2 && (e.innerText||"").indexOf(${JSON.stringify(optHas)})>=0})[0]; o.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,cancelable:true})); })()`); await sleep(200); await shot(0.8);
}
async function dump() { return await ev(`(function(){ function vis(e){var r=e.getBoundingClientRect();return r.width>2&&r.height>2} var o=[]; document.querySelectorAll("button,a,select,input,textarea,[role=tab],.tab").forEach(function(e){ if(!vis(e))return; var t=(e.innerText||e.value||e.placeholder||e.getAttribute("aria-label")||"").trim().replace(/\\s+/g," ").slice(0,50); o.push(e.tagName[0]+(e.type?":"+e.type:"")+" "+t); }); return "URL-STATE crumb="+((document.querySelector(".crumb,.breadcrumb")||{}).innerText||"")+"\\n"+o.filter(function(x){return !/^B:button (Services|Laptop|Browser|Lab|Reset|ปกติ|เสร็จทันที|ตามระบบ|Asia)/.test(x)&&!/^[SI]:/.test(x)||/^I/.test(x)}).slice(0,60).join(" ¦ ");})()`); }
async function text() { return await ev(`document.body.innerText.slice(0,1500)`); }
async function hold(sec) { await shot(sec); }
async function finish(name) {
  const list = frames.map(([f, s]) => `file '${f}'\nduration ${s}`).join("\n") + `\nfile '${frames[frames.length - 1][0]}'\n`;
  fs.writeFileSync(__dirname + "/list.txt", list);
  try { ws.close(); } catch (e) {} chrome.kill();
  return frames.length;
}
async function where2() { return await ev(`(function(){var h=[].slice.call(document.querySelectorAll("h1")).filter(function(e){return e.getBoundingClientRect().width>2})[0];var fl=document.querySelector(".sb,.alert,[role=status]");return (h?h.innerText:"?")+" | "+(fl?fl.innerText.slice(0,100):"")+" | open="+document.querySelectorAll(".csel-list").length})()`); }
module.exports = { pickBtn, where2, start, send, ev, shot, cap, click, type, pick, dump, text, hold, finish, sleep, where };
