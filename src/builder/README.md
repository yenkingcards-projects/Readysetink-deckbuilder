# The deck builder (`src/builder/`)

There is one deck builder. readysetink.com opens on its home screen and
readysetink.com/deckbuilder is the builder (vercel.json serves the same page at
both). The old "classic builder" and its `?newbuilder=` switch were removed on
2026-10-10.

## Where the code is

| File | What it is |
| --- | --- |
| `src/builder/nb.css` | The builder's styles. Rules start with `html.nb` (set on `<html>` in the template) so they win over the template's older base styles. |
| `src/builder/nb.js` | The builder's layout and behaviour. Inlined at the end of the template's main script, inside the same closure, so it uses the template's engine directly. |
| `sw.js` | Offline support, registered by nb.js. |

`build_flounder.py` inlines both files into `index.html` at the
`/*__NB_CSS__*/` and `/*__NB_JS__*/` placeholders, so the site is still one
self-contained HTML file.

## How it works

The template is the engine: search, the 72 special searches, add/remove/undo,
saving, the saved-deck format, the collection and TCGplayer. nb.js is the
layout on top. It moves existing pieces into place (search box, art/franchise/
flavour switches, Syntax, special searches, Filters, and the template's deck
panel, which becomes the "Stats" tab) instead of rebuilding them, so anything
already bound to them keeps working.

Guided Coconut Build uses the same deck panel: nb.js moves it into `#gdeck`
while the guided view is open and back when you leave.

Storage keys of its own: `fs3_nb_work` (unsaved working copy: *Save still
means Save*), `fs3_nb_recent`, `fs3_nb_dview`, `fs3_nb_theme`, `fs3_nb_hint`.

## Design rules (from Ben's reviews)

- Calm: adding a card never redraws card pictures, nothing flies across the
  screen, only the changed deck row is highlighted.
- Tiles show "+ Add" until a card is in the deck, then "− n +".
- Cost is a two-handle slider (0 to 10+). Inkwell is Any / Inkable / Uninkable in Filters.
- The big preview appears beside a card after 1.5 s of hovering its picture,
  never over the + / − buttons.
- Compare: card detail button, press-and-hold on a phone, or C.
- Icons come from the project icon library (`NBI` in nb.js). No emoji on buttons.
- More lists every page from `OTHER_GROUPS`.
- Ko-fi lives on the Settings page only.
- The journey: Build → Save → Pull sheet → Share (link, share sheet, text, square image, QR).
- Home screen: console-style main menu. Deep links skip it; the logo brings it back.
- Phones: two-across card grid and a dark "Your deck … View" bar.

## Analytics

Vercel Web Analytics custom events: `builder_opened`, `first_card_added`
(with seconds), `deck_reached_60`, `deck_saved`, `deck_exported`,
`deck_shared`. Dropped silently on Vercel plans without custom events.

## Adding to it

Use the hooks at the bottom of `nb.js`:

```js
NBX.addDeckTab({id:"stats", label:"Stats", render: pane => { /* … */ }});
NBX.addStartOption({id:"finish", icon:"sparkles", label:"Finish my deck", sub:"…", run: () => { /* … */ }});
NBX.addDrawerSection("<h4>…</h4>");
```
