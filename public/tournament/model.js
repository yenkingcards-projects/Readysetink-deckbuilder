(function(root,factory){const api=factory(root.RSITournamentRules||(typeof require==="function"?require("./rules.js"):null));if(typeof module==="object"&&module.exports)module.exports=api;root.RSITournamentModel=api})(typeof globalThis!=="undefined"?globalThis:this,function(Rules){
  "use strict";
  const KEY="rsi:tournament-companion:v1";
  const empty=()=>({version:2,active:null,events:[],reminders:[],activeFull:null,fullEvents:[]});
  const normalize=data=>({...empty(),...(data||{}),events:(data&&data.events)||[],reminders:(data&&data.reminders)||[],fullEvents:(data&&data.fullEvents)||[],activeFull:data&&data.activeFull?{workflow:"live",matchFormat:"bo3",roundMinutes:50,dropped:[],audit:[],...data.activeFull}:null});
  function record(rounds){return (rounds||[]).filter(r=>r.stage!=="cut").reduce((a,r)=>{if(r.result==="W")a.w++;if(r.result==="L")a.l++;if(r.result==="D")a.d++;a.points+=Rules.points(r.result);return a},{w:0,l:0,d:0,points:0})}
  function status(event){
    const r=record(event.rounds),s=Rules.eventStructure(event.players,event.level),done=event.rounds.length;
    if(!s.cut)return {tone:"neutral",label:"No required Top Cut",detail:s.suggestedCut?`A Top ${s.suggestedCut} is advised by attendance, but only required for Competitive and Premier events.`:"This attendance has Swiss rounds only."};
    if(done>=s.rounds)return {tone:"neutral",label:"Swiss complete",detail:`Check the official standings for the Top ${s.cut}. Tiebreakers need the full field's results.`};
    const max=r.points+(s.rounds-done)*3;
    if(r.points===done*3)return {tone:"good",label:`On a ${s.cut===4?"Top 4":"Top 8"} pace`,detail:"You are unbeaten so far. Official standings and tiebreakers decide the final cut."};
    if(max<Math.max(3,(s.rounds-1)*3))return {tone:"warn",label:"You may need help",detail:"Keep playing it out. The official standings and tiebreakers are what count."};
    return {tone:"watch",label:"Still in the hunt",detail:"Your next result matters. The official standings and tiebreakers decide the final cut."};
  }
  function create(input){const structure=Rules.eventStructure(input.players,input.level);return {id:`evt-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:input.name.trim(),date:input.date,location:(input.location||"").trim(),type:input.type,level:input.level,players:Number(input.players),deckName:input.deckName.trim(),inks:input.inks.slice(0,2),structure,rounds:[],phase:"before",stage:"swiss",createdAt:new Date().toISOString()}}
  function validScore(result,score){if(!score)return true;const [w,l]=score.split("-").map(Number);return result==="W"?w>l:result==="L"?l>w:w===l}
  const tally=rounds=>record(rounds.map(r=>r.stage==="cut"?{...r,stage:"swiss"}:r)) // win rates count Top Cut matches; record() stays Swiss-only for match points
  const inkKey=r=>(r.opponentInks||[]).slice().sort().join(" / ")
  const deckOf=e=>(e.deckName||"").trim()||(e.inks||[]).slice().sort().join(" / ")
  const madeCut=e=>(e.rounds||[]).some(r=>r.stage==="cut")||/top\s*(4|8|16|cut)/i.test(e.placement||"")
  function group(rounds,key){const map={};rounds.forEach(r=>{const k=key(r);if(!k)return;(map[k]||(map[k]=[])).push(r)});return Object.entries(map).map(([name,items])=>({name,...tally(items),matches:items.length,rate:Math.round(tally(items).w/items.length*100)})).sort((a,b)=>b.matches-a.matches||b.rate-a.rate)}
  function deckGroups(events,key){const map={};(events||[]).forEach(e=>{const name=key(e);if(!name)return;const item=map[name]||(map[name]={name,rounds:[],events:0,points:0,topCuts:0});const swiss=(e.rounds||[]).filter(r=>r.stage!=="cut");item.rounds.push(...swiss);item.events++;item.points+=record(swiss).points;if(madeCut(e))item.topCuts++});return Object.values(map).map(x=>{const r=record(x.rounds);return {...x,...r,matches:x.rounds.length,rate:x.rounds.length?Math.round(r.w/x.rounds.length*100):0,avgPoints:x.events?Math.round(x.points/x.events*10)/10:0}}).sort((a,b)=>b.matches-a.matches||b.rate-a.rate)}
  function streak(rounds){let n=0,type="";for(let i=rounds.length-1;i>=0;i--){const r=rounds[i].result;if(!type)type=r;if(r!==type)break;n++}return n?`${n} ${type==="W"?"win":type==="L"?"loss":"draw"}${n===1?"":"s"}`:"—"}
  function analytics(events){const rounds=(events||[]).flatMap(e=>(e.rounds||[]).filter(r=>r.kind!=="bye"&&r.opponent)),recent=rounds.slice(-10),opponents=group(rounds,r=>r.opponent),inks=group(rounds,inkKey),combos=deckGroups(events,e=>(e.inks||[]).slice().sort().join(" / ")||"No inks recorded"),decks=deckGroups(events,e=>deckOf(e)||"Unnamed deck");return {overall:tally(rounds),opponents,inks,first:group(rounds,r=>r.started==="me"?"Started first":r.started?"Started second":""),choice:group(rounds,r=>r.wonChoice===true?"Won choice":r.wonChoice===false?"Lost choice":""),decks,combos,recent:{...tally(recent),matches:recent.length,rate:recent.length?Math.round(tally(recent).w/recent.length*100):0},streak:streak(rounds),topCuts:(events||[]).filter(madeCut).length,bestMatchup:inks.filter(x=>x.matches>=3).sort((a,b)=>b.rate-a.rate)[0]||null,toughestMatchup:inks.filter(x=>x.matches>=3).sort((a,b)=>a.rate-b.rate)[0]||null}}
  /* Journey layer: derived from saved events only, so existing journals light up retroactively. */
  const INKS=["Amber","Amethyst","Emerald","Ruby","Sapphire","Steel"]
  const PAIRS=INKS.flatMap((a,i)=>[a,...INKS.slice(i+1).map(b=>`${a} / ${b}`)]) // 6 mono + 15 pairs, in inkKey() format
  const AWARDS=["journal1","firstwin","topcut","regular","bingo"] // paid in Dust by the main site — must match ACHIEVEMENTS in flounder-search.template.html
  const played=events=>(events||[]).flatMap(e=>(e.rounds||[]).filter(r=>r.kind!=="bye"&&r.result).map(r=>({...r,date:e.date||"",deck:deckOf(e)})))
  function bingo(events){const beaten=new Set(played(events).filter(r=>r.result==="W").map(inkKey));return {cells:PAIRS.map(name=>({name,won:beaten.has(name)})),won:PAIRS.filter(p=>beaten.has(p)).length,total:PAIRS.length}}
  function milestones(events){const done=[],hit=(id,label,date,icon)=>{if(!done.some(m=>m.id===id))done.push({id,label,date,icon})},ordered=(events||[]).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.createdAt||"").localeCompare(b.createdAt||""));let matches=0
    ordered.forEach((e,i)=>{hit("journal1","Logged your first event",e.date,"🎟️");if(i===4)hit("regular","Five events in the journal",e.date,"🗓️")
      const all=(e.rounds||[]).filter(r=>r.kind!=="bye"&&r.result),swiss=all.filter(r=>r.stage!=="cut")
      all.forEach(r=>{matches++;if(r.result==="W")hit("firstwin","First match win",e.date,"⭐");if([10,25,50,100].includes(matches))hit(`m${matches}`,`${matches} matches logged`,e.date,"📈")})
      if(madeCut(e))hit("topcut",`First Top Cut — ${e.name}`,e.date,"🏆")
      if(swiss.length>=3&&!swiss.some(r=>r.result==="L"))hit("undefeated",`Undefeated Swiss — ${e.name}`,e.date,"🛡️")})
    if(ordered.length&&bingo(events).won===PAIRS.length)hit("bingo","Beaten every ink combination",ordered[ordered.length-1].date,"🎯")
    const need=[10,25,50,100].find(n=>matches<n);return {done,next:need?{label:`${need} matches logged`,have:matches,need}:null}}
  function awardsDue(events){const ids=milestones(events).done.map(m=>m.id);return AWARDS.filter(id=>ids.includes(id))}
  function prep(events,deck){const rows=group(played(events).filter(r=>r.deck===deck),inkKey).map(x=>({...x,low:x.matches<3})).sort((a,b)=>a.rate-b.rate||b.matches-a.matches),sure=rows.filter(x=>!x.low);return {deck,rows,focus:(sure.length?sure:rows).slice(0,2)}}
  const trend=events=>group(played(events),r=>r.date.slice(0,7)).sort((a,b)=>a.name.localeCompare(b.name))
  const decks=events=>[...new Set((events||[]).map(deckOf).filter(Boolean))]
  function storage(store){return {load(){try{return normalize(JSON.parse(store.getItem(KEY)))}catch(_){return empty()}},save(data){store.setItem(KEY,JSON.stringify(normalize(data)))},key:KEY}}
  return {KEY,empty,normalize,record,status,create,validScore,analytics,storage,bingo,milestones,awardsDue,prep,trend,decks};
});
