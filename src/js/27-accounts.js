/* =========================================================================
   Accounts — sign in with Google, carry decks / dust / staples between devices

   Three rules this code follows, in priority order:

   1. SIGNED OUT, THE SITE IS EXACTLY WHAT IT WAS. Everything below is
      additive. No Supabase config, no network, blocked CDN, file:// with no
      server — in every one of those cases the sign-in button hides itself and
      not one other line of behaviour changes. The 33 suites run against a
      logged-out page and must stay green without knowing this exists.

   2. THE LIBRARY LOADS ONLY WHEN IT IS NEEDED. Nothing is fetched on a normal
      visit. The script is pulled in on the first click of Sign in, or on load
      only if a saved session is already sitting in localStorage. A visitor who
      never signs in never pays for this.

   3. CLOUD WINS — EXCEPT WHEN THE CLOUD IS EMPTY. Ben chose "cloud wins,
      always". Taken literally that wipes a new user's work: a fresh account has
      no rows, so signing in would replace five real decks with nothing. So the
      rule is cloud-wins whenever the account holds anything at all, and a
      first-ever sign-in pushes local up instead. No prompts, no merge.
   ========================================================================= */
const SB_URL="/*__SB_URL__*/";
const SB_KEY="/*__SB_KEY__*/";
/* The keys that follow a person between devices. Must match the allowlist in
   supabase-schema.sql — the database rejects anything else, on purpose. */
const SYNCED=[K_DECKS,"fs3_dust",K_STAR,K_COLL,"fs3_borrowdef"];
const SB_LIB="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/dist/umd/supabase.js";
const PULLED="fs3_pulled";   /* one cloud pull per tab — see arrive() */

