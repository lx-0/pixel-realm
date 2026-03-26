#!/usr/bin/env python3
"""
Generate procedural dungeon tileset and room template art for PixelRealm (PIX-309).
Uses only Python stdlib (struct + zlib) — no PIL required.
Follows docs/ART-STYLE-GUIDE.md and the master 32-color palette exactly.

Assets produced:
  Themed dungeon tilesets (256×32 each, 16 tiles × 2 rows):
    tileset_dungeon_stone.png        — Stone dungeon (gray walls, cracked floors)
    tileset_dungeon_crystal.png      — Crystal dungeon (purple/blue glowing caverns)
    tileset_dungeon_infernal.png     — Infernal dungeon (lava, ember, dark rock)

  Difficulty-tier variants (palette-shifted from base themes):
    tileset_dungeon_stone_hard.png
    tileset_dungeon_stone_nightmare.png
    tileset_dungeon_crystal_hard.png
    tileset_dungeon_crystal_nightmare.png
    tileset_dungeon_infernal_hard.png
    tileset_dungeon_infernal_nightmare.png

  Door sprites (32×16 each — 2 frames: closed, open):
    sprite_dun_door_stone.png
    sprite_dun_door_crystal.png
    sprite_dun_door_infernal.png

  Entrance/exit sprites (32×16 — entry + exit):
    sprite_dun_entrance_exit.png

  Room template decorations (16×16 each):
    sprite_dun_room_combat.png       — Combat arena marker (crossed swords motif)
    sprite_dun_room_treasure.png     — Treasure room marker (gem/chest motif)
    sprite_dun_room_boss.png         — Boss chamber marker (skull motif)

  Environmental props:
    sprite_dun_prop_chest.png        — 32×16 (closed + open)
    sprite_dun_prop_trap_spikes.png  — 64×16 (4 frames: hidden, rising, up, retracting)
    sprite_dun_prop_trap_floor.png   — 16×16 (cracked danger tile)

  Minimap icons (8×8 each):
    icon_minimap_combat.png
    icon_minimap_treasure.png
    icon_minimap_boss.png
    icon_minimap_entrance.png
    icon_minimap_exit.png
    icon_minimap_corridor.png

  Dungeon entry portal (128×32 — 4 frames × 32×32 animated):
    sprite_dun_portal.png
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
ART_TILES  = os.path.join(SCRIPT_DIR, '..', 'assets', 'tiles', 'tilesets')
ART_SPRITES = os.path.join(SCRIPT_DIR, '..', 'assets', 'sprites', 'dungeon')
ART_ICONS  = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui', 'icons')
ART_MINIMAP = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui', 'minimap')

for d in [ART_TILES, ART_SPRITES, ART_ICONS, ART_MINIMAP]:
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


def tint_frame(src, color, strength=0.25):
    tr, tg, tb = color[:3]
    result = []
    for row in src:
        new_row = []
        for (r, g, b, a) in row:
            if a == 0:
                new_row.append((r, g, b, a))
            else:
                nr = min(255, int(r * (1 - strength) + tr * strength))
                ng = min(255, int(g * (1 - strength) + tg * strength))
                nb = min(255, int(b * (1 - strength) + tb * strength))
                new_row.append((nr, ng, nb, a))
        result.append(new_row)
    return result


def darken_frame(src, amount=0.2):
    return tint_frame(src, (0, 0, 0, 255), amount)


# ═══════════════════════════════════════════════════════════════════════════════
# STONE THEME TILESET
# ═══════════════════════════════════════════════════════════════════════════════

def tile_stone_wall_top():
    """Top face of stone wall — brick pattern."""
    t = blank(16, 16, DK)
    # Brick rows
    for by in range(0, 16, 4):
        offset = 0 if (by // 4) % 2 == 0 else 4
        for bx in range(offset, 16, 8):
            rect(t, bx, by, 7, 3, ST)
            # Highlight top edge
            hline(t, bx, by, 7, MG)
        # Mortar lines are DK (the fill)
    # Subtle crack
    dot(t, 5, 6, DK)
    dot(t, 5, 7, DK)
    return t


def tile_stone_wall_face():
    """Front face of stone wall — darker, shadowed bricks."""
    t = blank(16, 16, K)
    for by in range(0, 16, 5):
        offset = 0 if (by // 5) % 2 == 0 else 4
        for bx in range(offset, 16, 8):
            rect(t, bx, by, 7, 4, DK)
            hline(t, bx, by, 7, ST)
    return t


def tile_stone_wall_left():
    """Left edge wall — vertical mortar lines."""
    t = blank(16, 16, DK)
    rect(t, 0, 0, 2, 16, K)  # dark left edge
    for by in range(0, 16, 4):
        rect(t, 2, by, 13, 3, ST)
        hline(t, 2, by, 13, MG)
    return t


def tile_stone_wall_right():
    """Right edge wall — vertical mortar lines."""
    t = blank(16, 16, DK)
    rect(t, 14, 0, 2, 16, K)  # dark right edge
    for by in range(0, 16, 4):
        rect(t, 1, by, 13, 3, ST)
        hline(t, 1, by, 13, MG)
    return t


def tile_stone_corner_tl():
    t = blank(16, 16, K)
    rect(t, 2, 2, 14, 14, DK)
    for by in range(2, 16, 4):
        for bx in range(2, 16, 8):
            rect(t, bx, by, 7, 3, ST)
    return t


def tile_stone_corner_tr():
    t = blank(16, 16, K)
    rect(t, 0, 2, 14, 14, DK)
    for by in range(2, 16, 4):
        for bx in range(0, 14, 8):
            rect(t, bx, by, 7, 3, ST)
    return t


def tile_stone_corner_bl():
    t = blank(16, 16, K)
    rect(t, 2, 0, 14, 14, DK)
    for by in range(0, 14, 4):
        for bx in range(2, 16, 8):
            rect(t, bx, by, 7, 3, ST)
    return t


def tile_stone_corner_br():
    t = blank(16, 16, K)
    rect(t, 0, 0, 14, 14, DK)
    for by in range(0, 14, 4):
        for bx in range(0, 14, 8):
            rect(t, bx, by, 7, 3, ST)
    return t


def tile_stone_wall_cross():
    """Four-way wall intersection."""
    t = blank(16, 16, DK)
    rect(t, 0, 6, 16, 4, ST)
    rect(t, 6, 0, 4, 16, ST)
    rect(t, 6, 6, 4, 4, MG)  # center highlight
    return t


def tile_stone_wall_t_h():
    """T-junction horizontal."""
    t = blank(16, 16, DK)
    rect(t, 0, 0, 16, 8, ST)
    hline(t, 0, 0, 16, MG)
    rect(t, 6, 8, 4, 8, ST)
    return t


def tile_stone_wall_t_v():
    """T-junction vertical."""
    t = blank(16, 16, DK)
    rect(t, 0, 0, 8, 16, ST)
    vline(t, 0, 0, 16, MG)
    rect(t, 8, 6, 8, 4, ST)
    return t


def tile_stone_wall_end_h():
    """Horizontal wall end cap."""
    t = blank(16, 16, DK)
    rect(t, 0, 4, 12, 8, ST)
    hline(t, 0, 4, 12, MG)
    vline(t, 11, 4, 8, K)
    return t


def tile_stone_wall_end_v():
    """Vertical wall end cap."""
    t = blank(16, 16, DK)
    rect(t, 4, 0, 8, 12, ST)
    vline(t, 4, 0, 12, MG)
    hline(t, 4, 11, 8, K)
    return t


def tile_stone_wall_single():
    """Single standalone pillar."""
    t = blank(16, 16, _)
    rect(t, 3, 3, 10, 10, DK)
    rect(t, 4, 4, 8, 8, ST)
    rect(t, 5, 5, 6, 6, MG)
    outline(t, 3, 3, 10, 10, K)
    return t


def tile_stone_wall_solid():
    """Solid filled wall block."""
    t = blank(16, 16, ST)
    outline(t, 0, 0, 16, 16, DK)
    dot(t, 1, 1, MG)
    dot(t, 14, 1, MG)
    dot(t, 1, 14, K)
    dot(t, 14, 14, K)
    return t


# --- Stone floor tiles ---

def tile_stone_floor_a():
    """Standard stone floor — subtle tile pattern."""
    t = blank(16, 16, DK)
    rect(t, 1, 1, 14, 14, DK)
    # Tile cracks / grout lines
    hline(t, 0, 8, 16, K)
    vline(t, 8, 0, 16, K)
    # Subtle highlights
    dot(t, 3, 3, ST)
    dot(t, 12, 5, ST)
    dot(t, 6, 12, ST)
    dot(t, 11, 11, ST)
    return t


def tile_stone_floor_b():
    """Floor variant b — offset tiles."""
    t = blank(16, 16, DK)
    hline(t, 0, 0, 16, K)
    vline(t, 4, 0, 8, K)
    vline(t, 12, 0, 8, K)
    hline(t, 0, 8, 16, K)
    vline(t, 0, 8, 8, K)
    vline(t, 8, 8, 8, K)
    # Highlights
    dot(t, 2, 4, ST)
    dot(t, 8, 3, ST)
    dot(t, 4, 12, ST)
    dot(t, 14, 11, ST)
    return t


def tile_stone_floor_c():
    """Floor variant c — smooth flagstone."""
    t = blank(16, 16, DK)
    rect(t, 1, 1, 14, 6, ST)
    rect(t, 1, 9, 14, 6, ST)
    rect(t, 1, 1, 6, 14, ST)
    rect(t, 9, 1, 6, 14, ST)
    # Trim dark
    hline(t, 0, 0, 16, K)
    hline(t, 0, 7, 16, K)
    hline(t, 0, 8, 16, K)
    hline(t, 0, 15, 16, K)
    vline(t, 0, 0, 16, K)
    vline(t, 7, 0, 16, K)
    vline(t, 8, 0, 16, K)
    vline(t, 15, 0, 16, K)
    # Highlights center
    dot(t, 4, 4, MG)
    dot(t, 12, 4, MG)
    dot(t, 4, 12, MG)
    dot(t, 12, 12, MG)
    return t


def tile_stone_floor_crack():
    """Cracked floor — danger hint."""
    t = tile_stone_floor_a()
    # Diagonal crack
    for i in range(10):
        dot(t, 3 + i, 4 + i if (4 + i) < 16 else 15, K)
        if i < 8:
            dot(t, 4 + i, 4 + i, K)
    # Some rubble specks
    dot(t, 6, 10, ST)
    dot(t, 10, 7, ST)
    return t


def tile_stone_corridor_h():
    """Horizontal corridor — walls top and bottom."""
    t = blank(16, 16, DK)
    rect(t, 0, 0, 16, 3, ST)
    rect(t, 0, 13, 16, 3, ST)
    hline(t, 0, 2, 16, K)
    hline(t, 0, 13, 16, K)
    # Floor detail
    dot(t, 4, 7, ST)
    dot(t, 11, 9, ST)
    return t


def tile_stone_corridor_v():
    """Vertical corridor — walls left and right."""
    t = blank(16, 16, DK)
    rect(t, 0, 0, 3, 16, ST)
    rect(t, 13, 0, 3, 16, ST)
    vline(t, 2, 0, 16, K)
    vline(t, 13, 0, 16, K)
    dot(t, 7, 4, ST)
    dot(t, 9, 11, ST)
    return t


def tile_stone_corridor_corner_tl():
    t = blank(16, 16, DK)
    rect(t, 0, 0, 16, 3, ST)
    rect(t, 0, 0, 3, 16, ST)
    hline(t, 0, 2, 16, K)
    vline(t, 2, 0, 16, K)
    return t


def tile_stone_corridor_corner_tr():
    t = blank(16, 16, DK)
    rect(t, 0, 0, 16, 3, ST)
    rect(t, 13, 0, 3, 16, ST)
    hline(t, 0, 2, 16, K)
    vline(t, 13, 0, 16, K)
    return t


def tile_stone_corridor_corner_bl():
    t = blank(16, 16, DK)
    rect(t, 0, 13, 16, 3, ST)
    rect(t, 0, 0, 3, 16, ST)
    hline(t, 0, 13, 16, K)
    vline(t, 2, 0, 16, K)
    return t


def tile_stone_corridor_corner_br():
    t = blank(16, 16, DK)
    rect(t, 0, 13, 16, 3, ST)
    rect(t, 13, 0, 3, 16, ST)
    hline(t, 0, 13, 16, K)
    vline(t, 13, 0, 16, K)
    return t


def tile_stone_floor_drain():
    """Floor with drain grate."""
    t = tile_stone_floor_a()
    rect(t, 5, 5, 6, 6, K)
    hline(t, 6, 6, 4, DK)
    hline(t, 6, 8, 4, DK)
    hline(t, 6, 10, 4, DK)
    return t


def tile_stone_floor_rune():
    """Floor with faded rune circle."""
    t = tile_stone_floor_a()
    # Simple circle rune
    for px, py in [(7, 3), (8, 3), (4, 5), (11, 5), (3, 7), (12, 7),
                   (3, 8), (12, 8), (4, 10), (11, 10), (7, 12), (8, 12)]:
        dot(t, px, py, MP)
    return t


def build_stone_tileset():
    """Build 256x32 stone theme tileset (16 tiles x 2 rows)."""
    row1 = [
        tile_stone_wall_top(),
        tile_stone_wall_face(),
        tile_stone_wall_left(),
        tile_stone_wall_right(),
        tile_stone_corner_tl(),
        tile_stone_corner_tr(),
        tile_stone_corner_bl(),
        tile_stone_corner_br(),
        tile_stone_wall_cross(),
        tile_stone_wall_t_h(),
        tile_stone_wall_t_v(),
        tile_stone_wall_end_h(),
        tile_stone_wall_end_v(),
        tile_stone_wall_single(),
        tile_stone_wall_solid(),
        tile_stone_floor_rune(),
    ]
    row2 = [
        tile_stone_floor_a(),
        tile_stone_floor_b(),
        tile_stone_floor_c(),
        tile_stone_floor_crack(),
        tile_stone_corridor_h(),
        tile_stone_corridor_v(),
        tile_stone_corridor_corner_tl(),
        tile_stone_corridor_corner_tr(),
        tile_stone_corridor_corner_bl(),
        tile_stone_corridor_corner_br(),
        tile_stone_floor_drain(),
        tile_stone_floor_a(),      # dupe for padding
        tile_stone_floor_b(),
        tile_stone_floor_c(),
        tile_stone_floor_crack(),
        tile_stone_floor_drain(),
    ]
    return vstack([hstack(row1), hstack(row2)])


# ═══════════════════════════════════════════════════════════════════════════════
# CRYSTAL THEME TILESET
# ═══════════════════════════════════════════════════════════════════════════════

def tile_crystal_wall_top():
    t = blank(16, 16, PM)
    # Crystal-embedded wall
    for by in range(0, 16, 4):
        offset = 0 if (by // 4) % 2 == 0 else 4
        for bx in range(offset, 16, 8):
            rect(t, bx, by, 7, 3, MP)
            hline(t, bx, by, 7, MV)
    # Crystal glints
    dot(t, 3, 2, SG)
    dot(t, 11, 10, SG)
    dot(t, 7, 6, MV)
    return t


def tile_crystal_wall_face():
    t = blank(16, 16, K)
    for by in range(0, 16, 5):
        offset = 0 if (by // 5) % 2 == 0 else 4
        for bx in range(offset, 16, 8):
            rect(t, bx, by, 7, 4, PM)
            hline(t, bx, by, 7, MP)
    # Crystal formations
    dot(t, 5, 3, SG)
    dot(t, 12, 8, MV)
    dot(t, 2, 12, SG)
    return t


def tile_crystal_wall_left():
    t = blank(16, 16, PM)
    rect(t, 0, 0, 2, 16, K)
    for by in range(0, 16, 4):
        rect(t, 2, by, 13, 3, MP)
    # Crystal protrusion
    rect(t, 2, 5, 3, 6, MV)
    dot(t, 3, 6, SG)
    return t


def tile_crystal_wall_right():
    t = blank(16, 16, PM)
    rect(t, 14, 0, 2, 16, K)
    for by in range(0, 16, 4):
        rect(t, 1, by, 13, 3, MP)
    rect(t, 11, 5, 3, 6, MV)
    dot(t, 12, 6, SG)
    return t


def tile_crystal_corner_tl():
    t = blank(16, 16, K)
    rect(t, 2, 2, 14, 14, PM)
    rect(t, 4, 4, 10, 10, MP)
    dot(t, 6, 6, SG)
    return t


def tile_crystal_corner_tr():
    t = blank(16, 16, K)
    rect(t, 0, 2, 14, 14, PM)
    rect(t, 2, 4, 10, 10, MP)
    dot(t, 9, 6, SG)
    return t


def tile_crystal_corner_bl():
    t = blank(16, 16, K)
    rect(t, 2, 0, 14, 14, PM)
    rect(t, 4, 2, 10, 10, MP)
    dot(t, 6, 9, SG)
    return t


def tile_crystal_corner_br():
    t = blank(16, 16, K)
    rect(t, 0, 0, 14, 14, PM)
    rect(t, 2, 2, 10, 10, MP)
    dot(t, 9, 9, SG)
    return t


def tile_crystal_wall_cross():
    t = blank(16, 16, PM)
    rect(t, 0, 6, 16, 4, MP)
    rect(t, 6, 0, 4, 16, MP)
    rect(t, 6, 6, 4, 4, MV)
    dot(t, 7, 7, SG)
    dot(t, 8, 8, SG)
    return t


def tile_crystal_wall_t_h():
    t = blank(16, 16, PM)
    rect(t, 0, 0, 16, 8, MP)
    hline(t, 0, 0, 16, MV)
    rect(t, 6, 8, 4, 8, MP)
    dot(t, 8, 3, SG)
    return t


def tile_crystal_wall_t_v():
    t = blank(16, 16, PM)
    rect(t, 0, 0, 8, 16, MP)
    vline(t, 0, 0, 16, MV)
    rect(t, 8, 6, 8, 4, MP)
    dot(t, 3, 8, SG)
    return t


def tile_crystal_wall_end_h():
    t = blank(16, 16, PM)
    rect(t, 0, 4, 12, 8, MP)
    hline(t, 0, 4, 12, MV)
    vline(t, 11, 4, 8, K)
    dot(t, 5, 7, SG)
    return t


def tile_crystal_wall_end_v():
    t = blank(16, 16, PM)
    rect(t, 4, 0, 8, 12, MP)
    vline(t, 4, 0, 12, MV)
    hline(t, 4, 11, 8, K)
    dot(t, 7, 5, SG)
    return t


def tile_crystal_wall_single():
    t = blank(16, 16, _)
    rect(t, 3, 3, 10, 10, PM)
    rect(t, 4, 4, 8, 8, MP)
    rect(t, 5, 5, 6, 6, MV)
    dot(t, 7, 7, SG)
    outline(t, 3, 3, 10, 10, K)
    return t


def tile_crystal_wall_solid():
    t = blank(16, 16, MP)
    outline(t, 0, 0, 16, 16, PM)
    dot(t, 4, 4, SG)
    dot(t, 11, 11, SG)
    dot(t, 4, 11, MV)
    dot(t, 11, 4, MV)
    return t


def tile_crystal_floor_a():
    t = blank(16, 16, PM)
    hline(t, 0, 8, 16, K)
    vline(t, 8, 0, 16, K)
    dot(t, 3, 3, MP)
    dot(t, 12, 5, MP)
    dot(t, 6, 12, MP)
    dot(t, 11, 11, MV)
    # Crystal sparkles
    dot(t, 5, 2, SG)
    dot(t, 13, 9, SG)
    return t


def tile_crystal_floor_b():
    t = blank(16, 16, PM)
    hline(t, 0, 0, 16, K)
    vline(t, 4, 0, 8, K)
    vline(t, 12, 0, 8, K)
    hline(t, 0, 8, 16, K)
    vline(t, 0, 8, 8, K)
    vline(t, 8, 8, 8, K)
    dot(t, 2, 4, MV)
    dot(t, 10, 12, SG)
    return t


def tile_crystal_floor_crack():
    t = tile_crystal_floor_a()
    for i in range(8):
        dot(t, 3 + i, 4 + i if (4 + i) < 16 else 15, MV)
    return t


def tile_crystal_corridor_h():
    t = blank(16, 16, PM)
    rect(t, 0, 0, 16, 3, MP)
    rect(t, 0, 13, 16, 3, MP)
    hline(t, 0, 2, 16, K)
    hline(t, 0, 13, 16, K)
    dot(t, 4, 7, SG)
    dot(t, 11, 9, MV)
    return t


def tile_crystal_corridor_v():
    t = blank(16, 16, PM)
    rect(t, 0, 0, 3, 16, MP)
    rect(t, 13, 0, 3, 16, MP)
    vline(t, 2, 0, 16, K)
    vline(t, 13, 0, 16, K)
    dot(t, 7, 4, SG)
    dot(t, 9, 11, MV)
    return t


def tile_crystal_floor_rune():
    t = tile_crystal_floor_a()
    for px, py in [(7, 3), (8, 3), (4, 5), (11, 5), (3, 7), (12, 7),
                   (3, 8), (12, 8), (4, 10), (11, 10), (7, 12), (8, 12)]:
        dot(t, px, py, SG)
    return t


def build_crystal_tileset():
    row1 = [
        tile_crystal_wall_top(),
        tile_crystal_wall_face(),
        tile_crystal_wall_left(),
        tile_crystal_wall_right(),
        tile_crystal_corner_tl(),
        tile_crystal_corner_tr(),
        tile_crystal_corner_bl(),
        tile_crystal_corner_br(),
        tile_crystal_wall_cross(),
        tile_crystal_wall_t_h(),
        tile_crystal_wall_t_v(),
        tile_crystal_wall_end_h(),
        tile_crystal_wall_end_v(),
        tile_crystal_wall_single(),
        tile_crystal_wall_solid(),
        tile_crystal_floor_rune(),
    ]
    row2 = [
        tile_crystal_floor_a(),
        tile_crystal_floor_b(),
        tile_crystal_floor_a(),   # variant
        tile_crystal_floor_crack(),
        tile_crystal_corridor_h(),
        tile_crystal_corridor_v(),
        tile_crystal_corner_tl(),
        tile_crystal_corner_tr(),
        tile_crystal_corner_bl(),
        tile_crystal_corner_br(),
        tile_crystal_floor_b(),
        tile_crystal_floor_a(),
        tile_crystal_floor_b(),
        tile_crystal_floor_crack(),
        tile_crystal_floor_a(),
        tile_crystal_floor_rune(),
    ]
    return vstack([hstack(row1), hstack(row2)])


# ═══════════════════════════════════════════════════════════════════════════════
# INFERNAL THEME TILESET
# ═══════════════════════════════════════════════════════════════════════════════

def tile_infernal_wall_top():
    t = blank(16, 16, K)
    for by in range(0, 16, 4):
        offset = 0 if (by // 4) % 2 == 0 else 4
        for bx in range(offset, 16, 8):
            rect(t, bx, by, 7, 3, DK)
            hline(t, bx, by, 7, DB)
    # Lava glow seeping through
    dot(t, 4, 3, FR)
    dot(t, 12, 11, ER)
    dot(t, 8, 7, FR)
    return t


def tile_infernal_wall_face():
    t = blank(16, 16, K)
    for by in range(0, 16, 5):
        offset = 0 if (by // 5) % 2 == 0 else 4
        for bx in range(offset, 16, 8):
            rect(t, bx, by, 7, 4, DB)
    # Ember cracks
    dot(t, 3, 6, FR)
    dot(t, 10, 3, EM)
    dot(t, 7, 12, FR)
    return t


def tile_infernal_wall_left():
    t = blank(16, 16, K)
    rect(t, 0, 0, 2, 16, K)
    for by in range(0, 16, 4):
        rect(t, 2, by, 13, 3, DK)
    # Lava vein
    vline(t, 3, 4, 8, FR)
    dot(t, 3, 8, EM)
    return t


def tile_infernal_wall_right():
    t = blank(16, 16, K)
    rect(t, 14, 0, 2, 16, K)
    for by in range(0, 16, 4):
        rect(t, 1, by, 13, 3, DK)
    vline(t, 12, 4, 8, FR)
    dot(t, 12, 8, EM)
    return t


def tile_infernal_corner_tl():
    t = blank(16, 16, K)
    rect(t, 2, 2, 14, 14, DB)
    rect(t, 4, 4, 10, 10, DK)
    dot(t, 6, 6, FR)
    return t


def tile_infernal_corner_tr():
    t = blank(16, 16, K)
    rect(t, 0, 2, 14, 14, DB)
    rect(t, 2, 4, 10, 10, DK)
    dot(t, 9, 6, FR)
    return t


def tile_infernal_corner_bl():
    t = blank(16, 16, K)
    rect(t, 2, 0, 14, 14, DB)
    rect(t, 4, 2, 10, 10, DK)
    dot(t, 6, 9, FR)
    return t


def tile_infernal_corner_br():
    t = blank(16, 16, K)
    rect(t, 0, 0, 14, 14, DB)
    rect(t, 2, 2, 10, 10, DK)
    dot(t, 9, 9, FR)
    return t


def tile_infernal_wall_cross():
    t = blank(16, 16, K)
    rect(t, 0, 6, 16, 4, DK)
    rect(t, 6, 0, 4, 16, DK)
    rect(t, 6, 6, 4, 4, DB)
    dot(t, 7, 7, FR)
    dot(t, 8, 8, EM)
    return t


def tile_infernal_wall_t_h():
    t = blank(16, 16, K)
    rect(t, 0, 0, 16, 8, DK)
    hline(t, 0, 0, 16, DB)
    rect(t, 6, 8, 4, 8, DK)
    dot(t, 8, 3, FR)
    return t


def tile_infernal_wall_t_v():
    t = blank(16, 16, K)
    rect(t, 0, 0, 8, 16, DK)
    vline(t, 0, 0, 16, DB)
    rect(t, 8, 6, 8, 4, DK)
    dot(t, 3, 8, FR)
    return t


def tile_infernal_wall_end_h():
    t = blank(16, 16, K)
    rect(t, 0, 4, 12, 8, DK)
    hline(t, 0, 4, 12, DB)
    vline(t, 11, 4, 8, K)
    dot(t, 5, 7, FR)
    return t


def tile_infernal_wall_end_v():
    t = blank(16, 16, K)
    rect(t, 4, 0, 8, 12, DK)
    vline(t, 4, 0, 12, DB)
    hline(t, 4, 11, 8, K)
    dot(t, 7, 5, FR)
    return t


def tile_infernal_wall_single():
    t = blank(16, 16, _)
    rect(t, 3, 3, 10, 10, K)
    rect(t, 4, 4, 8, 8, DK)
    rect(t, 5, 5, 6, 6, DB)
    dot(t, 7, 7, FR)
    outline(t, 3, 3, 10, 10, K)
    return t


def tile_infernal_wall_solid():
    t = blank(16, 16, DK)
    outline(t, 0, 0, 16, 16, K)
    dot(t, 4, 4, FR)
    dot(t, 11, 11, EM)
    dot(t, 4, 11, DB)
    dot(t, 11, 4, FR)
    return t


def tile_infernal_floor_a():
    t = blank(16, 16, K)
    rect(t, 1, 1, 14, 14, DK)
    hline(t, 0, 8, 16, K)
    vline(t, 8, 0, 16, K)
    # Ember glow
    dot(t, 3, 3, ER)
    dot(t, 12, 5, FR)
    dot(t, 6, 12, ER)
    return t


def tile_infernal_floor_b():
    t = blank(16, 16, K)
    rect(t, 1, 1, 14, 14, DK)
    hline(t, 0, 0, 16, K)
    vline(t, 4, 0, 8, K)
    vline(t, 12, 0, 8, K)
    hline(t, 0, 8, 16, K)
    dot(t, 2, 4, FR)
    dot(t, 14, 11, EM)
    return t


def tile_infernal_floor_lava():
    """Floor tile with lava pool."""
    t = blank(16, 16, K)
    rect(t, 1, 1, 14, 14, DK)
    # Lava pool center
    rect(t, 4, 4, 8, 8, DB)
    rect(t, 5, 5, 6, 6, ER)
    rect(t, 6, 6, 4, 4, FR)
    dot(t, 7, 7, EM)
    dot(t, 8, 8, YL)
    return t


def tile_infernal_floor_crack():
    t = tile_infernal_floor_a()
    for i in range(8):
        dot(t, 3 + i, 4 + i if (4 + i) < 16 else 15, ER)
        if i < 6:
            dot(t, 4 + i, 5 + i, FR)
    return t


def tile_infernal_corridor_h():
    t = blank(16, 16, K)
    rect(t, 0, 3, 16, 10, DK)
    rect(t, 0, 0, 16, 3, DB)
    rect(t, 0, 13, 16, 3, DB)
    hline(t, 0, 2, 16, K)
    hline(t, 0, 13, 16, K)
    dot(t, 4, 7, FR)
    dot(t, 11, 9, ER)
    return t


def tile_infernal_corridor_v():
    t = blank(16, 16, K)
    rect(t, 3, 0, 10, 16, DK)
    rect(t, 0, 0, 3, 16, DB)
    rect(t, 13, 0, 3, 16, DB)
    vline(t, 2, 0, 16, K)
    vline(t, 13, 0, 16, K)
    dot(t, 7, 4, FR)
    dot(t, 9, 11, ER)
    return t


def tile_infernal_floor_rune():
    t = tile_infernal_floor_a()
    for px, py in [(7, 3), (8, 3), (4, 5), (11, 5), (3, 7), (12, 7),
                   (3, 8), (12, 8), (4, 10), (11, 10), (7, 12), (8, 12)]:
        dot(t, px, py, FR)
    return t


def build_infernal_tileset():
    row1 = [
        tile_infernal_wall_top(),
        tile_infernal_wall_face(),
        tile_infernal_wall_left(),
        tile_infernal_wall_right(),
        tile_infernal_corner_tl(),
        tile_infernal_corner_tr(),
        tile_infernal_corner_bl(),
        tile_infernal_corner_br(),
        tile_infernal_wall_cross(),
        tile_infernal_wall_t_h(),
        tile_infernal_wall_t_v(),
        tile_infernal_wall_end_h(),
        tile_infernal_wall_end_v(),
        tile_infernal_wall_single(),
        tile_infernal_wall_solid(),
        tile_infernal_floor_rune(),
    ]
    row2 = [
        tile_infernal_floor_a(),
        tile_infernal_floor_b(),
        tile_infernal_floor_lava(),
        tile_infernal_floor_crack(),
        tile_infernal_corridor_h(),
        tile_infernal_corridor_v(),
        tile_infernal_corner_tl(),
        tile_infernal_corner_tr(),
        tile_infernal_corner_bl(),
        tile_infernal_corner_br(),
        tile_infernal_floor_b(),
        tile_infernal_floor_a(),
        tile_infernal_floor_b(),
        tile_infernal_floor_lava(),
        tile_infernal_floor_crack(),
        tile_infernal_floor_rune(),
    ]
    return vstack([hstack(row1), hstack(row2)])


# ═══════════════════════════════════════════════════════════════════════════════
# DOOR SPRITES
# ═══════════════════════════════════════════════════════════════════════════════

def gen_door_stone():
    """Stone door — closed + open = 32x16."""
    closed = blank(16, 16, _)
    rect(closed, 2, 0, 12, 16, DK)
    rect(closed, 3, 1, 10, 14, ST)
    outline(closed, 2, 0, 12, 16, K)
    # Door detail: metal bands
    hline(closed, 3, 3, 10, MG)
    hline(closed, 3, 8, 10, MG)
    hline(closed, 3, 13, 10, MG)
    # Handle
    rect(closed, 9, 6, 2, 3, DG)
    dot(closed, 10, 7, GD)

    opened = blank(16, 16, _)
    # Open door recessed
    rect(opened, 2, 0, 4, 16, DK)
    rect(opened, 10, 0, 4, 16, DK)
    outline(opened, 2, 0, 4, 16, K)
    outline(opened, 10, 0, 4, 16, K)
    # Floor visible in opening
    rect(opened, 6, 2, 4, 12, DK)
    dot(opened, 7, 7, ST)

    return hstack([closed, opened])


def gen_door_crystal():
    """Crystal door — closed + open = 32x16."""
    closed = blank(16, 16, _)
    rect(closed, 2, 0, 12, 16, PM)
    rect(closed, 3, 1, 10, 14, MP)
    outline(closed, 2, 0, 12, 16, K)
    hline(closed, 3, 3, 10, MV)
    hline(closed, 3, 8, 10, MV)
    hline(closed, 3, 13, 10, MV)
    dot(closed, 7, 7, SG)
    dot(closed, 8, 8, SG)

    opened = blank(16, 16, _)
    rect(opened, 2, 0, 4, 16, PM)
    rect(opened, 10, 0, 4, 16, PM)
    outline(opened, 2, 0, 4, 16, K)
    outline(opened, 10, 0, 4, 16, K)
    rect(opened, 6, 2, 4, 12, PM)
    dot(opened, 7, 7, MV)

    return hstack([closed, opened])


def gen_door_infernal():
    """Infernal door — closed + open = 32x16."""
    closed = blank(16, 16, _)
    rect(closed, 2, 0, 12, 16, K)
    rect(closed, 3, 1, 10, 14, DK)
    outline(closed, 2, 0, 12, 16, K)
    hline(closed, 3, 3, 10, DB)
    hline(closed, 3, 8, 10, DB)
    hline(closed, 3, 13, 10, DB)
    # Lava veins
    dot(closed, 5, 5, FR)
    dot(closed, 10, 10, FR)
    dot(closed, 7, 7, EM)

    opened = blank(16, 16, _)
    rect(opened, 2, 0, 4, 16, K)
    rect(opened, 10, 0, 4, 16, K)
    outline(opened, 2, 0, 4, 16, K)
    outline(opened, 10, 0, 4, 16, K)
    rect(opened, 6, 2, 4, 12, DK)
    dot(opened, 7, 7, FR)

    return hstack([closed, opened])


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRANCE / EXIT SPRITES
# ═══════════════════════════════════════════════════════════════════════════════

def gen_entrance_exit():
    """Dungeon entrance + exit = 32x16."""
    # Entrance (archway with stairs going down)
    entrance = blank(16, 16, _)
    rect(entrance, 2, 0, 12, 16, DK)
    rect(entrance, 4, 2, 8, 14, K)
    # Arch top
    rect(entrance, 4, 0, 8, 3, ST)
    hline(entrance, 4, 0, 8, MG)
    # Stairs
    for i in range(5):
        rect(entrance, 4 + i, 12 - i * 2, 8 - i * 2, 2, ST)
    # Columns
    rect(entrance, 2, 0, 2, 16, ST)
    rect(entrance, 12, 0, 2, 16, ST)

    # Exit (archway with light / upward stairs)
    exit_s = blank(16, 16, _)
    rect(exit_s, 2, 0, 12, 16, DK)
    rect(exit_s, 4, 2, 8, 14, K)
    rect(exit_s, 4, 0, 8, 3, ST)
    hline(exit_s, 4, 0, 8, MG)
    # Light glow from exit
    rect(exit_s, 5, 3, 6, 8, DK)
    rect(exit_s, 6, 4, 4, 6, ST)
    dot(exit_s, 7, 6, PG)
    dot(exit_s, 8, 6, PG)
    # Columns
    rect(exit_s, 2, 0, 2, 16, ST)
    rect(exit_s, 12, 0, 2, 16, ST)

    return hstack([entrance, exit_s])


# ═══════════════════════════════════════════════════════════════════════════════
# ROOM TEMPLATE DECORATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def gen_room_combat():
    """Combat arena marker — crossed swords on stone."""
    t = blank(16, 16, DK)
    rect(t, 1, 1, 14, 14, ST)
    outline(t, 0, 0, 16, 16, K)
    # Crossed swords (X shape)
    for i in range(10):
        dot(t, 3 + i, 3 + i, ER)
        dot(t, 12 - i, 3 + i, ER)
    # Sword handles
    dot(t, 3, 3, BR)
    dot(t, 12, 3, BR)
    # Center
    dot(t, 7, 7, NW)
    dot(t, 8, 8, NW)
    return t


def gen_room_treasure():
    """Treasure room marker — gem/chest motif."""
    t = blank(16, 16, DK)
    rect(t, 1, 1, 14, 14, ST)
    outline(t, 0, 0, 16, 16, K)
    # Chest shape
    rect(t, 4, 7, 8, 6, DT)
    rect(t, 4, 7, 8, 2, SN)
    outline(t, 4, 7, 8, 6, BN)
    # Lock/gem
    dot(t, 7, 10, GD)
    dot(t, 8, 10, GD)
    # Sparkles
    dot(t, 5, 4, YL)
    dot(t, 10, 3, GD)
    dot(t, 3, 5, PY)
    dot(t, 12, 5, YL)
    return t


def gen_room_boss():
    """Boss chamber marker — skull motif."""
    t = blank(16, 16, DK)
    rect(t, 1, 1, 14, 14, DB)
    outline(t, 0, 0, 16, 16, K)
    # Skull shape
    rect(t, 5, 3, 6, 6, PG)
    rect(t, 4, 4, 8, 4, PG)
    # Eye sockets
    rect(t, 5, 5, 2, 2, K)
    rect(t, 9, 5, 2, 2, K)
    # Eye glow
    dot(t, 5, 5, ER)
    dot(t, 9, 5, ER)
    # Nose
    dot(t, 7, 7, MG)
    # Jaw
    rect(t, 6, 9, 4, 2, PG)
    hline(t, 6, 10, 4, MG)
    # Crown hint
    dot(t, 5, 2, GD)
    dot(t, 7, 1, GD)
    dot(t, 9, 2, GD)
    return t


# ═══════════════════════════════════════════════════════════════════════════════
# ENVIRONMENTAL PROPS
# ═══════════════════════════════════════════════════════════════════════════════

def gen_prop_chest():
    """Chest sprite — closed + open = 32x16."""
    # Closed chest
    closed = blank(16, 16, _)
    rect(closed, 3, 6, 10, 8, BN)
    rect(closed, 3, 6, 10, 3, DT)
    outline(closed, 3, 6, 10, 8, BD)
    # Metal bands
    hline(closed, 3, 8, 10, DG)
    # Lock
    dot(closed, 7, 10, GD)
    dot(closed, 8, 10, GD)
    dot(closed, 7, 11, DG)
    dot(closed, 8, 11, DG)

    # Open chest
    opened = blank(16, 16, _)
    # Base
    rect(opened, 3, 9, 10, 5, BN)
    outline(opened, 3, 9, 10, 5, BD)
    hline(opened, 3, 11, 10, DG)
    # Open lid tilted back
    rect(opened, 3, 4, 10, 5, DT)
    outline(opened, 3, 4, 10, 5, BD)
    hline(opened, 3, 4, 10, SN)
    # Treasure peeking
    dot(opened, 5, 10, GD)
    dot(opened, 7, 9, YL)
    dot(opened, 10, 10, GD)
    dot(opened, 8, 9, PY)

    return hstack([closed, opened])


def gen_prop_trap_spikes():
    """Spike trap animation — 4 frames x 16x16 = 64x16.
    States: hidden, rising, up, retracting."""
    # Frame 1: hidden (floor tile with subtle hint)
    f1 = blank(16, 16, DK)
    hline(f1, 0, 8, 16, K)
    vline(f1, 8, 0, 16, K)
    # Subtle holes where spikes come from
    dot(f1, 4, 4, K)
    dot(f1, 11, 4, K)
    dot(f1, 4, 11, K)
    dot(f1, 11, 11, K)
    dot(f1, 7, 7, K)

    # Frame 2: rising (spikes partially up)
    f2 = copy_frame(f1)
    for sx, sy in [(4, 3), (11, 3), (7, 6), (4, 10), (11, 10)]:
        rect(f2, sx, sy, 1, 3, LS)
        dot(f2, sx, sy, NW)

    # Frame 3: fully up
    f3 = copy_frame(f1)
    for sx, sy in [(4, 1), (11, 1), (7, 4), (4, 8), (11, 8)]:
        rect(f3, sx, sy, 1, 5, LS)
        dot(f3, sx, sy, NW)
        # Blood/danger
        dot(f3, sx, sy + 1, PG)

    # Frame 4: retracting (spikes going back)
    f4 = copy_frame(f1)
    for sx, sy in [(4, 4), (11, 4), (7, 7), (4, 11), (11, 11)]:
        rect(f4, sx, sy, 1, 2, LS)

    return hstack([f1, f2, f3, f4])


def gen_prop_trap_floor():
    """Cracked danger floor tile."""
    t = blank(16, 16, DK)
    rect(t, 1, 1, 14, 14, DK)
    # Cracks
    for i in range(12):
        dot(t, 2 + i, 7 + (i % 3 - 1), K)
    for i in range(8):
        dot(t, 7 + (i % 3 - 1), 2 + i, K)
    # Warning: subtle red
    dot(t, 7, 7, DB)
    dot(t, 8, 8, DB)
    dot(t, 6, 9, DB)
    return t


# ═══════════════════════════════════════════════════════════════════════════════
# MINIMAP ICONS (8x8)
# ═══════════════════════════════════════════════════════════════════════════════

def gen_minimap_combat():
    t = blank(8, 8, _)
    rect(t, 1, 1, 6, 6, ER)
    outline(t, 1, 1, 6, 6, K)
    # Crossed swords hint
    dot(t, 2, 2, NW)
    dot(t, 5, 5, NW)
    dot(t, 5, 2, NW)
    dot(t, 2, 5, NW)
    return t


def gen_minimap_treasure():
    t = blank(8, 8, _)
    rect(t, 1, 1, 6, 6, GD)
    outline(t, 1, 1, 6, 6, K)
    dot(t, 3, 3, YL)
    dot(t, 4, 4, YL)
    return t


def gen_minimap_boss():
    t = blank(8, 8, _)
    rect(t, 1, 1, 6, 6, DB)
    outline(t, 1, 1, 6, 6, K)
    # Skull hint
    rect(t, 2, 2, 4, 3, PG)
    dot(t, 2, 3, K)
    dot(t, 5, 3, K)
    dot(t, 2, 3, ER)
    dot(t, 5, 3, ER)
    return t


def gen_minimap_entrance():
    t = blank(8, 8, _)
    rect(t, 1, 1, 6, 6, ST)
    outline(t, 1, 1, 6, 6, K)
    # Down arrow
    rect(t, 3, 2, 2, 3, LG)
    dot(t, 2, 4, LG)
    dot(t, 5, 4, LG)
    dot(t, 3, 5, LG)
    dot(t, 4, 5, LG)
    return t


def gen_minimap_exit():
    t = blank(8, 8, _)
    rect(t, 1, 1, 6, 6, ST)
    outline(t, 1, 1, 6, 6, K)
    # Up arrow
    dot(t, 3, 2, PB)
    dot(t, 4, 2, PB)
    dot(t, 2, 3, PB)
    dot(t, 5, 3, PB)
    rect(t, 3, 3, 2, 3, PB)
    return t


def gen_minimap_corridor():
    t = blank(8, 8, _)
    rect(t, 1, 1, 6, 6, DK)
    outline(t, 1, 1, 6, 6, K)
    # Corridor hint (horizontal line)
    hline(t, 2, 3, 4, MG)
    hline(t, 2, 4, 4, MG)
    return t


# ═══════════════════════════════════════════════════════════════════════════════
# DUNGEON ENTRY PORTAL (32x32, 4 animated frames = 128x32)
# ═══════════════════════════════════════════════════════════════════════════════

def gen_portal():
    """Animated dungeon entry portal — 4 frames x 32x32 = 128x32."""
    frames = []

    # Swirl patterns per frame (inner glow positions)
    swirl_sets = [
        [(14, 10), (17, 14), (13, 18), (18, 12), (15, 16)],
        [(15, 11), (18, 15), (14, 17), (17, 11), (13, 15)],
        [(13, 12), (16, 16), (18, 18), (14, 10), (17, 14)],
        [(16, 10), (13, 14), (17, 17), (15, 12), (18, 16)],
    ]
    glow_colors = [MV, SG, MV, SG]

    for fi in range(4):
        f = blank(32, 32, _)

        # Portal frame (oval/arch)
        rect(f, 8, 4, 16, 24, K)
        rect(f, 10, 2, 12, 28, K)
        rect(f, 6, 8, 20, 16, K)

        # Inner portal void
        rect(f, 10, 6, 12, 20, PM)
        rect(f, 12, 4, 8, 24, PM)
        rect(f, 8, 10, 16, 12, PM)

        # Stone frame border
        for dx in range(-1, 2):
            for dy in range(-1, 2):
                # Top arch
                for x in range(10, 22):
                    dot(f, x + dx, 3 + dy, ST)
                # Bottom
                for x in range(10, 22):
                    dot(f, x + dx, 27 + dy, ST)
                # Left pillar
                for y in range(6, 26):
                    dot(f, 7 + dx, y + dy, ST)
                # Right pillar
                for y in range(6, 26):
                    dot(f, 24 + dx, y + dy, ST)

        # Refined stone pillars
        rect(f, 6, 6, 3, 20, ST)
        rect(f, 23, 6, 3, 20, ST)
        vline(f, 6, 6, 20, MG)
        vline(f, 25, 6, 20, K)
        # Arch top
        rect(f, 9, 2, 14, 4, ST)
        hline(f, 9, 2, 14, MG)
        hline(f, 9, 5, 14, K)
        # Arch bottom
        rect(f, 9, 26, 14, 3, ST)
        hline(f, 9, 28, 14, K)

        # Inner void (magic swirl)
        rect(f, 9, 6, 14, 20, PM)
        rect(f, 11, 4, 10, 24, PM)

        # Swirling magic
        for (sx, sy) in swirl_sets[fi]:
            dot(f, sx, sy, glow_colors[fi])
            dot(f, sx + 1, sy, MP)
            dot(f, sx, sy + 1, MP)

        # Center glow
        gc = SG if fi % 2 == 0 else MV
        rect(f, 14, 13, 4, 4, gc)
        dot(f, 15, 14, NW)
        dot(f, 16, 15, NW)

        # Rune on pillars
        dot(f, 7, 12, MV)
        dot(f, 7, 18, MV)
        dot(f, 24, 12, MV)
        dot(f, 24, 18, MV)

        # Capstone decoration
        dot(f, 15, 3, GD)
        dot(f, 16, 3, GD)

        frames.append(f)

    return hstack(frames)


# ═══════════════════════════════════════════════════════════════════════════════
# DIFFICULTY TIER VARIANTS
# ═══════════════════════════════════════════════════════════════════════════════

HARD_TINT     = (160, 16, 16, 255)     # red tint
NIGHTMARE_TINT = (90, 10, 10, 255)     # deep blood + darkening


def make_difficulty_variants(base, name):
    """Generate Hard and Nightmare palette-shifted variants of a tileset."""
    hard = tint_frame(base, HARD_TINT, 0.15)
    nightmare = darken_frame(tint_frame(base, NIGHTMARE_TINT, 0.25), 0.15)
    write_png(os.path.join(ART_TILES, f'{name}_hard.png'), hard)
    write_png(os.path.join(ART_TILES, f'{name}_nightmare.png'), nightmare)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print('=== PIX-309: Procedural Dungeon Tileset & Room Template Art ===\n')

    # --- Themed tilesets ---
    print('[1/8] Themed dungeon tilesets (stone, crystal, infernal)...')
    stone = build_stone_tileset()
    write_png(os.path.join(ART_TILES, 'tileset_dungeon_stone.png'), stone)

    crystal = build_crystal_tileset()
    write_png(os.path.join(ART_TILES, 'tileset_dungeon_crystal.png'), crystal)

    infernal = build_infernal_tileset()
    write_png(os.path.join(ART_TILES, 'tileset_dungeon_infernal.png'), infernal)

    # --- Difficulty variants ---
    print('\n[2/8] Difficulty tier variants (Hard, Nightmare)...')
    make_difficulty_variants(stone, 'tileset_dungeon_stone')
    make_difficulty_variants(crystal, 'tileset_dungeon_crystal')
    make_difficulty_variants(infernal, 'tileset_dungeon_infernal')

    # --- Door sprites ---
    print('\n[3/8] Door sprites (open/closed per theme)...')
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_door_stone.png'), gen_door_stone())
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_door_crystal.png'), gen_door_crystal())
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_door_infernal.png'), gen_door_infernal())

    # --- Entrance/exit ---
    print('\n[4/8] Entrance and exit sprites...')
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_entrance_exit.png'), gen_entrance_exit())

    # --- Room decorations ---
    print('\n[5/8] Room template decorations (combat, treasure, boss)...')
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_room_combat.png'), gen_room_combat())
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_room_treasure.png'), gen_room_treasure())
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_room_boss.png'), gen_room_boss())

    # --- Environmental props ---
    print('\n[6/8] Environmental props (chest, traps)...')
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_prop_chest.png'), gen_prop_chest())
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_prop_trap_spikes.png'), gen_prop_trap_spikes())
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_prop_trap_floor.png'), gen_prop_trap_floor())

    # --- Minimap icons ---
    print('\n[7/8] Minimap icons (6 room types)...')
    write_png(os.path.join(ART_MINIMAP, 'icon_minimap_combat.png'), gen_minimap_combat())
    write_png(os.path.join(ART_MINIMAP, 'icon_minimap_treasure.png'), gen_minimap_treasure())
    write_png(os.path.join(ART_MINIMAP, 'icon_minimap_boss.png'), gen_minimap_boss())
    write_png(os.path.join(ART_MINIMAP, 'icon_minimap_entrance.png'), gen_minimap_entrance())
    write_png(os.path.join(ART_MINIMAP, 'icon_minimap_exit.png'), gen_minimap_exit())
    write_png(os.path.join(ART_MINIMAP, 'icon_minimap_corridor.png'), gen_minimap_corridor())

    # --- Portal ---
    print('\n[8/8] Dungeon entry portal (animated 4-frame 32x32)...')
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_portal.png'), gen_portal())

    print('\n=== Done! All PIX-309 assets generated. ===')


if __name__ == '__main__':
    main()
