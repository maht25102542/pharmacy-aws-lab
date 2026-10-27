const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n, e.message.slice(0, 300)); await L.finish(); process.exit(1); } } } };
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["DynamoDB", "DynamoDB"], ["IAM role", "IAM"], ["Lambda", "Lambda"], ["API Gateway", "API Gateway"], ["เปิดเว็บ", "🌐"]]);
  await L.cap("Use case 3 · Serverless API: API Gateway + Lambda + DynamoDB", "use case สาม API แบบ serverless ไม่มีเครื่องให้ดูแลเลย ใช้ API Gateway รับ request ส่งให้ Lambda ทำงาน และเก็บข้อมูลใน DynamoDB จ่ายตามจำนวนที่เรียกใช้จริง"); await L.hold(1);
  await L.ev(`fresh(); UI.sel={}; render(); 1`);
  // 1 DynamoDB
  await L.intro(0, "DynamoDB", "ฐานข้อมูล NoSQL ไม่ต้องดูแลเครื่อง", "ขั้นแรก สร้างฐานข้อมูล DynamoDB ซึ่งเป็น NoSQL ที่ไม่ต้องดูแลเครื่อง");
  await L.cap("① Services › Database › DynamoDB › Create table", "เปิด Services เลือกหมวด Database แล้วเลือก DynamoDB กด Create table"); await svc("DynamoDB", "Database"); await L.click(B("Create table", { nth: 0 }));
  await L.cap("② ชื่อ table pharmacy-drugs-dev · Partition key id (String) · On-demand", "ตั้งชื่อตารางว่า pharmacy drugs dev กำหนด partition key เป็น id ชนิด String และเลือก On-demand จ่ายตามการใช้จริง ไม่ต้องเดา capacity");
  await step("tn", async () => { await L.fill("Table name", "pharmacy-drugs-dev"); }); await L.hold(2);
  await L.click(B("Create table", { nth: 0 })); await L.hold(1.5);
  await L.cap("③ เพิ่มข้อมูลยา: เลือก table › Create item (id, name, stock, price)", "เพิ่มข้อมูลยาลงตาราง กดที่ชื่อตาราง แล้วกด Create item กรอก id ชื่อยา จำนวนคงเหลือ และราคา");
  await step("tsel", async () => { await L.click({ t: "pharmacy-drugs-dev", tag: "a", starts: true }); });
  const items = [["1", "Paracetamol 500mg", "120", "2.5"], ["2", "Amoxicillin 250mg", "60", "8"]];
  for (const it of items) {
    await step("ci" + it[0], async () => { await L.click(B("Create item", { nth: 0 })); });
    await step("i-id" + it[0], async () => { await L.fill("id (partition key)", it[0]); });
    await step("i-nm" + it[0], async () => { await L.fill("name", it[1]); });
    await step("i-st" + it[0], async () => { await L.fill("stock", it[2]); });
    await step("i-pr" + it[0], async () => { await L.fill("price", it[3]); });
    await L.hold(0.8); await L.click(B("Create item", { nth: 0 })); await L.hold(1.2);
    if (it[0] === "1") { await L.cap("เพิ่มรายการที่ 2: Amoxicillin 250mg", "เพิ่มยาอีกหนึ่งรายการด้วยวิธีเดียวกัน"); await step("tsel2", async () => { await L.click({ t: "pharmacy-drugs-dev", tag: "a", starts: true }); }); }
  }
  await L.tick(0, "ตารางพร้อมแล้ว", "ตารางพร้อมใช้งาน มีข้อมูลยาสองรายการ");
  // 2 IAM role
  await L.intro(1, "IAM", "สิทธิ์ของ Lambda ไปแตะ DynamoDB", "ต่อมา IAM สร้าง role ที่ Lambda จะสวมตอนรัน ให้เขียน log และอ่านเขียนตาราง DynamoDB ได้");
  await L.cap("④ IAM › Roles › Create role › AWS service › Lambda", "เปิด IAM ไปที่ Roles กด Create role เลือก AWS service และ use case เป็น Lambda"); await svc("IAM", "Security, Identity, & Compliance"); await L.click(B("Roles")); await L.click(B("Create role", { nth: 0 }));
  await step("luc", async () => { await L.pickBtn("EC2", "Lambda"); }); await L.hold(0.8); await L.click(B("Next"));
  await L.cap("⑤ Policy: AWSLambdaBasicExecutionRole (เขียน log) + ค้นหา DynamoDB แล้วติ๊ก AmazonDynamoDBFullAccess", "นโยบายแรกคือ Lambda Basic Execution Role ให้เขียน log ติ๊กไว้ให้แล้ว แล้วค้นหาคำว่า DynamoDB และติ๊ก AmazonDynamoDBFullAccess ให้อ่านเขียนตารางได้ ของจริงควรจำกัดเฉพาะตารางนี้ แต่ในแล็บใช้ตัวสำเร็จรูปก่อน");
  await L.hold(1.5); await step("psrch", async () => { await L.type("main input[type=search]", "DynamoDB"); }); await L.hold(0.8);
  await step("ptick", async () => { await L.ev(`[].slice.call(document.querySelectorAll("main tbody tr")).forEach(function(r){ if((r.innerText||"").indexOf("AmazonDynamoDBFullAccess")===0||(r.innerText||"").trim().indexOf("AmazonDynamoDBFullAccess")===0){ var c=r.querySelector("input[type=checkbox]"); if(c) c.setAttribute("data-tk","1"); } }); 1`); await L.click("[data-tk]"); });
  await L.hold(1.2); await L.click(B("Next"));
  await L.cap("⑥ ตั้งชื่อ role: pharmacy-api-dev-lambda → Create role", "ตั้งชื่อ role ว่า pharmacy api dev lambda แล้วกด Create role");
  await step("rnm", async () => { await L.fill("Role name", "pharmacy-api-dev-lambda"); });
  await L.click(B("Create role", { nth: 0 })); await L.hold(1.2);
  await L.tick(1, "role พร้อมแล้ว", "สร้าง role เรียบร้อย");
  // Lambda
  await L.intro(2, "Lambda", "รันโค้ดโดยไม่ต้องมีเครื่อง", "นี่คือ Lambda บริการรันโค้ดโดยไม่ต้องมีเครื่อง");
  await L.cap("① Lambda › Functions › Create function", "เปิด Lambda แล้วกด Create function"); await svc("Lambda", "Compute"); await L.click(B("Create function"));
  await L.cap("② ชื่อ function pharmacy-api-dev · runtime python3.12", "ตั้งชื่อ function ว่า pharmacy api dev ใช้ runtime python สามจุดสิบสอง");
  await step("fname", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); });
  await step("fname2", async () => { await L.sleep(400); await L.type("main input[placeholder]", "pharmacy-api-dev"); });
  await L.cap("③ Execution role: Use an existing role → pharmacy-api-dev-lambda", "ส่วน execution role เลือก Use an existing role แล้วเลือก role ที่เตรียมไว้");
  await step("rolemode", async () => { await L.click({ t: "Use an existing role", tag: "label,div,span", starts: true }); });
  await step("role", async () => { await L.pickBtn("เลือก role", "pharmacy-api-dev-lambda"); });
  await L.cap("④ Environment variable TABLE_NAME = pharmacy-drugs-dev (โค้ดรู้ว่าจะอ่านตารางไหน)", "ตั้งตัวแปร TABLE NAME ให้ชี้ไปที่ตาราง pharmacy drugs dev เพื่อให้โค้ดรู้ว่าจะอ่านตารางไหน");
  await step("table", async () => { await L.pickBtn("ไม่ตั้ง", "pharmacy-drugs-dev"); });
  await L.cap("⑤ Create function", "กด Create function"); await L.click(B("Create function", { nth: 0 })); await L.hold(1.5);
  await L.tick(2, "Lambda สร้างแล้ว", "สร้าง Lambda เรียบร้อย");
  // API Gateway
  await L.intro(3, "API Gateway", "ประตูหน้า รับ HTTP แล้วส่งต่อให้ Lambda", "นี่คือ API Gateway ประตูหน้าที่รับ HTTP request แล้วส่งต่อให้ Lambda");
  await L.cap("⑥ API Gateway › Create API (HTTP API)", "เปิด API Gateway แล้วกด Create API แบบ HTTP API"); await svc("API Gateway", "Networking & Content Delivery"); await L.click(B("Create API", { nth: 0 }));
  await L.cap("⑦ ชื่อ API + เลือก Lambda เป็น integration", "ตั้งชื่อ API แล้วเลือก Lambda ที่เพิ่งสร้างเป็น integration");
  await step("aname", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); });
  await step("aname2", async () => { await L.sleep(400); await L.type("main input[placeholder]", "pharmacy-api-dev"); });
  await step("afn", async () => { await L.pickBtn("เลือก function", "pharmacy-api-dev"); });
  await L.cap("⑧ Routes: GET /drugs และ POST /drugs · Stage: dev", "เส้นทางมีสองอัน GET drugs สำหรับดูรายการ และ POST drugs สำหรับเพิ่มข้อมูล ส่วน stage ตั้งเป็น dev"); await L.hold(2.5);
  await L.cap("⑨ Create — console เพิ่ม permission ให้ API Gateway เรียก Lambda ให้เอง", "กด Create ข้อควรรู้คือ console เพิ่มสิทธิ์ให้ API Gateway เรียก Lambda ให้เองอัตโนมัติ แต่ถ้าใช้ Terraform ต้องเขียนเอง"); await L.click(B("Create", { nth: 0 })); await L.hold(1.5);
  await L.tick(3, "API พร้อมแล้ว", "API Gateway พร้อมใช้งาน");
  // Browser
  await L.intro(4, "Browser", "ทดสอบเรียก API จริง", "มาทดสอบเรียก API กัน");
  const url = await L.ev(`apiInvokeUrl(S.apis[0], S.apis[0].stages[0]) + "/drugs"`);
  await L.cap("⑩ แท็บ Browser → GET …/dev/drugs", "ไปที่แท็บ Browser แล้วเรียก GET drugs ของ API"); await L.click(B("Browser", { nth: 0 }));
  await step("br", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); });
  await step("br2", async () => { await L.sleep(400); await L.type("main input[placeholder], main input[type=text]", url); });
  await L.click(B("Go")); await L.hold(2.5);
  console.log("END", (await L.ev(`document.body.innerText`)).replace(/\s+/g, " ").slice(0, 900));
  await L.tick(4, "ได้ข้อมูลยา 200", "ได้ข้อมูลยากลับมา สถานะสองร้อย");
  await L.costScene("sls", "เรื่องค่าใช้จ่าย serverless จ่ายตามการเรียกใช้จริง ไม่มีคนใช้ก็แทบไม่เสียเงิน และมีโควต้าฟรีของ Lambda หนึ่งล้านครั้งต่อเดือน แต่ต้องระวัง log ของ CloudWatch ที่มักเป็นก้อนใหญ่ที่คนลืม และ Lambda ที่วนลูปเรียกตัวเอง ให้ตั้ง Budget กับ Cost Anomaly Detection และกำหนด concurrency สูงสุดไว้");
  await L.cap("✓ สำเร็จ: API Gateway → Lambda → DynamoDB ได้ข้อมูลยากลับมา", "สรุป request เข้า API Gateway ไป Lambda อ่านจาก DynamoDB แล้วตอบกลับ ไม่มีเครื่องให้ดูแล จ่ายตามการเรียกใช้จริง"); await L.hold(1);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase3.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
