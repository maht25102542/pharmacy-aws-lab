// ===== หน้า console ของ ECS (Fargate) และ CloudWatch Logs (use case 2) =====
// หน้าตา/ชื่อแท็บเรียงตามความจำของ console ปี 2025 · ขั้นตอนสร้างบางหน้าย่อเป็นหน้าเดียว (ของจริงเป็น wizard หลายส่วน)
(function () {
  var lab = NAV.Lab; delete NAV.Lab;
  NAV.ECS = [["", [["ecsc", "Clusters"], ["ecs-ns", "Namespaces"], ["tds", "Task definitions"], ["ecs-acct", "Account settings"]]], ["Amazon ECR", [["repos", "Repositories"]]], ["AWS Batch", [[null, "Documentation"]]]];
  NAV.CloudWatch = [["", [["cw-dash", "Dashboards"], ["cw-ai", "AI Operations"]]], ["Alarms", [["alarms", "All alarms"]]], ["Logs", [["lgs", "Log groups"], ["cw-anom", "Log Anomalies"], ["cw-live", "Live Tail"], ["cw-insights", "Logs Insights"]]], ["Metrics", [["cw-metrics", "All metrics"], ["cw-metrics", "Explorer"]]], ["Application Signals", [["cw-apps", "Services"]]]];
  NAV.Lab = lab; NAVHOME.ECS = "ecsc"; NAVHOME.CloudWatch = "lgs";
  LK.cluster = "ecsc"; LK.esvc = "esvcs"; LK.td = "tds"; LK.lg = "lgs";
})();
function ecsRoleOpts() { return [["", "เลือก role"]].concat(S.roles.filter(function (r) { return roleTrusts(r, "ecs-tasks.amazonaws.com"); }).map(function (r) { return [r.name, r.name + (r.policies.length ? "  (" + r.policies.length + " policies)" : "  (ไม่มี policy)")]; })); }
function ecsTdOpts() { return [["", "เลือก task definition"]].concat(S.tds.map(function (t) { return [t.family + ":" + t.rev, t.family + ":" + t.rev + "  (" + t.cpu + " CPU / " + t.memory + " MiB)"]; })); }
function ecsState(t) { return t.state === "STOPPED" ? tagp("STOPPED", "bad") : t.healthy ? okIco("RUNNING · Healthy") : tagp("RUNNING · Unhealthy", "warn"); }
function ecsHealthTag(e) { return e.stable ? okIco("Stable") : tagp(e.svc.desired === 0 ? "Scaled to 0" : "Not stable", e.svc.desired === 0 ? "warn" : "bad"); }
function ecsSteps(list) { return mgSteps(list); }

