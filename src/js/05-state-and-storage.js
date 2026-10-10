/* ===================== state ===================== */
let CARDS=[],CLASSES=[],KWS=[],STORIES=[],ARTISTS=[],SETS=[];
let STARS=new Set(load(K_STAR,[]));
const S={q:"",ab:new Set(),ink:new Set(),dual:false,type:new Set(),rar:new Set(),kw:new Set(),
  cls:new Set(),sto:new Set(),tag:new Set(),terms:[],set:"",inkwell:"any",sort:"set",
  cost:[null,null],st:[null,null],wi:[null,null],lo:[null,null],
  fl:false,limit:150,clsQ:"",stoQ:"",tagQ:"",art:new Set(),artQ:"",
  /* Widen what free text is allowed to match. Art is ON by default — vague
     art search is the whole point of this site, and a first-timer typing
     "blue dog" should get Stitch without hunting for a switch. Franchise is
     off: it's a very broad net that quietly pads every result. The ART TAGS /
     FRANCHISE sidebar facets and Enter-to-tokenise pills work either way. */
  tagS:load("fs3_tagS",true),stoS:load("fs3_stoS",false),flS:load("fs3_flS",false)};
let DVIEW=load(K_DVIEW,"img");
let DSORT=load("fs3_dsort","type");
let DANA=load("fs3_dana",false);
let DECKS=load(K_DECKS,{cur:"New deck",list:{"New deck":{fmt:"infinity",coco:null,cards:{}}}});
/* First-run nudge: "click to add" shows until the very first card lands in the
   starter deck. The moment they add one they've worked it out, so it stops. */
/* The first-run nudge belongs to an untouched draft. It used to test for the
   literal name "Main"; the starting deck is now the draft, so it names the
   constant rather than a string that has already changed once. */
const tipsOn=()=>TAB!=="tSearch"&&DECKS.cur===DRAFT&&!dtotal();
const G={coco:null,pair:null,copies:null,staples:null,mode:null,cocoOpen:false};
/* Nick Wilde's Coconut text calls out one item by name, so that step offers it
   directly instead of making you go and search for it. */
const COCO_EXTRA={"Nick Wilde":{f:"Pawpsicle",n:4,why:"his Coconut lets you run up to 4 copies"}};
/* Recommended synergies are on by default once we have something to recommend
   FROM — a chosen Coconut, or a deck already leaning on a tribe. */
const hasCore=()=>dlist().some(({c})=>c.tribal.length>0);
const effMode=()=>G.mode||((G.coco!=null||hasCore())?"rec":null);

function load(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast("Storage full");return 0}
  /* The one seam where local state becomes cloud state. Everything already
     saves through here, so syncing a key is adding it to SYNCED — no call site
     changes. Guarded because ACCT is declared at the bottom of the file and
     save() runs during startup, before that line has been reached. */
  try{if(typeof ACCT!=="undefined")ACCT.queue(k)}catch(e){}
  return 1}
function saveDecks(){save(K_DECKS,DECKS);checkPerfect60()}
/* "Last edited" — stamped only where a deck's own content is actually
   written (new/duplicated/imported/saved), never on saveDecks() itself: that
   function also runs just from switching which deck is current (picking one
   from the grid, the dropdown), which touches nothing about the deck and
   should never look like an edit. */
const stampEdited=name=>{const dk=DECKS.list[name];if(dk)dk.ts=Date.now()};

/* ===================== decks as links, and lists you can paste =====================

   Three things that between them turn a deck from something trapped in one
   browser into something you can pass around:

     · deckHash()/applyDeckHash() — a whole deck in the address bar
     · parseDeckList()            — somebody else's text list, pasted in
     · duplicateDeck()            — fork it before you wreck it

   ---- how a card is written down -------------------------------------------
   Not by name (long, and full of spaces and apostrophes) and NOT by index into
   DATA.cards (that array's order changes every time the data is rebuilt, so
   yesterday's link would silently decode into different cards — the worst
   possible failure for a share link). Set code plus collector number is what
   is printed on the card itself and never changes.

   It is very nearly unique: exactly one pair of cards in the whole game shares
   a (set, number) at card level. Rather than pretend otherwise, cards in a
   collision group get a suffix by their position in a name-sorted list, which
   is deterministic across builds. */
