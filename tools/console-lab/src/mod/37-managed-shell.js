// ===== คำสั่ง aws / kubectl ของฝั่ง managed บน laptop จำลอง =====
function mgFlag(a, name) { var i = a.indexOf(name); return i >= 0 ? a[i + 1] : ""; }
function shAwsManaged(a, w, need) {
  var op = a[0] + " " + a[1];
  if (op === "eks list-clusters") return need("eks:ListClusters", "ListClusters", function () { return ["{", '    "clusters": [' + S.eks.map(function (c) { return '"' + c.name + '"'; }).join(", ") + "]", "}"]; });
  if (op === "eks update-kubeconfig") return need("eks:DescribeCluster", "DescribeCluster", function () {
    var n = mgFlag(a, "--name"), c = byName(S.eks, n); if (!n) return ["usage: aws eks update-kubeconfig --name <cluster>", "aws: error: the following arguments are required: --name"];
    if (!c) return ["", "An error occurred (ResourceNotFoundException) when calling the DescribeCluster operation: No cluster found for name: " + n + "."];
    S.laptop.kube = c.name; return ["Added new context arn:aws:eks:" + REGION + ":" + ACCOUNT + ":cluster/" + c.name + " to /home/swd/.kube/config"];
  });
  if (op === "ssm start-session") return need("ssm:StartSession", "StartSession", function () {
    var id = mgFlag(a, "--target"), i = find(S.insts, id); if (!id) return ["usage: aws ssm start-session --target <instance-id>"];
    var c = i && i.state !== "terminated" ? sessionCheck(i) : null;
    if (!c || !c.ok) return ["", "An error occurred (TargetNotConnected) when calling the StartSession operation: " + id + " is not connected." + (c ? "  (" + c.steps.filter(function (x) { return !x.ok; }).map(function (x) { return x.t; }).join("; ") + ")" : "")];
    var sid = (w.arn.split("/").pop() || "user") + "-" + mgHex(17), pf = mgFlag(a, "--parameters");
    if (/StartPortForwardingSession/.test(mgFlag(a, "--document-name"))) { var pn = /portNumber=(\d+)/.exec(pf), ln = /localPortNumber=(\d+)/.exec(pf); return ["", "Starting session with SessionId: " + sid, "Port " + ((ln && ln[1]) || (pn && pn[1]) || "8080") + " opened for sessionId " + sid + ".", "Waiting for connections...", "", "(จำลอง: เปิดเบราว์เซอร์ที่ http://localhost:" + ((ln && ln[1]) || (pn && pn[1]) || "8080") + " ได้ ไม่มีพอร์ตไหนเปิดบนอินเทอร์เน็ต)"]; }
    S.laptop.remote = i.id; S.laptop.rcwd = "~"; S.laptop.via = "ssm"; S.laptop.sid = sid;
    return ["", "Starting session with SessionId: " + sid, "(จำลอง: ไม่ต้องมี key pair ไม่ต้องเปิด port 22 · พิมพ์ exit เพื่อออกจาก session)", ""];
  });
  if (op === "rds describe-db-instances") return need("rds:DescribeDBInstances", "DescribeDBInstances", function () {
    var o = ["{", '    "DBInstances": ['];
    o.push(S.rds.map(function (r) { return ["        {", '            "DBInstanceIdentifier": "' + r.id + '",', '            "Engine": "' + r.engine + '", "EngineVersion": "' + r.version + '", "DBInstanceClass": "' + r.cls + '",', '            "DBInstanceStatus": "' + r.state + '", "MultiAZ": ' + r.multiAz + ', "PubliclyAccessible": ' + r.publicly + ",", '            "AvailabilityZone": "' + r.az + '"' + (r.standbyAz ? ', "SecondaryAvailabilityZone": "' + r.standbyAz + '"' : "") + ",", '            "Endpoint": { "Address": "' + r.address + '", "Port": ' + r.port + " },", '            "MasterUserSecret": ' + (r.manage ? '{ "SecretArn": "' + r.secretArn + '", "SecretStatus": "active" }' : "null"), "        }"].join("\n"); }).join(",\n"));
    return o.concat(["    ]", "}"]);
  });
  if (op === "secretsmanager get-secret-value") return need("secretsmanager:GetSecretValue", "GetSecretValue", function () {
    var id = mgFlag(a, "--secret-id"), r = S.rds.filter(function (x) { return x.secretArn && x.secretArn === id; })[0];
    if (!r) return ["", "An error occurred (ResourceNotFoundException) when calling the GetSecretValue operation: Secrets Manager can't find the specified secret."];
    return ["{", '    "ARN": "' + r.secretArn + '",', '    "Name": "' + r.secretArn.split(":secret:")[1].replace(/-[^-]+$/, "") + '",', '    "SecretString": "{\\"username\\":\\"' + r.user + '\\",\\"password\\":\\"<สุ่มโดย Secrets Manager และหมุนให้ ตัวจำลองไม่แสดงค่าจริง>\\"}"', "}"];
  });
  return shAwsStatic(a, w, need);
}
function shKubectl(a) {
  var c = byName(S.eks, S.laptop.kube || "");
  if (!S.laptop.kube || !c) return { lines: ["E0000 memcache.go:265] couldn't get current server API group list: Get \"http://localhost:8080/api?timeout=32s\": dial tcp 127.0.0.1:8080: connect: connection refused", "The connection to the server localhost:8080 was refused - did you specify the right host or port?", "(ยังไม่มี kubeconfig: รัน aws eks update-kubeconfig --region " + REGION + " --name <cluster> ก่อน)"] };
  if (!c.pub || !c.cidrs.some(function (x) { return cidrHas(x, S.myIp); })) return { lines: ["Unable to connect to the server: dial tcp " + c.endpoint.replace("https://", "") + ":443: i/o timeout", "(จำลอง: API endpoint เปิด public เฉพาะ " + c.cidrs.join(", ") + (c.pub ? " ซึ่งไม่รวม IP ของคุณ " + S.myIp : " (private only) ต้องเรียกจากใน VPC") + ")"] };
  var w = whoAmI(); if (w.err || !canDo(w, "eks:AccessKubernetesApi")) return { lines: ["error: You must be logged in to the server (Unauthorized)"] };
  var nodes = S.insts.filter(function (i) { return i.nodeRole && i.state === "running" && S.asgs.some(function (g) { return g.name === i.asg && g.cluster === c.name; }); });
  var sub = a[0] === "get" ? a[1] : "";
  if (sub === "nodes" || sub === "node" || sub === "no") return { lines: nodes.length ? ["NAME" + " ".repeat(48) + "STATUS   ROLES    AGE   VERSION"].concat(nodes.map(function (i) { return ("ip-" + i.privateIp.replace(/\./g, "-") + "." + REGION + ".compute.internal").padEnd(52) + "Ready    <none>   3m    v" + c.version + ".0-eks-" + mgHex(7); })) : ["No resources found"] };
  if (sub === "ns" || sub === "namespaces") return { lines: ["NAME              STATUS   AGE", "default           Active   10m", "kube-node-lease   Active   10m", "kube-public       Active   10m", "kube-system       Active   10m"].concat(S.mgNs ? S.mgNs.map(function (n) { return n.padEnd(18) + "Active   1m"; }) : []) };
  if (sub === "pods" || sub === "po") return { lines: ["NAMESPACE     NAME                       READY   STATUS    RESTARTS   AGE"].concat(nodes.map(function (i, k) { return "kube-system   aws-node-" + mgHex(5) + "             2/2     Running   0          3m"; })).concat(nodes.map(function (i) { return "kube-system   kube-proxy-" + mgHex(5) + "           1/1     Running   0          3m"; })).concat(["kube-system   coredns-" + mgHex(10) + "-" + mgHex(5) + "   1/1     Running   0          10m", "kube-system   coredns-" + mgHex(10) + "-" + mgHex(5) + "   1/1     Running   0          10m"]) };
  return { lines: ["kubectl: จำลองเฉพาะ get nodes / get pods / get ns"] };
}
