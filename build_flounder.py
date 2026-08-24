#!/usr/bin/env python3
"""
Ready Set Ink — data builder.

Regenerate flounder-search.html whenever a new Lorcana set drops:

    python3 build_flounder.py

What it does
  1. Downloads LorcanaJSON  (card data: franchise, official legality, ability types)
  2. Downloads Lorcast set endpoints (card images — the only source with CORS)
  3. Joins them on (setCode, number), falls back to Ravensburger's own image URL
  4. Trims to the ~20 fields the app needs and injects it into the template

Why baked in rather than fetched at runtime: LorcanaJSON serves no
Access-Control-Allow-Origin header, so a browser fetch() from GitHub Pages is
blocked. Embedding also makes the app load instantly and work offline.
"""
import json, re, sys, time, urllib.request, urllib.parse, os, collections

# ---------------------------------------------------------------- note kinds
# The five flavours a Ready Set Ink note can take. Defined ONCE here and injected
# into both the site and the notes editor, so a colour or label can never drift
# between the tool that writes notes and the page that shows them.
# Deliberately short: every extra kind is another colour to learn, another
# decision per note, and another chip in the filter bar. Five earns its keep
# because each one changes what a reader does with the note.
NOTE_KINDS = [
    {"k": "ruling", "l": "Ruling",     "i": "⚖️", "c": "#3fd995",
     "d": "How the card actually works. The serious one."},
    {"k": "watch",  "l": "Watch out",  "i": "⚠️", "c": "#ff8c42",
     "d": "Commonly missed or misplayed."},
    {"k": "take",   "l": "Ben's take", "i": "💭", "c": "#f7c95c",
     "d": "Your opinion — is it good, when do you play it."},
    {"k": "trivia", "l": "Trivia",     "i": "✨", "c": "#b98cff",
     "d": "Art, flavour, Easter eggs. Just for fun."},
    {"k": "video",  "l": "Video",      "i": "🎬", "c": "#ff6bb3",
     "d": "A video featuring this card — paste the link."},
]

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "flounder-search.template.html")
OUT      = os.path.join(HERE, "flounder-search.html")
INDEX    = os.path.join(HERE, "index.html")   # same file, the name a host serves
TAG_TPL  = os.path.join(HERE, "tagger.template.html")
TAG_OUT  = os.path.join(HERE, "flounder-tagger.html")
TAGS_F   = os.path.join(HERE, "art-tags.json")
RULES_F  = os.path.join(HERE, "card-rules.json")
NOTES_F  = os.path.join(HERE, "rsi-notes.json")
NOTE_TPL = os.path.join(HERE, "notes.template.html")
NOTE_OUT = os.path.join(HERE, "flounder-notes.html")
# Price snapshot. Written on every successful build from the SAME Lorcast pass
# that fetches the images, so refreshing prices costs one extra dictionary and
# no extra requests. Committed to the repo so a build with Lorcast down still
# ships the last known prices instead of blanking them.
PRICES_F = os.path.join(HERE, "card-prices.json")
LJ_URL   = "https://lorcanajson.org/files/current/en/allCards.json"
LC_API   = "https://api.lorcast.com/v0"
UA       = {"User-Agent": "flounder-search-build/3.0"}

def get(url, timeout=90):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)

def log(*a): print(*a, flush=True)

