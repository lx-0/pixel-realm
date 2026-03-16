#!/usr/bin/env python3
"""
Generate production-quality pixel-art spritesheets for PixelRealm vertical slice.
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md exactly:
  - char_player_warrior.png  : 224×24 horizontal strip  (14 frames × 16px)
                               0-1:idle  2-5:walk  6-9:attack  10-13:death
  - char_enemy_goblin.png    : 192×24 horizontal strip  (12 frames × 16px)
                               0-1:idle  2-5:walk  6-9:attack  10-11:death
  - tileset_forest.png       : 256×64  (16 cols × 4 rows of 16×16 tiles)
  - ui_hud_frame.png         : 120×12  HUD panel background
  - ui_bar_fill.png          : 50×6    HP bar fill (green)
  - ui_bar_mp_fill.png       : 50×6    MP bar fill (purple)
  - ui_icon_quest.png        : 16×16   Quest exclamation icon
  - icon_pickup_xp.png       : 16×16   XP orb (improved)
  - tile_grass_plains.png    : 16×16   Overworld ground tile (improved)
  - tile_hazard_fire.png     : 16×16   Fire hazard tile
  - bg_sky.png               : 320×60  Sky background layer
  - bg_hills_far.png         : 320×60  Distant hills parallax layer
  - bg_hills_near.png        : 320×80  Near hills/trees parallax layer
"""

import struct
import zlib
import os

OUT_DIR  = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
ART_DIR  = os.path.join(os.path.dirname(__file__), '..')   # repo root
os.makedirs(OUT_DIR, exist_ok=True)

def _make_asset_dir(rel):
    d = os.path.join(ART_DIR, rel)
    os.makedirs(d, exist_ok=True)
    return d

# ─── Palette (RGBA tuples) ────────────────────────────────────────────────────

_ = (0, 0, 0, 0)          # transparent

# Neutrals
K   = (13,  13,  13,  255)  # shadow black / outline
DK  = (43,  43,  43,  255)  # dark rock
ST  = (74,  74,  74,  255)  # stone gray
MG  = (110, 110, 110, 255)  # mid gray
LS  = (150, 150, 150, 255)  # light stone
PG  = (200, 200, 200, 255)  # pale gray (skin)
NW  = (240, 240, 240, 255)  # near white (highlight)

# Warm earth
BD  = (59,  32,  16,  255)  # deep soil
BN  = (107, 58,  31,  255)  # rich earth
DT  = (139, 92,  42,  255)  # dirt / boots
SN  = (184, 132, 63,  255)  # sand / sandstone
DS  = (212, 168, 90,  255)  # desert gold
PS  = (232, 208, 138, 255)  # pale sand

# Greens
DF  = (26,  58,  26,  255)  # deep forest
FG  = (45,  110, 45,  255)  # forest green
LG  = (76,  155, 76,  255)  # leaf green
BG  = (120, 200, 120, 255)  # bright grass
FL  = (168, 228, 160, 255)  # light foliage

# Cyan / player
OC  = (10,  26,  58,  255)  # deep ocean
DP  = (26,  74,  138, 255)  # ocean blue / player shadow
SB  = (42,  122, 192, 255)  # sky blue
PB  = (80,  168, 232, 255)  # player blue (main)
HB  = (144, 208, 248, 255)  # ice / pale water / highlight
IW  = (200, 240, 255, 255)  # ice white / shimmer

# Red / enemy
DB  = (90,  10,  10,  255)  # deep blood
ER  = (160, 16,  16,  255)  # enemy red
BR  = (212, 32,  32,  255)  # bright red
FR  = (240, 96,  32,  255)  # fire orange
EM  = (248, 160, 96,  255)  # ember

# Yellow / gold
DG  = (168, 112, 0,   255)  # dark gold
GD  = (232, 184, 0,   255)  # gold
YL  = (255, 224, 64,  255)  # bright yellow / XP
PY  = (255, 248, 160, 255)  # pale highlight

# Purple / magic
PM  = (26,  10,  58,  255)  # deep magic
MP  = (90,  32,  160, 255)  # magic purple
MV  = (144, 80,  224, 255)  # mana violet
SG  = (208, 144, 255, 255)  # spell glow

# Sky colours (not strictly palette but for BG gradient)
SKY1 = (74,  130, 210, 255)  # horizon sky
SKY2 = (100, 160, 230, 255)  # mid sky
SKY3 = (130, 190, 250, 255)  # top sky
CLD  = (230, 240, 255, 255)  # cloud white
CLDs = (180, 200, 230, 255)  # cloud shadow

# ─── PNG writer ───────────────────────────────────────────────────────────────

def _make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    payload = chunk_type + data
    crc = zlib.crc32(payload) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)


def write_png(path: str, pixels: list) -> None:
    """Write a list-of-rows of (R,G,B,A) tuples as a PNG file."""
    height = len(pixels)
    width  = len(pixels[0])
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


# ─── Sprite helpers ───────────────────────────────────────────────────────────

def copy_sprite(src):
    return [row[:] for row in src]

def mirror_h(src):
    return [row[::-1] for row in src]

def hstack(frames):
    """Horizontally concatenate list of pixel grids (same height)."""
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result

def vstack(rows_of_frames):
    """Vertically stack a list of pixel grids."""
    result = []
    for grid in rows_of_frames:
        result.extend(grid)
    return result

def blank(w, h, fill=None):
    fill = fill or _
    return [[fill]*w for _ in range(h)]

def overlay(dst, src, x_off, y_off):
    """Paste src onto dst at (x_off, y_off). Non-transparent pixels overwrite."""
    for r, row in enumerate(src):
        dr = r + y_off
        if dr < 0 or dr >= len(dst): continue
        for c, px in enumerate(row):
            dc = c + x_off
            if dc < 0 or dc >= len(dst[dr]): continue
            if px[3] > 0:
                dst[dr][dc] = px
    return dst

def tint_sprite(src, tint_color, alpha=0.3):
    """Apply a color tint to all non-transparent pixels."""
    tr, tg, tb = tint_color[:3]
    result = []
    for row in src:
        new_row = []
        for r, g, b, a in row:
            if a == 0:
                new_row.append((r, g, b, a))
            else:
                nr = int(r * (1-alpha) + tr * alpha)
                ng = int(g * (1-alpha) + tg * alpha)
                nb = int(b * (1-alpha) + tb * alpha)
                new_row.append((nr, ng, nb, a))
        result.append(new_row)
    return result

# ─── PLAYER SPRITE DEFINITIONS (16×24) ──────────────────────────────────────

# Base player: front-facing warrior with cyan armor
# Head:  rows 0-6   (8px)
# Body:  rows 7-13  (7px + belt at 14)
# Legs:  rows 15-23 (9px)

