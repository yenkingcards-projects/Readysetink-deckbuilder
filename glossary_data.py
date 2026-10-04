"""
The Disney Lorcana glossary, as data. gen_pages.py turns this into
/glossary/ (page), /glossary.json and /glossary.md (the last two are for
agents).

Rules for editing this file
---------------------------
* Written in our own words. Never paste text from Ravensburger's documents: a
  definition here is a plain-English explanation that LINKS to the official rule
  (field `r`), not a copy of it.
* Official terms are checked against the Comprehensive Rules (see RULES_VERSION).
  When a new rules version ships, re-check the "basics" and "keywords" groups
  and bump RULES_VERSION / RULES_DATE.
* Community slang is informal. It is labelled as slang and says how the term
  changes in Lorcana, because most of it was borrowed from Magic.
* Never state card text, set legality, prices or "the current meta" here. Those
  change; the card pages carry them with a date.

Fields: id (anchor), term, cat, d (definition), l (Lorcana-specific note),
s (an example sentence), r (official rule number), k (keyword name, so the page
can count how many cards have it).
"""

RULES_VERSION = "2.2.0"
RULES_DATE = "2026-07-09"
OFFICIAL_RULES_URL = "https://www.disneylorcana.com/en-US/resources"

CATEGORIES = [
    ("basics", "The basics",
     "How a game is set up and what the words on the table mean."),
    ("keywords", "Keyword abilities",
     "The short bold names on cards, each a package of rules."),
    ("formats", "Formats and events",
     "How decks are built and where people play."),
    ("wording", "Lorcana wording vs Magic wording",
     "Much of the slang came over from Magic: The Gathering. These are the Lorcana words to use instead."),
    ("strategy", "Deck strategy and archetypes",
     "How players describe what a deck is trying to do."),
    ("cards", "Cards, effects and the board",
     "Slang for what cards do and how they interact."),
    ("tempo", "Resources, tempo and the lore race",
     "How games are won and lost on the way to 20 lore."),
    ("collecting", "Collecting and buying",
     "Words you meet at a card shop or online store."),
]

T = []


def t(id, term, cat, d, l=None, s=None, r=None, k=None):
    T.append({"id": id, "term": term, "cat": cat, "d": d, "l": l, "s": s, "r": r, "k": k})


# --------------------------------------------------------------- the basics
t("lore", "Lore", "basics",
  "The score. The first player to reach 20 lore wins.",
  l="You race up to 20, not down from 20.")
t("ink", "Ink", "basics",
  "The resource you spend to play cards. Each card in your inkwell is one ink.",
  l="Also a verb: to ink a card is to put it into your inkwell.")
t("inkwell", "Inkwell", "basics",
  "The facedown pile of cards you have turned into ink. Only cards with the inkwell symbol around their cost can go there, and you may add one per turn.")
t("inkable", "Inkable", "basics",
  "A card with the inkwell symbol around its cost, meaning it is allowed to be put into the inkwell.",
  s="Powerful uninkable cards are worth saving to play rather than ink.")
t("ink-type", "Ink type (color)", "basics",
  "One of the six colors a card can be: Amber, Amethyst, Emerald, Ruby, Sapphire or Steel. A deck can use at most two.")
t("character", "Character", "basics",
  "A card type with Strength and Willpower. It stays in play until it is banished or removed by an effect, and it can quest and challenge.")
t("action", "Action", "basics",
  "A one-shot card. You play it, do what it says, then it goes to the discard pile.")
t("song", "Song", "basics",
  "A kind of action that can be played by paying its ink cost or by exerting a character to sing it.")
t("item", "Item", "basics",
  "A card that stays in play after you play it and usually gives a lasting effect or an ability you can activate.")
t("location", "Location", "basics",
  "A card that stays in play, has Willpower, can be challenged, and may give lore at the start of your turn. Characters can move to it for a cost.")
t("strength", "Strength", "basics",
  "How much damage a character deals when it fights in a challenge.")
t("willpower", "Willpower", "basics",
  "How much damage it takes to banish a character or location.")
t("cost", "Cost", "basics",
  "What you pay to play a card, usually ink. Some cards have an alternate cost, such as Shift or singing.")
t("full-name", "Full name", "basics",
  "A character's name and version together, like \"Elsa - Snow Queen\". The four-copy limit in deckbuilding applies to the full name, not just the name.")
t("version", "Version", "basics",
  "The subtitle after a character's name. It tells apart cards that share a name, so \"Elsa - Snow Queen\" and \"Elsa - Spirit of Winter\" are different cards.")
