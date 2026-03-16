#!/usr/bin/env python3
"""
Generate remaining art assets for PixelRealm (PIX-15).
Uses only Python stdlib (struct + zlib) — no PIL required.
Follows docs/art-style-guide.md exactly.

Assets generated:
  Tilesets (256×64, 16 cols × 4 rows, 16×16 tiles):
    tileset_desert.png
    tileset_ice.png
    tileset_volcanic.png
    tileset_ocean.png
    tileset_dungeon.png
    tileset_town.png

  Enemy spritesheets (192×24 horizontal strips, 12 frames × 16×24):
    char_enemy_slime.png      (12 frames × 12×12 centred in 16×24)
    char_enemy_skeleton.png   (12 frames × 16×24)
    char_enemy_orc.png        (12 frames × 16×24)
    char_enemy_boss.png       (12 frames × 32×32, strip width 384)

  Pickups / collectibles (16×16):
    icon_pickup_health.png
    icon_pickup_mana.png
    icon_pickup_coin.png
    icon_pickup_gem.png
    icon_pickup_star.png      (power-up)

  UI elements:
    ui_btn.png                80×20  button (9-slice)
    ui_cursor.png             12×12  custom cursor
    ui_icon_skill.png         16×16  skill slot icon
    ui_slot.png               18×18  inventory / hotbar slot frame

  Menu backgrounds:
    bg_menu_title.png         320×180  title screen backdrop
    bg_options.png            320×180  options screen backdrop
    bg_credits.png            320×180  credits screen backdrop
    bg_gameover.png           320×180  game-over screen backdrop
"""

import struct
import zlib
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
os.makedirs(OUT_DIR, exist_ok=True)

# ─── Palette (RGBA tuples) ────────────────────────────────────────────────────

_ = (0, 0, 0, 0)          # transparent

# Neutrals
K   = (13,  13,  13,  255)   # shadow black / outline
DK  = (43,  43,  43,  255)   # dark rock
ST  = (74,  74,  74,  255)   # stone gray
MG  = (110, 110, 110, 255)   # mid gray
LS  = (150, 150, 150, 255)   # light stone
PG  = (200, 200, 200, 255)   # pale gray / skin
NW  = (240, 240, 240, 255)   # near white

# Warm earth
BD  = (59,  32,  16,  255)   # deep soil
BN  = (107, 58,  31,  255)   # rich earth / boots
DT  = (139, 92,  42,  255)   # dirt
SN  = (184, 132, 63,  255)   # sand / sandstone
DS  = (212, 168, 90,  255)   # desert gold
PS  = (232, 208, 138, 255)   # pale sand

# Greens
DF  = (26,  58,  26,  255)   # deep forest
FG  = (45,  110, 45,  255)   # forest green
LG  = (76,  155, 76,  255)   # leaf green
BG  = (120, 200, 120, 255)   # bright grass
FL  = (168, 228, 160, 255)   # light foliage

# Cyan / blue
OC  = (10,  26,  58,  255)   # deep ocean
DP  = (26,  74,  138, 255)   # ocean blue / player shadow
SB  = (42,  122, 192, 255)   # sky blue
PB  = (80,  168, 232, 255)   # player blue
HB  = (144, 208, 248, 255)   # ice / pale water
IW  = (200, 240, 255, 255)   # ice white / shimmer

# Red / enemy / fire
DB  = (90,  10,  10,  255)   # deep blood
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

# Coral / ocean accent
CR  = (248, 120, 80,  255)   # coral
AQ  = (64,  220, 200, 255)   # aqua teal
SW  = (100, 180, 140, 255)   # seaweed green

# Sky colours for gradients
SKY1 = (10,  10,  46,  255)  # deep night sky
SKY2 = (20,  30,  80,  255)  # night mid
SKY3 = (40,  60,  120, 255)  # night upper
SKY4 = (74,  130, 210, 255)  # day horizon
SKY5 = (100, 160, 230, 255)  # day mid
SKY6 = (130, 190, 250, 255)  # day upper

# ─── PNG writer ───────────────────────────────────────────────────────────────

def _make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    payload = chunk_type + data
    crc = zlib.crc32(payload) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)


def write_png(path: str, pixels: list) -> None:
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
    print(f'  wrote {os.path.relpath(path)}  ({width}×{height})')


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


def shift_x(src, dx):
    """Shift sprite horizontally by dx pixels (wraps content within frame)."""
    result = copy_frame(src)
    h = len(src)
    w = len(src[0])
    for r in range(h):
        for c in range(w):
            nc = (c + dx) % w
            result[r][nc] = src[r][c]
    return result


def tint_frame(src, color, strength=0.25):
    tr, tg, tb = color[:3]
    result = []
    for row in src:
        new_row = []
        for (r, g, b, a) in row:
            if a == 0:
                new_row.append((r, g, b, a))
            else:
                nr = int(r * (1 - strength) + tr * strength)
                ng = int(g * (1 - strength) + tg * strength)
                nb = int(b * (1 - strength) + tb * strength)
                new_row.append((nr, ng, nb, a))
        result.append(new_row)
    return result


# ─── TILESETS ─────────────────────────────────────────────────────────────────
# Each tileset: 256×64  (16 cols × 4 rows, each tile 16×16)
# Row 0: base ground tiles
# Row 1: wall / elevated terrain
# Row 2: special / animated feature tiles
# Row 3: decoration / transition tiles

def make_tile(draw_fn):
    """Create a 16×16 tile using a drawing function: draw_fn(grid)."""
    g = blank(16, 16, K)
    draw_fn(g)
    return g


# ── Desert ────────────────────────────────────────────────────────────────────

def _desert_sand(g):
    rect(g, 0, 0, 16, 16, DS)
    for y, x_off in [(3, 2), (7, 6), (11, 1), (5, 11), (9, 8), (13, 4)]:
        hline(g, x_off, y, 4, PS)
    for (x, y) in [(1, 1), (6, 5), (13, 2), (3, 10), (10, 13), (8, 7)]:
        dot(g, x, y, SN)


def _desert_dune(g):
    rect(g, 0, 0, 16, 16, DS)
    # dune wave
    wave = [8, 7, 6, 5, 4, 4, 5, 6, 7, 8, 9, 9, 8, 7, 6, 5]
    for x, top in enumerate(wave):
        rect(g, x, top, 1, 16 - top, SN)
        dot(g, x, top, PS)
    for (x, y) in [(3, 10), (9, 8), (13, 12)]:
        dot(g, x, y, BD)


def _desert_sandstone(g):
    rect(g, 0, 0, 16, 16, SN)
    # brick joints
    for y in [4, 8, 12]:
        hline(g, 0, y, 16, BN)
    # offset vertical joints
    for x in [4, 12]:
        vline(g, x, 0, 4, BN)
        vline(g, x, 8, 4, BN)
    for x in [8]:
        vline(g, x, 4, 4, BN)
        vline(g, x, 12, 4, BN)
    # highlights
    for (x, y) in [(1, 1), (5, 1), (9, 5), (13, 5), (1, 9), (5, 9), (9, 13), (13, 13)]:
        dot(g, x, y, PS)


def _desert_rock(g):
    rect(g, 0, 0, 16, 16, BN)
    rect(g, 2, 2, 12, 10, DT)
    rect(g, 3, 3, 10, 8, SN)
    for (x, y) in [(4, 4), (8, 5), (6, 8), (11, 7)]:
        dot(g, x, y, PS)
    rect(g, 0, 12, 16, 4, BD)
    hline(g, 0, 12, 16, BN)


def _desert_cactus(g):
    rect(g, 0, 0, 16, 16, DS)
    # trunk
    rect(g, 7, 3, 2, 12, FG)
    rect(g, 8, 3, 1, 12, LG)
    # arms
    rect(g, 4, 6, 4, 2, FG)
    dot(g, 4, 5, FG); dot(g, 4, 8, FG)
    rect(g, 8, 8, 4, 2, FG)
    dot(g, 11, 7, FG); dot(g, 11, 10, FG)
    # tip
    dot(g, 7, 2, LG); dot(g, 8, 2, LG)
    # ground shadow
    hline(g, 5, 15, 6, SN)


def _desert_bones(g):
    rect(g, 0, 0, 16, 16, DS)
    # horizontal bone
    hline(g, 2, 9, 12, NW)
    hline(g, 2, 8, 12, PG)
    dot(g, 2, 9, NW); dot(g, 2, 10, NW)
    dot(g, 13, 9, NW); dot(g, 13, 10, NW)
    # vertical bone
    vline(g, 8, 4, 8, NW)
    dot(g, 7, 4, NW); dot(g, 9, 4, NW)
    dot(g, 7, 11, NW); dot(g, 9, 11, NW)


def _desert_ruins(g):
    rect(g, 0, 0, 16, 16, DS)
    # broken column
    rect(g, 5, 2, 5, 13, SN)
    rect(g, 5, 2, 5, 1, PS)
    rect(g, 5, 14, 5, 1, BN)
    for y in [4, 7, 10]:
        hline(g, 5, y, 5, BN)
    # rubble
    rect(g, 2, 13, 3, 2, SN)
    rect(g, 11, 14, 3, 1, SN)


