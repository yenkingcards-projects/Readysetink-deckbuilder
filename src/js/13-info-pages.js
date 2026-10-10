/* ===================== worldbuilding =====================
   Straight from Ravensburger's own story pages on disneylorcana.com, not from
   memory and not from fan wikis. Quotes are marked as quotes; everything else
   is a plain summary of what the official pages say. The set-by-set spine is
   built from the site's own product list, so it stays honest about what's
   actually been published versus what people have inferred. */
const INKLORE=[
 {i:"Amber",    d:"Light, warmth and support. Amber glimmers tend to help each other — healing, readying, and giving other characters a reason to be on the board."},
 {i:"Amethyst", d:"Magic and transformation. Amethyst reaches into the deck and the hand, changing what you have rather than what's in front of you."},
 {i:"Emerald",  d:"Trickery and misdirection. Emerald takes things away — from hands, from the board — and slips past what should have stopped it."},
 {i:"Ruby",     d:"Action and daring. Ruby is the ink in a hurry: charging in, hitting first, and asking questions afterwards."},
 {i:"Sapphire", d:"Craft and resources. Sapphire builds — items, ink, and the long game that pays off in the second half."},
 {i:"Steel",    d:"Strength and resolve. Steel takes the hit and keeps standing, then removes whatever hit it."},
];
function renderWorld(){
  const sets=Object.entries(DATA.sets||{})
    .filter(([code])=>CARDS.some(c=>c.s===code))
    .sort((a,b)=>String(a[1].d).localeCompare(String(b[1].d)));
  $("worldpage").innerHTML=`<div class="page">
    <button class="btn" id="wdExit" style="margin-bottom:12px">← Other</button>
    <h1><span class="gi">🌌</span>Worldbuilding</h1>
    <p class="lede">What Lorcana actually is, taken from Ravensburger's own story pages rather than
      from anyone's guesswork. If it isn't official, it says so.</p>

    <div class="wquote">
      <p>“A swirl of colorful starlight appears, growing brighter and brighter until it is all you
        can see. When the burst of light subsides, you find yourself in a wondrous new place.
        Welcome to the Great Illuminary, the center of a magical realm called Lorcana.”</p>
      <cite>disneylorcana.com — The First Chapter: The Story Begins</cite>
    </div>

    <div class="ctile"><h3>The Great Illuminary</h3>
      <p>The centre of the realm, and the thing that summoned you. Official text: the Illuminary
        called you there <b>because of your imagination</b>. You follow a pulsing line of light through
        curving hallways into a vast atrium, where a mechanism towers over an open book.</p>
      <p>Sparkling down from above is a stream of <b>story stars</b>, each one carrying fragments of
        Disney stories.</p></div>

    <div class="ctile"><h3>The inkcaster, and what a glimmer is</h3>
      <p>The tool you pick up is an <b>inkcaster</b>. Held above the lorebook, magical ink flows
        through it and combines with the light of a story star on the page, and an image of a Disney
        character rises off the paper.</p>
      <p>That image is a <b>glimmer</b> — and the official wording is worth being precise about:
        a glimmer is “<i>a new version of the character that only exists in this realm</i>”. Not the
        character from the film. A separate thing, made here, out of ink and starlight.</p>
      <p>It's why the same character can appear many times over with different names, different
        stats and different art. Each one is a different glimmer, not a different printing.</p></div>

    <div class="ctile"><h3>Who you are</h3>
      <p>You're an <b>Illumineer</b> — one of many, called from across the globe. The job is to
        summon glimmers, quest with them, and search for <b>missing lore</b> in a race against time.
        Lore is described as “<i>a treasure that must be preserved and protected at all costs</i>”.</p>
      <p>That's the whole game reframed: questing gains lore because gathering lore <i>is</i> the
        job. You're not scoring points, you're recovering something.</p></div>

    <div class="ctile"><h3>The six inks</h3>
      <p>Ravensburger is explicit on one point, and it's the interesting one:
        <b>no ink is innately good or evil</b>. Heroes and villains are found in all six.</p>
      <div class="winks">${INKLORE.map(x=>`
        <div class="wink" style="--ic:${HEX[x.i]||"#666"}">
          <div class="wih"><i></i>${esc(x.i)} <span>${CARDS.filter(c=>(c.co||[]).includes(x.i)).length}</span></div>
          <p>${esc(x.d)}</p></div>`).join("")}</div>
      <p class="small">Ink flavour summarised from how each ink actually plays across
        ${CARDS.length.toLocaleString()} cards. Ravensburger's own per-ink pages go further.</p></div>

    <div class="ctile"><h3>The story, set by set</h3>
      <p>Every set is a chapter. This list is built from the card data itself, so it only shows what
        has actually been published.</p>
      <div class="wsets">${sets.map(([code,m],i)=>`
        <div class="wset"><span class="wn">${i+1}</span>
          <div><b>${esc(m.name||("Set "+code))}</b>
          <span>${esc(String(m.d||"").slice(0,7))} · ${CARDS.filter(c=>c.s===code).length} cards</span></div>
        </div>`).join("")}</div></div>

    <div class="soon"><b>Read it from the source</b>
      <p><a href="https://www.disneylorcana.com/en-US/story" target="_blank" rel="noopener noreferrer">The official story page ↗</a><br>
      <a href="https://www.disneylorcana.com/en-US/story/magic" target="_blank" rel="noopener noreferrer">Chapter 1 — The Story Begins ↗</a><br>
      <a href="https://cards.disneylorcana.com/en-US/" target="_blank" rel="noopener noreferrer">The official card gallery ↗</a></p>
      <p class="small">Quoted passages are Ravensburger's words, marked as quotes. Everything else is
        a summary of their published material. © Disney, operated by Ravensburger.</p></div>
  </div>`;
  const e=$("wdExit");if(e)e.onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
}

