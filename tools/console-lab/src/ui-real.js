// ===== ทำให้เมนู/แท็บของ EKS, RDS, Systems Manager, S3, CloudFront, Route 53, ACM เหมือน console จริงมากขึ้น =====
// โครงเมนูซ้ายและชื่อแท็บเรียงตามความจำของ console ปี 2025 · รายการที่ยังไม่ได้จำลองแสดงเป็นสีเทา (กดแล้วมีข้อความบอก)
NAV.EKS = [["", [["eks", "Clusters"]]], ["Amazon EKS Anywhere", [[null, "Enterprise Subscriptions"]]], ["Related services", [[null, "Amazon ECR"], [null, "AWS Batch"]]]];
NAV.RDS = [["", [[null, "Dashboard"], ["rds", "Databases"], [null, "Query Editor"], [null, "Performance insights"], [null, "Snapshots"], [null, "Exports in Amazon S3"], [null, "Automated backups"], [null, "Reserved instances"], [null, "Proxies"]]], ["", [["dbsg", "Subnet groups"], [null, "Parameter groups"], [null, "Option groups"], [null, "Custom engine versions"], [null, "Zero-ETL integrations"]]], ["", [[null, "Events"], [null, "Event subscriptions"]]], ["", [[null, "Recommendations"], [null, "Certificate update"]]]];
NAV.SSM = [["", [[null, "Quick Setup"]]], ["Operations Management", [[null, "Explorer"], [null, "OpsCenter"], [null, "CloudWatch Dashboard"], [null, "Incident Manager"]]], ["Application Management", [[null, "Application Manager"], [null, "AppConfig"], [null, "Parameter Store"]]], ["Change Management", [[null, "Change Manager"], [null, "Automation"], [null, "Change Calendar"], [null, "Maintenance Windows"]]], ["Node Management", [["ssm-fleet", "Fleet Manager"], [null, "Compliance"], [null, "Inventory"], [null, "Hybrid Activations"], ["ssm-sessions", "Session Manager"], [null, "Run Command"], [null, "State Manager"], [null, "Patch Manager"], [null, "Distributor"]]], ["Shared Resources", [[null, "Documents"]]]];
NAV.S3 = [["", [["buckets", "General purpose buckets"], [null, "Directory buckets"], [null, "Table buckets"], [null, "Access Grants"], [null, "Access Points"], [null, "Object Lambda Access Points"], [null, "Multi-Region Access Points"], [null, "Batch Operations"], [null, "IAM Access Analyzer for S3"]]], ["", [[null, "Block Public Access settings for this account"]]], ["Storage Lens", [[null, "Dashboards"], [null, "Storage Lens groups"], [null, "AWS Organizations settings"]]], ["", [[null, "Feature spotlight"], [null, "AWS Marketplace for S3"]]]];
NAV.CloudFront = [["", [["cfds", "Distributions"], [null, "Policies"], [null, "Functions"], [null, "Static IPs"], [null, "VPC origins"]]], ["Telemetry", [[null, "Monitoring"], [null, "Alarms"], [null, "Logs"]]], ["Reports & analytics", [[null, "Cache statistics"], [null, "Popular objects"], [null, "Top referrers"], [null, "Usage"], [null, "Viewers"]]], ["Security", [["oacs", "Origin access"], [null, "Field-level encryption"], [null, "Public keys"], [null, "Key groups"]]]];
NAV["Route 53"] = [["", [[null, "Dashboard"], ["zones", "Hosted zones"], [null, "Health checks"], [null, "Profiles"], [null, "IP-based routing"]]], ["Traffic flow", [[null, "Traffic policies"], [null, "Policy records"]]], ["Domains", [[null, "Registered domains"], [null, "Requests"]]], ["Resolver", [[null, "VPCs"], [null, "Inbound endpoints"], [null, "Outbound endpoints"], [null, "Rules"], [null, "Query logging"]]]];
NAV.ACM = [["", [["certs", "List certificates"], ["cert-create", "Request certificate"], [null, "Import certificate"]]], ["", [[null, "AWS Private CA"]]], ["", [[null, "Getting started"]]]];

