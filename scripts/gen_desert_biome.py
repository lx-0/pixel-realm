#!/usr/bin/env python3
"""
Generate Desert Oasis biome assets for PixelRealm (PIX-51).
Uses only Python stdlib (struct + zlib) — no PIL required.
Follows docs/art-style-guide.md exactly.

Assets generated:
  Tileset (256×96, 16 cols × 6 rows, 16×16 tiles):
    tileset_desert_oasis.png        24+ unique tile variations

  Enemy spritesheets (192×24, 12 frames × 16×24):
    char_enemy_sand_scorpion.png    fast melee — brown/amber palette
    char_enemy_desert_wraith.png    ranged magic — semi-transparent sand
    char_enemy_sandstone_golem.png  slow tank — rocky beige/brown

  Boss spritesheet (384×32, 12 frames × 32×32):
    char_boss_pharaoh_shade.png     gold + dark blue palette, staff weapon

  Loot icons (16×16):
    icon_item_scimitar.png
    icon_item_desert_robes.png
    icon_item_sand_amulet.png
    icon_pickup_oasis_potion.png

  Desert backgrounds (parallax layers):
    bg_desert_sky.png               320×60  warm dusk gradient + sun
    bg_desert_dunes_far.png         320×60  distant dune silhouettes
    bg_desert_dunes_near.png        320×80  near dunes with heat shimmer

  Transition tiles (256×32, 16 cols × 2 rows):
    tileset_desert_forest_transition.png
"""

import struct
import zlib
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
os.makedirs(OUT_DIR, exist_ok=True)

# ─── Palette ─────────────────────────────────────────────────────────────────

_ = (0, 0, 0, 0)           # transparent

# Neutrals
K   = (13,  13,  13,  255)
DK  = (43,  43,  43,  255)
ST  = (74,  74,  74,  255)
MG  = (110, 110, 110, 255)
LS  = (150, 150, 150, 255)
PG  = (200, 200, 200, 255)
NW  = (240, 240, 240, 255)

# Warm earth
BD  = (59,  32,  16,  255)
BN  = (107, 58,  31,  255)
DT  = (139, 92,  42,  255)
SN  = (184, 132, 63,  255)
DS  = (212, 168, 90,  255)
PS  = (232, 208, 138, 255)

# Greens
DF  = (26,  58,  26,  255)
FG  = (45,  110, 45,  255)
LG  = (76,  155, 76,  255)
BG  = (120, 200, 120, 255)
FL  = (168, 228, 160, 255)

# Cyan / blue
OC  = (10,  26,  58,  255)
DP  = (26,  74,  138, 255)
SB  = (42,  122, 192, 255)
PB  = (80,  168, 232, 255)
HB  = (144, 208, 248, 255)
IW  = (200, 240, 255, 255)

# Red / enemy / fire
DB  = (90,  10,  10,  255)
ER  = (160, 16,  16,  255)
BR  = (212, 32,  32,  255)
FR  = (240, 96,  32,  255)
EM  = (248, 160, 96,  255)

# Yellow / gold
DG  = (168, 112, 0,   255)
GD  = (232, 184, 0,   255)
YL  = (255, 224, 64,  255)
PY  = (255, 248, 160, 255)

# Purple / magic
PM  = (26,  10,  58,  255)
MP  = (90,  32,  160, 255)
MV  = (144, 80,  224, 255)
SG  = (208, 144, 255, 255)

# Desert-specific semi-transparent (wraith effect — 128 alpha)
WA1 = (212, 168, 90,  180)   # wraith body main
WA2 = (232, 208, 138, 130)   # wraith highlight, very faint
WA3 = (184, 132, 63,  200)   # wraith mid

# Dusk sky colours
DSK1 = (180, 80,  20,  255)  # deep dusk orange horizon
DSK2 = (210, 130, 40,  255)  # warm dusk mid
DSK3 = (240, 180, 80,  255)  # pale gold upper horizon
DSK4 = (140, 60,  100, 255)  # purple dusk upper
DSK5 = (80,  30,  70,  255)  # deep purple zenith
SUN  = (255, 240, 120, 255)  # sun disc

# ─── PNG writer ───────────────────────────────────────────────────────────────

def _make_chunk(chunk_type, data):
    payload = chunk_type + data
    crc = zlib.crc32(payload) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)


def write_png(path, pixels):
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
    print(f'  wrote {os.path.relpath(path)}  ({width}\xd7{height})')


# ─── Pixel helpers ────────────────────────────────────────────────────────────

def blank(w, h, fill=None):
    fill = fill or _
    return [[fill] * w for _ in range(h)]


def hstack(frames):
    result = []
    for r in range(len(frames[0])):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result


def vstack(grids):
    result = []
    for g in grids:
        result.extend(g)
    return result


def rect(grid, x, y, w, h, color):
    for row in range(y, y + h):
        for col in range(x, x + w):
            if 0 <= row < len(grid) and 0 <= col < len(grid[0]):
                grid[row][col] = color


def dot(grid, x, y, color):
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color


def hline(grid, x, y, w, color):
    rect(grid, x, y, w, 1, color)


def vline(grid, x, y, h, color):
    rect(grid, x, y, 1, h, color)


def outline(grid, x, y, w, h, color):
    hline(grid, x, y, w, color)
    hline(grid, x, y + h - 1, w, color)
    vline(grid, x, y, h, color)
    vline(grid, x + w - 1, y, h, color)


def copy_frame(src):
    return [row[:] for row in src]


def mirror_h(src):
    return [row[::-1] for row in src]


def shift_y(src, dy):
    """Shift content down by dy rows (clamps, does not wrap)."""
    result = blank(len(src[0]), len(src))
    for r in range(len(src)):
        nr = r + dy
        if 0 <= nr < len(result):
            result[nr] = src[r][:]
    return result


# ─── TILESET ─────────────────────────────────────────────────────────────────
# tileset_desert_oasis.png — 256×96  (16 cols × 6 rows, 16×16 tiles)
# 24 unique tile drawing functions → well over 20 required.
#
# Row 0: primary ground surfaces (8 variants)
# Row 1: elevated terrain / walls  (8 variants)
# Row 2: vegetation & landmarks    (8 variants)
# Row 3: water & oasis             (8 variants)
# Row 4: ruins & artifacts         (8 variants)
# Row 5: transitions & mixed       (8 variants)


def make_tile(draw_fn):
    g = blank(16, 16, K)
    draw_fn(g)
    return g


# ── Row 0: ground surfaces ────────────────────────────────────────────────────

def _t_flat_sand(g):
    """Plain flat sand."""
    rect(g, 0, 0, 16, 16, DS)
    for (x, y) in [(2, 3), (7, 1), (11, 5), (4, 9), (13, 7), (6, 13), (9, 11)]:
        dot(g, x, y, PS)
    for (x, y) in [(5, 6), (10, 3), (1, 12), (14, 10)]:
        dot(g, x, y, SN)


def _t_coarse_sand(g):
    """Coarse sand with pebble clusters."""
    rect(g, 0, 0, 16, 16, DS)
    for (x, y) in [(1, 2), (3, 4), (6, 1), (9, 3), (12, 2), (14, 5),
                   (2, 8), (5, 10), (8, 12), (11, 9), (13, 13), (4, 14)]:
        dot(g, x, y, SN)
    for (x, y) in [(4, 6), (8, 7), (12, 11), (2, 13)]:
        hline(g, x, y, 2, BN)


def _t_rippled_sand(g):
    """Wind-rippled sand with wave texture."""
    rect(g, 0, 0, 16, 16, DS)
    for y in [2, 5, 8, 11, 14]:
        hline(g, 0, y, 16, SN)
        hline(g, 1, y + 1, 14, PS)


def _t_dark_sand(g):
    """Shadowed/deep sand — walkable depression."""
    rect(g, 0, 0, 16, 16, SN)
    rect(g, 2, 2, 12, 12, DT)
    rect(g, 3, 3, 10, 10, SN)
    for (x, y) in [(4, 4), (9, 5), (6, 9), (11, 11)]:
        dot(g, x, y, DS)
    outline(g, 2, 2, 12, 12, BN)


def _t_dune_slope_left(g):
    """Left-facing dune slope."""
    rect(g, 0, 0, 16, 16, DS)
    wave = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    for x, top in enumerate(wave):
        if top > 0:
            rect(g, x, 0, 1, top, PS)
        hline(g, x, top, 1, NW)


def _t_dune_slope_right(g):
    """Right-facing dune slope."""
    rect(g, 0, 0, 16, 16, DS)
    wave = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    for x, top in enumerate(wave):
        if top > 0:
            rect(g, x, 0, 1, top, PS)
        hline(g, x, top, 1, NW)