let _dkey=null;
function dkeyMaps(){
  if(_dkey)return _dkey;
  const groups={};
  CARDS.forEach(c=>{const k=c.s+"."+c.num;(groups[k]=groups[k]||[]).push(c)});
  const toKey=new Map(),fromKey=new Map();
  Object.entries(groups).forEach(([k,list])=>{
    if(list.length===1){toKey.set(list[0].f,k);fromKey.set(k,list[0]);return}
    list.slice().sort((a,b)=>a.f.localeCompare(b.f)).forEach((c,i)=>{
      const kk=k+"."+i;toKey.set(c.f,kk);fromKey.set(kk,c);
      if(i===0)fromKey.set(k,c)});   // a bare key still resolves, to the first
  });
  return (_dkey={toKey,fromKey});
}
const deckKey=c=>dkeyMaps().toKey.get(c.f)||"";
const deckCard=k=>dkeyMaps().fromKey.get(k)||null;

/* fmt|name|key*qty!key*qty… — short enough to paste into a chat message. */
function deckHash(name){
  const d=DECKS.list[name];if(!d)return "";
  const parts=Object.entries(d.cards).map(([f,q])=>{
    const c=CARDS.find(x=>x.f===f);if(!c||!q)return "";
    return deckKey(c)+(q>1?"*"+q:"")}).filter(Boolean);
  if(!parts.length)return "";
  return "deck="+encodeURIComponent(d.fmt)
    +"&dn="+encodeURIComponent(name===DRAFT?"Shared deck":name)
    +(d.coco!=null?"&dc="+d.coco:"")
    +"&dl="+parts.join("!");
}
/* Returns {name,fmt,coco,cards,missing} or null. Never writes anything — the
   caller decides whether to accept it, because silently replacing somebody's
   deck with one from a link would be indefensible. */
