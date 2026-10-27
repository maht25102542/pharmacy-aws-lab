// ===== Use case 6 (EC2 เครื่องเดียว + Docker Compose + Caddy): สร้าง lab ผ่าน API, ตัวตรวจ =====
var SINGLE_DOMAIN = "app.pharmacy.example.com";
function singleUserData(kind) {
  var caddy = kind === "single-nodomain" ? ":80" : SINGLE_DOMAIN;
  return "#!/bin/bash\nset -eux\napt-get update\napt-get install -y docker.io docker-compose-v2\nmkdir -p /opt/app && cd /opt/app\ncat > Caddyfile <<'CF'\n" + caddy + " {\n  reverse_proxy app:8000\n}\nCF\ncat > docker-compose.yml <<'YML'\nservices:\n  app:\n    image: ghcr.io/YOUR_GITHUB_USER/pharmacy-backend:latest\n  caddy:\n    image: caddy:2\n    ports: [\"80:80\", \"443:443\"]\nYML\n" + (kind === "single-noup" ? "" : "docker compose up -d\n");
}
function buildSingle(kind) {
  fresh();
  function ok(r) { if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.res; }
  if (!S.laptop.creds) { var tu = API.createUser({ name: "tf-admin", policies: ["AdministratorAccess"] }).res, tk = API.createAccessKey(tu.id, "CLI", ""); S.laptop.creds = { id: tk.res.id, secretHash: hash32(tk.secret), region: "ap-southeast-1" }; S.laptop.awsRegion = "ap-southeast-1"; }
  var v = ok(API.createVpc({ name: "pharmacy-single-vpc", cidr: "10.0.0.0/16", dns: true }));
  var sn = ok(API.createSubnet({ vpcId: v.id, list: [{ name: "pharmacy-single-public", az: AZS[0], cidr: "10.0.1.0/24" }] }))[0]; API.setAutoIp(sn.id, true);
  var g = ok(API.createIgw({ name: "pharmacy-single-igw" })); ok(API.attachIgw(g.id, v.id));
  var rt = ok(API.createRtb({ name: "pharmacy-single-public", vpcId: v.id })); ok(API.setRoutes(rt.id, [{ dest: "0.0.0.0/0", target: g.id }])); ok(API.setAssoc(rt.id, [sn.id]));
  function R(type, port, k, src) { return { type: type, port: port, srcKind: k, src: src }; }
  var sg = ok(API.createSg({ name: "pharmacy-single-web", desc: "web", vpcId: v.id, rows: [] }));
  ok(API.setInbound(sg.id, (kind === "single-sg" ? [] : [R("HTTP", "", "Anywhere-IPv4")]).concat([R("HTTPS", "", "Anywhere-IPv4"), R("SSH", "", "My IP")])));
  ok(API.importKey({ name: "pharmacy-single-admin", pub: S.laptop.ssh.id_ed25519.pub }));
  var zone = ok(API.createZone({ name: "pharmacy.example.com" }));
  if (kind === "single-base") { S.singleKind = kind; return; }
  var inst = ok(API.launch({ userData: singleUserData(kind), name: "pharmacy-single", tags: [{ k: "Name", v: "pharmacy-single" }], ami: "ami-ubuntu2404", type: "t3.small", keyName: "pharmacy-single-admin", vpcId: v.id, subnetId: sn.id, autoIp: "Enable", sgIds: [sg.id], diskSize: 20, diskType: "gp3", hop: 1 }))[0];
  if (kind !== "single-eip") { var eip = ok(API.allocEip()); ok(API.assocEip(eip.id, inst.id)); }
  if (kind !== "single-dns") ok(API.putRecord(zone.id, { name: "app", type: "A", ttl: 60, values: [inst.publicIp] }, false));
  if (kind === "single-eip") { ok(API.instState(inst.id, "stop")); ok(API.instState(inst.id, "start")); } // public IP ใหม่ แต่ A record ยังชี้ IP เก่า
  S.singleKind = kind;
}
function checksSingle() {
  var out = []; function add(ok, label, hint) { out.push({ ok: !!ok, label: label, hint: hint || "" }); }
  var i = S.insts.filter(function (x) { return x.state !== "terminated" && x.ud; })[0], sg = i && find(S.sgs, i.sgIds[0]), ap = i && ec2App(i), eip = i && i.eipId, z = S.zones[0];
  add(i && i.type === "t3.small" && i.publicIp, "EC2 เครื่องเดียว t3.small มี public IP", "EC2 › Launch instances");
  add(i && sg && sgAllows([sg.id], 80, { ip: "198.51.100.7" }) && sgAllows([sg.id], 443, { ip: "198.51.100.7" }), "SG เปิด 80 + 443 จากเน็ต (80 ใช้ให้ Let's Encrypt ตรวจโดเมนด้วย)", "EC2 › Security Groups › Inbound rules");
  add(i && sg && !sgAllows([sg.id], 22, { ip: "203.0.113.99" }), "SSH (22) ไม่เปิดให้ทุกคน (เฉพาะ My IP)", "แก้กฎ SSH เป็น My IP");
  add(ap && ap.docker && ap.up, "user_data: ติดตั้ง docker และสั่ง docker compose up", "ใส่ docker compose up -d ท้ายสคริปต์ (ไม่งั้นไม่มีอะไรรัน)");
  add(ap && ap.domain === SINGLE_DOMAIN, "Caddyfile ใช้ชื่อโดเมน " + SINGLE_DOMAIN + " (ได้ HTTPS อัตโนมัติ)", "ชื่อโดเมนใน Caddyfile ต้องตรงกับที่ใช้เข้า");
  add(eip, "ผูก Elastic IP (public IP ไม่เปลี่ยนหลัง stop/start)", "EC2 › Elastic IPs › Allocate → Associate");
  add(i && z && dnsA(SINGLE_DOMAIN) === i.publicIp, "Route 53 A record " + SINGLE_DOMAIN + " ชี้ public IP ปัจจุบันของเครื่อง", "Route 53 › Create record (A) → IP ของ Elastic IP");
  var r = i && webOpen("https://" + SINGLE_DOMAIN + "/"); add(r && r.site === "compose" && r.tls, "เปิด https://" + SINGLE_DOMAIN + " ได้ (ใบรับรอง Let's Encrypt)", "Browser › ดูขั้นที่ ✗");
  return out;
}
