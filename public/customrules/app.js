"use strict";
const { INKS, RARITIES, norm, full, index, parseDeck, check, ruleLines } = CR;
const HEX = { Amber: "#f0a832", Amethyst: "#a86fd8", Emerald: "#35c97a", Ruby: "#f0625f", Sapphire: "#4a9fe0", Steel: "#9fb0c4" };
const $ = s => document.querySelector(s), app = $("#app");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dots = c => c.co.map(i => `<i class="dot" style="background:${HEX[i]}" title="${i}"></i>`).join("");
let CARDS = [], IDX, OFFICIAL = [], last = null;

/* ---------- homemade formats live in this browser ---------- */
const LS = "crf_custom";
const getCustom = () => { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch (e) { return []; } };
const putCustom = a => { try { localStorage.setItem(LS, JSON.stringify(a)); return true; } catch (e) { toast("Couldn't save in this browser"); return false; } };
const allFormats = () => [...OFFICIAL, ...getCustom()];

function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2200); }

/* ---------- share link: the format itself, deflated, in the URL hash ---------- */
const b64 = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = t => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function pipe(u8, S) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new S("deflate-raw"))).arrayBuffer()); }
async function encodeFormat(f) {
  const { id, order, custom, ...rest } = f, raw = new TextEncoder().encode(JSON.stringify(rest));
  return window.CompressionStream ? "z" + b64(await pipe(raw, CompressionStream)) : "p" + b64(raw);
}
async function decodeFormat(t) {
  const raw = unb64(t.slice(1)), u8 = t[0] === "z" ? await pipe(raw, DecompressionStream) : raw;
  const f = JSON.parse(new TextDecoder().decode(u8));
  if (typeof f.name !== "string") throw 0;
  return { ...f, id: "shared", custom: true };
}

/* ---------- routing: #  |  #new  |  #edit/<id>  |  #f=<shared>  |  #<format id> ---------- */
async function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  last = null; scrollTo(0, 0);
  $('#nv-home').classList.toggle('on', h === ''); $('#nv-new').classList.toggle('on', h === 'new' || h.startsWith('edit/'));
  try {
    if (h === "new") return builder();
    if (h.startsWith("edit/")) return builder(getCustom().find(f => f.id === h.slice(5)));
    if (h.startsWith("f=")) return formatPage(await decodeFormat(h.slice(2)), true);
  } catch (e) { toast("That format link is broken"); return home(); }
  const f = allFormats().find(f => f.id === h);
  f ? formatPage(f) : home();
}

/* ---------- home ---------- */
function home() {
  const tile = f => `<a class="tile" href="#${esc(f.id)}"><b>${esc(f.name)}</b><span>${esc(f.blurb || "A format made by a friend")}</span><small>${f.custom ? '<em class="badge">Yours</em> ' : ""}${CR.highlights(f).join(" · ")}</small></a>`;
  app.innerHTML = `<div class="hero"><h1>Pick a format</h1><p class="lead">House rules for Disney Lorcana. Pick one, paste your decklist, and see exactly which cards aren't legal.</p></div>
    <div class="tiles">${allFormats().map(tile).join("")}<a class="tile new" href="#new"><b>+ Build your own</b><span>Set the rarities, inks, deck size and bans. It's saved in this browser, and you can send friends a link.</span></a></div>`;
}

