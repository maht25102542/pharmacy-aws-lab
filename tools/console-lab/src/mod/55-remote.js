// ===== shell ภายใน VM แบบจำลอง (หลัง ssh สำเร็จ): สถานะอ่านจากสิ่งที่ ansible-playbook ติดตั้งไปแล้ว =====
// ponytail: รองรับเฉพาะคำสั่งที่ใช้ตรวจ lab นี้ ผลลัพธ์จำลองจากความจำ ไม่ใช่ของจริง
function rmHas(i, n) { var d = ansVm(i).done; return Object.keys(d).some(function (k) { var t = k.split(":").slice(2).join(":"); return t === n || t.indexOf(n + "#") === 0; }); }
function rmHost(i) { return "ip-" + i.privateIp.replace(/\./g, "-"); }
function rmInst() { return S.laptop.remote ? find(S.insts, S.laptop.remote) : null; }
function rmPrompt(i) { return S.laptop.via === "ssm" ? "sh-5.2$ " : "ubuntu@" + rmHost(i) + ":" + (S.laptop.rcwd || "~") + "$ "; }
function rmRole(i) { return ansTag(i, "Role"); }
function rmFirst(role) { return S.insts.filter(function (x) { return x.state === "running" && ansTag(x, "Role") === role; })[0]; }
// ArgoCD ลงครั้งเดียวผ่านเครื่อง server แรก แต่เป็นของทั้ง cluster prd: kubectl จาก server ไหนก็เห็น
function rmArgo() { return S.insts.some(function (x) { return x.state === "running" && ansTag(x, "Role") === "k8s_server" && rmHas(x, "Install ArgoCD"); }); }
function rmEnv() {
  var v = ansVars(), sq = rmFirst("sonarqube"), k8 = rmFirst("k8s_server");
  return "AWS_DEFAULT_REGION=" + (v.aws_region || "") + "\nECR_REGISTRY=" + (v.ecr_registry || "") + "\nSONAR_HOST_URL=http://" + (sq ? sq.privateIp : "") + ":9000\nARGOCD_SERVER=" + (k8 ? k8.privateIp : "") + ":30443\nMANIFESTS_REPO=github.com/" + (v.github_user || "YOUR_GITHUB_USER") + "/pharmacy-manifests.git\n";
}
function rmServices(i) {
  var r = rmRole(i), s = {};
  if ((r === "jenkins" || r === "sonarqube") && rmHas(i, "Install Docker")) s.docker = "Docker Application Container Engine";
  if (r === "db" && rmHas(i, "Install packages")) s.mariadb = "MariaDB 10.11 database server";
  if ((r === "k8s_server" || r === "k8s_dev") && (rmHas(i, "Install k3s server") || rmHas(i, "Install k3s server and join the cluster"))) s.k3s = "Lightweight Kubernetes";
  if ((r === "k8s_server" || r === "k8s_dev") && rmHas(i, "Enable the timer")) s["ecr-refresh.timer"] = "Refresh ECR pull secret";
  return s;
}
function rmRunning(i, name) { return name === "mariadb" ? !!ansVm(i).f.cluster : true; }
function rmDocker(i) {
  var r = rmRole(i);
  if (r === "jenkins" && rmHas(i, "Build and start Jenkins")) return [["a1b2c3d4e5f6", "jenkins-jenkins", '"/usr/bin/tini -- /usr/local/bin/jenkins.sh"', "0.0.0.0:8080->8080/tcp, 50000/tcp", "jenkins"]];
  if (r === "sonarqube" && rmHas(i, "Start SonarQube")) return [["b2c3d4e5f6a1", "sonarqube:community", '"/opt/sonarqube/docker/entrypoint.sh"', "0.0.0.0:9000->9000/tcp", "sonarqube"], ["c3d4e5f6a1b2", "postgres:16", '"docker-entrypoint.sh postgres"', "5432/tcp", "sonarqube-db"]];
  return [];
}
function rmTable(head, rows) { var w = head.map(function (h0, c) { return Math.max(h0.length, Math.max.apply(null, rows.map(function (r) { return String(r[c]).length; }).concat([0]))); }); return [head, ].concat(rows).map(function (r) { return r.map(function (x, c) { return String(x) + new Array(w[c] - String(x).length + 3).join(" "); }).join("").replace(/\s+$/, ""); }); }
function rmPath(p) { var c = S.laptop.rcwd || "~"; if (!p) return c === "~" ? "/home/ubuntu" : c; if (p === "~") return "/home/ubuntu"; if (p[0] === "/") return p.replace(/\/+$/, "") || "/"; var b = c === "~" ? "/home/ubuntu" : c; return normPath(b + "/" + p); }
function rmCat(i, p, sudo) {
  var r = rmRole(i);
  if (p === "/opt/jenkins/.env" && r === "jenkins" && rmHas(i, "Write /opt/jenkins/.env (ค่าที่ pipeline อ่านเป็นตัวแปรสภาพแวดล้อม)")) return sudo ? (ansVm(i).f.env || rmEnv()).split("\n").slice(0, -1) : ["cat: /opt/jenkins/.env: Permission denied  (ไฟล์ mode 0600 เจ้าของ root ลอง sudo cat)"];
  if (p === "/opt/jenkins/docker-compose.yml" && r === "jenkins" && rmHas(i, "Copy Jenkins files to /opt/jenkins")) return LABFILES["vm-jenkins/docker-compose.yml"].split("\n");
  if (p === "/opt/sonarqube/docker-compose.yml" && r === "sonarqube" && rmHas(i, "Copy SonarQube files to /opt/sonarqube")) return LABFILES["vm-sonarqube/docker-compose.yml"].split("\n");
  if (p === "/etc/default/ecr-refresh" && /^k8s_(server|dev)$/.test(r) && rmHas(i, "Write /etc/default/ecr-refresh")) return ["ECR_REGISTRY=" + (ansVars().ecr_registry || ""), "NAMESPACES=" + (r === "k8s_dev" ? "dev" : "prd"), "AWS_DEFAULT_REGION=" + (ansVars().aws_region || "")];
  return ["cat: " + p + ": No such file or directory"];
}
function rmLs(i, p, all) {
  var r = rmRole(i), f = null;
  if (p === "/home/ubuntu") f = all ? [".bash_logout", ".bashrc", ".profile", ".ssh"] : [];
  else if (p === "/opt") f = r === "jenkins" && rmHas(i, "Copy Jenkins files to /opt/jenkins") ? ["jenkins"] : r === "sonarqube" && rmHas(i, "Copy SonarQube files to /opt/sonarqube") ? ["sonarqube"] : [];
  else if (p === "/opt/jenkins" && r === "jenkins" && rmHas(i, "Copy Jenkins files to /opt/jenkins")) f = ["Dockerfile", "WHERE.md", "docker-compose.yml", "plugins.txt"].concat(rmHas(i, "Write /opt/jenkins/.env (ค่าที่ pipeline อ่านเป็นตัวแปรสภาพแวดล้อม)") ? [".env"] : []);
  else if (p === "/opt/sonarqube" && r === "sonarqube" && rmHas(i, "Copy SonarQube files to /opt/sonarqube")) f = ["WHERE.md", "docker-compose.yml"].concat(rmHas(i, "Write /opt/sonarqube/.env") ? [".env"] : []);
  else if (p === "/usr/local/bin" && /^k8s_(server|dev)$/.test(r)) f = ["ecr-refresh.sh"].concat(rmHas(i, "Install k3s server") ? ["k3s"] : []);
  if (f === null) return ["ls: cannot access '" + p + "': No such file or directory"];
  f = f.filter(function (x) { return all || x[0] !== "."; }).sort(); return f.length ? [f.join("  ")] : [];
}
function remoteRun(i, line) {
  if (/argocd-initial-admin-secret/.test(line) && /(kubectl|k3s)/.test(line)) { if (rmRole(i) !== "k8s_server" || !rmArgo()) return { lines: ["Error from server (NotFound): namespaces \"argocd\" not found"] }; return { lines: [/base64\s+-d/.test(line) ? argoPwdOf(i) : "(base64)"] }; }
  var a = shTok(line); if (!a.length) return { lines: [] };
  var sudo = false; if (a[0] === "sudo") { sudo = true; a.shift(); } var c = a.shift() || "", r = rmRole(i);
  if (c === "exit" || c === "logout") { var viaS = S.laptop.via === "ssm"; S.laptop.remote = null; S.laptop.rcwd = "~"; S.laptop.via = ""; return { lines: viaS ? ["", "Exiting session with sessionId: " + (S.laptop.sid || "session") + "."] : ["logout", "Connection to " + (i.publicIp || i.privateIp) + " closed."] }; }
  if (c === "clear") return { lines: [], clear: true };
  if (c === "help") return { lines: ["คำสั่งใน VM (จำลอง): whoami hostname pwd cd ls [-a] cat systemctl status <svc> docker ps curl -s localhost:<port> k3s kubectl get nodes|ns|pods mysql -e \"SHOW STATUS LIKE 'wsrep_cluster_size'\" exit"] };
  if (c === "whoami") return { lines: [sudo ? "root" : "ubuntu"] };
  if (c === "hostname") return { lines: [rmHost(i)] };
  if (c === "pwd") return { lines: [rmPath("")] };
  if (c === "cd") { var np = rmPath(a[0] || "~"); if (rmLs(i, np, true)[0].indexOf("No such") >= 0 && np !== "/") return { lines: ["-bash: cd: " + a[0] + ": No such file or directory"] }; S.laptop.rcwd = np === "/home/ubuntu" ? "~" : np; return { lines: [] }; }
  if (c === "ls") { var all = a.some(function (x) { return /^-.*a/.test(x); }), t = a.filter(function (x) { return x[0] !== "-"; })[0]; return { lines: rmLs(i, rmPath(t || ""), all) }; }
  if (c === "cat") return { lines: rmCat(i, rmPath(a[0] || ""), sudo) };
  if (c === "systemctl") {
    var sv = rmServices(i), nm = String(a[1] || "").replace(/\.service$/, "");
    if (a[0] === "is-active") return { lines: [sv[nm] ? "active" : "inactive"] };
    if (a[0] !== "status") return { lines: ["systemctl: จำลองเฉพาะ status / is-active"] };
    if (!sv[nm]) return { lines: ["Unit " + a[1] + (/\./.test(a[1] || "") ? "" : ".service") + " could not be found."] };
    var run = rmRunning(i, nm), unit = nm + (/\.timer$/.test(a[1] || "") ? "" : ".service");
    return { lines: ["● " + unit + " - " + sv[nm], "     Loaded: loaded (/etc/systemd/system/" + unit + "; enabled; preset: enabled)", run ? "     Active: active (running) since Tue 2026-10-07 09:12:41 UTC; 3min ago" : "     Active: inactive (dead)"] };
  }
  if (c === "docker") {
    if (a[0] === "exec") { if (!sudo) return { lines: ["permission denied while trying to connect to the Docker daemon socket  (ลอง sudo)"] }; if (a[1] === "jenkins" && rmDocker(i).length && /initialAdminPassword/.test(a.join(" "))) return { lines: [jkPwdOf(i)] }; return { lines: ["docker exec: จำลองเฉพาะ sudo docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword"] }; }
    if (!sudo && /^(ps|images)$/.test(a[0] || "")) { if (!rmServices(i).docker) return { lines: ["Command 'docker' not found, but can be installed with: sudo snap install docker"] }; return { lines: ["permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock  (user ubuntu ไม่ได้อยู่ในกลุ่ม docker ลอง sudo docker ps)"] }; }
    if (a[0] !== "ps") return { lines: ["docker: จำลองเฉพาะ docker ps"] };
    if (!rmServices(i).docker) return { lines: ["Command 'docker' not found, but can be installed with: sudo snap install docker"] };
    return { lines: rmTable(["CONTAINER ID", "IMAGE", "COMMAND", "STATUS", "PORTS", "NAMES"], rmDocker(i).map(function (x) { return [x[0], x[1], x[2], "Up 3 minutes", x[3], x[4]]; })) };
  }
  if (c === "curl") {
    var u = a.filter(function (x) { return x[0] !== "-"; })[0] || "", m = /(?:localhost|127\.0\.0\.1):(\d+)(\/.*)?/.exec(u);
    if (!m) return { lines: ["curl: จำลองเฉพาะ localhost:<port>"] };
    if (m[1] === "8080" && r === "jenkins" && rmDocker(i).length) return { lines: ["<html><head><meta http-equiv='refresh' content='1;url=/login?from=%2F'/><script>window.location.replace('/login?from=%2F');</scr" + "ipt></head><body style='background-color:white; color:white;'>", "Authentication required", "</body></html>"] };
    if (m[1] === "9000" && r === "sonarqube" && rmDocker(i).length) return { lines: [/api\/system\/status/.test(m[2] || "") ? '{"id":"20261007000000","version":"community","status":"UP"}' : "<!DOCTYPE html><html><head><title>SonarQube</title></head>..."] };
    return { lines: ["curl: (7) Failed to connect to localhost port " + m[1] + " after 0 ms: Couldn't connect to server"] };
  }
  if (c === "k3s" || c === "kubectl") {
    if (c === "k3s") a.shift(); if (!rmServices(i).k3s) return { lines: ["Command '" + c + "' not found"] };
    if (a[0] === "apply" && a[1] === "-f") { if (r !== "k8s_server" || !rmArgo()) return { lines: ["error: resource mapping not found: no matches for kind \"Application\" in version \"argoproj.io/v1alpha1\""] }; return { lines: argoApply(a[2]) }; }
    if (/^get (applications?|app)$/.test(a.slice(0, 2).join(" "))) { var names = Object.keys(S.argo.apps); return { lines: names.length ? rmTable(["NAME", "SYNC STATUS", "HEALTH STATUS"], names.map(function (n) { var st = argoStatus(n); return [n, st.sync, st.health]; })) : ["No resources found in argocd namespace."] }; }
    var sub = a.slice(0, 2).join(" ");
    if (sub === "get nodes") { var nodes = r === "k8s_server" ? S.insts.filter(function (x) { return x.state === "running" && ansTag(x, "Role") === "k8s_server" && rmServices(x).k3s; }) : [i]; return { lines: rmTable(["NAME", "STATUS", "ROLES", "AGE", "VERSION"], nodes.map(function (n) { return [rmHost(n), "Ready", "control-plane,etcd,master", "4m", "v1.31.4+k3s1"]; })) }; }
    if (sub === "get ns" || sub === "get namespaces") return { lines: rmTable(["NAME", "STATUS", "AGE"], ["default", "kube-system", "kube-public", "kube-node-lease"].concat(r === "k8s_dev" ? ["dev"] : ["prd", "argocd"]).map(function (n) { return [n, "Active", "4m"]; })) };
    return { lines: ["k3s kubectl: จำลองเฉพาะ get nodes / get ns"] };
  }
  if (c === "mysql" || c === "mariadb") {
    if (r !== "db" || !rmServices(i).mariadb) return { lines: ["Command 'mysql' not found"] };
    if (!rmRunning(i, "mariadb")) return { lines: ["ERROR 2002 (HY000): Can't connect to local server through socket '/run/mysqld/mysqld.sock' (2)"] };
    if (!sudo) return { lines: ["ERROR 1698 (28000): Access denied for user 'ubuntu'@'localhost'  (ลอง sudo mysql)"] };
    var n = S.insts.filter(function (x) { return x.state === "running" && ansTag(x, "Role") === "db" && ansVm(x).f.cluster; }).length;
    return { lines: ["Variable_name\tValue", "wsrep_cluster_size\t" + n] };
  }
  return { lines: ["-bash: " + c + ": command not found  (พิมพ์ help)"] };
}
