// ---- Lab › Ansible: ดูโค้ดตั้งค่าเครื่อง + diagram + แอนิเมชันเล่น ansible-playbook ทีละ play/task (เหมือนแท็บ Terraform)
var AN = { file: "db.yml", view: "sec", m: "" };

// เครื่องทั้ง 10 ตัวและกลุ่ม role ของ inventory (ตรงกับ terraform/ + ansible/inventory/aws_ec2.yml)
var AN_MACH = [
  ["pharmacy-bastion", ["role_bastion"], "#475569", "🚪", "ประตูเดียวจากเน็ต · SSH :22 จาก My IP"],
  ["pharmacy-jenkins", ["role_jenkins", "internal"], "#d33833", "🧰", "Jenkins :8080 (docker)"],
  ["pharmacy-sonarqube", ["role_sonarqube", "internal"], "#2b6cb0", "🔍", "SonarQube :9000 (docker)"],
  ["pharmacy-k8s-1", ["role_k8s_server", "internal"], "#326ce5", "☸️", "k3s server ตัวแรก + ArgoCD"],
  ["pharmacy-k8s-2", ["role_k8s_server", "internal"], "#326ce5", "☸️", "k3s server (เข้าร่วม HA)"],
  ["pharmacy-k8s-3", ["role_k8s_server", "internal"], "#326ce5", "☸️", "k3s server (เข้าร่วม HA)"],
  ["pharmacy-dev", ["role_k8s_dev", "internal"], "#00838f", "🧪", "k3s เครื่องเดียว (dev)"],
  ["pharmacy-db-1", ["role_db", "internal"], "#a85a00", "🗄️", "MariaDB Galera (node 1)"],
  ["pharmacy-db-2", ["role_db", "internal"], "#a85a00", "🗄️", "MariaDB Galera (node 2)"],
  ["pharmacy-db-3", ["role_db", "internal"], "#a85a00", "🗄️", "MariaDB Galera (node 3)"]
];
// โมดูลที่ใช้ในไฟล์: [ไอคอน, ชื่อไทย, ทำอะไร, ถ้าทำมือ/ไม่มี Ansible จะเป็นอย่างไร]
var AN_MOD = {
  apt: ["📦", "ติดตั้งแพ็กเกจ", "ติดตั้งแพ็กเกจผ่าน `apt` · ถ้ามีอยู่แล้วจะ==ข้าม==", "แบบเล่นๆ: SSH เข้าไปพิมพ์ `apt install` ทีละเครื่อง ลืมเครื่องหนึ่งก็ไม่ตรงกัน"],
  copy: ["📄", "วางไฟล์ / เขียนไฟล์", "คัดลอกไฟล์จาก repo (หรือเขียนจาก `content:`) ไปวางบนเครื่อง", "แบบเล่นๆ: `scp` ทีละไฟล์แล้วจำไม่ได้ว่าวางเวอร์ชันไหนไว้"],
  template: ["🧩", "สร้างไฟล์จากเทมเพลต", "เอาไฟล์ `.j2` มาแทนค่า `{{ ตัวแปร }}` (เช่น IP ของเครื่องอื่น) แล้ววางบนเครื่อง", "แบบเล่นๆ: แก้ IP ในไฟล์ตั้งค่าด้วยมือทุกเครื่อง"],
  command: ["⌨️", "รันคำสั่ง", "รันคำสั่งบนเครื่อง (ไม่รู้ว่าเปลี่ยนอะไร จึงมักใส่ `changed_when` / `creates` / `when` กันรันซ้ำ)", "รันซ้ำแล้วทำซ้ำ ถ้าไม่ใส่เงื่อนไขกัน"],
  shell: ["⌨️", "รันสคริปต์ shell", "รันคำสั่งผ่าน shell (ใช้ pipe `|` ได้) · `creates:` = มีไฟล์นั้นแล้วข้าม", "ติดตั้ง k3s ซ้ำทุกครั้งถ้าไม่มี `creates`"],
  service: ["⚙️", "คุมบริการ", "สั่ง start / stop / enable บริการ `systemd`", "แบบเล่นๆ: `systemctl` มือทีละเครื่อง"],
  systemd: ["⚙️", "คุมบริการ", "สั่ง start / enable บริการ `systemd` หรือ timer", "ลืม enable แล้วเครื่อง reboot บริการไม่ขึ้น"],
  stat: ["🔎", "ตรวจไฟล์", "ตรวจว่าไฟล์/โฟลเดอร์มีไหม เก็บผลไว้ใน `register` เพื่อให้ task ถัดไปตัดสินใจ", ""],
  file: ["📁", "จัดการไฟล์", "สร้าง/ลบไฟล์หรือโฟลเดอร์ ตั้งสิทธิ์ (`mode`)", ""],
  wait_for: ["⏳", "รอจนพร้อม", "รอจนไฟล์/พอร์ตพร้อม ก่อนทำขั้นต่อไป", "ทำต่อก่อนพร้อม แล้วขั้นถัดไปล้ม"],
  slurp: ["📥", "อ่านไฟล์จากเครื่อง", "อ่านไฟล์บนเครื่องมาเป็นตัวแปร (เช่น join token)", ""],
  set_fact: ["🏷️", "เก็บค่าไว้ใช้ต่อ", "เก็บค่าเป็นตัวแปรของเครื่องนี้ ให้ play อื่นเรียกใช้ผ่าน `hostvars`", ""],
  pip: ["🐍", "ติดตั้งแพ็กเกจ Python", "ติดตั้งผ่าน `pip`", ""],
  k8s: ["☸️", "สั่ง Kubernetes", "apply object เข้า cluster ตรงๆ", ""]
};
var AN_PLAYBOOKS = ["db.yml", "k8s.yml", "sonarqube.yml", "jenkins.yml"];
var AN_FILES = [["ansible/site.yml", "site.yml"], ["ansible/db.yml", "db.yml"], ["ansible/k8s.yml", "k8s.yml"], ["ansible/sonarqube.yml", "sonarqube.yml"], ["ansible/jenkins.yml", "jenkins.yml"], ["ansible/inventory/aws_ec2.yml", "inventory/aws_ec2.yml"], ["ansible/ansible.cfg", "ansible.cfg"], ["ansible/group_vars/all/main.yml", "group_vars/all/main.yml"], ["ansible/group_vars/internal.yml", "group_vars/internal.yml"],
  ["vm-db/60-galera.cnf.j2", "vm-db/60-galera.cnf.j2"], ["vm-jenkins/docker-compose.yml", "vm-jenkins/docker-compose.yml"], ["vm-jenkins/Dockerfile", "vm-jenkins/Dockerfile"], ["vm-sonarqube/docker-compose.yml", "vm-sonarqube/docker-compose.yml"], ["vm-k8s/cluster-base.yaml.j2", "vm-k8s/cluster-base.yaml.j2"], ["vm-k8s/ecr-refresh.sh", "vm-k8s/ecr-refresh.sh"], ["vm-k8s/ecr-refresh.service", "vm-k8s/ecr-refresh.service"], ["vm-k8s/ecr-refresh.timer", "vm-k8s/ecr-refresh.timer"]];
