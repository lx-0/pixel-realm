#!/usr/bin/env python3
"""
Generate minimap and world map art assets for PixelRealm (PIX-74).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md:
  - 32-color master palette only
  - Nearest-neighbor scaling
  - Consistent naming convention

Assets produced:
  Minimap frame:
    ui_minimap_frame.png            — 64×64 circular frame with decorative border

  Minimap icons (8×8 each):
    icon_minimap_player.png         — cyan arrow (player direction)
    icon_minimap_npc.png            — green dot (friendly NPC)
    icon_minimap_enemy.png          — red dot (hostile)
    icon_minimap_quest.png          — yellow exclamation (quest marker)
    icon_minimap_exit.png           — white door/arch (zone exit)

  World map background:
    ui_worldmap_bg.png              — 256×192 parchment texture

  Zone region tiles (32×32 each):
    ui_worldmap_zone_town.png       — town region (brown/warm)
    ui_worldmap_zone_forest.png     — forest region (green)
    ui_worldmap_zone_desert.png     — desert region (sand/gold)
    ui_worldmap_zone_ice.png        — ice caverns region (blue/white)

  Fog of war overlay:
    ui_worldmap_fog.png             — 32×32 semi-transparent dark overlay

  Zoom buttons (16×16 each):
    ui_worldmap_btn_zoom_in.png     — plus icon button
    ui_worldmap_btn_zoom_out.png    — minus icon button

  World map player marker:
    icon_worldmap_player.png        — 12×12 banner/flag marker

  Compass rose:
    ui_worldmap_compass.png         — 32×32 decorative compass rose
"""

import struct
import zlib
import os
import math

SCRIPT_DIR  = os.path.dirname(__file__)
OUT_DIR     = os.path.join(SCRIPT_DIR, '..', 'public', 'assets')
ART_UI      = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui')
ART_MAP     = os.path.join(ART_UI, 'map')
ART_ICONS   = os.path.join(ART_UI, 'icons')

for d in [OUT_DIR, ART_MAP, ART_ICONS]:
    os.makedirs(d, exist_ok=True)

# ─── Palette (RGBA tuples) — from master 32-color palette ────────────────────

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
DT  = (139, 92,  42,  255)  # dirt / wood
SN  = (184, 132, 63,  255)  # sand / light wood
DS  = (212, 168, 90,  255)  # desert gold
PS  = (232, 208, 138, 255)  # pale sand

# Greens
DF  = (26,  58,  26,  255)  # deep forest
FG  = (45,  110, 45,  255)  # forest green
LG  = (76,  155, 76,  255)  # leaf green
BG  = (120, 200, 120, 255)  # bright grass
FL  = (168, 228, 160, 255)  # light foliage

# Cyan / player-friendly
OC  = (10,  26,  58,  255)  # deep ocean
DP  = (26,  74,  138, 255)  # ocean blue
SB  = (42,  122, 192, 255)  # sky blue
PB  = (80,  168, 232, 255)  # player blue
HB  = (144, 208, 248, 255)  # ice / highlight
IW  = (200, 240, 255, 255)  # shimmer

# Red / danger
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

# Semi-transparent fog colors
FOG_DARK   = (13,  13,  13,  180)
FOG_MED    = (13,  13,  13,  120)
FOG_LIGHT  = (13,  13,  13,  60)

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


def blank(w, h, fill=_):
    return [[fill] * w for _ in range(h)]


def draw_rect(grid, x, y, w, h, color):
    for ry in range(y, min(y + h, len(grid))):
        for rx in range(x, min(x + w, len(grid[0]))):
            grid[ry][rx] = color


def draw_rect_outline(grid, x, y, w, h, color):
    for rx in range(x, min(x + w, len(grid[0]))):
        if y < len(grid):
            grid[y][rx] = color
        if y + h - 1 < len(grid):
            grid[y + h - 1][rx] = color
    for ry in range(y, min(y + h, len(grid))):
        if x < len(grid[0]):
            grid[ry][x] = color
        if x + w - 1 < len(grid[0]):
            grid[ry][x + w - 1] = color


