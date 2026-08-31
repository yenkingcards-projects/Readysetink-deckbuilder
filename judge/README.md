# Project Judge

Project Judge is a source-backed Lorcana interaction tool that runs as a normal
ReadySetInk page at `/judge/`.

## Editing

- `index.html` contains the interface, styling, and browser-side interaction logic.
- Card identity and printed text come from the repository root `card-db.json`.
- Official release-note rulings come from the repository root `card-rules.json`.
- No separate framework, package installation, API key, or database is required.

The page is deliberately standalone so it follows ReadySetInk's existing static
Vercel deployment model. Changes pushed to the `project-judge` branch receive a
Vercel preview like other ReadySetInk changes.

## Current scope

The first functional slice reconstructs a two-card challenge: choose both exact
cards, inspect their printed abilities, enter ready/exerted/drying/damage state,
and resolve challenge legality and damage. Other interaction types are visible as
the next expansion points.

