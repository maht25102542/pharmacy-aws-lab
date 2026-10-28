// วิดีโอเคส error: อาการที่ Browser → เหตุผลที่ตัวจำลองบอก → ไปดูจุดที่ต้องแก้ใน console → แก้ (ย่อขั้นตอนด้วย API) → ทดสอบซ้ำ
const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n, e.message.slice(0, 300)); await L.finish(); process.exit(1); } } } };
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
const CASES = {
  "single-sg": { out: "usecase6-err", title: "Use case 6 · เคส error: เปิดเว็บไม่ได้ (SG ไม่เปิด port 80)", intro: "เคส error ของ use case หก เครื่อง EC2 รันอยู่ แต่เปิดเว็บไม่ได้",
    build: `buildSingle("single-sg")`, url: `"https://app.pharmacy.example.com/"`, fixSvc: ["EC2", "EC2"],
    sym: "เปิดเว็บแล้วขึ้น หน้าไม่ตอบสนอง หรือ ใบรับรองมีปัญหา ทั้งที่เครื่องก็รันอยู่", cause: "ตัวจำลองไล่ให้ดู ขั้นที่ล้มเหลวคือ security group ไม่เปิดพอร์ต แปดสิบ ซึ่ง Let's Encrypt ต้องใช้พอร์ตนี้ตรวจโดเมน",
    nav: async () => { await svc("EC2", "Compute"); await L.click(B("Security Groups")); await step("sgsel", async () => { await L.click({ t: "pharmacy-single-web", tag: "a,td", starts: true }); }); await L.hold(2.5); },
    navCap: "EC2 › Security Groups › pharmacy-single-web › Inbound rules (ไม่มี HTTP 80)", navSay: "ไปดู security group ของเครื่อง จะเห็นว่ามีแค่ HTTPS กับ SSH ไม่มี HTTP พอร์ตแปดสิบ",
    fixReal: async () => { await step("eir", async () => { await L.click(B("Actions", { nth: 0 })); await L.click(B("Edit inbound rules")); }); await step("ar", async () => { await L.click(B("Add rule", { nth: 0 })); }); await step("t", async () => { await L.chooseLast("SSH", "HTTP"); }); await step("s", async () => { await L.chooseLast("My IP", "Anywhere-IPv4"); }); await L.hold(1.5); await L.click(B("Save rules")); await L.hold(1.5); },
    fixCap: "Edit inbound rules › Add rule › HTTP · Anywhere-IPv4 → Save rules", fixSay: "แก้โดยเพิ่ม rule HTTP พอร์ตแปดสิบ จากทุกที่ แล้วบันทึก",
    done: "เปิดเว็บได้แล้ว: เพิ่ม HTTP 80 ให้ Let's Encrypt ตรวจโดเมนได้" },
  "apr-port": { out: "usecase7-err", title: "Use case 7 · เคส error: service ขึ้นไม่ได้ (port ไม่ตรงกับที่แอปฟัง)", intro: "เคส error ของ use case เจ็ด App Runner สร้างแล้ว แต่ prd เปิดไม่ได้",
    build: `buildApr("apr-port")`, url: `"https://" + S.aprs.filter(function(x){return x.name==="pharmacy-api-prd"})[0].url + "/healthz"`, fixSvc: ["App Runner", "App Runner"],
    sym: "เรียก URL ของ prd แล้วไม่ได้คำตอบที่ถูกต้อง", cause: "ตัวจำลองบอกว่า port ที่ตั้งไว้คือ แปดพันแปดสิบ แต่แอปจริงฟังที่ แปดพัน health check จึงไม่ผ่าน",
    nav: async () => { await svc("App Runner", "Containers"); await step("aprsel", async () => { await L.click({ t: "pharmacy-api-prd", tag: "a,td", starts: true }); }); await L.click(B("Configuration", { nth: 0 })); await L.hold(2.5); },
    navCap: "App Runner › pharmacy-api-prd › Configuration: Port = 8080 (แอปฟัง 8000)", navSay: "เปิดดู service ของ prd ที่ Configuration จะเห็นว่า port ตั้งเป็น แปดพันแปดสิบ",
    fixReal: async () => { await step("ed", async () => { await L.click(B("Edit", { nth: 0 })); }); await step("pt", async () => { await L.fill("Port", "8000"); }); await L.hold(1.5); await L.click(B("Save changes")); await L.hold(2); },
    fixCap: "Configuration › Edit › Port = 8000 → Save changes", fixSay: "แก้ port ให้ตรงกับแอปเป็น แปดพัน แล้วบันทึก",
    done: "prd ตอบ 200 แล้ว: port ต้องตรงกับที่แอปฟังจริง" },
  "sls-invoke": { out: "usecase3-err", title: "Use case 3 · เคส error: API Gateway เรียก Lambda ไม่ได้ (ลืม permission)", intro: "เคส error ของ use case สาม prd ตอบ error ห้าร้อย",
    build: `buildSls("sls-invoke")`, url: `(function(){var a=S.apis.filter(function(x){return /prd/.test(x.name)})[0]; return apiInvokeUrl(a,a.stages[0])+"/drugs"})()`, fixSvc: ["Lambda", "Lambda"],
    sym: "เรียก API ของ prd แล้วได้ ห้าร้อย Internal Server Error", cause: "ตัวจำลองไล่ตามขั้นของ API Gateway พบว่า API Gateway ไม่มีสิทธิ์เรียก Lambda เพราะลืมเพิ่ม resource based policy",
    nav: async () => { await svc("Lambda", "Compute"); await step("lsel", async () => { await L.click({ t: "pharmacy-api-prd", tag: "a,td", starts: true }); }); await L.click(B("Configuration", { nth: 0 })); await L.hold(2.5); },
    navCap: "Lambda › pharmacy-api-prd › Permissions: ไม่มี statement ของ apigateway.amazonaws.com", navSay: "เปิดดู Lambda ของ prd แท็บ Permissions ไม่มีสิทธิ์ให้ API Gateway เรียก",
    fixReal: async () => { await step("ap", async () => { await L.click(B("Add permissions", { nth: 0 })); }); await step("src", async () => { await L.choose("Source ARN", "pharmacy-api-prd"); }); await L.hold(1.5); await L.click(B("Save", { nth: 0 })); await L.hold(2); },
    fixCap: "Configuration › Permissions › Add permissions › Source ARN = API นี้ → Save", fixSay: "เพิ่มสิทธิ์ให้ API Gateway เรียก Lambda ตัวนี้ได้ แล้วบันทึก",
    done: "prd ตอบ 200 แล้ว: ต้องมี lambda permission ให้ API Gateway" }
};

