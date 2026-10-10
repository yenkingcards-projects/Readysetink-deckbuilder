/* ===================== rarity symbols =====================
   Ben's shapes, drawn as inline SVG rather than image files: nothing to host,
   crisp at any size, and — the reason it matters — they are ours. Reproducing
   Ravensburger's own rarity marks would be the picture version of borrowing
   their words, which PROJECT-NOTES already rules out for our own furniture.

   Every shape carries a carbon outline. "White chevron" on a white list row is
   otherwise invisible, and a symbol that means something has to be visible
   against the surface it sits on, not just against the page.

   The shape never carries the meaning alone — the rarity name is always beside
   it, so nobody is relying on telling bronze from gold at 14 pixels. */
const RARSYM={
  "Common":     ['<circle cx="7" cy="7" r="5.2"/>',                      "#9aa3b2"],
  "Uncommon":   ['<path d="M1.8 9.6 L7 3.4 L12.2 9.6 L10.4 11 L7 6.9 L3.6 11 Z"/>', "#ffffff"],
  "Rare":       ['<path d="M7 1.8 L12.6 12 L1.4 12 Z"/>',                "#b0763a"],
  "Super Rare": ['<path d="M7 1 L13 7 L7 13 L1 7 Z"/>',                  "#c3c9d4"],
  "Legendary":  ['<path d="M7 1.2 L12.7 5.4 L10.5 12.2 L3.5 12.2 L1.3 5.4 Z"/>', "#e0b23c"],
  /* Proposed, because these three exist in the data and Ben's list didn't
     reach them: Special is promos and sits outside the ladder, Epic and Iconic
     are the newer premium tiers. */
  "Special":    ['<rect x="2" y="2" width="10" height="10"/>',           "#67748f"],
  "Epic":       ['<path d="M7 1 L12.2 4 L12.2 10 L7 13 L1.8 10 L1.8 4 Z"/>', "#8f6bb0"],
  "Iconic":     ['<path d="M7 1 L8.5 5.5 L13 7 L8.5 8.5 L7 13 L5.5 8.5 L1 7 L5.5 5.5 Z"/>', "#23758a"],
};
function rarSym(r){
  if(r==="Enchanted")
    return `<svg class="rsym" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5"
      fill="none" stroke="url(#rsrain)" stroke-width="3"/><circle cx="7" cy="7" r="6.5"
      fill="none" stroke="#202638" stroke-width="1"/></svg>`;
  const d=RARSYM[r];if(!d)return "";
  return `<svg class="rsym" viewBox="0 0 14 14" aria-hidden="true">${
    d[0].replace("<","<").replace(/\/>$/,` fill="${d[1]}" stroke="#202638" stroke-width="1"/>`)}</svg>`}
/* One gradient for the page rather than one per row — repeating an element id
   hundreds of times is invalid even where browsers tolerate it. */
const RAINDEF=`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <linearGradient id="rsrain" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#e0453c"/><stop offset="20%" stop-color="#e0913c"/>
    <stop offset="40%" stop-color="#d8d23a"/><stop offset="60%" stop-color="#4e9c6b"/>
    <stop offset="80%" stop-color="#3f7fd9"/><stop offset="100%" stop-color="#8f6bb0"/>
  </linearGradient></defs></svg>`;
const rarLabel=r=>`${rarSym(r)}<span>${esc(String(r||""))}</span>`;

/* ===================== the collection =====================
   A CARD is a name. A PRINTING is one physical version of it. Decks reference
   names; a collection references printings, because you own the enchanted, not
   "an Elsa".

   Where a printing lives in the data: cards with more than one printing carry
   them in pr[]; the 1,947 cards with only one carry it on the card itself.
   1,947 + 1,295 = the 3,242 printings the notes describe. prints() papers over
   that split so nothing downstream has to know about it.

   Stored as {key: [normal, foil]} and sparse — only what you own is written,
   so an empty collection costs two bytes rather than 3,242 zeroes. */
const prints=c=>(c.pr&&c.pr.length)?c.pr
  :[{s:c.s,num:c.num,r:c.r,i:c.img,l:c.imgL,p:c.p,pf:c.pf}];
const pkey=(f,pr)=>f+"|"+pr.s+"|"+pr.num;
let COLL=load(K_COLL,{});
let COLLON=load(K_COLLON,true);
const owned=k=>COLL[k]||[0,0];
const ownTotal=k=>{const o=owned(k);return o[0]+o[1]};
function setOwned(k,n,f){
  n=Math.max(0,Math.min(99,n|0));f=Math.max(0,Math.min(99,f|0));
  if(!n&&!f)delete COLL[k];else COLL[k]=[n,f];
  save(K_COLL,COLL)}
