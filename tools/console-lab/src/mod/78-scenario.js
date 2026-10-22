// ---- ตัวอย่างสำเร็จรูป "พร้อมปล่อย": รัน Terraform + Ansible ในตัวจำลองให้ครบ ตั้ง Jenkins/SonarQube/ArgoCD ไว้แล้ว
// เหลือให้ผู้เรียนทำแค่: git push 3 repo → Jenkins build → ArgoCD sync → เปิดเว็บ pharmacy ผ่าน ALB
// ponytail: เรียกคำสั่งเดียวกับที่ผู้เรียนพิมพ์ (shRun) ไม่ได้เขียนสถานะเอง จึงตรงกับของที่ตัวจำลองทำจริงเสมอ
function buildReady(ghUser) {
  ghUser = String(ghUser || "").trim(); if (!/^[A-Za-z0-9-]+$/.test(ghUser)) throw new Error("ชื่อ GitHub ใช้ได้เฉพาะ A-Z a-z 0-9 -");
  fresh(); S.speed = "instant";
  var u = API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, k = API.createAccessKey(u.id, "CLI", "");
  S.laptop.creds = { id: k.res.id, secretHash: hash32(k.secret), region: "ap-southeast-1" }; S.laptop.awsRegion = "ap-southeast-1";
  // แทน YOUR_GITHUB_USER ล่วงหน้า (ขั้น sed ที่ผู้เรียนต้องทำเองในโหมดปกติ)
  ["/ansible/group_vars/all/main.yml", "/repo-manifests/argocd-apps/apps.yaml"].forEach(function (f) { fsWrite(REPO + f, fsRead(REPO + f).replace(/YOUR_GITHUB_USER/g, ghUser)); });
  var out = [];
  function sh(c) { var r = shRun(c); (r.lines || []).forEach(function (l) { out.push(l); }); return r; }
  sh("cd " + REPO + "/terraform"); sh("terraform init"); var ap = sh("terraform apply -auto-approve -var my_ip=" + S.myIp + "/32");
  if (!/Apply complete/.test(ap.lines.join("\n"))) throw new Error("terraform apply ไม่สำเร็จ: " + ap.lines.slice(-3).join(" "));
  sh("cd " + REPO + "/ansible"); var an = sh("ansible-playbook site.yml");
  if (/(failed|unreachable)=[1-9]/.test(an.lines.join("\n")) || !/PLAY RECAP/.test(an.lines.join("\n"))) throw new Error("ansible-playbook ไม่ผ่าน: " + an.lines.slice(-4).join(" "));
  // Jenkins: wizard → admin → URL
  jkUnlock(jkPwdOf(jkInst())); jkCustomize(); jkCreateAdmin({ user: "admin", pass: "Pharmacy-Lab-2026!", pass2: "Pharmacy-Lab-2026!", full: "Pharmacy Admin", email: "admin@pharmacy.lab" }); jkSetUrl(); jkStart();
  // SonarQube: เปลี่ยนรหัส + token สำหรับ Jenkins
  sqLogin("admin", "admin"); sqChangePw("admin", "Pharmacy-Lab-2026!", "Pharmacy-Lab-2026!"); var tok = sqGenToken({ name: "jenkins" }).res; S.sq.login = false;
  // credentials 3 ตัว + job 2 ตัว (ข้ามคำถาม "build แรกล้ม" ให้เลย: รู้ parameters แล้ว)
  jkAddCred({ id: "sonar-token", kind: "secret", secret: tok, desc: "SonarQube token" }); jkAddCred({ id: "github-token", kind: "userpass", user: ghUser, pass: "ghp_demoToken1234567890", desc: "GitHub token" }); jkAddCred({ id: "argocd-admin", kind: "userpass", user: "admin", pass: argoPwdOf(argoInst()), desc: "ArgoCD admin" });
  ["backend", "frontend"].forEach(function (svc) { jkCreateJob({ name: "pharmacy-" + svc, repo: "https://github.com/" + ghUser + "/pharmacy-" + svc + ".git", cred: "github-token", branch: "*/main", script: "Jenkinsfile" }, true); S.jk.job.paramsKnown = true; });
  jkSelect("pharmacy-backend");
  // ArgoCD: 4 แอปลงทะเบียนแล้ว (ชี้ repo pharmacy-manifests ของผู้เรียน จะขึ้น ComparisonError จนกว่าจะ git push repo นั้น)
  argoParse(fsRead(REPO + "/repo-manifests/argocd-apps/apps.yaml")).forEach(function (a) { S.argo.apps[a.name] = a; });
  S.laptop.cwd = REPO; S.laptop.remote = null;
  S.ready = { user: ghUser };
  return { user: ghUser, jenkins: S.insts.filter(function (i) { return i.name === "pharmacy-jenkins"; })[0].publicIp, sonar: S.insts.filter(function (i) { return i.name === "pharmacy-sonarqube"; })[0].publicIp, bastion: S.insts.filter(function (i) { return i.name === "pharmacy-bastion"; })[0].publicIp, argocd: "http://" + S.albs[0].dns + ":8443", alb: S.albs[0].dns };
}

