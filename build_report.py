#!/usr/bin/env python3
"""
What changed since the last build — and whether it should be shipped at all.

WHY THIS EXISTS
---------------
The build has no memory. Every run silently replaces everything, and nothing
anywhere compares the new site to the old one. Two consequences, and the first
is the dangerous one.

1. SILENT DATA LOSS. The build pulls from two upstream services. If Lorcast is
   having a bad afternoon and 400 image requests quietly fail, the build prints
   "✓ wrote flounder-search.html" and ships a site with 400 blank cards. If
   LorcanaJSON reshuffles a field, a thousand cards can lose their rules text
   and every single check still passes, because the file is well-formed and the
   right size. Nobody finds out until a stranger does.

   Nothing in the pipeline was watching for that. This is.

2. NOBODY KNOWS WHAT CHANGED. When a set drops, "what's new" is a question with
   a precise answer that no one was computing. Same for errata, and same for
   which cards moved in price this week. That last one is not maintenance — it
   is a list of the twelve cards that moved most since last Tuesday, which is a
   video, every week, generated for free by a build that was running anyway.

HOW IT WORKS
------------
Each build writes a small fingerprint of itself to .build-history/ — counts, and
one short hash per card covering the things that matter (text, rarity, image,
price). The next build compares against it. Twelve are kept; they are tiny.

Nothing here can fail the build. It reports, loudly, and leaves shipping to Ben.
"""
import gzip
import hashlib
import json
import os
import re
import sys
import time
from datetime import date, datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "flounder-search.html")
TPL = os.path.join(HERE, "flounder-search.template.html")
HIST = os.path.join(HERE, ".build-history")
REPORT = os.path.join(HERE, "BUILD-REPORT.md")
KEEP = 12

# How much of a drop is a bug rather than a Tuesday. These are deliberately
# loose: real sets add cards, and the odd card genuinely gets pulled. Anything
# past these is upstream having a bad day.
DROP_CARDS = 0.02      # 2% fewer cards than last time
DROP_IMAGES = 0.05     # 5% fewer cards carrying an image
DROP_PRICES = 0.15     # 15% fewer cards carrying a price


def log(*a):
    print(*a, flush=True)


def full_name(c):
    return c["n"] + (" - " + c["v"] if c.get("v") else "")


def load_build():
    with open(SRC, encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"var DATA=(\{.*?\});var KINDS=", src, re.S)
    if not m:
        return None
    return json.loads(m.group(1))


def fingerprint(data):
    """One row per card, small enough that a year of history is a few MB."""
    cards = {}
    for c in data["cards"]:
        sig = "|".join(str(x) for x in (
            c.get("tx", ""), c.get("r", ""), c.get("c", ""), c.get("ty", ""),
            ",".join(c.get("co") or []), 1 if c.get("img") else 0))
        cards[full_name(c)] = {
            "h": hashlib.sha1(sig.encode("utf-8")).hexdigest()[:10],
            "s": c.get("s"), "img": 1 if c.get("img") else 0,
            "p": c.get("p"), "tx": (c.get("tx") or "")[:400],
        }
    return {
        "date": date.today().isoformat(),
        "stamp": time.strftime("%Y-%m-%dT%H%M%S"),
        "generated": data.get("generated", ""),
        "priced": data.get("priced", ""),
        "n": len(data["cards"]),
        "images": sum(1 for c in data["cards"] if c.get("img")),
        "priced_n": sum(1 for c in data["cards"] if isinstance(c.get("p"), (int, float))),
        "rulings": sum(len(c.get("ru") or []) for c in data["cards"]),
        "notes": sum(len(c.get("rsi") or []) for c in data["cards"]),
        "sets": {k: sum(1 for c in data["cards"] if c.get("s") == k) for k in data.get("sets", {})},
        "cards": cards,
    }


def history():
    if not os.path.isdir(HIST):
        return []
    return sorted(f for f in os.listdir(HIST) if f.endswith(".json.gz"))


def read_snapshot(name):
    with gzip.open(os.path.join(HIST, name), "rt", encoding="utf-8") as f:
        return json.load(f)


def write_snapshot(snap):
    """Named by TIMESTAMP, not by date.

    Named by date, a second rebuild on the same day overwrote the first and then
    compared against itself — so it reported "nothing changed" and, much worse,
    every alarm below went permanently quiet after the first build of the day.
    Which is precisely the day a set drops and you rebuild four times."""
    os.makedirs(HIST, exist_ok=True)
    path = os.path.join(HIST, snap["stamp"] + ".json.gz")
    with gzip.open(path, "wt", encoding="utf-8") as f:
        json.dump(snap, f, separators=(",", ":"))
    for old in history()[:-KEEP]:
        os.remove(os.path.join(HIST, old))
    return path


