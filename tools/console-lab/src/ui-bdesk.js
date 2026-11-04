// Chrome / Safari บน Desktop: หน้าต่างเบราว์เซอร์ใช้งานได้จริง (พิมพ์ URL + Enter, ย้อน/ไปข้างหน้า/reload) แสดงเว็บจำลองตัวเดียวกับแท็บ Browser
function bdUrls() {
  var urls = []; ["jenkins_url", "sonarqube_url", "argocd_url", "site_prd", "site_dev"].forEach(function (k) { if (S.tf.outputs[k]) urls.push(String(S.tf.outputs[k])); });
  S.cfds.forEach(function (d) { d.aliases.forEach(function (a) { urls.push("https://" + a); }); urls.push("https://" + d.domain); });
  var gu = typeof ghUser === "function" ? ghUser() : "demo-user"; urls.push("https://github.com/" + gu + "/pharmacy-backend");
  S.albs.forEach(function (a) { a.listeners.forEach(function (l) { var t = find(S.tgs, l.tgId); if (t && t.ttype === "ip" && a.dns) urls.push("http://" + a.dns + (l.port === 80 ? "" : ":" + l.port) + "/api/drugs"); }); });
  return urls.filter(function (u, i, a) { return a.indexOf(u) === i; });
}
function bdTitle() {
  var r = W.res; if (!r) return "New Tab"; if (r.err) return /CERT|SSL/.test(r.err) ? "Privacy error" : "This site can’t be reached";
  return { jenkins: "Dashboard [Jenkins]", sonarqube: "SonarQube", argocd: "Argo CD", app: "pharmacy", github: "GitHub", cf: (r.host || "CloudFront"), apigw: "pharmacy-api", compose: "pharmacy", aprun: "pharmacy" }[r.site] || (r.host || W.addr);
}
function bdGo(v) { v = String(v || "").trim(); if (!v) return; if (!/^[a-z]+:\/\//i.test(v)) v = (/^(localhost|[\d.]+)(:\d+)?(\/|$)/.test(v) ? "http://" : "https://") + v; wbGo(v); }
function bdSvg(k) { return '<svg viewBox="0 0 16 16" width="16" height="16" class="bdsv">' + (typeof FD_SI !== "undefined" ? FD_SI[k] : "") + "</svg>"; }
function browserApp(kind) {
  var pg = PAGES.browser(), kids = [].slice.call(pg.children), view = kids[kids.length - 1];
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
      h("div", { cls: "bdtabs" }, [h("div", { cls: "bdtab" }, [h("span", { cls: "bdfav", text: "🌐" }), h("span", { cls: "bdtt", text: bdTitle() }), h("i", { text: "×" })]), h("span", { cls: "bdplus", text: "+" })]),
      h("div", { cls: "bdtb" }, [nav, rel, h("div", { cls: "bdomw" }, [lock, om]), h("span", { cls: "bdb star", text: "☆" }), h("span", { cls: "bdavatar", text: "S" })])]);
  } else {
    bar = h("div", { cls: "bdbar safari" }, [h("div", { cls: "bdtb" }, [h("span", { cls: "bdb", html: bdSvg("grid") }), nav, h("div", { cls: "bdomw sf" }, [lock, om, rel])])]);
  }
  return h("div", { cls: "bdapp " + kind }, [bar, dl, h("div", { cls: "bdview" }, [view])]);
}
