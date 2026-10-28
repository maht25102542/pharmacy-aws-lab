// use case 2 ตอน A: เครือข่าย (VPC 3 AZ + NAT) + Security Group 3 ชั้น + IAM role ของ ECS
const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n, e.message.slice(0, 300)); await L.finish(); process.exit(1); } } } };
const soft = async (n, f) => { try { await f(); } catch (e) { console.log("SOFT", n, e.message.slice(0, 140)); await L.ev(`document.body.click();1`); } };
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
const tickLabel = async (t) => { await L.ev(`[].slice.call(document.querySelectorAll("main label.opt, main tbody tr")).forEach(function(l){ if((l.innerText||"").trim().indexOf(${JSON.stringify(t)})===0){ var c=l.querySelector("input[type=checkbox]"); if(c) c.setAttribute("data-tk","1"); } }); 1`); await L.click("[data-tk]"); await L.ev(`[].slice.call(document.querySelectorAll("[data-tk]")).forEach(function(e){e.removeAttribute("data-tk")}); 1`); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["VPC 3 AZ + NAT", "VPC"], ["SG ALB", "EC2"], ["SG task", "EC2"], ["SG DB", "EC2"], ["IAM roles", "IAM"]]);
  await L.cap("Use case 2 · ตอน A: เครือข่าย + Security Group + IAM role", "use case สอง ตอนที่หนึ่ง เตรียมโครงสร้างพื้นฐานก่อน คือ เครือข่าย VPC กับ NAT, security group สามชั้น และ IAM role สำหรับ ECS"); await L.hold(1);
  await L.ev(`fresh(); UI.sel={}; render(); 1`);
  // VPC
  await L.intro(0, "VPC", "เครือข่าย 3 โซน + NAT", "เริ่มจากเครือข่าย VPC สามโซน มี public subnet สำหรับ load balancer และ private subnet สำหรับ task กับฐานข้อมูล");
  await L.cap("① VPC › Create VPC › VPC and more · ชื่อ pharmacy · 10.0.0.0/16", "เปิด VPC กด Create VPC เลือก VPC and more ตั้งชื่อ pharmacy และช่วงไอพี สิบจุดศูนย์จุดศูนย์จุดศูนย์ สแลช สิบหก"); await svc("VPC", "Networking & Content Delivery"); await L.click(B("Create VPC", { nth: 0 }));
  await step("vcard", async () => { await L.card("VPC and more"); });
  await step("vname", async () => { await L.fill("Name tag auto-generation", "pharmacy"); });
  await step("vcidr", async () => { await L.fill("IPv4 CIDR block", "10.0.0.0/16"); });
  await L.cap("② 3 AZ · public subnet 3 · private subnet 3 · NAT gateway 1 ตัว (ประหยัด)", "ใช้สามโซน มี public subnet สามอัน private subnet สามอัน และ NAT gateway หนึ่งตัวเพื่อประหยัด เพราะ NAT คิดเงินตามชั่วโมง");
  await step("az", async () => { await L.choose("Number of Availability Zones", "3"); });
  await step("pub", async () => { await L.choose("Number of public subnets", "3"); });
  await step("priv", async () => { await L.choose("Number of private subnets", "3"); });
  await step("nat", async () => { await L.click(B("In 1 AZ")); });
  await L.hold(1.5); await L.cap("③ Create VPC", "กด Create VPC"); await L.click(B("Create VPC", { nth: 0 })); await L.hold(2);
  await L.tick(0, "เครือข่ายพร้อมแล้ว", "เครือข่ายพร้อมแล้ว");
  // SG ทั้งสาม
  const mkSg = async (idx, name, desc, rows, intro) => {
    await L.intro(idx, name, desc, intro);
    await L.cap("EC2 › Security Groups › Create security group: " + name, "สร้าง security group ชื่อ " + name.replace("pharmacy-", "pharmacy ")); await svc("EC2", "Compute"); await L.click(B("Security Groups")); await L.click(B("Create security group", { nth: 0 }));
    await step("n" + idx, async () => { await L.fill("Security group name", name); });
    await step("d" + idx, async () => { await L.fill("Description", name.replace("pharmacy-", "")); });
    for (const r of rows) {
      await step("add" + idx, async () => { await L.click(B("Add rule", { nth: 0 })); });
      await soft("rt" + idx, async () => { await L.chooseLast("SSH", r.type); });
      if (r.port) await step("rp" + idx, async () => { await L.chooseNth("— เลือกตัวอย่าง —", "ไม่ระบุ", 1); await L.sleep(350); await L.typeInRowOf(r.port); });
      if (r.src === "any") await soft("rs" + idx, async () => { await L.chooseLast("My IP", "Anywhere-IPv4"); });
      if (r.src && r.src !== "any" && r.src !== "me") { await soft("rs" + idx, async () => { await L.chooseLast("My IP", "Security group"); }); await soft("rg" + idx, async () => { await L.chooseLast("เลือก security group", r.src); }); }
    }
    await L.hold(1.5); await L.click(B("Create security group", { nth: 0 })); await L.hold(1.5);
    await L.tick(idx, name + " พร้อมแล้ว", "สร้าง " + name.replace("pharmacy-", "pharmacy ") + " เรียบร้อย");
  };
  await mkSg(1, "pharmacy-alb", "รับเน็ตเข้าที่ load balancer", [{ type: "HTTP", src: "any" }, { type: "Custom TCP", port: "8080", src: "me" }], "ต่อมา security group สามชั้น ชั้นแรกคือของ load balancer รับ HTTP จากทุกที่ และพอร์ตแปดพันแปดสิบเฉพาะไอพีเรา สำหรับ dev");
  await mkSg(2, "pharmacy-task", "รับเฉพาะจาก ALB", [{ type: "Custom TCP", port: "8000", src: "pharmacy-alb" }], "ชั้นที่สอง ของ task รับพอร์ตแปดพัน เฉพาะจาก security group ของ ALB เท่านั้น");
  await mkSg(3, "pharmacy-db", "รับเฉพาะจาก task", [{ type: "PostgreSQL", src: "pharmacy-task" }], "ชั้นที่สาม ของฐานข้อมูล รับพอร์ตห้าสี่สามสอง เฉพาะจาก security group ของ task");
  // IAM
  await L.intro(4, "IAM", "role ของ ECS", "สุดท้าย IAM สร้างสอง role ให้ ECS คือ execution role กับ task role");
  const mkRole = async (name, withPolicies) => {
    await L.cap("IAM › Roles › Create role: " + name, "สร้าง role ชื่อ " + name.replace(/-/g, " ")); await svc("IAM", "Security, Identity, & Compliance"); await L.click(B("Roles")); await L.click(B("Create role", { nth: 0 }));
    await step("rsvc" + name, async () => { await L.pickBtn("EC2", "Elastic Container Service"); }); await L.sleep(400);
    await soft("ruc" + name, async () => { await L.click({ t: "Elastic Container Service Task", tag: "main label.opt,main .opt", starts: true }); });
    await L.click(B("Next"));
    if (withPolicies) { await step("pp1" + name, async () => { await tickLabel("AmazonECSTaskExecutionRolePolicy"); }); await step("pp2" + name, async () => { await tickLabel("SecretsManagerReadWrite"); }); await L.hold(1.2); }
    await L.click(B("Next"));
    await step("rn" + name, async () => { await L.fill("Role name", name); });
    await L.click(B("Create role", { nth: 0 })); await L.hold(1.5);
  };
  await mkRole("pharmacy-ecs-execution", true);
  await L.cap("execution role: ดึง image จาก ECR + เขียน log + อ่านรหัสผ่านจาก Secrets Manager", "execution role ใช้ดึง image จาก ECR เขียน log และอ่านรหัสผ่านจาก Secrets Manager"); await L.hold(1);
  await mkRole("pharmacy-ecs-task", false);
  await L.cap("task role: ให้โค้ดในคอนเทนเนอร์เรียก AWS (ไม่ใส่ policy ก็ได้ถ้าโค้ดไม่เรียก AWS)", "task role ใช้เมื่อโค้ดในคอนเทนเนอร์ต้องเรียก AWS ถ้าไม่ต้องเรียกก็ไม่ต้องแนบ policy"); await L.hold(1);
  await L.tick(4, "role พร้อมแล้ว", "สร้างทั้งสอง role เรียบร้อย");
  console.log("CHECK", await L.ev(`JSON.stringify({vpc:S.vpcs.map(function(v){return v.name}),subnets:S.subnets.length,nat:S.nats.length,sgs:S.sgs.filter(function(g){return /^pharmacy-(alb|task|db)$/.test(g.name)}).map(function(g){return g.name+":"+JSON.stringify(g.inbound||g.rules||[])}),roles:S.roles.map(function(r){return r.name+":"+r.policies.join("+")})})`));
  await L.cap("✓ ตอน A เสร็จ: เครือข่าย + SG 3 ชั้น + IAM role · ตอน B: ECR / RDS / ALB", "สรุป ตอนนี้มีเครือข่าย security group สามชั้น และ role พร้อมแล้ว ตอนที่สองจะทำ ECR ฐานข้อมูล และ load balancer"); await L.hold(1);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase2a.mp4"));
  await L.finish();
})().catch(async (e) => { console.error("ERR", e.message); try { console.log("ALERT", await L.ev(`(document.querySelector(".alert.error")||{innerText:"none"}).innerText`)); } catch (x) {} process.exit(1); });
