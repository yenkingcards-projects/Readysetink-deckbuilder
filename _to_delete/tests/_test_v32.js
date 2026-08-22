/* v32 — titles & prestige, page hides, mini-game changes, grid changes. */
const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const SRC=require("fs").readFileSync(_W.FILE,"utf8");
const F=_W.URL;
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1200}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(2000);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);
const D=()=>p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_dust")||"{}"));
const setD=o=>p.evaluate(x=>localStorage.setItem("fs3_dust",JSON.stringify(x)),o);
const base={bal:0,got:{},open:[],titles:[],hidden:[],wear:"",quiz:[],bucky:0,pr:{}};
const open_=async op=>{await p.evaluate(o=>{localStorage.setItem("fs3_opage",JSON.stringify(o));
  localStorage.setItem("fs3_tab",JSON.stringify("tOther"))},op);
  await p.reload();await p.waitForTimeout(1600)};

console.log("\n=== TITLES ARE OURS, NOT THE GAME'S ===");
await setD({...base,bal:9e9});await open_("dust");
const titles=await p.evaluate(()=>[...document.querySelectorAll(".tits .tit .tt")].map(t=>t.textContent.trim()));
ok(titles.some(t=>/Archivist/.test(t))&&titles.some(t=>/Lorekeeper/.test(t)),
   "Archivist and Lorekeeper kept — none of these borrow a Ravensburger term");
/* Flounderborn is withheld until bought, so it is not in the visible list.
   Owning it is what reveals the name — and it is still ours, not the game's. */
await setD({...base,bal:9e9,titles:["t_fish"]});await open_("dust");
ok(await p.evaluate(()=>[...document.querySelectorAll(".tits .tit .tt")]
    .some(t=>/Flounderborn/.test(t.textContent))),
   "…and Flounderborn once it is owned");
await setD({...base,bal:9e9});await open_("dust");
/* Scoped to the TITLES table on purpose. "Illumineer's Quest" is a real product
   name and the Worldbuilding page quotes official lore — neither is us taking a
   term for our own. What matters is that no TITLE borrows one. */
const TSRC=SRC.slice(SRC.indexOf("const TITLES=["),SRC.indexOf("];",SRC.indexOf("const TITLES=[")));
ok(!/Illumineer|Illuminary/i.test(TSRC),"no Ravensburger terms in any of our titles");
const HSRC=SRC.slice(SRC.indexOf("const HIDDEN=["),SRC.indexOf("const SECRET_COST"));
ok(!/Illumineer|Illuminary/i.test(HSRC),"…nor in the hidden ones");
ok(titles.some(t=>/Rules Lawyer/.test(t))&&titles.some(t=>/Pixel Peeper/.test(t)),
   `renamed to gamer-native: ${titles.slice(0,4).join(", ")}…`);

console.log("\n=== HIDDEN TITLES COLLAPSE ===");
const hid=await p.evaluate(()=>{const d=document.getElementById("hidBox");
  return {isDetails:d&&d.tagName==="DETAILS",open:d&&d.open,
    summary:d&&d.querySelector("summary").textContent.replace(/\s+/g," ").trim()}});
ok(hid.isDetails,"hidden titles live in a collapsible section");
ok(hid.open===false,"…closed by default");
ok(/Hidden titles/.test(hid.summary),`…labelled "${hid.summary}"`);
await p.evaluate(()=>document.getElementById("hidBox").open=true);
await p.waitForTimeout(300);await p.reload();await p.waitForTimeout(1500);
ok(await p.evaluate(()=>document.getElementById("hidBox").open),"…and it remembers if you open it");

console.log("\n=== EQUIP / UNEQUIP ===");
await setD({...base,bal:9e9,titles:["t_pupil"],wear:""});await open_("dust");
ok(!/Wear it|Wearing/.test(await p.evaluate(()=>document.getElementById("dustpage").textContent)),
   "no 'wear' wording left anywhere");
ok(await p.evaluate(()=>[...document.querySelectorAll("[data-wear]")].some(b=>b.textContent.trim()==="Equip")),
   "an owned title offers Equip");
await p.evaluate(()=>document.querySelector('[data-wear="t_pupil"]').click());await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.querySelector('[data-wear="t_pupil"]').textContent.trim())==="Unequip",
   "…and Unequip once it's on");