PLAYER_BASE = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 1
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 2
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 3 brow highlight
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],  # 4 eyes
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],  # 5 mouth
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 6 chin
    [ _, _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],  # 7 shoulders
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],  # 8
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 9 shoulder hlt
    [ _, K,  PB, PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 10 chest detail
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 11
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 12
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],  # 13 shadow
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],  # 14 belt
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 15 legs
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 16
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 17
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 18
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _],  # 19 shadow
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],  # 20 boots
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],  # 21
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],  # 22
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],  # 23 bottom
]

# Idle frame 1: slight breathing pose (belt line shifts, arms very slightly out)
PLAYER_IDLE1 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 1
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 2
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 3
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],  # 4 eyes
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],  # 5
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 6
    [ _, _,  K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],  # 7 (wider shoulders - breath out)
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 8
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 9
    [ _, K,  PB, PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 10
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 11
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 12
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],  # 13
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],  # 14 belt
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 15
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 16
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 17
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 18
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _],  # 19
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],  # 20
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],  # 21
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],  # 22
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],  # 23
]

# Walk frame 0: Right foot forward, left foot back
PLAYER_WALK0 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 1
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 2
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 3
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],  # 4
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],  # 5
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 6
    [ _, _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],  # 7 (arms swing: left arm forward)
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],  # 8
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 9
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 10
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 11
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 12
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],  # 13
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],  # 14
    # Legs: left leg forward (col 9-12 extend), right leg back (col 3-6 pull up)
    [ _, _,  K,  PB, PB, K,  _,  _,  _,  K,  PB, PB, PB, K,  _,  _],  # 15 left pulls up, right steps
    [ _, _,  K,  PB, PB, K,  _,  _,  _,  K,  PB, PB, PB, K,  _,  _],  # 16
    [ _, _,  K,  DP, DP, K,  _,  _,  _,  K,  PB, PB, PB, K,  _,  _],  # 17 left leg shadow (shorter)
    [ _, _,  K,  DT, DT, K,  _,  _,  _,  K,  PB, PB, PB, K,  _,  _],  # 18 left boot
    [ _, _,  K,  DT, K,  _,  _,  _,  _,  K,  DP, DP, DP, K,  _,  _],  # 19 left toe, right shadow
    [ _, _,  K,  K,  _,  _,  _,  _,  _,  K,  DT, DT, DT, K,  _,  _],  # 20 right boot extends
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  DT, DT, DT, DT, K,  _,  _],  # 21 right foot forward
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  DT, DT, DT, DT, K,  _,  _],  # 22
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _],  # 23
]

# Walk frame 1: Mid-stride pass-through (body slightly lower)
PLAYER_WALK1 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 1 (head 1px lower)
    [ _, _,  _,  K,  PG, PG, PG, PG, PG, PG, PG, K,  _,  _,  _,  _],  # 2
    [ _, _,  _,  K,  PG, NW, PG, PG, PG, PG, PG, K,  _,  _,  _,  _],  # 3
    [ _, _,  _,  K,  PG, K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _],  # 4 eyes side-looking
    [ _, _,  _,  K,  PG, PG, K,  PG, PG, K,  PG, K,  _,  _,  _,  _],  # 5
    [ _, _,  _,  K,  K,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _],  # 6
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],  # 7
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 8
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 9
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 10
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 11
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 12
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],  # 13
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],  # 14
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 15
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 16
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 17
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _],  # 18
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],  # 19
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],  # 20
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],  # 21
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],  # 22
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

# Walk frame 2: Left foot forward, right foot back (mirror of walk0 legs)
PLAYER_WALK2 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 1
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 2
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 3
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],  # 4
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],  # 5
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 6
    [ _, _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],  # 7 (right arm forward)
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],  # 8
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, HB, PB, PB, K,  _,  _],  # 9
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 10
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 11
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 12
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],  # 13
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],  # 14
    # Legs: right leg pulled up (col 9-12 shorter), left leg extended forward
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  _,  PB, PB, K,  _,  _,  _],  # 15
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  _,  PB, PB, K,  _,  _,  _],  # 16
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  _,  DP, DP, K,  _,  _,  _],  # 17
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  _,  DT, DT, K,  _,  _,  _],  # 18
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  _,  DT, K,  _,  _,  _,  _],  # 19
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  _,  K,  _,  _,  _,  _,  _],  # 20
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 21 left foot extends
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 22
    [ _, _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

# Walk frame 3: same as walk1 but arms opposite swing
PLAYER_WALK3 = copy_sprite(PLAYER_WALK1)

# Attack frame 0: Wind-up / crouch (1px lower)
PLAYER_ATK0 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 1 (head crouched down)
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 2
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 3
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],  # 4
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],  # 5
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 6
    [ _, _,  K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],  # 7
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 8
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 9
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 10
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 11
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],  # 12 (body squashed)
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],  # 13 belt
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 14
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 15
    [ _, _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _],  # 16
    [ _, _,  _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _],  # 17
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],  # 18
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],  # 19
    [ _, _,  K,  DT, DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _],  # 20
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],  # 21
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 22
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

# Attack frame 1: Arm extends right (sword out)
PLAYER_ATK1 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _],  # arm extends
    [ _, _,  K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, GD, K,  _],  # sword hilt
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, NW, NW, K,  _],  # blade
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

# Attack frame 2: Sword at full extension + lean forward
PLAYER_ATK2 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  HB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, _,  K,  PB, HB, PB, PB, PB, PB, PB, PB, GD, GD, NW, K,  _],  # sword out far
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, NW, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _,  _],  # leg forward stance
    [ _, _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _,  _],
    [ _, _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, PB, K,  _,  _,  _],
    [ _, _,  K,  DP, DP, DP, K,  _,  K,  DP, DP, DP, K,  _,  _,  _],
    [ _, _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _,  _],
    [ _, _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _,  _],
    [ _, _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, DT, K,  _,  _],
    [ _, _,  _,  K,  K,  K,  K,  _,  _,  K,  K,  K,  K,  _,  _,  _],
]

# Attack frame 3: Sword recoil (return swing)
PLAYER_ATK3 = copy_sprite(PLAYER_ATK0)  # back to wind-up
# (reuse crouch as the recoil position)

# Death frame 0: Stagger (same as idle but slightly tilted)
PLAYER_DEATH0 = copy_sprite(PLAYER_BASE)

