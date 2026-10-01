// node customrules/test.js — checks the legality engine against the real card list and the real format files.
const assert = require("assert"), fs = require("fs"), path = require("path");
const CR = require("./rules.js");
const cards = JSON.parse(fs.readFileSync(path.join(__dirname, "../card-db.json"))).cards;
const fm = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(__dirname, "formats.json"))).map(f => [f.id, f]));
const idx = CR.index(cards);
const run = (id, txt) => CR.check(fm[id], CR.parseDeck(txt, idx));
const pick = (f, n) => cards.filter(f).slice(0, n).map(c => `4 ${CR.full(c)}`).join("\n");

// a clean 2-ink common deck is legal everywhere that allows it
const commons = cards.filter(c => c.r === "Common" && c.co.length === 1 && ["Amber", "Ruby"].includes(c.co[0]));
const clean = commons.slice(0, 15).map(c => `4 ${CR.full(c)}`).join("\n");
assert(run("poorcana", clean).ok, "clean common deck should be legal in Poorcana");

// parsing: 4x, curly apostrophe, trailing set tag, headers, duplicates merge
const p = CR.parseDeck("Characters:\n2x " + CR.full(commons[0]) + " (ABC 12)\n2 " + CR.full(commons[0]) + "\n3 Not A Real Card", idx);
assert.strictEqual(p.length, 2); assert.strictEqual(p[0].q, 4); assert.strictEqual(p[1].card, null);

// size
assert(run("poorcana", "4 " + CR.full(commons[0])).problems[0].includes("at least 60"));
// rarity
const rare = cards.find(c => c.r === "Rare" && c.co.length === 1 && c.pr == null);
let r = run("poorcana", clean + "\n1 " + CR.full(rare));
assert(r.problems.some(x => x.includes("Too rare")) && [...r.bad.values()].flat().includes("Rare"));
// copies
assert(run("poorcana", clean + "\n1 " + CR.full(commons[0])).problems.some(x => x.includes("Too many copies")));
// mono: dual-ink flagged, 2 pure inks flagged
const dual = cards.find(c => c.co.length === 2);
r = run("mono", "4 " + CR.full(dual) + "\n" + commons.slice(0, 15).map(c => `4 ${CR.full(c)}`).join("\n"));
assert(r.problems.some(x => x.includes("two-ink")) && r.problems.some(x => x.includes("inks (")));
// 3 inks in a normal format
const three = ["Amber", "Ruby", "Steel"].map(i => cards.find(c => c.co.length === 1 && c.co[0] === i)).map(c => `20 ${CR.full(c)}`).join("\n");
assert(run("aarons-rules", three).problems.some(x => x.includes("uses 3 inks")));
// flounder only: 60 flounders, any mix, no copy limit
const fl = "40 Flounder - Voice of Reason\n20 Flounder - Collector's Companion";
assert(run("flounder-only", fl).ok);
assert(!run("flounder-only", fl + "\n1 " + CR.full(commons[0])).ok);
assert(run("flounder-only", "30 Flounder - Voice of Reason").problems[0].includes("exactly 60"));
// aaron's rules: every banned name resolves and gets flagged
const names = Object.keys(fm["aarons-rules"].banned);
assert.strictEqual(names.length, 128);
for (const n of names) assert(idx.by.has(CR.norm(n)), "unknown banned card " + n);
r = run("aarons-rules", clean + "\n1 " + names[0]);
assert(r.problems.some(x => x.startsWith("Banned")));
assert(run("aarons-rules", clean).ok);
console.log("customrules: all checks passed");
