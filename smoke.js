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
const F=(()=>{let d=__dirname;for(let i=0;i<3;i++){
  const p=path.join(d,"flounder-search.html");
  if(fs.existsSync(p))return p;d=path.dirname(d)}
  throw new Error("No build. Run: python3 build_flounder.py")})();

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
ok(await p.isVisible("#tourbg"),"welcome tour appears on a first visit");
await p.click('[data-tour="end"]');await p.waitForTimeout(300);
ok(await p.evaluate(()=>document.querySelectorAll("#grid .c").length>0),"cards render");

/* Every tab and every Other page, looking only for a crash. */
for(const t of ["tDeck","tSearch","tColl","tDecks","tOther"]){
  await p.click("#"+t);await p.waitForTimeout(450);
  ok(await p.evaluate(t=>document.querySelector("main .view.on")!==null,t),t+" opens");
}
for(const op of ["dust","read","contrib","pref","mick","guess","aqua","quiz:ability","hex","cred","lore"]){
  await p.evaluate(o=>{localStorage.setItem("fs3_tab",JSON.stringify("tOther"));
    localStorage.setItem("fs3_opage",JSON.stringify(o))},op);
  await p.reload();await p.waitForTimeout(700);
}
ok(errs.length===0,`every page opens without a JS error${errs.length?" — "+errs[0]:""}`);

/* The lore tracker is the one screen used with somebody waiting, and it is a
   fixed full-screen takeover — so the two things worth gating are that it comes
   up at all, and that pressing JUDGE actually locks the score. The lock is also
   the cheapest possible proof that the judge panel rendered and wired itself. */
{
  await p.evaluate(()=>{localStorage.setItem("fs3_tab",JSON.stringify("tOther"));
    localStorage.setItem("fs3_opage",JSON.stringify("lore"))});
  await p.reload();await p.waitForTimeout(900);
  ok(await p.evaluate(()=>!!document.querySelector(".lorewrap")),"lore tracker opens");
  await p.click('[data-plus="1"]');await p.waitForTimeout(200);
  const before=await p.textContent("#ln1");
  await p.click("#loreJudge");await p.waitForTimeout(500);
  const locked=await p.evaluate(()=>!!document.querySelector(".jpanel")
    &&document.querySelector('[data-plus="1"]').disabled);
  ok(locked,"JUDGE opens the panel and locks the score");
  /* The header sits OUTSIDE main, which is z-index 1 — so a full-screen panel
     inside main can never out-stack it by number. If this fails, the whole
     tracker is sitting underneath the site chrome again. */
  const top=await p.evaluate(()=>{const j=document.getElementById("jclose").getBoundingClientRect();
    const e=document.elementFromPoint(j.left+5,j.top+5);return e&&e.id});
  ok(top==="jclose","the judge panel is on top of the site chrome");
  await p.evaluate(()=>{localStorage.setItem("fs3_opage",JSON.stringify(""))});
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
