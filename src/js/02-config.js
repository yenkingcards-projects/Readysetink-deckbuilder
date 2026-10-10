/* ===================================================================
   >>> EDIT ME — STAPLES <<<  ("Name - Version", or just "Name")
   Seeded from inkdecks most-played + Ben's picks. The ★ button on any
   card adds to this list in your browser; this block is the base so a
   browser wipe only loses your own additions.
   =================================================================== */
const STAPLES=new Set([
 // Ben's picks, 2 per ink for the guided build
 "Ariel - Spectacular Singer","Grandmother Willow - Ancient Advisor",           // Amber
 "Friends on the Other Side","Cheshire Cat - Inexplicable",                      // Amethyst
 "Ursula - Deceiver","Malicious, Mean, and Scary",                               // Emerald
 "Be Prepared","A Pirate's Life",                                                // Ruby
 "Tipo - Growing Son","Sail the Azurite Sea",                                    // Sapphire
 "Let the Storm Rage On","Grab Your Sword",                                      // Steel
 // wider most-played list
 "Beast - Tragic Hero","A Whole New World","Strength of a Raging Fire",
 "Demona - Scourge of the Wyvern Clan","Gaston - Superior Archer","Hades - Looking for a Deal",
 "Junior Woodchuck Guidebook","Mowgli - Man Cub","Dumbo - Ninth Wonder of the Universe",
 "Elsa - The Fifth Spirit","Let It Go","Elinor - Renowned Diplomat","Under the Sea",
 "Isis Vanderchill - Ice Queen of St. Canard","Nani - Stage Manager","Red Alert",
 "The Horseman Strikes!","Aurora - Holding Court","Lilo - Escape Artist",
 "Tigger - Bouncing All the Way","Della's Moon Lullaby","Develop Your Brain",
 "Ohana Means Family","Vision of the Future","Bobby Zimuruski - Spray Cheese Kid",
 "Tramp - Street-Smart Dog","Will o' the Wisp - Forest Spirit","Basil - Practiced Detective",
 "Tramp - Enterprising Dog","Raging Storm","Lady - Decisive Dog","Lady - Miss Park Avenue",
 "Doc - Bold Knight","Christopher Robin - Joining the Fun","Prince Phillip - Vanquisher of Foes"
]);

/* >>> EDIT ME — EASTER EGGS <<< cosmetic only, never searchable */
const EGGS={
 "Hiram Flaversham - Toymaker":{c:"rat",  t:"🐀 do not trust this rat, he will break your heart 💔"},
 "Bucky - Squirrel Squeak Tutor":{c:"tomb",t:"🪦"},
 "Chip the Teacup - Gentle Soul":{c:"ban", t:"❌ banned"}
};
const BANNED="Chip the Teacup - Gentle Soul";
const BAN_MSG="You can't add this card because someone once said it was better than Flounder and that's simply just not true.";

/* Every [Coconut] card, ability text as printed on the beta cards (checked 10 Oct 2026).
   Card images live in img/coconut/, named by cocoSlug(). Change the file name when
   a card gets a new image, because /img/ is cached for a year.
   `hook` decides the recommended ink pair (by density) and `rec` highlights chips. */
