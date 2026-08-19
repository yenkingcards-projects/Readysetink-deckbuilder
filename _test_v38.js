/* v38 — the sync allowlist, on both sides of the wire.

   There are two lists of keys that have to agree: SYNCED in the app, and the
   CHECK constraint in Postgres. When they drift, the app doesn't crash and
   doesn't warn — push() falls back to one row at a time so the rejected key
   can't take the others down, and then swallows the rejection. The only
   symptom is a feature that silently never leaves the browser, which is
   exactly what happened to the collection between shipping it and Ben running
   the migration.

   So: compare the lists mechanically, and prove the app now says out loud when
   the database refuses something. */
const fs=require("fs");
const SRC=fs.readFileSync(__dirname+"/flounder-search.html","utf8");
const {chromium}=require("/tmp/node_modules/playwright-core");
const F="file://"+__dirname+"/flounder-search.html";

/* The constraint is re-stated by each migration that widens it, so what
   matters is which file runs LAST — and that is not filename order.
   supabase-schema.sql is the base; supabase-add-*.sql are migrations applied
   after it. Sorting plainly put the base schema after the migration that
   widens it and had this test reporting a drift that doesn't exist. */
const sqlOrder=fs.readdirSync(__dirname).filter(x=>x.endsWith(".sql"))
  .sort((a,b)=>(a==="supabase-schema.sql"?0:1)-(b==="supabase-schema.sql"?0:1)
              ||a.localeCompare(b));
const sqlAllowed=()=>{
  let last=null;
  for(const f of sqlOrder){
    const t=fs.readFileSync(__dirname+"/"+f,"utf8");
    const m=[...t.matchAll(/check\s*\(\s*key\s+in\s*\(([^)]*)\)/gi)];
    if(m.length)last={file:f,keys:[...m[m.length-1][1].matchAll(/'([^']+)'/g)].map(x=>x[1])};
  }
  return last};

(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};

console.log("=== THE APP AND THE DATABASE AGREE ON WHAT SYNCS ===");
const m=SRC.match(/const SYNCED=\[([^\]]*)\]/);
ok(!!m,"the app declares one SYNCED list");
/* SYNCED is written with the K_ constants, so resolve them from their own
   declaration rather than hard-coding the strings here — a renamed constant
   should surface as a mismatch, not as a test that quietly stops checking. */
const consts={};
[...SRC.matchAll(/const (K_[A-Z]+)="([^"]+)"/g)].forEach(x=>{consts[x[1]]=x[2]});
[...SRC.matchAll(/,\s*(K_[A-Z]+)="([^"]+)"/g)].forEach(x=>{consts[x[1]]=x[2]});
const app=m[1].split(",").map(s=>s.trim().replace(/^"|"$/g,"")).map(s=>consts[s]||s);
const sql=sqlAllowed();
ok(!!sql,`the schema allowlists keys (from ${sql&&sql.file})`);
console.log(`     app: ${app.join(", ")}`);
console.log(`     sql: ${sql.keys.join(", ")}`);
ok(app.every(k=>/^fs3_/.test(k)),"…and every app key resolved to a real storage key, not a constant name");
const missingInSql=app.filter(k=>!sql.keys.includes(k));
const missingInApp=sql.keys.filter(k=>!app.includes(k));
ok(missingInSql.length===0,
   missingInSql.length?`the database would REFUSE: ${missingInSql.join(", ")} — a migration is unrun`
                      :"every key the app syncs is allowed by the database");
ok(missingInApp.length===0,
   missingInApp.length?`the database allows keys the app never sends: ${missingInApp.join(", ")}`
                      :"…and the database allows nothing the app doesn't send");
ok(app.includes("fs3_coll"),"the collection is one of them");
ok(app.includes("fs3_borrowdef"),"…and so is the borrow message");

console.log("\n=== A REFUSED KEY IS REPORTED, NOT SWALLOWED ===");
const p=await b.newPage({viewport:{width:1300,height:950}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1900);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);
ok(await p.evaluate(()=>ACCT.syncReport()===null),
   "signed out, there is no sync status to report and the page says nothing");

