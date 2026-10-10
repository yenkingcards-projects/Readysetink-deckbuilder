/* ===================== sites we like + credits =====================
   Ben's rule: anything this site was built on gets named here. That includes
   the data sources it can't run without and the write-ups its pages were
   compiled from. */
const SOURCES=[
 {what:"Card names, rules text, abilities, keywords, legality, artists, flavour text, official errata and foiling",
  n:"LorcanaJSON", u:"https://lorcanajson.org"},
 {what:"Card images", n:"Lorcast", u:"https://lorcast.com"},
 {what:"Official set release notes and rulings", n:"Ravensburger", u:"https://www.disneylorcana.com/en-US/"},
 {what:"Locations of the hidden mouse-shaped symbols", n:"TheGamer", u:"https://www.thegamer.com"},
];

function renderCredits(){
  /* One page, and only what's true: which site each piece of information came
     from. No blurbs about anyone's vibe — if this page is ever read it will be
     by someone checking we credited them properly. */
  $("credpage").innerHTML=`<div class="page">
    <button class="btn" id="crExit" style="margin-bottom:12px">← Other</button>
    <h1>Sources</h1>
    <p class="lede">Ready Set Ink holds no card data of its own. Everything below was built by
      other people and is used with credit. If your work is here and you'd rather it wasn't, or
      you'd like the wording changed, say so and it changes.</p>
    <div class="creds">${SOURCES.map(x=>`
      <div class="cred">
        <div class="cwhat">${esc(x.what)}</div>
        <a href="${esc(x.u)}" target="_blank" rel="noopener noreferrer"><b>${esc(x.n)} ↗</b></a>
      </div>`).join("")}</div>

    <h3 class="sec2">Disclaimer</h3>
    <div class="disclaimer">
      <p>Ready Set Ink uses trademarks and/or copyrights associated with <b>Disney Lorcana TCG</b>,
        used under Ravensburger's Community Code Policy. <b>We are expressly prohibited from charging
        you to use or access this content.</b></p>
      <p>Ready Set Ink is <b>not published, endorsed, or specifically approved</b> by Disney or
        Ravensburger. For more information about Disney Lorcana TCG, visit
        <a href="https://www.disneylorcana.com/en-US/" target="_blank" rel="noopener noreferrer">disneylorcana.com</a>.</p>
      <p class="small">© Disney. Disney Lorcana is operated by Ravensburger, an official licensee of Disney.</p>
    </div>
  </div>`;
  const e=$("crExit");if(e)e.onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
}

/* ===================== sites we like =====================
   A curated links page — the best of the Lorcana web, picked by hand. Not the
   Sources page above (that's attribution for where OUR data comes from) —
   this is "if you like this site, you'll like these too."

   An entry needs a name AND a link before it's allowed to render. A bare name
   with nothing else is a note-to-self ("remember to add so-and-so"), not a
   finished listing, and a public page doesn't ship notes-to-self — so
   renderLinks() below filters those out rather than showing a dead card. */
const LINKS_SECTIONS=[
 {h:"Favorite sites",items:[
   {n:"Dreamborn.ink",u:"https://dreamborn.ink",cat:"Deck builder",
    blurb:"The best way to see and manage decklists."},
   {n:"r/Lorcana",u:"https://www.reddit.com/r/Lorcana/",cat:"Reddit",
    blurb:"The best place for community discussion — and probably leaks 🤣"},
   {n:"Mushu Report",u:"https://mushureport.com",cat:"News, historical record",
    blurb:"The original and best place for Disney Lorcana news."},
   {n:"Ready Set Ink! YouTube",u:"https://www.youtube.com/@readysetink",cat:"YouTube",
    blurb:"The best Disney Lorcana related videos."},
 ]},
 {h:"Official Disney Lorcana",items:[
   {n:"Disney Lorcana",u:"https://www.disneylorcana.com/en-US/",cat:"Official",
    blurb:"The official hub — best used as a portal to the official rules document."},
 ]},
 {h:"Best of the community",items:[
   {n:"@BobbyMcWho",u:"https://x.com/BobbyMcWho",cat:"X",
    blurb:"Wholesome and thoughtful community member."},
   {n:"Duels.ink",u:"https://duels.ink/",cat:"Gameplay simulator",
    blurb:"The best way to play Lorcana online — unofficially, of course."},
 ]},
 {h:"Discords",items:[
   /* Invite link is time-limited (expires 2026-09-25 as given) — Discord
      invites like this need refreshing periodically or they 404. The visible
      note is a soft safety net; whoever maintains this page should actually
      check it past that date. */
   {n:"Lorcana Rulebook Discord",u:"https://discord.gg/TNhT5GTKc",cat:"Discord, rules",
    blurb:"A very well organized resource and community focused on the rules of Disney Lorcana.",
    note:"If this invite link has gone stale, let us know."},
 ]},
 {h:"Data & tools",items:[
   {n:"LorcanaJSON",u:"https://lorcanajson.org",cat:"Card data",
    blurb:"The structured Disney Lorcana card database — this site's own card data comes from it too."},
   {n:"Lorcast",u:"https://lorcast.com",cat:"Card data, prices",
    blurb:"Card images and live pricing — this site's own price snapshot comes from it too."},
 ]},
 {h:"Other cool things",items:[
   {n:"Lorebot",u:"https://lorebot.ink",cat:"Website, Discord bot",
    blurb:"A great website with thoughtful articles and information, plus a custom bot for Discord and streaming.",
    note:"Made by @BobbyMcWho — our favorite account on X."},
 ]},
];
/* Empty until there's a real form to send people to. The submit button below
   reads this and shows a calm "coming soon" instead of a dead link when it's
   blank — same pattern as every other not-ready-yet feature on this site. */
