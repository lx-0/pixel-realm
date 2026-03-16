#!/usr/bin/env python3
"""
Generate placeholder pixel-art PNG sprites for PixelRealm prototype.
Uses only Python stdlib (struct + zlib) — no PIL required.

Outputs follow the art style guide (docs/ART-STYLE-GUIDE.md):
  - 16×24 character sprites (player, enemy)
  - 16×16 tiles (ground, hazard)
  - 16×16 pickup icon (XP orb)
"""

import struct
import zlib
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
os.makedirs(OUT_DIR, exist_ok=True)

# ─── Palette (RGBA) ───────────────────────────────────────────────────────────
_ = (0, 0, 0, 0)         # transparent

# Neutrals
K  = (13,  13,  13,  255)  # shadow black / outline
DK = (43,  43,  43,  255)  # dark rock
ST = (74,  74,  74,  255)  # stone gray
LS = (110, 110, 110, 255)  # light stone
PG = (200, 200, 200, 255)  # pale gray (skin)
NW = (240, 240, 240, 255)  # near white (highlight)

# Warm earth
BD = (59,  32,  16,  255)  # deep soil
BN = (107, 58,  31,  255)  # rich earth
DT = (139, 92,  42,  255)  # dirt / boots
SN = (184, 132, 63,  255)  # sand

# Greens
FG = (45,  110, 45,  255)  # forest green (dark)
LG = (76,  155, 76,  255)  # leaf green
BG = (120, 200, 120, 255)  # bright grass
FL = (168, 228, 160, 255)  # light foliage

# Cyan / player
DP = (26,  74,  138, 255)  # deep ocean / player shadow
PB = (80,  168, 232, 255)  # player blue (main)
SB = (144, 208, 248, 255)  # sky blue / player highlight

# Red / enemy
DB = (90,  10,  10,  255)  # deep blood
ER = (212, 32,  32,  255)  # enemy red
FR = (240, 96,  32,  255)  # fire orange
EM = (248, 160, 96,  255)  # ember

# Yellow / gold
DG = (168, 112, 0,   255)  # dark gold
GD = (232, 184, 0,   255)  # gold
YL = (255, 224, 64,  255)  # bright yellow / XP

# ─── PNG writer ───────────────────────────────────────────────────────────────

def _make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    payload = chunk_type + data
    crc = zlib.crc32(payload) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)


def write_png(path: str, pixels: list[list[tuple]]) -> None:
    """Write a list-of-rows of (R,G,B,A) tuples as a PNG file."""
    height = len(pixels)
    width  = len(pixels[0])

    ihdr_data = struct.pack('>II', width, height) + bytes([8, 6, 0, 0, 0])

    raw_rows = b''
    for row in pixels:
        raw_rows += b'\x00'                          # filter byte: None
        for r, g, b, a in row:
            raw_rows += bytes([r, g, b, a])

    compressed = zlib.compress(raw_rows, 9)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(_make_chunk(b'IHDR', ihdr_data))
        f.write(_make_chunk(b'IDAT', compressed))
        f.write(_make_chunk(b'IEND', b''))

    print(f'  wrote {path}  ({width}×{height})')


# ─── Sprite definitions ───────────────────────────────────────────────────────

# Player: 16 wide × 24 tall, facing down (idle)
PLAYER = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 1
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 2
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 3
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],  # 4 eyes
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],  # 5 mouth
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 6
    [ _, _,  _,  K,  PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _,  _],  # 7 shoulders
    [ _, _,  K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _,  _],  # 8
    [ _, K,  PB, SB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 9 highlight
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 10
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 11
    [ _, K,  PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, PB, K,  _,  _],  # 12
    [ _, K,  PB, DP, DP, DP, DP, DP, DP, DP, DP, DP, PB, K,  _,  _],  # 13 shadow
    [ _, _,  K,  DG, DG, DG, DG, DG, DG, DG, DG, DG, K,  _,  _,  _],  # 14 belt
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

# Enemy goblin: 16 wide × 24 tall — angular, red/dark
ENEMY = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _],  # 1 horn tips
    [ _, _,  K,  DB, K,  _,  _,  _,  _,  _,  K,  DB, K,  _,  _,  _],  # 2 horns
    [ _, _,  K,  DB, K,  K,  K,  K,  K,  K,  K,  DB, K,  _,  _,  _],  # 3
    [ _, _,  K,  ER, ER, ER, ER, ER, ER, ER, ER, ER, K,  _,  _,  _],  # 4 head
    [ _, _,  K,  ER, K,  ER, ER, ER, ER, ER, K,  ER, K,  _,  _,  _],  # 5 eyes
    [ _, _,  K,  ER, ER, K,  ER, ER, ER, K,  ER, ER, K,  _,  _,  _],  # 6 teeth
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

