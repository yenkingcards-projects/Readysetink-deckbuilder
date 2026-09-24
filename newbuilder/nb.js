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
     undo, saveDeckPrompt …), the pull sheet and the saved-deck format. Only
     the layout is new, which is how every power feature survives.
   · Saved decks keep their exact format. The only new storage keys are
     fs3_nb, fs3_nb_work (the unsaved working copy), fs3_nb_recent,
     fs3_nb_dview, fs3_nb_theme and fs3_nb_hint.
   · Icons are Ben's own icon library (bendacymedia/Claude apps/icon-library),
     inlined below — no emoji on the build path.
   · Later phases plug in through NBX (bottom of this file).
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
    const b=e.target&&e.target.closest&&e.target.closest("#dc,#pullPrint,#pullCopy,#pullProxy,#bImg,#regOpen,[data-shr=text],[data-shr=image]");
    if(b)nbTrack("deck_exported",{how:b.id||b.dataset.shr||"button"});
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

/* ===================== icons ===================== */
/* from Ben's icon library: 24×24, 2px stroke, round caps, currentColor */
const NBI={"search":"<circle cx=\"10\" cy=\"10\" r=\"6\"/> <line x1=\"20\" y1=\"20\" x2=\"14.5\" y2=\"14.5\"/>","filter":"<path d=\"M4 5h16l-6 8v6l-4-2v-4Z\"/>","sparkles":"<path d=\"M11 3c.4 2.6 1.4 3.6 4 4-2.6.4-3.6 1.4-4 4-.4-2.6-1.4-3.6-4-4 2.6-.4 3.6-1.4 4-4Z\"/> <path d=\"M18 13c.2 1.3.7 1.8 2 2-1.3.2-1.8.7-2 2-.2-1.3-.7-1.8-2-2 1.3-.2 1.8-.7 2-2Z\"/>","deck":"<rect x=\"6\" y=\"9\" width=\"12\" height=\"14\" rx=\"2\"/> <path d=\"M9 9V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-2\"/> <path d=\"M12 6V4.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-1\"/>","cards":"<rect x=\"7\" y=\"3\" width=\"12\" height=\"16\" rx=\"2\" transform=\"rotate(8 13 11)\"/> <rect x=\"4\" y=\"6\" width=\"12\" height=\"16\" rx=\"2\"/>","binder":"<rect x=\"6\" y=\"4\" width=\"15\" height=\"17\" rx=\"2\"/> <line x1=\"10\" y1=\"4\" x2=\"10\" y2=\"21\"/> <circle cx=\"3.5\" cy=\"8\" r=\"1.4\"/> <circle cx=\"3.5\" cy=\"12.5\" r=\"1.4\"/> <circle cx=\"3.5\" cy=\"17\" r=\"1.4\"/>","trophy":"<path d=\"M8 4h8v5a4 4 0 0 1-8 0Z\"/> <path d=\"M8 5H5v1a4 4 0 0 0 3.2 3.9\"/> <path d=\"M16 5h3v1a4 4 0 0 1-3.2 3.9\"/> <path d=\"M12 13v3\"/> <path d=\"M9 20h6\"/> <path d=\"M10 16h4v2a2 2 0 0 1-4 0Z\"/>","printer":"<rect x=\"5\" y=\"8\" width=\"14\" height=\"8\" rx=\"1\"/> <path d=\"M7 8V4h10v4\"/> <path d=\"M7 16v4h10v-4\"/> <circle cx=\"16\" cy=\"11\" r=\"0.8\" fill=\"currentColor\" stroke=\"none\"/>","link":"<path d=\"M11 6l1.5-1.5a3.5 3.5 0 0 1 5 5L16 11\"/> <path d=\"M13 18l-1.5 1.5a3.5 3.5 0 0 1-5-5L8 13\"/> <line x1=\"9\" y1=\"15\" x2=\"15\" y2=\"9\"/>","download":"<path d=\"M12 3v10\"/> <polyline points=\"7,9 12,14 17,9\"/> <path d=\"M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2\"/>","trash":"<path d=\"M4 7h16\"/> <path d=\"M9 7V4h6v3\"/> <path d=\"M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13\"/> <line x1=\"10\" y1=\"11\" x2=\"10\" y2=\"17\"/> <line x1=\"14\" y1=\"11\" x2=\"14\" y2=\"17\"/>","plus":"<line x1=\"12\" y1=\"4\" x2=\"12\" y2=\"20\"/> <line x1=\"4\" y1=\"12\" x2=\"20\" y2=\"12\"/>","check":"<circle cx=\"12\" cy=\"12\" r=\"9\"/> <polyline points=\"8,12.5 11,15.5 16,9\"/>","close":"<line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/> <line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/>","settings":"<g> <circle cx=\"12\" cy=\"12\" r=\"3\"/> <path d=\"M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1\"/> </g>","theme":"<path d=\"M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z\"/> <g> <line x1=\"19\" y1=\"5\" x2=\"19\" y2=\"2.5\"/> <line x1=\"22.5\" y1=\"8.5\" x2=\"20.5\" y2=\"8.5\"/> <line x1=\"20.8\" y1=\"3.2\" x2=\"19.4\" y2=\"4.6\"/> </g>","user":"<circle cx=\"12\" cy=\"8\" r=\"4\"/> <path d=\"M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7\"/>","store":"<path d=\"M4 10V7l2-4h12l2 4v3\"/> <path d=\"M4 10a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0\"/> <path d=\"M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9\"/> <path d=\"M9 20v-4h6v4Z\"/>","coffee":"<path d=\"M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z\"/> <path d=\"M16 10h1.5a2.5 2.5 0 0 1 0 5H16\"/> <path d=\"M9 6c0-1 .8-1 .8-2S9 2.5 9 1.5\"/> <path d=\"M12.5 6c0-1 .8-1 .8-2s-.8-1.5-.8-2.5\"/>","map-pin":"<path d=\"M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z\"/> <circle cx=\"12\" cy=\"9\" r=\"2.5\"/>","book":"<path d=\"M12 6c-2-1.5-5-2-8-1v13c3-1 6-.5 8 1Z\"/> <path d=\"M12 6c2-1.5 5-2 8-1v13c-3-1-6-.5-8 1Z\"/>","swords":"<path d=\"M4 4l7 7M11 11l-2 6-3 1 1-3z\"/> <path d=\"M20 4l-7 7M13 11l2 6 3 1-1-3z\"/>","menu":"<line x1=\"4\" y1=\"7\" x2=\"20\" y2=\"7\"/> <line x1=\"4\" y1=\"12\" x2=\"20\" y2=\"12\"/> <line x1=\"4\" y1=\"17\" x2=\"20\" y2=\"17\"/>","star":"<path d=\"M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z\"/>","gem":"<path d=\"M7 9 12 3l5 6-5 12Z\"/> <path d=\"M7 9h10M9.5 9 12 3l2.5 6M12 9v12\"/>","inkwell":"<path d=\"M8 11h8l-1 8a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z\"/> <path d=\"M7 11h10v-2H7z\"/> <path d=\"M13 9c0-4 2-6 6-7-1 4-3 6-7 7z\"/> <path d=\"M9.5 15a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z\"/>","arrow-right":"<line x1=\"4\" y1=\"12\" x2=\"18\" y2=\"12\"/> <polyline points=\"12,6 18,12 12,18\"/>","crown":"<path d=\"M4 18 3 8l5 4 4-7 4 7 5-4-1 10Z\"/> <path d=\"M4 18h16\"/>","medal":"<path d=\"M8 3 4 11l4 2M16 3l4 8-4 2\"/> <circle cx=\"12\" cy=\"15\" r=\"6\"/> <path d=\"M12 12v2.5l1.8 1\"/>","calendar":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/> <path d=\"M16 3v4M8 3v4M3 10h18\"/> <circle cx=\"12\" cy=\"15\" r=\"1.6\"/>","clock":"<circle cx=\"12\" cy=\"12\" r=\"9\"/> <path d=\"M12 7v5l3.5 2\"/>","flame":"<path d=\"M12 3c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-2 .3 2-1 3-2 3-1.5 0-2-1.5-1-3-2 0-3-2.5-2-5Z\"/>","heart":"<path d=\"M12 20s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.65-9.5 9-9.5 9z\"/>","shield":"<path d=\"M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z\"/> <polyline points=\"9,12 11,14 15,10\"/>","home":"<path d=\"M3 11L12 4l9 7\"/> <path d=\"M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9\"/>","mail":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/> <path d=\"M3 7l9 6 9-6\"/>","bell":"<g> <path d=\"M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6\"/> </g> <path d=\"M10 20a2 2 0 0 0 4 0\"/>","lock":"<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/> <path d=\"M8 11V8a4 4 0 0 1 8 0v3\"/> <circle cx=\"12\" cy=\"16\" r=\"1.5\"/>"};
/* a few the library doesn't have, drawn the same way: 24px box, 2px round stroke */
NBI.undo='<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>';
NBI.dots='<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>';
NBI.chev='<path d="m6 9 6 6 6-6"/>';
NBI.share='<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>';
NBI.phone='<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>';
NBI.image='<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>';
NBI.list='<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>';
NBI.compare='<rect x="3" y="4" width="7.5" height="16" rx="1.5"/><rect x="13.5" y="4" width="7.5" height="16" rx="1.5"/>';
const ic=(n,cls)=>`<svg class="nbi${cls?" "+cls:""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NBI[n]||""}</svg>`;

/* ===================== small helpers ===================== */
const NBQ=(s,r)=>(r||document).querySelector(s);
const NBQA=(s,r)=>[...(r||document).querySelectorAll(s)];
const nbEl=h=>{const t=document.createElement("template");t.innerHTML=h.trim();return t.content.firstElementChild};
const nbLS={get(k,f){try{const v=localStorage.getItem(k);return v==null?f:JSON.parse(v)}catch(e){return f}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}};
const nbCard=f=>CARDS.find(x=>x.f===f);
const nbDot=i=>`<i class="nbdot" style="--ic:${HEX[i]||"#888"}" aria-hidden="true"></i>`;
const nbPhoneList=()=>matchMedia("(max-width:639px)").matches;
const nbCompact=()=>matchMedia("(max-width:1023px)").matches;
const nbTouch=()=>matchMedia("(hover:none)").matches;
const nbCountTxt=n=>n.toLocaleString()+" card"+(n===1?"":"s");
const nbDeckName=()=>DECKS.cur===DRAFT?"New deck":DECKS.cur;
function nbMenu(btn,menu,onOpen){
  btn.addEventListener("click",e=>{e.stopPropagation();
    const open=menu.hidden;nbCloseMenus();
    if(open&&onOpen)onOpen();
    menu.hidden=!open;btn.setAttribute("aria-expanded",String(open));
    if(open){const f=menu.querySelector("button:not([disabled]),a");if(f)f.focus({preventScroll:true})}});
  menu.addEventListener("click",e=>{if(e.target.closest("button,a"))nbCloseMenus()});
}
function nbCloseMenus(){NBQA(".nbmenu").forEach(m=>m.hidden=true);
  NBQA("[aria-haspopup=true]").forEach(b=>b.setAttribute("aria-expanded","false"))}
