#!/usr/bin/env python3
"""
Generate faction system art assets for PixelRealm (PIX-95).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md:
  - 32-color master palette only
  - Nearest-neighbor scaling
  - Consistent naming convention

Factions:
  Merchants Guild  — gold/sand theme, coin/scale emblem
  Mages Circle     — purple/magic theme, arcane eye emblem
  Shadow Clan      — red/dark theme, dagger emblem
  Nature Wardens   — green/nature theme, leaf/tree emblem

Assets produced:
  Faction emblems (32×32 each):
    icon_faction_emblem_merchants.png
    icon_faction_emblem_mages.png
    icon_faction_emblem_shadow.png
    icon_faction_emblem_nature.png

  NPC faction indicators (16×16 each):
    icon_faction_indicator_merchants.png
    icon_faction_indicator_mages.png
    icon_faction_indicator_shadow.png
    icon_faction_indicator_nature.png

  Reputation tier badges (16×16 each):
    icon_rep_tier_hostile.png
    icon_rep_tier_unfriendly.png
    icon_rep_tier_neutral.png
    icon_rep_tier_friendly.png
    icon_rep_tier_honored.png
    icon_rep_tier_exalted.png

  Rep change notification sprites (32×16 each):
    ui_rep_change_positive.png
    ui_rep_change_negative.png

  Reputation UI panel:
    ui_panel_faction_reputation.png   — 220×200 reputation panel frame

  Reputation bar fill sprites (per faction, 100×8 each):
    ui_rep_bar_merchants.png
    ui_rep_bar_mages.png
    ui_rep_bar_shadow.png
    ui_rep_bar_nature.png

  Reputation bar background:
    ui_rep_bar_bg.png                 — 100×8 empty bar background
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
ART_UI     = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui')
ART_ICONS  = os.path.join(ART_UI, 'icons')
ART_FACTION = os.path.join(ART_UI, 'faction')

for d in [ART_FACTION, ART_ICONS]:
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
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                set_pixel(grid, cx + dx, cy + dy, color)


def draw_circle_outline(grid, cx, cy, r, color):
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            dist_sq = dx * dx + dy * dy
            if r * r - r <= dist_sq <= r * r + r:
                set_pixel(grid, cx + dx, cy + dy, color)


def draw_line_h(grid, x, y, length, color):
    for i in range(length):
        set_pixel(grid, x + i, y, color)


def draw_line_v(grid, x, y, length, color):
    for i in range(length):
        set_pixel(grid, x, y + i, color)


def draw_diamond(grid, cx, cy, r, color):
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if abs(dx) + abs(dy) <= r:
                set_pixel(grid, cx + dx, cy + dy, color)


def draw_diamond_outline(grid, cx, cy, r, color):
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if abs(dx) + abs(dy) == r:
                set_pixel(grid, cx + dx, cy + dy, color)


def draw_triangle_up(grid, cx, top_y, h, color):
    for row in range(h):
        y = top_y + row
        half_w = row
        for dx in range(-half_w, half_w + 1):
            set_pixel(grid, cx + dx, y, color)


# ─── Faction color maps ─────────────────────────────────────────────────────

FACTION_COLORS = {
    'merchants': {
        'primary':   GD,   # gold
        'secondary': DS,   # desert gold
        'accent':    DG,   # dark gold
        'highlight': YL,   # bright yellow
        'dark':      BD,   # deep soil (outline/shadow)
        'mid':       SN,   # sand
    },
    'mages': {
        'primary':   MV,   # mana violet
        'secondary': MP,   # magic purple
        'accent':    SG,   # spell glow
        'highlight': SG,   # spell glow
        'dark':      PM,   # deep magic
        'mid':       MP,   # magic purple
    },
    'shadow': {
        'primary':   BR,   # bright red
        'secondary': ER,   # enemy red
        'accent':    FR,   # fire orange
        'highlight': EM,   # ember
        'dark':      DB,   # deep blood
        'mid':       DK,   # dark rock
    },
    'nature': {
        'primary':   LG,   # leaf green
        'secondary': FG,   # forest green
        'accent':    BG,   # bright grass
        'highlight': FL,   # light foliage
        'dark':      DF,   # deep forest
        'mid':       FG,   # forest green
    },
}

# ─── 1. Faction emblems (32×32) ─────────────────────────────────────────────

def gen_emblem_merchants():
    """Merchants Guild emblem: a coin with a scale/balance motif."""
    g = blank(32, 32)
    # Coin circle
    draw_circle_filled(g, 15, 15, 13, DS)
    draw_circle_outline(g, 15, 15, 13, BD)
    draw_circle_filled(g, 15, 15, 11, GD)
    draw_circle_outline(g, 15, 15, 11, DG)
    # Inner detail: balance/scale
    # Vertical pole
    draw_line_v(g, 15, 8, 10, BD)
    # Horizontal beam
    draw_line_h(g, 10, 10, 11, BD)
    # Left pan
    set_pixel(g, 10, 11, BD)
    set_pixel(g, 11, 11, BD)
    draw_line_h(g, 9, 12, 4, DG)
    # Right pan
    set_pixel(g, 19, 11, BD)
    set_pixel(g, 20, 11, BD)
    draw_line_h(g, 18, 12, 4, DG)
    # Base triangle
    set_pixel(g, 14, 18, BD)
    set_pixel(g, 15, 18, BD)
    set_pixel(g, 16, 18, BD)
    set_pixel(g, 13, 19, BD)
    set_pixel(g, 17, 19, BD)
    draw_line_h(g, 12, 20, 7, DG)
    # Coin highlight
    for i in range(3):
        set_pixel(g, 8 + i, 6 + i, YL)
    return g


def gen_emblem_mages():
    """Mages Circle emblem: arcane eye within a circle."""
    g = blank(32, 32)
    # Outer circle
    draw_circle_filled(g, 15, 15, 13, MP)
    draw_circle_outline(g, 15, 15, 13, PM)
    draw_circle_filled(g, 15, 15, 11, PM)
    # Inner arcane eye shape
    # Eye outline (almond shape)
    for dx in range(-8, 9):
        dy = abs(dx) // 2
        set_pixel(g, 15 + dx, 15 - dy, MV)
        set_pixel(g, 15 + dx, 15 + dy, MV)
    # Eye fill
    for dx in range(-6, 7):
        dy = max(1, abs(dx) // 2)
        for y in range(15 - dy + 1, 15 + dy):
            set_pixel(g, 15 + dx, y, MP)
    # Pupil
    draw_circle_filled(g, 15, 15, 3, SG)
    draw_circle_filled(g, 15, 15, 1, NW)
    # Highlight
    set_pixel(g, 14, 14, PY)
    # Arcane rays from top and bottom of eye
    for i in range(3):
        set_pixel(g, 15, 5 + i, SG)
        set_pixel(g, 15, 24 - i, SG)
    # Corner runes (small dots)
    for cx, cy in [(6, 6), (24, 6), (6, 24), (24, 24)]:
        set_pixel(g, cx, cy, MV)
    return g


def gen_emblem_shadow():
    """Shadow Clan emblem: crossed daggers on dark field."""
    g = blank(32, 32)
    # Dark diamond background
    draw_diamond(g, 15, 15, 13, DK)
    draw_diamond_outline(g, 15, 15, 13, K)
    draw_diamond(g, 15, 15, 11, K)
    # First dagger (top-left to bottom-right)
    for i in range(18):
        x = 6 + i
        y = 6 + i
        set_pixel(g, x, y, LS)
        if i < 4:
            set_pixel(g, x + 1, y, ER)
        elif i > 14:
            set_pixel(g, x, y, BR)
    # Second dagger (top-right to bottom-left)
    for i in range(18):
        x = 24 - i
        y = 6 + i
        set_pixel(g, x, y, LS)
        if i < 4:
            set_pixel(g, x - 1, y, ER)
        elif i > 14:
            set_pixel(g, x, y, BR)
    # Center gem
    draw_circle_filled(g, 15, 15, 2, BR)
    set_pixel(g, 15, 15, FR)
    set_pixel(g, 14, 14, EM)
    # Guard crossbars
    draw_line_h(g, 12, 13, 3, LS)
    draw_line_h(g, 17, 13, 3, LS)
    draw_line_h(g, 12, 17, 3, LS)
    draw_line_h(g, 17, 17, 3, LS)
    return g


def gen_emblem_nature():
    """Nature Wardens emblem: oak leaf/tree within circular vine border."""
    g = blank(32, 32)
    # Vine circle border
    draw_circle_filled(g, 15, 15, 13, FG)
    draw_circle_outline(g, 15, 15, 13, DF)
    draw_circle_filled(g, 15, 15, 11, DF)
    # Tree trunk
    draw_rect(g, 14, 16, 3, 8, BN)
    set_pixel(g, 13, 23, BN)
    set_pixel(g, 17, 23, BN)
    # Root detail
    set_pixel(g, 12, 24, DT)
    set_pixel(g, 18, 24, DT)
    # Tree canopy (layered triangles for a stylized tree)
    # Bottom layer
    draw_triangle_up(g, 15, 12, 5, LG)
    # Middle layer
    draw_triangle_up(g, 15, 9, 5, BG)
    # Top layer
    draw_triangle_up(g, 15, 6, 4, FL)
    # Trunk visible behind
    set_pixel(g, 15, 16, DT)
    # Small leaf accents on vine border
    for cx, cy in [(5, 10), (25, 10), (5, 20), (25, 20)]:
        set_pixel(g, cx, cy, LG)
        set_pixel(g, cx, cy - 1, BG)
    return g


# ─── 2. NPC faction indicator icons (16×16) ─────────────────────────────────

def gen_indicator(faction_key):
    """Small faction badge shown above NPC heads — simplified emblem shape."""
    c = FACTION_COLORS[faction_key]
    g = blank(16, 16)
    # Shield shape background
    draw_rect(g, 3, 2, 10, 8, c['primary'])
    # Rounded bottom of shield
    draw_line_h(g, 4, 10, 8, c['primary'])
    draw_line_h(g, 5, 11, 6, c['primary'])
    draw_line_h(g, 6, 12, 4, c['primary'])
    draw_line_h(g, 7, 13, 2, c['primary'])
    # Outline
    draw_line_h(g, 3, 1, 10, c['dark'])
    draw_line_h(g, 3, 2, 1, c['dark'])
    draw_line_h(g, 12, 2, 1, c['dark'])
    draw_line_v(g, 2, 2, 8, c['dark'])
    draw_line_v(g, 13, 2, 8, c['dark'])
    set_pixel(g, 3, 10, c['dark'])
    set_pixel(g, 12, 10, c['dark'])
    set_pixel(g, 4, 11, c['dark'])
    set_pixel(g, 11, 11, c['dark'])
    set_pixel(g, 5, 12, c['dark'])
    set_pixel(g, 10, 12, c['dark'])
    set_pixel(g, 6, 13, c['dark'])
    set_pixel(g, 9, 13, c['dark'])
    set_pixel(g, 7, 14, c['dark'])
    set_pixel(g, 8, 14, c['dark'])
    # Inner detail varies by faction
    if faction_key == 'merchants':
        # Small coin
        draw_circle_filled(g, 7, 7, 2, YL)
        set_pixel(g, 7, 7, DG)
    elif faction_key == 'mages':
        # Small eye
        set_pixel(g, 6, 7, SG)
        set_pixel(g, 7, 7, NW)
        set_pixel(g, 8, 7, SG)
        set_pixel(g, 7, 6, MV)
        set_pixel(g, 7, 8, MV)
    elif faction_key == 'shadow':
        # Small dagger
        draw_line_v(g, 7, 4, 7, LS)
        draw_line_h(g, 6, 7, 3, LS)
        set_pixel(g, 7, 4, NW)
    elif faction_key == 'nature':
        # Small leaf
        set_pixel(g, 7, 5, FL)
        set_pixel(g, 6, 6, BG)
        set_pixel(g, 7, 6, LG)
        set_pixel(g, 8, 6, BG)
        set_pixel(g, 7, 7, FG)
        set_pixel(g, 6, 7, LG)
        set_pixel(g, 8, 7, LG)
        set_pixel(g, 7, 8, BN)  # stem
        set_pixel(g, 7, 9, BN)
    return g


# ─── 3. Reputation tier badges (16×16) ───────────────────────────────────────

def gen_tier_hostile():
    """Hostile tier: broken red shield."""
    g = blank(16, 16)
    # Left half of broken shield
    draw_rect(g, 3, 3, 4, 6, ER)
    draw_line_h(g, 4, 9, 3, ER)
    draw_line_h(g, 5, 10, 2, ER)
    # Right half offset (broken)
    draw_rect(g, 9, 4, 4, 6, ER)
    draw_line_h(g, 9, 10, 3, ER)
    draw_line_h(g, 10, 11, 2, ER)
    # Crack line between halves
    set_pixel(g, 7, 3, BR)
    set_pixel(g, 8, 5, BR)
    set_pixel(g, 7, 7, BR)
    set_pixel(g, 8, 9, BR)
    # Outlines
    draw_rect_outline(g, 3, 3, 4, 6, DB)
    draw_rect_outline(g, 9, 4, 4, 6, DB)
    # X mark
    set_pixel(g, 5, 5, BR)
    set_pixel(g, 6, 6, BR)
    set_pixel(g, 6, 5, BR)
    set_pixel(g, 5, 6, BR)
    set_pixel(g, 11, 6, BR)
    set_pixel(g, 12, 7, BR)
    set_pixel(g, 12, 6, BR)
    set_pixel(g, 11, 7, BR)
    return g


def gen_tier_unfriendly():
    """Unfriendly tier: orange frown face on dark bg."""
    g = blank(16, 16)
    draw_circle_filled(g, 7, 7, 6, DK)
    draw_circle_outline(g, 7, 7, 6, K)
    # Frown eyes
    set_pixel(g, 5, 5, FR)
    set_pixel(g, 9, 5, FR)
    # Frown mouth
    set_pixel(g, 5, 9, FR)
    draw_line_h(g, 6, 10, 3, FR)
    set_pixel(g, 9, 9, FR)
    return g


def gen_tier_neutral():
    """Neutral tier: gray circle with flat line mouth."""
    g = blank(16, 16)
    draw_circle_filled(g, 7, 7, 6, ST)
    draw_circle_outline(g, 7, 7, 6, K)
    # Neutral eyes
    set_pixel(g, 5, 5, MG)
    set_pixel(g, 9, 5, MG)
    # Flat mouth
    draw_line_h(g, 5, 9, 5, MG)
    return g


def gen_tier_friendly():
    """Friendly tier: blue shield with check mark."""
    g = blank(16, 16)
    # Shield shape
    draw_rect(g, 3, 2, 10, 8, SB)
    draw_line_h(g, 4, 10, 8, SB)
    draw_line_h(g, 5, 11, 6, SB)
    draw_line_h(g, 6, 12, 4, SB)
    draw_line_h(g, 7, 13, 2, SB)
    draw_rect_outline(g, 3, 2, 10, 8, DP)
    # Checkmark
    set_pixel(g, 5, 7, PB)
    set_pixel(g, 6, 8, PB)
    set_pixel(g, 7, 9, PB)
    set_pixel(g, 8, 8, HB)
    set_pixel(g, 9, 7, HB)
    set_pixel(g, 10, 6, HB)
    return g


def gen_tier_honored():
    """Honored tier: gold star badge."""
    g = blank(16, 16)
    # Star shape
    star_pixels = [
        (7, 1), (8, 1),
        (7, 2), (8, 2),
        (6, 3), (7, 3), (8, 3), (9, 3),
        (5, 4), (6, 4), (7, 4), (8, 4), (9, 4), (10, 4),
        (1, 5), (2, 5), (3, 5), (4, 5), (5, 5), (6, 5), (7, 5),
        (8, 5), (9, 5), (10, 5), (11, 5), (12, 5), (13, 5), (14, 5),
        (3, 6), (4, 6), (5, 6), (6, 6), (7, 6), (8, 6), (9, 6), (10, 6), (11, 6), (12, 6),
        (4, 7), (5, 7), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7), (11, 7),
        (4, 8), (5, 8), (6, 8), (7, 8), (8, 8), (9, 8), (10, 8), (11, 8),
        (3, 9), (4, 9), (5, 9), (6, 9), (7, 9), (8, 9), (9, 9), (10, 9), (11, 9), (12, 9),
        (3, 10), (4, 10), (5, 10), (10, 10), (11, 10), (12, 10),
        (2, 11), (3, 11), (4, 11), (11, 11), (12, 11), (13, 11),
        (1, 12), (2, 12), (3, 12), (12, 12), (13, 12), (14, 12),
    ]
    for px, py in star_pixels:
        set_pixel(g, px, py, GD)
    # Gold highlight on left points
    set_pixel(g, 7, 2, YL)
    set_pixel(g, 8, 2, YL)
    set_pixel(g, 7, 3, YL)
    # Center gem
    set_pixel(g, 7, 7, PY)
    set_pixel(g, 8, 7, PY)
    # Outline key points
    set_pixel(g, 7, 0, DG)
    set_pixel(g, 8, 0, DG)
    set_pixel(g, 0, 5, DG)
    set_pixel(g, 15, 5, DG)
    set_pixel(g, 0, 12, DG)
    set_pixel(g, 15, 12, DG)
    return g


def gen_tier_exalted():
    """Exalted tier: radiant golden crown with halo."""
    g = blank(16, 16)
    # Halo glow
    draw_circle_filled(g, 7, 7, 7, PS)
    draw_circle_filled(g, 7, 7, 5, DS)
    # Crown shape
    draw_rect(g, 3, 7, 10, 5, GD)
    # Crown points
    set_pixel(g, 3, 5, GD)
    set_pixel(g, 3, 6, GD)
    set_pixel(g, 7, 4, GD)
    set_pixel(g, 7, 5, GD)
    set_pixel(g, 8, 4, GD)
    set_pixel(g, 8, 5, GD)
    set_pixel(g, 12, 5, GD)
    set_pixel(g, 12, 6, GD)
    set_pixel(g, 5, 6, GD)
    set_pixel(g, 10, 6, GD)
    # Crown gems
    set_pixel(g, 5, 8, BR)
    set_pixel(g, 7, 8, MV)
    set_pixel(g, 8, 8, MV)
    set_pixel(g, 10, 8, SB)
    # Crown highlights
    set_pixel(g, 4, 7, YL)
    set_pixel(g, 7, 5, YL)
    set_pixel(g, 11, 7, YL)
    # Crown base line
    draw_line_h(g, 3, 12, 10, DG)
    # Outline
    draw_rect_outline(g, 3, 7, 10, 5, DG)
    return g


# ─── 4. Rep change notification sprites (32×16) ─────────────────────────────

def gen_rep_change_positive():
    """Green upward arrow with '+' glow."""
    g = blank(32, 16)
    # Background pill shape
    draw_rect(g, 2, 3, 28, 10, DF)
    draw_line_h(g, 3, 2, 26, DF)
    draw_line_h(g, 3, 13, 26, DF)
    # Border
    draw_line_h(g, 3, 1, 26, K)
    draw_line_h(g, 3, 14, 26, K)
    draw_line_v(g, 1, 3, 10, K)
    draw_line_v(g, 30, 3, 10, K)
    set_pixel(g, 2, 2, K)
    set_pixel(g, 29, 2, K)
    set_pixel(g, 2, 13, K)
    set_pixel(g, 29, 13, K)
    # Up arrow
    draw_triangle_up(g, 8, 4, 4, BG)
    draw_line_v(g, 8, 8, 4, BG)
    set_pixel(g, 8, 4, FL)
    # Plus sign
    draw_line_h(g, 14, 7, 5, LG)
    draw_line_v(g, 16, 5, 5, LG)
    set_pixel(g, 16, 7, FL)
    # "Rep" text area — simplified as dots to suggest text
    set_pixel(g, 22, 6, BG)
    set_pixel(g, 23, 6, BG)
    set_pixel(g, 22, 7, BG)
    set_pixel(g, 24, 7, BG)
    set_pixel(g, 25, 7, BG)
    set_pixel(g, 22, 8, BG)
    set_pixel(g, 23, 8, BG)
    set_pixel(g, 24, 8, BG)
    set_pixel(g, 25, 8, BG)
    return g


def gen_rep_change_negative():
    """Red downward arrow with '-' indicator."""
    g = blank(32, 16)
    # Background pill shape
    draw_rect(g, 2, 3, 28, 10, DB)
    draw_line_h(g, 3, 2, 26, DB)
    draw_line_h(g, 3, 13, 26, DB)
    # Border
    draw_line_h(g, 3, 1, 26, K)
    draw_line_h(g, 3, 14, 26, K)
    draw_line_v(g, 1, 3, 10, K)
    draw_line_v(g, 30, 3, 10, K)
    set_pixel(g, 2, 2, K)
    set_pixel(g, 29, 2, K)
    set_pixel(g, 2, 13, K)
    set_pixel(g, 29, 13, K)
    # Down arrow (inverted triangle)
    draw_line_v(g, 8, 4, 4, BR)
    for row in range(4):
        y = 8 + row
        half_w = 3 - row
        for dx in range(-half_w, half_w + 1):
            set_pixel(g, 8 + dx, y, BR)
    set_pixel(g, 8, 11, ER)
    # Minus sign
    draw_line_h(g, 14, 7, 5, ER)
    set_pixel(g, 16, 7, BR)
    # "Rep" area — dot pattern
    set_pixel(g, 22, 6, ER)
    set_pixel(g, 23, 6, ER)
    set_pixel(g, 22, 7, ER)
    set_pixel(g, 24, 7, ER)
    set_pixel(g, 25, 7, ER)
    set_pixel(g, 22, 8, ER)
    set_pixel(g, 23, 8, ER)
    set_pixel(g, 24, 8, ER)
    set_pixel(g, 25, 8, ER)
    return g


# ─── 5. Reputation bar sprites ──────────────────────────────────────────────

def gen_rep_bar_bg():
    """Empty reputation bar background (100×8)."""
    g = blank(100, 8)
    # Dark inset border
    draw_rect(g, 0, 0, 100, 8, DK)
    draw_rect(g, 1, 1, 98, 6, K)
    # Inner groove lines
    draw_line_h(g, 1, 1, 98, ST)
    draw_line_h(g, 1, 6, 98, DK)
    return g


def gen_rep_bar_fill(faction_key):
    """Faction-colored reputation bar fill (100×8). Fully filled state."""
    c = FACTION_COLORS[faction_key]
    g = blank(100, 8)
    # Border
    draw_rect(g, 0, 0, 100, 8, c['dark'])
    # Fill gradient: dark at bottom, bright at top
    draw_rect(g, 1, 1, 98, 6, c['secondary'])
    draw_rect(g, 1, 2, 98, 3, c['primary'])
    draw_line_h(g, 1, 2, 98, c['highlight'])
    # Segment markers every 16px (6 tiers across 100px)
    for seg_x in [16, 33, 50, 66, 83]:
        draw_line_v(g, seg_x, 1, 6, c['dark'])
    return g


# ─── 6. Reputation panel (220×200) ──────────────────────────────────────────

def gen_panel_faction_reputation():
    """Main faction reputation UI panel frame."""
    g = blank(220, 200)
    # Outer frame
    draw_rect(g, 0, 0, 220, 200, DK)
    draw_rect_outline(g, 0, 0, 220, 200, K)
    # Inner background
    draw_rect(g, 2, 2, 216, 196, ST)
    draw_rect(g, 4, 4, 212, 192, DK)
    # Title bar area
    draw_rect(g, 4, 4, 212, 18, BD)
    draw_rect_outline(g, 4, 4, 212, 18, K)
    # Title "FACTIONS" — represented as pixel dots (stylized text)
    title_dots = [
        # F
        (20, 9), (20, 10), (20, 11), (20, 12), (20, 13), (20, 14),
        (21, 9), (22, 9), (23, 9),
        (21, 11), (22, 11),
        # A
        (26, 14), (26, 13), (26, 12), (26, 11), (26, 10),
        (27, 9), (28, 9),
        (29, 10), (29, 11), (29, 12), (29, 13), (29, 14),
        (27, 12), (28, 12),
        # C
        (32, 10), (32, 11), (32, 12), (32, 13),
        (33, 9), (34, 9),
        (33, 14), (34, 14),
        # T
        (37, 9), (38, 9), (39, 9), (40, 9), (41, 9),
        (39, 10), (39, 11), (39, 12), (39, 13), (39, 14),
        # I
        (44, 9), (44, 10), (44, 11), (44, 12), (44, 13), (44, 14),
        # O
        (47, 10), (47, 11), (47, 12), (47, 13),
        (48, 9), (49, 9),
        (50, 10), (50, 11), (50, 12), (50, 13),
        (48, 14), (49, 14),
        # N
        (53, 9), (53, 10), (53, 11), (53, 12), (53, 13), (53, 14),
        (54, 10), (55, 11), (56, 12),
        (57, 9), (57, 10), (57, 11), (57, 12), (57, 13), (57, 14),
        # S
        (60, 10), (61, 9), (62, 9),
        (60, 11), (61, 12), (62, 12),
        (62, 13), (61, 14), (60, 14),
    ]
    for px, py in title_dots:
        set_pixel(g, px, py, GD)

    # Close button (X) in top-right
    for i in range(5):
        set_pixel(g, 205 + i, 7 + i, ER)
        set_pixel(g, 209 - i, 7 + i, ER)

    # Four faction rows, each ~40px tall
    factions = [
        ('merchants', 'Merchants Guild', FACTION_COLORS['merchants']),
        ('mages',     'Mages Circle',    FACTION_COLORS['mages']),
        ('shadow',    'Shadow Clan',      FACTION_COLORS['shadow']),
        ('nature',    'Nature Wardens',   FACTION_COLORS['nature']),
    ]

    y_start = 26
    row_h = 40

    for idx, (key, name, colors) in enumerate(factions):
        ry = y_start + idx * row_h

        # Row background
        bg_shade = K if idx % 2 == 0 else DK
        draw_rect(g, 6, ry, 208, row_h - 2, bg_shade)

        # Faction emblem placeholder (32×32 area outlined)
        draw_rect_outline(g, 10, ry + 3, 32, 32, colors['primary'])
        draw_rect(g, 11, ry + 4, 30, 30, colors['dark'])
        # Small faction symbol in center
        draw_circle_filled(g, 26, ry + 19, 6, colors['primary'])
        draw_circle_filled(g, 26, ry + 19, 3, colors['highlight'])

        # Faction name dots (simplified text representation)
        for i in range(min(len(name), 16)):
            set_pixel(g, 48 + i * 3, ry + 6, colors['primary'])
            set_pixel(g, 49 + i * 3, ry + 6, colors['primary'])

        # Rep bar background
        draw_rect(g, 48, ry + 14, 100, 8, K)
        draw_rect(g, 49, ry + 15, 98, 6, DK)
        # Rep bar fill (partial — show different amounts per faction)
        fill_w = [65, 40, 20, 80][idx]
        draw_rect(g, 49, ry + 15, fill_w, 6, colors['secondary'])
        draw_rect(g, 49, ry + 16, fill_w, 3, colors['primary'])
        draw_line_h(g, 49, ry + 16, fill_w, colors['highlight'])

        # Tier markers on bar
        for seg in [16, 33, 50, 66, 83]:
            draw_line_v(g, 48 + seg, ry + 14, 8, ST)

        # Current tier label area (right of bar)
        draw_rect(g, 154, ry + 14, 52, 8, ST)
        draw_rect_outline(g, 154, ry + 14, 52, 8, MG)
        # Tier indicator dots
        for i in range(6):
            c_dot = colors['primary'] if i <= [3, 2, 1, 4][idx] else MG
            set_pixel(g, 158 + i * 8, ry + 18, c_dot)

        # Separator line
        draw_line_h(g, 6, ry + row_h - 2, 208, ST)

    # Bottom info area
    bottom_y = y_start + 4 * row_h + 2
    draw_rect(g, 6, bottom_y, 208, 30, K)
    draw_rect_outline(g, 6, bottom_y, 208, 30, ST)

    # Info label dots
    for i in range(20):
        set_pixel(g, 12 + i * 3, bottom_y + 6, MG)

    # Decorative corner pixels
    for cx, cy in [(6, bottom_y), (213, bottom_y),
                   (6, bottom_y + 29), (213, bottom_y + 29)]:
        set_pixel(g, cx, cy, GD)

    return g


# ─── Generate all assets ────────────────────────────────────────────────────

def main():
    print('Generating faction system art assets (PIX-95)...\n')

    # 1. Faction emblems (32×32)
    print('Faction emblems (32x32):')
    write_png(os.path.join(ART_ICONS, 'icon_faction_emblem_merchants.png'),
              gen_emblem_merchants())
    write_png(os.path.join(ART_ICONS, 'icon_faction_emblem_mages.png'),
              gen_emblem_mages())
    write_png(os.path.join(ART_ICONS, 'icon_faction_emblem_shadow.png'),
              gen_emblem_shadow())
    write_png(os.path.join(ART_ICONS, 'icon_faction_emblem_nature.png'),
              gen_emblem_nature())

    # 2. NPC faction indicator icons (16×16)
    print('\nNPC faction indicators (16x16):')
    for fk in FACTION_COLORS:
        write_png(os.path.join(ART_ICONS, f'icon_faction_indicator_{fk}.png'),
                  gen_indicator(fk))

    # 3. Reputation tier badges (16×16)
    print('\nReputation tier badges (16x16):')
    write_png(os.path.join(ART_ICONS, 'icon_rep_tier_hostile.png'),
              gen_tier_hostile())
    write_png(os.path.join(ART_ICONS, 'icon_rep_tier_unfriendly.png'),
              gen_tier_unfriendly())
    write_png(os.path.join(ART_ICONS, 'icon_rep_tier_neutral.png'),
              gen_tier_neutral())
    write_png(os.path.join(ART_ICONS, 'icon_rep_tier_friendly.png'),
              gen_tier_friendly())
    write_png(os.path.join(ART_ICONS, 'icon_rep_tier_honored.png'),
              gen_tier_honored())
    write_png(os.path.join(ART_ICONS, 'icon_rep_tier_exalted.png'),
              gen_tier_exalted())

    # 4. Rep change notification sprites (32×16)
    print('\nRep change notifications (32x16):')
    write_png(os.path.join(ART_FACTION, 'ui_rep_change_positive.png'),
              gen_rep_change_positive())
    write_png(os.path.join(ART_FACTION, 'ui_rep_change_negative.png'),
              gen_rep_change_negative())

    # 5. Reputation bar sprites
    print('\nReputation bar sprites:')
    write_png(os.path.join(ART_FACTION, 'ui_rep_bar_bg.png'),
              gen_rep_bar_bg())
    for fk in FACTION_COLORS:
        write_png(os.path.join(ART_FACTION, f'ui_rep_bar_{fk}.png'),
                  gen_rep_bar_fill(fk))

    # 6. Reputation panel (220×200)
    print('\nReputation panel (220x200):')
    write_png(os.path.join(ART_FACTION, 'ui_panel_faction_reputation.png'),
              gen_panel_faction_reputation())

    print('\nDone! All faction system art assets generated.')


if __name__ == '__main__':
    main()