# Ground tile: 16×16 — forest/plains biome (grass top, rich soil below)
GROUND = [
    [FG, BG, FG, BG, BG, FG, BG, BG, FG, BG, BG, FG, BG, FG, BG, FG],  # 0 grass
    [BG, FG, BG, BG, FG, BG, FG, BG, BG, FG, BG, BG, FG, BG, FG, BG],  # 1
    [BG, BG, FG, FL, BG, BG, BG, FG, FL, BG, FG, BG, BG, BG, BG, FG],  # 2 light patches
    [BD, BN, BN, BN, BD, BN, BN, BN, BN, BD, BN, BN, BD, BN, BN, BN],  # 3 soil starts
    [BN, DT, BN, BN, DT, BN, BN, BN, DT, BN, BN, DT, BN, BN, BN, DT],  # 4
    [DT, BN, BN, DT, BN, BN, DT, BN, BN, DT, BN, BN, DT, BN, DT, BN],  # 5
    [BN, BN, DT, BN, BD, BN, BN, DT, BN, BN, BD, BN, BN, DT, BN, BN],  # 6
    [BN, DT, BN, BN, BN, DT, BN, BN, DT, BN, BN, BN, DT, BN, BN, DT],  # 7
    [BD, BN, BN, DT, BN, BN, BD, BN, BN, DT, BN, BN, BD, BN, BN, DT],  # 8
    [BN, BN, BD, BN, DT, BN, BN, BN, BD, BN, DT, BN, BN, BN, BD, BN],  # 9
    [DT, BD, BN, BN, BN, DT, BN, BD, BN, BN, BN, DT, BN, BD, BN, BN],  # 10
    [BN, BN, DT, BD, BN, BN, DT, BN, BN, BD, BN, BN, DT, BN, BN, BD],  # 11
    [BD, BN, BN, BN, BD, BN, BN, DT, BN, BN, BD, BN, BN, DT, BN, BN],  # 12
    [BN, DT, BD, BN, BN, DT, BD, BN, DT, BD, BN, DT, BD, BN, DT, BD],  # 13
    [BD, BN, BN, BD, BN, BN, BN, BD, BN, BN, BN, BD, BN, BN, BD, BN],  # 14
    [BN, BD, BN, BN, BD, BD, BN, BN, BD, BN, BD, BN, BN, BD, BN, BD],  # 15
]

# XP Orb pickup: 16×16 — golden sphere
XP_ORB = [
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 1
    [ _, _,  _,  _,  _,  DG, DG, DG, DG, DG, _,  _,  _,  _,  _,  _],  # 2
    [ _, _,  _,  _,  DG, GD, GD, GD, GD, GD, GD, DG, _,  _,  _,  _],  # 3
    [ _, _,  _,  DG, GD, GD, YL, YL, GD, GD, GD, GD, DG, _,  _,  _],  # 4
    [ _, _,  _,  DG, GD, YL, NW, YL, GD, GD, GD, GD, DG, _,  _,  _],  # 5 highlight
    [ _, _,  _,  DG, GD, YL, YL, GD, GD, GD, GD, GD, DG, _,  _,  _],  # 6
    [ _, _,  _,  DG, GD, GD, GD, GD, GD, GD, GD, GD, DG, _,  _,  _],  # 7
    [ _, _,  _,  DG, GD, GD, GD, GD, GD, GD, GD, GD, DG, _,  _,  _],  # 8
    [ _, _,  _,  DG, GD, GD, GD, GD, GD, GD, DG, GD, DG, _,  _,  _],  # 9
    [ _, _,  _,  _,  DG, GD, GD, GD, GD, DG, DG, DG, _,  _,  _,  _],  # 10
    [ _, _,  _,  _,  _,  DG, DG, DG, DG, DG, _,  _,  _,  _,  _,  _],  # 11
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 12
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 13
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 14
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]

