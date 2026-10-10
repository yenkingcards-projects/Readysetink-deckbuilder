/* One place that applies every switch, so a new one can't be half-wired. */
function applyPrefs(){
  applyCollPref();
  /* Locked out of the perk means locked out of the look, even if the stored
     preference says otherwise — otherwise cancelling a pledge, or the free
     window closing, would leave the theme switched on for ever. The preference
     itself is never cleared, so renewing brings it straight back. */
  document.body.classList.toggle("dark",DARK&&darkOK());
  document.body.classList.toggle("nogames",!GAMESON);
  document.body.classList.toggle("nodust",!DUSTON);
  drawTitle&&drawTitle();
}
function applyCollPref(){document.body.classList.toggle("nocoll",!COLLON)}

const OPAGES={
  guess: ["vGuess",  ()=>renderGuess()],
  dust:  ["vDust",   ()=>renderDust()],
  quiz:  ["vQuiz",   ()=>renderQuiz()],
  contrib:["vContrib",()=>renderContrib()],
  err:   ["vErr",    ()=>renderErr()],
  start: ["vStart",  ()=>renderStart()],
  upg:   ["vUp",     ()=>renderUpgrade()],
  mick:  ["vMick",   ()=>renderMickeys()],
  leak:  ["vLeak",   ()=>renderLeaks()],
  world: ["vWorld",  ()=>renderWorld()],
  aqua:  ["vAqua",   ()=>renderAqua()],
  cred:  ["vCred",   ()=>renderCredits()],
  links: ["vLinks",  ()=>renderLinks()],
  account:["vAccount",()=>renderAccount()],
  pref:  ["vPref",   ()=>renderPrefs()],
  lore:  ["vLore",   ()=>{LORE_FRESH=true;renderLore()}],
  judge: ["vJudge",  ()=>renderStandaloneJudge()],
  meta:  ["vMeta",   ()=>renderMetaPage()],
};
/* Pages that belong to a switch. Turning the switch off takes the tile out of
   the menu; the page itself still works if you know the URL, exactly like OFF. */
/* The three guessing games are "quiz:ability", "quiz:flavour", "quiz:reveal",
   so this matches on the prefix — listing them individually is how the next
   one added would quietly escape the switch. */
const GAMEPAGES=["guess","quiz","aqua"];
const isGamePage=p=>GAMEPAGES.some(g=>p===g||p.indexOf(g+":")===0);
/* A tile's "page" is one of three things: an internal view name ("dust"), a
   same-site path ("/match-history/"), or a full URL off to another
   subdomain ("https://map.readysetink.com/"). The first opens on this tab,
   the other two are real <a> links — the third additionally in a new tab, so
   leaving for the store finder or the Ink List doesn't lose your deck. */
const isPageLink=p=>!!p&&(p.charAt(0)==="/"||/^https?:\/\//.test(p));
const isExternalLink=p=>/^https?:\/\//.test(p);
function renderOther(){
  const hidden=p=>OFF.includes(p)
    ||(!GAMESON&&isGamePage(p))
    ||(!DUSTON&&p==="dust");
  const groups=OTHER_GROUPS
    .map(gr=>({...gr,chips:gr.chips.filter(([,,page])=>!hidden(page))}))
    .filter(gr=>gr.chips.length);
  $("otherTiles").innerHTML=groups.map(gr=>
    (gr.g?`<h3 class="sec2 ogh">${esc(gr.g)}</h3>`:"")+
    `<div class="tiles">${gr.chips.map(([t,d,page])=>{
      const link=isPageLink(page),ext=link&&isExternalLink(page),tag=link?"a":page?"button":"div";
      return `<${tag} class="tile${page?" ready":""}"${link?` href="${page}"${ext?` target="_blank" rel="noopener"`:""}`:page?` data-op="${page}"`:""}>
        <h3>${esc(t)}</h3><p>${esc(d)}</p>
        <span class="st2">${page?ext?"Open ↗":"Open →":"Planned"}</span></${tag}>`}).join("")}</div>`
  ).join("");
  $("otherTiles").querySelectorAll("[data-op]").forEach(b=>b.onclick=()=>{
    OPAGE=b.dataset.op;save("fs3_opage",OPAGE);showTab("tOther")});
}

