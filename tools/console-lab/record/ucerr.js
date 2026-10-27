// วิดีโอเคส error: อาการที่ Browser → เหตุผลที่ตัวจำลองบอก → ไปดูจุดที่ต้องแก้ใน console → แก้ (ย่อขั้นตอนด้วย API) → ทดสอบซ้ำ
const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n, e.message.slice(0, 300)); await L.finish(); process.exit(1); } } } };
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
const CASES = {
  "single-sg": { out: "usecase6-err", title: "Use case 6 · เคส error: เปิดเว็บไม่ได้ (SG ไม่เปิด port 80)", intro: "เคส error ของ use case หก เครื่อง EC2 รันอยู่ แต่เปิดเว็บไม่ได้",
    build: `buildSingle("single-sg")`, url: `"https://app.pharmacy.example.com/"`, fixSvc: ["EC2", "EC2"],
    sym: "เปิดเว็บแล้วขึ้น หน้าไม่ตอบสนอง หรือ ใบรับรองมีปัญหา ทั้งที่เครื่องก็รันอยู่", cause: "ตัวจำลองไล่ให้ดู ขั้นที่ล้มเหลวคือ security group ไม่เปิดพอร์ต แปดสิบ ซึ่ง Let's Encrypt ต้องใช้พอร์ตนี้ตรวจโดเมน",
    nav: async () => { await svc("EC2"); await L.click(B("Security Groups")); await step("sgsel", async () => { await L.click({ t: "sg-", tag: "a,td", starts: true, nth: 0 }); }); await L.hold(2.5); },
    navCap: "EC2 › Security Groups › pharmacy-single-web › Inbound rules (ไม่มี HTTP 80)", navSay: "ไปดู security group ของเครื่อง จะเห็นว่ามีแค่ HTTPS กับ SSH ไม่มี HTTP พอร์ตแปดสิบ",
    fix: `(function(){var g=byName(S.sgs,"pharmacy-single-web"); function R(t,p,k,s){return {type:t,port:p,srcKind:k,src:s}} API.setInbound(g.id,[R("HTTP","","Anywhere-IPv4"),R("HTTPS","","Anywhere-IPv4"),R("SSH","","My IP")]); render();})()`,
    fixCap: "Edit inbound rules › เพิ่ม HTTP 80 จาก Anywhere-IPv4 → Save (ย่อขั้นตอน)", fixSay: "แก้โดยเพิ่ม rule HTTP พอร์ตแปดสิบ จากทุกที่ แล้วบันทึก",
    done: "เปิดเว็บได้แล้ว: เพิ่ม HTTP 80 ให้ Let's Encrypt ตรวจโดเมนได้" },
  "apr-port": { out: "usecase7-err", title: "Use case 7 · เคส error: service ขึ้นไม่ได้ (port ไม่ตรงกับที่แอปฟัง)", intro: "เคส error ของ use case เจ็ด App Runner สร้างแล้ว แต่ prd เปิดไม่ได้",
    build: `buildApr("apr-port")`, url: `"https://" + S.aprs.filter(function(x){return x.name==="pharmacy-api-prd"})[0].url + "/healthz"`, fixSvc: ["App Runner", "App Runner"],
    sym: "เรียก URL ของ prd แล้วไม่ได้คำตอบที่ถูกต้อง", cause: "ตัวจำลองบอกว่า port ที่ตั้งไว้คือ แปดพันแปดสิบ แต่แอปจริงฟังที่ แปดพัน health check จึงไม่ผ่าน",
    nav: async () => { await svc("App Runner", "Containers"); await step("aprsel", async () => { await L.click({ t: "pharmacy-api-prd", tag: "a,td", starts: true }); }); await L.hold(2.5); },
    navCap: "App Runner › pharmacy-api-prd › Configuration: Port = 8080 (แอปฟัง 8000)", navSay: "เปิดดู service ของ prd ที่ Configuration จะเห็นว่า port ตั้งเป็น แปดพันแปดสิบ",
    fix: `API.updateAppRunner("pharmacy-api-prd", { port: 8000 }); render();`,
    fixCap: "Edit configuration › Port = 8000 → Save (ย่อขั้นตอน)", fixSay: "แก้ port ให้ตรงกับแอปเป็น แปดพัน แล้วบันทึก",
    done: "prd ตอบ 200 แล้ว: port ต้องตรงกับที่แอปฟังจริง" },
  "sls-invoke": { out: "usecase3-err", title: "Use case 3 · เคส error: API Gateway เรียก Lambda ไม่ได้ (ลืม permission)", intro: "เคส error ของ use case สาม prd ตอบ error ห้าร้อย",
    build: `buildSls("sls-invoke")`, url: `(function(){var a=S.apis.filter(function(x){return /prd/.test(x.name)})[0]; return apiInvokeUrl(a,a.stages[0])+"/drugs"})()`, fixSvc: ["Lambda", "Lambda"],
    sym: "เรียก API ของ prd แล้วได้ ห้าร้อย Internal Server Error", cause: "ตัวจำลองไล่ตามขั้นของ API Gateway พบว่า API Gateway ไม่มีสิทธิ์เรียก Lambda เพราะลืมเพิ่ม resource based policy",
    nav: async () => { await svc("Lambda", "Compute"); await step("lsel", async () => { await L.click({ t: "pharmacy-api-prd", tag: "a,td", starts: true }); }); await L.hold(2.5); },
    navCap: "Lambda › pharmacy-api-prd › Permissions: ไม่มี statement ของ apigateway.amazonaws.com", navSay: "เปิดดู Lambda ของ prd แท็บ Permissions ไม่มีสิทธิ์ให้ API Gateway เรียก",
    fix: `(function(){var a=S.apis.filter(function(x){return /prd/.test(x.name)})[0]; API.addLambdaPermission({fn:"pharmacy-api-prd",sid:"AllowAPIGatewayInvoke",principal:"apigateway.amazonaws.com",sourceArn:slsExecArn(a)+"/*/*"}); render();})()`,
    fixCap: "Add permissions › AWS service › API Gateway → Save (ย่อขั้นตอน)", fixSay: "เพิ่มสิทธิ์ให้ API Gateway เรียก Lambda ตัวนี้ได้ แล้วบันทึก",
    done: "prd ตอบ 200 แล้ว: ต้องมี lambda permission ให้ API Gateway" }
};
(async () => {
  const C = CASES[process.argv[2]]; if (!C) { console.log("ERR unknown case"); process.exit(1); }
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["เจออาการ", "⚠️"], ["หาสาเหตุ", "🔎"], ["แก้ที่ " + C.fixSvc[0], C.fixSvc[1]], ["ทดสอบซ้ำ", "🌐"]]);
  await L.cap(C.title, C.intro + " มาดูวิธีไล่หาสาเหตุทีละขั้น"); await L.hold(1);
  await L.ev(C.build + `; UI.sel={}; render(); 1`);
  const url = await L.ev(C.url);
  const openUrl = async () => { await L.click(B("Browser", { nth: 0 })); await step("b1", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }).catch(() => {}); await step("b2", async () => { await L.sleep(400); await L.type("main input[placeholder], main input[type=text]", url); }); await L.click(B("Go")); await L.hold(2.2); };
  await L.intro(0, "อาการ", "เปิดเว็บแล้วไม่เป็นไปตามที่ควร", "ขั้นแรก ดูอาการให้ชัดก่อน");
  await L.cap("① Browser → เปิด " + url.replace(/^https?:\/\//, "").slice(0, 60), C.sym); await openUrl();
  await L.tick(0, "เห็นอาการแล้ว", "อาการคือที่เห็นอยู่");
  await L.intro(1, "สาเหตุ", "ดูกล่องเหตุผลของตัวจำลอง", "ต่อมาไล่หาสาเหตุ อ่านจากกล่องเบื้องหลังใต้หน้าเว็บ");
  await L.cap("② เลื่อนลงอ่านกล่อง 'เบื้องหลัง' ดูขั้นที่ ✗", C.cause); await L.ev(`(document.querySelector(".bw-why")||document.body).scrollIntoView({block:"center"});1`); await L.hold(4);
  await L.tick(1, "รู้สาเหตุแล้ว", "รู้สาเหตุแล้ว");
  await L.intro(2, "แก้ที่ " + C.fixSvc[0], "ไปแก้ตรงจุดที่ผิด", "ไปที่ console เพื่อแก้ตรงจุดที่ผิด");
  await L.cap("③ " + C.navCap, C.navSay); await C.nav();
  await L.cap("④ " + C.fixCap, C.fixSay); await L.ev(C.fix); await L.hold(2);
  await L.tick(2, "แก้แล้ว", "แก้เรียบร้อย");
  await L.intro(3, "ทดสอบซ้ำ", "เปิดเว็บอีกครั้ง", "มาลองเปิดเว็บอีกครั้ง");
  await L.cap("⑤ Browser → Go ซ้ำ", "กลับไปที่ Browser แล้วกด Go ซ้ำ"); await L.click(B("Browser", { nth: 0 })); await L.hold(0.5); await L.click(B("Go")); await L.hold(2.5);
  await L.tick(3, "หายแล้ว", "หายแล้ว ใช้งานได้ตามปกติ");
  await L.cap("✓ " + C.done, "สรุป " + C.done); await L.hold(1);
  await L.encode(require("path").resolve(__dirname, "../videos/" + C.out + ".mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
