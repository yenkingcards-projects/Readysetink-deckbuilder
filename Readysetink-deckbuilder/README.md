# Ready Set Ink

A search and deck-building site for Disney Lorcana. The differentiator is
**vague art search** — describe what you remember seeing ("blue dog", "sea
witch") and find the card — plus community notes written by people who play.

Live at readysetink.com. Not published, endorsed or approved by Disney or
Ravensburger.

---

## The one rule

**Never edit `index.html` or `flounder-search.html` by hand.** Both are
generated, and the next build overwrites them completely. Edit
`flounder-search.template.html` (the app) or `build_flounder.py` (the data),
then run:

```bash
python3 build_flounder.py
```

That downloads card data from LorcanaJSON and images from Lorcast, bakes them
into the templates, and writes:

| Template | Output | What it is |
|---|---|---|
| `flounder-search.template.html` | `index.html` + `flounder-search.html` | the site (identical files, two names) |
| `tagger.template.html` | `flounder-tagger.html` | art tagging tool, local only |
| `notes.template.html` | `flounder-notes.html` | rules/notes tool, local only |

`index.html` is what the host serves. `flounder-search.html` is the same bytes
under the name every test suite reads. The two authoring tools are gitignored —
they are how the data files get written, not part of the public site.

## What's in here

| File | Purpose | Who edits it |
|---|---|---|
| `flounder-search.template.html` | the whole app | Claude |
| `build_flounder.py` | downloads and bakes card data | Claude |
| `build_rules.py` | parses set-release-note PDFs into `card-rules.json` | Claude |
| `art-tags.json` | character aliases, per-card art tags, symbol marks | Ben exports, Claude merges |
| `rsi-notes.json` | community notes | Ben exports, Claude merges |
| `card-rules.json` | official Q&A, generated | generated |
| `tests/` | 33 suites, ~1,100 checks | Claude |

`art-tags.json` and `rsi-notes.json` are hand-authored and exist nowhere else.
They are the reason this repo matters more than the code does.

## Tests

```bash
npm install jsdom playwright-core        # into /tmp, which is where the suites look

# jsdom suites
for f in _test_v3 _test_v4 _test_v5 _test_tags _test_v6 _test_v7; do node tests/$f.js; done

# browser suites — need Chromium
for f in _test_browser _test_notes _test_toggles _test_v10 …; do node tests/$f.js; done

# independently re-downloads every image and checks it belongs to its card
python3 tests/_verify_images.py
```

When a test fails, work out whether the code or the expectation is wrong. Most
failures in this project have been stale expectations after a deliberate
change. A few have been real bugs. Don't reflexively "fix" either one.

## Design

The look is the ReadySetInk design system — Y2K console chrome, beveled
periwinkle plates, a carbon command layer with a halftone texture, and warm
accents rationed strictly to "act here". Contrast is held at **AAA (7:1)**, not
AA; `tests/_test_v33.js` audits every text node on 16 pages against its real
composited background and fails below that bar.

## Data sources

Card data from [LorcanaJSON](https://lorcanajson.org). Card images from
[Lorcast](https://lorcast.com), falling back to Ravensburger's own image URLs.
Official rulings from Ravensburger's set release notes.

Disney Lorcana and all card images and names are the property of Ravensburger
and Disney. This project uses them under Ravensburger's Community Code Policy,
which prohibits charging for access to this content. It is free to use, always.
