#!/usr/bin/env python3
"""
Scrub slop out of the real, hand-authored art-tags.json IN PLACE -- for
every card, re-applies the same "is this actually a real tag" filter that
tag_art.py uses on brand-new output, so junk that got merged in before that
filter existed (or slipped past it) gets cleaned out of old entries too.

Repairs, in every card's "a" list:
  - a tag the model glued together with underscores ("caribou_antlers")
    -- the underscores become spaces
  - a tag holding several tags behind pipes ("falling water|rocks") --
    split into separate tags
  - a tag with a stray non-ASCII byte and whatever letters got welded onto
    it ("monster teeth\u0192s", "red bow\u012b") -- the garbage is cut off
  - a harmless parenthetical aside ("pale skin tone (humanoid)") -- the
    aside is dropped, the tag kept
  - stray leading/trailing punctuation ("dynamic pose,", "-shaped gem")

Removes, from every card's "a" list:
  - anything containing a digit (card-frame slop: cost, stats, collector
    number, dimensions -- or a repetition-loop artifact like "scimitar1",
    "scimitar2", ...)
  - anything that reads like the model's own leaked reasoning
    ("i need to...", "the user...", "as an ai", etc.), including leaked
    fragments of its own prompt ("(fixed vocabulary) and")
  - anything with a question mark in it -- the model hedging a guess
    ("bearded man lookalike?") is not a tag anyone would ever search for
  - anything whose parenthetical takes the tag back ("bearded face look
    (not applicable)", "scent of adventure (implied)")
  - anything that is just a "t" id the card ALREADY carries in "t"
    ("midshot", "solo") -- it is already searchable, and in "a" it only
    duplicates. A "t" word the card does NOT carry is left alone: "bird" on
    Owl - Pirate Lookout is a real tag that happens to collide with a
    vocabulary id, and dropping it would lose the only way to find the card
  - anything left that is pure filler ("detail", "image", "and")
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
                "instructions", "card name", "card title", "as an ai",
                "vocabulary", "free-text", "free text", "keyword")

# a parenthetical saying one of these is the model retracting the tag it just
# wrote, so the whole tag goes -- unlike a plain aside, which is just trimmed
RETRACTIONS = ("no", "not", "n/a", "na", "none", "implied", "maybe", "unclear",
               "unsure", "unknown", "no count", "not applicable", "possibly")

# what's left after repair is sometimes a word carrying no picture at all
FILLER_ONLY = {"detail", "details", "piece", "pieces", "element", "elements",
               "image", "images", "card", "cards", "picture", "art", "artwork",
               "scene", "style", "look", "thing", "item", "object", "area",
               "texture", "pattern", "design", "effect", "feature", "features",
               "character", "figure", "shape", "color", "colour", "colors",
               "unknown", "none", "other", "others", "misc", "various",
               "and", "or", "the", "a", "an", "of", "in", "on", "with"}

SMART = {"\u2019": "'", "\u2018": "'", "\u201c": "", "\u201d": "",
         "\u2013": "-", "\u2014": "-", "\u2026": ""}


def repair_tag(word):
    """Undo the mechanical damage the tagger does to an otherwise fine tag.

    Returns a list, because one damaged string can hold several real tags.
    Returns [] when the damage means there was never a tag there.
    """
    for bad, good in SMART.items():
        word = word.replace(bad, good)
    # a stray non-ASCII byte means the model lost the plot mid-tag: keep what
    # came before it (plus any letters welded on after it) and drop the rest,
    # rather than splicing the two sides into one Frankenstein tag
    word = re.split(r"[^\x00-\x7f]+[A-Za-z]*", word)[0]
    word = word.replace("_", " ").replace("*", " ")

    out = []
    for part in word.split("|"):
        # "(not applicable)" retracts the tag; "(humanoid)" is just an aside
        retracted = False
        for aside in re.findall(r"\(([^)]*)\)", part):
            if aside.strip().lower().strip(".!?") in RETRACTIONS:
                retracted = True
        if retracted:
            continue
        part = re.sub(r"\([^)]*\)", " ", part)
        part = re.sub(r"[()]", " ", part)
        part = re.sub(r"\s+", " ", part).strip(" \t,;:.$/\\-")
        part = re.sub(r"\s+", " ", part).strip()
        if part:
            out.append(part)
    return out


def is_real_tag(word, already_tagged=()):
    if not word:
        return False
    if "?" in word:
        return False
    if not any(ch.isalpha() for ch in word):
        return False
    if word in FILLER_ONLY:
        return False
    if word in already_tagged:
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
    a_norm = []
    for w in a:
        for part in repair_tag(str(w).strip().lower()):
            a_norm.append(part)
    a_deduped = list(dict.fromkeys(a_norm))
    already = {str(x).strip().lower() for x in entry.get("t", [])}
    a_filtered = [w for w in a_deduped if is_real_tag(w, already)]
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
