const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
const NOT=("file://"+_W.notes());
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};

console.log("\n=== NOTES EDITOR: KINDS ===");
const p2=await b.newPage({viewport:{width:1400,height:1000}});
const e2=[];p2.on("pageerror",e=>e2.push(e.message));
await p2.goto(NOT);await p2.waitForTimeout(1500);
ok(e2.length===0,`loads clean${e2.length?" — "+e2[0]:""}`);
const kb=await p2.evaluate(()=>[...document.querySelectorAll("#kindPick .kindb")].map(b=>b.textContent.trim()));
ok(kb.length===5,`5 kinds offered: ${kb.join(" · ")}`);
ok(await p2.evaluate(()=>document.querySelector("#kindPick .kindb").classList.contains("on")),"Ruling selected by default");
ok(/serious one/.test(await p2.evaluate(()=>document.getElementById("kindHint").textContent)),"…with a hint explaining it");
// pick Ben's take
await p2.evaluate(()=>document.querySelector('[data-k="take"]').click());await p2.waitForTimeout(250);
ok(/opinion/.test(await p2.evaluate(()=>document.getElementById("kindHint").textContent)),"picking Ben's take swaps the hint");
await p2.fill("#fQ","Elsa - Snow Queen");await p2.waitForTimeout(500);
await p2.fill("#nText","Best two-drop in the format, no contest.");
await p2.click("#bAdd");await p2.waitForTimeout(400);
const n1=await p2.evaluate(()=>{const s=JSON.parse(localStorage.getItem("fs_rsinotes_v1")).cards["Elsa - Snow Queen"];return s[s.length-1]});
ok(n1.k==="take",`saved with kind "${n1.k}"`);
const col=await p2.evaluate(()=>getComputedStyle(document.querySelector(".note")).borderLeftColor);
ok(/rgb\(247,\s*201,\s*92\)/.test(col),`…and the note renders gold (${col})`);
ok(/Ben's take/.test(await p2.evaluate(()=>document.querySelector(".note .kind").textContent)),"…labelled on the note");

console.log("\n--- video needs a link ---");
await p2.evaluate(()=>document.querySelector('[data-k="video"]').click());await p2.waitForTimeout(200);
await p2.fill("#nText","Deck tech featuring this card.");
await p2.click("#bAdd");await p2.waitForTimeout(350);
const blocked=await p2.evaluate(()=>document.getElementById("nText").value);
ok(blocked!=="","a video note without a link is refused, text kept");
await p2.fill("#nUrl","https://youtube.com/watch?v=abc123");
await p2.click("#bAdd");await p2.waitForTimeout(400);
const vid=await p2.evaluate(()=>{const s=JSON.parse(localStorage.getItem("fs_rsinotes_v1")).cards["Elsa - Snow Queen"];return s[s.length-1]});
ok(vid.k==="video"&&/youtube/.test(vid.u),`…and saves once a link is given (${vid.u})`);
ok(await p2.evaluate(()=>!!document.querySelector(".note .nlink")),"…rendering a clickable link");

console.log("\n--- filter by kind ---");
await p2.fill("#fQ","");await p2.selectOption("#fMode","some");await p2.waitForTimeout(400);
const allNoted=await p2.evaluate(()=>document.getElementById("fCount").textContent);
await p2.selectOption("#fKind","video");await p2.waitForTimeout(400);
const justVid=await p2.evaluate(()=>document.getElementById("fCount").textContent);
ok(allNoted!==justVid&&justVid==="1 card",`kind filter narrows ${allNoted} → ${justVid}`);
await p2.selectOption("#fKind","");await p2.waitForTimeout(300);

console.log("\n=== EXPORT ROUND-TRIPS THE NEW FIELDS ===");
await p2.click("#bExport");await p2.waitForTimeout(400);
const ex=JSON.parse(await p2.evaluate(()=>document.getElementById("ioBox").value));
const elsa=ex.cards["Elsa - Snow Queen"];
ok(elsa.some(n=>n.k==="take")&&elsa.some(n=>n.k==="video"&&n.u),"export keeps kind + link");

console.log("\n=== SEARCH: NOTE FILTER CHIPS ===");
const p1=await b.newPage({viewport:{width:1500,height:950}});
const e1=[];p1.on("pageerror",e=>e1.push(e.message));
await p1.goto(F);await p1.waitForTimeout(1600);
ok(e1.length===0,`app loads clean${e1.length?" — "+e1[0]:""}`);
const grp=await p1.evaluate(()=>{
  const d=[...document.querySelectorAll("#groups details.grp")].find(x=>/Notes & rulings/.test(x.querySelector("summary").textContent));
  return d?[...d.querySelectorAll(".chip span")].map(s=>s.textContent).filter(t=>t&&!/^\d+$/.test(t)):null});
ok(!!grp,`"Notes & rulings" group exists`);
console.log("     "+ (grp||[]).join(" · "));
ok((grp||[]).length===6,`${(grp||[]).length} chips in it (Ben's take + Video hidden for now)`);
const chipN=async label=>p1.evaluate(l=>{
  const c=[...document.querySelectorAll("#groups .chip")].find(x=>x.textContent.includes(l));
  c.click();return new Promise(r=>setTimeout(()=>r(parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10)),350))},label);
const unclick=async label=>p1.evaluate(l=>{
  [...document.querySelectorAll("#groups .chip")].find(x=>x.textContent.includes(l)).click();
  return new Promise(r=>setTimeout(r,350))},label);
const off=await p1.evaluate(()=>parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10));
const nOff=await chipN("Official ruling");
ok(nOff===78,`"Official ruling" → ${nOff} cards (matches the 78 from set notes)`);
await unclick("Official ruling");
const nRsi=await chipN("Ready Set Ink note");
ok(nRsi===4,`"Ready Set Ink note" → ${nRsi} cards`);
await unclick("Ready Set Ink note");
const nAny=await chipN("Any extra notes");
ok(nAny===81&&nAny<off,`"Any extra notes" → ${nAny} — a true union, not a sum: Mickey & Minnie has both an official ruling and one of ours`);
await unclick("Any extra notes");
// v21: Ben's take and Video chips are hidden until he says so
for(const k of ["Watch out","Trivia"]){
  const n=await chipN(k);
  ok(n===0,`"${k}" → ${n} (none written yet, chip present and wired)`);
  await unclick(k);
}

console.log("\n=== KIND STYLING REACHES THE CARD PAGE ===");
await p1.evaluate(()=>{const q=document.getElementById("q");q.value="Touch the Sky";
  q.dispatchEvent(new Event("input",{bubbles:true}))});
await p1.waitForTimeout(700);
await p1.evaluate(()=>document.querySelector("#grid .c [data-i]").click());await p1.waitForTimeout(600);
const rr=await p1.evaluate(()=>{const r=document.querySelector(".ruling.rsin");
  return r?{kind:r.querySelector(".kind").textContent.trim(),col:getComputedStyle(r).borderLeftColor}:null});
ok(/Ruling/.test(rr.kind),`card page shows the kind badge ("${rr.kind}")`);
ok(/rgb\(63,\s*217,\s*149\)/.test(rr.col),`…in the kind's colour (${rr.col})`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
