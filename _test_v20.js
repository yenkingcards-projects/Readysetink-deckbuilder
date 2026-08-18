const {chromium}=require("/tmp/node_modules/playwright-core");
const SRC=require("fs").readFileSync(__dirname+"/flounder-search.html","utf8");
const HIDDEN_SRC=SRC.slice(SRC.indexOf("const HIDDEN=["),SRC.indexOf("const SECRETS=["));
const nHidden=(HIDDEN_SRC.match(/\{id:"h_/g)||[]).length;
const nSecret=(HIDDEN_SRC.match(/secret:true/g)||[]).length;
const nOpen=nHidden-nSecret;
/* End the slice at the table's own closing bracket rather than at the next
   function — anything declared in between was otherwise counted as a tile. */
const _gs=SRC.indexOf("const OTHER_GROUPS=[");
const GRP_SRC=SRC.slice(_gs,SRC.indexOf("\n];",_gs));
const OFF_SRC=(SRC.match(/const OFF=\[([^\]]*)\]/)||[,""])[1];
const nOff=(OFF_SRC.match(/"/g)||[]).length/2;
const nTiles=(GRP_SRC.match(/","[a-z]+(:[a-z]+)?"\]/g)||[]).length-nOff;
const F="file:///sessions/kind-modest-ride/mnt/outputs/flounder-search.html";
(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
p.on("dialog",d=>d.accept());
await p.goto(F);await p.waitForTimeout(1900);
const D=()=>p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_dust")||"{}"));
const openPage=async op=>{await p.evaluate(o=>{localStorage.setItem("fs3_opage",JSON.stringify(o));
  localStorage.setItem("fs3_tab",JSON.stringify("tOther"))},op);await p.reload();await p.waitForTimeout(1600)};
const toDeck=async()=>{await p.evaluate(()=>{localStorage.setItem("fs3_opage",JSON.stringify(""));
  localStorage.setItem("fs3_tab",JSON.stringify("tDeck"))});await p.reload();await p.waitForTimeout(1600)};
const q=async v=>{await p.fill("#q",v);await p.waitForTimeout(480)};
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== HIDDEN TITLES EXIST AND STAY HIDDEN ===");
await openPage("dust");
const H=await p.evaluate(()=>[...document.querySelectorAll(".tit.hid")].map(t=>({
  name:t.querySelector(".tt").textContent,hint:t.querySelector(".td").textContent,
  locked:!!t.querySelector(".lockd")})));
ok(H.length===nOpen,`${H.length} hidden titles — every non-secret one`);
ok(H.every(h=>h.name==="???"),"…all showing ??? before they're earned");
ok(H.every(h=>h.locked),"…and none of them purchasable");
ok(H.every(h=>h.hint.length>18),"…but each gives a cryptic hint");
console.log("     "+H.slice(0,4).map(h=>`“${h.hint}”`).join("  ·  "));
ok(await p.evaluate(e=>document.querySelector(".hn").textContent.trim()===`0 / ${e}`,nOpen),
   `progress counter reads 0 / ${nOpen}`);

console.log("\n=== EARNING THEM BY DOING THE THING ===");
await toDeck();
// Chip wall
await q("Chip the Teacup");
await p.evaluate(()=>{const e=document.querySelector("#grid .c img");if(e)e.click()});
await p.waitForTimeout(500);
let d=await D();
ok((d.hidden||[]).includes("h_chip"),"trying to add Chip unlocks Teacup Denier");
// Hiram + Bucky + Flounder + enchanted
for(const [name,id] of [["Hiram Flaversham - Toymaker","h_rat"],
                        ["Bucky - Squirrel Squeak Tutor","h_grave"],
                        ["Flounder - Voice of Reason","h_fish"]]){
  await q(name);
  await p.evaluate(()=>{const e=document.querySelector("#grid .c [data-i]");if(e)e.click()});
  await p.waitForTimeout(400);
  await p.evaluate(()=>{const x=document.getElementById("mx");if(x)x.click()});await p.waitForTimeout(200);
  d=await D();
  ok((d.hidden||[]).includes(id),`opening ${name.split(" - ")[0]} unlocks ${id}`);
}
// enchanted printing
await q("Hades - King of Olympus");
await p.evaluate(()=>document.querySelector("#grid .c [data-i]").click());await p.waitForTimeout(450);
await p.evaluate(()=>{document.getElementById("prs").open=true});await p.waitForTimeout(250);
await p.evaluate(()=>{const bs=[...document.querySelectorAll("#prs [data-pr]")];
  const e=bs.find(x=>/Enchanted/.test(x.textContent));(e||bs[1]).click()});
await p.waitForTimeout(450);
ok(((await D()).hidden||[]).includes("h_ench"),"viewing an enchanted printing unlocks Enchanted");
await p.evaluate(()=>document.getElementById("mx").click());await p.waitForTimeout(200);
// both switches
await p.evaluate(()=>{const t=document.getElementById("tgSto");if(!t.classList.contains("on"))t.click()});
await p.waitForTimeout(400);
ok(((await D()).hidden||[]).includes("h_wide"),"both search switches on unlocks Wide Net");
// pull list
await q("Elsa - Snow Queen");
await p.evaluate(()=>document.querySelector("#grid .c img").click());await p.waitForTimeout(350);
await p.click("#tDecks");await p.waitForTimeout(700);
ok(((await D()).hidden||[]).includes("h_binder"),"making a pull list unlocks Binder Walker");

console.log("\n=== EARNED ONES BECOME REAL ===");
await openPage("dust");
const shown=await p.evaluate(()=>[...document.querySelectorAll(".tit.hid.own")].map(t=>t.querySelector(".tt").textContent));
ok(shown.length>=6,`${shown.length} now readable: ${shown.slice(0,4).join(", ")}…`);
ok(await p.evaluate(()=>[...document.querySelectorAll(".tit.hid:not(.own) .tt")].every(e=>e.textContent==="???")),
   "…and the rest still say ???");
// the first one earned auto-wears, so pick one that ISN'T currently on
await p.evaluate(()=>{const t=[...document.querySelectorAll(".tit.hid.own")]
  .find(x=>!x.classList.contains("worn"));t.querySelector("[data-wear]").click()});
await p.waitForTimeout(400);
const worn=await p.evaluate(()=>document.getElementById("worn").textContent);
ok(worn&&worn!=="???",`a hidden title can be worn ("${worn}")`);
ok(((await D()).hidden||[]).length>=6,"…and they persist");

console.log("\n=== ALL-SECRETS TITLE ===");
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem("fs3_dust"));
  d.bal=100;d.open=[];localStorage.setItem("fs3_dust",JSON.stringify(d))});
await p.reload();await p.waitForTimeout(1500);
for(let i=0;i<4;i++){
  await p.evaluate(()=>{const b=document.querySelector("[data-buy]");if(b)b.click()});
  await p.waitForTimeout(350);
}
d=await D();
ok(d.open.length===4,"all four secrets bought");
ok((d.hidden||[]).includes("h_all"),"…which unlocks Nothing Left Hidden");

console.log("\n=== CONTRIBUTE PAGE ===");
await openPage("contrib");
const cb=await p.evaluate(()=>({
  h:document.querySelector("#contribpage h1").textContent,
  stats:[...document.querySelectorAll("#contribpage .cstat b")].map(e=>e.textContent),
  labels:[...document.querySelectorAll("#contribpage .cstat i")].map(e=>e.textContent),
  tiles:[...document.querySelectorAll("#contribpage .ctile h3")].map(e=>e.textContent),
  mail:(document.querySelector("#contribpage a[href^='mailto']")||{}).href||"",
  soon:!!document.querySelector("#contribpage .soon")}));
ok(/Contribute/.test(cb.h),`"${cb.h.trim()}"`);
ok(cb.stats.length===3,`three live numbers: ${cb.stats.map((s,i)=>s+" "+cb.labels[i]).join(" · ")}`);
const real=await p.evaluate(()=>DATA.cards.filter(c=>(c.tg||[]).length).length.toLocaleString());
ok(cb.stats[0]===real,`…and the tagged count is real (${real})`);
ok(cb.tiles.length===3,`three steps: ${cb.tiles.join(" · ")}`);
/* The project inbox, not Ben's personal address — contributions come from
   strangers and shouldn't land in the mail he reads at breakfast. */
ok(/lorcana707@gmail\.com/.test(cb.mail)&&/subject=/.test(cb.mail),
   "…with a mailto to the project inbox that prefills the subject");
ok(cb.soon,"…and it's honest that emailing JSON doesn't scale");
await p.click("#cbExit");await p.waitForTimeout(400);
ok(await p.evaluate(()=>!!document.getElementById("otherTiles")),"← Other works");

console.log("\n=== OTHER INDEX ===");
const tiles=await p.evaluate(()=>[...document.querySelectorAll(".tile h3")].map(h=>h.textContent));
ok(tiles.length===nTiles,`all ${tiles.length} Other-page tiles render`);
ok(tiles.some(t=>/Contribute/.test(t)),"Contribute is among them");
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
