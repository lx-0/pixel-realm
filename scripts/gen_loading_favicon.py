#!/usr/bin/env python3
"""
Generate loading screen art, favicons, and apple-touch-icon for PixelRealm.
Uses only Python stdlib (struct + zlib) — no PIL required.

Outputs:
  - public/assets/ui/loading-screen.png   (320×180)
  - public/favicon-192.png                (192×192)
  - public/favicon-512.png                (512×512)
  - public/apple-touch-icon.png           (180×180)
  - public/favicon.ico                    (16×16 + 32×32 multi-size)
"""

import struct
import zlib
import os
import math

BASE = os.path.join(os.path.dirname(__file__), '..')
OUT_PUBLIC = os.path.join(BASE, 'public')
OUT_UI = os.path.join(BASE, 'public', 'assets', 'ui')
os.makedirs(OUT_UI, exist_ok=True)

# ─── Palette (RGBA) from ART-STYLE-GUIDE.md ─────────────────────────────────
T = (0, 0, 0, 0)  # transparent
_ = T  # alias for sprite definitions

# Neutrals
K  = (13,  13,  13,  255)
DK = (43,  43,  43,  255)
ST = (74,  74,  74,  255)
LS = (110, 110, 110, 255)
PG = (200, 200, 200, 255)
NW = (240, 240, 240, 255)

# Warm earth
BD = (59,  32,  16,  255)
BN = (107, 58,  31,  255)
DT = (139, 92,  42,  255)
SN = (184, 132, 63,  255)
DS = (212, 168, 90,  255)  # desert gold
PS = (232, 208, 138, 255)  # pale sand

# Greens
DF = (26,  58,  26,  255)  # deep forest
FG = (45,  110, 45,  255)
LG = (76,  155, 76,  255)
BG = (120, 200, 120, 255)
FL = (168, 228, 160, 255)

# Cyan / player
DO = (10,  26,  58,  255)  # deep ocean
DP = (26,  74,  138, 255)
SY = (42,  122, 192, 255)  # sky blue
PB = (80,  168, 232, 255)
SB = (144, 208, 248, 255)
HI = (200, 240, 255, 255)  # highlight shimmer

# Red / enemy
DB = (90,  10,  10,  255)
ER = (212, 32,  32,  255)
FR = (240, 96,  32,  255)
EM = (248, 160, 96,  255)

# Yellow / gold
DG = (168, 112, 0,   255)
GD = (232, 184, 0,   255)
YL = (255, 224, 64,  255)
PY = (255, 248, 160, 255)  # pale yellow highlight

# Purple / magic
DM = (26,  10,  58,  255)  # deep magic
MP = (90,  32,  160, 255)  # magic purple
MV = (144, 80,  224, 255)  # mana violet
SG = (208, 144, 255, 255)  # spell glow

BK = (10,  10,  10,  255)  # background black


# ─── PNG writer ──────────────────────────────────────────────────────────────

def _make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    payload = chunk_type + data
    crc = zlib.crc32(payload) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)


def write_png(path: str, pixels: list) -> None:
    height = len(pixels)
    width = len(pixels[0])
    ihdr_data = struct.pack('>II', width, height) + bytes([8, 6, 0, 0, 0])
    raw_rows = b''
    for row in pixels:
        raw_rows += b'\x00'
        for r, g, b, a in row:
            raw_rows += bytes([r, g, b, a])
    compressed = zlib.compress(raw_rows, 9)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(_make_chunk(b'IHDR', ihdr_data))
        f.write(_make_chunk(b'IDAT', compressed))
        f.write(_make_chunk(b'IEND', b''))
    print(f'  wrote {path}  ({width}×{height})')


