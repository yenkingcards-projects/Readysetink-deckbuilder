/* ===================== CSV import =====================
   There is no standard Lorcana collection export. Dreamborn, spreadsheets
   people keep by hand, and every deck site name their columns differently, so
   this reads headers loosely rather than demanding one shape. It matches on
   (name, set, number) when those are present and falls back to the name alone,
   which is what a hand-kept spreadsheet usually has.

   Nothing is written until the person has seen what matched. An import that
   silently drops half a binder is worse than one that refuses. */
const CSVCOL={
  name:["name","card","card name","cardname","title"],
  set:["set","set code","setcode","set number","expansion"],
  num:["number","card number","cardnumber","collector number","collectornumber","no","#"],
  qty:["count","quantity","qty","amount","have","normal","regular","copies"],
  foil:["foil","foils","foil count","foilcount","is foil","holo"],
};
/* A CSV parser that copes with quoted fields containing commas and newlines —
   card names have commas in them, so a split(",") would corrupt real rows. */
function csvParse(text){
  const rows=[];let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){
      if(ch==='"'&&text[i+1]==='"'){cell+='"';i++}
      else if(ch==='"')q=false;
      else cell+=ch}
    else if(ch==='"')q=true;
    else if(ch===","){row.push(cell);cell=""}
    else if(ch==="\n"){row.push(cell);rows.push(row);row=[];cell=""}
    else if(ch!=="\r")cell+=ch}
  if(cell.length||row.length){row.push(cell);rows.push(row)}
  return rows.filter(r=>r.some(c=>String(c).trim()!==""))}

const normName=n=>String(n||"").toLowerCase()
  .replace(/[’']/g,"'").replace(/\s*[-–—]\s*/g," - ").replace(/\s+/g," ").trim();

function csvAnalyse(text){
  const rows=csvParse(text);
  if(rows.length<2)return {error:"That file doesn't have a header row and at least one card."};
  const head=rows[0].map(h=>String(h).toLowerCase().trim());
  const find=keys=>{for(let i=0;i<head.length;i++)if(keys.indexOf(head[i])>=0)return i;return -1};
  const ci={};Object.keys(CSVCOL).forEach(k=>ci[k]=find(CSVCOL[k]));
  if(ci.name<0)return {error:"Couldn't find a column of card names. It should be headed Name, Card, or Card Name."};

  /* Index every printing twice: exactly, and by name alone for spreadsheets
     that only have names. */
  const byFull={},byName={};
  allPrintings().forEach(x=>{
    byFull[normName(x.c.f)+"|"+String(x.pr.s)+"|"+String(x.pr.num)]=x;
    const n=normName(x.c.f);
    if(!byName[n])byName[n]=x;});

  const hits=[],misses=[];
  for(let r=1;r<rows.length;r++){
    const cell=i=>i>=0&&rows[r][i]!=null?String(rows[r][i]).trim():"";
    const nm=cell(ci.name);if(!nm)continue;
    const qty=Math.max(0,parseInt(cell(ci.qty)||"1",10)||0);
    const foil=Math.max(0,parseInt(cell(ci.foil)||"0",10)||0);
    if(!qty&&!foil)continue;
    const key=normName(nm)+"|"+cell(ci.set)+"|"+cell(ci.num);
    const hit=byFull[key]||byName[normName(nm)];
    if(hit)hits.push({k:hit.k,name:hit.c.f,qty,foil});
    else misses.push(nm)}
  return {hits,misses,rows:rows.length-1}}

function csvApply(hits,mode){
  let touched=0,copies=0;
  hits.forEach(h=>{
    const o=owned(h.k);
    const n=mode==="add"?o[0]+h.qty:h.qty;
    const f=mode==="add"?o[1]+h.foil:h.foil;
    setOwned(h.k,n,f);touched++;copies+=h.qty+h.foil});
  return {touched,copies}}

let CSVPEND=null;
function renderImport(){
  const box=$("collImport");if(!box)return;
  box.innerHTML=`<div class="imp">
    <b>Import a CSV</b>
    <p>A file with a column of card names. Count, foil count, set and collector number
      are used when they're there. Nothing is written until you've seen what matched.</p>
    <input type="file" id="csvFile" accept=".csv,text/csv,text/plain">
    <div id="csvOut"></div>
  </div>`;
  $("csvFile").onchange=e=>{
    const f=e.target.files&&e.target.files[0];if(!f)return;
    const rd=new FileReader();
    rd.onload=()=>{
      const res=csvAnalyse(String(rd.result||""));
      const out=$("csvOut");
      if(res.error){out.innerHTML=`<p class="impbad">${esc(res.error)}</p>`;return}
      CSVPEND=res.hits;
      out.innerHTML=`
        <p class="impok"><b>${res.hits.length}</b> of ${res.rows} rows matched a card.
          ${res.misses.length?`<span class="impbad">${res.misses.length} didn't.</span>`:""}</p>
        ${res.misses.length?`<p class="impmiss">Not recognised: ${
          esc(res.misses.slice(0,8).join(" · "))}${res.misses.length>8?" …":""}</p>`:""}
        <div class="impbtns">
          <button class="btn go" data-imp="add">Add to what I own</button>
          <button class="btn" data-imp="set">Replace my counts</button>
        </div>`;
      out.querySelectorAll("[data-imp]").forEach(b=>b.onclick=async()=>{
        const mode=b.dataset.imp;
        const ok=await confirmBox(
          mode==="add"?"Add these to my collection":"Replace my counts",
          mode==="add"
            ? `Adds the imported numbers on top of what you already own, across ${CSVPEND.length} printings.`
            : `Sets ${CSVPEND.length} printings to exactly the numbers in the file, overwriting what's there. Anything not in the file is left alone.`,
          mode==="add"?"Add them":"Replace them", mode!=="add");
        if(!ok)return;
        const r=csvApply(CSVPEND,mode);
        toast(`Imported ${r.copies} cards across ${r.touched} printings`);
        renderColl()})};
    rd.onerror=()=>{$("csvOut").innerHTML=`<p class="impbad">Couldn't read that file.</p>`};
    rd.readAsText(f)}}

