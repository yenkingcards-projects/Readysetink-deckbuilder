(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.RSITournamentRules=api})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const TABLE=[
    {min:8,max:8,rounds:3,cut:0},
    {min:9,max:16,rounds:4,cut:4},
    {min:17,max:32,rounds:5,cut:8},
    {min:33,max:64,rounds:6,cut:8},
    {min:65,max:128,rounds:7,cut:8},
    {min:129,max:226,rounds:8,cut:8},
    {min:227,max:Infinity,rounds:9,cut:8}
  ];
  function eventStructure(players,level){
    const n=Number(players),row=TABLE.find(x=>n>=x.min&&n<=x.max);
    if(!row)return {players:n,rounds:0,cut:0,official:false,message:"Official tournaments need at least 8 players."};
    const requiredCut=/^(competitive|premier)$/i.test(level||"");
    return {players:n,rounds:row.rounds,cut:requiredCut?row.cut:0,suggestedCut:row.cut,official:true,requiredCut};
  }
  function points(result){return result==="W"?3:result==="D"?1:0}
  return {VERSION:"2026-07-14",TABLE,eventStructure,points};
});
