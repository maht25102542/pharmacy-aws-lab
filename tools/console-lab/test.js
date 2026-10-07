// รัน: node tools/console-lab/test.js  (เช็ก logic ของ engine ไม่ต้องใช้เบราว์เซอร์)
const fs = require("fs"), assert = require("assert"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
const logic = src.slice(0, src.indexOf("//==UI=="));
new Function(src); // syntax of the UI half (not executed)
const L = new Function(logic + ";return {tfInitCmd,tfPlanCmd,tfApplyCmd,tfValidateCmd,tfStateList,tfOutputCmd,fsWrite,fsRead,REPO,sessionCheck,POLICY_DEF,ensureState,principalActions,API,get S(){return S},shRun,fresh,buildLab,shRun,ansGraph,ansPing,ansPlaybook,ansInventory,checks,sshCheck,albHealth,hcl,lbName,ecrName,internetOut,delPlan,liveInsts}")();

L.buildLab("full");
assert.strictEqual(L.checks().filter(c => !c.ok).length, 0, "full lab ต้องผ่านทุกข้อ");
const jenkins = L.S.insts.find(i => i.name === "pharmacy-jenkins");
assert.strictEqual(L.sshCheck(jenkins, "pharmacy-admin").kind, "ok");
assert.strictEqual(L.sshCheck(jenkins, "other-key").kind, "denied");
assert(L.albHealth(L.S.albs[0]).every(r => r.ok), "ALB ต้อง healthy ทุก target");

L.buildLab("noassoc");
const j2 = L.S.insts.find(i => i.name === "pharmacy-jenkins");
assert.strictEqual(L.sshCheck(j2, "pharmacy-admin").kind, "timeout", "ลืม association ต้อง timeout");
L.buildLab("wrongip");
assert.strictEqual(L.sshCheck(L.S.insts[0], "pharmacy-admin").kind, "timeout", "SG ผิด IP ต้อง timeout");

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
assert(plan1.lines.join("\n").includes("Plan: 41 to add, 0 to change, 0 to destroy."), "plan ของ repo จริงต้องได้ 41 to add");
const applied = L.tfApplyCmd(plan1).join("\n");
assert(applied.includes("Apply complete! Resources: 41 added"), "apply ต้องสำเร็จ");
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
assert(L.ansPing("all").join("\n").split("pong").length - 1 === 9, "ping ทุกเครื่อง 9");
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
assert(dout.includes("Destroy complete! Resources: 41 destroyed."), "destroy ต้องลบหมด: " + dout.slice(-300));
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
assert(/Apply complete! Resources: 41 added/.test(ap), ap.slice(-400));
assert(/pharmacy-db-1/.test(sh("terraform state list") + sh("terraform output")), "output");
sh("cd ../ansible"); assert(/SUCCESS/.test(sh("ansible pharmacy-jenkins -m ping")), "ping");
assert(/failed=0/.test(sh("ansible-playbook site.yml")), "site.yml");
sh("cd ../terraform");
assert(/Destroy complete! Resources: 41 destroyed/.test(sh("terraform destroy -auto-approve")), "destroy");
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
assert(/vCPU ที่จะรันหลัง apply = 18[\s\S]*เกิน default quota/.test(L.tfPlanCmd(TFD, {}).lines.join("\n")), "plan ต้องเตือน vCPU 18 > 5");
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
console.log("ok");
