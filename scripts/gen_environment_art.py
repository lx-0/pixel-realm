#!/usr/bin/env python3
"""
Generate environment art enhancements for PixelRealm (PIX-129).
Uses only Python stdlib (struct + zlib) — no PIL required.

Outputs:
  1. Animated water tiles — 4-frame animation for river, ocean, pond, lava (16×16 each)
  2. Animated foliage tiles — 3-frame sway for grass, bush, tree canopy (16×16 each)
  3. Parallax background layers — 2-3 layers per zone (320×180 each)
  4. Boss phase sprites — 2 phase variants per zone boss (32×32 each)
  5. Zone transition loading screens — art for each zone (320×180 each)

All colors drawn from the 32-color master palette.
"""

import struct
import zlib
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'assets')

# ─── Palette (RGBA) — master 32-color palette ────────────────────────────────
_ = (0, 0, 0, 0)  # transparent

# Neutrals
BK = (13,  13,  13,  255)   # #0d0d0d shadow black
DK = (43,  43,  43,  255)   # #2b2b2b dark rock
ST = (74,  74,  74,  255)   # #4a4a4a stone gray
MG = (110, 110, 110, 255)   # #6e6e6e mid gray
LT = (150, 150, 150, 255)   # #969696 light stone
PG = (200, 200, 200, 255)   # #c8c8c8 pale gray
NW = (240, 240, 240, 255)   # #f0f0f0 near white

# Warm earth
DS = (59,  32,  16,  255)   # #3b2010 deep soil
RE = (107, 58,  31,  255)   # #6b3a1f rich earth
DT = (139, 92,  42,  255)   # #8b5c2a dirt
SN = (184, 132, 63,  255)   # #b8843f sand
DG = (212, 168, 90,  255)   # #d4a85a desert gold
PS = (232, 208, 138, 255)   # #e8d08a pale sand

# Greens
DF = (26,  58,  26,  255)   # #1a3a1a deep forest
FG = (45,  110, 45,  255)   # #2d6e2d forest green
LG = (76,  155, 76,  255)   # #4c9b4c leaf green
BG = (120, 200, 120, 255)   # #78c878 bright grass
FL = (168, 228, 160, 255)   # #a8e4a0 light foliage

# Cyan / Blue
DO = (10,  26,  58,  255)   # #0a1a3a deep ocean
OB = (26,  74,  138, 255)   # #1a4a8a ocean blue
SB = (42,  122, 192, 255)   # #2a7ac0 sky blue
PB = (80,  168, 232, 255)   # #50a8e8 player blue
IB = (144, 208, 248, 255)   # #90d0f8 ice/pale water
HB = (200, 240, 255, 255)   # #c8f0ff highlight

# Red / Orange
DB = (90,  10,  10,  255)   # #5a0a0a deep blood
ER = (160, 16,  16,  255)   # #a01010 enemy red
BR = (212, 32,  32,  255)   # #d42020 bright red
FR = (240, 96,  32,  255)   # #f06020 fire orange
EM = (248, 160, 96,  255)   # #f8a060 ember

# Yellow / Gold
YDG = (168, 112, 0,   255)  # #a87000 dark gold
YG  = (232, 184, 0,   255)  # #e8b800 gold
YB  = (255, 224, 64,  255)  # #ffe040 bright yellow
YP  = (255, 248, 160, 255)  # #fff8a0 pale highlight

# Purple / Magic
PM = (26,  10,  58,  255)   # #1a0a3a deep magic
MP = (90,  32,  160, 255)   # #5a20a0 magic purple
MV = (144, 80,  224, 255)   # #9050e0 mana violet
SG = (208, 144, 255, 255)   # #d090ff spell glow


def alpha(color, a):
    """Return palette color with modified alpha."""
    return (color[0], color[1], color[2], a)


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


def blank(w, h, color=_):
    """Create a blank pixel grid."""
    return [[color] * w for _ in range(h)]


def hstack(grids):
    """Horizontally stack pixel grids."""
    return [sum((row for row in rows), []) for rows in zip(*grids)]


def vstack(grids):
    """Vertically stack pixel grids."""
    result = []
    for g in grids:
        result.extend(g)
    return result


def check(name, pixels, w, h):
    assert len(pixels) == h, f'{name}: expected {h} rows, got {len(pixels)}'
    for i, row in enumerate(pixels):
        assert len(row) == w, f'{name} row {i}: expected {w} cols, got {len(row)}'


# ═══════════════════════════════════════════════════════════════════════════════
# 1. ANIMATED WATER TILES — 4 frames each, 16×16, for river, ocean, pond, lava
# ═══════════════════════════════════════════════════════════════════════════════

