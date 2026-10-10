/* ===================== dust =====================
   An on-site currency, deliberately easy to earn and deliberately cheap to
   spend. It lives in localStorage, which means anyone with devtools can hand
   themselves a million — and that is FINE, because of what it unlocks: easter
   egg reveals and small fun. Nobody cheats to spoil a joke for themselves.

   The rule that follows, and it matters later: never gate anything behind dust
   that costs money or that you'd be sorry to give away. The moment "patrons
   get everything" is real, that check has to live on a server instead.

   Ben's brief: one saved deck should pay for every regular unlock. First named
   deck pays 25; the four reveals cost 5 each. */
const DUSTKEY="fs3_dust";
/* 500,000 hits harder than 500000. Every dust number goes through this. */
const N=n=>Number(n||0).toLocaleString("en-US");
let SALTED=false,RATSEARCH=false;
let DUST=load(DUSTKEY,{bal:0,got:{},open:[],titles:[],hidden:[],wear:'',quiz:[],
  prestige:false,patron:false,given:0,bucky:0});
const ACHIEVEMENTS=[
 {id:"firstcard", d:25, t:"Getting started",   w:"Add your first card to a deck"},
 {id:"named",     d:25, t:"Name it yourself",  w:"Save a deck under your own name"},
 {id:"deck2",     d:10, t:"Brewer",            w:"Keep a second deck on the go"},
 {id:"patient",   d:10, t:"Patient",           w:"Hover a card long enough for the ⓘ to glow"},
 {id:"sharp",     d:5,  t:"Sharp eye",         w:"Get one right in Guess the card"},
 {id:"eagle",     d:15, t:"Eagle eye",         w:"Guess right without zooming out once"},
 {id:"streak5",   d:15, t:"On a roll",         w:"Five correct guesses in a row"},
 {id:"coconut",   d:15, t:"Coconut convert",   w:"Finish the Guided Coconut Build"},
 {id:"curator",   d:10, t:"Curator",           w:"Tag ten cards as staples"},
 {id:"quiz",      d:10, t:"Quizmaster",        w:"Win a round of any guessing game"},
 /* Earned in My Lorcana Journal (/match-history/) — ids must match AWARDS in tournament/model.js */
 {id:"journal1",  d:25, t:"Into the arena",    w:"Log your first event in My Lorcana Journal"},
 {id:"firstwin",  d:15, t:"On the board",      w:"Log your first match win"},
 {id:"regular",   d:30, t:"Regular",           w:"Log five events"},
 {id:"topcut",    d:50, t:"Made the cut",      w:"Log a Top Cut finish"},
 {id:"bingo",     d:100,t:"Seen it all",       w:"Beat every ink combination at least once"},
];
/* Titles. Cosmetic only — nothing behind them, which is exactly why they can
   live in localStorage. The last one is deliberately unreachable: a million
   dust at the rates above is somewhere past ten thousand hours, so it exists
   to be seen and not had.

   Its NAME and description are withheld until it is bought — `secret:true`.
   The row used to be CSS-blurred, which hides it from a reader but leaves the
   real text sitting in the HTML for anyone who opens devtools, copies the
   page, or listens to it with a screen reader. Withheld now means withheld:
   secretTitle() swaps the strings before they are ever rendered. */
/* Titles are Ready Set Ink's own, not the game's. Nothing here borrows a term
   that belongs to Ravensburger — no Illumineers, no Illuminary. Archivist,
   Lorekeeper and Flounderborn stay because Ben likes them and they're ours. */
const TITLES=[
 {id:"t_pupil",  c:10,      t:"First Ink",       d:"You showed up. Everyone starts here."},
 {id:"t_brewer", c:25,      t:"Brewer",          d:"Two lists and counting."},
 {id:"t_binder", c:50,      t:"Binder Runner",   d:"You pull your own cards."},
 {id:"t_squint", c:75,      t:"Pixel Peeper",    d:"You called it from one corner of the art."},
 {id:"t_lore",   c:120,     t:"Lorekeeper",      d:"You read every card. All of them."},
 {id:"t_coco",   c:200,     t:"Coconut Main",    d:"You picked a lane and you never left it."},
 {id:"t_judge",  c:350,     t:"Rules Lawyer",    d:"You have opinions about timing windows."},
 {id:"t_arch",   c:600,     t:"Archivist",       d:"Every printing, every variant, catalogued."},
 {id:"t_legend", c:1000,    t:"Ladder Legend",   d:"People ask you what to build."},
 {id:"t_fish",   c:1000000, t:"Flounderborn",    d:"The best cards are the friends you make along the way.",
  blur:true, secret:true},
];
/* What a title is allowed to say about itself right now. A secret title keeps
   its name and description to itself until it has been bought; everything else
   reads straight through. One function, used by every place that prints a
   title, so a new surface can't quietly leak the name. */
