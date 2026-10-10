/* ===================== printings =========================================
   A CARD is a name; a PRINTING is one physical version of it. Decks stay
   name-based, so nothing here touches legality or deck counts — this only
   decides which art you LOOK at. Moves to the user profile once hosted. */
const SETNAME=code=>((DATA.sets||{})[code]||{}).name||("Set "+code);
let PREF=load("fs3_print","base"),PROPEN=load("fs3_propen",false);
function prefPrint(c){
  const ps=c.pr||[];if(!ps.length)return null;
  if(PREF==="enchanted")return ps.find(p=>p.r==="Enchanted")||null;
  if(PREF==="promo")return ps.find(p=>p.pm||/Promo|Special/i.test(p.r||""))||null;
  return null;                       // "base" = the card's own default printing
}
/* The two seams every card image on the page goes through — so switching where
   the artwork is served from is one constant, not a search-and-replace. */
const cImg =c=>{const p=prefPrint(c);return imgURL((p&&p.i)||c.img)};
const cImgL=c=>{const p=prefPrint(c);return imgURL((p&&(p.l||p.i))||c.imgL||c.img)};
// which entry in c.pr is currently on screen, so the picker can highlight it
const prIndex=(c,shown)=>(c.pr||[]).findIndex(p=>(p.l||p.i)===shown||p.i===shown);
/* Note kinds come from build_flounder.py so the site and the notes editor can
   never disagree about a label or a colour. Unknown kinds fall back to Ruling. */
const KIND=k=>KINDS.find(x=>x.k===(k||"ruling"))||KINDS[0];
/* Plain-language summary of Comprehensive Rules 5.6 (Locations) — the bits
   people actually forget mid-game. */
const LOC_NOTE=`<div class="locnote"><b>How locations work</b><ul>
  <li>Lore is gained at the <b>start of your turn</b> (Set step) — you don't quest with a location.</li>
  <li><b>Move Cost</b> is the ink to move one of your characters here.</li>
  <li>Damage on a location <b>persists all game</b>; it's banished once damage reaches its willpower.</li>
  <li>Locations have <b>no strength</b> and deal no damage in a challenge.</li>
  <li>A location's ability can be used <b>the turn you play it</b>.</li>
  <li>If the location leaves play, characters there stay in play — they're just no longer at a location.</li>
</ul><div class="src">Summary of Comprehensive Rules 5.6</div></div>`;
/* Why a card can't go in the current deck — null means it's fine. */
/* Illumineer's Quest cards (sets Q1 / Q2) are campaign-only — they are not legal
   in ANY constructed format, so this check ignores the chosen format entirely. */
const isQuest=c=>/^Q/i.test(String(c.s||""));
/* How many copies the format allows of this card — the Coconut and the item it
   names are the exception that get four in a singleton deck. illegalReason
   flags going over it after the fact; the stepper and the typed quantity box
   use it to not go over it in the first place. */
function maxCopies(c){
  const F=FMT[deck().fmt];
  return coconut4x(c)?4:F.max;
}
/* Set a card to an exact number of copies, which is what someone means when
   they type 4 in the box rather than pressing + four times. Clamped, and it
   marks the undo stack once for the whole change rather than once per copy. */
function setCardCount(f,n){
  const c=CARDS.find(x=>x.f===f);if(!c)return false;
  if(f===BANNED)return false;
  const d=deck(),cur=d.cards[f]||0;
  n=Math.max(0,Math.min(Math.floor(n)||0,maxCopies(c)));
  if(n===cur)return false;
  mark((n>cur?"adding ":"removing ")+c.n);
  if(n)d.cards[f]=n;else delete d.cards[f];
  touchDeck();renderDeck();refreshTiles();
  if(n>cur)award("firstcard");
  return true;
}
function illegalReason(c){
  const d=deck(),F=FMT[d.fmt];
  if(c.f===BANNED)return "banned";
  if(isQuest(c))return "Illumineer's Quest — never tournament legal";
  if(d.fmt==="core"&&!c.core)return "not Core legal";
  const inks=new Set();dlist().forEach(({c:x})=>x.co.forEach(i=>inks.add(i)));
  const co=d.fmt==="coconut"&&d.coco!=null?COCO[d.coco]:null;
  if(co)coInks(co).forEach(i=>inks.add(i));
  if(inks.size>=F.cap&&c.co.length&&!c.co.every(i=>inks.has(i)))
    return "off-ink — deck is "+[...inks].join("/");
  const q=d.cards[c.f]||0;
  const named=coconut4x(c);
  if(q>(named?4:F.max))return "over the "+(named?4:F.max)+"-copy limit";
  return null;
}
/* Every rules problem with the current deck, worst first, as plain sentences.
   The deck panel lists these live while you build; the registration sheet
   prints them in red at the foot of the page so a list you hand to a judge
   says what is wrong with it. One function rather than two, or the sheet and
   the panel would eventually disagree about what "legal" means. */
