/* =========================================================================
   THE NEW DECK BUILDER  (?newbuilder=1)
   -------------------------------------------------------------------------
   Source file: newbuilder/nb.js. build_flounder.py inlines it at the very
   end of the main closure in flounder-search.template.html, so it can see
   and wrap every function above it. The spec is deck-builder-plan.md.

   Ground rules this file keeps:
   · Flag off (the default), it does two things only: records the Phase 0
     analytics events for the classic builder, and removes its own offline
     worker if one was installed. The classic builder is otherwise untouched.
   · It REUSES the classic builder's engine — the search (filt/sortC), the 72
     special searches (GROUPS), the deck functions (addCard, setCardCount,
     undo, saveDeckPrompt …) and the saved-deck format. Only the layout is
     new, which is how every power feature survives.
   · Saved decks keep their exact format. The only new storage keys are
     fs3_nb, fs3_nb_work (the unsaved working copy), fs3_nb_recent,
     fs3_nb_dview, fs3_nb_theme and fs3_nb_hint.
   · Later phases plug in through NBX (bottom of this file): extra deck-panel
     tabs, extra start-screen options, extra drawer sections.
   ========================================================================= */
(function nbMain(){
const NB=document.documentElement.classList.contains("nb");

/* ===================== Phase 0 · analytics (both builders) =====================
   Six moments, sent to Vercel Web Analytics as custom events. On a Vercel
   plan without custom events they are simply dropped — no errors, no cost.
   The queue stub is the one Vercel's own snippet installs, so events fired
   before the deferred script loads are still delivered. */
window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};
const NB_T0=Date.now();
function nbTrack(name,data){
  try{window.va("event",{name,data:Object.assign({builder:NB?"new":"classic"},data||{})})}catch(e){}
}
let nbFirstAdded=false;const nbHit60=new Set();
nbTrack("builder_opened");
{
  const _touch=touchDeck;
  touchDeck=function(){
    _touch.apply(this,arguments);
    try{
      const tot=dtotal();
      if(!nbFirstAdded&&tot>0){nbFirstAdded=true;
        nbTrack("first_card_added",{seconds:Math.round((Date.now()-NB_T0)/1000)})}
      const min=(FMT[deck().fmt]||{}).min||60;
      if(min&&tot>=min&&!nbHit60.has(DECKS.cur)){nbHit60.add(DECKS.cur);
        nbTrack("deck_reached_60",{seconds:Math.round((Date.now()-NB_T0)/1000)})}
      if(NB)nbQueueWork();
    }catch(e){}
  };
  const _save=saveDeckPrompt;
  saveDeckPrompt=async function(ev){
    const r=await _save.apply(this,arguments);
    try{if(!DECKDIRTY&&dtotal())nbTrack("deck_saved",{cards:dtotal()})}catch(e){}
    return r;
  };
  const _link=copyDeckLink;
  copyDeckLink=function(){nbTrack("deck_shared",{how:"link"});return _link.apply(this,arguments)};
  const _share=shareLink;
  shareLink=function(){nbTrack("deck_shared",{how:"share"});return _share.apply(this,arguments)};
  {const sh=$("sh");if(sh)sh.onclick=shareLink}
  const _tcg=tcgOpen;
  tcgOpen=function(){nbTrack("deck_exported",{how:"tcgplayer"});return _tcg.apply(this,arguments)};
  /* Exports that are plain buttons rather than named functions: caught by id. */
  document.addEventListener("click",e=>{
    const b=e.target&&e.target.closest&&e.target.closest("#dc,#nbCopyTxt,[data-pullprint],#pullPrint,#dkImg,#saveImg,#regOpen");
    if(b)nbTrack("deck_exported",{how:b.id||"button"});
  },true);
}

/* ===================== flag off: stop here ===================== */
if(!NB){
  /* Someone who tried the new builder and switched back shouldn't keep its
     offline worker. Only ours is removed — matched by its script name. */
  try{if(location.protocol==="https:"&&navigator.serviceWorker&&navigator.serviceWorker.getRegistrations)
    navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>{
      const s=(r.active&&r.active.scriptURL)||"";if(/\/sw\.js$/.test(s))r.unregister()})).catch(()=>{})}catch(e){}
  return;
}

/* ===================== small helpers ===================== */
const NBQ=(s,r)=>(r||document).querySelector(s);
const NBQA=(s,r)=>[...(r||document).querySelectorAll(s)];
const nbEl=h=>{const t=document.createElement("template");t.innerHTML=h.trim();return t.content.firstElementChild};
const nbLS={get(k,f){try{const v=localStorage.getItem(k);return v==null?f:JSON.parse(v)}catch(e){return f}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}};
const nbCard=f=>CARDS.find(x=>x.f===f);
const nbInkNames=c=>(c.co||[]).join("/")||"No ink";
const nbDot=i=>`<i class="nbdot" style="--ic:${HEX[i]||"#888"}" aria-hidden="true"></i>`;
const nbPhoneList=()=>matchMedia("(max-width:639px)").matches;
const nbCompact=()=>matchMedia("(max-width:1023px)").matches;
const nbTouch=()=>matchMedia("(hover:none)").matches;
const nbFmtMin=()=>(FMT[deck().fmt]||{min:60}).min;
const nbCountTxt=n=>n.toLocaleString()+" card"+(n===1?"":"s");
function nbMenu(btn,menu){
  btn.addEventListener("click",e=>{e.stopPropagation();
    const open=menu.hidden;nbCloseMenus();menu.hidden=!open;btn.setAttribute("aria-expanded",String(open));
    if(open){const f=menu.querySelector("button:not([disabled]),a");if(f)f.focus()}});
  menu.addEventListener("click",e=>{if(e.target.closest("button,a"))nbCloseMenus()});
}
function nbCloseMenus(){NBQA(".nbmenu").forEach(m=>m.hidden=true);
  NBQA("[aria-haspopup=true]").forEach(b=>b.setAttribute("aria-expanded","false"))}
document.addEventListener("click",e=>{if(!e.target.closest(".nbmenu"))nbCloseMenus()});

/* ===================== 1 · the shell =====================
   Existing pieces are MOVED, not rebuilt, so every handler already bound to
   them keeps working: the search box and its pills, the art/franchise/flavour
   switches, Syntax, the 72 special searches, the full Filters list, and the
   classic deck panel (which becomes the "Stats & tools" tab). */
const vS=$("vSearch"),WRAP=vS.querySelector(".wrap"),POOL=vS.querySelector("section.cards"),
      SCOL=$("searchcol"),OLDDECK=$("deck"),HEADER=document.querySelector("header");

/* header: five places, plus a theme switch */
const NAV=nbEl(`<nav class="nbnav" id="nbNav" aria-label="Main">
  <button type="button" data-go="build">Build</button>
  <button type="button" data-go="cards">Cards</button>
  <button type="button" data-go="decks">Decks</button>
  <button type="button" data-go="coll">Collection</button>
  <span class="nbmorewrap">
    <button type="button" data-go="more" id="nbMoreBtn" aria-haspopup="true" aria-expanded="false">More <span aria-hidden="true">▾</span></button>
    <div class="nbmenu" id="nbMoreMenu" role="menu" hidden>
      <button type="button" data-more="guided">🥥 Guided Coconut Build</button>
      <button type="button" data-more="meta">🏆 Top decks</button>
      <button type="button" data-more="lore">Lore tracker</button>
      <a href="https://map.readysetink.com/" target="_blank" rel="noopener">Store &amp; event map ↗</a>
      <a href="https://inklist.readysetink.com/" target="_blank" rel="noopener">The Ink List ↗</a>
      <button type="button" data-more="other">Games, guides &amp; everything else</button>
      <button type="button" data-more="pref">Settings</button>
      <div class="nbsep"></div>
      <button type="button" data-more="theme">Light / dark theme</button>
      <button type="button" data-more="keys" class="nbdesk">Keyboard shortcuts <kbd>?</kbd></button>
      <button type="button" data-more="tour">Welcome tour</button>
      <button type="button" data-more="classic">Switch back to the classic builder</button>
    </div>
  </span>
</nav>`);
$("logo").after(NAV);
const THEMEB=nbEl(`<button type="button" class="nbtheme" id="nbTheme" aria-label="Switch theme" title="Light / dark"><span aria-hidden="true">◐</span></button>`);
($("acct")||HEADER.lastElementChild).before(THEMEB);
NAV.querySelectorAll("[data-go]").forEach(b=>{if(b.dataset.go==="more")return;
  b.onclick=()=>({build:()=>showSearch(),cards:()=>showTab("tSearch"),
    decks:()=>showTab("tDecks"),coll:()=>showTab("tColl")})[b.dataset.go]()});
nbMenu($("nbMoreBtn"),$("nbMoreMenu"));
$("nbMoreMenu").querySelectorAll("[data-more]").forEach(b=>b.onclick=()=>{
  const k=b.dataset.more;
  if(k==="guided"){const g=$("mGuided");if(g)g.click();return}
  if(k==="lore"){const l=$("tLore");if(l)l.click();return}
  if(k==="other"){const o=$("tOther");if(o)o.click();return}
  if(k==="meta"||k==="pref"){OPAGE=k;save("fs3_opage",OPAGE);showTab("tOther");return}
  if(k==="keys"){nbShortcuts();return}
  if(k==="theme"){THEMEB.click();return}
  if(k==="tour"){startTour(true);return}
  if(k==="classic"){location.href=location.pathname+"?newbuilder=0"+location.hash}
});

