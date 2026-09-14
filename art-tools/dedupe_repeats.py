#!/usr/bin/env python3
"""
Catch two model glitches that clean_slop.py's per-tag filter can't see,
because both are syntactically fine strings -- the problem is only visible
across the whole tag list.

Repairs, in every card's "a" list:
  - a word stuttered inside one tag ("beard beard face" -> "beard face",
    "scavenger scavenger" -> "scavenger") -- the model repeating itself
    mid-generation
  - a repetition-loop where the model enumerates the same phrase over every
    position/side of an object ("gold bands on chest", "... on lid", "... on
    side", "... on front", "... on bottom", "... on back", "... on top") --
    four or more "<phrase> on <word>" variants sharing a phrase collapse to
    just "<phrase>" (kept, or added back if the loop replaced it), since the
    positional detail adds no real search value and the loop itself is the
    tell that this was never eight real observations

A timestamped backup of art-tags.json is written before anything is changed,
so this is always safe to undo. Never mass-regenerates the file -- only
touches cards where one of these two patterns actually fires.

Usage:
    python3 art-tools/dedupe_repeats.py             (clean and save)
    python3 art-tools/dedupe_repeats.py --dry-run   (just report what would change)
"""
import argparse, json, os, re, shutil, sys, time
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = os.path.join(ROOT, "art-tags.json")


def fix_stutter(tag):
    words = tag.split()
    out = []
    for w in words:
        if out and out[-1].lower() == w.lower():
            continue
        out.append(w)
    return " ".join(out)


def collapse_enumeration_loops(tags):
    groups = defaultdict(list)
    for t in tags:
        m = re.match(r"^(.*) on (\w+)$", t.lower())
        if m:
            groups[m.group(1)].append(t)
    loop_bases = {base for base, variants in groups.items() if len(variants) >= 4}
    if not loop_bases:
        return tags, []
    dropped = []
    out = []
    seen_base = set()
    for t in tags:
        m = re.match(r"^(.*) on (\w+)$", t.lower())
        base = m.group(1) if m else None
        if base in loop_bases:
            dropped.append(t)
            if base not in seen_base:
                out.append(base)
                seen_base.add(base)
            continue
        out.append(t)
    return list(dict.fromkeys(out)), dropped


def clean_card(entry):
    a = entry.get("a", [])
    stutter_fixes = []
    a_fixed = []
    for t in a:
        fixed = fix_stutter(str(t))
        if fixed != t:
            stutter_fixes.append((t, fixed))
        a_fixed.append(fixed)

    a_final, dropped = collapse_enumeration_loops(a_fixed)

    changed = (a_final != a)
    entry["a"] = a_final
    return changed, stutter_fixes, dropped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with open(MASTER, encoding="utf-8") as f:
        master = json.load(f)

    cards = master.get("cards", {})
    cards_changed = 0
    total_stutters = 0
    total_loop_tags_dropped = 0

    for key, entry in cards.items():
        changed, stutter_fixes, dropped = clean_card(entry)
        if changed:
            cards_changed += 1
            for before, after in stutter_fixes:
                total_stutters += 1
                print(f'  {key}: stutter "{before}" -> "{after}"')
            if dropped:
                total_loop_tags_dropped += len(dropped)
                print(f"  {key}: collapsed {len(dropped)} repetition-loop tag(s): {dropped}")

    print(f"\n{cards_changed} card(s) changed, {total_stutters} stutter(s) fixed, "
          f"{total_loop_tags_dropped} repetition-loop tag(s) collapsed.")

    if args.dry_run:
        print("Dry run -- art-tags.json NOT written.")
        return

    if cards_changed == 0:
        print("Nothing to clean.")
        return

    backup_path = os.path.join(ROOT, f"art-tags.backup-{time.strftime('%Y%m%d-%H%M%S')}.json")
    shutil.copy(MASTER, backup_path)
    print(f"Backup saved to {backup_path}")

    with open(MASTER, "w", encoding="utf-8") as f:
        json.dump(master, f, indent=1, ensure_ascii=False)
    print(f"Saved cleaned file to {MASTER}")


if __name__ == "__main__":
    main()
