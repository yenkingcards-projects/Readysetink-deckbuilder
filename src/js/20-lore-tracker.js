/* ===================== lore tracker =====================
   A scorepad you can settle an argument with.

   Every other Lorcana life counter is a pair of big numbers. The reason to use
   this one is the 🤚 JUDGE button: the whole card database, the official set
   release notes and our own notes are already sitting in this page, so the
   thing you are arguing about is two taps away instead of on somebody's phone
   in another tab.

   Pressing JUDGE also LOCKS the score. That is not a gimmick — the moment a
   rules question comes up, the last thing anybody should be doing is nudging
   the totals. It unlocks when you come back. */
const LOREKEY="fs3_lore";
let LORE=null;

/* ---- what the keywords actually do ---------------------------------------
   Plain-English summaries, and ONLY for the keywords we are confident about.
   Where a summary would be a guess, there is no summary — the card's own
   reminder text is shown instead and the panel says so. Inventing a rule for a
   tracker somebody is holding during a tournament match would be the single
   worst thing this site could do. */
const KWRULES={
 "Bodyguard":["This character may enter play exerted.",
   "While it is in play, an opposing character that wants to challenge must choose a character with Bodyguard if one is able to be challenged."],
 "Challenger":["While this character is challenging, it gets +N ¤ for the turn.",
   "It only applies when this character is the one doing the challenging — not when it is the one being challenged."],
 "Evasive":["Only characters with Evasive can challenge this character.",
   "It does not stop songs, actions or abilities from choosing it — Evasive is about challenges only."],
 "Reckless":["This character can't quest, and must challenge if it is able to.",
   "If there is no legal challenge available, it simply doesn't challenge."],
 "Resist":["Damage dealt to this character is reduced by N.",
   "It reduces damage that is DEALT. Damage that is put on a character, or moved onto it, is not reduced by Resist."],
 "Rush":["This character can challenge the turn it is played.",
   "It still cannot quest that turn — Rush is about challenging only."],
 "Shift":["You may play this character for its Shift cost by putting it on top of one of your characters with the same name.",
   "The shifted character keeps any damage and any effects already on it, and it is not newly played, so it can act if the character underneath already could."],
 "Singer":["This character counts as having a cost of N for the purpose of singing songs.",
   "Its real cost is unchanged for everything else."],
 "Sing Together":["Any number of your ready characters with a total cost of N or more may exert together to sing this song for free."],
 "Support":["Whenever this character quests, you may add its ¤ to another chosen character's ¤ this turn."],
 "Ward":["Opponents can't choose this character except to challenge it."],
 "Vanish":["When an opponent chooses this character for an action, banish it."]
};
/* Every Shift variant is Shift with a restricted target, which is safe to say
   in general terms without pretending to know each one's exact wording. */
