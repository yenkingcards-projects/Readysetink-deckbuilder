#!/usr/bin/env python3
"""
The "make what's already tagged BETTER" overnight pipeline -- as opposed to
run_everything.py, which is about getting untouched sets done for the first
time, this one goes back over sets that already have tags and:

  1. Re-runs the tagger in --improve mode on every set (adds new tags on
     top of what's there, never redoes or removes existing ones).
  2. Merges the improved output into art-tags.json (--overwrite-ai, so it
     only ever touches AI-written entries -- your own hand-tagged cards are
     never touched).
  3. Runs clean_slop.py on the master file to strip out any junk (digit
     slop, leaked model reasoning, repetition-loop duplicates) sitting in
     already-merged cards, from before those filters existed or that
     slipped past them.

Meant to be left running for a long stretch, same as run_everything.py --
every step here is safe to interrupt and re-run.

Usage:
    python3 art-tools/run_everything_improve.py --model gemma4:12b
    python3 art-tools/run_everything_improve.py --model gemma4:12b --set "First Chapter"
    python3 art-tools/run_everything_improve.py --model gemma4:12b --skip-quests
"""
import argparse, json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "card-db.json")
LOG_PATH = os.path.join(ROOT, "art-tools", "overnight-run.log")


def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG_PATH, 'a') as f:
        f.write(line + "\n")


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


def run(cmd, step_name):
    try:
        subprocess.run(cmd, cwd=ROOT, check=True)
        return True
    except subprocess.CalledProcessError as e:
        log(f"  FAILED ({step_name}): {e}")
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='gemma4:12b')
    ap.add_argument('--skip-quests', action='store_true')
    ap.add_argument('--set', help="Only run this one set, instead of every set")
    ap.add_argument('--only-downloaded', action='store_true', default=True,
                     help="(default) Skip sets that haven't been downloaded at all yet -- "
                          "use run_everything.py for those first")
    args = ap.parse_args()

    with open(DB_PATH) as f:
        db = json.load(f)

    counts = {}
    for c in db['cards']:
        counts[c['s']] = counts.get(c['s'], 0) + 1

    sets = [(code, meta['name']) for code, meta in db['sets'].items() if counts.get(code, 0) > 0]
    sets.sort(key=lambda x: db['sets'][x[0]]['d'])

    if args.skip_quests:
        sets = [s for s in sets if 'Quest' not in s[1]]

    if args.set:
        low = args.set.lower().strip()
        sets = [s for s in sets if s[1].lower() == low or low in s[1].lower()]
        if not sets:
            print(f"No set matching '{args.set}' found.")
            sys.exit(1)

    # Only bother improving sets that have actually been downloaded --
    # nothing to improve on a set with no art-cache folder yet.
    downloadable = []
    for code, name in sets:
        slug = slugify(name)
        manifest = os.path.join(ROOT, "art-cache", slug, "manifest.json")
        if os.path.exists(manifest):
            downloadable.append((code, name))
        else:
            log(f"Skipping {name} -- not downloaded yet (run_everything.py handles first-time sets).")
    sets = downloadable

    with open(LOG_PATH, 'a') as f:
        f.write(f"\n=== Improve run started {time.strftime('%Y-%m-%d %H:%M:%S')} "
                f"(model={args.model}) ===\n")
    log(f"{len(sets)} set(s) queued for improvement: " + ", ".join(n for _, n in sets))

    results = []
    try:
        for code, name in sets:
            slug = slugify(name)
            log(f"=== {name} ===")

            log("  [1/4] improve pass (adding new tags, keeping existing)...")
            ok_tag = run([sys.executable, "art-tools/tag_art.py",
                          "--set", name, "--model", args.model, "--improve"], "improve")
            if not ok_tag:
                results.append((name, "FAILED at improve pass"))
                continue

            out_path = os.path.join(ROOT, "art-tools", "set-outputs", f"{slug}-art-tags.json")
            log("  [2/4] repairing leaked JSON syntax in the raw output...")
            if os.path.exists(out_path):
                run([sys.executable, "art-tools/fix_leaked_json.py", out_path], "fix-leaks")

            log("  [3/4] merging improved tags into art-tags.json...")
            if os.path.exists(out_path):
                run([sys.executable, "art-tools/merge_art_tags.py",
                     "--input", f"{slug}-art-tags.json", "--overwrite-ai"], "merge")

            log("  [4/4] cleaning slop out of art-tags.json...")
            run([sys.executable, "art-tools/fix_leaked_json.py", "art-tags.json"], "fix-leaks-master")
            run([sys.executable, "art-tools/clean_slop.py"], "clean")

            log(f"  DONE: {name}")
            results.append((name, "done"))
    except KeyboardInterrupt:
        log("Interrupted by user -- stopping. Re-run this same command later to pick up "
            "where it left off (--improve and clean_slop are both safe to re-run).")

    log("=== Summary ===")
    for name, status in results:
        log(f"  {status:24} {name}")
    log(f"Full log: {LOG_PATH}")


if __name__ == '__main__':
    main()
