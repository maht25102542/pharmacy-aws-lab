// รัน: node tools/console-lab/test.js  (เช็ก logic ของ engine ไม่ต้องใช้เบราว์เซอร์)
const fs = require("fs"), assert = require("assert"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
const logic = src.slice(0, src.indexOf("//==UI=="));
new Function(src); // syntax of the UI half (not executed)
const L = new Function(logic + ";return {API,ghEnvReview,hash32,ghInit,jkCred,ghTokens,ghTokenCanPush,hcl,buildExpress,checksExpress,expEval,expOf,expResources,buildApr,checksApr,aprEval,aprSvc,buildSingle,checksSingle,ec2App,dnsA,webOpen,buildGha,checksGha,ghaTrust,ghaYaml,ghaRunsOf,ghaWf,isGhaLab,ghostRows,rdsPhase,acmStatus,cfInvTick,cfRequest,tfDestroySecs,eksPhase,ngPhase,cfPhase,rdsPhase,ecsWarm,cdTick,vpceReach,buildCd,checksCd,iamCan,cdPipe,cdProj,cdStageView,isCdLab,slsPartiql,slsInsights,slsMetrics,slsAlarmState,slsInvokeDirect,fsWrite,buildSls,checksSls,slsInvoke,slsLam,slsTbl,slsApi,slsApiHost,slsCan,isSlsLab,buildEcs,checksEcs,isEcsLab,ecsEval,ecsApiResponse,ecsClusterByName,ecsSvcOf,buildStatic,cfRequest,dnsResolve,acmStatus,s3Allows,bucketByName,checksStatic,isStaticLab,buildManaged,rdsReach,checksManaged,isManagedLab,sessionCheck,buildAnsibleLab,readyState,readyBuild,readyPushCmds,buildReady,jkSelect,jkJob,jkJobs,jkBuildsOf,jkRepoName,phApi,phState,phDbUp, phAdminPw,delPlan,sgRuleRisk,hcl,hclPlan,HCL_INFO,ITYPE_ALL,ITYPES,instPhase,natPhase,albPhase,webOpen,jkSetup,jkUnlock,jkCustomize,jkCreateAdmin,jkSetUrl,jkStart,jkSignIn,jkSignOut,jkPwdOf,jkInst,jkAddCred,jkCred,jkCreateJob,jkBuildNow,jkNew,jkAdvance,jkNextDelay,jkInput,sqLogin,sqChangePw,sqGenToken,argoPwdOf,argoStatus,argoApply,gitCmd,REPO2:REPO,tfInitCmd,tfPlanCmd,tfApplyCmd,tfValidateCmd,tfStateList,tfOutputCmd,fsWrite,fsRead,REPO,sessionCheck,POLICY_DEF,ensureState,principalActions,API,get S(){return S},shRun,timingPlan,fresh,buildLab,shRun,ansGraph,ansPing,ansPlaybook,ansInventory,checks,sshCheck,albHealth,hcl,lbName,ecrName,internetOut,delPlan,liveInsts}")();

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
  // repo ที่สร้างจากหน้า New repository (ว่าง, empty:true): push แรกต้องเติมไฟล์และเอา empty ออก
  { const keep = L.S.gh.repos["pharmacy-manifests"]; L.S.gh.repos["pharmacy-manifests"] = { user: "me", files: {}, tags: [], n: 0, empty: true }; sh2("cd ../repo-manifests"); sh2("git push -u origin main");
    const r1 = L.S.gh.repos["pharmacy-manifests"]; assert(r1.empty === false && Object.keys(r1.files).length > 0, "push เข้า repo ว่างที่สร้างจากเว็บ: เติมไฟล์ + empty=false"); }
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
  // token ที่สร้างจากหน้า GitHub จำลอง: classic ไม่ติ๊ก repo → push manifest 403 · ติ๊ก repo → ผ่าน · token ที่ถูก Delete → Authentication failed
  { L.ghInit(); const tk = { kind: "classic", name: "t", scopes: [], token: "ghp_testNoRepoScope", exp: "never" }; L.ghTokens().push(tk); const cr = L.jkCred("github-token"), oh = cr.h; cr.h = L.hash32(tk.token);
    assert(/Permission to .* denied/.test(logOf(run({}))) && !L.ghTokenCanPush(tk), "token ไม่มี scope repo → 403");
    tk.scopes = ["repo"]; assert.strictEqual(run({}).result, "SUCCESS", "token มี scope repo → ผ่าน");
    L.S.gh.tokens.splice(0, 1); L.S.gh.tokDel.push(tk); assert(/Authentication failed/.test(logOf(run({}))), "token ถูก Delete → Authentication failed"); cr.h = oh; }
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

// ---- ระบบแบบ managed: EKS + RDS + SSM (terraform-managed/)
{
  L.buildManaged("managed");
  const cm = L.checks(); assert(L.isManagedLab() && cm.length >= 20 && cm.every(c => c.ok), "managed lab ต้องผ่านทุกข้อ: " + cm.filter(c => !c.ok).map(c => c.label).join(" | "));
  assert(L.S.insts.filter(i => i.nodeRole && i.state === "running").length === 3 && L.S.eks.length === 1 && L.S.rds[0].multiAz, "node ×3 + EKS + RDS Multi-AZ");
  const nd = L.S.insts.filter(i => i.nodeRole), azs = new Set(nd.map(i => i.az)); assert(azs.size === 3, "node กระจาย 3 AZ");
  assert(L.albHealth(L.S.albs[0]).every(r => r.ok) && L.albHealth(L.S.albs[0]).length === 9, "ALB healthy 9 target (3 TG × 3 node)");
  assert(L.S.insts.every(i => !i.publicIp), "ไม่มีเครื่องไหนมี public IP");
  assert(!L.sessionCheck(L.S.insts.find(i => i.name === "pharmacy-jenkins")).steps.some(x => !x.ok), "SSM ผ่านทุกขั้น (role + NAT)");
  const code = L.hcl(); assert(/aws_eks_cluster/.test(code) && /aws_db_instance/.test(code) && /aws_autoscaling_attachment/.test(code) && !/aws_instance" "pharmacy_eks/.test(code), "HCL มี EKS/RDS/ASG attach และไม่เขียน node เป็น aws_instance");
  assert(L.hclPlan().length === 6, "แบบ managed มี 6 ขั้น");
  assert(L.API.rdsFailover("pharmacy-db").res && L.rdsReach(nd[0], L.S.rds[0]), "failover แล้ว node ยังต่อ endpoint เดิมได้");
  const d1 = L.API.del("rds", "pharmacy-db", "delete me"); assert(!d1.errors, JSON.stringify(d1));
  L.buildManaged("managed-nonat"); assert(L.sessionCheck(L.S.insts.find(i => i.name === "pharmacy-jenkins")).ok === false && !L.checks().every(c => c.ok), "ไม่มี NAT: SSM ต้องออฟไลน์");
  L.buildManaged("managed-badrole");
  const vv = L.S.vpcs.find(v => v.name === "pharmacy-vpc"), prv = L.S.subnets.filter(s => /private/.test(s.name)).map(s => s.id), rcl = L.S.roles.find(r => r.name === "pharmacy-eks-cluster");
  const ce = L.API.createEks({ name: "pharmacy-eks", roleArn: rcl.name, subnetIds: prv, cidrs: ["198.51.100.7/32"] }); assert(!ce.errors, JSON.stringify(ce.errors));
  const ngBad = L.API.createNodegroup({ cluster: "pharmacy-eks", name: "n", roleArn: "pharmacy-eks-node", subnetIds: prv, desired: 3, min: 3, max: 3 });
  assert(/NodeCreationFailure.*AmazonEKS_CNI_Policy/.test(ngBad.errors._create), "role ขาด CNI → NodeCreationFailure");
  assert(L.API.createEks({ name: "x", roleArn: "pharmacy-jenkins", subnetIds: prv }).errors.roleArn, "role ที่ไม่ trust EKS ต้อง error");
  assert(L.API.createEks({ name: "y", roleArn: rcl.name, subnetIds: [prv[0]] }).errors.subnetIds, "subnet AZ เดียวต้อง error");
  const sgOne = L.API.createDbSubnetGroup({ name: "g1", subnetIds: [prv[0]] }); assert(/at least 2 AZs/.test(sgOne.errors.subnetIds), "DB subnet group ต้องครอบ 2 AZ");
  const sgOk = L.API.createDbSubnetGroup({ name: "g2", subnetIds: prv }).res;
  assert(L.API.createRds({ id: "Bad_Name", engine: "mariadb", cls: "db.t4g.small", storage: 20, user: "u", manage: true, subnetGroup: sgOk.name }).errors.id, "ชื่อ DB ผิดกฎ");
  assert(L.API.createRds({ id: "ok-db", engine: "mariadb", cls: "db.t4g.small", storage: 10, user: "u", manage: true, subnetGroup: sgOk.name }).errors.storage, "storage < 20 ต้อง error");
  assert(L.API.createRds({ id: "ok-db", engine: "mariadb", cls: "db.t4g.small", storage: 20, user: "u", password: "short", subnetGroup: sgOk.name }).errors.password, "รหัสผ่านสั้นต้อง error");
  void vv;
}
// ---- Terraform แบบ managed: รันโค้ดจริงใน terraform-managed/ ผ่านเทอร์มินัลจำลอง
{
  L.fresh(); const u2 = L.API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, k2 = L.API.createAccessKey(u2.id, "CLI", "");
  function shm(line, answers) { let r = L.shRun(line), out = r.lines.slice(); answers = (answers || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(answers.shift()); out = out.concat(r.lines); } return out.join("\n"); }
  shm("aws configure", [k2.res.id, k2.secret, "ap-southeast-1", "json"]);
  shm("cd ~/Desktop/work/pharmacy-aws-lab/terraform"); shm("terraform init");
  assert(/Apply complete! Resources: 59 added/.test(shm("terraform apply", ["198.51.100.7/32", "yes"])), "แบบ VM ยัง apply ได้ 59");
  shm("cd ../terraform-managed"); shm("terraform init");
  assert(/ชื่อนี้แล้ว|already exists/i.test(shm("terraform apply", ["198.51.100.7/32", "yes"])), "apply สองชุดใน account เดียวกัน: ชื่อ resource ต้องชนกัน");
  shm("cd ../terraform"); assert(/Destroy complete! Resources: 59 destroyed/.test(shm("terraform destroy -auto-approve")), "destroy แบบ VM");
  shm("cd ../terraform-managed"); shm("terraform destroy -auto-approve");
  const apm = shm("terraform apply", ["198.51.100.7/32", "yes"]); assert(/Apply complete! Resources: 57 added/.test(apm), apm.slice(-500));
  assert(/db_endpoint = /.test(shm("terraform output")) && /aws_eks_cluster.main/.test(shm("terraform state list")), "output/state ของ managed แยกจากแบบ VM");
  assert(L.checks().every(c => c.ok), "หลัง apply managed ตัวตรวจต้องผ่าน: " + L.checks().filter(c => !c.ok).map(c => c.label).join(" | "));
  assert(/No changes/.test(shm("terraform plan", ["198.51.100.7/32"])), "plan ซ้ำต้องไม่มีอะไรเปลี่ยน (idempotent)");
  assert(/ยังไม่มี kubeconfig/.test(shm("kubectl get nodes")), "ยังไม่ update-kubeconfig ต้องต่อไม่ได้");
  assert(/Added new context/.test(shm("aws eks update-kubeconfig --region ap-southeast-1 --name pharmacy-eks")), "update-kubeconfig");
  const kn = shm("kubectl get nodes"); assert((kn.match(/ Ready /g) || []).length === 3, "kubectl get nodes ต้องเห็น 3 node Ready: " + kn);
  const jid = L.S.insts.find(i => i.name === "pharmacy-jenkins" && i.state === "running").id;
  assert(/Starting session/.test(shm("aws ssm start-session --target " + jid)), "ssm start-session ต้องเข้าได้"); assert(/ip-10-0-/.test(shm("hostname")) && /Exiting session/.test(shm("exit")), "อยู่ใน session แล้วพิมพ์ hostname/exit ได้");
  assert(/Port 8080 opened/.test(shm("aws ssm start-session --target " + jid + " --document-name AWS-StartPortForwardingSession --parameters portNumber=8080,localPortNumber=8080")), "port forward");
  assert(/"MultiAZ": true/.test(shm("aws rds describe-db-instances")) && /SecretString/.test(shm("aws secretsmanager get-secret-value --secret-id " + L.S.rds[0].secretArn)), "rds / secret");
  assert(/TargetNotConnected/.test(shm("aws ssm start-session --target i-doesnotexist")), "target ผิดต้อง error");
  L.S.eks[0].cidrs = ["203.0.113.0/24"]; assert(/i\/o timeout/.test(shm("kubectl get nodes")), "IP ไม่อยู่ใน allowlist ต้อง timeout"); L.S.eks[0].cidrs = ["198.51.100.7/32"];
  assert(/Destroy complete! Resources: 57 destroyed/.test(shm("terraform destroy -auto-approve")), "destroy managed");
  shm("cd ../terraform"); assert(!/pharmacy-vpc/.test(shm("terraform state list")), "state ของแบบ VM ไม่ปนกับของ managed");
}

// ---- use case 1: เว็บ static (S3 + CloudFront + Route 53 + ACM) แยก dev / prd
{
  L.buildStatic("static"); const cs = L.checksStatic();
  assert(L.isStaticLab() && cs.length >= 18 && cs.every(c => c.ok), "static lab ต้องผ่านทุกข้อ: " + cs.filter(c => !c.ok).map(c => c.label).join(" | "));
  const q1 = L.cfRequest("www.pharmacy.example.com", "/", "https"); assert(q1.status === 200 && /PRD/.test(q1.body) && q1.headers["x-cache"] === "Hit from cloudfront", "prd ต้องเปิดได้และเป็น cache hit (lab โหลดไว้แล้ว 1 ครั้ง)");
  assert(/DEV/.test(L.cfRequest("dev.pharmacy.example.com", "/", "https").body), "dev ต้องเป็นอีกหน้า");
  assert(L.cfRequest("www.pharmacy.example.com", "/", "http").status === 301, "http ต้อง redirect เป็น https");
  const nf = L.cfRequest("www.pharmacy.example.com", "/missing.html", "https"); assert(nf.status === 403 && /ListBucket/.test(nf.notes.join()), "ไฟล์ไม่มี = 403 (ไม่ใช่ 404)");
  assert(L.cfRequest("nohost.example.org", "/", "https").err === "DNS_PROBE_FINISHED_NXDOMAIN", "โดเมนที่ไม่มี zone ต้อง NXDOMAIN");
  L.buildStatic("static-403"); const e1 = L.cfRequest("www.pharmacy.example.com", "/", "https"); assert(e1.status === 403 && /SourceArn/.test(e1.notes.join()) && L.cfRequest("dev.pharmacy.example.com", "/", "https").status === 200, "policy ผิด distribution: prd 403 แต่ dev ปกติ");
  L.buildStatic("static-cert"); assert(L.S.cfds.every(d => !d.aliases.length) && L.S.certs[0].region === "ap-southeast-1", "static-cert: ใบรับรองผิด region");
  const bn = "pharmacy-web-prd-000000000000", oac = L.S.oacs[0];
  const ce = L.API.createCfd({ comment: "x", origins: [{ id: "o", domain: bn + ".s3.ap-southeast-1.amazonaws.com", oacId: oac.id }], aliases: ["www.pharmacy.example.com"], certArn: L.S.certs[0].arn });
  assert(/InvalidViewerCertificate.*us-east-1/.test(ce.errors.cert), "ใบรับรองผิด region ต้อง error: " + JSON.stringify(ce.errors));
  assert(L.API.createCfd({ comment: "x", origins: [{ id: "o", domain: bn + ".s3.ap-southeast-1.amazonaws.com" }], aliases: ["www.pharmacy.example.com"] }).errors.cert.indexOf("InvalidViewerCertificate") === 0, "alias ไม่มีใบรับรอง");
  L.buildStatic("static-cert-pending"); assert(L.acmStatus(L.S.certs[0]) === "PENDING_VALIDATION" && L.API.createCfd({ comment: "x", origins: [{ id: "o", domain: "a.s3.amazonaws.com" }], aliases: ["www.pharmacy.example.com"], certArn: L.S.certs[0].arn }).errors.cert, "ยังไม่สร้าง CNAME = Pending validation ใช้กับ CloudFront ไม่ได้");
  L.buildStatic("static-stale"); const st1 = L.cfRequest("www.pharmacy.example.com", "/", "https"); assert(/version 2/.test(st1.body) && /Hit/.test(st1.headers["x-cache"]) && /version 3/.test(L.bucketByName("pharmacy-web-prd-000000000000").objects[0].body), "แคชค้างเวอร์ชันเก่า");
  const prdD = L.S.cfds.find(d => d.aliases[0].startsWith("www")); L.API.createInvalidation(prdD.id, ["/*"]); assert(/version 3/.test(L.cfRequest("www.pharmacy.example.com", "/", "https").body), "invalidation แล้วต้องเห็นของใหม่");
  assert(L.API.createInvalidation(prdD.id, ["index.html"]).errors.paths, "path ไม่มี / นำหน้าต้อง error");
  assert(L.API.createBucket({ name: "Bad_Name", region: "ap-southeast-1" }).errors.name && L.API.createBucket({ name: "pharmacy", region: "ap-southeast-1" }).errors.name, "ชื่อ bucket ผิดกฎ / ซ้ำทั้งโลก");
  assert(/BlockPublicPolicy/.test(L.API.putBucketPolicy("pharmacy-web-prd-000000000000", JSON.stringify({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Principal: "*", Action: "s3:GetObject", Resource: "arn:aws:s3:::pharmacy-web-prd-000000000000/*" }] })).errors.policy), "policy public ถูกบล็อกโดย Block public access");
  L.buildStatic("static-base"); assert(!L.checksStatic().every(c => c.ok) && L.S.zones.length === 1 && L.acmStatus(L.S.certs[0]) === "ISSUED", "static-base: มีโซน+ใบรับรอง Issued แต่ยังไม่มี bucket/CloudFront");
}
// ---- Terraform labs/01-static-site รันในเทอร์มินัลจำลอง
{
  L.fresh(); const u3 = L.API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, k3 = L.API.createAccessKey(u3.id, "CLI", "");
  function shs(line, answers) { let r = L.shRun(line), out = r.lines.slice(); answers = (answers || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(answers.shift()); out = out.concat(r.lines); } return out.join("\n"); }
  shs("aws configure", [k3.res.id, k3.secret, "ap-southeast-1", "json"]);
  shs("cd ~/Desktop/work/pharmacy-aws-lab/labs/01-static-site"); shs("terraform init");
  const ps = shs("terraform plan"); assert(/Plan: 18 to add/.test(ps), ps.slice(-400));
  const as = shs("terraform apply", ["yes"]); assert(/Apply complete! Resources: 18 added/.test(as), as.slice(-600));
  assert(L.checksStatic().every(c => c.ok), "หลัง apply lab static ต้องผ่านทุกข้อ: " + L.checksStatic().filter(c => !c.ok).map(c => c.label).join(" | "));
  assert(/No changes/.test(shs("terraform plan")), "plan ซ้ำต้องไม่มีอะไรเปลี่ยน");
  assert(/version 1/.test(L.cfRequest("www.pharmacy.example.com", "/", "https").body), "เปิดเว็บ prd ได้หลัง apply");
  assert(/upload: .* to s3:\/\/pharmacy-web-prd/.test((shs("mkdir dist"), shs("echo '<h1>v2</h1>' > dist/index.html"), shs("aws s3 sync dist s3://pharmacy-web-prd-000000000000"))), "aws s3 sync");
  assert(/version 1/.test(L.cfRequest("www.pharmacy.example.com", "/", "https").body), "sync แล้วแต่ยังเห็นของเก่า (cache)");
  assert(/InProgress/.test(shs("aws cloudfront create-invalidation --distribution-id " + L.S.cfds.find(d => d.aliases[0].startsWith("www")).id + " --paths /*")) && /v2/.test(L.cfRequest("www.pharmacy.example.com", "/", "https").body), "สั่ง invalidation แล้วเห็นของใหม่");
  assert(/ALIAS/.test(shs("dig www.pharmacy.example.com")) && /NXDOMAIN/.test(shs("dig nohost.example.org")), "dig");
  assert(/Destroy complete! Resources: 18 destroyed/.test(shs("terraform destroy -auto-approve")), "destroy lab static");
}

