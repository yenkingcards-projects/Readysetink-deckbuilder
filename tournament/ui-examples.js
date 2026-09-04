(function(){"use strict";
const samplePlayers=[
  "readysetink_ben",
  "readysetink_kenny",
  "MilkGoesInLast",
  "lorcanarob",
  "dadcana",
  "flounder",
  "rebekahquests",
  "bweiszeezy",
  "lorcanaman",
  "lorcanastan",
];
function update(){const field=document.querySelector('#fullSetup textarea[name="players"]');if(field)field.placeholder=samplePlayers.join("\n")}
const app=document.getElementById("app");if(app)new MutationObserver(update).observe(app,{childList:true,subtree:true});update();
})();
