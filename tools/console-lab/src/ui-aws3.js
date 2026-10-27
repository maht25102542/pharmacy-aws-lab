// ===== หน้า console ของ S3 / CloudFront / Route 53 / ACM (use case: เว็บ static) =====
// หน้าตาเรียงตามความจำจากเอกสาร + tutorial ของ AWS (ปี 2025): ตัวจำลองไม่ได้เทียบกับ console จริง ขั้นตอน wizard ของ CloudFront เรียงตามเอกสาร "Get started with a CloudFront standard distribution"
(function () {
  var lab = NAV.Lab; delete NAV.Lab;
  NAV.S3 = [["Amazon S3", [["buckets", "General purpose buckets"], [null, "Access Grants"]]]];
  NAV.CloudFront = [["CloudFront", [["cfds", "Distributions"], ["oacs", "Origin access"], [null, "Policies"], [null, "Functions"]]]];
  NAV["Route 53"] = [["Route 53", [["zones", "Hosted zones"], [null, "Health checks"]]]];
  NAV.ACM = [["AWS Certificate Manager", [["certs", "List certificates"], ["cert-create", "Request certificate"]]]];
  NAV.Lab = lab;
  NAVHOME.S3 = "buckets"; NAVHOME.CloudFront = "cfds"; NAVHOME["Route 53"] = "zones"; NAVHOME.ACM = "certs";
  LK.bucket = "buckets"; LK.cfd = "cfds"; LK.oac = "oacs"; LK.zone = "zones"; LK.cert = "certs";
})();
var ST_SAMPLES = [["index-v1", "index.html (version 1)", "index.html", function (e, b) { return stPage(e, 1, b); }], ["index-v2", "index.html (version 2 — ปล่อยเวอร์ชันใหม่)", "index.html", function (e, b) { return stPage(e, 2, b); }], ["about", "about.html", "about.html", function (e, b) { return "<h1>About " + b + " (" + e + ")</h1>"; }], ["error", "error.html", "error.html", function () { return "<h1>ไม่พบหน้านี้</h1>"; }]];
function stRegions() { return [["ap-southeast-1", "Asia Pacific (Singapore) ap-southeast-1"], ["us-east-1", "US East (N. Virginia) us-east-1"], ["eu-west-1", "Europe (Ireland) eu-west-1"]]; }
function stSteps(list) { return h("div", { cls: "steps" }, list.map(function (x) { return h("div", {}, [h("b", { text: x.skip ? "–" : (x.ok ? "✓" : "✗"), style: "color:var(--" + (x.skip ? "muted" : (x.ok ? "ok" : "bad")) + ")" }), h("span", {}, [h("b", { text: x.t }), h("div", { cls: "hint", text: x.d })])]); })); }
function stFmt(ts) { return fmtT(ts || t0()); }
function stDistName(d) { return d.comment || d.id; }
function stCertOpts(onlyOk) { return [["", "ไม่ใช้ (ใช้ใบรับรอง *.cloudfront.net)"]].concat(S.certs.filter(function (c) { return !onlyOk || (c.region === "us-east-1" && acmStatus(c) === "ISSUED"); }).map(function (c) { return [c.arn, c.names[0] + (c.names.length > 1 ? " +" + (c.names.length - 1) : "") + " · " + c.region + " · " + acmStatus(c)]; })); }

