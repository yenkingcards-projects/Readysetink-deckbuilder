const {chromium}=require("/tmp/node_modules/playwright-core");
const F="file://"+__dirname+"/flounder-search.html";
const SRC2=require("fs").readFileSync(__dirname+"/flounder-search.html","utf8");
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
const alerts=[];p.on("dialog",d=>{alerts.push(d.message());d.accept()});
await p.goto(F);await p.waitForTimeout(1900);
const D=()=>p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_dust")||"{}"));
const go=async op=>{await p.evaluate(o=>{localStorage.setItem("fs3_opage",JSON.stringify(o));
  localStorage.setItem("fs3_tab",JSON.stringify("tOther"))},op);await p.reload();await p.waitForTimeout(1600)};
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== COMMAS ===");
await p.evaluate(()=>{localStorage.setItem("fs3_dust",JSON.stringify(
  {bal:1234567,got:{},open:[],titles:[],hidden:[],wear:"",quiz:[],prestige:false,patron:false,bucky:0}))});
await go("dust");
const bal=await p.evaluate(()=>document.querySelector(".dbal b").textContent);
ok(bal==="1,234,567",`balance reads ${bal}`);
const costs=await p.evaluate(()=>[...document.querySelectorAll("[data-title]")].map(b=>b.textContent.trim()));
ok(costs.some(c=>/1,000,000 dust/.test(c)),`title costs too: ${costs[costs.length-1]}`);

console.log("\n=== PATRON DUST ===");
await p.evaluate(()=>{localStorage.setItem("fs3_dust",JSON.stringify(
  {bal:0,got:{},open:[],titles:[],hidden:[],wear:"",quiz:[],prestige:false,patron:false,bucky:0}))});
await go("dust");
/* Patron dust is built but switched off at PATRON_ON until the money side is
   real — dust is client-side and anyone could mint a "patron" reward. */
ok(!await p.evaluate(()=>!!document.getElementById("dPatron")),
   "no claim button while PATRON_ON is false");
ok(await p.evaluate(()=>{try{return grantPatron()===false}catch(e){return "gone"}})!==true,
   "…and the grant refuses to pay out even if called directly");
let d=await D();
ok(!d.patron&&d.bal===0,"…so nobody can mint patron dust");
ok(/const PATRON_ON=false/.test(SRC2),"…and it's one word to turn back on");

console.log("\n=== PRESTIGE ===");
ok(!await p.evaluate(()=>!!document.querySelector('[data-pr="t_fish"]')),
   "prestige is invisible before you own Flounderborn");
/* Prestige is per-title now and lives on the title's own card as [data-pr],
   not a single #dPrestige button. Fifteen tiers, gates and flair are covered
   in depth by _test_v32; this just proves the entry point exists. */
await p.evaluate(()=>{const x=JSON.parse(localStorage.getItem("fs3_dust"));
  x.titles=["t_fish"];x.bal=1200000;x.pr={};localStorage.setItem("fs3_dust",JSON.stringify(x))});
await go("dust");
ok(await p.evaluate(()=>!!document.querySelector('[data-pr="t_fish"]')),"…appears once you do");
await p.click('[data-pr="t_fish"]');await p.waitForTimeout(600);
d=await D();
ok(d.pr.t_fish===1&&d.bal===200000,`prestiging costs a million (balance ${d.bal.toLocaleString()})`);
ok(await p.evaluate(()=>!!document.querySelector(".tit.pr.p1")),"…and the title takes its flair");

console.log("\n=== BUCKY: PRESS F ===");
await p.evaluate(()=>{localStorage.setItem("fs3_tab",JSON.stringify("tDeck"));
  localStorage.setItem("fs3_opage",JSON.stringify(""));
  const x=JSON.parse(localStorage.getItem("fs3_dust"));x.bal=0;x.bucky=0;
  localStorage.setItem("fs3_dust",JSON.stringify(x))});
await p.reload();await p.waitForTimeout(1600);
await p.fill("#q","Bucky - Squirrel Squeak Tutor");await p.waitForTimeout(600);
await p.evaluate(()=>document.querySelector("#grid .c [data-i]").click());await p.waitForTimeout(500);
ok(await p.evaluate(()=>!!document.getElementById("fbox")),"the box is on Bucky's card");
const payF=async()=>{await p.fill("#fbox","f");await p.press("#fbox","Enter");await p.waitForTimeout(350);
  return (await D()).bal};
const b1=await payF();
ok(b1===500,`first F pays ${b1}`);
const b2=await payF();
ok(b2-b1===50,`second pays ${b2-b1}`);
let last=b2;for(let i=0;i<9;i++)last=await payF();
const b12=await payF();
ok(b12-last===5,`after eleven, it drops to ${b12-last}`);
ok(await p.evaluate(()=>/paid \d+ time/.test(document.querySelector(".rcount").textContent)),
   "…and it counts how many times you've paid respects");
const onOther=await p.evaluate(()=>{document.getElementById("mx").click();return true});
await p.fill("#q","Elsa - Snow Queen");await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector("#grid .c [data-i]").click());await p.waitForTimeout(400);
ok(!await p.evaluate(()=>!!document.getElementById("fbox")),"…and it's only on Bucky");
await p.evaluate(()=>document.getElementById("mx").click());

console.log("\n=== SALT WARNING ===");
alerts.length=0;
await p.fill("#q","Christopher Robin - Hunny Sage");await p.waitForTimeout(600);
await p.evaluate(()=>document.querySelector("#grid .c img").click());await p.waitForTimeout(600);
ok(alerts.some(a=>/SALT WARNING/.test(a)),"adding him fires the salt warning");
ok(alerts.some(a=>/become salty/.test(a)),`…with your wording`);
const n1=await p.evaluate(()=>document.getElementById("mN").textContent);
ok(n1==="1","…and the card still goes in");

