const L=require("./lib.js");
const B=(t,o)=>Object.assign({t,tag:"button"},o);
const T=async(a=0,n=700)=>(await L.ev(`document.querySelector("main,.main").innerText`)).replace(/\s+/g," ").slice(a,a+n);
(async()=>{
 await L.start("file://"+require("path").resolve(__dirname,"../index.html"));
 await L.ev(`fresh(); UI.sel={}; render(); 1`);
 await L.click(B("Services")); await L.click(B("Database")); await L.sleep(300); await L.click(B("DynamoDB",{starts:true})); await L.sleep(400);
 console.log("D0",await T(0,300));
 await L.click(B("Create table",{nth:0})); await L.sleep(500);
 await L.fill("Table name","pharmacy-drugs-dev"); 
 console.log("D1",await L.ev(`[].slice.call(document.querySelectorAll("main input[type=text],main input:not([type]),main input[type=checkbox],main input[type=radio]")).map(e=>(e.placeholder||e.type)+"="+(e.value||"")+(e.checked?"✓":"")).join(" | ")`));
 await L.click(B("Create table",{nth:0})); await L.sleep(700);
 console.log("D2",await T(0,500));
 console.log("D2b",(await L.dump()).split("¦").filter(x=>/button|^ A/.test(x)).slice(-14).join("|").slice(0,500));
 await L.click({t:"pharmacy-drugs-dev",tag:"a,td",starts:true}); await L.sleep(500);
 console.log("D3",await T(0,500));
 console.log("D3b",(await L.dump()).split("¦").filter(x=>/button/.test(x)).slice(-10).join("|").slice(0,400));
 try{await L.finish()}catch(e){}
})().catch(e=>{console.error("ERR",e.message);process.exit(1)});
