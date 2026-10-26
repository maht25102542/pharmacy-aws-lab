// ===== เติมทุกแท็บ/หน้าที่เคยเป็นสีเทา: ข้อมูลจริงของ lab ถ้ามี · ไม่มีก็บอกชัดว่า console จริงแสดงอะไรและ lab ไม่มีข้อมูลส่วนนั้น =====
function tagsView(r) { var m = r.tagMap || r.tags || {}, ks = Object.keys(m).filter(function (k) { return typeof m[k] === "string"; }); return h("div", {}, [tbl(["Key", "Value"], ks.map(function (k) { return [k, m[k]]; }), "ไม่มี tag"), h("p", { cls: "hint", text: "เพิ่ม/แก้ tag ใน Terraform: tags = { … } หรือ default_tags ที่ provider (tag ที่ provider ใส่ให้ทุก resource อาจไม่แสดงที่นี่)" })]); }
function noteView(title, body, extra) { return h("div", { style: "padding:6px 0" }, [h("b", { text: title }), h("p", { cls: "hint", text: body }), extra || h("span")]); }
function metricsView(r, kind) {
  var key = r.name || r.id || "", rows = slsMetrics().filter(function (m) { return m[2].indexOf(key) >= 0; });
  if (kind === "cluster") { var ss = S.esvcs.filter(function (s) { return s.cluster === r.name; }), run = 0, des = 0; ss.forEach(function (s) { run += ecsEval(s).running; des += s.desired; }); return h("div", {}, [kvDom([["Services", String(ss.length)], ["Running / desired tasks", run + " / " + des], ["CPU / Memory utilization", "ไม่จำลอง (ต้องเปิด Container Insights ซึ่งคิดเงินเพิ่ม)"]])]); }
  if (kind === "cbp") { var b = r.builds, ok = b.filter(function (x) { return x.status === "SUCCEEDED"; }).length; return kvDom([["Builds", String(b.length)], ["Succeeded", String(ok)], ["Failed", String(b.length - ok)], ["Success rate", b.length ? Math.round(100 * ok / b.length) + " %" : "-"]]); }
  if (kind === "pipe") { var e = r.execs, sc = e.filter(function (x) { return x.status === "Succeeded"; }).length; return kvDom([["Executions", String(e.length)], ["Succeeded", String(sc)], ["Failed", String(e.filter(function (x) { return x.status === "Failed"; }).length)], ["In progress / waiting", String(e.filter(function (x) { return x.status === "InProgress"; }).length)]]); }
  if (!rows.length) return noteView("ยังไม่มี metric ของ " + key, "console จริงแสดงกราฟตามเวลา · lab นับตัวเลขสะสมตั้งแต่เริ่ม (ลองเรียกใช้ resource นี้ก่อน)");
  return h("div", {}, [tbl(["Namespace", "Metric", "Dimensions", "Sum"], rows.map(function (m) { return [m[0], m[1], m[2], String(m[3])]; }), ""), h("p", { cls: "hint", text: "ค่าสะสมตั้งแต่เริ่ม lab (ของจริงเป็นกราฟต่อช่วงเวลา) · ตั้ง alarm ได้ที่ CloudWatch › Alarms" })]);
}
function ngInstances(g) { return S.insts.filter(function (i) { return i.asg === g.asg && i.state !== "terminated"; }); }
var TAB_LABEL = {
  "Flow logs": function () { return noteView("No flow logs", "Actions › Create flow log เก็บ traffic ของ subnet ไป CloudWatch Logs / S3 เพื่อดูว่าใครคุยกับใคร (lab ไม่ได้เปิด)"); },
  "Network ACL": function (r) { var rule = function (n, a) { return [n, "All traffic", "All", "All", "0.0.0.0/0", a]; }; return h("div", {}, [kvDom([["Network ACL", "default (acl-… ของ VPC)"], ["Associated subnet", r.name || r.id]]), h("h4", { text: "Inbound rules" }), tbl(["Rule number", "Type", "Protocol", "Port range", "Source", "Allow/Deny"], [rule("100", "Allow"), rule("*", "Deny")], ""), h("h4", { text: "Outbound rules" }), tbl(["Rule number", "Type", "Protocol", "Port range", "Destination", "Allow/Deny"], [rule("100", "Allow"), rule("*", "Deny")], ""), h("p", { cls: "hint", text: "NACL ตัวเริ่มต้นอนุญาตทั้งหมด (stateless) · lab คุมด้วย security group อย่างเดียว" })]); },
  "CIDR reservations": function () { return noteView("No CIDR reservations", "จองช่วง IP ใน subnet ไม่ให้ AWS แจกให้ resource อื่น (lab ไม่ใช้)"); },
  "Sharing": function () { return noteView("Not shared", "แชร์ผ่าน AWS Resource Access Manager ให้ account อื่นใช้ (lab มี account เดียว)"); },
  "VPC associations": function (r) { return tbl(["VPC ID", "Status"], [[r.vpcId || "-", "Associated"]], ""); },
  "Status and alarms": function (r) { return r.state === "running" ? h("div", {}, [tbl(["Check", "Result"], [["System reachability check", okIco("passed")], ["Instance reachability check", okIco("passed")]], ""), h("p", { cls: "hint", text: "Alarm: ยังไม่มี · สร้างที่ CloudWatch › Alarms" })]) : noteView("Instance is not running", "status check มีเฉพาะตอน running (ตอนนี้: " + r.state + ")"); },
  "Route propagation": function () { return noteView("Route propagation: disabled", "ใช้กับ Virtual private gateway (VPN/Direct Connect) ให้ route ลงตารางอัตโนมัติ · lab ไม่มี VGW"); },
  "Attributes": function (r) { return kvDom(r.hcPath !== undefined ? [["Deregistration delay", "300 seconds"], ["Stickiness", "Off"], ["Load balancing algorithm", "Round robin"], ["Target type", r.ttype === "ip" ? "IP addresses" : "Instance"]] : [["Idle timeout", "60 seconds"], ["Deletion protection", "Off"], ["HTTP/2", "On"], ["Access logs", "Off"]]); },
  "Last Accessed": function () { return noteView("Access Advisor", "ข้อมูลว่า role/user เรียกบริการไหนล่าสุด (ใช้ตัดสิทธิ์ที่ไม่ได้ใช้) · lab ไม่เก็บประวัติการเรียก API จึงไม่มีข้อมูล"); },
  "Revoke sessions": function () { return noteView("Revoke active sessions", "สั่งให้ session เก่าของ role นี้ใช้ไม่ได้ทันที (ใส่ policy AWSRevokeOlderSessions) ใช้ตอนสงสัยว่า credential รั่ว · lab ไม่จำลองการใช้ session เก่า"); },
  "Policy versions": function () { return tbl(["Version", "Status"], [["v1", "Default"]], ""); },
  "Groups": function () { return noteView("ไม่ได้อยู่ใน group ใด", "ใช้ group รวมสิทธิ์ของหลาย user (lab ใช้ user เดี่ยว)"); },
  "Integrations": function () { return noteView("No integrations", "เชื่อม resource กับบริการอื่นแบบกดครั้งเดียว (lab ไม่ใช้)"); },
  "Capacity": function (r) { return kvDom([["Desired", String(r.desired !== undefined ? r.desired : "-")], ["Min / Max", (r.min !== undefined ? r.min : "-") + " / " + (r.max !== undefined ? r.max : "-")]]); },
  "Resources": function (r) { return h("div", {}, [h("h4", { text: "Node groups" }), tbl(["Name", "Desired", "Status"], S.ngs.filter(function (g) { return g.cluster === r.name; }).map(function (g) { return [g.name, String(g.desired), ngPhase(g) === "ACTIVE" ? "Active" : "Creating"]; }), "ไม่มี node group"), h("p", { cls: "hint", text: "Pod/Deployment ดูได้ด้วย kubectl (lab ไม่ได้ลง workload ใน EKS)" })]); },
  "Observability": function (r) { return kvDom([["Control plane logging", "Off (เปิดที่ Observability › Manage logging)"], ["Node groups", String(S.ngs.filter(function (g) { return g.cluster === r.name; }).length)], ["Nodes", String(S.ngs.filter(function (g) { return g.cluster === r.name; }).reduce(function (a, g) { return a + ngInstances(g).length; }, 0))]]); },
  "Upgrade insights": function () { return noteView("No issues found", "EKS ตรวจ API ที่เลิกใช้แล้วก่อนอัปเกรด minor version (เช่น 1.31 → 1.32) · cluster ใน lab เป็นรุ่นล่าสุดที่ตัวจำลองรู้จัก"); },
  "Update history": function (r) { return tbl(["Update ID", "Type", "Status", "Time"], [[cdHex(8) + "-" + cdHex(4), r.asg ? "Node group created" : "Cluster created", okIco("Successful"), stFmt(r.born)]], ""); },
  "Nodes": function (g) { return tbl(["Instance ID", "State", "Availability Zone", "Private IP"], ngInstances(g).map(function (i) { var sn = find(S.subnets, i.subnetId) || {}; return [i.id, i.state, sn.az || "-", i.privateIp || "-"]; }), "ไม่มี node"); },
  "Logs & events": function (r) { return tbl(["Time", "Source", "Message"], [[stFmt(r.born || Date.now()), "db instance", "DB instance created"], [stFmt(r.born || Date.now()), "db instance", "Backups enabled (" + (r.backupDays !== undefined ? r.backupDays : "?") + " days)"]], ""); },
  "Data migrations": function () { return noteView("No migration tasks", "AWS DMS ย้ายข้อมูลเข้า/ออก DB (lab ไม่ใช้)"); },
  "Zero-ETL integrations": function () { return noteView("No zero-ETL integrations", "ส่งข้อมูลจาก Aurora/RDS ไป Redshift อัตโนมัติ (lab ไม่ใช้)"); },
  "Metadata": function (b) { return kvDom([["Objects", String(b.objects.length)], ["Total size", b.objects.reduce(function (a, o) { return a + o.size; }, 0) + " B"]]); },
  "Management": function () { return noteView("No lifecycle rules / replication", "Lifecycle ย้าย/ลบ object ตามอายุ · Replication คัดลอกข้าม region (lab ไม่ตั้ง)"); },
  "Access Points": function () { return noteView("No access points", "access point = ทางเข้า bucket ที่มี policy แยกตามทีม (lab ใช้ OAC กับ CloudFront)"); },
  "Security": function (d) { return kvDom([["Origin access", d.origins.map(function (o) { return o.oacId ? "OAC " + o.oacId : "Public (ไม่มี OAC)"; }).join(", ")], ["Viewer protocol policy", d.viewerProto], ["AWS WAF", "Not enabled"], ["Field-level encryption", "Not configured"]]); },
  "Logging": function () { return noteView("Standard logging: Off", "เก็บ access log ของ distribution ลง S3 / CloudWatch (lab ไม่เปิด)"); },
  "DNSSEC signing": function () { return noteView("DNSSEC signing is not enabled", "เซ็นชื่อ record กัน DNS ปลอม (ต้องมี KMS key + ใส่ DS record ที่ผู้ขายโดเมน)"); },
  "Scheduled tasks": function () { return noteView("No scheduled tasks", "รัน task ตามเวลา (EventBridge) เช่น งานรายคืน · lab ไม่ใช้"); },
  "Triggers": function (p) { var src = p.stages[0].actions[0]; return kvDom([["Detect changes", "On · GitHub push (ผ่าน connection)"], ["Repository", src.cfg.FullRepositoryId || "-"], ["Branch", src.cfg.BranchName || "-"], ["Pipeline type", "V2 (trigger ตาม push/tag/path ปรับได้)"]]); },
  "Build triggers": function () { return noteView("No build triggers", "project นี้ถูกเรียกจาก CodePipeline เท่านั้น (webhook/schedule ของ CodeBuild ไม่ตั้ง)"); },
  "Indexes": function (t) { return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Create index", onclick: function () { go("ddb-gsi-create", { id: t.name, from: "ddb" }); } }), tbl(["Name", "Partition key", "Projection", "Status"], (t.gsis || []).map(function (g) { return [g.name, g.key + " (" + g.keyType + ")", g.projection, okIco("Active")]; }), "ไม่มี global secondary index · query ด้วยฟิลด์อื่นนอก partition key ต้องมี index (ไม่งั้นต้อง Scan)")]); },
  "Additional settings": function (t) { return h("div", {}, [kvDom([["Capacity mode", t.billing === "PAY_PER_REQUEST" ? "On-demand" : "Provisioned"], ["Time to live (TTL)", "Off"], ["DynamoDB Streams", "Off"], ["Encryption", "Owned by Amazon DynamoDB"], ["Deletion protection", t.protect ? "On" : "Off"]]), h("button", { cls: "btn", type: "button", text: t.protect ? "Turn off deletion protection" : "Turn on deletion protection", onclick: function () { API.setDdbProtection(t.name, !t.protect); flash("ok", "Deletion protection " + (t.protect ? "เปิด" : "ปิด") + "แล้ว"); render(); } }), h("p", { cls: "hint", text: "เปิดแล้วลบ table ไม่ได้ (ทั้ง console และ terraform destroy) จนกว่าจะปิด · prd ควรเปิด" })]); },
  "Authorization": function (a) { return h("div", {}, [tbl(["Route", "Authorizer"], a.routes.map(function (r) { return [r.key, "None (เปิดให้ทุกคนเรียก)"]; }), "ไม่มี route"), h("p", { cls: "hint", text: "ปกป้อง API ด้วย JWT (Cognito) / Lambda authorizer / IAM · lab ไม่ใส่ จึงทุก route เปิดสาธารณะ" })]); },
  "CORS": function (a) { var c = a.cors; return h("div", {}, [c ? kvDom([["Access-Control-Allow-Origin", c.origins.join(", ")], ["Allow-Methods", c.methods.join(", ")], ["Allow-Headers", c.headers.join(", ") || "-"], ["Max-Age", String(c.maxAge)], ["Allow-Credentials", c.credentials ? "Yes" : "No"]]) : noteView("CORS ยังไม่ได้ตั้ง", "เบราว์เซอร์บล็อกเว็บจากโดเมนอื่นที่เรียก API นี้ จนกว่าจะตั้ง Allow-Origin"), h("button", { cls: "btn", type: "button", text: "Configure", onclick: function () { go("api-cors-edit", { id: a.id, from: "apis" }); } })]); },
  "Versions": function (l) {
    return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Publish new version", onclick: function () { go("lam-version-publish", { id: l.name, from: "lams" }); } }), tbl(["Version", "Description", "Memory / Timeout", "Created"], [["$LATEST", "-", l.memory + " MB / " + l.timeout + " s", stFmt(l.born)]].concat((l.versions || []).map(function (v) { return [String(v.v), v.desc || "-", v.memory + " MB / " + v.timeout + " s", stFmt(v.born)]; })), ""), h("p", { cls: "hint", text: "version = snapshot ที่แก้ไม่ได้ของโค้ด + config · ใช้คู่กับ alias เพื่อ rollback (ชี้ alias กลับ version เก่า)" })]);
  },
  "Aliases": function (l) {
    return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Create alias", onclick: function () { go("lam-alias-create", { id: l.name, from: "lams" }); } }), tbl(["Alias", "Version", "Description", ""], (l.aliases || []).map(function (a) { return [a.name, a.version, a.desc || "-", h("button", { cls: "btn", type: "button", text: "Delete", onclick: function () { API.deleteAlias(l.name, a.name); render(); } })]; }), "ไม่มี alias"), h("p", { cls: "hint", text: "alias = ชื่อคงที่ (เช่น live) ที่ชี้ไป version · API Gateway เรียก ARN แบบ …:function:" + l.name + ":live แล้วเปลี่ยน version ได้โดยไม่แก้ API" })]);
  }
};
(function () {
  Object.keys(DET).forEach(function (kind) {
    DET[kind].forEach(function (t) {
      if (t[2]) return; var lb = String(t[1]);
      if (/tags$/i.test(lb)) t[2] = tagsView;
      else if (/^(Monitoring|Monitor|Metrics)$/.test(lb)) t[2] = function (r) { return metricsView(r, kind); };
      else if (TAB_LABEL[lb]) t[2] = TAB_LABEL[lb];
      else t[2] = function () { return noteView(lb, "แท็บนี้มีใน console จริง · lab ไม่มีข้อมูลส่วนนี้ (ไม่ได้ใช้ในแล็บ)"); };
    });
  });
  // แท็บที่กำหนดฟังก์ชันไว้แล้วแต่เดิมเป็น null เฉพาะบางชนิด (id ชนกับ label ทั่วไป)
  [["lam", "versions"], ["lam", "aliases"], ["api", "auth"], ["api", "cors"], ["ddb", "indexes"], ["ddb", "capacity"]].forEach(function (x) { DET[x[0]].forEach(function (t) { if (t[0] === x[1] && TAB_LABEL[t[1]]) t[2] = TAB_LABEL[t[1]]; }); });
})();
PAGES["lam-version-publish"] = function () {
  var l = slsLam(UI.params.id); if (!l) return h("p", { text: "ไม่พบ function" });
  return formPage({ name: "lam-version-publish-" + l.name, crumb: "Lambda › " + l.name + " › Publish new version", title: "Publish new version", back: "lams", lead: "สร้าง snapshot ที่แก้ไม่ได้ของ $LATEST · ถ้าไม่มีอะไรเปลี่ยนตั้งแต่ version ล่าสุด Lambda จะคืน version เดิม",
    init: function () { return { desc: "" }; }, sections: function () { return [{ t: "Version description", f: [{ id: "desc", type: "text", label: "Description - optional", ph: "release 1.0.1" }] }]; },
    submit: "Publish", onSubmit: function (V) { var r = API.publishVersion(l.name, V.desc); return r.errors ? r : { msg: r.same ? "ไม่มีอะไรเปลี่ยน: ใช้ version " + r.res.v + " เดิม" : "Publish version " + r.res.v + " แล้ว", next: "lams" }; } });
};
PAGES["lam-alias-create"] = function () {
  var l = slsLam(UI.params.id); if (!l) return h("p", { text: "ไม่พบ function" });
  return formPage({ name: "lam-alias-create-" + l.name, crumb: "Lambda › " + l.name + " › Create alias", title: "Create alias", back: "lams", lead: "ชื่อคงที่ที่ชี้ไป version ใด version หนึ่ง (ไม่ใช่ตัวเลขล้วน)",
    init: function () { return { name: "live", version: "$LATEST", desc: "" }; },
    sections: function () { return [{ t: "Alias configuration", f: [{ id: "name", type: "text", label: "Name" }, { id: "version", type: "select", label: "Version", opts: function () { return [["$LATEST", "$LATEST"]].concat((l.versions || []).map(function (v) { return [String(v.v), String(v.v)]; })); } }, { id: "desc", type: "text", label: "Description - optional" }] }]; },
    submit: "Save", onSubmit: function (V) { var r = API.createAlias(l.name, V); return r.errors ? r : { msg: "สร้าง alias " + V.name + " → " + V.version + " แล้ว", next: "lams" }; } });
};
PAGES["api-cors-edit"] = function () {
  var a = slsApi(UI.params.id); if (!a) return h("p", { text: "ไม่พบ API" }); var c = a.cors || { origins: [], methods: ["GET", "POST"], headers: ["content-type"], maxAge: 300, credentials: false };
  return formPage({ name: "api-cors-edit-" + a.id, crumb: "API Gateway › " + a.name + " › CORS › Configure", title: "Configure CORS", back: "apis", lead: "ให้เว็บจากโดเมนอื่น (เช่น frontend) เรียก API นี้จากเบราว์เซอร์ได้ · origin ต้องเป็น scheme://host (ไม่มี path) · * ใช้ร่วมกับ credentials ไม่ได้",
    init: function () { return { origins: c.origins.join(", "), methods: c.methods.join(", "), headers: c.headers.join(", "), maxAge: String(c.maxAge), credentials: c.credentials }; },
    sections: function () { return [{ t: "CORS settings", f: [{ id: "origins", type: "text", label: "Access-Control-Allow-Origin", ph: "https://www.pharmacy.example.com" }, { id: "methods", type: "text", label: "Access-Control-Allow-Methods", ph: "GET, POST" }, { id: "headers", type: "text", label: "Access-Control-Allow-Headers", ph: "content-type" }, { id: "maxAge", type: "text", label: "Access-Control-Max-Age (วินาที)" }, { id: "credentials", type: "check", text: "Access-Control-Allow-Credentials" }] }]; },
    submit: "Save", onSubmit: function (V) { var r = API.setApiCors(a.id, V); return r.errors ? r : { msg: "บันทึก CORS แล้ว", next: "apis" }; } });
};
PAGES["ddb-gsi-create"] = function () {
  var t = slsTbl(UI.params.id); if (!t) return h("p", { text: "ไม่พบ table" });
  return formPage({ name: "ddb-gsi-create-" + t.name, crumb: "DynamoDB › " + t.name + " › Create index", title: "Create global secondary index", back: "ddb", lead: "ให้ query ด้วยฟิลด์อื่นนอก partition key (เช่นค้นยาตามชื่อ) ได้เร็วโดยไม่ต้อง Scan ทั้งตาราง",
    init: function () { return { name: "", key: "name", keyType: "S", projection: "ALL", rcu: "1", wcu: "1" }; },
    sections: function () { return [{ t: "Index details", f: [{ id: "name", type: "text", label: "Index name", ph: "name-index" }, { id: "key", type: "text", label: "Partition key", ph: "name" }, { id: "keyType", type: "select", label: "Type", opts: function () { return [["S", "String"], ["N", "Number"]]; } }, { id: "projection", type: "select", label: "Attribute projections", opts: function () { return [["ALL", "All"], ["KEYS_ONLY", "Only keys"]]; } }].concat(t.billing === "PROVISIONED" ? [{ id: "rcu", type: "text", label: "Read capacity units" }, { id: "wcu", type: "text", label: "Write capacity units" }] : []) }]; },
    submit: "Create index", onSubmit: function (V) { var r = API.createGsi(t.name, V); return r.errors ? r : { msg: "สร้าง index " + V.name + " แล้ว (Active)", next: "ddb" }; } });
};