const SHIFTLIKE=/Shift$/;
const OFFICIAL_RULES_URL="https://files.disneylorcana.com/Comprehensive-Rules_2.2.0-EN.pdf";
const OFFICIAL_RESOURCES_URL="https://www.disneylorcana.com/en-US/resources";
const CR_VERSION="2.2.0";
const CR_EFFECTIVE="July 9, 2026";
const SET_NOTES_URLS={"Fabled":"https://www.disneylorcana.com/en-US/news/2025/08/2025-8-release-notes-fabled","Whispers in the Well":"https://www.disneylorcana.com/en-US/news/2025/10/2025-10_release-notes","Winterspell":"https://www.disneylorcana.com/en-US/news/2026/02/winterspell-release-notes","Wilds Unknown":"https://www.disneylorcana.com/en-US/news/2026/04/wilds-unknown-set-release-notes","Attack of the Vine!":"https://www.disneylorcana.com/en-US/news/2026/07/attack-of-the-vine-set-release-notes"};
function officialSourceUrl(source){const s=String(source||"");const key=Object.keys(SET_NOTES_URLS).find(k=>flat(s).indexOf(flat(k))>=0);return key?SET_NOTES_URLS[key]:OFFICIAL_RULES_URL}
function officialSource(label,url){return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`}

/* ---- the rules drawer -----------------------------------------------------
   Special searches, but for arguments. Written as short answers to the thing
   people actually stop the game over. Each one is a summary, and the panel
   says so under every single entry — the Comprehensive Rules are the
   authority, and a tracker should never pretend otherwise. */
const RULES=[
 {g:"Timing", id:"dry", t:"Can it act the turn I played it?",
  s:"Questing, challenging and ⟳ abilities on a fresh character",
  b:["No, by default. A character can't quest, can't challenge, and can't use an ability with the ⟳ (exert) symbol on the turn you play it.",
     "Rush is the exception, and only for challenging — a character with Rush still can't quest the turn it arrives.",
     "Shift is the other one: if you shifted onto a character that was already able to act, the shifted character can act, because it isn't newly played."],
  see:["Rush","Shift"],cr:[["1.7.5","Drying"],["5.1.1.11–12","Drying and dry"],["8.9.1","Rush"],["8.10.4.1","Shifted card drying state"]]},
 {g:"Timing", id:"trig", t:"When does my trigger happen?",
  s:"Triggered abilities, and what order they go in",
  b:["A triggered ability goes off as soon as its condition is met, and finishes resolving before anything else happens.",
     "If several things trigger at the same time, the player whose turn it is chooses the order of their own triggers first, then the other players do theirs.",
     "Effects on a single card resolve in the order they are written, top to bottom."],
  cr:[["6.2.3","Triggered abilities"],["7.7.3.1","Adding triggers to the bag"],["7.7.4","Resolving the bag"]]},
 {g:"Timing", id:"eot", t:"End of turn effects",
  s:"“until the end of your turn”, and when it wears off",
  b:["Anything that lasts “this turn” or “until the end of your turn” wears off during the end-of-turn step, before the next player begins.",
     "“At the end of your turn” abilities trigger in that same step.",
     "Damage does NOT wear off at end of turn. Damage stays on a character until something removes it or the character is banished."],
  cr:[["3.4.1.1–2","End-of-Turn process"],["6.1.13.4","This Turn duration"]]},
 {g:"Timing", id:"start", t:"Beginning of turn, in order",
  s:"Ready, set, draw",
  b:["Ready: turn all your exerted cards face up and untapped.",
     "Set: anything that triggers “at the start of your turn” happens now.",
     "Draw: draw a card. The player going first skips their draw on their very first turn."],
  cr:[["3.1.2","Ready, Set, Draw"],["3.2.1–3.2.3","Start-of-Turn steps"]]},
 {g:"Challenging", id:"chal", t:"Who can I challenge?",
  s:"The basic rule, and what stops it",
  b:["You exert one of your ready characters to challenge an EXERTED opposing character. You cannot challenge a ready one.",
     "Both characters deal damage equal to their ¤ to each other at the same time.",
     "Evasive means only your Evasive characters can challenge it. Bodyguard means you must challenge the Bodyguard if you can. Both can apply at once."],
  see:["Evasive","Bodyguard","Challenger","Rush","Reckless"],cr:[["4.6.3–4.6.6","Challenge process"],["8.3","Bodyguard"],["8.6","Evasive"]]},
 {g:"Challenging", id:"dmg", t:"Damage and banishing",
  s:"When does a character die",
  b:["A character is banished when damage on it is equal to or greater than its ⛉ willpower.",
     "Damage is checked continuously, so a character with lethal damage on it is banished immediately, not at end of turn.",
     "Resist reduces damage that is dealt to a character. It does not reduce damage that is put on it or moved onto it."],
  see:["Resist"],cr:[["1.8.1.4–5","Lethal damage game-state checks"],["1.9","Damage"],["8.8","Resist"]]},
 {g:"Challenging", id:"loc", t:"Challenging a location",
  s:"Locations, damage and willpower",
  b:["A character can challenge a location. Locations are never exerted, so there is no “must be exerted” requirement.",
     "The challenging character deals its ¤ to the location. The location deals no damage back.",
     "A location is banished when damage on it reaches its ⛉."],cr:[["4.6.3.3","Locations can be challenged"],["4.6.6","Challenge damage"],["5.6","Locations"]]},
 {g:"Ink & cost", id:"ink", t:"Inking a card",
  s:"One a turn, and which cards can go in",
  b:["You may put one card from your hand into your inkwell each turn, face down and ready.",
     "Only cards with the inkwell symbol around the cost — the shaded hexagon — can be inked.",
     "The normal ink action is limited to once per turn. Card effects can allow additional cards or put cards into the inkwell by a different process."],
  cr:[["4.2.1.1–3","Ink a card process"],["4.2.3","Once-per-turn limit"],["4.2.3.1–2","Additional ink and card effects"]]},
 {g:"Ink & cost", id:"shiftzone", t:"A Shift stack changes zones",
  s:"What happens to every card underneath",
  b:["A shifted character is one character in play, with the shifted card on top and its Shift base underneath.",
     "If the top card moves to another zone, every card under it moves to that same zone and the stack separates there.",
     "This means an effect that puts a shifted character into its player's inkwell puts every card in that Shift stack into the inkwell. Normal once-per-turn inking still only takes a card from hand."],
  see:["Shift"],cr:[["5.1.1.7","Cards under a top card moving zones"],["8.10","Shift"]]},
 {g:"Ink & cost", id:"song", t:"Singing a song",
  s:"Exerting a character instead of paying",
  b:["Instead of paying a song's ink cost, you may exert a ready character whose cost is equal to or greater than the song's cost.",
     "The character being exerted has to have been in play since the start of your turn — a character played this turn can't sing.",
     "Singer N means the character counts as cost N for singing. Sing Together lets several characters add their costs together."],
  see:["Singer","Sing Together"],cr:[["5.4.3","Singing songs"],["8.11","Singer"],["8.12","Sing Together"]]},
 {g:"Cards & hand", id:"choose", t:"“Chosen” and what can be targeted",
  s:"Ward, Evasive and choosing",
  b:["“Chosen” means the player resolving the effect picks the target when the effect resolves.",
     "Ward stops an opponent choosing that character for anything except a challenge.",
     "If there is no legal thing to choose, the effect simply does as much as it can."],
  see:["Ward","Vanish","Evasive"],cr:[["1.7.6","Illegal actions and choices"],["6.7","Resolving effects"],["8.15","Ward"]]},
 {g:"Cards & hand", id:"hand", t:"Hand size and running out of cards",
  s:"There is no maximum hand size",
  b:["There is no hand size limit in Lorcana. You never discard down at end of turn.",
     "If your turn ends with no cards in your deck, you lose during the final game state check. Having an empty deck earlier in the turn does not end the game until that check."],
  cr:[["7.3.3","No maximum hand size"],["1.8.1.2","Empty deck loss condition"],["3.4.2","Final game state check"]]},
 {g:"Winning", id:"win", t:"Winning the game",
  s:"20 lore",
  b:["A player with 20 or more lore wins at the next game state check, which happens immediately after the current action, effect, or defined step finishes.",
     "Lore is gained by questing with characters and by card effects. Some cards make opponents lose lore; lore can't go below 0."],
  cr:[["1.8.1.1","20-lore game state check"],["1.11.1–3","Lore totals and winning"]]},

 /* --- play corrections --------------------------------------------------
    Deliberately careful. What follows is what usually happens at a kitchen
    table, plus the one instruction that is always right in a tournament:
    stop and call the judge. The official Play Corrections Guide is the
    authority on penalties and this panel does not paraphrase it. */
 {g:"Something went wrong", id:"pcink", t:"I saw a card in my inkwell",
  s:"Looked at, or accidentally revealed, face-down ink",
  b:["Casually: shuffle it back into the face-down ink without showing anyone else, and carry on.",
     "In a tournament: stop and call a judge before touching anything else. Do not fix it yourself — the fix depends on how much was seen and by whom, and a judge decides that."],
  pc:true},
 {g:"Something went wrong", id:"pcreveal", t:"I revealed a card from my hand",
  s:"Flashed a card, dropped one face up",
  b:["Casually: put it back and keep playing. The information advantage is your opponent's, and that is usually the whole correction.",
     "In a tournament: call a judge. Repeatedly revealing cards can be treated differently from doing it once."],
  pc:true},
 {g:"Something went wrong", id:"pcdraw", t:"I drew an extra card",
  s:"Drew too many, or drew at the wrong time",
  b:["Casually: if it is caught immediately and everyone agrees which card it was, put it back on top. If nobody is sure, shuffle a random card from hand back into the deck.",
     "In a tournament: STOP. Do not shuffle, do not put anything back. Call a judge with the game state exactly as it is — that is the single most important thing you can do for the fix to be fair."],
  pc:true},
 {g:"Something went wrong", id:"pcmiss", t:"I forgot a trigger",
  s:"A “whenever” or “at the start of” that nobody noticed",
  b:["Casually: if it is noticed straight away and putting it right doesn't change any decisions made since, resolve it. If the game has moved on, it is usually missed.",
     "In a tournament: call a judge. Missed triggers have their own handling and it depends on how far the game has moved."],
  pc:true},
 {g:"Something went wrong", id:"pcstate", t:"We disagree about the game state",
  s:"Wrong lore, wrong damage, a card in the wrong place",
  b:["Casually: rebuild what you can both agree on and carry on. If you can't agree, take the version that is worse for whoever noticed last.",
     "In a tournament: call a judge and don't rearrange anything first. What the board looks like when the judge arrives is evidence."],
  pc:true},
 {g:"Something went wrong", id:"pceat", t:"I ate my opponent's card",
  s:"Destruction of personal property",
  b:["This is not a rules question, it is a lifestyle question.",
     "At a tournament this stops being a game problem and becomes a conduct one, which is handled by the organiser rather than by any rulebook, and you will probably be buying somebody a new card.",
     "Casually: apologise, replace the card, and drink some water."],
  pc:true}
];
const RULE_GROUPS=[...new Set(RULES.map(r=>r.g))];
const RULEBY=id=>RULES.find(r=>r.id===id);

const LORE_DEFAULTS_KEY="fs3_lore_defaults";
const LORE_FORMATS=[["core","Core"],["infinity","Infinity"],["coconut","Coconut"],["custom","Custom"]];
const LORE_MODES=[["casual","Casual"],["tournament","Tournament"]];
const LORE_SERIES=[["1","1 game"],["3","Best of 3"],["custom","Custom"]];
function loreFreshMatch(defaults){
  const d=defaults||load(LORE_DEFAULTS_KEY,null)||{format:"core",mode:"casual",seriesLen:3};
  return {n:2,
    players:[{name:"You",lore:0,colorMode:"primary"},{name:"Opponent",lore:0,colorMode:"primary"}],
    game:1,seriesLen:d.seriesLen||3,format:d.format||"core",customWin:d.customWin||20,
    mode:d.mode||"casual",duck:{},gameLog:[],loreLog:[],locked:false,needsSetup:true};
}
function loreLoad(){
  const d=load(LOREKEY,null);
  if(d&&d.players&&d.players.length){
    // backfill fields for boards saved before this feature existed
    if(!d.seriesLen)d.seriesLen=3;
    if(!d.format)d.format="core";
    if(!d.mode)d.mode="casual";
    if(!d.duck)d.duck={};
    if(!d.gameLog)d.gameLog=[];
    if(!d.loreLog)d.loreLog=[];
    d.players.forEach(p=>{if(!p.colorMode)p.colorMode="primary"});
    return d;
  }
  return loreFreshMatch();
}
function loreSave(){save(LOREKEY,LORE)}
/* format's base win total, before any Donald Duck adjustment */
function loreBaseWin(){
  if(LORE.format==="coconut")return 25;
  if(LORE.format==="custom")return LORE.customWin||20;
  return 20;
}
/* A seat's own Duck doesn't raise ITS threshold, only an opponent's — so this
   checks every OTHER seat, not seat i itself. If every seat with the card out
   is on the other side of the table (the normal case), this is exactly "if
   you played it, your opponent needs 25 and vice versa"; if both seats have
   it out, both raise each other's threshold, so both need 25. */
function loreWinTotalFor(i){
  if(LORE.format==="coconut")return 25;
  const oppDuck=LORE.players.slice(0,LORE.n).some((p,idx)=>idx!==i&&LORE.duck[idx]);
  return oppDuck?Math.max(loreBaseWin(),25):loreBaseWin();
}

/* A tap-to-choose sheet, single- or multi-select. Same overlay/Promise/cleanup
   shape as namePrompt and confirmBox above — this is that pattern generalised
   to "pick one (or several) of these", so the setup wizard, the Donald Duck
   owner picker and the seat colour picker all share one component instead of
   five bespoke ones.
   options: [{value,label,sub?}]. multi mode resolves with an array of the
   chosen values (strings); single mode resolves with one value or null. */
function choiceSheet(title,body,options,cfg){
  cfg=cfg||{};
  const multi=!!cfg.multi;
  const initial=cfg.initial;
  const pickedInit=multi?new Set((initial||[]).map(String)):(initial==null?null:String(initial));
  return new Promise(done=>{
    const picked=multi?new Set(pickedInit):pickedInit;
    const w=document.createElement("div");w.className="cfmbg";
    const optHtml=options.map(o=>{
      const v=String(o.value);
      const on=multi?picked.has(v):picked===v;
      return `<button class="choiceopt${on?" on":""}" data-v="${esc(v)}">
        <span class="cotxt"><b>${esc(o.label)}</b>${o.sub?`<span>${esc(o.sub)}</span>`:""}</span>
        ${multi?`<span class="cochk" aria-hidden="true"></span>`:""}
      </button>`}).join("");
    w.innerHTML=`<div class="cfm choicesheet" role="dialog" aria-modal="true">
      <h3>${esc(title)}</h3>${body?`<p>${esc(body)}</p>`:""}
      <div class="choicelist">${optHtml}</div>
      <div class="cfmb">
        <button class="btn" data-no>Cancel</button>
        ${multi?`<button class="btn go" data-yes>Done</button>`:""}
      </div></div>`;
    document.body.appendChild(w);
    const shut=v=>{w.remove();document.removeEventListener("keydown",key);done(v)};
    const key=e=>{if(e.key==="Escape")shut(null)};
    w.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{
      const v=b.dataset.v;
      if(multi){picked.has(v)?picked.delete(v):picked.add(v);b.classList.toggle("on")}
      else shut(v)});
    const no=w.querySelector("[data-no]");if(no)no.onclick=()=>shut(null);
    const yes=w.querySelector("[data-yes]");if(yes)yes.onclick=()=>shut(Array.from(picked));
    w.onclick=e=>{if(e.target===w)shut(null)};
    document.addEventListener("keydown",key)})}

/* ---- setup wizard -----------------------------------------------------
   Runs before a fresh match: players, format, casual/tournament, series
   length. Pre-fills from fs3_lore_defaults (stock: Core / Casual / Best of
   3) and can save whatever you pick back as your new default. Same
   fullscreen-overlay-inside-.lorewrap pattern as the victory screen and the
   judge panel, so it never leaves the tracker's own fullscreen mode. */
let SETUP=null;
/* One seat colour each, chosen before the match rather than dug out of
   Settings afterwards — picking your ink is part of sitting down. */
const setupColor=i=>({colorMode:"primary",inks:[INKS[i%INKS.length]]});
function openLoreSetup(){
  const d=load(LORE_DEFAULTS_KEY,null)||{format:"core",mode:"casual",seriesLen:3};
  SETUP={n:2,format:d.format||"core",customWin:d.customWin||20,mode:d.mode||"casual",
    seriesLen:d.seriesLen||3,saveDefault:false,names:[],
    colors:Array.from({length:4},(_,i)=>setupColor(i))};
  renderLoreSetup();
}
/* One screen, every choice an inline row of tap-buttons — no more modal-hop
   per question. The old version opened a choice sheet for each of the four
   questions in turn; tapping through all of them to change your mind about
   one thing meant several full-screen dialogs for what is really "glance at
   four rows, tap the ones that are wrong." A custom number (win total, or
   series length) is the one thing that still needs typing, so that stays an
   inline field that only appears once "Custom" is picked, instead of a
   detour through namePrompt. */
function renderLoreSetup(){
  const host=$("lorepage");if(!host)return;
  const seg=(id,options,cur)=>`<div class="seg" id="${id}">${options.map(([v,label])=>
    `<button class="segbtn${String(v)===String(cur)?" on":""}" data-v="${esc(String(v))}">${esc(label)}</button>`).join("")}</div>`;
  host.innerHTML=`<div class="lorewrap setupwrap" id="lorewrap">
    <div class="setupbody">
      <h1>New match</h1>
      <p class="setupsub">Tap to change anything — starts with your saved default.</p>
      ${LORE_RESUMABLE?`<button class="lbtn resumebar" id="stResume">
        Pick the last match back up · ${LORE.players.slice(0,LORE.n).map(p=>
          esc(p.name)+" "+p.lore).join(" · ")}</button>`:""}

      <div class="segrow"><b>Players</b>
        ${seg("segN",[[1,"1 (solo)"],[2,"2"],[3,"3"],[4,"4"]],SETUP.n)}</div>

      ${SETUP.n>1?`<div class="segrow"><b>Names</b>
        <p class="setupsub" style="margin:-2px 0 8px">Optional — leave any of these blank and it keeps
          the plain default (${SETUP.n===2?'"You" and "Opponent"':'"You", "Player 2", and so on'}).</p>
        <div class="namegrid">${Array.from({length:SETUP.n},(_,i)=>`
          <input class="nameinput" id="segName${i}" maxlength="14"
            placeholder="${esc(defaultSeatName(i,SETUP.n))}" value="${esc(SETUP.names[i]||"")}">`).join("")}
        </div></div>`:""}

      <div class="segrow"><b>Seat colours</b>
        <div class="seatcolrow">${Array.from({length:SETUP.n},(_,i)=>{
          const c=SETUP.colors[i]||setupColor(i);
          const label=c.colorMode==="primary"?(c.inks||[]).join(" / ")
            :(LORE_COLOR_MODES.find(m=>m[0]===c.colorMode)||[,""])[1];
          return `<button class="seatcol" data-seatcol="${i}"
            style="background:${seatBg(c,i)||"#1c5fa8"}">
            <span class="scname">${esc(SETUP.names[i]||defaultSeatName(i,SETUP.n))}</span>
            <span class="scink">${esc(label)}</span>
          </button>`}).join("")}</div>
      </div>

      <div class="segrow"><b>Format</b>
        ${seg("segFmt",LORE_FORMATS,SETUP.format)}
        ${SETUP.format==="custom"?`<div class="seginput"><label>Lore to win</label>
          <input type="number" min="1" id="customWinIn" value="${SETUP.customWin||20}"></div>`:""}
      </div>

      ${SETUP.n>1?`<div class="segrow"><b>Casual or tournament</b>
        ${seg("segMode",LORE_MODES,SETUP.mode)}
        ${SETUP.mode==="tournament"?`<div class="tourreminder">
          <p>We recommend you turn on Do Not Disturb so no outside information can be seen.</p>
          <p>The Judge tab will be unavailable in tournament mode. Always call for an in-person
            judge, and ask for a time extension if it takes five minutes or more to resolve
            your question.</p>
        </div>`:""}</div>`:""}

      ${SETUP.n>1?`<div class="segrow"><b>Games</b>
        ${seg("segSeries",LORE_SERIES,SETUP.seriesLen===1?"1":SETUP.seriesLen===3?"3":"custom")}
        ${SETUP.seriesLen!==1&&SETUP.seriesLen!==3?`<div class="seginput"><label>Best of</label>
          <input type="number" min="1" step="2" id="seriesLenIn" value="${SETUP.seriesLen}"></div>`:""}
      </div>`:`<p class="setupsub">Solo tracking — just your own lore, no opponent, no match.</p>`}

      <label class="setupdefault"><input type="checkbox" id="stSaveDef"${SETUP.saveDefault?" checked":""}> Save this as my default</label>
      <button class="lbtn prime setupgo" id="stGo">Start${SETUP.n===1?" tracking":" match"}</button>
    </div>
  </div>`;
  const wire=(id,onPick)=>{const el=$(id);if(!el)return;
    el.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{onPick(b.dataset.v);renderLoreSetup()})};
  {const rb=$("stResume");
   if(rb)rb.onclick=()=>{LORE_RESUMABLE=false;LORE.needsSetup=false;SETUP=null;loreSave();renderLore()}}
  wire("segN",v=>SETUP.n=+v);
  wire("segFmt",v=>SETUP.format=v);
  wire("segMode",v=>SETUP.mode=v);
  wire("segSeries",v=>SETUP.seriesLen=v==="custom"?5:+v);
  const cw=$("customWinIn");if(cw)cw.oninput=()=>{const n=parseInt(cw.value,10);if(n>0)SETUP.customWin=n};
  const sl=$("seriesLenIn");if(sl)sl.oninput=()=>{const n=parseInt(sl.value,10);if(n>0)SETUP.seriesLen=n};
  for(let i=0;i<SETUP.n;i++){const el=$("segName"+i);if(el)el.oninput=()=>{SETUP.names[i]=el.value}}
  document.querySelectorAll("[data-seatcol]").forEach(b=>b.onclick=async()=>{
    const i=+b.dataset.seatcol;
    const c=SETUP.colors[i]||(SETUP.colors[i]=setupColor(i));
    const mode=await choiceSheet("Seat colour for "+(SETUP.names[i]||defaultSeatName(i,SETUP.n)),
      "Chaos is a disco ball, and it throws fish when you tap plus or minus.",
      LORE_COLOR_MODES.map(([value,label])=>({value,label})),{initial:c.colorMode});
    if(mode==null)return;
    c.colorMode=mode;
    if(mode==="primary"){
      const inks=await inkSwatchPicker(c.inks||[INKS[i%INKS.length]]);
      if(inks){c.inks=inks;delete c.colorHex}
    }else if(mode==="random")c.colorHex=randHue();
    else delete c.colorHex;
    renderLoreSetup()});
  $("stGo").onclick=()=>{
    const saveDef=$("stSaveDef").checked;
    if(saveDef)save(LORE_DEFAULTS_KEY,{format:SETUP.format,customWin:SETUP.customWin,mode:SETUP.mode,seriesLen:SETUP.seriesLen});
    LORE={n:SETUP.n,
      players:Array.from({length:SETUP.n},(_,i)=>({
        name:String(SETUP.names[i]||"").trim().slice(0,14)||defaultSeatName(i,SETUP.n),
        lore:0,...(SETUP.colors[i]||setupColor(i))})),
      game:1,seriesLen:SETUP.n===1?1:SETUP.seriesLen,format:SETUP.format,customWin:SETUP.customWin,
      mode:SETUP.n===1?"casual":SETUP.mode,
      duck:{},gameLog:[],loreLog:[],locked:false,needsSetup:false};
    LORE_RESUMABLE=false;loreSave();SETUP=null;renderLore()};
}
function defaultSeatName(i,n){return i===0?"You":n===2?"Opponent":"Player "+(i+1)}

/* ---- per-seat colour themes ---------------------------------------------
   "primary" is the original four fixed colours. "random" rolls one hex once
   and keeps it (stored on the player so it survives a re-render). "stripes"
   is a CSS pattern, not a colour, so it's a seat class instead of an inline
   style. "chaos" animates in wireLore() via CHAOS_TIMERS — its inline style
   here is just the starting colour before the first tick. */
const PRIMARY_SEAT_COLORS=["#2f6fa8","#a83232","#2f8a5a","#7a4fa8"];
const LORE_COLOR_MODES=[["primary","Ink colour"],["random","Random"],
  ["stripes","Blue striped fish"],["chaos","Chaos"]];
function randHue(){return `hsl(${Math.floor(Math.random()*360)},60%,40%)`}
/* Darkens a #rrggbb by pct (negative = darker), for the solo-ink swatch's
   own little gradient -- two-ink swatches already get their gradient from
   the second colour, a solo ink needs SOME depth of its own. */
function shade(hex,pct){
  const n=parseInt(hex.slice(1),16),f=pct/100;
  const ch=s=>Math.max(0,Math.min(255,Math.round(s+(f<0?s*f:(255-s)*f))));
  const r=ch(n>>16),g=ch((n>>8)&255),b=ch(n&255);
  return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("");
}
/* Every deck's real ink identity, doubling as the seat colour picker: one or
   two of the six actual Lorcana inks, named exactly as the game names them
   (Amber, Amethyst, Emerald, Ruby, Sapphire, Steel) -- never "blue" or
   "purple". 6 solo + 15 pairs = every legal ink combination a deck can be. */
const INK_COMBOS=(()=>{
  const out=INKS.map(i=>[i]);
  for(let a=0;a<INKS.length;a++)for(let b=a+1;b<INKS.length;b++)out.push([INKS[a],INKS[b]]);
  return out;
})();
/* Fixed glint positions, reused on every swatch and every seat that uses
   one -- looks hand-scattered without needing a random seed per card, and
   it's one shared string rather than something recomputed per render. */
/* Dim stones glowing UNDER frosted glass, not hard white pinpricks sitting
   on top of it. Each one is a wide, low-alpha falloff — a 2%-radius dot at
   95% white reads as a speck of dust on the screen; a 40% falloff at a
   quarter of that reads as something lit from underneath. */
const GEM_SPARKLE=[
  "radial-gradient(circle at 20% 24%, rgba(255,255,255,.30) 0%, rgba(255,255,255,.10) 20%, rgba(255,255,255,0) 44%)",
  "radial-gradient(circle at 74% 16%, rgba(255,255,255,.24) 0%, rgba(255,255,255,.08) 17%, rgba(255,255,255,0) 38%)",
  "radial-gradient(circle at 42% 57%, rgba(255,255,255,.20) 0%, rgba(255,255,255,.06) 22%, rgba(255,255,255,0) 46%)",
  "radial-gradient(circle at 84% 64%, rgba(255,255,255,.26) 0%, rgba(255,255,255,.09) 18%, rgba(255,255,255,0) 40%)",
  "radial-gradient(circle at 24% 84%, rgba(255,255,255,.22) 0%, rgba(255,255,255,.07) 20%, rgba(255,255,255,0) 42%)",
  "radial-gradient(circle at 62% 92%, rgba(255,255,255,.18) 0%, rgba(255,255,255,.06) 16%, rgba(255,255,255,0) 36%)"
].join(",");
/* Stacking order, top to bottom: the frost (a soft wash with a highlight
   running down one side, so the sheet reads as a sheet), the glows sitting
   UNDER it, then the real ink colour as the base. */
function inkBg(inks){
  const base=inks.length>1
    ?`linear-gradient(135deg, ${HEX[inks[0]]}, ${HEX[inks[1]]})`
    :`linear-gradient(135deg, ${shade(HEX[inks[0]],22)}, ${shade(HEX[inks[0]],-20)})`;
  const frost="linear-gradient(158deg,rgba(255,255,255,.28) 0%,rgba(255,255,255,.05) 38%,"
    +"rgba(255,255,255,.02) 62%,rgba(255,255,255,.14) 100%)";
  return `${frost},${GEM_SPARKLE},${base}`;
}
const inkLabel=inks=>inks.join(" / ");
function seatBg(p,i){
  if(p.colorMode==="random")return p.colorHex||(p.colorHex=randHue());
  if(p.colorMode==="chaos")return p.colorHex||PRIMARY_SEAT_COLORS[i%4];
  if(p.colorMode==="stripes")return "";
  if(p.colorMode==="primary")return p.inks?inkBg(p.inks):(p.colorHex||PRIMARY_SEAT_COLORS[i%4]);
  return PRIMARY_SEAT_COLORS[i%4];
}
function inkSwatchPicker(current){
  return new Promise(done=>{
    const curKey=(current||[]).join("+");
    const w=document.createElement("div");w.className="cfmbg";
    w.innerHTML=`<div class="cfm choicesheet wide" role="dialog" aria-modal="true">
      <h3>Pick this seat's ink colour</h3>
      <p>One or two inks, same as a deck — dim stones glowing under frosted glass.</p>
      <div class="inkswatchgrid">${INK_COMBOS.map(inks=>{
        const key=inks.join("+");
        return `<button class="inkswatch${key===curKey?" on":""}" data-inks="${esc(key)}"
          style="background:${inkBg(inks)}">${esc(inkLabel(inks))}</button>`}).join("")}</div>
      <div class="cfmb"><button class="btn" data-no>Cancel</button></div>
    </div>`;
    document.body.appendChild(w);
    const shut=v=>{w.remove();document.removeEventListener("keydown",key);done(v)};
    const key=e=>{if(e.key==="Escape")shut(null)};
    w.querySelectorAll("[data-inks]").forEach(b=>b.onclick=()=>shut(b.dataset.inks.split("+")));
    w.querySelector("[data-no]").onclick=()=>shut(null);
    w.onclick=e=>{if(e.target===w)shut(null)};
    document.addEventListener("keydown",key)})}
let CHAOS_TIMERS=[];
function stopChaos(){CHAOS_TIMERS.forEach(t=>clearTimeout(t));CHAOS_TIMERS=[]}
/* The first version of chaos changed colour once per elapsed PRIME SECOND —
   2, 3, 5, 7, 11, 13... as real wall-clock seconds. That's calm, not
   chaotic: the gap between consecutive primes keeps growing (11 seconds of
   nothing between 19 and 23, then longer). This version keeps the prime
   flavour Ben liked but reschedules a fresh, randomly-picked SHORT prime
   delay after every flash instead of counting up real seconds — so the
   rhythm never settles into anything predictable, and it's never more than
   ~1.7s between flashes instead of sometimes 10+. */
const CHAOS_PRIME_TENTHS=[3,5,7,11,13,17];  // ×100ms = 0.3s – 1.7s
function scheduleChaos(el){
  const delay=CHAOS_PRIME_TENTHS[Math.floor(Math.random()*CHAOS_PRIME_TENTHS.length)]*100;
  const t=setTimeout(()=>{
    if(!el.isConnected)return;  // seat re-rendered/removed since this was scheduled
    el.style.background=randHue();
    el.classList.remove("jolt");void el.offsetWidth;el.classList.add("jolt");
    if(Math.random()<0.4){
      const r=el.getBoundingClientRect();
      fishworks(5,document.body,{x:r.left+r.width/2,y:r.top+r.height/2});
    }
    scheduleChaos(el);
  },delay);
  CHAOS_TIMERS.push(t);
}

/* Data index 0 is always "You" (loreFreshMatch/setup always create it
   first) — this decides which SLOT each data index lands in on screen, so
   "You" is always in the unflipped seat nearest whoever's holding the
   phone, never upside down to yourself. Only the DOM position (not the
   data index used for renaming, +/-, or the win log) comes from this. */
function loreRenderOrder(n){
  if(n<=1)return [0];
  if(n===2)return [1,0];
  if(n===3)return [1,2,0];
  return [1,2,0,3];
}
/* Opening the tracker is a decision point: a match left half-played is
   usually the one you want back, and a match left finished is usually one
   you want to clear. Asking beats guessing, and it means setting a game up
   is always one tap from opening the page rather than buried in Settings.
   Only on the way IN — every re-render during play skips it. */
let LORE_FRESH=false;
/* Set on the way in when the board still had a match on it, so the setup
   screen can offer it back. Cleared the moment a new match starts. */
let LORE_RESUMABLE=false;
const loreHasProgress=()=>!!LORE&&((LORE.gameLog||[]).length>0
  ||LORE.players.slice(0,LORE.n).some(p=>p.lore>0));
function renderLore(){
  LORE=LORE||loreLoad();
  /* Opening the tracker always lands on setting a match up. A match left
     on the board is offered at the top of that screen rather than getting
     in front of it — nine times in ten you are opening this because a new
     game is about to start. */
  if(LORE_FRESH){
    LORE_FRESH=false;
    if(!LORE.needsSetup){LORE.needsSetup=true;LORE_RESUMABLE=loreHasProgress()}
  }
  if(LORE.needsSetup){openLoreSetup();return}
  const duckOn=Object.values(LORE.duck||{}).some(Boolean);
  const html=`<div class="lorewrap" id="lorewrap">
    <div class="loreseats p${LORE.n}" id="loreseats">
      ${loreRenderOrder(LORE.n).map((i,pos)=>{
        const p=LORE.players[i];
        /* With two players the top seat is upside down so the person across
           the table reads it the right way up. With three or four, both top
           seats flip. */
        const flip=(LORE.n===2&&pos===0)||(LORE.n>2&&pos<2);
        const bg=seatBg(p,i);
        const wins=(LORE.gameLog||[]).filter(g=>g.seat===i);
        return `<div class="seat${flip?" flip":""}${p.colorMode==="stripes"?" stripes":""}${p.colorMode==="chaos"?" chaos":""}" data-seat="${i}"${bg?` style="background:${bg}"`:""}
             role="group" aria-label="${esc(p.name)}, ${p.lore} lore">
          <button class="seatname" data-rename="${i}" title="Tap to rename">${esc(p.name)}</button>
          <div class="seatnum" id="ln${i}" aria-live="polite" aria-atomic="true">${p.lore}</div>
          <div class="seatdelta" id="ld${i}" aria-hidden="true"></div>
          <!-- The whole left half of a seat takes one off and the whole right
               half adds one. A phone on a table between two people is pressed
               with a thumb, at speed, by someone watching the board rather
               than the screen — the biggest target you can offer is half the
               seat. The visible buttons stay for anyone who wants something to
               aim at, and for a mouse. -->
          <button class="seattap tapminus" data-minus="${i}" tabindex="-1" aria-hidden="true"${LORE.locked?" disabled":""}></button>
          <button class="seattap tapplus" data-plus="${i}" tabindex="-1" aria-hidden="true"${LORE.locked?" disabled":""}></button>
          <div class="seatbtns">
            <button class="lorebtn" data-minus="${i}" aria-label="${esc(p.name)} minus one lore"${LORE.locked?" disabled":""}>−</button>
            <button class="lorebtn" data-plus="${i}" aria-label="${esc(p.name)} plus one lore"${LORE.locked?" disabled":""}>+</button>
          </div>
          ${wins.length?`<div class="seatwon">${wins.map(g=>`<span>Won game ${g.game}</span>`).join("")}</div>`:""}
          ${i===0?`<button class="seatfs" data-fstoggle="1" aria-label="Full screen">⛶</button>`:""}
        </div>`}).join("")}
    </div>
    <div class="lorebar">
      <button class="lbtn exit" id="loreExit" aria-label="Back to the rest of the tools">← Back</button>
      <button class="lbtn" id="loreReset">Reset scores</button>
      ${LORE.locked?`<span class="lorelock" role="status">🔒 Score locked while the judge is open</span>`:""}
      ${duckOn?`<button class="lbtn duck" id="loreDuckGone">🦆 Press when the duck's gone</button>`:""}
      <span class="sp"></span>
      <button class="lbtn" id="loreSettings">⚙ Settings</button>
      ${LORE.mode==="tournament"?"":`<button class="lbtn judge" id="loreJudge">🤚 JUDGE</button>`}
    </div>
    <!-- Full-screen's minimal chrome: same three actions as the bar above
         (back, settings, judge) but icon-only and translucent, so the table
         between two players shows lore and nothing else. Always in the DOM,
         hidden/shown (and cross-faded) by body.lorefs -- see wireLore(). -->
    <button class="lorefsback" id="loreFsBack" aria-label="Exit full screen">←</button>
    <button class="lorefsgear" id="loreFsGear" aria-label="Settings">⚙</button>
    ${LORE.mode==="tournament"?"":`<button class="lorefsjudge" id="loreFsJudge" aria-label="Judge">🤚 Judge</button>`}
    <div id="judgehost"></div>
    <div id="settingshost"></div>
    <div id="vichost"></div>
  </div>`;
  $("lorepage").innerHTML=html;
  wireLore();
  /* renderLore() rebuilds #settingshost empty every time (it's a template
     literal, not a patch) — reopen it if a setting change is what triggered
     this render, so picking a colour doesn't also close the panel you're
     picking it from. */
  if(SETTINGS_OPEN)openLoreSettings();
}

function wireLore(){
  const w=$("lorewrap");if(!w)return;
  w.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>loreAdd(+b.dataset.plus,1,b));
  w.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>loreAdd(+b.dataset.minus,-1,b));
  w.querySelectorAll("[data-rename]").forEach(b=>b.onclick=async()=>{
    const i=+b.dataset.rename;
    const n=await namePrompt("Who's sitting here?","Just so the screen says the right thing.",LORE.players[i].name);
    if(n==null)return;
    LORE.players[i].name=String(n).trim().slice(0,14)||defaultSeatName(i,LORE.n);
    loreSave();renderLore()});
  $("loreExit").onclick=()=>{loreExitFS();OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
  $("loreReset").onclick=async()=>{
    if(!await confirmBox("Reset scores","Puts every player back to zero lore. Game wins are kept.","Reset"))return;
    /* Logged, so the log explains the cliff rather than just showing one.
       A record with an unexplained jump in it is worse than no record. */
    LORE.loreLog=LORE.loreLog||[];
    LORE.players.slice(0,LORE.n).forEach((p,i)=>{
      if(p.lore)LORE.loreLog.push({t:Date.now(),g:LORE.game,s:i,d:-p.lore,to:0})});
    LORE.players.forEach(p=>p.lore=0);loreSave();renderLore()};
  const dg=$("loreDuckGone");
  if(dg)dg.onclick=()=>{
    if(LORE.format==="coconut"){toast("Coconut format: still 25 lore to win.");return}
    const r=dg.getBoundingClientRect();
    fishworks(20,document.body,{x:r.left+r.width/2,y:r.top+r.height/2});
    LORE.duck={};loreSave();renderLore()};
  $("loreSettings").onclick=()=>openLoreSettings();
  const judgeGo=()=>{
    if(LORE.mode==="tournament"){toast("Tournament mode: call an actual judge — this tool is casual-only.");return}
    openJudge()};
  /* Both are absent in tournament mode rather than shown disabled — a greyed
     button still tells you there is a tool here, and at a tournament there
     isn't one. */
  {const j=$("loreJudge");if(j)j.onclick=judgeGo}
  {const j=$("loreFsJudge");if(j)j.onclick=judgeGo}
  $("loreFsGear").onclick=()=>openLoreSettings();
  $("loreFsBack").onclick=loreExitFS;
  /* It is a toggle. It only ever called loreEnterFS, so pressing it a second
     time re-entered a mode you were already in and there was no way back out
     except the arrow that appears in full screen. */
  w.querySelectorAll("[data-fstoggle]").forEach(b=>b.onclick=()=>{
    if(document.body.classList.contains("lorefs"))loreExitFS();else loreEnterFS();
  });
  stopChaos();
  LORE.players.slice(0,LORE.n).forEach((p,i)=>{
    if(p.colorMode!=="chaos")return;
    const el=w.querySelector(`[data-seat="${i}"]`);if(!el)return;
    scheduleChaos(el);
  });
}
/* ---- full screen ---------------------------------------------------------
   .lorewrap is already position:fixed;inset:0 at all times (see its CSS) --
   it's the app's own fullscreen-covering view the moment you're on this
   page. What "full screen" actually changes is twofold: it asks the OS to
   hide the browser's own chrome (address bar etc.) where the real
   Fullscreen API supports that, AND it switches the on-screen controls from
   a labelled toolbar to translucent icon-only ones (body.lorefs), which is
   the part that matters most for a phone lying on a table between two
   players. iOS Safari does not implement requestFullscreen for anything but
   a <video> (same limitation the aquarium works around) -- there, only the
   second half happens, which is still the whole visible win. */
function loreEnterFS(){
  document.body.classList.add("lorefs");
  const el=$("lorewrap");if(!el)return;
  const go=el.requestFullscreen||el.webkitRequestFullscreen;
  if(go)Promise.resolve(go.call(el)).catch(()=>{});
}
function loreExitFS(){
  document.body.classList.remove("lorefs");
  if(document.fullscreenElement||document.webkitFullscreenElement)
    (document.exitFullscreen||document.webkitExitFullscreen).call(document);
}
document.addEventListener("fullscreenchange",()=>{
  if(!(document.fullscreenElement||document.webkitFullscreenElement))
    document.body.classList.remove("lorefs");
});

/* The running "+7" under a seat's score. It accumulates while you keep
   tapping and clears itself once you stop, so it answers "did that go in?"
   without becoming a second number anyone has to read. Kept out of LORE
   entirely — it is about the last few seconds, not about the match, and
   nothing about it should survive a reload. */
/* ---- the log records a QUEST, not a button press -------------------------
   Questing for three used to write three separate "+1" lines, so a log of a
   real game read as a wall of ones and you could not see what actually
   happened. A burst of presses is one event: the entries accumulate here and
   only become a log line once the seat has been quiet for LORELOG_IDLE, so
   tapping 1-1-1 logs "+3" and 1x7 logs "+7".

   Flushed early on anything that ends the burst for you — a win, opening the
   settings where you would read the log, or leaving the page — because a
   pending entry that never landed is worse than a noisy one. */
const LORELOG_IDLE=3000;
const LOREPEND={};
function loreLogPending(i,d,to){
  const cur=LOREPEND[i]||(LOREPEND[i]={d:0,to:to,t:null});
  cur.d+=d;cur.to=to;
  clearTimeout(cur.t);
  cur.t=setTimeout(()=>loreLogFlush(i),LORELOG_IDLE);
}
function loreLogFlush(i){
  const cur=LOREPEND[i];if(!cur)return;
  clearTimeout(cur.t);
  const d=cur.d,to=cur.to;
  delete LOREPEND[i];
  if(!d||!LORE)return;                 // a burst that cancelled itself out
  LORE.loreLog=LORE.loreLog||[];
  LORE.loreLog.push({t:Date.now(),g:LORE.game,s:i,d,to});
  /* A long match is a few hundred entries at most; the cap is only here so
     somebody who leaves the tracker open for a week doesn't fill storage. */
  if(LORE.loreLog.length>800)LORE.loreLog.splice(0,LORE.loreLog.length-800);
  loreSave();
}
const loreLogFlushAll=()=>Object.keys(LOREPEND).forEach(k=>loreLogFlush(+k));
window.addEventListener("pagehide",loreLogFlushAll);
document.addEventListener("visibilitychange",()=>{if(document.hidden)loreLogFlushAll()});

const LOREDELTA={};
function loreBumpDelta(i,d){
  const el=$("ld"+i);if(!el)return;
  const cur=LOREDELTA[i]||{n:0,t:null};
  cur.n+=d;
  clearTimeout(cur.t);
  if(!cur.n){el.classList.remove("sdshow");LOREDELTA[i]=cur;return}
  el.textContent=(cur.n>0?"+":"−")+Math.abs(cur.n);
  el.classList.toggle("sdup",cur.n>0);
  el.classList.toggle("sddown",cur.n<0);
  el.classList.add("sdshow");
  cur.t=setTimeout(()=>{el.classList.remove("sdshow");cur.n=0},2600);
  LOREDELTA[i]=cur;
}
function loreAdd(i,d,btn){
  if(LORE.locked){toast("Score is locked while the judge is open");return}
  const p=LORE.players[i];
  const before=p.lore;
  p.lore=Math.max(0,p.lore+d);
  /* Nothing to record when minus is pressed at zero — the score did not
     move, and a log full of "went down by 0" is a log nobody reads. */
  if(p.lore!==before){
    loreLogPending(i,p.lore-before,p.lore);
    loreBumpDelta(i,p.lore-before);
  }
  loreSave();
  const el=$("ln"+i);
  if(el){el.textContent=p.lore;el.classList.add("seatpop");setTimeout(()=>el.classList.remove("seatpop"),140)}
  const seat=el&&el.closest(".seat");
  if(seat)seat.setAttribute("aria-label",p.name+", "+p.lore+" lore");
  if(p.colorMode==="chaos"&&btn){
    const r=btn.getBoundingClientRect();
    fishworks(6,document.body,{x:r.left+r.width/2,y:r.top+r.height/2});
  }
  if(p.lore>=loreWinTotalFor(i)){loreLogFlushAll();loreVictory(i)}
}

/* ---- victory --------------------------------------------------------------
   One screen for every win now, whichever game of the series it is — no more
   re-asking "best of 3 or just one game" after game 1 (that choice moved to
   the setup wizard), and win tags are read off LORE.gameLog by the actual
   game number rather than a per-seat counter, so game 2 correctly says
   "Won game 2" even when a DIFFERENT player won game 1. */
/* Counts a number up from 0 to its target instead of just appearing —
   the "fun animated" ask. Every element with data-count gets its own run,
   so the whole scoreboard (not just the winner) animates in together. */
function animateVicNums(host){
  host.querySelectorAll("[data-count]").forEach(el=>{
    const target=+el.dataset.count,dur=750,t0=performance.now();
    const tick=now=>{
      const t=Math.min(1,(now-t0)/dur),eased=1-Math.pow(1-t,3);
      el.textContent=Math.round(target*eased);
      if(t<1)requestAnimationFrame(tick)};
    requestAnimationFrame(tick)})}

function loreVictory(i){
  const p=LORE.players[i];
  const host=$("vichost");if(!host)return;
  /* Solo tracking has no opponent and no match to decide — reaching the
     total is a milestone to celebrate, not a fork in a series. Dismissing
     it just keeps counting; nothing resets. */
  if(LORE.n===1){
    host.innerHTML=`<div class="vic" id="vic">
      <div class="viccrest solo">
        <h1>🎉 ${loreWinTotalFor(0)} LORE</h1>
        <div class="vicscores"><div class="vicscore winner">
          <span class="vsnum" data-count="${p.lore}">0</span></div></div>
        <div class="vicwho">You reached ${loreWinTotalFor(0)} lore</div>
        <div class="vicbtns">
          <button class="lbtn go" data-solozero="1">Reset lore to 0</button>
          <button class="lbtn" data-solonew="1">Start a new match</button>
          <button class="lbtn" data-keep="1">Keep counting</button>
        </div>
      </div>
    </div>`;
    fishworks(Math.min(60,p.lore));
    animateVicNums(host);
    /* Three things anyone actually does after hitting the total: play the
       same deck again, set up something different, or carry on counting past
       20 because the game is not over yet. */
    host.querySelector("[data-keep]").onclick=()=>{host.innerHTML=""};
    host.querySelector("[data-solozero]").onclick=()=>{
      loreLogFlushAll();
      LORE.players.forEach(x=>x.lore=0);
      LORE.game++;loreSave();host.innerHTML="";renderLore();
      toast("Lore reset — same setup");
    };
    host.querySelector("[data-solonew]").onclick=()=>{host.innerHTML="";loreNewMatchPrompt()};
    return;
  }
  LORE.gameLog.push({game:LORE.game,seat:i});
  loreSave();
  const total=LORE.players.slice(0,LORE.n).reduce((a,x)=>a+x.lore,0);
  const winsFor=s=>LORE.gameLog.filter(g=>g.seat===s).length;
  const needed=Math.ceil(LORE.seriesLen/2);
  const decided=LORE.seriesLen===1||winsFor(i)>=needed;
  host.innerHTML=`<div class="vic" id="vic">
    <div class="viccrest">
      <h1>${decided?"VICTORY":"GAME "+LORE.game}</h1>
      <div class="vicwho">${esc(p.name)}</div>
      <div class="vicscores">${LORE.players.slice(0,LORE.n).map((x,idx)=>`
        <div class="vicscore${idx===i?" winner":""}">
          <span class="vsname">${esc(x.name)}</span>
          <span class="vsnum" data-count="${x.lore}">0</span>
        </div>`).join("")}</div>
      ${LORE.seriesLen>1?`<div class="vicseries">${
        LORE.gameLog.map(g=>`<span><b>Game ${g.game}</b>${
          esc((LORE.players[g.seat]||{name:"?"}).name)}</span>`).join("")}${
        Array.from({length:Math.max(0,LORE.seriesLen-LORE.gameLog.length)},(_,k)=>
          `<span class="toplay"><b>Game ${LORE.gameLog.length+k+1}</b>still to play</span>`).join("")
      }</div>`:""}
      <p>${decided&&LORE.seriesLen>1?"That's the match. Report it while you both remember the result.":""}</p>
      <div class="vicbtns" id="vicbtns">
        ${decided
          ? `<button class="lbtn go" data-hub="1">Open Play Hub in a new tab</button>
             <button class="lbtn" data-later="1">I'll do it later</button>`
          : `<button class="lbtn go" data-next="1">Start game ${LORE.game+1}</button>`}
      </div>
    </div>
  </div>`;
  /* Fish thrown outward like a firework — still sized by the table's total
     lore, just not printed as a number on screen anymore. */
  fishworks(total);
  animateVicNums(host);
  const n=host.querySelector("[data-next]");
  if(n)n.onclick=()=>{LORE.game++;LORE.players.forEach(x=>x.lore=0);loreSave();host.innerHTML="";renderLore()};
  const hb=host.querySelector("[data-hub]");
  if(hb)hb.onclick=()=>{
    window.open("https://tcg.ravensburgerplay.com/","_blank","noopener");
    endMatch()};
  const lt=host.querySelector("[data-later]");
  if(lt)lt.onclick=endMatch;
}
/* host defaults to the victory overlay (centred fireworks, as before);
   pass document.body + a viewport {x,y} to anchor a burst somewhere else
   instead (the duck-gone button, a chaos-seat tap). */
function fishworks(n,host,originXY){
  host=host||$("vic");if(!host)return;
  if(window.matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  const N=Math.max(6,Math.min(60,n));
  for(let k=0;k<N;k++){
    const f=document.createElement("span");
    f.className="lorefish";f.textContent="🐟";f.setAttribute("aria-hidden","true");
    const a=(Math.PI*2*k)/N+Math.random()*.4;
    const d=140+Math.random()*260;
    if(originXY){f.style.position="fixed";f.style.left=originXY.x+"px";f.style.top=originXY.y+"px"}
    else{f.style.left="50%";f.style.top="50%"}
    f.style.setProperty("--fx",(Math.cos(a)*d).toFixed(0)+"px");
    f.style.setProperty("--fy",(Math.sin(a)*d).toFixed(0)+"px");
    f.style.setProperty("--fr",(Math.random()*720-360).toFixed(0)+"deg");
    f.style.animationDelay=(Math.random()*.5).toFixed(2)+"s";
    f.style.fontSize=(20+Math.random()*22).toFixed(0)+"px";
    host.appendChild(f);
    setTimeout(()=>f.remove(),3200);
  }
}
function endMatch(){
  stopChaos();
  LORE.needsSetup=true;loreSave();
  const h=$("vichost");if(h)h.innerHTML="";
  renderLore();
}

/* ---- the judge panel ------------------------------------------------------
   Opening this locks the score. The lock is the point: the moment a rules
   question comes up, nobody should be nudging totals, and afterwards nobody
   should be arguing about whether they were nudged.

   Navigation is a stack rather than a router, because every route here is
   "the thing I just tapped" and the only way out is back. */
let JSTACK=[];
let JCASE={you:[],them:[],active:"",target:"",question:"",under:{},
  ink:{you:{total:0,exerted:0},them:{total:0,exerted:0}}};

/* Counts up only while the panel is open — the point is showing the table
   how long a ruling has eaten into the round, not a stopwatch you manage. */
let JUDGE_STARTED=0,JUDGE_TICK=null;
/* jHomeList()'s intro line mentions the score staying locked -- true of the
   in-game panel, meaningless (there's no score) on the Other-tab standalone
   one, so both entry points set this before drawing. */
let JSTANDALONE=false;
function judgeElapsedLabel(){
  const s=Math.floor((Date.now()-JUDGE_STARTED)/1000);
  return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
}
function openJudge(){
  JSTANDALONE=false;
  LORE.locked=true;loreSave();
  JCASE={you:[],them:[],active:"",target:"",question:"",under:{},
    ink:{you:{total:0,exerted:0},them:{total:0,exerted:0}}};
  JSTACK=[{v:"home"}];
  $("judgehost").innerHTML=`<div class="jpanel" id="judge">
    <div class="judgehd">
      <button class="jback" id="jclose">← Back to lore tracker</button>
      <span class="jtimer" id="jtimer" aria-live="polite">⏱ 00:00</span>
      <span class="sp"></span>
      <h2>🤚 Judge</h2>
    </div>
    <div class="jreminder" role="note">⚠ Always call a real judge. At a sanctioned
      event, the head judge's ruling stands even if this tool shows something
      different.</div>
    <div style="padding:10px 14px 0;background:var(--carbon)">
      <input class="judgeq" id="jq" type="search" autocomplete="off"
        placeholder="Quick search: card, keyword, or rule…"
        aria-label="Search cards and rules">
    </div>
    <div class="judgebody" id="jbody"></div>
  </div>`;
  $("jclose").onclick=closeJudge;
  JUDGE_STARTED=Date.now();
  clearInterval(JUDGE_TICK);
  JUDGE_TICK=setInterval(()=>{const t=$("jtimer");if(t)t.textContent="⏱ "+judgeElapsedLabel()},1000);
  const q=$("jq");
  let jt;
  q.oninput=()=>{clearTimeout(jt);jt=setTimeout(()=>{
    const cur=JSTACK[JSTACK.length-1];
    if(!cur||cur.v!=="pick")JSTACK=[{v:"home"}];
    judgeDraw()},110)};
  judgeDraw();
  /* Not focused on purpose. A phone that opens a keyboard the instant you tap
     JUDGE covers the thing you came here to read, and on a table between two
     people the first move is usually to scroll the rules list, not type. */
  renderLoreSeats();
}
async function closeJudge(){
  clearInterval(JUDGE_TICK);
  const elapsedMs=Date.now()-JUDGE_STARTED;
  LORE.locked=false;loreSave();
  $("judgehost").innerHTML="";
  renderLore();
  if(elapsedMs>5*60*1000)
    await confirmBox("That took a while","This ruling took over 5 minutes — at a tournament, you can ask for a time extension to make up for it.","Got it");
}
/* The Other-tab entry point: the exact same lookup (judgeDraw/jWire/jHome
   share every bit of state and markup with the in-game panel) but with no
   lore board to lock and no ruling to time — someone can land here straight
   from the Other menu just to look something up. */
function renderStandaloneJudge(){
  JSTANDALONE=true;
  JCASE={you:[],them:[],active:"",target:"",question:"",under:{},
    ink:{you:{total:0,exerted:0},them:{total:0,exerted:0}}};
  JSTACK=[{v:"home"}];
  $("judgepage").innerHTML=`<div class="jpanel" id="judgeStandalone">
    <div class="judgehd">
      <button class="jback" id="jspClose">← Back to Other</button>
      <span class="sp"></span>
      <h2>🤚 Judge</h2>
    </div>
    <div class="jreminder" role="note">⚠ Always call a real judge. At a sanctioned
      event, the head judge's ruling stands even if this tool shows something
      different.</div>
    <div style="padding:10px 14px 0;background:var(--carbon)">
      <input class="judgeq" id="jq" type="search" autocomplete="off"
        placeholder="Quick search: card, keyword, or rule…"
        aria-label="Search cards and rules">
    </div>
    <div class="judgebody" id="jbody"></div>
  </div>`;
  $("jspClose").onclick=closeStandaloneJudge;
  const q=$("jq");
  let jt;
  q.oninput=()=>{clearTimeout(jt);jt=setTimeout(()=>{
    const cur=JSTACK[JSTACK.length-1];
    if(!cur||cur.v!=="pick")JSTACK=[{v:"home"}];
    judgeDraw()},110)};
  judgeDraw();
}
function closeStandaloneJudge(){OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")}
/* Repaint just the seats, so opening the judge greys the +/− without throwing
   away the panel we are standing in. */
function renderLoreSeats(){
  const w=$("lorewrap");if(!w)return;
  w.querySelectorAll(".lorebtn").forEach(b=>b.disabled=!!LORE.locked);
  const bar=w.querySelector(".lorelock");
  if(LORE.locked&&!bar){
    const s=document.createElement("span");
    s.className="lorelock";s.setAttribute("role","status");
    s.textContent="🔒 Score locked while the judge is open";
    w.querySelector(".lorebar").insertBefore(s,w.querySelector(".lorebar .sp"));
  }else if(!LORE.locked&&bar)bar.remove();
  const jb=$("loreJudge");if(jb)jb.classList.toggle("on",!!LORE.locked);
}

/* ---- in-game settings ------------------------------------------------
   A second overlay, same shape as the judge panel, reached from its own
   button in the lore bar. Donald Duck - Flustered Sorcerer, per-seat colour
   themes, and jumping back into the setup wizard for a new match all live
   here so they're reachable mid-game without leaving fullscreen. */
/* Every change to every score, oldest first, grouped by game. Read from the
   bottom it is the story of the match: added 1, added 3, went down by 2. The
   point is that a disagreement about the score has somewhere to go other than
   two people's memories. */
function loreLogHtml(){
  const log=LORE.loreLog||[];
  if(!log.length)return `<div class="lorelog"><div class="llempty">
    Nothing yet. Every plus and minus lands here as you play, so you can settle
    "wait, what was the score?" without anybody having to remember.</div></div>`;
  const clock=t=>{const d=new Date(t);
    return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
  let lastGame=null,rows="";
  log.forEach(e=>{
    const p=LORE.players[e.s]||{name:"Seat "+(e.s+1)};
    if(e.g!==lastGame){lastGame=e.g;
      rows+=`<div class="llgame">Game ${e.g}</div>`}
    rows+=`<div class="llrow">
      <span class="lldot" style="background:${seatBg(p,e.s)||"#2f6fa8"}"></span>
      <span class="llwho">${esc(p.name)}</span>
      <span class="lld ${e.d>0?"llup":"lldown"}">${e.d>0?"added "+e.d:"went down by "+Math.abs(e.d)}</span>
      <span class="llto">→ ${e.to}</span>
      <span class="llt">${clock(e.t)}</span>
    </div>`});
  return `<div class="lorelog" id="lorelog">${rows}</div>`;
}
let SETTINGS_OPEN=false;
function openLoreSettings(){
  SETTINGS_OPEN=true;
  loreLogFlushAll();          // you are about to read it
  const fmtLabel=(LORE_FORMATS.find(f=>f[0]===LORE.format)||[,"Core"])[1];
  const modeLabel=(LORE_MODES.find(m=>m[0]===LORE.mode)||[,"Casual"])[1];
  $("settingshost").innerHTML=`<div class="jpanel" id="loresettings">
    <div class="judgehd">
      <button class="jback" id="lsClose">← Back to lore tracker</button>
      <span class="sp"></span>
      <h2>⚙ Settings</h2>
    </div>
    <div class="judgebody">
      <div class="setupreadout">${esc(fmtLabel)} · ${esc(modeLabel)} · ${
        LORE.seriesLen===1?"1 game":"Best of "+LORE.seriesLen} · first to ${loreBaseWin()} lore</div>
      <div class="jgroup"><h3>This game</h3>
        <div class="setupreadout" style="margin-bottom:8px">${
          LORE.players.slice(0,LORE.n).map(p=>esc(p.name)+" "+p.lore).join(" · ")}${
          (LORE.gameLog||[]).length?" · game "+LORE.game:""}</div>
      </div>
      <div class="jgroup"><h3>Special rules</h3>
        <button class="settingsrow" id="lsDuck">
          <span class="srico srdraw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.6 5.2a2.6 2.6 0 1 0-2.3 3.9h.6"/><circle cx="16.3" cy="4.9" r=".9" fill="currentColor" stroke="none"/><path d="M18 5.4h2.6l-2 1.9"/><path d="M13.9 9.1c-3.6.3-6.4 2.3-6.4 5 0 1.4.8 2.7 2 3.5"/><path d="M4 16.4c1.4 2.6 4.4 3.9 8 3.9 4.7 0 8.4-2.6 8.4-6.1 0-1.2-.4-2.2-1.1-3.1"/></svg></span>
          <span class="srtxt"><b>Donald Duck – Flustered Sorcerer</b>
            <span>Whoever's opponent has this in play needs 25 lore to win instead of 20.</span></span>
        </button>
      </div>
      <div class="jgroup"><h3>Seat colours</h3>
        ${LORE.players.slice(0,LORE.n).map((p,i)=>{
          const modeLbl=(LORE_COLOR_MODES.find(m=>m[0]===p.colorMode)||[,"Primary colours"])[1];
          return `<button class="settingsrow" data-seatcolor="${i}">
            <span class="srico" style="background:${seatBg(p,i)||"#2f6fa8"}"></span>
            <span class="srtxt"><b>${esc(p.name)}</b><span>${esc(modeLbl)}</span></span>
          </button>`}).join("")}
      </div>
      <div class="jgroup"><h3>Players</h3>
        <button class="settingsrow" id="lsPlayers">
          <span class="srico srdraw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8.4" r="2.9"/><path d="M3.6 19.2c.5-2.9 2.8-4.7 5.4-4.7s4.9 1.8 5.4 4.7"/><path d="M16.4 6.2a2.9 2.9 0 0 1 0 5.5"/><path d="M17.6 14.9c1.7.6 2.9 2.2 3.2 4.3"/></svg></span>
          <span class="srtxt"><b>${LORE.n===1?"Solo":LORE.n+" players"}</b><span>Tap to change how many are sitting at the table.</span></span>
        </button>
      </div>
      <!-- Ben, 2026-09-07: the log is reference, not a setting. It was the
           first thing in this panel and it is a scrolling list, so everything
           you actually came here to change sat below it. Last, and folded. -->
      <div class="jgroup"><h3>Match</h3>
        <button class="settingsrow" id="lsNewMatch">
          <span class="srico srdraw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.4 12a8.4 8.4 0 1 1-2.6-6.1"/><path d="M20.6 4.3v4.4h-4.4"/></svg></span>
          <span class="srtxt"><b>New match / change setup</b><span>Resets the board and reruns the setup wizard.</span></span>
        </button>
      </div>
      <div class="jgroup">
        <details class="lslog" id="lsLogWrap">
          <summary><span class="srico srdraw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4.6h11.4a2 2 0 0 1 2 2v12.8H7a2 2 0 0 1-2-2Z"/><path d="M8.4 8.6h6.6"/><path d="M8.4 12h6.6"/><path d="M8.4 15.4h4"/></svg></span>
            <span class="srtxt"><b>Lore log</b><span>${
              (LORE.loreLog||[]).length?(LORE.loreLog.length+" entr"+(LORE.loreLog.length===1?"y":"ies")+" this match"):"Nothing recorded yet"}</span></span></summary>
          <div class="lslogbody">
            ${loreLogHtml()}
            ${(LORE.loreLog||[]).length?`<button class="settingsrow" id="lsClearLog" style="margin-top:7px">
              <span class="srico srdraw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.6 3.6 9.2 9"/><path d="M16.6 5.6 11.2 11"/><path d="m13 7.6 3.4 3.4"/><path d="M14.7 12.2 9.6 20.4H5.2c-.9-2.6-.4-5.2 1.5-7.1l2.4-2.4Z"/><path d="M8.2 14.6 6.5 20.4"/><path d="M11.3 15.1 10.6 20.4"/></svg></span>
              <span class="srtxt"><b>Clear the log</b><span>Scores are left exactly as they are.</span></span>
            </button>`:""}
          </div>
        </details>
      </div>
    </div>
  </div>`;
  $("lsClose").onclick=closeLoreSettings;
  {const cl=$("lsClearLog");
   if(cl)cl.onclick=async()=>{
     if(!await confirmBox("Clear the log","Wipes the list of score changes for this match. Nobody's lore moves.","Clear it",true))return;
     LORE.loreLog=[];loreSave();openLoreSettings()}}
  $("lsPlayers").onclick=async()=>{
    if(LORE.locked){toast("Score is locked while the judge is open");return}
    const v=await choiceSheet("How many players?","",
      [1,2,3,4].map(n=>({value:n,label:n===1?"Solo":n+" players"})),{initial:LORE.n});
    if(v==null||v===LORE.n)return;
    LORE.n=v;
    while(LORE.players.length<LORE.n)
      LORE.players.push({name:"Player "+(LORE.players.length+1),lore:0,colorMode:"primary"});
    if(LORE.n===1)LORE.seriesLen=1;
    loreSave();renderLore();};
  $("lsDuck").onclick=async()=>{
    const chosen=await choiceSheet("Who played Donald Duck – Flustered Sorcerer?",
      "Pick everyone who has it in play. Their opponent(s) need 25 lore to win while it's out.",
      LORE.players.slice(0,LORE.n).map((p,i)=>({value:i,label:p.name})),
      {multi:true,initial:Object.keys(LORE.duck).filter(k=>LORE.duck[k]).map(Number)});
    if(chosen==null)return;
    const nd={};chosen.forEach(v=>nd[+v]=true);
    LORE.duck=nd;loreSave();renderLore();};
  {const lg=$("lorelog");if(lg)lg.scrollTop=lg.scrollHeight}
  $("settingshost").querySelectorAll("[data-seatcolor]").forEach(b=>b.onclick=async()=>{
    const i=+b.dataset.seatcolor;
    const v=await choiceSheet("Seat colour for "+LORE.players[i].name,
      "Chaos fades to a new colour on every prime-numbered second, and throws fish when you tap plus or minus.",
      LORE_COLOR_MODES.map(([val,label])=>({value:val,label})),{initial:LORE.players[i].colorMode});
    if(v==null)return;
    LORE.players[i].colorMode=v;
    if(v==="primary"){
      const inks=await inkSwatchPicker(LORE.players[i].inks||[INKS[i%INKS.length]]);
      if(inks){LORE.players[i].inks=inks;delete LORE.players[i].colorHex}
    }else if(v==="random")LORE.players[i].colorHex=randHue();
    else delete LORE.players[i].colorHex;
    loreSave();renderLore();});
  $("lsNewMatch").onclick=loreNewMatchPrompt;
}
/* Shared by the Settings row and the solo victory screen, so the two can't
   drift into two different ideas of what "new match" resets. */
async function loreNewMatchPrompt(){
  if(!await confirmBox("New match","This resets everyone's lore and game wins and reruns the setup wizard.","Start new match",true))return;
  loreLogFlushAll();
  closeLoreSettings();
  LORE.needsSetup=true;loreSave();renderLore();
}
function closeLoreSettings(){
  SETTINGS_OPEN=false;
  const h=$("settingshost");if(h)h.innerHTML="";
}

function jgo(state){JSTACK.push(state);judgeDraw()}
function jback(){
  if(JSTACK.length>1)JSTACK.pop();
  const q=$("jq"),cur=JSTACK[JSTACK.length-1];
  if(q&&cur&&cur.v==="home"){q.value="";q.placeholder="Quick search: card, keyword, or rule…"}
  judgeDraw()
}

function judgeDraw(){
  const s=JSTACK[JSTACK.length-1]||{v:"home"};
  const body=$("jbody");if(!body)return;
  if(s.v==="home")      body.innerHTML=jHome();
  else if(s.v==="pick") body.innerHTML=jPicker(s.side,s.under);
  else if(s.v==="rules")body.innerHTML=`<button class="jback" data-jback="1">← Back</button>${jHomeList()}${jFoot()}`;
  else if(s.v==="advanced")body.innerHTML=jAdvanced();
  else if(s.v==="case") body.innerHTML=jCaseRuling();
  else if(s.v==="card") body.innerHTML=jCard(s.f);
  else if(s.v==="rule") body.innerHTML=jRule(s.id);
  else if(s.v==="kw")   body.innerHTML=jKw(s.k);
  body.scrollTop=0;
  jWire(body);
}
function jWire(body){
  body.querySelectorAll("[data-jcard]").forEach(b=>b.onclick=()=>jgo({v:"card",f:b.dataset.jcard}));
  body.querySelectorAll("[data-jrule]").forEach(b=>b.onclick=()=>jgo({v:"rule",id:b.dataset.jrule}));
  body.querySelectorAll("[data-jkw]").forEach(b=>b.onclick=()=>jgo({v:"kw",k:b.dataset.jkw}));
  body.querySelectorAll("[data-jback]").forEach(b=>b.onclick=jback);
  body.querySelectorAll("[data-jresolved]").forEach(b=>b.onclick=JSTANDALONE?closeStandaloneJudge:closeJudge);
  body.querySelectorAll("[data-jadd]").forEach(b=>b.onclick=()=>{
    const q=$("jq");if(q){q.value="";q.placeholder="Search for a card to add…"}
    jgo({v:"pick",side:b.dataset.jadd});if(q)q.focus()});
  body.querySelectorAll("[data-jpick]").forEach(b=>b.onclick=()=>{
    const side=b.dataset.jside,f=b.dataset.jpick,under=b.dataset.junder;
    if(under){JCASE.under[under]=JCASE.under[under]||[];if(JCASE.under[under].length<2)JCASE.under[under].push(f)}
    else if(JCASE[side]&&!JCASE[side].includes(f)&&JCASE[side].length<6)JCASE[side].push(f);
    const q=$("jq");if(q){q.value="";q.placeholder="Quick search: card, keyword, or rule…"}
    /* Back to the board, not the menu — picking a card happens FROM Advanced,
       so that's where it should land, same as every other action in there. */
    JSTACK=[{v:"home"},{v:"advanced"}];judgeDraw()});
  body.querySelectorAll("[data-jremove]").forEach(b=>b.onclick=()=>{
    const side=b.dataset.jside,f=b.dataset.jremove;
    JCASE[side]=JCASE[side].filter(x=>x!==f);
    const key=side+"|"+f;
    delete JCASE.under[key];
    if(JCASE.active===key)JCASE.active="";if(JCASE.target===key)JCASE.target="";judgeDraw()});
  body.querySelectorAll("[data-jrole]").forEach(b=>b.onclick=()=>{
    const role=b.dataset.jrole,key=b.dataset.jside+"|"+b.dataset.jf;
    JCASE[role]=JCASE[role]===key?"":key;judgeDraw()});
  body.querySelectorAll("[data-jshift]").forEach(b=>b.onclick=()=>{
    const q=$("jq"),key=b.dataset.jside+"|"+b.dataset.jshift;
    if(q){q.value="";q.placeholder="Search for the Shift base underneath…"}
    jgo({v:"pick",side:b.dataset.jside,under:key});if(q)q.focus()});
  body.querySelectorAll("[data-jink]").forEach(b=>b.onclick=()=>{
    const side=b.dataset.jside,op=b.dataset.jink,ink=JCASE.ink[side];
    if(op==="add"&&ink.total<20)ink.total++;
    if(op==="remove"&&ink.total>0){ink.total--;ink.exerted=Math.min(ink.exerted,ink.total)}
    if(op==="exert"&&ink.exerted<ink.total)ink.exerted++;
    if(op==="ready"&&ink.exerted>0)ink.exerted--;
    judgeDraw()});
  body.querySelectorAll("[data-jcase]").forEach(b=>b.onclick=()=>jgo({v:"case"}));
  body.querySelectorAll("[data-jbrowse]").forEach(b=>b.onclick=()=>jgo({v:"rules"}));
  body.querySelectorAll("[data-jadvanced]").forEach(b=>b.onclick=()=>jgo({v:"advanced"}));
  const cq=body.querySelector("#jcaseq");if(cq)cq.oninput=()=>JCASE.question=cq.value.slice(0,240);
}
function jCites(r){
  if(!r||!(r.cr||[]).length)return "";
  return `<div class="jcites"><b>Why this ruling</b>${r.cr.map(c=>
    `<div class="jcite"><code>CR ${esc(c[0])}</code><span>${esc(c[1])}</span></div>`).join("")}
    <div class="jsrc">Comprehensive Rules ${esc(CR_VERSION)} · effective ${esc(CR_EFFECTIVE)} ·
      ${officialSource("Open official rules",OFFICIAL_RULES_URL)}</div></div>`;
}
function jResolved(){return `<button class="jresolved" data-jresolved="1">✓ Resolved${JSTANDALONE?" — back to Other":" — return to game"}</button>`}

/* ---- what a query finds --------------------------------------------------
   Three kinds of hit from one box, in the order you are most likely to have
   meant them: the keyword (shortest answer), the rule (the argument you are
   actually having), then the card. */
function judgeFind(q){
  const f=flat(q);
  if(!f)return null;
  const kws=Object.keys(KWRULES).filter(k=>flat(k).indexOf(f)>=0);
  const rules=RULES.filter(r=>
    flat(r.t).indexOf(f)>=0||flat(r.s).indexOf(f)>=0||flat(r.g).indexOf(f)>=0||
    r.b.some(x=>flat(x).indexOf(f)>=0));
  /* Cards: name first and exact-prefix above contains, because somebody typing
     "elsa" during a match wants the Elsas, not every card that says "Elsa". */
  const scored=[];
  for(const c of CARDS){
    const h=flat(c.f);
    const ruling=(c.ru||[]).map(x=>[x.q,x.a,x.s].join(" ")).join(" ");
    const note=(c.rsi||[]).map(x=>[x.t,x.src].join(" ")).join(" ");
    let rank=99,reason="";
    if(h===f){rank=0;reason="Exact card name"}else if(h.indexOf(f)===0){rank=1;reason="Card name starts with your search"}else if(h.indexOf(f)>0){rank=2;reason="Card name contains your search"}else if(flat(ruling).indexOf(f)>=0){rank=3;reason="Official ruling matches"}else if(flat(c.tx||"").indexOf(f)>=0){rank=4;reason="Card text matches"}else if(flat(note).indexOf(f)>=0){rank=5;reason="Ready Set Ink note matches"}else if((c._h0||"").indexOf(f)>=0){rank=6;reason="Card details match"}else continue;
    scored.push([rank,h,c,reason]);
  }
  scored.sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1]));
  /* One row per NAME. Sixteen printings of the same Ariel is noise when the
     question is what her text does. */
  const seen=new Set(),cards=[];
  for(const row of scored){const c=row[2];if(seen.has(c.f))continue;seen.add(c.f);cards.push({c,reason:row[3]});if(cards.length>=16)break}
  return {kws,rules,cards,exact:cards.filter(x=>flat(x.c.f)===f)};
}

function jCaseCard(side,f){
  const c=CARDS.find(x=>x.f===f);if(!c)return "";
  const key=side+"|"+f,bases=JCASE.under[key]||[],isActive=JCASE.active===key,isTarget=JCASE.target===key;
  return `<div class="jplaycard${bases.length?" shifted":""}${isActive?" active":""}${isTarget?" target":""}">
    ${bases.length?`<span class="jshiftbadge">Shift stack · ${bases.length+1} cards</span>`:""}
    <button class="jcardremove" data-jremove="${esc(f)}" data-jside="${side}" aria-label="Remove ${esc(c.f)}">×</button>
    <img src="${esc(cImg(c))}" alt="${esc(c.f)}" loading="lazy"><strong>${esc(c.f)}</strong>
    <div class="jcardroles">
      <button class="${isActive?"on":""}" data-jrole="active" data-jside="${side}" data-jf="${esc(f)}">Activating</button>
      <button class="${isTarget?"on":""}" data-jrole="target" data-jside="${side}" data-jf="${esc(f)}">Target</button>
    </div><div class="jcardtools"><button data-jshift="${esc(f)}" data-jside="${side}">${bases.length?"＋ Another base":"＋ Shift base"}</button></div></div>`;
}
function jInkZone(side){
  const ink=JCASE.ink[side],ready=ink.total-ink.exerted,pct=ink.total?Math.round(ready/ink.total*100):0;
  return `<aside class="jinkwell"><h4>Inkwell</h4><div class="jinkcount">${ready} <span>ready / ${ink.total} total</span></div>
    <div class="jinkbar" aria-hidden="true"><i style="width:${pct}%"></i></div><div class="jinkbuttons">
      <button data-jink="add" data-jside="${side}"${ink.total>=20?" disabled":""}>＋ Ink</button>
      <button data-jink="remove" data-jside="${side}"${!ink.total?" disabled":""}>− Ink</button>
      <button data-jink="exert" data-jside="${side}"${ready<=0?" disabled":""}>Exert 1</button>
      <button data-jink="ready" data-jside="${side}"${ink.exerted<=0?" disabled":""}>Ready 1</button>
    </div></aside>`;
}
function jTableZone(side,label){
  const cards=JCASE[side];
  return `<section class="jzone ${side}"><div class="jzonelabel"><span>${esc(label)}</span><span>${cards.length}/6 cards</span></div>
    <div class="jboardrow"><div class="jfield">${cards.map(f=>jCaseCard(side,f)).join("")}
      ${cards.length<6?`<button class="jaddcard" data-jadd="${side}">＋<br>Add card</button>`:""}
      ${!cards.length?`<span class="jempty">Select the cards involved in the play</span>`:""}</div>${jInkZone(side)}</div></section>`;
}
/* The rules list used to be one buried "Browse common rules instead" link
   under the board-building tool — but board-building is the SLOWER path
   (add every card, mark activating/target, THEN get a ruling), and most
   questions are answered faster by just reading the summary for "who can I
   challenge" or the keyword itself. So the rules list is the default view
   now, and building the actual board state is the thing you opt into, under
   its own clearly-labelled Advanced section, for the interactions that
   genuinely need it (a specific card's ruling in a specific board state). */
/* The home screen is a menu, not a wall of content — search up top, then two
   clear doors: skim every summarized rule, or build the actual board state
   for a specific interaction. Advanced used to be the last thing on a long
   scrolling list of rules; now it's one tap away, same as Basic. */
function jHomeMenu(){
  return `<div class="jintro"><span class="ji">⚖️</span><span><b>Find the exact card or situation</b>Search card names, printed text, keywords, and the full text of published rulings.${JSTANDALONE?"":" Scores stay locked until you return."}</span></div>
    <div class="jgroup"><h3>Or browse</h3>
    <button class="jhit" data-jbrowse="1">
      <span class="ji">📖</span><span><b>Basic rulings and corrections</b>
        <span>Keywords, timing, and every summarized rule on this site</span></span></button>
    <button class="jhit" data-jadvanced="1">
      <span class="ji">🛠️</span><span><b>Advanced</b>
        <span>Build the exact board state for a specific interaction</span></span></button>
  </div>`;
}
function jAdvanced(){
  return `<button class="jback" data-jback="1">← Back</button>
    <div class="jadvhd"><b>Advanced</b> — build the exact board state for a specific interaction</div>
    <div class="jsteps"><span><i>1</i>Build the table</span><b></b><span><i>2</i>Mark the action</span><b></b><span><i>3</i>Get the ruling</span></div>
    <div class="jtable">
      ${jTableZone("them","Their field")}
      <div class="jaction"><label for="jcaseq">What is happening?</label>
        <input id="jcaseq" value="${esc(JCASE.question)}" placeholder="Example: This character challenged mine—does its ability trigger?">
        <button class="jcasego" data-jcase="1"${JCASE.active?"":" disabled"}>${JCASE.active?"Review interaction and find ruling":"Mark the activating card to continue"}</button>
      </div>
      ${jTableZone("you","Your field")}
    </div>
    <div class="jnote">Add only the cards involved. Mark the card whose ability or action started the question as <b>Activating</b>, and mark a chosen or challenged card as the <b>Target</b>.</div>`;
}
function jPicker(side,under){
  const q=$("jq")?$("jq").value:"",r=judgeFind(q);
  const cards=r?r.cards:[];
  return `<button class="jback" data-jback="1">← Back to the table</button>
    <div class="jpickerintro"><b>${under?"Choose the Shift base underneath":"Add a card to "+(side==="them"?"their":"your")+" field"}</b><br>
      ${q?`${cards.length} matching card${cards.length===1?"":"s"}`:"Use the search box above to find it by name or card text."}</div>
    ${cards.length?`<div class="jgroup"><h3>Cards</h3>${cards.map(x=>{const c=x.c;return `<button class="jhit" data-jpick="${esc(c.f)}" data-jside="${side}"${under?` data-junder="${esc(under)}"`:""}>
      <img src="${esc(cImg(c))}" alt="" loading="lazy"><span><b>${esc(c.f)}</b><span>${esc(c.ty)}${c.co.length?" · "+esc(c.co.join("/")):""}</span></span></button>`}).join("")}</div>`:""}`;
}
function jCaseEntry(key){
  if(!key)return null;const cut=key.indexOf("|");
  return {side:key.slice(0,cut),card:CARDS.find(c=>c.f===key.slice(cut+1))};
}
function jCaseRuling(){
  const a=jCaseEntry(JCASE.active),t=jCaseEntry(JCASE.target);
  if(!a||!a.card)return `<button class="jback" data-jback="1">← Back to the table</button><div class="jnote">Choose the activating card first.</div>`;
  const c=a.card,names=kwOnCard(c),aBases=JCASE.under[JCASE.active]||[],tBases=JCASE.under[JCASE.target]||[];
  const related=RULES.filter(r=>(r.see||[]).some(k=>names.includes(k))||((aBases.length||tBases.length)&&r.id==="shiftzone")).slice(0,4);
  return `<button class="jback" data-jback="1">← Adjust the table</button>
    <div class="jintro"><span class="ji">⚖️</span><span><b>Interaction to review</b>The activating card is the starting point. Use its printed text, official rulings, and the linked Comprehensive Rules below.</span></div>
    <div class="jcasecontext"><div><b>Activating</b>${esc(c.f)}${aBases.length?` shifted over ${esc(aBases.join(" + "))}`:""} · ${a.side==="them"?"their field":"your field"}</div>
      <div><b>Target</b>${t&&t.card?esc(t.card.f)+(tBases.length?` shifted over ${esc(tBases.join(" + "))}`:"")+" · "+(t.side==="them"?"their field":"your field"):"No target marked"}</div>
      <div><b>Your ink</b>${JCASE.ink.you.total-JCASE.ink.you.exerted} ready / ${JCASE.ink.you.total} total</div>
      <div><b>Their ink</b>${JCASE.ink.them.total-JCASE.ink.them.exerted} ready / ${JCASE.ink.them.total} total</div></div>
    ${JCASE.question?`<div class="jrule"><h4>Table question</h4><p>${esc(JCASE.question)}</p></div>`:""}
    <div class="jrule official"><h4>${esc(c.f)}</h4>${c.tx?`<div class="jtext">${kwMarkup(c.tx,names)}</div>`:`<p>This card has no rules text.</p>`}
      <div class="jsrc">Printed card text — read this literally before applying summaries.</div></div>
    ${(c.ru||[]).length?`<div class="jgroup"><h3>Official rulings for this card</h3>${c.ru.map(r=>`<div class="jrule official"><p class="jq">${esc(r.q)}</p><p>${esc(r.a)}</p><div class="jsrc">Official Ravensburger ruling${r.s?" · "+esc(r.s):""} · ${officialSource("Open source",officialSourceUrl(r.s))}</div></div>`).join("")}</div>`:`<div class="jnote">No card-specific official ruling has been published. Use the printed text and linked rules; in a sanctioned event, call a judge.</div>`}
    ${names.length?`<div class="jgroup"><h3>Keywords on the activating card</h3><div class="jseeaslo">${names.map(k=>`<button data-jkw="${esc(k)}">${esc(k)} →</button>`).join("")}</div></div>`:""}
    ${related.length?`<div class="jgroup"><h3>Rules to check</h3>${related.map(r=>jRuleRow(r)+jCites(r)).join("")}</div>`:""}
    ${jResolved()}${jFoot()}`;
}

function jHome(){
  const q=$("jq")?$("jq").value:"";
  const r=judgeFind(q);
  if(r&&(r.kws.length||r.rules.length||r.cards.length)){
    const total=r.kws.length+r.rules.length+r.cards.length;
    const ambiguity=r.exact.length!==1&&r.cards.length>1?`<div class="jambig"><b>${r.exact.length?"More than one exact card matched.":"A few things could match."}</b> Check the subtitle, ink and card text before relying on a ruling.</div>`:"";
    return `<div class="jcount">${total} result${total===1?"":"s"} · official-ruling matches are included</div>${ambiguity}`+(r.kws.length?`<div class="jgroup"><h3>Keywords</h3>${
        r.kws.map(k=>`<button class="jhit" data-jkw="${esc(k)}">
          <span class="ji">🔑</span><span><b>${esc(k)}</b><span>Keyword</span></span></button>`).join("")}</div>`:"")
      +(r.rules.length?`<div class="jgroup"><h3>Rules</h3>${
        r.rules.map(x=>jRuleRow(x)).join("")}</div>`:"")
      +(r.cards.length?`<div class="jgroup"><h3>Cards</h3>${
        r.cards.map(x=>{const c=x.c;return `<button class="jhit" data-jcard="${esc(c.f)}">
          <img src="${esc(cImg(c))}" alt="" loading="lazy">
          <span><b>${esc(c.n)}${c.v?" – "+esc(c.v):""}</b>
          <span>${esc(x.reason)} · ${esc(c.ty)}${c.co.length?" · "+esc(c.co.join("/")):""}${
            (c.ru||[]).length?" · "+c.ru.length+" official ruling"+(c.ru.length>1?"s":""):""}</span></span>
        </button>`}).join("")}</div>`:"")
      +jFoot();
  }
  if(r)return `<div class="jnote">Nothing matched “${esc(q)}”. Try a keyword (Ward, Shift),
    a card name, or what happened (“drew an extra card”).</div>`+jHomeMenu()+jFoot();
  return jHomeMenu();
}
function jRuleRow(x){
  return `<button class="jhit" data-jrule="${esc(x.id)}">
    <span class="ji">${x.pc?"⚠️":"📖"}</span>
    <span><b>${esc(x.t)}</b><span>${esc(x.s)}</span></span></button>`;
}
function jHomeList(){
  return `<div class="jintro"><span class="ji">⚖️</span><span><b>Find the exact card or situation</b>Search card names, printed text, keywords, and the full text of published rulings.${JSTANDALONE?"":" Scores stay locked until you return."}</span></div>`+RULE_GROUPS.map(g=>`<div class="jgroup"><h3>${esc(g)}</h3>${
    RULES.filter(r=>r.g===g).map(jRuleRow).join("")}</div>`).join("");
}
function jFoot(){
  return `<div class="jsources">${officialSource("Comprehensive Rules "+CR_VERSION,OFFICIAL_RULES_URL)}${officialSource("All official documents",OFFICIAL_RESOURCES_URL)}</div><div class="jnote">These are plain-English summaries written to settle a
    table argument quickly. The Comprehensive Rules and Ravensburger's own set release
    notes are the authority — if a summary and the official text disagree, the official
    text is right. In a sanctioned event, call a judge.</div>`;
}

/* ---- a card, opened -------------------------------------------------------
   The card is the index. Every keyword printed on it is a button, because the
   thing being argued about is nearly always a word on the card in front of
   you, and the alternative is asking somebody to go and find it in a list. */
function kwOnCard(c){
  const out=[];
  for(const k of (c.kw||[])){
    const name=Array.isArray(k)?k[0]:k;
    if(!name)continue;
    if(KWRULES[name]||SHIFTLIKE.test(name))out.push(name);
  }
  /* Some keywords are only in the text (Sing Together lives in the song's
     line, not in the keyword list on every printing). */
  for(const k of Object.keys(KWRULES))
    if(!out.includes(k)&&new RegExp("\\b"+k.replace(/ /g,"\\s")+"\\b").test(c.tx||""))out.push(k);
  return out;
}
/* Escape FIRST, then wrap. Doing it the other way round means a card whose
   name contains an angle bracket writes markup into the page. */
function kwMarkup(text,names){
  let h=esc(text||"");
  const uniq=[...new Set(names)].sort((a,b)=>b.length-a.length);
  for(const k of uniq){
    const re=new RegExp("(^|[^A-Za-z])("+esc(k).replace(/ /g,"\\s")+")(?![A-Za-z])","g");
    h=h.replace(re,(m,pre,word)=>pre+'\u0001'+word+'\u0002');
  }
  return h.replace(/\u0001([^\u0002]+)\u0002/g,(m,w)=>
    `<button class="kwlink" data-jkw="${esc(w.replace(/\s+/g," "))}">${w}</button>`);
}
function jCard(f){
  const c=CARDS.find(x=>x.f===f);
  if(!c)return `<button class="jback" data-jback="1">← Back</button>
    <div class="jnote">That card isn't in the database any more.</div>`;
  const names=kwOnCard(c);
  const stats=[["c","Cost",c.c],["st","¤",c.st],["wi","⛉",c.wi],["lo","◊",c.lo]]
    .filter(x=>x[2]!=null&&x[2]!==undefined);
  return `<button class="jback" data-jback="1">← Back</button>
  <div class="jcard">
    <img src="${esc(cImgL(c))}" alt="${esc(c.f)}">
    <div>
      <h1>${esc(c.n)}</h1>
      ${c.v?`<div class="jv">${esc(c.v)}</div>`:""}
      <div class="jv">${esc(c.ty)}${c.sub.length?" — "+esc(c.sub.join(", ")):""} ·
        ${esc(c.co.join("/"))} · ${c.ik?"Inkable":"Not inkable"} · ${esc(c.r)} · ${esc(c.sn)}</div>
      <div class="jstats">${stats.map(s=>`<div><b>${s[2]}</b><i>${esc(s[1])}</i></div>`).join("")}</div>
      ${c.tx?`<div class="jtext">${kwMarkup(c.tx,names)}</div>`:
        `<div class="jnote">This card has no rules text.</div>`}
      ${names.length?`<div class="jseeaslo">${names.map(k=>
        `<button data-jkw="${esc(k)}">${esc(k)} →</button>`).join("")}</div>`:""}
      ${(c.ru||[]).length?`<div class="jgroup"><h3>Official rulings — ${c.ru.length}</h3>${
        c.ru.map(r=>`<div class="jrule official">
          <p class="jq">${esc(r.q)}</p><p>${esc(r.a)}</p>
          <div class="jsrc">Official Ravensburger ruling${r.s?" · "+esc(r.s):""} · ${officialSource("Open source",officialSourceUrl(r.s))}</div></div>`).join("")}</div>`:""}
      ${(c.rsi||[]).length?`<div class="jgroup"><h3>Ready Set Ink notes</h3>${
        c.rsi.map(r=>`<div class="jrule rsi"><p>${esc(r.t||"")}</p>
          <div class="jsrc">Our note, not an official ruling${r.src?" — "+esc(r.src):""}</div>
        </div>`).join("")}</div>`:""}
      ${!(c.ru||[]).length?`<div class="jnote">No official ruling has been published for this
        card. That means the card's own text is all there is — read it literally, and in an
        event, call a judge rather than settling it from memory.</div>`:""}
      ${jResolved()}
    </div>
  </div>`;
}

