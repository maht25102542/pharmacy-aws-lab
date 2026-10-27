const L=require("./lib.js");
const B=(t,o)=>Object.assign({t,tag:"button"},o);
const T=async(a=0,n=1100)=>(await L.ev(`document.body.innerText`)).replace(/\s+/g," ").slice(150+a,150+a+n);
(async()=>{
 await L.start("file://"+require("path").resolve(__dirname,"../index.html"));
 await L.ev(`buildGha("gha-base"); var pv=API.createOidcProvider({url:"https://"+GHA_ISSUER,audience:"sts.amazonaws.com"}).res; API.createRoleWeb({name:"github-actions-deploy",provider:pv.arn,audience:"sts.amazonaws.com",org:ghUser(),repo:"pharmacy-backend",branch:""}); UI.sel={}; render(); 1`);
 const u=await L.ev(`"https://github.com/"+ghUser()+"/pharmacy-backend/actions"`);
 await L.click(B("Browser",{nth:0})); await L.sleep(300); await L.ev(`wbGo(${JSON.stringify(u)}); render(); 1`); await L.sleep(500);
 await L.pickBtn("— เลือกตัวอย่าง —","github-actions-deploy"); await L.sleep(300);
 await L.click(B("Commit changes")); await L.sleep(800);
 await L.click(B("git push",{starts:true})); await L.sleep(800);
 await L.click({t:"deploy #1",tag:"a"}); await L.sleep(800);
 console.log("R1",(await L.ev(`document.querySelector("main,.main").innerText`)).replace(/\s+/g," ").slice(380,2600));
 await L.finish();
})().catch(e=>{console.error("ERR",e.message);process.exit(1)});