def set_pixel(grid, x, y, color):
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color


def draw_circle_filled(grid, cx, cy, r, color):
    """Draw a filled circle (integer pixel coords)."""
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                set_pixel(grid, cx + dx, cy + dy, color)


def draw_circle_outline(grid, cx, cy, r, color):
    """Draw a circle outline using midpoint circle algorithm."""
    x = r
    y = 0
    d = 1 - r
    while x >= y:
        for sx, sy in [(x, y), (y, x), (-x, y), (-y, x),
                       (x, -y), (y, -x), (-x, -y), (-y, -x)]:
            set_pixel(grid, cx + sx, cy + sy, color)
        y += 1
        if d < 0:
            d += 2 * y + 1
        else:
            x -= 1
            d += 2 * (y - x) + 1


def draw_line_h(grid, x, y, length, color):
    for i in range(length):
        set_pixel(grid, x + i, y, color)


def draw_line_v(grid, x, y, length, color):
    for i in range(length):
        set_pixel(grid, x, y + i, color)


def copy_to(src, dst, ox, oy):
    """Copy src grid onto dst at offset (ox, oy)."""
    for y in range(len(src)):
        for x in range(len(src[0])):
            if src[y][x][3] > 0:
                set_pixel(dst, ox + x, oy + y, src[y][x])


# ─── Asset: Minimap Frame (64×64) ───────────────────────────────────────────

def gen_minimap_frame():
    """64×64 circular minimap frame with decorative stone border."""
    size = 64
    cx, cy = 31, 31
    g = blank(size, size)

    # Outer decorative ring (stone border)
    for dy in range(-32, 33):
        for dx in range(-32, 33):
            dist_sq = dx * dx + dy * dy
            # Outer border ring
            if 28 * 28 <= dist_sq <= 31 * 31:
                set_pixel(g, cx + dx, cy + dy, ST)
            elif 26 * 26 <= dist_sq < 28 * 28:
                set_pixel(g, cx + dx, cy + dy, MG)
            # Inner edge highlight
            elif 25 * 25 <= dist_sq < 26 * 26:
                set_pixel(g, cx + dx, cy + dy, LS)

    # Dark outline on outer edge
    draw_circle_outline(g, cx, cy, 31, K)
    draw_circle_outline(g, cx, cy, 30, DK)

    # Inner dark outline (map area boundary)
    draw_circle_outline(g, cx, cy, 25, K)

    # Corner decorations — small gold studs at cardinal points
    for dx, dy in [(0, -30), (0, 30), (-30, 0), (30, 0)]:
        px, py = cx + dx, cy + dy
        set_pixel(g, px, py, GD)
        set_pixel(g, px - 1, py, DG)
        set_pixel(g, px + 1, py, DG)
        set_pixel(g, px, py - 1, DG)
        set_pixel(g, px, py + 1, DG)

    # Diagonal studs
    diag = int(30 * 0.707)
    for dx, dy in [(diag, -diag), (-diag, -diag), (diag, diag), (-diag, diag)]:
        px, py = cx + dx, cy + dy
        set_pixel(g, px, py, GD)

    path = os.path.join(ART_MAP, 'ui_minimap_frame.png')
    write_png(path, g)
    write_png(os.path.join(OUT_DIR, 'ui_minimap_frame.png'), g)


# ─── Asset: Minimap Icons (8×8 each) ────────────────────────────────────────

