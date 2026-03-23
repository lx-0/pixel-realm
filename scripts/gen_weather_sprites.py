#!/usr/bin/env python3
"""
Generate weather particle art for PixelRealm weather system (PIX-91).
Uses only Python stdlib (struct + zlib) — no PIL required.

Outputs follow the art style guide (docs/ART-STYLE-GUIDE.md):
  - 16×16 particle sprites for rain, snow, sandstorm
  - 16×16 fog overlay tile (seamless, semi-transparent)
  - 16×16 storm/lightning flash overlay (2 frames)
  - 16×16 weather transition vignette overlays

All colors drawn from the 32-color master palette.
"""

import struct
import zlib
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sprites', 'weather')
os.makedirs(OUT_DIR, exist_ok=True)

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

# Cyan / Blue
DO = (10,  26,  58,  255)   # #0a1a3a deep ocean
OB = (26,  74,  138, 255)   # #1a4a8a ocean blue
SB = (42,  122, 192, 255)   # #2a7ac0 sky blue
PB = (80,  168, 232, 255)   # #50a8e8 player/friendly
IB = (144, 208, 248, 255)   # #90d0f8 ice/pale water
HB = (200, 240, 255, 255)   # #c8f0ff highlight/shimmer

# Yellow / Gold
YDG = (168, 112, 0,   255)  # #a87000 dark gold
YG  = (232, 184, 0,   255)  # #e8b800 gold
YB  = (255, 224, 64,  255)  # #ffe040 bright yellow
YP  = (255, 248, 160, 255)  # #fff8a0 pale highlight

# ─── Semi-transparent palette variants (for weather overlays) ─────────────────
# Using palette colors at reduced alpha for translucency

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
        raw_rows += b'\x00'  # filter byte: None
        for r, g, b, a in row:
            raw_rows += bytes([r, g, b, a])

    compressed = zlib.compress(raw_rows, 9)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(_make_chunk(b'IHDR', ihdr_data))
        f.write(_make_chunk(b'IDAT', compressed))
        f.write(_make_chunk(b'IEND', b''))

    print(f'  wrote {path}  ({width}x{height})')


def check(name, pixels, w, h):
    assert len(pixels) == h, f'{name}: expected {h} rows, got {len(pixels)}'
    for i, row in enumerate(pixels):
        assert len(row) == w, f'{name} row {i}: expected {w} cols, got {len(row)}'


# ═══════════════════════════════════════════════════════════════════════════════
# RAIN PARTICLES — 3 animation frames, translucent elongated drops
# Colors: ice blue (#90d0f8), player blue (#50a8e8), highlight (#c8f0ff)
# ═══════════════════════════════════════════════════════════════════════════════

# Semi-transparent rain colors
R1 = alpha(IB, 200)   # main raindrop body
R2 = alpha(PB, 180)   # raindrop shadow/trail
R3 = alpha(HB, 220)   # raindrop highlight tip