// ---------- Clusters ----------
LISTS.ecsc = function () {
  return ({ key: "ecsc", kind: "cluster", title: "Clusters", crumb: "Amazon ECS › Clusters", create: [{ label: "Create cluster", page: "ecs-create" }], actions: [{ label: "Delete cluster", page: "del", kind: "ecsc" }],
    detail: function (c) { var ss = S.esvcs.filter(function (x) { return x.cluster === c.name; }); return [["Cluster name", c.name], ["ARN", "arn:aws:ecs:" + REGION + ":" + ACCOUNT + ":cluster/" + c.name], ["Status", okIco("Active")], ["Services", String(ss.length)], ["Infrastructure", "AWS Fargate (serverless)"], ["Monitoring", "Container Insights: off"]]; },
    rows: function () { return S.ecsc; },
    cols: [["Cluster", function (c) { return c.name; }], ["Services", function (c) { return String(S.esvcs.filter(function (x) { return x.cluster === c.name; }).length); }], ["Tasks running", function (c) { var n = 0, d = 0; S.esvcs.filter(function (x) { return x.cluster === c.name; }).forEach(function (s) { var e = ecsEval(s); n += e.running; d += s.desired; }); return n + " / " + d; }], ["Container instances", function () { return "0 (Fargate)"; }], ["CloudWatch monitoring", function () { return "Default"; }], ["Capacity provider strategy", function () { return "FARGATE"; }]] });
};
PAGES["ecs-create"] = function () {
  return formPage({ name: "ecs-create", crumb: "Amazon ECS › Clusters › Create cluster", title: "Create cluster", back: "ecsc", lead: "ตรงกับ aws_ecs_cluster · Fargate = ไม่มีเครื่องให้ดูแล (AWS รัน task ให้ จ่ายตาม CPU/RAM ที่ใช้)",
    init: function () { return { name: "", fargate: true }; },
    sections: function () { return [{ t: "Cluster configuration", f: [{ id: "name", type: "text", label: "Cluster name", desc: "ตัวอักษร ตัวเลข - _ ไม่เกิน 255 ตัว", ph: "pharmacy-dev" }] }, { t: "Infrastructure", f: [{ id: "fargate", type: "check", text: "AWS Fargate (serverless) — ค่าเริ่มต้น" }, { type: "custom", id: "ec2", render: function () { return h("div", { cls: "hint", text: "Amazon EC2 instances / On-premises: ไม่จำลอง" }); } }] }]; },
    submit: "Create", onSubmit: function (V) { var r = API.createEcsCluster({ name: V.name }); if (r.errors) return r; UI.sel.ecsc = r.res.id; return { msg: "สร้าง cluster " + V.name + " แล้ว · ต่อไป: สร้าง Task definition แล้วสร้าง Service", next: "ecsc" }; } });
};
DET.cluster = [
  ["svc", "Services", function (c) {
    var ss = S.esvcs.filter(function (x) { return x.cluster === c.name; });
    return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Create", onclick: function () { go("ecs-svc-create", { id: c.name, from: "ecsc" }); } }), tbl(["Service name", "Status", "Service type", "Desired tasks", "Running", "Task definition", "Health"], ss.map(function (s) { var e = ecsEval(s); return [h("a", { href: "#", cls: "lnk", text: s.name, onclick: function (ev) { ev.preventDefault(); go("ecs-svc", { id: s.id, from: "ecsc" }); } }), okIco("Active"), "Replica", String(s.desired), e.running + " / " + s.desired, s.td, ecsHealthTag(e)]; }), "ยังไม่มี service · กด Create (ต้องมี Task definition ก่อน)")]);
  }],
  ["tasks", "Tasks", function (c) { var rows = []; S.esvcs.filter(function (x) { return x.cluster === c.name; }).forEach(function (s) { ecsEval(s).tasks.forEach(function (t) { rows.push([t.id.slice(0, 12), t.state === "STOPPED" ? "STOPPED" : "RUNNING", s.td, s.name, t.ip, t.az]); }); }); return tbl(["Task", "Last status", "Task definition", "Service", "Private IP", "Availability Zone"], rows, "ไม่มี task"); }],
  ["infra", "Infrastructure", function () { return kvDom([["Fargate", "Active (serverless) — ไม่มีเครื่อง EC2 ให้ดูแล"], ["Capacity providers", "FARGATE, FARGATE_SPOT"]]); }],
  ["metrics", "Metrics", null], ["sched", "Scheduled tasks", null], ["tags", "Tags", null]
];

