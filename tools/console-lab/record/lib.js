// CDP driver จิ๋ว (ไม่ใช้ dependency): ขับ Chrome headless, ถ่ายเฟรม, ซ้อน cursor + caption
const { spawn, execFileSync } = require("child_process"), fs = require("fs"), path = require("path");
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
async function whereWait(q) { for (let i = 0; i < 25; i++) { const p = await where(q); if (p) return p; await sleep(160); } return null; } // รอ element โผล่ (หน้า render ช้า)
async function moveTo(p) { const cur = await ev(`(function(){var c=document.getElementById("__cur");return {x:parseFloat(c.style.left)+11,y:parseFloat(c.style.top)+11}})()`); for (let i = 1; i <= 3; i++) { const x = cur.x + (p.x - cur.x) * i / 3, y = cur.y + (p.y - cur.y) * i / 3; await ev(`(function(){var c=document.getElementById("__cur");c.style.left=${x - 11}+"px";c.style.top=${y - 11}+"px"})()`); if (i < 3) await shot(0.12); } await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y }); }
async function click(q, label) { const p = await whereWait(q); if (!p) throw new Error("ไม่พบ: " + JSON.stringify(q) + "\n" + (await dump())); await moveTo(p); await shot(0.5); await ev(`(function(){var c=document.getElementById("__cur");c.style.background="rgba(255,153,0,.95)"})()`); await send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); await sleep(250); await ev(`(function(){var c=document.getElementById("__cur");c.style.background="rgba(255,153,0,.55)"})()`); await shot(0.7); }
async function type(q, text) { const p = await whereWait(q); if (!p) throw new Error("ไม่พบช่อง: " + JSON.stringify(q) + "\n" + (await dump())); await moveTo(p); await send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 3 }); await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 3 }); await send("Input.insertText", { text }); await sleep(150); await shot(0.8); }
// select แบบ custom ของแอป: คลิกปุ่ม .csel-btn ของ select นั้น แล้วคลิก .csel-opt ที่ข้อความขึ้นต้นตรง
async function pick(q, opt) {
  const sel = typeof q === "object" && q.label ? q : q;
  const idx = await ev(`(function(){ ${FIND} var s=__find(${JSON.stringify(sel)}); if(!s) return -1; var all=[].slice.call(document.querySelectorAll("select")); s.setAttribute("data-rec","1"); var b=s.parentElement.querySelector(".csel-btn")||s.nextElementSibling; if(!b) return -2; b.setAttribute("data-rec-btn","1"); return 1;})()`);
  if (idx < 0) throw new Error("ไม่พบ select: " + JSON.stringify(q) + " (" + idx + ")\n" + (await dump()));
  await click("[data-rec-btn='1']"); await sleep(150);
  const ok = await ev(`(function(){ var o=[].slice.call(document.querySelectorAll(".csel-opt")).filter(function(e){return e.getBoundingClientRect().width>2 && (e.innerText||"").trim().indexOf(${JSON.stringify(opt)})===0})[0]; return o?1:[].slice.call(document.querySelectorAll(".csel-opt")).map(function(e){return e.innerText.trim()}).join(" | ");})()`);
  if (ok !== 1) throw new Error("ไม่มีตัวเลือก " + opt + " ใน: " + ok);
  await shot(0.6); const op = await whereWait({ t: opt, starts: true, tag: ".csel-opt" }); await moveTo(op); await shot(0.7);
  await ev(`(function(){ var o=[].slice.call(document.querySelectorAll(".csel-opt")).filter(function(e){return e.getBoundingClientRect().width>2 && (e.innerText||"").trim().indexOf(${JSON.stringify(opt)})===0})[0]; o.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,cancelable:true})); })()`); await sleep(200); await shot(0.8);
  await ev(`document.querySelectorAll("[data-rec],[data-rec-btn]").forEach(function(e){e.removeAttribute("data-rec");e.removeAttribute("data-rec-btn")})`);
}
async function pickBtn(btnText, optHas) {
  await click({ t: btnText, tag: "button" }); await sleep(150);
  const sel = { t: optHas, has: true, tag: ".csel-opt" }; const op = await whereWait(sel); if (!op) throw new Error("ไม่พบตัวเลือก " + optHas);
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

// ---- เสียงบรรยาย (edge-tts) + ซิงก์กับเฟรม ----
const crypto = require("crypto");
const VENV = process.env.REC_VENV || "/tmp/claude-1000/-home-swd-Desktop-work-pharmacy-aws-lab/e26c2d62-bc7d-42b2-9d98-9b40ddadd580/scratchpad/venv";
const EDGE = process.env.EDGE_TTS || VENV + "/bin/edge-tts", FFMPEG = process.env.FFMPEG || VENV + "/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2";
const VOICE = process.env.REC_VOICE || "th-TH-NiwatNeural", RATE = process.env.REC_RATE || "-15%", PITCH = process.env.REC_PITCH || "-3Hz", ADIR = __dirname + "/audio";
// edge-tts ปฏิเสธข้อความไทยปนอังกฤษบางแบบ → สะกดคำอังกฤษเป็นไทยก่อนส่ง (ยาวก่อนสั้น)
const PHON = [["Let's Encrypt", "เล็ทส์เอ็นคริปต์"], ["Route 53", "รูทฟิฟตี้ทรี"], ["Security Group", "ซีเคียวริตี้กรุ๊ป"], ["Elastic IP", "อิลาสติกไอพี"], ["hosted zone", "โฮสต์โซน"], ["user data", "ยูสเซอร์ดาต้า"], ["key pair", "คีย์แพร์"], ["CloudFront", "คลาวด์ฟรอนท์"], ["cloud-init", "คลาวด์อินิท"], ["index.html", "อินเด็กซ์เอชทีเอ็มแอล"], ["Docker Compose", "ด็อกเกอร์คอมโพส"], ["docker compose", "ด็อกเกอร์คอมโพส"], ["t3.small", "ทีทรีสมอล"], ["Launch instance", "ลอนช์อินสแตนซ์"], ["Create", "ครีเอท"], ["bucket", "บักเก็ต"], ["Bucket", "บักเก็ต"], ["subnet", "ซับเน็ต"], ["Caddy", "แคดดี้"], ["Browser", "บราวเซอร์"], ["Services", "เซอร์วิส"], ["Upload", "อัปโหลด"], ["CNAME", "ซีเนม"], ["Alias", "อาเลียส"], ["alias", "อาเลียส"], ["record", "เรคคอร์ด"], ["Associate", "แอสโซซิเอท"], ["Allocate", "แอลโลเคท"], ["HTTPS", "เอชทีทีพีเอส"], ["DNS", "ดีเอ็นเอส"], ["EC2", "อีซีทู"], ["ACM", "เอซีเอ็ม"], ["OAC", "โอเอซี"], ["VPC", "วีพีซี"], ["IGW", "ไอจีดับเบิลยู"], ["SSH", "เอสเอสเอช"], ["SG", "เอสจี"], ["IP", "ไอพี"], ["S3", "เอสทรี"], ["app", "แอป"], ["user", "ยูสเซอร์"], ["dev", "เดฟ"], ["prd", "พีอาร์ดี"]];
function phon(t) { PHON.forEach(([a, b]) => { t = t.split(a).join(b); }); return t.replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫✓→›·]/g, " ").replace(/\s+/g, " ").trim(); }
function dur(f) { try { execFileSync(FFMPEG, ["-i", f], { stdio: "pipe" }); } catch (e) { const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(String(e.stderr)); if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3]; } return 3; }
function tts(text) {
  fs.mkdirSync(ADIR, { recursive: true }); const p = phon(text), f = ADIR + "/" + crypto.createHash("sha1").update(VOICE + RATE + PITCH + p).digest("hex").slice(0, 12) + ".mp3";
  if (fs.existsSync(f) && fs.statSync(f).size > 0) return f;
  for (let i = 0; i < 10; i++) { try { execFileSync(EDGE, ["--voice", VOICE, "--rate=" + RATE, "--pitch=" + PITCH, "--text", [p + ".", p, "ตอนนี้" + p + ".", p + "..."][i % 4], "--write-media", f], { stdio: "pipe" }); if (fs.statSync(f).size > 0) return f; } catch (e) {} execFileSync("sleep", [String(1 + i)]); }
  const w = p.split(" "); if (w.length < 2) throw new Error("TTS ล้มเหลว: " + p);
  const m = Math.ceil(w.length / 2), parts = [tts(w.slice(0, m).join(" ")), tts(w.slice(m).join(" "))], lst = f + ".txt"; // ตัดครึ่งแล้วต่อไฟล์
  fs.writeFileSync(lst, parts.map((x) => `file '${x}'`).join("\n")); execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c:a", "libmp3lame", f]); return f;
}
const narr = [], total = () => frames.reduce((a, x) => a + x[1], 0);
function padTo(t) { const need = t - total(); if (need > 0 && frames.length) frames[frames.length - 1][1] += need; }
async function say(text) { // เริ่มพูดตอนนี้; ถ้าประโยคก่อนหน้ายังไม่จบ ให้ค้างเฟรมรอ
  const l = narr[narr.length - 1]; if (l) padTo(l.t0 + l.dur + 0.3);
  const f = tts(text); narr.push({ t0: total(), dur: dur(f), f });
}
async function cap2(t, s) { await cap(t); if (s) await say(s); }
// ---- เช็กลิสต์บริการ + ติ๊กถูก ----
async function plan(items) {
  await ev(`(function(items){ var p=document.getElementById("__plan"); if(p)p.remove(); p=document.createElement("div"); p.id="__plan"; p.style.cssText="position:fixed;z-index:99997;left:0;right:0;bottom:52px;display:flex;gap:8px;padding:6px 12px;pointer-events:none;flex-wrap:wrap";
    items.forEach(function(it,i){ var c=document.createElement("div"); c.dataset.i=i; c.style.cssText="display:flex;align-items:center;gap:7px;padding:4px 12px 4px 8px;border-radius:999px;background:#fff;border:2px solid #cbd5e1;font:600 14px 'IBM Plex Sans Thai',sans-serif;color:#334155;box-shadow:0 1px 4px rgba(0,0,0,.25)";
      var ic=document.createElement("span"); ic.style.cssText="display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center"; if(SVC_ICO[it[1]]){ ic.appendChild(awsIco(SVC_ICO[it[1]],22)); } else ic.textContent=it[1];
      var t=document.createElement("span"); t.textContent=it[0]; var k=document.createElement("span"); k.className="tk"; k.textContent="○"; k.style.cssText="font-size:16px;color:#94a3b8"; c.appendChild(ic); c.appendChild(t); c.appendChild(k); p.appendChild(c); }); document.body.appendChild(p); })(${JSON.stringify(items)})`);
}
async function cur(i) { await ev(`(function(i){ [].slice.call(document.querySelectorAll("#__plan > div")).forEach(function(c){ if(c.dataset.done)return; c.style.borderColor=(+c.dataset.i===i)?"#ec4899":"#cbd5e1"; }); })(${i})`); }
function toastJs(i, msg, sub, color) { return `(function(i,msg,sub,color){ var c=document.querySelector('#__plan > div[data-i="'+i+'"]');
    var t=document.getElementById("__toast"); if(!t){ t=document.createElement("div"); t.id="__toast"; document.body.appendChild(t); } t.style.cssText="position:fixed;z-index:99999;left:50%;top:84px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;padding:12px 26px;border-radius:14px;color:#fff;font:700 24px 'IBM Plex Sans Thai',sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none;background:"+color;
    t.innerHTML=""; var ic=c.firstChild.cloneNode(true); ic.style.cssText="display:inline-flex;background:#fff;border-radius:10px;padding:5px;width:44px;height:44px;align-items:center;justify-content:center;font-size:28px"; var s=ic.querySelector("img"); if(s){ s.setAttribute("width",38); s.setAttribute("height",38); } t.appendChild(ic);
    var m=document.createElement("div"); var a=document.createElement("div"); a.textContent=msg; m.appendChild(a); if(sub){ var d=document.createElement("div"); d.textContent=sub; d.style.cssText="font:500 16px 'IBM Plex Sans Thai',sans-serif;opacity:.95;margin-top:2px"; m.appendChild(d); } t.appendChild(m); t.style.display="flex"; })(${i},${JSON.stringify(msg)},${JSON.stringify(sub || "")},${JSON.stringify(color)})`; }
