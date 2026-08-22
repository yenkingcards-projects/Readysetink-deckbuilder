const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1900);
const openPage=async op=>{await p.evaluate(o=>{localStorage.setItem("fs3_opage",JSON.stringify(o));
  localStorage.setItem("fs3_tab",JSON.stringify("tOther"))},op);await p.reload();await p.waitForTimeout(1600)};
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== ERROR CARDS PAGE ===");
await openPage("err");
const e=await p.evaluate(()=>({
  h:document.querySelector("#errpage h1").textContent,
  eng:[...document.querySelectorAll("#errpage .errs")][0].querySelectorAll(".err").length,
  intl:[...document.querySelectorAll("#errpage .errs")][1].querySelectorAll(".err").length,
  mis:[...document.querySelectorAll("#errpage .errs")][2].querySelectorAll(".err").length,
  open:document.querySelectorAll("#errpage .err.open").length,
  names:[...document.querySelectorAll("#errpage .ec")].map(x=>x.textContent.trim()),
  sell:(document.querySelector(".sellbtn")||{}).href||"",
  sellTxt:(document.querySelector(".sellbtn")||{}).textContent||"",
  txt:document.querySelector("#errpage").textContent}));
ok(/Error cards/.test(e.h),`"${e.h.trim()}"`);
ok(e.eng===9,`${e.eng} English errata entries (7 set cards + 2 promos)`);
ok(e.intl===8,`${e.intl} French/German entries`);
ok(e.mis===6,`${e.mis} misprint types`);
ok(e.open===3,`${e.open} flagged as never corrected`);

console.log("\n--- the facts are right ---");
const must=[["Chief Tui","another"],["Befuddle","chosen"],["Work Together","Pacha"],
            ["Simba - Returned King","While challenging"],["Stitch - Carefree Surfer","1 lore"],
            ["Ariel - Spectacular Singer","Alice Pisoni"]];
for(const [card,detail] of must){
  const row=await p.evaluate(c=>{const r=[...document.querySelectorAll("#errpage .err")]
    .find(x=>x.querySelector(".ec").textContent.includes(c));return r?r.textContent:""},card);
  ok(row.includes(detail),`${card} → “${detail}”`);
}
ok(/only Lorcana card known to have a wrongly printed stat/i.test(e.txt),
   "Stitch is called out as the only wrong-stat card");
ok(/errata/i.test(e.txt)&&/misprint/i.test(e.txt),"errata vs misprint explained up front");

console.log("\n--- cross-check against our own card data ---");
const known=await p.evaluate(()=>["Chief Tui - Respected Leader","HeiHei - Boat Snack",
  "Merlin - Self-Appointed Mentor","Philoctetes - Trainer of Heroes","Befuddle","Work Together",
  "Stitch - Carefree Surfer","Ariel - Spectacular Singer","Coconut Basket","Frying Pan",
  "Mother Knows Best","Prince Phillip - Dragonslayer","Cruella De Vil - Miserable as Usual"]
  .filter(n=>!DATA.cards.some(c=>(c.n+(c.v?" - "+c.v:""))===n)));
ok(known.length===0,`every card named on the page exists in the database${known.length?" — missing "+known.join(", "):""}`);

console.log("\n--- sell button ---");
ok(/instagram\.com\/lorcanarob/.test(e.sell),`points at Instagram (${e.sell})`);
ok(/Sell your error cards to Lorcanarob/.test(e.sellTxt),`"${e.sellTxt.trim()}"`);
ok(await p.evaluate(()=>{const a=document.querySelector(".sellbtn");
  const r=a.getBoundingClientRect();return r.height>=44&&r.width>=260}),"…and it's a big, obvious button");

console.log("\n--- replacement policy summary ---");
for(const fact of ["Rare or higher","authorised retailer","7 days","6 months","batch ID","handwritten note"]){
  ok(e.txt.includes(fact),`policy summary states “${fact}”`);
}
ok(/this is a summary, not the policy/i.test(e.txt),"…and says plainly it's a summary");
const links=await p.evaluate(()=>[...document.querySelectorAll("#errpage a")].map(a=>a.href));
ok(links.some(l=>/lorcanaplayer\.com/.test(l))&&links.some(l=>/misprintedlore/.test(l)),
   "sources are linked, not just claimed");
ok(/not official/i.test(e.txt),"…and the page admits it's community-compiled");

console.log("\n=== GETTING STARTED PAGE ===");
await openPage("start");
const g=await p.evaluate(()=>({h:document.querySelector("#startpage h1").textContent,
  steps:[...document.querySelectorAll("#startpage .ctile h3")].map(x=>x.textContent),
  txt:document.querySelector("#startpage").textContent}));
ok(/Getting started/.test(g.h),`"${g.h.trim()}"`);
ok(g.steps.length===5,`${g.steps.length} steps: ${g.steps.map(s=>s.replace(/^\d+ · /,"")).join(" · ")}`);
ok(/blue dog/.test(g.txt)&&/sea witch/.test(g.txt),"leads with the thing no other site does");
ok(/saves to/.test(g.txt)&&/this browser/i.test(g.txt),"warns that everything is browser-local");
const nums=await p.evaluate(()=>({shown:(document.querySelector("#startpage .lede").textContent.match(/[\d,]+/)||[])[0],
  real:DATA.cards.length.toLocaleString()}));
ok(nums.shown===nums.real,`card count is live (${nums.shown})`);

console.log("\n=== BOTH REACHABLE FROM OTHER ===");
await openPage("");
const tiles=await p.evaluate(()=>[...document.querySelectorAll(".tile")].map(t=>({
  n:t.querySelector("h3").textContent,op:t.dataset.op||""})));
// Both pages are switched off in OFF for now: no tile, but the page still works.
ok(!tiles.some(t=>t.op==="err"),"Error cards has no tile while it's switched off");
ok(!tiles.some(t=>t.op==="start"),"…nor does Getting started");
for(const [op,sel] of [["err","#errpage"],["start","#startpage"]]){
  await openPage(op);
  ok(await p.evaluate(s=>{const e=document.querySelector(s);
    return e&&e.textContent.trim().length>200},sel),
     `…but ${op} still renders in full when you go straight to it`);
}
ok(!tiles.some(t=>t.n==="List of known error cards"),"…and the old placeholder tile is gone");
const planned=tiles.filter(t=>!t.op).length;
ok(planned===0,`${planned} tiles still marked Planned`);
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
