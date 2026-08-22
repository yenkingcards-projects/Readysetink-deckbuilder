/* v40 — the second cosmetic pass, plus two things that were leaking.

   The interesting ones here are not the layout moves. They are:

   - The filter count span used class "c", which is ALSO the card-tile class.
     An empty 2px span inherited the tile's white fill and chrome border and
     painted a dot at the right of every filter heading. Invisible in a 230px
     sidebar; obvious the moment the panel went full width.

   - The million-dust title was hidden with a CSS blur. That hides it from a
     reader and from nobody else: the name sat in the HTML for devtools, for
     copy-paste, and for a screen reader. It is withheld at render time now.

   - Prestige used to announce itself on every owned title, including the gate
     text naming the secret title. Both are gone until it is bought. */
const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const SRC=require("fs").readFileSync(_W.FILE,"utf8");
const F=_W.URL;
const dustPage=async(p,dust)=>{
  await p.evaluate(d=>{localStorage.setItem("fs3_dust",JSON.stringify(d));
    localStorage.setItem("fs3_tab",JSON.stringify("tOther"));
    localStorage.setItem("fs3_opage",JSON.stringify("dust"))},dust);
  await p.reload();await p.waitForTimeout(1900);
  return p.evaluate(()=>document.getElementById("dustpage").innerHTML)};
const DUSTBASE={bal:9e9,got:{},open:[],titles:["t_pupil","t_brewer","t_binder"],
  hidden:["h_binder"],wear:"t_pupil",quiz:[],bucky:0,pr:{}};

