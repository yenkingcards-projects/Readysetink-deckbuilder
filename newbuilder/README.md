# The new deck builder (`?newbuilder=1`)

The rebuilt deck builder from `deck-builder-plan.md` (Roadmap Phases 0–2, the
phone section, and the quality bar). It sits **behind a flag**. The classic
builder is still what everyone sees until we decide to switch.

## Trying it

- Add `?newbuilder=1` to the address, e.g. `https://readysetink.com/?newbuilder=1`.
  The device remembers it after that.
- `?newbuilder=0` (or **More → Switch back to the classic builder**) turns it off again.

## Where the code is

| File | What it is |
| --- | --- |
| `newbuilder/nb-boot.js` | 10 lines in `<head>`. Decides whether the flag is on (adds `class="nb"` to `<html>`). |
| `newbuilder/nb.css` | All the styles. Every rule starts with `html.nb`, so none of it can affect the classic builder. |
| `newbuilder/nb.js` | All the behaviour. Inlined at the end of the main script, inside the same closure, so it can reuse the classic engine directly. |
| `sw.js` | Offline support. Registered only by the new builder; the classic builder removes it. |

`build_flounder.py` packs all three `newbuilder/` files into `index.html`, so the
site is still one self-contained HTML file. The template only gained three
placeholder comments (`/*__NB_BOOT__*/`, `/*__NB_CSS__*/`, `/*__NB_JS__*/`).
The new code lives in separate files so that two people editing at once rarely
touch the same lines of the 16,000-line template.

## How it works

It **reuses** the classic builder's engine: the search, the 72 special
searches, add/remove/undo, saving, the saved-deck format, the collection, and
TCGplayer. It **moves** existing pieces into the new layout instead of rebuilding
them (the search box, the artwork/franchise/flavour switches, Syntax, the
special searches, the Filters list, and the classic deck panel, which becomes
the "Stats & tools" tab). Anything already bound to those elements keeps working.

With the flag off, `nb.js` only records the Phase 0 analytics events and stops.

**Saved decks keep their format.** The only new storage keys are:
`fs3_nb` (the flag), `fs3_nb_work` (unsaved working copy: *Save still means
Save*), `fs3_nb_recent`, `fs3_nb_dview`, `fs3_nb_theme`, `fs3_nb_hint`.

## Design choices (from Ben's first review)

- Calm by default: adding a card never re-draws card pictures (no flash), nothing
  flies across the screen, and only the deck row that changed is highlighted.
- Tiles show one "+ Add" until a card is in the deck, then "− n +" with just the number.
- Cost is a two-handle slider (0 to 10+). Inkwell is a clear three-way choice in
  Filters (Any / Inkable only / Uninkable only), not a cycling button.
- The big card preview appears beside the card, only when hovering the picture,
  after 1.5 seconds. It never appears over the + / − buttons.
- Compare: the button in any card's detail view, press-and-hold on a phone, or the C key.
- Icons are Ben's icon library (`bendacymedia/Claude apps/icon-library`), inlined in
  `nb.js` as `NBI`. There are no emoji on the build path.
- More lists every page the site has, read from the same `OTHER_GROUPS` list as the
  classic Other page.
- Ko-fi: the original "Support Ready Set Ink" button is on the Settings page. It
  never appears in the builder.
- The journey: Build → Save → Pull sheet (goes to this deck's pull sheet on Decks)
  → Share (link, native share, list text, a square deck image, and a QR code).

## Round 3 (Ben's second review)

- **Home screen:** a console-style main menu, after Black Ops' menu. Plain visits to the
  new builder open on it; deep links skip it; the logo brings it back. Its menus are built
  from `OTHER_GROUPS`. The art is `icons/rsi-meme-team-360.webp` plus an inline SVG
  blue-striped fish.
- **Search bar:** three fixed, labelled rows (Ink · Cost · Type). The search box never grows,
  because pills scroll inside it. Filter counts sit on the button corners, and Clear keeps
  its space. Nothing moves as you filter.
- **Cost slider:** a visible track with end caps and a notch per cost. Each handle shows its
  own number, and invisible native inputs on top handle dragging, keyboard and screen readers.
- **Special searches:** a gold button with a twinkling sparkle and a slow shine (off with
  reduced motion).
- **Phones:** a two-across grid of real card pictures, and a dark "Your deck … View" tab bar.
- **Card window:** no "(no rules text)" line; a compact label/value box; Compare in the
  action row.

## Phase 0 analytics

Sent to Vercel Web Analytics as custom events, from **both** builders (tagged
`builder: classic|new`): `builder_opened`, `first_card_added` (with seconds),
`deck_reached_60`, `deck_saved`, `deck_exported`, `deck_shared`. Custom
events only show up on a Vercel plan that includes them. On other plans they
are dropped silently.

## Adding Phases 3–5

Use the hooks at the bottom of `nb.js` rather than editing the panels:

```js
NBX.addDeckTab({id:"stats", label:"Stats", render: pane => { /* … */ }});
NBX.addStartOption({id:"finish", icon:"✨", label:"Finish my deck", sub:"…", run: () => { /* … */ }});
NBX.addDrawerSection("<h4>…</h4>");
```
