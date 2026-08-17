const {chromium}=require("/tmp/node_modules/playwright-core");
const F="file:///sessions/kind-modest-ride/mnt/outputs/flounder-search.html";
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1500);
const N=()=>p.evaluate(()=>parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10));
const type=async v=>{await p.fill("#q",v);await p.waitForTimeout(420);return N()};

console.log("\n=== TOGGLES EXIST, OFF BY DEFAULT ===");
ok(errs.length===0,`no JS errors${errs.length?" — "+errs[0]:""}`);
const t0=await p.evaluate(()=>({a:document.getElementById("tgTag").textContent.trim(),
  b:document.getElementById("tgSto").textContent.trim(),
  aOn:document.getElementById("tgTag").classList.contains("on"),
  bOn:document.getElementById("tgSto").classList.contains("on"),
  hint:document.getElementById("tgHint").textContent,
  below:document.querySelector(".sfield").compareDocumentPosition(document.querySelector(".toggles"))&4}));
ok(/Search art/.test(t0.a)&&/Search franchise/.test(t0.b),`labels: "${t0.a}" · "${t0.b}"`);
ok(t0.aOn&&!t0.bOn,"art starts ON, franchise starts off");   // v10: art is the headline feature
ok(!!t0.below,"…sitting below the search bar");
ok(/also match art tags/.test(t0.hint),`hint: "${t0.hint}"`);

console.log("\n=== ART TAG SWITCH ACTUALLY CHANGES RESULTS ===");
const onDog=await type("blue dog");
await p.click("#tgTag");await p.waitForTimeout(500);
const offDog=await type("blue dog");
ok(onDog>offDog,`"blue dog": ${onDog} on → ${offDog} off`);
await p.click("#tgTag");await p.waitForTimeout(500);
await type("blue dog");
const stitch=await p.evaluate(()=>[...document.querySelectorAll("#grid .c")].map(c=>c.dataset.f));
ok(stitch.some(f=>/^Stitch/.test(f)),`…and finds Stitch (${stitch.filter(f=>/Stitch/.test(f)).length} of them)`);
ok(stitch.some(f=>/Lilo & Stitch/.test(f)),`…including the duo card "Lilo & Stitch"`);
await p.click("#tgTag");await p.waitForTimeout(500);
ok(await type("blue dog")===offDog,"…and switching back off restores the tighter result");
await p.click("#tgTag");await p.waitForTimeout(500);

console.log("\n=== FRANCHISE SWITCH ===");
const offFz=await type("frozen");
await p.click("#tgSto");await p.waitForTimeout(500);
const onFz=await type("frozen");
ok(onFz>offFz,`"frozen": ${offFz} off → ${onFz} on`);
const fzHint=await p.evaluate(()=>document.getElementById("tgHint").textContent);
ok(/franchise/.test(fzHint),`hint updates: "${fzHint}"`);
await p.click("#tgSto");await p.waitForTimeout(400);

console.log("\n=== EXPLICIT TOKENS STILL WORK WITH SWITCHES OFF ===");
await p.fill("#q","");await p.waitForTimeout(300);
await p.fill("#q","Frozen");await p.press("#q","Enter");await p.waitForTimeout(400);
const tok=await p.evaluate(()=>({pill:document.querySelector(".pill")?document.querySelector(".pill").textContent:"",
  n:parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10)}));
ok(/📖/.test(tok.pill)&&tok.n>50,`Enter still makes a franchise pill (${tok.pill.replace("×","")} → ${tok.n})`);
await p.click("#clr");await p.waitForTimeout(400);

console.log("\n=== PREFERENCE PERSISTS ===");
await p.click("#tgTag");await p.waitForTimeout(400);   // turn art OFF
await p.reload();await p.waitForTimeout(1500);
ok(!await p.evaluate(()=>document.getElementById("tgTag").classList.contains("on")),
   "turning the art switch off survives a reload");
ok(!await p.evaluate(()=>document.getElementById("tgSto").classList.contains("on")),"…and the other stays off");
await p.click("#tgTag");await p.waitForTimeout(600);
const knob=await p.evaluate(()=>getComputedStyle(document.querySelector("#tgTag .kn i")).transform);
ok(/matrix\(1, 0, 0, 1, 20/.test(knob),`knob slid across when on (${knob})`);
await p.click("#tgTag");await p.waitForTimeout(600);
const offT=await p.evaluate(()=>getComputedStyle(document.querySelector("#tgTag .kn i")).transform);
ok(offT==="none"||/matrix\(1, 0, 0, 1, 0/.test(offT),`…and slides back when off (${offT})`);
await p.evaluate(()=>{document.getElementById("tgTag").click();document.getElementById("tgSto").click()});
await p.waitForTimeout(600);
await p.screenshot({path:"/sessions/kind-modest-ride/mnt/outputs/_shot_toggles.png",clip:{x:0,y:0,width:1100,height:230}});

console.log("\n=== ALIAS COVERAGE ===");
const cov=await p.evaluate(()=>{
  const tg=DATA.cards.filter(c=>(c.tg||[]).length);
  const duo=DATA.cards.filter(c=>/\s(?:&|'n')\s/.test(c.n));
  return {tagged:tg.length,duo:duo.length,duoTagged:duo.filter(c=>(c.tg||[]).length).length,
    van:(DATA.cards.find(c=>/Vanellope/.test(c.n))||{}).tg||[],
    nav:(DATA.cards.find(c=>/Prince Naveen/.test(c.n))||{}).tg||[]};
});
/* Not a fixed number — Ben adds tags and this should climb. The invariant is
   that coverage never goes BACKWARDS, which is what a bad merge of art-tags.json
   would look like. Raise the floor when a big batch lands. */
ok(cov.tagged>=866,`${cov.tagged} cards searchable by tag (floor 866)`);
const TAGSRC=JSON.parse(require("fs").readFileSync(__dirname+"/art-tags.json","utf8"));
ok(Object.keys(TAGSRC.cards).length>=33,
   `${Object.keys(TAGSRC.cards).length} cards hand-tagged in art-tags.json`);
ok(Object.keys(TAGSRC.aliases).length>=108,
   `${Object.keys(TAGSRC.aliases).length} characters have nicknames`);
const empty=Object.entries(TAGSRC.cards)
  .filter(([,v])=>!(v.t||[]).length&&!(v.a||[]).length).map(([k])=>k);
ok(empty.length<=1,`${empty.length} tagged card(s) are actually empty${empty.length?": "+empty.join(", "):""}`);
ok(cov.duoTagged>0,`${cov.duoTagged} of ${cov.duo} duo cards now inherit both characters' art words`);
ok(cov.van.includes("glitch"),`Vanellope typo fixed — now carries ${JSON.stringify(cov.van)}`);
ok(cov.nav.includes("green frog"),`Naveen key fixed — now carries ${JSON.stringify(cov.nav)}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
