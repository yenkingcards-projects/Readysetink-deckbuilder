/* ===================== explicit deck saving =====================
   Ben's ask: a deck isn't yours until you press Save and name it.

   What changed. Every add and remove still writes to localStorage — losing
   someone's work to a closed tab would be indefensible — but the deck you are
   building is a DRAFT, held under a reserved name, and only becomes a real
   entry in the Decks tab when it is saved. Signing in starts a fresh draft, so
   you never inherit somebody else's half-built list on a shared computer.

   DRAFT is a name nobody can type: the save dialog rejects it. */
const DRAFT="New deck";
/* In memory only, on purpose — since edits no longer persist until Save
   (see touchDeck()), a reload always lands back on the last-saved deck,
   which is itself clean. A dirty flag that survived the reload would say
   "unsaved" over cards that are, in fact, exactly what's on disk. */
let DECKDIRTY=false;
function markDirty(v){DECKDIRTY=v;paintDeckBar()}
function paintDeckBar(){
  const n=$("dbName"),d=$("dbDirty");if(!n)return;
  n.textContent=DECKS.cur;
  if(d)d.hidden=!DECKDIRTY;
  const sv=$("dbSave");
  if(sv)sv.textContent=(DECKS.cur===DRAFT)?"Save deck":"Save changes";
}

/* 10 dust and a small burst of particles. The burst is decoration over a save
   that has already happened, so it can fail silently and nothing is lost. */
function sparkBurst(x,y){
  try{
    if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const cols=["#ffd400","#e6bf00","#ffffff","#8fb6ff","#2f6fed"];
    for(let i=0;i<26;i++){
      const el=document.createElement("div");
      el.className="spark";
      el.style.background=cols[i%cols.length];
      el.style.left=x+"px";el.style.top=y+"px";
      document.body.appendChild(el);
      const ang=(Math.PI*2*i)/26+(i%3)*0.12;
      const dist=70+(i%7)*16;
      el.animate([
        {transform:"translate(0,0) scale(1)",opacity:1},
        {transform:`translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist+34}px) scale(.3)`,opacity:0}
      ],{duration:750+(i%5)*90,easing:"cubic-bezier(.16,.7,.3,1)"})
        .onfinish=()=>el.remove();
    }
  }catch(e){}
}

/* True once it's already running as its own app — an install nudge aimed at
   someone who already installed it is just noise. iOS has no display-mode
   media query of its own; navigator.standalone is its equivalent. */
const isStandalone=()=>window.matchMedia("(display-mode: standalone)").matches
  ||navigator.standalone===true;
const A2HS_SEEN_KEY="fs3_a2hs_seen";
/* Shown once, the moment saving actually produces a 5th deck — the point
   somebody building on this site for real, not just poking at it, has
   probably been reached. "See how" hands off to the write-up in Settings
   instead of repeating it here, so there is exactly one place these
   instructions live and drift out of sync with. */
function a2hsPrompt(){
  return new Promise(done=>{
    const w=document.createElement("div");w.className="cfmbg";
    w.innerHTML=`<div class="cfm" role="dialog" aria-modal="true">
      <h3>📲 Five decks in!</h3>
      <p>Save Ready Set Ink to your home screen and it opens like its own app — full screen, no browser bar, one tap from your phone.</p>
      <div class="cfmb"><button class="btn" data-no>Maybe later</button>
      <button class="btn go" data-yes>See how →</button></div></div>`;
    document.body.appendChild(w);
    const shut=v=>{w.remove();document.removeEventListener("keydown",key);done(v)};
    const key=e=>{if(e.key==="Escape")shut(false);
      if(e.key==="Enter")shut(true)};
    w.querySelector("[data-no]").onclick=()=>shut(false);
    w.querySelector("[data-yes]").onclick=()=>shut(true);
    w.onclick=e=>{if(e.target===w)shut(false)};
    document.addEventListener("keydown",key)})}