# Death frame 1: Lean / begin to fall
PLAYER_DEATH1 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # head shifted right
    [ _, _,  _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  PG, K,  PG, K,  K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _],
    [ _, _,  K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _],
    [ _, _,  _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, DG, K,  _,  _],
    [ _, _,  _,  _,  K,  PB, PB, PB, K,  _,  K,  PB, PB, K,  _,  _],
    [ _, _,  _,  _,  K,  PB, PB, PB, K,  _,  _,  K,  PB, K,  _,  _],
    [ _, _,  _,  _,  K,  PB, PB, PB, K,  _,  _,  K,  DP, K,  _,  _],
    [ _, _,  _,  _,  K,  DP, DP, DP, K,  _,  _,  K,  DT, K,  _,  _],
    [ _, _,  _,  _,  K,  DT, DT, DT, K,  _,  _,  K,  K,  _,  _,  _],
    [ _, _,  _,  K,  DT, DT, DT, DT, K,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  DT, DT, DT, DT, K,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# Death frame 2: Halfway fallen
PLAYER_DEATH2 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  K,  K,  PG, K,  PG, K,  K,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _],
    [ _, K,  PB, HB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K],
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _],
    [ _, K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _],
    [ _, _,  K,  DP, DP, DP, DP, DP, DP, DP, DP, DP, K,  _,  _,  _],
    [ _, _,  _,  K,  PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  K,  PB, PB, K,  K,  PB, PB, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  K,  DT, K,  _,  K,  DT, K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  K,  K,  _,  _,  K,  K,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# Death frame 3: Fully flat (lying on ground)
PLAYER_DEATH3 = [
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
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ K, K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  _],  # outline
    [ K, PG, PG, DG, GD, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _],  # body flat
    [ K, PG, DT, DT, DT, PB, DP, DP, DP, DP, DP, DP, DP, DT, K,  _],
    [ K, K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# ─── ENEMY GOBLIN SPRITE DEFINITIONS (16×24) ─────────────────────────────────

ENEMY_BASE = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _],  # 1 horn tips
    [ _, _,  K,  DB, K,  _,  _,  _,  _,  _,  K,  DB, K,  _,  _,  _],  # 2 horns
    [ _, _,  K,  DB, K,  K,  K,  K,  K,  K,  K,  DB, K,  _,  _,  _],  # 3
    [ _, _,  K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _,  _,  _],  # 4 head
    [ _, _,  K,  ER, K,  ER, ER, ER, ER, ER, K,  ER, K,  _,  _,  _],  # 5 eyes (yellow)
    [ _, _,  K,  ER, ER, K,  YL, ER, ER, K,  ER, ER, K,  _,  _,  _],  # 6 fangs
    [ _, _,  K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _,  _,  _],  # 7 chin
    [ _, K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _,  _],  # 8 shoulders
    [ K, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _],  # 9
    [ K, ER, FR, ER, ER, ER, ER, ER, ER, ER, ER, ER, FR, ER, K,  _],  # 10 chest marks
    [ K, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _],  # 11
    [ K, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _],  # 12
    [ _, K,  ER, DB, DB, DB, DB, DB, DB, DB, DB, DB, ER, K,  _,  _],  # 13 shadow
    [ _, _,  K,  DB, DB, DB, DB, DB, DB, DB, DB, DB, K,  _,  _,  _],  # 14 lower torso
    [ _, _,  _,  K,  ER, ER, ER, K,  _,  K,  ER, ER, ER, K,  _,  _],  # 15 legs
    [ _, _,  _,  K,  ER, ER, ER, K,  _,  K,  ER, ER, ER, K,  _,  _],  # 16
    [ _, _,  _,  K,  ER, ER, ER, K,  _,  K,  ER, ER, ER, K,  _,  _],  # 17
    [ _, _,  _,  K,  ER, ER, ER, K,  _,  K,  ER, ER, ER, K,  _,  _],  # 18
    [ _, _,  _,  K,  DB, DB, DB, K,  _,  K,  DB, DB, DB, K,  _,  _],  # 19 shadow
    [ _, _,  _,  K,  DB, DB, DB, K,  _,  K,  DB, DB, DB, K,  _,  _],  # 20
    [ _, _,  K,  DB, DB, DB, DB, K,  _,  K,  DB, DB, DB, DB, K,  _],  # 21
    [ _, _,  K,  DB, DB, DB, DB, K,  _,  K,  DB, DB, DB, DB, K,  _],  # 22
    [ _, K,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  K],  # 23 clawed feet
]

# Enemy idle frame 1: slight bob (body 1px shift)
ENEMY_IDLE1 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _],
    [ _, _,  K,  DB, K,  _,  _,  _,  _,  _,  K,  DB, K,  _,  _,  _],
    [ _, _,  K,  DB, K,  K,  K,  K,  K,  K,  K,  DB, K,  _,  _,  _],
    [ _, _,  K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _,  _,  _],
    [ _, _,  K,  ER, K,  ER, ER, ER, ER, ER, K,  ER, K,  _,  _,  _],
    [ _, _,  K,  ER, ER, K,  YL, ER, ER, K,  ER, ER, K,  _,  _,  _],
    [ _, K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _,  _],
    [ K, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _],
    [ K, ER, FR, ER, ER, ER, ER, ER, ER, ER, ER, ER, FR, ER, K,  _],
    [ K, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _],
    [ K, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _],
    [ _, K,  ER, DB, DB, DB, DB, DB, DB, DB, DB, DB, ER, K,  _,  _],
    [ _, _,  K,  DB, DB, DB, DB, DB, DB, DB, DB, DB, K,  _,  _,  _],
    [ _, _,  _,  K,  ER, ER, ER, K,  _,  K,  ER, ER, ER, K,  _,  _],
    [ _, _,  _,  K,  ER, ER, ER, K,  _,  K,  ER, ER, ER, K,  _,  _],
    [ _, _,  _,  K,  ER, ER, ER, K,  _,  K,  ER, ER, ER, K,  _,  _],
    [ _, _,  _,  K,  DB, DB, DB, K,  _,  K,  DB, DB, DB, K,  _,  _],
    [ _, _,  _,  K,  DB, DB, DB, K,  _,  K,  DB, DB, DB, K,  _,  _],
    [ _, _,  K,  DB, DB, DB, DB, K,  _,  K,  DB, DB, DB, DB, K,  _],
    [ _, _,  K,  DB, DB, DB, DB, K,  _,  K,  DB, DB, DB, DB, K,  _],
    [ _, K,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  K],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# Enemy walk frames: use walk structure from player but with ER/DB colors
def make_enemy_walk(frame_idx):
    """Generate enemy walk frame by adapting player walk."""
    player_walks = [PLAYER_WALK0, PLAYER_WALK1, PLAYER_WALK2, PLAYER_WALK3]
    pw = player_walks[frame_idx]
    result = []
    for row in pw:
        new_row = []
        for px in row:
            if px == PB: new_row.append(ER)
            elif px == DP: new_row.append(DB)
            elif px == HB: new_row.append(FR)
            elif px == DG or px == GD: new_row.append(DB)
            elif px == DT: new_row.append(DB)
            elif px == PG: new_row.append(ER)  # face → red
            elif px == NW: new_row.append(YL)  # highlight → yellow
            else: new_row.append(px)
        result.append(new_row)
    # Restore horns on top
    for r in range(min(7, len(result))):
        for c in range(16):
            if ENEMY_BASE[r][c] != _:
                result[r][c] = ENEMY_BASE[r][c]
    return result