# ============================================================================
#  OUR OWN CARD DATABASE
# ============================================================================
# card-db.json is the card database, and it belongs to this repo.
#
# It used to be that every single build hit two other people's servers. That is
# three separate problems wearing one coat:
#
#   · A build was only as reliable as somebody else's afternoon. A flaky
#     Lorcast run produced a site with missing artwork and no error.
#   · A build was not reproducible. Rebuilding last week's site was impossible,
#     because "last week's upstream data" no longer exists anywhere.
#   · If LorcanaJSON ever stops, so does Ready Set Ink. Everything the site
#     knows would live only on somebody else's machine.
#
# Now the download is a SEPARATE, DELIBERATE act. An ordinary build reads
# card-db.json off the disk and never opens a socket — fast, offline, and
# identical every time. Refreshing is opt-in:
#
#     python3 build_flounder.py              # build from our database
#     python3 build_flounder.py --refresh    # go and get new cards first
#
# Commit card-db.json. It is the asset. If every upstream service vanished
# tomorrow, the site would keep building from it exactly as it does today.
CARDDB  = os.path.join(HERE, "card-db.json")
REFRESH = "--refresh" in sys.argv or "-r" in sys.argv

if REFRESH or not os.path.exists(CARDDB):
    if not os.path.exists(CARDDB):
        log("· no card-db.json yet — fetching it once")
    else:
        log("· --refresh: fetching new card data")
    import fetch_cards                    # importing it IS the download
    out, setinfo = fetch_cards.out, fetch_cards.setinfo
    PRICE_DATE = fetch_cards.PRICE_DATE
    with open(CARDDB, "w", encoding="utf-8") as f:
        json.dump({"fetched": time.strftime("%Y-%m-%d"), "priced": PRICE_DATE,
                   "sets": setinfo, "cards": out},
                  f, separators=(",", ":"), ensure_ascii=False)
    log(f"✓ wrote {CARDDB}  ({os.path.getsize(CARDDB)/1024/1024:.2f} MB) — commit this")
else:
    with open(CARDDB, encoding="utf-8") as f:
        db = json.load(f)
    out, setinfo, PRICE_DATE = db["cards"], db["sets"], db.get("priced", "")
    log(f"· card database: {len(out)} cards, fetched {db.get('fetched','?')} "
        f"(--refresh to go and get new ones)")

# ---------------------------------------------------------------- art tags
# aliases apply per CHARACTER NAME (one entry covers all 16 Stitch cards);
# card tags are per printing and come out of flounder-tagger.html.
try:
    with open(TAGS_F, encoding="utf-8") as f:
        tags = json.load(f)
except FileNotFoundError:
    tags = {}
aliases  = tags.get("aliases", {}) or {}
cardtags = tags.get("cards", {}) or {}
def alias_keys(name):
    """Which alias entries apply to this card name.

    Duo cards are printed under a combined name ("Lilo & Stitch", "Chip 'n'
    Dale"), so an exact-name lookup gave them nothing — searching "blue dog"
    found all 16 Stitch cards but not Lilo & Stitch. Splitting on the joiner
    fixes that.

    Deliberately NOT substring matching: "Scar" is inside "Scarab" and "Sudden
    Scare", "Pete" is inside "Peter Pan", "Dale" is inside "Alan-a-Dale" — all
    different characters. Likewise "Ursula's Lair" is a location, not Ursula,
    so it should not inherit her art words.
    """
    keys = [name]
    keys += [p.strip() for p in re.split(r"\s+(?:&|'n')\s+", name) if p.strip()]
    return list(dict.fromkeys(keys))

tagged = 0
used = set()
for c in out:
    full = (c["n"] + " - " + c["v"]) if c["v"] else c["n"]
    words = []
    for k in alias_keys(c["n"]):
        if k in aliases:
            words += aliases[k]
            used.add(k)
    rec = cardtags.get(full) or {}
    if rec.get("t"): words += rec["t"]
    if rec.get("a"): words += rec["a"]
    if words:
        c["tg"] = sorted(set(words))
        tagged += 1
    # Hidden mouse-shaped symbol marks: {x, y, r} as percentages of the art,
    # placed in the tagger. Percentages, never pixels — every printing of a card
    # uses the same art at a different file size.
    marks = [m for m in (rec.get("m") or [])
             if isinstance(m, dict) and all(isinstance(m.get(k), (int, float)) for k in "xyr")]
    bad_marks = len(rec.get("m") or []) - len(marks)
    if bad_marks:
        log(f"  ! {full}: dropped {bad_marks} malformed symbol mark(s)")
    if marks:
        c["mk"] = [{"x": round(m["x"], 1), "y": round(m["y"], 1), "r": round(m["r"], 1)}
                   for m in marks]
