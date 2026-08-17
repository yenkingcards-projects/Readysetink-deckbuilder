const {chromium}=require("/tmp/node_modules/playwright-core");
const F="file:///sessions/kind-modest-ride/mnt/outputs/flounder-search.html";
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1000}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1700);
const N=()=>p.evaluate(()=>parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10));
const type=async v=>{await p.fill("#q",v);await p.waitForTimeout(430);return N()};
const enter=async v=>{await p.fill("#q",v);await p.press("#q","Enter");await p.waitForTimeout(430);return N()};
const clear=async()=>{await p.click("#clr");await p.waitForTimeout(400)};
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== ARTIST DATA ===");
const ad=await p.evaluate(()=>{
  const c=DATA.cards, withAr=c.filter(x=>(x.ar||[]).length);
  const all=new Set();c.forEach(x=>(x.ar||[]).forEach(a=>all.add(a)));
  const multi=c.filter(x=>(x.ar||[]).length>1);
  return {total:c.length,withAr:withAr.length,unique:all.size,multi:multi.length,
    sample:(c.find(x=>x.n==="Ariel"&&/Spectacular/.test(x.v))||{}).ar};
});
ok(ad.withAr===ad.total,`every one of ${ad.total} cards has an illustrator`);
ok(ad.unique>200,`${ad.unique} distinct illustrators (collaborations split out)`);
ok(ad.multi>0,`${ad.multi} cards are collaborations`);
ok(JSON.stringify(ad.sample)==='["Alice Pisoni"]',`sample: Ariel - Spectacular Singer → ${JSON.stringify(ad.sample)}`);

console.log("\n=== ARTIST SEARCH ===");
const n1=await type("artist:kole");
ok(n1>0,`artist:kole → ${n1} cards`);
const names=await p.evaluate(()=>[...document.querySelectorAll("#grid .c")].slice(0,60)
  .map(e=>e.dataset.f).map(f=>DATA.cards.find(c=>(c.v?c.n+" - "+c.v:c.n)===f)).map(c=>c.ar));
ok(names.every(a=>a.some(x=>/kole/i.test(x))),"…every result really is credited to a Kole");
await clear();
const n2=await type('by:"Grace Tran"');
ok(n2>0,`by:"Grace Tran" → ${n2} cards`);
await clear();
const n3=await type("illus:pisoni");
ok(n3>0,`illus:pisoni → ${n3} cards`);
await clear();

console.log("\n=== ARTIST AS A PILL ===");
const n4=await enter("Nicholas Kole");
const pill=await p.evaluate(()=>document.querySelector(".pill")?document.querySelector(".pill").textContent:"");
ok(/🖌️/.test(pill),`typing a full name + Enter makes a brush pill (${pill.replace("×","").trim()})`);
ok(n4>0&&n4===n1,`…matching the field search exactly (${n4} vs ${n1})`);
await p.evaluate(()=>document.querySelector(".pill .x").click());await p.waitForTimeout(400);
ok(await N()>2000,"…and the × removes it");
await clear();

console.log("\n=== ILLUSTRATOR FACET ===");
const fac=await p.evaluate(()=>{
  const s=[...document.querySelectorAll("#side details.sec")]
    .find(d=>/Illustrator/.test(d.querySelector("summary").textContent));
  if(!s)return null;s.open=true;
  return {n:s.querySelectorAll("[data-art]").length,box:!!s.querySelector("#artQ"),
    first:s.querySelector("[data-art]")?s.querySelector("[data-art]").dataset.art:null};
});
ok(!!fac,"sidebar has an Illustrator section");
ok(fac.box,"…with a filter box");
ok(fac.n>100,`…listing ${fac.n} illustrators, busiest first (${fac.first})`);
await p.evaluate(()=>{const i=document.querySelector("#artQ");i.value="pisoni";
  i.dispatchEvent(new Event("input",{bubbles:true}))});
await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.querySelectorAll("[data-art]").length)<5,"…and the box narrows the list");
await p.evaluate(()=>{const c=document.querySelector("[data-art]");c.checked=true;
  c.dispatchEvent(new Event("change",{bubbles:true}))});
await p.waitForTimeout(450);
ok(await N()>0&&await N()<80,`ticking one filters the grid (${await N()} cards)`);
await clear();

console.log("\n=== BOOST CHIPS ===");
const chip=async l=>p.evaluate(t=>{
  const c=[...document.querySelectorAll("#groups .chip")].find(x=>x.textContent.includes(t));
  if(!c)return null;c.click();
  return new Promise(r=>setTimeout(()=>r(parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10)),400));},l);
const unchip=async l=>p.evaluate(t=>{[...document.querySelectorAll("#groups .chip")]
  .find(x=>x.textContent.includes(t)).click();return new Promise(r=>setTimeout(r,400))},l);
const nB=await chip("Boost (has or cares about)");
ok(nB===42,`"Boost (has or cares about)" → ${nB} — 32 with the keyword + 10 that reference it`);
await unchip("Boost (has or cares about)");
const nC=await chip("Cheap Boost");
ok(nC===11,`"Cheap Boost (play + boost ≤ 4)" → ${nC} cards`);
const cheapList=await p.evaluate(()=>[...document.querySelectorAll("#grid .c")].map(e=>{
  const c=DATA.cards.find(x=>(x.v?x.n+" - "+x.v:x.n)===e.dataset.f);
  const bv=(c.kw.find(k=>k[0]==="Boost")||[])[1];return {f:e.dataset.f,c:c.c,b:bv}}));
ok(cheapList.every(x=>x.b!=null&&x.c+x.b<=4),"…every one really is play+boost ≤ 4");
console.log("     "+cheapList.map(x=>`${x.f.split(" - ")[0]} ${x.c}+${x.b}`).join(" · "));
await unchip("Cheap Boost");

console.log("\n=== DONALD RECOMMENDS THEM ===");
await p.click("#mGuided");await p.waitForTimeout(400);
await p.fill("#gq","donald");await p.waitForTimeout(400);
await p.evaluate(()=>document.querySelector("#cg [data-c]").click());await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector(".pair[class*='rec-']").click());await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById("gcskip").click());await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById("gskip").click());await p.waitForTimeout(400);
const rec=await p.evaluate(()=>[...document.querySelectorAll("[data-rec]")].map(b=>b.textContent.trim()));
console.log("     "+rec.join(" | "));
ok(rec.some(t=>/Cheap Boost/.test(t)),"Cheap Boost is recommended for Donald Duck");
ok(rec.some(t=>/Boost \(has or cares about\)/.test(t)),"…and so is the wider Boost chip");

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
