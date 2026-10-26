// ===== Lab › Use case จริง: แต่ละ use case = ภาพรวม + env dev/prd + diagram/แอนิเมชัน + โค้ด Terraform เทียบหน้า console + เคส error =====
// เพิ่ม use case ใหม่ = เพิ่ม object ใน UC (ใช้ตัววาด/แอนิเมชัน/ตารางชุดเดียวกัน)
var UC = [];
var UC_SEL = { id: "static" };

UC.push({
  id: "static", no: 1, title: "เว็บ static: S3 + CloudFront + Route 53 + ACM", color: "#e8590c", dir: "labs/01-static-site", loadKind: "static",
  tag: "นิยมที่สุด · ถูกสุด · ไม่มีเซิร์ฟเวอร์ให้ดูแล",
  intro: [
    ["ใช้ทำอะไร", "#2b6cb0", "เว็บ **ที่เป็นไฟล์** (React/Vue/Next export, เว็บบริษัท, หน้า landing, เอกสาร) ไม่มี backend · ผู้ใช้ทั่วโลกได้ไฟล์จาก **edge ใกล้ตัว** (CloudFront) ส่วน S3 เก็บต้นฉบับแบบส่วนตัว"],
    ["ใครใช้", "#1d8102", "แทบทุกทีมที่ทำ frontend · หลายที่ย้ายมาใช้เพราะ **ไม่ต้องดูแลเซิร์ฟเวอร์ ไม่ต้อง patch ไม่ต้อง scale** และค่าใช้จ่ายต่ำ (จ่ายตามการใช้ ไม่มีเครื่องเปิดทิ้ง)"],
    ["dev vs prd", "#c0392b", "**2 env ในโค้ดเดียว** (`for_each` ตาม `local.envs`): dev = `dev.<โดเมน>` ใช้ทดลองก่อน, prd = `www.<โดเมน>` ผู้ใช้จริง · แต่ละ env มี **bucket + distribution + policy ของตัวเอง** ใช้ **ใบรับรองและ OAC ร่วมกัน**"],
    ["สิ่งที่ต้องรู้", "#a85a00", "① bucket **ไม่เปิด public** ใช้ **OAC** ② ใบรับรอง CloudFront ต้องอยู่ **us-east-1** ③ ปล่อยเวอร์ชันใหม่ = `s3 sync` + **invalidation** ④ ชื่อ bucket ต้อง **ไม่ซ้ำทั้งโลก**"]
  ],
  envs: [["", "dev", "prd"], ["ชื่อเว็บ", "dev.pharmacy.example.com", "www.pharmacy.example.com"], ["S3 bucket", "pharmacy-web-dev-<account>", "pharmacy-web-prd-<account>"], ["CloudFront", "distribution แยก (comment: web dev)", "distribution แยก (comment: web prd)"], ["Bucket policy", "อนุญาตเฉพาะ distribution dev", "อนุญาตเฉพาะ distribution prd"], ["ใช้ร่วมกัน", "OAC ×1, ใบรับรอง ACM ×1 (ครอบ www + dev), hosted zone ×1", ""], ["ของจริงมักแยกต่าง", "state/ไดเรกทอรีต่อ env (หรือ workspace), account แยก dev/prd, dev จำกัด IP หรือ basic auth", ""]],
  nodes: [
    { id: "user", x: 24, y: 170, w: 120, h: 64, t: "ผู้ใช้ (เบราว์เซอร์)", s: "https://www…", c: "#2a4a7a" },
    { id: "dns", ico: "route53", x: 200, y: 40, w: 150, h: 60, t: "Route 53", s: "A (alias) → CloudFront", c: "#0d7c8f" },
    { id: "acm", ico: "acm", x: 420, y: 24, w: 190, h: 60, t: "ACM (us-east-1)", s: "ใบรับรอง Issued", c: "#b8860b" },
    { id: "cf", ico: "cloudfront", x: 420, y: 150, w: 190, h: 100, t: "CloudFront (edge)", s: "cache · TTL 24 ชม. · OAC", c: "#c2410c" },
    { id: "s3prd", ico: "s3bucket", x: 770, y: 200, w: 230, h: 76, t: "S3 prd (ส่วนตัว)", s: "policy: SourceArn = dist prd", c: "#3f8624" },
    { id: "s3dev", ico: "s3bucket", x: 770, y: 70, w: 230, h: 76, t: "S3 dev (ส่วนตัว)", s: "policy: SourceArn = dist dev", c: "#7a8a3a" },
    { id: "ci", ico: "github", x: 420, y: 330, w: 190, h: 70, t: "CI / laptop", s: "aws s3 sync + invalidation", c: "#475569" }
  ],
  links: [["user", "dns"], ["user", "cf"], ["cf", "acm"], ["cf", "s3prd"], ["cf", "s3dev"], ["ci", "s3prd"], ["ci", "cf"]],
  scenes: [
    { t: "DNS: ชื่อเว็บ → CloudFront", on: ["user", "dns"], flow: [["user", "ถามชื่อ"], ["dns", "A alias"], ["user", "ได้ IP edge"]], rows: [["เกิดอะไร", "#0d7c8f", "เบราว์เซอร์ถาม Route 53 ว่า `www.pharmacy.example.com` คือ IP อะไร ➜ record **A แบบ alias** ชี้ไป `dxxxx.cloudfront.net` ➜ ได้ IP ของ edge ใกล้ผู้ใช้"], ["ถ้าไม่ขึ้น", "#c62828", "`NXDOMAIN` = ไม่มี record / ยังไม่ตั้ง NS ที่ผู้ขายโดเมนให้ชี้มา Route 53 (ลอง `dig www.pharmacy.example.com` ใน Terminal)"]] },
    { t: "HTTPS: ใบรับรองจาก ACM", on: ["user", "cf", "acm"], flow: [["user", "TLS hello"], ["cf", "ส่งใบรับรอง"], ["user", "เชื่อถือ"]], rows: [["เกิดอะไร", "#b8860b", "CloudFront ส่งใบรับรอง ACM ที่ครอบ `www` และ `dev` ให้เบราว์เซอร์ตรวจ · **ต้องอยู่ us-east-1 และ Issued** เท่านั้นถึงผูกได้"], ["ถ้าไม่ผ่าน", "#c62828", "ผูกไม่ได้: `InvalidViewerCertificate` (ผิด region / ยัง Pending / ไม่ครอบชื่อ) · เบราว์เซอร์เตือน `ERR_CERT_COMMON_NAME_INVALID` ถ้าไม่ใส่ alias+ใบรับรอง"]] },
    { t: "Cache miss: ไปเอาจาก S3 ผ่าน OAC", on: ["user", "cf", "s3prd"], flow: [["user", "GET /"], ["cf", "miss"], ["s3prd", "เซ็นคำขอ SigV4"], ["cf", "เก็บ cache"], ["user", "200"]], rows: [["เกิดอะไร", "#c2410c", "ไม่มีใน edge ➜ CloudFront **เซ็นคำขอด้วย OAC** ไป S3 ➜ S3 ตรวจ **bucket policy** (Principal = cloudfront.amazonaws.com + `AWS:SourceArn` ตรง distribution) ➜ ส่งไฟล์ ➜ เก็บ cache (`X-Cache: Miss`)"], ["จุดสังเกต", "#a85a00", "เปิด `/` ได้ index.html เพราะตั้ง **Default root object** · โฟลเดอร์ย่อย (`/about/`) ไม่ได้ผลแบบนี้"]] },
    { t: "Cache hit: ตอบจาก edge เลย", on: ["user", "cf"], flow: [["user", "GET /"], ["cf", "hit (Age)"], ["user", "200 เร็ว"]], rows: [["เกิดอะไร", "#1d8102", "ครั้งต่อไปตอบจาก **cache ที่ edge** ไม่ถาม S3 (`X-Cache: Hit from cloudfront`, มี `Age`) ➜ เร็วและประหยัดค่า S3"], ["ข้อแลก", "#a85a00", "ไฟล์ที่เปลี่ยนใน S3 **ไม่ถึงผู้ใช้ทันที** จน TTL หมด (ค่าเริ่มต้น 24 ชม.) หรือ invalidate"]] },
    { t: "ปล่อยเวอร์ชันใหม่: s3 sync", on: ["ci", "s3prd", "user", "cf"], flow: [["ci", "aws s3 sync dist"], ["s3prd", "ไฟล์ใหม่ v2"], ["user", "ยังเห็น v1!"]], rows: [["เกิดอะไร", "#475569", "CI อัปโหลดไฟล์ใหม่ไป S3 ด้วย `aws s3 sync ./dist s3://… --delete` ➜ S3 เป็น v2 แล้ว"], ["แต่", "#c62828", "ผู้ใช้ยังได้ **v1** จาก edge cache ➜ นี่คือเคส ‘ปล่อยแล้วไม่เปลี่ยน’ ที่เจอบ่อยที่สุด (Hard refresh ไม่ช่วย)"]] },
    { t: "Invalidation: ล้างแคช", on: ["ci", "cf", "user"], flow: [["ci", "create-invalidation /*"], ["cf", "ล้าง cache"], ["user", "เห็น v2"]], rows: [["เกิดอะไร", "#1d8102", "`aws cloudfront create-invalidation --paths '/*'` ➜ edge ลบไฟล์ที่ cache ไว้ ➜ คำขอถัดไป miss แล้วเอา **v2** จาก S3"], ["ทางเลือกที่ดีกว่า", "#2b6cb0", "ตั้งชื่อไฟล์มี hash (`app.3f9a.js`) และให้ `index.html` TTL สั้น/invalidate เฉพาะ `/index.html` ➜ เสียค่า invalidation น้อยกว่า"]] },
    { t: "dev vs prd: แยกกันจริง", on: ["user", "cf", "s3dev"], flow: [["user", "dev.pharmacy…"], ["cf", "dist dev"], ["s3dev", "bucket dev"], ["user", "หน้า DEV"]], rows: [["เกิดอะไร", "#7a8a3a", "`dev.…` ใช้ distribution + bucket ของ **dev** · ผู้ใช้จริงไม่เห็น · ปล่อยลอง dev ก่อน แล้วค่อย sync ไป prd"], ["กฎสำคัญ", "#c62828", "policy ของแต่ละ bucket ต้องอ้าง **distribution ของ env ตัวเอง** — อ้างผิดตัว = env นั้น 403"]] },
    { t: "เคส error 1: 403 AccessDenied", on: ["user", "cf", "s3prd"], bad: ["s3prd"], flow: [["user", "GET /"], ["cf", "ส่งไป S3"], ["s3prd", "✗ policy ไม่ตรง"], ["user", "403 XML"]], rows: [["อาการ", "#c62828", "เปิดเว็บเจอ XML `AccessDenied` (HTTP 403 จาก S3 ผ่าน CloudFront)"], ["สาเหตุที่พบบ่อย", "#a85a00", "① ไม่มี/ผิด **bucket policy** (`AWS:SourceArn` ไม่ตรง distribution) ② origin **ไม่ผูก OAC** ③ **ไม่มีไฟล์** นั้นใน bucket (S3 ตอบ 403 ไม่ใช่ 404 เมื่อ OAC ไม่มี ListBucket) ④ ไม่ตั้ง Default root object"], ["ไล่หา", "#2b6cb0", "CloudFront › Origins (OAC?) → S3 › Permissions (policy) → เทียบ distribution ID · Browser ของ lab บอกสาเหตุให้"]] },
    { t: "เคส error 2: ใบรับรองผิด region / ยังไม่ Issued", on: ["cf", "acm"], bad: ["acm"], flow: [["cf", "ขอผูกใบรับรอง"], ["acm", "✗ ผิด region / pending"]], rows: [["อาการ", "#c62828", "ใส่ alias + ใบรับรองแล้ว error `InvalidViewerCertificate: …isn't in us-east-1 region, isn't valid…`"], ["สาเหตุ", "#a85a00", "① ขอใบรับรองไว้ที่ ap-southeast-1 (ไม่ใช่ us-east-1) ② **Pending validation** เพราะไม่ได้สร้าง CNAME ใน Route 53 ③ ใบรับรองไม่ครอบชื่อ alias"], ["แก้", "#1d8102", "ขอใบรับรองใหม่ที่ **us-east-1** → ACM › Create records in Route 53 → รอ Issued → ผูก CloudFront · Terraform: `provider = aws.use1` + `aws_acm_certificate_validation`"]] },
    { t: "เคส error 3: ปล่อยแล้วเห็นของเก่า", on: ["ci", "cf", "user"], bad: ["cf"], flow: [["ci", "sync v3"], ["cf", "✗ ยังมี v2 ใน cache"], ["user", "เห็น v2"]], rows: [["อาการ", "#c62828", "S3 เป็น v3 แล้ว แต่ผู้ใช้เห็น v2 · `X-Cache: Hit from cloudfront`, `Age` เพิ่มเรื่อยๆ"], ["สาเหตุ", "#a85a00", "edge cache ยังไม่หมดอายุ (TTL 24 ชม.) · Hard refresh ล้างแค่แคชเบราว์เซอร์"], ["แก้", "#1d8102", "**Create invalidation** `/*` (หรือ `/index.html`) ➜ ใส่เป็นขั้นสุดท้ายของ CI เสมอ"]] }
  ],
  tf: [
    { type: "aws_s3_bucket", name: "site", file: "labs/01-static-site/s3.tf", console: ["S3 › General purpose buckets › Create bucket", "ใส่ Bucket name (ไม่ซ้ำทั้งโลก) · Region · ปล่อย Block all public access เปิดไว้"], err: "BucketAlreadyExists = ชื่อซ้ำทั้งโลก · ชื่อไม่ผ่านกฎ 3-63 ตัว a-z 0-9 . -" },
    { type: "aws_s3_bucket_public_access_block", name: "site", file: "labs/01-static-site/s3.tf", console: ["Create bucket › Block Public Access settings for this bucket", "ติ๊ก Block all public access (หรือ bucket › Permissions › Block public access › Edit)"], err: "ปิดข้อนี้แล้ว bucket policy แบบ public ถึงจะตั้งได้ (เว็บนี้ไม่ต้อง)" },
    { type: "aws_s3_object", name: "index", file: "labs/01-static-site/s3.tf", console: ["S3 › bucket › Objects › Upload", "เลือกไฟล์ index.html › Upload"], err: "ไม่มี index.html = เปิดเว็บเจอ 403" },
    { type: "aws_cloudfront_origin_access_control", name: "site", file: "labs/01-static-site/cloudfront.tf", console: ["CloudFront › Origin access › Create control setting", "Name · Signing behavior = Sign requests (recommended) · Origin type = S3"], err: "ใช้ OAC กับ S3 static website endpoint ไม่ได้ · ลบ OAC ที่ยังใช้อยู่ไม่ได้" },
    { type: "aws_acm_certificate", name: "site", file: "labs/01-static-site/acm.tf", console: ["ACM › Request certificate (เปลี่ยน region เป็น us-east-1 ก่อน!)", "Request a public certificate › Fully qualified domain name › Add another name › DNS validation"], err: "ผิด region → ผูก CloudFront ไม่ได้ (InvalidViewerCertificate)" },
    { type: "aws_route53_zone", name: "main", file: "labs/01-static-site/route53.tf", console: ["Route 53 › Hosted zones › Create hosted zone", "Domain name · Type = Public hosted zone"], err: "สร้างแล้วต้องตั้ง NS ที่ผู้ขายโดเมน ไม่งั้นอินเทอร์เน็ตไม่รู้จักโซน" },
    { type: "aws_route53_record", name: "cert_validation", file: "labs/01-static-site/acm.tf", console: ["ACM › เลือกใบรับรอง › Create records in Route 53", "(console สร้าง CNAME ให้คลิกเดียว · Terraform ต้องเขียน for_each เอง)"], err: "ไม่สร้าง = Pending validation ตลอด" },
    { type: "aws_acm_certificate_validation", name: "site", file: "labs/01-static-site/acm.tf", console: ["ACM › Certificates › รอ Status = Issued", "(ไม่มีปุ่ม: เป็นการ ‘รอ’ ใน Terraform)"], err: "ไม่ใส่ → CloudFront สร้างก่อนใบรับรอง Issued แล้ว fail" },
    { type: "aws_cloudfront_distribution", name: "site", file: "labs/01-static-site/cloudfront.tf", console: ["CloudFront › Distributions › Create distribution", "Get started (name) → Specify origin (S3 + Use recommended origin settings) → Enable security → (domain + ใบรับรอง)"], err: "CNAMEAlreadyExists · InvalidViewerCertificate · ลืม Default root object = 403" },
    { type: "aws_s3_bucket_policy", name: "site", file: "labs/01-static-site/s3.tf", console: ["S3 › bucket › Permissions › Bucket policy › Edit", "(wizard แบบ recommended ใส่ให้อัตโนมัติ · Terraform ต้องเขียนเอง)"], err: "SourceArn ไม่ตรง distribution = 403 AccessDenied" },
    { type: "aws_route53_record", name: "site", file: "labs/01-static-site/route53.tf", console: ["Route 53 › Hosted zones › เลือกโซน › Create record", "Record name · A · เปิด Alias › Alias to CloudFront distribution"], err: "apex ใช้ CNAME ไม่ได้ · ไม่มี record = NXDOMAIN" }
  ],
  errors: [
    { load: "static-403", t: "403 AccessDenied (bucket policy ผิด distribution)", sym: "prd เปิดแล้วได้ XML AccessDenied · dev ปกติ", find: "Browser (ดูขั้นตอนที่ ✗) → S3 › prd › Permissions › Bucket policy → เทียบ distribution ID กับ CloudFront", fix: "แก้ `AWS:SourceArn` ให้ตรง distribution prd (Terraform: `aws_cloudfront_distribution.site[each.key].arn`)" },
    { load: "static-cert", t: "ใบรับรองผิด region (ap-southeast-1)", sym: "CloudFront › Edit settings ใส่ alias + ใบรับรอง → InvalidViewerCertificate", find: "ACM › เปลี่ยน region เป็น us-east-1 แล้วดูรายการ · ใบรับรองจริงอยู่ ap-southeast-1", fix: "ขอใบรับรองใหม่ที่ us-east-1 (Terraform: `provider = aws.use1`)" },
    { load: "static-cert-pending", t: "ใบรับรอง Pending validation", sym: "ผูกกับ CloudFront ไม่ได้ ใบรับรองไม่ Issued", find: "ACM › ใบรับรอง › Domains: CNAME ยัง Pending · Route 53 ไม่มี record ตรวจสอบ", fix: "ACM › Create records in Route 53 (Terraform: `aws_route53_record.cert_validation` + `aws_acm_certificate_validation`)" },
    { load: "static-stale", t: "ปล่อยแล้วผู้ใช้เห็นของเก่า (cache)", sym: "S3 เป็น v3 แต่เว็บยังเป็น v2 · X-Cache: Hit", find: "Browser: ดู X-Cache/Age · เทียบเนื้อหาที่ S3 › Objects", fix: "CloudFront › Invalidations › Create (`/*`) หรือ `aws cloudfront create-invalidation`" }
  ]
});