// ---- เคส error เพิ่ม: use case 1, 2, 4, 5 ----
const pickRowLink = async (rowText, linkTag = "a") => { await L.ev(`[].slice.call(document.querySelectorAll("[data-fx]")).forEach(function(e){e.removeAttribute("data-fx")}); var tr=[].slice.call(document.querySelectorAll("main tbody tr")).filter(function(r){return (r.innerText||"").indexOf(${JSON.stringify(rowText)})>=0})[0]; var a=tr&&tr.querySelector(${JSON.stringify(linkTag)}); if(a) a.setAttribute("data-fx","1"); 1`); await L.click("[data-fx]"); };
CASES["static-stale"] = { out: "usecase1-err", title: "Use case 1 · เคส error: ปล่อยเว็บใหม่แล้วผู้ใช้ยังเห็นของเก่า (cache)", intro: "เคส error ของ use case หนึ่ง เพิ่งอัปโหลดเว็บเวอร์ชันใหม่ขึ้น S3 แล้ว แต่เปิดเว็บยังเห็นเวอร์ชันเก่า",
  build: `buildStatic("static-stale")`, url: `"https://dev.pharmacy.example.com"`, fixSvc: ["CloudFront", "CloudFront"],
  sym: "เปิดเว็บแล้วยังเห็นเวอร์ชันเดิม ทั้งที่ในบัคเก็ตเป็นเวอร์ชันใหม่แล้ว", cause: "ตัวจำลองบอกว่า CloudFront ตอบจาก edge cache คือ x cache เป็น Hit ไฟล์ใหม่ใน S3 ยังไม่ถูกดึงมา เพราะ cache ยังไม่หมดอายุ",
  nav: async () => { await svc("CloudFront", "Networking & Content Delivery"); await step("cfsel", async () => { await pickRowLink("dev.pharmacy.example.com", "a"); }); await step("cfinv", async () => { await L.click(B("Invalidations")); }); await L.hold(2); },
  navCap: "CloudFront › Distributions › dev › Invalidations", navSay: "เปิด CloudFront เลือก distribution ของ dev แล้วไปที่แท็บ Invalidations ซึ่งเป็นที่สั่งล้าง cache",
  fixReal: async () => { await step("ci", async () => { await L.click(B("Create invalidation", { nth: 0 })); }); await step("pth", async () => { await L.fill("Object paths", "/*"); }); await L.hold(1.5); await L.click(B("Create invalidation", { nth: 0 })); await L.hold(2); },
  fixCap: "Create invalidation › Object paths = /* → Create invalidation", fixSay: "กด Create invalidation ใส่ path เป็น สแลช ดอกจัน เพื่อล้างทุกไฟล์ แล้วกดสร้าง",
  done: "ล้าง cache แล้ว เห็นเวอร์ชันใหม่: ปล่อยของใหม่ต้อง invalidate (หรือใช้ชื่อไฟล์ที่มี hash)" };