const titleOwned=id=>(DUST.titles||[]).includes(id);
function titleFace(x){
  if(x.secret&&!titleOwned(x.id))
    return {t:"???",d:"Something is down here. It costs more than you have."};
  return {t:x.t,d:x.d};
}
/* Prestige is invisible until the secret title is owned. Before that there is
   no ✦ counter, no "Prestige 2 · 25,000" button, and no gate text naming what
   you'd have to do first — the whole mechanic simply isn't mentioned. */
const prestigeShown=()=>titleOwned("t_fish");
/* And prestige on ANY OTHER title stays off the page until Flounderborn is
   actually at 10. It used to render the gate text -- "Take Flounderborn to
   prestige 10 first" -- on every title you owned, which announced both that
   other titles prestige at all and exactly what the milestone is. The whole
   point of the ladder is that nobody is told it is there. */
const prShown=id=>id==="t_fish"?prestigeShown():prLevel("t_fish")>=10;
/* Hidden titles. Not for sale — you get these by DOING the thing, which is why
   they're more fun than another row of blurred boxes. Until earned they show as
   ??? with a cryptic hint, so you know one exists without knowing what it is. */
const HIDDEN=[
 {id:"h_chip",  t:"Teacup Denier",     h:"Try to do the one thing the site won't let you.",
  d:"You met the wall. Chip stays out."},
 {id:"h_rat",   t:"Rat Catcher",       h:"Look closely at a certain toymaker.",
  d:"You found the rat. He will still break your heart."},
 {id:"h_grave", t:"Gravedigger",       h:"Pay your respects to a squirrel.",
  d:"🪦"},
 {id:"h_fish",  t:"Friend of Flounder",h:"Open the card this whole site is named after.",
  d:"The best cards are the friends you make along the way."},
 {id:"h_all",   t:"Nothing Left Hidden",h:"Reveal every secret on this page.",
  d:"You bought all four. There is nothing else down here. Probably."},
 {id:"h_ten",   t:"Ten in a Row",      h:"Guess ten cards correctly without a miss.",
  d:"Ten straight. Nobody saw you do it, but we know."},
 {id:"h_tri",   t:"Triple Threat",     h:"Win at all three guessing games.",
  d:"Ability, flavour and facts. You've beaten every quiz on the site."},
 {id:"h_ench",  t:"Enchanted",         h:"Look at a card's fancier printing.",
  d:"You went looking for the good art."},
 {id:"h_binder",t:"Meme Team",         h:"Turn a deck into something you can carry.",
  d:"You made a pull list. Go and find the cards."},
 /* Truly invisible: filtered out of the list entirely until earned, unlike the
    ??? rows above. Nobody should be able to see that this one exists. */
 {id:"h_aqua",  t:"Aquarist",         h:"Feed a certain fish rather a lot.",
  d:"Twenty-five snacks. He remembers who feeds him."},
 /* retired: Click on fish was removed — kept so anyone who earned it keeps the title */
 {id:"h_click", t:"Affectionate", secret:true,     h:"Show one card an unreasonable amount of love.",
  d:"Five hundred clicks. That's not a hobby, that's a relationship."},
 {id:"h_rat2",  t:"What Did You Call Me?", h:"Search for a rat. Then look one in the eye.",
  d:"He is a GREAT man. And you searched “rat”."},
 {id:"h_franchise",t:"One Story Only",  h:"Put ten cards from a single franchise in one deck.",
  d:"Ten from one story. That's not a deck, that's a tribute."},
 {id:"h_single", t:"Singleton",        h:"Save a deck with no card repeated.",
  d:"Sixty different cards, one copy each. Consistency is for cowards."},
 {id:"h_61",     t:"One Too Many",     h:"Save a deck with exactly sixty-one cards.",
  d:"Sixty-one. You had one job."},
 {id:"h_rabbit", t:"Rabbit Season",    h:"Add a Rabbit to a deck at the right time of year.",
  d:"March or April. You found the rabbit in rabbit season."},
 /* retired: Outpost was removed — kept so anyone who earned it keeps the title */
 {id:"h_hex",    t:"Cartographer", secret:true,     h:"Raise twelve buildings in Outpost.",
  dust:25000},
 {id:"h_100",    t:"One Hundred Friends", secret:true, dust:10000000,
  h:"", d:"One hundred Flounder. The best cards really are the friends you make along the way."},
 /* Ben's own tap, and the most hidden thing here: no hint string, filtered
    out of the list until earned, and nothing anywhere else mentions it. */
 {id:"h_500",   t:"Five Hundred Friends", secret:true, dust:100000000,
  h:"", d:"Five hundred Flounder and one Hidden Trap. Nobody was ever going to find this."},
 {id:"h_60",    t:"The Perfect 60",   h:"",  secret:true, dust:500000,
  d:"Sixty copies of Flounder - Voice of Reason. Not legal. Not sensible. Perfect."},
 {id:"h_wave",  t:"Tide Turner",       h:"Hold the tank against fifteen waves of them.",
  d:"Fifteen waves. The blades held.", dust:50000},
 {id:"h_wide",  t:"Wide Net",          h:"Search with everything switched on at once.",
  d:"Art tags and franchises together. Nothing hides from you."},
];
function unlockHidden(id){
  if((DUST.hidden||[]).includes(id))return false;
  const h=HIDDEN.find(x=>x.id===id);if(!h)return false;
  DUST.hidden=(DUST.hidden||[]).concat(id);
  if(h.dust)dustGain(h.dust);
  if(!DUST.wear)DUST.wear=id;
  save(DUSTKEY,DUST);
  toast(`🎖 Hidden title — ${h.t}`+(h.dust?` · +${N(h.dust)} dust`:""));drawTitle();
  if($("vDust").classList.contains("on"))renderDust();
  return true;
}
/* Every secret costs the same now — 25. Different prices made people buy the
   cheap ones and never look at the rest. */