# ------------------------------------------------------- hand-authored names
def integrity(data):
    """Every card name Ben has typed by hand, checked against the data.

    STAPLES, the Easter eggs, the Hidden Mouseys, the ban, and the three JSON
    files he authors are all keyed by card NAME. A name that stops resolving —
    a typo, an errata that renames a card, a version string that changes — does
    not throw. The star just quietly never appears again, on a list nobody
    re-reads. That rot is invisible and it accumulates one set at a time.
    """
    full = {full_name(c) for c in data["cards"]}
    names = {c["n"] for c in data["cards"]}

    def ok(s):
        return (s in full) if " - " in s else (s in names)

    def block(start, end):
        try:
            with open(TPL, encoding="utf-8") as f:
                t = f.read()
            i = t.index(start)
            return t[i:t.index(end, i)]
        except Exception:
            return ""

    def quoted(blk, only_versioned=False):
        out = [m.group(1) for m in re.finditer(r'"([^"\\]{4,80})"', blk)]
        return [s for s in out if not only_versioned or " - " in s]

    checks = [
        ("STAPLES", quoted(block("const STAPLES=new Set([", "]);"))),
        ("Easter eggs", quoted(block("const EGGS={", "\n};"), True)),
        ("Hidden Mouseys", quoted(block("const MICKEYS=[", "\n];"), True)),
    ]
    for fn, key in (("art-tags.json", "cards"), ("rsi-notes.json", "cards"),
                    ("card-rules.json", "cards")):
        try:
            with open(os.path.join(HERE, fn), encoding="utf-8") as f:
                j = json.load(f)
            checks.append((fn, list((j.get(key) or j or {}).keys())))
        except Exception:
            pass

    rows, broken = [], 0
    for label, refs in checks:
        bad = [s for s in refs if not ok(s)]
        broken += len(bad)
        rows.append((label, len(refs), bad))
    return rows, broken


# ------------------------------------------------------------------ the diff
def compare(prev, cur):
    pc, cc = prev["cards"], cur["cards"]
    added = [k for k in cc if k not in pc]
    removed = [k for k in pc if k not in cc]
    changed = [k for k in cc if k in pc and cc[k]["h"] != pc[k]["h"]]
    # A rules-text change on a card that already existed is an ERRATA or a data
    # correction. It is the single most consequential kind of change on this
    # site — somebody's deck may now do something different — so it is pulled
    # out of "changed" and named.
    retext = [k for k in changed
              if cc[k].get("tx") != pc[k].get("tx") and pc[k].get("tx")]
    lost_img = [k for k in cc if k in pc and pc[k]["img"] and not cc[k]["img"]]

    movers = []
    for k, v in cc.items():
        a, b = pc.get(k, {}).get("p"), v.get("p")
        if isinstance(a, (int, float)) and isinstance(b, (int, float)) and a >= 0.20:
            pct = (b - a) / a * 100
            if abs(pct) >= 20 and abs(b - a) >= 0.50:
                movers.append((k, a, b, pct))
    movers.sort(key=lambda x: -abs(x[3]))
    return dict(added=added, removed=removed, changed=changed, retext=retext,
                lost_img=lost_img, movers=movers)


