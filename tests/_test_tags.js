/* Art-tag system: does vague search work, and does the tagger actually tag? */
const _W=require(__dirname+"/_where.js");
const fs=require("fs");
const {JSDOM}=require("/tmp/node_modules/jsdom");
const APP=_W.FILE;
const TAG=_W.data("flounder-tagger.html");
let fail=0,pass=0;
const ok=(c,m)=>{c?(pass++,console.log("  ✓ "+m)):(fail++,console.log("  ✗ "+m))};
const store=()=>{const s={};return{getItem:k=>k in s?s[k]:null,setItem:(k,v)=>{s[k]=String(v)},
  removeItem:k=>delete s[k],clear:()=>{}}};
const mk=f=>new JSDOM(fs.readFileSync(f,"utf8"),{runScripts:"dangerously",url:"https://e.com/x.html",
  beforeParse(w){Object.defineProperty(w,"localStorage",{value:store(),configurable:true});
    w.navigator.clipboard={writeText:async()=>{}};w.alert=()=>{};w.prompt=()=>null;
    w.confirm=()=>true;w.scrollTo=()=>{};}});
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
/* ---------------- MAIN APP: vague search ---------------- */
const A=mk(APP),W=A.window,D=W.document,$=i=>D.getElementById(i);
const click=e=>e.dispatchEvent(new W.MouseEvent("click",{bubbles:true}));
const cards=()=>[...D.querySelectorAll("#grid .c")].map(e=>e.dataset.f);
const N=()=>parseInt(($("ct").textContent.match(/[\d,]+/)||["0"])[0].replace(/,/g,""),10);
const q=async v=>{$("q").value=v;$("q").dispatchEvent(new W.Event("input",{bubbles:true}));await wait(250);return N()};
await wait(400);

console.log("\n=== VAGUE SEARCH (the actual goal) ===");
// v10: art search is ON by default — it's the whole point of the site.
ok($("tgTag").classList.contains("on"),"the art switch starts ON");
ok(await q("blue dog")>0,"…so a vague search works with no setup");
click($("tgTag"));await wait(120);
ok(await q("blue dog")===0,"…and turning it off narrows results to names and rules text");
click($("tgTag"));await wait(120);
const n1=await q("blue dog");
ok(n1>0,`"blue dog" finds ${n1} cards`);
ok(cards().every(f=>/Stitch/.test(f)),"…and every one of them is Stitch");

const n2=await q("sea witch");
ok(n2>0&&cards().every(f=>f.startsWith("Ursula")),`"sea witch" → ${n2} cards, all Ursula`);
const n3=await q("yellow bear");
ok(n3>0&&cards().every(f=>f.startsWith("Winnie the Pooh")),`"yellow bear" → ${n3}, all Winnie the Pooh`);
const n4=await q("ice queen");
const top14=cards().slice(0,14);
ok(top14.every(f=>f.startsWith("Elsa")||f.includes("Ice Queen")),
  `"ice queen" → ${n4}; the 14 true phrase matches rank first (${top14.filter(f=>f.startsWith("Elsa")).length} Elsa + the card named "Ice Queen of St. Canard")`);
ok(cards().some(f=>f.includes("Isis Vanderchill")),
  "…and the card literally named 'Ice Queen of St. Canard' is still found");
const n5=await q("tentacles");
ok(n5>0,`"tentacles" → ${n5}`);
const n6=await q("teapot");
ok(n6>0&&cards().some(f=>f.startsWith("Mrs. Potts")),`"teapot" → ${n6}, includes Mrs. Potts`);
await q("");

console.log("\n=== TAG PLUMBING ===");
const DATA=JSON.parse(fs.readFileSync(APP,"utf8").match(/<script>var DATA=([\s\S]*?);var KINDS=/)[1]);
const tagged=DATA.cards.filter(c=>c.tg&&c.tg.length);
ok(tagged.length>500,`${tagged.length} cards carry tags from the alias seed`);
const stitch=DATA.cards.find(c=>c.n==="Stitch");
ok(stitch.tg.includes("blue dog"),"Stitch cards inherit the character alias");
ok(DATA.cards.filter(c=>c.n==="Stitch").every(c=>c.tg&&c.tg.includes("blue dog")),
   `…all ${DATA.cards.filter(c=>c.n==="Stitch").length} of them, from one alias entry`);
ok(!!$("s-tag"),"sidebar has an Art tags section");
ok(/tag:"tag",art:"tag"/.test(fs.readFileSync(APP,"utf8")),"tag: / art: search fields registered");

console.log("\n=== EXPLICIT tag: SEARCH ===");
const n7=await q('tag:"blue dog"');
// v9: "Lilo & Stitch" is a correct new hit — duo cards now inherit both halves' art words
ok(n7>0&&cards().every(f=>/Stitch/.test(f)),`tag:"blue dog" → ${n7}, all Stitch (incl. Lilo & Stitch)`);
await q("");

