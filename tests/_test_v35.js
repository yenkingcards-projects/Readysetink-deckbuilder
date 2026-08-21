/* v35 — typing help: autocomplete and "did you mean".

   Built from what reviewers actually complain about in other deck builders:
   having to type a card name in full, and one wrong letter returning nothing.
   Both are worse here than elsewhere would be, because the promise of this site
   is finding a card you only half remember. */
const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1400,height:1000}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1900);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);
const rows=()=>p.evaluate(()=>[...document.querySelectorAll(".acrow .acn")].map(x=>x.textContent.trim()));

console.log("\n=== SUGGESTIONS AS YOU TYPE ===");
await p.click("#q");await p.type("#q","el",{delay:20});await p.waitForTimeout(450);
ok((await rows()).length>0,"two letters is enough to suggest something");
await p.fill("#q","");await p.type("#q","elsa",{delay:20});await p.waitForTimeout(450);
const r=await rows();
ok(r.length>0&&r.length<=8,`${r.length} suggestions, capped at 8`);
ok(r.every(x=>/elsa/i.test(x)),"…every one of them actually matches");
ok(/^Elsa/.test(r[0]),`…and a name that STARTS with it is first ("${r[0]}")`);

console.log("\n=== IT DOESN'T FIRE WHEN IT SHOULDN'T ===");
await p.fill("#q","");await p.type("#q","e",{delay:20});await p.waitForTimeout(400);
ok((await rows()).length===0,"one letter suggests nothing — that's just noise");
await p.fill("#q","");await p.type("#q",'name:"Elsa',{delay:10});await p.waitForTimeout(400);
ok((await rows()).length===0,"…nor while you're typing a filter token");

console.log("\n=== KEYBOARD ===");
await p.fill("#q","");await p.type("#q","elsa",{delay:20});await p.waitForTimeout(450);
await p.keyboard.press("ArrowDown");await p.waitForTimeout(150);
ok(await p.evaluate(()=>!!document.querySelector(".acrow.on")),"down arrow highlights a row");
await p.keyboard.press("ArrowUp");await p.keyboard.press("ArrowUp");await p.waitForTimeout(150);
ok(await p.evaluate(()=>!!document.querySelector(".acrow.on")),"…and it wraps rather than falling off the end");
await p.keyboard.press("Escape");await p.waitForTimeout(200);
ok(await p.evaluate(()=>document.getElementById("acbox").hidden),"escape closes it");
await p.fill("#q","");await p.type("#q","elsa",{delay:20});await p.waitForTimeout(450);
await p.keyboard.press("ArrowDown");await p.keyboard.press("Enter");await p.waitForTimeout(800);
ok(/^Elsa/.test(await p.evaluate(()=>document.getElementById("q").value)),
   "enter takes the highlighted card");
ok(await p.evaluate(()=>document.getElementById("acbox").hidden),"…and closes the list");

console.log("\n=== ONE WRONG LETTER STILL FINDS THE CARD ===");
for(const [typo,want] of [["cindarella","Cinderella"],["mickey mose","Mickey Mouse"],
                          ["maleficant","Maleficent"]]){
  await p.fill("#q","");await p.type("#q",typo,{delay:12});await p.waitForTimeout(900);
  const g=await p.evaluate(()=>[...document.querySelectorAll("[data-dym]")].map(x=>x.textContent));
  ok(g.some(x=>x.indexOf(want)===0),`"${typo}" → ${g[0]||"nothing"}`);
}
console.log("--- and clicking one searches for it ---");
await p.evaluate(()=>document.querySelector("[data-dym]").click());
await p.waitForTimeout(800);
ok(await p.evaluate(()=>document.querySelectorAll("#grid .c").length)>0,
   "clicking a suggestion actually finds cards");

console.log("\n=== A REAL SEARCH IS LEFT ALONE ===");
await p.fill("#q","");await p.type("#q","blue dog",{delay:12});await p.waitForTimeout(900);
ok(await p.evaluate(()=>!document.querySelector(".dym")),
   "a vague art search that works is never second-guessed");
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
