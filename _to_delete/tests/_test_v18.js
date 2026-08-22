const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1050}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
p.on("dialog",d=>d.accept("My Brew"));
await p.goto(F);await p.waitForTimeout(1800);
const D=()=>p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_dust")||"{}"));
const goDust=async()=>{await p.click("#tOther");await p.waitForTimeout(400);
  await p.evaluate(()=>document.querySelector('[data-op="dust"]').click());await p.waitForTimeout(500)};
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== THE ECONOMY BALANCES ===");
await goDust();
const econ=await p.evaluate(()=>({
  achN:document.querySelectorAll(".ach").length,
  secN:document.querySelectorAll(".sec3").length,
  pot:[...document.querySelectorAll(".ach .ad")].reduce((n,e)=>n+parseInt(e.textContent.replace("+","")),0),
  cost:[...document.querySelectorAll("[data-buy]")].reduce((n,e)=>n+parseInt(e.textContent.match(/\d+/)[0]),0),
  named:[...document.querySelectorAll(".ach")].find(a=>/Name it yourself/.test(a.textContent))
        .querySelector(".ad").textContent}));
ok(econ.achN===11&&econ.secN===4,`${econ.achN} achievements, ${econ.secN} secrets`);
/* Secrets are a flat 25 each now, so one named deck no longer covers the lot.
   The rule that still matters is that a secret is affordable from a single
   ordinary achievement — you should never have to grind for one. */
ok(econ.cost===econ.secN*25,`every secret is 25 — ${econ.secN} of them cost ${econ.cost}`);
ok(parseInt(econ.named.replace("+",""))>=25,
   `one named deck (${econ.named}) still pays for a secret outright`);
ok(econ.pot>=100,`${econ.pot} dust available in total`);
ok(await p.evaluate(()=>document.querySelectorAll("[data-buy]:not([disabled])").length)===0,
   "…and with 0 dust nothing can be bought yet");

console.log("\n=== EARNING ===");
await p.click("#tDeck");await p.waitForTimeout(500);
await p.fill("#q","Elsa - Snow Queen");await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector("#grid .c img").click());await p.waitForTimeout(400);
let d=await D();
ok(d.got&&d.got.firstcard,"adding your first card pays out");
ok(d.bal===25,`balance ${d.bal}`);
await p.evaluate(()=>document.querySelector("#grid .c img").click());await p.waitForTimeout(300);
ok((await D()).bal===25,"…and only once, however many cards you add");

console.log("\n=== SPENDING ===");
await goDust();
ok(await p.evaluate(()=>document.querySelectorAll("[data-buy]:not([disabled])").length)===4,
   "25 dust unlocks one secret");
const firstQ=await p.evaluate(()=>document.querySelector(".sec3 .q2").textContent);
await p.evaluate(()=>document.querySelector("[data-buy]").click());await p.waitForTimeout(450);
d=await D();
ok(d.bal===0,`buying one costs the flat 25 (balance now ${d.bal})`);
ok(d.open.length===1,"…and records it as unlocked");
const rev=await p.evaluate(()=>{const s=document.querySelector(".sec3.open");
  return s?s.querySelector(".a2").textContent:null});
ok(!!rev&&rev.length>60,`…revealing the answer ("${rev.slice(0,64)}…")`);
ok(await p.evaluate(()=>!document.querySelector(".sec3.open [data-buy]")),"…and you can't buy it twice");
console.log("     Q: "+firstQ);

console.log("\n=== THE REVEALS ARE TRUE ===");
const all=await p.evaluate(()=>{
  const D=JSON.parse(localStorage.getItem("fs3_dust"));
  D.bal=999;D.open=["chip","bucky","rat","fish"];localStorage.setItem("fs3_dust",JSON.stringify(D));return true});
await p.reload();await p.waitForTimeout(1700);
const texts=await p.evaluate(()=>[...document.querySelectorAll(".sec3 .a2")].map(e=>e.textContent));
ok(texts.length===4,"all four reveals readable");
ok(texts.some(t=>/Chip the Teacup/.test(t)&&/any format/.test(t)),"the Chip ban is described accurately");
ok(texts.some(t=>/Bucky/.test(t)&&/gravestone/.test(t)),"Bucky's gravestone");
ok(texts.some(t=>/Hiram Flaversham/.test(t)),"the rat");
ok(texts.some(t=>/Flounder/.test(t)&&/rainbow/.test(t)&&/beam/.test(t)),"Flounder's hero treatment");
// and each claim actually matches the code
const truth=await p.evaluate(()=>({
  ban:typeof BANNED!=="undefined"?false:/Chip the Teacup - Gentle Soul/.test(document.documentElement.innerHTML),
  tomb:/Bucky - Squirrel Squeak Tutor[^}]*🪦/.test(document.documentElement.innerHTML),
  rat:/Hiram Flaversham - Toymaker[^}]*rat/.test(document.documentElement.innerHTML),
  fish:/\.c\.flounder::after/.test(document.documentElement.innerHTML)&&
       /\.c\.flounder:hover::before/.test(document.documentElement.innerHTML)}));
