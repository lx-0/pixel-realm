#!/usr/bin/env python3
"""
Generate PvP arena system art assets for PixelRealm (PIX-104).
Uses only Python stdlib (struct + zlib) — no PIL required.
Follows docs/ART-STYLE-GUIDE.md exactly.

Assets produced:
  Arena tilesets (16 tiles × 16×16 = 256×16 each):
    tileset_arena_gladiator.png     — Gladiator Pit arena (stone, sand, torches)
    tileset_arena_shadow.png        — Shadow Sanctum arena (dark, purple runes)

  Arena UI panels:
    ui_panel_arena_queue.png        — 200×160 queue panel
    ui_arena_hud.png                — 320×24  match HUD
    ui_panel_arena_results.png      — 200×160 results panel

  Rank tier icons (16×16):
    icon_rank_arena_bronze.png
    icon_rank_arena_silver.png
    icon_rank_arena_gold.png
    icon_rank_arena_platinum.png
    icon_rank_arena_diamond.png

  Arena leaderboard panel:
    ui_panel_arena_leaderboard.png  — 200×180 leaderboard panel

  Spectator overlay:
    ui_arena_spectator.png          — 320×24 spectator HUD

  Victory/defeat splashes (320×180):
    bg_arena_victory.png
    bg_arena_defeat.png
"""

import struct
import zlib
import os

SCRIPT_DIR  = os.path.dirname(__file__)
OUT_DIR     = os.path.join(SCRIPT_DIR, '..', 'public', 'assets')
ART_UI      = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui')
ART_ARENA   = os.path.join(ART_UI, 'arena')
ART_ICONS   = os.path.join(ART_UI, 'icons')
ART_TILES   = os.path.join(SCRIPT_DIR, '..', 'assets', 'tiles', 'tilesets')
ART_BG      = os.path.join(SCRIPT_DIR, '..', 'assets', 'backgrounds')

for d in [OUT_DIR, ART_ARENA, ART_ICONS, ART_TILES, ART_BG]:
    os.makedirs(d, exist_ok=True)

# ─── Palette (RGBA tuples) — master 32-color palette ─────────────────────────

_ = (0, 0, 0, 0)          # transparent

# Neutrals
K   = (13,  13,  13,  255)   # shadow black / outline
DK  = (43,  43,  43,  255)   # dark rock
ST  = (74,  74,  74,  255)   # stone gray
MG  = (110, 110, 110, 255)   # mid gray
LS  = (150, 150, 150, 255)   # light stone
PG  = (200, 200, 200, 255)   # pale gray
NW  = (240, 240, 240, 255)   # near white

# Warm earth
BD  = (59,  32,  16,  255)   # deep soil
BN  = (107, 58,  31,  255)   # rich earth
DT  = (139, 92,  42,  255)   # dirt / wood
SN  = (184, 132, 63,  255)   # sand / light wood
DS  = (212, 168, 90,  255)   # desert gold
PS  = (232, 208, 138, 255)   # pale sand

# Greens
DF  = (26,  58,  26,  255)   # deep forest
FG  = (45,  110, 45,  255)   # forest green
LG  = (76,  155, 76,  255)   # leaf green
BG  = (120, 200, 120, 255)   # bright grass

# Cyan / blue
OC  = (10,  26,  58,  255)   # deep ocean
DP  = (26,  74,  138, 255)   # ocean blue
SB  = (42,  122, 192, 255)   # sky blue
PB  = (80,  168, 232, 255)   # player blue
HB  = (144, 208, 248, 255)   # ice / highlight
IW  = (200, 240, 255, 255)   # shimmer

# Red / enemy / fire
DB  = (90,  10,  10,  255)   # deep blood
ER  = (160, 16,  16,  255)   # enemy red
BR  = (212, 32,  32,  255)   # bright red
FR  = (240, 96,  32,  255)   # fire orange
EM  = (248, 160, 96,  255)   # ember

# Yellow / gold
DG  = (168, 112, 0,   255)   # dark gold
GD  = (232, 184, 0,   255)   # gold
YL  = (255, 224, 64,  255)   # bright yellow
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
    print(f'  wrote {os.path.relpath(path)}  ({width}x{height})')


# ─── Pixel helpers ───────────────────────────────────────────────────────────

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


# ─── Utility to write both to art dir and public ─────────────────────────────

def dual_write(art_path, public_name, pixels):
    """Write asset to both the art directory and public/assets."""
    write_png(art_path, pixels)
    write_png(os.path.join(OUT_DIR, public_name), pixels)


# ═════════════════════════════════════════════════════════════════════════════
# 1. ARENA TILESETS
# ═════════════════════════════════════════════════════════════════════════════

