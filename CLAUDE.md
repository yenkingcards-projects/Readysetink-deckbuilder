# Claude Code instructions for this project

This is **Ready Set Ink**, a live Disney Lorcana card search and deck-builder
site (readysetink.com), built by Ben with a business partner, Kenny (repo
handle `lorcana707`), who runs his own AI session against this same repo and
pushes independently. Check state fresh every session; never assume it from
the last session or from PROJECT.md.

## Step 0: sync before anything else (every session)

```bash
git fetch origin
git status                    # "behind 'origin/main' by N commits"?
```

If behind:

```bash
git stash -u -m "pre-pull WIP"   # only if status shows untracked local files
git pull origin main
git stash pop                    # if you stashed. "already exists, no checkout"
                                 # means the incoming file is identical
python3 scripts/build_flounder.py
cat docs/BUILD-REPORT.md         # card counts, art-tag and rulings coverage
```

Sanity-check `docs/BUILD-REPORT.md` and `git log --oneline -20` against what
PROJECT.md claims. If something is stale, say so to Ben in one line and keep going.

Then read:
- `docs/HOW-WE-WORK.md`: the working style. Ben is the QA. Batch changes. Reply in 1-3 lines.
- `docs/PARTNER-BRIEF.md`: Kenny's side (mostly filling `data/art-tags.json`
  and `data/card-rules.json`) and the rules for hand-authored data.
- `CLAUDE.local.md` (not committed) for your plan and any handoff.

## Where things are

| Folder | What's in it | Edit it? |
|---|---|---|
| `src/` | The app: page shell (`flounder-search.template.html`), `css/`, `js/` (one file per area, see `src/README.md`), and `builder/` (the deck builder) | Yes |
| `data/` | `card-db.json` (all card data), `card-prices.json`, and the hand-authored `art-tags.json`, `card-rules.json`, `rsi-notes.json`, `meta-decks.json` | Carefully, see below |
| `public/` | What readysetink.com serves (`vercel.json` → `outputDirectory: public`) | Only the hand-made folders listed below |
| `scripts/` | The build (`build_flounder.py`, `gen_pages.py`, `build_report.py`, `fetch_cards.py`, `build_rules.py`), `paths.py`, `smoke.js` | Yes |
| `tools/` | Local-only: the art tagger (`art-tools/`, `Tag Overnight.command`), tagger and notes editor templates | Yes |
| `docs/` | How we work, partner brief, card-data and price notes, `BUILD-REPORT.md` (generated), `plans/` | Yes |
| `db/` | Supabase SQL | Ben runs these by hand |

Inside `public/`, the build writes `index.html`, `404.html`, every card, set,
keyword, franchise, character, ink and classification page, the hub pages,
`glossary/`, `learn/`, sitemaps, `robots.txt`, `llms.txt`, the manifests, the
generated `.md` files and copies of the served `data/*.json`. **Never edit those.**

Hand-made folders in `public/` that you do edit directly: `tournament/` and
`match-history/` (My Lorcana Journal), `customrules/` (customrules.readysetink.com,
has its own CLAUDE.md), `roadmap/`, `icons/`, `img/` (Coconut card images live in
`img/coconut/`), `forms/`, `sw.js`, `favicon.ico`.

## Hard rules

- Edit the app in `src/`, never the built `public/index.html`.
- Never bulk-overwrite or regenerate `data/art-tags.json`, `data/card-rules.json`
  or `data/rsi-notes.json`. They're hand-authored and irreplaceable, append only.
  `card-rules.json` entries come only from Ravensburger's published set release
  notes or comprehensive rules, never forum posts or your own reasoning.
- Card names must match exactly as `Name - Version` (e.g. `Elsa - Snow Queen`)
  across the hand-authored files or they fail silently. Check
  `docs/BUILD-REPORT.md` after every build; it flags names that stopped resolving.
- Ask Ben before structural changes to the app in `src/`.
- Don't lose user data: decks, collection, dust.
- One version of every feature. When something changes, edit it in place: no
  flags, no "classic" fallback, no v2 beside v1 (see docs/HOW-WE-WORK.md).
- You are not the only one editing this repo. Grep for call sites before
  renaming or moving anything, and prefer small, frequent commits.

## Build and ship

```bash
python3 scripts/build_flounder.py            # offline build, ~1s
python3 scripts/build_flounder.py --refresh  # also re-pulls card data and prices (~11s)
node scripts/smoke.js                        # ship gate, run before every push
```

`smoke.js` needs `playwright-core` in `/tmp/node_modules`. Commit the
`public/` changes the build makes along with your source change; Vercel
serves `public/` as-is, with no build step of its own.

Apply the /codestart lazy-senior-dev discipline for the whole session, or
invoke /continue or /codestart if Ben wants the full skill behavior.
