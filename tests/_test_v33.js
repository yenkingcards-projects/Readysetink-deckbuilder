/* v33 — colour contrast and the roundness scale.
   The palette is a mid-tone periwinkle chassis, which cannot carry small text:
   carbon on it is 3.44:1 and white 4.37:1, both short of AA. The design system
   already answers this — reading surfaces are white, platinum and pale sky, and
   the canvas only shows in the seams. This suite holds that line. */
const _W=require(__dirname+"/_where.js");
const {chromium}=require("/tmp/node_modules/playwright-core");
const SRC=require("fs").readFileSync(_W.FILE,"utf8");
const F=_W.URL;
const AUDIT=`(()=>{
  const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
    return .2126*r+.7152*g+.0722*b};
  const parse=s=>{const m=(s||"").match(/rgba?\\(([^)]+)\\)/);if(!m)return null;
    const p=m[1].split(",").map(x=>parseFloat(x));
    return {c:[p[0],p[1],p[2]],a:p.length>3?p[3]:1}};
  const over=(fg,bg)=>fg.c.map((v,i)=>v*fg.a+bg[i]*(1-fg.a));
  const bgOf=el=>{let e=el,stack=[];
    while(e&&e!==document.documentElement){const b=parse(getComputedStyle(e).backgroundColor);
      if(b&&b.a>0){stack.push(b);if(b.a>=1)break}e=e.parentElement}
    let base=[255,255,255];
    for(let i=stack.length-1;i>=0;i--)base=over(stack[i],base);
    return base};
  const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);
    return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)};
  const out=[];
  document.querySelectorAll("*").forEach(el=>{
    if(!el.offsetParent&&getComputedStyle(el).position!=="fixed")return;
    const txt=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(" ");
    if(!txt)return;
    /* Colour emoji are painted by the font, not by CSS colour, so measuring
       them against the background is meaningless. Skip text that is only
       emoji and symbols. */
    if(!/[a-z0-9]/i.test(txt))return;
    const cs=getComputedStyle(el);
    if(cs.visibility==="hidden"||cs.display==="none"||+cs.opacity===0)return;
    const fgp=parse(cs.color);if(!fgp)return;
    const bg=bgOf(el);
    const fg=over(fgp,bg);
    const size=parseFloat(cs.fontSize),w=parseInt(cs.fontWeight)||400;
    /* AAA, not AA. 4.5 passed and the site was still hard to read, so the bar
       here is 7:1 for normal text and 4.5:1 for large. */
    const large=size>=24||(size>=18.66&&w>=700);
    const need=large?4.5:7;
    const r=ratio(fg,bg);
    if(r<need)out.push({sel:el.tagName.toLowerCase()+(el.className&&typeof el.className==="string"?"."+el.className.trim().split(/\\s+/).slice(0,2).join("."):""),
      txt:txt.slice(0,38),r:+r.toFixed(2),need,size,w,
      fg:cs.color,bg:"rgb("+bg.map(Math.round).join(",")+")"});
  });
  const seen={},uniq=[];
  out.forEach(o=>{const k=o.sel+"|"+o.fg+"|"+o.bg;if(!seen[k]){seen[k]=1;uniq.push(o)}});
  return uniq.sort((a,b)=>a.r-b.r);
})()`;

