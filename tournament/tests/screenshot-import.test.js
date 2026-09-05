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