CASES["ecs-role"] = { out: "usecase2-err", title: "Use case 2 · เคส error: task ไม่ขึ้น (execution role ขาดสิทธิ์)", intro: "เคส error ของ use case สอง สร้าง service แล้ว แต่เปิดผ่าน load balancer ไม่ได้ เพราะ task ไม่ขึ้น",
  build: `buildEcs("ecs-role")`, url: `"http://" + S.albs[0].dns + ":8080"`, fixSvc: ["IAM", "IAM"],
  sym: "เปิดผ่าน load balancer ของ dev แล้วได้ 503 เพราะไม่มี task ที่พร้อมรับงาน", cause: "ตัวจำลองไล่ให้ดูว่า task สตาร์ทไม่ได้ เพราะ execution role ไม่มีนโยบาย AmazonECSTaskExecutionRolePolicy จึงดึง image จาก ECR และเขียน log ไม่ได้",
  nav: async () => { await svc("IAM", "Security, Identity, & Compliance"); await L.click(B("Roles")); await step("rsel", async () => { await L.click({ t: "pharmacy-ecs-execution", tag: "a,td", starts: true }); }); await L.hold(2.5); },
  navCap: "IAM › Roles › pharmacy-ecs-execution › Permissions: ไม่มี AmazonECSTaskExecutionRolePolicy", navSay: "เปิด IAM ไปที่ Roles เลือก pharmacy ecs execution ดูแท็บ Permissions จะเห็นว่าไม่มีนโยบายสำหรับ execution role",
  fixReal: async () => { await step("act", async () => { await L.click(B("Actions", { nth: 0 })); await L.click(B("Add permissions", { starts: true })); }); await step("ptk", async () => { await L.ev(`[].slice.call(document.querySelectorAll("main label.opt")).forEach(function(l){ if((l.innerText||"").trim().indexOf("AmazonECSTaskExecutionRolePolicy")===0) l.querySelector("input").setAttribute("data-tk","1"); }); 1`); await L.click("[data-tk]"); }); await L.hold(1.5); await L.click(B("Save", { nth: 0 })); await L.hold(2); },
  fixCap: "Add permissions › ติ๊ก AmazonECSTaskExecutionRolePolicy → Save", fixSay: "เพิ่มสิทธิ์ ติ๊ก AmazonECSTaskExecutionRolePolicy แล้วบันทึก",
  done: "task ขึ้นและ ALB ตอบ 200: execution role ต้องมีนโยบายนี้ เพื่อดึง image และเขียน log" };
