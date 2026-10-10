# Ready Set Ink

A search and deck-building site for Disney Lorcana. The difference is
**art search**: describe what you remember seeing ("blue dog", "sea witch")
and find the card. Plus community notes from people who play.

Live at readysetink.com. Not published, endorsed or approved by Disney or
Ravensburger.

## Layout

```
src/       the app: page shell, css/, js/ (one file per area) and builder/ — see src/README.md
data/      card-db.json (all card data) and the hand-authored art tags, rulings, notes, meta decks
public/    what the site serves. The build writes most of it; see CLAUDE.md for the hand-made folders
scripts/   the build, page generator, build report, card fetcher, smoke test
tools/     local-only tools: the art tagger and the tagger / notes editors
docs/      how we work, partner brief, data notes, BUILD-REPORT.md, plans
db/        Supabase SQL
```

## Build

```bash
python3 scripts/build_flounder.py            # offline, ~1s
python3 scripts/build_flounder.py --refresh  # re-pull card data and prices first
node scripts/smoke.js                        # crash check before pushing
```

The build bakes every card into `public/index.html` (one self-contained page
that works offline), writes a crawlable page per card, set, keyword,
franchise and character, the sitemaps and `docs/BUILD-REPORT.md`. Vercel
serves `public/` as-is.

**Never hand-edit `public/index.html` or the generated pages.** Edit `src/`
or `data/` and rebuild.

## The data that matters

| File | What it is | Who edits it |
|---|---|---|
| `data/art-tags.json` | character aliases, per-card art tags, hidden-Mickey marks | Ben/Kenny via the tagger; append only |
| `data/rsi-notes.json` | community notes | Ben via the notes editor; append only |
| `data/card-rules.json` | official Q&A from Ravensburger's release notes | `scripts/build_rules.py`; append only |
| `data/card-db.json` | every card, from LorcanaJSON + Lorcast | `--refresh` |

`art-tags.json` and `rsi-notes.json` exist nowhere else. They are the reason
this repo matters more than the code does.

## Design

Y2K console chrome on the home screen; white rounded panels, periwinkle
background and one yellow "do it" button everywhere else. Text contrast is
held at AAA (7:1).

## Data sources

Card data from [LorcanaJSON](https://lorcanajson.org). Card images from
[Lorcast](https://lorcast.com), falling back to Ravensburger's own image URLs.
Official rulings from Ravensburger's set release notes.

Disney Lorcana and all card images and names are the property of Ravensburger
and Disney. This project uses them under Ravensburger's Community Code Policy,
which prohibits charging for access to this content. It is free to use, always.
