"""Draws the app icons into ../icons. Run: python3 tools/make-icons.py (needs Pillow).
A clock face whose orange ring is the free time left, on the app's dark background."""
import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
BG = (21, 19, 16)          # dark page background
RING = (59, 52, 45)        # the used-up part of the ring
PAPER = (240, 235, 227)    # cream hands
ACCENT = (255, 148, 51)    # the app's orange


def draw(size: int) -> Image.Image:
    s = 1024
    img = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(img)
    c, r, w = s / 2, 300, 92          # inside the safe zone that Android crops to
    box = [c - r, c - r, c + r, c + r]
    d.arc(box, 0, 360, fill=RING, width=w)
    d.arc(box, -90, 210, fill=ACCENT, width=w)   # free time left: from 12 o'clock round to about 10
    for ang in (-90, 210):                        # round ends
        a = math.radians(ang)
        x, y = c + (r - w / 2) * math.cos(a), c + (r - w / 2) * math.sin(a)
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=ACCENT)
    hw = 44
    d.line([(c, c), (c, c - 175)], fill=PAPER, width=hw)
    d.line([(c, c), (c + 120, c + 72)], fill=PAPER, width=hw)
    for x, y in [(c, c - 175), (c + 120, c + 72), (c, c)]:
        d.ellipse([x - hw / 2, y - hw / 2, x + hw / 2, y + hw / 2], fill=PAPER)
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
for name, size in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)]:
    draw(size).save(OUT / name, optimize=True)
    print("wrote", OUT / name)
