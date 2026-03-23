#!/usr/bin/env python3
"""
Generate player housing art assets for PixelRealm.
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md exactly:
  - 32-color master palette, SNES-era RPG style
  - Nearest-neighbor pixel art, no anti-aliasing
  - Naming convention: {category}_{name}_{variant}.{ext}

Outputs:
  Tilesets (16 tiles × 16×16 = 256×16 each):
    assets/tiles/tilesets/tileset_house_cottage.png
    assets/tiles/tilesets/tileset_house_manor.png
    assets/tiles/tilesets/tileset_house_interior.png

  Furniture sprites (16×16 each):
    assets/sprites/housing/sprite_furn_bed.png
    assets/sprites/housing/sprite_furn_table.png
    assets/sprites/housing/sprite_furn_chair.png
    assets/sprites/housing/sprite_furn_chest.png
    assets/sprites/housing/sprite_furn_shelf.png
    assets/sprites/housing/sprite_furn_rug.png
    assets/sprites/housing/sprite_furn_lamp.png
    assets/sprites/housing/sprite_furn_fireplace.png
    assets/sprites/housing/sprite_furn_crafting_bench.png
    assets/sprites/housing/sprite_furn_cooking_pot.png

  Decoration sprites (16×16 each):
    assets/sprites/housing/sprite_decor_painting.png
    assets/sprites/housing/sprite_decor_plant.png
    assets/sprites/housing/sprite_decor_trophy.png
    assets/sprites/housing/sprite_decor_pet_bed.png
    assets/sprites/housing/sprite_decor_banner.png
    assets/sprites/housing/sprite_decor_candles.png

  Housing UI:
    assets/ui/housing/ui_panel_housing.png           : 160×120  management panel
    assets/ui/housing/icon_land_deed.png             : 16×16
    assets/ui/housing/ui_house_preview_frame.png     : 48×48

  Land plot markers (16×16 each):
    assets/sprites/housing/sprite_plot_boundary.png
    assets/sprites/housing/sprite_plot_for_sale.png
    assets/sprites/housing/sprite_plot_flag.png
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
PROJ_DIR = os.path.join(SCRIPT_DIR, '..')
TILESET_DIR = os.path.join(PROJ_DIR, 'assets', 'tiles', 'tilesets')
SPRITE_DIR = os.path.join(PROJ_DIR, 'assets', 'sprites', 'housing')
UI_DIR = os.path.join(PROJ_DIR, 'assets', 'ui', 'housing')

os.makedirs(TILESET_DIR, exist_ok=True)
os.makedirs(SPRITE_DIR, exist_ok=True)
os.makedirs(UI_DIR, exist_ok=True)

# ─── Palette (RGBA tuples) — from ART-STYLE-GUIDE.md ────────────────────────

_ = (0, 0, 0, 0)          # transparent

# Neutrals
K   = (13,  13,  13,  255)  # shadow black / outline
DK  = (43,  43,  43,  255)  # dark rock
ST  = (74,  74,  74,  255)  # stone gray
MG  = (110, 110, 110, 255)  # mid gray
LS  = (150, 150, 150, 255)  # light stone
PG  = (200, 200, 200, 255)  # pale gray
NW  = (240, 240, 240, 255)  # near white

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
DP  = (26,  74,  138, 255)  # ocean blue
SB  = (42,  122, 192, 255)  # sky blue
PB  = (80,  168, 232, 255)  # player blue
HB  = (144, 208, 248, 255)  # ice / pale water
IW  = (200, 240, 255, 255)  # ice white

# Red / enemy
DB  = (90,  10,  10,  255)  # deep blood
ER  = (160, 16,  16,  255)  # enemy red
BR  = (212, 32,  32,  255)  # bright red
FR  = (240, 96,  32,  255)  # fire orange
EM  = (248, 160, 96,  255)  # ember

# Yellow / gold
DG  = (168, 112, 0,   255)  # dark gold
GD  = (232, 184, 0,   255)  # gold
YL  = (255, 224, 64,  255)  # bright yellow
PY  = (255, 248, 160, 255)  # pale highlight

# Purple / magic
PM  = (26,  10,  58,  255)  # deep magic
MP  = (90,  32,  160, 255)  # magic purple
MV  = (144, 80,  224, 255)  # mana violet
SG  = (208, 144, 255, 255)  # spell glow

# ─── PNG writer ──────────────────────────────────────────────────────────────

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
    print(f'  wrote {path}  ({width}x{height})')

# ─── Sprite helpers ──────────────────────────────────────────────────────────

def blank(w, h, fill=None):
    fill = fill or _
    return [[fill]*w for __ in range(h)]

def hstack(frames):
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result

def fill_rect(grid, x, y, w, h, color):
    for r in range(y, min(y+h, len(grid))):
        for c in range(x, min(x+w, len(grid[0]))):
            grid[r][c] = color

def draw_pixel(grid, x, y, color):
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color

# ─── House exterior tileset: cottage ─────────────────────────────────────────
# 16 tiles × 16×16: wall, wall_top, wall_bottom, roof_left, roof_mid, roof_right,
# door, window, chimney, foundation, corner_tl, corner_tr, corner_bl, corner_br,
# porch, gable

def make_cottage_tileset():
    tiles = []

    # Tile 0: Wall (wooden planks — warm brown)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DT)
    for y in [0, 4, 8, 12]:
        fill_rect(t, 0, y, 16, 1, BN)
    fill_rect(t, 7, 0, 1, 4, BN)
    fill_rect(t, 3, 4, 1, 4, BN)
    fill_rect(t, 11, 4, 1, 4, BN)
    fill_rect(t, 7, 8, 1, 4, BN)
    fill_rect(t, 3, 12, 1, 4, BN)
    fill_rect(t, 11, 12, 1, 4, BN)
    tiles.append(t)

    # Tile 1: Wall top edge
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DT)
    fill_rect(t, 0, 0, 16, 2, BD)
    for y in [4, 8, 12]:
        fill_rect(t, 0, y, 16, 1, BN)
    tiles.append(t)

    # Tile 2: Wall bottom edge (foundation)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 12, DT)
    for y in [0, 4, 8]:
        fill_rect(t, 0, y, 16, 1, BN)
    fill_rect(t, 0, 12, 16, 4, ST)
    fill_rect(t, 0, 12, 16, 1, MG)
    tiles.append(t)

    # Tile 3: Roof left slope (thatched — green/brown)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DF)
    for y in range(16):
        edge = y // 2
        fill_rect(t, 0, y, edge, 1, _)
        if edge < 16:
            draw_pixel(t, edge, y, FG)
    fill_rect(t, 0, 15, 16, 1, BD)
    for y in range(0, 16, 3):
        for x in range(y // 2 + 1, 16, 4):
            draw_pixel(t, x, y, FG)
    tiles.append(t)

    # Tile 4: Roof middle (thatched flat top)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DF)
    for y in range(0, 16, 3):
        for x in range(0, 16, 4):
            draw_pixel(t, x + (y % 2), y, FG)
    fill_rect(t, 0, 15, 16, 1, BD)
    tiles.append(t)

    # Tile 5: Roof right slope
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DF)
    for y in range(16):
        edge = 15 - y // 2
        fill_rect(t, edge + 1, y, 16 - edge, 1, _)
        if edge >= 0:
            draw_pixel(t, edge, y, FG)
    fill_rect(t, 0, 15, 16, 1, BD)
    for y in range(0, 16, 3):
        for x in range(0, 15 - y // 2, 4):
            draw_pixel(t, x + (y % 2), y, FG)
    tiles.append(t)

    # Tile 6: Door (wooden)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DT)
    # door frame
    fill_rect(t, 3, 0, 10, 16, BD)
    fill_rect(t, 4, 1, 8, 14, BN)
    # door planks
    fill_rect(t, 7, 1, 1, 14, BD)
    # door handle
    draw_pixel(t, 10, 8, GD)
    draw_pixel(t, 10, 9, DG)
    # threshold
    fill_rect(t, 3, 15, 10, 1, ST)
    tiles.append(t)

    # Tile 7: Window
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DT)
    for y in [0, 8]:
        fill_rect(t, 0, y, 16, 1, BN)
    # window frame
    fill_rect(t, 3, 3, 10, 10, BD)
    fill_rect(t, 4, 4, 8, 8, HB)
    # window cross
    fill_rect(t, 7, 4, 2, 8, BD)
    fill_rect(t, 4, 7, 8, 2, BD)
    # light reflection
    draw_pixel(t, 5, 5, IW)
    draw_pixel(t, 10, 5, IW)
    tiles.append(t)

    # Tile 8: Chimney
    t = blank(16, 16)
    fill_rect(t, 4, 4, 8, 12, ST)
    fill_rect(t, 4, 4, 8, 1, MG)
    fill_rect(t, 3, 4, 1, 12, DK)
    fill_rect(t, 12, 4, 1, 12, DK)
    fill_rect(t, 3, 3, 10, 1, MG)
    # smoke wisps
    draw_pixel(t, 7, 1, LS)
    draw_pixel(t, 8, 0, PG)
    tiles.append(t)

    # Tile 9: Stone foundation
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, ST)
    fill_rect(t, 0, 0, 16, 1, MG)
    for y in [4, 8, 12]:
        fill_rect(t, 0, y, 16, 1, DK)
    fill_rect(t, 3, 0, 1, 4, DK)
    fill_rect(t, 11, 0, 1, 4, DK)
    fill_rect(t, 7, 4, 1, 4, DK)
    fill_rect(t, 3, 8, 1, 4, DK)
    fill_rect(t, 11, 8, 1, 4, DK)
    fill_rect(t, 7, 12, 1, 4, DK)
    tiles.append(t)

    # Tile 10: Corner top-left
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DT)
    fill_rect(t, 0, 0, 2, 16, BD)
    fill_rect(t, 0, 0, 16, 2, BD)
    for y in [4, 8, 12]:
        fill_rect(t, 2, y, 14, 1, BN)
    tiles.append(t)

    # Tile 11: Corner top-right
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DT)
    fill_rect(t, 14, 0, 2, 16, BD)
    fill_rect(t, 0, 0, 16, 2, BD)
    for y in [4, 8, 12]:
        fill_rect(t, 0, y, 14, 1, BN)
    tiles.append(t)

    # Tile 12: Corner bottom-left
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 12, DT)
    fill_rect(t, 0, 0, 2, 16, BD)
    fill_rect(t, 0, 12, 16, 4, ST)
    fill_rect(t, 0, 12, 16, 1, MG)
    tiles.append(t)

    # Tile 13: Corner bottom-right
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 12, DT)
    fill_rect(t, 14, 0, 2, 16, BD)
    fill_rect(t, 0, 12, 16, 4, ST)
    fill_rect(t, 0, 12, 16, 1, MG)
    tiles.append(t)

    # Tile 14: Porch (wooden planks, top-down)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, SN)
    for x in [0, 4, 8, 12]:
        fill_rect(t, x, 0, 1, 16, DT)
    fill_rect(t, 0, 7, 16, 1, DT)
    tiles.append(t)

    # Tile 15: Gable peak
    t = blank(16, 16)
    for y in range(16):
        left = 8 - y // 2
        right = 8 + y // 2
        if left >= 0 and right < 16:
            fill_rect(t, left, y, right - left + 1, 1, DF)
            draw_pixel(t, left, y, FG)
            draw_pixel(t, right, y, FG)
    tiles.append(t)

    return hstack(tiles)


def make_manor_tileset():
    """Manor tileset — larger, stone-based, more ornate."""
    tiles = []

    # Tile 0: Stone wall
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, LS)
    for y in [0, 4, 8, 12]:
        fill_rect(t, 0, y, 16, 1, MG)
    fill_rect(t, 7, 0, 1, 4, MG)
    fill_rect(t, 3, 4, 1, 4, MG)
    fill_rect(t, 11, 4, 1, 4, MG)
    fill_rect(t, 7, 8, 1, 4, MG)
    fill_rect(t, 3, 12, 1, 4, MG)
    fill_rect(t, 11, 12, 1, 4, MG)
    tiles.append(t)

    # Tile 1: Stone wall top
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, LS)
    fill_rect(t, 0, 0, 16, 3, ST)
    fill_rect(t, 0, 0, 16, 1, DK)
    # decorative cornice
    fill_rect(t, 0, 2, 16, 1, PG)
    for y in [6, 10, 14]:
        fill_rect(t, 0, y, 16, 1, MG)
    tiles.append(t)

    # Tile 2: Stone wall bottom
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 12, LS)
    for y in [0, 4, 8]:
        fill_rect(t, 0, y, 16, 1, MG)
    fill_rect(t, 0, 12, 16, 4, DK)
    fill_rect(t, 0, 12, 16, 1, ST)
    tiles.append(t)

    # Tile 3: Slate roof left
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DP)
    for y in range(16):
        edge = y // 2
        fill_rect(t, 0, y, edge, 1, _)
        if edge < 16:
            draw_pixel(t, edge, y, SB)
    fill_rect(t, 0, 15, 16, 1, OC)
    for y in range(0, 16, 2):
        for x in range(y // 2 + 1, 16, 3):
            draw_pixel(t, x, y, OC)
    tiles.append(t)

    # Tile 4: Slate roof middle
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DP)
    for y in range(0, 16, 2):
        for x in range(0, 16, 3):
            draw_pixel(t, x + (y % 2), y, OC)
    fill_rect(t, 0, 15, 16, 1, OC)
    tiles.append(t)

    # Tile 5: Slate roof right
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, DP)
    for y in range(16):
        edge = 15 - y // 2
        fill_rect(t, edge + 1, y, 16 - edge, 1, _)
        if edge >= 0:
            draw_pixel(t, edge, y, SB)
    fill_rect(t, 0, 15, 16, 1, OC)
    for y in range(0, 16, 2):
        for x in range(0, 15 - y // 2, 3):
            draw_pixel(t, x + (y % 2), y, OC)
    tiles.append(t)

    # Tile 6: Grand door (arched)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, LS)
    # door frame
    fill_rect(t, 2, 2, 12, 14, BD)
    fill_rect(t, 3, 3, 10, 12, BN)
    # arch top
    for x in range(5, 11):
        draw_pixel(t, x, 2, BD)
    draw_pixel(t, 4, 3, BD)
    draw_pixel(t, 11, 3, BD)
    # door split
    fill_rect(t, 7, 3, 2, 12, BD)
    # gold handles
    draw_pixel(t, 6, 9, GD)
    draw_pixel(t, 9, 9, GD)
    # gold knocker
    draw_pixel(t, 6, 7, YL)
    draw_pixel(t, 9, 7, YL)
    fill_rect(t, 2, 15, 12, 1, ST)
    tiles.append(t)

    # Tile 7: Tall window (stained glass)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, LS)
    for y in [0, 8]:
        fill_rect(t, 0, y, 16, 1, MG)
    fill_rect(t, 3, 2, 10, 12, DK)
    fill_rect(t, 4, 3, 8, 10, SB)
    # cross mullion
    fill_rect(t, 7, 3, 2, 10, DK)
    fill_rect(t, 4, 7, 8, 2, DK)
    # stained glass colors
    fill_rect(t, 4, 3, 3, 4, PB)
    fill_rect(t, 9, 3, 3, 4, MV)
    fill_rect(t, 4, 9, 3, 4, GD)
    fill_rect(t, 9, 9, 3, 4, LG)
    draw_pixel(t, 5, 4, IW)
    tiles.append(t)

    # Tile 8: Tower turret top
    t = blank(16, 16)
    fill_rect(t, 2, 6, 12, 10, ST)
    # crenellations
    for x in [2, 6, 10]:
        fill_rect(t, x, 3, 3, 3, ST)
        fill_rect(t, x, 3, 3, 1, MG)
    fill_rect(t, 2, 6, 12, 1, MG)
    tiles.append(t)

    # Tile 9: Pillar
    t = blank(16, 16)
    fill_rect(t, 5, 0, 6, 16, LS)
    fill_rect(t, 5, 0, 6, 1, PG)
    fill_rect(t, 5, 0, 1, 16, MG)
    fill_rect(t, 10, 0, 1, 16, ST)
    # capital detail
    fill_rect(t, 4, 0, 8, 2, PG)
    fill_rect(t, 4, 14, 8, 2, PG)
    tiles.append(t)

    # Tile 10: Corner top-left (stone)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, LS)
    fill_rect(t, 0, 0, 3, 16, ST)
    fill_rect(t, 0, 0, 16, 3, ST)
    fill_rect(t, 0, 0, 16, 1, DK)
    fill_rect(t, 0, 0, 1, 16, DK)
    tiles.append(t)

    # Tile 11: Corner top-right (stone)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, LS)
    fill_rect(t, 13, 0, 3, 16, ST)
    fill_rect(t, 0, 0, 16, 3, ST)
    fill_rect(t, 0, 0, 16, 1, DK)
    fill_rect(t, 15, 0, 1, 16, DK)
    tiles.append(t)

    # Tile 12: Corner bottom-left
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, LS)
    fill_rect(t, 0, 0, 3, 16, ST)
    fill_rect(t, 0, 13, 16, 3, DK)
    fill_rect(t, 0, 0, 1, 16, DK)
    tiles.append(t)

    # Tile 13: Corner bottom-right
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, LS)
    fill_rect(t, 13, 0, 3, 16, ST)
    fill_rect(t, 0, 13, 16, 3, DK)
    fill_rect(t, 15, 0, 1, 16, DK)
    tiles.append(t)

    # Tile 14: Balcony railing
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 2, PG)
    fill_rect(t, 0, 14, 16, 2, PG)
    for x in [0, 3, 7, 11, 15]:
        fill_rect(t, x, 0, 1, 16, MG)
    tiles.append(t)

    # Tile 15: Gable ornament
    t = blank(16, 16)
    for y in range(16):
        left = 8 - y // 2
        right = 8 + y // 2
        if 0 <= left and right < 16:
            fill_rect(t, left, y, right - left + 1, 1, DP)
            draw_pixel(t, left, y, SB)
            draw_pixel(t, right, y, SB)
    # gold ornament at peak
    draw_pixel(t, 7, 0, GD)
    draw_pixel(t, 8, 0, GD)
    draw_pixel(t, 7, 1, YL)
    draw_pixel(t, 8, 1, YL)
    tiles.append(t)

    return hstack(tiles)


def make_interior_tileset():
    """Interior tileset: floors, walls, doorways."""
    tiles = []

    # Tile 0: Wood floor
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, SN)
    for y in [0, 4, 8, 12]:
        fill_rect(t, 0, y, 16, 1, DT)
    fill_rect(t, 7, 0, 1, 4, DT)
    fill_rect(t, 3, 4, 1, 4, DT)
    fill_rect(t, 11, 4, 1, 4, DT)
    fill_rect(t, 7, 8, 1, 4, DT)
    fill_rect(t, 3, 12, 1, 4, DT)
    fill_rect(t, 11, 12, 1, 4, DT)
    # wood grain
    draw_pixel(t, 2, 2, DS)
    draw_pixel(t, 10, 6, DS)
    draw_pixel(t, 5, 10, DS)
    draw_pixel(t, 13, 14, DS)
    tiles.append(t)

    # Tile 1: Stone floor
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, MG)
    fill_rect(t, 0, 0, 8, 8, LS)
    fill_rect(t, 8, 8, 8, 8, LS)
    # grout lines
    fill_rect(t, 0, 7, 16, 2, ST)
    fill_rect(t, 7, 0, 2, 16, ST)
    tiles.append(t)

    # Tile 2: Carpet (red/gold — royal)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, ER)
    fill_rect(t, 0, 0, 16, 1, DG)
    fill_rect(t, 0, 15, 16, 1, DG)
    fill_rect(t, 0, 0, 1, 16, DG)
    fill_rect(t, 15, 0, 1, 16, DG)
    # carpet pattern
    fill_rect(t, 2, 2, 12, 12, BR)
    fill_rect(t, 3, 3, 10, 10, ER)
    # gold diamond in center
    for i in range(3):
        draw_pixel(t, 7 - i, 7 + i, GD)
        draw_pixel(t, 8 + i, 7 + i, GD)
        draw_pixel(t, 7 - i, 8 - i, GD)
        draw_pixel(t, 8 + i, 8 - i, GD)
    tiles.append(t)

    # Tile 3: Interior wall (plastered)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, PS)
    fill_rect(t, 0, 14, 16, 2, SN)
    fill_rect(t, 0, 14, 16, 1, DT)
    # subtle texture
    draw_pixel(t, 4, 3, DS)
    draw_pixel(t, 10, 7, DS)
    draw_pixel(t, 2, 11, DS)
    tiles.append(t)

    # Tile 4: Interior wall top
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, PS)
    fill_rect(t, 0, 0, 16, 2, DT)
    fill_rect(t, 0, 0, 16, 1, BD)
    # crown molding
    fill_rect(t, 0, 2, 16, 1, SN)
    tiles.append(t)

    # Tile 5: Doorway (interior arch)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, PS)
    fill_rect(t, 3, 0, 10, 16, SN)
    fill_rect(t, 4, 1, 8, 14, _)
    # door frame
    fill_rect(t, 3, 0, 1, 16, DT)
    fill_rect(t, 12, 0, 1, 16, DT)
    fill_rect(t, 3, 0, 10, 1, DT)
    tiles.append(t)

    # Tile 6: Wainscoting (lower wall panel)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 8, PS)
    fill_rect(t, 0, 8, 16, 8, DT)
    fill_rect(t, 0, 7, 16, 2, SN)
    # panel detail
    fill_rect(t, 2, 10, 5, 4, BN)
    fill_rect(t, 9, 10, 5, 4, BN)
    fill_rect(t, 3, 11, 3, 2, DT)
    fill_rect(t, 10, 11, 3, 2, DT)
    tiles.append(t)

    # Tile 7: Stairs
    t = blank(16, 16)
    for i in range(8):
        y = i * 2
        fill_rect(t, 0, y, 16, 2, SN if i % 2 == 0 else DT)
        fill_rect(t, 0, y, 16, 1, BD)
    tiles.append(t)

    # Tile 8: Checkered floor (kitchen)
    t = blank(16, 16)
    for cy in range(4):
        for cx in range(4):
            c = PG if (cx + cy) % 2 == 0 else DT
            fill_rect(t, cx * 4, cy * 4, 4, 4, c)
    tiles.append(t)

    # Tile 9: Window interior view
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, PS)
    fill_rect(t, 2, 2, 12, 12, DK)
    fill_rect(t, 3, 3, 10, 10, SB)
    fill_rect(t, 7, 3, 2, 10, DT)
    fill_rect(t, 3, 7, 10, 2, DT)
    # curtains
    fill_rect(t, 3, 3, 2, 10, ER)
    fill_rect(t, 11, 3, 2, 10, ER)
    draw_pixel(t, 4, 4, BR)
    draw_pixel(t, 12, 4, BR)
    tiles.append(t)

    # Tile 10: Baseboard
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 14, PS)
    fill_rect(t, 0, 14, 16, 2, BD)
    fill_rect(t, 0, 13, 16, 1, BN)
    tiles.append(t)

    # Tile 11: Wall corner left
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, PS)
    fill_rect(t, 0, 0, 2, 16, DT)
    fill_rect(t, 0, 14, 16, 2, SN)
    tiles.append(t)

    # Tile 12: Wall corner right
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, PS)
    fill_rect(t, 14, 0, 2, 16, DT)
    fill_rect(t, 0, 14, 16, 2, SN)
    tiles.append(t)

    # Tile 13: Hearth stone (fireplace floor)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, ST)
    fill_rect(t, 0, 0, 16, 1, DK)
    fill_rect(t, 0, 15, 16, 1, DK)
    fill_rect(t, 0, 0, 1, 16, DK)
    fill_rect(t, 15, 0, 1, 16, DK)
    # soot marks
    draw_pixel(t, 5, 5, DK)
    draw_pixel(t, 10, 8, DK)
    draw_pixel(t, 7, 12, DK)
    tiles.append(t)

    # Tile 14: Tile floor (bathroom/fancy)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 16, HB)
    fill_rect(t, 0, 0, 8, 8, PB)
    fill_rect(t, 8, 8, 8, 8, PB)
    fill_rect(t, 7, 0, 2, 16, DP)
    fill_rect(t, 0, 7, 16, 2, DP)
    tiles.append(t)

    # Tile 15: Grass mat / entry rug
    t = blank(16, 16)
    fill_rect(t, 1, 1, 14, 14, FG)
    fill_rect(t, 2, 2, 12, 12, LG)
    fill_rect(t, 0, 0, 16, 1, DF)
    fill_rect(t, 0, 15, 16, 1, DF)
    fill_rect(t, 0, 0, 1, 16, DF)
    fill_rect(t, 15, 0, 1, 16, DF)
    tiles.append(t)

    return hstack(tiles)


# ─── Furniture sprites (16×16 each) ──────────────────────────────────────────

def make_bed():
    t = blank(16, 16)
    # frame
    fill_rect(t, 1, 4, 14, 10, BN)
    fill_rect(t, 2, 5, 12, 8, DT)
    # pillow
    fill_rect(t, 2, 5, 4, 3, NW)
    fill_rect(t, 3, 6, 2, 1, PG)
    # blanket
    fill_rect(t, 2, 8, 12, 5, DP)
    fill_rect(t, 2, 8, 12, 1, SB)
    # headboard
    fill_rect(t, 1, 2, 14, 3, BD)
    fill_rect(t, 1, 2, 14, 1, BN)
    # legs
    fill_rect(t, 1, 14, 2, 2, BD)
    fill_rect(t, 13, 14, 2, 2, BD)
    return t

def make_table():
    t = blank(16, 16)
    # tabletop
    fill_rect(t, 1, 5, 14, 3, DT)
    fill_rect(t, 1, 5, 14, 1, SN)
    fill_rect(t, 0, 4, 16, 1, BN)
    # legs
    fill_rect(t, 2, 8, 2, 8, BN)
    fill_rect(t, 12, 8, 2, 8, BN)
    # cross brace
    fill_rect(t, 4, 11, 8, 1, BD)
    return t

def make_chair():
    t = blank(16, 16)
    # back
    fill_rect(t, 4, 2, 8, 2, BN)
    fill_rect(t, 4, 1, 8, 1, DT)
    # back supports
    fill_rect(t, 4, 2, 2, 8, BN)
    fill_rect(t, 10, 2, 2, 8, BN)
    # seat
    fill_rect(t, 3, 8, 10, 3, DT)
    fill_rect(t, 3, 8, 10, 1, SN)
    # legs
    fill_rect(t, 3, 11, 2, 5, BD)
    fill_rect(t, 11, 11, 2, 5, BD)
    return t

def make_chest():
    t = blank(16, 16)
    # body
    fill_rect(t, 2, 6, 12, 8, BN)
    fill_rect(t, 2, 6, 12, 1, DT)
    # lid
    fill_rect(t, 1, 4, 14, 3, DT)
    fill_rect(t, 1, 4, 14, 1, SN)
    # metal bands
    fill_rect(t, 1, 5, 14, 1, ST)
    fill_rect(t, 1, 10, 14, 1, ST)
    # lock
    draw_pixel(t, 7, 8, GD)
    draw_pixel(t, 8, 8, GD)
    draw_pixel(t, 7, 9, DG)
    draw_pixel(t, 8, 9, DG)
    # base
    fill_rect(t, 2, 14, 12, 2, BD)
    return t

def make_shelf():
    t = blank(16, 16)
    # back panel
    fill_rect(t, 2, 0, 12, 16, DT)
    # shelves
    fill_rect(t, 1, 0, 14, 1, BN)
    fill_rect(t, 1, 5, 14, 1, BN)
    fill_rect(t, 1, 10, 14, 1, BN)
    fill_rect(t, 1, 15, 14, 1, BN)
    # side panels
    fill_rect(t, 1, 0, 1, 16, BD)
    fill_rect(t, 14, 0, 1, 16, BD)
    # items on shelves
    fill_rect(t, 4, 1, 3, 4, DP)  # book blue
    fill_rect(t, 8, 2, 2, 3, ER)  # book red
    draw_pixel(t, 11, 3, GD)      # trinket
    fill_rect(t, 3, 6, 2, 4, FG)  # bottle green
    draw_pixel(t, 7, 8, YL)       # candle
    fill_rect(t, 10, 6, 3, 4, MP) # book purple
    tiles_row3 = [
        (4, 11, 2, 4, SN),        # scroll
        (8, 12, 3, 3, BR),        # box
    ]
    for x, y, w, h, c in tiles_row3:
        fill_rect(t, x, y, w, h, c)
    return t

def make_rug():
    t = blank(16, 16)
    # outer border
    fill_rect(t, 1, 3, 14, 10, ER)
    # inner border
    fill_rect(t, 2, 4, 12, 8, DG)
    # center field
    fill_rect(t, 3, 5, 10, 6, BR)
    # pattern
    draw_pixel(t, 5, 7, GD)
    draw_pixel(t, 7, 6, GD)
    draw_pixel(t, 10, 8, GD)
    draw_pixel(t, 8, 9, GD)
    # fringe
    for x in range(2, 14, 2):
        draw_pixel(t, x, 2, DG)
        draw_pixel(t, x, 13, DG)
    return t

def make_lamp():
    t = blank(16, 16)
    # base
    fill_rect(t, 6, 14, 4, 2, ST)
    # pole
    fill_rect(t, 7, 6, 2, 8, MG)
    # shade
    fill_rect(t, 4, 3, 8, 4, PS)
    fill_rect(t, 5, 2, 6, 1, DS)
    fill_rect(t, 3, 7, 10, 1, DG)
    # light glow
    draw_pixel(t, 7, 5, YL)
    draw_pixel(t, 8, 5, YL)
    draw_pixel(t, 7, 4, PY)
    draw_pixel(t, 8, 4, PY)
    # top finial
    draw_pixel(t, 7, 1, GD)
    draw_pixel(t, 8, 1, GD)
    return t

def make_fireplace():
    t = blank(16, 16)
    # stone surround
    fill_rect(t, 0, 0, 16, 16, ST)
    fill_rect(t, 0, 0, 16, 2, MG)
    # mantel
    fill_rect(t, 0, 2, 16, 2, DT)
    fill_rect(t, 0, 2, 16, 1, SN)
    # firebox opening
    fill_rect(t, 3, 4, 10, 12, DK)
    fill_rect(t, 4, 5, 8, 10, K)
    # fire
    fill_rect(t, 5, 10, 6, 5, FR)
    fill_rect(t, 6, 8, 4, 4, YL)
    draw_pixel(t, 7, 7, PY)
    draw_pixel(t, 8, 7, PY)
    # embers
    draw_pixel(t, 5, 14, EM)
    draw_pixel(t, 10, 14, EM)
    # logs
    fill_rect(t, 4, 13, 8, 2, BD)
    fill_rect(t, 5, 12, 6, 1, BN)
    return t

def make_crafting_bench():
    t = blank(16, 16)
    # workbench top
    fill_rect(t, 0, 4, 16, 4, DT)
    fill_rect(t, 0, 4, 16, 1, SN)
    # legs
    fill_rect(t, 1, 8, 2, 8, BD)
    fill_rect(t, 13, 8, 2, 8, BD)
    # shelf below
    fill_rect(t, 2, 11, 12, 1, BN)
    # tools on bench
    fill_rect(t, 2, 2, 1, 3, MG)  # hammer handle
    draw_pixel(t, 1, 1, ST)       # hammer head
    draw_pixel(t, 2, 1, ST)
    draw_pixel(t, 3, 1, MG)
    fill_rect(t, 6, 3, 4, 2, SN)  # wood piece
    draw_pixel(t, 11, 3, BR)      # nail box
    draw_pixel(t, 12, 3, BR)
    return t

def make_cooking_pot():
    t = blank(16, 16)
    # pot body
    fill_rect(t, 3, 6, 10, 8, DK)
    fill_rect(t, 4, 7, 8, 6, ST)
    # rim
    fill_rect(t, 2, 5, 12, 2, MG)
    fill_rect(t, 2, 5, 12, 1, LS)
    # handles
    fill_rect(t, 1, 6, 2, 3, ST)
    fill_rect(t, 13, 6, 2, 3, ST)
    # steam
    draw_pixel(t, 6, 3, PG)
    draw_pixel(t, 8, 2, NW)
    draw_pixel(t, 10, 3, PG)
    draw_pixel(t, 7, 1, NW)
    # legs
    fill_rect(t, 4, 14, 2, 2, DK)
    fill_rect(t, 10, 14, 2, 2, DK)
    # stew color
    fill_rect(t, 5, 6, 6, 2, BN)
    draw_pixel(t, 6, 6, FG)
    draw_pixel(t, 9, 7, FR)
    return t


# ─── Decoration sprites (16×16 each) ────────────────────────────────────────

def make_painting():
    t = blank(16, 16)
    # frame
    fill_rect(t, 1, 2, 14, 12, DG)
    fill_rect(t, 2, 3, 12, 10, BN)
    # canvas
    fill_rect(t, 3, 4, 10, 8, SB)
    # landscape painting
    fill_rect(t, 3, 8, 10, 4, LG)
    fill_rect(t, 3, 10, 10, 2, FG)
    # sun
    draw_pixel(t, 10, 5, YL)
    draw_pixel(t, 11, 5, YL)
    draw_pixel(t, 10, 6, GD)
    # mountains
    draw_pixel(t, 5, 6, MG)
    draw_pixel(t, 6, 5, ST)
    draw_pixel(t, 7, 6, MG)
    # hanging wire
    draw_pixel(t, 7, 1, MG)
    draw_pixel(t, 8, 1, MG)
    return t

def make_plant():
    t = blank(16, 16)
    # pot
    fill_rect(t, 4, 10, 8, 5, ER)
    fill_rect(t, 5, 10, 6, 1, BR)
    fill_rect(t, 3, 15, 10, 1, DB)
    # soil
    fill_rect(t, 5, 10, 6, 2, BD)
    # leaves
    fill_rect(t, 5, 4, 6, 6, FG)
    fill_rect(t, 6, 3, 4, 2, LG)
    draw_pixel(t, 7, 2, BG)
    draw_pixel(t, 8, 2, BG)
    fill_rect(t, 3, 5, 3, 3, LG)
    fill_rect(t, 10, 5, 3, 3, LG)
    draw_pixel(t, 4, 6, BG)
    draw_pixel(t, 11, 6, BG)
    # flower
    draw_pixel(t, 7, 3, YL)
    draw_pixel(t, 9, 4, FR)
    return t

def make_trophy():
    t = blank(16, 16)
    # base
    fill_rect(t, 4, 13, 8, 3, DG)
    fill_rect(t, 5, 13, 6, 1, GD)
    # pedestal
    fill_rect(t, 5, 11, 6, 2, GD)
    # stem
    fill_rect(t, 7, 7, 2, 4, GD)
    # cup
    fill_rect(t, 4, 3, 8, 5, GD)
    fill_rect(t, 5, 2, 6, 1, YL)
    fill_rect(t, 5, 4, 6, 3, YL)
    # handles
    fill_rect(t, 2, 3, 2, 3, GD)
    fill_rect(t, 12, 3, 2, 3, GD)
    # star
    draw_pixel(t, 7, 4, PY)
    draw_pixel(t, 8, 4, PY)
    return t

def make_pet_bed():
    t = blank(16, 16)
    # cushion base
    fill_rect(t, 1, 8, 14, 7, SN)
    fill_rect(t, 2, 9, 12, 5, DS)
    # raised edges
    fill_rect(t, 1, 7, 14, 2, DT)
    fill_rect(t, 0, 8, 1, 6, BN)
    fill_rect(t, 15, 8, 1, 6, BN)
    # cushion highlight
    fill_rect(t, 4, 10, 8, 3, PS)
    # paw print detail
    draw_pixel(t, 7, 11, DT)
    draw_pixel(t, 8, 11, DT)
    draw_pixel(t, 6, 10, DT)
    draw_pixel(t, 9, 10, DT)
    # rim
    fill_rect(t, 1, 15, 14, 1, BD)
    return t

def make_banner():
    t = blank(16, 16)
    # rod
    fill_rect(t, 2, 0, 12, 1, DG)
    fill_rect(t, 1, 0, 1, 2, GD)
    fill_rect(t, 14, 0, 1, 2, GD)
    # banner cloth
    fill_rect(t, 3, 1, 10, 12, DP)
    fill_rect(t, 4, 2, 8, 10, SB)
    # heraldic device — simple shield
    fill_rect(t, 5, 4, 6, 5, PB)
    fill_rect(t, 6, 3, 4, 1, PB)
    draw_pixel(t, 7, 9, PB)
    draw_pixel(t, 8, 9, PB)
    # emblem
    draw_pixel(t, 7, 5, GD)
    draw_pixel(t, 8, 5, GD)
    draw_pixel(t, 7, 6, YL)
    draw_pixel(t, 8, 6, YL)
    # banner tail (v-cut)
    fill_rect(t, 3, 13, 4, 2, DP)
    fill_rect(t, 9, 13, 4, 2, DP)
    draw_pixel(t, 4, 14, SB)
    draw_pixel(t, 11, 14, SB)
    return t

def make_candles():
    t = blank(16, 16)
    # candle holder plate
    fill_rect(t, 3, 13, 10, 2, GD)
    fill_rect(t, 4, 12, 8, 1, DG)
    fill_rect(t, 2, 15, 12, 1, DG)
    # candles
    fill_rect(t, 4, 7, 2, 6, PG)
    fill_rect(t, 7, 5, 2, 8, PG)
    fill_rect(t, 10, 7, 2, 6, PG)
    # wicks
    draw_pixel(t, 4, 6, DK)
    draw_pixel(t, 7, 4, DK)
    draw_pixel(t, 10, 6, DK)
    # flames
    draw_pixel(t, 4, 5, YL)
    draw_pixel(t, 5, 5, FR)
    draw_pixel(t, 7, 3, YL)
    draw_pixel(t, 8, 3, FR)
    draw_pixel(t, 10, 5, YL)
    draw_pixel(t, 11, 5, FR)
    # glow
    draw_pixel(t, 7, 2, PY)
    return t


# ─── Land plot markers (16×16 each) ─────────────────────────────────────────

def make_plot_boundary():
    t = blank(16, 16)
    # corner stake
    fill_rect(t, 6, 2, 4, 12, DT)
    fill_rect(t, 6, 2, 4, 1, SN)
    fill_rect(t, 6, 14, 4, 2, BD)
    # rope lines extending
    fill_rect(t, 0, 7, 6, 1, SN)
    fill_rect(t, 10, 7, 6, 1, SN)
    fill_rect(t, 0, 8, 6, 1, DT)
    fill_rect(t, 10, 8, 6, 1, DT)
    # nail/pin
    draw_pixel(t, 7, 7, MG)
    draw_pixel(t, 8, 7, MG)
    return t

def make_for_sale_sign():
    t = blank(16, 16)
    # sign post
    fill_rect(t, 7, 6, 2, 10, BD)
    # sign board
    fill_rect(t, 1, 1, 14, 7, SN)
    fill_rect(t, 1, 1, 14, 1, DT)
    fill_rect(t, 1, 7, 14, 1, DT)
    fill_rect(t, 1, 1, 1, 7, DT)
    fill_rect(t, 14, 1, 1, 7, DT)
    # "SALE" text pixels
    # S
    draw_pixel(t, 3, 3, GD)
    draw_pixel(t, 4, 3, GD)
    draw_pixel(t, 3, 4, GD)
    draw_pixel(t, 3, 5, GD)
    draw_pixel(t, 4, 5, GD)
    # A
    draw_pixel(t, 6, 3, GD)
    draw_pixel(t, 6, 4, GD)
    draw_pixel(t, 6, 5, GD)
    draw_pixel(t, 7, 3, GD)
    draw_pixel(t, 7, 4, GD)
    # L
    draw_pixel(t, 9, 3, GD)
    draw_pixel(t, 9, 4, GD)
    draw_pixel(t, 9, 5, GD)
    draw_pixel(t, 10, 5, GD)
    # E
    draw_pixel(t, 12, 3, GD)
    draw_pixel(t, 12, 4, GD)
    draw_pixel(t, 12, 5, GD)
    draw_pixel(t, 13, 3, GD)
    draw_pixel(t, 13, 5, GD)
    return t

def make_ownership_flag():
    t = blank(16, 16)
    # pole
    fill_rect(t, 2, 0, 2, 16, MG)
    fill_rect(t, 2, 0, 2, 1, LS)
    # flag cloth
    fill_rect(t, 4, 1, 10, 8, PB)
    fill_rect(t, 5, 2, 8, 6, SB)
    # emblem on flag (crown)
    draw_pixel(t, 7, 3, GD)
    draw_pixel(t, 8, 3, GD)
    draw_pixel(t, 9, 3, GD)
    draw_pixel(t, 10, 3, GD)
    draw_pixel(t, 7, 4, YL)
    draw_pixel(t, 8, 4, YL)
    draw_pixel(t, 9, 4, YL)
    draw_pixel(t, 10, 4, YL)
    draw_pixel(t, 8, 2, YL)
    draw_pixel(t, 9, 2, YL)
    # flag wave tail
    draw_pixel(t, 13, 3, PB)
    draw_pixel(t, 13, 5, PB)
    draw_pixel(t, 14, 4, SB)
    # pole base
    fill_rect(t, 1, 14, 4, 2, ST)
    return t


# ─── Housing UI panel (160×120) ──────────────────────────────────────────────

def make_housing_panel():
    w, h = 160, 120
    t = blank(w, h)
    # Background fill
    fill_rect(t, 0, 0, w, h, K)
    fill_rect(t, 1, 1, w-2, h-2, DK)
    fill_rect(t, 2, 2, w-4, h-4, ST)
    # Border
    fill_rect(t, 0, 0, w, 2, MG)
    fill_rect(t, 0, h-2, w, 2, MG)
    fill_rect(t, 0, 0, 2, h, MG)
    fill_rect(t, w-2, 0, 2, h, MG)
    # Title bar
    fill_rect(t, 2, 2, w-4, 14, BD)
    fill_rect(t, 3, 3, w-6, 12, BN)
    # Title: "HOUSING" in pixel text
    title_pixels = [
        # H
        (6,5), (6,6), (6,7), (6,8), (6,9), (6,10),
        (7,8), (8,8),
        (9,5), (9,6), (9,7), (9,8), (9,9), (9,10),
        # O
        (11,6), (11,7), (11,8), (11,9),
        (12,5), (12,10),
        (13,5), (13,10),
        (14,6), (14,7), (14,8), (14,9),
        # U
        (16,5), (16,6), (16,7), (16,8), (16,9),
        (17,10), (18,10),
        (19,5), (19,6), (19,7), (19,8), (19,9),
        # S
        (21,5), (22,5), (23,5),
        (21,6), (21,7), (21,8),
        (22,8),
        (23,8), (23,9), (23,10),
        (21,10), (22,10),
        # I
        (25,5), (25,6), (25,7), (25,8), (25,9), (25,10),
        # N
        (27,5), (27,6), (27,7), (27,8), (27,9), (27,10),
        (28,6), (29,7), (30,8),
        (31,5), (31,6), (31,7), (31,8), (31,9), (31,10),
        # G
        (33,6), (33,7), (33,8), (33,9),
        (34,5), (34,10),
        (35,5), (35,10),
        (36,5), (36,8), (36,9), (36,10),
    ]
    for x, y in title_pixels:
        draw_pixel(t, x, y, GD)

    # House preview area (left)
    fill_rect(t, 6, 20, 60, 50, DK)
    fill_rect(t, 7, 21, 58, 48, K)
    # mini house silhouette
    fill_rect(t, 20, 40, 30, 20, DT)
    fill_rect(t, 22, 42, 26, 16, BN)
    # roof
    for i in range(10):
        fill_rect(t, 25 - i, 30 + i, 20 + 2*i, 1, DF)
    # door
    fill_rect(t, 32, 50, 6, 10, BD)
    # windows
    fill_rect(t, 24, 45, 5, 5, HB)
    fill_rect(t, 41, 45, 5, 5, HB)

    # Furniture slots grid (right side)
    for row in range(3):
        for col in range(4):
            sx = 76 + col * 20
            sy = 20 + row * 20
            fill_rect(t, sx, sy, 18, 18, DK)
            fill_rect(t, sx+1, sy+1, 16, 16, BD)
            # slot border
            fill_rect(t, sx, sy, 18, 1, MG)
            fill_rect(t, sx, sy+17, 18, 1, MG)
            fill_rect(t, sx, sy, 1, 18, MG)
            fill_rect(t, sx+17, sy, 1, 18, MG)

    # Bottom buttons area
    # "Place" button
    fill_rect(t, 10, 80, 40, 14, FG)
    fill_rect(t, 11, 81, 38, 12, LG)
    # "Move" button
    fill_rect(t, 60, 80, 40, 14, SB)
    fill_rect(t, 61, 81, 38, 12, PB)
    # "Remove" button
    fill_rect(t, 110, 80, 40, 14, ER)
    fill_rect(t, 111, 81, 38, 12, BR)

    # Status bar at bottom
    fill_rect(t, 4, 100, w-8, 16, DK)
    fill_rect(t, 5, 101, w-10, 14, BD)
    # furniture count area
    fill_rect(t, 8, 103, 60, 10, BN)
    # storage indicator
    fill_rect(t, 75, 103, 60, 10, BN)
    # capacity bar
    fill_rect(t, 76, 104, 58, 8, DK)
    fill_rect(t, 77, 105, 30, 6, LG)

    return t


def make_land_deed_icon():
    """16×16 land deed scroll icon."""
    t = blank(16, 16)
    # scroll body
    fill_rect(t, 3, 2, 10, 12, PS)
    fill_rect(t, 4, 3, 8, 10, PG)
    # scroll rolls
    fill_rect(t, 2, 1, 12, 2, SN)
    fill_rect(t, 2, 13, 12, 2, SN)
    fill_rect(t, 2, 1, 12, 1, DS)
    fill_rect(t, 2, 14, 12, 1, DT)
    # text lines
    fill_rect(t, 5, 4, 6, 1, MG)
    fill_rect(t, 5, 6, 6, 1, MG)
    fill_rect(t, 5, 8, 4, 1, MG)
    # seal
    fill_rect(t, 6, 10, 3, 3, ER)
    draw_pixel(t, 7, 11, GD)
    # ribbon
    draw_pixel(t, 6, 12, BR)
    draw_pixel(t, 8, 12, BR)
    return t


def make_house_preview_frame():
    """48×48 frame for house preview thumbnails."""
    w, h = 48, 48
    t = blank(w, h)
    # Outer frame
    fill_rect(t, 0, 0, w, h, DG)
    fill_rect(t, 1, 1, w-2, h-2, BN)
    fill_rect(t, 2, 2, w-4, h-4, DT)
    # Inner area (transparent for preview content)
    fill_rect(t, 4, 4, w-8, h-8, _)
    # Decorative corners
    for cx, cy in [(3,3), (w-4,3), (3,h-4), (w-4,h-4)]:
        draw_pixel(t, cx, cy, GD)
    # Border highlight
    fill_rect(t, 4, 3, w-8, 1, SN)
    fill_rect(t, 4, h-4, w-8, 1, BD)
    fill_rect(t, 3, 4, 1, h-8, SN)
    fill_rect(t, w-4, 4, 1, h-8, BD)
    return t


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print('Generating player housing art assets...\n')

    # Tilesets
    print('--- Tilesets ---')
    write_png(os.path.join(TILESET_DIR, 'tileset_house_cottage.png'), make_cottage_tileset())
    write_png(os.path.join(TILESET_DIR, 'tileset_house_manor.png'), make_manor_tileset())
    write_png(os.path.join(TILESET_DIR, 'tileset_house_interior.png'), make_interior_tileset())

    # Furniture sprites
    print('\n--- Furniture ---')
    furniture = {
        'sprite_furn_bed': make_bed,
        'sprite_furn_table': make_table,
        'sprite_furn_chair': make_chair,
        'sprite_furn_chest': make_chest,
        'sprite_furn_shelf': make_shelf,
        'sprite_furn_rug': make_rug,
        'sprite_furn_lamp': make_lamp,
        'sprite_furn_fireplace': make_fireplace,
        'sprite_furn_crafting_bench': make_crafting_bench,
        'sprite_furn_cooking_pot': make_cooking_pot,
    }
    for name, fn in furniture.items():
        write_png(os.path.join(SPRITE_DIR, f'{name}.png'), fn())

    # Decoration sprites
    print('\n--- Decorations ---')
    decorations = {
        'sprite_decor_painting': make_painting,
        'sprite_decor_plant': make_plant,
        'sprite_decor_trophy': make_trophy,
        'sprite_decor_pet_bed': make_pet_bed,
        'sprite_decor_banner': make_banner,
        'sprite_decor_candles': make_candles,
    }
    for name, fn in decorations.items():
        write_png(os.path.join(SPRITE_DIR, f'{name}.png'), fn())

    # Land plot markers
    print('\n--- Plot Markers ---')
    markers = {
        'sprite_plot_boundary': make_plot_boundary,
        'sprite_plot_for_sale': make_for_sale_sign,
        'sprite_plot_flag': make_ownership_flag,
    }
    for name, fn in markers.items():
        write_png(os.path.join(SPRITE_DIR, f'{name}.png'), fn())

    # Housing UI
    print('\n--- Housing UI ---')
    write_png(os.path.join(UI_DIR, 'ui_panel_housing.png'), make_housing_panel())
    write_png(os.path.join(UI_DIR, 'icon_land_deed.png'), make_land_deed_icon())
    write_png(os.path.join(UI_DIR, 'ui_house_preview_frame.png'), make_house_preview_frame())

    print('\nDone! All housing assets generated.')


if __name__ == '__main__':
    main()