/* ---- a keyword ----------------------------------------------------------- */
function jKw(k){
  const lines=KWRULES[k];
  const shift=!lines&&SHIFTLIKE.test(k);
  const seen=CARDS.filter(c=>(c.kw||[]).some(x=>(Array.isArray(x)?x[0]:x)===k)).length;
  const body=lines?lines.map(x=>`<p>${esc(x)}</p>`).join("")
    :shift?`<p>This is a Shift variant: it works exactly like Shift, but the character it can
        be played on top of is restricted to the kind named in the keyword rather than to a
        character with the same name.</p>
       <p>Read the card's own reminder text for the exact restriction — it is printed there.</p>`
    :`<p>We don't publish a summary for this keyword, because a summary we weren't sure of
        would be worse than none while somebody is holding a match.</p>
      <p>Read the reminder text printed on the card itself, and if that doesn't settle it,
        call a judge or check the Comprehensive Rules.</p>`;
  const rule=RULES.find(r=>(r.see||[]).includes(k));
  return `<button class="jback" data-jback="1">← Back</button>
  <div class="jrule"><h4>${esc(k)}</h4>${body}
    <div class="jsrc">${seen?seen+" cards have this keyword. ":""}Summary — the card's printed
      reminder text and the Comprehensive Rules are the authority.</div></div>
  ${rule?`<div class="jseeaslo"><button data-jrule="${esc(rule.id)}">${esc(rule.t)} →</button></div>`:""}
  ${rule?jCites(rule):""}${jResolved()}
  ${jFoot()}`;
}

/* ---- a rule -------------------------------------------------------------- */
function jRule(id){
  const r=RULEBY(id);
  if(!r)return `<button class="jback" data-jback="1">← Back</button>`;
  const links=(r.see||[]).map(k=>KWRULES[k]
    ?`<button data-jkw="${esc(k)}">${esc(k)} →</button>`
    :RULEBY(k)?`<button data-jrule="${esc(k)}">${esc(RULEBY(k).t)} →</button>`:"").join("");
  return `<button class="jback" data-jback="1">← Back</button>
  <div class="jrule${r.pc?"":" official"}">
    <h4>${r.pc?"⚠️ ":""}${esc(r.t)}</h4>
    ${r.b.map(x=>`<p>${esc(x)}</p>`).join("")}
    ${r.pc?`<div class="jsrc">This is what usually happens, not the official penalty.
      Ravensburger's Play Corrections Guide is the authority at a sanctioned event, and a
      judge applies it — we deliberately don't paraphrase it here.</div>`
     :`<div class="jsrc">Summary — the Comprehensive Rules are the authority.</div>`}
  </div>
  ${jCites(r)}
  ${links?`<div class="jseeaslo">${links}</div>`:""}
  ${jResolved()}${jFoot()}`;
}

