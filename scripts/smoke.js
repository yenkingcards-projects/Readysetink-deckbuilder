/* The only check that runs by default.

   Not a test suite — a ship gate. It answers one question: did I just push a
   white screen? A JS error at boot takes the whole site down for everyone, and
   it is the single failure Ben cannot report back to me, because he'd have
   nothing to look at.

   Everything else — is the button yellow, is the shadow 30px, does the chip
   count say 47 — he can see in two seconds. That is not worth his money.

   ~15 seconds. If it passes, ship. */
const {chromium}=require("/tmp/node_modules/playwright-core");
const fs=require("fs"),path=require("path");
const F=(()=>{const p=path.join(__dirname,"..","public","index.html");
  if(fs.existsSync(p))return p;
  throw new Error("No build. Run: python3 scripts/build_flounder.py")})();

(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
const p=await b.newPage({viewport:{width:1400,height:1000}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
let bad=0;const ok=(c,m)=>{console.log((c?"  ok   ":"  FAIL ")+m);if(!c)bad++};

await p.goto("file://"+F);await p.waitForTimeout(2000);
ok(errs.length===0,`boots clean${errs.length?" — "+errs[0]:""}`);
/* A fresh browser gets the welcome tour, which is a modal over everything —
   so dismissing it IS the first-visit path, and checking it appears at all is
   worth the two lines. Every reload below starts from the same storage, so
   once the flag is set it stays set. */
/* The new deck builder replaced the blocking welcome modal (newbuilder/nb.js wraps startTour so
   only an explicit request opens it). A first visit now shows the home menu plus a one-time hint
   card with "Take the tour" and "Got it". So this checks that flow, then checks the tour itself
   still opens and ends when asked, since the hint and More both lead to it. The home menu is a
   full-screen dialog, so it is skipped before the tab checks below. */
ok(await p.isVisible("#nbHome"),"home menu appears on a first visit");
ok(await p.isVisible(".nbhint")&&!(await p.isVisible("#tourbg")),"first visit shows the hint card, not a blocking tour");
await p.evaluate(()=>document.querySelector('.nbhint [data-t="tour"]').click());await p.waitForTimeout(400);
ok(await p.isVisible("#tourbg"),"Take the tour opens the tour");
await p.click('[data-tour="end"]');await p.waitForTimeout(300);
ok(!(await p.isVisible("#tourbg")),"the tour can be ended");
await p.click("#nbHSkip");await p.waitForTimeout(300);
ok(!(await p.isVisible("#nbHome")),"Skip to the deck builder closes the home menu");
ok(await p.evaluate(()=>document.querySelectorAll("#grid .c").length>0),"cards render");

/* Every tab and every Other page, looking only for a crash. */
/* tMeta was retired — Recommended decks lives in Other now, and is covered by
   the "meta" entry in the Other-page loop below. */
for(const t of ["tDeck","tSearch","tColl","tDecks","tOther"]){
  /* The new deck builder hides the legacy tab strip and drives these same buttons from script
     (the home menu does exactly this), so trigger them the same way. A real click would time
     out on a hidden element without telling us anything about whether the tab works. */
  await p.evaluate(t=>document.getElementById(t).click(),t);await p.waitForTimeout(450);
  ok(await p.evaluate(t=>document.querySelector("main .view.on")!==null,t),t+" opens");
}
for(const op of ["dust","read","contrib","pref","mick","guess","aqua","quiz:ability","hex","cred","lore","meta"]){
  /* Setting the hash and reloading, not goto()-ing to a hash-only-different
     URL — a fragment-only navigation is same-document in Chromium and never
     re-runs the boot script, so BOOTHASH (read once at top level) would stay
     stale and the deep link would silently never apply. */
  await p.evaluate(o=>{location.hash="tab=tOther&op="+o},op);
  await p.reload();await p.waitForTimeout(700);
}
ok(errs.length===0,`every page opens without a JS error${errs.length?" — "+errs[0]:""}`);

/* The lore tracker is the one screen used with somebody waiting, and it is a
   fixed full-screen takeover — so the two things worth gating are that it comes
   up at all, and that pressing JUDGE actually locks the score. The lock is also
   the cheapest possible proof that the judge panel rendered and wired itself. */
{
  await p.evaluate(()=>{location.hash="tab=tOther&op=lore"});
  await p.reload();await p.waitForTimeout(900);
  ok(await p.evaluate(()=>!!document.querySelector(".lorewrap")),"lore tracker opens");
  /* The tracker now opens on a setup screen (players, format, mode, series) and the scoreboard
     appears after "Start match". Player count is chosen there, not with add/remove buttons. */
  const seats=()=>p.evaluate(()=>document.querySelectorAll('[id^="segName"]').length);
  ok(await seats()===2,"setup defaults to two players");
  await p.click('#segN button:text-is("3")');await p.waitForTimeout(150);
  ok(await seats()===3,"a third player can be added in setup");
  await p.click('#segN button:text-is("2")');await p.waitForTimeout(150);
  ok(await seats()===2,"going back to two players leaves exactly two");
  await p.click("#stGo");await p.waitForTimeout(500);
  ok(await p.evaluate(()=>document.querySelectorAll("#loreseats .seatname").length===2),
    "the scoreboard seats exactly two players");
  await p.click('.lorebtn[data-plus="1"]');await p.waitForTimeout(200);
  const before=await p.textContent("#ln1");
  await p.click("#loreJudge");await p.waitForTimeout(500);
  const locked=await p.evaluate(()=>!!document.querySelector(".jpanel")
    &&document.querySelector('.lorebtn[data-plus="1"]').disabled);
  ok(locked,"JUDGE opens the panel and locks the score");
  /* The judge now opens on a chooser (Basic rulings / Advanced). The two-sided card table the
     checks below drive is the Advanced view. */
  await p.evaluate(()=>[...document.querySelectorAll(".jpanel .jhit")].find(b=>/Advanced/.test(b.textContent)).click());
  await p.waitForTimeout(500);
  ok(await p.evaluate(()=>document.querySelectorAll(".jzone").length===2),
    "judge opens on a two-sided card table");
  /* The header sits OUTSIDE main, which is z-index 1 — so a full-screen panel
     inside main can never out-stack it by number. If this fails, the whole
     tracker is sitting underneath the site chrome again. */
  const top=await p.evaluate(()=>{const j=document.getElementById("jclose").getBoundingClientRect();
    const e=document.elementFromPoint(j.left+5,j.top+5);return e&&e.id});
  ok(top==="jclose","the judge panel is on top of the site chrome");
  await p.click('.jzone.you [data-jink="add"]');await p.click('.jzone.you [data-jink="add"]');
  await p.click('.jzone.you [data-jink="exert"]');await p.waitForTimeout(100);
  ok(await p.textContent('.jzone.you .jinkcount').then(x=>x.includes("1 ready / 2 total")),
    "the table records ready and exerted ink");
  await p.click('[data-jadd="you"]');await p.fill("#jq","Ariel");await p.waitForTimeout(350);
  await p.click("[data-jpick]");await p.waitForTimeout(200);
  await p.click("[data-jshift]");await p.fill("#jq","Ariel");await p.waitForTimeout(350);
  await p.click("[data-jpick]");await p.waitForTimeout(200);
  ok(await p.isVisible(".jplaycard.shifted"),"a Shift base stays visibly underneath its top card");
  await p.click('[data-jrole="active"]');await p.fill("#jcaseq","Does this ability trigger?");
  ok(!(await p.isDisabled("[data-jcase]")),"marking an activating card enables the ruling step");
  await p.click("[data-jcase]");await p.waitForTimeout(200);
  ok(await p.textContent("#jbody").then(x=>x.includes("Interaction to review")&&x.includes("Printed card text")
    &&x.includes("1 ready / 2 total")&&x.includes("CR 5.1.1.7")),
    "ink and Shift-stack state carry into the cited ruling view");
  await p.click("[data-jback]");await p.waitForTimeout(150);
  /* "Browse" is now the chooser's Basic rulings option, one level above the Advanced table, so
     step back until the chooser is showing. */
  for(let i=0;i<3&&!(await p.evaluate(()=>[...document.querySelectorAll(".jpanel .jhit")].some(b=>/Basic/.test(b.textContent))));i++){
    await p.click("[data-jback]");await p.waitForTimeout(200)}
  await p.evaluate(()=>[...document.querySelectorAll(".jpanel .jhit")].find(b=>/Basic/.test(b.textContent)).click());
  await p.waitForTimeout(250);
  await p.click('[data-jrule="win"]');await p.waitForTimeout(250);
  ok(await p.textContent("#jbody").then(x=>x.includes("CR 1.8.1.1")),
    "a resolved situation cites the exact Comprehensive Rules section");
  await p.click("[data-jresolved]");await p.waitForTimeout(250);
  ok(await p.evaluate(()=>!document.querySelector(".jpanel")
    &&!document.querySelector('.lorebtn[data-plus="1"]').disabled),
    "Resolved returns to the table and unlocks the score");
  await p.click("#loreJudge");await p.waitForTimeout(250);
  await p.fill("#jq","Ariel");await p.waitForTimeout(350);
  ok(await p.isVisible(".jambig"),"judge explains ambiguous card-name results");
  const rulingQuery=await p.evaluate(()=>{
    const card=DATA.cards.find(c=>(c.ru||[]).length&&c.ru[0].q);
    return card&&card.ru[0].q.split(/\s+/).slice(0,5).join(" ")});
  if(rulingQuery){
    await p.fill("#jq",rulingQuery);await p.waitForTimeout(350);
    ok(await p.textContent("#jbody").then(x=>x.includes("Official ruling matches")),
      "judge searches the text of official rulings");
  }
  /* Close the judge panel (it locks the score), then tap player 2's plus up to 20. A match is a
     series now, so reaching 20 ends the game and raises the result screen, which is why the loop
     stops as soon as it appears instead of tapping past it. */
  await p.click("#jclose");await p.waitForTimeout(250);
  for(let i=0;i<24&&!(await p.isVisible("#vic"));i++){await p.click('.lorebtn[data-plus="1"]');await p.waitForTimeout(60)}
  await p.waitForTimeout(500);
  ok((await p.textContent("#ln1")).trim()==="20","lore stops at exactly 20");
  ok(await p.isVisible("#vic"),"reaching 20 lore ends the game and shows the result");
  /* NOTE: there is no hard cap in the scoring code any more. The win total is per player and
     configurable (loreWinTotalFor), the game ends when it is reached, and the full-screen result
     screen stops further taps. So that is what is asserted above; "cannot exceed 20" is no
     longer a property of loreAdd itself. */
  await p.reload();await p.waitForTimeout(700);
  ok(before==="1","lore counts up");
}

/* Deep links, on a COLD profile. This is the one that shipped broken: it
   worked on a second visit and failed on a first, which is every visit that
   arrives from a search engine or a shared link. */
{
  const ctx=await b.newContext();
  const q=await ctx.newPage();
  await q.goto("file://"+F+"#q=elsa%20snow%20queen");
  await q.waitForTimeout(2200);
  const n=await q.evaluate(()=>document.querySelectorAll("#grid .c").length);
  ok(n>0&&n<200,`a shared search link opens filtered on a first visit (${n} cards)`);
  await ctx.close();
}

/* The data is the product. A build that silently loses cards is the one
   content bug worth catching automatically. */
const n=await p.evaluate(()=>DATA.cards.length);
ok(n>2400,`${n} cards in the build`);

await b.close();
console.log(bad?`\nFAIL — do not ship`:`\nok — ship it`);
process.exit(bad?1:0)})().catch(e=>{console.error("CRASH",e.message);process.exit(1)});
