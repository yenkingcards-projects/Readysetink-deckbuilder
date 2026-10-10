/* ===================== guess the card =====================
   A sliver of art and three names. Two things make or break this:

   1. NEVER show the name printed on the card. On a Lorcana face the art runs
      to roughly 55% of the height and the title bar sits right under it, so
      every crop is clamped into the top 52% — otherwise the answer is sitting
      in the picture.
   2. The wrong answers have to be plausible. Three random cards out of 2,543
      is a coin flip you always win; distractors are drawn from the same ink,
      preferring the same set, and never share the real card's name. */
const G_ZOOM=[5.2,2.6,1.5];        // scale factors, tight → loose
const G_ART_BOTTOM=0.52;           // art only: below this the card prints its name
let GS=load("fs3_guess",{score:0,streak:0,best:0,played:0,right:0});
let GQ=null;                       // the round in play

const guessPool=()=>CARDS.filter(c=>c.img&&c.ty!=="Location");
function newRound(){
  const pool=guessPool();
  const answer=pool[Math.floor(Math.random()*pool.length)];
  // plausible wrong answers: same ink first, same set if we can get it
  const ink=(answer.co||[])[0];
  const sameInk=pool.filter(c=>c.f!==answer.f&&c.n!==answer.n&&(c.co||[]).includes(ink));
  const sameSet=sameInk.filter(c=>c.s===answer.s);
  const bag=(sameSet.length>=2?sameSet:sameInk.length>=2?sameInk:pool.filter(c=>c.n!==answer.n)).slice();
  const wrong=[];
  while(wrong.length<4&&bag.length){          // five options total, as asked
    const pick=bag.splice(Math.floor(Math.random()*bag.length),1)[0];
    if(!wrong.some(w=>w.n===pick.n))wrong.push(pick);
  }
  // Focal point is chosen ONCE and reused at every zoom level, so zooming out
  // pulls back from the same spot rather than jumping somewhere new. The range
  // is computed at the LOOSEST zoom so the window is legal at all three.
  const W=420,H=300,loose=G_ZOOM[G_ZOOM.length-1];
  const imgW=W*loose,imgH=imgW*940/674;
  const padX=(W/2)/imgW,padY=(H/2)/imgH;
  const fy0=padY,fy1=Math.max(padY,G_ART_BOTTOM-padY);
  GQ={answer,options:[answer,...wrong].sort(()=>Math.random()-0.5),
      fx:padX+Math.random()*Math.max(0,1-2*padX),
      fy:fy0+Math.random()*Math.max(0,fy1-fy0),
      z:0,done:null};
}
function guessFrame(){
  const won=GQ.done&&GQ.done===GQ.answer.f;
  const W=420,H=300,sc=won?0.717:G_ZOOM[GQ.z];   // 0.717 fits the whole card in frame
  const imgW=W*sc,imgH=imgW*940/674;
  const left=Math.round(W/2-GQ.fx*imgW),top=Math.round(H/2-GQ.fy*imgH);
  const lost=GQ.done&&GQ.done!==GQ.answer.f;
  return `<div class="gframe${won?" reveal":""}">
    <img src="${esc(GQ.answer.img)}" alt="mystery card"
     style="width:${Math.round(imgW)}px;left:${won?Math.round(W/2-imgW/2):left}px;top:${
       won?Math.round(H/2-imgH/2):top}px"></div>`+
    (lost?`<div class="gx">✖</div>`:"");
}
let GJUSTANSWERED=false;
/* A guessing game is a rhythm — look, decide, next, look, decide — and reaching
   for the mouse between every round breaks it. 1/2/3 answers, Z zooms out,
   Enter or Space moves on. Bound once, at the document, and it does nothing
   unless the game is the visible page and you aren't typing in a field. */