def write_ico(path: str, images_16: list, images_32: list) -> None:
    """Write a multi-size ICO file containing 16×16 and 32×32 images."""
    entries = []
    for size, pixels in [(16, images_16), (32, images_32)]:
        # Build BMP DIB (no file header, top-down via negative height not used in ICO)
        w, h = size, size
        bmp_header = struct.pack('<IiiHHIIiiII',
            40,        # header size
            w,         # width
            h * 2,     # height (doubled for AND mask in ICO)
            1,         # planes
            32,        # bpp
            0,         # no compression
            0,         # image size (0 ok for uncompressed)
            0, 0,      # pixels per meter
            0, 0       # colors
        )
        # Pixel data bottom-up, BGRA
        pixel_data = b''
        for row in reversed(pixels):
            for r, g, b, a in row:
                pixel_data += bytes([b, g, r, a])
        # AND mask (1bpp, rows padded to 4 bytes)
        and_row_bytes = (w + 31) // 32 * 4
        and_mask = b'\x00' * and_row_bytes * h
        entries.append(bmp_header + pixel_data + and_mask)

    # ICO header
    num = len(entries)
    header = struct.pack('<HHH', 0, 1, num)
    offset = 6 + num * 16  # header + directory entries
    directory = b''
    sizes = [16, 32]
    for i, (entry_data, sz) in enumerate(zip(entries, sizes)):
        w_byte = sz if sz < 256 else 0
        h_byte = sz if sz < 256 else 0
        directory += struct.pack('<BBBBHHII',
            w_byte, h_byte,
            0,    # color count
            0,    # reserved
            1,    # planes
            32,   # bpp
            len(entry_data),
            offset
        )
        offset += len(entry_data)

    with open(path, 'wb') as f:
        f.write(header)
        f.write(directory)
        for entry_data in entries:
            f.write(entry_data)
    print(f'  wrote {path}  (multi-size ICO)')


# ─── Helper: create blank canvas ────────────────────────────────────────────

def canvas(w, h, fill=BK):
    return [[fill for _ in range(w)] for _ in range(h)]


def put_pixel(img, x, y, color):
    if 0 <= y < len(img) and 0 <= x < len(img[0]) and color[3] > 0:
        img[y][x] = color


def fill_rect(img, x, y, w, h, color):
    for dy in range(h):
        for dx in range(w):
            put_pixel(img, x + dx, y + dy, color)


def draw_circle_filled(img, cx, cy, r, color):
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                put_pixel(img, cx + dx, cy + dy, color)


def scale_image(pixels, factor):
    """Integer-scale an image by factor (nearest neighbor)."""
    h = len(pixels)
    w = len(pixels[0])
    out = []
    for y in range(h):
        row = []
        for x in range(w):
            row.extend([pixels[y][x]] * factor)
        for _ in range(factor):
            out.append(list(row))
    return out


def resize_nearest(pixels, new_w, new_h):
    """Resize image to arbitrary size using nearest-neighbor sampling."""
    h = len(pixels)
    w = len(pixels[0])
    out = []
    for y in range(new_h):
        src_y = min(int(y * h / new_h), h - 1)
        row = []
        for x in range(new_w):
            src_x = min(int(x * w / new_w), w - 1)
            row.append(pixels[src_y][src_x])
        out.append(row)
    return out


# ─── Pixel font (3×5 uppercase + digits) ────────────────────────────────────

FONT = {
    'P': [
        [1,1,0],
        [1,0,1],
        [1,1,0],
        [1,0,0],
        [1,0,0],
    ],
    'I': [
        [1,1,1],
        [0,1,0],
        [0,1,0],
        [0,1,0],
        [1,1,1],
    ],
    'X': [
        [1,0,1],
        [1,0,1],
        [0,1,0],
        [1,0,1],
        [1,0,1],
    ],
    'E': [
        [1,1,1],
        [1,0,0],
        [1,1,0],
        [1,0,0],
        [1,1,1],
    ],
    'L': [
        [1,0,0],
        [1,0,0],
        [1,0,0],
        [1,0,0],
        [1,1,1],
    ],
    'R': [
        [1,1,0],
        [1,0,1],
        [1,1,0],
        [1,0,1],
        [1,0,1],
    ],
    'A': [
        [0,1,0],
        [1,0,1],
        [1,1,1],
        [1,0,1],
        [1,0,1],
    ],
    'M': [
        [1,0,1],
        [1,1,1],
        [1,1,1],
        [1,0,1],
        [1,0,1],
    ],
    'O': [
        [0,1,0],
        [1,0,1],
        [1,0,1],
        [1,0,1],
        [0,1,0],
    ],
    'D': [
        [1,1,0],
        [1,0,1],
        [1,0,1],
        [1,0,1],
        [1,1,0],
    ],
    'N': [
        [1,0,1],
        [1,1,1],
        [1,1,1],
        [1,0,1],
        [1,0,1],
    ],
    'G': [
        [0,1,1],
        [1,0,0],
        [1,0,1],
        [1,0,1],
        [0,1,1],
    ],
    'T': [
        [1,1,1],
        [0,1,0],
        [0,1,0],
        [0,1,0],
        [0,1,0],
    ],
    'S': [
        [0,1,1],
        [1,0,0],
        [0,1,0],
        [0,0,1],
        [1,1,0],
    ],
    'H': [
        [1,0,1],
        [1,0,1],
        [1,1,1],
        [1,0,1],
        [1,0,1],
    ],
    'W': [
        [1,0,1],
        [1,0,1],
        [1,1,1],
        [1,1,1],
        [1,0,1],
    ],
    'C': [
        [0,1,1],
        [1,0,0],
        [1,0,0],
        [1,0,0],
        [0,1,1],
    ],
    'V': [
        [1,0,1],
        [1,0,1],
        [1,0,1],
        [1,0,1],
        [0,1,0],
    ],
    '.': [
        [0,0,0],
        [0,0,0],
        [0,0,0],
        [0,0,0],
        [0,1,0],
    ],
    ' ': [
        [0,0,0],
        [0,0,0],
        [0,0,0],
        [0,0,0],
        [0,0,0],
    ],
}


