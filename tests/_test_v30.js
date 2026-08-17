/* v30 — errata, foiling, reading progress, and the archive redesign. */
const {chromium}=require("/tmp/node_modules/playwright-core");
const SRC=require("fs").readFileSync(__dirname+"/flounder-search.html","utf8");
const F="file://"+__dirname+"/flounder-search.html";
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(2000);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);
const openCard=async f=>{await p.click("#tSearch");await p.waitForTimeout(300);
  await p.fill("#q",f);await p.waitForTimeout(700);
  await p.evaluate(n=>{const t=[...document.querySelectorAll("#grid .c")].find(x=>x.dataset.f===n);
    t.querySelector("[data-i]").click()},f);await p.waitForTimeout(600)};

console.log("\n=== OFFICIAL ERRATA ===");
const er=await p.evaluate(()=>DATA.cards.filter(c=>c.er&&c.er.length)
  .map(c=>c.v?c.n+" - "+c.v:c.n));
ok(er.length===8,`${er.length} cards carry official errata`);
ok(er.includes("Bucky - Squirrel Squeak Tutor"),"…including Bucky, the one that was outstanding");
const bucky=await p.evaluate(()=>DATA.cards.find(c=>/^Bucky/.test(c.n)).er.join(" "));
ok(/Cost: 2 --> 3/.test(bucky),"Bucky's real cost change is there");
ok(/Ward --> No keyword/.test(bucky),"…and the Ward removal");
ok(/used Shift to play them/.test(bucky),"…and the corrected Squeak wording");
ok(/August 9th, 2024/.test(bucky),"…dated, from Ravensburger, not written from memory");
ok(!/\\\\/.test(bucky),"…with LorcanaJSON's backslash markers cleaned up");
ok(/“Squeak”/.test(bucky),"…turned into real quotation marks");

console.log("\n=== FOILING ===");
const fo=await p.evaluate(()=>{
  const cards=DATA.cards.filter(c=>c.ft&&c.ft.length);
  const prints=DATA.cards.flatMap(c=>c.pr||[]).filter(x=>x.ft&&x.ft.length);
  const all=cards.concat(prints);
  return {n:all.length,masks:all.filter(x=>x.fm).length,
          types:[...new Set(all.flatMap(x=>x.ft))],
          silver:all.filter(x=>x.ft.includes("Silver")).length}});
ok(fo.n>400,`${fo.n} foiled printings shipped`);
ok(fo.masks===fo.n,"every one has its foil mask");
ok(fo.silver===0,"plain Silver is excluded — it's on nearly every card and would be noise");
ok(fo.types.length>=10,`${fo.types.length} distinct patterns: ${fo.types.slice(0,5).join(", ")}…`);
const foilCard=await p.evaluate(()=>{const c=DATA.cards.find(c=>c.ft&&c.ft.length&&c.fm);
  return c.v?c.n+" - "+c.v:c.n});
await openCard(foilCard);
const layer=await p.evaluate(()=>{const l=document.querySelector("#modal .foil");
  if(!l)return null;const s=getComputedStyle(l);
  return {mix:s.mixBlendMode,blend:s.backgroundBlendMode,anim:s.animationName,
          bg:s.backgroundImage,z:!!document.querySelector("#modal .mimg")}});
ok(layer,`${foilCard} has a foil layer`);
ok(layer.mix==="screen","…screened onto the art, so it adds light rather than covering it");
ok(/multiply/.test(layer.blend),"…and multiplied by the mask, so light lands only on the foil");
ok(/lorcana/.test(layer.bg),"…using Ravensburger's real mask image");
ok(layer.anim==="sheen","…and it moves");
ok(await p.evaluate(()=>/foil/i.test((document.querySelector(".foilbadge")||{}).textContent||"")),
   `…and the pattern is named on the card (${await p.evaluate(()=>(document.querySelector(".foilbadge")||{}).textContent||"")})`);