function deckWarnings(){
  const d=deck(),F=FMT[d.fmt],L=dlist(),tot=dtotal();
  const w=[],inks=new Set();L.forEach(({c})=>c.co.forEach(i=>inks.add(i)));
  if(inks.size>F.cap)w.push(`${inks.size} inks used (${[...inks].join(", ")}) — ${F.l} allows ${F.cap}.`);
  const co=d.fmt==="coconut"&&d.coco!=null?COCO[d.coco]:null;
  const coI=co?coInks(co):[];
  if(co&&tot&&!coI.some(i=>inks.has(i)))
    w.push(`Your Coconut is ${coI.join("/")} — the deck must include ${coI.join(" or ")} cards.`);
  L.forEach(({c,q})=>{
    const named=coconut4x(c),cap=named?4:F.max;
    if(q>cap)w.push(`"${c.f}" ×${q} — max ${cap}${d.fmt==="coconut"&&!named?" (singleton)":""}.`);
    if(d.fmt==="core"&&!c.core)w.push(`"${c.f}" is not Core legal.`)});
  if(tot&&tot<F.min)w.push(`${F.min-tot} more card${F.min-tot===1?"":"s"} to reach ${F.min} — a legal deck needs at least ${F.min}.`);
  return w;
}
/* Singleton has exactly two exceptions: the character your Coconut names, and
   any item that Coconut's own text calls out by name (Nick Wilde → Pawpsicle).
   Both cap at 4, so the offer in the guided build and the legality check here
   can never disagree. */
function coconut4x(c){
  const d=deck();if(d.fmt!=="coconut"||d.coco==null)return false;
  const co=COCO[d.coco];if(!co)return false;
  if(c.n===co.n&&c.v===co.v)return true;
  const ex=COCO_EXTRA[co.n];
  return !!(ex&&c.f===ex.f);
}
// A Shift card needs another character with the same name already in play (rules 8.10.1)
const shiftTargets=c=>CARDS.filter(x=>x.f!==c.f&&x.n===c.n&&x.ty==="Character"&&!hasShift(x)&&legal(x))
  .sort((a,b)=>a.c-b.c);

function tile(c){
  const q=deck().cards[c.f],egg=EGGS[c.f],ban=c.f===BANNED,tags=[];
  if(egg)tags.push(`<span class="${egg.c}">${egg.t}</span>`);
  if(isQuest(c))tags.push(`<span class="quest">Don't even think about adding this card</span>`);
  if(isStar(c.f)&&!ban)tags.push(`<span>★ staple</span>`);
  if(c.tribal.length)tags.push(`<span>▲ ${esc(c.tribal[0])}</span>`);
  const _im=cImg(c);
  const im=_im
    ?(c.ft&&c.ft.length&&c.fm
       ?`<span class="timg"><img src="${_im}" loading="lazy" alt="${esc(c.f)}">${foilLayer(c)}</span>`
       :`<img src="${_im}" loading="lazy" alt="${esc(c.f)}">`)
    :`<div class="ph">${esc(c.f)}</div>`;
  // once a copy is in the deck, offer to find its Shift target
  /* Search for cards is read-only, so the shift-target prompt is suppressed
     here too — it was the last control on a tile that could still put a card
     into a deck from the browsing tab. */
  const wantShift=TAB!=="tSearch"&&q&&!ban&&(hasShift(c)||c.sub.includes("Floodborn"))&&shiftTargets(c).length;
  const bad=illegalReason(c),four=coconut4x(c);
  if(four)tags.push(`<span style="background:var(--link);color:var(--surface);font-weight:800">CAN HAVE 4×</span>`);
  return `<div class="c${ban?" banned":""}${isLoc(c)?" loc":""}${bad&&!ban?" illegal":""}${
      c.n==="Flounder"?" flounder":""}" data-f="${esc(c.f)}">
    ${tags.length?`<div class="tags">${tags.join("")}</div>`:""}
    ${tipsOn()&&!ban?`<div class="tipadd">Click to add</div>`:""}
    <button class="i" data-i="${esc(c.f)}" title="Details">i</button>
    ${im}
    ${wantShift?`<button class="shift" data-sh="${esc(c.f)}">Add shift target?</button>`:""}
    ${TAB!=="tSearch"&&!ban?`<div class="qty${q?" has":""}"><button class="m" data-minus="${esc(c.f)}" title="Remove one">−</button>
        <input class="n" type="text" inputmode="numeric" autocomplete="off" spellcheck="false"
          value="${q||0}" data-qty="${esc(c.f)}" aria-label="Copies of ${esc(c.f)} in the deck"
          title="Type a number and press Enter">
        <button class="p" data-plus="${esc(c.f)}" title="Add one">+</button></div>`:""}
    ${bad&&!ban?`<div class="why" data-why="1" title="Why this is flagged">Not legal<span>${esc(bad)}</span>
      <button class="whyoff" data-whyoff="1">Turn reminder tags off</button></div>`:""}
    ${priceChip(c)}</div>`;
}
function renderGrid(){
  const all=sortC(filt()),g=$("grid");
  $("ct").innerHTML=`<b>${all.length.toLocaleString()}</b> card${all.length===1?"":"s"}`;
  if(!all.length){
    /* Nothing found is the one moment a spelling guess earns its place. Offered
       on the typed text only — a filter chip that matches nothing is a
       deliberate choice, not a typo. */
    const guesses=(typeof didYouMean==="function"&&S.q&&S.q.trim())?didYouMean(S.q):[];
    g.innerHTML=`<div class="empty">No cards match.</div>`+
      (guesses.length?`<div class="dym"><b>Did you mean</b>${
        guesses.map(c=>`<button data-dym="${esc(c.f)}">${esc(c.f)}</button>`).join("")}</div>`:"");
    g.querySelectorAll("[data-dym]").forEach(b=>b.onclick=()=>{
      $("q").value=b.dataset.dym;S.q=b.dataset.dym;S.limit=150;acClose();render()});
    return}
  const show=all.slice(0,S.limit);
  g.innerHTML=show.map(tile).join("")+(all.length>S.limit
    ?`<div class="more"><button class="btn" id="mo">Show more (${(all.length-S.limit).toLocaleString()} left)</button></div>`:"");
  bindGrid();
}
/* ===== tactile deck building ===============================================
   Adding a card should feel like putting a card down, not like submitting a
   form. Four things do the work: a pop on the tile, the card flying to the
   deck rail, hold-to-stack on +, and drag-and-drop onto the rail. All of it is
   decoration over the same addCard() — if any of it fails the deck is still
   correct. */
