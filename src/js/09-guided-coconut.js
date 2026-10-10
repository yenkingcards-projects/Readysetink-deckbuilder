/* ===================== guided coconut build ===================== */
// ink pair by hook DENSITY per ink — normalises away "this ink is just bigger"
/* `need` is 2 for a single-ink Coconut (pick two more inks) and 1 for a duo
   Coconut (its two locked inks already cover two of the format's three
   slots). The gap check compares the last ink actually picked against the
   best one left out, whichever rank that lands on. */
function pairFor(idx){
  const co=COCO[idx],pool=CARDS.filter(c=>legal(c));
  const base=coInks(co),need=3-base.length;
  const d=INKS.map(i=>{const p=pool.filter(c=>c.co.includes(i));
    return[i,p.length?p.filter(co.hook).length/p.length:0,p.filter(co.hook).length]});
  const others=d.filter(x=>!base.includes(x[0])).sort((a,b)=>b[1]-a[1]);
  const best=others.slice(0,need).map(x=>x[0]);
  const gap=others[need]&&others[need][1]?((others[need-1][1]-others[need][1])/others[need][1]*100):999;
  return{best,need,all:others,conf:gap>=15?"strong":(gap>=6?"ok":"close")};
}
/* ===================== prebuilt Coconut decks =====================
   Generated from the card data, not hand-typed. Eighteen hand-written 60-card
   lists would be stale the day a set drops; this rebuilds from whatever is in
   the database, so a prebuilt deck is always legal and always current.

   It is a good deck, not a tournament list. Say so on the page.

   How a card earns its place, in order of weight:
     hook      — the Coconut's own text cares about it. This is the deck.
     synergy   — it matches one of the Coconut's recommended filters.
     staple    — it is on the starred list, i.e. it is just strong.
     inkable   — a singleton deck that can't ink is a dead deck.
   Then the picks are laid into a cost curve, so it doesn't end up as sixty
   six-drops with the best scores. */
/* One paragraph per Coconut: the plan, the first three turns, and the one
   thing you are trying to do. Written to be skimmed — you should know whether
   you want this deck before you read a single card name. */