async function tick(i, msg, sayText) { // ติ๊กถูก + ป้ายใหญ่กลางจอ (โลโก้ + ชื่อบริการ)
  await ev(`(function(i){ var c=document.querySelector('#__plan > div[data-i="'+i+'"]'); c.dataset.done=1; c.style.borderColor="#16a34a"; c.style.background="#dcfce7"; var k=c.querySelector(".tk"); k.textContent="✓"; k.style.color="#16a34a"; k.style.fontWeight="900"; k.style.fontSize="20px"; })(${i})`);
  await ev(toastJs(i, "✓ " + msg, "", "#16a34a"));
  if (sayText) await say(sayText);
  await shot(1.6); await ev(`document.getElementById("__toast").style.display="none"`);
}
async function intro(i, title, desc, sayText) { // เริ่มบริการใหม่: โลโก้ + ชื่อ + อธิบายสั้นๆ (พูดด้วย)
  await cur(i); await ev(toastJs(i, title, desc, "#2563eb")); if (sayText) await say(sayText);
  await shot(1.8); await ev(`document.getElementById("__toast").style.display="none"`);
}
// ฉากสรุปค่าใช้จ่ายท้ายวิดีโอ: การ์ดใหญ่กลางจอ + พูดอธิบาย (ข้อมูลจาก COSTD ชุดเดียวกับหน้า Cost & Bill)
async function costScene(key, sayText) {
  const d = await ev(`(function(k){ var c=COSTD.uc[k], s=costSum(c.items); return JSON.stringify({title:c.title,big:c.big,month:money(s.month),four:money(s.perHours(4)),top:c.drivers.slice(0,3),stop:c.stop.replace(/\\x60/g,"")}); })(${JSON.stringify(key)})`);
  const o = JSON.parse(d);
  await ev(`(function(o){ var t=document.getElementById("__cost"); if(!t){ t=document.createElement("div"); t.id="__cost"; document.body.appendChild(t); }
    t.style.cssText="position:fixed;z-index:99999;left:50%;top:70px;transform:translateX(-50%);width:760px;max-width:92vw;padding:20px 26px;border-radius:16px;background:#0f172a;color:#fff;font:600 18px 'IBM Plex Sans Thai',sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.45);pointer-events:none";
    t.innerHTML='<div style="font-size:15px;opacity:.7;margin-bottom:4px">💰 ค่าใช้จ่าย &amp; bill management</div><div style="font-size:22px;font-weight:800;margin-bottom:10px">'+o.big+'</div><div style="display:flex;gap:14px;margin:10px 0"><div style="flex:1;border-left:4px solid #f87171;padding-left:12px"><div style="font-size:13px;opacity:.7">เปิดทิ้ง 1 เดือน</div><div style="font-size:30px;font-weight:800;color:#f87171">≈ '+o.month+'</div></div><div style="flex:1;border-left:4px solid #4ade80;padding-left:12px"><div style="font-size:13px;opacity:.7">ทำ lab 4 ชม. แล้ว destroy</div><div style="font-size:30px;font-weight:800;color:#4ade80">≈ '+o.four+'</div></div></div><div style="font-size:15px;font-weight:500;line-height:1.7"><b>ตัวทำบิลพุ่ง:</b> '+o.top.join(" · ")+'<br><b>ตั้ง Budget + Cost Anomaly Detection ก่อน · ทำเสร็จต้อง destroy</b></div><div style="font-size:12px;opacity:.55;margin-top:8px">ตัวเลขเป็นประมาณการ ap-southeast-1 ตรวจที่ calculator.aws</div>'; t.style.display="block"; })(${JSON.stringify(o)})`);
  if (sayText) await say(sayText);
  await shot(2.5); const l = narr[narr.length - 1]; if (l) padTo(l.t0 + l.dur + 0.5);
  await ev(`document.getElementById("__cost").style.display="none"`);
}
async function encode(out) { // เฟรม + เสียง → mp4
  const l = narr[narr.length - 1]; if (l) padTo(l.t0 + l.dur + 0.8);
  const list = frames.map(([f, s]) => `file '${f}'\nduration ${s.toFixed(3)}`).join("\n") + `\nfile '${frames[frames.length - 1][0]}'\n`; fs.writeFileSync(__dirname + "/list.txt", list);
  const args = ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", __dirname + "/list.txt"];
  narr.forEach((x) => args.push("-i", x.f));
  const flt = narr.map((x, i) => `[${i + 1}:a]adelay=${Math.round(x.t0 * 1000)}|${Math.round(x.t0 * 1000)}[a${i}]`).join(";") + ";" + narr.map((x, i) => `[a${i}]`).join("") + `amix=inputs=${narr.length}:normalize=0:dropout_transition=0[aout]`;
  if (narr.length) args.push("-filter_complex", flt, "-map", "0:v", "-map", "[aout]", "-c:a", "aac", "-b:a", "96k");
  args.push("-vf", "scale=1280:-2,format=yuv420p", "-c:v", "libx264", "-crf", "28", "-preset", "fast", "-r", "10", "-movflags", "+faststart", out);
  execFileSync(FFMPEG, args, { stdio: "inherit" });
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", out, "-c:v", "copy", "-c:a", "libopus", "-b:a", "48k", "-movflags", "+faststart", out.replace(/\.mp4$/, "-opus.mp4")], { stdio: "inherit" }); // mp4 H.264 + Opus
  // webm (VP9+Opus) ไว้ให้ VS Code/Electron ที่ถอดรหัส AAC ไม่ได้
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", out, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "40", "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-c:a", "libopus", "-b:a", "48k", out.replace(/\.mp4$/, ".webm")], { stdio: "inherit" });
}
module.exports = { costScene, intro, say, plan, cur, tick, encode, tts, pickBtn, where2, start, send, ev, shot, cap: cap2, click, type, pick, dump, text, hold, finish, sleep, where };
