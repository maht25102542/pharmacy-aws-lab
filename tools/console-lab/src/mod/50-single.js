// ===== Use case 6: EC2 เครื่องเดียว + Docker Compose + Caddy (HTTPS อัตโนมัติ) =====
// เครื่องไม่ได้รันโค้ดจริง: ตัวจำลองอ่าน user_data ของเครื่องแล้วตัดสินว่า "บูตครั้งแรก" ได้ผลอะไร (ติดตั้ง docker? docker compose up? Caddyfile มีโดเมน?)
// user_data รันครั้งเดียวตอนบูตครั้งแรก → แก้ภายหลังไม่มีผลกับเครื่องเดิม (inst.ud เก็บค่าตอนสร้าง)
function ec2App(inst) {
  var u = String(inst.ud || ""); if (!u) return null;
  var docker = /(apt(-get)?|yum|dnf)\s+install[^\n]*docker/.test(u), up = /docker[ -]compose\s+up/.test(u), m = /^\s*([a-z0-9][a-z0-9.-]*\.[a-z]{2,})\s*\{/m.exec(u.split(/Caddyfile/)[1] || "");
  return { docker: docker, up: docker && up, domain: m ? m[1] : "", why: !docker ? "user_data ไม่ได้ติดตั้ง docker" : !up ? "user_data ไม่มีคำสั่ง docker compose up (เขียนไฟล์ compose ไว้แต่ไม่ได้สั่งรัน)" : "" };
}
// ชื่อโดเมน → IP จาก A record (ไม่ alias) ใน Route 53 ของ lab
function dnsA(host) {
  host = String(host || "").toLowerCase();
  var z = S.zones.filter(function (x) { return host === x.name || host.slice(-x.name.length - 1) === "." + x.name; }).sort(function (a, b) { return b.name.length - a.name.length; })[0]; if (!z) return "";
  var r = z.records.filter(function (x) { return x.name === host + "." && x.type === "A" && !x.alias && (x.values || [])[0] && /^\d+\.\d+\.\d+\.\d+$/.test(x.values[0]); })[0]; return r ? r.values[0] : "";
}
function isSingleLab() { return S.insts.some(function (i) { return i.ud && /docker/.test(i.ud); }); }