const ACCT={
  sb:null, user:null, pushing:{},

  configured(){return /^https:\/\//.test(SB_URL)&&SB_KEY.length>20},

  /* Supabase parks its session under sb-<ref>-auth-token. Reading that
     directly is how we know whether to bother loading the library at all. */
  hasSession(){try{return Object.keys(localStorage)
      .some(k=>/^sb-.*-auth-token$/.test(k))}catch(e){return false}},

  lib(){
    if(window.supabase)return Promise.resolve(window.supabase);
    return new Promise((ok,no)=>{
      const s=document.createElement("script");
      s.src=SB_LIB; s.async=true;
      s.onload=()=>window.supabase?ok(window.supabase):no(new Error("no global"));
      s.onerror=()=>no(new Error("script blocked"));
      document.head.appendChild(s)})},

  async client(){
    if(this.sb)return this.sb;
    const lib=await this.lib();
    this.sb=lib.createClient(SB_URL,SB_KEY);
    return this.sb},

  /* Called once at startup. Deliberately silent on every failure path — an
     account feature must never be the reason the site doesn't load. */
  async boot(){
    const b=$("acct");if(!b)return;
    if(!this.configured())return;              // stays hidden, site unchanged
    b.hidden=false;
    /* Signed in, this used to sign you straight back out on one click — no
       way to actually see your own account. Now it opens the account page;
       signing out happens from a button inside it, on purpose. */
    b.onclick=()=>{
      if(this.user){OPAGE="account";save("fs3_opage",OPAGE);showTab("tOther")}
      else this.signIn()};
    if(!this.hasSession()&&!AUTHHASH)return;
    try{
      const sb=await this.client();
      if(AUTHHASH){
        const q=new URLSearchParams(AUTHHASH.replace(/^#/,""));
        const bad=q.get("error_description");
        /* A refused sign-in used to be as silent as a successful one. Say so. */
        if(bad){toast("Google sign-in failed — "+bad);return}
        const at=q.get("access_token"),rt=q.get("refresh_token");
        /* setSession explicitly: by the time the library has loaded, the hash
           its own detectSessionInUrl would read has already been rewritten. */
        if(at&&rt)await sb.auth.setSession({access_token:at,refresh_token:rt});
      }
      const {data}=await sb.auth.getSession();
      if(data&&data.session){await this.arrive(data.session.user)}
    }catch(e){/* offline, blocked, or logged out — the site carries on */}},

  async signIn(){
    /* Check the account server answers BEFORE sending anyone to Google. If the
       Supabase project is paused or gone, signInWithOAuth navigates the whole
       page to an address that doesn't exist and the visitor lands on a
       browser error page. A toast is the honest answer instead. */
    try{
      const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),5000);
      const r=await fetch(SB_URL+"/auth/v1/health",{headers:{apikey:SB_KEY},signal:ctl.signal});
      clearTimeout(t);if(!r.ok)throw new Error("auth "+r.status);
    }catch(e){toast("Sign-in is unavailable right now — your decks are still saved on this device");return}
    try{
      const sb=await this.client();
      await sb.auth.signInWithOAuth({provider:"google",
        options:{redirectTo:location.origin+location.pathname}})}
    catch(e){toast("Couldn't reach sign-in — check your connection")}},

  /* Signing out used to leave every synced key sitting right there in
     localStorage — decks, dust, titles, all of it — which reads as "nothing
     happened" rather than "signed out". It's still safe: everything here was
     either just pushed to the account, or (for a key the database is
     refusing — see syncReport(), e.g. a migration that hasn't been run yet)
     left alone rather than destroyed with nowhere else it lives. A reload
     afterward is the simplest way to get every in-memory var (DECKS, DUST,
     STARS, COLL, BORROW) back to a genuinely fresh state, not just the ones
     touched here. */
  async signOut(){
    const b=$("acct");if(b){b.disabled=true;b.textContent="Signing out…"}
    try{
      const sb=await this.client();
      await this.push(SYNCED);
      await sb.auth.signOut()
    }catch(e){}
    try{sessionStorage.removeItem(PULLED)}catch(e){}
    SYNCED.forEach(k=>{if(this.sync[k]==="ok"){try{localStorage.removeItem(k)}catch(e){}}});
    this.user=null;this.sync={};
    this.reload()},

  /* Deletes the account's copy outright, then does everything signOut() does
     to the browser too — but unconditionally, since the rows this reads back
     against no longer exist to disagree with. Does NOT remove the Google
     sign-in itself: Supabase only allows that with the service-role key, which
     has no business living in browser JS. Coming back after this starts
     completely fresh, which is the honest thing to offer from here. */
  async deleteMyData(){
    if(!this.user)return;
    const ok=await confirmBox("Delete your data",
      "This permanently deletes your saved decks, dust, titles, starred staples, collection "
      +"and borrow template from Ready Set Ink's database, then signs you out and clears this "
      +"browser. This can't be undone.","Delete everything",true);
    if(!ok)return;
    let sb;
    try{sb=await this.client()}catch(e){toast("Couldn't reach the database — try again");return}
    try{
      const r=await sb.from("user_state").delete().eq("user_id",this.user.id);
      if(r.error)throw r.error;
    }catch(e){toast("Couldn't delete your data — try again");return}
    try{await sb.auth.signOut()}catch(e){}
    try{sessionStorage.removeItem(PULLED)}catch(e){}
    SYNCED.forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
    this.user=null;this.sync={};
    this.reload()},

  /* Signed in. Pull what the account holds; if it holds nothing, this is a
     first sign-in and local goes up instead.

     THE RELOAD LOOP, and why it is now impossible.

     DECKS, DUST and STARS are read into memory once at startup, so applying
     freshly pulled data means reloading the page. The first version reloaded
     whenever the account had any rows at all — but the reload re-ran this
     function, found the same rows, and reloaded again. Forever. Ben hit it as
     a flashing page that kept jumping between tabs.

     A "have I already pulled this tab" flag stops the loop, but still costs a
     reload on every new tab, which is a visible flicker for no reason.

     So the test is not "does the account have rows" but "is any of it actually
     different from what this browser already has". On a normal visit — the
     same person, the same data — nothing differs, so nothing is written and
     nothing reloads. A reload now only happens when there is genuinely
     something new to show, which is the only time it is worth a flash.

     The sessionStorage flag stays as a second line of defence: even if a
     comparison somehow always disagreed, the reload could happen once per tab
     and no more. Two independent guards, because a loop that makes the site
     unusable is worse than almost any other bug here. */
  async arrive(user){
    this.user=user;this.paint();
    /* A fresh draft on sign-in. On a shared computer you should never open the
       deck builder onto somebody else's half-built list — saved decks are
       still all there in the Decks tab. */
    try{
      const d=DECKS.list[DRAFT];
      if(d&&Object.keys(d.cards||{}).length){
        /* A fresh draft on sign-in, as asked — but an unsaved deck is still
           someone's work, so it is put aside under its own name rather than
           binned. Nothing is destroyed by logging in. */
        let nm="Unsaved deck",i=2;
        while(DECKS.list[nm])nm="Unsaved deck "+(i++);
        DECKS.list[nm]={...d};stampEdited(nm);
        toast(`Your unsaved deck was kept as "${nm}"`);
      }
      if(d)DECKS.list[DRAFT]={fmt:d.fmt,coco:null,cards:{}};
      DECKS.cur=DRAFT;saveDecks();markDirty(false);paintDeckBar();
      /* Push the reset itself before the pull below reads the cloud — queue()
         only fires ~1.2s later, and the SELECT a few lines down usually comes
         back well inside that window. Without this await, the reset writes
         locally, the SELECT reads the still-stale (pre-reset) cloud copy, sees
         a difference, and overwrites the fresh draft right back to what it
         was clearing — a genuinely fresh draft that un-freshens itself. */
      await this.push([K_DECKS]);
    }catch(e){}
    let rows=[];
    try{
      const sb=await this.client();
      const r=await sb.from("user_state").select("key,value").in("key",SYNCED);
      if(r.error)throw r.error;
      rows=r.data||[]}
    catch(e){toast("Signed in — couldn't reach your saved data");return}

    if(!rows.length){                       // first ever sign-in: local goes up
      await this.push(SYNCED);
      toast("Saved this browser's decks to your account");return}

    /* Write only what genuinely differs. JSON.stringify of a value that came
       out of JSON.parse is stable enough for this: both sides originate from
       the same serialiser, so key order matches. */
    let changed=0;
    rows.forEach(r=>{
      try{
        const incoming=JSON.stringify(r.value);
        if(localStorage.getItem(r.key)===incoming)return;   // already identical
        localStorage.setItem(r.key,incoming);changed++
      }catch(e){}});
    if(!changed)return;                     // nothing new — no write, no reload

    let already=false;
    try{already=!!sessionStorage.getItem(PULLED);
        sessionStorage.setItem(PULLED,"1")}catch(e){}
    if(already)return;                      // belt and braces: never twice a tab
    this.reload()},

  /* Indirection so a test can watch for the reload without navigating. The
     loop bug was invisible to every existing suite precisely because nothing
     could observe this call. */
  reload(){location.reload()},

  /* Debounced so a burst of adds is one write, not forty. One timer per key —
     a single shared timer meant saving a deck and a star inside the same
     second pushed only whichever landed last, and silently dropped the other. */
  queue(key){
    if(!this.user||SYNCED.indexOf(key)<0)return;
    clearTimeout(this.pushing[key]);
    this.pushing[key]=setTimeout(()=>this.push([key]),1200)},

  async push(keys){
    if(!this.user)return;
    const rows=keys.map(k=>({user_id:this.user.id,key:k,
      value:load(k,null)})).filter(r=>r.value!==null);
    if(!rows.length)return;
    let sb;
    try{sb=await this.client()}catch(e){return}
    try{
      const r=await sb.from("user_state").upsert(rows,{onConflict:"user_id,key"});
      if(!r.error){rows.forEach(row=>{this.sync[row.key]="ok"});return}
      /* One rejected key sinks the whole batch — the database allowlists which
         keys may be written, so a key added to the app before the matching SQL
         has been run takes every other key down with it. Falling back to one
         row at a time means a new feature can never stop decks from saving. */
      for(const row of rows){
        try{const one=await sb.from("user_state").upsert([row],{onConflict:"user_id,key"});
          this.sync[row.key]=one.error?"refused":"ok"}
        catch(e){this.sync[row.key]="refused"}}
    }catch(e){/* a failed sync must never interrupt deck building */}},

  /* Which keys the database is actually accepting. The per-key fallback above
     is the right behaviour — one refused key must never stop decks saving —
     but it used to swallow the refusal completely, so the only symptom of a
     missing migration was a collection that quietly never left the browser.
     Recording the outcome costs nothing and lets the Settings page say so. */
  sync:{},
  syncReport(){
    if(!this.user)return null;
    const refused=SYNCED.filter(k=>this.sync[k]==="refused");
    const saved=SYNCED.filter(k=>this.sync[k]==="ok");
    return {refused,saved,
      untested:SYNCED.filter(k=>!this.sync[k])}},

  paint(){
    const b=$("acct");if(!b)return;
    const e=this.user&&(this.user.email||"");
    b.textContent=this.user?("Sign out"+(e?" · "+e.split("@")[0]:"")):"Sign in";
    b.title=this.user?"Signed in as "+e:"Sign in with Google to carry your decks between devices"}
};
window.ACCT=ACCT;   /* exposed so the suites can assert on it */
/* Same reason: the collection lives inside the IIFE, so a test has no way to
   reach it otherwise. Read-only helpers plus the two writers the suites need. */
window.COLLAPI={allPrintings,prints,pkey,owned,ownTotal,setOwned,
  copies:()=>collCopies(),foils:()=>collFoils(),
  raw:()=>COLL,setOf:s=>allPrintings().filter(x=>x.pr.s===s)};

setTimeout(jiggleArt,650);   // let the page settle before the switch waves
/* First visit gets the tour. Deferred a beat for the same reason as ACCT.boot
   below — everything it touches is declared further down this file — and long
   enough that the page is painted behind it rather than flashing in after. */
setTimeout(()=>{try{startTour(false)}catch(e){}},400);
/* ACCT is a const declared below this IIFE, so it is in the temporal dead zone
   right now — calling it directly here is a load-time crash. Deferring by a
   tick lets the rest of the file finish evaluating first. Same rule as MICKEYS
   and CARDS: late constants are only ever touched from inside a function. */
/* Deep links are handled HERE, at the very bottom, and not where the rest of
   the search wiring lives. applyHash() reads HKEYS, a const declared near
   render() — several hundred lines BELOW where the wiring sits. A hoisted
   function called before its consts have initialised throws a ReferenceError
   from the temporal dead zone, which the try/catch then swallowed, which is
   why a shared link opened to the full 2,543 cards on a first visit and worked
   perfectly on the second. Same rule as ACCT.boot below: late consts are only
   ever touched from code that runs last. */
if(BOOTHASH.length>1&&/[#&]dl=/.test(BOOTHASH)){
  /* A deck link, not a search link. Handled before anything renders, because
     render() rewrites the hash with the current search and would otherwise
     destroy the link before it was read. */
  const raw=BOOTHASH;
  try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
  /* A first-time visitor arriving on a deck link gets both the tour and this.
     Two stacked modals is a mess, so the deck offer waits for the tour to be
     gone — it is the more important of the two and should be the last thing
     on screen, not the thing buried underneath. */
  const offer=()=>{try{offerDeckFromHash(raw)}catch(e){}};
  const wait=()=>{
    const t=$("tourbg");
    if(t&&!t.hidden){setTimeout(wait,300);return}
    offer()};
  setTimeout(wait,500);
}else if(/[#&](tab|op)=/.test(BOOTHASH)){
  /* A deep link from one of the little landing pages under /decks, /search and
     so on. Those pages exist so Google has something with words on it to index;
     this is what makes their "open it" button land you on the right tab rather
     than dumping you on the default one. */
  try{
    const q=new URLSearchParams(BOOTHASH.replace(/^#/,""));
    const t=q.get("tab"),op=q.get("op");
    if(op){OPAGE=op;save("fs3_opage",OPAGE)}
    else if(t&&t!=="tOther"){OPAGE="";save("fs3_opage","")}
    if(q.get("sub")==="guided"){SUB="guided";save("fs3_sub",SUB)}
    setTimeout(()=>{try{
      showTab(op?"tOther":(TABS.includes(t)?t:"tDeck"));
      history.replaceState(null,"",location.pathname+location.search);
    }catch(e){}},60);
  }catch(e){}
}else if(BOOTHASH.length>1&&!AUTHHASH){
  /* !AUTHHASH: "#access_token=…" is not a search, and running it through
     applyHash() would clear every filter on the way back from signing in. */
  try{
    if(applyHash(BOOTHASH)){
      const sp=$("special"),sd=$("side");
      if(S.ab.size&&sp)sp.open=true;
      if(sd&&(S.ink.size||S.type.size||S.rar.size||S.kw.size||S.cls.size||S.sto.size||S.tag.size||S.art.size))sd.open=true;
      /* Re-render on the next tick. The boot render may not have happened yet,
         and if it already has it painted the empty search. Either way this is
         what puts the shared search on screen. */
      setTimeout(()=>{try{render()}catch(e){}},0);
    }
  }catch(e){}
}

setTimeout(()=>{try{ACCT.boot()}catch(e){}},0);
/* The deck builder's layout (newbuilder/nb.js), inlined by build_flounder.py
   last inside this closure so everything above is already set up. */
/*__NB_JS__*/
})();

