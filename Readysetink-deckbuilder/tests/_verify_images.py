#!/usr/bin/env python3
"""Independently verify every baked-in image URL really belongs to its card.

Re-fetches Lorcast, builds name->image and image->name maps from scratch, then
checks the shipped file. Catches exactly the class of bug where a positional
join served Isabela's art for Pocahontas.
"""
import json, re, urllib.request, urllib.parse, time, collections

UA = {"User-Agent": "verify/1"}
g = lambda u, t=60: json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t))
norm = lambda s: re.sub(r"[^a-z0-9]+", "", (s or "").lower())

html = open("/sessions/kind-modest-ride/mnt/outputs/flounder-search.html", encoding="utf-8").read()
DATA = json.loads(re.search(r"<script>var DATA=([\s\S]*?);var KINDS=", html).group(1))
cards = DATA["cards"]
print(f"shipped cards: {len(cards)}")

# ground truth: image URL -> the card Lorcast says it belongs to
url_owner = {}
for s in g("https://api.lorcast.com/v0/sets")["results"]:
    code = s["code"]
    if code == "[Coconut]":
        continue
    try:
        for c in g(f"https://api.lorcast.com/v0/sets/{urllib.parse.quote(code,safe='')}/cards", 30) or []:
            iu = (c.get("image_uris") or {}).get("digital") or {}
            full = c["name"] + (" - " + c["version"] if c.get("version") else "")
            for k in ("small", "normal", "large"):
                if iu.get(k):
                    url_owner[iu[k].split("?")[0]] = full
    except Exception as e:
        print("  !", code, e)
    time.sleep(0.11)
print(f"lorcast image URLs indexed: {len(url_owner)}")

wrong, ok_, rb, none = [], 0, 0, 0
for c in cards:
    full = c["n"] + (" - " + c["v"] if c.get("v") else "")
    u = (c.get("img") or "").split("?")[0]
    if not u:
        none += 1
        continue
    if "ravensburger.com" in u:
        rb += 1
        continue
    owner = url_owner.get(u)
    if owner is None:
        wrong.append((full, "<url not in lorcast>"))
    elif norm(owner) != norm(full):
        wrong.append((full, owner))
    else:
        ok_ += 1

print(f"\nverified correct : {ok_}")
print(f"ravensburger     : {rb}  (from LorcanaJSON, paired at source)")
print(f"no image         : {none}")
print(f"WRONG            : {len(wrong)}")
for a, b in wrong[:20]:
    print(f"   {a:46} -> shows {b}")

# the specific cards Ben reported
print("\n--- reported cards ---")
by = {c["n"] + (" - " + c["v"] if c.get("v") else ""): c for c in cards}
for nm in [k for k in by if k.startswith(("Pocahontas", "Boo -", "Celia Mae", "Isabela"))][:8]:
    c = by[nm]
    u = (c.get("img") or "").split("?")[0]
    owner = url_owner.get(u, "(ravensburger)" if "ravensburger" in u else "?")
    flag = "OK " if norm(owner) == norm(nm) or "ravensburger" in u else "BAD"
    print(f"   {flag} {nm:46} -> {owner}")

# duplicate image URLs would mean two cards share art
dupes = [u for u, n in collections.Counter(
    (c.get("img") or "").split("?")[0] for c in cards if c.get("img")).items() if n > 1]
print(f"\nduplicate image URLs across cards: {len(dupes)}")
# ---------------------------------------------------------------- PRINTING CHECK
# Every alternate printing must have its OWN image. The failure mode we're
# guarding against is a printing silently inheriting the base card's art, which
# would show plain Hades under an "Enchanted" label.
prints = [(c, p) for c in DATA["cards"] for p in (c.get("pr") or [])]
noimg  = [(c, p) for c, p in prints if not p.get("i")]
reuse  = [(c, p) for c, p in prints if p.get("i") and p["i"] == c.get("img")
          and (p.get("r") or "") not in ("", c.get("r"))]
seen_urls = {}
pdupes = 0
for c, p in prints:
    u = p.get("i")
    if not u:
        continue
    key = (c["n"], c.get("v") or "")
    if u in seen_urls and seen_urls[u] != (key, p["s"], p["num"]):
        pdupes += 1
    seen_urls[u] = (key, p["s"], p["num"])
print()
print(f"printings checked      : {len(prints)}")
print(f"  missing an image     : {len(noimg)}")
print(f"  reusing the base art : {len(reuse)}")
print(f"  URL shared across two different printings: {pdupes}")

raise SystemExit(1 if wrong or dupes or noimg or reuse or pdupes else 0)