const plain=await p.evaluate(()=>{const c=DATA.cards.find(c=>!c.ft);return c.v?c.n+" - "+c.v:c.n});
await p.evaluate(()=>document.getElementById("mx").click());
await openCard(plain);
ok(!await p.evaluate(()=>!!document.querySelector("#modal .foil")),
   "a non-foil card gets no layer at all");

console.log("\n=== READING PROGRESS ===");
await p.evaluate(()=>{localStorage.removeItem("fs3_seen");localStorage.removeItem("fs3_read");
  localStorage.setItem("fs3_tab",JSON.stringify("tOther"));
  localStorage.setItem("fs3_opage",JSON.stringify("read"))});
await p.reload();await p.waitForTimeout(1700);
const t0=await p.evaluate(()=>document.querySelector(".rall").textContent.replace(/\s+/g," ").trim());
ok(/^0 of [\d,]+ cards read/.test(t0),`starts at nothing (${t0})`);
ok(await p.evaluate(()=>document.querySelectorAll(".rink.done").length===0),"no ink claims to be finished");
ok(await p.evaluate(()=>document.querySelectorAll(".rset .rsbar").length>10),"every set has a progress bar");
// read the shortest section to the end
await p.evaluate(()=>{const bs=[...document.querySelectorAll(".rink")];
  bs.sort((a,b)=>+a.querySelector("span").textContent.split("/")[1]
                -+b.querySelector("span").textContent.split("/")[1]);bs[0].click()});
await p.waitForTimeout(700);
for(let i=0;i<80;i++){
  const on=await p.evaluate(()=>{const b=document.getElementById("rNext");if(!b)return false;b.click();return true});
  await p.waitForTimeout(90);
  if(await p.evaluate(()=>!!document.querySelector(".rsets")))break;
}
await p.waitForTimeout(600);
const fin=await p.evaluate(()=>({
  done:[...document.querySelectorAll(".rink.done")].map(b=>b.textContent.replace(/\s+/g," ").trim()),
  all:document.querySelector(".rall").textContent.replace(/\s+/g," ").trim(),
  seen:JSON.parse(localStorage.getItem("fs3_seen")||"[]").length}));
ok(fin.done.length===1,`finishing a section marks exactly one ink done (${fin.done[0]})`);
ok(/✦/.test(fin.done[0]),"…with a mark you can see at a glance");
ok(fin.seen>0&&/^[1-9]/.test(fin.all),`…and the overall count moved (${fin.all})`);
await p.reload();await p.waitForTimeout(1600);
ok(await p.evaluate(()=>document.querySelectorAll(".rink.done").length===1),
   "…and it survives a reload");
// re-reading must not double-count
const before=await p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_seen")).length);
await p.evaluate(()=>document.querySelector(".rink.done").click());await p.waitForTimeout(600);
await p.evaluate(()=>{const b=document.getElementById("rNext");if(b)b.click()});await p.waitForTimeout(400);
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_seen")).length)===before,
   "re-reading a card you've seen doesn't count twice");
ok(/SETLOGOS=false/.test(SRC),"set logos are wired up and waiting on the images");

/* The look is now the ReadySetInk console-chrome system; _test_v31 owns all of
   the visual assertions. What still belongs here are the things that must
   survive ANY reskin. */
console.log("\n=== SURVIVES A RESKIN ===");
await p.evaluate(()=>localStorage.setItem("fs3_opage",JSON.stringify("")));
await p.reload();await p.waitForTimeout(1600);
ok(await p.evaluate(()=>![...document.querySelectorAll("nav.tabs button")]
   .some(b=>/[\u{1F300}-\u{1FAFF}]/u.test(b.textContent))),"no emoji in the tab bar");
ok(await p.evaluate(()=>![...document.querySelectorAll(".tile h3")]
   .some(h=>/[\u{1F300}-\u{1FAFF}]/u.test(h.textContent))),"…nor on any tile");
ok(!/&amp;amp;/.test(SRC),"no double-escaped ampersands");
ok(await p.evaluate(()=>{const t=document.querySelector(".tile h3");
  return t&&getComputedStyle(t).color!==getComputedStyle(t.closest(".tile")).backgroundColor}),
   "tile text is never the same colour as the tile it sits on");

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
