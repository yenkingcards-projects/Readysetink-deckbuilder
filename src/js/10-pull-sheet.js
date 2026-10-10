/* ===================== pull list =====================
   A pull list is what you carry to the binder, so it is ordered by how cards
   are PHYSICALLY stored, not by anything to do with gameplay. Collector number
   is a string ("4a", "205") so it has to sort numerically with the variant
   letter as a tiebreak, otherwise #10 lands between #1 and #2. */
/* People organise Lorcana in genuinely different ways, and a pull list is
   useless if its order doesn't match the binder you're holding. Set-and-number
   suits a set-order binder; franchise suits the people who file by film; ink
   suits deck boxes. Each entry is [value, label]. */
const PULLSORTS=[
 ["setnum",  "Set (newest first), then collector number"],
 ["setnumo", "Set (oldest first), then collector number"],
 ["setaz",   "Set (newest first), then card name"],
 ["az",      "Card name, A–Z"],
 ["inkcost", "Ink, then cost, then name"],
 ["cost",    "Cost, then name"],
 ["franc",   "Franchise, then card name"],
 ["francink","Franchise, then ink, then name"],
 ["inkaz",   "Ink, then card name"],
 ["rarity",  "Rarity, then set and number"],
 ["type",    "Card type, then name"],
 ["class",   "Classification, then name"],
];
/* Rarity is a ladder, not an alphabet — sorting it as text puts Common after
   Uncommon and Enchanted first. */
/* Ladder order for the rarity pull sheet. Epic and Iconic are newer tiers and
   their exact rung is a guess — say the word if they sit elsewhere. */
const RARORDER=["Common","Uncommon","Rare","Super Rare","Epic","Legendary",
  "Iconic","Enchanted","Special","Promo"];
const rarRank=r=>{const i=RARORDER.indexOf(r);return i<0?RARORDER.length:i};
let PULLSORT=load("fs3_pullsort","setnum");
const numKey=n=>{const m=String(n).match(/^(\d+)(.*)$/);
  return m?[parseInt(m[1],10),m[2]]:[9e9,String(n)]};
/* A card's own s/sn/num is always its ORIGINAL printing — Stitch - Carefree
   Surfer is set 1 even though Fabled reprinted him. Fine for the card grid,
   wrong for a pull sheet: you're standing at your binder, and the copy
   that's actually easiest to find is usually the newest one. This walks
   every printing (prints() already flattens pr[] vs. the single-printing
   fallback), groups by set (an Enchanted of the same set isn't a reprint,
   it's the same pull), and picks whichever set shipped last. */
function pullRows(){
  const d=deck();
  return dlist().map(({c,q})=>{
    const bySet=new Map();
    prints(c).forEach(pr=>{if(!bySet.has(pr.s))bySet.set(pr.s,pr)});
    let bestCode=c.s,bestDate=(DATA.sets[c.s]||{}).d||"";
    bySet.forEach((pr,code)=>{
      const dt=(DATA.sets[code]||{}).d||"";
      if(dt>bestDate){bestDate=dt;bestCode=code}});
    const bestPr=bySet.get(bestCode)||{num:c.num,r:c.r};
    const others=[...bySet.keys()].filter(code=>code!==bestCode)
      .sort((a,b)=>String((DATA.sets[b]||{}).d||"").localeCompare(String((DATA.sets[a]||{}).d||"")))
      .map(SETNAME);
    return {q,c,
      set:SETNAME(bestCode),setcode:bestCode,setd:bestDate,
      num:String(bestPr.num),r:bestPr.r||c.r,name:c.f,ink:(c.co||[]).join("/"),cost:c.c,
      franc:c.sto||"Other",ty:c.ty||"Other",
      cls:(c.sub&&c.sub.length?c.sub[0]:"Unclassified"),
      alsoIn:others};
  });
}
function pullSorted(rows,mode){
  const byName=(a,b)=>a.name.localeCompare(b.name);
  const byNum=(a,b)=>{const x=numKey(a.num),y=numKey(b.num);
    return x[0]-y[0]||String(x[1]).localeCompare(String(y[1]))};
  const bySetNew=(a,b)=>String(b.setd).localeCompare(String(a.setd))||a.set.localeCompare(b.set);
  const bySetOld=(a,b)=>String(a.setd).localeCompare(String(b.setd))||a.set.localeCompare(b.set);
  const f={
    setnum: (a,b)=>bySetNew(a,b)||byNum(a,b),
    setnumo:(a,b)=>bySetOld(a,b)||byNum(a,b),
    setaz:  (a,b)=>bySetNew(a,b)||byName(a,b),
    az:     byName,
    inkcost:(a,b)=>a.ink.localeCompare(b.ink)||a.cost-b.cost||byName(a,b),
    cost:   (a,b)=>a.cost-b.cost||byName(a,b),
    franc:  (a,b)=>a.franc.localeCompare(b.franc)||byName(a,b),
    francink:(a,b)=>a.franc.localeCompare(b.franc)||a.ink.localeCompare(b.ink)||byName(a,b),
    inkaz:  (a,b)=>a.ink.localeCompare(b.ink)||byName(a,b),
    rarity: (a,b)=>rarRank(a.r)-rarRank(b.r)||bySetNew(a,b)||byNum(a,b),
    type:   (a,b)=>String(a.ty).localeCompare(String(b.ty))||byName(a,b),
    class:  (a,b)=>a.cls.localeCompare(b.cls)||byName(a,b),
  /* An unknown mode used to reference an identifier that does not exist, which
     threw rather than falling back. A saved preference from an older build was
     enough to break the page. */
  }[mode]||((a,b)=>bySetNew(a,b)||byNum(a,b));
  return rows.slice().sort(f);
}
const pullGroupOf=(r,mode)=>({setnum:r.set,setnumo:r.set,setaz:r.set,
  inkcost:r.ink,cost:"Cost "+r.cost,az:"",
  franc:r.franc,francink:r.franc+" · "+r.ink,inkaz:r.ink,
  rarity:r.r,type:r.ty,class:r.cls}[mode]??"");
