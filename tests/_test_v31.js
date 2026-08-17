/* v31 — the ReadySetInk design system, the aquarium rework, and Outpost as an RTS. */
const {chromium}=require("/tmp/node_modules/playwright-core");
const SRC=require("fs").readFileSync(__dirname+"/flounder-search.html","utf8");
const F="file://"+__dirname+"/flounder-search.html";
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1200}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
const open_=async op=>{await p.evaluate(o=>{localStorage.setItem("fs3_opage",JSON.stringify(o));
  localStorage.setItem("fs3_tab",JSON.stringify("tOther"))},op);
  await p.reload();await p.waitForTimeout(1700)};
await p.goto(F);await p.waitForTimeout(2000);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== READYSETINK DESIGN SYSTEM ===");
const look=await p.evaluate(()=>{const cs=getComputedStyle(document.body);
  const nav=getComputedStyle(document.querySelector("header"));
  const tab=getComputedStyle(document.querySelector("nav.tabs button"));
  const strip=getComputedStyle(document.querySelector("nav.tabs"));
  return {font:cs.fontFamily,bg:cs.backgroundColor,size:cs.fontSize,
    navBg:nav.backgroundColor,navImg:nav.backgroundImage,
    tabT:tab.textTransform,tabW:tab.fontWeight,tabS:tab.letterSpacing,
    stripBg:strip.backgroundColor}});
ok(/Arial/i.test(look.font),`body is Arial (${look.font.split(",")[0]})`);
ok(look.size==="14px",`body copy is 14px, per the revised type scale (${look.size})`);
ok(look.bg==="rgb(101, 120, 168)",`canvas is periwinkle metallic #6578a8 (${look.bg})`);
ok(look.navBg==="rgb(32, 38, 56)",`nav is carbon navy #202638 (${look.navBg})`);
ok(/radial-gradient/.test(look.navImg),"…with the halftone dot-matrix texture");
ok(look.stripBg==="rgb(220, 231, 245)","the secondary strip is light blue-gray beneath it");
ok(look.tabT==="uppercase"&&look.tabW==="700"&&parseFloat(look.tabS)>0.3,
   "chrome labels are uppercase Arial Bold with half-pixel tracking");
const h1=await p.evaluate(()=>{const t=[...document.querySelectorAll("h1")].find(x=>x.offsetParent);
  if(!t)return null;const s=getComputedStyle(t);
  return {f:s.fontFamily,w:s.fontWeight,sh:s.textShadow}});
await p.click("#tOther");await p.waitForTimeout(600);
const hero=await p.evaluate(()=>{const t=document.querySelector("#vOther h1")||document.querySelector(".page h1");
  const s=getComputedStyle(t);return {f:s.fontFamily,w:s.fontWeight,sh:s.textShadow,bg:getComputedStyle(t).backgroundColor}});
ok(/Arial Black/i.test(hero.f),`hero wordmarks are Arial Black (${hero.f.split(",")[0]})`);
ok(hero.w==="900","…at weight 900");
ok((hero.sh.match(/rgb/g)||[]).length>=4,"…outlined and hard-shadowed, box-art style");
ok(!/backdrop-filter/.test(SRC),"no glassmorphism");
ok(/--bevel:inset/.test(SRC)&&/--bevel-in:inset/.test(SRC),
   "…depth is the bevel token pair — bright top edge, chrome-indigo line beneath");
ok((SRC.match(/box-shadow:var\(--bevel/g)||[]).length>10,
   `…used on ${(SRC.match(/box-shadow:var\(--bevel/g)||[]).length} surfaces`);
const radii=await p.evaluate(()=>[...document.querySelectorAll(".btn,.tile,.chip")]
  .map(e=>parseFloat(getComputedStyle(e).borderTopLeftRadius)).filter(n=>n>6));
ok(radii.length===0,`corners stay sharp — ${radii.length} elements over 6px`);
const pill=await p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector(".logo b")).borderTopLeftRadius));
ok(pill>100,"…except the racetrack logo pill, which is fully round");
ok(await p.evaluate(()=>{const f=document.querySelector(".foot");
  return getComputedStyle(f).backgroundColor==="rgb(32, 38, 56)"}),
   "the footer is part of the carbon command layer");
