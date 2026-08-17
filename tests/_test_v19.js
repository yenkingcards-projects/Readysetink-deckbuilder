const {chromium}=require("/tmp/node_modules/playwright-core");
const F="file:///sessions/kind-modest-ride/mnt/outputs/flounder-search.html";
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1900);
const D=()=>p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_dust")||"{}"));
const openPage=async op=>{await p.evaluate(o=>{
    localStorage.setItem("fs3_opage",JSON.stringify(o));
    localStorage.setItem("fs3_tab",JSON.stringify("tOther"));},op);
  await p.reload();await p.waitForTimeout(1600)};
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== BONUS STRENGTH SEARCH ===");
const pump=await p.evaluate(()=>{
  const strip=t=>(t||"").replace(/\([^)]*\)/g," ");
  const hit=DATA.cards.filter(c=>/\bgets?\s*\+\d+\s*¤/.test(strip(c.ef)));
  const raw=DATA.cards.filter(c=>/\bgets?\s*\+\d+\s*¤/.test(c.ef||""));
  return {n:hit.length,raw:raw.length,
    sisu:hit.some(c=>c.n==="Sisu"&&/Emboldened/.test(c.v||""))};
});
ok(pump.sisu,"Sisu - Emboldened Warrior is in the bonus-strength pool");
ok(pump.n===125,`${pump.n} cards match`);
ok(pump.raw>pump.n,`…and stripping reminder text keeps ${pump.raw-pump.n} Challenger-only cards out`);
for(const word of ["bonus strength","plus power","extra strength","more power","strength boost"]){
  await p.click("#tDeck");await p.waitForTimeout(300);
  await p.evaluate(()=>{const c=document.getElementById("clr");if(c)c.click()});await p.waitForTimeout(300);
  await p.fill("#q",word);await p.press("#q","Enter");await p.waitForTimeout(450);
  const r=await p.evaluate(()=>({n:parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10),
    pill:document.querySelector(".pill")?document.querySelector(".pill").textContent:""}));
  ok(r.n===125&&/bonus strength/i.test(r.pill),`"${word}" → ${r.n} cards via the ${r.pill.replace("×","").trim()} chip`);
}
await p.evaluate(()=>document.getElementById("clr").click());await p.waitForTimeout(300);

console.log("\n=== SPECIAL SEARCH GROUPING ===");
const grp=await p.evaluate(()=>[...document.querySelectorAll("#groups details.grp")].map(d=>({
  n:d.querySelector("summary").textContent.replace(/\d+ on$/,"").trim(),
  c:d.querySelectorAll(".chip").length})));
ok(grp.every(g=>g.c>=2),`no one-chip groups left (smallest is ${Math.min(...grp.map(g=>g.c))})`);
ok(grp.some(g=>/Buffs/.test(g.n)),`bonus strength moved out of "Lore" into "${(grp.find(g=>/Buffs/.test(g.n))||{}).n}"`);
ok(grp.some(g=>g.n==="Boost"),"Boost is its own group now");
ok(!grp.some(g=>g.n==="Misc"),"…and Misc is gone — vanilla folded into Ability type");
console.log("     "+grp.map(g=>`${g.n}(${g.c})`).join(" · "));

console.log("\n=== TITLES ===");
await openPage("dust");
const T=await p.evaluate(()=>[...document.querySelectorAll(".tit:not(.hid)")].map(t=>({
  name:t.querySelector(".tt").textContent,
  cost:(t.querySelector("[data-title]")||{}).textContent||"",
  blur:t.classList.contains("blur")})));
ok(T.length===10,`${T.length} titles`);
ok(T[T.length-1].name==="Flounderborn",`the last is ${T[T.length-1].name}`);
ok(/1,000,000/.test(T[T.length-1].cost),`…costing ${T[T.length-1].cost.trim()}`);
ok(T.filter(t=>t.blur).length===1&&T[T.length-1].blur,"…and it is the ONLY blurred one (hidden titles use ??? instead)");
ok(await p.evaluate(()=>{const t=[...document.querySelectorAll(".tit.blur")][0];
  return getComputedStyle(t.querySelector(".tt")).filter.includes("blur")}),"…genuinely blurred in CSS");
// buy one
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem("fs3_dust")||"null")
    ||{bal:0,got:{},open:[],titles:[],wear:""};
  d.bal=200;localStorage.setItem("fs3_dust",JSON.stringify(d))});