t("quest", "Quest", "basics",
  "Exert a character to gain lore equal to its lore value. A character can't quest the turn it comes into play.",
  s="Quest with everything and you are at 17.")
t("challenge", "Challenge", "basics",
  "Exert one of your characters to attack an opposing character that is already exerted (or an opposing location). Both sides deal damage equal to their Strength.",
  l="You can only challenge characters that are exerted, which is why ready characters are safe from challenges.")
t("exert", "Exert", "basics",
  "Turn a card sideways, usually to quest, challenge or pay a cost.")
t("ready", "Ready", "basics",
  "Upright and able to act. You ready all your exerted cards at the start of each of your turns.")
t("banish", "Banish", "basics",
  "Put a character, item or location from play into its owner's discard pile, either by an effect or because damage reached its Willpower.")
t("damage", "Damage", "basics",
  "Marks on a character or location. When damage equals or exceeds Willpower the card is banished. Damage disappears when the card leaves play.")
t("dry", "Dry and drying", "basics",
  "A character that was already in play when your turn began is dry and can quest, challenge or use exert costs. One played this turn is drying and can't, though its other abilities still work.")
t("discard-pile", "Discard pile", "basics",
  "The faceup pile where actions and banished cards go. Anyone may look at it.")
t("play-area", "Play area", "basics",
  "Where characters, items and locations sit once played. Cards are \"in play\" there, unless covered by another card.")
t("turn-structure", "Turn structure", "basics",
  "Each turn has three phases: Start-of-Turn (Ready, Set, then Draw), Main (do as many turn actions as you like, in any order), and End-of-Turn. The player who goes first skips their first draw.")
t("turn-action", "Turn action", "basics",
  "Something you may do in the Main Phase: ink a card, play a card, quest, challenge, move a character to a location, or use an activated ability.")
t("triggered-ability", "Triggered ability", "basics",
  "An ability that starts with \"When\", \"Whenever\", \"At the start of\" or \"At the end of\" and happens automatically when its condition is met.")
t("activated-ability", "Activated ability", "basics",
  "An ability you choose to use by paying its cost, often exerting the card.")
t("static-ability", "Static ability", "basics",
  "An ability that is always on, for as long as its card is in play, rather than happening at a moment.")
t("bag", "The bag", "basics",
  "The invisible waiting area where triggered abilities queue up before they resolve. When several trigger at once, the turn player orders their own and the others follow.")
t("stack", "Stack (shifted cards)", "basics",
  "A pile of cards in play, such as a shifted character sitting on top of the character it was played onto. If the top card leaves play, the whole pile goes with it.")
t("starting-hand", "Starting hand and mulligan", "basics",
  "You begin with seven cards. Once, you may put any number back on the bottom of your deck and draw back up to seven. Lorcana calls this altering your hand.")
t("zone", "Zone", "basics",
  "A place cards can be: deck, hand, play, inkwell, discard, and the bag. Some are private (deck, hand, inkwell) and some are public (play, discard).")

# --------------------------------------------------------------- keywords
t("alert", "Alert", "keywords",
  "Lets a character challenge evasive characters as though the Evasive restriction wasn't there. It does not give the character Evasive itself.",
  r="8.2", k="Alert")
t("bodyguard", "Bodyguard", "keywords",
  "The character may enter play already exerted. While a Bodyguard is in play, opposing characters that challenge you must pick a Bodyguard if one is available.",
  r="8.3", k="Bodyguard")
t("boost", "Boost N", "keywords",
  "Once during your turn you may pay N ink to put the top card of your deck facedown under this character. Other cards care about how many cards are under a character.",
  r="8.4", k="Boost")
t("challenger", "Challenger +N", "keywords",
  "While this character is the one challenging, it gets +N Strength. It does nothing when the character is defending. Multiple instances add together.",
  r="8.5", k="Challenger")
t("evasive", "Evasive", "keywords",
  "Can't be challenged except by a character that also has Evasive. The most common keyword in the game.",
  r="8.6", k="Evasive")
t("reckless", "Reckless", "keywords",
  "The character can't quest, and you can't end your turn while it is ready and able to challenge. It can still be exerted to use abilities or sing songs. A strong but forced attacker.",
  r="8.7", k="Reckless")
t("resist", "Resist +N", "keywords",
  "Reduces damage dealt to this card by N. If that brings the damage to zero, no damage is taken. Multiple instances add together.",
  r="8.8", k="Resist")
