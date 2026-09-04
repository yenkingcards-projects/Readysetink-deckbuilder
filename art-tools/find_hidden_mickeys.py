#!/usr/bin/env python3
"""
Look at ONLY the art portion of each card (crops off the name plate, text
box, flavor text, and bottom credits -- keeps full width) and ask a local
Ollama vision model whether a "hidden Mickey" is present: the classic
three-overlapping-circles Mickey Mouse silhouette, often hidden subtly in
background shapes, patterns, shadows, jewelry, clouds, rocks, etc.

2026-09-03: dropped the multi-image few-shot approach (sending the 4
reference examples from art-tools/mickey-examples/ alongside every target).
Testing against cards with confirmed, documented hidden Mickeys showed it
made things WORSE, not better -- the model stopped looking at the actual
target image and just echoed "found" based on the examples (confirmed: it
reported a match with 95% confidence on a blank gray test image). Single
target image, zero-shot, is what actually engages with the real art.

Even zero-shot, a single pass on a genuinely subtle, camouflaged pattern is
unreliable -- same card, resampled, gives different answers. So this asks
the model SAMPLES independent times per card (--samples, default 3) and
keeps the union of distinct matches, instead of trusting any one answer.
That trades more local compute (still free, still slow, still meant to run
overnight) for better recall, which matches this tool's existing design
philosophy: a wrong guess costs Ben a second to dismiss, a real one skipped
because a single pass missed it never gets looked at again.

This is a SEPARATE tool from tag_art.py on purpose -- it's a narrow, focused
single-question pass instead of the general 40-50-tag pass, and it needs its
own coordinate math (art-crop pixel space -> full-card percentage space) to
match the existing "m" marker field used by tagger.template.html / build_flounder.py.

Usage:
    python3 art-tools/find_hidden_mickeys.py --set "First Chapter"
    python3 art-tools/find_hidden_mickeys.py --set "First Chapter" --model gemma4:12b --samples 5
    python3 art-tools/find_hidden_mickeys.py --set "First Chapter" --restart

Requires Ollama running locally (ollama serve) with a vision-capable model
pulled (Ben: use --model "gemma4:12b").

Output:
    art-tools/set-outputs/<slug>-hidden-mickeys.json
    shape: {"cards": {"Name - Version": {"matches": [{"x":41.2,"y":18.7,"r":6.0,"confidence":0.7,"note":"..."}]}}}
    (a card with none found is stored as {"matches": []} so it's not
    re-checked every run; use --restart to force a full re-check)

Then run merge_hidden_mickeys.py to fold results into the real art-tags.json.
"""
import argparse, base64, json, os, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_ROOT = os.path.join(ROOT, "art-cache")
DB_PATH = os.path.join(ROOT, "card-db.json")

# Fraction of the FULL card image height that the illustration occupies,
# measured from the top. The name plate / ability text / flavor text /
# credits strip below this point are cropped away so the model never looks
# at them. A little generous on purpose so we never accidentally cut off
# art near the bottom of the illustration.
ART_HEIGHT_RATIO = 0.75

# How much to upscale the cropped art before sending it to the model --
# hidden Mickeys are often small and low-contrast, and local vision models
# tend to downsample images internally, so giving them a bigger source
# image helps preserve the fine detail.
UPSCALE_FACTOR = 1.6

# Confidence below this is treated as "not confident enough to report" --
# kept deliberately low. Missing real hidden Mickeys (false negatives) has
# been the actual problem, not too many false positives -- Ben can look at
# and reject a wrong guess in a second, but a skipped real one never gets
# looked at again.
CONFIDENCE_THRESHOLD = 0.3
MAX_MATCHES_PER_CARD = 3
DEFAULT_SAMPLES = 3
# Two matches (from different samples, or within one) count as "the same
# spot" if they're within this many percentage points on both axes.
DEDUPE_TOLERANCE = 8.0

