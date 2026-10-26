// ===== Use case 1 (เว็บ static): สร้าง lab ผ่าน API เหมือนกดใน console, ตัวตรวจ, ลบ, HCL, คำสั่ง shell =====
var ST_ACCT = ACCOUNT, ST_DOMAIN = "pharmacy.example.com";
function stBucketName(env) { return "pharmacy-web-" + env + "-" + ST_ACCT; }
function stHost(env) { return env === "prd" ? "www." + ST_DOMAIN : "dev." + ST_DOMAIN; }
function stPolicyFor(bucket, distId) { return JSON.stringify({ Version: "2012-10-17", Statement: [{ Sid: "AllowCloudFrontServicePrincipalReadOnly", Effect: "Allow", Principal: { Service: "cloudfront.amazonaws.com" }, Action: "s3:GetObject", Resource: "arn:aws:s3:::" + bucket + "/*", Condition: { StringEquals: { "AWS:SourceArn": "arn:aws:cloudfront::" + ST_ACCT + ":distribution/" + distId } } }] }, null, 2); }
function isStaticLab() { return S.buckets.length > 0 || S.cfds.length > 0 || S.zones.length > 0; }
function stPage(env, v, brand) { return "<h1>" + (brand || "pharmacy") + " " + env.toUpperCase() + "</h1><p>version " + v + "</p>"; }

function buildStatic(kind) {
  fresh();
  function ok(r) { if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.res; }
  var zone = ok(API.createZone({ name: ST_DOMAIN })), certRegion = kind === "static-cert" ? REGION : "us-east-1";
  var cert = ok(API.requestCert({ domain: stHost("prd"), sans: [stHost("dev")], region: certRegion }));
  if (kind !== "static-cert-pending") cert.records.forEach(function (r) { ok(API.putRecord(zone.id, { name: r.name.replace(/\.$/, ""), type: "CNAME", ttl: 60, values: [r.value] })); });
  var oac = ok(API.createOac({ name: "pharmacy-web-oac", desc: "CloudFront reads private S3 buckets", type: "s3", signing: "always" }));
  var base = kind === "static-base", noCert = kind === "static-cert" || kind === "static-cert-pending";
  ["dev", "prd"].forEach(function (env) {
    if (base) return;
    var bn = stBucketName(env); ok(API.createBucket({ name: bn, region: REGION })); ok(API.putObject(bn, { key: "index.html", body: stPage(env, kind === "static-stale" ? 2 : 1), type: "text/html" }));
  });
  if (!base) {
    var dists = {};
    ["dev", "prd"].forEach(function (env) {
      var bn = stBucketName(env), c = API.createCfd({ comment: "pharmacy web " + env, origins: [{ id: "s3-" + env, domain: bn + ".s3." + REGION + ".amazonaws.com", oacId: oac.id }], aliases: noCert ? [] : [stHost(env)], certArn: noCert ? "" : cert.arn, defaultRoot: "index.html", viewerProto: "redirect-to-https", priceClass: "PriceClass_100" });
      dists[env] = ok(c);
      var pol = kind === "static-403" && env === "prd" ? stPolicyFor(bn, dists.dev.id) : stPolicyFor(bn, dists[env].id);
      ok(API.putBucketPolicy(bn, pol));
      if (!noCert) ok(API.putRecord(zone.id, { name: stHost(env), type: "A", alias: dists[env].domain }));
    });
    if (kind === "static-stale") { S.cfCache = {}; cfRequest(stHost("prd"), "/", "https"); cfRequest(stHost("dev"), "/", "https"); API.putObject(stBucketName("prd"), { key: "index.html", body: stPage("prd", 3), type: "text/html" }); }
    if (kind === "static") { cfRequest(stHost("prd"), "/", "https"); }
  }
  if (!S.laptop.creds) { var tu = API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, tk = API.createAccessKey(tu.id, "CLI", ""); S.laptop.creds = { id: tk.res.id, secretHash: hash32(tk.secret), region: "ap-southeast-1" }; S.laptop.awsRegion = "ap-southeast-1"; }
  S.staticKind = kind;
}

