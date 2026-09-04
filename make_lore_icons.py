#!/usr/bin/env python3
"""
Icon set for the Lore Tracker's own installable app (see manifest-lore.webmanifest
in gen_pages.py). Deliberately generated rather than hand-designed: same carbon/
amber chrome as the main site (--carbon #202638, --amberc #ffd400), but a
different centerpiece — a lore diamond, the same shape Lorcana itself uses for
its lore counter — so the two icons read as different apps on a home screen,
not two copies of one.

Run again only if the look needs to change — output is committed, same as
make_icons.py.

    python3 make_lore_icons.py
"""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "icons")
CARBON = (32, 38, 56, 255)
AMBER = (255, 212, 0, 255)


def diamond(px, pad=0.0, bg=CARBON, ring=True):
    im = Image.new("RGBA", (px, px), bg)
    d = ImageDraw.Draw(im)
    inner = px * (1 - pad * 2)
    cx = cy = px / 2
    r = inner * 0.40
    # A lore diamond: taller than wide, like Lorcana's own lore-cost symbol.
    pts = [(cx, cy - r * 1.15), (cx + r * 0.72, cy), (cx, cy + r * 1.15), (cx - r * 0.72, cy)]
    d.polygon(pts, fill=AMBER)
    if ring:
        w = max(2, int(px * 0.018))
        d.ellipse([px * 0.06, px * 0.06, px * 0.94, px * 0.94], outline=AMBER, width=w)
    return im


os.makedirs(OUT, exist_ok=True)
for n in (192, 512):
    diamond(n).save(os.path.join(OUT, f"lore-icon-{n}.png"))
diamond(512, pad=0.20).save(os.path.join(OUT, "lore-icon-maskable-512.png"))
diamond(180, pad=0.06, ring=False).convert("RGB").save(os.path.join(OUT, "lore-apple-touch-icon.png"))
print("✓ wrote lore-icon-192.png, lore-icon-512.png, lore-icon-maskable-512.png, lore-apple-touch-icon.png")
