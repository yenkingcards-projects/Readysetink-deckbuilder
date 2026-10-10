/* ===================== tabs =====================
   Five tabs. "Deck builder" and "Search for cards" share one view — the only
   difference is whether the deck rail is on screen — because maintaining two
   copies of the search UI would guarantee they drift apart. */
/* Recommended decks used to be a sixth top-level tab. It is a thing you read
   occasionally, not a place you work, so it sits in Other with the rest of the
   reading — the tab bar is for the four things you come here to DO. Its view
   and its renderer are unchanged; only the way in moved. */
const TABS=["tDeck","tSearch","tColl","tDecks","tOther"];
const VIEWS=["vSearch","vGuide","vColl","vDecks","vMeta","vOther","vGuess","vDust","vQuiz","vContrib","vErr","vStart","vUp","vMick","vLeak","vWorld","vAqua","vCred","vPref","vLore","vJudge","vLinks","vAccount"];
/* TAB is read from storage HERE rather than being left at "tDeck" until
   showTab() runs at the bottom of the file. The grid is rendered before that
   line, and tile() and bindGrid() both branch on TAB — so booting straight
   into Search used to build the tiles in deck-builder mode and wire the
   click-to-add handler to every one of them. showTab() then swapped the view
   class without re-rendering, and the handlers survived: one click on any card
   put it in your deck, on the tab that is supposed to be read-only. */
let TAB="tDeck";
let SUB=load("fs3_sub","manual");
function showTab(t){
  /* Search and the deck builder share one grid, so crossing between them
     changes what every tile is allowed to do. Re-render rather than just
     swapping a class, or the handlers from the tab you left stay live on the
     tab you arrived at. */
  const wasBrowse=TAB==="tSearch",nowBrowse=t==="tSearch";
  TAB=t;save("fs3_tab",t);
  if(wasBrowse!==nowBrowse&&typeof render==="function")render();
  TABS.forEach(x=>$(x).classList.toggle("on",x===t));
  const guided=(t==="tDeck"&&SUB==="guided");
  VIEWS.forEach(v=>$(v).classList.remove("on"));
  document.body.classList.toggle("browse",t==="tSearch");
  /* The Cards/Deck mobile switcher only means anything on the Deck builder
     tab -- Search shares the same view but never shows the deck rail, and
     Collection/Decks/Other have no cards-vs-deck toggle at all. It used to
     show on every narrow-screen tab because the CSS only ever excluded
     Search (body.browse), never actually opted IN to Deck builder. */
  document.body.classList.toggle("tdeck",t==="tDeck");
  /* Search for cards is a reference tab with no deck attached to it, so the
     one control here that acts on a deck doesn't belong on it. */
  /* Ben's call: no Ko-fi ask while someone is in the middle of building. The
     affiliate line beside it stays on every tab — that one isn't optional. */
  {const kw=$("kofiwrap");if(kw)kw.hidden=(t==="tDeck");}
  $("subsw").classList.toggle("hide",t!=="tDeck");
  if(t==="tDeck")       $(guided?"vGuide":"vSearch").classList.add("on");
  else if(t==="tSearch")$("vSearch").classList.add("on");
  else if(t==="tColl"){$("vColl").classList.add("on");renderColl()}
  else if(t==="tDecks"){$("vDecks").classList.add("on");renderDecksPage()}
  else if(t==="tOther"){
    /* One table, not a chain of fourteen else-ifs. A chain is how the default
       case (the menu itself) once got swallowed by an unrelated guard clause. */
    if(OPAGE!=="aqua")stopAqua();
    const page=/^quiz:/.test(OPAGE)?"quiz":OPAGE;
    const [view,draw]=OPAGES[page]||["vOther",renderOther];
    if(page==="quiz"){QMODE=OPAGE.slice(5);QZ=null}
    $(view).classList.add("on");draw();
  }
  /* The tracker is a fixed, full-screen takeover, so leaving it has to actually
     take it down — not just hide the view it happens to live in. */
  {const onLore=(t==="tOther"&&OPAGE==="lore");
   document.body.classList.toggle("loreon",onLore);
   if(!onLore&&$("lorepage").firstChild){
     if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
     if(LORE){LORE.locked=false;loreSave()}
     $("lorepage").innerHTML=""}}
  /* The standalone Judge page and the in-game one both render into an
     element with id="jbody" (judgeDraw()/jWire() look it up unscoped) — so
     only one of the two hosts may hold content at a time, or getElementById
     would silently pick whichever one happens to be first in the DOM. */
  {const onJudgePage=(t==="tOther"&&OPAGE==="judge");
   const jp=$("judgepage");if(!onJudgePage&&jp&&jp.firstChild)jp.innerHTML=""}
  $("mManual").classList.toggle("on",SUB==="manual");
  $("mGuided").classList.toggle("on",SUB==="guided");
  if(guided)renderGuide();
  /* Ko-fi and the affiliate note only where they don't compete with the
     actual task — the Other tab (mini games, dust, settings, all of it) —
     not sitting under someone mid deck-build or mid-search. */
  const foot=$("sitefoot");if(foot)foot.hidden=(t!=="tOther");
  window.scrollTo(0,0);
  if(t==="tDeck"||t==="tSearch")jiggleArt();
}
// kept for the guided build's "Go to deck builder →" hand-off
function showSearch(){SUB="manual";save("fs3_sub",SUB);showTab("tDeck")}

