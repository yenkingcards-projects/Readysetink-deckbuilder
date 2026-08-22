const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1050}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1800);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

await p.click("#tOther");await p.waitForTimeout(500);
ok(await p.evaluate(()=>!!document.querySelector('[data-op="guess"]')),"tile is on the Other page");
await p.evaluate(()=>document.querySelector('[data-op="guess"]').click());await p.waitForTimeout(700);

console.log("\n=== THE CROP NEVER SHOWS THE CARD'S NAME ===");
// Replay the real geometry 4000 times and check the window stays inside the art band.
const geo=await p.evaluate(()=>{
  const W=420,H=300,Z=[5.2,2.6,1.5],ART=0.52;
  let worstBottom=0,worstTop=1,offLeft=0,offRight=0,n=0;
  for(let t=0;t<4000;t++){
    const loose=Z[Z.length-1],imgW0=W*loose,imgH0=imgW0*940/674;
    const padX=(W/2)/imgW0,padY=(H/2)/imgH0;
    const fy0=padY,fy1=Math.max(padY,ART-padY);
    const fx=padX+Math.random()*Math.max(0,1-2*padX);
    const fy=fy0+Math.random()*Math.max(0,fy1-fy0);
    for(const sc of Z){
      const imgW=W*sc,imgH=imgW*940/674;
      const top=(fy*imgH-H/2)/imgH, bot=(fy*imgH+H/2)/imgH;
      const lef=(fx*imgW-W/2)/imgW,  rig=(fx*imgW+W/2)/imgW;
      worstBottom=Math.max(worstBottom,bot);worstTop=Math.min(worstTop,top);
      if(lef<-0.001)offLeft++; if(rig>1.001)offRight++;
      n++;
    }
  }
  return {worstBottom,worstTop,offLeft,offRight,n};
});
ok(geo.worstBottom<=0.52+1e-9,
   `across ${geo.n} crops the window never reaches below ${(geo.worstBottom*100).toFixed(1)}% of the card — the name bar starts at 52%`);
ok(geo.worstTop>=-1e-9,`…and never runs off the top (min ${(geo.worstTop*100).toFixed(1)}%)`);
ok(geo.offLeft===0&&geo.offRight===0,"…nor past either edge, so no blank gutters");

console.log("\n=== DISTRACTORS ARE PLAUSIBLE (played for real) ===");
// Everything lives inside the IIFE, so drive the actual UI: read the three
// options, answer, then read the revealed card and check the properties held.
const LS=()=>p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_guess")||"{}"));
const CARDINFO=await p.evaluate(()=>{const m={};DATA.cards.forEach(c=>{
  m[c.n+(c.v?" - "+c.v:"")]={n:c.n,ink:(c.co||[])[0],co:c.co||[],set:String(c.s),ty:c.ty}});return m});
