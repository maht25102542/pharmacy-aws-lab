// ===== เครื่องของผู้ใช้ (laptop) แบบจำลอง: ไฟล์ใน repo, กุญแจ SSH, credentials ของ AWS CLI =====
function labInit() {
  S.laptop = { cwd: REPO + "/terraform", fs: {}, creds: null, awsRegion: "", ssh: { id_ed25519: { pub: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILabLaptopKeyExample0000000000000000000000000 swd@laptop" } } };
}
function normPath(p, cwd) {
  p = String(p || "");
  if (p === "~" || p.indexOf("~/") === 0) p = HOME + p.slice(1);
  if (p[0] !== "/") p = (cwd || S.laptop.cwd) + "/" + p;
  var out = []; p.split("/").forEach(function (x) { if (!x || x === ".") return; if (x === "..") out.pop(); else out.push(x); });
  return "/" + out.join("/");
}
function fsBaseFiles() {
  var o = {}; Object.keys(LABFILES).forEach(function (k) { o[REPO + "/" + k] = LABFILES[k]; });
  var L = S.laptop;
  Object.keys(L.ssh).forEach(function (k) { o[HOME + "/.ssh/" + k + ".pub"] = L.ssh[k].pub + "\n"; o[HOME + "/.ssh/" + k] = "-----BEGIN OPENSSH PRIVATE KEY-----\n(กุญแจ private จำลอง: เนื้อจริงไม่ถูกแสดง)\n-----END OPENSSH PRIVATE KEY-----\n"; });
  if (L.creds) o[HOME + "/.aws/credentials"] = "[default]\naws_access_key_id = " + L.creds.id + "\naws_secret_access_key = ********\n";
  if (L.awsRegion) o[HOME + "/.aws/config"] = "[default]\nregion = " + L.awsRegion + "\noutput = json\n";
  if (S.tf.serial > 0) o[REPO + "/terraform/terraform.tfstate"] = JSON.stringify({ version: 4, terraform_version: "1.x (จำลอง)", serial: S.tf.serial, resources: Object.keys(S.tf.state).sort() }, null, 2) + "\n";
  return o;
}
function fsRead(p) {
  p = normPath(p); var L = S.laptop;
  if (Object.prototype.hasOwnProperty.call(L.fs, p)) return L.fs[p];
  var b = fsBaseFiles(); return Object.prototype.hasOwnProperty.call(b, p) ? b[p] : null;
}
function fsWrite(p, t) { S.laptop.fs[normPath(p)] = t; }
function fsRemove(p) { p = normPath(p); if (fsRead(p) === null) return false; S.laptop.fs[p] = null; return true; }
function fsAll() {
  var b = fsBaseFiles(), L = S.laptop, o = {};
  Object.keys(b).forEach(function (k) { o[k] = b[k]; });
  Object.keys(L.fs).forEach(function (k) { if (L.fs[k] === null) delete o[k]; else o[k] = L.fs[k]; });
  return o;
}
function fsIsDir(p) { p = normPath(p); if (p === "/") return true; var pre = p + "/"; return Object.keys(fsAll()).some(function (k) { return k.indexOf(pre) === 0; }) || (S.tf.inited && p === REPO + "/terraform/.terraform"); }
function fsList(dir) {
  dir = normPath(dir); var pre = dir === "/" ? "/" : dir + "/", seen = {}, out = [];
  Object.keys(fsAll()).forEach(function (k) { if (k.indexOf(pre) !== 0) return; var rest = k.slice(pre.length), name = rest.split("/")[0], isDir = rest.indexOf("/") >= 0; if (!seen[name]) { seen[name] = 1; out.push({ name: name, dir: isDir }); } });
  if (S.tf.inited && dir === REPO + "/terraform" && !seen[".terraform"]) out.push({ name: ".terraform", dir: true });
  if (S.tf.inited && dir === REPO + "/terraform" && !seen[".terraform.lock.hcl"]) out.push({ name: ".terraform.lock.hcl", dir: false });
  return out.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
}
function tfFilesIn(dir) {
  var o = {}; fsList(dir).forEach(function (e) { if (!e.dir && /\.tf$/.test(e.name)) o[e.name] = fsRead(dir + "/" + e.name); }); return o;
}
// รหัสแฮชของ secret (ไม่เก็บ secret จริง) ไว้ตรวจตอน aws configure
function hash32(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
// credentials ที่ถือบน laptop → ใช้ตัดสินว่าเรียก AWS ได้ไหม และเป็นใคร
function whoAmI() {
  if (S.acct === "suspended") return { err: "AuthFailure", msg: "This account is currently blocked and not recognized as a valid account." };
  var c = S.laptop.creds; if (!c) return { err: "NoCredentialProviders", msg: "no valid credential sources found" };
  var u = null, k = null;
  S.users.forEach(function (x) { x.keys.forEach(function (y) { if (y.id === c.id) { u = x; k = y; } }); });
  if (!k) return { err: "InvalidClientTokenId", msg: "The security token included in the request is invalid." };
  if (!k.active) return { err: "InvalidClientTokenId", msg: "The security token included in the request is invalid. (access key ถูก Deactivate แล้ว)" };
  if (k.secretHash !== c.secretHash) return { err: "SignatureDoesNotMatch", msg: "The request signature we calculated does not match the signature you provided. Check your AWS Secret Access Key and signing method." };
  return { user: u, arn: "arn:aws:iam::" + ACCOUNT + ":user/" + u.name, userId: "AIDAEXAMPLE" + u.id.slice(-9).toUpperCase() };
}
function canDo(who, action) {
  if (!who.user) return false;
  var acts = []; who.user.policies.forEach(function (n) { if (POLICY_DEF[n] && POLICY_DEF[n].actions) acts = acts.concat(POLICY_DEF[n].actions); });
  return allowsAction(acts, action);
}
