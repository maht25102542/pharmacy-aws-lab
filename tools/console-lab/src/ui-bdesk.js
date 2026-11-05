// Chrome / Safari บน Desktop: หน้าต่างเบราว์เซอร์ใช้งานได้จริง (พิมพ์ URL + Enter, ย้อน/ไปข้างหน้า/reload) แสดงเว็บจำลองตัวเดียวกับแท็บ Browser
function bdUrls() {
  var urls = ["https://" + AWS_HOST + "/", "https://" + AZ_HOST + "/", "https://www.google.com/"]; ["jenkins_url", "sonarqube_url", "argocd_url", "site_prd", "site_dev"].forEach(function (k) { if (S.tf.outputs[k]) urls.push(String(S.tf.outputs[k])); });
  S.cfds.forEach(function (d) { d.aliases.forEach(function (a) { urls.push("https://" + a); }); urls.push("https://" + d.domain); });
  var gu = typeof ghUser === "function" ? ghUser() : "demo-user"; urls.push("https://github.com/" + gu + "/pharmacy-backend");
  S.albs.forEach(function (a) { a.listeners.forEach(function (l) { var t = find(S.tgs, l.tgId); if (t && t.ttype === "ip" && a.dns) urls.push("http://" + a.dns + (l.port === 80 ? "" : ":" + l.port) + "/api/drugs"); }); });
  return urls.filter(function (u, i, a) { return a.indexOf(u) === i; });
}
function bdTitle(w) {
  w = w || W; var r = w.res; if (!r) return "New Tab"; if (r.site === "azportal") return "Microsoft Azure"; if (r.site === "awsconsole") return ((SVC_NAME[w.acs] || w.acs || "EC2") + " Management Console"); if (r.site === "google") return r.q ? r.q + " - Google Search" : "Google"; if (r.err) return /CERT|SSL/.test(r.err) ? "Privacy error" : "This site can’t be reached";
  return { jenkins: "Dashboard [Jenkins]", sonarqube: "SonarQube", argocd: "Argo CD", app: "pharmacy", github: "GitHub", cf: (r.host || "CloudFront"), apigw: "pharmacy-api", compose: "pharmacy", aprun: "pharmacy" }[r.site] || (r.host || w.addr);
}
// URL พิเศษที่เบราว์เซอร์บน Desktop จัดการเอง: AWS console + Google (หน้าแรก/ผลค้นหาจำลอง)
function bdSpecial(u) {
  u = String(u || ""); if (typeof isAwsUrl === "function" && isAwsUrl(u)) return { site: "awsconsole" };
  if (/^https?:\/\/portal\.azure\.com/i.test(u)) { if (!W.azp) W.azp = "home"; return { site: "azportal" }; }
  var m = /^https?:\/\/(www\.)?google\.(com|co\.th)(\/[^?#]*)?(\?[^#]*)?/i.exec(u); if (m) { var q = /[?&]q=([^&#]*)/.exec(m[4] || ""); return { site: "google", q: q ? decodeURIComponent(q[1].replace(/\+/g, " ")) : "" }; }
  return null;
}
function bdLooksUrl(v) { return /^[a-z]+:\/\//i.test(v) || /^(localhost|[\w-]+(\.[\w-]+)+|\d{1,3}(\.\d{1,3}){3})(:\d+)?([\/?#]|$)/i.test(v); }
function bdGo(v) {
  v = String(v || "").trim(); if (!v) return; if (!WH.st.length) { WH.st.push(whCur()); WH.i = 0; } /* เก็บหน้า New Tab ไว้ให้ย้อนกลับได้ */
  if (!bdLooksUrl(v)) v = "https://www.google.com/search?q=" + encodeURIComponent(v); else if (!/^[a-z]+:\/\//i.test(v)) v = (/^(localhost|\d{1,3}(\.\d{1,3}){3})/.test(v) ? "http://" : "https://") + v;
  var sp = bdSpecial(v); if (sp) { W.addr = v; W.res = sp; W.page = ""; if (sp.site === "awsconsole") awsFromUrl(v); render(); return; }
  wbGo(v);
}
function bdSvg(k) { return '<svg viewBox="0 0 16 16" width="16" height="16" class="bdsv">' + (typeof FD_SI !== "undefined" ? FD_SI[k] : "") + "</svg>"; }
function bdName(u) { if (/google\.com\/?$/.test(u)) return ["Google", "#4285f4"]; if (/console\.aws\.amazon\.com/.test(u)) return ["AWS Console", "#ff9900"]; if (/portal\.azure\.com/.test(u)) return ["Azure Portal", "#0078d4"]; var h2 = (/^https?:\/\/([^\/]+)/i.exec(u) || [0, u])[1]; if (/github\.com/.test(h2)) return ["GitHub", "#24292f"]; if (/:8080/.test(h2) && !/\/api/.test(u)) return ["Jenkins", "#d33833"]; if (/:9000/.test(h2)) return ["SonarQube", "#4e9bcd"]; if (/:8443/.test(h2)) return ["Argo CD", "#ef7b4d"]; if (/\/api\//.test(u) || /\/drugs/.test(u)) return ["pharmacy API", "#7b3fe4"]; if (/cloudfront|pharmacy\.example/.test(h2)) return [h2.replace(/^www\./, ""), "#0ea5e9"]; return [h2.replace(/^www\./, "").slice(0, 18), "#34509a"]; }
function bdTiles(kind) {
  var seen = {}, us = bdUrls().filter(function (u) { var n = bdName(u)[0]; if (seen[n]) return false; seen[n] = 1; return true; }).slice(0, 8);
  return h("div", { cls: "bdtiles " + kind }, us.map(function (u) { var n = bdName(u); return h("button", { type: "button", cls: "bdtile", title: u, onclick: function () { bdGo(u); } }, [h("span", { cls: "bdti", style: "background:" + n[1], text: n[0].charAt(0).toUpperCase() }), h("span", { cls: "bdtn", text: n[0] })]); }));
}
function browserStart(kind) {
  if (kind === "chrome") {
    var g = "Google".split("").map(function (c, i) { return h("span", { style: "color:" + ["#4285f4", "#ea4335", "#fbbc05", "#4285f4", "#34a853", "#ea4335"][i], text: c }); });
    var q = h("input", { cls: "bdsq", type: "text", list: "bdurls", placeholder: "Search Google or type a URL", spellcheck: "false", onkeydown: function (e) { if (e.key === "Enter") bdGo(q.value); } });
    return h("div", { cls: "bdstart chrome" }, [h("div", { cls: "bdlogo" }, g), h("div", { cls: "bdsearch" }, [h("span", { html: bdSvg("search") }), q, h("span", { cls: "bdmic", text: "🎤" })]), bdTiles("chrome"), h("div", { cls: "bdcust", text: "✎ Customize Chrome" })]);
  }
  return h("div", { cls: "bdstart safari" }, [h("h3", { text: "Favorites" }), bdTiles("safari"), h("h3", { text: "Privacy Report" }), h("div", { cls: "bdpriv", text: "🛡️  Safari ป้องกันตัวติดตามให้คุณ (จำลอง)" })]);
}

// ---- Google (จำลอง): หน้าแรก + ผลค้นหาจากเว็บใน lab
function googleLogo(sz) { return h("span", { cls: "bdlogo", style: "font-size:" + sz }, "Google".split("").map(function (c, i) { return h("span", { style: "color:" + ["#4285f4", "#ea4335", "#fbbc05", "#4285f4", "#34a853", "#ea4335"][i], text: c }); })); }
function googleResults(q) {
  var us = bdUrls(), pick = function (re) { return us.filter(function (u) { return re.test(u); })[0]; };
  var cat = [[/aws|console|ec2|vpc|iam|s3|lambda|cloud/i, "AWS Management Console", "https://" + AWS_HOST + "/", "Amazon Web Services — จัดการ EC2, VPC, IAM, S3 และบริการอื่นผ่านเว็บ (เปิดใน Chrome ตัวจำลองได้)"],
    [/jenkins|ci|pipeline|build/i, "Jenkins", pick(/:8080/) , "Jenkins — automation server สำหรับ build, test และ deploy (ของ lab: pharmacy-backend / pharmacy-frontend)"],
    [/sonar|quality|scan/i, "SonarQube", pick(/:9000/), "SonarQube — ตรวจคุณภาพโค้ดและ Quality Gate"],
    [/argo|gitops|k8s|kubernetes|deploy/i, "Argo CD", pick(/:8443/), "Argo CD — GitOps continuous delivery สำหรับ Kubernetes"],
    [/github|git|repo|code/i, "GitHub", pick(/github\.com/), "GitHub — เก็บโค้ด pharmacy-backend / pharmacy-frontend / pharmacy-manifests"],
    [/pharmacy|ร้านยา|drug|ยา/i, "pharmacy — เว็บร้านยา", pick(/\/api\/|elb|cloudfront/), "ระบบจัดการสต็อกยา (frontend + backend API)"]];
  var out = cat.filter(function (c) { return c[2] && c[0].test(q); }).map(function (c) { return { t: c[1], u: c[2], s: c[3] }; });
  if (!out.length) out = cat.filter(function (c) { return c[2]; }).slice(0, 4).map(function (c) { return { t: c[1], u: c[2], s: c[3] }; });
  return out;
}
function googleView() {
  var r = W.res, q = r.q || "", box = h("input", { cls: "bdsq", type: "text", spellcheck: "false", value: q, placeholder: "Search Google or type a URL", onkeydown: function (e) { if (e.key === "Enter") bdGo(box.value); } });
  var sb = h("div", { cls: "bdsearch" }, [h("span", { html: bdSvg("search") }), box, h("span", { cls: "bdmic", text: "🎤" })]);
  if (!q) return h("div", { cls: "bdstart chrome gh" }, [googleLogo("4.2rem"), sb, h("div", { cls: "gbtns" }, [h("button", { type: "button", text: "Google Search", onclick: function () { bdGo(box.value || ""); } }), h("button", { type: "button", text: "I’m Feeling Lucky", onclick: function () { bdGo("https://" + AWS_HOST + "/"); } })])]);
  var res = googleResults(q);
  return h("div", { cls: "gres2" }, [h("div", { cls: "gbar" }, [googleLogo("1.6rem"), h("div", { cls: "bdsearch sm" }, [h("span", { html: bdSvg("search") }), box])]), h("div", { cls: "gtabs" }, ["All", "Images", "Videos", "News", "Maps"].map(function (t, i) { return h("span", { cls: i ? "" : "on", text: t }); })),
    h("div", { cls: "gcount", text: "About " + (res.length * 1200000).toLocaleString("en-US") + " results (0.41 seconds)" })].concat(res.map(function (x) { return h("div", { cls: "gi" }, [h("div", { cls: "gu", text: x.u }), h("a", { href: "#", text: x.t, onclick: function (e) { e.preventDefault(); bdGo(x.u); } }), h("p", { text: x.s })]); })).concat([h("div", { cls: "gnote", text: "ผลค้นหาจำลอง: ดึงจากเว็บที่มีใน lab เท่านั้น" })]));
}
// ---- แท็บของ Chrome: เก็บ/คืนสถานะ W + ประวัติ (WH) ต่อแท็บ
var BT = { tabs: [{ id: 1, w: null, h: null }], cur: 0, seq: 1 };
function btSnap() { var o = { res: W.res }; WH_KEYS.forEach(function (k) { o[k] = W[k]; }); return o; }
function btSave() { var t = BT.tabs[BT.cur]; if (!t) return; t.w = btSnap(); t.h = { st: WH.st, i: WH.i }; }
function btLoad(t) { if (t.w) { Object.keys(t.w).forEach(function (k) { W[k] = t.w[k]; }); } else { W.addr = ""; W.res = null; W.page = ""; W.acs = ""; W.acp = ""; } WH.st = t.h ? t.h.st : []; WH.i = t.h ? t.h.i : -1; }
function btNew() { btSave(); BT.tabs.push({ id: ++BT.seq, w: null, h: null }); BT.cur = BT.tabs.length - 1; btLoad(BT.tabs[BT.cur]); render(); }
function btSwitch(i) { if (i === BT.cur) return; btSave(); BT.cur = i; btLoad(BT.tabs[i]); render(); }
function btClose(i) { if (BT.tabs.length === 1) { BT.tabs[0] = { id: ++BT.seq, w: null, h: null }; BT.cur = 0; btLoad(BT.tabs[0]); render(); return; } if (i === BT.cur) { BT.tabs.splice(i, 1); BT.cur = Math.min(i, BT.tabs.length - 1); btLoad(BT.tabs[BT.cur]); } else { btSave(); BT.tabs.splice(i, 1); if (i < BT.cur) BT.cur--; } render(); }
function browserApp(kind) {
  var isAws = !!(W.res && W.res.site === "awsconsole"), isG = !!(W.res && W.res.site === "google"), isAz = !!(W.res && W.res.site === "azportal"); AC.on = isAws; if (isAws) DESK.bsvc = AC.svc; var pg = isAws || isG || isAz ? null : PAGES.browser(), kids = pg ? [].slice.call(pg.children) : [], view = isAws ? awsEmbed() : isAz ? azurePortal() : isG ? googleView() : W.res ? kids[kids.length - 1] : browserStart(kind);
  var https = /^https:/i.test(W.addr || ""), host = (/^https?:\/\/([^\/]+)/i.exec(W.addr || "") || [0, ""])[1];
  var can = function (d) { return typeof whCan === "function" && whCan(d); };
  var dl = h("datalist", { id: "bdurls" }, bdUrls().map(function (u) { return h("option", { value: u }); }));
  var om = h("input", { cls: "bdom", type: "text", list: "bdurls", spellcheck: "false", placeholder: kind === "chrome" ? "Search Google or type a URL" : "Search or enter website name", value: W.addr || "", "aria-label": "address", onkeydown: function (e) { if (e.key === "Enter") bdGo(om.value); } });
  om.addEventListener("focus", function () { om.select(); });
  var nav = h("span", { cls: "bdnav" }, [h("button", { type: "button", cls: "bdb", disabled: !can(-1), html: bdSvg("back"), title: "Back", onclick: function () { whGo(-1); } }), h("button", { type: "button", cls: "bdb", disabled: !can(1), html: bdSvg("fwd"), title: "Forward", onclick: function () { whGo(1); } })]);
  var rel = h("button", { type: "button", cls: "bdb", title: "Reload", html: '<svg viewBox="0 0 16 16" width="16" height="16" class="bdsv"><path d="M13 8a5 5 0 1 1-1.600-3.700M13 2.500V5.500H10" fill="none" stroke="currentColor" stroke-width="1.500" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: function () { if (W.addr) wbGo(W.addr); } });
  var lock = h("span", { cls: "bdlk " + (https ? "s" : ""), html: https ? '<svg viewBox="0 0 16 16" width="12" height="12"><rect x="3" y="7" width="10" height="7" rx="1.500" fill="currentColor"/><path d="M5.500 7V5a2.500 2.500 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.500"/></svg>' : "" });
  var bar;
  if (kind === "chrome") {
    bar = h("div", { cls: "bdbar chrome" }, [
      h("div", { cls: "bdtabs" }, BT.tabs.map(function (t, i) { var cur = i === BT.cur, w = cur ? W : (t.w || { res: null, addr: "" }), ttl = bdTitle(w); return h("div", { cls: "bdtab" + (cur ? "" : " off"), title: ttl, onclick: function () { btSwitch(i); } }, [h("span", { cls: "bdfav", text: w.res && w.res.site === "google" ? "G" : w.res && w.res.site === "awsconsole" ? "☁" : "🌐" }), h("span", { cls: "bdtt", text: ttl }), h("i", { text: "×", title: "Close tab", onclick: function (e) { e.stopPropagation(); btClose(i); } })]); }).concat([h("span", { cls: "bdplus", text: "+", title: "New tab", onclick: btNew })])),
      h("div", { cls: "bdtb" }, [nav, rel, h("div", { cls: "bdomw" }, [lock, om]), h("span", { cls: "bdb star", text: "☆" }), h("span", { cls: "bdavatar", text: "S" })])]);
  } else {
    bar = h("div", { cls: "bdbar safari" }, [h("div", { cls: "bdtb" }, [h("span", { cls: "bdb", html: bdSvg("grid") }), nav, h("div", { cls: "bdomw sf" }, [lock, om, rel])])]);
  }
  return h("div", { cls: "bdapp " + kind }, [bar, dl, h("div", { cls: "bdview" }, [view])]);
}

// คีย์ลัดเบราว์เซอร์ (เมื่อ Chrome/Safari อยู่หน้าสุด): Ctrl/⌘+R หรือ F5 = reload · Alt+←/→ หรือ Ctrl/⌘+[ ] = ย้อน/ไปข้างหน้า · Ctrl/⌘+L = โฟกัสแถบ URL
window.addEventListener("keydown", function (e) {
  if (UI.page !== "desk" || typeof dmFront !== "function") return; var f = dmFront(); if (f !== "chrome" && f !== "safari") return;
  var mod = e.ctrlKey || e.metaKey, k = e.key, act = null;
  if ((mod && (k === "r" || k === "R")) || k === "F5") act = function () { if (W.addr) wbGo(W.addr); };
  else if ((e.altKey && k === "ArrowLeft") || (mod && k === "[")) act = function () { if (whCan(-1)) whGo(-1); };
  else if ((e.altKey && k === "ArrowRight") || (mod && k === "]")) act = function () { if (whCan(1)) whGo(1); };
  else if (mod && (k === "l" || k === "L")) act = function () { var o = document.querySelector(".bdom"); if (o) { o.focus(); o.select(); } };
  if (act) { e.preventDefault(); e.stopPropagation(); act(); }
}, true);
