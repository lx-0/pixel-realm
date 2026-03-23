#!/usr/bin/env python3
"""
Generate character customization pixel-art assets for PixelRealm.
Uses only Python stdlib (struct + zlib) — no PIL required.

Outputs:
  1. Skin color variant spritesheets (4 tones × all animation states)
  2. Hair style overlay sprites (6 styles × 6 colors = 36 sprites)
  3. Cosmetic equipment sprites (3 armor tiers + 3 weapon types)
  4. Emote animation spritesheets (6 emotes)
  5. Character select UI panel art

All assets follow docs/ART-STYLE-GUIDE.md:
  - 16×24 character sprites, 32-color master palette
  - Horizontal strip spritesheets
  - Naming convention: char_{type}_{variant}.png
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..')

# Output directories
CHAR_DIR = os.path.join(PROJECT_ROOT, 'assets', 'sprites', 'characters')
EQUIP_DIR = os.path.join(PROJECT_ROOT, 'assets', 'sprites', 'characters', 'equipment')
EMOTE_DIR = os.path.join(PROJECT_ROOT, 'assets', 'sprites', 'characters', 'emotes')
UI_DIR = os.path.join(PROJECT_ROOT, 'assets', 'ui', 'character_select')
PUBLIC_DIR = os.path.join(PROJECT_ROOT, 'public', 'assets')

for d in [CHAR_DIR, EQUIP_DIR, EMOTE_DIR, UI_DIR, PUBLIC_DIR]:
    os.makedirs(d, exist_ok=True)

# ─── Palette (RGBA tuples) — from ART-STYLE-GUIDE.md ────────────────────────

_ = (0, 0, 0, 0)  # transparent

# Neutrals
K   = (13,  13,  13,  255)   # shadow black / outline
DK  = (43,  43,  43,  255)   # dark rock
ST  = (74,  74,  74,  255)   # stone gray
MG  = (110, 110, 110, 255)   # mid gray
LS  = (150, 150, 150, 255)   # light stone
PG  = (200, 200, 200, 255)   # pale gray (default skin)
NW  = (240, 240, 240, 255)   # near white (highlight)

# Warm earth
BD  = (59,  32,  16,  255)   # deep soil
BN  = (107, 58,  31,  255)   # rich earth
DT  = (139, 92,  42,  255)   # dirt / boots
SN  = (184, 132, 63,  255)   # sand / sandstone
DS  = (212, 168, 90,  255)   # desert gold
PS  = (232, 208, 138, 255)   # pale sand

# Greens
DF  = (26,  58,  26,  255)   # deep forest
FG  = (45,  110, 45,  255)   # forest green
LG  = (76,  155, 76,  255)   # leaf green
BG  = (120, 200, 120, 255)   # bright grass
FL  = (168, 228, 160, 255)   # light foliage

# Cyan / player
OC  = (10,  26,  58,  255)   # deep ocean
DP  = (26,  74,  138, 255)   # ocean blue / player shadow
SB  = (42,  122, 192, 255)   # sky blue
PB  = (80,  168, 232, 255)   # player blue (main)
HB  = (144, 208, 248, 255)   # ice / pale water / highlight
IW  = (200, 240, 255, 255)   # ice white / shimmer

# Red / enemy
DBl = (90,  10,  10,  255)   # deep blood
ER  = (160, 16,  16,  255)   # enemy red
BR  = (212, 32,  32,  255)   # bright red
FR  = (240, 96,  32,  255)   # fire orange
EM  = (248, 160, 96,  255)   # ember

# Yellow / gold
DG  = (168, 112, 0,   255)   # dark gold
GD  = (232, 184, 0,   255)   # gold
YL  = (255, 224, 64,  255)   # bright yellow / XP
PY  = (255, 248, 160, 255)   # pale highlight

# Purple / magic
PM  = (26,  10,  58,  255)   # deep magic
MP  = (90,  32,  160, 255)   # magic purple
MV  = (144, 80,  224, 255)   # mana violet
SG  = (208, 144, 255, 255)   # spell glow

# ─── Skin tone palettes ─────────────────────────────────────────────────────
# Each skin tone defines: (base, highlight, shadow)
SKIN_TONES = {
    'light': {
        'base':      PG,                         # (200, 200, 200)
        'highlight': NW,                         # (240, 240, 240)
        'shadow':    (180, 175, 170, 255),       # slightly warm shadow
    },
    'tan': {
        'base':      (210, 180, 140, 255),       # warm tan
        'highlight': (235, 210, 175, 255),       # lighter tan
        'shadow':    (175, 140, 100, 255),       # tan shadow
    },
    'medium': {
        'base':      (160, 120, 85, 255),        # medium brown
        'highlight': (190, 150, 115, 255),       # lighter brown
        'shadow':    (120, 85,  55,  255),       # brown shadow
    },
    'dark': {
        'base':      (100, 65,  40,  255),       # dark brown
        'highlight': (135, 95,  65,  255),       # lighter dark
        'shadow':    (70,  42,  25,  255),       # deep shadow
    },
}

# ─── Hair color palettes ─────────────────────────────────────────────────────
# Each hair color: (main, highlight, shadow)
HAIR_COLORS = {
    'brown':  ((107, 58,  31,  255), (139, 92,  42,  255), (59,  32,  16,  255)),
    'black':  ((43,  43,  43,  255), (74,  74,  74,  255), (13,  13,  13,  255)),
    'blonde': ((232, 208, 138, 255), (255, 235, 175, 255), (184, 155, 90,  255)),
    'red':    ((180, 50,  30,  255), (220, 85,  50,  255), (120, 30,  15,  255)),
    'blue':   ((42,  122, 192, 255), (100, 170, 230, 255), (20,  70,  130, 255)),
    'white':  ((220, 220, 225, 255), (245, 245, 250, 255), (180, 180, 190, 255)),
}

# ─── PNG writer ──────────────────────────────────────────────────────────────

def _make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    payload = chunk_type + data
    crc = zlib.crc32(payload) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)


def write_png(path: str, pixels: list) -> None:
    """Write a list-of-rows of (R,G,B,A) tuples as a PNG file."""
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
    print(f'  wrote {path}  ({width}x{height})')


# ─── Sprite helpers ──────────────────────────────────────────────────────────

def copy_sprite(src):
    return [row[:] for row in src]


def mirror_h(src):
    return [row[::-1] for row in src]


def hstack(frames):
    """Horizontally concatenate pixel grids (same height)."""
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result


def blank(w, h, fill=None):
    fill = fill or _
    return [[fill] * w for _r in range(h)]


def overlay(dst, src, x_off, y_off):
    """Paste src onto dst at offset. Non-transparent pixels overwrite."""
    for r, row in enumerate(src):
        dr = r + y_off
        if dr < 0 or dr >= len(dst):
            continue
        for c, px in enumerate(row):
            dc = c + x_off
            if dc < 0 or dc >= len(dst[dr]):
                continue
            if px[3] > 0:
                dst[dr][dc] = px
    return dst


def swap_color(sprite, old_color, new_color):
    """Replace all pixels of old_color with new_color."""
    result = []
    for row in sprite:
        new_row = []
        for px in row:
            if px == old_color:
                new_row.append(new_color)
            else:
                new_row.append(px)
        result.append(new_row)
    return result


def swap_skin(sprite, skin_tone):
    """Replace default skin colors (PG, NW used as skin highlight) with new skin tone."""
    result = copy_sprite(sprite)
    # Replace the skin base color
    result = swap_color(result, PG, skin_tone['base'])
    # Replace highlight on forehead (NW at row 3)
    result = swap_color(result, NW, skin_tone['highlight'])
    return result


def check(name, pixels, w, h):
    assert len(pixels) == h, f'{name}: expected {h} rows, got {len(pixels)}'
    for i, row in enumerate(pixels):
        assert len(row) == w, f'{name} row {i}: expected {w} cols, got {len(row)}'


# ─── BASE PLAYER SPRITE FRAMES (16×24) ──────────────────────────────────────
# These define the base warrior character with default pale skin (PG).
# Skin-toned variants are produced via palette swap.

# Idle frame 0 (base pose)
IDLE_0 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _],
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],
]

# Idle frame 1 (breathing — shoulders slightly wider)
IDLE_1 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _],
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],
]

# Walk frame 0 — right foot forward
WALK_0 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],
    [ _, _,  K,  PB, PB, K,  _,  _,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, PB, K,  _,  _,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  K,  DP, DP, K,  _,  _,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  K,  DT, DT, K,  _,  _,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  K,  K,  K,  _,  _,  _,  _,  K,  DP, DP, DP, K,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  K,  DT, DT, DT, K,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  DT, DT, DT, DT, K,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  DT, DT, DT, DT, K,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _],
]

# Walk frame 1 — contact (feet together)
WALK_1 = copy_sprite(IDLE_0)

# Walk frame 2 — left foot forward (mirror of walk 0)
WALK_2 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, K,  _,  _,  _,  K,  PB, PB, K,  _,  _],
    [ _, _,  K,  PB, PB, PB, K,  _,  _,  _,  K,  PB, PB, K,  _,  _],
    [ _, _,  K,  PB, PB, PB, K,  _,  _,  _,  K,  DP, DP, K,  _,  _],
    [ _, _,  K,  PB, PB, PB, K,  _,  _,  _,  K,  DT, DT, K,  _,  _],
    [ _, _,  K,  DP, DP, DP, K,  _,  _,  _,  _,  K,  K,  _,  _,  _],
    [ _, _,  K,  DT, DT, DT, K,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# Walk frame 3 — passing (feet together, slightly different from contact)
WALK_3 = copy_sprite(IDLE_1)

# Attack frames — 4 frame sword swing
ATK_0 = [  # Wind-up: arm raised right
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  K,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  K,  LS, K,  _],
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  K,  LS, K,  _],
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  K,  _,  _],
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _],
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],
]

ATK_1 = [  # Swing mid — sword horizontal right
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  K,  K,  K],
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, K,  LS, LS, K],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  K,  K,  K],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _],
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],
]

ATK_2 = [  # Swing follow-through — sword low right
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, K,  LS, K,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _],
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],
]

ATK_3 = copy_sprite(IDLE_0)  # Recovery frame — return to idle

# Dodge frames (2) — quick sidestep right
DODGE_0 = [  # Lean right
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _],
    [ _, _,  _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],
    [ _, _,  _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],
    [ _, _,  _,  _,  K,  PB, PB, K,  _,  _,  K,  PB, PB, K,  _,  _],
    [ _, _,  _,  _,  K,  PB, PB, K,  _,  _,  K,  PB, PB, K,  _,  _],
    [ _, _,  _,  _,  K,  PB, PB, K,  _,  _,  K,  PB, PB, K,  _,  _],
    [ _, _,  _,  _,  K,  PB, PB, K,  _,  _,  K,  PB, PB, K,  _,  _],
    [ _, _,  _,  _,  K,  DP, DP, K,  _,  _,  K,  DP, DP, K,  _,  _],
    [ _, _,  _,  _,  K,  DT, DT, K,  _,  _,  K,  DT, DT, K,  _,  _],
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  _,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],
]

DODGE_1 = copy_sprite(IDLE_0)  # Return to center

# Death frames (4) — character collapses
DEATH_0 = copy_sprite(IDLE_0)  # Hit reaction — same as idle

DEATH_1 = [  # Stagger — leaning
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],
    [ _, _,  _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _],
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

DEATH_2 = [  # Falling — character tilting
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  _,  _],
    [ _, K,  PG, PG, K,  PB, PB, PB, PB, PB, PB, PB, DT, DT, K,  _],
    [ _, K,  PG, K,  PG, K,  PB, PB, PB, PB, PB, PB, DT, DT, K,  _],
    [ _, K,  PG, PG, PG, K,  PB, DP, DP, DP, PB, K,  DT, DT, K,  _],
    [ _, _,  K,  K,  K,  K,  GD, GD, GD, GD, K,  K,  K,  K,  _,  _],
    [ _, _,  _,  _,  _,  _,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

DEATH_3 = copy_sprite(DEATH_2)  # Hold final frame

# All animation frames for the base character
BASE_FRAMES = [IDLE_0, IDLE_1, WALK_0, WALK_1, WALK_2, WALK_3,
               ATK_0, ATK_1, ATK_2, ATK_3, DODGE_0, DODGE_1,
               DEATH_0, DEATH_1, DEATH_2, DEATH_3]
# Layout: idle(2) + walk(4) + attack(4) + dodge(2) + death(4) = 16 frames

# Validate all base frames
for i, frame in enumerate(BASE_FRAMES):
    check(f'BASE_FRAME_{i}', frame, 16, 24)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. SKIN COLOR VARIANTS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_skin_variants():
    """Generate 4 skin tone variant spritesheets, each 256×24 (16 frames × 16px)."""
    print('\n=== Generating skin color variants ===')
    for tone_name, tone_colors in SKIN_TONES.items():
        frames = []
        for frame in BASE_FRAMES:
            toned = swap_skin(frame, tone_colors)
            frames.append(toned)
        sheet = hstack(frames)
        fname = f'char_player_skin_{tone_name}.png'
        write_png(os.path.join(CHAR_DIR, fname), sheet)
        write_png(os.path.join(PUBLIC_DIR, fname), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# 2. HAIR STYLE OVERLAYS
# ═══════════════════════════════════════════════════════════════════════════════

# Hair styles are 16×24 overlays (only the top 8 rows contain pixels).
# H1=main, H2=highlight, H3=shadow placeholders — swapped per color.
H1 = (255, 0, 0, 255)    # placeholder: hair main
H2 = (0, 255, 0, 255)    # placeholder: hair highlight
H3 = (0, 0, 255, 255)    # placeholder: hair shadow

# Short cropped hair
HAIR_SHORT = [
    [ _, _,  _,  _,  H3, H1, H1, H1, H1, H1, H3, _,  _,  _,  _,  _],
    [ _, _,  _,  H3, H1, H1, H2, H1, H1, H1, H1, H3, _,  _,  _,  _],
    [ _, _,  _,  _,  H3, _,  _,  _,  _,  _,  H3, _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
] + [[(0,0,0,0)] * 16 for _ in range(16)]  # rows 8-23 empty

# Long flowing hair
HAIR_LONG = [
    [ _, _,  _,  H3, H1, H1, H1, H1, H1, H1, H1, H3, _,  _,  _,  _],
    [ _, _,  H3, H1, H1, H2, H1, H1, H1, H2, H1, H1, H3, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  _,  H3, H1, _,  _,  _,  _,  _,  H1, H3, _,  _,  _,  _],
    [ _, _,  _,  _,  H3, H1, _,  _,  _,  H1, H3, _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  H3, H1, _,  H1, H3, _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  H3, _,  H3, _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  H3, _,  H3, _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
] + [[(0,0,0,0)] * 16 for _ in range(11)]

# Spiky hair
HAIR_SPIKY = [
    [ _, _,  _,  H1, _,  H1, _,  H1, _,  H1, _,  H1, _,  _,  _,  _],
    [ _, _,  H3, H1, H1, H1, H1, H2, H1, H1, H1, H1, H3, _,  _,  _],
    [ _, _,  _,  H3, H1, H1, H1, H1, H1, H1, H1, H3, _,  _,  _,  _],
    [ _, _,  _,  _,  H3, _,  _,  _,  _,  _,  H3, _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
] + [[(0,0,0,0)] * 16 for _ in range(16)]

# Ponytail
HAIR_PONY = [
    [ _, _,  _,  _,  H3, H1, H1, H1, H1, H1, H3, _,  _,  _,  _,  _],
    [ _, _,  _,  H3, H1, H1, H2, H1, H1, H1, H1, H3, _,  _,  _,  _],
    [ _, _,  _,  _,  H3, _,  _,  _,  _,  _,  H3, H1, H3, _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  H3, H1, H3, _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  H3, H1, _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  H3, H1, _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  H3, _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
] + [[(0,0,0,0)] * 16 for _ in range(16)]

# Mohawk
HAIR_MOHAWK = [
    [ _, _,  _,  _,  _,  _,  _,  H1, _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  H1, H2, H1, _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  H3, H1, H1, H1, H3, _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  H3, H1, H1, H1, H3, _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  H3, H3, H3, _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
] + [[(0,0,0,0)] * 16 for _ in range(16)]

# Braids (two braids hanging down sides)
HAIR_BRAID = [
    [ _, _,  _,  H3, H1, H1, H1, H1, H1, H1, H1, H3, _,  _,  _,  _],
    [ _, _,  H3, H1, H1, H2, H1, H1, H1, H2, H1, H1, H3, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  H1, H3, _,  _,  _,  _,  _,  _,  _,  H3, H1, _,  _,  _],
    [ _, _,  H3, H1, _,  _,  _,  _,  _,  _,  _,  H1, H3, _,  _,  _],
    [ _, _,  H1, H3, _,  _,  _,  _,  _,  _,  _,  H3, H1, _,  _,  _],
    [ _, _,  _,  H3, _,  _,  _,  _,  _,  _,  _,  H3, _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
] + [[(0,0,0,0)] * 16 for _ in range(11)]

HAIR_STYLES = {
    'short':   HAIR_SHORT,
    'long':    HAIR_LONG,
    'spiky':   HAIR_SPIKY,
    'ponytail': HAIR_PONY,
    'mohawk':  HAIR_MOHAWK,
    'braid':   HAIR_BRAID,
}


def generate_hair_sprites():
    """Generate 6 hair styles × 6 colors = 36 hair overlay PNGs."""
    print('\n=== Generating hair style overlays ===')
    for style_name, style_pixels in HAIR_STYLES.items():
        for color_name, (main, highlight, shadow) in HAIR_COLORS.items():
            colored = copy_sprite(style_pixels)
            colored = swap_color(colored, H1, main)
            colored = swap_color(colored, H2, highlight)
            colored = swap_color(colored, H3, shadow)
            fname = f'hair_{style_name}_{color_name}.png'
            write_png(os.path.join(CHAR_DIR, fname), colored)
            write_png(os.path.join(PUBLIC_DIR, fname), colored)


# ═══════════════════════════════════════════════════════════════════════════════
# 3. COSMETIC EQUIPMENT SPRITES
# ═══════════════════════════════════════════════════════════════════════════════

# Equipment overlays are 16×24 sprites that layer on the character body.
# Each has 2 frames (idle + attack) as a 32×24 horizontal strip.

# Armor color palettes: (main, highlight, shadow, detail)
ARMOR_PALETTES = {
    'leather': (DT, SN, BD, BN),       # warm browns
    'chain':   (MG, LS, ST, PG),       # silver/gray
    'plate':   (DP, SB, OC, HB),       # steel blue
}

# Leather armor overlay (body rows 7-14)
def make_armor_overlay(main, highlight, shadow, detail):
    """Create armor body overlay for idle frame."""
    base = blank(16, 24)
    # Shoulder pauldrons (row 7)
    for c in [3, 11]:
        base[7][c] = shadow
    for c in [4, 5, 6, 7, 8, 9, 10]:
        base[7][c] = main
    # Chest plate (rows 8-12)
    for r in range(8, 13):
        base[r][2] = shadow
        for c in range(3, 13):
            base[r][c] = main
        base[r][13] = shadow
    # Chest detail (highlight stripe)
    base[9][3] = highlight
    base[10][4] = highlight
    base[10][5] = detail
    # Belt (row 14)
    for c in range(3, 12):
        base[14][c] = detail
    return base


def make_armor_attack_overlay(main, highlight, shadow, detail):
    """Armor overlay shifted for attack pose."""
    # Same as idle but body stays put during attack
    return make_armor_overlay(main, highlight, shadow, detail)


# Weapon overlays (extend beyond character frame for visual impact)
# Sword: vertical in idle, horizontal in attack
WEAPON_SWORD_IDLE = blank(16, 24)
# Sword handle at right hand (col 13-14, rows 9-10)
WEAPON_SWORD_IDLE[8][14] = LS
WEAPON_SWORD_IDLE[9][14] = DT   # handle
WEAPON_SWORD_IDLE[10][14] = DG  # guard
WEAPON_SWORD_IDLE[11][14] = LS  # blade
WEAPON_SWORD_IDLE[12][14] = LS
WEAPON_SWORD_IDLE[13][14] = LS
WEAPON_SWORD_IDLE[14][14] = NW  # tip

WEAPON_SWORD_ATK = blank(16, 24)
# Sword extended right during swing
for c in range(10, 16):
    WEAPON_SWORD_ATK[9][c] = LS
WEAPON_SWORD_ATK[9][10] = DT   # handle
WEAPON_SWORD_ATK[9][11] = DG   # guard
WEAPON_SWORD_ATK[9][15] = NW   # tip

# Staff: vertical in idle, angled in attack
WEAPON_STAFF_IDLE = blank(16, 24)
for r in range(3, 15):
    WEAPON_STAFF_IDLE[r][14] = BN
WEAPON_STAFF_IDLE[3][14] = MV   # crystal top
WEAPON_STAFF_IDLE[4][14] = SG   # crystal glow
WEAPON_STAFF_IDLE[14][14] = BD  # base

WEAPON_STAFF_ATK = blank(16, 24)
for r in range(3, 12):
    WEAPON_STAFF_ATK[r][14] = BN
WEAPON_STAFF_ATK[3][14] = SG   # crystal glowing brighter
WEAPON_STAFF_ATK[3][13] = MV   # glow aura
WEAPON_STAFF_ATK[3][15] = MV
WEAPON_STAFF_ATK[2][14] = MV

# Bow: held in idle, drawn in attack
WEAPON_BOW_IDLE = blank(16, 24)
# Bow curve on left side
WEAPON_BOW_IDLE[7][1]  = BN
WEAPON_BOW_IDLE[8][0]  = BN
WEAPON_BOW_IDLE[9][0]  = BN
WEAPON_BOW_IDLE[10][0] = BN
WEAPON_BOW_IDLE[11][0] = BN
WEAPON_BOW_IDLE[12][1] = BN
# String
WEAPON_BOW_IDLE[7][2]  = LS
WEAPON_BOW_IDLE[8][2]  = LS
WEAPON_BOW_IDLE[9][2]  = LS
WEAPON_BOW_IDLE[10][2] = LS
WEAPON_BOW_IDLE[11][2] = LS
WEAPON_BOW_IDLE[12][2] = LS

WEAPON_BOW_ATK = blank(16, 24)
# Bow drawn back
WEAPON_BOW_ATK[7][1]  = BN
WEAPON_BOW_ATK[8][0]  = BN
WEAPON_BOW_ATK[9][0]  = BN
WEAPON_BOW_ATK[10][0] = BN
WEAPON_BOW_ATK[11][0] = BN
WEAPON_BOW_ATK[12][1] = BN
# String pulled back
WEAPON_BOW_ATK[7][2]  = LS
WEAPON_BOW_ATK[8][3]  = LS
WEAPON_BOW_ATK[9][4]  = LS
WEAPON_BOW_ATK[10][3] = LS
WEAPON_BOW_ATK[11][2] = LS
WEAPON_BOW_ATK[12][2] = LS
# Arrow
for c in range(4, 15):
    WEAPON_BOW_ATK[9][c] = DT
WEAPON_BOW_ATK[9][14] = NW  # arrowhead

WEAPONS = {
    'sword': (WEAPON_SWORD_IDLE, WEAPON_SWORD_ATK),
    'staff': (WEAPON_STAFF_IDLE, WEAPON_STAFF_ATK),
    'bow':   (WEAPON_BOW_IDLE,   WEAPON_BOW_ATK),
}


def generate_equipment_sprites():
    """Generate armor tier overlays and weapon sprites."""
    print('\n=== Generating equipment sprites ===')

    # Armor overlays: idle + attack = 32×24 strips
    for armor_name, (main, highlight, shadow, detail) in ARMOR_PALETTES.items():
        idle_frame = make_armor_overlay(main, highlight, shadow, detail)
        atk_frame = make_armor_attack_overlay(main, highlight, shadow, detail)
        sheet = hstack([idle_frame, atk_frame])
        fname = f'equip_armor_{armor_name}.png'
        write_png(os.path.join(EQUIP_DIR, fname), sheet)
        write_png(os.path.join(PUBLIC_DIR, fname), sheet)

    # Weapon overlays: idle + attack = 32×24 strips
    for weapon_name, (idle_frame, atk_frame) in WEAPONS.items():
        sheet = hstack([idle_frame, atk_frame])
        fname = f'equip_weapon_{weapon_name}.png'
        write_png(os.path.join(EQUIP_DIR, fname), sheet)
        write_png(os.path.join(PUBLIC_DIR, fname), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. EMOTE ANIMATIONS
# ═══════════════════════════════════════════════════════════════════════════════

# Emotes are 16×24 character poses in horizontal strips.
# Each emote only modifies the upper body/arms; legs stay in idle pose.

def make_emote_base():
    """Return a mutable copy of the idle pose as emote base."""
    return copy_sprite(IDLE_0)


# Wave emote (4 frames) — right arm goes up and waves
WAVE_0 = make_emote_base()
WAVE_1 = make_emote_base()
# Arm raised (modify row 7-8 right side)
WAVE_1[7][12] = PB
WAVE_1[7][13] = PB
WAVE_1[6][13] = PB  # hand above head
WAVE_1[5][13] = PG  # hand (skin)
WAVE_1[5][14] = PG

WAVE_2 = make_emote_base()
WAVE_2[7][12] = PB
WAVE_2[7][13] = PB
WAVE_2[6][13] = PB
WAVE_2[5][14] = PG  # hand shifted right
WAVE_2[4][14] = PG

WAVE_3 = copy_sprite(WAVE_1)  # wave back

EMOTE_WAVE = [WAVE_0, WAVE_1, WAVE_2, WAVE_3]

# Dance emote (8 frames) — alternating arm/leg poses
DANCE_0 = make_emote_base()
DANCE_1 = make_emote_base()
# Left arm up
DANCE_1[7][2] = PB
DANCE_1[6][1] = PB
DANCE_1[5][1] = PG  # hand
DANCE_2 = make_emote_base()
# Right arm up
DANCE_2[7][12] = PB
DANCE_2[6][13] = PB
DANCE_2[5][13] = PG
DANCE_3 = make_emote_base()
# Both arms up
DANCE_3[7][2] = PB
DANCE_3[6][1] = PB
DANCE_3[5][1] = PG
DANCE_3[7][12] = PB
DANCE_3[6][13] = PB
DANCE_3[5][13] = PG
DANCE_4 = copy_sprite(DANCE_2)
DANCE_5 = copy_sprite(DANCE_1)
DANCE_6 = copy_sprite(DANCE_3)
DANCE_7 = copy_sprite(DANCE_0)

EMOTE_DANCE = [DANCE_0, DANCE_1, DANCE_2, DANCE_3,
               DANCE_4, DANCE_5, DANCE_6, DANCE_7]

# Sit emote (2 frames) — character lowers and sits
SIT_0 = make_emote_base()  # Starting to sit
SIT_1 = [  # Seated pose — shorter, legs folded
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, _,  K,  PB, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _,  _],
    [ _, _,  _,  K,  DG, GD, GD, GD, GD, GD, GD, K,  _,  _,  _,  _],
    [ _, K,  PB, PB, PB, PB, K,  _,  _,  K,  PB, PB, PB, PB, K,  _],
    [ _, K,  DP, DP, DP, DP, K,  _,  _,  K,  DP, DP, DP, DP, K,  _],
    [ _, K,  DT, DT, DT, DT, K,  _,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, K,  K,  K,  K,  K,  _,  _,  _,  _,  K,  K,  K,  K,  K,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

EMOTE_SIT = [SIT_0, SIT_1]

# Cheer emote (4 frames) — arms pump up
CHEER_0 = make_emote_base()
CHEER_1 = make_emote_base()
# Both arms up, body stretched
CHEER_1[6][1] = PB
CHEER_1[5][1] = PG
CHEER_1[6][13] = PB
CHEER_1[5][13] = PG
# Add exclamation above head
CHEER_1[0][7] = YL

CHEER_2 = make_emote_base()  # Arms down
CHEER_3 = copy_sprite(CHEER_1)  # Arms up again

EMOTE_CHEER = [CHEER_0, CHEER_1, CHEER_2, CHEER_3]

# Bow emote (4 frames) — character bends forward
BOW_0 = make_emote_base()  # Standing
BOW_1 = [  # Mid-bow — body tilted forward
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _],
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],
]
BOW_2 = copy_sprite(BOW_1)   # Hold bow
BOW_3 = copy_sprite(BOW_0)   # Return to standing

EMOTE_BOW = [BOW_0, BOW_1, BOW_2, BOW_3]

# Angry emote (4 frames) — stomp + red face flash
ANGRY_0 = make_emote_base()
ANGRY_1 = make_emote_base()
# Red tint on face + fists clenched (arms out)
ANGRY_1[4][6] = ER   # angry eye
ANGRY_1[4][8] = ER   # angry eye
ANGRY_1[0][6] = FR   # anger symbol above head
ANGRY_1[0][7] = FR
ANGRY_1[0][8] = FR

ANGRY_2 = make_emote_base()
# Stomp — one foot down harder
ANGRY_2[4][6] = ER
ANGRY_2[4][8] = ER

ANGRY_3 = copy_sprite(ANGRY_1)

EMOTE_ANGRY = [ANGRY_0, ANGRY_1, ANGRY_2, ANGRY_3]

EMOTES = {
    'wave':  EMOTE_WAVE,    # 4 frames
    'dance': EMOTE_DANCE,   # 8 frames
    'sit':   EMOTE_SIT,     # 2 frames
    'cheer': EMOTE_CHEER,   # 4 frames
    'bow':   EMOTE_BOW,     # 4 frames
    'angry': EMOTE_ANGRY,   # 4 frames
}


def generate_emote_sprites():
    """Generate emote animation spritesheets."""
    print('\n=== Generating emote animations ===')
    for emote_name, frames in EMOTES.items():
        for f in frames:
            check(f'emote_{emote_name}', f, 16, 24)
        sheet = hstack(frames)
        fname = f'emote_{emote_name}.png'
        write_png(os.path.join(EMOTE_DIR, fname), sheet)
        write_png(os.path.join(PUBLIC_DIR, fname), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# 5. CHARACTER SELECT UI ART
# ═══════════════════════════════════════════════════════════════════════════════

def generate_char_select_ui():
    """Generate character select panel background (160×120 px)."""
    print('\n=== Generating character select UI ===')

    W, H = 160, 120

    # Panel background
    panel = blank(W, H, DK)

    # Border (2px)
    for x in range(W):
        panel[0][x] = K
        panel[1][x] = ST
        panel[H-2][x] = ST
        panel[H-1][x] = K
    for y in range(H):
        panel[y][0] = K
        panel[y][1] = ST
        panel[y][W-2] = ST
        panel[y][W-1] = K

    # Title bar area (rows 2-12)
    for y in range(2, 12):
        for x in range(2, W-2):
            panel[y][x] = DP

    # Title text "CHARACTER" pixel art (simplified block letters at row 4)
    title_pixels = [
        # C
        (4, 4), (5, 4), (6, 4), (4, 5), (4, 6), (4, 7), (5, 7), (6, 7),
        # H
        (8, 4), (8, 5), (8, 6), (8, 7), (9, 6), (10, 4), (10, 5), (10, 6), (10, 7),
        # A
        (12, 5), (12, 6), (12, 7), (13, 4), (13, 6), (14, 5), (14, 6), (14, 7),
        # R
        (16, 4), (16, 5), (16, 6), (16, 7), (17, 4), (17, 6), (18, 5), (18, 7),
    ]
    for x, y in title_pixels:
        if 0 <= x < W and 0 <= y < H:
            panel[y][x] = NW

    # Character preview area (left side, 60×80, rows 14-94, cols 4-64)
    for y in range(14, 94):
        for x in range(4, 64):
            panel[y][x] = (30, 30, 40, 255)  # dark preview bg

    # Preview border
    for x in range(3, 65):
        panel[13][x] = PB
        panel[94][x] = PB
    for y in range(13, 95):
        panel[y][3] = PB
        panel[y][64] = PB

    # Place a character preview silhouette in center of preview area
    preview_char = copy_sprite(IDLE_0)
    overlay(panel, preview_char, 24, 35)

    # Customization option grid (right side)
    # Skin tone swatches (rows 16-24, cols 70-150)
    swatch_label_y = 16
    swatch_y = 20
    skin_colors = [
        SKIN_TONES['light']['base'],
        SKIN_TONES['tan']['base'],
        SKIN_TONES['medium']['base'],
        SKIN_TONES['dark']['base'],
    ]
    for i, color in enumerate(skin_colors):
        sx = 72 + i * 20
        # Swatch box (12×12)
        for y in range(swatch_y, swatch_y + 12):
            for x in range(sx, sx + 12):
                panel[y][x] = color
        # Border
        for x in range(sx - 1, sx + 13):
            panel[swatch_y - 1][x] = MG
            panel[swatch_y + 12][x] = MG
        for y in range(swatch_y - 1, swatch_y + 13):
            panel[y][sx - 1] = MG
            panel[y][sx + 12] = MG

    # Hair style icons (rows 38-58)
    hair_y = 40
    hair_sample_colors = list(HAIR_COLORS.values())[:6]
    for i, (main, hl, sh) in enumerate(hair_sample_colors):
        hx = 72 + (i % 3) * 28
        hy = hair_y + (i // 3) * 20
        # Small hair preview box (10×10)
        for y in range(hy, hy + 10):
            for x in range(hx, hx + 10):
                panel[y][x] = main
        # Highlight stripe
        for y in range(hy + 1, hy + 3):
            panel[y][hx + 2] = hl
        # Border
        for x in range(hx - 1, hx + 11):
            panel[hy - 1][x] = MG
            panel[hy + 10][x] = MG
        for y in range(hy - 1, hy + 11):
            panel[y][hx - 1] = MG
            panel[y][hx + 10] = MG

    # Equipment section label area (rows 82-92)
    equip_y = 84
    equip_icons = [DT, MG, DP]  # leather, chain, plate colors
    for i, color in enumerate(equip_icons):
        ex = 72 + i * 28
        for y in range(equip_y, equip_y + 10):
            for x in range(ex, ex + 10):
                panel[y][x] = color
        # Armor shape in icon
        panel[equip_y + 2][ex + 3] = NW
        panel[equip_y + 2][ex + 6] = NW
        panel[equip_y + 4][ex + 5] = NW
        # Border
        for x in range(ex - 1, ex + 11):
            panel[equip_y - 1][x] = MG
            panel[equip_y + 10][x] = MG
        for y in range(equip_y - 1, equip_y + 11):
            panel[y][ex - 1] = MG
            panel[y][ex + 10] = MG

    # Bottom bar — "CONFIRM" button area
    for y in range(H - 18, H - 6):
        for x in range(W // 2 - 30, W // 2 + 30):
            panel[y][x] = LG
    # Button border
    for x in range(W // 2 - 31, W // 2 + 31):
        panel[H - 19][x] = FG
        panel[H - 5][x] = FG
    for y in range(H - 19, H - 5):
        panel[y][W // 2 - 31] = FG
        panel[y][W // 2 + 30] = FG

    fname = 'ui_char_select_panel.png'
    write_png(os.path.join(UI_DIR, fname), panel)
    write_png(os.path.join(PUBLIC_DIR, fname), panel)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print('PixelRealm Character Customization Asset Generator')
    print('=' * 55)

    generate_skin_variants()
    generate_hair_sprites()
    generate_equipment_sprites()
    generate_emote_sprites()
    generate_char_select_ui()

    print('\n' + '=' * 55)
    print('Summary:')
    print(f'  Skin variants:  4 spritesheets (16 frames each, 256x24)')
    print(f'  Hair overlays:  36 sprites (6 styles x 6 colors, 16x24)')
    print(f'  Equipment:      6 overlays (3 armor + 3 weapons, 32x24)')
    print(f'  Emotes:         6 spritesheets (2-8 frames each)')
    print(f'  UI:             1 character select panel (160x120)')
    print(f'  Total:          53 PNG files')
    print('\nDone.')
