// use case 2 ตอน B: ECR (repo + push image) · ฐานข้อมูล RDS · Target group · ALB
const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const step = async (n, f) => { for (let i = 0; i < 3; i++) { try { await f(); return; } catch (e) { console.log("ATTEMPT", n, i, e.message.slice(0, 160)); await L.ev(`document.body.click();1`); if (i === 2) { console.log("FAIL", n, e.message.slice(0, 300)); await L.finish(); process.exit(1); } } } };
const soft = async (n, f) => { try { await f(); } catch (e) { console.log("SOFT", n, e.message.slice(0, 140)); await L.ev(`document.body.click();1`); } };
const svc = async (t, cat) => { await L.click(B("Services")); if (cat) { await L.click(B(cat)); await L.sleep(300); } await L.click(B(t, { starts: true })); };
// ติ๊ก/เอาติ๊กออก checkbox ของ label ที่ข้อความมีคำว่า sub (หลัง filter ด้วย on: true=ต้องยังไม่ติ๊ก, false=ต้องติ๊กอยู่)
const toggleHas = async (sub, wantChecked) => { const r = await L.ev(`(function(sub,want){ [].slice.call(document.querySelectorAll("[data-tk]")).forEach(function(e){e.removeAttribute("data-tk")}); var ls=[].slice.call(document.querySelectorAll("main label.opt")).filter(function(l){return (l.innerText||"").indexOf(sub)>=0 && l.querySelector("input[type=checkbox]")}); var l=ls[0]; if(!l) return "none"; var c=l.querySelector("input"); if(c.checked===want) return "already"; c.setAttribute("data-tk","1"); return "ok"; })(${JSON.stringify(sub)},${!!wantChecked})`); if (r === "none") throw new Error("ไม่พบ checkbox " + sub); if (r === "ok") await L.click("[data-tk]"); };
const tickAll = async (re) => { for (let i = 0; i < 8; i++) { const r = await L.ev(`(function(re){ [].slice.call(document.querySelectorAll("[data-tk]")).forEach(function(e){e.removeAttribute("data-tk")}); var R=new RegExp(re); var ls=[].slice.call(document.querySelectorAll("main label.opt")).filter(function(l){return R.test(l.innerText) && l.querySelector("input[type=checkbox]") && !l.querySelector("input").checked}); if(!ls.length) return 0; ls[0].querySelector("input").setAttribute("data-tk","1"); return ls.length; })(${JSON.stringify(re)})`); if (!r) break; await L.click("[data-tk]"); await L.sleep(250); } };
const lbl = async (t) => { await L.click({ t, tag: "main label.opt", starts: true }); await L.sleep(250); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html"));
  await L.plan([["ECR repo", "ECR"], ["push image", "ECR"], ["DB subnet group", "RDS"], ["RDS", "RDS"], ["Target group", "EC2"], ["ALB", "EC2"]]);
  await L.cap("Use case 2 · ตอน B: ECR · ฐานข้อมูล RDS · Target group · Load balancer", "use case สอง ตอนที่สอง ทำของที่ต้องมีก่อนสร้าง service คือ ที่เก็บ image ใน ECR ฐานข้อมูล RDS Postgres และ load balancer พร้อม target group"); await L.hold(1);
  await L.ev(`buildEcs("ecs-base"); S.repos=[]; S.rds=[]; S.dbsg=[]; S.tgs=[]; S.albs=[]; S.lgs=[]; UI.sel={}; render(); 1`);
  await L.cap("ก่อนเริ่ม: ต้องทำตอน A แล้ว (VPC, security group 3 ชั้น, IAM role) และมี aws CLI + docker", "ตอนนี้ต้องทำตอนที่หนึ่งเสร็จแล้ว คือมีเครือข่าย security group และ role และเครื่องเรามี aws CLI กับ docker พร้อม"); await L.hold(1);
  // ECR
  await L.intro(0, "ECR", "ที่เก็บ container image", "เริ่มจากสร้างที่เก็บ image ใน ECR");
  await L.cap("① ECR › Create repository: pharmacy/api · Tag immutability เปิด", "เปิด ECR กด Create repository ตั้งชื่อ pharmacy slash api และเปิด Tag immutability"); await svc("Elastic Container Registry", "Containers"); await L.click(B("Create repository", { nth: 0 }));
  await step("rn", async () => { await L.fill("Repository name", "pharmacy/api"); }); await step("ri", async () => { await L.click(B("Enabled", { nth: 0 })); });
  await L.hold(1); await L.click(B("Create repository", { nth: 0 })); await L.hold(1.5);
  await L.tick(0, "repository พร้อมแล้ว", "สร้าง repository เรียบร้อย");
  await L.intro(1, "Push image", "ส่ง image ขึ้น ECR", "ต่อมา push image เวอร์ชัน v หนึ่งจุดศูนย์จุดศูนย์ขึ้นไป");
  await L.cap("② เลือก repository › Actions › Docker push / pull → Run (aws ecr get-login-password | docker login → docker push)", "เลือก repository เมนู Actions เลือก Docker push กด Run ระบบล็อกอิน ECR แล้ว push image");
  await step("rs", async () => { await L.click({ t: "pharmacy/api", tag: "a,td", starts: true }); }); await L.click(B("Actions")); await L.click(B("Docker push", { starts: true })); await L.hold(2); await L.click(B("Run", { nth: 0 })); await L.hold(3);
  await L.tick(1, "push สำเร็จ", "push image สำเร็จ");
  // DB subnet group
  await L.intro(2, "DB subnet group", "บอก RDS ว่าวางฐานข้อมูลที่ subnet ไหน", "ต่อมาฐานข้อมูล RDS ต้องมี DB subnet group บอกว่าให้วางใน subnet private ไหนบ้าง");
  await L.cap("③ RDS › Subnet groups › Create DB subnet group: pharmacy-api-db · เลือก private subnet 3 โซน", "เปิด RDS ไปที่ Subnet groups กด Create ตั้งชื่อ pharmacy api db และเลือก private subnet ทั้งสามโซน"); await svc("RDS", "Database"); await L.click(B("Subnet groups")); await L.click(B("Create DB subnet group", { nth: 0 }));
  await step("dgn", async () => { await L.fill("Name", "pharmacy-api-db"); }); await step("dgd", async () => { await L.fill("Description", "pharmacy api db"); });
  console.log("SUBNETLABELS", await L.ev(`[].slice.call(document.querySelectorAll("main label.opt")).map(function(l){return (l.innerText||"").trim().slice(0,60)}).slice(0,12).join(" | ")`));
  await step("dgs", async () => { await tickAll("private"); });
  await L.hold(1.2); await L.click(B("Create", { nth: 0 })); await L.hold(1.5);
  await L.tick(2, "subnet group พร้อมแล้ว", "สร้าง DB subnet group เรียบร้อย");
  // RDS
  await L.intro(3, "RDS", "ฐานข้อมูล Postgres แบบ managed", "ต่อมาสร้างฐานข้อมูล RDS Postgres ให้ AWS ดูแล backup และ patch ให้");
  await L.cap("④ RDS › Create database: PostgreSQL · Dev/Test · pharmacy-api-dev · user pharmacy · รหัสผ่านให้ Secrets Manager", "กด Create database เลือก PostgreSQL แบบ Dev Test ตั้งชื่อ pharmacy api dev ผู้ใช้ pharmacy และให้ AWS เก็บรหัสผ่านใน Secrets Manager ไม่ต้องตั้งเอง");
  await L.click(B("Databases")); await L.click(B("Create database", { nth: 0 }));
  await step("eng", async () => { await lbl("PostgreSQL"); }); await step("tpl", async () => { await lbl("Dev/Test"); });
  await step("dbi", async () => { await L.fill("DB instance identifier", "pharmacy-api-dev"); }); await step("dbu", async () => { await L.fill("Master username", "pharmacy"); });
  await L.cap("⑤ ขนาด db.t4g.micro · 20 GiB · อยู่ใน VPC ของเรา · DB subnet group ที่สร้าง · ไม่เปิด public · security group pharmacy-db", "เลือกขนาดเล็ก db t4g micro พื้นที่ยี่สิบกิกะไบต์ วางใน VPC ของเรา ใช้ subnet group ที่เพิ่งสร้าง ไม่เปิด public และใช้ security group ของฐานข้อมูล");
  await soft("cls", async () => { await L.choose("DB instance class", "db.t4g.micro"); }); await soft("sto", async () => { await L.fill("Allocated storage", "20"); });
  await soft("sgp", async () => { await L.choose("DB subnet group", "pharmacy-api-db"); });
  await soft("pub", async () => { await lbl("No"); });
  await soft("sg1", async () => { await toggleHas("pharmacy-db", true); }); await soft("sg0", async () => { await toggleHas("default", false); });
  await L.hold(1.5); await L.click(B("Create database", { nth: 0 })); await L.hold(2);
  await L.tick(3, "ฐานข้อมูลพร้อมแล้ว", "ฐานข้อมูลพร้อมใช้งาน");
  // Target group
  await L.intro(4, "Target group", "กลุ่มปลายทางที่ ALB ส่งต่อ", "ต่อมาสร้าง target group ให้ load balancer ส่งทราฟฟิกไปหา task");
  await L.cap("⑥ EC2 › Target Groups › Create: ชนิด IP addresses (Fargate) · ชื่อ pharmacy-api-dev · port 8000 · health check /healthz", "เปิด EC2 ไปที่ Target Groups กด Create เลือกชนิด IP addresses เพราะ Fargate ใช้ไอพีของ task ตั้งชื่อ pharmacy api dev พอร์ตแปดพัน และ health check ที่ path healthz"); await svc("EC2", "Compute"); await L.click(B("Target Groups")); await L.click(B("Create target group", { nth: 0 }));
  await step("ttype", async () => { await L.click({ t: "IP addresses", tag: "main .rcard", starts: true }); });
  await step("tn", async () => { await L.fill("Target group name", "pharmacy-api-dev"); }); await step("tp", async () => { await L.fill("Port", "8000"); });
  await soft("tv", async () => { await L.choose("VPC", "pharmacy-vpc"); }); await step("th", async () => { await L.fill("Health check path", "/healthz"); });
  await L.hold(1.2); await soft("tnx", async () => { await L.click(B("Next", { nth: 0 })); await L.hold(1); }); await L.click(B("Create target group", { nth: 0 })); await L.hold(1.5);
  await L.tick(4, "target group พร้อมแล้ว", "สร้าง target group เรียบร้อย");
  // ALB
  await L.intro(5, "ALB", "load balancer หน้าบ้าน", "สุดท้าย สร้าง Application Load Balancer");
  await L.cap("⑦ EC2 › Load Balancers › Create ALB: pharmacy-api-alb · Internet-facing · 3 public subnet · SG pharmacy-alb · listener 8080 → target group", "เปิด Load Balancers กด Create เลือก Application Load Balancer ตั้งชื่อ pharmacy api alb แบบ Internet facing เลือก public subnet สามโซน security group ของ ALB และ listener พอร์ตแปดพันแปดสิบส่งไปที่ target group"); await L.click(B("Load Balancers")); await L.click(B("Create load balancer", { starts: true, nth: 0 }));
  await soft("alb0", async () => { await L.click(B("Create", { starts: true, nth: 0 })); });
  await step("an", async () => { await L.fill("Load balancer name", "pharmacy-api-alb"); });
  await soft("av", async () => { await L.choose("VPC", "pharmacy-vpc"); });
  await step("as", async () => { await tickAll("pharmacy-public"); });
  await soft("ag1", async () => { await toggleHas("pharmacy-alb", true); }); await soft("ag0", async () => { await toggleHas("default", false); });
  await soft("lp", async () => { try { await L.pickBtn("80", "8080"); } catch (e) { await L.ev(`document.body.click();1`); await L.pickBtn("80", "ไม่ระบุ"); await L.sleep(350); await L.ev(`[].slice.call(document.querySelectorAll("[data-fx2]")).forEach(function(e){e.removeAttribute("data-fx2")}); var rs=[].slice.call(document.querySelectorAll("main .row.r3")); var i=rs[0]&&rs[0].querySelector("input[type=text],input:not([type])"); if(i) i.setAttribute("data-fx2","1"); 1`); await L.type("[data-fx2]", "8080"); } });
  await soft("lt", async () => { await L.pickBtn("Select a target group", "pharmacy-api-dev"); });
  await L.hold(1.5); await L.click(B("Create load balancer", { nth: 0 })); await L.hold(2);
  await L.tick(5, "ALB พร้อมแล้ว", "สร้าง load balancer เรียบร้อย");
  console.log("CHECK", await L.ev(`JSON.stringify({repo:S.repos.map(function(r){return r.name+":"+r.images.length}),dbsg:S.dbsg.map(function(g){return g.name+":"+(g.subnetIds||[]).length}),rds:S.rds.map(function(r){return r.id+":"+r.engine+":"+r.cls+":"+(r.sgIds||[]).length}),tg:S.tgs.map(function(t){return t.name+":"+t.ttype+":"+t.port+":"+t.hcPath}),alb:S.albs.map(function(a){return a.name+":"+a.subnetIds.length+":"+JSON.stringify(a.listeners.map(function(l){return l.port}))})})`));
  await L.costScene("ecs", "เรื่องค่าใช้จ่าย ตอนนี้เริ่มมีของที่คิดเงินตามชั่วโมงแล้ว คือ NAT gateway load balancer และฐานข้อมูล RDS ลบทิ้งเมื่อเลิกใช้ และตั้ง Budget ไว้");
  await L.cap("✓ ตอน B เสร็จ: ECR + RDS + target group + ALB · ตอน C: ECS cluster / task definition / service", "สรุป ตอนนี้พร้อมสำหรับรัน container แล้ว ตอนที่สามจะสร้าง ECS cluster task definition และ service"); await L.hold(1);
  await L.encode(require("path").resolve(__dirname, "../videos/usecase2b.mp4"));
  await L.finish();
})().catch(async (e) => { console.error("ERR", e.message); try { console.log("ALERT", await L.ev(`(document.querySelector(".alert.error")||{innerText:"none"}).innerText`)); } catch (x) {} process.exit(1); });
