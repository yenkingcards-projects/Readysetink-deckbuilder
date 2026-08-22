# How we work

Ben says what he wants. I change it. I ship it. He tells me what's wrong.
He is the QA. That is faster and more accurate than anything I do alone.

## Rules

1. **No verification theatre.** 45 minutes of checking still shipped bugs, so
   the checking bought nothing. Quality comes from reading the code before
   editing it — not from testing after.
2. **No tests.** None. `smoke.js` only if a change could white-screen the site
   (new JS at boot, a rewritten render function). Otherwise skip it.
3. **No screenshots** unless Ben asks or the change can't be described.
4. **No investigation** he didn't request. Found something odd? One line, move on.
5. **Batch.** Ten asks = one build, one ship.
6. **Reply in 1–3 lines.** What changed. Anything he must know. Nothing else.
   No recaps, no "why this was interesting", no lists of what I considered.
7. **Never re-read a file I just wrote.** Never re-run a passing command.

## Caring, cheaply

Care is spent BEFORE the edit, not after:

- Grep for every call site of a thing before moving or renaming it.
- Changing markup an id points at? Check what binds that id.
- Changing a class name? Check nothing else uses it.
- Touching a render function? Check what re-runs it and what re-binds after.

Those greps cost seconds and catch the bugs. The test suite caught almost none
of them — it mostly caught itself.

## Never break

- Only edit `flounder-search.template.html`. Never the built files.
- Never touch `art-tags.json` or `rsi-notes.json` — hand-written, irreplaceable.
- Don't lose user data: decks, collection, dust.

## Build

    python3 build_flounder.py

Then copy `index.html` to the repo folder. That's the deploy.