# Enemy attack frame: arms out, aggressive lean
ENEMY_ATK0 = copy_sprite(ENEMY_BASE)
ENEMY_ATK1 = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [ _, _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _],
    [ _, _,  K,  DB, K,  _,  _,  _,  _,  _,  K,  DB, K,  _,  _,  _],
    [ _, _,  K,  DB, K,  K,  K,  K,  K,  K,  K,  DB, K,  _,  _,  _],
    [ _, _,  K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _,  _,  _],
    [ _, _,  K,  ER, K,  ER, ER, ER, ER, ER, K,  ER, K,  _,  _,  _],
    [ _, _,  K,  ER, ER, K,  YL, ER, ER, K,  ER, ER, K,  _,  _,  _],
    [ _, _,  K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _,  _,  _],
    [ K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K, _],  # arms wide out
    [ K,  FR, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, FR, ER, K], # claws extended
    [ K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K, _],
    [ _, K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _,  _],
    [ _, K,  ER, DB, DB, DB, DB, DB, DB, DB, DB, DB, ER, K,  _,  _],
    [ _, _,  K,  DB, DB, DB, DB, DB, DB, DB, DB, DB, K,  _,  _,  _],
    [ _, _,  _,  K,  ER, ER, ER, K,  _,  K,  ER, ER, ER, K,  _,  _],
    [ _, _,  _,  K,  ER, ER, ER, K,  _,  K,  ER, ER, ER, K,  _,  _],
    [ _, _,  _,  K,  ER, ER, ER, K,  _,  K,  ER, ER, ER, K,  _,  _],
    [ _, _,  _,  K,  ER, ER, ER, K,  _,  K,  ER, ER, ER, K,  _,  _],
    [ _, _,  _,  K,  DB, DB, DB, K,  _,  K,  DB, DB, DB, K,  _,  _],
    [ _, _,  _,  K,  DB, DB, DB, K,  _,  K,  DB, DB, DB, K,  _,  _],
    [ _, _,  K,  DB, DB, DB, DB, K,  _,  K,  DB, DB, DB, DB, K,  _],
    [ _, _,  K,  DB, DB, DB, DB, K,  _,  K,  DB, DB, DB, DB, K,  _],
    [ _, K,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  K],
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

def make_enemy_death(frame_idx):
    """Enemy death: tilt and grey out."""
    death_frames = [PLAYER_DEATH0, PLAYER_DEATH1, PLAYER_DEATH2, PLAYER_DEATH3]
    pf = death_frames[frame_idx]
    result = []
    for row in pf:
        new_row = []
        for px in row:
            if px == PB: new_row.append(ER)
            elif px == DP: new_row.append(DB)
            elif px == HB: new_row.append(FR)
            elif px == DG or px == GD: new_row.append(DB)
            elif px == DT: new_row.append(DB)
            elif px == PG: new_row.append(ER)
            elif px == NW: new_row.append(YL)
            else: new_row.append(px)
        result.append(new_row)
    return result

# ─── TILESET — Forest Biome (16 cols × 4 rows, each tile 16×16) ─────────────

