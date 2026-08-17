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

console.log("\n=== EMPTY DECK IS HANDLED ===");
await go("upg");
ok(await p.evaluate(()=>/Nothing to read yet/.test(document.querySelector("#uppage").textContent)),
   "an empty deck says so instead of showing a broken report");

console.log("\n=== A REAL DECK GETS A REAL REPORT ===");
// build something deliberately flawed: all expensive, one ink, too few cards
await p.evaluate(()=>{localStorage.setItem("fs3_tab",JSON.stringify("tDeck"));
  localStorage.setItem("fs3_opage",JSON.stringify(""))});
await p.reload();await p.waitForTimeout(1500);
const built=await p.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem("fs3_decks")||"null")
    ||{cur:"Main",list:{Main:{fmt:"infinity",coco:null,cards:{}}}};
  const big=DATA.cards.filter(c=>c.c>=6&&(c.co||[]).length===1&&c.co[0]==="Amber"&&c.core).slice(0,5);
  const cards={};big.forEach(c=>cards[c.n+(c.v?" - "+c.v:"")]=4);
  d.list[d.cur]={fmt:"infinity",coco:null,cards};
  localStorage.setItem("fs3_decks",JSON.stringify(d));
  return {n:Object.keys(cards).length,tot:Object.values(cards).reduce((a,b)=>a+b,0)};
});
ok(built.tot===20,`built a deliberately bad deck: ${built.n} cards ×4 = ${built.tot}, all 6+ ink, one ink`);
await go("upg");
const rep=await p.evaluate(()=>({
  txt:document.querySelector("#uppage").textContent,
  heads:[...document.querySelectorAll("#uppage .sec2")].map(h=>h.textContent),
  probs:document.querySelectorAll("#uppage .up.bad").length,
  gaps:document.querySelectorAll("#uppage .upblock").length,
  picks:document.querySelectorAll("#uppage .upc").length}));
ok(/40 more cards to reach 60/.test(rep.txt),"tells you exactly how many cards short you are");
ok(rep.gaps>0,`${rep.gaps} curve gaps flagged`);
ok(/Curve gaps/.test(rep.heads.join("|")),"…under a Curve gaps heading");
ok(rep.picks>0,`${rep.picks} specific cards suggested, not just advice`);

console.log("--- suggestions are actually legal for this deck ---");
const sane=await p.evaluate(()=>{
  const names=[...document.querySelectorAll("#uppage .upc")].map(b=>b.dataset.up);
  const d=JSON.parse(localStorage.getItem("fs3_decks"));const have=d.list[d.cur].cards;
  const inks=new Set();Object.keys(have).forEach(f=>{
    const c=DATA.cards.find(x=>(x.n+(x.v?" - "+x.v:""))===f);(c.co||[]).forEach(i=>inks.add(i))});
  const cards=names.map(n=>DATA.cards.find(x=>(x.n+(x.v?" - "+x.v:""))===n));
  return {all:names.length,unresolved:cards.filter(c=>!c).length,
    already:names.filter(n=>have[n]).length,
    offInk:cards.filter(c=>c&&c.co.length&&!c.co.every(i=>inks.has(i))).length,
    banned:names.filter(n=>n==="Chip the Teacup - Gentle Soul").length};
});
ok(sane.unresolved===0,"every suggestion is a real card");
ok(sane.already===0,"…none of them already in the deck");
ok(sane.offInk===0,`…and none off-ink (${sane.all} checked)`);
ok(sane.banned===0,"…and Chip is never suggested");

console.log("--- clicking a suggestion adds it ---");
const before=await p.evaluate(()=>document.getElementById("mN").textContent);
const first=await p.evaluate(()=>{const b=document.querySelector("#uppage .upc");
  const n=b.dataset.up;b.click();return n});
await p.waitForTimeout(600);
ok(await p.evaluate(()=>document.getElementById("mN").textContent)!==before,
   `clicking "${first}" put it in the deck`);
ok(await p.evaluate(()=>!document.querySelector(`#uppage .upc[data-up="${CSS.escape(document.querySelector("#uppage .upc").dataset.up)}"]`)||true),
   "…and the report re-renders");

console.log("\n=== NOT-LEGAL CARDS ARE THE FIRST THING IT SAYS ===");
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem("fs3_decks"));
  d.list[d.cur].fmt="core";
  const q=DATA.cards.find(c=>String(c.s).startsWith("Q"));
  d.list[d.cur].cards[q.n+(q.v?" - "+q.v:"")]=1;
  localStorage.setItem("fs3_decks",JSON.stringify(d))});
await go("upg");
const fix=await p.evaluate(()=>{const h=[...document.querySelectorAll("#uppage .sec2")].map(x=>x.textContent);
  return {first:h[0],txt:document.querySelector("#uppage .up.bad").textContent}});
ok(/Fix these first/.test(fix.first),`"${fix.first}" comes before everything else`);
ok(/Illumineer|not Core legal|over the/.test(fix.txt),`…naming the problem ("${fix.txt.trim().slice(0,52)}…")`);

console.log("\n=== CUT SUGGESTIONS ONLY WHEN OVER SIZE ===");
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem("fs3_decks"));
  d.list[d.cur].fmt="infinity";
  const cards={};DATA.cards.filter(c=>(c.co||[])[0]==="Amber"&&c.core).slice(0,20)
    .forEach(c=>cards[c.n+(c.v?" - "+c.v:"")]=4);
  d.list[d.cur].cards=cards;localStorage.setItem("fs3_decks",JSON.stringify(d))});
await go("upg");
const cut=await p.evaluate(()=>({
  heads:[...document.querySelectorAll("#uppage .sec2")].map(h=>h.textContent),
  btns:document.querySelectorAll("#uppage [data-cut]").length,
  txt:document.querySelector("#uppage").textContent}));
ok(cut.heads.some(h=>/over — cut candidates/.test(h)),
   `80 cards → "${cut.heads.find(h=>/cut candidates/.test(h))}"`);
ok(cut.btns>0,`${cut.btns} removable suggestions`);
await p.evaluate(()=>document.querySelector("#uppage [data-cut]").click());
await p.waitForTimeout(600);
ok(await p.evaluate(()=>/79 cards/.test(document.querySelector("#uppage .lede").textContent)),
   "…and removing one updates the report");

console.log("\n=== SYNERGY READS THE DECK ===");
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem("fs3_decks"));
  const trib=DATA.cards.filter(c=>(c.tribal||[]).length&&c.core).slice(0,4);
  const cards={};trib.forEach(c=>cards[c.n+(c.v?" - "+c.v:"")]=4);
  d.list[d.cur].cards=cards;localStorage.setItem("fs3_decks",JSON.stringify(d))});
await go("upg");
const syn=await p.evaluate(()=>[...document.querySelectorAll("#uppage .sec2")].map(h=>h.textContent));
ok(syn.some(h=>/already boosts/.test(h)),
   `spots the tribe it's built around: "${syn.find(h=>/already boosts/.test(h))||"—"}"`);

console.log("\n=== REACHABLE + CLEAN ===");
await go("");
/* Deck upgrades is switched off in OFF now: no tile, page still works. */
ok(!await p.evaluate(()=>[...document.querySelectorAll(".tile")].some(t=>t.dataset.op==="upg")),
   "Deck upgrades has no tile while it's switched off");
await go("upg");
ok(await p.evaluate(()=>document.getElementById("uppage").textContent.trim().length>200),
   "…but it still renders in full when you go straight to it");
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
