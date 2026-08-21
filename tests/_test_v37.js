/* v37 — the seven fixes.

   Three of these are regressions with a shared shape: a thing that was already
   written correctly, but that ran at a moment when the value it branched on
   wasn't set yet. The Search tab is the worst of them — bindGrid() has had
   `if(TAB==="tSearch") return` in it the whole time, and the tab was still
   putting cards in your deck, because the grid was built and wired before
   showTab() restored TAB from storage. Tests that call showTab() first would
   never have caught it, so the ones here reload the page into the tab and then
   click, the way a person arrives. */
const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const SRC=require("fs").readFileSync(_W.FILE,"utf8");
const F=_W.URL;
const deckSize=p=>p.evaluate(()=>{const d=JSON.parse(localStorage.getItem("fs3_decks")||"{}");
  if(!d.list||!d.list[d.cur])return 0;
  return Object.values(d.list[d.cur].cards||{}).reduce((a,b)=>a+b,0)});
const clickArt=(p,i)=>p.evaluate(i=>{const c=document.querySelectorAll("#grid .c")[i];
  (c.querySelector("img")||c.querySelector(".ph")).click()},i);
const shut=p=>p.evaluate(()=>{const x=document.getElementById("mx");if(x)x.click()});
/* Turn a chip on and read what came back. */
const chip=async(p,id)=>{
  await p.evaluate(i=>document.querySelector(`[data-a="${i}"]`).click(),id);
  await p.waitForTimeout(700);
  const r=await p.evaluate(()=>({n:+document.getElementById("ct").textContent.replace(/[^\d]/g,""),
    names:[...document.querySelectorAll("#grid .c")].map(x=>x.dataset.f)}));
  await p.evaluate(i=>document.querySelector(`[data-a="${i}"]`).click(),id);
  await p.waitForTimeout(400);
  return r};

(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1900);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== CONTRIBUTIONS GO TO THE RIGHT INBOX ===");
ok(SRC.includes("lorcana707@gmail.com"),"the contribute page names lorcana707@gmail.com");
ok(!/mailto:benjamindacy@gmail\.com/.test(SRC),
   "…and Ben's personal address is no longer the one strangers are told to mail");

console.log("\n=== THE DISCLAIMER IS OFF THE PRINTOUT ===");
/* This started as "hide the footer when printing". The footer has since been
   removed altogether and the disclaimer moved to Settings, so the printout is
   clean by construction — what's checked now is that it really is absent from
   the page, and that the notice itself survived the move rather than being
   quietly dropped. It is a Community Code condition, not decoration. */
ok(await p.evaluate(()=>!document.querySelector(".foot")),
   "no footer under the pull sheet, because there is no footer anywhere");
ok(await p.evaluate(()=>{
    const css=[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules]}catch(e){return []}});
    return css.some(r=>r.conditionText&&r.conditionText.includes("print")
      &&/\.legal\{display:none/.test(r.cssText.replace(/\s/g,"")))}),
   "…and a print rule keeps the Settings block off paper too");
await p.evaluate(()=>{localStorage.setItem("fs3_tab",JSON.stringify("tOther"));
  localStorage.setItem("fs3_opage",JSON.stringify("pref"))});
await p.reload();await p.waitForTimeout(1900);
/* Whitespace-normalised before matching: the sentence wraps across two source
   lines, so textContent holds "endorsed or\n        approved" and a regex with
   a literal space misses it. (innerText would collapse it, but that depends on
   the element being laid out, which it isn't on a hidden tab.) */
ok(await p.evaluate(()=>{const l=document.querySelector(".legal");
    return !!l&&/not published, endorsed or approved/i
      .test(l.textContent.replace(/\s+/g," "))}),
   "…while the site still carries the notice, in Settings");
await p.evaluate(()=>{localStorage.setItem("fs3_opage",JSON.stringify(""))});

