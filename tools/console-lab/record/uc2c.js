const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n, e.message.slice(0, 300)); await L.finish(); process.exit(1); } } } };
const soft = async (n, f) => { try { await f(); } catch (e) { console.log("SOFT", n, e.message.slice(0, 120)); await L.ev(`document.body.click();1`); } };
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
const txt = async (a = 0, n = 900) => (await L.ev(`document.querySelector("main,.main").innerText`)).replace(/\s+/g, " ").slice(a, a + n);
// ติ๊ก checkbox ที่ label ข้อความขึ้นต้นด้วย t
const tickBox = async (t) => { await L.ev(`[].slice.call(document.querySelectorAll("main label.opt")).forEach(function(l){ if((l.innerText||"").trim().indexOf(${JSON.stringify(t)})===0) l.querySelector("input").setAttribute("data-tk","1"); }); 1`); await L.click("[data-tk]"); await L.ev(`[].slice.call(document.querySelectorAll("[data-tk]")).forEach(function(e){e.removeAttribute("data-tk")}); 1`); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["ECS cluster", "ECS"], ["Task definition", "ECS"], ["ECS service", "ECS"], ["เปิดเว็บ", "🌐"]]);
  await L.cap("Use case 2 · ECS Fargate: รัน container ไม่ต้องดูแลเครื่อง + ALB + RDS", "use case สอง ECS Fargate รัน container โดยไม่ต้องดูแลเครื่องเอง มี load balancer อยู่ข้างหน้า และฐานข้อมูล RDS Postgres อยู่ข้างหลัง"); await L.hold(1);
  await L.ev(`buildEcs("ecs-base"); UI.sel={}; render(); 1`);
  await L.cap("ก่อนเริ่ม: ต้องทำตอน A และ B แล้ว (เครือข่าย, SG, IAM role, ECR + image, RDS, target group, ALB)", "ตอนนี้ต้องทำตอนที่หนึ่งและตอนที่สองเสร็จแล้ว คือมีเครือข่าย role ที่เก็บ image ฐานข้อมูล target group และ load balancer พร้อม"); await L.hold(1.5);
  // cluster
  await L.intro(0, "ECS cluster", "กลุ่มที่รัน task แบบ Fargate", "นี่คือ ECS cluster ที่รวมงานของเรา ใช้ Fargate คือไม่ต้องมีเครื่องให้ดูแล");
  await L.cap("① ECS › Clusters › Create cluster", "เปิด ECS ไปที่ Clusters แล้วกด Create cluster"); await svc("Elastic Container Service", "Containers"); await L.click(B("Create cluster", { nth: 0 }));
  await L.cap("② ชื่อ cluster pharmacy-dev · ใช้ Fargate (serverless)", "ตั้งชื่อ cluster ว่า pharmacy dev เลือก Fargate ที่เป็นแบบ serverless");
  await step("cname", async () => { await L.fill("Cluster name", "pharmacy-dev"); });
  await L.click(B("Create", { nth: 0 })); await L.hold(1.2);
  await L.tick(0, "cluster พร้อมแล้ว", "cluster สร้างเสร็จ");
  // task definition
  await L.intro(1, "Task definition", "แม่แบบว่ารันอะไร ด้วยทรัพยากรเท่าไร", "นี่คือ task definition แม่แบบที่บอกว่าจะรัน image อะไร ใช้ CPU และ memory เท่าไร");
  await L.cap("③ ECS › Task definitions › Create new task definition", "ไปที่ Task definitions แล้วกด Create new"); await L.click(B("Task definitions")); await L.click(B("Create new task definition", { starts: true, nth: 0 }));
  await L.cap("④ family pharmacy-api-dev · ขนาด .25 vCPU / 0.5 GB", "ตั้งชื่อ family และเลือกขนาดเล็ก ศูนย์จุดสองห้า vCPU กับครึ่งกิกะไบต์");
  await step("fam", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "pharmacy-api-dev"); });
  await L.cap("⑤ Execution role (ดึง image + เขียน log) และ Task role", "เลือก execution role ที่ใช้ดึง image จาก ECR และเขียน log กับ task role");
  await step("xr", async () => { await L.pickBtn("เลือก role", "pharmacy-ecs-execution"); });
  await step("tr", async () => { await L.pickBtn("เลือก role", "pharmacy-ecs-task"); });
  await L.cap("⑥ Container: image pharmacy/api:v1.0.0 · port 8000", "ตั้ง container ใช้ image เวอร์ชัน v1.0.0 จาก ECR และ port แปดพัน");
  await soft("cpu", async () => { await L.choose("CPU", ".25 vCPU"); }); await soft("mem", async () => { await L.choose("Memory", "0.5 GB"); });
  await soft("cn", async () => { await L.fill("Name", "api"); });
  await step("img", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "v1.0.0"); });
  await soft("cp", async () => { await L.fill("Container port", "8000"); }); await soft("ae", async () => { await L.fill("APP_ENV", "dev"); });
  await L.cap("⑦ DB_HOST ชี้ RDS · รหัสผ่านจาก Secrets Manager (ไม่ใส่ในโค้ด) · ส่ง log ไป CloudWatch", "ตั้งที่อยู่ฐานข้อมูล และดึงรหัสผ่านจาก Secrets Manager ไม่เขียนลงในโค้ด และส่ง log ไปที่ CloudWatch");
  await step("dbh", async () => { await L.pickBtn("ไม่ใช้ฐานข้อมูล", "pharmacy-api-dev"); });
  await step("sec", async () => { await L.pickBtn("ไม่ใช้", "pharmacy-api-dev"); });
  await step("lgp", async () => { await L.pickBtn("ไม่ส่ง log", "/ecs/pharmacy-api-dev"); });
  await L.click(B("Create", { nth: 0 })); await L.hold(1.2);
  await L.tick(1, "task definition พร้อมแล้ว", "task definition สร้างเสร็จ");
  // service
  await L.intro(2, "ECS service", "รักษาจำนวน task + ผูก ALB", "นี่คือ ECS service ที่คอยรักษาจำนวน task ให้ครบ และผูกกับ load balancer");
  await L.cap("⑧ Clusters › pharmacy-dev › Create service", "กลับไปที่ cluster แล้วกด Create เพื่อสร้าง service"); await L.click(B("Clusters")); await L.click({ t: "pharmacy-dev", tag: "a,td,span", starts: true }); await L.click(B("Create", { nth: 0 }));
  await L.cap("⑨ เลือก task definition · ตั้งชื่อ service pharmacy-api · desired 1", "เลือก task definition ที่เพิ่งสร้าง ตั้งชื่อ service และจำนวน task ที่ต้องการเป็นหนึ่ง");
  await step("std", async () => { await L.pickBtn("เลือก task definition", "pharmacy-api-dev:1"); });
  await step("sname", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "pharmacy-api"); });
  await soft("des", async () => { await L.fill("Desired tasks", "1"); });
  await L.cap("⑩ Networking: private subnet 3 โซน + security group ของ task (ไม่ให้ public IP)", "เครือข่ายเลือก private subnet ทั้งสามโซน และ security group ของ task ไม่ให้มี public IP");
  for (const n of ["pharmacy-private-1", "pharmacy-private-2", "pharmacy-private-3", "pharmacy-task"]) await step("tick-" + n, async () => { await tickBox(n); });
  await L.cap("⑪ Load balancer: เลือก target group pharmacy-api-dev + container api:8000", "ผูกกับ load balancer เลือก target group ของ dev และ container api port แปดพัน");
  await step("tg", async () => { await L.pickBtn("เลือก target group", "pharmacy-api-dev"); });
  await L.cap("⑫ Create → task ขึ้นครบและ healthy", "กด Create ระบบจะสตาร์ท task แล้วรอจนผ่าน health check"); await L.hold(1); await L.click(B("Create", { nth: 0 })); await L.hold(1.5);
  console.log("SVC", await txt(0, 500));
  await L.tick(2, "service Running", "service ทำงานแล้ว task ผ่าน health check");
  // browser
  await L.intro(3, "Browser", "ทดสอบเรียกผ่าน ALB", "มาทดสอบเรียกแอปผ่าน load balancer");
  const url = await L.ev(`"http://" + S.albs[0].dns + ":8080"`);
  await L.cap("⑬ แท็บ Browser → http://<ALB>:8080 (dev)", "ไปที่แท็บ Browser เปิด load balancer ที่ port แปดพันแปดสิบ ซึ่งเป็นของ dev"); await L.click(B("Browser", { nth: 0 }));
  await step("br", async () => { await L.pickBtn("— เลือกตัวอย่าง —", "ไม่ระบุ"); });
  await step("br2", async () => { await L.sleep(400); await L.type("main input[placeholder], main input[type=text]", url); });
  await L.click(B("Go")); await L.hold(2.5);
  console.log("END", await txt(0, 700));
  await L.tick(3, "ALB ตอบจาก task", "load balancer ตอบกลับจาก task ได้แล้ว");
  await L.costScene("ecs", "เรื่องค่าใช้จ่าย use case นี้แพงที่สุดในชุด เพราะมีของที่เปิดทิ้งตลอด คือ NAT gateway กับ load balancer และฐานข้อมูล RDS ซึ่งไม่ขึ้นกับจำนวนผู้ใช้ เปิดทิ้งหนึ่งเดือนประมาณสองร้อยแปดดอลลาร์ แต่ถ้าทำ lab สี่ชั่วโมงแล้วลบทิ้ง ประมาณหนึ่งดอลลาร์ ดังนั้นตั้ง Budget และ Cost Explorer ไว้ดูว่า NAT กับ load balancer กินเท่าไร และทำเสร็จต้อง terraform destroy ทุกครั้ง");
  await L.cap("✓ สำเร็จ: ผู้ใช้ → ALB → ECS task (Fargate) → RDS", "สรุป ผู้ใช้เข้าที่ load balancer ส่งต่อให้ task บน Fargate ซึ่งคุยกับฐานข้อมูล RDS โดยเราไม่ต้องดูแลเครื่องเลย"); await L.hold(1);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase2c.mp4"));
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
