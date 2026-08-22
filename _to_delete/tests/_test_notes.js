const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const APP=_W.URL;
const NOT=("file://"+_W.notes());
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1440,height:950}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));

console.log("\n=== RULINGS: TWO LABELLED SECTIONS ===");
await p.goto(APP);await p.waitForTimeout(1500);
await p.fill("#q","Touch the Sky");await p.waitForTimeout(700);
await p.evaluate(()=>document.querySelector("#grid .c [data-i]").click());await p.waitForTimeout(600);
const m=await p.evaluate(()=>{
  const h=[...document.querySelectorAll(".rulings h4")].map(x=>x.textContent);
  const rsi=document.querySelector(".ruling.rsin");
  return {heads:h,rsiText:rsi?rsi.querySelector(".a").textContent.slice(0,40):null,
    rsiSrc:rsi&&rsi.querySelector(".src")?rsi.querySelector(".src").textContent:null,
    rail:rsi?getComputedStyle(rsi).borderLeftColor:null};
});
ok(m.heads.some(h=>/^Ready Set Ink notes/.test(h)),`community heading: "${m.heads.find(h=>/Ready/.test(h))}"`);
ok(!!m.rsiText,`…renders the note ("${m.rsiText}…")`);
ok(/rgb\(63,\s*217,\s*149\)/.test(m.rail||""),"…on a green rail, visually distinct from official Q&A");
await p.evaluate(()=>document.getElementById("mx").click());await p.waitForTimeout(300);

await p.fill("#q","Moana - Of Motunui");await p.waitForTimeout(700);
await p.evaluate(()=>document.querySelector("#grid .c [data-i]").click());await p.waitForTimeout(600);
const h2=await p.evaluate(()=>({heads:[...document.querySelectorAll(".rulings h4")].map(x=>x.textContent),
  src:document.querySelector(".ruling .src")?document.querySelector(".ruling .src").textContent:null}));
ok(h2.heads.some(h=>/^From set notes/.test(h)),`official heading: "${h2.heads.find(h=>/From set/.test(h))}"`);
ok(/Official set release notes/.test(h2.src||""),`…attributed ("${h2.src}")`);
await p.evaluate(()=>document.getElementById("mx").click());

console.log("\n=== RULINGS COVERAGE ACROSS ALL 5 SETS ===");
const cov=await p.evaluate(()=>{
  const by={};DATA.cards.forEach(c=>(c.ru||[]).forEach(r=>by[r.s]=(by[r.s]||0)+1));
  return {by,cards:DATA.cards.filter(c=>(c.ru||[]).length).length};
});
Object.entries(cov.by).forEach(([s,n])=>console.log(`     ${s}: ${n}`));
ok(Object.keys(cov.by).length===5,`all 5 sets present`);
ok(cov.cards===78,`78 cards carry official Q&A`);

console.log("\n=== CLICK TO ADD: ONLY UNTIL THE FIRST CARD ===");
await p.goto(APP);await p.waitForTimeout(1500);
await p.fill("#q","Ariel");await p.waitForTimeout(700);
ok(await p.evaluate(()=>!!document.querySelector("#grid .c .tipadd")),"tip shows on an empty Main deck");
await p.evaluate(()=>document.querySelector("#grid .c img").click());await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.querySelectorAll("#grid .c .tipadd").length===0),
   "…and disappears from every card the moment one is added");
await p.evaluate(()=>document.querySelector("#grid .c [data-minus]").click());await p.waitForTimeout(500);
ok(await p.evaluate(()=>!!document.querySelector("#grid .c .tipadd")),"…and comes back if the deck is emptied");

console.log("\n=== NOTES EDITOR ===");
await p.goto(NOT);await p.waitForTimeout(1500);
ok(errs.length===0,`loads with no JS errors${errs.length?" — "+errs[0]:""}`);
const boot=await p.evaluate(()=>({name:document.getElementById("cname").textContent,
  sets:document.getElementById("fSet").options.length,
  stat:document.getElementById("pstat").textContent}));