async function saveDeckPrompt(ev){
  const cards=dlist();
  if(!cards.length){toast("Nothing to save yet — add some cards first");return}
  let name=DECKS.cur;
  if(DECKS.cur===DRAFT){
    name=await namePrompt("Save this deck","What do you want to call it?","");
    if(name===null)return;
    name=String(name).trim();
    if(!name){toast("A deck needs a name");return}
    if(name===DRAFT){toast(`"${DRAFT}" is reserved — pick another name`);return}
    if(DECKS.list[name]){
      const ok=await confirmBox("That name is taken",
        `You already have a deck called "${name}". Saving will replace it.`,"Replace it",true);
      if(!ok)return}
    /* Move the draft's contents to the chosen name and start a fresh draft. */
    DECKS.list[name]={...DECKS.list[DRAFT]};
    DECKS.list[DRAFT]={fmt:DECKS.list[DRAFT].fmt,coco:DECKS.list[DRAFT].coco,cards:{}};
    DECKS.cur=name;
  }
  stampEdited(name);saveDecks();markDirty(false);
  /* Ten dust for saving a deck -- once per deck, not once per press. Saving
     the same list twice used to pay again every time, which made the Save
     button a dust tap. Keyed by name because a name is the only identity a
     deck has here; rename it and it can pay once more, which is a great deal
     less lucrative than pressing the same button. */
  {const c=load(DECKSAVEKEY,{});c[name]=(c[name]||0)+1;save(DECKSAVEKEY,c)}
  DUST.paid=DUST.paid||{};
  let paid=0;
  if(!DUST.paid[name]){DUST.paid[name]=Date.now();save(DUSTKEY,DUST);paid=dustGain(10)}
  if(ev&&ev.clientX)sparkBurst(ev.clientX,ev.clientY);
  toast(paid?`Saved "${name}" · +10 dust`:`Saved "${name}"`);
  renderDeck&&renderDeck();
  /* Exactly the save that brings the total to 5 — not "5 or more", so this
     never re-fires after a deck gets deleted and the count dips back down
     and up again. */
  const deckCount=Object.keys(DECKS.list).length-1;   // minus the draft
  if(deckCount===5&&!isStandalone()&&!load(A2HS_SEEN_KEY,false)){
    save(A2HS_SEEN_KEY,true);
    if(await a2hsPrompt()){A2HSOPEN=true;OPAGE="pref";save("fs3_opage",OPAGE);showTab("tOther")}
  }
}

/* A text prompt in the site's chrome, same reasoning as confirmBox. */
function namePrompt(title,body,initial){
  return new Promise(done=>{
    const w=document.createElement("div");w.className="cfmbg";
    w.innerHTML=`<div class="cfm"><h3>${esc(title)}</h3><p>${esc(body)}</p>
      <input class="npin" id="npIn" maxlength="48" value="${esc(initial||"")}">
      <div class="cfmb"><button class="btn" data-no>Cancel</button>
      <button class="btn go" data-yes>Save</button></div></div>`;
    document.body.appendChild(w);
    const inp=w.querySelector("#npIn");
    const shut=v=>{w.remove();document.removeEventListener("keydown",key);done(v)};
    const key=e=>{if(e.key==="Escape")shut(null);
      if(e.key==="Enter")shut(inp.value)};
    w.querySelector("[data-no]").onclick=()=>shut(null);
    w.querySelector("[data-yes]").onclick=()=>shut(inp.value);
    w.onclick=e=>{if(e.target===w)shut(null)};
    document.addEventListener("keydown",key);
    inp.focus();inp.select()})}

/* Rename a deck.

   DECKS.list is keyed BY NAME, so a rename is a re-key, not a field edit: the
   entry has to be rebuilt under the new key and the old one deleted. Rebuilt
   in the original insertion order rather than moved to the end, because the
   decks list is rendered straight from Object.keys — renaming a deck should
   not silently reorder the shelf.

   Also updates DECKS.cur when it pointed at the old name, or the builder would
   be left editing a deck that no longer exists. */
async function renameDeck(old){
  if(!DECKS.list[old])return;
  const raw=await namePrompt("Rename deck",
    `“${old}” becomes whatever you type. The cards, format and Coconut all come with it.`,old);
  if(raw==null)return;
  const n=raw.trim();
  if(!n||n===old)return;
  if(DECKS.list[n]){toast(`You already have a deck called “${n}”`);return}
  const rebuilt={};
  for(const k of Object.keys(DECKS.list))rebuilt[k===old?n:k]=DECKS.list[k];
  DECKS.list=rebuilt;
  if(DECKS.cur===old)DECKS.cur=n;
  saveDecks();award("named");
  render();paintDeckBar();
  if($("vDecks").classList.contains("on"))renderDecksPage();
  toast(`Renamed to “${n}”`)}

