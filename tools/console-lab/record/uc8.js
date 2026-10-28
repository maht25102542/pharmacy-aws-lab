const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n, e.message.slice(0, 300)); await L.finish(); process.exit(1); } } } };
const soft = async (n, f) => { try { await f(); } catch (e) { console.log("SOFT", n, e.message.slice(0, 120)); await L.ev(`document.body.click();1`); } };
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
const tickLabel = async (t) => { await L.ev(`[].slice.call(document.querySelectorAll("main label.opt, main tbody tr")).forEach(function(l){ if((l.innerText||"").trim().indexOf(${JSON.stringify(t)})===0){ var c=l.querySelector("input[type=checkbox]"); if(c) c.setAttribute("data-tk","1"); } }); 1`); await L.click("[data-tk]"); await L.ev(`[].slice.call(document.querySelectorAll("[data-tk]")).forEach(function(e){e.removeAttribute("data-tk")}); 1`); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["ECR image (use case 2)", "ECR"], ["Execution role", "IAM"], ["Infrastructure role", "IAM"], ["cluster", "ECS"], ["Express dev", "ECS"], ["Express prd", "ECS"], ["เปิด URL", "🌐"]]);
  await L.cap("Use case 8 · ECS Express Mode: ให้ image + role 2 ตัว แล้วได้ ALB / HTTPS / URL", "use case แปด ECS Express Mode ให้แค่ container image กับ role สองตัว แล้ว ECS สร้าง load balancer ใบรับรอง HTTPS auto scaling และ URL ให้เอง เป็นตัวที่ AWS แนะนำแทน App Runner สำหรับโปรเจกต์ใหม่"); await L.hold(1);
  await L.ev(`buildExpress("exp-base"); UI.sel={}; UI.form=null; render(); 1`);
  await L.cap("ก่อนเริ่ม: ต้องมี ECR repo pharmacy/api + image v1.0.0 จาก use case 2 (ดูวิดีโอ use case 2)", "ก่อนเริ่ม ต้องมี ECR repository pharmacy slash api พร้อม image v หนึ่งจุดศูนย์จุดศูนย์ ที่ทำไว้ใน use case สอง ถ้ายังไม่มีให้ดูวิดีโอ use case สองก่อน"); await L.hold(1);
  await L.intro(0, "ECR", "image ที่เตรียมไว้แล้ว", "ขั้นแรก ตรวจดูว่ามี image อยู่ใน ECR แล้ว");
  await L.cap("① ECR › Repositories › pharmacy/api (มี tag v1.0.0)", "เปิด ECR ดูที่ repository pharmacy api จะเห็นว่ามี image tag v หนึ่งจุดศูนย์จุดศูนย์แล้ว"); await svc("Elastic Container Registry", "Containers"); await step("rsel", async () => { await L.click({ t: "pharmacy/api", tag: "a,td", starts: true }); }); await L.hold(2.5);
  await L.tick(0, "มี image พร้อมแล้ว", "image พร้อมใช้งาน");
  // roles
  const mkRole = async (n, name, radio, policy, say) => {
    await L.cap("IAM › Roles › Create role: " + name, say); await svc("IAM", "Security, Identity, & Compliance"); await L.click(B("Roles")); await L.click(B("Create role", { nth: 0 }));
    await step("rsvc" + n, async () => { await L.pickBtn("EC2", "Elastic Container Service"); }); await L.sleep(400);
    await step("ruc" + n, async () => { await L.click({ t: radio, tag: "main label.opt,main .opt", starts: true }); }); await L.hold(0.8);
    await L.click(B("Next"));
    await step("pp" + n, async () => { await tickLabel(policy); }); await L.hold(1.2); await L.click(B("Next"));
    await step("rn" + n, async () => { await L.fill("Role name", name); });
    await L.click(B("Create role", { nth: 0 })); await L.hold(1.5);
  };
  await L.intro(1, "IAM", "role ตัวที่ 1: execution role", "ต่อมา IAM สร้าง role สองตัว ตัวแรกคือ execution role ให้ task ดึง image จาก ECR และเขียน log");
  await mkRole(1, "pharmacy-express-execution", "Elastic Container Service Task", "AmazonECSTaskExecutionRolePolicy", "เลือก use case Elastic Container Service Task แล้วแนบนโยบาย AmazonECSTaskExecutionRolePolicy ตั้งชื่อ pharmacy express execution");
  await L.tick(1, "execution role พร้อมแล้ว", "สร้าง execution role เรียบร้อย");
  await L.intro(2, "IAM", "role ตัวที่ 2: infrastructure role", "ตัวที่สองคือ infrastructure role ให้ ECS สร้าง load balancer กับ security group และ auto scaling แทนเรา");
  await mkRole(2, "pharmacy-express-infrastructure", "Elastic Container Service Allows ECS to create", "AmazonECSInfrastructureRoleforExpressGatewayServices", "คราวนี้เลือก use case Elastic Container Service ตัวที่ไม่ใช่ Task เพราะ ECS เป็นผู้สวม role นี้ แล้วแนบนโยบาย AmazonECSInfrastructureRoleforExpressGatewayServices");
  await L.cap("สองตัวนี้คนละหน้าที่: execution = ให้ task ดึง image · infrastructure = ให้ ECS สร้างของแทนเรา (ใช้ตอน create/update/delete เท่านั้น)", "สรุปสอง role คนละหน้าที่ execution ให้ task ดึง image ส่วน infrastructure ให้ ECS สร้างของแทนเรา และใช้เฉพาะตอนสร้าง แก้ และลบ service"); await L.hold(1.5);
  await L.tick(2, "infrastructure role พร้อมแล้ว", "สร้าง infrastructure role เรียบร้อย");
  // cluster
  await L.intro(3, "ECS", "cluster สำหรับ service", "ต่อไปที่ ECS สร้าง cluster ไว้ให้ service อยู่");
  await L.cap("② ECS › Clusters › Create cluster: pharmacy-express", "เปิด ECS ไปที่ Clusters แล้วกด Create cluster ตั้งชื่อ pharmacy express"); await svc("Elastic Container Service", "Containers"); await L.click(B("Clusters", { starts: true })).catch(() => {}); await L.click(B("Create cluster", { nth: 0 }));
  await step("cname", async () => { await L.fill("Cluster name", "pharmacy-express"); });
  await L.click(B("Create", { nth: 0 })); await L.hold(1.2);
  await L.tick(3, "cluster พร้อมแล้ว", "cluster สร้างเสร็จ");
  // express services
  const mkExp = async (env, cpu, mem, mn, mx, introSay, cap1) => {
    await L.cap(cap1, introSay); await svc("Elastic Container Service", "Containers"); await step("nav" + env, async () => { await L.click({ t: "Express mode", tag: "a,button" }); }); await L.hold(1);
    await step("br" + env, async () => { await L.choose("Browse ECR images", "pharmacy/api : v1.0.0"); });
    await step("ex" + env, async () => { await L.choose("Task execution role", "pharmacy-express-execution"); });
    await step("in" + env, async () => { await L.choose("Infrastructure role", "pharmacy-express-infrastructure"); });
    await L.cap("Additional configurations: cluster · ชื่อ pharmacy-api-" + env + " · port 8000 · health check /healthz", "ในส่วน Additional configurations เลือก cluster pharmacy express ตั้งชื่อ pharmacy api " + env + " ตั้ง port เป็นแปดพัน และ health check path เป็น healthz");
    await step("cl" + env, async () => { await L.choose("Cluster", "pharmacy-express"); });
    await step("nm" + env, async () => { await L.fill("Name", "pharmacy-api-" + env); });
    await step("po" + env, async () => { await L.fill("Container port", "8000"); });
    await step("hp" + env, async () => { await L.fill("Health check path", "/healthz"); });
    await L.cap("CPU " + cpu[1] + " · Memory " + mem[1] + " · tasks " + mn + "–" + mx, "ตั้งขนาด CPU " + cpu[1] + " หน่วยความจำ " + mem[1] + " และจำนวน task ตั้งแต่ " + mn + " ถึง " + mx);
    await step("cpu" + env, async () => { await L.choose("CPU", cpu[0]); });
    await step("mem" + env, async () => { await L.choose("Memory", mem[0]); });
    await step("mn" + env, async () => { await L.fill("Minimum number of tasks", String(mn)); });
    await step("mx" + env, async () => { await L.fill("Maximum number of tasks", String(mx)); });
    await L.hold(1.5); await L.cap("Create → ECS สร้าง ALB + HTTPS + target group + auto scaling ให้เอง", "กด Create ECS จะสร้าง load balancer ใบรับรอง HTTPS target group และ auto scaling ให้เองทั้งหมด"); await L.click(B("Create", { nth: 0 })); await L.hold(2);
  };
  await L.intro(4, "Express dev", "service dev ด้วย Express Mode", "ถึงหัวใจของ use case แล้ว ที่ ECS มีเมนู Express mode สร้าง service dev");
  await mkExp("dev", ["0.25 vCPU", "0.25 vCPU"], ["0.5 GB", "0.5 GB"], 1, 2, "เปิดเมนู Express mode ใส่ image role สองตัว แล้วตั้งค่าเพิ่มเติมสำหรับ dev", "③ ECS › Express mode: Image URI (Browse ECR images) · Task execution role · Infrastructure role");
  await L.cap("แท็บ Resources: ดูของที่ ECS สร้างให้ (ALB, target group, SG, ใบรับรอง, auto scaling, log group, alarm)", "เปิดแท็บ Resources จะเห็นของทั้งหมดที่ ECS สร้างให้ ทั้ง ALB target group security group ใบรับรอง auto scaling log group และ alarm"); await step("tabres", async () => { await L.click({ t: "Resources", tag: "button" }); }); await L.hold(3);
  await L.tick(4, "service dev พร้อมแล้ว", "service dev ขึ้นแล้ว");
  await L.intro(5, "Express prd", "service prd ใน cluster เดียวกัน", "ทำซ้ำสำหรับ prd ใน cluster เดียวกัน ซึ่งจะแชร์ load balancer ตัวเดิม");
  await mkExp("prd", ["0.5 vCPU", "0.5 vCPU"], ["1 GB", "1 GB"], 2, 6, "สร้าง service prd ด้วยขั้นตอนเดิม แต่ขนาดใหญ่ขึ้น และมี task ขั้นต่ำสองตัว", "④ ECS › Express mode อีกครั้ง สำหรับ prd (ขนาดใหญ่ขึ้น · min 2 tasks)");
  console.log("CHECK", await L.ev(`JSON.stringify({exps:S.exps.map(function(x){return x.name+":"+expEval(x).status}),albs:S.albs.filter(function(a){return a.express}).length,checks:checksExpress().filter(function(c){return !c.ok}).map(function(c){return c.label})})`));
  await L.cap("ดู ALB: ECS สร้างให้ตัวเดียว แชร์ทั้ง dev และ prd (host-header rule)", "สังเกตว่า load balancer มีตัวเดียว แชร์กันทั้ง dev และ prd ผ่านกฎแบบ host header ช่วยประหยัดค่า load balancer"); await svc("EC2", "Compute"); await step("lb", async () => { await L.click(B("Load Balancers", { starts: true })); }); await L.hold(3);
  await L.tick(5, "service prd พร้อมแล้ว", "service prd ขึ้นแล้ว");
  // browser
  await L.intro(6, "Browser", "ทดสอบเปิด URL จริง", "มาทดสอบเปิดเว็บกัน");
  const url = await L.ev(`"https://" + expOf("pharmacy-express","pharmacy-api-prd").host + "/healthz"`);
  await L.cap("⑤ แท็บ Browser → เปิด https://pharmacy-api-prd.ecs.<region>.on.aws/healthz", "ไปที่แท็บ Browser แล้วเปิด URL ของ service prd ต่อท้ายด้วย healthz"); await L.click(B("Browser", { nth: 0 }));
  await step("br1", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); });
  await step("br2", async () => { await L.sleep(400); await L.type("main input[placeholder], main input[type=text]", url); });
  await L.click(B("Go")); await L.hold(2.5);
  await L.tick(6, "เปิดได้ HTTPS 200", "เปิดได้แล้ว ตอบกลับสถานะสองร้อย");
  await L.costScene("exp", "เรื่องค่าใช้จ่าย Express Mode ไม่คิดเงินเพิ่ม จ่ายแค่ของที่ถูกสร้าง คือ Fargate load balancer ตัวเดียวที่แชร์กัน public IP และ log ประมาณเก้าสิบกว่าดอลลาร์ต่อเดือนถ้าเปิดทิ้งไว้ ถูกกว่า use case สองเพราะไม่มี NAT แต่ยังต้องลบเมื่อเลิกใช้และตั้ง Budget ไว้");
  await L.cap("✓ สำเร็จ: image + role 2 ตัว → ALB แชร์ + HTTPS + auto scaling + URL ครบ", "สรุป ให้แค่ image กับ role สองตัว ได้ครบทั้ง load balancer HTTPS auto scaling และ URL ข้อควรจำคือ infrastructure role เปลี่ยนไม่ได้หลังสร้าง และ Express Mode ยังใหม่ ข้อมูลการใช้จริงยังน้อย"); await L.hold(1);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase8.mp4"));
  await L.finish();
})().catch(async (e) => { console.error("ERR", e.message); try { console.log("ALERT", await L.ev(`(document.querySelector(".alert.bad,.alert.error")||{innerText:"none"}).innerText`)); } catch (x) {} process.exit(1); });
