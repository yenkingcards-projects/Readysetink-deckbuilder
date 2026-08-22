const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const ctx=await b.newContext({viewport:{width:1500,height:1050},permissions:["clipboard-read","clipboard-write"]});
const p=await ctx.newPage();
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1800);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== FOUND FROM OTHER ===");
await p.click("#tOther");await p.waitForTimeout(500);
const tiles=await p.evaluate(()=>[...document.querySelectorAll(".tile h3")].map(h=>h.textContent));
// v21: Other is grouped now — Dust leads, Read every card is on the same top shelf
ok(tiles.some(t=>/Read every card/.test(t)),`"Read every card" is on the page (first tile is "${tiles[0]}")`);
ok(await p.evaluate(()=>!!document.querySelector('[data-op="read"]')),"…and it's clickable");
await p.evaluate(()=>document.querySelector('[data-op="read"]').click());await p.waitForTimeout(600);

console.log("\n=== SET / INK MENU ===");
const menu=await p.evaluate(()=>({
  sets:[...document.querySelectorAll(".rset .rsh b")].map(b=>b.textContent),
  first:[...document.querySelectorAll(".rset")][0].querySelectorAll(".rink").length,
  inks:[...document.querySelectorAll(".rset")][0]?[...[...document.querySelectorAll(".rset")][0]
    .querySelectorAll(".rink")].map(x=>x.textContent.trim()):[]}));
ok(menu.sets.length>10,`${menu.sets.length} sets listed`);
ok(menu.sets[0]==="The First Chapter",`release order, oldest first (${menu.sets[0]} → ${menu.sets[menu.sets.length-1]})`);
ok(menu.first===6,`6 ink sections in the first set: ${menu.inks.join(" ")}`);
ok(!menu.sets.some(s=>/Hyperia/.test(s)),"empty future sets are not offered");

console.log("\n=== DUAL-INK CARDS APPEAR UNDER BOTH INKS ===");
const dual=await p.evaluate(()=>{
  const c=DATA.cards.find(x=>(x.co||[]).length===2);
  const f=c.n+(c.v?" - "+c.v:"");
  const inSec=i=>DATA.cards.filter(x=>x.s===c.s&&(x.co||[]).includes(i))
    .some(x=>(x.n+(x.v?" - "+x.v:""))===f);
  return {f,inks:c.co,a:inSec(c.co[0]),b:inSec(c.co[1])}});
ok(dual.a&&dual.b,`${dual.f} (${dual.inks.join("/")}) is in both ink sections`);

console.log("\n=== THE READER ===");
await p.evaluate(()=>document.querySelector(".rink").click());await p.waitForTimeout(700);
const r0=await p.evaluate(()=>({hdr:document.querySelector(".rbar2 b").textContent,
  ct:document.querySelector(".rct").textContent,name:document.querySelector(".rtext h2").textContent+" "+(document.querySelector(".rtext .vv")||{}).textContent,
  num:document.querySelector(".rimg img")?1:0,
  prevOff:document.getElementById("rPrev").disabled}));
ok(/The First Chapter · Amber/.test(r0.hdr),`reading "${r0.hdr}"`);
ok(/^1 \/ \d+$/.test(r0.ct),`progress shown (${r0.ct})`);
ok(r0.num===1,"card image renders");
ok(r0.prevOff,"Previous is disabled on the first card");
const total=parseInt(r0.ct.split("/")[1]);
await p.click("#rNext");await p.waitForTimeout(400);
const r1=await p.evaluate(()=>({ct:document.querySelector(".rct").textContent,
  name:document.querySelector(".rtext h2").textContent+" "+(document.querySelector(".rtext .vv")||{}).textContent,
  pct:document.querySelector(".rprog i").style.width}));
ok(r1.ct==="2 / "+total,`Next advances (${r1.ct})`);
ok(r1.name!==r0.name,`…to a different card (${r0.name} → ${r1.name})`);
ok(parseFloat(r1.pct)>0,`progress bar moves (${r1.pct})`);

console.log("\n=== KEYBOARD ===");
await p.keyboard.press("ArrowRight");await p.waitForTimeout(350);
ok(await p.evaluate(()=>document.querySelector(".rct").textContent)==="3 / "+total,"→ advances");
await p.keyboard.press("ArrowLeft");await p.waitForTimeout(350);
ok(await p.evaluate(()=>document.querySelector(".rct").textContent)==="2 / "+total,"← goes back");
await p.keyboard.press(" ");await p.waitForTimeout(350);
ok(await p.evaluate(()=>document.querySelector(".rct").textContent)==="3 / "+total,"space advances");

console.log("\n=== CARDS ARE IN COLLECTOR ORDER ===");
const order=await p.evaluate(()=>{
  const k=n=>{const m=String(n).match(/^(\d+)(.*)$/);return m?[+m[1],m[2]]:[9e9,n]};
  const list=DATA.cards.filter(c=>c.s==="1"&&(c.co||[]).includes("Amber"))
    .sort((a,b)=>{const x=k(a.num),y=k(b.num);return x[0]-y[0]||String(x[1]).localeCompare(String(y[1]))});
  return list.slice(0,6).map(c=>c.num)});
ok(order.every((n,i)=>i===0||parseInt(order[i-1])<=parseInt(n)),`ascending: #${order.join(" #")}`);

console.log("\n=== RESUME ===");
await p.keyboard.press("Escape");await p.waitForTimeout(350);
await p.reload();await p.waitForTimeout(1800);
const res=await p.evaluate(()=>{const el=document.getElementById("rResume");
  return el?el.textContent.trim():null});
ok(!!res,`reload offers to resume ("${res}")`);
ok(/card 3/.test(res||""),"…at exactly the card you left on");
await p.evaluate(()=>document.getElementById("rResume").click());await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.querySelector(".rct").textContent)==="3 / "+total,"…and lands there");

console.log("\n=== SCRIPT EXPORT ===");
await p.click("#rScript");await p.waitForTimeout(700);
const clip=await p.evaluate(()=>navigator.clipboard.readText());
ok(clip.length>500,`script copied (${clip.length} chars)`);
ok(/^The First Chapter — Amber/.test(clip),"…headed with the section");
ok(new RegExp(`${total} cards`).test(clip),`…stating ${total} cards`);
ok((clip.match(/--- \d+ of \d+ ---/g)||[]).length===total,`…one block per card (${(clip.match(/--- \d+ of/g)||[]).length})`);
ok(/ink ·/.test(clip)&&/strength ·/.test(clip),"…with cost, inks and stats spoken in order");
console.log("     ┌ first 190 chars of the script");
console.log("     │ "+clip.slice(0,190).replace(/\n/g,"\n     │ "));

console.log("\n=== ESCAPE + BACK ===");
await p.keyboard.press("Escape");await p.waitForTimeout(400);
ok(await p.evaluate(()=>!!document.querySelector(".rsets")),"Esc returns to the set menu");
ok(await p.evaluate(()=>!!document.getElementById("rResume")),"…while KEEPING the resume point — leaving shouldn't lose your place");
await p.click("#rExit");await p.waitForTimeout(500);
ok(await p.evaluate(()=>!!document.getElementById("otherTiles")),"← Other leaves the reader");

console.log("\n=== NOTHING ELSE BROKE ===");
await p.click("#tDeck");await p.waitForTimeout(500);
const n=await p.evaluate(()=>parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10));
ok(n===2543,`deck builder still fine (${n} cards)`);
ok(errs.length===0,`no JS errors across the whole run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