def _t_dune_peak(g):
    """Dune peak — highlight ridge."""
    rect(g, 0, 0, 16, 16, DS)
    wave = [8, 6, 4, 2, 1, 0, 0, 1, 2, 4, 6, 8, 10, 11, 12, 13]
    for x, top in enumerate(wave):
        rect(g, x, top, 1, 16 - top, SN)
        dot(g, x, top, PS)


def _t_gravel(g):
    """Rocky gravel ground."""
    rect(g, 0, 0, 16, 16, DT)
    for (x, y) in [(1, 1), (4, 3), (7, 1), (10, 4), (13, 2),
                   (2, 7), (5, 9), (8, 6), (11, 8), (14, 7),
                   (0, 12), (3, 14), (6, 12), (9, 13), (12, 11), (15, 13)]:
        dot(g, x, y, SN)
    for (x, y) in [(3, 5), (9, 10), (13, 14)]:
        rect(g, x, y, 2, 2, BN)


# ── Row 1: walls and elevated terrain ────────────────────────────────────────

def _t_sandstone_wall(g):
    """Carved sandstone block wall."""
    rect(g, 0, 0, 16, 16, SN)
    for y in [4, 9]:
        hline(g, 0, y, 16, BN)
    for x in [4, 12]:
        vline(g, x, 0, 4, BN)
        vline(g, x, 9, 7, BN)
    for x in [8]:
        vline(g, x, 4, 5, BN)
    for (x, y) in [(1, 1), (5, 1), (9, 1), (13, 1),
                   (1, 10), (5, 10), (9, 10), (13, 10)]:
        dot(g, x, y, PS)


def _t_sandstone_pillar(g):
    """Isolated column / pillar section."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 4, 0, 8, 16, SN)
    rect(g, 5, 1, 6, 14, PS)
    for y in [3, 7, 11]:
        hline(g, 4, y, 8, BN)
    vline(g, 4, 0, 16, BN)
    vline(g, 11, 0, 16, BN)
    rect(g, 3, 0, 10, 2, SN)
    rect(g, 3, 14, 10, 2, SN)
    hline(g, 3, 0, 10, PS)
    hline(g, 3, 15, 10, BN)


def _t_sandstone_arch(g):
    """Arch / doorway base tile."""
    rect(g, 0, 0, 16, 16, SN)
    rect(g, 5, 0, 6, 16, K)      # arch opening
    rect(g, 4, 0, 1, 16, BN)     # left jamb
    rect(g, 11, 0, 1, 16, BN)    # right jamb
    hline(g, 4, 5, 8, BN)        # arch keystone hint
    dot(g, 7, 4, DS); dot(g, 8, 4, DS)


def _t_cracked_stone(g):
    """Worn sandstone floor with cracks."""
    rect(g, 0, 0, 16, 16, SN)
    # cracks
    for (x, y) in [(2, 2), (3, 3), (4, 3), (5, 4), (6, 5), (7, 6)]:
        dot(g, x, y, BN)
    for (x, y) in [(9, 8), (10, 9), (10, 10), (11, 11), (12, 12)]:
        dot(g, x, y, BN)
    for (x, y) in [(1, 10), (2, 11), (3, 11), (4, 10), (5, 9)]:
        dot(g, x, y, DT)
    for (x, y) in [(1, 1), (6, 2), (13, 3), (2, 9), (9, 14)]:
        dot(g, x, y, PS)


def _t_deep_rock(g):
    """Dark exposed bedrock outcrop."""
    rect(g, 0, 0, 16, 16, DT)
    rect(g, 2, 1, 12, 13, BN)
    rect(g, 3, 2, 10, 11, DT)
    for (x, y) in [(4, 3), (8, 4), (6, 8), (10, 7), (5, 12)]:
        dot(g, x, y, SN)
    outline(g, 2, 1, 12, 13, K)


def _t_loose_rocks(g):
    """Scattered loose rocks."""
    rect(g, 0, 0, 16, 16, DS)
    for (x, y, w, h) in [(1, 12, 4, 3), (7, 11, 3, 4), (11, 13, 4, 2),
                          (3, 8, 3, 3), (10, 7, 3, 3)]:
        rect(g, x, y, w, h, BN)
        dot(g, x, y, SN)
    for (x, y) in [(2, 4), (6, 6), (13, 5), (4, 2), (11, 3)]:
        dot(g, x, y, DT)


def _t_cliff_edge(g):
    """Cliff edge with shadow below."""
    rect(g, 0, 0, 16, 8, DS)
    rect(g, 0, 8, 16, 8, DT)
    hline(g, 0, 8, 16, SN)
    hline(g, 0, 9, 16, BN)
    for x in range(16):
        if x % 3 == 0:
            dot(g, x, 10, BN)


def _t_hieroglyph_wall(g):
    """Stone wall with carved hieroglyph symbols."""
    rect(g, 0, 0, 16, 16, SN)
    hline(g, 0, 0, 16, BN)
    hline(g, 0, 15, 16, BN)
    # eye of ra
    rect(g, 2, 3, 5, 3, DS)
    dot(g, 4, 4, K)
    hline(g, 3, 6, 4, BN)
    # ankh
    vline(g, 10, 3, 9, DT)
    hline(g, 8, 6, 5, DT)
    rect(g, 9, 3, 3, 3, DS)
    rect(g, 10, 3, 1, 3, K)
    dot(g, 10, 4, DS)
    # scarab outline
    rect(g, 1, 9, 5, 5, DT)
    rect(g, 2, 10, 3, 3, DS)
    dot(g, 3, 11, K)


# ── Row 2: vegetation & landmarks ────────────────────────────────────────────

def _t_cactus_tall(g):
    """Single tall saguaro cactus."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 7, 1, 2, 14, FG)
    rect(g, 8, 1, 1, 14, LG)
    rect(g, 4, 5, 4, 2, FG)
    dot(g, 4, 4, FG); dot(g, 4, 7, FG)
    rect(g, 8, 7, 4, 2, FG)
    dot(g, 11, 6, FG); dot(g, 11, 9, FG)
    dot(g, 7, 0, LG); dot(g, 8, 0, LG)
    hline(g, 5, 15, 6, SN)


def _t_cactus_wide(g):
    """Two-pronged barrel cactus pair."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 2, 6, 4, 9, FG)
    rect(g, 3, 5, 2, 2, LG)
    rect(g, 10, 7, 4, 8, FG)
    rect(g, 11, 6, 2, 2, LG)
    for x in [2, 4, 10, 12]:
        vline(g, x, 7, 6, DF)
    hline(g, 1, 15, 5, SN)
    hline(g, 9, 15, 5, SN)


def _t_palm_trunk(g):
    """Lower palm tree trunk tile."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 6, 0, 4, 16, BN)
    rect(g, 7, 0, 2, 16, DT)
    for y in [3, 7, 11]:
        hline(g, 6, y, 4, BD)
    for (x, y) in [(0, 13), (1, 14), (2, 15), (13, 13), (14, 14), (15, 15)]:
        dot(g, x, y, DT)


def _t_palm_canopy(g):
    """Palm canopy — leaf fronds at top."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 7, 12, 2, 4, BN)
    # fronds spreading outward
    for (sx, sy, ex, ey, c) in [
        (7, 10, 0, 4, FG), (7, 10, 3, 2, LG),
        (8, 10, 15, 4, FG), (8, 10, 12, 2, LG),
        (7, 9, 3, 7, FG), (8, 9, 12, 7, FG),
        (7, 8, 6, 3, LG), (8, 8, 9, 3, LG),
        (7, 10, 5, 12, FG), (8, 10, 10, 12, FG),
    ]:
        # draw line from start to end
        dx = ex - sx; dy = ey - sy
        steps = max(abs(dx), abs(dy))
        if steps == 0:
            continue
        for i in range(steps + 1):
            px = sx + round(dx * i / steps)
            py = sy + round(dy * i / steps)
            dot(g, px, py, c)
    dot(g, 7, 8, YL)   # coconut
    dot(g, 9, 9, GD)


def _t_desert_flower(g):
    """Rare flowering desert plant."""
    rect(g, 0, 0, 16, 16, DS)
    vline(g, 8, 6, 9, FG)
    rect(g, 6, 6, 4, 2, LG)
    # bloom
    dot(g, 8, 4, BR)
    dot(g, 7, 5, FR)
    dot(g, 9, 5, FR)
    dot(g, 8, 5, YL)
    dot(g, 6, 6, FL)
    dot(g, 10, 6, FL)
    hline(g, 6, 15, 4, SN)


def _t_scorpion_burrow(g):
    """Enemy spawn — dark pit with claw marks."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 4, 5, 8, 8, DT)
    rect(g, 5, 6, 6, 6, DK)
    rect(g, 6, 7, 4, 4, K)
    outline(g, 4, 5, 8, 8, BN)
    # claw marks
    for (x, y) in [(1, 3), (3, 1), (11, 2), (13, 4)]:
        dot(g, x, y, BN)
        dot(g, x + 1, y + 1, BN)


