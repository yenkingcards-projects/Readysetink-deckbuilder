# 824git — everything to put on GitHub

This folder is the whole repo as it should look after today. Copy its contents
over your existing `Readysetink-deckbuilder` folder, or push it as-is.

```bash
cd /path/to/Readysetink-deckbuilder
cp -R /path/to/824git/. .
git add -A
git commit -m "Lore tracker with a rules judge, plus card pages and hubs"
git push
```

Vercel redeploys on push. Nothing here needs a build step on their side —
`index.html` and `card/` are already built.

**One thing to do by hand:** delete `icon.svg` from the repo if it's still
there. It was a placeholder and the real logo icons replaced it.

---

## What's in here

### The deployed site — these are what Vercel serves

| Path | What it is |
|---|---|
| `index.html` | The whole app. 3 MB, self-contained, works offline. |
| `card/` | **2,544 pages** — one per card, plus an index. This is the SEO. |
| `deck-builder/` `search/` `collection/` `decks/` `coconut/` `loretracker/` `games/` | Seven hub pages. Real pages with real text at real paths, each with a button that opens the app on the right tab. The app is one file with tabs, so without these "the deck builder" has no URL and Google can't see it. |
| `icons/`, `favicon.ico` | Browser tab, home screen, share previews. |
| `manifest.webmanifest` | Makes it installable to a phone home screen. |
| `robots.txt`, `sitemap.xml` | 2,552 URLs for Google. |
| `vercel.json` | Cache headers, and the `/img/` proxy rewrites (off until you flip `IMG_PROXY`). |

### The source — what actually gets edited

| Path | What it is |
|---|---|
| `flounder-search.template.html` | **The only file you edit.** `index.html` is generated from it. |
| `tagger.template.html`, `notes.template.html` | The two local authoring tools. |
| `card-db.json` | **Our card database.** 2,543 cards. The asset — see CARD-DATA.md. |
| `card-prices.json` | Price snapshot, 3,122 printings. |
| `art-tags.json`, `rsi-notes.json`, `card-rules.json` | Hand-authored. Irreplaceable. |
| `supabase-*.sql` | The account/sync schema. |

### The build

| Path | What it does |
|---|---|
| `build_flounder.py` | The build. `python3 build_flounder.py` — no network, under a second. |
| `fetch_cards.py` | The **only** file that talks to anyone else's server. Optional. |
| `gen_pages.py` | Writes `card/`, the sitemap, the manifest, robots.txt. |
| `build_report.py` | Diffs against the last build. Says DO NOT SHIP when data collapses. |
| `make_icons.py` | Regenerates `icons/` from the logo. Only when the logo changes. |
| `smoke.js` | The ship gate. `node smoke.js` — about 15 seconds. |

### The docs

`README.md` · `HOW-WE-WORK.md` · `CARD-DATA.md` · `PRICES.md` ·
`BUILD-REPORT.md` (what changed in the last build) · `PARTNER-BRIEF.md` (hand
this to a collaborator) · `CLANS-design.md` (parked)

---

## Deliberately NOT here

These are in `.gitignore` and should stay out:

- `flounder-search.html` — identical to `index.html`; only the local test reads it.
- `flounder-tagger.html`, `flounder-notes.html` — generated authoring tools.
  Publishing them would put an editing UI on the public site.
- `.build-history/` — your machine's build fingerprints.

---

## The everyday commands

```bash
python3 build_flounder.py            # build from our own database — no network
python3 build_flounder.py --refresh  # fetch new cards first, then build
node smoke.js                        # ship gate
python3 gen_pages.py                 # rebuild card/ on its own
```

Read `BUILD-REPORT.md` after any `--refresh`. It tells you what's new, what got
errata'd, what moved in price — and shouts if the build looks broken.

## Two things to switch on afterwards

1. **Vercel Analytics** — the script is already in every page. Turn it on in the
   Vercel dashboard → Analytics, and it starts working.
2. **Google Search Console** — submit `https://readysetink.vercel.app/sitemap.xml`.
   2,500 pages take weeks to index; the sooner it starts the better.

And when your affiliate id arrives, it goes in one place:
`const TCG_AFF = "";` in the template.