/* ---------- a format: rules on the left, paste on the right ---------- */
function formatPage(f, shared) {
  const banned = Object.keys(f.banned || {}).sort(), mine = !shared && f.custom;
  app.innerHTML = `<div class="hero"><h1>${esc(f.name)}</h1>${f.blurb ? `<p class="lead">${esc(f.blurb)}</p>` : ""}</div>
  <div class="split"><section class="card"><h2>The rules</h2>
    <ul class="rules">${ruleLines(f).map(l => `<li>${esc(l)}</li>`).join("")}</ul>
    ${f.text ? `<p class="note">${esc(f.text)}</p>` : ""}
    ${banned.length ? `<details ${matchMedia("(min-width:821px)").matches ? "open" : ""}><summary>Ban list (${banned.length})</summary><input type="search" id="bsearch" placeholder="Search the ban list" aria-label="Search the ban list"><ul class="banlist" id="blist">${banned.map(n => `<li>${esc(n)}</li>`).join("")}</ul></details>` : ""}
    <div class="row">${f.custom ? '<button class="btn alt" id="share">Copy link to this format</button>' : ""}
      ${shared ? '<button class="btn" id="keep">Save to my formats</button>' : ""}
      ${mine ? `<a class="btn alt" href="#edit/${esc(f.id)}">Edit</a>` : ""}</div>
  </section>
  <section class="pastecol"><div class="card paste"><h2>Paste your decklist</h2>
    <details><summary>How do I get my list?</summary><p class="muted">Open your deck on <a href="https://readysetink.com">readysetink.com</a> or <a href="https://dreamborn.ink">dreamborn.ink</a> &rarr; <b>Menu</b> &rarr; <b>Export</b> &rarr; <b>Copy to clipboard</b>. Then paste it here.</p></details>
    <textarea id="deck" placeholder="4 Elsa - Snow Queen&#10;4 Mickey Mouse - Brave Little Tailor&#10;…" aria-label="Decklist" spellcheck="false"></textarea>
    <div class="row"><button class="btn go" id="go">Check my deck</button>${navigator.clipboard && navigator.clipboard.readText ? '<button class="btn alt" id="clip">Paste from clipboard</button>' : ""}</div></div>
    <div id="out"></div></section></div>`;
  const bs = $("#bsearch");
  if (bs) bs.oninput = () => { const q = norm(bs.value); $("#blist").querySelectorAll("li").forEach(li => li.hidden = !norm(li.textContent).includes(q)); };
  if ($("#share")) $("#share").onclick = async () => {
    const u = location.origin + location.pathname + "#f=" + await encodeFormat(f);
    navigator.clipboard.writeText(u).then(() => toast("Link copied"), () => prompt("Copy this link:", u));
  };
  if ($("#keep")) $("#keep").onclick = () => { const n = { ...f, id: "c" + Date.now().toString(36) }; if (putCustom([...getCustom(), n])) { toast("Saved"); location.hash = n.id; } };
  const run = () => { const v = $("#deck").value; if (!v.trim()) return toast("Paste a decklist first"); try { sessionStorage.setItem("crf_deck", v); } catch (e) {} showResult(f); };
  $("#go").onclick = run;
  if ($("#clip")) $("#clip").onclick = () => navigator.clipboard.readText().then(t => { $("#deck").value = t; run(); }, () => toast("Your browser blocked that — long-press the box and paste instead"));
  let prev = ""; try { prev = sessionStorage.getItem("crf_deck") || ""; } catch (e) {}
  if (prev) { $("#deck").value = prev; showResult(f, true); } // same deck, new format: no re-pasting
  $("#deck").addEventListener("paste", () => setTimeout(run, 0));
}

