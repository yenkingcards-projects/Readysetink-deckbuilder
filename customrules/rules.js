/* Parsing and legality. No DOM in here, so test.js can run it in node. */
"use strict";
(function (root) {
  const INKS = ["Amber", "Amethyst", "Emerald", "Ruby", "Sapphire", "Steel"];
  const RARITIES = ["Common", "Uncommon", "Rare", "Super Rare", "Legendary", "Special"];
  /* What every format inherits unless its file overrides it. null = no limit. */
  const BASE = { minCards: 60, maxCards: null, maxCopies: 4, maxInks: 2, rarities: null, banned: {}, only: null };

  const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[‘’`]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();
  const full = c => (c.v ? c.n + " - " + c.v : c.n);

  function index(cards) {
    const by = new Map(), names = new Map();
    for (const c of cards) {
      by.set(norm(full(c)), c);
      const k = norm(c.n);
      if (!names.has(k)) names.set(k, []);
      names.get(k).push(c);
    }
    return { by, names };
  }

  /* Dreamborn-style text: "4 Elsa - Snow Queen", one per line. Lenient about "4x", set tags and headers. */
  function parseDeck(text, idx) {
    const out = new Map();
    for (let l of text.split(/\r?\n/)) {
      l = l.trim();
      if (!l || /^(#|\/\/)/.test(l) || /:$/.test(l)) continue;
      const m = l.match(/^(\d+)\s*[x×]?\s+(.+)$/i);
      let q = m ? +m[1] : 1, name = m ? m[2].trim() : l;
      if (idx.by.has(norm(l))) { q = 1; name = l; } // a card whose own name starts with a number
      if (q < 1) continue;
      let card = idx.by.get(norm(name));
      if (!card) {
        const s = name.replace(/\s*[(\[][^)\]]*[)\]]\s*$/, "");
        card = idx.by.get(norm(s));
        if (!card) { const a = idx.names.get(norm(s)); if (a && a.length === 1) card = a[0]; }
      }
      const key = card ? full(card) : norm(name);
      const e = out.get(key);
      if (e) e.q += q; else out.set(key, { q, name: card ? full(card) : name, card: card || null });
    }
    return [...out.values()];
  }

  const combos = (a, k) => k === 0 ? [[]] : a.length < k ? [] :
    [...combos(a.slice(1), k - 1).map(c => [a[0], ...c]), ...combos(a.slice(1), k)];
  const rarsOf = c => [c.r, ...(c.pr || []).map(p => p.r)]; // a reprint at a lower rarity counts

  const list = a => a.join(", ");
  const andList = a => (a.length < 3 ? a.join(" and ") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);
  const s = n => (n === 1 ? "" : "s");

  /* -> { size, bad: Map(entry -> [short reasons]), problems: [plain-words sentences], unknown: [names], ok } */
  function check(fmt, entries) {
    const R = { ...BASE, ...fmt };
    const banned = new Set(Object.keys(R.banned || {}).map(norm));
    const only = R.only && R.only.length ? new Set(R.only.map(norm)) : null;
    const bad = new Map(), problems = [], unknown = entries.filter(e => !e.card).map(e => e.name);
    const flag = (e, why) => { if (!bad.has(e)) bad.set(e, []); bad.get(e).push(why); };
    const known = entries.filter(e => e.card);
    const size = entries.reduce((a, e) => a + e.q, 0);
    const byWhy = {};
    const note = (k, e) => (byWhy[k] = byWhy[k] || []).push(e);

    if (size < R.minCards) problems.push(R.maxCards === R.minCards
      ? `Your deck has ${size} card${s(size)} — this format needs exactly ${R.minCards}.`
      : `Your deck has ${size} card${s(size)} — this format needs at least ${R.minCards}.`);
    else if (R.maxCards != null && size > R.maxCards) problems.push(R.maxCards === R.minCards
      ? `Your deck has ${size} cards — this format needs exactly ${R.maxCards}.`
      : `Your deck has ${size} cards — this format allows at most ${R.maxCards}.`);

    for (const e of known) {
      const c = e.card;
      if (banned.has(norm(e.name))) { flag(e, "Banned"); note("ban", e); }
      if (R.rarities && !rarsOf(c).some(r => R.rarities.includes(r))) { flag(e, c.r); note("rar", e); }
      if (only && !only.has(norm(e.name))) { flag(e, "Not on the allowed list"); note("only", e); }
      if (c.co.length > R.maxInks) { flag(e, `${c.co.length} inks`); note("ink2", e); }
      if (R.maxCopies != null && e.q > R.maxCopies) { flag(e, `${e.q} copies (max ${R.maxCopies})`); note("copy", e); }
    }

    /* Deck-wide ink limit: keep the best-covering set of inks, flag everything outside it. */
    const pool = known.filter(e => e.card.co.length <= R.maxInks);
    const used = INKS.filter(i => pool.some(e => e.card.co.includes(i)));
    if (used.length > R.maxInks) {
      let best = null, bestN = -1;
      for (const sub of combos(INKS, R.maxInks)) {
        const n = pool.reduce((a, e) => a + (e.card.co.every(i => sub.includes(i)) ? e.q : 0), 0);
        if (n > bestN) { best = sub; bestN = n; }
      }
      for (const e of pool) if (!e.card.co.every(i => best.includes(i))) { flag(e, `${list(e.card.co)} isn't one of your inks`); note("ink", e); }
      problems.push(`Your deck uses ${used.length} inks (${list(used)}) — this format allows ${R.maxInks}. Keeping ${list(best)}, these are out: ${list(byWhy.ink.map(e => e.name))}.`);
    }

    const names = k => list(byWhy[k].map(e => (e.q > 1 ? e.q + "× " : "") + e.name));
    if (byWhy.ban) problems.push(`Banned in this format: ${names("ban")}.`);
    if (byWhy.rar) problems.push(`Only ${andList(R.rarities)} cards are allowed here. Too rare: ${names("rar")}.`);
    if (byWhy.only) problems.push(`These aren't on this format's allowed list: ${names("only")}.`);
    if (byWhy.ink2) problems.push(R.maxInks === 1
      ? `One ink only — two-ink cards aren't legal: ${names("ink2")}.`
      : `Cards with more than ${R.maxInks} inks aren't legal: ${names("ink2")}.`);
    if (byWhy.copy) problems.push(`Too many copies (max ${R.maxCopies} of any card): ${names("copy")}.`);

    return { size, bad, problems, unknown, ok: !problems.length && !unknown.length };
  }

  /* Plain-words rule lines for the format page. */
  function ruleLines(fmt) {
    const R = { ...BASE, ...fmt }, o = [];
    o.push(R.maxCards != null && R.maxCards === R.minCards ? `Exactly ${R.minCards} cards`
      : R.maxCards != null ? `${R.minCards} to ${R.maxCards} cards` : `${R.minCards}+ cards`);
    o.push(R.maxCopies == null ? "No limit on copies of a card" : `Max ${R.maxCopies} copies of any card`);
    o.push(R.maxInks >= 6 ? "Any number of inks" : R.maxInks === 1 ? "One ink only — two-ink cards are not legal" : `Max ${R.maxInks} inks`);
    o.push(R.rarities && R.rarities.length ? `Only ${andList(R.rarities)} cards` : "All rarities");
    if (R.only && R.only.length) o.push(R.only.length <= 6 ? `Only these cards: ${list(R.only)}` : `Only ${R.only.length} specific cards are legal`);
    o.push("All sets legal");
    const nb = Object.keys(R.banned || {}).length;
    if (nb) o.push(`${nb} banned card${s(nb)}`);
    return o;
  }

  /* What makes this format different from the base rules: the tile's one-liner. */
  function highlights(fmt) {
    const R = { ...BASE, ...fmt }, o = [], nb = Object.keys(R.banned || {}).length;
    if (R.rarities && R.rarities.length) o.push(`Only ${andList(R.rarities)}`);
    if (R.only && R.only.length) o.push(R.only.length <= 3 ? "Only specific cards" : `${R.only.length} allowed cards`);
    if (R.maxInks !== BASE.maxInks) o.push(R.maxInks >= 6 ? "Any inks" : R.maxInks === 1 ? "One ink only" : `Max ${R.maxInks} inks`);
    if (R.maxCards != null && R.maxCards === R.minCards) o.push(`Exactly ${R.minCards} cards`);
    else if (R.minCards !== BASE.minCards || R.maxCards != null) o.push(`${R.minCards}${R.maxCards != null ? "–" + R.maxCards : "+"} cards`);
    if (R.maxCopies !== BASE.maxCopies) o.push(R.maxCopies == null ? "No copy limit" : `Max ${R.maxCopies} copies`);
    if (nb) o.push(`${nb} banned`);
    return o.length ? o : ["Standard rules"];
  }

  const CR = { highlights, INKS, RARITIES, BASE, norm, full, index, parseDeck, check, ruleLines };
  if (typeof module !== "undefined") module.exports = CR;
  root.CR = CR;
})(typeof window !== "undefined" ? window : globalThis);