console.log("\n=== SEARCH FOR CARDS IS READ-ONLY ===");
console.log("--- arriving directly, which is where it broke ---");
await p.evaluate(()=>{localStorage.setItem("fs3_tab",JSON.stringify("tSearch"));
  localStorage.removeItem("fs3_decks")});
await p.reload();await p.waitForTimeout(1900);
for(let i=0;i<5;i++){await clickArt(p,i);await p.waitForTimeout(220);await shut(p);await p.waitForTimeout(120)}
ok(await deckSize(p)===0,"five clicks on five cards put nothing in the deck");
ok(await p.evaluate(()=>document.querySelectorAll("#grid [data-plus],#grid [data-minus],#grid [data-sh]").length)===0,
   "…and there is no stepper or shift button on any tile to press by accident");
ok(await p.evaluate(()=>!document.getElementById("ma")&&!document.getElementById("mr")),
   "…nor + / − inside the card window");

console.log("--- and switching into it from the deck builder ---");
await p.evaluate(()=>localStorage.setItem("fs3_tab",JSON.stringify("tDeck")));
await p.reload();await p.waitForTimeout(1900);
await p.click("#tSearch");await p.waitForTimeout(800);
for(let i=0;i<4;i++){await clickArt(p,i);await p.waitForTimeout(220);await shut(p);await p.waitForTimeout(120)}
ok(await deckSize(p)===0,
   "crossing over from the builder doesn't leave the old click-to-add handlers live");

console.log("--- while the deck builder still builds decks ---");
await p.click("#tDeck");await p.waitForTimeout(800);
await clickArt(p,0);await p.waitForTimeout(500);
ok(await deckSize(p)===1,"one click on the Deck tab adds one card");

console.log("\n=== LOCATION SYNERGY, NOT LOCATION REMOVAL ===");
await p.evaluate(()=>localStorage.setItem("fs3_tab",JSON.stringify("tSearch")));
await p.reload();await p.waitForTimeout(1900);
const syn=await chip(p,"locsyn");
ok(syn.n>60&&syn.n<130,`${syn.n} cards benefit locations`);
for(const want of ["Jim Hawkins - Space Traveler","Fix-It Felix, Jr. - Niceland Steward",
                   "Wildcat's Wrench","Elsa - Concerned Sister","Map of Treasure Planet"])
  ok(syn.names.includes(want),`  includes ${want}`);
/* The whole point of splitting this out of text:location. */
for(const no of ["Battering Ram","Launchpad - Exceptional Pilot","RLS Legacy's Cannon",
                 "Retrosphere","Simba - Son of Mufasa"])
  ok(!syn.names.includes(no),`  and NOT ${no}`);
ok(syn.names.includes("Pride Lands - Jungle Oasis"),
   "  a location that banishes ITSELF for value is a payoff, not hate");

console.log("\n=== LOCATION REMOVAL ===");
const lh=await chip(p,"lochate");
ok(lh.n>15&&lh.n<45,`${lh.n} cards attack a location`);
for(const want of ["Battering Ram","Launchpad - Exceptional Pilot","RLS Legacy's Cannon",
                   "Maui - Stubborn Trickster","Goldie O'Gilt - Cunning Prospector"])
  ok(lh.names.includes(want),`  includes ${want}`);
ok(!lh.names.includes("Pride Lands - Jungle Oasis"),
   "  and not the location that banishes itself");
ok(!lh.names.includes("Fix-It Felix, Jr. - Niceland Steward"),
   "  nor anything that only buffs your own");

console.log("\n=== ITEM REMOVAL ===");
const ih=await chip(p,"itemhate");
ok(ih.n>25&&ih.n<55,`${ih.n} cards attack an item`);
for(const want of ["Wildcat - Mechanic","Beast - Hardheaded","Figaro - Tuxedo Cat",
                   "Roquefort - Lock Expert","Edna Mode - Fashion Designer"])
  ok(ih.names.includes(want),`  includes ${want}`);
