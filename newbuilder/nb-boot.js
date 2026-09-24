/* Runs in <head>, before the first paint. Decides one thing: is the new
   builder on? ?newbuilder=1 turns it on and remembers that on this device,
   ?newbuilder=0 turns it off again. Everything else is in nb.css / nb.js. */
(function(){try{
  var q=new URLSearchParams(location.search).get("newbuilder"),on;
  if(q==="1"){localStorage.setItem("fs3_nb","1");on=true}
  else if(q==="0"){localStorage.removeItem("fs3_nb");on=false}
  else on=localStorage.getItem("fs3_nb")==="1";
  if(on)document.documentElement.classList.add("nb");
}catch(e){}})();