/* ===================== card prices =====================
   ONE seam. Everything on the site that wants to know what a card is worth
   asks cardPrice(c) and gets a number of dollars or null. Nothing else knows
   where the number came from.

   Today's source is a SNAPSHOT: build_flounder.py bakes Lorcast's usd /
   usd_foil into the card data on every build, so the numbers are as fresh as
   the last build and never call out to anything at runtime. That keeps the
   site a single offline file. DATA.priced is the date they were taken, and the
   site says so rather than implying they're live.

   Swapping to a live feed later is assigning one function to PRICE_SRC.

   TCGplayer's own API is deliberately not used: it's a server-to-server flow
   with a client secret, and a static file has nowhere to keep a secret. See
   PRICES.md. The one price thing that needs no key at all is the BUYING —
   their mass entry page takes the card list in the URL. That is tcgUrl(). */
/* ===================== where the artwork comes from =====================
   The card DATA is ours — baked in at build time from card-db.json, which
   lives in the repo. Nothing on this page fetches card data from anybody.

   The card IMAGES are the one thing still loaded from someone else's server at
   runtime, and they are stored in the data as absolute upstream URLs. That is
   deliberate: it is what lets this file work opened straight off a disk, with
   no server and no network configuration, which is a promise worth keeping.

   IMG_PROXY is the switch for changing that WITHOUT giving that up. Turn it on
   and, when the site is served over http(s), every card image is fetched from
   readysetink's own /img/ path instead — which vercel.json rewrites to the
   upstream host and caches for a year. Same pictures, our URL, our cache, and
   upstream stops paying our bandwidth bill. Opened from a file it ignores the
   switch entirely and uses the original URLs, because a rewrite needs a server.

   It is OFF until Ben decides. Serving the artwork from his own domain rather
   than pointing at someone else's is a real change in posture and it is his
   call to make, not a default to inherit. See CARD-DATA.md. */
const IMG_PROXY=false;
const IMG_MAP=[["https://cards.lorcast.io/","/img/lorcast/"],
               ["https://api.lorcana.ravensburger.com/images/","/img/rav/"]];
const imgURL=u=>{
  if(!IMG_PROXY||!u||location.protocol==="file:")return u;
  for(const [from,to] of IMG_MAP)if(u.startsWith(from))return to+u.slice(from.length);
  return u};
let PRICE_SRC=c=>c.p;
let PRICES=load("fs3_prices",false);
function rawPrice(c){
  if(!PRICE_SRC||!c)return null;
  try{const v=PRICE_SRC(c);return typeof v==="number"&&isFinite(v)&&v>0?v:null}
  catch(e){return null}}

/* ===================== the Flounder Price =====================
   Ben's ladder. Real market numbers are ugly and forgettable — $2.41, $0.79,
   $13.86 — and every Lorcana site shows the same ugly numbers because they all
   read the same feed. These don't. Every price on this site lands on one of a
   short list of deliberately silly values, so a price here is recognisably OURS.

   IT IS THEREFORE NOT A MARKET QUOTE, and the site must never pretend it is.
   Three rules follow from that, and they are not negotiable:
     1. Anything shown as a Flounder Price is labelled as one, with the real
        number available underneath it on the card page.
     2. Everything to do with actually SPENDING money — the shopping bundles,
        the budget tiers, the collection's total value — uses the raw price.
        Rounding somebody's $20 budget into a joke is how you get a person
        turning up at a checkout with the wrong amount of money.
     3. The ladder is monotonic. A more expensive card can never come out
        cheaper than a less expensive one, so sorting and filtering still mean
        what they say.

   Bands are [up to, becomes]. The first eight are Ben's exactly; above $10 the
   steps land on repdigits, which is where the joke lives. */
const PRICE_LADDER=[
  [0.25,   0.25],   // bulk. everything at the bottom is a quarter
  [0.80,   0.67],
  [1.50,   1],
  [2.50,   2],
  [3.25,   3],
  [5,      5],
  [7,      7],
  [10,     10],
  [13,     11.11],
  [16,     14.44],
  [20,     17.77],
  [25,     22.22],
  [30,     27.77],
  [40,     33.33],
  [50,     44.44],
  [65,     55.55],
  [80,     66.67],
  [100,    77.77],
  [150,    111.11],
  [250,    222.22]];
const PRICE_TOP=333.33;   // above $250 the number stops meaning anything anyway
function funPrice(v){
  if(v==null)return null;
  for(let i=0;i<PRICE_LADDER.length;i++)if(v<=PRICE_LADDER[i][0])return PRICE_LADDER[i][1];
  return PRICE_TOP}