/* ===================== collection views =====================
   Two ways in, because they suit different moments. The set checklist is for
   cataloguing a binder in one sitting; the stepper in the card modal is for
   the one card you just pulled. Both write through setOwned(). */
/* A confirm in this site's own chrome. window.confirm() is an operating-system
   dialog that ignores every rule in the design system, and these actions —
   marking four of 261 cards, or clearing a whole set — are worth a beat. */
function confirmBox(title,body,okLabel,danger){
  return new Promise(done=>{
    const w=document.createElement("div");w.className="cfmbg";
    w.innerHTML=`<div class="cfm" role="dialog" aria-modal="true">
      <h3>${esc(title)}</h3><p>${esc(body)}</p>
      <div class="cfmb">
        <button class="btn" data-no>Cancel</button>
        <button class="btn ${danger?"bad go":"go"}" data-yes>${esc(okLabel)}</button>
      </div></div>`;
    document.body.appendChild(w);
    const shut=v=>{w.remove();document.removeEventListener("keydown",key);done(v)};
    const key=e=>{if(e.key==="Escape")shut(false);
      if(e.key==="Enter")shut(true)};
    w.querySelector("[data-no]").onclick=()=>shut(false);
    w.querySelector("[data-yes]").onclick=()=>shut(true);
    w.onclick=e=>{if(e.target===w)shut(false)};
    document.addEventListener("keydown",key);
    w.querySelector("[data-yes]").focus()})}

/* Hover a card name for two seconds and its art appears at the pointer. Two
   seconds because a shorter delay fires while you are simply reading down the
   list, which is worse than not having it at all. */
let PVT=null,PVEL=null;
function cardPreview(el,card){
  el.addEventListener("mouseenter",()=>{
    clearTimeout(PVT);
    PVT=setTimeout(()=>{
      const src=(prints(card)[0]||{}).l||(prints(card)[0]||{}).i||card.imgL||card.img;
      if(!src)return;
      PVEL=document.createElement("div");PVEL.className="cpv";
      PVEL.innerHTML=`<img src="${esc(String(src))}" alt="">`;
      document.body.appendChild(PVEL);
      move(lastX,lastY)},2000)});
  el.addEventListener("mousemove",e=>{lastX=e.clientX;lastY=e.clientY;
    if(PVEL)move(e.clientX,e.clientY)});
  el.addEventListener("mouseleave",()=>{clearTimeout(PVT);
    if(PVEL){PVEL.remove();PVEL=null}});
  function move(x,y){
    if(!PVEL)return;
    const w=250,h=349;
    /* Flip to the other side of the pointer near an edge so the card is never
       clipped by the window. */
    const left=x+18+w>innerWidth?x-18-w:x+18;
    const top=Math.max(6,Math.min(innerHeight-h-6,y-h/2));
    PVEL.style.left=left+"px";PVEL.style.top=top+"px"}
}
let lastX=0,lastY=0;