// ---------- EKS: รายละเอียด cluster เป็นแท็บเหมือนจริง (Node group อยู่ใน Compute) ----------
function eksNg(c) { return S.ngs.filter(function (g) { return g.cluster === c.name; }); }
DET.eks = [
  ["details", "Overview", det("eks")],
  ["res", "Resources", null],
  ["compute", "Compute", function (c) {
    var ngs = eksNg(c), nodes = S.insts.filter(function (i) { return i.nodeRole && i.state !== "terminated" && ngs.some(function (g) { return g.asg === i.asg; }); });
    return h("div", {}, [h("h4", { text: "Node groups (" + ngs.length + ")" }), h("button", { cls: "btn pri", type: "button", text: "Add node group", onclick: function () { go("eks-ng-create", { id: c.name, from: "eks" }); } }),
      tbl(["Group name", "Desired size", "AMI release version", "Launch template", "Status"], ngs.map(function (g) { return [g.name, String(g.desired), "AL2023 (EKS optimized)", "eks-" + g.name, okIco("Active")]; }), "ยังไม่มี node group · กด Add node group (ไม่มี node = pod ไม่มีที่รัน)"),
      h("h4", { text: "Nodes (" + nodes.length + ")" }), tbl(["Node name", "Instance type", "Node group", "Created", "Status"], nodes.map(function (i) { var a = S.asgs.filter(function (x) { return x.name === i.asg; })[0]; return ["ip-" + i.privateIp.replace(/\./g, "-") + "." + REGION + ".compute.internal", i.type, a ? a.ng : "-", stFmt(i.born), okIco("Ready")]; }), "ไม่มี node"), h("h4", { text: "Fargate profiles (0)" }), h("p", { cls: "hint", text: "ไม่จำลอง" })]);
  }],
  ["net", "Networking", function (c) { return kvDom([["VPC", vcol(c.vpcId)], ["Subnets", mgSubnetNames(c.subnetIds)], ["Cluster security group", c.sgId], ["API server endpoint access", (c.pub ? "Public" : "") + (c.pub && c.priv ? " and " : "") + (c.priv ? "Private" : "")], ["Public access source allowlist", c.pub ? c.cidrs.join(", ") : "-"], ["Service IPv4 range", "172.20.0.0/16"], ["IP family", "IPv4"]]); }],
  ["addons", "Add-ons", function (c) { return h("div", {}, [h("button", { cls: "btn", type: "button", disabled: true, text: "Get more add-ons" }), tbl(["Name", "Version", "Status"], [["CoreDNS", "v1.11.3-eksbuild.1", okIco("Active")], ["kube-proxy", "v" + c.version + ".0-eksbuild.1", okIco("Active")], ["Amazon VPC CNI", "v1.18.x-eksbuild.1", okIco("Active")]], "")]); }],
  ["access", "Access", function (c) { return h("div", {}, [kvDom([["Authentication mode", c.authMode === "API" ? "EKS API" : "EKS API and ConfigMap"], ["Bootstrap cluster creator admin permissions", "Allowed (ผู้สร้าง cluster เป็น admin)"]]), h("h4", { text: "IAM access entries (1)" }), tbl(["IAM principal ARN", "Type", "Username", "Group names"], [["arn:aws:iam::" + ACCOUNT + ":user/tf-admin", "Standard", "arn:aws:iam::" + ACCOUNT + ":user/tf-admin", "-"]], "")]); }],
  ["obs", "Observability", null], ["ins", "Upgrade insights", null], ["upd", "Update history", null], ["tags", "Tags", null]
];
DET.ng = [["details", "Details", det("ng")], ["nodes", "Nodes", null], ["scaling", "Update history", null]];