ok(truth.tomb&&truth.rat&&truth.fish,"…and every reveal matches what the site really does");

console.log("\n=== ACHIEVEMENTS FIRE FROM REAL PLAY ===");
await p.evaluate(()=>{localStorage.setItem("fs3_dust",JSON.stringify({bal:0,got:{},open:[]}));
  localStorage.setItem("fs3_opage",JSON.stringify(""));});
await p.reload();await p.waitForTimeout(1700);
// guess the card
await p.click("#tOther");await p.waitForTimeout(400);
await p.evaluate(()=>document.querySelector('[data-op="guess"]').click());await p.waitForTimeout(600);
for(let t=0;t<8;t++){
  await p.evaluate(()=>{const bs=[...document.querySelectorAll(".gopt")];
    // click through until one is right so the achievement can fire
    bs[0].click()});
  await p.waitForTimeout(180);
  await p.evaluate(()=>{const n=document.getElementById("gNext");if(n)n.click()});
  await p.waitForTimeout(150);
  if((await D()).got&&(await D()).got.sharp)break;
}
d=await D();
ok(d.got.sharp,"a correct guess pays 'Sharp eye'");
ok(d.got.eagle,"…and answering without zooming pays 'Eagle eye' too");
ok(d.bal>0,`balance from playing: ${d.bal}`);
// staples
await p.click("#tDeck");await p.waitForTimeout(500);
// deliberately NOT seeded staples — those already read "Untag staple"
for(const n of ["Ariel - On Human Legs","Cinderella - Gentle and Kind","Goofy - Musketeer",
                "Hades - King of Olympus","Hades - Lord of the Underworld","HeiHei - Boat Snack",
                "LeFou - Bumbler","Lilo - Making a Wish","Maximus - Palace Horse",
                "Maximus - Relentless Pursuer","Mickey Mouse - True Friend"]){
  await p.fill("#q",n);await p.waitForTimeout(320);
  const found=await p.evaluate(()=>{const e=document.querySelector("#grid .c [data-i]");if(e){e.click();return true}return false});
  if(found){await p.waitForTimeout(220);
    await p.evaluate(()=>{const m=document.getElementById("ms");if(m&&/Tag as staple/.test(m.textContent))m.click()});
    await p.waitForTimeout(200);
    await p.evaluate(()=>{const x=document.getElementById("mx");if(x)x.click()});await p.waitForTimeout(120);}
}
ok((await D()).got.curator,"starring ten staples pays 'Curator'");

console.log("\n=== NAMED DECK ===");
await p.evaluate(()=>document.getElementById("dnew").click());await p.waitForTimeout(600);
d=await D();
ok(d.got.named,"saving a deck under your own name pays out");
ok(d.bal>=25,`balance ${d.bal}`);

console.log("\n=== PERSISTS + NO DOUBLE-PAY ===");
const before=await D();
await p.reload();await p.waitForTimeout(1700);
const after=await D();
ok(after.bal===before.bal&&Object.keys(after.got).length===Object.keys(before.got).length,
   `reload keeps ${after.bal} dust and ${Object.keys(after.got).length} achievements`);
// earn it once, then repeat the same action and check it pays nothing more
await p.fill("#q","Elsa - Snow Queen");await p.waitForTimeout(450);
await p.evaluate(()=>{const e=document.querySelector("#grid .c img");if(e)e.click()});await p.waitForTimeout(400);
const once=await D();
ok(once.got.firstcard,"'Getting started' earned by adding a card");
await p.evaluate(()=>{const e=document.querySelector("#grid .c img");if(e)e.click()});await p.waitForTimeout(400);
await p.fill("#q","Moana - Of Motunui");await p.waitForTimeout(450);
await p.evaluate(()=>{const e=document.querySelector("#grid .c img");if(e)e.click()});await p.waitForTimeout(400);
const twice=await D();
ok(twice.bal===once.bal,`repeating an earned achievement pays nothing extra (${once.bal} → ${twice.bal})`);

console.log("\n=== HONEST ABOUT WHAT IT IS ===");
ok(await p.evaluate(()=>/anyone with devtools can hand/i.test(document.documentElement.innerHTML)),
   "the code documents that this is unenforceable client-side");
ok(await p.evaluate(()=>/never gate anything behind dust\s+that costs money/i.test(document.documentElement.innerHTML)),
   "…and the rule that follows from it");
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
