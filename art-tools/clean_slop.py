#!/usr/bin/env python3
"""
Scrub slop out of the real, hand-authored art-tags.json IN PLACE -- for
every card, re-applies the same "is this actually a real tag" filter that
tag_art.py uses on brand-new output, so junk that got merged in before that
filter existed (or slipped past it) gets cleaned out of old entries too.

Removes, from every card's "a" list:
  - anything containing a digit (card-frame slop: cost, stats, collector
    number, dimensions -- or a repetition-loop artifact like "scimitar1",
    "scimitar2", ...)
  - anything that reads like the model's own leaked reasoning
    ("i need to...", "the user...", "as an ai", etc.)
  - anything longer than 5 words (a real tag is a short word/phrase, never
    a sentence)
  - exact duplicates (case-insensitive)
Also caps any card's "a" list at 60 entries (repetition-loop safety net)
and drops any "t" id that isn't in the current fixed vocabulary.

A timestamped backup of art-tags.json is written before anything is changed,
so this is always safe to undo.

Usage:
    python3 art-tools/clean_slop.py             (clean and save)
    python3 art-tools/clean_slop.py --dry-run   (just report what would change)
"""
import argparse, json, os, re, shutil, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = os.path.join(ROOT, "art-tags.json")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from tag_art import ALL_T_IDS  # keep in sync with the real vocabulary
except Exception:
    ALL_T_IDS = None  # if this ever fails, we just skip the "t" cleanup

JUNK_MARKERS = ("i need", "i am", "i should", "i will", "the user",
                "instructions", "card name", "card title", "as an ai")


def is_real_tag(word):
    if not word:
        return False
    if len(word.split()) > 5:
        return False
    if any(m in word for m in JUNK_MARKERS):
        return False
    if any(ch.isdigit() for ch in word):
        return False
    return True


def clean_card(entry):
    changed = False

    a = entry.get("a", [])
    a_norm = [str(w).strip().lower() for w in a if str(w).strip()]
    a_deduped = list(dict.fromkeys(a_norm))
    a_filtered = [w for w in a_deduped if is_real_tag(w)]
    a_capped = a_filtered[:60]

    # how many original entries didn't survive (dropped as slop/dupe/overcap)
    removed_count = len(a) - len(a_capped)

    if a_capped != a:
        changed = True
    entry["a"] = a_capped

    if ALL_T_IDS is not None:
        t = entry.get("t", [])
        t_clean = [x for x in t if x in ALL_T_IDS]
        t_clean = list(dict.fromkeys(t_clean))
        if t_clean != t:
            changed = True
        entry["t"] = t_clean

    return changed, max(removed_count, 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with open(MASTER, encoding="utf-8") as f:
        master = json.load(f)

    cards = master.get("cards", {})
    total_removed = 0
    cards_changed = 0

    for key, entry in cards.items():
        changed, removed_count = clean_card(entry)
        if changed:
            cards_changed += 1
            total_removed += removed_count
            if removed_count:
                print(f"  {key}: removed {removed_count} slop entr{'y' if removed_count == 1 else 'ies'}")

    print(f"\n{cards_changed} card(s) changed, {total_removed} slop tag(s) removed total.")

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