def make_gladiator_tileset():
    """
    Gladiator Pit tileset — 16 tiles × 16×16 = 256×16
    Tiles: stone floor, sand floor, wall base, wall top, torch mount, pillar base,
           pillar top, spectator stand, railing, gate, chain, corner NW, corner NE,
           corner SW, corner SE, center emblem
    """
    tiles = []

    # Tile 0: Stone floor — main arena floor
    t = blank(16, 16, ST)
    for pos in [(2,3),(6,1),(10,5),(14,2),(3,9),(8,7),(12,11),(5,13),(1,14),(9,12)]:
        dot(t, pos[0], pos[1], MG)
    for pos in [(4,6),(11,3),(7,10),(13,14),(0,8)]:
        dot(t, pos[0], pos[1], DK)
    hline(t, 0, 0, 16, DK)
    vline(t, 0, 0, 16, DK)
    tiles.append(t)

    # Tile 1: Sand floor — arena center
    t = blank(16, 16, SN)
    for pos in [(1,2),(5,4),(9,1),(13,3),(3,8),(7,6),(11,9),(2,12),(8,14),(14,11)]:
        dot(t, pos[0], pos[1], DS)
    for pos in [(4,1),(10,7),(6,13),(12,5),(0,10)]:
        dot(t, pos[0], pos[1], DT)
    tiles.append(t)

    # Tile 2: Wall base — stone wall lower half
    t = blank(16, 16, DK)
    rect(t, 0, 0, 16, 16, DK)
    rect(t, 1, 1, 14, 7, ST)
    rect(t, 1, 9, 14, 6, ST)
    hline(t, 0, 8, 16, K)
    for pos in [(3,3),(8,4),(12,2),(5,11),(10,12)]:
        dot(t, pos[0], pos[1], MG)
    outline(t, 0, 0, 16, 16, K)
    tiles.append(t)

    # Tile 3: Wall top — stone wall upper with crenellation
    t = blank(16, 16, ST)
    rect(t, 0, 4, 16, 12, ST)
    rect(t, 0, 0, 4, 4, ST)
    rect(t, 6, 0, 4, 4, ST)
    rect(t, 12, 0, 4, 4, ST)
    outline(t, 0, 0, 4, 16, K)
    outline(t, 6, 0, 4, 16, K)
    outline(t, 12, 0, 4, 16, K)
    hline(t, 4, 4, 2, K)
    hline(t, 10, 4, 2, K)
    rect(t, 4, 5, 2, 11, DK)
    rect(t, 10, 5, 2, 11, DK)
    for pos in [(2,6),(7,8),(13,7),(1,12),(8,13)]:
        dot(t, pos[0], pos[1], MG)
    tiles.append(t)

    # Tile 4: Torch mount — wall bracket with flame
    t = blank(16, 16, DK)
    rect(t, 0, 0, 16, 16, DK)
    rect(t, 6, 8, 4, 6, BN)  # bracket
    rect(t, 7, 3, 2, 5, DT)  # stick
    rect(t, 6, 1, 4, 3, FR)  # flame base
    rect(t, 7, 0, 2, 2, YL)  # flame tip
    dot(t, 7, 0, PY)         # bright tip
    outline(t, 0, 0, 16, 16, K)
    tiles.append(t)

    # Tile 5: Pillar base — stone column bottom
    t = blank(16, 16)
    rect(t, 4, 0, 8, 16, ST)
    rect(t, 3, 0, 1, 16, MG)
    rect(t, 12, 0, 1, 16, DK)
    rect(t, 2, 12, 12, 4, LS)
    outline(t, 2, 12, 12, 4, K)
    vline(t, 4, 0, 12, K)
    vline(t, 11, 0, 12, K)
    for pos in [(6,3),(8,7),(7,10)]:
        dot(t, pos[0], pos[1], LS)
    tiles.append(t)

    # Tile 6: Pillar top — stone column top with capital
    t = blank(16, 16)
    rect(t, 4, 4, 8, 12, ST)
    rect(t, 3, 4, 1, 12, MG)
    rect(t, 12, 4, 1, 12, DK)
    rect(t, 2, 0, 12, 4, LS)
    outline(t, 2, 0, 12, 4, K)
    vline(t, 4, 4, 12, K)
    vline(t, 11, 4, 12, K)
    for pos in [(6,7),(8,10),(7,13)]:
        dot(t, pos[0], pos[1], LS)
    tiles.append(t)

    # Tile 7: Spectator stand — wooden bleacher
    t = blank(16, 16, BN)
    rect(t, 0, 0, 16, 4, DT)
    rect(t, 0, 4, 16, 4, BN)
    rect(t, 0, 8, 16, 4, DT)
    rect(t, 0, 12, 16, 4, BN)
    hline(t, 0, 0, 16, K)
    hline(t, 0, 4, 16, BD)
    hline(t, 0, 8, 16, K)
    hline(t, 0, 12, 16, BD)
    for pos in [(3,2),(10,6),(5,10),(12,14)]:
        dot(t, pos[0], pos[1], SN)
    tiles.append(t)

    # Tile 8: Iron railing
    t = blank(16, 16)
    vline(t, 0, 0, 16, ST)
    vline(t, 4, 0, 16, ST)
    vline(t, 8, 0, 16, ST)
    vline(t, 12, 0, 16, ST)
    vline(t, 15, 0, 16, ST)
    hline(t, 0, 2, 16, MG)
    hline(t, 0, 13, 16, MG)
    for x in [0, 4, 8, 12, 15]:
        dot(t, x, 0, LS)
        dot(t, x, 15, LS)
    tiles.append(t)

    # Tile 9: Arena gate — iron portcullis
    t = blank(16, 16, DK)
    rect(t, 0, 0, 16, 3, ST)
    hline(t, 0, 3, 16, K)
    for x in [1, 4, 7, 10, 13]:
        vline(t, x, 4, 12, MG)
        vline(t, x+1, 4, 12, ST)
    hline(t, 0, 7, 16, LS)
    hline(t, 0, 11, 16, LS)
    outline(t, 0, 0, 16, 16, K)
    tiles.append(t)

    # Tile 10: Chain decoration
    t = blank(16, 16)
    for y in range(0, 16, 3):
        rect(t, 6, y, 4, 2, MG)
        outline(t, 6, y, 4, 2, K)
    tiles.append(t)

    # Tile 11: Corner NW
    t = blank(16, 16, ST)
    rect(t, 0, 0, 8, 8, DK)
    outline(t, 0, 0, 16, 16, K)
    hline(t, 8, 8, 8, K)
    vline(t, 8, 8, 8, K)
    for pos in [(2,2),(5,5),(10,10),(13,13)]:
        dot(t, pos[0], pos[1], MG)
    tiles.append(t)

    # Tile 12: Corner NE
    t = blank(16, 16, ST)
    rect(t, 8, 0, 8, 8, DK)
    outline(t, 0, 0, 16, 16, K)
    hline(t, 0, 8, 8, K)
    vline(t, 7, 8, 8, K)
    for pos in [(12,3),(3,10),(10,13)]:
        dot(t, pos[0], pos[1], MG)
    tiles.append(t)

    # Tile 13: Corner SW
    t = blank(16, 16, ST)
    rect(t, 0, 8, 8, 8, DK)
    outline(t, 0, 0, 16, 16, K)
    hline(t, 8, 7, 8, K)
    vline(t, 8, 0, 8, K)
    for pos in [(10,3),(3,3),(12,12)]:
        dot(t, pos[0], pos[1], MG)
    tiles.append(t)

    # Tile 14: Corner SE
    t = blank(16, 16, ST)
    rect(t, 8, 8, 8, 8, DK)
    outline(t, 0, 0, 16, 16, K)
    hline(t, 0, 7, 8, K)
    vline(t, 7, 0, 8, K)
    for pos in [(3,3),(12,12),(3,12)]:
        dot(t, pos[0], pos[1], MG)
    tiles.append(t)

    # Tile 15: Center emblem — gold arena crest
    t = blank(16, 16, SN)
    rect(t, 4, 4, 8, 8, DG)
    rect(t, 5, 5, 6, 6, GD)
    rect(t, 6, 6, 4, 4, YL)
    dot(t, 7, 7, PY)
    dot(t, 8, 8, PY)
    outline(t, 4, 4, 8, 8, K)
    # sword cross in center
    vline(t, 7, 3, 10, DG)
    hline(t, 3, 7, 10, DG)
    tiles.append(t)

    return hstack(tiles)