let COLLSET=load("fs3_collset",null);
let COLLTAB=load("fs3_colltab","list");
/* [id, label, quantity, rarities-it-applies-to]. A null rarity list means the
   whole set. Kept as data so adding "4 of all Super Rares" is one line. */
const FASTBULK=[
  ["all4","Own 4 of each card",4,null],
  ["all1","Own 1 of each card",1,null],
  ["c4","Own 4 of all Commons",4,["Common"]],
  ["u4","Own 4 of all Uncommons",4,["Uncommon"]],
  ["r4","Own 4 of all Rares",4,["Rare"]],
  ["cur4","Own 4 of Commons, Uncommons and Rares",4,["Common","Uncommon","Rare"]],
  ["sr4","Own 4 of all Super Rares",4,["Super Rare"]],
  ["l4","Own 4 of all Legendaries",4,["Legendary"]],
  ["clear","Clear this set",0,null],
];

/* Export. A real downloaded file, not a copy-to-clipboard: a collection is the
   one thing on this site that would genuinely hurt to lose, and it should be
   possible to keep a copy of it somewhere that isn't a browser.

   CSV, because that opens in anything — a spreadsheet, another deck site, a
   text editor — and because the columns match what the importer here already
   reads back in. Prices are included when the build has them, so the file also
   answers "what is all this worth", which is the other reason people export.

   Blob + object URL, revoked straight after: no server, works from file://. */
