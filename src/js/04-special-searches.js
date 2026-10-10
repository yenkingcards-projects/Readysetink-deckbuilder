/* Ability chips, grouped. `re` runs on non-keyword ability text (`ef`), which
   already excludes keyword reminder text — that's what kept songs out of the
   cost-reduction filter. */
/* Ben's call: "Watch out" and "Trivia" come out of the filter list too. The
   note KINDS themselves are untouched — you can still write one and it still
   renders on the card with its own icon and colour. This only controls which
   of them earn a chip in Special searches. */
const HIDDEN_KINDS=["take","video","watch","trivia"];

/* ---- location and item interaction ----------------------------------------
   "text:location" returns 131 cards and mixes two opposite decks together: the
   cards that BUILD a location board and the cards that tear one down. Ben
   wanted them separated, so each direction gets its own predicate.

   LOC_HELP is deliberately written as a list of things a location deck DOES —
   standing at one, moving to one, playing one cheaper, healing one, buffing
   your own — rather than "mentions location and doesn't say banish". The
   negative phrasing fails on cards that do both, and on the three locations
   whose payoff IS banishing themselves (Pride Lands - Jungle Oasis, Sugar Rush
   Speedway - Finish Line, Sleepy Hollow - The Bridge), which are location
   payoffs and not location hate.

   `characters? here` is in the positive list on purpose: on a Location card,
   "here" means "at this location", so a location that rewards you for standing
   on it is exactly the payoff a location deck is looking for. */
const LOC_HELP=new RegExp([
  "at a location","at locations","your locations",
  "locations? (?:gain|gains|get|gets) ",
  "move\\w* (?:[^.]{0,70}?)\\bto (?:a|that|another|one of your|the same) location",
  "whenever you play a location","play a location (?:card )?(?:from|with)",
  "for each location you have in play","if you have a location in play",
  "next location you play","less to play locations",
  "remove up to \\d+ damage from chosen (?:character or )?location",
  "reveal a location card","return a location card from your discard",
  "location card named","this location gets \\+","location's ◊",
  "banish this location","characters? here\\b"
].join("|"),"i");
/* The mirror: everything that removes, bounces, inks or burns a location that
   isn't yours. "banish this location" is excluded by construction — it never
   appears here — and so is anything scoped "of yours". */
const LOC_HATE=new RegExp([
  "banish (?:chosen|all opposing) (?:item or )?location",
  "one of their locations",
  "deal (?:\\d+ )?damage to chosen (?:damaged )?character or location",
  "deal \\d+ damage to chosen location",
  "return (?:a )?chosen [^.]{0,60}?\\blocation\\b[^.]{0,45}?to their player's hand",
  "put chosen item or location into its player's inkwell",
  "discards? a location card",
  "item or location of theirs and banish"
].join("|"),"i");
/* Items get the same treatment, minus the synergy half — "your items" already
   has plenty of routes through the Inventor and Detective classifications.
   `(?!\\s+of yours)` is what keeps the eight cards that sacrifice their OWN
   item for value (Maurice, Gaston - Arrogant Showoff, Belle - Apprentice
   Inventor) out of a removal list. */
const ITEM_HATE=new RegExp([
  "banish chosen item(?! of yours)",
  "banish all opposing items","one of their items",
  "return chosen [^.]{0,60}?\\bitem\\b[^.]{0,45}?to (?:its|their) player's hand",
  "put chosen item(?: or location)? into its player's inkwell",
  "opposing items","item or location of theirs and banish"
].join("|"),"i");
/* Pings: one damage at a time. The chip exists because a Robin's Bow deck and
   a Be Prepared deck are not the same deck — pings want damage-count payoffs
   (Ratigan's Party, damaged-character triggers), not board wipes. Moving a
   counter counts: the damage still lands on something of theirs. */
/* Multiplayer punishment: effects that hit EVERY opponent at once. In a
   two-player game these read as ordinary removal; at a four-player table they
   are three-for-ones, which is a completely different card. */
