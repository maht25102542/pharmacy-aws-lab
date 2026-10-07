// รัน: node tools/console-lab/build.js  → ประกอบ src/ เป็น index.html (ไฟล์เดียว เปิดในเบราว์เซอร์ได้เลย)
const fs = require("fs"), path = require("path");
const here = __dirname, src = (p) => fs.readFileSync(path.join(here, "src", p), "utf8");
const yaml = require("./yaml-lite.js"), root = path.resolve(here, "..", "..");
// ---- ข้อมูลจาก repo ที่ฝังในหน้า: ไฟล์ทั้งหมดของ lab (terraform/ ansible/ vm-*/) และแผนของ playbook ที่แยกเป็นโครงแล้ว
const LABFILES = {};
function walk(rel) {
  const abs = path.join(root, rel);
  fs.readdirSync(abs, { withFileTypes: true }).forEach((e) => {
    const r = rel + "/" + e.name;
    if (e.isDirectory()) { if (!/^(\.terraform|node_modules)$/.test(e.name)) walk(r); }
    else if (!/\.(tfstate|backup)$|^terraform\.tfvars$|^\.terraform\.lock\.hcl$|^terraform\.yml$/.test(e.name)) LABFILES[r] = fs.readFileSync(path.join(root, r), "utf8");
  });
}
["terraform", "ansible"].concat(fs.readdirSync(root).filter((d) => /^vm-/.test(d))).forEach(walk);
const RESERVED = ["name", "when", "register", "loop", "block", "args", "until", "retries", "delay", "changed_when", "vars", "become", "tags", "ignore_errors"];
function flatten(tasks, inherit, out) {
  (tasks || []).forEach((t) => {
    const when = [inherit, t.when].filter(Boolean).join(" and ") || null;
    if (t.block) { flatten(t.block, when, out); return; }
    const mod = Object.keys(t).filter((k) => RESERVED.indexOf(k) < 0)[0] || null;
    out.push({ name: t.name || "(unnamed)", module: mod, when: when, register: t.register || null, loop: t.loop || null, creates: t.args && t.args.creates || null });
  });
  return out;
}
const ANSIBLE_PLAN = {};
Object.keys(LABFILES).filter((f) => /^ansible\/[a-z0-9_-]+\.yml$/.test(f)).forEach((f) => {
  const doc = yaml.parse(LABFILES[f]) || [];
  ANSIBLE_PLAN[f.slice(8)] = doc.map((pl) => pl.import_playbook ? { import: pl.import_playbook } : { name: pl.name, hosts: pl.hosts, become: !!pl.become, serial: pl.serial || null, vars: pl.vars || {}, tasks: flatten(pl.tasks, null, []) });
});
const DATA = "var LABFILES = " + JSON.stringify(LABFILES).replace(/<\//g, "<\\/") + ";\nvar ANSIBLE_PLAN = " + JSON.stringify(ANSIBLE_PLAN).replace(/<\//g, "<\\/") + ";";
const parts = [src("engine.js"), "// ---- generated data (build.js)\n" + DATA];
const modDir = path.join(here, "src", "mod");
fs.readdirSync(modDir).filter((f) => f.endsWith(".js")).sort().forEach((f) => parts.push("// ---- mod/" + f + "\n" + src("mod/" + f)));
const html = src("template.html").replace("/*SCRIPT*/", () => parts.join("\n") + "\n//==UI==\n" + src("ui.js"));
fs.writeFileSync(path.join(here, "index.html"), html);
console.log("built index.html", html.length, "bytes");