def make_shadow_tileset():
    """
    Shadow Sanctum tileset — 16 tiles × 16×16 = 256×16
    Tiles: dark floor, rune floor, void floor, wall dark, wall rune,
           floating platform, crystal pillar base, crystal pillar top,
           purple torch, energy conduit, rune circle NW/NE/SW/SE,
           portal edge, shadow gate, center rune
    """
    tiles = []

    # Tile 0: Dark floor — deep charcoal stone
    t = blank(16, 16, DK)
    for pos in [(2,3),(7,1),(11,5),(14,2),(4,9),(9,7),(13,11),(1,14)]:
        dot(t, pos[0], pos[1], K)
    for pos in [(5,5),(10,10),(3,12),(8,3)]:
        dot(t, pos[0], pos[1], ST)
    tiles.append(t)

    # Tile 1: Rune floor — purple glowing runes on dark stone
    t = blank(16, 16, DK)
    # Rune pattern — arcane lines
    hline(t, 2, 4, 12, MP)
    hline(t, 2, 11, 12, MP)
    vline(t, 4, 2, 12, MP)
    vline(t, 11, 2, 12, MP)
    dot(t, 4, 4, MV)
    dot(t, 11, 4, MV)
    dot(t, 4, 11, MV)
    dot(t, 11, 11, MV)
    dot(t, 7, 7, SG)
    dot(t, 8, 8, SG)
    tiles.append(t)

    # Tile 2: Void floor — nearly black with faint shimmer
    t = blank(16, 16, K)
    rect(t, 0, 0, 16, 16, K)
    for pos in [(3,5),(9,2),(12,8),(6,11),(1,14),(14,13)]:
        dot(t, pos[0], pos[1], PM)
    for pos in [(7,7),(8,3)]:
        dot(t, pos[0], pos[1], MP)
    tiles.append(t)

    # Tile 3: Dark wall — shadow-infused stone
    t = blank(16, 16, DK)
    rect(t, 1, 1, 14, 7, ST)
    rect(t, 1, 9, 14, 6, ST)
    hline(t, 0, 8, 16, PM)
    outline(t, 0, 0, 16, 16, K)
    for pos in [(3,3),(8,5),(12,2),(5,11),(10,13)]:
        dot(t, pos[0], pos[1], DK)
    # Purple veins in wall
    dot(t, 6, 4, MP)
    dot(t, 10, 10, MP)
    tiles.append(t)

    # Tile 4: Wall with rune — glowing sigil
    t = blank(16, 16, DK)
    rect(t, 1, 1, 14, 14, ST)
    outline(t, 0, 0, 16, 16, K)
    # Central rune glyph
    rect(t, 5, 5, 6, 6, PM)
    vline(t, 7, 3, 10, MV)
    hline(t, 3, 7, 10, MV)
    dot(t, 7, 7, SG)
    dot(t, 5, 5, MP)
    dot(t, 10, 5, MP)
    dot(t, 5, 10, MP)
    dot(t, 10, 10, MP)
    tiles.append(t)

    # Tile 5: Floating platform — levitating stone slab
    t = blank(16, 16)
    rect(t, 2, 4, 12, 6, ST)
    hline(t, 2, 4, 12, LS)
    hline(t, 2, 9, 12, DK)
    vline(t, 2, 4, 6, MG)
    vline(t, 13, 4, 6, K)
    # Shadow below
    rect(t, 3, 11, 10, 2, K)
    rect(t, 4, 13, 8, 1, PM)
    # Glow underneath
    dot(t, 7, 10, MP)
    dot(t, 8, 10, MP)
    tiles.append(t)

    # Tile 6: Crystal pillar base — amethyst column bottom
    t = blank(16, 16)
    rect(t, 5, 0, 6, 16, MP)
    rect(t, 6, 0, 4, 16, MV)
    rect(t, 3, 12, 10, 4, PM)
    outline(t, 3, 12, 10, 4, K)
    vline(t, 5, 0, 12, K)
    vline(t, 10, 0, 12, K)
    dot(t, 7, 4, SG)
    dot(t, 8, 8, SG)
    tiles.append(t)

    # Tile 7: Crystal pillar top — amethyst column top
    t = blank(16, 16)
    rect(t, 5, 4, 6, 12, MP)
    rect(t, 6, 4, 4, 12, MV)
    rect(t, 3, 0, 10, 4, PM)
    outline(t, 3, 0, 10, 4, K)
    vline(t, 5, 4, 12, K)
    vline(t, 10, 4, 12, K)
    dot(t, 7, 7, SG)
    dot(t, 8, 12, SG)
    tiles.append(t)

    # Tile 8: Purple torch — magical flame on bracket
    t = blank(16, 16, DK)
    rect(t, 6, 8, 4, 6, ST)  # bracket
    rect(t, 7, 3, 2, 5, MG)  # stick
    rect(t, 6, 1, 4, 3, MV)  # flame base
    rect(t, 7, 0, 2, 2, SG)  # flame tip
    dot(t, 7, 0, NW)
    outline(t, 0, 0, 16, 16, K)
    tiles.append(t)

    # Tile 9: Energy conduit — arcane power line
    t = blank(16, 16, DK)
    hline(t, 0, 7, 16, MV)
    hline(t, 0, 8, 16, MV)
    hline(t, 0, 6, 16, MP)
    hline(t, 0, 9, 16, MP)
    for x in [0, 4, 8, 12]:
        dot(t, x, 7, SG)
        dot(t, x+1, 8, SG)
    outline(t, 0, 0, 16, 16, K)
    tiles.append(t)

    # Tile 10: Rune circle NW quadrant
    t = blank(16, 16, DK)
    rect(t, 8, 8, 8, 8, DK)
    # Arc from corner
    for pos in [(8,2),(10,3),(12,5),(13,7),(14,9),(14,11),(13,13)]:
        dot(t, pos[0], pos[1], MV)
    for pos in [(9,4),(11,6),(12,8),(13,10)]:
        dot(t, pos[0], pos[1], MP)
    dot(t, 15, 15, SG)
    tiles.append(t)

    # Tile 11: Rune circle NE quadrant
    t = blank(16, 16, DK)
    for pos in [(7,2),(5,3),(3,5),(2,7),(1,9),(1,11),(2,13)]:
        dot(t, pos[0], pos[1], MV)
    for pos in [(6,4),(4,6),(3,8),(2,10)]:
        dot(t, pos[0], pos[1], MP)
    dot(t, 0, 15, SG)
    tiles.append(t)

    # Tile 12: Rune circle SW quadrant
    t = blank(16, 16, DK)
    for pos in [(8,13),(10,12),(12,10),(13,8),(14,6),(14,4),(13,2)]:
        dot(t, pos[0], pos[1], MV)
    for pos in [(9,11),(11,9),(12,7),(13,5)]:
        dot(t, pos[0], pos[1], MP)
    dot(t, 15, 0, SG)
    tiles.append(t)

    # Tile 13: Rune circle SE quadrant
    t = blank(16, 16, DK)
    for pos in [(7,13),(5,12),(3,10),(2,8),(1,6),(1,4),(2,2)]:
        dot(t, pos[0], pos[1], MV)
    for pos in [(6,11),(4,9),(3,7),(2,5)]:
        dot(t, pos[0], pos[1], MP)
    dot(t, 0, 0, SG)
    tiles.append(t)

    # Tile 14: Shadow gate — dark portal frame
    t = blank(16, 16)
    rect(t, 0, 0, 16, 16, PM)
    rect(t, 3, 3, 10, 10, K)
    rect(t, 4, 4, 8, 8, PM)
    outline(t, 0, 0, 16, 16, K)
    outline(t, 3, 3, 10, 10, MV)
    dot(t, 7, 7, SG)
    dot(t, 8, 8, SG)
    tiles.append(t)

    # Tile 15: Center rune — arcane focus point
    t = blank(16, 16, DK)
    # Diamond pattern
    for i in range(4):
        dot(t, 7-i, 4+i, MV)
        dot(t, 8+i, 4+i, MV)
        dot(t, 7-i, 11-i, MV)
        dot(t, 8+i, 11-i, MV)
    rect(t, 6, 6, 4, 4, MP)
    dot(t, 7, 7, SG)
    dot(t, 8, 8, SG)
    dot(t, 7, 8, SG)
    dot(t, 8, 7, SG)
    tiles.append(t)

    return hstack(tiles)


