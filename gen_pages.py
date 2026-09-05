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
import json
import os
import re
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "flounder-search.html")
CARDDIR = os.path.join(HERE, "card")
SITE = "https://readysetink.vercel.app"

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
  <nav><a href="/card/">All cards</a> · <a href="/">Deck builder</a></nav>
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

    bits = [f"{c.get('c', 0)} ink", "/".join(inks) or "—", c.get("ty") or ""]
    if c.get("st") is not None:
        bits.append(f"{c['st']}¤/{c['wi']}⛉")
    if c.get("lo"):
        bits.append(f"{c['lo']} lore")
    plain = re.sub(r"\s+", " ", (c.get("tx") or "")).strip()
    desc = f"{full} — {', '.join(x for x in bits if x)}. {setname}, {c.get('r','')}."
    if plain:
        desc += " " + plain
    desc = desc[:300].rstrip()

    # JSON-LD. Deliberately no price and no offer: these pages are a reference,
    # not a shop, and marking them up as a product would be a claim we are not
    # in a position to make.
    ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": f"{full} — Disney Lorcana card",
        "description": desc,
        "about": {"@type": "Thing", "name": full},
        "isPartOf": {"@type": "WebSite", "name": "Ready Set Ink", "url": SITE},
        "mainEntityOfPage": url,
    }
    if c.get("imgL") or c.get("img"):
        ld["image"] = c.get("imgL") or c.get("img")

    # Official Q&A becomes a real FAQPage, which is the whole reason a ruling
    # is worth publishing: it is the question somebody typed into Google.
    rulings = c.get("ru") or []
    if rulings:
        ld = [ld, {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [{
                "@type": "Question", "name": r.get("q", ""),
                "acceptedAnswer": {"@type": "Answer", "text": r.get("a", "")},
            } for r in rulings if r.get("q")],
        }]
    extra = '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>"

    img = c.get("imgL") or c.get("img") or ""
    out = [head(f"{full} · Disney Lorcana card · Ready Set Ink", desc, url, img, extra)]

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
    {"slug": "meta-decks", "tab": "tMeta",
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
    seen, urls = set(), []
    for c in cards:
        sl, page = card_page(c, by_name, by_set, sets, priced_on)
        if sl in seen:                     # never silently overwrite a page
            sl = sl + "-" + str(c.get("s")) + "-" + str(c.get("num"))
        seen.add(sl)
        with open(os.path.join(CARDDIR, sl + ".html"), "w", encoding="utf-8") as f:
            f.write(page)
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

    today = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in ["/", "/card/"] + hub_urls + urls:
        sm.append(f"<url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>")
    sm.append("</urlset>")
    with open(os.path.join(HERE, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write("\n".join(sm))

    with open(os.path.join(HERE, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
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