document.addEventListener("keydown",e=>{
  if(!$("vGuess")||!$("vGuess").classList.contains("on")||!GQ)return;
  if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  const k=e.key;
  if(!GQ.done&&/^[123]$/.test(k)){
    const btn=$("guesspage").querySelectorAll("[data-g]")[+k-1];
    if(btn){e.preventDefault();btn.click()}
    return;
  }
  if(!GQ.done&&(k==="z"||k==="Z")){const z=$("gZoom");if(z&&!z.disabled){e.preventDefault();z.click()}return}
  if(GQ.done&&(k==="Enter"||k===" ")){const n=$("gNext");if(n){e.preventDefault();n.click()}}
});
function renderGuess(){
  if(!GQ)newRound();
  const worth=G_ZOOM.length-GQ.z;
  const acc=GS.played?Math.round(GS.right/GS.played*100):0;
  $("guesspage").innerHTML=`<div class="page">
    <button class="btn" id="gExit" style="margin-bottom:12px">← Other</button>
    <h1><span class="gi">🔍</span>Guess the card</h1>
    <p class="lede">A sliver of the art and three names. Answer straight away for the most
      points — every zoom out is worth one less. The card's own name is never in shot.</p>
    <!-- Answering used to render the reveal TWICE: a full-width block bolted
         on above the whole page, and the result panel down in the side column,
         each with its own "Next card" button. On a phone, where the two
         columns stack, that meant every answer shoved the game down the screen
         and left two identical buttons a scroll apart. One reveal now, in the
         place you were already looking. -->
    <div class="gwrap">
      <div>
        <div class="gstage">${guessFrame()}</div>
        <div class="gzoom">
          <button class="btn" id="gZoom"${GQ.z>=G_ZOOM.length-1||GQ.done?" disabled":""}>
            🔎 Zoom out${GQ.z<G_ZOOM.length-1?` (worth ${worth-1} instead of ${worth})`:""}</button>
          <span class="gw">Worth <b>${GQ.done?0:worth}</b></span>
        </div>
      </div>
      <div class="gside">
        <div class="gscore">
          <div><b>${GS.score}</b><i>Score</i></div>
          <div><b>${GS.streak}</b><i>Streak</i></div>
          <div><b>${GS.best}</b><i>Best</i></div>
          <div><b>${acc}%</b><i>Right</i></div>
        </div>
        <div class="gopts">${GQ.options.map((c,i)=>{
          const cls=!GQ.done?"":c.f===GQ.answer.f?" right":(GQ.done===c.f?" wrong":" dim");
          return `<button class="gopt${cls}" data-g="${esc(c.f)}"${GQ.done?" disabled":""}>
            <kbd>${i+1}</kbd><span><b>${esc(c.n)}</b>${c.v?`<i>${esc(c.v)}</i>`:""}</span>
          </button>`}).join("")}</div>
        <div class="gkeys">Keys: <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> to answer ·
          <kbd>Z</kbd> zoom out · <kbd>Enter</kbd> next</div>
        ${GQ.done?`<div class="gres ${GQ.done===GQ.answer.f?"win":"lose"}" id="gres">
          <div class="gresh">${GQ.done===GQ.answer.f
            ?`✓ Correct — +${GQ.won} point${GQ.won===1?"":"s"}`:"✗ Not that one"}</div>
          <!-- The card is shown either way. Getting it right and being shown a
               thumbnail of what you already named is a reward; getting it wrong
               and being shown it is the answer. Same block, same size. -->
          <div class="gful">${GQ.answer.img?`<img src="${esc(GQ.answer.img)}" alt="${esc(GQ.answer.f)}">`:""}
            <div><b>${esc(GQ.answer.n)}</b>${GQ.answer.v?`<span>${esc(GQ.answer.v)}</span>`:""}
            <span>${esc(GQ.answer.sn)} #${esc(String(GQ.answer.num))} · ${esc(GQ.answer.r)}</span></div></div>
          <button class="btn go" id="gNext">Next card →</button>
        </div>`:``}
      </div>
    </div>
    ${leaderboard("guess")}</div>`;
  const $$=(id,fn)=>{const e=$(id);if(e)e.onclick=fn};
  $$("gExit",()=>{OPAGE="";save("fs3_opage",OPAGE);GQ=null;showTab("tOther")});
  $$("gZoom",()=>{if(GQ.z<G_ZOOM.length-1){GQ.z++;renderGuess()}});
  $$("gNext",()=>{GQ=null;renderGuess()});
  /* On a phone the options are near the bottom of a tall page, so the reveal
     that appears under them can be off screen. Bring it to the user rather
     than making them go and find it — and only when it has just appeared. */
  if(GQ.done&&GJUSTANSWERED){
    GJUSTANSWERED=false;
    const r=$("gres");
    if(r)requestAnimationFrame(()=>r.scrollIntoView({
      behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",
      block:"nearest"}));
  }
  $("guesspage").querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{
    if(GQ.done)return;
    const pickedRight=b.dataset.g===GQ.answer.f;
    GQ.done=b.dataset.g;GQ.won=pickedRight?G_ZOOM.length-GQ.z:0;
    GS.played++;
    if(pickedRight){GS.right++;GS.score+=GQ.won;GS.streak++;GS.best=Math.max(GS.best,GS.streak);
      award("sharp");
      if(GQ.z===0)award("eagle");            // guessed from the tightest crop
      if(GS.streak>=5)award("streak5");
      if(GS.streak>=10)unlockHidden("h_ten");
      lbPost("guess",GS.best);
      dustGain(GQ.won)}                       // the points themselves are dust
    else{QSTREAK.guess=0;GS.streak=0}
    GJUSTANSWERED=true;
    save("fs3_guess",GS);renderGuess();
    if(pickedRight)toast(`+${GQ.won} · streak ${GS.streak}`);
  });
}

