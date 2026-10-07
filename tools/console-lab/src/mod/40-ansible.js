// ===== Ansible แบบจำลอง: dynamic inventory + ping + playbook (ไม่มี DOM) =====
// ponytail: รัน playbook ที่ฝังตอน build (ANSIBLE_PLAN) ไม่ได้อ่านไฟล์ .yml ที่แก้บน laptop จำลอง; ผลของแต่ละ task เป็นกฎตามชื่อ task
var ANS_NEEDS_NET = { "Install packages": "apt", "Install k3s server": "curl", "Install k3s agent and join the cluster": "curl", "Install ArgoCD": "curl", "Install AWS CLI (ใช้ขอรหัสผ่านชั่วคราวของ ECR)": "snap", "Install Docker": "apt", "Build and start Jenkins": "docker", "Start SonarQube": "docker" };
var ANS_RUN = {};
var ANS_ECR_POL = ["AmazonEC2ContainerRegistryReadOnly", "AmazonEC2ContainerRegistryPowerUser", "AdministratorAccess"];

function ansTag(i, k) { if (k === "Name") return i.name; var t = (i.tags || []).filter(function (x) { return x.k === k; })[0]; return t ? t.v : undefined; }
function ansCfg() {
  var inDir = S.laptop.cwd === REPO + "/ansible", t = inDir ? fsRead(REPO + "/ansible/ansible.cfg") : null, m = t && /^\s*private_key_file\s*=\s*(\S+)/m.exec(t), inv = t && /^\s*inventory\s*=\s*(\S+)/m.exec(t);
  return { found: !!t, key: m ? m[1] : "~/.ssh/id_rsa", inventory: inv ? inv[1] : null };
}
// กุญแจที่ถือบน laptop → ชื่อ key pair ที่ตรงกัน (ผ่านเนื้อ public key)
function ansHeldKey(path) {
  var name = normPath(path).split("/").pop(), k = S.laptop.ssh[name]; if (!k || fsRead(path) === null) return { missing: true };
  var kp = S.keys.filter(function (x) { return x.pub && x.pub.split(" ")[1] === k.pub.split(" ")[1]; })[0];
  return { keyName: kp ? kp.name : "" };
}
function ansInventory() {
  var cfg = ansCfg(), warn = [];
  if (!cfg.inventory) return { hosts: [], groups: {}, warn: ["[WARNING]: provided hosts list is empty, only localhost is available. Note that the implicit localhost does not match 'all'"], empty: true };
  if (!fsRead(REPO + "/ansible/" + cfg.inventory)) return { hosts: [], groups: {}, warn: ["[WARNING]: Unable to parse " + REPO + "/ansible/" + cfg.inventory + " as an inventory source", "[WARNING]: provided hosts list is empty, only localhost is available. Note that the implicit localhost does not match 'all'"], empty: true };
  var w = whoAmI();
  if (w.err || !canDo(w, "ec2:DescribeInstances")) {
    var why = w.err ? (w.err === "NoCredentialProviders" ? "Insufficient credentials found: Unable to locate credentials" : w.err + ": " + w.msg) : "UnauthorizedOperation: You are not authorized to perform this operation. (ec2:DescribeInstances)";
    return { hosts: [], groups: {}, warn: ["[WARNING]:  * Failed to parse " + REPO + "/ansible/" + cfg.inventory + " with auto plugin: " + why, "[WARNING]: provided hosts list is empty, only localhost is available. Note that the implicit localhost does not match 'all'"], empty: true, credErr: why };
  }
  var hosts = S.insts.filter(function (i) { return i.state === "running" && ansTag(i, "Project") === "pharmacy" && i.name; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; }), groups = {};
  hosts.forEach(function (i) { var r = ansTag(i, "Role"); if (r) (groups["role_" + r] = groups["role_" + r] || []).push(i); });
  return { hosts: hosts, groups: groups, warn: warn };
}
function ansGraph() {
  var inv = ansInventory(), o = inv.warn.slice(), gs = Object.keys(inv.groups).sort();
  o.push("@all:", "  |--@ungrouped:");
  gs.forEach(function (g) { o.push("  |--@" + g + ":"); inv.groups[g].forEach(function (i) { o.push("  |  |--" + i.name); }); });
  return o;
}
// pattern: a:b  !x  &x  group[0]  group[1:]
function ansMatch(inv, pat) {
  var terms = String(pat).split(/[:,](?![^\[]*\])/), res = [], warn = [];
  function sel(t) {
    var m = /^([^\[]+)(?:\[(-?\d*)(:)?(-?\d*)\])?$/.exec(t), n = m ? m[1] : t, list;
    if (n === "all" || n === "*") list = inv.hosts.slice(); else if (inv.groups[n]) list = inv.groups[n].slice(); else list = inv.hosts.filter(function (i) { return i.name === n; });
    if (m && m[2] !== undefined) {
      var L = list.length, a = m[2] === "" ? 0 : +m[2]; a = a < 0 ? L + a : a;
      if (m[3]) { var e = m[4] === "" ? L : (+m[4] < 0 ? L + +m[4] : +m[4] + 1); list = list.slice(a, e); } else list = list.slice(a, a + 1);
    }
    return list;
  }
  terms.forEach(function (t) {
    if (!t) return;
    var op = /^[!&]/.test(t) ? t[0] : "+", l = sel(op === "+" ? t : t.slice(1));
    if (op === "+") { if (!l.length) warn.push("[WARNING]: Could not match supplied host pattern, ignoring: " + t.replace(/\[.*$/, "")); l.forEach(function (i) { if (res.indexOf(i) < 0) res.push(i); }); }
    else if (op === "!") res = res.filter(function (i) { return l.indexOf(i) < 0; });
    else res = res.filter(function (i) { return l.indexOf(i) >= 0; });
  });
  return { hosts: res, warn: warn };
}
// ผลการ ssh จากเครื่อง laptop ไปหา host (ตาม inventory: ansible_host = public IP)
function ansConnect(inst) {
  var cfg = ansCfg(), k = ansHeldKey(cfg.key);
  if (!inst.publicIp) return { ok: false, msg: "Failed to connect to the host via ssh: ssh: Could not resolve hostname " + inst.name + ": Name or service not known" };
  if (k.missing) return { ok: false, msg: "Failed to connect to the host via ssh: Warning: Identity file " + cfg.key + " not accessible: No such file or directory.\nubuntu@" + inst.publicIp + ": Permission denied (publickey)." };
  var r = sshCheck(inst, k.keyName);
  if (r.kind === "ok") return { ok: true };
  return { ok: false, msg: "Failed to connect to the host via ssh: " + r.out };
}
function ansVm(i) { S.vm = S.vm || {}; if (!S.vm[i.id]) S.vm[i.id] = { done: {}, f: {} }; return S.vm[i.id]; }
function ansVars() {
  var t = fsRead(REPO + "/ansible/group_vars/all/terraform.yml") || "", o = {};
  t.split("\n").forEach(function (l) { var m = /^(\w+):\s*"?([^"]*)"?\s*$/.exec(l); if (m) o[m[1]] = m[2]; });
  return o;
}
function ansUnreach(host, msg) { return '"changed": false, "msg": "' + msg.replace(/\n/g, "\\n") + '", "unreachable": true'; }

function ansPing(pat) {
  var inv = ansInventory(), m = ansMatch(inv, pat || "all"), o = inv.warn.concat(m.warn);
  if (!m.hosts.length && !inv.empty && !m.warn.length) o.push("[WARNING]: No hosts matched, nothing to do");
  m.hosts.forEach(function (i) {
    var c = ansConnect(i);
    if (c.ok) o.push(i.name + " | SUCCESS => {", '    "ansible_facts": {', '        "discovered_interpreter_python": "/usr/bin/python3"', "    },", '    "changed": false,', '    "ping": "pong"', "}");
    else o.push(i.name + " | UNREACHABLE! => {", '    "changed": false,', '    "msg": "' + c.msg.replace(/\n/g, "\\n") + '",', '    "unreachable": true', "}");
  });
  return o;
}

// ---- playbook
function ansExpand(file, out, seen) {
  var plan = ANSIBLE_PLAN[file]; if (!plan) return null;
  plan.forEach(function (p, pi) { if (p.import) ansExpand(p.import, out, seen); else out.push({ file: file, idx: pi, p: p }); });
  return out;
}
function ansStars(s) { return s + " " + new Array(Math.max(3, 79 - s.length)).join("*"); }

// คืน {st, msg}; st: ok|changed|skipping|failed|unreachable
function ansTask(inst, play, task, inv, vars, run) {
  var vm = ansVm(inst), key = play.file + ":" + play.idx + ":" + task.name, once = !!vm.done[key], n = task.name;
  var role = ansTag(inst, "Role"), isDev = role === "k8s_dev", g = inv.groups;
  function fail(msg) { return { st: "failed", msg: msg }; }
  function undef(v) { return fail("The task includes an option with an undefined variable. The error was: " + v); }
  function first(grp) { return g[grp] && g[grp][0]; }
  // when: เงื่อนไขของ task
  if (task.when) {
    if (/not marker\.stat\.exists/.test(task.when) && vm.f.marker) return { st: "skipping" };
    if (/not is_dev/.test(task.when) && isDev) return { st: "skipping" };
    if (/sysctl_file\.changed/.test(task.when) && !ANS_RUN[inst.id + play.file + ":" + play.idx + ":Kernel settings required by SonarQube (/etc/sysctl.d/99-sonarqube.conf)"]) return { st: "skipping" };
  }
  // ต้องออกอินเทอร์เน็ตเพื่อโหลดแพ็กเกจ (ถ้ายังไม่เคยทำสำเร็จ)
  if (ANS_NEEDS_NET[n] && !once && !internetOut(inst)) {
    var how = ANS_NEEDS_NET[n];
    return fail(how === "apt" ? "Failed to update apt cache: W:Failed to fetch http://ap-southeast-1.ec2.archive.ubuntu.com/ubuntu/dists/noble/InRelease  Could not connect (Network is unreachable)" : how === "curl" ? "non-zero return code (rc=6): curl: (6) Could not resolve host: get.k3s.io" : how === "snap" ? "non-zero return code: error: cannot install \"aws-cli\": Post https://api.snapcraft.io/v2/snaps/refresh: dial tcp: lookup api.snapcraft.io: Temporary failure in name resolution" : "non-zero return code (rc=1): failed to pull image: dial tcp: lookup registry-1.docker.io: no such host");
  }
  // ตัวแปรจาก Terraform
  if (/Write \/etc\/default\/ecr-refresh|Write \/opt\/jenkins\/\.env/.test(n) && !vars.ecr_registry) return undef("'ecr_registry' is undefined");
  if (/Write \/opt\/jenkins\/\.env/.test(n)) { if (!first("role_k8s_server")) return undef("list object has no element 0"); if (!first("role_sonarqube")) return undef("list object has no element 0"); }
  if (n === "Render base objects (namespace, DB service, DB secret)" && !(g.role_db || []).length) return undef("'galera_ips' is empty: no hosts in group role_db");
  // ลำดับ/เครือข่ายภายใน
  if (n === "Install k3s agent and join the cluster" && !once) {
    var sv = first("role_k8s_server"); if (!sv || !ansVm(sv).f.k3s_token) return undef("'dict object' has no attribute 'k3s_token'");
    if (!sgAllows(sv.sgIds, 6443, { sgIds: inst.sgIds })) return fail("non-zero return code: [ERROR] Failed to connect to https://" + sv.privateIp + ":6443/cacerts: dial tcp " + sv.privateIp + ":6443: i/o timeout (SG ของ server ไม่เปิด 6443 ให้ agent)");
  }
  if (n === "Start MariaDB (joins the cluster and copies data)") {
    var d1 = first("role_db"), cl = d1 && ansVm(d1).f.cluster;
    if (!cl) return fail("Unable to start service mariadb: WSREP: failed to open gcomm backend connection: 110: failed to reach primary view (no node has bootstrapped the cluster)");
    if (!sgAllows(inst.sgIds, 4567, { sgIds: d1.sgIds }) || !sgAllows(inst.sgIds, 4444, { sgIds: d1.sgIds })) return fail("Unable to start service mariadb: WSREP: failed to open gcomm backend connection: 110: failed to reach primary view (SG ไม่เปิด 4567/4444 ระหว่างเครื่อง DB)");
  }
  if (n === "Create pharmacy_dev, pharmacy_prd and the app user" && !ansVm(inst).f.cluster) return fail("non-zero return code: ERROR 2002 (HY000): Can't connect to local server through socket");
  if (n === "Run the refresh once now") {
    var role2 = inst.profile ? S.roles.filter(function (r) { return r.profile === inst.profile; })[0] : null;
    if (!role2) return fail("Unable to start service ecr-refresh.service: Job failed. journalctl: Unable to locate credentials. You can configure credentials by running \"aws configure\". (เครื่องไม่มี instance profile)");
    if (!role2.policies.some(function (p) { return ANS_ECR_POL.indexOf(p) >= 0; })) return fail("Unable to start service ecr-refresh.service: Job failed. journalctl: An error occurred (AccessDeniedException) when calling the GetAuthorizationToken operation: User: arn:aws:sts::" + ACCOUNT + ":assumed-role/" + role2.name + "/" + inst.id + " is not authorized to perform: ecr:GetAuthorizationToken");
    if (!internetOut(inst)) return fail("Unable to start service ecr-refresh.service: Job failed. journalctl: Could not connect to the endpoint URL: \"https://api.ecr." + REGION + ".amazonaws.com/\"");
  }
  if (/^Apply cluster secret$/.test(n)) {
    var dv = first("role_k8s_dev"); if (!dv) return undef("list object has no element 0"); if (!ansVm(dv).f.dev_token) return undef("'dict object' has no attribute 'dev_token'");
  }
  // สำเร็จ: บันทึกผลลง state ของเครื่อง
  if (n === "Keep the token for the agent play") vm.f.k3s_token = 1;
  if (n === "Read the token" && isDev) vm.f.dev_token = 1;
  if (n === "Write marker file") vm.f.marker = 1;
  if (n === "Start a new cluster" || n === "Start MariaDB (joins the cluster and copies data)") vm.f.cluster = 1;
  vm.done[key] = once ? vm.done[key] : 1;
  var m = task.module.replace("ansible.builtin.", ""), st;
  if (/^(stat|slurp|wait_for|set_fact)$/.test(m)) st = "ok";
  else if (/^(command|shell)$/.test(m)) st = (task.creates || /^Install k3s/.test(n)) && once ? "ok" : "changed";
  else st = once ? "ok" : "changed";
  if (st === "changed") ANS_RUN[inst.id + key] = 1;
  return { st: st };
}

function ansPlaybook(file, opt) {
  ANS_RUN = {}; opt = opt || {}; var o = [], cfg = ansCfg(), plan = ansExpand(file, [], {});
  if (!fsRead(REPO + "/ansible/" + file) && !fsRead(normPath(file))) return { lines: ["ERROR! the playbook: " + file + " could not be found"], rc: 1 };
  if (!plan) return { lines: ["ERROR! the playbook: " + file + " could not be found"], rc: 1 };
  var inv = ansInventory(), vars = ansVars(), dead = {}, stat = {}, lim = opt.limit ? ansMatch(inv, opt.limit) : null;
  o = o.concat(inv.warn);
  function S_(i) { return stat[i.name] = stat[i.name] || { ok: 0, changed: 0, unreachable: 0, failed: 0, skipped: 0 }; }
  plan.forEach(function (pl) {
    var p = pl.p, pat = p.hosts, m = ansMatch(inv, pat), hs = m.hosts.filter(function (i) { return !lim || lim.hosts.indexOf(i) >= 0; });
    o = o.concat(m.warn);
    o.push("", ansStars("PLAY [" + p.name + "]"));
    if (!hs.length) { o.push("skipping: no hosts matched"); return; }
    var batches = []; if (p.serial) for (var b = 0; b < hs.length; b += +p.serial) batches.push(hs.slice(b, b + +p.serial)); else batches.push(hs);
    batches.forEach(function (bt) {
      var alive = bt.filter(function (i) { return !dead[i.name]; });
      function task(title, fn, item) {
        o.push("", ansStars("TASK [" + title + "]"));
        alive.slice().forEach(function (i) {
          var r = fn(i), s = S_(i), tail = item ? " => (item=" + item + ")" : "";
          if (r.st === "unreachable") { s.unreachable++; dead[i.name] = 1; alive.splice(alive.indexOf(i), 1); o.push("fatal: [" + i.name + "]: UNREACHABLE! => {" + ansUnreach(i.name, r.msg) + "}"); }
          else if (r.st === "failed") { s.failed++; dead[i.name] = 1; alive.splice(alive.indexOf(i), 1); o.push("fatal: [" + i.name + "]: FAILED! => {\"changed\": false, \"msg\": \"" + r.msg.replace(/"/g, "'") + "\"}"); }
          else if (r.st === "skipping") { s.skipped++; o.push("skipping: [" + i.name + "]"); }
          else { s[r.st]++; o.push(r.st + ": [" + i.name + "]" + tail); }
        });
      }
      task("Gathering Facts", function (i) { var c = ansConnect(i); return c.ok ? { st: "ok" } : { st: "unreachable", msg: c.msg }; });
      p.tasks.forEach(function (t) {
        if (!alive.length) return;
        if (t.loop) { t.loop.forEach(function (it) { task(t.name, function (i) { return ansTask(i, pl, t, inv, vars); }, it); }); return; }
        task(t.name, function (i) { return ansTask(i, pl, t, inv, vars); });
      });
    });
  });
  o.push("", ansStars("PLAY RECAP"));
  var names = Object.keys(stat).sort(), w = Math.max.apply(null, names.map(function (x) { return x.length; }).concat([10]));
  names.forEach(function (n) { var s = stat[n]; o.push(n + new Array(w - n.length + 1).join(" ") + " : ok=" + s.ok + "    changed=" + s.changed + "    unreachable=" + s.unreachable + "    failed=" + s.failed + "    skipped=" + s.skipped + "    rescued=0    ignored=0"); });
  var bad = names.some(function (n) { return stat[n].failed || stat[n].unreachable; });
  return { lines: o, rc: bad ? (names.some(function (n) { return stat[n].failed; }) ? 2 : 4) : 0 };
}
