const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;
const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};

// --- location modal at several window sizes ---
console.log("\n=== LOCATION MODAL FILLS ITS FRAME AT EVERY SIZE ===");
for(const vp of [{width:1440,height:950},{width:1100,height:800},{width:1040,height:640},{width:760,height:900}]){
  const p=await b.newPage({viewport:vp});
  await p.goto(F);await p.waitForTimeout(1400);
  await p.fill("#q","Hundred Acre Wood");await p.waitForTimeout(600);
  await p.evaluate(()=>document.querySelector("#grid .c [data-i]").click());await p.waitForTimeout(800);
  const r=await p.evaluate(()=>{
    const f=document.querySelector(".locframe"),i=f.querySelector("img");
    const F=f.getBoundingClientRect(),I=i.getBoundingClientRect();
    return {fw:+F.width.toFixed(1),fh:+F.height.toFixed(1),iw:+I.width.toFixed(1),ih:+I.height.toFixed(1),
      clipTop:+(F.top-I.top).toFixed(1),clipBot:+(I.bottom-F.bottom).toFixed(1),
      clipL:+(F.left-I.left).toFixed(1),clipR:+(I.right-F.right).toFixed(1)};
  });
  const clipped=Math.max(r.clipTop,r.clipBot,r.clipL,r.clipR);
  ok(clipped<=1.5,`${vp.width}×${vp.height}: frame ${r.fw}×${r.fh}, card ${r.iw}×${r.ih}, worst overflow ${clipped.toFixed(1)}px`);
  if(vp.width===1440)await p.screenshot({path:_W.data("_shot_loc_modal.png")});
  await p.close();
}

const p=await b.newPage({viewport:{width:1440,height:950}});
await p.goto(F);await p.waitForTimeout(1400);

console.log("\n=== ⓘ SITS ON THE ROTATED PREVIEW ===");
await p.fill("#q","Paradise Falls");await p.waitForTimeout(600);
await p.hover("#grid .c img");await p.waitForTimeout(1600);
const h=await p.evaluate(()=>{
  const c=document.querySelector("#grid .c"),i=c.querySelector("img"),btn=c.querySelector(".i"),tg=c.querySelector(".tags");
  const I=i.getBoundingClientRect(),B=btn.getBoundingClientRect();
  return {prevW:+I.width.toFixed(0),prevH:+I.height.toFixed(0),
    dx:+(B.left-I.left).toFixed(1),dy:+(B.top-I.top).toFixed(1),
    inside:B.left>=I.left-2&&B.top>=I.top-2&&B.right<=I.right&&B.bottom<=I.bottom,
    outline:getComputedStyle(i).outlineWidth+" "+getComputedStyle(i).outlineColor,
    tagsHidden:tg?getComputedStyle(tg).opacity:"n/a"};
});
ok(h.inside,`ⓘ is inside the ${h.prevW}×${h.prevH} preview`);
ok(h.dx>0&&h.dx<70&&h.dy>0&&h.dy<70,`…tucked into its top-left corner (+${h.dx}, +${h.dy}px)`);
ok(parseFloat(h.outline)>=2,`…and the preview is outlined (${h.outline})`);
await p.screenshot({path:_W.data("_shot_loc_hover.png")});

console.log("\n=== ⓘ GLOWS AFTER 7s ===");
await p.fill("#q","Ariel - Spectacular Singer");await p.waitForTimeout(600);
await p.hover("#grid .c img");await p.waitForTimeout(1500);
const g1=await p.evaluate(()=>getComputedStyle(document.querySelector("#grid .c .i")).boxShadow);
await p.waitForTimeout(6500);
const g2=await p.evaluate(()=>getComputedStyle(document.querySelector("#grid .c .i")).boxShadow);
ok(g1==="none"||!/rgba?\(255/.test(g1),"no glow at 1.5s");
ok(/rgba?\(255,\s*199,\s*64/.test(g2),`glow present at 8s (${g2.slice(0,52)}…)`);

console.log("\n=== QUEST CARDS ===");
await p.fill("#q","");await p.waitForTimeout(400);
await p.evaluate(()=>{document.getElementById("q").value="set:Q1";
  document.getElementById("q").dispatchEvent(new Event("input",{bubbles:true}))});
await p.waitForTimeout(700);
const qz=await p.evaluate(()=>{
  const cs=[...document.querySelectorAll("#grid .c")];
  const t=cs[0];
  return {n:cs.length,illegal:cs.filter(c=>c.classList.contains("illegal")).length,
    tag:t.querySelector(".tags .quest")?t.querySelector(".tags .quest").textContent:null,
    tagBg:t.querySelector(".tags .quest")?getComputedStyle(t.querySelector(".tags .quest")).backgroundColor:null,
    why:t.querySelector(".why")?t.querySelector(".why").textContent:null,
    canAdd:!!t.querySelector("img")};
});
ok(qz.n>0&&qz.illegal===qz.n,`all ${qz.n} Q1 cards flagged not legal`);
ok(/Don't even think about adding this card/i.test(qz.tag||""),`top tag: "${qz.tag}"`);
ok(/rgba?\(220,\s*30,\s*30/.test(qz.tagBg||""),`…in the same red (${qz.tagBg})`);
ok(/Illumineer/i.test(qz.why||""),`red strip under art: "${qz.why}"`);
ok(qz.canAdd,"…and they can still be clicked/added");
await p.screenshot({path:_W.data("_shot_quest.png")});

console.log("\n=== TIP + IMPORT + BACKSPACE ===");
await p.goto(F);await p.waitForTimeout(1400);
await p.fill("#q","Ariel");await p.waitForTimeout(600);
const tip=await p.evaluate(()=>{const t=document.querySelector("#grid .c .tipadd");return t?t.textContent:null});
ok(tip==="Click to add",`first-run tip renders ("${tip}")`);
await p.hover("#grid .c img");await p.waitForTimeout(500);
ok(await p.evaluate(()=>getComputedStyle(document.querySelector("#grid .c .tipadd")).display)==="block","…and shows on hover");
ok(await p.evaluate(()=>!document.getElementById("im")),"Import removed from the search toolbar");
ok(await p.evaluate(()=>!!document.getElementById("dim")),"…and now lives in the deck panel");
// backspace
await p.evaluate(()=>{const q=document.getElementById("q");q.value="";q.dispatchEvent(new Event("input",{bubbles:true}))});
await p.waitForTimeout(300);
await p.click("#q");await p.type("#q","Princess");await p.press("#q","Enter");await p.waitForTimeout(300);
await p.type("#q","animal");await p.press("#q","Enter");await p.waitForTimeout(300);
const n2=await p.evaluate(()=>document.querySelectorAll(".pill").length);
await p.press("#q","Backspace");await p.waitForTimeout(300);
const n1=await p.evaluate(()=>document.querySelectorAll(".pill").length);
await p.press("#q","Backspace");await p.waitForTimeout(300);
const n0=await p.evaluate(()=>document.querySelectorAll(".pill").length);
ok(n2===2&&n1===1&&n0===0,`backspace pops pills one at a time (${n2} → ${n1} → ${n0})`);
await p.type("#q","Elsa");await p.press("#q","Backspace");await p.waitForTimeout(200);
ok(await p.evaluate(()=>document.getElementById("q").value)==="Els","…but still edits text normally when the box isn't empty");

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