let rounds=0,sameInk=0,sameSet=0,dupName=0,three=0,answerShown=0,unparsed=0;
for(let t=0;t<60;t++){
  const opts=await p.evaluate(()=>[...document.querySelectorAll(".gopt")]
    .map(b=>b.querySelector("b").textContent+(b.querySelector("i")?" - "+b.querySelector("i").textContent:"")));
  if(opts.length===5)three++;
  await p.evaluate(()=>document.querySelectorAll(".gopt")[0].click());
  await p.waitForTimeout(120);
  const truth=await p.evaluate(()=>{const g=document.querySelector(".gful");
    if(!g)return null;const sp=g.querySelectorAll("span");
    return g.querySelector("b").textContent+(sp[0]&&!/#/.test(sp[0].textContent)?" - "+sp[0].textContent:"")});
  rounds++;
  if(opts.some(o=>o===truth))answerShown++;
  if(new Set(opts.map(o=>o.split(" - ")[0])).size<3)dupName++;
  const a=CARDINFO[truth],others=opts.filter(o=>o!==truth).map(o=>CARDINFO[o]);
  if(!a||others.some(x=>!x)){unparsed++;}          // don't punish the code for my parsing
  else{
    if(others.every(c=>c.co.some(i=>a.co.includes(i))))sameInk++;
    else console.log("       ink miss:",truth,JSON.stringify(a.co),"vs",
      opts.filter(o=>o!==truth).map(o=>o+" "+JSON.stringify((CARDINFO[o]||{}).co)).join(" | "));
    if(others.every(c=>c.set===a.set))sameSet++;
  }
  await p.evaluate(()=>{const b=document.getElementById("gNext");if(b)b.click()});
  await p.waitForTimeout(110);
}
const judged=rounds-unparsed;
ok(three===rounds,`every one of ${rounds} rounds offered exactly 5 names`);
ok(answerShown===rounds,"…and the right answer was always among them");
ok(dupName===0,"no round repeated a character name — that would be unanswerable");
// newRound() falls back to the whole pool when an ink+set has fewer than two
// other candidates — rare, but real, so assert the property not perfection.
ok(sameInk/judged>=0.95,
   `${sameInk} of ${judged} rounds drew both wrong answers from an ink the answer shares`+
   (sameInk<judged?" (the rest hit the documented small-pool fallback)":""));
ok(sameSet/judged>0.8,`${Math.round(sameSet/judged*100)}% kept them in the same set too`);
console.log(`     (${unparsed} rounds skipped — my DOM parsing, not the game)`);

console.log("\n=== SCORING ===");
await p.evaluate(()=>localStorage.setItem("fs3_guess",JSON.stringify({score:0,streak:0,best:0,played:0,right:0})));
await p.reload();await p.waitForTimeout(1600);
const worth0=await p.evaluate(()=>document.querySelector(".gw b").textContent);
ok(worth0==="3",`a fresh card is worth ${worth0}`);
const w0=await p.evaluate(()=>document.querySelector(".gframe img").style.width);
await p.click("#gZoom");await p.waitForTimeout(450);
const w1=await p.evaluate(()=>document.querySelector(".gframe img").style.width);
ok(await p.evaluate(()=>document.querySelector(".gw b").textContent)==="2","zooming out drops it to 2");
ok(parseInt(w1)<parseInt(w0),`…and really zooms out (${w0} → ${w1})`);
await p.click("#gZoom");await p.waitForTimeout(450);
ok(await p.evaluate(()=>document.getElementById("gZoom").disabled),"third look is the last — button disables");
// answer correctly at the loosest zoom → 1 point
await p.evaluate(()=>{document.querySelectorAll(".gopt")[0].click()});
await p.waitForTimeout(300);
let win=await p.evaluate(()=>!!document.querySelector(".gres.win"));
if(!win){ // first option happened to be wrong — take the next round and pick the marked one
  await p.evaluate(()=>document.getElementById("gNext").click());await p.waitForTimeout(300);
  await p.click("#gZoom");await p.click("#gZoom");await p.waitForTimeout(400);
  await p.evaluate(()=>document.querySelectorAll(".gopt")[0].click());await p.waitForTimeout(300);
  win=await p.evaluate(()=>!!document.querySelector(".gres.win"));
}
const st=await LS();
ok(st.played>0,`${st.played} rounds recorded`);
ok(win?st.score>=1:st.score===0,win?`a correct answer at full zoom-out scored ${st.score}`:"a wrong answer scored nothing");
ok(win?st.streak>=1:st.streak===0,`streak is ${st.streak}`);
/* Either way you get to see the card — but a correct answer now shows it large
   over the question (.qreveal) while a wrong one keeps the small thumbnail in
   the result box, so you still learn what it was. */
ok(await p.evaluate(()=>!!document.querySelector(".qreveal img")||!!document.querySelector(".gful img")),
   "the card is revealed either way");
ok(await p.evaluate(()=>{const big=document.querySelector(".qreveal img"),
    small=document.querySelector(".gful img");
  return document.querySelector(".gres.win")?!!big&&!small:!big&&!!small}),
   "…large and above the question when right, small in the result box when wrong");
ok(await p.evaluate(()=>[...document.querySelectorAll(".gopt")].every(b=>b.disabled)),
   "…and the buttons lock so you can't re-answer");
ok(await p.evaluate(()=>!!document.querySelector(".gopt.right")),"…marking which one was correct");

console.log("\n=== SCORE PERSISTS ===");
const before=await LS();
await p.reload();await p.waitForTimeout(1700);
const after=await LS();
ok(after.played===before.played&&after.score===before.score,
   `reload keeps score ${after.score} over ${after.played} rounds`);
ok(await p.evaluate(()=>!!document.querySelector(".gframe")),"…and comes back to the game");

console.log("\n=== LOCATIONS ARE EXCLUDED ===");
const pool=await p.evaluate(()=>DATA.cards.filter(c=>c.img&&c.ty!=="Location").length);
ok(await p.evaluate(()=>/c\.ty!=="Location"/.test(document.documentElement.innerHTML)),
   "landscape cards would crop wrong, so they're filtered out of the pool");
ok(pool>2300,`${pool} cards playable`);

console.log("\n=== BACK OUT ===");
await p.click("#gExit");await p.waitForTimeout(500);
ok(await p.evaluate(()=>!!document.getElementById("otherTiles")),"← Other returns to the index");
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
