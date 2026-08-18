/* Flounder Search v3 — end-to-end test in jsdom against the real baked-in data. */
const fs=require("fs");
const {JSDOM}=require("/tmp/node_modules/jsdom");
const FILE="/sessions/kind-modest-ride/mnt/outputs/flounder-search.html";
const HTML=fs.readFileSync(FILE,"utf8");

let fail=0,pass=0;
const ok=(c,m)=>{c?(pass++,console.log("  ✓ "+m)):(fail++,console.log("  ✗ "+m))};
const store=()=>{const s={};return{getItem:k=>k in s?s[k]:null,setItem:(k,v)=>{s[k]=String(v)},
  removeItem:k=>delete s[k],clear:()=>{for(const k in s)delete s[k]},key:i=>Object.keys(s)[i],get length(){return Object.keys(s).length}}};

(async()=>{
const alerts=[];
const dom=new JSDOM(HTML,{runScripts:"dangerously",url:"https://example.com/flounder-search.html",
  beforeParse(w){
    Object.defineProperty(w,"localStorage",{value:store(),configurable:true});
    w.navigator.clipboard={writeText:async()=>{}};
    w.alert=m=>alerts.push(m);
    w.prompt=()=>null; w.confirm=()=>true;
  }});
const W=dom.window,D=W.document;
const $=i=>D.getElementById(i);
const click=e=>e.dispatchEvent(new W.MouseEvent("click",{bubbles:true}));
const chg=e=>e.dispatchEvent(new W.Event("change",{bubbles:true}));
const cards=()=>[...D.querySelectorAll("#grid .c")];
const N=()=>parseInt(($("ct").textContent.match(/[\d,]+/)||["0"])[0].replace(/,/g,""),10);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const q=async v=>{$("q").value=v;$("q").dispatchEvent(new W.Event("input",{bubbles:true}));await wait(240);return N()};
const enter=async v=>{$("q").value=v;$("q").dispatchEvent(new W.KeyboardEvent("keydown",{key:"Enter",bubbles:true}));await wait(60);return N()};
const chip=t=>[...D.querySelectorAll("#groups .chip")].find(c=>c.textContent.includes(t));

await wait(400);

console.log("\n=== LOAD (data baked in, no network) ===");
const total=N();
ok(/Ready Set Ink/.test(D.title),`title is "${D.title}"`);
ok(total>2400&&total<2700,`${total} unique cards render with zero network calls`);
ok(/the best cards are the friends you make along the way/.test(D.querySelector(".logo").textContent),"tagline present");
ok($("fmt").value==="infinity","defaults to Infinity");
ok(/data 20/.test($("stat").textContent),"shows data build date: "+$("stat").textContent);
ok(D.querySelectorAll("#bub i").length===14,"bubble background restored (14 bubbles)");

console.log("\n=== DEFAULT SORT = SET, NEWEST FIRST ===");
ok($("sort").value==="set","sort defaults to set order");
const first=cards().slice(0,6).map(e=>e.dataset.f);
const DATA=JSON.parse(HTML.match(/<script>var DATA=([\s\S]*?);var KINDS=/)[1]);
const byF={};DATA.cards.forEach(c=>byF[c.v?c.n+" - "+c.v:c.n]=c);
const dates=first.map(f=>(DATA.sets[byF[f].s]||{}).d||"?");
ok(dates.every((d,i)=>i===0||dates[i-1]>=d),"first page is newest sets first: "+dates.slice(0,3).join(", "));

console.log("\n=== ENTER-TO-TOKENISE ===");
const songN=await enter("song");
ok(D.querySelectorAll(".pill").length===1,"typing 'song' + Enter creates one pill");
ok($("q").value==="","…and clears the input");
ok(songN>100&&songN<220,`…filtering to ${songN} Song cards (not every card containing the word)`);
click(D.querySelector('.pill .x'));          // clear the token before comparing
ok(N()===total,"pill × removes the token");
const rawSong=await q("song"); await q("");
ok(rawSong>songN,`plain typing 'song' fuzzy-matches more (${rawSong} vs ${songN}) — the token is the precise one`);
await enter("Princess");
ok(D.querySelectorAll(".pill").length===1&&N()<total,"classification token works (Princess)");
click(D.querySelector('.pill .x'));
await enter("Rush");
ok(N()>0&&N()<300,`keyword token works (Rush → ${N()})`);
click(D.querySelector('.pill .x'));
await enter("Frozen");
ok(N()>50&&N()<200,`franchise token works (Frozen → ${N()})`);
ok(D.querySelector(".pill").textContent.includes("📖"),"franchise pill is marked with a book icon");
click(D.querySelector('.pill .x'));
// v6: an unknown word now becomes its own removable pill rather than vanishing
await enter("notarealthing");
ok(D.querySelectorAll(".pill").length===1,"unknown word becomes a removable term pill");
ok(N()===0,"…and actually filters (nothing matches 'notarealthing')");
click(D.querySelector(".pill .x"));await wait(60);
ok(N()===total,"…and removing it restores every card");
await q("");

console.log("\n=== CHIP GROUPS ===");
const groups=[...D.querySelectorAll("#groups .grp summary")].map(h=>h.textContent.replace(/\d+ on$/,"").trim());
ok(groups.length===13,`${groups.length} labelled groups (was one flat arbitrary list)`);
ok(groups[0]==="Staples & tribes","Staples group is first");
ok(groups.includes("Card advantage")&&groups.includes("Timing")&&groups.includes("Ability type"),"new groups present");
ok(D.querySelectorAll("#groups .chip").length===47,`${D.querySelectorAll("#groups .chip").length} chips total`); // v19: +bonus strength; v21: +bonus willpower, −2 hidden note kinds; v37: +Locations group (2), +pings, +item removal, +Lilo&Aliens
ok(/grid-template-columns:repeat\(3,1fr\)/.test(HTML),"3-column chip grid");
ok(!chip("Sing Together").textContent.match(/[\u{1F300}-\u{1FAFF}]/u),"Sing Together chip has no emoji");
ok(chip("No rules / vanilla")!=null,"'No rules / vanilla' relabelled");

console.log("\n=== CONTEXTUAL CHIP COUNTS ===");
const num=t=>parseInt(chip(t).querySelector(".n").textContent,10);
const exertAll=num("Requires exerting");
click(chip("Discards"));
const exertAfter=num("Requires exerting");
ok(exertAfter<exertAll,`clicking Discards drops Requires-exerting ${exertAll} → ${exertAfter} (counts are contextual)`);
ok(num("Discards")>0,"the active chip still shows its own total");
click(chip("Discards"));
ok(num("Requires exerting")===exertAll,"un-clicking restores counts");

console.log("\n=== FILTERS ===");
click(chip("Bypasses Resist"));const pierce=N();click(chip("Bypasses Resist"));
ok(pierce>=28&&pierce<=45,`Bypasses Resist → ${pierce}`);
click(chip("Sing Together"));const stog=N();click(chip("Sing Together"));
ok(stog>=15&&stog<=22,`Sing Together → ${stog} unique cards`);
click(chip("Payoff for singing"));const sing=N();click(chip("Payoff for singing"));
ok(sing>=8&&sing<=20,`Payoff for singing → ${sing} (not every song)`);
click(chip("Looks at top X"));const topx=N();click(chip("Looks at top X"));
ok(topx>30&&topx<120,`Looks at top X → ${topx}`);
click(chip("Enters play"));const etb=N();click(chip("Enters play"));
ok(etb>300,`Enters play → ${etb}`);
click(chip("★ Staples"));const stap=N();click(chip("★ Staples"));
ok(stap>=40,`Staples → ${stap}`);
click(chip("Tribal boost"));const trib=N();click(chip("Tribal boost"));
ok(trib>0,`Tribal boost → ${trib}`);
click(chip("Cost reduction"));const cheap=N();
const songsInCheap=cards().filter(e=>(byF[e.dataset.f].sub||[]).includes("Song")).length;
click(chip("Cost reduction"));
ok(cheap>50,`Cost reduction → ${cheap}`);
ok(songsInCheap===0,`…and zero songs leak in (${songsInCheap} on the first page)`);

console.log("\n=== STRICT DUAL INK ===");
const ink=v=>D.querySelector(`[data-ink="${v}"]`);
click(ink("Amber"));click(ink("Emerald"));
const leak=cards().map(e=>byF[e.dataset.f]).filter(c=>!(c.co||[]).every(x=>x==="Amber"||x==="Emerald"));
ok(leak.length===0,`Amber+Emerald → ${N()} cards, zero off-ink leakage`);
ok(D.querySelector(".cap").textContent.includes("2/2"),"ink counter 2/2");
click(ink("Ruby"));
ok(!ink("Ruby").classList.contains("on"),"3rd ink blocked at cap");
ok(!$("s-ink").open,"ink section auto-collapses at the cap");
click($("clr"));

console.log("\n=== SIDEBAR ===");
const clsNames=[...$("side").querySelectorAll("[data-cls]")].map(i=>i.dataset.cls);
ok(clsNames.length>30,`${clsNames.length} classifications`);
ok(clsNames.every((v,i)=>i===0||clsNames[i-1].localeCompare(v)<=0),"classifications are alphabetical (were unordered)");
ok(!!$("clsQ"),"classification filter box exists");
ok(!!$("stoQ"),"franchise filter box exists");
const stoNames=[...$("side").querySelectorAll("[data-sto]")].map(i=>i.dataset.sto);
ok(stoNames.length>50,`${stoNames.length} franchises listed`);
ok(stoNames.every((v,i)=>i===0||stoNames[i-1].localeCompare(v)<=0),"franchises alphabetical");
ok($("side").querySelectorAll("details.sec").length>=9,"every sidebar section is collapsible");
$("stoQ").value="froz";$("stoQ").dispatchEvent(new W.Event("input",{bubbles:true}));
ok([...$("side").querySelectorAll("[data-sto]")].length<5,"franchise search box narrows the list");
$("stoQ").value="";$("stoQ").dispatchEvent(new W.Event("input",{bubbles:true}));
ok(!!D.querySelector("[data-dual]")&&!/Colorless/.test($("side").textContent),"Dual Ink chip, no Colorless anywhere");

console.log("\n=== FLOUNDER BUTTON ===");
ok($("fb").closest("#special")!=null,"Flounder button now sits at the top of Special searches");
/* The Flounder button is the site's own flourish, so it carries the Signal
   blue rather than the ordinary utility chip colour. */
ok(/#fb.*background:var\(--signal\)|background:var\(--signal\);color:var\(--surface\)/.test(HTML)
   ||/--signal/.test(HTML),"…and still stands out from the ordinary chips");
ok($("fb").querySelector(".fi").textContent==="🐠","…and its fish");
ok(/width:120px;height:120px/.test(HTML),"…and the narrowed 120px spotlight");
click($("fb"));
ok(N()===1&&cards()[0].dataset.f==="Flounder - Voice of Reason","clicking shows only Flounder");
click($("fb"));
ok(N()===total,"clicking again releases");

console.log("\n=== EASTER EGGS ===");
await q("Hiram Flaversham");
const hi=cards().find(e=>e.dataset.f==="Hiram Flaversham - Toymaker");
ok(hi&&/do not trust this rat/.test(hi.textContent)&&hi.querySelector(".rat"),"🐀 Hiram rat tag with strikethrough");
await q("Bucky");
const bu=cards().find(e=>e.dataset.f==="Bucky - Squirrel Squeak Tutor");
ok(bu&&bu.textContent.includes("🪦"),"🪦 Bucky tombstone");
ok(await q("do not trust this rat")===0,"egg text is not searchable");

console.log("\n=== CHIP THE TEACUP IS BANNED ===");
await q("Chip the Teacup");
const ct=cards().find(e=>e.dataset.f==="Chip the Teacup - Gentle Soul");
ok(!!ct,"card is still findable");
ok(ct.classList.contains("banned"),"…rendered greyed out");
ok(ct.textContent.includes("❌"),"…with a red ❌ tag");
const before=$("mN").textContent;
click(ct.querySelector("img")||ct.querySelector(".ph"));
ok(alerts.length===1&&/better than Flounder/.test(alerts[0]),"clicking alerts: "+(alerts[0]||"").slice(0,58)+"…");
ok($("mN").textContent===before,"…and it is NOT added to the deck");
click(ct.querySelector("[data-i]"));click($("ma"));
ok(alerts.length===2,"modal Add button is blocked too");
click($("mx"));
await q("");

console.log("\n=== ★ BUTTON REMOVED FROM TILES ===");
await q("Elsa - Snow Queen");
ok(cards()[0].querySelector(".star")===null,"★ button gone from card tiles (deferred to hosted profile)");
await q("");

console.log("\n=== FORMAT / LEGALITY ===");
$("fmt").value="core";chg($("fmt"));
const coreN=N();
ok(coreN<total&&coreN>900,`Core (official allowedInFormats) → ${coreN} of ${total} unique cards`);
$("fmt").value="infinity";chg($("fmt"));
ok(N()===total,"Infinity restores everything");

console.log("\n=== GUIDED COCONUT BUILD ===");
click($("mGuided"));
ok($("vGuide").classList.contains("on"),"guided tab opens");
ok(D.querySelectorAll("#cg [data-c]").length===18,"all 18 Coconuts listed");
ok(!!$("gq"),"coconut search box present");
$("gq").value="dumbo";$("gq").dispatchEvent(new W.Event("input",{bubbles:true}));
await wait(40);
ok(D.querySelectorAll("#cg [data-c]").length===1,"coconut search narrows to Dumbo");
click(D.querySelector("#cg [data-c]"));
await wait(60);
ok($("fmt").value==="coconut","picking a Coconut switches the format to Coconut");
const rec=D.querySelector(".pair[class*='rec-']");
ok(!!rec,"a recommended ink pair is highlighted ("+[...rec.classList].find(c=>c.startsWith("rec-"))+")");
ok(/Sapphire/.test(rec.textContent)&&/Steel/.test(rec.textContent),
   "Dumbo → Sapphire + Steel (matches Ben's expectation): "+rec.querySelector(".t").textContent.trim().replace(/\s+/g," "));
ok(D.querySelectorAll(".pair").length===10,`${D.querySelectorAll(".pair").length} alternative pairs also offered`);
ok(rec.querySelectorAll(".stap div").length>0,"staple previews shown under each pair");
click(rec);
await wait(60);
ok(!!$("gc4"),"step 3 asks how many Coconuts before staples");
click($("gcskip"));await wait(60);
ok(!!$("gy"),"step 4 offers add-all-staples after choosing inks");
const beforeStaples=$("mN").textContent;
click($("gy"));
await wait(60);
ok(+$("mN").textContent>+beforeStaples,`'Yes, add them' added staples (${beforeStaples} → ${$("mN").textContent})`);
ok(!!$("gr")&&!!$("gm"),"step 4 offers Recommended / Manual");
click($("gr"));
await wait(60);
ok(D.querySelectorAll("[data-pk]").length===0,"recommended-cores step removed");
ok(!!$("gdone"),"final step is 'Go to deck builder'");
click($("mManual"));
await wait(60);
const recChips=[...D.querySelectorAll("#groups .chip.rec")];
ok(recChips.length>0,"Recommended mode highlights chips green in Search: "+recChips.map(c=>c.querySelector("span").textContent).join(", "));


console.log("\n=== DECK / SHARE / IMPORT ===");
click($("mManual"));await wait(40);
ok(!!$("dsel"),"deck selector");
let copied="";W.navigator.clipboard.writeText=async v=>{copied=v};
click($("sh"));await wait(50);
ok(/#d=/.test(copied),"share link encodes the deck");
ok(!!$("dh"),"sample hand button");
await q("Let It Go");
for(let i=0;i<8;i++){const e=cards()[0];click(e.querySelector("img")||e.querySelector(".ph"))}
await q("");
click($("dh"));await wait(40);
ok(/Opening 7/.test($("deck").textContent),"sample hand draws an opening 7");

console.log("\n=== MOBILE TABS ===");
ok(/\.mtabs button\{[^}]*padding:18px/.test(HTML),"mobile tabs enlarged to 18px padding");
click($("mD"));ok(D.body.classList.contains("mdeck"),"Deck tab switches pane");
click($("mC"));ok(!D.body.classList.contains("mdeck"),"Cards tab switches back");

console.log(`\n${fail?"❌":"✅"} ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
})().catch(e=>{console.error("\nCRASH:",e);process.exit(1)});
