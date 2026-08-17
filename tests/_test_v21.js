const {chromium}=require("/tmp/node_modules/playwright-core");
const SRC=require("fs").readFileSync(__dirname+"/flounder-search.html","utf8");
const HIDDEN_SRC=SRC.slice(SRC.indexOf("const HIDDEN=["),SRC.indexOf("const SECRETS=["));
const nHidden=(HIDDEN_SRC.match(/\{id:"h_/g)||[]).length;
const nSecret=(HIDDEN_SRC.match(/secret:true/g)||[]).length;
const nOpen=nHidden-nSecret;
const GRP_SRC=SRC.slice(SRC.indexOf("const OTHER_GROUPS=["),SRC.indexOf("function renderOther"));
const nTiles=(GRP_SRC.match(/","[a-z]+(:[a-z]+)?"\]/g)||[]).length;
const F="file:///sessions/kind-modest-ride/mnt/outputs/flounder-search.html";
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("dialog",d=>d.accept());
await p.goto(F);await p.waitForTimeout(1900);
const D=()=>p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_dust")||"{}"));
const openPage=async op=>{await p.evaluate(o=>{localStorage.setItem("fs3_opage",JSON.stringify(o));
  localStorage.setItem("fs3_tab",JSON.stringify("tOther"))},op);await p.reload();await p.waitForTimeout(1600)};
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== BONUS WILLPOWER ===");
const wp=await p.evaluate(()=>DATA.cards.filter(c=>
  /\bgets?\s*\+\d+\s*⛉/.test((c.ef||"").replace(/\([^)]*\)/g," "))).length);
for(const w of ["bonus willpower","plus willpower","more health","tougher"]){
  await p.evaluate(()=>{const c=document.getElementById("clr");if(c)c.click()});await p.waitForTimeout(280);
  await p.fill("#q",w);await p.press("#q","Enter");await p.waitForTimeout(430);
  const r=await p.evaluate(()=>({n:parseInt(document.getElementById("ct").textContent.replace(/[^\d]/g,""),10),
    pill:document.querySelector(".pill")?document.querySelector(".pill").textContent:""}));
  ok(r.n===wp&&/willpower/i.test(r.pill),`"${w}" → ${r.n} cards via ${r.pill.replace("×","").trim()}`);
}
await p.evaluate(()=>document.getElementById("clr").click());await p.waitForTimeout(300);
ok(wp===15,`${wp} cards grant bonus willpower`);

console.log("\n=== BEN'S TAKE / VIDEO CHIPS HIDDEN ===");
const chips=await p.evaluate(()=>[...document.querySelectorAll("#groups .chip")].map(c=>c.textContent));
ok(!chips.some(c=>/Ben's take/.test(c)),"no Ben's take chip");
ok(!chips.some(c=>/🎬 Video/.test(c)),"no Video chip");
ok(chips.some(c=>/Watch out/.test(c))&&chips.some(c=>/Trivia/.test(c)),"…the other three kinds are still there");
ok(await p.evaluate(()=>/HIDDEN_KINDS=\["take","video"\]/.test(document.documentElement.innerHTML)),
   "…and one list controls it, so turning them back on is a one-word change");

console.log("\n=== THE PERFECT 60 IS INVISIBLE ===");
await openPage("dust");
const hid=await p.evaluate(()=>({
  shown:[...document.querySelectorAll(".tit.hid")].length,
  counter:document.querySelector(".hn").textContent.trim(),
  anyMention:/Perfect 60/.test(document.querySelector("#dustpage").textContent)}));
ok(nSecret===2,`${nSecret} titles are marked secret in the source`);
ok(hid.shown===nOpen,`${hid.shown} hidden titles visible as ??? — the secret ones aren't among them`);
ok(hid.counter===`0 / ${nOpen}`,`counter reads ${hid.counter}, so nothing hints they exist`);
ok(!await p.evaluate(()=>/One Hundred Friends/.test(document.querySelector("#dustpage").textContent)),
   "…and the 100-Flounder title isn't named on the page either");
ok(!hid.anyMention,"…and its name appears nowhere on the page");

console.log("\n=== …UNTIL YOU BUILD IT ===");
await p.evaluate(()=>{localStorage.setItem("fs3_tab",JSON.stringify("tDeck"));
  localStorage.setItem("fs3_opage",JSON.stringify(""));});
await p.reload();await p.waitForTimeout(1600);
// make sure the deck store exists before writing to it
await p.fill("#q","Flounder - Voice of Reason");await p.waitForTimeout(500);
await p.evaluate(()=>{const e=document.querySelector("#grid .c img");if(e)e.click()});
await p.waitForTimeout(400);
// 59 copies first — must NOT fire
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem("fs3_decks"));
  d.list[d.cur].cards={"Flounder - Voice of Reason":59};
  localStorage.setItem("fs3_decks",JSON.stringify(d))});
await p.reload();await p.waitForTimeout(1500);
await p.fill("#q","Flounder - Voice of Reason");await p.waitForTimeout(500);
ok(!((await D()).hidden||[]).includes("h_60"),"59 copies does nothing");
// the 60th
await p.evaluate(()=>{const e=document.querySelector("#grid .c [data-plus]");if(e)e.click()});
await p.waitForTimeout(600);
let d=await D();
ok((d.hidden||[]).includes("h_60"),"the 60th copy unlocks The Perfect 60");
ok(d.bal>=500000,`…paying ${d.bal.toLocaleString()} dust`);
// a 60-card deck of something else must not fire
await p.evaluate(()=>{const dd=JSON.parse(localStorage.getItem("fs3_dust"));
  dd.hidden=dd.hidden.filter(x=>x!=="h_60");dd.bal=0;localStorage.setItem("fs3_dust",JSON.stringify(dd));
  const k=JSON.parse(localStorage.getItem("fs3_decks"));
  k.list[k.cur].cards={"Elsa - Snow Queen":60};localStorage.setItem("fs3_decks",JSON.stringify(k))});
await p.reload();await p.waitForTimeout(1500);
await p.fill("#q","Elsa - Snow Queen");await p.waitForTimeout(450);
await p.evaluate(()=>{const e=document.querySelector("#grid .c [data-minus]");if(e)e.click()});
await p.waitForTimeout(500);
ok(!((await D()).hidden||[]).includes("h_60"),"60 of a different card does nothing");
// and now it shows on the page
await p.evaluate(()=>{const dd=JSON.parse(localStorage.getItem("fs3_dust"));
  dd.hidden=[...(dd.hidden||[]),"h_60"];localStorage.setItem("fs3_dust",JSON.stringify(dd))});
await openPage("dust");
ok(await p.evaluate(()=>/The Perfect 60/.test(document.querySelector("#dustpage").textContent)),
   "once earned it appears like any other");

console.log("\n=== READER: FIXED ARROW, EDGES, NOTES ===");
await p.evaluate(()=>{localStorage.setItem("fs3_opage",JSON.stringify("read"));
  localStorage.setItem("fs3_read",JSON.stringify({set:"13",ink:"Amber",i:0}));
  localStorage.setItem("fs3_rview",JSON.stringify("read"))});
await p.reload();await p.waitForTimeout(1700);
ok(await p.evaluate(()=>!!document.getElementById("rNext2")&&!!document.getElementById("rPrev2")),
   "side arrows exist for tapping");
ok(await p.evaluate(()=>document.getElementById("rPrev2").disabled),"…left one disabled on card 1");
// the Next button must not move between cards of very different length
const posOf=()=>p.evaluate(()=>{const r=document.getElementById("rNext").getBoundingClientRect();
  return {y:Math.round(r.y),x:Math.round(r.x)}});
const p1=await posOf();
let moved=0;
for(let i=0;i<6;i++){await p.click("#rNext");await p.waitForTimeout(520);
  const q=await posOf();if(q.y!==p1.y||q.x!==p1.x)moved++;}
ok(moved===0,`the Next button stayed at the same spot across 6 cards (${p1.x},${p1.y})`);
ok(await p.evaluate(()=>getComputedStyle(document.getElementById("rstage")).overflow)==="hidden",
   "…because the stage is a fixed frame");
ok(await p.evaluate(()=>/@keyframes rslideR/.test(document.documentElement.innerHTML)&&
   /@keyframes rslideL/.test(document.documentElement.innerHTML)),"wheel animation defined both ways");
ok(await p.evaluate(()=>/touchstart/.test(document.documentElement.innerHTML)&&
   /touchend/.test(document.documentElement.innerHTML)),"swipe handlers wired");

console.log("\n=== READER SHOWS THE EXTRA INFO ===");
const noted=await p.evaluate(()=>{
  const c=DATA.cards.find(x=>(x.ru||[]).length&&x.s==="13"&&(x.co||[]).includes("Amber"))
        ||DATA.cards.find(x=>(x.ru||[]).length);
  return {set:x=>0,f:c.n+(c.v?" - "+c.v:""),s:c.s,ink:(c.co||[])[0],n:(c.ru||[]).length}});
await p.evaluate(n=>{localStorage.setItem("fs3_read",JSON.stringify({set:n.s,ink:n.ink,i:0}))},noted);
await p.reload();await p.waitForTimeout(1700);
const found=await p.evaluate(f=>{
  for(let i=0;i<40;i++){const h=document.querySelector(".rtext h2");
    if(h&&f.startsWith(h.textContent)){const r=document.querySelector(".rtext .rulings");
      if(r)return r.textContent.slice(0,60)}
    const b=document.getElementById("rNext");if(b)b.click();}
  return null},noted.f);
ok(!!found||await p.evaluate(()=>!!document.querySelector(".rtext .rulings")),
   "official rulings render inside the reader");
ok(await p.evaluate(()=>/rtext \.rulings/.test(document.documentElement.innerHTML)),
   "…and are styled to run full length there");
ok(await p.evaluate(()=>/class="rflav"/.test(document.documentElement.innerHTML)),"flavour text shown too");

console.log("\n=== OTHER PAGE GROUPED ===");
await openPage("");
const groups=await p.evaluate(()=>{
  const out=[];let cur={g:"",n:0};
  [...document.getElementById("otherTiles").children].forEach(el=>{
    if(el.tagName==="H3"){out.push(cur);cur={g:el.textContent.trim(),n:0}}
    else cur.n=el.querySelectorAll(".tile").length});
  out.push(cur);return out.filter(x=>x.n)});
ok(groups.length===2,`${groups.length} shelves: ${groups.map(g=>`${g.g||"(top)"}(${g.n})`).join(" · ")}`);
const first=await p.evaluate(()=>document.querySelector("#otherTiles .tile h3").textContent);
ok(/Dust & secrets/.test(first),`"${first}" is first`);
ok(groups.some(g=>/Mini games/.test(g.g)),"Mini games shelf exists");
// every page is real now, so the "Coming soon" shelf is empty and not rendered
ok(!groups.some(g=>/Coming soon/.test(g.g)),"no Coming soon shelf — nothing is a placeholder any more");

console.log("\n=== CONTRIBUTE LINKS ===");
await openPage("contrib");
const links=await p.evaluate(()=>[...document.querySelectorAll("#contribpage a")].map(a=>a.href));
ok(links.some(l=>l.includes("lorcana707.github.io/Flounder-art-tagger")),"art tagger link");
ok(links.some(l=>l.includes("lorcana707.github.io/RSI-Rules-inputting")),"rules text inputter link");
ok(await p.evaluate(()=>[...document.querySelectorAll("#contribpage a[target=_blank]")]
   .every(a=>/noopener/.test(a.rel))),"…both open safely in a new tab");
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