ok(boot.name&&boot.name!=="—",`opens on a card (${boot.name})`);
ok(boot.sets>10,`${boot.sets-1} sets in the filter`);
ok(/4 cards noted/.test(boot.stat),`seeded from rsi-notes.json (${boot.stat})`);
// write a note
await p.fill("#fQ","Flounder - Voice of Reason");await p.waitForTimeout(500);
await p.fill("#nText","Test note: Flounder is the best card, obviously.");
await p.fill("#nSrc","Discord · @ben");
await p.click("#bAdd");await p.waitForTimeout(400);
const wrote=await p.evaluate(()=>({n:document.querySelectorAll("#noteList .note").length,
  t:document.querySelector("#noteList .note .t").textContent,
  m:document.querySelector("#noteList .note .m").textContent,
  stored:JSON.parse(localStorage.getItem("fs_rsinotes_v1")).cards["Flounder - Voice of Reason"].length}));
ok(wrote.n===1&&/best card/.test(wrote.t),"note saves and renders");
ok(/Discord · @ben/.test(wrote.m),`…with its source (${wrote.m})`);
ok(wrote.stored===1,"…and persists to localStorage");
// filters
await p.fill("#fQ","");await p.selectOption("#fMode","some");await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.getElementById("fCount").textContent)==="5 cards","'Has notes' filter finds all noted cards");
// delete
await p.evaluate(()=>document.querySelector("#noteList [data-del]").click());await p.waitForTimeout(300);
ok(await p.evaluate(()=>document.getElementById("fCount").textContent)==="4 cards","delete removes it again");

console.log("\n=== DISCORD PASTE IMPORTER ===");
await p.click("#bDiscord");await p.waitForTimeout(300);
await p.fill("#disBox",
`benjamindacy — Today at 3:42 PM
Reminder that Bucky - Squirrel Squeak Tutor only lets you look, you don't get to reorder.
judgeSam — Today at 3:44 PM
Correct. And Hundred Acre Wood gives the +1 willpower to every character there, not just Hunny ones.
someone — Yesterday at 11:02 AM
unrelated chatter about sleeves`);
await p.click("#disParse");await p.waitForTimeout(500);
const parsed=await p.evaluate(()=>({
  n:document.querySelectorAll("#disOut .msg").length,
  who:[...document.querySelectorAll("#disOut .who")].map(x=>x.textContent.trim().split("·")[0].trim()),
  guesses:[...document.querySelectorAll("#disOut [data-sel]")].map(s=>s.value)}));
ok(parsed.n===3,`split into ${parsed.n} messages`);
ok(parsed.who[0]==="benjamindacy"&&parsed.who[1]==="judgeSam",`authors kept (${parsed.who.join(", ")})`);
ok(/Bucky/.test(parsed.guesses[0]),`guessed card 1: ${parsed.guesses[0]}`);
ok(/Hundred Acre Wood/.test(parsed.guesses[1]),`guessed card 2: ${parsed.guesses[1]}`);
ok(parsed.guesses[2]==="",`no guess for the off-topic message (was falsely matching "Ed" inside "unrelated")`);
await p.evaluate(()=>document.querySelector("#disOut [data-att]").click());await p.waitForTimeout(400);
const att=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem("fs_rsinotes_v1")).cards;
  const k=Object.keys(s).find(x=>/Bucky/.test(x));return k?s[k][s[k].length-1]:null});
ok(att&&/only lets you look/.test(att.t),"attaching writes the message to that card");
ok(att&&att.src==="Discord · benjamindacy",`…crediting the author (${att&&att.src})`);
// export round-trip
await p.click("#disClose");await p.waitForTimeout(300);
await p.click("#bExport");await p.waitForTimeout(300);
const ex=await p.evaluate(()=>document.getElementById("ioBox").value);
let j=null;try{j=JSON.parse(ex)}catch(e){}
ok(!!j&&!!j.cards,"Export produces valid JSON");
ok(Object.keys(j.cards).some(k=>/Bucky/.test(k)),"…containing the Discord note");

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