def draw_text(img, text, x, y, color, scale=1):
    """Draw text using 3×5 pixel font at given position with optional scale."""
    cursor_x = x
    for ch in text.upper():
        glyph = FONT.get(ch)
        if glyph is None:
            cursor_x += 4 * scale
            continue
        for gy, row in enumerate(glyph):
            for gx, val in enumerate(row):
                if val:
                    for sy in range(scale):
                        for sx in range(scale):
                            put_pixel(img, cursor_x + gx * scale + sx,
                                      y + gy * scale + sy, color)
        cursor_x += (len(glyph[0]) + 1) * scale


def text_width(text, scale=1):
    w = 0
    for ch in text.upper():
        glyph = FONT.get(ch)
        if glyph is None:
            w += 4 * scale
        else:
            w += (len(glyph[0]) + 1) * scale
    return w - scale  # remove trailing gap


# ═══════════════════════════════════════════════════════════════════════════════
# LOADING SCREEN (320×180)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_loading_screen():
    W, H = 320, 180
    img = canvas(W, H, DO)  # deep ocean background

    # Sky gradient (top 80 rows)
    sky_colors = [
        (DO, 0), (DP, 20), (SY, 40), (PB, 55), (SB, 70), (HI, 78)
    ]

    for y in range(80):
        # Find gradient segment
        t = y / 80.0
        if t < 0.25:
            color = DO
        elif t < 0.5:
            color = DP
        elif t < 0.7:
            color = SY
        elif t < 0.85:
            color = PB
        else:
            color = SB
        for x in range(W):
            img[y][x] = color

    # Stars in the dark sky area
    import random
    rng = random.Random(42)  # deterministic
    for _ in range(40):
        sx = rng.randint(0, W - 1)
        sy = rng.randint(0, 35)
        star_colors = [NW, PY, SB, HI]
        put_pixel(img, sx, sy, rng.choice(star_colors))

    # Mountains (background layer) - purple/dark
    for x in range(W):
        # Two overlapping mountain peaks
        h1 = int(25 * math.sin(x * 0.02 + 1.0) + 15 * math.sin(x * 0.035 + 2.5))
        h2 = int(20 * math.sin(x * 0.025 + 3.0) + 12 * math.sin(x * 0.04 + 1.2))
        peak = max(h1, h2)
        base_y = 75
        for y in range(base_y - peak, base_y + 5):
            if 0 <= y < H:
                if y < base_y - peak + 5:
                    put_pixel(img, x, y, DM)  # snow/magic peak
                elif y < base_y - peak + 10:
                    put_pixel(img, x, y, MP)
                else:
                    put_pixel(img, x, y, DM)

    # Green hills (midground)
    for x in range(W):
        h = int(10 * math.sin(x * 0.03 + 0.5) + 6 * math.sin(x * 0.06 + 1.8))
        base_y = 90
        for y in range(base_y - h, base_y + 5):
            if 0 <= y < H:
                if y < base_y - h + 3:
                    put_pixel(img, x, y, LG)
                elif y < base_y - h + 6:
                    put_pixel(img, x, y, FG)
                else:
                    put_pixel(img, x, y, DF)

    # Ground (bottom area) - grass and soil
    for y in range(90, 140):
        for x in range(W):
            if y < 95:
                # Grass top
                noise = rng.random()
                if noise < 0.3:
                    img[y][x] = BG
                elif noise < 0.6:
                    img[y][x] = LG
                else:
                    img[y][x] = FG
            elif y < 100:
                noise = rng.random()
                img[y][x] = FG if noise < 0.5 else DF
            else:
                noise = rng.random()
                if noise < 0.3:
                    img[y][x] = BD
                elif noise < 0.6:
                    img[y][x] = BN
                else:
                    img[y][x] = DT

    # Trees (left side - forest biome)
    def draw_tree(img, tx, ty, trunk_h, canopy_r):
        # Trunk
        for dy in range(trunk_h):
            put_pixel(img, tx, ty + dy, BN)
            put_pixel(img, tx + 1, ty + dy, BD)
        # Canopy
        cy = ty - canopy_r + 1
        for dy in range(-canopy_r, canopy_r + 1):
            width = canopy_r - abs(dy)
            for dx in range(-width, width + 1):
                noise = rng.random()
                c = LG if noise < 0.4 else (FG if noise < 0.7 else BG)
                put_pixel(img, tx + dx, cy + dy, c)

    # Forest trees on the left
    tree_positions = [(20, 78, 14, 6), (35, 80, 12, 5), (50, 82, 10, 4),
                      (10, 82, 10, 5), (42, 76, 16, 7)]
    for tx, ty, th, cr in tree_positions:
        draw_tree(img, tx, ty, th, cr)

    # Trees on the right
    tree_positions_r = [(270, 80, 12, 5), (285, 78, 14, 6), (300, 82, 10, 4),
                        (258, 82, 10, 5), (295, 76, 16, 7)]
    for tx, ty, th, cr in tree_positions_r:
        draw_tree(img, tx, ty, th, cr)

    # Desert area (right-center, sand colored strip)
    for y in range(88, 95):
        for x in range(180, 240):
            t = (x - 180) / 60.0
            if t < 0.15 or t > 0.85:
                continue  # blend edges
            noise = rng.random()
            if noise < 0.4:
                img[y][x] = SN
            elif noise < 0.7:
                img[y][x] = DS
            else:
                img[y][x] = PS

    # Volcanic area hint (far right, lava glow)
    for y in range(85, 92):
        for x in range(240, 265):
            t = (x - 240) / 25.0
            if t < 0.1 or t > 0.9:
                continue
            noise = rng.random()
            if noise < 0.3:
                img[y][x] = ER
            elif noise < 0.6:
                img[y][x] = FR
            else:
                img[y][x] = DK

    # Ice area hint (far left)
    for y in range(85, 92):
        for x in range(55, 80):
            t = (x - 55) / 25.0
            if t < 0.1 or t > 0.9:
                continue
            noise = rng.random()
            if noise < 0.4:
                img[y][x] = SB
            elif noise < 0.7:
                img[y][x] = HI
            else:
                img[y][x] = PB

    # Player character (centered, based on PLAYER sprite from gen_sprites.py)
    # Simplified 16×24 player at center of screen
    px, py = 152, 72  # top-left of player sprite
    player_sprite = [
        [T,  T, T,  T,  T,  K,  K,  K,  K,  K,  T,  T,  T,  T,  T,  T],
        [T,  T, T,  T,  K,  PG, PG, PG, PG, PG, K,  T,  T,  T,  T,  T],
        [T,  T, T,  T,  K,  PG, PG, PG, PG, PG, K,  T,  T,  T,  T,  T],
        [T,  T, T,  T,  K,  PG, K,  PG, K,  PG, K,  T,  T,  T,  T,  T],
        [T,  T, T,  T,  K,  PG, PG, K,  PG, PG, K,  T,  T,  T,  T,  T],
        [T,  T, T,  T,  K,  K,  K,  K,  K,  K,  K,  T,  T,  T,  T,  T],
        [T,  T, T,  K,  PB, PB, PB, PB, PB, PB, PB, K,  T,  T,  T,  T],
        [T,  T, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  T,  T,  T],
        [T,  K, PB, SB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  T,  T],
        [T,  K, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  T,  T],
        [T,  K, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  T,  T],
        [T,  K, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  T,  T],
        [T,  K, PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  T,  T],
        [T,  T, K,  DG, DG, DG, DG, DG, DG, DG, DG, DG, K,  T,  T,  T],
        [T,  T, T,  K,  PB, PB, PB, K,  T,  K,  PB, PB, PB, K,  T,  T],
        [T,  T, T,  K,  PB, PB, PB, K,  T,  K,  PB, PB, PB, K,  T,  T],
        [T,  T, T,  K,  PB, PB, PB, K,  T,  K,  PB, PB, PB, K,  T,  T],
        [T,  T, T,  K,  PB, PB, PB, K,  T,  K,  PB, PB, PB, K,  T,  T],
        [T,  T, T,  K,  DP, DP, DP, K,  T,  K,  DP, DP, DP, K,  T,  T],
        [T,  T, T,  K,  DT, DT, DT, K,  T,  K,  DT, DT, DT, K,  T,  T],
        [T,  T, K,  DT, DT, DT, DT, K,  T,  K,  DT, DT, DT, DT, K,  T],
        [T,  T, K,  DT, DT, DT, DT, K,  T,  K,  DT, DT, DT, DT, K,  T],
        [T,  T, K,  K,  K,  K,  K,  T,  T,  T,  K,  K,  K,  K,  K,  T],
    ]
    for dy, row in enumerate(player_sprite):
        for dx, c in enumerate(row):
            put_pixel(img, px + dx, py + dy, c)

    # Enemy goblin (left of player)
    ex, ey = 120, 78
    enemy_mini = [
        [T, T, K,  T,  T,  T,  T,  T,  K,  T, T],
        [T, K, DB, K,  K,  K,  K,  K,  DB, K, T],
        [T, K, ER, ER, ER, ER, ER, ER, ER, K, T],
        [T, K, ER, K,  ER, ER, ER, K,  ER, K, T],
        [T, K, ER, ER, K,  ER, K,  ER, ER, K, T],
        [K, ER, ER, ER, ER, ER, ER, ER, ER, ER, K],
        [K, ER, ER, ER, ER, ER, ER, ER, ER, ER, K],
        [T, K, DB, DB, DB, DB, DB, DB, DB, K, T],
        [T, T, K,  ER, ER, K,  ER, ER, K,  T, T],
        [T, T, K,  ER, ER, K,  ER, ER, K,  T, T],
        [T, T, K,  DB, DB, K,  DB, DB, K,  T, T],
        [T, K, K,  K,  K,  T,  K,  K,  K,  K, T],
    ]
    for dy, row in enumerate(enemy_mini):
        for dx, c in enumerate(row):
            put_pixel(img, ex + dx, ey + dy, c)

    # XP orb (right of player)
    ox, oy = 190, 84
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            dist = math.sqrt(dx*dx + dy*dy)
            if dist <= 4:
                if dist <= 1.5:
                    put_pixel(img, ox + dx, oy + dy, YL)
                elif dist <= 3:
                    put_pixel(img, ox + dx, oy + dy, GD)
                else:
                    put_pixel(img, ox + dx, oy + dy, DG)

    # Magic sparkles near player
    sparkle_pos = [(145, 75), (175, 78), (155, 98), (165, 70), (140, 88)]
    for sx, sy in sparkle_pos:
        put_pixel(img, sx, sy, SG)
        put_pixel(img, sx + 1, sy, MV)

    # ─── Title "PIXELREALM" ─────────────────────────────────────────────
    title = "PIXELREALM"
    tw = text_width(title, scale=2)
    title_x = (W - tw) // 2
    title_y = 20

    # Title shadow
    draw_text(img, title, title_x + 1, title_y + 1, K, scale=2)
    # Title text (gold)
    draw_text(img, title, title_x, title_y, GD, scale=2)
    # Title highlight on top row
    draw_text(img, title, title_x, title_y, YL, scale=1)

    # Subtitle
    sub = "LOADING..."
    sw = text_width(sub, scale=1)
    sub_x = (W - sw) // 2
    sub_y = 145
    draw_text(img, sub, sub_x + 1, sub_y + 1, K, scale=1)
    draw_text(img, sub, sub_x, sub_y, PG, scale=1)

    # Progress bar zone (bottom area)
    bar_y = 155
    bar_h = 6
    bar_x = 60
    bar_w = 200

    # Bar background
    fill_rect(img, bar_x - 1, bar_y - 1, bar_w + 2, bar_h + 2, K)
    fill_rect(img, bar_x, bar_y, bar_w, bar_h, DK)

    # Bar fill (70% filled for visual appeal)
    fill_w = int(bar_w * 0.7)
    fill_rect(img, bar_x, bar_y, fill_w, bar_h, PB)
    # Highlight on top of bar
    fill_rect(img, bar_x, bar_y, fill_w, 1, SB)
    # Dark bottom
    fill_rect(img, bar_x, bar_y + bar_h - 1, fill_w, 1, DP)

    # Bottom dark area (below ground)
    for y in range(140, H):
        for x in range(W):
            if img[y][x] == DO or img[y][x] == BK:
                img[y][x] = (10, 10, 10, 255)

    return img