/* Eight cards eat their OWN item for value. They are ramp, not removal. */
for(const no of ["Maurice - Unconventional Inventor","Gaston - Arrogant Showoff",
                 "Belle - Apprentice Inventor","Monsieur D'Arque - Despicable Proprietor",
                 "Hiram Flaversham - Toymaker"])
  ok(!ih.names.includes(no),`  and NOT ${no} — that sacrifices its own`);

console.log("\n=== PINGS ===");
const pg=await chip(p,"ping");
ok(pg.n>30&&pg.n<95,`${pg.n} cards deal exactly one`);
ok(pg.names.includes("Robin's Bow"),"  includes Robin's Bow");
ok(!pg.names.includes("Be Prepared"),"  and not a board wipe");
ok(!pg.names.includes("RLS Legacy's Cannon"),"  nor a 2-damage shot");

console.log("\n=== LILO & STITCH + ALIENS ===");
const li=await chip(p,"lilo");
ok(li.n>60,`${li.n} cards`);
ok(li.names.some(n=>/^Lilo /.test(n)),"  the film's cast is in");
ok(li.names.some(n=>/Experiment \d/.test(n)),"  so are the Experiments");
ok(li.names.every(n=>n!=="Elsa - Snow Queen"),"  and nothing unrelated wandered in");

console.log("\n=== THE PLAIN-ENGLISH ROUTES BEN ASKED FOR ===");
/* Driven through the box rather than by calling chipFor(), which lives inside
   the IIFE — and because typing the words and pressing Enter is the thing
   being claimed. */
for(const [w,id] of [["location synergy","locsyn"],["location nerfs","lochate"],
                     ["item nerfs","itemhate"],["pings damage","ping"],["aliens","lilo"]]){
  await p.evaluate(()=>{const q=document.getElementById("q");q.value="";
    q.dispatchEvent(new Event("input",{bubbles:true}))});
  await p.click("#q");await p.type("#q",w,{delay:8});await p.waitForTimeout(350);
  await p.keyboard.press("Enter");await p.waitForTimeout(700);
  const on=await p.evaluate(i=>document.querySelector(`[data-a="${i}"]`).classList.contains("on"),id);
  ok(on,`typing "${w}" and pressing Enter turns on the ${id} chip`);
  if(on){await p.evaluate(i=>document.querySelector(`[data-a="${i}"]`).click(),id);
    await p.waitForTimeout(300)}
}

console.log("\n=== THE DECK YOU'RE EDITING LOOKS LIKE IT ===");
await p.evaluate(()=>{localStorage.setItem("fs3_tab",JSON.stringify("tDecks"));
  localStorage.setItem("fs3_decks",JSON.stringify({cur:"Second",
    list:{First:{fmt:"core",cards:{}},Second:{fmt:"core",cards:{}}}}))});
await p.reload();await p.waitForTimeout(1900);
const dk=await p.evaluate(()=>[...document.querySelectorAll(".dkcard")].map(x=>({
  on:x.classList.contains("on"),
  cur:x.getAttribute("aria-current"),
  badge:!!x.querySelector(".dkcur"),
  left:getComputedStyle(x).borderLeftColor,
  bg:getComputedStyle(x).backgroundColor})));
ok(dk.filter(d=>d.on).length===1,"exactly one deck is marked current");
ok(dk[1].on&&dk[1].badge,"…it's the one you're editing, and it says so in words");
ok(dk[1].cur==="true",'…and carries aria-current, so a screen reader hears it too');
ok(dk[0].left!==dk[1].left,`…with a different left rail (${dk[0].left} vs ${dk[1].left})`);
ok(dk[0].bg!==dk[1].bg,"…and a lifted plate, so it reads without relying on colour alone");
console.log("--- and the marker follows the click ---");
await p.evaluate(()=>document.querySelector('[data-dk="First"]').click());
await p.waitForTimeout(700);
ok(await p.evaluate(()=>{const c=[...document.querySelectorAll(".dkcard")];
  return c[0].classList.contains("on")&&!c[1].classList.contains("on")}),
   "picking the other deck moves the highlight");

ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);
console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