/* ===================== wiring ===================== */
function clearAll(){
  S.q="";$("q").value="";S.ab.clear();S.ink.clear();S.dual=false;S.type.clear();S.rar.clear();
  S.kw.clear();S.cls.clear();S.sto.clear();S.tag.clear();S.art.clear();S.terms=[];S.set="";S.inkwell="any";
  S.cost=[null,null];S.st=[null,null];S.wi=[null,null];S.lo=[null,null];
  S.fl=false;$("fb").classList.remove("on");S.limit=150;render();
}
function rollLbl(){$("fbl").textContent=Math.random()<1/12?"Search for the best card":"Flounder"}
$("fb").onclick=()=>{S.fl=!S.fl;$("fb").classList.toggle("on",S.fl);
  if(S.fl){S.q="";$("q").value="";S.ab.clear();S.ink.clear();S.dual=false;S.type.clear();
    S.rar.clear();S.kw.clear();S.cls.clear();S.sto.clear();S.tag.clear();S.terms=[];S.set="";S.inkwell="any";
    S.cost=[null,null];S.st=[null,null];S.wi=[null,null];S.lo=[null,null]}
  else rollLbl();
  S.limit=150;render()};
$("lnk").onclick=copySearchLink;
/* A link that arrives with a search in it wins over saved state, and it opens
   the drawers so you can see WHY you're looking at these cards rather than
   landing on an unexplained list. */
/* Reminder tags: the "not legal", "don't even think about it" and staple
   flags. Some people want a clean grid of art; this turns the lot off. */
let REMIND=load("fs3_remind",true);
function drawRemind(){
  document.body.classList.toggle("noremind",!REMIND);
  const b=$("tgRemind");if(b){b.innerHTML=`Reminder tags <b class="sw">${REMIND?"ON":"OFF"}</b>`;
    b.setAttribute("aria-pressed",REMIND)}
}
$("tgRemind").onclick=()=>{REMIND=!REMIND;save("fs3_remind",REMIND);drawRemind()};
drawRemind();
/* Prices. Two switches, one variable — this one and the row on Settings both
   call setPrices(), so they can never disagree. */
function setPrices(v){
  PRICES=v;save("fs3_prices",v);
  const b=$("tgPrice");if(b)b.textContent="Prices: "+(PRICES?"on":"off");
  render();
  if($("vPref").classList.contains("on"))renderPrefs();}
$("tgPrice").onclick=()=>setPrices(!PRICES);
{const b=$("tgPrice");if(b)b.textContent="Prices: "+(PRICES?"on":"off")}
/* Column count. Auto (the default) is the responsive auto-fill grid, which on a
   narrow phone falls to one enormous card per row — fine for reading one card,
   useless for scanning results. Anything else is a hard column count. */
let GCOLS=load("fs3_gcols",0);
function applyCols(){
  const g=$("grid");if(!g)return;
  g.style.gridTemplateColumns=GCOLS>0?`repeat(${GCOLS},minmax(0,1fr))`:"";
  const s=$("gcols");if(s)s.value=String(GCOLS);}
$("gcols").onchange=e=>{GCOLS=parseInt(e.target.value,10)||0;save("fs3_gcols",GCOLS);applyCols()};
applyCols();
/* Both drawers carry one of these. Closing the drawer first is the point — the
   cards are what you want to look at, and leaving a full-height panel open
   above them just means scrolling back past it. */
document.querySelectorAll("[data-seecards]").forEach(b=>b.onclick=()=>{
  const sp=$("special"),sd=$("side");
  if(sp)sp.open=false;if(sd)sd.open=false;
  const g=$("grid");
  if(g)g.scrollIntoView({behavior:"smooth",block:"start"});});
/* [data-g] only, on both. Expand all used to unfold the Coconut list and What
   it costs too — nineteen Coconuts with a stack of chips under each, plus the
   price block, which is not what anyone means by "show me the searches". Those
   two open only when you open them. */