// ---------- Task definitions ----------
LISTS.tds = function () {
  return ({ key: "tds", kind: "td", title: "Task definitions", crumb: "Amazon ECS › Task definitions", create: [{ label: "Create new task definition", page: "ecs-td-create" }], actions: [{ label: "Deregister", page: "del", kind: "td" }],
    detail: function (t) { var c = t.containers[0] || {}; return [["Task definition", t.id], ["ARN", t.arn], ["Status", okIco("ACTIVE")], ["Launch type", "FARGATE (awsvpc)"], ["CPU / Memory", t.cpu + " units / " + t.memory + " MiB"], ["Task execution role", t.execRole || "-"], ["Task role", t.taskRole || "-"], ["Container", c.name + " → " + c.image + " : " + (c.port || "-")], ["Environment", (c.env || []).map(function (e) { return e.name + "=" + e.value; }).join("\n") || "-"], ["Secrets", (c.secrets || []).map(function (e) { return e.name + " ← " + e.valueFrom; }).join("\n") || "-"], ["Logs", c.logGroup ? "awslogs → " + c.logGroup : "ไม่ได้ตั้ง (ไม่มี log)"]]; },
    rows: function () { return S.tds; },
    cols: [["Task definition", function (t) { return t.id; }], ["Status of last revision", function () { return okIco("ACTIVE"); }], ["CPU", function (t) { return String(t.cpu); }], ["Memory (MiB)", function (t) { return String(t.memory); }], ["Container image", function (t) { return (t.containers[0] || {}).image || "-"; }]] });
};
PAGES["ecs-td-create"] = function () {
  var uris = S.repos.map(function (r) { return r.images.map(function (i) { return r.uri + ":" + i.tag; }); }).reduce(function (a, b) { return a.concat(b); }, []).concat(S.repos.map(function (r) { return r.uri + ":v1.0.0"; })), dbs = S.rds.map(function (r) { return [r.address, r.id + " · " + r.address]; });
  return formPage({ name: "ecs-td-create", crumb: "Amazon ECS › Task definitions › Create new task definition", title: "Create new task definition", back: "tds", lead: "ตรงกับ aws_ecs_task_definition · แม่แบบที่บอกว่ารันอะไร (image) ด้วย CPU/RAM เท่าไร ใช้ role อะไร ส่ง log ไปไหน",
    init: function () { return { family: "", cpu: "256", memory: "512", execRole: "", taskRole: "", cname: "api", image: "", port: "8000", appenv: "dev", dbHost: "", secret: "", logGroup: "" }; },
    sections: function (V) { return [
      { t: "Task definition configuration", f: [{ id: "family", type: "text", label: "Task definition family", ph: "pharmacy-api-dev" }, { id: "launch", type: "select", label: "Launch type", opts: function () { return [["fargate", "AWS Fargate"]]; } }] },
      { t: "Task size", f: [{ id: "cpu", type: "select", label: "CPU", opts: function () { return [["256", ".25 vCPU"], ["512", ".5 vCPU"], ["1024", "1 vCPU"], ["2048", "2 vCPU"]]; } }, { id: "memory", type: "select", label: "Memory", desc: "ต้องเป็นคู่ที่ Fargate รองรับ (256 CPU → 0.5/1/2 GB · 512 CPU → 1-4 GB)", opts: function () { return [["512", "0.5 GB"], ["1024", "1 GB"], ["2048", "2 GB"], ["4096", "4 GB"]]; } }] },
      { t: "Task roles", f: [{ id: "execRole", type: "select", label: "Task execution role", desc: "ให้ ECS ดึง image ECR + เขียน log + อ่าน secret ตอนเริ่ม task (ต้องมี AmazonECSTaskExecutionRolePolicy)", opts: function () { return ecsRoleOpts(); } }, { id: "taskRole", type: "select", label: "Task role", desc: "ให้โค้ดในคอนเทนเนอร์เรียก AWS (ไม่ใส่ก็ได้ถ้าโค้ดไม่เรียก AWS)", opts: function () { return ecsRoleOpts(); } }] },
      { t: "Container - 1", f: [{ id: "cname", type: "text", label: "Name", ph: "api" }, { id: "image", type: "text", label: "Image URI", ex: uris, desc: "รูปแบบ <account>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag> · ต้อง docker push ขึ้น ECR แล้ว" }, { id: "port", type: "text", label: "Container port", ph: "8000" }] },
      { t: "Environment variables", f: [{ id: "appenv", type: "text", label: "APP_ENV", ph: "dev" }, { id: "dbHost", type: "select", label: "DB_HOST (endpoint ของ RDS)", opts: function () { return [["", "ไม่ใช้ฐานข้อมูล"]].concat(dbs); } }, { id: "secret", type: "select", label: "DB_PASSWORD จาก Secrets Manager (ValueFrom)", opts: function () { return [["", "ไม่ใช้"]].concat(S.rds.filter(function (r) { return r.secretArn; }).map(function (r) { return [r.secretArn + ":password::", r.id + " · " + r.secretArn.split(":secret:")[1].slice(0, 30) + "…"]; })); } }] },
      { t: "Logging", f: [{ id: "logGroup", type: "select", label: "awslogs-group", desc: "ไม่เลือก = ไม่มี log (ดีบักไม่ได้)", opts: function () { return [["", "ไม่ส่ง log"]].concat(S.lgs.map(function (g) { return [g.name, g.name]; })); } }] }]; },
    submit: "Create", onSubmit: function (V) {
      var r = API.registerTd({ family: V.family, cpu: V.cpu, memory: V.memory, execRole: V.execRole, taskRole: V.taskRole, containers: [{ name: V.cname, image: V.image, port: V.port, env: [{ name: "APP_ENV", value: V.appenv }].concat(V.dbHost ? [{ name: "DB_HOST", value: V.dbHost }] : []).filter(function (e) { return e.value; }), secrets: V.secret ? [{ name: "DB_PASSWORD", valueFrom: V.secret }] : [], logGroup: V.logGroup, logPrefix: "api" }] });
      if (r.errors) return mgErrMap(r, { container: "cname", image: "image", port: "port" }); return { msg: "สร้าง task definition " + r.res.id + " แล้ว", next: "tds" };
    } });
};