/* The group header for a set-based sort gets its numbered-set suffix here —
   "Wilds Unknown · Set 12" — straight from the set's own code, since the
   main-line sets are literally numbered that way already (Quest side-sets
   use letters, so they just don't get a suffix). */
const pullSetSuffix=(r,mode)=>
  (mode==="setnum"||mode==="setnumo"||mode==="setaz")&&/^\d+$/.test(r.setcode)
    ?` · Set ${r.setcode}`:"";

/* Checkbox state persists per deck, per card, per copy — so "check off cards
   as you pull them" survives a reload instead of resetting the moment you
   navigate away. A card key rather than an index because rows reorder with
   every sort change and an index would silently point at the wrong card. */
const PULLCHECKKEY="fs3_pullchecks";
/* How many times each deck has been saved. Only used to decide whether the
   Ko-fi code belongs on the printed sheet: a deck you've come back to six
   times is one the sheet is genuinely doing a job for, and that's the only
   point at which asking is fair. Keyed by name, like everything else here. */
const DECKSAVEKEY="fs3_decksaves";
const KOFI_AFTER=5;
const deckSaves=n=>(load(DECKSAVEKEY,{})[n])||0;
const pullChecksLoad=()=>load(PULLCHECKKEY,{});
const pullChecksFor=name=>(pullChecksLoad()[name])||{};
/* Above this many copies of one card, individual boxes stop being a way to
   pull cards and start being a wall. Four is the legal maximum in every
   format that has one, so twelve is already three times generous; a joke
   deck with three thousand Flounder used to lay three thousand checkboxes in
   a single unwrappable row and take the page with it. */
const PULL_BOX_MAX=12;
function pullCheckboxes(cardKey,q){
  const mine=pullChecksFor(DECKS.cur)[cardKey]||[];
  const k=esc(cardKey);
  /* One box for the whole pile once there are too many to tick one at a time.
     It writes the same array the individual boxes do, just all at once, so the
     "N / M pulled" counter above stays honest either way. */
  if(q>PULL_BOX_MAX){
    const all=mine.filter(Boolean).length>=q;
    /* No "all 3,000" caption next to it: the row already prints 3000x two
       columns over, and a caption here is the one thing wide enough to knock
       this column out of line with every other group's table. */
    return `<div class="pullbox"><input type="checkbox" class="pchk" data-pk="${k}"
      data-pall="${q}"${all?" checked":""} title="Tick when you have all ${N(q)}"></div>`;
  }
  let out="";
  for(let i=0;i<q;i++)
    out+=`<input type="checkbox" class="pchk" data-pk="${k}" data-pi="${i}"${mine[i]?" checked":""}>`;
  return `<div class="pullbox">${out}</div>`;
}
/* A card's ink, as the colour AND the word. The dot alone is no use on a
   black-and-white print of the sheet, and the word alone is slower to scan
   than a colour when you are walking a binder that is sorted by ink. */