(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(2100);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== FILTERS IS A BAR, LIKE SPECIAL SEARCHES ===");
const shape=await p.evaluate(()=>{const s=document.getElementById("side"),sp=document.getElementById("special");
  return {tag:s.tagName,cls:s.className,open:s.open,
    sameClass:s.classList.contains("special")&&sp.classList.contains("special"),
    order:[...document.getElementById("vSearch").children].map(x=>x.id||x.className.split(" ")[0])}});
ok(shape.tag==="DETAILS"&&shape.sameClass,
   "Filters is built from the same .special component as Special searches");
ok(!shape.open,"…closed on a first visit");
ok(shape.order.indexOf("side")===shape.order.indexOf("special")+1,
   `…and sits directly under it (${shape.order.join(" → ")})`);
console.log("--- the vertical spine is gone ---");
ok(!/writing-mode:vertical/.test(SRC),"no sideways text anywhere");
ok(!/\.sidesum/.test(SRC),"…and the spine's markup with it");
const w=await p.evaluate(()=>{const s=document.getElementById("side");
  return {closed:s.getBoundingClientRect().width,page:document.querySelector("main").getBoundingClientRect().width}});
ok(w.closed>w.page*0.9,
   `closed, the bar spans the page (${Math.round(w.closed)}px of ${Math.round(w.page)}px) rather than a 40px sliver`);
console.log("--- open, it lays out across the width ---");
await p.click("#side>summary");await p.waitForTimeout(600);
ok(await p.evaluate(()=>document.getElementById("side").open),"clicking the bar opens it");
ok(await p.evaluate(()=>document.querySelectorAll("#sidebody details.sec").length>=10),
   "…with every filter section inside");
ok(await p.evaluate(()=>parseFloat(getComputedStyle(document.getElementById("sidebody")).columnWidth)>0),
   "…in columns, not one very long list");
ok(await p.evaluate(()=>document.querySelectorAll(".wrap > #side").length)===0,
   "…and it is no longer a column of the card grid");

console.log("\n=== THE 2px DOT ON EVERY FILTER HEADING ===");
ok(await p.evaluate(()=>document.querySelectorAll("#sidebody summary .c").length)===0,
   'the count span no longer uses class "c", which is the card-tile class');
const dot=await p.evaluate(()=>{const s=document.querySelector("#sidebody details.sec>summary .secn");
  if(!s)return null;const cs=getComputedStyle(s);
  return {bg:cs.backgroundColor,bw:cs.borderTopWidth}});
ok(dot&&/rgba\(0, ?0, ?0, ?0\)|transparent/.test(dot.bg)&&parseFloat(dot.bw)===0,
   `…so an empty count paints nothing (bg ${dot&&dot.bg}, border ${dot&&dot.bw})`);
ok(await p.evaluate(()=>getComputedStyle(document.querySelector("#special>summary"),"::marker").content)==='""',
   "…and the browser's own summary marker stays hidden too");

console.log("\n=== THE DECK BAR MOVED INTO THE DECK ===");
ok(await p.evaluate(()=>!document.querySelector(".deckbar")),"the full-width bar is gone");
ok(!/class="deckbar"/.test(SRC),"…markup and all");
const dh=await p.evaluate(()=>{const d=document.getElementById("deck");
  return {inPanel:!!d.querySelector(".dhead"),
    name:!!d.querySelector("#dbName"),dirty:!!d.querySelector("#dbDirty"),
    save:!!d.querySelector("#dbSave")}});
ok(dh.inPanel&&dh.name&&dh.save&&dh.dirty,
   "name, unsaved flag and Save all live inside the deck panel now");
console.log("--- and Save still works after a re-render ---");
await p.evaluate(()=>{const c=document.querySelectorAll("#grid .c")[0];
  (c.querySelector("img")||c.querySelector(".ph")).click()});
await p.waitForTimeout(700);
ok(await p.evaluate(()=>!document.getElementById("dbDirty").hidden),
   "adding a card raises the unsaved flag");
await p.click("#dbSave");await p.waitForTimeout(600);
ok(await p.evaluate(()=>!!document.querySelector(".cfm")),
   "…and Save opens the name dialog even though the panel was rebuilt around it");
await p.evaluate(()=>{const n=document.querySelector(".cfm [data-no]");if(n)n.click()});
await p.waitForTimeout(300);

console.log("\n=== STAPLES STANDS ALONE, TRIBES TOGETHER ===");
await p.goto(F);await p.waitForTimeout(2100);
const groups=await p.evaluate(()=>[...document.querySelectorAll("#groups details.grp[data-g]")]
  .map(d=>({g:d.dataset.g,chips:[...d.querySelectorAll("[data-a]")].map(c=>c.dataset.a)})));
const gOf=id=>(groups.find(g=>g.chips.includes(id))||{}).g;
ok(gOf("staple")==="Staples",`Staples is its own group`);
ok(groups.find(g=>g.g==="Staples").chips.length===1,"…with nothing else in it");
ok(gOf("tribal")===gOf("lilo")&&gOf("tribal")!=="Staples",
   `Tribal boost and Lilo & Stitch moved out together, into "${gOf("tribal")}"`);

console.log("\n=== THE COCONUT BLOCK ===");
const coco=await p.evaluate(()=>{const c=document.getElementById("cocogrp");
  if(!c)return null;
  const gs=[...document.querySelectorAll("#groups > details.grp")];
  return {open:c.open,last:gs[gs.length-1].id==="cocogrp",
    rows:c.querySelectorAll(".cocorow").length,
    names:[...c.querySelectorAll(".cocon")].map(x=>x.textContent.trim()),
    chips:[...c.querySelectorAll(".cocorow")].map(r=>r.querySelectorAll("[data-a]").length),
    hasG:c.hasAttribute("data-g")}});
ok(!!coco,"there is a Coconut block");
ok(coco.last,"…at the very bottom of Special searches");
ok(!coco.open,"…closed on arrival");
ok(coco.rows>=18,`…listing ${coco.rows} Coconuts`);
ok(coco.chips.every(n=>n>0),"…each with at least one recommended synergy under it");
ok(coco.names[0].includes("Scar"),`…named (“${coco.names[0]}”)`);
ok(!coco.hasG,
   "…and carrying no data-g, which is what keeps it out of the remembered open/closed list");
console.log("--- it stays closed across reloads, even after being opened ---");
await p.evaluate(()=>document.getElementById("cocogrp").open=true);
await p.waitForTimeout(400);
await p.evaluate(()=>document.querySelector("#cocogrp .chip").click());
await p.waitForTimeout(900);
ok(await p.evaluate(()=>document.getElementById("cocogrp").open),
   "clicking a filter inside does NOT slam it shut under your finger");
await p.reload();await p.waitForTimeout(2100);
ok(await p.evaluate(()=>!document.getElementById("cocogrp").open),
   "…but a reload starts it closed again, every time");
console.log("--- and a Coconut's name opens its card ---");
await p.evaluate(()=>{document.getElementById("cocogrp").open=true});
await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector(".cocon").click());
await p.waitForTimeout(800);
ok(await p.evaluate(()=>document.getElementById("mbg").classList.contains("on")),
   "clicking the name opens the card");