log(f"  art tags: {len(aliases)} characters aliased · {len(cardtags)} cards tagged · {tagged} cards searchable by tag")
n_marked = sum(1 for c in out if c.get("mk"))
if n_marked:
    log(f"  symbol marks: {n_marked} cards carry {sum(len(c['mk']) for c in out if c.get('mk'))} marked spots")

# An alias key that matches no card is a typo and fails silently — say so loudly.
dead = sorted(set(aliases) - used)
if dead:
    log(f"  ! {len(dead)} alias key(s) match NO card — check the spelling in art-tags.json:")
    for k in dead:
        log(f"      {k!r}")
missing = sorted({t for t in cardtags if t not in {(c['n'] + ' - ' + c['v']) if c['v'] else c['n'] for c in out}})
if missing:
    log(f"  ! {len(missing)} tagged card name(s) match no card: {missing}")

# ---------------------------------------------------------------- card rulings
# Official Q&A from Ravensburger's Set Release Notes, keyed by exact card name.
try:
    with open(RULES_F, encoding="utf-8") as f:
        ruledata = json.load(f)
except FileNotFoundError:
    ruledata = {}
cardrules = ruledata.get("cards", {}) or {}
withrules = 0
for c in out:
    full = (c["n"] + " - " + c["v"]) if c["v"] else c["n"]
    rs = cardrules.get(full)
    if rs:
        c["ru"] = [{"q": r["q"], "a": r["a"], "s": r.get("set", "")} for r in rs]
        withrules += 1
log(f"  named abilities: {sum(1 for c in out if c.get('an'))} cards "
    f"({sum(len(c.get('an') or []) for c in out)} names) · flavour text on "
    f"{sum(1 for c in out if c.get('fl'))} cards")
log(f"  set notes: {withrules} cards carry official Q&A "
    f"({sum(len(v) for v in cardrules.values())} total)")

# ------------------------------------------------------- Ready Set Ink notes
# Community rulings and play notes Ben writes in flounder-notes.html. Kept in a
# separate file from the official Q&A so the two can never be confused in the UI.
try:
    with open(NOTES_F, encoding="utf-8") as f:
        notedata = json.load(f)
except FileNotFoundError:
    notedata = {}
cardnotes = notedata.get("cards", {}) or {}
withnotes = 0
for c in out:
    full = (c["n"] + " - " + c["v"]) if c["v"] else c["n"]
    ns = cardnotes.get(full)
    if ns:
        c["rsi"] = [{"t": n["t"], "k": n.get("k") or "ruling", "src": n.get("src", ""),
                     "d": n.get("d", ""), "u": n.get("u", "")}
                    for n in ns if (n.get("t") or "").strip()]
        if c["rsi"]:
            withnotes += 1
kinds = collections.Counter(n.get("k") or "ruling"
                            for v in cardnotes.values() for n in v)
log(f"  RSI notes: {withnotes} cards carry community notes "
    f"({sum(len(v) for v in cardnotes.values())} total"
    + (" · " + ", ".join(f"{k} {n}" for k, n in sorted(kinds.items())) if kinds else "") + ")")
bad_kinds = sorted(set(kinds) - {x["k"] for x in NOTE_KINDS})
if bad_kinds:
    log(f"  ! unknown note kind(s) {bad_kinds} — will fall back to 'ruling' styling")

payload = {"generated": time.strftime("%Y-%m-%d"), "sets": setinfo, "cards": out,
           "priced": PRICE_DATE}

# ---------------------------------------------------------------- 4. inject
with open(TEMPLATE, encoding="utf-8") as f:
    html = f.read()
