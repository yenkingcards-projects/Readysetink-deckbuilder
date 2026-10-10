const OTHER_GROUPS=[
 {g:"",chips:[
   ["Settings","All the options you didn't know you had — show prices or hide them, and tune the rest to how you actually use the site.","pref"],
   ["Dust & secrets","Earn it for doing just about anything on the site, then spend it on titles and secrets you won't find any other way.","dust"],
   ["Contribute","Write notes that get saved right on a card, or just send in a suggestion — the vague search only works because people describe cards.","contrib"],
   ["Judge","The quickest way to check a card interaction — search by name, or go advanced and build out the board state.","judge"],
   ["My Lorcana Journal","Log your events and matches, see your best and toughest matchups, prep for the next one, and a Top Cut calculator for match day.","/match-history/"],
   ["Recommended decks","Lists that have actually won something, with the card-by-card reasoning. Copy one straight into the deck builder.","meta"],
   ["Getting started","New here? Start with this.","start"],
   ["Error cards","What counts as an error, what gets replaced, and every known errata.","err"],
   ["Deck upgrades","Point it at a deck and it tells you what's wrong and what to add.","upg"],
   /* No emoji in the tile heading — that line holds for the whole menu, so
      the site survives a reskin. The 🐭 lives on the page's own h1,
      where the .gi icon slot already exists for exactly this. */
   ["Hidden Mouseys","There are hidden symbols tucked into the art, and we haven't found them all yet. Help us look.","mick"],
   ["Historic leaks","A record of leaks past, published deliberately late. Never live, never spoilers.","leak"],
   ["Worldbuilding","What Lorcana actually is — the Illuminary, glimmers, the inks, and where the story has gone.","world"],
   ["Sources & credits","Where to play online, where to read the news, and everyone whose work this is built on.","cred"],
   ["Sites We Like","The best of the Lorcana community, hand-picked by us.","links"],
 ]},
 /* Also on the top nav — this group is the same three tiles for anyone who
    lands in Other first instead, plus wherever the hamburger dropdown lists
    it. One source, so the two places can't drift apart. */
 {g:"Tools",chips:[
   ["Map","Find local game stores and tournaments near you.","https://map.readysetink.com/"],
   ["The Ink List","Every card, ranked and rated by the community.","https://inklist.readysetink.com/"],
   ["Lore tracker","A digital score card for two to four players. Pick your colors, track lore, and get built-in reminders. Includes a Judge function for casual play.","lore"],
   ["Custom rules","House formats like Poorcana, Mono and Flounder Only. Paste a decklist and see exactly which cards aren't legal, or build a format of your own.","https://customrules.readysetink.com/"],
 ]},
 {g:"Mini games",chips:[
   ["Guess the card","Can you guess the card from a tiny piece of its art?","guess"],
   ["Guess the ability","Name the ability, guess the card it belongs to.","quiz:ability"],
   ["Guess the flavour text","Do you actually read the cards?","quiz:flavour"],
   ["Guess from the facts","Cost, then strength, then willpower, then artist… only the real gamer Illumineers make it through this one.","quiz:reveal"],
   ["Blue Striped Fish Aquarium","Inspired by our favorite fish. Leave him swimming, sprinkle food, earn dust, go full screen and forget about it.","aqua"],
 ]},
 {g:"Coming soon",chips:[




 ]},
];
/* Every sub-page of the Other tab: which view to switch on, and what draws it.
   Anything not in here falls back to the menu, so a typo shows the menu rather
   than a blank screen. */
