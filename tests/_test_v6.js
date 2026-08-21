/* v6 — locations, shift-target ink greying, guided tweaks, removable search terms. */
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
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const cards=()=>[...D.querySelectorAll("#grid .c")];
const tile=f=>cards().find(e=>e.dataset.f===f);
const N=()=>parseInt(($("ct").textContent.match(/[\d,]+/)||["0"])[0].replace(/,/g,""),10);
const q=async v=>{$("q").value=v;$("q").dispatchEvent(new W.Event("input",{bubbles:true}));await wait(240);return N()};
const enter=async v=>{$("q").value=v;$("q").dispatchEvent(new W.KeyboardEvent("keydown",{key:"Enter",bubbles:true}));await wait(80);return N()};
await wait(400);
const DATA=JSON.parse(HTML.match(/<script>var DATA=([\s\S]*?);var KINDS=/)[1]);
const total=N();

console.log("\n=== 1. LOCATION TILE POPS OUT LANDSCAPE ===");
ok(/\.c\.loc:hover\{[^}]*overflow:visible/.test(HTML),"hovering lets the card escape its portrait tile");
ok(/\.c\.loc:hover img\{transform:rotate\(90deg\) scale\(1\.95\)/.test(HTML),"…rotating and growing to 1.95×");
ok(/\.c\.loc:hover\{[^}]*z-index:90/.test(HTML),"…above everything else");
ok(/\.c\.loc:hover img\{[^}]*transition-delay:\.5s/.test(HTML),"…after the 0.5s dwell");
ok(/\.c\.loc:hover\{[^}]*transform:none/.test(HTML),"…without also applying the generic card zoom");

console.log("\n=== 2. LOCATION MODAL IS BIGGER + LANDSCAPE ===");
const loc=DATA.cards.find(c=>c.ty==="Location");
const locName=loc.n+(loc.v?" - "+loc.v:"");
await q(locName);
const lt=tile(locName);
ok(!!lt&&lt.classList.contains("loc"),"found a location: "+locName);
click(lt.querySelector("[data-i]"));await wait(60);
ok($("modal").classList.contains("loc"),"modal gets the .loc class");
ok(/\.modal\.loc\{max-width:1040px/.test(HTML),"…and a wider 1040px box (vs 820 normal)");
ok(D.querySelector(".locframe")!==null,"…with a true landscape frame");
// v8: aspect-ratio replaced by padding-top, which no browser can squash
ok(/\.locframe\{[^}]*padding-top:71\.7%/.test(HTML),"…of landscape aspect");
ok(/\.locframe\{[^}]*align-self:start/.test(HTML),"…that the modal grid can't stretch");
ok(/\.locframe img\{[^}]*width:71\.7%/.test(HTML),"…image sized so rotation fills it exactly");
ok(/\.locframe img\{position:absolute;top:50%;left:50%/.test(HTML),"…and centred deterministically");

console.log("\n=== 3. LOCATION RULES REMINDER ===");
ok(D.querySelector(".locnote")!==null,"location modal shows a rules reminder");
const nt=D.querySelector(".locnote").textContent;
ok(/start of your turn/i.test(nt),"…lore is gained at the start of your turn");
ok(/Move Cost/i.test(nt),"…move cost explained");
ok(/persists/i.test(nt),"…damage persists all game");
ok(/no strength/i.test(nt),"…locations have no strength");
ok(/Comprehensive Rules 5\.6/.test(nt),"…cites Comprehensive Rules 5.6");
click($("mx"));await wait(40);
// a non-location must NOT get the wide treatment
await q("Flounder - Voice of Reason");
click(tile("Flounder - Voice of Reason").querySelector("[data-i]"));await wait(60);
ok(!$("modal").classList.contains("loc"),"a normal card keeps the standard modal");
ok(D.querySelector(".locnote")===null,"…and no location reminder");
click($("mx"));

console.log("\n=== 4. SHIFT TARGETS GREY OUT AGAINST THE INK FILTER ===");
click($("clr"));await wait(60);
// need a shifter whose same-name family is NOT all one ink, so a single ink chip splits them
const fam=n=>DATA.cards.filter(x=>x.n===n&&x.ty==="Character");
const shiftCard=DATA.cards.find(c=>(c.kw||[]).some(k=>/shift/i.test(k[0]||""))&&c.co.length===1&&
  fam(c.n).length>2&&fam(c.n).some(x=>!x.co.every(i=>c.co.includes(i))));
const sName=shiftCard.n+" - "+shiftCard.v, myInk=shiftCard.co[0];
const openShift=async()=>{await q(sName);
  click(tile(sName).querySelector("[data-sh]"));await wait(60);
  return [...D.querySelectorAll("#modal .mcard")]};
await q(sName);
click(tile(sName).querySelector("img")||tile(sName).querySelector(".ph"));await wait(60);
const before=(await openShift()).filter(m=>m.classList.contains("illegal")).length;
click($("mx"));await wait(40);
click(D.querySelector(`[data-ink="${myInk}"]`));await wait(60);
const after=await openShift();
const greyed=after.filter(m=>m.classList.contains("illegal"));
ok(after.length>0,`${sName}: shift sub-screen lists ${after.length} target(s)`);
ok(greyed.length>before,`filtering to ${myInk} greys out ${greyed.length} of them (was ${before})`);
ok(/NOT LEGAL INK PAIR/.test($("modal").textContent),"…labelled NOT LEGAL INK PAIR");
ok(greyed.every(m=>!m.querySelector("[data-add]")),"…and greyed cards can't be added");
ok(after.length-greyed.length>0,"…while on-ink targets stay addable");
click($("mx"));click($("clr"));await wait(60);

console.log("\n=== 5. GUIDED: SKIP + RENAMED BUTTON ===");
click($("mGuided"));await wait(80);
$("gq").value="dumbo";$("gq").dispatchEvent(new W.Event("input",{bubbles:true}));await wait(60);
click(D.querySelector("#cg [data-c]"));await wait(80);
click(D.querySelector(".pair[class*='rec-']"));await wait(80);
click($("gcskip"));await wait(80);   // v6: copies step now sits between inks and staples
ok(!!$("gy")&&/Add all/.test($("gy").textContent),"'Add all N staples'");
ok(!!$("gn")&&/See the staples/.test($("gn").textContent),"renamed to 'See the staples'");
ok(!!$("gskip")&&/Skip for now/.test($("gskip").textContent),"new 'Skip for now'");
click($("gskip"));await wait(80);
ok(/Skipped/.test(D.getElementById("guide").textContent),"skipping is acknowledged");
ok(!!$("gdone"),"…and it still unlocks the final step");

console.log("\n=== 6. RECOMMENDED SYNERGIES ON BY DEFAULT ===");
ok($("gr").classList.contains("go"),"Recommended is already active without clicking");
ok(/On automatically/.test(D.getElementById("guide").textContent),"…and says why");
click($("mManual"));await wait(80);
const recChips=[...D.querySelectorAll("#groups .chip.rec")];
ok(recChips.length>0,"chips are highlighted in Search without any extra click: "+
   recChips.map(c=>c.querySelector("span").textContent).join(", "));
click($("mGuided"));await wait(60);
click($("gm"));await wait(60);
ok($("gm").classList.contains("go"),"Manual still overrides it");
click($("mManual"));await wait(60);
ok(D.querySelectorAll("#groups .chip.rec").length===0,"…and clears the highlighting");

console.log("\n=== 7. TYPED WORDS BECOME REMOVABLE PILLS ===");
click($("clr"));await wait(60);
const n1=await enter("animal");
ok($("q").value==="","typing 'animal' + Enter clears the input");
ok(D.querySelectorAll(".pill").length===1,"…and leaves one pill");
ok(/animal/.test(D.querySelector(".pill").textContent),"…showing the word");
ok(n1>0&&n1<total,`…filtering to ${n1} cards`);
const n2=await enter("cat");
ok(D.querySelectorAll(".pill").length===2,"a second word adds a second pill");
ok(n2<n1,`…and narrows further (${n1} → ${n2}), so terms AND together`);
click([...D.querySelectorAll(".pill .x")].pop());await wait(80);
ok(D.querySelectorAll(".pill").length===1,"clicking × removes just that word");
ok(N()===n1,`…restoring the previous result count (${N()})`);
click(D.querySelector(".pill .x"));await wait(80);
ok(D.querySelectorAll(".pill").length===0&&N()===total,"removing the last one clears the search");
await enter("Princess");
ok(D.querySelectorAll(".pill").length===1&&N()<total,"known words still become proper tokens, not text");
click($("clr"));await wait(40);
ok(N()===total&&D.querySelectorAll(".pill").length===0,"Clear all wipes typed terms too");

console.log(`\n${fail?"❌":"✅"} ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
})().catch(e=>{console.error("CRASH:",e);process.exit(1)});