# ═════════════════════════════════════════════════════════════════════════════
# 2. ARENA UI PANELS
# ═════════════════════════════════════════════════════════════════════════════

def make_arena_queue_panel():
    """ArenaQueuePanel — 200×160 with mode selector, rank display, queue info."""
    p = blank(200, 160, PM)
    # Background fill
    rect(p, 0, 0, 200, 160, PM)
    rect(p, 2, 2, 196, 156, DK)
    outline(p, 0, 0, 200, 160, K)

    # Title bar
    rect(p, 4, 4, 192, 16, MP)
    outline(p, 4, 4, 192, 16, K)

    # "ARENA QUEUE" text area (represented as bright bar)
    rect(p, 60, 7, 80, 10, MV)

    # Mode selector tabs — 1v1, 2v2
    rect(p, 20, 28, 70, 20, DK)
    outline(p, 20, 28, 70, 20, MV)
    rect(p, 30, 33, 50, 10, MP)  # "1v1" indicator

    rect(p, 110, 28, 70, 20, DK)
    outline(p, 110, 28, 70, 20, ST)
    rect(p, 120, 33, 50, 10, ST)  # "2v2" indicator

    # Rank display area
    rect(p, 20, 56, 160, 30, K)
    outline(p, 20, 56, 160, 30, MV)
    # Rank icon placeholder
    rect(p, 28, 62, 18, 18, GD)
    outline(p, 28, 62, 18, 18, DG)
    # Rating text bar
    rect(p, 54, 64, 80, 8, MV)
    # W/L record bar
    rect(p, 54, 74, 60, 6, ST)

    # Estimated wait time
    rect(p, 20, 94, 160, 16, DK)
    outline(p, 20, 94, 160, 16, ST)
    rect(p, 28, 97, 100, 10, ST)  # "Est. Wait: ~30s"

    # Ready button
    rect(p, 50, 120, 100, 28, FG)
    outline(p, 50, 120, 100, 28, K)
    rect(p, 60, 127, 80, 14, LG)  # "READY" text

    return p