const COCO=[
 {n:"Scar",v:"Finally King",i:"Steel",t:"During your turn, you pay 1 ink less for the first Ally character you play.",hook:c=>c.sub.includes("Ally"),rec:["cheap","tribal"]},
 {n:"Ariel",v:"Spectacular Singer",i:"Amber",t:"Whenever a Princess character of yours sings a song, gain lore equal to her lore value.",hook:c=>c.sub.includes("Princess")||/\bsing/i.test(c.ef),rec:["sing","singtog","lore"]},
 {n:"Winnie the Pooh",v:"Hunny Wizard",i:"Amethyst",t:"Whenever you play a character without an ability, you may pay 1 ink to draw a card.",hook:c=>!c.tx&&c.ty==="Character",rec:["vanilla","draw"]},
 /* Errata'd. The free play is still capped at cost 2, so the hook pool is
    unchanged, but the payoff is now lore on a Lilo/Stitch hit rather than a
    discard replay — hence "lore" joins the recommended filters. */
 {n:"Stitch",v:"Rock Star",i:"Amber",t:"Once during your turn, you may play a character with cost 2 or less for free. If that character was named Lilo or Stitch, chosen character gets +1 lore this turn.",hook:c=>c.c<=2&&c.ty==="Character",rec:["cheap","lore","etb"]},
 {n:"Ursula",v:"Deceiver of All",i:"Emerald",t:"Your characters count as having +1 cost for singing songs. Your characters named Ursula count as having +2 cost instead.",hook:c=>c.sub.includes("Song"),rec:["sing","singtog"]},
 {n:"Mickey Mouse",v:"Brave Little Tailor",i:"Ruby",t:"Mickey Mouse character cards in your hand, deck and discard gain Shift 2.",hook:c=>c.n==="Mickey Mouse",rec:["shift"]},
 {n:"Mufasa",v:"Ruler of Pride Rock",i:"Sapphire",t:"Once during your turn, you may pay 5 ink to put the top 2 cards of your deck into your inkwell facedown and exerted.",hook:c=>c.c>=6,rec:["cheap","ramp","lore"]},
 {n:"Nick Wilde",v:"Wily Fox",i:"Sapphire",t:"You can have up to 4 copies of an item card named Pawpsicle in your deck. Once during your turn, you may banish 4 of your items. If you do, gain 4 lore.",hook:c=>c.ty==="Item",rec:["lore","etb"]},
 {n:"Snow White",v:"Merry as the Morning",i:"Amethyst",t:"Once per game during your turn, you may reveal your hand. If you have a Snow White and 7 or more Seven Dwarfs character cards with different names among the cards in your hand, in your discard, and in play, this Coconut gains \"Your characters get +2 lore.\"",hook:c=>c.sub.includes("Seven Dwarfs"),rec:["tribal","lore"]},
 /* Errata'd. The discount now covers PLAYING a Boost card as well as using the
    ability, so Boost cards are worth more — but the pool is identical, since
    every card with the Boost keyword is already a character or a location. */
 {n:"Donald Duck",v:"Fred Honeywell",i:"Emerald",t:"You pay 1 ink less to use Boost abilities and to play characters or locations with Boost.",hook:c=>c.kw.some(k=>k[0]==="Boost"),rec:["boostcheap","boost","cheap","ramp"]},
 {n:"Mr. Incredible",v:"Super Strong",i:"Ruby",t:"Whenever you play a Super character, they gain Rush this turn and you may exert chosen opposing character with less strength than them.",hook:c=>c.sub.includes("Super"),rec:["tribal","etb"]},
 {n:"Moana",v:"Curious Explorer",i:"Sapphire",t:"During your turn, if you have a Moana, Heihei, or Pua in play, you may ink an additional card.",hook:c=>/Moana|Heihei|Pua/.test(c.n),rec:["cheap"]},
 {n:"John Silver",v:"Greedy Treasure Seeker",i:"Steel",t:"Each of your locations gains Resist +1 for each character there.",hook:c=>c.ty==="Location",rec:["heal"]},
 {n:"Robin Hood",v:"Sneaky Sleuth",i:"Emerald",t:"At the start of your first turn, you may play an item card named Robin's Bow from your collection for free. Whenever you play a character named Robin Hood, deal 1 damage to chosen opposing character or location.",hook:c=>/Robin Hood/.test(c.n)||c.ty==="Item",rec:["damage","etb"]},
 {n:"Tinker Bell",v:"Giant Fairy",i:"Steel",t:"Whenever one of your other abilities or actions deals damage to an opposing character, deal 1 damage to that character.",hook:c=>/deals?\s+.{0,20}damage/i.test(c.ef),rec:["damage","pierce"]},
 {n:"Sisu",v:"Emboldened Warrior",i:"Ruby",t:"All characters with more strength than each opposing character can quest the turn they're played.",hook:c=>(c.st||0)>=5,rec:["pump","chall","staple"]},
 {n:"Pocahontas",v:"Peacekeeper",i:"Amber",t:"Once during your turn, you may choose a character. Until the start of your next turn, they get +1 lore and can't challenge and must quest if able.",hook:c=>(c.lo||0)>=2,rec:["lore","nochal"]},
 {n:"Dumbo",v:"Ninth Wonder of the Universe",i:"Amethyst",t:"You may use the exert abilities of your characters the turn they're played.",/* EXERT abilities, not every activated one. `at:["activated"]` includes
   cards whose activated ability has no exert cost at all — Cobra Bubbles
   was being pulled in and starred, which is the opposite of the point. An
   exert ability writes the symbol as a cost, before the dash. */
  hook:c=>/(\{E\}|⟳)[^.]{0,14}[-–—]/.test(c.tx||""),rec:["exert","activated","draw"]},
 /* Beta 2's six "duo" Coconuts: two characters, two inks baked into the one
    card instead of one. `i2` is the tell — everything downstream that reads
    a Coconut's ink goes through coInks() below rather than touching `.i`
    directly, so these need no special-casing anywhere else. */
 {n:"Woody & Buzz Lightyear",v:"Best Buddies",i:"Amber",i2:"Emerald",
  t:"Once during your turn, you may pay 1 ink less for the next Toy character you play this turn. If you do and you have a character named Woody and a character named Buzz Lightyear in play, draw a card.",
  hook:c=>c.sub.includes("Toy"),rec:["cheap","tribal"]},
 {n:"The Madrigal Family",v:"Every Generation",i:"Amber",i2:"Sapphire",
  t:"During your turn, whenever you remove 1 or more damage from one of your characters, you may ready them. They can't quest or challenge for the rest of this turn.",
  hook:c=>/removes?\s+(up to\s+)?\d*\s*damage/i.test(c.ef||""),rec:["heal","ready"]},
 {n:"Peter Pan & Tinker Bell",v:"Fast Friends",i:"Amethyst",i2:"Ruby",
  t:"Once during your turn, you may give chosen character Evasive until the start of your next turn. If they already had Evasive, they get +1 lore until the start of your next turn.",
  hook:c=>c.kw.some(k=>k[0]==="Evasive"),rec:["lore","quester"]},
 {n:"Aladdin & Genie",v:"Mischievous Pals",i:"Amethyst",i2:"Emerald",
  t:"Whenever you draw a card during your turn, if it's the third card you drew this turn, gain 2 lore.",
  hook:c=>/draws?\s+(a|\d+)?\s*cards?/i.test(c.ef||""),rec:["draw","cheap"]},
 {n:"Belle & Beast",v:"Certain as the Sun",i:"Ruby",i2:"Sapphire",
  t:"Whenever one of your characters with cost 5 or more readies, draw a card.",
  hook:c=>(c.c||0)>=5,rec:["ready","heal"]},
 {n:"Darkwing Duck & Launchpad",v:"St. Canard's Finest",i:"Sapphire",i2:"Steel",
  t:"During your turn, whenever an opposing character is banished in a challenge, gain 1 lore. If they were a Villain character, gain 3 lore instead.",
  hook:c=>c.kw.some(k=>k[0]==="Challenger")||(c.st||0)>=5,rec:["chall","pump"]},
 {n:"The Vine",v:"Towering Stalk",i:"Steel",
  t:"Once during your turn, for each Floodborn character you have in play, you may pay 1 ink less for the next Floodborn character you play this turn.",
  hook:c=>c.sub.includes("Floodborn"),rec:["shift","cheap","tribal"]},
 {n:"Merida",v:"Wisp Conjurer",i:"Amethyst",
  t:"Once during your turn, you may have the next character you play this turn enter play exerted. Whenever a character of yours enters play exerted, you may pay 1 ink to gain 1 lore.",
  hook:c=>c.ty==="Character"&&((c.c||0)<=3||/enters? play exerted|\bready\b/i.test(c.ef||"")),rec:["cheap","ready","lore"]},
 {n:"Pete",v:"Bad Guy",i:"Emerald",
  t:"Whenever you play an action, if it's the second action you played this turn, chosen opposing character gains Reckless and can't challenge your characters or locations until the start of your next turn.",
  hook:c=>c.ty==="Action",rec:["cheap","restrict","draw"]},
 {n:"The Black Cauldron",v:"",i:"Amber",
  t:"Whenever one of your characters is banished, you may put that card from your discard under one of your items named The Black Cauldron faceup.",
  hook:c=>c.ty==="Character"&&(/when(ever)? this character is banished/i.test(c.ef||"")||(c.c||0)<=2),rec:["onban","recur","cheap"]}
];
/* File name of a Coconut's card image: "Scar - Finally King" -> scar-finally-king */
const cocoSlug=co=>(co.n+" "+co.v).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const cocoImg=co=>"/img/coconut/"+(co.img||cocoSlug(co))+".webp";
/* A single-ink Coconut locks one ink; a duo Coconut (`i2` set) locks two.
   Everything that reads a Coconut's ink goes through this rather than `.i`
   directly, so the two shapes don't need separate code paths. */