function ucCur() { return UC.filter(function (u) { return u.id === UC_SEL.id; })[0] || UC[0]; }
function ucNodeBox(svg, n, tx) {
  var ic = n.ico ? svgIco(n.ico, n.x + 8, n.y + 8, 30) : null, ox = ic ? 22 : 0, g = sv("g", {}, [sv("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 10, fill: "#fff", stroke: n.c, "stroke-width": 2 }), tx(n.x + n.w / 2 + ox, n.y + 22, n.t, { a: "middle", b: 1, c: n.c, sz: 13 }), tx(n.x + n.w / 2 + ox, n.y + 40, n.s, { a: "middle", sz: 10, c: "#64748b" })]); if (ic) g.appendChild(ic);
  g.style.transition = "opacity .45s"; g.style.opacity = ".3"; svg.appendChild(g); return g;
}
function ucAnim(u) {
  var W = 1040, H = 440, svg = sv("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", style: "max-width:1040px;font-family:inherit", role: "img", "aria-label": "ภาพรวมและแอนิเมชัน " + u.title });
  var tx = function (x, y, t, o) { o = o || {}; return sv("text", { x: x, y: y, "font-size": o.sz || 11, "font-weight": o.b ? 700 : 400, fill: o.c || "currentColor", "text-anchor": o.a || "start" }, [t]); };
  var N = {}, E = [];
  u.links.forEach(function (l) { var a = u.nodes.filter(function (n) { return n.id === l[0]; })[0], b = u.nodes.filter(function (n) { return n.id === l[1]; })[0]; var ln = sv("line", { x1: a.x + a.w / 2, y1: a.y + a.h / 2, x2: b.x + b.w / 2, y2: b.y + b.h / 2, stroke: "#94a3b8", "stroke-width": 2, "stroke-dasharray": "5 5" }); ln.style.transition = "opacity .4s"; ln.style.opacity = ".25"; svg.appendChild(ln); E.push({ a: l[0], b: l[1], el: ln }); });
  u.nodes.forEach(function (n) { N[n.id] = { n: n, g: ucNodeBox(svg, n, tx), cx: n.x + n.w / 2, cy: n.y + n.h / 2 }; });
  var pk = sv("circle", { r: 9, fill: "#ff9900", stroke: "#fff", "stroke-width": 2 }), pkl = tx(0, 0, "", { sz: 11, b: 1, c: "#c2500c" }); pk.style.opacity = "0"; svg.appendChild(pk); svg.appendChild(pkl);
  var cap = h("div", { style: "min-height:7em;margin:8px 0" });
  function mv(id, label) { var n = N[id]; pk.style.opacity = "1"; pk.style.transition = "transform .8s ease-in-out"; pk.style.transform = "translate(" + n.cx + "px," + (n.cy + 6) + "px)"; pkl.setAttribute("x", n.cx + 14); pkl.setAttribute("y", n.cy - 10); pkl.textContent = label || ""; }
  function light(sc) {
    Object.keys(N).forEach(function (k) { var on = !sc || sc.on.indexOf(k) >= 0, bad = sc && sc.bad && sc.bad.indexOf(k) >= 0; N[k].g.style.opacity = sc ? (on ? "1" : ".18") : ".3"; N[k].g.firstChild.setAttribute("stroke", bad ? "#c62828" : N[k].n.c); N[k].g.firstChild.setAttribute("fill", bad ? "#fde8e8" : "#fff"); N[k].g.firstChild.setAttribute("stroke-width", bad ? 4 : 2); });
    E.forEach(function (e) { var used = sc && sc.flow.some(function (f, i) { var p = i ? sc.flow[i - 1][0] : null; return p && ((p === e.a && f[0] === e.b) || (p === e.b && f[0] === e.a)); }); e.el.style.opacity = used ? "1" : (sc ? ".1" : ".25"); e.el.setAttribute("stroke", used ? (sc.bad ? "#c62828" : "#ea580c") : "#94a3b8"); e.el.setAttribute("stroke-dasharray", used ? "" : "5 5"); });
  }
  function say(i) { var sc = u.scenes[i]; cap.textContent = ""; cap.appendChild(h("h3", { style: "margin:4px 0 8px", text: (i + 1) + ". " + sc.t })); cap.appendChild(infoCard(sc.rows)); light(sc); pk.style.opacity = "0"; pkl.textContent = ""; }
  function reset() { light(null); pk.style.opacity = "0"; pkl.textContent = ""; cap.textContent = ""; cap.appendChild(infoCard([["ดูอะไร", "#2563eb", "กด ==▶ เล่น== ดูทีละฉาก: " + u.scenes.map(function (s) { return "**" + s.t.replace(/:.*/, "") + "**"; }).join(" → ")]])); }
  var P = jkxPlayer(reset, function (P) {
    var st = []; u.scenes.forEach(function (sc, i) { st.push([i === 0 ? 400 : 1300, function () { say(i); }]); sc.flow.forEach(function (f) { st.push([850, function () { mv(f[0], f[1]); }]); }); });
    st.push([1200, function () { light(null); pk.style.opacity = "0"; pkl.textContent = ""; }]); P.start(st);
  }, "▶ เล่น: ทุกฉาก");
  var chips = h("div", { cls: "chips" }, u.scenes.map(function (s, i) { return h("button", { cls: "chip" + (/error/.test(s.t) ? "" : ""), type: "button", style: /error/.test(s.t) ? "border-color:#c62828;color:#c62828" : "", text: (i + 1) + ". " + s.t, onclick: function () { P.reset(); say(i); s.flow.forEach(function (f, k) { setTimeout(function () { mv(f[0], f[1]); }, 300 + k * 900); }); } }); }));
  var wrap = h("div", {}, [h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 6px" }, P.ctl), chips, cap, svg]); reset(); return wrap;
}
function ucTfTable(u) {
  var box = h("div"), sel = UC_SEL.tf || 0; if (sel >= u.tf.length) sel = 0;
  var list = h("div", { style: "display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:14px;align-items:start" });
  var left = h("div", { style: "display:flex;flex-direction:column;gap:4px" }, u.tf.map(function (r, i) { return h("button", { cls: "btn" + (i === sel ? " pri" : ""), type: "button", style: "text-align:left;white-space:normal", text: (i + 1) + ". " + r.type + "." + r.name, onclick: function () { UC_SEL.tf = i; render(); } }); }));
  var r = u.tf[sel], code = mgBlock(r.file, r.type, r.name);
  var right = h("div", {}, [h("div", { cls: "ic" }, [["โค้ด Terraform", "#6d28d9", "`" + r.file + "` · resource `" + r.type + "." + r.name + "`"]].concat([["กดที่ console", "#0972d3", r.console[0]], ["ช่องที่กรอก", "#1d8102", r.console[1]], ["Error ที่เจอ", "#c62828", r.err]]).map(function (x) { return h("div", { cls: "ic-row", style: "--c:" + x[1] }, [h("div", { cls: "ic-lb", text: x[0] }), h("div", { cls: "ic-tx" }, rich(x[2]))]); })), codePre(code, "hcl")]);
  list.appendChild(left); list.appendChild(right); box.appendChild(list); return box;
}
function ucErrTable(u) {
  var w = h("div", { style: "display:grid;gap:10px" });
  u.errors.forEach(function (e) {
    w.appendChild(h("div", { style: "border:1px solid #c6282855;border-left:5px solid #c62828;border-radius:10px;padding:10px 14px;background:#c628280a" }, [h("div", { style: "font-weight:800;color:#c62828;margin-bottom:6px", text: e.t }),
      h("div", { cls: "ic" }, [["อาการ", "#c62828", e.sym], ["ไล่หา", "#2b6cb0", e.find], ["แก้", "#1d8102", e.fix]].map(function (x) { return h("div", { cls: "ic-row", style: "--c:" + x[1] }, [h("div", { cls: "ic-lb", text: x[0] }), h("div", { cls: "ic-tx" }, rich(x[2]))]); })),
      h("button", { cls: "btn pri", type: "button", text: "โหลดเคสนี้", onclick: function () { try { buildStatic(e.load); UI.sel = {}; UI.form = null; flash("ok", "โหลดเคส “" + e.t + "” แล้ว ไปเปิดเว็บที่ Browser"); go("browser", {}, "Browser"); W.addr = "https://www.pharmacy.example.com"; wbGo(W.addr); } catch (er) { flash("bad", "โหลดไม่สำเร็จ: " + er.message); render(); } } })]));
  });
  return w;
}
function ucTab() {
  var u = ucCur(), cb = h("div", { cls: "cb" });
  cb.appendChild(h("div", { cls: "chips" }, UC.map(function (x) { return h("button", { cls: "chip" + (x.id === u.id ? " on" : ""), type: "button", text: x.no + ". " + x.title.split(":")[0], onclick: function () { UC_SEL.id = x.id; UC_SEL.tf = 0; render(); } }); }).concat([2, 3, 4].filter(function (n) { return !UC.some(function (x) { return x.no === n; }); }).map(function (n) { return h("button", { cls: "chip", type: "button", disabled: true, style: "opacity:.45", text: n + ". " + ["", "", "ECS Fargate + ALB + RDS", "Serverless API", "CI/CD → ECS"][n] + " (กำลังจะทำ)" }); }))));
  cb.appendChild(h("h2", { style: "margin:10px 0 2px;color:" + u.color, text: "Use case " + u.no + " · " + u.title }));
  cb.appendChild(h("div", { cls: "hint", style: "margin:0 0 10px", text: u.tag + " · โค้ดจริง: " + u.dir + "/ (ผ่าน terraform validate)" }));
  cb.appendChild(infoCard(u.intro));
  var loadBar = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin:10px 0" }, [h("button", { cls: "btn pri", type: "button", text: "โหลดตัวอย่างครบทั้งชุด", onclick: function () { buildStatic("static"); UI.sel = {}; flash("ok", "โหลด use case 1 แล้ว"); go("cfds", {}, "CloudFront"); } }), h("button", { cls: "btn", type: "button", text: "โหลดแบบสร้างเอง (มีโซน + ใบรับรอง)", onclick: function () { buildStatic("static-base"); UI.sel = {}; flash("ok", "โหลดแล้ว: เริ่มที่ S3 › Create bucket"); go("bucket-create", {}, "S3"); } }), h("button", { cls: "btn", type: "button", text: "รัน Terraform ใน Terminal", onclick: function () { go("term", {}, "Laptop"); S.laptop.cwd = REPO + "/" + u.dir; flash("ok", "ไปที่ " + u.dir + " แล้ว: terraform init → terraform apply"); render(); } })]);
  cb.appendChild(loadBar);
  var f1 = fold("ucenv", "dev vs prd: ต่างกันตรงไหน"); f1.appendChild(h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, u.envs[0].map(function (x, i) { return h("th", { style: i === 1 ? "color:#0f9d8a" : i === 2 ? "color:#c0392b" : "", text: x || "รายการ" }); }))]), h("tbody", {}, u.envs.slice(1).map(function (r) { var tds = [h("td", { style: "font-weight:700", text: r[0] }), h("td", { colspan: r[2] ? null : "2", text: r[1] })]; if (r[2]) tds.push(h("td", { text: r[2] })); return h("tr", {}, tds); }))])])); cb.appendChild(f1);
  var f2 = fold("ucanim", "diagram + แอนิเมชัน: ใครคุยกับใคร (ปกติ 7 ฉาก + error 3 ฉาก)"); f2.appendChild(ucAnim(u)); cb.appendChild(f2);
  var f3 = fold("uctf", "โค้ด Terraform เทียบกับการกดบน AWS console (เลือก resource ทางซ้าย)"); f3.appendChild(ucTfTable(u)); cb.appendChild(f3);
  var f4 = fold("ucerr", "เคส error " + u.errors.length + " แบบ: อาการ → ไล่หา → แก้ (กดโหลดแล้วลองเอง)"); f4.appendChild(ucErrTable(u)); cb.appendChild(f4);
  return cb;
}
FOLD.ucenv = 1; FOLD.ucanim = 1; FOLD.uctf = 1; FOLD.ucerr = 1;
PAGES["lab-uc"] = function () { return h("div", {}, [crumbEl("Lab › Use case จริง"), h("h1", { text: "Use case จริง (top 4)" }), h("div", { cls: "card" }, [ucTab()])]); };
(function () { var L = NAV.Lab[0][1]; var i = L.map(function (x) { return x[0]; }).indexOf("lab-managed"); L.splice(i < 0 ? L.length : i + 1, 0, ["lab-uc", "Use case จริง (top 4)"]); NAVICO["lab-uc"] = "🧭"; })();