def _desert_trap(g):
    rect(g, 0, 0, 16, 16, DS)
    # pit
    rect(g, 3, 4, 10, 10, DK)
    rect(g, 4, 5, 8, 8, K)
    # spikes
    for x in [5, 7, 9, 11]:
        for y in [9, 11]:
            dot(g, x, y, ST)
    # rim
    hline(g, 3, 4, 10, ST)
    hline(g, 3, 13, 10, ST)


def _desert_oasis(g):
    rect(g, 0, 0, 16, 16, DS)
    # water pool
    rect(g, 3, 5, 10, 7, DP)
    rect(g, 4, 6, 8, 5, SB)
    dot(g, 5, 7, HB); dot(g, 9, 8, HB)
    # palm trunk
    rect(g, 13, 4, 2, 10, BN)
    # palm leaves
    hline(g, 8, 4, 5, FG)
    hline(g, 9, 3, 4, LG)
    dot(g, 8, 5, FG); dot(g, 13, 5, FG)


def gen_tileset_desert():
    row0 = [_desert_sand, _desert_sand, _desert_dune, _desert_dune,
            _desert_sandstone, _desert_sandstone, _desert_rock, _desert_rock,
            _desert_sand, _desert_dune, _desert_sandstone, _desert_rock,
            _desert_sand, _desert_dune, _desert_sandstone, _desert_rock]
    row1 = [_desert_sandstone, _desert_sandstone, _desert_rock, _desert_rock,
            _desert_sand, _desert_sand, _desert_dune, _desert_dune,
            _desert_rock, _desert_sandstone, _desert_dune, _desert_sand,
            _desert_rock, _desert_sandstone, _desert_dune, _desert_sand]
    row2 = [_desert_cactus, _desert_cactus, _desert_bones, _desert_bones,
            _desert_ruins, _desert_ruins, _desert_oasis, _desert_oasis,
            _desert_cactus, _desert_bones, _desert_ruins, _desert_oasis,
            _desert_trap, _desert_trap, _desert_cactus, _desert_bones]
    row3 = [_desert_trap, _desert_oasis, _desert_cactus, _desert_ruins,
            _desert_bones, _desert_sand, _desert_dune, _desert_sandstone,
            _desert_rock, _desert_trap, _desert_oasis, _desert_cactus,
            _desert_ruins, _desert_bones, _desert_sand, _desert_dune]

    def build_row(fns):
        return hstack([make_tile(f) for f in fns])

    sheet = vstack([build_row(row0), build_row(row1), build_row(row2), build_row(row3)])
    write_png(os.path.join(OUT_DIR, 'tileset_desert.png'), sheet)


# ── Ice / Tundra ──────────────────────────────────────────────────────────────

def _ice_floor(g):
    rect(g, 0, 0, 16, 16, HB)
    rect(g, 0, 0, 16, 2, IW)
    for (x, y) in [(2, 3), (7, 5), (12, 2), (4, 8), (11, 10), (6, 13)]:
        hline(g, x, y, 3, IW)
    for (x, y) in [(1, 6), (9, 3), (14, 9)]:
        dot(g, x, y, NW)


def _ice_snow(g):
    rect(g, 0, 0, 16, 16, IW)
    # snow texture
    for (x, y) in [(2, 2), (6, 1), (10, 3), (14, 1), (1, 6), (5, 5),
                   (9, 7), (13, 5), (3, 10), (7, 9), (11, 11), (15, 8),
                   (0, 14), (4, 13), (8, 15), (12, 12)]:
        dot(g, x, y, HB)


def _ice_wall(g):
    rect(g, 0, 0, 16, 16, DP)
    rect(g, 1, 1, 14, 14, HB)
    # ice crystal pattern
    for y in [4, 8, 12]:
        hline(g, 1, y, 14, DP)
    for x in [5, 10]:
        vline(g, x, 1, 14, DP)
    for (x, y) in [(2, 2), (6, 2), (11, 2), (2, 5), (6, 5), (11, 5),
                   (2, 9), (6, 9), (11, 9), (2, 13), (6, 13), (11, 13)]:
        dot(g, x, y, IW)


def _ice_crack(g):
    rect(g, 0, 0, 16, 16, HB)
    # crack lines
    for (x, y) in [(3, 2), (4, 3), (5, 3), (6, 4), (7, 5), (7, 6), (8, 7),
                   (9, 8), (10, 8), (11, 9), (12, 10)]:
        dot(g, x, y, DP)
    for (x, y) in [(4, 2), (5, 2), (6, 3), (7, 4), (8, 5), (8, 6), (9, 7),
                   (10, 7), (11, 8), (12, 9), (13, 10)]:
        dot(g, x, y, K)
    rect(g, 0, 0, 16, 1, IW)


