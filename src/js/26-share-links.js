/* ===================== searches you can send someone =====================
   THE CHANGE BEN DIDN'T ASK FOR.

   Until now a search existed only inside one browser tab. You could build the
   exact list of cards that proves a point — every card that punishes the whole
   table, under $10, that a Coconut wants — and then the only way to give it to
   anybody was to describe it and hope they rebuilt it. Reload the page and even
   YOU lost it.

   Every facet now lives in the address bar. That means:
     · a search survives a reload, a crash, and a closed laptop
     · the back button steps back through your searches, as it should
     · a search is a LINK. It goes in a video description, a Discord message, a
       pinned comment, a reply to someone asking "what removal is there in
       Amber". Every one of those is a person arriving at this site on a page
       that already answers their question.

   That last point is the reason this is worth more than it looks. It costs one
   function each way and no bytes on the wire, and it turns every search anyone
   ever builds here into something that can be handed to someone else.

   Encoding rules: short keys, sets as comma lists, omit anything at its
   default so a plain search stays a short link. replaceState, not pushState,
   for keystrokes — otherwise typing eight letters puts eight entries in the
   back button. */
const HKEYS=[["q","q"],["ab","a"],["ink","i"],["type","t"],["rar","r"],
  ["kw","k"],["cls","c"],["sto","f"],["tag","g"],["art","u"]];
function searchHash(){
  const p=[];
  const put=(k,v)=>{if(v!==""&&v!=null)p.push(k+"="+encodeURIComponent(v))};
  HKEYS.forEach(([f,k])=>{
    const v=S[f];
    if(typeof v==="string")put(k,v);
    else if(v&&v.size)put(k,[...v].join(","))});
  if(S.terms.length)put("x",S.terms.join(","));
  if(S.dual)put("d","1");
  if(S.set)put("s",S.set);
  if(S.inkwell!=="any")put("w",S.inkwell);
  if(S.sort!=="set")put("o",S.sort);
  if(S.fl)put("fl","1");
  [["cost","cs"],["st","sn"],["wi","wn"],["lo","ln"]].forEach(([f,k])=>{
    const r=S[f];
    if(r[0]!=null||r[1]!=null)put(k,(r[0]??"")+"-"+(r[1]??""))});
  return p.join("&");
}
let HASHSELF=false;   // ignore the hashchange our own write causes
function syncHash(){
  if(!$("vSearch")||!document.body)return;
  const h=searchHash();
  const want=h?"#"+h:location.pathname+location.search;
  if((location.hash.replace(/^#/,""))===h)return;
  HASHSELF=true;
  try{history.replaceState(null,"",want)}catch(e){}
  setTimeout(()=>{HASHSELF=false},0);
}
function applyHash(h){
  const raw=(h||"").replace(/^#/,"");
  if(!raw)return false;
  const q=new URLSearchParams(raw);
  /* Clear first: a link has to mean exactly what it says, not "what it says on
     top of whatever you already had switched on". */
  ["ab","ink","type","rar","kw","cls","sto","tag","art"].forEach(f=>S[f].clear());
  S.q="";S.terms=[];S.dual=false;S.set="";S.inkwell="any";S.fl=false;
  S.cost=[null,null];S.st=[null,null];S.wi=[null,null];S.lo=[null,null];
  HKEYS.forEach(([f,k])=>{
    const v=q.get(k);if(v==null)return;
    if(typeof S[f]==="string")S[f]=v;
    else v.split(",").filter(Boolean).forEach(x=>S[f].add(x))});
  const x=q.get("x");if(x)S.terms=x.split(",").filter(Boolean);
  if(q.get("d"))S.dual=true;
  if(q.get("s"))S.set=q.get("s");
  if(q.get("w"))S.inkwell=q.get("w");
  if(q.get("o"))S.sort=q.get("o");
  if(q.get("fl"))S.fl=true;
  [["cost","cs"],["st","sn"],["wi","wn"],["lo","ln"]].forEach(([f,k])=>{
    const v=q.get(k);if(v==null)return;
    const [a,b]=v.split("-");
    S[f]=[a===""?null:+a,b===""?null:+b]});
  S.limit=150;
  const qi=$("q");if(qi)qi.value=S.q;
  const so=$("sort");if(so)so.value=S.sort;
  return true;
}
window.addEventListener("hashchange",()=>{
  if(HASHSELF)return;
  if(applyHash(location.hash))render();
});
function copySearchLink(){
  const h=searchHash();
  if(!h){toast("Search for something first, then the link will have something in it");return}
  const url=location.origin&&location.origin!=="null"
    ? location.origin+location.pathname+"#"+h
    : location.href.split("#")[0]+"#"+h;
  /* Copy always happens — it's the part that works everywhere, including
     desktop browsers with no share sheet at all. The share sheet, where the
     device has one, opens on top of that rather than instead of it: it needs
     a user gesture, which a button click already is. */
  navigator.clipboard.writeText(url).then(()=>{
    if(navigator.share)navigator.share({title:"Ready Set Ink search",url}).catch(()=>{});
    else toast("Link to this search copied");
  },()=>toast("Copy failed"));
}

(function(){
  const b=$("bub");
  for(let i=0;i<14;i++){const e=document.createElement("i");
    const s=6+Math.random()*22;e.style.width=e.style.height=s+"px";
    e.style.left=(Math.random()*100)+"%";
    e.style.animationDuration=(15+Math.random()*16)+"s";
    e.style.animationDelay=(-Math.random()*24)+"s";
    e.style.setProperty("--dx",(Math.random()*70-35)+"px");b.appendChild(e)}
})();

init();
rollLbl();
if(BOOTHASH.startsWith("#d="))fromHash();
/* Filters start closed and remember whichever way you leave them. Wired here
   rather than in renderSide() because renderSide re-runs on every keystroke —
   binding a toggle handler there would stack hundreds of them. */
(()=>{const sd=$("side");if(!sd)return;
  sd.open=load("fs3_sideopen",false);
  sd.addEventListener("toggle",()=>save("fs3_sideopen",sd.open));})();
(()=>{const w=load("fs3_deckw","");const wr=document.querySelector(".wrap");
  if(w&&wr)wr.style.setProperty("--deckw",w)})();
render();
const cn=$("collN");if(cn)cn.textContent=
  CARDS.reduce((a,c)=>a+Math.max(1,(c.pr||[]).length),0).toLocaleString();
try{document.body.insertAdjacentHTML("afterbegin",RAINDEF)}catch(e){}
/* Save is bound inside renderDeck() now — the button is rebuilt with the panel,
   so a binding made once at boot would be thrown away by the first re-render. */
paintDeckBar();
applyPrefs();
showTab("tDeck");
drawTitle();
/* My Lorcana Journal (/match-history/) is a separate page, so it never writes
   fs3_dust itself — an open tab here would save over it. It queues award ids
   instead and they're paid out here, through award(), which already handles
   Dust-off and one-payout-ever. */
(()=>{const q=load("fs3_award_queue",[]);if(!q.length)return;
  localStorage.removeItem("fs3_award_queue");q.forEach(id=>award(id));})();
