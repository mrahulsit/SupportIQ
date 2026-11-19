"""
Builds every favicon / app icon from the master logo (brand/supportiq-logo.png).

The master is an opaque PNG: a rounded indigo tile on a white square. We crop
to the tile, make the outside corners transparent (flood fill from the edges,
so the white speech bubble inside stays white), then export each size.

Run from the repo root:  python scripts/make_icons.py
Requires Pillow.
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "brand" / "supportiq-logo.png"
APP = ROOT / "src" / "app"
PUBLIC = ROOT / "public"


def tile_with_transparent_corners(img: Image.Image) -> Image.Image:
    rgb = img.convert("RGB")
    w, h = rgb.size

    # Mark everything near-white that is connected to the image border.
    marker = (255, 0, 255)
    flood = rgb.copy()
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if flood.getpixel(seed) != marker:
            ImageDraw.floodfill(flood, seed, marker, thresh=60)

    alpha = Image.new("L", (w, h), 255)
    a, f = alpha.load(), flood.load()
    for y in range(h):
        for x in range(w):
            if f[x, y] == marker:
                a[x, y] = 0

    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    # Crop to the tile and pad to a square.
    box = alpha.getbbox()
    out = out.crop(box)
    side = max(out.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(out, ((side - out.width) // 2, (side - out.height) // 2))
    return square


def resized(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    master = Image.open(SRC)
    tile = tile_with_transparent_corners(master)

    # favicon.ico with the classic sizes; Next serves it at /favicon.ico.
    resized(tile, 256).save(APP / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    # Modern browsers / PWA: transparent 512px PNG.
    resized(tile, 512).save(APP / "icon.png", optimize=True)

    # iOS home screen: opaque & full-bleed (iOS applies its own rounding).
    # Fill the transparent corners with the tile's own corner colour.
    corner = tile.getpixel((tile.width // 2, 4))[:3]
    apple = Image.new("RGB", tile.size, corner)
    apple.paste(tile, (0, 0), tile)
    resized(apple, 180).save(APP / "apple-icon.png", optimize=True)

    # In-app logo (header, auth pages, dashboard).
    resized(tile, 128).save(PUBLIC / "logo-mark.png", optimize=True)

    print("wrote favicon.ico, icon.png, apple-icon.png, public/logo-mark.png")


if __name__ == "__main__":
    main()