def _ice_crystal(g):
    rect(g, 0, 0, 16, 16, HB)
    # crystal formation
    for (cx, cy, h) in [(4, 15, 8), (8, 15, 12), (12, 15, 7)]:
        for i in range(h):
            w = max(1, 3 - i // 3)
            rect(g, cx - w // 2, cy - i, w, 1, IW if i % 3 == 0 else SB)
    hline(g, 0, 15, 16, DP)


def _ice_pond(g):
    rect(g, 0, 0, 16, 16, HB)
    # frozen pond surface
    rect(g, 2, 3, 12, 9, SB)
    rect(g, 3, 4, 10, 7, PB)
    # reflection highlight
    rect(g, 4, 5, 4, 2, HB)
    rect(g, 5, 5, 2, 1, IW)
    # ice border
    hline(g, 2, 3, 12, IW)
    hline(g, 2, 11, 12, DP)


def _ice_hazard(g):
    rect(g, 0, 0, 16, 16, HB)
    # icicle spikes pointing down (hazard)
    for (x, h) in [(2, 6), (5, 9), (8, 5), (11, 8), (14, 6)]:
        for i in range(h):
            dot(g, x, i, IW if i < 2 else SB)
            if i > h - 3:
                dot(g, x, i, PB)
    hline(g, 0, 0, 16, IW)


def _ice_rune(g):
    rect(g, 0, 0, 16, 16, HB)
    # magic rune etched in ice
    rect(g, 5, 2, 6, 12, SB)  # vertical bar
    rect(g, 2, 7, 12, 3, SB)  # horizontal bar
    for (x, y) in [(5, 2), (10, 2), (5, 13), (10, 13), (2, 7), (13, 7), (2, 9), (13, 9)]:
        dot(g, x, y, MV)
    dot(g, 7, 7, MV); dot(g, 8, 7, MV)
    dot(g, 7, 8, MV); dot(g, 8, 8, MV)


def gen_tileset_ice():
    fns = [_ice_floor, _ice_snow, _ice_wall, _ice_crack,
           _ice_crystal, _ice_pond, _ice_hazard, _ice_rune,
           _ice_floor, _ice_snow, _ice_wall, _ice_crack,
           _ice_crystal, _ice_pond, _ice_hazard, _ice_rune,
           _ice_wall, _ice_crack, _ice_floor, _ice_snow,
           _ice_rune, _ice_hazard, _ice_pond, _ice_crystal,
           _ice_crack, _ice_wall, _ice_snow, _ice_floor,
           _ice_hazard, _ice_rune, _ice_crystal, _ice_pond,
           _ice_snow, _ice_floor, _ice_crack, _ice_wall,
           _ice_pond, _ice_crystal, _ice_rune, _ice_hazard,
           _ice_floor, _ice_crack, _ice_snow, _ice_wall,
           _ice_crystal, _ice_hazard, _ice_pond, _ice_rune,
           _ice_wall, _ice_snow, _ice_crack, _ice_floor,
           _ice_rune, _ice_pond, _ice_hazard, _ice_crystal,
           _ice_crack, _ice_rune, _ice_wall, _ice_snow,
           _ice_hazard, _ice_crystal, _ice_floor, _ice_pond]
    rows = [fns[i*16:(i+1)*16] for i in range(4)]
    sheet = vstack([hstack([make_tile(f) for f in row]) for row in rows])
    write_png(os.path.join(OUT_DIR, 'tileset_ice.png'), sheet)


# ── Volcanic ──────────────────────────────────────────────────────────────────

def _vol_obsidian(g):
    rect(g, 0, 0, 16, 16, DK)
    # glossy facets
    for (x, y, w, h) in [(2, 2, 4, 3), (8, 1, 3, 2), (1, 8, 3, 4), (10, 6, 4, 3)]:
        rect(g, x, y, w, h, ST)
    for (x, y) in [(3, 2), (9, 1), (2, 9), (11, 7)]:
        dot(g, x, y, MG)
    hline(g, 0, 15, 16, K)


def _vol_lava(g):
    rect(g, 0, 0, 16, 16, DB)
    # lava blobs
    for row in range(16):
        t = row / 15.0
        if t < 0.3:
            c = FR
        elif t < 0.6:
            c = BR
        else:
            c = DB
        hline(g, 0, row, 16, c)
    # bright rivulets
    for (x, y) in [(2, 2), (7, 1), (11, 4), (4, 7), (13, 6), (5, 11), (9, 13)]:
        dot(g, x, y, YL)
        dot(g, x, y + 1, FR)


def _vol_ash(g):
    rect(g, 0, 0, 16, 16, ST)
    for (x, y) in [(1, 1), (4, 3), (8, 2), (12, 4), (2, 6), (6, 5),
                   (10, 7), (14, 6), (0, 10), (5, 9), (9, 11), (13, 9),
                   (3, 13), (7, 12), (11, 14), (15, 13)]:
        dot(g, x, y, DK)
    for (x, y) in [(2, 2), (7, 4), (11, 3), (3, 8), (9, 10), (14, 12)]:
        dot(g, x, y, MG)


def _vol_crack_lava(g):
    rect(g, 0, 0, 16, 16, DK)
    # glowing cracks
    for (x, y) in [(3, 0), (4, 1), (5, 2), (5, 3), (6, 4), (7, 5), (8, 5),
                   (9, 6), (9, 7), (10, 8), (11, 9), (11, 10), (12, 11)]:
        dot(g, x, y, FR)
        if x > 0:
            dot(g, x - 1, y, BR)
        if y > 0:
            dot(g, x, y - 1, YL)
    hline(g, 0, 15, 16, K)


def _vol_ember_tile(g):
    rect(g, 0, 0, 16, 16, DK)
    rect(g, 0, 12, 16, 4, DB)
    # embers
    for (x, y) in [(2, 11), (5, 9), (8, 7), (11, 10), (14, 8), (3, 5), (7, 3), (12, 6)]:
        dot(g, x, y, YL)
        dot(g, x, y + 1, FR)
        dot(g, x, y + 2, BR)


def _vol_volcano_base(g):
    rect(g, 0, 0, 16, 16, DK)
    # slope outline
    for x in range(16):
        h = max(0, 14 - abs(x - 8))
        vline(g, x, 16 - h, h, ST if x < 4 or x > 12 else BR)
    rect(g, 6, 0, 4, 4, K)
    rect(g, 7, 1, 2, 2, FR)


def _vol_pillar(g):
    rect(g, 0, 0, 16, 16, DK)
    rect(g, 5, 0, 6, 16, ST)
    rect(g, 6, 0, 4, 16, MG)
    rect(g, 7, 0, 2, 16, LS)
    hline(g, 5, 0, 6, MG)
    hline(g, 5, 15, 6, K)


def _vol_gate(g):
    rect(g, 0, 0, 16, 16, DK)
    # gate arch
    rect(g, 2, 0, 12, 16, ST)
    rect(g, 4, 2, 8, 14, K)
    # arch curve (simple)
    for (x, y) in [(4, 2), (5, 1), (6, 0), (9, 0), (10, 1), (11, 2)]:
        dot(g, x, y, ST)
    # lava fill
    rect(g, 4, 2, 8, 3, FR)
    hline(g, 4, 5, 8, BR)


def gen_tileset_volcanic():
    fns = [_vol_obsidian, _vol_lava, _vol_ash, _vol_crack_lava,
           _vol_ember_tile, _vol_volcano_base, _vol_pillar, _vol_gate,
           _vol_obsidian, _vol_ash, _vol_lava, _vol_crack_lava,
           _vol_pillar, _vol_gate, _vol_ember_tile, _vol_volcano_base,
           _vol_lava, _vol_obsidian, _vol_crack_lava, _vol_ash,
           _vol_gate, _vol_pillar, _vol_volcano_base, _vol_ember_tile,
           _vol_ash, _vol_crack_lava, _vol_obsidian, _vol_lava,
           _vol_ember_tile, _vol_volcano_base, _vol_gate, _vol_pillar,
           _vol_crack_lava, _vol_obsidian, _vol_lava, _vol_ash,
           _vol_volcano_base, _vol_ember_tile, _vol_pillar, _vol_gate,
           _vol_obsidian, _vol_lava, _vol_ash, _vol_crack_lava,
           _vol_ember_tile, _vol_volcano_base, _vol_pillar, _vol_gate,
           _vol_lava, _vol_crack_lava, _vol_obsidian, _vol_ash,
           _vol_gate, _vol_pillar, _vol_ember_tile, _vol_volcano_base,
           _vol_ash, _vol_gate, _vol_crack_lava, _vol_obsidian,
           _vol_volcano_base, _vol_ember_tile, _vol_lava, _vol_pillar]
    rows = [fns[i*16:(i+1)*16] for i in range(4)]
    sheet = vstack([hstack([make_tile(f) for f in row]) for row in rows])
    write_png(os.path.join(OUT_DIR, 'tileset_volcanic.png'), sheet)


# ── Ocean / Coral ─────────────────────────────────────────────────────────────

def _ocean_floor(g):
    rect(g, 0, 0, 16, 16, DP)
    rect(g, 0, 12, 16, 4, SN)
    for (x, y) in [(2, 12), (5, 11), (9, 13), (13, 12), (7, 14)]:
        dot(g, x, y, DS)
    # water shimmer
    for (x, y) in [(1, 3), (7, 1), (11, 5), (3, 7), (14, 9)]:
        hline(g, x, y, 3, SB)


def _ocean_surface(g):
    rect(g, 0, 0, 16, 16, SB)
    rect(g, 0, 0, 16, 4, PB)
    rect(g, 0, 0, 16, 1, HB)
    # wave ripple
    for x in range(16):
        y = 2 + (1 if (x // 4) % 2 == 0 else 0)
        dot(g, x, y, IW)


def _ocean_coral(g):
    rect(g, 0, 0, 16, 16, DP)
    # coral branches
    vline(g, 8, 5, 10, CR)
    for (x, y, w) in [(5, 8, 3), (9, 10, 3), (6, 6, 2), (8, 13, 3)]:
        hline(g, x, y, w, CR)
    # coral tips
    for (x, y) in [(5, 7), (7, 7), (9, 9), (11, 9), (6, 5), (7, 5), (8, 12), (10, 12)]:
        dot(g, x, y, FR)
    rect(g, 6, 14, 4, 2, SN)


def _ocean_sand(g):
    rect(g, 0, 0, 16, 16, SN)
    for (x, y) in [(2, 2), (7, 4), (11, 1), (4, 8), (9, 6), (13, 10),
                   (1, 12), (6, 14), (10, 13), (14, 7)]:
        dot(g, x, y, DS)
    for (x, y) in [(3, 5), (8, 9), (12, 3), (5, 11)]:
        hline(g, x, y, 2, PS)


def _ocean_seaweed(g):
    rect(g, 0, 0, 16, 16, DP)
    # seaweed strands
    for base_x in [3, 8, 13]:
        for y in range(15, 3, -1):
            x = base_x + (1 if ((y // 2) % 2 == 0) else -1)
            dot(g, x, y, SW)
            dot(g, x, y, LG if y < 8 else SW)
    rect(g, 0, 14, 16, 2, SN)


def _ocean_rock(g):
    rect(g, 0, 0, 16, 16, DP)
    rect(g, 2, 5, 12, 9, ST)
    rect(g, 3, 4, 10, 8, MG)
    rect(g, 4, 5, 8, 6, LS)
    for (x, y) in [(5, 6), (9, 7), (11, 5)]:
        dot(g, x, y, NW)
    # barnacles
    for (x, y) in [(3, 5), (7, 4), (12, 6), (5, 12), (10, 11)]:
        dot(g, x, y, PG)


def _ocean_chest(g):
    rect(g, 0, 0, 16, 16, DP)
    # treasure chest underwater
    rect(g, 3, 7, 10, 8, BN)
    rect(g, 3, 7, 10, 3, DT)
    rect(g, 4, 7, 8, 3, SN)
    rect(g, 7, 10, 2, 3, GD)
    dot(g, 8, 11, YL)
    hline(g, 3, 10, 10, BD)


def _ocean_anemone(g):
    rect(g, 0, 0, 16, 16, DP)
    # anemone tentacles
    for (x, top, col) in [(3, 4, MV), (6, 6, SG), (9, 3, MV), (12, 5, SG), (7, 8, CR)]:
        vline(g, x, top, 16 - top, col)
        dot(g, x - 1, top, col)
        dot(g, x + 1, top + 1, col)
    rect(g, 1, 14, 14, 2, SN)


def gen_tileset_ocean():
    fns = [_ocean_floor, _ocean_surface, _ocean_coral, _ocean_sand,
           _ocean_seaweed, _ocean_rock, _ocean_chest, _ocean_anemone,
           _ocean_floor, _ocean_sand, _ocean_surface, _ocean_coral,
           _ocean_rock, _ocean_anemone, _ocean_chest, _ocean_seaweed,
           _ocean_coral, _ocean_floor, _ocean_sand, _ocean_surface,
           _ocean_anemone, _ocean_chest, _ocean_seaweed, _ocean_rock,
           _ocean_sand, _ocean_coral, _ocean_floor, _ocean_seaweed,
           _ocean_chest, _ocean_rock, _ocean_anemone, _ocean_surface,
           _ocean_surface, _ocean_seaweed, _ocean_anemone, _ocean_chest,
           _ocean_floor, _ocean_sand, _ocean_coral, _ocean_rock,
           _ocean_rock, _ocean_anemone, _ocean_chest, _ocean_seaweed,
           _ocean_surface, _ocean_coral, _ocean_sand, _ocean_floor,
           _ocean_anemone, _ocean_chest, _ocean_rock, _ocean_seaweed,
           _ocean_coral, _ocean_floor, _ocean_sand, _ocean_surface,
           _ocean_chest, _ocean_rock, _ocean_anemone, _ocean_seaweed,
           _ocean_seaweed, _ocean_surface, _ocean_floor, _ocean_coral]
    rows = [fns[i*16:(i+1)*16] for i in range(4)]
    sheet = vstack([hstack([make_tile(f) for f in row]) for row in rows])
    write_png(os.path.join(OUT_DIR, 'tileset_ocean.png'), sheet)


# ── Dungeon ───────────────────────────────────────────────────────────────────

def _dun_floor(g):
    rect(g, 0, 0, 16, 16, DK)
    # cobble pattern
    for y in [4, 8, 12]:
        hline(g, 0, y, 16, K)
    for x in [4, 12]:
        vline(g, x, 0, 4, K)
        vline(g, x, 8, 4, K)
    for x in [8]:
        vline(g, x, 4, 4, K)
        vline(g, x, 12, 4, K)
    # moss spots
    for (x, y) in [(2, 2), (10, 6), (6, 10), (14, 14)]:
        dot(g, x, y, DF)


def _dun_wall(g):
    rect(g, 0, 0, 16, 16, ST)
    rect(g, 1, 1, 14, 14, DK)
    # stone brick joints
    for y in [5, 10]:
        hline(g, 1, y, 14, K)
    for x in [5, 10]:
        vline(g, x, 1, 4, K)
        vline(g, x, 6, 4, K)
        vline(g, x, 11, 4, K)
    # brick highlight
    for (x, y) in [(2, 2), (6, 2), (11, 2), (2, 6), (6, 6), (11, 6),
                   (2, 11), (6, 11), (11, 11)]:
        dot(g, x, y, MG)


def _dun_door(g):
    rect(g, 0, 0, 16, 16, ST)
    rect(g, 3, 0, 10, 16, BN)
    rect(g, 4, 1, 8, 14, BD)
    rect(g, 4, 1, 8, 7, DK)
    # door frame
    hline(g, 3, 0, 10, DT)
    vline(g, 3, 0, 16, DT)
    vline(g, 12, 0, 16, DT)
    # hinges
    rect(g, 4, 2, 2, 2, ST)
    rect(g, 4, 12, 2, 2, ST)
    # handle
    dot(g, 11, 8, GD)


def _dun_torch(g):
    rect(g, 0, 0, 16, 16, DK)
    # torch bracket
    rect(g, 6, 8, 4, 7, ST)
    rect(g, 7, 9, 2, 5, DK)
    # flame
    rect(g, 6, 5, 4, 4, FR)
    rect(g, 7, 3, 2, 3, YL)
    dot(g, 8, 2, NW)
    # torch glow
    for (x, y) in [(4, 7), (11, 7), (5, 4), (10, 4)]:
        dot(g, x, y, EM)


def _dun_pit(g):
    rect(g, 0, 0, 16, 16, DK)
    rect(g, 2, 2, 12, 12, K)
    # pit edge
    outline(g, 2, 2, 12, 12, ST)
    # spikes at bottom
    for x in [4, 7, 10]:
        vline(g, x, 8, 5, MG)
        dot(g, x, 8, LS)


def _dun_magic_circle(g):
    rect(g, 0, 0, 16, 16, DK)
    # outer ring
    for (x, y) in [(4, 1), (5, 1), (6, 1), (9, 1), (10, 1), (11, 1),
                   (2, 3), (2, 4), (13, 3), (13, 4),
                   (1, 6), (1, 9), (14, 6), (14, 9),
                   (2, 11), (2, 12), (13, 11), (13, 12),
                   (4, 14), (5, 14), (6, 14), (9, 14), (10, 14), (11, 14)]:
        dot(g, x, y, MV)
    # inner rune
    rect(g, 6, 6, 4, 4, MP)
    for (x, y) in [(7, 7), (8, 7), (7, 8), (8, 8)]:
        dot(g, x, y, SG)
    # spokes
    for (x, y) in [(4, 4), (11, 4), (4, 11), (11, 11)]:
        dot(g, x, y, MV)


def _dun_chest(g):
    rect(g, 0, 0, 16, 16, DK)
    rect(g, 2, 5, 12, 9, BN)
    rect(g, 2, 5, 12, 4, DT)
    rect(g, 3, 6, 10, 3, SN)
    hline(g, 2, 9, 12, BD)
    rect(g, 7, 9, 2, 4, GD)
    dot(g, 8, 10, YL)
    # lock
    rect(g, 7, 7, 2, 2, DG)


def _dun_bones(g):
    rect(g, 0, 0, 16, 16, DK)
    # skull
    rect(g, 5, 2, 6, 5, PG)
    rect(g, 6, 3, 4, 4, NW)
    dot(g, 6, 4, K); dot(g, 9, 4, K)
    # ribcage
    for y in [8, 10, 12]:
        hline(g, 4, y, 8, PG)
        dot(g, 4, y, NW); dot(g, 11, y, NW)
    vline(g, 7, 8, 6, PG)
    vline(g, 8, 8, 6, PG)
    # teeth
    for x in [6, 7, 8, 9]:
        dot(g, x, 6, NW)


def gen_tileset_dungeon():
    fns = [_dun_floor, _dun_wall, _dun_door, _dun_torch,
           _dun_pit, _dun_magic_circle, _dun_chest, _dun_bones,
           _dun_floor, _dun_wall, _dun_door, _dun_torch,
           _dun_pit, _dun_magic_circle, _dun_chest, _dun_bones,
           _dun_wall, _dun_floor, _dun_torch, _dun_door,
           _dun_magic_circle, _dun_pit, _dun_bones, _dun_chest,
           _dun_torch, _dun_door, _dun_wall, _dun_floor,
           _dun_chest, _dun_bones, _dun_magic_circle, _dun_pit,
           _dun_floor, _dun_torch, _dun_wall, _dun_door,
           _dun_bones, _dun_chest, _dun_pit, _dun_magic_circle,
           _dun_door, _dun_pit, _dun_floor, _dun_wall,
           _dun_chest, _dun_torch, _dun_magic_circle, _dun_bones,
           _dun_magic_circle, _dun_chest, _dun_torch, _dun_pit,
           _dun_door, _dun_floor, _dun_bones, _dun_wall,
           _dun_pit, _dun_magic_circle, _dun_chest, _dun_bones,
           _dun_wall, _dun_torch, _dun_floor, _dun_door]
    rows = [fns[i*16:(i+1)*16] for i in range(4)]
    sheet = vstack([hstack([make_tile(f) for f in row]) for row in rows])
    write_png(os.path.join(OUT_DIR, 'tileset_dungeon.png'), sheet)


# ── Town / Plains ─────────────────────────────────────────────────────────────

def _town_grass(g):
    rect(g, 0, 0, 16, 16, LG)
    rect(g, 0, 0, 16, 2, BG)
    for (x, y) in [(2, 4), (5, 6), (9, 3), (13, 7), (7, 11), (11, 14), (1, 12)]:
        dot(g, x, y, BG)
    for (x, y) in [(4, 8), (8, 5), (12, 10), (3, 14)]:
        dot(g, x, y, FL)


def _town_cobble(g):
    rect(g, 0, 0, 16, 16, LS)
    for y in [4, 8, 12]:
        hline(g, 0, y, 16, PG)
    for x in [4, 12]:
        vline(g, x, 0, 4, PG)
        vline(g, x, 8, 4, PG)
    for x in [8]:
        vline(g, x, 4, 4, PG)
        vline(g, x, 12, 4, PG)
    for (x, y) in [(2, 2), (6, 2), (10, 2), (14, 2), (2, 6), (10, 6),
                   (6, 10), (14, 10), (2, 14), (6, 14), (10, 14), (14, 14)]:
        dot(g, x, y, NW)


def _town_dirt_path(g):
    rect(g, 0, 0, 16, 16, DT)
    rect(g, 0, 6, 16, 4, SN)
    hline(g, 0, 6, 16, BN)
    hline(g, 0, 9, 16, BN)
    for (x, y) in [(3, 7), (7, 8), (11, 7), (14, 8)]:
        dot(g, x, y, DS)


def _town_house_wall(g):
    rect(g, 0, 0, 16, 16, SN)
    for y in [5, 10]:
        hline(g, 0, y, 16, BN)
    for x in [5, 11]:
        vline(g, x, 0, 5, BN)
        vline(g, x, 6, 4, BN)
        vline(g, x, 11, 5, BN)
    for (x, y) in [(1, 1), (6, 1), (12, 1), (1, 6), (6, 6), (12, 6),
                   (1, 11), (6, 11), (12, 11)]:
        dot(g, x, y, PS)


def _town_fence(g):
    rect(g, 0, 0, 16, 16, LG)
    # fence posts
    for x in [2, 8, 14]:
        rect(g, x, 4, 2, 11, BN)
        rect(g, x, 4, 2, 1, DT)
    # rails
    hline(g, 0, 7, 16, BN)
    hline(g, 0, 11, 16, BN)


def _town_flower(g):
    rect(g, 0, 0, 16, 16, LG)
    # flowers
    for (fx, fy, fc) in [(3, 10, BR), (8, 8, YL), (12, 11, MV), (5, 13, FR)]:
        # stem
        vline(g, fx, fy + 1, 4, FG)
        # petals
        dot(g, fx - 1, fy, fc); dot(g, fx + 1, fy, fc)
        dot(g, fx, fy - 1, fc); dot(g, fx, fy + 1, fc)
        dot(g, fx, fy, YL)


def _town_well(g):
    rect(g, 0, 0, 16, 16, LG)
    # well base
    rect(g, 3, 8, 10, 7, ST)
    rect(g, 4, 9, 8, 5, DK)
    rect(g, 4, 9, 8, 1, SB)
    # well frame
    rect(g, 2, 4, 12, 5, BN)
    rect(g, 3, 3, 10, 2, DT)
    # roof beam
    hline(g, 2, 2, 12, BD)
    vline(g, 2, 2, 7, BD)
    vline(g, 13, 2, 7, BD)
    dot(g, 7, 0, GD)


def _town_tree(g):
    rect(g, 0, 0, 16, 16, LG)
    # trunk
    rect(g, 6, 10, 4, 6, BN)
    rect(g, 7, 10, 2, 6, DT)
    # canopy
    rect(g, 3, 3, 10, 8, FG)
    rect(g, 4, 2, 8, 8, LG)
    rect(g, 5, 1, 6, 8, BG)
    dot(g, 7, 0, FL); dot(g, 8, 0, FL)
    # shadow
    rect(g, 3, 9, 10, 2, DF)


def gen_tileset_town():
    fns = [_town_grass, _town_cobble, _town_dirt_path, _town_house_wall,
           _town_fence, _town_flower, _town_well, _town_tree,
           _town_cobble, _town_grass, _town_house_wall, _town_dirt_path,
           _town_tree, _town_well, _town_flower, _town_fence,
           _town_dirt_path, _town_house_wall, _town_grass, _town_cobble,
           _town_well, _town_tree, _town_fence, _town_flower,
           _town_house_wall, _town_fence, _town_cobble, _town_grass,
           _town_flower, _town_dirt_path, _town_tree, _town_well,
           _town_grass, _town_tree, _town_fence, _town_flower,
           _town_cobble, _town_house_wall, _town_well, _town_dirt_path,
           _town_flower, _town_well, _town_tree, _town_fence,
           _town_dirt_path, _town_grass, _town_cobble, _town_house_wall,
           _town_tree, _town_flower, _town_well, _town_fence,
           _town_house_wall, _town_cobble, _town_dirt_path, _town_grass,
           _town_well, _town_fence, _town_flower, _town_tree,
           _town_grass, _town_dirt_path, _town_house_wall, _town_cobble]
    rows = [fns[i*16:(i+1)*16] for i in range(4)]
    sheet = vstack([hstack([make_tile(f) for f in row]) for row in rows])
    write_png(os.path.join(OUT_DIR, 'tileset_town.png'), sheet)


# ─── ENEMY SPRITESHEETS ───────────────────────────────────────────────────────
# All 192×24: 12 frames × (16 wide × 24 tall)
# Animation layout: 0-1 idle, 2-5 walk, 6-9 attack, 10-11 death

def _make_slime_base():
    """12×12 slime centred in 16×24 frame."""
    g = blank(16, 24)
    # main body (12×8 blob)
    rect(g, 2, 12, 12, 8, LG)
    rect(g, 3, 11, 10, 2, BG)
    rect(g, 4, 10, 8, 2, BG)
    # highlight
    rect(g, 4, 11, 4, 2, FL)
    dot(g, 5, 11, NW)
    # eyes
    dot(g, 5, 13, K); dot(g, 10, 13, K)
    dot(g, 6, 12, K); dot(g, 9, 12, K)
    # outline
    for (x, y) in [(2, 19), (13, 19), (2, 12), (13, 12)]:
        dot(g, x, y, DF)
    # goo drip
    vline(g, 8, 19, 3, LG)
    dot(g, 8, 21, BG)
    return g


def gen_enemy_slime():
    base = _make_slime_base()
    frames = []
    # idle 0 (normal)
    f0 = copy_frame(base)
    frames.append(f0)
    # idle 1 (slight squish)
    f1 = copy_frame(base)
    rect(f1, 2, 12, 12, 9, LG); rect(f1, 3, 11, 10, 1, BG)
    dot(f1, 5, 13, K); dot(f1, 10, 13, K)
    frames.append(f1)
    # walk 2-5
    for dx in [1, 0, -1, 0]:
        fw = blank(16, 24)
        for r in range(24):
            for c in range(16):
                src_c = c - dx
                if 0 <= src_c < 16:
                    fw[r][c] = base[r][src_c]
                else:
                    fw[r][c] = _
        frames.append(fw)
    # attack 6-9 (expand/flash)
    for i in range(4):
        fa = copy_frame(base)
        if i < 2:
            # expand
            rect(fa, 1, 11, 14, 10, BG)
            rect(fa, 2, 12, 12, 8, LG)
            dot(fa, 5, 13, ER); dot(fa, 10, 13, ER)
        else:
            # retract + spit
            dot(fa, 5, 13, K); dot(fa, 10, 13, K)
            dot(fa, 8, 9, BG); dot(fa, 8, 8, FL)
        frames.append(fa)
    # death 10-11
    fd0 = copy_frame(base)
    rect(fd0, 0, 16, 16, 8, LG); rect(fd0, 0, 17, 16, 6, BG)
    for (x, y) in [(3, 17), (7, 16), (11, 18)]:
        dot(fd0, x, y, FL)
    frames.append(fd0)
    fd1 = blank(16, 24, _)
    for (x, y) in [(2, 18), (5, 17), (9, 19), (12, 17), (7, 20)]:
        dot(fd1, x, y, LG)
    frames.append(fd1)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'char_enemy_slime.png'), sheet)


def _make_skeleton_base():
    """16×24 skeleton."""
    g = blank(16, 24)
    # boots
    rect(g, 2, 20, 4, 4, DK)
    rect(g, 9, 20, 4, 4, DK)
    # legs (bone white)
    rect(g, 3, 15, 2, 6, NW)
    rect(g, 10, 15, 2, 6, NW)
    rect(g, 3, 14, 3, 2, PG)
    rect(g, 10, 14, 3, 2, PG)
    # ribcage body
    rect(g, 3, 8, 10, 7, NW)
    for y in [9, 11, 13]:
        hline(g, 3, y, 10, PG)
    vline(g, 7, 8, 7, PG)
    vline(g, 8, 8, 7, PG)
    # arms
    rect(g, 1, 9, 2, 6, NW)
    rect(g, 13, 9, 2, 6, NW)
    # skull
    rect(g, 4, 2, 8, 7, NW)
    rect(g, 5, 1, 6, 2, PG)
    dot(g, 5, 4, K); dot(g, 5, 5, K)
    dot(g, 10, 4, K); dot(g, 10, 5, K)
    for x in [5, 7, 9]:
        dot(g, x, 8, PG)
    # outline
    for y in [2, 8, 15, 20]:
        hline(g, 4, y, 8, K)
    return g


def gen_enemy_skeleton():
    base = _make_skeleton_base()
    frames = []
    # idle 0
    frames.append(copy_frame(base))
    # idle 1 (jaw rattle)
    f1 = copy_frame(base)
    for x in [5, 7, 9]:
        dot(f1, x, 9, PG)
        dot(f1, x, 8, _)
    frames.append(f1)
    # walk 2-5
    offsets = [0, 1, 0, -1]
    for dy in offsets:
        fw = copy_frame(base)
        # shift legs slightly
        if dy != 0:
            rect(fw, 2, 20, 6, 4, _)
            rect(fw, 8, 20, 6, 4, _)
            rect(fw, 2, 20 + dy, 4, 4, DK)
            rect(fw, 10, 20 - dy, 4, 4, DK)
        frames.append(fw)
    # attack 6-9 (raise sword arm)
    for i in range(4):
        fa = copy_frame(base)
        arm_y = 9 - i if i <= 2 else 9 + (i - 2)
        rect(fa, 1, 9, 2, 6, _)
        rect(fa, 1, arm_y, 2, 6, NW)
        # sword
        if i >= 1:
            vline(fa, 0, arm_y - 4, 5, LS)
            dot(fa, 0, arm_y - 5, NW)
        frames.append(fa)
    # death 10-11
    fd0 = copy_frame(base)
    # tilt: just offset body
    for y in range(8, 24):
        for x in range(16):
            if fd0[y][x][3] > 0:
                nx = min(15, x + 1)
                fd0[y][nx] = fd0[y][x]
                fd0[y][x] = _
    frames.append(fd0)
    fd1 = blank(16, 24, _)
    # scattered bones
    for (x, y, c) in [(2, 20, NW), (5, 19, PG), (8, 21, NW),
                      (11, 20, PG), (4, 22, NW), (9, 23, PG),
                      (3, 16, NW), (7, 17, PG), (12, 18, NW)]:
        dot(fd1, x, y, c)
    frames.append(fd1)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'char_enemy_skeleton.png'), sheet)


def _make_orc_base():
    """16×24 orc — stocky, green-tinted, red-armed."""
    g = blank(16, 24)
    # boots
    rect(g, 2, 20, 5, 4, DB)
    rect(g, 9, 20, 5, 4, DB)
    # legs
    rect(g, 3, 15, 4, 6, ER)
    rect(g, 9, 15, 4, 6, ER)
    # body (wide)
    rect(g, 1, 8, 14, 8, BR)
    rect(g, 2, 9, 12, 6, FR)
    # belt
    hline(g, 1, 14, 14, DG)
    # arms (thick)
    rect(g, 0, 9, 3, 7, BR)
    rect(g, 13, 9, 3, 7, BR)
    # fists
    rect(g, 0, 15, 3, 3, ER)
    rect(g, 13, 15, 3, 3, ER)
    # head
    rect(g, 3, 2, 10, 7, FR)
    rect(g, 4, 1, 8, 2, EM)
    # tusks
    rect(g, 5, 8, 2, 2, NW)
    rect(g, 9, 8, 2, 2, NW)
    # eyes
    dot(g, 6, 4, K); dot(g, 9, 4, K)
    dot(g, 6, 3, YL); dot(g, 9, 3, YL)
    # mohawk
    for (x, h) in [(5, 3), (6, 4), (7, 5), (8, 5), (9, 4), (10, 3)]:
        vline(g, x, 1 - (h - 3), h, YL if x in [7, 8] else GD)
    # outline
    hline(g, 3, 2, 10, K)
    hline(g, 1, 8, 14, K)
    hline(g, 1, 15, 14, K)
    return g


def gen_enemy_orc():
    base = _make_orc_base()
    frames = []
    # idle 0-1
    frames.append(copy_frame(base))
    f1 = copy_frame(base)
    dot(f1, 6, 3, ER); dot(f1, 9, 3, ER)  # angrier eyes
    frames.append(f1)
    # walk 2-5
    for i in range(4):
        fw = copy_frame(base)
        dy = (i % 2)
        if dy:
            rect(fw, 3, 15, 4, 6, _)
            rect(fw, 9, 15, 4, 6, _)
            rect(fw, 3, 16, 4, 6, ER)
            rect(fw, 9, 14, 4, 6, ER)
        frames.append(fw)
    # attack 6-9
    for i in range(4):
        fa = copy_frame(base)
        # raise right arm
        rect(fa, 13, 9, 3, 7, _)
        rect(fa, 13, 15, 3, 3, _)
        arm_y = max(5, 9 - i * 2)
        rect(fa, 13, arm_y, 3, 7, BR)
        rect(fa, 13, arm_y + 6, 3, 3, ER)
        # axe
        if i >= 1:
            rect(fa, 14, arm_y - 4, 2, 5, DT)
            rect(fa, 12, arm_y - 5, 4, 3, ST)
        frames.append(fa)
    # death 10-11
    fd0 = copy_frame(base)
    rect(fd0, 0, 10, 16, 14, _)
    rect(fd0, 0, 16, 16, 8, BR)
    rect(fd0, 1, 15, 14, 2, FR)
    frames.append(fd0)
    fd1 = blank(16, 24, _)
    rect(fd1, 0, 18, 16, 6, BR)
    rect(fd1, 2, 17, 12, 1, FR)
    frames.append(fd1)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'char_enemy_orc.png'), sheet)


def gen_enemy_boss():
    """Boss dragon: 32×32 frames, 12 frames, 384×32 strip."""
    def boss_base():
        g = blank(32, 32)
        # tail
        for (x, y) in [(1, 28), (2, 27), (3, 26), (2, 28), (1, 27)]:
            dot(g, x, y, DB)
        rect(g, 1, 24, 5, 5, ER)
        # body
        rect(g, 3, 12, 20, 14, ER)
        rect(g, 4, 13, 18, 12, BR)
        rect(g, 5, 14, 16, 10, FR)
        # belly
        rect(g, 7, 16, 12, 7, EM)
        hline(g, 7, 16, 12, FR)
        # legs
        rect(g, 5, 24, 5, 7, DB)
        rect(g, 17, 24, 5, 7, DB)
        rect(g, 4, 29, 7, 3, ER)
        rect(g, 16, 29, 7, 3, ER)
        # wings
        rect(g, 0, 5, 8, 12, DK)
        rect(g, 1, 6, 6, 10, MV)
        rect(g, 24, 5, 8, 12, DK)
        rect(g, 25, 6, 6, 10, MP)
        # neck
        rect(g, 10, 5, 8, 9, BR)
        rect(g, 11, 4, 6, 8, ER)
        # head
        rect(g, 9, 0, 14, 7, ER)
        rect(g, 10, 1, 12, 5, BR)
        # snout
        rect(g, 19, 2, 6, 4, ER)
        # horns
        rect(g, 9, 0, 2, 3, DK)
        rect(g, 21, 0, 2, 3, DK)
        # eyes
        rect(g, 12, 2, 2, 2, YL)
        rect(g, 17, 2, 2, 2, YL)
        dot(g, 12, 2, K); dot(g, 17, 2, K)
        # nostrils
        dot(g, 20, 4, K); dot(g, 22, 4, K)
        # claws
        for x in [4, 6, 8]:
            dot(g, x, 31, NW)
        for x in [17, 19, 21]:
            dot(g, x, 31, NW)
        # outline key edges
        hline(g, 9, 0, 14, K)
        hline(g, 3, 12, 20, K)
        return g

    base = boss_base()
    frames = []
    # idle 0-1
    frames.append(copy_frame(base))
    f1 = copy_frame(base)
    # breathe (chest expand)
    rect(f1, 5, 14, 16, 10, FR)
    rect(f1, 6, 15, 14, 8, EM)
    frames.append(f1)
    # walk/hover 2-5
    for i in range(4):
        fw = copy_frame(base)
        wing_y = 5 + (i % 2)
        rect(fw, 0, 5, 8, 12, _)
        rect(fw, 24, 5, 8, 12, _)
        rect(fw, 0, wing_y, 8, 12, DK)
        rect(fw, 1, wing_y + 1, 6, 10, MV if i % 2 == 0 else MP)
        rect(fw, 24, wing_y, 8, 12, DK)
        rect(fw, 25, wing_y + 1, 6, 10, MP if i % 2 == 0 else MV)
        frames.append(fw)
    # attack 6-9 (fire breath)
    for i in range(4):
        fa = copy_frame(base)
        if i >= 1:
            # fire stream from mouth
            for fx in range(23, 23 + i * 2):
                if fx < 32:
                    for fy in [3, 4, 5]:
                        dot(fa, fx, fy, [YL, FR, BR][fy - 3])
        if i == 3:
            # open jaw
            rect(fa, 19, 4, 6, 3, ER)
            rect(fa, 20, 5, 5, 2, K)
            for fx in range(24, 32):
                dot(fa, fx, 4, YL if fx % 2 == 0 else FR)
        frames.append(fa)
    # death 10-11
    fd0 = copy_frame(base)
    rect(fd0, 0, 20, 32, 12, _)
    rect(fd0, 0, 24, 32, 8, DB)
    rect(fd0, 2, 22, 28, 4, ER)
    frames.append(fd0)
    fd1 = blank(32, 32, _)
    rect(fd1, 0, 26, 32, 6, DK)
    rect(fd1, 2, 25, 28, 3, DB)
    for (x, y) in [(5, 25), (10, 26), (15, 24), (20, 26), (25, 25)]:
        dot(fd1, x, y, BR)
    frames.append(fd1)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'char_enemy_boss.png'), sheet)


