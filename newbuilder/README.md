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
