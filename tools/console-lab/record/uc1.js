const L = require("./lib.js");
const B = (t, o) => Object.assign({ t, tag: "button" }, o);
const svc = async (t) => { await L.click(B("Services")); await L.click({ t, tag: "button", starts: true }); };
(async () => {
  await L.start("file://" + require("path").resolve(__dirname, "../index.html") + "");
  await L.cap("Use case 1 · เว็บ static: S3 + CloudFront + Route 53 + ACM"); await L.hold(2.2);
  // 1 S3
  await L.cap("① เปิดเมนู Services → S3"); await svc("S3 Scalable");
  await L.cap("② S3 › Create bucket"); await L.click(B("Create bucket"));
  await L.cap("③ ตั้งชื่อ bucket (ไม่ซ้ำทั้งโลก) · ปล่อย Block all public access เปิดไว้"); await L.pick({ label: "Bucket name" }, "pharmacy-web-dev"); 
  console.log("A", await L.where2()); await L.click(B("Create bucket")); console.log("B", await L.where2()); await L.hold(1.5);
  await L.cap("④ เปิด bucket → Objects → Upload ไฟล์ index.html"); await L.click({ t: "pharmacy-web-dev", starts: true, tag: "a,td,span,div,b" });
  await L.click(B("Upload"));
  await L.cap("⑤ ไฟล์ตัวอย่าง index.html (เนื้อหาแก้ได้) → Upload"); await L.hold(1.2); await L.click(B("Upload")); await L.hold(1.2);
  // Route 53
  await L.cap("⑥ Route 53 › Hosted zones › Create hosted zone"); await svc("Route 53 Scalable");
  await L.click(B("Create hosted zone")); await L.pick({ label: "Domain name" }, "pharmacy.example.com"); await L.click(B("Create hosted zone")); await L.hold(1.2);
  // ACM
  await L.cap("⑦ ACM › Request certificate (ใบรับรองของ CloudFront ต้องอยู่ us-east-1)"); await svc("Certificate Manager");
  await L.click(B("Request certificate", { nth: 0 }));
  await L.pick({ label: "Fully qualified domain name" }, "pharmacy.example.com");
  await L.pick({ label: "Add another name" }, "dev.pharmacy.example.com");
  await L.click(B("Request")); await L.hold(1.2);
  await L.cap("⑧ ใบรับรองต้องพิสูจน์โดเมน: Create records in Route 53 (สร้าง CNAME ให้คลิกเดียว)"); await L.click(B("Create records in Route 53"));
  await L.hold(1.4);
  await L.cap("⑨ CloudFront › Create distribution (wizard 4 ขั้น)"); await svc("CloudFront Global");
  await L.click(B("Create distribution", { nth: 0 }));
  await L.pick({ label: "Distribution name" }, "pharmacy web dev"); await L.click(B("Next"));
  await L.cap("Specify origin: เลือก S3 bucket · Origin access = OAC (recommended) · Default root object = index.html");
  await L.pick({ label: "S3 origin" }, "pharmacy-web-dev"); await L.hold(1); await L.click(B("Next"));
  await L.cap("Enable security: ใช้ค่า default แล้ว Next"); await L.hold(1); await L.click(B("Next"));
  await L.cap("Custom domain: dev.pharmacy.example.com + ใบรับรองที่ Issued แล้ว → Create distribution");
  await L.pick({ label: "Alternate domain name" }, "dev.pharmacy.example.com"); await L.pick({ label: "Custom SSL certificate" }, "pharmacy.example.com");
  await L.hold(1); await L.click(B("Create distribution")); await L.hold(1.4);
  console.log(await L.where2(), (await L.ev(`document.querySelector("main,.main").innerText`)).replace(/\n+/g," ¦ ").slice(0,500));
  await L.cap("⑩ Route 53 › Create record: dev → Alias ไป CloudFront"); await svc("Route 53 Scalable");
  await L.click(B("Create record", { nth: 0 }));
  await L.pick({ label: "Record name" }, "dev"); await L.pickBtn("เลือก distribution", "dev.pharmacy.example.com"); await L.click(B("Create records")); await L.hold(1.4);
  // เปิดเว็บที่ Browser
  await L.cap("⑪ เปิดเว็บที่แท็บ Browser → https://dev.pharmacy.example.com"); await L.click(B("Browser", { nth: 0 }));
  await L.pickBtn("— เลือกตัวอย่าง —", "dev.pharmacy.example.com"); await L.click(B("Go")); await L.hold(2.5);
  await L.cap("✓ สำเร็จ: DNS → CloudFront → S3 (OAC) ได้หน้าเว็บ HTTPS ครบทุกขั้น"); await L.hold(3);
  console.log("frames", await L.finish());
  await L.finish();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
