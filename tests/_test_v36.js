/* v36 — dark mode, its free window, and the patron gate behind it.

   The contrast of the dark palette is _test_v33's job — it now audits both
   themes. This suite covers the switch itself.

   Dark mode is free for everyone until the end of 25 December 2026 and a
   patron perk after that, so the gate has to be tested at two points in time.
   The clock is frozen with addInitScript, before the page's own script runs,
   because darkFree() is read during boot as well as on every render — moving
   Date.now afterwards would test a page that had already made up its mind. */
const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
const SRC=require("fs").readFileSync(_W.FILE,"utf8");
const openPrefs=async p=>{
  await p.evaluate(()=>{localStorage.setItem("fs3_tab",JSON.stringify("tOther"));
    localStorage.setItem("fs3_opage",JSON.stringify("pref"))});
  await p.reload();await p.waitForTimeout(1700)};
const setPatron=(p,v)=>p.evaluate(v=>{const d=JSON.parse(localStorage.getItem("fs3_dust")||"{}");
  d.patron=v;d.bal=d.bal||0;localStorage.setItem("fs3_dust",JSON.stringify(d))},v);
/* A page whose Date.now() is pinned to `when`, from the first line it runs. */
const at=async(b,when)=>{
  const p=await b.newPage({viewport:{width:1300,height:950}});
  await p.addInitScript(t=>{Date.now=()=>t},when);
  await p.goto(F);await p.waitForTimeout(1900);
  return p};
const DURING=new Date(2026,7,20).getTime();     // inside the free window
const AFTER =new Date(2027,0,5).getTime();      // eleven days past it

(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const isDark=p=>p.evaluate(()=>document.body.classList.contains("dark"));

console.log("=== THE FREE WINDOW HAS A DATE, NOT A FEELING ===");
ok(/DARK_FREE_UNTIL\s*=\s*new Date\(2026,\s*11,\s*26/.test(SRC),
   "the cutoff is the start of 26 Dec 2026 local — i.e. the whole of the 25th is free");
ok(/darkOK\s*=\s*\(\)\s*=>\s*isPatron\(\)\s*\|\|\s*darkFree\(\)/.test(SRC),
   "…and one function answers 'may they have it', so the gate can't drift apart");

console.log("\n=== BEFORE THE DATE: OPEN TO EVERYONE ===");
let p=await at(b,DURING);
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await openPrefs(p);
ok(await p.evaluate(()=>!!document.getElementById("pfDark")),"a visitor with no perk gets the switch");
ok(await p.evaluate(()=>!document.querySelector(".prow.locked")),"…and no locked row");
ok(/Free for everyone until 25 December 2026/.test(await p.evaluate(()=>document.body.innerText)),
   "…and is told when it stops being free");
ok(!await isDark(p),"the site is light until they actually ask for it");
await p.click("#pfDark");await p.waitForTimeout(600);
ok(await isDark(p),"switching it on works");
await p.reload();await p.waitForTimeout(1700);
ok(await isDark(p),"…and survives a reload");
await p.click("#pfDark");await p.waitForTimeout(600);
ok(!await isDark(p),"…and off again");

console.log("\n=== THE THEME ACTUALLY CHANGES THE PAGE ===");
await p.evaluate(()=>{localStorage.setItem("fs3_dark",JSON.stringify(true));
  localStorage.setItem("fs3_tab",JSON.stringify("tDeck"));
  localStorage.setItem("fs3_opage",JSON.stringify(""))});
await p.reload();await p.waitForTimeout(2000);
const shot=await p.evaluate(()=>{
  const bg=getComputedStyle(document.body).backgroundColor;
  const lum=s=>{const m=s.match(/\d+/g).map(Number);
    return .2126*m[0]+.7152*m[1]+.0722*m[2]};
  return {bg,l:lum(bg)}});
ok(shot.l<90,`the page background is genuinely dark (${shot.bg})`);
ok(await p.evaluate(()=>document.querySelectorAll("#grid .c").length)>0,
   "…and the card grid still renders");
ok(errs.length===0,`no JS errors in the free window${errs.length?" — "+errs[0]:""}`);
await p.close();

console.log("\n=== AFTER THE DATE: BACK TO BEING A PERK ===");
p=await at(b,AFTER);
const errs2=[];p.on("pageerror",e=>errs2.push(e.message));
await p.evaluate(()=>localStorage.setItem("fs3_dark",JSON.stringify(true)));
await openPrefs(p);
ok(await p.evaluate(()=>!!document.querySelector(".prow.locked")),"a locked row explains the perk");
ok(await p.evaluate(()=>!document.getElementById("pfDark")),"…with no working switch behind it");
ok(!await isDark(p),
   "…and the preference someone set during the free window does NOT keep the theme on for ever");
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_dark"))===true),
   "…while that preference is remembered, so becoming a patron restores it");

console.log("--- and a patron still has it ---");
await setPatron(p,true);
await p.reload();await p.waitForTimeout(1700);
ok(await isDark(p),"a patron gets the theme back after the window closes");
await openPrefs(p);
ok(await p.evaluate(()=>!!document.getElementById("pfDark")),"…with a working switch");
ok(!/Free for everyone until/.test(await p.evaluate(()=>document.body.innerText)),
   "…and isn't told about a free window that has already ended");
await setPatron(p,false);
await p.reload();await p.waitForTimeout(1700);
ok(!await isDark(p),"a lapsed patron loses it again");

console.log("\n=== THE SETTINGS PAGE ONLY SHOWS SWITCHES THAT WORK ===");
await openPrefs(p);
ok(!/Not built yet/.test(await p.evaluate(()=>document.body.innerText)),
   "the 'Not built yet' section is gone");
ok(await p.evaluate(()=>document.querySelectorAll(".prow.soon").length)===0,
   "…and with it every disabled placeholder row");
ok(/const PREF_SOON=\[/.test(SRC),
   "…but they're parked in PREF_SOON, so shipping one is moving a line");

console.log("\n=== PRINT IS ALWAYS ON PAPER ===");
ok(await p.evaluate(()=>{
    const css=[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules]}catch(e){return []}});
    return css.some(r=>r.conditionText&&r.conditionText.includes("print")
      &&r.cssText.includes("body.dark"))}),
   "a print rule overrides the dark theme, so a pull sheet isn't a black page");
ok(errs2.length===0,`no JS errors after the window${errs2.length?" — "+errs2[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
