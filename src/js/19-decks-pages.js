/* ===================== recommended decks =====================
   Hand-authored meta lists out of meta-decks.json: three blocks per set
   (early / mid / Set Champs), one deck per ink pair inside each block. The
   file is written by the add-meta-deck skill and validated at build time --
   card names, ink pair, block id, deck size -- so everything below can trust
   its shape and just draw it. Nothing here writes to the file: the only way
   a visitor interacts with a list is by taking a copy of it into their own
   decks, which leaves the published list untouched. */
const MBLOCKS=(typeof METAD==="object"&&METAD&&METAD.blocks)||[];
const MDECKS=(typeof METAD==="object"&&METAD&&METAD.decks)||[];
let MSET=load("fs3_mset","");
let MOPEN="";
/* Sets that actually have a list, newest first -- SETS is already sorted by
   release date descending, so filtering it keeps that order for free. */
function metaSets(){
  const have=new Set(MDECKS.map(d=>d.set));
  return SETS.filter(([code])=>have.has(code));
}
function metaDeckById(id){return MDECKS.find(d=>d.id===id)}
/* A published list resolved against the real card data. Unknown names are
   dropped rather than rendered as a blank tile -- the build already shouts
   about them, and by the time it reaches a visitor the honest thing is to
   show the cards that do exist. */
function metaRows(d){
  return Object.entries(d.cards||{})
    .map(([f,q])=>({c:CARDS.find(x=>x.f===f),q,f}))
    .filter(x=>x.c)
    .sort((a,b)=>String((a.c.co||[])[0]||"").localeCompare(String((b.c.co||[])[0]||""))
      ||a.c.c-b.c.c||a.c.f.localeCompare(b.c.f));
}
const metaTotal=d=>Object.values(d.cards||{}).reduce((a,b)=>a+b,0);
const metaInks=d=>(d.inks||[]).map(i=>
  `<i style="background:${HEX[i]||"#666"}" title="${esc(i)}"></i>`).join("");
