// ===== เมนู Services (mega menu แบบ console จริง) + ช่อง Search ที่ใช้งานได้ + Alt+S =====
// svc = ชื่อ service ใน NAV (null = ยังไม่ได้จำลอง) · next = อยู่ในแผนแล็บถัดไป
var SVC_CATALOG = [
  ["Analytics", [["Athena", "Serverless interactive analytics service", null, "athena", "sql query s3"], ["EMR", "Hosted Hadoop framework", null, "emr", "spark hadoop"], ["Kinesis", "Work with real-time streaming data", null, "kinesis", "stream"], ["OpenSearch Service", "Run and scale OpenSearch clusters", null, "opensearch", "elasticsearch search"], ["Glue", "Simple, scalable, and serverless data integration", null, "glue", "etl"], ["Redshift", "Fast, simple, cost-effective data warehousing", null, "redshift", "warehouse"]]],
  ["Application Integration", [["Simple Queue Service", "Managed message queues", null, "sqs", "sqs queue"], ["Simple Notification Service", "Pub/sub messaging", null, "sns", "sns topic notify"], ["EventBridge", "Serverless service for building event-driven applications", null, "eventbridge", "event bus schedule"], ["Step Functions", "Coordinate distributed applications", null, "stepfunctions", "workflow state machine"], ["Amazon MQ", "Managed message broker", null, "mq", "rabbitmq activemq"]]],
  ["Business Applications", [["Amazon Connect", "Cloud contact center", null, "connect", "call center"], ["WorkMail", "Secure and managed business email", null, "workmail", "email"]]],
  ["Cloud Financial Management", [["Budgets", "Set custom cost and usage budgets", null, "budgets", "cost alert"], ["Cost Explorer", "Analyze your AWS costs and usage", null, "costexplorer", "billing"]]],
  ["Compute", [["EC2", "Virtual servers in the cloud", "EC2", "ec2", "vm server instance virtual machine load balancer auto scaling security group key pair"], ["Lambda", "Run code without thinking about servers", "Lambda", "lambda", "function serverless environment variables permission"], ["Elastic Beanstalk", "Run and manage web apps", null, "beanstalk", "paas"], ["Lightsail", "Launch and manage virtual private servers", null, "lightsail", "vps"], ["Batch", "Fully managed batch processing at any scale", null, "batch", "job"]]],
  ["Containers", [["Elastic Container Registry", "Fully managed Docker container registry", "ECR", "ecr", "docker image registry repository push pull"], ["Elastic Container Service", "Highly secure, reliable, and scalable way to run containers", "ECS", "ecs", "container fargate task service cluster"], ["Elastic Kubernetes Service", "The most trusted way to start, run, and scale Kubernetes", "EKS", "eks", "k8s kubernetes cluster node group kubectl"], ["App Runner", "Build and run production web applications at scale", null, "apprunner", "container web"]]],
  ["Database", [["RDS", "Managed relational database service", "RDS", "rds", "database mysql mariadb postgres multi-az subnet group db"], ["Aurora", "High performance managed relational database", null, "aurora", "mysql postgres"], ["DynamoDB", "Managed NoSQL database", "DynamoDB", "dynamodb", "nosql table items"], ["ElastiCache", "In-memory caching", null, "elasticache", "redis memcached"], ["DocumentDB", "Fully managed MongoDB-compatible database", null, "documentdb", "mongodb"], ["Neptune", "Fast, reliable graph database", null, "neptune", "graph"]]],
  ["Developer Tools", [["CodeCommit", "Store code in private Git repositories", null, "codecommit", "git"], ["CodeBuild", "Build and test code", "CodeBuild", "codebuild", "build ci docker privileged buildspec"], ["CodeDeploy", "Automate code deployments", null, "codedeploy", "deploy"], ["CodePipeline", "Release software using continuous delivery", "CodePipeline", "codepipeline", "ci cd pipeline connection approval deploy"], ["CloudShell", "Browser-based shell", null, "cloudshell", "terminal"], ["X-Ray", "Analyze and debug your applications", null, "xray", "trace"], ["Cloud9", "Write, run, and debug code with a browser", null, "cloud9", "ide"]]],
  ["Front-end Web & Mobile", [["Amplify", "Build, deploy, and host scalable web and mobile apps", null, "amplify", "hosting"], ["AWS AppSync", "Accelerate app development with GraphQL APIs", null, "appsync", "graphql"]]],
  ["Internet of Things", [["IoT Core", "Connect devices to the cloud", null, "iotcore", "mqtt device"]]],
  ["Machine Learning", [["SageMaker", "Build, train, and deploy machine learning models", null, "sagemaker", "ml"], ["Bedrock", "Build generative AI applications with foundation models", null, "bedrock", "genai llm"], ["Rekognition", "Find objects, people, text, and scenes in images and videos", null, "rekognition", "image"], ["Textract", "Extract text and data from documents", null, "textract", "ocr"], ["Comprehend", "Natural language processing", null, "comprehend", "nlp"], ["Transcribe", "Speech to text", null, "transcribe", "audio"]]],
  ["Management & Governance", [["CloudWatch", "Monitor resources and applications", "CloudWatch", "cloudwatch", "logs log group metrics alarm"], ["CloudFormation", "Create and manage resources with templates", null, "cloudformation", "iac stack"], ["CloudTrail", "Track user activity and API usage", null, "cloudtrail", "audit"], ["Config", "Track resources inventory and changes", null, "config", "compliance"], ["Systems Manager", "Gain operational insights and take action on AWS resources", "SSM", "ssm", "session manager ssh bastion fleet run command patch parameter store"], ["Organizations", "Central governance and management across AWS accounts", null, "organizations", "account"], ["Trusted Advisor", "Optimize performance and security", null, "trustedadvisor", "best practice"], ["Service Catalog", "Create and use standardized products", null, "servicecatalog", "portfolio"], ["Control Tower", "The easiest way to set up and govern a secure multi-account environment", null, "controltower", "landing zone"]]],
  ["Migration & Transfer", [["DataSync", "Simplify and accelerate data transfers", null, "datasync", "transfer"], ["Transfer Family", "Fully managed SFTP, FTPS, and FTP service", null, "transferfamily", "sftp"], ["Migration Hub", "Track migrations from a single place", null, "migrationhub", "migrate"]]],
  ["Networking & Content Delivery", [["VPC", "Isolated cloud resources", "VPC", "vpc", "network subnet route table internet gateway nat gateway security group"], ["CloudFront", "Global content delivery network", "CloudFront", "cloudfront", "cdn cache distribution oac invalidation edge"], ["Route 53", "Scalable domain name system and domain registration", "Route 53", "route53", "dns domain hosted zone record alias"], ["API Gateway", "Build, deploy, and manage APIs", "API Gateway", "apigw", "rest http api route stage integration"], ["Direct Connect", "Dedicated network connection to AWS", null, "directconnect", "vpn"], ["Global Accelerator", "Improve global application availability and performance", null, "globalaccelerator", "anycast"], ["Transit Gateway", "Connect VPCs and on-premises networks", null, "transitgateway", "peering"]]],
  ["Security, Identity, & Compliance", [["IAM", "Manage access to AWS resources", "IAM", "iam", "user role policy access key permission"], ["Certificate Manager", "Provision and manage SSL/TLS certificates", "ACM", "acm", "acm ssl tls https cert certificate"], ["Secrets Manager", "Rotate, manage, and retrieve secrets", null, "secrets", "password credential"], ["Key Management Service", "Securely generate and manage encryption keys", null, "kms", "encrypt kms"], ["Cognito", "Identity management for your apps", null, "cognito", "login user pool"], ["GuardDuty", "Intelligent threat detection", null, "guardduty", "threat"], ["WAF & Shield", "Protect web apps from common exploits", null, "waf", "firewall ddos"], ["Inspector", "Continual vulnerability management", null, "inspector", "scan"], ["Security Hub", "Unified security and compliance center", null, "securityhub", "findings"]]],
  ["Storage", [["S3", "Scalable storage in the cloud", "S3", "s3", "bucket object file static website upload"], ["EFS", "Managed file storage for EC2", null, "efs", "nfs file system"], ["FSx", "Fully managed third-party file systems", null, "fsx", "windows lustre"], ["Backup", "Centralized backup across AWS services", null, "backup", "snapshot"], ["Storage Gateway", "Hybrid storage integration", null, "storagegateway", "hybrid"]]]
];
function svcFlat() { var o = []; SVC_CATALOG.forEach(function (c) { c[1].forEach(function (x) { o.push({ name: x[0], desc: x[1], svc: x[2], ico: x[3], kw: x[4] || "", next: x[5] === "next", cat: c[0] }); }); }); return o; }
var SVC_FAV_DEFAULT = ["EC2", "VPC", "IAM", "Elastic Container Registry", "Elastic Container Service", "Elastic Kubernetes Service", "RDS", "S3", "CloudFront", "Route 53", "Certificate Manager", "Systems Manager", "CloudWatch", "Lambda", "API Gateway", "DynamoDB", "CodePipeline", "CodeBuild"];
function svcFavs() { if (!UI.favSvc) UI.favSvc = SVC_FAV_DEFAULT.slice(); return UI.favSvc; }
function svcRemember(sv) { if (!SVC_ICO[sv]) return; UI.recentSvc = [sv].concat((UI.recentSvc || []).filter(function (x) { return x !== sv; })).slice(0, 6); }
function svcOpen(x, after) { if (x.svc) { if (after) after(); go(NAVHOME[x.svc], {}, x.svc); } else { if (after) after(); flash("info", x.name + (x.next ? " อยู่ในแผนแล็บถัดไป (Use case 2-4) · ยังไม่ได้จำลอง" : " มีใน console จริงแต่ยังไม่ได้จำลอง")); render(); } }
function svcItemBtn(x, onpick) {
  var ic = x.ico && AWS_ICONS[x.ico] ? h("img", { src: AWS_ICONS[x.ico], alt: "" }) : h("span", { cls: "ph", text: x.name.slice(0, 2) });
  return h("button", { type: "button", cls: "sm-it" + (x.svc ? "" : " off"), title: x.svc ? "" : (x.next ? "อยู่ในแผนแล็บถัดไป" : "ยังไม่ได้จำลอง"), onclick: function () { svcOpen(x, onpick); } }, [ic, h("span", {}, [h("b", { text: x.name }), h("small", {}, [x.desc, x.svc ? "" : h("span", { cls: "bd" + (x.next ? " nx" : ""), text: x.next ? "แล็บถัดไป" : "ยังไม่จำลอง" })])])]);
}
(function () {
  var btn = document.getElementById("svcbtn"), menu = document.getElementById("svcmenu"), cat = "fav", q = "";
  function hide() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
  function favs() { return svcFavs(); }
  function star(x, redraw) { var on = favs().indexOf(x.name) >= 0; return h("button", { type: "button", cls: "sm-star" + (on ? " on" : ""), "aria-label": (on ? "Remove " : "Add ") + x.name + (on ? " from favorites" : " to favorites"), "aria-pressed": String(on), title: on ? "Remove from favorites" : "Add to favorites", onclick: function (e) { e.stopPropagation(); var f = favs(), i = f.indexOf(x.name); if (i >= 0) f.splice(i, 1); else f.push(x.name); redraw(); } }, [on ? "★" : "☆"]); }
  function build() {
    menu.textContent = "";
    var all = svcFlat().sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; }), input = h("input", { type: "search", id: "svcq", placeholder: "Search for services, features, blogs, docs, and more", "aria-label": "Find services", value: q, oninput: function (e) { q = e.target.value; list(); } });
    var rail = h("div", { cls: "sm-cats" }), main = h("div", { cls: "sm-main" }), head = h("div", { cls: "sm-head" }), ls = h("div", { cls: "sm-list" });
    var fixed = [["recent", "Recently visited", "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5v5.4l3.6 2.1-.8 1.3L11 13V7h2z"], ["fav", "Favorites", "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z"], ["all", "All services", "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"]];
    var cats = fixed.map(function (c) { return [c[0], c[1], c[2]]; }).concat(SVC_CATALOG.map(function (c) { return [c[0], c[0], null]; }));
    function row(x) {
      var ic = x.ico && AWS_ICONS[x.ico] ? h("img", { src: AWS_ICONS[x.ico], alt: "" }) : h("span", { cls: "ph", text: x.name.slice(0, 2) });
      return h("div", { cls: "sm-row" }, [star(x, list), h("button", { type: "button", cls: "sm-it" + (x.svc ? "" : " off"), title: x.desc + (x.svc ? "" : (x.next ? " · อยู่ในแผนแล็บถัดไป" : " · ยังไม่ได้จำลอง")), onclick: function () { svcOpen(x, hide); } }, [ic, h("span", {}, [h("b", {}, [x.name, x.svc ? "" : h("span", { cls: "bd" + (x.next ? " nx" : ""), text: x.next ? "แล็บถัดไป" : "ยังไม่จำลอง" })]), h("small", { text: x.desc })])])]);
    }
    function list() {
      [].forEach.call(rail.querySelectorAll("button"), function (b) { b.className = b.getAttribute("data-c") === cat && !q ? "on" : ""; });
      ls.textContent = ""; head.textContent = "";
      var items, title;
      if (q) { var t = q.toLowerCase(); items = all.filter(function (x) { return (x.name + " " + x.desc + " " + x.kw + " " + (x.svc || "")).toLowerCase().indexOf(t) >= 0; }); title = "Services (" + items.length + ")"; }
      else if (cat === "recent") { items = (UI.recentSvc || []).map(function (sv) { return all.filter(function (x) { return x.svc === sv; })[0]; }).filter(Boolean); title = "Recently visited"; }
      else if (cat === "fav") { items = favs().map(function (n) { return all.filter(function (x) { return x.name === n; })[0]; }).filter(Boolean); title = "Favorites"; }
      else if (cat === "all") { items = all; title = "All services"; }
      else { items = all.filter(function (x) { return x.cat === cat; }); title = cat; }
      head.appendChild(h("h2", { text: title })); if (!q && cat !== "recent" && cat !== "fav") head.appendChild(h("span", { cls: "hint", text: items.length + " services" }));
      if (!items.length) ls.appendChild(h("p", { cls: "sm-empty", text: q ? "ไม่พบบริการ · ลองคำอื่น เช่น bucket, dns, database" : cat === "fav" ? "คุณยังไม่มี favorites · กดดาว ☆ ข้างบริการเพื่อเพิ่ม" : "ยังไม่มีบริการที่เคยเปิด · เลือกหมวดทางซ้าย หรือกด All services" }));
      items.forEach(function (x) { ls.appendChild(row(x)); });
    }
    cats.forEach(function (c, i) { var b = h("button", { type: "button", "data-c": c[0], onclick: function () { cat = c[0]; q = ""; input.value = ""; list(); } }, [c[2] ? h("svg-ico") : null, c[1]]); if (c[2]) { b.firstChild.remove(); var sv2 = sv("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" }, [sv("path", { d: c[2] })]); b.insertBefore(sv2, b.firstChild); } rail.appendChild(b); if (i === 2) rail.appendChild(h("hr")); });
    main.appendChild(head); main.appendChild(ls);
    menu.appendChild(h("div", { cls: "sm-top" }, [input, h("button", { type: "button", cls: "sm-x", "aria-label": "Close", onclick: hide }, ["×"])]));
    menu.appendChild(rail); menu.appendChild(main); list(); return input;
  }
  btn.addEventListener("click", function (e) { e.stopPropagation(); if (!menu.hidden) { hide(); return; } var inp = build(); menu.hidden = false; btn.setAttribute("aria-expanded", "true"); setTimeout(function () { inp.focus(); }, 0); });
  document.addEventListener("click", function (e) { if (!e.target.closest(".svcwrap")) hide(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
  // ---------- Search ----------
  var inp = document.getElementById("gsearch"), box = document.getElementById("gres"), cur = -1, items = [];
  function close() { box.hidden = true; box.textContent = ""; cur = -1; items = []; }
  function markCur() { [].forEach.call(box.querySelectorAll("button.gi"), function (b, i) { b.classList.toggle("act", i === cur); }); }
  function pick(x) { inp.value = ""; close(); inp.blur(); x.run(); }
  function sectionHits(t) {
    var out = { sv: [], ft: [], rs: [], lab: [] }, all = svcFlat();
    all.forEach(function (x) { if ((x.name + " " + x.desc + " " + x.kw).toLowerCase().indexOf(t) >= 0) out.sv.push({ ico: x.ico, label: x.name, note: x.svc ? "" : (x.next ? "แล็บถัดไป" : "ยังไม่จำลอง"), run: function () { svcOpen(x); } }); });
    Object.keys(NAV).forEach(function (sv) { NAV[sv].forEach(function (g) { g[1].forEach(function (it) { if (it[1].toLowerCase().indexOf(t) < 0) return; var lab = sv === "Lab" || sv === "Laptop" || sv === "Browser"; (lab ? out.lab : out.ft).push({ ico: SVC_ICO[sv], label: (SVC_NAME[sv] || sv) + " › " + it[1], note: it[0] ? "" : "ยังไม่จำลอง", run: function () { if (it[0]) go(it[0], {}, sv); else { flash("info", "หน้า “" + it[1] + "” มีอยู่ใน console จริงแต่ยังไม่ได้จำลอง"); render(); } } }); }); }); });
    Object.keys(LK).forEach(function (k) { (S[LK[k]] || []).forEach(function (r) { var nm = String(r.name || r.id || ""), id = String(r.id || ""); if (out.rs.length < 14 && (nm.toLowerCase().indexOf(t) >= 0 || id.toLowerCase().indexOf(t) >= 0 || (r.domain || "").toLowerCase().indexOf(t) >= 0)) out.rs.push({ ico: null, label: k + ": " + (nm || id), note: id !== nm && id.length < 30 ? id : "", run: function () { go("detail", { kind: k, id: r.id, from: LK[k] }, undefined); } }); }); });
    return out;
  }
  function render2() {
    var t = inp.value.trim().toLowerCase(); box.textContent = ""; items = []; cur = -1; if (!t) { box.hidden = true; return; }
    var r = sectionHits(t);
    [["Services", r.sv.slice(0, 6)], ["Features", r.ft.slice(0, 8)], ["Resources", r.rs], ["Lab / Laptop / Browser", r.lab.slice(0, 6)]].forEach(function (g) {
      if (!g[1].length) return; box.appendChild(h("div", { cls: "gh", text: g[0] }));
      g[1].forEach(function (x) { items.push(x); box.appendChild(h("button", { type: "button", cls: "gi", onclick: function () { pick(x); } }, [x.ico && AWS_ICONS[x.ico] ? h("img", { src: AWS_ICONS[x.ico], alt: "" }) : null, h("span", { text: x.label }), x.note ? h("span", { cls: "nt", text: x.note }) : null])); });
    });
    if (!items.length) box.appendChild(h("div", { cls: "gh", text: "ไม่พบผลลัพธ์ · ลอง s3, bucket, dns, session, eks" }));
    box.hidden = false;
  }
  inp.addEventListener("input", render2); inp.addEventListener("focus", function () { if (inp.value.trim()) render2(); });
  inp.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { if (!items.length) return; e.preventDefault(); cur = (cur + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; markCur(); var b = box.querySelectorAll("button.gi")[cur]; if (b) b.scrollIntoView({ block: "nearest" }); }
    else if (e.key === "Enter") { var x = items[cur < 0 ? 0 : cur]; if (x) { e.preventDefault(); pick(x); } }
    else if (e.key === "Escape") { inp.value = ""; close(); inp.blur(); }
  });
  document.addEventListener("keydown", function (e) { if (e.altKey && (e.key === "s" || e.key === "S")) { e.preventDefault(); hide(); inp.focus(); inp.select(); } });
})();