def make_arena_hud():
    """ArenaHUD — 320×24 with opponent bars, timer, score."""
    h = blank(320, 24)

    # Background bar
    rect(h, 0, 0, 320, 24, K)
    rect(h, 1, 1, 318, 22, DK)

    # Player 1 (left) — HP bar
    rect(h, 4, 3, 80, 8, K)
    rect(h, 5, 4, 70, 6, ER)     # HP fill (red = enemy perspective)
    rect(h, 5, 4, 70, 2, BR)     # HP highlight
    outline(h, 4, 3, 80, 8, ST)

    # Player 1 — Mana bar
    rect(h, 4, 13, 80, 6, K)
    rect(h, 5, 14, 60, 4, DP)    # mana fill
    rect(h, 5, 14, 60, 1, SB)    # mana highlight
    outline(h, 4, 13, 80, 6, ST)

    # Center — match timer
    rect(h, 130, 2, 60, 20, PM)
    outline(h, 130, 2, 60, 20, MV)
    rect(h, 140, 6, 40, 12, K)   # timer digits area
    rect(h, 144, 8, 32, 8, MV)   # "3:00" text

    # Round counter dots
    for i in range(3):
        x = 147 + i * 10
        rect(h, x, 2, 6, 3, GD if i < 1 else ST)

    # Player 2 (right) — HP bar
    rect(h, 236, 3, 80, 8, K)
    rect(h, 237, 4, 70, 6, PB)   # HP fill (blue = player)
    rect(h, 237, 4, 70, 2, HB)   # HP highlight
    outline(h, 236, 3, 80, 8, ST)

    # Player 2 — Mana bar
    rect(h, 236, 13, 80, 6, K)
    rect(h, 237, 14, 60, 4, DP)
    rect(h, 237, 14, 60, 1, SB)
    outline(h, 236, 13, 80, 6, ST)

    # Score — kill/death between bars
    rect(h, 90, 6, 36, 12, K)
    outline(h, 90, 6, 36, 12, GD)
    rect(h, 94, 9, 12, 6, ER)    # left score
    rect(h, 110, 9, 12, 6, PB)   # right score

    return h


def make_arena_results_panel():
    """ArenaResultsPanel — 200×160 with result splash, rating change, rewards."""
    p = blank(200, 160, PM)
    rect(p, 2, 2, 196, 156, DK)
    outline(p, 0, 0, 200, 160, K)

    # Result title area
    rect(p, 4, 4, 192, 24, GD)
    outline(p, 4, 4, 192, 24, DG)
    rect(p, 40, 9, 120, 14, YL)  # "VICTORY" or "DEFEAT"

    # Rating change
    rect(p, 20, 36, 160, 24, K)
    outline(p, 20, 36, 160, 24, MV)
    # Rating number
    rect(p, 30, 41, 60, 14, MP)  # current rating
    # Change indicator
    rect(p, 100, 41, 40, 14, FG) # "+25" green for win
    # Arrow up
    rect(p, 145, 44, 8, 8, LG)

    # Rewards section
    rect(p, 20, 68, 160, 50, K)
    outline(p, 20, 68, 160, 50, ST)
    # Reward items (icon slots)
    for i in range(4):
        x = 30 + i * 36
        rect(p, x, 76, 24, 24, DK)
        outline(p, x, 76, 24, 24, GD)
        rect(p, x+4, 80, 16, 16, MP)  # item icon placeholder
    # XP bar
    rect(p, 30, 104, 140, 8, K)
    rect(p, 31, 105, 100, 6, PB)
    outline(p, 30, 104, 140, 8, ST)

    # Rematch button
    rect(p, 30, 126, 64, 24, MP)
    outline(p, 30, 126, 64, 24, K)
    rect(p, 38, 132, 48, 12, MV)  # "REMATCH"

    # Exit button
    rect(p, 106, 126, 64, 24, DK)
    outline(p, 106, 126, 64, 24, K)
    rect(p, 114, 132, 48, 12, ST) # "EXIT"

    return p


# ═════════════════════════════════════════════════════════════════════════════
# 3. RANK TIER ICONS — 16×16 each
# ═════════════════════════════════════════════════════════════════════════════

