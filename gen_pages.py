#!/usr/bin/env python3
"""
Static card pages, a sitemap, a manifest and a robots.txt.

WHY THIS EXISTS
---------------
flounder-search.html is one 3 MB file with one <title> and no description. To a
search engine that is a single blank page: a crawler does not run the app, so it
never sees a single card. Every other Lorcana site collects the traffic from
"Elsa Snow Queen Lorcana" and "Bucky ruling" all day, and this one collects
none of it — not because it is worse, but because it is invisible.

This generates one small, real, crawlable page per card. 2,543 doors into a site
that currently has one.

WHAT IT DOES NOT DO
-------------------
It does not touch index.html, and it does not change how the app works. The app
stays a single self-contained file that runs from file:// with no network. These
pages sit BESIDE it and link into it. Deleting the whole card/ directory would
leave the site exactly as it was.

Run by build_flounder.py at the end of a build. Safe to run on its own.
"""
import html as H
import glossary_data as G
import json
import os
import re
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "flounder-search.html")
CARDDIR = os.path.join(HERE, "card")
# The real domain. readysetink.com 308-redirects to www, so www is the canonical
# host. Never the *.vercel.app alias: every canonical tag, sitemap URL and
# JSON-LD url below inherits this, and Google ranks whichever host they name.
SITE = "https://www.readysetink.com"

# Every crawler that fetches pages for an AI product, named so the intent is on
# the record. A crawler that matches a named group ignores "*" completely, so
# these share the exact same rules as "*" (see ROBOTS_RULES) rather than
# inheriting them.
AI_AGENTS = [
    "GPTBot", "OAI-SearchBot", "ChatGPT-User",
    "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
    "PerplexityBot", "Perplexity-User",
    "Google-Extended", "Applebot", "Applebot-Extended",
    "Amazonbot", "Meta-ExternalAgent", "Meta-ExternalFetcher",
    "DuckAssistBot", "MistralAI-User", "cohere-ai", "CCBot",
]

ROBOTS_RULES = "Disallow: /_vercel/\nAllow: /\n"


def robots_txt():
    agents = "\n".join(f"User-agent: {a}" for a in AI_AGENTS)
    return f"""# Ready Set Ink - readysetink.com
# Free Disney Lorcana card search, deck builder, official rulings and prices.
#
# Everything public on this site is meant to be read, indexed, quoted and cited,
# by search engines and by AI agents alike. Start with the machine-readable
# overview, then use the raw data instead of scraping pages:
#   {SITE}/llms.txt
#   {SITE}/card-db.json       every card, structured
#   {SITE}/card-rules.json    official rulings, keyed by card name
#   {SITE}/meta-decks.json    current competitive deck lists
#   {SITE}/card-prices.json   dated USD price snapshot

User-agent: *
{ROBOTS_RULES}# Emerging content-signal convention; parsers that don't know it ignore the line.
Content-Signal: search=yes, ai-input=yes, ai-train=yes

# AI search, assistants and training crawlers: welcome. Same rules as above.
{agents}
{ROBOTS_RULES}
Sitemap: {SITE}/sitemap.xml
"""


def llms_txt(cards, sets, priced_on):
    n_cards = len(cards)
    n_sets = len(sets)
    return f"""# Ready Set Ink

> Free Disney Lorcana card search and deck builder. Search all {n_cards:,} cards across {n_sets} sets by what they do or by what is in the artwork, build and legality-check decks, look up official rulings, and track a collection. No account needed. Unofficial fan site, not published, endorsed or approved by Disney or Ravensburger.

Prefer the raw data files below over scraping HTML. They are static JSON, free to fetch, and updated whenever the site is rebuilt. Please cite {SITE} when you use them.

## Raw data (best for agents)

- [Card database]({SITE}/card-db.json): every card as JSON. Top-level keys: `fetched`, `priced`, `sets`, `cards`. Each card has `n` name, `v` version, `c` cost, `ik` inkable, `co` ink colors, `ty` type, `sub` subtypes, `tx` rules text, `ef` effect text, `kw` keywords, `st` strength, `wi` willpower, `lo` lore, `r` rarity, `s` set number, `num` collector number, `sto` source story, `ar` artists, `fl` flavor text, `p` / `pf` USD price (regular / foil).
- [Official rulings]({SITE}/card-rules.json): rulings from Ravensburger's set release notes, keyed by exact card name.
- [Meta decks]({SITE}/meta-decks.json): competitive deck lists grouped by point in a set's life.
- [Prices]({SITE}/card-prices.json): USD snapshot per printing, dated {priced_on or "see file"}. A rough guide, not a live quote.

## Pages

- [Home]({SITE}/): card search and the full app.
- [Glossary]({SITE}/glossary/): over 120 Lorcana terms in plain English - rules vocabulary, all 14 keyword abilities with rule numbers, formats, community slang and collecting words. Also as [markdown]({SITE}/glossary.md) and [JSON]({SITE}/glossary.json).
- [Keywords]({SITE}/keywords/): all 14 keyword abilities, one page each at `{SITE}/keywords/<keyword>/` with the rule in plain English and every card that has it.
- [Sets]({SITE}/sets/): one page per set at `{SITE}/sets/<set>/` with the cards first printed in it. Reprints appear under their original set.
- [Franchises]({SITE}/franchises/): cards grouped by Disney story, one page each at `{SITE}/franchises/<franchise>/`.
- [Characters]({SITE}/characters/): every version of each character with more than one card, at `{SITE}/characters/<character>/`.
- [Card index]({SITE}/card/): every card, one static page each at `{SITE}/card/<card-name>.html`, with text, stats, rulings and prices.
- [Deck builder]({SITE}/deck-builder/): build and share Lorcana decks with live legality checking, pull sheets and goldfishing.
- [Search]({SITE}/search/): search by rules text, cost, color, or artwork content.
- [Meta decks]({SITE}/meta-decks/): what is winning right now.
- [Collection]({SITE}/collection/): track which cards you own.
- [Games]({SITE}/games/): Lorcana guessing games.
- [Lore tracker]({SITE}/loretracker/): a free lore counter for in-person play.

## Markdown versions

Append `.md` to any card, keyword, set, franchise or character URL for a compact plain-markdown version, for example `{SITE}/card/elsa-snow-queen.md` and `{SITE}/keywords/shift.md`. Also: `{SITE}/glossary.md`, `{SITE}/keywords.md`, `{SITE}/sets.md`, `{SITE}/franchises.md`, `{SITE}/characters.md`.

## Sitemap

- [sitemap.xml]({SITE}/sitemap.xml): every page, {n_cards:,} card pages included.
"""

INK_HEX = {"Amber": "#d8a13a", "Amethyst": "#8a5fb0", "Emerald": "#3f8f5f",
           "Ruby": "#c0392b", "Sapphire": "#2f6fa8", "Steel": "#7b8794"}


def log(*a):
    print(*a, flush=True)


def esc(s):
    return H.escape(str(s if s is not None else ""), quote=True)


def slug(s):
    s = re.sub(r"['’ʼ]", "", str(s).lower())
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "card"


def load_data():
    """Pull the DATA blob straight out of the built file. The build already
    assembled it — reading it back is cheaper and less fragile than rebuilding
    the same joins a second time, and it guarantees these pages describe
    exactly what the app is showing."""
    with open(SRC, encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"var DATA=(\{.*?\});var KINDS=", src, re.S)
    if not m:
        sys.exit("! could not find the DATA blob in flounder-search.html")
    return json.loads(m.group(1))