t("rush", "Rush", "keywords",
  "The character can challenge the turn it comes into play, skipping the usual drying wait.",
  r="8.9", k="Rush")
t("shift", "Shift N", "keywords",
  "Pay the Shift cost instead of the ink cost to play this card on top of one of your characters with the same name. They become one stack. If the card underneath was exerted, the shifted character enters exerted.",
  l="Some cards have Shift variants that relax the same-name requirement. Check the card text.",
  s="Shift Elsa onto Elsa for four instead of paying full price.", r="8.10", k="Shift")
t("singer", "Singer N", "keywords",
  "This character can exert to sing a song as though its cost were N, even if its real cost is lower. Its actual ink cost doesn't change.",
  r="8.11", k="Singer")
t("sing-together", "Sing Together N", "keywords",
  "A song you can play by exerting any number of ready characters whose costs add up to N or more, so several small characters can sing one big song.",
  r="8.12", k="Sing Together")
t("support", "Support", "keywords",
  "Whenever this character quests, you may add its Strength to another chosen character's Strength for the rest of the turn.",
  r="8.13", k="Support")
t("vanish", "Vanish", "keywords",
  "If an opponent chooses this character as part of an action's effect, it gets banished afterwards. A built-in risk for anyone who targets it.",
  r="8.14", k="Vanish")
t("ward", "Ward", "keywords",
  "Opponents can't choose this card when resolving an effect. Effects that don't choose, such as ones that hit everything, still affect it.",
  r="8.15", k="Ward")
t("reminder-text", "Reminder text", "keywords",
  "The italic text in parentheses after a keyword. It's a memory aid, not extra rules, and it can differ slightly from the exact rule.")

# --------------------------------------------------------------- formats
t("core", "Core Constructed", "formats",
  "The main competitive format: a 60-card minimum deck of up to two inks, no more than four copies of any full name, using the current rotating pool of sets.",
  l="The legal sets change over time. Check the official Tournament Rules for the current pool.")
t("infinity", "Infinity Constructed", "formats",
  "A constructed format that allows cards from every set, with its own list of banned cards.")
t("coconut", "Format Coconut", "formats",
  "An official multiplayer format built around a companion card, still in beta when this was written. It allows up to three inks and a single copy of each card. See our Coconut leader tools for the rules as implemented here.")
t("sealed", "Sealed", "formats",
  "Build a deck on the spot from a fixed number of freshly opened booster packs.")
t("draft", "Draft", "formats",
  "Players open packs and pick cards one at a time, passing the rest around the table, then build a deck from what they took.")
t("pack-rush", "Pack Rush", "formats",
  "A quick two-booster format with its own short rules.")
t("preconstructed", "Preconstructed", "formats",
  "Play with an unmodified starter deck, straight out of the box.")
t("house-format", "House format", "formats",
  "A made-up set of rules for casual play, such as Poorcana (commons and uncommons only) or Mono (one ink only). See our custom rules page for ready-made ones.")
t("illumineers-quest", "Illumineer's Quest", "formats",
  "A cooperative, story-driven product where one or more players team up against a scripted opponent, rather than a normal player-versus-player game.")
t("prerelease", "Prerelease", "formats",
  "An event held just before a new set goes on sale, where players build decks from the new cards early.")
t("organized-play", "Organized play", "formats",
  "Official tournaments and events run through stores, from casual nights up to championships. Events are listed through Ravensburger's Play Hub.")
t("play-hub", "Play Hub", "formats",
  "Ravensburger's event and store locator for Lorcana organized play.")
t("meta", "The meta", "formats",
  "Short for metagame: which decks are popular and winning right now. It changes with every set and rules update.",
  s="Always check a dated source before saying what is meta.")

# --------------------------------------------------------------- wording swaps
t("w-mana", "Mana  to  Ink", "wording", "Say ink, not mana.")
t("w-land", "Land and land drop  to  Inkwell", "wording",
  "Say inkwell, or \"ink a card\". You get one per turn.")
t("w-creature", "Creature  to  Character", "wording", "Say character.")
t("w-tap", "Tap and untap  to  Exert and ready", "wording", "Say exert and ready.")
t("w-attack", "Attack  to  Quest or Challenge", "wording",
  "Questing gains lore. Challenging fights an exerted character. They are different actions, so pick the right one.")
t("w-life", "Life total  to  Lore", "wording",
  "Lore is a score you build up to 20, not a life total you lose.")