def make_tileset_forest():
    """Generate the 256×64 forest tileset."""
    # Row 0: Surface tiles
    # Row 1: Underground tiles
    # Row 2: Tree/wall tiles
    # Row 3: Water & special tiles

    # ── Tile builders ────────────────────────────────────────────────────
    def tile_grass_a():
        """Dense grass (default ground top)"""
        t = [[FG]*16 for _ in range(16)]
        # Grass blades
        for c in range(16):
            if c % 2 == 0: t[0][c] = BG
            else: t[0][c] = FG
        t[1] = [BG,FG,BG,FG,BG,BG,FG,BG,BG,FG,BG,FG,BG,BG,FG,BG]
        t[2] = [BG,BG,FL,BG,FG,BG,BG,FL,BG,BG,BG,BG,FL,BG,BG,FG]
        for r in range(3, 16):
            for c in range(16):
                base = BN if r > 5 else DT
                noise = BD if (r+c)%7==0 else BN
                t[r][c] = base if c%3!=0 else noise
        return t

    def tile_grass_b():
        """Sparse grass variant"""
        t = tile_grass_a()
        # Add more light patches
        t[0][3] = FL; t[0][7] = FL; t[0][11] = FL
        t[1][1] = FL; t[1][9] = FL
        return t

    def tile_grass_c():
        """Grass with flower"""
        t = tile_grass_a()
        # Small flower at col 7-8
        t[0][7] = YL; t[0][8] = YL
        t[1][7] = GD; t[1][8] = GD
        t[2][7] = FG; t[2][8] = FG
        return t

    def tile_dirt_path():
        """Worn dirt path"""
        t = [[DT]*16 for _ in range(16)]
        for r in range(16):
            for c in range(16):
                if (r*3+c*2)%9 < 2: t[r][c] = BN
                elif (r+c*4)%11 < 1: t[r][c] = BD
                else: t[r][c] = DT
        # Pebbles
        t[3][4] = ST; t[3][5] = MG
        t[7][11] = MG; t[7][12] = ST
        t[11][2] = ST; t[12][9] = MG
        return t

    def tile_sand():
        """Sandy patch"""
        t = [[SN]*16 for _ in range(16)]
        for r in range(16):
            for c in range(16):
                if (r+c)%5 == 0: t[r][c] = DS
                elif (r*2+c)%7 == 1: t[r][c] = PS
                else: t[r][c] = SN
        return t

    def tile_grass_dark():
        """Forest floor - darker grass"""
        t = [[DF]*16 for _ in range(16)]
        for r in range(16):
            for c in range(16):
                if r < 2:
                    t[r][c] = FG if (r+c)%3==0 else DF
                else:
                    t[r][c] = BD if (r+c)%5==0 else BN if r < 8 else BD
        return t

    def tile_mossy_rock():
        """Rock with moss on top"""
        t = [[BN]*16 for _ in range(16)]
        # Rock face
        for r in range(16):
            for c in range(16):
                t[r][c] = ST if (r+c)%4==0 else MG if (r*2+c)%6==0 else DK
        # Moss on top
        for r in range(3):
            for c in range(16):
                t[r][c] = LG if r<1 else FG
        t[0][0]=K; t[0][15]=K; t[0][7]=FL; t[0][8]=FL
        return t

    def tile_water_a():
        """Water tile frame 0"""
        t = [[SB]*16 for _ in range(16)]
        for r in range(16):
            for c in range(16):
                if r < 2: t[r][c] = IW if (r+c)%3==0 else HB
                elif r < 8: t[r][c] = PB if (c+r)%4==0 else SB
                else: t[r][c] = DP if (r+c)%5==0 else SB
        return t

    def tile_water_b():
        """Water tile frame 1 (offset ripple)"""
        t = tile_water_a()
        # Shift ripple pattern
        for r in range(16):
            t[r] = t[r][4:] + t[r][:4]
        return t

    def tile_grass_stone():
        """Grass-to-stone transition"""
        t = tile_grass_a()
        for r in range(8, 16):
            for c in range(16):
                t[r][c] = ST if (r+c)%3==0 else DK
        return t

    def tile_cliff_top():
        """Cliff top edge"""
        t = [[BN]*16 for _ in range(16)]
        # Cliff edge
        for r in range(3):
            for c in range(16):
                t[r][c] = FG if r < 1 else DT if r < 2 else BN
        t[0] = [FG,BG,FG,BG,BG,FG,BG,FG,BG,BG,FG,BG,BG,FG,BG,FG]
        t[1] = [BG,FG,BG,FL,BG,BG,FG,BG,FL,BG,FG,BG,BG,BG,FG,BG]
        t[2] = [DT]*16
        for c in [3,7,11]: t[2][c] = BD
        for r in range(3, 16):
            for c in range(16):
                t[r][c] = MG if (r+c)%7==0 else DK if (r*2+c)%9==0 else ST
        t[3][0] = K; t[3][15] = K
        return t

    def tile_cliff_face():
        """Cliff vertical face"""
        t = [[ST]*16 for _ in range(16)]
        for r in range(16):
            for c in range(16):
                if c == 0 or c == 15: t[r][c] = K
                elif (r*3+c)%8 < 1: t[r][c] = DK
                elif (r+c*2)%11 < 2: t[r][c] = MG
                else: t[r][c] = ST
        # Horizontal layer lines
        for r in [3, 7, 11]:
            for c in range(1, 15):
                t[r][c] = DK
        return t

    def tile_cliff_bottom():
        """Cliff base / scree"""
        t = tile_cliff_face()
        for r in range(12, 16):
            for c in range(1, 15):
                if r > 13: t[r][c] = DT if (r+c)%3!=0 else BD
                else: t[r][c] = DK if (r+c)%4==0 else ST
        return t

    def tile_soil_fill():
        """Underground soil fill"""
        t = [[BN]*16 for _ in range(16)]
        for r in range(16):
            for c in range(16):
                if (r*3+c)%7 < 1: t[r][c] = BD
                elif (r+c*2)%9 < 2: t[r][c] = DT
                else: t[r][c] = BN
        return t

    def tile_stone_block():
        """Stone masonry block"""
        t = [[ST]*16 for _ in range(16)]
        # Mortar lines
        for c in range(16): t[0][c] = DK; t[15][c] = DK
        for r in range(16): t[r][0] = DK; t[r][15] = DK
        t[7] = [DK]*16
        for c in [8]: t[r][c] = DK
        for r in range(16):
            for c in range(16):
                if t[r][c] == ST:
                    if (r<7 and c>8) or (r>7 and c<8):
                        t[r][c] = MG
        return t

    def tile_dark_soil():
        """Deep dark soil"""
        t = [[BD]*16 for _ in range(16)]
        for r in range(16):
            for c in range(16):
                if (r+c)%5 == 0: t[r][c] = DK
                elif (r*2+c*3)%11 == 0: t[r][c] = BN
        return t

    def tile_ore_rock():
        """Rock with ore veins (gold)"""
        t = tile_stone_block()
        for r in range(16):
            for c in range(16):
                if (r*2+c*3)%13 < 2 and t[r][c] != DK:
                    t[r][c] = DG
        t[5][6]=GD; t[5][7]=YL; t[6][6]=GD
        return t

    def tile_tree_top():
        """Tree canopy (top center)"""
        t = [[_]*16 for _r in range(16)]
        # Rounded canopy
        for r in range(16):
            for c in range(16):
                dx = abs(c - 7) - 0.5
                dy = abs(r - 8) - 0.5
                dist = (dx*dx + dy*dy)**0.5
                if dist < 6:
                    t[r][c] = LG if (r+c)%4==0 else FG
                elif dist < 7:
                    t[r][c] = DF if (r+c)%2==0 else FG
        # Dark outline
        for r in range(16):
            for c in range(16):
                if t[r][c] != _ and (
                    (r==0 or t[r-1][c]==_) or (r==15 or t[r+1][c]==_) or
                    (c==0 or t[r][c-1]==_) or (c==15 or t[r][c+1]==_)):
                    t[r][c] = K
        # Highlight
        t[3][5]=FL; t[3][6]=BG; t[4][4]=BG
        return t

    def tile_tree_trunk():
        """Tree trunk"""
        t = [[_]*16 for _r in range(16)]
        # Center trunk
        for r in range(16):
            for c in range(6, 10):
                if c == 6 or c == 9: t[r][c] = K
                elif c == 7: t[r][c] = BN
                else: t[r][c] = DT
        # Roots at bottom
        for c in range(4, 12):
            if c < 6 or c > 9:
                t[14][c] = BD; t[15][c] = BD
        t[14][4]=K; t[14][11]=K; t[15][3]=K; t[15][12]=K
        # Ground
        for c in range(16):
            t[15][c] = FG if c%3!=0 else BG
        return t

    def tile_tree_left():
        """Left half of wide tree"""
        t = tile_tree_top()
        t = mirror_h(t)
        return t

    def tile_tree_canopy_wide():
        """Wide tree canopy section"""
        t = [[_]*16 for _r in range(16)]
        for r in range(16):
            for c in range(16):
                if r < 14:
                    t[r][c] = LG if (r+c)%3==0 else FG if (r+c)%3==1 else DF
                else:
                    t[r][c] = FG if r==14 else BG
        for r in range(16):
            if t[r][0] != _: t[r][0] = K
            if t[r][15] != _: t[r][15] = K
        t[0][7]=K; t[0][8]=K; t[1][5]=K; t[1][6]=FL
        return t

    def tile_lava():
        """Lava / magma tile"""
        t = [[DK]*16 for _ in range(16)]
        for r in range(16):
            for c in range(16):
                if r < 6:
                    if (c+r)%3==0: t[r][c] = YL
                    elif (c*2+r)%5==0: t[r][c] = GD
                    else: t[r][c] = FR
                elif r < 10:
                    t[r][c] = BR if (r+c)%4==0 else ER
                else:
                    t[r][c] = DB if (r+c)%3==0 else DK
        return t

    def tile_spike():
        """Spike trap hazard"""
        t = [[ST]*16 for _ in range(16)]
        for r in range(16):
            for c in range(16):
                t[r][c] = DK
        # Spikes
        spikes = [(2,4),(2,9),(2,14)]
        for sr, sc in spikes:
            for r in range(sr, 16):
                width = max(0, sr+5-r)
                for c in range(sc-width, sc+width+1):
                    if 0<=c<16:
                        t[r][c] = NW if c==sc else LS
            t[sr][sc-1]=K; t[sr][sc+1]=K; t[sr][sc]=NW
        # Base plate
        for c in range(16): t[14][c] = ST; t[15][c] = DK
        return t

    def tile_mushroom():
        """Mushroom decoration"""
        t = tile_grass_a()
        # Mushroom cap
        for r in range(3,7):
            for c in range(5,11):
                dx=abs(c-7); dy=abs(r-5)
                if dx+dy < 4:
                    t[r][c] = ER if r>4 else BR
        t[3][7]=BR; t[3][8]=BR
        t[4][6]=BR; t[4][9]=BR; t[4][7]=NW; t[4][8]=NW
        # Stem
        t[7][7]=NW; t[7][8]=LS
        t[8][7]=NW; t[8][8]=LS
        t[9][7]=NW; t[9][8]=LS
        return t

    # ── Assemble the 16×4 tileset grid ───────────────────────────────────
    row0 = [
        tile_grass_a(),       # 0  dense grass
        tile_grass_b(),       # 1  sparse grass
        tile_grass_c(),       # 2  grass+flower
        tile_dirt_path(),     # 3  dirt path
        tile_sand(),          # 4  sand
        tile_grass_dark(),    # 5  forest floor
        tile_mossy_rock(),    # 6  mossy rock
        tile_water_a(),       # 7  water frame 0
        tile_water_b(),       # 8  water frame 1
        tile_grass_stone(),   # 9  grass-stone blend
        tile_cliff_top(),     # 10 cliff top
        tile_cliff_face(),    # 11 cliff face
        tile_cliff_bottom(),  # 12 cliff bottom
        tile_mushroom(),      # 13 mushroom
        tile_lava(),          # 14 lava
        tile_spike(),         # 15 spike trap
    ]
    row1 = [
        tile_soil_fill(),     # 16 soil fill
        tile_soil_fill(),     # 17
        tile_dark_soil(),     # 18 deep soil
        tile_dark_soil(),     # 19
        tile_stone_block(),   # 20 stone block
        tile_stone_block(),   # 21
        tile_ore_rock(),      # 22 ore rock
        tile_stone_block(),   # 23
        tile_cliff_face(),    # 24 vertical stone
        tile_cliff_face(),    # 25
        tile_cliff_face(),    # 26
        tile_cliff_face(),    # 27
        tile_dark_soil(),     # 28
        tile_dark_soil(),     # 29
        tile_lava(),          # 30
        tile_lava(),          # 31
    ]
    row2 = [
        tile_tree_top(),         # 32 tree canopy center
        tile_tree_left(),        # 33 tree canopy right (mirrored)
        tile_tree_trunk(),       # 34 tree trunk
        tile_tree_canopy_wide(), # 35 wide canopy
        tile_tree_top(),         # 36
        tile_tree_top(),         # 37
        tile_grass_a(),          # 38
        tile_grass_b(),          # 39
        tile_mossy_rock(),       # 40
        tile_mossy_rock(),       # 41
        tile_grass_dark(),       # 42
        tile_grass_dark(),       # 43
        tile_water_a(),          # 44
        tile_water_b(),          # 45
        tile_spike(),            # 46
        tile_spike(),            # 47
    ]
    row3 = [
        tile_grass_a(),          # 48
        tile_grass_b(),          # 49
        tile_grass_c(),          # 50
        tile_dirt_path(),        # 51
        tile_sand(),             # 52
        tile_water_a(),          # 53
        tile_water_b(),          # 54
        tile_mushroom(),         # 55
        tile_lava(),             # 56
        tile_lava(),             # 57
        tile_cliff_top(),        # 58
        tile_cliff_face(),       # 59
        tile_cliff_bottom(),     # 60
        tile_spike(),            # 61
        tile_ore_rock(),         # 62
        tile_stone_block(),      # 63
    ]

    # Composite into one 256×64 sheet
    sheet = []
    for tile_row in [row0, row1, row2, row3]:
        # Each tile is 16 rows; composite horizontally
        for pixel_row in range(16):
            row = []
            for tile in tile_row:
                row.extend(tile[pixel_row])
            sheet.append(row)
    return sheet