# ═══════════════════════════════════════════════════════════════════════════════
# FAVICON / ICON (base design at 16×16, scaled up)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_favicon_16():
    """16×16 favicon — stylized shield with sword, game logo."""
    # Shield shape with embedded sword
    icon = [
        #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
        [T,  T,  T,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  T,  T,  T],  # 0 top
        [T,  T,  K,  PB, PB, PB, PB, SB, PB, PB, PB, PB, PB, K,  T,  T],  # 1
        [T,  K,  PB, PB, PB, PB, PB, SB, PB, PB, PB, PB, PB, PB, K,  T],  # 2
        [T,  K,  PB, PB, PB, PB, PB, NW, PB, PB, PB, PB, PB, PB, K,  T],  # 3 sword tip
        [T,  K,  PB, PB, PB, PB, PB, NW, PB, PB, PB, PB, PB, PB, K,  T],  # 4
        [T,  K,  PB, PB, PB, PB, PB, NW, PB, PB, PB, PB, PB, PB, K,  T],  # 5
        [T,  K,  DP, PB, PB, PB, PB, NW, PB, PB, PB, PB, PB, DP, K,  T],  # 6
        [T,  K,  DP, PB, PB, GD, GD, NW, GD, GD, PB, PB, PB, DP, K,  T],  # 7 crossguard
        [T,  K,  DP, PB, PB, PB, PB, NW, PB, PB, PB, PB, PB, DP, K,  T],  # 8
        [T,  K,  DP, DP, PB, PB, PB, PG, PB, PB, PB, PB, DP, DP, K,  T],  # 9
        [T,  T,  K,  DP, DP, PB, PB, PG, PB, PB, PB, DP, DP, K,  T,  T],  # 10
        [T,  T,  K,  DP, DP, PB, PB, DT, PB, PB, PB, DP, DP, K,  T,  T],  # 11 grip
        [T,  T,  T,  K,  DP, DP, PB, DT, PB, PB, DP, DP, K,  T,  T,  T],  # 12
        [T,  T,  T,  T,  K,  DP, DP, GD, DP, DP, DP, K,  T,  T,  T,  T],  # 13 pommel
        [T,  T,  T,  T,  T,  K,  K,  K,  K,  K,  K,  T,  T,  T,  T,  T],  # 14
        [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],  # 15
    ]
    return icon