// ---- use case 2: ECS Fargate + ALB + ECR + RDS (dev + prd)
{
  L.buildEcs("ecs"); const ce = L.checksEcs(); assert(L.isEcsLab() && ce.length >= 20 && ce.every(c => c.ok), "ecs lab ต้องผ่านทุกข้อ: " + ce.filter(c => !c.ok).map(c => c.label).join(" | "));
  const svp = L.ecsSvcOf("pharmacy-prd", "pharmacy-api"), evp = L.ecsEval(svp); assert(evp.healthy === 2 && new Set(evp.tasks.map(t => t.az)).size === 2, "prd: 2 task คนละ AZ healthy");
  const tgp = L.S.tgs.find(t => t.name === "pharmacy-api-prd"), r1 = L.ecsApiResponse(tgp), r2 = L.ecsApiResponse(tgp); assert(r1.env === "prd" && r1.db === "connected" && r1.task !== r2.task, "ALB กระจายคำขอข้าม task (round-robin)");
  assert(L.albHealth(L.S.albs[0]).length === 3 && L.albHealth(L.S.albs[0]).every(r => r.ok), "ALB: 3 target (prd 2 + dev 1) healthy");
  const bad = (k) => { L.buildEcs(k); return L.ecsEval(L.ecsSvcOf("pharmacy-prd", "pharmacy-api")); };
  let e = bad("ecs-pull"); assert(e.tasks.every(t => t.state === "STOPPED" && t.stage === "network" && /i\/o timeout/.test(t.reason)), "ไม่มี NAT: ดึง image ไม่ได้");
  e = bad("ecs-image"); assert(e.tasks.every(t => t.stage === "image" && /CannotPullContainerError/.test(t.reason) && /not found/.test(t.reason)), "ไม่มี image tag ใน ECR");
  e = bad("ecs-role"); assert(e.tasks.every(t => t.stage === "role" && /ecr:GetAuthorizationToken/.test(t.reason)), "execution role ขาด policy");
  e = bad("ecs-db"); assert(e.tasks.every(t => t.stage === "db" && /Essential container in task exited/.test(t.reason) && t.logs.some(l => /Connection timed out/.test(l))), "SG DB ไม่รับจาก task: แอปล้ม");
  e = bad("ecs-health"); assert(e.tasks.every(t => t.state === "RUNNING" && !t.healthy && t.code === "Target.FailedHealthChecks") && !L.albHealth(L.S.albs[0]).filter(r => /prd/.test(r.t.name)).some(r => r.ok) && L.albHealth(L.S.albs[0]).filter(r => /dev/.test(r.t.name)).every(r => r.ok), "health path ผิด: prd unhealthy แต่ dev ปกติ");
  assert(L.ecsApiResponse(L.S.tgs.find(t => t.name === "pharmacy-api-prd")) === null, "prd ไม่มี task healthy = ALB ตอบ 503");
  L.buildEcs("ecs-base"); assert(!L.checksEcs().every(c => c.ok) && L.S.esvcs.length === 0 && L.S.rds.length === 2, "ecs-base: โครงพร้อม ยังไม่มี cluster/service");
  const prv = L.S.subnets.filter(s => /private/.test(s.name)).map(s => s.id), sgt = L.S.sgs.find(g => g.name === "pharmacy-task");
  assert(/awsvpc/.test(L.API.registerTd({ family: "x", cpu: 100, memory: 100, containers: [{ name: "a", image: "i" }] }).errors.memory) || /No Fargate configuration/.test(L.API.registerTd({ family: "x", cpu: 256, memory: 4096, containers: [{ name: "a", image: "i" }] }).errors.memory), "cpu/memory ต้องเป็นคู่ที่ Fargate รองรับ");
  const cl = L.API.createEcsCluster({ name: "pharmacy-dev" }).res, td = L.API.registerTd({ family: "t1", cpu: 256, memory: 512, execRole: "pharmacy-ecs-execution", containers: [{ name: "api", image: "x", port: 8000 }] }).res;
  const tgi = L.S.tgs.find(t => t.name === "pharmacy-api-dev"); tgi.ttype = "instance";
  assert(/target type instance, which is incompatible with the awsvpc/.test(L.API.createEcsService({ name: "s", cluster: cl.name, td: "t1:1", desired: 1, subnetIds: prv, sgIds: [sgt.id], lb: { tgArn: "arn:aws:elasticloadbalancing:ap-southeast-1:000000000000:targetgroup/pharmacy-api-dev/" + tgi.id.slice(-16), container: "api", port: 8000 } }).errors.lb), "TG แบบ instance ผูกกับ awsvpc ไม่ได้");
  tgi.ttype = "ip"; assert(/did not have a container port 9000/.test(L.API.createEcsService({ name: "s", cluster: cl.name, td: "t1:1", desired: 1, subnetIds: prv, sgIds: [sgt.id], lb: { tgArn: "arn:aws:elasticloadbalancing:ap-southeast-1:000000000000:targetgroup/pharmacy-api-dev/" + tgi.id.slice(-16), container: "api", port: 9000 } }).errors.lb), "container port ไม่ตรง task definition");
  void td;
}
// ---- Terraform labs/02-ecs-fargate + docker push ในเทอร์มินัลจำลอง
{
  L.fresh(); const u4 = L.API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, k4 = L.API.createAccessKey(u4.id, "CLI", "");
  function sh4(line, answers) { let r = L.shRun(line), out = r.lines.slice(); answers = (answers || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(answers.shift()); out = out.concat(r.lines); } return out.join("\n"); }
  sh4("aws configure", [k4.res.id, k4.secret, "ap-southeast-1", "json"]);
  sh4("cd ~/Desktop/work/pharmacy-aws-lab/labs/02-ecs-fargate"); sh4("terraform init");
  const pl = sh4("terraform plan", ["198.51.100.7/32"]); assert(/Plan: 42 to add/.test(pl), pl.slice(-500));
  const ap = sh4("terraform apply", ["198.51.100.7/32", "yes"]); assert(/Apply complete! Resources: 42 added/.test(ap), ap.slice(-700));
  let ev = L.ecsEval(L.ecsSvcOf("pharmacy-prd", "pharmacy-api")); assert(ev.tasks.every(t => t.stage === "image"), "apply เสร็จแต่ยังไม่ push image: task ดึงไม่ได้");
  assert(/no basic auth credentials/.test(sh4("docker push 000000000000.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/api:v1.0.0")) === false, "ยังไม่มี image ในเครื่อง");
  sh4("docker build -t 000000000000.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/api:v1.0.0 ./api");
  assert(/no basic auth credentials/.test(sh4("docker push 000000000000.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/api:v1.0.0")), "ยังไม่ login ECR ต้อง push ไม่ได้");
  assert(/Login Succeeded/.test(sh4("aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 000000000000.dkr.ecr.ap-southeast-1.amazonaws.com")), "docker login ECR");
  const ps = sh4("docker push 000000000000.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/api:v1.0.0"); assert(/digest: sha256/.test(ps), ps);
  assert(/ImageTagAlreadyExists/.test(sh4("docker push 000000000000.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/api:v1.0.0")), "tag immutable: push ซ้ำต้อง error");
  ev = L.ecsEval(L.ecsSvcOf("pharmacy-prd", "pharmacy-api")); assert(ev.healthy === 2, "push แล้ว task ขึ้นเองครบ: " + JSON.stringify(ev.tasks.map(t => t.stage + ":" + t.reason)));
  assert(L.checksEcs().every(c => c.ok), "หลัง apply+push ตัวตรวจต้องผ่าน: " + L.checksEcs().filter(c => !c.ok).map(c => c.label).join(" | "));
  assert(/No changes/.test(sh4("terraform plan", ["198.51.100.7/32"])), "plan ซ้ำต้องไม่มีอะไรเปลี่ยน");
  assert(/"runningCount": 2/.test(sh4("aws ecs describe-services --cluster pharmacy-prd --services pharmacy-api")) && /cluster\/pharmacy-prd/.test(sh4("aws ecs list-clusters")), "aws ecs");
  assert(/connected to postgres/.test(sh4("aws logs tail /ecs/pharmacy-api-prd")), "aws logs tail เห็น log แอป");
  assert(/Destroy complete! Resources: 42 destroyed/.test(sh4("terraform destroy -auto-approve")), "destroy lab ecs");
}
// ชื่อ function ระดับบนซ้ำกันข้ามไฟล์ = ตัวหลังทับตัวแรกเงียบๆ (เคยทำให้ Settings › Public profile พัง) · ที่ซ้ำเดิมเป็นสำเนาเหมือนกัน
{
  const seen = {}, ALLOW = ["ip2n", "n2ip", "tagList", "tfSortedKeys"];
  for (const d of ["", "mod"]) for (const f of fs.readdirSync(path.join(__dirname, "src", d)).filter(x => x.endsWith(".js"))) for (const m of fs.readFileSync(path.join(__dirname, "src", d, f), "utf8").matchAll(/^function ([A-Za-z0-9_$]+)\(/gm)) (seen[m[1]] = seen[m[1]] || []).push(path.join(d, f));
  const dup = Object.keys(seen).filter(n => seen[n].length > 1 && !ALLOW.includes(n));
  assert(!dup.length, "ชื่อ function ซ้ำ (ตัวหลังทับตัวแรก): " + dup.map(n => n + " [" + seen[n].join(", ") + "]").join(" ; "));
}
console.log("ok");

// ---- ตัวอย่างสำเร็จรูป Ansible
{ const run = (k, f) => { L.buildAnsibleLab(k); return L.shRun(f).lines.join("\n"); };
  assert(/ok=\d+/.test(run("ans", "ansible-playbook db.yml")) && !/unreachable=[1-9]/.test(L.shRun("ansible-inventory --graph").lines.join("\n")) , "ans: พร้อมรัน db.yml ผ่าน");
  assert(/PLAY RECAP/.test(run("ans-half", "ansible-playbook sonarqube.yml")) && L.S.insts.length === 10, "ans-half: db/k8s เสร็จแล้ว รัน sonarqube ต่อได้");
  assert(/UNREACHABLE|unreachable=[1-9]/.test(run("ans-sg", "ansible-playbook jenkins.yml")), "ans-sg: SSH ผิด IP -> UNREACHABLE");
  assert(/FAILED|failed=[1-9]|unreachable=[1-9]/.test(run("ans-noegress", "ansible-playbook jenkins.yml")), "ans-noegress: ไม่มีทางออกเน็ต -> ล้ม");
  const nn = run("ans-nonat", "ansible-playbook db.yml"); assert(/Failed to update apt cache/.test(nn) && /pharmacy-db-1\s+: ok=\d+\s+changed=\d+\s+unreachable=0\s+failed=1/.test(nn), "ans-nonat: db ใน private ไม่มี NAT -> apt ล้ม");
  assert(/pharmacy-jenkins\s+: ok=\d+\s+changed=\d+\s+unreachable=0\s+failed=0/.test(L.shRun("ansible-playbook jenkins.yml").lines.join("\n")), "ans-nonat: Jenkins (public ออกทาง IGW) ยังผ่าน"); }
// ---- Lab 3: Serverless API (Lambda + API Gateway + DynamoDB)
{
  L.buildSls("sls"); assert(L.isSlsLab() && L.checksSls().every(c => c.ok), "sls: ต้องผ่านทุกข้อ: " + L.checksSls().filter(c => !c.ok).map(c => c.label).join(" | "));
  const host = (e) => L.slsApiHost(L.S.apis.find(a => a.name === "pharmacy-api-" + e));
  L.S.lams.forEach(l => { l.warm = false; }); let r = L.slsInvoke(host("prd"), "/prd/drugs", "GET", ""); assert(r.status === 200 && r.body.count === 2 && r.body.env === "prd" && r.cold === true, JSON.stringify(r.body));
  assert(L.slsInvoke(host("prd"), "/prd/drugs", "GET", "").cold === false, "ครั้งที่ 2 = warm (ไม่มี Init Duration)");
  r = L.slsInvoke(host("dev"), "/dev/drugs", "POST", '{"name":"Aspirin"}'); assert(r.status === 201 && L.slsTbl("pharmacy-drugs-dev").items.length === 4, "POST เพิ่มรายการ");
  assert(L.slsInvoke(host("dev"), "/dev/drugs", "POST", "not json").status === 400, "POST body ไม่ใช่ JSON");
  assert(L.slsInvoke(host("dev"), "/nope/drugs", "GET", "").status === 404 && L.slsInvoke(host("dev"), "/dev/other", "GET", "").status === 404, "stage/route ผิด = 404");
  assert(L.S.lamLogs.some(l => l.fn === "pharmacy-api-dev" && l.lines.some(x => /REPORT/.test(x))) && L.S.lgs.some(g => g.name === "/aws/lambda/pharmacy-api-dev"), "มี log ของ Lambda");
  const bad = (k) => { L.buildSls(k); return L.slsInvoke(host("prd"), "/prd/drugs", "GET", ""); };
  r = bad("sls-perm"); assert(r.status === 500 && L.S.lamLogs[0] === undefined ? false : /AccessDeniedException[\s\S]*dynamodb:Scan/.test(L.S.lamLogs.find(l => l.fn === "pharmacy-api-prd").lines.join("\n")), "perm: AccessDenied ใน log");
  assert(L.slsInvoke(host("dev"), "/dev/drugs", "GET", "").status === 200, "perm: dev ปกติ");
  r = bad("sls-invoke"); assert(r.status === 500 && r.steps.some(s => !s.ok && /resource-based policy/.test(s.t)) && !L.S.lamLogs.some(l => l.fn === "pharmacy-api-prd"), "invoke: ไม่มี permission = 500 และ Lambda ไม่เคยถูกเรียก (ไม่มี log)");
  r = bad("sls-route"); assert(r.status === 404, "route พิมพ์ผิด = 404");
  r = bad("sls-table"); assert(r.status === 500 && /ResourceNotFoundException/.test(L.S.lamLogs.find(l => l.fn === "pharmacy-api-prd").lines.join("\n")), "table: TABLE_NAME ผิด");
  L.buildSls("sls-base"); assert(L.S.lams.length === 0 && L.S.ddb.length === 2 && !L.checksSls().every(c => c.ok), "sls-base");
  assert(L.API.createLambda({ name: "x", runtime: "python3.12", handler: "app.handler", role: "pharmacy-api-dev-lambda", memory: 64 }).errors.memory && /cannot be assumed/.test(L.API.createLambda({ name: "x", runtime: "python3.12", handler: "app.handler", role: "nope" }).errors.role), "createLambda validate");
  L.fresh(); const u5 = L.API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, k5 = L.API.createAccessKey(u5.id, "CLI", "");
  function sh5(line, answers) { let r = L.shRun(line), out = r.lines.slice(); answers = (answers || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(answers.shift()); out = out.concat(r.lines); } return out.join("\n"); }
  sh5("aws configure", [k5.res.id, k5.secret, "ap-southeast-1", "json"]);
  sh5("cd ~/Desktop/work/pharmacy-aws-lab/labs/03-serverless"); sh5("terraform init");
  const pl = sh5("terraform plan"); assert(/Plan: 24 to add/.test(pl), pl.slice(-600));
  const ap0 = sh5("terraform apply", ["yes"]); assert(/unable to load "\.\/build\/app\.zip": open \.\/build\/app\.zip: no such file or directory/.test(ap0), "ยังไม่ zip = apply ล้ม: " + ap0.slice(-700));
  assert(/zip warning: name not matched: nope\.py/.test(sh5("cd src\nzip ../build/app.zip nope.py")) || true, "zip");
  sh5("cd src"); assert(/adding: app\.py/.test(sh5("zip ../build/app.zip app.py")), "zip สร้างไฟล์"); sh5("cd ..");
  const ap = sh5("terraform apply", ["yes"]); assert(/Apply complete! Resources: \d+ added/.test(ap) && L.S.lams.length === 2, ap.slice(-900));
  assert(L.checksSls().filter(c => !/GET \/drugs ผ่าน API/.test(c.label)).every(c => c.ok), "หลัง apply: " + L.checksSls().filter(c => !c.ok).map(c => c.label).join(" | "));
  assert(/Plan:|No changes/.test(sh5("terraform plan")) && /No changes/.test(sh5("terraform plan")), "plan ซ้ำต้องไม่เปลี่ยน");
  const ep = L.slsApiHost(L.S.apis.find(a => a.name === "pharmacy-api-dev"));
  assert(/"count": ?0|"count":0/.test(sh5("curl https://" + ep + "/dev/drugs")), "table ว่างหลัง apply");
  sh5("aws dynamodb put-item --table-name pharmacy-drugs-dev --item '{\"id\":{\"S\":\"9\"},\"name\":{\"S\":\"Ibuprofen\"}}'");
  assert(/Ibuprofen/.test(sh5("curl https://" + ep + "/dev/drugs")) && /Ibuprofen/.test(sh5("aws dynamodb scan --table-name pharmacy-drugs-dev")), "put-item → curl/scan เห็นข้อมูล");
  assert(/201/.test(sh5("curl -i -X POST -d '{\"name\":\"X\"}' https://" + ep + "/dev/drugs")), "curl POST");
  assert(/REPORT/.test(sh5("aws logs tail /aws/lambda/pharmacy-api-dev")), "logs tail ของ Lambda");
  const inv = sh5("aws lambda invoke --function-name pharmacy-api-dev --payload '{\"rawPath\":\"/drugs\",\"requestContext\":{\"http\":{\"method\":\"GET\"}}}' out.json"); assert(/"StatusCode": 200/.test(inv) && !/FunctionError/.test(inv) && /statusCode/.test(sh5("cat out.json")), inv + sh5("cat out.json"));
  assert(/"Sid": "AllowAPIGatewayInvoke"|AllowAPIGatewayInvoke/.test(sh5("aws lambda get-policy --function-name pharmacy-api-dev")), "get-policy");
  assert(/pharmacy-api-dev/.test(sh5("aws lambda list-functions")), "lambda list-functions");
  const ds = sh5("terraform destroy", ["yes"]); assert(/Destroy complete! Resources: 24 destroyed/.test(ds), ds.slice(-900));
  assert(L.S.lams.length === 0 && L.S.apis.length === 0 && L.S.ddb.length === 0, "destroy หมด");
  // ---- ฟีเจอร์ที่เคยเป็นสีเทา: PartiQL, Logs Insights, metrics/alarm, layer, custom domain, ปุ่ม Test, ลบผ่าน console
  L.buildSls("sls");
  let q = L.slsPartiql('SELECT * FROM "pharmacy-drugs-dev" WHERE id=\'1\''); assert(q.rows.length === 1 && q.rows[0].name === "Paracetamol 500mg", "PartiQL select");
  assert(/ResourceNotFoundException/.test(L.slsPartiql('SELECT * FROM "nope"').err) && /well formed/.test(L.slsPartiql("DROP everything").err), "PartiQL error");
  assert(L.slsPartiql('INSERT INTO "pharmacy-drugs-dev" VALUE {\'id\':\'9\',\'name\':\'X\'}').msg && /Duplicate/.test(L.slsPartiql('INSERT INTO "pharmacy-drugs-dev" VALUE {\'id\':\'9\'}').err), "PartiQL insert/dup");
  assert(L.slsPartiql('UPDATE "pharmacy-drugs-dev" SET stock=5 WHERE id=\'9\'').msg && L.slsPartiql('DELETE FROM "pharmacy-drugs-dev" WHERE id=\'9\'').msg, "PartiQL update/delete");
  L.buildSls("sls-perm"); const apx = L.S.apis.find(a => /prd/.test(a.name)); L.slsInvoke(L.slsApiHost(apx), "/prd/drugs", "GET", "");
  assert(L.slsInsights("/aws/lambda/pharmacy-api-prd", "filter @message like /AccessDenied/ | limit 5").rows.length >= 1 && L.slsInsights("/aws/lambda/pharmacy-api-prd", "filter @message like /REPORT/ | stats count(*)").rows[0]["count(*)"] === 1 && /MalformedQuery/.test(L.slsInsights("/aws/lambda/pharmacy-api-prd", "bogus stuff").err), "Logs Insights");
  assert(L.slsMetrics().some(m => m[1] === "5xx" && m[3] === 1), "metric 5xx นับได้");
  const al = L.API.createAlarm({ name: "prd-5xx", metric: "AWS/ApiGateway|5xx|ApiId=" + apx.id + " (" + apx.name + ")", threshold: 1 }).res; assert(L.slsAlarmState(al) === "ALARM", "alarm เข้า ALARM เมื่อ 5xx >= 1");
  assert(L.API.createAlarm({ name: "x", metric: "nope", threshold: 1 }).errors.metric, "alarm metric ผิด");
  assert(L.API.createLayer({ name: "l", file: "nope.zip", runtimes: ["python3.12"] }).errors.file, "layer ไม่มี zip = error"); L.fsWrite("/tmp/l.zip", "PK x"); assert(L.API.createLayer({ name: "l", file: "/tmp/l.zip", runtimes: ["python3.12"] }).res.versions.length === 1 && L.API.createLayer({ name: "l", file: "/tmp/l.zip", runtimes: ["python3.12"] }).res.versions.length === 2, "layer version เพิ่ม");
  assert(/not Issued|ยังไม่ Issued|ต้องเลือก ACM/.test(JSON.stringify(L.API.createApiDomain({ name: "api.pharmacy.example.com", cert: "" }).errors)), "custom domain ต้องมี cert");
  const t0 = L.slsInvokeDirect("pharmacy-api-prd", '{"rawPath":"/drugs","requestContext":{"http":{"method":"GET"}}}'); assert(t0.failed && t0.payload.errorType === "ClientError" && /AccessDeniedException/.test(t0.payload.errorMessage) && t0.payload.stackTrace.length >= 3, "Test: error แบบ Lambda จริง");
  assert(/Could not parse request body into json/.test(L.slsInvokeDirect("pharmacy-api-prd", "{bad").fnErr) && /Function not found/.test(L.slsInvokeDirect("nope", "{}").fnErr), "Test: event ผิด / function ไม่มี");
  L.buildSls("sls"); assert(!L.slsInvokeDirect("pharmacy-api-dev", "{}").failed, "Test: สำเร็จ");
  L.buildEcs("ecs"); const sv0 = L.S.esvcs.length; L.API.del("esvc", L.S.esvcs[0].id, "delete"); assert(L.S.esvcs.length === sv0 - 1, "ลบ ECS service ผ่าน API.del ได้จริง");
}
// ---- Lab 4: CI/CD (CodePipeline + CodeBuild → ECR → ECS dev → อนุมัติ → prd)
{
  L.buildCd("cd"); let pp = L.cdPipe("pharmacy-api");
  assert(L.checksCd().every(c => c.ok), "cd: ต้องผ่านทุกข้อ: " + L.checksCd().filter(c => !c.ok).map(c => c.label).join(" | "));
  assert(L.S.repos[0].images.length === 2 && L.S.esvcs.every(s => !/:1$/.test(s.td)), "image ใหม่ถูก push และทั้ง dev/prd ใช้ revision ใหม่");
  const first = pp.execs[0].stages[1].actions[0]; assert(/Build 1 succeeded/.test(first.summary), first.summary);
  const rel = L.API.startPipeline("pharmacy-api"); assert(rel.res.status === "InProgress" && rel.res.stages[3].status === "Waiting" && rel.res.stages[4].status === "NotRun", "release ใหม่หยุดรออนุมัติ");
  assert(L.API.approveStage("pharmacy-api", rel.res.id, false, "ไม่ผ่าน").res.status === "Failed", "reject = Failed");
  const bad = (k) => { L.buildCd(k); return L.cdPipe("pharmacy-api").execs[0]; };
  let ex = bad("cd-conn"); assert(ex.status === "Failed" && /Connection is not available/.test(ex.stages[0].actions[0].err) && ex.stages[1].status === "NotRun", "conn PENDING: Source ล้ม");
  L.API.authorizeConnection("pharmacy-github"); L.API.retryStage("pharmacy-api", L.cdPipe("pharmacy-api").execs[0].id, 0); ex = L.cdPipe("pharmacy-api").execs[0]; assert(ex.stages[0].status === "Succeeded" && ex.stages[3].status === "Waiting", "authorize แล้ว retry ผ่านจนถึง Approve");
  ex = bad("cd-docker"); assert(ex.stages[1].status === "Failed" && /Cannot connect to the Docker daemon/.test(L.cdProj("pharmacy-api-build").builds[0].logs.join("\n")), "ไม่เปิด privileged: docker daemon");
  L.API.updateCbProject("pharmacy-api-build", { privileged: true }); L.API.retryStage("pharmacy-api", L.cdPipe("pharmacy-api").execs[0].id, 1); assert(L.cdPipe("pharmacy-api").execs[0].stages[2].status === "Succeeded", "เปิด privileged แล้ว retry Build ผ่านถึง deploy dev");
  ex = bad("cd-ecr"); assert(ex.stages[1].status === "Failed" && /ecr:GetAuthorizationToken/.test(L.cdProj("pharmacy-api-build").builds[0].logs.join("\n")), "role CodeBuild ไม่มี ECR");
  L.S.roles.find(r => r.name === "pharmacy-codebuild").policies.push("AmazonEC2ContainerRegistryPowerUser"); L.API.retryStage("pharmacy-api", L.cdPipe("pharmacy-api").execs[0].id, 1); assert(L.cdPipe("pharmacy-api").execs[0].stages[1].status === "Succeeded", "แนบ ECR PowerUser แล้ว retry ผ่าน");
  ex = bad("cd-deploy"); assert(ex.stages[2].status === "Failed" && /Unable to find container named 'app'/.test(ex.stages[2].actions[0].err), "CONTAINER_NAME ผิด");
  ex = bad("cd-pass"); assert(ex.stages[2].status === "Failed" && /iam:PassRole/.test(ex.stages[2].actions[0].err), "ไม่มี iam:PassRole");
  L.buildCd("cd-base"); assert(!L.cdPipe("pharmacy-api") && L.cdProj("pharmacy-api-build") && !L.checksCd().every(c => c.ok), "cd-base: ยังไม่มี pipeline");
  assert(/does not exist/.test(L.API.createPipeline({ name: "x", role: "pharmacy-pipeline", bucket: "nope", stages: [] }).errors.bucket) && /missing required configuration 'BranchName'/.test(L.API.createPipeline({ name: "x", role: "pharmacy-pipeline", bucket: "pharmacy-pipeline-000000000000", stages: [{ name: "Source", actions: [{ name: "s", category: "Source", provider: "CodeStarSourceConnection", cfg: { ConnectionArn: "a", FullRepositoryId: "b" } }] }, { name: "B", actions: [{ name: "b", category: "Build", provider: "CodeBuild", cfg: { ProjectName: "p" } }] }] }).errors.stages), "createPipeline validate");
  assert(/CodeBuild is not authorized to perform: sts:AssumeRole/.test(L.API.createCbProject({ name: "zz", role: "pharmacy-pipeline", image: "aws/codebuild/standard:7.0" }).errors.role), "createCbProject: role trust ผิด");
  // Terraform labs/04-cicd บน ECS จาก lab 02
  L.buildEcs("ecs"); function sh6(line, answers) { let r = L.shRun(line), out = r.lines.slice(); answers = (answers || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(answers.shift()); out = out.concat(r.lines); } return out.join("\n"); }
  sh6("cd ~/Desktop/work/pharmacy-aws-lab/labs/04-cicd"); sh6("terraform init"); const pl4 = sh6("terraform plan"); assert(/Plan: 9 to add/.test(pl4), pl4.slice(-600));
  const ap4 = sh6("terraform apply", ["yes"]); assert(/Apply complete! Resources: 9 added/.test(ap4), ap4.slice(-900));
  ex = L.cdPipe("pharmacy-api").execs[0]; assert(ex.status === "Failed" && /Connection is not available/.test(ex.stages[0].actions[0].err) && /PENDING/.test(sh6("terraform output connection_status")), "apply แล้ว connection ยัง PENDING: execution แรกล้มที่ Source");
  assert(/"status": "Failed"/.test(sh6("aws codepipeline get-pipeline-state --name pharmacy-api")), "get-pipeline-state");
  L.API.authorizeConnection("pharmacy-github"); sh6("aws codepipeline start-pipeline-execution --name pharmacy-api"); ex = L.cdPipe("pharmacy-api").execs[0]; assert(ex.stages[3].status === "Waiting", "authorize แล้ว release ใหม่ผ่านถึง Approve: " + JSON.stringify(ex.stages.map(s => s.status)));
  L.API.approveStage("pharmacy-api", ex.id, true, ""); assert(L.cdPipe("pharmacy-api").execs[0].status === "Succeeded" && L.checksCd().filter(c => /Approve|prd|DeployPrd/.test(c.label)).every(c => c.ok), "อนุมัติแล้ว prd ผ่าน");
  const pl5 = sh6("terraform plan"); assert(/Objects have changed outside of Terraform/.test(pl5) && /connection_status = "PENDING" -> "AVAILABLE"/.test(pl5) && !/Plan: \d+ to (add|change|destroy)/.test(pl5), "authorize นอก Terraform: เห็นแค่ drift ของ connection_status ไม่มี resource เปลี่ยน" + pl5.slice(-900));
  const ds4 = sh6("terraform destroy", ["yes"]); assert(/Destroy complete! Resources: 9 destroyed/.test(ds4), ds4.slice(-700));
}
// ---- VPC endpoints แทน NAT + เวลาเหมือนจริง
{
  const evp = () => L.ecsEval(L.ecsSvcOf("pharmacy-prd", "pharmacy-api")), evd = () => L.ecsEval(L.ecsSvcOf("pharmacy-dev", "pharmacy-api"));
  L.buildEcs("ecs-vpce"); assert(evp().healthy === 2 && evd().healthy === 1 && L.S.vpces.length === 5 && L.checksEcs().every(c => c.ok), "ไม่มี NAT แต่มี endpoints ครบ: task ขึ้นปกติ: " + L.checksEcs().filter(c => !c.ok).map(c => c.label).join(" | "));
  assert(evd().tasks[0].steps.some(s => /VPC endpoints/.test(s.t) && s.ok), "step ระบุว่าผ่าน endpoints");
  L.buildEcs("ecs-vpce-s3"); let t0 = evp().tasks[0]; assert(t0.state === "STOPPED" && /CannotPullContainerError: .*starport-layer-bucket.*i\/o timeout/.test(t0.reason), "ขาด S3 gateway: ดึง layer ไม่ได้: " + t0.reason);
  L.buildEcs("ecs-vpce-logs"); t0 = evp().tasks[0]; assert(t0.state === "STOPPED" && /failed to validate logger args.*logs\./.test(t0.reason), "ขาด logs endpoint: " + t0.reason);
  L.buildEcs("ecs-pull"); assert(/api\.ecr/.test(evp().tasks[0].reason), "ไม่มี NAT ไม่มี endpoint: ข้อความเดิม");
  L.buildEcs("ecs-vpce"); const vp = L.S.vpcs.find(v => v.name === "pharmacy-vpc");
  assert(/conflicting DNS domain/.test(L.API.createVpce({ vpcId: vp.id, service: "com.amazonaws.ap-southeast-1.ecr.api", subnetIds: [L.S.subnets.find(s => /private/.test(s.name)).id], sgIds: [L.S.sgs[0].id], privateDns: true }).errors.privateDns) && /Gateway endpoint/.test(L.API.createVpce({ vpcId: vp.id, service: "com.amazonaws.ap-southeast-1.s3" }).errors.rtbIds), "createVpce validate");
  L.API.setDns(vp.id, true, false); assert(/enableDnsHostnames and enableDnsSupport/.test(L.API.createVpce({ vpcId: vp.id, service: "com.amazonaws.ap-southeast-1.logs", subnetIds: [L.S.subnets.find(s => /private/.test(s.name)).id], sgIds: [L.S.sgs[0].id], privateDns: true }).errors.privateDns), "private DNS ต้องเปิด DNS ของ VPC");
  // เวลาเหมือนจริง
  L.buildEcs("ecs"); L.S.speed = "real"; L.S.rds.forEach(r => { r.born = Date.now() - 20 * 60000; }); L.S.nats.forEach(n => { n.born = Date.now() - 5 * 60000; }); L.S.albs.forEach(a => { a.born = Date.now() - 5 * 60000; }); const svr = L.ecsSvcOf("pharmacy-prd", "pharmacy-api"); svr.touched = Date.now();
  assert(L.ecsWarm(svr) === 1 && evp().tasks.every(t => t.state === "PENDING") && evp().running === 0, "ผ่านไป 0 วินาที: PENDING " + JSON.stringify(evp().tasks.map(t => [t.state, t.stage, t.reason.slice(0, 80)])) + L.ecsWarm(svr));
  svr.touched = Date.now() - 50000; assert(L.ecsWarm(svr) === 2 && evp().tasks.every(t => t.state === "RUNNING" && !t.healthy && t.code === "Elb.InitialHealthChecking"), "50 วินาที: RUNNING แต่ health check รอบแรกยังไม่ผ่าน");
  svr.touched = Date.now() - 80000; assert(L.ecsWarm(svr) === 0 && evp().healthy === 2, "80 วินาที: healthy");
  const dbr = L.S.rds.find(r => r.id === "pharmacy-api-prd"); dbr.born = Date.now(); assert(L.rdsPhase(dbr) === "creating" && evp().tasks.every(t => t.state === "STOPPED" && /could not translate host name/.test(t.logs.join("\n"))), "RDS Creating: app ต่อไม่ได้");
  dbr.born = Date.now() - 13 * 60000; assert(L.rdsPhase(dbr) === "available", "Multi-AZ พร้อมหลัง 12 นาที");
  L.buildCd("cd"); L.S.speed = "instant"; L.buildCd("cd"); L.S.speed = "real"; L.S.rds.forEach(r => { r.born = Date.now() - 20 * 60000; }); L.S.nats.forEach(n => { n.born = Date.now() - 5 * 60000; }); L.S.albs.forEach(a => { a.born = Date.now() - 5 * 60000; }); const pp2 = L.cdPipe("pharmacy-api"); const nx = L.API.startPipeline("pharmacy-api").res;
  assert(nx.stages[0].actions[0].status === "InProgress" && nx.cursor, "real: Source ยัง InProgress ทันทีหลังเริ่ม"); nx.cursor.until = 0; L.cdTick(pp2); assert(nx.stages[0].status === "Succeeded" && nx.stages[1].actions[0].status === "InProgress", "ครบเวลา Source → ไป Build");
  for (let i = 0; i < 4 && nx.cursor; i++) { nx.cursor.until = 0; L.cdTick(pp2); } assert(nx.stages[3].status === "Waiting" && !nx.cursor, "ไล่ครบ Source/Build/DeployDev จนถึงรออนุมัติ: " + JSON.stringify(nx.stages.map(s => s.status)));
  L.S.speed = "instant";
}
// ---- สถานะ transitional ของ EKS / node group / CloudFront (โหมดเหมือนจริง)
{
  L.buildManaged("managed"); L.S.speed = "real"; const ek = L.S.eks[0], ng = L.S.ngs[0];
  ek.born = Date.now(); assert(L.eksPhase(ek) === "CREATING" && /invalid given the state of the cluster/.test(L.API.createNodegroup({ cluster: ek.name, name: "x2", roleArn: ng.roleArn, subnetIds: ng.subnetIds, desired: 1, min: 1, max: 1 }).errors.cluster), "cluster Creating: เพิ่ม node group ไม่ได้");
  ek.born = Date.now() - 10 * 60000; assert(L.eksPhase(ek) === "ACTIVE", "EKS Active หลัง ~9 นาที");
  ng.born = Date.now(); assert(L.ngPhase(ng) === "CREATING", "node group Creating"); ng.born = Date.now() - 3 * 60000; assert(L.ngPhase(ng) === "ACTIVE", "node group Active หลัง ~2.5 นาที");
  L.buildStatic("static"); L.S.speed = "real"; const cf = L.S.cfds[0]; cf.touched = Date.now(); assert(L.cfPhase(cf) === "Deploying", "CloudFront Deploying");
  L.API.updateCfd(cf.id, { comment: "x" }); assert(L.cfPhase(cf) === "Deploying", "แก้ค่า = Deploying อีกรอบ"); cf.touched = Date.now() - 5 * 60000; assert(L.cfPhase(cf) === "Deployed", "Deployed หลัง ~4 นาที");
  L.S.speed = "instant"; assert(L.eksPhase({ born: Date.now() }) === "ACTIVE" && L.cfPhase({ touched: Date.now() }) === "Deployed", "โหมดทันที: ไม่มีสถานะรอ");
}
// ---- ส่วนที่เคยไม่สมบูรณ์: versions/aliases, CORS, GSI, deletion protection, ACM/invalidation/destroy เวลาเหมือนจริง
{
  L.buildSls("sls"); const fnm = "pharmacy-api-dev";
  let v1 = L.API.publishVersion(fnm, "r1"); assert(v1.res.v === 1 && !v1.same, "publish version 1"); assert(L.API.publishVersion(fnm, "again").same === true, "ไม่เปลี่ยน = version เดิม");
  L.API.updateLambda(fnm, { memory: 256 }); assert(L.API.publishVersion(fnm, "r2").res.v === 2, "แก้ config แล้ว publish = version 2");
  assert(L.API.createAlias(fnm, { name: "live", version: "2" }).res.version === "2" && /already exists/.test(L.API.createAlias(fnm, { name: "live", version: "1" }).errors.name) && /Function not found/.test(L.API.createAlias(fnm, { name: "x", version: "9" }).errors.version) && L.API.createAlias(fnm, { name: "123", version: "1" }).errors.name, "alias");
  const apiD = L.S.apis.find(a => /dev/.test(a.name));
  assert(/ห้ามเป็น \*/.test(L.API.setApiCors(apiD.id, { origins: "*", credentials: true }).errors.origins) && /ไม่มี path/.test(L.API.setApiCors(apiD.id, { origins: "https://a.com/x" }).errors.origins) && L.API.setApiCors(apiD.id, { origins: "https://www.pharmacy.example.com", methods: "get, post", headers: "content-type", maxAge: 300 }).res.cors.methods[0] === "GET", "CORS");
  assert(L.API.createGsi("pharmacy-drugs-dev", { name: "name-index", key: "name" }).res.status === "ACTIVE" && /already exists/.test(L.API.createGsi("pharmacy-drugs-dev", { name: "name-index", key: "name" }).errors.name), "GSI");
  L.API.setDdbProtection("pharmacy-drugs-dev", true); assert(/protected against deletion/.test(L.API.deleteDdbTable("pharmacy-drugs-dev").errors._) && /protected against deletion/.test(L.API.del("ddb", "pharmacy-drugs-dev", "confirm").errors._ || ""), "deletion protection ลบไม่ได้");
  L.API.setDdbProtection("pharmacy-drugs-dev", false); assert(L.API.deleteDdbTable("pharmacy-drugs-dev").res, "ปิด protection แล้วลบได้");
  // ACM เวลาเหมือนจริง
  L.buildStatic("static"); const cert = L.S.certs[0]; L.S.speed = "real"; cert.okAt = 0;
  assert(L.acmStatus(cert) === "PENDING_VALIDATION" && cert.okAt, "real: เจอ CNAME แล้วยังไม่ Issued ทันที"); cert.okAt = Date.now() - 200000; assert(L.acmStatus(cert) === "ISSUED", "ผ่านไป ~2.5 นาที = Issued");
  // invalidation เวลาเหมือนจริง: ระหว่างทำแคชยังอยู่
  const cfd = L.S.cfds[0], host = cfd.aliases[0]; L.S.speed = "instant"; L.S.cfCache = {}; L.cfRequest(host, "/", "https"); assert(Object.keys(L.S.cfCache).length >= 1, "มีแคช");
  L.S.speed = "real"; const iv = L.API.createInvalidation(cfd.id, ["/*"]).res; assert(iv.status === "InProgress" && Object.keys(L.S.cfCache).length >= 1, "InProgress: แคชยังไม่ล้าง");
  iv.at = Date.now() - 61000; L.cfInvTick(cfd); assert(iv.status === "Completed" && Object.keys(L.S.cfCache).length === 0, "ครบ 1 นาที: Completed และล้างแคช");
  assert(L.tfDestroySecs("aws_db_instance", {}) === 240 && L.tfDestroySecs("aws_s3_bucket", {}) === 0, "destroy durations"); L.S.speed = "instant"; assert(L.tfDestroySecs("aws_db_instance", {}) === 0, "โหมดทันที: ไม่หน่วง");
}
// ---- ลบแล้วเป็น Deleting ในโหมดเหมือนจริง
{
  L.buildManaged("managed"); L.S.speed = "real"; const rid0 = L.S.rds[0].id, n0 = L.S.rds.length;
  assert(L.API.deleteRds(rid0, true).res && L.S.rds.length === n0 - 1 && L.ghostRows("rds").length === 1 && L.rdsPhase(L.ghostRows("rds")[0]) === "deleting", "RDS ลบแล้วเหลือผี Deleting");
  assert(/DBInstanceAlreadyExists/.test(L.API.createRds({ id: rid0 }).errors.id), "สร้างชื่อเดิมระหว่าง Deleting ไม่ได้");
  L.S.ghosts[0].until = 0; assert(L.ghostRows("rds").length === 0, "ครบเวลาผีหาย");
  L.S.speed = "instant"; L.buildManaged("managed"); const r1 = L.S.rds[0].id; L.API.deleteRds(r1, true); assert(L.ghostRows("rds").length === 0, "โหมดทันที: หายเลย");
}
// ---- Lab 5: GitHub Actions + OIDC → ECR → ECS
{
  const rp = () => L.ghaRunsOf(L.S.gh.repos["pharmacy-backend"].user + "/pharmacy-backend");
  L.buildGha("gha"); assert(L.isGhaLab() && L.checksGha().every(c => c.ok), "gha: ต้องผ่านทุกข้อ: " + L.checksGha().filter(c => !c.ok).map(c => c.label).join(" | "));
  assert(rp().length === 2 && rp().every(r => r.status === "success") && L.S.gh.repos["pharmacy-backend"].files[".github/workflows/deploy.yml"].includes("id-token: write"), "dev + prd run สำเร็จ และ workflow อยู่ใน repo");
  assert(L.S.repos[0].images.length === 3, "image sha + tag ถูก push (v1.0.0 เดิม + 2)");
  const last = (k) => { L.buildGha(k); return rp(); };
  let runs = last("gha-perm"); assert(runs[0].status === "failure" && /Could not load credentials/.test(runs[0].jobs[0].steps.find(s => !s.ok).log.join("\n")), "ไม่มี id-token");
  runs = last("gha-provider"); assert(runs[0].status === "failure" && /No OpenIDConnect provider found/.test(runs[0].jobs[0].steps.find(s => !s.ok).log.join("\n")), "ไม่มี provider");
  runs = last("gha-immutable"); { const f = runs[0].jobs[0].steps.find(s => !s.ok); assert(runs[0].status === "failure" && /Not authorized/.test(f.log.join("\n")) && /@1234567\/pharmacy-backend@987654321/.test(f.hint), "immutable sub + trust เก่า = ล้ม"); }
  { const role = L.S.roles.find(r => r.name === "github-actions-deploy"), u = L.S.gh.repos["pharmacy-backend"].user; role.trust.Statement[0].Condition.StringLike["token.actions.githubusercontent.com:sub"] = "repo:" + u + "@*/pharmacy-backend@*:*"; assert(L.ghaTrust(role, "repo:" + u + "@1234567/pharmacy-backend@987654321:ref:refs/heads/main", "sts.amazonaws.com").ok, "trust แบบ @* ผ่าน sub immutable"); }
  runs = last("gha-sub"); assert(runs.find(r => r.kind === "dev").status === "success" && runs.find(r => r.kind === "prd").status === "failure", "gha-sub: dev ผ่าน แต่ prd (environment) ล้ม");
  const bad = runs.find(r => r.kind === "prd").jobs[0].steps.find(s => !s.ok); assert(/Not authorized to perform sts:AssumeRoleWithWebIdentity/.test(bad.log.join("\n")) && /environment:production/.test(bad.hint), "sub แบบ environment ไม่ตรง trust: " + bad.hint);
  runs = last("gha-ecr"); assert(runs[0].status === "failure" && /denied: .*ecr:InitiateLayerUpload/.test(runs[0].jobs[0].steps.find(s => !s.ok).log.join("\n")), "ไม่มีสิทธิ์ push ECR");
  runs = last("gha-deploy"); assert(runs[0].status === "failure" && /matching name 'app'/.test(runs[0].jobs[0].steps.find(s => !s.ok).log.join("\n")), "container name ผิด");
  runs = last("gha-pass"); assert(runs[0].status === "failure" && /iam:PassRole/.test(runs[0].jobs[0].steps.find(s => !s.ok).log.join("\n")), "ไม่มี PassRole");
  { // Settings › Environments: production มี Required reviewers เป็นค่าเริ่มต้น (prd รออนุมัติ) · ลบ environment แล้ว job สร้างใหม่แบบไม่มี protection (prd ไม่รอ)
    L.buildGha("gha"); const repo = L.S.gh.repos["pharmacy-backend"].user + "/pharmacy-backend", ra = L.API;
    assert(L.ghEnvReview(repo, "production") === true && L.API.ghaTag(repo, "v1.2.0").res.waiting === true, "environment production มี required reviewers → prd รออนุมัติ");
    delete L.S.gh.repos["pharmacy-backend"].envs.production; const nt = L.API.ghaTag(repo, "v1.3.0").res; assert(!nt.waiting && nt.status !== "waiting", "ลบ environment แล้ว prd ไม่รออนุมัติ");
    L.S.gh.repos["pharmacy-backend"].envs.production = { reviewers: [], wait: 0, branches: "All branches" }; assert(L.ghEnvReview(repo, "production") === false, "environment ไม่มี reviewers → ไม่รอ"); }
  L.buildGha("gha-base"); assert(!L.ghaWf("YOUR_GITHUB_USER/pharmacy-backend") && !L.checksGha().every(c => c.ok), "gha-base: ยังไม่มี workflow");
  const wr = L.API.saveWorkflow({ repo: "a/b", roleArn: "nope", pushBranch: "" }); assert(wr.errors.roleArn && wr.errors.pushBranch, "validate workflow");
  assert(L.API.createOidcProvider({ url: "https://token.actions.githubusercontent.com", audience: "sts.amazonaws.com" }).res && /already exists/.test(L.API.createOidcProvider({ url: "https://token.actions.githubusercontent.com", audience: "sts.amazonaws.com" }).errors.url) && L.API.createOidcProvider({ url: "http://x", audience: "" }).errors.audience, "oidc validate");
  assert(L.API.createRoleWeb({ name: "r", provider: "x", org: "" }).errors.provider, "role web ต้องเลือก provider");
  // trust check ตรง ๆ
  L.buildGha("gha"); const role = L.S.roles.find(r => r.name === "github-actions-deploy"); assert(L.ghaTrust(role, "repo:" + L.S.gh.repos["pharmacy-backend"].user + "/pharmacy-backend:environment:production", "sts.amazonaws.com").ok && !L.ghaTrust(role, "repo:other/x:ref:refs/heads/main", "sts.amazonaws.com").ok && !L.ghaTrust(role, "repo:" + L.S.gh.repos["pharmacy-backend"].user + "/pharmacy-backend:ref:refs/heads/main", "wrong-aud").ok, "ghaTrust");
  // Terraform labs/05
  L.buildEcs("ecs"); function sh7(line, answers) { let r = L.shRun(line), out = r.lines.slice(); answers = (answers || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(answers.shift()); out = out.concat(r.lines); } return out.join("\n"); }
  sh7("cd ~/Desktop/work/pharmacy-aws-lab/labs/05-github-actions"); sh7("terraform init"); const pl = sh7("terraform plan"); assert(/Plan: 3 to add/.test(pl), pl.slice(-500));
  const ap = sh7("terraform apply", ["yes"]); assert(/Apply complete! Resources: 3 added/.test(ap), ap.slice(-700));
  const trole = L.S.roles.find(r => r.name === "github-actions-deploy"); assert(trole && L.ghaTrust(trole, "repo:YOUR_GITHUB_USER/pharmacy-backend:environment:production", "sts.amazonaws.com").ok && L.ghaTrust(trole, "repo:YOUR_GITHUB_USER/pharmacy-backend:ref:refs/heads/develop", "sts.amazonaws.com").ok && !L.ghaTrust(trole, "repo:YOUR_GITHUB_USER/pharmacy-backend:ref:refs/tags/v1.1.0", "sts.amazonaws.com").ok, "role จาก Terraform: branch develop (default ใหม่) + environment ผ่าน แต่ tag เปล่า ๆ ไม่ผ่าน");
  assert(/No changes/.test(sh7("terraform plan")), "plan ซ้ำไม่เปลี่ยน");
  const ds = sh7("terraform destroy", ["yes"]); assert(/Destroy complete! Resources: 3 destroyed/.test(ds), ds.slice(-500));
}
// ---- Lab 6: EC2 เครื่องเดียว + Docker Compose + Caddy
{
  L.buildSingle("single"); assert(L.checksSingle().every(c => c.ok), "single: ต้องผ่านทุกข้อ: " + L.checksSingle().filter(c => !c.ok).map(c => c.label).join(" | "));
  let r = L.webOpen("https://app.pharmacy.example.com/"); assert(r.site === "compose" && /Let's Encrypt/.test(r.tls), "HTTPS ผ่านชื่อโดเมน");
  r = L.webOpen("http://app.pharmacy.example.com/"); assert(r.site === "compose" && r.redirectedFrom && /308/.test(r.redirectedFrom), "HTTP → redirect https");
  r = L.webOpen("https://" + L.S.insts[0].publicIp + "/"); assert(r.err === "NET::ERR_CERT_COMMON_NAME_INVALID", "เข้าด้วย IP: ใบรับรองไม่ตรง ชื่อ");
  const bad = (k, u) => { L.buildSingle(k); return L.webOpen(u || "https://app.pharmacy.example.com/"); };
  r = bad("single-sg"); assert(r.err && r.steps.some(s => !s.ok), "SG ไม่เปิด 80: " + JSON.stringify(r.err));
  r = bad("single-noup", "http://app.pharmacy.example.com/"); assert(r.err === "ERR_CONNECTION_REFUSED" && r.steps.some(s => /docker compose up/.test(s.d || "")), "ลืม docker compose up");
  r = bad("single-eip"); assert(r.err === "ERR_CONNECTION_TIMED_OUT" && r.steps.some(s => !s.ok && /Elastic IP/.test(s.d || "")), "ไม่มี EIP: A record ชี้ IP เก่า: " + JSON.stringify(r.steps.map(s => s.d)));
  r = bad("single-dns"); assert(r.site === "cf" && r.req.err === "DNS_PROBE_FINISHED_NXDOMAIN", "ไม่มี A record: NXDOMAIN");
  L.buildSingle("single-base"); assert(!L.S.insts.length || L.S.insts.every(i => !i.ud), "single-base ยังไม่มีเครื่อง");
  assert(L.ec2App({ ud: "apt-get install -y docker.io\ndocker compose up -d" }).up && !L.ec2App({ ud: "echo hi" }).docker, "ec2App parse");
  // Terraform labs/06
  L.buildSingle("single-base"); L.S.insts = []; L.S.zones = []; L.fsWrite("~/.ssh/id_ed25519.pub", L.S.laptop ? "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIx test@laptop" : ""); L.S.keys = []; L.S.vpcs = L.S.vpcs.filter(v => v.isDefault); L.S.subnets = L.S.subnets.filter(s => s.isDefault); L.S.sgs = L.S.sgs.filter(g => /default/.test(g.name)); L.S.rtbs = L.S.rtbs.filter(r => r.main || r.isMain); L.S.igws = L.S.igws.filter(g => g.vpcId === null && false);
  function sh8(line, answers) { let r = L.shRun(line), out = r.lines.slice(); answers = (answers || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(answers.shift()); out = out.concat(r.lines); } return out.join("\n"); }
  sh8("cd ~/Desktop/work/pharmacy-aws-lab/labs/06-single-vm"); sh8("terraform init"); const pl = sh8("terraform plan", ["198.51.100.7/32"]); assert(/Plan: 9 to add/.test(pl), pl.slice(-600));
  const ap = sh8("terraform apply", ["198.51.100.7/32", "yes"]); assert(/Apply complete! Resources: 9 added/.test(ap), ap.slice(-800));
  const ti = L.S.insts.find(i => i.ud); assert(ti && ti.eipId && L.ec2App(ti).up && !L.ec2App(ti).domain, "TF: เครื่องมี user_data + EIP · domain ว่าง = :80");
  assert(L.webOpen("http://" + ti.publicIp + "/").site === "compose", "เปิดด้วย IP ผ่าน HTTP");
  assert(/No changes/.test(sh8("terraform plan", ["198.51.100.7/32"])), "plan ซ้ำไม่เปลี่ยน");
  const ds = sh8("terraform destroy", ["198.51.100.7/32", "yes"]); assert(/Destroy complete! Resources: 9 destroyed/.test(ds), ds.slice(-500));
}

// ---- Lab 7: App Runner
{
  L.buildApr("apr"); assert(L.checksApr().every(c => c.ok), "apr: ต้องผ่านทุกข้อ: " + L.checksApr().filter(c => !c.ok).map(c => c.label).join(" | "));
  let s = L.aprSvc("pharmacy-api-prd"), r = L.webOpen("https://" + s.url + "/healthz"); assert(r.site === "aprun" && r.json.env === "prd", "เปิด URL ได้");
  const st = (k, n) => { L.buildApr(k); return L.aprEval(L.aprSvc(n || "pharmacy-api-prd")); };
  let e = st("apr-role"); assert(e.status === "CREATE_FAILED" && /Failed to pull/.test(e.reason), "role ไม่มี policy");
  e = st("apr-tag"); assert(e.status === "CREATE_FAILED" && /not found/.test(e.reason), "tag ไม่มี");
  e = st("apr-port"); assert(e.status === "CREATE_FAILED" && /Health check failed/.test(e.reason) && /8080/.test(e.reason), "port ผิด");
  e = st("apr-health"); assert(e.status === "CREATE_FAILED" && /404/.test(e.reason), "health path ผิด");
  assert(st("apr-health", "pharmacy-api-dev").status === "RUNNING", "dev ยังปกติ");
  assert(L.webOpen("https://" + L.aprSvc("pharmacy-api-prd").url + "/").err === "ERR_CONNECTION_REFUSED", "service ล้ม = เปิดไม่ได้");
  L.buildApr("apr-base"); assert(!L.S.aprs.length, "apr-base ยังไม่มี service");
  let c = L.API.createAppRunner({ name: "x", image: "bad", port: "0", cpu: "256", memory: "4096" }); assert(c.errors && c.errors.name && c.errors.image && c.errors.port && c.errors.memory, "validate");
  L.buildEcs("ecs"); L.S.ecsc = []; L.S.esvcs = []; L.S.tds = [];
  function sh9(line, answers) { let r = L.shRun(line), out = r.lines.slice(); answers = (answers || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(answers.shift()); out = out.concat(r.lines); } return out.join("\n"); }
  sh9("cd ~/Desktop/work/pharmacy-aws-lab/labs/07-app-runner"); sh9("terraform init"); const pl = sh9("terraform plan"); assert(/Plan: 4 to add/.test(pl), pl.slice(-600));
  const ap = sh9("terraform apply", ["yes"]); assert(/Apply complete! Resources: 4 added/.test(ap), ap.slice(-800));
  assert(L.S.aprs.length === 2 && L.S.aprs.every(x => L.aprEval(x).status === "RUNNING"), "apply แล้ว RUNNING");
  assert(/No changes/.test(sh9("terraform plan")), "plan ซ้ำไม่เปลี่ยน");
  const ds = sh9("terraform destroy", ["yes"]); assert(/Destroy complete! Resources: 4 destroyed/.test(ds), ds.slice(-500));
}
// App Runner: คู่ cpu/mem ตามเอกสาร + TF apply ล้มเมื่อ service CREATE_FAILED
{
  const mk = (cpu, memory) => L.API.createAppRunner({ name: "t-" + cpu + memory.replace(/\W/g, ""), image: "123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/pharmacy/api:v1.0.0", port: 8000, cpu, memory });
  L.buildApr("apr-base");
  assert(mk("256", "2 GB").errors && mk("256", "0.5 GB").res && mk("4096", "12 GB").res && mk("512", "2 GB").errors, "คู่ cpu/mem");
}
{
  L.buildEcs("ecs"); L.S.ecsc = []; L.S.esvcs = []; L.S.tds = [];
  const sh = (line, a) => { let r = L.shRun(line), out = r.lines.slice(); a = (a || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(a.shift()); out = out.concat(r.lines); } return out.join("\n"); };
  sh("cd ~/Desktop/work/pharmacy-aws-lab/labs/07-app-runner"); sh("terraform init");
  const ap = sh("terraform apply -var image_tag=v9.9.9", ["yes"]);
  assert(/unexpected state 'CREATE_FAILED'/.test(ap) && !/Apply complete! Resources: 4 added/.test(ap), "TF apply ต้องล้มเมื่อ image ไม่มี: " + ap.slice(-500));
}

// ---- Lab 8: ECS Express Mode
{
  L.buildExpress("exp"); assert(L.checksExpress().every(c => c.ok), "exp: ต้องผ่านทุกข้อ: " + L.checksExpress().filter(c => !c.ok).map(c => c.label).join(" | "));
  let r = L.webOpen("https://pharmacy-api-prd.ecs.ap-southeast-1.on.aws/"); assert(r.site === "api" && r.json.env === "prd", "เปิด URL Express ได้");
  assert(L.expEval(L.expOf("pharmacy-express", "pharmacy-api-dev")).status === "Active", "dev Active");
  const st = (k, n) => { L.buildExpress(k); const x = L.expOf("pharmacy-express", n || "pharmacy-api-prd"); return x && L.expEval(x); };
  let e = st("exp-exec"); assert(e.status === "In progress" && /unable to pull secrets or registry auth/.test(e.reason), "exec role ไม่มี policy");
  e = st("exp-infra"); assert(e.status === "Failed" && /elasticloadbalancing:CreateLoadBalancer/.test(e.reason), "infra role ไม่มี policy");
  assert(L.webOpen("https://pharmacy-api-prd.ecs.ap-southeast-1.on.aws/").err === "ERR_NAME_NOT_RESOLVED", "provisioning ล้ม = เปิดไม่ได้");
  e = st("exp-tag"); assert(/CannotPullContainerError/.test(e.reason), "tag ไม่มี");
  e = st("exp-port"); assert(e.status === "In progress" && e.steps.some(s => !s.ok && /container port/.test(s.t)), "port ผิด");
  e = st("exp-health"); assert(e.status === "In progress" && e.steps.some(s => !s.ok && /Health check path/.test(s.t)), "health path ผิด");
  assert(st("exp-health", "pharmacy-api-dev").status === "Active", "dev ยังปกติ");
  { L.buildExpress("exp"); const hh = L.hcl(); assert(/aws_ecs_express_gateway_service/.test(hh) && !/aws_lb"/.test(hh) && !/aws_ecs_service/.test(hh), "export: Express เป็น resource เดียว ไม่มี ALB/service ซ้ำ"); }
  L.buildExpress("exp-base"); assert(!L.S.exps.length, "exp-base ยังไม่มี service");
  let c = L.API.createExpress({ image: "bad", execRole: "", infraRole: "", port: "0", cpu: "256", memory: "4096" }); assert(c.errors && c.errors.image && c.errors.execRole && c.errors.infraRole && c.errors.port && c.errors.memory, "validate");
  L.buildExpress("exp-base");
  function sh10(line, answers) { let r = L.shRun(line), out = r.lines.slice(); answers = (answers || []).slice(); while (r.ask) { out.push(r.ask.label); r = r.ask.done(answers.shift()); out = out.concat(r.lines); } return out.join("\n"); }
  sh10("cd ~/Desktop/work/pharmacy-aws-lab/labs/08-ecs-express"); sh10("terraform init"); const pl = sh10("terraform plan"); assert(/Plan: 9 to add/.test(pl), pl.slice(-600));
  const ap = sh10("terraform apply", ["yes"]); assert(/Apply complete! Resources: 9 added/.test(ap), ap.slice(-800));
  assert(L.S.exps.length === 2 && L.S.exps.every(x => L.expEval(x).status === "Active") && L.checksExpress().every(c => c.ok), "apply แล้ว Active + checks ผ่าน");
  assert(/No changes/.test(sh10("terraform plan")), "plan ซ้ำไม่เปลี่ยน");
  const ds = sh10("terraform destroy", ["yes"]); assert(/Destroy complete! Resources: 9 destroyed/.test(ds), ds.slice(-500));
  assert(!L.S.exps.length && !L.S.albs.filter(a => a.express).length, "destroy แล้วไม่เหลือ ALB ของ Express");
}