document.addEventListener("click",e=>{if(!e.target.closest(".nbmenu"))nbCloseMenus()});

/* ===================== 1 · the shell =====================
   Existing pieces are MOVED, not rebuilt, so every handler already bound to
   them keeps working: the search box and its pills, the art/franchise/flavour
   switches, Syntax, the 72 special searches, the full Filters list, the
   card-view settings, and the classic deck panel (the "Stats" tab). */
const vS=$("vSearch"),WRAP=vS.querySelector(".wrap"),POOL=vS.querySelector("section.cards"),
      SCOL=$("searchcol"),OLDDECK=$("deck"),HEADER=document.querySelector("header");

/* ---- header: logo, five places, theme, sign in ---- */
const NAV=nbEl(`<nav class="nbnav" id="nbNav" aria-label="Main">
  <button type="button" data-go="build">Build</button>
  <button type="button" data-go="cards">Cards</button>
  <button type="button" data-go="decks">Decks</button>
  <button type="button" data-go="coll">Collection</button>
  <span class="nbmorewrap">
    <button type="button" data-go="more" id="nbMoreBtn" aria-haspopup="true" aria-expanded="false">More ${ic("chev","nbchev")}</button>
    <div class="nbmenu nbmega" id="nbMoreMenu" role="menu" hidden></div>
  </span>
</nav>`);
$("logo").after(NAV);
const THEMEB=nbEl(`<button type="button" class="nbtheme" id="nbTheme" aria-label="Switch theme" title="Light / dark">${ic("theme")}</button>`);
($("acct")||HEADER.lastElementChild).before(THEMEB);
NAV.querySelectorAll("[data-go]").forEach(b=>{if(b.dataset.go==="more")return;
  b.onclick=()=>({build:()=>showSearch(),cards:()=>showTab("tSearch"),
    decks:()=>showTab("tDecks"),coll:()=>showTab("tColl")})[b.dataset.go]()});

/* More: every page the site has, straight from the same list the classic
   Other page and hamburger read — so a game added there shows up here too. */
const NB_GICON={"":"star","Tools":"map-pin","Mini games":"swords"};
function nbMoreHTML(){
  const hidden=p=>OFF.includes(p)||(!GAMESON&&isGamePage(p))||(!DUSTON&&p==="dust")||(!SUGGON&&p==="shop");
  const item=([t,,page])=>isPageLink(page)
    ?`<a role="menuitem" href="${esc(page)}"${isExternalLink(page)?` target="_blank" rel="noopener"`:""}>${esc(t)}${isExternalLink(page)?" ↗":""}</a>`
    :`<button type="button" role="menuitem" data-op="${esc(page)}">${esc(t)}</button>`;
  const groups=OTHER_GROUPS.map(gr=>({g:gr.g,chips:gr.chips.filter(([,,p])=>p&&!hidden(p))})).filter(g=>g.chips.length);
  const build=`<div class="nbmcol"><h4>${ic("deck")}Deck building</h4>
      <button type="button" role="menuitem" data-mm="guided">Guided Coconut Build</button>
      <button type="button" role="menuitem" data-op="meta">Top decks</button>
      <button type="button" role="menuitem" data-mm="pull">Pull sheet for this deck</button>
      ${hidden("shop")?"":`<button type="button" role="menuitem" data-op="shop">Shopping list</button>`}</div>`;
  return `<div class="nbmcols">${build}${groups.map(gr=>`<div class="nbmcol"><h4>${ic(NB_GICON[gr.g]||"star")}${esc(gr.g||"Around the site")}</h4>
      ${gr.chips.filter(([,,p])=>!(gr.g===""&&(p==="meta"||p==="shop"))).map(item).join("")}</div>`).join("")}</div>
    <div class="nbmfoot">
      <button type="button" role="menuitem" data-mm="all">See everything</button>
      <button type="button" role="menuitem" data-mm="theme">${ic("theme")}Light / dark</button>
      <button type="button" role="menuitem" data-mm="keys" class="nbdesk">Keyboard shortcuts</button>
      <button type="button" role="menuitem" data-mm="tour">Welcome tour</button>
      <button type="button" role="menuitem" data-mm="classic">Classic builder</button></div>`;
}
nbMenu($("nbMoreBtn"),$("nbMoreMenu"),()=>{$("nbMoreMenu").innerHTML=nbMoreHTML()});
$("nbMoreMenu").addEventListener("click",e=>{
  const b=e.target.closest("[data-op],[data-mm]");if(!b)return;
  if(b.dataset.op){OPAGE=b.dataset.op;save("fs3_opage",OPAGE);showTab("tOther");return}
  const k=b.dataset.mm;
  if(k==="guided"){const g=$("mGuided");if(g)g.click()}
  if(k==="pull")nbPull();
  if(k==="all"){OPAGE="";save("fs3_opage","");showTab("tOther")}
  if(k==="theme")THEMEB.click();
  if(k==="keys")nbShortcuts();
  if(k==="tour")startTour(true);
  if(k==="classic")location.href=location.pathname+"?newbuilder=0"+location.hash;
});

/* ---- the filter bar, above the card pool ---- */
const BAR=nbEl(`<div class="nbbar" id="nbBar">
  <div class="nbrecent" id="nbRecent" hidden></div>
  <div class="nbline nbsearchline">
    <div class="nbsfwrap" id="nbSfWrap"></div>
    <button type="button" class="nbbtn" id="nbFiltersBtn" aria-expanded="false" aria-controls="nbMoreP">${ic("filter")}<span class="nbbl">Filters</span><span class="nbn" id="nbFiltersN"></span></button>
    <button type="button" class="nbbtn" id="nbSpecBtn" aria-expanded="false" aria-controls="nbDrawer" aria-label="Special searches">${ic("sparkles")}<span class="nbbl">Special searches</span><span class="nbn" id="nbSpecN"></span></button>
  </div>
  <div class="nbline nbquick" id="nbQuick"></div>
  <button type="button" class="nbpeek" id="nbPeek" aria-label="Show your deck">
    <span class="nbgrab" aria-hidden="true"></span>
    <b id="nbPeekN">0 / 60</b><span class="nbpeeki" id="nbPeekI">Empty deck</span>
    <span class="nbmini" id="nbPeekC" aria-hidden="true"></span>
  </button>
</div>`);
POOL.prepend(BAR);
$("nbSfWrap").appendChild($("sf"));
{const ac=$("acbox");if(ac)$("nbSfWrap").appendChild(ac)}
$("q").setAttribute("aria-label","Search cards by name, text, or what's in the art");
const nbPH=()=>{$("q").placeholder=nbCompact()?"Search cards or “blue dog”":"Search — a name, “draw a card”, or “blue dog”"};
nbPH();matchMedia("(max-width:1023px)").addEventListener("change",nbPH);

/* card-count row: Share your search moves into the ⚙ menu; one Clear lives in the bar */
{const cv=$("cvset"),lnk=$("lnk"),rb=POOL.querySelector(".rbar"),so=$("sort");
 if(cv&&lnk){const body=cv.querySelector(".cvbody");if(body)body.prepend(lnk)}
 /* the ⚙ sits beside Sort on the card-count line, so the grid starts one row higher */
 if(rb&&so&&cv){const g=nbEl(`<span class="nbrbr"></span>`);g.append(so,cv);rb.appendChild(g)}
 const gt=POOL.querySelector(".gtools");if(gt&&!gt.querySelector("button:not([hidden]),details"))gt.hidden=true;}

/* start panel (phones), compare bar — between the bar and the grid */
const START=nbEl(`<div class="nbstart" id="nbStart" hidden></div>`);
BAR.after(START);
const CMPBAR=nbEl(`<div class="nbcmpbar" id="nbCmpBar" role="status" hidden>
  ${ic("compare")}<span id="nbCmpT"></span><button type="button" class="nbbtn" id="nbCmpX">Cancel</button></div>`);
START.after(CMPBAR);

/* ---- Filters: a dropdown on a laptop, a half-height sheet on a phone ---- */
const MOREP=nbEl(`<div class="nbpanel" id="nbMoreP" role="dialog" aria-label="Filters" hidden>
  <div class="nbph"><b>Filters</b><button type="button" class="nbx" data-nbclose aria-label="Close filters">${ic("close")}</button></div>
  <div class="nbpb">
    <section class="nbsec nbsheetonly"><h4>Cost</h4><div class="nbcostslot" data-slot="sheet"></div></section>
    <section class="nbsec nbsheetonly"><h4>Card type</h4><div class="nbgrp" id="nbTypesSheet"></div></section>
    <section class="nbsec"><h4>Inkwell</h4>
      <div class="nbseg3" id="nbIW" role="radiogroup" aria-label="Inkwell">
        <button type="button" role="radio" data-iw="any">Any card</button>
        <button type="button" role="radio" data-iw="yes">Inkable only</button>
        <button type="button" role="radio" data-iw="no">Uninkable only</button></div>
      <p class="nbhelp">Inkable cards have the gold swirl around their cost — they can be put into your inkwell.</p></section>
    <section class="nbsec"><h4>Popular special searches</h4><div class="nbgrp" id="nbTop6"></div>
      <button type="button" class="nblink" id="nbAllSpec">All 72 special searches ${ic("arrow-right")}</button></section>
    <section class="nbsec" id="nbSearchIn"><h4>Your words also search</h4></section>
    <section class="nbsec" id="nbTools"><h4>Search syntax</h4></section>
    <section class="nbsec" id="nbFacets"><h4>Rarity, set, keyword, class, franchise, stats</h4></section>
  </div>
  <div class="nbpf"><button type="button" class="nblink" id="nbClearP">Clear all</button><button type="button" class="nbshow" data-nbclose id="nbShowN">Show cards</button></div>
</div>`);
BAR.appendChild(MOREP);
{const ar=SCOL.querySelector(".artrow");if(ar)$("nbSearchIn").appendChild(ar);
 const sy=$("sy"),syh=$("syh");
 if(sy){sy.textContent="Show the search syntax";$("nbTools").appendChild(sy)}
 if(syh)$("nbTools").appendChild(syh);
 const sd=$("side");if(sd){$("nbFacets").appendChild(sd);nbForceOpen(sd,"fs3_sideopen")}}
