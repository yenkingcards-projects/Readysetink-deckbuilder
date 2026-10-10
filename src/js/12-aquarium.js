/* ===================== Blue Striped Fish Aquarium =====================
   An idle tank. He swims with a wandering heading rather than bouncing off the
   walls like a screensaver, flips to face the way he's going, and drifts toward
   food when it appears. Dust accrues per second of watching, which is the whole
   deal — you're paid to leave him alone. */
let AQ=null,AQESC=null;
function stopAqua(){
  if(AQESC){document.removeEventListener("keydown",AQESC);AQESC=null}
  document.body.classList.remove("fffaux");
  {const g=$("ffgame");if(g)g.classList.remove("faux")}
  if(AQ){
  if(AQ.raf)cancelAnimationFrame(AQ.raf);
  clearInterval(AQ.tick);clearInterval(AQ.drop);clearInterval(AQ.bub);
  clearTimeout(AQ.idleTimer);
  /* The effect loops fire every 70–500ms. Left running they keep appending
     particles to a node that is no longer on the page — invisible, but it
     never stops. */
  (AQ.fx||[]).forEach(clearInterval);
  if(AQ.zEnd)try{AQ.zEnd()}catch(e){}
  AQ.raf=null}AQ=null}
const AQKEY="fs3_aqua",FFXKEY="fs3_ffx";
/* One AudioContext for the whole session. Browsers cap how many a page may
   hold, and renderAqua() runs again every time you open the tank. */
let ZAC=null;
/* Card effects for Feed Flounder — bought with dust, worn on the Flounder card
   while you play. Cosmetic only, like titles, which is why they can live in
   localStorage. Several can run at once; that's the fun of it.

   Priced so the cheap two are an hour's play and Abyss is something you work
   towards. Ordered by cost so the shop reads as a ladder. */
const FFX=[
 {id:"bubbles",  l:"Bubble Stream", c:50,   d:"A steady rise of bubbles off the card."},
 {id:"water",    l:"Water Ripple",  c:120,  d:"Light dances across it as you swim."},
 {id:"shimmer",  l:"Shimmer",       c:300,  d:"A foil sweep and a scatter of glints."},
 {id:"sapphire", l:"Sapphire Glow", c:600,  d:"Deep blue light pulsing at the edges."},
 {id:"sparkles", l:"Comet Trail",   c:1200, d:"Stars stream off you as you move. Turn hard for a burst."},
 {id:"legendary",l:"Legendary Foil",c:2500, d:"Full rainbow foil. Everyone can see it."},
 {id:"abyss",    l:"Abyss",         c:5000, d:"Something purple and wrong follows you around."},
 /* These two are the first FFX pair that touch more than a glow layer —
    Magnetic Pull genuinely reels food in, and Zombie Mode stops being an
    effect at all — it swaps the whole game out for waves. Still opt-in, and
    dust is still earned at the same seam either way. */
 {id:"magnet",   l:"Magnetic Pull",  c:20000, d:"Food drifts toward you from across the tank."},
 {id:"zombie",   l:"Zombie Mode",    c:100000,
  d:"Not an effect — a mode. The food stops, the tank pulls back and they come in waves. "
   +"Blades orbit you, brains buy upgrades between waves, and dust still counts."}];
const ffxLoad=()=>{const v=load(FFXKEY,{owned:[],active:[]});
  return {owned:v.owned||[],active:v.active||[]}};
