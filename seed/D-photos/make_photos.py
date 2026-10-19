"""Writes the D-photos dataset: sample photos at known sizes, for the print-quality
warning and export tests (Builds proposal, T-053). Run: python seed/D-photos/make_photos.py
The pictures are plain generated gradients, so they are small files and need no licence."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent
# name, width, height, what it is for
SIZES = [
    ("small",  800,   600,   "Far too small for any zone: shows the red print warning."),
    ("medium", 1920,  1280,  "Soft in a large zone: shows the orange print warning."),
    ("sharp",  4800,  3200,  "Sharp in most zones at the current print assumptions."),
    ("huge",   12000, 8000,  "Stress test for memory and upload time."),
]

def make(name, w, h):
    # Draw small, then scale up: keeps generation fast even for the huge one.
    base_w = 1200
    base_h = round(base_w * h / w)
    img = Image.new("RGB", (base_w, base_h))
    px = img.load()
    for y in range(base_h):
        for x in range(base_w):
            px[x, y] = (40 + 180 * x // base_w, 70 + 120 * y // base_h, 200 - 120 * x // base_w)
    d = ImageDraw.Draw(img)
    for i in range(0, base_w + base_h, 150):
        d.line([(i, 0), (0, i)], fill=(255, 255, 255), width=2)
    try:
        font = ImageFont.truetype("arial.ttf", base_h // 8)
    except OSError:
        font = ImageFont.load_default()
    d.text((base_w // 20, base_h // 3), f"{name}\n{w} x {h}", fill=(255, 255, 255), font=font)
    return img.resize((w, h), Image.BILINEAR)

manifest = []
for name, w, h, note in SIZES:
    path = OUT / f"{name}_{w}x{h}.jpg"
    make(name, w, h).save(path, "JPEG", quality=80)
    manifest.append({"file": path.name, "width": w, "height": h, "bytes": path.stat().st_size, "purpose": note})
    print(path.name, path.stat().st_size)
(OUT / "manifest.json").write_text(json.dumps({"id": "D-photos", "photos": manifest}, indent=2), encoding="utf-8")