function showResult(f, quiet) {
  const text = $("#deck").value;
  if (!text.trim()) { $("#out").innerHTML = ""; return; }
  const entries = parseDeck(text, IDX), res = check(f, entries);
  last = { f, entries, res };
  const li = e => {
    const why = res.bad.get(e);
    if (!e.card) return `<li class="bad"><span class="q">${e.q}</span><span class="nm">${esc(e.name)}</span><span><span class="tag nf">NOT FOUND</span></span></li>`;
    return `<li class="${why ? "bad" : ""}"><span class="q">${e.q}</span><span class="nm">${dots(e.card)}${esc(e.name)}</span>${why ? `<span><span class="tag">NOT LEGAL</span><span class="why">${esc(why.join(" · "))}</span></span>` : "<span></span>"}</li>`;
  };
  const banner = res.ok ? `<div class="banner ok"><h3>Legal in ${esc(f.name)} — ${res.size} cards</h3></div>`
    : res.problems.length ? `<div class="banner"><h3>This deck isn't legal in ${esc(f.name)}</h3><ul>${res.problems.map(p => `<li>${esc(p)}</li>`).join("")}</ul></div>` : "";
  const nf = res.unknown.length ? `<div class="banner warn"><h3>Couldn't find ${res.unknown.length} card${res.unknown.length === 1 ? "" : "s"}</h3><div>${esc(res.unknown.join(", "))}<br><span class="muted">Names need to look like "Elsa - Snow Queen".</span></div></div>` : "";
  $("#out").innerHTML = `${banner}${nf}<ul class="deck">${entries.map(li).join("")}</ul>
    <div class="row"><button class="btn" id="img">Save deck image</button><button class="btn alt" id="pull">Pull sheet</button></div>`;
  $("#img").onclick = deckImage; $("#pull").onclick = pullSheet;
  if (!quiet) $("#out").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- deck image: same 1080×1080 layout as the main site, NOT LEGAL drawn on ---------- */
const LORCAST = "https://cards.lorcast.io/";
function loadImg(c) {
  return new Promise(done => {
    const u = c.img, tries = [];
    if (!u) return done(null);
    if (/^https?:$/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) && u.startsWith(LORCAST)) tries.push("/img/lorcast/" + u.slice(LORCAST.length));
    tries.push(u);
    (function next() {
      const src = tries.shift(); if (!src) return done(null);
      const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => done(im); im.onerror = next; im.src = src;
    })();
  });
}
async function deckImage() {
  if (!last) return;
  const { f, entries, res } = last, rows = entries.filter(e => e.card);
  if (!rows.length) return toast("No cards to draw");
  toast("Drawing…");
  const W = 1080, H = 1080, PAD = 24, HEAD = 112, GAP = 12, AR = 940 / 674;
  let best = null;
  for (let cols = 3; cols <= 10 && !best; cols++) {
    const cw = Math.floor((W - PAD * 2 - (cols - 1) * GAP) / cols), ch = Math.round(cw * AR), rn = Math.ceil(rows.length / cols);
    if (HEAD + rn * ch + (rn - 1) * GAP + PAD <= H) best = { cols, cw, ch };
  }
  if (!best) { const cols = 10, rn = Math.ceil(rows.length / cols), ch = Math.floor((H - HEAD - PAD - (rn - 1) * GAP) / rn); best = { cols, cw: Math.round(ch / AR), ch }; }
  const { cols, cw, ch } = best, offX = Math.floor((W - (cols * cw + (cols - 1) * GAP)) / 2);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const x = cv.getContext("2d");
  x.fillStyle = "#6578a8"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#202638"; x.fillRect(0, 0, W, HEAD - 18);
  x.fillStyle = "#ffd400"; x.font = "900 42px Arial"; x.fillText(f.name.slice(0, 30), PAD, 58);
  x.fillStyle = "#dce7f5"; x.font = "400 22px Arial";
  const inks = [...new Set(rows.flatMap(r => r.card.co))];
  x.fillText(`${res.size} cards · ${inks.join(" / ")}${res.ok ? " · legal" : res.bad.size ? ` · ${res.bad.size} not legal` : " · not legal"}`, PAD, 86);
  x.textAlign = "right"; x.fillText("customrules.readysetink.com", W - PAD, 86); x.textAlign = "left";
  const imgs = await Promise.all(rows.map(r => loadImg(r.card)));
  rows.forEach((r, i) => {
    const cx = offX + (i % cols) * (cw + GAP), cy = HEAD + Math.floor(i / cols) * (ch + GAP);
    if (imgs[i]) x.drawImage(imgs[i], cx, cy, cw, ch);
    else { x.fillStyle = "#dce7f5"; x.fillRect(cx, cy, cw, ch); x.fillStyle = "#202638"; x.font = "700 16px Arial"; x.fillText(r.card.n.slice(0, 14), cx + 8, cy + 30); }
    if (res.bad.has(r)) {
      x.fillStyle = "rgba(180,0,20,.28)"; x.fillRect(cx, cy, cw, ch);
      x.strokeStyle = "#e5303a"; x.lineWidth = 4; x.strokeRect(cx + 2, cy + 2, cw - 4, ch - 4);
      const bh = Math.min(34, Math.max(22, cw / 5)); x.fillStyle = "#e5303a"; x.fillRect(cx, cy + ch / 2 - bh / 2, cw, bh);
      x.fillStyle = "#fff"; x.font = `900 ${Math.round(bh * .6)}px Arial`; x.textAlign = "center"; x.fillText("NOT LEGAL", cx + cw / 2, cy + ch / 2 + bh * .22); x.textAlign = "left";
    }
    const t = r.q + "×", bw = Math.max(44, t.length * 18 + 16), bh = 38;
    x.fillStyle = "#202638"; x.fillRect(cx + cw - bw, cy + ch - bh, bw, bh);
    x.fillStyle = "#ffd400"; x.font = "900 26px Arial"; x.textAlign = "center"; x.fillText(t, cx + cw - bw / 2, cy + ch - 10); x.textAlign = "left";
  });
  try {
    cv.toBlob(bl => {
      if (!bl) return toast("Couldn't build the image");
      const u = URL.createObjectURL(bl), a = document.createElement("a");
      a.href = u; a.download = f.name.replace(/[^\w -]+/g, "").trim() + " deck.png"; a.click();
      setTimeout(() => URL.revokeObjectURL(u), 4000); toast("Image saved");
    });
  } catch (e) { toast("The card art wouldn't allow an image export"); }
}

