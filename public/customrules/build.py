#!/usr/bin/env python3
"""Bundle customrules/formats/*.json into customrules/formats.json (what the page loads).
Run after adding or editing a format:  python3 customrules/build.py"""
import json, glob, os
here = os.path.dirname(os.path.abspath(__file__))
fm = [json.load(open(f)) for f in glob.glob(os.path.join(here, "formats", "*.json"))]
fm.sort(key=lambda f: (f.get("order", 99), f["name"]))
for f in fm:
    assert f.get("id") and f.get("name"), f
json.dump(fm, open(os.path.join(here, "formats.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print(f"formats.json: {len(fm)} formats ->", ", ".join(f["name"] for f in fm))