function renderAqua(){
  stopAqua();
  const st=load(AQKEY,{secs:0,fed:0,coco:0});
  $("aquapage").innerHTML=`<div class="page">
    <button class="btn" id="aqExit" style="margin-bottom:12px">← Other</button>
    <h1><span class="gi">🐠</span>Feed Flounder</h1>
    <p class="lede">Move your mouse or finger and he swims after it. Eat fish food, earn dust —
      that's it. Potatoes are worth ten and make him chonky; coconuts are worth twenty-five
      and bonk him.</p>
    <div class="ffgame" id="ffgame">
      <div class="ffhud"><span class="ffdusti"></span>Dust <b id="ffdust">0</b></div>
      <div class="fftitle"><h2>FEED FLOUNDER</h2><p>eat fish food. earn dust. that's it.</p></div>
      <div class="ffcard" id="ffcard"></div>
      <div class="ffhint" id="ffhint">Move your finger or mouse to swim</div>
      <div class="ffpause" id="ffpause">Paused — tap the water to keep swimming</div>
      <div class="ffweed s1"></div><div class="ffweed s2"></div>
      <div class="ffweed s3"></div><div class="ffweed s4"></div>

      <!-- EVERYTHING THE GAME NEEDS IS INSIDE THE GAME.
           The shop and the run stats used to be blocks on the page underneath
           the tank. Two things wrong with that. Spending dust meant leaving the
           thing you earned it in and scrolling — so most people never found the
           effects at all. And in full screen the tank IS the page, so the shop
           simply did not exist: the one mode where you are most likely to sit
           and play was the one mode where you could not spend anything.
           Both are children of #ffgame now, so full screen carries them. -->
      <div class="ffbar">
        <button class="ffib" id="aqShop" title="Card effects">🛍️ <span>Effects</span></button>
        <button class="ffib" id="aqFull" title="Full screen">⛶ <span>Full screen</span></button>
      </div>
      <div class="ffstats">
        <span><b id="aqFed">${N(st.fed)}</b> fed</span>
        <span><b id="aqCoco">${N(st.coco||0)}</b> coconuts</span>
        <span><b id="aqDust">0</b> dust this visit</span>
      </div>
      <div class="ffdraw" id="ffdraw" hidden>
        <div class="ffdh">
          <b>Card effects</b>
          <span>Bought with dust, worn on the card while you play. Stack as many as you like.</span>
          <button class="ffx2" id="aqShopX" title="Close">✕</button>
        </div>
        <div class="ffshop" id="ffshop"></div>
      </div>
    </div>
    ${leaderboard("aqua")}
  </div>`;
  const ex=$("aqExit");
  if(ex)ex.onclick=()=>{stopAqua();OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};

  const game=$("ffgame"),card=$("ffcard"),dustEl=$("ffdust"),hint=$("ffhint");
  if(!game||!card)return;

  /* ---- the shop drawer -------------------------------------------------
     Opens over the water. The fish keeps swimming behind it, which is the
     whole reason it is a drawer and not a page. */
  const draw=$("ffdraw"),shopBtn=$("aqShop");
  const setShop=on=>{
    if(!draw)return;
    draw.hidden=!on;
    if(shopBtn)shopBtn.classList.toggle("on",on);
    if(on&&AQ.paintFX)AQ.paintFX();     // prices depend on a balance that moves
  };
  if(shopBtn)shopBtn.onclick=()=>setShop(draw.hidden);
  {const x=$("aqShopX");if(x)x.onclick=()=>setShop(false)}

  /* ---- full screen -----------------------------------------------------
     Two things worth knowing. The real Fullscreen API is used where it exists.
     iOS Safari does NOT implement it for anything but a <video>, so on iPhone
     the button used to just say "your browser won't allow it" — on the device
     most likely to be used for a game you leave running. The fallback pins the
     tank over the whole viewport with CSS instead, which is not the same thing
     but looks identical to the person holding the phone. */
  const fsBtn=$("aqFull");
  const inFS=()=>!!(document.fullscreenElement||document.webkitFullscreenElement)
    ||game.classList.contains("faux");
  const paintFS=()=>{
    if(!fsBtn)return;
    const on=inFS();
    fsBtn.innerHTML=(on?"⤢":"⛶")+" <span>"+(on?"Exit full screen":"Full screen")+"</span>";
    fsBtn.classList.toggle("on",on);
    document.body.classList.toggle("fffaux",game.classList.contains("faux"));
  };
  const leaveFaux=()=>{game.classList.remove("faux");paintFS()};
  if(fsBtn)fsBtn.onclick=()=>{
    if(document.fullscreenElement||document.webkitFullscreenElement){
      (document.exitFullscreen||document.webkitExitFullscreen).call(document);return}
    if(game.classList.contains("faux")){leaveFaux();return}
    const go=game.requestFullscreen||game.webkitRequestFullscreen;
    if(go){
      Promise.resolve(go.call(game)).catch(()=>{game.classList.add("faux");paintFS()});
    }else{
      game.classList.add("faux");paintFS();
      toast("Full screen isn't available here — filling the window instead");
    }
    setTimeout(paintFS,60);
  };
  document.onfullscreenchange=paintFS;
  /* Esc gets you out of the CSS version too, because that is what Esc means. */
  AQESC=e=>{if(e.key==="Escape"&&game.classList.contains("faux"))leaveFaux()};
  document.addEventListener("keydown",AQESC);
  paintFS();

  /* Everything below is Ben's Feed Flounder, moved off the viewport and onto
     the tank element: the original read innerWidth/innerHeight because it was
     its own page. R() is the live box, so full screen just makes it bigger.

     The one real change is dust. The standalone game kept its own counter in
     localStorage under feedFlounderDust; here it goes through dustGain(), the
     single seam every other game already uses, so it lands in the same balance
     as everything else and respects the Dust switch in Settings. */
  const R=()=>game.getBoundingClientRect();
  const r0=R();
  const pos={x:r0.width/2,y:r0.height*.55},target={...pos},vel={x:0,y:0},foods=[];
  let started=false,chonkyUntil=0,bonkUntil=0,visit=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  AQ={raf:null,st,earn:0};

  /* FFX setup lives here, ahead of spawnFood() and frame() below, because both
     read on() — spawnFood() needs to know about Zombie Mode from its very
     first (synchronous) call, before anything async has had a chance to run. */
  FFX.forEach(x=>{const l=document.createElement("div");
    l.className="ff2-layer ff2-"+x.id;card.appendChild(l)});
  /* The swords ring is real markup, not a CSS-only layer like the others —
     it needs six children at fixed angles, not one div a class can light up. */
  {const sw=document.createElement("div");sw.className="ffswords";
    for(let i=0;i<6;i++){const s=document.createElement("span");
      s.style.setProperty("--a",(i*60)+"deg");s.textContent="⚔️";sw.appendChild(s)}
    card.appendChild(sw)}
  /* Cached rather than re-reading (and JSON.parsing) localStorage from inside
     the 60fps frame() loop and from every 70–500ms effect tick — on() used to
     do exactly that, dozens of times a second, which is exactly the kind of
     thing that reads as "buggy" on a phone rather than a desktop. Refreshed
     wherever ownership actually changes, in paintFX(). */
  let activeFX=new Set(ffxLoad().active);
  const on=id=>activeFX.has(id);

  /* Two-second idle pause. Nothing on a phone was actually blocking the ffbar
     buttons from receiving their own tap — but the whole tank captures every
     pointer event that lands on it (see the chrome check below for the other
     half of that), and on mobile it is very easy for a tap to read as a tiny
     drag, which kept re-aiming Flounder at exactly the moment somebody was
     trying to hit Full screen or Effects instead. Stepping out of the way
     after a couple of quiet seconds — and only resuming once the water
     itself is touched again — means the UI is never fighting an animation
     that is still hungry for input. */
  let idle=false;
  const wake=()=>{
    if(idle){idle=false;game.classList.remove("ffidle");game.style.touchAction="none"}
    clearTimeout(AQ.idleTimer);
    AQ.idleTimer=setTimeout(()=>{
      idle=true;game.classList.add("ffidle");
      /* pan-y rather than auto: a stray touch after 2 seconds of nobody
         playing scrolls the page like anywhere else instead of being eaten
         by a game nobody is currently engaged with. The very next touch on
         the water calls wake() and this snaps straight back to none. */
      game.style.touchAction="pan-y"},2000)};
  function setTarget(cx,cy){
    const r=R();
    target.x=clamp(cx-r.left,50,r.width-50);
    target.y=clamp(cy-r.top,40,r.height-46);
    if(!started){started=true;hint.classList.add("hide")}
    wake()}
  /* Chrome — the ffbar and the shop drawer — is a child of #ffgame so it
     rides along into full screen, but that means a tap on it also lands on
     the container these listeners are bound to. Without this check, opening
     Effects or hitting Full screen always ALSO yanked Flounder to that
     corner of the screen first. */
  const onChrome=t=>!!(t&&t.closest&&t.closest(".ffbar,.ffdraw"));
  game.onpointermove=e=>{if(!onChrome(e.target))setTarget(e.clientX,e.clientY)};
  game.onpointerdown=e=>{if(!onChrome(e.target))setTarget(e.clientX,e.clientY)};
  game.ontouchmove=e=>{if(onChrome(e.target))return;const t=e.touches[0];if(t)setTarget(t.clientX,t.clientY)};
  wake();   // start the 2s countdown immediately — nobody's touched it yet either

  const chooseType=()=>{const q=Math.random();
    return q<.01?"coconut":q<.04?"potato":q<.12?"rare":"pellet"};
  function spawnFood(){
    if(!AQ||foods.length>=14)return;
    if(Z)return;                           // zombie mode: waves instead of food
    const r=R(),type=chooseType(),el=document.createElement("div");
    /* Zombie Mode reskins every type to the same 🧟 rather than a
       zombie-potato and a zombie-coconut — the type still decides what it's
       worth, this is only ever what it looks like. */
    if(on("zombie")){el.className="ffood zombie";el.textContent="🧟"}
    else{
      el.className="ffood "+(type==="rare"?"pellet rare":type==="pellet"?"pellet":type);
      if(type==="potato")el.textContent="🥔";
      if(type==="coconut")el.textContent="🥥";
    }
    const f={el,type,x:26+Math.random()*Math.max(40,r.width-52),
      y:60+Math.random()*Math.max(40,r.height-120),
      phase:Math.random()*Math.PI*2,drift:.18+Math.random()*.28,spin:(Math.random()-.5)*1.6};
    el.style.left=f.x+"px";el.style.top=f.y+"px";game.appendChild(el);foods.push(f);}

  function eat(i){
    const f=foods[i];
    const value=f.type==="coconut"?25:f.type==="potato"?10:f.type==="rare"?10:1;
    const got=dustGain(value);                    // the shared balance
    visit+=got;AQ.earn=visit;
    dustEl.textContent=N(DUST.bal);
    const d=$("aqDust");if(d)d.textContent=N(visit);
    st.fed=(st.fed||0)+1;
    if(f.type==="coconut")st.coco=(st.coco||0)+1;
    save(AQKEY,st);
    const fe=$("aqFed"),ce=$("aqCoco");
    if(fe)fe.textContent=N(st.fed);
    if(ce)ce.textContent=N(st.coco||0);
    if(st.fed>=25)unlockHidden("h_aqua");
    if(AQ.paintFX)AQ.paintFX();
    const pop=document.createElement("div");
    pop.className="ffpop"+((f.type==="potato"||f.type==="coconut")?" special":"");
    pop.textContent=f.type==="coconut"?"BONK! +25 Dust"
      :f.type==="potato"?"POTATO! +10 Dust":"+"+value+" Dust";
    pop.style.left=f.x+"px";pop.style.top=f.y+"px";
    game.appendChild(pop);setTimeout(()=>pop.remove(),720);
    if(f.type==="potato")chonkyUntil=performance.now()+4000;
    if(f.type==="coconut")bonkUntil=performance.now()+450;
    f.el.remove();foods.splice(i,1);
    if(navigator.vibrate)navigator.vibrate(f.type==="coconut"?[35,30,35]
      :f.type==="potato"?[25,20,25]:f.type==="rare"?[20,25,20]:18);
    setTimeout(spawnFood,250+Math.random()*700);}

  function bubble(){
    if(!AQ)return;
    const r=R(),b=document.createElement("div");
    b.className="ffbub";const sz=4+Math.random()*13;
    b.style.width=b.style.height=sz+"px";
    b.style.left=Math.random()*r.width+"px";b.style.top=(r.height+20)+"px";
    game.appendChild(b);
    const dur=5000+Math.random()*5500,start=performance.now();
    (function up(t){
      if(!AQ){b.remove();return}
      const q=(t-start)/dur;if(q>=1){b.remove();return}
      b.style.transform=`translate(${Math.sin(q*10)*18}px,${-q*(r.height+100)}px)`;
      b.style.opacity=String(1-q);requestAnimationFrame(up)})(start);}

  /* ==================== ZOMBIE MODE ====================
     Wearing Zombie Mode stops being a reskin here and becomes the mode: the
     food stops, the tank pulls back, and waves come at you while rings of
     blades turn around Flounder.

     Two currencies on purpose — brains are the run's own money and reset when
     you die, dust is the site's and is kept — so this economy can be tuned
     hard without touching the balance every other page shares.

     Everything lives in Z and is torn down by zEnd(); the blades, the drops
     and the zombies are children of the TANK, so nothing is boxed in by the
     card the way the old sword ring was. */
  const ZUPG=[
   {id:"blades",l:"Another blade",  d:"One more sword in the outer ring.",   base:8, step:7, max:9},
   {id:"inner", l:"Inner ring",     d:"A second ring, turning the other way.",base:22,step:16,max:5},
   {id:"reach", l:"Longer reach",   d:"The rings turn wider.",               base:9, step:7, max:8},
   {id:"speed", l:"Faster spin",    d:"The rings turn quicker.",             base:9, step:7, max:8},
   {id:"edge",  l:"Sharper edge",   d:"Blades cut from further out.",        base:11,step:8, max:6},
   {id:"scales",l:"Thicker scales", d:"One more heart, and heal one now.",   base:16,step:13,max:6},
   {id:"slick", l:"Chum slick",     d:"They swim at you more slowly.",       base:13,step:11,max:5},
   {id:"luck",  l:"Low tide",       d:"More of them drop something useful.", base:18,step:15,max:5},
  ];
  /* Three shapes of threat, drawn per wave. Shamblers are the wave, runners
     punish standing still, brutes have to be worked at. A boss every fifth. */
  const ZKIND=[
   {e:"🧟",   hp:1,sp:1.00,w:66},
   {e:"🧟‍♀️",hp:1,sp:1.70,w:22},
   {e:"🧟‍♂️",hp:3,sp:.66,w:12},
  ];
  const ZBOSS=["The Bloated One","Deep Thing","Old Barnacle","The Drowned King","Leviathan"];
  /* Drops. Four, each answering a different way a run goes wrong: out of
     health, out of room, out of time, out of money. */
  const ZPICK=[
   {id:"heal", e:"🩸",w:26,t:"+1 heart"},
   {id:"rage", e:"⚡",w:28,t:"FRENZY!"},
   {id:"boom", e:"💥",w:20,t:"SHOCKWAVE!"},
   {id:"gold", e:"⭐",w:26,t:"TRIPLE BRAINS!"},
  ];
  const zCost=(u,lv)=>u.base+u.step*lv;
  let Z=null;
  const zOn=()=>on("zombie");

  /* ---- sound ----------------------------------------------------------
     Tiny WebAudio blips rather than files: nothing to download, nothing to
     host, and the pitch can follow the combo, which is most of why kills
     feel good. The context is created on the first click of "send the next
     wave" — a real user gesture, which is what browsers require. */
  const zMuted=()=>load("fs3_zmute",false);
  function zAC(){
    if(ZAC)return ZAC;
    try{ZAC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){ZAC=null}
    return ZAC;
  }
  function zTone(freq,dur,type,gain,slideTo){
    if(zMuted())return;
    const ac=zAC();if(!ac)return;
    try{
      if(ac.state==="suspended")ac.resume().catch(()=>{});
      const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
      o.type=type||"square";o.frequency.setValueAtTime(freq,t);
      if(slideTo)o.frequency.exponentialRampToValueAtTime(Math.max(40,slideTo),t+dur);
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(gain||.05,t+.008);
      g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+dur+.03);
    }catch(e){}
  }
  const zChord=(notes,dur,type,gain)=>notes.forEach((f,i)=>setTimeout(()=>zTone(f,dur,type,gain),i*90));

  function zBuild(){
    if(Z)return;
    foods.splice(0).forEach(f=>f.el.remove());
    game.classList.add("zmode");
    const heat=document.createElement("div");heat.className="zheat";game.appendChild(heat);
    const hud=document.createElement("div");hud.className="zhud";
    hud.innerHTML=`<div class="zrow"><span>Wave</span><b id="zWave">1</b>
        <span id="zCombo" style="color:#ffd400"></span></div>
      <div class="zrow"><span class="zhp" id="zHp"></span></div>
      <div class="zrow"><span>🧠</span><b id="zBrain">0</b>
        <span id="zLeft" style="opacity:.7;font-weight:700"></span></div>
      <button class="zrow" id="zMute" style="cursor:pointer;pointer-events:auto"></button>`;
    game.appendChild(hud);
    const flash=document.createElement("div");flash.className="zflash";game.appendChild(flash);
    Z={hud,heat,flash,zombies:[],picks:[],swords:[],inner:[],panel:null,boss:null,bossEl:null,
       wave:0,hp:5,maxHp:5,brains:0,kills:0,dust:0,best:st.zwave||0,
       toSpawn:0,spawnAt:0,between:true,over:false,spin:0,
       combo:0,comboAt:0,frenzyUntil:0,goldUntil:0,lv:{}};
    ZUPG.forEach(u=>Z.lv[u.id]=0);
    const mb=$("zMute");
    const paintMute=()=>{mb.textContent=zMuted()?"🔇":"🔊"};
    mb.onclick=e=>{e.stopPropagation();save("fs3_zmute",!zMuted());paintMute()};
    paintMute();
    zSwords();zPaintHud();
    zBreather("Zombie Mode",
      "They come in waves. Blades turn around you, brains buy upgrades between rounds, "
      +"and the things they drop are worth swimming for.");
  }
  /* One element per blade, on two rings that turn opposite ways. Positions
     are written every frame from the fish's real position, so reach is a
     number that upgrades rather than a CSS inset on the card. */
  function zSwords(){
    const want=4+Z.lv.blades,want2=Z.lv.inner?1+Z.lv.inner:0;
    while(Z.swords.length>want)Z.swords.pop().remove();
    while(Z.swords.length<want){
      const el=document.createElement("div");el.className="zsword";el.textContent="⚔️";
      game.appendChild(el);Z.swords.push(el)}
    while(Z.inner.length>want2)Z.inner.pop().remove();
    while(Z.inner.length<want2){
      const el=document.createElement("div");el.className="zsword in";el.textContent="🗡️";
      game.appendChild(el);Z.inner.push(el)}
  }
  const zFrenzy=()=>performance.now()<Z.frenzyUntil;
  const zGold  =()=>performance.now()<Z.goldUntil;
  const zReach =()=>88+Z.lv.reach*17;
  const zSpeed =()=>(1.5+Z.lv.speed*.55)*(zFrenzy()?2.3:1);
  const zEdge  =()=>24+Z.lv.edge*5+(zFrenzy()?10:0);
  const zMult  =()=>Math.min(5,1+Math.floor(Z.combo/5))*(zGold()?3:1);
  const zHearts=()=>"❤️".repeat(Z.hp)+"🖤".repeat(Math.max(0,Z.maxHp-Z.hp));
  function zPaintHud(){
    const w=$("zWave"),h=$("zHp"),b=$("zBrain"),l=$("zLeft"),c=$("zCombo");
    if(w)w.textContent=String(Math.max(1,Z.wave));
    if(h)h.textContent=zHearts();
    if(b)b.textContent=N(Z.brains);
    if(l)l.textContent=Z.between?"":" · "+(Z.zombies.length+Z.toSpawn)+" left";
    if(c){const m=zMult();c.textContent=(Z.combo>=5||m>1)?" ×"+m:""}
    if(Z.heat)Z.heat.style.opacity=String(Math.min(.6,Z.wave*.035));
    game.classList.toggle("zfrenzy",zFrenzy());
    game.classList.toggle("zgold",zGold());
  }
  function zPop(x,y,text,cls){
    const el=document.createElement("div");el.className="zpop"+(cls?" "+cls:"");
    el.textContent=text;el.style.left=x+"px";el.style.top=y+"px";game.appendChild(el);
    el.animate([{transform:"translate(-50%,-50%) scale(.7)",opacity:1},
      {transform:"translate(-50%,-90%) scale(1.15)",opacity:1,offset:.25},
      {transform:"translate(-50%,-170%) scale(.9)",opacity:0}],
      {duration:820,easing:"cubic-bezier(.2,.8,.3,1)"}).onfinish=()=>el.remove();
  }
  /* An expanding ring plus a spray of bits. Two cheap elements that do most
     of the work of making a kill feel like an event. */
  function zBurst(x,y,size,colour,bits){
    const r=document.createElement("div");r.className="zring";
    r.style.left=x+"px";r.style.top=y+"px";r.style.width=r.style.height="10px";
    if(colour)r.style.borderColor=colour;
    game.appendChild(r);
    r.animate([{width:"10px",height:"10px",opacity:.9},
      {width:size+"px",height:size+"px",opacity:0}],
      {duration:420,easing:"cubic-bezier(.1,.8,.2,1)"}).onfinish=()=>r.remove();
    for(let i=0;i<(bits||0);i++){
      const b=document.createElement("div");b.className="zbit";
      b.textContent=Math.random()<.5?"🦴":"🩸";
      b.style.left=x+"px";b.style.top=y+"px";game.appendChild(b);
      const a=Math.random()*Math.PI*2,d=24+Math.random()*46;
      b.animate([{transform:"translate(-50%,-50%) scale(1)",opacity:1},
        {transform:`translate(calc(-50% + ${Math.cos(a)*d}px),calc(-50% + ${Math.sin(a)*d}px)) scale(.4)`,opacity:0}],
        {duration:520+Math.random()*260,easing:"ease-out"}).onfinish=()=>b.remove();
    }
  }
  const zShake=(hard)=>{
    const c=hard?"zquake":"zshake";
    game.classList.remove("zshake","zquake");
    void game.offsetWidth;                       // restart the animation
    game.classList.add(c);
    setTimeout(()=>game.classList.remove(c),hard?1050:280);
  };
  function zBanner(text,sub,cls){
    const el=document.createElement("div");el.className="zbanner"+(cls?" "+cls:"");
    el.innerHTML=esc(text)+(sub?`<small>${esc(sub)}</small>`:"");
    game.appendChild(el);
    el.animate([{transform:"translate(-50%,-50%) scale(.6)",opacity:0},
      {transform:"translate(-50%,-50%) scale(1.06)",opacity:1,offset:.22},
      {transform:"translate(-50%,-50%) scale(1)",opacity:1,offset:.72},
      {transform:"translate(-50%,-50%) scale(1.25)",opacity:0}],
      {duration:1700,easing:"cubic-bezier(.2,.9,.2,1)"}).onfinish=()=>el.remove();
  }
  function zPick(){
    const tot=ZKIND.reduce((a,k)=>a+k.w,0);let q=Math.random()*tot;
    for(const k of ZKIND){q-=k.w;if(q<=0)return k}
    return ZKIND[0];
  }
  function zSpawnOne(){
    const r=R(),boss=Z.wave%5===0&&Z.toSpawn===1;
    const k=boss?{e:"👹",hp:14+Z.wave*3,sp:.5}:zPick();
    const edge=Math.floor(Math.random()*4);
    const x=edge===0?-30:edge===1?r.width+30:Math.random()*r.width;
    const y=edge===2?-30:edge===3?r.height+30:Math.random()*r.height;
    const el=document.createElement("div");
    el.className="zomb"+(boss?" big":"");el.textContent=k.e;
    el.style.left=x+"px";el.style.top=y+"px";game.appendChild(el);
    const slow=1-Z.lv.slick*.09;
    /* Tuned so a wave-one shambler crosses the tank in six or seven seconds.
       The first pass was less than half this and the waves never arrived —
       you sat watching a ring turn in an empty tank. */
    const z={el,x,y,hp:k.hp,max:k.hp,boss:!!boss,
      sp:k.sp*(.88+Z.wave*.06)*slow,wob:Math.random()*Math.PI*2};
    Z.zombies.push(z);
    if(boss){
      Z.boss=z;
      const bar=document.createElement("div");bar.className="zbossbar";
      bar.innerHTML=`<div class="zbn">${esc(ZBOSS[Math.min(ZBOSS.length-1,Math.floor(Z.wave/5)-1)]||"Something Big")}</div>
        <div class="zbb"><div class="zbf"></div></div>`;
      game.appendChild(bar);Z.bossEl=bar;
      zBanner("BOSS","hold the line","boss");
      zShake(true);zChord([110,98,82],.5,"sawtooth",.09);
    }
  }
  function zStartWave(){
    Z.wave++;Z.between=false;
    /* The count and the speed both ramp, so they have to ramp gently or the
       curve is a cliff — the first cut put eleven of them on you in wave two
       and a good run was over before the first upgrade mattered. */
    Z.toSpawn=Math.min(60,4+Z.wave*2);
    Z.spawnAt=performance.now();
    const boss=Z.wave%5===0;
    zBanner("WAVE "+Z.wave,boss?"something big is coming":"",boss?"boss":"");
    zChord(boss?[196,247,294]:[262,392],.16,"square",.05);
    zPaintHud();
  }
  /* The between-waves panel and the end-of-run panel are the same element with
     different content — one place that can be on screen, so they can never
     stack on top of each other. */
  function zShut(){if(Z&&Z.panel){Z.panel.remove();Z.panel=null}}
  function zBreather(title,sub){
    zShut();Z.between=true;Z.combo=0;
    const el=document.createElement("div");el.className="zpanel";
    el.innerHTML=`<h3>${esc(title)}</h3><div class="zsub">${esc(sub)}</div>
      <div class="zgrid">${ZUPG.map(u=>{
        const lv=Z.lv[u.id],maxed=lv>=u.max,cost=zCost(u,lv);
        const can=!maxed&&Z.brains>=cost;
        return `<button class="zbuy" data-zu="${u.id}"${can?"":" disabled"}>
          <b>${esc(u.l)}</b><i>${esc(u.d)}</i>
          <span class="zlv">${maxed?"Maxed":"Level "+lv+" of "+u.max}</span>
          ${maxed?"":`<span class="zc">🧠 ${cost}</span>`}
        </button>`}).join("")}</div>
      <button class="zgo" data-zgo>Send the next wave</button>`;
    game.appendChild(el);Z.panel=el;
    el.querySelectorAll("[data-zu]").forEach(b=>b.onclick=()=>{
      const u=ZUPG.find(x=>x.id===b.dataset.zu),lv=Z.lv[u.id];
      if(lv>=u.max)return;
      const cost=zCost(u,lv);
      if(Z.brains<cost)return;
      Z.brains-=cost;Z.lv[u.id]++;
      if(u.id==="blades"||u.id==="inner")zSwords();
      if(u.id==="scales"){Z.maxHp++;Z.hp=Math.min(Z.maxHp,Z.hp+1)}
      zTone(660,.09,"triangle",.06,990);
      zPaintHud();
      zBreather(title,sub);           // redraw prices against the new balance
    });
    el.querySelector("[data-zgo]").onclick=()=>{zAC();zShut();zStartWave()};
    zPaintHud();
  }
  function zOver(){
    zShut();Z.over=true;Z.between=true;
    Z.zombies.forEach(z=>z.el.remove());Z.zombies=[];Z.toSpawn=0;
    Z.picks.forEach(pk=>pk.el.remove());Z.picks=[];
    if(Z.bossEl){Z.bossEl.remove();Z.bossEl=null}Z.boss=null;
    zChord([220,175,131,98],.34,"sawtooth",.07);
    /* Best wave is kept per device the same way every other game's best is. */
    const beat=Z.wave>(st.zwave||0);
    if(beat){st.zwave=Z.wave;save(AQKEY,st)}
    if(Z.wave>=15)unlockHidden("h_wave");
    const el=document.createElement("div");el.className="zpanel";
    el.innerHTML=`<h3>${beat?"New best — wave "+Z.wave:"They got you on wave "+Z.wave}</h3>
      <div class="zsub">${N(Z.kills)} banished · ${N(Z.dust)} dust earned${
        beat?"":" · best so far wave "+N(st.zwave||Z.wave)}.
        Brains don't carry over; the dust already has.</div>
      <button class="zgo" data-zgo>Go again</button>`;
    game.appendChild(el);Z.panel=el;
    if(beat)zBanner("NEW BEST","wave "+Z.wave,"best");
    el.querySelector("[data-zgo]").onclick=()=>{
      zShut();
      Z.wave=0;Z.hp=Z.maxHp=5;Z.brains=0;Z.kills=0;Z.dust=0;Z.over=false;
      Z.combo=0;Z.frenzyUntil=Z.goldUntil=0;
      ZUPG.forEach(u=>Z.lv[u.id]=0);zSwords();
      zBreather("Round two","Same water, same blades, nothing learned. Off you go.");
    };
  }
  function zHurt(){
    Z.hp--;Z.combo=0;zPaintHud();
    game.classList.add("zhit");setTimeout(()=>game.classList.remove("zhit"),140);
    zShake();zTone(90,.22,"sawtooth",.09,55);
    if(navigator.vibrate)navigator.vibrate([40,30,40]);
    if(Z.hp<=0)zOver();
  }
  function zDrop(x,y){
    const chance=.07+Z.lv.luck*.035;
    if(Math.random()>chance)return;
    const tot=ZPICK.reduce((a,k)=>a+k.w,0);let q=Math.random()*tot,kind=ZPICK[0];
    for(const k of ZPICK){q-=k.w;if(q<=0){kind=k;break}}
    const el=document.createElement("div");el.className="zpick";el.textContent=kind.e;
    el.style.left=x+"px";el.style.top=y+"px";game.appendChild(el);
    Z.picks.push({el,x,y,kind,die:performance.now()+11000});
  }
  function zTake(pk,i){
    pk.el.remove();Z.picks.splice(i,1);
    const k=pk.kind;
    if(k.id==="heal"){Z.hp=Math.min(Z.maxHp,Z.hp+1)}
    if(k.id==="rage"){Z.frenzyUntil=performance.now()+7000}
    if(k.id==="gold"){Z.goldUntil=performance.now()+10000}
    if(k.id==="boom"){
      zShake(true);zBurst(pos.x,pos.y,1400,"#ffd400",0);
      for(let j=Z.zombies.length-1;j>=0;j--)zKill(Z.zombies[j],j,true);
    }
    zPop(pk.x,pk.y,k.t,"big");
    zChord([523,659,784],.11,"triangle",.06);
    zPaintHud();
  }
  function zKill(z,i,quiet){
    const now=performance.now();
    Z.combo=(now-Z.comboAt<2400)?Z.combo+1:1;Z.comboAt=now;
    const mult=zMult();
    Z.kills++;
    const brains=(z.boss?14:1)*mult;
    Z.brains+=brains;
    const got=dustGain(z.boss?30:1);Z.dust+=got;visit+=got;AQ.earn=visit;
    dustEl.textContent=N(DUST.bal);
    const d=$("aqDust");if(d)d.textContent=N(visit);
    if(z.boss){
      zBurst(z.x,z.y,340,"#ffd400",14);zShake(true);
      zChord([392,330,262,196],.26,"sawtooth",.08);
      zPop(z.x,z.y,"BOSS DOWN · 🧠 "+brains,"huge");
      if(Z.bossEl){Z.bossEl.remove();Z.bossEl=null}Z.boss=null;
    }else{
      zBurst(z.x,z.y,86+mult*14,mult>1?"#ffd400":null,3);
      if(!quiet)zTone(330+Math.min(Z.combo,18)*26,.055,"square",.045);
      zPop(z.x,z.y,(mult>1?"×"+mult+" ":"")+"🧠 "+brains,mult>=3?"big":"");
    }
    zDrop(z.x,z.y);
    z.el.remove();Z.zombies.splice(i,1);
    zPaintHud();
  }
  function zFrame(now,dt){
    if(Z.over)return;
    Z.spin+=zSpeed()*dt*.045;
    const rad=zReach(),n=Z.swords.length;
    Z.swords.forEach((el,i)=>{
      const a=Z.spin+(i/n)*Math.PI*2;
      el.sx=pos.x+Math.cos(a)*rad;el.sy=pos.y+Math.sin(a)*rad;
      el.style.left=el.sx+"px";el.style.top=el.sy+"px";
      el.style.transform=`translate(-50%,-50%) rotate(${a*57.3+90}deg)`;
    });
    /* The inner ring turns the other way, which is what makes two rings read
       as two rings rather than as a thicker one. */
    const rad2=rad*.52,n2=Z.inner.length;
    Z.inner.forEach((el,i)=>{
      const a=-Z.spin*1.35+(i/n2)*Math.PI*2;
      el.sx=pos.x+Math.cos(a)*rad2;el.sy=pos.y+Math.sin(a)*rad2;
      el.style.left=el.sx+"px";el.style.top=el.sy+"px";
      el.style.transform=`translate(-50%,-50%) rotate(${a*57.3+90}deg)`;
    });
    if(Z.combo&&now-Z.comboAt>2400){Z.combo=0;zPaintHud()}
    if(Z.frenzyUntil&&now>Z.frenzyUntil){Z.frenzyUntil=0;zPaintHud()}
    if(Z.goldUntil&&now>Z.goldUntil){Z.goldUntil=0;zPaintHud()}
    /* Drops drift and expire whether or not a wave is running, so clearing a
       wave never strands one you were swimming for. */
    for(let i=Z.picks.length-1;i>=0;i--){
      const pk=Z.picks[i];
      if(now>pk.die){pk.el.remove();Z.picks.splice(i,1);continue}
      const dx=pos.x-pk.x,dy=pos.y-pk.y,d=Math.hypot(dx,dy)||1;
      if(d<300){pk.x+=dx/d*.9*dt;pk.y+=dy/d*.9*dt;
        pk.el.style.left=pk.x+"px";pk.el.style.top=pk.y+"px"}
      if(d<46){zTake(pk,i);continue}
    }
    if(Z.between)return;
    if(Z.toSpawn>0&&now>=Z.spawnAt){
      zSpawnOne();Z.toSpawn--;
      Z.spawnAt=now+Math.max(140,620-Z.wave*22);
      zPaintHud();
    }
    const edge=zEdge();
    for(let i=Z.zombies.length-1;i>=0;i--){
      const z=Z.zombies[i];
      const dx=pos.x-z.x,dy=pos.y-z.y,d=Math.hypot(dx,dy)||1;
      z.wob+=.09*dt;
      z.x+=(dx/d)*z.sp*dt+Math.cos(z.wob)*.45;
      z.y+=(dy/d)*z.sp*dt+Math.sin(z.wob*.8)*.45;
      z.el.style.left=z.x+"px";z.el.style.top=z.y+"px";
      /* Blades first: a zombie that walks into a sword on the same frame it
         reaches Flounder should die rather than bite. */
      let cut=false;
      for(const sw of Z.swords){
        const ax=sw.sx-z.x,ay=sw.sy-z.y;
        if(ax*ax+ay*ay<edge*edge){cut=true;break}}
      if(!cut)for(const sw of Z.inner){
        const ax=sw.sx-z.x,ay=sw.sy-z.y;
        if(ax*ax+ay*ay<edge*edge){cut=true;break}}
      if(cut){
        z.hp--;
        if(z.boss&&Z.bossEl){
          const f=Z.bossEl.querySelector(".zbf");
          if(f)f.style.width=Math.max(0,z.hp/z.max*100)+"%";
        }
        if(z.hp<=0){zKill(z,i);continue}
        z.el.classList.add("hurt");setTimeout(()=>z.el&&z.el.classList.remove("hurt"),110);
        if(z.boss)zTone(140,.05,"square",.035);
        /* Knocked back rather than ground down inside the ring — otherwise a
           three-health brute loses all three to one pass of one blade. */
        const kb=z.boss?12:34;
        z.x-=(dx/d)*kb;z.y-=(dy/d)*kb;
        continue;
      }
      if(d<38){
        /* A boss does NOT die by reaching you — it lands a hit, gets thrown
           back, and you still have to cut it down. Anything else makes the
           one fight in the wave that is supposed to be hard into a free kill,
           and left its health bar on screen with nothing behind it. */
        if(z.boss){
          if(now-(z.hitAt||0)>900){z.hitAt=now;
            zBurst(pos.x,pos.y,110,"#ff6b6b",4);zPop(pos.x,pos.y,"-1","bad");zHurt()}
          z.x-=(dx/d)*150;z.y-=(dy/d)*150;continue}
        z.el.remove();Z.zombies.splice(i,1);
        zBurst(z.x,z.y,70,"#ff6b6b",2);zPop(z.x,z.y,"-1","bad");zHurt();continue}
    }
    if(!Z.between&&Z.toSpawn===0&&!Z.zombies.length){
      const bonus=Z.wave*3;
      /* Every fifth wave pays properly. A milestone you can feel is what makes
         the next five worth starting. */
      const mile=Z.wave%5===0;
      const dustB=dustGain(Z.wave*5+(mile?Z.wave*20:0));
      Z.brains+=bonus;Z.dust+=dustB;visit+=dustB;AQ.earn=visit;
      dustEl.textContent=N(DUST.bal);
      const d2=$("aqDust");if(d2)d2.textContent=N(visit);
      if(mile){zBanner("WAVE "+Z.wave+" CLEARED","milestone · "+N(dustB)+" dust","best");
        zChord([392,494,587,784],.2,"triangle",.06)}
      else zChord([523,659],.14,"triangle",.05);
      if(Z.wave>Z.best&&Z.wave>0){Z.best=Z.wave;st.zwave=Z.wave;save(AQKEY,st)}
      zBreather("Wave "+Z.wave+" cleared",
        `🧠 ${bonus} and ${N(dustB)} dust${mile?" — milestone round":""}. `
        +"Spend the brains; they don't carry past a run.");
    }
  }
  function zEnd(){
    if(!Z)return;
    zShut();
    Z.zombies.forEach(z=>z.el.remove());
    Z.picks.forEach(pk=>pk.el.remove());
    Z.swords.forEach(el=>el.remove());
    Z.inner.forEach(el=>el.remove());
    if(Z.bossEl)Z.bossEl.remove();
    Z.hud.remove();Z.flash.remove();Z.heat.remove();
    game.classList.remove("zmode","zhit","zshake","zquake","zfrenzy","zgold");
    Z=null;
  }
  /* Toggling the effect on or off in the shop mid-run has to build or tear
     down the whole mode, not just change what the food looks like. */
  function zSync(){
    if(zOn()&&!Z)zBuild();
    else if(!zOn()&&Z){zEnd();for(let i=0;i<10;i++)spawnFood()}
  }
  AQ.zEnd=()=>zEnd();

  dustEl.textContent=N(DUST.bal);
  AQ.bub=setInterval(bubble,650);
  for(let i=0;i<10;i++)spawnFood();
  AQ.drop=setInterval(spawnFood,1300);

  /* Read once per frame, here, and used by every card effect below. Declared
     up here rather than beside the effects so the frame loop can fill them
     without reaching forward into a variable that hasn't been initialised. */
  let CARDR=card.getBoundingClientRect(),GAMER=R();
  let last=performance.now();
  let rectAge=0;
  function frame(now){
    if(!AQ)return;
    const dt=Math.min(32,now-last)/16.67;last=now;
    /* The card moves every frame so its rect is refreshed every frame; the
       tank only moves when the window does, so twice a second is plenty. */
    CARDR=card.getBoundingClientRect();
    if((rectAge+=dt)>30){rectAge=0;GAMER=R()}
    const dx=target.x-pos.x,dy=target.y-pos.y;
    vel.x+=dx*.018*dt;vel.y+=dy*.018*dt;
    vel.x*=Math.pow(.82,dt);vel.y*=Math.pow(.82,dt);
    pos.x+=vel.x*dt;pos.y+=vel.y*dt;
    const tilt=clamp(vel.x*1.4,-12,12),bob=Math.sin(now/320)*2,
      chonky=now<chonkyUntil?1.22:1,bonk=now<bonkUntil?Math.sin(now/22)*8:0;
    card.style.left=(pos.x+bonk)+"px";card.style.top=(pos.y+bob)+"px";
    card.style.transform=`translate(-50%,-50%) scale(${chonky}) rotate(${tilt}deg)`;
    if(Z){
      /* Pull the view back so a wave has somewhere to come from. The tank is
         already taller in zmode; this shrinks Flounder inside it, which is
         what actually reads as zooming out. */
      card.style.transform=`translate(-50%,-50%) scale(${chonky*.74}) rotate(${tilt}deg)`;
      zFrame(now,dt);
      AQ.raf=requestAnimationFrame(frame);return;
    }
    const magnetOn=on("magnet");
    for(let i=foods.length-1;i>=0;i--){
      const f=foods[i];f.phase+=.018*dt;
      f.y+=Math.sin(f.phase)*.08+f.drift*.08;f.x+=Math.cos(f.phase*.75)*.07;
      /* Reels food in from anywhere it's already drifted within reach — not a
         teleport, just a steady pull that gets stronger as it gets closer, so
         it still reads as swimming toward Flounder rather than snapping to him. */
      if(magnetOn){
        const mx=pos.x-f.x,my=pos.y-f.y,md=Math.hypot(mx,my)||1;
        if(md<280){const pull=(1-md/280)*3.4*dt;f.x+=mx/md*pull;f.y+=my/md*pull}
      }
      const special=f.type==="potato"||f.type==="coconut";
      const rot=special?` rotate(${f.phase*40*f.spin}deg)`:"";
      f.el.style.transform=`translate(${Math.sin(f.phase)*4}px,${Math.cos(f.phase*.8)*4}px)${rot}`;
      const ax=f.x-pos.x,ay=f.y-pos.y;
      if(ax*ax+ay*ay<58*58)eat(i);}
    AQ.raf=requestAnimationFrame(frame);}
  AQ.raf=requestAnimationFrame(frame);

  /* ---- card effects ------------------------------------------------------
     Ben's effects-v2, wired to dust. The original read a shop state that never
     existed in this build, so it was inert; ownership now lives in FFXKEY and
     the particles are parented to the game box rather than the page. Every
     interval is parked on AQ so stopAqua() kills them when you leave — without
     that they'd keep firing into a detached node for the rest of the session. */
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const hidden=()=>document.hidden;
  /* ---- why this got slow with everything equipped -------------------------
     Every effect ran on its own setInterval and every one of them called
     card.getBoundingClientRect() on each tick. Meanwhile the animation loop is
     writing card.style.left/top/transform on every frame. Reading a rect after
     a style write forces the browser to stop and recompute layout, so eight
     timers reading forty-odd times a second against a loop writing sixty times
     a second meant the page spent most of its time in forced reflow. That is
     the lag, and it got worse with each card equipped because each card added
     another reader.

     Two caches fix it. CARDR and GAMER are read ONCE per animation frame, in
     the frame itself, and every effect uses those instead of measuring. No
     effect touches the layout again.

     Then a ceiling. At full kit the effects were spawning about thirty-five
     animated nodes a second and each lived up to 1.7s, so steady state was
     sixty to seventy absolutely-positioned elements animating at once, plus
     the garbage from building and destroying them. PMAX caps the population:
     past it, spawns are skipped rather than queued. The look is unchanged at
     one or two effects and merely stops thickening at six. */
  let PLIVE=0;
  const PMAX=64;
  function particle(cls,x,y,text,size){
    if(PLIVE>=PMAX)return null;
    const el=document.createElement("span");el.className="ff2p "+cls;
    if(text)el.textContent=text;
    if(size)el.style.fontSize=size+"px";
    el.style.left=(x-GAMER.left)+"px";el.style.top=(y-GAMER.top)+"px";
    game.appendChild(el);PLIVE++;return el}
  const anim=(el,frames,dur)=>{
    if(!el)return;
    const a=el.animate(frames,{duration:dur,easing:"cubic-bezier(.15,.7,.22,1)"});
    a.onfinish=()=>{el.remove();PLIVE--};
    /* A cancelled animation never fires onfinish, so without this the counter
       would drift up and eventually wedge the ceiling shut. */
    a.oncancel=()=>{el.remove();PLIVE--}};
  const m={x:0,y:0,vx:0,vy:0,s:0,a:0,t:0,ready:false};
  AQ.fx=[];
  const every=(ms,fn)=>AQ.fx.push(setInterval(fn,ms));
  every(70,()=>{
    const r=CARDR,x=r.left+r.width/2,y=r.top+r.height/2;
    if(!m.ready){m.x=x;m.y=y;m.ready=true;return}
    const dx=x-m.x,dy=y-m.y,na=Math.atan2(dy,dx||.001);
    let d=na-m.a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;
    m.t=Math.abs(d);m.a=na;m.vx=dx;m.vy=dy;m.s=Math.hypot(dx,dy);m.x=x;m.y=y});

  every(180,()=>{if(hidden()||!on("bubbles"))return;
    const r=CARDR,n=m.s>3?2:1;
    for(let i=0;i<n;i++){const sz=rnd(9,19);
      const p=particle("ff2bubble",r.left+r.width*rnd(.2,.8),r.top+r.height*rnd(.55,.92));
      if(p)p.style.width=p.style.height=sz+"px";
      anim(p,[{transform:"translate(-50%,-50%) scale(.4)",opacity:0},
        {transform:"translate(-50%,-50%) scale(1)",opacity:.95,offset:.2},
        {transform:`translate(calc(-50% + ${rnd(-18,18)+m.vx*1.5}px),calc(-50% - ${rnd(60,105)+m.s*5}px)) scale(1.4)`,opacity:0}],rnd(1200,1700))}});

  every(500,()=>{if(hidden()||!on("shimmer"))return;
    const r=CARDR;
    const p=particle("ff2star",r.left+rnd(10,r.width-10),r.top+rnd(10,r.height-14),
      Math.random()>.5?"✦":"✧",rnd(13,19));
    anim(p,[{transform:"translate(-50%,-50%) scale(.2)",opacity:0},
      {transform:"translate(-50%,-50%) scale(1.2)",opacity:1,offset:.3},
      {transform:`translate(calc(-50% + ${rnd(-8,8)}px),calc(-50% - ${rnd(10,22)}px)) scale(.25)`,opacity:0}],rnd(700,1000))});

  every(250,()=>{if(hidden()||!on("sapphire"))return;
    const r=CARDR,e=Math.floor(Math.random()*4);
    const x=e<2?r.left+r.width*(e?.94:.06):r.left+r.width*rnd(.15,.85);
    const y=e>1?r.top+r.height*(e===2?.08:.92):r.top+r.height*rnd(.15,.85);
    const p=particle("ff2dot",x,y);
    anim(p,[{transform:"translate(-50%,-50%) scale(.3)",opacity:0},
      {transform:"translate(-50%,-50%) scale(1.35)",opacity:1,offset:.3},
      {transform:`translate(calc(-50% + ${rnd(-20,20)}px),calc(-50% + ${rnd(-20,20)}px)) scale(.3)`,opacity:0}],rnd(850,1200))});

  const burst=(x,y,n)=>{for(let i=0;i<n;i++){
    const a=rnd(0,Math.PI*2),d=rnd(20,48);
    const p=particle("ff2star",x,y,Math.random()>.35?"✦":"✧",rnd(14,21));
    anim(p,[{transform:"translate(-50%,-50%) scale(.2)",opacity:0},
      {transform:"translate(-50%,-50%) scale(1.18)",opacity:1,offset:.16},
      {transform:`translate(calc(-50% + ${Math.cos(a)*d}px),calc(-50% + ${Math.sin(a)*d}px)) scale(.16)`,opacity:0}],rnd(1100,1650))}};

  every(90,()=>{if(hidden()||!on("sparkles")||!m.ready||m.s<1.1)return;
    const mag=Math.max(m.s,.001),ux=m.vx/mag,uy=m.vy/mag,n=m.s>8?8:m.s>4?6:4;
    for(let i=0;i<n;i++){
      const tail=rnd(32,72)+Math.min(m.s*2.2,20),spread=18+tail*.28,lat=rnd(-spread,spread);
      const x=m.x-ux*tail-uy*lat,y=m.y-uy*tail+ux*lat,dot=Math.random()<.12;
      const p=particle(dot?"ff2dot":"ff2star",x,y,dot?"":(Math.random()>.38?"✦":"✧"),dot?0:rnd(14,22));
      const db=rnd(20,52),sd=rnd(-10,10);
      anim(p,[{transform:"translate(-50%,-50%) scale(.18)",opacity:0},
        {transform:"translate(-50%,-50%) scale(1.12)",opacity:1,offset:.14},
        {transform:`translate(calc(-50% + ${-ux*db-uy*sd}px),calc(-50% + ${-uy*db+ux*sd}px)) scale(.12)`,opacity:0}],rnd(1500,2200))}
    if(m.t>.68&&m.s>3.5&&Math.random()>.32)burst(m.x,m.y,m.s>7?10:7)});

  every(220,()=>{if(hidden()||!on("water"))return;
    const r=CARDR,sz=rnd(7,13);
    const p=particle("ff2bubble",r.left+r.width*rnd(.12,.88),r.top+r.height*rnd(.2,.9));
    if(p)p.style.width=p.style.height=sz+"px";
    anim(p,[{transform:"translate(-50%,-50%) scale(.35)",opacity:0},
      {transform:"translate(-50%,-50%) scale(1)",opacity:.78,offset:.2},
      {transform:`translate(calc(-50% + ${rnd(-10,10)}px),calc(-50% - ${rnd(25,45)}px)) scale(.2)`,opacity:0}],rnd(850,1200))});

  every(170,()=>{if(hidden()||!on("legendary"))return;
    const r=CARDR,a=rnd(0,Math.PI*2),rad=rnd(r.width*.25,r.width*.78),st2=Math.random()>.45;
    const p=particle(st2?"ff2star":"ff2rainbow",
      r.left+r.width/2+Math.cos(a)*rad*.8,r.top+r.height/2+Math.sin(a)*rad,
      st2?(Math.random()>.5?"✦":"✧"):"",st2?rnd(13,19):0);
    anim(p,[{transform:"translate(-50%,-50%) scale(.2)",opacity:0},
      {transform:"translate(-50%,-50%) scale(1.2)",opacity:1,offset:.18},
      {transform:`translate(calc(-50% + ${Math.cos(a)*rnd(20,45)}px),calc(-50% + ${Math.sin(a)*rnd(20,45)}px)) scale(.2)`,opacity:0}],rnd(900,1350))});

  every(190,()=>{if(hidden()||!on("abyss"))return;
    const r=CARDR,a=rnd(0,Math.PI*2),rad=rnd(r.width*.38,r.width*.9);
    const p=particle("ff2void",r.left+r.width/2+Math.cos(a)*rad,r.top+r.height/2+Math.sin(a)*rad*1.2);
    anim(p,[{transform:"translate(-50%,-50%) scale(.25)",opacity:0},
      {transform:"translate(-50%,-50%) scale(1.35)",opacity:1,offset:.25},
      {transform:`translate(calc(-50% - ${Math.cos(a)*rnd(10,24)}px),calc(-50% - ${Math.sin(a)*rnd(10,30)}px)) scale(.1)`,opacity:0}],rnd(1100,1650))});

  function paintFX(){
    const v=ffxLoad();
    activeFX=new Set(v.active);
    card.className="ffcard "+v.active.map(i=>"ff-"+i).join(" ");
    zSync();
    const sh=$("ffshop");if(!sh)return;
    sh.innerHTML=FFX.map(x=>{
      const owned=v.owned.includes(x.id),live=v.active.includes(x.id);
      const afford=DUST.bal>=x.c;
      return `<div class="ffx${live?" on":""}${owned?" own":""}">
        <div class="ffxn">${esc(x.l)}${live?`<span class="ffxlive">ON</span>`:""}</div>
        <div class="ffxd">${esc(x.d)}</div>
        ${owned?`<button class="btn${live?" go":""}" data-ffxt="${x.id}">${live?"Take it off":"Wear it"}</button>`
          :`<button class="btn${afford?" go":""}" data-ffxb="${x.id}"${afford?"":" disabled"}>${N(x.c)} dust</button>`}
      </div>`}).join("");
    sh.querySelectorAll("[data-ffxb]").forEach(b=>b.onclick=()=>{
      const x=FFX.find(y=>y.id===b.dataset.ffxb);if(!x)return;
      if(!dustSpend(x.c)){toast("Not enough dust yet");return}
      const s2=ffxLoad();s2.owned.push(x.id);s2.active.push(x.id);
      save(FFXKEY,s2);dustEl.textContent=N(DUST.bal);
      toast(`${x.l} unlocked`);paintFX()});
    sh.querySelectorAll("[data-ffxt]").forEach(b=>b.onclick=()=>{
      const id=b.dataset.ffxt,s2=ffxLoad();
      const i=s2.active.indexOf(id);i<0?s2.active.push(id):s2.active.splice(i,1);
      save(FFXKEY,s2);paintFX()});
  }
  AQ.paintFX=paintFX;
  paintFX();
}

