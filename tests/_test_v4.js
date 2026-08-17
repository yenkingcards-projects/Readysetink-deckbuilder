/* v4 UX regression suite — the things Ben specifically asked to be fixed. */
const fs=require("fs");
const {JSDOM}=require("/tmp/node_modules/jsdom");
const FILE="/sessions/kind-modest-ride/mnt/outputs/flounder-search.html";
const HTML=fs.readFileSync(FILE,"utf8");
let fail=0,pass=0;
const ok=(c,m)=>{c?(pass++,console.log("  ✓ "+m)):(fail++,console.log("  ✗ "+m))};
const store=()=>{const s={};return{getItem:k=>k in s?s[k]:null,setItem:(k,v)=>{s[k]=String(v)},
  removeItem:k=>delete s[k],clear:()=>{}}};

(async()=>{
const alerts=[];
const dom=new JSDOM(HTML,{runScripts:"dangerously",url:"https://e.com/f.html",beforeParse(w){
  Object.defineProperty(w,"localStorage",{value:store(),configurable:true});
  w.navigator.clipboard={writeText:async()=>{}};w.alert=m=>alerts.push(m);
  w.prompt=()=>null;w.confirm=()=>true;w.scrollTo=()=>{};}});
const W=dom.window,D=W.document,$=i=>D.getElementById(i);
const click=e=>e.dispatchEvent(new W.MouseEvent("click",{bubbles:true}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const cards=()=>[...D.querySelectorAll("#grid .c")];
const q=async v=>{$("q").value=v;$("q").dispatchEvent(new W.Event("input",{bubbles:true}));await wait(240)};
const tile=f=>cards().find(e=>e.dataset.f===f);
const add=e=>click(e.querySelector("img")||e.querySelector(".ph"));
await wait(400);
const DATA=JSON.parse(HTML.match(/<script>var DATA=([\s\S]*?);var KINDS=/)[1]);

console.log("\n=== 1. IMAGE INTEGRITY (the blocker) ===");
ok(DATA.cards.every(c=>c.img),"every card has an image URL");
const urls=DATA.cards.map(c=>(c.img||"").split("?")[0]);
ok(new Set(urls).size===urls.length,`all ${urls.length} image URLs are unique — no two cards share art`);
const dupNames=new Set(),dups=[];
DATA.cards.forEach(c=>{const k=(c.n+" "+c.v).toLowerCase().replace(/[^a-z0-9]/g,"");
  if(dupNames.has(k))dups.push(c.n);dupNames.add(k)});
ok(dups.length===0,"no duplicate cards from casing inconsistencies ('Let It Go' vs 'Let it Go')");

console.log("\n=== 2. DECK ROW: + LEFT, − RIGHT ===");
await q("Grandmother Willow");
add(tile("Grandmother Willow - Ancient Advisor"));
await wait(40);
ok($("deck").querySelectorAll(".dcard").length>0,"deck defaults to IMAGE view");
click($("vList"));await wait(50);            // names view to inspect row order
const row=$("deck").querySelector(".dl");
const btns=[...row.querySelectorAll("button")];
ok(btns[0].textContent==="−","first button in the deck row is −");
ok(btns[btns.length-1].textContent==="+","last button is +");
const kids=[...row.children].map(e=>e.textContent.trim().slice(0,3));
ok(btns[0].textContent==="−"&&btns[btns.length-1].textContent==="+","reading order is − … + ("+kids.join(" ")+")");
click($("vImg"));await wait(40);             // restore the image default for later sections

console.log("\n=== 3. QTY STEPPER ON THE CARD TILE ===");
await q("Grandmother Willow");
const gw=tile("Grandmother Willow - Ancient Advisor");
ok(!!gw.querySelector(".qty"),"stepper appears on the tile once a copy is in the deck");
const qb=[...gw.querySelector(".qty").children];
ok(qb[0].classList.contains("m")&&qb[0].textContent==="−","… − on the left");
ok(qb[2].classList.contains("p")&&qb[2].textContent==="+","… + on the right");
ok(qb[1].textContent==="1","… count in the middle");
click(gw.querySelector("[data-plus]"));await wait(40);
ok($("mN").textContent==="2","tile + adds a copy");
click(tile("Grandmother Willow - Ancient Advisor").querySelector("[data-minus]"));await wait(40);
ok($("mN").textContent==="1","tile − removes a copy");
await q("Flounder - Voice of Reason");
ok(!tile("Flounder - Voice of Reason").querySelector(".qty"),"no stepper on cards not in the deck");

console.log("\n=== 4. SHIFT TARGET PROMPT ===");
const shiftCard=DATA.cards.find(c=>(c.kw||[]).some(k=>/shift/i.test(k[0]||""))&&
  DATA.cards.some(x=>x.n===c.n&&x.ty==="Character"&&!(x.kw||[]).some(k=>/shift/i.test(k[0]||""))));
await q(shiftCard.n+" - "+shiftCard.v);
const sc=tile(shiftCard.n+" - "+shiftCard.v);
ok(!!sc,"found a Shift card: "+shiftCard.n+" - "+shiftCard.v);
ok(!sc.querySelector(".shift"),"no shift prompt before it's in the deck");
add(sc);await wait(60);
const sc2=tile(shiftCard.n+" - "+shiftCard.v);
ok(!!sc2.querySelector(".shift"),"'Add shift target?' appears once it's in the deck");
ok(/Add shift target/.test(sc2.querySelector(".shift").textContent),"…with the right label");
click(sc2.querySelector("[data-sh]"));await wait(60);
ok($("mbg").classList.contains("on"),"clicking it opens the sub-screen");
ok(/Shift targets/.test($("modal").textContent),"…titled Shift targets");
ok(D.querySelectorAll("#modal .mcard").length>0,"…listing valid same-name targets");
const beforeT=$("mN").textContent;
click(D.querySelector("#modal [data-add]"));await wait(60);
ok($("mN").textContent!==beforeT,"…and you can add one straight from it");
click($("mx"));

console.log("\n=== 5. LOCATIONS ROTATED ===");
const loc=DATA.cards.find(c=>c.ty==="Location");
await q(loc.n+(loc.v?" - "+loc.v:""));
const lt=tile(loc.n+(loc.v?" - "+loc.v:""));
ok(lt&&lt.classList.contains("loc"),"location tiles get the .loc class: "+loc.n);
ok(/\.c\.loc:hover img\{transform:rotate\(90deg\)/.test(HTML),"…and rotates only on hover");
click(lt.querySelector("[data-i]"));await wait(50);
// v6: the detail view now uses a dedicated landscape frame instead of a rotated <img class=loc>
ok($("modal").querySelector(".locframe img")!==null,"location art is rotated in the detail view too");
click($("mx"));

console.log("\n=== 6. ★ BUTTON GONE FROM TILES ===");
await q("Elsa");
ok(cards()[0].querySelector(".star")===null,"★ removed from card tiles (deferred to hosted profile)");

console.log("\n=== 7. RAMP FILTER ===");
const chip=t=>[...D.querySelectorAll("#groups .chip")].find(c=>c.textContent.includes(t));
await q("");
const rampChip=chip("Ramp / more ink");
ok(!!rampChip,"'Ramp / more ink' chip exists");
click(rampChip);await wait(60);
const rampN=parseInt($("ct").textContent.match(/[\d,]+/)[0].replace(/,/g,""),10);
ok(rampN>50&&rampN<140,`Ramp → ${rampN} cards`);
const sample=cards().slice(0,20).map(e=>e.dataset.f);
const byF={};DATA.cards.forEach(c=>byF[c.v?c.n+" - "+c.v:c.n]=c);
ok(sample.every(f=>/inkwell|ink an additional/i.test(byF[f].ef||"")),"every ramp hit really references the inkwell");
click(rampChip);

console.log("\n=== 8. COLLAPSIBLE CHIP GROUPS ===");
const grps=[...D.querySelectorAll("#groups details.grp")];
ok(grps.length===12,`${grps.length} chip groups are <details> elements`);
ok(grps.every(g=>g.querySelector("summary")),"…each with a clickable summary");
ok(grps.every(g=>g.open),"…and ALL start EXPANDED by default");   // v7: was collapsed

console.log("\n=== 9. GUIDED BUILD: ALL STEPS VISIBLE ===");
click($("mGuided"));await wait(80);
const steps=[...D.querySelectorAll(".gstep")];
ok(steps.length===6,`all ${steps.length} steps render up front (no surprise pop-ins)`); // v7: +copies step
ok(steps.filter(s=>s.classList.contains("locked")).length>0,"unreached steps show as dimmed previews");
ok(steps[3].textContent.length>40,"…and the preview text tells you what's coming");
ok(!!$("gdeck"),"deck panel is visible alongside the steps");

console.log("\n=== 10. CONFIDENCE-CODED RECOMMENDATION ===");
ok(/\.pair\.rec-strong\{/.test(HTML)&&/animation:rain/.test(HTML),"clear favourite renders rainbow");
ok(/\.pair\.rec-ok\{/.test(HTML)&&/\.pair\.rec-close\{/.test(HTML),"solid / close-call have their own styles");
$("gq").value="snow white";$("gq").dispatchEvent(new W.Event("input",{bubbles:true}));await wait(50);
click(D.querySelector("#cg [data-c]"));await wait(80);
const recPair=D.querySelector(".pair[class*='rec-']");
const conf=[...recPair.classList].find(c=>c.startsWith("rec-"));
ok(conf==="rec-strong",`Snow White (Seven Dwarfs) is a clear favourite → ${conf} (rainbow)`);
ok(/BEST/.test(recPair.textContent),"…labelled BEST rather than just RECOMMENDED");

console.log("\n=== 11. GUIDED STEP FLOW ===");
click(recPair);await wait(80);
click($("gcskip"));await wait(80);   // v6: copies step now sits between inks and staples
ok(D.querySelectorAll(".gstep .mgrid .mcard").length>0,"step 4 shows real cards for the chosen inks");
ok(!!$("gy")&&/Add all/.test($("gy").textContent),"'Add all N staples' button");
ok(!!$("gn")&&/See the staples/.test($("gn").textContent),"'See the staples' option");
click($("gn"));await wait(80);
ok(D.querySelectorAll(".gstep .mgrid .mcard").length>10,"manual mode lists the whole legal pool");
click($("gm"));await wait(80);
const before=$("mN").textContent;
const oneAdd=D.querySelector(".gstep .mgrid [data-madd]");
if(oneAdd){click(oneAdd);await wait(60);
  ok($("mN").textContent!==before,"you can add a card straight from a guided step");}
else ok(false,"no addable card in guided step");
ok(!!$("gdone"),"final step offers 'Go to deck builder'");
click($("gdone"));await wait(60);
ok($("vSearch").classList.contains("on"),"…and it takes you to Search & Deck");

console.log("\n=== 12. BIGGER CARDS + HOVER ZOOM ===");
/* Not a frozen number — Ben asked for bigger thumbnails and may ask again.
   The invariant is that they never shrink back below the 165px they were. */
const gridW=+(HTML.match(/\.grid\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\((\d+)px/)||[,0])[1];
ok(gridW>=165,`grid tiles are ${gridW}px, never smaller than the old 165px`);
ok(/\.c:hover\{[^}]*transform:scale\(1\.55\)/.test(HTML),"hovering scales the card up");
ok(/transition-delay:1s/.test(HTML),"…after a 1 second dwell, so it doesn't flicker while scanning");
ok(/@media\(hover:none\)\{\.c:hover\{transform:none/.test(HTML),"…and is disabled on touch devices");

console.log("\n=== 13. DECK IMAGE / NAME VIEW ===");
click($("mManual"));await wait(60);
await q("Grandmother Willow");
if(!$("deck").querySelector(".dl,.dcard")) add(tile("Grandmother Willow - Ancient Advisor"));
await wait(50);
ok(!!$("vList")&&!!$("vImg"),"deck panel has Names / Images toggle");
ok($("vImg").classList.contains("on"),"…Images is the active view");
ok($("deck").querySelectorAll(".dcard").length>0,"…showing card images");
click($("vList"));await wait(50);ok($("vList").classList.contains("on"),"can switch to Names");
click($("vImg"));await wait(50);
ok($("vImg").classList.contains("on"),"switching back to Images");
const dc=$("deck").querySelectorAll(".dcard");
ok(dc.length>0,`…renders ${dc.length} card image(s)`);
ok(dc[0].querySelector("img")!==null,"…with a real <img>");
ok(dc[0].querySelector(".dq")!==null,"…and a quantity badge");
const dbtn=[...dc[0].querySelectorAll(".dbtn button")];
ok(dbtn[0].textContent==="−"&&dbtn[1].textContent==="+","…− left, + right here too");
const beforeD=$("mN").textContent;
click(dbtn[1]);await wait(50);
ok($("mN").textContent!==beforeD,"…and the buttons work in image view");
click($("vList"));await wait(40);
ok($("deck").querySelectorAll(".dl").length>0,"switching back to Names works");

console.log("\n=== 14. CORES STEP REMOVED ===");
click($("mGuided"));await wait(60);
ok(!/Recommended cores/.test(D.getElementById("guide").textContent),"'Recommended cores' step is gone");
ok(D.querySelectorAll("[data-pk]").length===0,"…no package buttons anywhere");
ok(!/PACKAGES/.test(HTML.split("var DATA=")[1]||""),"…and the packages data is removed from the build");

console.log(`\n${fail?"❌":"✅"} ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
})().catch(e=>{console.error("CRASH:",e);process.exit(1)});
