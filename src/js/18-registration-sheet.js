/* ===================== official registration sheet =====================
   Ravensburger's own OP Constructed decklist form (Letter, 612x792pt),
   filled from whatever deck is selected. It has no fillable form fields of
   its own -- just printed lines to write on -- so every coordinate below
   was measured directly off the real PDF once (pdfplumber, word/line/rect
   positions) rather than guessed. loaded lazily via pdf-lib, same pattern
   as the QR encoder and the Supabase client: most visits to this page never
   touch it, so it isn't in the main bundle for everyone. */
const REGSHEET_URL="/forms/deck-registration-sheet.pdf";
const REGDEF={firstName:"",lastName:"",event:"",location:"",date:"",warn:true};
let REG=Object.assign({},REGDEF,load("fs3_regdef",{}),load("fs3_reg",{}));
const PDFLIB_URL="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
let pdfLibPromise=null;
function loadPDFLib(){
  if(window.PDFLib)return Promise.resolve(window.PDFLib);
  if(pdfLibPromise)return pdfLibPromise;
  pdfLibPromise=new Promise((ok,no)=>{
    const s=document.createElement("script");
    s.src=PDFLIB_URL;s.async=true;
    s.onload=()=>window.PDFLib?ok(window.PDFLib):no(new Error("no global"));
    s.onerror=()=>no(new Error("script blocked"));
    document.head.appendChild(s)});
  return pdfLibPromise;
}
/* The two columns of "# In Deck / Card Name" rows, 26 each -- the Y (in
   "distance down from the top of the page") of each row's printed line. */
const REG_ROWTOPS=[184.2,203.6,223.1,242.5,262.0,281.4,300.8,320.3,339.7,359.1,
  378.6,398.0,417.5,436.9,456.4,475.8,495.2,514.7,534.1,553.5,573.0,592.4,611.9,631.3,650.8,670.2];
