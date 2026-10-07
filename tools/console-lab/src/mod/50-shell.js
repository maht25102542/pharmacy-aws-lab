// ===== เทอร์มินัลของ laptop จำลอง (ไม่มี DOM): shellRun(line) → {lines, ask?, edit?, clear?} =====
// ask = { label, secret, done(answer) → ผลลัพธ์เดียวกับ shellRun } ใช้กับคำถามแบบ interactive (aws configure, terraform apply)
var SH_HELP = ["คำสั่งที่ใช้ได้ (จำลอง):", "  pwd, cd, ls [-la], cat, rm, cp, mkdir, echo, clear, history   เครื่องมือไฟล์พื้นฐาน", "  edit <file>                    เปิดตัวแก้ไขไฟล์ (แทน vim/nano)", "  ssh-keygen -t ed25519 [-f ~/.ssh/ชื่อ]", "  ssh [-i key] ubuntu@<ip>", "  aws configure | aws configure list | aws sts get-caller-identity", "  aws ec2 describe-instances | aws ecr describe-repositories", "  terraform init|validate|plan|apply|destroy|output|state list|state show <addr>   (-auto-approve, -var 'k=v')", "  ansible-inventory --graph", "  ansible <pattern> -m ping", "  ansible-playbook <file>.yml [--limit <pattern>]"];

