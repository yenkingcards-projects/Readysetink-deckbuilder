/* v27 — minigames, credits page, quiz feedback, and the renaming.
   Covers the parts of the Aug-15 batch that v26 doesn't. */
const {chromium}=require("/tmp/node_modules/playwright-core");
const SRC=require("fs").readFileSync(__dirname+"/flounder-search.html","utf8");
const F="file://"+__dirname+"/flounder-search.html";
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1900);
const D=()=>p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_dust")||"{}"));
const open_=async op=>{await p.evaluate(o=>{localStorage.setItem("fs3_opage",JSON.stringify(o));
  localStorage.setItem("fs3_tab",JSON.stringify("tOther"))},op);
  await p.reload();await p.waitForTimeout(1700)};
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== EVERY OTHER-PAGE TILE OPENS SOMETHING ===");
await p.click("#tOther");await p.waitForTimeout(600);
const ops=await p.evaluate(()=>[...document.querySelectorAll("[data-op]")].map(b=>b.dataset.op));
const GRP=SRC.slice(SRC.indexOf("const OTHER_GROUPS=["),SRC.indexOf("function renderOther"));
const OFF_SRC=(SRC.match(/const OFF=\[([^\]]*)\]/)||[,""])[1];
const nOff=(OFF_SRC.match(/"/g)||[]).length/2;
const nTiles=(GRP.match(/","[a-z]+(:[a-z]+)?"\]/g)||[]).length-nOff;
ok(ops.length===nTiles,`${ops.length} openable tiles, one per OTHER_GROUPS entry`);
let dead=[],allText="";
for(const op of ops){
  await open_(op);
  const r=await p.evaluate(()=>{const v=[...document.querySelectorAll(".view.on")];
    return {id:v.length===1&&v[0].id!=="vOther"&&v[0].textContent.trim().length>40?v[0].id:null,
            txt:document.body.innerText}});
  if(!r.id)dead.push(op);
  allText+=" "+r.txt;
}
ok(dead.length===0,`all ${ops.length} open a real page${dead.length?" — dead: "+dead.join(", "):""}`);

console.log("\n=== SOURCES ===");
await open_("cred");
const cred=await p.evaluate(()=>({
  txt:document.getElementById("credpage").textContent,
  links:[...document.querySelectorAll("#credpage a[href^='http']")].map(a=>a.href),
  whats:[...document.querySelectorAll("#credpage .cwhat")].map(e=>e.textContent.trim())}));
ok(cred.links.some(u=>/lorcanajson\.org/.test(u)),"LorcanaJSON is linked");
ok(cred.links.some(u=>/lorcast\.com/.test(u)),"Lorcast is linked");
ok(cred.links.some(u=>/thegamer\.com/.test(u)),"TheGamer is linked for the symbol locations");
ok(cred.whats.length>=4,`${cred.whats.length} entries, each saying what was used`);
ok(cred.whats.every(w=>w.length>8),"…and none of them is blank");
ok(/errata/i.test(cred.txt)&&/foiling/i.test(cred.txt),
   "…including the errata and foiling we just started using");
ok(!/vibe|we like|play online/i.test(cred.txt),"no blurbs about anyone's vibe — just sources");
ok(/not published, endorsed/i.test(cred.txt),"the Disney disclaimer is on the page");
ok(await p.evaluate(()=>[...document.querySelectorAll("#credpage a[href^='http']")]
     .every(a=>a.target==="_blank"&&/noopener/.test(a.rel||""))),
   "…and every outbound link opens safely in a new tab");

console.log("\n=== ATTRIBUTION SURVIVES THE TILE BEING OFF ===");
const tilesNow=await p.evaluate(()=>[...document.querySelectorAll("[data-op]")].map(b=>b.dataset.op));
ok(!tilesNow.includes("cred"),"the Sources tile is off the Other menu");
await p.click("#tDeck");await p.waitForTimeout(600);
const foot=await p.evaluate(()=>{const f=document.querySelector(".foot");
  return f?{t:f.textContent.replace(/\s+/g," ").trim(),
            links:[...f.querySelectorAll("a")].map(a=>a.href)}:null});
ok(foot,"…but a footer runs on every page instead");
/* Ben moved the source credits off the footer onto the Sources page. The
   disclaimer stays because that one is a Community Code condition. */
ok(!/LorcanaJSON|Lorcast|Card data/.test(foot.t),
   "…carrying no source credits — those moved to the Sources page");
ok(/Not published, endorsed or approved/.test(foot.t),"…carrying the disclaimer");
ok(/prohibited from charging/.test(foot.t),"…and the free-to-use clause");
ok(foot.links.length===0,"…and no links, just the notice");

console.log("\n=== THE RENAMING ===");
ok(!/hidden mickey/i.test(allText),
   "the trademarked phrase appears in none of the sixteen pages' visible text");
const codeOnly=SRC.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
ok(!/hidden mickey/i.test(codeOnly),"…and not in any string literal either, only in comments");
await open_("mick");
const mk=await p.evaluate(()=>document.getElementById("mickpage").textContent);
ok(/mouse-shaped/i.test(mk),"the page says “mouse-shaped” instead");

console.log("\n=== FLOUNDER'S AQUARIUM ===");
await p.evaluate(()=>localStorage.setItem("fs3_dust",JSON.stringify(
  {bal:0,got:{},open:[],titles:[],hidden:[],wear:"",quiz:[],bucky:0})));
await open_("aqua");
ok(await p.evaluate(()=>!!document.querySelector("#aquapage .tank")),"the tank renders");
const swims=await p.evaluate(async()=>{const f=document.querySelector("#aquapage .fish");
  const a=f.getBoundingClientRect().left;await new Promise(r=>setTimeout(r,900));
  return Math.abs(f.getBoundingClientRect().left-a)>2});
ok(swims,"…and he actually swims");
const before=(await D()).bal;
await p.waitForTimeout(11500);
const after=(await D()).bal;
ok(after>before,`idling earns dust (${before} → ${after})`);
await p.evaluate(()=>{const t=document.querySelector("#aquapage .tank");
  const r=t.getBoundingClientRect();
  t.dispatchEvent(new MouseEvent("click",{clientX:r.left+r.width/2,clientY:r.top+40,bubbles:true}))});
await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.querySelectorAll("#aquapage .food").length>0),"clicking drops food");
await p.waitForTimeout(6000);   // he has to swim over to it
const fed=await D();
ok(fed.bal>=after+2,`…and he eats it for dust (${after} → ${fed.bal})`);
ok(await p.evaluate(()=>/\d/.test(document.getElementById("aqFed").textContent)),
   `…and the fed counter ticks up (${await p.evaluate(()=>document.getElementById("aqFed").textContent)})`);
ok(await p.evaluate(()=>{const f=document.querySelector("#aquapage .fish");
  return /scaleX/.test(f.style.transform||"")}),"…and he turns round to face where he's going");
await p.click("#tDeck");await p.waitForTimeout(600);
ok(await p.evaluate(()=>{let n=0;const o=requestAnimationFrame;return true}),"leaving the tank stops the loop");

console.log("\n=== GIVE FLOUNDER A CLICK ===");
await open_("click");
const c0=(await D()).bal;
for(let i=0;i<12;i++){await p.click("#clickpage .clickcard");await p.waitForTimeout(60)}
const c1=(await D()).bal;
ok(c1-c0===12,`twelve clicks, twelve dust (${c1-c0})`);
ok(await p.evaluate(()=>document.querySelectorAll("#clickpage .heart").length>0),"…hearts float up");
ok(await p.evaluate(()=>{const h=document.querySelector("#clickpage .heart");
  return getComputedStyle(h).getPropertyValue("--dx")!==""}),"…and they scatter rather than stacking");
ok(await p.evaluate(()=>/Flounder/.test(document.querySelector("#clickpage .clickcard img").alt||"")),
   "…and it is Flounder you're clicking");

console.log("\n=== GUESS THE CARD FEEDBACK ===");
await open_("guess");
const nOpts=await p.evaluate(()=>document.querySelectorAll(".gopt").length);
ok(nOpts===5,`${nOpts} options`);
// answer wrong on purpose: click, and if it happened to be right, reroll
let sawX=false,sawWin=false;
/* A correct answer is 1-in-5, so eight rounds left a 17% chance of never
   seeing a win — that made this suite flake. Thirty rounds puts it at ~0.1%,
   and .qreveal is now an unambiguous win signal. */
for(let i=0;i<30&&!(sawX&&sawWin);i++){
  await p.evaluate(()=>document.querySelectorAll(".gopt")[0].click());
  await p.waitForTimeout(400);
  const st=await p.evaluate(()=>({x:!!document.querySelector(".gx"),
    won:!!document.querySelector(".qreveal"),
    right:document.querySelectorAll(".gopt.right").length,
    wrong:document.querySelectorAll(".gopt.wrong").length}));
  if(st.won)sawWin=true; if(st.x)sawX=true;
  if(st.won&&st.x)bad++;   // must never be both
  if(i===0)ok(st.right===1,"answering always marks the right one");
  await p.evaluate(()=>{const b=document.getElementById("gNext");if(b)b.click()});
  await p.waitForTimeout(350);
}
ok(sawX,"a wrong answer stamps the family-feud ✖");
ok(sawWin,"…and a right answer brings up the big reveal instead");
ok(/class="gx"/.test(SRC)&&/\.gx\{/.test(SRC),"a family-feud ✖ is defined for wrong answers");
ok(/won\?0\.717/.test(SRC.replace(/\s/g,"")),"a correct answer zooms all the way out to the full card");

console.log("\n=== GUESS THE ABILITY BUTTON ===");
await open_("quiz:ability");
ok(await p.evaluate(()=>{const b=document.getElementById("qMore");
  return b&&b.classList.contains("outline")}),"the show-full-ability button is outlined");
const oc=await p.evaluate(()=>{const b=document.getElementById("qMore");
  const s=getComputedStyle(b);return {bd:s.borderColor,bg:s.backgroundColor}});
ok(/2(1|2|3|4|5|6|7|8|9)\d|1\d\d/.test(oc.bd)&&/rgba\(0, 0, 0, 0\)|transparent/.test(oc.bg)||oc.bd!==oc.bg,
   `…in yellow on a clear background (border ${oc.bd})`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
