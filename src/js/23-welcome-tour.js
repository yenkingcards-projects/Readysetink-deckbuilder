/* ===================== welcome tour =====================
   Shown once, on a first visit or after Reset setup in Settings. Five cards
   about what this site has that the other Lorcana tools don't, then an
   optional setup wizard.

   Every card has Skip. Skip means skip the WHOLE tour, not this card — a
   person who wants out wants out, and making them press it five times is the
   opposite of respecting that. Next is the glowing one.

   The flag is local-only and not in SYNCED: "have I seen the tour" is about
   this browser, not about the account, and syncing it would mean a new phone
   silently skipped the introduction. */
const K_TOUR="fs3_tour";
let TOURI=0,TOURWIZ=false;
const TOUR=[
 {t:"Welcome to Ready Set Ink",
  lines:["Your card-table companion for Disney Lorcana.",
    "Settle a ruling on the spot, with the exact official rule in view — no more arguing at the table.",
    "Everything here is free, and always will be."],
  dis:"Unofficial fan content. Not published, endorsed or approved by Disney or Ravensburger. © Disney. Disney Lorcana is operated by Ravensburger, an official licensee of Disney. We may earn an affiliate commission from purchases made through links on this website."},
 {t:"Answer any card question in one search",
  lines:["Stop rereading the whole set to check an interaction.",
    "Cards that ping damage, cards that punish the whole table, cards that want to be discarded — ask for it, and it's on screen.",
    "Open <b>✨ Special searches</b> above the grid and try one."]},
 {t:"Find the art tags you want",
  lines:["Not just the rules text — the artwork itself.",
    "Try typing this and pressing Enter:",
    "<span class='ttry'>blue dog</span>",
    "Plain English works too — <span class='ttry'>steel action</span> or <span class='ttry'>sapphire item floodborn</span> will each find what you'd expect."]},
 {t:"Walk your binder once, not four times",
  lines:["Tell us how you keep your cards and every deck you save comes with a pull sheet in that exact order.",
    "Missing something? It turns into a message you can send a friend to borrow it."]},
 {t:"Get sharper at spotting cards",
  lines:["Guess a card from a sliver of its art, a named ability, or its stats one fact at a time.",
    "There's a fish, too. He's worth leaving on."]}
];
/* The setup wizard. Each step owns a value and how to write it, so adding one
   is adding an entry rather than editing a flow. */
const TOURSET=[
 {k:"pull",t:"How do you keep your cards?",
  why:"This sets the order your pull sheets come out in. Anything is fine — you can change it later.",
  opts:()=>PULLSORTS.map(([v,l])=>[v,l,""]),
  get:()=>PULLSORT,
  set:v=>{PULLSORT=v;save("fs3_pullsort",v)}},
 {k:"coll",t:"Do you want to track your collection?",
  why:"Adds owned and foil counts to every card, a collection tab, and the 'cards I don't have' list on your decks.",
  opts:()=>[[1,"Yes, track what I own",""],[0,"No thanks","Hides the collection tab and the owned counters."]],
  get:()=>COLLON?1:0,
  set:v=>{COLLON=!!v;save(K_COLLON,COLLON)}},
 {k:"games",t:"Mini games?",
  why:"The guessing games, the fish, and the dust you earn from them.",
  opts:()=>[[1,"Yes, leave them on",""],[0,"No, keep it serious","Takes them out of the Other menu."]],
  get:()=>GAMESON?1:0,
  set:v=>{GAMESON=!!v;save("fs3_gameson",GAMESON)}},
 {k:"price",t:"Show what cards are worth?",
  why:"A rough market price under each card, from a snapshot. Off by default.",
  opts:()=>[[0,"No, just the cards",""],[1,"Yes, show prices",""]],
  get:()=>PRICES?1:0,
  set:v=>setPrices(!!v&&!!priceDate())}
];
function tourSparkle(host){
  if(!host)return;
  const r=host.getBoundingClientRect();
  for(let i=0;i<5;i++){
    const s=document.createElement("span");
    s.className="tspark";s.textContent=["✦","✧","·","✦","✧"][i];
    s.style.left=(r.width*(.2+i*.15))+"px";
    s.style.top=(r.height-70)+"px";
    s.style.animationDelay=(i*60)+"ms";
    host.appendChild(s);
    setTimeout(()=>s.remove(),1400)}}