/* Collection controls inside the card modal — one row per printing, because
   this is where you land after finding a card you just pulled. Hidden wholesale
   by the settings toggle via .collonly. */
function collRows(c){
  const rs=prints(c);
  return `<div class="mcoll collonly">
    <b>In my collection</b>
    ${rs.map((pr,i)=>{
      const k=pkey(c.f,pr),o=owned(k);
      const setn=(setList().find(x=>x.s===pr.s)||{}).name||("Set "+pr.s);
      return `<div class="mcr" data-mk="${esc(String(k))}">
        <span class="mcn">${rarSym(pr.r)}${esc(String(setn))} <i>#${esc(String(pr.num))}</i></span>
        <span class="cq"><em>Normal</em><button data-mm="n">−</button><b>${o[0]}</b><button data-mp="n">+</button></span>
        <span class="cq"><em>Foil</em><button data-mm="f">−</button><b>${o[1]}</b><button data-mp="f">+</button></span>
      </div>`}).join("")}
  </div>`}
function wireCollRows(c){
  const box=document.querySelector("#modal .mcoll");if(!box)return;
  box.querySelectorAll(".mcr").forEach(row=>{
    const k=row.dataset.mk;
    row.querySelectorAll("[data-mp],[data-mm]").forEach(btn=>btn.onclick=()=>{
      const o=owned(k).slice(),which=btn.dataset.mp||btn.dataset.mm,up=!!btn.dataset.mp;
      const i=which==="f"?1:0;
      o[i]=Math.max(0,o[i]+(up?1:-1));
      setOwned(k,o[0],o[1]);openM(c.f)})})}

/* Add a saved deck's cards to the collection.
   A deck names cards; a collection names printings, so this takes the BASE
   printing — the ordinary one from the card's own set — as Ben chose.
   It only touches cards you have none of, so pressing it twice never inflates
   a count, and a card you already own at the enchanted is left alone. */
function deckToCollection(){
  const rows=dlist();
  let added=0,skipped=0,cards=0;
  rows.forEach(({c,q})=>{
    if(ownedByName(c)>0){skipped++;return}
    const base=prints(c)[0];
    setOwned(pkey(c.f,base),q,0);
    added++;cards+=q});
  return {added,skipped,cards,total:rows.length}}
/* The undo. Takes the deck's copies back OUT of the collection, never below
   zero, and never touches foils — the same asymmetry as putting them in.
   Removes the printing the deck put there (the base one) so that adding and
   then removing leaves the collection where it started. */
function deckOffCollection(){
  const rows=dlist();
  let touched=0,cards=0;
  rows.forEach(({c,q})=>{
    const base=prints(c)[0],k=pkey(c.f,base),o=owned(k);
    if(!o[0])return;
    const take=Math.min(o[0],q);
    setOwned(k,o[0]-take,o[1]);
    touched++;cards+=take});
  return {touched,cards,total:rows.length}}

