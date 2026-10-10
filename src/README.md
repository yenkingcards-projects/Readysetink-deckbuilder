# src/ — the app

| Path | What it is |
|---|---|
| `flounder-search.template.html` | The page shell: `<head>`, the body markup, and placeholders the build fills |
| `css/*.css` | The site's styles, one file per area, stitched in at `/*__CSS__*/` in file-name order |
| `js/*.js` | The site's script, stitched in at `/*__JS__*/` in file-name order |
| `builder/` | The deck builder's layout (`nb.css`, `nb.js`), inlined last |

The `js/` files are consecutive pieces of **one** script, not modules:
`01-boot.js` opens the closure and `27-accounts.js` closes it. Everything is
in one scope, so a function in `08-deck.js` can call one in `06-search.js`.
Order matters for top-level `const`/`let`, which is why the files are numbered.
To add a new area, add a file with a number that puts it after what it uses.

Where things are:

| Looking for | File |
|---|---|
| Staples, Easter eggs, Coconut cards (`COCO`), inks, formats | `js/02-config.js` |
| Collection, prices, TCGplayer links | `js/03-collection-and-prices.js` |
| The 72 special searches (`GROUPS`) | `js/04-special-searches.js` |
| App state, saved decks, undo | `js/05-state-and-storage.js` |
| Search query, chips, pills, card grid | `js/06-search.js` |
| Card detail window | `js/07-card-modal.js` |
| Deck panel, deck doctor, goldfish, draw odds | `js/08-deck.js` |
| Guided Coconut Build, prebuilt Coconut decks (`COCO_PLAN`) | `js/09-guided-coconut.js` |
| Pull sheet, proxy slips | `js/10-pull-sheet.js` |
| Dust, achievements, titles | `js/15-dust.js` |
| Decks page, recommended decks | `js/19-decks-pages.js` |
| Every page listed under More / Other (`OTHER_GROUPS`) | `js/21-other-menu.js` |
| Settings switches, the Other page router (`OPAGES`) | `js/24-other-page.js` |
| Lore tracker + judge | `js/20-lore-tracker.js` |
| Tabs, routing, boot wiring | `js/25-app-shell.js` |
| Google sign-in and sync | `js/27-accounts.js` |

Build: `python3 scripts/build_flounder.py` (writes `public/index.html`).