def _t_burial_mound(g):
    """Small burial mound / grave marker."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 2, 9, 12, 6, SN)
    rect(g, 3, 7, 10, 4, DT)
    rect(g, 4, 5, 8, 4, SN)
    rect(g, 5, 4, 6, 3, DS)
    hline(g, 3, 7, 10, BN)
    # cross/ankh marker
    vline(g, 8, 2, 5, BN)
    hline(g, 6, 3, 4, BN)


def _t_ankh_statue(g):
    """Small ankh statue on pedestal."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 5, 11, 6, 4, SN)
    rect(g, 6, 10, 4, 2, DT)
    hline(g, 5, 10, 6, BN)
    # ankh
    vline(g, 8, 3, 7, GD)
    hline(g, 6, 5, 4, GD)
    rect(g, 7, 3, 2, 3, GD)
    dot(g, 8, 4, DG)
    dot(g, 8, 3, YL)


# ── Row 3: water & oasis ─────────────────────────────────────────────────────

def _t_oasis_water(g):
    """Open oasis water surface."""
    rect(g, 0, 0, 16, 16, DP)
    rect(g, 1, 1, 14, 14, SB)
    rect(g, 2, 2, 12, 12, PB)
    for (x, y) in [(3, 4), (8, 3), (12, 6), (5, 9), (10, 11), (7, 13)]:
        hline(g, x, y, 3, HB)
    dot(g, 5, 6, IW); dot(g, 11, 8, IW)


def _t_oasis_shore(g):
    """Sandy shore meeting water edge."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 0, 9, 16, 7, DP)
    rect(g, 0, 10, 16, 6, SB)
    hline(g, 0, 9, 16, SN)
    hline(g, 0, 8, 16, PS)
    for (x, y) in [(2, 12), (7, 11), (12, 13)]:
        hline(g, x, y, 2, HB)


def _t_oasis_reeds(g):
    """Water tile with papyrus reeds."""
    rect(g, 0, 0, 16, 16, SB)
    rect(g, 0, 0, 16, 2, DP)
    for (x, ht) in [(2, 9), (5, 11), (9, 8), (13, 10)]:
        vline(g, x, 0, ht, FG)
        rect(g, x - 1, 0, 3, 2, LG)
    for (x, y) in [(3, 8), (6, 10), (10, 7)]:
        hline(g, x, y, 2, HB)


def _t_oasis_mud(g):
    """Muddy shore tile."""
    rect(g, 0, 0, 16, 16, BN)
    for (x, y) in [(1, 2), (4, 5), (8, 3), (11, 7), (14, 4),
                   (2, 10), (6, 12), (10, 11), (13, 14)]:
        rect(g, x, y, 2, 2, DT)
    for (x, y) in [(3, 8), (7, 1), (12, 9)]:
        dot(g, x, y, SB)


def _t_oasis_lily(g):
    """Water with lily pads."""
    rect(g, 0, 0, 16, 16, SB)
    for (cx, cy, r) in [(4, 5, 3), (11, 10, 3)]:
        rect(g, cx - r, cy - 2, r * 2, 4, LG)
        rect(g, cx - 1, cy - r, 2, r * 2, LG)
        dot(g, cx, cy, BR)
    for (x, y) in [(2, 12), (8, 3), (13, 7)]:
        hline(g, x, y, 2, HB)


def _t_shallow_water(g):
    """Very shallow water — sandy bottom visible."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 0, 0, 16, 16, (42, 122, 192, 140))  # semi-transparent SB
    # visible sandy bottom
    for (x, y) in [(2, 3), (6, 6), (10, 4), (13, 9), (4, 12)]:
        dot(g, x, y, PS)
    for (x, y) in [(4, 8), (9, 11), (1, 5)]:
        hline(g, x, y, 2, HB)


def _t_waterfall_top(g):
    """Oasis spring source — water bubbling up."""
    rect(g, 0, 0, 16, 16, SN)
    rect(g, 4, 4, 8, 8, DP)
    rect(g, 5, 5, 6, 6, SB)
    rect(g, 6, 6, 4, 4, HB)
    dot(g, 7, 7, IW); dot(g, 8, 8, IW)
    outline(g, 4, 4, 8, 8, BN)
    for (x, y) in [(6, 3), (9, 2), (7, 2)]:
        dot(g, x, y, HB)


# ── Row 4: ruins & artifacts ──────────────────────────────────────────────────

def _t_ruin_floor(g):
    """Excavated ruin floor with mosaic hints."""
    rect(g, 0, 0, 16, 16, DT)
    rect(g, 1, 1, 14, 14, SN)
    for y in [4, 9]:
        hline(g, 1, y, 14, DS)
    for x in [4, 9]:
        vline(g, x, 1, 14, DS)
    for (x, y, c) in [(2, 2, GD), (5, 2, ER), (10, 2, PB),
                      (2, 5, PB), (5, 5, GD), (10, 5, ER),
                      (2, 10, ER), (5, 10, PB), (10, 10, GD),
                      (2, 13, GD), (5, 13, ER), (10, 13, PB)]:
        dot(g, x, y, c)


def _t_ruin_wall(g):
    """Half-collapsed ruin wall."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 0, 4, 7, 12, SN)
    for y in [6, 10]:
        hline(g, 0, y, 7, BN)
    for x in [3]:
        vline(g, x, 4, 8, BN)
    rect(g, 8, 8, 7, 8, SN)
    for y in [11]:
        hline(g, 8, y, 7, BN)
    # broken top edge
    for (x, y) in [(0, 3), (1, 3), (2, 4), (4, 3), (6, 4)]:
        dot(g, x, y, SN)
    for (x, y) in [(8, 7), (9, 7), (11, 8), (13, 7), (15, 8)]:
        dot(g, x, y, SN)


def _t_pyramid_exterior(g):
    """Pyramid block face tile."""
    rect(g, 0, 0, 16, 16, SN)
    rect(g, 0, 0, 16, 2, PS)
    hline(g, 0, 2, 16, DT)
    for y in [5, 9, 13]:
        hline(g, 0, y, 16, BN)
    for x in [4, 8, 12]:
        vline(g, x, 2, 14, BN)
    for (x, y) in [(1, 3), (5, 3), (9, 3), (13, 3)]:
        dot(g, x, y, GD)


def _t_scarab_tile(g):
    """Decorative floor tile — scarab beetle motif."""
    rect(g, 0, 0, 16, 16, SN)
    outline(g, 0, 0, 16, 16, BN)
    rect(g, 5, 3, 6, 10, DG)
    rect(g, 6, 4, 4, 8, GD)
    # wings
    rect(g, 2, 6, 4, 5, DT)
    rect(g, 10, 6, 4, 5, DT)
    dot(g, 3, 5, SN); dot(g, 12, 5, SN)
    # head
    rect(g, 6, 2, 4, 3, DG)
    dot(g, 7, 2, K); dot(g, 8, 2, K)
    dot(g, 7, 1, GD); dot(g, 8, 1, GD)


# ── Row 5: transitions & mixed ────────────────────────────────────────────────

def _t_sand_grass_blend(g):
    """Desert-to-forest transition — sand fading into grass."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 0, 10, 16, 6, FG)
    hline(g, 0, 9, 16, LG)
    for x in range(0, 16, 2):
        vline(g, x, 6, 4, LG if x % 4 == 0 else BG)
    for (x, y) in [(1, 7), (4, 8), (7, 6), (11, 7), (14, 8)]:
        dot(g, x, y, FL)


def _t_sand_rock_blend(g):
    """Sand transitioning to rocky ground."""
    rect(g, 0, 0, 16, 16, DS)
    for (x, y, w, h) in [(0, 10, 6, 6), (5, 12, 5, 4), (10, 11, 6, 5)]:
        rect(g, x, y, w, h, DT)
    for (x, y) in [(1, 11), (4, 14), (8, 13), (12, 12), (14, 15)]:
        dot(g, x, y, SN)
    hline(g, 0, 10, 16, BN)