// ---------- RDS: แท็บของหน้า DB ----------
DET.rds = [
  ["conn", "Connectivity & security", function (r) { var sn = (byName(S.dbsg, r.subnetGroup) || { subnetIds: [] }).subnetIds; return h("div", {}, [h("h4", { text: "Endpoint & port" }), kvDom([["Endpoint", r.address], ["Port", String(r.port)]]), h("h4", { text: "Networking" }), kvDom([["Availability Zone", r.az], ["VPC", vcol(r.vpcId)], ["Subnet group", r.subnetGroup], ["Subnets", mgSubnetNames(sn)], ["Publicly accessible", r.publicly ? tagp("Yes", "bad") : "No"]]), h("h4", { text: "Security" }), kvDom([["VPC security groups", r.sgIds.map(function (id) { return (find(S.sgs, id) || {}).name || id; }).join(", ")], ["Certificate authority", "rds-ca-rsa2048-g1"], ["ต่อได้จาก EKS node", S.insts.filter(function (i) { return i.nodeRole && i.state === "running" && rdsReach(i, r); }).length + " / " + S.insts.filter(function (i) { return i.nodeRole && i.state === "running"; }).length + " node (SG 3306 + VPC เดียวกัน)"]])]); }],
  ["mon", "Monitoring", null], ["logs", "Logs & events", null],
  ["conf", "Configuration", function (r) { return kvDom([["DB identifier", r.id], ["Status", okIco("Available")], ["Engine", r.engine + " " + r.version], ["DB instance class", r.cls], ["Storage", r.storage + " GiB gp3"], ["Encryption", r.encrypted ? "Enabled (aws/rds)" : "Not enabled"], ["Multi-AZ", r.multiAz ? "Yes — primary " + r.az + " / standby " + r.standbyAz : "No"], ["Master username", r.user], ["Master credentials", r.manage ? "Managed in AWS Secrets Manager: " + r.secretArn : "Self managed"], ["Deletion protection", r.deletionProtection ? "Enabled" : "Disabled"]]); }],
  ["zero", "Zero-ETL integrations", null],
  ["maint", "Maintenance & backups", function (r) { return kvDom([["Automated backups", r.backupDays ? "Enabled (" + r.backupDays + " days)" : "Disabled"], ["Backup window", "17:00-17:30 UTC"], ["Maintenance window", "sun:18:00-sun:18:30 UTC"], ["Auto minor version upgrade", "Enabled"], ["Final snapshot ตอนลบ", r.skipSnap ? "ข้าม (ฝึกเท่านั้น)" : "สร้าง"]]); }],
  ["mig", "Data migrations", null], ["tags", "Tags", null]
];
DET.dbsg = [["details", "Details", det("dbsg")]];

// ---------- S3 bucket: แท็บให้ครบเหมือนจริง ----------
(function () {
  var old = {}; DET.bucket.forEach(function (t) { old[t[0]] = t; });
  DET.bucket = [old.objects, ["meta", "Metadata", null], old.props, old.perm, ["metrics", "Metrics", null], ["mgmt", "Management", null], ["ap", "Access Points", null]];
  var cf = {}; DET.cfd.forEach(function (t) { cf[t[0]] = t; });
  DET.cfd = [cf.details, ["sec", "Security", null], cf.origins, cf.behaviors, cf.errors, cf.inv, ["tags", "Tags", null], ["log", "Logging", null]];
  var z = {}; DET.zone.forEach(function (t) { z[t[0]] = t; });
  DET.zone = [z.records, ["dnssec", "DNSSEC signing", null], ["ztags", "Hosted zone tags", null], ["zd", "Hosted zone details", z.details[2]]];
})();
// ACM: หน้าเดียวเหมือนจริง = Certificate status + Domains + Details
var oldCertDomains = DET.cert[1][2];
DET.cert = [["domains", "Certificate", function (c) { var st = acmStatus(c) === "ISSUED"; return h("div", {}, [h("h4", { text: "Certificate status" }), kvDom([["Identifier", c.arn.split("/").pop()], ["ARN", c.arn], ["Type", "Amazon Issued"], ["Status", st ? okIco("Issued") : tagp("Pending validation", "warn")], ["In use?", S.cfds.some(function (d) { return d.certArn === c.arn; }) ? "Yes" : "No"]]), h("h4", { text: "Domains" }), oldCertDomains(c), h("h4", { text: "Details" }), kvDom([["Domain name", c.names[0]], ["Additional names", c.names.slice(1).join(", ") || "-"], ["Public key info", c.algo.replace("_", " ")], ["Signature algorithm", "SHA-256 with RSA"], ["Can be used with", "CloudFront, Elastic Load Balancing, API Gateway"], ["Region", c.region]])]); }]];