$("expAll").onclick=()=>{$("groups").querySelectorAll("details.grp[data-g]").forEach(d=>d.open=true);
  GCLOSED=new Set();saveGClosed()};
$("colAll").onclick=()=>{$("groups").querySelectorAll("details.grp[data-g]").forEach(d=>d.open=false);
  GCLOSED=new Set(GROUPS.filter(g=>!g.money).map(g=>g.g));saveGClosed()};
$("special").ontoggle=()=>save("fs3_spec",$("special").open);
/* Open on arrival on a desktop, remembered if you close it. CLOSED on arrival
   on a phone, because there it is not a panel beside the results — it is a
   wall in front of them. Still remembered once you have opened it yourself. */
if(load("fs3_spec",!PHONE()))$("special").open=true;
$("sy").onclick=()=>{const h=$("syh");h.style.display=h.style.display==="none"?"block":"none"};
/* The masthead is a way home. One press in nine hundred and ninety-nine it is
   a way somewhere else instead — opened in a new tab, so a 1-in-999 joke can
   never cost anyone the deck they were halfway through building. */
$("logo").onclick=()=>{
  if(Math.floor(Math.random()*999)===0){
    window.open("https://youtube.com/playlist?list=PLWSrAWLINJw4gROuNr3F7iCJdkZhR1eEi&si=wspH6sAp3-hKRVCq",
      "_blank","noopener");
    return;
  }
  showTab("tDeck");
};
/* ---- search-widening switches ---- */
function drawToggles(){
  $("tgTag").classList.toggle("on",S.tagS);$("tgTag").setAttribute("aria-pressed",S.tagS);
  $("tgSto").classList.toggle("on",S.stoS);$("tgSto").setAttribute("aria-pressed",S.stoS);
  $("tgFlav").classList.toggle("on",S.flS);$("tgFlav").setAttribute("aria-pressed",S.flS);
  /* The headline switch says what it is doing rather than just being lit —
     off, it tells you what you have given up, which is the only honest way to
     offer someone a way to turn off the reason they came. */
  {const sub=$("tgTagSub");
   if(sub)sub.textContent=S.tagS
     ? "Type what you remember seeing, not the card name"
     : "Off — searching names and rules text only";}
}
/* Replay an animation by yanking the class and forcing a reflow — without the
   reflow the browser coalesces remove+add and nothing plays the second time. */
function replay(el,cls,ms){if(!el)return;el.classList.remove(cls);void el.offsetWidth;
  el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),ms)}
/* The wiggle that says "this is the thing" every time you land on Deck
   builder or Search — only while art search is already on, so it reads as
   the site showing off its own feature, not nagging you to turn one on. */
const jiggleArt=()=>{if(S.tagS)replay($("tgTag"),"jig",900)};
$("tgTag").onclick=()=>{S.tagS=!S.tagS;save("fs3_tagS",S.tagS);drawToggles();S.limit=150;render();
  if(S.stoS&&S.tagS)unlockHidden("h_wide")};
$("tgSto").onclick=()=>{S.stoS=!S.stoS;save("fs3_stoS",S.stoS);drawToggles();S.limit=150;render();
  if(S.stoS&&S.tagS)unlockHidden("h_wide")};
$("tgFlav").onclick=()=>{S.flS=!S.flS;save("fs3_flS",S.flS);drawToggles();S.limit=150;render()};
drawToggles();
/* ===================== typing help =====================
   Two of the most-cited complaints about deck builders are that card names
   have to be typed in full, and that one wrong letter returns nothing at all.
   Both are worth fixing here in particular, because this site's whole promise
   is finding a card you only half remember.

   ACSUG is the suggestion list under the box. Ranking is deliberate: a name
   that STARTS with what you typed beats one where a later word starts with it,
   which beats a plain substring. That ordering is what makes the first row
   almost always the one you wanted. */