def generate_favicon_32():
    """32×32 favicon — scaled from 16×16 base with detail pass."""
    base = generate_favicon_16()
    return scale_image(base, 2)


def generate_icon_large(base_size):
    """Generate larger icon by scaling the 16×16 base design."""
    base = generate_favicon_16()
    return resize_nearest(base, base_size, base_size)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print('Generating loading screen and favicon assets...')

    # 1. Loading screen
    loading = generate_loading_screen()
    write_png(os.path.join(OUT_UI, 'loading-screen.png'), loading)

    # 2. Favicons
    icon_16 = generate_favicon_16()
    icon_32 = generate_favicon_32()

    # Write ICO (multi-size)
    write_ico(os.path.join(OUT_PUBLIC, 'favicon.ico'), icon_16, icon_32)

    # Write PNG favicons at 192 and 512
    icon_192 = generate_icon_large(192)
    write_png(os.path.join(OUT_PUBLIC, 'favicon-192.png'), icon_192)

    icon_512 = generate_icon_large(512)
    write_png(os.path.join(OUT_PUBLIC, 'favicon-512.png'), icon_512)

    # 3. Apple touch icon (180×180)
    icon_180 = generate_icon_large(180)
    write_png(os.path.join(OUT_PUBLIC, 'apple-touch-icon.png'), icon_180)

    print('Done — all loading screen and favicon assets generated.')