if "/*__DATA__*/" not in html:
    sys.exit("! template is missing the /*__DATA__*/ placeholder")
blob = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
# </script> inside a JS string literal would close the tag early
blob = blob.replace("</", "<\\/")
kindblob = json.dumps(NOTE_KINDS, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
html = html.replace("/*__DATA__*/", blob).replace("/*__KINDS__*/", kindblob)

# Supabase connection details. Both are public by design — the publishable key
# identifies the project, it does not grant anything. What actually protects the
# data is the row-level security installed by supabase-schema.sql, which lives
# on the database and cannot be bypassed from the browser. Leaving these blank
# is a supported state: the app hides the sign-in button and behaves exactly as
# it did before accounts existed.
SB_URL = "https://cwevqwisucaemfsffpsy.supabase.co"
SB_KEY = "sb_publishable_1uLIyne_6GxEPtWbQoj7jg_4R1UUfmT"
html = html.replace("/*__SB_URL__*/", SB_URL).replace("/*__SB_KEY__*/", SB_KEY)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)
log(f"✓ wrote {OUT}  ({len(html)/1024/1024:.2f} MB)")

# The same file again as index.html, which is the name a host serves at "/".
# Two names rather than one rename because all 33 test suites read
# flounder-search.html, and renaming it would break every one of them for no
# user-visible gain. Neither file is ever edited by hand — both are generated.
with open(INDEX, "w", encoding="utf-8") as f:
    f.write(html)
log(f"✓ wrote {INDEX}  (the deployable copy)")

# ---------------------------------------------------------------- tagger
if os.path.exists(TAG_TPL):
    with open(TAG_TPL, encoding="utf-8") as f:
        thtml = f.read()
    thtml = thtml.replace("/*__DATA__*/", blob)
    seed = json.dumps({"aliases": aliases, "cards": cardtags},
                      separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    thtml = thtml.replace("/*__TAGS__*/", seed)
    with open(TAG_OUT, "w", encoding="utf-8") as f:
        f.write(thtml)
    log(f"✓ wrote {TAG_OUT}  ({len(thtml)/1024/1024:.2f} MB)")

# ------------------------------------------------------------- notes editor
if os.path.exists(NOTE_TPL):
    with open(NOTE_TPL, encoding="utf-8") as f:
        nhtml = f.read()
    nhtml = nhtml.replace("/*__DATA__*/", blob).replace("/*__KINDS__*/", kindblob)
    nseed = json.dumps({"cards": cardnotes}, separators=(",", ":"),
                       ensure_ascii=False).replace("</", "<\\/")
    nhtml = nhtml.replace("/*__NOTES__*/", nseed)
    with open(NOTE_OUT, "w", encoding="utf-8") as f:
        f.write(nhtml)
    log(f"✓ wrote {NOTE_OUT}  ({len(nhtml)/1024/1024:.2f} MB)")

# ------------------------------------------------------- crawlable card pages
# The app is one big file with one <title>; a search engine sees a blank page
# and none of the 2,543 cards inside it. gen_pages.py writes a small real page
# per card, plus the sitemap, manifest and robots.txt. It reads the build output
# rather than rebuilding the joins, so it can never describe a different card
# than the app shows. Failing here must not fail the build — the site works
# perfectly well without these; it is just harder to find.
try:
    import gen_pages
    gen_pages.main()
except Exception as e:
    log(f"  ! card pages skipped ({e})")

# ------------------------------------------------------------- build report
# What changed since last time, and whether this build is safe to ship. The
# build pulls from two upstream services and had no way to notice when one of
# them quietly returned less than it should — a half-failed image run shipped
# looking exactly like a good one. This compares against the previous build and
# says DO NOT SHIP when the numbers fall off a cliff. It also writes the list of
# what is new, what got errata'd, and what moved in price.
try:
    import build_report
    build_report.main()
except Exception as e:
    log(f"  ! build report skipped ({e})")
