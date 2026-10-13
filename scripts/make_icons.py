"""Build the app icons.

Put your own icon at assets/MH-Act-Icon.png (any square PNG, 512px or larger is best)
and run:  python3 scripts/make_icons.py
Without that file, a plain placeholder is drawn so the app still installs.
Needs Pillow:  pip install pillow
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
src = root / "assets" / "MH-Act-Icon.png"
out = root / "icons"
out.mkdir(exist_ok=True)


def placeholder(size=1024):
    im = Image.new("RGBA", (size, size), "#0f766e")
    d = ImageDraw.Draw(im)
    d.ellipse([size * .18, size * .18, size * .82, size * .82], fill="#ffffff")
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", int(size * .30))
    except OSError:
        font = ImageFont.load_default()
    d.text((size / 2, size / 2), "MH", fill="#0f766e", font=font, anchor="mm")
    return im


if src.exists():
    base = Image.open(src).convert("RGBA")
    side = min(base.size)
    left, top = (base.width - side) // 2, (base.height - side) // 2
    base = base.crop((left, top, left + side, top + side))
    print("Using", src)
else:
    base = placeholder()
    print("assets/MH-Act-Icon.png not found: wrote placeholder icons")

for name, size in (("icon-192.png", 192), ("icon-512.png", 512)):
    base.resize((size, size), Image.LANCZOS).save(out / name)

# Maskable icon: shrink the artwork into the safe zone on a solid background.
canvas = Image.new("RGBA", (512, 512), "#0f766e")
inner = base.resize((360, 360), Image.LANCZOS)
canvas.paste(inner, (76, 76), inner)
canvas.save(out / "icon-maskable-512.png")
