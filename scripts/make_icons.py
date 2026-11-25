"""Draws the eye icon as PNGs (no image libraries needed) and writes the matching SVG.

Shapes, in a 64x64 box: blue rounded square, white eye (a lens: the overlap of two circles),
blue iris, white pupil. Run from the repository root:  python3 scripts/make_icons.py
"""
import math
import os
import struct
import zlib

BLUE = (0x18, 0x5F, 0xA5)
WHITE = (0xFF, 0xFF, 0xFF)

# Eye: pointed corners at (7,32) and (57,32), 14.5 units above and below the middle line.
HALF_WIDTH, BULGE = 25.0, 14.5
LENS_R = (HALF_WIDTH ** 2 + BULGE ** 2) / (2 * BULGE)
IRIS_R, PUPIL_R, CORNER_R = 10.5, 4.2, 14.0

SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="{CORNER_R:g}" fill="#185FA5"/>
  <path d="M7 32A{LENS_R:.2f} {LENS_R:.2f} 0 0 1 57 32A{LENS_R:.2f} {LENS_R:.2f} 0 0 1 7 32z" fill="#FFFFFF"/>
  <circle cx="32" cy="32" r="{IRIS_R:g}" fill="#185FA5"/>
  <circle cx="32" cy="32" r="{PUPIL_R:g}" fill="#FFFFFF"/>
</svg>
"""


def colour_at(x, y):
    """Colour of the icon at (x, y) in 64x64 units, or None outside the rounded square."""
    cx, cy = min(max(x, CORNER_R), 64 - CORNER_R), min(max(y, CORNER_R), 64 - CORNER_R)
    if (x - cx) ** 2 + (y - cy) ** 2 > CORNER_R ** 2:
        return None
    d = math.hypot(x - 32, y - 32)
    if d <= PUPIL_R:
        return WHITE
    if d <= IRIS_R:
        return BLUE
    in_top = (x - 32) ** 2 + (y - (32 - BULGE + LENS_R)) ** 2 <= LENS_R ** 2
    in_bottom = (x - 32) ** 2 + (y - (32 + BULGE - LENS_R)) ** 2 <= LENS_R ** 2
    return WHITE if in_top and in_bottom else BLUE


def render(size, samples=6):
    rows = []
    for py in range(size):
        row = bytearray([0])  # PNG filter type 0 for each row
        for px in range(size):
            r = g = b = a = 0
            for sy in range(samples):
                for sx in range(samples):
                    x = (px + (sx + 0.5) / samples) * 64 / size
                    y = (py + (sy + 0.5) / samples) * 64 / size
                    c = colour_at(x, y)
                    if c:
                        r += c[0]; g += c[1]; b += c[2]; a += 1
            n = samples * samples
            row += bytes([r // a, g // a, b // a, round(255 * a / n)] if a else [0, 0, 0, 0])
        rows.append(bytes(row))
    return png(size, size, b"".join(rows))


def png(width, height, raw):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


if __name__ == "__main__":
    out = os.path.join("extension", "icons")
    with open(os.path.join(out, "icon.svg"), "w") as f:
        f.write(SVG)
    for size in (16, 32, 48, 64, 96, 128):
        with open(os.path.join(out, f"icon-{size}.png"), "wb") as f:
            f.write(render(size))
    os.makedirs(os.path.join("store"), exist_ok=True)
    with open(os.path.join("store", "icon-512.png"), "wb") as f:
        f.write(render(512, samples=3))
    print("icons written")