def gen_water_tiles():
    out = os.path.join(BASE, 'tiles', 'animated')
    os.makedirs(out, exist_ok=True)

    # --- River water (blues with gentle wave) ---
    W1 = OB   # deep water body
    W2 = SB   # mid water
    W3 = PB   # surface highlight
    W4 = IB   # foam/crest

    river_f1 = [
        [W1, W1, W2, W2, W3, W3, W2, W2, W1, W1, W2, W2, W3, W3, W2, W1],
        [W1, W2, W2, W3, W3, W4, W3, W2, W2, W2, W3, W3, W4, W3, W2, W1],
        [W2, W2, W3, W3, W4, W4, W3, W3, W2, W3, W3, W4, W4, W3, W2, W2],
        [W2, W3, W3, W2, W3, W3, W2, W2, W3, W3, W2, W3, W3, W2, W2, W2],
        [W1, W2, W2, W1, W2, W2, W1, W1, W2, W2, W1, W2, W2, W1, W1, W1],
        [W1, W1, W1, W1, W1, W1, W1, W2, W1, W1, W1, W1, W1, W1, W2, W1],
        [W1, W1, W2, W2, W1, W1, W2, W2, W1, W1, W2, W1, W1, W2, W2, W1],
        [W1, W2, W2, W3, W2, W2, W3, W3, W2, W1, W2, W2, W2, W3, W3, W2],
        [W2, W2, W3, W3, W3, W3, W3, W2, W2, W2, W2, W3, W3, W3, W2, W2],
        [W2, W3, W3, W4, W3, W3, W2, W2, W3, W3, W3, W3, W4, W3, W2, W2],
        [W2, W2, W3, W3, W2, W2, W1, W2, W3, W3, W2, W3, W3, W2, W1, W2],
        [W1, W2, W2, W2, W1, W1, W1, W1, W2, W2, W1, W2, W2, W1, W1, W1],
        [W1, W1, W1, W1, W1, W1, W2, W1, W1, W1, W1, W1, W1, W1, W2, W1],
        [W1, W1, W2, W1, W1, W2, W2, W2, W1, W1, W2, W1, W1, W2, W2, W1],
        [W1, W2, W2, W2, W2, W3, W3, W2, W2, W2, W2, W2, W2, W3, W2, W1],
        [W2, W2, W3, W3, W3, W3, W2, W2, W2, W3, W3, W3, W3, W2, W2, W2],
    ]
    # Frame 2: wave shifted right by 2
    river_f2 = [row[-2:] + row[:-2] for row in river_f1]
    # Frame 3: wave shifted right by 4
    river_f3 = [row[-4:] + row[:-4] for row in river_f1]
    # Frame 4: wave shifted right by 6
    river_f4 = [row[-6:] + row[:-6] for row in river_f1]

    for i, frame in enumerate([river_f1, river_f2, river_f3, river_f4], 1):
        check(f'river_f{i}', frame, 16, 16)
        write_png(os.path.join(out, f'tile_water_river_{i:02d}.png'), frame)

    # --- Ocean water (deeper blues, larger swells) ---
    O1 = DO   # deep
    O2 = OB   # mid
    O3 = SB   # surface
    O4 = PB   # crest
    O5 = IB   # foam

    ocean_f1 = [
        [O1, O1, O1, O2, O2, O2, O3, O3, O2, O2, O1, O1, O1, O2, O2, O1],
        [O1, O1, O2, O2, O3, O3, O3, O4, O3, O2, O2, O1, O2, O2, O3, O2],
        [O1, O2, O2, O3, O3, O4, O4, O5, O4, O3, O2, O2, O3, O3, O4, O3],
        [O2, O2, O3, O3, O4, O4, O5, O4, O4, O3, O3, O3, O3, O4, O4, O3],
        [O2, O3, O3, O3, O3, O3, O4, O3, O3, O3, O3, O3, O3, O3, O3, O2],
        [O1, O2, O2, O2, O2, O2, O3, O2, O2, O2, O2, O2, O2, O2, O2, O2],
        [O1, O1, O1, O1, O2, O2, O2, O1, O1, O1, O1, O2, O1, O1, O1, O1],
        [O1, O1, O1, O2, O2, O1, O1, O1, O1, O1, O2, O2, O1, O1, O1, O1],
        [O1, O1, O2, O2, O3, O2, O1, O1, O1, O2, O2, O3, O2, O1, O1, O1],
        [O1, O2, O2, O3, O3, O3, O2, O1, O2, O2, O3, O3, O3, O2, O1, O1],
        [O2, O2, O3, O3, O4, O4, O3, O2, O2, O3, O3, O4, O4, O3, O2, O1],
        [O2, O3, O3, O4, O4, O5, O4, O3, O3, O3, O4, O4, O5, O4, O3, O2],
        [O2, O3, O3, O3, O4, O4, O3, O3, O3, O3, O3, O4, O4, O3, O3, O2],
        [O1, O2, O2, O2, O3, O3, O2, O2, O2, O2, O2, O3, O3, O2, O2, O1],
        [O1, O1, O1, O2, O2, O2, O1, O1, O1, O1, O2, O2, O2, O1, O1, O1],
        [O1, O1, O1, O1, O1, O1, O1, O1, O1, O1, O1, O1, O1, O1, O1, O1],
    ]
    ocean_f2 = [row[-4:] + row[:-4] for row in ocean_f1]
    ocean_f3 = [row[-8:] + row[:-8] for row in ocean_f1]
    ocean_f4 = [row[-12:] + row[:-12] for row in ocean_f1]

    for i, frame in enumerate([ocean_f1, ocean_f2, ocean_f3, ocean_f4], 1):
        check(f'ocean_f{i}', frame, 16, 16)
        write_png(os.path.join(out, f'tile_water_ocean_{i:02d}.png'), frame)

    # --- Pond water (calm, lighter, subtle ripple) ---
    P1 = OB   # base
    P2 = SB   # mid
    P3 = PB   # highlight
    P4 = IB   # shimmer

    pond_f1 = [
        [P1, P1, P1, P1, P1, P1, P2, P1, P1, P1, P1, P1, P1, P1, P2, P1],
        [P1, P1, P1, P2, P2, P2, P2, P2, P1, P1, P1, P2, P2, P2, P2, P1],
        [P1, P1, P2, P2, P3, P3, P3, P2, P2, P1, P2, P2, P3, P3, P2, P1],
        [P1, P2, P2, P3, P3, P4, P3, P3, P2, P2, P2, P3, P3, P4, P3, P2],
        [P1, P2, P3, P3, P4, P4, P4, P3, P3, P2, P3, P3, P4, P4, P3, P2],
        [P1, P2, P2, P3, P3, P4, P3, P3, P2, P2, P2, P3, P3, P3, P2, P1],
        [P1, P1, P2, P2, P3, P3, P2, P2, P1, P1, P2, P2, P3, P2, P2, P1],
        [P1, P1, P1, P2, P2, P2, P1, P1, P1, P1, P1, P2, P2, P1, P1, P1],
        [P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1],
        [P1, P1, P1, P1, P1, P1, P1, P2, P1, P1, P1, P1, P1, P1, P1, P1],
        [P1, P1, P2, P1, P1, P1, P2, P2, P2, P1, P1, P1, P1, P2, P1, P1],
        [P1, P2, P2, P2, P1, P2, P2, P3, P2, P2, P1, P1, P2, P2, P2, P1],
        [P1, P2, P3, P2, P2, P2, P3, P3, P3, P2, P2, P2, P2, P3, P2, P1],
        [P1, P2, P2, P2, P1, P2, P2, P3, P2, P2, P1, P1, P2, P2, P2, P1],
        [P1, P1, P2, P1, P1, P1, P2, P2, P2, P1, P1, P1, P1, P2, P1, P1],
        [P1, P1, P1, P1, P1, P1, P1, P2, P1, P1, P1, P1, P1, P1, P1, P1],
    ]
    # Gentle radial expansion for each frame
    pond_f2 = [
        [P1, P1, P1, P1, P1, P2, P2, P2, P1, P1, P1, P1, P1, P2, P2, P1],
        [P1, P1, P2, P2, P2, P2, P3, P2, P2, P1, P2, P2, P2, P2, P2, P1],
        [P1, P2, P2, P3, P3, P3, P3, P3, P2, P2, P2, P3, P3, P3, P2, P1],
        [P1, P2, P3, P3, P4, P4, P4, P3, P3, P2, P3, P3, P4, P4, P3, P2],
        [P2, P2, P3, P4, P3, P3, P3, P4, P3, P3, P3, P4, P3, P3, P3, P2],
        [P1, P2, P3, P3, P3, P2, P3, P3, P3, P2, P3, P3, P3, P2, P2, P1],
        [P1, P2, P2, P3, P2, P2, P2, P3, P2, P2, P2, P3, P2, P2, P2, P1],
        [P1, P1, P2, P2, P2, P1, P2, P2, P1, P1, P2, P2, P2, P1, P1, P1],
        [P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1],
        [P1, P1, P1, P1, P1, P1, P1, P1, P2, P1, P1, P1, P1, P1, P1, P1],
        [P1, P2, P2, P1, P1, P1, P1, P2, P2, P2, P1, P1, P2, P2, P1, P1],
        [P2, P2, P3, P2, P1, P1, P2, P2, P3, P2, P2, P2, P2, P3, P2, P1],
        [P2, P3, P3, P3, P2, P2, P3, P3, P3, P3, P2, P2, P3, P3, P3, P2],
        [P2, P2, P3, P2, P1, P1, P2, P2, P3, P2, P2, P2, P2, P3, P2, P1],
        [P1, P2, P2, P1, P1, P1, P1, P2, P2, P2, P1, P1, P2, P2, P1, P1],
        [P1, P1, P1, P1, P1, P1, P1, P1, P2, P1, P1, P1, P1, P1, P1, P1],
    ]
    pond_f3 = [
        [P1, P1, P2, P2, P2, P2, P2, P2, P2, P1, P1, P2, P2, P2, P2, P1],
        [P1, P2, P2, P3, P3, P3, P3, P3, P2, P2, P2, P3, P3, P3, P2, P1],
        [P2, P2, P3, P3, P4, P4, P4, P3, P3, P2, P3, P3, P4, P4, P3, P2],
        [P2, P3, P3, P4, P3, P3, P3, P4, P3, P3, P3, P4, P3, P3, P3, P2],
        [P2, P3, P4, P3, P2, P2, P3, P3, P4, P3, P4, P3, P2, P2, P3, P2],
        [P2, P3, P3, P3, P2, P1, P2, P3, P3, P3, P3, P3, P2, P1, P2, P1],
        [P1, P2, P3, P2, P2, P1, P2, P2, P3, P2, P2, P3, P2, P2, P2, P1],
        [P1, P2, P2, P2, P1, P1, P1, P2, P2, P1, P2, P2, P2, P1, P1, P1],
        [P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1],
        [P1, P1, P1, P1, P2, P1, P1, P1, P1, P2, P1, P1, P1, P1, P1, P1],
        [P1, P1, P2, P2, P2, P2, P1, P1, P2, P2, P2, P1, P2, P2, P1, P1],
        [P1, P2, P3, P3, P3, P2, P2, P2, P3, P3, P3, P2, P2, P3, P2, P1],
        [P2, P3, P3, P4, P3, P3, P2, P3, P3, P4, P3, P3, P3, P3, P3, P2],
        [P1, P2, P3, P3, P3, P2, P2, P2, P3, P3, P3, P2, P2, P3, P2, P1],
        [P1, P1, P2, P2, P2, P2, P1, P1, P2, P2, P2, P1, P2, P2, P1, P1],
        [P1, P1, P1, P1, P2, P1, P1, P1, P1, P2, P1, P1, P1, P1, P1, P1],
    ]
    pond_f4 = [
        [P1, P2, P2, P3, P3, P3, P3, P3, P2, P2, P2, P3, P3, P3, P2, P1],
        [P2, P2, P3, P3, P4, P4, P4, P3, P3, P2, P3, P3, P4, P3, P3, P2],
        [P2, P3, P3, P4, P3, P3, P3, P4, P3, P3, P3, P4, P3, P3, P3, P2],
        [P2, P3, P4, P3, P2, P2, P3, P3, P4, P3, P4, P3, P2, P2, P3, P2],
        [P2, P3, P3, P2, P1, P1, P2, P3, P3, P3, P3, P2, P1, P1, P2, P2],
        [P2, P2, P3, P2, P1, P1, P1, P2, P3, P2, P3, P2, P1, P1, P2, P1],
        [P1, P2, P2, P2, P1, P1, P1, P2, P2, P2, P2, P2, P1, P1, P1, P1],
        [P1, P1, P2, P1, P1, P1, P1, P1, P2, P1, P1, P2, P1, P1, P1, P1],
        [P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1, P1],
        [P1, P1, P1, P2, P2, P1, P1, P1, P1, P1, P2, P1, P1, P1, P1, P1],
        [P1, P2, P2, P2, P3, P2, P2, P1, P1, P2, P2, P2, P2, P2, P1, P1],
        [P2, P2, P3, P3, P3, P3, P2, P2, P2, P3, P3, P3, P2, P3, P2, P1],
        [P2, P3, P4, P3, P3, P4, P3, P3, P3, P3, P4, P3, P3, P4, P3, P2],
        [P2, P2, P3, P3, P3, P3, P2, P2, P2, P3, P3, P3, P2, P3, P2, P1],
        [P1, P2, P2, P2, P3, P2, P2, P1, P1, P2, P2, P2, P2, P2, P1, P1],
        [P1, P1, P1, P2, P2, P1, P1, P1, P1, P1, P2, P1, P1, P1, P1, P1],
    ]

    for i, frame in enumerate([pond_f1, pond_f2, pond_f3, pond_f4], 1):
        check(f'pond_f{i}', frame, 16, 16)
        write_png(os.path.join(out, f'tile_water_pond_{i:02d}.png'), frame)

    # --- Lava (reds/oranges, glowing, roiling) ---
    L1 = DB   # cooled crust
    L2 = ER   # deep glow
    L3 = BR   # bright lava
    L4 = FR   # surface fire
    L5 = EM   # hot ember highlight
    L6 = YB   # white-hot

    lava_f1 = [
        [L1, L1, L2, L2, L3, L3, L2, L2, L1, L1, L2, L2, L3, L2, L1, L1],
        [L1, L2, L2, L3, L3, L4, L3, L2, L2, L2, L3, L3, L4, L3, L2, L1],
        [L2, L2, L3, L4, L4, L5, L4, L3, L2, L3, L3, L4, L5, L4, L3, L2],
        [L2, L3, L4, L4, L5, L6, L5, L4, L3, L3, L4, L5, L6, L5, L4, L2],
        [L2, L3, L3, L4, L5, L5, L4, L3, L3, L4, L4, L5, L5, L4, L3, L2],
        [L1, L2, L3, L3, L4, L4, L3, L3, L2, L3, L3, L4, L4, L3, L2, L1],
        [L1, L2, L2, L2, L3, L3, L2, L2, L2, L2, L3, L3, L3, L2, L2, L1],
        [L1, L1, L2, L2, L2, L2, L2, L1, L1, L2, L2, L2, L2, L2, L1, L1],
        [L1, L1, L1, L2, L1, L1, L1, L1, L2, L1, L1, L1, L2, L1, L1, L1],
        [L1, L2, L2, L2, L2, L1, L1, L2, L2, L2, L1, L2, L2, L2, L1, L1],
        [L2, L2, L3, L3, L3, L2, L2, L2, L3, L3, L2, L2, L3, L3, L2, L1],
        [L2, L3, L3, L4, L4, L3, L2, L3, L3, L4, L3, L3, L4, L4, L3, L2],
        [L2, L3, L4, L5, L5, L4, L3, L3, L4, L5, L4, L4, L5, L5, L4, L2],
        [L2, L3, L3, L4, L5, L6, L4, L4, L5, L6, L5, L4, L5, L4, L3, L2],
        [L1, L2, L3, L3, L4, L4, L3, L3, L4, L4, L3, L3, L4, L3, L2, L1],
        [L1, L1, L2, L2, L3, L3, L2, L2, L3, L3, L2, L2, L3, L2, L1, L1],
    ]
    lava_f2 = [row[-3:] + row[:-3] for row in lava_f1]
    lava_f3 = [row[-6:] + row[:-6] for row in lava_f1]
    lava_f4 = [row[-9:] + row[:-9] for row in lava_f1]

    for i, frame in enumerate([lava_f1, lava_f2, lava_f3, lava_f4], 1):
        check(f'lava_f{i}', frame, 16, 16)
        write_png(os.path.join(out, f'tile_water_lava_{i:02d}.png'), frame)

    print('  [water tiles] 4 types x 4 frames = 16 tiles')


