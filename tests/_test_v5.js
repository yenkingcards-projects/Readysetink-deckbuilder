/* v5 suite — the UI/UX list from Ben's latest round. */
const _W=require(__dirname+"/_where.js");
const fs=require("fs");
const {JSDOM}=require("/tmp/node_modules/jsdom");
const FILE=_W.FILE;
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
const chg=e=>e.dispatchEvent(new W.Event("change",{bubbles:true}));
/* Format is a segmented control inside the deck panel now, not a <select> in
   the masthead. Clicking the button is what a person does, and it goes through
   the same seam the old onchange did. */
const setFmt=k=>{const b=D.querySelector('[data-fmt="'+k+'"]');
  if(!b)throw new Error("no format button: "+k);click(b)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const cards=()=>[...D.querySelectorAll("#grid .c")];
const tile=f=>cards().find(e=>e.dataset.f===f);
const q=async v=>{$("q").value=v;$("q").dispatchEvent(new W.Event("input",{bubbles:true}));await wait(240)};
const add=e=>click(e.querySelector("img")||e.querySelector(".ph"));
await wait(400);
const DATA=JSON.parse(HTML.match(/<script>var DATA=([\s\S]*?);var KINDS=/)[1]);

console.log("\n=== COCONUT TEXT CORRECTIONS ===");
ok(/Robin's Bow/.test(HTML),"Robin Hood – Sneaky Sleuth updated (Robin's Bow)");
ok(/top 2 cards of your deck into your inkwell/.test(HTML),"Mufasa updated to top 2 cards");
// Scope this to the COCO block. Searching the whole file was always fragile:
// the real card "Capsize" (Q1 #17) says "top 3 cards of your deck into your
// inkwell" too, and once build-time rewrap stitched its line break the phrase
// started appearing legitimately.
const COCOBLOCK=(HTML.match(/const COCO=\[[\s\S]*?\n\];/)||[""])[0];
ok(COCOBLOCK.length>500,"found the Coconut definition block");
ok(!/top 3 cards of your deck into your inkwell/.test(COCOBLOCK),"…old 'top 3' text is gone");

console.log("\n=== SPECIAL SEARCHES PANEL ===");
ok(!!$("special"),"Special searches section exists");
ok($("special").open,"…open by default");   // v7: was collapsed
ok($("fb").closest("#special")!==null,"Flounder button lives inside it");
ok($("fb").compareDocumentPosition($("groups"))&W.Node.DOCUMENT_POSITION_FOLLOWING,"…at the very top");
ok(!!$("expAll")&&!!$("colAll"),"Expand all / Collapse all buttons");
/* [data-g] scopes this to the real filter groups. The Coconut block is also
   a details.grp but is deliberately always-closed, so counting it here would
   make "all groups start expanded" false by design. */
const grps=()=>[...D.querySelectorAll("#groups details.grp[data-g]")];
ok(grps().every(g=>g.open),"every filter group starts expanded");   // v7: was collapsed
click($("expAll"));await wait(40);
ok(grps().every(g=>g.open),"Expand all opens all 12");
click($("colAll"));await wait(40);
ok(grps().every(g=>!g.open),"Collapse all closes them");
grps()[0].open=true;grps()[0].dispatchEvent(new W.Event("toggle"));await wait(40);
ok(grps()[0].open&&!grps()[1].open,"individual groups still collapse independently");

console.log("\n=== DECK: IMAGE VIEW DEFAULT ===");
await q("Grandmother Willow");
add(tile("Grandmother Willow - Ancient Advisor"));await wait(60);
ok($("vImg").classList.contains("on"),"deck builder defaults to Images");
ok($("deck").querySelectorAll(".dcard").length>0,"…rendering card images");

console.log("\n=== DECK ANALYSIS (moved out of the build row) ===");
ok(!$("dh")||$("dh").closest("#dana")!==null,"sample hand is no longer a loose builder button");
const ana=$("dana");
ok(!!ana,"'Deck analysis' section exists");
ana.open=true;ana.dispatchEvent(new W.Event("toggle"));await wait(60);
ok(!!D.querySelector(".arch"),"archetype badge renders: "+(D.querySelector(".arch")||{}).textContent);
ok(D.querySelectorAll(".curveT div").length===4,"optimal curve shows 1/2/3/4 ink");
ok(/want \d/.test(D.querySelector(".curveT").textContent),"…with a target per slot");
ok(!!$("dh"),"sample hand now lives inside analysis");

console.log("\n--- archetype actually reacts to the deck ---");
await q("cost:1 type:character");
for(let i=0;i<8;i++){const t=cards()[i];if(t)for(let j=0;j<4;j++)add(t)}
await wait(80);
const a1=(D.querySelector(".arch")||{}).textContent;
ok(/AGGRO|MIDRANGE|CONTROL|OTHER/.test(a1||""),"a 32-card pile of 1-drops reads as: "+a1);

console.log("\n=== ILLEGAL CARDS ===");
setFmt("core");await wait(80);
await q("");
setFmt("coconut");await wait(80);
// coconut is singleton, so the 4x stacks above are now illegal
const ill=cards().filter(e=>e.classList.contains("illegal"));
ok(ill.length>0,`${ill.length} cards flagged illegal on this page`);
ok(ill[0].querySelector(".why")!==null,"…with a small reason badge");
// v7: no longer a full-card wash, and sentence case rather than shouting
ok(/Not legal/.test(ill[0].querySelector(".why").textContent),"…reading Not legal");
ok(/#ff2d78/.test(HTML),"…styled hot pink");
ok(!!$("drm"),"'Remove N illegal' button appears in the deck panel");
const beforeRm=$("mN").textContent;
click($("drm"));await wait(80);
ok($("mN").textContent!==beforeRm,`remove-illegal culled the deck (${beforeRm} → ${$("mN").textContent})`);

console.log("\n=== COCONUT 4x TAG ===");
setFmt("coconut");await wait(40);
const dsel=$("csel");
if(dsel){
  const ariel=[...dsel.options].findIndex(o=>/Ariel/.test(o.textContent));
  dsel.value=String(ariel-1);chg(dsel);await wait(60);
}
await q("Ariel - Spectacular Singer");
const at=tile("Ariel - Spectacular Singer");
ok(!!at,"found Ariel – Spectacular Singer");
ok(/CAN HAVE 4/.test(at.textContent),"…tagged CAN HAVE 4× when she's your Coconut");
await q("Stitch - Rock Star");
const st=tile("Stitch - Rock Star");
ok(st&&!/CAN HAVE 4/.test(st.textContent),"…and other cards are not");

console.log("\n=== SHIFT TARGETS RESPECT INK ===");
setFmt("infinity");await wait(40);
click($("clr"));await wait(40);
const shiftCard=DATA.cards.find(c=>(c.kw||[]).some(k=>/shift/i.test(k[0]||""))&&
  DATA.cards.filter(x=>x.n===c.n&&x.ty==="Character").length>2);
await q(shiftCard.n+" - "+shiftCard.v);
add(tile(shiftCard.n+" - "+shiftCard.v));await wait(60);
click(tile(shiftCard.n+" - "+shiftCard.v).querySelector("[data-sh]"));await wait(60);
ok(/Shift targets/.test($("modal").textContent),"shift sub-screen opens");
ok(/NOT LEGAL INK PAIR|\.mcard\.illegal/.test($("modal").innerHTML+HTML),
   "…off-ink targets can be flagged NOT LEGAL INK PAIR");
click($("mx"));

console.log("\n=== BIGGER CONTROLS ===");
ok(/\.c \.i\{[^}]*width:30px/.test(HTML),"info button enlarged to 30px");
ok(/\.mx\{[^}]*background:var\(--bad\)/.test(HTML),"modal close is red");
ok(/\.mx\{[^}]*width:42px/.test(HTML),"…and 42px");
ok(/@media\(max-width:680px\)\{\.mx\{width:52px/.test(HTML),"…52px on phones");

console.log("\n=== MODAL QTY STEPPER ===");
await q("Flounder - Voice of Reason");
click(tile("Flounder - Voice of Reason").querySelector("[data-i]"));await wait(60);
ok($("mbg").classList.contains("on"),"card modal opens");
const mm=$("mr"),mp=$("ma");
ok(mm&&mm.textContent==="−"&&mp&&mp.textContent==="+","− and + in the modal");
const mid=mm.nextElementSibling;
ok(mid&&/^\d+$/.test(mid.textContent.trim()),"…with the current count between them: "+mid.textContent.trim());
const n0=mid.textContent.trim();
click(mp);await wait(60);
ok($("mr").nextElementSibling.textContent.trim()!==n0,"+ updates the number in place");

console.log("\n=== LOCATIONS ===");
ok(/\.c\.loc img\{transform:none/.test(HTML),"locations sit normal in the grid");
// v6: bumped 1.5 → 1.95 and now escapes the tile so it shows full landscape
ok(/\.c\.loc:hover img\{transform:rotate\(90deg\) scale\(1\.95\)/.test(HTML),"…rotate + expand on hover");
ok(/transition-delay:\.5s/.test(HTML),"…after 0.5s");
ok(/\.c \.i\{[^}]*z-index:5/.test(HTML),"info button stays above the rotated art");

console.log(`\n${fail?"❌":"✅"} ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
})().catch(e=>{console.error("CRASH:",e);process.exit(1)});
