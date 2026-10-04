#!/usr/bin/env python3
"""Tell Bing, Yandex and other IndexNow engines which URLs exist or changed.
Bing's index also feeds ChatGPT search, so this is how new pages get found in days, not weeks.

Run it AFTER a deploy, from the repo root:
    python3 indexnow.py           # dry run: counts the URLs and shows what it would send
    python3 indexnow.py --send    # actually submits them

Sending publishes your URLs to a third-party service, so it never sends without --send.
"""
import glob, json, re, sys, urllib.request
HOST = "www.readysetink.com"
KEY = "4984213838028ee68254e172b0edba66"
LOCS = []
for f in sorted(glob.glob("sitemap-*.xml")):
    LOCS += re.findall(r"<loc>([^<]+)</loc>", open(f, encoding="utf-8").read())
print(f"{len(LOCS):,} urls from the sitemaps; key file: https://{HOST}/{KEY}.txt")
if "--send" not in sys.argv:
    print("dry run only. Re-run with --send after the site is deployed.")
    sys.exit(0)
for i in range(0, len(LOCS), 10000):
    body = json.dumps({"host": HOST, "key": KEY, "keyLocation": f"https://{HOST}/{KEY}.txt", "urlList": LOCS[i:i + 10000]}).encode()
    req = urllib.request.Request("https://api.indexnow.org/indexnow", body, {"Content-Type": "application/json; charset=utf-8"})
    with urllib.request.urlopen(req, timeout=60) as r:
        print("batch", i // 10000 + 1, "->", r.status)
