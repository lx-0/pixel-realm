#!/usr/bin/env python3
"""
Generate dodge/roll and sprint animation sprites for PixelRealm (PIX-346).
Uses only Python stdlib (struct + zlib) — no PIL required.

Outputs:
  1. Dodge/roll spritesheets for 4 classes × 4 directions (96×96 each)
  2. Sprint spritesheets for 4 classes × 4 directions (64×96 each)
  3. Dodge dust trail VFX spritesheet (64×16)
  4. Invulnerability flash overlay spritesheet (32×24)

All assets follow docs/ART-STYLE-GUIDE.md:
  - 16×24 character sprites, 32-color master palette
  - Multi-row sheets: 4 rows (down, left, right, up) × N frames
  - Naming convention: char_player_{class}_dodge.png, char_player_{class}_sprint.png
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..')

# Output directories
CHAR_DIR = os.path.join(PROJECT_ROOT, 'assets', 'sprites', 'characters')
VFX_DIR = os.path.join(PROJECT_ROOT, 'assets', 'vfx')
PUBLIC_DIR = os.path.join(PROJECT_ROOT, 'public', 'assets')

for d in [CHAR_DIR, VFX_DIR, PUBLIC_DIR]:
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


def vstack(rows):
    """Vertically concatenate pixel grids (same width)."""
    result = []
    for row_block in rows:
        result.extend(copy_sprite(row_block))
    return result


def blank(w, h, fill=None):
    fill = fill or _
    return [[fill] * w for _r in range(h)]


def swap_colors(sprite, color_map):
    """Replace pixels according to a color mapping dict."""
    result = []
    for row in sprite:
        new_row = []
        for px in row:
            new_row.append(color_map.get(px, px))
        result.append(new_row)
    return result


def check(name, pixels, w, h):
    assert len(pixels) == h, f'{name}: expected {h} rows, got {len(pixels)}'
    for i, row in enumerate(pixels):
        assert len(row) == w, f'{name} row {i}: expected {w} cols, got {len(row)}'


# ─── Class color swap maps ──────────────────────────────────────────────────
# Base frames use Warrior colors (PB body, DP shadow, HB highlight, DG/GD belt)
# Other classes swap these colors to their identity palette.

CLASS_SWAPS = {
    'warrior': {},  # base colors, no swap needed
    'mage': {
        PB: MP,   # body: player blue → magic purple
        DP: PM,   # shadow: ocean blue → deep magic
        HB: MV,   # highlight: ice → mana violet
        SB: SG,   # secondary: sky blue → spell glow
        DG: PM,   # belt dark: dark gold → deep magic
        GD: SG,   # belt light: gold → spell glow
    },
    'ranger': {
        PB: FG,   # body: player blue → forest green
        DP: DF,   # shadow: ocean blue → deep forest
        HB: LG,   # highlight: ice → leaf green
        SB: BG,   # secondary: sky blue → bright grass
        DG: BD,   # belt dark: dark gold → deep soil
        GD: BN,   # belt light: gold → rich earth
    },
    'artisan': {
        PB: SN,   # body: player blue → sand
        DP: BN,   # shadow: ocean blue → rich earth
        HB: DS,   # highlight: ice → desert gold
        SB: PS,   # secondary: sky blue → pale sand
        DG: BD,   # belt dark: dark gold → deep soil
        GD: DT,   # belt light: gold → dirt
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# DODGE/ROLL ANIMATION FRAMES (16×24 each)
# 6 frames: anticipation, tuck, roll-1, roll-2, emerge, recovery
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Dodge Down (rolling toward camera) ─────────────────────────────────────

DODGE_DOWN_0 = [  # Anticipation — deep crouch
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,NW,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,K, PG,K, PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,K, PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, K, PB,PB,K, _, _, _, _, K, PB,PB,K, _, _],
    [_, _, K, PB,PB,K, _, _, _, _, K, PB,PB,K, _, _],
    [_, _, K, DP,DP,K, _, _, _, _, K, DP,DP,K, _, _],
    [_, _, K, DT,DT,K, _, _, _, _, K, DT,DT,K, _, _],
    [_, K, DT,DT,DT,K, _, _, _, _, K, DT,DT,DT,K, _],
    [_, K, DT,DT,DT,K, _, _, _, _, K, DT,DT,DT,K, _],
    [_, K, K, K, K, _, _, _, _, _, _, K, K, K, K, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_DOWN_1 = [  # Tuck — body compressed into ball, head down
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, K, K, PG,K, PG,K, PG,K, K, _, _, _, _],
    [_, _, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, K, DP,DT,DT,DT,K, K, DT,DT,DT,K, _, _, _],
    [_, _, _, K, DT,DT,DT,DT,DT,DT,DT,DT,K, _, _, _],
    [_, _, _, K, K, K, K, K, K, K, K, K, K, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_DOWN_2 = [  # Roll mid-1 — compact ball, mid-tumble
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, PB,PB,PB,PB,PB,K, _, _, _, _, _],
    [_, _, _, K, PB,PB,HB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _, _],
    [_, _, K, PB,PB,DG,GD,GD,GD,GD,PB,PB,K, _, _, _],
    [_, _, _, K, PB,DT,DT,DT,DT,DT,DT,K, _, _, _, _],
    [_, _, _, K, K, DT,DT,DT,DT,DT,K, K, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_DOWN_3 = [  # Roll mid-2 — still compact, starting to unroll
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, PB,PB,PB,PB,PB,K, _, _, _, _, _],
    [_, _, _, K, PB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,PB,DP,DP,DP,DP,DP,PB,PB,K, _, _, _],
    [_, _, _, K, DG,GD,GD,GD,GD,GD,GD,K, _, _, _, _],
    [_, _, _, K, PB,PB,PB,K, K, PB,PB,K, _, _, _, _],
    [_, _, _, K, PG,PG,PG,PG,PG,PG,PG,K, _, _, _, _],
    [_, _, _, _, K, PG,K, PG,K, PG,K, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_DOWN_4 = [  # Emerge — rising from roll, crouched stance
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,NW,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,K, PG,K, PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,K, PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, K, PB,PB,K, _, _, _, _, K, PB,PB,K, _, _],
    [_, _, K, PB,PB,K, _, _, _, _, K, PB,PB,K, _, _],
    [_, _, K, DP,DP,K, _, _, _, _, K, DP,DP,K, _, _],
    [_, _, K, DT,DT,K, _, _, _, _, K, DT,DT,K, _, _],
    [_, K, DT,DT,DT,K, _, _, _, _, K, DT,DT,DT,K, _],
    [_, K, K, K, K, _, _, _, _, _, _, K, K, K, K, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_DOWN_5 = [  # Recovery — nearly standing, back to idle pose
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,NW,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,K, PG,K, PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,K, PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,HB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, DP,DP,DP,K, _, K, DP,DP,DP,K, _, _],
    [_, _, _, K, DT,DT,DT,K, _, K, DT,DT,DT,K, _, _],
    [_, _, K, DT,DT,DT,DT,K, _, K, DT,DT,DT,DT,K, _],
    [_, _, K, DT,DT,DT,DT,K, _, K, DT,DT,DT,DT,K, _],
    [_, _, K, K, K, K, K, _, _, _, K, K, K, K, K, _],
]

DODGE_DOWN_FRAMES = [DODGE_DOWN_0, DODGE_DOWN_1, DODGE_DOWN_2,
                     DODGE_DOWN_3, DODGE_DOWN_4, DODGE_DOWN_5]

# ─── Dodge Right (rolling sideways to the right) ────────────────────────────

DODGE_RIGHT_0 = [  # Anticipation — lean right
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, K, K, K, K, K, _, _, _, _],
    [_, _, _, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _],
    [_, _, _, _, _, _, K, PG,NW,PG,PG,PG,K, _, _, _],
    [_, _, _, _, _, _, K, PG,K, PG,K, PG,K, _, _, _],
    [_, _, _, _, _, _, K, PG,PG,K, PG,PG,K, _, _, _],
    [_, _, _, _, _, _, K, K, K, K, K, K, K, _, _, _],
    [_, _, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, _, K, DG,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, _, _, K, PB,PB,K, _, _, K, PB,PB,K, _, _],
    [_, _, _, _, K, PB,PB,K, _, _, K, PB,PB,K, _, _],
    [_, _, _, _, K, PB,PB,K, _, _, K, PB,PB,K, _, _],
    [_, _, _, _, K, PB,PB,K, _, _, K, PB,PB,K, _, _],
    [_, _, _, _, K, DP,DP,K, _, _, K, DP,DP,K, _, _],
    [_, _, _, _, K, DT,DT,K, _, _, K, DT,DT,K, _, _],
    [_, _, _, K, DT,DT,DT,K, _, K, DT,DT,DT,DT,K, _],
    [_, _, _, K, DT,DT,DT,K, _, K, DT,DT,DT,DT,K, _],
    [_, _, _, K, K, K, K, _, _, _, K, K, K, K, K, _],
]

DODGE_RIGHT_1 = [  # Tuck — compact, shifting right
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, K, K, K, K, K, _, _, _, _],
    [_, _, _, _, _, _, K, PG,PG,PG,PG,K, _, _, _, _],
    [_, _, _, _, _, K, PB,PB,HB,PB,PB,PB,K, _, _, _],
    [_, _, _, _, K, PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, _, _, K, PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, _, _, K, PB,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, _, _, _, K, DG,GD,GD,GD,GD,K, _, _, _, _],
    [_, _, _, _, _, K, DT,DT,DT,DT,DT,DT,K, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, K, K, K, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_RIGHT_2 = [  # Roll mid — very compact ball, shifted right
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, K, K, K, K, _, _, _, _, _],
    [_, _, _, _, _, _, K, PB,PB,PB,PB,K, _, _, _, _],
    [_, _, _, _, _, K, PB,HB,PB,PB,PB,PB,K, _, _, _],
    [_, _, _, _, _, K, PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, _, _, _, K, DP,DP,DP,DP,DP,DP,K, _, _, _],
    [_, _, _, _, _, _, K, DT,DT,DT,DT,K, _, _, _, _],
    [_, _, _, _, _, _, K, K, K, K, K, K, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_RIGHT_3 = [  # Roll mid-2 — emerging rightward
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, K, K, K, K, _, _, _, _],
    [_, _, _, _, _, _, _, K, PG,PG,PG,K, _, _, _, _],
    [_, _, _, _, _, _, K, PB,HB,PB,PB,PB,K, _, _, _],
    [_, _, _, _, _, K, PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, _, _, _, K, PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, _, _, _, K, DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, _, _, _, _, K, DG,GD,GD,GD,K, _, _, _, _],
    [_, _, _, _, _, _, K, DT,DT,DT,DT,DT,K, _, _, _],
    [_, _, _, _, _, _, K, K, K, K, K, K, K, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_RIGHT_4 = [  # Emerge — rising, shifted right
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, K, K, K, K, K, _, _, _, _],
    [_, _, _, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _],
    [_, _, _, _, _, _, K, PG,NW,PG,PG,PG,K, _, _, _],
    [_, _, _, _, _, _, K, PG,K, PG,K, PG,K, _, _, _],
    [_, _, _, _, _, _, K, PG,PG,K, PG,PG,K, _, _, _],
    [_, _, _, _, _, _, K, K, K, K, K, K, K, _, _, _],
    [_, _, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, _, K, PB,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, _, _, K, DG,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, _, _, K, PB,PB,K, _, _, K, PB,PB,K, _, _],
    [_, _, _, _, K, PB,PB,K, _, _, K, PB,PB,K, _, _],
    [_, _, _, _, K, DP,DP,K, _, _, K, DP,DP,K, _, _],
    [_, _, _, _, K, DT,DT,K, _, _, K, DT,DT,K, _, _],
    [_, _, _, K, DT,DT,DT,K, _, K, DT,DT,DT,DT,K, _],
    [_, _, _, K, K, K, K, _, _, _, K, K, K, K, K, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_RIGHT_5 = copy_sprite(DODGE_DOWN_5)  # Recovery — same standing pose

DODGE_RIGHT_FRAMES = [DODGE_RIGHT_0, DODGE_RIGHT_1, DODGE_RIGHT_2,
                      DODGE_RIGHT_3, DODGE_RIGHT_4, DODGE_RIGHT_5]

# Dodge Left — mirror of Dodge Right
DODGE_LEFT_FRAMES = [mirror_h(f) for f in DODGE_RIGHT_FRAMES]

# ─── Dodge Up (rolling away from camera) ────────────────────────────────────
# Back-facing: no face visible, show back of head and body

DODGE_UP_0 = [  # Anticipation — crouched, back to camera
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, K, PB,PB,K, _, _, _, _, K, PB,PB,K, _, _],
    [_, _, K, PB,PB,K, _, _, _, _, K, PB,PB,K, _, _],
    [_, _, K, DP,DP,K, _, _, _, _, K, DP,DP,K, _, _],
    [_, _, K, DT,DT,K, _, _, _, _, K, DT,DT,K, _, _],
    [_, K, DT,DT,DT,K, _, _, _, _, K, DT,DT,DT,K, _],
    [_, K, K, K, K, _, _, _, _, _, _, K, K, K, K, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_UP_1 = [  # Tuck — back visible, compressed
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, K, K, DK,DK,DK,DK,DK,K, K, _, _, _, _],
    [_, _, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, K, DP,DT,DT,DT,K, K, DT,DT,DT,K, _, _, _],
    [_, _, _, K, DT,DT,DT,DT,DT,DT,DT,DT,K, _, _, _],
    [_, _, _, K, K, K, K, K, K, K, K, K, K, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_UP_2 = [  # Roll mid — compact ball
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, PB,PB,PB,PB,PB,K, _, _, _, _, _],
    [_, _, _, K, PB,PB,HB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _, _],
    [_, _, K, DT,DT,DG,GD,GD,GD,GD,DT,DT,K, _, _, _],
    [_, _, _, K, DT,DT,DT,DT,DT,DT,DT,K, _, _, _, _],
    [_, _, _, K, K, K, DK,DK,DK,K, K, K, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_UP_3 = [  # Roll mid-2 — unrolling, back of head reappearing
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, PB,PB,PB,PB,PB,K, _, _, _, _, _],
    [_, _, _, K, PB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _, _],
    [_, _, _, K, DG,GD,GD,GD,GD,GD,GD,K, _, _, _, _],
    [_, _, _, K, DT,DT,PB,K, K, PB,DT,K, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_UP_4 = [  # Emerge — rising, back to camera
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, K, PB,PB,K, _, _, _, _, K, PB,PB,K, _, _],
    [_, _, K, PB,PB,K, _, _, _, _, K, PB,PB,K, _, _],
    [_, _, K, DP,DP,K, _, _, _, _, K, DP,DP,K, _, _],
    [_, _, K, DT,DT,K, _, _, _, _, K, DT,DT,K, _, _],
    [_, K, DT,DT,DT,K, _, _, _, _, K, DT,DT,DT,K, _],
    [_, K, K, K, K, _, _, _, _, _, _, K, K, K, K, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DODGE_UP_5 = [  # Recovery — standing, back to camera
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, DP,DP,DP,K, _, K, DP,DP,DP,K, _, _],
    [_, _, _, K, DT,DT,DT,K, _, K, DT,DT,DT,K, _, _],
    [_, _, K, DT,DT,DT,DT,K, _, K, DT,DT,DT,DT,K, _],
    [_, _, K, DT,DT,DT,DT,K, _, K, DT,DT,DT,DT,K, _],
    [_, _, K, K, K, K, K, _, _, _, K, K, K, K, K, _],
]

DODGE_UP_FRAMES = [DODGE_UP_0, DODGE_UP_1, DODGE_UP_2,
                   DODGE_UP_3, DODGE_UP_4, DODGE_UP_5]

# All dodge directions: down, left, right, up (row order per style guide)
ALL_DODGE_DIRS = [DODGE_DOWN_FRAMES, DODGE_LEFT_FRAMES,
                  DODGE_RIGHT_FRAMES, DODGE_UP_FRAMES]


# ═══════════════════════════════════════════════════════════════════════════════
# SPRINT ANIMATION FRAMES (16×24 each)
# 4 frames: fast walk cycle with forward lean and longer stride
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Sprint Down (fast run toward camera) ────────────────────────────────────

SPRINT_DOWN_0 = [  # Right foot far forward, body leaning
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,NW,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,K, PG,K, PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,K, PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, K, PB,PB,K, _, _, _, _, _, K, PB,PB,PB,K, _],
    [_, K, PB,PB,K, _, _, _, _, _, K, PB,PB,PB,K, _],
    [K, DP,DP,K, _, _, _, _, _, _, K, PB,PB,PB,K, _],
    [K, DT,DT,K, _, _, _, _, _, _, K, PB,PB,PB,K, _],
    [K, K, K, _, _, _, _, _, _, _, K, DP,DP,DP,K, _],
    [_, _, _, _, _, _, _, _, _, _, K, DT,DT,DT,K, _],
    [_, _, _, _, _, _, _, _, _, K, DT,DT,DT,DT,K, _],
    [_, _, _, _, _, _, _, _, _, K, DT,DT,DT,DT,K, _],
    [_, _, _, _, _, _, _, _, _, K, K, K, K, K, _, _],
]

SPRINT_DOWN_1 = [  # Passing — feet close, body upright
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,NW,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,K, PG,K, PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,K, PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,HB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, DP,DP,DP,K, _, K, DP,DP,DP,K, _, _],
    [_, _, _, K, DT,DT,DT,K, _, K, DT,DT,DT,K, _, _],
    [_, _, K, DT,DT,DT,DT,K, _, K, DT,DT,DT,DT,K, _],
    [_, _, K, DT,DT,DT,DT,K, _, K, DT,DT,DT,DT,K, _],
    [_, _, K, K, K, K, K, _, _, _, K, K, K, K, K, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

SPRINT_DOWN_2 = [  # Left foot far forward (mirror stride of frame 0)
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,NW,PG,PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,K, PG,K, PG,K, _, _, _, _, _],
    [_, _, _, _, K, PG,PG,K, PG,PG,K, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, K, PB,PB,PB,K, _, _, _, _, _, K, PB,PB,K, _],
    [_, K, PB,PB,PB,K, _, _, _, _, _, K, PB,PB,K, _],
    [_, K, PB,PB,PB,K, _, _, _, _, _, _, K, DP,DP,K],
    [_, K, PB,PB,PB,K, _, _, _, _, _, _, K, DT,DT,K],
    [_, K, DP,DP,DP,K, _, _, _, _, _, _, _, K, K, K],
    [_, K, DT,DT,DT,K, _, _, _, _, _, _, _, _, _, _],
    [_, K, DT,DT,DT,DT,K, _, _, _, _, _, _, _, _, _],
    [_, K, DT,DT,DT,DT,K, _, _, _, _, _, _, _, _, _],
    [_, _, K, K, K, K, _, _, _, _, _, _, _, _, _, _],
]

SPRINT_DOWN_3 = copy_sprite(SPRINT_DOWN_1)  # Passing (repeat)

SPRINT_DOWN_FRAMES = [SPRINT_DOWN_0, SPRINT_DOWN_1, SPRINT_DOWN_2, SPRINT_DOWN_3]

# ─── Sprint Right ────────────────────────────────────────────────────────────

SPRINT_RIGHT_0 = [  # Leading stride right
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _, _],
    [_, _, _, _, _, K, PG,NW,PG,PG,PG,K, _, _, _, _],
    [_, _, _, _, _, K, PG,K, PG,K, PG,K, _, _, _, _],
    [_, _, _, _, _, K, PG,PG,K, PG,PG,K, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, K, K, _, _, _, _],
    [_, _, _, _, K, HB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, _, K, PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _, _],
    [_, _, _, K, DG,GD,GD,GD,GD,GD,GD,K, _, _, _, _],
    [_, _, _, K, PB,PB,K, _, _, _, K, PB,PB,K, _, _],
    [_, _, _, K, PB,PB,K, _, _, _, K, PB,PB,K, _, _],
    [_, _, _, K, DP,DP,K, _, _, _, _, K, PB,PB,K, _],
    [_, _, _, _, K, K, _, _, _, _, _, K, DP,DP,K, _],
    [_, _, _, _, _, _, _, _, _, _, K, DT,DT,DT,K, _],
    [_, _, _, _, _, _, _, _, _, K, DT,DT,DT,DT,K, _],
    [_, _, _, _, _, _, _, _, _, K, DT,DT,DT,DT,K, _],
    [_, _, _, _, _, _, _, _, _, K, K, K, K, K, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

SPRINT_RIGHT_1 = [  # Passing — compact stride
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _, _],
    [_, _, _, _, _, K, PG,NW,PG,PG,PG,K, _, _, _, _],
    [_, _, _, _, _, K, PG,K, PG,K, PG,K, _, _, _, _],
    [_, _, _, _, _, K, PG,PG,K, PG,PG,K, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, K, K, _, _, _, _],
    [_, _, _, _, K, HB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, _, K, PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, K, PB,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _, _],
    [_, _, _, K, DG,GD,GD,GD,GD,GD,GD,K, _, _, _, _],
    [_, _, _, _, K, PB,PB,K, _, K, PB,PB,K, _, _, _],
    [_, _, _, _, K, PB,PB,K, _, K, PB,PB,K, _, _, _],
    [_, _, _, _, K, DP,DP,K, _, K, DP,DP,K, _, _, _],
    [_, _, _, _, K, DT,DT,K, _, K, DT,DT,K, _, _, _],
    [_, _, _, K, DT,DT,DT,K, _, K, DT,DT,DT,K, _, _],
    [_, _, _, K, DT,DT,DT,K, _, K, DT,DT,DT,K, _, _],
    [_, _, _, K, K, K, K, _, _, _, K, K, K, K, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

SPRINT_RIGHT_2 = [  # Trailing stride right
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, _, _, K, PG,PG,PG,PG,PG,K, _, _, _, _],
    [_, _, _, _, _, K, PG,NW,PG,PG,PG,K, _, _, _, _],
    [_, _, _, _, _, K, PG,K, PG,K, PG,K, _, _, _, _],
    [_, _, _, _, _, K, PG,PG,K, PG,PG,K, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, K, K, _, _, _, _],
    [_, _, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, _, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, K, PB,HB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, _, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, _, K, DG,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, K, PB,PB,K, _, _, _, _, K, PB,PB,K, _, _],
    [_, _, K, PB,PB,K, _, _, _, _, K, PB,PB,K, _, _],
    [_, K, PB,PB,K, _, _, _, _, _, K, DP,DP,K, _, _],
    [_, K, DP,DP,K, _, _, _, _, _, _, K, K, _, _, _],
    [_, K, DT,DT,DT,K, _, _, _, _, _, _, _, _, _, _],
    [_, K, DT,DT,DT,DT,K, _, _, _, _, _, _, _, _, _],
    [_, K, DT,DT,DT,DT,K, _, _, _, _, _, _, _, _, _],
    [_, _, K, K, K, K, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

SPRINT_RIGHT_3 = copy_sprite(SPRINT_RIGHT_1)  # Passing (repeat)

SPRINT_RIGHT_FRAMES = [SPRINT_RIGHT_0, SPRINT_RIGHT_1, SPRINT_RIGHT_2, SPRINT_RIGHT_3]

# Sprint Left — mirror of Sprint Right
SPRINT_LEFT_FRAMES = [mirror_h(f) for f in SPRINT_RIGHT_FRAMES]

# ─── Sprint Up (running away from camera) ───────────────────────────────────

SPRINT_UP_0 = [  # Right foot forward, back visible
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, K, PB,PB,K, _, _, _, _, _, K, PB,PB,PB,K, _],
    [_, K, PB,PB,K, _, _, _, _, _, K, PB,PB,PB,K, _],
    [K, DP,DP,K, _, _, _, _, _, _, K, PB,PB,PB,K, _],
    [K, DT,DT,K, _, _, _, _, _, _, K, PB,PB,PB,K, _],
    [K, K, K, _, _, _, _, _, _, _, K, DP,DP,DP,K, _],
    [_, _, _, _, _, _, _, _, _, _, K, DT,DT,DT,K, _],
    [_, _, _, _, _, _, _, _, _, K, DT,DT,DT,DT,K, _],
    [_, _, _, _, _, _, _, _, _, K, DT,DT,DT,DT,K, _],
    [_, _, _, _, _, _, _, _, _, K, K, K, K, K, _, _],
]

SPRINT_UP_1 = [  # Passing — compact
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, PB,PB,PB,K, _, K, PB,PB,PB,K, _, _],
    [_, _, _, K, DP,DP,DP,K, _, K, DP,DP,DP,K, _, _],
    [_, _, _, K, DT,DT,DT,K, _, K, DT,DT,DT,K, _, _],
    [_, _, K, DT,DT,DT,DT,K, _, K, DT,DT,DT,DT,K, _],
    [_, _, K, DT,DT,DT,DT,K, _, K, DT,DT,DT,DT,K, _],
    [_, _, K, K, K, K, K, _, _, _, K, K, K, K, K, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

SPRINT_UP_2 = [  # Left foot forward, back visible (mirror stride)
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, K, DK,DK,DK,DK,DK,K, _, _, _, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, K, HB,PB,PB,PB,PB,PB,PB,K, _, _, _, _],
    [_, _, _, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,PB,K, _, _],
    [_, K, PB,DP,DP,DP,DP,DP,DP,DP,DP,DP,PB,K, _, _],
    [_, _, K, DG,GD,GD,GD,GD,GD,GD,GD,GD,K, _, _, _],
    [_, K, PB,PB,PB,K, _, _, _, _, _, K, PB,PB,K, _],
    [_, K, PB,PB,PB,K, _, _, _, _, _, K, PB,PB,K, _],
    [_, K, PB,PB,PB,K, _, _, _, _, _, _, K, DP,DP,K],
    [_, K, PB,PB,PB,K, _, _, _, _, _, _, K, DT,DT,K],
    [_, K, DP,DP,DP,K, _, _, _, _, _, _, _, K, K, K],
    [_, K, DT,DT,DT,K, _, _, _, _, _, _, _, _, _, _],
    [_, K, DT,DT,DT,DT,K, _, _, _, _, _, _, _, _, _],
    [_, K, DT,DT,DT,DT,K, _, _, _, _, _, _, _, _, _],
    [_, _, K, K, K, K, _, _, _, _, _, _, _, _, _, _],
]

SPRINT_UP_3 = copy_sprite(SPRINT_UP_1)  # Passing (repeat)

SPRINT_UP_FRAMES = [SPRINT_UP_0, SPRINT_UP_1, SPRINT_UP_2, SPRINT_UP_3]

# All sprint directions: down, left, right, up
ALL_SPRINT_DIRS = [SPRINT_DOWN_FRAMES, SPRINT_LEFT_FRAMES,
                   SPRINT_RIGHT_FRAMES, SPRINT_UP_FRAMES]


# ═══════════════════════════════════════════════════════════════════════════════
# VFX — DODGE DUST TRAIL (16×16 per frame, 4 frames)
# ═══════════════════════════════════════════════════════════════════════════════

# Semi-transparent dust/dirt particle puffs
D1 = (139, 92,  42,  180)   # dust main (semi-transparent)
D2 = (184, 132, 63,  120)   # dust light (more transparent)
D3 = (107, 58,  31,  80)    # dust dark (fading)
D4 = (200, 200, 200, 100)   # pale dust

DUST_0 = [  # Initial puff — small burst
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, D2, D2, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, D1, D1, D1, D1, _, _, _, _, _, _],
    [_, _, _, _, _, D1, D1, D4, D4, D1, D1, _, _, _, _, _],
    [_, _, _, _, _, D1, D4, D4, D4, D1, D1, _, _, _, _, _],
    [_, _, _, _, _, _, D1, D1, D1, D1, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, D3, D3, _, _, _, _, _, _, _],
]

DUST_1 = [  # Expanding puff
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, D3, D2, D2, D3, _, _, _, _, _, _],
    [_, _, _, _, _, D2, D1, D1, D1, D1, D2, _, _, _, _, _],
    [_, _, _, _, D2, D1, D4, D4, D4, D1, D1, D2, _, _, _, _],
    [_, _, _, _, D1, D4, D4, D4, D4, D4, D4, D1, _, _, _, _],
    [_, _, _, _, D1, D4, D4, D4, D4, D4, D4, D1, _, _, _, _],
    [_, _, _, _, D2, D1, D1, D4, D4, D1, D1, D2, _, _, _, _],
    [_, _, _, _, _, D2, D1, D1, D1, D1, D2, _, _, _, _, _],
    [_, _, _, _, _, _, D3, D3, D3, D3, _, _, _, _, _, _],
]

DUST_2 = [  # Dissipating
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, D3, _, _, _, _, D3, _, _, _, _, _],
    [_, _, _, _, D3, _, D2, _, _, D2, _, D3, _, _, _, _],
    [_, _, _, D3, _, D2, _, D2, D2, _, D2, _, D3, _, _, _],
    [_, _, _, _, D2, _, D2, D4, D4, D2, _, D2, _, _, _, _],
    [_, _, _, _, _, D2, D4, _, _, D4, D2, _, _, _, _, _],
    [_, _, _, _, D2, _, D2, _, _, D2, _, D2, _, _, _, _],
    [_, _, _, D3, _, D2, _, D2, D2, _, D2, _, D3, _, _, _],
    [_, _, _, _, D3, _, D3, _, _, D3, _, D3, _, _, _, _],
    [_, _, _, _, _, _, _, D3, D3, _, _, _, _, _, _, _],
]

DUST_3 = [  # Nearly gone — wisps
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, D3, _, _, _, _],
    [_, _, _, _, _, D3, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, D3, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, D3, _, _, _, D3, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, D3, _, _, _, _, _, _, _, D3, _, _, _],
    [_, _, _, _, _, _, _, D3, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

DUST_FRAMES = [DUST_0, DUST_1, DUST_2, DUST_3]


# ═══════════════════════════════════════════════════════════════════════════════
# VFX — INVULNERABILITY FLASH OVERLAY (16×24, 2 frames)
# Semi-transparent white flash that overlays the character during dodge i-frames
# ═══════════════════════════════════════════════════════════════════════════════

FW = (240, 240, 255, 160)   # flash white (semi-transparent)
FB = (200, 220, 255, 100)   # flash blue tint (more transparent)

FLASH_0 = [  # Full flash — bright overlay matching character silhouette
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, FW,FW,FW,FW,FW, _, _, _, _, _, _],
    [_, _, _, _, FW,FW,FW,FW,FW,FW,FW, _, _, _, _, _],
    [_, _, _, _, FW,FW,FW,FW,FW,FW,FW, _, _, _, _, _],
    [_, _, _, _, FW,FW,FW,FW,FW,FW,FW, _, _, _, _, _],
    [_, _, _, _, FW,FW,FW,FW,FW,FW,FW, _, _, _, _, _],
    [_, _, _, _, FW,FW,FW,FW,FW,FW,FW, _, _, _, _, _],
    [_, _, _, FW,FW,FW,FW,FW,FW,FW,FW,FW, _, _, _, _],
    [_, _, FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW, _, _, _],
    [_, FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW, _, _],
    [_, FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW, _, _],
    [_, FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW, _, _],
    [_, FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW, _, _],
    [_, FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW, _, _],
    [_, _, FW,FW,FW,FW,FW,FW,FW,FW,FW,FW,FW, _, _, _],
    [_, _, _, FW,FW,FW,FW,FW, _, FW,FW,FW,FW,FW, _, _],
    [_, _, _, FW,FW,FW,FW,FW, _, FW,FW,FW,FW,FW, _, _],
    [_, _, _, FW,FW,FW,FW,FW, _, FW,FW,FW,FW,FW, _, _],
    [_, _, _, FW,FW,FW,FW,FW, _, FW,FW,FW,FW,FW, _, _],
    [_, _, _, FW,FW,FW,FW,FW, _, FW,FW,FW,FW,FW, _, _],
    [_, _, _, FW,FW,FW,FW,FW, _, FW,FW,FW,FW,FW, _, _],
    [_, _, FW,FW,FW,FW,FW,FW, _, FW,FW,FW,FW,FW,FW, _],
    [_, _, FW,FW,FW,FW,FW,FW, _, FW,FW,FW,FW,FW,FW, _],
    [_, _, FW,FW,FW,FW,FW, _, _, _, FW,FW,FW,FW,FW, _],
]

FLASH_1 = [  # Fading flash — dimmer, blue-tinted
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, FB,FB,FB,FB,FB, _, _, _, _, _, _],
    [_, _, _, _, FB,FB,FB,FB,FB,FB,FB, _, _, _, _, _],
    [_, _, _, _, FB,FB,FB,FB,FB,FB,FB, _, _, _, _, _],
    [_, _, _, _, FB,FB,FB,FB,FB,FB,FB, _, _, _, _, _],
    [_, _, _, _, FB,FB,FB,FB,FB,FB,FB, _, _, _, _, _],
    [_, _, _, _, FB,FB,FB,FB,FB,FB,FB, _, _, _, _, _],
    [_, _, _, FB,FB,FB,FB,FB,FB,FB,FB,FB, _, _, _, _],
    [_, _, FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB, _, _, _],
    [_, FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB, _, _],
    [_, FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB, _, _],
    [_, FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB, _, _],
    [_, FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB, _, _],
    [_, FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB, _, _],
    [_, _, FB,FB,FB,FB,FB,FB,FB,FB,FB,FB,FB, _, _, _],
    [_, _, _, FB,FB,FB,FB,FB, _, FB,FB,FB,FB,FB, _, _],
    [_, _, _, FB,FB,FB,FB,FB, _, FB,FB,FB,FB,FB, _, _],
    [_, _, _, FB,FB,FB,FB,FB, _, FB,FB,FB,FB,FB, _, _],
    [_, _, _, FB,FB,FB,FB,FB, _, FB,FB,FB,FB,FB, _, _],
    [_, _, _, FB,FB,FB,FB,FB, _, FB,FB,FB,FB,FB, _, _],
    [_, _, _, FB,FB,FB,FB,FB, _, FB,FB,FB,FB,FB, _, _],
    [_, _, FB,FB,FB,FB,FB,FB, _, FB,FB,FB,FB,FB,FB, _],
    [_, _, FB,FB,FB,FB,FB,FB, _, FB,FB,FB,FB,FB,FB, _],
    [_, _, FB,FB,FB,FB,FB, _, _, _, FB,FB,FB,FB,FB, _],
]

FLASH_FRAMES = [FLASH_0, FLASH_1]


# ═══════════════════════════════════════════════════════════════════════════════
# GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

def validate_all_frames():
    """Validate dimensions of all defined frames."""
    print('=== Validating frames ===')
    for name, frames in [('dodge_down', DODGE_DOWN_FRAMES),
                         ('dodge_right', DODGE_RIGHT_FRAMES),
                         ('dodge_left', DODGE_LEFT_FRAMES),
                         ('dodge_up', DODGE_UP_FRAMES)]:
        for i, f in enumerate(frames):
            check(f'{name}_{i}', f, 16, 24)
    for name, frames in [('sprint_down', SPRINT_DOWN_FRAMES),
                         ('sprint_right', SPRINT_RIGHT_FRAMES),
                         ('sprint_left', SPRINT_LEFT_FRAMES),
                         ('sprint_up', SPRINT_UP_FRAMES)]:
        for i, f in enumerate(frames):
            check(f'{name}_{i}', f, 16, 24)
    for i, f in enumerate(DUST_FRAMES):
        check(f'dust_{i}', f, 16, 16)
    for i, f in enumerate(FLASH_FRAMES):
        check(f'flash_{i}', f, 16, 24)
    print('  all frames valid')


def build_directional_sheet(direction_frames_list):
    """Build a multi-row sheet: each direction is one row of horizontally-concatenated frames.

    direction_frames_list: list of 4 lists (down, left, right, up),
                           each containing N frames (16×24 pixel grids).
    Returns: combined pixel grid (N*16 × 4*24).
    """
    rows = []
    for dir_frames in direction_frames_list:
        row_strip = hstack(dir_frames)
        rows.append(row_strip)
    return vstack(rows)


def generate_dodge_sheets():
    """Generate dodge/roll spritesheets for all 4 classes."""
    print('\n=== Generating dodge/roll spritesheets ===')
    base_sheet = build_directional_sheet(ALL_DODGE_DIRS)
    # Expected: 6 frames × 16px = 96px wide, 4 directions × 24px = 96px tall

    for class_name, swap_map in CLASS_SWAPS.items():
        if swap_map:
            sheet = swap_colors(base_sheet, swap_map)
        else:
            sheet = copy_sprite(base_sheet)

        fname = f'char_player_{class_name}_dodge.png'
        write_png(os.path.join(CHAR_DIR, fname), sheet)
        write_png(os.path.join(PUBLIC_DIR, fname), sheet)


def generate_sprint_sheets():
    """Generate sprint spritesheets for all 4 classes."""
    print('\n=== Generating sprint spritesheets ===')
    base_sheet = build_directional_sheet(ALL_SPRINT_DIRS)
    # Expected: 4 frames × 16px = 64px wide, 4 directions × 24px = 96px tall

    for class_name, swap_map in CLASS_SWAPS.items():
        if swap_map:
            sheet = swap_colors(base_sheet, swap_map)
        else:
            sheet = copy_sprite(base_sheet)

        fname = f'char_player_{class_name}_sprint.png'
        write_png(os.path.join(CHAR_DIR, fname), sheet)
        write_png(os.path.join(PUBLIC_DIR, fname), sheet)


def generate_vfx():
    """Generate dodge dust trail and invulnerability flash VFX sheets."""
    print('\n=== Generating VFX spritesheets ===')

    # Dust trail: horizontal strip, 4 frames × 16px = 64×16
    dust_sheet = hstack(DUST_FRAMES)
    write_png(os.path.join(VFX_DIR, 'vfx_dodge_dust.png'), dust_sheet)
    write_png(os.path.join(PUBLIC_DIR, 'vfx_dodge_dust.png'), dust_sheet)

    # Invulnerability flash: horizontal strip, 2 frames × 16px = 32×24
    flash_sheet = hstack(FLASH_FRAMES)
    write_png(os.path.join(VFX_DIR, 'vfx_dodge_flash.png'), flash_sheet)
    write_png(os.path.join(PUBLIC_DIR, 'vfx_dodge_flash.png'), flash_sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print('╔══════════════════════════════════════════════════════════════╗')
    print('║  PIX-346: Dodge/Roll & Sprint Animation Asset Generator    ║')
    print('╚══════════════════════════════════════════════════════════════╝')

    validate_all_frames()
    generate_dodge_sheets()
    generate_sprint_sheets()
    generate_vfx()

    print('\n=== Summary ===')
    print('  Dodge sheets:  4 classes × 96×96 (6 frames × 4 dirs, 16×24 per frame)')
    print('  Sprint sheets: 4 classes × 64×96 (4 frames × 4 dirs, 16×24 per frame)')
    print('  VFX dust:      64×16 (4 frames × 16×16)')
    print('  VFX flash:     32×24 (2 frames × 16×24)')
    print('  Total: 10 asset files + 10 public copies = 20 files')
    print('\nDone!')


if __name__ == '__main__':
    main()