function pop(el){
  el.classList.remove("add");void el.offsetWidth;el.classList.add("add");
  setTimeout(()=>el.classList.remove("add"),420);
}
/* A ghost of the card arcs from the tile to the deck panel. Purely cosmetic and
   pointer-events:none, so it can never intercept a click mid-flight. */
function flyToDeck(el,n){
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const img=el.querySelector("img");
  const target=$("deck")||$("mD");
  if(!img||!target)return;
  const a=img.getBoundingClientRect(),b=target.getBoundingClientRect();
  const g=document.createElement("img");
  g.src=img.src;g.className="fly";
  g.style.left=a.left+"px";g.style.top=a.top+"px";
  g.style.width=a.width+"px";g.style.height=a.height+"px";
  document.body.appendChild(g);
  const dx=(b.left+b.width/2)-(a.left+a.width/2);
  const dy=(b.top+40)-(a.top+a.height/2);
  requestAnimationFrame(()=>{
    g.style.transform=`translate(${dx}px,${dy}px) scale(.16) rotate(${dx>0?12:-12}deg)`;
    g.style.opacity="0";
  });
  setTimeout(()=>g.remove(),460);
  bumpDeck();
}
function bumpDeck(){
  [$("mN"),$("deckCount")].forEach(e=>{if(!e)return;
    e.classList.remove("bump");void e.offsetWidth;e.classList.add("bump");
    setTimeout(()=>e.classList.remove("bump"),380)});
}
/* The deck rail is a drop target. */
function bindDrop(){
  const rail=$("deck");if(!rail||rail.dataset.drop)return;
  rail.dataset.drop="1";
  rail.addEventListener("dragover",e=>{
    if(TAB==="tSearch")return;
    e.preventDefault();e.dataTransfer.dropEffect="copy";rail.classList.add("over")});
  rail.addEventListener("dragleave",()=>rail.classList.remove("over"));
  rail.addEventListener("drop",e=>{
    e.preventDefault();rail.classList.remove("over");
    if(TAB==="tSearch")return;
    const f=e.dataTransfer.getData("text/plain");
    if(f&&addCard(f)){bumpDeck();toast("Added "+f.split(" - ")[0])}
  });
}
/* ===== keyboard building ==================================================
   Build a whole sixty without touching the mouse. Deliberately does nothing
   while you're typing in a field, so the search box still behaves. */
let KBI=-1;
function kbTiles(){return [...$("grid").querySelectorAll(".c")]}
function kbFocus(i){
  const t=kbTiles();if(!t.length)return;
  KBI=Math.max(0,Math.min(i,t.length-1));
  t.forEach(x=>x.classList.remove("kb"));
  const el=t[KBI];el.classList.add("kb");
  el.scrollIntoView({block:"nearest",behavior:"smooth"});
}
document.addEventListener("keydown",e=>{
  const tag=(e.target.tagName||"").toLowerCase();
  const typing=tag==="input"||tag==="textarea"||tag==="select"||e.target.isContentEditable;
  if(e.key==="/"&&!typing){e.preventDefault();$("q").focus();$("q").select();return}
  if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
  if(!$("vSearch")||!$("vSearch").classList.contains("on"))return;
  const t=kbTiles();if(!t.length)return;
  const cols=Math.max(1,Math.round($("grid").clientWidth/(t[0].offsetWidth+14)));
  const cur=()=>t[KBI]&&t[KBI].dataset.f;
  switch(e.key){
    case "ArrowRight": e.preventDefault();kbFocus(KBI+1);break;
    case "ArrowLeft":  e.preventDefault();kbFocus(KBI-1);break;
    case "ArrowDown":  e.preventDefault();kbFocus(KBI<0?0:KBI+cols);break;
    case "ArrowUp":    e.preventDefault();kbFocus(KBI-cols);break;
    case "Enter": {
      if(KBI<0)return;e.preventDefault();
      if(TAB==="tSearch"){openM(cur());return}
      if(addCard(cur())){pop(t[KBI]);flyToDeck(t[KBI],1)}
      break}
    case "4": {
      if(KBI<0||TAB==="tSearch")return;e.preventDefault();
      let n=0;for(let i=0;i<4;i++)if(addCard(cur()))n++;
      if(n){pop(t[KBI]);flyToDeck(t[KBI],n)}
      break}
    case "Backspace": {
      if(KBI<0||TAB==="tSearch")return;e.preventDefault();
      delCard(cur());bumpDeck();break}
    case "i": if(KBI>=0){e.preventDefault();openM(cur())} break;
  }
});

