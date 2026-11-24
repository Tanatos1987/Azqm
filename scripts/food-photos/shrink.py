"""Center-crop the raw photos so the food fills a circle, shrink to 160 px WebP, and draw a preview sheet."""
import pathlib
import sys
from PIL import Image, ImageDraw

raw, out, sheet_path, crop = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]), float(sys.argv[4])
out.mkdir(parents=True, exist_ok=True)
files = sorted(raw.glob("*.png"))
cells = []
for f in files:
    im = Image.open(f).convert("RGB")
    w, h = im.size
    side = int(min(w, h) * crop)
    left, top = (w - side) // 2, (h - side) // 2
    im = im.crop((left, top, left + side, top + side)).resize((160, 160), Image.LANCZOS)
    im.save(out / f"{f.stem}.webp", "WEBP", quality=80, method=6)
    cells.append((f.stem, im))
# preview: each photo as a 44 px and a 22 px circle (x3 for a phone screen), on the Deep Glass background
S = 3
W = 20 + len(cells) * (44 * S + 30)
sheet = Image.new("RGB", (W, 44 * S + 22 * S + 60), (10, 15, 31))
for i, (name, im) in enumerate(cells):
    x = 20 + i * (44 * S + 30)
    for size, y in ((44 * S, 15), (22 * S, 44 * S + 35)):
        c = im.resize((size, size), Image.LANCZOS)
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        sheet.paste(c, (x, y), mask)
sheet.save(sheet_path, quality=90)
for f in sorted(out.glob("*.webp")):
    print(f.name, f.stat().st_size)