t("w-dies", "Dies and destroyed  to  Banished", "wording", "Say banished.")
t("w-graveyard", "Graveyard  to  Discard pile", "wording", "Say discard pile.")
t("w-etb", "Enter the battlefield  to  Enters play", "wording",
  "Lorcana text reads \"When you play this character\". There is no battlefield; say \"enters play\" and \"leaves play\".")
t("w-spell", "Spell and instant  to  Action or song", "wording",
  "Actions and songs are the one-shot cards. You play them on your own turn; there is no holding up an instant to respond on your opponent's turn the way Magic allows.")
t("w-toughness", "Toughness  to  Willpower", "wording", "Willpower is how much damage a character can take.")

# --------------------------------------------------------------- strategy
t("archetype", "Archetype", "strategy",
  "A deck's overall plan, such as aggro, midrange, control or combo. Often named with the ink pair too, like \"Ruby-Sapphire midrange\".",
  l="With only two inks per deck, the ink pair is part of an archetype's identity.",
  s="What archetype is it? Ruby-Sapphire midrange, so it's flexible.")
t("aggro", "Aggro", "strategy",
  "A fast deck that tries to win by questing early and often, before the opponent can stabilize.",
  l="Lots of cheap characters, Rush, Challenger and evasion. The goal is a short clock.")
t("midrange", "Midrange", "strategy",
  "A balanced deck with a solid board and good trades that can speed up or slow down depending on the matchup.")
t("control", "Control", "strategy",
  "A slow, reactive deck that answers threats and wins late through card quality.",
  l="Pure control is harder here than in Magic because lore keeps ticking up. Control decks lean on banishing, bouncing and drawing.")
t("combo", "Combo", "strategy",
  "A deck built around specific cards that win or snowball when assembled together.",
  l="Usually a lore engine or a Shift loop, not an instant win. Ordinary synergy isn't a combo.")
t("meta-deck", "Meta deck", "strategy",
  "A deck that's currently popular or winning in competitive play. Say when you saw it, because this goes out of date quickly.")
t("meme-deck", "Meme deck", "strategy",
  "A deck built for fun or a joke rather than to win. Usually affectionate.")
t("rogue", "Rogue deck", "strategy",
  "An off-meta deck that is built to win, just in a way opponents aren't prepared for. Different from a meme deck: rogue tries to win by surprise.")
t("pilot", "Pilot", "strategy",
  "The person playing a deck. Used when separating a deck's power from the player's skill.",
  s="Great deck, but the pilot misplayed the lore race.")
t("mirror", "Mirror match", "strategy",
  "A matchup where both players run the same or nearly the same deck, so sequencing and who goes first decide it.")
t("wide", "Going wide", "strategy",
  "Playing many cheap characters instead of a few big ones. It quests for a lot of lore but is weak to effects that hit the whole board.",
  l="The opposite is going tall: a few big, boosted characters.")
t("glass-cannon", "Glass cannon", "strategy",
  "A card or deck with strong offense and fragile defense. It hits hard but dies fast.")

# --------------------------------------------------------------- cards and the board
t("answer", "Answer", "cards",
  "Any card or play that deals with an opponent's threat: banishing it, bouncing it, or blocking it.",
  s="Do I have an answer to that? Yes, but only one copy.")
t("board-wipe", "Board wipe", "cards",
  "An effect that removes many or all characters at once.",
  l="Rarer and more expensive than in Magic, so it is a big swing when it lands.")
t("bounce", "Bounce", "cards",
  "Return a character or item to its owner's hand instead of banishing it.",
  l="A strong tempo play because the opponent loses the ink they spent and must pay again. It also resets damage and breaks up shift stacks, and it lets a character's on-play effect happen twice.")
t("ping", "Ping", "cards", "A small, targeted bit of damage, usually 1 or 2, often used to finish off a character that is already hurt.")
t("snipe", "Snipe", "cards",
  "Precisely removing one chosen key character, especially one that is hard to reach.",
  l="Matters most against Evasive characters, which are hard to challenge.")
t("on-play", "On-play effect", "cards",
  "An ability that triggers when a card enters play. On Lorcana cards it reads \"When you play this character\".",
  l="Bounce can reuse an on-play effect, which is a classic trick.")
t("fizzle", "Fizzle", "cards",
  "An effect that does nothing because its target is gone or can't be chosen.",
  l="Ward is the usual cause: with no legal target, the effect simply does nothing.")
t("vanilla", "Vanilla", "cards",
  "A character with no abilities, just stats and a lore value.",
  l="True vanillas are rare in Lorcana. Players more often say \"just a body\" or \"no text\".")