let ACI=-1, ACLIST=[];
const acNorm=t=>String(t||"").toLowerCase().replace(/[’']/g,"'").trim();
function acRank(name,q){
  const n=acNorm(name);
  if(n.startsWith(q))return 0;
  if(n.split(/[\s\-]+/).some(w=>w.startsWith(q)))return 1;
  return n.includes(q)?2:9}
function acFind(raw){
  const q=acNorm(raw);
  if(q.length<2||/[:"]/.test(raw))return [];   // not while typing a filter token
  const out=[];
  for(const c of CARDS){
    const r=acRank(c.f,q);
    if(r<9)out.push({c,r});
    if(out.length>400)break}
  return out.sort((a,b)=>a.r-b.r||a.c.f.length-b.c.f.length
    ||a.c.f.localeCompare(b.c.f)).slice(0,8).map(x=>x.c)}

/* Edit distance, capped — we only care whether it's within a letter or two, so
   a full matrix on 2,543 names would be wasted work. */
function editDist(a,b,cap){
  if(Math.abs(a.length-b.length)>cap)return cap+1;
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const cur=[i];let best=i;
    for(let j=1;j<=b.length;j++){
      cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      if(cur[j]<best)best=cur[j]}
    if(best>cap)return cap+1;
    prev=cur}
  return prev[b.length]}
/* "Did you mean" — only offered when the search found nothing, because that is
   the only moment it helps rather than second-guesses you. */
function didYouMean(raw){
  const q=acNorm(raw);
  if(q.length<4||q.length>40)return [];
  const cap=q.length<=6?1:2;
  const hits=[];
  for(const c of CARDS){
    const n=acNorm(c.n);                       // the name, not the full title
    const d=editDist(q,n,cap);
    if(d<=cap)hits.push({c,d});
    if(hits.length>30)break}
  return hits.sort((a,b)=>a.d-b.d).slice(0,5).map(x=>x.c)}

function acRender(){
  let box=$("acbox");
  if(!box){box=document.createElement("div");box.id="acbox";box.className="acbox";
    $("sf").parentNode.insertBefore(box,$("sf").nextSibling)}
  if(!ACLIST.length){box.innerHTML="";box.hidden=true;return}
  box.hidden=false;
  box.innerHTML=ACLIST.map((c,i)=>`
    <button class="acrow${i===ACI?" on":""}" data-ac="${esc(c.f)}">
      <span class="acn">${esc(c.n)}${c.v?` <i>${esc(c.v)}</i>`:""}</span>
      <span class="acm">${esc(String((c.co||[]).join("/")||""))} · ${c.c} cost</span>
    </button>`).join("");
  box.querySelectorAll("[data-ac]").forEach(b=>b.onclick=()=>acPick(b.dataset.ac));
}
function acPick(full){
  acClose();
  S.q='name:"'+full.replace(/ - .*$/,"")+'"';
  $("q").value=full;S.limit=150;render();
  const t=[...document.querySelectorAll("#grid .c")].find(x=>x.dataset.f===full);
  if(t)t.scrollIntoView({block:"center"})}
function acClose(){ACLIST=[];ACI=-1;const b=$("acbox");if(b){b.innerHTML="";b.hidden=true}}

let qT;$("q").oninput=e=>{S.q=e.target.value;S.limit=150;
  if(/\brat\b/i.test(S.q))RATSEARCH=true;
  ACLIST=acFind(e.target.value);ACI=-1;acRender();
  clearTimeout(qT);
  qT=setTimeout(()=>{render()},140)};
$("q").onkeydown=e=>{
  /* Backspace / Delete on an empty box removes the last pill — the usual
     chip-input behaviour. Guarded on the box being empty so you can still
     edit what you're typing. */
  if((e.key==="Backspace"||e.key==="Delete")&&!$("q").value){
    const xs=$("sf").querySelectorAll(".pill .x");
    if(xs.length){e.preventDefault();xs[xs.length-1].click()}
    return}
  /* Arrows only steer the suggestion list while it is open, so the grid's own
     arrow navigation is untouched the rest of the time. */
  if(ACLIST.length){
    if(e.key==="ArrowDown"){e.preventDefault();ACI=(ACI+1)%ACLIST.length;acRender();return}
    if(e.key==="ArrowUp"){e.preventDefault();ACI=(ACI-1+ACLIST.length)%ACLIST.length;acRender();return}
    if(e.key==="Escape"){e.preventDefault();acClose();return}
    if(e.key==="Enter"&&ACI>=0){e.preventDefault();acPick(ACLIST[ACI].f);return}}
  if(e.key!=="Enter")return;
  acClose();
  if(tryToken($("q").value)){$("q").value="";S.q="";S.limit=150;render()}};
document.addEventListener("click",e=>{
  if(!e.target.closest||(!e.target.closest("#acbox")&&e.target.id!=="q"))acClose()});
$("sf").onclick=e=>{if(e.target.id!=="q"&&!e.target.classList.contains("x"))$("q").focus()};
$("sort").onchange=e=>{S.sort=e.target.value;renderGrid()};
/* The format used to be a <select> in the masthead, so four places did
   `$("fmt").value=...` to keep it in step. The picker is now rebuilt by
   renderDeck() from the deck itself, which means there is nothing to keep in
   step — but the ink-cap trim still has to happen exactly once, wherever the
   change comes from. That is what this function is for. */
function setFmt(v){
  if(!FMT[v])return;
  const d=deck();if(d.fmt===v)return;
  d.fmt=v;markDirty(true);
  const cap=FMT[v].cap;
  while(S.ink.size>cap)S.ink.delete([...S.ink].pop());
  S.limit=150;render();paintDeckBar()}
TABS.forEach(t=>$(t).onclick=()=>{
  /* Tapping the Other TAB always means "show me the Other menu" — jumping
     straight into whichever sub-page (usually the lore tracker) was open
     last is exactly the confusing behaviour that made the hamburger next to
     it necessary in the first place. The hamburger (or a menu tile) is how
     you jump straight to a specific page now; the tab itself always opens
     the menu. */
  if(t==="tOther"){OPAGE="";save("fs3_opage",OPAGE)}
  showTab(t)
});
/* Its own nav button rather than a fourth thing routed through "Other" — the
   same jump the Lore tracker's Other-menu tile and the hamburger both use. */
$("tLore").onclick=()=>{OPAGE="lore";save("fs3_opage",OPAGE);showTab("tOther")};
/* The hamburger next to the Other tab: every page that tab's own menu grid
   lists, one click away, from anywhere on the site — not just from inside
   the lore tracker's own "Tools" back-out. Built from the same OTHER_GROUPS
   the grid renders from, so the two views can never drift apart. */
function renderOtherMenu(){
  const hidden=p=>OFF.includes(p)
    ||(!GAMESON&&isGamePage(p))
    ||(!DUSTON&&p==="dust");
  $("otherMenu").innerHTML=OTHER_GROUPS.map(gr=>{
    const chips=gr.chips.filter(([,,page])=>page&&!hidden(page));
    if(!chips.length)return"";
    return (gr.g?`<h4>${esc(gr.g)}</h4>`:"")+
      chips.map(([t,,page])=>isPageLink(page)
        ?`<a href="${esc(page)}"${isExternalLink(page)?` target="_blank" rel="noopener"`:""}>${esc(t)}</a>`
        :`<button data-op="${esc(page)}">${esc(t)}</button>`).join("");
  }).join("");
  $("otherMenu").querySelectorAll("[data-op]").forEach(b=>b.onclick=()=>{
    closeOtherMenu();
    OPAGE=b.dataset.op;save("fs3_opage",OPAGE);showTab("tOther")});
}
function closeOtherMenu(){
  $("otherMenu").hidden=true;
  $("tOtherMenu").setAttribute("aria-expanded","false");
}
$("tOtherMenu").onclick=e=>{
  e.stopPropagation();
  const open=$("otherMenu").hidden;
  if(open){
    renderOtherMenu();
    const r=$("tOtherMenu").getBoundingClientRect();
    const menu=$("otherMenu");
    menu.hidden=false;
    // Flip to the left edge if the panel would otherwise run off-screen —
    // matters most on a narrow phone, which is exactly where nav.tabs wraps
    // and the button isn't reliably near the right edge anymore.
    const w=Math.min(300,window.innerWidth-16);
    const left=Math.min(Math.max(8,r.right-w),window.innerWidth-w-8);
    menu.style.left=left+"px";
    menu.style.top=Math.round(r.bottom+4)+"px";
    $("tOtherMenu").setAttribute("aria-expanded","true");
  }else closeOtherMenu();
};
document.addEventListener("click",e=>{
  if(!$("otherMenu").hidden&&!e.target.closest(".otherwrap")&&!e.target.closest("#otherMenu"))closeOtherMenu()});
$("mManual").onclick=()=>{SUB="manual";save("fs3_sub",SUB);showTab("tDeck")};
$("mGuided").onclick=()=>{SUB="guided";save("fs3_sub",SUB);showTab("tDeck")};
/* Three mobile tabs, one active body class at a time (Cards is "neither"
   class, same as it always was — see the .msearch/.mdeck rule in CSS). */
const mtabPick=on=>{document.body.classList.toggle("msearch",on==="msearch");
  document.body.classList.toggle("mdeck",on==="mdeck");
  [["mS","msearch"],["mC","mcards"],["mD","mdeck"]].forEach(([id,tag])=>
    $(id).classList.toggle("on",tag===on))};
$("mS").onclick=()=>mtabPick("msearch");
$("mC").onclick=()=>mtabPick("mcards");
$("mD").onclick=()=>mtabPick("mdeck");

function render(){renderPills();renderChips();renderSide();renderGrid();renderDeck();
  if($("vGuide").classList.contains("on"))renderGuideDeck();
  if($("vDecks").classList.contains("on"))renderDecksPage();
  syncHash()}