const coInks=co=>co?(co.i2?[co.i,co.i2]:[co.i]):[];


const INKS=["Amber","Amethyst","Emerald","Ruby","Sapphire","Steel"];
const HEX={Amber:"#f0a832",Amethyst:"#a86fd8",Emerald:"#35c97a",Ruby:"#f0625f",Sapphire:"#4a9fe0",Steel:"#9fb0c4"};
const FMT={infinity:{l:"Infinity",cap:2,max:4,min:60},core:{l:"Core",cap:2,max:4,min:60},coconut:{l:"Coconut",cap:3,max:1,min:60},/* No rules at all: every ink, any number of copies, no minimum. Nothing is
   ever flagged illegal, so the warnings panel stays quiet. */
freeform:{l:"Freeform",cap:6,max:99,min:0}};
/* One line each, shown under the picker. Format is the single setting that
   changes what counts as a legal deck, and "Core" means nothing to someone who
   has just arrived — the rules belong on screen, not in a title attribute. */
/* Shown in this order — the ones people actually build in first. */
const FMT_ORDER=["coconut","core","infinity","freeform"];
const FMT_BLURB={
  infinity:"Every card ever printed. 2 inks, up to 4 copies of a card, 60 minimum.",
  core:"Only cards from the current Core sets. 2 inks, up to 4 copies, 60 minimum.",
  coconut:"Singleton — one copy of each card, 3 inks, led by a Coconut. 60 minimum.",
  freeform:"No rules. Any inks, any number of copies, any size. Nothing is flagged."};
const FL={n:"Flounder",v:"Voice of Reason"};
const K_DECKS="fs3_decks",K_STAR="fs3_stars",K_DVIEW="fs3_dview";
const K_COLL="fs3_coll",K_COLLON="fs3_collon";