/* ---------- pull sheet: one printed page, text sized to fit ---------- */
function pullSheet() {
  if (!last) return;
  const { f, entries, res } = last;
  const rank = e => (e.card ? INKS.indexOf(e.card.co[0]) : 9);
  const rows = [...entries].sort((a, b) => rank(a) - rank(b) || (a.card ? a.card.c : 0) - (b.card ? b.card.c : 0) || a.name.localeCompare(b.name));
  $("#sheet").innerHTML = `<h1>${esc(f.name)} — pull sheet</h1><p>${res.size} cards · ${rows.length} different${res.ok ? "" : " · NOT LEGAL cards are marked"}</p>
    <ol>${rows.map(e => `<li><span class="bx"></span><span class="q">${e.q}</span><span>${esc(e.name)}</span>${!e.card || res.bad.has(e) ? '<span class="nl">NOT LEGAL</span>' : ""}</li>`).join("")}</ol>`;
  const perCol = Math.ceil(rows.length / 2) + 3; // 3 = title lines; page body is about 700pt tall
  $("#sheet").style.fontSize = Math.min(13, Math.floor(690 / (perCol * 1.35) * 2) / 2) + "pt";
  print();
}

/* ---------- format builder ---------- */
function builder(f) {
  const R = { ...CR.BASE, ...(f || {}) };
  const banned = { ...(f && f.banned) }, only = [...((f && f.only) || [])];
  const rars = R.rarities || RARITIES;
  app.innerHTML = `<div class="hero"><h1>${f ? "Edit your format" : "Build your own format"}</h1>
  <p class="lead">Everything is optional except the name. It's saved in this browser only — use "Copy link" afterwards to share it.</p></div><div class="card">
  <div class="form">
   <label>Name<input type="text" id="fname" maxlength="40" value="${esc((f && f.name) || "")}" placeholder="Friday Night Chaos"></label>
   <label>One-line description<input type="text" id="fblurb" maxlength="100" value="${esc((f && f.blurb) || "")}"></label>
   <div><b>Allowed rarities</b><div class="checks" id="frar">${RARITIES.map(r => `<label><input type="checkbox" value="${r}" ${rars.includes(r) ? "checked" : ""}>${r}</label>`).join("")}</div></div>
   <div class="two">
    <label>Max inks<select id="fink">${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${n === R.maxInks ? "selected" : ""}>${n === 6 ? "Any" : n}</option>`).join("")}</select></label>
    <label>Min cards<input type="number" id="fmin" min="0" value="${R.minCards}"></label>
    <label>Max cards <span class="h">blank = no max</span><input type="number" id="fmax" min="0" value="${R.maxCards ?? ""}"></label>
    <label>Copy limit <span class="h">blank = no limit</span><input type="number" id="fcopy" min="1" value="${R.maxCopies ?? ""}"></label>
   </div>
   <div><b>Banned cards</b><div class="pick" id="pban"><input type="search" placeholder="Search a card to ban" aria-label="Search a card to ban"><div class="hits" hidden></div></div><div class="chips" id="cban"></div></div>
   <div><b>Only these cards are legal</b> <span class="muted">(leave empty to allow everything)</span><div class="pick" id="ponly"><input type="search" placeholder="Search a card to allow" aria-label="Search a card to allow"><div class="hits" hidden></div></div><div class="chips" id="conly"></div></div>
   <label>Extra rules text <span class="h">shown on the format page</span><textarea id="ftext" style="min-height:90px">${esc((f && f.text) || "")}</textarea></label>
   <div class="row"><button class="btn go" id="save">${f ? "Save changes" : "Save format"}</button>${f ? '<button class="btn danger" id="del">Delete</button>' : ""}</div>
  </div></div>`;
  const chips = (id, get, drop) => {
    $(id).innerHTML = get().map((n, i) => `<span class="chip">${esc(n)}<button data-i="${i}" aria-label="Remove ${esc(n)}">&times;</button></span>`).join("");
    $(id).onclick = e => { const b = e.target.closest("button"); if (b) { drop(get()[+b.dataset.i]); chips(id, get, drop); } };
  };
  const names = () => Object.keys(banned);
  chips("#cban", names, n => delete banned[n]); chips("#conly", () => only, n => only.splice(only.indexOf(n), 1));
  const picker = (id, chipId, get, add, drop) => {
    const box = $(id), inp = box.querySelector("input"), hits = box.querySelector(".hits");
    inp.oninput = () => {
      const q = norm(inp.value), m = q.length < 2 ? [] : CARDS.filter(c => norm(full(c)).includes(q)).slice(0, 8);
      hits.hidden = !m.length;
      hits.innerHTML = m.map(c => `<button type="button" data-n="${esc(full(c))}">${esc(full(c))}</button>`).join("");
    };
    hits.onclick = e => { const b = e.target.closest("button"); if (!b) return; if (!get().includes(b.dataset.n)) add(b.dataset.n); chips(chipId, get, drop); inp.value = ""; hits.hidden = true; inp.focus(); };
  };
  picker("#pban", "#cban", names, n => (banned[n] = 1), n => delete banned[n]);
  picker("#ponly", "#conly", () => only, n => only.push(n), n => only.splice(only.indexOf(n), 1));
  if ($("#del")) $("#del").onclick = () => { if (confirm(`Delete "${f.name}"?`)) { putCustom(getCustom().filter(x => x.id !== f.id)); location.hash = ""; } };
  $("#save").onclick = () => {
    const name = $("#fname").value.trim(); if (!name) { toast("Give it a name"); return $("#fname").focus(); }
    const sel = [...document.querySelectorAll("#frar input:checked")].map(i => i.value);
    if (!sel.length) return toast("Allow at least one rarity");
    const num = id => { const v = $(id).value.trim(); return v === "" ? null : Math.max(0, Math.floor(+v)); };
    const nf = { id: f ? f.id : "c" + Date.now().toString(36), custom: true, name, blurb: $("#fblurb").value.trim(),
      rarities: sel.length === RARITIES.length ? null : sel, maxInks: +$("#fink").value, minCards: num("#fmin") ?? 0,
      maxCards: num("#fmax"), maxCopies: num("#fcopy"), banned, only: only.length ? only : null, text: $("#ftext").value.trim() };
    const rest = getCustom().filter(x => x.id !== nf.id);
    if (putCustom([...rest, nf])) { toast("Saved"); location.hash = nf.id; }
  };
}

/* ---------- boot ---------- */
(async () => {
  try {
    const [fm, db] = await Promise.all([fetch("formats.json").then(r => r.json()), fetch("/card-db.json").then(r => r.json())]);
    OFFICIAL = fm; CARDS = db.cards; IDX = index(CARDS);
  } catch (e) { app.innerHTML = '<p class="pad">Couldn\'t load the card list. Check your connection and reload.</p>'; return; }
  addEventListener("hashchange", route); route();
})();
