"""Where everything lives. Every script imports its paths from here.

  data/    the hand-authored and downloaded data (card-db.json is the asset)
  src/     the app source: the template and the deck builder's css/js
  public/  what readysetink.com serves — the build writes most of it
  tools/   local-only authoring tools (art tagger, notes editor)
  docs/    how we work, plans, the build report
"""
import os

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA   = os.path.join(ROOT, "data")
SRC    = os.path.join(ROOT, "src")
PUBLIC = os.path.join(ROOT, "public")
TOOLS  = os.path.join(ROOT, "tools")
DOCS   = os.path.join(ROOT, "docs")

# data
CARD_DB    = os.path.join(DATA, "card-db.json")
PRICES     = os.path.join(DATA, "card-prices.json")
ART_TAGS   = os.path.join(DATA, "art-tags.json")
CARD_RULES = os.path.join(DATA, "card-rules.json")
RSI_NOTES  = os.path.join(DATA, "rsi-notes.json")
META_DECKS = os.path.join(DATA, "meta-decks.json")
# data files the public site also serves (listed in llms.txt)
SERVED_DATA = (CARD_DB, CARD_RULES, META_DECKS, PRICES)

# source and output
TEMPLATE   = os.path.join(SRC, "flounder-search.template.html")
BUILDER    = os.path.join(SRC, "builder")
SITE       = os.path.join(PUBLIC, "index.html")
TAG_TPL    = os.path.join(TOOLS, "tagger.template.html")
TAG_OUT    = os.path.join(TOOLS, "flounder-tagger.html")
NOTE_TPL   = os.path.join(TOOLS, "notes.template.html")
NOTE_OUT   = os.path.join(TOOLS, "flounder-notes.html")
REPORT     = os.path.join(DOCS, "BUILD-REPORT.md")
HISTORY    = os.path.join(ROOT, ".build-history")