# ─── PICKUPS & COLLECTIBLES ───────────────────────────────────────────────────

def gen_pickup_health():
    """16×16 red health potion."""
    g = blank(16, 16)
    # flask body
    rect(g, 4, 5, 8, 9, BR)
    rect(g, 5, 6, 6, 7, ER)
    rect(g, 5, 6, 3, 3, FR)
    dot(g, 6, 7, EM)
    # cross symbol
    hline(g, 6, 9, 4, NW)
    vline(g, 7, 8, 4, NW)
    # cork/neck
    rect(g, 6, 3, 4, 3, DT)
    rect(g, 7, 2, 2, 1, SN)
    # outline
    outline(g, 4, 5, 8, 9, K)
    outline(g, 6, 3, 4, 3, K)
    write_png(os.path.join(OUT_DIR, 'icon_pickup_health.png'), g)


def gen_pickup_mana():
    """16×16 blue mana potion."""
    g = blank(16, 16)
    # flask body
    rect(g, 4, 5, 8, 9, DP)
    rect(g, 5, 6, 6, 7, SB)
    rect(g, 5, 6, 3, 3, PB)
    dot(g, 6, 7, HB)
    # star symbol
    for (x, y) in [(8, 8), (7, 9), (9, 9), (8, 10)]:
        dot(g, x, y, IW)
    dot(g, 8, 8, NW)
    # cork/neck
    rect(g, 6, 3, 4, 3, DT)
    rect(g, 7, 2, 2, 1, SN)
    # outline
    outline(g, 4, 5, 8, 9, K)
    outline(g, 6, 3, 4, 3, K)
    write_png(os.path.join(OUT_DIR, 'icon_pickup_mana.png'), g)


