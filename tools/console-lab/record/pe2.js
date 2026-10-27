const L=require("./lib.js");
const B=(t,o)=>Object.assign({t,tag:"button"},o);
const T=async(a=0,n=600)=>(await L.ev(`document.querySelector("main,.main").innerText`)).replace(/\s+/g," ").slice(a,a+n);
const D=async(k=10)=>(await L.dump()).split("¦").filter(x=>/button|^ A/.test(x)).slice(-k).join("|").slice(0,520);
(async()=>{
 await L.start("file://"+require("path").resolve(__dirname,"../index.html"));
 await L.ev(`buildApr("apr-port"); UI.sel={}; render(); 1`);
 await L.click(B("Services")); await L.click(B("Containers")); await L.sleep(300); await L.click(B("App Runner",{starts:true})); await L.sleep(400);
 await L.click({t:"pharmacy-api-prd",tag:"a,td",starts:true}); await L.sleep(500);
 await L.click(B("Configuration",{nth:0})); await L.sleep(500); console.log("AP-CFG",await T(0,500)); console.log("AP-B",await D(8));
 await L.ev(`buildSls("sls-invoke"); UI.sel={}; render(); 1`);
 await L.click(B("Services")); await L.click(B("Compute")); await L.sleep(300); await L.click(B("Lambda",{starts:true})); await L.sleep(400);
 await L.click({t:"pharmacy-api-prd",tag:"a,td",starts:true}); await L.sleep(500);
 await L.click(B("Configuration",{nth:0})); await L.sleep(500); console.log("LM-CFG",await T(0,500)); console.log("LM-B",await D(14));
 try{await L.finish()}catch(e){}
})().catch(e=>{console.error("ERR",e.message);process.exit(1)});
