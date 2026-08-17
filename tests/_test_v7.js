/* v7 — hover stability on +/−, "not legal" wording, expanded panels,
        Coconut copies step (+ Pawpsicle), Flounder rainbow & beam. */
const fs=require("fs");
const {JSDOM}=require("/tmp/node_modules/jsdom");
const FILE="/sessions/kind-modest-ride/mnt/outputs/flounder-search.html";
const HTML=fs.readFileSync(FILE,"utf8");
let fail=0,pass=0;
const ok=(c,m)=>{c?(pass++,console.log("  ✓ "+m)):(fail++,console.log("  ✗ "+m))};
const store=()=>{const s={};return{getItem:k=>k in s?s[k]:null,setItem:(k,v)=>{s[k]=String(v)},
  removeItem:k=>delete s[k],clear:()=>{}}};

(async()=>{
const dom=new JSDOM(HTML,{runScripts:"dangerously",url:"https://e.com/f.html",beforeParse(w){
  Object.defineProperty(w,"localStorage",{value:store(),configurable:true});
  w.navigator.clipboard={writeText:async()=>{}};w.alert=()=>{};
  w.prompt=()=>null;w.confirm=()=>true;w.scrollTo=()=>{};}});
const W=dom.window,D=W.document,$=i=>D.getElementById(i);
const click=e=>e.dispatchEvent(new W.MouseEvent("click",{bubbles:true}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const tile=f=>[...D.querySelectorAll("#grid .c")].find(e=>e.dataset.f===f);
const N=()=>parseInt(($("ct").textContent.match(/[\d,]+/)||["0"])[0].replace(/,/g,""),10);
const q=async v=>{$("q").value=v;$("q").dispatchEvent(new W.Event("input",{bubbles:true}));await wait(240);return N()};
await wait(400);
const DATA=JSON.parse(HTML.match(/<script>var DATA=([\s\S]*?);var KINDS=/)[1]);

console.log("\n=== 1. + / − NO LONGER DESTROY THE HOVERED CARD ===");
await q("Ariel - Spectacular Singer");
const t0=tile("Ariel - Spectacular Singer");
click(t0.querySelector("img")||t0.querySelector(".ph"));await wait(80);
const t1=tile("Ariel - Spectacular Singer");
ok(t1===t0,"adding a card keeps the very same tile element (so :hover survives)");
ok(!!t1.querySelector("[data-plus]"),"…and the +/− stepper appeared on it");
click(t1.querySelector("[data-plus]"));await wait(80);
const t2=tile("Ariel - Spectacular Singer");
ok(t2===t0,"clicking + keeps the same element too");
ok(t2.querySelector(".qty .n").textContent==="2","…and the count updated in place (2)");
click(t2.querySelector("[data-minus]"));await wait(80);
ok(tile("Ariel - Spectacular Singer")===t0,"clicking − keeps the same element");
ok(t0.querySelector(".qty .n").textContent==="1","…and the count went back to 1");
ok(/function refreshTiles/.test(HTML),"refreshTiles() exists");
ok(/saveDecks\(\);renderDeck\(\);refreshTiles\(\)/.test(HTML),"…and add/delCard use it instead of renderGrid()");
click($("dx"));await wait(80);

console.log("\n=== 2. 'ILLEGAL' WORDING IS GONE FROM THE UI ===");
// Ben's actual case: Coconut is singleton, so a 2nd copy breaks the 1-copy limit.
$("fmt").value="coconut";$("fmt").dispatchEvent(new W.Event("change",{bubbles:true}));await wait(80);
const offF="Ariel - Spectacular Singer";
await q(offF);
const at=tile(offF);
click(at.querySelector("img")||at.querySelector(".ph"));await wait(70);
click(tile(offF).querySelector("[data-plus]"));await wait(80);
const rm=$("drm");
ok(!!rm,"the remove button appears once a card breaks the 1-copy limit");
ok(/Remove not legal cards/.test(rm.textContent),`…and reads "${rm.textContent.trim()}"`);
ok(!/illegal/i.test($("deck").textContent),"the word 'illegal' appears nowhere in the deck panel");
// only look at text the user can actually read — the CSS class is still "illegal"
const visible=[...D.querySelectorAll("body *")]
  .filter(el=>!el.children.length&&!/^(SCRIPT|STYLE)$/.test(el.tagName))
  .map(el=>el.textContent).join(" ");
ok(!/illegal/i.test(visible),"…nor anywhere else the user can read");

console.log("\n=== 3. NOT-LEGAL CARDS GET A BADGE, NOT A FULL-CARD WASH ===");
await q(offF);
const badT=tile(offF);
ok(badT.classList.contains("illegal"),"the over-limit card is flagged");
const why=badT.querySelector(".why");
ok(!!why,"…with a small note");
ok(/Not legal/.test(why.textContent),`…reading "${why.textContent.trim().slice(0,44)}"`);
ok(!/\.c\.illegal img\{[^}]*filter:saturate/.test(HTML),"the whole-card dimming filter is gone");
ok(!/\.c\.illegal\{[^}]*inset\}/.test(HTML),"the heavy inset ring is gone");
ok(!/\.c\.illegal:hover \.why\{display:flex\}/.test(HTML),"the full-cover hover overlay is gone");
/* The notice moved again: it used to float over the art at bottom:60px, which
   still covered the part people look at. It is now a static strip UNDER the
   image, emitted after it in the markup. */
ok(/\.c\.illegal \.why\{position:static/.test(HTML),
   "…replaced by a static strip that never covers the art");
const iw=HTML.indexOf('class="why"'), ii=HTML.indexOf("${im}");
ok(iw>ii,"…and it comes after the image in the tile markup, not before it");
ok(/\.c\.illegal \.why\{[^}]*pointer-events:none/.test(HTML),"…that can't block the buttons underneath");
ok(!!badT.querySelector("[data-plus]")&&!!badT.querySelector("[data-minus]"),
   "…and you can still add or remove copies of it");
click(rm);await wait(80);

console.log("\n=== 4. SPECIAL SEARCHES OPEN, ALL GROUPS EXPANDED ===");
ok($("special").open,"Special searches is open on arrival");
const grps=[...D.querySelectorAll("#groups details.grp")];
ok(grps.length>0,`${grps.length} filter groups rendered`);
ok(grps.every(d=>d.open),"…and every one of them starts expanded");
ok(/load\("fs3_spec",true\)/.test(HTML),"the saved preference defaults to open");
click($("colAll"));await wait(60);
ok([...D.querySelectorAll("#groups details.grp")].every(d=>!d.open),"Collapse all still works");
click($("expAll"));await wait(60);
ok([...D.querySelectorAll("#groups details.grp")].every(d=>d.open),"…and Expand all brings them back");

console.log("\n=== 5. GUIDED STEP 3 — HOW MANY COCONUTS ===");
click($("mGuided"));await wait(80);
$("gq").value="dumbo";$("gq").dispatchEvent(new W.Event("input",{bubbles:true}));await wait(60);
click(D.querySelector("#cg [data-c]"));await wait(80);
click(D.querySelector(".pair[class*='rec-']"));await wait(80);
const steps=[...D.querySelectorAll(".gstep h3")].map(h=>h.textContent.replace(/^\d/,"").trim());
ok(steps.length===6,`the flow now has ${steps.length} steps`);
ok(/How many Coconuts/.test(steps[2]),`step 3 is "${steps[2]}"`);
ok(/Staples/.test(steps[3]),`…and Staples moved to step 4`);
ok(!!$("gc4")&&/Add 4×/.test($("gc4").textContent),`"${$("gc4").textContent.trim()}"`);
ok(!!$("gc1")&&/Add one/.test($("gc1").textContent),"'Add one'");
ok(!!$("gcskip")&&/Skip/.test($("gcskip").textContent),"'Skip'");
ok(!$("gy"),"staples stay locked until you answer");
const dumbo=DATA.cards.find(x=>x.n==="Dumbo"&&/Ninth Wonder/i.test(x.v||""))||DATA.cards.find(x=>x.n==="Dumbo");
click($("gc4"));await wait(80);
ok(+$("mN").textContent===4,`'Add 4×' put 4 cards in the deck (${$("mN").textContent})`);
ok(!!$("gy"),"…and that unlocks the staples step");
click($("gc1"));await wait(80);
ok(+$("mN").textContent===1,"'Add one' sets it back to exactly 1 (not 5)");

console.log("\n=== 6. NICK WILDE GETS THE PAWPSICLE OPTION ===");
ok(DATA.cards.some(c=>c.n==="Pawpsicle"&&String(c.s)==="2"&&c.num===169&&c.r==="Common"),
   "Pawpsicle is in the data at Rise of the Floodborn #169, Common");
$("gq").value="dumbo";$("gq").dispatchEvent(new W.Event("input",{bubbles:true}));await wait(60);
click(D.querySelector("#cg [data-c]"));await wait(80);
click(D.querySelector(".pair[class*='rec-']"));await wait(80);
ok(!$("gcx"),"Dumbo gets no extra-item button");
$("gq").value="nick wilde";$("gq").dispatchEvent(new W.Event("input",{bubbles:true}));await wait(60);
click(D.querySelector("#cg [data-c]"));await wait(80);
click(D.querySelector(".pair[class*='rec-']"));await wait(80);
ok(!!$("gcx"),"Nick Wilde does");
ok(/Add 4 Pawpsicle/.test($("gcx").textContent),`…reading "${$("gcx").textContent.trim()}"`);
const b4=+$("mN").textContent;
click($("gcx"));await wait(80);
ok(+$("mN").textContent===b4+4,`clicking it adds 4 Pawpsicles (${b4} → ${$("mN").textContent})`);
ok(!!$("gy"),"…and that also satisfies the step");
click($("mManual"));await wait(80);
await q("Pawpsicle");
ok(tile("Pawpsicle").querySelector(".qty .n").textContent==="4","the deck really holds 4× Pawpsicle");
ok(!tile("Pawpsicle").classList.contains("illegal"),"…and 4 copies is not flagged (Nick Wilde allows it)");

console.log("\n=== 7. FLOUNDER GETS THE RAINBOW + LIGHT BEAM ===");
const fl=DATA.cards.filter(c=>c.n==="Flounder");
ok(fl.length>=2,`${fl.length} Flounder cards in the data`);
click($("clr"));await wait(80);
await q("Flounder - Voice of Reason");
ok(tile("Flounder - Voice of Reason").classList.contains("flounder"),"a Flounder tile gets the .flounder class");
click($("clr"));await wait(80);
await q("Ariel - Spectacular Singer");
ok(!tile("Ariel - Spectacular Singer").classList.contains("flounder"),"…and nothing else does");
ok(/\.c\.flounder::after\{/.test(HTML),"a ring is drawn around it");
ok(/mask-composite:exclude/.test(HTML),"…as a masked gradient border, so it follows the rounded corners");
ok(/@keyframes fbow/.test(HTML)&&/animation:fbow/.test(HTML),"…and the rainbow animates");
ok(/\.c\.flounder:hover::before\{/.test(HTML),"a light beam appears on hover");
ok(/conic-gradient\(from 205deg at 50% 100%/.test(HTML),"…shaped as a cone rising out of the card");
ok(/\.c\.flounder:hover\{overflow:visible/.test(HTML),"…and the tile lets it escape");
ok(/animation:fbeam \.55s ease 1s forwards/.test(HTML),"…timed to land after the 1s zoom");
ok(/@media\(hover:none\)\{\.c\.flounder:hover::before\{display:none\}\}/.test(HTML),"…and is suppressed on touch");

console.log(`\n${fail?"❌":"✅"} ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
})().catch(e=>{console.error("CRASH:",e);process.exit(1)});
