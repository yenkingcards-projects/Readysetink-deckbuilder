#!/usr/bin/env python3
"""
Every icon the site needs, from Ben's one logo PNG.

Run this again only if the logo changes — the output is committed, so a normal
build does not need Pillow installed.

    python3 make_icons.py "path/to/rsilogo.png"

Why so many files. Each platform wants something different and gets it wrong in
its own way:
  favicon.ico          address bar, old bookmarks. Multi-size inside one file.
  icon-32/192/512.png  Chrome, and the Android home screen.
  apple-touch-icon     iOS. MUST be opaque — iOS flattens alpha to black, and
                       this badge has a black ring, so a transparent version
                       loses its edge into the corners of the home screen.
  icon-maskable-512    Android crops home-screen icons to a circle or squircle.
                       "maskable" promises the outer 20% is expendable, so the
                       badge is padded — otherwise the crop slices straight
                       through the ring with READY SET INK written on it.
The source is cropped to the artwork first: the original is a small badge on a
1920x1080 transparent canvas, and scaling that whole canvas down would leave a
logo four pixels wide in the tab.
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "rsilogo.png")
OUT = os.path.join(HERE, "icons")
CARBON = (32, 38, 56, 255)          # --carbon, the site's darkest surface

src = Image.open(SRC).convert("RGBA")
logo = src.crop(src.getchannel("A").getbbox())
print(f"· cropped {src.size} -> {logo.size}")


def square(px, pad=0.0, bg=None):
    inner = int(px * (1 - pad * 2))
    im = logo.resize((inner, inner), Image.LANCZOS)
    canvas = Image.new("RGBA", (px, px), bg or (0, 0, 0, 0))
    canvas.paste(im, ((px - inner) // 2, (px - inner) // 2), im)
    return canvas


os.makedirs(OUT, exist_ok=True)
for n in (16, 32, 48, 64, 180, 192, 256, 512):
    square(n).save(os.path.join(OUT, f"icon-{n}.png"))
square(180, pad=0.06, bg=CARBON).convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"))
square(512, pad=0.20, bg=CARBON).save(os.path.join(OUT, "icon-maskable-512.png"))
square(256).save(os.path.join(HERE, "favicon.ico"),
                 sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(f"✓ wrote {len(os.listdir(OUT))} icons + favicon.ico")