(async()=>{
const b=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
let bad=0,good=0;const ok=(c,m)=>{c?(good++,console.log("  ✓ "+m)):(bad++,console.log("  ✗ "+m))};
const p=await b.newPage({viewport:{width:1500,height:1200}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(2000);
ok(errs.length===0,`loads clean${errs.length?" — "+errs[0]:""}`);

console.log("\n=== WCAG AAA CONTRAST, EVERY PAGE ===");
const pages=[["tDeck",""],["tSearch",""],["tColl",""],["tDecks",""],["tOther",""],
  ["tOther","dust"],["tOther","read"],["tOther","hex"],["tOther","aqua"],["tOther","contrib"],
  ["tOther","quiz:ability"],["tOther","quiz:flavour"],["tOther","guess"],["tOther","mick"],
  ["tOther","click"],["tOther","cred"]];
/* Both themes. Dark mode is a whole second palette, so auditing only the light
   one would let a dark-only contrast failure ship unseen — which is exactly
   what happens to most sites that bolt a dark theme on. */
const all={};
for(const theme of ["light","dark"])
for(const [tab,op] of pages){
  await p.evaluate(t=>{document.body.classList.toggle("dark",t==="dark")},theme);
  await p.evaluate(([t,o])=>{localStorage.setItem("fs3_tab",JSON.stringify(t));
    localStorage.setItem("fs3_opage",JSON.stringify(o));
    localStorage.setItem("fs3_dust",JSON.stringify({bal:9e9,got:{},open:[],
      titles:["t_pupil","t_fish"],hidden:["h_chip"],wear:"t_pupil",quiz:[],bucky:0,pr:{}}))},[tab,op]);
  await p.reload();await p.waitForTimeout(1300);
  /* The reload above resets the class, so re-apply after it. */
  await p.evaluate(t=>{document.body.classList.toggle("dark",t==="dark")},theme);
  /* Several elements transition colour over 0.25s. Auditing sooner measures a
     value that is literally partway between the two themes and reports a
     failure that never appears on screen. */
  await p.waitForTimeout(420);
  const r=await p.evaluate(AUDIT);
  r.forEach(x=>{const k=theme+"|"+x.sel+"|"+x.fg+"|"+x.bg;
    if(!all[k]||all[k].r>x.r)all[k]={...x,page:(op||tab)+" ["+theme+"]"}});
}
const fails=Object.values(all).sort((a,b)=>a.r-b.r);
fails.slice(0,8).forEach(o=>console.log(
  `     ${o.r}:1 (need ${o.need})  ${o.sel}  "${o.txt}"  ${o.fg} on ${o.bg}  [${o.page}]`));
ok(fails.length===0,`${fails.length} contrast failures across ${pages.length} pages in BOTH themes`);

console.log("\n=== THE PALETTE RULES THAT CAUSED THEM ===");
const ratio=await p.evaluate(()=>{
  const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
    return .2126*r+.7152*g+.0722*b};
  const hex=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
  const R=(a,b)=>{const l1=lum(hex(a)),l2=lum(hex(b));
    return +((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2)};
  return {carbonOnCanvas:R("#202638","#6578a8"), whiteOnCanvas:R("#ffffff","#6578a8"),
    carbonOnWhite:R("#202638","#ffffff"), carbonOnPlatinum:R("#202638","#e4e7eb"),
    carbonOnSky:R("#202638","#dce7f5"), chromeOnWhite:R("#334a88","#ffffff"),
    whiteOnCarbon:R("#ffffff","#202638"), whiteOnSignal:R("#ffffff","#e60012"),
    whiteOnSignalDeep:R("#ffffff","#b2000e"), carbonOnAmber:R("#202638","#ffd400"),
    whiteOnPrimary:R("#ffffff","#2f6fed")}});
ok(ratio.carbonOnCanvas<4.5&&ratio.whiteOnCanvas<4.5,
   `nothing clears AA on the raw canvas (carbon ${ratio.carbonOnCanvas}, white ${ratio.whiteOnCanvas}) — so nothing small sits on it`);
ok(ratio.carbonOnWhite>=7&&ratio.carbonOnPlatinum>=7&&ratio.carbonOnSky>=7,
   `carbon reads on every light plate at AAA (white ${ratio.carbonOnWhite}, platinum ${ratio.carbonOnPlatinum}, sky ${ratio.carbonOnSky})`);
ok(ratio.whiteOnCarbon>=7,`white reads on the carbon command layer (${ratio.whiteOnCarbon})`);
ok(ratio.whiteOnSignal<7&&ratio.whiteOnSignalDeep>=7,
   `Action Red is too light for white text at AAA (${ratio.whiteOnSignal}) so labelled buttons use the deeper step (${ratio.whiteOnSignalDeep})`);
ok(ratio.carbonOnAmber>=7,
   `Action Yellow carries dark text, never white (carbon ${ratio.carbonOnAmber})`);
ok(!/color:var\(--muted\)/.test(SRC),"muted-indigo is a surface colour and never carries text");
ok(!/--dim:#5d6c9d/.test(SRC),"…and the old tertiary text token is gone");

console.log("\n=== ROUNDNESS, PER THE GUIDE'S SCALE ===");
const radii=(SRC.match(/border-radius:\s*([0-9]+px)/g)||[]).map(x=>parseInt(x.match(/\d+/)[0]));
const set=[...new Set(radii)].sort((a,b)=>a-b);
ok(set.every(v=>[0,2,4,6,8,10,9999].includes(v)),
   `only scale values in use: ${set.join(", ")}px`);
ok(radii.filter(v=>v===2).length>radii.filter(v=>v>=6).length,
   "sharp still dominates — 2px chrome outnumbers the softer panels");
ok(radii.some(v=>v===4)&&radii.some(v=>v===6),
   "…but list rows and tiles (4px) and content panels (6px) use their steps");
ok(/border-radius:9999px/.test(SRC),"…and roundness is spent on the logo pill");
const pill=await p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector(".logo b")).borderTopLeftRadius));
ok(pill>100,"…which really is fully round");
const navR=await p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector("nav.tabs button")).borderTopLeftRadius));
ok(navR===0,"nav chrome stays perfectly sharp");

console.log(`\n${bad?"❌":"✅"} ${good} passed, ${bad} failed`);
await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error("CRASH",e);process.exit(1)});