function inkTag(c){
  const inks=(c&&c.co)||[];
  if(!inks.length)return "";
  return inks.map(i=>`<i style="background:${HEX[i]||"#666"}"></i>`).join("")
    +`<span>${esc(inks.join("/"))}</span>`;
}
const pullCheckedCount=rows=>{
  const mine=pullChecksFor(DECKS.cur);
  return rows.reduce((a,r)=>a+(mine[r.name]||[]).filter(Boolean).length,0)};

function pullListBody(rows,mode){
  let html="",last=null;
  rows.forEach(r=>{
    const g=pullGroupOf(r,mode);
    if(g!==last){if(last!==null)html+="</table>";
      if(g)html+=`<div class="grp">${esc(g)}${pullSetSuffix(r,mode)}</div>`;
      html+="<table>";last=g}
    /* Boxes first, then the count. Ticking is what you actually DO with this
       sheet -- the boxes belong under your thumb at the left edge, not off
       past the rarity column where you have to track back across the row to
       find which card you just ticked. */
    html+=`<tr><td class="chk">${pullCheckboxes(r.name,r.q)}</td>
      <td class="q">${r.q}×</td>
      <td><b>${esc(r.name)}</b>${r.alsoIn.length?`<div class="also">Also printed in ${esc(r.alsoIn.join(", "))}</div>`:""}</td>
      <td class="ink">${inkTag(r.c)}</td>
      <td class="no">#${esc(r.num)}</td><td class="ra">${esc(r.r)}</td></tr>`;
  });
  return html+"</table>";
}
function pullImageBody(rows,mode){
  let html="",last=null,open=false;
  rows.forEach(r=>{
    const g=pullGroupOf(r,mode);
    if(g!==last){
      if(open)html+="</div>";
      if(g)html+=`<div class="grp">${esc(g)}${pullSetSuffix(r,mode)}</div>`;
      html+=`<div class="pullimgs">`;open=true;last=g}
    html+=`<figure class="pullimg">
      ${r.c.img?`<img src="${esc(r.c.img)}" alt="${esc(r.name)}" loading="lazy">`
               :`<div class="pullph">${esc(r.name)}</div>`}
      <figcaption>${r.q}× ${esc(r.name)}<span class="pink">${inkTag(r.c)}</span>${
        r.alsoIn.length?`<i>Also in ${esc(r.alsoIn.join(", "))}</i>`:""}</figcaption>
      <div class="chk">${pullCheckboxes(r.name,r.q)}</div>
    </figure>`;
  });
  return open?html+"</div>":html;
}
/* ===================== proxy slips =====================
   Card-sized paper stand-ins for the cards a deck needs and you haven't bought
   yet, so a list is testable the evening you build it instead of the week the
   order arrives. Print, cut, drop one in a sleeve in front of any card you own
   and the deck plays.

   TEXT ONLY, deliberately, and not for two reasons but three. It is a playtest
   aid rather than a copy of a card, and it should never be mistakable for one —
   every slip says so on it. It costs almost no ink, which is the difference
   between printing forty of them and printing none. And the thing you actually
   need at the table is the rules text at a size you can read, which a shrunk
   picture of a card is worse at than plain type.

   63×88mm is the real card size, so a slip sleeves properly rather than
   floating around inside one. Nine to a page on both A4 and Letter. */
