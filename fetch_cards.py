#!/usr/bin/env python3
"""
The only part of Ready Set Ink that talks to anybody else's server.

Everything upstream lives HERE and nowhere else: LorcanaJSON for the card data,
Lorcast for the artwork and the prices. Importing this module performs the
download and leaves three names behind — `out`, `setinfo`, `PRICE_DATE`.

It is imported ONLY when the card database is being refreshed. An ordinary
build reads card-db.json and never opens a socket. That is the point: this file
is the whole of the dependency, and it is optional.

Run it directly to refresh the database without building the site:

    python3 fetch_cards.py
"""
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

# ---------------------------------------------------------------- 1. LorcanaJSON
def norm(s):
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())

log("· downloading LorcanaJSON …")
lj = get(LJ_URL)
cards, sets_meta = lj["cards"], lj.get("sets", {})
log(f"  {len(cards)} printings, {len(sets_meta)} sets")

# ---------------------------------------------------------------- 2. Lorcast images
log("· downloading Lorcast images …")
# Key images by NORMALISED CARD NAME, never by (set, number).
# LorcanaJSON reuses (setCode, number) for promo variants — set 1 #1 alone holds
# five different cards — so a positional join silently served the wrong art for
# 145 cards. Name is the identity we actually render, so a hit cannot be wrong.
RARITY_PENALTY = {"Enchanted": 3, "Special": 2, "Promo": 2}
imgmap = {}    # normalised name -> best single image (the DEFAULT printing)
printmap = {}  # (setCode, collector_number) -> image for that EXACT printing
# Prices ride along on the same objects. Lorcast's card record already carries
# prices.usd / prices.usd_foil and a tcgplayer_id, so this is free.
pricemap = {}   # "name|set|number" -> [usd, usd_foil, tcgplayer_id]
pricename = {}  # normalised name    -> the same, for the DEFAULT printing
try:
    for s in get(LC_API + "/sets")["results"]:
        code = s["code"]
        if code == "[Coconut]":
            continue
        try:
            for c in get(f"{LC_API}/sets/{urllib.parse.quote(code, safe='')}/cards", 30) or []:
                iu = (c.get("image_uris") or {}).get("digital") or {}
                if not iu.get("normal"):
                    continue
                pair = {"n": iu["normal"], "l": iu.get("large") or iu["normal"]}
                # Per-printing key. Lorcast's collector_number carries the variant
                # letter ("4a"), matching LorcanaJSON's number + variant — but that
                # pair is NOT unique on its own: 158 (set, number) keys are claimed
                # by more than one printing (Goofy - Musketeer and Mickey Mouse -
                # True Friend both sit on set 1 #12, because promos reuse the
                # numbering). Including the name makes the join one-to-one.
                key = norm(c["name"] + (" - " + c["version"] if c.get("version") else ""))
                cn = str(c.get("collector_number") or "")
                if cn:
                    printmap[(key, str(code), cn)] = dict(pair, r=c.get("rarity") or "")
                pz = c.get("prices") or {}
                prow = [pz.get("usd"), pz.get("usd_foil"), c.get("tcgplayer_id")]
                if any(x is not None for x in prow) and cn:
                    pricemap["|".join([key, str(code), cn])] = prow
                # prefer the plain original printing over enchanted/promo alt art
                score = (RARITY_PENALTY.get(c.get("rarity"), 0),
                         int(code) if code.isdigit() else 999)
                if key not in imgmap or score < imgmap[key]["score"]:
                    imgmap[key] = dict(pair, score=score)
                    # the default printing's price is the card's price
                    if any(x is not None for x in prow):
                        pricename[key] = prow
        except Exception as e:
            log(f"  ! set {code}: {e}")
        time.sleep(0.11)  # Lorcast asks 50-100ms between requests
except Exception as e:
    log(f"  ! Lorcast unavailable ({e}) — falling back to Ravensburger images only")
log(f"  {len(imgmap)} images indexed by name · {len(printmap)} indexed by printing")