def gen_minimap_icons():
    """5 minimap icon types, 8×8 px each."""

    # Player arrow — cyan pointing up
    player = blank(8, 8)
    # Arrow shape pointing up
    arrow_pixels = [
        (3, 1, PB), (4, 1, PB),
        (2, 2, PB), (3, 2, HB), (4, 2, HB), (5, 2, PB),
        (2, 3, SB), (3, 3, PB), (4, 3, PB), (5, 3, SB),
        (3, 4, SB), (4, 4, SB),
        (3, 5, DP), (4, 5, DP),
        (3, 6, DP), (4, 6, DP),
    ]
    for px, py, c in arrow_pixels:
        set_pixel(player, px, py, c)
    write_png(os.path.join(ART_ICONS, 'icon_minimap_player.png'), player)
    write_png(os.path.join(OUT_DIR, 'icon_minimap_player.png'), player)

    # NPC dot — green filled circle
    npc = blank(8, 8)
    draw_circle_filled(npc, 3, 3, 2, LG)
    draw_circle_filled(npc, 3, 3, 1, BG)
    set_pixel(npc, 3, 3, FL)
    write_png(os.path.join(ART_ICONS, 'icon_minimap_npc.png'), npc)
    write_png(os.path.join(OUT_DIR, 'icon_minimap_npc.png'), npc)

    # Enemy dot — red filled circle
    enemy = blank(8, 8)
    draw_circle_filled(enemy, 3, 3, 2, ER)
    draw_circle_filled(enemy, 3, 3, 1, BR)
    set_pixel(enemy, 3, 3, FR)
    write_png(os.path.join(ART_ICONS, 'icon_minimap_enemy.png'), enemy)
    write_png(os.path.join(OUT_DIR, 'icon_minimap_enemy.png'), enemy)

    # Quest marker — yellow exclamation mark
    quest = blank(8, 8)
    quest_pixels = [
        (3, 1, GD), (4, 1, GD),
        (3, 2, YL), (4, 2, YL),
        (3, 3, YL), (4, 3, YL),
        (3, 4, GD), (4, 4, GD),
        (3, 6, GD), (4, 6, GD),
    ]
    for px, py, c in quest_pixels:
        set_pixel(quest, px, py, c)
    write_png(os.path.join(ART_ICONS, 'icon_minimap_quest.png'), quest)
    write_png(os.path.join(OUT_DIR, 'icon_minimap_quest.png'), quest)

    # Zone exit — white arch/door shape
    exit_icon = blank(8, 8)
    exit_pixels = [
        # Arch top
        (2, 1, NW), (3, 1, NW), (4, 1, NW), (5, 1, NW),
        (1, 2, PG), (2, 2, NW), (5, 2, NW), (6, 2, PG),
        # Sides
        (1, 3, PG), (6, 3, PG),
        (1, 4, LS), (6, 4, LS),
        (1, 5, LS), (6, 5, LS),
        (1, 6, MG), (6, 6, MG),
        # Floor
        (1, 7, ST), (2, 7, ST), (3, 7, ST), (4, 7, ST), (5, 7, ST), (6, 7, ST),
    ]
    for px, py, c in exit_pixels:
        set_pixel(exit_icon, px, py, c)
    write_png(os.path.join(ART_ICONS, 'icon_minimap_exit.png'), exit_icon)
    write_png(os.path.join(OUT_DIR, 'icon_minimap_exit.png'), exit_icon)


# ─── Asset: World Map Parchment Background (256×192) ────────────────────────