function shTok(line) {
  var out = [], re = /"([^"]*)"|'([^']*)'|(\S+)/g, m; while ((m = re.exec(line))) out.push(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]); return out;
}
function shErr(cmd, msg) { return { lines: [cmd + ": " + msg] }; }
function shFmtLs(dir, long, all) {
  var es = fsList(dir).filter(function (e) { return all || e.name[0] !== "."; });
  if (!long) return [es.map(function (e) { return e.name + (e.dir ? "/" : ""); }).join("  ")];
  return ["total " + es.length * 4].concat(es.map(function (e) { var f = e.dir ? null : fsRead(dir + "/" + e.name); return (e.dir ? "drwxr-xr-x" : "-rw-r--r--") + " 1 swd swd " + String(e.dir ? 4096 : (f || "").length).padStart(6) + " Oct  7 09:00 " + e.name; }));
}
function shConfirm(lines, run) { return { lines: lines.concat(["", "Do you want to perform these actions?", "  Terraform will perform the actions described above.", "  Only 'yes' will be accepted to approve.", ""]), ask: { label: "  Enter a value: ", done: function (a) { return a === "yes" ? { lines: run() } : { lines: ["", "Apply cancelled.", ""] }; } } }; }
function shTerraform(a) {
  var sub = a[0], dir = S.laptop.cwd, cli = {}, auto = false, rest = [];
  for (var i = 1; i < a.length; i++) { if (a[i] === "-auto-approve") auto = true; else if (a[i] === "-var" && a[i + 1]) { var kv = a[++i].split("="); cli[kv[0]] = kv.slice(1).join("="); } else if (/^-var=/.test(a[i])) { var kv2 = a[i].slice(5).split("="); cli[kv2[0]] = kv2.slice(1).join("="); } else rest.push(a[i]); }
  if (!sub) return { lines: ["Usage: terraform [global options] <subcommand> [args]", "", "  init, validate, plan, apply, destroy, output, state"] };
  if (sub === "init") return { lines: tfInitCmd(dir) };
  if (sub === "validate") return { lines: tfValidateCmd(dir) };
  if (sub === "output") return { lines: tfOutputCmd(rest[0]) };
  if (sub === "state") return { lines: rest[0] === "list" ? tfStateList() : rest[0] === "show" ? tfStateShow(rest[1] || "") : ["Usage: terraform state <list|show>"] };
  if (sub !== "plan" && sub !== "apply" && sub !== "destroy") return { lines: ["Terraform has no command named \"" + sub + "\"."] };
  var destroy = sub === "destroy";
  function go() {
    var p = tfPlanCmd(dir, cli, destroy);
    if (p.needVars) { var nm = p.needVars[0]; return { lines: [], ask: { label: "var." + nm + "\n  Enter a value: ", done: function (v) { cli[nm] = v; return go(); } } }; }
    if (sub === "plan" || !p.prep) return { lines: p.lines };
    if (/No changes\./.test(p.lines.join("\n")) && !destroy) return { lines: p.lines.concat(["", "Apply complete! Resources: 0 added, 0 changed, 0 destroyed."]) };
    if (auto) return { lines: p.lines.concat(tfApplyCmd(p)) };
    return shConfirm(p.lines, function () { return tfApplyCmd(p); });
  }
  return go();
}
function shAws(a) {
  var w;
  if (a[0] === "configure" && a[1] === "list") { var c = S.laptop.creds; return { lines: ["      Name                    Value             Type    Location", "      ----                    -----             ----    --------", "   profile                <not set>             None    None", "access_key     " + (c ? "****************" + c.id.slice(-4) : "<not set>").padStart(16) + " shared-credentials-file", "secret_key     " + (c ? "****************" + "????" : "<not set>").padStart(16) + " shared-credentials-file", "    region     " + (S.laptop.awsRegion || "<not set>").padStart(16) + " config-file    ~/.aws/config"] }; }
  if (a[0] === "configure") {
    var st = {};
    return { lines: [], ask: { label: "AWS Access Key ID [None]: ", done: function (id) { st.id = id; return { lines: [], ask: { label: "AWS Secret Access Key [None]: ", secret: true, done: function (sec) { st.sec = sec; return { lines: [], ask: { label: "Default region name [None]: ", done: function (rg) { st.rg = rg; return { lines: [], ask: { label: "Default output format [None]: ", done: function () { if (st.id) S.laptop.creds = { id: st.id, secretHash: hash32(st.sec), region: st.rg }; if (st.rg) S.laptop.awsRegion = st.rg; return { lines: [] }; } } }; } } }; } } }; } } };
  }
  w = whoAmI();
  var op = a[0] + " " + a[1];
  if (op === "sts get-caller-identity") {
    if (w.err) return { lines: w.err === "NoCredentialProviders" ? ["Unable to locate credentials. You can configure credentials by running \"aws configure\"."] : ["", "An error occurred (" + w.err + ") when calling the GetCallerIdentity operation: " + w.msg] };
    return { lines: ["{", '    "UserId": "' + w.userId + '",', '    "Account": "' + ACCOUNT + '",', '    "Arn": "' + w.arn + '"', "}"] };
  }
  function need(act, opn, f) {
    if (w.err) return { lines: w.err === "NoCredentialProviders" ? ["Unable to locate credentials. You can configure credentials by running \"aws configure\"."] : ["", "An error occurred (" + w.err + ") when calling the " + opn + " operation: " + w.msg] };
    if (!canDo(w, act)) return { lines: ["", "An error occurred (UnauthorizedOperation) when calling the " + opn + " operation: You are not authorized to perform this operation. User: " + w.arn + " is not authorized to perform: " + act] };
    return { lines: f() };
  }
  if (op === "ec2 describe-instances") return need("ec2:DescribeInstances", "DescribeInstances", function () { return ["{", '    "Reservations": [', S.insts.filter(function (i) { return i.state !== "terminated"; }).map(function (i) { return '        { "InstanceId": "' + i.id + '", "Name": "' + i.name + '", "State": "' + i.state + '", "PublicIp": "' + (i.publicIp || "") + '", "PrivateIp": "' + i.privateIp + '" }'; }).join(",\n"), "    ]", "}"]; });
  if (op === "ecr describe-repositories") return need("ecr:DescribeRepositories", "DescribeRepositories", function () { return ["{", '    "repositories": [', S.repos.map(function (r) { return '        { "repositoryName": "' + r.name + '" }'; }).join(",\n"), "    ]", "}"]; });
  return { lines: ["aws: คำสั่งนี้ยังไม่จำลอง (มี: configure, sts get-caller-identity, ec2 describe-instances, ecr describe-repositories)"] };
}
function shSsh(a) {
  var key = null, tgt = null; for (var i = 0; i < a.length; i++) { if (a[i] === "-i") key = a[++i]; else if (a[i][0] !== "-") tgt = a[i]; }
  if (!tgt) return { lines: ["usage: ssh [-i identity_file] user@host"] };
  var host = tgt.replace(/^.*@/, ""), inst = S.insts.filter(function (i) { return i.state !== "terminated" && (i.publicIp === host || i.privateIp === host); })[0];
  if (!inst) return { lines: ["ssh: connect to host " + host + " port 22: Connection timed out"] };
  var k = ansHeldKey(key || "~/.ssh/id_ed25519"); if (k.missing) return { lines: ["Warning: Identity file " + (key || "~/.ssh/id_ed25519") + " not accessible: No such file or directory.", "ubuntu@" + host + ": Permission denied (publickey)."] };
  if (inst.publicIp !== host) return { lines: ["ssh: connect to host " + host + " port 22: Connection timed out  (IP ส่วนตัวเข้าจาก laptop ไม่ได้)"] };
  return { lines: [sshCheck(inst, k.keyName).out] };
}
function shRun(line) {
  var a = shTok(line); if (!a.length) return { lines: [] };
  var c = a.shift(), L = S.laptop;
  if (c === "help") return { lines: SH_HELP };
  if (c === "clear") return { lines: [], clear: true };
  if (c === "pwd") return { lines: [L.cwd] };
  if (c === "echo") return { lines: [a.join(" ")] };
  if (c === "cd") { var d = normPath(a[0] || "~"); if (!fsIsDir(d)) return shErr("cd", a[0] + ": No such file or directory"); L.cwd = d; return { lines: [] }; }
  if (c === "ls") { var long = a.some(function (x) { return /^-.*l/.test(x); }), all = a.some(function (x) { return /^-.*a/.test(x); }), t = a.filter(function (x) { return x[0] !== "-"; })[0] || "."; var p = normPath(t); if (fsRead(p) !== null) return { lines: [t] }; if (!fsIsDir(p)) return shErr("ls", "cannot access '" + t + "': No such file or directory"); return { lines: shFmtLs(p, long, all) }; }
  if (c === "cat") { var o = []; for (var i = 0; i < a.length; i++) { var f = fsRead(a[i]); if (f === null) o.push("cat: " + a[i] + ": No such file or directory"); else o.push(f.replace(/\n$/, "")); } return { lines: o }; }
  if (c === "rm") { var o2 = []; a.filter(function (x) { return x[0] !== "-"; }).forEach(function (x) { if (!fsRemove(x)) o2.push("rm: cannot remove '" + x + "': No such file or directory"); }); return { lines: o2 }; }
  if (c === "cp") { var s = fsRead(a[0]); if (s === null) return shErr("cp", "cannot stat '" + a[0] + "': No such file or directory"); var dst = normPath(a[1]); if (fsIsDir(dst)) dst += "/" + normPath(a[0]).split("/").pop(); fsWrite(dst, s); return { lines: [] }; }
  if (c === "mkdir") return { lines: [] };
  if (c === "edit" || c === "vim" || c === "nano" || c === "vi") { if (!a[0]) return shErr(c, "ต้องระบุไฟล์"); return { lines: [], edit: normPath(a[0]) }; }
  if (c === "ssh-keygen") {
    var fi = a.indexOf("-f"), path = fi >= 0 ? normPath(a[fi + 1]) : HOME + "/.ssh/id_ed25519", name = path.split("/").pop();
    if (path.indexOf(HOME + "/.ssh/") !== 0) return shErr("ssh-keygen", "จำลองให้สร้างได้เฉพาะใน ~/.ssh/");
    function mk() { var body = ""; for (var i2 = 0; i2 < 43; i2++) body += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]; L.ssh[name] = { pub: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + body + " swd@laptop" }; return { lines: ["Your identification has been saved in " + path, "Your public key has been saved in " + path + ".pub", "The key fingerprint is:", "SHA256:" + body + " swd@laptop"] }; }
    if (L.ssh[name]) return { lines: [], ask: { label: path + " already exists.\nOverwrite (y/n)? ", done: function (x) { return /^y/i.test(x) ? mk() : { lines: [] }; } } };
    return mk();
  }
  if (c === "ssh") return shSsh(a);
  if (c === "aws") return shAws(a);
  if (c === "terraform") return shTerraform(a);
  if (c === "ansible-inventory") return { lines: a.indexOf("--graph") >= 0 ? ansGraph() : ["ใช้ --graph (จำลองแค่แบบนี้)"] };
  if (c === "ansible") { var mi = a.indexOf("-m"); if (mi < 0 || a[mi + 1] !== "ping") return { lines: ["ansible: จำลองเฉพาะ -m ping"] }; return { lines: ansPing(a[0]) }; }
  if (c === "ansible-playbook") { var li = a.indexOf("--limit"), pb = a.filter(function (x, j) { return x[0] !== "-" && (li < 0 || j !== li + 1); })[0]; if (!pb) return { lines: ["usage: ansible-playbook [options] playbook.yml"] }; return { lines: ansPlaybook(pb, { limit: li >= 0 ? a[li + 1] : null }).lines }; }
  return { lines: ["bash: " + c + ": command not found  (พิมพ์ help ดูคำสั่งที่จำลอง)"] };
}
