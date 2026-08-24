# Where the card data comes from, and who owns it

## Short version

**The card data is already yours.** It lives in `card-db.json` in this repo, and
an ordinary build never opens a network socket. Nothing on the live site fetches
card data from anybody — it is baked into the page.

**The card images are not yours**, and that is a separate decision with a
separate answer. See the second half.

## The database

`card-db.json` — 2.3 MB, 2,543 cards, committed. It is the asset. If every
upstream service disappeared tomorrow, the site would keep building from it
exactly as it does today.

```
python3 build_flounder.py              # build from our database — no network
python3 build_flounder.py --refresh    # go and get new cards first, then build
python3 fetch_cards.py                 # refresh the database only
```

Measured: an ordinary build takes **0.95 s** and does not import the networking
module at all. A `--refresh` build takes about 11 s.

`fetch_cards.py` is the only file in the project that talks to anyone else's
server. That is on purpose — the entire external dependency is one file, and it
is optional.

### Why this changed

Every build used to hit two other people's servers. That is three problems
wearing one coat:

- A build was only as reliable as somebody else's afternoon. A flaky run
  produced a site with missing artwork and no error anywhere.
- A build was not reproducible. Rebuilding last week's site was impossible,
  because "last week's upstream data" does not exist anywhere any more.
- If LorcanaJSON stopped, so did Ready Set Ink. Everything the site knows lived
  only on somebody else's machine.

Now the download is a deliberate act you choose, and `BUILD-REPORT.md` tells you
what changed each time you do it.

### The two upstreams, and what we owe them

| Source | Gives us | Licence |
|---|---|---|
| [LorcanaJSON](https://lorcanajson.org) | Card text, stats, legality, errata | Free, community-run, asks for credit |
| [Lorcast](https://lorcast.com) | Artwork URLs, market prices | Free API, asks 50–100 ms between requests |

Both are credited on the Sources page. Refreshing weekly rather than on every
build is also just good manners — it is a large fraction of the requests we
ever make.

## The images — the part that is still someone else's

Card artwork is loaded at runtime from `cards.lorcast.io` and
`api.lorcana.ravensburger.com`. This is the only external thing the live site
does. Three options, and the third is switched off waiting on you.

### 1. Leave it (current)

Costs nothing, works offline from `file://`, and if Lorcast blocks hotlinking or
changes a URL scheme, every card on the site goes blank at once.

### 2. Proxy through our own domain — **built, off by default**

`vercel.json` already rewrites `/img/lorcast/*` and `/img/rav/*` to the upstream
hosts and caches them for a year. In the template:

```js
const IMG_PROXY = false;   // ← flip to true
```

Turn it on and every card image is served from `readysetink.vercel.app/img/…`
instead. Same pictures, our URL, our cache, and Lorcast stops paying our
bandwidth bill. Opened from a file it ignores the switch and uses the original
URLs, because a rewrite needs a server — so the offline promise survives.

Cost: Vercel bandwidth, on the free tier's allowance. Reversible in one word.

### 3. Mirror the files ourselves

Download all 3,242 images and serve them from storage. Roughly **650 MB** —
too much for a git repo, so it means object storage (Vercel Blob, R2, S3) and a
real monthly cost. It is the only option that survives upstream disappearing.

### The thing to weigh before 2 or 3

Card text and stats are facts, and facts are not anybody's property. **The
artwork is Disney's**, and options 2 and 3 both mean Ready Set Ink is the thing
serving it rather than the thing pointing at it. Most fan sites do exactly this
and operate on tolerance; the site's own disclaimer already says it is
unofficial and can never charge, which is the posture that earns that tolerance.

I am not a lawyer and this is not legal advice. It is a real consideration
rather than a formality, so it is your call to make deliberately — which is why
the switch exists and why it is off.

My read: **option 2**. It costs nothing but bandwidth, it is one word to undo,
it stops us leaning on a free community API for every image on every page load,
and it gives us a single URL namespace to point somewhere else later without
touching a byte of the card data.