# ═══════════════════════════════════════════════════════════════════════════════
# 2. ANIMATED FOLIAGE TILES — 3-frame sway for grass, bush, tree canopy
# ═══════════════════════════════════════════════════════════════════════════════

def gen_foliage_tiles():
    out = os.path.join(BASE, 'tiles', 'animated')
    os.makedirs(out, exist_ok=True)

    G1 = DF   # deep shadow
    G2 = FG   # mid green
    G3 = LG   # leaf green
    G4 = BG   # bright highlight
    G5 = FL   # lightest foliage

    # --- Grass tile: short blades swaying ---
    # Frame 1: center position
    grass_f1 = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, G4, _, _, _, _, _, _, _, G4, _, _, _, _],
        [_, _, _, G3, _, _, G4, _, _, _, _, G3, _, G4, _, _],
        [_, G4, _, G3, _, _, G3, _, _, G4, _, G3, _, G3, _, _],
        [_, G3, _, G2, _, _, G3, _, _, G3, _, G2, _, G3, _, _],
        [_, G3, _, G2, _, G4, G2, _, _, G3, _, G2, _, G2, _, _],
        [_, G2, G4, G1, _, G3, G2, _, _, G2, G4, G1, _, G2, _, _],
        [_, G2, G3, G1, _, G3, G1, _, _, G2, G3, G1, _, G1, _, _],
        [G1, G1, G2, G1, G1, G2, G1, G1, G1, G1, G2, G1, G1, G1, G1, G1],
        [G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1],
    ]
    # Frame 2: lean right
    grass_f2 = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, G4, _, _, _, _, _, _, _, G4, _, _, _],
        [_, _, _, _, G3, _, _, G4, _, _, _, _, G3, _, G4, _],
        [_, _, G4, _, G3, _, _, G3, _, _, G4, _, G3, _, G3, _],
        [_, _, G3, _, G2, _, _, G3, _, _, G3, _, G2, _, G3, _],
        [_, _, G3, _, G2, _, G4, G2, _, _, G3, _, G2, _, G2, _],
        [_, _, G2, G4, G1, _, G3, G2, _, _, G2, G4, G1, _, G2, _],
        [_, _, G2, G3, G1, _, G3, G1, _, _, G2, G3, G1, _, G1, _],
        [G1, G1, G1, G2, G1, G1, G2, G1, G1, G1, G1, G2, G1, G1, G1, G1],
        [G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1],
    ]
    # Frame 3: lean left
    grass_f3 = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, G4, _, _, _, _, _, _, _, G4, _, _, _, _, _],
        [_, _, G3, _, _, G4, _, _, _, _, G3, _, G4, _, _, _],
        [G4, _, G3, _, _, G3, _, _, G4, _, G3, _, G3, _, _, _],
        [G3, _, G2, _, _, G3, _, _, G3, _, G2, _, G3, _, _, _],
        [G3, _, G2, _, G4, G2, _, _, G3, _, G2, _, G2, _, _, _],
        [G2, G4, G1, _, G3, G2, _, _, G2, G4, G1, _, G2, _, _, _],
        [G2, G3, G1, _, G3, G1, _, _, G2, G3, G1, _, G1, _, _, _],
        [G1, G2, G1, G1, G2, G1, G1, G1, G1, G2, G1, G1, G1, G1, G1, G1],
        [G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1, G1],
    ]

    for i, frame in enumerate([grass_f1, grass_f2, grass_f3], 1):
        check(f'grass_f{i}', frame, 16, 16)
        write_png(os.path.join(out, f'tile_foliage_grass_{i:02d}.png'), frame)

    # --- Bush tile: rounded shrub swaying ---
    # Frame 1: center
    bush_f1 = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, G4, G5, G4, _, _, _, _, _, _, _],
        [_, _, _, _, _, G3, G4, G5, G4, G3, _, _, _, _, _, _],
        [_, _, _, _, G3, G3, G4, G4, G4, G3, G3, _, _, _, _, _],
        [_, _, _, G2, G3, G4, G5, G4, G4, G3, G3, G2, _, _, _, _],
        [_, _, G2, G2, G3, G3, G4, G5, G4, G3, G3, G2, G2, _, _, _],
        [_, _, G1, G2, G3, G3, G4, G4, G4, G3, G3, G2, G1, _, _, _],
        [_, _, G1, G2, G2, G3, G3, G4, G3, G3, G2, G2, G1, _, _, _],
        [_, _, _, G1, G2, G2, G3, G3, G3, G2, G2, G1, _, _, _, _],
        [_, _, _, G1, G1, G2, G2, G3, G2, G2, G1, G1, _, _, _, _],
        [_, _, _, _, G1, G1, G2, G2, G2, G1, G1, _, _, _, _, _],
        [_, _, _, _, _, G1, G1, G2, G1, G1, _, _, _, _, _, _],
        [_, _, _, _, _, _, G1, G1, G1, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, G1, _, _, _, _, _, _, _, _],
    ]
    # Frame 2: lean right (shift top 1px right)
    bush_f2 = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, G4, G5, G4, _, _, _, _, _, _],
        [_, _, _, _, _, _, G3, G4, G5, G4, G3, _, _, _, _, _],
        [_, _, _, _, _, G3, G3, G4, G4, G4, G3, G3, _, _, _, _],
        [_, _, _, _, G2, G3, G4, G5, G4, G4, G3, G3, G2, _, _, _],
        [_, _, _, G2, G2, G3, G3, G4, G5, G4, G3, G3, G2, _, _, _],
        [_, _, G1, G2, G2, G3, G3, G4, G4, G4, G3, G2, G1, _, _, _],
        [_, _, G1, G2, G2, G3, G3, G4, G3, G3, G2, G2, G1, _, _, _],
        [_, _, _, G1, G2, G2, G3, G3, G3, G2, G2, G1, _, _, _, _],
        [_, _, _, G1, G1, G2, G2, G3, G2, G2, G1, G1, _, _, _, _],
        [_, _, _, _, G1, G1, G2, G2, G2, G1, G1, _, _, _, _, _],
        [_, _, _, _, _, G1, G1, G2, G1, G1, _, _, _, _, _, _],
        [_, _, _, _, _, _, G1, G1, G1, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, G1, _, _, _, _, _, _, _, _],
    ]
    # Frame 3: lean left (shift top 1px left)
    bush_f3 = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, G4, G5, G4, _, _, _, _, _, _, _, _],
        [_, _, _, _, G3, G4, G5, G4, G3, _, _, _, _, _, _, _],
        [_, _, _, G3, G3, G4, G4, G4, G3, G3, _, _, _, _, _, _],
        [_, _, G2, G3, G4, G5, G4, G4, G3, G3, G2, _, _, _, _, _],
        [_, G2, G2, G3, G3, G4, G5, G4, G3, G3, G2, G2, _, _, _, _],
        [_, G1, G2, G3, G3, G4, G4, G4, G3, G3, G2, G1, _, _, _, _],
        [_, G1, G2, G2, G3, G3, G4, G3, G3, G2, G2, G1, _, _, _, _],
        [_, _, G1, G2, G2, G3, G3, G3, G2, G2, G1, _, _, _, _, _],
        [_, _, G1, G1, G2, G2, G3, G2, G2, G1, G1, _, _, _, _, _],
        [_, _, _, G1, G1, G2, G2, G2, G1, G1, _, _, _, _, _, _],
        [_, _, _, _, G1, G1, G2, G1, G1, _, _, _, _, _, _, _],
        [_, _, _, _, _, G1, G1, G1, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, G1, _, _, _, _, _, _, _, _, _],
    ]

    for i, frame in enumerate([bush_f1, bush_f2, bush_f3], 1):
        check(f'bush_f{i}', frame, 16, 16)
        write_png(os.path.join(out, f'tile_foliage_bush_{i:02d}.png'), frame)

    # --- Tree canopy tile (overhead, dappled) ---
    # Frame 1: center
    canopy_f1 = [
        [G1, G2, G2, G3, G3, G4, G4, G3, G3, G4, G4, G3, G3, G2, G2, G1],
        [G2, G2, G3, G3, G4, G4, G5, G4, G4, G5, G4, G4, G3, G3, G2, G2],
        [G2, G3, G3, G4, G4, G5, G5, G5, G4, G5, G5, G4, G4, G3, G3, G2],
        [G3, G3, G4, G4, G5, G5, _, G5, G5, _, G5, G5, G4, G4, G3, G3],
        [G3, G4, G4, G5, G5, _, _, _, G5, _, _, G5, G5, G4, G4, G3],
        [G3, G4, G4, G5, _, _, _, _, _, _, _, _, G5, G4, G4, G3],
        [G2, G3, G4, G4, G5, _, _, _, _, _, _, G5, G4, G4, G3, G2],
        [G2, G3, G3, G4, G5, G5, _, _, _, _, G5, G5, G4, G3, G3, G2],
        [G2, G3, G4, G4, G5, G5, _, _, _, _, G5, G5, G4, G4, G3, G2],
        [G3, G3, G4, G5, G5, _, _, _, _, _, _, G5, G5, G4, G3, G3],
        [G3, G4, G4, G5, _, _, _, _, _, _, _, _, G5, G4, G4, G3],
        [G3, G4, G5, G5, _, _, _, _, _, _, _, _, G5, G5, G4, G3],
        [G2, G3, G4, G5, G5, _, _, _, _, _, _, G5, G5, G4, G3, G2],
        [G2, G3, G3, G4, G5, G5, G5, _, _, G5, G5, G5, G4, G3, G3, G2],
        [G2, G2, G3, G3, G4, G4, G5, G5, G5, G5, G4, G4, G3, G3, G2, G2],
        [G1, G2, G2, G3, G3, G4, G4, G4, G4, G4, G4, G3, G3, G2, G2, G1],
    ]
    # Frame 2: shift light gaps 1px right (dappled light movement)
    canopy_f2 = [row[-1:] + row[:-1] for row in canopy_f1]
    # Frame 3: shift light gaps 1px left
    canopy_f3 = [row[1:] + row[:1] for row in canopy_f1]

    for i, frame in enumerate([canopy_f1, canopy_f2, canopy_f3], 1):
        check(f'canopy_f{i}', frame, 16, 16)
        write_png(os.path.join(out, f'tile_foliage_canopy_{i:02d}.png'), frame)

    print('  [foliage tiles] 3 types x 3 frames = 9 tiles')


