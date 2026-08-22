const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1000}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1800);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== PRINTING DATA ===");
const d=await p.evaluate(()=>{
  const c=DATA.cards,wp=c.filter(x=>(x.pr||[]).length>1);
  const tot=wp.reduce((a,x)=>a+x.pr.length,0)+c.filter(x=>!(x.pr||[]).length).length;
  const ench=[];c.forEach(x=>(x.pr||[]).forEach(pp=>{if(pp.r==="Enchanted")ench.push([x,pp])}));
  return {cards:c.length,multi:wp.length,tot,ench:ench.length,
    noImg:c.reduce((a,x)=>a+(x.pr||[]).filter(pp=>!pp.i).length,0),
    dupImg:ench.filter(([x,pp])=>pp.i===x.img).length,
    variants:(c.find(x=>x.n==="Dalmatian Puppy")||{}).pr.map(pp=>pp.num)};
});
ok(d.tot===3242,`all ${d.tot} printings present (was 2543, we were dropping 699)`);
ok(d.multi===596,`${d.multi} cards have alternates`);
ok(d.ench===222&&d.dupImg===0,`${d.ench} enchanteds, none reusing base art`);
ok(d.noImg===0,"every printing has its own image");
ok(JSON.stringify(d.variants)==='["4a","4b","4c","4d","4e","38"]',
   `variant letters preserved: ${d.variants.join(", ")}`);

console.log("\n=== DECKS STILL NAME-BASED (nothing broke) ===");
const total=await p.evaluate(()=>parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10));
ok(total===2543,`grid still shows ${total} cards, not 3242 — printings didn't leak into search`);
await p.fill("#q","Hades - King of Olympus");await p.waitForTimeout(700);
await p.evaluate(()=>document.querySelector("#grid .c img").click());await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.getElementById("mN").textContent)==="1","adding a card works as before");
await p.click("#clr");await p.waitForTimeout(400);

console.log("\n=== OTHER PRINTINGS DRAWER ===");
await p.fill("#q","Hades - King of Olympus");await p.waitForTimeout(700);
await p.evaluate(()=>document.querySelector("#grid .c [data-i]").click());await p.waitForTimeout(600);
const dr=await p.evaluate(()=>{const s=document.getElementById("prs");
  return s?{txt:s.querySelector("summary").textContent.replace(/\s+/g," ").trim(),
    n:s.querySelectorAll("[data-pr]").length,open:s.open}:null});
ok(!!dr,"the drawer exists");
ok(/Show other printings of this card/.test(dr.txt),`"${dr.txt}"`);
ok(dr.n===2,`${dr.n} printings listed`);
ok(!dr.open,"…collapsed by default");
const before=await p.evaluate(()=>document.querySelector("#modal .mimg > img").src);
await p.evaluate(()=>{document.getElementById("prs").open=true});await p.waitForTimeout(250);
const labels=await p.evaluate(()=>[...document.querySelectorAll("#prs .pcard .ps")].map(e=>e.textContent));
ok(/Enchanted/.test(await p.evaluate(()=>document.querySelectorAll("#prs .pr2")[1].textContent)),
   `second entry is the Enchanted (${labels.join(" | ")})`);
await p.evaluate(()=>document.querySelectorAll("#prs [data-pr]")[1].click());await p.waitForTimeout(500);
const after=await p.evaluate(()=>document.querySelector("#modal .mimg > img").src);
ok(after!==before,"clicking a printing swaps the big image");
const meta=await p.evaluate(()=>document.querySelector(".mline").textContent.replace(/\s+/g," "));
ok(/Enchanted/.test(meta),`…and the meta line follows it (${meta.trim()})`);
ok(await p.evaluate(()=>document.querySelectorAll("#prs .pcard.on").length)===1,"…with the active one highlighted");

console.log("\n=== DEFAULT-PRINTING PREFERENCE ===");
await p.evaluate(()=>document.getElementById("mx").click());await p.waitForTimeout(300);
/* Filters now start collapsed, and Playwright refuses to act on an element it
   can't see — so the panel has to be opened before reaching inside it, the
   same as a person would. */
await p.evaluate(()=>{document.getElementById("side").open=true;
  const s=[...document.querySelectorAll("#side details.sec")]
    .find(x=>/Card images/.test(x.querySelector("summary").textContent));s.open=true});
await p.waitForTimeout(300);
ok(await p.evaluate(()=>!!document.getElementById("prPref")),"sidebar has the preference control");
const baseSrc=await p.evaluate(()=>document.querySelector("#grid .c img").src);
await p.selectOption("#prPref","enchanted");await p.waitForTimeout(700);
const enchSrc=await p.evaluate(()=>document.querySelector("#grid .c img").src);
ok(enchSrc!==baseSrc,"switching to Enchanted changes the grid art");
const enchOK=await p.evaluate(()=>{
  const el=document.querySelector("#grid .c"),c=DATA.cards.find(x=>(x.v?x.n+" - "+x.v:x.n)===el.dataset.f);
  const e=(c.pr||[]).find(pp=>pp.r==="Enchanted");
  return e?el.querySelector("img").src===e.i:null});
ok(enchOK===true,"…to that card's actual enchanted image");
// a card with no enchanted must fall back, not break
await p.fill("#q","Flounder - Voice of Reason");await p.waitForTimeout(700);
const fb=await p.evaluate(()=>{const el=document.querySelector("#grid .c");
  const c=DATA.cards.find(x=>(x.v?x.n+" - "+x.v:x.n)===el.dataset.f);
  return {has:(c.pr||[]).some(pp=>pp.r==="Enchanted"),src:el.querySelector("img").src,base:c.img}});
ok(fb.has===false&&fb.src===fb.base,"a card with no enchanted falls back to base art");
await p.reload();await p.waitForTimeout(1800);
ok(await p.evaluate(()=>document.getElementById("prPref")?true:(()=>{const s=[...document.querySelectorAll("#side details.sec")].find(x=>/Card images/.test(x.querySelector("summary").textContent));s.open=true;return true})()),"preference control survives reload");
ok(await p.evaluate(()=>{const s=[...document.querySelectorAll("#side details.sec")].find(x=>/Card images/.test(x.querySelector("summary").textContent));s.open=true;return document.getElementById("prPref").value})==="enchanted","…and remembers the choice");

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