def gen_worldmap_bg():
    """256×192 parchment/paper texture for world map background."""
    w, h = 256, 192
    g = blank(w, h, PS)

    # Create parchment texture with subtle color variation
    import random
    random.seed(42)  # deterministic

    parch_colors = [PS, DS, SN, PS, PS, DS]

    for y in range(h):
        for x in range(w):
            # Base parchment with pseudo-random texture
            idx = ((x * 7 + y * 13 + (x // 4) * 3 + (y // 4) * 5) % len(parch_colors))
            g[y][x] = parch_colors[idx]

    # Darker edges (vignette effect for aged parchment)
    edge_w = 6
    for y in range(h):
        for x in range(w):
            # Distance to nearest edge
            dx = min(x, w - 1 - x)
            dy = min(y, h - 1 - y)
            d = min(dx, dy)
            if d < 2:
                g[y][x] = BN
            elif d < 4:
                g[y][x] = DT
            elif d < edge_w:
                g[y][x] = SN

    # Subtle crease lines (aged look)
    for x in range(edge_w, w - edge_w):
        if (x + 17) % 64 < 2:
            for y in range(edge_w, h - edge_w):
                g[y][x] = SN

    for y in range(edge_w, h - edge_w):
        if (y + 11) % 48 < 2:
            for x in range(edge_w, w - edge_w):
                g[y][x] = SN

    # Dark outline border
    draw_rect_outline(g, 0, 0, w, h, BD)
    draw_rect_outline(g, 1, 1, w - 2, h - 2, BN)

    path = os.path.join(ART_MAP, 'ui_worldmap_bg.png')
    write_png(path, g)
    write_png(os.path.join(OUT_DIR, 'ui_worldmap_bg.png'), g)


# ─── Asset: Zone Region Tiles (32×32 each) ──────────────────────────────────

def gen_zone_tiles():
    """4 biome zone region tiles, 32×32 each."""

    # Town — warm browns, tiny buildings
    town = blank(32, 32, DT)
    # Road grid pattern
    for y in range(32):
        for x in range(32):
            if (x + 3) % 8 < 2 or (y + 3) % 8 < 2:
                town[y][x] = SN
    # Small buildings
    for bx, by, bw, bh in [(2, 2, 5, 4), (10, 4, 4, 5), (20, 2, 6, 5),
                             (3, 14, 5, 4), (15, 16, 4, 4), (24, 14, 5, 5),
                             (6, 24, 4, 5), (18, 25, 5, 4)]:
        draw_rect(town, bx, by, bw, bh, BN)
        draw_rect(town, bx, by, bw, 1, BD)  # roof
        # Window
        set_pixel(town, bx + bw // 2, by + bh // 2, GD)
    draw_rect_outline(town, 0, 0, 32, 32, BD)
    write_png(os.path.join(ART_MAP, 'ui_worldmap_zone_town.png'), town)
    write_png(os.path.join(OUT_DIR, 'ui_worldmap_zone_town.png'), town)

    # Forest — greens with tree clusters
    forest = blank(32, 32, FG)
    # Ground variation
    for y in range(32):
        for x in range(32):
            if (x * 5 + y * 7) % 6 == 0:
                forest[y][x] = DF
            elif (x * 3 + y * 11) % 8 == 0:
                forest[y][x] = LG
    # Tree canopy circles
    tree_positions = [(5, 5), (14, 3), (25, 6), (8, 14), (20, 13),
                      (4, 24), (15, 22), (26, 25), (10, 28)]
    for tx, ty in tree_positions:
        draw_circle_filled(forest, tx, ty, 3, DF)
        draw_circle_filled(forest, tx, ty, 2, FG)
        set_pixel(forest, tx, ty, LG)
    draw_rect_outline(forest, 0, 0, 32, 32, DF)
    write_png(os.path.join(ART_MAP, 'ui_worldmap_zone_forest.png'), forest)
    write_png(os.path.join(OUT_DIR, 'ui_worldmap_zone_forest.png'), forest)

    # Desert — sand dunes pattern
    desert = blank(32, 32, DS)
    for y in range(32):
        for x in range(32):
            # Dune wave pattern
            wave = int(3 * math.sin(x * 0.4 + y * 0.1))
            if (y + wave) % 6 < 2:
                desert[y][x] = SN
            elif (y + wave) % 6 == 2:
                desert[y][x] = PS
            # Scattered dots for sand particles
            if (x * 13 + y * 7) % 23 == 0:
                desert[y][x] = PS
    # Cacti-like features
    for cx, cy in [(7, 8), (22, 15), (12, 25)]:
        draw_line_v(desert, cx, cy - 2, 5, DF)
        set_pixel(desert, cx - 1, cy - 1, FG)
        set_pixel(desert, cx + 1, cy, FG)
    draw_rect_outline(desert, 0, 0, 32, 32, DG)
    write_png(os.path.join(ART_MAP, 'ui_worldmap_zone_desert.png'), desert)
    write_png(os.path.join(OUT_DIR, 'ui_worldmap_zone_desert.png'), desert)

    # Ice Caverns — blues and whites, crystal formations
    ice = blank(32, 32, HB)
    for y in range(32):
        for x in range(32):
            if (x * 3 + y * 5) % 7 == 0:
                ice[y][x] = IW
            elif (x * 11 + y * 3) % 9 == 0:
                ice[y][x] = SB
            elif (x + y * 2) % 11 == 0:
                ice[y][x] = PB
    # Crystal/stalagmite formations
    for cx, cy in [(6, 6), (20, 8), (12, 18), (26, 22), (5, 27)]:
        # Triangular crystal
        for i in range(5):
            set_pixel(ice, cx, cy - i, IW)
            if i > 1:
                set_pixel(ice, cx - 1, cy - i + 1, PB)
                set_pixel(ice, cx + 1, cy - i + 1, PB)
    # Cavern walls (dark edges)
    for y in range(32):
        for x in range(32):
            dx = min(x, 31 - x)
            dy = min(y, 31 - y)
            d = min(dx, dy)
            if d < 2:
                ice[y][x] = DP
            elif d < 3:
                ice[y][x] = SB
    draw_rect_outline(ice, 0, 0, 32, 32, OC)
    write_png(os.path.join(ART_MAP, 'ui_worldmap_zone_ice.png'), ice)
    write_png(os.path.join(OUT_DIR, 'ui_worldmap_zone_ice.png'), ice)


# ─── Asset: Fog of War Overlay (32×32) ──────────────────────────────────────

def gen_fog_of_war():
    """32×32 semi-transparent dark overlay with noise pattern."""
    g = blank(32, 32, FOG_DARK)

    # Create noise pattern for organic fog edge look
    for y in range(32):
        for x in range(32):
            # Dithered pattern for texture
            if (x + y) % 2 == 0:
                g[y][x] = FOG_DARK
            else:
                g[y][x] = FOG_MED

            # Slightly lighter patches
            if (x * 7 + y * 13) % 11 == 0:
                g[y][x] = FOG_LIGHT

    # Edges slightly lighter for blending
    for y in range(32):
        for x in range(32):
            dx = min(x, 31 - x)
            dy = min(y, 31 - y)
            d = min(dx, dy)
            if d < 3:
                g[y][x] = FOG_LIGHT
            elif d < 5:
                g[y][x] = FOG_MED

    path = os.path.join(ART_MAP, 'ui_worldmap_fog.png')
    write_png(path, g)
    write_png(os.path.join(OUT_DIR, 'ui_worldmap_fog.png'), g)


# ─── Asset: Zoom Buttons (16×16 each) ───────────────────────────────────────

def gen_zoom_buttons():
    """Zoom in (+) and zoom out (-) buttons, 16×16 each."""

    for label, icon_type in [('in', 'plus'), ('out', 'minus')]:
        g = blank(16, 16)

        # Button background — rounded rect
        draw_rect(g, 2, 1, 12, 14, ST)
        draw_rect(g, 1, 2, 14, 12, ST)
        # Lighter center
        draw_rect(g, 3, 2, 10, 12, MG)
        draw_rect(g, 2, 3, 12, 10, MG)
        # Highlight top edge
        draw_line_h(g, 3, 2, 10, LS)
        draw_line_h(g, 2, 3, 1, LS)
        # Shadow bottom edge
        draw_line_h(g, 3, 13, 10, DK)
        draw_line_h(g, 2, 12, 1, DK)

        # Icon — plus or minus
        if icon_type == 'plus':
            # Horizontal bar of +
            draw_line_h(g, 5, 7, 6, NW)
            draw_line_h(g, 5, 8, 6, NW)
            # Vertical bar of +
            draw_line_v(g, 7, 4, 8, NW)
            draw_line_v(g, 8, 4, 8, NW)
        else:
            # Just horizontal bar for -
            draw_line_h(g, 5, 7, 6, NW)
            draw_line_h(g, 5, 8, 6, NW)

        # Outline
        draw_rect_outline(g, 1, 1, 14, 14, K)
        # Round corners
        set_pixel(g, 1, 1, _)
        set_pixel(g, 14, 1, _)
        set_pixel(g, 1, 14, _)
        set_pixel(g, 14, 14, _)

        name = f'ui_worldmap_btn_zoom_{label}.png'
        write_png(os.path.join(ART_MAP, name), g)
        write_png(os.path.join(OUT_DIR, name), g)


# ─── Asset: World Map Player Marker (12×12) ─────────────────────────────────

def gen_worldmap_player_marker():
    """12×12 flag/banner marker for player position on world map."""
    g = blank(12, 12)

    # Flag pole
    for y in range(1, 11):
        set_pixel(g, 2, y, BN)
    set_pixel(g, 2, 11, BD)

    # Flag banner (cyan, player color)
    flag_pixels = [
        (3, 1, PB), (4, 1, PB), (5, 1, PB), (6, 1, PB), (7, 1, SB),
        (3, 2, HB), (4, 2, PB), (5, 2, PB), (6, 2, PB), (7, 2, SB), (8, 2, SB),
        (3, 3, PB), (4, 3, HB), (5, 3, PB), (6, 3, PB), (7, 3, PB), (8, 3, SB), (9, 3, DP),
        (3, 4, PB), (4, 4, PB), (5, 4, PB), (6, 4, PB), (7, 4, SB), (8, 4, DP),
        (3, 5, SB), (4, 5, PB), (5, 5, PB), (6, 5, SB), (7, 5, DP),
    ]
    for px, py, c in flag_pixels:
        set_pixel(g, px, py, c)

    # Flag outline
    set_pixel(g, 3, 0, K)
    set_pixel(g, 4, 0, K)
    set_pixel(g, 5, 0, K)
    set_pixel(g, 6, 0, K)
    set_pixel(g, 7, 0, K)

    # Base marker dot
    draw_circle_filled(g, 2, 11, 1, GD)

    path = os.path.join(ART_ICONS, 'icon_worldmap_player.png')
    write_png(path, g)
    write_png(os.path.join(OUT_DIR, 'icon_worldmap_player.png'), g)


# ─── Asset: Compass Rose (32×32) ────────────────────────────────────────────

def gen_compass_rose():
    """32×32 decorative compass rose for world map corner."""
    g = blank(32, 32)
    cx, cy = 15, 15

    # Outer circle
    draw_circle_outline(g, cx, cy, 14, DG)
    draw_circle_outline(g, cx, cy, 13, SN)

    # Inner circle
    draw_circle_outline(g, cx, cy, 5, DG)
    draw_circle_filled(g, cx, cy, 4, SN)
    draw_circle_filled(g, cx, cy, 2, DG)
    set_pixel(g, cx, cy, GD)

    # North point (long, gold)
    for i in range(1, 13):
        set_pixel(g, cx, cy - i, GD if i < 6 else DG)
        if i < 5:
            set_pixel(g, cx - 1, cy - i, DG)
            set_pixel(g, cx + 1, cy - i, DG)
    # N label
    set_pixel(g, cx - 1, cy - 13, GD)
    set_pixel(g, cx + 1, cy - 13, GD)
    set_pixel(g, cx, cy - 14, GD)

    # South point
    for i in range(1, 11):
        set_pixel(g, cx, cy + i, SN if i < 5 else DT)
        if i < 4:
            set_pixel(g, cx - 1, cy + i, DT)
            set_pixel(g, cx + 1, cy + i, DT)

    # East point
    for i in range(1, 11):
        set_pixel(g, cx + i, cy, SN if i < 5 else DT)
        if i < 4:
            set_pixel(g, cx + i, cy - 1, DT)
            set_pixel(g, cx + i, cy + 1, DT)

    # West point
    for i in range(1, 11):
        set_pixel(g, cx - i, cy, SN if i < 5 else DT)
        if i < 4:
            set_pixel(g, cx - i, cy - 1, DT)
            set_pixel(g, cx - i, cy + 1, DT)

    # Diagonal points (shorter, thinner)
    diag_len = 8
    for dx_sign, dy_sign in [(1, -1), (1, 1), (-1, -1), (-1, 1)]:
        for i in range(1, diag_len):
            set_pixel(g, cx + dx_sign * i, cy + dy_sign * i, DT if i < 4 else BN)

    # Tick marks on outer ring at cardinal points
    for dx, dy in [(0, -14), (0, 14), (-14, 0), (14, 0)]:
        set_pixel(g, cx + dx, cy + dy, GD)

    path = os.path.join(ART_MAP, 'ui_worldmap_compass.png')
    write_png(path, g)
    write_png(os.path.join(OUT_DIR, 'ui_worldmap_compass.png'), g)


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print('Generating minimap & world map art assets (PIX-74)…')
    print()

    print('[1/7] Minimap frame (64×64)')
    gen_minimap_frame()

    print('[2/7] Minimap icons (8×8 × 5)')
    gen_minimap_icons()

    print('[3/7] World map parchment background (256×192)')
    gen_worldmap_bg()

    print('[4/7] Zone region tiles (32×32 × 4)')
    gen_zone_tiles()

    print('[5/7] Fog of war overlay (32×32)')
    gen_fog_of_war()

    print('[6/7] Zoom buttons (16×16 × 2)')
    gen_zoom_buttons()

    print('[7/7] World map player marker (12×12) & compass rose (32×32)')
    gen_worldmap_player_marker()
    gen_compass_rose()

    print()
    print('Done! All minimap & world map assets generated.')
    print()
    print('Summary:')
    print('  assets/ui/map/ui_minimap_frame.png          — 64×64  minimap frame')
    print('  assets/ui/icons/icon_minimap_player.png      — 8×8    player arrow')
    print('  assets/ui/icons/icon_minimap_npc.png         — 8×8    NPC dot')
    print('  assets/ui/icons/icon_minimap_enemy.png       — 8×8    enemy dot')
    print('  assets/ui/icons/icon_minimap_quest.png       — 8×8    quest marker')
    print('  assets/ui/icons/icon_minimap_exit.png        — 8×8    zone exit')
    print('  assets/ui/map/ui_worldmap_bg.png             — 256×192 parchment bg')
    print('  assets/ui/map/ui_worldmap_zone_town.png      — 32×32  town region')
    print('  assets/ui/map/ui_worldmap_zone_forest.png    — 32×32  forest region')
    print('  assets/ui/map/ui_worldmap_zone_desert.png    — 32×32  desert region')
    print('  assets/ui/map/ui_worldmap_zone_ice.png       — 32×32  ice caverns')
    print('  assets/ui/map/ui_worldmap_fog.png            — 32×32  fog of war')
    print('  assets/ui/map/ui_worldmap_btn_zoom_in.png    — 16×16  zoom in')
    print('  assets/ui/map/ui_worldmap_btn_zoom_out.png   — 16×16  zoom out')
    print('  assets/ui/icons/icon_worldmap_player.png     — 12×12  player marker')
    print('  assets/ui/map/ui_worldmap_compass.png        — 32×32  compass rose')


if __name__ == '__main__':
    main()