t("french-vanilla", "French vanilla", "cards",
  "A character whose only abilities are keywords, with no other rules text.")
t("synergy", "Synergy", "cards",
  "Cards that are better together than apart, such as a Singer next to a deck full of songs.")
t("bomb", "Bomb", "cards",
  "A card so powerful that it can win the game by itself if unanswered.")
t("removal", "Removal", "cards",
  "Any card that gets rid of an opposing character: banishing, damaging, bouncing or otherwise taking it off the board.")

# --------------------------------------------------------------- tempo
t("curve", "Ink curve", "tempo",
  "The spread of card costs in a deck. \"Curving out\" means using all your ink every turn.",
  l="You can ink only one card per turn, and only inkable cards, so the curve and the choice of what to ink matter. Good players ink the weaker inkable cards and keep powerful uninkable ones to play.",
  s="Your curve needs plays at two, three and four, or you'll waste ink.")
t("tempo", "Tempo", "tempo",
  "Being faster than your opponent: getting more done per turn for the ink spent. Different from card advantage, which is about long-term value.")
t("card-advantage", "Card advantage", "tempo",
  "Ending up with more useful cards or options than your opponent, through drawing, two-for-one trades, or effects that return value.")
t("ramp", "Ramp", "tempo",
  "Getting extra resources early so you can play expensive cards sooner.",
  l="Limited in Lorcana: there are no lands and only one ink drop per turn. It shows up as cost reduction, Shift, Singers, and a few effects that add cards to the inkwell. Only call a deck ramp if it really works that way.")
t("topdeck", "Topdecking", "tempo",
  "Playing only the card you just drew because your hand is empty.",
  s="We're in topdeck mode, whoever draws better wins.")
t("outs", "Outs", "tempo",
  "The cards left in your deck that can save or win the game from where you are.")
t("overextend", "Overextending", "tempo",
  "Committing too many cards to the board so that a board wipe or bounce effect leaves you with nothing.")
t("gas", "Gas", "tempo",
  "Strong, impactful cards. \"This deck has gas.\" Running out of gas means having no good plays left.")
t("clock", "Clock", "tempo",
  "How many turns until someone wins. In Lorcana, how many turns each player needs to reach 20 lore.",
  s="They're on a three-turn clock, so I have to slow them down.")
t("lethal", "Lethal", "tempo",
  "Having enough lore available this turn to reach 20 and end the game.")
t("otk", "OTK (one-turn kill)", "tempo",
  "Winning in a single turn from a position that didn't look winning.",
  l="True one-turn kills are rare because winning means reaching 20 lore. Players usually say \"big lore turn\" or \"going off\" instead.")
t("swing", "Swing", "tempo",
  "Sending several characters to quest or challenge in one big turn.")
t("baiting", "Baiting", "tempo",
  "Making the opponent spend an answer on a less important target so your key play survives.")
t("scoop", "Scoop", "tempo",
  "To concede a game. The official word is concede, but scoop is common slang.")

# --------------------------------------------------------------- collecting
t("playset", "Playset", "collecting", "Four copies of a card, the maximum a deck may hold of one full name.")
t("single", "Single", "collecting", "One individual card sold on its own, as opposed to a pack or box.")
t("booster", "Booster pack", "collecting", "A sealed pack of random cards from one set.")
t("sealed-product", "Sealed product", "collecting", "Packs, boxes and decks still in their factory wrapping.")
t("starter-deck", "Starter deck", "collecting", "A ready-to-play, preconstructed deck for new players.")
t("rarity", "Rarity", "collecting",
  "How common a card is in packs. The scale runs Common, Uncommon, Rare, Super Rare and Legendary, with special alternate printings above that.")
t("enchanted", "Enchanted", "collecting",
  "A much rarer, full-art alternate printing of an existing card. The gameplay is the same; the artwork and the price are not.")
t("foil", "Foil", "collecting", "A card printed with a shiny finish. Usually priced separately from the regular printing.")
t("near-mint", "Near mint (NM)", "collecting", "The top condition grade for a played-with card: little to no visible wear.")
t("pull-sheet", "Pull sheet", "collecting",
  "A checklist of the exact cards to pull from your collection to build a deck, in a sensible order.")
t("wishlist", "Wishlist", "collecting", "A list of cards you want but don't own yet.")
t("market-price", "Market price", "collecting",
  "A rough guide to what a card has recently sold for. Prices here are dated snapshots, never live quotes.")