PROMPT = """This is the illustration portion of a Disney Lorcana card (the name
plate, text box, and credits have already been cropped away).

Disney artists sometimes hide a "hidden Mickey" in the art: the classic
three-circle Mickey Mouse silhouette (one larger head circle + two smaller,
roughly equal-sized ear circles touching its top) camouflaged into ordinary
background shapes -- rocks, foliage, jewelry, fabric folds, animal spots,
shadows, clouds, wood grain, patterns. It is usually subtle and low
contrast, blended in on purpose. Most cards do NOT have one.

Look at the whole image and identify the region most likely to contain
one, if any. It is fine to report a moderate-confidence guess -- a human
reviews every result, so a wrong guess costs a second to dismiss, but a
missed real one is never looked at again. Report at most {max_matches}
candidates, only the ones you find most plausible.

Return STRICT JSON only:
{{"matches": [{{"x": 41.2, "y": 18.7, "r": 6.0, "confidence": 0.6, "note": "what shapes and where"}}]}}
or {{"matches": []}} if nothing looks plausible.
x/y are the center of the shape as a PERCENTAGE (0-100) of this image's
width/height, r is the approximate radius as a percentage of the image's
width, confidence is your own 0.0-1.0 estimate."""


def build_opener():
    try:
        import certifi
        import ssl
        ctx = ssl.create_default_context(cafile=certifi.where())
        return urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx))
    except Exception:
        return urllib.request.build_opener()


OPENER = build_opener()


def slugify(name):
    s = name.lower().strip()
    out = []
    for ch in s:
        if ch.isalnum():
            out.append(ch)
        elif ch in (" ", "-", "_"):
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def resolve_set_name(user_input, db):
    sets = db.get("sets", {})
    if user_input in sets:
        return user_input
    low = user_input.lower().strip()
    for name in sets:
        if name.lower() == low:
            return name
    for name in sets:
        if low in name.lower():
            return name
    return user_input


def crop_art(image_path, out_path, ratio=ART_HEIGHT_RATIO, upscale=UPSCALE_FACTOR):
    from PIL import Image
    im = Image.open(image_path).convert("RGB")
    w, h = im.size
    crop_h = int(h * ratio)
    art = im.crop((0, 0, w, crop_h))
    if upscale and upscale != 1.0:
        art = art.resize((int(art.width * upscale), int(art.height * upscale)), Image.LANCZOS)
    art.save(out_path, "PNG")
    return w, h, crop_h