/* ===================== historic leaks =====================
   Ben's rule: nothing goes live until 150 days after it happened. This page is
   a record, never a spoiler feed. Entries are kept in LEAKS with a `live` date
   and are FILTERED OUT until that date passes — so an entry can be written the
   day it happens and simply won't render until it's old news. That's enforced
   in code rather than by remembering, because remembering is how spoilers leak. */
const LEAK_HOLD_DAYS=150;
const LEAKS=[
 {what:"The First Chapter card images circulated before the official reveal schedule",
  when:"2023-06", sev:3,
  where:"Retail listings and social media",
  how:"Product photography and listing images went up ahead of the reveal calendar",
  after:"Ravensburger continued its planned reveal schedule; the cards released as normal in August 2023",
  live:"2023-11-15"},
 {what:"Enchanted rarity existed at all",
  when:"2023-08", sev:2,
  where:"Gen Con, 3 August 2023 — the first packs anyone opened",
  how:"Not a leak so much as a late reveal: Enchanted cards were a complete surprise when packs were first opened publicly, two weeks before general release",
  after:"Confirmed and embraced. The lateness is thought to be why Enchanted Simba's “When challenging” error was never caught before print",
  live:"2024-01-05"},
 {what:"Promo cards turned up inside sealed retail packs that weren't supposed to contain them",
  when:"2024", sev:2,
  where:"Sealed product bought at retail",
  how:"A packing error at the factory, not an information leak — promos meant for other channels were sealed into ordinary packs. It has happened more than once",
  after:"No recall. The affected packs stayed in circulation and the cards became collectible on their own",
  live:"2024-09-01"},
 /* Ben asked for this one specifically. It is 23 June 2026, so under the
    150-day hold it does NOT publish until ~20 November 2026 — the rule is
    doing exactly what it exists to do, and the entry sits here until then. */
 {what:"Collector Boosters revealed by Ravensburger's own website",
  when:"2026-06-23", sev:4,
  where:"disneylorcana.com — the official product pages",
  how:"Packaging art for an unannounced product type, the Collector Booster, appeared on the official site tied to Into the Inkdark (Set 15, Q1 2027). It was spotted, flagged on the official Discord, and quietly pulled",
  after:"Team Lorcana posted an official Discord statement within hours confirming Collector Boosters exist and that current Booster Packs would not change. Full details were held for a proper announcement later that summer",
  live:"2026-11-20"},
];
const leakLive=x=>{
  if(!x.live)return false;
  return new Date(x.live).getTime()<=Date.now();
};
const SEVLABEL=["","Barely a leak","Minor","Notable","Bad","Whole set"];
function renderLeaks(){
  const shown=LEAKS.filter(leakLive).sort((a,b)=>String(b.when).localeCompare(String(a.when)));
  const held=LEAKS.length-shown.length;
  $("leakpage").innerHTML=`<div class="page">
    <button class="btn" id="lkExit" style="margin-bottom:12px">← Other</button>
    <h1><span class="gi">🕰️</span>Historic leaks</h1>
    <div class="leakwarn">
      <b>This list is not updated live.</b>
      <p>No spoilers will ever appear here while they're happening. This is only a record of the
        leaks Ravensburger has historically done such a bad job of keeping secret.</p>
      <p>If I catch something, it's saved privately when it happens and scheduled to go live
        <b>${LEAK_HOLD_DAYS} days later</b>. By the time you can read it here, it isn't news.</p>
    </div>
    ${held?`<div class="hint" style="margin-bottom:14px">${held} entr${held===1?"y is":"ies are"}
      written up and waiting out the hold.</div>`:""}
    ${shown.length?`<div class="leaks">${shown.map(x=>`
      <div class="leak">
        <div class="lkh"><b>${esc(x.what)}</b>
          <span class="lkd">${esc(x.when)}</span></div>
        <div class="lksev" title="${esc(SEVLABEL[x.sev]||"")}">${
          "★".repeat(x.sev)}<span>${"★".repeat(5-x.sev)}</span> ${esc(SEVLABEL[x.sev]||"")}</div>
        <dl class="lkl">
          <dt>Where</dt><dd>${esc(x.where)}</dd>
          <dt>How</dt><dd>${esc(x.how)}</dd>
          <dt>What happened next</dt><dd>${esc(x.after)}</dd>
        </dl>
        <div class="lkf">Published ${esc(x.live)}</div>
      </div>`).join("")}</div>`
     :`<div class="soon"><b>Nothing has cleared the hold yet</b>
        <p>Come back later. That's rather the point.</p></div>`}

    <div class="soon"><b>The submission format</b>
      <p>If you want to send one in, answer these five and I'll date it and hold it:</p>
      <ul>
        <li><b>What was leaked</b> — one line</li>
        <li><b>Severity, 1 to 5 stars</b> — 1 is a blurry pack shot, 5 is the whole set</li>
        <li><b>Where it was leaked</b> — the venue, not a link to the material</li>
        <li><b>How it got out</b> — retailer, printer, playtest, misconfigured page</li>
        <li><b>What Ravensburger did after</b> — takedown, early reveal, silence</li>
      </ul>
      <p class="small">Images are held to a higher bar than text. A description of a leak and a
        gallery of leaked art are different things, and only one of them draws a letter. Text and
        dates by default.</p></div>
  </div>`;
  const e=$("lkExit");if(e)e.onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
}

/* ===================== hidden mickeys =====================
   Every card name here is checked against the real database at render time —
   if a name is ever wrong, the page says so out loud rather than quietly
   rendering a dead entry. Locations are quoted from the sources, not from
   memory, because "it's in the bushes somewhere" helps nobody. */
/* Called "mouse-shaped symbols" rather than the trademarked term. Same thing,
   less chance of a letter. */
const MICKEYS=[
 {set:"Every card",cards:[
  {c:null,t:"The card back",w:"The circle around the logo, flanked by two curves that run off the edge of the card, makes the classic three-circle shape. Confirmed by co-designer Ryan Miller — so it counts."},
 ]},
 {set:"The First Chapter",cards:[
  {c:"Pongo - Ol' Rascal",w:"In his spots — just below the collar, on his right front leg. The easiest one in the set."},
  {c:"Jetsam - Ursula's Spy",w:"Three of the bubbles rising off him, just above the middle of his body."},
  {c:"Coconut Basket",w:"At least four. The big coconut plus the two above it make one; three of the individual coconuts each have their own."},
  {c:"Let It Go",w:"Bottom edge of the card, just left of the word “LET”. Elsa's magic is full of near-misses; that one is the real one."},
  {c:"Robin Hood - Unrivaled Archer",w:"Far in the background, in the furthest tree. A second possible one sits in the tree above his bow."},
  {c:"Sebastian - Court Composer",w:"Two solid ones — at the tip of his baton, and just above his left claw. A third near the top-right corner is a stretch."},
  {c:"Duke of Weselton - Opportunistic Official",w:"Carved into the ornate background of the ruined Great Hall. Not an easy one."},
  {c:"Elsa - Snow Queen",w:"The swirls on the cover of her book, with the ears curving off the edge — the same trick the card backs use."},
  {c:"Mother Gothel - Selfish Manipulator",w:"A bright blemish on the wall behind her, in an otherwise dark scene."},
 ]},
 {set:"Into the Inklands",cards:[
  {c:"Dalmatian Puppy - Tail Wagger",w:"Two: one in the flower bush beside the chair, and one in the spots of the puppy with the blue collar. This card has five different art variants — and its own rule letting you run up to 99 of it."},
  {c:"Lucky - The 15th Puppy",w:"Three spots on each shoulder form two Mickeys — carried over from the 1961 film, where Pongo's spots did the same thing."},
  {c:"Pongo - Determined Father",w:"On Pongo's neck and shoulder, and on Rolly's right side. The left-side clump changes from artist to artist."},
  {c:"Rolly - Hungry Pup",w:"Same spot pattern on his right side."},
  {c:"The Queen - Hateful Rival",w:"The potion bottles hanging from her belt."},
  {c:"Prince John - Phony King",w:"Two: money bags arranged on the floor, and the ornate swirls on his new headboard."},
  {c:"Robin Hood - Daydreamer",w:"In the tree branches above him as he floats down the river."},
  {c:"Sir Hiss - Aggravating Asp",w:"The emerald brooch on his new green and gold caplet."},
  {c:"Wendy Darling - Authority on Peter Pan",w:"Embossed into the cover of the book she's reading."},
  {c:"Captain Hook's Rapier",w:"Two barnacles on the rocks — one under the hilt, one just above the word “Hook's”."},
 ]},
];
function renderMickeys(){
  const known=new Set(CARDS.map(c=>c.f));
  const bad=MICKEYS.flatMap(g=>g.cards).filter(x=>x.c&&!known.has(x.c));
  const total=MICKEYS.flatMap(g=>g.cards).filter(x=>x.c).length;
  $("mickpage").innerHTML=`<div class="page">
    <button class="btn" id="mkExit" style="margin-bottom:12px">← Other</button>
    <h1><span class="gi">🐭</span>Hidden Mouseys</h1>
    <p class="lede">There are hidden mouse icons in some Lorcana cards and we're trying to find
      them all. <b>${total} confirmed so far.</b> You can help on our
      <button class="lnkbtn" id="mkContrib">contribute page</button>.</p>
    <div class="wipnote">Work in progress</div>
    ${bad.length?`<div class="up bad"><div class="uw">⚠ ${bad.length} entr${bad.length===1?"y":"ies"}
      name a card that isn't in the database: ${esc(bad.map(x=>x.c).join(", "))}</div></div>`:""}
    ${(()=>{
      /* Anything found since the list was written — tagged or circled in the
         tagger — shows up here automatically as its own section. */
      const extra=CARDS.filter(c=>!mickIdx().has(c.f)
        &&(((c.mk||[]).length)||(c.tg||[]).includes("mousey")));
      if(!extra.length)return "";
      return `<h3 class="sec2">Found since</h3>
        <div class="micks">${extra.map(c=>`
          <button class="mick" data-mk="${esc(c.f)}">
            ${c.img?`<img src="${esc(String(c.img))}" alt="${esc(c.f)}" loading="lazy">`:""}
            <div class="mt">${esc(c.n)}<i>${esc(c.v)}</i></div>
            <div class="mw">${(c.mk||[]).length?"Marked — open it and hit Show me where.":"Tagged as having one."}</div>
          </button>`).join("")}</div>`})()}
    ${MICKEYS.map(g=>`
      <h3 class="sec2">${esc(g.set)}</h3>
      <div class="micks">${g.cards.map(x=>{
        const card=x.c?CARDS.find(c=>c.f===x.c):null;
        return `<${card?"button":"div"} class="mick"${card?` data-mk="${esc(card.f)}"`:""}>
          ${card&&card.img?`<img src="${esc(card.img)}" loading="lazy" alt="">`
            :`<div class="mkph">🂠</div>`}
          <div class="mkb"><div class="mkt">${esc(x.t||x.c)}</div>
            <div class="mkw">${esc(x.w)}</div></div>
        </${card?"button":"div"}>`}).join("")}</div>`).join("")}

    <div class="soon"><b>Spotted one we're missing?</b>
      <p>This list only covers the first two sets — the later ones have plenty and nobody has
        catalogued them properly. Send it in and it goes on the page.</p></div>

    <div class="soon"><b>About this list</b>
      <p class="small">Compiled from community reports and checked card by card against the database.
        A symbol doesn't have to be intentional to count — the pattern existing is enough,
        which is why a few of these are arguable. If you think one is a stretch, say so.</p></div>
  </div>`;
  const e=$("mkExit");if(e)e.onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
  $("mickpage").querySelectorAll("[data-mk]").forEach(b=>b.onclick=()=>openM(b.dataset.mk));
  {const mc=$("mkContrib");
   if(mc)mc.onclick=()=>{OPAGE="contrib";save("fs3_opage",OPAGE);showTab("tOther")};}
}

/* ===================== deck upgrades =====================
   Reads the deck you already have and says what to change. Deliberately ordered
   by how much each thing costs you: rules problems first (they lose you games
   outright), then curve (the most common real flaw), then the cards you're
   missing. Every suggestion is a specific card you can click, because "improve
   your curve" is advice and "add these four 2-drops" is help. */
const CUT_HINTS=[
 ["Six or more ink",   c=>c.c>=6],
 ["No abilities",      c=>!c.tx],
 ["Off-ink",           c=>false],   // filled in below with the deck's real inks
];
function upgradeReport(){
  const L=dlist(),tot=dtotal(),d=deck(),F=FMT[d.fmt];
  const inks=new Set();L.forEach(({c})=>c.co.forEach(i=>inks.add(i)));
  const co=d.fmt==="coconut"&&d.coco!=null?COCO[d.coco]:null;
  if(co)coInks(co).forEach(i=>inks.add(i));
  const have=new Set(L.map(x=>x.f));
  const inDeck=f=>have.has(f);
  const onInk=c=>!c.co.length||c.co.every(i=>inks.has(i));

  /* 1 — things that are actually wrong */
  const problems=[];
  L.forEach(({c,q})=>{const r=illegalReason(c);if(r)problems.push({c,q,why:r})});
  if(tot&&tot<F.min)problems.push({note:`${F.min-tot} more card${F.min-tot===1?"":"s"} to reach ${F.min}.`});
  if(inks.size>F.cap)problems.push({note:`${inks.size} inks used — ${F.l} allows ${F.cap}.`});

  /* 2 — curve, with real cards to fill each gap */
  const curve=curveCheck().filter(x=>!x.hit&&x.want>x.have).map(x=>({
    ...x,short:x.want-x.have,
    picks:CARDS.filter(c=>c.c===x.n&&c.ty==="Character"&&onInk(c)&&!inDeck(c.f)&&legal(c)&&c.f!==BANNED)
      .sort((a,b)=>(isStar(b.f)-isStar(a.f))||((b.lo||0)-(a.lo||0))||((b.st||0)-(a.st||0)))
      .slice(0,6)}));

  /* 3 — staples in your inks you simply don't have */
  const missing=[...inks].flatMap(i=>inkStaples(i)).filter(c=>!inDeck(c.f))
    .filter((c,i,a)=>a.findIndex(x=>x.f===c.f)===i);

  /* 4 — synergy: whatever this deck is already trying to do, more of it */
  const tribes={};L.forEach(({c,q})=>(c.tribal||[]).forEach(t=>tribes[t]=(tribes[t]||0)+q));
  const topTribe=Object.entries(tribes).sort((a,b)=>b[1]-a[1])[0];
  const synergy=[];
  if(topTribe){
    const [tribe]=topTribe;
    synergy.push({why:`Your deck already boosts ${tribe} characters`,
      cards:CARDS.filter(c=>c.sub.includes(tribe)&&onInk(c)&&!inDeck(c.f)&&legal(c)&&c.f!==BANNED)
        .sort((a,b)=>(isStar(b.f)-isStar(a.f))||a.c-b.c).slice(0,8)});
  }
  if(co&&(co.rec||[]).length){
    (co.rec||[]).slice(0,2).forEach(id=>{const ab=AB.find(x=>x.id===id);if(!ab)return;
      synergy.push({why:`${co.n} rewards “${ab.l}”`,
        cards:CARDS.filter(c=>c.ab.has(id)&&onInk(c)&&!inDeck(c.f)&&legal(c)&&c.f!==BANNED)
          .sort((a,b)=>a.c-b.c).slice(0,8)});
    });
  }

  /* 5 — what to take out. Ranked regardless of deck size (weakest first) --
     "cuts" only SHOWS this list when you're over the minimum, but the same
     ranking is also what swapSuggestions() below pairs a new card against,
     since a deck sitting exactly at 60 still has a weakest card worth
     trading up from. */
  const weakest=L.slice().sort((a,b)=>
      (illegalReason(b.c)?1:0)-(illegalReason(a.c)?1:0)||
      (onInk(a.c)?0:1)-(onInk(b.c)?0:1)||
      b.c.c-a.c.c||(a.c.tx?1:0)-(b.c.tx?1:0));
  const over=Math.max(0,tot-F.min);
  const cuts=over?weakest.slice(0,6):[];
  return {problems,curve,missing,synergy,cuts,weakest,over,tot,inks:[...inks],co,arch:tot?archetype():null};
}
/* Pairs the best available adds (curve gap, missing staple, synergy pick --
   in that priority order, since a hole in your curve costs you more games
   than a missing staple does) against your weakest current cards, so
   "here's what to change" is a single click instead of two separate lists
   you have to cross-reference yourself. Independent of deck size -- unlike
   the cut list above, this always has something to say as long as the deck
   has any cards in it and any legal card left to suggest. */
function swapSuggestions(r){
  const picks=[],usedIn=new Set(),usedOut=new Set();
  const addPick=(card,why)=>{
    if(!card||usedIn.has(card.f))return;
    const out=r.weakest.find(({c})=>!usedOut.has(c.f)&&c.f!==card.f);
    usedIn.add(card.f);if(out)usedOut.add(out.c.f);
    picks.push({card,why,out:out?out.c:null})};
  if(r.curve.length&&r.curve[0].picks.length)
    addPick(r.curve[0].picks[0],`Fills your curve at ${r.curve[0].n} ink`);
  if(r.missing.length)addPick(r.missing[0],`A staple in ${r.inks.join("/")}`);
  r.synergy.forEach(sy=>{if(sy.cards.length)addPick(sy.cards[0],sy.why)});
  return picks.slice(0,4);
}
function upCards(list){
  return `<div class="upcards">${list.map(c=>`
    <button class="upc" data-up="${esc(c.f)}">
      ${c.img?`<img src="${esc(c.img)}" loading="lazy" alt="">`:`<div class="ph"></div>`}
      <span class="un">${esc(c.n)}</span><span class="uc">${c.c} ink${isStar(c.f)?" · ★":""}</span>
    </button>`).join("")}</div>`;
}
/* Lives on the Decks tab, next to the deck it's actually about, instead of
   buried in the Other menu's full upgrade report -- see swapSuggestions()
   for how the pairing works. Empty string (nothing rendered) when there's
   no deck selected or nothing worth suggesting, so an empty/tiny deck
   doesn't show a box with nothing useful in it. */
function renderSwapBox(){
  const r=upgradeReport();
  if(!r.tot)return "";
  const sw=swapSuggestions(r);
  if(!sw.length)return "";
  const tile=(c,cls)=>c?`<div class="swtile ${cls}">
      ${c.img?`<img src="${esc(c.img)}" loading="lazy" alt="">`:`<div class="ph"></div>`}
    </div>`:`<div class="swtile ${cls}"></div>`;
  /* Collapsed by default, remembered once you've opened it -- same pattern as
     #special and #side. New enough (and machine-guessed enough) a feature
     that it shouldn't shout over the pull list you actually came here for. */
  return `<details class="swapbox" id="swapbox"${load("fs3_swapopen",false)?" open":""}>
    <summary>✨ Suggested swaps <span class="betatag">Beta</span></summary>
    <div class="swapbody">
      <p class="hint" style="margin:0 0 10px">Cards worth trying in place of your weakest ones right
        now — curve gaps and missing staples first. <a href="#" data-gotoupgrade="1">Full upgrade report →</a></p>
      <div class="swaplist">${sw.map(s=>`
        <div class="swapitem">
          ${tile(s.out,"out")}<span class="swarrow">→</span>${tile(s.card,"in")}
          <div class="swinfo"><span class="swn">${esc(s.card.f)}</span><span class="swwhy">${esc(s.why)}${
            s.out?` — instead of ${esc(s.out.f)}`:""}</span></div>
          <button class="btn go" data-swapin="${esc(s.card.f)}" data-swapout="${s.out?esc(s.out.f):""}">Swap</button>
        </div>`).join("")}</div>
    </div>
  </details>`;
}
function renderUpgrade(){
  const r=upgradeReport(),d=deck();
  const empty=!r.tot;
  $("uppage").innerHTML=`<div class="page">
    <button class="btn" id="upExit" style="margin-bottom:12px">← Other</button>
    <h1><span class="gi">🔧</span>Deck upgrades</h1>
    <p class="lede">Reading <b>${esc(DECKS.cur)}</b> — ${r.tot} cards, ${esc(FMT[d.fmt].l)}${
      r.inks.length?`, ${esc(r.inks.join(" / "))}`:""}.
      Click any suggestion to add it.</p>
    ${empty?`<div class="soon"><b>Nothing to read yet</b>
      <p>Add some cards in the Deck builder and come back — this page works off whatever
      deck you have selected.</p></div>`:`

    ${r.arch?`<div class="soon"><b>What it's doing</b>
      <p><span class="arch ${r.arch.k}">${r.arch.k.toUpperCase()}</span> ${esc(r.arch.why)}</p></div>`:""}

    ${r.problems.length?`<h3 class="sec2">Fix these first</h3>
      <div class="ups">${r.problems.map(p=>p.note
        ?`<div class="up bad"><div class="uw">${esc(p.note)}</div></div>`
        :`<div class="up bad"><div class="ut">${esc(p.c.f)} ×${p.q}</div>
           <div class="uw">${esc(p.why)}</div></div>`).join("")}</div>`
      :`<div class="up good"><div class="uw">✓ No rules problems.</div></div>`}

    ${r.curve.length?`<h3 class="sec2">Curve gaps</h3>
      <p class="hint" style="margin:-4px 0 10px">The most common thing wrong with a deck isn't the
        card choices, it's having nothing to do on turns two and three.</p>
      ${r.curve.map(x=>`<div class="upblock">
        <div class="uh">${x.short} more at <b>${x.n} ink</b> <span>(you have ${x.have}, want about ${x.want})</span></div>
        ${x.picks.length?upCards(x.picks):`<div class="hint">Nothing left in your inks at this cost.</div>`}
      </div>`).join("")}`:`<div class="up good"><div class="uw">✓ Early curve looks fine.</div></div>`}

    ${r.missing.length?`<h3 class="sec2">Staples you're missing</h3>
      <p class="hint" style="margin:-4px 0 10px">Tagged staples in ${esc(r.inks.join(" / "))} that aren't in the deck.</p>
      ${upCards(r.missing)}`:""}

    ${r.synergy.map(sy=>`<h3 class="sec2">${esc(sy.why)}</h3>${
      sy.cards.length?upCards(sy.cards):`<div class="hint">Nothing else in your inks fits.</div>`}`).join("")}

    ${r.over?`<h3 class="sec2">You're ${r.over} over — cut candidates</h3>
      <p class="hint" style="margin:-4px 0 10px">Ordered by what's least likely to be missed: not-legal
        first, then off-ink, then your most expensive cards.</p>
      <div class="ups">${r.cuts.map(({c,q})=>`<div class="up">
        <div class="ut">${esc(c.f)} ×${q}</div>
        <div class="uw">${c.c} ink${illegalReason(c)?" · "+esc(illegalReason(c)):""}${c.tx?"":" · no abilities"}</div>
        <button class="btn bad" data-cut="${esc(c.f)}">Remove one</button></div>`).join("")}</div>`:""}
    `}
  </div>`;
  const ex=$("upExit");if(ex)ex.onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
  $("uppage").querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{
    if(addCard(b.dataset.up)){toast("Added "+b.dataset.up);renderUpgrade()}});
  $("uppage").querySelectorAll("[data-cut]").forEach(b=>b.onclick=()=>{
    delCard(b.dataset.cut);toast("Removed one");renderUpgrade()});
}

/* ===================== error cards =====================
   Everything here is sourced and dated. These are factual claims about physical
   product that affect what people pay for cards, so nothing is written from
   memory — the errata list comes from Lorcana Player's tracking article and the
   replacement rules come from Ravensburger's own PDF (18 Dec 2025 revision).
   Where something is community-reported rather than confirmed, it says so. */
const ERRATA=[
 {c:"Chief Tui - Respected Leader", s:"The First Chapter", w:"Support printed without the word “another”, so it could buff itself",
  fixed:"Corrected from the 2nd print run"},
 {c:"HeiHei - Boat Snack", s:"The First Chapter", w:"Support printed without “another”",
  fixed:"Corrected from the 2nd print run"},
 {c:"Merlin - Self-Appointed Mentor", s:"The First Chapter", w:"Support printed without “another”",
  fixed:"Corrected from the 2nd print run"},
 {c:"Philoctetes - Trainer of Heroes", s:"The First Chapter", w:"Support printed without “another”",
  fixed:"Corrected from the 2nd print run"},
 {c:"Befuddle", s:"The First Chapter", w:"Read “Return a character…” instead of “Return chosen character…”, which would have dodged Ward",
  fixed:"Corrected from the 2nd print run"},
 {c:"Work Together", s:"The First Chapter", w:"Flavour text credits “Pasha”; the character is spelled Pacha",
  fixed:"Corrected from the 2nd print run"},
 {c:"Simba - Returned King (Enchanted)", s:"The First Chapter", w:"Challenger reminder reads “When challenging” instead of “While challenging”",
  fixed:"Still uncorrected", open:true},
 {c:"HeiHei - Boat Snack (League promo)", s:"Lorcana League", w:"Same missing “another” as the set version",
  fixed:"Won't be reprinted — promo run is closed", open:true},
 {c:"Captain Hook - Forceful Duelist (D23 Expo)", s:"D23 Expo promo", w:"Challenger reminder reads “when” rather than “while”; The First Chapter printed it correctly",
  fixed:"One-off promo, never reprinted", open:true},
];
const ERRATA_INTL=[
 {c:"Stitch - Carefree Surfer", l:"French + German", w:"Printed with 1 lore instead of 2. The only Lorcana card known to have a wrongly printed stat. The Enchanted version is correct in every language."},
 {c:"Ariel - Spectacular Singer", l:"German only", w:"Wrong artist credited — printed as Michael “Cookie” Niewiadomy, should be Alice Pisoni."},
 {c:"Prince Phillip - Dragonslayer", l:"French", w:"Text reversed the trigger: said if he was challenged and banished, rather than if he challenges and is banished."},
 {c:"Coconut Basket", l:"French", w:"Said “chosen opponent's character” instead of “chosen character”."},
 {c:"Frying Pan", l:"German", w:"Said “chosen opponent's character” instead of “chosen character”."},
 {c:"Cruella De Vil - Miserable as Usual", l:"French + German", w:"Wording changed to “challenged and banished” rather than “banished by a challenge”."},
 {c:"Mother Knows Best", l:"French", w:"“Choisissez et” added so the card actually chooses a character."},
 {c:"Befuddle", l:"French + German", w:"Same missing “chosen” as the English printing."},
];
const MISPRINTS=[
 ["Miscut","Cut off-centre badly enough that you can see another card, the sheet edge, or a filler card."],
 ["Filler card","Blank or placeholder cards used to fill a print sheet. Meant to be destroyed at the factory; some escape into packs."],
 ["Crimped","A pressing line across the card from the packaging machinery."],
 ["Off-centre","Borders noticeably uneven. Common, and usually not replaceable."],
 ["Ink / print flaw","Streaks, spots, missing foil layer, doubled printing."],
 ["Wrong back","A card whose reverse doesn't match the front — the rarest and most sought-after class."],
];
function renderErr(){
  const known=CARDS.filter(c=>ERRATA.some(e=>e.c.replace(/ \(.*\)$/,"")===c.f));
  $("errpage").innerHTML=`<div class="page">
    <button class="btn" id="erExit" style="margin-bottom:12px">← Other</button>
    <h1><span class="gi">⚠️</span>Error cards</h1>
    <p class="lede">Two different things get called “error cards”. An <b>errata</b> is a text mistake
      made before printing, so every copy of that run has it. A <b>misprint</b> is a manufacturing
      accident on one physical card. Errata are collectible curiosities; misprints are lottery tickets.</p>

    <div class="sellbox">
      <div>
        <b>Got a misprint?</b>
        <p>Lorcanarob buys error cards. Send him a photo and he'll make you an offer.</p>
      </div>
      <a class="sellbtn" href="https://www.instagram.com/lorcanarob/" target="_blank" rel="noopener noreferrer">
        Sell your error cards to Lorcanarob →</a>
    </div>

    <h3 class="sec2">English errata — The First Chapter</h3>
    <p class="hint" style="margin:-4px 0 10px">Seven cards in the first English print run, plus two promos.
      Six were fixed from the second print run onward, so a first-print copy is the collectible one.</p>
    <div class="errs">${ERRATA.map(e=>`
      <div class="err${e.open?" open":""}">
        <div class="ec">${esc(e.c)}</div>
        <div class="ew">${esc(e.w)}</div>
        <div class="ef">${e.open?"⏳ ":"✓ "}${esc(e.fixed)}</div>
      </div>`).join("")}</div>

    <h3 class="sec2">French &amp; German printings</h3>
    <p class="hint" style="margin:-4px 0 10px">The other languages have their own list, and it doesn't
      line up with the English one — neither had the Support mistake, but both had others.</p>
    <div class="errs">${ERRATA_INTL.map(e=>`
      <div class="err">
        <div class="ec">${esc(e.c)} <span class="lang">${esc(e.l)}</span></div>
        <div class="ew">${esc(e.w)}</div>
      </div>`).join("")}</div>

    <h3 class="sec2">Kinds of misprint</h3>
    <div class="errs">${MISPRINTS.map(([t,d])=>`
      <div class="err"><div class="ec">${esc(t)}</div><div class="ew">${esc(d)}</div></div>`).join("")}</div>

    <h3 class="sec2">Will Ravensburger replace it?</h3>
    <div class="soon">
      <b>The short version</b>
      <p>Only <b>Rare or higher</b>. Commons and uncommons are never replaced, foil or not.</p>
      <p>You need a receipt from an <b>authorised retailer</b> — secondary market and Amazon don't count,
        and neither does anything won at Organised Play.</p>
      <p>Within <b>7 days of the receipt date</b>, and within <b>6 months of the set's release</b>.</p>
      <p>You'll need a photo of the card <b>with a handwritten note showing your name and the date</b>,
        a photo of the receipt, and the batch ID from the back of the packaging.</p>
      <p class="small">Summarised from Ravensburger's Disney Lorcana Replacement Policy, revision dated
        18 December 2025. Read the real thing before you file — this is a summary, not the policy.</p>
    </div>

    <div class="soon">
      <b>Sources</b>
      <p><a href="https://lorcanaplayer.com/disney-lorcana-the-first-chapter-errata-cards/" target="_blank" rel="noopener noreferrer">Lorcana Player — The First Chapter Error/Errata Cards ↗</a><br>
      <a href="https://www.misprintedlore.com/error-types" target="_blank" rel="noopener noreferrer">Misprinted Lore — Guide to Error Types ↗</a><br>
      <a href="https://cdn.ravensburger.com/lorcana/community-code-en" target="_blank" rel="noopener noreferrer">Ravensburger Community Code ↗</a></p>
      <p class="small">Compiled by hand and not official. If you spot something missing or wrong,
        tell me and I'll fix it.</p>
    </div>
  </div>`;
  const e=$("erExit");if(e)e.onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
}

/* ===================== getting started ===================== */
function renderStart(){
  const n=CARDS.length.toLocaleString(),tg=CARDS.filter(c=>(c.tg||[]).length).length.toLocaleString();
  $("startpage").innerHTML=`<div class="page">
    <button class="btn" id="stExit" style="margin-bottom:12px">← Other</button>
    <h1><span class="gi">🚀</span>Getting started</h1>
    <p class="lede">Everything here works without an account and nothing leaves your browser.
      ${n} cards, every printing, no loading spinner.</p>

    <div class="ctile"><h3>1 · Search the way you actually think</h3>
      <p>Most card sites make you know the name. This one doesn't. With <b>🎨 Search art</b> on
        (it is by default) you can type what the picture looks like — <b>blue dog</b> finds Stitch,
        <b>sea witch</b> finds Ursula. ${tg} cards are findable this way so far.</p>
      <p>Type a keyword, classification, franchise, illustrator or ink and press <b>Enter</b> and it
        becomes a removable pill. Everything you add narrows the results together.</p>
      <p class="small">Try: <code>artist:kole</code> · <code>cost&lt;=2</code> · <code>bonus strength</code> ·
        <code>text:"draw a card"</code> · <code>-inkwell</code></p></div>

    <div class="ctile"><h3>2 · Build a deck by clicking cards</h3>
      <p>Click any card to add it. The rail on the right tracks your curve, ink split, inkable
        percentage and whether anything's off-ink or over the copy limit. Not-legal cards get a small
        red note rather than being blocked — it's your deck.</p>
      <p>Switch format at the top right. <b>Infinity</b> and <b>Core</b> allow 2 inks and 4 copies;
        <b>Coconut</b> allows 3 inks and is singleton, except for the card your Coconut names.</p></div>

    <div class="ctile"><h3>3 · Let the Coconut build guide you</h3>
      <p><b>Guided Coconut Build</b> walks you through it: pick your Coconut, and it ranks every ink
        pair by how densely that ink actually supports the card you chose. Then copies, staples, and the
        filters worth caring about — highlighted green over in Search.</p></div>

    <div class="ctile"><h3>4 · Take it to the binder</h3>
      <p>The <b>Decks</b> tab turns any deck into a pull list, sorted the way your binder is —
        by set and collector number, by ink, or alphabetically. Print it or copy it as text.</p></div>

    <div class="ctile"><h3>5 · The rest</h3>
      <p><b>Other</b> has the reading tool, four guessing games, dust, titles and secrets. Play around
        and things unlock. Some of them aren't listed anywhere.</p></div>

    <div class="soon"><b>Two things worth knowing</b>
      <p>Everything saves to <b>this browser</b> — decks, staples, dust, tags. Clearing site data wipes it.
        Accounts are coming.</p>
      <p>Card data comes from LorcanaJSON and images from Lorcast, baked in at build time. That's why it
        loads instantly and works offline, and why the date at the top right tells you how fresh it is.</p></div>
  </div>`;
  const e=$("stExit");if(e)e.onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
}

/* ===================== contribute =====================
   The vague search is the whole differentiator, and it only works because
   someone has described the art. That makes this page the growth mechanism, so
   it explains WHY as much as HOW — nobody tags 2,500 cards out of politeness. */
function renderContrib(){
  const tagged=CARDS.filter(c=>(c.tg||[]).length).length;
  const noted=CARDS.filter(c=>(c.rsi||[]).length).length;
  $("contribpage").innerHTML=`<div class="page">
    <button class="btn" id="cbExit" style="margin-bottom:12px">← Other</button>
    <h1><span class="gi">🤝</span>Contribute</h1>
    <p class="lede">Every other Lorcana site can tell you a card's cost. This one can find
      "blue dog" — but only for cards somebody has actually described. That's the bit you can help with.</p>

    <div class="cstat">
      <div><b>${tagged.toLocaleString()}</b><i>cards findable by art</i></div>
      <div><b>${(CARDS.length-tagged).toLocaleString()}</b><i>still undescribed</i></div>
      <div><b>${noted}</b><i>cards with community notes</i></div>
    </div>

    <div class="ctile">
      <h3>🏷️ Tag the art</h3>
      <p><a href="https://lorcana707.github.io/Flounder-art-tagger/" target="_blank" rel="noopener noreferrer">
        Open the art tagger ↗</a> — look at a card, press a few keys. Facing left, two
        characters, feet visible, holding a weapon — whatever you'd actually type looking for it later.
        It saves as you go and you can stop any time.</p>
      <p class="small">Roughly three seconds a card once you get going. Fifty cards is a coffee.</p>
    </div>

    <div class="ctile">
      <h3>📝 Write a note</h3>
      <p><a href="https://lorcana707.github.io/RSI-Rules-inputting/" target="_blank" rel="noopener noreferrer">
        Open the rules text inputter ↗</a> — write what people get wrong about a card: a ruling,
        an interaction, a trap. Pick a kind (Ruling, Watch out, Ben's take, Trivia, Video), and if it's
        an interaction between two cards, add both and it gets written to each.</p>
      <p class="small">There's a Discord importer in there too: paste a conversation and it splits the
        messages up and guesses which card each one is about.</p>
    </div>

    <div class="ctile">
      <h3>📤 Sending it in</h3>
      <p>Hit <b>Export</b> in either tool and mail the JSON to
        <a href="mailto:lorcana707@gmail.com?subject=Ready%20Set%20Ink%20contribution">lorcana707@gmail.com</a>.
        I check it over and it goes live on the next build.</p>
      <p class="small">Both tools store everything in your own browser until you export, so nothing
        leaves your machine unless you send it.</p>
    </div>

    <div class="soon">
      <b>Where this is going</b>
      <p>Emailing JSON around works for a handful of people and stops working at a dozen. Once the
        site is hosted with logins, both tools will submit straight into a review queue instead —
        so contributions carry your name, you can see your tags live on the site, and a single bad
        batch can be rolled back without unpicking everyone else's work.</p>
    </div>
  </div>`;
  const e=$("cbExit");if(e)e.onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
}