function checksStatic() {
  var out = []; function add(ok, label, hint) { out.push({ ok: !!ok, label: label, hint: hint || "" }); }
  var zone = S.zones.filter(function (z) { return z.name === ST_DOMAIN; })[0], oac = byName(S.oacs, "pharmacy-web-oac");
  var cert = S.certs.filter(function (c) { return c.names.indexOf(stHost("prd")) >= 0; })[0];
  add(zone, "Route 53 hosted zone " + ST_DOMAIN, "Route 53 › Hosted zones › Create hosted zone");
  add(cert && cert.region === "us-east-1", "ใบรับรอง ACM ของ " + stHost("prd") + " อยู่ region us-east-1 (CloudFront ใช้ได้แค่ที่นี่)", "ACM › Request certificate (เปลี่ยน region เป็น us-east-1 ก่อน)");
  add(cert && certCovers(cert, stHost("dev")), "ใบรับรองครอบทั้ง " + stHost("prd") + " และ " + stHost("dev"), "ใส่ชื่อที่ 2 ตอน Request certificate");
  add(cert && acmStatus(cert) === "ISSUED", "ใบรับรองสถานะ Issued (สร้าง CNAME ตรวจสอบใน Route 53 แล้ว)", "ACM › เลือกใบรับรอง › Create records in Route 53");
  add(oac && oac.signing === "always" && oac.type === "s3", "Origin access control: Sign requests, origin type S3", "CloudFront › Origin access › Create control setting");
  ["dev", "prd"].forEach(function (env) {
    var b = bucketByName(stBucketName(env)), d = S.cfds.filter(function (x) { return x.aliases.indexOf(stHost(env)) >= 0; })[0];
    add(b && b.block.policy && b.block.acls && b.block.ignore && b.block.restrict, "S3 " + stBucketName(env) + " เป็น bucket ส่วนตัว (Block all public access)", "S3 › Create bucket (ปล่อย Block all public access เปิดไว้)");
    add(b && b.objects.some(function (o) { return o.key === "index.html"; }), env + ": มี index.html ใน bucket", "S3 › bucket › Upload");
    add(d && d.origins[0] && d.origins[0].oacId && cfOriginBucket(d.origins[0]) === b, env + ": CloudFront origin ชี้ bucket นี้และผูก OAC", "CloudFront › Create distribution › S3 origin + OAC");
    add(d && d.defaultRoot === "index.html" && d.viewerProto === "redirect-to-https", env + ": Default root object = index.html และ redirect HTTP → HTTPS", "CloudFront › Settings / Behaviors");
    add(d && b && s3Allows(b, "index.html", { service: "cloudfront.amazonaws.com", sourceArn: cfdArn(d) }).ok, env + ": bucket policy อนุญาตเฉพาะ distribution นี้ (OAC + AWS:SourceArn)", "S3 › bucket › Permissions › Bucket policy");
    var rec = zone && zone.records.filter(function (r) { return r.name === stHost(env) + "." && r.type === "A"; })[0];
    add(rec && d && rec.alias === d.domain, env + ": Route 53 A (alias) " + stHost(env) + " → CloudFront", "Route 53 › Create record › Alias to CloudFront distribution");
    var q = cfRequest(stHost(env), "/", "https");
    add(q.status === 200, env + ": เปิด https://" + stHost(env) + " ได้ (200)", "Browser › เปิด URL แล้วดูข้อ ✗ ที่ติด");
  });
  return out;
}

