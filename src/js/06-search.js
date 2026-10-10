/* ===================== query ===================== */
const ALIAS={i:"ink",ink:"ink",c:"cost",cost:"cost",t:"type",type:"type",r:"rarity",rarity:"rarity",
 s:"set",set:"set",keyword:"keyword",kw:"keyword",class:"class",cl:"class",text:"text",e:"text",
 n:"name",name:"name",v:"version",version:"version",iw:"inkwell",inkwell:"inkwell",
 st:"strength",strength:"strength",wi:"willpower",willpower:"willpower",lo:"lore",lore:"lore",
 story:"story",franchise:"story",tag:"tag",art:"tag",flavor:"flavor",flav:"flavor",quote:"flavor",
 artist:"artist",by:"artist",illus:"artist",illustrator:"artist",price:"price",p:"price"};
/* Rarity as a bare word — "legendary" used to just silently match nothing,
   since rarity was never part of the free-text haystack. Single words only;
   "super rare" needs the quoted/rarity: form same as any other two-word value. */
const RARITY_WORDS=new Set(["common","uncommon","rare","legendary","enchanted"]);
function tok(s){
  const raw=s.match(/\w+(?:>=|<=|!=|:|>|<|=)"(?:[^"\\]|\\.)*"|"(?:[^"\\]|\\.)*"|\S+/g)||[];
  const out=[];
  for(let t of raw){
    let neg=false;if(t[0]==="-"){neg=true;t=t.slice(1)}
    /* $40 = up to $40. $10-40 = between the two. Checked before the generic
       kv parse below since $ isn't a word character and wouldn't match it
       anyway — this just keeps the price grammar next to the field it feeds. */
    const range=t.match(/^\$(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
    if(range){out.push({f:"price",op:">=",v:range[1],neg});
      out.push({f:"price",op:"<=",v:range[2],neg});continue}
    const bare=t.match(/^\$(\d+(?:\.\d+)?)$/);
    if(bare){out.push({f:"price",op:":",v:bare[1],neg});continue}
    const kv=t.match(/^(\w+)(:|>=|<=|>|<|!=|=)([\s\S]*)$/);
    if(kv&&ALIAS[kv[1].toLowerCase()]){let v=kv[3];
      if(v.startsWith('"')&&v.endsWith('"')&&v.length>1)v=v.slice(1,-1);
      out.push({f:ALIAS[kv[1].toLowerCase()],op:kv[2],v:v.toLowerCase(),neg});continue}
    const lw=t.toLowerCase();
    if(lw==="inkwell"||lw==="iw"){out.push({f:"inkwell",op:":",v:"true",neg});continue}
    if(lw==="vanilla"){out.push({sp:"vanilla",neg});continue}
    if(RARITY_WORDS.has(lw)){out.push({f:"rarity",op:":",v:lw,neg});continue}
    if(lw==="or")continue;
    let p=neg?"-"+t:t;if(p.startsWith('"')&&p.endsWith('"')&&p.length>1)p=p.slice(1,-1);
    out.push({fz:p.toLowerCase()});
  }
  return out;
}
function nOp(v,op,t){if(v==null||isNaN(t))return false;
  switch(op){case ":":case "=":return v===t;case ">":return v>t;case ">=":return v>=t;
  case "<":return v<t;case "<=":return v<=t;case "!=":return v!==t;default:return true}}
function fOK(c,f,op,v){switch(f){
  case "ink":return c.co.some(x=>x.toLowerCase()===v)||(v==="dual"&&c.co.length>1);
  case "cost":return nOp(c.c,op,parseFloat(v));
  case "strength":return nOp(c.st,op,parseFloat(v));
  case "willpower":return nOp(c.wi,op,parseFloat(v));
  case "lore":return nOp(c.lo,op,parseFloat(v));
  case "type":return (c.ty||"").toLowerCase()===v||c.sub.some(x=>x.toLowerCase()===v);
  case "rarity":return (c.r||"").toLowerCase().startsWith(v);
  case "set":return c.s.toLowerCase()===v||(c.sn||"").toLowerCase().includes(v);
  case "keyword":return c.kw.some(k=>(k[0]||"").toLowerCase()===v);
  case "class":return c.sub.some(x=>x.toLowerCase()===v);
  case "story":return (c.sto||"").toLowerCase().includes(v);
  case "artist":return (c.ar||[]).some(a=>a.toLowerCase().includes(v));
  case "tag":return (c.tg||[]).some(t=>t.toLowerCase()===v);
  case "text":return (c.tx||"").toLowerCase().includes(v);
  case "flavor":return (c.fl||"").toLowerCase().includes(v);
  case "name":return (c.n||"").toLowerCase().includes(v);
  case "version":return (c.v||"").toLowerCase().includes(v);
  case "inkwell":return c.ik===1;
  /* Cheapest-copy price, the same number the ★ Staples $10-or-less / Money
     chips already run on. ":" and "=" read as "at or under" rather than an
     exact match — nobody typing "$40" means the one card priced literally
     $40.00, they mean "around what I'd pay". >, >=, <, <= behave normally. */
  case "price":{const p=cardPriceMin(c);if(p==null)return false;
    const t=parseFloat(v);return(op===":"||op==="=")?p<=t:nOp(p,op,t)}
  default:return true}}
/* What a bare typed word is allowed to match. Franchise and art tags are opt-in
   via the two switches under the search bar. */
/* The set name is in here so typing "attack of the vine" finds that set's
   cards as you type, not just the one card with "vine" in its text. */
/* Apostrophes are DELETED, not spaced: "you've" and "youve" have to collapse
   to the same string, and turning the apostrophe into a space would split the
   word into "you ve" and match neither. Everything else becomes a space. */
const flat=s=>(s||"").toLowerCase().replace(/['’ʼ]/g,"")
  .replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
/* THE HOT PATH. Every free-text search asks "does this card contain that", for
   all 2,543 cards, and filt() runs eleven times per render — once for the grid,
   once for the chips, and once per sidebar facet that has to count itself out.
   Building and flattening this string on demand meant roughly 28,000 string
   builds and 84,000 regex passes per keystroke, and typing one letter took ten
   seconds. It is the same string every time, so it is built once.

   Three parts, because two of them are switchable: the story and the art tags
   join the haystack only when their toggles are on. Each part is flattened
   separately and joined with a space, which is identical to flattening the
   whole thing — flat() collapses runs of whitespace anyway. */
function buildHay(){
  for(const c of CARDS){
    c._h0=flat(c.f+" "+c.tx+" "+c.sub.join(" ")+" "+(c.ty||"")+" "+c.co.join(" ")+" "+(c.sn||""));
    c._h1=flat(c.sto||"");
    c._h2=flat((c.tg||[]).join(" "));
    c._h3=flat(c.fl||"");
    c._hraw=(c.f+" "+c.tx+" "+c.sub.join(" ")+" "+(c.ty||"")+" "+c.co.join(" ")+" "+(c.sn||"")+
      " "+(c.sto||"")+" "+(c.tg||[]).join(" ")+" "+(c.fl||"")).toLowerCase();
  }
}
/* Flattened, punctuation-blind, and respecting the three search toggles. */
const HAYF=c=>c._h0===undefined?flat(HAY(c))
  :c._h0+(S.stoS&&c._h1?" "+c._h1:"")+(S.tagS&&c._h2?" "+c._h2:"")+(S.flS&&c._h3?" "+c._h3:"");
/* Raw lowercase, for the one place that wants the phrase exactly as printed. */
const HAY=c=>c._hraw!==undefined?c._hraw
  :(c.f+" "+c.tx+" "+c.sub.join(" ")+" "+(c.ty||"")+" "+c.co.join(" ")+" "+(c.sn||"")+
  (S.stoS?" "+(c.sto||""):"")+
  (S.tagS?" "+(c.tg||[]).join(" "):"")+
  (S.flS?" "+(c.fl||""):"")).toLowerCase();
function qOK(c,ts){
  for(const t of ts){
    if(t.sp==="vanilla"){const v=!c.tx;if(t.neg?v:!v)return false;continue}
    if(t.fz!==undefined){
      /* Punctuation-blind. Nobody types the apostrophe in "Look What You've
         Done" or the ! in "Attack of the Vine!", and a search that needs them
         is a search that says "no results" to a correctly-remembered card. */
      if(!HAYF(c).includes(t._fz||(t._fz=flat(t.fz))))return false;continue}
    const ok=fOK(c,t.f,t.op,t.v);if(t.neg?ok:!ok)return false;
  }
  return true;
}
function legal(c){const f=deck().fmt;return f==="core"?c.core===1:true}

/* skip lets a facet count itself out, so counts show "what if I add this" */
/* tok() parses the query into terms. filt() used to call it on every one of
   its eleven passes, re-parsing the identical string each time; the flattened
   copies of S.terms were being rebuilt per card on top of that. Both are
   derived purely from the query, so both are cached against it. */
let _tokQ=null,_tokV=[],TERMSF=[],_termsSrc=null;
function tokens(){
  const q=S.q.trim();
  if(q!==_tokQ){_tokQ=q;_tokV=q?tok(q):[]}
  if(S.terms!==_termsSrc||S.terms.length!==TERMSF.length){
    _termsSrc=S.terms;TERMSF=S.terms.map(flat)}
  return _tokV;
}
function filt(skip){
  const ts=tokens();
  return CARDS.filter(c=>{
    if(!legal(c))return false;
    if(S.fl)return c.n===FL.n&&c.v===FL.v;
    // STRICT ink: card inks must be a SUBSET of the selection
    if(skip!=="ink"&&S.ink.size&&!(c.co.length&&c.co.every(x=>S.ink.has(x))))return false;
    if(skip!=="ink"&&S.dual&&c.co.length<2)return false;
    if(skip!=="type"&&S.type.size&&!(S.type.has(c.ty)||c.sub.some(x=>S.type.has(x))))return false;
    if(skip!=="rar"&&S.rar.size&&!S.rar.has(c.r))return false;
    if(skip!=="kw"&&S.kw.size&&!c.kw.some(k=>S.kw.has(k[0])))return false;
    if(skip!=="cls"&&S.cls.size&&!c.sub.some(x=>S.cls.has(x)))return false;
    if(skip!=="sto"&&S.sto.size&&!S.sto.has(c.sto))return false;
    if(skip!=="art"&&S.art.size&&!(c.ar||[]).some(a=>S.art.has(a)))return false;
    if(skip!=="tag"&&S.tag.size&&![...S.tag].every(t=>(c.tg||[]).includes(t)))return false;
    if(S.set&&c.s!==S.set)return false;
    if(S.inkwell==="yes"&&c.ik!==1)return false;
    if(S.inkwell==="no"&&c.ik===1)return false;
    if(S.cost[0]!=null&&c.c<S.cost[0])return false;
    if(S.cost[1]!=null&&c.c>S.cost[1])return false;
    if(S.st[0]!=null&&!(c.st>=S.st[0]))return false;
    if(S.st[1]!=null&&!(c.st<=S.st[1]))return false;
    if(S.wi[0]!=null&&!(c.wi>=S.wi[0]))return false;
    if(S.wi[1]!=null&&!(c.wi<=S.wi[1]))return false;
    if(S.lo[0]!=null&&!(c.lo>=S.lo[0]))return false;
    if(S.lo[1]!=null&&!(c.lo<=S.lo[1]))return false;
    if(skip!=="ab"&&S.ab.size){for(const id of S.ab)if(!c.ab.has(id))return false}
    /* Same punctuation-blind compare as the live query, or an Enter-tokenised
       phrase would be stricter than typing it. */
    if(S.terms.length){const h=HAYF(c);
      for(let i=0;i<TERMSF.length;i++) if(!h.includes(TERMSF[i]))return false;}
    if(ts.length&&!qOK(c,ts))return false;
    return true;
  });
}
function sortC(a){
  // "ice queen" ANDs its words, which is right — but the cards that contain the
  // whole phrase are what you actually meant, so float those to the top.
  const raw=(S.q.trim()||S.terms[S.terms.length-1]||"").toLowerCase().replace(/^"|"$/g,"");
  if(raw.includes(" ")&&!/[:<>=]/.test(raw)){
    const hit=a.filter(c=>HAY(c).includes(raw)),rest=a.filter(c=>!HAY(c).includes(raw));
    if(hit.length&&rest.length)return sortInner(hit).concat(sortInner(rest));
  }
  return sortInner(a);
}
function sortInner(a){const x=a.slice();
  if(S.sort==="cost")x.sort((p,q)=>p.c-q.c||p.f.localeCompare(q.f));
  else if(S.sort==="costdesc")x.sort((p,q)=>q.c-p.c||p.f.localeCompare(q.f));
  else if(S.sort==="name")x.sort((p,q)=>p.f.localeCompare(q.f));
  else if(S.sort==="setold")x.sort((p,q)=>p.sd.localeCompare(q.sd)||(p.num||0)-(q.num||0));
  else x.sort((p,q)=>q.sd.localeCompare(p.sd)||(p.num||0)-(q.num||0)); // newest first (default)
  return x;
}

/* ===================== the Coconut block =====================
   Every Coconut, each with the filters that Coconut actually wants, sitting at
   the very bottom of Special searches.

   This is the one section that is ALWAYS closed on arrival, and stays closed
   unless you open it — GOPEN, which remembers every other group's state, is
   deliberately not consulted. Two dozen Coconuts each with a stack of chips
   under them is a wall, and it is the last thing on the panel; anyone who
   wants it will click it, and everyone else should never see it unfolded.

   The synergies are the same `rec` lists the Guided Coconut Build already
   uses, so a Coconut recommends the same things in both places rather than
   drifting into two opinions. */
let COCOOPEN=false;
function cocoBlock(cur,base){
  const rows=COCO.map((co,i)=>{
    const chips=(co.rec||[]).map(id=>{
      const a=AB.find(x=>x.id===id);if(!a)return"";
      const on=S.ab.has(id);
      const n=(on?base:cur).reduce((s,c)=>s+(c.ab.has(id)?1:0),0);
      return `<button class="chip${on?" on":""}${!on&&!n?" dead":""}" data-a="${id}">
        <span>${a.l}</span><span class="n">${n}</span></button>`}).join("");
    if(!chips)return"";
    return `<div class="cocorow">
      <button class="cocon" data-cocosee="${i}" title="Open ${esc(co.n)} - ${esc(co.v)}">
        ${coInks(co).map(i=>`<i class="ci ${esc(i.toLowerCase())}"></i>`).join("")}${esc(co.n)} <em>${esc(co.v)}</em></button>
      <div class="chips">${chips}</div></div>`}).join("");
  /* Held in a plain variable, never in localStorage. renderChips() rebuilds
     this whole panel on every keystroke, so without it a chip clicked inside
     the block would slam the block shut under your finger. A reload starts it
     closed again, which is the behaviour Ben asked for. */
  return `<details class="grp cocogrp" id="cocogrp"${COCOOPEN?" open":""}>
    <summary>🥥 Coconuts and what they want<span class="gn">${COCO.length}</span></summary>
    <p class="cocohint">Each Coconut with the filters that suit it. Click a name to read
      the card; click a filter to turn it on.</p>
    ${rows}</details>`}

/* Same treatment as the Coconut block: its own always-closed drawer, open
   state in a plain variable so a click inside it doesn't slam it shut, and no
   data-g so it never gets reopened from saved state. Hidden entirely when the
   build has no prices — a drawer of filters that can only ever return nothing
   is worse than no drawer. */
let MONEYOPEN=false;
function moneyBlock(cur,base){
  const g=GROUPS.find(x=>x.money);
  if(!g||!priceDate())return "";
  const chips=g.chips.map(a=>{
    const on=S.ab.has(a.id);
    const n=(on?base:cur).reduce((s,c)=>s+(c.ab.has(a.id)?1:0),0);
    return `<button class="chip${on?" on":""}${!on&&!n?" dead":""}" data-a="${a.id}">
      <span>${a.l}</span><span class="n">${n}</span></button>`}).join("");
  return `<details class="grp cocogrp" id="moneygrp"${MONEYOPEN?" open":""}>
    <summary>💲 What it costs to buy<span class="gn">${g.chips.length}</span></summary>
    <p class="cocohint">Sorted on our rounded price — a snapshot from ${esc(priceDate())},
      not a live quote. Each card\'s own page shows the real number underneath. Turn
      prices on in Card view settings to see them on the cards.</p>
    <div class="chips">${chips}</div></details>`}

/* One definition of "this is a phone", used by everything that has to lay out
   differently rather than merely look different. Matches the 900px breakpoint
   the CSS already uses for the mobile Cards/Deck tabs. */
const PHONE=()=>window.matchMedia("(max-width:900px)").matches;

/* ===================== chips ===================== */
/* ---- which groups are folded up ----------------------------------------
   This remembers what is CLOSED. It used to remember what was OPEN, in a
   `const` read once when the page loaded — and there was the bug behind
   "the menus collapse at random when I press a search". Opening a group
   wrote the new list to storage but never updated the variable, so the next
   chip press re-rendered every group from a snapshot taken before you
   touched anything, and everything you had opened during that session
   slammed shut. It looked random because it depended on what your last
   session happened to leave behind.

   Closed-set rather than open-set for a second reason: with an open-list, a
   group added to the app later is missing from everyone's saved list and so
   arrives collapsed for every existing user. Absent now means open, which is
   the default Ben wants — everything expanded unless you folded it yourself.

   Coconuts and What it costs are not in here at all. They have no data-g,
   they are the two long ones, and they stay closed until you ask. */
let GCLOSED=new Set(load("fs3_gclosed",[]));
const saveGClosed=()=>save("fs3_gclosed",[...GCLOSED]);
function renderChips(){
  const cur=filt();            // counts are "how many of what I'm looking at also match"
  const base=filt("ab");
  const rec=new Set(G.coco!=null&&effMode()==="rec"?COCO[G.coco].rec:[]);
  $("groups").innerHTML=GROUPS.filter(g=>!g.money).map((g,gi)=>{
    const active=g.chips.filter(a=>S.ab.has(a.id)).length;
    /* Everything open on a first visit — on a DESKTOP. On a phone the same
       default stacked seventeen expanded groups above the results, so the
       first card sat 3,290px down the page: four full screens of controls
       before a single thing you came to look at. */
    const open=!GCLOSED.has(g.g);
    /* Only `open`. It used to be `open||active`, so a group holding a switched-on
       filter forced itself back open — which is half of what "it collapses at
       random" felt like from the other side: you fold a group, press a chip in
       it, and it unfolds itself again. If you folded it, it stays folded; the
       "N on" count in the heading is how a closed group tells you it's still
       doing something. */
    return `<details class="grp"${open?" open":""} data-g="${esc(g.g)}">
      <summary>${g.g}${active?`<span class="gn">${active} on</span>`:""}</summary><div class="chips">`+
      g.chips.map(a=>{
        const on=S.ab.has(a.id);
        const n=(on?base:cur).reduce((s,c)=>s+(c.ab.has(a.id)?1:0),0);
        return `<button class="chip${on?" on":""}${rec.has(a.id)?" rec":""}${!on&&!n?" dead":""}" data-a="${a.id}">
          <span>${a.l}</span><span class="n">${n}</span></button>`}).join("")+`</div></details>`}).join("")
    +cocoBlock(cur,base)+moneyBlock(cur,base);
  $("groups").querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.a;S.ab.has(id)?S.ab.delete(id):S.ab.add(id);S.limit=150;render()});
  /* Clicking a Coconut's name opens the card, so you can read what it does
     before deciding whether its filters are what you want. */
  $("groups").querySelectorAll("[data-cocosee]").forEach(b=>b.onclick=()=>{
    const co=COCO[+b.dataset.cocosee];if(co)openM(co.n+" - "+co.v)});
  const cg=$("cocogrp");if(cg)cg.ontoggle=()=>{COCOOPEN=cg.open};
  const mg=$("moneygrp");if(mg)mg.ontoggle=()=>{MONEYOPEN=mg.open};
  /* [data-g] only — the Coconut block has no data-g, so it is neither saved
     into GOPEN nor reopened from it, which is what keeps it always-closed. */
  $("groups").querySelectorAll("details.grp[data-g]").forEach(d=>d.ontoggle=()=>{
    /* Update the set in memory as well as on disk. Not doing that was the
       whole bug — see the note on GCLOSED. */
    if(d.open)GCLOSED.delete(d.dataset.g);else GCLOSED.add(d.dataset.g);
    saveGClosed()});
  /* "Jump to" — filled once, not on every render, or picking a category
     mid-keystroke would reset itself. #groups is rebuilt every render, so the
     handler queries it fresh each time it fires rather than caching a node. */
  const gj=$("grpJump");
  if(gj&&!gj.dataset.filled){
    gj.insertAdjacentHTML("beforeend",
      GROUPS.filter(g=>!g.money).map(g=>`<option value="${esc(g.g)}">${esc(g.g)}</option>`).join(""));
    gj.dataset.filled="1";
    gj.onchange=e=>{
      const gname=e.target.value;e.target.value="";if(!gname)return;
      const d=$("groups").querySelector(`details.grp[data-g="${CSS.escape(gname)}"]`);
      if(!d)return;
      d.open=true;GCLOSED.delete(gname);saveGClosed();
      d.scrollIntoView({block:"start",behavior:"smooth"})};
  }
  const nOn=S.ab.size;
  $("specialCnt").textContent=nOn?nOn+" active":GROUPS.length+" groups · "+AB.length+" filters";
  if(nOn&&!$("special").open)$("special").open=true;
}

/* ===================== pills ===================== */
function renderPills(){
  const f=$("sf"),inp=$("q");
  f.querySelectorAll(".pill").forEach(p=>p.remove());
  const add=(txt,k,v,col)=>{const d=document.createElement("span");d.className="pill";
    if(col)d.style.borderColor=col;
    d.innerHTML=`<span class="pt">${esc(txt)}</span><button class="x" data-k="${k}" data-v="${esc(v)}">×</button>`;
    f.insertBefore(d,inp)};
  S.ab.forEach(id=>{const a=AB.find(x=>x.id===id);if(a)add(a.l,"ab",id)});
  S.ink.forEach(i=>add(i,"ink",i,HEX[i]));
  if(S.dual)add("Dual Ink","dual","1");
  S.type.forEach(t=>add(t,"type",t));
  S.cls.forEach(c=>add(c,"cls",c));
  S.kw.forEach(k=>add(k,"kw",k));
  S.sto.forEach(s=>add("📖 "+s,"sto",s));
  S.art.forEach(a=>add("🖌️ "+a,"art",a));
  S.tag.forEach(t=>add("🏷️ "+t,"tag",t));
  S.terms.forEach(t=>add("\u201c"+t+"\u201d","term",t));
  S.rar.forEach(r=>add(r.replace("_"," "),"rar",r));
  if(S.set){const s=SETS.find(x=>x[0]===S.set);add(s?s[1].n:S.set,"set",S.set)}
  if(S.inkwell!=="any")add(S.inkwell==="yes"?"Inkable":"Not inkable","iw","");
  if(S.cost[0]!=null||S.cost[1]!=null)add("Cost "+(S.cost[0]??"")+"–"+(S.cost[1]??""),"cost","");
  if(S.fl)add("🐠 Flounder only","fl","");
  f.querySelectorAll(".x").forEach(b=>b.onclick=e=>{e.stopPropagation();
    const k=b.dataset.k,v=b.dataset.v;
    ({ab:()=>S.ab.delete(v),ink:()=>S.ink.delete(v),dual:()=>S.dual=false,type:()=>S.type.delete(v),
      cls:()=>S.cls.delete(v),kw:()=>S.kw.delete(v),sto:()=>S.sto.delete(v),tag:()=>S.tag.delete(v),
      art:()=>S.art.delete(v),term:()=>{S.terms=S.terms.filter(x=>x!==v)},rar:()=>S.rar.delete(v),
      set:()=>S.set="",iw:()=>S.inkwell="any",cost:()=>S.cost=[null,null],
      fl:()=>{S.fl=false;$("fb").classList.remove("on")}})[k]();
    S.limit=150;render()});
}

/* Everyday words people actually type for an ink. */
const INKWORDS={blue:"Sapphire",sapphire:"Sapphire",red:"Ruby",ruby:"Ruby",
  green:"Emerald",emerald:"Emerald",purple:"Amethyst",amethyst:"Amethyst",
  yellow:"Amber",gold:"Amber",amber:"Amber",grey:"Steel",gray:"Steel",silver:"Steel",steel:"Steel"};

/* Set names, and every distinctive word in them, resolved to a set code.
   "rise of the floodborn", "floodborn", "attack of the vine" and "vine" all
   land on the right set. Words shared by two sets are dropped rather than
   guessed at. */
let _setWords=null;
function setWords(){
  if(_setWords)return _setWords;
  const m=new Map(),seen=new Map();
  const norm=x=>x.toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
  SETS.forEach(([code,o])=>{
    const full=norm(o.n||"");
    if(full)m.set(full,code);
    norm(full).split(" ").forEach(w=>{
      if(w.length<4||["the","of","and","into"].includes(w))return;
      seen.set(w,seen.has(w)?"__dupe__":code)});
  });
  seen.forEach((code,w)=>{if(code!=="__dupe__"&&!m.has(w))m.set(w,code)});
  return _setWords=m;
}

/* Enter used to treat the whole box as ONE token, so "steel action" resolved to
   nothing and became a literal phrase that appears in no card. It now walks the
   words and resolves the longest run it recognises at each step: "steel" is an
   ink, "action" is a type, "rise of the floodborn" is a set. Anything it can't
   place stays a free-text term, exactly as before. */
/* Non-mutating peek: would this one word, on its own, resolve to some
   fixed-vocabulary facet (type, class, keyword, franchise, artist, rarity,
   set)? Used below so a bare color word only spends itself as an ink filter
   when whatever follows it is ALSO a real facet -- "green action" -- rather
   than an art description like "green eyes", where "eyes" isn't a facet at
   all and the two words belong together as one search phrase, not an
   Emerald-ink filter plus a stray "eyes". */
function looksLikeFacet(word){
  const lc=word.replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
  if(!lc)return false;
  if(setWords().has(lc))return true;
  const RAR=["common","uncommon","rare","super rare","legendary","enchanted","epic","iconic"];
  if(RAR.includes(lc))return true;
  if(lc==="inkable"||lc==="inkwell")return true;
  if(["character","action","item","location"].includes(lc))return true;
  if(CLASSES.some(x=>x.toLowerCase()===lc))return true;
  if(KWS.some(x=>x.toLowerCase()===lc))return true;
  if(STORIES.some(x=>x.toLowerCase()===lc))return true;
  if(ARTISTS.some(x=>x.toLowerCase()===lc))return true;
  return false;
}
function tryToken(raw){
  const t=raw.trim();if(!t)return false;
  const words=t.split(/\s+/);
  if(words.length>1&&!/[:<>=]/.test(t)){
    let i=0,any=false,leftover=[];
    while(i<words.length){
      let hit=false;
      for(let len=Math.min(6,words.length-i);len>=1&&!hit;len--){
        const phrase=words.slice(i,i+len).join(" ");
        if(len===1&&i+1<words.length&&INKWORDS[phrase.toLowerCase()]&&
           !looksLikeFacet(words[i+1]))continue;
        if(tryOne(phrase,true)){i+=len;hit=any=true}
      }
      if(!hit){leftover.push(words[i]);i++}
    }
    /* Whatever was left is one phrase, the way it was typed. */
    if(leftover.length){
      const rest=leftover.join(" ").toLowerCase();
      if(!S.terms.includes(rest)){S.terms.push(rest);any=true}
    }
    return any;
  }
  return tryOne(t,false);
}
/* `strict` means "only accept a real facet" — used while walking a multi-word
   query, where falling back to free text per word would shred the phrase. */
function tryOne(raw,strict){
  const t=raw.trim();if(!t)return false;
  const lc=t.toLowerCase();
  const sw=setWords().get(lc.replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim());
  if(sw){S.set=sw;return true}
  const iw=INKWORDS[lc];
  if(iw){const cap=FMT[deck().fmt].cap;
    if(S.ink.has(iw))return true;
    if(S.ink.size<cap){S.ink.add(iw);return true}
    if(strict)return true}
  const RAR=["Common","Uncommon","Rare","Super Rare","Legendary","Enchanted","Epic","Iconic"];
  const rr=RAR.find(x=>x.toLowerCase()===lc);
  if(rr){S.rar.add(rr);return true}
  if(lc==="inkable"||lc==="inkwell"){S.inkwell="true";return true}
  const hit=(arr)=>arr.find(x=>x.toLowerCase()===lc);
  const ty=["Character","Action","Item","Location"].find(x=>x.toLowerCase()===lc);
  if(ty){S.type.add(ty);return true}
  const cl=hit(CLASSES); if(cl){S.type.add(cl);return true}      // Song lives here
  const kw=hit(KWS);     if(kw){S.kw.add(kw);return true}
  const so=hit(STORIES); if(so){S.sto.add(so);return true}
  const ar=hit(ARTISTS); if(ar){S.art.add(ar);return true}
  const cw=chipFor(t); if(cw){S.ab.add(cw);return true}
  const inkm=INKS.find(x=>x.toLowerCase()===lc);
  if(inkm){const cap=FMT[deck().fmt].cap;if(S.ink.size<cap){S.ink.add(inkm);return true}}
  if(strict)return false;
  // not a known type/classification/keyword/franchise/ink — keep it as a
  // removable free-text term so "animal" behaves like every other filter
  if(!/[:<>=]/.test(t)&&!S.terms.includes(lc)){S.terms.push(lc);return true}
  return false;
}

/* ===================== sidebar ===================== */
function sec(id,title,body,cnt,open){
  return `<details class="sec" id="s-${id}"${open?" open":""}><summary>${title}<span class="secn">${cnt||""}</span></summary><div class="sb">${body}</div></details>`}
function checklist(items,sel,attr){
  return `<div class="list">`+items.map(([v,n])=>
    `<label class="${n?"":"z"}"><input type="checkbox" data-${attr}="${esc(v)}"${sel.has(v)?" checked":""}>
     <span class="lb">${esc(v)}</span><span class="lc">${n}</span></label>`).join("")+`</div>`}
function renderSide(){
  const cap=FMT[deck().fmt].cap;
  const cnt=(base,pred)=>base.reduce((s,c)=>s+(pred(c)?1:0),0);
  const bInk=filt("ink"),bTy=filt("type"),bRar=filt("rar"),bKw=filt("kw"),bCls=filt("cls"),bSto=filt("sto"),bArt=filt("art");
  /* Facet counts, in ONE pass per facet instead of one pass per option.
     Counting 428 illustrators by asking "how many cards have this one?" 428
     times is 428 walks of 2,543 cards — over a million checks, every render,
     just to put a number next to a name. Walking the cards once and tallying
     what each one has costs 2,543. Same numbers, same order, ~400x less work.
     The Map is built from the same `base` array the old code counted, so a
     facet still counts itself out exactly as before. */
  const tally=(base,keysOf)=>{
    const m=new Map();
    for(const c of base){const ks=keysOf(c);if(!ks)continue;
      for(const k of ks){if(k==null)continue;m.set(k,(m.get(k)||0)+1)}}
    return m};
  const nRar=tally(bRar,c=>[c.r]);
  const nKw=tally(bKw,c=>c.kw.map(x=>x[0]));
  const nCls=tally(bCls,c=>c.sub);
  const nSto=tally(bSto,c=>[c.sto]);
  const nArt=tally(bArt,c=>c.ar);
  /* Type is the one facet where a card can answer to more than one option —
     a Song is an Action AND a Song — so both its type and its subtypes count. */
  const nTy=tally(bTy,c=>[c.ty,...(c.sub||[])]);
  const at=(m,k)=>m.get(k)||0;

  const inkB=`<div class="inks inkgrid">${INKS.map(i=>`<button class="ic${S.ink.has(i)?" on":""}" data-ink="${i}">${i}</button>`).join("")}
    <button class="ic dual${S.dual?" on":""}" data-dual="1">Dual Ink</button></div>
    <div class="cap">${S.ink.size}/${cap} inks — ${FMT[deck().fmt].l}</div>`;
  const TY=["Character","Action","Item","Location","Song"];
  const tyB=`<div class="inks tygrid">${TY.map(t=>`<button class="ic${S.type.has(t)?" on":""}" data-type="${t}">${t} <span style="opacity:.6">${
    at(nTy,t)}</span></button>`).join("")}</div>`;
  const RAR=["Common","Uncommon","Rare","Super Rare","Legendary","Enchanted","Epic","Iconic","Special","Promo"];
  const rarB=checklist(RAR.map(r=>[r,at(nRar,r)]).filter(x=>x[1]||S.rar.has(x[0])),S.rar,"rar");
  const kwB=checklist(KWS.map(k=>[k,at(nKw,k)]),S.kw,"kw");
  const clsItems=CLASSES.map(x=>[x,at(nCls,x)])
    .filter(x=>!S.clsQ||x[0].toLowerCase().includes(S.clsQ));
  const clsB=`<input class="mini" id="clsQ" placeholder="filter classifications…" value="${esc(S.clsQ)}">`+checklist(clsItems,S.cls,"cls");
  const stoItems=STORIES.map(x=>[x,at(nSto,x)])
    .filter(x=>!S.stoQ||x[0].toLowerCase().includes(S.stoQ));
  const stoB=`<input class="mini" id="stoQ" placeholder="filter franchises…" value="${esc(S.stoQ)}">`+checklist(stoItems,S.sto,"sto");
  const artItems=ARTISTS.map(x=>[x,at(nArt,x)])
    .filter(x=>(x[1]||S.art.has(x[0]))&&(!S.artQ||x[0].toLowerCase().includes(S.artQ)))
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const artB=`<input class="mini" id="artQ" placeholder="filter illustrators…" value="${esc(S.artQ)}">`
    +checklist(artItems,S.art,"art")
    +`<div class="hint" style="margin:6px 0 0">${ARTISTS.length} illustrators · collaborations count for
       everyone credited. You can also type <code>artist:kole</code> or an exact name + Enter.</div>`;
  const costB=`<div class="rng"><input type="number" id="c0" placeholder="min" value="${S.cost[0]??""}"> – <input type="number" id="c1" placeholder="max" value="${S.cost[1]??""}"></div>`;
  const statB=["st","wi","lo"].map((k,i)=>`<div class="rng" style="margin-bottom:5px">${["St","Wi","Lo"][i]}
     <input type="number" id="${k}0" value="${S[k][0]??""}"> – <input type="number" id="${k}1" value="${S[k][1]??""}"></div>`).join("");
  const prefB=`<select id="prPref">
      ${[["base","Base printing"],["promo","Promo / special art"],["enchanted","Enchanted art"]]
        .map(([v,l])=>`<option value="${v}"${PREF===v?" selected":""}>${l}</option>`).join("")}
    </select><div class="hint" style="margin:6px 0 0">Which art to show when a card has more than one
      printing. Falls back to the base art for cards that don't have that version.
      ${CARDS.filter(c=>(c.pr||[]).length>1).length} cards have alternates.</div>`;
  /* Inkable and Set were one section called "Inkable & Set". They answer
     completely different questions and inkable is one of the first things
     anyone narrows by, so they're split and inkable moved near the top. */
  const iwB=`<div class="inks iwstack">${[["any","Any"],["yes","Can be inked"],["no","Cannot be inked"]]
      .map(([v,l])=>`<button class="ic${S.inkwell===v?" on":""}" data-iw="${v}">${l}</button>`).join("")}</div>`;
  const setB=`<select id="setSel"><option value="">All sets</option>${
      SETS.map(([c,o])=>`<option value="${esc(c)}"${S.set===c?" selected":""}>${esc(o.n)}</option>`).join("")}</select>`;

  const tagCounts={};
  filt("tag").forEach(c=>(c.tg||[]).forEach(t=>tagCounts[t]=(tagCounts[t]||0)+1));
  const tagItems=Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
    .filter(x=>!S.tagQ||x[0].toLowerCase().includes(S.tagQ));
  const tagB=tagItems.length
    ? `<input class="mini" id="tagQ" placeholder="filter art tags…" value="${esc(S.tagQ)}">`+checklist(tagItems,S.tag,"tag")
    : `<div class="hint" style="margin:0">No art tags yet. Tag cards in <b>flounder-tagger.html</b>,
        export, paste into art-tags.json and rerun the build.</div>`;

  /* ORDER MATTERS. This is the order people actually narrow a search in:
     which inks am I playing → can I ink it → what does it cost → what kind of
     card is it. Everything after that is a refinement, and the two that need
     you to already know what you're looking for — illustrator and art tags —
     sit at the bottom, art tags directly under illustrator because they are
     both "who drew it / what's in the picture" questions. */
  $("sidebody").innerHTML=
    sec("ink","Ink",inkB,S.ink.size?S.ink.size+" on":"",S.ink.size<cap)+
    sec("iw","Inkable",iwB,S.inkwell==="any"?"":(S.inkwell==="yes"?"inkable":"uninkable"),true)+
    sec("cost","Cost",costB,"",true)+
    sec("type","Type",tyB,S.type.size?S.type.size+" on":"",true)+
    sec("rar","Rarity",rarB,S.rar.size?S.rar.size+" on":"",false)+
    sec("kw","Keyword",kwB,S.kw.size?S.kw.size+" on":"",false)+
    sec("cls","Classification",clsB,S.cls.size?S.cls.size+" on":"",false)+
    sec("sto","Franchise",stoB,S.sto.size?S.sto.size+" on":"",false)+
    sec("set","Set",setB,S.set?"1 on":"",false)+
    sec("stat","Strength / Willpower / Lore",statB,"",false)+
    sec("art","Illustrator",artB,S.art.size?S.art.size+" on":"",false)+
    sec("tag","Art tags",tagB,S.tag.size?S.tag.size+" on":"",false)+
    sec("pref","Card images",prefB,PREF==="base"?"":PREF,false);

  /* Collapsed, the panel has to say whether anything is hidden inside it —
     otherwise a filter left on becomes an invisible reason the grid is empty.
     Counting every facet, not just the tick-boxes, so a cost range or a set
     picked and forgotten is announced too. */
  const nRange=[S.cost,S.st,S.wi,S.lo].filter(r=>r[0]!=null||r[1]!=null).length;
  const nOn=S.ink.size+S.type.size+S.rar.size+S.kw.size+S.cls.size+S.sto.size+S.tag.size+S.art.size
    +nRange+(S.dual?1:0)+(S.set?1:0)+(S.inkwell!=="any"?1:0);
  const fc=$("fcnt");if(fc)fc.textContent=nOn?nOn+" on":"";

  const sd=$("side");
  sd.querySelectorAll("[data-ink]").forEach(b=>b.onclick=()=>{const v=b.dataset.ink;
    if(S.ink.has(v))S.ink.delete(v);
    else{if(S.ink.size>=cap){toast(FMT[deck().fmt].l+" allows only "+cap+" inks");return}S.ink.add(v)}
    S.limit=150;render()});
  sd.querySelector("[data-dual]").onclick=()=>{S.dual=!S.dual;S.limit=150;render()};
  sd.querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>{const v=b.dataset.type;
    S.type.has(v)?S.type.delete(v):S.type.add(v);S.limit=150;render()});
  [["rar",S.rar],["kw",S.kw],["cls",S.cls],["sto",S.sto],["tag",S.tag],["art",S.art]].forEach(([a,set])=>
    sd.querySelectorAll("[data-"+a+"]").forEach(i=>i.onchange=()=>{
      const v=i.dataset[a];i.checked?set.add(v):set.delete(v);S.limit=150;render()}));
  const keep=(id,prop)=>{const e=$(id);if(!e)return;e.oninput=()=>{S[prop]=e.value.toLowerCase();
    const p=e.selectionStart;renderSide();const n=$(id);if(n){n.focus();n.setSelectionRange(p,p)}}};
  keep("clsQ","clsQ");keep("stoQ","stoQ");keep("tagQ","tagQ");keep("artQ","artQ");
  const bind=(id,fn)=>{const e=$(id);if(e)e.onchange=()=>{fn(e.value===""?null:+e.value);S.limit=150;render()}};
  bind("c0",v=>S.cost[0]=v);bind("c1",v=>S.cost[1]=v);
  ["st","wi","lo"].forEach(k=>{bind(k+"0",v=>S[k][0]=v);bind(k+"1",v=>S[k][1]=v)});
  sd.querySelectorAll("[data-iw]").forEach(b=>b.onclick=()=>{
    S.inkwell=b.dataset.iw;S.limit=150;render()});
  $("setSel").onchange=e=>{S.set=e.target.value;S.limit=150;render()};
  $("prPref").onchange=e=>{PREF=e.target.value;save("fs3_print",PREF);render();
    toast(PREF==="base"?"Showing base art":PREF==="promo"?"Preferring promo art":"Preferring enchanted art")};
}

/* ===================== grid ===================== */
const hasShift=c=>c.kw.some(k=>/shift/i.test(k[0]||""));
const isLoc=c=>c.ty==="Location";