# --------------------------------------------------------------- page chrome
CSS = """
*{box-sizing:border-box}
body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:#202638;background:#dce7f5}
a{color:#2f6fa8}
.wrap{max-width:940px;margin:0 auto;padding:20px 18px 60px}
header{background:#202638;color:#fff;padding:12px 0}
header .wrap{padding:0 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header a{color:#fff;text-decoration:none;font-weight:800}
header nav a{font-weight:600;opacity:.85;font-size:14px}
.card{display:grid;grid-template-columns:300px 1fr;gap:26px;background:#fff;
  border:1px solid #c8d3e4;border-radius:6px;padding:22px;margin-top:18px}
.card img{width:100%;border-radius:8px;display:block}
h1{font-size:30px;line-height:1.15;margin:0}
h1 small{display:block;font-size:17px;font-weight:600;color:#52648f;margin-top:3px}
.meta{margin:12px 0;font-size:14px;color:#52648f}
.pill{display:inline-block;background:#e4e7eb;border-radius:99px;padding:2px 10px;
  font-size:13px;font-weight:700;margin:0 5px 5px 0;color:#202638}
.pill.ink{color:#fff}
.stats{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
.stat{background:#dce7f5;border-radius:4px;padding:8px 14px;text-align:center;min-width:74px}
.stat b{display:block;font-size:22px;line-height:1}
.stat span{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#52648f}
.rules{background:#f5f8fc;border-left:4px solid #2f6fa8;padding:12px 15px;
  border-radius:0 4px 4px 0;white-space:pre-wrap;margin:14px 0}
.flav{font-style:italic;color:#52648f;border-left:2px solid #c8d3e4;padding-left:13px;margin:14px 0}
h2{font-size:20px;margin:30px 0 10px;padding-bottom:6px;border-bottom:2px solid #c8d3e4}
.qa{background:#fff;border:1px solid #c8d3e4;border-radius:5px;padding:14px 16px;margin-bottom:10px}
.qa .q{font-weight:800;margin-bottom:5px}
.qa .src{font-size:12px;color:#52648f;margin-top:7px}
.note{background:#fff;border:1px solid #c8d3e4;border-left:4px solid #d8a13a;
  border-radius:0 5px 5px 0;padding:14px 16px;margin-bottom:10px}
.note .kind{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;
  color:#52648f;margin-bottom:5px}
table{border-collapse:collapse;width:100%;font-size:14px;background:#fff}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e4e7eb}
th{background:#e4e7eb;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
.rel{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}
.rel a{background:#fff;border:1px solid #c8d3e4;border-radius:4px;padding:6px 11px;
  font-size:14px;text-decoration:none}
.rel a:hover{border-color:#2f6fa8}
.cta{display:inline-block;background:#2f6fa8;color:#fff;text-decoration:none;font-weight:800;
  padding:11px 20px;border-radius:5px;margin-top:8px}
footer{margin-top:44px;padding-top:18px;border-top:1px solid #c8d3e4;
  font-size:12px;color:#52648f;line-height:1.6}
.sitefoot{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:10px}
.kofiwrap{display:inline-flex;align-items:center}
.affnote{font-size:11px;color:#52648f;max-width:440px;line-height:1.4}
.buytcg{display:flex;align-items:center;gap:11px;text-decoration:none;margin-top:10px;
  padding:10px 14px;border-radius:9px;background:linear-gradient(155deg,#3d8bfd,#1f5fd6);
  box-shadow:0 3px 0 #163f94,0 6px 14px rgba(31,95,214,.35);transition:transform .1s,box-shadow .1s}
.buytcg:hover{transform:translateY(-1px);box-shadow:0 4px 0 #163f94,0 9px 18px rgba(31,95,214,.45)}
.buytcgico{flex:0 0 auto;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.2);
  display:grid;place-items:center;font-size:16px}
.buytcgtxt{flex:1;display:flex;flex-direction:column;color:#fff;line-height:1.25}
.buytcgtxt b{font-size:14.5px;font-weight:800}
.buytcgtxt span{font-size:11px;color:rgba(255,255,255,.75)}
.buytcgarrow{flex:0 0 auto;font-size:17px;color:#fff;opacity:.85}
.buyfoil{position:relative;z-index:0;background:linear-gradient(155deg,#2e2e40,#1c1c29);
  box-shadow:0 3px 0 #0e0e16,0 6px 14px rgba(0,0,0,.35)}
.buyfoil::before{content:"";position:absolute;inset:-3px;border-radius:12px;z-index:-1;
  background:conic-gradient(from 0deg,#ff3b3b,#ffb63b,#fff23b,#3bff6a,#3bcfff,#7a3bff,#ff3bd6,#ff3b3b);
  opacity:0;transition:opacity .25s}
.buyfoil:hover::before{opacity:1;animation:rainbowchase 1.8s linear infinite}
@keyframes rainbowchase{to{transform:rotate(360deg)}}
.afftiny{font-size:10.5px;color:#52648f;margin-top:4px}
.az{columns:230px;column-gap:22px}
.az a{display:block;padding:2px 0;font-size:14px;text-decoration:none;break-inside:avoid}
@media(max-width:700px){.card{grid-template-columns:1fr}h1{font-size:24px}}
"""

DISCLAIMER = (
    "Ready Set Ink is unofficial fan content, free to use. Not published, endorsed or "
    "approved by Disney or Ravensburger. © Disney. Disney Lorcana is operated by "
    "Ravensburger, an official licensee of Disney. We may earn an affiliate commission "
    "from purchases made through links on this website. This site counts page views "
    "so we can tell which parts of it are useful — no cookies and nothing that identifies you."
)

# Same redirect as flounder-search.template.html's affix()/TCG_AFF_LINK — ONE
# partner link, wrapping the real TCGplayer destination via Impact's own
# ?u=<url-encoded target> convention. Keep these two in sync by hand; there's
# no shared module between the Python build and the JS app to import from.
TCG_AFF_LINK = "https://partner.tcgplayer.com/GbYLzr"


LEGAL_LINKS = ('<a href="/glossary/">Glossary</a> · <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · '
               '<a href="/fan-content/">Fan content notice</a>')


def _legal_links():
    return LEGAL_LINKS if LEGAL_LIVE else '<a href="/glossary/">Glossary</a>'


def tcg_buy_url(full_name):
    import urllib.parse
    dest = ("https://www.tcgplayer.com/massentry?productline=Lorcana%20TCG&c="
            + urllib.parse.quote("1 " + full_name))
    return TCG_AFF_LINK + "?u=" + urllib.parse.quote(dest, safe="")


KOFI_WIDGET = (
    '<span class="kofiwrap">'
    '<script type="text/javascript" src="https://storage.ko-fi.com/cdn/widget/Widget_2.js"></script>'
    "<script type=\"text/javascript\">kofiwidget2.init('Support Ready Set Ink', '#001aff', 'J2E225ZV4T');"
    "kofiwidget2.draw();</script>"
    "</span>"
)


def head(title, desc, canonical, image=None, extra="", manifest="/manifest.webmanifest",
         icon192="/icons/icon-192.png", touch_icon="/icons/apple-touch-icon.png"):
    og_img = f'<meta property="og:image" content="{esc(image)}">' if image else ""
    tw = "summary_large_image" if image else "summary"
    return f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Ready Set Ink">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{esc(canonical)}">
{og_img}
<meta name="twitter:card" content="{tw}">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="theme-color" content="#202638">
<link rel="manifest" href="{manifest}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="192x192" href="{icon192}">
<link rel="apple-touch-icon" href="{touch_icon}">
<script defer src="/_vercel/insights/script.js"></script>
{extra}
<style>{CSS}</style>
</head><body>
<header><div class="wrap">
  <a href="/">Ready Set Ink</a>
  <nav><a href="/card/">All cards</a> · <a href="/glossary/">Glossary</a> · <a href="/">Deck builder</a></nav>
</div></header>
<div class="wrap">"""


def foot(show_kofi=True):
    # Kept off the hub pages for deck-builder/search/collection specifically —
    # those are landing pages FOR the core workflow, and Ko-fi has no business
    # sitting under someone who's there to build or search, not to browse.
    # Card pages, the all-cards index, and every other hub keep it.
    sitefoot = (f'<p class="sitefoot">{KOFI_WIDGET}<span class="affnote">Buy links go to '
                'TCGplayer through Ready Set Ink\'s affiliate link — it may earn a small '
                'commission, at no extra cost to you.</span></p>') if show_kofi else ""
    return f"""