async function buildRegSheet(){
  const {PDFDocument,StandardFonts,rgb,degrees}=await loadPDFLib();
  const res=await fetch(REGSHEET_URL);
  if(!res.ok)throw new Error("Couldn't load the blank sheet");
  const pdf=await PDFDocument.load(await res.arrayBuffer());
  const page=pdf.getPages()[0];
  const H=page.getHeight();
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink=rgb(0.06,0.09,0.16);
  const red=rgb(0.72,0.04,0.06);
  /* The standard fonts are WinAnsi-encoded, and pdf-lib THROWS on a character
     outside that -- which would take the whole sheet down rather than drop one
     glyph. Deck names are typed by hand and the warning lines quote card names
     back, so everything drawn goes through here first. */
  const safe=t=>String(t==null?"":t)
    .replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"')
    .replace(/[\u2012-\u2015]/g,"-").replace(/\u2026/g,"...")
    .replace(/\u00d7/g,"x").replace(/[\u00a0\u2007\u202f]/g," ")
    .replace(/[^\x20-\x7e\u00a1-\u00ff]/g,"");
  /* top = distance down from the top of the page, matching how every
     coordinate above was measured -- converted to PDF's bottom-up Y once,
     here, so nothing else has to do that math. */
  const put=(text,x,top,opts={})=>{
    if(text==null||text==="")return;
    page.drawText(safe(text),{x,y:H-top,size:opts.size||10,font:opts.font||font,
      color:opts.color||ink});
  };
  const centerText=(text,cx,top,size,useFont)=>{
    if(text==null||text==="")return;
    const s=safe(text),w=(useFont||font).widthOfTextAtSize(s,size);
    put(s,cx-w/2,top,{size,font:useFont});
  };
  put(REG.date,250,76.8);
  put(REG.event,456,76.8);
  put(REG.location,250,93.8);
  put(DECKS.cur,456,93.8);
  if(REG.lastName)centerText(REG.lastName.trim().charAt(0).toUpperCase(),561.45,56,16,bold);
  /* First/Last Name are vertical strips down the left edge. Both printed
     labels run bottom-to-top up the page (measured off the real PDF: the
     "First Name:" glyphs climb from top 436.6 to 391.2), so the name has to
     read the same way or it lands upside down next to its own label —
     rotate(90), not -90. Anchor is the FIRST character, so it sits just
     above the label and the name grows upward into the empty strip; x is
     the rotated baseline, matched to the printed labels' own baseline at
     53.9 so the two line up. Long names shrink rather than run off the top
     of the strip. */
  const vertName=(text,anchorTop,stripTop)=>{
    const s=safe(text).trim();
    if(!s)return;
    let size=13;
    const room=anchorTop-stripTop-6;
    while(size>7&&font.widthOfTextAtSize(s,size)>room)size-=0.5;
    page.drawText(s,{x:53.9,y:H-anchorTop,size,font,color:ink,rotate:degrees(90)});
  };
  vertName(REG.firstName,385,125.25);
  vertName(REG.lastName,701,440.61);

  const rows=dlist().slice().sort((a,b)=>a.c.f.localeCompare(b.c.f));
  const cap=REG_ROWTOPS.length*2;
  if(rows.length>cap)
    toast(`This sheet only has ${cap} lines for ${cap} different cards — `
      +`${rows.length-cap} left off. List the rest on the back.`);
  rows.slice(0,cap).forEach((r,i)=>{
    const col=i<REG_ROWTOPS.length?0:1,rowI=i%REG_ROWTOPS.length;
    const top=REG_ROWTOPS[rowI]-4;
    centerText(r.q,col===0?90.7:363.6,top,11,font);
    put(r.c.f,col===0?129:402,top,{size:9.2});
  });
  centerText(dtotal(),321.1,701.2,12,bold);
  /* Rules reminders, in red, in the empty strip left of the judge's boxes --
     x 66 to 300 is clear below the total-cards row (that printed label runs
     from x 167 to x 303, so anything higher collides with it) and the judge's
     boxes start at x 303, so the column below 708 is ours. Off by default only if you
     turn it off: printing a half-finished list to fill in by hand is a real
     thing people do, and it should not come out covered in red. */
  if(REG.warn!==false){
    const warns=deckWarnings();
    if(warns.length){
      const X=66,W=234,SZ=7.4,LEAD=8.6,LAST=786;
      /* Greedy wrap against the real measured width -- a card name quoted back
         into a warning is easily wider than this column on its own. */
      const wrap=(t,f)=>{
        const out=[];let line="";
        safe(t).split(/\s+/).filter(Boolean).forEach(word=>{
          const t2=line?line+" "+word:word;
          if(f.widthOfTextAtSize(t2,SZ)<=W)line=t2;
          else{if(line)out.push(line);line=word}});
        if(line)out.push(line);
        return out;
      };
      put("This deck is not tournament legal:",X,713,{size:8,font:bold,color:red});
      let top=723,left=0;
      warns.forEach(t=>{
        if(top>LAST){left++;return}
        wrap("- "+t,font).forEach(line=>{
          if(top>LAST){left++;return}
          put(line,X,top,{size:SZ,color:red});top+=LEAD});
      });
      if(left&&top<=LAST+LEAD)
        put(`...and ${left} more — see the deck panel.`,X,Math.min(top,LAST),{size:SZ,color:red});
    }
  }
  const outBytes=await pdf.save();
  return outBytes;
}
async function printRegSheet(){
  /* The tab has to open SYNCHRONOUSLY, in the same tick as the click --
     everything that builds the PDF is async (loading pdf-lib, fetching the
     blank sheet, embedding fonts), and a window.open() that happens after
     even one await no longer reads as part of the original user gesture to
     most browsers, so it gets silently blocked instead of opening. Open a
     blank tab right now and navigate it once the PDF is ready instead. */
  const w=window.open("","_blank");
  if(!w){toast("Pop-up blocked — allow pop-ups for this site to open the sheet");return}
  try{
    const bytes=await buildRegSheet();
    const blob=new Blob([bytes],{type:"application/pdf"});
    const url=URL.createObjectURL(blob);
    w.location.href=url;
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){
    w.close();
    toast("Couldn't build the sheet — "+(e.message||"try again"));
  }
}
let REGOPEN=false;
function renderRegSheet(){
  const box=$("regBox");if(!box)return;
  if(!dtotal()){box.innerHTML="";return}
  box.innerHTML=`<div class="borrow">
    <div class="bhead">
      <b>🖨️ Official registration sheet</b>
      <span class="sp"></span>
      <button class="btn" id="rgCust">${REGOPEN?"Done":"Customise"}</button>
      <button class="btn go" id="rgPrint">Print filled sheet</button>
    </div>
    <p class="bnote">Ravensburger's OP Constructed decklist form, filled straight from this deck.</p>
    ${REGOPEN?`<div class="bcust">
      <label>First name<input id="rgFirst" value="${esc(REG.firstName)}"></label>
      <label>Last name<input id="rgLast" value="${esc(REG.lastName)}"></label>
      <label>Event<input id="rgEvent" value="${esc(REG.event)}"></label>
      <label>Location<input id="rgLoc" value="${esc(REG.location)}"></label>
      <label>Date<input type="date" id="rgDate" value="${esc(REG.date)}"></label>
      <div class="bpick"><b>Rules reminders</b>
        <label class="bchk"><input type="checkbox" id="rgWarn"${REG.warn===false?"":" checked"}>
          Print what's wrong with this deck, in red at the foot of the sheet.
          <i>Turn it off to print a half-built list and fill the rest in by hand.</i></label></div>
      <div class="bsave">
        <button class="btn go" id="rgDefault">Save this as my default</button>
        <span>${REG.saved?"Saved — future sheets start from this.":"These settings apply to this browser until you save them."}</span>
      </div>
      <!-- The real sheet, filled, while you type into the fields above it.
           Typing a name into a box and then opening a PDF in a new tab to find
           out where it landed is two steps too many for something you are
           handing to a judge. -->
      <div class="rgprev">
        <div class="rgprevh">Preview <span id="rgPrevSt">building…</span></div>
        <iframe id="rgPrevFrame" title="Preview of the filled registration sheet"></iframe>
      </div>
    </div>`:""}
  </div>`;
  $("rgCust").onclick=()=>{REGOPEN=!REGOPEN;renderRegSheet()};
  $("rgPrint").onclick=printRegSheet;
  const rd=$("rgDefault");
  if(rd)rd.onclick=()=>{
    REG.saved=true;
    save("fs3_regdef",{...REG,saved:true});save("fs3_reg",REG);
    toast("Saved as your default");renderRegSheet()};
  const put2=(id,k)=>{const el=$(id);if(el)el.oninput=()=>{REG[k]=el.value;save("fs3_reg",REG);regPreview()}};
  {const cb=$("rgWarn");
   if(cb)cb.onchange=()=>{REG.warn=cb.checked;save("fs3_reg",REG);regPreview()}}
  put2("rgFirst","firstName");put2("rgLast","lastName");put2("rgEvent","event");
  put2("rgLoc","location");put2("rgDate","date");
  if(REGOPEN)regPreview();
}
/* Build the sheet and show it in the panel. Debounced, because it runs on
   every keystroke and building a PDF per letter would be silly; and the old
   blob URL is revoked each time, or a long session of typing would leak one
   PDF per rebuild. */