def make_rank_bronze():
    """Bronze rank — brown shield with B."""
    t = blank(16, 16)
    # Shield shape
    rect(t, 3, 2, 10, 10, BN)
    rect(t, 4, 12, 8, 2, DT)
    rect(t, 5, 14, 6, 1, BD)
    rect(t, 6, 15, 4, 1, BD)
    outline(t, 3, 2, 10, 10, K)
    # Shield face
    rect(t, 5, 4, 6, 6, DT)
    # B letter indicator — central dot cluster
    rect(t, 6, 5, 4, 4, BN)
    rect(t, 7, 6, 2, 2, SN)
    # Rim highlight
    hline(t, 4, 3, 8, SN)
    return t


def make_rank_silver():
    """Silver rank — gray shield with S."""
    t = blank(16, 16)
    rect(t, 3, 2, 10, 10, MG)
    rect(t, 4, 12, 8, 2, LS)
    rect(t, 5, 14, 6, 1, ST)
    rect(t, 6, 15, 4, 1, ST)
    outline(t, 3, 2, 10, 10, K)
    rect(t, 5, 4, 6, 6, LS)
    rect(t, 6, 5, 4, 4, MG)
    rect(t, 7, 6, 2, 2, PG)
    hline(t, 4, 3, 8, NW)
    return t


def make_rank_gold():
    """Gold rank — golden shield with star."""
    t = blank(16, 16)
    rect(t, 3, 2, 10, 10, DG)
    rect(t, 4, 12, 8, 2, GD)
    rect(t, 5, 14, 6, 1, DG)
    rect(t, 6, 15, 4, 1, DG)
    outline(t, 3, 2, 10, 10, K)
    rect(t, 5, 4, 6, 6, GD)
    # Star center
    rect(t, 7, 5, 2, 4, YL)
    hline(t, 6, 6, 4, YL)
    hline(t, 6, 7, 4, YL)
    dot(t, 7, 6, PY)
    dot(t, 8, 7, PY)
    hline(t, 4, 3, 8, YL)
    return t


def make_rank_platinum():
    """Platinum rank — blue-white diamond with glow."""
    t = blank(16, 16)
    # Diamond shape
    for i in range(5):
        hline(t, 7-i, 3+i, 2+i*2, HB)
    for i in range(5):
        hline(t, 7-4+i, 8+i, 10-i*2, HB)
    # Inner shine
    rect(t, 6, 5, 4, 4, IW)
    rect(t, 7, 6, 2, 2, NW)
    # Outline
    for i in range(5):
        dot(t, 7-i, 3+i, K)
        dot(t, 8+i, 3+i, K)
    for i in range(5):
        dot(t, 3+i, 8+i, K)
        dot(t, 12-i, 8+i, K)
    dot(t, 7, 2, PB)
    dot(t, 8, 2, PB)
    dot(t, 7, 13, PB)
    dot(t, 8, 13, PB)
    return t


def make_rank_diamond():
    """Diamond rank — brilliant multi-faceted gem."""
    t = blank(16, 16)
    # Outer diamond
    for i in range(6):
        hline(t, 7-i, 2+i, 2+i*2, SB)
    for i in range(6):
        hline(t, 7-5+i, 8+i, 12-i*2, SB)
    # Middle facets
    for i in range(4):
        hline(t, 7-i, 4+i, 2+i*2, PB)
    for i in range(4):
        hline(t, 7-3+i, 8+i, 8-i*2, PB)
    # Inner shine
    rect(t, 6, 5, 4, 4, HB)
    rect(t, 7, 6, 2, 2, IW)
    dot(t, 7, 6, NW)
    # Sparkle corners
    dot(t, 4, 4, NW)
    dot(t, 11, 4, NW)
    dot(t, 7, 1, NW)
    dot(t, 8, 14, PB)
    # Edge outline
    for i in range(6):
        dot(t, 7-i, 2+i, K)
        dot(t, 8+i, 2+i, K)
    for i in range(6):
        dot(t, 2+i, 8+i, K)
        dot(t, 13-i, 8+i, K)
    return t


# ═════════════════════════════════════════════════════════════════════════════
# 4. ARENA LEADERBOARD PANEL
# ═════════════════════════════════════════════════════════════════════════════

def make_arena_leaderboard_panel():
    """ArenaLeaderboardPanel — 200×180 with ranked list, player info."""
    p = blank(200, 180, PM)
    rect(p, 2, 2, 196, 176, DK)
    outline(p, 0, 0, 200, 180, K)

    # Title bar
    rect(p, 4, 4, 192, 16, MP)
    outline(p, 4, 4, 192, 16, K)
    rect(p, 40, 7, 120, 10, MV)  # "ARENA RANKINGS"

    # Column headers
    rect(p, 4, 24, 192, 12, K)
    rect(p, 8, 26, 20, 8, ST)    # "Rank"
    rect(p, 34, 26, 60, 8, ST)   # "Player"
    rect(p, 100, 26, 30, 8, ST)  # "Rating"
    rect(p, 136, 26, 50, 8, ST)  # "W/L"

    # Leaderboard rows (8 visible rows)
    for i in range(8):
        y = 40 + i * 16
        bg = K if i % 2 == 0 else PM
        rect(p, 4, y, 192, 14, bg)
        outline(p, 4, y, 192, 14, DK)

        # Rank number area
        rect(p, 8, y+2, 16, 10, DK)
        # Rank icon placeholder (small)
        if i < 3:
            colors = [GD, LS, BN]
            rect(p, 10, y+3, 12, 8, colors[i])
        else:
            rect(p, 10, y+3, 12, 8, ST)

        # Player name bar
        rect(p, 34, y+3, 56, 8, MG)

        # Rating
        rect(p, 100, y+3, 28, 8, MV)

        # Win/Loss
        rect(p, 136, y+3, 22, 8, FG)  # wins
        rect(p, 162, y+3, 22, 8, ER)  # losses

    # Footer — page navigation
    rect(p, 60, 170, 30, 8, ST)    # prev
    rect(p, 100, 170, 30, 8, ST)   # next

    return p