function startTour(force){
  if(!force&&load(K_TOUR,false))return;
  TOURI=0;TOURWIZ=false;
  $("tourbg").hidden=false;
  paintTour();
}
function endTour(){
  save(K_TOUR,true);
  $("tourbg").hidden=true;
  $("tour").innerHTML="";
  render();paintDeckBar();
}
function paintTour(){
  const host=$("tour");
  if(!TOURWIZ){
    /* Past the last card is the one question that decides whether the wizard
       runs at all. */
    if(TOURI>=TOUR.length){
      host.innerHTML=`
        <div class="tstep tl">Last one</div>
        <h2 class="tl">Want to set it up your way?</h2>
        <p class="tl">A few quick questions and only the parts you want are switched on.
          It takes about thirty seconds.</p>
        <p class="tlater tl">Every answer can be changed later in Settings, and you can
          stop half way.</p>
        <div class="tnav tl">
          <button class="btn" data-tour="end">No, I'm good</button>
          <span class="sp"></span>
          <button class="btn go tnext" data-tour="wiz">Set it up →</button>
        </div>`;
    }else{
      const s=TOUR[TOURI],last=TOURI===TOUR.length-1;
      host.innerHTML=`
        <div class="tstep tl">${TOURI+1} of ${TOUR.length}</div>
        <h2 class="tl">${esc(s.t)}</h2>
        ${s.lines.map(l=>`<p class="tl">${l}</p>`).join("")}
        ${s.dis?`<div class="tdis tl">${esc(s.dis)}</div>`:""}
        <div class="tnav">
          <button class="btn" data-tour="end">Skip</button>
          <span class="sp"></span>
          <span class="tdots">${TOUR.map((_,i)=>`<i class="${i===TOURI?"on":""}"></i>`).join("")}</span>
          <button class="btn go tnext" data-tour="next">${last?"Almost done →":"Next →"}</button>
        </div>`;
    }
  }else{
    const st=TOURSET[TOURI];
    if(!st){
      host.innerHTML=`
        <div class="tstep tl">Done</div>
        <h2 class="tl">You're set up.</h2>
        <p class="tl">Everything you just chose lives in <b>Other → Settings</b>, along with
          the switches for anything you skipped.</p>
        <div class="tnav tl"><span class="sp"></span>
          <button class="btn go tnext" data-tour="end">Start building →</button></div>`;
      tourSparkle(host);
    }else{
      const cur=st.get();
      host.innerHTML=`
        <div class="tstep tl">Setting up · ${TOURI+1} of ${TOURSET.length}</div>
        <h2 class="tl">${esc(st.t)}</h2>
        <p class="tl">${esc(st.why)}</p>
        <div class="topts tl">${st.opts().map(([v,l,sub])=>
          `<button class="topt${String(v)===String(cur)?" on":""}" data-topt="${esc(String(v))}">
            ${esc(l)}${sub?`<i>${esc(sub)}</i>`:""}</button>`).join("")}</div>
        <p class="tlater tl">Don't worry about getting it right — you can change any of this
          later on the Settings page.</p>
        <div class="tnav tl">
          <button class="btn" data-tour="skipone">Skip this</button>
          <button class="btn" data-tour="end">Skip the rest</button>
          <span class="sp"></span>
          <button class="btn go" data-tour="next">Keep this →</button>
        </div>`;
    }
  }
  /* Answering IS pressing Next. Picking an option used to only tick it and
     leave you looking for the button — an extra click for no decision. The
     class flips instantly so you see what you chose, then it moves on. */
  host.querySelectorAll("[data-topt]").forEach(b=>b.onclick=()=>{
    const st=TOURSET[TOURI];if(!st)return;
    const raw=b.dataset.topt;
    st.set(/^\d+$/.test(raw)?+raw:raw);
    host.querySelectorAll("[data-topt]").forEach(x=>x.classList.remove("on"));
    b.classList.add("on");
    tourSparkle(host);
    setTimeout(()=>{TOURI++;paintTour()},210)});
  host.querySelectorAll("[data-tour]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.tour;
    if(a==="end"){endTour();return}
    if(a==="wiz"){TOURWIZ=true;TOURI=0;paintTour();return}
    if(a==="skipone"||a==="next"){
      TOURI++;
      if(TOURWIZ&&TOURI>TOURSET.length){endTour();return}
      paintTour();
      if(a==="next")tourSparkle(host);
    }});
}