let PROXYALL=load("fs3_proxyall",false);
function proxyRows(){
  return dlist().map(({c,q})=>{
    const have=(COLLON&&!PROXYALL)?Math.min(q,ownedByName(c)):0;
    return {c,need:q-have};
  }).filter(x=>x.need>0);
}
/* ---- what makes this a playtest slip and not a counterfeit ----------------
   The Disney Lorcana Community Code prohibits "the creation, use, sale, trade,
   or distribution of counterfeit or unauthorized Ravensburger names or
   products", and its Future-Proofing clause leaves whether something violates
   it "in letter or spirit" to Ravensburger's sole discretion. So the design
   goal is not "probably fine" — it is that nobody could mistake one of these
   for a card, or for a product, at any distance.

   Every one of these is deliberate and none should be removed:
     · No card art. Not the illustration, not a crop of it, not a thumbnail.
     · No card back, no Lorcana logo, no set symbol, no ink symbol art, no
       rarity mark, no colour — none of the trade dress that makes a card
       recognisable as a card.
     · Plain type on white, with a dashed cut line, so it reads as a printed
       note and not as printed stock.
     · A PROXY band across the face, in the flow of the slip and above the
       rules text rather than tucked in a corner, so it cannot be trimmed off
       without cutting into the text you printed it for.
     · The word "unofficial" and the Ravensburger attribution on every slip.
   Card names and rules text are shown for the same reason the rest of the
   site shows them — this is a card database — but on paper they are carried
   by something that announces itself as not a card. */