let REGPREVT=null,REGPREVURL=null;
function regPreview(){
  const frame=$("rgPrevFrame");if(!frame)return;
  clearTimeout(REGPREVT);
  {const st=$("rgPrevSt");if(st)st.textContent="building…";}
  REGPREVT=setTimeout(async()=>{
    if(!$("rgPrevFrame"))return;                    // panel closed while we waited
    try{
      const bytes=await buildRegSheet();
      if(!$("rgPrevFrame"))return;
      if(REGPREVURL)URL.revokeObjectURL(REGPREVURL);
      REGPREVURL=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
      $("rgPrevFrame").src=REGPREVURL+"#toolbar=0&navpanes=0&view=FitH";
      if($("rgPrevSt"))$("rgPrevSt").textContent="this is what prints";
    }catch(e){
      if($("rgPrevSt"))$("rgPrevSt").textContent="couldn't build it — "+(e.message||"try again");
    }
  },400);
}

/* The cards in the chosen deck, as pictures. The list views tell you what is in
   a deck; this tells you what it looks like, which is how most people actually
   recognise their own decks. Sorted by ink then cost — the order a deck is
   usually laid out on a table. */
function deckGallery(){
  const rows=dlist();
  if(!rows.length)return `<div class="empty" style="padding:18px">
    "${esc(DECKS.cur)}" is empty. Add cards on the Deck builder tab.</div>`;
  const sorted=rows.slice().sort((a,b)=>
    String((a.c.co||[])[0]||"").localeCompare(String((b.c.co||[])[0]||""))
    ||a.c.c-b.c.c||a.c.f.localeCompare(b.c.f));
  const tot=rows.reduce((n,r)=>n+r.q,0);
  const inks=[...new Set(rows.flatMap(r=>r.c.co||[]))];
  return `<div class="dkgal">
    <div class="dgh">
      <b>${esc(DECKS.cur)}</b>
      <span>${tot} cards · ${sorted.length} different · ${esc(inks.join(" / ")||"no ink")}</span>
      <span class="sp"></span>
      <button class="btn" id="dgCopy">Copy deck list</button>
      <button class="btn" id="dgBig">${DGBIG?"Smaller":"Bigger"}</button>
    </div>
    <div class="dgrid${DGBIG?" big":""}">${sorted.map(({c,q})=>`
      <figure class="dgc" data-dgo="${esc(c.f)}" title="${esc(c.f)}">
        ${c.img?`<img src="${esc(String(c.img))}" alt="${esc(c.f)}" loading="lazy">`
               :`<div class="dgph">${esc(c.f)}</div>`}
        <span class="dgq">${q}</span>
        <figcaption>${esc(c.n)}</figcaption>
      </figure>`).join("")}</div>
  </div>`}
let DGBIG=load("fs3_dgbig",false);
function wireGallery(){
  const g=$("deckspage");if(!g)return;
  const cp=$("dgCopy");
  if(cp)cp.onclick=()=>{
    const txt=dlist().map(({c,q})=>`${q} ${c.f}`).join("\n");
    const ta=document.createElement("textarea");ta.value=txt;
    document.body.appendChild(ta);ta.select();
    try{document.execCommand("copy")}catch(e){}
    ta.remove();toast("Deck list copied")};
  const bg=$("dgBig");
  if(bg)bg.onclick=()=>{DGBIG=!DGBIG;save("fs3_dgbig",DGBIG);renderDecksPage()};
  g.querySelectorAll("[data-dgo]").forEach(el=>el.onclick=()=>openM(el.dataset.dgo));
}

