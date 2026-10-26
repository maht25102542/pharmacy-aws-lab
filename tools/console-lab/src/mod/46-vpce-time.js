// ===== VPC endpoints (ทางออกอื่นแทน NAT ของ task ใน private subnet) + เวลาเหมือนจริงของ lab 2-4 =====
// ponytail: ระยะเวลาเป็นค่าประมาณจากความจำ ไม่ได้วัดจาก AWS จริง ใช้เฉพาะโหมดความเร็ว "เหมือนจริง" (S.speed === "real")
var VPCE_SVCS = { "ecr.api": "Interface", "ecr.dkr": "Interface", "logs": "Interface", "secretsmanager": "Interface", "ssm": "Interface", "s3": "Gateway", "dynamodb": "Gateway" };
function vpceShort(n) { return String(n || "").replace("com.amazonaws." + REGION + ".", ""); }
API.createVpce = function (o) {
  var er = {}, v = find(S.vpcs, o.vpcId), sh = vpceShort(o.service), type = VPCE_SVCS[sh];
  if (!v) er.vpcId = "InvalidVpcId.NotFound: ไม่พบ VPC";
  if (!type) er.service = "InvalidServiceName: The Vpc Endpoint Service '" + (o.service || "") + "' does not exist (ตัวจำลองรองรับ: " + Object.keys(VPCE_SVCS).join(", ") + ")";
  if (v && type === "Interface") {
    var sns = (o.subnetIds || []).map(function (id) { return find(S.subnets, id); }).filter(Boolean);
    if (!sns.length) er.subnetIds = "InvalidParameter: Interface endpoint ต้องเลือก subnet อย่างน้อย 1"; else if (sns.some(function (s) { return s.vpcId !== v.id; })) er.subnetIds = "InvalidSubnetID.NotFound: subnet ต้องอยู่ใน VPC เดียวกัน";
    if (!(o.sgIds || []).length) er.sgIds = "InvalidParameter: ต้องเลือก security group (ต้องรับ HTTPS 443 จาก SG ของ task)";
    if (o.privateDns) {
      if (!v.dnsHostnames || !v.dnsResolution) er.privateDns = "InvalidParameter: To set PrivateDnsEnabled to true, the VPC must have attributes enableDnsHostnames and enableDnsSupport set to true.";
      else if (S.vpces.some(function (e) { return e.vpcId === v.id && e.service === sh && e.privateDns; })) er.privateDns = "InvalidParameter: private-dns-enabled cannot be set because there is already a conflicting DNS domain for " + sh + "." + REGION + ".amazonaws.com in the VPC " + v.id;
    }
  }
  if (v && type === "Gateway" && !(o.rtbIds || []).length) er.rtbIds = "InvalidParameter: Gateway endpoint ต้องเลือก route table อย่างน้อย 1 (ตัวจำลองเพิ่ม route ไป prefix list ของ S3 ให้)";
  if (Object.keys(er).length) return { errors: er };
  var e = { id: rid("vpce"), name: o.name || "", vpcId: v.id, service: sh, type: type, subnetIds: (o.subnetIds || []).slice(), sgIds: (o.sgIds || []).slice(), rtbIds: (o.rtbIds || []).slice(), privateDns: type === "Interface" ? !!o.privateDns : false, born: Date.now(), tagMap: {} }; S.vpces.push(e); return { res: e };
};
API.deleteVpce = function (id) { S.vpces = S.vpces.filter(function (e) { return e.id !== id; }); return { res: true }; };
// task (อยู่ใน subnet sn ใช้ SG sgIds) ติดต่อบริการ AWS ชื่อ svc ผ่าน endpoint ได้ไหม
function vpceReach(svc, sn, sgIds) {
  if (!sn) return false;
  return S.vpces.some(function (e) {
    if (e.vpcId !== sn.vpcId || e.service !== svc) return false;
    if (e.type === "Gateway") return e.rtbIds.indexOf((subnetRtb(sn) || {}).id) >= 0;
    return e.privateDns && e.subnetIds.length > 0 && sgAllows(e.sgIds, 443, { sgIds: sgIds });
  });
}
function vpceNeeds(td) { var c = td.containers[0] || {}, n = ["ecr.api"]; if ((c.secrets || []).length) n.push("secretsmanager"); n.push("ecr.dkr", "s3"); if (c.logGroup) n.push("logs"); return n; }
function vpceFailMsg(svc, host, tdImg, idx) {
  var ip = "10.0." + (11 + idx % 3) + "." + (200 + idx), reg = ACCOUNT + ".dkr.ecr." + REGION + ".amazonaws.com";
  if (svc === "ecr.api") return "ResourceInitializationError: unable to pull secrets or registry auth: The task cannot pull registry auth from Amazon ECR: There is a connection issue between the task and Amazon ECR. Check your task network configuration. RequestError: send request failed caused by: Post \"https://api.ecr." + REGION + ".amazonaws.com/\": dial tcp 52.77.84." + (10 + idx) + ":443: i/o timeout";
  if (svc === "secretsmanager") return "ResourceInitializationError: unable to pull secrets or registry auth: execution resource retrieval failed: unable to retrieve secret from asm: There is a connection issue between the task and AWS Secrets Manager. Check your task network configuration. failed to fetch secret from secrets manager: RequestError: send request failed caused by: Post \"https://secretsmanager." + REGION + ".amazonaws.com/\": dial tcp 52.76.10." + (20 + idx) + ":443: i/o timeout";
  if (svc === "ecr.dkr") return "CannotPullContainerError: pull image manifest has been retried 5 time(s): failed to resolve ref " + tdImg + ": failed to do request: Head \"https://" + reg + "/v2/pharmacy/api/manifests/" + String(tdImg).split(":").pop() + "\": dial tcp 52.77.84." + (30 + idx) + ":443: i/o timeout";
  if (svc === "s3") return "CannotPullContainerError: pull image manifest has been retried 5 time(s): failed to copy: httpReadSeeker: failed open: failed to do request: Get \"https://prod-" + REGION + "-starport-layer-bucket.s3." + REGION + ".amazonaws.com/" + ACCOUNT + "-" + fakeId("", 12, "0123456789abcdef") + "\": dial tcp 52.219.128." + (40 + idx) + ":443: i/o timeout";
  return "ResourceInitializationError: failed to validate logger args: create stream has been retried 1 times: failed to create Cloudwatch log stream: RequestError: send request failed caused by: Post \"https://logs." + REGION + ".amazonaws.com/\": dial tcp 52.76.10." + (50 + idx) + ":443: i/o timeout : exit status 1" + (ip ? "" : "");
}
TF_SCHEMA.aws_vpc_endpoint = sch(["vpc_id", "service_name", "vpc_endpoint_type", "subnet_ids", "security_group_ids", "route_table_ids", "private_dns_enabled", "tags"], ["vpc_id", "service_name"], {}, ["tags", "subnet_ids", "security_group_ids", "route_table_ids", "private_dns_enabled"], ["id", "arn"]);
TF_PROV.aws_vpc_endpoint = {
  act: "ec2:CreateVpcEndpoint", svc: "EC2", op: "CreateVpcEndpoint",
  create: function (c) { var a = c.attrs, r = tfOk(API.createVpce({ name: (c.tags || {}).Name, vpcId: a.vpc_id, service: a.service_name, subnetIds: a.subnet_ids || [], sgIds: a.security_group_ids || [], rtbIds: a.route_table_ids || [], privateDns: !!a.private_dns_enabled }), "creating EC2 VPC Endpoint (" + a.service_name + ")", "EC2", "CreateVpcEndpoint"); return { id: r.id, computed: { id: r.id, arn: "arn:aws:ec2:" + REGION + ":" + ACCOUNT + ":vpc-endpoint/" + r.id }, sim: { id: r.id } }; },
  update: function () {}, del: function (st) { API.deleteVpce(st.sim.id); },
  read: function (st) { return S.vpces.some(function (e) { return e.id === st.sim.id; }) ? { cfg: {}, computed: {} } : null; }
};
// ---------- เวลา (โหมด "เหมือนจริง") ----------
function labReal() { return S.speed === "real"; }
// ecs service: 0-45 วินาทีแรก task = PENDING (provision + ดึง image) · 45-75 วินาที RUNNING แต่ health check รอบแรกยังไม่ผ่าน
function ecsWarm(svc) { if (!labReal()) return 0; var a = Date.now() - (svc.touched || svc.born || 0); return a < 45000 ? 1 : a < 75000 ? 2 : 0; }
function rdsPhase(r) { if (!labReal() || !r.born) return "available"; return Date.now() - r.born < (r.multiAz ? 720000 : 360000) ? "creating" : "available"; }
function eksPhase(c) { return labReal() && c.born && Date.now() - c.born < 540000 ? "CREATING" : "ACTIVE"; }
function ngPhase(g) { return labReal() && g.born && Date.now() - g.born < 150000 ? "CREATING" : "ACTIVE"; }
function cfPhase(d) { return labReal() && d.touched && Date.now() - d.touched < 240000 ? "Deploying" : "Deployed"; }
function labBusy() {
  if (!labReal()) return false;
  return S.eks.some(function (c) { return eksPhase(c) !== "ACTIVE"; }) || S.ngs.some(function (g) { return ngPhase(g) !== "ACTIVE"; }) || S.cfds.some(function (d) { return cfPhase(d) !== "Deployed"; }) || S.esvcs.some(function (s) { return ecsWarm(s); }) || S.rds.some(function (r) { return rdsPhase(r) !== "available"; }) || S.pipes.some(function (p) { return p.execs.some(function (e) { return e.cursor; }); });
}
// วินาทีที่ resource ใช้สร้างใน terraform apply (โหมดเหมือนจริง) · ค่าประมาณ
function tfCreateSecs(type, attrs) {
  var t = { aws_lb: 190, aws_instance: 30, aws_nat_gateway: 100, aws_eks_cluster: 540, aws_eks_node_group: 150, aws_cloudfront_distribution: 240, aws_acm_certificate_validation: 100, aws_ecs_service: 20, aws_lambda_function: 15, aws_dynamodb_table: 15, aws_codepipeline: 5, aws_codebuild_project: 3, aws_route53_zone: 30 }[type];
  if (type === "aws_db_instance") return attrs && attrs.multi_az ? 780 : 380;
  if (type === "aws_vpc_endpoint") return attrs && attrs.vpc_endpoint_type === "Interface" ? 90 : 10;
  return t || 0;
}
// pipeline: ขั้นละกี่วินาทีในโหมดเหมือนจริง
function cdDurSecs(provider) { return { CodeStarSourceConnection: 8, CodeBuild: 100, ECS: 80 }[provider] || 3; }
