#!/usr/bin/env python3
"""
Merge a set-scoped hidden-mickeys file (from find_hidden_mickeys.py) into the
hand-authored master art-tags.json.

This is deliberately a SEPARATE script from merge_art_tags.py: that script
skips a card entirely if it already has an entry in art-tags.json (manual
tags always win, whole-entry). Hidden Mickey data needs the opposite
behavior -- it needs to ADD the "mousey" tag and APPEND to the "m" marker
list on cards that likely already have an entry (from tag_art.py or hand
tagging), without disturbing anything else already there.

Never removes or overwrites an existing "m" entry -- only appends new ones,
and never adds a duplicate-looking marker (same x/y within ~2%) twice.

Usage:
    python3 art-tools/merge_hidden_mickeys.py --input the-first-chapter-hidden-mickeys.json
    python3 art-tools/merge_hidden_mickeys.py --input the-first-chapter-hidden-mickeys.json --dry-run
    python3 art-tools/merge_hidden_mickeys.py --input the-first-chapter-hidden-mickeys.json --min-confidence 0.5
"""
import argparse, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = os.path.join(ROOT, "art-tags.json")
DB = os.path.join(ROOT, "card-db.json")

ALT_ART_RARITIES = {"Enchanted", "Special", "Epic", "Iconic"}


def valid_names(db):
    names = set()
    for c in db['cards']:
        base = f"{c['n']} - {c['v']}" if c.get('v') else c['n']
        names.add(base)
        seen = set()
        for p in (c.get('pr') or []):
            r = p.get('r')
            if r in ALT_ART_RARITIES and r not in seen:
                seen.add(r)
                names.add(f"{base} ({r})")
    return names


def close_enough(a, b, tol=2.0):
    return abs(a.get("x", -999) - b.get("x", -999)) < tol and abs(a.get("y", -999) - b.get("y", -999)) < tol


def extract_matches(rec):
    """Support both the current {"matches": [...]} shape and the older
    single-object {"found": true, "x":, "y":, "r":} shape from before
    multi-match support, so old set-output files still merge fine."""
    if "matches" in rec:
        return rec.get("matches") or []
    if rec.get("found"):
        return [{"x": rec.get("x"), "y": rec.get("y"), "r": rec.get("r", 6.0),
                  "confidence": rec.get("confidence", 1.0)}]
    return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--min-confidence", type=float, default=0.0,
                     help="Skip matches below this confidence (0.0-1.0). Default 0.0 = keep everything "
                          "find_hidden_mickeys.py already decided was worth reporting.")
    args = ap.parse_args()

    if os.path.isabs(args.input):
        in_path = args.input
    else:
        candidate = os.path.join(ROOT, "art-tools", "set-outputs", args.input)
        in_path = candidate if os.path.exists(candidate) else os.path.join(ROOT, args.input)

    with open(in_path, encoding="utf-8") as f:
        incoming = json.load(f)
    with open(MASTER, encoding="utf-8") as f:
        master = json.load(f)
    with open(DB, encoding="utf-8") as f:
        db = json.load(f)

    names = valid_names(db)

    added_tag = 0
    added_marker = 0
    new_entries = 0
    skipped_no_find = 0
    skipped_unknown = 0
    skipped_dupe_marker = 0
    skipped_low_confidence = 0

    cards = master.setdefault("cards", {})

    for key, rec in incoming.get("cards", {}).items():
        matches = extract_matches(rec)
        matches = [m for m in matches if m.get("x") is not None and m.get("y") is not None]
        if not matches:
            skipped_no_find += 1
            continue
        if key not in names:
            print(f"  [unknown card name, skipped] {key}")
            skipped_unknown += 1
            continue

        if key not in cards:
            cards[key] = {"t": [], "a": [], "m": []}
        entry = cards[key]
        entry.setdefault("t", [])
        entry.setdefault("a", [])
        entry.setdefault("m", [])
        is_new = not entry["a"] and not entry["m"] and not entry["t"]

        card_got_something = False
        for m in matches:
            if m.get("confidence", 1.0) < args.min_confidence:
                skipped_low_confidence += 1
                continue
            marker = {"x": m["x"], "y": m["y"], "r": m.get("r", 6.0)}
            if any(close_enough(marker, existing) for existing in entry["m"]):
                skipped_dupe_marker += 1
                continue
            entry["m"].append(marker)
            added_marker += 1
            card_got_something = True

        if card_got_something:
            if "mousey" not in entry["t"]:
                entry["t"].append("mousey")
                added_tag += 1
            if is_new:
                new_entries += 1
        elif is_new and not entry["a"] and not entry["m"] and not entry["t"]:
            # created the shell above but nothing survived confidence
            # filtering -- remove it so we don't leave an empty stub entry
            del cards[key]

    print(f"New card entries created: {new_entries}")
    print(f"'mousey' tags added:       {added_tag}")
    print(f"'m' markers added:         {added_marker}")
    print(f"Skipped (nothing found):   {skipped_no_find}")
    print(f"Skipped (unknown name):    {skipped_unknown}")
    print(f"Skipped (dupe marker):     {skipped_dupe_marker}")
    print(f"Skipped (low confidence):  {skipped_low_confidence}")

    if args.dry_run:
        print("Dry run -- art-tags.json NOT written.")
        return

    with open(MASTER, "w", encoding="utf-8") as f:
        json.dump(master, f, indent=1, ensure_ascii=False)
    print(f"Saved to {MASTER}")


if __name__ == "__main__":
    main()