// ---------- S3 ----------
LISTS.buckets = function () {
  return ({ key: "buckets", kind: "bucket", title: "General purpose buckets", crumb: "Amazon S3 › Buckets", create: [{ label: "Create bucket", page: "bucket-create" }],
    actions: [{ label: "Empty", grp: "Actions", run: function (b) { b.objects = []; return { res: true }; }, msg: "ลบไฟล์ทั้งหมดแล้ว (bucket ว่าง ลบ bucket ได้)" }, { label: "Delete", page: "del", kind: "bucket" }],
    detail: function (b) { return [["Bucket name", b.name], ["AWS Region", b.region], ["Bucket ARN", "arn:aws:s3:::" + b.name], ["Creation date", stFmt(b.born)], ["Objects", String(b.objects.length)], ["Block all public access", b.block.policy && b.block.acls ? tagp("On", "ok") : tagp("Off (บางส่วน)", "bad")], ["Bucket Versioning", b.versioning ? "Enabled" : "Disabled"], ["Object Ownership", "Bucket owner enforced (ACLs disabled)"]]; },
    rows: function () { return S.buckets; },
    cols: [["Name", function (b) { return b.name; }], ["AWS Region", function (b) { return b.region; }], ["Objects", function (b) { return String(b.objects.length); }], ["Creation date", function (b) { return stFmt(b.born); }]] });
};
PAGES["bucket-create"] = function () {
  return formPage({ name: "bucket-create", crumb: "Amazon S3 › Buckets › Create bucket", title: "Create bucket", back: "buckets",
    lead: "ตรงกับ aws_s3_bucket + aws_s3_bucket_public_access_block ใน Terraform · ชื่อ bucket ต้องไม่ซ้ำกันทั้งโลก (เติม account id ต่อท้ายเป็นวิธีที่ใช้กัน)",
    init: function () { return { name: "", region: REGION, versioning: "off", blockAll: true }; },
    sections: function (V) { return [
      { t: "General configuration", f: [
        { id: "region", type: "select", label: "AWS Region", opts: function () { return stRegions(); } },
        { id: "name", type: "text", label: "Bucket name", ph: "pharmacy-web-prd-" + ACCOUNT, desc: "3-63 ตัว ตัวพิมพ์เล็ก ตัวเลข . - เท่านั้น ขึ้นต้น/ลงท้ายด้วยตัวอักษรหรือตัวเลข · ชื่อที่ลบแล้วอาจถูกคนอื่นจองได้" }] },
      { t: "Object Ownership", f: [{ type: "custom", id: "own", render: function () { return h("div", { cls: "alert info", text: "ⓘ ACLs disabled (recommended) — เจ้าของ bucket เป็นเจ้าของไฟล์ทั้งหมด จัดสิทธิ์ด้วย policy · ต้องเป็น ‘Bucket owner enforced’ ถึงจะใช้ CloudFront OAC ได้" }); } }] },
      { t: "Block Public Access settings for this bucket", f: [{ id: "blockAll", type: "check", text: "Block all public access (แนะนำ: เว็บให้ CloudFront อ่านผ่าน OAC ไม่ต้องเปิด public)" }, { type: "custom", id: "bpa", show: function (V2) { return !V2.blockAll; }, render: function () { return h("div", { cls: "alert warn", text: "⚠ ปิด Block public access = bucket อาจถูกเปิดสาธารณะได้ (เว็บ static ที่ใช้ CloudFront + OAC ไม่ต้องปิดข้อนี้)" }); } }] },
      { t: "Bucket Versioning", f: [{ id: "versioning", type: "radio", opts: function () { return [["off", "Disable"], ["on", "Enable (เก็บทุกเวอร์ชันของไฟล์ ย้อนกลับได้)"]]; } }] },
      { t: "Default encryption", f: [{ type: "custom", id: "enc", render: function () { return h("div", { cls: "hint", text: "Server-side encryption with Amazon S3 managed keys (SSE-S3) — เปิดให้อัตโนมัติ" }); } }] }]; },
    submit: "Create bucket", onSubmit: function (V) {
      var r = API.createBucket({ name: V.name, region: V.region, versioning: V.versioning === "on", block: V.blockAll ? { acls: true, policy: true, ignore: true, restrict: true } : { acls: false, policy: false, ignore: false, restrict: false } });
      if (r.errors) return r; UI.sel.buckets = r.res.id; return { msg: "สร้าง bucket " + V.name + " แล้ว · ต่อไป: Upload ไฟล์เว็บ", next: "buckets" };
    } });
};
DET.bucket = [
  ["objects", "Objects", function (b) { var rows = b.objects.map(function (o) { return [o.key, o.type, o.size + " B", stFmt(o.mod), h("button", { cls: "btn", type: "button", text: "Delete", onclick: function () { API.deleteObject(b.name, o.key); render(); } })]; }); return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Upload", onclick: function () { go("obj-upload", { id: b.name, from: "buckets" }); } }), h("p", { cls: "hint", text: "ของจริงใช้ aws s3 sync ./dist s3://" + b.name + " จากขั้น build" }), tbl(["Name", "Type", "Size", "Last modified", ""], rows, "bucket ว่าง (ยังไม่มีไฟล์) · เว็บจะได้ 403 จนกว่าจะอัปโหลด index.html")]); }],
  ["props", "Properties", function (b) { return kvDom([["Bucket ARN", "arn:aws:s3:::" + b.name], ["AWS Region", b.region], ["Bucket Versioning", b.versioning ? "Enabled" : "Disabled"], ["Default encryption", "SSE-S3"], ["Static website hosting", "Disabled — ไม่เปิด (ใช้ CloudFront + OAC แทน · OAC ใช้กับ website endpoint ไม่ได้)"]]); }],
  ["perm", "Permissions", function (b) {
    var j = null; try { j = b.policy ? JSON.stringify(JSON.parse(b.policy), null, 2) : ""; } catch (e) { j = b.policy; }
    return h("div", {}, [h("h4", { text: "Block public access (bucket settings)" }), kvDom([["Block all public access", b.block.policy && b.block.acls && b.block.ignore && b.block.restrict ? tagp("On", "ok") : tagp("Off", "bad")], ["BlockPublicAcls / BlockPublicPolicy / IgnorePublicAcls / RestrictPublicBuckets", [b.block.acls, b.block.policy, b.block.ignore, b.block.restrict].map(function (x) { return x ? "On" : "Off"; }).join(" / ")]]),
      h("h4", { text: "Bucket policy" }), h("button", { cls: "btn", type: "button", text: "Edit", onclick: function () { go("bucket-policy", { id: b.name, from: "buckets" }); } }), j ? codePre(j, "json") : h("p", { cls: "hint", text: "No policy to display · CloudFront จะอ่านไฟล์ไม่ได้ (403) จนกว่าจะมี policy ที่อนุญาต" })]);
  }]
];
PAGES["obj-upload"] = function () {
  var bn = UI.params.id, b = bucketByName(bn);
  if (!b) return h("p", { text: "ไม่พบ bucket" });
  return formPage({ name: "obj-upload-" + bn, crumb: "Amazon S3 › Buckets › " + bn + " › Upload", title: "Upload", back: "buckets",
    lead: "ตัวจำลองไม่มีไฟล์จากเครื่อง: เลือกตัวอย่าง แล้วแก้เนื้อหาได้ · หรือใช้ aws s3 cp/sync ใน Laptop › Terminal",
    init: function () { var env = /-prd-/.test(bn) ? "prd" : "dev"; return { sample: "index-v1", brand: "pharmacy", key: "index.html", body: stPage(env, 1), type: "text/html", env: env }; },
    sections: function (V) { return [{ t: "Files", f: [
      { id: "brand", type: "select", label: "ตัวอย่างของร้าน", opts: function () { return [["pharmacy", "pharmacy (ร้านยา)"], ["cafe", "cafe (ร้านกาแฟ)"]]; }, onchange: function (V2) { var x = ST_SAMPLES.filter(function (q) { return q[0] === V2.sample; })[0]; V2.body = x[3](V2.env, V2.brand); } },
      { id: "sample", type: "select", label: "ตัวอย่างไฟล์", opts: function () { return ST_SAMPLES.map(function (x) { return [x[0], x[1]]; }); }, onchange: function (V2) { var x = ST_SAMPLES.filter(function (q) { return q[0] === V2.sample; })[0]; V2.key = x[2]; V2.body = x[3](V2.env, V2.brand); } },
      { id: "key", type: "text", label: "ชื่อไฟล์ (key)" }, { id: "body", type: "area", label: "เนื้อหา", noex: true }] }]; },
    submit: "Upload", onSubmit: function (V) { var r = API.putObject(bn, { key: V.key, body: V.body, type: /\.html$/.test(V.key) ? "text/html" : "text/plain" }); return r.errors ? r : { msg: "อัปโหลด " + V.key + " แล้ว (ถ้ามี CloudFront หน้าอยู่แล้ว ผู้ใช้อาจยังเห็นของเก่าจน cache หมดอายุ หรือสร้าง Invalidation)", next: "buckets" }; } });
};
PAGES["bucket-policy"] = function () {
  var bn = UI.params.id, b = bucketByName(bn); if (!b) return h("p", { text: "ไม่พบ bucket" });
  return formPage({ name: "bucket-policy-" + bn, crumb: "Amazon S3 › Buckets › " + bn + " › Edit bucket policy", title: "Edit bucket policy", back: "buckets",
    lead: "นี่คือสิ่งที่ Terraform สร้างด้วย aws_s3_bucket_policy + aws_iam_policy_document · Principal ต้องเป็น Service cloudfront.amazonaws.com และ AWS:SourceArn ต้องตรงกับ distribution ที่ใช้",
    init: function () { return { fill: "", policy: b.policy ? JSON.stringify(JSON.parse(b.policy), null, 2) : "" }; },
    sections: function () { return [{ t: "Policy", f: [
      { id: "fill", type: "select", label: "เติมตัวอย่างจาก CloudFront distribution", opts: function () { return [["", "(พิมพ์เอง)"]].concat(S.cfds.map(function (d) { return [d.id, d.id + " · " + (d.aliases[0] || d.domain)]; })); }, onchange: function (V2) { if (V2.fill) V2.policy = stPolicyFor(bn, V2.fill); } },
      { id: "policy", type: "area", label: "Policy (JSON)", noex: true }] }]; },
    submit: "Save changes", onSubmit: function (V) { var r = API.putBucketPolicy(bn, V.policy); return r.errors ? r : { msg: "บันทึก bucket policy แล้ว", next: "buckets" }; } });
};

// ---------- CloudFront ----------
function cfdStatus(d) { return !d.enabled ? tagp("Disabled", "warn") : cfPhase(d) === "Deployed" ? okIco("Deployed") : tagp("Deploying", "warn"); }
LISTS.cfds = function () {
  return ({ key: "cfds", kind: "cfd", title: "Distributions", crumb: "CloudFront › Distributions", create: [{ label: "Create distribution", page: "cf-create" }],
    actions: [{ label: "Create invalidation", grp: "Actions", page: "cf-inv-create" }, { label: "Edit settings", grp: "Actions", page: "cf-edit" }, { label: "Disable", grp: "Actions", run: function (d) { d.enabled = false; return { res: true }; }, msg: "Disable แล้ว (ของจริงใช้เวลา deploy หลายนาที)", when: function (d) { return d.enabled; } }, { label: "Enable", grp: "Actions", run: function (d) { d.enabled = true; return { res: true }; }, msg: "Enable แล้ว", when: function (d) { return !d.enabled; } }, { label: "Delete", page: "del", kind: "cfd" }],
    detail: function (d) { var cert = S.certs.filter(function (c) { return c.arn === d.certArn; })[0]; return [["Distribution domain name", d.domain], ["ARN", cfdArn(d)], ["Distribution ID", d.id], ["Description", d.comment || "-"], ["Last modified", cfPhase(d) === "Deployed" ? stFmt(d.touched || d.born) : "Deploying… (โหมดเหมือนจริง: ~4 นาที ถึงจะ Deployed ทุก edge)"], ["Alternate domain names", d.aliases.length ? d.aliases.join(", ") : "- (ใช้ชื่อ *.cloudfront.net เท่านั้น)"], ["Custom SSL certificate", cert ? cert.names[0] + " (" + cert.region + ", " + acmStatus(cert) + ")" : "Default CloudFront certificate (*.cloudfront.net)"], ["Default root object", d.defaultRoot || "- (ไม่ตั้ง: เปิด / จะได้ 403)"], ["Price class", d.priceClass], ["Status", cfdStatus(d)]]; },
    rows: function () { return S.cfds; },
    cols: [["ID", function (d) { return d.id; }], ["Description", function (d) { return d.comment || "-"; }], ["Domain name", function (d) { return d.domain; }], ["Alternate domain names", function (d) { return d.aliases.join(", ") || "-"; }], ["Origins", function (d) { return d.origins.map(function (o) { return o.domain; }).join(", "); }], ["Status", cfdStatus]] });
};
PAGES["cf-create"] = function () {
  return formPage({ name: "cf-create", crumb: "CloudFront › Distributions › Create distribution", title: "Create distribution", back: "cfds", steps: 4,
    init: function () { return { name: "", type: "single", bucket: "", origin: "recommended", oacId: "", waf: "no", domain: "", cert: "", root: "index.html" }; },
    sections: function (V) { return [
      { step: 0, t: "Step 1: Get started", ct: "Get started", f: [
        { id: "name", type: "text", label: "Distribution name", desc: "เก็บเป็นแท็ก Name (แก้ทีหลังได้) · ตรงกับ comment ใน Terraform", ph: "pharmacy web prd" },
        { id: "type", type: "radio", label: "Distribution type", opts: function () { return [["single", "Single website or app — ใช้กับเว็บ/แอปเดียว"], ["multi", "Multi-tenant architecture", "ไม่จำลอง"]]; } }] },
      { step: 1, t: "Step 2: Specify origin", ct: "Specify origin", f: [
        { type: "custom", id: "otype", render: function () { return h("div", { cls: "hint", text: "Origin type: Amazon S3 (ตัวจำลองรองรับเฉพาะแบบนี้ · ถ้า bucket เปิดเป็น static website endpoint ต้องใช้ custom origin และใช้ OAC ไม่ได้)" }); } },
        { id: "bucket", type: "select", label: "S3 origin (Browse S3)", opts: function () { return [["", "เลือก bucket"]].concat(S.buckets.map(function (b) { return [b.name, b.name + " · " + b.region]; })); } },
        { id: "origin", type: "radio", label: "Settings", opts: function () { return [["recommended", "Use recommended origin settings — สร้าง OAC ให้ และ CloudFront อัปเดต bucket policy ให้อัตโนมัติ"], ["custom", "Customize origin settings — เลือก OAC เอง (ต้องแก้ bucket policy เอง)"]]; } },
        { id: "oacId", type: "select", label: "Origin access control", show: function (V2) { return V2.origin === "custom"; }, opts: function () { return [["", "ไม่ใช้ OAC (public access)"]].concat(S.oacs.map(function (o) { return [o.id, o.name]; })); } },
        { id: "root", type: "text", label: "Default root object", desc: "ไฟล์ที่เสิร์ฟเมื่อเปิด / (ไม่ตั้ง = เปิดหน้าแรกแล้วได้ 403) · ใช้ได้เฉพาะ root ไม่รวมโฟลเดอร์ย่อย", ph: "index.html" }] },
      { step: 2, t: "Step 3: Enable security", ct: "Enable security protections", f: [{ id: "waf", type: "radio", opts: function () { return [["no", "Do not enable security protections"], ["yes", "Enable security protections (AWS WAF)", "ไม่จำลอง / คิดค่าใช้จ่ายเพิ่ม"]]; } }] },
      { step: 3, t: "Step 4: Custom domain and TLS (optional)", ct: "Custom domain (ขั้นนี้เรียงตามความจำ ไม่ใช่ตามเอกสารฉบับเดียว)", f: [
        { id: "domain", type: "text", label: "Alternate domain name (CNAME)", ph: "www.pharmacy.example.com", desc: "ปล่อยว่าง = ใช้ชื่อ dxxxx.cloudfront.net · ใส่ชื่อแล้วต้องมีใบรับรอง ACM ที่ Issued ใน us-east-1" },
        { id: "cert", type: "select", label: "Custom SSL certificate", opts: function () { return stCertOpts(false); } },
        { type: "custom", id: "tlshint", render: function () { return h("div", { cls: "hint", text: "ใบรับรองของ CloudFront ต้องอยู่ region us-east-1 เท่านั้น (ACM › เปลี่ยน region ก่อน Request) และสถานะ Issued" }); } }] }]; },
    submit: "Create distribution", onSubmit: function (V) {
      var b = bucketByName(V.bucket), oacId = V.oacId;
      if (!b) return { errors: { bucket: "ต้องเลือก S3 origin (สร้าง bucket ที่ S3 ก่อน)" } };
      if (V.origin === "recommended") { var oa = byName(S.oacs, b.name) || API.createOac({ name: b.name, desc: "Created by CloudFront wizard", type: "s3", signing: "always" }).res; oacId = oa.id; }
      var r = API.createCfd({ comment: V.name, origins: [{ id: b.name + ".s3." + b.region + ".amazonaws.com", domain: b.name + ".s3." + b.region + ".amazonaws.com", oacId: oacId }], aliases: V.domain ? [V.domain] : [], certArn: V.cert, defaultRoot: V.root, viewerProto: "redirect-to-https", priceClass: "PriceClass_All" });
      if (r.errors) return mgErrMap(r, { cert: "cert", aliases: "domain", origins: "bucket" });
      UI.sel.cfds = r.res.id;
      var msg = "สร้าง distribution " + r.res.id + " แล้ว (" + r.res.domain + ")";
      if (V.origin === "recommended") { API.putBucketPolicy(b.name, stPolicyFor(b.name, r.res.id)); msg += " · CloudFront อัปเดต bucket policy ของ " + b.name + " ให้แล้ว"; } else msg += " · อย่าลืมแก้ bucket policy (S3 › Permissions) ให้ตรง AWS:SourceArn ของ distribution นี้ ไม่งั้นได้ 403";
      return { msg: msg, next: "cfds" };
    } });
};
function cfdDetailTab(d, tab) {
  if (tab === "origins") return tbl(["Origin name", "Origin domain", "Origin access", "Bucket"], d.origins.map(function (o) { var a = S.oacs.filter(function (x) { return x.id === o.oacId; })[0], b = cfOriginBucket(o); return [o.id, o.domain, a ? "OAC: " + a.name : "Public (ไม่มี OAC)", b ? b.name : tagp("ไม่พบ bucket", "bad")]; }), "ไม่มี origin");
  if (tab === "behaviors") return kvDom([["Path pattern", "Default (*)"], ["Viewer protocol policy", d.viewerProto === "redirect-to-https" ? "Redirect HTTP to HTTPS" : d.viewerProto], ["Allowed HTTP methods", "GET, HEAD"], ["Cache policy", CF_MANAGED_CACHE[d.cachePolicy] || d.cachePolicy], ["Default TTL", "86400 วินาที (24 ชม.) — ไฟล์ใน edge ไม่ถามกลับ S3 จนหมดอายุ หรือถูก invalidate"]]);
  if (tab === "errors") return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Create custom error response", onclick: function () { go("cf-err-create", { id: d.id, from: "cfds" }); } }), tbl(["HTTP error code", "Response page path", "HTTP response code"], d.errorPages.map(function (e) { return [String(e.code), e.page, String(e.respCode || 200)]; }), "ยังไม่มี · เว็บ SPA ต้องตั้ง 403/404 → /index.html (200) ไม่งั้นรีเฟรชหน้าย่อยแล้วเจอ 403")]);
  if (tab === "inv") return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Create invalidation", onclick: function () { go("cf-inv-create", { id: d.id, from: "cfds" }); } }), tbl(["Invalidation ID", "Object paths", "Status", "Date"], (cfInvTick(d), d.invalidations).map(function (v) { return [v.id, v.paths.join(", "), v.status === "Completed" ? okIco("Completed") : tagp("In progress", "warn"), stFmt(v.at)]; }), "ยังไม่มี invalidation · ปล่อยเวอร์ชันใหม่แล้วต้องล้างแคช (เช่น /* )")]);
  return null;
}
DET.cfd = [["details", "General", det("cfd")], ["origins", "Origins", function (d) { return cfdDetailTab(d, "origins"); }], ["behaviors", "Behaviors", function (d) { return cfdDetailTab(d, "behaviors"); }], ["errors", "Error pages", function (d) { return cfdDetailTab(d, "errors"); }], ["inv", "Invalidations", function (d) { return cfdDetailTab(d, "inv"); }]];
PAGES["cf-inv-create"] = function () {
  var d = S.cfds.filter(function (x) { return x.id === UI.params.id; })[0]; if (!d) return h("p", { text: "เลือก distribution ก่อน" });
  return formPage({ name: "cf-inv-" + d.id, crumb: "CloudFront › Distributions › " + d.id + " › Create invalidation", title: "Create invalidation", back: "cfds",
    lead: "ล้างไฟล์ใน cache ของ edge · ใน Terraform/CI ใช้ aws cloudfront create-invalidation · ของจริง ~1-2 นาที (ตัวจำลองเสร็จทันที) · ฟรี 1,000 path/เดือน หลังจากนั้นคิดเงิน",
    init: function () { return { paths: "/*" }; },
    sections: function () { return [{ t: "Add object paths", f: [{ id: "paths", type: "area", label: "Object paths", desc: "บรรทัดละ 1 path ต้องขึ้นต้นด้วย / (เช่น /index.html หรือ /*)" }] }]; },
    submit: "Create invalidation", onSubmit: function (V) { var r = API.createInvalidation(d.id, V.paths.split(/\n|,/)); return r.errors ? r : { msg: "สร้าง invalidation " + r.res.id + " แล้ว (Completed) · cache ถูกล้าง ผู้ใช้จะได้ไฟล์ใหม่จาก S3", next: "cfds" }; } });
};
PAGES["cf-edit"] = function () {
  var d = S.cfds.filter(function (x) { return x.id === UI.params.id; })[0]; if (!d) return h("p", { text: "เลือก distribution ก่อน" });
  return formPage({ name: "cf-edit-" + d.id, crumb: "CloudFront › Distributions › " + d.id + " › Edit settings", title: "Edit settings", back: "cfds",
    init: function () { return { aliases: d.aliases.join(", "), cert: d.certArn, root: d.defaultRoot, price: d.priceClass, proto: d.viewerProto }; },
    sections: function () { return [{ t: "Settings", f: [
      { id: "aliases", type: "text", label: "Alternate domain names (CNAMEs)", desc: "คั่นด้วย , · แต่ละชื่อใช้ซ้ำข้าม distribution ไม่ได้ (CNAMEAlreadyExists)", ph: "www.pharmacy.example.com" },
      { id: "cert", type: "select", label: "Custom SSL certificate", opts: function () { return stCertOpts(false); } },
      { id: "root", type: "text", label: "Default root object", ph: "index.html" },
      { id: "price", type: "select", label: "Price class", opts: function () { return [["PriceClass_All", "Use all edge locations (best performance)"], ["PriceClass_200", "Use North America, Europe, Asia, Middle East, and Africa"], ["PriceClass_100", "Use only North America and Europe"]]; } },
      { id: "proto", type: "select", label: "Viewer protocol policy", opts: function () { return [["redirect-to-https", "Redirect HTTP to HTTPS"], ["https-only", "HTTPS only"], ["allow-all", "HTTP and HTTPS"]]; } }] }]; },
    submit: "Save changes", onSubmit: function (V) { var r = API.updateCfd(d.id, { aliases: V.aliases.split(",").map(function (x) { return x.trim(); }).filter(Boolean), certArn: V.cert, defaultRoot: V.root, priceClass: V.price, viewerProto: V.proto }); return r.errors ? mgErrMap(r, { cert: "cert", aliases: "aliases" }) : { msg: "บันทึกแล้ว (Deploying → Deployed)", next: "cfds" }; } });
};
PAGES["cf-err-create"] = function () {
  var d = S.cfds.filter(function (x) { return x.id === UI.params.id; })[0]; if (!d) return h("p", { text: "เลือก distribution ก่อน" });
  return formPage({ name: "cf-err-" + d.id, crumb: "CloudFront › " + d.id + " › Create custom error response", title: "Create custom error response", back: "cfds",
    init: function () { return { code: "403", page: "/index.html", resp: "200" }; },
    sections: function () { return [{ t: "Error response", f: [{ id: "code", type: "select", label: "HTTP error code", opts: function () { return [["403", "403: Forbidden"], ["404", "404: Not Found"]]; } }, { id: "page", type: "text", label: "Response page path", ph: "/index.html" }, { id: "resp", type: "select", label: "HTTP response code", opts: function () { return [["200", "200: OK"], ["404", "404: Not Found"]]; } }] }]; },
    submit: "Create custom error response", onSubmit: function (V) { d.errorPages = d.errorPages.filter(function (e) { return +e.code !== +V.code; }).concat([{ code: +V.code, page: V.page, respCode: +V.resp }]); return { msg: "บันทึก custom error response แล้ว (SPA: 403/404 → index.html)", next: "cfds" }; } });
};
LISTS.oacs = function () {
  return ({ key: "oacs", kind: "oac", title: "Origin access", crumb: "CloudFront › Origin access", create: [{ label: "Create control setting", page: "oac-create" }], actions: [{ label: "Delete", page: "del", kind: "oac" }],
    detail: function (o) { return [["Name", o.name], ["ID", o.id], ["Description", o.desc || "-"], ["Signing behavior", o.signing === "always" ? "Sign requests (recommended)" : o.signing === "never" ? "Do not sign requests" : "Do not override authorization header"], ["Signing protocol", "sigv4"], ["Origin type", "S3"]]; },
    rows: function () { return S.oacs; },
    cols: [["Name", function (o) { return o.name; }], ["Origin type", function () { return "S3"; }], ["Signing behavior", function (o) { return o.signing === "always" ? "Sign requests (recommended)" : o.signing === "never" ? "Do not sign requests" : "Do not override"; }], ["Used by", function (o) { var n = S.cfds.filter(function (d) { return d.origins.some(function (g) { return g.oacId === o.id; }); }).length; return n + " distribution(s)"; }]] });
};
PAGES["oac-create"] = function () {
  return formPage({ name: "oac-create", crumb: "CloudFront › Origin access › Create control setting", title: "Create control setting", back: "oacs",
    lead: "ตรงกับ aws_cloudfront_origin_access_control ใน Terraform",
    init: function () { return { name: "", desc: "", signing: "always", type: "s3" }; },
    sections: function () { return [{ t: "Details", f: [{ id: "name", type: "text", label: "Name", ph: "pharmacy-web-oac" }, { id: "desc", type: "text", label: "Description - optional", ph: "CloudFront reads private S3 buckets" }] }, { t: "Settings", f: [{ id: "signing", type: "radio", label: "Signing behavior", opts: function () { return [["always", "Sign requests (recommended)"], ["never", "Do not sign requests — ใช้ได้เมื่อ bucket เป็น public เท่านั้น"], ["no-override", "Do not override authorization header"]]; } }, { id: "type", type: "select", label: "Origin type", opts: function () { return [["s3", "S3"]]; } }] }]; },
    submit: "Create", onSubmit: function (V) { var r = API.createOac(V); return r.errors ? r : { msg: "สร้าง OAC " + V.name + " แล้ว · ต้องผูกกับ origin ของ distribution และตั้ง bucket policy ให้ตรงกัน", next: "oacs" }; } });
};

// ---------- Route 53 ----------
LISTS.zones = function () {
  return ({ key: "zones", kind: "zone", title: "Hosted zones", crumb: "Route 53 › Hosted zones", create: [{ label: "Create hosted zone", page: "zone-create" }], actions: [{ label: "Create record", grp: "Actions", page: "rec-create" }, { label: "Delete", page: "del", kind: "zone" }],
    detail: function (z) { return [["Hosted zone name", z.name], ["Hosted zone ID", z.id], ["Type", "Public hosted zone"], ["Record count", String(z.records.length)], ["Name servers (ไปตั้งที่ผู้ขายโดเมน)", z.records[0].values.join("\n")]]; },
    rows: function () { return S.zones; },
    cols: [["Hosted zone name", function (z) { return z.name; }], ["Type", function () { return "Public"; }], ["Record count", function (z) { return String(z.records.length); }], ["Hosted zone ID", function (z) { return z.id; }]] });
};
PAGES["zone-create"] = function () {
  return formPage({ name: "zone-create", crumb: "Route 53 › Hosted zones › Create hosted zone", title: "Create hosted zone", back: "zones",
    lead: "ตรงกับ aws_route53_zone · สร้างแล้วต้องไปตั้ง NS ที่ผู้ขายโดเมนให้ชี้มาที่ name servers 4 ตัว ไม่งั้นอินเทอร์เน็ตไม่รู้จักโซนนี้ (ค่าโซน ~$0.50/เดือน)",
    init: function () { return { name: "", type: "public" }; },
    sections: function () { return [{ t: "Hosted zone configuration", f: [{ id: "name", type: "text", label: "Domain name", ph: "pharmacy.example.com" }, { id: "type", type: "radio", label: "Type", opts: function () { return [["public", "Public hosted zone"], ["private", "Private hosted zone", "ไม่จำลอง"]]; } }] }]; },
    submit: "Create hosted zone", onSubmit: function (V) { var r = API.createZone({ name: V.name }); if (r.errors) return r; UI.sel.zones = r.res.id; return { msg: "สร้างโซน " + r.res.name + " แล้ว · มี NS และ SOA ให้อัตโนมัติ", next: "zones" }; } });
};
DET.zone = [["details", "Details", det("zone")], ["records", "Records", function (z) {
  var rows = z.records.map(function (r) { var del = r.type === "NS" || r.type === "SOA" ? "" : h("button", { cls: "btn", type: "button", text: "Delete", onclick: function () { API.deleteRecord(z.id, r.name, r.type); render(); } }); return [r.name, r.type, r.alias ? "Alias → " + r.alias : String(r.ttl), (r.values || []).join("\n") || (r.alias || ""), del]; });
  return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Create record", onclick: function () { go("rec-create", { id: z.id, from: "zones" }); } }), tbl(["Record name", "Type", "TTL / Alias", "Value", ""], rows, "ไม่มี record")]);
}]];
PAGES["rec-create"] = function () {
  var z = S.zones.filter(function (x) { return x.id === UI.params.id; })[0] || S.zones[0]; if (!z) return h("p", { text: "ต้องสร้าง hosted zone ก่อน" });
  return formPage({ name: "rec-create-" + z.id, crumb: "Route 53 › Hosted zones › " + z.name + " › Create record", title: "Create record", back: "zones",
    lead: "ตรงกับ aws_route53_record · เว็บที่ใช้ CloudFront ใช้ A แบบ Alias (apex ใช้ CNAME ไม่ได้)",
    init: function () { return { name: "", type: "A", alias: true, target: "", value: "", ttl: "300" }; },
    sections: function (V) { return [{ t: "Quick create record", f: [
      { id: "name", type: "text", label: "Record name", desc: "ส่วนหน้าของ " + z.name + " (เช่น www) · ว่าง = apex", ph: "www" },
      { id: "type", type: "select", label: "Record type", opts: function () { return ["A", "AAAA", "CNAME", "TXT", "MX"].map(function (t) { return [t, t]; }); } },
      { id: "alias", type: "check", text: "Alias", show: function (V2) { return V2.type === "A" || V2.type === "AAAA"; } },
      { id: "target", type: "select", label: "Route traffic to: Alias to CloudFront distribution", show: function (V2) { return V2.alias && (V2.type === "A" || V2.type === "AAAA"); }, opts: function () { return [["", "เลือก distribution"]].concat(S.cfds.map(function (d) { return [d.domain, d.domain + (d.aliases[0] ? "  (" + d.aliases[0] + ")" : "")]; })); } },
      { id: "value", type: "text", label: "Value", show: function (V2) { return !(V2.alias && (V2.type === "A" || V2.type === "AAAA")); }, ph: "192.0.2.1" },
      { id: "ttl", type: "text", label: "TTL (seconds)", show: function (V2) { return !(V2.alias && (V2.type === "A" || V2.type === "AAAA")); } }] }]; },
    submit: "Create records", onSubmit: function (V) { var useAlias = V.alias && (V.type === "A" || V.type === "AAAA"), r = API.putRecord(z.id, { name: V.name, type: V.type, ttl: V.ttl, values: useAlias ? [] : [V.value], alias: useAlias ? V.target : "" }, false); return r.errors ? mgErrMap(r, { alias: "target", values: "value" }) : { msg: "สร้าง record " + r.res.name + " (" + V.type + ") แล้ว", next: "zones" }; } });
};

// ---------- ACM ----------
LISTS.certs = function () {
  var rg = UI.acmRegion || REGION;
  return ({ key: "certs", kind: "cert", title: "Certificates (" + rg + ")", crumb: "AWS Certificate Manager › Certificates", create: [{ label: "Request", page: "cert-create" }], actions: [{ label: "Delete", page: "del", kind: "cert" }],
    empty: "ไม่มีใบรับรองใน region " + rg + " · ใบรับรองสำหรับ CloudFront ต้องอยู่ us-east-1 (เปลี่ยน region ที่ด้านบน)",
    detail: function (c) { return [["Certificate ARN", c.arn], ["Domain name", c.names[0]], ["Additional names", c.names.slice(1).join(", ") || "-"], ["Status", acmStatus(c) === "ISSUED" ? okIco("Issued") : tagp(acmStatus(c) === "PENDING_VALIDATION" ? "Pending validation" : acmStatus(c), "warn")], ["Type", "Amazon issued"], ["Key algorithm", c.algo], ["In use?", S.cfds.some(function (d) { return d.certArn === c.arn; }) ? "Yes (CloudFront)" : "No"], ["Region", c.region]]; },
    rows: function () { return S.certs.filter(function (c) { return c.region === rg; }); },
    cols: [["Domain name", function (c) { return c.names[0]; }], ["Type", function () { return "Amazon Issued"; }], ["Status", function (c) { return acmStatus(c) === "ISSUED" ? okIco("Issued") : tagp("Pending validation", "warn"); }], ["In use?", function (c) { return S.cfds.some(function (d) { return d.certArn === c.arn; }) ? "Yes" : "No"; }], ["Certificate ID", function (c) { return c.arn.split("/").pop(); }]] });
};
PAGES.certs = function () {
  var rg = UI.acmRegion || REGION, w = h("div");
  w.appendChild(h("div", { style: "display:flex;gap:10px;align-items:center;margin:0 0 8px" }, [h("label", { style: "font-size:.86rem" }, ["Region (มุมขวาบนของ console จริง) ", h("select", { "aria-label": "Region", onchange: function (e) { UI.acmRegion = e.target.value; render(); } }, stRegions().map(function (r) { return h("option", { value: r[0], text: r[1], selected: r[0] === rg ? "selected" : null }); }))]), h("span", { cls: "hint", text: "ACM แยกตาม region · CloudFront มองเห็นเฉพาะ us-east-1" })]));
  w.appendChild(listPage(LISTS.certs())); return w;
};
PAGES["cert-create"] = function () {
  return formPage({ name: "cert-create", crumb: "AWS Certificate Manager › Request certificate", title: "Request public certificate", back: "certs",
    lead: "ตรงกับ aws_acm_certificate (+ provider alias us-east-1) · ใบรับรองสาธารณะฟรี",
    init: function () { return { region: UI.acmRegion || "us-east-1", domain: "", extra: "", method: "dns", algo: "RSA_2048" }; },
    sections: function () { return [
      { t: "Region", f: [{ id: "region", type: "select", label: "Region", desc: "ของ CloudFront ต้อง us-east-1 (ผิด region = ใช้กับ CloudFront ไม่ได้ และจะ error ตอนผูก alias)", opts: function () { return stRegions(); } }] },
      { t: "Domain names", f: [{ id: "domain", type: "text", label: "Fully qualified domain name", ph: "www.pharmacy.example.com" }, { id: "extra", type: "text", label: "Add another name to this certificate (optional)", ph: "dev.pharmacy.example.com" }] },
      { t: "Validation method", f: [{ id: "method", type: "radio", opts: function () { return [["dns", "DNS validation - recommended (สร้าง CNAME ใน Route 53 ได้ในคลิกเดียว)"], ["email", "Email validation", "ไม่จำลอง"]]; } }] },
      { t: "Key algorithm", f: [{ id: "algo", type: "select", opts: function () { return [["RSA_2048", "RSA 2048"], ["EC_prime256v1", "ECDSA P 256"], ["EC_secp384r1", "ECDSA P 384"]]; } }] }]; },
    submit: "Request", onSubmit: function (V) { var r = API.requestCert({ domain: V.domain, sans: V.extra ? [V.extra] : [], region: V.region, algo: V.algo }); if (r.errors) return r; UI.acmRegion = V.region; UI.sel.certs = r.res.id; return { msg: "ขอใบรับรองแล้ว (Pending validation) · เปิดใบรับรอง › Create records in Route 53 เพื่อพิสูจน์โดเมน", next: "certs" }; } });
};
DET.cert = [["details", "Details", det("cert")], ["domains", "Domains", function (c) {
  var rows = c.names.map(function (n) { var rec = c.domainRec[n], ok = acmStatus(c) === "ISSUED"; return [n, ok ? okIco("Success") : tagp("Pending validation", "warn"), rec.name, rec.value]; });
  return h("div", {}, [h("button", { cls: "btn pri", type: "button", text: "Create records in Route 53", onclick: function () {
    var made = 0, miss = [];
    c.records.forEach(function (r) { var base = r.name.replace(/^_[0-9a-f]+\./, "").replace(/\.$/, ""), z = S.zones.filter(function (q) { return base === q.name || base.slice(-q.name.length - 1) === "." + q.name; })[0]; if (!z) { miss.push(base); return; } var x = API.putRecord(z.id, { name: r.name.replace(/\.$/, ""), type: "CNAME", ttl: 60, values: [r.value] }, true); if (!x.errors) made++; });
    flash(miss.length ? "bad" : "ok", miss.length ? "ไม่พบ hosted zone ที่ครอบ " + miss.join(", ") + " (ต้องสร้าง zone ใน Route 53 ก่อน หรือใส่ CNAME ที่ผู้ให้บริการ DNS เอง)" : "สร้าง CNAME " + made + " record ใน Route 53 แล้ว · ACM ตรวจพบแล้วเปลี่ยนเป็น Issued"); render();
  } }), h("p", { cls: "hint", text: "ชื่อในโดเมนเดียวกัน (เช่น www กับ dev) ใช้ CNAME คนละตัว · ของจริง Issued ภายใน ~5-30 นาทีหลัง DNS ถูกต้อง (ตัวจำลองทันที)" }), tbl(["Domain", "Status", "CNAME name", "CNAME value"], rows, "")]);
}]];

// ---------- ตัวอย่างสำเร็จรูป: จัดหมวดหมู่ + ป้าย ปกติ / เคส error ----------
var SCEN_ERR = ["noassoc", "wrongip", "ans-sg", "ans-nonat", "ans-noegress", "managed-badrole", "managed-nonat", "static-403", "static-cert", "static-cert-pending", "static-stale", "ecs-pull", "ecs-image", "ecs-role", "ecs-db", "ecs-health", "ecs-vpce-s3", "ecs-vpce-logs", "sls-perm", "sls-invoke", "sls-route", "sls-table", "cd-conn", "cd-docker", "cd-ecr", "cd-deploy", "cd-pass", "gha-perm", "gha-provider", "gha-sub", "gha-ecr", "gha-deploy", "gha-pass", "gha-immutable", "single-sg", "single-noup", "single-eip", "single-dns", "apr-role", "apr-tag", "apr-port", "apr-health"];
var SCEN_CATS = [
  { t: "① Terraform พื้นฐาน + VM (lab หลัก)", c: "#0972d3", d: "VPC 3 AZ, EC2, ALB, ECR", re: /^(full|noassoc|wrongip|ecr)$/ },
  { t: "② ตั้งค่าเครื่องด้วย Ansible", c: "#8456ce", d: "inventory ผ่าน bastion, site.yml", re: /^ans/ },
  { t: "③ ปล่อยจริง Jenkins → ArgoCD", c: "#c0392b", d: "git push → build → ArgoCD → เปิดเว็บ", re: /^ready$/ },
  { t: "④ Managed: EKS + RDS + SSM", c: "#0f9d8a", d: "แบบที่ทีมจริงใช้: ไม่มี bastion/Galera/k3s ให้ดูแล", re: /^managed/ },
  { t: "⑤ Use case 1 · เว็บ static: S3 + CloudFront + Route 53 + ACM (dev + prd)", c: "#e8590c", d: "นิยมที่สุด · ถูก · ไม่มีเซิร์ฟเวอร์ให้ดูแล", re: /^static/ },
  { t: "⑥ Use case 2 · ECS Fargate + ALB + ECR + RDS (dev + prd)", c: "#d9480f", d: "คอนเทนเนอร์ไม่ต้องดูแล k8s · แบบที่ทีมเล็กนิยม", re: /^ecs/ },
  { t: "⑦ Use case 3 · Serverless API: API Gateway + Lambda + DynamoDB (dev + prd)", c: "#7d4acf", d: "ไม่มีเซิร์ฟเวอร์เลย · จ่ายตามคำขอ · นิยมกับ API เล็ก-กลางและ event", re: /^sls/ },
  { t: "⑧ Use case 4 · CI/CD: CodePipeline + CodeBuild → ECR → ECS dev → prd", c: "#2e7d32", d: "ปล่อยของอัตโนมัติ: push โค้ด → build → dev → คนอนุมัติ → prd", re: /^cd/ },
  { t: "⑨ Use case 5 · GitHub Actions + OIDC → ECR → ECS (CI/CD ที่นิยมที่สุด)", c: "#24292f", d: "ไม่มี access key ถาวร · dev อัตโนมัติ · prd ต้องมีคนอนุมัติ", re: /^gha/ },
  { t: "⑩ Use case 6 · เครื่องเดียว: EC2 + Docker Compose + Caddy (แบบที่ทีมเล็กนิยม)", c: "#8c4fff", d: "ง่ายสุด ถูกสุด · ดูแลเครื่องเอง (patch, backup) · ไม่ scale อัตโนมัติ", re: /^single/ },
  { t: "⑪ Use case 7 · App Runner (PaaS · ⚠️ ปิดรับลูกค้าใหม่แล้ว)", c: "#c2185b", d: "ไว้เข้าใจแนวคิด/อ่านระบบเก่า · โปรเจกต์ใหม่ใช้ ECS Express Mode", re: /^apr/ }
];
function scenGroups(cb, sc, card) {
  cb.appendChild(h("div", { style: "display:flex;gap:8px;margin:0 0 6px" }, [foldBar()]));
  SCEN_CATS.forEach(function (g, gi) {
    var items = sc.filter(function (s) { return g.re.test(s[0]); }); if (!items.length) return;
    var bad = items.filter(function (s) { return SCEN_ERR.indexOf(s[0]) >= 0; }).length, key = "scen" + gi;
    if (FOLD[key] === undefined) FOLD[key] = 1;
    var f = fold(key, h("span", { style: "color:" + g.c }, [g.t, h("span", { style: "font-weight:400;font-size:.8rem;margin-left:10px;color:var(--muted,#5f6b7a)", text: items.length + " แบบ" + (bad ? " · เคส error " + bad : "") + " · " + g.d })]));
    f.style.borderLeft = "5px solid " + g.c; f.style.paddingLeft = "10px";
    f.appendChild(h("div", { cls: "scen", style: "margin-top:8px" }, items.map(function (s) {
      var bd = SCEN_ERR.indexOf(s[0]) >= 0, el = card(s);
      el.style.borderLeft = "4px solid " + (bd ? "#c62828" : "#1d8102");
      el.insertBefore(h("span", { style: "flex:none;align-self:flex-start;font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:999px;color:#fff;background:" + (bd ? "#c62828" : "#1d8102"), text: bd ? "เคส error" : "ปกติ" }), el.firstChild);
      return el;
    })));
    cb.appendChild(f);
  });
}
// ---------- Browser: เว็บที่ผ่าน CloudFront ----------
function wbCloudFront(r) {
  var q = r.req, card = h("div", { cls: "card" }), cb = h("div", { cls: "cb" }), steps = [], dpl = S.cfds.filter(function (d) { return d.domain === r.host || d.aliases.indexOf(r.host) >= 0; })[0]; if (dpl && cfPhase(dpl) !== "Deployed") cb.appendChild(h("div", { cls: "alert info", text: "ⓘ distribution นี้ยัง Deploying (โหมดเหมือนจริง): การตั้งค่าใหม่ยังไม่ถึงทุก edge บาง request อาจยังได้ผลแบบเดิม" }));
  var dns = q.dns; if (dns) steps.push({ ok: dns.kind === "cloudfront", t: "DNS: " + r.host + " → CloudFront", d: dns.kind === "cloudfront" ? dns.chain.join(" ") : dns.why || "ไม่พบ" });
  if (q.err) {
    var cert = /CERT/.test(q.err);
    cb.appendChild(h("h2", { text: cert ? "Your connection is not private" : "This site can’t be reached" })); cb.appendChild(h("p", { text: cert ? "Attackers might be trying to steal your information from " + r.host + "." : r.host + "’s server IP address could not be found." })); cb.appendChild(h("pre", { cls: "term", text: q.err }));
    if (cert) steps.push({ ok: false, t: "ใบรับรอง HTTPS ครอบชื่อ " + r.host, d: q.notes[0] });
  } else {
    var d = q.dist; if (d) { steps.push({ ok: true, t: "CloudFront distribution " + d.id, d: d.domain + (d.aliases.length ? " · alias: " + d.aliases.join(", ") : "") }); }
    if (r.hops && r.hops.length) steps.push({ ok: true, t: "Redirect HTTP → HTTPS (viewer protocol policy)", d: r.hops.join(" → ") });
    var cc = q.headers && q.headers["x-cache"]; steps.push({ ok: q.status === 200, t: "X-Cache: " + (cc || "-") + " · HTTP " + q.status, d: (q.notes || []).join(" · ") || "-" });
    if (q.status === 200 && /html/.test(q.type || "")) { cb.appendChild(h("div", { cls: "bwin" }, [h("iframe", { sandbox: "", srcdoc: q.body, style: "width:100%;height:150px;border:0;background:#fff;border-radius:6px" })])); }
    else { cb.appendChild(h("h2", { text: q.status + " " + (q.status === 403 ? "Forbidden" : q.status === 404 ? "Not Found" : "") })); cb.appendChild(h("pre", { cls: "term", text: q.body || "" })); }
    var hd = q.headers ? Object.keys(q.headers).map(function (k) { return k + ": " + q.headers[k]; }).join("\n") : ""; if (hd) cb.appendChild(h("pre", { cls: "term", text: "HTTP/2 " + q.status + "\n" + hd }));
    cb.appendChild(h("div", { style: "display:flex;gap:8px;margin:8px 0" }, [h("button", { cls: "btn", type: "button", text: "Refresh (F5)", onclick: function () { wbGo(W.addr); } }), h("button", { cls: "btn", type: "button", text: "Hard refresh (Ctrl+Shift+R)", onclick: function () { wbGo(W.addr); flash("ok", "Hard refresh ล้างแคชของเบราว์เซอร์เท่านั้น · CloudFront ยังตอบจาก edge cache (ดู X-Cache) ต้อง Create invalidation"); } })]));
  }
  cb.appendChild(h("h4", { text: "ทำไมได้ผลนี้ (ไล่ตามทางจริง)" })); cb.appendChild(stSteps(steps)); card.appendChild(cb); return card;
}
["buckets", "cfds", "oacs", "zones"].forEach(function (k) { PAGES[k] = function () { return listPage(LISTS[k]()); }; });
