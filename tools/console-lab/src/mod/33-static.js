// ===== Use case 1: เว็บ static บน S3 + CloudFront + Route 53 + ACM (state + API + จำลองคำขอ + Terraform provider) =====
// กติกาที่จำลองมาจากเอกสาร AWS (OAC, ใบรับรอง us-east-1, cache) · ข้อความ error ที่ระบุว่าจำจากเอกสารอาจไม่ตรงทุกตัวอักษร
var S3_TAKEN = ["test", "my-bucket", "pharmacy", "cafe", "www", "website", "mybucket", "static-site"];
var CF_MANAGED_CACHE = { "658327ea-f89d-4fab-a63d-7e88639e58f6": "Managed-CachingOptimized", "4135ea2d-6df8-44a3-9df3-4b5a84be39ad": "Managed-CachingDisabled" };
function stHex(n) { return fakeId("", n, "0123456789abcdef"); }
function stAlnum(n, up) { return fakeId("", n, up ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" : "abcdefghijklmnopqrstuvwxyz0123456789"); }
function stStamp() { var d = new Date(); return d.toISOString().replace(/\.\d+Z$/, "Z"); }
function s3Name(n) {
  n = String(n || "");
  if (!n) return "ต้องกรอกชื่อ bucket";
  if (n.length < 3 || n.length > 63) return "Bucket name must be between 3 and 63 characters long.";
  if (!/^[a-z0-9.-]+$/.test(n)) return "Bucket name can consist only of lowercase letters, numbers, dots (.), and hyphens (-).";
  if (!/^[a-z0-9].*[a-z0-9]$/.test(n)) return "Bucket name must begin and end with a letter or number.";
  if (/\.\./.test(n)) return "Bucket name must not contain two adjacent periods.";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(n)) return "Bucket name must not be formatted as an IP address (for example, 192.168.5.4).";
  if (/^(xn--|sthree-|amzn-s3-demo-)/.test(n) || /(-s3alias|--ol-s3)$/.test(n)) return "Bucket name must not start with xn--, sthree-, amzn-s3-demo- or end with -s3alias, --ol-s3.";
  return "";
}
function bucketByName(n) { return S.buckets.filter(function (b) { return b.name === n; })[0] || null; }
function certCovers(cert, host) { return cert.names.some(function (n) { return n === host || (n.indexOf("*.") === 0 && host.indexOf(".") > 0 && host.slice(host.indexOf(".") + 1) === n.slice(2)); }); }

// ---------- S3 ----------
API.createBucket = function (o) {
  var er = {}, m = s3Name(o.name);
  if (m) er.name = m; else if (S3_TAKEN.indexOf(o.name) >= 0 || bucketByName(o.name)) er.name = "BucketAlreadyExists: Bucket with this name already exists (ชื่อ bucket ต้องไม่ซ้ำกันทั้งโลก ทุก account · ลองเติม account id หรือชื่อโปรเจกต์)";
  if (!o.region) er.region = "ต้องเลือก region";
  if (Object.keys(er).length) return { errors: er };
  var b = { id: o.name, name: o.name, region: o.region, versioning: !!o.versioning, block: o.block || { acls: true, policy: true, ignore: true, restrict: true }, policy: "", objects: [], ownership: "BucketOwnerEnforced", forceDestroy: !!o.forceDestroy, born: Date.now(), tagMap: {} };
  S.buckets.push(b); return { res: b };
};
API.putObject = function (bucket, o) {
  var b = bucketByName(bucket); if (!b) return E("_", "NoSuchBucket: The specified bucket does not exist");
  var key = String(o.key || "").replace(/^\/+/, ""); if (!key) return E("key", "ต้องระบุชื่อไฟล์ (key)");
  var body = String(o.body == null ? "" : o.body), x = b.objects.filter(function (q) { return q.key === key; })[0], etag = hash32(body + key);
  if (x) { x.body = body; x.etag = etag; x.size = body.length; x.type = o.type || x.type; x.mod = Date.now(); } else b.objects.push({ key: key, body: body, etag: etag, size: body.length, type: o.type || "text/html", mod: Date.now() });
  return { res: b };
};
API.deleteObject = function (bucket, key) { var b = bucketByName(bucket); if (b) b.objects = b.objects.filter(function (x) { return x.key !== key; }); return { res: true }; };
API.putBucketPolicy = function (name, text) {
  var b = bucketByName(name); if (!b) return E("_", "NoSuchBucket: The specified bucket does not exist");
  var j; try { j = JSON.parse(text); } catch (e) { return E("policy", "MalformedPolicy: Policy has invalid JSON (" + e.message + ")"); }
  var st = [].concat(j.Statement || []); if (!st.length) return E("policy", "MalformedPolicy: Missing required field Statement");
  for (var i = 0; i < st.length; i++) {
    var s = st[i], rs = [].concat(s.Resource || []);
    if (!s.Effect || !s.Action || !s.Principal) return E("policy", "MalformedPolicy: Missing required field Effect/Action/Principal in statement " + (i + 1));
    if (!rs.length || rs.some(function (r) { return String(r).indexOf("arn:aws:s3:::" + name) !== 0; })) return E("policy", "MalformedPolicy: Policy has invalid resource (ต้องขึ้นต้นด้วย arn:aws:s3:::" + name + ")");
    var pr = s.Principal === "*" || (s.Principal && s.Principal.AWS === "*");
    if (pr && s.Effect === "Allow" && !s.Condition && b.block.policy) return E("policy", "AccessDenied: User is not authorized to perform: s3:PutBucketPolicy on resource arn:aws:s3:::" + name + " because public policies are blocked by the BlockPublicPolicy block public access setting.");
  }
  b.policy = text; return { res: b };
};
API.deleteBucket = function (name, force) {
  var b = bucketByName(name); if (!b) return E("_", "NoSuchBucket: The specified bucket does not exist");
  if (b.objects.length && !force) return E("_", "BucketNotEmpty: The bucket you tried to delete is not empty (ต้องลบไฟล์ทั้งหมดก่อน หรือใน Terraform ตั้ง force_destroy = true)");
  S.buckets = S.buckets.filter(function (x) { return x !== b; }); return { res: true };
};
// S3 อนุญาตคำขอนี้ไหม: requester = { service?, sourceArn?, anonymous }
function s3Allows(b, key, req) {
  if (!b.policy) return { ok: false, why: "บัคเก็ตไม่มี bucket policy" };
  var j; try { j = JSON.parse(b.policy); } catch (e) { return { ok: false, why: "bucket policy อ่านไม่ได้" }; }
  var sts = [].concat(j.Statement || []), hit = false, why = "ไม่มี statement ที่อนุญาต s3:GetObject ให้ผู้ขอ";
  sts.forEach(function (s) {
    if (s.Effect !== "Allow") return;
    var acts = [].concat(s.Action || []).map(String), act = acts.some(function (a) { return a === "s3:GetObject" || a === "s3:*" || a === "*"; });
    var rs = [].concat(s.Resource || []).map(String), res = rs.some(function (r) { return r === "arn:aws:s3:::" + b.name + "/*" || r === "arn:aws:s3:::" + b.name + "/" + key; });
    var pr = s.Principal === "*" || (s.Principal && (s.Principal.AWS === "*" || (req.service && [].concat(s.Principal.Service || []).indexOf(req.service) >= 0)));
    if (!(act && res)) { why = "statement ไม่ครอบ s3:GetObject หรือ Resource ไม่ครอบไฟล์ (ต้องลงท้าย /*)"; return; }
    if (!pr) { why = "Principal ไม่ตรงกับผู้ขอ (ต้องเป็น Service cloudfront.amazonaws.com)"; return; }
    var cond = s.Condition || null, cok = true;
    if (cond) { var se = cond.StringEquals || cond.ArnLike || cond.ArnEquals || null; if (se && se["AWS:SourceArn"] !== undefined) cok = [].concat(se["AWS:SourceArn"]).indexOf(req.sourceArn) >= 0; }
    if (!cok) { why = "เงื่อนไข AWS:SourceArn ไม่ตรงกับ distribution นี้ (ผิด distribution ID?)"; return; }
    if (pr && !req.service && s.Principal !== "*" && !(s.Principal && s.Principal.AWS === "*")) { why = "ผู้ขอเป็น anonymous"; return; }
    hit = true;
  });
  return { ok: hit, why: hit ? "" : why };
}

// ---------- CloudFront ----------
API.createOac = function (o) {
  var er = {}, n = String(o.name || "");
  if (!n) er.name = "ต้องกรอก Name"; else if (!/^[A-Za-z0-9_-]{1,64}$/.test(n)) er.name = "InvalidArgument: ชื่อ OAC ใช้ตัวอักษร ตัวเลข - _ ไม่เกิน 64 ตัว"; else if (S.oacs.some(function (x) { return x.name === n; })) er.name = "OriginAccessControlAlreadyExists: An origin access control with the same name already exists.";
  if (["always", "never", "no-override"].indexOf(o.signing || "always") < 0) er.signing = "InvalidArgument: signing behavior";
  if (Object.keys(er).length) return { errors: er };
  var x = { id: "E" + stAlnum(13, true), name: n, desc: o.desc || "", type: o.type || "s3", signing: o.signing || "always", protocol: "sigv4" }; S.oacs.push(x); return { res: x };
};
function cfOriginBucket(org) { var m = /^(.+?)\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/.exec(org.domain || ""); return m ? bucketByName(m[1]) : null; }
API.createCfd = function (o) {
  var er = {}, aliases = (o.aliases || []).filter(Boolean), origins = (o.origins || []).filter(function (x) { return x.domain; });
  if (!origins.length) er.origins = "InvalidArgument: ต้องมีอย่างน้อย 1 origin";
  origins.forEach(function (x) { if (x.oacId && !S.oacs.some(function (a) { return a.id === x.oacId; })) er.origins = "NoSuchOriginAccessControl: The specified origin access control does not exist."; });
  aliases.forEach(function (a) { if (!/^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(a)) er.aliases = "InvalidArgument: alternate domain name ไม่ถูกต้อง: " + a; else if (S.cfds.some(function (d) { return d.aliases.indexOf(a) >= 0 && d.id !== o.id; })) er.aliases = "CNAMEAlreadyExists: One or more of the CNAMEs you provided are already associated with a different resource. (" + a + ")"; });
  if (aliases.length && !er.aliases) {
    var cert = S.certs.filter(function (c) { return c.arn === o.certArn; })[0];
    if (!o.certArn) er.cert = "InvalidViewerCertificate: To add an alternate domain name (CNAME) to a CloudFront distribution, you must attach a trusted certificate that validates your authority to use the domain name. For more details, see: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html";
    else if (!cert || cert.region !== "us-east-1" || acmStatus(cert) !== "ISSUED") er.cert = "InvalidViewerCertificate: The specified SSL certificate doesn't exist, isn't in us-east-1 region, isn't valid, or doesn't include a valid certificate chain." + (cert ? " (ใบรับรอง " + cert.names[0] + ": region " + cert.region + ", สถานะ " + acmStatus(cert) + ")" : "");
    else { var miss = aliases.filter(function (a) { return !certCovers(cert, a); }); if (miss.length) er.cert = "InvalidViewerCertificate: The certificate that is attached to your distribution doesn't cover the alternate domain name (CNAME) that you're trying to add. (" + miss.join(", ") + " ไม่อยู่ในใบรับรอง: " + cert.names.join(", ") + ")"; }
  }
  if (Object.keys(er).length) return { errors: er };
  var id = o.id || "E" + stAlnum(13, true);
  var d = { id: id, domain: "d" + stAlnum(13) + ".cloudfront.net", comment: o.comment || "", origins: origins.map(function (x, i) { return { id: x.id || ("origin-" + (i + 1)), domain: x.domain, oacId: x.oacId || "" }; }), aliases: aliases, certArn: o.certArn || "", defaultRoot: o.defaultRoot || "", viewerProto: o.viewerProto || "redirect-to-https", priceClass: o.priceClass || "PriceClass_All", enabled: o.enabled !== false, cachePolicy: o.cachePolicy || "658327ea-f89d-4fab-a63d-7e88639e58f6", errorPages: (o.errorPages || []).slice(), invalidations: [], born: Date.now(), touched: Date.now(), tagMap: {}, deployed: true };
  S.cfds.push(d); return { res: d };
};
function cfdArn(d) { return "arn:aws:cloudfront::" + ACCOUNT + ":distribution/" + d.id; }
API.updateCfd = function (id, o) {
  var d = S.cfds.filter(function (x) { return x.id === id; })[0]; if (!d) return E("_", "NoSuchDistribution: The specified distribution does not exist.");
  var probe = API.createCfd({ id: id, origins: o.origins || d.origins, aliases: o.aliases || d.aliases, certArn: o.certArn !== undefined ? o.certArn : d.certArn });
  if (probe.errors) return probe; S.cfds = S.cfds.filter(function (x) { return x !== probe.res; });
  ["origins", "aliases", "certArn", "defaultRoot", "viewerProto", "priceClass", "enabled", "errorPages", "comment", "cachePolicy"].forEach(function (k) { if (o[k] !== undefined) d[k] = o[k]; });
  d.touched = Date.now(); return { res: d };
};
API.deleteCfd = function (id) {
  var d = S.cfds.filter(function (x) { return x.id === id; })[0]; if (!d) return E("_", "NoSuchDistribution: The specified distribution does not exist.");
  if (d.enabled) return E("_", "DistributionNotDisabled: The distribution you are trying to delete has not been disabled.");
  S.cfds = S.cfds.filter(function (x) { return x !== d; }); Object.keys(S.cfCache).forEach(function (k) { if (k.indexOf(id + "|") === 0) delete S.cfCache[k]; }); return { res: true };
};
API.createInvalidation = function (id, paths) {
  var d = S.cfds.filter(function (x) { return x.id === id; })[0]; if (!d) return E("_", "NoSuchDistribution: The specified distribution does not exist.");
  var ps = (paths || []).map(function (p) { return String(p).trim(); }).filter(Boolean); if (!ps.length) return E("paths", "MissingRequiredParameter: ต้องระบุ path อย่างน้อย 1 อัน (เช่น /* หรือ /index.html)");
  var bad = ps.filter(function (p) { return p.charAt(0) !== "/"; }); if (bad.length) return E("paths", "InvalidArgument: Your request contains one or more invalid invalidation paths. (ต้องขึ้นต้นด้วย / : " + bad[0] + ")");
  ps.forEach(function (p) { var pre = p.replace(/\*$/, ""); Object.keys(S.cfCache).forEach(function (k) { if (k.indexOf(id + "|") !== 0) return; var path = k.slice(id.length + 1); if (/\*$/.test(p) ? path.indexOf(pre) === 0 : path === p) delete S.cfCache[k]; }); });
  var iv = { id: "I" + stAlnum(13, true), paths: ps, status: "Completed", at: Date.now() }; d.invalidations.unshift(iv); return { res: iv };
};

// ---------- ACM ----------
function acmStatus(c) {
  if (c.failed) return "FAILED";
  var ok = c.records.every(function (r) { return S.zones.some(function (z) { return z.records.some(function (x) { return x.type === "CNAME" && x.name.replace(/\.$/, "") === r.name.replace(/\.$/, "") && (x.values || []).map(function (v) { return v.replace(/\.$/, ""); }).indexOf(r.value.replace(/\.$/, "")) >= 0; }); }); });
  return ok ? "ISSUED" : "PENDING_VALIDATION";
}
API.requestCert = function (o) {
  var er = {}, names = [String(o.domain || "")].concat((o.sans || []).filter(Boolean));
  if (!names[0]) er.domain = "ต้องระบุ Fully qualified domain name";
  names.forEach(function (n) { if (n && !/^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(n)) er.domain = "ValidationException: โดเมนไม่ถูกต้อง: " + n + " (ใช้ตัวพิมพ์เล็ก และ wildcard ได้เฉพาะ *.example.com)"; });
  if (!o.region) er.region = "ต้องเลือก region";
  if (Object.keys(er).length) return { errors: er };
  var uniq = {}, recs = []; names.forEach(function (n) { var base = n.replace(/^\*\./, ""); if (!uniq[base]) { uniq[base] = { name: "_" + stHex(32) + "." + base + ".", value: "_" + stHex(32) + "." + stAlnum(16) + ".acm-validations.aws.", type: "CNAME" }; recs.push(uniq[base]); } });
  var c = { id: "", arn: "arn:aws:acm:" + o.region + ":" + ACCOUNT + ":certificate/" + stHex(8) + "-" + stHex(4) + "-" + stHex(4) + "-" + stHex(4) + "-" + stHex(12), region: o.region, names: names, records: recs, validation: "DNS", algo: o.algo || "RSA_2048", born: Date.now(), tagMap: {} };
  c.domainRec = {}; names.forEach(function (n) { c.domainRec[n] = uniq[n.replace(/^\*\./, "")]; });
  c.id = c.arn; S.certs.push(c); return { res: c };
};
API.deleteCert = function (arn) {
  var c = S.certs.filter(function (x) { return x.arn === arn; })[0]; if (!c) return E("_", "ResourceNotFoundException: Could not find certificate " + arn);
  var use = S.cfds.filter(function (d) { return d.certArn === arn; })[0]; if (use) return E("_", "ResourceInUseException: Certificate " + arn + " is in use (ใช้อยู่กับ CloudFront " + use.id + ")");
  S.certs = S.certs.filter(function (x) { return x !== c; }); return { res: true };
};

// ---------- Route 53 ----------
function r53Name(n) { return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(String(n || "")); }
API.createZone = function (o) {
  var n = String(o.name || "").replace(/\.$/, "").toLowerCase();
  if (!n) return E("name", "ต้องกรอก Domain name"); if (!r53Name(n)) return E("name", "InvalidDomainName: " + n + " is not a valid DNS domain name");
  if (S.zones.some(function (z) { return z.name === n; })) return E("name", "HostedZoneAlreadyExists: โซน " + n + " มีแล้ว (AWS ให้ซ้ำชื่อได้ แต่ตัวจำลองไม่ให้เพื่อไม่สับสน)");
  var ns = [0, 1, 2, 3].map(function (i) { return "ns-" + (100 + Math.floor(Math.random() * 1800)) + ".awsdns-" + ("0" + Math.floor(Math.random() * 60)).slice(-2) + "." + ["org", "com", "net", "co.uk"][i] + "."; });
  var z = { id: "Z" + stAlnum(13, true), name: n, private: false, records: [{ name: n + ".", type: "NS", ttl: 172800, values: ns }, { name: n + ".", type: "SOA", ttl: 900, values: [ns[0] + " awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"] }], born: Date.now(), tagMap: {} };
  S.zones.push(z); return { res: z };
};
API.putRecord = function (zoneId, o, upsert) {
  var z = S.zones.filter(function (x) { return x.id === zoneId; })[0]; if (!z) return E("_", "NoSuchHostedZone: No hosted zone found with ID: " + zoneId);
  var nm = String(o.name || "").toLowerCase().replace(/\.$/, ""); if (nm && nm.indexOf(".") < 0 && nm !== z.name) nm = nm + "." + z.name; if (!nm) nm = z.name;
  if (nm !== z.name && nm.slice(-z.name.length - 1) !== "." + z.name) return E("name", "InvalidChangeBatch: RRSet with DNS name " + nm + ". is not permitted in zone " + z.name + ".");
  if (["A", "AAAA", "CNAME", "TXT", "MX"].indexOf(o.type) < 0) return E("type", "InvalidInput: type " + o.type + " ไม่รองรับในตัวจำลอง");
  if (o.type === "CNAME" && nm === z.name) return E("type", "InvalidChangeBatch: RRSet of type CNAME with DNS name " + nm + ". is not permitted at apex in zone " + z.name + ".");
  if (!o.alias && !(o.values || []).filter(Boolean).length) return E("values", "InvalidChangeBatch: ต้องระบุ Value หรือเลือก Alias");
  if (o.alias && !S.cfds.some(function (d) { return d.domain === o.alias; }) && !/\.(elb|s3-website[.-])/.test(o.alias)) return E("alias", "InvalidChangeBatch: Tried to create an alias that targets " + o.alias + ", type A in zone " + z.id + ", but the alias target name does not lie within the target zone");
  var ex = z.records.filter(function (r) { return r.name === nm + "." && r.type === o.type; })[0];
  if (ex && !upsert) return E("name", "InvalidChangeBatch: Tried to create resource record set [name='" + nm + ".', type='" + o.type + "'] but it already exists");
  var r = { name: nm + ".", type: o.type, ttl: o.alias ? null : (+o.ttl || 300), values: (o.values || []).filter(Boolean), alias: o.alias || "" };
  if (ex) z.records[z.records.indexOf(ex)] = r; else z.records.push(r); return { res: r };
};
API.deleteRecord = function (zoneId, name, type) { var z = S.zones.filter(function (x) { return x.id === zoneId; })[0]; if (z) z.records = z.records.filter(function (r) { return !(r.name === name && r.type === type); }); return { res: true }; };
API.deleteZone = function (id) { var z = S.zones.filter(function (x) { return x.id === id; })[0]; if (!z) return E("_", "NoSuchHostedZone: No hosted zone found with ID: " + id); if (z.records.some(function (r) { return r.type !== "NS" && r.type !== "SOA"; })) return E("_", "HostedZoneNotEmpty: The specified hosted zone contains non-required resource record sets and so cannot be deleted."); S.zones = S.zones.filter(function (x) { return x !== z; }); return { res: true }; };
// ชื่อ → distribution (ผ่าน record ใน hosted zone) หรือ *.cloudfront.net ตรงๆ
function dnsResolve(host) {
  host = String(host || "").toLowerCase();
  var d0 = S.cfds.filter(function (d) { return d.domain === host; })[0]; if (d0) return { kind: "cloudfront", dist: d0, chain: [host + " → " + d0.domain] };
  var best = S.zones.filter(function (z) { return host === z.name || host.slice(-z.name.length - 1) === "." + z.name; }).sort(function (a, b) { return b.name.length - a.name.length; })[0];
  if (!best) return { kind: "nxdomain", chain: [], why: "ไม่มี hosted zone ที่ครอบ " + host + " (หรือยังไม่ได้ตั้ง NS ที่ผู้ขายโดเมนให้ชี้มาที่ Route 53)" };
  var rec = best.records.filter(function (r) { return r.name === host + "." && (r.type === "A" || r.type === "CNAME"); })[0];
  if (!rec) return { kind: "nxdomain", chain: [], why: "โซน " + best.name + " ไม่มี record ชื่อ " + host };
  var target = rec.alias || (rec.values || [])[0] || "", t2 = target.replace(/\.$/, ""), d = S.cfds.filter(function (x) { return x.domain === t2; })[0];
  if (d) return { kind: "cloudfront", dist: d, chain: [host + " → " + (rec.alias ? "ALIAS " : "CNAME ") + d.domain], zone: best };
  return { kind: "other", chain: [host + " → " + target], zone: best };
}
// คำขอ HTTP ผ่าน CloudFront (จำลอง): คืน { status, body, type, headers, notes[] }
function cfRequest(host, path, scheme) {
  var res = dnsResolve(host), notes = [];
  if (res.kind === "nxdomain") return { status: 0, err: "DNS_PROBE_FINISHED_NXDOMAIN", notes: [res.why], dns: res };
  if (res.kind !== "cloudfront") return { status: 0, err: "ERR_CONNECTION_REFUSED", notes: ["ชื่อนี้ชี้ไปที่ " + res.chain[0] + " (ไม่ใช่ CloudFront)"], dns: res };
  var d = res.dist, viaAlias = host !== d.domain;
  if (scheme === "https" && viaAlias) {
    var cert = S.certs.filter(function (c) { return c.arn === d.certArn; })[0];
    if (!cert || !certCovers(cert, host)) return { status: 0, err: "NET::ERR_CERT_COMMON_NAME_INVALID", notes: ["ใบรับรองที่ CloudFront ส่งมาไม่ครอบ " + host + " (ใช้ใบรับรองเริ่มต้น *.cloudfront.net) · ต้องใส่ alternate domain name + ใบรับรอง ACM (us-east-1)"], dns: res, dist: d };
  }
  if (viaAlias && d.aliases.indexOf(host) < 0) return { status: 403, type: "text/html", body: "<h1>403 ERROR</h1><p>The request could not be satisfied.</p><p>Bad request. We can't connect to the server for this app or website at this time. (ชื่อ " + host + " ไม่อยู่ใน Alternate domain names ของ distribution)</p><i>Generated by cloudfront (CloudFront)</i>", headers: { server: "CloudFront", "x-cache": "Error from cloudfront" }, notes: ["alias ไม่ได้ผูกกับ distribution"], dns: res, dist: d };
  if (!d.enabled) return { status: 403, type: "text/html", body: "<h1>403 ERROR</h1><p>The request could not be satisfied.</p>", headers: { server: "CloudFront", "x-cache": "Error from cloudfront" }, notes: ["distribution ถูก disable"], dns: res, dist: d };
  if (scheme === "http" && d.viewerProto === "redirect-to-https") return { status: 301, location: "https://" + host + path, headers: { server: "CloudFront", "x-cache": "Redirect from cloudfront" }, notes: ["Viewer protocol policy = Redirect HTTP to HTTPS"], dns: res, dist: d };
  if (scheme === "http" && d.viewerProto === "https-only") return { status: 403, type: "text/html", body: "<h1>403 ERROR</h1><p>The request could not be satisfied. (HTTPS only)</p>", headers: { server: "CloudFront" }, notes: ["https-only"], dns: res, dist: d };
  var p = path.split("?")[0] || "/"; if (p === "/" && d.defaultRoot) p = "/" + d.defaultRoot;
  var ck = d.id + "|" + p, hit = S.cfCache[ck];
  if (hit) return { status: hit.status, type: hit.type, body: hit.body, headers: { server: "CloudFront", "x-cache": "Hit from cloudfront", age: String(Math.max(1, Math.round((Date.now() - hit.at) / 1000))), etag: hit.etag }, notes: ["ได้จาก cache ของ edge (ไม่ไปถาม S3) · ถ้าเพิ่งอัปโหลดไฟล์ใหม่แล้วยังเห็นของเก่า = ต้อง Invalidation"], dns: res, dist: d, cached: true };
  var org = d.origins[0], b = cfOriginBucket(org || {}), key = p.replace(/^\//, "");
  function errPage(status) { var ep = d.errorPages.filter(function (e) { return +e.code === status; })[0]; if (!ep) return null; var r2 = originGet(ep.page); return r2 && r2.status === 200 ? { status: +ep.respCode || 200, type: r2.type, body: r2.body, headers: { server: "CloudFront", "x-cache": "Error from cloudfront" }, notes: ["Custom error response: " + status + " → " + ep.page + " (" + (ep.respCode || 200) + ")"], dns: res, dist: d } : null; }
  function originGet(k) {
    k = String(k).replace(/^\//, "");
    if (!org) return { status: 502, type: "text/html", body: "<h1>502 ERROR</h1><p>Origin not configured</p>" };
    if (!b) return { status: 404, type: "application/xml", body: '<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist</Message><BucketName>' + (org.domain || "").split(".")[0] + "</BucketName></Error>", why: "origin domain ไม่ตรงกับ bucket ที่มีอยู่" };
    var auth = org.oacId ? s3Allows(b, k, { service: "cloudfront.amazonaws.com", sourceArn: cfdArn(d) }) : s3Allows(b, k, { anonymous: true });
    if (!auth.ok) return { status: 403, type: "application/xml", body: '<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>AccessDenied</Code><Message>Access Denied</Message><RequestId>' + stAlnum(16, true) + "</RequestId><HostId>" + stAlnum(40) + "</HostId></Error>", why: (org.oacId ? "" : "origin ไม่ได้ผูก OAC (CloudFront ส่งคำขอแบบไม่เซ็น) · ") + auth.why };
    var o = b.objects.filter(function (x) { return x.key === k; })[0];
    // S3 ที่ไม่ให้สิทธิ์ ListBucket จะตอบ 403 (ไม่ใช่ 404) เมื่อไม่มีไฟล์ · นี่คือสาเหตุที่หน้า SPA รีเฟรชแล้วเจอ 403
    if (!o) return { status: 403, type: "application/xml", body: '<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>', why: "ไม่มีไฟล์ '" + k + "' ใน bucket (S3 ตอบ 403 แทน 404 เมื่อ OAC ไม่มีสิทธิ์ s3:ListBucket)" };
    return { status: 200, type: o.type, body: o.body, etag: o.etag };
  }
  var r = originGet(key);
  if (r.why) notes.push(r.why);
  if (r.status !== 200) { var ep2 = errPage(r.status); if (ep2) { ep2.notes = notes.concat(ep2.notes); return ep2; } return { status: r.status, type: r.type, body: r.body, headers: { server: "CloudFront", "x-cache": "Error from cloudfront" }, notes: notes, dns: res, dist: d, originError: true }; }
  S.cfCache[ck] = { status: 200, type: r.type, body: r.body, etag: r.etag, at: Date.now() };
  return { status: 200, type: r.type, body: r.body, headers: { server: "CloudFront", "x-cache": "Miss from cloudfront", etag: r.etag }, notes: ["ไม่มีใน cache → ไปเอาจาก S3 แล้วเก็บไว้ (TTL ค่าเริ่มต้น 24 ชม.)"], dns: res, dist: d };
}

// ---------- schema ----------
TF_SCHEMA.aws_s3_bucket = sch(["bucket", "bucket_prefix", "force_destroy", "tags"], [], {}, ["tags", "force_destroy"], ["id", "arn", "bucket_domain_name", "bucket_regional_domain_name", "region"]);
TF_SCHEMA.aws_s3_bucket_public_access_block = sch(["bucket", "block_public_acls", "block_public_policy", "ignore_public_acls", "restrict_public_buckets"], ["bucket"], {}, ["block_public_acls", "block_public_policy", "ignore_public_acls", "restrict_public_buckets"], ["id"]);
TF_SCHEMA.aws_s3_bucket_policy = sch(["bucket", "policy"], ["bucket", "policy"], {}, ["policy"], ["id"]);
TF_SCHEMA.aws_s3_object = sch(["bucket", "key", "content", "content_type", "tags"], ["bucket", "key"], {}, ["content", "content_type", "tags"], ["id", "etag", "version_id"]);
TF_SCHEMA.aws_cloudfront_origin_access_control = sch(["name", "description", "origin_access_control_origin_type", "signing_behavior", "signing_protocol"], ["name", "origin_access_control_origin_type", "signing_behavior", "signing_protocol"], {}, ["description"], ["id", "etag"]);
TF_SCHEMA.aws_cloudfront_distribution = sch(["enabled", "comment", "default_root_object", "aliases", "price_class", "origin", "default_cache_behavior", "restrictions", "viewer_certificate", "custom_error_response", "tags", "wait_for_deployment"], ["enabled", "origin", "default_cache_behavior", "restrictions", "viewer_certificate"],
  { origin: { args: ["domain_name", "origin_id", "origin_access_control_id", "origin_path"], req: ["domain_name", "origin_id"] }, default_cache_behavior: { args: ["target_origin_id", "viewer_protocol_policy", "allowed_methods", "cached_methods", "cache_policy_id", "compress"], req: ["target_origin_id", "viewer_protocol_policy", "allowed_methods", "cached_methods"] }, restrictions: { args: ["geo_restriction"], req: ["geo_restriction"], blocks: { geo_restriction: { args: ["restriction_type", "locations"], req: ["restriction_type"] } } }, viewer_certificate: { args: ["acm_certificate_arn", "cloudfront_default_certificate", "ssl_support_method", "minimum_protocol_version"], req: [] }, custom_error_response: { args: ["error_code", "response_code", "response_page_path", "error_caching_min_ttl"], req: ["error_code"] } },
  ["tags", "enabled", "comment", "default_root_object", "aliases", "price_class", "origin", "default_cache_behavior", "viewer_certificate", "custom_error_response"], ["id", "arn", "domain_name", "hosted_zone_id", "status", "etag"]);
TF_SCHEMA.aws_acm_certificate = sch(["domain_name", "subject_alternative_names", "validation_method", "key_algorithm", "tags"], ["domain_name"], {}, ["tags"], ["id", "arn", "status", "domain_validation_options"]);
TF_SCHEMA.aws_acm_certificate_validation = sch(["certificate_arn", "validation_record_fqdns"], ["certificate_arn"], {}, ["validation_record_fqdns"], ["id"]);
TF_SCHEMA.aws_route53_zone = sch(["name", "comment", "force_destroy", "tags"], ["name"], {}, ["tags", "comment", "force_destroy"], ["id", "zone_id", "arn", "name_servers"]);
TF_SCHEMA.aws_route53_record = sch(["zone_id", "name", "type", "ttl", "records", "allow_overwrite", "alias"], ["zone_id", "name", "type"], { alias: { args: ["name", "zone_id", "evaluate_target_health"], req: ["name", "zone_id", "evaluate_target_health"] } }, ["ttl", "records", "alias"], ["id", "fqdn"]);
TF_DATA_SCHEMA.aws_iam_policy_document.blocks.statement.blocks.condition = { args: ["test", "variable", "values"], req: ["test", "variable", "values"] };

// ---------- Terraform provider ----------
function stTfOk(r, label, svc, op) { if (r && r.errors) { var k = Object.keys(r.errors)[0], m = /^([A-Za-z.]+): ([\s\S]*)$/.exec(String(r.errors[k])); throw TfAwsError(label, svc, op, m ? m[1] : "InvalidParameterValue", m ? m[2] : String(r.errors[k])); } return r.res; }
function stProviderRegion(node) {
  var a = node && node.attrs && node.attrs.provider; if (!a) return null;
  var e = a.expr, alias = e && e.t === "attr" ? e.n : null, p = alias ? S.tfCfg && S.tfCfg.providers["aws." + alias] : null;
  if (!p) return null; var rg = p.body.filter(function (x) { return x.kind === "attr" && x.name === "region"; })[0];
  if (!rg) return null; try { return hclEval(rg.expr, { file: "", vars: {}, lookup: function () { throw new Error("x"); }, child: function () { return this; } }); } catch (e2) { return null; }
}
TF_PROV.aws_s3_bucket = {
  act: "s3:CreateBucket", svc: "S3", op: "CreateBucket",
  create: function (c) {
    var a = c.attrs, nm = a.bucket || "terraform-" + stHex(26), b = stTfOk(API.createBucket({ name: nm, region: REGION, forceDestroy: !!a.force_destroy }), "creating S3 Bucket (" + nm + ")", "S3", "CreateBucket"); b.tagMap = Object.assign({}, c.tags);
    return { id: nm, computed: { id: nm, arn: "arn:aws:s3:::" + nm, bucket: nm, bucket_domain_name: nm + ".s3.amazonaws.com", bucket_regional_domain_name: nm + ".s3." + REGION + ".amazonaws.com", region: REGION } };
  },
  update: function (st, d) { var b = bucketByName(st.id); if (b) { b.forceDestroy = !!d.force_destroy; b.tagMap = Object.assign({}, d.tags); } },
  del: function (st) { var b = bucketByName(st.id); if (!b) return; var r = API.deleteBucket(st.id, b.forceDestroy); if (r.errors) throw TfAwsError("deleting S3 Bucket (" + st.id + ")", "S3", "DeleteBucket", "BucketNotEmpty", r.errors._.replace(/^BucketNotEmpty: /, "")); },
  read: function (st) { return bucketByName(st.id) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_s3_bucket_public_access_block = {
  act: "s3:PutBucketPublicAccessBlock", svc: "S3", op: "PutPublicAccessBlock",
  create: function (c) { var a = c.attrs, b = bucketByName(a.bucket); if (!b) throw TfAwsError("creating S3 Bucket Public Access Block (" + a.bucket + ")", "S3", "PutPublicAccessBlock", "NoSuchBucket", "The specified bucket does not exist"); b.block = { acls: !!a.block_public_acls, policy: !!a.block_public_policy, ignore: !!a.ignore_public_acls, restrict: !!a.restrict_public_buckets }; return { id: a.bucket, computed: { id: a.bucket }, sim: { bucket: a.bucket } }; },
  update: function (st, d) { var b = bucketByName(st.sim.bucket); if (b) b.block = { acls: !!d.block_public_acls, policy: !!d.block_public_policy, ignore: !!d.ignore_public_acls, restrict: !!d.restrict_public_buckets }; },
  del: function (st) { var b = bucketByName(st.sim.bucket); if (b) b.block = { acls: false, policy: false, ignore: false, restrict: false }; },
  read: function (st) { return bucketByName(st.sim.bucket) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_s3_bucket_policy = {
  act: "s3:PutBucketPolicy", svc: "S3", op: "PutBucketPolicy",
  create: function (c) { var a = c.attrs; stTfOk(API.putBucketPolicy(a.bucket, a.policy), "putting S3 Bucket Policy (" + a.bucket + ")", "S3", "PutBucketPolicy"); return { id: a.bucket, computed: { id: a.bucket }, sim: { bucket: a.bucket } }; },
  update: function (st, d) { stTfOk(API.putBucketPolicy(st.sim.bucket, d.policy), "putting S3 Bucket Policy (" + st.sim.bucket + ")", "S3", "PutBucketPolicy"); },
  del: function (st) { var b = bucketByName(st.sim.bucket); if (b) b.policy = ""; },
  read: function (st) { var b = bucketByName(st.sim.bucket); return b && b.policy ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_s3_object = {
  act: "s3:PutObject", svc: "S3", op: "PutObject",
  create: function (c) { var a = c.attrs, r = API.putObject(a.bucket, { key: a.key, body: a.content, type: a.content_type }); if (r.errors) throw TfAwsError("creating S3 Object (" + a.key + ") in S3 Bucket (" + a.bucket + ")", "S3", "PutObject", "NoSuchBucket", "The specified bucket does not exist"); var o = bucketByName(a.bucket).objects.filter(function (x) { return x.key === a.key; })[0]; return { id: a.key, computed: { id: a.key, etag: o.etag }, sim: { bucket: a.bucket, key: a.key } }; },
  update: function (st, d) { var r = API.putObject(st.sim.bucket, { key: st.sim.key, body: d.content, type: d.content_type }); if (r.errors) throw TfAwsError("updating S3 Object", "S3", "PutObject", "NoSuchBucket", "The specified bucket does not exist"); },
  del: function (st) { API.deleteObject(st.sim.bucket, st.sim.key); },
  read: function (st) { var b = bucketByName(st.sim.bucket); return b && b.objects.some(function (x) { return x.key === st.sim.key; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_cloudfront_origin_access_control = {
  act: "cloudfront:CreateOriginAccessControl", svc: "CloudFront", op: "CreateOriginAccessControl",
  create: function (c) { var a = c.attrs, x = stTfOk(API.createOac({ name: a.name, desc: a.description, type: a.origin_access_control_origin_type, signing: a.signing_behavior }), "creating CloudFront Origin Access Control (" + a.name + ")", "CloudFront", "CreateOriginAccessControl"); return { id: x.id, computed: { id: x.id, etag: "E" + stAlnum(13, true) } }; },
  update: function (st, d) { var x = S.oacs.filter(function (o) { return o.id === st.id; })[0]; if (x) { x.desc = d.description || ""; } },
  del: function (st) { if (S.cfds.some(function (d) { return d.origins.some(function (o) { return o.oacId === st.id; }); })) throw TfAwsError("deleting CloudFront Origin Access Control (" + st.id + ")", "CloudFront", "DeleteOriginAccessControl", "OriginAccessControlInUse", "Cannot delete Origin Access Control because it is in use by one or more distributions."); S.oacs = S.oacs.filter(function (o) { return o.id !== st.id; }); },
  read: function (st) { return S.oacs.some(function (o) { return o.id === st.id; }) ? { cfg: {}, computed: {} } : null; }
};
function cfdFromAttrs(a, id) {
  var vc = (a.viewer_certificate || [{}])[0], dcb = (a.default_cache_behavior || [{}])[0];
  return { id: id, comment: a.comment, origins: (a.origin || []).map(function (o) { return { id: o.origin_id, domain: o.domain_name, oacId: o.origin_access_control_id || "" }; }), aliases: a.aliases || [], certArn: vc.acm_certificate_arn || "", defaultRoot: a.default_root_object || "", viewerProto: dcb.viewer_protocol_policy, priceClass: a.price_class || "PriceClass_All", enabled: !!a.enabled, cachePolicy: dcb.cache_policy_id, errorPages: (a.custom_error_response || []).map(function (e) { return { code: e.error_code, page: e.response_page_path, respCode: e.response_code }; }) };
}
TF_PROV.aws_cloudfront_distribution = {
  act: "cloudfront:CreateDistribution", svc: "CloudFront", op: "CreateDistributionWithTags",
  create: function (c) {
    var a = c.attrs, d = stTfOk(API.createCfd(cfdFromAttrs(a)), "creating CloudFront Distribution", "CloudFront", "CreateDistributionWithTags"); d.tagMap = Object.assign({}, c.tags);
    return { id: d.id, computed: { id: d.id, arn: cfdArn(d), domain_name: d.domain, hosted_zone_id: "Z2FDTNDATAQYW2", status: "Deployed", etag: "E" + stAlnum(13, true) } };
  },
  update: function (st, d) { var o = cfdFromAttrs(d, st.id); delete o.id; stTfOk(API.updateCfd(st.id, o), "updating CloudFront Distribution (" + st.id + ")", "CloudFront", "UpdateDistribution"); },
  del: function (st) { var x = S.cfds.filter(function (d) { return d.id === st.id; })[0]; if (!x) return; x.enabled = false; stTfOk(API.deleteCfd(st.id), "deleting CloudFront Distribution (" + st.id + ")", "CloudFront", "DeleteDistribution"); },
  read: function (st) { return S.cfds.some(function (d) { return d.id === st.id; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_acm_certificate = {
  act: "acm:RequestCertificate", svc: "ACM", op: "RequestCertificate",
  plan: function (a) { var names = [a.domain_name].concat(a.subnet_alternative_names || a.subject_alternative_names || []).filter(Boolean); return { domain_validation_options: names.map(function (n) { return { domain_name: n, resource_record_name: HCL_UNKNOWN, resource_record_type: HCL_UNKNOWN, resource_record_value: HCL_UNKNOWN }; }) }; },
  create: function (c) {
    var a = c.attrs, region = stProviderRegion(c.node) || REGION, r = stTfOk(API.requestCert({ domain: a.domain_name, sans: a.subject_alternative_names || [], region: region, algo: a.key_algorithm }), "requesting ACM Certificate (" + a.domain_name + ")", "ACM", "RequestCertificate"); r.tagMap = Object.assign({}, c.tags);
    var dvo = r.names.map(function (n) { var rec = r.domainRec[n]; return { domain_name: n, resource_record_name: rec.name, resource_record_type: rec.type, resource_record_value: rec.value }; });
    return { id: r.arn, computed: { id: r.arn, arn: r.arn, status: "PENDING_VALIDATION", domain_validation_options: dvo } };
  },
  update: function (st, d) { var x = S.certs.filter(function (q) { return q.arn === st.id; })[0]; if (x) x.tagMap = Object.assign({}, d.tags); },
  del: function (st) { var r = API.deleteCert(st.id); if (r.errors) throw TfAwsError("deleting ACM Certificate (" + st.id + ")", "ACM", "DeleteCertificate", "ResourceInUseException", r.errors._.replace(/^ResourceInUseException: /, "")); },
  read: function (st) { return S.certs.some(function (q) { return q.arn === st.id; }) ? { cfg: {}, computed: { status: acmStatus(S.certs.filter(function (q) { return q.arn === st.id; })[0]) } } : null; }
};
TF_PROV.aws_acm_certificate_validation = {
  act: "acm:DescribeCertificate", svc: "ACM", op: "DescribeCertificate",
  create: function (c) {
    var a = c.attrs, cert = S.certs.filter(function (q) { return q.arn === a.certificate_arn; })[0];
    if (!cert) throw TfAwsError("validating ACM Certificate (" + a.certificate_arn + ")", "ACM", "DescribeCertificate", "ResourceNotFoundException", "Could not find certificate " + a.certificate_arn);
    if (acmStatus(cert) !== "ISSUED") throw new Error("waiting for ACM Certificate (" + cert.arn + ") to be issued: timeout while waiting for state to become 'ISSUED' (last state: 'PENDING_VALIDATION', timeout: 1h15m0s)\n(สาเหตุที่พบบ่อย: ไม่ได้สร้าง CNAME ตรวจสอบใน Route 53 หรือโดเมนยังไม่ชี้ NS มาที่ hosted zone นี้)");
    return { id: stStamp(), computed: { id: stStamp() } };
  },
  update: function () {}, del: function () {}, read: function () { return { cfg: {}, computed: {} }; }
};
TF_PROV.aws_route53_zone = {
  act: "route53:CreateHostedZone", svc: "Route 53", op: "CreateHostedZone",
  create: function (c) { var a = c.attrs, z = stTfOk(API.createZone({ name: a.name }), "creating Route 53 Hosted Zone (" + a.name + ")", "Route 53", "CreateHostedZone"); z.tagMap = Object.assign({}, c.tags); return { id: z.id, computed: { id: z.id, zone_id: z.id, arn: "arn:aws:route53:::hostedzone/" + z.id, name_servers: z.records[0].values.map(function (v) { return v.replace(/\.$/, ""); }) } }; },
  update: function (st, d) { var z = S.zones.filter(function (x) { return x.id === st.id; })[0]; if (z) z.tagMap = Object.assign({}, d.tags); },
  del: function (st) { var z = S.zones.filter(function (x) { return x.id === st.id; })[0]; if (z && st.cfg && st.cfg.force_destroy) z.records = z.records.filter(function (r) { return r.type === "NS" || r.type === "SOA"; }); var r = API.deleteZone(st.id); if (r.errors) throw TfAwsError("deleting Route 53 Hosted Zone (" + st.id + ")", "Route 53", "DeleteHostedZone", "HostedZoneNotEmpty", r.errors._.replace(/^HostedZoneNotEmpty: /, "")); },
  read: function (st) { return S.zones.some(function (x) { return x.id === st.id; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.aws_route53_record = {
  act: "route53:ChangeResourceRecordSets", svc: "Route 53", op: "ChangeResourceRecordSets",
  create: function (c) {
    var a = c.attrs, al = (a.alias || [{}])[0], r = stTfOk(API.putRecord(a.zone_id, { name: a.name, type: a.type, ttl: a.ttl, values: a.records, alias: al.name }, !!a.allow_overwrite), "creating Route 53 Record (" + a.name + " [" + a.type + "]) in Zone (" + a.zone_id + ")", "Route 53", "ChangeResourceRecordSets");
    var id = a.zone_id + "_" + r.name.replace(/\.$/, "") + "_" + a.type; return { id: id, computed: { id: id, fqdn: r.name.replace(/\.$/, "") }, sim: { zone: a.zone_id, name: r.name, type: a.type } };
  },
  update: function (st, d) { stTfOk(API.putRecord(st.sim.zone, { name: st.sim.name, type: st.sim.type, ttl: d.ttl, values: d.records, alias: ((d.alias || [{}])[0] || {}).name }, true), "updating Route 53 Record", "Route 53", "ChangeResourceRecordSets"); },
  del: function (st) { API.deleteRecord(st.sim.zone, st.sim.name, st.sim.type); },
  read: function (st) { var z = S.zones.filter(function (x) { return x.id === st.sim.zone; })[0]; return z && z.records.some(function (r) { return r.name === st.sim.name && r.type === st.sim.type; }) ? { cfg: {}, computed: {} } : null; }
};