# ═════════════════════════════════════════════════════════════════════════════
# 5. SPECTATOR OVERLAY
# ═════════════════════════════════════════════════════════════════════════════

def make_spectator_overlay():
    """Spectator HUD — 320×24 minimal overlay with both players' info."""
    h = blank(320, 24)

    # Semi-transparent dark background
    rect(h, 0, 0, 320, 24, (13, 13, 13, 180))

    # "SPECTATING" label in center top
    rect(h, 125, 1, 70, 8, (90, 32, 160, 200))

    # Player 1 (left)
    # Name plate
    rect(h, 4, 2, 60, 8, (43, 43, 43, 200))
    # HP bar
    rect(h, 4, 12, 100, 6, K)
    rect(h, 5, 13, 90, 4, ER)
    rect(h, 5, 13, 90, 1, BR)
    outline(h, 4, 12, 100, 6, ST)
    # Mana bar
    rect(h, 4, 19, 100, 4, K)
    rect(h, 5, 20, 70, 2, DP)
    outline(h, 4, 19, 100, 4, ST)

    # Match info center
    rect(h, 135, 11, 50, 12, (26, 10, 58, 200))
    outline(h, 135, 11, 50, 12, MV)
    rect(h, 145, 14, 30, 6, MV)  # timer

    # Player 2 (right)
    rect(h, 256, 2, 60, 8, (43, 43, 43, 200))
    # HP bar
    rect(h, 216, 12, 100, 6, K)
    rect(h, 217, 13, 90, 4, PB)
    rect(h, 217, 13, 90, 1, HB)
    outline(h, 216, 12, 100, 6, ST)
    # Mana bar
    rect(h, 216, 19, 100, 4, K)
    rect(h, 217, 20, 70, 2, DP)
    outline(h, 216, 19, 100, 4, ST)

    return h


# ═════════════════════════════════════════════════════════════════════════════
# 6. VICTORY / DEFEAT SPLASH SCREENS — 320×180
# ═════════════════════════════════════════════════════════════════════════════

def make_victory_splash():
    """Victory screen — 320×180 with golden border, radiant effect."""
    p = blank(320, 180, K)

    # Dark background with warm gradient feel
    rect(p, 0, 0, 320, 180, K)
    rect(p, 0, 0, 320, 40, BD)
    rect(p, 0, 40, 320, 40, DG)
    rect(p, 0, 80, 320, 20, GD)
    rect(p, 0, 100, 320, 40, DG)
    rect(p, 0, 140, 320, 40, BD)

    # Golden border
    outline(p, 0, 0, 320, 180, GD)
    outline(p, 1, 1, 318, 178, YL)
    outline(p, 2, 2, 316, 176, GD)
    outline(p, 3, 3, 314, 174, DG)

    # Radiant lines from center
    cx, cy = 160, 70
    for angle_off in range(-6, 7):
        for dist in range(20, 80, 2):
            x = cx + angle_off * dist // 8
            y = cy - dist // 3
            if 4 <= x < 316 and 4 <= y < 176:
                dot(p, x, y, YL)

    # "VICTORY" text block
    rect(p, 80, 60, 160, 30, GD)
    outline(p, 80, 60, 160, 30, K)
    rect(p, 84, 64, 152, 22, YL)
    rect(p, 88, 68, 144, 14, PY)

    # Confetti particles — gold and bright colored dots scattered
    confetti = [
        (30, 20, YL), (50, 35, FR), (80, 15, PB), (120, 30, GD), (200, 25, YL),
        (250, 20, FR), (280, 35, PB), (40, 50, GD), (270, 45, YL), (150, 25, FR),
        (20, 45, PY), (300, 30, PY), (90, 40, GD), (210, 15, YL), (170, 40, PB),
        (60, 130, YL), (100, 140, FR), (140, 135, PB), (180, 145, GD), (220, 130, YL),
        (260, 140, FR), (300, 135, PB), (35, 150, GD), (75, 155, YL), (190, 150, PY),
        (240, 155, FR), (130, 160, PB), (290, 160, GD), (110, 155, YL), (170, 155, FR),
    ]
    for cx_c, cy_c, color in confetti:
        if 4 <= cx_c < 316 and 4 <= cy_c < 176:
            dot(p, cx_c, cy_c, color)
            dot(p, cx_c+1, cy_c, color)

    # Rating change area
    rect(p, 100, 100, 120, 20, K)
    outline(p, 100, 100, 120, 20, GD)
    rect(p, 110, 104, 50, 12, GD)   # rating
    rect(p, 165, 104, 40, 12, FG)   # "+25"

    # Reward summary
    rect(p, 80, 130, 160, 30, K)
    outline(p, 80, 130, 160, 30, DG)
    for i in range(4):
        x = 90 + i * 36
        rect(p, x, 135, 20, 20, DK)
        outline(p, x, 135, 20, 20, GD)

    return p


