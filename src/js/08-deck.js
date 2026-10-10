/* ===================== deck ===================== */
function addCard(f){
  if(f===BANNED){unlockHidden("h_chip");alert(BAN_MSG);return false}
  /* Ben's salt warning. Fires once per session so it's a joke, not a nag. */
  if(f==="Christopher Robin - Hunny Sage"&&!SALTED){SALTED=true;
    alert("🧂 SALT WARNING\n\nThis is a bad card. You might think it's cool, but when you "+
          "play it against any real deck you may become salty.");}
  const c=CARDS.find(x=>x.f===f);
  mark("adding "+(c?c.n:f));
  const d=deck();d.cards[f]=(d.cards[f]||0)+1;touchDeck();renderDeck();refreshTiles();
  award("firstcard");return true}
function delCard(f){const d=deck();if(!d.cards[f])return;
  {const c=CARDS.find(x=>x.f===f);mark("removing "+(c?c.n:f))}
  d.cards[f]--;
  if(d.cards[f]<=0)delete d.cards[f];touchDeck();renderDeck();refreshTiles()}
function dlist(){return Object.entries(deck().cards).map(([f,q])=>({c:CARDS.find(x=>x.f===f),q,f})).filter(x=>x.c)}
function dtotal(){return Object.values(deck().cards).reduce((a,b)=>a+b,0)}

/* `host` lets the guided view reuse this whole panel. Everything below binds
   through it rather than through a hard-coded "deck". */