# ---- price snapshot ---------------------------------------------------------
# Fresh prices overwrite the snapshot. No prices this run (Lorcast down, or a
# network-less build) means read the last one back rather than shipping a site
# where every price silently vanished.
PRICE_DATE = ""
if pricemap:
    PRICE_DATE = time.strftime("%Y-%m-%d")
    with open(PRICES_F, "w", encoding="utf-8") as f:
        json.dump({"generated": PRICE_DATE, "source": "Lorcast",
                   "by_printing": pricemap, "by_name": pricename},
                  f, separators=(",", ":"))
    log(f"  prices: {len(pricemap)} printings · snapshot written {PRICE_DATE}")
elif os.path.exists(PRICES_F):
    with open(PRICES_F, encoding="utf-8") as f:
        snap = json.load(f)
    pricemap = snap.get("by_printing", {})
    pricename = snap.get("by_name", {})
    PRICE_DATE = snap.get("generated", "")
    log(f"  prices: no live data — reusing the snapshot from {PRICE_DATE}")
else:
    log("  prices: none, and no snapshot on disk — the site will show no prices")

def px(v):
    """Two decimals, or None. Keeps the payload small and the numbers honest."""
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return None

# ---------------------------------------------------------------- 3. trim + join
def colors(c):
    return c.get("colors") or ([c["color"]] if c.get("color") else [])

def rewrap(t):
    """Undo the card face's hard line wraps, keep real ability breaks.

    LorcanaJSON preserves the newlines printed on the card, so rules text
    arrives broken mid-sentence ("...this character quests,\\nyou may ready...").
    A line is a continuation of the one above it only if that line didn't finish
    a sentence; anything after a full stop starts a new ability. Fixing this at
    build time also repairs phrase search — text:"quests, you may" could never
    match while a newline sat in the middle of it.
    """
    out = []
    for ln in [x.strip() for x in (t or "").split("\n") if x.strip()]:
        if out and not re.search(r'[.!?:]["»)”]?$', out[-1]):
            out[-1] += " " + ln
        else:
            out.append(ln)
    return "\n".join(out)

# Legality is the UNION across printings: if ANY printing of a card is Core-legal
# then the card is playable in Core. Without this, collapsing to the original
# printing marks set-1 cards illegal even when a Core-legal reprint exists.
core_by_name = {}
for c in cards:
    allowed = bool((c.get("allowedInFormats", {}).get("Core", {}) or {}).get("allowed"))
    k = norm(c["fullName"])
    core_by_name[k] = core_by_name.get(k, False) or allowed

seen, out, joined, fellback = set(), [], 0, 0
# Non-promo printing first so the familiar art and real collector number win;
# promo/Special reprints reuse low numbers and would otherwise be picked.
def printing_rank(c):
    promo = 1 if (c.get("promoGrouping") or c.get("rarity") == "Special") else 0
    return (promo,
            int(c["setCode"]) if str(c.get("setCode", "")).isdigit() else 999,
            c.get("number") or 0)

# ------------------------------------------------------------- printings
# A CARD is a name. A PRINTING is a specific physical printing of it. Decks care
# about names (4 copies of Elsa, art irrelevant); collections and pull lists care
# about printings (you own the enchanted, not the common). Keeping both means we
# never have to rebuild collections later, so the name-level record below stays
# exactly as it was and every printing hangs off it in `pr`.
def coll_no(c):
    """LorcanaJSON splits what Lorcast joins: number 4 + variant 'a' = '4a'."""
    return f"{c.get('number')}{c.get('variant') or ''}"

prints_by_name = {}
for c in cards:
    prints_by_name.setdefault(norm(c["fullName"]), []).append(c)