/* ---- press-and-hold on + -------------------------------------------------
   This state deliberately lives outside the tile, and the listener that stops
   it is on the window. Both are the fix for a runaway.

   It used to keep the timer in a closure per tile and listen for pointerup and
   pointerleave ON THE + BUTTON. But adding a card calls refreshTiles(), which
   does el.innerHTML = fresh.innerHTML — so every single tick destroyed the
   very button being held. Releasing your finger then delivered pointerup to a
   node that was no longer in the document, nothing ever called stop, and the
   timer kept going and going, accelerating to one card every 90ms with no way
   on earth to halt it. Letting go made it worse, not better, because letting
   go was exactly the event that had stopped working.

   So: one timer, tracked here; stopped from the window, which no re-render can
   take away; and it stops itself at the copy limit instead of stacking
   twenty-nine illegal copies of a card. */
let HOLD=null;
function stopHold(){if(HOLD){clearTimeout(HOLD.t);HOLD=null}}
function startHold(f,el){
  stopHold();
  const c=CARDS.find(x=>x.f===f);
  const lim=c?maxCopies(c):4;
  let rate=340;
  const step=()=>{
    if(!HOLD)return;
    if((deck().cards[f]||0)>=lim||!addCard(f)){stopHold();return}
    pop(el);flyToDeck(el,1);
    rate=Math.max(90,rate*0.7);
    HOLD.t=setTimeout(step,rate);
  };
  HOLD={t:setTimeout(step,rate),f};
}
["pointerup","pointercancel"].forEach(t=>window.addEventListener(t,stopHold,true));
window.addEventListener("blur",stopHold);
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopHold()});