def make_defeat_splash():
    """Defeat screen — 320×180 with dark tones, skull motif."""
    p = blank(320, 180, K)

    # Very dark background with red tint
    rect(p, 0, 0, 320, 180, K)
    rect(p, 0, 0, 320, 40, (20, 5, 5, 255))
    rect(p, 0, 40, 320, 40, DB)
    rect(p, 0, 80, 320, 20, ER)
    rect(p, 0, 100, 320, 40, DB)
    rect(p, 0, 140, 320, 40, (20, 5, 5, 255))

    # Dark border
    outline(p, 0, 0, 320, 180, DK)
    outline(p, 1, 1, 318, 178, ST)
    outline(p, 2, 2, 316, 176, DK)
    outline(p, 3, 3, 314, 174, K)

    # Skull motif (16×16 centered at top)
    sx, sy = 152, 20
    # Skull shape
    rect(p, sx+2, sy, 12, 10, PG)
    rect(p, sx+1, sy+2, 14, 6, PG)
    rect(p, sx+4, sy+10, 8, 4, PG)
    rect(p, sx+5, sy+14, 6, 2, LS)
    # Eye sockets
    rect(p, sx+3, sy+3, 3, 3, K)
    rect(p, sx+10, sy+3, 3, 3, K)
    # Nose
    dot(p, sx+7, sy+7, K)
    dot(p, sx+8, sy+7, K)
    # Teeth
    for i in range(4):
        dot(p, sx+5+i*2, sy+11, K)
    outline(p, sx+2, sy, 12, 10, K)

    # "DEFEAT" text block
    rect(p, 80, 60, 160, 30, DB)
    outline(p, 80, 60, 160, 30, K)
    rect(p, 84, 64, 152, 22, ER)
    rect(p, 88, 68, 144, 14, BR)

    # Cracks / dark particles
    for cx_c, cy_c in [(30,40),(70,30),(290,45),(250,35),(40,140),(280,150),
                         (100,130),(200,140),(150,150),(50,100),(270,100)]:
        if 4 <= cx_c < 316 and 4 <= cy_c < 176:
            dot(p, cx_c, cy_c, DK)
            dot(p, cx_c+1, cy_c+1, ST)

    # Rating change area
    rect(p, 100, 100, 120, 20, K)
    outline(p, 100, 100, 120, 20, DK)
    rect(p, 110, 104, 50, 12, DK)   # rating
    rect(p, 165, 104, 40, 12, ER)   # "-15"

    # Options
    rect(p, 60, 140, 80, 24, DK)
    outline(p, 60, 140, 80, 24, ST)
    rect(p, 68, 146, 64, 12, ST)    # "REMATCH"

    rect(p, 180, 140, 80, 24, DK)
    outline(p, 180, 140, 80, 24, ST)
    rect(p, 188, 146, 64, 12, ST)   # "LEAVE"

    return p


# ═════════════════════════════════════════════════════════════════════════════
# MAIN — Generate all assets
# ═════════════════════════════════════════════════════════════════════════════

def main():
    print('PIX-104: Generating PvP arena assets...\n')

    # 1. Arena tilesets
    print('[Tilesets]')
    gladiator = make_gladiator_tileset()
    dual_write(
        os.path.join(ART_TILES, 'tileset_arena_gladiator.png'),
        'tileset_arena_gladiator.png',
        gladiator
    )

    shadow = make_shadow_tileset()
    dual_write(
        os.path.join(ART_TILES, 'tileset_arena_shadow.png'),
        'tileset_arena_shadow.png',
        shadow
    )

    # 2. Arena UI panels
    print('\n[UI Panels]')
    queue = make_arena_queue_panel()
    dual_write(
        os.path.join(ART_ARENA, 'ui_panel_arena_queue.png'),
        'ui_panel_arena_queue.png',
        queue
    )

    hud = make_arena_hud()
    dual_write(
        os.path.join(ART_ARENA, 'ui_arena_hud.png'),
        'ui_arena_hud.png',
        hud
    )

    results = make_arena_results_panel()
    dual_write(
        os.path.join(ART_ARENA, 'ui_panel_arena_results.png'),
        'ui_panel_arena_results.png',
        results
    )

    # 3. Rank tier icons
    print('\n[Rank Icons]')
    ranks = [
        ('icon_rank_arena_bronze',   make_rank_bronze),
        ('icon_rank_arena_silver',   make_rank_silver),
        ('icon_rank_arena_gold',     make_rank_gold),
        ('icon_rank_arena_platinum', make_rank_platinum),
        ('icon_rank_arena_diamond',  make_rank_diamond),
    ]
    for name, fn in ranks:
        pixels = fn()
        dual_write(
            os.path.join(ART_ICONS, f'{name}.png'),
            f'{name}.png',
            pixels
        )

    # 4. Arena leaderboard panel
    print('\n[Leaderboard]')
    lb = make_arena_leaderboard_panel()
    dual_write(
        os.path.join(ART_ARENA, 'ui_panel_arena_leaderboard.png'),
        'ui_panel_arena_leaderboard.png',
        lb
    )

    # 5. Spectator overlay
    print('\n[Spectator]')
    spec = make_spectator_overlay()
    dual_write(
        os.path.join(ART_ARENA, 'ui_arena_spectator.png'),
        'ui_arena_spectator.png',
        spec
    )

    # 6. Victory/defeat splash screens
    print('\n[Splash Screens]')
    victory = make_victory_splash()
    dual_write(
        os.path.join(ART_BG, 'bg_arena_victory.png'),
        'bg_arena_victory.png',
        victory
    )

    defeat = make_defeat_splash()
    dual_write(
        os.path.join(ART_BG, 'bg_arena_defeat.png'),
        'bg_arena_defeat.png',
        defeat
    )

    print('\nDone! All PvP arena assets generated.')


if __name__ == '__main__':
    main()