def printing_row(c):
    """Compact per-printing record. Image resolution order: exact printing from
    Lorcast, then Ravensburger's own URL on that printing. Never the name-level
    image — that would silently show base art under an enchanted's label."""
    hit = printmap.get((norm(c["fullName"]), str(c.get("setCode")), coll_no(c)))
    rb = c.get("images") or {}
    img = (hit or {}).get("n") or rb.get("thumbnail") or rb.get("full") or ""
    lrg = (hit or {}).get("l") or rb.get("full") or img
    row = {"s": str(c.get("setCode")), "num": coll_no(c),
           "r": c.get("rarity") or "", "i": img}
    # price of THIS printing — an enchanted is not worth what the common is
    pr = pricemap.get("|".join([norm(c["fullName"]), str(c.get("setCode")), coll_no(c)]))
    if pr:
        if px(pr[0]) is not None: row["p"] = px(pr[0])
        if px(pr[1]) is not None: row["pf"] = px(pr[1])
        if pr[2]: row["tid"] = pr[2]
    if lrg and lrg != img:
        row["l"] = lrg
    if c.get("promoGrouping") or c.get("rarity") == "Special":
        row["pm"] = 1
    # ---- foiling -------------------------------------------------------
    # LorcanaJSON describes the physical finish of each printing. "None" means
    # a plain non-foil copy exists; a named type is a foil pattern. A printing
    # like ("None", "Silver") is sold both ways, so only the named entries are
    # worth animating. foilMask is a greyscale image marking exactly which
    # parts of the art carry foil, which is what makes this look real rather
    # than a rectangle of shine sliding over the whole card.
    foils = special_foils(c)
    if foils:
        row["ft"] = foils
    if c.get("varnishType"):
        row["vt"] = c["varnishType"]
    if c.get("foilEffectColors"):
        row["fc"] = c["foilEffectColors"]
    mask = (c.get("images") or {}).get("foilMask")
    if mask and foils:
        row["fm"] = mask
    return row

# "Silver" is the ordinary foil treatment — 3,310 printings carry it, i.e. very
# nearly all of them. Animating it would make every card on the page shimmer at
# once, which is noise, not delight. Only the special patterns (Enchanted's Lava
# and Magma, the promo Satins and Tempests) are worth rendering, so only those
# are shipped. This also keeps ~400KB of mask URLs out of the file.
ORDINARY_FOIL = {"None", "Silver"}

def special_foils(c):
    return [f for f in (c.get("foilTypes") or []) if f and f not in ORDINARY_FOIL]

def errata_for(full):
    """Union of every errata note across all printings of this name.

    Errata sits on the printing in LorcanaJSON, but a correction applies to the
    card however you own it — the enchanted Bucky plays by the errata just like
    the common one does. Deduped, order preserved."""
    seen_e, out_e = set(), []
    for p in prints_by_name.get(norm(full), []):
        for e in (p.get("errata") or []):
            # LorcanaJSON marks ability names inside errata prose as \Squeak\.
            # Left alone that reaches the page as literal backslashes.
            t = re.sub(r"\\([^\\]+)\\", lambda m: "“" + m.group(1) + "”", e or "").strip()
            if t and t not in seen_e:
                seen_e.add(t)
                out_e.append(t)
    return out_e

