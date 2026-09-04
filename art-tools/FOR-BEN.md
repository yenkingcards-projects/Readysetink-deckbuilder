# For Ben — how to run this

## The mega one-click way: run EVERY set, everything, overnight

Open the **"Start Tagging"** folder and double-click:

**`RUN EVERYTHING (all sets, overnight).command`**

This is the "start it and walk away" option. One click does the whole
pipeline for every set that isn't fully done yet:

1. Downloads any set (and its variants) that hasn't been downloaded yet.
2. Tags any cards that aren't tagged yet.
3. Runs the hidden-mickey pass on every set.
4. Merges everything (tags AND hidden mickeys) straight into `art-tags.json`
   as it goes -- you don't need to run any merge command yourself.

It goes set by set, in release order, and just keeps going until every set
is fully done. This is going to take a long time the first time through
(hours, easily overnight) since most sets haven't been touched yet -- that's
expected. Leave your Mac on and awake (check your Energy Saver / Lock
Screen settings so it doesn't sleep) and let it run.

It's completely safe to stop it (close the window, or Ctrl+C) and
double-click it again later, any time -- every single step remembers what's
already done and only works on what's left, so nothing is ever redone or
lost. It also picks up any fully-new set (0 cards downloaded yet)
automatically -- you never need a different command as new sets release.

Progress is also written to `art-tools/overnight-run.log` if you want to
check on it without watching the Terminal window.

---

## The mega one-click way: IMPROVE everything already tagged

Open the **"Start Tagging"** folder and double-click:

**`IMPROVE EVERYTHING (add tags, remove slop).command`**

This is the "make what's already there better" option, as opposed to the
one above which is about getting untouched sets done for the first time.
For every set you've already downloaded, it:

1. Runs an improve pass -- looks at each card again and ADDS any new tags
   it notices, without redoing or losing anything already there.
2. Scrubs slop out of `art-tags.json` -- junk like leaked model reasoning,
   repetition-loop duplicates, and random digits/dimensions that shouldn't
   be there (this cleans OLD entries too, not just new ones, so it's worth
   running even if you never use anything else).

It skips any set you haven't downloaded yet (nothing to improve there --
use the RUN EVERYTHING command above for those). Same deal as always: safe
to stop and re-click later, nothing is lost, and it writes a timestamped
backup of `art-tags.json` (named `art-tags.backup-<date>-<time>.json`) any
time the slop-cleaning step actually changes something, so you can always
undo it.

---

## The per-set way: just double-click one set

Open the **"Start Tagging"** folder in the project. There's one file per set,
like `Start - The First Chapter.command`. Double-click it and it downloads
that set's art (if it hasn't already) and starts tagging it -- both steps,
one click.

It's completely safe to click the same one again later, any day -- it picks
up right where it left off (skips anything already downloaded or tagged), so
"one click per day per set" works exactly like you wanted. Close the Terminal
window it opens, or press Enter when it says it's done, whenever you want to
stop.

