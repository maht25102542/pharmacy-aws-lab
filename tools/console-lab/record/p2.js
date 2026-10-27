const L=require("./lib.js");
const B=(t,o)=>Object.assign({t,tag:"button"},o);
const T=async(a=0,n=1100)=>(await L.ev(`document.querySelector("main,.main").innerText`)).replace(/\s+/g," ").slice(a,a+n);
(async()=>{
 await L.start("file://"+require("path").resolve(__dirname,"../index.html"));
 await L.ev(`buildEcs("ecs-base"); API.createEcsCluster({name:"pharmacy-dev"}); var dbh=S.rds.filter(function(r){return r.id==="pharmacy-api-dev"})[0]; API.registerTd({family:"pharmacy-api-dev",cpu:256,memory:512,execRole:"pharmacy-ecs-execution",taskRole:"pharmacy-ecs-task",containers:[{name:"api",image:ecsRepoUri()+":v1.0.0",port:8000,env:[],secrets:[],logGroup:"/ecs/pharmacy-api-dev",logPrefix:"api"}]}); UI.sel={}; render(); 1`);
 await L.click(B("Services")); await L.click(B("Containers")); await L.sleep(300); await L.click(B("Elastic Container Service",{starts:true})); await L.sleep(400);
 await L.click({t:"pharmacy-dev",tag:"a,td,span",starts:true}); await L.sleep(500);
 await L.click(B("Create",{nth:0})); await L.sleep(600);
 console.log("S1",await T(0,1600));
 console.log("S1b",await L.ev(`[].slice.call(document.querySelectorAll("main input,main select,main textarea")).map(e=>e.tagName+":"+e.type+":"+(e.placeholder||"")+":"+(e.value||"").slice(0,20)+":"+(e.parentElement.className||"")).join(" | ")`));
 console.log("S1c",(await L.dump()).split("¦").filter(x=>/button/.test(x)).slice(-14).join("|").slice(0,700));
 await L.finish();
})().catch(e=>{console.error("ERR",e.message);process.exit(1)});