def _t_cracked_clay(g):
    """Dried cracked clay / lakebed."""
    rect(g, 0, 0, 16, 16, DT)
    # crack network
    for (pts, c) in [
        ([(0, 4), (3, 4), (5, 2), (8, 5), (10, 4), (13, 7), (15, 6)], BN),
        ([(2, 8), (4, 10), (7, 8), (9, 11), (12, 9), (15, 11)], BN),
        ([(0, 13), (3, 12), (6, 14), (9, 12), (11, 15), (14, 13)], BN),
    ]:
        for i in range(len(pts) - 1):
            x0, y0 = pts[i]; x1, y1 = pts[i + 1]
            dx = x1 - x0; dy = y1 - y0
            steps = max(abs(dx), abs(dy))
            for s in range(steps + 1):
                px = x0 + round(dx * s / steps)
                py = y0 + round(dy * s / steps)
                dot(g, px, py, c)
    for (x, y) in [(2, 2), (7, 6), (11, 3), (5, 11), (13, 14)]:
        dot(g, x, y, SN)


def _t_palm_shadow(g):
    """Ground shadow cast by palm tree."""
    rect(g, 0, 0, 16, 16, DS)
    rect(g, 0, 6, 14, 3, SN)
    rect(g, 0, 7, 13, 2, DT)
    rect(g, 4, 4, 8, 4, SN)
    rect(g, 5, 5, 6, 3, DT)
    for (x, y) in [(2, 3), (4, 3), (6, 4), (10, 5), (12, 6)]:
        dot(g, x, y, BN)


_TILESET_ROWS = [
    # Row 0: ground surfaces
    [_t_flat_sand, _t_flat_sand, _t_coarse_sand, _t_coarse_sand,
     _t_rippled_sand, _t_rippled_sand, _t_dark_sand, _t_dark_sand,
     _t_dune_slope_left, _t_dune_peak, _t_dune_slope_right, _t_gravel,
     _t_flat_sand, _t_coarse_sand, _t_rippled_sand, _t_gravel],
    # Row 1: walls and elevated terrain
    [_t_sandstone_wall, _t_sandstone_wall, _t_sandstone_pillar, _t_sandstone_arch,
     _t_cracked_stone, _t_cracked_stone, _t_deep_rock, _t_deep_rock,
     _t_loose_rocks, _t_loose_rocks, _t_cliff_edge, _t_hieroglyph_wall,
     _t_sandstone_wall, _t_cracked_stone, _t_deep_rock, _t_hieroglyph_wall],
    # Row 2: vegetation & landmarks
    [_t_cactus_tall, _t_cactus_tall, _t_cactus_wide, _t_cactus_wide,
     _t_palm_trunk, _t_palm_canopy, _t_desert_flower, _t_desert_flower,
     _t_scorpion_burrow, _t_scorpion_burrow, _t_burial_mound, _t_ankh_statue,
     _t_cactus_tall, _t_palm_canopy, _t_scorpion_burrow, _t_ankh_statue],
    # Row 3: water & oasis
    [_t_oasis_water, _t_oasis_water, _t_oasis_shore, _t_oasis_shore,
     _t_oasis_reeds, _t_oasis_reeds, _t_oasis_mud, _t_oasis_mud,
     _t_oasis_lily, _t_oasis_lily, _t_shallow_water, _t_waterfall_top,
     _t_oasis_water, _t_oasis_shore, _t_shallow_water, _t_waterfall_top],
    # Row 4: ruins & artifacts
    [_t_ruin_floor, _t_ruin_floor, _t_ruin_wall, _t_ruin_wall,
     _t_pyramid_exterior, _t_pyramid_exterior, _t_scarab_tile, _t_scarab_tile,
     _t_ruin_floor, _t_ruin_wall, _t_pyramid_exterior, _t_scarab_tile,
     _t_hieroglyph_wall, _t_ankh_statue, _t_burial_mound, _t_ruin_floor],
    # Row 5: transitions & mixed
    [_t_sand_grass_blend, _t_sand_grass_blend, _t_sand_rock_blend, _t_sand_rock_blend,
     _t_cracked_clay, _t_cracked_clay, _t_palm_shadow, _t_palm_shadow,
     _t_sand_grass_blend, _t_sand_rock_blend, _t_cracked_clay, _t_palm_shadow,
     _t_flat_sand, _t_sand_grass_blend, _t_cracked_clay, _t_gravel],
]


def gen_tileset_desert_oasis():
    rows = []
    for row_fns in _TILESET_ROWS:
        rows.append(hstack([make_tile(f) for f in row_fns]))
    sheet = vstack(rows)
    write_png(os.path.join(OUT_DIR, 'tileset_desert_oasis.png'), sheet)


# ─── ENEMY: SAND SCORPION ─────────────────────────────────────────────────────
# Fast melee attacker — brown/amber palette, compact body, raised tail stinger
# 16×24 frames × 12 = 192×24 strip
# Frame layout: idle 0-1, walk 2-5, attack 6-9, death 10-11


def _make_scorpion_base():
    g = blank(16, 24)
    # === body (abdomen) — lower half ===
    rect(g, 3, 13, 10, 7, BN)
    rect(g, 4, 14, 8, 5, DT)
    # segment lines
    for y in [15, 17]:
        hline(g, 3, y, 10, BD)
    # === carapace (cephalothorax) — upper body ===
    rect(g, 3, 7, 10, 7, SN)
    rect(g, 4, 8, 8, 5, DS)
    hline(g, 3, 7, 10, BN)
    hline(g, 3, 13, 10, BN)
    # === head / face ===
    rect(g, 5, 4, 6, 4, SN)
    rect(g, 6, 5, 4, 3, DS)
    # eyes (two pairs)
    dot(g, 6, 5, ER); dot(g, 9, 5, ER)
    dot(g, 7, 4, K);  dot(g, 8, 4, K)
    # === pincers / claws ===
    rect(g, 0, 9, 4, 4, BN)
    rect(g, 0, 9, 2, 3, DT)
    dot(g, 0, 12, SN); dot(g, 1, 13, SN)
    rect(g, 12, 9, 4, 4, BN)
    rect(g, 14, 9, 2, 3, DT)
    dot(g, 15, 12, SN); dot(g, 14, 13, SN)
    # === legs (simplified — 3 pairs shown) ===
    for (lx, rx, y) in [(1, 14, 11), (2, 13, 14), (2, 13, 17)]:
        dot(g, lx, y, BN); dot(g, lx - 1, y + 1, DT)
        dot(g, rx, y, BN); dot(g, rx + 1, y + 1, DT)
    # === tail arch — curving from abdomen up and over ===
    # segments: start from abdomen top, arc up and over to stinger above head
    for (x, y) in [(8, 12), (9, 10), (10, 8), (11, 6), (12, 4), (12, 2), (11, 1), (10, 0)]:
        dot(g, x, y, BN)
    for (x, y) in [(9, 12), (10, 10), (11, 8), (12, 6), (13, 4), (13, 2), (12, 1), (11, 0)]:
        dot(g, x, y, DT)
    # stinger tip
    dot(g, 12, 0, EM); dot(g, 13, 0, DS)
    # outline
    hline(g, 3, 4, 10, K)
    hline(g, 3, 7, 10, K)
    return g


def gen_enemy_sand_scorpion():
    base = _make_scorpion_base()
    frames = []
    # idle 0-1 — tail sways slightly
    frames.append(copy_frame(base))
    f1 = copy_frame(base)
    # shift stinger one pixel
    dot(f1, 13, 0, _); dot(f1, 12, 0, _)
    dot(f1, 13, 1, EM); dot(f1, 14, 1, DS)
    frames.append(f1)
    # walk 2-5 — legs shift, body bobs
    for i in range(4):
        fw = copy_frame(base)
        dy = 1 if i % 2 else 0
        # shift legs
        for (lx, rx, y) in [(1, 14, 11), (2, 13, 14), (2, 13, 17)]:
            dot(fw, lx, y + dy, BN); dot(fw, lx - 1, y + dy + 1, DT)
            dot(fw, rx, y - dy, BN); dot(fw, rx + 1, y - dy + 1, DT)
        frames.append(fw)
    # attack 6-9 — claws extend, tail strikes down
    for i in range(4):
        fa = copy_frame(base)
        # extend left claw
        ext = i
        rect(fa, 0, 9, 4, 4, _)
        rect(fa, max(0, -ext), 9, 4, 4, BN)
        rect(fa, max(0, -ext), 9, 2, 3, DT)
        # tail strike
        if i >= 2:
            dot(fa, 8, 3, EM); dot(fa, 9, 2, DS)
            if i == 3:
                dot(fa, 7, 4, EM)
        frames.append(fa)
    # death 10-11 — roll over
    fd0 = copy_frame(base)
    rect(fd0, 0, 18, 16, 6, _)
    rect(fd0, 1, 20, 14, 4, BD)
    frames.append(fd0)
    fd1 = blank(16, 24, _)
    rect(fd1, 2, 18, 12, 4, BD)
    rect(fd1, 3, 19, 10, 2, BN)
    for (x, y) in [(4, 22), (7, 23), (10, 22), (13, 23)]:
        dot(fd1, x, y, DT)
    frames.append(fd1)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'char_enemy_sand_scorpion.png'), sheet)


