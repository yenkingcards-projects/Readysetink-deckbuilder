const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F=_W.URL;
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1000}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1600);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

const pick=async name=>{
  await p.click("#mGuided");await p.waitForTimeout(400);
  await p.fill("#gq",name);await p.waitForTimeout(400);
  await p.evaluate(()=>document.querySelector("#cg [data-c]").click());await p.waitForTimeout(500);
  return p.evaluate(()=>{
    const rec=document.querySelector(".pair[class*='rec-']");
    const tile=document.querySelector(".cococ.on");
    // the guide tile and the deck panel both print the ability — read both
    const deck=[...document.querySelectorAll("#gdeck .st, #deck .st")]
      .map(e=>e.textContent).find(t=>t.length>60)||"";
    return {text:((tile?tile.textContent:"")+" "+deck).replace(/\s+/g," ").trim(),
      pair:rec?rec.querySelector(".t").textContent.replace(/\s+/g," ").trim():null,
      conf:rec?[...rec.classList].find(c=>c.startsWith("rec-")):null};
  });
};

console.log("\n=== STITCH — ROCK STAR ===");
const s=await pick("stitch");
console.log("     "+s.text);
ok(/you may play a character with cost 2 or less for free/.test(s.text),"errata text is live");
ok(/named Lilo or Stitch, chosen character gets \+1 lore/.test(s.text),"…including the new Lilo/Stitch lore clause");
ok(!/from your discard instead/.test(s.text),"…and the old discard-replay clause is gone");
ok(!!s.pair,`ink pairing still computes: ${s.pair} (${s.conf})`);
// step 4 recommended filters
await p.evaluate(()=>document.querySelector(".pair[class*='rec-']").click());await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById("gcskip").click());await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById("gskip").click());await p.waitForTimeout(400);
const sRec=await p.evaluate(()=>[...document.querySelectorAll("[data-rec]")].map(b=>b.textContent.trim()));
console.log("     recommended filters: "+sRec.join(" | "));
ok(sRec.some(t=>/Gains bonus lore/.test(t)),"'Gains bonus lore' now recommended — the new payoff");
ok(sRec.some(t=>/Cost reduction/.test(t)),"…alongside Cost reduction");

console.log("\n=== DONALD DUCK — FRED HONEYWELL ===");
const d=await pick("donald");
console.log("     "+d.text);
ok(/You pay 1 less to use Boost abilities and to play characters or locations with Boost/.test(d.text),"errata text is live");
ok(!/^Pay 1 ink less to use Boost abilities\.$/.test(d.text),"…old wording gone");
ok(!!d.pair,`ink pairing still computes: ${d.pair} (${d.conf})`);
await p.evaluate(()=>document.querySelector(".pair[class*='rec-']").click());await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById("gcskip").click());await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById("gskip").click());await p.waitForTimeout(400);
const dRec=await p.evaluate(()=>[...document.querySelectorAll("[data-rec]")].map(b=>b.textContent.trim()));
console.log("     recommended filters: "+dRec.join(" | "));
ok(dRec.some(t=>/Ramp/.test(t)),"'Ramp / more ink' recommended — Boost puts cards into ink");

console.log("\n=== THE OTHER 16 ARE UNTOUCHED ===");
await p.click("#mGuided");await p.waitForTimeout(400);
await p.fill("#gq","");await p.waitForTimeout(400);
const all=await p.evaluate(()=>[...document.querySelectorAll("#cg .cococ")].map(b=>b.textContent));
ok(all.length===18,`${all.length} Coconuts still listed`);
ok(all.filter(t=>/for free\. If that character was named/.test(t)).length===1,"only one card carries the new Stitch text");
ok(all.filter(t=>/and to play characters or locations with Boost/.test(t)).length===1,"…and one carries the new Donald text");

console.log("\n=== NICK WILDE / PAWPSICLE RULE STILL INTACT ===");
const nw=await pick("nick wilde");
ok(/up to 4 copies of the item Pawpsicle/.test(nw.text),"Nick Wilde's text untouched");
await p.evaluate(()=>document.querySelector(".pair[class*='rec-']").click());await p.waitForTimeout(400);
ok(await p.evaluate(()=>!!document.getElementById("gcx")),"…and the Add-4-Pawpsicles button still appears");

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
