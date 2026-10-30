// ===== ไอคอน SVG (แทน text glyph) สำหรับ Argo CD และ SonarQube =====
var SVG_I = {
  apps: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/>',
  appsets: '<path d="M12 2l5 3v5l-5 3-5-3V5z"/><path d="M7 13l5 3v5l-5-3z"/><path d="M17 13v5l-5 3v-5z"/>',
  resources: '<rect x="3" y="3" width="4.5" height="4.5" fill="currentColor"/><rect x="9.75" y="3" width="4.5" height="4.5" fill="currentColor"/><rect x="16.5" y="3" width="4.5" height="4.5" fill="currentColor"/><rect x="3" y="9.75" width="4.5" height="4.5" fill="currentColor"/><rect x="9.75" y="9.75" width="4.5" height="4.5" fill="currentColor"/><rect x="16.5" y="9.75" width="4.5" height="4.5" fill="currentColor"/><rect x="3" y="16.5" width="4.5" height="4.5" fill="currentColor"/><rect x="9.75" y="16.5" width="4.5" height="4.5" fill="currentColor"/><rect x="16.5" y="16.5" width="4.5" height="4.5" fill="currentColor"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>',
  user: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><circle cx="12" cy="9.5" r="3.2" fill="#0e2230" stroke="none"/><path d="M5.8 18.2c1.3-2.4 3.7-3.4 6.2-3.4s4.9 1 6.2 3.4A9.9 9.9 0 0112 22a9.9 9.9 0 01-6.2-3.8z" fill="#0e2230" stroke="none"/>',
  docs: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  git: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 7v10M18 11c0 4-6 3-12 6"/>',
  heart: '<path d="M12 21s-8.5-5.4-8.5-11.2A4.6 4.6 0 0112 7.3a4.6 4.6 0 018.5 2.5C20.5 15.6 12 21 12 21z" fill="currentColor" stroke="none"/>',
  broken: '<path d="M12 21s-8.5-5.4-8.5-11.2A4.6 4.6 0 0112 7.3a4.6 4.6 0 018.5 2.5C20.5 15.6 12 21 12 21z" fill="currentColor" stroke="none"/><path d="M12 7.3l-2 4 3 2-2 4" stroke="#fff" stroke-width="1.6" fill="none"/>',
  ghost: '<path d="M12 3a7 7 0 00-7 7v11l2.3-2 2.3 2 2.4-2 2.4 2 2.3-2 .3.2V10a7 7 0 00-7-7z" fill="currentColor" stroke="none"/><circle cx="9.3" cy="10" r="1.2" fill="#fff" stroke="none"/><circle cx="14.7" cy="10" r="1.2" fill="#fff" stroke="none"/>',
  ring: '<circle cx="12" cy="12" r="8.5" stroke-width="3" opacity=".25"/><path d="M12 3.5a8.5 8.5 0 018.5 8.5" stroke-width="3"/>',
  pause: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><rect x="8.2" y="7.5" width="2.6" height="9" fill="#fff" stroke="none"/><rect x="13.2" y="7.5" width="2.6" height="9" fill="#fff" stroke="none"/>',
  unknown: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M9.3 9.4a2.8 2.8 0 015.4.9c0 1.9-2.7 2.1-2.7 4" stroke="#fff" stroke-width="2" fill="none"/><circle cx="12" cy="17.3" r="1.2" fill="#fff" stroke="none"/>',
  synced: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7 12.5l3.2 3.2L17 8.8" stroke="#fff" stroke-width="2.4" fill="none"/>',
  outofsync: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M12 17V8M7.8 11.8L12 7.6l4.2 4.2" stroke="#fff" stroke-width="2.4" fill="none"/>',
  blocker: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><rect x="6.5" y="10.6" width="11" height="2.8" rx="1" fill="#fff" stroke="none"/>',
  high: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7.5 12.5L12 8l4.5 4.5M7.5 17L12 12.5l4.5 4.5" stroke="#fff" stroke-width="2.2" fill="none"/>',
  medium: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7.5 14.5L12 10l4.5 4.5" stroke="#fff" stroke-width="2.4" fill="none"/>',
  low: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7.5 9.5L12 14l4.5-4.5" stroke="#fff" stroke-width="2.4" fill="none"/>',
  info: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><rect x="10.9" y="10.5" width="2.2" height="7" rx="1" fill="#fff" stroke="none"/><circle cx="12" cy="7.4" r="1.4" fill="#fff" stroke="none"/>',
  qgpass: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7 12.5l3.2 3.2L17 8.8" stroke="#fff" stroke-width="2.4" fill="none"/>',
  qgfail: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="2.4" fill="none"/>'
};
function svgI(name, size, color, cls) {
  var s = document.createElement("span"); s.className = "svgi" + (cls ? " " + cls : ""); s.style.cssText = "display:inline-flex;vertical-align:middle;width:" + size + "px;height:" + size + "px;color:" + (color || "currentColor");
  s.innerHTML = '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (SVG_I[name] || "") + "</svg>"; return s;
}
var AG_HIK = { Healthy: "heart", Degraded: "broken", Missing: "ghost", Progressing: "ring", Suspended: "pause", Unknown: "unknown" }, AG_SIK = { Synced: "synced", OutOfSync: "outofsync", Unknown: "unknown" };
function agHI(health, size) { var c = (AG_HI[health] || AG_HI.Unknown)[1]; return svgI(AG_HIK[health] || "unknown", size || 16, c, health === "Progressing" ? "ag-spin" : ""); }
function agSI(sync, size) { var c = (AG_SI[sync] || AG_SI.Unknown)[1]; return svgI(AG_SIK[sync] || "unknown", size || 16, c); }
var SQ_SEVK = { Blocker: "blocker", High: "high", Medium: "medium", Low: "low", Info: "info" }, SQ_SEVCOL = { Blocker: "#c4261d", High: "#e0662b", Medium: "#e69000", Low: "#a08a1e", Info: "#6b7a8c" };
function sqSevIc(sev, size) { return svgI(SQ_SEVK[sev] || "info", size || 14, SQ_SEVCOL[sev] || "#6b7a8c"); }