$("nbClearP").onclick=()=>clearAll();

/* ---- the Special searches drawer, sliding in from the left ---- */
const SCRIM=nbEl(`<div class="nbscrim" id="nbScrim" hidden></div>`);
const DRAWER=nbEl(`<aside class="nbdrawer" id="nbDrawer" role="dialog" aria-modal="true" aria-labelledby="nbDrT" hidden>
  <div class="nbph"><div><b id="nbDrT">${ic("sparkles")}Special searches</b>
    <span class="nbsub">Find cards by the job they do in a deck</span></div>
    <button type="button" class="nbx" data-nbclose aria-label="Close special searches">${ic("close")}</button></div>
  <div class="nbdrs">${ic("search")}<input id="nbDrQ" type="search" autocomplete="off"
    placeholder="Find one — “draw”, “bounce”, “ramp”…" aria-label="Find a special search"></div>
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

/* ---- the deck panel: always on screen from 1024px, a bottom sheet below ---- */
const DECKP=nbEl(`<aside class="nbdeck" id="nbDeck" aria-label="Your deck">
  <div class="nbdh">
    <button type="button" class="nbsheetgrab" id="nbSheetGrab" aria-label="Close deck"><span aria-hidden="true"></span></button>
    <div class="nbdh1">
      <span class="nbmorewrap nbdnw">
        <button type="button" class="nbdname" id="nbDName" aria-haspopup="true" aria-expanded="false" title="Switch deck"><span id="nbDNameT"></span>${ic("chev","nbchev")}</button>
        <div class="nbmenu" id="nbDecksMenu" role="menu" hidden></div>
      </span>
      <button type="button" class="nbib" id="nbUndo" aria-label="Undo" title="Undo (Ctrl+Z)" disabled>${ic("undo")}</button>
      <button type="button" class="nbbtn go" id="nbSave">Save</button>
      <span class="nbmorewrap">
        <button type="button" class="nbib" id="nbDMenuBtn" aria-label="Deck options" aria-haspopup="true" aria-expanded="false">${ic("dots")}</button>
        <div class="nbmenu right" id="nbDMenu" role="menu" hidden></div>
      </span>
    </div>
    <div class="nbdsub"><span class="nbsave" id="nbSaveState" role="status"></span>
      <label class="nbfmtl">Format <select id="nbFmtSel"></select></label></div>
    <div class="nbprog" id="nbProg"></div>
    <div class="nbwarn" id="nbWarn"></div>
    <div class="nbtabrow"><div class="nbtabs" id="nbTabs" role="tablist" aria-label="Deck views"></div>
      <select id="nbView" aria-label="How the list is shown">
        <option value="type">By type</option><option value="cost">By cost</option>
        <option value="ink">By ink</option><option value="name">A–Z</option><option value="img">Pictures</option></select></div>
  </div>
  <div class="nbdbody" id="nbDBody">
    <div class="nbpane" id="nbPane-list" role="tabpanel"><div id="nbList"></div></div>
    <div class="nbpane" id="nbPane-tools" role="tabpanel" hidden></div>
  </div>
  <div class="nbdfoot" id="nbDFoot">
    <button type="button" class="nbbtn" id="nbPullB">${ic("printer")}Pull sheet</button>
    <button type="button" class="nbbtn" id="nbShareB">${ic("share")}Share</button>
    <button type="button" class="nbbuy" id="nbBuy" hidden></button>
  </div>
</aside>`);
WRAP.appendChild(DECKP);
$("nbPane-tools").appendChild(OLDDECK);

/* one floating preview, one undo toast, one card-actions sheet */
const PREV=nbEl(`<div class="nbprev" id="nbPrev" aria-hidden="true" hidden><img alt=""></div>`);
const UTOAST=nbEl(`<div class="nbutoast" id="nbUToast" role="status" aria-live="polite" hidden>
  <span id="nbUTxt"></span><button type="button" id="nbUBtn">Undo</button></div>`);
const ACT=nbEl(`<div class="nbact" id="nbAct" role="dialog" aria-modal="true" aria-labelledby="nbActT" hidden>
  <div class="nbph"><b id="nbActT"></b><button type="button" class="nbx" data-nbclose aria-label="Close">${ic("close")}</button></div>
  <div class="nbactsub">How many in this deck?</div>
  <div class="nbcounts" id="nbCounts"></div>
  <div class="nbacts"><button type="button" class="nbbtn" data-act="info">${ic("book")}Card details</button>
    <button type="button" class="nbbtn" data-act="compare">${ic("compare")}Compare</button></div>
</div>`);
document.body.append(PREV,UTOAST,ACT);

/* Ko-fi: out of the builder. The original "Support Ready Set Ink" button goes
   back where Ben wants it — the top of the Settings page. */
{const kw=$("kofiwrap"),pref=$("vPref");
 if(kw&&pref){const pg=pref.querySelector(".page")||pref;
   const box=nbEl(`<div class="nbkofi"><p>Ready Set Ink is free and always will be. If it's saved you some time, you can say thanks here:</p></div>`);
   box.appendChild(kw);const lede=pg.querySelector(".lede");(lede||pg.firstElementChild).after(box)}}

/* ===================== 2 · panels, drawer, sheets ===================== */
let nbOpenPanel=null;
function nbOpen(id,btnId){
  nbCloseAll(true);
  const p=$(id);if(!p)return;
  p.hidden=false;nbOpenPanel=id;
  if(btnId){const b=$(btnId);if(b)b.setAttribute("aria-expanded","true")}
  SCRIM.hidden=!(id==="nbDrawer"||id==="nbAct"||nbCompact());
  if(id==="nbDrawer")setTimeout(()=>$("nbDrQ").focus(),30);
}
function nbCloseAll(quiet){
  ["nbMoreP","nbDrawer","nbAct"].forEach(i=>{const p=$(i);if(p)p.hidden=true});
  ["nbFiltersBtn","nbSpecBtn"].forEach(i=>{const b=$(i);if(b)b.setAttribute("aria-expanded","false")});
  DECKP.classList.remove("open");
  SCRIM.hidden=true;nbOpenPanel=null;
  if(!quiet)PREV.hidden=true;
}
$("nbFiltersBtn").onclick=e=>{e.stopPropagation();nbOpenPanel==="nbMoreP"?nbCloseAll():nbOpen("nbMoreP","nbFiltersBtn")};
$("nbSpecBtn").onclick=()=>nbOpen("nbDrawer","nbSpecBtn");
$("nbAllSpec").onclick=()=>nbOpen("nbDrawer","nbSpecBtn");
SCRIM.onclick=()=>nbCloseAll();
document.addEventListener("click",e=>{
  if(!e.target.closest("#nbRecent,#q"))$("nbRecent").hidden=true;
  if(e.target.closest("[data-nbclose]")){nbCloseAll();return}
  if(nbOpenPanel==="nbMoreP"&&!nbCompact()&&!e.target.closest("#nbMoreP,#nbFiltersBtn,#acbox,.cfmbg,.mbg"))nbCloseAll();
});

/* drawer: search inside the 72 */
$("nbDrQ").addEventListener("input",nbDrFilter);
function nbDrFilter(){
  const q=($("nbDrQ").value||"").trim().toLowerCase();
  const G=$("groups");if(!G)return;
  G.classList.toggle("nbfiltering",!!q);
  NBQA("details",G).forEach(d=>{
    const chips=NBQA(".chip",d);
    const title=(d.querySelector("summary")||{textContent:""}).textContent.toLowerCase();
    if(d.id==="cocogrp"||d.id==="moneygrp"){d.hidden=!!q&&!title.includes(q);return}
    if(!chips.length)return;
    let any=false;
    chips.forEach(c=>{const hit=!q||c.textContent.toLowerCase().includes(q)||title.includes(q);
      c.hidden=!hit;if(hit)any=true});
    d.hidden=!!q&&!any;
    if(q&&any)d.open=true;
  });
}

/* ===================== 3 · quick filters (built once, updated in place) ===================== */
const NB_TYPES=[["Character","Characters"],["Action","Actions"],["Song","Songs"],["Item","Items"],["Location","Locations"]];
const NB_CMAX=10;   // the right-hand stop means "10 or more"
const nbTypeBtns=()=>NB_TYPES.map(([t,l])=>`<button type="button" class="nbchip" data-type="${t}" aria-pressed="false">${l}</button>`).join("");
function nbCostHTML(){
  return `<div class="nbcostw" role="group" aria-label="Cost">
    <span class="nbcl">Cost</span>
    <div class="nbrange">
      <div class="nbtrack"><div class="nbfillr"></div></div>
      <input type="range" class="nblo" min="0" max="${NB_CMAX}" step="1" value="0" aria-label="Lowest cost">
      <input type="range" class="nbhi" min="0" max="${NB_CMAX}" step="1" value="${NB_CMAX}" aria-label="Highest cost">
      <div class="nbticks" aria-hidden="true">${Array.from({length:NB_CMAX+1},(_,i)=>`<span>${i===NB_CMAX?i+"+":i}</span>`).join("")}</div>
    </div>
    <output class="nbcv">Any</output></div>`;
}
$("nbQuick").innerHTML=`<div class="nbgrp nbinks" role="group" aria-label="Ink">${INKS.map(i=>
    `<button type="button" class="nbchip nbink" data-ink="${i}" aria-pressed="false" style="--ic:${HEX[i]}">${nbDot(i)}<span>${i}</span></button>`).join("")}</div>
  <div class="nbcostslot" data-slot="bar"></div>
  <div class="nbgrp nbtypes" role="group" aria-label="Card type">${nbTypeBtns()}</div>
  <button type="button" class="nblink nbclear" id="nbClearQ" hidden>Clear all</button>`;