/* ===================== the borrow list =====================
   What the pull list can't tell you: which cards you'd have to get hold of
   before you could actually sleeve this deck up.

   Counted by NAME, not by printing. A deck asks for "four Elsa - Snow Queen";
   any four copies satisfy it, whatever art they carry. Counting shortfall per
   printing would tell someone they were missing a card they were holding. */
const BORROWDEF={greet:"Hey Friend,",ask:"borrow",when:"for the deck",
  sort:"setnum",skip:[],close:"Thanks!"};
/* Three layers: the built-in defaults, the template this person saved to their
   profile, then whatever they are fiddling with right now. */
let BORROW=Object.assign({},BORROWDEF,load("fs3_borrowdef",{}),load("fs3_borrow",{}));
const ASKS=[["borrow","borrow them"],["trade","trade for them"],["buy","buy them off you"],
  ["borrowbuy","borrow them, or buy them if you'd rather"],
  ["any","borrow, trade or buy them — whatever suits you"]];
const WHENS=[["for the deck","for the deck"],["just for the night","just for the night"],
  ["for the championship","for the championship"],
  ["until mine arrive in the mail","until mine arrive in the mail"],
  ["for our next game night","for our next game night"],
  ["for the weekend","for the weekend"],["","(don't mention how long)"]];

/* How many copies of this card name I own, across every printing of it. */
function ownedByName(c){return prints(c).reduce((a,pr)=>a+ownTotal(pkey(c.f,pr)),0)}
function borrowRows(){
  return dlist().map(({c,q})=>({c,q,have:ownedByName(c)}))
    .filter(x=>x.have<x.q)
    .map(x=>({...x,need:x.q-x.have}))}
function borrowText(){
  const rows=pullSorted(
    borrowRows().filter(x=>BORROW.skip.indexOf(x.c.f)<0)
      .map(x=>({...pullRows().find(r=>r.c.f===x.c.f),q:x.need})),
    BORROW.sort);
  if(!rows.length)return "";
  const ask=(ASKS.find(a=>a[0]===BORROW.ask)||ASKS[0])[1];
  const when=BORROW.when?" "+BORROW.when:"";
  /* Single break after the greeting — a text message, not a letter. The blank
     line only separates the ask from the list. */
  return `${BORROW.greet}\nI want to play a supercool deck but I don't have these cards. `
    +`Could you look if you have them and let me know if I could ${ask}${when}?\n\n`
    +rows.map(r=>`${r.q}x ${r.name} (${r.cost} cost, ${r.ink||"no ink"}, ${r.set})`).join("\n")
    +(BORROW.close?`\n\n${BORROW.close}`:"")}

/* A square picture of the cards being asked for, with a quantity on each, so
   the ask can be sent as an image where a wall of text would be ignored. 1:1
   rather than 16:9 on purpose — a widescreen image shrinks to a letterboxed
   strip in an iMessage bubble; a square one fills it.

   Card art is served from another origin. A canvas that has drawn a
   cross-origin image cannot be exported unless that server allows it, so the
   images are requested with crossOrigin="anonymous" and any that fail are
   drawn as a titled placeholder instead. A missing picture is a worse outcome
   than a plain-looking one, so nothing here is allowed to throw. */
