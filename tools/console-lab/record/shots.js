const L=require("./lib.js");const fs=require("fs");
const OUTD="/tmp/claude-1000/-home-swd-Desktop-work-pharmacy-aws-lab/e26c2d62-bc7d-42b2-9d98-9b40ddadd580/scratchpad/ws";fs.mkdirSync(OUTD,{recursive:true});
const cases=JSON.parse(process.argv[2]);
(async()=>{await L.start("file://"+require("path").resolve(__dirname,"../index.html"));
for(const [name,setup,url] of cases){
  try{ await L.ev(setup+";1"); const u=await L.ev(url); await L.click({t:"Browser",tag:"button",nth:0}); await L.sleep(300); await L.ev(`wbGo(${JSON.stringify(u)}); render(); 1`); await L.sleep(600);
   await L.ev(`window.scrollTo(0,0);document.getElementById("__cur").style.display="none";1`); const r=await L.send("Page.captureScreenshot",{format:"png"}); fs.writeFileSync(OUTD+"/"+name+".png",Buffer.from(r.result.data,"base64")); console.log("ok",name,u);
  }catch(e){console.log("ERR",name,e.message.slice(0,150))}
}
await L.finish();process.exit(0)})();