function proxySlip(c){
  const stats=[c.st!=null?`${c.st}⚔`:"",c.wi!=null?`${c.wi}⛉`:"",c.lo?`${c.lo}◇`:""]
    .filter(Boolean).join("  ");
  return `<div class="pxs">
    <div class="pxband">PROXY — PLAYTEST SLIP · NOT A REAL CARD</div>
    <div class="pxtop"><span class="pxcost">${c.c}</span>
      <span class="pxink">${esc((c.co||[]).join(" / "))}</span></div>
    <div class="pxname">${esc(c.n)}</div>
    ${c.v?`<div class="pxver">${esc(c.v)}</div>`:""}
    <div class="pxty">${esc(c.ty)}${c.sub&&c.sub.length?" · "+esc(c.sub.join(" · ")):""}</div>
    <div class="pxtx">${esc(c.tx||"")}</div>
    <div class="pxfoot">
      <span class="pxstats">${stats}</span>
      <span class="pxmark">Unofficial · not for sanctioned play<br>© Disney · Lorcana by Ravensburger</span>
    </div>
  </div>`;
}
function renderProxies(){
  const rows=proxyRows();
  if(!rows.length)return `<div class="pxnone">Nothing to proxy — you already own every card in this deck.
    <button class="btn tiny" id="pxAll">Print slips for the whole deck anyway</button></div>`;
  const slips=[];
  rows.forEach(({c,need})=>{for(let i=0;i<need;i++)slips.push(proxySlip(c))});
  return `<div class="pxsheet" id="pxsheet">
    <div class="pxhead">
      <b>Proxy slips — ${esc(DECKS.cur)}</b>
      <span>${slips.length} slip${slips.length===1?"":"s"} · ${rows.length} card${rows.length===1?"":"s"}
        · ${PROXYALL?"every copy in the deck":"only what you don't own"}
        · cut on the lines, sleeve in front of any card</span>
    </div>
    <div class="pxwarn">
      <b>These are for testing a deck at home. They are not cards.</b>
      <p>No artwork, no card back, nothing that makes a card a card — just the name
        and the text, on paper, so you can try a list before you buy it. They are
        <b>not legal in sanctioned play</b>: official tournaments require authentic
        cards, and the only proxy allowed at one is issued by a head judge on the day.
        Don't sell them, don't trade them, don't pass them off as cards. Ready Set Ink
        is unofficial fan content — © Disney, Lorcana operated by Ravensburger.</p>
    </div>
    <div class="pxgrid">${slips.join("")}</div>
  </div>`;
}
let PULLVIEW=load("fs3_pullview","list");
let PULLCOMPACT=load("fs3_pullcompact",false);
function renderPull(){
  const mode=PULLSORT,rows=pullSorted(pullRows(),mode);
  const d=deck(),tot=rows.reduce((a,r)=>a+r.q,0);
  if(!rows.length)return `<div class="empty" style="padding:20px">This deck is empty.</div>`;
  const body=PULLVIEW==="images"?pullImageBody(rows,mode):pullListBody(rows,mode);
  /* The deck's QR code used to hang off the bottom of the sheet, below the
     total, in a bordered strip of its own — so on any list longer than a page
     it printed alone on the last sheet, under nothing, and it read as an
     afterthought stapled on rather than part of the document. It belongs in
     the masthead, beside the title: it IS the sheet's identity, the way back
     to the list you are holding, and it is on page one where someone picking
     the sheet up will see it. */
  return `<div class="pull${PULLCOMPACT?" compact":""}" id="pullout">
    <div class="pullhead">
      <div class="pullhtxt">
        <h2>${esc(DECKS.cur)}</h2>
        <div class="sub">${tot} cards · ${rows.length} unique · ${esc(FMT[d.fmt].l)}
          · sorted by ${esc((PULLSORTS.find(x=>x[0]===mode)||[])[1]||mode)}
          · <span id="pullProgress">${pullCheckedCount(rows)} / ${tot} pulled</span></div>
      </div>
      <figure class="pullqr">
        <div id="pullQrDeck" class="qrbox"></div>
        <figcaption>Scan for this deck list</figcaption>
      </figure>
    </div>
    ${body}
    <div class="tot">Total ${tot} cards</div>
    ${deckSaves(DECKS.cur)>KOFI_AFTER?`<div class="pullkofi">
      <div id="pullQrKofi" class="qrbox wee"></div>
      <p>If you like these pull sheets, consider supporting the development of the site.
        <span>It stays free either way.</span></p>
    </div>`:""}
  </div>`;
}
function wireProxy(){
  const a=$("pxAll");
  if(a)a.onclick=()=>{PROXYALL=true;save("fs3_proxyall",PROXYALL);
    $("proxyBox").innerHTML=renderProxies();wireProxy()};
}
function wirePull(){
  const rows=pullSorted(pullRows(),PULLSORT);
  document.querySelectorAll(".pchk").forEach(cb=>{
    cb.onchange=()=>{
      const all=pullChecksLoad();
      const forDeck=all[DECKS.cur]=all[DECKS.cur]||{};
      const arr=forDeck[cb.dataset.pk]=forDeck[cb.dataset.pk]||[];
      /* The collapsed box stands for the whole pile, so it sets every slot. */
      if(cb.dataset.pall){
        const q=+cb.dataset.pall;
        forDeck[cb.dataset.pk]=cb.checked?new Array(q).fill(true):[];
      }else arr[+cb.dataset.pi]=cb.checked;
      save(PULLCHECKKEY,all);
      const p=$("pullProgress");
      if(p)p.textContent=`${pullCheckedCount(rows)} / ${rows.reduce((a,r)=>a+r.q,0)} pulled`;
    };
  });
  const h=deckHash(DECKS.cur);
  const deckUrl=h?(location.origin&&location.origin!=="null"
    ?location.origin+location.pathname:location.href.split("#")[0])+"#"+h:"";
  paintQR("pullQrDeck",deckUrl);
  paintQR("pullQrKofi","https://ko-fi.com/J2E225ZV4T");
}
function pullText(){
  const rows=pullSorted(pullRows(),PULLSORT);let out=[DECKS.cur,""],last=null;
  rows.forEach(r=>{const g=pullGroupOf(r,PULLSORT);
    if(g!==last){if(g)out.push("",g+pullSetSuffix(r,PULLSORT));last=g}
    out.push(`${r.q}x  ${r.name}  (#${r.num}, ${r.r})`
      +(r.alsoIn.length?`  [also in ${r.alsoIn.join(", ")}]`:""))});
  out.push("",`Total ${rows.reduce((a,r)=>a+r.q,0)} cards`);
  return out.join("\n");
}

/* ---- QR codes ---- loaded on demand, same lazy-script pattern as the
   Supabase client below — most visits to the Decks page never print, so
   there's no reason to ship a QR encoder in the main bundle for everyone. */
const QRLIB="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
let qrLibPromise=null;
function loadQR(){
  if(window.qrcode)return Promise.resolve(window.qrcode);
  if(qrLibPromise)return qrLibPromise;
  qrLibPromise=new Promise((ok,no)=>{
    const s=document.createElement("script");
    s.src=QRLIB;s.async=true;
    s.onload=()=>window.qrcode?ok(window.qrcode):no(new Error("no global"));
    s.onerror=()=>no(new Error("script blocked"));
    document.head.appendChild(s)});
  return qrLibPromise;
}
function paintQR(elId,text){
  const el=$(elId);if(!el)return;
  if(!text){el.innerHTML="";return}
  loadQR().then(qrcode=>{
    const qr=qrcode(0,"M");qr.addData(text);qr.make();
    const cur=$(elId);if(cur)cur.innerHTML=`<img src="${qr.createDataURL(4,2)}" alt="QR code" width="104" height="104">`;
  }).catch(()=>{});
}