function borrowImage(){
  const rows=borrowRows().filter(x=>BORROW.skip.indexOf(x.c.f)<0);
  if(!rows.length){toast("Nothing to picture — you have all of these");return}
  const W=1080,H=1080,PAD=24,HEAD=96,GAP=14,AR=940/674;
  /* Cards are portrait 674x940. Sizing the width from the canvas and the
     height from whatever was left over stretched them into letterboxes, which
     would visibly distort real art. Instead try every column count and keep
     the one that fits the 16:9 frame with the cards biggest and their shape
     intact. */
  let cols=1,cw=0,ch=0;
  for(let c=1;c<=8;c++){
    const w=Math.floor((W-PAD*2-(c-1)*GAP)/c), h=Math.round(w*AR);
    const rn=Math.ceil(rows.length/c);
    if(HEAD+rn*h+(rn-1)*GAP+PAD<=H && w>cw){cols=c;cw=w;ch=h}}
  /* Seven cards across six columns left one stranded on its own row with half
     the picture empty. Spread them evenly instead: the same number of rows,
     but no row more than one card longer than another. */
  if(cw){const rn=Math.ceil(rows.length/cols);cols=Math.ceil(rows.length/rn);
    cw=Math.floor((W-PAD*2-(cols-1)*GAP)/cols);ch=Math.round(cw*AR);
    while(HEAD+rn*ch+(rn-1)*GAP+PAD>H){cw-=8;ch=Math.round(cw*AR)}}
  if(!cw){ /* more cards than fit at any size — shrink to the tallest that does */
    cols=8;cw=Math.floor((W-PAD*2-7*GAP)/8);
    const rn=Math.ceil(rows.length/cols);
    ch=Math.floor((H-HEAD-PAD-(rn-1)*GAP)/rn);cw=Math.round(ch/AR)}
  const rowsN=Math.ceil(rows.length/cols);
  const offX=Math.floor((W-(cols*cw+(cols-1)*GAP))/2);
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;
  const x=cv.getContext("2d");
  x.fillStyle="#6578a8";x.fillRect(0,0,W,H);
  x.fillStyle="#202638";x.fillRect(0,0,W,HEAD-16);
  x.fillStyle="#ffd400";x.font="700 40px Arial";
  x.fillText("Cards I'm looking for",PAD,58);
  x.fillStyle="#dce7f5";x.font="400 22px Arial";
  x.fillText(`${rows.reduce((a,r)=>a+r.need,0)} cards · ${DECKS.cur}`,PAD,86);
  let done=0;
  const finish=()=>{
    if(++done<rows.length)return;
    try{
      cv.toBlob(bl=>{
        if(!bl){toast("Couldn't build the image");return}
        const u=URL.createObjectURL(bl),a=document.createElement("a");
        a.href=u;a.download="cards-im-looking-for.png";a.click();
        setTimeout(()=>URL.revokeObjectURL(u),4000);
        toast("Image saved")});
    }catch(e){toast("The card art wouldn't allow an image export")}};
  rows.forEach((r,i)=>{
    const cx=offX+(i%cols)*(cw+GAP), cy=HEAD+Math.floor(i/cols)*(ch+GAP);
    const draw=img=>{
      try{
        if(img)x.drawImage(img,cx,cy,cw,ch);
        else{x.fillStyle="#dce7f5";x.fillRect(cx,cy,cw,ch);
          x.fillStyle="#202638";x.font="700 20px Arial";
          wrapText(x,r.c.f,cx+10,cy+72,cw-20,24)}
        /* quantity badge */
        const bw=Math.max(52,String(r.need).length*22+30);
        x.fillStyle="#b2000e";x.fillRect(cx,cy,bw,44);
        x.fillStyle="#ffffff";x.font="800 30px Arial";
        x.fillText("×"+r.need,cx+12,cy+33);
      }catch(e){}
      finish()};
    const src=(prints(r.c)[0]||{}).i||r.c.img;
    if(!src)return draw(null);
    /* An image request that neither loads nor errors leaves the export hanging
       for ever with no feedback — which is exactly what a blocked or very slow
       CDN does. Every card gets eight seconds, then it is drawn as a
       placeholder and the picture is produced regardless. */
    const im=new Image();im.crossOrigin="anonymous";
    let settled=false;
    const once=v=>{if(settled)return;settled=true;draw(v)};
    const t=setTimeout(()=>once(null),8000);
    im.onload=()=>{clearTimeout(t);once(im)};
    im.onerror=()=>{clearTimeout(t);once(null)};
    im.src=src});
}
function wrapText(x,t,px,py,max,lh){
  const words=String(t).split(" ");let line="",y=py;
  words.forEach(w=>{const test=line?line+" "+w:w;
    if(x.measureText(test).width>max&&line){x.fillText(line,px,y);line=w;y+=lh}
    else line=test});
  if(line)x.fillText(line,px,y)}

