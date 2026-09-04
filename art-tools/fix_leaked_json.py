#!/usr/bin/env python3
"""
Repair leaked-JSON slop inside "a" (attribute) tag lists.

tag_art.py's response parser sometimes fails to split the model's raw
JSON-ish output into separate tags, so a single array entry ends up holding
several tags mashed together with stray quotes/brackets/braces, e.g.:

    "curled black curls,\"wild curly tresses**,"
    "thick green neck\",\"belly area\""
    ": [ {"
    "{"

clean_slop.py's word-count/digit/marker filter doesn't catch these (most are
short and digit-free), so they've been sitting in art-tags.json. This script
finds them, extracts the real sub-tags, and either splits the entry into
clean tags or drops it if nothing salvageable remains.

Works on any art-tags-shaped file: {"cards": {"Name": {"t": [...], "a": [...]}, ...}}
(both the master art-tags.json and the per-set files in art-tools/set-outputs/).

Usage:
    python3 art-tools/fix_leaked_json.py art-tags.json
    python3 art-tools/fix_leaked_json.py art-tags.json --dry-run
    python3 art-tools/fix_leaked_json.py art-tools/set-outputs/archazia-s-island-art-tags.json
"""
import argparse, json, os, re, shutil, sys, time

# Straight + curly DOUBLE quotes, brackets, braces, backslash -- any of
# these showing up in a tag means the model's raw JSON-ish output leaked
# through instead of getting split into separate array entries. Single
# quotes/apostrophes are deliberately excluded -- they show up constantly as
# real contractions/possessives ("doesn't", "beast's") and splitting on them
# would shred legitimate tags.
LEAK_CHARS = '"“”{}[]\\'
SPLIT_RE = re.compile(r'["“”\[\]{}\\]+')
EDGE_STRIP = ' \t\n\r*`:.'


def looks_leaked(w):
    return any(c in w for c in LEAK_CHARS)


def clean_piece(p):
    p = p.strip(EDGE_STRIP)
    p = re.sub(r'\s+', ' ', p).strip()
    # Collapse immediate word-repetition-loop artifacts ("beard beard" ->
    # "beard", "vest vest" -> "vest") without touching legitimate repeats
    # like "bear bear portrait" -> leave alone if more than 2 words.
    words = p.split()
    if len(words) == 2 and words[0].lower() == words[1].lower():
        p = words[0]
    return p


def is_usable(p):
    if not p or len(p) < 3:
        return False
    if not re.search(r'[a-zA-Z]', p):
        return False
    if len(p.split()) > 6:
        return False
    return True


def split_leaked(w):
    """Return a list of clean tags extracted from one leaked/mangled entry."""
    # Tokenize on every quote/bracket/brace/backslash run, THEN split each
    # token on commas -- this survives odd/unbalanced quote counts (a
    # trailing tag after the last stray quote is not silently dropped).
    tokens = SPLIT_RE.split(w)
    pieces = []
    for tok in tokens:
        pieces.extend(tok.split(','))
    out = []
    for p in pieces:
        p = clean_piece(p)
        if is_usable(p) and p.lower() not in (x.lower() for x in out):
            out.append(p)
    return out


def fix_card(entry):
    a = entry.get('a', [])
    new_a = []
    changed = False
    for w in a:
        w = str(w)
        if looks_leaked(w):
            changed = True
            extracted = split_leaked(w)
            for p in extracted:
                if p.lower() not in (x.lower() for x in new_a):
                    new_a.append(p)
        elif len(w) < 3 or not re.search(r'[a-zA-Z]', w):
            # Punctuation-only junk that never matched a leak character
            # (e.g. a lone ",") -- not what this script targets, but cheap
            # to drop while we're already walking every tag.
            changed = True
        else:
            if w.lower() not in (x.lower() for x in new_a):
                new_a.append(w)
    if changed:
        entry['a'] = new_a
    return changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    with open(args.path, encoding='utf-8') as f:
        data = json.load(f)

    cards = data.get('cards', {})
    changed_count = 0
    examples = []
    for key, entry in cards.items():
        before = list(entry.get('a', []))
        if fix_card(entry):
            changed_count += 1
            if len(examples) < 25:
                examples.append((key, before, entry['a']))

    print(f'{changed_count} card(s) with leaked-JSON entries repaired.')
    for key, before, after in examples:
        print(f'\n  {key}')
        print(f'    before: {json.dumps(before, ensure_ascii=False)}')
        print(f'    after:  {json.dumps(after, ensure_ascii=False)}')

    if args.dry_run:
        print('\nDry run -- nothing written.')
        return

    if changed_count == 0:
        print('Nothing to fix.')
        return

    backup_path = f'{args.path}.leakfix-backup-{time.strftime("%Y%m%d-%H%M%S")}'
    shutil.copy(args.path, backup_path)
    print(f'\nBackup saved to {backup_path}')

    with open(args.path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    print(f'Saved repaired file to {args.path}')


if __name__ == '__main__':
    main()