<footer><p>{DISCLAIMER}</p>
<p class="legal">{_legal_links()}</p>
{sitefoot}
</footer>
</div></body></html>"""


# ------------------------------------------------------------------ one card
def card_page(c, by_name, by_set, sets, priced_on):
    full = c["n"] + (" - " + c["v"] if c.get("v") else "")
    sl = slug(full)
    url = f"{SITE}/card/{sl}.html"
    inks = c.get("co") or []
    setname = (sets.get(c.get("s"), {}) or {}).get("name") or ("Set " + str(c.get("s")))
    kinds = []
    if c.get("ty"):
        kinds.append(c["ty"])
    kinds += [x for x in (c.get("sub") or []) if x not in kinds]

    # Plain words, not ¤/⛉ glyphs: nobody searches for a glyph and a language
    # model can't tell what "2¤/3⛉" means.
    ink_txt = " and ".join(inks)
    kind = (c.get("ty") or "card").lower()
    lead = f"{full} is a {c.get('c', 0)}-ink {ink_txt + ' ' if ink_txt else ''}{kind} in Disney Lorcana"
    lead += f" ({setname}, {c.get('r', '')})." if c.get("r") else f" ({setname})."
    statbits = []
    if c.get("st") is not None:
        statbits.append(f"Strength {c['st']}")
    if c.get("wi") is not None:
        statbits.append(f"Willpower {c['wi']}")
    if c.get("lo"):
        statbits.append(f"Lore {c['lo']}")
    plain = re.sub(r"\s+", " ", (c.get("tx") or "")).strip()
    desc = lead + (" " + ", ".join(statbits) + "." if statbits else "")
    if plain:
        desc += " " + plain
    desc = desc[:300].rstrip()

    rulings = c.get("ru") or []
    has_price = c.get("p") is not None or c.get("pf") is not None
    # Title carries the words people type after a card name.
    # Google cuts titles near 60 characters, so use the richest version that
    # fits and let long card names fall back to the plain one.
    extras = ["Text"] + (["Rulings"] if rulings else ["Stats"]) + (["Price"] if has_price else [])
    rich = f"{full} Lorcana Card: {', '.join(extras[:-1])} & {extras[-1]}"
    candidates = [rich + " | Ready Set Ink", rich, f"{full} Lorcana Card | Ready Set Ink",
                  f"{full} Lorcana Card: Text & Stats", f"{full} Lorcana Card"]
    title = next((t for t in candidates if len(t) <= 62), candidates[-1])

    # JSON-LD. Deliberately no price and no offer: these pages are a reference,
    # not a shop, and marking them up as a product would be a claim we are not
    # in a position to make. WebPage, not Article: Article implies an author and
    # a publication date we would be inventing.
    page_ld = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title,
        "headline": f"{full} — Disney Lorcana card",
        "description": desc,
        "url": url,
        "inLanguage": "en",
        "about": {"@type": "Thing", "name": full, "description": plain or desc},
        "isPartOf": {"@type": "WebSite", "name": "Ready Set Ink", "url": SITE},
        "mainEntityOfPage": url,
    }
    if priced_on:
        page_ld["dateModified"] = priced_on
    if c.get("imgL") or c.get("img"):
        page_ld["image"] = c.get("imgL") or c.get("img")
    crumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Ready Set Ink", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Lorcana cards", "item": SITE + "/card/"},
            {"@type": "ListItem", "position": 3, "name": full, "item": url},
        ],
    }
    ld = [page_ld, crumbs]

    # Official Q&A becomes a real FAQPage, which is the whole reason a ruling
    # is worth publishing: it is the question somebody typed into Google.
    if rulings:
        ld.append({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [{
                "@type": "Question", "name": r.get("q", ""),
                "acceptedAnswer": {"@type": "Answer", "text": r.get("a", "")},
            } for r in rulings if r.get("q")],
        })
    extra = '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>"
    extra += md_link_tag(url[:-5] + ".md")

    img = c.get("imgL") or c.get("img") or ""
    out = [head(title, desc, url, img, extra)]

    out.append('<div class="card"><div>')
    if img:
        out.append(f'<img src="{esc(img)}" alt="{esc(full)} Lorcana card" width="674" height="940" loading="eager">')
    out.append("</div><div>")
    out.append(f'<h1>{esc(c["n"])}' + (f'<small>{esc(c["v"])}</small>' if c.get("v") else "") + "</h1>")

    out.append('<div class="stats">')
    out.append(f'<div class="stat"><b>{c.get("c", 0)}</b><span>Cost</span></div>')
    if c.get("st") is not None:
        out.append(f'<div class="stat"><b>{c["st"]}</b><span>Strength</span></div>')
    if c.get("wi") is not None:
        out.append(f'<div class="stat"><b>{c["wi"]}</b><span>Willpower</span></div>')
    if c.get("lo") is not None:
        out.append(f'<div class="stat"><b>{c["lo"]}</b><span>Lore</span></div>')
    out.append("</div>")

    out.append("<div>")
    for i in inks:
        out.append(f'<span class="pill ink" style="background:{INK_HEX.get(i, "#52648f")}">{esc(i)}</span>')
    for k in kinds:
        out.append(f'<span class="pill">{esc(k)}</span>')
    out.append(f'<span class="pill">{esc(c.get("r", ""))}</span>')
    out.append(f'<span class="pill">{"Inkable" if c.get("ik") else "Not inkable"}</span>')
    out.append("</div>")

    if c.get("tx"):
        out.append(f'<div class="rules">{esc(c["tx"])}</div>')
    if c.get("fl"):
        out.append(f'<div class="flav">{esc(c["fl"])}</div>')

    line = [f"{esc(setname)} · #{esc(c.get('num'))}"]
    if c.get("sto"):
        line.append(esc(c["sto"]))
    if c.get("ar"):
        line.append("Illustrated by " + esc(", ".join(c["ar"])))
    out.append('<div class="meta">' + " · ".join(line) + "</div>")

    out.append(f'<a class="cta" href="/#q={esc(sl.replace("-", "%20"))}">Open in the deck builder →</a>')
    out.append(f'<a class="buytcg" href="{esc(tcg_buy_url(full))}" target="_blank" rel="sponsored noopener">'
               f'<span class="buytcgico">🛒</span>'
               f'<span class="buytcgtxt"><b>Buy on TCGplayer</b><span>Opens in a new tab</span></span>'
               f'<span class="buytcgarrow">↗</span></a>')
    out.append(f'<a class="buytcg buyfoil" href="{esc(tcg_buy_url(full))}" target="_blank" rel="sponsored noopener">'
               f'<span class="buytcgico">✨</span>'
               f'<span class="buytcgtxt"><b>Buy foil on TCGplayer</b><span>Search results — pick the foil listing</span></span>'
               f'<span class="buytcgarrow">↗</span></a>')
    out.append('<div class="afftiny">Affiliate links — Ready Set Ink may earn a commission, at no extra cost to you.</div>')
    out.append("</div></div>")

    if rulings:
        out.append(f"<h2>Official rulings ({len(rulings)})</h2>")
        for r in rulings:
            src = f'<div class="src">Official set release notes{" — " + esc(r["s"]) if r.get("s") else ""}</div>' if r.get("s") else ""
            out.append(f'<div class="qa"><div class="q">{esc(r.get("q", ""))}</div>'
                       f'<div>{esc(r.get("a", ""))}</div>{src}</div>')

    notes = c.get("rsi") or []
    if notes:
        out.append(f"<h2>Ready Set Ink notes ({len(notes)})</h2>")
        for nt in notes:
            out.append(f'<div class="note"><div class="kind">{esc(nt.get("k", "ruling"))}</div>'
                       f'<div>{esc(nt.get("t", ""))}</div></div>')

    prs = c.get("pr") or []
    if len(prs) > 1:
        out.append("<h2>Every printing</h2><table><tr><th>Set</th><th>Number</th><th>Rarity</th></tr>")
        for pr in prs:
            sn = (sets.get(pr.get("s"), {}) or {}).get("name") or ("Set " + str(pr.get("s")))
            out.append(f"<tr><td>{esc(sn)}</td><td>#{esc(pr.get('num'))}</td><td>{esc(pr.get('r', ''))}</td></tr>")
        out.append("</table>")

    chips = []
    if c.get("s") in BROWSE["set"]:
        chips.append(f'<a href="/sets/{BROWSE["set"][c["s"]]}/">{esc(setname)} card list</a>')
    if c.get("sto") in BROWSE["fr"]:
        chips.append(f'<a href="/franchises/{BROWSE["fr"][c["sto"]]}/">All {esc(c["sto"])} cards</a>')
    if c.get("ty") == "Character" and c["n"] in BROWSE["ch"]:
        chips.append(f'<a href="/characters/{BROWSE["ch"][c["n"]]}/">Every {esc(c["n"])} card</a>')
    for k in (c.get("kw") or []):
        kn = k[0] if isinstance(k, (list, tuple)) else k
        if kn in BROWSE["kw"]:
            chips.append(f'<a href="/keywords/{BROWSE["kw"][kn]}/">{esc(kn)}: what it does</a>')
    if chips:
        out.append("<h2>Browse</h2><div class='rel'>" + "".join(dict.fromkeys(chips)) + "</div>")

    # Internal links. A crawler that lands on one card should be able to walk to
    # every other one — this is what turns 2,543 orphan pages into a site.
    same_char = [x for x in by_name.get(c["n"], []) if x is not c][:8]
    same_set = [x for x in by_set.get(c.get("s"), []) if x is not c][:12]
    if same_char:
        out.append(f"<h2>Other versions of {esc(c['n'])}</h2><div class='rel'>")
        for x in same_char:
            fx = x["n"] + (" - " + x["v"] if x.get("v") else "")
            out.append(f'<a href="/card/{slug(fx)}.html">{esc(fx)}</a>')
        out.append("</div>")
    if same_set:
        out.append(f"<h2>More from {esc(setname)}</h2><div class='rel'>")
        for x in same_set:
            fx = x["n"] + (" - " + x["v"] if x.get("v") else "")
            out.append(f'<a href="/card/{slug(fx)}.html">{esc(fx)}</a>')
        out.append("</div>")

    out.append(foot())
    return sl, "".join(out)


# ---------------------------------------------------------------- hub pages
# The app is ONE index.html with tabs inside it. That means "the deck builder"
# has no URL — you cannot link to it, and Google cannot index it, because from
# the outside the whole site is a single page called "Ready Set Ink".
#
# These are small real pages at real paths that fix both halves. Each one has
# actual words on it for a search engine to read, and a button that opens the
# app already on the right tab (via the #tab= link the template now understands).
#
# Paths, not subdomains. decks.readysetink.com would be a separate site that
# splits Google's opinion of us in two; /decks is the same site, and everything
# it earns pools into one domain.
HUBS = [
    {"slug": "deck-builder", "tab": "tDeck",
     "title": "Lorcana deck builder",
     "lede": "Build a Disney Lorcana deck with every card in the game, live legality "
             "checking, and advice on what to change.",
     "body": [
        ("What it does", [
            "Search 2,543 cards and click to add. Formats are enforced as you build — "
            "ink limits, copy limits, deck size — so an illegal deck tells you the "
            "moment it becomes one.",
            "The deck panel groups your list the way a player thinks about it: "
            "characters, actions, songs, items, locations. Not one flat column "
            "sorted by cost.",
            "Undo is Ctrl+Z, and it covers everything — adds, removes, clears, even "
            "deleting a deck.",
        ]),
        ("It tells you what's wrong", [
            "Every deck gets read for the things that quietly lose games: not enough "
            "inkable cards, no removal, no card draw, songs with nobody who can sing "
            "them, Shift cards with nothing to shift onto.",
            "Goldfish it and the site draws your opening hand a thousand times, then "
            "reports how often you actually had a play on turn two.",
            "Click any card and it shows what else could go in that slot — cards that "
            "do the same job, that you can afford to play, flagged when they also fix "
            "something the deck is missing.",
        ]),
        ("Then get the cards", [
            "Every deck has a pull sheet in the order you'd walk your own binder.",
            "Anything you're missing becomes a message you can send a friend, or a "
            "TCGplayer cart you can buy in one click.",
        ]),
     ]},
    {"slug": "search", "tab": "tSearch",
     "title": "Lorcana card search",
     "lede": "Search every Disney Lorcana card by what it does — or by what is in "
             "the artwork.",
     "body": [
        ("Search by what a card does", [
            "One click for the searches that used to mean reading every card: cards "
            "that ping damage, cards that punish the whole table, cards that make "
            "opponents lose lore, cards that want to be discarded, bounce split by "
            "whose hand it goes back to.",
            "Plain English works too. Type “steel action” or “sapphire item "
            "floodborn” and press Enter.",
        ]),
        ("Search by what is in the picture", [
            "Type “blue dog” and get Stitch. The artwork is tagged by hand — "
            "colours, animals, clothing, settings, objects — so you can find a card "
            "you remember seeing without remembering its name.",
        ]),
        ("Every search is a link", [
            "Whatever you build, the address bar keeps it. Copy the link and it "
            "reopens exactly that search for anyone you send it to.",
        ]),
     ]},
    {"slug": "collection", "tab": "tColl",
     "title": "Lorcana collection tracker",
     "lede": "Track which Lorcana cards you own, per printing, per foil — and see "
             "what your collection is worth.",
     "body": [
        ("Per printing, not per card", [
            "An enchanted is not the same thing as the common, so the tracker counts "
            "printings. Normal and foil are counted separately.",
            "Bulk tools fill a whole set at once rather than making you tick three "
            "thousand boxes.",
        ]),
        ("It connects to your decks", [
            "Build a deck and the site knows which cards you already have — the "
            "borrow list and the shopping list are both built from the gap.",
            "Export the lot to a spreadsheet whenever you like, with prices and a "
            "total value.",
        ]),
     ]},
    {"slug": "decks", "tab": "tDecks",
     "title": "Your saved Lorcana decks",
     "lede": "Every deck you've built, with pull sheets, borrow lists and shareable "
             "links.",
     "body": [
        ("Pull sheets", [
            "Tell the site how you keep your cards and every saved deck comes out in "
            "that order — so you walk your binder once instead of hunting the same "
            "box four times.",
        ]),
        ("Share a deck as a link", [
            "Copy a link and anyone who opens it gets their own editable copy. "
            "Nothing they already had is touched.",
            "Paste a list in from anywhere else and it imports — TCGplayer mass "
            "entry, exports from other deck sites, or just “4 Elsa - Snow Queen” "
            "typed out.",
        ]),
        ("What it costs", [
            "Each deck shows roughly what it would cost to buy, and how much of that "
            "you already own.",
        ]),
     ]},
    # Recommended decks moved off the tab bar and into Other, so this landing
    # page has to deep-link the same way the lore tracker and games ones do —
    # tab=tOther plus op=meta. Left as tab=tMeta it silently fell back to the
    # deck builder, because showTab only honours a tab that still exists.
    {"slug": "meta-decks", "tab": "tOther", "op": "meta",
     "title": "Recommended Lorcana decks by set",
     "lede": "The decks worth playing in the current Lorcana set — one list per ink "
             "pair, split into early set, mid set and Set Championship.",
     "body": [
        ("One deck per ink pair", [
            "A format is not one best deck, it is fifteen ink pairs and a pecking "
            "order. Each block here holds the list worth playing in each pair, so "
            "you can start from the colours you already own rather than buying into "
            "whatever won last weekend.",
        ]),
        ("Three points in the set", [
            "Early set is the first few weeks, before anyone has solved it. Mid set "
            "is where the format lands once people have. Set Champs is what to sleeve "
            "when the room is prepared and you expect the mirror.",
        ]),
        ("Written up, not just listed", [
            "Every deck says why it is built the way it is, the lines to look for, "
            "and what it does not want to sit across from.",
            "There is a mulligan guide and a list of what to prioritise, plus the "
            "deck's real strengths and weaknesses — the ones that decide games, not "
            "a sales pitch.",
        ]),
        ("Take a copy", [
            "One click copies any list into your own decks, where you can change "
            "whatever you like. The published list is left exactly as it is.",
        ]),
     ]},
    {"slug": "coconut", "tab": "tDeck", "sub": "guided",
     "title": "Guided Coconut deck building",
     "lede": "Coconut is a Lorcana format built around one legendary character. "
             "Pick yours and the site builds around it with you.",
     "body": [
        ("How Coconut works", [
            "One legendary card is your Coconut. Three inks, singleton — one copy of "
            "everything else — and sixty cards.",
            "Your Coconut can be played from outside the deck, so it is the one card "
            "you always have.",
        ]),
        ("Guided, or prebuilt", [
            "Guided walks you through it: pick a Coconut, see the filters that suit "
            "it, build with the rules enforced as you go.",
            "Or open a prebuilt deck for any Coconut, read why each card is in there "
            "and what your first three turns look like, then copy it and make it "
            "yours.",
        ]),
     ]},
    {"slug": "loretracker", "tab": "tOther", "op": "lore",
     "pwa": {"manifest": "/manifest-lore.webmanifest", "icon192": "/icons/lore-icon-192.png",
             "touch_icon": "/icons/lore-apple-touch-icon.png"},
     "title": "Lorcana lore tracker with a rules judge",
     "lede": "Set your format and best-of once, then track two to four players on "
             "numbers big enough to read from the other side of the table — with "
             "every card, keyword and official ruling one tap away.",
     "body": [
        ("Set up once, exactly how you play", [
            "Players, format — Core, Infinity, Coconut, or your own custom lore "
            "total — casual or tournament, and one game, best of three, or a "
            "custom-length series. Save it as your default and it's already right "
            "next time.",
            "Huge numbers, huge buttons, and the far seat rotated 180° so the "
            "person across from you reads it the right way up. Rename anybody by "
            "tapping their name. Goes full screen.",
        ]),
        ("The JUDGE button", [
            "Press \U0001f590 JUDGE and the score locks — nobody nudges a total "
            "while a rules question is open. A timer counts up while you're in "
            "there, and closing it back out offers a time-extension reminder if "
            "the ruling ran long. Casual games only — at a tournament, it tells "
            "you to call an actual judge instead.",
            "Search any card by name and read its text with every keyword on it "
            "turned into a button: tap Ward, Shift or Resist and get the rule.",
            "Cards show Ravensburger's own published rulings where they exist, "
            "attributed to the set release notes they came from.",
            "Or browse the arguments people actually stop the game over — timing, "
            "end-of-turn effects, challenging, singing, and what to do when "
            "something went wrong.",
        ]),
        ("Best of however many", [
            "Win a game and the screen throws fish while it logs exactly which "
            "game you won — no re-asking best-of-three every single game. Decide "
            "the match and it hands you off to Play Hub to report the result.",
            "Playing with Donald Duck – Flustered Sorcerer in the mix? Flag "
            "who's got it in Settings and their opponent's win total jumps to 25 "
            "until you press the button for when the duck's gone.",
        ]),
        ("Make it yours", [
            "Give each seat its own colour — pick from the palette, go random, "
            "blue striped fish, or Chaos, which fades to a new colour on every "
            "prime-numbered second and throws a burst of fish every time someone "
            "taps plus or minus.",
            "Add it to your home screen as its own app, with its own icon, "
            "separate from the rest of Ready Set Ink.",
        ]),
     ]},
    {"slug": "games", "tab": "tOther", "op": "guess",
     "title": "Lorcana card games",
     "lede": "Guess the card from a sliver of its art, from a named ability, or from "
             "its stats one fact at a time.",
     "body": [
        ("The guessing games", [
            "Guess the card from a zoomed crop of the artwork — zoom out if you must, "
            "it's worth less.",
            "Guess the ability: a named ability and five cards, one of them owns it.",
            "Guess from the facts: cost, then strength, then willpower, then the "
            "artist. Each fact you need costs you a point.",
        ]),
        ("And a fish", [
            "Feed Flounder is an idle game. He swims after your finger, eats, and "
            "earns you dust you can spend on effects for his card.",
        ]),
     ]},
]


def hub_page(h, cards):
    url = f"{SITE}/{h['slug']}/"
    deep = "/#tab=" + h["tab"]
    if h.get("op"):
        deep += "&op=" + h["op"]
    if h.get("sub"):
        deep += "&sub=" + h["sub"]
    head_kwargs = {}
    pwa = h.get("pwa")
    if pwa:
        # This hub gets its OWN manifest + icon (set above), so "Add to Home
        # Screen" installs it as its own app rather than a shortcut to the
        # main one. The manifest's start_url carries ?app=1; this redirects
        # a launch from that installed icon (or any standalone window)
        # straight into the tool instead of showing the SEO copy below —
        # a plain browser visit to this URL is untouched.
        head_kwargs = {"manifest": pwa["manifest"], "icon192": pwa["icon192"], "touch_icon": pwa["touch_icon"],
            "extra": ('<script>(function(){if(location.search.indexOf("app=1")>=0'
                      '||(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)'
                      f'||window.navigator.standalone)location.replace("{deep}")}})()</script>')}
    out = [head(f"{h['title']} · Ready Set Ink", h["lede"], url, **head_kwargs)]
    out.append(f"<h1>{esc(h['title'])}</h1>")
    out.append(f'<p style="font-size:18px;color:#52648f">{esc(h["lede"])}</p>')
    out.append(f'<a class="cta" href="{deep}">Open it →</a>')
    for heading, paras in h["body"]:
        out.append(f"<h2>{esc(heading)}</h2>")
        for para in paras:
            out.append(f"<p>{esc(para)}</p>")
    # Cross-links, so a crawler landing on any hub can reach all the others.
    out.append("<h2>The rest of Ready Set Ink</h2><div class='rel'>")
    for other in HUBS:
        if other["slug"] != h["slug"]:
            out.append(f'<a href="/{other["slug"]}/">{esc(other["title"])}</a>')
    out.append(f'<a href="/glossary/">Lorcana glossary</a>')
    out.append(f'<a href="/card/">All {len(cards):,} cards</a></div>')
    out.append(foot(show_kofi=h["slug"] not in ("deck-builder", "search", "collection")))
    return "".join(out)


def index_page(cards, sets):
    url = f"{SITE}/card/"
    desc = (f"Every one of the {len(cards):,} Disney Lorcana cards, with rules text, "
            "official rulings and a deck builder that searches them by what is in the artwork.")
    out = [head("Every Disney Lorcana card · Ready Set Ink", desc, url)]
    out.append(f"<h1>Every Lorcana card</h1><p>{esc(desc)}</p>")
    order = sorted(sets.items(), key=lambda kv: str(kv[1].get("d", "")), reverse=True)
    for code, meta in order:
        rows = [c for c in cards if c.get("s") == code]
        if not rows:
            continue
        rows.sort(key=lambda c: (c["n"], c.get("v") or ""))
        out.append(f"<h2>{esc(meta.get('name') or ('Set ' + str(code)))} ({len(rows)})</h2><div class='az'>")
        for c in rows:
            fx = c["n"] + (" - " + c["v"] if c.get("v") else "")
            out.append(f'<a href="/card/{slug(fx)}.html">{esc(fx)}</a>')
        out.append("</div>")
    out.append(foot())
    return "".join(out)


# The placeholder SVG that used to live here is gone: the real Ready Set Ink
# logo is in icons/, generated once by make_icons.py from Ben's PNG.

MANIFEST = {
    "name": "Ready Set Ink", "short_name": "Ready Set Ink",
    "description": "Disney Lorcana card search and deck builder.",
    "start_url": "/", "scope": "/", "display": "standalone",
    "background_color": "#dce7f5", "theme_color": "#202638",
    "icons": [
        {"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        # Padded, on solid carbon. Android crops a home-screen icon to a circle
        # or a squircle; a full-bleed badge loses the ring with the wording on
        # it. "maskable" is the promise that the outer 20% is expendable.
        {"src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}

# A separate installable app, own icon, own name — so "Add to Home Screen" on
# /loretracker/ doesn't just make a second shortcut to the main site. start_url
# carries ?app=1, which hub_page()'s redirect script checks for to jump
# straight into the tracker instead of showing the SEO landing copy.
LORE_MANIFEST = {
    "name": "Lore Tracker · Ready Set Ink", "short_name": "Lore Tracker",
    "description": "A Disney Lorcana lore counter with a rules judge built in.",
    "start_url": "/loretracker/?app=1", "scope": "/", "display": "standalone",
    "background_color": "#202638", "theme_color": "#202638",
    "icons": [
        {"src": "/icons/lore-icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "/icons/lore-icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "/icons/lore-icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}


# ------------------------------------------------------------------ glossary
GLOSSARY_CSS = """<style>
.gtoc{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 4px}
.gtoc a{background:#fff;border:1px solid #c8d3e4;border-radius:99px;padding:3px 12px;font-size:14px;text-decoration:none}
dl.gl{margin:0}
dl.gl dt{font-weight:800;font-size:18px;margin-top:18px;scroll-margin-top:12px}
dl.gl dt a{color:inherit;text-decoration:none}
dl.gl dd{margin:4px 0 0;max-width:70ch}
dl.gl .lor,dl.gl .ex,dl.gl .src{display:block;font-size:15px;margin-top:3px;color:#52648f}
dl.gl .ex{font-style:italic}
</style>"""


def keyword_counts(cards):
    n = {}
    for c in cards:
        for k in (c.get("kw") or []):
            name = k[0] if isinstance(k, (list, tuple)) else k
            n.setdefault(name, set()).add(c["n"] + "|" + str(c.get("v")))
    return {k: len(v) for k, v in n.items()}


def glossary_page(cards):
    url = f"{SITE}/glossary/"
    n = len(G.T)
    desc = (f"{n} Disney Lorcana terms in plain English: the rules vocabulary, all 14 keyword abilities "
            "with official rule numbers, formats, deck slang and collecting words.")
    counts = keyword_counts(cards)
    ld = {"@context": "https://schema.org", "@type": "DefinedTermSet", "name": "Disney Lorcana glossary",
          "description": desc, "url": url, "inLanguage": "en",
          "hasDefinedTerm": [{"@type": "DefinedTerm", "name": x["term"], "description": x["d"],
                              "url": f"{url}#{x['id']}", "inDefinedTermSet": url} for x in G.T]}
    extra = '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>" + GLOSSARY_CSS
    out = [head("Disney Lorcana glossary: terms, keywords and slang", desc, url, extra=extra)]
    out.append("<h1>Disney Lorcana glossary</h1>")
    out.append(f"<p>{esc(desc)}</p>")
    out.append('<p style="font-size:15px;color:#52648f">Rules vocabulary and keywords are checked against the '
               f"Comprehensive Rules version {G.RULES_VERSION} (effective {G.RULES_DATE}). Definitions here are our own "
               f'plain-English explanations; the <a href="{G.OFFICIAL_RULES_URL}" rel="noopener">official documents</a> '
               "always win if they differ. Slang is informal and varies by player.</p>")
    out.append('<div class="gtoc">' + "".join(f'<a href="#{cid}">{esc(title)}</a>' for cid, title, _ in G.CATEGORIES) + "</div>")
    for cid, title, blurb in G.CATEGORIES:
        out.append(f'<h2 id="{cid}">{esc(title)}</h2><p>{esc(blurb)}</p><dl class="gl">')
        for x in (y for y in G.T if y["cat"] == cid):
            out.append(f'<dt id="{x["id"]}"><a href="#{x["id"]}">{esc(x["term"])}</a></dt><dd>{esc(x["d"])}')
            if x["l"]:
                out.append(f'<span class="lor">In Lorcana: {esc(x["l"])}</span>')
            if x["s"]:
                out.append(f'<span class="ex">&ldquo;{esc(x["s"])}&rdquo;</span>')
            bits = []
            if x["r"]:
                bits.append(f"Official rule {esc(x['r'])}")
            if x["k"] and counts.get(x["k"]):
                bits.append(f"on {counts[x['k']]:,} cards")
            if x["k"] in BROWSE["kw"]:
                bits.append(f'<a href="/keywords/{BROWSE["kw"][x["k"]]}/">see every card</a>')
            if bits:
                out.append(f'<span class="src">{" · ".join(bits)}</span>')
            out.append("</dd>")
        out.append("</dl>")
    out.append('<h2>Keep going</h2><div class="rel"><a href="/search/">Search every card</a>'
               '<a href="/deck-builder/">Deck builder</a><a href="/meta-decks/">Meta decks</a>'
               f'<a href="/card/">All {len(cards):,} cards</a></div>')
    out.append(foot())
    return "".join(out)


def glossary_json(cards):
    counts = keyword_counts(cards)
    return {
        "name": "Disney Lorcana glossary", "url": f"{SITE}/glossary/", "publisher": "Ready Set Ink",
        "rulesVersion": G.RULES_VERSION, "rulesEffective": G.RULES_DATE,
        "note": "Plain-English definitions written by Ready Set Ink. Unofficial; the official rules documents win.",
        "categories": [{"id": a, "title": b, "description": c} for a, b, c in G.CATEGORIES],
        "terms": [{"id": x["id"], "term": x["term"], "category": x["cat"], "definition": x["d"],
                   "lorcana": x["l"], "example": x["s"], "officialRule": x["r"],
                   "cardCount": counts.get(x["k"]) if x["k"] else None,
                   "url": f"{SITE}/glossary/#{x['id']}"} for x in G.T],
    }


def glossary_md(cards):
    counts = keyword_counts(cards)
    out = ["# Disney Lorcana glossary", "",
           f"Source: {SITE}/glossary/ . Plain-English definitions by Ready Set Ink, checked against the "
           f"Comprehensive Rules {G.RULES_VERSION} (effective {G.RULES_DATE}). Unofficial; official documents win.", ""]
    for cid, title, blurb in G.CATEGORIES:
        out += [f"## {title}", "", blurb, ""]
        for x in (y for y in G.T if y["cat"] == cid):
            line = f"- **{x['term']}**: {x['d']}"
            if x["l"]:
                line += f" In Lorcana: {x['l']}"
            if x["r"]:
                line += f" (Official rule {x['r']}"
                line += f"; on {counts[x['k']]:,} cards)" if x["k"] and counts.get(x["k"]) else ")"
            out.append(line)
        out.append("")
    return "\n".join(out)


# ------------------------------------------------------------------ legal pages
# Flip to True only after the [BRACKETED] blanks are filled and a lawyer has read
# the drafts. While False: the footers don't link to them, and .vercelignore keeps
# them out of the deploy, so nobody sees a page with a placeholder on it.
LEGAL_LIVE = False
# PRELIMINARY DRAFTS. Not reviewed by a lawyer. Structure follows what other
# Lorcana fan sites publish (plain-language, sectioned, fan-content statement up
# front). Every [BRACKETED] value is a gap only the site owner can fill. Pages
# are noindex until reviewed so nothing quotes a draft as authoritative.
LEGAL_NOINDEX = '<meta name="robots" content="noindex,follow">'
LEGAL_BANNER = ('<p style="background:#fff3cd;border:1px solid #e0c36a;border-radius:6px;padding:10px 14px">'
                "<b>Preliminary draft.</b> This page has not been reviewed by a lawyer and may change. "
                "It is a plain-language description of how the site works today, not legal advice.</p>")

def legal_page(slug_, title, sections, intro):
    url = f"{SITE}/{slug_}/"
    desc = f"{title} for Ready Set Ink, a free unofficial Disney Lorcana card search and deck builder."
    out = [head(f"{title} · Ready Set Ink", desc, url, extra=LEGAL_NOINDEX)]
    out.append(f"<h1>{esc(title)}</h1>")
    out.append(f'<p style="color:#52648f">Last updated {date.today().isoformat()}</p>')
    out.append(LEGAL_BANNER)
    if intro:
        out.append(f"<p>{intro}</p>")
    for h2, paras in sections:
        out.append(f"<h2>{esc(h2)}</h2>")
        for p in paras:
            # paragraphs may carry a link, so they are authored as safe HTML above
            out.append(f"<p>{p}</p>")
    out.append(foot(show_kofi=False))
    return "".join(out)


# ------------------------------------------------------- browse pages + markdown
# Keyword, set, franchise and character pages, plus a plain-markdown twin of every
# card. They exist for the same reason the card pages do: each one answers a
# search somebody actually types ("all Shift cards", "Frozen Lorcana cards",
# "Set 6 card list") with a real list built from card-db.json, and links onward.
# A markdown twin sits next to each page (append .md) because agents read
# markdown more cheaply and more reliably than HTML.
BROWSE = {"set": {}, "fr": {}, "kw": {}, "ch": {}}
MIN_FRANCHISE_CARDS = 3     # below this a page would be thin; the index lists it unlinked
MIN_CHARACTER_CARDS = 2


def fullname(c):
    return c["n"] + (" - " + c["v"] if c.get("v") else "")


def clip(text, n=300):
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= n:
        return text
    return text[:n].rsplit(" ", 1)[0].rstrip(",;:") + "..."


def pick_title(options, limit=62):
    return next((t for t in options if len(t) <= limit), options[-1])


def nice_date(iso):
    try:
        y, m, d = (int(x) for x in str(iso).split("-"))
        if y < 2023:                       # placeholder dates like 1970-01-01
            return ""
        return date(y, m, d).strftime("%B ") + f"{d}, {y}"
    except Exception:
        return ""


def is_upcoming(iso):
    try:
        return date(*(int(x) for x in str(iso).split("-"))) > date.today()
    except Exception:
        return False


def when(meta):
    """'released September 1, 2023' / 'releases October 23, 2026' / '' when the date is unusable."""
    nd = nice_date((meta or {}).get("d"))
    if not nd:
        return ""
    return ("releases " if is_upcoming(meta.get("d")) else "released ") + nd


def set_title(code, meta):
    name = (meta or {}).get("name") or f"Set {code}"
    return name, (f"Set {code}" if str(code).isdigit() else "Illumineer's Quest")


def build_browse(cards, sets):
    used = set()

    def uniq(base):
        sl, i = slug(base), 2
        while sl in used:
            sl, i = f"{slug(base)}-{i}", i + 1
        used.add(sl)
        return sl

    for code, meta in sets.items():
        BROWSE["set"][code] = slug(set_title(code, meta)[0])
    for name in sorted({c["sto"] for c in cards if c.get("sto")}):
        if sum(1 for c in cards if c.get("sto") == name) >= MIN_FRANCHISE_CARDS:
            BROWSE["fr"][name] = slug(name)
    ch = {}
    for c in cards:
        if c.get("ty") == "Character":
            ch[c["n"]] = ch.get(c["n"], 0) + 1
    for name, n in sorted(ch.items()):
        if n >= MIN_CHARACTER_CARDS:
            BROWSE["ch"][name] = slug(name)
    for x in G.T:
        if x["cat"] == "keywords" and x["k"]:
            BROWSE["kw"][x["k"]] = x["id"]


def kw_value(c, kwname):
    for k in (c.get("kw") or []):
        if (k[0] if isinstance(k, (list, tuple)) else k) == kwname:
            return k[1] if isinstance(k, (list, tuple)) and len(k) > 1 else None
    return None


def card_rows(rows, slug_of, kwname=None):
    head_ = "<tr><th>Card</th><th>Ink</th><th>Cost</th><th>Type</th><th>Rarity</th>" + \
            (f"<th>{esc(kwname)}</th>" if kwname else "") + "</tr>"
    out = ["<table>", head_]
    for c in rows:
        link = f'<a href="/card/{slug_of[id(c)]}.html">{esc(fullname(c))}</a>'
        extra = ""
        if kwname:
            v = kw_value(c, kwname)
            extra = f"<td>{'' if v is None else esc(v)}</td>"
        out.append(f"<tr><td>{link}</td><td>{esc(' / '.join(c.get('co') or []))}</td><td>{esc(c.get('c', ''))}</td>"
                   f"<td>{esc(c.get('ty', ''))}</td><td>{esc(c.get('r', ''))}</td>{extra}</tr>")
    out.append("</table>")
    return "".join(out)


def crumb_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u}
                                for i, (n, u) in enumerate(items)]}


def list_ld(name, url, desc, rows, slug_of, crumbs):
    return [{"@context": "https://schema.org", "@type": "CollectionPage", "name": name, "url": url,
             "description": desc, "inLanguage": "en", "isPartOf": {"@type": "WebSite", "name": "Ready Set Ink", "url": SITE},
             "mainEntity": {"@type": "ItemList", "numberOfItems": len(rows),
                            "itemListElement": [{"@type": "ListItem", "position": i + 1,
                                                 "url": f"{SITE}/card/{slug_of[id(c)]}.html", "name": fullname(c)}
                                                for i, c in enumerate(rows)]}},
            crumb_ld(crumbs)]


def md_link_tag(md_url):
    return f'<link rel="alternate" type="text/markdown" href="{esc(md_url)}">'


def browse_page(url, title, desc, h1, lede, body_html, ld, md_url):
    extra = '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>" + md_link_tag(md_url)
    out = [head(title, desc, url, extra=extra)]
    out.append(f"<h1>{esc(h1)}</h1><p>{lede}</p>")
    out.append(body_html)
    out.append('<h2>Keep browsing</h2><div class="rel"><a href="/sets/">All sets</a><a href="/franchises/">All franchises</a>'
               '<a href="/characters/">All characters</a><a href="/keywords/">All keywords</a>'
               '<a href="/glossary/">Glossary</a><a href="/card/">Every card</a></div>')
    out.append(foot())
    return "".join(out)


def md_list(title, url, intro, rows, slug_of, kwname=None):
    out = [f"# {title}", "", f"Source: {url}", "", intro, ""]
    for c in rows:
        bits = [" / ".join(c.get("co") or []), f"cost {c.get('c', '')}", c.get("ty") or "", c.get("r") or ""]
        if kwname:
            v = kw_value(c, kwname)
            bits.append(f"{kwname}{'' if v is None else ' ' + str(v)}")
        out.append(f"- [{fullname(c)}]({SITE}/card/{slug_of[id(c)]}.html): " + ", ".join(b for b in bits if b))
    return "\n".join(out) + "\n"


def count_by(rows, key):
    n = {}
    for c in rows:
        for v in (c.get(key) if isinstance(c.get(key), list) else [c.get(key)]):
            if v:
                n[v] = n.get(v, 0) + 1
    return n


def breakdown(d, order=None):
    items = sorted(d.items(), key=lambda kv: (order.index(kv[0]) if order and kv[0] in order else 99, -kv[1]))
    return ", ".join(f"{v:,} {k}" for k, v in items)


RARITY_ORDER = ["Common", "Uncommon", "Rare", "Super Rare", "Legendary", "Special"]


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def keyword_pages(cards, slug_of):
    urls, entries = [], [x for x in G.T if x["cat"] == "keywords" and x["k"]]
    for x in entries:
        k = x["k"]
        rows = sorted((c for c in cards if kw_value(c, k) is not None or any(
            (kk[0] if isinstance(kk, (list, tuple)) else kk) == k for kk in (c.get("kw") or []))),
            key=lambda c: (c["n"], c.get("v") or ""))
        url = f"{SITE}/keywords/{x['id']}/"
        md_url = f"{SITE}/keywords/{x['id']}.md"
        title = pick_title([f"{k} keyword in Disney Lorcana: rules and all {len(rows)} cards",
                            f"{k} Lorcana keyword: rules and every card", f"{k} Lorcana keyword"])
        desc = clip(f"{k}: {x['d']} On {len(rows)} Disney Lorcana cards, each listed with cost, ink and rarity.")
        inks, types = count_by(rows, "co"), count_by(rows, "ty")
        lede = esc(x["d"])
        body = []
        if x["l"]:
            body.append(f"<p><b>In Lorcana:</b> {esc(x['l'])}</p>")
        if x.get("s"):
            body.append(f"<p><i>&ldquo;{esc(x['s'])}&rdquo;</i></p>")
        body.append(f"<p>Official rule {esc(x['r'])} (Comprehensive Rules {G.RULES_VERSION}). "
                    f"This keyword appears on {len(rows):,} cards: {esc(breakdown(types))}. By ink: {esc(breakdown(inks))}.</p>")
        body.append(f"<h2>All {len(rows):,} cards with {esc(k)}</h2>")
        body.append(card_rows(rows, slug_of, k))
        body.append(f'<p><a href="/glossary/#{x["id"]}">See {esc(k)} in the glossary</a></p>')
        crumbs = [("Ready Set Ink", SITE + "/"), ("Keywords", SITE + "/keywords/"), (k, url)]
        ld = list_ld(title, url, desc, rows, slug_of, crumbs)
        ld.append({"@context": "https://schema.org", "@type": "DefinedTerm", "name": k, "description": x["d"], "url": url,
                   "inDefinedTermSet": f"{SITE}/glossary/"})
        write(os.path.join(HERE, "keywords", x["id"], "index.html"),
              browse_page(url, title, desc, f"{k} (Disney Lorcana keyword)", lede, "".join(body), ld, md_url))
        write(os.path.join(HERE, "keywords", x["id"] + ".md"),
              md_list(f"{k}: Disney Lorcana keyword", url, f"{x['d']} Official rule {x['r']}. {len(rows)} cards.", rows, slug_of, k))
        urls.append(f"/keywords/{x['id']}/")
    # index
    url = f"{SITE}/keywords/"
    desc = f"All {len(entries)} Disney Lorcana keyword abilities in plain English, with the official rule number and every card that has each one."
    body = ["<ul>"] + [f'<li><a href="/keywords/{x["id"]}/"><b>{esc(x["k"])}</b></a>: {esc(x["d"])}</li>' for x in entries] + ["</ul>"]
    ld = [crumb_ld([("Ready Set Ink", SITE + "/"), ("Keywords", url)])]
    write(os.path.join(HERE, "keywords", "index.html"),
          browse_page(url, "Disney Lorcana keywords: every keyword ability explained", desc, "Disney Lorcana keywords", esc(desc),
                      "".join(body), ld, f"{SITE}/keywords.md"))
    write(os.path.join(HERE, "keywords.md"), "\n".join(
        [f"# Disney Lorcana keyword abilities", "", f"Source: {url}", ""] +
        [f"- [{x['k']}]({SITE}/keywords/{x['id']}.md): {x['d']} (rule {x['r']})" for x in entries]) + "\n")
    return ["/keywords/"] + urls


def set_pages(cards, sets, slug_of):
    urls, order = [], sorted(sets.items(), key=lambda kv: str(kv[1].get("d", "")), reverse=True)
    for code, meta in order:
        rows = sorted((c for c in cards if c.get("s") == code), key=lambda c: (c.get("num") or 0, c["n"]))
        if not rows:
            continue
        name, label = set_title(code, meta)
        sl = BROWSE["set"][code]
        url, md_url = f"{SITE}/sets/{sl}/", f"{SITE}/sets/{sl}.md"
        wh = when(meta)
        upcoming = is_upcoming(meta.get("d"))
        kind = f"Disney Lorcana {label}" if str(code).isdigit() else f"a Disney Lorcana {label} product"
        lede = (f"{esc(name)} is {kind}" + (f", {esc(wh)}" if wh else "") + ". "
                + (f"{len(rows):,} cards are listed so far." if upcoming else f"{len(rows):,} cards first appeared in this set.")
                + " Reprints of earlier cards are listed under the set they first appeared in.")
        desc = clip(f"{name} ({label}){', ' + wh if wh else ''}: {len(rows)} Disney Lorcana cards"
                    f"{' listed so far' if upcoming else ' first printed in this set'}. "
                    f"{breakdown(count_by(rows, 'ty'))}. Ink, cost and rarity for each.")
        title = pick_title([f"{name} Lorcana card list: {len(rows)} " + ("cards so far" if upcoming else "new cards"),
                            f"{name} Lorcana card list", f"{name} card list"])
        body = [f"<p>{esc(breakdown(count_by(rows, 'ty')))}. By rarity: {esc(breakdown(count_by(rows, 'r'), RARITY_ORDER))}. "
                f"By ink: {esc(breakdown(count_by(rows, 'co')))}.</p>", f"<h2>{len(rows):,} cards</h2>", card_rows(rows, slug_of)]
        crumbs = [("Ready Set Ink", SITE + "/"), ("Sets", SITE + "/sets/"), (name, url)]
        write(os.path.join(HERE, "sets", sl, "index.html"),
              browse_page(url, title, desc, f"{name}: card list", lede, "".join(body), list_ld(title, url, desc, rows, slug_of, crumbs), md_url))
        write(os.path.join(HERE, "sets", sl + ".md"),
              md_list(f"{name} ({label}): Disney Lorcana card list", url, (wh.capitalize() + ". " if wh else "") + f"{len(rows)} cards" + (" listed so far." if upcoming else " first printed in this set (reprints appear under their original set)."), rows, slug_of))
        urls.append(f"/sets/{sl}/")
    url = f"{SITE}/sets/"
    desc = "Every Disney Lorcana set from The First Chapter onward, newest first, with release dates and the cards first printed in each."
    body = ["<ul>"]
    for code, meta in order:
        n = sum(1 for c in cards if c.get("s") == code)
        if n:
            nm, lb = set_title(code, meta)
            wh_ = when(meta)
            body.append(f'<li><a href="/sets/{BROWSE["set"][code]}/"><b>{esc(nm)}</b></a> ({esc(lb)}){", " + esc(wh_) if wh_ else ""}: {n:,} cards{" so far" if is_upcoming(meta.get("d")) else ""}</li>')
    body.append("</ul>")
    write(os.path.join(HERE, "sets", "index.html"),
          browse_page(url, "Every Disney Lorcana set and card list", desc, "Disney Lorcana sets", esc(desc), "".join(body),
                      [crumb_ld([("Ready Set Ink", SITE + "/"), ("Sets", url)])], f"{SITE}/sets.md"))
    write(os.path.join(HERE, "sets.md"), "\n".join(
        ["# Disney Lorcana sets", "", f"Source: {url}", ""] +
        [f"- [{set_title(code, meta)[0]}]({SITE}/sets/{BROWSE['set'][code]}.md)" + (f", {when(meta)}" if when(meta) else "")
         for code, meta in order if any(c.get("s") == code for c in cards)]) + "\n")
    return ["/sets/"] + urls


def franchise_pages(cards, slug_of):
    urls, counts = [], count_by(cards, "sto")
    for name, sl in sorted(BROWSE["fr"].items()):
        rows = sorted((c for c in cards if c.get("sto") == name), key=lambda c: (c["n"], c.get("v") or ""))
        label = "Lorcana original cards" if name == "Lorcana" else name
        url, md_url = f"{SITE}/franchises/{sl}/", f"{SITE}/franchises/{sl}.md"
        title = pick_title([f"{label} Lorcana cards: all {len(rows)} cards", f"{label} Lorcana cards", f"{label} cards"])
        names = sorted({c["n"] for c in rows})
        desc = clip(f"All {len(rows)} Disney Lorcana cards from {label}, featuring {', '.join(names[:6])}"
                    f"{' and more' if len(names) > 6 else ''}. Stats, ink and rarity for every card.")
        chips = "".join(f'<a href="/characters/{BROWSE["ch"][n]}/">{esc(n)}</a>' for n in names if n in BROWSE["ch"])
        body = [f"<p>{esc(breakdown(count_by(rows, 'ty')))}. By ink: {esc(breakdown(count_by(rows, 'co')))}.</p>"]
        if chips:
            body.append(f'<h2>Characters</h2><div class="rel">{chips}</div>')
        body += [f"<h2>All {len(rows):,} cards</h2>", card_rows(rows, slug_of)]
        crumbs = [("Ready Set Ink", SITE + "/"), ("Franchises", SITE + "/franchises/"), (label, url)]
        lede = f"Every Disney Lorcana card from {esc(label)}: {len(rows):,} cards across {len(names):,} characters and items."
        write(os.path.join(HERE, "franchises", sl, "index.html"),
              browse_page(url, title, desc, f"{label}: Disney Lorcana cards", lede, "".join(body), list_ld(title, url, desc, rows, slug_of, crumbs), md_url))
        write(os.path.join(HERE, "franchises", sl + ".md"),
              md_list(f"{label}: Disney Lorcana cards", url, f"{len(rows)} cards.", rows, slug_of))
        urls.append(f"/franchises/{sl}/")
    url = f"{SITE}/franchises/"
    desc = f"Browse Disney Lorcana by the Disney story each card comes from: {len(counts)} franchises, from Mickey Mouse & Friends to Frozen."
    body = ["<ul>"]
    for name, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
        label = "Lorcana original cards" if name == "Lorcana" else name
        body.append(f'<li><a href="/franchises/{BROWSE["fr"][name]}/">{esc(label)}</a> ({n:,} cards)</li>' if name in BROWSE["fr"]
                    else f"<li>{esc(label)} ({n:,} cards)</li>")
    body.append("</ul>")
    write(os.path.join(HERE, "franchises", "index.html"),
          browse_page(url, "Disney Lorcana cards by franchise and movie", desc, "Disney Lorcana franchises", esc(desc), "".join(body),
                      [crumb_ld([("Ready Set Ink", SITE + "/"), ("Franchises", url)])], f"{SITE}/franchises.md"))
    write(os.path.join(HERE, "franchises.md"), "\n".join(
        ["# Disney Lorcana franchises", "", f"Source: {url}", ""] +
        [f"- {name}: {n} cards" + (f" ({SITE}/franchises/{BROWSE['fr'][name]}.md)" if name in BROWSE["fr"] else "")
         for name, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))]) + "\n")
    return ["/franchises/"] + urls


def character_pages(cards, slug_of):
    urls, names = [], sorted(BROWSE["ch"].items())
    for name, sl in names:
        rows = sorted((c for c in cards if c["n"] == name), key=lambda c: (c.get("v") or "", c.get("num") or 0))
        url, md_url = f"{SITE}/characters/{sl}/", f"{SITE}/characters/{sl}.md"
        title = pick_title([f"{name} Lorcana cards: all {len(rows)} versions", f"{name} Lorcana cards", f"{name} cards"])
        frs = sorted({c["sto"] for c in rows if c.get("sto")})
        desc = clip(f"All {len(rows)} Disney Lorcana cards named {name}"
                    f"{', from ' + ', '.join(frs[:3]) if frs else ''}. Every version with cost, ink and rarity.")
        body = [f"<p>{esc(breakdown(count_by(rows, 'co')))} by ink.</p>"]
        if frs:
            body.append('<p>From: ' + ", ".join(
                f'<a href="/franchises/{BROWSE["fr"][f]}/">{esc(f)}</a>' if f in BROWSE["fr"] else esc(f) for f in frs) + "</p>")
        body += [f"<h2>All {len(rows):,} versions</h2>", card_rows(rows, slug_of)]
        crumbs = [("Ready Set Ink", SITE + "/"), ("Characters", SITE + "/characters/"), (name, url)]
        write(os.path.join(HERE, "characters", sl, "index.html"),
              browse_page(url, title, desc, f"{name}: every Disney Lorcana card", f"{len(rows):,} versions of {esc(name)} in Disney Lorcana.",
                          "".join(body), list_ld(title, url, desc, rows, slug_of, crumbs), md_url))
        write(os.path.join(HERE, "characters", sl + ".md"),
              md_list(f"{name}: every Disney Lorcana card", url, f"{len(rows)} versions.", rows, slug_of))
        urls.append(f"/characters/{sl}/")
    url = f"{SITE}/characters/"
    desc = f"{len(names)} Disney Lorcana characters with more than one card, each with every version listed."
    body = ["<ul>"] + [f'<li><a href="/characters/{sl}/">{esc(n)}</a></li>' for n, sl in names] + ["</ul>"]
    write(os.path.join(HERE, "characters", "index.html"),
          browse_page(url, "Disney Lorcana characters: every version of every character", desc, "Disney Lorcana characters", esc(desc),
                      "".join(body), [crumb_ld([("Ready Set Ink", SITE + "/"), ("Characters", url)])], f"{SITE}/characters.md"))
    write(os.path.join(HERE, "characters.md"), "\n".join(
        ["# Disney Lorcana characters", "", f"Source: {url}", ""] + [f"- [{n}]({SITE}/characters/{sl}.md)" for n, sl in names]) + "\n")
    return ["/characters/"] + urls


def card_md(c, sl, sets, priced_on):
    setname = (sets.get(c.get("s"), {}) or {}).get("name") or f"Set {c.get('s')}"
    out = [f"# {fullname(c)} (Disney Lorcana card)", "", f"Source: {SITE}/card/{sl}.html", ""]
    out.append(f"- Type: {c.get('ty', '')}" + (f" ({', '.join(c['sub'])})" if c.get("sub") else ""))
    out.append(f"- Ink: {' / '.join(c.get('co') or [])} · Cost: {c.get('c', 0)} · {'Inkable' if c.get('ik') else 'Not inkable'}")
    stats = [f"Strength {c['st']}" if c.get("st") is not None else "", f"Willpower {c['wi']}" if c.get("wi") is not None else "",
             f"Lore {c['lo']}" if c.get("lo") else ""]
    if any(stats):
        out.append("- " + ", ".join(x for x in stats if x))
    out.append(f"- Set: {setname} #{c.get('num')} · Rarity: {c.get('r', '')}")
    if c.get("sto"):
        out.append(f"- Franchise: {c['sto']}")
    if c.get("ar"):
        out.append(f"- Illustrator: {', '.join(c['ar'])}")
    if c.get("kw"):
        out.append("- Keywords: " + ", ".join(
            (f"{k[0]} {k[1]}" if len(k) > 1 and k[1] is not None else k[0]) if isinstance(k, (list, tuple)) else str(k) for k in c["kw"]))
    if c.get("tx"):
        out += ["", "## Card text", "", "> " + re.sub(r"\s*\n\s*", "\n> ", c["tx"].strip())]
    if c.get("fl"):
        out += ["", f"Flavor text: {c['fl']}"]
    if c.get("ru"):
        out += ["", "## Official rulings", ""]
        for r in c["ru"]:
            out.append(f"- Q: {r.get('q', '')}\n  A: {r.get('a', '')}")
    if c.get("p") is not None or c.get("pf") is not None:
        bits = []
        if c.get("p") is not None:
            bits.append(f"${c['p']:.2f} regular")
        if c.get("pf") is not None:
            bits.append(f"${c['pf']:.2f} foil")
        out += ["", f"Market price (USD, snapshot from {priced_on}; a rough guide, not a live quote): " + ", ".join(bits)]
    return "\n".join(out) + "\n"


def main():
    data = load_data()
    cards = data["cards"]
    sets = data.get("sets", {})
    priced_on = data.get("priced", "")

    by_name, by_set = {}, {}
    for c in cards:
        by_name.setdefault(c["n"], []).append(c)
        by_set.setdefault(c.get("s"), []).append(c)

    os.makedirs(CARDDIR, exist_ok=True)
    build_browse(cards, sets)
    seen, urls, slug_of = set(), [], {}
    for c in cards:
        sl, page = card_page(c, by_name, by_set, sets, priced_on)
        if sl in seen:                     # never silently overwrite a page
            sl = sl + "-" + str(c.get("s")) + "-" + str(c.get("num"))
        seen.add(sl)
        slug_of[id(c)] = sl
        with open(os.path.join(CARDDIR, sl + ".html"), "w", encoding="utf-8") as f:
            f.write(page)
        with open(os.path.join(CARDDIR, sl + ".md"), "w", encoding="utf-8") as f:
            f.write(card_md(c, sl, sets, priced_on))
        urls.append(f"/card/{sl}.html")

    with open(os.path.join(CARDDIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_page(cards, sets))

    hub_urls = []
    for h in HUBS:
        d = os.path.join(HERE, h["slug"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(hub_page(h, cards))
        hub_urls.append(f"/{h['slug']}/")

    os.makedirs(os.path.join(HERE, "glossary"), exist_ok=True)
    with open(os.path.join(HERE, "glossary", "index.html"), "w", encoding="utf-8") as f:
        f.write(glossary_page(cards))
    with open(os.path.join(HERE, "glossary.json"), "w", encoding="utf-8") as f:
        json.dump(glossary_json(cards), f, ensure_ascii=False, indent=1)
    with open(os.path.join(HERE, "glossary.md"), "w", encoding="utf-8") as f:
        f.write(glossary_md(cards))
    hub_urls.append("/glossary/")
    browse_urls = (keyword_pages(cards, slug_of) + set_pages(cards, sets, slug_of)
                   + franchise_pages(cards, slug_of) + character_pages(cards, slug_of))
    try:
        import legal_drafts as LD          # local-only; absent in the public repo
    except ImportError:
        LD = None
    if LD:
        for sl_, ttl, secs, intro in (
            ("privacy", "Privacy policy", LD.PRIVACY, ""),
            ("terms", "Terms of use", LD.TERMS, ""),
            ("fan-content", "Fan content notice", LD.FAN_CONTENT, esc(DISCLAIMER)),
        ):
            os.makedirs(os.path.join(HERE, sl_), exist_ok=True)
            with open(os.path.join(HERE, sl_, "index.html"), "w", encoding="utf-8") as f:
                f.write(legal_page(sl_, ttl, secs, intro))

    today = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in ["/", "/card/"] + hub_urls + browse_urls + urls:
        sm.append(f"<url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>")
    sm.append("</urlset>")
    with open(os.path.join(HERE, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write("\n".join(sm))

    with open(os.path.join(HERE, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(robots_txt())
    with open(os.path.join(HERE, "llms.txt"), "w", encoding="utf-8") as f:
        f.write(llms_txt(cards, sets, priced_on))
    with open(os.path.join(HERE, "manifest.webmanifest"), "w", encoding="utf-8") as f:
        json.dump(MANIFEST, f, indent=2)
    with open(os.path.join(HERE, "manifest-lore.webmanifest"), "w", encoding="utf-8") as f:
        json.dump(LORE_MANIFEST, f, indent=2)

    total = sum(os.path.getsize(os.path.join(CARDDIR, x)) for x in os.listdir(CARDDIR))
    log(f"✓ wrote {len(urls)} card pages + index  ({total/1024/1024:.1f} MB, "
        f"{total/max(1,len(urls))/1024:.0f} KB each)")
    log(f"✓ wrote {len(HUBS)} hub pages: {', '.join('/'+h['slug'] for h in HUBS)}")
    log(f"✓ wrote sitemap.xml ({len(urls)+len(hub_urls)+2} urls), robots.txt, manifest.webmanifest")


if __name__ == "__main__":
    main()
