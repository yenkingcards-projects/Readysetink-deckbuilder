#!/usr/bin/env python3
"""
Run each cached card image through a local Ollama vision model and produce
a set-scoped art-tags file in the exact art-tags.json shape:

    { "cards": { "Name - Version": {"t": [...], "a": [...]} } }

Usage:
    python3 art-tools/tag_art.py --set "First Chapter"
    python3 art-tools/tag_art.py --set "First Chapter" --resume
    python3 art-tools/tag_art.py --set "First Chapter" --model gemma3:12b

Requires Ollama running locally (ollama serve) with a vision-capable model
pulled, e.g.:  ollama pull gemma3:12b
"""
import argparse, base64, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_ROOT = os.path.join(ROOT, "art-cache")
DB_PATH = os.path.join(ROOT, "card-db.json")

# Exact vocabulary from tagger.template.html -- keep this in sync if that file's
# TAGS list changes, or AI output will contain ids the tagger UI doesn't know.
VOCAB = {
 "Framing": ["closeup", "midshot", "fullbody", "poster"],
 "Hidden Mouseys": ["mousey"],
 "Facing": ["left", "right", "forward", "away"],
 "How many": ["solo", "two", "crowd"],
 "Pose": ["action", "standing", "sitting", "flying", "sleeping", "pointing", "waving", "inviting"],
 "Subject": ["animal", "bird"],
 "Props": ["holding", "weapon", "food", "instrument"],
 "Setting": ["outdoors", "indoors", "water", "sky", "night", "snow"],
 "Look": ["bw", "sketch", "glowing"],
 "Lore & flavor": ["storylore", "flavorsrc", "flavorlorc", "flavorsong"],
}
ALL_T_IDS = sorted({t for group in VOCAB.values() for t in group})

PROMPT = """You are tagging a Disney Lorcana trading card image for a search engine.
People search by describing what they remember seeing -- "blue dog", "necklace",
"holding a sword", "2 characters" -- and need to find the card from that
description alone. Your job is to generate every word someone might type that
would make THIS card come up.

The image is the FULL card (illustration plus frame, cost circle, stats,
name, text box, flavor text, collector number). You must IGNORE almost all of
that frame -- never describe or count the ink cost number, the attack/lore
numbers, the collector number, set symbols, or any printed game text. Those
are not art. The ONLY exception is one small icon described below.

Return STRICT JSON, nothing else, in this exact shape:
{"t": ["id1","id2"], "a": ["word1","word2too", "..."]}

--- "t": fixed vocabulary ---
Pick every applicable id from this list (use the id, not the label). Skip a
group entirely if nothing fits:
""" + json.dumps(VOCAB, indent=1) + """

Special instructions for the "Lore & flavor" group: look at the italicized
quote near the bottom of the card (the flavor text). If that area is BLANK
(no quote at all), skip this whole group. If there IS a quote, look for a
small icon directly beside or above it -- it will be one of exactly three
shapes:
  - a shape like a sideways musical note / treble clef  -> tag "flavorsong"
  - two small diamond/rhombus outlines side by side       -> tag "flavorlorc"
  - a small book or shield-like icon                       -> tag "flavorsrc"
Only tag the ONE shape actually shown. If you genuinely cannot make out the
icon, skip the group rather than guessing.

--- "a": free-text search words ---
60 to 80 SHORT words or phrases (1-3 words each, never a full sentence) --
be thorough, not brief; a short list here is a worse list, so keep going
until you've genuinely covered every category below rather than stopping
once something plausible exists. Do NOT waste entries repeating the
character's own name or card title -- that's already searchable elsewhere.
NEVER include any number, digit, dimension, or anything from the card frame
(cost, stats, collector number) as a tag -- only things visible in the
illustration itself.

Be STRICTLY ACCURATE to what this specific character's BODY actually is made
of -- this matters more than almost anything else here. A bird (HeiHei, Iago,
Zazu, ...) has FEATHERS, a crest, and a beak, never "hair" or "skin". An
animal with fur (a wolf, a deer, Pua) has FUR or a coat, never "hair" or
"skin". Something scaled or shelled (a fish, Tamatoa, a dragon) has SCALES or
a shell. Reserve "hair" and "skin" for human or human-like characters only.
If you catch yourself about to write "hair" or "skin", stop and check what
kind of creature this is first.

FIRST, count and name every character/creature depicted in the illustration
itself (the main character AND anyone else visible, background included):
  - add exactly one count phrase, spelled as a WORD not a digit: "one
    character", "two characters", "three characters", "four characters", or
    "five or more characters" depending on how many distinct
    characters/creatures you can see in the art
  - add the name of every OTHER recognizable Disney character visible besides
    the card's own main subject (only if you're genuinely confident who it
    is -- do not guess at unfamiliar background figures)

THEN cover a wide spread across these categories, several words each, keeping
every entry SHORT:
  - colors (be exact: "sage green", "gold", "teal", not just "green")
  - clothing, worn one item at a time ("long sleeve top", "cape", "boots"), not
    just "outfit"
  - accessories and objects, both what they're called AND what they look like
    ("necklace", "gold necklace", "chunky necklace", "medallion")
  - anything held or being interacted with ("trident", "sword", "frying pan")
  - hair color and style ("blonde braid", "red hair")
  - specific actions/verbs beyond the fixed pose vocabulary ("presenting",
    "offering", "reaching", "laughing")
  - facial expression / emotion ("joyful", "smirking", "worried", "determined")
  - setting and environment specifics ("underwater", "throne room", "campfire",
    "lanterns", "confetti", "snowy mountains", "night sky")
  - mood/atmosphere of the whole piece ("celebratory", "ominous", "peaceful")
  - notable art/style cues if unusual ("sketch lines", "glowing aura", "sepia tone")

Every word should be something a fan might actually type. Prefer many specific
SHORT entries over few generic ones -- "gold necklace" AND "necklace" is better
than just "jewelry", but "gold necklace with a small ruby pendant hanging from
it" is too long -- cut it to "gold necklace", "ruby pendant". Lowercase, no
heavy punctuation, no full sentences, no numbers of any kind.

Output only the JSON object -- no commentary, no markdown fences.
"""