const mList=(items,cls)=>!items||!items.length?"":
  `<ul class="${cls}">${items.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;

function metaTile(d){
  const tot=metaTotal(d),open=MOPEN===d.id;
  return `<article class="mtile${open?" on":""}">
    <div class="minks">${metaInks(d)}</div>
    <h3>${esc(d.name||(d.inks||[]).join("/"))}</h3>
    <p class="march">${esc(d.archetype||"")}</p>
    <div class="mmeta">${tot} cards${d.credit?` · list by ${esc(d.credit)}`:""}${
      d.updated?` · updated ${esc(d.updated)}`:""}</div>
    <div class="mbtns">
      <button class="btn" data-mopen="${esc(d.id)}">${open?"Hide the guide":"Read the guide"}</button>
      <button class="btn go" data-mcopy="${esc(d.id)}">Copy &amp; edit</button>
    </div>
  </article>`;
}

function metaDetail(d){
  const rows=metaRows(d),tot=rows.reduce((n,r)=>n+r.q,0);
  return `<div class="mdet" id="mdet">
    <div class="mdh">
      <div class="minks">${metaInks(d)}</div>
      <h3>${esc(d.name||"")}</h3>
      <button class="btn" data-mclose>Close</button>
    </div>

    <h4 class="msec">Why it's built this way</h4>
    ${d.why?`<p class="mp">${esc(d.why)}</p>`:""}
    ${d.lines&&d.lines.length?`<h5 class="msub">Lines to look for</h5>${mList(d.lines,"mul")}`:""}
    ${d.against&&d.against.length?`<h5 class="msub">What it struggles against</h5>${mList(d.against,"mul bad")}`:""}

    <h4 class="msec">How to play it</h4>
    ${d.mulligan?`<h5 class="msub">Mulligan</h5><p class="mp">${esc(d.mulligan)}</p>`:""}
    ${d.priorities&&d.priorities.length?`<h5 class="msub">What to prioritise</h5>${mList(d.priorities,"mul")}`:""}
    <div class="msw">
      <div><h5 class="msub">Strengths</h5>${mList(d.strengths,"mul good")}</div>
      <div><h5 class="msub">Weaknesses</h5>${mList(d.weaknesses,"mul bad")}</div>
    </div>

    <h4 class="msec">The list · ${tot} cards</h4>
    <div class="mgal">${rows.map(({c,q})=>`
      <figure class="mgc" data-mgo="${esc(c.f)}" title="${esc(c.f)}">
        ${c.img?`<img src="${esc(String(c.img))}" alt="${esc(c.f)}" loading="lazy">`
               :`<div class="dgph">${esc(c.f)}</div>`}
        <span class="dgq">${q}</span>
      </figure>`).join("")}</div>
    <div class="mbtns wide">
      <button class="btn go" data-mcopy="${esc(d.id)}">Copy &amp; edit this deck</button>
      <button class="btn" data-mtext="${esc(d.id)}">Copy the deck list</button>
    </div>
  </div>`;
}

function renderMetaPage(){
  const sets=metaSets();
  if(!MSET||!sets.some(([c])=>c===MSET))MSET=(sets[0]||[""])[0];
  const forSet=MDECKS.filter(d=>d.set===MSET);
  const open=MOPEN?metaDeckById(MOPEN):null;
  const body=!sets.length
    ? `<div class="empty" style="padding:18px">No recommended lists published yet.
        They go up set by set — check back once the new set has been played a while.</div>`
    : MBLOCKS.map(b=>{
        const decks=forSet.filter(d=>d.block===b.id)
          .sort((x,y)=>(x.inks||[]).join("/").localeCompare((y.inks||[]).join("/")));
        return `<section class="mblock">
          <h3 class="sec2">${esc(b.label||b.id)}</h3>
          ${b.blurb?`<p class="mblurb">${esc(b.blurb)}</p>`:""}
          ${decks.length
            ? `<div class="tiles mtiles">${decks.map(metaTile).join("")}</div>
               <p class="mcount">${decks.length} ink pair${decks.length===1?"":"s"} covered so far.</p>
               ${open&&open.block===b.id&&open.set===MSET?metaDetail(open):""}`
            : `<p class="mnone">Nothing published for this part of the set yet.</p>`}
        </section>`}).join("");
  $("metapage").innerHTML=`<div class="page">
    <h1><span class="gi">🏆</span>Recommended decks</h1>
    <p class="lede">The decks worth playing right now, one per ink pair, split by where
      the set is at — the first weeks, the middle of the format, and what to sleeve for
      a Set Championship. Every list comes with why it is built the way it is, the lines
      to look for, and what it does not want to sit across from. Take a copy of any of
      them into your own decks and change whatever you like.</p>
    ${sets.length>1?`<div class="msetbar">${sets.map(([code,m])=>
      `<button class="btn${code===MSET?" go":""}" data-mset="${esc(code)}">${esc(m.n)}</button>`).join("")}</div>`
      :sets.length?`<p class="msetone">${esc(sets[0][1].n)}</p>`:""}
    ${body}
  </div>`;
  const pg=$("metapage");
  pg.querySelectorAll("[data-mset]").forEach(b=>b.onclick=()=>{
    MSET=b.dataset.mset;save("fs3_mset",MSET);MOPEN="";renderMetaPage()});
  pg.querySelectorAll("[data-mopen]").forEach(b=>b.onclick=()=>{
    MOPEN=MOPEN===b.dataset.mopen?"":b.dataset.mopen;
    renderMetaPage();
    /* Opening a guide from a tile halfway down a long page leaves the panel
       below the fold, which reads as "the button did nothing". */
    if(MOPEN){const d=$("mdet");if(d)d.scrollIntoView({behavior:"smooth",block:"start"})}});
  {const x=pg.querySelector("[data-mclose]");
   if(x)x.onclick=()=>{MOPEN="";renderMetaPage()}}
  pg.querySelectorAll("[data-mcopy]").forEach(b=>b.onclick=()=>metaCopyDeck(b.dataset.mcopy));
  pg.querySelectorAll("[data-mtext]").forEach(b=>b.onclick=()=>{
    const d=metaDeckById(b.dataset.mtext);if(!d)return;
    navigator.clipboard.writeText(metaRows(d).map(({c,q})=>`${q} ${c.f}`).join("\n"))
      .then(()=>toast("Deck list copied"),()=>toast("Copy failed"))});
  pg.querySelectorAll("[data-mgo]").forEach(el=>el.onclick=()=>openM(el.dataset.mgo));
}

/* Takes a copy into their decks and hands them the deck builder. The
   published list is data baked into the page -- there is nothing here that
   could write back to it -- so "edit" always means editing your own copy. */
async function metaCopyDeck(id){
  const d=metaDeckById(id);if(!d)return;
  const rows=metaRows(d),tot=rows.reduce((n,r)=>n+r.q,0);
  if(!tot){toast("That list has no cards this site knows about");return}
  let base=d.name||"Recommended deck",n=base,i=2;
  while(DECKS.list[n])n=base+" "+(i++);
  const ok=await confirmBox("Copy this deck",
    `Adds “${n}” to your decks — all ${tot} cards, yours to change. `
    +"The published list stays exactly as it is.","Copy it");
  if(!ok)return;
  mark("copying a recommended deck");
  const cards={};rows.forEach(({f,q})=>{cards[f]=q});
  DECKS.list[n]={fmt:"core",coco:null,cards};
  DECKS.cur=n;stampEdited(n);saveDecks();markDirty(false);
  if(Object.keys(DECKS.list).length>=3)award("deck2");
  render();paintDeckBar();
  showTab("tDeck");
  toast(`Copied to “${n}” — edit away`);
}

/* ===================== decks page ===================== */
/* ---- deck folders: which set-era a deck was made in ----
   A deck's folder is fixed by DECKS.list[n].created and never moves, even if
   the deck is edited years later — "made during Attack of the Vine" is a
   historical fact about the deck, not something that should drift every time
   you tweak it (that's what .ts / "last edited" is for).

   Two set entries carry a placeholder 1970-01-01 date (announced sets with
   no release date yet) — excluded here, or every deck on the site would sort
   as older than The First Chapter. */
function setEras(){
  return SETS.filter(([,m])=>m.d&&m.d>"2000-01-01").sort((a,b)=>a[1].d.localeCompare(b[1].d));
}
function dayBefore(iso){
  const dt=new Date(iso+"T00:00:00Z");dt.setUTCDate(dt.getUTCDate()-1);
  return dt.toISOString().slice(0,10);
}
/* Windows run from a set's release to the day before the NEXT set's release
   — "the next set hobby store release," per Ben, which here means the next
   dated entry in the sequence (Quest side-sets share their date with the
   numbered set they launched alongside, so they never open a window of their
   own; they just land in whichever window that date already belongs to). */
function eraFor(ts){
  if(!ts)return null;
  const eras=setEras();if(!eras.length)return null;
  const day=new Date(ts).toISOString().slice(0,10);
  for(let i=eras.length-1;i>=0;i--)
    if(day>=eras[i][1].d)return{code:eras[i][0],name:eras[i][1].n,start:eras[i][1].d,
      end:eras[i+1]?dayBefore(eras[i+1][1].d):null};
  // older than the earliest known set (shouldn't happen) — bucket into it anyway
  return{code:eras[0][0],name:eras[0][1].n,start:eras[0][1].d,
    end:eras[1]?dayBefore(eras[1][1].d):null};
}
const eraLabel=e=>`${e.start.replace(/-/g,"/")}–${e.end?e.end.replace(/-/g,"/"):"present"}`;
function groupDecksByEra(){
  const groups=new Map();
  Object.keys(DECKS.list).forEach(n=>{
    const dk=DECKS.list[n],e=eraFor(dk.created||dk.ts);
    const key=e?e.code:"undated";
    if(!groups.has(key))groups.set(key,{name:e?e.name:"Before folders existed",
      label:e?eraLabel(e):"decks saved before this page tracked dates",
      decks:[],sortKey:e?e.start:"9999"});
    groups.get(key).decks.push(n);
  });
  // "Undated" (sortKey "9999") sorts to the very top, ahead of even the
  // current set — pre-existing decks are presumably still in active use,
  // where an unreleased-set placeholder never could be.
  return[...groups.values()].sort((a,b)=>b.sortKey.localeCompare(a.sortKey));
}
function deckCardHTML(n){
  const dk=DECKS.list[n],L=Object.entries(dk.cards).map(([f,q])=>({c:CARDS.find(x=>x.f===f),q}))
    .filter(x=>x.c);
  const tot=L.reduce((a,x)=>a+x.q,0),inks=new Set();
  L.forEach(({c})=>c.co.forEach(i=>inks.add(i)));
  const cur=n===DECKS.cur;
  return `<button class="dkcard${cur?" on":""}" data-dk="${esc(n)}"${
      cur?' aria-current="true"':""}>
    <h3><span class="dkname" data-ren="${esc(n)}" role="button" tabindex="0"
      title="Click to rename">${esc(n)}</span>${titleChip()}${
      cur?`<span class="dkcur">Editing</span>`:""}</h3>
    <div class="dm">${tot} cards · ${esc(FMT[dk.fmt].l)}${tot<FMT[dk.fmt].min?` · ${FMT[dk.fmt].min-tot} short`:" · legal size"}</div>
    <div class="inks">${[...inks].map(i=>`<i style="background:${HEX[i]||"#666"}" title="${esc(i)}"></i>`).join("")}</div>
  </button>`;
}
function renderDecksPage(){
  const eraGroups=groupDecksByEra();
  /* Only the first (newest) folder's cards are actually built right now.
     Older folders are real work — CARDS.find() and an ink tally per deck —
     that nobody asked for yet if the folder is still collapsed, so each one
     gets a single "eraLazy" placeholder div and only fills itself in the
     first time it's opened (wired below). "Deep storage" isn't just visual:
     until you click it open, its decks are never even looked up. */
  const folders=eraGroups.map((g,i)=>{
    const open=i===0;
    return `<details class="erafold"${open?" open":""} data-era="${esc(g.name)}">
      <summary><span class="erafn">${esc(g.name)}</span>
        <span class="erafd">${esc(g.label)}</span>
        <span class="erafc">${g.decks.length} deck${g.decks.length===1?"":"s"}</span></summary>
      <div class="dkgrid eraLazy" data-decks="${esc(g.decks.join(""))}">${
        open?g.decks.map(deckCardHTML).join(""):""}</div>
    </details>`}).join("");
  $("deckspage").innerHTML=`<div class="page">
    <h1><span class="gi">🗂️</span>Decks</h1>
    <p class="lede">Every deck you've saved. Pick one to make a pull list — the running order
      you'd actually walk your binder in. Grouped by the set that was current when you made
      each one.</p>
    <div class="dkbar">
      <button class="btn go" id="dpImport">Paste a deck list</button>
      <button class="btn" id="dpDup">⧉ Duplicate it</button>
    </div>
    <div class="erafolds">${folders}</div>
    ${deckGallery()}
    <!-- Suggested swaps is shelved (Ben, 2026-09-07), same as "What I'd
         change": the feature stays in the file and nothing about it is on
         screen. Call renderSwapBox() here again to bring it back. -->
    <!-- Was ten controls in a single wrapping row -- sort, two view toggles,
         two collection buttons, copy, proxy, print, two buy buttons -- which
         read as a wall before you'd even looked at the list itself. Print is
         the one thing you reach for on sight (it's the reason this sheet
         exists), so it stays a button; everything else is a choice about HOW
         the list looks or what to do with it once, so it lives behind one
         menu, same ⋯ pattern as the deck panel's own options. -->
    <div class="pullbar">
      <b style="font-size:13px;background:var(--canvas-soft);padding:3px 8px;border-radius:2px">Pull list</b>
      <button class="btn go" id="pullPrint">Print</button>
      <div class="dmwrap">
        <button class="dmbtn" id="pullMore" aria-haspopup="true" aria-expanded="false"
          title="Pull list options" style="width:auto;padding:0 10px">⋯ Options</button>
        <div class="dmpanel wide" id="pullMorePanel" role="menu" hidden>
          <div class="dmlbl">Sort by</div>
          <div class="dsortrow" style="margin:0 4px 6px">
            <select id="pullSort">${PULLSORTS.map(([v,l])=>
              `<option value="${v}"${PULLSORT===v?" selected":""}>${esc(l)}</option>`).join("")}</select>
          </div>
          <button class="dmi" id="pullView" role="menuitem"><i>${PULLVIEW==="images"?"☰":"🖼️"}</i>${PULLVIEW==="images"?"Switch to list view":"Switch to image view"}</button>
          <button class="dmi" id="pullCompact" role="menuitem"><i>🗜️</i>${PULLCOMPACT?"Un-fit from 1 page":"Fit to 1 page"}</button>
          <button class="dmi" id="pullCopy" role="menuitem"><i>📋</i>Copy as text</button>
          <button class="dmi" id="pullProxy" role="menuitem" title="Card-sized paper stand-ins for the cards you haven't bought yet"><i>✂️</i>Proxy slips</button>
          <div class="dmsep"></div>
          <button class="dmi collonly" id="pullToColl" role="menuitem"><i>📦</i>Add this deck to my collection</button>
          <button class="dmi bad collonly" id="pullOffColl" role="menuitem"><i>📦</i>Remove this deck from my collection</button>
          <div class="dmsep"></div>
          <!-- No API key involved: TCGplayer's mass entry page takes the list in
               the URL, so these two work today and will keep working if a price
               feed never appears. -->
          <button class="dmi" id="buyDeck" role="menuitem"><i>🛒</i>Buy this deck</button>
          <button class="dmi collonly" id="buyMissing" role="menuitem"><i>🛒</i>Buy the cards I don't have</button>
        </div>
      </div>
    </div>
    ${renderPull()}
    <div id="proxyBox"></div>
    <div id="regBox"></div>
    <!-- The borrow list sits BELOW the pull sheet. It used to sit above it,
         which put "cards you haven't got" between you and the list you came
         to this page for. It reads better as a footnote to the pull sheet
         anyway: here is everything, and here is the part you'll need help
         with. -->
    <div id="borrowBox" class="collonly"></div>
  </div>`;
  wireGallery();
  /* Fills a folder's grid the first time it's opened, from the names stashed
     on data-decks rather than re-deriving the group — then wires just those
     new cards' two handlers (pick / rename), the same two the eager fill
     below wires for everything else. Filled once; re-opening after that is
     free, same as any other <details>. */
  const wireDeckCards=root=>{
    root.querySelectorAll("[data-dk]").forEach(b=>b.onclick=()=>{
      DECKS.cur=b.dataset.dk;saveDecks();markDirty(false);render();paintDeckBar()});
    root.querySelectorAll("[data-ren]").forEach(el=>{
      const go=e=>{e.stopPropagation();e.preventDefault();renameDeck(el.dataset.ren)};
      el.onclick=go;
      el.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")go(e)}});
  };
  $("deckspage").querySelectorAll(".erafold").forEach(fold=>{
    fold.addEventListener("toggle",()=>{
      if(!fold.open)return;
      const grid=fold.querySelector(".eraLazy");
      if(!grid||!grid.dataset.decks||grid.childElementCount)return;
      grid.innerHTML=grid.dataset.decks.split("").map(deckCardHTML).join("");
      wireDeckCards(grid);
    });
  });
  {const sb=$("swapbox");if(sb)sb.ontoggle=()=>save("fs3_swapopen",sb.open)}
  $("deckspage").querySelectorAll("[data-swapin]").forEach(b=>b.onclick=()=>{
    const outF=b.dataset.swapout;
    if(outF)delCard(outF);
    addCard(b.dataset.swapin);
    toast(outF?"Swapped":"Added "+b.dataset.swapin);
    renderDecksPage()});
  {const gu=$("deckspage").querySelector("[data-gotoupgrade]");
   if(gu)gu.onclick=e=>{e.preventDefault();OPAGE="upg";save("fs3_opage",OPAGE);showTab("tOther")}}
  {const a=$("dpImport"),b=$("dpLink"),c=$("dpDup");
   if(a)a.onclick=()=>importDeckPrompt();
   if(b)b.onclick=()=>copyDeckLink(DECKS.cur);
   if(c)c.onclick=()=>duplicateDeck(DECKS.cur)}
  $("deckspage").querySelectorAll("[data-ren]").forEach(el=>{
    const go=e=>{e.stopPropagation();e.preventDefault();renameDeck(el.dataset.ren)};
    el.onclick=go;
    el.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")go(e)}});
  $("deckspage").querySelectorAll("[data-dk]").forEach(b=>b.onclick=()=>{
    DECKS.cur=b.dataset.dk;saveDecks();markDirty(false);render();paintDeckBar()});
  const ptc=$("pullToColl");
  if(ptc)ptc.onclick=async()=>{
    const d=dlist();
    if(!d.length){toast("This deck is empty");return}
    const fresh=d.filter(({c})=>ownedByName(c)===0).length;
    if(!fresh){toast("Every card in this deck is already in your collection");return}
    const ok=await confirmBox("Add this deck to my collection",
      `This marks ${fresh} of the ${d.length} cards in this deck as owned, using the ordinary printing from each card's own set. The ${d.length-fresh} you already own are left exactly as they are.`,
      "Add them");
    if(!ok)return;
    const r=deckToCollection();
    toast(`Added ${r.cards} cards · left ${r.skipped} alone`);
    renderBorrow()};
  const poc=$("pullOffColl");
  if(poc)poc.onclick=async()=>{
    const d=dlist();
    if(!d.length){toast("This deck is empty");return}
    const hit=d.filter(({c})=>owned(pkey(c.f,prints(c)[0]))[0]>0).length;
    if(!hit){toast("None of this deck's cards are marked owned");return}
    const ok=await confirmBox("Remove this deck from my collection",
      `This takes this deck's copies back out of your collection for ${hit} card${hit===1?"":"s"} — never below zero, and foils are left alone.`,
      "Remove them",true);
    if(!ok)return;
    const r=deckOffCollection();
    toast(`Removed ${r.cards} cards from ${r.touched} rows`);
    renderBorrow();renderDecksPage()};
  renderBorrow();
  renderRegSheet();
  wirePull();
  $("pullSort").onchange=e=>{PULLSORT=e.target.value;save("fs3_pullsort",PULLSORT);renderDecksPage()};
  $("pullView").onclick=()=>{PULLVIEW=PULLVIEW==="images"?"list":"images";save("fs3_pullview",PULLVIEW);renderDecksPage()};
  $("pullCompact").onclick=()=>{PULLCOMPACT=!PULLCOMPACT;save("fs3_pullcompact",PULLCOMPACT);renderDecksPage()};
  $("pullCopy").onclick=()=>navigator.clipboard.writeText(pullText())
    .then(()=>toast("Pull list copied"),()=>toast("Copy failed"));
  /* The slips are their own printable, not part of the pull sheet — printing
     with the panel open prints slips ONLY, because you are cutting these up
     and you do not want the shopping list stapled to them. */
  {const px=$("pullProxy");
   if(px)px.onclick=()=>{
     const box=$("proxyBox");
     if(box.firstChild){box.innerHTML="";document.body.classList.remove("proxying");return}
     box.innerHTML=renderProxies();document.body.classList.add("proxying");
     const all=$("pxAll");
     if(all)all.onclick=()=>{PROXYALL=true;save("fs3_proxyall",PROXYALL);box.innerHTML=renderProxies();wireProxy()};
     wireProxy();
     box.scrollIntoView({behavior:"smooth",block:"start"});
   };}
  $("pullPrint").onclick=()=>window.print();
  $("buyDeck").onclick=()=>tcgOpen(dlist(),"this deck is empty");
  const bm=$("buyMissing");
  if(bm)bm.onclick=()=>tcgOpen(borrowRows().map(x=>({c:x.c,q:x.need})),
    "you already own every card in this deck");
  if(dtotal())unlockHidden("h_binder");
  /* Same one-open-at-a-time / click-away / Escape pattern as the deck
     panel's own ⋯ and 👁 menus. */
  (()=>{
    const B=$("pullMore"),P=$("pullMorePanel");if(!B||!P)return;
    const shut=()=>{P.hidden=true;B.setAttribute("aria-expanded","false")};
    B.onclick=e=>{e.stopPropagation();const open=P.hidden;shut();
      if(open){P.hidden=false;B.setAttribute("aria-expanded","true")}};
    P.onclick=e=>e.stopPropagation();
    document.addEventListener("click",shut,{once:true});
    document.addEventListener("keydown",function esc(ev){
      if(ev.key==="Escape"){shut();document.removeEventListener("keydown",esc)}});
  })();
}

/* ===================== other ===================== */
/* Every plain visit lands on the deck builder, new or returning — a
   remembered last-tab landing felt random rather than helpful, since which
   tab you'd left open wasn't something you'd usually thought about. Deep
   links (hub-page "Open it" buttons, shared decks) still open on the tab
   they name; see the BOOTHASH handling near the bottom of the file. */
let OPAGE=load("fs3_opage","");
/* Grouped so the Other page reads as three shelves rather than one wall:
   what you'd open now, what's a game, and what's still being written. */
const OTHER=[
 ["","",0,"",1],   // (unused sentinel — groups carry the structure below)
];
/* ===== what's switched off =====================================================
   One list. A page in here keeps working and stays reachable by URL — only its
   tile leaves the Other menu — so turning it back on is deleting one string.
   PATRON gates the patron dust grant, which is off until the money side is
   real, because dust is unenforceable client-side and a patron perk that any
   visitor can mint is worse than no perk. */
const OFF=["start","err","leak","world","cred","upg"];
const PATRON_ON=false;