const pipePage = async () => { await svc("CodePipeline", "Developer Tools"); await step("pp", async () => { await L.click({ t: "pharmacy-api", tag: "a" }); }); await L.hold(2); };
CASES["cd-docker"] = { out: "usecase4-err", title: "Use case 4 · เคส error: pipeline ล้มที่ขั้น Build (CodeBuild ไม่เปิด Privileged)", intro: "เคส error ของ use case สี่ push โค้ดแล้ว pipeline ล้มตั้งแต่ขั้น Build",
  build: `buildCd("cd-docker")`, fixSvc: ["CodeBuild", "CodeBuild"],
  symCap: "CodePipeline › Pipelines › pharmacy-api: ขั้น Build = Failed", sym: "เปิด CodePipeline ดู pipeline ล่าสุด ขั้น Source ผ่าน แต่ขั้น Build ล้ม ขั้นหลังจากนั้นไม่ได้รัน",
  symptom: async () => { await pipePage(); },
  causeCap: "อ่านข้อความใต้ขั้น Build: docker build ใช้ไม่ได้ เพราะโปรเจกต์ไม่ได้เปิด Privileged mode", cause: "ข้อความใต้ขั้น Build บอกสาเหตุ docker build ใช้ไม่ได้ เพราะโปรเจกต์ CodeBuild ไม่ได้เปิด Privileged mode จึงต่อ Docker daemon ไม่ได้",
  reason: async () => { await L.ev(`[].slice.call(document.querySelectorAll("main *")).filter(function(e){return e.children.length===0&&/Privileged/.test(e.innerText||"")})[0].scrollIntoView({block:"center"});1`); await L.hold(4); },
  nav: async () => { await svc("CodeBuild", "Developer Tools"); await step("cbs", async () => { await L.click({ t: "pharmacy-api-build", tag: "a" }); }); await L.click(B("Configuration", { nth: 0 })); await L.hold(2.5); },
  navCap: "CodeBuild › pharmacy-api-build › Configuration: Privileged = Disabled", navSay: "เปิด CodeBuild เลือกโปรเจกต์ pharmacy api build ดูแท็บ Configuration จะเห็น Privileged เป็น Disabled",
  fixReal: async () => { await step("act", async () => { await L.click(B("Actions", { nth: 0 })); await L.click(B("Edit", { starts: true })); }); await step("priv", async () => { await L.ev(`[].slice.call(document.querySelectorAll("main label.opt")).forEach(function(l){ if((l.innerText||"").trim().indexOf("Privileged")===0) l.querySelector("input").setAttribute("data-tk","1"); }); 1`); await L.click("[data-tk]"); }); await L.hold(1.5); await L.click(B("Update environment", { nth: 0 })); await L.hold(2); },
  fixCap: "Actions › Edit › ติ๊ก Privileged → Update environment", fixSay: "กด Actions เลือก Edit ติ๊ก Privileged แล้วกด Update environment",
  retestCap: "CodePipeline › pharmacy-api › Release change → Build ผ่าน", retestSay: "กลับไปที่ CodePipeline กด Release change เพื่อรัน pipeline ใหม่ ขั้น Build ผ่านแล้ว",
  retest: async () => { await pipePage(); await L.click(B("Release change", { nth: 0 })); await L.hold(3); },
  done: "Build ผ่านแล้ว: ต้องเปิด Privileged ถึง docker build ใน CodeBuild ได้" };
const ghaUrl = `"https://github.com/" + ghUser() + "/pharmacy-backend/actions"`;
const ghaOpen = async (n) => { await L.click(B("Browser", { nth: 0 })); await step("g1", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }).catch(() => {}); const url = await L.ev(ghaUrl); await step("g2", async () => { await L.sleep(400); await L.type("main input[placeholder], main input[type=text]", url); }); await L.click(B("Go")); await L.hold(1.8); await step("g3", async () => { await L.click({ t: "deploy #" + n, tag: "a" }); }); await L.hold(2.5); };
CASES["gha-perm"] = { out: "usecase5-err", title: "Use case 5 · เคส error: GitHub Actions ล้มที่ Configure AWS credentials (ไม่มี id-token: write)", intro: "เคส error ของ use case ห้า push แล้ว run ล้ม ขอสิทธิ์จาก AWS ไม่ได้",
  build: `buildGha("gha-perm")`, fixSvc: ["GitHub", "🐱"],
  symCap: "Browser → GitHub repo › Actions › deploy #1: ขั้น Configure AWS credentials ล้ม", sym: "เปิดหน้า Actions ของ repo แล้วเข้า run ล่าสุด ขั้น Configure AWS credentials ล้ม",
  symptom: async () => { await ghaOpen(1); },
  causeCap: "อ่าน log ของขั้นที่ล้ม: ขอ ID token ไม่ได้ เพราะ workflow ไม่มี permissions id-token write", cause: "log ของขั้นที่ล้มบอกว่าขอ ID token ไม่ได้ เพราะ workflow ไม่ได้ประกาศ permissions id token write GitHub จึงไม่ออก token ให้ AWS",
  reason: async () => { await L.ev(`(document.querySelector("main details[open]")||document.body).scrollIntoView({block:"center"});1`); await L.hold(4); },
  nav: async () => { await L.click({ t: "Actions", tag: "a", starts: true }); await L.hold(1); await step("ed", async () => { await L.ev(`var d=document.querySelector("main details"); if(!d.open) d.querySelector("summary").click(); 1`); await L.sleep(500); if (await L.ev(`document.querySelector("main details").open`) !== true) throw new Error("ไม่พบ: details ยังปิด"); }); await L.hold(1.5); },
  navCap: "GitHub › Actions › แก้ไข workflow: ช่อง permissions: id-token: write ยังไม่ติ๊ก", navSay: "กลับไปหน้า Actions เปิดส่วนแก้ไข workflow จะเห็นช่อง permissions id token write ยังไม่ได้ติ๊ก",
  fixReal: async () => { await step("idt", async () => { await L.ev(`[].slice.call(document.querySelectorAll("main input[type=checkbox]")).forEach(function(c){ if((c.parentNode.innerText||"").trim().indexOf("permissions: id-token")===0) c.setAttribute("data-tk","1"); }); 1`); await L.click("[data-tk]"); }); await L.hold(1.5); await L.click(B("Commit changes", { nth: 0 })); await L.hold(2); },
  fixCap: "ติ๊ก permissions: id-token: write → Commit changes", fixSay: "ติ๊กช่อง permissions id token write แล้วกด Commit changes",
  retestCap: "git push → main → deploy #2 ผ่านทุกขั้น", retestSay: "กด git push เข้า main อีกครั้ง เปิด run ใหม่ ทุกขั้นผ่านแล้ว",
  retest: async () => { await L.click({ t: "Actions", tag: "a", starts: true }); await L.hold(1); await L.click(B("git push", { starts: true })); await L.hold(1.5); await step("g4", async () => { await L.click({ t: "deploy #2", tag: "a" }); }); await L.hold(3); },
  done: "run ผ่านแล้ว: workflow ต้องมี permissions id-token: write ให้ OIDC ขอ token ได้" };

