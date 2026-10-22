// ===== GitHub + git จำลอง (ไม่มี DOM): repo-backend / repo-frontend / repo-manifests บน laptop → push → GitHub =====
// ponytail: ไม่จำลอง auth ของ GitHub (ข้ามการถาม username/token) และไม่มี branch อื่นนอกจาก main
var GH_DIRS = { "repo-backend": "pharmacy-backend", "repo-frontend": "pharmacy-frontend", "repo-manifests": "pharmacy-manifests" };
function ghUser() { return ansVars().github_user || "YOUR_GITHUB_USER"; }
function ghDirName(cwd) { var m = /\/(repo-backend|repo-frontend|repo-manifests)(\/|$)/.exec(cwd); return m ? m[1] : null; }
function ghSnapshot(dirName) { var base = REPO + "/" + dirName + "/", all = fsAll(), o = {}; Object.keys(all).forEach(function (k) { if (k.indexOf(base) === 0) o[k.slice(base.length)] = all[k]; }); return o; }
function ghRepoOf(user, name) { ghInit(); var r = S.gh.repos[name]; return r && r.user === user ? r : null; }
function gitCmd(a, cwd) {
  ghInit(); var dn = ghDirName(cwd); if (!dn) return ["fatal: not a git repository (or any of the parent directories): .git  (cd ~/Desktop/work/pharmacy-aws-lab/repo-backend, repo-frontend หรือ repo-manifests)"];
  var L0 = S.gh.local[dn] = S.gh.local[dn] || { init: false, staged: false, commit: null, remote: "", tags: [] }, c = a[0];
  if (c === "init") { L0.init = true; return ["Initialized empty Git repository in " + REPO + "/" + dn + "/.git/"]; }
  if (!L0.init) return ["fatal: not a git repository (or any of the parent directories): .git  (ต้อง git init -b main ก่อน)"];
  if (c === "add") { L0.staged = true; return []; }
  if (c === "commit") { if (!L0.staged) return ["On branch main", "nothing added to commit but untracked files present (use \"git add\" to track)"]; var mi = a.indexOf("-m"); if (mi < 0 || !a[mi + 1]) return ["Aborting commit due to empty commit message."]; L0.commit = ghSnapshot(dn); L0.staged = false; L0.n = (L0.n || 0) + 1; var files = Object.keys(L0.commit).length; return ["[main " + (L0.n === 1 ? "(root-commit) " : "") + hash32(a[mi + 1] + L0.n).slice(0, 7) + "] " + a[mi + 1], " " + files + " files changed"]; }
  if (c === "remote") { if (a[1] === "add" && a[2] === "origin" && a[3]) { if (!/^https:\/\/github\.com\/[^\/]+\/[^\/]+\.git$/.test(a[3])) return ["fatal: ใช้รูปแบบ https://github.com/<user>/<repo>.git"]; L0.remote = a[3]; return []; } if (a[1] === "-v") return L0.remote ? ["origin\t" + L0.remote + " (fetch)", "origin\t" + L0.remote + " (push)"] : []; return ["git remote: จำลองเฉพาะ add origin <url> / -v"]; }
  if (c === "pull") { if (!L0.remote) return ["fatal: No remote repository specified."]; var pm = /github\.com\/([^\/]+)\/([^\/]+?)\.git$/.exec(L0.remote), pr = pm && S.gh.repos[pm[2]]; if (!pr) return ["fatal: repository '" + L0.remote + "' not found"]; if (pr.n === (L0.synced || 0)) return ["Already up to date."]; Object.keys(pr.files).forEach(function (k) { if (pr.files[k] !== (L0.base || {})[k]) fsWrite(REPO + "/" + dn + "/" + k, pr.files[k]); }); L0.base = JSON.parse(JSON.stringify(pr.files)); L0.synced = pr.n; L0.staged = false; L0.commit = ghSnapshot(dn); return ["Updating " + hash32("a") .slice(0, 7) + ".." + hash32("b").slice(0, 7), "Fast-forward"]; }
  if (c === "tag") { if (!a[1]) return L0.tags.slice().sort(); if (!L0.commit) return ["fatal: Failed to resolve 'HEAD' as a valid ref.  (ต้อง commit ก่อนติด tag)"]; if (L0.tags.indexOf(a[1]) >= 0) return ["fatal: tag '" + a[1] + "' already exists"]; L0.tags.push(a[1]); return []; }
  if (c === "push") {
    if (!L0.remote) return ["fatal: No configured push destination.  (git remote add origin <url> ก่อน)"];
    var m = /github\.com\/([^\/]+)\/([^\/]+?)\.git$/.exec(L0.remote), want = GH_DIRS[dn], o = ["To " + L0.remote];
    if (m[2] !== want) o.push("(หมายเหตุ: repo นี้ควรชื่อ " + want + ")");
    var rp = S.gh.repos[m[2]]; var tagOnly = a.slice(1).filter(function (x) { return x[0] !== "-" && x !== "origin" && x !== "main"; }), allTags = a.indexOf("--tags") >= 0;
    if (!tagOnly.length && !allTags) { if (!L0.commit) return ["error: src refspec main does not match any", "error: failed to push some refs to '" + L0.remote + "'"]; if (!rp) rp = S.gh.repos[m[2]] = { user: m[1], files: {}, tags: [] }; if (rp.n > (L0.synced || 0)) return o.concat([" ! [rejected]        main -> main (fetch first)", "error: failed to push some refs to '" + L0.remote + "'", "hint: Updates were rejected because the remote contains work that you do not have locally. (git pull ก่อน แล้ว commit/push ใหม่)"]); rp.user = m[1]; rp.files = JSON.parse(JSON.stringify(L0.commit)); rp.n = rp.n || 0; L0.synced = rp.n; L0.base = JSON.parse(JSON.stringify(rp.files)); o.push(" * [new branch]      main -> main"); if (a.indexOf("-u") >= 0) o.push("branch 'main' set up to track 'origin/main'."); return o; }
    if (!rp) return ["fatal: repository '" + L0.remote + "' not found  (push branch main ก่อน: git push -u origin main)"];
    (allTags ? L0.tags : tagOnly).forEach(function (x) { if (L0.tags.indexOf(x) < 0) o.push("error: src refspec " + x + " does not match any"); else if (rp.tags.indexOf(x) < 0) { rp.tags.push(x); o.push(" * [new tag]         " + x + " -> " + x); } });
    return o.length > 1 ? o : ["Everything up-to-date"];
  }
  return ["git: จำลองเฉพาะ init / add / commit -m / remote add origin / tag / push"];
}
// อ่านค่า image ของ deployment.yaml ใน snapshot ของ repo manifests
function ghImageOf(rp, path) { var t = rp && rp.files[path + "/deployment.yaml"]; var m = t && /image:\s*(\S+)/.exec(t); return m ? m[1] : ""; }