# ─── ENEMY: DESERT WRAITH ─────────────────────────────────────────────────────
# Ranged magical attacker — semi-transparent, robed sand-spirit
# 16×24 frames × 12 = 192×24 strip


def _make_wraith_base():
    g = blank(16, 24)
    # === wispy tail / lower body (semi-transparent) ===
    for y in range(16, 24):
        alpha = max(0, 220 - (y - 16) * 28)
        wa = (212, 168, 90, alpha)
        w_dim = max(2, 12 - (y - 16) * 1)
        x_off = (16 - w_dim) // 2
        rect(g, x_off, y, w_dim, 1, wa)
    # === robe body ===
    rect(g, 3, 9, 10, 8, WA1)
    rect(g, 4, 10, 8, 6, WA2)
    # flowing robe edge detail
    for (x, y) in [(3, 9), (12, 9), (2, 12), (13, 12), (3, 15), (12, 15)]:
        dot(g, x, y, WA3)
    # === arms — reaching outward ===
    rect(g, 1, 11, 3, 3, WA3)
    rect(g, 12, 11, 3, 3, WA3)
    # ghostly hands
    dot(g, 0, 13, WA2); dot(g, 1, 14, WA2)
    dot(g, 15, 13, WA2); dot(g, 14, 14, WA2)
    # === hood / head ===
    rect(g, 4, 3, 8, 7, WA1)
    rect(g, 5, 4, 6, 5, WA3)
    # glowing eyes
    dot(g, 6, 6, YL); dot(g, 9, 6, YL)
    dot(g, 6, 7, GD); dot(g, 9, 7, GD)
    # hood shadow
    rect(g, 4, 3, 8, 2, WA3)
    dot(g, 5, 5, K); dot(g, 10, 5, K)
    # outline — just top/sides of hood
    hline(g, 4, 3, 8, K)
    vline(g, 4, 3, 9, K)
    vline(g, 11, 3, 9, K)
    return g


def gen_enemy_desert_wraith():
    base = _make_wraith_base()
    frames = []
    # idle 0-1 — float/hover bob
    frames.append(copy_frame(base))
    f1 = shift_y(base, -1)
    for (x, y) in [(6, 6), (9, 6)]:
        dot(f1, x, y, (255, 220, 64, 255))  # brighter eye pulse
    frames.append(f1)
    # walk/glide 2-5 — undulate robes
    for i in range(4):
        fw = copy_frame(base)
        dy = (i % 2)
        # shift wispy tail up/down
        if dy:
            for y in range(16, 24):
                fw[y] = [_] * 16
            for y in range(15, 23):
                alpha = max(0, 220 - (y - 15) * 28)
                wa = (212, 168, 90, alpha)
                w_dim = max(2, 12 - (y - 15) * 1)
                x_off = (16 - w_dim) // 2
                for x in range(x_off, x_off + w_dim):
                    fw[y][x] = wa
        frames.append(fw)
    # attack 6-9 — charge sand orb then launch
    for i in range(4):
        fa = copy_frame(base)
        # orb appears in front of hand
        if i >= 1:
            orb_x = max(0, 13 - i * 2)
            orb_y = 12
            dot(fa, orb_x, orb_y, DS)
            if i >= 2:
                dot(fa, orb_x - 1, orb_y, SN)
                dot(fa, orb_x + 1, orb_y, PS)
            if i == 3:
                dot(fa, orb_x - 2, orb_y, DS)
                dot(fa, orb_x, orb_y - 1, PS)
        frames.append(fa)
    # death 10-11 — dissipate
    fd0 = copy_frame(base)
    # fade lower half
    for y in range(12, 24):
        for x in range(16):
            r, gr, b, a = fd0[y][x]
            fd0[y][x] = (r, gr, b, max(0, a - 100))
    frames.append(fd0)
    fd1 = blank(16, 24, _)
    # only sparkling dust remains
    for (x, y) in [(3, 10), (7, 8), (11, 12), (5, 15), (9, 6), (13, 14)]:
        dot(fd1, x, y, DS)
        dot(fd1, x + 1, y - 1, PS)
    frames.append(fd1)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'char_enemy_desert_wraith.png'), sheet)


# ─── ENEMY: SANDSTONE GOLEM ───────────────────────────────────────────────────
# Slow tank — rocky beige/brown palette, blocky build
# 16×24 frames × 12 = 192×24 strip


def _make_golem_base():
    g = blank(16, 24)
    # === feet / base ===
    rect(g, 1, 20, 6, 4, DT)
    rect(g, 9, 20, 6, 4, DT)
    dot(g, 1, 23, BN); dot(g, 6, 23, BN)
    dot(g, 9, 23, BN); dot(g, 14, 23, BN)
    # === legs ===
    rect(g, 2, 15, 5, 6, SN)
    rect(g, 9, 15, 5, 6, SN)
    rect(g, 3, 16, 3, 5, DS)
    rect(g, 10, 16, 3, 5, DS)
    # === body (massive) ===
    rect(g, 1, 7, 14, 9, SN)
    rect(g, 2, 8, 12, 7, DS)
    rect(g, 3, 9, 10, 5, PS)
    # chest crack pattern
    for (x, y) in [(5, 9), (6, 10), (7, 11), (8, 10), (9, 9)]:
        dot(g, x, y, BN)
    # === arms (stone slabs) ===
    rect(g, 0, 8, 2, 9, SN)
    rect(g, 14, 8, 2, 9, SN)
    # fists
    rect(g, 0, 16, 3, 4, DT)
    rect(g, 13, 16, 3, 4, DT)
    # === head (square, helmeted look) ===
    rect(g, 2, 1, 12, 7, SN)
    rect(g, 3, 2, 10, 5, DS)
    rect(g, 4, 3, 8, 3, PS)
    # glowing eyes
    dot(g, 5, 4, GD); dot(g, 10, 4, GD)
    dot(g, 5, 5, DG); dot(g, 10, 5, DG)
    # brow ridge
    hline(g, 3, 3, 10, DT)
    # rocky texture dots
    for (x, y) in [(4, 9), (8, 12), (12, 10), (3, 14), (13, 13)]:
        dot(g, x, y, BN)
    # outlines
    hline(g, 2, 1, 12, K)
    hline(g, 1, 7, 14, K)
    hline(g, 1, 15, 14, K)
    return g


def gen_enemy_sandstone_golem():
    base = _make_golem_base()
    frames = []
    # idle 0-1 — barely moves, slow rock shift
    frames.append(copy_frame(base))
    f1 = copy_frame(base)
    dot(f1, 5, 4, (200, 180, 0, 255))  # eye flicker
    dot(f1, 10, 4, (200, 180, 0, 255))
    frames.append(f1)
    # walk 2-5 — heavy stomp, body shifts
    for i in range(4):
        fw = copy_frame(base)
        dy = 1 if i % 2 else 0
        if dy:
            # shift right leg down one, left leg up
            for y in range(15, 24):
                fw[y][2:7] = base[max(0, y - 1)][2:7]
                fw[y][9:14] = base[min(23, y + 1)][9:14] if y + 1 < 24 else [_] * 5
        frames.append(fw)
    # attack 6-9 — ground pound with right fist
    for i in range(4):
        fa = copy_frame(base)
        arm_dy = min(6, i * 2)
        # lower right arm
        rect(fa, 14, 8, 2, 9, _)
        rect(fa, 13, 16, 3, 4, _)
        rect(fa, 14, 8 + arm_dy, 2, 9, SN)
        rect(fa, 13, 16 + arm_dy, 3, 4, DT)
        if i == 3:
            # ground crack
            for (x, y) in [(12, 23), (13, 23), (14, 23), (15, 23)]:
                dot(fa, x, y, K)
        frames.append(fa)
    # death 10-11 — crumble
    fd0 = copy_frame(base)
    # chunks break off bottom
    rect(fd0, 0, 18, 16, 6, _)
    for (x, y, c) in [(2, 20, SN), (5, 21, DS), (9, 19, SN),
                      (12, 22, DT), (7, 23, BN)]:
        dot(fd0, x, y, c)
    frames.append(fd0)
    fd1 = blank(16, 24, _)
    rect(fd1, 1, 18, 14, 6, _)
    for (x, y, c) in [(1, 20, SN), (4, 19, DS), (7, 21, SN), (10, 18, DT),
                      (13, 20, BN), (3, 22, PS), (8, 23, DT), (12, 21, SN),
                      (6, 18, BN), (11, 23, DS)]:
        dot(fd1, x, y, c)
    frames.append(fd1)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'char_enemy_sandstone_golem.png'), sheet)