/* the filter bar, above the card pool */
const BAR=nbEl(`<div class="nbbar" id="nbBar">
  <div class="nbrecent" id="nbRecent" hidden></div>
  <div class="nbline nbsearchline">
    <div class="nbsfwrap" id="nbSfWrap"></div>
    <button type="button" class="nbbtn" id="nbFiltersBtn" aria-expanded="false" aria-controls="nbMoreP">Filters<span class="nbn" id="nbFiltersN"></span></button>
    <button type="button" class="nbbtn nbspec" id="nbSpecBtn" aria-expanded="false" aria-controls="nbDrawer" aria-label="Special searches">✨ <span class="nbspecl">Special searches</span><span class="nbn" id="nbSpecN"></span></button>
  </div>
  <div class="nbline nbquick" id="nbQuick" role="toolbar" aria-label="Quick filters"></div>
  <button type="button" class="nbpeek" id="nbPeek" aria-label="Show your deck">
    <span class="nbgrab" aria-hidden="true"></span>
    <b id="nbPeekN">0 / 60</b><span class="nbpeeki" id="nbPeekI">Empty deck</span>
    <span class="nbmini" id="nbPeekC" aria-hidden="true"></span>
    <span class="nbchev" aria-hidden="true">▴</span>
  </button>
</div>`);
POOL.prepend(BAR);
$("nbSfWrap").appendChild($("sf"));
{const ac=$("acbox");if(ac)$("nbSfWrap").appendChild(ac)}
$("q").setAttribute("aria-label","Search cards by name, text, or what's in the art");
const nbPH=()=>{$("q").placeholder=nbCompact()?"Search cards or “blue dog”":"Search — a name, “draw a card”, or “blue dog”"};
nbPH();matchMedia("(max-width:1023px)").addEventListener("change",nbPH);

/* the start panel and banners sit between the bar and the grid */
const START=nbEl(`<div class="nbstart" id="nbStart" hidden></div>`);
BAR.after(START);
const CMPBAR=nbEl(`<div class="nbcmpbar" id="nbCmpBar" role="status" hidden>
  <span>Pick a second card to compare</span><button type="button" class="nbbtn" id="nbCmpX">Cancel</button></div>`);
START.after(CMPBAR);

/* "More filters": a dropdown on a laptop, a half-height sheet on a phone */
const MOREP=nbEl(`<div class="nbpanel" id="nbMoreP" role="dialog" aria-label="More filters" hidden>
  <div class="nbph"><b>Filters</b><button type="button" class="nbx" data-nbclose aria-label="Close filters">×</button></div>
  <div class="nbpb">
    <section class="nbsec nbsheetonly"><div id="nbMoreQuick"></div></section>
    <section class="nbsec"><h4>Popular special searches</h4><div class="nbtop6" id="nbTop6"></div>
      <button type="button" class="nblink" id="nbAllSpec">All 72 special searches →</button></section>
    <section class="nbsec" id="nbSearchIn"><h4>Your words also search</h4></section>
    <section class="nbsec" id="nbTools"></section>
    <section class="nbsec" id="nbFacets"></section>
  </div>
  <div class="nbpf"><button type="button" class="nbshow" data-nbclose id="nbShowN">Show cards</button></div>
</div>`);
BAR.appendChild(MOREP);
{const ar=SCOL.querySelector(".artrow");if(ar)$("nbSearchIn").appendChild(ar);
 const sr=SCOL.querySelector(".srow");if(sr)$("nbTools").appendChild(sr);
 const sy=$("syh");if(sy)$("nbTools").appendChild(sy);
 const sd=$("side");if(sd){$("nbFacets").appendChild(sd);nbForceOpen(sd,"fs3_sideopen")}}

/* the Special searches drawer, sliding in from the left */
const SCRIM=nbEl(`<div class="nbscrim" id="nbScrim" hidden></div>`);
const DRAWER=nbEl(`<aside class="nbdrawer" id="nbDrawer" role="dialog" aria-modal="true" aria-labelledby="nbDrT" hidden>
  <div class="nbph"><div><b id="nbDrT">✨ Special searches</b>
    <span class="nbsub">Find cards by the job they do in a deck</span></div>
    <button type="button" class="nbx" data-nbclose aria-label="Close special searches">×</button></div>
  <div class="nbdrs"><input id="nbDrQ" type="search" autocomplete="off"
    placeholder="Find a special search — “draw”, “bounce”, “ramp”…" aria-label="Find a special search"></div>
  <div class="nbpb" id="nbDrBody"></div>
  <div class="nbpf"><button type="button" class="nbshow" data-nbclose id="nbDrShow">Show cards</button></div>
</aside>`);
/* The scrim lives inside <main>, not <body>: <main> is its own stacking layer
   (z-index 1), so only a scrim inside it can sit between the page and the
   phone dock / deck sheet, which live in <main> too. */
document.querySelector("main").appendChild(SCRIM);
document.body.append(DRAWER);
{const sp=$("special");if(sp){$("nbDrBody").appendChild(sp);nbForceOpen(sp,"fs3_spec")}}
function nbForceOpen(det,key){
  /* The classic builder remembers whether these were open; opening them here
     shouldn't change what the classic builder shows next time. */
  const prev=(()=>{try{return localStorage.getItem(key)}catch(e){return null}})();
  det.open=true;
  /* Nothing in the new layout should be able to fold these shut: their
     summary rows are hidden, so a closed one could never be reopened. */
  det.addEventListener("toggle",()=>{if(!det.open)det.open=true});
  setTimeout(()=>{try{prev===null?localStorage.removeItem(key):localStorage.setItem(key,prev)}catch(e){}},0);
}

/* the deck panel: always on screen from 1024px, a bottom sheet below that */
const DECKP=nbEl(`<aside class="nbdeck" id="nbDeck" aria-label="Your deck">
  <div class="nbdh">
    <button type="button" class="nbsheetgrab" id="nbSheetGrab" aria-label="Close deck"><span aria-hidden="true"></span></button>
    <div class="nbdh1">
      <button type="button" class="nbdname" id="nbDName" title="Rename this deck"></button>
      <span class="nbsave" id="nbSaveState" role="status"></span>
      <button type="button" class="nbbtn go" id="nbSave">Save</button>
      <span class="nbmorewrap">
        <button type="button" class="nbbtn nbicon" id="nbDMenuBtn" aria-label="Deck options" aria-haspopup="true" aria-expanded="false">⋯</button>
        <div class="nbmenu right" id="nbDMenu" role="menu" hidden></div>
      </span>
    </div>
    <div class="nbdh2">
      <select id="nbDSel" aria-label="Switch deck"></select>
      <div class="nbfmt" id="nbFmt" role="group" aria-label="Format"></div>
    </div>
    <div class="nbprog" id="nbProg"></div>
    <div class="nbwarn" id="nbWarn"></div>
    <div class="nbtabs" id="nbTabs" role="tablist" aria-label="Deck views"></div>
  </div>
  <div class="nbdbody" id="nbDBody">
    <div class="nbpane" id="nbPane-list" role="tabpanel">
      <div class="nbltools">
        <label>Group by <select id="nbGroup">
          <option value="type">Type</option><option value="cost">Cost</option>
          <option value="ink">Ink</option><option value="name">Name</option></select></label>
        <span class="nbseg" role="group" aria-label="Show the deck as">
          <button type="button" data-dv="list">List</button><button type="button" data-dv="img">Images</button></span>
      </div>
      <div id="nbList"></div>
    </div>
    <div class="nbpane" id="nbPane-tools" role="tabpanel" hidden></div>
  </div>
  <div class="nbdfoot" id="nbDFoot"></div>
</aside>`);
WRAP.appendChild(DECKP);
$("nbPane-tools").appendChild(OLDDECK);

/* one floating preview for the deck list, one toast for undo, one hint card */
const PREV=nbEl(`<div class="nbprev" id="nbPrev" aria-hidden="true" hidden><img alt=""></div>`);
const UTOAST=nbEl(`<div class="nbutoast" id="nbUToast" role="status" aria-live="polite" hidden>
  <span id="nbUTxt"></span><button type="button" id="nbUBtn">Undo</button></div>`);
const ACT=nbEl(`<div class="nbact" id="nbAct" role="dialog" aria-modal="true" aria-labelledby="nbActT" hidden>
  <div class="nbph"><b id="nbActT"></b><button type="button" class="nbx" data-nbclose aria-label="Close">×</button></div>
  <div class="nbactsub">How many in this deck?</div>
  <div class="nbcounts" id="nbCounts"></div>
  <div class="nbacts"><button type="button" class="nbbtn" data-act="info">Card details</button>
    <button type="button" class="nbbtn" data-act="compare">Compare with another card</button></div>
</div>`);
document.body.append(PREV,UTOAST,ACT);

/* Ko-fi: out of the builder entirely. One plain link in the site footer,
   which only shows on the "everything else" page. */
{const f=$("sitefoot");if(f&&!f.querySelector(".nbkofi"))f.prepend(nbEl(
  `<a class="nbkofi" href="https://ko-fi.com/J2E225ZV4T" target="_blank" rel="noopener">Support Ready Set Ink on Ko-fi</a>`))}