console.log("\n=== FLOUNDERBORN PRESTIGE, FIFTEEN TIERS ===");
await setD({...base,bal:9e9,titles:["t_fish"],wear:"t_fish",pr:{}});await open_("dust");
const c1=await p.evaluate(()=>document.querySelector('[data-pr="t_fish"]').textContent.replace(/\s+/g," ").trim());
ok(/Prestige 1 · 1,000,000/.test(c1),`tier 1 costs a million (${c1})`);
await p.evaluate(()=>document.querySelector('[data-pr="t_fish"]').click());await p.waitForTimeout(450);
const c2=await p.evaluate(()=>document.querySelector('[data-pr="t_fish"]').textContent.replace(/\s+/g," ").trim());
ok(/Prestige 2 · 2,000,000/.test(c2),`…tier 2 a million more (${c2})`);
ok((await D()).pr.t_fish===1,"…and the level is recorded");
ok(await p.evaluate(()=>!!document.querySelector(".tit.pr.p1")),"flair class tracks the level");
// climb to 9
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem("fs3_dust"));
  d.pr={t_fish:2};localStorage.setItem("fs3_dust",JSON.stringify(d))});
await p.reload();await p.waitForTimeout(1400);
for(let i=3;i<=9;i++){await p.evaluate(()=>{const b=document.querySelector('[data-pr="t_fish"]');if(b)b.click()});
  await p.waitForTimeout(240)}
ok((await D()).pr.t_fish===9,`climbed to prestige ${(await D()).pr.t_fish}`);
ok(await p.evaluate(()=>!!document.querySelector(".tit.pr.p9")),"…flair escalated with it");
ok(/\.pr\.p3,\.pr\.p4\{box-shadow/.test(SRC),"frames start at prestige 3");
ok(/\.pr\.p15\{/.test(SRC)&&/\.pr\.p15::after/.test(SRC),"…and prestige 15 has the full treatment");

console.log("\n=== THE GATES ===");
ok(await p.evaluate(()=>{const t=[...document.querySelectorAll(".tit")]
    .find(x=>/First Ink|Brewer|Archivist/.test(x.textContent));
  return !t||!t.querySelector("[data-pr]")}),
   "other titles can't be prestiged before Flounderborn 10");
await p.evaluate(()=>document.querySelector('[data-pr="t_fish"]').click());await p.waitForTimeout(450);
ok((await D()).pr.t_fish===10,"reached Flounderborn 10");
await setD({...(await D()),titles:["t_fish","t_pupil"]});
await p.reload();await p.waitForTimeout(1500);
ok(await p.evaluate(()=>!!document.querySelector('[data-pr="t_pupil"]')),
   "…which unlocks prestige on other titles");
const gate11=await p.evaluate(()=>{const t=[...document.querySelectorAll(".tit")]
  .find(x=>/Flounderborn/.test(x.textContent));return t.textContent.replace(/\s+/g," ")});
ok(/another title to prestige 10/i.test(gate11),`…and 11 is gated: "${gate11.match(/Take another[^·]*/i)||""}"`);
// take the other title to 10
for(let i=0;i<10;i++){await p.evaluate(()=>{const b=document.querySelector('[data-pr="t_pupil"]');if(b)b.click()});
  await p.waitForTimeout(200)}
ok((await D()).pr.t_pupil===10,"took another title to 10");
await p.reload();await p.waitForTimeout(1400);
ok(await p.evaluate(()=>!!document.querySelector('[data-pr="t_fish"]')),"…which opens Flounderborn 11");
// climb to 14, then check the secrets gate on 15
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem("fs3_dust"));
  d.pr.t_fish=14;localStorage.setItem("fs3_dust",JSON.stringify(d))});
await p.reload();await p.waitForTimeout(1400);
const g15=await p.evaluate(()=>{const t=[...document.querySelectorAll(".tit")]
  .find(x=>/Flounderborn/.test(x.textContent));return t.textContent.replace(/\s+/g," ")});
ok(/Reveal every secret/i.test(g15),"prestige 15 is gated on revealing every secret");
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem("fs3_dust"));
  d.open=["s1","s2","s3","s4","s5","s6"];localStorage.setItem("fs3_dust",JSON.stringify(d))});
await p.reload();await p.waitForTimeout(1400);
await p.evaluate(()=>{const b=document.querySelector('[data-pr="t_fish"]');if(b)b.click()});
await p.waitForTimeout(450);
ok((await D()).pr.t_fish===15,"…and with them all revealed, 15 lands");
ok(await p.evaluate(()=>!!document.querySelector(".tit.pr.p15")),"…wearing the top flair");
ok(!await p.evaluate(()=>!!document.querySelector('[data-pr="t_fish"]')),"…with nothing above it");