def gen_pickup_coin():
    """16×16 gold coin."""
    g = blank(16, 16)
    # coin circle
    rect(g, 3, 3, 10, 10, GD)
    rect(g, 4, 2, 8, 12, GD)
    rect(g, 2, 4, 12, 8, GD)
    # inner face
    rect(g, 4, 4, 8, 8, YL)
    rect(g, 5, 3, 6, 10, YL)
    rect(g, 3, 5, 10, 6, YL)
    # G symbol
    rect(g, 6, 6, 4, 4, DG)
    dot(g, 8, 7, GD); dot(g, 8, 8, GD); dot(g, 9, 8, GD)
    # shine
    dot(g, 5, 5, NW); dot(g, 6, 4, NW)
    # rim
    for (x, y) in [(3, 3), (12, 3), (3, 12), (12, 12)]:
        dot(g, x, y, DG)
    write_png(os.path.join(OUT_DIR, 'icon_pickup_coin.png'), g)


def gen_pickup_gem():
    """16×16 rare gem (blue diamond)."""
    g = blank(16, 16)
    # gem facets
    # top facets
    for y in range(8):
        w = max(1, 2 + y * 2)
        x0 = 8 - w // 2
        color = [IW, HB, SB, PB, DP, SB, PB, DP][y]
        hline(g, x0, y, w, color)
    # bottom facets
    for y in range(8, 15):
        w = max(1, 16 - (y - 8) * 2 - 2)
        x0 = 8 - w // 2
        color = [DP, SB, PB, SB, DP, OC, K][y - 8]
        hline(g, x0, y, w, color)
    # shine
    dot(g, 6, 3, NW); dot(g, 7, 2, NW); dot(g, 5, 4, HB)
    # outline
    for y in range(16):
        for x in range(16):
            if g[y][x][3] > 0:
                for (dx, dy) in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < 16 and 0 <= ny < 16 and g[ny][nx][3] == 0:
                        g[ny][nx] = K
    write_png(os.path.join(OUT_DIR, 'icon_pickup_gem.png'), g)