// ---------- Services ----------
PAGES["ecs-svc-create"] = function () {
  var pre = UI.params.id && ecsClusterByName(UI.params.id) ? UI.params.id : (S.ecsc[0] || {}).name || "";
  return formPage({ name: "ecs-svc-create", crumb: "Amazon ECS › Clusters › Create service", title: "Create service", back: "ecsc", lead: "ตรงกับ aws_ecs_service · service = รักษาจำนวน task ตาม desired และผูก ALB · ต้องมี listener ชี้ target group (แบบ IP) ก่อน",
    init: function () { var d = S.vpcs.filter(function (v) { return !v.isDefault; })[0]; return { cluster: pre, td: "", name: "", desired: "1", vpcId: d ? d.id : mgVpcDefault(), subnetIds: [], sgIds: [], publicIp: "no", lb: "yes", tgArn: "", container: "" }; },
    sections: function (V) {
      var td = ecsTdByRef(V.td), conts = td ? td.containers.map(function (c) { return [c.name + ":" + c.port, c.name + " : " + c.port]; }) : [];
      return [
        { t: "Service details", f: [{ id: "cluster", type: "select", label: "Cluster", opts: function () { return [["", "เลือก cluster"]].concat(S.ecsc.map(function (c) { return [c.name, c.name]; })); } }, { id: "td", type: "select", label: "Task definition (family:revision)", opts: function () { return ecsTdOpts(); }, onchange: function (V2) { var t = ecsTdByRef(V2.td); V2.container = t && t.containers[0] ? t.containers[0].name + ":" + t.containers[0].port : ""; } }, { id: "name", type: "text", label: "Service name", ph: "pharmacy-api" }, { id: "desired", type: "text", label: "Desired tasks" }] },
        { t: "Networking", f: [{ id: "vpcId", type: "select", label: "VPC", opts: function () { return mgVpcOpts(); }, onchange: function (V2) { V2.subnetIds = []; V2.sgIds = []; } }, { id: "subnetIds", type: "multi", label: "Subnets", desc: "แนะนำ private subnet หลาย AZ (task กระจายตาม subnet)", opts: function (V2) { return mgSubnetOpts(V2); } }, { id: "sgIds", type: "multi", label: "Security groups", desc: "SG ของ task: รับ container port จาก SG ของ ALB", opts: function (V2) { return sgOpts(V2.vpcId); } }, { id: "publicIp", type: "radio", label: "Public IP", opts: function () { return [["no", "DISABLED — private subnet + NAT (แนะนำ)"], ["yes", "ENABLED — ได้ public IP ต้องอยู่ public subnet (ไม่แนะนำ)"]]; } }] },
        { t: "Load balancing - optional", f: [{ id: "lb", type: "radio", label: "Load balancer type", opts: function () { return [["yes", "Application Load Balancer"], ["no", "None"]]; } }, { id: "tgArn", type: "select", label: "Target group", show: function (V2) { return V2.lb === "yes"; }, desc: "ต้องเป็นแบบ IP addresses และมี listener ของ ALB ชี้อยู่", opts: function () { return [["", "เลือก target group"]].concat(S.tgs.map(function (t) { return [arnOf("tg", t.id, t.name), t.name + " · " + (t.ttype === "ip" ? "IP" : "Instance") + " · " + t.hcPath]; })); } }, { id: "container", type: "select", label: "Container to load balance", show: function (V2) { return V2.lb === "yes"; }, opts: function () { return [["", "เลือก container"]].concat(conts); } }] }];
    },
    submit: "Create", onSubmit: function (V) {
      var cp = String(V.container || "").split(":");
      var r = API.createEcsService({ name: V.name, cluster: V.cluster, td: V.td, desired: V.desired, subnetIds: V.subnetIds, sgIds: V.sgIds, publicIp: V.publicIp === "yes", lb: V.lb === "yes" && V.tgArn ? { tgArn: V.tgArn, container: cp[0], port: cp[1] } : null });
      if (r.errors) return mgErrMap(r, { lb: "tgArn" }); var e = ecsEval(r.res); UI.esvcTab = "health"; return { msg: "สร้าง service " + V.name + " แล้ว · " + (e.stable ? "task ขึ้นครบและ healthy" : "ยังไม่ stable: เปิด service ดู Health / Events เพื่อหาสาเหตุ"), next: "ecsc" };
    } });
};
PAGES["ecs-svc"] = function () {
  var s = S.esvcs.filter(function (x) { return x.id === UI.params.id; })[0]; if (!s) return h("div", {}, [h("p", { text: "ไม่พบ service" }), h("button", { cls: "btn", type: "button", text: "กลับ", onclick: function () { go("ecsc", {}, "ECS"); } })]);
  var e = ecsEval(s), tab = UI.esvcTab || "health", w = h("div"), tg = s.lb && byArnTg(s.lb.tgArn);
  w.appendChild(crumbEl("Amazon ECS › Clusters › " + s.cluster + " › Services › " + s.name));
  w.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: s.name }), h("div", { cls: "sp", style: "display:flex;gap:8px" }, [h("button", { cls: "btn", type: "button", text: "Update service", onclick: function () { go("ecs-svc-edit", { id: s.id, from: "ecsc" }); } }), h("button", { cls: "btn", type: "button", text: "Delete service", onclick: function () { go("del", { id: s.id, kind: "esvc", from: "ecsc" }); } })])]));
  w.appendChild(h("div", { cls: "card" }, [h("div", { cls: "cb" }, [kvDom([["Cluster", s.cluster], ["Status", okIco("Active")], ["Service health", ecsHealthTag(e)], ["Desired / Running tasks", s.desired + " / " + e.running + "  (healthy " + e.healthy + ")"], ["Task definition", s.td], ["Launch type", "FARGATE"], ["Deployment", e.stable ? okIco("Completed") : tagp("In progress (ยังไม่ stable)", "warn")]])])]));
  w.appendChild(h("div", { cls: "dtabs", role: "tablist" }, [["health", "Health"], ["tasks", "Tasks"], ["logs", "Logs"], ["events", "Events"], ["conf", "Configuration"], ["net", "Networking"]].map(function (t) { return h("button", { type: "button", role: "tab", text: t[1], "aria-selected": String(t[0] === tab), onclick: function () { UI.esvcTab = t[0]; render(); } }); })));
  var body = h("div", { cls: "card" }, [h("div", { cls: "cb" })]), cb = body.firstChild;
  if (tab === "health") {
    cb.appendChild(h("h3", { text: "Task health (" + e.tasks.length + ")" })); cb.appendChild(tbl(["Task", "Last status", "Availability Zone", "Private IP", "Target group health", "Stopped / unhealthy reason"], e.tasks.map(function (t) { return [t.id.slice(0, 12), ecsState(t), t.az, t.ip, t.state === "STOPPED" ? "-" : t.healthy ? okIco("healthy") : tagp("unhealthy · " + (t.code || ""), "bad"), t.state === "STOPPED" || !t.healthy ? t.reason + (t.why ? " · " + t.why : "") : "-"]; }), "desired = 0: ไม่มี task"));
    var bad = e.tasks.filter(function (t) { return t.state === "STOPPED" || !t.healthy; })[0];
    if (bad) { cb.appendChild(h("h3", { text: "ไล่หาสาเหตุ (ลำดับที่ Fargate ทำตอนเริ่ม task)" })); cb.appendChild(ecsSteps(bad.steps)); cb.appendChild(h("div", { cls: "hint", text: "ทางแก้ตามขั้นที่ ✗: role → IAM · ออกเน็ต → VPC route table / NAT · image → ECR + docker push · DB → SG ของ DB · health → target group path และ SG ของ task" })); }
    else if (e.tasks.length) cb.appendChild(h("div", { cls: "alert info", text: "ⓘ ทุกขั้นผ่าน: role → ออกเน็ต → image → secret → ต่อ DB → health check" }));
  } else if (tab === "tasks") cb.appendChild(tbl(["Task ID", "Last status", "Desired status", "Task definition", "Started", "Stop reason"], e.tasks.map(function (t) { return [t.id, t.state, "RUNNING", s.td, stFmt(s.born), t.state === "STOPPED" ? t.reason : "-"]; }), "ไม่มี task"));
  else if (tab === "logs") { if (!e.tasks.length) cb.appendChild(h("p", { cls: "hint", text: "ไม่มี task" })); e.tasks.forEach(function (t) { var td = e.td, c = td.containers[0]; cb.appendChild(h("h4", { text: (c.logGroup || "(ไม่ได้ตั้ง log)") + " › " + (c.logPrefix || "api") + "/" + c.name + "/" + t.id.slice(0, 12) })); cb.appendChild(c.logGroup ? codePre((t.logs || ["(task ยังไม่เริ่มแอป: ติดที่ขั้น " + t.stage + " จึงไม่มี log ของแอป ดู Health)"]).join("\n"), "an") : h("p", { cls: "hint", text: "task definition ไม่ได้ตั้ง awslogs → ไม่มี log" })); }); }
  else if (tab === "events") cb.appendChild(tbl(["Time", "Message"], e.events.map(function (m) { return [stFmt(Date.now()), m]; }), "ไม่มี event"));
  else if (tab === "conf") cb.appendChild(kvDom([["Service name", s.name], ["Task definition", s.td], ["Desired tasks", String(s.desired)], ["Launch type", "FARGATE"], ["Platform version", "LATEST (1.4.0)"], ["Created", stFmt(s.born)], ["Deployment type", "Rolling update"]]));
  else cb.appendChild(kvDom([["VPC", vcol(s.vpcId)], ["Subnets", mgSubnetNames(s.subnetIds)], ["Security groups", s.sgIds.map(function (id) { return (find(S.sgs, id) || {}).name || id; }).join(", ")], ["Public IP", s.publicIp ? "ENABLED" : "DISABLED"], ["Load balancer", tg ? "Target group " + tg.name + " (" + (tg.ttype === "ip" ? "IP" : tg.ttype) + ") · container " + s.lb.container + ":" + s.lb.port + " · health check " + tg.hcPath : "ไม่มี"]]));
  w.appendChild(body); return w;
};
PAGES["ecs-svc-edit"] = function () {
  var s = S.esvcs.filter(function (x) { return x.id === UI.params.id; })[0]; if (!s) return h("p", { text: "ไม่พบ service" });
  return formPage({ name: "ecs-svc-edit-" + s.id, crumb: "Amazon ECS › " + s.cluster + " › " + s.name + " › Update service", title: "Update service", back: "ecsc", lead: "แก้จำนวน task หรือเปลี่ยน task definition revision (rolling update) · desired = 0 หยุด task ทั้งหมดแต่ไม่ลบ service",
    init: function () { return { desired: String(s.desired), td: s.td }; },
    sections: function () { return [{ t: "Service configuration", f: [{ id: "td", type: "select", label: "Task definition", opts: function () { return ecsTdOpts(); } }, { id: "desired", type: "text", label: "Desired tasks" }] }]; },
    submit: "Update", onSubmit: function (V) { var r = API.updateEcsService(s.cluster, s.name, { desired: V.desired, td: V.td }); return r.errors ? r : { msg: "อัปเดต service แล้ว (Deployment: rolling update)", next: "ecsc" }; } });
};