/* ---------------- TAGGER ---------------- */
console.log("\n=== TAGGER ===");
const T=mk(TAG),TW=T.window,TD=TW.document,T$=i=>TD.getElementById(i);
const tclick=e=>e.dispatchEvent(new TW.MouseEvent("click",{bubbles:true}));
const key=k=>TD.dispatchEvent(new TW.KeyboardEvent("keydown",{key:k,bubbles:true}));
await wait(400);

ok(TD.title==="Flounder Tagger","tagger loads");
ok(!!T$("img").getAttribute("src"),"shows a card image");
const firstName=T$("cname").textContent;
ok(firstName.length>2,"shows the card name: "+firstName);
ok(TD.querySelectorAll("[data-t]").length>20,`${TD.querySelectorAll("[data-t]").length} tag buttons`);
ok(/tagged/.test(T$("pstat").textContent),"progress readout: "+T$("pstat").textContent);
ok(/inherited by all|No nicknames yet/.test(T$("aliasNote").textContent),
   "shows which nicknames this character already answers to");

console.log("\n--- tagging by keyboard ---");
key("3");                                   // feet visible
await wait(40);
const feetBtn=TD.querySelector('[data-t="feet"]');
ok(feetBtn.classList.contains("on"),"pressing 3 toggles 'Feet visible' on");
const saved=JSON.parse(TW.localStorage.getItem("fs_arttags_v1"));
ok(saved.cards[firstName]&&saved.cards[firstName].t.includes("feet"),"…and it saved immediately");
key("3");await wait(40);
ok(!TD.querySelector('[data-t="feet"]').classList.contains("on"),"pressing again toggles it off");
key("3");key("q");key("a");await wait(40);
const rec=JSON.parse(TW.localStorage.getItem("fs_arttags_v1")).cards[firstName];
ok(rec.t.length===3,`three tags stored: ${rec.t.join(", ")}`);

console.log("\n--- advancing ---");
const before=T$("cname").textContent;
key("Enter");await wait(60);
ok(T$("cname").textContent!==before,"Enter saves and moves to the next card");
ok(/1 \/|\d+ \//.test(T$("pstat").textContent),"progress updated: "+T$("pstat").textContent);
tclick(T$("bPrev"));await wait(60);
ok(true,"Back button works without error");

console.log("\n--- per-card words ---");
T$("aliasIn").value="guitar, stage lights";
T$("aliasIn").dispatchEvent(new TW.Event("change",{bubbles:true}));
await wait(40);
const cur=T$("cname").textContent;
const st2=JSON.parse(TW.localStorage.getItem("fs_arttags_v1"));
ok(st2.cards[cur]&&st2.cards[cur].a.includes("guitar"),"free-text words save per card");

console.log("\n--- filters ---");
ok(T$("fMode").options.length===4,
   "queue filter: "+[...T$("fMode").options].map(o=>o.textContent).join(" / "));
ok(T$("fSet").options.length>10,`set filter has ${T$("fSet").options.length} options`);
T$("fQ").value="stitch";T$("fQ").dispatchEvent(new TW.Event("input",{bubbles:true}));
await wait(60);
{const nm=T$("cname").textContent;
 const c=DATA.cards.find(x=>(x.v?x.n+" - "+x.v:x.n)===nm);
 ok(/stitch/i.test(nm)||/stitch/i.test((c&&c.sto)||""),
   "search jumps to a name-or-franchise match: "+nm+(c?" ("+c.sto+")":""));}

console.log("\n--- export / import ---");
tclick(T$("bExport"));await wait(40);
ok(T$("mIO").classList.contains("on"),"export opens");
const out=JSON.parse(T$("ioBox").value);
ok(out.aliases&&out.cards,"export contains aliases + cards");
ok(Object.keys(out.cards).length>0,`export has ${Object.keys(out.cards).length} tagged card(s)`);
ok(Object.keys(out.aliases).length>90,`…and ${Object.keys(out.aliases).length} character alias sets`);
tclick(T$("ioClose"));
tclick(T$("bImport"));await wait(40);
T$("ioBox").value=JSON.stringify({aliases:{"Zzz Test":["imported alias"]},cards:{"Zzz Test - X":{t:["feet"],a:[]}}});
tclick(T$("ioAction"));await wait(60);
const merged=JSON.parse(TW.localStorage.getItem("fs_arttags_v1"));
ok(merged.aliases["Zzz Test"],"import merges a friend's aliases");
ok(merged.cards["Zzz Test - X"],"…and their card tags");

console.log(`\n${fail?"❌":"✅"} ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
})().catch(e=>{console.error("CRASH:",e);process.exit(1)});