// ---------- ลบจาก console ----------
function stDelPlan(kind, id, P) {
  if (kind === "bucket") {
    var b = bucketByName(id); if (!b) return false;
    P.title = "Delete bucket " + b.name; P.crumb = "Amazon S3 › Buckets › Delete bucket"; P.word = "permanently delete"; P.done = "ลบ bucket แล้ว"; P.note = "ต้อง Empty bucket ก่อน (S3 ไม่ให้ลบ bucket ที่ยังมีไฟล์) · ชื่อ bucket ที่ลบแล้วคนอื่นอาจจองไปได้";
    if (b.objects.length) P.blockers.push("bucket ยังมี " + b.objects.length + " ไฟล์ ต้อง Empty bucket ก่อน (Actions › Empty)");
  } else if (kind === "cfd") {
    var d = S.cfds.filter(function (x) { return x.id === id; })[0]; if (!d) return false;
    P.title = "Delete distribution " + d.id; P.crumb = "CloudFront › Distributions › Delete"; P.word = "delete"; P.done = "ลบ distribution แล้ว"; P.note = "ลบ distribution ได้เมื่อ Disabled และ Deployed แล้วเท่านั้น (ใช้เวลาหลายนาทีในของจริง)";
    if (d.enabled) P.blockers.push("distribution ยัง Enabled ต้อง Disable ก่อน (Actions › Disable)");
  } else if (kind === "zone") {
    var z = S.zones.filter(function (x) { return x.id === id; })[0]; if (!z) return false;
    P.title = "Delete hosted zone " + z.name; P.crumb = "Route 53 › Hosted zones › Delete"; P.word = "delete"; P.done = "ลบ hosted zone แล้ว";
    z.records.filter(function (r) { return r.type !== "NS" && r.type !== "SOA"; }).forEach(function (r) { P.blockers.push("ต้องลบ record " + r.type + " " + r.name + " ก่อน"); });
  } else if (kind === "cert") {
    var c = S.certs.filter(function (x) { return x.arn === id; })[0]; if (!c) return false;
    P.title = "Delete certificate " + c.names[0]; P.crumb = "ACM › Certificates › Delete"; P.word = "delete"; P.done = "ลบใบรับรองแล้ว";
    S.cfds.filter(function (d2) { return d2.certArn === c.arn; }).forEach(function (d2) { P.blockers.push("ใช้อยู่กับ CloudFront " + d2.id + " ต้องถอดออกก่อน"); });
  } else if (kind === "oac") {
    var o = S.oacs.filter(function (x) { return x.id === id; })[0]; if (!o) return false;
    P.title = "Delete OAC " + o.name; P.crumb = "CloudFront › Origin access › Delete"; P.word = "delete"; P.done = "ลบ OAC แล้ว";
    S.cfds.filter(function (d3) { return d3.origins.some(function (g) { return g.oacId === o.id; }); }).forEach(function (d3) { P.blockers.push("ใช้อยู่กับ distribution " + d3.id); });
  } else return false;
  return true;
}
function stDelDo(kind, id) {
  if (kind === "bucket") return API.deleteBucket(id, false);
  if (kind === "cfd") { var r = API.deleteCfd(id); return r; }
  if (kind === "zone") return API.deleteZone(id);
  if (kind === "cert") return API.deleteCert(id);
  if (kind === "oac") { S.oacs = S.oacs.filter(function (o) { return o.id !== id; }); return { res: true }; }
  return { res: true };
}

