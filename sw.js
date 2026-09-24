/* Ready Set Ink — offline support for the new deck builder (?newbuilder=1).
   Registered only by the new builder; the classic builder unregisters it.

   · Pages: network first, so an update always arrives when you're online;
     the last copy you loaded is used when you're not. All 2,543 cards live
     inside the page, so searching and editing decks work offline.
   · Card images (/img/…) and icons: from the cache once seen, capped so the
     phone's storage isn't eaten.
   · Anything from another site (Ko-fi, Supabase, TCGplayer) is left alone. */
const PAGES="rsi-pages-v1",IMGS="rsi-img-v1",IMG_CAP=800;

self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==PAGES&&k!==IMGS)await caches.delete(k);
  await self.clients.claim();
})()));

/* The page that registered this worker loaded before the worker existed, so
   it was never cached. It asks for itself to be saved; without this, the
   very first visit would not work offline. */
self.addEventListener("message",e=>{
  const u=e.data&&e.data.cache;
  if(!u)return;
  try{if(new URL(u).origin!==self.location.origin)return}catch(err){return}
  e.waitUntil(caches.open(PAGES).then(c=>fetch(u,{credentials:"same-origin"}).then(res=>{if(res.ok)return c.put(u,res)})).catch(()=>{}));
});

self.addEventListener("fetch",e=>{
  const r=e.request;
  if(r.method!=="GET")return;
  const u=new URL(r.url);
  if(u.origin!==self.location.origin||u.pathname.startsWith("/_vercel/"))return;
  if(r.mode==="navigate"){
    e.respondWith((async()=>{
      try{
        const res=await fetch(r);
        if(res.ok){const c=await caches.open(PAGES);c.put(r,res.clone())}
        return res;
      }catch(err){
        const c=await caches.open(PAGES);
        return (await c.match(r))||(await c.match(r,{ignoreSearch:true}))||
          new Response("You're offline, and this page hasn't been saved on this device yet.",
            {status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
      }
    })());
    return;
  }
  if(u.pathname.startsWith("/img/")||u.pathname.startsWith("/icons/")){
    e.respondWith((async()=>{
      const c=await caches.open(IMGS);
      const hit=await c.match(r);if(hit)return hit;
      const res=await fetch(r);
      if(res.ok){
        c.put(r,res.clone()).then(async()=>{
          const keys=await c.keys();
          for(let i=0;i<keys.length-IMG_CAP;i++)await c.delete(keys[i]);
        }).catch(()=>{});
      }
      return res;
    })());
  }
});
