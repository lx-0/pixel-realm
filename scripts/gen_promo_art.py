#!/usr/bin/env python3
"""
Generate itch.io store page promotional art for PixelRealm.
Uses only Python stdlib (struct + zlib) — no PIL required.

Outputs:
  - public/promo/cover_itchio_630x500.png    (630×500)  — cover image
  - public/promo/banner_header_960x200.png   (960×200)  — page banner
  - public/promo/feature_combat.png          (1280×720) — combat scene
  - public/promo/feature_exploration.png     (1280×720) — exploration scene
  - public/promo/feature_town.png            (1280×720) — town scene
  - public/promo/feature_boss.png            (1280×720) — boss fight scene
  - public/promo/feature_raid.png            (1280×720) — guild raid scene
"""

import struct
import zlib
import os
import math
import random

BASE = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(BASE, 'public', 'promo')
os.makedirs(OUT, exist_ok=True)

# ─── Palette (RGBA) from ART-STYLE-GUIDE.md ─────────────────────────────────
T = (0, 0, 0, 0)  # transparent
_ = T

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
DS = (212, 168, 90,  255)
PS = (232, 208, 138, 255)

# Greens
DF = (26,  58,  26,  255)
FG = (45,  110, 45,  255)
LG = (76,  155, 76,  255)
BG = (120, 200, 120, 255)
FL = (168, 228, 160, 255)

# Cyan / player
DO = (10,  26,  58,  255)
DP = (26,  74,  138, 255)
SY = (42,  122, 192, 255)
PB = (80,  168, 232, 255)
SB = (144, 208, 248, 255)
HI = (200, 240, 255, 255)

# Red / enemy
DB = (90,  10,  10,  255)
RD = (160, 16,  16,  255)
ER = (212, 32,  32,  255)
FR = (240, 96,  32,  255)
EM = (248, 160, 96,  255)

# Yellow / gold
DG = (168, 112, 0,   255)
GD = (232, 184, 0,   255)
YL = (255, 224, 64,  255)
PY = (255, 248, 160, 255)

# Purple / magic
DM = (26,  10,  58,  255)
MP = (90,  32,  160, 255)
MV = (144, 80,  224, 255)
SG = (208, 144, 255, 255)

BK = (10,  10,  10,  255)


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
    sz = os.path.getsize(path)
    print(f'  wrote {path}  ({width}x{height}, {sz} bytes)')


# ─── Drawing helpers ─────────────────────────────────────────────────────────

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


def draw_outline_rect(img, x, y, w, h, color):
    for dx in range(w):
        put_pixel(img, x + dx, y, color)
        put_pixel(img, x + dx, y + h - 1, color)
    for dy in range(h):
        put_pixel(img, x, y + dy, color)
        put_pixel(img, x + w - 1, y + dy, color)


def scale_image(pixels, factor):
    out = []
    for y in range(len(pixels)):
        row = []
        for x in range(len(pixels[0])):
            row.extend([pixels[y][x]] * factor)
        for _ in range(factor):
            out.append(list(row))
    return out


def blend_color(c1, c2, t):
    """Blend two RGBA colors, t=0 gives c1, t=1 gives c2."""
    t = max(0.0, min(1.0, t))
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
        255,
    )


# ─── Pixel font (3×5 uppercase + digits + punctuation) ──────────────────────