/* ===================== 2 · panels, drawer, sheets ===================== */
let nbOpenPanel=null;
function nbOpen(id,btnId){
  nbCloseAll(true);
  const p=$(id);if(!p)return;
  p.hidden=false;nbOpenPanel=id;
  if(btnId){const b=$(btnId);if(b)b.setAttribute("aria-expanded","true")}
  const modal=id==="nbDrawer"||id==="nbAct"||nbCompact()||id==="nbDeck";
  SCRIM.hidden=!modal;
  document.documentElement.classList.toggle("nbmodal",modal);
  if(id==="nbDrawer")setTimeout(()=>$("nbDrQ").focus(),30);
}
function nbCloseAll(quiet){
  ["nbMoreP","nbDrawer","nbAct"].forEach(i=>{const p=$(i);if(p)p.hidden=true});
  ["nbFiltersBtn","nbSpecBtn"].forEach(i=>{const b=$(i);if(b)b.setAttribute("aria-expanded","false")});
  DECKP.classList.remove("open");
  SCRIM.hidden=true;nbOpenPanel=null;
  document.documentElement.classList.remove("nbmodal");
  if(!quiet)PREV.hidden=true;
}
$("nbFiltersBtn").onclick=e=>{e.stopPropagation();nbOpenPanel==="nbMoreP"?nbCloseAll():nbOpen("nbMoreP","nbFiltersBtn")};
$("nbSpecBtn").onclick=()=>nbOpen("nbDrawer","nbSpecBtn");
$("nbAllSpec").onclick=()=>nbOpen("nbDrawer","nbSpecBtn");
SCRIM.onclick=()=>nbCloseAll();
document.addEventListener("click",e=>{
  if(!e.target.closest("#nbRecent,#q"))$("nbRecent").hidden=true;
  if(e.target.closest("[data-nbclose]")){nbCloseAll();return}
  /* the dropdown closes on a click anywhere else, on a laptop */
  if(nbOpenPanel==="nbMoreP"&&!nbCompact()&&!e.target.closest("#nbMoreP,#nbFiltersBtn,#acbox,.cfmbg,.mbg"))nbCloseAll();
});

/* drawer: search inside the 72 */
$("nbDrQ").addEventListener("input",nbDrFilter);
function nbDrFilter(){
  const q=($("nbDrQ").value||"").trim().toLowerCase();
  const G=$("groups");if(!G)return;
  G.classList.toggle("nbfiltering",!!q);
  NBQA("details.grp,details",G).forEach(d=>{
    const chips=NBQA(".chip",d);
    if(d.id==="cocogrp"||d.id==="moneygrp"){
      /* the long Coconut and Money lists stay out of a search unless it names them */
      const t=(d.querySelector("summary")||{textContent:""}).textContent.toLowerCase();
      d.hidden=!!q&&!t.includes(q);return}
    if(!chips.length)return;
    let any=false;
    chips.forEach(c=>{const hit=!q||c.textContent.toLowerCase().includes(q)||
        (d.querySelector("summary")||{textContent:""}).textContent.toLowerCase().includes(q);
      c.hidden=!hit;if(hit)any=true});
    d.hidden=!!q&&!any;
    if(q&&any)d.open=true;
  });
}

