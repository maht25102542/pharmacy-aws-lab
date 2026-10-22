// รัน: node tools/console-lab/test.js  (เช็ก logic ของ engine ไม่ต้องใช้เบราว์เซอร์)
const fs = require("fs"), assert = require("assert"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
const logic = src.slice(0, src.indexOf("//==UI=="));
new Function(src); // syntax of the UI half (not executed)
const L = new Function(logic + ";return {buildAnsibleLab,readyState,readyBuild,readyPushCmds,buildReady,jkSelect,jkJob,jkJobs,jkBuildsOf,jkRepoName,phApi,phState,phDbUp, phAdminPw,delPlan,sgRuleRisk,hcl,hclPlan,HCL_INFO,ITYPE_ALL,ITYPES,instPhase,natPhase,albPhase,webOpen,jkSetup,jkUnlock,jkCustomize,jkCreateAdmin,jkSetUrl,jkStart,jkSignIn,jkSignOut,jkPwdOf,jkInst,jkAddCred,jkCred,jkCreateJob,jkBuildNow,jkNew,jkAdvance,jkNextDelay,jkInput,sqLogin,sqChangePw,sqGenToken,argoPwdOf,argoStatus,argoApply,gitCmd,REPO2:REPO,tfInitCmd,tfPlanCmd,tfApplyCmd,tfValidateCmd,tfStateList,tfOutputCmd,fsWrite,fsRead,REPO,sessionCheck,POLICY_DEF,ensureState,principalActions,API,get S(){return S},shRun,timingPlan,fresh,buildLab,shRun,ansGraph,ansPing,ansPlaybook,ansInventory,checks,sshCheck,albHealth,hcl,lbName,ecrName,internetOut,delPlan,liveInsts}")();

L.buildLab("full");
assert.strictEqual(L.checks().filter(c => !c.ok).length, 0, "full lab ต้องผ่านทุกข้อ");
const bastion = L.S.insts.find(i => i.name === "pharmacy-bastion"), jenkins = L.S.insts.find(i => i.name === "pharmacy-jenkins");
assert.strictEqual(L.sshCheck(bastion, "pharmacy-admin").kind, "ok", "bastion เข้าตรงจาก laptop ได้");
assert.strictEqual(L.sshCheck(bastion, "other-key").kind, "denied");
assert.strictEqual(L.sshCheck(jenkins, "pharmacy-admin").kind, "timeout", "เครื่องภายใน SG รับ SSH จาก bastion เท่านั้น เข้าตรงไม่ได้");
assert(L.albHealth(L.S.albs[0]).every(r => r.ok), "ALB ต้อง healthy ทุก target");

L.buildLab("noassoc");
const b2 = L.S.insts.find(i => i.name === "pharmacy-bastion");
assert.strictEqual(L.sshCheck(b2, "pharmacy-admin").kind, "timeout", "ลืม association ต้อง timeout");
L.buildLab("wrongip");
assert.strictEqual(L.sshCheck(L.S.insts.find(i => i.name === "pharmacy-bastion"), "pharmacy-admin").kind, "timeout", "SG ผิด IP ต้อง timeout");

L.fresh();
const v = L.API.createVpc({ name: "x", cidr: "10.0.0.0/16" }).res;
assert(L.API.createSubnet({ vpcId: v.id, list: [{ cidr: "192.168.1.0/24" }] }).errors.cidr0, "ซอยนอกช่วง VPC ต้อง error");
assert(L.API.createVpc({ cidr: "10.0.0.0/8" }).errors.cidr, "/8 ต้อง error");
assert(L.lbName("internal-x", "alb") && L.lbName("-a", "tg") && L.lbName("a".repeat(33), "tg"), "ชื่อ LB ผิดกฎต้อง error");
assert(L.ecrName("Pharmacy") && L.ecrName("a//b") && !L.ecrName("pharmacy/frontend"));
assert(L.API.importKey({ name: "k", pub: "ssh-dss AAAA" }).errors.pub, "DSA ต้อง error");

// --- กฎที่ยืนยันกับเอกสาร AWS แล้ว
L.fresh();
let w = L.API.createVpc({ name: "w", cidr: "10.0.0.0/16" }).res;
assert(L.API.createVpc({ cidr: "127.0.0.0/16" }).errors.cidr, "127.0.0.0/8 ห้ามใช้");
assert(L.API.createVpc({ cidr: "169.254.0.0/16" }).errors.cidr, "169.254.0.0/16 ห้ามใช้");
assert(!w.dnsHostnames && w.dnsResolution, "VPC only: hostnames ปิด resolution เปิด");
assert(L.S.vpcs[0].isDefault && L.S.vpcs[0].dnsHostnames, "default VPC เปิด DNS hostnames");
assert(L.API.createVpcAndMore({ name: "m", cidr: "10.5.0.0/16", pub: 2 }).res.dnsHostnames, "VPC and more เปิด DNS hostnames");
assert(L.S.sgs.some(g => g.vpcId === w.id && g.name === "default"), "VPC ใหม่ต้องมี default SG");
assert(L.S.rtbs.some(r => r.vpcId === w.id && r.main), "VPC ใหม่ต้องมี main route table");
// SG: ชื่อไม่แยกตัวพิมพ์, sg- , อักขระ, ตัดช่องว่างท้าย, อ้างถึง SG ข้าม VPC ไม่ได้
const g1 = L.API.createSg({ name: "Web ", desc: "d", vpcId: w.id, rows: [] }).res;
assert.strictEqual(g1.name, "Web", "ช่องว่างท้ายชื่อถูกตัด");
assert(L.API.createSg({ name: "WEB", desc: "d", vpcId: w.id, rows: [] }).errors.name, "ชื่อซ้ำแบบไม่แยกตัวพิมพ์ต้อง error");
assert(L.API.createSg({ name: "sg-x", desc: "d", vpcId: w.id, rows: [] }).errors.name, "ห้ามขึ้นต้น sg-");
assert(L.API.createSg({ name: "a|b", desc: "d", vpcId: w.id, rows: [] }).errors.name, "อักขระต้องห้าม");
assert(L.API.createSg({ name: "n", desc: "", vpcId: w.id, rows: [] }).errors.desc, "ต้องมี description");
const dsg = L.S.sgs.find(g => g.vpcId === L.S.vpcs[0].id);
assert(L.API.setInbound(g1.id, [{ type: "SSH", srcKind: "Security group", src: dsg.id }]).errors.rules, "อ้าง SG ต่าง VPC ต้อง error");
assert.strictEqual(g1.inbound.length, 0, "SG ใหม่ไม่มีกฎขาเข้า");
// ลบ
assert(L.delPlan("sg", dsg.id).blockers.some(b => /Client.CannotDelete/.test(b)), "ลบ default SG ไม่ได้");
const ig = L.API.createIgw({ name: "i" }).res; L.API.attachIgw(ig.id, w.id);
assert(L.delPlan("igw", ig.id).blockers.length, "ลบ IGW ที่ attach อยู่ไม่ได้");
const sn = L.API.createSubnet({ vpcId: w.id, list: [{ cidr: "10.0.1.0/24" }] }).res[0]; L.API.setAutoIp(sn.id, true);
const rt = L.API.createRtb({ vpcId: w.id }).res; L.API.setRoutes(rt.id, [{ dest: "0.0.0.0/0", target: ig.id }]); L.API.setAssoc(rt.id, [sn.id]);
const vi = L.API.launch({ name: "v", ami: "a", type: "t3.micro", vpcId: w.id, subnetId: sn.id, autoIp: "Enable", sgIds: [g1.id], diskSize: 8, diskType: "gp3", tokens: "optional", hop: 1, count: 1 }).res[0];
assert(vi.publicIp, "เครื่องใน public subnet ต้องได้ public IP");
assert(L.delPlan("igw-detach", ig.id).blockers.length, "detach IGW ไม่ได้ถ้ามีเครื่องที่มี public IP");
assert(L.delPlan("vpc", w.id).blockers.length, "ลบ VPC ที่มีเครื่องไม่ได้");
assert(L.delPlan("sg", g1.id).blockers.length, "ลบ SG ที่ถูกใช้อยู่ไม่ได้");
// สถานะเครื่อง
const oldIp = vi.publicIp, priv = vi.privateIp;
L.API.instState(vi.id, "reboot"); assert.strictEqual(vi.publicIp, oldIp, "reboot ไม่เปลี่ยน IP");
L.API.instState(vi.id, "stop"); assert.strictEqual(vi.publicIp, "", "stop แล้วคืน public IP"); assert.strictEqual(vi.privateIp, priv);
assert.strictEqual(L.sshCheck(vi, "x").kind, "timeout", "เครื่อง stopped เข้าไม่ได้");
L.API.instState(vi.id, "start"); assert(vi.publicIp && vi.publicIp !== oldIp, "start แล้วได้ public IP ใหม่");
L.API.instState(vi.id, "terminate"); assert.strictEqual(vi.state, "terminated"); assert(L.API.instState(vi.id, "start").errors, "terminated แล้ว start ไม่ได้");
assert.strictEqual(L.delPlan("igw-detach", ig.id).blockers.length, 0, "terminate แล้ว detach ได้");
assert.strictEqual(L.API.del("vpc", w.id, "nope").errors.confirm !== undefined, true, "ต้องพิมพ์ delete ยืนยัน");
assert(L.API.del("vpc", w.id, "delete").res, "ลบ VPC สำเร็จ"); assert(!L.S.subnets.some(x => x.vpcId === w.id) && !L.S.igws.some(x => x.vpcId === w.id), "ลบ VPC พาลูกไปด้วย");
// ALB health เมื่อ stop เครื่อง / ปิด SG
L.buildLab("full");
const k1 = L.S.insts.find(i => i.name === "pharmacy-k8s-1"); L.API.instState(k1.id, "stop");
const hr = L.albHealth(L.S.albs[0]).find(r => r.inst && r.inst.id === k1.id);
assert.strictEqual(hr.state, "unused"); assert.strictEqual(hr.code, "Target.InvalidState");
const k8s = L.S.sgs.find(g => g.name === "pharmacy-k8s"); L.API.setInbound(k8s.id, []);
const hr2 = L.albHealth(L.S.albs[0]).find(r => r.inst && r.inst.name === "pharmacy-k8s-2");
assert.strictEqual(hr2.state, "unhealthy"); assert.strictEqual(hr2.code, "Target.Timeout");
// launch ไม่ระบุ SG ได้ default SG
L.buildLab("full"); const vv = L.S.vpcs.find(v => v.name === "pharmacy-vpc");
const di = L.API.launch({ ami: "a", type: "t3.micro", vpcId: vv.id, autoIp: "Disable", sgIds: [], diskSize: 8, diskType: "gp3", tokens: "optional", hop: 1, count: 1 }).res[0];
assert.strictEqual(L.S.sgs.find(g => g.id === di.sgIds[0]).name, "default", "ไม่ระบุ SG ต้องได้ default SG");
// Session Manager: ต้องมี role ที่มีสิทธิ์ SSM (ไม่ต้องมี SG 22 หรือกุญแจ)
L.buildLab("full");
const jk = L.S.insts.find(i => i.name === "pharmacy-jenkins");
assert(!L.sessionCheck(jk).ok, "role ของ jenkins ไม่มีสิทธิ์ SSM ต้องเชื่อมไม่ได้");
L.API.createRole({ name: "ssm-role", entity: "AWS service", usecase: "EC2", policies: ["AmazonSSMManagedInstanceCore"] });
const vv2 = L.S.vpcs.find(v => v.name === "pharmacy-vpc"), sn2 = L.S.subnets.find(x => x.vpcId === vv2.id);
const si = L.API.launch({ ami: "a", type: "t3.micro", vpcId: vv2.id, subnetId: sn2.id, autoIp: "Enable", sgIds: [], profile: "ssm-role", diskSize: 8, diskType: "gp3", tokens: "required", hop: 1, count: 1 }).res[0];
assert(L.sessionCheck(si).ok, "มี role SSM + ออกเน็ตได้ ต้องเชื่อมผ่าน Session Manager ได้");
assert.strictEqual(L.sshCheck(si, "x").kind, "timeout", "แต่ SSH ยังเข้าไม่ได้เพราะ SG ไม่เปิด 22 (default SG)");
// --- ECR + IAM: ใครทำอะไรกับ repo ได้
L.buildLab("ecr");
const back = L.S.repos.find(r => r.name === "pharmacy/backend");
assert(back.images.some(i => i.tag === "v1.0.0"), "jenkins (PowerUser) push ได้");
const k8sInst = L.S.insts.find(i => i.name === "pharmacy-k8s-1"), jenInst = L.S.insts.find(i => i.name === "pharmacy-jenkins");
const run = (inst, op, tag, aged) => L.API.ecrAction({ repoId: back.id, principal: { type: "inst", id: inst.id }, op, tag, aged }).res;
assert(run(k8sInst, "pull", "v1.0.0").ok, "k8s (ReadOnly) pull ได้");
const denied = run(k8sInst, "push", "v2");
assert(!denied.ok && /ecr:InitiateLayerUpload|ecr:UploadLayerPart|ecr:CompleteLayerUpload|ecr:PutImage/.test(denied.out), "k8s (ReadOnly) push ไม่ได้");
assert(!run(k8sInst, "pull", "v1.0.0", true).ok, "token หมดอายุ 12 ชม. pull ไม่ได้");
assert(/no basic auth/.test(run(jenInst, "push", "v3", true).out), "push ด้วย token หมดอายุ");
assert(/manifest unknown/.test(run(k8sInst, "pull", "nope").out), "pull tag ที่ไม่มี");
back.mutable = false; assert(/ImageTagAlreadyExistsException/.test(run(jenInst, "push", "v1.0.0").out), "Immutable ห้ามเขียนทับ tag"); back.mutable = true;
L.API.setInstanceRole(jenInst.id, "", "Detach"); assert(/Unable to locate credentials/.test(run(jenInst, "push", "v4").out), "ไม่มี role ไม่มี credentials");
assert(L.API.setInstanceRole(jenInst.id, "pharmacy-k8s").res, "attach role ให้เครื่องที่ไม่มี role ได้");
L.API.instState(jenInst.id, "stop"); assert(L.API.setInstanceRole(jenInst.id, "pharmacy-jenkins").errors, "replace role ต้อง running");
assert(L.API.changeType(jenInst.id, "t3.large").res, "stopped เปลี่ยน type ได้"); assert(L.API.changeType(k8sInst.id, "t3.large").errors, "running เปลี่ยน type ไม่ได้");
// ผู้ใช้ + access key
L.fresh();
const u = L.API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res;
assert(L.API.createUser({ name: "TF-Admin" }).errors.name, "ชื่อซ้ำไม่แยกตัวพิมพ์");
const ak1 = L.API.createAccessKey(u.id, "CLI", "").res; L.API.createAccessKey(u.id, "CLI", "");
assert(L.API.createAccessKey(u.id, "CLI", "").errors, "access key ได้สูงสุด 2 ชุด");
assert(L.API.accessKeyState(u.id, ak1.id, "delete").errors, "ต้อง deactivate ก่อนลบ");
L.API.accessKeyState(u.id, ak1.id, "deactivate"); assert(L.API.accessKeyState(u.id, ak1.id, "delete").res); assert.strictEqual(u.keys.length, 1);
assert(L.principalActions({ type: "user", id: u.id }).acts.includes("*"), "AdministratorAccess = *");
// Elastic IP
L.buildLab("full");
const ji = L.S.insts.find(i => i.name === "pharmacy-jenkins"), eip = L.API.allocEip().res;
const before = ji.publicIp; L.API.assocEip(eip.id, ji.id); assert.strictEqual(ji.publicIp, eip.ip, "EIP แทน public IP อัตโนมัติ");
L.API.instState(ji.id, "stop"); assert.strictEqual(ji.publicIp, eip.ip, "EIP คงอยู่ตอน stop");
L.API.instState(ji.id, "start"); assert.strictEqual(ji.publicIp, eip.ip, "EIP คงอยู่ตอน start");
assert(L.delPlan("eip", eip.id).blockers.length, "release EIP ที่ผูกอยู่ไม่ได้");
L.API.disassocEip(eip.id); assert(ji.publicIp && ji.publicIp !== eip.ip, "disassociate แล้วได้ public IP อัตโนมัติใหม่");
L.API.assocEip(eip.id, ji.id); L.API.instState(ji.id, "terminate"); assert.strictEqual(eip.instId, null, "terminate แล้ว EIP หลุดแต่ยังอยู่ในบัญชี"); assert(L.S.eips.includes(eip));

// ===== Terraform จำลอง: รันโค้ดจริงใน terraform/ ของ repo =====
function tfLogin(role) {
  L.fresh();
  const u = L.API.createUser({ name: "tf-admin", policies: [role || "AdministratorAccess"] }).res, k = L.API.createAccessKey(u.id, "CLI", "").res;
  L.S.laptop.creds = { id: k.id, secretHash: k.secretHash, region: "ap-southeast-1" };
  L.fsWrite(L.REPO + "/terraform/terraform.tfvars", 'my_ip = "198.51.100.7/32"\n');
}
const TFD = L.REPO + "/terraform";
tfLogin();
assert(L.tfPlanCmd(TFD, {}).lines.join("\n").includes("terraform init"), "plan ก่อน init ต้อง error");
L.tfInitCmd(TFD);
const plan1 = L.tfPlanCmd(TFD, {});
assert(plan1.lines.join("\n").includes("Plan: 59 to add, 0 to change, 0 to destroy."), "plan ของ repo จริงต้องได้ 59 to add");
const applied = L.tfApplyCmd(plan1).join("\n");
assert(applied.includes("Apply complete! Resources: 59 added"), "apply ต้องสำเร็จ");
assert.strictEqual(L.checks().filter(c => !c.ok).length, 0, "หลัง terraform apply lab ต้องผ่านตัวตรวจทั้ง 26 ข้อ");
assert(L.fsRead(L.REPO + "/ansible/group_vars/all/terraform.yml").includes('aws_region: "ap-southeast-1"'), "local_file ต้องเขียน terraform.yml");
assert(L.tfPlanCmd(TFD, {}).lines.join("\n").includes("No changes."), "plan รอบสองต้องไม่มีอะไรเปลี่ยน");
// drift: แก้ SG ใน console แล้ว plan ต้องเห็น
const dbSg = L.S.sgs.find(g => g.name === "pharmacy-db"); L.API.setInbound(dbSg.id, []);
const drift = L.tfPlanCmd(TFD, {}).lines.join("\n");
assert(drift.includes("Objects have changed outside of Terraform") && drift.includes("aws_security_group.db"), "plan ต้องเห็น drift ของ SG");
L.tfApplyCmd(L.tfPlanCmd(TFD, {})); assert(L.sgAllowsDb ? true : true);
assert(L.S.sgs.find(g => g.name === "pharmacy-db").inbound.length === 2, "apply ต้องคืนกฎ SG");
// แก้โค้ดแล้ว plan: ลด k8s เหลือ 2 เครื่อง
const vf = L.fsRead(TFD + "/variables.tf"); L.fsWrite(TFD + "/variables.tf", vf.replace("default     = 3\n}\n\nvariable \"db_count\"", "default     = 2\n}\n\nvariable \"db_count\""));
const less = L.tfPlanCmd(TFD, {}).lines.join("\n");
assert(less.includes("aws_instance.k8s[2] will be destroyed") && less.includes("aws_lb_target_group_attachment.prd[2] will be destroyed"), "ลด count ต้องเห็นการ destroy k8s[2]");
L.fsWrite(TFD + "/variables.tf", vf);
// validate ผิด
const net = L.fsRead(TFD + "/network.tf"); L.fsWrite(TFD + "/network.tf", net.replace('enable_dns_hostnames = true', 'enable_dns_hostnames = true\n  bogus = 1'));
assert(L.tfValidateCmd(TFD).join("\n").includes('An argument named "bogus" is not expected here.'), "validate ต้องจับ argument ที่ไม่มีจริง");
L.fsWrite(TFD + "/network.tf", net);
// ---- Ansible บนเครื่องที่ terraform สร้าง
L.S.laptop.cwd = L.REPO + "/ansible";
const g = L.ansGraph().join("\n");
assert(/@role_db:[\s\S]*pharmacy-db-1/.test(g) && /@role_k8s_dev:\s*\n\s*\|  \|--pharmacy-dev/.test(g) && /@role_jenkins/.test(g), "inventory graph: " + g);
assert(L.ansPing("all").join("\n").split("pong").length - 1 === 10, "ping ทุกเครื่อง 10 (bastion ตรง + 9 เครื่องภายในผ่าน bastion)");
const run1 = L.ansPlaybook("site.yml"); const r1 = run1.lines.join("\n");
assert.strictEqual(run1.rc, 0, "site.yml ต้องผ่าน: " + r1.slice(-1500));
assert(/PLAY RECAP[\s\S]*pharmacy-db-1\s+: ok=\d+\s+changed=\d+\s+unreachable=0\s+failed=0/.test(r1), "recap");
const run2 = L.ansPlaybook("site.yml").lines.join("\n");
assert(/pharmacy-jenkins\s+: ok=\d+\s+changed=1\s/.test(run2), "รอบสอง jenkins ควรเหลือ changed=1 (command): " + run2.slice(-900));
assert(L.ansPlaybook("db.yml", { limit: "role_db[0]" }).lines.join("\n").includes("pharmacy-db-1"), "limit");
const tfy = L.REPO + "/ansible/group_vars/all/terraform.yml", keep = L.fsRead(tfy);
L.S.laptop.fs[tfy] = null;
assert(/ecr_registry' is undefined/.test(L.ansPlaybook("jenkins.yml").lines.join("\n")), "ไม่มี terraform.yml ต้อง undefined");
L.S.laptop.fs[tfy] = keep;
const jkI = L.S.insts.find(i => i.name === "pharmacy-jenkins"), sgj = L.S.sgs.find(x => x.id === jkI.sgIds[0]), sgKeep = sgj.inbound.slice();
sgj.inbound = sgj.inbound.filter(r => r.from !== 22);
assert(/UNREACHABLE![\s\S]*Connection timed out/.test(L.ansPlaybook("jenkins.yml").lines.join("\n")), "ไม่มี SSH rule ต้อง timeout");
sgj.inbound = sgKeep;
const credKeep = L.S.laptop.creds; L.S.laptop.creds = null; assert(/Insufficient credentials/.test(L.ansGraph().join("\n")), "ไม่มี creds"); L.S.laptop.creds = credKeep;
// destroy
const dplan = L.tfPlanCmd(TFD, {}, true), dout = L.tfApplyCmd(dplan).join("\n");
assert(dout.includes("Destroy complete! Resources: 59 destroyed."), "destroy ต้องลบหมด: " + dout.slice(-300));
assert.strictEqual(L.S.vpcs.length, 1, "เหลือแค่ default VPC"); assert(L.S.insts.every(i => i.state === "terminated"), "เครื่องต้องถูก terminate");
// สิทธิ์: user ที่ไม่ใช่ admin ใช้ terraform ไม่ได้
tfLogin("AmazonEC2ContainerRegistryReadOnly"); L.tfInitCmd(TFD);
const tfDenied = L.tfApplyCmd(L.tfPlanCmd(TFD, {})).join("\n");
assert(/UnauthorizedOperation/.test(tfDenied), "ไม่ใช่ admin ต้องถูกปฏิเสธ: " + tfDenied.slice(0, 300));
// ไม่มี credentials / บัญชีถูกระงับ
tfLogin(); L.tfInitCmd(TFD); L.S.laptop.creds = null;
assert(L.tfPlanCmd(TFD, {}).lines.join("\n").includes("NoCredentialProviders"), "ไม่มี credentials ต้อง error");
tfLogin(); L.tfInitCmd(TFD); L.S.acct = "suspended";
assert(L.tfPlanCmd(TFD, {}).lines.join("\n").includes("This account is currently blocked"), "บัญชีระงับต้อง error");
// ---- เทอร์มินัล: ทั้งสายตั้งแต่ aws configure ถึง ansible-playbook
L.fresh();
const shU = L.API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, shK = L.API.createAccessKey(shU.id, "CLI", "");
function sh(line, answers) { let r = L.shRun(line), out = r.lines.slice(); answers = (answers || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(answers.shift()); out = out.concat(r.lines); } return out.join("\n"); }
assert(/Unable to locate credentials/.test(sh("aws sts get-caller-identity")), "ยังไม่ configure");
sh("aws configure", [shK.res.id, shK.secret, "ap-southeast-1", "json"]);
assert(/tf-admin/.test(sh("aws sts get-caller-identity")), "configure แล้วต้อง whoami ได้");
sh("aws configure", [shK.res.id, "wrong-secret", "ap-southeast-1", "json"]);
assert(/SignatureDoesNotMatch/.test(sh("aws sts get-caller-identity")), "secret ผิด");
sh("aws configure", [shK.res.id, shK.secret, "ap-southeast-1", "json"]);
sh("cd ~/Desktop/work/pharmacy-aws-lab/terraform");
assert(/terraform init/.test(sh("terraform plan")), "ต้อง init ก่อน"); sh("terraform init");
assert(/var\.my_ip/.test(sh("terraform apply", ["198.51.100.7/32", "no"])), "ต้องถาม my_ip");
const ap = sh("terraform apply", ["198.51.100.7/32", "yes"]);
assert(/Apply complete! Resources: 59 added/.test(ap), ap.slice(-400));
assert(/pharmacy-db-1/.test(sh("terraform state list") + sh("terraform output")), "output");
sh("cd ../ansible"); assert(/SUCCESS/.test(sh("ansible pharmacy-jenkins -m ping")), "ping");
assert(/failed=0/.test(sh("ansible-playbook site.yml")), "site.yml");
sh("cd ../terraform");
assert(/Destroy complete! Resources: 59 destroyed/.test(sh("terraform destroy -auto-approve")), "destroy");
// ---- VPC and more: NAT / private subnets
L.fresh();
for (let q = 0; q < 4; q++) L.API.createVpc({ name: "q" + q, cidr: "10." + (20 + q) + ".0.0/16" });
assert(L.API.createVpc({ name: "q5", cidr: "10.30.0.0/16" }).errors._.startsWith("VpcLimitExceeded"), "VPC 5 ต่อ region");
L.fresh();
const nv = L.API.createVpcAndMore({ name: "w", cidr: "10.9.0.0/16", azs: 2, pub: 2, priv: 2, nat: "perAz", s3: true });
assert(nv.res && L.S.nats.length === 2 && L.S.subnets.filter(x => /private/.test(x.name)).length === 2, "NAT per AZ + private subnets");
assert(L.S.rtbs.filter(r => /rtb-private/.test(r.name) && r.routes.some(x => /^nat-/.test(x.target))).length === 2, "private rtb ชี้ NAT");
assert(L.API.createVpcAndMore({ name: "x", cidr: "10.8.0.0/16", azs: 2, pub: 0, priv: 1, nat: "1az" }).errors.nat, "NAT ไม่มี public subnet ต้อง error");
assert(L.API.createVpcAndMore({ name: "y", cidr: "10.7.0.0/16", azs: 1, pub: 2, priv: 0 }).errors.pub, "pub > AZ ต้อง error");
const pvt = L.S.subnets.find(x => /private1/.test(x.name)), pi = L.API.launch({ name: "p", ami: "ami-ubuntu2404", type: "t3.micro", keyName: "", vpcId: nv.res.id, subnetId: pvt.id, autoIp: "Disable", sgIds: [L.S.sgs.find(x => x.vpcId === nv.res.id).id], diskSize: 8, diskType: "gp3", tokens: "required", hop: 2, count: 1 });
assert(pi.res && L.internetOut(pi.res[0]), "เครื่อง private ออกเน็ตผ่าน NAT ได้: " + JSON.stringify(pi.errors || ""));
assert(L.API.del("vpc", nv.res.id, "delete").errors, "VPC ที่มี NAT ลบไม่ได้");
// ---- vCPU hint ใน plan
tfLogin(); L.tfInitCmd(TFD);
assert(/vCPU ที่จะรันหลัง apply = 20[\s\S]*เกิน default quota/.test(L.tfPlanCmd(TFD, {}).lines.join("\n")), "plan ต้องเตือน vCPU 20 > 5");
// ---- ปัญหาโลกจริง
tfLogin(); L.S.faults.providerLock = true;
assert(/does not match configured version constraint/.test(L.tfInitCmd(TFD).join("\n")), "provider lock ต้อง fail");
assert(/successfully initialized/.test(L.tfInitCmd(TFD, true).join("\n")), "init -upgrade แก้ได้");
L.S.faults.eventual = true;
const ev1 = L.tfApplyCmd(L.tfPlanCmd(TFD, {})).join("\n");
assert(/Invalid IAM Instance Profile name/.test(ev1), "eventual รอบแรกต้องล้ม: " + ev1.slice(-400));
const ev2 = L.tfApplyCmd(L.tfPlanCmd(TFD, {})).join("\n");
assert(/Apply complete! Resources: \d+ added/.test(ev2), "apply ซ้ำต้องผ่าน: " + ev2.slice(-400));
assert(/aws_lb\.main: Still creating/.test(ev1 + ev2), "Still creating ของ ALB");
tfLogin(); L.tfInitCmd(TFD); L.S.faults.vcpuQuota = true;
assert(/VcpuLimitExceeded/.test(L.tfApplyCmd(L.tfPlanCmd(TFD, {})).join("\n")), "vCPU quota");
tfLogin(); L.tfInitCmd(TFD); L.S.faults.azMissing = true;
assert(/not supported in your requested Availability Zone/.test(L.tfApplyCmd(L.tfPlanCmd(TFD, {})).join("\n")), "AZ ไม่มี type");
tfLogin(); L.tfInitCmd(TFD); L.S.acct = "free";
assert(/not eligible for Free Tier|InvalidParameterCombination/.test(L.tfApplyCmd(L.tfPlanCmd(TFD, {})).join("\n")), "free plan ต้องปฏิเสธ t3.medium");
tfLogin(); L.tfInitCmd(TFD);
L.fsWrite(TFD + "/instances.tf", L.fsRead(TFD + "/instances.tf").replace("099720109477", "000000000000"));
assert(/no results/.test(L.tfPlanCmd(TFD, {}).lines.join("\n")), "owner ผิด → AMI ไม่เจอ");
// ---- regression: review findings
L.fresh(); L.API.createVpcAndMore({ name: "r", cidr: "10.9.0.0/16", azs: 1, pub: 1, priv: 1, nat: "1az" });
assert(L.delPlan("subnet", L.S.subnets.find(x => /public1/.test(x.name)).id).blockers.length, "subnet ที่มี NAT ต้องลบไม่ได้");
L.fresh(); for (let i = 0; i < 4; i++) L.API.allocEip();
const cnt0 = [L.S.vpcs.length, L.S.subnets.length, L.S.igws.length], rr = L.API.createVpcAndMore({ name: "x", cidr: "10.8.0.0/16", azs: 2, pub: 2, priv: 2, nat: "perAz" });
assert(rr.errors && JSON.stringify(cnt0) === JSON.stringify([L.S.vpcs.length, L.S.subnets.length, L.S.igws.length]), "EIP เต็มต้องไม่ทิ้งของค้าง");
L.fresh(); L.S.faults.vcpuQuota = true;
const qv = L.S.vpcs[0], qs = L.S.subnets.find(x => x.vpcId === qv.id), qmk = () => L.API.launch({ name: "a", ami: "ami-ubuntu2404", type: "t3.micro", keyName: "", vpcId: qv.id, subnetId: qs.id, autoIp: "Enable", sgIds: [], diskSize: 8, diskType: "gp3", tokens: "required", hop: 2, count: 1 });
const qa = qmk(), qb = qmk(); L.API.instState(qa.res[0].id, "stop"); qmk();
assert(L.API.instState(qa.res[0].id, "start").errors, "start ต้องเช็ก vCPU quota");
// ---- recap: ok รวม changed, loop หัว TASK เดียว
L.fresh(); const ru = L.API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, rk = L.API.createAccessKey(ru.id, "CLI", "");
function sh2(line, ans) { let r = L.shRun(line), out = r.lines.slice(); ans = (ans || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(ans.shift()); out = out.concat(r.lines); } return out.join("\n"); }
sh2("aws configure", [rk.res.id, rk.secret, "ap-southeast-1", "json"]); sh2("cd ~/Desktop/work/pharmacy-aws-lab/terraform"); sh2("terraform init"); sh2("terraform apply -auto-approve -var my_ip=198.51.100.7/32"); sh2("cd ../ansible");
const pb = sh2("ansible-playbook site.yml");
assert((pb.match(/TASK \[Copy systemd units/g) || []).length === 1, "loop ต้องมีหัว TASK เดียว");
pb.split("\n").filter(l => /: ok=\d+/.test(l)).forEach(l => { const m = /ok=(\d+)\s+changed=(\d+)/.exec(l); assert(+m[1] >= +m[2], "ok ต้องรวม changed: " + l); });
// ---- shell ภายใน VM
const bIp = L.S.insts.find(i => i.name === "pharmacy-bastion").publicIp, jIp = L.S.insts.find(i => i.name === "pharmacy-jenkins").privateIp, dbIp = L.S.insts.find(i => i.name === "pharmacy-db-1").privateIp, kIp = L.S.insts.find(i => i.name === "pharmacy-k8s-1").privateIp;
const J = "ssh -J ubuntu@" + bIp + " -i ~/.ssh/id_ed25519 ubuntu@";
assert(/Connection timed out.*bastion/.test(sh2("ssh -i ~/.ssh/id_ed25519 ubuntu@" + jIp)), "private IP เข้าตรงไม่ได้ ต้องบอกให้ผ่าน bastion");
assert(/authenticity of host/.test(sh2(J + jIp, ["no"])) , "ssh ครั้งแรกต้องถาม fingerprint");
sh2(J + jIp, ["yes"]); assert(L.S.laptop.remote, "ssh สำเร็จต้องเข้า shell");
assert(/permission denied.*Docker daemon/.test(sh2("docker ps")), "ไม่ใช่ sudo ต้อง permission denied");
const dps = sh2("sudo docker ps"); assert(/jenkins/.test(dps) && /8080->8080/.test(dps), "docker ps ต้องเห็น jenkins: " + dps);
assert(/Permission denied/.test(sh2("cat /opt/jenkins/.env")) && /ECR_REGISTRY=000000000000/.test(sh2("sudo cat /opt/jenkins/.env")), ".env 0600");
assert(/Authentication required/.test(sh2("curl -s localhost:8080")), "curl jenkins");
assert(/active \(running\)/.test(sh2("systemctl status docker")), "docker active"); sh2("exit"); assert(!L.S.laptop.remote, "exit ออกจาก shell");
sh2(J + kIp, ["yes"]); assert(/control-plane/.test(sh2("k3s kubectl get nodes")) && (sh2("k3s kubectl get nodes").match(/Ready/g) || []).length === 3, "k8s-1 เห็น 3 nodes (server ทั้งหมด)"); sh2("exit");
sh2(J + dbIp, ["yes"]); assert(/wsrep_cluster_size\t3/.test(sh2("sudo mysql -e \"SHOW STATUS LIKE 'wsrep_cluster_size'\"")), "galera 3 nodes"); sh2("exit");
// drift ของ SG ต้องไม่โชว์ key ภายใน
{ L.fresh(); const du = L.API.createUser({ name: "d", policies: ["AdministratorAccess"] }).res, dk = L.API.createAccessKey(du.id, "CLI", "");
  sh2("aws configure", [dk.res.id, dk.secret, "ap-southeast-1", "json"]); sh2("cd ~/Desktop/work/pharmacy-aws-lab/terraform"); sh2("terraform init"); sh2("terraform apply -auto-approve -var my_ip=198.51.100.7/32");
  L.S.sgs.find(x => x.name === "pharmacy-bastion").inbound = []; const dp = sh2("terraform plan -var my_ip=198.51.100.7/32");
  assert(!/__ingress|\|cidr\|/.test(dp) && /- cidr_blocks = \["198\.51\.100\.7\/32"\]/.test(dp) && /resource "aws_security_group" "bastion"/.test(dp), "drift ต้องอ่านง่าย: " + dp.slice(0, 600)); }
// ---- โหมดเวลาเหมือนจริง
{ const tp = L.timingPlan(["TASK [Install Docker] *****", "changed: [a]", "changed: [b]", "TASK [Install Docker] *****", "ok: [a]", "x: Creating...", "x: Still creating... [10s elapsed]", "x: Still creating... [20s elapsed]", "x: Creation complete after 30s [id=1]"]);
  assert.deepStrictEqual(tp, [0, 60000, 300, 0, 1000, 0, 10000, 10000, 10000], "timingPlan: " + JSON.stringify(tp));
  L.fresh(); const tu = L.API.createUser({ name: "t", policies: ["AdministratorAccess"] }).res, tk = L.API.createAccessKey(tu.id, "CLI", "");
  sh2("aws configure", [tk.res.id, tk.secret, "ap-southeast-1", "json"]); sh2("cd ~/Desktop/work/pharmacy-aws-lab/terraform"); sh2("terraform init"); const tfo = sh2("terraform apply -auto-approve -var my_ip=198.51.100.7/32"); sh2("cd ../ansible");
  const tfTot = L.timingPlan(tfo.split("\n")).reduce((a, b) => a + b, 0); assert(tfTot > 100000, "terraform apply ควรหลายนาที: " + tfTot / 1000);
  const full = sh2("ansible-playbook site.yml"); const tot = L.timingPlan(full.split("\n")).reduce((a, b) => a + b, 0);
  assert(tot > 300000 && tot < 3000000, "site.yml รอบแรกควรใช้หลายนาที: " + tot / 1000 + "s"); }
// terraform output/state ต้องรันในโฟลเดอร์ terraform
{ sh2("cd ~/Desktop/work/pharmacy-aws-lab/ansible"); assert(/No outputs found/.test(sh2("terraform output vm_list")) && /No state file was found/.test(sh2("terraform state list")), "นอกโฟลเดอร์ terraform ต้องไม่เจอ state");
  sh2("cd ../terraform"); assert(/pharmacy-jenkins/.test(sh2("terraform output vm_list")), "ในโฟลเดอร์ terraform ต้องเห็น output"); }
// ---- deployment lab: GitHub → Jenkins (wizard) → SonarQube → ECR → ArgoCD → ALB
{ L.fresh(); const wu = L.API.createUser({ name: "w", policies: ["AdministratorAccess"] }).res, wk = L.API.createAccessKey(wu.id, "CLI", "");
  sh2("aws configure", [wk.res.id, wk.secret, "ap-southeast-1", "json"]); sh2("cd ~/Desktop/work/pharmacy-aws-lab/terraform"); sh2("terraform init"); sh2("terraform apply -auto-approve -var my_ip=198.51.100.7/32");
  const jIp0 = L.S.insts.find(i => i.name === "pharmacy-jenkins").publicIp, argoUrl = "http://" + L.S.albs[0].dns + ":8443";
  assert(L.webOpen("http://" + jIp0 + ":8080").err === "ERR_CONNECTION_REFUSED", "ยังไม่ได้รัน ansible → refused");
  sh2("cd ../ansible"); sh2("ansible-playbook site.yml");
  assert(L.webOpen("http://" + jIp0 + ":8080").site === "jenkins" && L.webOpen(argoUrl).site === "argocd" && L.webOpen("http://" + L.S.insts.find(i => i.name === "pharmacy-sonarqube").publicIp + ":9000").site === "sonarqube", "เปิด 3 เว็บได้หลัง ansible");
  const jsg = L.S.sgs.find(x => x.name === "pharmacy-jenkins"), keepIn = jsg.inbound.slice(); jsg.inbound = [];
  assert(L.webOpen("http://" + jIp0 + ":8080").err === "ERR_CONNECTION_TIMED_OUT", "ไม่มี SG rule → timeout"); jsg.inbound = keepIn;
  // GitHub: แก้ user แล้ว push ทั้งสอง repo
  const mainYml = L.REPO + "/ansible/group_vars/all/main.yml"; L.fsWrite(mainYml, L.fsRead(mainYml).replace("YOUR_GITHUB_USER", "me"));
  const appsYml = L.REPO + "/repo-manifests/argocd-apps/apps.yaml"; 
  sh2("cd ~/Desktop/work/pharmacy-aws-lab/repo-manifests"); assert(/not a git repository/.test(sh2("git add .")), "ต้อง git init ก่อน");
  ["git init -b main", "git add .", "git commit -m initial", "git remote add origin https://github.com/me/pharmacy-manifests.git", "git push -u origin main"].forEach(c => sh2(c)); // apps.yaml ยังเป็น placeholder
  sh2("cd ../repo-backend"); ["git init -b main", "git add .", "git commit -m initial", "git remote add origin https://github.com/me/pharmacy-backend.git", "git push -u origin main", "git tag v1.0.0"].forEach(c => sh2(c));
  assert(L.S.gh.repos["pharmacy-manifests"].user === "me" && L.S.gh.repos["pharmacy-backend"].tags.length === 0, "push แล้ว แต่ tag ยังไม่ push"); sh2("git push origin v1.0.0");
  sh2("cd ../repo-frontend"); ["git init -b main", "git add .", "git commit -m initial", "git remote add origin https://github.com/me/pharmacy-frontend.git", "git push -u origin main", "git tag v1.0.0", "git push origin v1.0.0"].forEach(c => sh2(c));
  assert(!L.S.gh.repos["pharmacy-app"] && L.S.gh.repos["pharmacy-frontend"].tags.includes("v1.0.0") && L.S.gh.repos["pharmacy-backend"].files["Dockerfile"] && !L.S.gh.repos["pharmacy-backend"].files["frontend/index.html"], "แยก 2 repo: backend ไม่มีไฟล์ frontend");
  // Jenkins wizard
  assert(L.jkSetup() === "unlock" && !L.jkUnlock("wrong") && L.jkUnlock(L.jkPwdOf(L.jkInst())), "unlock"); L.jkCustomize();
  assert(L.jkCreateAdmin({ user: "admin", pass: "a", pass2: "b", full: "A", email: "a@b.c" }).errors.pass2, "รหัสไม่ตรง"); assert(L.jkCreateAdmin({ user: "admin", pass: "pw1", pass2: "pw1", full: "Admin", email: "a@b.c" }).res, "สร้าง admin"); L.jkSetUrl(); L.jkStart(); L.jkSignOut(); assert(!L.jkSignIn("admin", "x") && L.jkSignIn("admin", "pw1"), "sign in");
  // SonarQube
  assert(L.sqLogin("admin", "admin").mustChange && L.sqChangePw("admin", "short", "short").errors.nw && L.sqChangePw("admin", "LongEnoughPw123", "LongEnoughPw123").res, "sonar เปลี่ยนรหัส"); const tok = L.sqGenToken({ name: "jenkins" }).res;
  L.jkAddCred({ id: "sonar-token", kind: "secret", secret: tok }); L.jkAddCred({ id: "github-token", kind: "userpass", user: "me", pass: "ghp_x" });
  const k1i = L.S.insts.find(i => i.name === "pharmacy-k8s-1"), kIp1 = k1i.privateIp, JJ = "ssh -J ubuntu@" + L.S.insts.find(i => i.name === "pharmacy-bastion").publicIp + " -i ~/.ssh/id_ed25519 ubuntu@"; L.jkAddCred({ id: "argocd-admin", kind: "userpass", user: "admin", pass: L.argoPwdOf(k1i) });
  // job: repo ยังไม่ push ใต้ user อื่น → fail
  const badJob = L.jkCreateJob({ name: "pharmacy-backend", repo: "https://github.com/YOUR_GITHUB_USER/pharmacy-backend.git", cred: "github-token", branch: "*/main", script: "Jenkinsfile" }); assert(badJob.res, "สร้าง job");
  const logOf = (b) => b.log.join("\n"); const b0 = L.jkBuildNow(); assert(/Repository not found/.test(logOf(b0)) && b0.result === "FAILURE", "clone ล้ม (URL placeholder)");
  L.jkCreateJob({ name: "pharmacy-backend", repo: "https://github.com/me/pharmacy-backend.git", cred: "github-token", branch: "*/main", script: "Jenkinsfile" });
  assert(L.jkCreateJob({ name: "x", repo: "https://github.com/me/pharmacy-app.git", branch: "*/main", script: "Jenkinsfile" }).errors.repo, "repo pharmacy-app รวมแล้วไม่ใช้อีก"); assert(L.jkCreateJob({ name: "pharmacy-backend", repo: "https://github.com/me/pharmacy-backend.git", branch: "*/main", script: "Jenkinsfile" }, true).errors.name, "ชื่อ job ซ้ำตอนสร้างใหม่");
  const b1 = L.jkBuildNow(); assert(b1 && /ยังไม่ได้เลือก VERSION/.test(logOf(b1)) && L.S.jk.job.paramsKnown, "build แรกล้ม VERSION ว่าง (quirk)"); assert(L.jkBuildNow() === null, "หลังรอบแรกไม่มี Build Now");
  L.jkCreateJob({ name: "pharmacy-frontend", repo: "https://github.com/me/pharmacy-frontend.git", cred: "github-token", branch: "*/main", script: "Jenkinsfile" }, true); L.jkBuildNow(); L.jkSelect("pharmacy-backend");
  assert(L.S.jk.jobs.length === 2 && L.S.jk.builds.filter(b => b.job === "pharmacy-frontend").length === 1 && L.S.jk.job.seq === 2 && L.jkJob("pharmacy-frontend").seq === 1, "2 job เลขรันแยกกัน");
  const P = (o) => Object.assign({ TARGET_ENV: "dev", SERVICE: "backend", VERSION: "v1.0.0", ACTION: "build-and-deploy", AUTO_SYNC: false, CHANGE_NOTE: "t" }, o);
  const run = (o) => { L.jkSelect((o && o.SERVICE) === "frontend" ? "pharmacy-frontend" : "pharmacy-backend"); const b = L.jkNew(P(o)); assert.strictEqual(b.params.SERVICE, L.S.jk.job.svc, "service มาจาก job"); return b; };
  assert(/Couldn't find any revision/.test(logOf(run({ VERSION: "v9.9.9" }))), "tag ไม่มีบน GitHub");
  // ก่อน apply apps: Jenkins ส่วน sonar ใช้ได้ แล้ว manifest push ต้องผ่าน
  sh2("cd ~/Desktop/work/pharmacy-aws-lab/ansible"); assert(/Repository not found/.test(logOf(run({}))), ".env ยังเก่า"); sh2("ansible-playbook jenkins.yml");
  const ok1 = run({}); assert(ok1.result === "SUCCESS" && /pharmacy\/backend:v1\.0\.0/.test(L.S.gh.repos["pharmacy-manifests"].files["dev/backend/deployment.yaml"]) && L.S.sq.projects.length === 1, "build dev backend ผ่าน: " + logOf(ok1).slice(-600));
  const badTok = L.jkCred("sonar-token"), goodH = badTok.h; badTok.h = "x"; assert(/Not authorized/.test(logOf(run({}))), "token sonar ผิด"); badTok.h = goodH;
  assert(run({ TARGET_ENV: "prd", VERSION: "dev-1" }).result === "FAILURE", "prd ต้องเป็น vN.N.N");
  const prd = run({ TARGET_ENV: "prd" }); assert(prd.state === "waiting", "prd รอ confirm"); L.jkInput(prd, true); assert(prd.result === "SUCCESS", "prd ผ่านหลังยืนยัน"); const pa = run({ TARGET_ENV: "prd", SERVICE: "frontend" }); L.jkInput(pa.id, false); assert(pa.result === "ABORTED", "abort");
  // ArgoCD: ยังไม่ apply apps → sync ไม่ได้
  assert(/not found/.test(logOf(run({ AUTO_SYNC: true }))), "ยังไม่มี app ใน ArgoCD");
  sh2(JJ + kIp1, ["yes"]);
  assert(L.argoPwdOf(k1i) === sh2("k3s kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"), "อ่านรหัส ArgoCD");
  assert(/404 Not Found/.test(sh2("k3s kubectl apply -f https://raw.githubusercontent.com/me/pharmacy-manifests/main/argocd-apps/apps.yaml")) === false, "apps.yaml ถูก push แล้ว (แต่ยังเป็น placeholder)");
  let st0 = L.argoStatus("pharmacy-backend-dev"); assert(st0.sync === "Unknown" && /Repository not found/.test(st0.msg), "apps.yaml ยังเป็น YOUR_GITHUB_USER → ComparisonError");
  sh2("exit");
  // แก้ apps.yaml แล้ว push: remote มี commit ของ Jenkins → ต้อง pull ก่อน
  L.fsWrite(appsYml, L.fsRead(appsYml).replace(/YOUR_GITHUB_USER/g, "me")); sh2("cd ~/Desktop/work/pharmacy-aws-lab/repo-manifests"); sh2("git add ."); sh2("git commit -m fix-user");
  assert(/rejected/.test(sh2("git push")), "remote เดินหน้าแล้ว ต้องถูกปฏิเสธ"); assert(/Fast-forward/.test(sh2("git pull")), "pull"); assert(/pharmacy\/backend:v1\.0\.0/.test(L.fsRead(L.REPO + "/repo-manifests/dev/backend/deployment.yaml")), "pull เอา commit ของ Jenkins มา"); sh2("git add ."); sh2("git commit -m fix-user"); assert(!/rejected/.test(sh2("git push")), "push หลัง pull ผ่าน");
  sh2(JJ + kIp1, ["yes"]); const ap = sh2("k3s kubectl apply -f https://raw.githubusercontent.com/me/pharmacy-manifests/main/argocd-apps/apps.yaml"); assert((ap.match(/configured|created/g) || []).length === 4, "ได้ 4 apps: " + ap);
  assert(L.argoStatus("pharmacy-backend-dev").health === "Healthy" && L.argoStatus("pharmacy-backend-dev").sync === "Synced", "dev auto-sync: " + JSON.stringify(L.argoStatus("pharmacy-backend-dev")));
  assert(L.argoStatus("pharmacy-frontend-dev").health === "Degraded" && /InvalidImageName/.test(L.argoStatus("pharmacy-frontend-dev").msg), "frontend dev ยังเป็น placeholder");
  assert(L.argoStatus("pharmacy-backend-prd").sync === "OutOfSync" && L.argoStatus("pharmacy-backend-prd").health === "Missing", "prd ไม่ auto: ยังไม่ sync");
  assert(/pharmacy-backend-dev\s+Synced\s+Healthy/.test(sh2("k3s kubectl get applications -n argocd")), "kubectl get applications"); sh2("exit");
  sh2("cd ~/Desktop/work/pharmacy-aws-lab/ansible");
  assert(run({ SERVICE: "frontend" }).result === "SUCCESS" && L.argoStatus("pharmacy-frontend-dev").health === "Healthy", "deploy frontend dev (dev auto)");
  const albDns = L.S.albs[0].dns; assert(L.webOpen("http://" + albDns + ":8080").site === "app", "ALB dev healthy หลัง frontend ขึ้น"); assert(L.webOpen("http://" + albDns).site === "alb503", "ALB prd ยัง 503");
  const sp = run({ TARGET_ENV: "prd", AUTO_SYNC: true }); L.jkInput(sp, true); assert(sp.result === "SUCCESS" && L.argoStatus("pharmacy-backend-prd").health === "Healthy", "prd backend AUTO_SYNC: " + logOf(sp).slice(-400));
  const spf = run({ TARGET_ENV: "prd", SERVICE: "frontend", AUTO_SYNC: true }); L.jkInput(spf, true); assert(spf.result === "SUCCESS" && L.webOpen("http://" + albDns).site === "app", "prd frontend แล้ว ALB prd healthy");
  L.S.roles.find(r => r.name === "pharmacy-k8s").policies = []; assert(L.argoStatus("pharmacy-backend-dev").health === "Degraded" && /ImagePullBackOff/.test(L.argoStatus("pharmacy-backend-dev").msg), "role k8s ไม่มี ECR → ImagePullBackOff"); }
// ---- โหมดเวลาเหมือนจริงของ Jenkins: build เดินทีละ stage
{ L.S.speed = "real"; L.S.roles.find(r => r.name === "pharmacy-k8s").policies = ["AmazonEC2ContainerRegistryReadOnly"];
  L.jkSelect("pharmacy-backend"); const rb = L.jkNew({ TARGET_ENV: "dev", SERVICE: "backend", VERSION: "v1.0.0", ACTION: "build-and-deploy", AUTO_SYNC: false, CHANGE_NOTE: "" });
  assert(rb.state === "running" && rb.stages.find(s => s.name === "Validate").st === "running" && rb.stages.find(s => s.name === "SonarQube scan").st === "pending", "real: เริ่มที่ Validate กำลังรัน");
  const before = L.S.gh.repos["pharmacy-manifests"].files["dev/backend/deployment.yaml"]; let guard = 0;
  while (rb.state === "running" && guard++ < 20) { assert(L.jkNextDelay(rb) >= 1, "delay ต่อ stage"); L.jkAdvance(rb, true); if (rb.stages.find(s => s.name === "Update manifest").st !== "success") assert(L.S.gh.repos["pharmacy-manifests"].files["dev/backend/deployment.yaml"] === before || rb.result, "manifest ยังไม่ถูก push ก่อนถึง stage นั้น"); }
  assert(rb.result === "SUCCESS" && guard > 3, "real: จบ SUCCESS หลายก้าว (" + guard + ")"); L.S.speed = "instant"; }
// ---- เวลาของ instance (โหมดเวลาเหมือนจริง)
{ L.fresh(); L.S.speed = "real"; const dv = L.S.vpcs[0], sn0 = L.S.subnets.find(x => x.vpcId === dv.id), li = L.API.launch({ name: "t", ami: "ami-ubuntu2404", type: "t3.micro", keyName: "", vpcId: dv.id, subnetId: sn0.id, autoIp: "Enable", sgIds: [], diskSize: 8, diskType: "gp3", tokens: "required", hop: 2, count: 1 }).res[0], t0 = li.born;
  assert.strictEqual(L.instPhase(li, t0 + 3000).state, "pending", "3s แรก pending");
  const p2 = L.instPhase(li, t0 + 30000); assert(p2.state === "running" && p2.check === "Initializing" && !p2.booted, "30s: running + Initializing + ยังไม่บูต");
  assert(L.instPhase(li, t0 + 60000).booted && L.instPhase(li, t0 + 60000).check === "Initializing", "60s: บูตแล้วแต่ check ยัง Initializing");
  assert.strictEqual(L.instPhase(li, t0 + 130000).check, "2/2 checks passed", "2 นาที: ผ่าน");
  L.S.speed = "instant"; assert.strictEqual(L.instPhase(li).state, "running", "โหมดทันที: running ทันที"); L.S.speed = "real"; li.born = Date.now() - 20000; assert(/Connection refused/.test(L.sshCheck(li, "").out) || /Connection timed out/.test(L.sshCheck(li, "").out), "บูตไม่เสร็จ ssh ไม่ได้");
  L.API.instState(li.id, "stop"); assert.strictEqual(L.instPhase(li, Date.now() + 1000).state, "stopping", "stop: stopping"); assert.strictEqual(L.instPhase(li, Date.now() + 60000).state, "stopped", "แล้ว stopped"); L.S.speed = "instant"; }
// ---- เวลาของ NAT / ALB (โหมดเวลาเหมือนจริง)
{ L.fresh(); L.S.speed = "real"; const v = L.S.vpcs[0], nt = { id: "nat-x", state: "available", born: Date.now() };
  assert.strictEqual(L.natPhase(nt), "pending", "NAT ใหม่ pending"); nt.born = Date.now() - 61000; assert.strictEqual(L.natPhase(nt), "available", "หลัง ~1 นาที available");
  const a = { id: "alb-x", born: Date.now() }; assert.strictEqual(L.albPhase(a), "provisioning", "ALB ใหม่ provisioning"); a.born = Date.now() - 181000; assert.strictEqual(L.albPhase(a), "active", "หลัง ~3 นาที active");
  L.S.speed = "instant"; a.born = Date.now(); nt.born = Date.now(); assert(L.albPhase(a) === "active" && L.natPhase(nt) === "available", "โหมดทันที: พร้อมเลย"); }
// ---- sed / grep บน laptop
{ L.fresh(); L.shRun("cd ~/Desktop/work/pharmacy-aws-lab");
  assert(L.shRun("grep -rn YOUR_GITHUB_USER ansible repo-manifests/argocd-apps").lines.length >= 2, "grep เจอ placeholder");
  assert.deepStrictEqual(L.shRun("sed -i 's/YOUR_GITHUB_USER/me/g' ansible/group_vars/all/main.yml repo-manifests/argocd-apps/apps.yaml").lines, [], "sed -i เงียบ");
  assert.strictEqual(L.shRun("grep -rn YOUR_GITHUB_USER ansible repo-manifests").lines.length, 0, "ไม่เหลือ placeholder");
  assert(/github_user: .?me/.test(L.shRun("cat ansible/group_vars/all/main.yml").lines.join("\n")), "ค่าใหม่ถูกเขียน");
  assert(/command not found|จำลองเฉพาะ/.test(L.shRun("sed 'p' x").lines[0]), "sed แบบอื่นบอกชัด"); }
// ---- ข้อมูล instance types จริง (AWS pricing, Singapore Linux)
{ const t3 = L.ITYPE_ALL.find(x => x[0] === "t3.micro"); assert(L.ITYPE_ALL.length > 800 && t3[1] === 2 && t3[2] === 1 && t3[5] === 0.0132, "t3.micro: 2 vCPU 1 GiB 0.0132 USD/h");
  L.ITYPES.forEach(n => assert(L.ITYPE_ALL.some(x => x[0] === n), "ตัวที่ launch ได้ต้องมีในรายการจริง: " + n)); }
// ---- launch wizard: SSH source แบบ Custom
{ L.fresh(); const dv = L.S.vpcs[0], sn0 = L.S.subnets.find(x => x.vpcId === dv.id);
  const r = L.API.launch({ name: "c", ami: "ami-ubuntu2404", type: "t3.micro", keyName: "", vpcId: dv.id, subnetId: sn0.id, autoIp: "Enable", sgIds: [], newSg: { name: "launch-wizard-9", desc: "d", src: "203.0.113.0/24", ssh: true }, diskSize: 8, diskType: "gp3", tokens: "required", hop: 2, count: 1 });
  assert(!r.errors, JSON.stringify(r.errors)); const g = L.S.sgs.find(x => x.name === "launch-wizard-9"); assert(g.inbound.some(x => x.from === 22 && x.src === "203.0.113.0/24"), "SSH จาก CIDR ที่ระบุ");
  const bad = L.API.launch({ name: "c2", ami: "ami-ubuntu2404", type: "t3.micro", keyName: "", vpcId: dv.id, subnetId: sn0.id, autoIp: "Enable", sgIds: [], newSg: { name: "launch-wizard-10", desc: "d", src: "xyz", ssh: true }, diskSize: 8, diskType: "gp3", tokens: "required", hop: 2, count: 1 }); assert(bad.errors, "CIDR ผิดต้องไม่ผ่าน"); }
// ---- HCL: ป้ายลำดับ/เมนู + แผนภาพขั้นการสร้าง
{ L.buildLab("full"); const pl = L.hclPlan(), code = L.hcl();
  assert(pl.length === 5 && pl.every(l => l.length), "5 ขั้นมี resource ครบ");
  const layerOf = k => L.HCL_INFO[k][0]; assert(layerOf("vpc") < layerOf("subnet") && layerOf("subnet") < layerOf("instance") && layerOf("instance") < layerOf("tgatt") && layerOf("alb") < layerOf("listener") && layerOf("rtb") < layerOf("rtba"), "ลำดับ dependency ถูก");
  assert(/# กดที่: VPC → Your VPCs → Create VPC/.test(code) && /# ขั้นที่ 5|ขั้นที่ 5 │ Listener/.test(code) && /ต้องมีก่อน: Load balancer, Target group/.test(code), "มี comment กดที่/ต้องมีก่อน");
  assert(code.split("resource \"").length > 30, "ยังมี resource ครบ"); }
// ---- ประเมินความเสี่ยงกฎ SG (0.0.0.0/0 ใช้เฉพาะ 80/443)
{ const g = { id: "sg-x", name: "t" }, R = (from, to, src, kind) => L.sgRuleRisk(g, { proto: "tcp", from, to, srcKind: kind || "cidr", src }).lvl;
  assert.strictEqual(R(80, 80, "0.0.0.0/0"), "ok", "80 ทั้งโลก OK"); assert.strictEqual(R(443, 443, "0.0.0.0/0"), "ok", "443 ทั้งโลก OK");
  assert.strictEqual(R(22, 22, "0.0.0.0/0"), "bad", "SSH ทั้งโลก เสี่ยง"); assert.strictEqual(R(3306, 3306, "0.0.0.0/0"), "bad", "DB ทั้งโลก เสี่ยง"); assert.strictEqual(R(8080, 8080, "0.0.0.0/0"), "bad", "8080 ทั้งโลก เสี่ยง");
  assert.strictEqual(R(22, 22, "198.51.100.7/32"), "ok", "/32 OK"); assert.strictEqual(R(22, 22, "203.0.113.0/24"), "warn", "/24 ทบทวน"); assert.strictEqual(R(3306, 3306, "sg-y", "sg"), "ok", "อ้าง SG OK");
  L.buildLab("full"); assert(!/❌/.test(L.hcl()), "lab ครบทั้งชุดไม่มีกฎเสี่ยง"); assert(/# ✅ เปิดทั้งโลกที่ port 80/.test(L.hcl()), "มี comment ประเมิน port 80"); }
// ---- ลบ route table (กติกาเหมือน AWS: ลบ main ไม่ได้ / ต้องปลดการผูก subnet ก่อน)
{ L.buildLab("full"); const rt = L.S.rtbs.find(r => !r.main && r.assoc.length), main = L.S.rtbs.find(r => r.main);
  assert(/DependencyViolation/.test(L.API.del("rtb", rt.id, "").errors._), "ยังผูก subnet ลบไม่ได้");
  assert(/main route table/.test(L.API.del("rtb", main.id, "").errors._), "main ลบไม่ได้");
  L.API.setAssoc(rt.id, []); const r2 = L.API.del("rtb", rt.id, ""); assert(r2.res && !L.S.rtbs.some(r => r.id === rt.id), "ปลดผูกแล้วลบได้"); }
// ---- แก้ outbound rules: ลบ All traffic → ออกเน็ตไม่ได้ (egress ปิด)
{ L.buildLab("full"); const ins = L.S.insts.find(i => i.name === "pharmacy-jenkins"), g = L.S.sgs.find(x => x.name === "pharmacy-jenkins");
  assert(L.internetOut(ins), "เริ่มต้นออกเน็ตได้");
  const r = L.API.setOutbound(g.id, []); assert(!r.errors, JSON.stringify(r.errors)); assert(!L.internetOut(ins) || ins.sgIds.some(id => id !== g.id && L.S.sgs.find(x => x.id === id).outbound.some(o => o.proto === "-1" && o.src === "0.0.0.0/0")), "ไม่มี egress กฎจากทุก SG ที่ผูก → ออกไม่ได้");
  L.API.setInbound(g.id, [{ type: "Custom TCP", port: "8080", srcKind: "Custom", src: "203.0.113.0/24", desc: "ทดสอบ" }]); assert.strictEqual(g.inbound[0].desc, "ทดสอบ", "เก็บ description"); }
// ---- แอป pharmacy จำลอง (ต้องตรงกับ repo-backend/stock/tests/test_api.py)
{ L.fresh(); const A = (m, p, b, up = true, env = "dev", auth = true) => L.phApi(env, m, p, b, up, auth), pw = L.phAdminPw();
  assert.strictEqual(A("GET", "/api/medicines", null, true, "dev", false).code, 401, "ไม่ล็อกอิน 401"); assert.strictEqual(A("GET", "/api/health", null, false, "dev", false).code, 200, "health ไม่ต้องล็อกอิน/DB");
  assert.strictEqual(A("POST", "/api/auth/login", { username: "admin", password: "bad" }, true, "dev", false).code, 401, "รหัสผิด 401"); assert.strictEqual(A("POST", "/api/auth/login", { username: "admin", password: pw }, true, "dev", false).code, 200, "ล็อกอินได้");
  assert.strictEqual(A("POST", "/api/auth/login", { username: "admin", password: pw }, false, "dev", false).code, 500, "DB ล่ม login ไม่ได้");
  assert.strictEqual(A("GET", "/api/ready", null, false).code, 503, "ready ไม่ผ่านเมื่อ DB ล่ม"); assert.strictEqual(A("GET", "/api/ready").code, 200);
  const l1 = A("GET", "/api/medicines").body; assert(l1.count === 9 && l1.results.length === 9 && l1.results[0].name === "Amoxicillin 500 mg", "dev มียาตัวอย่าง 9 รายการ เรียงตามชื่อ");
  assert.strictEqual(A("GET", "/api/medicines?q=para").body.count, 1, "ค้นหา"); assert.strictEqual(A("GET", "/api/medicines?low_stock=1").body.count, 3, "ใกล้หมด 3 (ibu, azi, lrt)"); assert.strictEqual(A("GET", "/api/medicines", null, true, "prd").body.count, 9, "prd มียาตัวอย่างด้วย (lab)");
  assert.strictEqual(A("GET", "/api/medicines?page=2").code, 404, "หน้าเกิน 404");
  for (const b of [{}, { sku: "X", name: " " }, { sku: "X", name: "x", price: "-1" }, { sku: "X", name: "x", price: "abc" }, { sku: "X".repeat(33), name: "x" }, { sku: "X", name: "x", reorder_level: -1 }, { sku: "PCM500", name: "dup" }]) assert.strictEqual(A("POST", "/api/medicines", b).code, 400, JSON.stringify(b));
  const ok = A("POST", "/api/medicines", { sku: "NEW1", name: " New drug ", price: "12.5", reorder_level: 5 }); assert(ok.code === 201 && ok.body.stock === 0 && ok.body.name === "New drug" && ok.body.price === "12.50", "เพิ่มได้ สต็อกเริ่ม 0"); const id = ok.body.id;
  for (const b of [{}, { delta: 0 }, { delta: "1" }, { delta: 1, reason: "gift" }, { delta: 2e6 }]) assert.strictEqual(A("POST", "/api/medicines/" + id + "/adjust", b).code, 400, "adjust " + JSON.stringify(b));
  assert.strictEqual(A("POST", "/api/medicines/999/adjust", { delta: 1 }).code, 404, "ไม่พบ");
  const neg = A("POST", "/api/medicines/" + id + "/adjust", { delta: -1 }); assert(neg.code === 400 && neg.body.stock === 0, "ไม่ติดลบ");
  assert.strictEqual(A("POST", "/api/medicines/" + id + "/adjust", { delta: 7, reason: "receive", note: "PO-1" }).body.stock, 7, "รับเข้า"); assert.strictEqual(A("POST", "/api/medicines/" + id + "/adjust", { delta: -3, reason: "dispense" }).body.stock, 4, "จ่ายออก");
  const mv = A("GET", "/api/movements").body; assert(mv.count === 2 && mv.results[0].delta === -3 && mv.results[0].stock_after === 4 && mv.results[1].note === "PO-1", "ประวัติใหม่สุดก่อน");
  assert.strictEqual(A("GET", "/api/summary").body.medicines, 10, "summary"); assert.strictEqual(A("DELETE", "/api/medicines/" + id).code, 204, "ลบได้"); assert.strictEqual(A("GET", "/api/movements").body.count, 0, "ลบยา ประวัติหายด้วย");
  assert.strictEqual(A("GET", "/api/medicines", null, false).code, 500, "DB ล่ม 500"); assert.strictEqual(A("POST", "/api/medicines", { sku: "" }, false).code, 500, "DB ล่ม: ตรวจ token ก่อน จึงเจอ 500 ก่อน 400");
  assert.strictEqual(A("GET", "/api/medicines", null, true, "prd").body.results.find(x => x.sku === "NEW1"), undefined, "dev กับ prd คนละฐานข้อมูล"); }
// ---- เปิดหน้า GitHub จำลอง
{ L.fresh(); L.shRun("cd ~/Desktop/work/pharmacy-aws-lab"); L.shRun("cd repo-backend"); ["git init -b main", "git add .", "git commit -m initial", "git remote add origin https://github.com/me/pharmacy-backend.git", "git push -u origin main", "git tag v1.0.0", "git push origin v1.0.0"].forEach(c => L.shRun(c));
  const r = L.webOpen("https://github.com/me/pharmacy-backend/tree/main/stock"); assert(r.site === "github" && r.path === "/me/pharmacy-backend/tree/main/stock", "เปิด github ได้");
  assert.strictEqual(L.webOpen("https://github.com/me/pharmacy-backend").site, "github"); assert(Object.prototype.hasOwnProperty.call(L.S.gh.repos["pharmacy-backend"].files, "manage.py"), "push แล้วมีไฟล์ใหม่ใน repo จำลอง"); }
// ---- ตัวอย่าง "พร้อมปล่อย": โหลดแล้ว push 3 repo → build 2 job → เปิดเว็บ pharmacy ผ่าน ALB ได้
{ const r = L.buildReady("maht25102542"); const sh = c => L.shRun(c).lines.join("\n");
  assert(r.user === "maht25102542" && L.S.jk.jobs.length === 2 && L.S.jk.jobs.every(j => j.paramsKnown) && L.S.jk.creds.length === 3 && L.S.sq.tokens.length === 1 && Object.keys(L.S.argo.apps).length === 4, "ตั้งค่าครบ");
  assert(L.webOpen("http://" + r.jenkins + ":8080").site === "jenkins" && L.webOpen("http://" + r.sonar + ":9000").site === "sonarqube" && L.webOpen(r.argocd).site === "argocd", "เปิด 3 เว็บได้ทันที");
  assert(L.webOpen("http://" + r.alb + ":8080").site === "alb503", "ยังไม่ deploy → ALB 503");
  assert(/YOUR_GITHUB_USER/.test(L.fsRead(L.REPO + "/ansible/group_vars/all/main.yml")) === false && /maht25102542/.test(L.fsRead(L.REPO + "/repo-manifests/argocd-apps/apps.yaml")), "แทนชื่อ GitHub แล้ว");
  const push = (dir, repo, tag) => { sh("cd " + L.REPO + "/" + dir); ["git init -b main", "git add .", "git commit -m initial", "git remote add origin https://github.com/maht25102542/" + repo + ".git", "git push -u origin main"].forEach(sh); if (tag) { sh("git tag v1.0.0"); sh("git push origin v1.0.0"); } };
  push("repo-manifests", "pharmacy-manifests"); push("repo-backend", "pharmacy-backend", 1); push("repo-frontend", "pharmacy-frontend", 1);
  const bb = (svc) => { L.jkSelect("pharmacy-" + svc); return L.jkNew({ TARGET_ENV: "dev", SERVICE: svc, VERSION: "v1.0.0", ACTION: "build-and-deploy", AUTO_SYNC: false, CHANGE_NOTE: "" }); };
  const b1 = bb("backend"), b2 = bb("frontend"); assert(b1.result === "SUCCESS" && b2.result === "SUCCESS", "build ผ่าน: " + b1.log.slice(-4).join("|") + b2.log.slice(-4).join("|"));
  assert(L.argoStatus("pharmacy-backend-dev").health === "Healthy" && L.argoStatus("pharmacy-frontend-dev").health === "Healthy", "dev deploy แล้ว (auto sync)");
  assert(L.webOpen("http://" + r.alb + ":8080").site === "app", "เปิดเว็บ pharmacy ผ่าน ALB dev ได้"); assert(L.phDbUp(), "DB (Galera) ใช้ได้จาก ansible"); }
// ---- ปุ่มลัด "พร้อมปล่อย": push → build dev → เว็บ dev → ปล่อย prd (ไม่ต้องพิมพ์)
{ const r = L.buildReady("maht25102542"); assert.deepStrictEqual(L.readyState(), { pushed: false, dev: false, prd: false }, "เริ่มต้นยังไม่ได้ทำอะไร");
  L.readyPushCmds().forEach(c => L.shRun(c)); assert.strictEqual(L.readyState().pushed, true, "push ครบ 3 repo + tag");
  const d = L.readyBuild("dev"); assert(d.every(x => x.result === "SUCCESS") && L.readyState().dev, "build dev ทั้ง 2 job ผ่าน"); assert.strictEqual(L.webOpen("http://" + r.alb + ":8080").site, "app", "เว็บ dev เปิดได้");
  assert.strictEqual(L.webOpen("http://" + r.alb).site, "alb503", "prd ยังไม่ปล่อย");
  const p = L.readyBuild("prd"); assert(p.every(x => x.result === "SUCCESS") && L.readyState().prd, "ปล่อย prd ผ่าน (ยืนยันให้)"); assert.strictEqual(L.webOpen("http://" + r.alb).site, "app", "เว็บ prd เปิดได้"); }
console.log("ok");

// ---- ตัวอย่างสำเร็จรูป Ansible
{ const run = (k, f) => { L.buildAnsibleLab(k); return L.shRun(f).lines.join("\n"); };
  assert(/ok=\d+/.test(run("ans", "ansible-playbook db.yml")) && !/unreachable=[1-9]/.test(L.shRun("ansible-inventory --graph").lines.join("\n")) , "ans: พร้อมรัน db.yml ผ่าน");
  assert(/PLAY RECAP/.test(run("ans-half", "ansible-playbook sonarqube.yml")) && L.S.insts.length === 10, "ans-half: db/k8s เสร็จแล้ว รัน sonarqube ต่อได้");
  assert(/UNREACHABLE|unreachable=[1-9]/.test(run("ans-sg", "ansible-playbook jenkins.yml")), "ans-sg: SSH ผิด IP -> UNREACHABLE");
  assert(/FAILED|failed=[1-9]|unreachable=[1-9]/.test(run("ans-noegress", "ansible-playbook jenkins.yml")), "ans-noegress: ไม่มีทางออกเน็ต -> ล้ม");
  const nn = run("ans-nonat", "ansible-playbook db.yml"); assert(/Failed to update apt cache/.test(nn) && /pharmacy-db-1\s+: ok=\d+\s+changed=\d+\s+unreachable=0\s+failed=1/.test(nn), "ans-nonat: db ใน private ไม่มี NAT -> apt ล้ม");
  assert(/pharmacy-jenkins\s+: ok=\d+\s+changed=\d+\s+unreachable=0\s+failed=0/.test(L.shRun("ansible-playbook jenkins.yml").lines.join("\n")), "ans-nonat: Jenkins (public ออกทาง IGW) ยังผ่าน"); }