$("nbTypesSheet").innerHTML=nbTypeBtns();
NBQA(".nbcostslot").forEach(s=>{s.innerHTML=nbCostHTML();nbWireCost(s.firstElementChild)});
$("nbClearQ").onclick=()=>clearAll();
let nbCostT=null;
function nbWireCost(w){
  const lo=w.querySelector(".nblo"),hi=w.querySelector(".nbhi");
  const move=which=>{
    let a=+lo.value,b=+hi.value;
    if(a>b){if(which==="lo")lo.value=a=b;else hi.value=b=a}
    S.cost=[a<=0?null:a,b>=NB_CMAX?null:b];
    NBQA(".nbcostw").forEach(nbPaintCost);
    nbStartSeen();
    clearTimeout(nbCostT);nbCostT=setTimeout(()=>{S.limit=150;render()},140);
  };
  lo.addEventListener("input",()=>move("lo"));hi.addEventListener("input",()=>move("hi"));
}
function nbPaintCost(w){
  const [a,b]=S.cost,lo=a==null?0:Math.min(a,NB_CMAX),hi=b==null?NB_CMAX:Math.min(b,NB_CMAX);
  const L=w.querySelector(".nblo"),H=w.querySelector(".nbhi");
  if(document.activeElement!==L)L.value=lo;if(document.activeElement!==H)H.value=hi;
  /* whichever thumb sits at the far right has to be on top, or two thumbs at 10 can't be pulled apart */
  L.style.zIndex=lo>=NB_CMAX-1?5:3;H.style.zIndex=4;
  const f=w.querySelector(".nbfillr");f.style.left=(lo/NB_CMAX*100)+"%";f.style.right=(100-hi/NB_CMAX*100)+"%";
  const any=a==null&&b==null;
  w.classList.toggle("on",!any);
  w.querySelector(".nbcv").textContent=any?"Any":lo===hi?String(lo)+(hi===NB_CMAX?"+":""):`${lo}–${hi}${hi===NB_CMAX?"+":""}`;
}
function nbAnyFilter(){
  return !!(S.q||S.ab.size||S.ink.size||S.dual||S.type.size||S.rar.size||S.kw.size||S.cls.size||S.sto.size||
    S.tag.size||S.art.size||S.terms.length||S.set||S.inkwell!=="any"||S.fl||
    [S.cost,S.st,S.wi,S.lo].some(r=>r[0]!=null||r[1]!=null));
}
function nbPaintQuick(){
  NBQA("[data-ink]").forEach(b=>{const on=S.ink.has(b.dataset.ink);b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)});
  NBQA("#nbQuick [data-type],#nbTypesSheet [data-type]").forEach(b=>{const on=S.type.has(b.dataset.type);b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)});
  NBQA(".nbcostw").forEach(nbPaintCost);
  NBQA("#nbIW [data-iw]").forEach(b=>{const on=S.inkwell===b.dataset.iw;b.classList.toggle("on",on);b.setAttribute("aria-checked",on)});
  $("nbClearQ").hidden=!nbAnyFilter();
}
function nbQuickClick(e){
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.ink){const i=b.dataset.ink;S.ink.has(i)?S.ink.delete(i):S.ink.add(i)}
  else if(b.dataset.type){const t=b.dataset.type;S.type.has(t)?S.type.delete(t):S.type.add(t)}
  else if(b.dataset.iw){S.inkwell=b.dataset.iw}
  else return;
  nbStartSeen();S.limit=150;render();
}
[$("nbQuick"),$("nbTypesSheet"),$("nbIW")].forEach(x=>x.addEventListener("click",nbQuickClick));

/* the six special searches people reach for first */
const NB_TOP6=["staple","draw","banish","bounce","ramp","finisher"];
const nbTop6=()=>NB_TOP6.map(id=>AB.find(a=>a.id===id)).filter(Boolean);
function nbPaintTop6(){
  $("nbTop6").innerHTML=nbTop6().map(a=>`<button type="button" class="nbchip${S.ab.has(a.id)?" on":""}"
    data-ab="${a.id}" aria-pressed="${S.ab.has(a.id)}">${esc(a.l.replace(/^★\s*/,""))}</button>`).join("");
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-ab]");if(!b||!b.closest("#nbTop6,#nbRecent"))return;
  const id=b.dataset.ab;S.ab.has(id)?S.ab.delete(id):S.ab.add(id);nbStartSeen();S.limit=150;render();
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
     you typed) puts it away, so it never sits over the ink and cost controls. */
  const box=$("nbRecent"),q=$("q");
  if(!(document.activeElement===q&&!q.value)){box.hidden=true;return}
  const r=nbLS.get(NB_RK,[]);
  box.innerHTML=(r.length?`<div class="nbrl">Recent</div><div class="nbgrp">${r.map(x=>
      `<button type="button" class="nbchip" data-recent="${esc(x)}">${esc(x)}</button>`).join("")}</div>`:"")
    +`<div class="nbrl">Popular special searches</div><div class="nbgrp">${nbTop6().map(a=>
      `<button type="button" class="nbchip${S.ab.has(a.id)?" on":""}" data-ab="${a.id}">${esc(a.l.replace(/^★\s*/,""))}</button>`).join("")}</div>`;
  box.hidden=false;
}
$("q").addEventListener("focus",nbPaintRecent);
$("q").addEventListener("input",()=>{$("nbRecent").hidden=true;nbStartSeen();clearTimeout(nbPaintRecent._t);
  nbPaintRecent._t=setTimeout(()=>{const v=$("q").value;if(v.trim().length>=3&&filt().length)nbRemember(v)},1500)});
$("nbRecent").addEventListener("mousedown",e=>e.preventDefault());
$("nbRecent").addEventListener("click",e=>{
  const b=e.target.closest("[data-recent]");if(!b)return;
  const q=$("q");q.value=b.dataset.recent;q.dispatchEvent(new Event("input",{bubbles:true}));
  $("nbRecent").hidden=true;
});