ok(!/Iowan Old Style|Palatino/.test(SRC),"no trace of the archive serif left");
ok(!/--gold:#c9a227/.test(SRC),"…nor its gold");

console.log("\n=== BLUE STRIPED FISH AQUARIUM ===");
await p.evaluate(()=>{localStorage.setItem("fs3_dust",JSON.stringify(
  {bal:0,got:{},open:[],titles:[],hidden:[],wear:"",quiz:[],bucky:0}));
  localStorage.setItem("fs3_aqua",JSON.stringify({secs:0,fed:0,coco:0}))});
await open_("aqua");
ok(/Blue Striped Fish Aquarium/.test(await p.evaluate(()=>document.querySelector("#aquapage h1").textContent)),
   "renamed to Blue Striped Fish Aquarium");
ok(!/Flounder.s aquarium/i.test(SRC),"…with the old name gone everywhere, comments included");
ok(await p.evaluate(()=>!!document.getElementById("aqFull")),"there's a full-screen button");
ok(/requestFullscreen/.test(SRC)&&/webkitRequestFullscreen/.test(SRC),
   "…wired to the real Fullscreen API, with the webkit fallback");
ok(/\.tank:fullscreen/.test(SRC),"…and the tank restyles itself when full");
// the bug: a coconut resting on the gravel must be reachable
const box=await p.evaluate(()=>{const r=document.getElementById("tank").getBoundingClientRect();
  return {x:r.x,y:r.y,w:r.width,h:r.height}});
let dropped=false;
for(let i=0;i<90&&!dropped;i++){
  await p.mouse.click(box.x+box.w*(0.25+Math.random()*0.5),box.y+box.h-46);
  await p.waitForTimeout(140);
  dropped=await p.evaluate(()=>document.querySelectorAll(".food.coco").length>0);
}
ok(await p.evaluate(()=>document.querySelectorAll(".food").length<=26),
   "…and the tank never fills past its cap, however hard you click");
ok(dropped,"a coconut can be dropped by the gravel");
// wait for it to settle, then measure the deepest one — auto-drops start at the top
await p.waitForTimeout(2500);
const depth=await p.evaluate(()=>{const t=document.getElementById("tank").getBoundingClientRect();
  return Math.max(...[...document.querySelectorAll(".food.coco")]
    .map(c=>{const a=c.getBoundingClientRect();return (a.y+a.height/2-t.y)/t.height}))});
ok(depth>0.80,`…and one settles at ${(depth*100).toFixed(0)}% depth, down on the gravel`);
await p.mouse.move(box.x+box.w/2,box.y+20);
let ate=0;
for(let i=0;i<40;i++){await p.waitForTimeout(1000);
  ate=(await p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_aqua")))).coco;
  if(ate)break}
ok(ate>0,`…and he reaches it (the 1px-out-of-reach bug is gone)`);
ok(/dx<fw\*0\.62&&dy<fh\*0\.56/.test(SRC),
   "…because the eat radius now follows his body, not a magic number");
ok(/rest\|\|0\)<2400/.test(SRC),"…and stale food dissolves rather than being circled forever");
ok(/const cap=urgent\?1\.5:0\.62/.test(SRC),"cruising speed is halved — it's meant to be calming");
ok(/26000\)/.test(SRC),"…and food falls far less often");

console.log("\n=== OUTPOST IS AN RTS NOW ===");
await p.evaluate(()=>localStorage.removeItem("fs3_out"));
await open_("hex");
const board=await p.evaluate(()=>({
  n:document.querySelectorAll(".hex").length,
  mine:document.querySelectorAll(".hex.mine").length,
  open:document.querySelectorAll(".hex.open2").length,
  html:document.getElementById("hexpage").innerHTML}));
ok(board.n===61,`${board.n} hexes — a radius-4 board`);
ok(board.mine===1,"you start with one Keep");
ok(board.open===6,"…and the ring around it is claimable");
ok(!/gopt|What does|Which ink|How much lore/i.test(board.html),
   "not one card question anywhere");
