const L=require("./lib.js");
const B=(t,o)=>Object.assign({t,tag:"button"},o);
const T=async(a=0,n=1100)=>(await L.ev(`document.body.innerText`)).replace(/\s+/g," ").slice(150+a,150+a+n);
(async()=>{
 await L.start("file://"+require("path").resolve(__dirname,"../index.html"));
 await L.ev(`buildGha("gha-base"); UI.sel={}; render(); 1`);
 await L.click(B("Services")); await L.click(B("Security, Identity, & Compliance")); await L.sleep(300); await L.click(B("IAM",{starts:true})); await L.sleep(300);
 await L.click(B("Identity providers")); await L.sleep(300); console.log("P1",await T(0,500));
 await L.click(B("Add provider")); await L.sleep(400); await L.click(B("Add provider")); await L.sleep(500); console.log("P3",await T(0,300));
 await L.click(B("Roles")); await L.sleep(300); await L.click(B("Create role")); await L.sleep(400);
 const q=async()=>L.ev(`[].slice.call(document.querySelectorAll("main .rcard")).map(function(e){return (e.innerText||"").trim().slice(0,10)+(e.className.indexOf("on")>=0?"[ON]":"")}).join(" ; ")`);
 console.log("DBG0",await q());
 console.log("pos",JSON.stringify(await L.where({t:"Web identity",tag:"main .rcard",starts:true})));
 await L.click({t:"Web identity",tag:"main .rcard",starts:true}); await L.sleep(600);
 console.log("DBG1",await q());
 console.log("W1",(await L.ev(`document.querySelector("main,.main").innerText`)).replace(/\s+/g," ").slice(380,1700));
 console.log("W1b",await L.ev(`[].slice.call(document.querySelectorAll("main input,main textarea,main select")).map(e=>e.tagName+":"+e.type+":"+(e.placeholder||"")+":"+(e.value||"").slice(0,24)).join(" | ")`));
 await L.finish();
})().catch(e=>{console.error("ERR",e.message);process.exit(1)});