# Fire hazard tile: 16×16 — lava/fire (opaque, bottom = dark rock with lava cracks)
HAZARD_FIRE = [
    [ _, _,  _,  _,  YL, YL, _,  _,  _,  YL, YL, _,  _,  _,  _,  _],  # 0 flame tips
    [ _, _,  _,  YL, GD, GD, YL, _,  YL, GD, GD, YL, _,  _,  _,  _],  # 1
    [ _, _,  YL, GD, FR, GD, GD, YL, GD, FR, GD, GD, YL, _,  _,  _],  # 2
    [ _, _,  YL, GD, FR, NW, GD, YL, GD, FR, NW, GD, YL, _,  _,  _],  # 3 hot center
    [ _, YL, GD, FR, FR, NW, GD, GD, FR, FR, NW, GD, GD, YL, _,  _],  # 4
    [ _, YL, GD, GD, FR, GD, GD, GD, GD, FR, GD, GD, GD, YL, _,  _],  # 5
    [ YL, GD, GD, GD, GD, GD, GD, GD, GD, GD, GD, GD, GD, GD, YL, _],  # 6
    [ YL, GD, GD, FR, GD, GD, FR, GD, GD, FR, GD, GD, FR, GD, YL, _],  # 7
    [ YL, GD, GD, GD, GD, GD, GD, GD, GD, GD, GD, GD, GD, GD, YL, _],  # 8
    [DK, DK, DK, DK, DK, DK, DK, DK, DK, DK, DK, DK, DK, DK, DK, DK],  # 9 lava rock
    [DK, DK, DB, DK, DK, DB, DK, DK, DK, DB, DK, DK, DB, DK, DK, DK],  # 10
    [DK, DB, DK, DK, DB, DK, DK, DK, DB, DK, DK, DB, DK, DK, DK, DB],  # 11 cracks
    [DB, DK, DK, DK, DK, DK, DB, DK, DK, DK, DK, DK, DK, DB, DK, DK],  # 12
    [DK, DK, DB, DK, DK, DK, DK, DK, DB, DK, DK, DK, DK, DK, DB, DK],  # 13
    [DK, DK, DK, DK, DB, DK, DK, DK, DK, DK, DB, DK, DK, DK, DK, DK],  # 14
    [DB, DK, DK, DK, DK, DK, DB, DK, DK, DK, DK, DK, DB, DK, DK, DK],  # 15
]

# ─── Validate and write ───────────────────────────────────────────────────────

def check(name, pixels, w, h):
    assert len(pixels) == h, f'{name}: expected {h} rows, got {len(pixels)}'
    for i, row in enumerate(pixels):
        assert len(row) == w, f'{name} row {i}: expected {w} cols, got {len(row)}'

check('PLAYER',      PLAYER,      16, 24)
check('ENEMY',       ENEMY,       16, 24)
check('GROUND',      GROUND,      16, 16)
check('XP_ORB',      XP_ORB,      16, 16)
check('HAZARD_FIRE', HAZARD_FIRE, 16, 16)

print('Generating sprites...')

write_png(os.path.join(OUT_DIR, 'char_player_warrior.png'), PLAYER)
write_png(os.path.join(OUT_DIR, 'char_enemy_goblin.png'),   ENEMY)
write_png(os.path.join(OUT_DIR, 'tile_grass_plains.png'),   GROUND)
write_png(os.path.join(OUT_DIR, 'icon_pickup_xp.png'),      XP_ORB)
write_png(os.path.join(OUT_DIR, 'tile_hazard_fire.png'),    HAZARD_FIRE)

print('Done.')
