const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
const NOT=("file://"+_W.notes());
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1600);
const N=()=>p.evaluate(()=>parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10));
const anim=()=>p.evaluate(()=>getComputedStyle(document.getElementById("tgTag")).animationName);

console.log("\n=== ART ON BY DEFAULT + PLACEHOLDER ===");
ok(errs.length===0,`no JS errors${errs.length?" — "+errs[0]:""}`);
ok(await p.evaluate(()=>document.getElementById("tgTag").classList.contains("on")),"art switch starts ON");
ok(!await p.evaluate(()=>document.getElementById("tgSto").classList.contains("on")),"franchise still starts off");
const ph=await p.evaluate(()=>document.getElementById("q").placeholder);
ok(/special searches/i.test(ph),`placeholder points at the special searches: "${ph}"`);
await p.fill("#q","blue dog");await p.waitForTimeout(500);
ok(await N()===17,`"blue dog" works straight away (${await N()} cards)`);

console.log("\n=== JIGGLE ON ARRIVING AT SEARCH ===");
await p.goto(F);await p.waitForTimeout(300);
let sawJig=false;
for(let i=0;i<28;i++){if(await p.evaluate(()=>document.getElementById("tgTag").classList.contains("jig"))){sawJig=true;break}
  await p.waitForTimeout(60)}
ok(sawJig,"switch jiggles shortly after the page loads");
await p.waitForTimeout(900);
ok(!await p.evaluate(()=>document.getElementById("tgTag").classList.contains("jig")),"…and the class is cleaned up after");
// tab away and back
await p.click("#mGuided");await p.waitForTimeout(400);
await p.click("#mManual");await p.waitForTimeout(120);
ok(await p.evaluate(()=>document.getElementById("tgTag").classList.contains("jig")),
   "…and again when you come back from Guided Coconut Build");
await p.waitForTimeout(800);
// no jiggle when the switch is off
await p.click("#tgTag");await p.waitForTimeout(300);
await p.click("#mGuided");await p.waitForTimeout(300);await p.click("#mManual");await p.waitForTimeout(150);
ok(!await p.evaluate(()=>document.getElementById("tgTag").classList.contains("jig")),
   "no jiggle when the switch is off — nothing to advertise");
await p.click("#tgTag");await p.waitForTimeout(300);

console.log("\n=== SLOW PULSE ON EVERY 3rd NEW SEARCH ===");
await p.goto(F);await p.waitForTimeout(1600);
const pulsedAfter=[];
for(const term of ["dragon","princess","tentacles"]){
  await p.fill("#q",term);await p.waitForTimeout(420);
  pulsedAfter.push(await p.evaluate(()=>document.getElementById("tgTag").classList.contains("pulse")));
}
ok(!pulsedAfter[0]&&!pulsedAfter[1],"nothing on the 1st or 2nd search");
ok(pulsedAfter[2],"…pulse lands on the 3rd");
ok(/swpulse/.test(await anim()),`…running the slow brightness keyframes (${await anim()})`);
const dur=await p.evaluate(()=>getComputedStyle(document.getElementById("tgTag")).animationDuration);
ok(parseFloat(dur)>=3,`…over ${dur}, slow enough to read as a breath`);
// cooldown holds
await p.waitForTimeout(3600);   // let the first pulse finish and clear
for(const term of ["hook","genie","merlin"]){await p.fill("#q",term);await p.waitForTimeout(420)}
ok(!await p.evaluate(()=>document.getElementById("tgTag").classList.contains("pulse")),
   "…and the 30s cooldown stops it firing again straight away");

console.log("\n=== BEN'S NOTES ARE LIVE ===");
const live=await p.evaluate(()=>{
  const m={};DATA.cards.forEach(c=>{if((c.rsi||[]).length)m[c.n+(c.v?" - "+c.v:"")]=c.rsi.length});return m});
console.log("     "+JSON.stringify(live));
ok(Object.keys(live).length===4,"4 cards carry notes");
ok(live["Ariel - Ethereal Voice"]&&live["Put That Thing Back"],"…the interaction is on both halves");
ok(!Object.keys(live).some(k=>/Bucky/.test(k)),"…and my invented Bucky placeholder is gone");
await p.fill("#q","Touch the Sky");await p.waitForTimeout(600);
await p.evaluate(()=>document.querySelector("#grid .c [data-i]").click());await p.waitForTimeout(600);
const shown=await p.evaluate(()=>{const r=document.querySelector(".ruling.rsin");
  return r?r.querySelector(".a").textContent:null});
ok(/moved a character to a location/.test(shown||""),`renders on the card ("${(shown||"").slice(0,58)}…")`);

console.log("\n=== NOTES TOOL: ONE NOTE, MANY CARDS ===");
const p2=await b.newPage({viewport:{width:1400,height:950}});
const e2=[];p2.on("pageerror",e=>e2.push(e.message));
await p2.goto(NOT);await p2.waitForTimeout(1500);
ok(e2.length===0,`tool loads clean${e2.length?" — "+e2[0]:""}`);
await p2.fill("#fQ","Elsa - Snow Queen");await p2.waitForTimeout(500);
ok(await p2.evaluate(()=>document.querySelector(".chip.self").textContent)==="Elsa - Snow Queen",
   "current card is always a target");
await p2.fill("#alsoIn","Anna - Heir");await p2.waitForTimeout(400);
const sug=await p2.evaluate(()=>[...document.querySelectorAll("#alsoSugg [data-add]")].map(b=>b.textContent));
ok(sug.length>0,`suggestions appear (${sug.slice(0,2).join(", ")}…)`);
await p2.evaluate(()=>document.querySelector("#alsoSugg [data-add]").click());await p2.waitForTimeout(300);
await p2.fill("#alsoIn","Olaf");await p2.waitForTimeout(400);
await p2.evaluate(()=>document.querySelector("#alsoSugg [data-add]").click());await p2.waitForTimeout(300);
ok(await p2.evaluate(()=>document.querySelectorAll("#alsoChips .chip").length)===3,
   "…plus two more picked = 3 targets");
await p2.fill("#nText","Shared interaction test note.");
await p2.click("#bAdd");await p2.waitForTimeout(500);
const wrote=await p2.evaluate(()=>{const s=JSON.parse(localStorage.getItem("fs_rsinotes_v1")).cards;
  return Object.entries(s).filter(([k,v])=>v.some(n=>/Shared interaction test/.test(n.t))).map(([k])=>k)});
ok(wrote.length===3,`one click wrote it to all 3 cards (${wrote.join(", ")})`);
ok(await p2.evaluate(()=>document.querySelectorAll("#alsoChips .chip").length)===1,
   "…and the extra targets reset afterwards");
const shared=await p2.evaluate(()=>{const s=document.querySelector(".note .shared");return s?s.textContent:null});
ok(/also on/.test(shared||""),`…and the note shows where else it lives ("${(shared||"").trim()}")`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