/* ===================== 5 · the card tiles ===================== */
const GRID=$("grid");
const _tile=tile;
tile=function(c){
  let h=_tile(c);
  try{
    const q=deck().cards[c.f]||0,max=maxCopies(c),name=esc(c.f);
    h=h.replace(/^<div class="c/,`<div style="--ic:${HEX[c.co[0]]||"#888"}" class="c${q?" nbin":""}${q&&q>=max?" nbfull":""}`);
    if(TAB!=="tSearch"){
      h=h.replace('title="Remove one">',`title="Remove one" aria-label="Remove one ${name}">`)
         .replace('title="Add one">',`title="Add one" aria-label="Add one ${name}">`)
         .replace('title="Type a number and press Enter">',`title="Type a number and press Enter"><button type="button" class="nbcnt" data-cnt="${name}" aria-label="${q} in the deck — choose how many">${q}</button>`);
    }
    const info=`<div class="nbinfo"><b>${esc(c.n)}</b>${c.v?`<small>${esc(c.v)}</small>`:""}
      <span class="nbmeta"><i class="nbc">${c.c}</i>${(c.co||[]).map(i=>nbDot(i)+esc(i)).join(" ")} · ${esc(c.sub.includes("Song")?"Song":c.ty||"")}${c.ik?"":" · uninkable"}</span></div>`;
    h=h.replace(/<\/div>\s*$/,info+"</div>");
    if(nbPhoneList())h=h.replace(/\/digital\/normal\//g,"/digital/small/");
  }catch(e){}
  return h;
};
/* Adding a card used to rebuild every tile's contents — including its <img>,
   which the browser then had to redraw: that was the flash. Now a tile whose
   markup hasn't changed is left completely alone, and one that has changed
   keeps its existing picture node. */
refreshTiles=function(){
  const tmp=document.createElement("div");
  GRID.querySelectorAll(".c").forEach(el=>{
    const c=nbCard(el.dataset.f);if(!c)return;
    const html=tile(c);
    if(el._nbh===html)return;
    tmp.innerHTML=html;const fresh=tmp.firstElementChild;
    const src=x=>{const i=x&&(x.tagName==="IMG"?x:x.querySelector("img"));return i?i.getAttribute("src"):null};
    const oldI=el.querySelector(":scope>img,:scope>.timg"),newI=fresh.querySelector(":scope>img,:scope>.timg");
    if(oldI&&newI&&oldI.tagName===newI.tagName&&src(oldI)===src(newI))newI.replaceWith(oldI);
    el.className=fresh.className;el.setAttribute("style",fresh.getAttribute("style")||"");
    el.replaceChildren(...fresh.childNodes);el._nbh=html;
  });
  bindGrid();
};
/* no flying card, no bounce — the deck list shows the change, quietly */
flyToDeck=function(){bumpDeck();try{nbTouch()&&navigator.vibrate&&navigator.vibrate(8)}catch(e){}};
pop=function(){};

/* one set of delegated listeners on the grid — they survive every re-render */
let nbHov=null,nbPress=null,nbSwallow=false,nbCmp=null,nbZoomT=null;
GRID.addEventListener("mouseover",e=>{
  const t=e.target.closest(".c");nbHov=t?t.dataset.f:null;
  /* the big preview only for the picture itself, and only after a real pause */
  const img=!nbTouch()&&!nbPhoneList()&&e.target.closest(".c>img,.c>.timg");
  clearTimeout(nbZoomT);
  if(!img){PREV.hidden=true;return}
  const f=t.dataset.f;
  nbZoomT=setTimeout(()=>nbPreview(f,img.getBoundingClientRect(),380),1500);
});
GRID.addEventListener("mouseleave",()=>{nbHov=null;clearTimeout(nbZoomT);PREV.hidden=true});
window.addEventListener("scroll",()=>{clearTimeout(nbZoomT);PREV.hidden=true},{passive:true});
function nbPreview(f,R,w){
  const c=nbCard(f);if(!c||!cImg(c))return;
  const im=PREV.querySelector("img");if(im.dataset.f!==f){im.src=cImgL(c);im.dataset.f=f;im.alt=f}
  const h=Math.round(w*940/674);
  PREV.style.width=w+"px";
  const right=R.right+12+w<innerWidth;
  PREV.style.left=(right?R.right+12:Math.max(8,R.left-12-w))+"px";
  PREV.style.top=Math.max(8,Math.min(innerHeight-h-8,R.top+R.height/2-h/2))+"px";
  PREV.hidden=false;
}
GRID.addEventListener("contextmenu",e=>{
  if(TAB==="tSearch")return;
  const t=e.target.closest(".c");if(!t||e.target.closest("input"))return;
  e.preventDefault();
  if(deck().cards[t.dataset.f])delCard(t.dataset.f);
});
GRID.addEventListener("click",e=>{
  PREV.hidden=true;clearTimeout(nbZoomT);
  if(nbSwallow){nbSwallow=false;e.preventDefault();e.stopPropagation();return}
  const t=e.target.closest(".c");if(!t)return;
  const f=t.dataset.f;
  if(nbCmp){e.preventDefault();e.stopPropagation();
    if(f!==nbCmp){const a=nbCmp;nbCmpEnd();nbCompare(a,f)}return}
  if(e.target.closest("[data-cnt]")){e.preventDefault();e.stopPropagation();nbCountSheet(f);return}
  if(nbPhoneList()){
    /* list rows: tap the picture for the full card, tap the row to add one */
    if(e.target.closest("img,.ph,.timg")){e.preventDefault();e.stopPropagation();openM(f);return}
    if(e.target.closest(".nbinfo")){if(TAB==="tSearch")openM(f);else addCard(f);return}
  }
},true);
/* long-press on a phone: choose a count, or compare */
GRID.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"||e.target.closest("button,input"))return;
  const t=e.target.closest(".c");if(!t)return;
  const x=e.clientX,y=e.clientY;
  nbPress={x,y,timer:setTimeout(()=>{nbPress=null;nbSwallow=true;
    try{navigator.vibrate&&navigator.vibrate(12)}catch(err){}
    nbCountSheet(t.dataset.f)},480)};
});
/* Listened for on the window, not the grid: after a long-press the finger
   usually lifts over the sheet that just opened, and a grid-only listener
   would never hear it — leaving the NEXT real tap on a card swallowed. */
["pointerup","pointercancel"].forEach(ev=>window.addEventListener(ev,()=>{if(nbPress){clearTimeout(nbPress.timer);nbPress=null}
  if(nbSwallow)setTimeout(()=>{nbSwallow=false},450)},true));
GRID.addEventListener("pointermove",e=>{if(nbPress&&Math.hypot(e.clientX-nbPress.x,e.clientY-nbPress.y)>10){clearTimeout(nbPress.timer);nbPress=null}});

/* the count picker (long-press, or tapping the number on a phone) */
let nbActF=null;
function nbCountSheet(f){
  const c=nbCard(f);if(!c)return;nbActF=f;
  const max=maxCopies(c),cur=deck().cards[f]||0,top=Math.min(Math.max(max,1),4);
  $("nbActT").textContent=c.f;
  const deckable=TAB!=="tSearch";
  $("nbCounts").innerHTML=deckable?Array.from({length:top+1},(_,n)=>`<button type="button" class="nbcn${n===cur?" on":""}"
    data-n="${n}" aria-label="${n} ${n===1?"copy":"copies"}">${n}</button>`).join(""):"";
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
  if(b.dataset.act==="compare")nbCmpStart(f);
});
/* compare: pick one card, then any other */
function nbCmpStart(f){
  nbCmp=f;$("mbg").classList.remove("on");
  $("nbCmpT").textContent=`Comparing ${nbCard(f).f} — now ${nbTouch()?"tap":"click"} another card`;
  CMPBAR.hidden=false;
  if(nbCompact())CMPBAR.scrollIntoView({block:"nearest"});
}
function nbCmpEnd(){nbCmp=null;CMPBAR.hidden=true}
$("nbCmpX").onclick=nbCmpEnd;
function nbCompare(a,b){
  const A=nbCard(a),B=nbCard(b);if(!A||!B)return;
  const col=c=>`<div class="nbcmpc">
    ${cImg(c)?`<img src="${cImgL(c)}" alt="${esc(c.f)}">`:""}
    <h3>${esc(c.n)}${c.v?` <small>${esc(c.v)}</small>`:""}</h3>
    <div class="nbcmpm">${c.c} ink · ${(c.co||[]).map(i=>nbDot(i)+esc(i)).join(" ")} · ${esc(c.ty||"")}${c.ik?" · inkable":" · uninkable"}</div>
    ${c.ty==="Character"?`<div class="nbcmpm">Strength ${c.st??"–"} · Willpower ${c.wi??"–"} · Lore ${c.lo??"–"}</div>`:""}
    <p>${esc(c.tx||"No rules text.")}</p>
    ${rawPrice(c)!=null?`<div class="nbcmpm">About ${money(rawPrice(c))}</div>`:""}
    ${TAB!=="tSearch"?`<button type="button" class="nbbtn go" data-cmpadd="${esc(c.f)}">${ic("plus")}Add to deck</button>`:""}
  </div>`;
  const m=$("modal");m.className="modal nbcmpm0";
  m.innerHTML=`<button class="mx" id="mx" aria-label="Close">✕</button><h2 class="nbcmph">${ic("compare")}Compare</h2>
    <div class="nbcmp">${col(A)}${col(B)}</div>`;
  $("mbg").classList.add("on");
  $("mx").onclick=()=>$("mbg").classList.remove("on");
  m.querySelectorAll("[data-cmpadd]").forEach(x=>x.onclick=()=>{addCard(x.dataset.cmpadd);toast("Added "+x.dataset.cmpadd)});
}

/* grid extras: a typo still finds the card, and more results load as you scroll */
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
    GRID.querySelectorAll(".c").forEach(el=>{const c=nbCard(el.dataset.f);if(c)el._nbh=tile(c)});
    if(nbIO)nbIO.disconnect();
    const mo=$("mo");
    if(mo&&"IntersectionObserver" in window){
      nbIO=new IntersectionObserver(ents=>{if(ents.some(x=>x.isIntersecting)){nbIO.disconnect();S.limit+=150;renderGrid()}},{rootMargin:"600px"});
      nbIO.observe(mo);
    }
  }catch(e){}
};

/* ===================== 6 · the deck panel ===================== */
let NBDV=nbLS.get("fs3_nb_dview","list");
let NBTAB="list";
/* Tabs are a registry so Hand and Notes (Phase 3) can be added with
   NBX.addDeckTab(...) instead of editing this panel. */
const NB_DECKTABS=[
  {id:"list",label:"List"},
  {id:"tools",label:"Stats",title:"Curve, inkable count, deck analysis, sample hand and odds"}];
function nbPaintTabs(){
  $("nbTabs").innerHTML=NB_DECKTABS.map(t=>`<button type="button" role="tab" id="nbTab-${t.id}"
    aria-selected="${NBTAB===t.id}" aria-controls="nbPane-${t.id}" ${t.title?`title="${esc(t.title)}"`:""}>${esc(t.label)}</button>`).join("");
  NB_DECKTABS.forEach(t=>{const p=$("nbPane-"+t.id);if(p)p.hidden=NBTAB!==t.id});
  $("nbView").hidden=NBTAB!=="list";
}
$("nbTabs").addEventListener("click",e=>{const b=e.target.closest("[role=tab]");if(b)nbShowTab(b.id.slice(6))});
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
let nbPrevCards=null,nbPrevDeck=null;
function nbPaintDeck(){
  const d=deck(),F=FMT[d.fmt]||FMT.infinity,L=dlist(),tot=dtotal(),min=F.min||0;
  /* header */
  $("nbDNameT").textContent=nbDeckName();
  $("nbFmtSel").innerHTML=FMT_ORDER.map(k=>`<option value="${k}"${k===d.fmt?" selected":""}>${esc(FMT[k].l)}</option>`).join("");
  $("nbFmtSel").title=FMT_BLURB[d.fmt]||"";
  nbPaintSaveState();
  /* progress: in the deck's own ink colours, green at a legal 60 */
  const ic2={};let ink=0,cost=0;
  L.forEach(({c,q})=>{const n=c.co.length||1;c.co.forEach(i=>ic2[i]=(ic2[i]||0)+q/n);if(c.ik)ink+=q;cost+=c.c*q});
  const warns=deckWarnings().filter(w=>!/more cards? to reach/.test(w));
  const legal=tot>=min&&!warns.length;
  const fill=min?Math.min(100,tot/min*100):100;
  const inkE=Object.entries(ic2).sort((a,b)=>b[1]-a[1]);
  const inkSum=inkE.reduce((a,[,n])=>a+n,0)||1;
  $("nbProg").innerHTML=`<div class="nbpline"><b>${tot}${min?`<span> / ${min}</span>`:""}</b>
      ${legal&&tot?`<span class="nbok">${ic("check")}Ready to play</span>`:min&&tot<min?`<span class="nbtogo">${min-tot} to go</span>`:""}
      <span class="nbpinks">${inkE.map(([i])=>nbDot(i)+`<span>${i}</span>`).join("")}</span></div>
    <div class="nbpbar${legal&&tot?" done":""}" role="progressbar" aria-valuemin="0" aria-valuemax="${min||tot}"
      aria-valuenow="${tot}" aria-label="${tot} of ${min} cards">
      <div class="nbpfill" style="width:${fill}%">${inkE.map(([i,n])=>`<i style="width:${n/inkSum*100}%;background:${HEX[i]||"#888"}"></i>`).join("")}</div></div>
    ${tot?`<div class="nbps">${ink} inkable · average cost ${(cost/tot).toFixed(1)}</div>`:""}`;
  $("nbWarn").innerHTML=warns.length?`<ul>${warns.slice(0,2).map(w=>`<li>${esc(w)}</li>`).join("")}</ul>${warns.length>2
    ?`<details><summary>${warns.length-2} more</summary><ul>${warns.slice(2).map(w=>`<li>${esc(w)}</li>`).join("")}</ul></details>`:""}`:"";
  /* list */
  const view=NBDV==="img"?"img":(["type","cost","ink","name"].includes(DSORT)?DSORT:"type");
  $("nbView").value=view;
  const groups=nbGroupRows(L,view==="img"?"type":view);
  /* only the row that just changed gets a highlight — never the whole list */
  const prev=nbPrevDeck===DECKS.cur?nbPrevCards:null;nbPrevCards=Object.assign({},d.cards);nbPrevDeck=DECKS.cur;
  const changed=f=>prev&&prev[f]!==d.cards[f];
  const qty=(f,q,max)=>`<span class="nbqty"><button type="button" class="nbm" data-m="${esc(f)}" aria-label="Remove one ${esc(f)}">−</button>
      <b class="nbq" aria-label="${q} copies">${q}</b>
      <button type="button" class="nbp" data-p="${esc(f)}" aria-label="Add one ${esc(f)}"${q>=max?" disabled":""}>+</button></span>`;
  const row=({c,q,f})=>{
    const max=maxCopies(c),bad=illegalReason(c),p=rawPrice(c);
    if(view==="img")return `<div class="nbimg${bad?" bad":""}${changed(f)?" nbchg":""}" data-row="${esc(f)}">
      ${cImg(c)?`<img src="${cImg(c)}" alt="${esc(f)}" data-open="${esc(f)}" loading="lazy">`:`<button type="button" class="nbph" data-open="${esc(f)}">${esc(c.n)}</button>`}
      ${qty(f,q,max)}</div>`;
    return `<div class="nbrow${bad?" bad":""}${changed(f)?" nbchg":""}" data-row="${esc(f)}"${bad?` title="${esc(bad)}"`:""}>
      <span class="nbcost" aria-label="Cost ${c.c}">${c.c}</span>
      <span class="nbinks">${(c.co||[]).map(i=>`<i class="nbdot" style="--ic:${HEX[i]}" title="${i}"></i><span class="nbsr">${i}</span>`).join("")}</span>
      <button type="button" class="nbnm" data-open="${esc(f)}"><b>${esc(c.n)}</b>${c.v?` <small>${esc(c.v)}</small>`:""}</button>
      ${PRICES&&p!=null?`<span class="nbpr" title="${q} × ${money(Math.round(p*100)/100)}">${money(Math.round(p*q*100)/100)}</span>`:""}
      ${qty(f,q,max)}
    </div>`;
  };
  $("nbList").innerHTML=L.length?groups.map(([t,rows])=>{
      const n=rows.reduce((a,x)=>a+x.q,0);
      return (t?`<div class="nbgh">${esc(t)}<span>${n}</span></div>`:"")
        +`<div class="${view==="img"?"nbimgs":"nbrows"}">${rows.map(row).join("")}</div>`}).join("")
    :nbEmptyDeck();
  /* footer: pull sheet, share, and the TCGplayer link */
  const has=tot>0;
  $("nbPullB").disabled=!has;$("nbShareB").disabled=!has;
  let buy="";
  if(has&&priceDate()){
    const rows=COLLON?borrowRows().map(x=>({c:x.c,q:x.need})):L.map(({c,q})=>({c,q}));
    const sum=rows.reduce((a,{c,q})=>a+(rawPrice(c)||0)*q,0);
    if(rows.length)buy=`${ic("store")}${COLLON?"Buy missing":"Buy deck"}${sum?` · ${money(Math.round(sum))}`:""}`;
  }
  $("nbBuy").innerHTML=buy;$("nbBuy").hidden=!buy;
  $("nbBuy").title="Opens TCGplayer — an affiliate link, at no extra cost to you";
  nbPaintPeek(L,tot,min,ic2);
  nbPaintTabs();
  nbPaintStart();
}
/* An empty deck is where a deck starts — so that's where the ways to start live. */
const NB_START=[
  {id:"meta",icon:"trophy",label:"Start from a top deck",sub:"Tournament lists for every ink pair",run:()=>{OPAGE="meta";save("fs3_opage",OPAGE);showTab("tOther")}},
  {id:"guided",icon:"sparkles",label:"Guided Coconut Build",sub:"Pick a Coconut and we'll walk you through it",run:()=>{const g=$("mGuided");if(g)g.click()}},
  {id:"paste",icon:"download",label:"Paste a deck list",sub:"From Dreamborn, a video, or a friend",run:()=>importDeckPrompt()}];
function nbStartHTML(){
  return `<div class="nbstartg">${NB_START.map(o=>`<button type="button" class="nbopt" data-start="${o.id}">
    ${ic(o.icon,"nbopti")}<span><b>${esc(o.label)}</b><small>${esc(o.sub)}</small></span></button>`).join("")}</div>`;
}
function nbEmptyDeck(){
  return `<div class="nbempty"><b>Your deck is empty</b>
    <p>${nbTouch()?"Tap":"Click"} any card to add it${nbTouch()?"":" — right-click takes one out"}. Or start from here:</p>
    ${nbStartHTML()}</div>`;
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-start]");if(!b)return;
  const o=NB_START.find(x=>x.id===b.dataset.start);if(o){nbCloseAll();o.run()}
});
function nbPaintSaveState(){
  const st=$("nbSaveState"),sv=$("nbSave");if(!st)return;
  const draft=DECKS.cur===DRAFT,empty=!dtotal();
  st.className="nbsave"+(DECKDIRTY&&!empty?" dirty":"");
  st.textContent=draft?"Not saved yet":(DECKDIRTY?"Unsaved changes":"Saved");
  sv.textContent=draft?"Save deck":"Save";
  sv.disabled=empty||(!draft&&!DECKDIRTY);
  const u=$("nbUndo");if(u){u.disabled=!UNDO.length;u.title=UNDO.length?"Undo "+UNDO[UNDO.length-1].label+" (Ctrl+Z)":"Nothing to undo"}
}
/* deck panel wiring (bound once; its contents are repainted) */
$("nbSave").onclick=e=>saveDeckPrompt(e);
$("nbUndo").onclick=()=>undo();
$("nbFmtSel").onchange=e=>setFmt(e.target.value);
$("nbView").onchange=e=>{const v=e.target.value;
  if(v==="img"){NBDV="img"}else{NBDV="list";DSORT=v;save("fs3_dsort",DSORT)}
  nbLS.set("fs3_nb_dview",NBDV);nbPaintDeck()};
DECKP.addEventListener("click",e=>{
  const p=e.target.closest("#nbList [data-p]");if(p){addCard(p.dataset.p);return}
  const m=e.target.closest("#nbList [data-m]");if(m){delCard(m.dataset.m);return}
  const o=e.target.closest("#nbList [data-open]");if(o){openM(o.dataset.open);return}
});
$("nbList").addEventListener("contextmenu",e=>{const r=e.target.closest("[data-row]");if(!r)return;
  e.preventDefault();delCard(r.dataset.row)});
/* hover a card's name: its picture appears beside the panel, after a pause */
let nbRowT=null;
$("nbList").addEventListener("mouseover",e=>{
  if(nbTouch())return;
  clearTimeout(nbRowT);
  const r=e.target.closest(".nbrow .nbnm");if(!r){PREV.hidden=true;return}
  const f=r.closest("[data-row]").dataset.row;
  nbRowT=setTimeout(()=>{const R=r.getBoundingClientRect(),D=DECKP.getBoundingClientRect();
    nbPreview(f,{left:D.left,right:innerWidth,top:R.top,height:R.height},300);
    PREV.style.left=Math.max(8,D.left-312)+"px"},700);
});
$("nbList").addEventListener("mouseleave",()=>{clearTimeout(nbRowT);PREV.hidden=true});
/* drag a card from the pool onto the panel */
DECKP.addEventListener("dragover",e=>{if(document.body.classList.contains("dragging-card")){e.preventDefault();DECKP.classList.add("over")}});
DECKP.addEventListener("dragleave",()=>DECKP.classList.remove("over"));
DECKP.addEventListener("drop",e=>{DECKP.classList.remove("over");const f=e.dataTransfer.getData("text/plain");
  if(f&&nbCard(f)){e.preventDefault();addCard(f)}});

/* the deck-name menu: switch decks, start a new one */
nbMenu($("nbDName"),$("nbDecksMenu"),()=>{
  const names=Object.keys(DECKS.list).filter(n=>n!==DRAFT||DECKS.cur===DRAFT||Object.keys(DECKS.list[n].cards||{}).length);
  $("nbDecksMenu").innerHTML=`<div class="nbmlbl">Your decks</div>`+names.map(n=>{
    const t=Object.values(DECKS.list[n].cards||{}).reduce((a,b)=>a+b,0);
    return `<button type="button" role="menuitemradio" aria-checked="${n===DECKS.cur}" data-deck="${esc(n)}">
      ${n===DECKS.cur?ic("check"):`<span class="nbi"></span>`}<span class="nbdmn">${esc(n===DRAFT?"New deck (not saved)":n)}</span><small>${t}</small></button>`}).join("")
    +`<div class="nbsep"></div><button type="button" role="menuitem" data-deck="__new">${ic("plus")}New deck</button>
      <button type="button" role="menuitem" data-deck="__all">${ic("deck")}All my decks</button>`;
});
$("nbDecksMenu").addEventListener("click",async e=>{
  const b=e.target.closest("[data-deck]");if(!b)return;
  const n=b.dataset.deck;
  if(n==="__all"){showTab("tDecks");return}
  if(n==="__new"){
    const nm=await namePrompt("New deck","What do you want to call it?","Deck "+Object.keys(DECKS.list).length);
    if(nm===null)return;const v=String(nm).trim();if(!v)return;
    if(DECKS.list[v]){toast("You already have a deck called that");return}
    DECKS.list[v]={fmt:deck().fmt,coco:null,cards:{}};DECKS.cur=v;stampEdited(v);saveDecks();award("named");render();return}
  DECKS.cur=n;saveDecks();S.limit=150;render();
});
/* the ⋯ menu: everything else you might do to a deck */
nbMenu($("nbDMenuBtn"),$("nbDMenu"),()=>{
  $("nbDMenu").innerHTML=`
    <button type="button" data-dm="ren"${DECKS.cur===DRAFT?" disabled":""}>${ic("book")}Rename</button>
    <button type="button" data-dm="dup">${ic("cards")}Duplicate</button>
    <button type="button" data-dm="paste">${ic("download")}Paste a deck list</button>
    <div class="nbsep"></div>
    <button type="button" data-dm="clear"${dtotal()?"":" disabled"}>${ic("close")}Clear all cards</button>
    <button type="button" data-dm="del" class="bad">${ic("trash")}Delete this deck</button>`;
});
$("nbDMenu").addEventListener("click",async e=>{
  const b=e.target.closest("[data-dm]");if(!b)return;
  const k=b.dataset.dm,d=deck(),names=Object.keys(DECKS.list);
  if(k==="dup")duplicateDeck(DECKS.cur);
  if(k==="ren")renameDeck(DECKS.cur);
  if(k==="paste")importDeckPrompt();
  if(k==="clear"){const ok=await confirmBox("Clear this deck?","Every card comes out. You can undo this.","Clear it",true);
    if(ok){mark("clearing the deck");d.cards={};markDirty(true);render()}}
  if(k==="del"){if(names.length<2){toast("Keep at least one deck");return}
    const ok=await confirmBox("Delete this deck?",`"${DECKS.cur}" will be deleted. You can undo this straight away.`,"Delete",true);
    if(ok){mark('deleting "'+DECKS.cur+'"');delete DECKS.list[DECKS.cur];DECKS.cur=Object.keys(DECKS.list)[0];saveDecks();render()}}
});
$("nbBuy").onclick=()=>{
  const rows=COLLON?borrowRows().map(x=>({c:x.c,q:x.need})):dlist();
  tcgOpen(rows,COLLON?"you already own this whole deck":"this deck is empty")};
$("nbPullB").onclick=nbPull;
$("nbShareB").onclick=nbShare;

/* the pull sheet: the classic one, on the Decks page, for this deck */
function nbPull(){
  if(!dtotal()){toast("Add some cards first");return}
  nbCloseAll();showTab("tDecks");
  setTimeout(()=>{const pb=NBQ("#deckspage .pullbar");if(pb)pb.scrollIntoView({behavior:"smooth",block:"start"})},80);
}

/* share: one place for every way a deck leaves the site */
function nbDeckURL(){
  const h=deckHash(DECKS.cur);if(!h)return "";
  const base=(location.origin&&location.origin!=="null")?location.origin+location.pathname:location.href.split("#")[0];
  return base+"#"+h;
}
function nbShare(){
  const url=nbDeckURL();
  if(!url){toast("Add some cards first");return}
  const d=deck(),inks=[...new Set(dlist().flatMap(x=>x.c.co))];
  const m=$("modal");m.className="modal nbsharem";
  m.innerHTML=`<button class="mx" id="mx" aria-label="Close">✕</button>
    <h2>Share “${esc(nbDeckName())}”</h2>
    <p class="nblede">${dtotal()} cards · ${esc(inks.join(" / ")||"no inks")} · ${esc(FMT[d.fmt].l)}. Anyone who opens the link gets their own copy — no sign-in needed.</p>
    <div class="nbsharegrid">
      <button type="button" class="nbshr go" data-shr="link">${ic("link")}<b>Copy link</b><small>Paste it anywhere</small></button>
      ${navigator.share?`<button type="button" class="nbshr" data-shr="native">${ic("share")}<b>Share…</b><small>Messages, Discord, anything</small></button>`:""}
      <button type="button" class="nbshr" data-shr="text">${ic("list")}<b>Copy as a list</b><small>“4 Elsa - Snow Queen” lines</small></button>
      <button type="button" class="nbshr" data-shr="image">${ic("image")}<b>Save as an image</b><small>For socials and group chats</small></button>
    </div>
    <div class="nbqrrow"><div class="nbqr" id="nbQR" aria-label="QR code for this deck"></div>
      <p>${ic("phone")}<b>Open it on your phone</b>Point your phone's camera at the code.</p></div>`;
  $("mbg").classList.add("on");
  $("mx").onclick=()=>$("mbg").classList.remove("on");
  paintQR("nbQR",url);
  m.querySelector(".nbsharegrid").onclick=e=>{
    const b=e.target.closest("[data-shr]");if(!b)return;const k=b.dataset.shr;
    if(k==="link"){nbTrack("deck_shared",{how:"link"});navigator.clipboard.writeText(url).then(()=>toast("Link copied — send it to a friend"),()=>toast("Copy failed"))}
    if(k==="native"){nbTrack("deck_shared",{how:"native"});navigator.share({title:nbDeckName(),text:nbDeckName()+" — a Lorcana deck",url}).catch(()=>{})}
    if(k==="text")navigator.clipboard.writeText(deckText()).then(()=>toast("List copied"),()=>toast("Copy failed"));
    if(k==="image")nbDeckImage();
  };
}
/* A square picture of the deck: every card once, its count in the bottom
   corner (never over the cost, which sits top-left on a Lorcana card). */
function nbDeckImage(){
  const rows=nbGroupRows(dlist(),"type").flatMap(([,r])=>r);
  if(!rows.length)return;
  const W=1080,H=1080,PAD=24,HEAD=112,GAP=12,AR=940/674;
  let best=null;
  for(let cols=3;cols<=10;cols++){
    const cw=Math.floor((W-PAD*2-(cols-1)*GAP)/cols),ch=Math.round(cw*AR),rn=Math.ceil(rows.length/cols);
    if(HEAD+rn*ch+(rn-1)*GAP+PAD<=H){best={cols,cw,ch};break}
  }
  if(!best){const cols=10,rn=Math.ceil(rows.length/cols);const ch=Math.floor((H-HEAD-PAD-(rn-1)*GAP)/rn);best={cols,cw:Math.round(ch/AR),ch}}
  const {cols,cw,ch}=best;
  const offX=Math.floor((W-(cols*cw+(cols-1)*GAP))/2);
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;
  const x=cv.getContext("2d");
  x.fillStyle="#6578a8";x.fillRect(0,0,W,H);
  x.fillStyle="#202638";x.fillRect(0,0,W,HEAD-18);
  x.fillStyle="#ffd400";x.font="900 42px Arial";x.fillText(nbDeckName().slice(0,34),PAD,58);
  const inks=[...new Set(rows.flatMap(r=>r.c.co))];
  x.fillStyle="#dce7f5";x.font="400 22px Arial";
  x.fillText(`${dtotal()} cards · ${inks.join(" / ")} · ${FMT[deck().fmt].l}`,PAD,86);
  x.textAlign="right";x.fillText("readysetink.com",W-PAD,86);x.textAlign="left";
  let done=0;
  const finish=()=>{if(++done<rows.length)return;
    try{cv.toBlob(bl=>{if(!bl){toast("Couldn't build the image");return}
      const u=URL.createObjectURL(bl),a=document.createElement("a");
      a.href=u;a.download=(nbDeckName().replace(/[^\w -]+/g,"").trim()||"deck")+".png";a.click();
      setTimeout(()=>URL.revokeObjectURL(u),4000);toast("Image saved")})}
    catch(e){toast("The card art wouldn't allow an image export")}};
  rows.forEach((r,i)=>{
    const cx=offX+(i%cols)*(cw+GAP),cy=HEAD+Math.floor(i/cols)*(ch+GAP);
    const draw=img=>{try{
      if(img)x.drawImage(img,cx,cy,cw,ch);
      else{x.fillStyle="#dce7f5";x.fillRect(cx,cy,cw,ch);x.fillStyle="#202638";x.font="700 16px Arial";x.fillText(r.c.n.slice(0,14),cx+8,cy+30)}
      const t=String(r.q)+"×",bw=Math.max(44,t.length*18+16),bh=38;
      x.fillStyle="#202638";x.fillRect(cx+cw-bw,cy+ch-bh,bw,bh);
      x.fillStyle="#ffd400";x.font="900 26px Arial";x.textAlign="center";x.fillText(t,cx+cw-bw/2,cy+ch-10);x.textAlign="left";
    }catch(e){}finish()};
    const src=cImg(r.c);if(!src){draw(null);return}
    const im=new Image();im.crossOrigin="anonymous";im.onload=()=>draw(im);im.onerror=()=>draw(null);im.src=src;
  });
}

/* ===================== 7 · phone: start panel, peek bar, deck sheet ===================== */
/* On a phone the builder opens on the ways to start. It stays until you
   search, filter or scroll into the cards — it never disappears under your
   finger because you added one. */
let nbStartGone=false;
function nbStartSeen(){if(!nbStartGone&&nbCompact()){nbStartGone=true;nbPaintStart()}}
window.addEventListener("scroll",()=>{if(scrollY>260)nbStartSeen()},{passive:true});
function nbPaintStart(){
  const w=!nbWorkDone&&NB_WORK_AT_BOOT;
  const phoneStart=nbCompact()&&TAB==="tDeck"&&!nbStartGone&&DECKS.cur===DRAFT;
  if(!w&&!phoneStart){START.hidden=true;START.innerHTML="";return}
  let h="";
  if(w){
    const ago=Math.max(1,Math.round((Date.now()-w.at)/60000));
    const agoTxt=ago<60?ago+" min ago":ago<1440?Math.round(ago/60)+" hr ago":Math.round(ago/1440)+" days ago";
    const wn=Object.values(w.cards).reduce((a,b)=>a+b,0);
    h+=`<div class="nbcont"><div><b>Continue where you left off?</b>
      <span>${esc(w.name===DRAFT?"Your new deck":w.name)} · ${nbCountTxt(wn)} · ${agoTxt} · not saved</span></div>
      <button type="button" class="nbbtn go" id="nbContY">Continue</button>
      <button type="button" class="nbbtn" id="nbContN">Discard</button></div>`;
  }
  if(phoneStart)h+=`<div class="nbstarth"><b>Start a deck</b><button type="button" class="nblink" id="nbStartX">Just browse cards</button></div>`+nbStartHTML();
  if(START.innerHTML!==h)START.innerHTML=h;
  START.hidden=false;
  const y=$("nbContY"),n=$("nbContN"),x=$("nbStartX");
  if(y)y.onclick=nbRestoreWork;
  if(n)n.onclick=()=>{nbWorkDone=true;nbLS.del(NB_WK);nbPaintStart()};
  if(x)x.onclick=()=>{nbStartGone=true;nbPaintStart()};
}
function nbPaintPeek(L,tot,min,ic2){
  $("nbPeekN").textContent=min?`${tot} / ${min}`:`${tot}`;
  const inks=Object.keys(ic2).sort();
  $("nbPeekI").innerHTML=tot?inks.map(i=>nbDot(i)+esc(i)).join(" "):"Your deck is empty";
  const cv=[0,0,0,0,0,0,0,0];L.forEach(({c,q})=>{cv[Math.min(7,c.c)]+=q});
  const mx=Math.max(...cv,1);
  $("nbPeekC").innerHTML=cv.slice(1).map(v=>`<i style="height:${Math.max(2,Math.round(v/mx*100))}%"></i>`).join("");
  $("nbPeek").classList.toggle("done",!!min&&tot>=min);
}
$("nbPeek").onclick=()=>{nbCloseAll();DECKP.classList.add("open");SCRIM.hidden=false;nbOpenPanel="nbDeck"};
$("nbSheetGrab").onclick=()=>nbCloseAll();
(()=>{
  let y0=null;
  $("nbPeek").addEventListener("touchstart",e=>{y0=e.touches[0].clientY},{passive:true});
  $("nbPeek").addEventListener("touchend",e=>{if(y0!=null&&y0-e.changedTouches[0].clientY>30)$("nbPeek").click();y0=null});
  let y1=null;
  const top=DECKP.querySelector(".nbdh");
  top.addEventListener("touchstart",e=>{y1=e.touches[0].clientY},{passive:true});
  top.addEventListener("touchend",e=>{if(y1!=null&&e.changedTouches[0].clientY-y1>60&&DECKP.classList.contains("open"))nbCloseAll();y1=null});
})();
/* keep the page's bottom padding equal to the phone dock, and sticky bars under the header */
if("ResizeObserver" in window){
  new ResizeObserver(()=>{document.documentElement.style.setProperty("--nbhead",HEADER.offsetHeight+"px")}).observe(HEADER);
  new ResizeObserver(()=>{document.documentElement.style.setProperty("--nbdock",(nbCompact()?BAR.offsetHeight:0)+"px")}).observe(BAR);
}

/* ===================== 8 · undo ===================== */
/* Adding a card shows itself in the deck list — no pop-up for that. The
   undo pop-up is for the changes you might regret: taking cards out,
   clearing, deleting. The Undo button in the deck header covers the rest. */
const _mark=mark;
let nbUT=null;
mark=function(label){
  _mark.apply(this,arguments);
  const L=String(label||"");
  setTimeout(()=>{try{
    nbPaintSaveState();
    if(/^adding /.test(L)||/^restoring/.test(L))return;
    $("nbUTxt").textContent=/^removing /.test(L)?"Removed "+L.slice(9):L.charAt(0).toUpperCase()+L.slice(1);
    UTOAST.hidden=false;clearTimeout(nbUT);nbUT=setTimeout(()=>{UTOAST.hidden=true},5000);
  }catch(e){}},0);
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
  try{nbPaintSaveState();if(!v){nbLS.del(NB_WK);nbFlushAwards()}}catch(e){}
};
const NB_WORK_AT_BOOT=(()=>{
  const w=nbLS.get(NB_WK,null);
  if(!w||!w.cards||!Object.keys(w.cards).length)return null;
  const saved=DECKS.list[w.name];
  if(saved&&JSON.stringify(saved.cards||{})===JSON.stringify(w.cards))return null;
  return w;
})();
let nbWorkDone=false;
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

/* ===================== 10 · keyboard ===================== */
window.addEventListener("keydown",e=>{
  const tg=(e.target.tagName||"").toLowerCase();
  const typing=tg==="input"||tg==="textarea"||tg==="select"||e.target.isContentEditable;
  const inBuilder=vS.classList.contains("on")&&TAB==="tDeck";
  if(e.key==="Escape"&&(nbOpenPanel||nbCmp)){nbCmpEnd();nbCloseAll();return}
  /* Enter in the search box adds the top result (laptop). Shift+Enter keeps the
     old behaviour: turn what you typed into a filter pill. */
  if(e.target.id==="q"&&e.key==="Enter"){
    nbRemember($("q").value);
    if(!e.shiftKey&&!nbTouch()&&inBuilder&&ACI<0&&$("q").value.trim()){
      clearTimeout(qT);S.q=$("q").value;
      const top=sortC(filt())[0];
      if(top){e.preventDefault();e.stopImmediatePropagation();addCard(top.f);acClose();render()}
    }
    return;
  }
  if(e.target.id==="q"&&e.key==="ArrowDown"&&!ACLIST.length&&inBuilder){e.preventDefault();$("q").blur();kbFocus(0);return}
  if(typing||e.target.type==="range")return;
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==="s"){e.preventDefault();saveDeckPrompt();return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==="?"){e.preventDefault();nbShortcuts();return}
  if(!inBuilder)return;
  const kbf=(typeof KBI==="number"&&KBI>=0)?(kbTiles()[KBI]||{}).dataset:null;
  const target=nbHov||(kbf&&kbf.f)||null;
  if(/^[0-4]$/.test(e.key)&&target){e.preventDefault();e.stopImmediatePropagation();setCardCount(target,+e.key);return}
  if(e.key==="Backspace"&&nbHov&&!(kbf&&kbf.f)){e.preventDefault();e.stopImmediatePropagation();delCard(nbHov);return}
  if((e.key==="c"||e.key==="C")&&target){e.preventDefault();
    if(nbCmp){if(target!==nbCmp){const a=nbCmp;nbCmpEnd();nbCompare(a,target)}}else nbCmpStart(target);return}
  if(e.key==="h"||e.key==="H"){e.preventDefault();if(!dtotal()){toast("Add some cards first");return}
    if(nbCompact())DECKP.classList.add("open");nbShowTab("tools");
    setTimeout(()=>{try{const dana=$("dana");if(dana)dana.open=true;hand();
      const hb=$("hb");if(hb)hb.scrollIntoView({block:"nearest"})}catch(err){}},30);return}
},true);
function nbShortcuts(){
  const K=[["/","Jump to the search box"],["Enter","In the search box: add the top result"],
    ["Shift + Enter","In the search box: turn what you typed into a filter"],
    ["↓","From the search box: move into the cards"],["← → ↑ ↓","Move between cards"],
    ["Enter","Add the highlighted card"],["1 – 4","Set how many of the card under the mouse"],
    ["0","Take it out of the deck"],["⌫","Remove one"],["Click / right-click","Add one / remove one"],
    ["Shift + click","Add four"],["C","Compare the card under the mouse — then C on a second one"],
    ["H","Draw a sample hand"],["Ctrl/⌘ + S","Save the deck"],
    ["Ctrl/⌘ + Z","Undo (Shift for redo)"],["Esc","Close whatever is open"],["?","This list"]];
  const m=$("modal");m.className="modal nbkeysm";
  m.innerHTML=`<button class="mx" id="mx" aria-label="Close">✕</button><h2>Keyboard shortcuts</h2>
    <dl class="nbkeys">${K.map(([k,v])=>`<dt><kbd>${esc(k)}</kbd></dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
  $("mbg").classList.add("on");$("mx").onclick=()=>$("mbg").classList.remove("on");
}

/* ===================== 11 · the card, opened ===================== */
const _openM=openM;
openM=function(f){
  const r=_openM.apply(this,arguments);
  try{
    PREV.hidden=true;
    const c=nbCard(f),mc=NBQ("#modal .mc");if(!c||!mc)return r;
    const inDecks=Object.entries(DECKS.list).filter(([n,d])=>d.cards&&d.cards[f])
      .map(([n,d])=>`${n===DRAFT?"your new deck":esc(n)} ×${d.cards[f]}`);
    const own=COLLON?ownedByName(c):null;
    const deckable=TAB!=="tSearch";
    const cur=deck().cards[f]||0,max=maxCopies(c);
    const box=nbEl(`<div class="nbshop">
      ${deckable?`<div class="nbshopr"><span>In this deck</span><span class="nbcounts">${Array.from({length:Math.min(Math.max(max,1),4)+1},(_,n)=>
        `<button type="button" class="nbcn${n===cur?" on":""}" data-mn="${n}" aria-label="${n} in this deck">${n}</button>`).join("")}</span></div>`:""}
      <div class="nbshopr"><span>Your decks</span><span>${inDecks.length?inDecks.join(" · "):"Not in any of your decks"}</span></div>
      ${own!=null?`<div class="nbshopr"><span>You own</span><span>${own} cop${own===1?"y":"ies"}</span></div>`:""}
      <button type="button" class="nbbtn" data-mcmp="1">${ic("compare")}Compare with another card</button>
    </div>`);
    mc.prepend(box);
    box.querySelectorAll("[data-mn]").forEach(b=>b.onclick=()=>{setCardCount(f,+b.dataset.mn);
      box.querySelectorAll("[data-mn]").forEach(x=>x.classList.toggle("on",x===b))});
    box.querySelector("[data-mcmp]").onclick=()=>nbCmpStart(f);
  }catch(e){}
  return r;
};

/* ===================== 12 · tour, dust, theme ===================== */
/* No blocking welcome modal. A small card instead, once; the full tour is in More. */
const _tour=startTour;
startTour=function(force){if(force)return _tour.apply(this,arguments);nbHint()};
function nbHint(){
  if(nbLS.get("fs3_nb_hint",false))return;
  const h=nbEl(`<div class="nbhint" role="status"><b>This is the new deck builder.</b>
    <span>${nbTouch()?"Tap a card to add it. Press and hold a card for more.":"Click a card to add it, right-click to take one out. Press <kbd>?</kbd> for shortcuts."}</span>
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
}
const _prefs=applyPrefs;
applyPrefs=function(){_prefs.apply(this,arguments);nbApplyTheme()};
THEMEB.onclick=()=>{nbLS.set(NB_TK,nbDark()?"light":"dark");nbApplyTheme()};
try{NB_MQ.addEventListener("change",()=>{if(!nbLS.get(NB_TK,null))nbApplyTheme()})}catch(e){}

/* ===================== 13 · re-paint hooks ===================== */
const _rd=renderDeck;
renderDeck=function(hostId){
  const r=_rd.apply(this,arguments);
  if(!hostId||hostId==="deck"){try{nbPaintDeck()}catch(e){console.error(e)}}
  return r;
};
const _pdb=paintDeckBar;
paintDeckBar=function(){_pdb.apply(this,arguments);try{nbPaintSaveState()}catch(e){}};
const _pu=paintUndo;
paintUndo=function(){_pu.apply(this,arguments);try{nbPaintSaveState()}catch(e){}};
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
    +(S.inkwell!=="any"?1:0)+[S.st,S.wi,S.lo].filter(r=>r[0]!=null||r[1]!=null).length;
  $("nbFiltersN").textContent=facets?String(facets):"";
  $("nbSpecN").textContent=S.ab.size?String(S.ab.size):"";
  if(nbAnyFilter())nbStartSeen();
  nbPaintStart();
  if(!$("nbRecent").hidden)nbPaintRecent();
}
const _show=showTab;
showTab=function(t){
  _show.apply(this,arguments);
  try{nbOnTab(t)}catch(e){console.error(e)}
};
function nbOnTab(t){
  nbCloseAll();PREV.hidden=true;
  const on={tDeck:"build",tSearch:"cards",tDecks:"decks",tColl:"coll",tOther:"more"}[t];
  const guided=t==="tDeck"&&SUB==="guided";
  NAV.querySelectorAll("[data-go]").forEach(b=>{
    const cur=guided?b.dataset.go==="more":b.dataset.go===on;
    b.classList.toggle("on",cur);b.toggleAttribute("aria-current",cur)});
  nbPaintStart();
}

/* ===================== 14 · offline ===================== */
if("serviceWorker" in navigator&&location.protocol==="https:"){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("/sw.js").catch(()=>{});
    /* save this page for offline use right away, not just from the next visit */
    navigator.serviceWorker.ready.then(r=>{if(r.active)r.active.postMessage({cache:location.href.split("#")[0]})}).catch(()=>{});
  });
}

/* ===================== 15 · plug-in points for later phases ===================== */
/* Phase 3–5 features hook in here rather than into the panels above:
     NBX.addDeckTab({id:"hand",label:"Hand",render:pane=>{…}})
     NBX.addStartOption({id:"finish",icon:"sparkles",label:"Finish my deck",sub:"…",run:()=>{…}})
     NBX.addDrawerSection(html) — extra content under the special searches */
const NBX={
  addDeckTab(t){if(!t||!t.id||NB_DECKTABS.some(x=>x.id===t.id))return;
    NB_DECKTABS.push(t);
    if(!$("nbPane-"+t.id))$("nbDBody").appendChild(nbEl(`<div class="nbpane" id="nbPane-${t.id}" role="tabpanel" hidden></div>`));
    nbPaintTabs()},
  addStartOption(o){if(o&&o.id&&!NB_START.some(x=>x.id===o.id)){NB_START.push(o);nbPaintDeck()}},
  addDrawerSection(html){const s=nbEl(`<section class="nbsec">${html}</section>`);$("nbDrBody").appendChild(s);return s},
  track:nbTrack,icon:ic,
  /* how long one search takes, start to sorted results — the quality bar is 50ms */
  timeSearch(q){const o=S.q;S.q=q;const t=performance.now();const n=sortC(filt()).length;
    const ms=performance.now()-t;S.q=o;return {ms,n}},
};
window.RSI_NB=NBX;

/* ===================== go ===================== */
applyPrefs();
render();
nbOnTab(TAB);
})();