def call_ollama(host, model, image_path, timeout=240):
    with open(image_path, "rb") as f:
        target_b64 = base64.b64encode(f.read()).decode("ascii")

    prompt = PROMPT.format(max_matches=MAX_MATCHES_PER_CARD)

    payload = {
        "model": model,
        "prompt": prompt,
        "images": [target_b64],
        "format": "json",
        "stream": False,
        # Temperature well above 0 is deliberate: each of the --samples
        # calls should explore a somewhat different read of the image, not
        # repeat the same (possibly wrong) answer deterministically.
        "options": {"temperature": 0.5, "num_predict": 300},
    }
    req = urllib.request.Request(
        f"{host}/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with OPENER.open(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data.get("response", "")


def parse_result(raw):
    try:
        obj = json.loads(raw)
    except Exception:
        return []

    raw_matches = obj.get("matches")
    if raw_matches is None:
        # tolerate the old single-object shape if the model reverts to it
        if obj.get("found"):
            raw_matches = [obj]
        else:
            return []

    out = []
    for m in raw_matches[:MAX_MATCHES_PER_CARD]:
        try:
            x = float(m.get("x"))
            y = float(m.get("y"))
            r = float(m.get("r", 6.0))
            conf = float(m.get("confidence", 0.5))
        except (TypeError, ValueError):
            continue
        if conf < CONFIDENCE_THRESHOLD:
            continue
        x = max(0.0, min(100.0, x))
        y = max(0.0, min(100.0, y))
        r = max(1.0, min(25.0, r))
        conf = max(0.0, min(1.0, conf))
        note = str(m.get("note", ""))[:120]
        out.append({"x": round(x, 1), "y": round(y, 1), "r": round(r, 1),
                    "confidence": round(conf, 2), "note": note})
    return out


def _same_spot(a, b, tol=DEDUPE_TOLERANCE):
    return abs(a["x"] - b["x"]) < tol and abs(a["y"] - b["y"]) < tol


def detect_matches(host, model, image_path, samples=DEFAULT_SAMPLES):
    """Call the model `samples` independent times on the same image and
    return the union of distinct matches (highest-confidence duplicate
    wins), instead of trusting any single pass. A single zero-shot answer
    on this task is unreliable enough (verified against cards with known,
    documented hidden Mickeys) that resampling and keeping candidates is
    more useful than a single confident-sounding guess."""
    all_matches = []
    for _ in range(samples):
        try:
            raw = call_ollama(host, model, image_path)
        except Exception:
            continue
        all_matches.extend(parse_result(raw))

    merged = []
    for m in all_matches:
        dupe = next((existing for existing in merged if _same_spot(m, existing)), None)
        if dupe is None:
            merged.append(dict(m))
        elif m["confidence"] > dupe["confidence"]:
            dupe.update(m)
    merged.sort(key=lambda m: -m["confidence"])
    return merged[:MAX_MATCHES_PER_CARD]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", required=True)
    ap.add_argument("--model", default="gemma4:12b")
    ap.add_argument("--host", default="http://localhost:11434")
    ap.add_argument("--restart", action="store_true", help="Re-check every card, even ones already checked")
    ap.add_argument("--samples", type=int, default=DEFAULT_SAMPLES,
                     help=f"Independent model passes per card, union of results kept (default {DEFAULT_SAMPLES}). "
                          "A single pass on this task is unreliable -- see module docstring.")
    ap.add_argument("--art-ratio", type=float, default=ART_HEIGHT_RATIO,
                     help=f"Fraction of card height (from top) considered art. Default {ART_HEIGHT_RATIO}")
    args = ap.parse_args()

    print(f"{args.samples} sample(s) per card, model={args.model}")

    with open(DB_PATH, "r", encoding="utf-8") as f:
        db = json.load(f)

    official_name = resolve_set_name(args.set, db)
    slug = slugify(official_name)
    set_dir = os.path.join(CACHE_ROOT, slug)
    manifest_path = os.path.join(set_dir, "manifest.json")
    if not os.path.exists(manifest_path):
        print(f"No manifest found at {manifest_path}. Run download_set_images.py --set \"{args.set}\" first.")
        sys.exit(1)
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    out_dir = os.path.join(ROOT, "art-tools", "set-outputs")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{slug}-hidden-mickeys.json")

    results = {"cards": {}}
    if os.path.exists(out_path) and not args.restart:
        with open(out_path, "r", encoding="utf-8") as f:
            results = json.load(f)

    crop_tmp = os.path.join(set_dir, "_mickey_crop_tmp.png")

    todo = [(fname, key) for fname, key in manifest.items() if key not in results["cards"]]
    total = len(manifest)
    print(f"Set: {official_name}  ({total} cards, {len(todo)} to check, model={args.model})")

    done = 0
    found_count = 0
    for fname, key in todo:
        img_path = os.path.join(set_dir, fname)
        if not os.path.exists(img_path):
            print(f"  [skip] missing image for {key}")
            continue
        try:
            crop_art(img_path, crop_tmp, ratio=args.art_ratio)
            matches = detect_matches(args.host, args.model, crop_tmp, samples=args.samples)
        except Exception as e:
            print(f"  [error] {key}: {e}")
            continue

        for m in matches:
            # y was reported as a percentage of the CROPPED (and upscaled)
            # art image's height. The upscale is uniform so it cancels out;
            # only the vertical crop ratio needs to be undone to get back to
            # full-card-image percentage space (x and r are unaffected since
            # the crop/upscale is symmetric and vertical-only) -- matches the
            # "m" marker convention used elsewhere on the site.
            m["y"] = round(m["y"] * args.art_ratio, 1)

        if matches:
            found_count += 1
            for m in matches:
                print(f"  [MICKEY FOUND] {key}  conf={m['confidence']}  ({m['note']})")
        results["cards"][key] = {"matches": matches}
        done += 1

        if done % 5 == 0:
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=1)
            print(f"  ...saved progress ({done}/{len(todo)})")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=1)
    if os.path.exists(crop_tmp):
        os.remove(crop_tmp)

    print(f"Done. Checked {done} cards, found something on {found_count} of them.")
    print(f"Saved to {out_path}")
    print(f"Next: python3 art-tools/merge_hidden_mickeys.py --input {slug}-hidden-mickeys.json")


if __name__ == "__main__":
    main()