await p.reload();await p.waitForTimeout(1400);
await p.evaluate(()=>document.querySelector("[data-title]").click());await p.waitForTimeout(500);
let d=await D();
ok((d.titles||[]).length===1,`bought a title (balance ${d.bal})`);
ok(d.wear===d.titles[0],"…and it's worn automatically");
const worn=await p.evaluate(()=>document.getElementById("worn").textContent);
ok(worn==="First Ink",`…showing "${worn}" next to the site name`);
await p.evaluate(()=>document.querySelector("[data-wear]").click());await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.getElementById("worn").textContent)==="","clicking again takes it off");
ok(await p.evaluate(()=>document.querySelectorAll(".tit.blur [data-title]:not([disabled])").length===0),
   "Flounderborn stays unbuyable at 200 dust");

console.log("\n=== GUESS THE ABILITY ===");
await openPage("quiz:ability");
let q=await p.evaluate(()=>({h:document.querySelector("#quizpage h1").textContent,
  clue:document.querySelector("#quizpage .clue").textContent,
  opts:document.querySelectorAll(".gopt").length,
  worth:document.querySelector(".gw b").textContent}));
ok(/Guess the ability/.test(q.h),`"${q.h.trim()}"`);
ok(q.opts===5,`${q.opts} options as asked`);
ok(q.worth==="2",`worth ${q.worth} before any help`);
ok(q.clue===q.clue.toUpperCase()&&q.clue.length>2,`clue is a named ability: "${q.clue}"`);
const abilityIsReal=await p.evaluate(()=>{const t=document.querySelector(".clue").textContent.trim();
  return DATA.cards.some(c=>(c.an||[]).includes(t))});
ok(abilityIsReal,"…and it's a real authored ability name, not scraped text");
await p.click("#qMore");await p.waitForTimeout(400);
ok(await p.evaluate(()=>!!document.querySelector(".clue.more")),"revealing the full wording works");
ok(await p.evaluate(()=>document.querySelector(".gw b").textContent)==="1","…and drops it to 1");
ok(await p.evaluate(()=>document.getElementById("qMore").disabled),"…with no further help available");

console.log("\n=== GUESS THE FLAVOUR TEXT ===");
await openPage("quiz:flavour");
q=await p.evaluate(()=>({h:document.querySelector("#quizpage h1").textContent,
  clue:document.querySelector("#quizpage .clue").textContent,opts:document.querySelectorAll(".gopt").length}));
ok(/flavour text/i.test(q.h),`"${q.h.trim()}"`);
ok(q.opts===5,"five options");
const flavIsReal=await p.evaluate(()=>{const t=document.querySelector(".clue").textContent.trim();
  return DATA.cards.some(c=>(c.fl||"").trim()===t)});
ok(flavIsReal,`clue is a card's real flavour text ("${q.clue.slice(0,54).replace(/\n/g," ")}…")`);

console.log("\n=== GUESS FROM THE FACTS ===");
await openPage("quiz:reveal");
const rv=await p.evaluate(()=>({h:document.querySelector("#quizpage h1").textContent,
  rows:[...document.querySelectorAll(".revs li span")].map(s=>s.textContent),
  worth:document.querySelector(".gw b").textContent}));
ok(/facts/i.test(rv.h),`"${rv.h.trim()}"`);
ok(rv.rows.length===1&&rv.rows[0]==="Cost",`starts with just ${rv.rows[0]}`);
ok(rv.worth==="12",`worth ${rv.worth} on one fact — the reveal game pays double`);
const order=[];
for(let i=0;i<5;i++){await p.click("#qMore");await p.waitForTimeout(250);}
const full=await p.evaluate(()=>({rows:[...document.querySelectorAll(".revs li span")].map(s=>s.textContent),
  worth:document.querySelector(".gw b").textContent,dis:document.getElementById("qMore").disabled}));
ok(full.rows.join(",")==="Cost,Strength,Willpower,Illustrator,Ability name,Lore",
   `facts arrive in your order: ${full.rows.join(" → ")}`);
ok(full.worth==="2",`…dropping to ${full.worth} at the last one`);
ok(full.dis,"…and then there's no more help");

console.log("\n=== WINNING PAYS DUST ===");
await p.evaluate(()=>localStorage.setItem("fs3_dust",JSON.stringify({bal:0,got:{},open:[],titles:[],wear:""})));
await openPage("quiz:ability");
let paid=0;
for(let t=0;t<10;t++){
  await p.evaluate(()=>document.querySelectorAll(".gopt")[0].click());await p.waitForTimeout(200);
  const s=await D();if(s.bal>0){paid=s.bal;break}
  await p.evaluate(()=>{const n=document.getElementById("qNext");if(n)n.click()});await p.waitForTimeout(180);
}
ok(paid>0,`a correct answer paid ${paid} dust`);
ok((await D()).got.quiz,"…and unlocked the Quizmaster achievement");
ok(await p.evaluate(()=>!!document.querySelector(".gres.win .gful")),"…revealing the card");
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