// ---------- Systems Manager › Session Manager (Sessions / Preferences / Session history + Start session) ----------
function ssmSessions() { if (!S.ssmSessions) S.ssmSessions = []; return S.ssmSessions; }
PAGES["ssm-sessions"] = function () {
  var tab = UI.ssmTab || "sessions", w = h("div"), act = ssmSessions().filter(function (x) { return !x.ended; });
  w.appendChild(crumbEl("AWS Systems Manager › Session Manager"));
  w.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: "Session Manager" }), h("div", { cls: "sp", style: "display:flex;gap:8px" }, [h("button", { cls: "btn", type: "button", disabled: true, text: "Configure Preferences" }), h("button", { cls: "btn pri", type: "button", text: "Start session", onclick: function () { go("ssm-start", {}, "SSM"); } })])]));
  w.appendChild(h("div", { cls: "alert info", text: "ⓘ Session Manager เข้าเครื่องแบบ shell โดยไม่ต้องเปิด port 22, ไม่ต้องมี bastion และไม่ต้องจัดการ SSH key · สิทธิ์ผ่าน IAM และมี log ของทุก session" }));
  w.appendChild(h("div", { cls: "dtabs", role: "tablist" }, [["sessions", "Sessions"], ["prefs", "Preferences"], ["hist", "Session history"]].map(function (t) { return h("button", { type: "button", role: "tab", text: t[1], "aria-selected": String(t[0] === tab), onclick: function () { UI.ssmTab = t[0]; render(); } }); })));
  var body = h("div", { cls: "card" }, [h("div", { cls: "cb" })]), cb = body.firstChild;
  if (tab === "sessions") cb.appendChild(h("div", {}, [h("h3", { text: "Sessions (" + act.length + ")" }), tbl(["Session ID", "Target", "Status", "Started", ""], act.map(function (x) { return [x.id, x.name + " (" + x.target + ")", okIco("Connected"), stFmt(x.at), h("button", { cls: "btn", type: "button", text: "Terminate", onclick: function () { x.ended = Date.now(); if (S.laptop.sid === x.id) { S.laptop.remote = null; S.laptop.via = ""; } render(); } })]; }), "ไม่มี session ที่เปิดอยู่ · กด Start session")]));
  else if (tab === "prefs") cb.appendChild(kvDom([["Session logging", "ไม่เปิด (ของจริงส่ง log ไป S3 / CloudWatch Logs ได้)"], ["Idle session timeout", "20 นาที"], ["Run As", "Disabled (ใช้ ssm-user)"], ["KMS encryption", "Disabled"]]));
  else cb.appendChild(tbl(["Session ID", "Target", "Status", "Started", "Ended"], ssmSessions().map(function (x) { return [x.id, x.name + " (" + x.target + ")", x.ended ? "Terminated" : okIco("Connected"), stFmt(x.at), x.ended ? stFmt(x.ended) : "-"]; }), "ยังไม่มีประวัติ"));
  w.appendChild(body); return w;
};
PAGES["ssm-start"] = function () {
  var w = h("div"), rows = S.insts.filter(function (i) { return i.state !== "terminated"; }), selId = UI.ssmSel, err = UI.ssmErr;
  w.appendChild(crumbEl("AWS Systems Manager › Session Manager › Start a session"));
  w.appendChild(h("div", { cls: "titlebar" }, [h("h1", { text: "Start a session" })]));
  if (err) w.appendChild(h("div", { cls: "alert bad", role: "alert" }, [h("b", { text: "Your instance isn't connected to Session Manager (TargetNotConnected)" }), mgSteps(err)]));
  var tb = h("tbody");
  rows.forEach(function (i) { var c = sessionCheck(i); tb.appendChild(h("tr", { cls: i.id === selId ? "sel" : "", onclick: function () { UI.ssmSel = i.id; UI.ssmErr = null; render(); } }, [h("td", {}, [h("input", { type: "radio", name: "ssmtarget", checked: i.id === selId, onchange: function () { UI.ssmSel = i.id; UI.ssmErr = null; render(); } })]), h("td", { text: i.name || "-" }), h("td", { text: i.id }), h("td", { text: i.state }), h("td", { text: i.az }), h("td", {}, [c.ok ? okIco("Online") : tagp("Connection lost", "bad")])])); });
  if (!rows.length) tb.appendChild(h("tr", {}, [h("td", { cls: "empty", colspan: "6", text: "ไม่มีเครื่อง · โหลดตัวอย่าง Managed หรือรัน terraform-managed/" })]));
  w.appendChild(h("div", { cls: "card" }, [h("div", { cls: "ch", text: "Target instances" }), h("div", { cls: "cb" }, [h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, ["", "Name", "Instance ID", "Instance state", "Availability zone", "Ping status"].map(function (t) { return h("th", { text: t }); }))]), tb])])])]));
  w.appendChild(h("div", { cls: "actions", style: "margin-top:12px" }, [h("button", { cls: "btn", type: "button", text: "Cancel", onclick: function () { UI.ssmErr = null; go("ssm-sessions", {}, "SSM"); } }), h("button", { cls: "btn pri", type: "button", text: "Start session", onclick: function () {
    var i = find(S.insts, UI.ssmSel); if (!i) { UI.ssmErr = [{ ok: false, t: "ยังไม่ได้เลือกเครื่อง", d: "เลือก Target instance ก่อน" }]; render(); return; }
    var w2 = whoAmI(), c = sessionCheck(i), iam = !w2.err && canDo(w2, "ssm:StartSession"), st = [{ ok: !w2.err, t: "คุณเรียก AWS ได้ (aws configure แล้ว)", d: w2.err ? "ยังไม่ได้ตั้งค่า credentials" : w2.arn }, { ok: iam, t: "สิทธิ์ IAM ของคุณมี ssm:StartSession", d: iam ? "มี" : "ไม่มี" }].concat(c.steps);
    if (!st.every(function (x) { return x.ok; })) { UI.ssmErr = st; render(); return; }
    var sid = (w2.arn.split("/").pop() || "user") + "-" + stHex(17); ssmSessions().unshift({ id: sid, target: i.id, name: i.name || i.id, at: Date.now() });
    S.laptop.remote = i.id; S.laptop.rcwd = "~"; S.laptop.via = "ssm"; S.laptop.sid = sid; UI.ssmErr = null; TERM.lines = ["Starting session with SessionId: " + sid, "(Session Manager · ไม่ต้องมี key pair ไม่ต้องเปิด port 22 · พิมพ์ exit เพื่อออก)", ""]; TERM.hist = []; TERM.hi = 0; TERM.ask = null;
    flash("ok", "เริ่ม session " + sid + " แล้ว · เปิดที่ Laptop › Terminal"); go("term", {}, "Laptop");
  } })]));
  return w;
};