// ---------- CloudWatch Logs ----------
function lgStreams(g) { var out = S.lamLogs.filter(function (x) { return x.group === g.name; }).map(function (x) { return { name: x.stream, t: { logs: x.lines } }; }); S.esvcs.forEach(function (s) { var td = ecsTdByRef(s.td); if (!td || td.containers[0].logGroup !== g.name) return; ecsEval(s).tasks.forEach(function (t) { out.push({ name: (td.containers[0].logPrefix || "api") + "/" + td.containers[0].name + "/" + t.id.slice(0, 12), t: t }); }); }); return out; }
LISTS.lgs = function () {
  return ({ key: "lgs", kind: "lg", title: "Log groups", crumb: "CloudWatch › Log groups", create: [{ label: "Create log group", page: "lg-create" }], actions: [{ label: "Delete log group(s)", page: "del", kind: "lg" }],
    detail: function (g) { return [["Log group", g.name], ["ARN", "arn:aws:logs:" + REGION + ":" + ACCOUNT + ":log-group:" + g.name], ["Retention", g.retention ? g.retention + " days" : "Never expire"], ["Log streams", String(lgStreams(g).length)], ["Creation time", stFmt(g.born)]]; },
    rows: function () { return S.lgs; },
    cols: [["Log group", function (g) { return g.name; }], ["Log class", function () { return "Standard"; }], ["Retention", function (g) { return g.retention ? g.retention + " days" : "Never expire"; }], ["Log streams", function (g) { return String(lgStreams(g).length); }], ["Stored bytes", function (g) { return lgStreams(g).length ? "1.2 kB" : "-"; }]] });
};
PAGES["lg-create"] = function () {
  return formPage({ name: "lg-create", crumb: "CloudWatch › Log groups › Create log group", title: "Create log group", back: "lgs", lead: "ตรงกับ aws_cloudwatch_log_group · task definition ชี้มาที่ชื่อนี้ (awslogs-group) · ไม่มี log group = task เริ่มไม่ได้ (หรือไม่มี log)",
    init: function () { return { name: "", retention: "14" }; },
    sections: function () { return [{ t: "Log group details", f: [{ id: "name", type: "text", label: "Log group name", ph: "/ecs/pharmacy-api-dev" }, { id: "retention", type: "select", label: "Retention setting", opts: function () { return [["1", "1 day"], ["7", "1 week"], ["14", "2 weeks"], ["30", "1 month"], ["0", "Never expire (คิดเงินสะสม)"]]; } }] }]; },
    submit: "Create", onSubmit: function (V) { var r = API.createLogGroup({ name: V.name, retention: V.retention }); return r.errors ? r : { msg: "สร้าง log group " + V.name + " แล้ว", next: "lgs" }; } });
};
DET.lg = [["details", "Log streams", function (g) {
  var ss = lgStreams(g); return h("div", {}, [h("p", { cls: "hint", text: "ECS: 1 task = 1 stream (prefix/container/task-id) · Lambda: 1 execution environment = 1 stream" }), tbl(["Log stream", "Last event time", ""], ss.map(function (x) { return [x.name, stFmt(Date.now()), h("button", { cls: "btn", type: "button", text: "View log events", onclick: function () { UI.lgSel = g.name + "|" + x.name; render(); } })]; }), "ยังไม่มี log stream · task ต้องเริ่มแอปได้ก่อน (ถ้า task ติดที่ดึง image จะไม่มี log)"),
    UI.lgSel && UI.lgSel.indexOf(g.name + "|") === 0 ? (function () { var nm = UI.lgSel.split("|")[1], st = ss.filter(function (x) { return x.name === nm; })[0]; return st ? h("div", {}, [h("h4", { text: "Log events · " + nm }), codePre((st.t.logs || []).map(function (l) { return new Date().toISOString().slice(0, 19).replace("T", " ") + "  " + l; }).join("\n"), "an")]) : h("span"); })() : h("span")]);
}], ["info", "Details", det("lg")], ["tags", "Tags", null]];
["ecsc", "tds", "lgs"].forEach(function (k) { PAGES[k] = function () { return listPage(LISTS[k]()); }; });
