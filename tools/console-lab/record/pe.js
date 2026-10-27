const L=require("./lib.js");
const B=(t,o)=>Object.assign({t,tag:"button"},o);
const T=async(a=0,n=600)=>(await L.ev(`document.querySelector("main,.main").innerText`)).replace(/\s+/g," ").slice(a,a+n);
const D=async(k=10)=>(await L.dump()).split("¦").filter(x=>/button/.test(x)).slice(-k).join("|").slice(0,420);
(async()=>{
 await L.start("file://"+require("path").resolve(__dirname,"../index.html"));
 // SG
 await L.ev(`buildSingle("single-sg"); UI.sel={}; render(); 1`);
 await L.click(B("Services")); await L.click(B("Compute")); await L.sleep(300); await L.click(B("EC2",{starts:true})); await L.sleep(300);
 await L.click(B("Security Groups")); await L.sleep(400);
 await L.click({t:"pharmacy-single-web",tag:"a,td",starts:true}); await L.sleep(500);
 await L.click(B("Actions",{nth:0})); await L.sleep(300); console.log("SG-MENU",await D(8));
 await L.click(B("Edit inbound rules")); await L.sleep(600); console.log("SG-PAGE",await T(0,400)); console.log("SG-BTN",await D(10));
 // App Runner
 await L.ev(`buildApr("apr-port"); UI.sel={}; render(); 1`);
 await L.click(B("Services")); await L.click(B("Containers")); await L.sleep(300); await L.click(B("App Runner",{starts:true})); await L.sleep(400);
 await L.click({t:"pharmacy-api-prd",tag:"a,td",starts:true}); await L.sleep(500); console.log("AP-1",await T(0,300)); console.log("AP-BTN",await D(10));
 await L.click(B("Actions",{nth:0})); await L.sleep(300); console.log("AP-MENU",await D(8));
 // Lambda
 await L.ev(`buildSls("sls-invoke"); UI.sel={}; render(); 1`);
 await L.click(B("Services")); await L.click(B("Compute")); await L.sleep(300); await L.click(B("Lambda",{starts:true})); await L.sleep(400);
 await L.click({t:"pharmacy-api-prd",tag:"a,td",starts:true}); await L.sleep(500); console.log("LM-1",await T(0,300)); console.log("LM-BTN",await D(12));
 try{await L.finish()}catch(e){}
})().catch(e=>{console.error("ERR",e.message);process.exit(1)});