/* ===================== 3 · quick filters ===================== */
const NB_TYPES=[["Character","Characters"],["Action","Actions"],["Song","Songs"],["Item","Items"],["Location","Locations"]];
function nbQuickHTML(where){
  const [lo,hi]=S.cost,costOn=lo!=null||hi!=null;
  const costIn=n=>costOn&&n>=(lo==null?0:lo)&&(hi==null||n<=hi);
  const d=deck();
  const inks=INKS.map(i=>`<button type="button" class="nbchip nbink${S.ink.has(i)?" on":""}" data-ink="${i}"
      aria-pressed="${S.ink.has(i)}" style="--ic:${HEX[i]}">${nbDot(i)}<span>${i}</span></button>`).join("");
  const costs=[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" class="nbchip nbcostc${costIn(n)?" on":""}"
      data-cost="${n}" aria-pressed="${costIn(n)}" aria-label="Cost ${n===9?"9 or more":n}">${n===9?"9+":n}</button>`).join("");
  const types=NB_TYPES.map(([t,l])=>`<button type="button" class="nbchip${S.type.has(t)?" on":""}" data-type="${t}"
      aria-pressed="${S.type.has(t)}">${l}</button>`).join("");
  const iw=S.inkwell;
  const inkable=`<button type="button" class="nbchip${iw!=="any"?" on":""}" data-iw="1" aria-pressed="${iw!=="any"}"
      title="Tap to cycle: any → inkable only → not inkable">${iw==="yes"?"◆ Inkable":iw==="no"?"◇ Not inkable":"◆ Inkable?"}</button>`;
  const fmt=["core","infinity"].map(k=>`<button type="button" class="nbchip nbf${d.fmt===k?" on":""}" data-qfmt="${k}"
      aria-pressed="${d.fmt===k}" title="${esc(FMT_BLURB[k]||"")}">${FMT[k].l}</button>`).join("")
    +(d.fmt!=="core"&&d.fmt!=="infinity"?`<span class="nbchip on nbstatic" title="${esc(FMT_BLURB[d.fmt]||"")}">${esc(FMT[d.fmt].l)}</span>`:"");
  const clear=nbAnyFilter()?`<button type="button" class="nbchip nbclear" data-clear="1">Clear all</button>`:"";
  if(where==="sheet")return `<h4>Cost</h4><div class="nbgrp">${costs}</div>
    <h4>Card type</h4><div class="nbgrp">${types}</div>
    <h4>Inkwell &amp; format</h4><div class="nbgrp">${inkable}<span class="nbgap"></span>${fmt}</div>`;
  return `<div class="nbgrp nbinks" role="group" aria-label="Ink">${inks}</div>
    <div class="nbgrp nbcosts" role="group" aria-label="Cost">${costs}</div>
    <div class="nbgrp nbtypes" role="group" aria-label="Card type">${types}</div>
    <div class="nbgrp nbmisc">${inkable}<span class="nbfmtq" role="group" aria-label="Format">${fmt}</span>${clear}</div>`;
}
function nbAnyFilter(){
  return !!(S.q||S.ab.size||S.ink.size||S.dual||S.type.size||S.rar.size||S.kw.size||S.cls.size||S.sto.size||
    S.tag.size||S.art.size||S.terms.length||S.set||S.inkwell!=="any"||S.fl||
    [S.cost,S.st,S.wi,S.lo].some(r=>r[0]!=null||r[1]!=null));
}
function nbPaintQuick(){
  $("nbQuick").innerHTML=nbQuickHTML("bar");
  $("nbMoreQuick").innerHTML=nbQuickHTML("sheet");
}
function nbQuickClick(e){
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.ink){const i=b.dataset.ink;S.ink.has(i)?S.ink.delete(i):S.ink.add(i)}
  else if(b.dataset.cost){
    const n=+b.dataset.cost,[lo,hi]=S.cost;
    const exact=lo===n&&(n===9?hi==null:hi===n);
    if(e.shiftKey&&(lo!=null||hi!=null)){
      /* shift-click stretches the selection into a range: 2, then shift-4 = 2–4 */
      const a=Math.min(lo==null?n:lo,n),b2=n===9||hi==null&&lo!=null&&lo>=9?null:Math.max(hi==null?n:hi,n);
      S.cost=[a,b2];
    }else S.cost=exact?[null,null]:[n,n===9?null:n];
  }
  else if(b.dataset.type){const t=b.dataset.type;S.type.has(t)?S.type.delete(t):S.type.add(t)}
  else if(b.dataset.iw){S.inkwell={any:"yes",yes:"no",no:"any"}[S.inkwell]||"any"}
  else if(b.dataset.qfmt){setFmt(b.dataset.qfmt);return}
  else if(b.dataset.clear){clearAll();return}
  else return;
  S.limit=150;render();
}
$("nbQuick").addEventListener("click",nbQuickClick);
$("nbMoreQuick").addEventListener("click",nbQuickClick);

/* the six special searches people reach for first */
const NB_TOP6=["staple","draw","banish","bounce","ramp","finisher"];
function nbTop6(){
  return NB_TOP6.map(id=>AB.find(a=>a.id===id)).filter(Boolean);
}
function nbPaintTop6(){
  $("nbTop6").innerHTML=nbTop6().map(a=>`<button type="button" class="nbchip${S.ab.has(a.id)?" on":""}"
    data-ab="${a.id}" aria-pressed="${S.ab.has(a.id)}">${esc(a.l)}</button>`).join("");
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-ab]");if(!b||!b.closest("#nbTop6,#nbRecent"))return;
  const id=b.dataset.ab;S.ab.has(id)?S.ab.delete(id):S.ab.add(id);S.limit=150;render();
});

/* ===================== 4 · recent searches ===================== */
const NB_RK="fs3_nb_recent";
function nbRemember(q){
  q=(q||"").trim();if(q.length<2)return;
  const r=nbLS.get(NB_RK,[]).filter(x=>x.toLowerCase()!==q.toLowerCase());
  r.unshift(q);nbLS.set(NB_RK,r.slice(0,8));
}
function nbPaintRecent(){
  /* Opens when you click into an empty search box; typing (or clearing what
     you typed) puts it away, so it never sits over the ink and cost chips. */
  const box=$("nbRecent"),q=$("q");
  const show=document.activeElement===q&&!q.value;
  if(!show){box.hidden=true;return}
  const r=nbLS.get(NB_RK,[]);
  box.innerHTML=(r.length?`<div class="nbrl">Recent</div><div class="nbgrp">${r.map(x=>
      `<button type="button" class="nbchip" data-recent="${esc(x)}">${esc(x)}</button>`).join("")}</div>`:"")
    +`<div class="nbrl">Popular special searches</div><div class="nbgrp">${nbTop6().map(a=>
      `<button type="button" class="nbchip${S.ab.has(a.id)?" on":""}" data-ab="${a.id}">${esc(a.l)}</button>`).join("")}</div>`;
  box.hidden=false;
}
$("q").addEventListener("focus",nbPaintRecent);
$("q").addEventListener("input",()=>{$("nbRecent").hidden=true;clearTimeout(nbPaintRecent._t);
  nbPaintRecent._t=setTimeout(()=>{const v=$("q").value;if(v.trim().length>=3&&filt().length)nbRemember(v)},1500)});
$("q").addEventListener("blur",()=>setTimeout(()=>{if(!$("nbRecent").contains(document.activeElement))$("nbRecent").hidden=true},180));
$("nbRecent").addEventListener("mousedown",e=>e.preventDefault());   // keep focus in the box
$("nbRecent").addEventListener("click",e=>{
  const b=e.target.closest("[data-recent]");if(!b)return;
  const q=$("q");q.value=b.dataset.recent;q.dispatchEvent(new Event("input",{bubbles:true}));
  $("nbRecent").hidden=true;
});

/* ===================== 5 · the card tiles ===================== */
const _tile=tile;
tile=function(c){
  let h=_tile(c);
  try{
    if(TAB==="tSearch"&&!nbPhoneList())return h.replace(/^<div class="c/,`<div style="--ic:${HEX[c.co[0]]||"#888"}" class="c`);
    const q=deck().cards[c.f]||0,max=maxCopies(c),name=esc(c.f);
    h=h.replace(/^<div class="c/,`<div style="--ic:${HEX[c.co[0]]||"#888"}" class="c${q?" nbin":""}${q&&q>=max?" nbfull":""}`);
    h=h.replace('title="Remove one">',`title="Remove one" aria-label="Remove one ${name}">`)
       .replace('title="Add one">',`title="Add one" aria-label="Add one ${name}">`)
       .replace('title="Type a number and press Enter">',`title="Type a number and press Enter"><span class="nbof" aria-hidden="true">/ ${max}</span><button type="button" class="nbcnt" data-cnt="${name}" aria-label="${q} of ${max} in the deck — choose how many ${name}">${q}<small>/${max}</small></button>`);
    const info=`<div class="nbinfo"><b>${esc(c.n)}</b>${c.v?`<small>${esc(c.v)}</small>`:""}
      <span class="nbmeta"><i class="nbc" aria-label="Cost ${c.c}">${c.c}</i>${(c.co||[]).map(i=>nbDot(i)+`<span class="nbin2">${i}</span>`).join(" ")}
      <span class="nbty">· ${esc(c.sub.includes("Song")?"Song":c.ty||"")}</span>${c.ik?"":`<span class="nbty"> · not inkable</span>`}</span></div>`;
    h=h.replace(/<\/div>\s*$/,info+"</div>");
    if(nbPhoneList())h=h.replace(/\/digital\/normal\//g,"/digital/small/");
  }catch(e){}
  return h;
};

/* one set of delegated listeners on the grid — they survive every re-render */
const GRID=$("grid");
let nbHov=null,nbPress=null,nbSwallow=false,nbCmp=null;
GRID.addEventListener("mouseover",e=>{const t=e.target.closest(".c");nbHov=t?t.dataset.f:null});
GRID.addEventListener("mouseleave",()=>{nbHov=null});
GRID.addEventListener("contextmenu",e=>{
  if(TAB==="tSearch")return;
  const t=e.target.closest(".c");if(!t||e.target.closest("input"))return;
  e.preventDefault();
  if(deck().cards[t.dataset.f]){delCard(t.dataset.f);bumpDeck()}
});
GRID.addEventListener("click",e=>{
  if(nbSwallow){nbSwallow=false;e.preventDefault();e.stopPropagation();return}
  const t=e.target.closest(".c");if(!t)return;
  const f=t.dataset.f;
  if(nbCmp){e.preventDefault();e.stopPropagation();
    if(f!==nbCmp){const a=nbCmp;nbCmp=null;CMPBAR.hidden=true;nbCompare(a,f)}return}
  const cnt=e.target.closest("[data-cnt]");
  if(cnt){e.preventDefault();e.stopPropagation();nbCountSheet(f);return}
  if(nbPhoneList()){
    /* list rows: tap the art for the full card, tap the row to add one */
    if(e.target.closest("img,.ph,.timg")){e.preventDefault();e.stopPropagation();openM(f);return}
    if(TAB!=="tSearch"&&e.target.closest(".nbinfo")){if(addCard(f)){pop(t);flyToDeck(t,1)}return}
    if(TAB==="tSearch"&&e.target.closest(".nbinfo")){openM(f);return}
  }
},true);
/* long-press: choose a count, or compare */
GRID.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"||e.target.closest("button,input"))return;
  const t=e.target.closest(".c");if(!t)return;
  const x=e.clientX,y=e.clientY;
  nbPress={f:t.dataset.f,x,y,timer:setTimeout(()=>{nbPress=null;nbSwallow=true;
    try{navigator.vibrate&&navigator.vibrate(12)}catch(err){}
    nbCountSheet(t.dataset.f)},480)};
});
/* Listened for on the window, not the grid: after a long-press the finger
   usually lifts over the sheet that just opened, and a grid-only listener
   would never hear it — leaving the NEXT real tap on a card swallowed. */
["pointerup","pointercancel"].forEach(ev=>window.addEventListener(ev,()=>{if(nbPress){clearTimeout(nbPress.timer);nbPress=null}
  if(nbSwallow)setTimeout(()=>{nbSwallow=false},450)},true));
GRID.addEventListener("pointermove",e=>{if(nbPress&&Math.hypot(e.clientX-nbPress.x,e.clientY-nbPress.y)>10){clearTimeout(nbPress.timer);nbPress=null}});

/* the count picker (long-press, or tapping "2/4") */
let nbActF=null;
function nbCountSheet(f){
  const c=nbCard(f);if(!c)return;nbActF=f;
  const max=maxCopies(c),cur=deck().cards[f]||0,top=Math.max(4,Math.min(max,4));
  $("nbActT").textContent=c.f;
  const deckable=TAB!=="tSearch";
  $("nbCounts").innerHTML=deckable?Array.from({length:top+1},(_,n)=>`<button type="button" class="nbcn${n===cur?" on":""}"
    data-n="${n}" ${n>max?"disabled":""} aria-label="${n} ${n===1?"copy":"copies"}">${n}</button>`).join(""):"";
  NBQ(".nbactsub",ACT).hidden=!deckable;
  nbOpen("nbAct");
  setTimeout(()=>{const b=NBQ(".nbcn.on",ACT)||NBQ("button",ACT);if(b)b.focus()},30);
}
$("nbCounts").addEventListener("click",e=>{
  const b=e.target.closest("[data-n]");if(!b||!nbActF)return;
  setCardCount(nbActF,+b.dataset.n);nbCloseAll();
});
ACT.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");if(!b||!nbActF)return;
  const f=nbActF;nbCloseAll();
  if(b.dataset.act==="info")openM(f);
  if(b.dataset.act==="compare"){nbCmp=f;CMPBAR.hidden=false;
    NBQ("span",CMPBAR).textContent=`Comparing ${nbCard(f).n} — pick a second card`;}
});
$("nbCmpX").onclick=()=>{nbCmp=null;CMPBAR.hidden=true};

/* compare two cards, stacked */
function nbCompare(a,b){
  const A=nbCard(a),B=nbCard(b);if(!A||!B)return;
  const col=c=>`<div class="nbcmpc">
    ${cImg(c)?`<img src="${cImgL(c)}" alt="${esc(c.f)}">`:""}
    <h3>${esc(c.n)}${c.v?` <small>${esc(c.v)}</small>`:""}</h3>
    <div class="nbcmpm">${c.c} ink · ${(c.co||[]).map(i=>nbDot(i)+esc(i)).join(" ")} · ${esc(c.ty||"")}${c.ik?" · inkable":" · not inkable"}</div>
    ${c.ty==="Character"?`<div class="nbcmpm">Strength ${c.st??"–"} · Willpower ${c.wi??"–"} · Lore ${c.lo??"–"}</div>`:""}
    <p>${esc(c.tx||"No rules text.")}</p>
    ${rawPrice(c)!=null?`<div class="nbcmpm">About ${money(rawPrice(c))}</div>`:""}
    <button type="button" class="nbbtn" data-cmpopen="${esc(c.f)}">Full card</button>
  </div>`;
  const m=$("modal");m.className="modal nbcmpm0";
  m.innerHTML=`<button class="mx" id="mx" aria-label="Close">✕</button><h2 class="nbcmph">Compare</h2>
    <div class="nbcmp">${col(A)}${col(B)}</div>`;
  $("mbg").classList.add("on");
  $("mx").onclick=()=>$("mbg").classList.remove("on");
  m.querySelectorAll("[data-cmpopen]").forEach(x=>x.onclick=()=>openM(x.dataset.cmpopen));
}

/* grid extras: a typo still finds the card, and "show more" loads itself */
const _rg=renderGrid;
let nbIO=null;
renderGrid=function(){
  _rg.apply(this,arguments);
  try{
    if(GRID.querySelector(".empty")&&S.q&&S.q.trim()&&typeof didYouMean==="function"){
      const g=didYouMean(S.q).slice(0,12);
      if(g.length){
        GRID.innerHTML=`<div class="nbfuzzy">No exact match for “${esc(S.q.trim())}” — showing the closest names.</div>`+g.map(tile).join("");
        $("ct").innerHTML=`<b>0</b> exact · ${g.length} close match${g.length===1?"":"es"}`;
        bindGrid();
      }
    }
    if(nbIO)nbIO.disconnect();
    const mo=$("mo");
    if(mo&&"IntersectionObserver" in window){
      nbIO=new IntersectionObserver(ents=>{if(ents.some(x=>x.isIntersecting)){nbIO.disconnect();S.limit+=150;renderGrid()}},{rootMargin:"600px"});
      nbIO.observe(mo);
    }
  }catch(e){}
};

/* flying card: aim at the deck panel, or the peek bar on a phone */
flyToDeck=function(el,n){
  bumpDeck();
  try{navigator.vibrate&&nbTouch()&&navigator.vibrate(8)}catch(e){}
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const img=el&&el.querySelector("img");
  const target=nbCompact()?$("nbPeek"):$("nbList");
  if(!img||!target)return;
  const a=img.getBoundingClientRect(),b=target.getBoundingClientRect();
  if(!b.width)return;
  const g=document.createElement("img");
  g.src=img.src;g.className="fly";g.alt="";
  Object.assign(g.style,{left:a.left+"px",top:a.top+"px",width:a.width+"px",height:a.height+"px"});
  document.body.appendChild(g);
  const dx=(b.left+b.width/2)-(a.left+a.width/2),dy=(b.top+20)-(a.top+a.height/2);
  requestAnimationFrame(()=>{g.style.transform=`translate(${dx}px,${dy}px) scale(.18)`;g.style.opacity="0.2"});
  setTimeout(()=>g.remove(),460);
};

/* ===================== 6 · the deck panel ===================== */
const NB_DV_K="fs3_nb_dview";
let NBDV=nbLS.get(NB_DV_K,"list");
let NBTAB="list";
/* Tabs are a registry so Stats, Hand and Notes (Phase 3) can be added with
   NBX.addDeckTab(...) instead of editing this panel. */
const NB_DECKTABS=[
  {id:"list",label:"List"},
  {id:"tools",label:"Stats & tools",title:"Stats, curve, analysis, sample hand, import, copy — everything from the classic deck panel"}];
function nbPaintTabs(){
  $("nbTabs").innerHTML=NB_DECKTABS.map(t=>`<button type="button" role="tab" id="nbTab-${t.id}"
    aria-selected="${NBTAB===t.id}" aria-controls="nbPane-${t.id}" ${t.title?`title="${esc(t.title)}"`:""}>${esc(t.label)}</button>`).join("");
  NB_DECKTABS.forEach(t=>{const p=$("nbPane-"+t.id);if(p)p.hidden=NBTAB!==t.id});
}
$("nbTabs").addEventListener("click",e=>{const b=e.target.closest("[role=tab]");if(!b)return;
  nbShowTab(b.id.slice(6))});
function nbShowTab(id){
  NBTAB=id;nbPaintTabs();
  const t=NB_DECKTABS.find(x=>x.id===id);if(t&&t.render)t.render($("nbPane-"+id));
}

function nbGroupRows(L,by){
  const cardGroup=c=>c.sub.includes("Song")?"Song":["Character","Action","Item","Location"].includes(c.ty)?c.ty:"Other";
  const byCost=(a,b)=>a.c.c-b.c.c||a.f.localeCompare(b.f);
  if(by==="cost"){const ks=[...new Set(L.map(x=>x.c.c))].sort((a,b)=>a-b);
    return ks.map(k=>[k+" ink",L.filter(x=>x.c.c===k).sort((a,b)=>a.f.localeCompare(b.f))])}
  if(by==="ink"){const key=x=>x.c.co.length?x.c.co.join(" / "):"No ink";
    const ks=[...new Set(L.map(key))].sort();return ks.map(k=>[k,L.filter(x=>key(x)===k).sort(byCost)])}
  if(by==="name")return [["",L.slice().sort((a,b)=>a.f.localeCompare(b.f))]];
  const P={Character:"Characters",Action:"Actions",Song:"Songs",Item:"Items",Location:"Locations",Other:"Other"};
  return Object.keys(P).map(t=>[P[t],L.filter(x=>cardGroup(x.c)===t).sort(byCost)]).filter(([,r])=>r.length);
}
function nbPaintDeck(){
  const d=deck(),F=FMT[d.fmt]||FMT.infinity,L=dlist(),tot=dtotal(),min=F.min||0;
  /* header */
  $("nbDName").textContent=DECKS.cur===DRAFT?"New deck (not saved yet)":DECKS.cur;
  $("nbDSel").innerHTML=Object.keys(DECKS.list).map(n=>`<option value="${esc(n)}"${n===DECKS.cur?" selected":""}>${esc(n===DRAFT?"New deck (draft)":n)}</option>`).join("");
  $("nbFmt").innerHTML=FMT_ORDER.map(k=>`<button type="button" class="nbchip nbf${k===d.fmt?" on":""}" data-fmt="${k}"
    aria-pressed="${k===d.fmt}" title="${esc(FMT_BLURB[k]||"")}">${esc(FMT[k].l)}</button>`).join("");
  nbPaintSaveState();
  /* progress: in the deck's own ink colours, green at a legal 60 */
  const ic={};let ink=0,cost=0;
  L.forEach(({c,q})=>{const n=c.co.length||1;c.co.forEach(i=>ic[i]=(ic[i]||0)+q/n);if(c.ik)ink+=q;cost+=c.c*q});
  const warns=deckWarnings().filter(w=>!/more cards? to reach/.test(w));
  const legal=min?tot>=min&&!warns.length:!warns.length;
  const fill=min?Math.min(100,tot/min*100):100;
  const inkEntries=Object.entries(ic).sort((a,b)=>b[1]-a[1]);
  const inkSum=inkEntries.reduce((a,[,n])=>a+n,0)||1;
  $("nbProg").innerHTML=`<div class="nbpbar${legal&&tot?" done":""}" role="progressbar" aria-valuemin="0" aria-valuemax="${min||tot}"
      aria-valuenow="${tot}" aria-label="${tot} of ${min} cards">
      <div class="nbpfill" style="width:${fill}%">${inkEntries.map(([i,n])=>`<i style="width:${n/inkSum*100}%;background:${HEX[i]||"#888"}"></i>`).join("")}</div></div>
    <div class="nbpline"><b>${tot}${min?` / ${min}`:""}</b> cards
      ${legal&&tot?`<span class="nbok">✓ Legal ${esc(F.l)} deck</span>`:min&&tot<min?`<span>· ${min-tot} to go</span>`:""}
      ${tot?`<span class="nbps">· ${ink} inkable (${Math.round(ink/tot*100)}%) · avg cost ${(cost/tot).toFixed(1)}</span>`:""}
      <span class="nbpinks">${inkEntries.map(([i])=>nbDot(i)+`<span>${i}</span>`).join(" ")}</span></div>`;
  $("nbWarn").innerHTML=warns.length?`<ul>${warns.slice(0,3).map(w=>`<li>⚠ ${esc(w)}</li>`).join("")}</ul>${warns.length>3
    ?`<details><summary>${warns.length-3} more</summary><ul>${warns.slice(3).map(w=>`<li>⚠ ${esc(w)}</li>`).join("")}</ul></details>`:""}`:"";
  /* list */
  $("nbGroup").value=["type","cost","ink","name"].includes(DSORT)?DSORT:"type";
  NBQA("[data-dv]",DECKP).forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.dv===NBDV)));
  const groups=nbGroupRows(L,$("nbGroup").value);
  const row=({c,q,f})=>{
    const max=maxCopies(c),bad=illegalReason(c),p=rawPrice(c);
    if(NBDV==="img")return `<div class="nbimg${bad?" bad":""}" data-row="${esc(f)}">
      ${cImg(c)?`<img src="${cImg(c)}" alt="${esc(f)}" data-open="${esc(f)}" loading="lazy">`:`<button type="button" class="nbph" data-open="${esc(f)}">${esc(c.n)}</button>`}
      <span class="nbq">${q}×</span>
      <span class="nbimgb"><button type="button" data-m="${esc(f)}" aria-label="Remove one ${esc(f)}">−</button>
      <button type="button" data-p="${esc(f)}" aria-label="Add one ${esc(f)}"${q>=max?" disabled":""}>+</button></span></div>`;
    return `<div class="nbrow${bad?" bad":""}" data-row="${esc(f)}"${bad?` title="${esc(bad)}"`:""}>
      <span class="nbq">${q}</span>
      <span class="nbcost" aria-label="Cost ${c.c}">${c.c}</span>
      <span class="nbinks">${(c.co||[]).map(i=>`<i class="nbdot" style="--ic:${HEX[i]}" title="${i}"></i><span class="nbsr">${i}</span>`).join("")}</span>
      <button type="button" class="nbnm" data-open="${esc(f)}"><b>${esc(c.n)}</b>${c.v?` <small>${esc(c.v)}</small>`:""}</button>
      <span class="nbpr"${p!=null?` title="${q} × ${money(Math.round(p*100)/100)}"`:""}>${p!=null?money(Math.round(p*q*100)/100):""}</span>
      <button type="button" class="nbm" data-m="${esc(f)}" aria-label="Remove one ${esc(f)}">−</button>
      <button type="button" class="nbp" data-p="${esc(f)}" aria-label="Add one ${esc(f)}"${q>=max?" disabled":""}>+</button>
    </div>`;
  };
  $("nbList").innerHTML=L.length?groups.map(([t,rows])=>{
      const n=rows.reduce((a,x)=>a+x.q,0);
      return (t?`<div class="nbgh">${esc(t)}<span>${n}</span></div>`:"")
        +`<div class="${NBDV==="img"?"nbimgs":"nbrows"}">${rows.map(row).join("")}</div>`}).join("")
    :`<div class="nbempty"><b>Your deck is empty.</b><br>${nbTouch()?"Tap":"Click"} any card to add it${nbTouch()?"":", right-click to take one out"}.
       ${nbCompact()?"":`<br><span>Shift-click adds four. Press <kbd>?</kbd> for every shortcut.</span>`}</div>`;
  /* footer: the TCGplayer link stays, as one clear button */
  let buy="";
  if(tot&&priceDate()){
    const rows=COLLON?borrowRows().map(x=>({c:x.c,q:x.need})):L.map(({c,q})=>({c,q}));
    const $sum=rows.reduce((a,{c,q})=>a+(rawPrice(c)||0)*q,0);
    if(rows.length)buy=`<button type="button" class="nbbuy" id="nbBuy">🛒 ${COLLON?"Buy missing cards":"Buy this deck"}${$sum?` · ${money(Math.round($sum))}`:""}</button>
      <span class="nbaff">TCGplayer affiliate link</span>`;
  }
  $("nbDFoot").innerHTML=buy;
  const bb=$("nbBuy");if(bb)bb.onclick=()=>{
    const rows=COLLON?borrowRows().map(x=>({c:x.c,q:x.need})):dlist();
    tcgOpen(rows,COLLON?"you already own this whole deck":"this deck is empty")};
  nbPaintPeek(L,tot,min,ic);
  nbPaintTabs();
  nbPaintStart();
}
function nbPaintSaveState(){
  const st=$("nbSaveState"),sv=$("nbSave");if(!st)return;
  const draft=DECKS.cur===DRAFT,empty=!dtotal();
  st.className="nbsave"+(DECKDIRTY?" dirty":"");
  st.textContent=draft?(empty?"":"Not saved"):(DECKDIRTY?"Unsaved changes":"✓ Saved");
  sv.textContent=draft?"Save deck":"Save";
  sv.disabled=empty||(!draft&&!DECKDIRTY);
}
/* deck panel wiring (bound once; the panel's contents are repainted) */
$("nbDName").onclick=()=>{DECKS.cur===DRAFT?saveDeckPrompt():renameDeck(DECKS.cur)};
$("nbSave").onclick=e=>saveDeckPrompt(e);
$("nbDSel").onchange=e=>{DECKS.cur=e.target.value;saveDecks();S.limit=150;render()};
$("nbFmt").addEventListener("click",e=>{const b=e.target.closest("[data-fmt]");if(b)setFmt(b.dataset.fmt)});
$("nbGroup").onchange=e=>{DSORT=e.target.value;save("fs3_dsort",DSORT);nbPaintDeck()};
DECKP.addEventListener("click",e=>{
  const dv=e.target.closest("[data-dv]");if(dv){NBDV=dv.dataset.dv;nbLS.set(NB_DV_K,NBDV);nbPaintDeck();return}
  const p=e.target.closest("#nbList [data-p]");if(p){addCard(p.dataset.p);return}
  const m=e.target.closest("#nbList [data-m]");if(m){delCard(m.dataset.m);return}
  const o=e.target.closest("#nbList [data-open]");if(o){openM(o.dataset.open);return}
});
$("nbList").addEventListener("contextmenu",e=>{const r=e.target.closest("[data-row]");if(!r)return;
  e.preventDefault();delCard(r.dataset.row)});
/* hover a row: the card appears beside the panel */
$("nbList").addEventListener("mouseover",e=>{
  if(nbTouch())return;
  const r=e.target.closest("[data-row]");if(!r){PREV.hidden=true;return}
  const c=nbCard(r.dataset.row);if(!c||!cImg(c)||NBDV==="img"){PREV.hidden=true;return}
  const im=PREV.querySelector("img");if(im.dataset.f!==c.f){im.src=cImg(c);im.dataset.f=c.f;im.alt=c.f}
  const R=r.getBoundingClientRect(),D=DECKP.getBoundingClientRect(),h=300;
  PREV.style.top=Math.max(70,Math.min(innerHeight-h-10,R.top-h/2))+"px";
  PREV.style.left=Math.max(8,D.left-230)+"px";
  PREV.hidden=false;
});
$("nbList").addEventListener("mouseleave",()=>{PREV.hidden=true});
/* drag a card from the pool onto the panel */
DECKP.addEventListener("dragover",e=>{if(document.body.classList.contains("dragging-card")){e.preventDefault();DECKP.classList.add("over")}});
DECKP.addEventListener("dragleave",()=>DECKP.classList.remove("over"));
DECKP.addEventListener("drop",e=>{DECKP.classList.remove("over");const f=e.dataTransfer.getData("text/plain");
  if(f&&nbCard(f)){e.preventDefault();addCard(f)}});

/* the deck ⋯ menu */
function nbPaintDMenu(){
  $("nbDMenu").innerHTML=`
    <button type="button" data-dm="undo"${UNDO.length?"":" disabled"}>↶ Undo${UNDO.length?" "+esc(UNDO[UNDO.length-1].label):""}</button>
    <div class="nbsep"></div>
    <button type="button" data-dm="new">➕ New deck</button>
    <button type="button" data-dm="dup">⧉ Duplicate this deck</button>
    <button type="button" data-dm="ren"${DECKS.cur===DRAFT?" disabled":""}>✏️ Rename</button>
    <div class="nbsep"></div>
    <button type="button" data-dm="paste">📥 Paste a deck list</button>
    <button type="button" data-dm="copy" id="nbCopyTxt">📋 Copy as text</button>
    <button type="button" data-dm="link">🔗 Copy a link to this deck</button>
    <button type="button" data-dm="send">📱 Send to another device</button>
    <div class="nbsep"></div>
    <button type="button" data-dm="tools">📊 Stats, sample hand &amp; more tools</button>
    <button type="button" data-dm="clear"${dtotal()?"":" disabled"}>🧹 Clear all cards</button>
    <button type="button" data-dm="del" class="bad">🗑 Delete this deck</button>`;
}
$("nbDMenuBtn").addEventListener("click",nbPaintDMenu,true);
nbMenu($("nbDMenuBtn"),$("nbDMenu"));
$("nbDMenu").addEventListener("click",async e=>{
  const b=e.target.closest("[data-dm]");if(!b)return;
  const k=b.dataset.dm,d=deck(),names=Object.keys(DECKS.list);
  if(k==="undo")undo();
  if(k==="new"){const n=await namePrompt("New deck","What do you want to call it?","Deck "+(names.length+1));
    if(n===null)return;const nm=String(n).trim();if(!nm)return;
    if(DECKS.list[nm]){toast("You already have a deck called that");return}
    DECKS.list[nm]={fmt:d.fmt,coco:null,cards:{}};DECKS.cur=nm;stampEdited(nm);saveDecks();award("named");render()}
  if(k==="dup")duplicateDeck(DECKS.cur);
  if(k==="ren")renameDeck(DECKS.cur);
  if(k==="paste")importDeckPrompt();
  if(k==="copy")navigator.clipboard.writeText(deckText()).then(()=>toast("Copied the list"),()=>toast("Copy failed"));
  if(k==="link")copyDeckLink(DECKS.cur);
  if(k==="send")nbSend();
  if(k==="tools"){if(nbCompact())DECKP.classList.add("open");nbShowTab("tools")}
  if(k==="clear"){const ok=await confirmBox("Clear this deck?","Every card comes out. You can undo this.","Clear it",true);
    if(ok){mark("clearing the deck");d.cards={};markDirty(true);render()}}
  if(k==="del"){if(names.length<2){toast("Keep at least one deck");return}
    const ok=await confirmBox("Delete this deck?",`"${DECKS.cur}" will be deleted. You can undo this straight away.`,"Delete",true);
    if(ok){mark('deleting "'+DECKS.cur+'"');delete DECKS.list[DECKS.cur];DECKS.cur=Object.keys(DECKS.list)[0];saveDecks();render()}}
});

/* send the deck to a phone or laptop: a link that carries the whole deck, and its QR */
function nbSend(){
  const h=deckHash(DECKS.cur);
  if(!h){toast("Add some cards first");return}
  const base=(location.origin&&location.origin!=="null")?location.origin+location.pathname:location.href.split("#")[0];
  const url=base+(location.search||"")+"#"+h;
  nbTrack("deck_shared",{how:"send"});
  const m=$("modal");m.className="modal nbsendm";
  m.innerHTML=`<button class="mx" id="mx" aria-label="Close">✕</button>
    <h2>Send this deck to another device</h2>
    <p>Scan the code with your phone's camera, or copy the link. The whole deck is inside the link — no sign-in needed.</p>
    <div class="nbqr" id="nbQR" aria-label="QR code for this deck"></div>
    <input class="nburl" readonly value="${esc(url)}" aria-label="Deck link" onclick="this.select()">
    <div class="nbacts"><button type="button" class="nbbtn go" id="nbSendCopy">Copy link</button>
      ${navigator.share?`<button type="button" class="nbbtn" id="nbSendShare">Share…</button>`:""}</div>`;
  $("mbg").classList.add("on");
  $("mx").onclick=()=>$("mbg").classList.remove("on");
  paintQR("nbQR",url);
  $("nbSendCopy").onclick=()=>navigator.clipboard.writeText(url).then(()=>toast("Link copied"),()=>toast("Copy failed"));
  const sh=$("nbSendShare");if(sh)sh.onclick=()=>navigator.share({title:DECKS.cur,url}).catch(()=>{});
}

/* ===================== 7 · phone: peek bar and deck sheet ===================== */
function nbPaintPeek(L,tot,min,ic){
  $("nbPeekN").textContent=min?`${tot} / ${min}`:`${tot}`;
  const inks=Object.keys(ic).sort();
  $("nbPeekI").innerHTML=tot?inks.map(i=>nbDot(i)+esc(i)).join(" / "):"Empty deck";
  const cv=[0,0,0,0,0,0,0,0];L.forEach(({c,q})=>{cv[Math.min(7,c.c)]+=q});
  const mx=Math.max(...cv,1);
  $("nbPeekC").innerHTML=cv.slice(1).map(v=>`<i style="height:${Math.max(2,Math.round(v/mx*100))}%"></i>`).join("");
  $("nbPeek").classList.toggle("done",!!min&&tot>=min);
}
$("nbPeek").onclick=()=>{nbCloseAll();DECKP.classList.add("open");SCRIM.hidden=false;nbOpenPanel="nbDeck";
  document.documentElement.classList.add("nbmodal")};
$("nbSheetGrab").onclick=()=>nbCloseAll();
/* swipe up on the peek bar opens the deck; swipe down on the sheet's top closes it */
(()=>{
  let y0=null;
  $("nbPeek").addEventListener("touchstart",e=>{y0=e.touches[0].clientY},{passive:true});
  $("nbPeek").addEventListener("touchend",e=>{if(y0!=null&&y0-e.changedTouches[0].clientY>30)$("nbPeek").click();y0=null});
  let y1=null;
  const top=DECKP.querySelector(".nbdh");
  top.addEventListener("touchstart",e=>{y1=e.touches[0].clientY},{passive:true});
  top.addEventListener("touchend",e=>{if(y1!=null&&e.changedTouches[0].clientY-y1>60&&DECKP.classList.contains("open"))nbCloseAll();y1=null});
})();
/* keep the page's bottom padding equal to whatever the phone dock measures,
   and the sticky bars tucked right under the header */
if("ResizeObserver" in window){
  new ResizeObserver(()=>{document.documentElement.style.setProperty("--nbhead",HEADER.offsetHeight+"px")}).observe(HEADER);
  new ResizeObserver(()=>{document.documentElement.style.setProperty("--nbdock",(nbCompact()?BAR.offsetHeight:0)+"px")}).observe(BAR);
}

/* ===================== 8 · every change can be undone ===================== */
const _mark=mark;
let nbUT=null;
mark=function(label){
  _mark.apply(this,arguments);
  setTimeout(()=>{
    try{
      const L=String(label||"");
      const txt=/^adding /.test(L)?"Added "+L.slice(7):/^removing /.test(L)?"Removed "+L.slice(9)
        :L.charAt(0).toUpperCase()+L.slice(1);
      $("nbUTxt").textContent=txt;UTOAST.hidden=false;
      clearTimeout(nbUT);nbUT=setTimeout(()=>{UTOAST.hidden=true},5000);
    }catch(e){}
  },0);
};
$("nbUBtn").onclick=()=>{undo();UTOAST.hidden=true};

/* ===================== 9 · the working copy (Save still means Save) =====================
   Every edit is copied to fs3_nb_work — NOT into the saved deck. Reopen the
   builder after closing a tab and it offers the unsaved changes back.
   Pressing Save clears the copy. */
const NB_WK="fs3_nb_work";
let nbWT=null;
function nbQueueWork(){clearTimeout(nbWT);nbWT=setTimeout(nbWriteWork,300)}
function nbWriteWork(){
  if(!DECKDIRTY){nbLS.del(NB_WK);return}
  const d=deck();
  nbLS.set(NB_WK,{name:DECKS.cur,fmt:d.fmt,coco:d.coco,cards:d.cards,at:Date.now()});
}
const _md=markDirty;
markDirty=function(v){
  _md.apply(this,arguments);
  try{
    nbPaintSaveState();
    if(!v){nbLS.del(NB_WK);nbFlushAwards()}
  }catch(e){}
};
const NB_WORK_AT_BOOT=(()=>{
  const w=nbLS.get(NB_WK,null);
  if(!w||!w.cards||!Object.keys(w.cards).length)return null;
  const saved=DECKS.list[w.name];
  if(saved&&JSON.stringify(saved.cards||{})===JSON.stringify(w.cards))return null;
  return w;
})();
function nbRestoreWork(){
  const w=NB_WORK_AT_BOOT;if(!w)return;
  mark("restoring your unsaved changes");
  const name=DECKS.list[w.name]?w.name:DRAFT;
  if(!DECKS.list[name])DECKS.list[name]={fmt:w.fmt,coco:null,cards:{}};
  DECKS.cur=name;
  const d=DECKS.list[name];d.cards=Object.assign({},w.cards);d.fmt=w.fmt||d.fmt;d.coco=w.coco!=null?w.coco:d.coco;
  nbWorkDone=true;markDirty(true);render();
  toast("Your unsaved changes are back");
}
let nbWorkDone=false;

/* ===================== 10 · never start from blank ===================== */
let nbStartOff=false;
/* Later phases add options here ("Finish my deck") with NBX.addStartOption. */
const NB_START=[
  {id:"meta",icon:"🏆",label:"Start from a top deck",sub:"Tournament lists for every ink pair",run:()=>{OPAGE="meta";save("fs3_opage",OPAGE);showTab("tOther")}},
  {id:"guided",icon:"🥥",label:"Guided Coconut Build",sub:"Pick a Coconut, we'll walk you through",run:()=>{const g=$("mGuided");if(g)g.click()}},
  {id:"paste",icon:"📥",label:"Paste a deck list",sub:"From Dreamborn, a video, a friend",run:()=>importDeckPrompt()},
  {id:"empty",icon:"🔍",label:"Empty deck",sub:"Just start searching",run:()=>{nbStartOff=true;nbPaintStart();$("q").focus()}}];
function nbPaintStart(){
  const show=TAB==="tDeck"&&!nbStartOff&&DECKS.cur===DRAFT&&!dtotal();
  const w=!nbWorkDone&&NB_WORK_AT_BOOT;
  if(!show&&!w){START.hidden=true;START.innerHTML="";return}
  const ago=w?Math.max(1,Math.round((Date.now()-w.at)/60000)):0;
  const agoTxt=!w?"":ago<60?ago+" min ago":ago<1440?Math.round(ago/60)+" hr ago":Math.round(ago/1440)+" days ago";
  const wn=w?Object.values(w.cards).reduce((a,b)=>a+b,0):0;
  START.innerHTML=(w?`<div class="nbcont"><div><b>Continue where you left off?</b>
      <span>${esc(w.name===DRAFT?"Your new deck":w.name)} · ${nbCountTxt(wn)} · ${agoTxt} · not saved</span></div>
      <button type="button" class="nbbtn go" id="nbContY">Continue</button>
      <button type="button" class="nbbtn" id="nbContN">Discard</button></div>`:"")
    +(show?`<div class="nbstartg"><b class="nbsth">Start a deck</b>${NB_START.map(o=>`<button type="button" class="nbopt" data-start="${o.id}">
      <span class="nbopti" aria-hidden="true">${o.icon}</span><span><b>${esc(o.label)}</b><small>${esc(o.sub)}</small></span></button>`).join("")}</div>`:"");
  START.hidden=false;
  const y=$("nbContY"),n=$("nbContN");
  if(y)y.onclick=nbRestoreWork;
  if(n)n.onclick=()=>{nbWorkDone=true;nbLS.del(NB_WK);nbPaintStart()};
  START.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>{const o=NB_START.find(x=>x.id===b.dataset.start);if(o)o.run()});
}

/* ===================== 11 · keyboard ===================== */
window.addEventListener("keydown",e=>{
  const tg=(e.target.tagName||"").toLowerCase();
  const typing=tg==="input"||tg==="textarea"||tg==="select"||e.target.isContentEditable;
  const inBuilder=vS.classList.contains("on")&&TAB==="tDeck";
  if(e.key==="Escape"&&(nbOpenPanel||nbCmp)){nbCmp=null;CMPBAR.hidden=true;nbCloseAll();return}
  /* Enter in the search box adds the top result (laptop). Shift+Enter keeps the
     old behaviour: turn what you typed into a filter pill. */
  if(e.target.id==="q"&&e.key==="Enter"){
    nbRemember($("q").value);
    if(!e.shiftKey&&!nbTouch()&&inBuilder&&ACI<0&&$("q").value.trim()){
      clearTimeout(qT);S.q=$("q").value;
      const top=sortC(filt())[0];
      if(top){e.preventDefault();e.stopImmediatePropagation();
        if(addCard(top.f)){const t=GRID.querySelector(`.c[data-f="${CSS.escape(top.f)}"]`);if(t){pop(t);flyToDeck(t,1)}}
        acClose();render();}
    }
    return;
  }
  if(e.target.id==="q"&&e.key==="ArrowDown"&&!ACLIST.length&&inBuilder){e.preventDefault();$("q").blur();kbFocus(0);return}
  if(typing)return;
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==="s"){e.preventDefault();saveDeckPrompt();return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==="?"){e.preventDefault();nbShortcuts();return}
  if(!inBuilder)return;
  const kbf=(typeof KBI==="number"&&KBI>=0)?(kbTiles()[KBI]||{}).dataset:null;
  const target=nbHov||(kbf&&kbf.f)||null;
  if(/^[0-4]$/.test(e.key)&&target){
    e.preventDefault();e.stopImmediatePropagation();
    setCardCount(target,+e.key);
    const t=GRID.querySelector(`.c[data-f="${CSS.escape(target)}"]`);if(t)pop(t);
    return;
  }
  if(e.key==="Backspace"&&nbHov&&!(kbf&&kbf.f)){e.preventDefault();e.stopImmediatePropagation();delCard(nbHov);bumpDeck();return}
  if(e.key==="h"||e.key==="H"){e.preventDefault();if(!dtotal()){toast("Add some cards first");return}
    if(nbCompact())DECKP.classList.add("open");nbShowTab("tools");
    setTimeout(()=>{try{const dana=$("dana");if(dana)dana.open=true;hand();
      const hb=$("hb");if(hb)hb.scrollIntoView({block:"nearest"})}catch(err){}},30);return}
},true);
function nbShortcuts(){
  const K=[["/","Jump to the search box"],["Enter","In the search box: add the top result"],
    ["Shift + Enter","In the search box: turn what you typed into a filter pill"],
    ["↓","From the search box: move into the cards"],["← → ↑ ↓","Move between cards"],
    ["Enter","Add the highlighted card"],["1 – 4","Set how many of the card under the mouse"],
    ["0","Take it out of the deck"],["⌫","Remove one"],["Click / right-click","Add one / remove one"],
    ["Shift + click","Add four"],["H","Draw a sample hand"],["Ctrl/⌘ + S","Save the deck"],
    ["Ctrl/⌘ + Z","Undo (Shift for redo)"],["Esc","Close whatever is open"],["?","This list"]];
  const m=$("modal");m.className="modal nbkeysm";
  m.innerHTML=`<button class="mx" id="mx" aria-label="Close">✕</button><h2>Keyboard shortcuts</h2>
    <dl class="nbkeys">${K.map(([k,v])=>`<dt><kbd>${esc(k)}</kbd></dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
  $("mbg").classList.add("on");$("mx").onclick=()=>$("mbg").classList.remove("on");
}

/* ===================== 12 · the card, opened: card-shop mode ===================== */
const _openM=openM;
openM=function(f){
  const r=_openM.apply(this,arguments);
  try{
    const c=nbCard(f),mc=NBQ("#modal .mc");if(!c||!mc)return r;
    const inDecks=Object.entries(DECKS.list).filter(([n,d])=>d.cards&&d.cards[f])
      .map(([n,d])=>`${n===DRAFT?"your new deck":esc(n)} ×${d.cards[f]}`);
    const own=COLLON?ownedByName(c):null;
    const deckable=TAB!=="tSearch";
    const cur=deck().cards[f]||0,max=maxCopies(c);
    const box=nbEl(`<div class="nbshop">
      ${deckable?`<div class="nbshopr"><span>In this deck</span><span class="nbcounts">${Array.from({length:Math.min(max,4)+1},(_,n)=>
        `<button type="button" class="nbcn${n===cur?" on":""}" data-mn="${n}" aria-label="${n} in this deck">${n}</button>`).join("")}</span></div>`:""}
      <div class="nbshopr"><span>Your decks</span><span>${inDecks.length?inDecks.join(" · "):"Not in any of your decks"}</span></div>
      ${own!=null?`<div class="nbshopr"><span>You own</span><span>${own} cop${own===1?"y":"ies"}</span></div>`:""}
    </div>`);
    mc.prepend(box);
    box.querySelectorAll("[data-mn]").forEach(b=>b.onclick=()=>{setCardCount(f,+b.dataset.mn);
      box.querySelectorAll("[data-mn]").forEach(x=>x.classList.toggle("on",x===b))});
  }catch(e){}
  return r;
};

/* ===================== 13 · tour, dust, theme ===================== */
/* No blocking welcome modal. A small card instead, once; the full tour is in More. */
const _tour=startTour;
startTour=function(force){if(force)return _tour.apply(this,arguments);nbHint()};
function nbHint(){
  if(nbLS.get("fs3_nb_hint",false))return;
  const h=nbEl(`<div class="nbhint" role="status"><b>This is the new deck builder.</b>
    <span>${nbTouch()?"Tap a card to add it. Press and hold for more.":"Click a card to add it, right-click to take one out. Press <kbd>?</kbd> for shortcuts."}</span>
    <span class="nbacts"><button type="button" class="nbbtn" data-t="tour">Take the tour</button>
    <button type="button" class="nbbtn go" data-t="ok">Got it</button></span></div>`);
  document.body.appendChild(h);
  h.onclick=e=>{const b=e.target.closest("[data-t]");if(!b)return;nbLS.set("fs3_nb_hint",true);h.remove();
    if(b.dataset.t==="tour")startTour(true)};
}
/* Achievement toasts wait for a meaningful moment (saving), never mid-build. */
const _award=award;let nbAQ=[];
award=function(id){
  if(TAB==="tDeck"&&DECKDIRTY){if(!nbAQ.includes(id))nbAQ.push(id);return false}
  return _award.apply(this,arguments);
};
function nbFlushAwards(){const q=nbAQ;nbAQ=[];setTimeout(()=>q.forEach(id=>{try{_award(id)}catch(e){}}),1400)}
/* Theme: follows the device until you pick one. */
const NB_TK="fs3_nb_theme",NB_MQ=matchMedia("(prefers-color-scheme: dark)");
function nbDark(){const t=nbLS.get(NB_TK,null);return t?t==="dark":NB_MQ.matches}
function nbApplyTheme(){
  document.body.classList.toggle("dark",nbDark());
  THEMEB.setAttribute("aria-label",nbDark()?"Switch to the light theme":"Switch to the dark theme");
  const mt=NBQ('meta[name="theme-color"]');if(mt)mt.content=nbDark()?"#0e121b":"#202638";
}
const _prefs=applyPrefs;
applyPrefs=function(){_prefs.apply(this,arguments);nbApplyTheme()};
THEMEB.onclick=()=>{nbLS.set(NB_TK,nbDark()?"light":"dark");nbApplyTheme()};
try{NB_MQ.addEventListener("change",()=>{if(!nbLS.get(NB_TK,null))nbApplyTheme()})}catch(e){}

/* ===================== 14 · re-paint hooks ===================== */
const _rd=renderDeck;
renderDeck=function(hostId){
  const r=_rd.apply(this,arguments);
  if(!hostId||hostId==="deck"){try{nbPaintDeck()}catch(e){console.error(e)}}
  return r;
};
const _pdb=paintDeckBar;
paintDeckBar=function(){_pdb.apply(this,arguments);try{nbPaintSaveState()}catch(e){}};
const _rc=renderChips;
renderChips=function(){_rc.apply(this,arguments);try{nbDrFilter()}catch(e){}};
const _render=render;
render=function(){
  _render.apply(this,arguments);
  try{nbAfterRender()}catch(e){console.error(e)}
};
function nbAfterRender(){
  nbPaintQuick();nbPaintTop6();
  const n=filt().length,label=`Show ${nbCountTxt(n)}`;
  $("nbShowN").textContent=label;$("nbDrShow").textContent=label;
  const facets=S.rar.size+S.kw.size+S.cls.size+S.sto.size+S.art.size+S.tag.size+(S.set?1:0)+(S.dual?1:0)
    +[S.st,S.wi,S.lo].filter(r=>r[0]!=null||r[1]!=null).length;
  $("nbFiltersN").textContent=facets?String(facets):"";
  $("nbSpecN").textContent=S.ab.size?String(S.ab.size):"";
  nbPaintStart();
  if(!$("nbRecent").hidden)nbPaintRecent();
}
const _show=showTab;
showTab=function(t){
  _show.apply(this,arguments);
  try{nbOnTab(t)}catch(e){console.error(e)}
};
function nbOnTab(t){
  nbCloseAll();
  const on={tDeck:"build",tSearch:"cards",tDecks:"decks",tColl:"coll",tOther:"more"}[t];
  NAV.querySelectorAll("[data-go]").forEach(b=>{
    const cur=b.dataset.go===on&&!(on==="build"&&SUB==="guided");
    b.classList.toggle("on",cur);b.toggleAttribute("aria-current",cur)});
  if(t==="tDeck"&&SUB==="guided")$("nbMoreBtn").classList.add("on");
  document.documentElement.classList.toggle("nbbrowse",t==="tSearch");
  nbPaintStart();
}

/* ===================== 15 · offline ===================== */
if("serviceWorker" in navigator&&location.protocol==="https:"){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("/sw.js").catch(()=>{});
    /* save this page for offline use right away, not just from the next visit */
    navigator.serviceWorker.ready.then(r=>{if(r.active)r.active.postMessage({cache:location.href.split("#")[0]})}).catch(()=>{});
  });
}

/* ===================== 16 · plug-in points for later phases ===================== */
/* Phase 3–5 features hook in here rather than into the panels above:
     NBX.addDeckTab({id:"stats",label:"Stats",render:pane=>{…}})
     NBX.addStartOption({id:"finish",icon:"✨",label:"Finish my deck",sub:"…",run:()=>{…}})
     NBX.addDrawerSection(html) — extra content under the special searches
   All three are ordinary function calls from code inlined after this block. */
const NBX={
  addDeckTab(t){if(!t||!t.id||NB_DECKTABS.some(x=>x.id===t.id))return;
    NB_DECKTABS.push(t);
    if(!$("nbPane-"+t.id))$("nbDBody").appendChild(nbEl(`<div class="nbpane" id="nbPane-${t.id}" role="tabpanel" hidden></div>`));
    nbPaintTabs()},
  addStartOption(o){if(o&&o.id&&!NB_START.some(x=>x.id===o.id)){NB_START.splice(NB_START.length-1,0,o);nbPaintStart()}},
  addDrawerSection(html){const s=nbEl(`<section class="nbsec">${html}</section>`);$("nbDrBody").appendChild(s);return s},
  track:nbTrack,
  /* how long one search takes, start to sorted results — the quality bar is 50ms */
  timeSearch(q){const o=S.q;S.q=q;const t=performance.now();const n=sortC(filt()).length;
    const ms=performance.now()-t;S.q=o;return {ms,n}},
};
window.RSI_NB=NBX;

/* ===================== go ===================== */
document.body.classList.add("nbready");
applyPrefs();
render();
nbOnTab(TAB);
})();
