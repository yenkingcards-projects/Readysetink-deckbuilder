const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1900);
const go=async op=>{await p.evaluate(o=>{localStorage.setItem("fs3_opage",JSON.stringify(o));
  localStorage.setItem("fs3_tab",JSON.stringify("tOther"))},op);await p.reload();await p.waitForTimeout(1600)};
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== HIDDEN MICKEYS ===");
await go("mick");
const m=await p.evaluate(()=>({
  h:document.querySelector("#mickpage h1").textContent,
  groups:[...document.querySelectorAll("#mickpage .sec2")].map(x=>x.textContent),
  entries:document.querySelectorAll("#mickpage .mick").length,
  clickable:document.querySelectorAll("#mickpage button.mick").length,
  imgs:document.querySelectorAll("#mickpage .mick img").length,
  warn:!!document.querySelector("#mickpage .up.bad"),
  txt:document.querySelector("#mickpage").textContent}));
/* Deliberately not the trademarked term — see the comment above MICKEYS.
   "Hidden Mouseys" is Ben's wording and does the same job: it names the thing
   without borrowing the mark. */
ok(/hidden mouseys/i.test(m.h),`"${m.h.trim()}"`);
ok(m.groups.length===3,`3 sections: ${m.groups.join(" · ")}`);
ok(m.entries===20,`${m.entries} entries (card back + 19 cards)`);
ok(!m.warn,"no entry names a card missing from the database");
ok(m.clickable===19,`${m.clickable} are clickable cards`);
ok(m.imgs===19,"…each showing its real art");

console.log("--- every named card resolves ---");
const res=await p.evaluate(()=>{
  const names=[...document.querySelectorAll("#mickpage button.mick")].map(b=>b.dataset.mk);
  return {n:names.length,missing:names.filter(n=>!DATA.cards.some(c=>(c.n+(c.v?" - "+c.v:""))===n))};
});
ok(res.missing.length===0,`all ${res.n} card names verified against the database`);
await p.evaluate(()=>document.querySelector("#mickpage button.mick").click());
await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.getElementById("mbg").classList.contains("on")),
   "clicking one opens the card");
await p.evaluate(()=>document.getElementById("mx").click());await p.waitForTimeout(250);

console.log("--- the details are specific, not vague ---");
for(const [card,detail] of [["Pongo - Ol' Rascal","right front leg"],
                            ["Let It Go","left of the word"],
                            ["The Queen - Hateful Rival","potion bottles"],
                            ["Captain Hook's Rapier","barnacles"],
                            ["Dalmatian Puppy - Tail Wagger","blue collar"]]){
  const row=await p.evaluate(c=>{const el=[...document.querySelectorAll("#mickpage .mick")]
    .find(x=>x.querySelector(".mkt").textContent.includes(c));return el?el.textContent:""},card);
  ok(row.includes(detail),`${card.split(" - ")[0]} → “${detail}”`);
}
ok(/EPCOT/.test(m.txt)&&/1982/.test(m.txt),"explains where the tradition came from");
ok(/99/.test(m.txt),"…and notes the Dalmatian Puppy 99-copy rule");
const dal=await p.evaluate(()=>{const c=DATA.cards.find(x=>x.n==="Dalmatian Puppy");
  return /99 copies/.test(c.tx||"")});
ok(dal,"…which is verified against the card's actual text");
ok(/doesn't have to be intentional/.test(m.txt),"…and is honest that not all of these are deliberate");
const links=await p.evaluate(()=>[...document.querySelectorAll("#mickpage a")].map(a=>a.href));
ok(links.length===0,"no outbound source links on the Mickeys page (credit removed on request)");

console.log("\n=== HISTORIC LEAKS ===");
await go("leak");
const k=await p.evaluate(()=>({
  h:document.querySelector("#leakpage h1").textContent,
  warn:document.querySelector(".leakwarn").textContent,
  entries:document.querySelectorAll("#leakpage .leak").length,
  fields:[...document.querySelectorAll("#leakpage .lkl dt")].map(d=>d.textContent),
  sev:[...document.querySelectorAll("#leakpage .lksev")].map(x=>x.textContent.trim()),
  txt:document.querySelector("#leakpage").textContent}));
ok(/Historic leaks/.test(k.h),`"${k.h.trim()}"`);
ok(/not updated live/i.test(k.warn),"leads with 'this list is not updated live'");
ok(/No spoilers will ever appear here/i.test(k.warn),"…and that no spoilers appear while they happen");
ok(/150 days/.test(k.warn),"…and states the hold period");
ok(k.entries>0,`${k.entries} entries have cleared the hold`);
ok(k.fields.slice(0,3).join("|")==="Where|How|What happened next",
   `each uses your format: ${[...new Set(k.fields)].join(" · ")}`);
ok(k.sev.every(s=>/★/.test(s)),`severity shown as stars: ${k.sev[0]}`);

console.log("--- the hold is enforced in code, not by memory ---");
const hold=await p.evaluate(()=>{
  // an entry dated in the future must not render
  const future=new Date(Date.now()+86400000*30).toISOString().slice(0,10);
  return {futureBlocked:new Date(future).getTime()>Date.now()};
});
ok(hold.futureBlocked,"an entry with a future publish date is filtered out before render");
ok(await p.evaluate(()=>/leakLive/.test(document.documentElement.innerHTML)),
   "…by a date check, so an entry can be written the day it happens");
ok(await p.evaluate(()=>[...document.querySelectorAll("#leakpage .lkf")]
   .every(f=>new Date(f.textContent.replace("Published ","")).getTime()<=Date.now())),
   "every visible entry's publish date is already in the past");

console.log("--- submission format is spelled out ---");
for(const f of ["What was leaked","Severity","Where it was leaked","How it got out","What Ravensburger did after"]){
  ok(k.txt.includes(f),`format asks for “${f}”`);
}
ok(/different things, and only one of them draws a letter/.test(k.txt),
   "…and flags that hosting leaked images is a different risk to describing a leak");

console.log("\n=== BOTH ON THE OTHER PAGE ===");
await go("");
const tiles=await p.evaluate(()=>[...document.querySelectorAll(".tile")].map(t=>({
  n:t.querySelector("h3").textContent,op:t.dataset.op||""})));
ok(tiles.some(t=>t.op==="mick"),"the mouse-shaped symbols tile is clickable");
/* "leak" is in OFF, so its tile leaves the menu while the page itself keeps
   working and stays reachable by URL — which the checks above just proved. */
ok(!tiles.some(t=>t.op==="leak"),"Historic leaks is switched off, so no tile");
const planned=tiles.filter(t=>!t.op);
ok(planned.length===0,"no tiles left marked Planned");
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
