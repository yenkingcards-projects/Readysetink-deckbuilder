#!/usr/bin/env python3
"""
Run the full pipeline (download art + tag with local Ollama) for every set
that has cards, one after another, unattended. Meant to be kicked off and
left running overnight.

Usage:
    python3 art-tools/run_all_sets.py --model gemma4:12b
    python3 art-tools/run_all_sets.py --model gemma4:12b --skip-quests

Writes progress to art-tools/overnight-run.log as it goes, plus a summary
at the end. Safe to Ctrl+C and re-run later -- each set's own --resume
logic means finished cards are never redone, only what's left.
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='gemma4:12b')
    ap.add_argument('--skip-quests', action='store_true',
                     help="Skip Illumineer's Quest sets (different card pool/format)")
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

    with open(LOG_PATH, 'a') as f:
        f.write(f"\n=== Overnight run started {time.strftime('%Y-%m-%d %H:%M:%S')} "
                f"(model={args.model}) ===\n")
    log(f"{len(sets)} sets queued: " + ", ".join(n for _, n in sets))

    results = []
    for code, name in sets:
        log(f"--- {name} ---")
        try:
            subprocess.run([sys.executable, "art-tools/download_set_images.py",
                             "--set", name, "--with-variants"], cwd=ROOT, check=True)
            subprocess.run([sys.executable, "art-tools/tag_art.py",
                             "--set", name, "--model", args.model],
                            cwd=ROOT, check=True)
            log(f"DONE: {name}")
            results.append((name, "done"))
        except subprocess.CalledProcessError as e:
            log(f"FAILED: {name} ({e})")
            results.append((name, "FAILED"))
        except KeyboardInterrupt:
            log("Interrupted by user -- stopping. Re-run this same command later to pick up "
                "where it left off (already-tagged cards are never redone).")
            break

    log("=== Summary ===")
    for name, status in results:
        log(f"  {status:6} {name}")
    log(f"Full log: {LOG_PATH}")


if __name__ == '__main__':
    main()