await p.evaluate(()=>{const x=document.getElementById("mx");if(x)x.click()});

console.log("\n=== BINDER WALKER IS NOW MEME TEAM ===");
let html=await dustPage(p,DUSTBASE);
ok(/Meme Team/.test(html),"the hidden title reads Meme Team");
ok(!/Binder Walker/.test(html),"…and Binder Walker is gone from the page");
ok(!/Binder Walker/.test(SRC),"…and from the source");
ok(/Binder Runner/.test(html),
   "…while Binder Runner, a different title, is untouched");

console.log("\n=== THE MILLION-DUST TITLE KEEPS ITS NAME ===");
ok(!/Flounderborn/.test(html),"its name appears nowhere on the dust page");
ok(!/friends you make along the way[^<]*<\/div>\s*<button[^>]*data-title="t_fish"/.test(html),
   "…nor its description");
const secretRow=await p.evaluate(()=>{const r=[...document.querySelectorAll(".tit")]
  .find(x=>x.className.includes("blur"));
  return r?{t:r.querySelector(".tt").textContent,d:r.querySelector(".td").textContent}:null});
ok(secretRow&&secretRow.t==="???",`…the row shows “${secretRow&&secretRow.t}” instead`);
ok(secretRow&&!/friends you make/.test(secretRow.d),"…with a placeholder description");
ok(await p.evaluate(()=>!!document.querySelector('[data-title="t_fish"]')),
   "…but it is still there to be bought");
console.log("--- withheld, not blurred ---");
/* The honest limit: the name IS in the page's <script>, because the app has to
   know it in order to show it once the title is bought. What changed is that
   it no longer reaches the document — it isn't in any rendered element, isn't
   in the text a screen reader reads, and isn't sitting under a CSS blur
   waiting for devtools. Short of shipping it obfuscated, that is as withheld
   as a client-side title can be, and it is worth saying so out loud rather
   than claiming more. */
ok(await p.evaluate(()=>{
    const inEls=[...document.querySelectorAll("body *")]
      .some(el=>el.tagName!=="SCRIPT"&&!el.children.length&&/Flounderborn/.test(el.textContent));
    return !inEls&&!/Flounderborn/.test(document.body.innerText)}),
   "the name reaches no rendered element and no readable text — only the script that will one day print it");
ok(!/filter:blur\(5px\)/.test(SRC),
   "…and the CSS blur that used to paint over it is gone entirely");
ok(await p.evaluate(()=>{const r=[...document.querySelectorAll(".tit")]
    .find(x=>x.className.includes("blur"));
    return !!r&&getComputedStyle(r.querySelector(".tt")).filter==="none"}),
   "…so the row is legibly “???” rather than a smear that reads as a broken page");

console.log("\n=== PRESTIGE IS NOT MENTIONED UNTIL IT IS EARNED ===");
ok(!/[Pp]restige/.test(html),"no title offers a prestige button");
ok(await p.evaluate(()=>document.querySelectorAll("[data-pr]").length)===0,"…none at all");
ok(!/prestige 10 first/i.test(html),
   "…and no gate text explaining what you'd have to do first");
console.log("--- once it is bought, both appear ---");
html=await dustPage(p,{...DUSTBASE,titles:DUSTBASE.titles.concat("t_fish")});
ok(/Flounderborn/.test(html),"buying it reveals the name");
ok(await p.evaluate(()=>document.querySelectorAll("[data-pr]").length)>0,
   "…and prestige becomes available");
ok(/prestige 10 first/i.test(html),
   "…including the gate text, which is now safe to show");

ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);
console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
