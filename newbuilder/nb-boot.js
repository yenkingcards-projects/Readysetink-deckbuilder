/* Runs in <head>, before the first paint. Decides one thing: is the new
   builder on? It is the default. ?newbuilder=0 (More → Classic builder)
   switches this device back to the classic builder and remembers that;
   ?newbuilder=1 turns the new one back on. Everything else is in nb.css / nb.js. */
(function(){try{
  var q=new URLSearchParams(location.search).get("newbuilder"),on;
  if(q==="0"){localStorage.setItem("fs3_nb","0");on=false}
  else if(q==="1"){localStorage.removeItem("fs3_nb");on=true}
  else on=localStorage.getItem("fs3_nb")!=="0";
  if(on)document.documentElement.classList.add("nb");
}catch(e){document.documentElement.classList.add("nb")}})();