# ═══════════════════════════════════════════════════════════════════════════════
# 3. PARALLAX BACKGROUND LAYERS — 2-3 layers per zone (320×180)
# Zones: forest, desert, dungeon, coastal
# ═══════════════════════════════════════════════════════════════════════════════

def gen_parallax_layers():
    out = os.path.join(BASE, 'backgrounds', 'parallax')
    os.makedirs(out, exist_ok=True)

    W = 320
    H = 180

    # Helper: fill a row range with a color
    def fill_rect(pixels, x1, y1, x2, y2, color):
        for y in range(max(0, y1), min(H, y2)):
            for x in range(max(0, x1), min(W, x2)):
                pixels[y][x] = color

    def draw_mountain(pixels, cx, peak_y, base_y, w, c1, c2, c3):
        """Draw a triangular mountain shape."""
        half = w // 2
        for y in range(peak_y, base_y):
            progress = (y - peak_y) / max(1, base_y - peak_y)
            span = int(half * progress)
            for x in range(cx - span, cx + span + 1):
                if 0 <= x < W:
                    dist = abs(x - cx) / max(1, span)
                    if dist < 0.3:
                        pixels[y][x] = c3  # highlight
                    elif dist < 0.6:
                        pixels[y][x] = c2  # mid
                    else:
                        pixels[y][x] = c1  # shadow

    def draw_cloud(pixels, cx, cy, size, color):
        """Draw a simple pixel cloud blob."""
        for dy in range(-size, size + 1):
            for dx in range(-size * 2, size * 2 + 1):
                if dy * dy + (dx * dx) // 4 <= size * size:
                    y, x = cy + dy, cx + dx
                    if 0 <= y < H and 0 <= x < W:
                        pixels[y][x] = color

    # ─── FOREST ZONE ───
    # Layer 1 (far): sky gradient + distant mountains
    forest_far = blank(W, H, SB)
    fill_rect(forest_far, 0, 0, W, 40, PB)         # light sky top
    fill_rect(forest_far, 0, 40, W, 80, SB)         # mid sky
    fill_rect(forest_far, 0, 80, W, H, OB)          # horizon haze
    draw_mountain(forest_far, 60, 50, 130, 100, ST, MG, LT)
    draw_mountain(forest_far, 180, 40, 140, 120, ST, MG, LT)
    draw_mountain(forest_far, 280, 55, 125, 90, ST, MG, LT)
    draw_cloud(forest_far, 50, 25, 4, NW)
    draw_cloud(forest_far, 150, 18, 5, HB)
    draw_cloud(forest_far, 260, 30, 3, NW)
    check('forest_far', forest_far, W, H)
    write_png(os.path.join(out, 'bg_parallax_forest_far.png'), forest_far)

    # Layer 2 (mid): rolling hills with trees
    forest_mid = blank(W, H)
    # Hills
    import math
    for x in range(W):
        hill_y = int(100 + 20 * math.sin(x * 0.02) + 10 * math.sin(x * 0.05 + 1))
        for y in range(hill_y, H):
            if y < hill_y + 3:
                forest_mid[y][x] = LG
            elif y < hill_y + 10:
                forest_mid[y][x] = FG
            else:
                forest_mid[y][x] = DF
    # Simple tree silhouettes on hills
    for tx in range(20, W, 40):
        tree_base = int(100 + 20 * math.sin(tx * 0.02) + 10 * math.sin(tx * 0.05 + 1))
        for dy in range(-15, 0):
            span = max(1, int(6 * (1 - abs(dy + 7) / 8)))
            for dx in range(-span, span + 1):
                x = tx + dx
                y = tree_base + dy
                if 0 <= x < W and 0 <= y < H:
                    forest_mid[y][x] = FG if abs(dx) < span // 2 else DF
        # trunk
        for dy in range(0, 4):
            y = tree_base + dy
            if 0 <= y < H:
                forest_mid[y][tx] = RE
    check('forest_mid', forest_mid, W, H)
    write_png(os.path.join(out, 'bg_parallax_forest_mid.png'), forest_mid)

    # Layer 3 (near): close foliage overlay (sparse leaves)
    forest_near = blank(W, H)
    import random
    rng = random.Random(42)
    for _ in range(60):
        lx = rng.randint(0, W - 6)
        ly = rng.randint(0, 30)
        c = rng.choice([FG, LG, BG, DF])
        for dx in range(rng.randint(3, 6)):
            for dy in range(rng.randint(2, 4)):
                if lx + dx < W and ly + dy < H:
                    forest_near[ly + dy][lx + dx] = c
    # Bottom foliage
    for _ in range(40):
        lx = rng.randint(0, W - 6)
        ly = rng.randint(150, H - 2)
        c = rng.choice([DF, FG, LG])
        for dx in range(rng.randint(3, 8)):
            for dy in range(rng.randint(2, 5)):
                if lx + dx < W and ly + dy < H:
                    forest_near[ly + dy][lx + dx] = c
    check('forest_near', forest_near, W, H)
    write_png(os.path.join(out, 'bg_parallax_forest_near.png'), forest_near)

    # ─── DESERT ZONE ───
    # Layer 1 (far): hazy sky + dunes
    desert_far = blank(W, H, PS)
    fill_rect(desert_far, 0, 0, W, 60, YP)       # bleached sky
    fill_rect(desert_far, 0, 60, W, 90, DG)       # haze
    fill_rect(desert_far, 0, 90, W, H, SN)        # sand base
    # Sun
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            if dx * dx + dy * dy <= 36:
                x, y = 250 + dx, 30 + dy
                if 0 <= x < W and 0 <= y < H:
                    desert_far[y][x] = YB if dx * dx + dy * dy < 16 else YG
    # Distant dunes
    for x in range(W):
        dune_y = int(95 + 15 * math.sin(x * 0.015) + 8 * math.sin(x * 0.04 + 2))
        for y in range(dune_y, min(dune_y + 20, H)):
            desert_far[y][x] = DG if y < dune_y + 3 else SN
    check('desert_far', desert_far, W, H)
    write_png(os.path.join(out, 'bg_parallax_desert_far.png'), desert_far)

    # Layer 2 (mid): closer dunes with cacti silhouettes
    desert_mid = blank(W, H)
    for x in range(W):
        dune_y = int(110 + 25 * math.sin(x * 0.025 + 0.5) + 12 * math.sin(x * 0.06 + 1))
        for y in range(dune_y, H):
            if y < dune_y + 2:
                desert_mid[y][x] = PS
            elif y < dune_y + 8:
                desert_mid[y][x] = DG
            else:
                desert_mid[y][x] = SN
    # Cactus silhouettes
    for cx in [40, 130, 220, 290]:
        base_y = int(110 + 25 * math.sin(cx * 0.025 + 0.5) + 12 * math.sin(cx * 0.06 + 1))
        for dy in range(-18, 0):
            y = base_y + dy
            if 0 <= y < H:
                desert_mid[y][cx] = DT
                desert_mid[y][cx + 1] = DT
        # arms
        arm_y = base_y - 10
        for dx in range(-4, 0):
            if 0 <= arm_y < H and 0 <= cx + dx < W:
                desert_mid[arm_y][cx + dx] = DT
        for dy in range(-3, 0):
            if 0 <= arm_y + dy < H and 0 <= cx - 4 < W:
                desert_mid[arm_y + dy][cx - 4] = DT
        for dx in range(2, 6):
            if 0 <= arm_y - 2 < H and 0 <= cx + dx < W:
                desert_mid[arm_y - 2][cx + dx] = DT
        for dy in range(-4, -1):
            if 0 <= arm_y + dy < H and 0 <= cx + 5 < W:
                desert_mid[arm_y + dy][cx + 5] = DT
    check('desert_mid', desert_mid, W, H)
    write_png(os.path.join(out, 'bg_parallax_desert_mid.png'), desert_mid)

    # ─── DUNGEON ZONE ───
    # Layer 1 (far): deep darkness with stalactites
    dungeon_far = blank(W, H, BK)
    fill_rect(dungeon_far, 0, 0, W, 20, DK)      # ceiling
    # Stalactites
    for sx in range(5, W, 18):
        length = rng.randint(15, 45)
        width = rng.randint(2, 5)
        for dy in range(length):
            span = max(1, int(width * (1 - dy / length)))
            for dx in range(-span, span + 1):
                x = sx + dx
                y = 20 + dy
                if 0 <= x < W and 0 <= y < H:
                    dungeon_far[y][x] = ST if dy < 3 else MG if dy < length // 2 else DK
    # Fog wisps at bottom
    for x in range(W):
        fog_y = int(155 + 5 * math.sin(x * 0.03))
        for y in range(fog_y, H):
            a = max(20, min(80, int(80 * (y - fog_y) / 25)))
            dungeon_far[y][x] = alpha(MG, a)
    check('dungeon_far', dungeon_far, W, H)
    write_png(os.path.join(out, 'bg_parallax_dungeon_far.png'), dungeon_far)

    # Layer 2 (mid): stone pillars and torch glow
    dungeon_mid = blank(W, H)
    # Stone pillars
    for px in [30, 90, 160, 230, 300]:
        fill_rect(dungeon_mid, px - 3, 0, px + 4, H, DK)
        fill_rect(dungeon_mid, px - 2, 0, px + 3, H, ST)
        fill_rect(dungeon_mid, px - 1, 0, px + 2, H, MG)
        # Torch at mid-height
        ty = 80
        for dy in range(-4, 0):
            for dx in range(-1, 2):
                x, y = px + dx, ty + dy
                if 0 <= x < W and 0 <= y < H:
                    dungeon_mid[y][x] = FR if dy > -3 else YB
        # Glow around torch
        for dy in range(-8, 5):
            for dx in range(-6, 7):
                dist2 = dx * dx + dy * dy
                if dist2 < 50 and dist2 > 4:
                    x, y = px + dx, ty + dy
                    if 0 <= x < W and 0 <= y < H and dungeon_mid[y][x] == _:
                        a = max(10, int(60 * (1 - dist2 / 50)))
                        dungeon_mid[y][x] = alpha(FR, a)
    check('dungeon_mid', dungeon_mid, W, H)
    write_png(os.path.join(out, 'bg_parallax_dungeon_mid.png'), dungeon_mid)

    # Layer 3 (near): foreground fog
    dungeon_near = blank(W, H)
    for x in range(W):
        fog_y = int(140 + 10 * math.sin(x * 0.02 + 0.7))
        for y in range(fog_y, H):
            a = min(100, int(100 * (y - fog_y) / 40))
            dungeon_near[y][x] = alpha(ST, a)
    # Top edge stalactite hints
    for sx in range(10, W, 25):
        length = rng.randint(5, 12)
        for dy in range(length):
            x = sx
            y = dy
            if 0 <= x < W and 0 <= y < H:
                dungeon_near[y][x] = alpha(DK, 120)
    check('dungeon_near', dungeon_near, W, H)
    write_png(os.path.join(out, 'bg_parallax_dungeon_near.png'), dungeon_near)

    # ─── COASTAL ZONE ───
    # Layer 1 (far): horizon + distant ocean
    coastal_far = blank(W, H, SB)
    fill_rect(coastal_far, 0, 0, W, 70, PB)       # sky
    fill_rect(coastal_far, 0, 70, W, 75, IB)       # horizon shimmer
    fill_rect(coastal_far, 0, 75, W, 130, OB)      # ocean mid
    fill_rect(coastal_far, 0, 130, W, H, DO)        # deep ocean
    # Clouds
    draw_cloud(coastal_far, 80, 20, 5, NW)
    draw_cloud(coastal_far, 200, 15, 6, HB)
    draw_cloud(coastal_far, 300, 28, 4, NW)
    # Wave line at horizon
    for x in range(W):
        wy = int(74 + 2 * math.sin(x * 0.05))
        if 0 <= wy < H:
            coastal_far[wy][x] = HB
    check('coastal_far', coastal_far, W, H)
    write_png(os.path.join(out, 'bg_parallax_coastal_far.png'), coastal_far)

    # Layer 2 (mid): waves rolling
    coastal_mid = blank(W, H)
    for x in range(W):
        wave_y = int(120 + 8 * math.sin(x * 0.03) + 4 * math.sin(x * 0.07 + 1))
        for y in range(wave_y, H):
            if y < wave_y + 2:
                coastal_mid[y][x] = HB   # foam
            elif y < wave_y + 6:
                coastal_mid[y][x] = IB
            elif y < wave_y + 15:
                coastal_mid[y][x] = SB
            else:
                coastal_mid[y][x] = OB
    check('coastal_mid', coastal_mid, W, H)
    write_png(os.path.join(out, 'bg_parallax_coastal_mid.png'), coastal_mid)

    # Layer 3 (near): beach foreground + spray
    coastal_near = blank(W, H)
    for x in range(W):
        sand_y = int(160 + 3 * math.sin(x * 0.04))
        for y in range(sand_y, H):
            if y < sand_y + 2:
                coastal_near[y][x] = PS
            else:
                coastal_near[y][x] = SN
    # Spray particles
    for _ in range(30):
        sx = rng.randint(0, W - 1)
        sy = rng.randint(145, 162)
        coastal_near[sy][sx] = alpha(HB, 150)
        if sx + 1 < W:
            coastal_near[sy][sx + 1] = alpha(NW, 100)
    check('coastal_near', coastal_near, W, H)
    write_png(os.path.join(out, 'bg_parallax_coastal_near.png'), coastal_near)

    print('  [parallax] 4 zones x 2-3 layers = 11 backgrounds')


