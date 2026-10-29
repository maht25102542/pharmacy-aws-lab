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
    if (e.isDirectory()) { if (!/^(\.terraform|node_modules|\.next|__pycache__|staticfiles|\.pytest_cache)$/.test(e.name)) walk(r); }
    else if (!/\.(tfstate|backup)$|^terraform\.tfvars$|^\.terraform\.lock\.hcl$|^package-lock\.json$|^db\.sqlite3$|^terraform\.yml$/.test(e.name)) LABFILES[r] = fs.readFileSync(path.join(root, r), "utf8");
  });
}
["terraform", "terraform-managed", "labs", "ansible", "repo-backend", "repo-frontend", "repo-manifests"].concat(fs.readdirSync(root).filter((d) => /^vm-/.test(d))).forEach(walk);
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
const ITYPE_ALL = JSON.parse(fs.readFileSync(path.join(__dirname, "data/instance-types-sg-linux.json"), "utf8"));
// ไอคอนบริการ AWS (AWS Architecture Icons จาก awslabs/aws-icons-for-plantuml, 64px) + โลโก้เครื่องมือ (simple-icons, CC0) ฝังเป็น data URI
const AWS_ICONS = {}; fs.readdirSync(path.join(here, "data/icons")).filter((f) => /\.png$/.test(f)).forEach((f) => { AWS_ICONS[f.replace(/\.png$/, "")] = "data:image/png;base64," + fs.readFileSync(path.join(here, "data/icons", f)).toString("base64"); });
const BRAND_COLOR = { github: "181717", jenkins: "D24939", sonarqubeserver: "4E9BCD", argo: "EF7B4D", terraform: "844FBA", ansible: "EE0000", docker: "2496ED", kubernetes: "326CE5", nginx: "009639", django: "092E20", nextdotjs: "000000", python: "3776AB", mariadb: "003545" };
const BRAND_ICONS = {}; fs.readdirSync(path.join(here, "data/brands")).filter((f) => /\.svg$/.test(f)).forEach((f) => { const k = f.replace(/\.svg$/, ""); let t = fs.readFileSync(path.join(here, "data/brands", f), "utf8").replace(/<title>[^<]*<\/title>/, ""); t = t.replace("<svg ", '<svg fill="#' + (BRAND_COLOR[k] || "333333") + '" '); BRAND_ICONS[k] = "data:image/svg+xml;base64," + Buffer.from(t).toString("base64"); });
const DATA = "var AWS_ICONS = " + JSON.stringify(AWS_ICONS) + ";\nvar BRAND_ICONS = " + JSON.stringify(BRAND_ICONS) + ";\nvar ITYPE_ALL = " + JSON.stringify(ITYPE_ALL) + ";\nvar LABFILES = " + JSON.stringify(LABFILES).replace(/<\//g, "<\\/") + ";\nvar ANSIBLE_PLAN = " + JSON.stringify(ANSIBLE_PLAN).replace(/<\//g, "<\\/") + ";";
const parts = [src("engine.js"), "// ---- generated data (build.js)\n" + DATA];
const modDir = path.join(here, "src", "mod");
fs.readdirSync(modDir).filter((f) => f.endsWith(".js")).sort().forEach((f) => parts.push("// ---- mod/" + f + "\n" + src("mod/" + f)));
const html = src("template.html").replace("/*SCRIPT*/", () => parts.join("\n") + "\n//==UI==\n" + src("ui-icons.js") + "\n" + src("ui.js") + "\n" + src("ui-flow.js") + "\n" + src("ui-jenkins.js") + "\n" + src("ui-jenkins2.js") + "\n" + src("ui-argoimg.js") + "\n" + src("ui-select.js") + "\n" + src("ui-ansible.js") + "\n" + src("ui-system.js") + "\n" + "\n" + src("ui-managed.js") + "\n" + "\n" + src("ui-aws2.js") + "\n" + "\n" + src("ui-aws3.js") + "\n" + src("ui-usecase.js") + "\n" + src("ui-aws4.js") + "\n" + src("ui-aws5.js") + "\n" + src("ui-aws6.js") + "\n" + src("ui-real.js") + "\n" + src("ui-services.js") + "\n" + src("ui-aws7.js") + "\n" + src("ui-aws8.js") + "\n" + src("ui-aws9.js") + "\n" + src("ui-aws10.js") + "\n" + src("ui-pharmapp.js") + "\n" + src("ui-ghauth.js") + "\n" + src("ui-ghsettings.js") + "\n" + src("ui-ghrepo.js") + "\n" + src("ui-ghmore.js") + "\n" + src("ui-github.js") + "\n" + src("ui-browser2.js") + "\n" + src("ui-cost.js"));
const script = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
if (/<\/script/i.test(script)) throw new Error("build: </script> inside script source (split it, e.g. \"</scr\" + \"ipt>\")");
fs.writeFileSync(path.join(here, "index.html"), html);
console.log("built index.html", html.length, "bytes");
