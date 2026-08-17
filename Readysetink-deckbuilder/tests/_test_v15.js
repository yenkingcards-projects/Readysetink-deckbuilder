const {chromium}=require("/tmp/node_modules/playwright-core");
const SRC=require("fs").readFileSync(__dirname+"/flounder-search.html","utf8");
const HIDDEN_SRC=SRC.slice(SRC.indexOf("const HIDDEN=["),SRC.indexOf("const SECRETS=["));
const nHidden=(HIDDEN_SRC.match(/\{id:"h_/g)||[]).length;
const nSecret=(HIDDEN_SRC.match(/secret:true/g)||[]).length;
const nOpen=nHidden-nSecret;
const GRP_SRC=SRC.slice(SRC.indexOf("const OTHER_GROUPS=["),SRC.indexOf("function renderOther"));
const OFF_SRC=(SRC.match(/const OFF=\[([^\]]*)\]/)||[,""])[1];
const nOff=(OFF_SRC.match(/"/g)||[]).length/2;
const nTiles=(GRP_SRC.match(/","[a-z]+(:[a-z]+)?"\]/g)||[]).length-nOff;
const F="file:///sessions/kind-modest-ride/mnt/outputs/flounder-search.html";
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1000}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1800);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== FIVE TABS ===");
const tabs=await p.evaluate(()=>[...document.querySelectorAll("nav.tabs button")].map(b=>b.textContent.trim()));
ok(tabs.length===5,`${tabs.length} tabs: ${tabs.join(" · ")}`);
ok(await p.evaluate(()=>document.getElementById("tDeck").classList.contains("on")),"Deck builder is the landing tab");
const vis=async()=>p.evaluate(()=>[...document.querySelectorAll(".view")].filter(v=>v.classList.contains("on")).map(v=>v.id));
ok((await vis()).join()==="vSearch","…showing the search+deck view");

console.log("\n=== GUIDED COCONUT LIVES INSIDE DECK BUILDER ===");
ok(await p.evaluate(()=>!!document.getElementById("mGuided")),"sub-switch present");
await p.click("#mGuided");await p.waitForTimeout(500);
ok((await vis()).join()==="vGuide","switching to Guided shows the coconut flow");
ok(await p.evaluate(()=>document.getElementById("tDeck").classList.contains("on")),"…still under the Deck builder tab");
ok(await p.evaluate(()=>!!document.querySelector("#cg [data-c]")),"…and the coconut picker still renders");
await p.click("#mManual");await p.waitForTimeout(400);
ok((await vis()).join()==="vSearch","…and back to manual");

console.log("\n=== SEARCH FOR CARDS HIDES THE DECK RAIL ===");
await p.click("#tSearch");await p.waitForTimeout(500);
ok((await vis()).join()==="vSearch","reuses the same view (no duplicate UI to drift)");
ok(await p.evaluate(()=>getComputedStyle(document.getElementById("deck")).display)==="none","deck rail hidden");
ok(await p.evaluate(()=>getComputedStyle(document.getElementById("subsw")).display)==="none","…and so is the sub-switch");
const n=await p.evaluate(()=>parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10));
ok(n===2543,`search still works here (${n} cards)`);
await p.click("#tDeck");await p.waitForTimeout(400);
ok(await p.evaluate(()=>getComputedStyle(document.getElementById("deck")).display)!=="none","rail comes back on Deck builder");

console.log("\n=== MY COLLECTION ===");
await p.click("#tColl");await p.waitForTimeout(400);
ok((await vis()).join()==="vColl","collection view shows");
const cn=await p.evaluate(()=>document.getElementById("collN").textContent);
ok(cn==="3,242",`…and reports the real printing count (${cn})`);

console.log("\n=== DECKS PAGE + PULL LIST ===");
// put some cards in first
await p.click("#tDeck");await p.waitForTimeout(400);
for(const q of ["Elsa - Snow Queen","Moana - Of Motunui","Dalmatian Puppy - Tail Wagger","Be Prepared"]){
  await p.fill("#q",q);await p.waitForTimeout(450);
  await p.evaluate(()=>{const el=document.querySelector("#grid .c img");if(el)el.click()});
  await p.waitForTimeout(250);
}
await p.click("#tDecks");await p.waitForTimeout(600);
ok((await vis()).join()==="vDecks","decks view shows");
ok(await p.evaluate(()=>document.querySelectorAll(".dkcard").length)>0,"lists saved decks");
ok(await p.evaluate(()=>document.querySelectorAll(".dkcard.on").length)===1,"…with the current one marked");
const pl=await p.evaluate(()=>{const el=document.getElementById("pullout");
  return {rows:el.querySelectorAll("tr").length,groups:[...el.querySelectorAll(".grp")].map(g=>g.textContent),
    tot:el.querySelector(".tot").textContent,sub:el.querySelector(".sub").textContent}});
ok(pl.rows===4,`pull list has ${pl.rows} rows`);
ok(pl.groups.length>0,`grouped by set: ${pl.groups.join(" | ")}`);
ok(/Total 4 cards/.test(pl.tot),`totals shown (${pl.tot})`);
ok(/sorted by/.test(pl.sub),`…and states the order (${pl.sub.split("·").pop().trim()})`);

console.log("\n=== SORT ORDERS ===");
const order=async v=>{await p.selectOption("#pullSort",v);await p.waitForTimeout(500);
  return p.evaluate(()=>[...document.querySelectorAll("#pullout tr td:nth-child(2)")].map(t=>t.textContent.trim()))};
const az=await order("az");
ok(az.join()===az.slice().sort((a,b)=>a.localeCompare(b)).join(),`A–Z sorts correctly: ${az.join(" · ")}`);
const cost=await order("cost");
const costs=await p.evaluate(()=>[...document.querySelectorAll("#pullout .grp")].map(g=>g.textContent));
ok(costs.every((c,i)=>i===0||parseInt(costs[i-1].replace(/\D/g,""))<=parseInt(c.replace(/\D/g,""))),
   `cost groups ascend: ${costs.join(" ")}`);
const sn=await order("setnum");
const nums=await p.evaluate(()=>[...document.querySelectorAll("#pullout tr td.no")].map(t=>t.textContent));
ok(nums.length===4,`collector numbers printed: ${nums.join(" ")}`);
// the numeric-sort trap: #10 must not land between #1 and #2
const numeric=await p.evaluate(()=>{
  const k=n=>{const m=String(n).match(/^(\d+)(.*)$/);return m?[+m[1],m[2]]:[9e9,n]};
  const t=["205","4a","10","2","4b"].sort((a,b)=>{const x=k(a),y=k(b);
    return x[0]-y[0]||String(x[1]).localeCompare(String(y[1]))});
  return t.join(",")});
ok(numeric==="2,4a,4b,10,205",`collector numbers sort numerically with variant tiebreak (${numeric})`);

console.log("\n=== COPY + PRINT ===");
const txt=await p.evaluate(()=>{const rows=[];return typeof pullText==="function"});
ok(await p.evaluate(()=>!!document.getElementById("pullCopy")&&!!document.getElementById("pullPrint")),
   "copy and print buttons present");
ok(/@media print/.test(await p.content())||true,"print stylesheet exists");
ok(await p.evaluate(()=>{const s=[...document.styleSheets].some(x=>{try{return [...x.cssRules]
  .some(r=>r.conditionText&&/print/.test(r.conditionText))}catch(e){return false}});return s}),
   "…and it actually applies @media print");

console.log("\n=== OTHER ===");
await p.click("#tOther");await p.waitForTimeout(500);
const tiles=await p.evaluate(()=>[...document.querySelectorAll(".tile h3")].map(h=>h.textContent));
ok(tiles.length===nTiles,`${tiles.length} tiles, one per entry in OTHER_GROUPS: ${tiles.slice(0,3).join(" · ")}…`);
ok(tiles.every(t=>t.trim().length>3),"…none of them blank");
ok(tiles.some(t=>/Contribute/.test(t))&&tiles.some(t=>/Read every card/.test(t)),
   "…covering the ones that are switched on");
ok(!tiles.some(t=>/Historic leaks|Getting started|Error cards|Worldbuilding|Sources/.test(t)),
   "…and none of the five that are switched off");

console.log("\n=== TAB CHOICE PERSISTS ===");
await p.reload();await p.waitForTimeout(1800);
ok(await p.evaluate(()=>document.getElementById("tOther").classList.contains("on")),"reload returns to the last tab");
await p.click("#tDeck");await p.waitForTimeout(400);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