def main():
    data = load_build()
    if not data:
        log("  ! build report skipped — no DATA blob to read")
        return 0
    cur = fingerprint(data)
    hist = history()
    prev = read_snapshot(hist[-1]) if hist else None

    # Two different questions, two different baselines.
    #   prev  — the run immediately before this one. Catches a broken rebuild.
    #   week  — the newest snapshot at least five days old. Prices barely move
    #           in an hour, so diffing them against a rebuild from this morning
    #           would report nothing forever; a week is the window that has a
    #           story in it.
    week = prev
    if len(hist) > 1:
        cutoff = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        older = [h for h in hist if h[:10] <= cutoff]
        if older:
            week = read_snapshot(older[-1])

    rows, broken = integrity(data)
    stop = []

    md = [f"# Build report — {cur['date']}", ""]
    md.append(f"**{cur['n']:,} cards** · {cur['images']:,} with art · "
              f"{cur['priced_n']:,} priced · {cur['rulings']:,} official rulings · "
              f"{cur['notes']:,} of your notes")
    md.append("")

    if prev:
        d = compare(prev, cur)
        md.append(f"Compared against the build of **{prev['date']}**.")
        md.append("")

        # ---- the alarms ----
        if cur["n"] < prev["n"] * (1 - DROP_CARDS):
            stop.append(f"{prev['n'] - cur['n']} cards vanished since {prev['date']} "
                        f"({prev['n']:,} → {cur['n']:,}). Upstream data is probably incomplete.")
        if cur["images"] < prev["images"] * (1 - DROP_IMAGES):
            stop.append(f"{prev['images'] - cur['images']} cards lost their artwork "
                        f"({prev['images']:,} → {cur['images']:,}). Lorcast likely failed mid-build.")
        if prev["priced_n"] and cur["priced_n"] < prev["priced_n"] * (1 - DROP_PRICES):
            stop.append(f"{prev['priced_n'] - cur['priced_n']} cards lost their price "
                        f"({prev['priced_n']:,} → {cur['priced_n']:,}).")

        if d["added"]:
            md.append(f"## {len(d['added'])} new cards")
            by_set = {}
            for k in d["added"]:
                by_set.setdefault(cur["cards"][k]["s"], []).append(k)
            for s, ks in sorted(by_set.items(), key=lambda kv: str(kv[0])):
                nm = (data.get("sets", {}).get(s, {}) or {}).get("name") or f"Set {s}"
                md.append(f"**{nm}** — {len(ks)}")
                md.append("")
                md += [f"- {k}" for k in sorted(ks)[:40]]
                if len(ks) > 40:
                    md.append(f"- …and {len(ks) - 40} more")
                md.append("")
        if d["removed"]:
            md.append(f"## {len(d['removed'])} cards no longer in the data")
            md += [f"- {k}" for k in sorted(d["removed"])[:40]] + [""]
        if d["retext"]:
            md.append(f"## {len(d['retext'])} cards had their rules text change")
            md.append("Errata, or an upstream correction. Worth reading — somebody's "
                      "deck may now behave differently.")
            md.append("")
            for k in sorted(d["retext"])[:25]:
                md.append(f"**{k}**")
                md.append("")
                md.append(f"- was: {prev['cards'][k].get('tx') or '(none)'}")
                md.append(f"- now: {cur['cards'][k].get('tx') or '(none)'}")
                md.append("")
        if d["lost_img"]:
            md.append(f"## {len(d['lost_img'])} cards lost their artwork")
            md += [f"- {k}" for k in sorted(d["lost_img"])[:40]] + [""]

        dw = compare(week, cur) if week is not prev else d
        if dw["movers"]:
            d = dict(d, movers=dw["movers"])
        if d["movers"]:
            up = [m for m in d["movers"] if m[3] > 0][:12]
            dn = [m for m in d["movers"] if m[3] < 0][:12]
            md.append(f"## Price movers since {week.get('priced') or week['date']}")
            md.append("")
            md.append("Market prices, not Flounder Prices. Only cards over 20¢ that moved "
                      "at least 20% and at least 50¢ — enough to be real rather than noise.")
            md.append("")
            if up:
                md.append("### Up")
                md.append("")
                md.append("| Card | Was | Now | Change |")
                md.append("|---|---|---|---|")
                md += [f"| {k} | ${a:.2f} | ${b:.2f} | **+{p:.0f}%** |" for k, a, b, p in up]
                md.append("")
            if dn:
                md.append("### Down")
                md.append("")
                md.append("| Card | Was | Now | Change |")
                md.append("|---|---|---|---|")
                md += [f"| {k} | ${a:.2f} | ${b:.2f} | **{p:.0f}%** |" for k, a, b, p in dn]
                md.append("")

        if not (d["added"] or d["removed"] or d["retext"] or d["movers"]):
            md.append("Nothing changed since the last build.")
            md.append("")
    else:
        md.append("First run — this build is the baseline. The next one will say what changed.")
        md.append("")

    # ---- hand-authored references ----
    md.append("## Hand-authored card names")
    md.append("")
    md.append("Every card name typed by hand, checked against the data. These fail "
              "silently when they break: the star just stops appearing.")
    md.append("")
    md.append("| List | References | Broken |")
    md.append("|---|---|---|")
    for label, n, bad in rows:
        md.append(f"| {label} | {n} | {'**' + str(len(bad)) + '**' if bad else '0'} |")
    md.append("")
    for label, n, bad in rows:
        if bad:
            md.append(f"**{label}** no longer resolves:")
            md.append("")
            md += [f"- `{b}`" for b in bad[:20]] + [""]
    if broken:
        stop.append(f"{broken} hand-authored card name(s) no longer match any card.")

    with open(REPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    write_snapshot(cur)

    # ---- what the terminal sees ----
    if prev:
        d = compare(prev, cur)
        parts = []
        if d["added"]:
            parts.append(f"+{len(d['added'])} cards")
        if d["removed"]:
            parts.append(f"-{len(d['removed'])} cards")
        if d["retext"]:
            parts.append(f"{len(d['retext'])} text changes")
        if d["movers"]:
            parts.append(f"{len(d['movers'])} price movers")
        log(f"✓ build report: {', '.join(parts) if parts else 'nothing changed'} "
            f"· {broken} broken name refs · BUILD-REPORT.md")
    else:
        log(f"✓ build report: baseline saved · {broken} broken name refs · BUILD-REPORT.md")

    if stop:
        log("")
        log("  " + "=" * 66)
        log("  DO NOT SHIP THIS BUILD")
        for s in stop:
            log("    · " + s)
        log("  The previous flounder-search.html is still good. Investigate first.")
        log("  " + "=" * 66)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