let BORROWOPEN=false;
function renderBorrow(){
  const box=$("borrowBox");if(!box)return;
  const missing=borrowRows();
  if(!COLLON||!missing.length){box.innerHTML="";return}
  const kept=missing.filter(x=>BORROW.skip.indexOf(x.c.f)<0);
  box.innerHTML=`<div class="borrow">
    <div class="bhead">
      <b>Looks like you don't have ${missing.reduce((a,x)=>a+x.need,0)} of these cards</b>
      <span class="sp"></span>
      <button class="btn" id="bCust">${BORROWOPEN?"Done":"Customise"}</button>
      <button class="btn" id="bImg" title="A square image with each card's picture and how many you need — built for sharing in iMessage">Save image</button>
      <button class="btn go" id="bCopy">Copy the message</button>
    </div>
    <p class="bnote">Copy this and send it to someone who might lend them to you.</p>
    ${BORROWOPEN?`<div class="bcust">
      <label>Greeting<input id="bGreet" value="${esc(BORROW.greet)}"></label>
      <label>Asking to<select id="bAsk">${ASKS.map(([v,l])=>
        `<option value="${v}"${BORROW.ask===v?" selected":""}>${esc(l)}</option>`).join("")}</select></label>
      <label>For how long<select id="bWhen">${WHENS.map(([v,l])=>
        `<option value="${esc(v)}"${BORROW.when===v?" selected":""}>${esc(l)}</option>`).join("")}</select></label>
      <label>List order<select id="bSort">${PULLSORTS.map(([v,l])=>
        `<option value="${v}"${BORROW.sort===v?" selected":""}>${esc(l)}</option>`).join("")}</select></label>
      <label>Sign off<input id="bClose" value="${esc(BORROW.close)}"></label>
      <div class="bpick"><b>Leave any of these out</b>
        ${missing.map(x=>`<label class="bchk"><input type="checkbox" data-bskip="${esc(x.c.f)}"
          ${BORROW.skip.indexOf(x.c.f)<0?" checked":""}> ${esc(x.c.f)} <i>×${x.need}</i></label>`).join("")}</div>
      <div class="bsave">
        <button class="btn go" id="bDefault">Save this as my default</button>
        <span>${BORROW.saved?"Saved — new decks start from this.":"These settings apply to this browser until you save them."}</span>
      </div>
    </div>`:""}
    <textarea class="btext" id="bText" readonly rows="${Math.min(18,7+kept.length)}">${esc(borrowText())}</textarea>
  </div>`;
  $("bCust").onclick=()=>{BORROWOPEN=!BORROWOPEN;renderBorrow()};
  $("bImg").onclick=borrowImage;
  $("bCopy").onclick=()=>{const t=$("bText");t.select();
    try{document.execCommand("copy")}catch(e){}
    toast("Message copied")};
  const bd=$("bDefault");
  if(bd)bd.onclick=()=>{
    /* The skip list is per-deck by nature — the cards you happen to be missing
       today are not a preference — so it is deliberately not part of the saved
       template. Everything else is. */
    BORROW.saved=true;
    const tpl={greet:BORROW.greet,ask:BORROW.ask,when:BORROW.when,
      sort:BORROW.sort,close:BORROW.close,saved:true};
    save("fs3_borrowdef",tpl);save("fs3_borrow",BORROW);
    toast("Saved as your default");renderBorrow()};
  /* Left wired but disabled. The layout works — what doesn't is the card art:
     it is served from another origin, and a canvas that has drawn a
     cross-origin image can only be exported if that server permits it. The
     real fix is to proxy the images through our own domain, which is now
     possible on Vercel. Until then this would silently produce a picture of
     empty rectangles, which is worse than not offering it. */
  const put=(id,k)=>{const el=$(id);if(el)el.onchange=()=>{
    BORROW[k]=el.value;save("fs3_borrow",BORROW);renderBorrow()}};
  put("bGreet","greet");put("bAsk","ask");put("bWhen","when");
  put("bSort","sort");put("bClose","close");
  box.querySelectorAll("[data-bskip]").forEach(cb=>cb.onchange=()=>{
    const f=cb.dataset.bskip,i=BORROW.skip.indexOf(f);
    if(cb.checked){if(i>=0)BORROW.skip.splice(i,1)}else if(i<0)BORROW.skip.push(f);
    save("fs3_borrow",BORROW);renderBorrow()});
}