JKX_SRC.an = [
  [/\{\{\s*(ecr_registry|aws_region|github_user|manifests_repo|db_app_user|db_app_password|sonar_db_password|django_[a-z_]+)\s*\}\}/, "group_vars/all/main.yml", "#1d8102", "ค่าที่คุณตั้งเองในไฟล์ group_vars"],
  [/hostvars|groups\[|private_ip_address|ansible_host|group_names/, "inventory (tag AWS)", "#7b3fe4", "ได้จากที่ Ansible ถาม AWS (ป้ายที่ Terraform ติดไว้): IP, กลุ่ม role"],
  [/ProxyCommand|ProxyJump/, "ผ่าน bastion", "#475569", "SSH กระโดดผ่านเครื่อง bastion เพราะเครื่องภายในรับ SSH จาก bastion เท่านั้น"],
  [/\{\{ playbook_dir \}\}\/\.\.\/vm-/, "ไฟล์ใน repo vm-*", "#a85a00", "โฟลเดอร์ vm-* ใน repo นี้ ถูกคัดลอกไปวางบนเครื่อง"],
  [/^\s*hosts:/, "กลุ่มจาก tag Role", "#7b3fe4", "เลือกเครื่องตามป้าย Role ที่ Terraform ติดไว้ (role_jenkins ฯลฯ)"],
  [/become: true/, "sudo", "#546e7a", "รันด้วยสิทธิ์ root บนเครื่องปลายทาง"],
  [/^\s*serial:/, "ทีละเครื่อง", "#c0392b", "ทำให้ครบทีละเครื่อง ไม่ทำพร้อมกัน (Galera ต้อง join ทีละ node)"]
];

// แปลง hosts: เช่น "role_db", "role_db[0]", "role_db[1:]", "role_k8s_server:role_k8s_dev" เป็นรายชื่อเครื่อง
function anHosts(expr) {
  var out = [], parts = String(expr || "").replace(/\[(\d*):(\d*)\]/g, "[$1;$2]").split(":");
  parts.forEach(function (p) {
    var m = /^([a-z0-9_]+)(?:\[(\d*)(;?)(\d*)\])?$/.exec(p.trim()); if (!m) return;
    var list = AN_MACH.filter(function (x) { return x[1].indexOf(m[1]) >= 0; }).map(function (x) { return x[0]; });
    if (m[2] !== undefined) { if (m[3]) list = list.slice(+m[2] || 0, m[4] === "" ? undefined : +m[4]); else list = list.slice(+m[2], +m[2] + 1); }
    list.forEach(function (n) { if (out.indexOf(n) < 0) out.push(n); });
  });
  return out;
}
function anMod(m) { return m ? String(m).replace(/^ansible\.[a-z]+\.|^kubernetes\.core\./, "") : ""; }
function anModInfo(m) { return AN_MOD[anMod(m)] || ["🔧", anMod(m) || "task", "", ""]; }

// ---- แบ่งไฟล์เป็นช่วง: playbook = ต่อ play / ต่อ task · ไฟล์อื่น = ต่อก้อนที่คั่นด้วยบรรทัดว่าง
function anSplit(text, file) {
  var lines = text.replace(/\n+$/, "").split("\n"), out = [], cur = null;
  var isPb = AN_PLAYBOOKS.indexOf(file) >= 0;
  function open(sec, i, kind) { cur = { sec: sec, lines: [], start: i, kind: kind }; out.push(cur); return cur; }
  if (!isPb) {
    lines.forEach(function (l, i) {
      if (!l.trim()) { cur = null; return; }
      if (!cur) open([null, l.replace(/^[#;\s-]+/, "").slice(0, 70) || "ส่วนที่ " + (out.length + 1), "", ""], i, "chunk");
      cur.lines.push(l);
    });
    return out;
  }
  lines.forEach(function (l, i) {
    var pm = /^- name:\s*(.*)$/.exec(l), tm = /^    - name:\s*(.*)$/.exec(l);
    if (pm) { open([null, "PLAY: " + pm[1], "", ""], i, "play"); }
    else if (tm) { open([null, tm[1], "", ""], i, "task"); }
    else if (!cur) { open([null, "หัวไฟล์", "บอกว่าไฟล์นี้ตั้งค่าเครื่องไหน และเอาไฟล์จากโฟลเดอร์ไหนไปวาง", ""], i, "head"); }
    cur.lines.push(l);
  });
  out.forEach(function (s) {
    while (s.lines.length && !s.lines[s.lines.length - 1].trim()) s.lines.pop();
    var txt = s.lines.join("\n");
    if (s.kind === "play") {
      var h1 = /^\s+hosts:\s*(.+)$/m.exec(txt), hs = h1 ? h1[1].trim() : "", names = anHosts(hs);
      s.hosts = hs; s.machines = names;
      s.sec[2] = "เล่นกับ **" + (names.length ? names.join(", ") : hs) + "** (`hosts: " + hs + "`)" + (/become:\s*true/.test(txt) ? " · ใช้ ==sudo==" : "") + (/serial:\s*1/.test(txt) ? " · ==ทีละเครื่อง==" : "");
      s.sec[3] = "";
    } else if (s.kind === "task") {
      var mm = /^      ([a-z_.]+):/m.exec(txt.split("\n").slice(1).join("\n")), mod = null, ml = txt.split("\n").slice(1).filter(function (x) { return /^      [a-z_.]+:/.test(x) && !/^      (when|register|loop|changed_when|args|vars|become|until|retries|delay|notify|tags):/.test(x); })[0];
      mod = ml ? /^      ([a-z_.]+):/.exec(ml)[1] : (mm ? mm[1] : null); s.mod = mod;
      var inf = anModInfo(mod), wh = /^\s+when:\s*(.+)$/m.exec(txt), dst = /^\s+dest:\s*(\S+)/m.exec(txt);
      s.sec[2] = inf[2] + (dst ? " → ปลายทาง `" + dst[1] + "`" : "") + (wh ? " · ทำเมื่อ `" + wh[1] + "`" : "");
      s.sec[3] = inf[3]; s.sec[1] = inf[0] + " " + s.sec[1];
    }
  });
  return out;
}
function anText(file) { var f = AN_FILES.filter(function (x) { return x[1] === file; })[0]; return f ? LABFILES[f[0]] || "" : ""; }
function anKind(file) { return /Dockerfile$/.test(file) ? "df" : /\.sh$/.test(file) ? "jf" : "an"; }

// ---- diagram + แอนิเมชัน: เครื่องทั้ง 10 ตัวกับ ansible-playbook site.yml
function anTheater() {
  var mach = {}, cards = {}, totals = {}, done = {}, stats = {}, plan = [];
  AN_PLAYBOOKS.forEach(function (f) { (ANSIBLE_PLAN[f] || []).forEach(function (pl) { if (pl.import) return; var hs = anHosts(pl.hosts); plan.push({ file: f, name: pl.name, hosts: hs, expr: pl.hosts, serial: pl.serial, tasks: pl.tasks }); hs.forEach(function (n) { totals[n] = (totals[n] || 0) + pl.tasks.length; }); }); });
  var grid = h("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px" });
  AN_MACH.forEach(function (m) {
    var bar = h("i", { style: "display:block;height:100%;width:0;background:" + m[2] + ";transition:width .3s;border-radius:99px" }), st = h("div", { style: "font-size:.72rem;color:var(--muted);min-height:2.4em;line-height:1.25;word-break:break-word", text: m[4] });
    var el = h("div", { style: "border:2px solid var(--line);border-radius:14px;padding:10px 12px;background:var(--surface);transition:border-color .25s, box-shadow .25s, opacity .25s" }, [h("div", { style: "display:flex;gap:8px;align-items:center" }, [h("span", { style: "font-size:1.3rem", text: m[3] }), h("div", {}, [h("b", { style: "font-size:.86rem", text: m[0] }), h("div", { style: "font-size:.68rem;font-weight:700;color:" + m[2], text: m[1][0] })])]), h("div", { style: "height:6px;border-radius:99px;background:color-mix(in srgb," + m[2] + " 15%,transparent);margin:8px 0 6px;overflow:hidden" }, [bar]), st]);
    mach[m[0]] = { el: el, bar: bar, st: st, def: m[4] }; grid.appendChild(el);
  });
  var banner = h("div", { style: "min-height:3.2em;margin:10px 0;padding:10px 14px;border-radius:12px;background:var(--accent-bg);border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);font-size:.9rem;line-height:1.6" });
  var recap = h("pre", { style: "margin:8px 0 0;padding:10px 14px;border-radius:12px;background:var(--code-bg);font:.78rem/1.55 var(--mono);overflow:auto;max-height:220px;white-space:pre", text: "" });
  function paint(name, state, text) {
    var m = mach[name]; if (!m) return; var c = { idle: "var(--line)", on: "var(--accent)", ok: "#1d8102", chg: "#b36b00", skip: "var(--line)" }[state];
    m.el.style.borderColor = c; m.el.style.boxShadow = state === "on" ? "0 0 0 4px color-mix(in srgb,var(--accent) 25%,transparent)" : "none"; m.el.style.opacity = state === "skip" ? ".55" : "1"; if (text != null) m.st.textContent = text;
    m.bar.style.width = Math.round(100 * (done[name] || 0) / (totals[name] || 1)) + "%";
  }
  function reset() { done = {}; stats = {}; AN_MACH.forEach(function (m) { paint(m[0], "idle", m[4]); mach[m[0]].el.style.opacity = "1"; }); recap.textContent = ""; banner.innerHTML = ""; banner.appendChild(document.createTextNode("กด ▶ เล่น เพื่อดู ")); banner.appendChild(h("code", { cls: "rch", text: "ansible-playbook site.yml" })); banner.appendChild(document.createTextNode(" ทำงานกับเครื่องทั้ง 10 ตัว (9 ตัวผ่าน bastion) ทีละ play")); }
  function note(n, kind) { var s = stats[n] = stats[n] || { ok: 0, changed: 0, skipped: 0 }; s[kind]++; done[n] = (done[n] || 0) + 1; }
  function say(parts) { banner.textContent = ""; parts.forEach(function (p) { banner.appendChild(typeof p === "string" ? document.createTextNode(p) : p); }); }
  var P = jkxPlayer(reset, function (P) {
    var st = [], lastFile = "";
    plan.forEach(function (pl) {
      st.push([500, function () { AN_MACH.forEach(function (m) { if (pl.hosts.indexOf(m[0]) < 0) paint(m[0], (done[m[0]] || 0) >= (totals[m[0]] || 0) && done[m[0]] ? "ok" : "idle"); else paint(m[0], "on", "รอ task…"); }); say([h("b", { text: "PLAY [" + pl.name + "]" }), h("div", { style: "color:var(--muted)", text: pl.file + " · hosts: " + pl.expr + " → " + pl.hosts.join(", ") + (pl.serial ? " · ทีละเครื่อง (serial " + pl.serial + ")" : "") })]); }]);
      pl.tasks.forEach(function (t) {
        var inf = anModInfo(t.module), kind = /^(stat|slurp|wait_for|set_fact)$/.test(anMod(t.module)) ? "ok" : "changed", targets = pl.serial ? pl.hosts.map(function (n) { return [n]; }) : [pl.hosts];
        targets.forEach(function (grp) {
          st.push([450, function () { grp.forEach(function (n) { paint(n, "on", inf[0] + " " + t.name); }); paint("pharmacy-bastion", "on", "ส่งต่อ SSH ไป " + grp.length + " เครื่อง"); say([h("b", { text: "TASK [" + t.name + "]" }), h("div", {}, [h("span", { cls: "rch", text: inf[0] + " " + inf[1] }), " ", h("span", { style: "color:var(--muted)", text: grp.join(", ") })]), t.when ? h("div", { style: "color:var(--muted)", text: "เงื่อนไข: " + t.when }) : null].filter(Boolean)); }]);
          st.push([450, function () { grp.forEach(function (n) { note(n, kind); paint(n, kind === "ok" ? "ok" : "chg", (kind === "ok" ? "ok: " : "changed: ") + t.name); }); paint("pharmacy-bastion", "idle", "พักรอ task ถัดไป"); }]);
        });
      });
      st.push([300, function () { pl.hosts.forEach(function (n) { paint(n, "ok"); }); }]);
    });
    st.push([500, function () {
      var L = ["PLAY RECAP " + "*".repeat(40)]; AN_MACH.forEach(function (m) { var s = stats[m[0]] || { ok: 0, changed: 0, skipped: 0 }; L.push(m[0].padEnd(20) + ": ok=" + String(s.ok + s.changed).padEnd(3) + " changed=" + String(s.changed).padEnd(3) + " unreachable=0  failed=0  skipped=" + s.skipped); paint(m[0], "ok", "เสร็จแล้ว"); });
      recap.textContent = L.join("\n"); say([h("b", { text: "✓ เสร็จ: ทุกเครื่องถูกตั้งค่าครบ" }), h("div", { style: "color:var(--muted)", text: "รันซ้ำอีกครั้ง Ansible จะข้ามสิ่งที่ตรงอยู่แล้ว (changed=0)" })]);
    }]);
    P.start(st);
  }, "▶ เล่น: ansible-playbook site.yml");
  reset();
  return h("div", {}, [h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 10px" }, P.ctl), h("div", { style: "display:flex;gap:14px;align-items:center;margin:0 0 10px;flex-wrap:wrap" }, [h("div", { style: "padding:10px 14px;border:2px solid var(--line);border-radius:14px;background:var(--surface);font-weight:700", text: "💻 laptop (ansible/)" }), h("span", { style: "color:var(--muted);font-size:.84rem", text: "──── SSH เข้า bastion ➜ กระโดดต่อไปเครื่องภายใน (private IP) · รายชื่อเครื่องมาจาก tag ของ AWS ────▶" })]), grid, banner, recap]);
}

// ---- รายละเอียดทีละเครื่อง: เลือกเครื่องแล้วดูว่า Ansible ทำอะไรกับเครื่องนั้นบ้าง และวางไฟล์อะไรไว้ที่ไหน
function anMachinePanel() {
  var sel = h("label", { style: "font-size:.82rem;display:inline-flex;gap:6px;align-items:center" }, ["เครื่อง", h("select", { "aria-label": "เครื่อง", onchange: function (e) { AN.m = e.target.value; render(); } }, [["", "ทุกเครื่อง"]].concat(AN_MACH.map(function (m) { return [m[0], m[0]]; })).map(function (o) { return h("option", { value: o[0], text: o[1], selected: AN.m === o[0] ? "selected" : null }); }))]);
  var box = h("div", {}, []); if (!AN.m) return { sel: sel, panel: null };
  var m = AN_MACH.filter(function (x) { return x[0] === AN.m; })[0], rows = [], files = [];
  AN_PLAYBOOKS.forEach(function (f) { anSplit(anText(f), f).forEach(function (s, i, all) { if (s.kind !== "play" || s.machines.indexOf(AN.m) < 0) return; var tasks = []; for (var j = i + 1; j < all.length && all[j].kind === "task"; j++) tasks.push(all[j]); rows.push({ f: f, play: s, tasks: tasks });
    tasks.forEach(function (t) { var tx = t.lines.join("\n"), d = /^\s+dest:\s*(\S+)/m.exec(tx), sr = /^\s+src:\s*"?([^"\n]+)"?/m.exec(tx); if (d && /^(copy|template|file)$/.test(anMod(t.mod))) files.push([sr ? sr[1].replace(/\{\{ playbook_dir \}\}\/\.\.\//, "") : "(เขียนจาก content: ในไฟล์ playbook)", d[1], f]); }); }); });
  var nT = rows.reduce(function (a, r) { return a + r.tasks.length; }, 0);
  return { sel: sel, panel: h("div", { cls: "card", style: "margin-top:12px;border-left:5px solid " + m[2] }, [h("div", { cls: "cb" }, [h("h2", { style: "margin-top:0", text: m[3] + " " + m[0] }), infoCard([["role", m[2], "กลุ่ม `" + m[1][0] + "` · " + m[4]], ["สรุป", "#1d8102", "ถูกเล่น **" + rows.length + "** play · **" + nT + "** task · วางไฟล์ **" + files.length + "** ไฟล์"]]),
    h("h3", { text: "ลำดับสิ่งที่ Ansible ทำกับเครื่องนี้" }), h("ol", { style: "line-height:1.9;padding-left:22px;margin:0" }, rows.map(function (r) { return h("li", {}, [h("b", { text: r.play.sec[1].replace(/^PLAY: /, "") }), h("span", { style: "color:var(--muted)", text: "  (" + r.f + ")" }), h("ul", { style: "margin:2px 0 8px;padding-left:20px" }, r.tasks.map(function (t) { return h("li", {}, [h("span", { text: t.sec[1] })]); }))]); })),
    files.length ? h("div", {}, [h("h3", { text: "ไฟล์ที่ถูกวางบนเครื่องนี้" }), h("div", { cls: "twrap" }, [h("table", {}, [h("thead", {}, [h("tr", {}, [h("th", { text: "ต้นทาง (ใน repo)" }), h("th", { text: "→ ปลายทาง (บนเครื่อง)" }), h("th", { text: "จาก playbook" })])]), h("tbody", {}, files.map(function (f) { return h("tr", {}, [h("td", {}, [h("code", { cls: "rch", text: f[0] })]), h("td", {}, [h("code", { cls: "rch", text: f[1] })]), h("td", { text: f[2] })]); }))])])]) : null])]) };
}

// ---- ส่วนโค้ด: เลือกไฟล์ + มุมมอง (แบ่งช่วง/ไฟล์เต็ม) + ธีม
function anCode() {
  var file = AN.file, text = anText(file), kind = anKind(file), T = JKX_THEME[JKX.theme] || JKX_THEME.github, secs = anSplit(text, file), mp = anMachinePanel();
  if (AN.m && AN_PLAYBOOKS.indexOf(file) >= 0) { var keep = true; secs = secs.filter(function (s) { if (s.kind === "play") keep = s.machines.indexOf(AN.m) >= 0; return s.kind === "head" || keep; }); }
  var pal = JKX_PAL, wrap = h("div", {});
  function seg(label, key, opts) { return h("label", { style: "font-size:.82rem;display:inline-flex;gap:6px;align-items:center" }, [label, h("select", { "aria-label": label, onchange: function (e) { AN[key] = e.target.value; render(); } }, opts.map(function (o) { return h("option", { value: o[0], text: o[1], selected: AN[key] === o[0] ? "selected" : null }); }))]); }
  wrap.appendChild(h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 12px" }, [seg("ไฟล์", "file", AN_FILES.map(function (f) { return [f[1], f[1]]; })), mp.sel, jkxViewSel(), codeThemeSel()]));
  var box = h("div", { style: "font-family:var(--mono);font-size:.8rem;line-height:1.6" });
  if (JKX.view === "full") {
    var all = text.replace(/\n+$/, "").split("\n"), owner = [], cont = h("div", { style: "background:" + T[1] + ";color:" + T[2] + ";border-radius:8px;padding:10px 0;overflow-x:auto" + (T[1] === "transparent" ? ";border:1px solid var(--line)" : "") });
    var sp = anSplit(text, file); sp.forEach(function (s, n) { for (var i = 0; i < s.lines.length; i++) owner[s.start + i] = { n: n, first: i === 0 }; });
    all.forEach(function (l, i) { var o = owner[i], col = o ? pal[o.n % pal.length] : "transparent"; cont.appendChild(jkxLine(l, kind, i + 1, col, o && o.first ? (o.n + 1) + ". " + sp[o.n].sec[1].slice(0, 40) : "", o ? o.n : null)); });
    box.appendChild(cont);
  } else secs.forEach(function (s, n) {
    var col = s.kind === "play" ? "#7b3fe4" : pal[(n + 1) % pal.length], el = h("div", { style: "border-left:5px solid " + col + ";background:" + hexA(col, 0.08) + ";border-radius:8px;margin:0 0 10px;overflow-x:auto" });
    el.appendChild(h("div", { style: "padding:8px 14px;border-bottom:1px solid " + hexA(col, 0.22) + ";font-family:var(--ui,system-ui);font-size:.88rem;line-height:1.6;white-space:normal" }, [h("b", { style: "color:" + col, text: s.sec[1] }), s.sec[2] ? h("div", {}, [h("span", { style: "color:var(--muted)", text: "ทำอะไร: " })].concat(rich(s.sec[2]))) : null, s.sec[3] ? h("div", { style: "color:var(--muted)", text: (/^แบบเล่นๆ|^รันซ้ำ|^ติดตั้งซ้ำ|^ทำต่อ|^ลืม/.test(s.sec[3]) ? "เทียบกับ" : "") + (/^แบบเล่นๆ/.test(s.sec[3]) ? s.sec[3].replace(/^แบบเล่นๆ:?\s*/, "แบบเล่นๆ: ") : ": " + s.sec[3]) }) : null]));
    el.appendChild(h("div", { style: "padding:8px 0;background:" + T[1] + ";color:" + T[2] }, s.lines.map(function (l, i) { return jkxLine(l, kind, s.start + i + 1); }))); box.appendChild(el);
  });
  var cd = fold("anc", file + (JKX.view === "full" ? " (ไฟล์เต็ม · เส้นสีซ้าย = ช่วง)" : " (" + secs.length + " ช่วง)")); cd.className = "fold card"; cd.style.padding = "8px 14px 12px"; cd.appendChild(box); wrap.appendChild(cd);
  if (mp.panel) wrap.insertBefore(mp.panel, cd);
  return wrap;
}

function ansibleTab() {
  var cb = h("div", { cls: "cb" });
  cb.appendChild(infoCard([["ทำอะไร", "#2b6cb0", "**ตั้งค่าเครื่อง**ทั้ง 10 ตัวที่ Terraform สร้างไว้ (ลง Docker / k3s / MariaDB, วางไฟล์, เปิดบริการ) แทนการ SSH ทำมือทีละเครื่อง"], ["กลุ่ม role_* มาจากไหน", "#7b3fe4", "**ไม่มีไฟล์ไหนสร้างกลุ่ม** · ทุกครั้งที่รัน `ansible-inventory` / `ansible-playbook` Ansible ถาม AWS (`aws_ec2`) หาเครื่องที่ติดป้าย **Project=pharmacy** แล้วแยกกลุ่มตามป้าย **Role** ที่ ==Terraform ติดไว้== ➜ `role_db`, `role_sonarqube` ฯลฯ"], ["ถึงจะเห็นกลุ่ม ต้องมี", "#b36b00", "① เครื่อง **running** อยู่ (หลัง `terraform apply`) ② ตั้ง **aws credentials** แล้ว (`aws configure`) · ขาดอย่างใดอย่างหนึ่ง `ansible-inventory --graph` จะว่างเปล่า"], ["ลำดับ", "#1d8102", "`site.yml` เรียก **db ➜ k8s ➜ sonarqube ➜ jenkins** · รันซ้ำได้ปลอดภัย (ข้ามสิ่งที่ตรงอยู่แล้ว)"], ["เข้าเครื่องยังไง", "#475569", "เครื่องภายในไม่มี public IP / SG รับ SSH จาก bastion เท่านั้น ➜ Ansible ต่อ **ผ่าน bastion** ด้วย private IP (ตั้งใน `group_vars/internal.yml`)"]]));
  cb.appendChild(h("div", { style: "display:flex;gap:8px;margin:0 0 10px" }, [foldBar()]));
  var a = fold("antheater", "แอนิเมชัน: ansible-playbook site.yml ทำอะไรกับเครื่องแต่ละตัว"), card = h("div", { cls: "card", style: "margin-bottom:14px;padding:8px 14px 14px" }); a.appendChild(anTheater()); card.appendChild(a); cb.appendChild(card);
  cb.appendChild(anCode());
  return cb;
}
FOLD.antheater = 1; FOLD.anc = 1;
PAGES["lab-ansible"] = function () { return h("div", {}, [crumbEl("Lab › Ansible"), h("h1", { text: "Ansible" }), h("div", { cls: "card" }, [ansibleTab()])]); };