function bindGrid(){
  const g=$("grid");
  g.querySelectorAll(".c").forEach(el=>{
    const f=el.dataset.f,hit=el.querySelector("img")||el.querySelector(".ph");
    /* On the Search-for-cards tab the grid is for browsing, so clicking the art
       opens the card instead of putting it in a deck. */
    if(TAB==="tSearch"){if(hit)hit.onclick=()=>openM(f);return}
    /* Shift-click puts a whole playset in at once — the thing you actually want
       four times out of five. */
    if(hit)hit.onclick=e=>{
      const n=e.shiftKey?4:1;
      let added=0;
      for(let i=0;i<n;i++)if(addCard(f))added++;
      if(added){pop(el);flyToDeck(el,added)}
    };
    /* Hold + to stack. Starts slow so a single press is still one card, then
       accelerates, so getting to four is a gesture rather than four clicks.
       startHold lives outside this function — see the note on it. */
    const plus=el.querySelector("[data-plus]");
    if(plus)plus.addEventListener("pointerdown",ev=>{ev.preventDefault();startHold(f,el)});
    /* Drag a card onto the deck rail. */
    el.setAttribute("draggable","true");
    el.addEventListener("dragstart",ev=>{
      ev.dataTransfer.setData("text/plain",f);
      ev.dataTransfer.effectAllowed="copy";
      el.classList.add("dragging");
      document.body.classList.add("dragging-card");
    });
    el.addEventListener("dragend",()=>{el.classList.remove("dragging");
      document.body.classList.remove("dragging-card")});
  });
  /* Linger on a card that hides a mouse-shaped symbol and it quietly shows you.
     Ten seconds is long enough that you'll only ever see it if you were already
     staring at the art, which is the point. */
  g.querySelectorAll(".c").forEach(el=>{
    const c=CARDS.find(x=>x.f===el.dataset.f);
    if(!c||!(c.mk&&c.mk.length))return;
    let t=null;
    el.onmouseenter=()=>{t=setTimeout(()=>{
      if(el.querySelector(".syml"))return;
      const im=el.querySelector("img");if(!im)return;
      im.insertAdjacentHTML("afterend",symLayer(c));
      const l=el.querySelector(".syml");if(l)l.classList.add("on","small");
    },10000)};
    el.onmouseleave=()=>{clearTimeout(t);
      const l=el.querySelector(".syml");if(l)l.remove()};
  });
  g.querySelectorAll("[data-i]").forEach(b=>b.onclick=e=>{e.stopPropagation();openM(b.dataset.i)});
  g.querySelectorAll("[data-buyone]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const c=CARDS.find(x=>x.f===b.dataset.buyone);
    if(c)tcgOpen([{c,q:1}],"this card")});
  /* These four run over the whole grid, so the early `return` above — which
     only skips the per-tile bindings — never reached them. On the Search tab a
     stepper that survived a re-render could still change the deck. Nothing
     that writes to a deck gets wired here at all now. */
  if(TAB!=="tSearch"){
    g.querySelectorAll("[data-plus]").forEach(b=>b.onclick=e=>{e.stopPropagation();addCard(b.dataset.plus)});
    g.querySelectorAll("[data-minus]").forEach(b=>b.onclick=e=>{e.stopPropagation();delCard(b.dataset.minus)});
    /* Type a number in the box instead of pressing + four times. Enter commits;
       Escape puts back what was there; clicking away commits too, because
       typing 4 and then clicking the next card obviously meant four. Clicking
       into the box must not also fire the tile's "click to add", hence the
       stopPropagation on mousedown as well as click. */
    g.querySelectorAll("[data-qty]").forEach(inp=>{
      const f=inp.dataset.qty;
      const cur=()=>String(deck().cards[f]||0);
      const commit=()=>{
        const v=inp.value.trim();
        /* An empty box is someone who cleared it to type, not someone asking
           for zero copies — putting the card back to nothing there would be a
           nasty surprise. */
        if(v===""){inp.value=cur();return}
        if(!setCardCount(f,parseInt(v,10)))inp.value=cur();
      };
      inp.onmousedown=e=>e.stopPropagation();
      inp.onclick=e=>{e.stopPropagation();inp.select()};
      inp.onfocus=()=>inp.select();
      inp.onkeydown=e=>{
        e.stopPropagation();                       // the grid has its own 1-4 and i shortcuts
        if(e.key==="Enter"){e.preventDefault();commit();inp.blur()}
        else if(e.key==="Escape"){e.preventDefault();inp.value=cur();inp.blur()}
      };
      inp.onblur=commit;
    });
    g.querySelectorAll("[data-sh]").forEach(b=>b.onclick=e=>{e.stopPropagation();openShift(b.dataset.sh)});
  }
  /* The tag is clickable on every tab — it explains itself, and it offers the
     way out. stopPropagation because the tile underneath adds a card. */
  g.querySelectorAll("[data-why]").forEach(w=>{
    w.onclick=e=>{
      e.stopPropagation();
      if(e.target.closest("[data-whyoff]")){
        REMIND=false;save("fs3_remind",REMIND);drawRemind();return;
      }
      const wasOpen=w.classList.contains("open");
      g.querySelectorAll("[data-why].open").forEach(o=>o.classList.remove("open"));
      w.classList.toggle("open",!wasOpen);
    };
  });
  const mo=$("mo");if(mo)mo.onclick=()=>{S.limit+=150;renderGrid()};
  bindDrop();
  if(KBI>=0)kbFocus(KBI);
}
/* Hitting + or − used to call renderGrid(), which replaced every tile node —
   so the card you were hovering was destroyed mid-hover and snapped back to
   normal size. Instead we keep the existing nodes (CSS :hover follows the
   node, so the zoom survives) and only swap their contents. Adding a card can
   change OTHER tiles too (a new ink can push cards off-ink), so refresh all. */
function refreshTiles(){
  const g=$("grid"),tmp=document.createElement("div");
  g.querySelectorAll(".c").forEach(el=>{
    const c=CARDS.find(x=>x.f===el.dataset.f);if(!c)return;
    tmp.innerHTML=tile(c);const fresh=tmp.firstElementChild;
    const popping=el.classList.contains("add");
    el.className=fresh.className+(popping?" add":"");
    el.innerHTML=fresh.innerHTML;
  });
  bindGrid();
}

/* ===================== modal ===================== */
/* ===== foiling ==========================================================
   Each pattern gets its own light. These are chosen to match what the card
   physically does in the hand: Lava and Magma throw warm light, the wave
   foils throw cold, Lore is gold, RainbowPillars is the full spread. A card
   that carries foilEffectColors uses that colour instead — Ravensburger's own
   value for what the foil looks like. */
const SHEEN={
  Lava:          "#ffb066,#ff5f3a",
  Magma:         "#ffd08a,#ff7a2f",
  Tempest:       "#b8e4ff,#4f8fd6",
  SeaWave:       "#a9f0ff,#3fb6c9",
  VerticalWave:  "#cfe9ff,#5f9fd6",
  CalendarWave:  "#dff0ff,#7fb2d9",
  Satin:         "#fff4e0,#e3cfa8",
  Glitter:       "#ffffff,#dcd0ff",
  Lore:          "#ffe9ad,#c9a227",
  RainbowPillars:"#ff9bb0,#ffe08a,#9bffc4,#9bd8ff,#c9a8ff",
  FreeForm1:     "#fff0d0,#d8bd85",
  FreeForm2:     "#e6f2ff,#a9c4e0",
};
function foilStops(o){
  if(o.fc&&o.fc.length)return o.fc.length>1?o.fc.join(",") : o.fc[0]+",#ffffff";
  const t=(o.ft||[])[0];
  return SHEEN[t]||"#ffffff,#d8d8d8";
}
/* o is a card or a printing row — both carry ft/fm/fc when foiled. */
function foilLayer(o){
  if(!(o&&o.ft&&o.ft.length&&o.fm))return "";
  const cols=foilStops(o).split(",");
  const band=cols.map((c,i)=>`${c} ${44+i*(14/Math.max(1,cols.length-1))}%`).join(",");
  const sheen=`linear-gradient(112deg,transparent 30%,${band},transparent 74%)`;
  return `<div class="foil run" style="--sheen:${sheen};--fm:url('${esc(o.fm)}')"></div>`;
}
const foilName=o=>(o&&o.ft||[]).map(t=>t.replace(/([a-z])([A-Z])/g,"$1 $2")).join(" · ");