const COCO_PLAN={
"Scar":{p:"A Steel goodstuff pile that gets a discount every single turn. Every Ally is a rate cheat, so the deck is stuffed with them and just plays a bigger board than you should be able to.",t:["Ink, then a 1-cost Ally for free.","Ink, drop a 3-cost Ally for 2 and hold up a trick.","Ink, Scar himself, and start chaining Allies at a discount."],g:"Out-body them by turn five and never spend full price on a creature again."},
"Ariel":{p:"Princesses sing, songs cost nothing, and every song turns into free lore. It's a combo deck wearing an Amber shirt — the songs aren't for their effects, they're the trigger.",t:["Ink, play a cheap Princess.","Ink, sing a song off her — lore before you've even quested.","Ink, Ariel, then sing twice and watch the counter jump."],g:"Win on lore from singing, not from questing. If they kill your Princess, sing another one out."},
"Winnie the Pooh":{p:"Every vanilla body — no ability, just stats — becomes a cantrip. The deck deliberately runs the boring cards nobody drafts, because in this shell they all draw a card.",t:["Ink, play a plain 1-drop.","Ink, plain 2-drop.","Ink, Pooh, then every dumb body from here draws."],g:"Never run out of cards. Grind them out with a board that refills itself."},
"Stitch":{p:"A free play every turn, forever. Fill the deck with 2-and-unders so the free slot is never dead, and load Lilo and Stitch names for the lore kicker.",t:["Ink, play a 2-drop.","Ink, 2-drop, and Stitch's free play if he's down.","Ink, Stitch, then two bodies a turn from here."],g:"Out-tempo them. You get an extra card of value every turn they don't."},
"Ursula":{p:"Your characters sing far above their cost, so the expensive game-swinging songs come down on turn three. Ursula names count as +2, so the deck runs plenty of them.",t:["Ink, cheap body.","Ink, another body — you're building singers, not attackers.","Ink, sing a 5-cost song off a 3-cost character."],g:"Cast the big songs several turns early and swing the game before they're ready."},
"Mickey Mouse":{p:"Every Mickey in the deck has Shift 2, from hand, deck or discard. That turns a pile of expensive Mickeys into a chain of 2-cost upgrades.",t:["Ink, cheap Mickey.","Ink, Shift a bigger Mickey onto him for 2.","Ink, Shift again — you're four ink ahead already."],g:"Climb the Mickey ladder for 2 a step and present a body they can't answer."},
"Mufasa":{p:"Ramp. Pay 5 once a turn to bank two more ink, then dump something enormous well before it's fair.",t:["Ink, cheap body.","Ink, hold.","Ink, then start banking two extra ink a turn."],g:"Get to your top end three turns early. Everything cheap in here just survives until then."},
"Nick Wilde":{p:"Four Pawpsicles is the whole joke. Flood items, then cash four of them in for four lore in one click, repeatedly.",t:["Ink, Pawpsicle.","Ink, two more items.","Ink, Nick, then start converting items into lore."],g:"Four lore a turn from cards they can't interact with. Items are the fuel, not the plan."},
"Snow White":{p:"A tribal counting deck. Get seven differently-named Dwarfs across hand, discard and play, flip Snow White once, and every character you own gains +2 lore for the rest of the game.",t:["Ink, a Dwarf.","Ink, another Dwarf — different name, always.","Ink, a third, and start counting toward seven."],g:"Hit the count, flip her, then quest with everything. Before that you're just playing bodies."},
"Donald Duck":{p:"Boost costs one less, and so does everything with Boost. It's a ramp-and-value deck where the discount applies twice on the same card.",t:["Ink, cheap Boost card.","Ink, play and Boost in the same turn for the price of one.","Ink, Donald, and everything after is a discount."],g:"Play a bigger card than your ink says every turn from three onward."},
"Mr. Incredible":{p:"Supers get Rush and a free exert on the way in. It's aggro with built-in removal — every body both attacks immediately and taps their blocker.",t:["Ink, cheap Super.","Ink, Super with Rush — challenge straight away.","Ink, Mr. Incredible, then every Super is a two-for-one."],g:"Kill them by turn seven. Every character you play should be trading or attacking the same turn."},
"Moana":{p:"An extra ink every turn while a Moana, Heihei or Pua is out. It's the smoothest ramp in the format and the deck is built to always have one of those three down.",t:["Ink, Heihei or Pua.","Ink twice — you're already a turn ahead.","Ink twice, then a 4-drop on turn three."],g:"Be permanently one to two ink ahead, and spend the lead on cards they can't match yet."},
"John Silver":{p:"Locations that don't die. Every character standing at a location makes it tougher, so the deck builds a board that quietly accumulates lore while being very hard to remove.",t:["Ink, cheap body.","Ink, drop a location.","Ink, move characters onto it — now it's Resist 2 or 3."],g:"Win on location lore. They have to deal with a thing that gets harder to kill every turn."},
"Robin Hood":{p:"A free Robin's Bow on turn one, four Robins allowed, and a deck full of ping damage. Death by a thousand cuts.",t:["Free Robin's Bow, ink, go.","Ink, ping something and drop a body.","Ink, Robin, and now every ping is part of a machine."],g:"Control the board with small repeatable damage, then quest through the wreckage."},
"Tinker Bell":{p:"Every ability or action that damages an opposing character does one more. It turns a pile of 1-damage pings into 2-damage removal, which changes what dies.",t:["Ink, cheap body.","Ink, a pinger.","Ink, Tinker Bell — now every ping kills a 2-toughness card."],g:"Convert cheap chip damage into a real removal suite. The deck is all damage triggers on purpose."},
"Sisu":{p:"Anything bigger than their whole board can quest the turn it lands. Play big, pump bigger, quest immediately — no summoning sickness on the cards that matter.",t:["Ink, cheap body.","Ink, a pump effect or a big body.","Ink, Sisu, then quest with a fresh fatty."],g:"Big stats, immediate lore. Every buff in here exists to clear the 'bigger than theirs' bar."},
"Pocahontas":{p:"Pick a character each turn: it gains lore, can't challenge, and has to quest. A pure lore-race deck that turns any body into a questing machine.",t:["Ink, cheap body.","Ink, another body.","Ink, Pocahontas, then start pointing at whoever should quest."],g:"Race to twenty. The deck avoids combat entirely — you're not trying to fight them."},
"Dumbo":{p:"Exert abilities work the turn a character lands. Every tap-to-do-something card in the deck becomes an enters-play effect instead.",t:["Ink, cheap body with an exert ability.","Ink, another one — still sitting idle for now.","Ink, Dumbo, then every exert ability fires immediately."],g:"Get instant value out of cards everyone else has to wait a turn on."},
"Woody & Buzz Lightyear":{p:"A Toy tribal shell that gets cheaper every turn and rewards you for actually running the pair it's named after. Every Toy comes in a rate cheaper, and having both Woody and Buzz down turns that discount into a card.",t:["Ink, cheap Toy.","Ink, another Toy at a discount.","Ink, Woody & Buzz, then chain Toys and draw off the pair."],g:"Play more Toys than your ink should allow, and pull ahead on cards once both namesakes are on board."},
"The Madrigal Family":{p:"A stall shell built around healing. Every time you patch a character up you get to ready it — the tradeoff is it's locked out of questing and challenging that turn, so this is a deck about holding the board, not racing it.",t:["Ink, cheap body.","Ink, a healer.","Ink, the Madrigal Family, then start readying whatever you just patched up."],g:"Out-last them. Nothing they throw at your board sticks for long, and you're never open on defense."},
"Peter Pan & Tinker Bell":{p:"Evasive is the whole deck: give it to a body that can't be answered, then let it snowball into free lore once it's already unstoppable.",t:["Ink, cheap body.","Ink, another one — you're setting up who gets the buff.","Ink, Peter Pan & Tinker Bell, then hand out Evasive and start pushing lore no one can block."],g:"One character nobody can touch, getting stronger every turn you leave it alone."},
"Aladdin & Genie":{p:"A card-draw shell where hitting your third draw of the turn is the entire payoff. Load up on cheap draw so three-in-a-turn is routine, not a stretch.",t:["Ink, a cheap cantrip.","Ink, another draw effect.","Ink, Aladdin & Genie, then chain a third draw and bank the lore."],g:"Turn a normal draw-heavy turn into a free two lore, over and over."},
"Belle & Beast":{p:"Big bodies that keep coming back for more. Anything you own that's cost 5 or more turns every ready into a card, so the deck leans on Resist and readying effects to keep the trigger firing.",t:["Ink, cheap body.","Ink, hold for the big stuff.","Ink, Belle & Beast, then ready your fatty and draw off it."],g:"Never run out of gas once your top end sticks — every ready is a card."},
"Darkwing Duck & Launchpad":{p:"An aggressive challenge deck that gets paid for every banish — triple if the target's a Villain. Built around Challenger and big bodies that win the fight and cash in.",t:["Ink, cheap body.","Ink, a challenger.","Ink, Darkwing Duck & Launchpad, then start banishing their board and collecting lore for it."],g:"Race on combat, not just lore. Every trade you win pays you directly."},
"The Vine":{p:"A Floodborn swarm that snowballs. Every Floodborn on the board knocks 1 off the next one, so cheap Floodborn come first and the big ones and Shift targets land way ahead of schedule.",t:["Ink, a cheap Floodborn.","Ink, another Floodborn, now 1 cheaper.","Ink, The Vine, then drop a big Floodborn for half price."],g:"Flood the board with Floodborn faster than they can clear it."},
"Merida":{p:"Every character you play can come in exerted and turn 1 ink into 1 lore. Run lots of cheap characters so you play two or three a turn and cash each one in.",t:["Ink, a cheap character.","Ink, two cheap characters, pay 1 for lore off one.","Ink, Merida, then every body you play is a lore."],g:"Win on lore from playing cards, not from questing."},
"Pete":{p:"Two actions a turn and their best character turns Reckless and can't touch your board. Cheap actions and card draw keep you hitting that second action every turn.",t:["Ink, a cheap action or a body.","Ink, two cheap actions, lock down their best character.","Ink, Pete, and keep chaining two actions a turn."],g:"Keep their board from fighting yours while you quest."},
"The Black Cauldron":{p:"Your banished characters go under the Cauldron instead of staying dead, and the Cauldron plays them back. Cheap characters that trade away, and ones that want to be banished, keep it fed.",t:["Ink, a cheap character.","Ink, The Black Cauldron.","Ink, trade a character away and tuck it under the Cauldron."],g:"Every trade comes back. Out-last them."}};
const COCO_CURVE=[0,4,10,12,11,8,6,5];   // by cost, 0..7+ — 56 cards
function cocoDeck(idx){
  const co=COCO[idx];if(!co)return null;
  /* pairFor() ranks inks by DENSITY — what share of that ink cares about the
     Coconut — which is the right answer for the guided build's advice, but the
     wrong one here. For a prebuilt deck what matters is the raw number of
     payoff cards you can actually put in it. Moana is the clear case: her
     payoffs are the cards NAMED Moana, Heihei or Pua, and density was steering
     her away from the inks that hold the most of them. */
  const legalPool=CARDS.filter(c=>legal(c));
  const hooks=legalPool.filter(c=>{try{return !!co.hook(c)}catch(e){return false}});
  /* Score whole PAIRS, not single inks. Counting per-ink credited a dual-ink
     card to both of its inks — so Amber looked like it held a Pua, when that
     Pua is Amber/Amethyst and is unplayable unless Amethyst is in the deck
     too. Fifteen pairs is nothing to check exactly. */
  /* A duo Coconut has already spent two of the format's three ink slots on
     itself, so there's only one more to search for rather than a pair — same
     scoring, just a single loop instead of the double one. */
  const base=coInks(co),others=INKS.filter(i=>!base.includes(i));
  let inks=[...base,...others.slice(0,3-base.length)],bestN=-1,bestNames=-1;
  const consider=combo=>{
    const set=new Set([...base,...combo]);
    const hit=hooks.filter(c=>c.co.length&&c.co.every(i=>set.has(i)));
    const n=hit.length;
    /* Ties break on how many DIFFERENT names the combo reaches. This is a
       singleton format, so eight Moanas plus two Puas is a more resilient
       deck than ten Moanas — and it is what makes Moana's list actually
       contain a Pua. (Heihei has no card in Lorcana yet, so her text names a
       creature that cannot be included.) */
    const names=new Set(hit.map(c=>c.n)).size;
    if(n>bestN||(n===bestN&&names>bestNames)){bestN=n;bestNames=names;inks=[...base,...combo]}};
  if(base.length>=2){
    for(let a=0;a<others.length;a++)consider([others[a]]);
  }else{
    for(let a=0;a<others.length;a++)for(let b2=a+1;b2<others.length;b2++)
      consider([others[a],others[b2]]);
  }
  const iset=new Set(inks);
  const self=CARDS.find(x=>x.n===co.n&&x.v===co.v);
  const recIds=co.rec||[];
  const pool=CARDS.filter(c=>legal(c)&&c.co.length&&c.co.every(i=>iset.has(i))
    &&!(self&&c.f===self.f)&&!isQuest(c)&&c.f!==BANNED);
  const score=c=>{
    let n=0;
    try{if(co.hook(c))n+=6}catch(e){}
    recIds.forEach(id=>{if(c.ab&&c.ab.has(id))n+=3});
    if(isStar(c.f))n+=3;
    if(c.ik)n+=1;
    if(c.tribal&&c.tribal.length)n+=1;
    /* Refinements after looking at the first pass, which was picking a lot of
       vanilla bodies that happened to be inkable:
       - Lore is how you win, so a character that quests for 2+ is worth more
         than one that quests for 1 at the same cost.
       - Rate matters: stats-per-ink separates a good 3-drop from a bad one.
       - A card with no rules text and no lore is filler. Push it down unless
         the Coconut specifically wants vanillas (Pooh).
       - Cards that draw, remove or ramp carry games; nudge them up. */
    if(c.ty==="Character"){
      if((c.lo||0)>=3)n+=3; else if((c.lo||0)===2)n+=2; else if((c.lo||0)===1)n+=0.5;
      const rate=((c.st||0)+(c.wi||0))/Math.max(1,c.c);
      if(rate>=3)n+=1.5; else if(rate>=2.2)n+=0.75;
    }
    if(c.ab){
      ["draw","banish","cheap","ramp","tutor"].forEach(id=>{if(c.ab.has(id))n+=1});
      if(!c.tx&&!recIds.includes("vanilla"))n-=2;
    }
    if((c.ru||[]).length)n+=0.25;
    return n};
  const ranked=pool.map(c=>({c,s:score(c)}))
    /* Deterministic: the same Coconut always yields the same deck. Ties break
       on name so the order never depends on database ordering. */
    .sort((a,b)=>b.s-a.s||a.c.f.localeCompare(b.c.f));
  /* Does this card exist because of the Coconut? Used both to force payoffs
     into the deck and to decide which card gets the star. */
  const synergy=c=>{
    try{if(co.hook(c))return true}catch(e){}
    return recIds.some(id=>c.ab&&c.ab.has(id))};
  const isHook=c=>{try{return !!co.hook(c)}catch(e){return false}};

  const picked=[],used=new Set();
  const want=COCO_CURVE.slice();
  /* Payoffs go in FIRST and ignore the curve. A Moana deck without Heihei and
     Pua is not a Moana deck, however tidy its mana curve is. Capped at 24 so a
     broad hook (Nick Wilde: "every item") can't eat the whole list. */
  ranked.filter(x=>isHook(x.c)).slice(0,24).forEach(({c})=>{
    if(used.has(c.f))return;
    used.add(c.f);picked.push(c);
    const b=Math.min(7,c.c);if(want[b]>0)want[b]--});
  ranked.forEach(({c,s})=>{
    const b=Math.min(7,c.c);
    if(want[b]>0&&s>0&&!used.has(c.f)){want[b]--;used.add(c.f);picked.push(c)}});
  /* Top up to 56 with the best of whatever is left, curve be damned — a legal
     60 beats a perfect curve at 51. */
  for(const {c} of ranked){
    if(picked.length>=56)break;
    if(!used.has(c.f)){used.add(c.f);picked.push(c)}}
  const cards={};
  picked.forEach(c=>cards[c.f]=1);
  if(self)cards[self.f]=4;
  /* The dream opener: seven cards you'd keep without thinking. Two cheap
     inkable bodies to make land drops, the Coconut itself, the best early
     payoff, and a curve topper to aim at. Deterministic, so the same deck
     always shows the same hand. */
  const inDeck=picked.slice();
  const pick1=f=>{const i=inDeck.findIndex(f);return i<0?null:inDeck.splice(i,1)[0]};
  const hand=[];
  if(self)hand.push(self);
  [c=>c.ik&&c.c<=1, c=>c.ik&&c.c===2, c=>synergy(c)&&c.c<=2,
   c=>synergy(c)&&c.c===3, c=>c.ik&&c.c===3, c=>c.c>=4&&c.c<=5,
   c=>c.ik&&c.c<=2, c=>true].forEach(f=>{if(hand.length<7){const c=pick1(f);if(c)hand.push(c)}});

  return {inks,cards,co,self,scoreOf:score,synergy,isHook,hand,
    total:Object.values(cards).reduce((a,b)=>a+b,0)};
}
function inkStaples(ink){
  return CARDS.filter(c=>isStar(c.f)&&c.co.length===1&&c.co[0]===ink&&legal(c))
    .sort((a,b)=>a.c-b.c).slice(0,2);
}
function inkCards(inks){const s=new Set(inks);
  return CARDS.filter(c=>legal(c)&&c.f!==BANNED&&c.co.length&&c.co.every(x=>s.has(x)))}