# ─── BOSS: PHARAOH SHADE ──────────────────────────────────────────────────────
# 32×32 frames × 12 = 384×32 strip
# Gold + dark blue palette, staff weapon, nemes headdress
# Frame layout: idle 0-1, hover 2-5, attack 6-9, death 10-11


def _make_pharaoh_base():
    g = blank(32, 32)
    # === lower body / ghostly tail ===
    for y in range(22, 32):
        alpha = max(0, 240 - (y - 22) * 24)
        wa = (26, 74, 138, alpha)  # dark blue wisp
        w_dim = max(2, 14 - (y - 22) * 1)
        x_off = (32 - w_dim) // 2
        rect(g, x_off, y, w_dim, 1, wa)
    # === robes / body ===
    rect(g, 8, 12, 16, 12, DP)
    rect(g, 9, 13, 14, 10, OC)
    # gold trim on robe
    hline(g, 8, 12, 16, GD)
    hline(g, 8, 22, 16, GD)
    for y in range(12, 23, 3):
        hline(g, 8, y, 2, GD)
        hline(g, 22, y, 2, GD)
    # === arms ===
    rect(g, 4, 13, 5, 6, DP)
    rect(g, 23, 13, 5, 6, DP)
    # hands
    rect(g, 4, 18, 4, 3, OC)
    rect(g, 24, 18, 4, 3, OC)
    # === staff (held in right hand) ===
    vline(g, 27, 2, 20, DG)
    vline(g, 28, 2, 20, GD)
    # staff head — crook + flail
    rect(g, 24, 2, 5, 3, GD)
    rect(g, 24, 2, 5, 1, YL)
    rect(g, 24, 4, 2, 2, DG)
    dot(g, 23, 2, GD)
    # === torso / collar ===
    rect(g, 9, 10, 14, 4, OC)
    rect(g, 10, 11, 12, 3, DP)
    # broad collar / usekh
    rect(g, 8, 10, 16, 2, GD)
    for x in range(9, 23):
        dot(g, x, 10, GD if x % 2 == 0 else DG)
    dot(g, 9, 11, DG); dot(g, 22, 11, DG)
    # === head ===
    rect(g, 10, 3, 12, 8, OC)
    rect(g, 11, 4, 10, 6, DP)
    # === nemes headdress (striped blue+gold) ===
    rect(g, 8, 1, 16, 5, GD)
    rect(g, 8, 2, 16, 3, DP)
    for x in range(8, 24, 2):
        dot(g, x, 1, GD)
        dot(g, x, 3, GD)
    # side lappets of nemes
    rect(g, 8, 5, 3, 6, GD)
    rect(g, 8, 5, 3, 3, DP)
    rect(g, 21, 5, 3, 6, GD)
    rect(g, 21, 5, 3, 3, DP)
    # double crown / atef tip
    rect(g, 13, 0, 6, 2, GD)
    rect(g, 14, 0, 4, 1, YL)
    dot(g, 15, 0, PY); dot(g, 16, 0, PY)
    # === face ===
    rect(g, 11, 5, 10, 5, (60, 40, 80, 255))  # ghostly purple-dark skin
    # glowing golden eyes
    rect(g, 12, 6, 2, 2, GD)
    rect(g, 18, 6, 2, 2, GD)
    dot(g, 12, 6, YL); dot(g, 13, 6, DG)
    dot(g, 18, 6, YL); dot(g, 19, 6, DG)
    dot(g, 12, 7, DG); dot(g, 18, 7, DG)
    # dark hollow beneath eyes
    hline(g, 12, 8, 8, OC)
    # ceremonial beard (khat)
    rect(g, 14, 9, 4, 2, GD)
    rect(g, 14, 10, 4, 1, DG)
    dot(g, 15, 11, GD); dot(g, 16, 11, GD)
    # outline
    hline(g, 10, 3, 12, K)
    hline(g, 8, 12, 16, K)
    return g


def gen_boss_pharaoh_shade():
    base = _make_pharaoh_base()
    frames = []
    # idle 0-1 — crown glows, tail sways
    frames.append(copy_frame(base))
    f1 = copy_frame(base)
    dot(f1, 15, 0, (255, 255, 200, 255))
    dot(f1, 16, 0, (255, 255, 200, 255))
    # darken tail slightly
    for y in range(24, 32):
        for x in range(32):
            r, gr, b, a = f1[y][x]
            if a > 0:
                f1[y][x] = (r, gr, b, min(255, a + 20))
    frames.append(f1)
    # hover 2-5 — float up and down
    for i in range(4):
        fw = copy_frame(base)
        shift = 1 if i % 2 == 0 else -1
        # bob staff
        vline(fw, 27, 2, 20, _)
        vline(fw, 28, 2, 20, _)
        rect(fw, 24, 2, 5, 3, _)
        staff_dy = shift
        vline(fw, 27, 2 + staff_dy, 20, DG)
        vline(fw, 28, 2 + staff_dy, 20, GD)
        rect(fw, 24, 2 + staff_dy, 5, 3, GD)
        rect(fw, 24, 2 + staff_dy, 5, 1, YL)
        rect(fw, 24, 4 + staff_dy, 2, 2, DG)
        frames.append(fw)
    # attack 6-9 — raise staff, beam fires
    for i in range(4):
        fa = copy_frame(base)
        # raise staff high
        rect(fa, 24, 0, 6, 22, _)
        staff_y = max(0, 2 - i)
        vline(fa, 27, staff_y, 20, DG)
        vline(fa, 28, staff_y, 20, GD)
        rect(fa, 24, staff_y, 5, 3, GD)
        rect(fa, 24, staff_y, 5, 1, YL)
        # beam from staff head
        if i >= 2:
            for bx in range(0, i * 3):
                if bx < 32:
                    dot(fa, bx, staff_y + 1, YL if bx % 2 == 0 else GD)
        if i == 3:
            # full golden beam
            hline(fa, 0, staff_y + 1, 24, YL)
            hline(fa, 0, staff_y, 24, GD)
        frames.append(fa)
    # death 10-11 — shatters into gold particles
    fd0 = copy_frame(base)
    rect(fd0, 0, 20, 32, 12, _)
    rect(fd0, 4, 16, 24, 6, _)
    for (x, y) in [(5, 20), (10, 22), (16, 19), (21, 21), (27, 20)]:
        dot(fd0, x, y, GD)
    frames.append(fd0)
    fd1 = blank(32, 32, _)
    for (x, y, c) in [(2, 15, GD), (6, 18, YL), (10, 12, GD), (14, 20, DG),
                      (18, 14, YL), (22, 17, GD), (26, 11, YL), (29, 19, DG),
                      (4, 22, GD), (12, 25, YL), (20, 23, DG), (28, 24, GD),
                      (7, 9, YL), (16, 8, GD), (24, 10, YL)]:
        dot(fd1, x, y, c)
    frames.append(fd1)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'char_boss_pharaoh_shade.png'), sheet)


# ─── LOOT ICONS ───────────────────────────────────────────────────────────────
# All 16×16, transparent background

def gen_icon_scimitar():
    """Curved desert scimitar."""
    g = blank(16, 16)
    # blade — curving from handle to tip
    for (x, y) in [(12, 1), (11, 2), (10, 3), (9, 4), (8, 5),
                   (7, 6), (6, 7), (5, 8), (5, 9), (6, 10), (7, 11)]:
        dot(g, x, y, NW)
    for (x, y) in [(13, 1), (12, 2), (11, 3), (10, 4), (9, 5),
                   (8, 6), (7, 7), (6, 8), (6, 9), (7, 10), (8, 11)]:
        dot(g, x, y, LS)
    # edge glint
    dot(g, 12, 1, PY); dot(g, 6, 9, HB)
    # crossguard
    hline(g, 7, 12, 4, GD)
    hline(g, 7, 12, 4, GD)
    dot(g, 7, 11, DG); dot(g, 10, 11, DG)
    # handle
    rect(g, 5, 12, 4, 3, BN)
    rect(g, 6, 13, 2, 2, DT)
    # pommel
    rect(g, 5, 14, 4, 2, GD)
    dot(g, 7, 15, YL)
    write_png(os.path.join(OUT_DIR, 'icon_item_scimitar.png'), g)