// ---- ปุ่มลัดของตัวอย่าง "พร้อมปล่อย" (ผู้เรียนไม่ต้องพิมพ์): คำสั่ง git ที่ต้องพิมพ์ + สั่ง build + สถานะความคืบหน้า
function readyPushCmds() {
  var u = (S.ready && S.ready.user) || ghUser(), cmds = [];
  [["repo-manifests", "pharmacy-manifests", 0], ["repo-backend", "pharmacy-backend", 1], ["repo-frontend", "pharmacy-frontend", 1]].forEach(function (r) {
    cmds.push("cd " + REPO + "/" + r[0], "git init -b main", "git add .", "git commit -m initial", "git remote add origin https://github.com/" + u + "/" + r[1] + ".git", "git push -u origin main");
    if (r[2]) cmds.push("git tag v1.0.0", "git push origin v1.0.0");
  });
  return cmds;
}
function readyState() {
  var u = (S.ready && S.ready.user) || ghUser(), g = S.gh && S.gh.repos || {};
  var pushed = ["pharmacy-manifests", "pharmacy-backend", "pharmacy-frontend"].every(function (n) { return g[n] && g[n].user === u; }) && ["pharmacy-backend", "pharmacy-frontend"].every(function (n) { return g[n].tags.indexOf("v1.0.0") >= 0; });
  function built(env) { return ["backend", "frontend"].every(function (svc) { var j = jkJob("pharmacy-" + svc); return !!j && jkBuildsOf(j).some(function (b) { return b.result === "SUCCESS" && b.params.TARGET_ENV === env && b.params.VERSION === "v1.0.0"; }); }); }
  return { pushed: pushed, dev: built("dev"), prd: built("prd") };
}
// กดแทนการเปิด Jenkins → Build with Parameters: backend ก่อน frontend; prd ใช้ image ตัวเดียวกับ dev (deploy-only) และยืนยันให้
function readyBuild(env) {
  var out = [];
  ["backend", "frontend"].forEach(function (svc) {
    jkSelect("pharmacy-" + svc);
    var b = jkNew(env === "prd" ? { TARGET_ENV: "prd", VERSION: "v1.0.0", ACTION: "deploy-only", AUTO_SYNC: true, CHANGE_NOTE: "promote จาก dev" } : { TARGET_ENV: "dev", VERSION: "v1.0.0", ACTION: "build-and-deploy", AUTO_SYNC: false, CHANGE_NOTE: "first release" });
    if (b.state === "waiting") jkInput(b, true);
    out.push({ job: "pharmacy-" + svc, id: b.id, result: b.result || b.state });
  });
  return out;
}

// ---- ตัวอย่างสำเร็จรูปสำหรับ Ansible: Terraform apply เสร็จแล้ว (เครื่องขึ้นครบ) ผู้เรียนรัน ansible เอง
// kind: ans = พร้อมรัน · ans-half = db+k8s เสร็จแล้ว เหลือ sonarqube/jenkins · ans-sg = SG ของ bastion เปิด SSH ให้ IP ผิด (UNREACHABLE ทุกเครื่อง)
//       ans-noegress = ลบ outbound ของ SG ที่ Jenkins ใช้ทั้งหมด (apt/docker ล้ม) · ans-nonat = ลบเส้นทาง NAT ของ private subnet (k8s/DB ออกเน็ตไม่ได้ ส่วน Jenkins/SonarQube ปกติ)
function buildAnsibleLab(kind) {
  fresh(); S.speed = "instant";
  var u = API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, k = API.createAccessKey(u.id, "CLI", "");
  S.laptop.creds = { id: k.res.id, secretHash: hash32(k.secret), region: "ap-southeast-1" }; S.laptop.awsRegion = "ap-southeast-1";
  var gp = REPO + "/ansible/group_vars/all/main.yml"; fsWrite(gp, fsRead(gp).replace(/YOUR_GITHUB_USER/g, "me"));
  var out = [];
  function sh(c) { var r = shRun(c); (r.lines || []).forEach(function (l) { out.push(l); }); return r; }
  sh("cd " + REPO + "/terraform"); sh("terraform init");
  var ap = sh("terraform apply -auto-approve -var my_ip=" + (kind === "ans-sg" ? "203.0.113.99" : S.myIp) + "/32");
  if (!/Apply complete/.test(ap.lines.join("\n"))) throw new Error("terraform apply ไม่สำเร็จ: " + ap.lines.slice(-3).join(" "));
  if (kind === "ans-noegress") S.insts.filter(function (i) { return i.name === "pharmacy-jenkins"; })[0].sgIds.forEach(function (id) { API.setOutbound(id, []); }); // เครื่องแชร์ SG pharmacy-base จึงลบ outbound ที่ SG ทุกตัวของ Jenkins
  if (kind === "ans-nonat") { var rpv = byName(S.rtbs, "pharmacy-private"); API.setRoutes(rpv.id, []); }
  sh("cd " + REPO + "/ansible");
  if (kind === "ans-half") { ["db.yml", "k8s.yml"].forEach(function (f) { var r = sh("ansible-playbook " + f); if (!/PLAY RECAP/.test(r.lines.join("\n")) || /(failed|unreachable)=[1-9]/.test(r.lines.join("\n"))) throw new Error(f + " ไม่ผ่าน"); }); }
  return { kind: kind, lines: out };
}