const SECRET_COST=25;
const SECRETS=[
 {id:"chip",  c:5, t:"Why won't one particular teacup go in my deck?",
  r:"Chip the Teacup — Gentle Soul can't be added to any deck, in any format, by any route. "+
    "Tile, modal, package, text import, shared link — all of them refuse. Someone once said he was "+
    "better than Flounder, and that is simply just not true."},
 {id:"bucky", c:5, t:"There's something on one squirrel's tag.",
  r:"Bucky — Squirrel Squeak Tutor carries a 🪦 gravestone on his tag. No further comment."},
 {id:"rat",   c:5, t:"One toymaker is not to be trusted.",
  r:"Hiram Flaversham — Toymaker is tagged 🐀 do not trust this rat, he will break your heart 💔."},
 {id:"fish",  c:5, t:"One card is treated better than all the others.",
  r:"Every Flounder card gets an animated rainbow ring, and after a second of hovering a beam of "+
    "light opens out of the top of it. He is the site's namesake and he gets the hero treatment."},
];
/* ===================== the dust switch =====================
   Every route that earns dust goes through here. It used to be eight separate
   "DUST.bal+=" lines scattered across the games, the aquarium and the quiz —
   a switch that has to be remembered in eight places is a switch that will be
   forgotten in one of them.

   Off means: no more dust is earned, the balance is left exactly as it was
   (turning it back on doesn't cost anyone what they had), the Dust tile leaves
   the Other menu, and the worn title becomes Stick in the Mud. */
let DUSTON=load("fs3_duston",true);
let DARK=load("fs3_dark",false);
/* Dark mode is a patron perk. The check is CLIENT-SIDE, which means it is an
   honour-system lock and not a paywall — exactly like the dust note by DUSTKEY.
   Before anyone is charged for this, isPatron() has to ask the server, because
   right now a determined visitor can set one localStorage value and have it.
   That is fine while nothing has been paid; it stops being fine the moment it
   has been. */
