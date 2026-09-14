# Fix: Google sign-in silently does nothing

Verified against `origin/main` at `5c1672c`. All three anchors below appear
**exactly once** in `flounder-search.template.html` at that commit.

## The bug

`signInWithOAuth` sends the user to Google and Google returns them to the site
with the session token in the URL **hash** — `#access_token=…&refresh_token=…`.

The boot `render()` at the bottom of the file calls `syncHash()`, which rewrites
the hash to match the current search state. On a normal arrival the search is
empty, so `searchHash()` returns `""` and `syncHash()` sets the URL to
`location.pathname + location.search` — **wiping the hash entirely.**

`ACCT.boot()` is registered on a later `setTimeout(…, 0)` than the boot render,
so by the time it looks for `access_token` in `location.hash`, the token is
already gone. It finds no token and no stored session, and returns. The
Supabase library is never even loaded, so its own `detectSessionInUrl` never
runs either.

Every failure path in `ACCT` is deliberately silent — an account feature must
never break the site — so the result is: click Sign in, bounce through Google,
land back on the page, and the button still says "Sign in". No error anywhere.

Reproduced with a fake token hash: `supabase lib requested? NO — boot()
returned early`. After the fix: `YES`, and the button paints.

This has nothing to do with Supabase URL configuration, Google OAuth client
settings, or the consent screen. Those are worth getting right for other
reasons, but they were never the cause.

---

## Edit 1 — capture the hash before anything can wipe it

**Find** (one occurrence):

```js
const BOOTHASH=location.hash||"";
```

**Replace with:**

```js
const BOOTHASH=location.hash||"";
/* An OAuth return from Google arrives as "#access_token=…&refresh_token=…".
   It is captured HERE, at the very top, because the boot render() calls
   syncHash(), which rewrites the hash to match the current search — and an
   empty search means the hash is wiped entirely.

   That is the whole reason signing in appeared to do nothing. The token was
   erased a few milliseconds after it arrived, before anything read it;
   ACCT.boot() then looked for a token, found a bare URL and no stored session,
   and quietly gave up. No error, no message, the button just still said
   "Sign in". It read like a Supabase settings problem and was not one. */
const AUTHHASH=/[#&](access_token|error_description)=/.test(BOOTHASH)?BOOTHASH:"";
```

## Edit 2 — hand the tokens to the library directly

**Find** (one occurrence, inside `ACCT.boot()`):

```js
    if(!this.hasSession()&&!/[#&]access_token=/.test(location.hash))return;
    try{
      const sb=await this.client();
      const {data}=await sb.auth.getSession();
      if(data&&data.session){await this.arrive(data.session.user)}
    }catch(e){/* offline, blocked, or logged out — the site carries on */}},
```

**Replace with:**

```js
    if(!this.hasSession()&&!AUTHHASH)return;
    try{
      const sb=await this.client();
      if(AUTHHASH){
        const q=new URLSearchParams(AUTHHASH.replace(/^#/,""));
        const bad=q.get("error_description");
        /* A refused sign-in used to be as silent as a successful one. Say so. */
        if(bad){toast("Google sign-in failed — "+bad);return}
        const at=q.get("access_token"),rt=q.get("refresh_token");
        /* setSession explicitly rather than leaning on the library's own
           detectSessionInUrl: by the time the library has loaded, the hash it
           would read has already been rewritten by syncHash(). We kept the
           tokens; hand them over directly. */
        if(at&&rt)await sb.auth.setSession({access_token:at,refresh_token:rt});
      }
      const {data}=await sb.auth.getSession();
      if(data&&data.session){await this.arrive(data.session.user)}
    }catch(e){/* offline, blocked, or logged out — the site carries on */}},
```

## Edit 3 — don't treat an auth return as a shared search link

**Find** (one occurrence, in the deep-link chain at the bottom of the file):

```js
}else if(BOOTHASH.length>1){
```

**Replace with:**

```js
}else if(BOOTHASH.length>1&&!AUTHHASH){
  /* !AUTHHASH: "#access_token=…" is not a search, and running it through
     applyHash() would clear every filter on the way back from signing in. */
```

Note this adds a comment line but keeps the `try{` that already follows.

---

## The ship gate

Add to `smoke.js`, immediately **before** the comment block that begins
`/* Deep links, on a COLD profile.`:

```js
/* Signing in. This shipped broken and stayed broken, because every failure
   path here is silent by design — the button just still said "Sign in".

   The bug: the boot render() calls syncHash(), which rewrites the hash to
   match the current search, and an empty search wipes it. Google hands the
   token back IN the hash. So the token was erased milliseconds after it
   arrived and ACCT.boot() found nothing to do.

   Supabase is stubbed here so this tests OUR path — hash captured, tokens
   handed to the library, user painted — and not Google's token validation. */
{
  const ctx=await b.newContext();
  await ctx.addInitScript(()=>{
    window.__CALLS={};
    const rows={data:[],error:null};
    const chain=()=>{const o={};["select","eq","in","order","limit","upsert","delete"]
      .forEach(m=>o[m]=()=>o);o.then=f=>Promise.resolve(rows).then(f);return o};
    window.supabase={createClient:()=>({auth:{
      setSession:a=>{window.__CALLS.setSession=a;return Promise.resolve({data:{},error:null})},
      getSession:()=>Promise.resolve({data:{session:{user:{email:"tester@example.com"}}},error:null}),
      signOut:()=>Promise.resolve({}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
      getUser:()=>Promise.resolve({data:{user:{email:"tester@example.com"}}})},
      from:()=>chain()})};
  });
  const q=await ctx.newPage();
  await q.goto("file://"+F+"#access_token=AAA.BBB.CCC&refresh_token=RRR&expires_in=3600&token_type=bearer");
  await q.waitForTimeout(2600);
  const got=await q.evaluate(()=>window.__CALLS.setSession||null);
  ok(!!(got&&got.access_token==="AAA.BBB.CCC"),"an OAuth return survives the boot render");
  const label=await q.evaluate(()=>{const a=document.getElementById("acct");return a?a.textContent.trim():""});
  ok(/^Sign out/.test(label),`signing in paints the account button (${label||"unchanged"})`);
  await ctx.close();
}
```

Both checks pass with the fix and fail without it. The stub means the test does
not depend on the network or on a real Google token — it tests our half of the
handshake, which is the half that was broken.

**Checked against `5c1672c`:** upstream now routes a signed-in click to an
account page (`b.onclick` opens `OPAGE="account"`), but `paint()` still writes
`"Sign out"+(e?" · "+e.split("@")[0]:"")`, so the `/^Sign out/` assertion is
still correct. Re-check `paint()` if the file has moved on again.
