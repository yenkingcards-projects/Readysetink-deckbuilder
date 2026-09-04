# Art tagger — command cheat sheet

Copy-paste reference for running the AI art-tagging pipeline. Full
explanations are in `art-tools/README.md` — this is just the commands.

Every command below assumes you're in the project folder:

```bash
cd "/Users/benjamindacy/Desktop/Ben/Buisness Projects/ready set ink/Documents/829git"
```

---

## First time only

```bash
pip3 install pillow pillow-avif-plugin      # converts card art to a usable format
ollama pull gemma4:12b                       # the vision model (only if not already pulled)
```

Ollama itself usually runs in the background automatically once installed —
you don't need to start it by hand. Check with:

```bash
ollama ps          # shows the model if it's currently active
ollama list         # shows every model you have installed
```

---

## See what sets exist

```bash
python3 art-tools/download_set_images.py --list-sets
```

---

## Run ONE set (download + tag)

Swap `"First Chapter"` for the set name shown in `--list-sets` (or its number, e.g. `--set 2` for Floodborn).

```bash
python3 art-tools/download_set_images.py --set "First Chapter" --with-variants
python3 art-tools/tag_art.py --set "First Chapter" --model "gemma4:12b"
```

`--with-variants` also grabs Enchanted / Special / Epic / Iconic alt-art
printings as their own taggable entries, on top of the normal card art.

If you stop partway (Ctrl+C) or it crashes, pick back up without re-doing
finished cards:

```bash
python3 art-tools/tag_art.py --set "First Chapter" --model "gemma4:12b" --resume
```

---

## Run EVERY set, unattended ("set it and forget it")

```bash
python3 art-tools/run_all_sets.py --model "gemma4:12b"
```

Downloads + tags every set in the whole database, one after another,
including alt-art. Before you walk away: go to **System Settings → Lock
Screen** (or **Battery**) and turn off sleep, or the run pauses when your
Mac's display sleeps.

Safe to stop and re-run the exact same command later — nothing already
tagged gets redone.

Watch its progress from another terminal tab while it runs:

```bash
tail -f art-tools/overnight-run.log
```

---

## Check what a set produced

```bash
python3 -m json.tool art-tools/set-outputs/the-first-chapter-art-tags.json | less
```

(space = scroll down, `q` = quit)

Search for one card by name:

```bash
grep -A 15 "HeiHei" art-tools/set-outputs/the-first-chapter-art-tags.json
```

---

## Merge a finished set into the real site data

**Always dry-run first** — it only prints what WOULD happen, doesn't touch anything:

```bash
python3 art-tools/merge_art_tags.py --input the-first-chapter-art-tags.json --dry-run   # finds it in art-tools/set-outputs/ automatically
```

Looks right? Run it for real:

```bash
python3 art-tools/merge_art_tags.py --input the-first-chapter-art-tags.json
```

This only ADDS cards that don't already have an entry — anything you've
hand-tagged in `flounder-tagger.html` is never touched or overwritten.

---

## Rebuild the site with the new tags

```bash
python3 build_flounder.py
cat BUILD-REPORT.md
```

Check the build log line that starts with `art tags:` — it reports how many
cards are now searchable, and how many got boosted by alt-art tags.

---

## Troubleshooting

**"certificate verify failed" during download** — run this once per terminal session, then retry:
```bash
export SSL_CERT_FILE=$(python3 -m certifi)
```
(This fix is also now baked into the download script itself as of the latest version, so you likely won't hit this anymore.)

**"model not found" / 404 errors during tagging** — your model name doesn't match. Check the exact name:
```bash
ollama list
```
and pass it explicitly: `--model "exact-name-here"`

**Lots of "FAILED ... Unterminated string" errors** — the model's response got cut off before finishing. The script now keeps partial results automatically (marked `(partial)` in the log) instead of losing the whole card, but if you see this a lot, tell Claude — it usually means the response-length limit needs raising again.

**Not sure if Ollama is actually doing something** — in a separate terminal tab:
```bash
ollama ps
```
If it shows the model listed, it's active.