/* The one price everything on screen uses. */
function cardPrice(c){return funPrice(rawPrice(c))}
/* Integers stay integers so the ladder reads as a ladder: $7, not $7.00 —
   which is exactly what makes $7.77 land. */
const money=v=>v==null?"":"$"+(Number.isInteger(v)?v:v.toFixed(2));
/* The CHEAPEST way to own a playable copy — across every printing, foil if
   that's all there is. This is what the money filters run on, and it is the
   only definition of "an expensive card" that isn't a lie: a card whose
   enchanted sells for $80 is not an expensive card if its common is 40¢. Over
   $40 here means every way of owning it costs over $40. */
function cardPriceMin(c){
  if(!c)return null;
  let best=null;
  const eat=v=>{if(typeof v==="number"&&v>0&&(best==null||v<best))best=v};
  const rows=(c.pr&&c.pr.length)?c.pr:[{p:c.p,pf:c.pf}];
  rows.forEach(pr=>eat(pr.p!=null?pr.p:pr.pf));
  if(best==null)eat(c.p!=null?c.p:c.pf);
  return funPrice(best)}
/* The other end: the priciest printing. A different question — not "is this
   card expensive" but "does this card have a chase version" — so it gets its
   own chip rather than quietly changing what the tiers mean. */
function cardPriceMax(c){
  if(!c)return null;
  let best=null;
  const eat=v=>{if(typeof v==="number"&&v>0&&(best==null||v>best))best=v};
  ((c.pr&&c.pr.length)?c.pr:[]).forEach(pr=>{eat(pr.p);eat(pr.pf)});
  eat(c.p);eat(c.pf);
  return funPrice(best)}
/* "≈" is doing real work in the label, not just flavour — the number next to
   it is OUR rounding, not a quote. The full explanation lives behind the ⓘ
   instead of a hover tooltip, so it's reachable on a phone (nothing to hover
   on touch) and doesn't have to compete with the price for space on a small
   tile. Built as a function, not a const, because it has to read priceDate()
   at call time — that value isn't populated yet when this script first runs. */
const priceBlurb=()=>`We round to whichever price we think is cool — not a real `
  +`quote. This is a snapshot last updated ${priceDate()}, not a live feed, so it `
  +`won't match what TCGplayer actually charges you once condition, seller and `
  +`shipping are added.`;
function infoBox(title,body){
  return new Promise(done=>{
    const w=document.createElement("div");w.className="cfmbg";
    w.innerHTML=`<div class="cfm" role="dialog" aria-modal="true"><h3>🤷 ${esc(title)}</h3><p>${esc(body)}</p>
      <div class="cfmb"><button class="btn go" data-ok>Got it</button></div></div>`;
    document.body.appendChild(w);
    const shut=()=>{w.remove();document.removeEventListener("keydown",key);done()};
    const key=e=>{if(e.key==="Escape"||e.key==="Enter")shut()};
    w.querySelector("[data-ok]").onclick=shut;
    w.onclick=e=>{if(e.target===w)shut()};
    document.addEventListener("keydown",key)})}
/* Flat estimate, not computed from anything — Ben's own number for "roughly
   what TCGplayer tacks on," shown in low-key gray so it reads as a heads-up,
   not a second price competing with the real one. */
const SHIP_EST="$1.49";
/* A small custom line-icon instead of the 🛒 emoji, for the one spot (the
   card modal's buy button) worth the extra polish — single currentColor
   stroke so it inherits the button's own icon color, no external library.
   The .cartico CSS gives it a once-a-minute bob (see cartbob keyframes). */
const CART_SVG=`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" `
  +`stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`
  +`<path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6.2"/>`
  +`<circle cx="10" cy="20" r="1.4" fill="currentColor" stroke="none"/>`
  +`<circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none"/></svg>`;
function priceChip(c){
  if(!PRICES)return "";
  const v=cardPrice(c),raw=rawPrice(c);
  if(v==null)return "";
  return `<button class="prc" data-buyone="${esc(c.f)}"
    title="Market price ${money(raw)} as of ${esc(priceDate())} — a rounded snapshot, not a live quote. Tap to buy on TCGplayer — affiliate link, opens in a new tab."
    aria-label="${esc(c.f)}, approximately ${money(v)}, plus about ${SHIP_EST} shipping. Buy on TCGplayer, opens in a new tab.">
    <span class="prcval">≈ ${money(v)}</span><span class="buyicon">🛒</span>
  </button>`}
const priceDate=()=>DATA.priced||"";
/* TCGplayer mass entry. Their format is "<qty> <name>" per line, lines joined
   by ||, and Lorcana names there are "Name - Version" exactly like ours. */
