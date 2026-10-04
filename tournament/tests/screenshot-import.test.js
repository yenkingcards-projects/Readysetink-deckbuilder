const test = require("node:test");
const assert = require("node:assert/strict");
const { parse, isoDate } = require("../screenshot-import.js");

test("normalizes named and numeric screenshot dates", () => {
  assert.equal(isoDate("September 04, 2026"), "2026-09-04");
  assert.equal(isoDate("2026/9/4"), "2026-09-04");
});

test("extracts reviewable Play Hub screenshot fields", () => {
  const result = parse(`EVENT DETAILS\nOdyssey Lorcana September 04, 2026\nSTORE\nOdyssey Games\nPLAYERS 16\nTOURNAMENT FORMAT\nCore Constructed\nSWISS PHASE\nROUND 1\nSTANDINGS\nReadysetink\nZeroDEF7\nInkme`);
  assert.equal(result.name, "Odyssey Lorcana September 04, 2026");
  assert.equal(result.date, "2026-09-04");
  assert.equal(result.store, "Odyssey Games");
  assert.equal(result.format, "Core Constructed");
  assert.equal(result.round, 1);
  assert.equal(result.playerCount, 16);
  assert.deepEqual(result.players, ["Readysetink", "ZeroDEF7", "Inkme"]);
});

test("extracts current records and optional tiebreakers instead of pairings", () => {
  const result = parse(`STANDINGS\n1 Readysetink 6 2-0-0 50.0% 66.7% 60.0%\n2 Inkme 3 1-1-0 75.0% 50.0% 65.0%`);
  assert.deepEqual(result.standings, [
    { name: "Readysetink", w: 2, l: 0, d: 0, omw: 50, gw: 66.7, ogw: 60 },
    { name: "Inkme", w: 1, l: 1, d: 0, omw: 75, gw: 50, ogw: 65 },
  ]);
});

const { parsePasted, parseStanding, formatStanding } = require("../screenshot-import.js");

test("reads standings pasted cell-per-line, as the official table copies", () => {
  const result = parsePasted("STANDINGS\nPREVIOUS ROUND STANDINGS (ROUND 6)\nRANK\t\tPOINTS\tRECORD\tOMW %\tGW %\tOGW %\tSTATUS\n1\t\nReadysetink\n\t16\t\n5\n-\n0\n-\n1\n\t68.0%\t73.3%\t63.7%\tActive\n2\t\n[Ink Pass] Inkme 2\n\t15\t\n5\n-\n1\n-\n0\n\t64.7%\t66.7%\t60.8%\tDROPPED\n");
  assert.equal(result.round, 6);
  assert.deepEqual(result.standings, [
    { name: "Readysetink", w: 5, l: 0, d: 1, omw: 68, gw: 73.3, ogw: 63.7 },
    { name: "[Ink Pass] Inkme 2", w: 5, l: 1, d: 0, omw: 64.7, gw: 66.7, ogw: 60.8 },
  ]);
});

test("reads standings pasted one tab-separated row per line", () => {
  const result = parsePasted("1\tReadysetink\t9\t3-0-0\t55.6%\t77.8%\t50.0%\tActive\n2\tZeroDEF7\t6\t2-1-0\t66.7%\t57.1%\t58.3%\tActive");
  assert.deepEqual(result.standings.map(p => p.name), ["Readysetink", "ZeroDEF7"]);
  assert.equal(result.standings[1].l, 1);
});

test("reviewed names survive a format/parse round trip without a trailing comma", () => {
  const p = { name: "Inkme", w: 2, l: 1, d: 0, omw: 50, gw: 60, ogw: 55 };
  assert.equal(parseStanding(formatStanding(p)).name, "Inkme");
});
