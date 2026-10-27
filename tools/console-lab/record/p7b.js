const L=require("./lib.js");
const B=(t,o)=>Object.assign({t,tag:"button"},o);
const T=async(a=0,n=900)=>(await L.ev(`document.querySelector("main,.main").innerText`)).replace(/\s+/g," ").slice(a,a+n);
(async()=>{
 await L.start("file://"+require("path").resolve(__dirname,"../index.html"));
 await L.ev(`buildEcs("ecs-base"); S.repos=[]; S.laptop.dockerReg=null; UI.sel={}; render(); 1`);
 await L.click(B("Services")); await L.click(B("Containers")); await L.sleep(300); await L.click(B("Elastic Container Registry",{starts:true})); await L.sleep(400);
 console.log("E0",await T(0,200));
 await L.click(B("Create repository",{nth:0})); await L.sleep(500);
 console.log("E1",await T(0,300));
 try { await L.fill("Repository name","pharmacy/api"); console.log("fill ok"); } catch(e){ console.log("fillERR",e.message.slice(0,120)); }
 console.log("E2",await L.ev(`[].slice.call(document.querySelectorAll("main input,main select")).map(e=>e.tagName+":"+e.type+":"+(e.placeholder||"")+":"+(e.value||"").slice(0,24)).join(" | ")`));
 await L.click(B("Enabled",{nth:0})); await L.sleep(300);
 await L.click(B("Create repository",{nth:0})); await L.sleep(700);
 console.log("E3",await T(0,500));
 await L.click({t:"pharmacy/api",tag:"a,td",starts:true}); await L.sleep(400);
 await L.click(B("Actions")); await L.sleep(300);
 console.log("MENU",(await L.dump()).split("¦").filter(x=>/button/.test(x)).slice(-8).join("|").slice(0,400));
 await L.click(B("Docker push",{starts:true})); await L.sleep(600);
 console.log("CK",await L.ev(`[].slice.call(document.querySelectorAll("main input[type=checkbox]")).map(e=>e.checked).join(",")`));
 await L.click(B("Run",{nth:0})); await L.sleep(800);
 console.log("R1",await T(0,900));
 await L.ev(`API.createRole({name:"pharmacy-apprunner-ecr",entity:"AWS service",usecase:"AppRunner",policies:["AWSAppRunnerServicePolicyForECRAccess"]}); 1`);
 await L.click(B("Services")); await L.click(B("Containers")); await L.sleep(300); await L.click(B("App Runner",{starts:true})); await L.sleep(400);
 await L.click(B("Create an App Runner service")); await L.sleep(600);
 await L.choose("Container image URI","pharmacy/api:v1.0.0");
 await L.choose("ECR access role","pharmacy-apprunner-ecr");
 await L.fill("Service name","pharmacy-api-dev");
 await L.choose("vCPU","0.25 vCPU");
 try { await L.fill("Port","8000"); } catch(e){ console.log("portERR",e.message.slice(0,100)); }
 console.log("F1",await L.ev(`[].slice.call(document.querySelectorAll("main input[type=text],main input:not([type])")).map(e=>(e.placeholder||"")+"="+e.value).join(" | ")+" || "+[].slice.call(document.querySelectorAll("main .csel-btn")).map(b=>(b.innerText||"").trim().slice(0,28)).join(" | ")`));
 try{await L.finish()}catch(e){}
})().catch(e=>{console.error("ERR",e.message);process.exit(1)});