# Frame 1: Two raindrops at top-left and mid-right positions
RAIN_01 = [
    [_,  _,  _,  R3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  R1, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  R1, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  R2, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  R3, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  R1, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  R1, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  R2, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# Frame 2: Drops shifted down ~5px (mid-fall)
RAIN_02 = [
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  R3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  R1, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  R1, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  R2, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  R3, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  R1, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  R1, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  R2, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# Frame 3: Drops at bottom, one starting to splash
RAIN_03 = [
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  R3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  R1, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  R1, _,  _,  _,  _,  _,  _,  _,  R3, _,  _,  _,  _],
    [_,  _,  _,  R2, _,  _,  _,  _,  _,  _,  _,  R1, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  R2, R1, R2, _,  _,  _],
    [_,  _,  R2, _,  R2, _,  _,  _,  _,  _,  _,  R2, _,  _,  _,  _],
]

# ═══════════════════════════════════════════════════════════════════════════════
# SNOW PARTICLES — 4 varied snowflake shapes, subtle and soft
# Colors: near white (#f0f0f0), pale gray (#c8c8c8), highlight/shimmer (#c8f0ff)
# ═══════════════════════════════════════════════════════════════════════════════

S1 = alpha(NW, 210)   # bright flake center
S2 = alpha(PG, 180)   # flake body
S3 = alpha(HB, 190)   # shimmer accent

# Shape 1: Small dot flake (simple)
SNOW_01 = [
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  S2, _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  S2, S1, S2, _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  S2, _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  S2, _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  S2, S1, S2, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  S2, _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# Shape 2: Cross/star flake
SNOW_02 = [
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  S2, _,  S3, _,  S2, _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  S2, S1, S2, _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  S3, S1, S1, S1, S3, _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  S2, S1, S2, _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  S2, _,  S3, _,  S2, _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  S1, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# Shape 3: Diamond flake
SNOW_03 = [
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  S2, _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  S2, S1, S2, _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  S2, S1, S3, S1, S2, _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  S2, S1, S2, _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  S2, _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  S2, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  S2, S1, S2, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  S2, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# Shape 4: Tiny scattered dots (drift feel)
SNOW_04 = [
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  S1, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  S2, _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  S1, _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  S3, _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  S2, _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# ═══════════════════════════════════════════════════════════════════════════════
# FOG OVERLAY TILE — seamless 16×16, semi-transparent gray/white wisps
# Colors: pale gray (#c8c8c8), near white (#f0f0f0), mid gray (#6e6e6e)
# Designed to tile seamlessly — left/right and top/bottom edges match
# ═══════════════════════════════════════════════════════════════════════════════

F1 = alpha(NW, 50)    # light fog wisp
F2 = alpha(PG, 40)    # medium fog body
F3 = alpha(MG, 30)    # subtle fog shadow
F4 = alpha(NW, 65)    # bright fog patch

FOG_TILE = [
    [F2, F2, F1, _,  _,  _,  _,  _,  _,  F3, F2, F2, F1, F1, F2, F2],
    [F1, F2, F2, F1, _,  _,  _,  _,  F3, F2, F2, F1, F4, F2, F1, F1],
    [_,  F1, F2, F2, F1, _,  _,  _,  F2, F4, F1, _,  F2, F2, _,  _],
    [_,  _,  F1, F2, F2, F1, _,  F3, F2, F2, _,  _,  F1, _,  _,  _],
    [_,  _,  _,  F1, F2, F2, F1, F2, F4, F1, _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  F1, F2, F2, F2, F1, _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  F1, F4, F1, _,  _,  _,  _,  _,  _,  F3, _],
    [_,  _,  _,  _,  _,  _,  F1, _,  _,  _,  _,  _,  _,  F3, F2, F3],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  F3, F2, F4, F2],
    [F1, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  F3, F2, F2, F2, F1],
    [F2, F1, _,  _,  _,  _,  _,  _,  _,  _,  F3, F2, F1, F1, _,  _],
    [F2, F2, F1, _,  _,  _,  _,  F3, _,  F3, F2, F1, _,  _,  _,  _],
    [F4, F2, F2, F1, _,  _,  F3, F2, F3, F2, F1, _,  _,  _,  _,  _],
    [F2, F1, F2, F2, F1, F3, F2, F4, F2, F1, _,  _,  _,  _,  _,  F3],
    [F1, _,  F1, F2, F2, F2, F2, F2, F1, _,  _,  _,  _,  _,  F3, F2],
    [_,  _,  _,  F1, F2, F4, F1, F1, _,  _,  _,  _,  _,  F3, F2, F2],
]

# ═══════════════════════════════════════════════════════════════════════════════
# SANDSTORM PARTICLES — 3 animation frames, tan/ochre wind-blown dust
# Colors: sand (#b8843f), desert gold (#d4a85a), pale sand (#e8d08a)
# Horizontal streaks to convey wind direction
# ═══════════════════════════════════════════════════════════════════════════════

D1 = alpha(SN, 190)   # main dust body
D2 = alpha(DG, 170)   # lighter dust
D3 = alpha(PS, 150)   # pale dust highlight
D4 = alpha(DT, 140)   # darker dirt particle

# Frame 1: Wind streaks from right
SAND_01 = [
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  D3, D2, D1, D1, _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  D1, D2, D1, D4, _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  D3, D1, D2, D1, _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  D4, D1, D2, D3, _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  D4, D1, D2, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  D1, D3, D2, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  D2, D1, D1, D3, _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  D4, D1, D2, D1, _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# Frame 2: Shifted positions (wind motion)
SAND_02 = [
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  D3, D2, D1, D1, _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  D1, D2, D1, D4, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [D1, D2, D1, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [D4, D1, D2, D3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  D4, D1, D2, _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  D1, D3, D2, _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  D2, D1, D1, D3, _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  D4, D1, D2, D1, _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# Frame 3: More shifted, particles wrapping
SAND_03 = [
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  D3, D2, D1, D1, _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  D1, D2, D1, D4, _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  D3, D1, D2, D1, _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  D4, D1, D2, D3, _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  D4, D1, D2, _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  D1, D3, D2, _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [D1, D1, D3, _,  _,  _,  _,  _,  _,  _,  _,  _,  D2, D1, D1, D3],
    [D1, D2, D1, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  D4, D1, D2],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
]

# ═══════════════════════════════════════════════════════════════════════════════
# STORM / LIGHTNING FLASH OVERLAY — 2 frames
# Frame 1: bright flash, Frame 2: fading afterglow
# Colors: near white (#f0f0f0), pale highlight (#fff8a0), bright yellow (#ffe040)
# ═══════════════════════════════════════════════════════════════════════════════

L1 = alpha(NW, 140)   # bright flash base
L2 = alpha(YP, 100)   # warm afterglow
L3 = alpha(NW, 180)   # peak flash center
L4 = alpha(YB, 120)   # yellow accent

# Frame 1: Peak flash — bright screen overlay with lightning bolt silhouette
STORM_FLASH_01 = [
    [L1, L1, L1, L1, L1, L1, L1, L3, L3, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L1, L3, L3, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L1, L3, L1, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L3, L3, L1, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L3, L1, L1, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L3, L3, L3, L3, L3, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L1, L1, L3, L3, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L1, L3, L3, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L1, L3, L1, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L3, L3, L1, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L3, L1, L1, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L3, L4, L1, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L1, L4, L1, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L1, L4, L4, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L1, L1, L4, L1, L1, L1, L1, L1, L1, L1, L1],
    [L1, L1, L1, L1, L1, L1, L1, L1, L1, L1, L1, L1, L1, L1, L1, L1],
]

# Frame 2: Fading afterglow — dimmer, warm tint
STORM_FLASH_02 = [
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
    [L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2],
]

# ═══════════════════════════════════════════════════════════════════════════════
# WEATHER TRANSITION VIGNETTES — edge overlays for weather state changes
# Gradient from edges inward, semi-transparent
# 2 variants: warm (entering sandstorm/clear) and cool (entering rain/snow)
# ═══════════════════════════════════════════════════════════════════════════════

# Cool vignette (rain/snow transition) — blue-tinted edge darkening
V1 = alpha(DO, 120)   # deep ocean, outer edge
V2 = alpha(OB, 80)    # ocean blue, mid edge
V3 = alpha(SB, 40)    # sky blue, inner fade

VIGNETTE_COOL = [
    [V1, V1, V1, V2, V2, V2, V3, V3, V3, V3, V2, V2, V2, V1, V1, V1],
    [V1, V1, V2, V2, V3, V3, _,  _,  _,  _,  V3, V3, V2, V2, V1, V1],
    [V1, V2, V2, V3, _,  _,  _,  _,  _,  _,  _,  _,  V3, V2, V2, V1],
    [V2, V2, V3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  V3, V2, V2],
    [V2, V3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  V3, V2],
    [V2, V3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  V3, V2],
    [V3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  V3],
    [V3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  V3],
    [V3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  V3],
    [V3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  V3],
    [V2, V3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  V3, V2],
    [V2, V3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  V3, V2],
    [V2, V2, V3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  V3, V2, V2],
    [V1, V2, V2, V3, _,  _,  _,  _,  _,  _,  _,  _,  V3, V2, V2, V1],
    [V1, V1, V2, V2, V3, V3, _,  _,  _,  _,  V3, V3, V2, V2, V1, V1],
    [V1, V1, V1, V2, V2, V2, V3, V3, V3, V3, V2, V2, V2, V1, V1, V1],
]

# Warm vignette (sandstorm/clear transition) — sandy edge tinting
W1 = alpha(DT, 100)   # dirt, outer edge
W2 = alpha(SN, 70)    # sand, mid edge
W3 = alpha(DG, 35)    # desert gold, inner fade

VIGNETTE_WARM = [
    [W1, W1, W1, W2, W2, W2, W3, W3, W3, W3, W2, W2, W2, W1, W1, W1],
    [W1, W1, W2, W2, W3, W3, _,  _,  _,  _,  W3, W3, W2, W2, W1, W1],
    [W1, W2, W2, W3, _,  _,  _,  _,  _,  _,  _,  _,  W3, W2, W2, W1],
    [W2, W2, W3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  W3, W2, W2],
    [W2, W3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  W3, W2],
    [W2, W3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  W3, W2],
    [W3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  W3],
    [W3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  W3],
    [W3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  W3],
    [W3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  W3],
    [W2, W3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  W3, W2],
    [W2, W3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  W3, W2],
    [W2, W2, W3, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  W3, W2, W2],
    [W1, W2, W2, W3, _,  _,  _,  _,  _,  _,  _,  _,  W3, W2, W2, W1],
    [W1, W1, W2, W2, W3, W3, _,  _,  _,  _,  W3, W3, W2, W2, W1, W1],
    [W1, W1, W1, W2, W2, W2, W3, W3, W3, W3, W2, W2, W2, W1, W1, W1],
]

# ═══════════════════════════════════════════════════════════════════════════════
# Validate and write all assets
# ═══════════════════════════════════════════════════════════════════════════════

ASSETS = {
    # Rain particles (3 frames)
    'weather_rain_01': (RAIN_01, 16, 16),
    'weather_rain_02': (RAIN_02, 16, 16),
    'weather_rain_03': (RAIN_03, 16, 16),
    # Snow particles (4 shapes)
    'weather_snow_01': (SNOW_01, 16, 16),
    'weather_snow_02': (SNOW_02, 16, 16),
    'weather_snow_03': (SNOW_03, 16, 16),
    'weather_snow_04': (SNOW_04, 16, 16),
    # Fog overlay tile
    'weather_fog_tile': (FOG_TILE, 16, 16),
    # Sandstorm particles (3 frames)
    'weather_sandstorm_01': (SAND_01, 16, 16),
    'weather_sandstorm_02': (SAND_02, 16, 16),
    'weather_sandstorm_03': (SAND_03, 16, 16),
    # Storm/lightning flash (2 frames)
    'weather_storm_flash_01': (STORM_FLASH_01, 16, 16),
    'weather_storm_flash_02': (STORM_FLASH_02, 16, 16),
    # Transition vignettes
    'weather_vignette_cool': (VIGNETTE_COOL, 16, 16),
    'weather_vignette_warm': (VIGNETTE_WARM, 16, 16),
}

print('Generating weather particle sprites...')
print(f'Output directory: {os.path.abspath(OUT_DIR)}')
print()

for name, (pixels, w, h) in ASSETS.items():
    check(name, pixels, w, h)
    write_png(os.path.join(OUT_DIR, f'{name}.png'), pixels)

print()
print(f'Done. Generated {len(ASSETS)} weather sprites.')
print()
print('Asset manifest:')
print('  Rain:      weather_rain_01..03.png    (3 frames, 16x16, 10 FPS)')
print('  Snow:      weather_snow_01..04.png    (4 shapes, 16x16, 10 FPS)')
print('  Fog:       weather_fog_tile.png       (seamless tile, 16x16)')
print('  Sandstorm: weather_sandstorm_01..03.png (3 frames, 16x16, 10 FPS)')
print('  Storm:     weather_storm_flash_01..02.png (2 frames, 16x16)')
print('  Vignette:  weather_vignette_cool.png  (rain/snow transition)')
print('             weather_vignette_warm.png  (sandstorm/clear transition)')
