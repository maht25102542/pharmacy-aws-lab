const L=require("./lib.js");const fs=require("fs");
const OUTD="/tmp/claude-1000/-home-swd-Desktop-work-pharmacy-aws-lab/e26c2d62-bc7d-42b2-9d98-9b40ddadd580/scratchpad/ws";
(async()=>{await L.start("file://"+require("path").resolve(__dirname,"../index.html"));
 const shot=async(n)=>{const r=await L.send("Page.captureScreenshot",{format:"png"});fs.writeFileSync(OUTD+"/"+n+".png",Buffer.from(r.result.data,"base64"));};
 await L.ev(`document.getElementById("__cur").style.display="none";UC_SEL.id="ecs";go("lab-uc",{},"Lab");1`); await L.sleep(500);
 await L.ev(`var f=[].slice.call(document.querySelectorAll("summary,.fold>.fh,button")).filter(function(e){return /ค่าใช้จ่าย & Bill/.test(e.innerText)})[0]; if(f){f.scrollIntoView({block:"start"}); window.scrollBy(0,-60);} 1`); await L.sleep(400); await shot("c1");
 await L.ev(`go("lab-cost",{},"Lab");window.scrollTo(0,0);1`); await L.sleep(500); await shot("c2");
 console.log("ok");await L.finish();process.exit(0)})().catch(e=>{console.log("ERR",e.message);process.exit(1)});
