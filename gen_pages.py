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


def head(title, desc, canonical, image=None, extra=""):
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
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<script defer src="/_vercel/insights/script.js"></script>
{extra}
<style>{CSS}</style>
</head><body>
<header><div class="wrap">
  <a href="/">Ready Set Ink</a>
  <nav><a href="/card/">All cards</a> · <a href="/">Deck builder</a></nav>
</div></header>
<div class="wrap">"""


FOOT = f"""
<footer><p>{DISCLAIMER}</p></footer>
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

    out.append(FOOT)
    return sl, "".join(out)


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
    out.append(FOOT)
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

    today = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in ["/", "/card/"] + urls:
        sm.append(f"<url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>")
    sm.append("</urlset>")
    with open(os.path.join(HERE, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write("\n".join(sm))

    with open(os.path.join(HERE, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    with open(os.path.join(HERE, "manifest.webmanifest"), "w", encoding="utf-8") as f:
        json.dump(MANIFEST, f, indent=2)

    total = sum(os.path.getsize(os.path.join(CARDDIR, x)) for x in os.listdir(CARDDIR))
    log(f"✓ wrote {len(urls)} card pages + index  ({total/1024/1024:.1f} MB, "
        f"{total/max(1,len(urls))/1024:.0f} KB each)")
    log(f"✓ wrote sitemap.xml ({len(urls)+2} urls), robots.txt, manifest.webmanifest")


if __name__ == "__main__":
    main()