def gen_icon_desert_robes():
    """Desert traveller robes — clothing icon."""
    g = blank(16, 16)
    # main robe body
    rect(g, 3, 5, 10, 10, DS)
    rect(g, 4, 6, 8, 8, SN)
    # sleeves
    rect(g, 1, 5, 3, 5, DS)
    rect(g, 12, 5, 3, 5, DS)
    # collar / neck opening
    rect(g, 6, 4, 4, 3, PS)
    rect(g, 7, 3, 2, 2, BN)
    # hood
    rect(g, 4, 1, 8, 5, SN)
    rect(g, 5, 2, 6, 3, DS)
    hline(g, 4, 1, 8, PS)
    # gold trim
    hline(g, 3, 5, 10, GD)
    hline(g, 3, 14, 10, GD)
    for (x, y) in [(3, 7), (3, 10), (3, 13), (12, 7), (12, 10), (12, 13)]:
        dot(g, x, y, DG)
    # outline
    outline(g, 3, 5, 10, 10, K)
    write_png(os.path.join(OUT_DIR, 'icon_item_desert_robes.png'), g)


def gen_icon_sand_amulet():
    """Sand amulet — teardrop with eye-of-ra glyph."""
    g = blank(16, 16)
    # pendant chain
    hline(g, 4, 1, 8, DG)
    dot(g, 3, 2, DG); dot(g, 12, 2, DG)
    # teardrop amulet body
    rect(g, 5, 3, 6, 8, GD)
    rect(g, 6, 4, 4, 6, DS)
    # teardrop tip (pointing down)
    dot(g, 7, 11, GD); dot(g, 8, 11, GD)
    dot(g, 8, 12, DG)
    # eye of ra glyph inside
    rect(g, 6, 5, 4, 2, DG)
    dot(g, 7, 6, K); dot(g, 8, 6, K)
    dot(g, 6, 5, GD); dot(g, 9, 5, GD)
    # kohl line under eye
    hline(g, 6, 7, 4, BN)
    dot(g, 5, 8, BN)
    # highlight
    dot(g, 6, 4, YL); dot(g, 9, 4, YL)
    dot(g, 6, 4, PY)
    # gem center
    dot(g, 7, 9, ER); dot(g, 8, 9, BR)
    # outline
    outline(g, 5, 3, 6, 9, K)
    write_png(os.path.join(OUT_DIR, 'icon_item_sand_amulet.png'), g)


def gen_icon_oasis_potion():
    """Oasis healing potion — blue-green flask."""
    g = blank(16, 16)
    # flask body (wider bottom)
    rect(g, 4, 6, 8, 8, SB)
    rect(g, 5, 7, 6, 6, PB)
    # liquid fill line
    hline(g, 4, 9, 8, DP)
    # liquid — blue-green oasis colour
    rect(g, 5, 10, 6, 4, (64, 200, 160, 255))
    dot(g, 6, 11, AQ if 'AQ' in dir() else (64, 220, 200, 255))
    dot(g, 9, 12, (64, 220, 200, 255))
    # highlight bubble
    dot(g, 6, 8, HB)
    dot(g, 5, 7, IW)
    # neck
    rect(g, 6, 4, 4, 3, SB)
    rect(g, 7, 3, 2, 2, HB)
    # cork
    rect(g, 6, 2, 4, 2, DT)
    rect(g, 7, 1, 2, 1, SN)
    # outline
    outline(g, 4, 6, 8, 8, K)
    hline(g, 6, 4, 4, K)
    write_png(os.path.join(OUT_DIR, 'icon_pickup_oasis_potion.png'), g)


# ─── DESERT BACKGROUNDS ───────────────────────────────────────────────────────

def gen_bg_desert_sky():
    """320×60 warm dusk gradient sky with sun disc."""
    g = blank(320, 60)
    # gradient: deep purple zenith → warm orange horizon
    sky_grad = [
        (80, 30, 70),    # 0 — deep purple zenith
        (90, 35, 80),
        (110, 45, 85),
        (130, 55, 90),
        (150, 65, 70),
        (170, 80, 50),   # ~10
        (190, 100, 40),
        (205, 120, 35),
        (215, 140, 35),
        (225, 155, 40),
        (235, 165, 50),  # ~20
        (240, 175, 55),
        (245, 185, 60),
        (248, 195, 70),
        (250, 205, 80),
        (252, 215, 90),  # ~30
        (253, 220, 95),
        (254, 225, 100),
        (255, 228, 105),
        (255, 230, 110),
        (255, 232, 115), # ~40
        (255, 235, 118),
        (255, 237, 120),
        (255, 238, 122),
        (255, 239, 124),
        (255, 240, 126), # ~50
        (255, 240, 128),
        (255, 241, 130),
        (255, 241, 132),
        (255, 242, 134),
        (255, 242, 136), # ~60
    ]
    for y in range(60):
        r, gr, b = sky_grad[min(y, len(sky_grad) - 1)]
        hline(g, 0, y, 320, (r, gr, b, 255))
    # sun disc near horizon, slightly left of centre
    sun_x, sun_y, sun_r = 90, 48, 8
    for dy in range(-sun_r, sun_r + 1):
        for dx in range(-sun_r, sun_r + 1):
            if dx * dx + dy * dy <= sun_r * sun_r:
                dot(g, sun_x + dx, sun_y + dy, (255, 248, 200, 255))
    # inner sun
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            if dx * dx + dy * dy <= 16:
                dot(g, sun_x + dx, sun_y + dy, (255, 255, 240, 255))
    # sun rays (8-directional)
    for angle_deg in range(0, 360, 45):
        import math
        angle = math.radians(angle_deg)
        for r in range(sun_r + 1, sun_r + 6):
            rx = int(sun_x + math.cos(angle) * r)
            ry = int(sun_y + math.sin(angle) * r)
            if 0 <= rx < 320 and 0 <= ry < 60:
                dot(g, rx, ry, (255, 240, 160, 200))
    # scattered stars in upper sky
    star_positions = [(10, 5), (45, 3), (80, 8), (120, 2), (160, 6),
                      (200, 4), (240, 7), (280, 3), (300, 9), (30, 12),
                      (150, 11), (270, 13), (310, 5), (55, 1), (190, 2)]
    for (sx, sy) in star_positions:
        if sy < 20:
            dot(g, sx, sy, (255, 255, 255, 200))
    write_png(os.path.join(OUT_DIR, 'bg_desert_sky.png'), g)


def gen_bg_desert_dunes_far():
    """320×60 distant dune silhouettes — muted purple/mauve."""
    g = blank(320, 60)
    # fill with transparent (layer composites over sky)
    # gentle dune profile — long rolling waves
    dune_profile = []
    import math
    for x in range(320):
        # combine two sine waves for natural dune shape
        h = (math.sin(x * 0.018) * 12 + math.sin(x * 0.031 + 1.2) * 8 +
             math.sin(x * 0.009 - 0.5) * 6)
        dune_profile.append(int(25 - h))
    # draw filled dune silhouette (muted dusty mauve/brown)
    DUNE_FAR = (160, 110, 90, 255)
    DUNE_FAR2 = (140, 95, 78, 255)
    for x in range(320):
        top = max(0, dune_profile[x])
        for y in range(top, 60):
            g[y][x] = DUNE_FAR
        if top < 60:
            g[top][x] = (180, 130, 110, 255)   # ridge highlight
    # second layer of smaller dunes in front
    for x in range(320):
        h2 = (math.sin(x * 0.025 + 2) * 8 + math.sin(x * 0.04 - 1) * 5)
        top2 = int(42 - h2)
        top2 = max(0, top2)
        for y in range(top2, 60):
            g[y][x] = DUNE_FAR2
        if top2 < 60:
            g[top2][x] = (155, 108, 88, 255)
    write_png(os.path.join(OUT_DIR, 'bg_desert_dunes_far.png'), g)


def gen_bg_desert_dunes_near():
    """320×80 near dunes with heat shimmer suggestion."""
    g = blank(320, 80)
    import math
    # near dune surface
    DUNE_NEAR = (212, 168, 90, 255)
    DUNE_SHADOW = (184, 132, 63, 255)
    DUNE_HIGHLIGHT = (240, 210, 140, 255)
    # main dune surface profile
    near_profile = []
    for x in range(320):
        h = (math.sin(x * 0.022) * 18 + math.sin(x * 0.045 + 0.8) * 10 +
             math.sin(x * 0.011 - 1.5) * 8)
        near_profile.append(int(30 - h))
    for x in range(320):
        top = max(0, near_profile[x])
        for y in range(top, 80):
            shade = DUNE_SHADOW if y > top + 8 else DUNE_NEAR
            g[y][x] = shade
        if top < 80:
            g[top][x] = DUNE_HIGHLIGHT
        # shadow on lee side of dune
        if x > 0 and near_profile[x] > near_profile[x - 1]:
            for y in range(near_profile[x], min(80, near_profile[x] + 6)):
                g[y][x] = DUNE_SHADOW
    # heat shimmer at horizon — thin wavy line of pale colour
    for x in range(320):
        shimmer_y = near_profile[x] - 1
        if 0 <= shimmer_y < 80:
            alpha = 160 + int(math.sin(x * 0.1) * 40)
            g[shimmer_y][x] = (255, 245, 200, min(255, alpha))
    # scattered surface details: ripple lines
    for x in range(0, 320, 3):
        ripple_top = near_profile[x] + 4
        if ripple_top < 78:
            hline(g, x, ripple_top, 2, (200, 155, 75, 255))
    # small cactus silhouettes in distance (simplified)
    for cx in [30, 95, 175, 255, 305]:
        cactus_y = near_profile[cx % 320]
        rect(g, cx, cactus_y - 12, 2, 12, (100, 140, 80, 255))
        hline(g, cx - 2, cactus_y - 8, 3, (100, 140, 80, 255))
        hline(g, cx + 2, cactus_y - 6, 3, (100, 140, 80, 255))
    write_png(os.path.join(OUT_DIR, 'bg_desert_dunes_near.png'), g)