function exportCollection(){
  const rows=allPrintings().filter(x=>ownTotal(x.k));
  if(!rows.length){toast("Nothing in your collection to export yet");return}
  const q=s=>`"${String(s==null?"":s).replace(/"/g,'""')}"`;
  const withPrice=!!priceDate();
  const head=["Name","Version","Set","Set name","Number","Rarity","Normal","Foil"]
    .concat(withPrice?["Market price each","Market foil price each","Market value"]:[]);
  const setName=s=>(setList().find(x=>x.s===s)||{}).name||("Set "+s);
  let value=0;
  const body=rows.map(x=>{
    const o=owned(x.k),p=x.pr.p??null,pf=x.pr.pf??null;
    const v=(p||0)*o[0]+(pf||0)*o[1];
    value+=v;
    return [x.c.n,x.c.v||"",x.pr.s,setName(x.pr.s),x.pr.num,x.pr.r,o[0],o[1]]
      .concat(withPrice?[p??"",pf??"",v?v.toFixed(2):""]:[]).map(q).join(",")});
  const csv=[head.map(q).join(",")].concat(body).join("\r\n")+"\r\n";
  const stamp=new Date().toISOString().slice(0,10);
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`ready-set-ink-collection-${stamp}.csv`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  toast(`Exported ${rows.length} printings${withPrice&&value?` · about ${money(value)}`:""}`);
}
function renderColl(){
  const sets=setList(), total=allPrintings().length;
  if(!COLLSET||!sets.some(x=>x.s===COLLSET))COLLSET=sets.length?sets[0].s:null;
  const distinct=Object.keys(COLL).length;
  $("collSum").innerHTML=`<div class="stats">
    <div class="stt"><b>${collCopies().toLocaleString()}</b><i>Cards owned</i></div>
    <div class="stt"><b>${distinct.toLocaleString()}</b><i>Printings</i></div>
    <div class="stt"><b>${collFoils().toLocaleString()}</b><i>Foils</i></div>
    <div class="stt"><b>${Math.round(distinct/total*100)}%</b><i>of <span id="collN">${total.toLocaleString()}</span></i></div>
  </div>`;
  const rows=allPrintings().filter(x=>x.pr.s===COLLSET)
    .sort((a,b)=>numSort(a.pr.num,b.pr.num));
  const have=rows.filter(x=>ownTotal(x.k)).length;
  /* The set chips, with the three Illumineer's Quest boxes folded away.
     They're campaign products, not main sets: 66 cards nobody plays in a
     constructed deck, sitting in the same row as The First Chapter and taking
     up a third of it. Closed by default, and the block says how many you have
     so nothing is hidden — just tidied. */
  const isMain=x=>/^\d+$/.test(String(x.s));
  const chip=x=>{
    const mine=allPrintings().filter(y=>y.pr.s===x.s&&ownTotal(y.k)).length;
    /* The set's own name already begins "Illumineer's Quest:", which is pure
       repetition once they're inside a block that says so. */
    const label=String(x.name).replace(/^Illumineer's Quest:\s*/,"");
    return `<button class="chip${x.s===COLLSET?" on":""}" data-cset="${esc(String(x.s))}">
      <span>${esc(label)}</span><span class="n">${mine}/${x.n}</span></button>`};
  const main=sets.filter(isMain),other=sets.filter(x=>!isMain(x));
  const otherMine=other.reduce((a,x)=>
    a+allPrintings().filter(y=>y.pr.s===x.s&&ownTotal(y.k)).length,0);
  const otherTot=other.reduce((a,x)=>a+x.n,0);
  const setPicker=`
    <div class="chips">${main.map(chip).join("")}</div>
    ${other.length?`<details class="otherset"${other.some(x=>x.s===COLLSET)?" open":""}>
      <summary>Other sets<span class="n">${otherMine}/${otherTot}</span></summary>
      <div class="chips">${other.map(chip).join("")}</div>
    </details>`:""}`;

  $("collBody").innerHTML=`
    <!-- Top-level tabs, above the set picker: browsing a set and bulk-loading
         a collection are two different jobs. Bulk entry and CSV import used to
         be a sub-tab underneath the set chips, which put the "I already own
         thousands of these" path behind a "pick one set" step. -->
    <div class="ctabs">
      <button data-ctab="list" class="${COLLTAB==="list"?"on":""}">📋 My checklist</button>
      <button data-ctab="fast" class="${COLLTAB==="fast"?"on":""}">📥 Transfer Your Collection</button>
      <button id="collExport">📤 Export my collection</button>
    </div>
    ${COLLTAB==="fast"?`<div class="fastpanel">
      <p class="fastlede">Already have a collection? Bring it over in one go rather than
        ticking three thousand boxes.</p>
      <div id="collImport"></div>
      <h3 class="sec2">Or fill a whole set at once</h3>
      ${setPicker}
      <div class="collbar"><b>${have} of ${rows.length} in this set</b></div>
      <div class="fastgrid">
        ${FASTBULK.map(([id,label,qty,rar])=>
          `<button class="btn${qty===0?" bad":""}" data-fast="${id}">${esc(label)}</button>`).join("")}
      </div>
      <p class="fastnote">These change a lot of rows at once, so each one asks first.
        Foil counts are left alone — marking a playset doesn't claim you own four foils.</p>
    </div>`:`
    <h3 class="sec2">Choose a set</h3>
    ${setPicker}`}
    <div class="clist"${COLLTAB==="fast"?' hidden':''}>${rows.map(x=>{
      const o=owned(x.k);
      return `<div class="crow${o[0]+o[1]?" has":""}" data-k="${esc(String(x.k))}">
        <span class="cnum">#${esc(String(x.pr.num))}</span>
        <span class="cnm">${esc(x.c.n)}${x.c.v?` <i>${esc(x.c.v)}</i>`:""}</span>
        <span class="crar">${rarLabel(x.pr.r)}</span>
        <span class="cq"><em>Normal</em>
          <button data-cm="n">−</button><b>${o[0]}</b><button data-cp="n">+</button></span>
        <span class="cq"><em>Foil</em>
          <button data-cm="f">−</button><b>${o[1]}</b><button data-cp="f">+</button></span>
      </div>`}).join("")}</div>`;
  {const ex=$("collExport");if(ex)ex.onclick=()=>exportCollection()}
  $("collBody").querySelectorAll("[data-cset]").forEach(b=>b.onclick=()=>{
    COLLSET=b.dataset.cset;save("fs3_collset",COLLSET);renderColl()});
  renderImport();
  $("collBody").querySelectorAll("[data-ctab]").forEach(b=>b.onclick=()=>{
    COLLTAB=b.dataset.ctab;save("fs3_colltab",COLLTAB);renderColl()});
  $("collBody").querySelectorAll("[data-fast]").forEach(b=>b.onclick=async()=>{
    const spec=FASTBULK.find(f=>f[0]===b.dataset.fast);if(!spec)return;
    const [,label,qty,rar]=spec;
    const hit=rows.filter(x=>!rar||rar.indexOf(x.pr.r)>=0);
    if(!hit.length){toast("No cards of that rarity in this set");return}
    const setName=(sets.find(x=>x.s===COLLSET)||{}).name||"this set";
    const ok=await confirmBox(label,
      qty===0
        ? `This sets ${hit.length} rows in ${setName} back to zero, foils included. It can't be undone.`
        : `This marks ${qty} of ${hit.length} ${rar?"cards of that rarity":"cards"} in ${setName}. Anything you already own at a different number will be overwritten.`,
      qty===0?"Clear them":`Mark ${qty} of each`, qty===0);
    if(!ok)return;
    hit.forEach(x=>{const o=owned(x.k);setOwned(x.k,qty,qty?o[1]:0)});
    toast(qty?`Marked ${qty} of ${hit.length} cards`:`Cleared ${hit.length} rows`);
    renderColl()});
  $("collBody").querySelectorAll(".crow").forEach(row=>{
    const k=row.dataset.k;
    const nm=row.querySelector(".cnm"),rec=rows.find(x=>x.k===k);
    if(nm&&rec)cardPreview(nm,rec.c);
    row.querySelectorAll("[data-cp],[data-cm]").forEach(btn=>btn.onclick=()=>{
      const o=owned(k).slice();
      const which=btn.dataset.cp||btn.dataset.cm, up=!!btn.dataset.cp;
      const i=which==="f"?1:0;
      o[i]=Math.max(0,o[i]+(up?1:-1));
      setOwned(k,o[0],o[1]);renderColl()})});
}

/* Parked settings. Not rendered — see the note in renderPrefs. Kept as data so
   that shipping one is moving a line, not rewriting the page from a changelog. */
const PREF_SOON=[
  ["Sync across devices","Choose what follows you between your phone and your computer, rather than all of it.","pfSync"],
  ["Clans","Trade boards, clan tags and shared collections. Designed, parked — see CLANS-design.","pfClan"],
  ["Contribution review","Approve art tags and rules notes sent in by other people before they go live.","pfRev"],
  ["Patron perks","Recognition and badges. Deliberately not access — the disclaimer forbids charging for that.","pfPat"]];

/* Settings. Only one switch so far, but the page is the right home for the
   next one rather than another tile on the Other menu. */
/* Set to true right before navigating here from the "5th deck" nudge, so the
   instructions are already open instead of one more tap away. Reset once the
   page has used it — a permanent open state would just be one more thing an
   unrelated toggle click on this page has to remember not to close. */
let A2HSOPEN=false;
function renderPrefs(){
  /* Ben's call: the name of the switch and the switch, nothing else. Every one
     of these used to carry two or three sentences explaining itself, which
     turned a settings page into an essay you had to read to find the toggle
     you came for. "Card prices" does not need telling you what a price is.
     The one exception below is Sync, which reports a state rather than
     offering a choice, and Reset, where the button is destructive enough that
     the sentence saying what it does NOT touch has to stay.

     The state word sits in a fixed-width slot for the same reason the reminder
     toggle does — On and Off are different widths and a button should not
     change size when you press it. */
  const row=(title,btnId,state,off)=>`
    <div class="prow${off?" soon":""}">
      <div><b>${esc(title)}</b>${off?`<span class="soonlbl">Coming soon</span>`:""}</div>
      <button class="btn" id="${btnId}"${off?" disabled":""} aria-pressed="${!off&&!!state}"><b class="sw">${off?"—":(state?"ON":"OFF")}</b></button>
    </div>`;
  /* Sign-in status, in the one place someone goes looking when a thing didn't
     save. Signed out this says nothing at all — the site is a local tool and
     an account is optional, so nagging about it would be wrong. */
  const SYNCLBL={fs3_decks:"decks",fs3_dust:"dust and titles",fs3_stars:"starred staples",
    fs3_coll:"collection",fs3_borrowdef:"borrow message"};
  const sr=(window.ACCT&&ACCT.syncReport&&ACCT.syncReport())||null;
  const syncRow=!sr?"":`
    <div class="prow${sr.refused.length?" locked":""}">
      <div><b>Sync</b><p>${sr.refused.length
        ? "The database is refusing to store your "
          +sr.refused.map(k=>SYNCLBL[k]||k).join(" and ")
          +". Everything still saves in this browser — it just isn't following you"
          +" between devices. Running supabase-add-collection.sql fixes it."
        : sr.saved.length
          ? "Saving to your account: "+sr.saved.map(k=>SYNCLBL[k]||k).join(", ")+"."
          : "Signed in. Nothing has needed saving yet this visit — change something"
            +" and this line will tell you whether it reached your account."}</p></div>
      <button class="btn" disabled>${sr.refused.length?"Partial":"OK"}</button>
    </div>`;
  $("prefBody").innerHTML=`
    <button class="btn" id="prefBack">← Back to Other</button>
    <div class="legal">
      <b>Disney Lorcana TCG</b>
      <p>Ready Set Ink is unofficial fan content. Not published, endorsed or
        approved by Disney or Ravensburger. Free to use, always — we're
        expressly prohibited from charging for it.</p>
      <p>© Disney. Disney Lorcana is operated by Ravensburger, an official
        licensee of Disney.</p>
      <p>We may earn an affiliate commission from purchases made through links
        on this website. It costs you nothing and never changes what we
        recommend.</p>
      <p>This site counts page views so we can tell which parts of it are
        actually useful. No cookies, no accounts required, nothing that
        identifies you, and nothing shared with anyone. Your decks and your
        collection are yours and never leave your browser unless you sign in.</p>
    </div>
    ${syncRow?`<h3 class="sec2">Your account</h3>${syncRow}`:""}
    <h3 class="sec2">Save as an app</h3>
    <details class="a2hsinfo" id="a2hsDetails"${A2HSOPEN?" open":""}>
      <summary><b>Save Ready Set Ink to your home screen</b>
        Opens full-screen, no browser bar, one tap from your phone</summary>
      <div class="a2hsbody">
        <div class="a2hsplat">
          <h4>iPhone or iPad (Safari)</h4>
          <ol><li>Tap the <b>Share</b> button (the square with an arrow pointing up).</li>
            <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
            <li>Tap <b>Add</b> in the top right.</li></ol>
        </div>
        <div class="a2hsplat">
          <h4>Android (Chrome)</h4>
          <ol><li>Tap the <b>⋮</b> menu in the top right.</li>
            <li>Tap <b>Install app</b> (or <b>Add to Home screen</b>).</li>
            <li>Confirm with <b>Install</b>.</li></ol>
        </div>
        <div class="a2hsplat">
          <h4>Desktop (Chrome or Edge)</h4>
          <ol><li>Look for the install icon in the address bar — a small monitor with an arrow, or a ⊕.</li>
            <li>Click it, then click <b>Install</b>.</li>
            <li>No icon there? Open the <b>⋮</b> menu and look for <b>Install Ready Set Ink…</b>.</li></ol>
        </div>
      </div>
    </details>
    <h3 class="sec2">What's switched on</h3>
    <!-- One pair of buttons for people who know what they want: everything, or
         nothing. Dark mode is left out of both — it's a look, not a feature,
         and it's gated separately. -->
    <div class="prow allrow">
      <div><b>Everything at once</b></div>
      <div class="allbtns">
        <button class="btn go" id="pfAllOn">All on</button>
        <button class="btn" id="pfAllOff">All off</button>
      </div>
    </div>
    ${row("Collection tracking","pfColl",COLLON)}
    ${row("Card prices","pfPrice",PRICES)}
    ${row("Mini games","pfGames",GAMESON)}
    ${row("Dust","pfDust",DUSTON)}
    ${darkOK()
      ? row("Dark mode","pfDark",DARK)
      : `<div class="prow locked">
          <div><b>Dark mode <span class="soonlbl">Patron perk</span></b></div>
          <button class="btn" disabled>Locked</button>
        </div>`}
    <h3 class="sec2">Start over</h3>
    <!-- Deliberately NOT a wipe. It resets the switches and replays the tour;
         your decks, your collection and your dust are untouched, and the button
         says so before it does anything. -->
    <div class="prow">
      <div><b>Reset my setup</b><p>Runs the welcome tour again and takes you back
        through the setup questions. Your decks, your collection and your dust are
        left exactly as they are — this only resets the switches on this page.</p></div>
      <button class="btn bad" id="pfReset">Reset setup</button>
    </div>
    <!-- Housekeeping. Deliberately the quietest thing on the page: small, grey,
         at the bottom, no heading of its own. Here so somebody who goes looking
         can find it, not so anybody has to read it. -->
    <div class="about">
      <span><b>${CARDS.length.toLocaleString()}</b> cards · card data ${esc(DATA.generated||"unknown")}${
        priceDate()?` · prices ${esc(priceDate())}`:""}</span>
      <button class="btn tiny" id="pfRefresh" title="Fetch the newest build of this page from the server">Check for new cards</button>
    </div>
    <div class="about"><span></span><a class="btn tiny" href="/roadmap/" target="_blank" rel="noopener">What's next →</a></div>`;
    /* The "Not built yet" list is hidden at Ben's request — a settings page
       that is mostly disabled switches reads as an unfinished site rather than
       as a roadmap. The rows are kept in PREF_SOON below rather than deleted,
       so each one comes back by moving it up here when it's real. */
  $("prefBack").onclick=()=>{OPAGE="";save("fs3_opage",OPAGE);showTab("tOther")};
  {const d=$("a2hsDetails");
   if(d){
     d.ontoggle=()=>{A2HSOPEN=d.open};
     if(A2HSOPEN){d.scrollIntoView({block:"start"});A2HSOPEN=false}
   }}
  const flip=(id,get,set,msg)=>{const b=$(id);if(!b||b.disabled)return;
    b.onclick=()=>{set(!get());renderPrefs();applyPrefs();toast(msg(get()))}};
  flip("pfColl",()=>COLLON,v=>{COLLON=v;save(K_COLLON,v)},
    v=>v?"Collection features on":"Collection features off");
  flip("pfPrice",()=>PRICES,v=>setPrices(v),
    v=>v?"Prices on":"Prices off");
  flip("pfGames",()=>GAMESON,v=>{GAMESON=v;save("fs3_gameson",v)},
    v=>v?"Mini games on":"Mini games off");
  flip("pfDust",()=>DUSTON,v=>{DUSTON=v;save("fs3_duston",v)},
    v=>v?"Dust back on":"Dust off — you keep what you had");
  flip("pfDark",()=>DARK,v=>{DARK=v;save("fs3_dark",v)},
    v=>v?"Dark mode on":"Back to the light theme");
  /* All on / all off. Dark mode is excluded on purpose — it is a look, it is
     gated, and sweeping it along with the feature switches would surprise
     people twice over. */
  const setAll=on=>{
    COLLON=on;save(K_COLLON,on);
    GAMESON=on;save("fs3_gameson",on);
    DUSTON=on;save("fs3_duston",on);
    PRICES=on&&!!priceDate();save("fs3_prices",PRICES);
    renderOther();renderPrefs();applyPrefs();
    toast(on?"Everything switched on":"Stripped back to search and decks")};
  {const a=$("pfAllOn"),b=$("pfAllOff");
   if(a)a.onclick=()=>setAll(true);
   if(b)b.onclick=()=>setAll(false)}
  {const r=$("pfReset");
   if(r)r.onclick=async()=>{
     const ok=await confirmBox("Reset my setup",
       "This replays the welcome tour and the setup questions, and puts the switches on this page back to their defaults. Your decks, your collection and your dust are not touched.",
       "Reset setup");
     if(!ok)return;
     COLLON=true;save(K_COLLON,true);
     GAMESON=true;save("fs3_gameson",true);
     DUSTON=true;save("fs3_duston",true);
     setPrices(false);
     applyPrefs();renderOther();
     OPAGE="";save("fs3_opage",OPAGE);showTab("tDeck");
     startTour(true)}}
  {const r=$("pfRefresh");
   if(r)r.onclick=async()=>{
     /* Card data is BAKED IN at build time — that is what makes this one file
        work with no network at all. So there is nothing to fetch from Lorcana
        at runtime and this button does not pretend there is. What it actually
        does is duller and genuinely useful: make the browser throw away its
        cached copy of the page and take the newest one from the server. If a
        set has shipped since your browser last looked, that is exactly the fix.
        Offline it says so and does nothing. */
     if(!navigator.onLine){toast("You're offline — the cards you have are the cards you have");return}
     const ok=await confirmBox("Check for new cards",
       "New sets arrive when the site is rebuilt, so this reloads the page from the "
       +"server rather than from your browser's cache. Your decks, collection and "
       +"settings are stored separately and aren't touched.",
       "Reload the page");
     if(!ok)return;
     try{if(window.caches&&caches.keys)(await caches.keys()).forEach(k=>caches.delete(k))}catch(e){}
     location.replace(location.href.split("#")[0].split("?")[0]+"?v="+Date.now());
   }}
  applyPrefs();
}
