#!/usr/bin/env python3
"""
Turn Ravensburger's official Set Release Notes PDFs into card-rules.json.

Each PDF has a section per card followed by Q&A clarifications. We split on the
card headers, pull the Q/A pairs inside each section, and attach them to the
card by name so the app can show "related rulings" on a card.

    python3 build_rules.py                # every PDF in Documents/Set release notes
    python3 build_rules.py Attack         # only PDFs whose filename matches
"""
import json, os, re, sys, glob
from pypdf import PdfReader

DOCS = "/sessions/kind-modest-ride/mnt/Documents/Set release notes"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, "card-rules.json")
APP  = os.path.join(HERE, "flounder-search.html")

# set name -> what the app calls it, so rulings can be grouped in the UI
SET_OF = {
    "Attack-of-the-Vine": "Attack of the Vine!",
    "Wilds-Unknown": "Wilds Unknown",
    "Winterspell": "Winterspell",
    "Fabled": "Fabled",
    "Whispers-in-the-Well": "Whispers in the Well",
}

def read(path):
    txt = []
    for p in PdfReader(path).pages:
        txt.append(p.extract_text() or "")
    s = "\n".join(txt).replace("\\", "")
    s = re.sub(r"©Disney", " ", s)
    return re.sub(r"[ \t]+", " ", s)

def real_cards():
    """Only keep rulings whose card actually exists, so nothing is orphaned."""
    try:
        html = open(APP, encoding="utf-8").read()
        data = json.loads(re.search(r"<script>var DATA=([\s\S]*?);var KINDS=", html).group(1))
        return {(c["n"] + (" - " + c["v"] if c["v"] else "")) for c in data["cards"]}
    except Exception:
        return set()

KNOWN = real_cards()
norm = lambda s: re.sub(r"[^a-z0-9]+", "", (s or "").lower())
KNOWN_N = {norm(k): k for k in KNOWN}

def resolve(name):
    """Release notes use en-dashes and loose casing; map to the real card name."""
    n = name.replace("–", "-").replace("—", "-")
    n = re.sub(r"\s*-\s*", " - ", n).strip(" .")
    return KNOWN_N.get(norm(n))

def parse(path):
    """Find every real card name in the text, then attach each Q&A to the card
    whose name most recently appeared before it. Far more robust than trying to
    pattern-match the PDF's heading layout, which varies between sets."""
    flat = re.sub(r"\s+", " ", read(path))

    # index every known card name that appears in this document
    hits = []
    for card in KNOWN:
        # release notes use en dashes and sometimes odd spacing around them
        pat = re.escape(card).replace(r"\ \-\ ", r"\s*[-–—]\s*")
        for m in re.finditer(pat, flat, re.I):
            hits.append((m.start(), card))
    hits.sort()

    out = {}
    for m in re.finditer(r"Q:\s*(.+?)\s*A:\s*(.+?)(?=\s*Q:|$)", flat):
        q, a = m.group(1).strip(), m.group(2).strip()
        # answers run into the next card's stat line — cut at the tell
        a = re.split(r"(?= (?:Amber|Amethyst|Emerald|Ruby|Sapphire|Steel) (?:character|action|item|location))", a)[0]
        # a new section starts by printing the card name twice in a row — cut there
        a = re.sub(r"\s+([A-Z][\w'\.\&]+(?: [A-Z&][\w'\.\&]*)* [–—-] [^.]{2,40}?)\s*\1.*$", "", a)
        # otherwise stop at the last complete sentence
        m2 = re.search(r"^(.*[.!?])\s+[A-Z][\w'\.\&]+ [–—-] ", a)
        if m2: a = m2.group(1)
        a = re.sub(r"\s+", " ", a).strip()
        if len(q) < 12 or len(a) < 12:
            continue
        before = [c for pos, c in hits if pos < m.start()]
        if not before:
            continue
        card = before[-1]
        out.setdefault(card, []).append({"q": q, "a": a})
    return out

targets = sorted(glob.glob(os.path.join(DOCS, "*.pdf")))
# Starter-deck inserts are how-to-play leaflets, not release notes — they carry
# no Q&A and only muddy the per-set counts.
targets = [t for t in targets if "starterdeck" not in os.path.basename(t).lower().replace("_", "")]
if len(sys.argv) > 1:
    targets = [t for t in targets if sys.argv[1].lower() in os.path.basename(t).lower()]

rules, meta = {}, {}
for path in targets:
    base = os.path.basename(path)
    setname = next((v for k, v in SET_OF.items() if k.lower() in base.lower()), base)
    got = parse(path)
    n = 0
    for card, qs in got.items():
        rules.setdefault(card, [])
        for x in qs:
            x["set"] = setname
            rules[card].append(x)
            n += 1
    meta[setname] = {"file": base, "cards": len(got), "rulings": n}
    print(f"  {setname:24} {len(got):3} cards · {n:3} rulings")

payload = {
    "_readme": "Official card rulings pulled from Ravensburger's Set Release Notes. "
               "Regenerate with build_rules.py. Keyed by exact card name.",
    "sets": meta, "cards": rules,
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=1, ensure_ascii=False)
tot = sum(len(v) for v in rules.values())
print(f"\n✓ {OUT}\n  {len(rules)} cards · {tot} rulings")