# ─── TRANSITION TILESET ───────────────────────────────────────────────────────
# tileset_desert_forest_transition.png — 256×32 (16 cols × 2 rows)
# Top row: desert-side transition pieces
# Bottom row: forest-side transition pieces

def gen_tileset_desert_forest_transition():
    def _t_sand_to_mud(g):
        rect(g, 0, 0, 16, 8, DS)
        rect(g, 0, 8, 16, 8, BN)
        hline(g, 0, 8, 16, DT)
        for x in range(0, 16, 3):
            dot(g, x, 7, SN)

    def _t_sand_to_dirt(g):
        rect(g, 0, 0, 16, 16, DS)
        for y in range(8, 16):
            blend = (y - 8) / 8.0
            r = int(DS[0] * (1 - blend) + BD[0] * blend)
            gr = int(DS[1] * (1 - blend) + BD[1] * blend)
            b = int(DS[2] * (1 - blend) + BD[2] * blend)
            hline(g, 0, y, 16, (r, gr, b, 255))

    def _t_sand_grass_corner_tl(g):
        rect(g, 0, 0, 16, 16, DS)
        for y in range(8, 16):
            for x in range(0, 16 - y + 8):
                g[y][x] = FG

    def _t_sand_grass_corner_tr(g):
        rect(g, 0, 0, 16, 16, DS)
        for y in range(8, 16):
            for x in range(y - 8, 16):
                g[y][x] = FG

    def _t_sand_grass_h_strip(g):
        rect(g, 0, 0, 16, 8, DS)
        rect(g, 0, 8, 16, 8, FG)
        hline(g, 0, 8, 16, LG)
        for x in range(0, 16, 2):
            vline(g, x, 6, 3, LG if x % 4 == 0 else BG)

    def _t_sand_grass_v_strip(g):
        rect(g, 0, 0, 8, 16, DS)
        rect(g, 8, 0, 8, 16, FG)
        vline(g, 8, 0, 16, LG)
        for y in range(0, 16, 2):
            hline(g, 6, y, 3, LG if y % 4 == 0 else BG)

    def _t_dry_grass(g):
        rect(g, 0, 0, 16, 16, DS)
        for (x, y, h) in [(2, 13, 3), (4, 12, 4), (7, 11, 5),
                          (10, 12, 4), (13, 13, 3), (1, 14, 2), (6, 10, 6)]:
            vline(g, x, y - h, h, FL)
            dot(g, x - 1, y - h, YL)

    def _t_desert_shrub(g):
        rect(g, 0, 0, 16, 16, DS)
        rect(g, 4, 10, 8, 5, BN)
        rect(g, 3, 7, 10, 6, FG)
        rect(g, 4, 6, 8, 5, LG)
        rect(g, 5, 5, 6, 3, BG)
        dot(g, 7, 4, FL); dot(g, 8, 4, FL)

    def _t_fallen_palm(g):
        rect(g, 0, 0, 16, 16, DS)
        for i in range(8):
            dot(g, i * 2, 8 + i // 2, BN)
            dot(g, i * 2 + 1, 8 + i // 2, DT)
        hline(g, 0, 14, 8, FG)
        hline(g, 0, 15, 6, DF)

    def _t_moss_on_sand(g):
        rect(g, 0, 0, 16, 16, DS)
        for (x, y) in [(2, 3), (6, 5), (10, 2), (14, 6),
                       (1, 9), (5, 11), (9, 8), (13, 12),
                       (3, 14), (8, 13), (12, 15)]:
            dot(g, x, y, FG)
            dot(g, x + 1, y, LG)

    def _t_dirt_path(g):
        rect(g, 0, 0, 16, 16, FG)
        rect(g, 3, 0, 10, 16, DT)
        rect(g, 4, 0, 8, 16, SN)
        hline(g, 3, 0, 10, BN)
        for (x, y) in [(5, 3), (8, 7), (6, 11), (9, 14)]:
            dot(g, x, y, DS)

    def _t_root_on_sand(g):
        rect(g, 0, 0, 16, 16, DS)
        for (x, y) in [(1, 15), (2, 14), (3, 13), (4, 12), (5, 11),
                       (6, 10), (7, 10), (8, 11), (9, 12)]:
            dot(g, x, y, BD)
            dot(g, x + 1, y, BN)
        for (x, y) in [(10, 12), (11, 11), (12, 10), (13, 9)]:
            dot(g, x, y, BD)

    def _t_forest_floor_edge(g):
        rect(g, 0, 0, 16, 16, FG)
        rect(g, 0, 8, 16, 8, DF)
        hline(g, 0, 8, 16, LG)
        for (x, y) in [(2, 9), (5, 10), (9, 9), (12, 11), (7, 12), (14, 10)]:
            dot(g, x, y, FL)

    def _t_forest_undergrowth(g):
        rect(g, 0, 0, 16, 16, DF)
        rect(g, 0, 0, 16, 12, FG)
        for (x, y, h) in [(1, 7, 5), (4, 5, 7), (7, 8, 4),
                          (10, 6, 6), (13, 7, 5)]:
            vline(g, x, y - h, h, LG)
            dot(g, x, y - h - 1, BG)

    def _t_oasis_grass_blend(g):
        rect(g, 0, 0, 16, 16, SB)
        rect(g, 0, 10, 16, 6, FG)
        hline(g, 0, 10, 16, LG)
        rect(g, 0, 0, 16, 4, SB)
        for (x, y) in [(2, 8), (5, 7), (8, 9), (11, 8), (14, 7)]:
            dot(g, x, y, BG)

    row_top_fns = [
        _t_sand_to_mud, _t_sand_to_dirt, _t_sand_grass_corner_tl,
        _t_sand_grass_corner_tr, _t_sand_grass_h_strip, _t_sand_grass_v_strip,
        _t_dry_grass, _t_desert_shrub, _t_fallen_palm, _t_moss_on_sand,
        _t_dirt_path, _t_root_on_sand, _t_forest_floor_edge,
        _t_forest_undergrowth, _t_oasis_grass_blend, _t_sand_grass_h_strip,
    ]
    row_top = hstack([make_tile(f) for f in row_top_fns])
    # Bottom row: mirror/variation
    row_bot_fns = [
        _t_sand_grass_h_strip, _t_sand_grass_v_strip, _t_sand_to_dirt,
        _t_sand_to_mud, _t_dry_grass, _t_desert_shrub, _t_moss_on_sand,
        _t_dirt_path, _t_root_on_sand, _t_fallen_palm, _t_forest_floor_edge,
        _t_forest_undergrowth, _t_oasis_grass_blend, _t_sand_grass_corner_tl,
        _t_sand_grass_corner_tr, _t_desert_shrub,
    ]
    row_bot = hstack([make_tile(f) for f in row_bot_fns])
    sheet = vstack([row_top, row_bot])
    write_png(os.path.join(OUT_DIR, 'tileset_desert_forest_transition.png'), sheet)


# ─── MAIN ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('Generating Desert Oasis biome assets...')

    print('\n[Tileset]')
    gen_tileset_desert_oasis()
    gen_tileset_desert_forest_transition()

    print('\n[Enemies]')
    gen_enemy_sand_scorpion()
    gen_enemy_desert_wraith()
    gen_enemy_sandstone_golem()

    print('\n[Boss]')
    gen_boss_pharaoh_shade()

    print('\n[Loot Icons]')
    gen_icon_scimitar()
    gen_icon_desert_robes()
    gen_icon_sand_amulet()
    gen_icon_oasis_potion()

    print('\n[Backgrounds]')
    gen_bg_desert_sky()
    gen_bg_desert_dunes_far()
    gen_bg_desert_dunes_near()

    print('\nDone! All desert biome assets generated.')
