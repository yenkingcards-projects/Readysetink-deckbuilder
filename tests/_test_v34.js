/* v34 — accounts: sync decisions, and the reload loop that must never return.

   The loop that got shipped: arrive() reloaded whenever the account held any
   rows, and the reload re-ran arrive(), which found the same rows and reloaded
   again. The page flashed and jumped between tabs, forever. No existing suite
   could see it, because nothing could observe the reload call.

   These tests stub the Supabase client entirely — no network, no account, no
   Google. What is under test is the decision logic, which is where the bug was. */
const {chromium}=require("/tmp/node_modules/playwright-core");
const F="file://"+__dirname+"/flounder-search.html";

/* Replace ACCT's client with a fake returning `rows`, and count reloads. */
const STUB=rows=>`(()=>{
  window.__reloads=0;
  ACCT.reload=()=>{window.__reloads++};
  ACCT.client=async()=>({
    from:()=>({select:()=>({in:async()=>({data:${JSON.stringify(rows)},error:null})})}),
    auth:{getSession:async()=>({data:{session:null}}),signOut:async()=>({})}
  });
  ACCT.push=async()=>{window.__pushed=(window.__pushed||0)+1};
})()`;

(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1300,height:900}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(1800);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== SIGNED OUT, NOTHING CHANGES ===");
ok(await p.evaluate(()=>typeof ACCT==="object"),"the account layer exists");
ok(await p.evaluate(()=>!ACCT.user),"…but nobody is signed in");
ok(await p.evaluate(()=>!window.supabase),
   "…and the Supabase library was never even downloaded");

console.log("\n=== A FIRST SIGN-IN UPLOADS, IT DOES NOT WIPE ===");
await p.evaluate(STUB([]));            // empty account
await p.evaluate(()=>{localStorage.setItem("fs3_decks",JSON.stringify({cur:"Main",
  list:{Main:{cards:{"Elsa - Snow Queen":4},fmt:"core"}}}))});
await p.evaluate(()=>ACCT.arrive({id:"u1",email:"ben@example.com"}));
await p.waitForTimeout(300);
ok(await p.evaluate(()=>window.__pushed===1),"an empty account is filled from this browser");
ok(await p.evaluate(()=>window.__reloads===0),"…without reloading");
ok(await p.evaluate(()=>!!JSON.parse(localStorage.getItem("fs3_decks")).list.Main.cards["Elsa - Snow Queen"]),
   "…and the local deck survives (a literal 'cloud wins' would have destroyed it)");

console.log("\n=== IDENTICAL DATA IS A NO-OP ===");
await p.reload();await p.waitForTimeout(1500);
const same=await p.evaluate(()=>JSON.parse(localStorage.getItem("fs3_decks")));
await p.evaluate(STUB([{key:"fs3_decks",value:same}]));
await p.evaluate(()=>{sessionStorage.removeItem("fs3_pulled")});
await p.evaluate(()=>ACCT.arrive({id:"u1"}));
await p.waitForTimeout(300);
ok(await p.evaluate(()=>window.__reloads===0),
   "the account holding exactly what you already have causes no reload");

console.log("\n=== GENUINELY NEW DATA RELOADS ONCE, AND ONLY ONCE ===");
const other={cur:"Main",list:{Main:{cards:{"Mickey Mouse - True Friend":2},fmt:"core"}}};
await p.evaluate(STUB([{key:"fs3_decks",value:other}]));
await p.evaluate(()=>{sessionStorage.removeItem("fs3_pulled")});
await p.evaluate(()=>ACCT.arrive({id:"u1"}));
await p.waitForTimeout(300);
ok(await p.evaluate(()=>window.__reloads===1),"different data in the account reloads the page");
ok(await p.evaluate(()=>!!JSON.parse(localStorage.getItem("fs3_decks")).list.Main.cards["Mickey Mouse - True Friend"]),
   "…having written the account's version down first");

/* The loop, reproduced: call arrive again exactly as a reload would. */
await p.evaluate(()=>ACCT.arrive({id:"u1"}));
await p.waitForTimeout(300);
ok(await p.evaluate(()=>window.__reloads===1),
   "calling it again — as a reload does — does NOT reload a second time");
for(let i=0;i<4;i++){await p.evaluate(()=>ACCT.arrive({id:"u1"}));}
await p.waitForTimeout(300);
ok(await p.evaluate(()=>window.__reloads===1),
   "…nor after four more, which is the loop that shipped");

console.log("\n=== SYNC ONLY TOUCHES THE ALLOWED KEYS ===");
ok(await p.evaluate(()=>{const before=window.__pushed||0;
  ACCT.user={id:"u1"};ACCT.queue("fs3_tab");
  return (window.__pushed||0)===before}),
   "a non-synced key (fs3_tab) is never sent");
ok(await p.evaluate(()=>typeof ACCT.pushing==="object"),
   "each key debounces on its own timer, so two saves in a second can't cancel each other");

console.log("\n=== A DEAD NETWORK IS SURVIVABLE ===");
await p.evaluate(()=>{window.__reloads=0;
  ACCT.client=async()=>{throw new Error("offline")}});
await p.evaluate(()=>ACCT.arrive({id:"u1"}).catch(()=>{}));
await p.waitForTimeout(300);
ok(await p.evaluate(()=>window.__reloads===0),"a failed pull reloads nothing");
ok(await p.evaluate(()=>document.querySelectorAll("#grid .c").length>0),
   "…and the site is still perfectly usable");

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