**First time you double-click one, macOS might refuse to open it** ("cannot
be opened because it is from an unidentified developer"). If that happens:
right-click (or Control-click) the file instead of double-clicking, choose
**Open**, then confirm in the dialog that pops up. You only have to do that
once per file.

---

## The manual way (same thing, typed by hand)

Open Terminal, then paste this first, every time:

```
cd "/Users/benjamindacy/Desktop/Ben/Buisness Projects/ready set ink/Documents/829git"
```

---

## 1. Download a card set (all cards + variants)

Type this, but change "First Chapter" to whatever set you want:

```
python3 art-tools/download_set_images.py --set "First Chapter" --with-variants
```

That downloads every card's art AND the special alt-art versions (Enchanted, Special, etc.) for that set. Safe to run again later — it won't re-download anything it already has.

---

## 2. Start the tagger on that same set

```
python3 art-tools/tag_art.py --set "First Chapter" --model "gemma4:12b"
```

Change "First Chapter" to match whatever set you downloaded in step 1.

Let it run. It saves its progress to a file as it goes, so it's safe to close Terminal, quit, restart your Mac, whatever — nothing is lost.

---

## 3. Resuming — only tag what isn't done yet

**You don't need a different command.** Just run the exact same line again:

```
python3 art-tools/tag_art.py --set "First Chapter" --model "gemma4:12b"
```

It automatically checks what's already tagged for that set and skips those cards, only working on what's left. You'll see a line at the start like:

```
Resuming: 47 cards already tagged in first-chapter-art-tags.json, skipping those.
```

If you ever want to throw away progress on a set and start that set completely over, add `--restart`:

```
python3 art-tools/tag_art.py --set "First Chapter" --model "gemma4:12b" --restart
```

---

## 4. Do another pass on a set you already tagged

If you want to run the AI over a set again to find things it missed the
first time -- not start over, just ADD to what's there -- use `--improve`:

```
python3 art-tools/tag_art.py --set "First Chapter" --model "gemma4:12b" --improve
```

It shows the AI what's already tagged for each card so it doesn't repeat
itself, and only adds genuinely new tags on top. Nothing already there gets
removed or redone. This also picks up new capabilities as I improve the
tagger over time (like the character-count and flavor-text-icon tagging) --
run `--improve` on an older set to backfill those.

---

## 5. How to check if it's actually saving

Each set writes its own file, named after the set, inside
`art-tools/set-outputs/`. For "First Chapter" it's:

```
art-tools/set-outputs/the-first-chapter-art-tags.json
```

(Check the exact filename printed after running if you're not sure — it usually matches the set's official name in lowercase with dashes.)

To see how many cards are saved in it right now:

```
python3 -c "import json; print(len(json.load(open('art-tools/set-outputs/the-first-chapter-art-tags.json'))['cards']), 'cards saved')"
```

Swap the filename for whatever set you're checking. It updates every 5 cards while the tagger runs, so if you check mid-run, the number should be climbing.

---

## 6. Hidden Mickey detection (separate tool)

**Update (2026-09-03):** the "show it reference examples first" approach
(the old runs that all came back empty, and the fix after that which showed
the AI red-circled examples from `art-tools/mickey-examples/`) both turned
out to be wrong. Tested directly against Lorcana cards with documented,
confirmed hidden Mickeys: sending multiple images in one request made the
model stop looking at the actual card and just echo "found" regardless of
content (it reported a match at 95% confidence on a plain gray test image).
One image at a time, zero reference examples, is what actually works.

Even then, one pass on a genuinely camouflaged pattern isn't reliable by
itself -- the same card, asked twice, can give a different answer. So the
tool now asks **3 independent times per card** (`--samples`, default 3) and
keeps every distinct spot any of the three answers pointed at, instead of
trusting one answer. Tested this way it correctly located two different
real, confirmed hidden Mickeys (within a few percent of the actual spot).
It'll still turn up some wrong guesses -- that's expected and fine, same
philosophy as before: a wrong guess costs a second to dismiss, a real one
it stayed quiet about never gets looked at again. `art-tools/mickey-examples/`
is no longer used by the script; left in place, harmless.

Your old set-output files (all the "hidden-mickeys.json" ones that came
back empty) are still sitting in `_to_delete_review/old-hidden-mickey-results/`
so this doesn't think it already checked everything -- running any set
below will check every card in it fresh.

This is a different tool from the main tagger. It only looks at the art
(the illustration part -- it crops off the name, text box, and flavor text
before showing the AI anything) and asks one focused question: "is there a
hidden Mickey (the 3-circle silhouette) somewhere in this picture?"

It needs a set already downloaded (step 1 above), so run that first if you
haven't.

**Step 1 — find them:**

```
python3 art-tools/find_hidden_mickeys.py --set "First Chapter" --model "gemma4:12b"
```

Like the main tagger, this saves progress as it goes and picks up where it
left off if you stop and re-run the same command. Add `--restart` if you
want it to re-check every card in the set from scratch.

It prints a line every time it finds one, like:

```
[MICKEY FOUND] Ariel - On Human Legs  (hidden in the clouds behind her)
```

**Step 2 — add the results into art-tags.json:**

```
python3 art-tools/merge_hidden_mickeys.py --input the-first-chapter-hidden-mickeys.json
```

(Swap the filename for whatever set you ran -- it prints the exact filename
to use at the end of step 1.)

This adds the "mousey" tag and a marker (so the 🐭 badge shows on the site
in the right spot) to each card it found one on. It does NOT touch or
remove anything else already tagged on that card -- it only adds. Safe to
run more than once; it won't add the same marker twice.

Add `--dry-run` to either command to preview without saving/writing anything.

---

## 7. Just clean slop, without a full improve pass

If you just want to strip junk out of `art-tags.json` right now (no new
tags, just cleanup):

```
python3 art-tools/clean_slop.py
```

Add `--dry-run` to see what it would remove without actually changing the
file.

## 8. Improve just one set, instead of everything

```
python3 art-tools/run_everything_improve.py --model "gemma4:12b" --set "First Chapter"
```

