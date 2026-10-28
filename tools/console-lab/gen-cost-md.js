// สร้าง COST.md ของแต่ละ labs/NN-* + COST.md ที่ root จากข้อมูลชุดเดียวกับหน้า Lab › ค่าใช้จ่าย & Bill (src/mod/61-cost-data.js)
const fs = require("fs"), vm = require("vm"), path = require("path");
const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, "src/mod/61-cost-data.js"), "utf8"), ctx);
const D = vm.runInContext("COSTD", ctx), sum = vm.runInContext("costSum", ctx), HRS = vm.runInContext("COST_HRS", ctx);
const money = (n) => "$" + (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n));
const moneyH = (n) => "$" + (n < 1 ? n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") : n.toFixed(2));
const THB = vm.runInContext("COST_THB", ctx), baht = (u) => "฿" + Math.round(u * THB).toLocaleString("en-US");
const verdict = vm.runInContext("costVerdict", ctx), LV = vm.runInContext("COST_LV", ctx);
const strip = (t) => t.replace(/\*\*/g, "**").replace(/==/g, "**");
const exTable = (ex) => !ex || !ex.length ? "" : "\n\n**ตัวอย่างรายการที่คิดตามการใช้** (บวกเพิ่มจากรายการคงที่ด้านบน)\n\n| สถานการณ์ | สมมติว่าใช้ | ≈ ต่อเดือน |\n|---|---|---|\n" + ex.map((x) => `| ${x.n}${x.free ? " — หักแล้ว: " + x.free : ""} | ${x.a} | ${baht(x.usd)} (${money(x.usd)}) |`).join("\n");
const table = (items, ex) => {
  const rows = items.map((x) => `| ${x.n}${x.note ? " — " + x.note : ""} | ${x.k === "use" ? x.unit : x.k === "hr" ? moneyH(x.r * x.q) + "/ชม." : money(x.r * x.q) + "/เดือน"} | ${x.k === "use" ? "–" : money(x.k === "hr" ? x.r * x.q * HRS : x.r * x.q)} | ${x.idle ? "คิดเงิน" : "ไม่คิด"} |`);
  const s = sum(items); rows.push(`| **รวมรายการคงที่** | ${moneyH(s.hr)}/ชม. | **${money(s.month)} (${baht(s.month)})** | |`);
  return "| รายการ | คิดตาม | ≈ ต่อเดือน (730 ชม.) | ตอนไม่มีคนใช้ |\n|---|---|---|---|\n" + rows.join("\n") + exTable(ex);
};
const CAV = "> ✓ ราคา On-Demand ap-southeast-1 (USD) **ตรวจกับ AWS Price List API เมื่อ 28 ต.ค. 2026** · ไม่รวมภาษี/ค่าโอนข้อมูลตามการใช้จริง · โควต้า free tier มาจากเอกสาร AWS · ราคาเปลี่ยนได้ ตรวจซ้ำที่ <https://calculator.aws> ก่อนตัดสินใจ · แก้ตัวเลขที่ `tools/console-lab/src/mod/61-cost-data.js` แล้วรัน `node gen-cost-md.js`";
const gen = D.gen.map((g) => `- **${g[0]}**: ${strip(g[2])}`).join("\n");
const DIRS = { static: "01-static-site", ecs: "02-ecs-fargate", sls: "03-serverless", cd: "04-cicd", gha: "05-github-actions", single: "06-single-vm", apr: "07-app-runner" };
Object.keys(DIRS).forEach((k) => {
  const c = D.uc[k], s = sum(c.items), dir = path.join(__dirname, "../../labs", DIRS[k]);
  const md = `# ค่าใช้จ่าย & bill management — ${c.title}\n\n> ${c.big}\n\n- เปิดทิ้งไว้ 1 เดือน ≈ **${money(s.month)} (${baht(s.month)})** (เฉพาะรายการคงที่ · อัตราสมมติ ${THB} บาท/ดอลลาร์)\n- **ราคานี้ถือว่า: ${LV[verdict(s.month, c.bench).i][0]}** — ${c.benchRef} · ${c.benchWhy}
- ทำ lab 4 ชั่วโมงแล้ว \`terraform destroy\` ≈ **${money(s.perHours(4))} (${baht(s.perHours(4))})**\n\n${table(c.items, c.ex)}\n\n${CAV}\n\n## อะไรทำให้บิลพุ่ง\n${c.drivers.map((x) => "- " + x).join("\n")}\n\n## ลดค่าใช้จ่าย\n${c.cut.map((x) => "- " + x).join("\n")}\n\n## ตั้งเตือน / จับตา\n${c.watch.map((x) => "- " + x).join("\n")}\n\n## หยุดจ่ายเมื่อเลิกใช้\n${strip(c.stop)}\n\n## จัดการ bill ทั่วไป (ทุก lab)\n${gen}\n\nดูในหน้า Console Lab: Lab › **ค่าใช้จ่าย & Bill** และ Lab › Use case จริง › ${c.title.split(" ")[0]}…\n`;
  fs.writeFileSync(path.join(dir, "COST.md"), md);
});
const ml = ["vm", "managed"].map((k) => { const c = D.mainlab[k], s = sum(c.items); return `## ${c.title}\n\n- เปิดทิ้ง 1 เดือน ≈ **${money(s.month)}** · ทำ 4 ชม. ≈ **${money(s.perHours(4))}**\n- ${c.note}\n\n${table(c.items, c.ex)}\n`; }).join("\n");
fs.writeFileSync(path.join(__dirname, "../../COST.md"), `# ค่าใช้จ่าย & bill management ของทุก lab\n\n${CAV}\n\n## จัดการ bill ทั่วไป\n${gen}\n\n${ml}\n## lab ย่อย\nดูไฟล์ \`COST.md\` ในแต่ละ \`labs/NN-*/\`\n`);
console.log("ok");