# ─── UI ELEMENTS ─────────────────────────────────────────────────────────────

def make_hud_frame():
    """120×12 HUD panel frame with transparent center."""
    t = [[_]*120 for _r in range(12)]
    # Top border
    for c in range(120):
        t[0][c] = K
        t[1][c] = DK
        t[10][c] = DK
        t[11][c] = K
    # Left/right borders
    for r in range(12):
        t[r][0] = K
        t[r][1] = DK
        t[r][118] = DK
        t[r][119] = K
    # Corner highlights
    t[1][1] = ST; t[1][118] = ST
    t[10][1] = ST; t[10][118] = ST
    # Interior very dark (semi-visible BG)
    for r in range(2, 10):
        for c in range(2, 118):
            t[r][c] = (10, 10, 20, 180)  # semi-transparent dark
    return t


def make_bar_fill(w, h, color):
    """Solid fill bar of given size and color, with highlight on top."""
    t = [[(0,0,0,0)]*w for _ in range(h)]
    r0, g0, b0, _ = color
    light = (min(255, r0+60), min(255, g0+60), min(255, b0+60), 255)
    dark  = (max(0, r0-40),  max(0, g0-40),  max(0, b0-40),  255)
    for r in range(h):
        for c in range(w):
            if r == 0: t[r][c] = light
            elif r == h-1: t[r][c] = dark
            else: t[r][c] = color
    return t


def make_quest_icon():
    """16×16 quest exclamation mark icon."""
    t = [[_]*16 for _r in range(16)]
    # Outer circle
    for r in range(16):
        for c in range(16):
            dx = abs(c-7); dy = abs(r-7)
            dist = (dx*dx + dy*dy)**0.5
            if dist < 7.5 and dist >= 6:
                t[r][c] = K
            elif dist < 6:
                t[r][c] = YL
    # Exclamation mark (dark)
    for r in [2,3,4,5,6,7,8,9]:
        t[r][7] = DG; t[r][8] = DG
    t[11][7]=DG; t[11][8]=DG; t[12][7]=DG; t[12][8]=DG
    # Highlight
    t[2][6]=GD; t[3][6]=GD
    return t


def make_xp_orb():
    """16×16 XP orb — golden sphere with glow."""
    t = [[_]*16 for _r in range(16)]
    for r in range(16):
        for c in range(16):
            dx = c - 7.5; dy = r - 7.5
            dist = (dx*dx + dy*dy)**0.5
            if dist < 1.5:  t[r][c] = NW
            elif dist < 3:  t[r][c] = YL
            elif dist < 5:  t[r][c] = GD
            elif dist < 6:  t[r][c] = DG
            elif dist < 7:  t[r][c] = (168,112,0,180)  # outer glow fade
    # Sparkle highlights
    for pos in [(3,5),(4,4),(3,10),(2,8)]:
        r,c = pos
        if 0<=r<16 and 0<=c<16: t[r][c] = NW
    return t


# ─── BACKGROUND LAYERS ───────────────────────────────────────────────────────

