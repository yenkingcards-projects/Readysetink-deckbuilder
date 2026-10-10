/* ===================== quiz minigames =====================
   Three games, one engine, because they only differ in what they show you:

     ability  — a named ability, five names       ("SURGE OF POWER" → Sisu)
     flavour  — the flavour text, five names
     reveal   — facts one at a time, worth less each time you ask for another

   Ability names and flavour text come from LorcanaJSON as authored fields, not
   scraped out of the rules text — an earlier attempt at parsing the ALL-CAPS run
   truncated "A WONDERFUL DREAM" to "A WONDERFUL". 1,681 cards carry a named
   ability, 1,620 carry flavour text, so both pools are healthy. */
const QUIZZES={
 ability:{t:"Guess the ability",icon:"💬",
   lede:"A named ability and five cards. Reveal the full wording if you need it — it costs you a point.",
   pool:()=>CARDS.filter(c=>(c.an||[]).length),
   clue:c=>c.an[0],
   more:c=>{const n=c.an[0];
     const line=(c.tx||"").split("\n").find(l=>l.trim().toUpperCase().startsWith(n.toUpperCase()));
     return (line||c.tx||"").replace(new RegExp("^"+n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"),"").trim()},
   moreLabel:"Show the full ability"},
 /* No reveal on this one. The rules text gives the card away outright, which
    made the game trivial — so there is nothing to reveal and it pays more. */
 flavour:{t:"Guess the flavour text",icon:"📜",
   lede:"The little italic line from the bottom of a card, and five cards it might belong to. No hints on this one.",
   pool:()=>CARDS.filter(c=>(c.fl||"").length>12),
   clue:c=>c.fl,
   noMore:true, worth:5},
};
/* The reveal game hands over one fact at a time. Ordered the way Ben asked:
   cost, strength, willpower, artist, named ability, lore — vaguest first, so
   the early points are genuinely hard to win. */
const REVEALS=[
 {l:"Cost",        v:c=>`${c.c} ink`},
 {l:"Strength",    v:c=>c.st!=null?`${c.st} strength`:"no strength (not a character)"},
 {l:"Willpower",   v:c=>c.wi!=null?`${c.wi} willpower`:"no willpower"},
 {l:"Illustrator", v:c=>(c.ar||[]).join(" · ")||"unknown"},
 {l:"Ability name",v:c=>(c.an||[])[0]||"no named ability"},
 {l:"Lore",        v:c=>c.lo!=null?`${c.lo} lore`:"no lore value"},
];
let QZ=null,QMODE="ability";
const QSTREAK={};   // per-game run, for the leaderboard shelf
function quizOptions(answer,n){
  const pool=QUIZZES[QMODE]?QUIZZES[QMODE].pool():CARDS.filter(c=>(c.an||[]).length);
  const ink=(answer.co||[])[0];
  const near=pool.filter(c=>c.f!==answer.f&&c.n!==answer.n&&(c.co||[]).includes(ink));
  const bag=(near.length>=n-1?near:pool.filter(c=>c.n!==answer.n)).slice();
  const wrong=[];
  while(wrong.length<n-1&&bag.length){
    const pick=bag.splice(Math.floor(Math.random()*bag.length),1)[0];
    if(!wrong.some(w=>w.n===pick.n))wrong.push(pick);
  }
  return [answer,...wrong].sort(()=>Math.random()-0.5);
}
function newQuiz(){
  if(QMODE==="reveal"){
    const pool=CARDS.filter(c=>c.img);
    const answer=pool[Math.floor(Math.random()*pool.length)];
    QZ={answer,options:quizOptions(answer,5),step:0,done:null};
  }else{
    const q=QUIZZES[QMODE],pool=q.pool();
    const answer=pool[Math.floor(Math.random()*pool.length)];
    QZ={answer,options:quizOptions(answer,5),step:0,done:null};
  }
}
/* The reveal game asks for real deduction, so it pays roughly double the others
   at every rung: 12 down to 2 rather than 6 down to 1. */
const quizWorth=()=>{
  if(QMODE==="reveal")return Math.max(2,(REVEALS.length-QZ.step)*2);
  const q=QUIZZES[QMODE]||{};
  if(q.noMore)return q.worth||5;          // nothing to reveal, so nothing to lose
  return Math.max(1,2-QZ.step);
};
function renderQuiz(){
  if(!QZ)newQuiz();
  const isRev=QMODE==="reveal",meta=isRev
    ? {t:"Guess from the facts",icon:"🃏",lede:"Facts one at a time — cost first, lore last. Every extra fact is worth one less."}
    : QUIZZES[QMODE];
  const c=QZ.answer,worth=quizWorth();
  const clue=isRev
    ? `<ol class="revs">${REVEALS.slice(0,QZ.step+1).map(r=>
        `<li><span>${esc(r.l)}</span><b>${esc(String(r.v(c)))}</b></li>`).join("")}</ol>`
    : `<div class="clue">${esc(meta.clue(c))}</div>
       ${QZ.step>0&&meta.more?`<div class="clue more">${esc(meta.more(c))}</div>`:""}`;
  const canMore=isRev?QZ.step<REVEALS.length-1:(!meta.noMore&&QZ.step<1);
  $("quizpage").innerHTML=`<div class="page">
    <button class="btn" id="qExit" style="margin-bottom:12px">← Other</button>
    <h1>${meta.icon} ${esc(meta.t)}</h1>
    <p class="lede">${esc(meta.lede)}</p>
    ${QZ.done?`<div class="qreveal" id="qReveal">
      ${cImgL(c)?`<img src="${esc(cImgL(c))}" alt="${esc(c.f)}">`:""}
      <div class="qrn"><b>${esc(c.n)}</b>${c.v?`<span>${esc(c.v)}</span>`:""}</div>
      <button class="btn go" id="qNext2">Next →</button>
    </div>`:""}
    <div class="qwrap">
      <div>${clue}
        <div class="gzoom">
          ${meta.noMore?"":`<button class="btn${isRev?"":" outline"}" id="qMore"${canMore&&!QZ.done?"":" disabled"}>
            ${isRev?"➕ One more fact":"👁 "+esc(meta.moreLabel)}${canMore?` (worth ${worth-1})`:""}</button>`}
          <span class="gw">Worth <b>${QZ.done?0:worth}</b></span>
        </div>
      </div>
      <div class="gside">
        <div class="gopts">${QZ.options.map(o=>{
          const cls=!QZ.done?"":o.f===c.f?" right":(QZ.done===o.f?" wrong":" dim");
          return `<button class="gopt${cls}" data-q="${esc(o.f)}"${QZ.done?" disabled":""}>
            <b>${esc(o.n)}</b>${o.v?`<i>${esc(o.v)}</i>`:""}</button>`}).join("")}</div>
        ${QZ.done?`<div class="gres ${QZ.done===c.f?"win":"lose"}">
          ${QZ.done===c.f?`✓ Correct — +${N(QZ.won)} dust`:"✗ Not that one"}
          <div class="gful">${QZ.done!==c.f&&c.img?`<img src="${esc(c.img)}" alt="">`:""}
            <div><b>${esc(c.n)}</b>${c.v?`<span>${esc(c.v)}</span>`:""}
            <span>${esc(c.sn)} #${esc(String(c.num))}</span></div></div>
          <button class="btn go" id="qNext" style="width:100%;margin-top:10px">Next →</button>
        </div>`:""}
      </div></div>
    ${leaderboard(isRev?"reveal":QMODE)}</div>`;
  const $$=(id,fn)=>{const e=$(id);if(e)e.onclick=fn};
  $$("qExit",()=>{OPAGE="";save("fs3_opage",OPAGE);QZ=null;showTab("tOther")});
  $$("qMore",()=>{QZ.step++;renderQuiz()});
  $$("qNext",()=>{QZ=null;renderQuiz()});
  $$("qNext2",()=>{QZ=null;renderQuiz()});
  $("quizpage").querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{
    if(QZ.done)return;
    const win=b.dataset.q===QZ.answer.f;
    QZ.done=b.dataset.q;QZ.won=win?worth:0;
    if(win){dustGain(QZ.won);
      DUST.quiz=[...new Set([...(DUST.quiz||[]),QMODE])];
      QSTREAK[QMODE]=(QSTREAK[QMODE]||0)+1;
      lbPost(QMODE==="reveal"?"reveal":QMODE,QSTREAK[QMODE]);
      save(DUSTKEY,DUST);award("quiz");
      if(DUST.quiz.length>=3)unlockHidden("h_tri");
      toast(`+${N(QZ.won)} dust`)}
    else QSTREAK[QMODE]=0;
    renderQuiz();
  });
}