/* ===== leaderboards — framework only ====================================
   Shape, storage key and render are all here; the fetch is not, because there
   is no server yet. Every game calls leaderboard(id) and gets the same shelf,
   showing the player's own best from localStorage and an honest note that the
   ranked board arrives with accounts. When Supabase lands, LB_LIVE goes true
   and lbFetch does the only new work. */
const LB_LIVE=false;
const LBKEY="fs3_lb";
const LB_GAMES={
  guess:  {t:"Guess the card",       unit:"streak"},
  ability:{t:"Guess the ability",    unit:"streak"},
  flavour:{t:"Guess the flavour text",unit:"streak"},
  reveal: {t:"Guess from the facts", unit:"streak"},
  aqua:   {t:"Aquarium",             unit:"fed"},
};
const lbBest=id=>(load(LBKEY,{})[id]||0);
function lbPost(id,score){
  const all=load(LBKEY,{});
  if(score>(all[id]||0)){all[id]=score;save(LBKEY,all)}
  if(LB_LIVE)lbPush(id,score);          // server call, deliberately not written yet
}
function lbPush(){/* wired up when accounts exist */}
function leaderboard(id){
  const g=LB_GAMES[id];if(!g)return "";
  const mine=lbBest(id);
  return `<div class="lbrd" data-lb="${esc(id)}">
    <h4>Leaderboard — ${esc(g.t)}</h4>
    <div class="lbrow lbme"><span>Your best</span><span>${mine?N(mine)+" "+esc(g.unit):"—"}</span></div>
    <div class="lbsoon">Ranked boards arrive with accounts. Your best is kept on this device
      until then, and it will carry over.</div>
  </div>`;
}