def make_sky():
    """320×60 sky background with gradient and clouds."""
    t = [[_]*320 for _r in range(60)]

    # Sky gradient (horizon lighter)
    for r in range(60):
        blend = r / 59.0
        sr = int(SKY3[0]*(1-blend) + SKY1[0]*blend)
        sg = int(SKY3[1]*(1-blend) + SKY1[1]*blend)
        sb = int(SKY3[2]*(1-blend) + SKY1[2]*blend)
        for c in range(320):
            t[r][c] = (sr, sg, sb, 255)

    # Clouds (a few fluffy blobs)
    cloud_centers = [(50,15),(120,8),(200,20),(280,12),(160,35)]
    for cc, cr in cloud_centers:
        for r in range(cr-6, cr+7):
            for c in range(cc-20, cc+21):
                if 0<=r<60 and 0<=c<320:
                    dx = abs(c-cc); dy = abs(r-cr)*1.5
                    dist = (dx*dx+dy*dy)**0.5
                    if dist < 12:
                        alpha = int(220*(1-dist/14))
                        cr_c, cg_c, cb_c, _a = CLD
                        t[r][c] = (cr_c, cg_c, cb_c, min(255,alpha))
                    elif dist < 14:
                        alpha = int(100*(1-dist/16))
                        cr_c, cg_c, cb_c, _a = CLDs
                        if alpha > 30:
                            t[r][c] = (cr_c, cg_c, cb_c, alpha)
    # Sun
    for r in range(8, 20):
        for c in range(270, 295):
            dx = abs(c-282); dy = abs(r-14)
            dist = (dx*dx+dy*dy)**0.5
            if dist < 5: t[r][c] = NW
            elif dist < 6: t[r][c] = YL
    return t


def make_hills_far():
    """320×60 distant hills silhouette (parallax layer 1)."""
    t = [[_]*320 for _r in range(60)]

    # Hill curve using sine wave
    import math
    hill_h = [0]*320
    for c in range(320):
        # Multiple overlapping hills
        h  = 20 * math.sin(c / 80.0 + 0.5)
        h += 10 * math.sin(c / 40.0 + 1.2)
        h += 5  * math.sin(c / 20.0 + 0.8)
        hill_h[c] = int(45 + h)  # base row for hill top

    for c in range(320):
        top = max(0, min(59, hill_h[c]))
        for r in range(top, 60):
            depth = (r - top) / max(1, 60 - top)
            # Far hills: cool blueish green
            base_r = int(FG[0] * 0.5 + DP[0] * 0.5)
            base_g = int(FG[1] * 0.5 + DP[1] * 0.5)
            base_b = int(FG[2] * 0.5 + DP[2] * 0.5)
            dark_r = max(0, base_r - int(depth*30))
            dark_g = max(0, base_g - int(depth*30))
            dark_b = max(0, base_b - int(depth*20))
            t[r][c] = (dark_r, dark_g, dark_b, 255)

        # Tree silhouettes on hills
        if c % 22 < 5:
            tree_top = max(0, hill_h[c] - 15 + (c%22)*2)
            for r in range(tree_top, min(60, hill_h[c])):
                width = max(0, 3 - abs(r - tree_top - 2))
                cc = c + c%22 - 2
                for dc in range(-width, width+1):
                    if 0 <= cc+dc < 320:
                        t[r][cc+dc] = (DF[0],DF[1],DF[2],230)
    return t