const ALLOPP=/each opponent|all opponents|each other player|each opposing player|each of your opponents|opposing players|each player|all opposing characters|each opposing character/i;
/* Songs keep their whole effect in `tx`, not `ef` — Sudden Chill's "Each
   opponent chooses and discards a card" was invisible to anything reading `ef`.
   These two chips read the printed text with the reminder text in brackets
   stripped, which is where the multiplayer cards actually live. */
const PLAINTX=c=>(c.tx||"").replace(/\([^)]*\)/g," ");
/* Lore drain: making them lose lore, rather than gaining it yourself. */
const LOREDRAIN=/loses? \d+ lore|lose \d+ lore|loses? lore|no lore this turn|can't gain lore|doesn't gain lore/i;
/* The two specific table-taxes, narrowed. Both require the all-opponents
   phrasing and the effect to sit in the SAME sentence — split on full stops
   first — because a card can easily say "each opponent" in one ability and
   "discard" in an unrelated one. */
const inSameSentence=(re1,re2)=>t=>t.split(/(?<=[.!?])\s+/)
  .some(s=>re1.test(s)&&re2.test(s));
const ALLOPP_DISCARD=(()=>{const f=inSameSentence(ALLOPP,/discards?/i);
  return {test:t=>f(t||"")}})();
const ALLOPP_LORE=(()=>{const f=inSameSentence(ALLOPP,/loses? \d+ lore|loses? lore/i);
  return {test:t=>f(t||"")}})();
/* Global = happens to EVERY player, you included. "Each player", "all players",
   "players can't", and the symmetric "no character can". Deliberately excludes
   "each opponent", which is the one-sided version above. */
const GLOBAL=/each player|all players|every player|players can't|no player|each player's|all characters|no character can|characters can't/i;
/* Bounce, split by whose card goes home. "Return X to their player's hand" and
   "chosen character to their hand" are the removal half; "return this/your
   character to your hand" is the re-trigger half. */