const isPatron=()=>!!(DUST&&DUST.patron)||PATRON_ON===true;
/* Dark mode is free for everybody until the end of 25 December 2026, then it
   goes back to being a patron perk. Two reasons to do it this way round rather
   than just ungating it: nobody switches on a theme they've never seen, so the
   window is the advert; and the perk machinery stays wired the whole time, so
   the date passing is the only thing that has to happen — not a rebuild.

   The boundary is the END of the 25th in the visitor's own timezone (26 Dec
   00:00 local). A UTC cutoff would take the theme away mid-Christmas-Day for
   anyone west of Greenwich. Move or delete DARK_FREE_UNTIL to change it; if
   it's null the perk gate applies immediately. */
const DARK_FREE_UNTIL=new Date(2026,11,26,0,0,0).getTime();
const darkFree=()=>DARK_FREE_UNTIL!=null&&Date.now()<DARK_FREE_UNTIL;
/* The one question the rest of the file asks: may this visitor have it? */
const darkOK=()=>isPatron()||darkFree();
let GAMESON=load("fs3_gameson",true);
const STICK={id:"t_stick",t:"Stick in the Mud",d:"You turned dust off. Respect."};
function dustGain(n){
  if(!DUSTON||!n)return 0;
  DUST.bal+=n;save(DUSTKEY,DUST);return n}

function award(id){
  const a=ACHIEVEMENTS.find(x=>x.id===id);
  if(!a||DUST.got[id])return false;                   // one payout per achievement, ever
  if(!DUSTON)return false;                            // nothing is earned while it's off
  DUST.got[id]=Date.now();dustGain(a.d);
  toast(`🏆 ${a.t} · +${N(a.d)} dust`);
  if($("vGuess").classList.contains("on")||$("vOther").classList.contains("on"))renderOther&&0;
  return true;
}
const dustSpend=n=>{if(DUST.bal<n)return false;DUST.bal-=n;save(DUSTKEY,DUST);return true};
/* Patron grant. Client-side, so it is an honour-system button, NOT a paywall —
   see the note by DUSTKEY. It hands over a big pile so patrons never think about
   dust again, which is the point: the reward is not having to grind. */
const PATRON_DUST=250000;
function grantPatron(){
  if(!PATRON_ON||DUST.patron)return false;
  DUST.patron=true;dustGain(PATRON_DUST);DUST.patron=true;save(DUSTKEY,DUST);
  toast(`💛 Patron dust — +${N(PATRON_DUST)}`);drawTitle();return true;
}
/* Prestige. Buy Flounderborn a SECOND time and it turns radiant. Invisible
   until you already own it once, so nobody knows it's there. */
/* ===== prestige =========================================================
   DUST.pr is {titleId: level}. Flounderborn goes to 15, everything else to 10,
   and the two ladders are deliberately entangled:

     P3   frames start appearing
     P10  unlocks prestige on every other title you own
     P11  requires you to have taken some other title all the way to 10
     P15  requires every secret revealed

   Legacy saves stored a single boolean in DUST.prestige; that migrates to
   level 1 so nobody loses what they bought. */
const PR_MAX={t_fish:15}, PR_MAX_OTHER=10;
const prMax=id=>PR_MAX[id]||PR_MAX_OTHER;
function prLevel(id){
  if(!DUST.pr){
    DUST.pr={};
    if(DUST.prestige===true)DUST.pr.t_fish=1;      // migrate the old boolean
    save(DUSTKEY,DUST);
  }
  return DUST.pr[id]||0;
}
/* Flounderborn tier N costs N million — each a million more than the last.
   Other titles cost their own price scaled, so cheap titles stay a detour
   rather than a second grind. */
function prCost(id,next){
  if(id==="t_fish")return next*1000000;
  const base=(TITLES.find(t=>t.id===id)||{c:100}).c;
  return Math.round(base*250*next);
}
function prGate(id,next){
  if(id!=="t_fish"){
    if(prLevel("t_fish")<10)
      return "Take Flounderborn to prestige 10 first";
    return null;
  }
  if(next===11){
    const other=TITLES.some(t=>t.id!=="t_fish"&&prLevel(t.id)>=10);
    if(!other)return "Take another title to prestige 10 first";
  }
  if(next===15&&DUST.open.length<SECRETS.length)
    return "Reveal every secret first";
  return null;
}
function canPrestige(id){
  if(!(DUST.titles||[]).includes(id))return false;
  return prLevel(id)<prMax(id);
}
function doPrestige(id){
  const lv=prLevel(id),next=lv+1;
  if(!canPrestige(id))return false;
  const gate=prGate(id,next);
  if(gate){toast(gate);return false}
  if(!dustSpend(prCost(id,next))){toast("Not enough dust yet");return false}
  DUST.pr[id]=next;DUST.wear=id;save(DUSTKEY,DUST);
  toast(`✦ ${titleFace(TITLES.find(t=>t.id===id)||{t:""}).t} — prestige ${next}`);
  drawTitle();return true;
}
/* The flair class carries the level so one CSS block can escalate. */
const prClass=id=>{const l=prLevel(id);return l?` pr p${Math.min(l,15)}`:""};