# ═══════════════════════════════════════════════════════════════════════════════
# 4. BOSS PHASE SPRITES — 32×32 each, 2 variants per zone boss (phase 2 + 3)
# Bosses: Forest Guardian, Desert Worm, Dungeon Lich, Coastal Kraken
# ═══════════════════════════════════════════════════════════════════════════════

def gen_boss_sprites():
    out = os.path.join(BASE, 'sprites', 'enemies', 'bosses')
    os.makedirs(out, exist_ok=True)

    # Helper to create 32x32 grid
    def b32():
        return [[_] * 32 for _i in range(32)]

    def set_px(grid, x, y, c):
        if 0 <= x < 32 and 0 <= y < 32:
            grid[y][x] = c

    def fill_circle(grid, cx, cy, r, c):
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r:
                    set_px(grid, cx + dx, cy + dy, c)

    def fill_box(grid, x1, y1, x2, y2, c):
        for y in range(y1, y2):
            for x in range(x1, x2):
                set_px(grid, x, y, c)

    # ─── FOREST GUARDIAN ───
    # Phase 2: Damaged/Enraged — cracks, red accents, leaves falling
    fg_p2 = b32()
    # Body (tree trunk shape)
    fill_box(fg_p2, 12, 8, 20, 28, RE)     # trunk
    fill_box(fg_p2, 13, 9, 19, 27, DT)     # inner trunk
    # Crown (damaged foliage)
    fill_circle(fg_p2, 16, 6, 7, FG)
    fill_circle(fg_p2, 16, 6, 5, LG)
    # Damage cracks
    for y in range(10, 24, 3):
        set_px(fg_p2, 14, y, BK)
        set_px(fg_p2, 15, y + 1, BK)
    # Red rage eyes
    set_px(fg_p2, 14, 13, BR)
    set_px(fg_p2, 18, 13, BR)
    set_px(fg_p2, 14, 14, ER)
    set_px(fg_p2, 18, 14, ER)
    # Arms (branches)
    for dx in range(1, 6):
        set_px(fg_p2, 12 - dx, 14 - dx // 2, RE)
        set_px(fg_p2, 20 + dx, 14 - dx // 2, RE)
    # Falling leaves
    for lx, ly in [(5, 3), (26, 5), (3, 10), (28, 12), (7, 18)]:
        set_px(fg_p2, lx, ly, BG)
    # Roots
    for dx in range(-3, 4):
        set_px(fg_p2, 16 + dx, 28, DS)
        set_px(fg_p2, 16 + dx, 29, DS)
    check('fg_p2', fg_p2, 32, 32)
    write_png(os.path.join(out, 'boss_forest_guardian_phase2.png'), fg_p2)

    # Phase 3: Desperate/Glowing — magical aura, root tendrils
    fg_p3 = b32()
    fill_box(fg_p3, 12, 8, 20, 28, DS)     # darkened trunk
    fill_box(fg_p3, 13, 9, 19, 27, RE)
    # Glowing crown
    fill_circle(fg_p3, 16, 6, 8, LG)
    fill_circle(fg_p3, 16, 6, 6, BG)
    fill_circle(fg_p3, 16, 6, 3, FL)        # inner glow
    # Glowing eyes
    set_px(fg_p3, 14, 13, YB)
    set_px(fg_p3, 18, 13, YB)
    set_px(fg_p3, 14, 14, YG)
    set_px(fg_p3, 18, 14, YG)
    # Magic glow aura
    for dy in range(-2, 30):
        for dx in [10, 11, 21, 22]:
            if 0 <= dy < 32:
                set_px(fg_p3, dx, dy, alpha(BG, 80))
    # Root tendrils reaching out
    for rx, ry, d in [(8, 28, -1), (24, 28, 1)]:
        for i in range(8):
            set_px(fg_p3, rx + i * d, ry - i // 2, DF)
            set_px(fg_p3, rx + i * d, ry - i // 2 + 1, DS)
    check('fg_p3', fg_p3, 32, 32)
    write_png(os.path.join(out, 'boss_forest_guardian_phase3.png'), fg_p3)

    # ─── DESERT WORM ───
    # Phase 2: Damaged/Enraged — cracked carapace, exposed muscle
    dw_p2 = b32()
    # Worm body segments
    fill_circle(dw_p2, 16, 10, 8, DT)    # head
    fill_circle(dw_p2, 16, 10, 6, SN)
    # Mandibles
    for dy in range(0, 5):
        set_px(dw_p2, 11 - dy // 2, 4 + dy, DT)
        set_px(dw_p2, 21 + dy // 2, 4 + dy, DT)
    # Rage eyes
    set_px(dw_p2, 13, 9, BR)
    set_px(dw_p2, 14, 9, ER)
    set_px(dw_p2, 18, 9, BR)
    set_px(dw_p2, 19, 9, ER)
    # Cracked carapace
    for cy in range(5, 15, 2):
        set_px(dw_p2, 16, cy, BK)
        set_px(dw_p2, 17, cy + 1, BK)
    # Body segments going down
    fill_circle(dw_p2, 14, 20, 5, DT)
    fill_circle(dw_p2, 14, 20, 3, SN)
    fill_circle(dw_p2, 18, 27, 4, DT)
    fill_circle(dw_p2, 18, 27, 2, SN)
    # Exposed red muscle at cracks
    set_px(dw_p2, 16, 6, BR)
    set_px(dw_p2, 16, 8, BR)
    set_px(dw_p2, 16, 12, BR)
    check('dw_p2', dw_p2, 32, 32)
    write_png(os.path.join(out, 'boss_desert_worm_phase2.png'), dw_p2)

    # Phase 3: Desperate/Glowing — gold energy, sand erupting
    dw_p3 = b32()
    fill_circle(dw_p3, 16, 10, 8, DG)     # golden carapace
    fill_circle(dw_p3, 16, 10, 6, YG)     # inner glow
    # Mandibles with energy
    for dy in range(0, 5):
        set_px(dw_p3, 11 - dy // 2, 4 + dy, YDG)
        set_px(dw_p3, 21 + dy // 2, 4 + dy, YDG)
    # Glowing eyes
    set_px(dw_p3, 13, 9, YB)
    set_px(dw_p3, 14, 9, NW)
    set_px(dw_p3, 18, 9, YB)
    set_px(dw_p3, 19, 9, NW)
    # Energy cracks
    for cy in range(4, 16, 2):
        set_px(dw_p3, 16, cy, YB)
    # Body segments glowing
    fill_circle(dw_p3, 14, 20, 5, DG)
    fill_circle(dw_p3, 14, 20, 3, YG)
    fill_circle(dw_p3, 18, 27, 4, DG)
    fill_circle(dw_p3, 18, 27, 2, YB)
    # Sand eruption particles
    for sx, sy in [(5, 25), (27, 22), (3, 18), (29, 15), (8, 30), (24, 30)]:
        set_px(dw_p3, sx, sy, SN)
        set_px(dw_p3, sx + 1, sy - 1, PS)
    check('dw_p3', dw_p3, 32, 32)
    write_png(os.path.join(out, 'boss_desert_worm_phase3.png'), dw_p3)

    # ─── DUNGEON LICH ───
    # Phase 2: Damaged/Enraged — robes torn, bones showing, purple fire
    dl_p2 = b32()
    # Skull
    fill_circle(dl_p2, 16, 8, 5, PG)
    fill_circle(dl_p2, 16, 8, 4, NW)
    # Eye sockets with purple fire
    set_px(dl_p2, 14, 7, BK)
    set_px(dl_p2, 14, 8, MP)
    set_px(dl_p2, 18, 7, BK)
    set_px(dl_p2, 18, 8, MP)
    # Jaw
    set_px(dl_p2, 15, 11, BK)
    set_px(dl_p2, 16, 12, BK)
    set_px(dl_p2, 17, 11, BK)
    # Torn robes
    fill_box(dl_p2, 11, 13, 21, 28, PM)
    fill_box(dl_p2, 12, 14, 20, 27, MP)
    # Exposed ribs
    for ry in range(15, 21, 2):
        set_px(dl_p2, 14, ry, PG)
        set_px(dl_p2, 18, ry, PG)
    # Staff with cracked crystal
    fill_box(dl_p2, 8, 5, 10, 28, DK)
    set_px(dl_p2, 9, 4, MV)
    set_px(dl_p2, 9, 3, SG)
    set_px(dl_p2, 8, 3, MV)
    # Purple flame particles
    for fx, fy in [(6, 2), (11, 1), (22, 4), (25, 8)]:
        set_px(dl_p2, fx, fy, MV)
        set_px(dl_p2, fx, fy + 1, SG)
    # Tattered robe edges
    for x in range(11, 21):
        if x % 3 != 0:
            set_px(dl_p2, x, 28, PM)
    check('dl_p2', dl_p2, 32, 32)
    write_png(os.path.join(out, 'boss_dungeon_lich_phase2.png'), dl_p2)

    # Phase 3: Desperate/Glowing — full spectral form, magic overflow
    dl_p3 = b32()
    # Spectral skull (glowing)
    fill_circle(dl_p3, 16, 8, 6, alpha(SG, 180))
    fill_circle(dl_p3, 16, 8, 4, alpha(NW, 200))
    # Burning eyes
    set_px(dl_p3, 14, 7, MV)
    set_px(dl_p3, 14, 8, SG)
    set_px(dl_p3, 14, 6, alpha(SG, 150))  # flame up
    set_px(dl_p3, 18, 7, MV)
    set_px(dl_p3, 18, 8, SG)
    set_px(dl_p3, 18, 6, alpha(SG, 150))
    # Spectral robes
    for y in range(13, 30):
        width = 4 + (y - 13) // 2
        for dx in range(-width, width + 1):
            x = 16 + dx
            if 0 <= x < 32 and 0 <= y < 32:
                a = max(60, 200 - abs(dx) * 20)
                dl_p3[y][x] = alpha(MP, a)
    # Floating spell orbs
    for ox, oy, r in [(6, 14, 2), (26, 14, 2), (4, 22, 2), (28, 22, 2)]:
        fill_circle(dl_p3, ox, oy, r, alpha(MV, 180))
        set_px(dl_p3, ox, oy, SG)
    # Staff glowing intensely
    fill_box(dl_p3, 8, 5, 10, 28, alpha(MP, 200))
    fill_circle(dl_p3, 9, 3, 2, SG)
    set_px(dl_p3, 9, 3, NW)
    check('dl_p3', dl_p3, 32, 32)
    write_png(os.path.join(out, 'boss_dungeon_lich_phase3.png'), dl_p3)

    # ─── COASTAL KRAKEN ───
    # Phase 2: Damaged/Enraged — scarred tentacles, red eyes
    ck_p2 = b32()
    # Head (dome shape)
    fill_circle(ck_p2, 16, 10, 8, OB)
    fill_circle(ck_p2, 16, 10, 6, SB)
    # Enraged eyes
    set_px(ck_p2, 13, 9, ER)
    set_px(ck_p2, 14, 9, BR)
    set_px(ck_p2, 18, 9, ER)
    set_px(ck_p2, 19, 9, BR)
    # Beak
    set_px(ck_p2, 16, 14, DK)
    set_px(ck_p2, 15, 15, DK)
    set_px(ck_p2, 17, 15, DK)
    # Tentacles (scarred)
    tentacle_starts = [(10, 18), (14, 18), (18, 18), (22, 18)]
    for tx, ty in tentacle_starts:
        for i in range(12):
            x = tx + (i % 3 - 1)
            y = ty + i
            if 0 <= x < 32 and 0 <= y < 32:
                ck_p2[y][x] = OB if i % 4 < 2 else SB
                # Scars
                if i % 5 == 3:
                    ck_p2[y][x] = BR
    # Battle scars on head
    for sy in range(6, 14, 3):
        set_px(ck_p2, 12, sy, BR)
        set_px(ck_p2, 20, sy, BR)
    check('ck_p2', ck_p2, 32, 32)
    write_png(os.path.join(out, 'boss_coastal_kraken_phase2.png'), ck_p2)

    # Phase 3: Desperate/Glowing — bioluminescent, electric
    ck_p3 = b32()
    # Glowing head
    fill_circle(ck_p3, 16, 10, 9, alpha(OB, 220))
    fill_circle(ck_p3, 16, 10, 7, alpha(SB, 230))
    fill_circle(ck_p3, 16, 10, 4, alpha(PB, 240))
    # Electric eyes
    set_px(ck_p3, 13, 9, IB)
    set_px(ck_p3, 14, 9, HB)
    set_px(ck_p3, 18, 9, IB)
    set_px(ck_p3, 19, 9, HB)
    # Beak
    set_px(ck_p3, 16, 14, DK)
    set_px(ck_p3, 15, 15, DK)
    set_px(ck_p3, 17, 15, DK)
    # Bioluminescent tentacles
    for tx, ty in tentacle_starts:
        for i in range(12):
            x = tx + (i % 3 - 1)
            y = ty + i
            if 0 <= x < 32 and 0 <= y < 32:
                if i % 3 == 0:
                    ck_p3[y][x] = IB    # glow spots
                else:
                    ck_p3[y][x] = alpha(SB, 200)
    # Electric arcs
    for ax, ay in [(6, 8), (26, 8), (4, 16), (28, 16), (8, 26), (24, 26)]:
        set_px(ck_p3, ax, ay, HB)
        if ax + 1 < 32:
            set_px(ck_p3, ax + 1, ay, IB)
    check('ck_p3', ck_p3, 32, 32)
    write_png(os.path.join(out, 'boss_coastal_kraken_phase3.png'), ck_p3)

    print('  [boss sprites] 4 bosses x 2 phases = 8 sprites')


# ═══════════════════════════════════════════════════════════════════════════════
# 5. ZONE TRANSITION LOADING SCREENS — 320×180 each
# ═══════════════════════════════════════════════════════════════════════════════

def gen_loading_screens():
    out = os.path.join(BASE, 'backgrounds', 'loading')
    os.makedirs(out, exist_ok=True)

    import math
    import random
    rng = random.Random(129)  # deterministic

    W = 320
    H = 180

    def fill_rect(pixels, x1, y1, x2, y2, color):
        for y in range(max(0, y1), min(H, y2)):
            for x in range(max(0, x1), min(W, x2)):
                pixels[y][x] = color

    # Simple bitmap font for zone names (5x7 uppercase)
    FONT = {
        'F': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
        'O': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        'R': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
        'E': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
        'S': [[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
        'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
        'D': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
        'N': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        'G': [[0,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        'U': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        'C': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,1],[0,1,1,1,0]],
        'A': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        'L': [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
        ' ': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
        'I': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
        'H': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        'K': [[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
        'B': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
        'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        'P': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
        'W': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
        'V': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0]],
        'X': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
        'Y': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
        'Z': [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
    }

    def draw_text(pixels, text, start_x, start_y, color, scale=2):
        """Draw text using bitmap font at given scale."""
        cx = start_x
        for ch in text.upper():
            glyph = FONT.get(ch, FONT[' '])
            for gy, row in enumerate(glyph):
                for gx, px in enumerate(row):
                    if px:
                        for sy in range(scale):
                            for sx in range(scale):
                                x = cx + gx * scale + sx
                                y = start_y + gy * scale + sy
                                if 0 <= x < W and 0 <= y < H:
                                    pixels[y][x] = color
            cx += (len(glyph[0]) + 1) * scale

    def text_width(text, scale=2):
        return len(text) * 6 * scale - scale

    # ─── FOREST loading screen ───
    forest_ls = blank(W, H, DF)
    # Sky gradient at top
    for y in range(60):
        t = y / 60
        r = int(42 + (26 - 42) * t)
        g = int(122 + (58 - 122) * t)
        b = int(192 + (26 - 192) * t)
        for x in range(W):
            forest_ls[y][x] = (r, g, b, 255)
    # Tree line
    for x in range(W):
        tree_h = int(50 + 12 * math.sin(x * 0.04) + 6 * math.sin(x * 0.09 + 1))
        for y in range(tree_h, H):
            if y < tree_h + 5:
                forest_ls[y][x] = LG
            elif y < tree_h + 20:
                forest_ls[y][x] = FG
            else:
                forest_ls[y][x] = DF
    # Decorative trees
    for tx in range(30, W, 50):
        base = int(50 + 12 * math.sin(tx * 0.04) + 6 * math.sin(tx * 0.09 + 1))
        for dy in range(-20, -3):
            span = max(1, int(8 * (1 - abs(dy + 10) / 10)))
            for dx in range(-span, span + 1):
                x, y = tx + dx, base + dy
                if 0 <= x < W and 0 <= y < H:
                    forest_ls[y][x] = BG if abs(dx) < span // 2 else LG
    # Ground details
    for _ in range(40):
        gx, gy = rng.randint(0, W - 1), rng.randint(130, H - 1)
        forest_ls[gy][gx] = rng.choice([RE, DT, DS])
    # Zone name
    title = "FOREST"
    tw = text_width(title, 3)
    draw_text(forest_ls, title, (W - tw) // 2, 80, NW, 3)
    # Subtitle
    sub = "THE VERDANT REALM"
    sw = text_width(sub, 1)
    draw_text(forest_ls, sub, (W - sw) // 2, 106, FL, 1)
    # Border frame
    for x in range(W):
        forest_ls[0][x] = FG
        forest_ls[1][x] = FG
        forest_ls[H - 1][x] = FG
        forest_ls[H - 2][x] = FG
    for y in range(H):
        forest_ls[y][0] = FG
        forest_ls[y][1] = FG
        forest_ls[y][W - 1] = FG
        forest_ls[y][W - 2] = FG
    check('forest_ls', forest_ls, W, H)
    write_png(os.path.join(out, 'bg_loading_forest.png'), forest_ls)

    # ─── DESERT loading screen ───
    desert_ls = blank(W, H, SN)
    for y in range(H):
        t = y / H
        r = int(255 - (255 - 184) * t)
        g = int(248 - (248 - 132) * t)
        b = int(160 - (160 - 63) * t)
        for x in range(W):
            desert_ls[y][x] = (r, g, b, 255)
    # Sun
    for dy in range(-8, 9):
        for dx in range(-8, 9):
            if dx * dx + dy * dy <= 64:
                x, y = 260 + dx, 30 + dy
                if 0 <= x < W and 0 <= y < H:
                    desert_ls[y][x] = YB if dx * dx + dy * dy < 25 else YG
    # Dunes
    for x in range(W):
        dune_y = int(120 + 20 * math.sin(x * 0.02) + 10 * math.sin(x * 0.05 + 0.5))
        for y in range(dune_y, H):
            if y < dune_y + 3:
                desert_ls[y][x] = PS
            else:
                desert_ls[y][x] = DG
    # Sand particles
    for _ in range(50):
        px, py = rng.randint(0, W - 1), rng.randint(20, 100)
        desert_ls[py][px] = PS
    title = "DESERT"
    tw = text_width(title, 3)
    draw_text(desert_ls, title, (W - tw) // 2, 70, BK, 3)
    sub = "THE BURNING SANDS"
    sw = text_width(sub, 1)
    draw_text(desert_ls, sub, (W - sw) // 2, 96, DS, 1)
    for x in range(W):
        desert_ls[0][x] = DG
        desert_ls[1][x] = DG
        desert_ls[H - 1][x] = DG
        desert_ls[H - 2][x] = DG
    for y in range(H):
        desert_ls[y][0] = DG
        desert_ls[y][1] = DG
        desert_ls[y][W - 1] = DG
        desert_ls[y][W - 2] = DG
    check('desert_ls', desert_ls, W, H)
    write_png(os.path.join(out, 'bg_loading_desert.png'), desert_ls)

    # ─── DUNGEON loading screen ───
    dungeon_ls = blank(W, H, BK)
    # Dark gradient
    for y in range(H):
        v = int(13 + 30 * (1 - abs(y - 90) / 90))
        for x in range(W):
            dungeon_ls[y][x] = (v, v, v, 255)
    # Stone arches
    for ax in [80, 160, 240]:
        for dy in range(-30, 50):
            for dx in range(-20, 21):
                y = 60 + dy
                x = ax + dx
                if 0 <= x < W and 0 <= y < H:
                    if abs(dx) >= 18 and dy > -10:
                        dungeon_ls[y][x] = ST  # pillars
                    elif dy < 0 and dx * dx + (dy + 10) * (dy + 10) < 400:
                        dungeon_ls[y][x] = DK  # arch
    # Torch glow
    for tx in [80, 160, 240]:
        for dy in range(-6, 3):
            for dx in range(-4, 5):
                x, y = tx, 55
                px, py = x + dx, y + dy
                d2 = dx * dx + dy * dy
                if 0 <= px < W and 0 <= py < H and d2 < 30:
                    if d2 < 4:
                        dungeon_ls[py][px] = YB
                    elif d2 < 12:
                        dungeon_ls[py][px] = FR
                    else:
                        dungeon_ls[py][px] = alpha(FR, 100)
    title = "DUNGEON"
    tw = text_width(title, 3)
    draw_text(dungeon_ls, title, (W - tw) // 2, 100, SG, 3)
    sub = "THE DEPTHS BELOW"
    sw = text_width(sub, 1)
    draw_text(dungeon_ls, sub, (W - sw) // 2, 126, MV, 1)
    for x in range(W):
        dungeon_ls[0][x] = ST
        dungeon_ls[1][x] = DK
        dungeon_ls[H - 1][x] = ST
        dungeon_ls[H - 2][x] = DK
    for y in range(H):
        dungeon_ls[y][0] = ST
        dungeon_ls[y][1] = DK
        dungeon_ls[y][W - 1] = ST
        dungeon_ls[y][W - 2] = DK
    check('dungeon_ls', dungeon_ls, W, H)
    write_png(os.path.join(out, 'bg_loading_dungeon.png'), dungeon_ls)

    # ─── COASTAL loading screen ───
    coastal_ls = blank(W, H, OB)
    # Sky
    for y in range(70):
        t = y / 70
        r = int(80 + (42 - 80) * t)
        g = int(168 + (122 - 168) * t)
        b = int(232 + (192 - 232) * t)
        for x in range(W):
            coastal_ls[y][x] = (r, g, b, 255)
    # Ocean
    for y in range(70, H):
        t = (y - 70) / (H - 70)
        for x in range(W):
            wave = int(3 * math.sin(x * 0.06 + y * 0.1))
            if y == 70 + wave:
                coastal_ls[y][x] = HB
            elif t < 0.3:
                coastal_ls[y][x] = SB
            elif t < 0.6:
                coastal_ls[y][x] = OB
            else:
                coastal_ls[y][x] = DO
    # Clouds
    for cx, cy, sz in [(60, 15, 5), (180, 20, 6), (290, 12, 4)]:
        for dy in range(-sz, sz + 1):
            for dx in range(-sz * 2, sz * 2 + 1):
                if dy * dy + (dx * dx) // 4 <= sz * sz:
                    x, y = cx + dx, cy + dy
                    if 0 <= x < W and 0 <= y < H:
                        coastal_ls[y][x] = NW if dy < 0 else HB
    # Wave foam
    for x in range(W):
        fy = int(72 + 3 * math.sin(x * 0.08))
        if 0 <= fy < H:
            coastal_ls[fy][x] = HB
    title = "COAST"
    tw = text_width(title, 3)
    draw_text(coastal_ls, title, (W - tw) // 2, 85, NW, 3)
    sub = "THE ENDLESS SHORE"
    sw = text_width(sub, 1)
    draw_text(coastal_ls, sub, (W - sw) // 2, 111, IB, 1)
    for x in range(W):
        coastal_ls[0][x] = SB
        coastal_ls[1][x] = OB
        coastal_ls[H - 1][x] = SB
        coastal_ls[H - 2][x] = OB
    for y in range(H):
        coastal_ls[y][0] = SB
        coastal_ls[y][1] = OB
        coastal_ls[y][W - 1] = SB
        coastal_ls[y][W - 2] = OB
    check('coastal_ls', coastal_ls, W, H)
    write_png(os.path.join(out, 'bg_loading_coastal.png'), coastal_ls)

    print('  [loading screens] 4 zone loading screens')


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print('PIX-129: Generating environment art...\n')
    gen_water_tiles()
    print()
    gen_foliage_tiles()
    print()
    gen_parallax_layers()
    print()
    gen_boss_sprites()
    print()
    gen_loading_screens()
    print('\nDone! All environment art assets generated.')