FONT = {
    'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    'B': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
    'C': [[0,1,1],[1,0,0],[1,0,0],[1,0,0],[0,1,1]],
    'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
    'E': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
    'F': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
    'G': [[0,1,1],[1,0,0],[1,0,1],[1,0,1],[0,1,1]],
    'H': [[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
    'J': [[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,0]],
    'K': [[1,0,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
    'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
    'M': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
    'N': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
    'O': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
    'P': [[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
    'Q': [[0,1,0],[1,0,1],[1,0,1],[1,1,1],[0,1,1]],
    'R': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
    'S': [[0,1,1],[1,0,0],[0,1,0],[0,0,1],[1,1,0]],
    'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
    'U': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
    'V': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
    'W': [[1,0,1],[1,0,1],[1,1,1],[1,1,1],[1,0,1]],
    'X': [[1,0,1],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
    'Y': [[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
    'Z': [[1,1,1],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
    '0': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
    '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
    '2': [[0,1,0],[1,0,1],[0,0,1],[0,1,0],[1,1,1]],
    '3': [[1,1,0],[0,0,1],[0,1,0],[0,0,1],[1,1,0]],
    '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
    '5': [[1,1,1],[1,0,0],[1,1,0],[0,0,1],[1,1,0]],
    '6': [[0,1,1],[1,0,0],[1,1,0],[1,0,1],[0,1,0]],
    '7': [[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
    '8': [[0,1,0],[1,0,1],[0,1,0],[1,0,1],[0,1,0]],
    '9': [[0,1,0],[1,0,1],[0,1,1],[0,0,1],[1,1,0]],
    '.': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,1,0]],
    '!': [[0,1,0],[0,1,0],[0,1,0],[0,0,0],[0,1,0]],
    '-': [[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
    ':': [[0,0,0],[0,1,0],[0,0,0],[0,1,0],[0,0,0]],
    ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
}


def draw_text(img, text, x, y, color, scale=1):
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
    return w - scale


# ─── Sprite definitions ─────────────────────────────────────────────────────

# Player character (16×23 based on gen_loading_favicon.py)
PLAYER_SPRITE = [
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

# Enemy goblin (11×12)
ENEMY_GOBLIN = [
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

# Skeleton enemy (11×14)
ENEMY_SKELETON = [
    [T,  T,  T,  K,  K,  K,  K,  K,  T,  T,  T],
    [T,  T,  K,  NW, NW, NW, NW, NW, K,  T,  T],
    [T,  T,  K,  NW, K,  NW, K,  NW, K,  T,  T],
    [T,  T,  K,  NW, NW, K,  NW, NW, K,  T,  T],
    [T,  T,  T,  K,  NW, NW, NW, K,  T,  T,  T],
    [T,  T,  T,  K,  K,  K,  K,  K,  T,  T,  T],
    [T,  T,  K,  PG, PG, PG, PG, PG, K,  T,  T],
    [T,  K,  K,  PG, PG, PG, PG, PG, K,  K,  T],
    [T,  K,  T,  K,  PG, PG, PG, K,  T,  K,  T],
    [T,  T,  T,  K,  PG, PG, PG, K,  T,  T,  T],
    [T,  T,  T,  K,  K,  PG, K,  K,  T,  T,  T],
    [T,  T,  K,  PG, T,  K,  T,  PG, K,  T,  T],
    [T,  T,  K,  PG, T,  K,  T,  PG, K,  T,  T],
    [T,  K,  K,  K,  T,  T,  T,  K,  K,  K,  T],
]

# Slime enemy (10×8)
ENEMY_SLIME = [
    [T,  T,  T,  K,  K,  K,  K,  T,  T,  T],
    [T,  T,  K,  LG, LG, LG, LG, K,  T,  T],
    [T,  K,  LG, BG, LG, LG, BG, LG, K,  T],
    [K,  LG, LG, K,  LG, LG, K,  LG, LG, K],
    [K,  FG, FG, FG, FG, FG, FG, FG, FG, K],
    [K,  FG, FG, FG, FG, FG, FG, FG, FG, K],
    [T,  K,  DF, DF, DF, DF, DF, DF, K,  T],
    [T,  T,  K,  K,  K,  K,  K,  K,  T,  T],
]

# Boss dragon head (18×16) — large enemy for boss/raid scenes
BOSS_DRAGON = [
    [T,  T,  K,  K,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  K,  K,  T,  T],
    [T,  K,  ER, ER, K,  T,  T,  T,  T,  T,  T,  T,  T,  K,  ER, ER, K,  T],
    [K,  ER, ER, ER, ER, K,  K,  K,  K,  K,  K,  K,  K,  ER, ER, ER, ER, K],
    [K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K],
    [K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K],
    [K,  ER, ER, YL, K,  ER, ER, ER, ER, ER, ER, ER, K,  YL, ER, ER, ER, K],
    [K,  ER, ER, K,  K,  ER, ER, ER, ER, ER, ER, ER, K,  K,  ER, ER, ER, K],
    [K,  FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, K],
    [T,  K,  FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, K,  T],
    [T,  K,  DB, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, FR, DB, K,  T],
    [T,  T,  K,  DB, FR, K,  FR, K,  FR, K,  FR, K,  FR, DB, K,  T,  T,  T],
    [T,  T,  T,  K,  DB, DB, K,  K,  DB, K,  K,  DB, DB, K,  T,  T,  T,  T],
    [T,  T,  T,  T,  K,  K,  K,  T,  K,  T,  K,  K,  K,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  K,  FR, K,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  K,  FR, FR, FR, K,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  K,  K,  K,  T,  T,  T,  T,  T,  T,  T,  T],
]

# NPC villager (10×14)
NPC_VILLAGER = [
    [T,  T,  T,  K,  K,  K,  K,  T,  T,  T],
    [T,  T,  K,  SN, SN, SN, SN, K,  T,  T],
    [T,  T,  K,  PG, PG, PG, PG, K,  T,  T],
    [T,  T,  K,  PG, K,  PG, K,  PG, K,  T],
    [T,  T,  K,  PG, PG, K,  PG, PG, K,  T],
    [T,  T,  T,  K,  K,  K,  K,  K,  T,  T],
    [T,  T,  K,  FG, FG, FG, FG, K,  T,  T],
    [T,  K,  FG, FG, FG, FG, FG, FG, K,  T],
    [T,  K,  FG, FG, FG, FG, FG, FG, K,  T],
    [T,  T,  K,  FG, FG, FG, FG, K,  T,  T],
    [T,  T,  K,  BN, K,  K,  BN, K,  T,  T],
    [T,  T,  K,  BN, K,  K,  BN, K,  T,  T],
    [T,  T,  K,  DT, K,  K,  DT, K,  T,  T],
    [T,  K,  K,  K,  T,  T,  K,  K,  K,  T],
]

# Sword item (5×14)
SWORD_ITEM = [
    [T,  T,  NW, T,  T],
    [T,  T,  NW, T,  T],
    [T,  T,  PG, T,  T],
    [T,  T,  PG, T,  T],
    [T,  T,  PG, T,  T],
    [T,  T,  PG, T,  T],
    [T,  T,  PG, T,  T],
    [T,  T,  PG, T,  T],
    [T,  T,  PG, T,  T],
    [T,  GD, PG, GD, T],
    [GD, DG, PG, DG, GD],
    [T,  T,  DT, T,  T],
    [T,  T,  DT, T,  T],
    [T,  T,  DG, T,  T],
]


def draw_sprite(img, sprite, x, y):
    """Blit a sprite (list of rows of RGBA tuples) onto img at (x,y)."""
    for dy, row in enumerate(sprite):
        for dx, c in enumerate(row):
            put_pixel(img, x + dx, y + dy, c)


# ─── Scene elements ──────────────────────────────────────────────────────────

def draw_sky(img, w, h_limit, rng, night=False):
    """Draw a gradient sky from top to h_limit."""
    if night:
        colors = [(DO, 0.0), (DM, 0.4), (DO, 0.7), (DP, 1.0)]
    else:
        colors = [(DO, 0.0), (DP, 0.25), (SY, 0.5), (PB, 0.7), (SB, 0.85), (HI, 1.0)]
    for y in range(h_limit):
        t = y / max(h_limit - 1, 1)
        # find segment
        c = colors[0][0]
        for i in range(len(colors) - 1):
            if colors[i][1] <= t <= colors[i + 1][1]:
                seg_t = (t - colors[i][1]) / (colors[i + 1][1] - colors[i][1])
                c = blend_color(colors[i][0], colors[i + 1][0], seg_t)
                break
        for x in range(w):
            img[y][x] = c

    # Stars
    star_limit = h_limit // 3 if not night else h_limit * 2 // 3
    n_stars = 30 if not night else 80
    for _ in range(n_stars):
        sx = rng.randint(0, w - 1)
        sy = rng.randint(0, star_limit)
        put_pixel(img, sx, sy, rng.choice([NW, PY, SB, HI]))


def draw_mountains(img, w, base_y, rng, color1=DM, color2=MP):
    """Draw mountain range."""
    seed_a = rng.random() * 10
    seed_b = rng.random() * 10
    for x in range(w):
        h1 = int(20 * math.sin(x * 0.015 + seed_a) + 12 * math.sin(x * 0.03 + seed_b))
        h2 = int(15 * math.sin(x * 0.02 + seed_a + 2) + 10 * math.sin(x * 0.04 + seed_b + 1))
        peak = max(h1, h2)
        for y in range(base_y - peak, base_y + 3):
            if 0 <= y < len(img):
                if y < base_y - peak + 4:
                    put_pixel(img, x, y, color2)
                else:
                    put_pixel(img, x, y, color1)


def draw_hills(img, w, base_y, rng, c_top=LG, c_mid=FG, c_bot=DF):
    """Draw rolling hills."""
    seed = rng.random() * 10
    for x in range(w):
        h = int(8 * math.sin(x * 0.025 + seed) + 5 * math.sin(x * 0.06 + seed + 1))
        for y in range(base_y - h, base_y + 3):
            if 0 <= y < len(img):
                depth = y - (base_y - h)
                if depth < 2:
                    put_pixel(img, x, y, c_top)
                elif depth < 5:
                    put_pixel(img, x, y, c_mid)
                else:
                    put_pixel(img, x, y, c_bot)


def draw_ground_grass(img, w, y_start, y_end, rng):
    """Draw grassy ground."""
    for y in range(y_start, min(y_end, len(img))):
        for x in range(w):
            depth = y - y_start
            if depth < 3:
                n = rng.random()
                img[y][x] = BG if n < 0.3 else (LG if n < 0.6 else FG)
            elif depth < 6:
                img[y][x] = FG if rng.random() < 0.5 else DF
            else:
                n = rng.random()
                img[y][x] = BD if n < 0.3 else (BN if n < 0.6 else DT)


def draw_ground_sand(img, w, y_start, y_end, rng):
    """Draw desert sand ground."""
    for y in range(y_start, min(y_end, len(img))):
        for x in range(w):
            n = rng.random()
            if y - y_start < 2:
                img[y][x] = PS if n < 0.3 else (DS if n < 0.6 else SN)
            else:
                img[y][x] = SN if n < 0.4 else (DT if n < 0.7 else BN)


def draw_ground_stone(img, w, y_start, y_end, rng):
    """Draw dungeon/stone ground."""
    for y in range(y_start, min(y_end, len(img))):
        for x in range(w):
            n = rng.random()
            img[y][x] = DK if n < 0.3 else (ST if n < 0.6 else K)
            # Tile grid lines
            if x % 16 == 0 or y % 16 == y_start % 16:
                img[y][x] = K


def draw_tree(img, tx, ty, trunk_h, canopy_r, rng):
    """Draw a tree with trunk and rounded canopy."""
    for dy in range(trunk_h):
        put_pixel(img, tx, ty + dy, BN)
        put_pixel(img, tx + 1, ty + dy, BD)
    cy = ty - canopy_r + 1
    for dy in range(-canopy_r, canopy_r + 1):
        width = canopy_r - abs(dy)
        for dx in range(-width, width + 1):
            c = LG if rng.random() < 0.4 else (FG if rng.random() < 0.5 else BG)
            put_pixel(img, tx + dx, cy + dy, c)


def draw_building(img, x, y, w, h, wall_color, roof_color, rng):
    """Draw a simple building with roof and door."""
    # Walls
    fill_rect(img, x, y, w, h, wall_color)
    draw_outline_rect(img, x, y, w, h, K)
    # Roof (triangle)
    roof_h = h // 3
    for ry in range(roof_h):
        t = ry / max(roof_h - 1, 1)
        half_w = int((w // 2 + 2) * (1 - t))
        cx = x + w // 2
        fill_rect(img, cx - half_w, y - roof_h + ry, half_w * 2, 1, roof_color)
    # Outline roof
    for ry in range(roof_h):
        t = ry / max(roof_h - 1, 1)
        half_w = int((w // 2 + 2) * (1 - t))
        cx = x + w // 2
        put_pixel(img, cx - half_w, y - roof_h + ry, K)
        put_pixel(img, cx + half_w - 1, y - roof_h + ry, K)
    # Door
    dw, dh = max(w // 4, 3), max(h // 3, 4)
    dx = x + (w - dw) // 2
    dy = y + h - dh
    fill_rect(img, dx, dy, dw, dh, BD)
    draw_outline_rect(img, dx, dy, dw, dh, K)
    put_pixel(img, dx + dw - 2, dy + dh // 2, GD)  # door handle
    # Window
    wx, wy = x + 2, y + 3
    if w > 10:
        fill_rect(img, wx, wy, 3, 3, SB)
        draw_outline_rect(img, wx, wy, 3, 3, K)
        wx2 = x + w - 5
        fill_rect(img, wx2, wy, 3, 3, SB)
        draw_outline_rect(img, wx2, wy, 3, 3, K)


def draw_hp_bar(img, x, y, w, fill_pct, bar_color):
    """Draw an HP bar."""
    fill_rect(img, x, y, w, 3, K)
    fill_rect(img, x + 1, y + 1, w - 2, 1, DK)
    fill_w = int((w - 2) * fill_pct)
    fill_rect(img, x + 1, y + 1, fill_w, 1, bar_color)


def draw_magic_particles(img, cx, cy, count, radius, rng):
    """Draw sparkle particles around a center point."""
    for _ in range(count):
        angle = rng.random() * math.pi * 2
        dist = rng.random() * radius
        px = int(cx + math.cos(angle) * dist)
        py = int(cy + math.sin(angle) * dist)
        c = rng.choice([SG, MV, MP, PY, YL])
        put_pixel(img, px, py, c)


def draw_fire_breath(img, sx, sy, length, spread, rng):
    """Draw a fire breath effect."""
    for i in range(length):
        t = i / max(length - 1, 1)
        w = int(spread * t) + 1
        for dy in range(-w, w + 1):
            if rng.random() < 0.7:
                if t < 0.3:
                    c = YL
                elif t < 0.6:
                    c = FR
                else:
                    c = rng.choice([ER, FR, EM])
                put_pixel(img, sx + i, sy + dy, c)


# ═════════════════════════════════════════════════════════════════════════════
# COVER IMAGE (630×500) — work at 126×100, scale ×5
# ═════════════════════════════════════════════════════════════════════════════

def generate_cover():
    """Cover image: player character centered with biome world and enemies."""
    W, H = 126, 100
    rng = random.Random(42)
    img = canvas(W, H, DO)

    # Sky
    draw_sky(img, W, 45, rng)

    # Mountains
    draw_mountains(img, W, 42, rng)

    # Hills
    draw_hills(img, W, 52, rng)

    # Ground - mixed biomes
    # Left: ice
    for y in range(52, 70):
        for x in range(0, 30):
            n = rng.random()
            img[y][x] = SB if n < 0.3 else (HI if n < 0.6 else PB)

    # Center: grass
    draw_ground_grass(img, W, 52, 70, rng)

    # Right: desert hint
    for y in range(52, 70):
        for x in range(96, W):
            n = rng.random()
            img[y][x] = DS if n < 0.3 else (SN if n < 0.6 else PS)

    # Trees
    tree_positions = [(10, 42, 10, 5), (20, 44, 8, 4), (100, 42, 10, 5), (110, 44, 8, 4)]
    for tx, ty, th, cr in tree_positions:
        draw_tree(img, tx, ty, th, cr, rng)

    # Player (centered, slightly below center)
    px, py = 55, 35
    draw_sprite(img, PLAYER_SPRITE, px, py)

    # Sword in hand (left side of player)
    draw_sprite(img, SWORD_ITEM, px - 5, py + 2)

    # Enemies flanking
    draw_sprite(img, ENEMY_GOBLIN, 28, 43)
    draw_sprite(img, ENEMY_SKELETON, 88, 40)
    draw_sprite(img, ENEMY_SLIME, 42, 50)
    draw_sprite(img, ENEMY_SLIME, 80, 52)

    # Magic particles around player
    draw_magic_particles(img, 63, 45, 20, 15, rng)

    # XP orbs scattered
    for ox, oy in [(38, 48), (85, 50), (50, 56), (75, 54)]:
        draw_circle_filled(img, ox, oy, 2, GD)
        put_pixel(img, ox, oy, YL)

    # Title "PIXELREALM" at top
    title = "PIXELREALM"
    tw = text_width(title, scale=3)
    title_x = (W - tw) // 2
    title_y = 6
    draw_text(img, title, title_x + 1, title_y + 1, K, scale=3)
    draw_text(img, title, title_x, title_y, GD, scale=3)
    # Highlight pass
    draw_text(img, title, title_x, title_y, YL, scale=2)

    # Subtitle
    sub = "PIXEL MMORPG"
    sw = text_width(sub, scale=1)
    sub_x = (W - sw) // 2
    sub_y = 24
    draw_text(img, sub, sub_x + 1, sub_y + 1, K, scale=1)
    draw_text(img, sub, sub_x, sub_y, PG, scale=1)

    # Dark ground/underground at bottom
    for y in range(70, H):
        for x in range(W):
            n = rng.random()
            img[y][x] = K if n < 0.3 else (DK if n < 0.6 else BK)

    # Decorative border
    for x in range(W):
        put_pixel(img, x, 0, GD)
        put_pixel(img, x, H - 1, GD)
    for y in range(H):
        put_pixel(img, 0, y, GD)
        put_pixel(img, W - 1, y, GD)

    # Version badge
    ver = "V0.8"
    vw = text_width(ver, scale=1)
    draw_text(img, ver, W - vw - 3, H - 8, ST, scale=1)

    return scale_image(img, 5)


# ═════════════════════════════════════════════════════════════════════════════
# BANNER / HEADER (960×200) — work at 240×50, scale ×4
# ═════════════════════════════════════════════════════════════════════════════

def generate_banner():
    """Panoramic banner showing multiple biomes left to right."""
    W, H = 240, 50
    rng = random.Random(99)
    img = canvas(W, H, DO)

    # Sky gradient
    draw_sky(img, W, 24, rng)

    # Distant mountains across full width
    draw_mountains(img, W, 22, rng, DM, MP)

    # Biome strips from left to right
    # Each biome occupies ~48px wide

    # Biome 1: Ice/Tundra (0-48)
    for y in range(24, 40):
        for x in range(0, 48):
            n = rng.random()
            if y < 27:
                img[y][x] = SB if n < 0.4 else HI
            else:
                img[y][x] = PB if n < 0.3 else (SB if n < 0.6 else HI)
    # Ice crystals
    for ix, iy in [(8, 22), (20, 24), (35, 23)]:
        for dy in range(5):
            put_pixel(img, ix, iy + dy, HI)
            put_pixel(img, ix - 1, iy + 2, SB)
            put_pixel(img, ix + 1, iy + 2, SB)

    # Biome 2: Forest (48-96)
    for y in range(24, 40):
        for x in range(48, 96):
            n = rng.random()
            if y < 27:
                img[y][x] = BG if n < 0.3 else (LG if n < 0.6 else FG)
            else:
                img[y][x] = FG if n < 0.4 else (DF if n < 0.7 else BD)
    for tx, ty, th, cr in [(55, 19, 7, 4), (70, 20, 6, 3), (85, 18, 8, 5)]:
        draw_tree(img, tx, ty, th, cr, rng)

    # Biome 3: Plains/Town (96-144) — center, most prominent
    for y in range(24, 40):
        for x in range(96, 144):
            n = rng.random()
            if y < 27:
                img[y][x] = BG if n < 0.3 else LG
            else:
                img[y][x] = FG if n < 0.3 else (LG if n < 0.5 else DF)
    # Small buildings
    draw_building(img, 104, 20, 12, 10, SN, ER, rng)
    draw_building(img, 120, 22, 10, 8, PG, DP, rng)
    draw_building(img, 134, 21, 11, 9, DS, FG, rng)

    # Biome 4: Desert (144-192)
    for y in range(24, 40):
        for x in range(144, 192):
            n = rng.random()
            if y < 27:
                img[y][x] = PS if n < 0.3 else (DS if n < 0.6 else SN)
            else:
                img[y][x] = SN if n < 0.4 else (DT if n < 0.7 else BN)
    # Cacti
    for cx in [155, 172, 185]:
        cy = 21
        for dy in range(6):
            put_pixel(img, cx, cy + dy, DF)
        put_pixel(img, cx - 1, cy + 2, DF)
        put_pixel(img, cx + 1, cy + 3, DF)
        put_pixel(img, cx - 2, cy + 2, DF)
        put_pixel(img, cx + 2, cy + 3, DF)

    # Biome 5: Volcanic (192-240)
    for y in range(24, 40):
        for x in range(192, 240):
            n = rng.random()
            if y < 27:
                img[y][x] = DK if n < 0.3 else (ST if n < 0.6 else K)
            else:
                img[y][x] = K if n < 0.3 else (DK if n < 0.6 else DB)
    # Lava pools
    for lx, ly in [(200, 26), (218, 28), (232, 25)]:
        for dy in range(-1, 2):
            for dx in range(-2, 3):
                c = FR if rng.random() < 0.5 else (YL if rng.random() < 0.3 else ER)
                put_pixel(img, lx + dx, ly + dy, c)
    # Volcano peak
    for x in range(210, 230):
        h = int(8 * (1 - abs(x - 220) / 10.0))
        if h > 0:
            for y in range(20 - h, 20):
                put_pixel(img, x, y, DK if y < 20 - h + 2 else K)
            # Lava glow at top
            if abs(x - 220) < 3:
                put_pixel(img, x, 20 - h, FR)
                put_pixel(img, x, 20 - h - 1, YL)

    # Underground layer (bottom)
    for y in range(40, H):
        for x in range(W):
            n = rng.random()
            img[y][x] = K if n < 0.4 else (DK if n < 0.7 else BK)

    # Title centered
    title = "PIXELREALM"
    tw = text_width(title, scale=2)
    tx = (W - tw) // 2
    ty_pos = 42
    draw_text(img, title, tx + 1, ty_pos + 1, K, scale=2)
    draw_text(img, title, tx, ty_pos, GD, scale=2)
    # Highlight
    draw_text(img, title, tx, ty_pos, YL, scale=1)

    # Decorative top/bottom gold lines
    for x in range(W):
        put_pixel(img, x, 0, DG)
        put_pixel(img, x, 1, GD)
        put_pixel(img, x, H - 2, GD)
        put_pixel(img, x, H - 1, DG)

    return scale_image(img, 4)


# ═════════════════════════════════════════════════════════════════════════════
# FEATURE GRAPHICS (1280×720 each) — work at 320×180, scale ×4
# ═════════════════════════════════════════════════════════════════════════════

def generate_feature_combat():
    """Feature 1: Combat scene in forest — player fighting goblins."""
    W, H = 320, 180
    rng = random.Random(101)
    img = canvas(W, H, DO)

    # Sky
    draw_sky(img, W, 70, rng)
    draw_mountains(img, W, 65, rng)
    draw_hills(img, W, 80, rng)

    # Forest ground
    draw_ground_grass(img, W, 80, 140, rng)

    # Trees
    for tx, ty, th, cr in [(15, 65, 16, 7), (40, 68, 12, 5), (270, 64, 16, 7),
                            (295, 68, 12, 5), (310, 66, 14, 6)]:
        draw_tree(img, tx, ty, th, cr, rng)

    # Player (centered, attacking pose)
    px, py = 145, 58
    draw_sprite(img, PLAYER_SPRITE, px, py)
    draw_sprite(img, SWORD_ITEM, px + 16, py + 2)  # sword swinging right

    # Slash effect (arc of bright pixels)
    for i in range(12):
        angle = -0.8 + i * 0.15
        sx = int(px + 20 + math.cos(angle) * 15)
        sy = int(py + 8 + math.sin(angle) * 12)
        put_pixel(img, sx, sy, NW)
        put_pixel(img, sx + 1, sy, PG)

    # Goblins attacking from left
    draw_sprite(img, ENEMY_GOBLIN, 100, 70)
    draw_sprite(img, ENEMY_GOBLIN, 80, 74)
    draw_sprite(img, ENEMY_GOBLIN, 115, 76)

    # Slimes on the right
    draw_sprite(img, ENEMY_SLIME, 200, 78)
    draw_sprite(img, ENEMY_SLIME, 220, 76)

    # Skeleton further back
    draw_sprite(img, ENEMY_SKELETON, 240, 68)

    # HP bars above entities
    draw_hp_bar(img, px + 2, py - 4, 14, 0.85, LG)
    draw_hp_bar(img, 100, 67, 10, 0.6, ER)
    draw_hp_bar(img, 80, 71, 10, 0.3, ER)
    draw_hp_bar(img, 200, 75, 10, 0.8, ER)

    # Damage numbers floating
    draw_text(img, "42", 105, 63, YL, scale=1)
    draw_text(img, "17", 85, 67, NW, scale=1)

    # XP orbs on ground
    for ox, oy in [(130, 82), (170, 80), (185, 85), (210, 83)]:
        draw_circle_filled(img, ox, oy, 2, GD)
        put_pixel(img, ox, oy, YL)

    # Magic particles
    draw_magic_particles(img, 155, 70, 15, 20, rng)

    # HUD overlay (top)
    fill_rect(img, 0, 0, W, 16, (10, 10, 10, 200))
    draw_text(img, "HP", 4, 4, ER, scale=1)
    fill_rect(img, 16, 4, 60, 5, DK)
    fill_rect(img, 16, 4, 51, 5, LG)  # 85% HP
    draw_text(img, "MP", 4, 10, PB, scale=1)
    fill_rect(img, 16, 10, 60, 3, DK)
    fill_rect(img, 16, 10, 45, 3, PB)

    # Level and XP
    draw_text(img, "LV 24", 84, 4, GD, scale=1)
    draw_text(img, "XP 1240", 84, 10, PG, scale=1)

    # Combat log area (bottom)
    fill_rect(img, 0, 155, W, 25, (10, 10, 10, 200))
    draw_text(img, "YOU HIT GOBLIN FOR 42 DMG", 4, 158, PG, scale=1)
    draw_text(img, "GOBLIN ATTACKS! 17 DMG", 4, 166, ER, scale=1)
    draw_text(img, "SLIME APPROACHES...", 4, 174, YL, scale=1)

    # Dark bottom
    for y in range(140, 155):
        for x in range(W):
            if img[y][x] == BK or img[y][x] == DO:
                n = rng.random()
                img[y][x] = K if n < 0.3 else DK

    return scale_image(img, 4)


def generate_feature_exploration():
    """Feature 2: Open world exploration with multiple biomes visible."""
    W, H = 320, 180
    rng = random.Random(202)
    img = canvas(W, H, DO)

    # Beautiful sunset sky
    sunset_colors = [(DO, 0.0), (DM, 0.15), (MP, 0.3), (ER, 0.5),
                     (FR, 0.65), (DS, 0.8), (PS, 0.95)]
    for y in range(80):
        t = y / 80.0
        c = sunset_colors[0][0]
        for i in range(len(sunset_colors) - 1):
            if sunset_colors[i][1] <= t <= sunset_colors[i + 1][1]:
                seg_t = (t - sunset_colors[i][1]) / (sunset_colors[i + 1][1] - sunset_colors[i][1])
                c = blend_color(sunset_colors[i][0], sunset_colors[i + 1][0], seg_t)
                break
        for x in range(W):
            img[y][x] = c

    # Stars in dark area
    for _ in range(50):
        sx = rng.randint(0, W - 1)
        sy = rng.randint(0, 20)
        put_pixel(img, sx, sy, rng.choice([NW, PY, SB]))

    # Sun/moon near horizon
    sun_cx, sun_cy = 250, 55
    for dy in range(-8, 9):
        for dx in range(-8, 9):
            dist = math.sqrt(dx * dx + dy * dy)
            if dist <= 8:
                if dist <= 3:
                    put_pixel(img, sun_cx + dx, sun_cy + dy, PY)
                elif dist <= 5:
                    put_pixel(img, sun_cx + dx, sun_cy + dy, YL)
                elif dist <= 7:
                    put_pixel(img, sun_cx + dx, sun_cy + dy, GD)
                else:
                    put_pixel(img, sun_cx + dx, sun_cy + dy, DG)

    # Mountains with sunset tint
    draw_mountains(img, W, 72, rng, DM, MP)

    # Mixed biome landscape — rolling terrain
    # Left: ocean/coast
    for y in range(75, 120):
        for x in range(0, 60):
            depth = y - 75
            if depth < 5:
                n = rng.random()
                img[y][x] = SB if n < 0.3 else (PB if n < 0.6 else SY)
            else:
                wave = int(2 * math.sin(x * 0.3 + y * 0.1 + rng.random()))
                if (y + wave) % 4 < 2:
                    img[y][x] = DP
                else:
                    img[y][x] = SY

    # Beach transition
    for y in range(78, 120):
        for x in range(55, 75):
            n = rng.random()
            img[y][x] = PS if n < 0.3 else (DS if n < 0.6 else SN)

    # Central green area
    draw_ground_grass(img, W, 80, 120, rng)

    # Far right: volcanic tint
    for y in range(78, 120):
        for x in range(250, W):
            t = (x - 250) / 70.0
            n = rng.random()
            if n < 0.3:
                img[y][x] = blend_color(FG, DK, t)
            elif n < 0.6:
                img[y][x] = blend_color(DF, K, t)
            else:
                img[y][x] = blend_color(BD, DB, t)
    # Lava glow
    for lx, ly in [(270, 85), (290, 88), (305, 82)]:
        draw_circle_filled(img, lx, ly, 2, FR)
        put_pixel(img, lx, ly, YL)

    # Trees in forest area
    for tx, ty, th, cr in [(90, 68, 14, 6), (110, 70, 12, 5), (130, 66, 16, 7),
                            (150, 72, 10, 4), (170, 69, 13, 5)]:
        draw_tree(img, tx, ty, th, cr, rng)

    # Player walking on a path (center)
    draw_sprite(img, PLAYER_SPRITE, 155, 60)

    # Path (dirt road)
    for x in range(60, W):
        path_y = 85 + int(3 * math.sin(x * 0.02))
        for dy in range(-2, 3):
            py = path_y + dy
            if 0 <= py < len(img):
                put_pixel(img, x, py, DT if abs(dy) < 2 else SN)

    # NPC on path
    draw_sprite(img, NPC_VILLAGER, 195, 72)

    # Minimap in corner
    fill_rect(img, W - 52, 4, 48, 36, (10, 10, 10, 200))
    draw_outline_rect(img, W - 52, 4, 48, 36, GD)
    # Mini terrain
    for my in range(6, 38):
        for mx in range(W - 50, W - 6):
            t = (mx - (W - 50)) / 44.0
            if t < 0.2:
                put_pixel(img, mx, my, DP)  # ocean
            elif t < 0.3:
                put_pixel(img, mx, my, DS)  # beach
            elif t < 0.7:
                put_pixel(img, mx, my, FG)  # forest
            elif t < 0.85:
                put_pixel(img, mx, my, SN)  # desert
            else:
                put_pixel(img, mx, my, DK)  # volcanic
    # Player dot on minimap
    put_pixel(img, W - 28, 22, PB)
    put_pixel(img, W - 27, 22, PB)
    put_pixel(img, W - 28, 23, PB)
    put_pixel(img, W - 27, 23, PB)

    # Dark bottom
    for y in range(120, H):
        for x in range(W):
            n = rng.random()
            img[y][x] = K if n < 0.3 else (DK if n < 0.6 else BK)

    # Quest indicator
    draw_text(img, "!", 198, 67, YL, scale=2)

    # Zone name
    fill_rect(img, 0, H - 18, W, 18, (10, 10, 10, 180))
    zone = "VERDANT CROSSING - ZONE 7"
    zw = text_width(zone, scale=1)
    draw_text(img, zone, (W - zw) // 2, H - 13, PG, scale=1)

    return scale_image(img, 4)


def generate_feature_town():
    """Feature 3: Town scene with buildings, NPCs, and shops."""
    W, H = 320, 180
    rng = random.Random(303)
    img = canvas(W, H, DO)

    # Daytime sky
    draw_sky(img, W, 60, rng)

    # Town backdrop — lighter sky
    for y in range(40, 60):
        for x in range(W):
            t = (y - 40) / 20.0
            img[y][x] = blend_color(SB, BG, t)

    # Green ground
    draw_ground_grass(img, W, 80, 140, rng)

    # Cobblestone path
    for y in range(88, 96):
        for x in range(0, W):
            if (x + y) % 6 < 3:
                img[y][x] = ST
            else:
                img[y][x] = LS

    # Buildings (varied sizes and colors)
    buildings = [
        (10,  52, 30, 25, SN, ER, "INN"),
        (50,  56, 25, 21, PG, DP, "SHOP"),
        (85,  48, 35, 29, DS, FG, "GUILD"),
        (130, 54, 28, 23, NW, MP, "BANK"),
        (170, 50, 32, 27, SN, ER, "FORGE"),
        (210, 56, 25, 21, PG, DP, "TAVERN"),
        (245, 52, 30, 25, DS, FG, "ARENA"),
        (285, 54, 28, 23, NW, DP, "STABLE"),
    ]
    for bx, by, bw, bh, wc, rc, name in buildings:
        draw_building(img, bx, by, bw, bh, wc, rc, rng)
        # Sign above door
        nw = text_width(name, scale=1)
        nx = bx + (bw - nw) // 2
        ny = by + bh - 12
        draw_text(img, name, nx + 1, ny + 1, K, scale=1)
        draw_text(img, name, nx, ny, GD, scale=1)

    # NPCs scattered around town
    npc_positions = [(25, 75), (65, 78), (120, 76), (155, 78),
                     (195, 75), (235, 78), (275, 76)]
    for nx, ny in npc_positions:
        draw_sprite(img, NPC_VILLAGER, nx, ny)

    # Player in center
    draw_sprite(img, PLAYER_SPRITE, 145, 62)

    # Chat bubbles (tiny)
    fill_rect(img, 30, 70, 18, 7, NW)
    draw_outline_rect(img, 30, 70, 18, 7, K)
    draw_text(img, "HI!", 32, 71, K, scale=1)

    fill_rect(img, 125, 70, 22, 7, NW)
    draw_outline_rect(img, 125, 70, 22, 7, K)
    draw_text(img, "TRADE?", 127, 71, K, scale=1)

    # Quest exclamation marks
    for qx in [68, 155, 238]:
        draw_text(img, "!", qx, 50, YL, scale=2)

    # Decorative elements: fountain in center
    fountain_x, fountain_y = 150, 98
    fill_rect(img, fountain_x - 6, fountain_y, 12, 6, ST)
    draw_outline_rect(img, fountain_x - 6, fountain_y, 12, 6, K)
    fill_rect(img, fountain_x - 2, fountain_y - 4, 4, 4, LS)
    # Water particles
    for _ in range(8):
        wx = fountain_x + rng.randint(-4, 4)
        wy = fountain_y - rng.randint(2, 8)
        put_pixel(img, wx, wy, SB)
        put_pixel(img, wx, wy + 1, PB)

    # Lanterns (warm light dots)
    for lx in [35, 80, 115, 160, 200, 240, 280]:
        put_pixel(img, lx, 76, GD)
        put_pixel(img, lx, 77, YL)
        put_pixel(img, lx - 1, 77, DG)
        put_pixel(img, lx + 1, 77, DG)

    # UI: shop interface hint
    fill_rect(img, 0, 0, W, 14, (10, 10, 10, 200))
    draw_text(img, "TOWN OF HEARTHSTONE", 4, 4, GD, scale=1)
    draw_text(img, "SAFE ZONE", W - text_width("SAFE ZONE") - 4, 4, LG, scale=1)

    # Bottom UI panel
    fill_rect(img, 0, 155, W, 25, (10, 10, 10, 200))
    # Gold count
    draw_text(img, "GOLD: 12480", 4, 158, GD, scale=1)
    # Inventory hint
    draw_text(img, "PRESS I FOR INVENTORY", 4, 166, PG, scale=1)
    draw_text(img, "PRESS M FOR MAP", 4, 174, PG, scale=1)

    # Dark bottom
    for y in range(140, 155):
        for x in range(W):
            if img[y][x] == BK or img[y][x] == DO:
                n = rng.random()
                img[y][x] = K if n < 0.3 else DK

    return scale_image(img, 4)


def generate_feature_boss():
    """Feature 4: Boss fight in dungeon — large dragon boss."""
    W, H = 320, 180
    rng = random.Random(404)
    img = canvas(W, H, K)

    # Dark dungeon background
    for y in range(H):
        for x in range(W):
            n = rng.random()
            if n < 0.05:
                img[y][x] = DK
            # else stays K (very dark)

    # Stone dungeon walls (top)
    for y in range(0, 40):
        for x in range(W):
            tile_x = x % 16
            tile_y = y % 16
            if tile_x == 0 or tile_y == 0:
                img[y][x] = K
            else:
                n = rng.random()
                img[y][x] = DK if n < 0.5 else ST

    # Dungeon floor
    draw_ground_stone(img, W, 100, 150, rng)

    # Torches on walls
    for torch_x in [30, 80, 150, 220, 290]:
        # Torch bracket
        fill_rect(img, torch_x - 1, 35, 3, 5, BN)
        # Flame
        put_pixel(img, torch_x, 32, YL)
        put_pixel(img, torch_x, 33, FR)
        put_pixel(img, torch_x - 1, 33, DG)
        put_pixel(img, torch_x + 1, 33, DG)
        put_pixel(img, torch_x, 34, ER)
        # Light glow (subtle ring)
        for dy in range(-6, 7):
            for dx in range(-6, 7):
                dist = math.sqrt(dx * dx + dy * dy)
                if 3 < dist < 6:
                    px, py = torch_x + dx, 33 + dy
                    if 0 <= px < W and 0 <= py < H:
                        existing = img[py][px]
                        if existing == K:
                            img[py][px] = (30, 20, 10, 255)

    # Boss dragon (scaled up 2×, centered)
    boss_x, boss_y = 120, 44
    for dy, row in enumerate(BOSS_DRAGON):
        for dx, c in enumerate(row):
            if c != T:
                for sy in range(3):
                    for sx in range(3):
                        put_pixel(img, boss_x + dx * 3 + sx, boss_y + dy * 3 + sy, c)

    # Boss HP bar (large)
    draw_text(img, "INFERNAL DRAKE", 110, 40, ER, scale=1)
    fill_rect(img, 80, 38, 160, 3, K)
    fill_rect(img, 80, 38, 160, 3, DK)
    fill_rect(img, 80, 38, 104, 3, ER)  # 65% HP

    # Fire breath effect
    draw_fire_breath(img, boss_x + 54, boss_y + 30, 60, 8, rng)

    # Player (dodging to the right)
    draw_sprite(img, PLAYER_SPRITE, 240, 78)
    draw_sprite(img, SWORD_ITEM, 236, 80)

    # Player HP bar
    draw_hp_bar(img, 242, 75, 14, 0.45, LG)

    # Magic shield effect around player
    for angle_deg in range(0, 360, 30):
        angle = math.radians(angle_deg)
        sx = int(248 + math.cos(angle) * 18)
        sy = int(90 + math.sin(angle) * 14)
        put_pixel(img, sx, sy, SB)

    # Fallen party member skeleton
    for dy in range(3):
        for dx in range(8):
            put_pixel(img, 70 + dx, 102 + dy, PG if rng.random() < 0.5 else LS)

    # Loot on ground
    draw_circle_filled(img, 95, 105, 2, GD)
    put_pixel(img, 95, 105, YL)

    # Dungeon pillars
    for pil_x in [20, 60, 260, 300]:
        fill_rect(img, pil_x - 2, 40, 5, 60, ST)
        draw_outline_rect(img, pil_x - 2, 40, 5, 60, K)
        # Pillar caps
        fill_rect(img, pil_x - 3, 38, 7, 3, LS)
        fill_rect(img, pil_x - 3, 98, 7, 3, LS)

    # HUD
    fill_rect(img, 0, 0, W, 16, (10, 10, 10, 200))
    draw_text(img, "BOSS FIGHT", 4, 2, ER, scale=2)
    draw_text(img, "FLOOR 12", W - text_width("FLOOR 12") - 4, 4, PG, scale=1)
    draw_text(img, "DEATHS: 3", W - text_width("DEATHS: 3") - 4, 10, ER, scale=1)

    # Bottom combat log
    fill_rect(img, 0, 155, W, 25, (10, 10, 10, 200))
    draw_text(img, "INFERNAL DRAKE BREATHES FIRE!", 4, 158, FR, scale=1)
    draw_text(img, "YOU DODGE! CLOSE CALL!", 4, 166, YL, scale=1)
    draw_text(img, "COUNTER ATTACK FOR 89 DMG!", 4, 174, PB, scale=1)

    # Purple magic mist at bottom edges
    for _ in range(40):
        mx = rng.randint(0, W - 1)
        my = rng.randint(140, 154)
        put_pixel(img, mx, my, rng.choice([DM, MP, MV]))

    return scale_image(img, 4)


def generate_feature_raid():
    """Feature 5: Guild raid — multiple players fighting a massive enemy."""
    W, H = 320, 180
    rng = random.Random(505)
    img = canvas(W, H, DM)

    # Dark magic void background
    for y in range(H):
        for x in range(W):
            n = rng.random()
            t = y / H
            if n < 0.02:
                img[y][x] = MP  # rare purple spark
            elif n < 0.05:
                img[y][x] = blend_color(DM, K, t)

    # Magic circle on ground (below boss)
    circle_cx, circle_cy = 160, 105
    for dy in range(-30, 31):
        for dx in range(-40, 41):
            dist = math.sqrt((dx / 1.3) ** 2 + dy ** 2)
            if 25 < dist < 28:
                put_pixel(img, circle_cx + dx, circle_cy + dy, MP)
            elif 28 <= dist < 30:
                put_pixel(img, circle_cx + dx, circle_cy + dy, MV)
            elif dist < 25 and rng.random() < 0.03:
                put_pixel(img, circle_cx + dx, circle_cy + dy, SG)

    # Rune symbols inside circle
    rune_angles = [0, 60, 120, 180, 240, 300]
    for angle_deg in rune_angles:
        angle = math.radians(angle_deg)
        rx = int(circle_cx + math.cos(angle) * 20)
        ry = int(circle_cy + math.sin(angle) * 15)
        for ddy in range(-2, 3):
            for ddx in range(-2, 3):
                if abs(ddx) + abs(ddy) <= 2:
                    put_pixel(img, rx + ddx, ry + ddy, SG)

    # Giant boss (scaled dragon 4×)
    boss_x, boss_y = 115, 20
    for dy, row in enumerate(BOSS_DRAGON):
        for dx, c in enumerate(row):
            if c != T:
                for sy in range(4):
                    for sx in range(4):
                        put_pixel(img, boss_x + dx * 4 + sx, boss_y + dy * 4 + sy, c)

    # Boss name and HP
    fill_rect(img, 60, 12, 200, 10, (10, 10, 10, 200))
    draw_text(img, "VOID WYRM - RAID BOSS", 64, 14, ER, scale=1)
    fill_rect(img, 60, 8, 200, 3, DK)
    fill_rect(img, 60, 8, 80, 3, ER)  # 40% HP

    # Multiple player characters (raid team of 6)
    player_positions = [
        (30, 95),   # tank
        (55, 100),  # melee DPS
        (80, 98),   # melee DPS
        (230, 95),  # ranged DPS
        (255, 100), # ranged DPS
        (200, 105), # healer
    ]

    # Different tinted versions of player
    player_colors_body = [PB, SY, DP, MV, LG, PB]
    for i, (ppx, ppy) in enumerate(player_positions):
        # Draw player with color variation
        body_c = player_colors_body[i]
        # Simplified colored player
        for dy, row in enumerate(PLAYER_SPRITE):
            for dx, c in enumerate(row):
                if c == PB:
                    put_pixel(img, ppx + dx, ppy + dy, body_c)
                elif c == SB:
                    put_pixel(img, ppx + dx, ppy + dy, blend_color(body_c, NW, 0.5))
                elif c == DP:
                    put_pixel(img, ppx + dx, ppy + dy, blend_color(body_c, K, 0.5))
                elif c != T:
                    put_pixel(img, ppx + dx, ppy + dy, c)
        # HP bar
        hp = 0.3 + rng.random() * 0.6
        draw_hp_bar(img, ppx + 2, ppy - 4, 12, hp, LG)

    # Healer casting (green particles from healer to allies)
    healer_x, healer_y = 208, 110
    for target_x, target_y in player_positions[:3]:
        for step in range(10):
            t = step / 10.0
            hx = int(healer_x + (target_x + 8 - healer_x) * t)
            hy = int(healer_y + (target_y + 8 - healer_y) * t)
            if rng.random() < 0.5:
                put_pixel(img, hx, hy, BG)
                put_pixel(img, hx + 1, hy, FL)

    # Ranged attacks (arrows/spells from right-side players to boss)
    for ppx, ppy in player_positions[3:5]:
        for step in range(20):
            t = step / 20.0
            ax = int(ppx - t * 80)
            ay = int(ppy - t * 40)
            put_pixel(img, ax, ay, SG)
            if step % 3 == 0:
                put_pixel(img, ax + 1, ay, MV)

    # Melee attacks (sword slashes near boss base)
    for _ in range(15):
        sx = rng.randint(100, 220)
        sy = rng.randint(80, 95)
        put_pixel(img, sx, sy, NW)

    # Fire/magic effects from boss
    draw_fire_breath(img, boss_x + 72, boss_y + 50, 40, 6, rng)

    # Energy beams from boss eyes
    for target_i in range(3):
        ppx, ppy = player_positions[target_i]
        eye_x, eye_y = boss_x + 14, boss_y + 22
        for step in range(15):
            t = step / 15.0
            bx = int(eye_x + (ppx + 8 - eye_x) * t)
            by = int(eye_y + (ppy + 8 - eye_y) * t)
            put_pixel(img, bx, by, rng.choice([ER, FR, YL]))

    # Ground effects
    for _ in range(60):
        gx = rng.randint(0, W - 1)
        gy = rng.randint(120, 155)
        img[gy][gx] = rng.choice([DM, MP, K])

    # HUD: raid frame
    fill_rect(img, 0, 0, W, 8, (10, 10, 10, 200))
    draw_text(img, "GUILD RAID - VOID SANCTUM", 4, 2, GD, scale=1)

    # Raid party frames (left side)
    fill_rect(img, 0, 130, 50, 50, (10, 10, 10, 200))
    names = ["TANK", "DPS1", "DPS2", "RANG", "MAGE", "HEAL"]
    for i, name in enumerate(names):
        ny = 132 + i * 8
        draw_text(img, name, 2, ny, PG, scale=1)
        fill_rect(img, 22, ny, 24, 3, DK)
        hp = 0.3 + rng.random() * 0.6
        fill_rect(img, 22, ny, int(24 * hp), 3, LG if hp > 0.3 else ER)
        fill_rect(img, 22, ny + 4, 24, 2, DK)
        mp = 0.2 + rng.random() * 0.7
        fill_rect(img, 22, ny + 4, int(24 * mp), 2, PB)

    # Bottom combat log
    fill_rect(img, 55, 160, W - 55, 20, (10, 10, 10, 200))
    draw_text(img, "VOID WYRM CASTS SHADOW NOVA!", 58, 162, MV, scale=1)
    draw_text(img, "HEALER CASTS GROUP HEAL! ALL +120 HP", 58, 170, BG, scale=1)

    return scale_image(img, 4)


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print('Generating itch.io promotional art...')
    print()

    print('[1/7] Cover image (630x500)...')
    cover = generate_cover()
    write_png(os.path.join(OUT, 'cover_itchio_630x500.png'), cover)
    print()

    print('[2/7] Banner header (960x200)...')
    banner = generate_banner()
    write_png(os.path.join(OUT, 'banner_header_960x200.png'), banner)
    print()

    print('[3/7] Feature: Combat (1280x720)...')
    combat = generate_feature_combat()
    write_png(os.path.join(OUT, 'feature_combat.png'), combat)
    print()

    print('[4/7] Feature: Exploration (1280x720)...')
    exploration = generate_feature_exploration()
    write_png(os.path.join(OUT, 'feature_exploration.png'), exploration)
    print()

    print('[5/7] Feature: Town (1280x720)...')
    town = generate_feature_town()
    write_png(os.path.join(OUT, 'feature_town.png'), town)
    print()

    print('[6/7] Feature: Boss Fight (1280x720)...')
    boss = generate_feature_boss()
    write_png(os.path.join(OUT, 'feature_boss.png'), boss)
    print()

    print('[7/7] Feature: Guild Raid (1280x720)...')
    raid = generate_feature_raid()
    write_png(os.path.join(OUT, 'feature_raid.png'), raid)
    print()

    print('Done — all promotional art generated in public/promo/')
