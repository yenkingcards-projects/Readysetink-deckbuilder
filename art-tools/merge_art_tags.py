#!/usr/bin/env python3
"""
Merge a set-scoped AI-generated art-tags file into the hand-authored master
art-tags.json -- APPEND ONLY. Never overwrites an existing entry (manual tags
always win), and validates every card name against card-db.json so a typo'd
name doesn't silently vanish (see BUILD-REPORT.md's integrity check).

Usage:
    python3 art-tools/merge_art_tags.py --input first-chapter-art-tags.json
    python3 art-tools/merge_art_tags.py --input first-chapter-art-tags.json --dry-run
    python3 art-tools/merge_art_tags.py --input first-chapter-art-tags.json --overwrite-ai
        (re-run tagging on a set and want to replace last time's AI output --
         only touches entries this tool itself wrote, never hand-tagged ones)
"""
import argparse, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = os.path.join(ROOT, "art-tags.json")
DB = os.path.join(ROOT, "card-db.json")
AI_MARKER = os.path.join(ROOT, "art-tools", ".ai-merged-keys.json")


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--overwrite-ai', action='store_true')
    args = ap.parse_args()

    if os.path.isabs(args.input):
        in_path = args.input
    else:
        # New location first (art-tools/set-outputs/), then repo root for
        # anything from before that reorg -- so old commands/muscle memory
        # still work.
        candidate = os.path.join(ROOT, "art-tools", "set-outputs", args.input)
        in_path = candidate if os.path.exists(candidate) else os.path.join(ROOT, args.input)
    with open(in_path) as f:
        incoming = json.load(f)
    with open(MASTER) as f:
        master = json.load(f)
    with open(DB) as f:
        db = json.load(f)

    valid = valid_names(db)
    ai_keys = set()
    if os.path.exists(AI_MARKER):
        with open(AI_MARKER) as f:
            ai_keys = set(json.load(f))

    added, skipped_existing, skipped_unknown, overwritten = [], [], [], []

    for key, tags in incoming.get('cards', {}).items():
        if key not in valid:
            skipped_unknown.append(key)
            continue
        if key in master['cards']:
            if args.overwrite_ai and key in ai_keys:
                master['cards'][key] = tags
                overwritten.append(key)
            else:
                skipped_existing.append(key)
            continue
        master['cards'][key] = tags
        added.append(key)
        ai_keys.add(key)

    print(f"Added:              {len(added)}")
    print(f"Overwritten (AI):   {len(overwritten)}")
    print(f"Skipped (existing): {len(skipped_existing)}  (hand-tagged or already merged -- never touched)")
    print(f"Skipped (unknown):  {len(skipped_unknown)}")
    if skipped_unknown:
        print("  Unknown names (check spelling against card-db.json):")
        for k in skipped_unknown[:15]:
            print(f"    - {k}")

    if args.dry_run:
        print("\nDry run -- nothing written.")
        return

    with open(MASTER, 'w') as f:
        json.dump(master, f, indent=1, ensure_ascii=False)
    os.makedirs(os.path.dirname(AI_MARKER), exist_ok=True)
    with open(AI_MARKER, 'w') as f:
        json.dump(sorted(ai_keys), f, indent=1)

    print(f"\nWrote {MASTER}")
    print("Now: python3 build_flounder.py   (rebuild the site)")
    print("Then: check BUILD-REPORT.md for any card name that stopped resolving.")


if __name__ == '__main__':
    main()
