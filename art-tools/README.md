# AI art-tagging pipeline

Fills `art-tags.json` using a local vision model (Ollama) instead of clicking
through `flounder-tagger.html` by hand. Runs one set at a time. Never
overwrites a hand-tagged entry.

## One-time setup

```bash
pip3 install pillow pillow-avif-plugin   # converts Lorcast's .avif art to .png
ollama pull gemma3:12b                    # or any vision-capable model you have
ollama serve                              # if not already running
```

## Per-set workflow

```bash
# 1. See what sets exist and how many cards each has
python3 art-tools/download_set_images.py --list-sets

# 2. Download + cache that set's card art
python3 art-tools/download_set_images.py --set "First Chapter"

#    Add --with-variants to also grab Enchanted / Special / Epic / Iconic
#    alt-art printings as their own entries, e.g. "Hades - King of Olympus (Enchanted)"
python3 art-tools/download_set_images.py --set "First Chapter" --with-variants

# 3. Tag every cached image with the local model. Writes
#    first-chapter-art-tags.json (safe to interrupt -- rerun with --resume)
python3 art-tools/tag_art.py --set "First Chapter"
python3 art-tools/tag_art.py --set "First Chapter" --resume   # if interrupted

# 4. Review the output file yourself, or open flounder-tagger.html and spot-check
#    a few cards before merging -- the model will be wrong sometimes.

# 5. Merge into the real master file. Only ADDS cards that don't already have
#    an entry -- anything you've hand-tagged is left untouched.
python3 art-tools/merge_art_tags.py --input first-chapter-art-tags.json --dry-run
python3 art-tools/merge_art_tags.py --input first-chapter-art-tags.json

# 6. Rebuild the site and check the integrity report
python3 build_flounder.py
cat BUILD-REPORT.md
```

Repeat step 2-6 for each new set (`Rise of the Floodborn`, `Into the Inklands`, ...).

## Output format

Matches `art-tags.json` exactly:

```json
{"cards": {"Ariel - On Human Legs": {"t": ["fullbody","solo","standing"], "a": ["red hair","green tail","..."]}}}
```

`t` is restricted to the fixed vocabulary in `tagger.template.html`'s `TAGS`
list (kept in sync manually in `tag_art.py` -- if you add a new tag there,
add it to `VOCAB` in `tag_art.py` too, or the model's guesses for it get
silently dropped). `a` targets 12-20 free words per card, more generous than
the 5-10 in the current hand-tagged entries, since more specific words are
what makes vague search work.

## Running every set overnight ("set it and forget it")

```bash
python3 art-tools/run_all_sets.py --model gemma4:12b
```

Downloads + tags every set with cards, one after another, unattended --
writes each set's own `<slug>-art-tags.json` as it goes, plus a running log
at `art-tools/overnight-run.log`. Safe to Ctrl+C; re-run the same command
later and it picks up where it left off (per-set `--resume` logic skips
cards already tagged). Doesn't merge into `art-tags.json` automatically --
that stays a manual, reviewed step per set (see below) so nothing bad gets
merged in unattended.

## Re-running a set

If you improve the prompt or switch models and want to redo a set:

```bash
python3 art-tools/tag_art.py --set "First Chapter"           # overwrites the set file
python3 art-tools/merge_art_tags.py --input first-chapter-art-tags.json --overwrite-ai
```

`--overwrite-ai` only touches cards this tool previously wrote (tracked in
`.ai-merged-keys.json`, gitignored) -- it will never replace a tag you
hand-edited in `flounder-tagger.html`.

## Known gaps / things to watch

- **Model accuracy.** Gemma will misread hands as "holding a weapon" or miss
  a subtle setting cue. Spot-check a set before trusting it, especially early
  runs -- adjust the prompt in `tag_art.py` if a whole category is consistently
  wrong.
- **Card name matching.** `merge_art_tags.py` validates every incoming name
  against `card-db.json` and refuses to add anything it can't resolve, so a
  slug mismatch shows up as "Skipped (unknown)" instead of silently
  corrupting the master file.
- **Image format.** Lorcast serves `.avif`. The downloader converts to `.png`
  using `pillow` + `pillow-avif-plugin` if installed (works anywhere, including
  Cowork's own shell), falling back to macOS's built-in `sips` if not. If
  neither is available images stay `.avif` and most Ollama vision models will
  reject them when you run `tag_art.py`.
