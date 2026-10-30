// ===== Argo CD เพิ่ม: repos / clusters / projects / history / app create-edit-delete (ข้อมูลของ Settings ทั้งหมด) =====
function argoX() {
  var A = S.argo; if (!A.x) A.x = { repos: [], projects: [{ name: "default", desc: "", srcs: ["*"], dests: ["*"] }], gpg: [], certs: [], favs: {}, hist: {}, tok: [], theme: "light", pwChanged: false, cl: {} };
  return A.x;
}
function argoClusters() {
  var k1 = argoInst(), X = argoX(), l = [{ name: "in-cluster", server: "https://kubernetes.default.svc", ver: "1.31", st: "Successful" }];
  if (k1 && rmHas(k1, "Apply cluster secret")) l.push({ name: "pharmacy-dev", server: "https://" + (typeof pvIp === "function" ? pvIp("pharmacy-dev") : "10.0.1.20") + ":6443", ver: "1.31", st: "Successful" });
  return l.map(function (c) { var o = X.cl[c.name] || {}; return { name: o.name || c.name, orig: c.name, server: c.server, ver: c.ver, st: c.st, ns: o.ns || "", proj: o.proj || "" }; });
}
function argoRepoOf(a) { var um = /github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/.exec(a.repoURL || ""); return um ? ghRepoOf(um[1], um[2]) : null; }
function argoHist(name, img) {
  if (argoPlaceholder(img)) return; var H = argoX().hist; H[name] = H[name] || []; var l = H[name][H[name].length - 1]; if (l && l.img === img) return;
  H[name].push({ id: (l ? l.id : 0) + 1, img: img, rev: hash32(img).slice(0, 7), at: Date.now() }); if (H[name].length > 10) H[name].shift();
}
function argoCreateApp(f) {
  var er = {}, X = argoX(); f.name = (f.name || "").trim();
  if (!f.name) er.name = "Application Name is required"; else if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(f.name)) er.name = "Application Name must be lowercase alphanumeric or '-'"; else if (S.argo.apps[f.name]) er.name = "application '" + f.name + "' already exists";
  if (!X.projects.some(function (p) { return p.name === f.project; })) er.project = "Project ‘" + f.project + "’ not found";
  if (!/^https?:\/\/.+/.test(f.repo || "")) er.repo = "Repository URL is required (https://…)";
  if (!(f.path || "").trim()) er.path = "Path is required"; if (!(f.ns || "").trim()) er.ns = "Namespace is required";
  if (Object.keys(er).length) return { errors: er };
  var cl = argoClusters().filter(function (c) { return c.orig === f.cluster; })[0] || argoClusters()[0];
  S.argo.apps[f.name] = { name: f.name, repoURL: f.repo.trim(), path: f.path.trim(), destName: cl.orig === "in-cluster" ? "" : cl.orig, destServer: cl.server, ns: f.ns.trim(), auto: f.sync === "auto", project: f.project, rev: f.rev || "main", created: Date.now() };
  return { res: S.argo.apps[f.name] };
}
function argoDiff(name) { var st = argoStatus(name); if (!st || st.sync === "Unknown") return null; var live = st.live, want = st.repoImage; if (live === want) return []; return [live === null ? "(ไม่มี resource ใน cluster)" : "- image: " + live, "+ image: " + want]; }
function argoRollback(name, id) {
  var a = S.argo.apps[name]; if (!a) return { err: "application not found" };
  if (a.auto) return { err: "rollback cannot be initiated when auto-sync is enabled" };
  var e = (argoX().hist[name] || []).filter(function (x) { return x.id === id; })[0]; if (!e) return { err: "history id " + id + " not found" };
  S.argo.live[name] = e.img; return { res: e };
}