/* ===== hidden mouse-shaped symbols, on the card itself =====
   MICKEYS says WHICH cards have one and describes it in words. c.mk says WHERE,
   as percentages of the art, and comes from marking it in the tagger. A card can
   have the first without the second — then we still tell you it's there, we just
   can't point at it. */
/* Built on first use, not at load: MICKEYS is declared a thousand lines below
   this and touching it here directly is a temporal-dead-zone crash. */
let _mickIdx=null;
function mickIdx(){
  if(!_mickIdx){_mickIdx=new Map();
    MICKEYS.flatMap(g=>g.cards).forEach(x=>{if(x.c)_mickIdx.set(x.c,x.w||"")})}
  return _mickIdx;
}
const MICKDESC=f=>mickIdx().get(f)||"";
/* A card has a Mousey if it is in the hand-written list, OR carries marker
   circles from the tagger, OR is tagged "mousey" there. The last two are how a
   new find gets in without editing this file. */
const hasSym=c=>mickIdx().has(c.f)||!!(c.mk&&c.mk.length)||(c.tg||[]).includes("mousey");
function symLayer(c){
  if(!(c.mk&&c.mk.length))return "";
  return `<div class="syml">${c.mk.map(s=>
    `<span class="sym" style="left:${s.x}%;top:${s.y}%;width:${s.r*2}%"></span>`).join("")}</div>`;
}
function openM(f,showPr){
  const c=CARDS.find(x=>x.f===f);if(!c)return;
  // showPr = index into c.pr the user clicked; otherwise honour their preference
  const P=(showPr!=null&&(c.pr||[])[showPr])||null;
  const MAIN=P?(P.l||P.i):cImgL(c);
  const refs=CARDS.filter(x=>x.f!==c.f&&x.ef.includes(c.n)).slice(0,14);
  const shifts=c.kw.some(k=>/shift/i.test(k[0]||""))?CARDS.filter(x=>x.f!==c.f&&x.n===c.n&&x.ty==="Character"):[];
  $("modal").className="modal"+(isLoc(c)?" loc":"");
  $("modal").innerHTML=`<button class="mx" id="mx">✕</button>
    ${MAIN
      ?(isLoc(c)?`<div class="locframe"><img src="${MAIN}" alt="${esc(c.f)}">${foilLayer(P||c)}${symLayer(c)}</div>`
                :`<div class="mimg"><img src="${MAIN}" alt="${esc(c.f)}">${foilLayer(P||c)}${symLayer(c)}</div>`)
      :`<div class="ph">${esc(c.f)}</div>`}
    <div class="mc">
    <!-- The name and version used to be an h2 and a subtitle at the top of
         this column, in type big enough to be the loudest thing in the modal —
         next to a picture of the card with its name printed across it. It told
         you the one thing you could already see. It stays for screen readers,
         which have no picture, and comes off the screen.

         What replaces it is the opposite: the facts you CAN'T read off the
         art. Which set it is and what number, what film it's from, who drew
         it, whether it's inkable, whether it's Core legal. Ink and rarity ride
         along because they're one word each and they're what people sort by. -->
    <h2 class="mname">${esc(c.f)}</h2>
    <!-- Ben, 2026-09-07: nothing here that is printed on the card. Cost,
         strength, willpower, lore, rarity, ink, type and the classification
         line were all sitting beside a picture of a card that states every one
         of them, so the panel was repeating the artwork back at you in worse
         type. What is left is what the picture genuinely cannot tell you:
         which set, which film, who drew it, and whether it is legal — plus
         the ability text, big enough to read. -->
    <dl class="mfacts">
      <div><dt>Set</dt><dd>${P?esc(SETNAME(P.s)):esc(c.sn)} <i>#${P?esc(P.num):esc(String(c.num))}</i></dd></div>
      ${c.sto?`<div><dt>Franchise</dt><dd>${esc(c.sto)}</dd></div>`:""}
      ${c.ar&&c.ar.length?`<div><dt>Illustrator</dt><dd>${esc(c.ar.join(" · "))}</dd></div>`:""}
    </dl>
    <div class="flags">
      <span class="flag ${c.ik?"yes":"no"}">${c.ik?"Inkable":"Not inkable"}</span>
      <span class="flag ${c.core?"yes":"no"}">${c.core?"Core legal":"Not Core legal"}</span>
      ${isQuest(c)?`<span class="flag no">Never tournament legal</span>`:""}
      ${isStar(c.f)?`<span class="flag star">★ Staple</span>`:""}
    </div>
    <div class="tx big">${esc(c.tx)||"(no rules text)"}</div>
    ${isLoc(c)?LOC_NOTE:""}
    ${hasSym(c)?`<div class="symbox">
      <span class="symt">🐭 There's a Hidden Mousey in this art.</span>
      ${(c.mk&&c.mk.length)
        ?`<button class="btn" id="symBtn">Show me where</button>`
        :`<span class="hint">Nobody has marked exactly where yet —
            <b>${esc(MICKDESC(c.f)||"see the Hidden Mouseys page")}</b></span>`}
    </div>`:""}
    ${c.f==="Bucky - Squirrel Squeak Tutor"?`<div class="respect">
      <label for="fbox">🪦 Press F to pay respects</label>
      <input id="fbox" maxlength="1" autocomplete="off" placeholder="F">
      <span class="rcount">${DUST.bucky?`paid ${N(DUST.bucky)} time${DUST.bucky===1?"":"s"}`:""}</span>
    </div>`:""}
    ${(c.pr||[]).length>1?(()=>{const cur=P?showPr:prIndex(c,MAIN);
      return `<details class="prints"${PROPEN?" open":""} id="prs">
      <summary>Show other printings of this card <span class="cnt">${c.pr.length}</span></summary>
      <div class="pgrid">${c.pr.map((x,i)=>`<button class="pcard${i===cur?" on":""}" data-pr="${i}">
        <span class="timg"><img src="${esc(x.i)}" loading="lazy" alt="">${foilLayer(x)}</span>
        <span class="ps">${esc(SETNAME(x.s))} #${esc(x.num)}</span>
        <span class="pr2">${rarLabel(x.r)}${x.pm?" · promo":""}</span></button>`).join("")}</div>
      <div class="hint" style="margin:8px 0 0">Decks don\'t care which printing you own —
        this only changes the art you see. Set a default in <b>Card images</b> in the sidebar.</div>
      </details>`})():""}
    ${shifts.length?`<div class="rel"><b>Shift targets — same name</b><div class="rl">${
      shifts.map(x=>`<button data-go="${esc(x.f)}">${esc(x.v||x.n)}</button>`).join("")}</div></div>`:""}
    ${(c.ru||[]).length?`<div class="rulings"><h4>From set notes (${c.ru.length})</h4>${
      c.ru.map(r=>`<div class="ruling"><div class="q">${esc(r.q)}</div><div class="a">${esc(r.a)}</div>
        ${r.s?`<div class="src">Official set release notes — ${esc(r.s)}</div>`:""}</div>`).join("")}</div>`:""}
    ${(c.rsi||[]).length?`<div class="rulings rsi"><h4>Ready Set Ink notes (${c.rsi.length})</h4>${
      c.rsi.map(r=>{const k=KIND(r.k);
        return `<div class="ruling rsin" style="border-left-color:${k.c}">
        <div class="kind" style="color:${k.c}">${k.i} ${esc(k.l)}</div>
        <div class="a">${esc(r.t)}</div>
        ${r.u?`<a class="nlink" href="${esc(r.u)}" target="_blank" rel="noopener noreferrer">${
          k.k==="video"?"▶ Watch":"Open link"} ↗</a>`:""}
        ${r.src||r.d?`<div class="src">${esc([r.src,r.d].filter(Boolean).join(" · "))}</div>`:""}</div>`
      }).join("")}</div>`:""}
    ${refs.length?`<div class="rel"><b>Cards that name "${esc(c.n)}"</b><div class="rl">${
      refs.map(x=>`<button data-go="${esc(x.f)}">${esc(x.f)}</button>`).join("")}</div></div>`:""}
    ${TAB!=="tSearch"&&illegalReason(c)?`<div class="wn" style="margin-top:9px">⚠ Not legal in this deck — ${esc(illegalReason(c))}</div>`:""}
    <div class="acts" style="align-items:center">
      ${TAB==="tSearch"
        /* Search for cards is a reference tool. Nothing in it touches a deck —
           no steppers here, none on the tiles, no count. Deck building has its
           own tab and this one stays read-only. That used to be spelled out in
           a banner; the absence of the controls says it well enough, and the
           banner was just a label explaining a thing that isn't there. */
        ?``
        :`<button class="btn bad" id="mr" style="font-size:1.2rem;padding:4px 16px">−</button>
          <span style="font-size:1.15rem;font-weight:800;min-width:34px;text-align:center">${deck().cards[c.f]||0}</span>
          <button class="btn go" id="ma" style="font-size:1.2rem;padding:4px 16px">+</button>`}
      <button class="btn" id="ms">${isStar(c.f)?"★ Untag staple":"☆ Tag as staple"}</button></div>
    ${priceBlock(c)}
    ${oddsLine(c)}
    ${collRows(c)}</div>`;
  $("mbg").classList.add("on");
  if(c.f==="Hiram Flaversham - Toymaker")unlockHidden("h_rat");
  if(c.f==="Bucky - Squirrel Squeak Tutor")unlockHidden("h_grave");
  if(c.n==="Flounder")unlockHidden("h_fish");
  if(c.n==="Ratigan"&&RATSEARCH)unlockHidden("h_rat2");
  if(P&&P.r==="Enchanted")unlockHidden("h_ench");
  $("mx").onclick=()=>$("mbg").classList.remove("on");
  $("modal").querySelectorAll("[data-buyone]").forEach(b=>b.onclick=()=>tcgOpen([{c,q:1}],"this card"));
  $("modal").querySelectorAll("[data-priceinfo]").forEach(b=>b.onclick=()=>infoBox("About this price",priceBlurb()));
  const ma=$("ma");if(ma)ma.onclick=()=>{addCard(c.f);openM(c.f)};
  const mr=$("mr");if(mr)mr.onclick=()=>{delCard(c.f);openM(c.f)};
  wireCollRows(c);
  $("ms").onclick=()=>{STARS.has(c.f)?STARS.delete(c.f):STARS.add(c.f);save(K_STAR,[...STARS]);
    if(STARS.size>=10)award("curator");openM(c.f);render()};
  const sy=$("symBtn");
  if(sy)sy.onclick=()=>{
    const l=$("modal").querySelector(".syml");if(!l)return;
    const on=l.classList.toggle("on");
    sy.textContent=on?"Hide it again":"Show me where";
  };
  const fb=$("fbox");
  if(fb)fb.onkeydown=ev=>{
    if(ev.key!=="Enter")return;
    if((fb.value||"").trim().toLowerCase()!=="f"){fb.value="";return}
    /* 500 the first time, 50 for the next ten, 5 after that — generous once,
       then clearly a joke you're welcome to keep making. */
    const n=DUST.bucky||0;
    const pay=n===0?500:n<=10?50:5;
    DUST.bucky=n+1;dustGain(pay);
    fb.value="";toast(`🪦 +${N(pay)} dust`);openM(c.f);
  };
  const prs=$("prs");if(prs)prs.ontoggle=()=>{PROPEN=prs.open;save("fs3_propen",PROPEN)};
  $("modal").querySelectorAll("[data-pr]").forEach(b=>b.onclick=()=>openM(c.f,+b.dataset.pr));
  $("modal").querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>openM(b.dataset.go));
}
$("mbg").onclick=e=>{if(e.target.id==="mbg")$("mbg").classList.remove("on")};
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("mbg").classList.remove("on")});
/* "Patient" pays out when the ⓘ actually finishes its 7-second glow — the
   animation ending is the only honest signal that someone really lingered. */