function miniCard(c,extra){
  const q=deck().cards[c.f];
  return `<div class="mcard">${q?`<span class="badge">×${q}</span>`:""}
    ${c.img?`<img src="${c.img}" data-madd="${esc(c.f)}" title="Click to add ${esc(c.f)}">`
           :`<div class="ph" data-madd="${esc(c.f)}">${esc(c.n)}</div>`}
    <div class="t">◈${c.c} ${esc(c.v||c.n)}${extra||""}</div></div>`;
}
/* All six steps are always on the page. Unreached ones render as a dimmed
   preview so you can see what's coming instead of being surprised by it. */
let GTAB=load("fs3_gtab","pick"),GBUILT=null;
/* The list for one prebuilt deck, plus the one button that matters. */
function builtPanel(i){
  const d=cocoDeck(i);if(!d)return "";
  const L=Object.entries(d.cards).map(([f,q])=>({c:CARDS.find(x=>x.f===f),q}))
    .filter(x=>x.c).sort((a,b)=>a.c.c-b.c.c||a.c.f.localeCompare(b.c.f));
  const byCost={};L.forEach(x=>{const k=Math.min(7,x.c.c);(byCost[k]=byCost[k]||[]).push(x)});
  const plan=COCO_PLAN[d.co.n];
  /* The single highest-scoring card in each cost slot gets a star. It's the
     answer to "why is this deck like this" at a glance. */
  /* Star the best card in each slot THAT THE COCONUT ACTUALLY WANTS. Scoring
     alone starred whatever was strongest in a vacuum — Dumbo's list flagged
     Cobra Bubbles, a fine card, for a Coconut about exert abilities. The bar
     is now the Coconut's OWN text — a recommended-filter match is not enough.
     A slot with nothing the Coconut wants simply gets no star. */
  const star={};
  Object.keys(byCost).forEach(k=>{
    let best=null,bs=-1;
    byCost[k].forEach(x=>{if(!d.isHook(x.c))return;
      const sc=d.scoreOf(x.c);if(sc>bs){bs=sc;best=x.c.f}});
    star[k]=best});
  return `<div class="bbody">
    ${plan?`<div class="bplan">
      <p class="bp">${esc(plan.p)}</p>
      <div class="bturns">${plan.t.map((t,i)=>
        `<div><span>Turn ${i+1}</span>${esc(t)}</div>`).join("")}</div>
      <p class="bgoal"><b>The point:</b> ${esc(plan.g)}</p>
    </div>`:""}
    ${d.hand&&d.hand.length?`<div class="bhand">
      <h4>Dream starting hand</h4>
      <div class="bhcards">${d.hand.map(c=>
        `<button class="bhc" data-bo="${esc(c.f)}">
          <span class="bhcost">${c.c}</span>
          <span class="bhn">${esc(c.n)}<em>${esc(c.v)}</em></span>
          ${c.ik?`<span class="bhink" title="Inkable">◆</span>`:""}
        </button>`).join("")}</div>
      <p class="bhnote">Seven you'd keep without thinking — land drops, the Coconut,
        and an early payoff. ◆ marks a card you can ink.</p>
    </div>`:""}
    <div class="binks">${d.inks.map(i2=>
      `<span><i style="background:${HEX[i2]}"></i>${esc(i2)}</span>`).join("")}
      <b>${d.total} cards</b><span class="bsing">singleton · ${esc(d.co.n)} ×4</span>
      <span class="bkey">★ best in its slot</span></div>
    <div class="bcols">${Object.keys(byCost).sort((a,b)=>a-b).map(k=>`
      <div class="bcol"><h4>${k==7?"7+":k} ink <span>${byCost[k].reduce((a,x)=>a+x.q,0)}</span></h4>
        ${byCost[k].map(x=>`<button class="bcard${star[k]===x.c.f?" top":""}" data-bo="${esc(x.c.f)}">
          ${star[k]===x.c.f?`<span class="bstar">★</span>`:""}
          ${x.q>1?`<b>${x.q}×</b>`:""}${esc(x.c.n)}<em>${esc(x.c.v)}</em></button>`).join("")}
      </div>`).join("")}</div>
    <div class="bacts">
      <button class="btn go" data-btake="${i}">Copy &amp; edit in deck builder</button>
      <button class="btn" data-bcopy="${i}">Copy list</button>
    </div></div>`;
}
function renderGuide(){
  const g=$("guide");
  const co=G.coco!=null?COCO[G.coco]:null;
  const inks=co&&G.pair?[...coInks(co),...G.pair]:null;
  const iset=inks?new Set(inks):null;
  const cop=G.copies!==null;
  const state=i=>{const reached=[true,!!co,!!(co&&G.pair),!!(co&&G.pair&&cop),
                    !!(co&&G.pair&&cop&&G.staples!==null),
                    !!(co&&G.pair&&cop&&G.staples!==null&&effMode())][i];
    const doneArr=[!!co,!!G.pair,cop,G.staples!==null,!!effMode(),false];
    return !reached?"locked":(doneArr[i]?"done":"active")};
  const step=(i,title,body)=>`<div class="gstep ${state(i)}">
    <h3><span class="num">${i+1}</span>${title}</h3><div class="gbody">${body}</div></div>`;

  /* 1 — coconut, or a finished deck to take away and edit */
  let s1=`<div class="gtabs">
      <button data-gt="pick" class="${GTAB==="pick"?"on":""}">Choose your Coconut</button>
      <span class="or">or</span>
      <button data-gt="built" class="${GTAB==="built"?"on":""}">See fully built decks</button>
    </div>`;
  if(GTAB!=="built"){
    s1+=(co?`<div class="cocopick"><img src="${cocoImg(co)}" alt="${esc(co.n+(co.v?" - "+co.v:""))}">
        <div><b>${esc(co.n)}</b>${co.v?`<i>${esc(co.v)}</i>`:""}
        <p>${coInks(co).map(i2=>`<span class="dot" style="background:${HEX[i2]}"></span>${i2}`).join(" ")}</p>
        <p>${esc(co.t)}</p>${G.cocoOpen?"":`<button class="btn" id="gchange">Change Coconut</button>`}</div></div>`:"")+
      (co&&!G.cocoOpen?"":`<p class="s">Pick one. Its ink locks in. All ${COCO.length} beta Coconuts.</p>
      <input class="mini" id="gq" placeholder="Search Coconuts" style="max-width:320px">
      <div class="cocogrid" id="cg" style="margin-top:9px"></div>`);
  }else{
    const openIdx=GBUILT;
    s1+=`<p class="s">A complete, legal 60 for every Coconut — three inks, singleton,
      four copies of the Coconut itself. Built from the card database rather than typed
      out by hand, so they stay current as sets land. Take one and change everything.</p>
      <div class="blist">`;
    COCO.forEach((c,i)=>{
      const on=openIdx===i;
      s1+=`<div class="brow${on?" on":""}">
        <button class="bhead" data-built="${i}">
          <img class="bimg" src="${cocoImg(c)}" alt="" loading="lazy" decoding="async">
          <span class="bn">${coInks(c).map(i2=>`<span class="dot" style="background:${HEX[i2]}"></span>`).join("")}${esc(c.n)} <em>${esc(c.v)}</em></span>
          <span class="bt">${esc(c.t)}</span>
          <span class="bx">${on?"▾":"▸"}</span>
        </button>
        ${on?builtPanel(i):""}
      </div>`});
    s1+=`</div>`;
  }

  /* 2 — inks. A single-ink Coconut needs two more (the historic case, and
     still the common one); a duo Coconut (Beta 2) has already locked two of
     the format's three inks and needs only one. Same ranking underneath
     (pairFor's `need` says which), just a different button shape. */
  let s2,needBadge=2;
  if(!co) s2=`<p class="gprev">Pick a Coconut first — then you'll choose the rest of your inks, with the
     strongest option${needBadge===1?"":"s"} highlighted (rainbow when it's a clear favourite).</p>`;
  else{
    const pr=pairFor(G.coco);
    needBadge=pr.need;
    const base=coInks(co);
    const label={strong:"clear favourite",ok:"solid pick",close:"close call — the alternatives are just as playable"}[pr.conf];
    s2=`<p class="s">${base.map(i=>`<span class="dot" style="background:${HEX[i]}"></span>`).join("")}<b>${esc(base.join(" / "))}</b> ${base.length>1?"are":"is"} locked by ${esc(co.n)}.
      Ranked by how densely each ink actually supports this Coconut —
      <b style="color:${pr.conf==="strong"?"var(--good)":pr.conf==="ok"?"var(--good)":"var(--gold)"}">${label}</b>.</p><div class="pairs">`;
    if(pr.need>=2){
      const opts=[];
      for(let i=0;i<pr.all.length;i++)for(let j=i+1;j<pr.all.length;j++)opts.push([pr.all[i][0],pr.all[j][0]]);
      const isRec=p=>(p[0]===pr.best[0]&&p[1]===pr.best[1])||(p[0]===pr.best[1]&&p[1]===pr.best[0]);
      opts.sort((a,b)=>(isRec(b)?1:0)-(isRec(a)?1:0));
      opts.forEach(p=>{
        const sel=G.pair&&G.pair[0]===p[0]&&G.pair[1]===p[1];
        const st=[...inkStaples(p[0]),...inkStaples(p[1])];
        s2+=`<button class="pair${isRec(p)?" rec-"+pr.conf:""}${sel?" on":""}" data-p="${p[0]}|${p[1]}">
          <div class="t"><span class="dot" style="background:${HEX[p[0]]}"></span>${p[0]}
            <span class="dot" style="background:${HEX[p[1]]};margin-left:6px"></span>${p[1]}
            ${isRec(p)?`<span class="tag">${pr.conf==="strong"?"BEST":"RECOMMENDED"}</span>`:""}</div>
          <div class="stap">${st.map(c=>`<div>${esc(c.n)}${c.v?" – "+esc(c.v):""}</div>`).join("")||"<div>no staples tagged</div>"}</div>
        </button>`});
    }else{
      /* Duo Coconut: only one ink left to fill, so each option is a single
         ink rather than a combination — same ranking, same staples preview. */
      pr.all.forEach(([ink])=>{
        const sel=G.pair&&G.pair[0]===ink;
        const isRec=ink===pr.best[0];
        const st=inkStaples(ink);
        s2+=`<button class="pair${isRec?" rec-"+pr.conf:""}${sel?" on":""}" data-p="${ink}">
          <div class="t"><span class="dot" style="background:${HEX[ink]}"></span>${ink}
            ${isRec?`<span class="tag">${pr.conf==="strong"?"BEST":"RECOMMENDED"}</span>`:""}</div>
          <div class="stap">${st.map(c=>`<div>${esc(c.n)}${c.v?" – "+esc(c.v):""}</div>`).join("")||"<div>no staples tagged</div>"}</div>
        </button>`});
    }
    s2+=`</div>`;
  }

  /* 3 — how many copies of the Coconut itself (it's the one card exempt from singleton) */
  let s3c;
  if(!inks) s3c=`<p class="gprev">Your Coconut is the one card that ignores the singleton rule —
     you'll choose how many copies to run.</p>`;
  else{
    const self=CARDS.find(x=>x.n===co.n&&x.v===co.v);
    const have=self?(deck().cards[self.f]||0):0;
    const ex=COCO_EXTRA[co.n],exC=ex?CARDS.find(x=>x.f===ex.f):null;
    const exHave=exC?(deck().cards[exC.f]||0):0;
    s3c=`<p class="s">Everything else in a Coconut deck is singleton, but
      <b>${esc(co.n)} – ${esc(co.v)}</b> can go up to 4.</p>
      <div class="acts">
        <button class="btn go" id="gc4">Add 4× ${esc(co.n)}</button>
        <button class="btn" id="gc1">Add one</button>
        <button class="btn" id="gcskip">Skip</button></div>
      ${exC?`<div class="gsum" style="margin-top:9px">🍭 ${esc(co.n)} names an item —
         ${esc(ex.why)}.<div class="acts" style="margin-top:7px">
         <button class="btn go" id="gcx">Add ${ex.n} ${esc(exC.n)}</button></div></div>`:""}
      ${G.copies==="skip"?`<div class="st">Skipped — add it later from Search.</div>`
        :G.copies!==null?`<div class="gsum">✓ ${have}× ${esc(co.n)} in the deck${
            exHave?` · ${exHave}× ${esc(exC.n)}`:""}.</div>`:""}
      <div class="mgrid">${[self,...(exC?[exC]:[])].filter(Boolean).map(c=>miniCard(c)).join("")}</div>`;
  }

  /* 4 — staples + everything legal in those inks */
  let s3;
  if(!(inks&&cop)) s3=`<p class="gprev">Once your inks are set, you'll see every card legal in them plus the
     tagged staples — add all the staples at once, or pick through them by hand.</p>`;
  else{
    const st=inks.flatMap(i=>inkStaples(i));
    const pool=inkCards(inks);
    s3=`<p class="s">${pool.length.toLocaleString()} cards are legal in ${esc(inks.join(" / "))}.
      ${st.length} are tagged staples.</p>
      <div class="acts"><button class="btn go" id="gy">Add all ${st.length} staples</button>
        <button class="btn" id="gn">See the staples</button>
        <button class="btn" id="gskip">Skip for now</button></div>
      ${G.staples===true?`<div class="gsum">✓ Staples added.</div>`
        :G.staples==="skip"?`<div class="st">Skipped — you can come back to this any time.</div>`
        :G.staples===false?`<div class="st">Browsing the pool — click any card to add it.</div>`:""}
      ${G.staples==="skip"?"":`<div class="mgrid">${(G.staples===false?pool.slice(0,60):st).map(c=>miniCard(c)).join("")}</div>`}
      ${G.staples===false?`<div class="st">Showing the first 60 — use the Search tab for the full ${pool.length.toLocaleString()}.</div>`:""}`;
  }

  /* 5 — recommended synergies */
  let s4;
  if(!(inks&&cop&&G.staples!==null)) s4=`<p class="gprev">Next you'll see which search filters actually matter
     for your Coconut — they get highlighted green over in the Search tab.</p>`;
  else{
    const recIds=co.rec||[];
    s4=`<p class="s">These are the filters that pay off for ${esc(co.n)}. Recommended mode highlights them green.</p>
      <div class="acts"><button class="btn${effMode()==="rec"?" go":""}" id="gr">Recommended</button>
        <button class="btn${effMode()==="man"?" go":""}" id="gm">Manual</button></div>
      ${!G.mode&&effMode()==="rec"?`<div class="gsum">✓ On automatically — you have ${G.coco!=null?"a Coconut":"a tribal core"} to build around.</div>`:""}
      <div class="mlist">${recIds.map(id=>{const a=AB.find(x=>x.id===id);if(!a)return"";
        const n=inkCards(inks).filter(c=>c.ab.has(id)).length;
        return `<button data-rec="${id}">${a.l} · ${n}</button>`}).join("")}</div>`;
  }

  /* 6 — hand off */
  let s6=(inks&&cop&&G.staples!==null&&effMode())
    ? `<p class="s">Your deck has <b>${dtotal()}</b> cards. Take it to the full builder to finish.</p>
       <div class="acts"><button class="btn go" id="gdone">Go to deck builder →</button></div>`
    : `<p class="gprev">Finally, jump into the main Search &amp; Deck tab with everything carried over.</p>`;

  g.innerHTML=`<div class="glayout"><div>`+
    step(0,"Choose your Coconut",s1)+step(1,needBadge===1?"Pick one more ink":"Pick two more inks",s2)+
    step(2,"How many Coconuts?",s3c)+step(3,"Staples",s3)+
    step(4,"Recommended synergies",s4)+step(5,"Build it",s6)+
    `</div><aside class="gside" id="gdeck"></aside></div>`;
  renderGuideDeck();

  /* step 1 wiring */
  /* The Coconut grid only exists in the "pick" tab. */
  const draw=()=>{if(!$("cg"))return;
    const q=($("gq")&&$("gq").value||"").toLowerCase();
    $("cg").innerHTML=COCO.map((c,i)=>({c,i})).filter(({c})=>!q||(c.n+" "+c.v+" "+coInks(c).join(" ")+" "+c.t).toLowerCase().includes(q))
      .map(({c,i})=>`<button class="cococ${G.coco===i?" on":""}" data-c="${i}" title="${esc(c.t)}">
        <img src="${cocoImg(c)}" alt="${esc(c.n+(c.v?" - "+c.v:""))}" loading="lazy" decoding="async" width="420" height="601">
        <b>${coInks(c).map(i2=>`<span class="dot" style="background:${HEX[i2]}"></span>`).join("")}${esc(c.n)}</b>
        ${c.v?`<i>${esc(c.v)}</i>`:""}</button>`).join("");
    $("cg").querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{
      const i=+b.dataset.c;G.coco=i;G.cocoOpen=false;G.pair=null;G.copies=null;G.staples=null;G.mode=null;
      const d=deck();d.fmt="coconut";d.coco=i;markDirty(true);
      S.ink=new Set(coInks(COCO[i]));renderGuide();render()})};
  draw();
  if($("gq"))$("gq").oninput=draw;
  if($("gchange"))$("gchange").onclick=()=>{G.cocoOpen=true;renderGuide()};

  g.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{
    G.pair=b.dataset.p.split("|");G.copies=null;G.staples=null;G.mode=null;
    S.ink=new Set([...coInks(COCO[G.coco]),...G.pair]);renderGuide();render()});
  /* step 3 — copies of the Coconut, and its named item if it has one */
  const setCopies=(f,n)=>{const d=deck();d.cards[f]=n;markDirty(true)};
  if($("gc4"))$("gc4").onclick=()=>{const s=CARDS.find(x=>x.n===co.n&&x.v===co.v);
    if(s)setCopies(s.f,4);G.copies=4;toast("Added 4× "+co.n);renderGuide();render()};
  if($("gc1"))$("gc1").onclick=()=>{const s=CARDS.find(x=>x.n===co.n&&x.v===co.v);
    if(s)setCopies(s.f,1);G.copies=1;toast("Added 1× "+co.n);renderGuide();render()};
  if($("gcskip"))$("gcskip").onclick=()=>{G.copies="skip";renderGuide()};
  if($("gcx"))$("gcx").onclick=()=>{const ex=COCO_EXTRA[co.n],c=CARDS.find(x=>x.f===ex.f);
    if(c){setCopies(c.f,ex.n);toast("Added "+ex.n+" "+c.n)}
    if(G.copies===null)G.copies="skip";renderGuide();render()};
  if($("gy"))$("gy").onclick=()=>{let n=0;const d=deck();
    inks.forEach(i=>inkStaples(i).forEach(c=>{if(c.f!==BANNED){d.cards[c.f]=(d.cards[c.f]||0)+1;n++}}));
    markDirty(true);G.staples=true;toast("Added "+n+" staples");renderGuide();render()};
  g.querySelectorAll("[data-gt]").forEach(b=>b.onclick=()=>{
    GTAB=b.dataset.gt;save("fs3_gtab",GTAB);renderGuide()});
  g.querySelectorAll("[data-built]").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.built;GBUILT=(GBUILT===i?null:i);renderGuide()});
  g.querySelectorAll("[data-bo]").forEach(b=>{
    b.onclick=()=>openM(b.dataset.bo);
    /* Same 2-second hover preview the card grid uses, so you can read a card
       without leaving the list. */
    const c=CARDS.find(x=>x.f===b.dataset.bo);
    if(c)cardPreview(b,c);});
  g.querySelectorAll("[data-bcopy]").forEach(b=>b.onclick=()=>{
    const d=cocoDeck(+b.dataset.bcopy);if(!d)return;
    const txt=Object.entries(d.cards).map(([f,q])=>q+" "+f).join("\n");
    navigator.clipboard.writeText(txt).then(()=>toast("Deck list copied"),()=>toast("Copy failed"))});
  g.querySelectorAll("[data-btake]").forEach(b=>b.onclick=async()=>{
    const i=+b.dataset.btake,d=cocoDeck(i);if(!d)return;
    /* Its own deck, not a merge into whatever you had open — otherwise the
       first thing you'd do is untangle it from your current build. */
    let name=d.co.n+" – "+d.co.v;
    let n=2;while(DECKS.list[name])name=d.co.n+" – "+d.co.v+" "+(n++);
    DECKS.list[name]={fmt:"coconut",coco:i,cards:{...d.cards}};
    DECKS.cur=name;stampEdited(name);saveDecks();markDirty(false);
    G.coco=i;G.pair=d.inks.slice(coInks(d.co).length);G.copies=4;G.mode=null;
    S.ink=new Set(d.inks);S.limit=150;
    SUB="manual";save("fs3_sub",SUB);showTab("tDeck");
    render();paintDeckBar();
    toast(`Loaded “${name}” — edit away`)});
  if($("gn"))$("gn").onclick=()=>{G.staples=false;renderGuide()};
  if($("gskip"))$("gskip").onclick=()=>{G.staples="skip";renderGuide()};
  if($("gr"))$("gr").onclick=()=>{G.mode="rec";renderGuide();render();toast("Filters highlighted green in Search")};
  if($("gm"))$("gm").onclick=()=>{G.mode="man";renderGuide();render()};
  g.querySelectorAll("[data-rec]").forEach(b=>b.onclick=()=>{
    S.ab.add(b.dataset.rec);S.limit=150;render();showSearch();toast("Filter applied in Search")});
  g.querySelectorAll("[data-madd]").forEach(b=>b.onclick=()=>{addCard(b.dataset.madd);renderGuide()});
  if($("gdone"))$("gdone").onclick=()=>{award("coconut");showSearch()};
}
/* The guided view shows the builder's own deck panel; newbuilder/nb.js moves
   it into #gdeck. This is the fallback if that panel isn't there. */
function renderGuideDeck(){
  if($("gdeck"))renderDeck("gdeck");
}
