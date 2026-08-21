/* v39 — the cosmetic pass.

   Ten changes that are mostly appearance, but four of them move controls that
   other code reaches for by id. Those are the ones worth testing: the format
   picker replaced a <select> that four call sites used to write to, the filter
   sidebar became a <details> that renderSide() writes into, the borrow list
   swapped sides with the pull sheet, and a rename has to re-key an object that
   is keyed by name.

   The purely visual ones are checked as computed style rather than as source
   text, so a rule that is overridden later still fails here. */
const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const SRC=require("fs").readFileSync(_W.FILE,"utf8");
const F=_W.URL;
const decks=p=>p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_decks")||"{}"));
const goTab=async(p,t,op)=>{
  await p.evaluate(([t,o])=>{localStorage.setItem("fs3_tab",JSON.stringify(t));
    localStorage.setItem("fs3_opage",JSON.stringify(o||""))},[t,op]);
  await p.reload();await p.waitForTimeout(2000)};

(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(2000);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== THE CARD HIGHLIGHT GLOWS ===");
await p.hover("#grid .c img");await p.waitForTimeout(1400);
const sh=await p.evaluate(()=>getComputedStyle(document.querySelector("#grid .c:hover")).boxShadow);
const blurs=[...sh.matchAll(/(\d+)px (\d+)px(?: (-?\d+)px)?/g)];
ok(/0px 0px 0px 3px/.test(sh),"the crisp 3px ring is still there — glow alone reads as blur");
ok((sh.match(/rgba\(255, ?212, ?0/g)||[]).length>=2,
   "…with at least two amber halos layered outside it");
ok(/30px 10px/.test(sh),`…the outer one spreading well past the card (${
   (sh.match(/\d+px \d+px/g)||[]).join(", ")})`);
ok(/rgba\(0, ?0, ?0/.test(sh),"…and the drop shadow that lifts it off the page survives");
console.log("--- and the keyboard cursor matches ---");
ok(/\.c\.kb\{[^}]*box-shadow:0 0 14px/.test(SRC.replace(/\s*\n\s*/g,"")),
   "building with the arrow keys looks like building with the mouse");

console.log("\n=== FILTERS COLLAPSE, AND START COLLAPSED ===");
/* The spine layout this section used to test is gone — Filters is now the same
   full-width bar as Special searches, and _test_v40 covers its shape in
   detail. What stays here is the behaviour that was asked for first and must
   not regress: closed on arrival, opens on click, remembers the choice. */
await p.goto(F);await p.waitForTimeout(2000);
ok(await p.evaluate(()=>!document.getElementById("side").open),
   "a first visit shows the card grid, not twelve stacked filter sections");
ok(await p.evaluate(()=>/filters/i.test(document.querySelector("#side>summary").textContent)),
   "…behind a heading that says Filters");
await p.click("#side>summary");await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.getElementById("side").open),"clicking it opens it");
ok(await p.evaluate(()=>document.querySelectorAll("#sidebody .sec").length>=10),
   "every filter section still renders inside it");
console.log("--- it says when something is hidden inside ---");
await p.evaluate(()=>document.querySelector("[data-ink]").click());
await p.waitForTimeout(700);
ok(await p.evaluate(()=>/1 on/.test(document.getElementById("fcnt").textContent)),
   "a filter left on is announced on the collapsed bar");
await p.evaluate(()=>{const e=document.getElementById("c0");e.value="3";
  e.dispatchEvent(new Event("change",{bubbles:true}))});
await p.waitForTimeout(700);
ok(await p.evaluate(()=>/2 on/.test(document.getElementById("fcnt").textContent)),
   "…and so is a cost range, which has no tick-box to notice");
console.log("--- and it remembers how you left it ---");
await p.reload();await p.waitForTimeout(1900);
ok(await p.evaluate(()=>document.getElementById("side").open),"left open, it comes back open");
await p.click("#side>summary");await p.waitForTimeout(400);
await p.reload();await p.waitForTimeout(1900);
ok(await p.evaluate(()=>!document.getElementById("side").open),"left closed, it comes back closed");

console.log("\n=== THE SEARCH BOX INVITES RATHER THAN INSTRUCTS ===");
ok(await p.evaluate(()=>document.getElementById("q").placeholder)==="Try one of our special searches",
   "the placeholder is Ben's line");
/* Read off the element, not off the stylesheet. Scanning cssRules finds the
   FIRST rule mentioning ::placeholder — which is the body.dark one — and so
   reported a value that never applies in the light theme. */
const op=await p.evaluate(()=>parseFloat(
  getComputedStyle(document.getElementById("q"),"::placeholder").opacity));
ok(op<.5,`…and it sits back at ${op} opacity`);
const opDark=await p.evaluate(()=>{document.body.classList.add("dark");
  const v=parseFloat(getComputedStyle(document.getElementById("q"),"::placeholder").opacity);
  document.body.classList.remove("dark");return v});
ok(opDark<.5,`…in the dark theme too (${opDark}), which had been left at .6`);
ok(!/describe the art like/.test(SRC),"the old three-line instruction is gone");

console.log("\n=== FORMAT BELONGS TO THE DECK ===");
await p.goto(F);await p.waitForTimeout(2000);
ok(await p.evaluate(()=>!document.getElementById("fmt")),
   "the masthead <select> is gone");
ok(await p.evaluate(()=>{const d=document.getElementById("deck"),f=document.getElementById("fmtpick");
  return !!(d&&f&&d.contains(f))}),
   "…and the picker sits inside the deck panel, where the rules it sets are");
ok(await p.evaluate(()=>document.querySelectorAll("#fmtpick [data-fmt]").length)===3,
   "all three formats are visible at once, not hidden in a dropdown");
ok(await p.evaluate(()=>document.querySelectorAll("#fmtpick .fmtb.on").length)===1,
   "…with exactly one marked as current");
const amber=await p.evaluate(()=>getComputedStyle(document.querySelector(".fmtb.on")).backgroundColor);
ok(/255, ?212, ?0/.test(amber),`…in Action Yellow, the site's "here" colour (${amber})`);
ok(await p.evaluate(()=>document.querySelector(".fmtwhy").textContent.length>30),
   "…and the rules it sets are spelled out under it");
console.log("--- clicking one actually changes the deck ---");
await p.evaluate(()=>document.querySelector('[data-fmt="coconut"]').click());
await p.waitForTimeout(900);
let D=await decks(p);
ok(D.list[D.cur].fmt==="coconut","the deck's format really changed");
ok(await p.evaluate(()=>document.querySelector(".fmtb.on").textContent==="Coconut"),
   "…and the picker repainted itself from the deck");
console.log("--- and the ink cap is still enforced on the way ---");
await p.evaluate(()=>document.querySelector('[data-fmt="infinity"]').click());await p.waitForTimeout(700);
await p.evaluate(()=>{document.getElementById("side").open=true});
await p.evaluate(()=>{[...document.querySelectorAll("[data-ink]")].slice(0,2).forEach(b=>b.click())});
await p.waitForTimeout(800);
const before=await p.evaluate(()=>document.querySelectorAll("[data-ink].on").length);
await p.evaluate(()=>document.querySelector('[data-fmt="coconut"]').click());await p.waitForTimeout(800);
ok(before===2&&await p.evaluate(()=>document.querySelectorAll("[data-ink].on").length)<=3,
   "switching format still trims the ink selection to the new cap");

console.log("\n=== RENAMING A DECK ===");
await p.evaluate(()=>localStorage.setItem("fs3_decks",JSON.stringify({cur:"Alpha",
  list:{Alpha:{fmt:"core",coco:null,cards:{"Elsa - Snow Queen":2}},
        Beta:{fmt:"core",coco:null,cards:{}}}})));
await p.reload();await p.waitForTimeout(2000);
await p.click("#dren");await p.waitForTimeout(500);
ok(await p.evaluate(()=>!!document.querySelector(".cfm")),"the deck panel offers a rename");
await p.fill("#npIn","Steel Aggro");
await p.evaluate(()=>document.querySelector(".cfm [data-yes]").click());
await p.waitForTimeout(900);
D=await decks(p);
ok(D.cur==="Steel Aggro","…and the builder follows the deck to its new name");
ok(D.list["Steel Aggro"]&&D.list["Steel Aggro"].cards["Elsa - Snow Queen"]===2,
   "…carrying its cards with it");
ok(!D.list.Alpha,"…with the old key gone, not left as a duplicate");
ok(Object.keys(D.list).join()==="Steel Aggro,Beta",
   `…and the shelf keeps its order rather than shuffling (${Object.keys(D.list).join(", ")})`);
console.log("--- a name already in use is refused ---");
await p.click("#dren");await p.waitForTimeout(400);
await p.fill("#npIn","Beta");
await p.evaluate(()=>document.querySelector(".cfm [data-yes]").click());
await p.waitForTimeout(800);
D=await decks(p);
ok(Object.keys(D.list).length===2&&!!D.list["Steel Aggro"],
   "renaming onto an existing deck doesn't silently eat it");
console.log("--- and it can be done from the Decks tab too ---");
await goTab(p,"tDecks");
ok(await p.evaluate(()=>document.querySelectorAll("[data-ren]").length)===2,
   "every deck card carries a rename");
ok(await p.evaluate(()=>{const r=document.querySelector("[data-ren]");
  return r.tagName!=="BUTTON"&&r.getAttribute("role")==="button"}),
   "…as a role=button, because a <button> cannot legally nest inside the card's own button");

console.log("\n=== THE BORROW LIST FOLLOWS THE PULL SHEET ===");
ok(await p.evaluate(()=>{
    const bb=document.getElementById("borrowBox"),pl=document.querySelector(".pull");
    if(!bb||!pl)return false;
    return !!(bb.compareDocumentPosition(pl)&Node.DOCUMENT_POSITION_PRECEDING)}),
   "the pull sheet comes first — it's what the page is for");

console.log("\n=== COLLECTION: TRANSFER TAB ABOVE THE SET PICKER ===");
await goTab(p,"tColl");
const tabs=await p.evaluate(()=>[...document.querySelectorAll("[data-ctab]")].map(x=>x.textContent.trim()));
ok(tabs.some(t=>/Transfer Your Collection/.test(t)),`tabs: ${tabs.join(" · ")}`);
ok(await p.evaluate(()=>{
    const t=document.querySelector(".ctabs"),h=[...document.querySelectorAll("#collBody h3")]
      .find(x=>/choose a set/i.test(x.textContent));
    return !!(t&&h&&(t.compareDocumentPosition(h)&Node.DOCUMENT_POSITION_FOLLOWING))}),
   "…and the tabs sit above Choose a set, not underneath it");
await p.evaluate(()=>document.querySelector('[data-ctab="fast"]').click());
await p.waitForTimeout(900);
ok(await p.evaluate(()=>!!document.getElementById("csvFile")),"the CSV import tile is in the transfer tab");
ok(await p.evaluate(()=>document.querySelectorAll("[data-fast]").length)>=8,
   "…alongside the bulk playset buttons");
ok(await p.evaluate(()=>{
    const c=document.getElementById("collImport"),g=document.querySelector(".fastgrid");
    return !!(c&&g&&(c.compareDocumentPosition(g)&Node.DOCUMENT_POSITION_FOLLOWING))}),
   "…with CSV first, because that's the one that saves an hour");
ok(await p.evaluate(()=>document.querySelectorAll(".fastpanel [data-cset]").length)>0,
   "…and its own set picker, since the bulk buttons act on one set");

console.log("\n=== ILLUMINEER'S QUEST SETS ARE NESTED ===");
const sets=await p.evaluate(()=>({
  top:[...document.querySelectorAll("#collBody .fastpanel > .chips > [data-cset]")].map(x=>x.dataset.cset),
  nested:[...document.querySelectorAll("#collBody .otherset [data-cset]")].map(x=>x.dataset.cset),
  label:(document.querySelector(".otherset summary")||{}).textContent||""}));
ok(/Other sets/.test(sets.label),`the block is called "Other sets"`);
ok(sets.nested.length>0&&sets.nested.every(s=>/^Q/.test(s)),
   `every Quest set is inside it (${sets.nested.join(", ")})`);
ok(sets.top.every(s=>/^\d+$/.test(s)),
   `…and only numbered sets are left at the top (${sets.top.length} of them)`);
ok(await p.evaluate(()=>!document.querySelector(".otherset").open),
   "closed by default — they're campaign boxes, not constructed sets");
ok(!/Illumineer's Quest:/.test(sets.nested.join("")+sets.label),
   "…and the chips don't repeat the words the block already says");

console.log("\n=== THE DISCLAIMER MOVED TO SETTINGS ===");
ok(await p.evaluate(()=>!document.querySelector(".foot")),"there is no running footer any more");
/* Strip HTML comments first — the note explaining the bug necessarily quotes
   the thing it is about, and a naive grep counts that as a relapse. */
ok(!/\$\{""\}/.test(SRC.split("<script>")[0].replace(/<!--[\s\S]*?-->/g,"")),
   "…and the stray ${\"\"} that printed under it is gone");
await goTab(p,"tOther","pref");
const legal=await p.evaluate(()=>{const l=document.querySelector(".legal");
  return l?{align:getComputedStyle(l).textAlign,txt:l.innerText}:null});
ok(!!legal,"Settings carries it instead");
ok(legal.align==="center","…centre justified, as asked");
ok(/not published, endorsed or approved/i.test(legal.txt),
   "…and it is still the actual Community Code wording, which is not optional");
ok(await p.evaluate(()=>!/\$\{/.test(document.body.innerText)),
   "no dollar-brace anywhere on the rendered page");

console.log("\n=== HIDDEN MOUSEYS ===");
await goTab(p,"tOther","mick");
ok(await p.evaluate(()=>/Hidden Mouseys/.test(document.querySelector("#mickpage h1").textContent)),
   "the page is called Hidden Mouseys");
const lede=await p.evaluate(()=>document.querySelector("#mickpage .lede").innerText);
ok(!/Nineteen cards/i.test(lede),"the old count-first blurb is gone");
ok(/EPCOT|dared you/.test(lede),"…replaced with the story, which is the interesting part");
await goTab(p,"tOther");
const tile=await p.evaluate(()=>{const t=[...document.querySelectorAll(".tile")]
  .find(x=>/Mousey/i.test(x.textContent));return t?t.innerText:""});
ok(/Hidden Mouseys/.test(tile),"the Other-menu tile is renamed too");
ok(!/Nineteen/i.test(tile),"…and doesn't lead with a number");
ok(!/mouse-shaped symbols/i.test(await p.evaluate(()=>document.body.innerText)),
   "no page still says “mouse-shaped symbols” to a reader");

ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);
console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
