const PLAY_HUB_HOSTS = new Set(["tcg.ravensburgerplay.com", "www.tcg.ravensburgerplay.com"]);
const API_ROOT = "https://api.cloudflare.ravensburgerplay.com/hydraproxy/api/v2";

function extractEventId(input) {
  if (typeof input !== "string" || !input.trim()) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || !PLAY_HUB_HOSTS.has(url.hostname.toLowerCase())) return null;
    const match = url.pathname.match(/^\/events\/(\d+)\/?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function eventDate(event) {
  if (!event?.start_datetime) return "";
  const timezone = event.timezone || event.store?.timezone;
  try {
    if (timezone) {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(event.start_datetime));
      const get = type => parts.find(part => part.type === type)?.value;
      return `${get("year")}-${get("month")}-${get("day")}`;
    }
  } catch {}
  return String(event.start_datetime).slice(0, 10);
}

function playLevel(event) {
  const raw = String(event?.rules_enforcement_level || event?.game_rules_enforcement_level || "").toLowerCase();
  if (raw.includes("premier")) return "Premier";
  if (raw.includes("competitive")) return "Competitive";
  if (raw.includes("entry") || raw.includes("casual")) return "Entry";
  return null;
}

function mapEvent(event, registrations) {
  const seen = new Set();
  const players = (registrations?.results || [])
    .filter(row => !row.registration_status || row.registration_status === "COMPLETE")
    .map(row => row.best_identifier || row.special_user_identifier || row.user?.best_identifier)
    .map(name => String(name || "").trim())
    .filter(name => name && !seen.has(name) && seen.add(name));
  const wins = Number(event?.settings?.maximum_number_of_game_wins_per_match);
  return {
    source: "Ravensburger Play Hub",
    eventId: String(event.id),
    url: `https://tcg.ravensburgerplay.com/events/${event.id}`,
    name: event.name || "",
    date: eventDate(event),
    level: playLevel(event),
    matchFormat: wins === 2 ? "bo3" : null,
    roundMinutes: Number(event?.settings?.round_duration_in_minutes) || null,
    players,
    registeredCount: Number(event.registered_user_count ?? registrations?.count ?? players.length),
    capacity: Number(event.capacity) || null,
    store: event.store?.name || "",
    gameplayFormat: event.gameplay_format?.name || "",
    eventType: event.event_type || "",
    publishedRounds: Number(event.number_of_rounds) || null,
    publishedTopCut: Number(event.top_cut_size) || null,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "ReadySetInk Tournament Companion" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Play Hub returned ${response.status}`);
  return response.json();
}

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET for this endpoint." });
  const eventId = extractEventId(req.query?.url);
  if (!eventId) return res.status(400).json({ error: "Paste a Ravensburger Play Hub event link, such as https://tcg.ravensburgerplay.com/events/857050" });
  try {
    const [event, registrations] = await Promise.all([
      fetchJson(`${API_ROOT}/events/${eventId}/`),
      fetchJson(`${API_ROOT}/events/${eventId}/registrations/?page=1&page_size=500`),
    ]);
    const mapped = mapEvent(event, registrations);
    if (!mapped.name) throw new Error("The public event details were incomplete.");
    return res.status(200).json(mapped);
  } catch (error) {
    return res.status(502).json({ error: "We couldn't import that event right now. Check the link or enter the tournament manually.", detail: error.message });
  }
}

module.exports = handler;
module.exports.extractEventId = extractEventId;
module.exports.mapEvent = mapEvent;