def make_hills_near():
    """320×80 near ground layer with trees silhouette."""
    import math
    t = [[_]*320 for _r in range(80)]

    hill_h = [0]*320
    for c in range(320):
        h  = 15 * math.sin(c / 60.0 + 2.0)
        h += 8  * math.sin(c / 25.0 + 0.4)
        h += 3  * math.sin(c / 12.0)
        hill_h[c] = int(30 + h)

    for c in range(320):
        top = max(0, min(79, hill_h[c]))
        for r in range(top, 80):
            depth = (r - top) / max(1, 80 - top)
            base_r = int(FG[0] * (1-depth*0.4))
            base_g = int(FG[1] * (1-depth*0.3))
            base_b = int(FG[2] * (1-depth*0.2))
            t[r][c] = (max(0,base_r), max(0,base_g), max(0,base_b), 255)

        # Near tree silhouettes
        if c % 30 < 8:
            tree_top = max(0, hill_h[c] - 25 + (c%30)//2)
            trunk_c = c + 4
            # Tree crown
            for r in range(tree_top, min(80, hill_h[c])):
                width = max(0, 6 - abs(r - (tree_top+6)) // 2)
                for dc in range(-width, width+1):
                    if 0 <= trunk_c+dc < 320:
                        col = DF if (r+dc)%3==0 else FG
                        t[r][trunk_c+dc] = (col[0],col[1],col[2],255)
            # Trunk
            for r in range(hill_h[c]-5, min(80, hill_h[c]+5)):
                if 0 <= trunk_c < 320:
                    t[r][trunk_c] = (BN[0],BN[1],BN[2],255)
                if 0 <= trunk_c+1 < 320:
                    t[r][trunk_c+1] = (DT[0],DT[1],DT[2],255)
    return t

# ─── GRASS / HAZARD single tiles (overwrite old placeholders) ────────────────

def make_ground_tile():
    """Improved 16×16 grass-plains tile."""
    t = []
    for r in range(16):
        row = []
        for c in range(16):
            if r == 0:
                row.append(BG if c%2==0 else FG)
            elif r == 1:
                row.append(FL if c in [2,6,10,14] else BG if c%2==1 else FG)
            elif r == 2:
                row.append(FL if c in [4,9,13] else BG)
            elif r < 5:
                row.append(BN)
            elif r < 9:
                row.append(BD if (r+c)%5==0 else BN)
            elif r < 13:
                row.append(BD if (r+c)%4==0 else DT if c%3==0 else BN)
            else:
                row.append(BD if (r*2+c)%7==0 else BN)
        t.append(row)
    return t


def make_fire_tile():
    """Improved 16×16 fire/lava hazard tile."""
    t = [[_]*16 for _r in range(16)]
    # Flame tips (top)
    import math
    for r in range(9):
        for c in range(16):
            flicker = math.sin(c * 0.8 + r * 0.5) * 3
            depth = r / 9.0
            fc = int(c + flicker) % 16
            if (c + r) % 3 == 0:
                if r < 3: t[r][c] = YL
                elif r < 6: t[r][c] = GD
                else: t[r][c] = FR
            elif (c*2 + r) % 5 == 0:
                if r < 4: t[r][c] = NW
                else: t[r][c] = YL
            else:
                if r < 4: t[r][c] = GD
                elif r < 7: t[r][c] = FR
                else: t[r][c] = BR
    # Lava base
    for r in range(9, 16):
        for c in range(16):
            if (r+c)%4 == 0: t[r][c] = DB
            elif (r*2+c)%7 == 0: t[r][c] = BR
            else: t[r][c] = DK
    # Glow at boundary
    for c in range(16):
        t[9][c] = FR if c%3!=0 else BR
    return t

# ─── Validate and composite spritesheets ─────────────────────────────────────

def check(name, pixels, w, h):
    assert len(pixels) == h, f'{name}: expected {h} rows, got {len(pixels)}'
    for i, row in enumerate(pixels):
        assert len(row) == w, f'{name} row {i}: expected {w} cols, got {len(row)}'

print('Generating production sprites...')

# ── Player spritesheet: 224×24 (14 frames of 16×24) ──────────────────────────
player_frames = [
    PLAYER_BASE,    # 0 idle-0
    PLAYER_IDLE1,   # 1 idle-1
    PLAYER_WALK0,   # 2 walk-0
    PLAYER_WALK1,   # 3 walk-1
    PLAYER_WALK2,   # 4 walk-2
    PLAYER_WALK3,   # 5 walk-3
    PLAYER_ATK0,    # 6 attack-0
    PLAYER_ATK1,    # 7 attack-1
    PLAYER_ATK2,    # 8 attack-2
    PLAYER_ATK3,    # 9 attack-3
    PLAYER_DEATH0,  # 10 death-0
    PLAYER_DEATH1,  # 11 death-1
    PLAYER_DEATH2,  # 12 death-2
    PLAYER_DEATH3,  # 13 death-3
]
for i, f in enumerate(player_frames):
    check(f'player_frame_{i}', f, 16, 24)

player_sheet = hstack(player_frames)
check('player_sheet', player_sheet, 224, 24)

player_path = os.path.join(OUT_DIR, 'char_player_warrior.png')
write_png(player_path, player_sheet)
write_png(os.path.join(_make_asset_dir('assets/sprites/characters'), 'char_player_warrior.png'), player_sheet)

# ── Enemy spritesheet: 192×24 (12 frames of 16×24) ───────────────────────────
enemy_frames = [
    ENEMY_BASE,             # 0 idle-0
    ENEMY_IDLE1,            # 1 idle-1
    make_enemy_walk(0),     # 2 walk-0
    make_enemy_walk(1),     # 3 walk-1
    make_enemy_walk(2),     # 4 walk-2
    make_enemy_walk(3),     # 5 walk-3
    ENEMY_ATK0,             # 6 attack-0
    ENEMY_ATK1,             # 7 attack-1
    ENEMY_ATK0,             # 8 attack-2 (reuse)
    ENEMY_BASE,             # 9 attack-3 (return)
    make_enemy_death(2),    # 10 death-0
    make_enemy_death(3),    # 11 death-1
]
for i, f in enumerate(enemy_frames):
    check(f'enemy_frame_{i}', f, 16, 24)

enemy_sheet = hstack(enemy_frames)
check('enemy_sheet', enemy_sheet, 192, 24)

enemy_path = os.path.join(OUT_DIR, 'char_enemy_goblin.png')
write_png(enemy_path, enemy_sheet)
write_png(os.path.join(_make_asset_dir('assets/sprites/enemies'), 'char_enemy_goblin.png'), enemy_sheet)

# ── Tileset: 256×64 ───────────────────────────────────────────────────────────
tileset = make_tileset_forest()
check('tileset_forest', tileset, 256, 64)
ts_path = os.path.join(OUT_DIR, 'tileset_forest.png')
write_png(ts_path, tileset)
ts_dir = _make_asset_dir('assets/tiles/tilesets')
write_png(os.path.join(ts_dir, 'tileset_forest.png'), tileset)

# ── Individual tiles (overwrite improved versions) ───────────────────────────
ground = make_ground_tile()
check('ground', ground, 16, 16)
write_png(os.path.join(OUT_DIR, 'tile_grass_plains.png'), ground)
write_png(os.path.join(_make_asset_dir('assets/tiles'), 'tile_grass_plains.png'), ground)

fire = make_fire_tile()
check('fire', fire, 16, 16)
write_png(os.path.join(OUT_DIR, 'tile_hazard_fire.png'), fire)
write_png(os.path.join(_make_asset_dir('assets/tiles'), 'tile_hazard_fire.png'), fire)

# ── UI elements ───────────────────────────────────────────────────────────────
ui_dir = _make_asset_dir('assets/ui/hud')

hud = make_hud_frame()
check('hud_frame', hud, 120, 12)
write_png(os.path.join(OUT_DIR, 'ui_hud_frame.png'), hud)
write_png(os.path.join(ui_dir, 'ui_hud_frame.png'), hud)

bar_hp = make_bar_fill(50, 6, (76, 200, 76, 255))  # green HP
check('bar_hp', bar_hp, 50, 6)
write_png(os.path.join(OUT_DIR, 'ui_bar_fill.png'), bar_hp)
write_png(os.path.join(ui_dir, 'ui_bar_fill.png'), bar_hp)

bar_mp = make_bar_fill(50, 6, (144, 80, 224, 255))  # purple MP
check('bar_mp', bar_mp, 50, 6)
write_png(os.path.join(OUT_DIR, 'ui_bar_mp_fill.png'), bar_mp)
write_png(os.path.join(ui_dir, 'ui_bar_mp_fill.png'), bar_mp)

icon_dir = _make_asset_dir('assets/ui/icons')
quest = make_quest_icon()
check('quest_icon', quest, 16, 16)
write_png(os.path.join(OUT_DIR, 'ui_icon_quest.png'), quest)
write_png(os.path.join(icon_dir, 'ui_icon_quest.png'), quest)

xp = make_xp_orb()
check('xp_orb', xp, 16, 16)
write_png(os.path.join(OUT_DIR, 'icon_pickup_xp.png'), xp)
write_png(os.path.join(_make_asset_dir('assets/ui/icons'), 'icon_pickup_xp.png'), xp)

# ── Background layers ─────────────────────────────────────────────────────────
bg_dir = _make_asset_dir('assets/backgrounds')

sky = make_sky()
check('sky', sky, 320, 60)
write_png(os.path.join(OUT_DIR, 'bg_sky.png'), sky)
write_png(os.path.join(bg_dir, 'bg_sky.png'), sky)

hills_far = make_hills_far()
check('hills_far', hills_far, 320, 60)
write_png(os.path.join(OUT_DIR, 'bg_hills_far.png'), hills_far)
write_png(os.path.join(bg_dir, 'bg_hills_far.png'), hills_far)

hills_near = make_hills_near()
check('hills_near', hills_near, 320, 80)
write_png(os.path.join(OUT_DIR, 'bg_hills_near.png'), hills_near)
write_png(os.path.join(bg_dir, 'bg_hills_near.png'), hills_near)

print('\nAll production assets generated successfully.')
print('\nAsset summary:')
print('  char_player_warrior.png   — 224×24  (14 frames: idle×2 walk×4 attack×4 death×4)')
print('  char_enemy_goblin.png     — 192×24  (12 frames: idle×2 walk×4 attack×4 death×2)')
print('  tileset_forest.png        — 256×64  (64 tiles of 16×16: surface/underground/trees/special)')
print('  tile_grass_plains.png     — 16×16   improved ground tile')
print('  tile_hazard_fire.png      — 16×16   improved fire hazard')
print('  ui_hud_frame.png          — 120×12  HUD panel')
print('  ui_bar_fill.png           — 50×6    HP bar fill')
print('  ui_bar_mp_fill.png        — 50×6    MP bar fill')
print('  ui_icon_quest.png         — 16×16   quest icon')
print('  icon_pickup_xp.png        — 16×16   improved XP orb')
print('  bg_sky.png                — 320×60  sky background')
print('  bg_hills_far.png          — 320×60  far hills parallax layer')
print('  bg_hills_near.png         — 320×80  near hills/trees parallax layer')