// ---------- HCL จากของที่กดใน console ----------
function stHcl(o, ref) {
  var q = function (a) { return a.map(function (x) { return '"' + x + '"'; }).join(", "); }, sl = function (x) { return slug(x); };
  S.zones.forEach(function (z) { o.push(hcm("zone", z.name) + 'resource "aws_route53_zone" "' + sl(z.name) + '" {\n  name = "' + z.name + '"\n}'); });
  S.certs.forEach(function (c) {
    o.push(hcm("cert", c.names[0]) + 'resource "aws_acm_certificate" "' + sl(c.names[0]) + '" {\n' + (c.region !== REGION ? "  provider = aws.use1   # ใบรับรองของ CloudFront ต้องอยู่ us-east-1\n" : "") + '  domain_name               = "' + c.names[0] + '"\n  subject_alternative_names = [' + q(c.names.slice(1)) + '] \n  validation_method         = "DNS"\n}');
    c.records.forEach(function (r) { o.push(hcm("certrec", r.name) + 'resource "aws_route53_record" "' + sl("validation_" + r.name) + '" {\n  # CNAME ที่ ACM บอกให้สร้าง (aws_acm_certificate.' + sl(c.names[0]) + '.domain_validation_options)\n  zone_id = aws_route53_zone.<โซนของโดเมน>.zone_id\n  name    = "' + r.name + '"\n  type    = "CNAME"\n  ttl     = 60\n  records = ["' + r.value + '"]\n}'); });
    o.push(hcm("certval", c.names[0]) + 'resource "aws_acm_certificate_validation" "' + sl(c.names[0]) + '" {\n' + (c.region !== REGION ? "  provider = aws.use1\n" : "") + "  certificate_arn = aws_acm_certificate." + sl(c.names[0]) + ".arn\n  # รอจน Issued ก่อนให้ CloudFront ใช้\n}");
  });
  S.oacs.forEach(function (a) { o.push(hcm("oac", a.name) + 'resource "aws_cloudfront_origin_access_control" "' + sl(a.name) + '" {\n  name                              = "' + a.name + '"\n  origin_access_control_origin_type = "' + a.type + '"\n  signing_behavior                  = "' + a.signing + '"\n  signing_protocol                  = "sigv4"\n}'); });
  S.buckets.forEach(function (b) {
    o.push(hcm("s3", b.name) + 'resource "aws_s3_bucket" "' + sl(b.name) + '" {\n  bucket = "' + b.name + '"\n}');
    o.push(hcm("pab", b.name) + 'resource "aws_s3_bucket_public_access_block" "' + sl(b.name) + '" {\n  bucket                  = aws_s3_bucket.' + sl(b.name) + '.id\n  block_public_acls       = ' + b.block.acls + "\n  block_public_policy     = " + b.block.policy + "\n  ignore_public_acls      = " + b.block.ignore + "\n  restrict_public_buckets = " + b.block.restrict + "\n}");
    b.objects.forEach(function (x) { o.push(hcm("obj", b.name + "/" + x.key) + 'resource "aws_s3_object" "' + sl(b.name + "_" + x.key) + '" {\n  bucket       = aws_s3_bucket.' + sl(b.name) + '.id\n  key          = "' + x.key + '"\n  content      = "' + x.body.replace(/"/g, '\\"') + '"\n  content_type = "' + x.type + '"\n}'); });
  });
  S.cfds.forEach(function (d) {
    var og = d.origins[0] || {}, bk = cfOriginBucket(og), oa = S.oacs.filter(function (a) { return a.id === og.oacId; })[0], ct = S.certs.filter(function (c) { return c.arn === d.certArn; })[0];
    o.push(hcm("cfd", d.comment || d.id) + 'resource "aws_cloudfront_distribution" "' + sl(d.comment || d.id) + '" {\n  enabled             = ' + d.enabled + '\n  comment             = "' + d.comment + '"\n  default_root_object = "' + d.defaultRoot + '"\n  aliases             = [' + q(d.aliases) + ']\n  price_class         = "' + d.priceClass + '"\n\n  origin {\n    domain_name              = ' + (bk ? "aws_s3_bucket." + sl(bk.name) + ".bucket_regional_domain_name" : '"' + og.domain + '"') + '\n    origin_id                = "' + og.id + '"\n' + (oa ? "    origin_access_control_id = aws_cloudfront_origin_access_control." + sl(oa.name) + ".id\n" : "    # ไม่มี OAC: CloudFront ส่งคำขอแบบไม่เซ็น → S3 ส่วนตัวตอบ 403\n") + '  }\n\n  default_cache_behavior {\n    target_origin_id       = "' + og.id + '"\n    viewer_protocol_policy = "' + d.viewerProto + '"\n    allowed_methods        = ["GET", "HEAD"]\n    cached_methods         = ["GET", "HEAD"]\n    cache_policy_id        = "' + d.cachePolicy + '"   # ' + (CF_MANAGED_CACHE[d.cachePolicy] || "custom") + '\n  }\n' + d.errorPages.map(function (e) { return '\n  custom_error_response {\n    error_code         = ' + e.code + '\n    response_code      = ' + (e.respCode || 200) + '\n    response_page_path = "' + e.page + '"\n  }\n'; }).join("") + '\n  restrictions {\n    geo_restriction {\n      restriction_type = "none"\n    }\n  }\n\n  viewer_certificate {\n' + (ct ? "    acm_certificate_arn      = aws_acm_certificate_validation." + sl(ct.names[0]) + ".certificate_arn\n    ssl_support_method       = \"sni-only\"\n    minimum_protocol_version = \"TLSv1.2_2021\"\n" : "    cloudfront_default_certificate = true\n") + "  }\n}");
  });
  S.buckets.forEach(function (b) { if (b.policy) { var m = /distribution\/([A-Z0-9]+)/.exec(b.policy), dd = m && S.cfds.filter(function (x) { return x.id === m[1]; })[0]; o.push(hcm("s3pol", b.name) + 'resource "aws_s3_bucket_policy" "' + sl(b.name) + '" {\n  bucket = aws_s3_bucket.' + sl(b.name) + '.id\n  policy = data.aws_iam_policy_document.' + sl(b.name) + '.json   # Principal = cloudfront.amazonaws.com + AWS:SourceArn = ' + (dd ? "aws_cloudfront_distribution." + sl(dd.comment || dd.id) + ".arn" : "arn ของ distribution") + "\n}"); } });
  S.zones.forEach(function (z) { z.records.filter(function (r) { return r.alias; }).forEach(function (r) { var dd = S.cfds.filter(function (x) { return x.domain === r.alias; })[0]; o.push(hcm("r53", r.name) + 'resource "aws_route53_record" "' + sl(r.name) + '" {\n  zone_id = aws_route53_zone.' + sl(z.name) + '.zone_id\n  name    = "' + r.name.replace(/\.$/, "") + '"\n  type    = "A"\n\n  alias {\n    name                   = ' + (dd ? "aws_cloudfront_distribution." + sl(dd.comment || dd.id) + ".domain_name" : '"' + r.alias + '"') + '\n    zone_id                = ' + (dd ? "aws_cloudfront_distribution." + sl(dd.comment || dd.id) + ".hosted_zone_id" : '"Z2FDTNDATAQYW2"') + "\n    evaluate_target_health = false\n  }\n}"); }); });
}

// ---------- คำสั่ง aws ของ use case นี้ + dig ----------
function shAwsStatic(a, w, need) {
  var op = a[0] + " " + a[1];
  function arg(n) { var i = a.indexOf(n); return i >= 0 ? a[i + 1] : ""; }
  if (a[0] === "s3" && a[1] === "ls") return need("s3:ListBucket", "ListBuckets", function () {
    var t = a[2] ? a[2].replace(/^s3:\/\//, "") : "";
    if (!t) return S.buckets.map(function (b) { return new Date(b.born).toISOString().slice(0, 19).replace("T", " ") + " " + b.name; }).concat(S.buckets.length ? [] : ["(ไม่มี bucket)"]);
    var nm = t.split("/")[0], b = bucketByName(nm); if (!b) return ["", "An error occurred (NoSuchBucket) when calling the ListObjectsV2 operation: The specified bucket does not exist"];
    return b.objects.map(function (o) { return new Date(o.mod).toISOString().slice(0, 19).replace("T", " ") + " " + String(o.size).padStart(10) + " " + o.key; });
  });
  if (a[0] === "s3" && (a[1] === "sync" || a[1] === "cp")) return need("s3:PutObject", "PutObject", function () {
    var tgt = a[a.length - 1].replace(/^s3:\/\//, ""), nm = tgt.split("/")[0], b = bucketByName(nm); if (!b) return ["", "upload failed: An error occurred (NoSuchBucket) when calling the PutObject operation: The specified bucket does not exist"];
    var src = a[2]; if (/^s3:/.test(src)) return ["(จำลอง: คัดลอกระหว่าง bucket ยังไม่รองรับ)"];
    var sp = normPath(src), files = fsList(sp).filter(function (e) { return !e.dir; }), out = [];
    if (a[1] === "cp") { var one = fsRead(sp); if (one === null || one === undefined) return ["The user-provided path " + src + " does not exist."]; var key = tgt.indexOf("/") > 0 ? tgt.slice(nm.length + 1) : sp.split("/").pop(); API.putObject(nm, { key: key, body: one, type: /\.html$/.test(key) ? "text/html" : "text/plain" }); return ["upload: " + src + " to s3://" + nm + "/" + key]; }
    if (!files.length) return ["(โฟลเดอร์ " + src + " ว่าง หรือไม่มีอยู่ · สร้างไฟล์ด้วย echo '<h1>v2</h1>' > dist/index.html)"];
    files.forEach(function (f) { var body = fsRead(sp + "/" + f.name); API.putObject(nm, { key: f.name, body: body, type: /\.html$/.test(f.name) ? "text/html" : "text/plain" }); out.push("upload: " + src.replace(/\/$/, "") + "/" + f.name + " to s3://" + nm + "/" + f.name); });
    if (a.indexOf("--delete") >= 0) b.objects.filter(function (o) { return !files.some(function (f) { return f.name === o.key; }); }).forEach(function (o) { API.deleteObject(nm, o.key); out.push("delete: s3://" + nm + "/" + o.key); });
    return out;
  });
  if (op === "cloudfront create-invalidation") return need("cloudfront:CreateInvalidation", "CreateInvalidation", function () {
    var id = arg("--distribution-id"), pi = a.indexOf("--paths"), paths = pi >= 0 ? a.slice(pi + 1).filter(function (x) { return x.indexOf("--") !== 0; }) : [];
    var r = API.createInvalidation(id, paths); if (r.errors) return ["", "An error occurred (" + String(r.errors[Object.keys(r.errors)[0]]).replace(": ", ") when calling the CreateInvalidation operation: ")];
    return ["{", '    "Location": "https://cloudfront.amazonaws.com/2020-05-31/distribution/' + id + "/invalidation/" + r.res.id + '",', '    "Invalidation": { "Id": "' + r.res.id + '", "Status": "InProgress", "InvalidationBatch": { "Paths": { "Quantity": ' + paths.length + ' } } }', "}"];
  });
  if (op === "cloudfront list-distributions") return need("cloudfront:ListDistributions", "ListDistributions", function () { return ["{", '    "DistributionList": { "Items": [', S.cfds.map(function (d) { return '        { "Id": "' + d.id + '", "DomainName": "' + d.domain + '", "Aliases": [' + d.aliases.map(function (x) { return '"' + x + '"'; }).join(", ") + '], "Status": "Deployed", "Enabled": ' + d.enabled + " }"; }).join(",\n"), "    ] }", "}"]; });
  if (op === "route53 list-hosted-zones") return need("route53:ListHostedZones", "ListHostedZones", function () { return ["{", '    "HostedZones": [', S.zones.map(function (z) { return '        { "Id": "/hostedzone/' + z.id + '", "Name": "' + z.name + '.", "ResourceRecordSetCount": ' + z.records.length + " }"; }).join(",\n"), "    ]", "}"]; });
  if (op === "acm list-certificates") return need("acm:ListCertificates", "ListCertificates", function () { var rg = arg("--region") || (S.laptop.awsRegion || REGION); return ["{", '    "CertificateSummaryList": [', S.certs.filter(function (c) { return c.region === rg; }).map(function (c) { return '        { "CertificateArn": "' + c.arn + '", "DomainName": "' + c.names[0] + '", "Status": "' + acmStatus(c) + '" }'; }).join(",\n"), "    ]", "}"].concat(rg === REGION && S.certs.some(function (c) { return c.region === "us-east-1"; }) ? ["(ใบรับรองของ CloudFront อยู่ us-east-1 · ลอง --region us-east-1)"] : []); });
  return null;
}
function shDig(a) {
  var host = a.filter(function (x) { return x[0] !== "-" && x !== "dig" && x !== "nslookup" && x !== "A"; })[0];
  if (!host) return { lines: ["usage: dig <hostname>"] };
  var r = dnsResolve(host);
  if (r.kind === "nxdomain") return { lines: ["; <<>> DiG 9.18 <<>> " + host, ";; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN", ";; ANSWER SECTION: (ว่าง)", "", "(จำลอง: " + r.why + ")"] };
  if (r.kind === "cloudfront") return { lines: ["; <<>> DiG 9.18 <<>> " + host, ";; ->>HEADER<<- opcode: QUERY, status: NOERROR", ";; ANSWER SECTION:", host + ".  60  IN  A  13.32.121." + (1 + hash32(r.dist.id).charCodeAt(0) % 200) + "   ; ALIAS → " + r.dist.domain, host + ".  60  IN  A  13.32.121." + (2 + hash32(r.dist.id).charCodeAt(1) % 200), "", "(IP ของ CloudFront edge จำลอง · " + r.chain[0] + ")"] };
  return { lines: ["; <<>> DiG 9.18 <<>> " + host, ";; ANSWER SECTION:", r.chain[0]] };
}