def gen_pickup_star():
    """16×16 power-up star."""
    g = blank(16, 16)
    # 5-point star approximation
    star_pixels = [
        (8, 1), (7, 2), (8, 2), (9, 2),
        (6, 3), (7, 3), (8, 3), (9, 3), (10, 3),
        (3, 5), (4, 5), (5, 5), (6, 5), (7, 5), (8, 5), (9, 5), (10, 5), (11, 5), (12, 5),
        (4, 6), (5, 6), (6, 6), (7, 6), (8, 6), (9, 6), (10, 6), (11, 6),
        (5, 7), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7),
        (3, 8), (4, 8), (5, 8), (6, 8), (7, 8), (8, 8), (9, 8), (10, 8), (11, 8), (12, 8),
        (4, 9), (5, 9), (6, 9), (7, 9), (8, 9), (9, 9), (10, 9), (11, 9),
        (5, 10), (6, 10), (10, 10), (11, 10),
        (4, 11), (5, 11), (11, 11), (12, 11),
        (3, 12), (4, 12), (12, 12), (13, 12),
        (3, 13), (13, 13),
    ]
    for (x, y) in star_pixels:
        g[y][x] = YL
    # inner glow
    inner = [(7, 5), (8, 5), (7, 6), (8, 6), (7, 7), (8, 7),
             (6, 8), (7, 8), (8, 8), (9, 8), (7, 9), (8, 9)]
    for (x, y) in inner:
        g[y][x] = NW
    # outline pass
    for (x, y) in star_pixels:
        for (dx, dy) in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < 16 and 0 <= ny < 16 and g[ny][nx][3] == 0:
                g[ny][nx] = DG
    write_png(os.path.join(OUT_DIR, 'icon_pickup_star.png'), g)