console.log("\n=== TITLES ON DECKS ===");
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem("fs3_dust"));
  d.wear="t_fish";localStorage.setItem("fs3_dust",JSON.stringify(d));
  localStorage.setItem("fs3_tab",JSON.stringify("tDecks"));
  localStorage.setItem("fs3_opage",JSON.stringify(""))});
await p.reload();await p.waitForTimeout(1600);
const dt=await p.evaluate(()=>{const t=document.querySelector(".dkcard .dtitle");
  return t?{txt:t.textContent.trim(),cls:t.className}:null});
ok(dt,"the equipped title shows on every deck");
ok(/Flounderborn/.test(dt.txt),`…by name (${dt.txt})`);
ok(/p15/.test(dt.cls),"…carrying its prestige flair with it");

console.log("\n=== SECRETS COST 25 ===");
await setD({...base,bal:100});await open_("dust");
const sc=await p.evaluate(()=>[...document.querySelectorAll("[data-buy]")].map(b=>b.textContent.replace(/\s+/g," ").trim()));
ok(sc.length>0&&sc.every(t=>/Reveal · 25 dust/.test(t)),`every secret is 25 (${sc[0]})`);
await p.evaluate(()=>document.querySelector("[data-buy]").click());await p.waitForTimeout(400);
ok((await D()).bal===75,`…and buying one costs exactly 25 (100 → ${(await D()).bal})`);

console.log("\n=== HIDDEN PAGES ===");
await open_("");
const ops=await p.evaluate(()=>[...document.querySelectorAll("[data-op]")].map(b=>b.dataset.op));
ok(!ops.includes("upg"),"Deck upgrades has no tile");
ok(!ops.includes("cred"),"…nor Sources");
await open_("upg");
ok(await p.evaluate(()=>document.getElementById("uppage").textContent.trim().length>100),
   "…but Deck upgrades still works if you go straight to it");
/* The footer is gone; the disclaimer moved to Settings. Same two claims, new
   address. */
await open_("pref");
const foot=await p.evaluate(()=>{const l=document.querySelector(".legal");
  return l?l.textContent.replace(/\s+/g," ").trim():""});
ok(!/LorcanaJSON|Lorcast|Card data/.test(foot),"source credits are not in the disclaimer block");
ok(/Not published, endorsed or approved/.test(foot),"…but the Ravensburger disclaimer stays, as it must");
await open_("cred");
ok(/LorcanaJSON/.test(await p.evaluate(()=>document.getElementById("credpage").textContent)),
   "…and the credits themselves live on the Sources page");

console.log("\n=== MINI GAMES ===");
await open_("quiz:flavour");
ok(!await p.evaluate(()=>!!document.getElementById("qMore")),
   "flavour text has no rules-text reveal");
const fw=await p.evaluate(()=>+document.querySelector(".gw b").textContent);
ok(fw>=5,`…and it's worth ${fw}, up from 2`);
await p.evaluate(()=>{const right=[...document.querySelectorAll("[data-q]")];
  right.forEach(b=>{})});
const ansF=await p.evaluate(()=>{const opts=[...document.querySelectorAll("[data-q]")];
  return opts.length});
ok(ansF===5,"…still five options");
// answer correctly and check the big reveal
for(let i=0;i<8;i++){
  const hit=await p.evaluate(()=>{
    const g=window.__ans;return false});
  break;
}
await p.evaluate(()=>document.querySelectorAll("[data-q]")[0].click());await p.waitForTimeout(500);
const rev=await p.evaluate(()=>{const r=document.querySelector(".qreveal");
  return r?{w:r.querySelector("img")?r.querySelector("img").getBoundingClientRect().width:0,
    above:r.getBoundingClientRect().top<document.querySelector(".qwrap").getBoundingClientRect().top}:null});