(async () => {
  const C = CASES[process.argv[2]]; if (!C) { console.log("ERR unknown case"); process.exit(1); }
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["เจออาการ", "⚠️"], ["หาสาเหตุ", "🔎"], ["แก้ที่ " + C.fixSvc[0], C.fixSvc[1]], ["ทดสอบซ้ำ", "✅"]]);
  await L.cap(C.title, C.intro + " มาดูวิธีไล่หาสาเหตุทีละขั้น"); await L.hold(1);
  await L.ev(C.build + `; UI.sel={}; render(); 1`);
  const url = C.url ? await L.ev(C.url) : "";
  const openUrl = async () => { await L.click(B("Browser", { nth: 0 })); await step("b1", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); }).catch(() => {}); await step("b2", async () => { await L.sleep(400); await L.type("main input[placeholder], main input[type=text]", url); }); await L.click(B("Go")); await L.hold(2.2); };
  await L.intro(0, "อาการ", "เปิดเว็บแล้วไม่เป็นไปตามที่ควร", "ขั้นแรก ดูอาการให้ชัดก่อน");
  await L.cap("① " + (C.symCap || "Browser → เปิด " + url.replace(/^https?:\/\//, "").slice(0, 60)), C.sym); if (C.symptom) await C.symptom(); else await openUrl();
  await L.tick(0, "เห็นอาการแล้ว", "อาการคือที่เห็นอยู่");
  await L.intro(1, "สาเหตุ", "ดูกล่องเหตุผลของตัวจำลอง", "ต่อมาไล่หาสาเหตุ");
  await L.cap("② " + (C.causeCap || "เลื่อนลงอ่านกล่อง 'เบื้องหลัง' ดูขั้นที่ ✗"), C.cause); if (C.reason) await C.reason(); else { await L.ev(`(document.querySelector(".bw-why")||document.body).scrollIntoView({block:"center"});1`); await L.hold(4); }
  await L.tick(1, "รู้สาเหตุแล้ว", "รู้สาเหตุแล้ว");
  await L.intro(2, "แก้ที่ " + C.fixSvc[0], "ไปแก้ตรงจุดที่ผิด", "ไปที่ console เพื่อแก้ตรงจุดที่ผิด");
  await L.cap("③ " + C.navCap, C.navSay); await C.nav();
  await L.cap("④ " + C.fixCap, C.fixSay); await C.fixReal(); await L.hold(1);
  await L.tick(2, "แก้แล้ว", "แก้เรียบร้อย");
  await L.intro(3, "ทดสอบซ้ำ", "ดูว่าหายแล้วไหม", "มาลองดูอีกครั้งว่าหายแล้วหรือยัง");
  await L.cap("⑤ " + (C.retestCap || "Browser → Go ซ้ำ"), C.retestSay || "กลับไปที่ Browser แล้วกด Go ซ้ำ"); if (C.retest) await C.retest(); else { await L.click(B("Browser", { nth: 0 })); await L.hold(0.5); await L.click(B("Go")); await L.hold(2.5); }
  await L.tick(3, "หายแล้ว", "หายแล้ว ใช้งานได้ตามปกติ");
  await L.cap("✓ " + C.done, "สรุป " + C.done); await L.hold(1);
  await L.encode(require("path").resolve(__dirname, "../videos/" + C.out + ".mp4"));
  await L.finish();
})().catch(async (e) => { console.error("ERR", e.message); try { console.log("ALERT", await L.ev(`(document.querySelector(".alert.error")||{innerText:"none"}).innerText`)); } catch (x) {} process.exit(1); });