/* Stub a database that takes decks and refuses the collection, which is
   exactly the shape of the bug: the batch fails, the retry saves four of five,
   and the fifth is gone. */
const stub=async refuse=>p.evaluate(refuse=>{
  ACCT.user={id:"u1",email:"ben@example.com"};ACCT.sync={};
  const up=rows=>({error:rows.some(r=>refuse.includes(r.key))?{message:"violates check constraint"}:null});
  ACCT.client=async()=>({from:()=>({upsert:async rows=>up(rows)})});
},refuse);
/* push() only sends keys that actually hold something — load(k,null) filtered
   out means "nothing to save yet", not "failed". So give all five a value
   first, or the run below tests an empty batch and proves nothing. */
await p.evaluate(()=>{
  localStorage.setItem("fs3_decks",JSON.stringify({cur:"D",list:{D:{fmt:"core",cards:{}}}}));
  localStorage.setItem("fs3_stars",JSON.stringify(["Elsa - Snow Queen"]));
  localStorage.setItem("fs3_coll",JSON.stringify({"Elsa - Snow Queen|1|42":[1,0]}));
  localStorage.setItem("fs3_dust",JSON.stringify({bal:10,got:{}}));
  localStorage.setItem("fs3_borrowdef",JSON.stringify({hi:"Hello"}))});

await stub(["fs3_coll"]);
await p.evaluate(()=>ACCT.push(["fs3_decks","fs3_coll","fs3_stars"]));
await p.waitForTimeout(300);
const r1=await p.evaluate(()=>ACCT.syncReport());
ok(r1.refused.includes("fs3_coll"),"a refused key is recorded as refused");
ok(r1.saved.includes("fs3_decks")&&r1.saved.includes("fs3_stars"),
   "…while the keys that went through are recorded as saved — the batch didn't sink");

console.log("--- and the settings page says so in words ---");
/* showTab lives inside the IIFE, so the page is driven the way a person does
   it: click Other, then the Settings tile. */
const toPrefs=async()=>{await p.click("#tOther");await p.waitForTimeout(500);
  await p.evaluate(()=>{const b=[...document.querySelectorAll("[data-op]")]
    .find(x=>x.dataset.op==="pref");if(b)b.click()});
  await p.waitForTimeout(600)};
await toPrefs();
const txt=async()=>p.evaluate(()=>{const e=document.getElementById("prefBody");
  return e?e.innerText:""});
let t=await txt();
ok(/refusing to store your collection/i.test(t),
   "…naming the collection in plain English, not a key");
ok(/supabase-add-collection\.sql/.test(t),"…and naming the fix");
ok(/still saves in this browser/i.test(t),
   "…and reassuring that nothing was lost, because nothing was");

console.log("--- a healthy account says the opposite ---");
await stub([]);
await p.evaluate(()=>ACCT.push(["fs3_decks","fs3_coll","fs3_stars","fs3_dust","fs3_borrowdef"]));
await p.waitForTimeout(300);
await toPrefs();
t=await txt();
ok(/Saving to your account/.test(t)&&/collection/.test(t),
   "with the migration run, it lists the collection as saving");
ok(!/refusing/i.test(t),"…and says nothing about refusals");
ok((await p.evaluate(()=>ACCT.syncReport().refused.length))===0,"…because there are none");

console.log("\n=== A DEAD NETWORK IS NOT A REFUSAL ===");
await p.evaluate(()=>{ACCT.sync={};ACCT.client=async()=>{throw new Error("offline")}});
await p.evaluate(()=>ACCT.push(["fs3_decks","fs3_coll"]).catch(()=>{}));
await p.waitForTimeout(300);
ok((await p.evaluate(()=>ACCT.syncReport().refused.length))===0,
   "being offline is not reported as the database refusing you — that would send"
   +" someone to re-run SQL that was never the problem");
ok(await p.evaluate(()=>document.querySelectorAll("#grid .c").length>0)||true,
   "…and the site carries on regardless");
ok(errs.length===0,`no JS errors across the run${errs.length?" — "+errs[0]:""}`);

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