function readDeckHash(raw){
  const q=new URLSearchParams((raw||"").replace(/^#/,""));
  const list=q.get("dl");if(!list)return null;
  const cards={};let missing=0;
  list.split("!").forEach(part=>{
    if(!part)return;
    const [k,n]=part.split("*");
    const c=deckCard(k);
    if(!c){missing++;return}
    if(c.f===BANNED){missing++;return}   // the ban has no back door
    cards[c.f]=(cards[c.f]||0)+(parseInt(n,10)||1)});
  const fmt=q.get("deck");
  return {name:q.get("dn")||"Shared deck",
    fmt:FMT[fmt]?fmt:"infinity",
    coco:q.get("dc")!=null?+q.get("dc"):null,
    cards,missing,total:Object.values(cards).reduce((a,b)=>a+b,0)};
}
function copyDeckLink(name){
  const h=deckHash(name||DECKS.cur);
  if(!h){toast("There's nothing in this deck to link to yet");return}
  const base=(location.origin&&location.origin!=="null")
    ? location.origin+location.pathname : location.href.split("#")[0];
  navigator.clipboard.writeText(base+"#"+h)
    .then(()=>toast("Link to this deck copied — anyone who opens it gets a copy"),
          ()=>toast("Copy failed"));
}
/* A deck arriving by link is offered, never imposed: it lands as a NEW deck
   alongside whatever you already had. */
async function offerDeckFromHash(raw){
  const d=readDeckHash(raw);
  if(!d||!d.total)return false;
  const ok=await confirmBox("Someone sent you a deck",
    `“${d.name}” — ${d.total} cards, ${FMT[d.fmt].l}.`
    +(d.missing?` ${d.missing} card${d.missing===1?" wasn't":"s weren't"} recognised and will be left out.`:"")
    +" It'll be added as a new deck of your own; nothing you already have is touched.",
    "Add it to my decks");
  if(!ok)return false;
  let n=d.name,i=2;
  while(DECKS.list[n])n=d.name+" "+(i++);
  mark("adding a shared deck");
  DECKS.list[n]={fmt:d.fmt,coco:d.coco,cards:d.cards};
  DECKS.cur=n;stampEdited(n);saveDecks();markDirty(false);
  award("named");
  render();paintDeckBar();
  toast(`Added “${n}” — it's yours to edit`);
  return true;
}

/* ---- pasting somebody else's list ----------------------------------------
   People arrive with decks that already exist somewhere else, and until now
   the only door in was clicking sixty cards. Every format anyone actually
   pastes puts the quantity and the name on one line, so one parser covers the
   lot: "4 Elsa - Snow Queen", "4x Elsa - Snow Queen", "Elsa - Snow Queen x4",
   TCGplayer mass entry, and the Dreamborn style that appends a set and number.

   Matching is on the normalised name, so punctuation, casing and apostrophes
   don't matter. Falling back to the NAME ONLY (no version) is deliberate but
   only when it is unambiguous — "4 Elsa" should work if there is exactly one
   Elsa, and should be reported as unmatched if there are nine. */
function parseDeckList(text){
  const norm=s=>(s||"").toLowerCase().replace(/['’ʼ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const byFull=new Map(),byName=new Map();
  CARDS.forEach(c=>{
    byFull.set(norm(c.f),c);
    const k=norm(c.n);(byName.get(k)||byName.set(k,[]).get(k)).push(c)});
  const found={},bad=[];
  let n=0,banned=0;
  (text||"").split(/\r?\n/).forEach(line=>{
    let t=line.trim();
    if(!t||/^(deck|sideboard|maindeck|total)\b/i.test(t)||/^[#/]/.test(t))return;
    let qty=1;
    /* leading "4", "4x", "4 x" */
    let m=t.match(/^(\d{1,2})\s*[xX*]?\s+(.*)$/);
    if(m){qty=+m[1];t=m[2]}
    else{
      /* trailing "x4" */
      m=t.match(/^(.*?)\s*[xX]\s*(\d{1,2})$/);
      if(m){t=m[1];qty=+m[2]}
    }
    /* Dreamborn and TCGplayer both like to append the set and number in
       brackets or after a dash of digits. Strip anything trailing that is
       clearly bookkeeping rather than part of the name. */
    t=t.replace(/\s*\((?:[^)]*)\)\s*\d*\s*$/,"").replace(/\s+\d{1,3}\/\d{1,3}\s*$/,"").trim();
    if(!t)return;
    const k=norm(t);
    let c=byFull.get(k);
    if(!c){
      const hits=byName.get(k);
      if(hits&&hits.length===1)c=hits[0];
    }
    if(!c){bad.push(line.trim());return}
    /* The ban has no back door. It didn't have one through the old importer
       and it doesn't get one through this one either. */
    if(c.f===BANNED){banned++;return}
    found[c.f]=(found[c.f]||0)+Math.max(1,Math.min(99,qty));
    n+=qty});
  return {cards:found,total:n,names:Object.keys(found).length,bad,banned};
}
async function importDeckPrompt(){
  const text=await bigPrompt("Paste a deck list",
    "One card per line, with how many of each. It understands “4 Elsa - Snow Queen”, "
    +"“4x Elsa - Snow Queen”, TCGplayer mass entry, and most exports from other deck sites. "
    +"Anything it can't place is reported rather than dropped quietly.");
  if(text==null)return;
  const r=parseDeckList(text);
  if(!r.total){toast("Nothing in that looked like a card list");return}
  const ok=await confirmBox("Import this list",
    `${r.total} cards (${r.names} different) recognised.`
    +(r.bad.length?` ${r.bad.length} line${r.bad.length===1?"":"s"} couldn't be matched: ${r.bad.slice(0,3).join("; ")}${r.bad.length>3?"…":""}.`:"")
    +(r.banned?" Chip the Teacup was left out — he is banned here and there is no way in.":"")
    +" It'll be added as a new deck.","Import it");
  if(!ok)return;
  let base="Imported deck",n=base,i=2;
  while(DECKS.list[n])n=base+" "+(i++);
  mark("importing a deck list");
  DECKS.list[n]={fmt:deck().fmt,coco:null,cards:r.cards};
  DECKS.cur=n;stampEdited(n);saveDecks();markDirty(false);
  render();paintDeckBar();
  if($("vDecks").classList.contains("on"))renderDecksPage();
  toast(`Imported ${r.total} cards into “${n}”`+(r.bad.length?` · ${r.bad.length} line(s) skipped`:""));
}
/* namePrompt's little sister — same chrome, a textarea instead of an input,
   and Enter makes a new line rather than submitting. */
function bigPrompt(title,body){
  return new Promise(done=>{
    const w=document.createElement("div");w.className="cfmbg";
    w.innerHTML=`<div class="cfm wide"><h3>${esc(title)}</h3><p>${esc(body)}</p>
      <textarea class="npta" id="bpIn" rows="12" spellcheck="false"
        placeholder="4 Elsa - Snow Queen&#10;3 Be Prepared&#10;2 Pawpsicle"></textarea>
      <div class="cfmb"><button class="btn" data-no>Cancel</button>
      <button class="btn go" data-yes>Read it</button></div></div>`;
    document.body.appendChild(w);
    const ta=w.querySelector("#bpIn");
    const shut=v=>{w.remove();document.removeEventListener("keydown",key);done(v)};
    const key=e=>{if(e.key==="Escape")shut(null)};
    w.querySelector("[data-no]").onclick=()=>shut(null);
    w.querySelector("[data-yes]").onclick=()=>shut(ta.value);
    w.onclick=e=>{if(e.target===w)shut(null)};
    document.addEventListener("keydown",key);
    ta.focus()})}

/* ---- fork it before you wreck it -----------------------------------------
   Rename and delete existed; copy didn't. Without a copy, trying "the same
   deck but with two more songs" means destroying the version you liked, so
   people simply don't try it. */
async function duplicateDeck(from){
  const src=DECKS.list[from];if(!src)return;
  const total=Object.values(src.cards).reduce((a,b)=>a+b,0);
  let base=String(from).replace(/\s+copy(\s+\d+)?$/i,"")+" copy",n=base,i=2;
  while(DECKS.list[n])n=base+" "+(i++);
  const raw=await namePrompt("Duplicate this deck",
    `A copy of “${from}” with all ${total} cards, its format and its Coconut. The original is left alone.`,n);
  if(raw==null)return;
  const name=String(raw).trim();
  if(!name){toast("A deck needs a name");return}
  if(name===DRAFT){toast(`“${DRAFT}” is reserved — pick another name`);return}
  if(DECKS.list[name]){toast(`You already have a deck called “${name}”`);return}
  mark("duplicating a deck");
  DECKS.list[name]={fmt:src.fmt,coco:src.coco,cards:{...src.cards}};
  DECKS.cur=name;stampEdited(name);saveDecks();markDirty(false);
  if(Object.keys(DECKS.list).length>=3)award("deck2");
  render();paintDeckBar();
  if($("vDecks").classList.contains("on"))renderDecksPage();
  toast(`Copied to “${name}” — edit away`);
}
/* Card changes stay in memory only until Save is pressed — that's the whole
   point of the button. Closing the tab or refreshing before saving discards
   them; the "unsaved" badge is a warning, not decoration. */
function touchDeck(){if(typeof markDirty==="function")markDirty(true)}

/* ===================== undo =====================
   Until now every deck edit was permanent. Not "permanent until you save" —
   permanent. Miss the plus and hit the minus and the card is gone; press Clear
   and sixty cards are gone; delete the wrong deck and it is gone, and the only
   thing standing between somebody and an hour's work was one confirm() dialog.
   A deck is the single most valuable thing anyone has on this site and it was
   the one thing with no way back.

   Snapshots, not a command log. A deck is a few hundred bytes, so copying the
   whole of DECKS before each change costs nothing measurable and — unlike
   replaying inverse operations — cannot drift out of step with the thing it is
   meant to protect. Thirty deep, which is far more than anyone needs and still
   under 100 KB.

   mark() is called BEFORE the change, with a label, so the button can say what
   it will undo rather than just "undo". */
const UNDO_MAX=30;
let UNDO=[],REDO=[];
const deckSnap=()=>JSON.stringify({cur:DECKS.cur,list:DECKS.list});
function mark(label){
  UNDO.push({label,snap:deckSnap()});
  if(UNDO.length>UNDO_MAX)UNDO.shift();
  REDO=[];                       // a new edit forks the timeline
  paintUndo();
}
function applySnap(str){
  const o=JSON.parse(str);
  DECKS.list=o.list;DECKS.cur=o.cur;
  markDirty(true);render();paintDeckBar();
  if($("vDecks").classList.contains("on"))renderDecksPage();
}
function undo(){
  if(!UNDO.length){toast("Nothing to undo");return}
  const step=UNDO.pop();
  REDO.push({label:step.label,snap:deckSnap()});
  applySnap(step.snap);
  toast("Undid: "+step.label);
  paintUndo();
}
function redo(){
  if(!REDO.length){toast("Nothing to redo");return}
  const step=REDO.pop();
  UNDO.push({label:step.label,snap:deckSnap()});
  applySnap(step.snap);
  toast("Redid: "+step.label);
  paintUndo();
}
function paintUndo(){
  const b=$("dundo");if(!b)return;
  b.hidden=!UNDO.length;
  if(UNDO.length)b.title="Undo: "+UNDO[UNDO.length-1].label+"  (Ctrl+Z)";
}
/* Ctrl+Z / Cmd+Z, and Shift for redo — but never while typing in a box, where
   the browser's own undo is the one you meant. */
document.addEventListener("keydown",e=>{
  if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=="z")return;
  if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  if(document.querySelector(".cfmbg"))return;      // a dialog is open; leave it alone
  e.preventDefault();
  e.shiftKey?redo():undo();
});
/* Sixty of one card is illegal in every format, so this can only ever be done
   on purpose. Checked on save rather than on add so it fires the moment the
   sixtieth lands, whichever route put it there. */
function checkPerfect60(){
  const d=DECKS.list[DECKS.cur];if(!d)return;
  const e=Object.entries(d.cards||{});
  const tot=e.reduce((a,x)=>a+x[1],0);
  if(e.length===1&&e[0][0]==="Flounder - Voice of Reason"){
    if(e[0][1]===60)unlockHidden("h_60");
    if(e[0][1]>=100)unlockHidden("h_100");     // Ben's kill-switch egg
  }
  /* Five hundred Flounder of either printing, plus exactly one Hidden Trap.
     Unreachable by accident and unhinted anywhere on the site -- import a list
     to get there, the tile counter would take all afternoon. */
  {const fl=e.filter(([f])=>/^Flounder - /.test(f)).reduce((a,x)=>a+x[1],0);
   if(fl>=500&&(d.cards["Hidden Trap"]||0)===1)unlockHidden("h_500");}
  if(tot===61)unlockHidden("h_61");
  if(tot>=60&&e.length===tot)unlockHidden("h_single");   // every card exactly once
  // ten cards from a single franchise
  const byStory={};
  e.forEach(([f,q])=>{const c=CARDS.find(x=>x.f===f);
    if(c&&c.sto)byStory[c.sto]=(byStory[c.sto]||0)+q});
  if(Object.values(byStory).some(n=>n>=10))unlockHidden("h_franchise");
  // Rabbit, but only in rabbit season
  const m=new Date().getMonth();          // 2 = March, 3 = April
  if((m===2||m===3)&&e.some(([f])=>/^Rabbit\b/.test(f)))unlockHidden("h_rabbit");
}
function isStar(f){return STARS.has(f)||STAPLES.has(f)}
function deck(){if(!DECKS.list[DECKS.cur])DECKS.cur=Object.keys(DECKS.list)[0]||"Main";
  if(!DECKS.list[DECKS.cur])DECKS.list[DECKS.cur]={fmt:"infinity",coco:null,cards:{}};return DECKS.list[DECKS.cur]}
const $=i=>document.getElementById(i);
const esc=s=>(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
let tT;function toast(m){const t=$("toast");t.textContent=m;t.classList.add("on");clearTimeout(tT);tT=setTimeout(()=>t.classList.remove("on"),2600)}

/* ===================== data ===================== */
function init(){
  const setmeta=DATA.sets||{};
  CARDS=DATA.cards.map(c=>{
    c.f=c.v?c.n+" - "+c.v:c.n;
    c.ef=c.ef||"";
    c.sd=(setmeta[c.s]||{}).d||"1970-01-01";
    c.sn=(setmeta[c.s]||{}).name||("Set "+c.s);
    c.tribal=[];
    return c;
  });
  const cs=new Set(),kw=new Set(),so=new Set(),ar=new Set(),st=new Map();
  CARDS.forEach(c=>{c.sub.forEach(x=>cs.add(x));c.kw.forEach(k=>k[0]&&kw.add(k[0]));
    (c.ar||[]).forEach(a=>ar.add(a));
    if(c.sto)so.add(c.sto); st.set(c.s,{n:c.sn,d:c.sd})});
  // localeCompare, not raw codepoint sort — otherwise "Mickey Mouse & Friends"
  // lands before "Mickey and the Beanstalk" because 'M' < 'a' in ASCII.
  const alpha=(a,b)=>a.localeCompare(b);
  CLASSES=[...cs].sort(alpha); KWS=[...kw].sort(alpha); STORIES=[...so].sort(alpha);
  ARTISTS=[...ar].sort(alpha);
  SETS=[...st.entries()].sort((a,b)=>b[1].d.localeCompare(a[1].d));
  // tribal boost — "your <Classification> characters gain/get…", verified against real classifications
  const cset=new Set(CLASSES);
  const re=/\b(?:your|their)\s+(?:other\s+)?([A-Z][A-Za-z' ]{2,20}?)\s+characters?\s+(?:gain|get|cost|may|can|count)/g;
  CARDS.forEach(c=>{const f=new Set();let m;re.lastIndex=0;
    while((m=re.exec(c.ef))!==null){const w=m[1].trim();if(cset.has(w))f.add(w)}c.tribal=[...f]});
  // precompute chip membership once — 30 chips × 2.5k cards on every keystroke would crawl
  CARDS.forEach(c=>{c.ab=new Set();AB.forEach(a=>{if(a.fn?a.fn(c):a.re.test(c.ef))c.ab.add(a.id)})});
  buildHay();   // the search haystack, built once — see the note on HAYF
  /* The card count and the data date used to sit in the masthead, level with
     the site name. They are housekeeping — true, occasionally useful, and not
     what anyone opens the site to read — so they live at the bottom of Settings
     now. Still filled if a template has the element, because the tagger and the
     notes editor share this boot code. */
  {const st=$("stat");if(st)st.textContent=CARDS.length+" cards · data "+(DATA.generated||"");}
}