# ─── UI ELEMENTS ─────────────────────────────────────────────────────────────

def gen_ui_btn():
    """80×20 button (9-slice ready)."""
    g = blank(80, 20)
    # background
    rect(g, 0, 0, 80, 20, DK)
    rect(g, 1, 1, 78, 18, ST)
    rect(g, 2, 2, 76, 16, MG)
    # top highlight
    hline(g, 2, 2, 76, LS)
    # bottom shadow
    hline(g, 2, 17, 76, K)
    hline(g, 2, 18, 76, DK)
    # corner pixels
    outline(g, 0, 0, 80, 20, K)
    for (x, y) in [(1, 1), (78, 1), (1, 18), (78, 18)]:
        dot(g, x, y, MG)
    write_png(os.path.join(OUT_DIR, 'ui_btn.png'), g)


def gen_ui_cursor():
    """12×12 custom pixel cursor."""
    g = blank(12, 12)
    # arrow cursor
    arrow = [
        (0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (0, 5), (0, 6), (0, 7), (0, 8), (0, 9),
        (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8),
        (2, 2), (2, 3), (2, 4), (2, 5), (2, 6),
        (3, 3), (3, 4), (3, 5), (3, 7), (3, 8), (3, 9),
        (4, 4), (4, 5), (4, 8), (4, 9), (4, 10),
        (5, 5), (5, 9), (5, 10), (5, 11),
        (6, 6), (6, 10), (6, 11),
    ]
    for (x, y) in arrow:
        if 0 <= y < 12 and 0 <= x < 12:
            g[y][x] = NW
    # outline
    outline_pixels = []
    for (x, y) in arrow:
        for (dx, dy) in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < 12 and 0 <= ny < 12 and g[ny][nx][3] == 0:
                outline_pixels.append((nx, ny))
    for (x, y) in outline_pixels:
        g[y][x] = K
    # re-draw arrow on top
    for (x, y) in arrow:
        if 0 <= y < 12 and 0 <= x < 12:
            g[y][x] = NW
    write_png(os.path.join(OUT_DIR, 'ui_cursor.png'), g)


def gen_ui_icon_skill():
    """16×16 skill slot icon (sword icon)."""
    g = blank(16, 16)
    rect(g, 0, 0, 16, 16, DK)
    outline(g, 0, 0, 16, 16, K)
    # sword
    vline(g, 8, 1, 10, LS)
    vline(g, 7, 2, 9, NW)
    dot(g, 8, 1, NW)  # tip
    # crossguard
    hline(g, 5, 10, 6, ST)
    hline(g, 5, 11, 6, MG)
    dot(g, 5, 10, LS); dot(g, 10, 10, LS)
    # handle
    rect(g, 7, 11, 2, 4, BN)
    dot(g, 7, 14, DT); dot(g, 8, 14, SN)
    # pommel
    rect(g, 6, 14, 4, 2, ST)
    dot(g, 7, 14, MG); dot(g, 8, 14, LS)
    write_png(os.path.join(OUT_DIR, 'ui_icon_skill.png'), g)


def gen_ui_slot():
    """18×18 inventory/hotbar slot frame."""
    g = blank(18, 18)
    rect(g, 0, 0, 18, 18, DK)
    rect(g, 1, 1, 16, 16, K)
    # inner dark well
    rect(g, 2, 2, 14, 14, ST)
    rect(g, 2, 2, 14, 1, MG)  # top highlight
    rect(g, 2, 15, 14, 1, K)  # bottom shadow
    # corner dots for polish
    for (x, y) in [(1, 1), (16, 1), (1, 16), (16, 16)]:
        dot(g, x, y, ST)
    write_png(os.path.join(OUT_DIR, 'ui_slot.png'), g)


# ─── MENU BACKGROUNDS ─────────────────────────────────────────────────────────
# All 320×180

def gen_bg_menu_title():
    """Title screen backdrop: dark night sky with stars and distant castle."""
    g = blank(320, 180)
    # Sky gradient (top = deep night, bottom = horizon glow)
    for y in range(180):
        t = y / 179.0
        r = int(SKY1[0] * (1 - t) + SKY4[0] * t)
        gg2 = int(SKY1[1] * (1 - t) + SKY4[1] * t)
        b = int(SKY1[2] * (1 - t) + SKY4[2] * t)
        hline(g, 0, y, 320, (r, gg2, b, 255))
    # Stars
    star_positions = [
        (15, 8), (42, 3), (70, 15), (95, 7), (130, 4), (160, 10), (190, 2),
        (220, 8), (255, 5), (280, 12), (305, 6), (10, 25), (55, 30), (88, 20),
        (118, 28), (148, 18), (175, 33), (210, 22), (240, 29), (270, 17),
        (300, 25), (25, 45), (65, 40), (105, 50), (140, 38), (180, 42),
        (215, 48), (250, 35), (285, 44), (8, 60), (48, 55), (78, 68),
        (115, 58), (155, 65), (195, 52), (230, 62), (265, 57), (295, 70),
        (35, 75), (75, 80), (112, 72), (150, 82), (188, 75), (225, 85),
        (260, 78), (290, 88), (20, 90), (60, 95), (100, 85), (140, 92),
    ]
    for (sx, sy) in star_positions:
        dot(g, sx, sy, NW)
        if (sx + sy) % 5 == 0:
            dot(g, sx + 1, sy, PY)
    # Distant mountain silhouette
    mountain_profile = []
    for x in range(320):
        # two overlapping mountain peaks
        h1 = max(0, 60 - abs(x - 80) // 2)
        h2 = max(0, 75 - abs(x - 200) // 2)
        h3 = max(0, 45 - abs(x - 300) // 2)
        mountain_profile.append(180 - max(h1, h2, h3))
    for x, top in enumerate(mountain_profile):
        for y in range(top, 140):
            g[y][x] = (20, 15, 40, 255)
    # Ground / horizon band
    for y in range(140, 165):
        t = (y - 140) / 24.0
        r = int(10 * (1 - t) + 30 * t)
        gg2 = int(8 * (1 - t) + 20 * t)
        b = int(30 * (1 - t) + 60 * t)
        hline(g, 0, y, 320, (r, gg2, b, 255))
    # Trees silhouette (dark)
    for base_x in range(0, 320, 18):
        h = 20 + ((base_x * 7 + 3) % 15)
        for y in range(165 - h, 165):
            dot(g, base_x, y, (15, 30, 15, 255))
            dot(g, base_x + 1, y, (15, 30, 15, 255))
        # tree top (triangle-ish)
        for offset in range(h // 3):
            w = max(1, h // 3 - offset)
            for dx in range(-w, w + 1):
                nx = base_x + dx
                ny = 165 - h + offset
                if 0 <= nx < 320 and 0 <= ny < 180:
                    g[ny][nx] = (20, 45, 20, 255)
    # Foreground ground
    for y in range(165, 180):
        hline(g, 0, y, 320, (25, 50, 25, 255))
    # Moon
    for my in range(20, 36):
        for mx in range(258, 276):
            dx = mx - 267; dy = my - 28
            if dx * dx + dy * dy <= 64:
                g[my][mx] = IW
    # Moon glow
    for my in range(16, 40):
        for mx in range(254, 280):
            dx = mx - 267; dy = my - 28
            d2 = dx * dx + dy * dy
            if 64 < d2 <= 100:
                r, gg2, b = g[my][mx][:3]
                g[my][mx] = (min(255, r + 20), min(255, gg2 + 20), min(255, b + 30), 255)
    write_png(os.path.join(OUT_DIR, 'bg_menu_title.png'), g)


def gen_bg_options():
    """Options screen backdrop: warm torch-lit stone room."""
    g = blank(320, 180)
    # Stone background
    for y in range(180):
        for x in range(320):
            # stone tile grid
            tx = (x // 32) % 2
            ty = (y // 24) % 2
            base_c = DK if (tx + ty) % 2 == 0 else ST
            r, gg2, b = base_c[:3]
            # add torch warmth (orange glow from center-ish)
            cx2, cy2 = 160, 90
            dist = ((x - cx2) ** 2 + (y - cy2) ** 2) ** 0.5
            warmth = max(0, 1.0 - dist / 200.0)
            r = min(255, int(r + warmth * 40))
            gg2 = min(255, int(gg2 + warmth * 20))
            g[y][x] = (r, gg2, b, 255)
    # Stone block outlines
    for y in range(0, 180, 24):
        hline(g, 0, y, 320, K)
    for yi in range(0, 180 // 24 + 1):
        offset = 16 if yi % 2 == 0 else 0
        for x in range(offset, 320, 32):
            vline(g, x, yi * 24, min(24, 180 - yi * 24), K)
    # Torch flames (left and right edges)
    for (tx, ty) in [(20, 30), (300, 30), (20, 140), (300, 140)]:
        rect(g, tx - 2, ty, 4, 8, BN)
        rect(g, tx - 2, ty - 6, 4, 7, FR)
        rect(g, tx - 1, ty - 9, 2, 4, YL)
        dot(g, tx, ty - 10, NW)
        # glow
        for gy in range(ty - 15, ty + 15):
            for gx in range(tx - 12, tx + 12):
                if 0 <= gy < 180 and 0 <= gx < 320:
                    dx2 = gx - tx; dy2 = gy - ty
                    dist2 = (dx2 * dx2 + dy2 * dy2) ** 0.5
                    if dist2 < 12:
                        r2, gg2, b2 = g[gy][gx][:3]
                        warm = max(0, 1 - dist2 / 12.0)
                        g[gy][gx] = (min(255, int(r2 + warm * 50)), min(255, int(gg2 + warm * 20)), b2, 255)
    write_png(os.path.join(OUT_DIR, 'bg_options.png'), g)


def gen_bg_credits():
    """Credits screen backdrop: dusk sky with silhouette cityscape."""
    g = blank(320, 180)
    # Dusk gradient
    dusk_colors = [
        (30, 20, 60), (50, 30, 80), (80, 40, 90), (120, 60, 80),
        (160, 80, 60), (200, 110, 50), (220, 140, 60), (240, 170, 80),
    ]
    for y in range(180):
        t = y / 179.0
        seg = min(int(t * (len(dusk_colors) - 1)), len(dusk_colors) - 2)
        lt = t * (len(dusk_colors) - 1) - seg
        c0, c1 = dusk_colors[seg], dusk_colors[seg + 1]
        r = int(c0[0] * (1 - lt) + c1[0] * lt)
        gg2 = int(c0[1] * (1 - lt) + c1[1] * lt)
        b = int(c0[2] * (1 - lt) + c1[2] * lt)
        hline(g, 0, y, 320, (r, gg2, b, 255))
    # Silhouette buildings
    buildings = [
        (0, 80, 30, 100), (25, 70, 40, 110), (60, 55, 35, 125),
        (90, 90, 50, 90), (135, 60, 45, 120), (175, 75, 55, 105),
        (225, 50, 40, 130), (260, 80, 35, 100), (290, 65, 30, 115),
    ]
    for (bx, bw, bh, by) in buildings:
        for y in range(180 - bh, 180):
            hline(g, bx, y, bw, (15, 10, 20, 255))
        # windows (lit)
        for wy in range(180 - bh + 5, 180, 8):
            for wx in range(bx + 5, bx + bw - 5, 10):
                if (wx + wy) % 3 != 0:  # some lights on
                    rect(g, wx, wy, 4, 3, (240, 200, 80, 255))
    # Ground
    for y in range(175, 180):
        hline(g, 0, y, 320, (20, 15, 25, 255))
    write_png(os.path.join(OUT_DIR, 'bg_credits.png'), g)


def gen_bg_gameover():
    """Game over screen: dark red vignette with cracked ground effect."""
    g = blank(320, 180)
    # Base color: very dark red
    for y in range(180):
        for x in range(320):
            # vignette
            cx2, cy2 = 160, 90
            dx2 = (x - cx2) / 160.0
            dy2 = (y - cy2) / 90.0
            dist_n = min(1.0, (dx2 * dx2 + dy2 * dy2) ** 0.5)
            darkness = int(dist_n * 80)
            r = max(0, 60 - darkness)
            gg2 = max(0, 5 - darkness // 4)
            b = max(0, 5 - darkness // 4)
            g[y][x] = (r, gg2, b, 255)
    # Cracked ground (lower third)
    for y in range(120, 180):
        hline(g, 0, y, 320, (20, 5, 5, 255))
    # Cracks
    crack_paths = [
        [(160, 120), (155, 130), (150, 140), (145, 155), (140, 170), (135, 180)],
        [(160, 120), (165, 132), (170, 142), (175, 155), (180, 168)],
        [(155, 130), (145, 138), (135, 148), (120, 158)],
        [(165, 132), (178, 138), (188, 145), (200, 155)],
        [(145, 138), (140, 150), (135, 162), (130, 175)],
        [(178, 138), (188, 150), (195, 165)],
    ]
    for path in crack_paths:
        for i in range(len(path) - 1):
            x0, y0 = path[i]; x1, y1 = path[i + 1]
            steps = max(abs(x1 - x0), abs(y1 - y0))
            if steps == 0: continue
            for s in range(steps + 1):
                t = s / steps
                cx2 = int(x0 + (x1 - x0) * t)
                cy2 = int(y0 + (y1 - y0) * t)
                if 0 <= cx2 < 320 and 0 <= cy2 < 180:
                    g[cy2][cx2] = K
                    # lava glow in crack
                    if (cx2 + cy2) % 3 == 0 and 0 <= cy2 + 1 < 180:
                        g[cy2 + 1][cx2] = DB
    # Red glow at center
    for my in range(80, 140):
        for mx in range(120, 200):
            dx2 = mx - 160; dy2 = my - 110
            d2 = dx2 * dx2 + dy2 * dy2
            if d2 < 1600:
                r2, gg2, b2 = g[my][mx][:3]
                glow = max(0, 1 - (d2 ** 0.5) / 40.0)
                g[my][mx] = (min(255, int(r2 + glow * 60)), gg2, b2, 255)
    write_png(os.path.join(OUT_DIR, 'bg_gameover.png'), g)


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print('\n=== PixelRealm — Remaining Assets Generator ===\n')

    print('── Tilesets ──')
    gen_tileset_desert()
    gen_tileset_ice()
    gen_tileset_volcanic()
    gen_tileset_ocean()
    gen_tileset_dungeon()
    gen_tileset_town()

    print('\n── Enemy spritesheets ──')
    gen_enemy_slime()
    gen_enemy_skeleton()
    gen_enemy_orc()
    gen_enemy_boss()

    print('\n── Pickups & collectibles ──')
    gen_pickup_health()
    gen_pickup_mana()
    gen_pickup_coin()
    gen_pickup_gem()
    gen_pickup_star()

    print('\n── UI elements ──')
    gen_ui_btn()
    gen_ui_cursor()
    gen_ui_icon_skill()
    gen_ui_slot()

    print('\n── Menu backgrounds ──')
    gen_bg_menu_title()
    gen_bg_options()
    gen_bg_credits()
    gen_bg_gameover()

    print(f'\n✓ All assets written to {os.path.abspath(OUT_DIR)}\n')


if __name__ == '__main__':
    main()
