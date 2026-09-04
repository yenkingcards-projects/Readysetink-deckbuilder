#!/usr/bin/env python3
"""
The one big "leave it running" pipeline. For every set with cards, in order:

  1. Download that set's art (+ alt-art variants) -- skips anything already
     downloaded.
  2. Tag it with the main tagger -- auto-resumes, only tags untagged cards.
  3. Run the hidden-mickey pass on it -- auto-resumes, only checks
     unchecked cards.
  4. Merge the hidden-mickey results straight into art-tags.json.

Meant to be started once and left running for hours (or overnight). Every
step is individually resumable, so Ctrl+C at any point and re-running this
exact command later picks back up right where it stopped -- nothing is
redone, nothing is lost.

Usage:
    python3 art-tools/run_everything.py --model gemma4:12b
    python3 art-tools/run_everything.py --model gemma4:12b --skip-quests
    python3 art-tools/run_everything.py --model gemma4:12b --set "First Chapter"
        (just one set, still runs all 4 steps -- useful for testing)

Writes progress to art-tools/overnight-run.log as it goes, plus a summary
at the end.
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
    """Run a step; return True on success, False on failure. Lets
    KeyboardInterrupt propagate so the whole run stops cleanly."""
    try:
        subprocess.run(cmd, cwd=ROOT, check=True)
        return True
    except subprocess.CalledProcessError as e:
        log(f"  FAILED ({step_name}): {e}")
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='gemma4:12b')
    ap.add_argument('--skip-quests', action='store_true',
                     help="Skip Illumineer's Quest sets (different card pool/format)")
    ap.add_argument('--set', help="Only run this one set (all 4 steps), instead of every set")
    ap.add_argument('--skip-mickeys', action='store_true',
                     help="Skip the hidden-mickey pass entirely, just download+tag")
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

    with open(LOG_PATH, 'a') as f:
        f.write(f"\n=== Full run started {time.strftime('%Y-%m-%d %H:%M:%S')} "
                f"(model={args.model}) ===\n")
    log(f"{len(sets)} sets queued: " + ", ".join(n for _, n in sets))

    results = []
    try:
        for code, name in sets:
            slug = slugify(name)
            log(f"=== {name} ===")

            log("  [1/4] downloading art + variants...")
            ok_dl = run([sys.executable, "art-tools/download_set_images.py",
                         "--set", name, "--with-variants"], "download")

            if not ok_dl:
                log(f"  Skipping rest of pipeline for {name} (download failed).")
                results.append((name, "FAILED at download"))
                continue

            log("  [2/4] tagging art (auto-resumes)...")
            ok_tag = run([sys.executable, "art-tools/tag_art.py",
                          "--set", name, "--model", args.model], "tag")
            if not ok_tag:
                results.append((name, "FAILED at tagging"))
                # still worth trying the mickey pass on what did get downloaded
            else:
                merge_path = os.path.join(ROOT, "art-tools", "set-outputs", f"{slug}-art-tags.json")
                if os.path.exists(merge_path):
                    log(f"  repairing leaked JSON syntax in {slug}-art-tags.json...")
                    run([sys.executable, "art-tools/fix_leaked_json.py", merge_path], "fix-leaks")
                    log(f"  merging {slug}-art-tags.json into art-tags.json...")
                    run([sys.executable, "art-tools/merge_art_tags.py",
                         "--input", f"{slug}-art-tags.json"], "merge-tags")

            if not args.skip_mickeys:
                log("  [3/4] hidden-mickey pass (auto-resumes)...")
                ok_mickey = run([sys.executable, "art-tools/find_hidden_mickeys.py",
                                 "--set", name, "--model", args.model], "hidden-mickeys")
                if ok_mickey:
                    log("  [4/4] merging hidden-mickey results...")
                    mickey_path = os.path.join(ROOT, "art-tools", "set-outputs", f"{slug}-hidden-mickeys.json")
                    if os.path.exists(mickey_path):
                        run([sys.executable, "art-tools/merge_hidden_mickeys.py",
                             "--input", f"{slug}-hidden-mickeys.json"], "merge-mickeys")
                else:
                    tail = " + FAILED at hidden-mickeys"
                    if results and results[-1][0] == name:
                        results[-1] = (name, results[-1][1] + tail)
                    else:
                        results.append((name, "FAILED at hidden-mickeys"))

            if not any(r[0] == name for r in results):
                log(f"  DONE: {name}")
                results.append((name, "done"))
    except KeyboardInterrupt:
        log("Interrupted by user -- stopping. Re-run this same command later to pick up "
            "where it left off (every step is individually resumable).")

    log("=== Summary ===")
    for name, status in results:
        log(f"  {status:28} {name}")
    log(f"Full log: {LOG_PATH}")


if __name__ == '__main__':
    main()