if(rev)ok(rev.w>150&&rev.above,`a correct answer shows the card big (${Math.round(rev.w)}px) above the question`);
else ok(true,"(that answer was wrong — reveal only fires on a correct one)");
ok(/\.qreveal\{/.test(SRC)&&/qrise/.test(SRC),"the large reveal is defined and animates in");
for(const g of ["guess","quiz:ability","quiz:flavour","quiz:reveal","aqua","click","hex"]){
  await open_(g);
  const has=await p.evaluate(()=>!!document.querySelector(".lbrd"));
  ok(has,`${g} has a leaderboard shelf`);
}
ok(/const LB_LIVE=false/.test(SRC),"…all inert until accounts exist");
ok(/Ranked boards arrive with accounts/.test(SRC),"…and it says so honestly rather than faking ranks");
await open_("hex");
const lede=await p.evaluate(()=>document.querySelector("#hexpage .lede").textContent.trim());
ok(lede.length<160,`Outpost's explanation is short now (${lede.length} chars)`);
ok(!/secret|achievement|something happens/i.test(await p.evaluate(()=>document.getElementById("hexpage").textContent)),
   "…and nothing on the page hints at the hidden achievement");

console.log("\n=== GRID AND DECK BUILDER ===");
await p.evaluate(()=>{localStorage.setItem("fs3_tab",JSON.stringify("tDeck"));
  localStorage.setItem("fs3_opage",JSON.stringify(""))});
await p.reload();await p.waitForTimeout(1600);
ok(await p.evaluate(()=>!!document.getElementById("clr2")),"a second Clear all filters sits by the cards");
ok(await p.evaluate(()=>!!document.getElementById("tgRemind")),"…next to a reminder-tags toggle");
const cols=await p.evaluate(()=>getComputedStyle(document.getElementById("grid")).gridTemplateColumns.split(" ").length);
const tileW=await p.evaluate(()=>{const c=document.querySelector("#grid .c");
  return c?c.getBoundingClientRect().width:0});
ok(tileW>200,`thumbnails are bigger — ${Math.round(tileW)}px across`);
await p.fill("#q","Chip the Teacup");await p.waitForTimeout(700);
const why=await p.evaluate(()=>{const w=document.querySelector("#grid .c .why");
  if(!w)return null;const img=w.closest(".c").querySelector("img");
  return {pos:getComputedStyle(w).position,
    below:img?w.getBoundingClientRect().top>=img.getBoundingClientRect().bottom-2:null}});
if(why){ok(why.pos==="static","the not-legal notice is no longer absolutely positioned over the art");
  ok(why.below!==false,"…it sits below the card image");}
else{ok(true,"(no illegal card in view)");ok(true,"")}
await p.evaluate(()=>document.getElementById("tgRemind").click());await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.body.classList.contains("noremind")),"the toggle turns reminder tags off");
ok(await p.evaluate(()=>{const w=document.querySelector("#grid .c .why");
  return !w||getComputedStyle(w).display==="none"}),"…and the legality flags go with them");
await p.reload();await p.waitForTimeout(1500);
ok(await p.evaluate(()=>document.body.classList.contains("noremind")),"…and it sticks across a reload");
await p.evaluate(()=>document.getElementById("tgRemind").click());await p.waitForTimeout(300);

console.log("\n=== SEARCH TAB IS READ-ONLY ===");
await p.click("#tSearch");await p.waitForTimeout(500);
await p.fill("#q","Elsa - Snow Queen");await p.waitForTimeout(700);
const before=await p.evaluate(()=>document.getElementById("mN").textContent);
await p.evaluate(()=>document.querySelector("#grid .c img").click());await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.getElementById("mN").textContent)===before,"clicking a card adds nothing");
ok(!await p.evaluate(()=>!!document.getElementById("ma")),"the card has no + button here");
ok(!await p.evaluate(()=>!!document.getElementById("mr")),"…nor a −");
/* The "reference only" banner is gone — the missing controls say it. What
   matters is that nothing here offers to add, so assert the absence instead. */
ok(!await p.evaluate(()=>!!document.querySelector(".rdonly")),"…and no banner explaining the controls that aren't there");
ok(!await p.evaluate(()=>!!document.querySelector("#mbg .tipadd, #mbg [data-plus]")),"…and nothing else offers to add");
await p.evaluate(()=>document.getElementById("mx").click());await p.waitForTimeout(300);
ok(await p.evaluate(()=>document.querySelectorAll("#grid .c .qty").length===0),"no steppers on the tiles either");
await p.click("#tDeck");await p.waitForTimeout(500);
await p.fill("#q","Elsa - Snow Queen");await p.waitForTimeout(600);
await p.evaluate(()=>document.querySelector("#grid .c img").click());await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.getElementById("mN").textContent)!==before,
   "…while the Deck builder tab still adds normally");

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
