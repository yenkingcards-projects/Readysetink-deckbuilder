# Card prices

## What ships

Prices are a **snapshot baked into the build**. No API key, no server, no
runtime network call — the site is still one file that works offline.

`build_flounder.py` already walks every Lorcast set to fetch card images.
Lorcast's card records carry `prices.usd`, `prices.usd_foil` and a
`tcgplayer_id`, so the prices ride along on requests the build was making
anyway. **Refreshing prices costs nothing extra: it's just a rebuild.**

- `card-prices.json` — the snapshot, committed to the repo. 3,122 printings.
- Prices are attached **per printing** (an enchanted is not worth what the
  common is) and at card level for the default printing.
- `DATA.priced` is the date they were taken. The site shows that date and calls
  them a rough guide, never a live price.
- If a build runs with Lorcast down, it reads `card-prices.json` back instead of
  shipping a site with every price blanked.

**To refresh: ask me, or run `python3 build_flounder.py`.** That's the whole
procedure.

Coverage: 2,476 of 2,543 cards. The gaps are cards Lorcast has no market data
for — mostly unreleased and promo-only printings. They render as no price
rather than as $0.

## Where prices show up

- Under each card tile, when **Prices** is on (card-view menu or Settings).
  Off by default.
- The Shopping list page's $20 / $50 / $100 bundles, which pick the most
  staples that fit a budget, cheapest first.

## The one seam

```js
let PRICE_SRC = c => c.p;   // the baked snapshot
function cardPrice(c){ ... }
```

Everything that wants a price calls `cardPrice(c)`. Moving to a live feed later
is reassigning that one line.

## Affiliate links — yes, and here's the honest version

TCGplayer runs its affiliate programme **through Impact**, not in-house. You
apply, they approve or don't, and approved partners get a tracking id.
Attribution is first-click with a 48-hour window; payouts land 45 days after
month end. Public affiliate directories list the rate around 3.5%, but treat
that as hearsay until Impact shows you your own terms.

**Apply here (from TCGplayer's own developer docs):**
https://docs.tcgplayer.com/docs/tcgplayer-affiliate-program — that page links
the Impact signup form. I can't apply on your behalf and shouldn't try.

**The code is already wired.** In `flounder-search.template.html`:

```js
const TCG_AFF = "";   // put your Impact partner id here
```

Fill that in and every buy link on the site — deck, missing cards, all the
shopping bundles — starts carrying it. There is no second place to change, and
the Shopping list page automatically swaps its footer line from "Ready Set Ink
takes no cut" to a plain commission disclosure.

Leave it empty and the links are ordinary TCGplayer links. **Don't put a
guessed value in there** — a wrong id earns nothing and just attaches a
stranger's tracking to your users' purchases.

Two things worth deciding deliberately rather than by accident:

1. The site's disclaimer says it's free forever and can't charge for access.
   Affiliate revenue on outbound buy links is a different thing from charging
   users — but it's a change in what the site *is*, so make it on purpose.
2. Whatever the exact URL parameters Impact gives you, they may differ from the
   `utm_campaign / utm_medium / utm_source` triple I've assumed. Send me what
   your dashboard says and I'll match it exactly — it's a one-line change.

## Why not TCGplayer's own price API

Their pricing API is server-to-server: you POST a client id **and client
secret** for a bearer token. A static HTML file has nowhere to keep a secret —
anyone can view source — and the browser would block the call on CORS anyway.
It also appears closed to new applicants. If you're ever approved as a partner
and want live prices, the shape is a small Vercel function holding the secret;
until then the snapshot is better than nothing and costs nothing.