document.addEventListener("animationend",e=>{
  if(e.animationName==="iglow")award("patient");},true);

/* Shift-target sub-screen: same character, cheaper bodies you can shift onto. */
function openShift(f){
  const c=CARDS.find(x=>x.f===f);if(!c)return;
  const t=shiftTargets(c),sc=c.kw.find(k=>/shift/i.test(k[0]||""));
  $("modal").className="modal";
  $("modal").innerHTML=`<button class="mx" id="mx">✕</button>
    ${c.imgL||c.img?`<img src="${c.imgL||c.img}" alt="${esc(c.f)}">`:`<div class="ph">${esc(c.f)}</div>`}
    <div class="mc"><h2>Shift targets</h2>
      <div class="v">for ${esc(c.f)}${sc?` · ${esc(sc[0])}${sc[1]!=null?" "+sc[1]:""}`:""}</div>
      <div class="tx">You need another <b>${esc(c.n)}</b> already in play to shift onto.
        ${t.length?`These ${t.length} are legal targets — cheapest first.`:"No legal targets in this format."}</div>
      ${t.length?`<div class="mgrid">${t.map(x=>{
        const q=deck().cards[x.f];
        // the ink chips you have selected are the filter people expect to apply here
        const offFilter=S.ink.size&&!(x.co.length&&x.co.every(i=>S.ink.has(i)))
          ? "not legal ink pair" : null;
        const bad=offFilter||illegalReason(x);
        return `<div class="mcard${bad?" illegal":""}">${q?`<span class="badge">×${q}</span>`:""}
          ${x.img?`<img src="${x.img}"${bad?"":` data-add="${esc(x.f)}"`} title="${bad?esc(bad):"Add "+esc(x.f)}">`
                 :`<div class="ph">${esc(x.n)}</div>`}
          <div class="t">◈${x.c} ${esc(x.v||x.n)}</div>
          ${bad?`<div class="no">${/off-ink|ink pair/.test(bad)?"NOT LEGAL INK PAIR":esc(bad.toUpperCase())}</div>`:""}</div>`}).join("")}</div>`:""}
      <div class="acts"><button class="btn" id="msearch">Search all ${esc(c.n)} cards</button></div></div>`;
  $("mbg").classList.add("on");
  $("mx").onclick=()=>$("mbg").classList.remove("on");
  $("modal").querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{addCard(b.dataset.add);openShift(f)});
  $("msearch").onclick=()=>{$("mbg").classList.remove("on");
    S.q='name:"'+c.n+'"';$("q").value=S.q;S.limit=150;render()};
}