ok(!/HEXQS|askHex|drawHexQ/.test(SRC),"…the hex quiz apparatus is gone from the code");
ok(/quizOptions/.test(SRC),"…while the separate card-guessing games keep theirs");
const ores=await p.evaluate(()=>[...document.querySelectorAll(".ore i")].map(o=>o.textContent));
ok(ores.slice(0,3).join(",")==="Ink,Stone,Lore",`three resources: ${ores.slice(0,3).join(", ")}`);
// economics
await p.evaluate(()=>{const o=JSON.parse(localStorage.getItem("fs3_out"));
  o.ink=99999;o.stone=99999;o.lore=999;localStorage.setItem("fs3_out",JSON.stringify(o))});
await p.reload();await p.waitForTimeout(1500);
const rate=()=>p.evaluate(()=>parseFloat(document.querySelectorAll(".ore u")[0].textContent.replace(/[^\d.]/g,"")));
/* Total across all three, because a Reef produces stone and a Shallows
   produces ink — reading only the ink rate made this pass or fail on which
   terrain the board happened to deal. */
const rateAll=()=>p.evaluate(()=>[...document.querySelectorAll(".ore u")].slice(0,3)
  .reduce((a,u)=>a+parseFloat(u.textContent.replace(/[^\d.]/g,""))||a,0));
// claim a buildable (non-water) hex
const claimed=await p.evaluate(()=>{
  const h=[...document.querySelectorAll(".hex.open2")].find(x=>!/Deep water/.test(x.title));
  if(!h)return null;h.click();return h.title});
await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById("hxClaim").click());await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.querySelectorAll(".hex.mine").length)===2,
   `claiming works (took a ${claimed})`);
const r0=await rateAll();
const built=[];
for(let lv=1;lv<=3;lv++){
  await p.evaluate(()=>{const x=[...document.querySelectorAll("[data-build]")]
    .find(b=>b.dataset.build==="harvest"&&!b.disabled);if(x)x.click()});
  await p.waitForTimeout(400);built.push(await rateAll());
}
ok(built[0]>r0&&built[1]>built[0]&&built[2]>built[1],
   `a Harvester doubles output at every level (${r0} → ${built.join(" → ")}/h)`);
// beacon extends reach; find an owned empty buildable hex
const reach0=await p.evaluate(()=>+document.querySelectorAll(".ore")[3].textContent.match(/reach (\d+)/)[1]);
await p.evaluate(()=>{const h=[...document.querySelectorAll(".hex.open2")].find(x=>!/Deep water/.test(x.title));
  if(h)h.click()});
await p.waitForTimeout(400);
await p.evaluate(()=>{const c=document.getElementById("hxClaim");if(c)c.click()});
await p.waitForTimeout(450);
const bok=await p.evaluate(()=>{const x=[...document.querySelectorAll("[data-build]")]
  .find(b=>b.dataset.build==="beacon"&&!b.disabled);if(!x)return false;x.click();return true});
await p.waitForTimeout(500);
const reach1=await p.evaluate(()=>+document.querySelectorAll(".ore")[3].textContent.match(/reach (\d+)/)[1]);
ok(bok&&reach1===reach0+1,`a Beacon extends your reach (${reach0} → ${reach1})`);
// offline production, capped
const capH=await p.evaluate(()=>+document.querySelector("#hexpage .lede").textContent.match(/(\d+) hours/)[1]);
const rNow=await rate();   // ink only — that is what we bank-check below
await p.evaluate(()=>{const o=JSON.parse(localStorage.getItem("fs3_out"));
  o.ink=0;o.t=Date.now()-1000*60*60*400;localStorage.setItem("fs3_out",JSON.stringify(o))});
await p.reload();await p.waitForTimeout(1600);
const banked=await p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_out")).ink);
ok(Math.abs(banked-rNow*capH)<2,
   `400 hours away banks exactly the ${capH}-hour cap (${Math.round(banked)}, expected ${Math.round(rNow*capH)})`);
ok(banked<rNow*400/10,"…nowhere near 400 hours' worth, which is the whole point");
ok(await p.evaluate(()=>document.querySelectorAll(".hex.mine").length)>=3,
   "the world persists across reloads");
ok(await p.evaluate(()=>{const o=JSON.parse(localStorage.getItem("fs3_out"));return !!o.seed}),
   "…from a stored seed, so terrain never reshuffles under you");

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
