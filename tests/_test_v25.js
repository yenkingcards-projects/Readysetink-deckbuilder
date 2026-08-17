const {chromium}=require("/tmp/node_modules/playwright-core");
const F="file:///sessions/kind-modest-ride/mnt/outputs/flounder-search.html";
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1900);
const go=async op=>{await p.evaluate(o=>{localStorage.setItem("fs3_opage",JSON.stringify(o));
  localStorage.setItem("fs3_tab",JSON.stringify("tOther"))},op);await p.reload();await p.waitForTimeout(1600)};
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== THEGAMER CREDIT REMOVED ===");
await go("mick");
const m=await p.evaluate(()=>({
  links:[...document.querySelectorAll("#mickpage a")].map(a=>a.href),
  txt:document.querySelector("#mickpage").textContent,
  entries:document.querySelectorAll("#mickpage .mick").length}));
ok(!m.links.some(l=>/thegamer/i.test(l)),"no TheGamer links");
ok(!/TheGamer/i.test(m.txt),"…and no mention of them in the text");
ok(m.entries===20,`all ${m.entries} entries still there`);
ok(/community reports/i.test(m.txt),"…replaced with a neutral note about community reports");
ok(/Ryan Miller/.test(m.txt),"the card-back attribution stays — that's a fact about who confirmed it");

console.log("\n=== COLLECTOR BOOSTER LEAK — CORRECTLY HELD ===");
await go("leak");
const k=await p.evaluate(()=>({
  shown:[...document.querySelectorAll("#leakpage .leak .lkh b")].map(x=>x.textContent),
  held:(document.querySelector("#leakpage .hint")||{}).textContent||"",
  txt:document.querySelector("#leakpage").textContent}));
ok(!k.shown.some(t=>/Collector Booster/i.test(t)),
   "the Collector Booster leak is NOT visible — it's only 52 days old");
ok(/1 entry is|entries are/.test(k.held),`…and the page says so: "${k.held.trim()}"`);
ok(!/Inkdark/i.test(k.txt),"…nothing about it leaks through, not even the set name");
ok(k.shown.length===3,`${k.shown.length} older entries have cleared the hold`);
console.log("     visible: "+k.shown.join(" · "));

console.log("--- but it IS written up and will publish on time ---");
const held=await p.evaluate(()=>{
  const src=document.documentElement.innerHTML;
  const has=/Collector Boosters revealed by Ravensburger's own website/.test(src);
  const date=(src.match(/live:"2026-11-20"/)||[])[0];
  return {has,date};
});
ok(held.has,"the entry exists in the data");
ok(!!held.date,`…dated to publish ${held.date.replace('live:"','').replace('"','')} — 150 days after 23 June`);
const math=await p.evaluate(()=>{
  const leak=new Date("2026-06-23"),live=new Date("2026-11-20");
  return Math.round((live-leak)/86400000)});
ok(math>=150,`…which is ${math} days, honouring the hold`);

console.log("\n=== WORLDBUILDING ===");
await go("world");
const w=await p.evaluate(()=>({
  h:document.querySelector("#worldpage h1").textContent,
  quote:(document.querySelector(".wquote p")||{}).textContent||"",
  cite:(document.querySelector(".wquote cite")||{}).textContent||"",
  tiles:[...document.querySelectorAll("#worldpage .ctile h3")].map(x=>x.textContent),
  inks:document.querySelectorAll("#worldpage .wink").length,
  sets:document.querySelectorAll("#worldpage .wset").length,
  links:[...document.querySelectorAll("#worldpage a")].map(a=>a.href),
  txt:document.querySelector("#worldpage").textContent}));
ok(/Worldbuilding/.test(w.h),`"${w.h.trim()}"`);
ok(!/according to Ben/i.test(w.txt),"no longer framed as Ben's opinion");
ok(/Great Illuminary/.test(w.quote),"opens with the official opening passage");
ok(/disneylorcana\.com/.test(w.cite),`…attributed (${w.cite.trim()})`);
ok(w.tiles.length===5,`5 sections: ${w.tiles.join(" · ")}`);

console.log("--- the lore is the official lore ---");
for(const t of ["inkcaster","story star","glimmer","Illumineer","lorebook","missing lore"]){
  ok(new RegExp(t,"i").test(w.txt),`uses the official term “${t}”`);
}
ok(/only exists in this realm/.test(w.txt),"quotes the official definition of a glimmer exactly");
ok(/no ink is innately good or evil/i.test(w.txt),"…and Ravensburger's point that no ink is good or evil");
ok(/preserved and protected at all costs/.test(w.txt),"…and what lore is for");
ok(w.inks===6,`all ${w.inks} inks described`);
const inkN=await p.evaluate(()=>{const el=document.querySelector("#worldpage .wih span");
  const shown=parseInt(el.textContent,10);
  const real=DATA.cards.filter(c=>(c.co||[]).includes("Amber")).length;return {shown,real}});
ok(inkN.shown===inkN.real,`ink card counts are live (Amber: ${inkN.shown})`);

console.log("--- the set spine comes from real data ---");
const setCheck=await p.evaluate(()=>{
  const shown=[...document.querySelectorAll("#worldpage .wset b")].map(x=>x.textContent);
  const real=Object.entries(DATA.sets).filter(([c])=>DATA.cards.some(x=>x.s===c))
    .sort((a,b)=>String(a[1].d).localeCompare(String(b[1].d))).map(([,m])=>m.name);
  return {shown,real,match:JSON.stringify(shown)===JSON.stringify(real)}});
ok(setCheck.match,`${setCheck.shown.length} sets, in release order, from the card data`);
ok(setCheck.shown[0]==="The First Chapter",`starts at ${setCheck.shown[0]}`);
ok(!setCheck.shown.some(n=>/Hyperia|Inkdark/.test(n)),"…and unreleased sets aren't listed");
ok(w.links.every(l=>/disneylorcana\.com/.test(l)),`all ${w.links.length} sources are official`);
ok(/© Disney/.test(w.txt),"…with the copyright line");

console.log("\n=== OTHER PAGE ===");
await go("");
const tiles=await p.evaluate(()=>[...document.querySelectorAll(".tile")].map(t=>({
  n:t.querySelector("h3").textContent,op:t.dataset.op||""})));
/* "world" is in OFF — the page still works and stays reachable by URL, which
   the checks above just proved; only its tile leaves the menu. */
ok(!tiles.some(t=>t.op==="world"),"Worldbuilding is switched off, so no tile");
ok(!tiles.some(t=>/according to Ben/.test(t.n)),"…and the old tile is gone");
ok(tiles.every(t=>t.op),`every one of the ${tiles.length} tiles is now a real page`);
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
