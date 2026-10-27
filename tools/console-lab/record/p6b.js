const L=require("./lib.js");
const B=(t,o)=>Object.assign({t,tag:"button"},o);
const T=async(a=0,n=900)=>(await L.ev(`document.querySelector("main,.main").innerText`)).replace(/\s+/g," ").slice(a,a+n);
(async()=>{
 await L.start("file://"+require("path").resolve(__dirname,"../index.html"));
 await L.ev(`fresh(); 1`);
 await L.ev(`buildSingle("single-base"); S.sgs=S.sgs.filter(function(g){return g.name!=="pharmacy-single-web"}); S.keys=[]; render(); 1`);
 await L.click(B("Services")); await L.click(B("Compute")); await L.sleep(300); await L.click(B("EC2",{starts:true})); await L.sleep(300);
 await L.click(B("Security Groups")); await L.sleep(300); await L.click(B("Create security group",{nth:0})); await L.sleep(500);
 await L.fill("Security group name","pharmacy-single-web"); await L.fill("Description","web");
 console.log("G0",await L.ev(`[].slice.call(document.querySelectorAll("main .f")).map(function(f){var l=f.querySelector(".l,label");return l?(l.innerText||"").trim().slice(0,24):"?"}).join(" | ")`));
 await L.click(B("Add rule",{nth:0})); await L.sleep(500);
 // แถวที่ 1 = SSH My IP (ค่าเริ่มต้น) ; เพิ่มแถว HTTP / HTTPS
 await L.click(B("Add rule",{nth:0})); await L.sleep(400);
 console.log("G2",await L.dump().then(d=>d.split("¦").filter(x=>/button/.test(x)).slice(-12).join("|").slice(0,500)));
 await L.pickBtn("SSH","HTTP"); console.log("G3",await L.ev(`[].slice.call(document.querySelectorAll("main .csel-btn")).map(b=>(b.innerText||"").trim().slice(0,22)).join(" | ")`));
 await L.finish();
})().catch(e=>{console.error("ERR",e.message);process.exit(1)});