console.log("\n=== SEARCH TAB DOESN'T ADD TO DECK ===");
await p.click("#tSearch");await p.waitForTimeout(600);
const before=await p.evaluate(()=>document.getElementById("mN").textContent);
await p.fill("#q","Elsa - Snow Queen");await p.waitForTimeout(600);
await p.evaluate(()=>document.querySelector("#grid .c img").click());await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.getElementById("mN").textContent)===before,
   "clicking a card here does NOT add it");
ok(await p.evaluate(()=>document.getElementById("mbg").classList.contains("on")),
   "…it opens the card instead");
await p.evaluate(()=>document.getElementById("mx").click());await p.waitForTimeout(300);
ok(await p.evaluate(()=>document.querySelectorAll("#grid .c .qty").length===0),
   "…and no +/− steppers appear on this tab");
await p.click("#tDeck");await p.waitForTimeout(500);
await p.fill("#q","Elsa - Snow Queen");await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector("#grid .c img").click());await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.getElementById("mN").textContent)!==before,
   "…but the Deck builder tab still adds normally");

console.log("\n=== DECK-SHAPE EASTER EGGS ===");
// add the exact named card, whatever else the search turns up
const addByName=async f=>{await p.fill("#q",f);await p.waitForTimeout(500);
  const hit=await p.evaluate(n=>{const t=[...document.querySelectorAll("#grid .c")]
      .find(x=>x.dataset.f===n);if(!t)return false;
    (t.querySelector("[data-plus]")||t.querySelector("img")).click();return true},f);
  if(!hit)throw new Error("tile not found: "+f);
  await p.waitForTimeout(500)};
const deckIs=async(cards,last)=>{await p.evaluate(c=>{const dd=JSON.parse(localStorage.getItem("fs3_decks"));
  dd.list[dd.cur].cards=c;localStorage.setItem("fs3_decks",JSON.stringify(dd))},cards);
  await p.reload();await p.waitForTimeout(1400);
  await addByName(last);return D()};
// n distinct core cards, plus the name of the next one to add by hand
const distinct=n=>p.evaluate(k=>{const pool=DATA.cards.filter(x=>x.core).map(x=>x.f);
  const c={};pool.slice(0,k).forEach(f=>c[f]=1);return {c,last:pool[k]}},n);
let s59=await distinct(59);
d=await deckIs(s59.c,s59.last);              // 60 distinct singletons
ok((d.hidden||[]).includes("h_single"),"a 60-card no-repeats deck unlocks Singleton");
ok(!(d.hidden||[]).includes("h_61"),"…without falsely firing One Too Many");
let s60=await distinct(60);
d=await deckIs(s60.c,s60.last);              // 61
ok((d.hidden||[]).includes("h_61"),"61 cards unlocks One Too Many");
const fr=await p.evaluate(()=>{const sto=DATA.cards.find(x=>x.sto&&
    DATA.cards.filter(y=>y.sto===x.sto).length>=11).sto;
  const g=DATA.cards.filter(x=>x.sto===sto).map(x=>x.f);
  const c={};g.slice(0,9).forEach(f=>c[f]=1);return {c,last:g[9]}});
d=await deckIs(fr.c,fr.last);
ok((d.hidden||[]).includes("h_franchise"),"ten from one franchise unlocks One Story Only");

console.log("\n=== 100 FLOUNDER ===");
await p.evaluate(()=>{const dd=JSON.parse(localStorage.getItem("fs3_decks"));
  dd.list[dd.cur].cards={"Flounder - Voice of Reason":99};
  localStorage.setItem("fs3_decks",JSON.stringify(dd));
  const x=JSON.parse(localStorage.getItem("fs3_dust"));x.bal=0;
  x.hidden=(x.hidden||[]).filter(h=>h!=="h_100");localStorage.setItem("fs3_dust",JSON.stringify(x))});
await p.reload();await p.waitForTimeout(1500);
await p.fill("#q","Flounder - Voice of Reason");await p.waitForTimeout(500);
ok(!((await D()).hidden||[]).includes("h_100"),"99 does nothing");
await p.evaluate(()=>document.querySelector("#grid .c [data-plus]").click());await p.waitForTimeout(600);
d=await D();
ok((d.hidden||[]).includes("h_100"),"the 100th unlocks it");
ok(d.bal>=10000000,`…paying ${d.bal.toLocaleString()} dust`);

console.log("\n=== RATIGAN ===");
await p.evaluate(()=>{const x=JSON.parse(localStorage.getItem("fs3_dust"));
  x.hidden=(x.hidden||[]).filter(h=>h!=="h_rat2");localStorage.setItem("fs3_dust",JSON.stringify(x))});
await p.reload();await p.waitForTimeout(1500);
await p.fill("#q","Ratigan");await p.waitForTimeout(600);
await p.evaluate(()=>document.querySelector("#grid .c [data-i]").click());await p.waitForTimeout(500);
ok(!((await D()).hidden||[]).includes("h_rat2"),"opening Ratigan alone isn't enough");
await p.evaluate(()=>document.getElementById("mx").click());await p.waitForTimeout(250);
await p.fill("#q","rat");await p.waitForTimeout(600);
await p.evaluate(()=>{const e=[...document.querySelectorAll("#grid .c")]
  .find(x=>/Ratigan/.test(x.dataset.f));if(e)e.querySelector("[data-i]").click()});
await p.waitForTimeout(600);
ok(((await D()).hidden||[]).includes("h_rat2"),"searching “rat” then opening a Ratigan unlocks it");

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