function renderDeck(hostId){
  const HOST=$(hostId||"deck");if(!HOST)return;
  const d=deck(),F=FMT[d.fmt],L=dlist(),tot=dtotal();
  $("mN").textContent=tot;
  const names=Object.keys(DECKS.list);
  /* ---- the two menus -----------------------------------------------------
     The header used to carry nine controls in a row: a view toggle, undo,
     save, a deck picker, and four icon buttons whose meaning you had to hover
     to learn. Ben's call: put them behind a ⋯ and let the panel be about the
     deck.

     Two menus, not one, because they answer different questions. ⋯ is "what do
     I want to DO to this deck" — and Paste a list is first in it, because
     importing is how most decks start. 👁 is "how do I want to LOOK at it" —
     the grouping and the names/images switch, which change nothing and undo
     nothing. Mixing a delete into the same list as a display preference is how
     people delete decks.

     Every id here is the one it always was, so all the wiring below still
     finds these buttons wherever they now sit. */
  /* Declared here rather than further down, because the Group by row is built
     into the 👁 menu at the top of the panel now and a const can't be read
     before its own declaration runs. */
  const DSORTS=[["type","Type — characters, actions, songs…"],
    ["cost","Cost — one section per ink cost"],
    ["ink","Ink colour"],
    ["curve","Curve — one flat list, cheapest first"],
    ["set","Set — newest first"],
    ["name","Name A–Z"]];
  const sortRow=`<div class="dsortrow"><label for="dsort">Group by</label><select id="dsort">${
    DSORTS.map(([v,l])=>`<option value="${v}"${DSORT===v?" selected":""}>${esc(l)}</option>`).join("")}</select></div>`;
  /* Ink pips for the top-right corner — computed here, ahead of the Stats
     section further down, which builds the same ic-per-ink tally but for a
     different job (share-of-deck bars). A deck with no cards yet shows no
     pips rather than a row of empty circles. */
  const inkSet=new Set();L.forEach(({c})=>c.co.forEach(i=>inkSet.add(i)));
  const inkPips=[...inkSet].sort().map(i=>
    `<span class="dpip" style="background:${HEX[i]||"#666"}" title="${esc(i)}"></span>`).join("");
  const editedStr=d.ts?new Date(d.ts).toLocaleDateString(undefined,
    {month:"short",day:"numeric",year:"numeric"}):"not saved yet";
  let h=`<div class="dtop">
      <div class="dtitle">Deck
        <span class="dmenus">
          <button class="dmbtn" id="dEye" aria-haspopup="true" aria-expanded="false"
            title="How this deck is shown">👁</button>
          <button class="dmbtn" id="dMore" aria-haspopup="true" aria-expanded="false"
            title="Deck options">⋯</button>
        </span>
      </div>
      <div class="dinks">${inkPips}</div>
    </div>
    <div class="dmwrap">
      <div class="dmpanel" id="dEyePanel" role="menu" hidden>
        <div class="dmlbl">Show the deck as</div>
        <div class="vtog">
          <button id="vList" class="${DVIEW==="img"?"":"on"}">Names</button>
          <button id="vImg" class="${DVIEW==="img"?"on":""}">Images</button></span>
        </div>
        ${sortRow}
      </div>
      <div class="dmpanel wide" id="dMorePanel" role="menu" hidden>
        <button class="dmi" id="dimp" role="menuitem"><i>📥</i>Paste a deck list</button>
        <button class="dmi" id="dundo" role="menuitem"${UNDO.length?"":" disabled"}><i>↶</i>Undo</button>
        <button class="dmi" id="dbSave" role="menuitem"><i>💾</i>${DECKS.cur===DRAFT?"Save deck":"Save changes"}</button>
        <div class="dmsep"></div>
        <button class="dmi" id="dnew" role="menuitem"><i>➕</i>New deck</button>
        <button class="dmi" id="ddup" role="menuitem"><i>⧉</i>Duplicate this deck</button>
        <button class="dmi" id="dren" role="menuitem"><i>✏️</i>Rename this deck</button>
        <button class="dmi" id="dlink" role="menuitem"><i>🔗</i>Share this deck</button>
        <div class="dmsep"></div>
        <div class="dmlbl">Format</div>
    <!-- Format lives here, not in the bar above. It decides how many inks you
         may use, how many copies of a card, and which cards are legal at all —
         every warning below is downstream of it. As a bare dropdown in the
         masthead it read as a page setting; here it reads as part of the deck,
         which is what it is. -->
    <div class="fmtpick" id="fmtpick">
      <div class="fmtlbl">Format</div>
      <div class="fmtbtns">${FMT_ORDER.map(k=>[k,FMT[k]]).map(([k,f])=>
        `<button class="fmtb${k===d.fmt?" on":""}" data-fmt="${k}">${esc(f.l)}</button>`).join("")}</div>
      <div class="fmtwhy">${esc(FMT_BLURB[d.fmt]||"")}</div>
    </div>
        <div class="dmsep"></div>
        <button class="dmi bad" id="ddel" role="menuitem"><i>🗑</i>Delete this deck</button>
      </div>
    </div>
    <div class="dhead">
      <div class="dhname"><b id="dbName" class="dkname" role="button" tabindex="0"
        title="Click to rename">${esc(DECKS.cur)}</b>
        <span id="dbDirty" class="dbdirty"${DECKDIRTY?"":" hidden"}>unsaved</span></div>
    </div>
    <div class="row"><select id="dsel" aria-label="Switch deck">${
    names.map(n=>`<option${n===DECKS.cur?" selected":""}>${esc(n)}</option>`).join("")}</select></div>
    <div class="prog"><i style="width:${Math.min(100,tot/F.min*100)}%"></i></div>
    <div class="dfoot">${tot} / ${F.min} cards · ${F.l} · edited ${editedStr}</div>`;

  /* The panel is built in three pieces, and the order they end up in is the
     whole point of this function.

     It used to be one string, and the deck's own cards were the very last
     thing appended to it — behind the name, the format picker, the stats, the
     price, the curve, the ink and type legends, the warnings, the analysis and
     the advice. On a 60-card deck that put the first card you own about 1,250
     pixels down a panel you had to scroll to reach. You were looking at a deck
     builder that would not show you your deck.

     So: `h` is the small amount that has to sit above the cards — which deck
     this is, whether it's saved, how full it is, and anything actually wrong
     with it. `hCards` is the deck. `hBelow` is everything you consult rather
     than watch: format, sharing, stats, curve, analysis, what I'd change. All
     of it still here, none of it in front of the cards.

     The format still reads at a glance in the count line above ("24 / 60
     cards · Infinity"), which is why the picker itself is comfortable moving
     down with the rest of the reference material. */
  let hBelow=``;

  if(d.fmt==="coconut"){
    hBelow+=`<h3>Coconut</h3><select id="csel"><option value="">— none —</option>${
      COCO.map((c,i)=>`<option value="${i}"${String(d.coco)===String(i)?" selected":""}>${esc(c.n)} – ${esc(c.v)} (${coInks(c).join("/")})</option>`).join("")}</select>`;
    if(d.coco!=null&&COCO[d.coco]){const co=COCO[d.coco];
      hBelow+=`<div class="st" style="background:var(--platinum);border:1px solid var(--line);border-radius:8px;padding:8px;margin-top:6px">
        <b style="color:var(--gold)">${esc(co.n)} – ${esc(co.v)}</b><br>${esc(co.t)}</div>`}
  }

  if(tot){
    const cv=[0,0,0,0,0,0,0,0];let ink=0,pips=0;const ic={},ty={};
    L.forEach(({c,q})=>{cv[Math.min(7,c.c)]+=q;if(c.ik)ink+=q;pips+=c.c*q;
      c.co.forEach(i=>ic[i]=(ic[i]||0)+q);ty[c.ty]=(ty[c.ty]||0)+q});
    const mx=Math.max(...cv,1),icT=Object.values(ic).reduce((a,b)=>a+b,0)||1;
    const avg=(pips/tot).toFixed(1),inkPc=Math.round(ink/tot*100);
    /* Four numbers a deck is actually judged on, then the curve. The curve
       carries its own counts and a share-of-deck line, because "7 cards" means
       nothing without "that's 12% of the deck". Inkable is flagged red under
       40% — that's the number that decides whether the deck functions. */
    hBelow+=`<h3>Stats</h3>
      <div class="dstats">
        <div class="dstat"><b>${tot}</b><i>cards</i></div>
        <div class="dstat"><b>${avg}</b><i>avg cost</i></div>
        <div class="dstat${inkPc<40?" warn":""}"><b>${inkPc}%</b><i>inkable</i></div>
        <div class="dstat"><b>${Object.keys(ic).length}</b><i>ink${Object.keys(ic).length===1?"":"s"}</i></div>
      </div>
      ${(()=>{
        /* What the deck costs, and what the rest of it would cost. REAL market
           prices, never the Flounder Price — this is a number somebody might
           take to a checkout. Only shown when the build actually has prices. */
        if(!priceDate())return "";
        let all=0,mine=0,unknown=0;
        L.forEach(({c,q})=>{
          const p=rawPrice(c);
          if(p==null){unknown+=q;return}
          all+=p*q;
          const have=COLLON?Math.min(q,ownedByName(c)):0;
          mine+=p*(q-have);
        });
        if(!all)return "";
        return `<div class="dcost">
          <span>About <b>${money(Math.round(all*100)/100)}</b> to buy this deck</span>
          ${COLLON&&mine<all?`<span class="dcost2"><b>${money(Math.round(mine*100)/100)}</b> of it you don't own yet</span>`:""}
          ${unknown?`<span class="dcost2">${unknown} card${unknown===1?"":"s"} with no price</span>`:""}
          <button class="btn go" id="dbuy">Buy the missing cards</button>
        </div>`;
      })()}
      <div class="curveW">
        ${cv.map((v,i)=>`<div class="cbar"${v?"":' class="cbar z"'}>
          <span class="cn">${v||""}</span>
          <div class="cfill" style="height:${Math.round(v/mx*100)}%"></div>
          <span class="cl">${i===7?"7+":i}</span></div>`).join("")}
      </div>
      <div class="st">Cost curve · ${cv.slice(0,4).reduce((a,b)=>a+b,0)} cards at 3 ink or less
        (${Math.round(cv.slice(0,4).reduce((a,b)=>a+b,0)/tot*100)}%)</div>
      <div class="ibar">${Object.entries(ic).map(([i,n])=>`<i style="width:${n/icT*100}%;background:${HEX[i]||"#666"}" title="${esc(i)} ${n}"></i>`).join("")}</div>
      <div class="inkleg">${Object.entries(ic).sort((a,b)=>b[1]-a[1]).map(([i,n])=>
        `<span><i style="background:${HEX[i]||"#666"}"></i>${esc(i)} <b>${n}</b></span>`).join("")}</div>
      <div class="tyleg">${Object.entries(ty).sort((a,b)=>b[1]-a[1]).map(([t,n])=>
        `<span>${esc(t)} <b>${n}</b></span>`).join("")}</div>`;
  }

  const w=deckWarnings();
  const illegalN=L.filter(({c})=>illegalReason(c)).length;
  h+=`<div class="warns">${w.length?w.slice(0,8).map(x=>`<div class="wn">⚠ ${esc(x)}</div>`).join("")
      :(tot?`<div class="okm">✓ No rules issues.</div>`:"")}</div>`;
  /* Warnings are the exception that stays on top. Everything else down there
     is something you go and look at; a rules problem is something that has to
     come and find you, so it sits with the card count where you can't miss it. */
  hBelow+=`<div class="acts">
      <button class="btn" id="dc">Copy</button>
      <button class="btn" id="dim">Import deck</button>
      ${illegalN?`<button class="btn bad" id="drm">Remove not legal cards (${illegalN})</button>`:""}
      <button class="btn bad" id="dx">Clear</button></div>`;
  if(tot){
    const a=archetype(),cv=curveCheck();
    hBelow+=`<details class="sec" style="margin-top:12px"${DANA?" open":""} id="dana">
      <summary>Deck analysis</summary><div class="sb">
      <div class="st">Plays like</div><span class="arch ${a.k}">${a.k.toUpperCase()}</span>
      <div class="st">${esc(a.why)}</div>
      <div class="st" style="margin-top:9px">Early curve — green means you've hit the target</div>
      <div class="curveT">${cv.map(x=>`<div class="${x.hit?"hit":""}"><b>${x.have}</b>${x.n} ink<br><span style="opacity:.7">want ${x.want}</span></div>`).join("")}</div>
      <div class="acts"><button class="btn" id="dh">Sample hand</button>
        <button class="btn" id="dgf">Goldfish 1,000 hands</button></div>
      <div id="hb"></div><div id="gf"></div></div></details>`;
    /* ---- "What I'd change" is shelved -------------------------------------
       Ben's call, 2026-09-06: the advice isn't good enough to be giving people
       yet, so nothing about it should be on screen. Turned off here rather
       than deleted — deckAdvice() and its whole rule set are untouched below,
       and flipping this back to true is the only thing needed to bring it
       back once the rules are worth reading. */
    const DOCTOR_ON=false;
    const adv=DOCTOR_ON?deckAdvice():[];
    if(adv.length){
      hBelow+=`<div class="doc">
        <div class="dochd">What I'd change</div>
        ${adv.map(a=>`<div class="docl s${a.sev}">${esc(a.s)}</div>`).join("")}
        <p class="docnote">Rules of thumb, not rules. If you're breaking one on purpose,
          you're probably right and this is wrong.</p>
      </div>`;
    }else if(DOCTOR_ON&&tot>=15){
      hBelow+=`<div class="doc"><div class="dochd">What I'd change</div>
        <div class="docl s0">Nothing obvious. The ink, the curve, the removal and the draw
          all sit about where they usually want to be.</div></div>`;
    }
  }
  // − on the LEFT, + on the RIGHT
  /* ---- deck sorting ------------------------------------------------------
     One flat list sorted by cost is how a spreadsheet thinks about a deck, not
     how a player does. You don't look for "the 3-drops", you look for "my
     removal" or "my songs" — so every sort here GROUPS first and sorts inside
     the group, with a heading and a count on each group. Characters, Actions,
     Songs, Items and Locations are five different jobs and never share a
     section again.

     A song is typed "Action — Song" in the data, so the Song test has to come
     before the Action one or every song lands in Actions. */
  const cardGroup=c=>c.sub.includes("Song")?"Song"
    :(c.ty==="Character"||c.ty==="Action"||c.ty==="Item"||c.ty==="Location")?c.ty:"Other";
  const TYPE_ORDER=["Character","Action","Song","Item","Location","Other"];
  const TYPE_PLURAL={Character:"Characters",Action:"Actions",Song:"Songs",
    Item:"Items",Location:"Locations",Other:"Other"};
  const byCost=(a,b)=>a.c.c-b.c.c||a.f.localeCompare(b.f);
  /* Each sort returns [heading, rows] pairs. A single unnamed group renders as
     a plain list, which is what "flat" wants. */
  const GROUPERS={
    type:()=>TYPE_ORDER
      .map(t=>[TYPE_PLURAL[t],L.filter(x=>cardGroup(x.c)===t).sort(byCost)])
      .filter(([,r])=>r.length),
    cost:()=>{
      const buckets=[...new Set(L.map(x=>x.c.c))].sort((a,b)=>a-b);
      return buckets.map(n=>[`${n} ink`,L.filter(x=>x.c.c===n).sort((a,b)=>a.f.localeCompare(b.f))])},
    ink:()=>{
      const keyOf=x=>x.c.co.length>1?x.c.co.join(" / "):(x.c.co[0]||"—");
      const keys=[...new Set(L.map(keyOf))].sort((a,b)=>
        (a.includes("/")?1:0)-(b.includes("/")?1:0)||a.localeCompare(b));
      return keys.map(k=>[k,L.filter(x=>keyOf(x)===k).sort(byCost)])},
    curve:()=>[["",L.slice().sort(byCost)]],
    set:()=>{
      const keys=[...new Set(L.map(x=>x.c.s))]
        .sort((a,b)=>String((DATA.sets[b]||{}).d||"").localeCompare(String((DATA.sets[a]||{}).d||"")));
      return keys.map(s=>[(DATA.sets[s]||{}).name||("Set "+s),
        L.filter(x=>x.c.s===s).sort((a,b)=>(a.c.num||0)-(b.c.num||0))])},
    name:()=>[["",L.slice().sort((a,b)=>a.f.localeCompare(b.f))]]};
  const groups=(GROUPERS[DSORT]||GROUPERS.type)();
  let hCards="";
  const cardHTML=({c,q,f})=>DVIEW==="img"
    ? `<div class="dcard">${c.img?`<img src="${cImg(c)}" data-o="${esc(f)}" title="${esc(c.f)}">`
        :`<div class="ph" data-o="${esc(f)}">${esc(c.n)}</div>`}
       <span class="dq">${q}<i>x</i></span>
       <div class="dbtn"><button class="m" data-m="${esc(f)}">−</button>
         <button class="s" data-swap="${esc(f)}" title="What else could go here?">⇄</button>
         <button class="p" data-p="${esc(f)}">+</button></div>
      </div>`
    : `<div class="dl"><button data-m="${esc(f)}" title="Remove one">−</button>
       <span class="q">${q}×</span>
       <span class="n" data-o="${esc(f)}">${esc(c.n)} <span style="color:var(--deep)">${esc(c.v)}</span></span>
       <button data-swap="${esc(f)}" title="What else could go here?">⇄</button>
       <button data-p="${esc(f)}" title="Add one">+</button></div>`;
  hCards+=L.length
    ? groups.map(([title,rows])=>{
        const n=rows.reduce((a,x)=>a+x.q,0);
        return (title?`<div class="dgh">${esc(title)}<span>${n} card${n===1?"":"s"}</span></div>`:"")
          +(DVIEW==="img"
            ? `<div class="dgrid">${rows.map(cardHTML).join("")}</div>`
            : `<div style="margin-top:6px">${rows.map(cardHTML).join("")}</div>`)}).join("")
    : `<div class="empty" style="padding:18px 6px">Click a card to add it.</div>`;
  HOST.innerHTML=h+hCards+hBelow;

  const ds=$("dsort");
  if(ds)ds.onchange=e=>{DSORT=e.target.value;save("fs3_dsort",DSORT);renderDeck()};
  /* Drag the left edge of the deck panel to widen it. */
  (()=>{
    const dk=HOST;
    const wrap=dk.closest(".wrap");if(!wrap||wrap.querySelector(":scope > .dgrip"))return;
    const g=document.createElement("div");g.className="dgrip";g.title="Drag to resize";
    wrap.appendChild(g);
    g.addEventListener("pointerdown",ev=>{
      ev.preventDefault();g.classList.add("on");document.body.classList.add("resizing");
      const move=e=>{
        /* Measured from the RIGHT edge of the wrap, so the panel grows as you
           drag left — which is the direction that feels correct. */
        const w=Math.round(wrap.getBoundingClientRect().right-e.clientX);
        const clamped=Math.max(280,Math.min(w,Math.round(window.innerWidth*0.7)));
        wrap.style.setProperty("--deckw",clamped+"px")};
      const up=()=>{g.classList.remove("on");document.body.classList.remove("resizing");
        save("fs3_deckw",wrap.style.getPropertyValue("--deckw"));
        window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)};
      window.addEventListener("pointermove",move);window.addEventListener("pointerup",up)});
  })();
  /* One open at a time, closed by a click anywhere else or by Escape. The
     panels sit inside the deck panel, so a re-render throws them away — which
     is exactly right: any menu item that does something also redraws, and a
     menu that stayed open over the change it just made would be lying. */
  (()=>{
    const pairs=[["dMore","dMorePanel"],["dEye","dEyePanel"]];
    const shut=()=>pairs.forEach(([b,pn])=>{const B=$(b),P=$(pn);
      if(P)P.hidden=true;if(B)B.setAttribute("aria-expanded","false")});
    pairs.forEach(([b,pn])=>{
      const B=$(b),P=$(pn);if(!B||!P)return;
      B.onclick=e=>{
        e.stopPropagation();
        const open=P.hidden;
        shut();
        if(open){P.hidden=false;B.setAttribute("aria-expanded","true")}
      };
      P.onclick=e=>e.stopPropagation();
    });
    HOST.addEventListener("click",shut);
    document.addEventListener("click",shut,{once:true});
    document.addEventListener("keydown",function esc(ev){
      if(ev.key==="Escape"){shut();document.removeEventListener("keydown",esc)}});
  })();
  $("vList").onclick=()=>{DVIEW="list";save(K_DVIEW,DVIEW);renderDeck()};
  $("vImg").onclick=()=>{DVIEW="img";save(K_DVIEW,DVIEW);renderDeck()};
  $("dsel").onchange=e=>{DECKS.cur=e.target.value;saveDecks();S.limit=150;render()};
  $("dnew").onclick=()=>{const n=prompt("Deck name:","Deck "+(names.length+1));
    if(n&&!DECKS.list[n]){DECKS.list[n]={fmt:d.fmt,coco:null,cards:{}};DECKS.cur=n;stampEdited(n);saveDecks();
      award("named");if(Object.keys(DECKS.list).length>=3)award("deck2");render()}};
  /* Save is rebuilt with the panel on every render, so it is rebound here
     rather than once at boot the way the old top bar was. */
  const dbs=$("dbSave");if(dbs)dbs.onclick=e=>saveDeckPrompt(e);
  {const u=$("dundo");if(u){u.onclick=undo;paintUndo()}}
  {const bb=$("dbuy");
   if(bb)bb.onclick=()=>{
     /* What you're missing if the collection is on; the whole deck if it isn't,
        because "missing" is meaningless without something to compare against. */
     const rows=COLLON?borrowRows().map(x=>({c:x.c,q:x.need})):dlist();
     tcgOpen(rows,COLLON?"you already own this whole deck":"this deck is empty")}}
  const dbn=$("dbName");
  if(dbn){dbn.onclick=()=>renameDeck(DECKS.cur);
    dbn.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();renameDeck(DECKS.cur)}}}
  $("dren").onclick=()=>renameDeck(DECKS.cur);
  $("ddup").onclick=()=>duplicateDeck(DECKS.cur);
  $("dlink").onclick=()=>copyDeckLink(DECKS.cur);
  $("dimp").onclick=()=>importDeckPrompt();
  $("ddel").onclick=()=>{if(names.length<2){toast("Keep at least one deck");return}
    if(confirm('Delete deck "'+DECKS.cur+'"?')){mark('deleting "'+DECKS.cur+'"');delete DECKS.list[DECKS.cur];DECKS.cur=Object.keys(DECKS.list)[0];saveDecks();render()}};
  $("fmtpick").querySelectorAll("[data-fmt]").forEach(b=>b.onclick=()=>setFmt(b.dataset.fmt));
  const cs=$("csel");if(cs)cs.onchange=e=>{d.coco=e.target.value===""?null:+e.target.value;markDirty(true);renderDeck()};
  $("dx").onclick=()=>{if(confirm("Clear all cards?")){mark("clearing the deck");d.cards={};markDirty(true);render()}};
  const rm=$("drm");
  if(rm)rm.onclick=()=>{mark("removing the not-legal cards");L.forEach(({c,f})=>{if(illegalReason(c))delete d.cards[f]});markDirty(true);render();toast("Removed not legal cards")};
  const an=$("dana");if(an)an.ontoggle=()=>{DANA=an.open;save("fs3_dana",DANA)};
  $("dc").onclick=()=>navigator.clipboard.writeText(deckText()).then(()=>toast("Copied"),()=>toast("Copy failed"));
  $("dim").onclick=importDeckPrompt;
  const dh=$("dh");if(dh)dh.onclick=hand;
  const dgf=$("dgf");if(dgf)dgf.onclick=paintGoldfish;
  HOST.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>addCard(b.dataset.p));
  HOST.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>delCard(b.dataset.m));
  HOST.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>openM(b.dataset.o));
  HOST.querySelectorAll("[data-swap]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();swapBox(b.dataset.swap)});
}
/* Rough archetype read from the curve and what the deck actually does.
   Deliberately coarse — it's a sanity check, not a verdict. */
function archetype(){
  const L=dlist(),tot=dtotal();
  if(tot<20)return{k:"other",why:"too few cards to call"};
  let cost=0,cheap=0,removal=0,draw=0,lore=0;
  L.forEach(({c,q})=>{cost+=c.c*q;if(c.c<=3)cheap+=q;
    if(c.ab.has("banish")||c.ab.has("damage")||c.ab.has("pierce"))removal+=q;
    if(c.ab.has("draw")||c.ab.has("topx"))draw+=q;
    if((c.lo||0)>=2)lore+=q});
  const avg=cost/tot,cp=cheap/tot,rp=removal/tot;
  if(avg<=3.2&&cp>=.55)return{k:"aggro",why:`avg cost ${avg.toFixed(1)}, ${Math.round(cp*100)}% cost 3 or less`};
  if(rp>=.30||avg>=4.2)return{k:"control",why:`${Math.round(rp*100)}% removal, avg cost ${avg.toFixed(1)}`};
  return{k:"midrange",why:`avg cost ${avg.toFixed(1)}, ${Math.round(rp*100)}% removal`};
}
/* Minimum bodies you want at each early cost, scaled to deck size. */
const CURVE_TARGET={1:4,2:8,3:10,4:8};
function curveCheck(){
  const L=dlist(),tot=Math.max(dtotal(),1),scale=Math.min(1,tot/60);
  const have={1:0,2:0,3:0,4:0};
  L.forEach(({c,q})=>{if(have[c.c]!==undefined)have[c.c]+=q});
  return [1,2,3,4].map(n=>{const want=Math.round(CURVE_TARGET[n]*scale);
    return{n,have:have[n],want,hit:have[n]>=want&&want>0}});
}
/* ===================== what else could go here? =====================
   The most common question while building is not "is this card good" — it is
   "what else does this job". Answering it meant leaving the deck, guessing a
   search, and comparing by memory. Nothing on the site answered it.

   SIMILARITY, and why it is not "same cost, same ink". That finds cards that
   look alike on a spreadsheet and play nothing like each other. What actually
   matters is what a card DOES, and the site already knows that: every card
   carries `ab`, the set of special-search chips it matched — draws a card,
   banishes, bounces, ramps, pings, and so on. Two cards that share four of
   those do the same job whatever their names are. So overlap of `ab` is the
   spine of the score and everything else is a tiebreak.

   Candidates are constrained to what you could actually play: legal in the
   format, inside the inks this deck is already committed to (a suggestion you
   cannot cast is not a suggestion), and the same broad kind of card. */
function deckInks(){
  const set=new Set();
  dlist().forEach(({c})=>c.co.forEach(i=>set.add(i)));
  return set;
}
/* What this deck is short of, in the same terms the deck doctor uses. A swap
   suggestion that also plugs a hole is worth more than one that merely matches,
   and this is the only place on the site that can know both at once. */
function deckNeeds(){
  const L=dlist(),tot=dtotal(),need=new Set();
  if(tot<15)return need;
  const n=pred=>L.reduce((a,x)=>a+(pred(x.c)?x.q:0),0);
  if(n(x=>x.ab.has("banish")||x.ab.has("damage")||x.ab.has("pierce"))<4)need.add("removal");
  if(n(x=>x.ab.has("draw")||x.ab.has("topx"))<3)need.add("draw");
  if(n(x=>(x.lo||0)>=2)<6&&tot>=40)need.add("lore");
  if(Math.round(n(x=>x.ik)/tot*100)<40)need.add("inkable");
  if(n(x=>x.c===1)+n(x=>x.c===2)<8)need.add("cheap");
  return need;
}
const NEED_LABEL={removal:"adds removal",draw:"draws cards",lore:"scores lore",
  inkable:"is inkable",cheap:"is an early play"};
function fills(x,needs){
  const out=[];
  if(needs.has("removal")&&(x.ab.has("banish")||x.ab.has("damage")||x.ab.has("pierce")))out.push("removal");
  if(needs.has("draw")&&(x.ab.has("draw")||x.ab.has("topx")))out.push("draw");
  if(needs.has("lore")&&(x.lo||0)>=2)out.push("lore");
  if(needs.has("inkable")&&x.ik)out.push("inkable");
  if(needs.has("cheap")&&x.c<=2)out.push("cheap");
  return out;
}
function similarTo(c){
  const inks=deckInks(), cap=FMT[deck().fmt].cap;
  const have=deck().cards;
  const kind=x=>x.sub.includes("Song")?"Song":x.ty;
  const myKind=kind(c);
  const pool=CARDS.filter(x=>{
    if(x.f===c.f||x.f===BANNED)return false;
    if(!legal(x)||illegalReason(x))return false;
    if(kind(x)!==myKind)return false;
    if(Math.abs((x.c||0)-(c.c||0))>1)return false;
    /* Playable in THIS deck: every ink it needs is one the deck already uses,
       or the deck still has an ink slot free to take it. */
    if(!x.co.length)return false;
    const newInks=x.co.filter(i=>!inks.has(i));
    return inks.size+newInks.length<=cap;
  });
  const needs=deckNeeds();
  const score=x=>{
    let n=0;
    /* The biggest single bonus. A card that does the same job AND fixes
       something the deck is missing is the answer to a question you had not
       got round to asking yet. */
    n+=fills(x,needs).length*5;
    if(x.ab&&c.ab)for(const id of x.ab)if(c.ab.has(id))n+=4;   // does the same job
    if(isStar(x.f))n+=3;                                        // and it's a staple
    if(x.c===c.c)n+=2;                                          // same slot on the curve
    if(x.ik===c.ik)n+=1;                                        // inkable like for like
    if((x.lo||0)>(c.lo||0))n+=1;
    if(myKind==="Character"){
      n+=Math.max(0,2-Math.abs((x.st||0)-(c.st||0))*0.5);
      n+=Math.max(0,2-Math.abs((x.wi||0)-(c.wi||0))*0.5);
    }
    if(have[x.f])n-=2;              // already in the deck — offer it, but lower
    if(COLLON&&ownedByName(x)>0)n+=2;   // and prefer what you already own
    return n;
  };
  return pool.map(x=>({c:x,n:score(x),fix:fills(x,needs)}))
    .sort((a,b)=>b.n-a.n||a.c.f.localeCompare(b.c.f));
}
function swapBox(f){
  const c=CARDS.find(x=>x.f===f);if(!c)return;
  const all=similarTo(c);
  const needs=deckNeeds();
  /* View state lives here rather than in storage: which filter you used to
     replace one card tells you nothing about the next one. */
  let mode="best",q="",show=8;
  const MODES=[["best","Best fit"],["cheaper","Cheaper to play"],
    ["fix","Fills a gap"],["own","I already own it"]];

  const w=document.createElement("div");w.className="cfmbg";
  document.body.appendChild(w);
  const shut=()=>{w.remove();document.removeEventListener("keydown",key)};
  const key=e=>{if(e.key==="Escape")shut()};
  document.addEventListener("keydown",key);

  const shared=x=>{
    if(!x.ab||!c.ab)return [];
    return [...x.ab].filter(id=>c.ab.has(id))
      .map(id=>(AB.find(y=>y.id===id)||{}).l).filter(Boolean).slice(0,3);
  };
  const pass=x=>{
    if(q){
      const hay=(x.c.f+" "+(x.c.tx||"")+" "+x.c.sub.join(" ")).toLowerCase();
      if(!hay.includes(q))return false;
    }
    if(mode==="cheaper")return x.c.c<c.c;
    if(mode==="fix")return x.fix.length>0;
    if(mode==="own")return COLLON&&ownedByName(x.c)>0;
    return true;
  };
  function paint(){
    const hits=all.filter(pass);
    const rows=hits.slice(0,show);
    w.innerHTML=`<div class="cfm wide swapw">
      <h3>What else could go here?</h3>
      <p>Cards that do the same job as <b>${esc(c.f)}</b> and that you could actually
        play in this deck — right format, right inks, near enough on the curve.${
        needs.size?` This deck is light on ${[...needs].map(n=>esc(NEED_LABEL[n]||n).replace(/^(adds|draws|scores|is) /,"")).join(", ")}, so anything that helps is flagged.`:""}</p>
      <div class="swapf">
        ${MODES.map(([k,l])=>`<button class="swapc${mode===k?" on":""}"${
          k==="own"&&!COLLON?" disabled title='Turn collection tracking on in Settings'":""
          } data-mode="${k}">${esc(l)}</button>`).join("")}
        <input class="swapq" id="swapQ" placeholder="filter by name or text…" value="${esc(q)}">
      </div>
      ${rows.length?`<div class="swapl">${rows.map(x=>`
        <div class="swapr">
          ${cImg(x.c)?`<img src="${esc(cImg(x.c))}" alt="" loading="lazy">`:`<div class="swapph"></div>`}
          <div class="swapt">
            <b>${esc(x.c.n)}</b>${x.c.v?`<i>${esc(x.c.v)}</i>`:""}
            <span class="swapm">${x.c.c} ink · ${esc(x.c.co.join("/"))}${
              x.c.lo!=null?` · ${x.c.lo} lore`:""}${isStar(x.c.f)?" · ★ staple":""}${
              deck().cards[x.c.f]?" · already in this deck":""}${
              COLLON&&ownedByName(x.c)>0?" · you own it":""}${
              PRICES&&cardPrice(x.c)!=null?" · 🐠 "+money(cardPrice(x.c)):""}</span>
            ${x.fix.length?`<span class="swapfix">✔ ${x.fix.map(k=>esc(NEED_LABEL[k])).join(" · ")}</span>`:""}
            ${shared(x.c).length?`<span class="swapw2">Both: ${esc(shared(x.c).join(" · "))}</span>`:""}
          </div>
          <div class="swapb">
            <button class="btn" data-see="${esc(x.c.f)}">Read it</button>
            <button class="btn go" data-take="${esc(x.c.f)}">Swap in</button>
          </div>
        </div>`).join("")}</div>
        ${hits.length>show?`<button class="btn swapmore" data-more="1">Show ${Math.min(12,hits.length-show)} more of ${hits.length}</button>`:""}`
        :`<p class="hint">${q||mode!=="best"
          ? "Nothing matches that. Try a different filter."
          : "Nothing close enough to suggest. That usually means the card is doing something unusual — which is a good sign for the card."}</p>`}
      <div class="cfmb"><button class="btn" data-no>Close</button></div>
    </div>`;
    w.querySelector("[data-no]").onclick=shut;
    w.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{
      mode=b.dataset.mode;show=8;paint()});
    const qi=w.querySelector("#swapQ");
    if(qi)qi.oninput=()=>{q=qi.value.trim().toLowerCase();show=8;paint();
      /* Repainting blows away focus and the caret, so both are put back. */
      const n=w.querySelector("#swapQ");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
    const more=w.querySelector("[data-more]");
    if(more)more.onclick=()=>{show+=12;paint()};
    w.querySelectorAll("[data-see]").forEach(b=>b.onclick=()=>{shut();openM(b.dataset.see)});
    w.querySelectorAll("[data-take]").forEach(b=>b.onclick=()=>{
      const to=b.dataset.take;
      /* ONE mark for the whole swap, so a single Ctrl+Z puts the old card back
         AND takes the new one out. Two marks would need two undos for
         something the person did once. */
      mark("swapping "+c.n+" for "+(CARDS.find(x=>x.f===to)||{}).n);
      const d=deck();
      d.cards[f]--;if(d.cards[f]<=0)delete d.cards[f];
      d.cards[to]=(d.cards[to]||0)+1;
      touchDeck();render();refreshTiles();
      shut();toast("Swapped in "+(CARDS.find(x=>x.f===to)||{}).n);
    });
  }
  w.onclick=e=>{if(e.target===w)shut()};
  paint();
}

/* ===================== the deck doctor =====================
   The warnings above answer "is this deck LEGAL". Nothing answered "is this
   deck any GOOD", which is the question a new player actually has and the one
   no other Lorcana tool will answer for them.

   Every line here is a specific, checkable fact about the list with a number
   attached — never "consider more removal". If it can't name a count it says
   nothing. Sorted worst-first and capped, because a wall of advice reads the
   same as no advice.

   These are heuristics and the panel says so out loud. A deck that breaks all
   of them on purpose is allowed to be right. */
function deckAdvice(){
  const L=dlist(),tot=dtotal();
  if(tot<15)return[];
  const out=[];
  const say=(sev,s)=>out.push({sev,s});
  const n=pred=>L.reduce((a,x)=>a+(pred(x.c)?x.q:0),0);
  const pc=v=>Math.round(v/tot*100);

  /* --- ink. The most common reason a new deck loses to itself. --- */
  const inkable=n(c=>c.ik);
  if(pc(inkable)<40)
    say(2,`Only ${pc(inkable)}% of this deck can go in your inkwell (${inkable} of ${tot}). Below about 40% you will miss ink drops regularly. Most decks sit near half.`);
  else if(pc(inkable)>72)
    say(0,`${pc(inkable)}% inkable — safe, but that usually means the deck is short of cards that actually do something.`);

  /* --- the curve --- */
  const at=k=>n(c=>c.c===k);
  if(!at(1)&&!at(2))
    say(2,`Nothing costing 1 or 2. Your first two turns are ink and pass, and an aggressive deck will be ahead before you have played a card.`);
  else if(at(1)+at(2)<8)
    say(1,`Only ${at(1)+at(2)} cards at 1–2 ink. Most decks want around 12 so turn 2 is never a blank.`);
  const heavy=n(c=>c.c>=6);
  if(heavy>8)
    say(1,`${heavy} cards cost 6 or more. Past about 8 you draw two together in an opening hand often enough to lose to it.`);

  /* --- what the deck DOES --- */
  const removal=n(c=>c.ab.has("banish")||c.ab.has("damage")||c.ab.has("pierce"));
  if(removal<4)
    say(removal?1:2,`${removal===0?"No":"Only "+removal} card${removal===1?"":"s"} that can remove an opposing character. Something will eventually sit across the table that you cannot answer.`);
  const draw=n(c=>c.ab.has("draw")||c.ab.has("topx"));
  if(draw<3)
    say(1,`${draw===0?"No":"Only "+draw} card${draw===1?"":"s"} that draw you anything. Whoever runs out of cards first usually loses the long game.`);
  const lore=n(c=>(c.lo||0)>=2);
  if(lore<6&&tot>=40)
    say(1,`${lore} card${lore===1?"":"s"} with 2 or more lore. The game is won at 20 lore — something has to actually score it.`);

  /* --- singers and songs. A song nobody can sing is a card you have to hard
         cast, and this is the mistake people make most often. --- */
  const songs=L.filter(x=>x.c.sub.includes("Song"));
  const songN=songs.reduce((a,x)=>a+x.q,0);
  if(songN){
    const singers=n(c=>c.ty==="Character"&&(c.kw.some(k=>k[0]==="Singer")||c.c>=4));
    const dear=songs.filter(x=>x.c.c>=4).reduce((a,x)=>a+x.q,0);
    if(singers<4&&dear)
      say(2,`${songN} songs but only ${singers} character${singers===1?"":"s"} who could sing anything expensive. A song with nobody to sing it is just a card you have to pay full price for.`);
    else if(singers<6)
      say(1,`${songN} songs and ${singers} possible singers. Songs get much better as that second number grows.`);
  }
  /* Sing Together wants a crowd, not a singer. */
  const st=n(c=>c.kw.some(k=>k[0]==="Sing Together"));
  if(st){
    const bodies=n(c=>c.ty==="Character");
    if(bodies<24)say(1,`Sing Together needs several characters ready at once and this deck has ${bodies}. It wants closer to 26.`);
  }

  /* --- a Shift card with nothing to shift onto is a dead card in hand --- */
  const orphan=L.filter(x=>hasShift(x.c)&&!L.some(y=>y.c!==x.c&&y.c.n===x.c.n&&y.c.ty==="Character"&&!hasShift(y.c)));
  if(orphan.length)
    say(1,`${orphan.length} Shift card${orphan.length===1?"":"s"} with no cheaper version of the same character in the deck — ${orphan.slice(0,2).map(x=>x.c.n).join(", ")}${orphan.length>2?"…":""}. Shift is only a discount if the thing to shift from is there.`);

  /* --- singleton spam, never in Coconut, where singletons are the rule --- */
  if(deck().fmt!=="coconut"&&tot>=40){
    const ones=L.filter(x=>x.q===1).length;
    if(ones>L.length*0.55&&L.length>18)
      say(1,`${ones} of your ${L.length} different cards are single copies. One-ofs are cards you mostly never see — doubling the ones that matter makes the deck do the same thing more often.`);
  }
  return out.sort((a,b)=>b.sev-a.sev).slice(0,6);
}

/* ===================== goldfishing =====================
   "Is my curve okay" has a real answer and it is a number, so this draws the
   deck a thousand times and reports what actually happened.

   THE MODEL, stated plainly, because a statistic with hidden assumptions is
   worse than no statistic:
     · Opening 7, on the play — no draw on turn one.
     · One card per turn into the inkwell, chosen greedily: the priciest
       inkable card in hand you can't cast yet, else the priciest inkable.
       Roughly what a competent player does; not what a perfect one does.
     · A turn "has a play" if anything in hand costs no more than the ink you
       have after inking.
     · No shift, no singing, no draw effects, no decisions beyond that.
   So these are a floor on how the deck opens, not a simulation of the game.
   The panel says exactly that underneath the numbers. */
function goldfish(runs){
  const pool=[];dlist().forEach(({c,q})=>{for(let i=0;i<q;i++)pool.push(c)});
  if(pool.length<12)return null;
  runs=runs||1000;
  let screwed=0,dead=0,inkSum=0;
  const hit=[0,0,0,0,0];
  for(let r=0;r<runs;r++){
    const d=pool.slice();
    for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]]}
    const hand=d.slice(0,7);let next=7;
    const inkableN=hand.filter(c=>c.ik).length;
    inkSum+=inkableN;
    if(inkableN<2)screwed++;
    let ink=0,anyPlay=false;
    for(let turn=1;turn<=4;turn++){
      if(turn>1&&next<d.length)hand.push(d[next++]);
      /* Find the index fresh and splice once. Doing it any other way — sorting
         a list of {card,index} pairs and splicing from it — leaves every other
         index stale the moment the first splice lands. */
      let best=-1;
      for(let i=0;i<hand.length;i++){
        if(!hand[i].ik)continue;
        if(best<0){best=i;continue}
        const a=hand[i],b=hand[best];
        const aUse=a.c>ink+1,bUse=b.c>ink+1;      // prefer inking what you can't cast
        if(aUse!==bUse?aUse:a.c>b.c)best=i;
      }
      if(best>=0){hand.splice(best,1);ink++}
      const canPlay=hand.some(c=>c.c<=ink);
      if(canPlay){anyPlay=true;hit[turn]++}
    }
    if(!anyPlay)dead++;
  }
  const p=v=>Math.round(v/runs*100);
  return {runs,screwed:p(screwed),dead:p(dead),avgInk:(inkSum/runs).toFixed(1),
    t1:p(hit[1]),t2:p(hit[2]),t3:p(hit[3]),t4:p(hit[4])};
}
function paintGoldfish(){
  const box=$("gf");if(!box)return;
  const g=goldfish(1000);
  if(!g){box.innerHTML=`<div class="st">Add a few more cards and this will have something to shuffle.</div>`;return}
  const bar=(l,v,good)=>`<div class="gfrow"><span class="gfl">${esc(l)}</span>
    <span class="gfbar"><i class="${good?"ok":"bad"}" style="width:${v}%"></i></span>
    <b>${v}%</b></div>`;
  box.innerHTML=`
    <div class="gfhead">${g.runs.toLocaleString()} opening hands, played out four turns</div>
    ${bar("Something to play turn 1",g.t1,g.t1>=45)}
    ${bar("Something to play turn 2",g.t2,g.t2>=75)}
    ${bar("Something to play turn 3",g.t3,g.t3>=88)}
    ${bar("Something to play turn 4",g.t4,g.t4>=92)}
    ${bar("Fewer than 2 inkable in hand",g.screwed,g.screwed<=12)}
    <div class="st">Average inkable cards in the opening 7: <b>${g.avgInk}</b>${
      g.dead?` · <b>${g.dead}%</b> of hands did nothing at all in four turns`:""}</div>
    <p class="gfnote">On the play, inking one card a turn, no singing, no shift and no
      draw effects. It is a floor on how the deck opens, not the whole game — but if
      turn 2 is under about 75% here, it will feel bad at the table too.</p>`;
}

/* ===================== odds to draw =====================
   Hypergeometric — the maths every card player eventually learns and almost
   never has to hand. The chance of at least one copy in the cards you have
   seen is one minus the chance every one of them was something else.

   On the play you don't draw on turn one, so by the start of turn T you have
   seen 7 + (T-1) cards. Logs rather than factorials, so a 60-card deck can't
   overflow anything. */
function lnFact(n){let s=0;for(let i=2;i<=n;i++)s+=Math.log(i);return s}
function lnC(n,k){return (k<0||k>n)?-Infinity:lnFact(n)-lnFact(k)-lnFact(n-k)}
function drawOdds(copies,deckSize,seen){
  if(copies<=0||seen<=0||deckSize<=0)return 0;
  if(seen>=deckSize)return 1;
  const miss=Math.exp(lnC(deckSize-copies,seen)-lnC(deckSize,seen));
  return 1-Math.max(0,Math.min(1,miss));
}
/* The card page is the one place that shows BOTH numbers. The Flounder Price
   is the fun one and it is what the rest of the site displays; the market price
   is the one you would actually pay, and hiding it while running affiliate buy
   links would be indefensible. */
function priceBlock(c){
  if(!PRICES)return "";
  const v=cardPrice(c),raw=rawPrice(c);
  if(v==null)return "";
  const hi=cardPriceMax(c),lo=cardPriceMin(c);
  return `<div class="pblock">
    <div class="pbig">≈ ${money(v)}
      <button class="prcinfo big" data-priceinfo="1" aria-label="How this price works">ⓘ</button>
      <span class="shipnote">+${SHIP_EST} shipping</span></div>
    <div class="praw">Market price ${money(raw)}${
      hi!=null&&hi!==v?` · priciest printing ${money(hi)}`:""}</div>
    <div class="psnap">Snapshot taken ${esc(priceDate())}.</div>
    <button class="buytcg" data-buyone="${esc(c.f)}">
      <span class="buytcgico cartico">${CART_SVG}</span>
      <span class="buytcgtxt"><b>Buy on TCGplayer</b><span>Opens in a new tab</span></span>
      <span class="buytcgarrow">↗</span>
    </button>
    <button class="buytcg buyfoil" data-buyone="${esc(c.f)}">
      <span class="buytcgico">✨</span>
      <span class="buytcgtxt"><b>Buy foil on TCGplayer</b><span>Search results — pick the foil listing</span></span>
      <span class="buytcgarrow">↗</span>
    </button>
    <div class="afftiny">Affiliate links — Ready Set Ink may earn a commission, at no extra cost to you.</div>
  </div>`;
}
/* Shown on a card's own page, but only for a card that is in the deck you are
   building — out of that context the number would be meaningless. */
function oddsLine(c){
  const d=deck(),q=d.cards[c.f]|0;
  if(!q)return "";
  const size=dtotal();
  if(size<10)return "";
  const turn=t=>Math.round(drawOdds(q,size,7+(t-1))*100);
  return `<div class="odds">
    <b>${q} cop${q===1?"y":"ies"} in a ${size}-card deck — how often you'll have it</b>
    <div class="oddsrow">
      <span><i>${turn(1)}%</i>opening hand</span>
      <span><i>${turn(3)}%</i>by turn 3</span>
      <span><i>${turn(5)}%</i>by turn 5</span>
      <span><i>${turn(8)}%</i>by turn 8</span>
    </div>
    <p>Chance of having drawn at least one, going first. Drawing first each
      turn nudges every number up a little.</p>
  </div>`;
}
function deckText(){const d=deck(),o=[];
  if(d.fmt==="coconut"&&d.coco!=null&&COCO[d.coco])o.push("[Coconut] "+COCO[d.coco].n+" - "+COCO[d.coco].v,"");
  dlist().sort((a,b)=>a.c.c-b.c.c).forEach(({c,q})=>o.push(q+" "+c.f));return o.join("\n")}
function hand(){
  const p=[];dlist().forEach(({c,q})=>{for(let i=0;i<q;i++)p.push(c)});
  if(p.length<7){toast("Need at least 7 cards");return}
  for(let i=p.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]]}
  const hd=p.slice(0,7),ink=hd.filter(c=>c.ik).length;
  $("hb").innerHTML=`<div class="st">Opening 7 · ${ink} inkable${ink<3?" — risky, consider a mulligan":""}</div>
    <div class="hand">${hd.map(c=>c.img?`<img src="${c.img}" title="${esc(c.f)}">`:`<div class="ph">${esc(c.n)}</div>`).join("")}</div>`;
}

/* ---------- share / import ---------- */
function shareLink(){
  const d=deck();
  const p=encodeURIComponent(JSON.stringify({n:DECKS.cur,f:d.fmt,k:d.coco,
    c:dlist().map(({c,q})=>c.s+"~"+c.num+"~"+q)}));
  const u=location.origin+location.pathname+"#d="+p;
  navigator.clipboard.writeText(u).then(()=>toast("Share link copied"),()=>prompt("Copy:",u));
}
function fromHash(){
  const m=BOOTHASH.match(/#d=(.+)/);if(!m)return;
  try{const o=JSON.parse(decodeURIComponent(m[1])),cards={};let miss=0,banned=0;
    (o.c||[]).forEach(p=>{const[s,num,q]=p.split("~");
      const c=CARDS.find(x=>x.s===s&&String(x.num)===num);
      if(!c){miss++;return}
      if(c.f===BANNED){banned++;return}          // the ban has no back door
      cards[c.f]=(cards[c.f]||0)+(+q||1)});
    let n=(o.n||"Shared")+" (shared)",i=2;while(DECKS.list[n])n=(o.n||"Shared")+" (shared "+(i++)+")";
    DECKS.list[n]={fmt:o.f||"infinity",coco:o.k??null,cards};DECKS.cur=n;stampEdited(n);saveDecks();
    history.replaceState(null,"",location.pathname);
    toast('Imported "'+n+'"'+(miss?" · "+miss+" not found":"")+(banned?" · Chip the Teacup removed":""));
  }catch(e){toast("Could not read that deck link")}
}
function importText(){
  const raw=prompt('Paste a deck list (e.g. "4 Elsa - Snow Queen"):');if(!raw)return;
  const cards={},miss=[];let banned=0;
  raw.split(/\r?\n/).forEach(l=>{const t=l.trim();
    if(!t||t.startsWith("[")||t.startsWith("//"))return;
    const m=t.match(/^(\d+)\s*[xX]?\s+(.*)$/);if(!m)return;
    const nm=m[2].replace(/\s*[–—]\s*/g," - ").trim();
    const c=CARDS.find(x=>x.f.toLowerCase()===nm.toLowerCase())||CARDS.find(x=>x.f.toLowerCase().startsWith(nm.toLowerCase()));
    if(!c){miss.push(nm);return}
    if(c.f===BANNED){banned++;return}
    cards[c.f]=(cards[c.f]||0)+(+m[1])});
  if(!Object.keys(cards).length){toast(banned?"Only Chip the Teacup matched — denied":"Nothing matched");return}
  let n="Imported",i=2;while(DECKS.list[n])n="Imported "+(i++);
  DECKS.list[n]={fmt:deck().fmt,coco:null,cards};DECKS.cur=n;saveDecks();render();
  toast("Imported "+Object.keys(cards).length+" cards"+(miss.length?" · "+miss.length+" unmatched":"")+(banned?" · Chip the Teacup denied":""));
}

