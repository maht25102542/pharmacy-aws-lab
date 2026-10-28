// ===== หน้า console ของ ECS Express Mode (use case 8) =====
// ลำดับฟอร์ม/ชื่อฟิลด์/ชื่อแท็บตามเอกสาร AWS (express-service-first-run, express-service-view-service) ไม่ได้เห็นหน้าจริง: สี/ไอคอน/ตำแหน่งปุ่มอาจต่างจากของจริง
(function () {
  var g0 = NAV.ECS[0]; g0[1].unshift(["ecs-express", "Express mode"]);
  NAVHOME.ECS = "ecsc";
})();
var EXP_CPU = [["256", "0.25 vCPU"], ["512", "0.5 vCPU"], ["1024", "1 vCPU"], ["2048", "2 vCPU"], ["4096", "4 vCPU"]];
var EXP_MEM = [["512", "0.5 GB"], ["1024", "1 GB"], ["2048", "2 GB"], ["3072", "3 GB"], ["4096", "4 GB"], ["5120", "5 GB"], ["6144", "6 GB"], ["7168", "7 GB"], ["8192", "8 GB"]];
function expEcrOpts() { var o = [["", "Browse ECR images — เลือก image จาก ECR"]]; S.repos.forEach(function (r) { r.images.forEach(function (i) { o.push([ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com/" + r.name + ":" + i.tag, r.name + " : " + i.tag]); }); }); return o; }
function expRoleOpts(svc, newLabel) { return [["", "Choose a role"]].concat(S.roles.filter(function (r) { return roleTrusts(r, svc); }).map(function (r) { return [r.name, r.name]; })).concat([["__new", "Create new role" + (newLabel ? " (" + newLabel + ")" : "")]]); }
function expEnsureRole(sel, name, usecase, policy) {
  if (sel !== "__new") return sel; var ex = byName(S.roles, name); if (ex) return ex.name;
  var r = API.createRole({ name: name, entity: "AWS service", usecase: usecase, policies: [policy] }); return r.res ? r.res.name : sel;
}
function expStatusTag(v) { return v.status === "Active" ? okIco("Active") : v.status === "Failed" ? tagp("Provisioning failed", "bad") : tagp("Deployment in progress", "warn"); }
PAGES["ecs-express"] = function () {
  var d = defaultVpc();
  var page = formPage({ name: "ecs-express", crumb: "Amazon ECS › Express mode", title: "Express mode", back: "ecsc",
    lead: "Express mode: ให้แค่ image + role 2 ตัว ECS สร้าง Fargate service, ALB (HTTPS), auto scaling, log และ URL ให้เอง · ไม่มีค่า Express เพิ่ม จ่ายแค่ของที่ถูกสร้าง",
    init: function () { return { image: "", browse: "", privReg: false, secretArn: "", execRole: "", infraRole: "", cluster: "default", name: "", port: "80", healthPath: "/", env: "", command: "", taskRole: "", cpu: "1024", memory: "2048", arch: "X86_64", metric: "AVERAGE_CPU", target: "60", min: "1", max: "20", net: false, vpcId: d ? d.id : "", subnetIds: [], logGroup: "", logPrefix: "ecs/Main/" }; },
    sections: function (V) {
      var subs = V.net ? [{ id: "vpcId", type: "select", label: "VPC", opts: function () { return mgVpcOpts(); }, onchange: function (V2) { V2.subnetIds = []; } }, { id: "subnetIds", type: "multi", label: "Subnets", desc: "อย่างน้อย 2 AZ · ถ้าเป็น private subnet task จะไม่มี public IP (ต้องมี NAT หรือ VPC endpoint ไปหา ECR)", opts: function (V2) { return mgSubnetOpts(V2); } }] : [];
      return [
        { t: "Let's set up your app", f: [
          { id: "image", type: "text", label: "Image URI", req: true, ph: ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com/pharmacy/api:v1.0.0", desc: "ECR ของบัญชีนี้ (ตัวจำลองยังไม่รองรับ public registry)", noex: true },
          { id: "browse", type: "select", label: "Browse ECR images", opts: function () { return expEcrOpts(); }, onchange: function (V2) { if (V2.browse) V2.image = V2.browse; } },
          { id: "privReg", type: "check", text: "Private registry (Secrets Manager)" },
          { id: "secretArn", type: "text", label: "Secrets Manager ARN or name", show: function (V2) { return V2.privReg; }, noex: true },
          { id: "execRole", type: "select", label: "Task execution role", req: true, desc: "ให้ ECS ดึง image จาก ECR และเขียน log (AmazonECSTaskExecutionRolePolicy)", opts: function () { return expRoleOpts("ecs-tasks.amazonaws.com"); } },
          { id: "infraRole", type: "select", label: "Infrastructure role", req: true, desc: "ให้ ECS สร้าง ALB/target group/SG/auto scaling แทนคุณ (" + EXP_INFRA_POLICY + ")", opts: function () { return expRoleOpts("ecs.amazonaws.com"); } }] },
        { t: "Additional configurations - optional", f: [
          { id: "cluster", type: "select", label: "Cluster", desc: "ไม่ระบุ = cluster `default` (สร้างให้ถ้ายังไม่มี)", opts: function () { var o = [["default", "default"]]; S.ecsc.forEach(function (c) { if (c.name !== "default") o.push([c.name, c.name]); }); return o; } },
          { id: "name", type: "text", label: "Name", ph: "ว่าง = สร้างจากชื่อ image", noex: true },
          { id: "port", type: "text", label: "Container port", desc: "port ที่แอปฟัง (ค่าเริ่มต้น 80)", noex: true },
          { id: "healthPath", type: "text", label: "Health check path", desc: "ต้องตอบ 200 (ค่าเริ่มต้น /)", noex: true },
          { id: "env", type: "area", label: "Environment variables", desc: "KEY=VALUE บรรทัดละตัว", noex: true },
          { id: "command", type: "text", label: "Command", desc: "ไม่ระบุ = ใช้ CMD ของ image", noex: true },
          { id: "taskRole", type: "select", label: "Task role", desc: "ให้โค้ดในคอนเทนเนอร์เรียกบริการ AWS อื่น (ไม่ระบุก็ได้)", opts: function () { return [["", "None"]].concat(S.roles.filter(function (r) { return roleTrusts(r, "ecs-tasks.amazonaws.com"); }).map(function (r) { return [r.name, r.name]; })); } },
          { id: "cpu", type: "select", label: "CPU", opts: function () { return EXP_CPU; } },
          { id: "memory", type: "select", label: "Memory", opts: function () { return EXP_MEM; } },
          { id: "arch", type: "select", label: "CPU architecture", opts: function () { return [["X86_64", "X86_64"], ["ARM64", "ARM64"]]; } },
          { id: "metric", type: "select", label: "ECS service metric", opts: function () { return [["AVERAGE_CPU", "Average CPU Utilization"], ["AVERAGE_MEMORY", "Average Memory Utilization"], ["REQUEST_COUNT_PER_TARGET", "Request count per target"]]; } },
          { id: "target", type: "text", label: "Target value", noex: true },
          { id: "min", type: "text", label: "Minimum number of tasks", noex: true },
          { id: "max", type: "text", label: "Maximum number of tasks", noex: true },
          { id: "net", type: "check", text: "Customize networking configurations (ไม่เลือก = Default VPC)" }].concat(subs).concat([
          { id: "logGroup", type: "text", label: "Amazon CloudWatch log group", ph: "ว่าง = /aws/ecs/<cluster>/<name>-####", noex: true },
          { id: "logPrefix", type: "text", label: "Amazon CloudWatch log stream prefix", noex: true }]) }];
    },
    submit: "Create", onSubmit: function (V) {
      var exr = expEnsureRole(V.execRole, "ecsTaskExecutionRole", "ECS", "AmazonECSTaskExecutionRolePolicy"), inr = expEnsureRole(V.infraRole, "ecsInfrastructureRoleForExpressServices", "ECSService", EXP_INFRA_POLICY);
      var env = String(V.env || "").split("\n").map(function (l) { var i = l.indexOf("="); return i > 0 ? { name: l.slice(0, i).trim(), value: l.slice(i + 1).trim() } : null; }).filter(Boolean);
      var r = API.createExpress({ image: V.image, execRole: exr, infraRole: inr, cluster: V.cluster, name: V.name, port: V.port, healthPath: V.healthPath, env: env, command: V.command, taskRole: V.taskRole, cpu: V.cpu, memory: V.memory, arch: V.arch, metric: V.metric, target: V.target, min: V.min, max: V.max, vpcId: V.net ? V.vpcId : "", subnetIds: V.net ? V.subnetIds : [], logGroup: V.logGroup, logPrefix: V.logPrefix || "ecs/Main/" });
      if (r.errors) return r; var x = r.res; UI.expTab = "overview"; UI.expSel = x.id;
      return { msg: x.fail ? "สร้าง Express service " + x.name + " แล้ว แต่ provisioning ล้มเหลว: ดูแท็บ Resources" : "สร้าง Express service " + x.name + " แล้ว · เปิด Application URL ที่ Browser ได้เมื่อ deployment เสร็จ", next: "ecs-exp" };
    } });
  if (S.exps.length) page.insertBefore(h("div", { cls: "card", style: "margin-bottom:12px" }, [h("div", { cls: "cb" }, [h("h3", { text: "Express mode services (" + S.exps.length + ")" }), tbl(["Service", "Cluster", "Status", "Application URL"], S.exps.map(function (x) { return [h("a", { href: "#", cls: "lnk", text: x.name, onclick: function (ev) { ev.preventDefault(); UI.expSel = x.id; UI.expTab = "overview"; go("ecs-exp", {}, "ECS"); } }), x.cluster, expStatusTag(expEval(x)), "https://" + x.host]; }))])]), page.children[2] || null);
  return page;
};
PAGES["ecs-exp"] = function () {
  var x = S.exps.filter(function (e) { return e.id === UI.expSel; })[0]; if (!x) return h("div", {}, [h("p", { text: "ไม่พบ Express service" }), h("button", { cls: "btn", type: "button", text: "กลับ", onclick: function () { go("ecs-express", {}, "ECS"); } })]);
  var v = expEval(x), tab = UI.expTab || "overview", w = h("div"), ev = v.ev;
  w.appendChild(crumbEl("Amazon ECS › Clusters › " + x.cluster + " › Services › " + x.name));
  w.appendChild(h("div", { cls: "titlebar" }, [h("h1", {}, [x.name + " ", h("span", { cls: "tag", text: "Express" })]), h("div", { cls: "sp", style: "display:flex;gap:8px" }, [h("button", { cls: "btn", type: "button", text: "Update", onclick: function () { go("ecs-exp-edit", { id: x.id, from: "ecsc" }); } }), h("button", { cls: "btn", type: "button", text: "Delete", onclick: function () { go("del", { id: x.id, kind: "exp", from: "ecsc" }); } })])]));
  if (x.fail) w.appendChild(h("div", { cls: "alert bad", role: "alert" }, [h("b", { text: "Resource provisioning failed" }), h("div", { text: x.fail.msg })]));
  w.appendChild(h("div", { cls: "dtabs", role: "tablist" }, [["overview", "Overview"], ["obs", "Observability"], ["logs", "Logs"], ["res", "Resources"], ["dep", "Deployments"], ["conf", "Configuration"], ["tags", "Tags"]].map(function (t) { return h("button", { type: "button", role: "tab", text: t[1], "aria-selected": String(t[0] === tab), onclick: function () { UI.expTab = t[0]; render(); } }); })));
  var body = h("div", { cls: "card" }, [h("div", { cls: "cb" })]), cb = body.firstChild;
  if (tab === "overview") {
    cb.appendChild(kvDom([["Application URL", x.fail ? "(ยังไม่พร้อม)" : "https://" + x.host], ["Service status", expStatusTag(v)], ["Pending / Running tasks", ev ? (ev.tasks.filter(function (t) { return t.state === "PENDING" || t.warm; }).length) + " / " + ev.running : "0 / 0"], ["Active deployments", x.fail ? "0" : "1"], ["Cluster", x.cluster]]));
    if (!x.fail && ev && !ev.stable) { cb.appendChild(h("h3", { text: "ไล่หาสาเหตุ (ลำดับที่ Fargate ทำตอนเริ่ม task)" })); cb.appendChild(ecsSteps(v.steps)); cb.appendChild(h("div", { cls: "hint", text: "role → IAM · image → ECR · port/health check path → แท็บ Configuration (Update) · ดู Logs ของ task ประกอบ" })); }
    else if (x.fail) { cb.appendChild(h("h3", { text: "สาเหตุ" })); cb.appendChild(ecsSteps(v.steps)); cb.appendChild(h("div", { cls: "hint", text: "แก้ที่ IAM: แนบ " + EXP_INFRA_POLICY + " ให้ infrastructure role แล้วลบ service สร้างใหม่ (infrastructure role เปลี่ยนไม่ได้หลังสร้าง)" })); }
    else cb.appendChild(h("div", { cls: "alert info", text: "ⓘ steady state: task healthy ทุกตัว · เปิด Application URL ที่แท็บ Browser" }));
  } else if (tab === "obs") {
    cb.appendChild(h("p", { cls: "hint", text: "ของจริงแสดงกราฟ CloudWatch: CPU Utilization (min/max/avg) · Memory Utilization (min/max/avg) · Target response time (p50/p90/p99) · RequestCount · 4xx · 5xx · ตัวจำลองไม่สร้างกราฟ" }));
    cb.appendChild(tbl(["Metric", "ที่มา"], [["CPUUtilization / MemoryUtilization", "AWS/ECS"], ["TargetResponseTime, RequestCount, HTTPCode_Target_4XX/5XX", "AWS/ApplicationELB"], ["Auto scaling: " + x.metric + " → target " + x.target + "%", x.min + "–" + x.max + " tasks"]]));
  } else if (tab === "logs") {
    var lines = ev ? ev.tasks : []; if (!lines.length) cb.appendChild(h("p", { cls: "hint", text: "ไม่มี task จึงไม่มี log · log group " + x.logGroup }));
    lines.forEach(function (t) { cb.appendChild(h("h4", { text: x.logGroup + " › " + x.logPrefix.replace(/\/$/, "") + "/Main/" + t.id.slice(0, 12) })); cb.appendChild(codePre((t.logs && t.logs.length ? t.logs : ["(ไม่มี log: task ยังไม่เริ่มแอป)"]).join("\n"), "txt")); });
  } else if (tab === "res") {
    var rows = expResources(x);
    cb.appendChild(h("h3", { text: "Timeline view" })); cb.appendChild(mgSteps(rows.map(function (r) { return { ok: r[3] === "Active", t: r[0] + " · " + r[1], d: r[3] }; })));
    cb.appendChild(h("h3", { text: "Table view" })); cb.appendChild(tbl(["Resource type", "Name / ID", "ARN", "Status"], rows.map(function (r) { return [r[0], r[1], r[2], r[3] === "Active" ? okIco("Active") : tagp(r[3], r[3] === "Failed" ? "bad" : "warn")]; })));
  } else if (tab === "dep") {
    cb.appendChild(tbl(["Revision", "Image", "Status", "Started"], x.deploys.map(function (d, i) { return [String(d.n), d.image, i === 0 ? (x.fail ? tagp("Failed", "bad") : v.ok ? okIco("Completed") : tagp("In progress", "warn")) : "Superseded", stFmt(d.born)]; }), "ไม่มี deployment"));
    if (ev) { cb.appendChild(h("h3", { text: "Events" })); cb.appendChild(tbl(["Time", "Message"], ev.events.map(function (m) { return [stFmt(Date.now()), m]; }), "ไม่มี event")); }
  } else if (tab === "conf") {
    cb.appendChild(kvDom([["Cluster", x.cluster], ["Task execution role", x.execRole], ["Infrastructure role", x.infraRole], ["Task role", x.taskRole || "-"], ["Container name", "Main"], ["Image", x.image], ["Container port", String(x.port)], ["Health check path", x.healthPath], ["Command", x.command || "(CMD ของ image)"], ["CPU / Memory", EXP_CPU.filter(function (c) { return c[0] === String(x.cpu); })[0][1] + " / " + x.memory + " MiB"], ["CPU architecture", x.arch], ["Auto scaling", x.metric + " target " + x.target + "% · " + x.min + "–" + x.max + " tasks"], ["VPC", vcol(x.vpcId)], ["Subnets", mgSubnetNames(x.subnetIds)], ["Public IP", x.publicIp ? "ENABLED" : "DISABLED"], ["Log group", x.logGroup], ["Environment", x.env.map(function (e) { return e.name + "=" + e.value; }).join(", ") || "-"]]));
  } else cb.appendChild(tbl(["Key", "Value"], Object.keys(x.tags || {}).map(function (k) { return [k, x.tags[k]]; }), "ไม่มี tag (เพิ่มได้ตอนสร้างเท่านั้น)"));
  w.appendChild(body); return w;
};
PAGES["ecs-exp-edit"] = function () {
  var x = S.exps.filter(function (e) { return e.id === UI.params.id; })[0]; if (!x) return h("p", { text: "ไม่พบ Express service" });
  return formPage({ name: "ecs-exp-edit-" + x.id, crumb: "Amazon ECS › " + x.cluster + " › " + x.name + " › Update", title: "Update Express service", back: "ecs-exp", lead: "แก้แล้วสร้าง revision ใหม่ ปล่อยแบบ canary ไม่มี downtime · role และ cluster เปลี่ยนไม่ได้",
    init: function () { return { image: x.image, browse: "", healthPath: x.healthPath, min: String(x.min), max: String(x.max) }; },
    sections: function () { return [{ t: "Update", f: [{ id: "image", type: "text", label: "Image URI", noex: true }, { id: "browse", type: "select", label: "Browse ECR images", opts: function () { return expEcrOpts(); }, onchange: function (V2) { if (V2.browse) V2.image = V2.browse; } }, { id: "healthPath", type: "text", label: "Health check path", noex: true }, { id: "min", type: "text", label: "Minimum number of tasks", noex: true }, { id: "max", type: "text", label: "Maximum number of tasks", noex: true }] }]; },
    submit: "Update", onSubmit: function (V) { var r = API.updateExpress(x.cluster, x.name, { image: V.image !== x.image ? V.image : undefined, healthPath: V.healthPath, min: V.min, max: V.max }); if (r.errors) return r; UI.expSel = x.id; UI.expTab = "dep"; return { msg: "อัปเดต " + x.name + " แล้ว (revision ใหม่)", next: "ecs-exp" }; } });
};