const TCG_LINE=x=>`${x.q||1} ${x.c.n}${x.c.v?" - "+x.c.v:""}`;
/* ---- affiliate -------------------------------------------------------------
   Ben's Impact/TCGplayer partner link. Every buy link on the site wraps its
   real destination through this ONE redirect — there is no second place to
   change it. The redirect format is Impact's own: their domain, then
   ?u=<the actual TCGplayer URL, url-encoded>. It sets the attribution cookie
   and forwards the visitor on to exactly the page they were headed to. */
const TCG_AFF_LINK="https://partner.tcgplayer.com/GbYLzr";
const affix=u=>TCG_AFF_LINK+"?u="+encodeURIComponent(u);
const tcgUrl=rows=>affix("https://www.tcgplayer.com/massentry?productline=Lorcana%20TCG&c="
  +encodeURIComponent(rows.map(TCG_LINE).join("||")));
/* Shown once, the first time a signed-in person actually leaves for
   TCGplayer — not to everyone, since a browsing guest hasn't proven they'll
   ever click "buy" and doesn't need an interstitial in front of it. The
   destination URL is baked into the dialog's own button so window.open()
   fires from THAT click, not from an awaited continuation of the original
   one — popup blockers key off a direct user gesture, and an await in
   between is enough to lose it in some browsers. */
const TCG_NOTICE_KEY="fs3_tcgnotice_seen";
function tcgFirstClickNotice(url){
  return new Promise(done=>{
    const w=document.createElement("div");w.className="cfmbg";
    w.innerHTML=`<div class="cfm" role="dialog" aria-modal="true">
      <h3>Heading to TCGplayer</h3>
      <p>This is Ready Set Ink's TCGplayer affiliate link — it may earn us a small commission, at no extra cost to you.</p>
      <p>Once you're there, TCGplayer's own cart optimization tool can combine sellers to save on shipping — worth a look before you check out. Shipping times vary by seller.</p>
      <div class="cfmb"><button class="btn go" data-go>Continue to TCGplayer →</button></div>
    </div>`;
    document.body.appendChild(w);
    const shut=()=>{w.remove();document.removeEventListener("keydown",key);done()};
    const key=e=>{if(e.key==="Escape")shut()};
    w.querySelector("[data-go]").onclick=()=>{
      window.open(url,"_blank","noopener");
      save(TCG_NOTICE_KEY,true);
      shut()};
    w.onclick=e=>{if(e.target===w)shut()};
    document.addEventListener("keydown",key)})}
function tcgOpen(rows,what){
  if(!rows.length){toast("Nothing to buy — "+what);return}
  const url=tcgUrl(rows);
  if(ACCT.user&&!load(TCG_NOTICE_KEY,false)){tcgFirstClickNotice(url);return}
  window.open(url,"_blank","noopener")}

const collCopies=()=>Object.keys(COLL).reduce((a,k)=>a+COLL[k][0]+COLL[k][1],0);
const collFoils=()=>Object.keys(COLL).reduce((a,k)=>a+COLL[k][1],0);

/* Every printing in the game, flattened once and cached — the set checklist,
   the pull list and the completion counts all walk this. */
let ALLPR=null;
function allPrintings(){
  if(ALLPR)return ALLPR;
  ALLPR=[];
  CARDS.forEach(c=>prints(c).forEach(pr=>ALLPR.push({c,pr,k:pkey(c.f,pr)})));
  return ALLPR}
/* Sets, newest first, with how many printings each holds. */
function setList(){
  /* A card's sn is the name of ITS set, which is not the set of every printing
     it has — a promo reprint of a First Chapter card still carries "The First
     Chapter" on the card itself. Naming a set from whichever card happened to
     be first therefore labelled six different sets "The First Chapter". A name
     is only trustworthy when the printing IS that card's own set. */
  const names={},m={};
  CARDS.forEach(c=>{if(c.s!=null&&c.sn&&!names[c.s])names[c.s]=c.sn});
  allPrintings().forEach(x=>{(m[x.pr.s]=m[x.pr.s]||
    {s:x.pr.s,n:0,name:names[x.pr.s]||("Set "+x.pr.s)}).n++});
  return Object.values(m).sort((a,b)=>
    (parseInt(b.s,10)||0)-(parseInt(a.s,10)||0)||String(a.s).localeCompare(b.s))}
/* Collector numbers are strings — "4a", "205". Sort numerically with the
   variant letter as tiebreak, or #10 lands between #1 and #2. */
/* Collector numbers arrive as strings ("4a", "205") for multi-printing cards
   and as numbers for some single-printing ones, so coerce before comparing. */
const numSort=(a,b)=>{
  const na=parseInt(a,10)||0,nb=parseInt(b,10)||0;
  return na-nb||String(a).localeCompare(String(b))};