const BOUNCE_SELF=/returns?[^.]{0,70}\bto (?:your|his or her own) hand\b|returns? this (?:character|item|location)/i;
const BOUNCE_OPP=/returns?[^.]{0,70}\bto (?:their|its) (?:player'?s? )?hand\b|returns? (?:chosen )?oppos\w+[^.]{0,50}\bhand\b|returns? [^.]{0,50}\bopponent'?s?\b[^.]{0,40}\bhand\b/i;
/* Cards that WANT cards in the discard — pay-offs for discarding, and cards
   that play or fetch out of the discard pile. */
const DISCARD_PAYOFF=/(whenever|when) (?:you|a card is|an? card).{0,40}discard|discard(?:s|ed)?[^.]{0,40}(?:you may|draw|gain|deal)|from your discard|in your discard|return .{0,30}from your discard|play .{0,30}from your discard/i;
/* Sing Together decks want cards that scale with HOW MANY characters sang, or
   that make singing cheaper/wider. The keyword itself is the other chip. */
const SINGTOG_PAY=c=>{
  const t=PLAINTX(c);
  return /sing together/i.test(t)&&!c.kw.some(k=>k[0]==="Sing Together")
    || /each character (?:that|who) sang|characters that sang|for each .{0,25}sing/i.test(t)
    || /(?:can|may) (?:also )?sing|sing (?:songs|this song) .{0,25}(?:as if|for free)|additional character.{0,30}sing/i.test(t)};
const PING=new RegExp([
  /* One or two at a time, from any trigger — on play, on quest, on banishing
     something in a challenge (Tinker Bell - Giant Fairy), whenever an item is
     banished. Three or more is removal, not a ping, and belongs to a different
     deck. */
  "deals? (?:up to )?[12] damage",
  "deal (?:up to )?[12] damage",
  "puts? (?:up to )?[12] damage counter",
  "puts? a damage counter",
  "move (?:up to )?[12] damage counter"
].join("|"),"i");

/* ---- the deck-building categories -------------------------------------
   Everything below answers "what job does this card do in a deck", which is
   a different question from "what does the card say". Each one is measured
   against the real card pool before it ships: a filter that returns 400
   cards has told you nothing, and one that returns none is a dead chip. */
/* Clears the board rather than answering one thing. Two or more damage to
   everything counts; one damage to a board is a sweep that kills almost
   nothing, and `ping` already finds those. "each of your other characters" is
   excluded outright — a card that damages YOUR OWN board is an engine piece
   (Pepa Madrigal), and it was the one thing making this chip lie. */
const BOARDWIPE=new RegExp([
  "banish (all|each|every)",
  "banish (?:chosen )?(?:opposing )?characters?[^.]{0,40}(?:each|all) (?:other )?(?:opposing )?character",
  "deals? [2-9]\\d* damage to (?!each of your)(each|all|every)",
  "each (?:opposing|other) character (?:gets|is banished)"
].join("|"),"i");
/* Making their board worse, as opposed to making yours better. Two chips
   because they fail differently: a stat drop can still be challenged through,
   a restriction cannot be played around at all. */
const STATDOWN=/gets? -\d+\s*(¤|⛉)/i;
/* The word "opposing" or "opponent" has to be in the same sentence. A bare
   "they can't quest or challenge" is usually the DRAWBACK on your own card
   (Celia Mae readies one of yours and then benches it), which is the opposite
   of what someone opening this chip is shopping for. */
const RESTRICT=new RegExp([
  "oppos\\w+[^.]{0,80}can'?t (?:quest|challenge|ready|be played|gain lore)",
  "opponents?[^.]{0,80}can'?t (?:quest|challenge|ready|play|gain lore)",
  "can'?t (?:quest|challenge|ready)[^.]{0,40}(?:opposing|opponent)"
].join("|"),"i");
/* Cards that come back. The discard pile is the second hand in this game and
   nothing in the filter list used to find the cards that treat it that way. */
const RECUR=/from your discard/i;
/* The item half of the pair we already had for locations. */
const ITEM_HELP=new RegExp([
  "\\byour items?\\b","an item (?:card )?(?:from|into|you)",
  "whenever you play an item","item card (?:from|named)",
  "for each item you have","if you have an item",
  "items? (?:gain|get|gets|cost)","item into your inkwell","play an item"
].join("|"),"i");
/* Pays you for having a board rather than for having one good character —
   the thing a swarm deck is actually shopping for. */
const GOWIDE=new RegExp([
  "for each (?:of your )?(?:other )?character",
  "if you have \\d+ or more (?:other )?character",
  /* A verb has to follow, or "move him and ONE OF your other characters"
     lands here as though it were a swarm payoff. */
  "(?:your|his|her|their) other characters (?:gain|get|gets|have|are|can|may)",
  "each of your (?:other )?characters (?:gain|get|gets)"
].join("|"),"i");
/* Two cards in the whole game. That is the true answer, not a broken filter —
   same reasoning as the money chips, which are short on purpose. */
/* Kept although its chip is retired — it is the one tested definition of
   milling in the file, and re-deriving it later from memory would be worse
   than leaving eight lines of regex alone. */
const MILLTHEM=/put(?:s)? the top .{0,40}(?:of|from) (?:their|his or her|your opponent'?s?) deck into[^.]{0,30}discard/i;
/* Inkwell as a resource you interact with, beyond inking one card a turn —
   ramp is the separate chip for putting more IN. */
const INKWELL=/(?:from|in) your inkwell|cards? in your inkwell|inkwell into your hand/i;
/* Two body-quality tests, both rate-based rather than taste-based.
   QUESTER: lore at or above half the cost, rounded up — 2 by 3 ink, 3 by 5,
   4 by 7. A four-cost two-lore is average, and average is not a filter.
   CONTESTER: strength above its cost so it trades up, and willpower at least
   its cost so it survives being traded into. */
const isQuester =c=>c.ty==="Character"&&(c.lo||0)>=2&&(c.lo||0)*2>=c.c+1;
const isContester=c=>c.ty==="Character"&&(c.st||0)>c.c&&(c.wi||0)>=c.c;
/* The finisher — the card you're holding when you're on 14 and need to get to
   20. It sat unbuilt for a while because "finisher" is a word people use for
   whatever won them their last game, and a chip can't filter on that. What it
   CAN filter on is the two ways a card actually closes a game out, and both
   are countable:

     a body they can't answer — quests for 3 or more, and Evasive, Ward or
       "can't be challenged" means the turn you play it isn't a turn they get
       to trade with it. Three lore on its own isn't a finisher; three lore
       they have to sit and watch is.
     one big lore swing — the text puts up 3 or more lore in a single go, or
       scales ("gains lore equal to", "1 lore for each"). Two-lore effects are
       a tempo gain, not a closer, and they'd drag half the game in.

   Reminder text is stripped first for the same reason the strength chip does
   it. 58 cards, which is the size this should be: "Good lore for the ink" is
   224 and answers a different question — that one is about rate, this one is
   about the last four points of lore. */
const BIGLORE=/gains?\s+(?:[3-9]|\d\d)\s+lore|gains?\s+lore equal|gains?\s+\d+\s+lore for each/i;
const isFinisher=c=>{
  const t=(c.ef||"").replace(/\([^)]*\)/g," ");
  const unstoppable=c.kw.some(k=>k[0]==="Evasive"||k[0]==="Ward")||/can't be challenged/i.test(t);
  return (c.ty==="Character"&&(c.lo||0)>=3&&unstoppable)||BIGLORE.test(t);};

/* The order below is the order you build a deck in, not the order the rules
   manual is written in: who wins the game, what answers them, what pays for
   it, what it all combines with. Reference filters — timing, ability type,
   notes, money — sit at the bottom, because they answer questions you have
   about a card you already found rather than questions about your list. */
const GROUPS=[
 /* Staples stands alone. It is the only chip in the table that filters by YOUR
    list rather than by what a card does, so it never belonged in a group with
    mechanical filters — and it's the one most people want first. */
 {g:"Staples",chips:[
   {id:"staple",l:"★ Staples",fn:c=>isStar(c.f)},
   /* "Best legendaries" can't be a taste judgement in a filter, so it's two
      objective signals instead: it's on the staple list, or the market has
      decided it matters (a legendary nobody plays does not hold $10). Either
      way you get the ones worth building around rather than all 200. */
   {id:"bestleg",l:"Legendaries worth playing",
     fn:c=>c.r==="Legendary"&&(isStar(c.f)||(cardPrice(c)||0)>=10)}]},
 /* What a character is actually FOR. Every other group here filters on rules
    text; these two read the numbers, because the two jobs a body does — race
    on lore, or hold the board — are decided by the stat line and not by any
    ability. A deck that has drawn only one of these two loses to the other. */
 /* One chip, on purpose, and first: the group order below runs "who wins the
    game, then what answers them", and this is the who. Everything under it is
    a card you play because of what this one does. */
 {g:"Closing the game out",chips:[
   {id:"finisher",l:"Closes out the game",fn:isFinisher}]},
 {g:"What a character is for",chips:[
   {id:"quester",l:"Good lore for the ink",fn:isQuester},
   {id:"contest",l:"Trades up in a challenge",fn:isContester},
   {id:"chall",l:"Stronger when challenging",fn:c=>c.kw.some(k=>k[0]==="Challenger")},
   {id:"wide",  l:"Pays you for a full board",fn:c=>GOWIDE.test(c.ef||"")}]},
 {g:"Drawing and digging",chips:[
   {id:"draw", l:"Draws a card",        re:/draws?\s+(a|\d+)?\s*cards?/i},
   {id:"topx", l:"Digs into the top of your deck",re:/look at the top \d+/i},
   {id:"tutor",l:"Searches your deck",  re:/search(es)?\s+your\s+deck/i},
   /* The discard pile is the second hand in this game, and nothing in this
      list used to find the cards that treat it that way. */
   {id:"recur",l:"Brings cards back from the discard",fn:c=>RECUR.test(c.ef||"")},
   {id:"peek", l:"Looks at their hand",re:/reveals?\s+(their|your)\s+hand|looks?\s+at\s+(their|your)\s+hand/i}]},
 {g:"Getting rid of things",chips:[
   {id:"banish",l:"Banishes",       re:/banish/i},
   /* Answering the whole board is a different card slot from answering one
      thing, and a deck usually wants one or two of these and no more. */
   {id:"wipe",  l:"Clears the whole board",     fn:c=>BOARDWIPE.test(c.ef||"")},
   {id:"damage",l:"Deals damage",   re:/deals?\s+.{0,15}damage/i},
   {id:"ping",  l:"Chips off 1 or 2 damage",fn:c=>PING.test(c.ef||"")},
   // Rules 8.8.3 — Resist only reduces damage that is DEALT; put/moved damage ignores it
   {id:"pierce",l:"Damage Resist won't stop",re:/can't be reduced by Resist|(put|place)s?\s+(up to\s+)?\d+\s+damage counter|\bmove\s+(up to\s+)?\d+\s+damage[\s\S]{0,60}(opposing|opponent)/i},
   {id:"itemhate",l:"Gets rid of items",  fn:c=>ITEM_HATE.test(c.ef||"")},
   {id:"lochate",l:"Gets rid of locations",fn:c=>LOC_HATE.test(c.ef||"")}]},
 /* Making their board worse rather than yours better. Two chips because they
    fail differently: a stat drop can still be challenged through, and a
    restriction can't be played around at all. */
 {g:"Slowing them down",chips:[
   {id:"minus",   l:"Lowers their stats",fn:c=>STATDOWN.test(c.ef||"")},
   {id:"restrict",l:"Stops them questing or challenging",fn:c=>RESTRICT.test(c.ef||"")},
   {id:"discard", l:"Discard — anything that touches it",      re:/discard/i},
   {id:"loredrain",l:"Takes lore off them",   fn:c=>LOREDRAIN.test(PLAINTX(c))},
   ]},
 {g:"Bounce",chips:[
   /* Bounce splits in two because the two halves do opposite jobs: bouncing
      YOUR OWN character re-triggers its "when you play this" ability, bouncing
      THEIRS is tempo removal. One chip called "returns to hand" was hiding
      both behind each other. The union stays as a third chip for anyone who
      just wants the whole category. */
   {id:"bounceyou",l:"Bounce — back to YOUR hand",fn:c=>BOUNCE_SELF.test(c.ef||"")},
   {id:"bounceopp",l:"Bounce — back to THEIR hand",fn:c=>BOUNCE_OPP.test(c.ef||"")},
   {id:"bounce",l:"Bounce — any return to hand",   re:/(returns?|puts?)\s+.{0,25}(into|to)\s+(their|your|its)\s+hand/i}]},
 {g:"Ink, cost and tempo",chips:[
   {id:"cheap",l:"Costs less to play",re:/\bfor free\b|\bpays?\s+\d+\s*(\{I\}|⬡)?\s*less\b|\bcosts?\s+\d+\s*(\{I\}|⬡)?\s*less\b/i},
   // ramp = extra ink beyond the one free ink-a-card action each turn
   {id:"ramp", l:"Extra ink",re:/into your inkwell|ink an additional card|additional card in your inkwell/i},
   /* Ramp puts cards IN; this is everything else you can do with an inkwell
      once they're there. Twelve cards, and they are the whole mechanic. */
   {id:"inkwell",l:"Does something with your inkwell",fn:c=>INKWELL.test(c.ef||"")},
   {id:"shift",l:"Has Shift (any variant)",fn:c=>c.kw.some(k=>/shift/i.test(k[0]||""))},
   {id:"ready", l:"Readies characters",re:/ready\s+(chosen|your|this)/i},
   {id:"exert", l:"Costs you an exert", fn:c=>c.at.includes("activated")||/\{E\}\s*[-–—]|⟳\s*[-–—]/.test(c.tx)}]},
 {g:"Making your characters better",chips:[
   {id:"lore", l:"Gains bonus lore",         re:/gains?\s+\d+\s+lore/i},
   /* Bonus strength. Reminder text is stripped first: "Challenger +1 (They get
      +1 ¤ while challenging)" is a conditional combat bonus, not a lasting buff,
      and leaving it in inflated this from 125 cards to 159. Matters because the
      Sisu - Emboldened Warrior Coconut only counts strength you actually have. */
   {id:"pump",l:"Gets bonus strength",
     fn:c=>/\bgets?\s*\+\d+\s*¤/.test((c.ef||"").replace(/\([^)]*\)/g," "))},
   {id:"tough",l:"Gets bonus willpower",
     fn:c=>/\bgets?\s*\+\d+\s*⛉/.test((c.ef||"").replace(/\([^)]*\)/g," "))}]},
 {g:"Keeping your characters alive",chips:[
   {id:"heal",  l:"Heals damage off",     re:/removes?\s+(up to\s+)?\d*\s*damage/i},
   {id:"nochal",l:"Can't be challenged",re:/can't be challenged/i}]},
 /* Cards that care about something else in your deck. This is the group you
    open once you know what the deck is ABOUT — everything here is a payoff
    looking for the thing it pays off. */
 {g:"Cards that care what else you're playing",chips:[
   {id:"tribal",l:"Boosts one classification",fn:c=>c.tribal.length>0},
   /* Lilo & Stitch is one of the few franchises with a matching mechanical
      classification, and the two don't fully overlap: Alien picks up the
      Experiments and the Galactic Council cards that aren't filed under the
      film, while the film picks up Nani and David, who aren't Aliens. A deck
      wants both, so the chip is the union. */
   {id:"lilo",l:"Lilo & Stitch + Aliens",
     fn:c=>c.sto==="Lilo & Stitch"||c.sub.includes("Alien")},
   /* The item half of the pair we already had for locations. */
   {id:"itemsyn",l:"Cares about your items",fn:c=>ITEM_HELP.test(c.ef||"")},
   {id:"locsyn", l:"Cares about your locations",fn:c=>LOC_HELP.test(c.ef||"")},
   /* Cards that WANT to be in the discard — Lilo - Escape Artist paying you for
      your own discards, anything that plays from or returns out of the
      discard pile. The engine half of a discard deck, as opposed to the
      "make them discard" half in Slowing them down. */
   {id:"selfmill",l:"Wants to be discarded",fn:c=>DISCARD_PAYOFF.test(c.ef||"")},
   /* Boost. The keyword pool is 32 cards, but another 10 cards talk about Boost
      without having it (Donald's own payoff, the Scrooge/DuckTales support), so
      this chip is the union — those cards belong in a Boost deck too. */
   {id:"boost",l:"Boost — has it or wants it",
     fn:c=>c.kw.some(k=>k[0]==="Boost")||/\bboost\b/i.test(c.tx||"")},
   /* Cheap Boost = play it AND boost it for 4 ink or less. Combined cost is the
      right lens because Donald - Fred Honeywell now discounts BOTH halves, so a
      2-cost/Boost-2 card and a 3-cost/Boost-1 card are equally early plays.
      Ben's first cut was "cost < 3 and Boost exactly 1" — that is one single
      card in the whole game, so it would have been a dead filter. */
   {id:"boostcheap",l:"Cheap Boost — play and boost for 4",
     fn:c=>{const b=(c.kw.find(k=>k[0]==="Boost")||[])[1];
       return b!=null&&(c.c+b)<=4}}]},
 {g:"Songs",chips:[
   {id:"sing",   l:"Pays you for singing",re:/sings?\s+a\s+song|whenever\s+.{0,40}\bsings\b/i},
   {id:"singtog",l:"Sing Together",     fn:c=>c.kw.some(k=>k[0]==="Sing Together")},
   /* Sing Together needs a pile of singers, so what a Sing Together deck is
      really shopping for is cards that pay out PER SINGER — the ones that get
      better the more characters you tap into the song. */
   {id:"singtogpay",l:"Pays you per singer",fn:c=>SINGTOG_PAY(c)}]},
 /* Cards that change value with the number of players at the table. */
 {g:"Multiplayer",chips:[
   {id:"allopp", l:"Hits every opponent",fn:c=>ALLOPP.test(PLAINTX(c))},
   /* The two specific ways a card taxes the whole table. Each one has to see
      BOTH the all-opponents phrasing and the effect in the same sentence,
      otherwise "each opponent" plus an unrelated discard elsewhere on the card
      matches. Songs keep their effect in tx, hence PLAINTX. */
   {id:"alldisc",l:"All opponents discard",fn:c=>ALLOPP_DISCARD.test(PLAINTX(c))},
   {id:"alllore",l:"All opponents lose lore",fn:c=>ALLOPP_LORE.test(PLAINTX(c))},
   /* Everything that happens to EVERYONE, you included. Symmetrical effects
      play completely differently from one-sided ones — you build around being
      the player who minds least. */
   {id:"global", l:"Hits everyone, you included",fn:c=>GLOBAL.test(PLAINTX(c))}]},
 {g:"When it happens",chips:[
   {id:"etb",   l:"When you play it",     re:/when you play this/i},
   {id:"onq",   l:"When it quests",        re:/whenever this character quests/i},
   {id:"onban", l:"When it's banished",       re:/when(ever)? this character is banished/i},
   {id:"sot",   l:"Start of turn",   re:/at the start of your turn/i},
   {id:"eot",   l:"End of turn",     re:/at the end of your turn/i},
   {id:"onchal",l:"When challenged", re:/when(ever)? this character is challenged/i}]},
 {g:"Ability type",chips:[
   {id:"activated",l:"Activated",fn:c=>c.at.includes("activated")},
   {id:"triggered",l:"Triggered",fn:c=>c.at.includes("triggered")},
   {id:"static",   l:"Static",   fn:c=>c.at.includes("static")},
   {id:"vanilla",  l:"No rules text at all", fn:c=>!c.tx}]},
 /* Everything with extra reading attached — official Q&A, our own notes, or a
    particular flavour of note. */
 {g:"Notes & rulings",chips:[
   {id:"ruling", l:"Official ruling",     fn:c=>(c.ru||[]).length>0},
   {id:"rsinote",l:"Ready Set Ink note",  fn:c=>(c.rsi||[]).length>0},
   {id:"anynote",l:"Any extra notes",     fn:c=>(c.ru||[]).length>0||(c.rsi||[]).length>0},
   /* Ben's take and Video are written but not surfaced yet — flip HIDDEN_KINDS
      to [] when he's ready and both chips come back. */
   /* Label only — the kind's emoji stays on the note itself, where it carries
      meaning; in a row of filter chips it was just noise. */
   ...KINDS.filter(k=>!HIDDEN_KINDS.includes(k.k)).map(k=>({id:"nk_"+k.k,l:k.l,
     fn:c=>(c.rsi||[]).some(n=>(n.k||"ruling")===k.k)}))]},
 /* Money. Marked `money:true`, which takes it OUT of the ordinary group list
    and into its own always-closed block next to the Coconuts — the same
    treatment, for the same reason: it's a whole different question from "what
    does this card do", and nobody wants it open by default.

    It lives in GROUPS anyway (rather than being built separately) so that its
    chips get the same precomputed c.ab membership as every other chip, which
    is what makes the counts free. */
 {g:"💲 Money",money:true,chips:[
   /* Cheapest printing, so these mean "expensive however you buy it" rather
      than "has one pricey enchanted". Lorcana is a cheap game — these lists
      are short on purpose, and that is the true answer. */
   {id:"over40",l:"Costs over $40",fn:c=>(cardPriceMin(c)||0)>=40},
   {id:"over30",l:"Over $30",fn:c=>(cardPriceMin(c)||0)>=30},
   {id:"over20",l:"Over $20",fn:c=>(cardPriceMin(c)||0)>=20},
   {id:"over10",l:"Over $10",fn:c=>(cardPriceMin(c)||0)>=10},
   {id:"chaseprint",l:"Has a chase printing over $40",fn:c=>(cardPriceMax(c)||0)>=40},
   /* These two use the PLAYABLE copy's price, not the chase printing — the
      question is "can I afford to play it", and nobody has to buy the
      enchanted to play the card. */
   {id:"budgetgood",l:"★ Staples $10 or less",
     fn:c=>isStar(c.f)&&cardPrice(c)!=null&&cardPrice(c)<=10},
   {id:"chasegood", l:"★ Staples over $10",
     fn:c=>isStar(c.f)&&(cardPrice(c)||0)>10}]}
];
const AB=GROUPS.flatMap(g=>g.chips);
/* Plain-English routes into a chip. People don't search "pump" — they type
   "bonus strength" or "plus power". Enter on any of these turns the chip on. */
const CHIPWORDS={
 tough:["bonus willpower","plus willpower","more willpower","extra willpower",
        "willpower boost","bonus health","more health","extra health","tougher"],
 pump:["bonus strength","bonus power","plus strength","plus power","more strength",
       "more power","extra strength","extra power","strength boost","power boost",
       "gets stronger","buff strength","pump"],
 cheap:["cost reduction","cheaper","costs less","discount"],
 ramp:["ramp","more ink","extra ink"],
 draw:["card draw","draw cards"],
 heal:["heal","healing","remove damage"],
 banish:["removal","banish"],
 lore:["bonus lore","extra lore","more lore"],
 finisher:["finisher","closer","game ender","win the game","wins the game",
           "closes the game","last few lore","gets me to 20"],
 boost:["boost"],
 boostcheap:["cheap boost"],
 tribal:["tribal","tribe boost"],
 locsyn:["location synergy","locations","location deck","location payoff",
         "location support","loves locations","benefits locations"],
 lochate:["location nerfs","location nerf","location hate","location removal",
          "kill locations","banish locations","anti location"],
 itemhate:["item nerfs","item nerf","item hate","item removal","artifact removal",
           "kill items","banish items","anti item"],
 ping:["pings","ping","ping damage","pings damage","chip damage","1 damage","2 damage"],
 allopp:["multiplayer","each opponent","all opponents","group hate","table damage","hits everyone"],
 loredrain:["lore drain","drain lore","lore loss","lose lore","opponent loses lore"],
 lilo:["lilo","stitch","aliens","alien","lilo and stitch","lilo & stitch",
       "experiments"],
 shift:["shift"],
 sing:["song payoff","sing payoff"],
 wipe:["board wipe","boardwipe","sweeper","wrath","mass removal","banish everything"],
 recur:["recursion","recur","from the discard","graveyard","return from discard",
        "reanimate","raise dead"],
 itemsyn:["item synergy","items","item deck","item payoff","item support",
          "loves items","benefits items"],
 wide:["go wide","go-wide","swarm","token payoff","wide payoff","many characters",
       "board payoff"],
 quester:["quester","questers","lore per ink","efficient lore","lore body","racer"],
 contest:["contester","contesters","trades up","good body","fighter","beater",
          "wins challenges"],
 minus:["debuff","stat reduction","lowers stats","minus strength","shrink",
        "weaken","nerf their characters"],
 restrict:["lockdown","stax","can't quest","cant quest","stop questing",
           "prevent challenge","restriction","tax"],
 mill:["mill","decking","deck out"],
 inkwell:["inkwell interaction","inkwell","inkwell tricks","from the inkwell"],
 discard:["hand disruption","discard","make them discard"],
 selfmill:["discard payoff","self discard","wants discard","discard matters"],
 ready:["readying","ready","untap","extra quest"],
 tutor:["tutor","card selection","search deck","find a card"],
 topx:["card selection","dig","look at the top"],
 nochal:["protection","can't be challenged","cant be challenged","evasion"],
 bounce:["bounce","return to hand","tempo"],
};
const chipFor=w=>{const t=w.toLowerCase().trim();
  for(const id in CHIPWORDS)if(CHIPWORDS[id].includes(t))return id;return null};