IMPROVE_PROMPT_SUFFIX = """

IMPORTANT: this card already has these tags from a previous pass:
t: {existing_t}
a: {existing_a}

Do NOT repeat any of those. Look again, more carefully, and find NEW things
that were missed -- different details, secondary characters not yet named,
the flavor-text icon if it wasn't caught before, anything overlooked. Return
ONLY the new additions in the same {{"t": [...], "a": [...]}} shape -- an
empty list for either field is fine if you truly find nothing new.
"""


def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def resolve_set_name(spec):
    """Match download_set_images.py's resolution so both scripts land on the
    same art-cache/<slug>/ folder -- "First Chapter" must resolve to the same
    slug as "The First Chapter", the official name used for the folder."""
    try:
        with open(DB_PATH) as f:
            db = json.load(f)
    except FileNotFoundError:
        return spec
    sets = db.get('sets', {})
    if spec in sets:
        return sets[spec]['name']
    for meta in sets.values():
        if meta['name'].lower() == spec.lower():
            return meta['name']
    for meta in sets.values():
        if spec.lower() in meta['name'].lower():
            return meta['name']
    return spec


def check_ollama(host, model):
    """Silent, instant failures are exactly how this pipeline used to look
    like it "did nothing": if Ollama isn't running, or running without this
    model pulled, every single call_ollama() below fails in a few
    milliseconds, the per-card except-and-continue swallows every one of
    them, and the run finishes in under a second looking successful. Fail
    loud, up front, before touching a single card, instead."""
    try:
        req = urllib.request.Request(host.rstrip('/') + '/api/tags')
        with urllib.request.urlopen(req, timeout=5) as resp:
            tags = json.loads(resp.read())
    except Exception as e:
        print(f"Can't reach Ollama at {host}: {e}\n"
              f"Open the Ollama app (or run `ollama serve`) and try again.", file=sys.stderr)
        sys.exit(1)
    names = {m.get('name') or m.get('model') for m in tags.get('models', [])}
    if model not in names:
        print(f"Model '{model}' isn't pulled in Ollama (have: {', '.join(sorted(names)) or 'nothing'}).\n"
              f"Run `ollama pull {model}` first.", file=sys.stderr)
        sys.exit(1)


