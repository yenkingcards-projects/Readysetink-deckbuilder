/* v36 — dark mode, and the patron gate in front of it.

   The contrast of the dark palette is _test_v33's job — it now audits both
   themes. This suite covers the switch itself: that it is genuinely gated, that
   the gate can't be walked around by setting the preference directly, and that
   losing patron status takes the theme away again rather than leaving it on. */
const {chromium}=require("/tmp/node_modules/playwright-core");
const F="file://"+__dirname+"/flounder-search.html";
const openPrefs=async p=>{
  await p.evaluate(()=>{localStorage.setItem("fs3_tab",JSON.stringify("tOther"));
    localStorage.setItem("fs3_opage",JSON.stringify("pref"))});
  await p.reload();await p.waitForTimeout(1700)};
const setPatron=(p,v)=>p.evaluate(v=>{const d=JSON.parse(localStorage.getItem("fs3_dust")||"{}");
  d.patron=v;d.bal=d.bal||0;localStorage.setItem("fs3_dust",JSON.stringify(d))},v);

(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1300,height:950}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1900);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);
const isDark=()=>p.evaluate(()=>document.body.classList.contains("dark"));

console.log("\n=== LOCKED WITHOUT THE PERK ===");
await openPrefs(p);
ok(await p.evaluate(()=>!!document.querySelector(".prow.locked")),"a locked row explains the perk");
ok(await p.evaluate(()=>!document.getElementById("pfDark")),"…with no working switch behind it");
ok(!await isDark(),"and the site is light");

console.log("--- and the preference alone doesn't unlock it ---");
await p.evaluate(()=>localStorage.setItem("fs3_dark","true"));
await p.reload();await p.waitForTimeout(1700);
ok(!await isDark(),
   "setting the stored preference by hand does NOT turn the theme on");

console.log("\n=== UNLOCKED WITH IT ===");
await setPatron(p,true);
await openPrefs(p);
ok(await p.evaluate(()=>!!document.getElementById("pfDark")),"a patron gets the switch");
ok(await isDark(),"…and the preference they'd already set is honoured");
await p.click("#pfDark");await p.waitForTimeout(600);
ok(!await isDark(),"switching it off works");
await p.click("#pfDark");await p.waitForTimeout(600);
ok(await isDark(),"…and back on");
await p.reload();await p.waitForTimeout(1700);
ok(await isDark(),"the choice survives a reload");

console.log("\n=== LOSING THE PERK TAKES THE THEME WITH IT ===");
await setPatron(p,false);
await p.reload();await p.waitForTimeout(1700);
ok(!await isDark(),
   "a lapsed patron goes back to the light theme rather than keeping it for ever");
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_dark"))===true),
   "…while their preference is remembered, so renewing restores it");

console.log("\n=== THE THEME ACTUALLY CHANGES THE PAGE ===");
await setPatron(p,true);
await p.evaluate(()=>{localStorage.setItem("fs3_tab",JSON.stringify("tDeck"));
  localStorage.setItem("fs3_opage",JSON.stringify(""))});
await p.reload();await p.waitForTimeout(2000);
const shot=await p.evaluate(()=>{
  const bg=getComputedStyle(document.body).backgroundColor;
  const lum=s=>{const m=s.match(/\d+/g).map(Number);
    return .2126*m[0]+.7152*m[1]+.0722*m[2]};
  return {bg,l:lum(bg),tx:getComputedStyle(document.querySelector(".lede")||document.body).color}});
ok(shot.l<90,`the page background is genuinely dark (${shot.bg})`);
ok(await p.evaluate(()=>document.querySelectorAll("#grid .c").length)>0,
   "…and the card grid still renders");

console.log("\n=== PRINT IS ALWAYS ON PAPER ===");
ok(await p.evaluate(()=>{
    const css=[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules]}catch(e){return []}});
    return css.some(r=>r.conditionText&&r.conditionText.includes("print")
      &&r.cssText.includes("body.dark"))}),
   "a print rule overrides the dark theme, so a pull sheet isn't a black page");
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