/* The equipped title, rendered as a chip with its prestige flair intact.
   Used on the masthead, on every deck card, and on a shared deck. */
function titleChip(){
  const t=TITLES.find(x=>x.id===DUST.wear)||HIDDEN.find(x=>x.id===DUST.wear);
  if(!t)return "";
  const lv=prLevel(t.id);
  /* Through titleFace even here. You can only wear a title you own, so this
     always reads through — but routing every printer through one function is
     what stops the next surface from being the one that leaks. */
  return `<span class="dtitle${prClass(t.id)}"><span class="tt">${esc(titleFace(t).t)}</span>${
    lv?`<span class="prb">\u2726${lv}</span>`:""}</span>`;
}
function drawTitle(){
  const e=$("worn");if(!e)return;
  /* Dust switched off wears Stick in the Mud instead — the earned title is not
     lost, it just isn't what you're showing while you're opted out. */
  if(typeof DUSTON!=="undefined"&&!DUSTON){
    e.textContent=STICK.t;e.style.display="";e.className="wtit";return}
  const t=TITLES.find(x=>x.id===DUST.wear)||HIDDEN.find(x=>x.id===DUST.wear);
  e.textContent=t?titleFace(t).t:"";e.style.display=t?"":"none";
  e.className="wtit"+(t?prClass(t.id):"");
}
function renderDust(){
  const earned=ACHIEVEMENTS.filter(a=>DUST.got[a.id]).length;
  const pot=ACHIEVEMENTS.reduce((n,a)=>n+a.d,0);
  $("dustpage").innerHTML=`<div class="page">
    <button class="btn" id="dExit" style="margin-bottom:12px">← Other</button>
    <h1><span class="gi">✨</span>Dust &amp; secrets</h1>
    <p class="lede">Dust is easy to come by and cheap to spend. Saving one deck under your own
      name pays for every secret on this page, with change.</p>
    <div class="dbal"><b>${N(DUST.bal)}</b><span>dust</span>
      <i>${earned} of ${ACHIEVEMENTS.length} achievements · ${N(pot)} dust in total available</i></div>

    ${!PATRON_ON?""
      :DUST.patron?`<div class="patron on"><b>💛 Patron</b>
        <p>You've had your ${N(PATRON_DUST)} dust. Thank you — genuinely.</p></div>`
      :`<div class="patron"><b>💛 Supporting on Patreon?</b>
        <p>Claim ${N(PATRON_DUST)} dust. Enough that you never have to think about dust again,
          which is the actual perk.</p>
        <button class="btn go" id="dPatron">Claim patron dust</button></div>`}

    <h3 class="sec2">Titles</h3>
    <p class="hint" style="margin:-4px 0 10px">Cosmetic, and permanent once bought. Equip one and it
      shows next to the site name and on every deck you build.</p>
    <div class="tits">${TITLES.map(x=>{
      const own=titleOwned(x.id),worn=DUST.wear===x.id;
      const face=titleFace(x);
      /* Off the page entirely until it is genuinely available on THIS title —
         a locked control that explains how to unlock it is still a hint. */
      const showPr=own&&prShown(x.id);
      const lv=showPr?prLevel(x.id):0, next=lv+1, maxed=lv>=prMax(x.id);
      const gate=showPr&&!maxed?prGate(x.id,next):null;
      const cost=showPr&&!maxed?prCost(x.id,next):0;
      return `<div class="tit${own?" own":""}${x.blur&&!own?" blur":""}${worn?" worn":""}${
        own?prClass(x.id):""}">
        <div class="tt">${esc(face.t)}${lv?`<span class="prb">✦${lv}</span>`:""}</div>
        <div class="td">${esc(face.d)}</div>
        ${own?`<div class="titb">
            <button class="btn${worn?" go":""}" data-wear="${x.id}">${worn?"Unequip":"Equip"}</button>
            ${!showPr?""
             :maxed?`<span class="lockd">Prestige ${lv} · max</span>`
             :gate?`<span class="lockd" title="${esc(gate)}">${esc(gate)}</span>`
             :`<button class="btn${DUST.bal>=cost?" go":""}" data-pr="${x.id}"
                 ${DUST.bal<cost?" disabled":""}>Prestige ${next} · ${N(cost)}</button>`}
          </div>`
         :`<button class="btn${DUST.bal>=x.c?" go":""}" data-title="${x.id}"
                ${DUST.bal<x.c?" disabled":""}>${N(x.c)} dust</button>`}
      </div>`}).join("")}</div>

    <details class="hidwrap"${load("fs3_hidopen",false)?" open":""} id="hidBox">
      <summary>Hidden titles <span class="hn">${(DUST.hidden||[]).length} / ${
        HIDDEN.filter(x=>!x.secret||(DUST.hidden||[]).includes(x.id)).length}</span></summary>
      <p class="hint" style="margin:6px 0 10px">These can't be bought. Do the thing and they turn up.</p>
      <div class="tits">${HIDDEN.filter(x=>!x.secret||(DUST.hidden||[]).includes(x.id)).map(x=>{
        const own=(DUST.hidden||[]).includes(x.id),worn=DUST.wear===x.id;
        return `<div class="tit hid${own?" own":""}${worn?" worn":""}">
          <div class="tt">${own?esc(x.t):"???"}</div>
          <div class="td">${esc(own?x.d:x.h)}</div>
          ${own?`<button class="btn${worn?" go":""}" data-wear="${x.id}">${worn?"Unequip":"Equip"}</button>`
               :`<span class="lockd">Locked</span>`}
        </div>`}).join("")}</div>
    </details>

    <h3 class="sec2">Secrets</h3>
    <div class="secs">${SECRETS.map(x=>{
      const open=DUST.open.includes(x.id);
      return `<div class="sec3${open?" open":""}">
        <div class="q2">${esc(x.t)}</div>
        ${open?`<div class="a2">${esc(x.r)}</div>`
              :`<button class="btn${DUST.bal>=SECRET_COST?" go":""}" data-buy="${x.id}"
                 ${DUST.bal<SECRET_COST?" disabled":""}>Reveal · ${N(SECRET_COST)} dust</button>`}</div>`}).join("")}</div>

    <h3 class="sec2">Achievements</h3>
    <div class="achs">${ACHIEVEMENTS.map(a=>{
      const done=!!DUST.got[a.id];
      return `<div class="ach${done?" done":""}">
        <span class="am">${done?"✓":"○"}</span>
        <div><b>${esc(a.t)}</b><i>${esc(a.w)}</i></div>
        <span class="ad">+${N(a.d)}</span></div>`}).join("")}</div>
  </div>`;
  const pt=$("dPatron");if(pt)pt.onclick=()=>{grantPatron();renderDust()};
  $("dustpage").querySelectorAll("[data-pr]").forEach(b=>b.onclick=()=>{
    if(doPrestige(b.dataset.pr))renderDust()});
  const hb=$("hidBox");if(hb)hb.ontoggle=()=>save("fs3_hidopen",hb.open);
  const ex=$("dExit");if(ex)ex.onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
  $("dustpage").querySelectorAll("[data-title]").forEach(b=>b.onclick=()=>{
    const x=TITLES.find(y=>y.id===b.dataset.title);
    if(!dustSpend(x.c)){toast("Not enough dust yet");return}
    DUST.titles=(DUST.titles||[]).concat(x.id);DUST.wear=x.id;save(DUSTKEY,DUST);
    renderDust();drawTitle();toast(`Title unlocked — ${x.t}`)});
  $("dustpage").querySelectorAll("[data-wear]").forEach(b=>b.onclick=()=>{
    DUST.wear=DUST.wear===b.dataset.wear?"":b.dataset.wear;save(DUSTKEY,DUST);
    renderDust();drawTitle()});
  $("dustpage").querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>{
    const x=SECRETS.find(y=>y.id===b.dataset.buy);
    if(!dustSpend(SECRET_COST)){toast("Not enough dust yet");return}
    DUST.open.push(x.id);save(DUSTKEY,DUST);
    if(DUST.open.length>=SECRETS.length)unlockHidden("h_all");
    renderDust();toast("Revealed 🎉")});
}