def call_ollama(host, model, image_path, prompt=PROMPT, timeout=300):
    with open(image_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
    payload = json.dumps({
        "model": model,
        "prompt": prompt,
        "images": [b64],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.2, "num_predict": 6144, "repeat_penalty": 1.4, "repeat_last_n": 256},
    }).encode('utf-8')
    req = urllib.request.Request(host.rstrip('/') + '/api/generate', data=payload,
                                  headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        out = json.loads(resp.read())
    return out.get('response', '')


def salvage_partial(raw):
    """The model occasionally runs out of its token budget mid-response and
    cuts off inside a string or before closing the JSON. Rather than losing
    the whole card, pull out every COMPLETE quoted string that appeared
    before the cutoff -- a dangling unterminated string at the very end is
    simply dropped, everything before it is kept."""
    def extract_array(field):
        m = re.search(r'"' + field + r'"\s*:\s*\[(.*?)(?:\]|$)', raw, re.DOTALL)
        if not m:
            return []
        body = m.group(1)
        return re.findall(r'"((?:[^"\\]|\\.)*)"', body)
    return extract_array("t"), extract_array("a")


def parse_model_json(raw):
    raw = raw.strip()
    raw = re.sub(r'^```(json)?', '', raw).strip()
    raw = re.sub(r'```$', '', raw).strip()
    partial = False
    try:
        data = json.loads(raw)
        t_raw, a_raw = data.get('t', []), data.get('a', [])
    except json.JSONDecodeError:
        t_raw, a_raw = salvage_partial(raw)
        partial = True
        if not t_raw and not a_raw:
            raise
    t = list(dict.fromkeys(x for x in t_raw if x in ALL_T_IDS))
    a_clean = list(dict.fromkeys(str(x).strip().lower() for x in a_raw if str(x).strip()))
    # Some models occasionally leak their own reasoning into an array entry
    # instead of stopping ("i need to be careful not to..."). A real search
    # tag is always a short word or phrase -- anything that reads like a
    # sentence (more than 5 words, or contains first-person reasoning
    # language) is junk, not a tag, so drop it outright.
    JUNK_MARKERS = ("i need", "i am", "i should", "i will", "the user",
                    "instructions", "card name", "card title", "as an ai")
    def is_real_tag(word):
        if len(word.split()) > 5:
            return False
        if any(m in word for m in JUNK_MARKERS):
            return False
        if any(ch.isdigit() for ch in word):
            # Numbers are almost always frame slop (cost, stats, collector
            # number) or a repetition-loop artifact ("scimitar1", "scimitar2",
            # ...) -- a real art description essentially never needs a digit,
            # and the character-count tags below are written as words
            # ("2 characters"), not digits.
            return False
        return True
    a_clean = [w for w in a_clean if is_real_tag(w)]
    # Safety net against repetition loops: however many the model produced,
    # never keep more than 100 -- comfortably above the 60-80 the prompt asks
    # for, so a genuinely thorough tagging pass isn't clipped, while a loop
    # that got past dedup (near-duplicate phrasing) still can't balloon the
    # file without limit.
    a = a_clean[:100]
    return {"t": t, "a": a, "_partial": partial}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', required=True)
    ap.add_argument('--model', default='gemma3:12b')
    ap.add_argument('--host', default='http://localhost:11434')
    ap.add_argument('--restart', action='store_true',
                     help='Ignore any existing progress for this set and start over from scratch')
    ap.add_argument('--improve', action='store_true',
                     help='Instead of skipping already-tagged cards, re-look at them and ADD any '
                          'new tags found (existing tags are shown to the model and kept, never lost)')
    args = ap.parse_args()

    check_ollama(args.host, args.model)

    slug = slugify(resolve_set_name(args.set))
    in_dir = os.path.join(CACHE_ROOT, slug)
    manifest_path = os.path.join(in_dir, 'manifest.json')
    if not os.path.exists(manifest_path):
        print(f"No manifest at {manifest_path}. Run "
              f"download_set_images.py --set \"{args.set}\" first.", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path) as f:
        manifest = json.load(f)  # filename -> card key

    out_dir = os.path.join(ROOT, "art-tools", "set-outputs")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{slug}-art-tags.json")
    result = {"cards": {}}
    if os.path.exists(out_path) and not args.restart:
        with open(out_path) as f:
            result = json.load(f)
        if result['cards']:
            print(f"Resuming: {len(result['cards'])} cards already tagged in {os.path.basename(out_path)}, "
                  f"skipping those.")

    if args.improve:
        todo = list(manifest.items())  # every card, not just untagged ones
        print(f"Improving {len(todo)}/{len(manifest)} cards with {args.model} via {args.host} "
              f"(existing tags are kept, only new ones are added)")
    else:
        todo = [(fn, key) for fn, key in manifest.items() if key not in result['cards']]
        print(f"Tagging {len(todo)}/{len(manifest)} cards with {args.model} via {args.host}")

    fail_count = 0
    added_total = 0
    for i, (fname, key) in enumerate(todo, 1):
        path = os.path.join(in_dir, fname)
        existing = result['cards'].get(key, {"t": [], "a": []}) if args.improve else None
        try:
            if args.improve and existing['a']:
                prompt = PROMPT + IMPROVE_PROMPT_SUFFIX.format(
                    existing_t=json.dumps(existing['t']), existing_a=json.dumps(existing['a']))
                raw = call_ollama(args.host, args.model, path, prompt=prompt)
                new_tags = parse_model_json(raw)
                new_tags.pop('_partial', None)
                tags = {
                    "t": list(dict.fromkeys(existing['t'] + new_tags['t']))[:len(ALL_T_IDS)],
                    "a": list(dict.fromkeys(existing['a'] + new_tags['a']))[:100],
                }
                added = len(tags['a']) - len(existing['a'])
            else:
                raw = call_ollama(args.host, args.model, path)
                tags = parse_model_json(raw)
                partial = tags.pop('_partial', False)
                added = None
        except Exception as e:
            print(f"  [{i}/{len(todo)}] FAILED {key}: {e}", file=sys.stderr)
            fail_count += 1
            continue

        result['cards'][key] = tags
        preview = ', '.join(tags['a'][:4])
        if args.improve:
            added_total += added
            note = f"  (+{added} new)"
        elif partial:
            note = "  (partial -- response got cut off, kept what completed)"
        else:
            note = ""
        print(f"  [{i}/{len(todo)}] {key}: t={tags['t']} a=[{preview}...]{note}")

        if i % 5 == 0:
            with open(out_path, 'w') as f:
                json.dump(result, f, indent=1, ensure_ascii=False)

    with open(out_path, 'w') as f:
        json.dump(result, f, indent=1, ensure_ascii=False)

    print(f"\nWrote {len(result['cards'])} cards to {out_path}")
    if args.improve:
        print(f"+{added_total} new tags across {len(todo)} cards, {fail_count} failed")
    elif fail_count:
        print(f"{fail_count}/{len(todo)} cards failed")
    print(f"Next: python3 art-tools/merge_art_tags.py --input {os.path.basename(out_path)}")

    # A card here and there timing out or returning bad JSON is normal model
    # noise -- tolerated above, on purpose. But if EVERY card in a non-empty
    # batch failed, that's not noise, that's the run having done nothing, and
    # it needs to come back as a real failure (exit 1) so run_everything*.py's
    # subprocess check actually notices, instead of logging "DONE" for a set
    # that got zero new tags.
    if todo and fail_count == len(todo):
        print("Every card in this run failed -- nothing was tagged.", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
