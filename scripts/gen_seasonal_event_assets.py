#!/usr/bin/env python3
"""
Generate seasonal event art assets for PixelRealm (PIX-159).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md exactly:
  - 32-color master palette, SNES-era RPG style
  - Nearest-neighbor pixel art, no anti-aliasing
  - Naming convention: {category}_{name}_{variant}.{ext}

Outputs:
  -- Event Banners (128×48 each) --
  assets/ui/seasonal/ui_seasonal_banner_winter.png
  assets/ui/seasonal/ui_seasonal_banner_harvest.png
  assets/ui/seasonal/ui_seasonal_banner_spring.png
  assets/ui/seasonal/ui_seasonal_banner_summer.png

  -- Progress Tracker Frame --
  assets/ui/seasonal/ui_seasonal_progress_frame.png     (128×16)

  -- Seasonal Decoration Tilesets (128×32, 8×2 tiles of 16×16) --
  assets/tiles/tilesets/tileset_seasonal_winter.png
  assets/tiles/tilesets/tileset_seasonal_harvest.png

  -- Exclusive Seasonal Reward Sprites (16×16 each) --
  assets/sprites/pickups/icon_reward_winter_crown.png
  assets/sprites/pickups/icon_reward_harvest_cape.png
  assets/sprites/pickups/icon_reward_spring_staff.png
  assets/sprites/pickups/icon_reward_summer_shield.png

  -- Seasonal Reward Sheet --
  assets/ui/seasonal/ui_seasonal_rewards_sheet.png      (64×16)

  -- Seasonal Badge/Title Icons (16×16 each + combined sheet) --
  assets/ui/icons/icon_badge_winter.png
  assets/ui/icons/icon_badge_harvest.png
  assets/ui/icons/icon_badge_spring.png
  assets/ui/icons/icon_badge_summer.png
  assets/ui/seasonal/ui_seasonal_badges_sheet.png       (64×16)

  -- Event Quest Marker --
  assets/ui/icons/icon_quest_seasonal.png               (16×16)

  -- Seasonal NPC Costume Overlays (16×10 head accessories) --
  assets/sprites/characters/char_overlay_hat_winter.png
  assets/sprites/characters/char_overlay_hat_harvest.png
  assets/sprites/characters/char_overlay_hat_spring.png
  assets/sprites/characters/char_overlay_hat_summer.png
  assets/sprites/characters/char_overlay_hats_sheet.png (64×10)
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
PROJ_DIR = os.path.join(SCRIPT_DIR, '..')

# Output directories
SEASONAL_UI_DIR = os.path.join(PROJ_DIR, 'assets', 'ui', 'seasonal')
TILESET_DIR = os.path.join(PROJ_DIR, 'assets', 'tiles', 'tilesets')
PICKUP_DIR = os.path.join(PROJ_DIR, 'assets', 'sprites', 'pickups')
ICON_DIR = os.path.join(PROJ_DIR, 'assets', 'ui', 'icons')
CHAR_DIR = os.path.join(PROJ_DIR, 'assets', 'sprites', 'characters')

for d in [SEASONAL_UI_DIR, TILESET_DIR, PICKUP_DIR, ICON_DIR, CHAR_DIR]:
    os.makedirs(d, exist_ok=True)

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
DT  = (139, 92,  42,  255)  # dirt
SN  = (184, 132, 63,  255)  # sand
DS  = (212, 168, 90,  255)  # desert gold
PS  = (232, 208, 138, 255)  # pale sand

# Greens
DF  = (26,  58,  26,  255)  # deep forest
FG  = (45,  110, 45,  255)  # forest green
LG  = (76,  155, 76,  255)  # leaf green
BG  = (120, 200, 120, 255)  # bright grass
FL  = (168, 228, 160, 255)  # light foliage

# Cyan / blue
OC  = (10,  26,  58,  255)  # deep ocean
DP  = (26,  74,  138, 255)  # ocean blue
SB  = (42,  122, 192, 255)  # sky blue
PB  = (80,  168, 232, 255)  # player blue
HB  = (144, 208, 248, 255)  # ice / pale water
IW  = (200, 240, 255, 255)  # ice white / shimmer

# Red / orange
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

# ─── Seasonal color themes ───────────────────────────────────────────────────
# Each season: (outline, dark, mid, light, highlight, accent)
SEASON_PALETTES = {
    'winter':  (OC, DP, SB, HB, IW, NW),    # cool icy blues
    'harvest': (BD, BN, DT, DS, EM, FG),     # warm earth + green accent
    'spring':  (DF, FG, LG, BG, FL, SG),     # fresh greens + spell glow accent
    'summer':  (BD, DG, GD, YL, PY, FR),     # warm golds + fire orange accent
}

SEASON_NAMES = ['winter', 'harvest', 'spring', 'summer']

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

def set_px(grid, x, y, color):
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color

def fill_rect(grid, x, y, w, h, color):
    for dy in range(h):
        for dx in range(w):
            set_px(grid, x + dx, y + dy, color)

def draw_rect_outline(grid, x, y, w, h, color):
    for dx in range(w):
        set_px(grid, x + dx, y, color)
        set_px(grid, x + dx, y + h - 1, color)
    for dy in range(h):
        set_px(grid, x, y + dy, color)
        set_px(grid, x + w - 1, y + dy, color)

def hstack(frames):
    """Horizontally stack list of same-height pixel grids."""
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result

def vstack(frames):
    """Vertically stack list of same-width pixel grids."""
    result = []
    for f in frames:
        result.extend([row[:] for row in f])
    return result

def overlay(dst, src, x_off, y_off):
    for r, row in enumerate(src):
        dr = r + y_off
        if dr < 0 or dr >= len(dst):
            continue
        for c, px in enumerate(row):
            dc = c + x_off
            if dc < 0 or dc >= len(dst[dr]):
                continue
            if px[3] > 0:
                dst[dr][dc] = px
    return dst

def draw_diamond(grid, cx, cy, radius, color):
    """Draw a filled diamond shape centered at (cx, cy)."""
    for dy in range(-radius, radius + 1):
        span = radius - abs(dy)
        for dx in range(-span, span + 1):
            set_px(grid, cx + dx, cy + dy, color)

def draw_circle_outline(grid, cx, cy, r, color):
    """Draw a rough circle outline using midpoint algorithm."""
    x, y = r, 0
    d = 1 - r
    while x >= y:
        for sx, sy in [(x, y), (y, x), (-x, y), (-y, x),
                        (x, -y), (y, -x), (-x, -y), (-y, -x)]:
            set_px(grid, cx + sx, cy + sy, color)
        y += 1
        if d < 0:
            d += 2 * y + 1
        else:
            x -= 1
            d += 2 * (y - x) + 1

def draw_star(grid, cx, cy, color_outer, color_inner):
    """Draw a small 5-point star shape (approx 7x7)."""
    # Simplified pixel star pattern
    star_pattern = [
        [_, _, _, color_outer, _, _, _],
        [_, _, color_outer, color_inner, color_outer, _, _],
        [color_outer, color_inner, color_inner, color_inner, color_inner, color_inner, color_outer],
        [_, color_outer, color_inner, color_inner, color_inner, color_outer, _],
        [_, color_outer, color_inner, color_inner, color_inner, color_outer, _],
        [color_outer, color_inner, color_outer, _, color_outer, color_inner, color_outer],
        [color_outer, _, _, _, _, _, color_outer],
    ]
    overlay(grid, star_pattern, cx - 3, cy - 3)

# ═══════════════════════════════════════════════════════════════════════════════
# 1. SEASONAL EVENT BANNERS (128×48 each)
# ═══════════════════════════════════════════════════════════════════════════════
print('\n=== Seasonal Event Banners (128x48) ===')

def make_snowflake(color_out, color_in):
    """6×6 snowflake pattern."""
    o, i = color_out, color_in
    return [
        [_, _, o, o, _, _],
        [_, o, i, i, o, _],
        [o, i, i, i, i, o],
        [o, i, i, i, i, o],
        [_, o, i, i, o, _],
        [_, _, o, o, _, _],
    ]

def make_leaf(color_dk, color_lt):
    """5×5 leaf pattern."""
    d, l = color_dk, color_lt
    return [
        [_, _, d, _, _],
        [_, d, l, d, _],
        [d, l, l, l, d],
        [_, d, l, d, _],
        [_, _, d, _, _],
    ]

def make_flower(color_center, color_petal):
    """5×5 flower pattern."""
    c, p = color_center, color_petal
    return [
        [_, p, _, p, _],
        [p, p, p, p, p],
        [_, p, c, p, _],
        [p, p, p, p, p],
        [_, p, _, p, _],
    ]

def make_sun_mini(color_out, color_in):
    """7×7 mini sun."""
    o, i = color_out, color_in
    return [
        [_, _, o, _, o, _, _],
        [_, _, _, o, _, _, _],
        [o, _, o, i, o, _, o],
        [_, o, i, i, i, o, _],
        [o, _, o, i, o, _, o],
        [_, _, _, o, _, _, _],
        [_, _, o, _, o, _, _],
    ]

def make_banner(season_name, pal):
    """Generate a 128×48 seasonal event banner."""
    out, dk, md, lt, hi, acc = pal
    img = blank(128, 48)

    # Background fill — gradient from dark to mid
    fill_rect(img, 0, 0, 128, 48, dk)
    fill_rect(img, 2, 2, 124, 44, md)
    fill_rect(img, 4, 4, 120, 40, dk)

    # Ornate border
    draw_rect_outline(img, 0, 0, 128, 48, out)
    draw_rect_outline(img, 1, 1, 126, 46, lt)
    # Corner decorations
    for cx, cy in [(3, 3), (124, 3), (3, 44), (124, 44)]:
        set_px(img, cx, cy, hi)
        set_px(img, cx - 1, cy, acc)
        set_px(img, cx + 1, cy, acc)
        set_px(img, cx, cy - 1, acc)
        set_px(img, cx, cy + 1, acc)

    # Inner panel background
    fill_rect(img, 6, 6, 116, 36, md)
    draw_rect_outline(img, 6, 6, 116, 36, lt)

    # Season-specific decorative motifs
    if season_name == 'winter':
        # Snowflakes scattered
        sf = make_snowflake(HB, IW)
        overlay(img, sf, 10, 10)
        overlay(img, sf, 110, 10)
        overlay(img, sf, 10, 32)
        overlay(img, sf, 110, 32)
        # Ice crystals on bottom border
        for x in range(20, 108, 12):
            set_px(img, x, 40, IW)
            set_px(img, x + 1, 39, HB)
            set_px(img, x - 1, 39, HB)
            set_px(img, x, 38, PB)
    elif season_name == 'harvest':
        # Wheat/sheaves on sides
        lf = make_leaf(DT, DS)
        overlay(img, lf, 10, 12)
        overlay(img, lf, 10, 28)
        overlay(img, lf, 112, 12)
        overlay(img, lf, 112, 28)
        # Pumpkin-like dots along bottom
        for x in range(20, 108, 10):
            fill_rect(img, x, 38, 3, 3, FR)
            set_px(img, x + 1, 37, FG)
    elif season_name == 'spring':
        # Flowers scattered
        fl = make_flower(YL, SG)
        overlay(img, fl, 10, 12)
        overlay(img, fl, 112, 12)
        fl2 = make_flower(PY, FL)
        overlay(img, fl2, 10, 30)
        overlay(img, fl2, 112, 30)
        # Vine dots along bottom
        for x in range(20, 108, 6):
            set_px(img, x, 39, LG)
            set_px(img, x + 1, 38, BG)
    elif season_name == 'summer':
        # Mini suns
        sun = make_sun_mini(GD, YL)
        overlay(img, sun, 9, 11)
        overlay(img, sun, 112, 11)
        # Wave pattern along bottom
        for x in range(20, 108, 8):
            set_px(img, x, 39, SB)
            set_px(img, x + 1, 38, PB)
            set_px(img, x + 2, 39, SB)
            set_px(img, x + 3, 40, PB)

    # Title area — central text placeholder (horizontal line bar)
    fill_rect(img, 24, 18, 80, 2, hi)
    fill_rect(img, 28, 22, 72, 6, lt)
    draw_rect_outline(img, 28, 22, 72, 6, out)
    fill_rect(img, 24, 30, 80, 2, hi)

    # "EVENT" indicator — small highlight accent rectangle
    fill_rect(img, 44, 10, 40, 5, acc)
    draw_rect_outline(img, 44, 10, 40, 5, out)
    # Small dots inside the event label
    for x in range(48, 80, 4):
        set_px(img, x, 12, hi)

    return img

for name in SEASON_NAMES:
    pal = SEASON_PALETTES[name]
    banner = make_banner(name, pal)
    write_png(os.path.join(SEASONAL_UI_DIR, f'ui_seasonal_banner_{name}.png'), banner)

# ═══════════════════════════════════════════════════════════════════════════════
# 2. PROGRESS TRACKER FRAME (128×16)
# ═══════════════════════════════════════════════════════════════════════════════
print('\n=== Progress Tracker Frame (128x16) ===')

img = blank(128, 16)
# Outer border
draw_rect_outline(img, 0, 0, 128, 16, K)
draw_rect_outline(img, 1, 1, 126, 14, ST)
# Inner fill — dark panel
fill_rect(img, 2, 2, 124, 12, DK)
# Progress bar track
fill_rect(img, 4, 5, 120, 6, K)
draw_rect_outline(img, 4, 5, 120, 6, ST)
# Segment markers (every 12px = ~10 segments)
for x in range(16, 120, 12):
    fill_rect(img, x, 5, 1, 6, MG)
# Star markers at key milestones (25%, 50%, 75%, 100%)
for x_pos in [34, 64, 94, 122]:
    set_px(img, x_pos, 3, GD)
    set_px(img, x_pos - 1, 4, YL)
    set_px(img, x_pos + 1, 4, YL)
    set_px(img, x_pos, 13, GD)

write_png(os.path.join(SEASONAL_UI_DIR, 'ui_seasonal_progress_frame.png'), img)

# ═══════════════════════════════════════════════════════════════════════════════
# 3. SEASONAL DECORATION TILESETS (128×32 = 8×2 grid of 16×16 tiles)
# ═══════════════════════════════════════════════════════════════════════════════
print('\n=== Seasonal Decoration Tilesets (128x32) ===')

def make_winter_tileset():
    """8×2 grid of winter frost decoration tiles (128×32)."""
    tiles = []

    # Tile 0: Frost overlay — scattered ice crystals on transparent
    t = blank(16, 16)
    for pos in [(3, 2), (10, 5), (6, 11), (13, 8), (1, 14), (9, 1)]:
        set_px(t, pos[0], pos[1], IW)
        set_px(t, pos[0] + 1, pos[1], HB)
        set_px(t, pos[0], pos[1] + 1, HB)
    tiles.append(t)

    # Tile 1: Snow pile — bottom accumulation
    t = blank(16, 16)
    fill_rect(t, 0, 12, 16, 4, NW)
    fill_rect(t, 1, 11, 14, 1, IW)
    fill_rect(t, 3, 10, 10, 1, HB)
    set_px(t, 5, 9, IW)
    set_px(t, 10, 9, IW)
    tiles.append(t)

    # Tile 2: Icicle (hanging from top)
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 2, HB)
    for cx, length in [(3, 8), (7, 10), (11, 6), (14, 4)]:
        for dy in range(length):
            color = IW if dy < length // 2 else HB
            set_px(t, cx, 2 + dy, color)
        set_px(t, cx, 2 + length, PB)
    tiles.append(t)

    # Tile 3: Frozen flower
    t = blank(16, 16)
    # Stem
    fill_rect(t, 7, 8, 2, 7, DP)
    # Frozen petals
    for dx, dy in [(-3, 0), (3, 0), (0, -3), (0, 3), (-2, -2), (2, -2), (-2, 2), (2, 2)]:
        set_px(t, 8 + dx, 5 + dy, HB)
        set_px(t, 8 + dx, 5 + dy, IW)
    # Center
    set_px(t, 7, 5, PB)
    set_px(t, 8, 5, SB)
    tiles.append(t)

    # Tile 4: Snow-topped rock
    t = blank(16, 16)
    fill_rect(t, 3, 8, 10, 8, ST)
    fill_rect(t, 4, 9, 8, 6, MG)
    fill_rect(t, 2, 6, 12, 3, NW)
    fill_rect(t, 4, 5, 8, 2, IW)
    tiles.append(t)

    # Tile 5: Ice crystal cluster
    t = blank(16, 16)
    # Tall crystal
    for dy in range(12):
        w = max(1, 4 - abs(dy - 4))
        fill_rect(t, 7 - w // 2, 2 + dy, w, 1, HB if dy < 6 else PB)
    # Small crystal
    for dy in range(7):
        w = max(1, 2 - abs(dy - 2))
        fill_rect(t, 12 - w // 2, 7 + dy, w, 1, IW if dy < 3 else HB)
    tiles.append(t)

    # Tile 6: Frost border — top edge decoration
    t = blank(16, 16)
    fill_rect(t, 0, 0, 16, 3, HB)
    for x in range(0, 16, 3):
        set_px(t, x, 3, IW)
        set_px(t, x, 4, HB)
        set_px(t, x + 1, 3, PB)
    tiles.append(t)

    # Tile 7: Snowman accent (small)
    t = blank(16, 16)
    # Body — two circles
    fill_rect(t, 5, 9, 6, 6, NW)
    fill_rect(t, 6, 10, 4, 4, IW)
    fill_rect(t, 6, 4, 4, 6, NW)
    fill_rect(t, 7, 5, 2, 4, IW)
    # Eyes
    set_px(t, 7, 6, K)
    set_px(t, 8, 6, K)
    # Hat
    fill_rect(t, 5, 2, 6, 2, DP)
    fill_rect(t, 6, 0, 4, 3, OC)
    # Nose
    set_px(t, 7, 7, FR)
    tiles.append(t)

    # Tile 8: Winter banner left
    t = blank(16, 16)
    fill_rect(t, 2, 0, 3, 16, DP)
    fill_rect(t, 3, 0, 1, 16, SB)
    # Banner hanging
    fill_rect(t, 6, 2, 8, 12, PB)
    fill_rect(t, 7, 3, 6, 10, HB)
    draw_rect_outline(t, 6, 2, 8, 12, DP)
    # Snowflake on banner
    set_px(t, 9, 6, IW)
    set_px(t, 10, 6, IW)
    set_px(t, 9, 7, IW)
    set_px(t, 10, 7, IW)
    set_px(t, 8, 7, NW)
    set_px(t, 11, 7, NW)
    set_px(t, 10, 5, NW)
    set_px(t, 10, 8, NW)
    tiles.append(t)

    # Tile 9: Winter banner right
    t = blank(16, 16)
    fill_rect(t, 11, 0, 3, 16, DP)
    fill_rect(t, 12, 0, 1, 16, SB)
    fill_rect(t, 2, 2, 8, 12, PB)
    fill_rect(t, 3, 3, 6, 10, HB)
    draw_rect_outline(t, 2, 2, 8, 12, DP)
    set_px(t, 5, 6, IW)
    set_px(t, 6, 6, IW)
    set_px(t, 5, 7, IW)
    set_px(t, 6, 7, IW)
    tiles.append(t)

    # Tile 10: Frozen ground overlay
    t = blank(16, 16)
    for y in range(16):
        for x in range(16):
            if (x + y) % 5 == 0:
                set_px(t, x, y, HB)
            elif (x * 3 + y * 7) % 11 == 0:
                set_px(t, x, y, IW)
    tiles.append(t)

    # Tile 11: Garland with icicles
    t = blank(16, 16)
    # Garland rope
    for x in range(16):
        y_pos = 3 + (1 if 4 <= x <= 12 else 0)
        set_px(t, x, y_pos, FG)
        set_px(t, x, y_pos + 1, DF)
    # Icicles hanging from garland
    for x in [4, 8, 12]:
        for dy in range(5):
            set_px(t, x, 5 + dy, IW if dy < 3 else HB)
    tiles.append(t)

    # Tile 12: Gift box
    t = blank(16, 16)
    fill_rect(t, 3, 6, 10, 9, BR)
    fill_rect(t, 4, 7, 8, 7, ER)
    draw_rect_outline(t, 3, 6, 10, 9, DB)
    # Ribbon
    fill_rect(t, 7, 6, 2, 9, GD)
    fill_rect(t, 3, 9, 10, 2, GD)
    # Bow
    set_px(t, 6, 5, YL)
    set_px(t, 7, 4, GD)
    set_px(t, 8, 4, GD)
    set_px(t, 9, 5, YL)
    set_px(t, 7, 5, YL)
    set_px(t, 8, 5, YL)
    tiles.append(t)

    # Tile 13: Candy cane
    t = blank(16, 16)
    # Vertical part
    for y in range(5, 15):
        c = BR if y % 3 == 0 else NW
        set_px(t, 8, y, c)
        set_px(t, 9, y, c)
    # Curved top
    for x in range(6, 10):
        set_px(t, x, 4, BR)
    set_px(t, 5, 5, NW)
    set_px(t, 5, 6, BR)
    set_px(t, 5, 7, NW)
    set_px(t, 6, 4, NW)
    tiles.append(t)

    # Tile 14: Wreath
    t = blank(16, 16)
    draw_circle_outline(t, 7, 7, 5, FG)
    draw_circle_outline(t, 7, 7, 4, DF)
    # Red berries
    set_px(t, 7, 2, BR)
    set_px(t, 3, 5, BR)
    set_px(t, 11, 5, BR)
    # Bow at bottom
    set_px(t, 6, 12, BR)
    set_px(t, 7, 13, ER)
    set_px(t, 8, 12, BR)
    tiles.append(t)

    # Tile 15: Snow particle overlay (sparse)
    t = blank(16, 16)
    for pos in [(2, 3), (8, 1), (14, 5), (5, 9), (11, 12), (1, 14), (9, 15), (13, 8)]:
        set_px(t, pos[0], pos[1], NW)
    tiles.append(t)

    # Arrange as 8×2 grid
    row1 = hstack(tiles[0:8])
    row2 = hstack(tiles[8:16])
    return vstack([row1, row2])

def make_harvest_tileset():
    """8×2 grid of harvest festival decoration tiles (128×32)."""
    tiles = []

    # Tile 0: Wheat sheaf
    t = blank(16, 16)
    # Stalks
    for x in [5, 7, 9, 11]:
        for y in range(4, 15):
            set_px(t, x, y, DT if y < 10 else SN)
    # Wheat heads
    for x in [5, 7, 9, 11]:
        fill_rect(t, x - 1, 2, 3, 3, DS)
        set_px(t, x, 1, SN)
    # Tie
    fill_rect(t, 4, 10, 8, 2, BN)
    tiles.append(t)

    # Tile 1: Pumpkin
    t = blank(16, 16)
    fill_rect(t, 3, 7, 10, 8, FR)
    fill_rect(t, 4, 8, 8, 6, EM)
    fill_rect(t, 5, 7, 6, 8, FR)
    draw_rect_outline(t, 3, 7, 10, 8, BD)
    # Stem
    fill_rect(t, 7, 4, 2, 4, FG)
    set_px(t, 6, 5, DF)
    # Face (jack-o-lantern)
    set_px(t, 5, 10, YL)
    set_px(t, 9, 10, YL)
    fill_rect(t, 6, 12, 4, 1, YL)
    tiles.append(t)

    # Tile 2: Hay bale
    t = blank(16, 16)
    fill_rect(t, 1, 6, 14, 10, SN)
    fill_rect(t, 2, 7, 12, 8, DS)
    draw_rect_outline(t, 1, 6, 14, 10, BN)
    # Hay texture lines
    for y in range(7, 15, 2):
        for x in range(3, 14, 3):
            set_px(t, x, y, DT)
    # Rope
    fill_rect(t, 1, 10, 14, 1, BD)
    tiles.append(t)

    # Tile 3: Apple basket
    t = blank(16, 16)
    # Basket
    fill_rect(t, 3, 8, 10, 7, DT)
    fill_rect(t, 4, 9, 8, 5, BN)
    draw_rect_outline(t, 3, 8, 10, 7, BD)
    # Apples (red)
    for pos in [(5, 7), (7, 6), (9, 7), (6, 8), (8, 8)]:
        set_px(t, pos[0], pos[1], BR)
        set_px(t, pos[0] + 1, pos[1], ER)
    # Leaf
    set_px(t, 8, 5, LG)
    tiles.append(t)

    # Tile 4: Corn stalk
    t = blank(16, 16)
    # Stalk
    fill_rect(t, 7, 2, 2, 14, FG)
    fill_rect(t, 8, 3, 1, 12, LG)
    # Corn ear
    fill_rect(t, 9, 5, 3, 5, DS)
    fill_rect(t, 10, 6, 1, 3, YL)
    # Leaves
    set_px(t, 5, 4, FG)
    set_px(t, 6, 5, LG)
    set_px(t, 11, 8, FG)
    set_px(t, 12, 9, LG)
    tiles.append(t)

    # Tile 5: Harvest wreath
    t = blank(16, 16)
    draw_circle_outline(t, 7, 7, 5, DT)
    draw_circle_outline(t, 7, 7, 4, SN)
    # Fruits
    set_px(t, 7, 2, BR)
    set_px(t, 3, 7, FR)
    set_px(t, 11, 7, LG)
    # Bow
    set_px(t, 6, 12, DS)
    set_px(t, 7, 13, DG)
    set_px(t, 8, 12, DS)
    tiles.append(t)

    # Tile 6: Festival pennant string
    t = blank(16, 16)
    # String
    for x in range(16):
        set_px(t, x, 2, BD)
    # Pennants (triangular flags)
    colors = [FR, FG, DS, BR, GD]
    for i, x in enumerate(range(1, 15, 3)):
        c = colors[i % len(colors)]
        set_px(t, x, 3, c)
        set_px(t, x + 1, 3, c)
        set_px(t, x, 4, c)
        set_px(t, x + 1, 4, c)
        set_px(t, x, 5, c)
        set_px(t, x + 1, 5, c)
        set_px(t, x, 6, c)
    tiles.append(t)

    # Tile 7: Scarecrow (small)
    t = blank(16, 16)
    # Hat
    fill_rect(t, 4, 0, 8, 2, BN)
    fill_rect(t, 5, 2, 6, 3, BD)
    # Head
    fill_rect(t, 6, 5, 4, 4, PS)
    set_px(t, 7, 6, K)
    set_px(t, 8, 6, K)
    set_px(t, 7, 8, DT)
    # Body
    fill_rect(t, 7, 9, 2, 5, DT)
    # Arms
    fill_rect(t, 3, 10, 10, 1, DT)
    # Straw tufts
    set_px(t, 2, 10, SN)
    set_px(t, 13, 10, SN)
    set_px(t, 7, 14, SN)
    set_px(t, 8, 14, SN)
    tiles.append(t)

    # Tile 8: Harvest banner left
    t = blank(16, 16)
    fill_rect(t, 2, 0, 3, 16, BD)
    fill_rect(t, 3, 0, 1, 16, DT)
    fill_rect(t, 6, 2, 8, 12, DS)
    fill_rect(t, 7, 3, 6, 10, SN)
    draw_rect_outline(t, 6, 2, 8, 12, BD)
    # Leaf on banner
    set_px(t, 9, 6, FG)
    set_px(t, 10, 7, LG)
    set_px(t, 9, 8, FG)
    tiles.append(t)

    # Tile 9: Harvest banner right
    t = blank(16, 16)
    fill_rect(t, 11, 0, 3, 16, BD)
    fill_rect(t, 12, 0, 1, 16, DT)
    fill_rect(t, 2, 2, 8, 12, DS)
    fill_rect(t, 3, 3, 6, 10, SN)
    draw_rect_outline(t, 2, 2, 8, 12, BD)
    set_px(t, 5, 6, FG)
    set_px(t, 6, 7, LG)
    set_px(t, 5, 8, FG)
    tiles.append(t)

    # Tile 10: Leaf scatter overlay
    t = blank(16, 16)
    leaf_positions = [(2, 3), (8, 1), (14, 6), (5, 10), (11, 13), (1, 14)]
    leaf_colors = [FR, DS, ER, SN, DT, FR]
    for pos, c in zip(leaf_positions, leaf_colors):
        set_px(t, pos[0], pos[1], c)
        set_px(t, pos[0] + 1, pos[1] + 1, c)
    tiles.append(t)

    # Tile 11: Garland with harvest items
    t = blank(16, 16)
    for x in range(16):
        y_pos = 3
        set_px(t, x, y_pos, DF)
        set_px(t, x, y_pos + 1, FG)
    # Hanging items
    set_px(t, 3, 5, FR)   # Apple
    set_px(t, 3, 6, ER)
    set_px(t, 8, 5, DS)   # Corn
    set_px(t, 8, 6, YL)
    set_px(t, 13, 5, LG)  # Grape
    set_px(t, 13, 6, FG)
    tiles.append(t)

    # Tile 12: Pie
    t = blank(16, 16)
    fill_rect(t, 3, 8, 10, 6, DT)
    fill_rect(t, 4, 9, 8, 4, SN)
    draw_rect_outline(t, 3, 8, 10, 6, BD)
    # Crust lattice
    for x in range(5, 12, 2):
        set_px(t, x, 9, DS)
        set_px(t, x, 11, DS)
    # Steam
    set_px(t, 6, 6, PG)
    set_px(t, 8, 5, LS)
    set_px(t, 10, 6, PG)
    tiles.append(t)

    # Tile 13: Mushroom cluster
    t = blank(16, 16)
    # Large mushroom
    fill_rect(t, 4, 6, 6, 3, ER)
    fill_rect(t, 5, 7, 4, 1, NW)
    fill_rect(t, 6, 9, 2, 4, PS)
    # Small mushroom
    fill_rect(t, 10, 9, 4, 2, FR)
    fill_rect(t, 11, 11, 2, 3, PS)
    tiles.append(t)

    # Tile 14: Autumn tree (small)
    t = blank(16, 16)
    # Trunk
    fill_rect(t, 7, 9, 2, 7, BN)
    # Canopy — autumn colors
    fill_rect(t, 3, 3, 10, 7, FR)
    fill_rect(t, 4, 4, 8, 5, DS)
    fill_rect(t, 5, 3, 6, 3, ER)
    # Highlight
    set_px(t, 6, 4, YL)
    set_px(t, 9, 5, YL)
    tiles.append(t)

    # Tile 15: Falling leaves particle overlay
    t = blank(16, 16)
    fall_colors = [FR, DS, ER, DT, SN]
    fall_pos = [(3, 2), (9, 4), (1, 7), (12, 9), (6, 12), (14, 14), (4, 15)]
    for i, pos in enumerate(fall_pos):
        set_px(t, pos[0], pos[1], fall_colors[i % len(fall_colors)])
    tiles.append(t)

    row1 = hstack(tiles[0:8])
    row2 = hstack(tiles[8:16])
    return vstack([row1, row2])

write_png(os.path.join(TILESET_DIR, 'tileset_seasonal_winter.png'), make_winter_tileset())
write_png(os.path.join(TILESET_DIR, 'tileset_seasonal_harvest.png'), make_harvest_tileset())

# ═══════════════════════════════════════════════════════════════════════════════
# 4. EXCLUSIVE SEASONAL REWARD SPRITES (16×16 each)
# ═══════════════════════════════════════════════════════════════════════════════
print('\n=== Seasonal Reward Sprites (16x16) ===')

def make_winter_crown():
    """16×16 frost crown — premium winter reward."""
    img = blank(16, 16)
    # Crown base
    fill_rect(img, 2, 8, 12, 4, DP)
    fill_rect(img, 3, 9, 10, 2, SB)
    draw_rect_outline(img, 2, 8, 12, 4, OC)
    # Crown points — 3 spikes
    for cx in [4, 7, 11]:
        set_px(img, cx, 7, PB)
        set_px(img, cx, 6, HB)
        set_px(img, cx, 5, IW)
        set_px(img, cx - 1, 7, SB)
        set_px(img, cx + 1, 7, SB)
    # Center jewel
    set_px(img, 7, 4, NW)
    set_px(img, 8, 4, IW)
    # Ice crystal tips
    set_px(img, 4, 3, IW)
    set_px(img, 11, 3, IW)
    # Shimmer details on band
    set_px(img, 5, 9, HB)
    set_px(img, 8, 9, IW)
    set_px(img, 11, 10, HB)
    # Bottom rim
    fill_rect(img, 3, 12, 10, 1, PB)
    return img

def make_harvest_cape():
    """16×16 harvest cape — premium harvest reward."""
    img = blank(16, 16)
    # Cape body — flowing shape
    fill_rect(img, 4, 2, 8, 12, DT)
    fill_rect(img, 5, 3, 6, 10, DS)
    # Darker folds
    fill_rect(img, 4, 4, 1, 8, BN)
    fill_rect(img, 11, 4, 1, 8, BN)
    # Clasp at top
    fill_rect(img, 6, 1, 4, 2, GD)
    set_px(img, 7, 1, YL)
    set_px(img, 8, 1, YL)
    # Embroidered leaf pattern
    set_px(img, 7, 5, FG)
    set_px(img, 8, 6, LG)
    set_px(img, 7, 7, FG)
    set_px(img, 6, 6, DF)
    set_px(img, 9, 6, DF)
    # Bottom fringe
    for x in range(5, 11):
        set_px(img, x, 13, EM)
        if x % 2 == 0:
            set_px(img, x, 14, SN)
    # Outline
    draw_rect_outline(img, 4, 2, 8, 12, BD)
    # Gold trim
    set_px(img, 4, 2, DG)
    set_px(img, 11, 2, DG)
    return img

def make_spring_staff():
    """16×16 spring staff — premium spring reward."""
    img = blank(16, 16)
    # Staff shaft
    for y in range(4, 15):
        set_px(img, 7, y, DT)
        set_px(img, 8, y, BN)
    # Flowering top — crystal/bloom
    fill_rect(img, 5, 1, 6, 4, LG)
    fill_rect(img, 6, 2, 4, 2, BG)
    set_px(img, 7, 1, FL)
    set_px(img, 8, 1, FL)
    # Petals
    set_px(img, 4, 2, SG)
    set_px(img, 11, 2, SG)
    set_px(img, 5, 0, MV)
    set_px(img, 10, 0, MV)
    # Center gem
    set_px(img, 7, 2, PY)
    set_px(img, 8, 2, YL)
    # Vine wrapping
    for y in range(6, 13, 2):
        set_px(img, 6, y, FG)
    for y in range(7, 14, 2):
        set_px(img, 9, y, FG)
    # Bottom cap
    set_px(img, 7, 15, BD)
    set_px(img, 8, 15, BD)
    # Outline accents
    draw_rect_outline(img, 5, 1, 6, 4, DF)
    return img

def make_summer_shield():
    """16×16 summer shield — premium summer reward."""
    img = blank(16, 16)
    # Shield body — pointed bottom
    fill_rect(img, 3, 2, 10, 8, GD)
    fill_rect(img, 4, 3, 8, 6, YL)
    # Pointed bottom
    for i in range(4):
        fill_rect(img, 4 + i, 10 + i, 8 - 2 * i, 1, GD)
    set_px(img, 7, 14, DG)
    set_px(img, 8, 14, DG)
    # Sun emblem in center
    set_px(img, 7, 5, FR)
    set_px(img, 8, 5, FR)
    set_px(img, 7, 6, EM)
    set_px(img, 8, 6, EM)
    # Sun rays
    for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
        set_px(img, 7 + dx, 5 + dy, PY)
    for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
        set_px(img, 7 + dx, 5 + dy, YL)
    # Outline
    draw_rect_outline(img, 3, 2, 10, 8, BD)
    # Metallic rim
    set_px(img, 3, 2, DG)
    set_px(img, 12, 2, DG)
    # Wave pattern at bottom
    set_px(img, 5, 9, SB)
    set_px(img, 6, 8, PB)
    set_px(img, 9, 8, PB)
    set_px(img, 10, 9, SB)
    return img

rewards = {
    'winter_crown':  make_winter_crown(),
    'harvest_cape':  make_harvest_cape(),
    'spring_staff':  make_spring_staff(),
    'summer_shield': make_summer_shield(),
}

for name, sprite in rewards.items():
    write_png(os.path.join(PICKUP_DIR, f'icon_reward_{name}.png'), sprite)

# Combined reward sheet
write_png(
    os.path.join(SEASONAL_UI_DIR, 'ui_seasonal_rewards_sheet.png'),
    hstack(list(rewards.values()))
)

# ═══════════════════════════════════════════════════════════════════════════════
# 5. SEASONAL BADGE/TITLE ICONS (16×16 each)
# ═══════════════════════════════════════════════════════════════════════════════
print('\n=== Seasonal Badge Icons (16x16) ===')

def make_badge(season_name, pal):
    """Generate a 16×16 seasonal badge icon."""
    out, dk, md, lt, hi, acc = pal
    img = blank(16, 16)

    # Circular badge background
    draw_circle_outline(img, 7, 7, 6, out)
    draw_circle_outline(img, 7, 7, 5, dk)
    # Fill interior
    for y in range(3, 13):
        for x in range(3, 13):
            dx = x - 7
            dy = y - 7
            if dx * dx + dy * dy <= 20:
                img[y][x] = md
            if dx * dx + dy * dy <= 12:
                img[y][x] = lt

    # Season-specific center emblem
    if season_name == 'winter':
        # Snowflake
        set_px(img, 7, 5, IW)
        set_px(img, 7, 9, IW)
        set_px(img, 5, 7, IW)
        set_px(img, 9, 7, IW)
        set_px(img, 6, 6, HB)
        set_px(img, 8, 6, HB)
        set_px(img, 6, 8, HB)
        set_px(img, 8, 8, HB)
        set_px(img, 7, 7, NW)
    elif season_name == 'harvest':
        # Wheat/grain
        set_px(img, 7, 5, DS)
        set_px(img, 7, 6, SN)
        set_px(img, 7, 7, DT)
        set_px(img, 7, 8, BN)
        set_px(img, 6, 5, DS)
        set_px(img, 8, 5, DS)
        set_px(img, 7, 9, FG)
    elif season_name == 'spring':
        # Flower
        set_px(img, 7, 7, YL)
        set_px(img, 7, 5, FL)
        set_px(img, 7, 9, FL)
        set_px(img, 5, 7, BG)
        set_px(img, 9, 7, BG)
        set_px(img, 6, 6, LG)
        set_px(img, 8, 8, LG)
    elif season_name == 'summer':
        # Sun
        set_px(img, 7, 7, YL)
        set_px(img, 7, 5, PY)
        set_px(img, 7, 9, PY)
        set_px(img, 5, 7, GD)
        set_px(img, 9, 7, GD)
        set_px(img, 6, 6, EM)
        set_px(img, 8, 8, EM)
        set_px(img, 6, 8, FR)
        set_px(img, 8, 6, FR)

    # Highlight shimmer
    set_px(img, 5, 4, hi)
    set_px(img, 4, 5, hi)

    return img

badges = {}
for name in SEASON_NAMES:
    pal = SEASON_PALETTES[name]
    badge = make_badge(name, pal)
    badges[name] = badge
    write_png(os.path.join(ICON_DIR, f'icon_badge_{name}.png'), badge)

# Combined badge sheet
write_png(
    os.path.join(SEASONAL_UI_DIR, 'ui_seasonal_badges_sheet.png'),
    hstack(list(badges.values()))
)

# ═══════════════════════════════════════════════════════════════════════════════
# 6. EVENT QUEST MARKER (16×16)
# ═══════════════════════════════════════════════════════════════════════════════
print('\n=== Event Quest Marker (16x16) ===')

img = blank(16, 16)
# Exclamation mark with seasonal star decoration
# Star burst background
for dx, dy in [(-3, 0), (3, 0), (0, -3), (0, 3), (-2, -2), (2, -2), (-2, 2), (2, 2)]:
    set_px(img, 7 + dx, 7 + dy, GD)
# Wider rays
for dx, dy in [(-4, 0), (4, 0), (0, -4), (0, 4)]:
    set_px(img, 7 + dx, 7 + dy, DG)

# Exclamation mark — gold on dark
fill_rect(img, 6, 2, 3, 7, YL)
fill_rect(img, 7, 3, 1, 5, PY)
draw_rect_outline(img, 6, 2, 3, 7, DG)
# Dot
fill_rect(img, 6, 11, 3, 3, YL)
set_px(img, 7, 12, PY)
draw_rect_outline(img, 6, 11, 3, 3, DG)

# Seasonal sparkle accents — distinguishes from standard quest marker
set_px(img, 2, 2, MV)
set_px(img, 13, 2, SG)
set_px(img, 2, 13, SG)
set_px(img, 13, 13, MV)
# Time-limited indicator — small clock dots
set_px(img, 1, 7, PB)
set_px(img, 14, 7, PB)

write_png(os.path.join(ICON_DIR, 'icon_quest_seasonal.png'), img)

# ═══════════════════════════════════════════════════════════════════════════════
# 7. SEASONAL NPC COSTUME OVERLAYS (16×10 head accessories)
# ═══════════════════════════════════════════════════════════════════════════════
print('\n=== NPC Costume Overlays (16x10) ===')

def make_winter_hat():
    """16×10 winter hat overlay — Santa-style with pompom."""
    img = blank(16, 10)
    # Hat brim
    fill_rect(img, 2, 7, 12, 3, ER)
    fill_rect(img, 3, 8, 10, 1, NW)
    draw_rect_outline(img, 2, 7, 12, 3, DB)
    # Hat body — triangular
    fill_rect(img, 4, 4, 8, 4, BR)
    fill_rect(img, 5, 3, 6, 2, ER)
    fill_rect(img, 6, 2, 4, 2, BR)
    # Tip folds to right
    set_px(img, 10, 2, ER)
    set_px(img, 11, 1, ER)
    # Pompom
    fill_rect(img, 11, 0, 3, 2, NW)
    set_px(img, 12, 0, IW)
    # White trim
    fill_rect(img, 2, 7, 12, 1, NW)
    return img

def make_harvest_hat():
    """16×10 harvest hat overlay — straw hat with band."""
    img = blank(16, 10)
    # Wide brim
    fill_rect(img, 0, 6, 16, 3, DS)
    fill_rect(img, 1, 7, 14, 1, SN)
    draw_rect_outline(img, 0, 6, 16, 3, BN)
    # Crown
    fill_rect(img, 4, 2, 8, 5, SN)
    fill_rect(img, 5, 3, 6, 3, PS)
    draw_rect_outline(img, 4, 2, 8, 5, DT)
    # Band
    fill_rect(img, 4, 5, 8, 1, ER)
    # Wheat accent
    set_px(img, 12, 4, DS)
    set_px(img, 13, 3, YL)
    set_px(img, 13, 5, DS)
    return img

def make_spring_hat():
    """16×10 spring hat overlay — flower crown."""
    img = blank(16, 10)
    # Vine base
    fill_rect(img, 2, 6, 12, 2, FG)
    fill_rect(img, 3, 7, 10, 1, LG)
    # Flowers along the crown
    flower_positions = [3, 6, 9, 12]
    flower_colors = [SG, FL, MV, BG]
    for x, fc in zip(flower_positions, flower_colors):
        set_px(img, x, 4, fc)
        set_px(img, x - 1, 5, fc)
        set_px(img, x + 1, 5, fc)
        set_px(img, x, 5, YL)  # Center
        set_px(img, x, 6, fc)
    # Leaves
    set_px(img, 2, 5, DF)
    set_px(img, 14, 5, DF)
    # Small leaf buds
    set_px(img, 5, 5, LG)
    set_px(img, 8, 4, BG)
    set_px(img, 11, 5, LG)
    return img

def make_summer_hat():
    """16×10 summer hat overlay — sun visor / beach hat."""
    img = blank(16, 10)
    # Wide brim — straw color
    fill_rect(img, 0, 6, 16, 3, YL)
    fill_rect(img, 1, 7, 14, 1, PY)
    draw_rect_outline(img, 0, 6, 16, 3, DG)
    # Crown — lighter
    fill_rect(img, 4, 2, 8, 5, GD)
    fill_rect(img, 5, 3, 6, 3, YL)
    draw_rect_outline(img, 4, 2, 8, 5, DG)
    # Tropical flower
    set_px(img, 12, 4, FR)
    set_px(img, 13, 3, EM)
    set_px(img, 13, 5, FR)
    set_px(img, 14, 4, EM)
    set_px(img, 12, 3, FG)  # Leaf
    # Blue band
    fill_rect(img, 4, 5, 8, 1, SB)
    return img

hats = {
    'winter':  make_winter_hat(),
    'harvest': make_harvest_hat(),
    'spring':  make_spring_hat(),
    'summer':  make_summer_hat(),
}

for name, sprite in hats.items():
    write_png(os.path.join(CHAR_DIR, f'char_overlay_hat_{name}.png'), sprite)

# Combined hat sheet
write_png(
    os.path.join(CHAR_DIR, 'char_overlay_hats_sheet.png'),
    hstack(list(hats.values()))
)

# ═══════════════════════════════════════════════════════════════════════════════
print('\n✓ All seasonal event assets generated successfully.')
print(f'  Output directories:')
print(f'    {SEASONAL_UI_DIR}')
print(f'    {TILESET_DIR}')
print(f'    {PICKUP_DIR}')
print(f'    {ICON_DIR}')
print(f'    {CHAR_DIR}')