const SUBMIT_FORM_URL="";
function renderLinks(){
  const sections=LINKS_SECTIONS.map(sec=>({...sec,items:sec.items.filter(it=>it.n&&it.u)}))
    .filter(sec=>sec.items.length);
  $("linkspage").innerHTML=`<div class="page">
    <button class="btn" id="lkExit" style="margin-bottom:12px">← Other</button>
    <h1>Sites We Like</h1>
    <p class="lede">The best of the Lorcana web, picked by hand — deck tools, communities,
      news, and a few favorite people. Not comprehensive, just genuinely good.</p>
    ${sections.map(sec=>`
      <h3 class="sec2">${esc(sec.h)}</h3>
      <div class="linkgrid">${sec.items.map(it=>`
        <a class="linkcard" href="${esc(it.u)}" target="_blank" rel="noopener noreferrer">
          <div class="lkhead">
            ${it.img?`<img src="${esc(it.img)}" alt="">`:`<span class="lkmono">${esc((it.n||"?")[0])}</span>`}
            <div><b>${esc(it.n)} ↗</b>${it.cat?`<span class="lkcat">${esc(it.cat)}</span>`:""}</div>
          </div>
          ${it.blurb?`<p>${esc(it.blurb)}</p>`:""}
          ${it.note?`<p class="lknote">${esc(it.note)}</p>`:""}
        </a>`).join("")}</div>`).join("")}
    <div class="linkcta">
      <b>Want to be here?</b>
      <p>We feature the best of the Lorcana community — deck tools, creators, communities and
        resources. Think your site belongs on this list?</p>
      ${SUBMIT_FORM_URL
        ?`<a class="btn go" href="${esc(SUBMIT_FORM_URL)}" target="_blank" rel="noopener noreferrer">Submit it →</a>`
        :`<button class="btn" disabled title="Submissions open soon">Submit it → (coming soon)</button>`}
    </div>
  </div>`;
  const e=$("lkExit");if(e)e.onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
}

/* ===================== account =====================
   Reached by tapping the account button in the header while signed in —
   that button used to sign you straight out on a single click, with nowhere
   to go if you actually wanted to see your own account instead. Now it opens
   this page, and signing out is a deliberate action from inside it. */
function renderAccount(){
  if(!ACCT.user){OPAGE="";save("fs3_opage",OPAGE);showTab("tOther");return}
  const email=ACCT.user.email||"";
  const deckCount=Math.max(0,Object.keys(DECKS.list).length-1);   // minus the draft
  $("accountpage").innerHTML=`<div class="page">
    <button class="btn" id="acctExit" style="margin-bottom:12px">← Other</button>
    <h1>Your account</h1>
    <p class="lede">Signed in as <b>${esc(email)}</b>.</p>

    <h3 class="sec2">This browser</h3>
    <div class="dstats">
      <div class="dstat"><b>${N(DUST.bal)}</b><i>dust</i></div>
      <div class="dstat"><b>${(DUST.titles||[]).length}</b><i>titles</i></div>
      <div class="dstat"><b>${deckCount}</b><i>decks saved</i></div>
    </div>

    <h3 class="sec2">Settings</h3>
    <div class="prow"><div><b>Site settings</b>
      <p>Prices, collection tracking, mini games, and everything else that changes how the site behaves for you.</p></div>
      <button class="btn" id="acctSettings">Open →</button></div>

    <h3 class="sec2">Sign out</h3>
    <div class="prow"><div><b>Sign out of this browser</b>
      <p>Your decks, dust, titles and collection stay safe in your account — this just clears them from here until you sign back in.</p></div>
      <button class="btn" id="acctSignOut">Sign out</button></div>

    <h3 class="sec2">Delete your data</h3>
    <div class="prow"><div><b>Delete everything</b>
      <p>Permanently deletes your saved decks, dust, titles, starred staples, collection and borrow template from Ready Set Ink's database, then signs you out and clears this browser. This can't be undone. It does not remove your Google sign-in itself — you're welcome to come back and start fresh any time.</p></div>
      <button class="btn bad" id="acctDelete">Delete everything</button></div>
  </div>`;
  $("acctExit").onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
  $("acctSettings").onclick=()=>{OPAGE="pref";save("fs3_opage",OPAGE);showTab("tOther")};
  $("acctSignOut").onclick=async()=>{
    const ok=await confirmBox("Sign out",
      "Your decks, dust, titles and collection stay safe in your account — this just clears them from this browser until you sign back in.",
      "Sign out");
    if(ok)ACCT.signOut();
  };
  $("acctDelete").onclick=()=>ACCT.deleteMyData();
}