for c in sorted(cards, key=printing_rank):
    full = c["fullName"]
    # Dedupe on the NORMALISED name: LorcanaJSON has casing inconsistencies
    # ("Let It Go" vs "Let it Go") that would otherwise ship as two cards.
    if norm(full) in seen:
        continue
    seen.add(norm(full))

    kw = [[a.get("keyword"), a.get("keywordValueNumber")]
          for a in (c.get("abilities") or []) if a.get("type") == "keyword" and a.get("keyword")]
    atypes = sorted({a.get("type") for a in (c.get("abilities") or [])
                     if a.get("type") and a.get("type") != "keyword"})
    # Non-keyword ability text only — keyword reminder text would pollute matching.
    # LorcanaJSON also stores a song's "can ⟳ to sing this song for free" clause as
    # a *static ability*, i.e. without the parentheses that normally mark reminder
    # text. Left in, it drags every one of the 173 songs into the cost-reduction
    # filter. Strip it here so "for free" only ever means a real discount.
    SING_FREE = re.compile(
        r"[^.]*?\bcan\b[^.]*?\bsing this song for free\.?", re.I)
    eff = " ".join(
        SING_FREE.sub("", a.get("effect") or a.get("fullText") or "").strip()
        for a in (c.get("abilities") or []) if a.get("type") != "keyword").strip()

    key = norm(full)
    if key in imgmap:
        img, imgL = imgmap[key]["n"], imgmap[key]["l"]; joined += 1
    else:
        rb = (c.get("images") or {})
        img = rb.get("thumbnail") or rb.get("full") or ""
        imgL = rb.get("full") or img
        if img: fellback += 1

    out.append({
        "n": c.get("name"), "v": c.get("version") or "", "c": c.get("cost") or 0,
        "ik": 1 if c.get("inkwell") else 0, "co": colors(c), "ty": c.get("type"),
        "sub": c.get("subtypes") or [], "tx": rewrap(c.get("fullText") or ""), "ef": eff,
        "kw": kw, "at": atypes, "st": c.get("strength"), "wi": c.get("willpower"),
        "lo": c.get("lore"), "r": c.get("rarity") or "", "s": str(c.get("setCode")),
        "num": c.get("number"), "sto": c.get("story") or "",
        # Store the SPLIT artist list, not artistsText: 127 printings are
        # collaborations, and a reader looking for "Nicholas Kole" should find
        # the ones he shares a credit on too.
        "ar": [a.strip() for a in (c.get("artists") or []) if a and a.strip()],
        # Named abilities come straight from LorcanaJSON rather than being parsed
        # out of the rules text. An earlier attempt at scraping the ALL-CAPS run
        # truncated "A WONDERFUL DREAM" to "A WONDERFUL"; this field is authored.
        "an": [x["name"].strip() for x in (c.get("abilities") or [])
               if (x.get("name") or "").strip()],
        "fl": rewrap(c.get("flavorText") or ""),
        # every physical printing of this card, newest-art last; omitted entirely
        # for the 1,947 cards that only ever had one printing
        **({"pr": [printing_row(x) for x in
                   sorted(prints_by_name.get(norm(full), []), key=printing_rank)]}
           if len(prints_by_name.get(norm(full), [])) > 1 else {}),
        "core": 1 if core_by_name.get(norm(full)) else 0,
        # Official errata, straight from LorcanaJSON. These are Ravensburger's
        # own corrections to printed cards — a real rules fact that changes how
        # the card plays, so it is never written from memory. 8 cards carry one.
        **({"er": errata_for(full)} if errata_for(full) else {}),
        # Foil finish of the printing we're showing. Card-level as well as
        # per-printing, because 1,947 cards only ever had one printing and so
        # never get a pr[] array at all.
        **({"ft": special_foils(c),
            **({"vt": c["varnishType"]} if c.get("varnishType") else {}),
            **({"fc": c["foilEffectColors"]} if c.get("foilEffectColors") else {}),
            **({"fm": (c.get("images") or {})["foilMask"]}
               if (c.get("images") or {}).get("foilMask") else {})}
           if special_foils(c) else {}),
        # card-level price = the default printing's price, which is the one the
        # tile is showing. Cards with no pr[] array have nowhere else to put it.
        **({k: v for k, v in
            (("p", px((pricename.get(key) or [None])[0])),
             ("pf", px((pricename.get(key) or [None, None])[1] if pricename.get(key) else None)),
             ("tid", (pricename.get(key) or [None, None, None])[2] if pricename.get(key) else None))
            if v is not None}),
        "img": img, "imgL": imgL,
    })

log(f"  {len(out)} unique cards · {joined} Lorcast images · {fellback} Ravensburger fallback")

# release order drives the default "newest first" sort
setinfo = {str(k): {"name": v.get("name", str(k)), "d": v.get("releaseDate") or "1970-01-01"}
           for k, v in sets_meta.items()}
for c in out:
    setinfo.setdefault(c["s"], {"name": "Set " + c["s"], "d": "1970-01-01"})


if __name__ == "__main__":
    # Importing this module already did the work; just say what came back.
    log(f"  {len(out)} cards ready to write into card-db.json")
