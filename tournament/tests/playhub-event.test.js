const test = require("node:test");
const assert = require("node:assert/strict");
const { extractEventId, mapEvent } = require("../../api/playhub-event.js");

test("accepts only Ravensburger Play Hub event URLs", () => {
  assert.equal(extractEventId("https://tcg.ravensburgerplay.com/events/857050"), "857050");
  assert.equal(extractEventId("https://tcg.ravensburgerplay.com/events/857050/"), "857050");
  assert.equal(extractEventId("https://example.com/events/857050"), null);
  assert.equal(extractEventId("https://tcg.ravensburgerplay.com/players/857050"), null);
});

test("maps public event details and unique completed roster names", () => {
  const event = { id: 857050, name: "Odyssey Lorcana September 04, 2026", start_datetime: "2026-09-04T22:00:00+00:00", registered_user_count: 3, capacity: 32, event_type: "LOCALS", store: { name: "Odyssey Games", timezone: "America/Detroit" }, gameplay_format: { name: "Core Constructed" }, settings: { round_duration_in_minutes: 50, maximum_number_of_game_wins_per_match: 2 } };
  const roster = { results: [
    { registration_status: "COMPLETE", best_identifier: "Readysetink" },
    { registration_status: "COMPLETE", best_identifier: "Inkme" },
    { registration_status: "COMPLETE", best_identifier: "Inkme" },
    { registration_status: "CANCELED", best_identifier: "Not Playing" },
  ] };
  const result = mapEvent(event, roster);
  assert.equal(result.date, "2026-09-04");
  assert.equal(result.matchFormat, "bo3");
  assert.equal(result.level, null);
  assert.deepEqual(result.players, ["Readysetink", "Inkme"]);
});

