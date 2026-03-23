#!/usr/bin/env python3
"""
Generate prestige system art assets for PixelRealm.
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md exactly:
  - 32-color master palette, SNES-era RPG style
  - Nearest-neighbor pixel art, no anti-aliasing
  - Naming convention: {category}_{name}_{variant}_{size}.{ext}

Outputs:
  assets/ui/prestige/ui_prestige_tier_icons.png      : 320×32 (10 tier icons, 32×32 each)
  assets/ui/prestige/ui_prestige_tier_bronze1.png     : 32×32  individual tier icon
  assets/ui/prestige/ui_prestige_tier_bronze2.png     : 32×32  individual tier icon
  assets/ui/prestige/ui_prestige_tier_silver1.png     : 32×32  individual tier icon
  assets/ui/prestige/ui_prestige_tier_silver2.png     : 32×32  individual tier icon
  assets/ui/prestige/ui_prestige_tier_gold1.png       : 32×32  individual tier icon
  assets/ui/prestige/ui_prestige_tier_gold2.png       : 32×32  individual tier icon
  assets/ui/prestige/ui_prestige_tier_platinum1.png   : 32×32  individual tier icon
  assets/ui/prestige/ui_prestige_tier_platinum2.png   : 32×32  individual tier icon
  assets/ui/prestige/ui_prestige_tier_diamond1.png    : 32×32  individual tier icon
  assets/ui/prestige/ui_prestige_tier_diamond2.png    : 32×32  individual tier icon
  assets/ui/prestige/ui_prestige_borders.png          : 320×24 (10 nameplate borders, 32×24 each)
  assets/ui/prestige/ui_panel_prestige_reset.png      : 128×96 reset confirmation dialog
  assets/ui/prestige/ui_prestige_badge.png            : 160×16 (10 leaderboard badges, 16×16 each)
  assets/ui/prestige/ui_prestige_stars.png            : 160×8  (10 star/chevron indicators, 16×8 each)
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
PROJ_DIR = os.path.join(SCRIPT_DIR, '..')
PRESTIGE_DIR = os.path.join(PROJ_DIR, 'assets', 'ui', 'prestige')
os.makedirs(PRESTIGE_DIR, exist_ok=True)

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
BN  = (107, 58,  31,  255)  # rich earth / bronze dark
DT  = (139, 92,  42,  255)  # dirt / bronze mid
SN  = (184, 132, 63,  255)  # sand / bronze light
DS  = (212, 168, 90,  255)  # desert gold / bronze highlight
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

# ─── Tier color palettes ────────────────────────────────────────────────────
# Each tier: (outline, dark, mid, light, highlight)
TIER_PALETTES = {
    'bronze1':   (BD, BN, DT, SN, DS),
    'bronze2':   (BD, BN, DT, SN, DS),
    'silver1':   (DK, ST, MG, LS, PG),
    'silver2':   (DK, ST, MG, LS, PG),
    'gold1':     (BD, DG, GD, YL, PY),
    'gold2':     (BD, DG, GD, YL, PY),
    'platinum1': (OC, DP, SB, PB, HB),
    'platinum2': (OC, DP, SB, PB, HB),
    'diamond1':  (PM, MP, MV, SG, IW),
    'diamond2':  (PM, MP, MV, SG, IW),
}

TIER_NAMES = list(TIER_PALETTES.keys())

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

def copy_sprite(src):
    return [row[:] for row in src]

def hstack(frames):
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result

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

def overlay(dst, src, x_off, y_off):
    for r, row in enumerate(src):
        dr = r + y_off
        if dr < 0 or dr >= len(dst): continue
        for c, px in enumerate(row):
            dc = c + x_off
            if dc < 0 or dc >= len(dst[dr]): continue
            if px[3] > 0:
                dst[dr][dc] = px
    return dst

# ─── 1. PRESTIGE TIER ICONS (32×32) ────────────────────────────────────────
# Shield/medallion shape, consistent silhouette across all tiers.
# Tier 1 icons have 1 star, tier 2 icons have 2 stars inside.
# Color shifts from bronze → silver → gold → platinum → diamond.

print('\n=== Prestige Tier Icons (32x32) ===')

def make_shield_icon(tier_name, palette):
    """Generate a 32x32 shield/medallion prestige tier icon."""
    out, dk, md, lt, hi = palette
    img = blank(32, 32)

    # Shield outline shape — pointed bottom, curved top
    # Row by row shield silhouette (x_start, x_end) for outline
    shield_rows = [
        # top rim
        (8,  23),  # y=3
        (6,  25),  # y=4
        (5,  26),  # y=5
        (4,  27),  # y=6
        (4,  27),  # y=7
        (4,  27),  # y=8
        (4,  27),  # y=9
        (4,  27),  # y=10
        (4,  27),  # y=11
        (4,  27),  # y=12
        (4,  27),  # y=13
        (4,  27),  # y=14
        (4,  27),  # y=15
        (5,  26),  # y=16
        (5,  26),  # y=17
        (6,  25),  # y=18
        (6,  25),  # y=19
        (7,  24),  # y=20
        (8,  23),  # y=21
        (9,  22),  # y=22
        (10, 21),  # y=23
        (11, 20),  # y=24
        (12, 19),  # y=25
        (13, 18),  # y=26
        (14, 17),  # y=27
        (15, 16),  # y=28
    ]

    base_y = 3

    # Draw filled shield
    for i, (xs, xe) in enumerate(shield_rows):
        y = base_y + i
        # Outline
        set_px(img, xs, y, out)
        set_px(img, xe, y, out)
        # Fill
        for x in range(xs + 1, xe):
            # Gradient: left highlight, center mid, right shadow
            if x < xs + 3:
                set_px(img, x, y, lt)
            elif x > xe - 3:
                set_px(img, x, y, dk)
            else:
                set_px(img, x, y, md)

    # Top outline curve
    for x in range(8, 24):
        set_px(img, x, 2, out)
    for x in range(6, 26):
        set_px(img, x, 3, out)
    # Fill the top row
    for x in range(9, 23):
        set_px(img, x, 3, lt)

    # Bottom point
    set_px(img, 15, 29, out)
    set_px(img, 16, 29, out)

    # Inner highlight border (1px inside the outline)
    for i, (xs, xe) in enumerate(shield_rows):
        y = base_y + i
        if i > 0 and i < len(shield_rows) - 1:
            set_px(img, xs + 1, y, hi)

    # Central emblem area — star/cross motif
    cx, cy = 15, 14  # center

    # Draw a central gem/circle
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            if abs(dx) + abs(dy) <= 2:
                set_px(img, cx + dx, cy + dy, hi)
    # Gem outline
    for dx in range(-3, 4):
        for dy in range(-3, 4):
            if abs(dx) + abs(dy) == 3:
                set_px(img, cx + dx, cy + dy, lt)

    # Decorative rays from gem (4 directions)
    for d in range(4, 7):
        set_px(img, cx, cy - d, lt)     # up
        set_px(img, cx, cy + d, lt)     # down
        set_px(img, cx - d, cy, lt)     # left
        set_px(img, cx + d, cy, lt)     # right

    # Diagonal accent dots
    for d in [3, 4]:
        set_px(img, cx - d, cy - d, dk)
        set_px(img, cx + d, cy - d, dk)
        set_px(img, cx - d, cy + d, dk)
        set_px(img, cx + d, cy + d, dk)

    # Tier number indicator (stars at bottom of shield)
    tier_num = int(tier_name[-1])
    star_y = 22
    if tier_num == 1:
        # Single star centered
        set_px(img, cx, star_y, hi)
        set_px(img, cx - 1, star_y, lt)
        set_px(img, cx + 1, star_y, lt)
        set_px(img, cx, star_y - 1, lt)
        set_px(img, cx, star_y + 1, lt)
    elif tier_num == 2:
        # Two stars
        for sx in [cx - 3, cx + 3]:
            set_px(img, sx, star_y, hi)
            set_px(img, sx - 1, star_y, lt)
            set_px(img, sx + 1, star_y, lt)
            set_px(img, sx, star_y - 1, lt)
            set_px(img, sx, star_y + 1, lt)

    # Top crown decoration for higher tiers
    tier_base = tier_name[:-1]  # e.g. 'gold'
    tier_rank = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].index(tier_base)

    if tier_rank >= 2:  # gold and above: add crown points at top
        set_px(img, cx - 3, 1, hi)
        set_px(img, cx,     0, hi)
        set_px(img, cx + 3, 1, hi)
        set_px(img, cx - 3, 2, lt)
        set_px(img, cx,     1, lt)
        set_px(img, cx + 3, 2, lt)

    if tier_rank >= 3:  # platinum and above: extra crown jewels
        set_px(img, cx - 5, 2, hi)
        set_px(img, cx + 5, 2, hi)

    if tier_rank >= 4:  # diamond: sparkle corners
        for corner in [(6, 5), (25, 5), (6, 26), (25, 26)]:
            set_px(img, corner[0], corner[1], hi)
            set_px(img, corner[0] - 1, corner[1], lt)
            set_px(img, corner[0] + 1, corner[1], lt)
            set_px(img, corner[0], corner[1] - 1, lt)
            set_px(img, corner[0], corner[1] + 1, lt)

    return img


tier_icons = []
for name in TIER_NAMES:
    pal = TIER_PALETTES[name]
    icon = make_shield_icon(name, pal)
    tier_icons.append(icon)
    # Write individual icon
    write_png(os.path.join(PRESTIGE_DIR, f'ui_prestige_tier_{name}.png'), icon)

# Write combined spritesheet
sheet = hstack(tier_icons)
write_png(os.path.join(PRESTIGE_DIR, 'ui_prestige_tier_icons.png'), sheet)


# ─── 2. NAMEPLATE BORDERS (32×24 per tier) ─────────────────────────────────
# Decorative frames around player names. 32×24 = wide enough for name area.
# Inner transparent area for the name text to show through.

print('\n=== Prestige Nameplate Borders (32x24 each) ===')

def make_nameplate_border(tier_name, palette):
    """Generate a 32×24 nameplate border frame."""
    out, dk, md, lt, hi = palette
    img = blank(32, 24)

    # Outer border (2px thick)
    draw_rect_outline(img, 0, 0, 32, 24, out)
    draw_rect_outline(img, 1, 1, 30, 22, dk)

    # Inner decorative border
    draw_rect_outline(img, 2, 2, 28, 20, md)

    # Corner ornaments
    for (cx, cy) in [(2, 2), (29, 2), (2, 21), (29, 21)]:
        set_px(img, cx, cy, hi)
    for (cx, cy) in [(3, 2), (2, 3), (28, 2), (29, 3),
                     (3, 21), (2, 20), (28, 21), (29, 20)]:
        set_px(img, cx, cy, lt)

    # Top/bottom center accent
    for x in [14, 15, 16, 17]:
        set_px(img, x, 0, hi)
        set_px(img, x, 23, hi)
        set_px(img, x, 1, lt)
        set_px(img, x, 22, lt)

    # Side accents
    for y in [10, 11, 12, 13]:
        set_px(img, 0, y, hi)
        set_px(img, 31, y, hi)
        set_px(img, 1, y, lt)
        set_px(img, 30, y, lt)

    # Tier-specific ornamentation
    tier_base = tier_name[:-1]
    tier_rank = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].index(tier_base)

    if tier_rank >= 1:  # silver+: inner highlight dots along top/bottom
        for x in range(6, 26, 4):
            set_px(img, x, 2, lt)
            set_px(img, x, 21, lt)

    if tier_rank >= 2:  # gold+: double corner ornaments
        for (cx, cy) in [(4, 4), (27, 4), (4, 19), (27, 19)]:
            set_px(img, cx, cy, hi)

    if tier_rank >= 3:  # platinum+: inner glow line along edges
        for x in range(4, 28):
            set_px(img, x, 3, lt)
            set_px(img, x, 20, lt)

    if tier_rank >= 4:  # diamond: sparkle accents
        for (sx, sy) in [(8, 1), (23, 1), (8, 22), (23, 22)]:
            set_px(img, sx, sy, hi)

    # Tier number indicator — small star at top center
    tier_num = int(tier_name[-1])
    if tier_num == 2:
        set_px(img, 13, 1, hi)
        set_px(img, 18, 1, hi)

    return img


border_frames = []
for name in TIER_NAMES:
    pal = TIER_PALETTES[name]
    border = make_nameplate_border(name, pal)
    border_frames.append(border)

sheet = hstack(border_frames)
write_png(os.path.join(PRESTIGE_DIR, 'ui_prestige_borders.png'), sheet)


# ─── 3. PRESTIGE RESET CONFIRMATION DIALOG (128×96) ────────────────────────
# Panel with title area, stat preview section, confirm/cancel buttons.
# Uses established UI panel frame style from existing HUD assets.

print('\n=== Prestige Reset Confirmation Dialog (128x96) ===')

def make_reset_dialog():
    """Generate the prestige reset confirmation dialog panel."""
    W, H = 128, 96
    img = blank(W, H)

    # Background fill — dark panel
    fill_rect(img, 0, 0, W, H, DK)

    # Outer frame (2px)
    draw_rect_outline(img, 0, 0, W, H, K)
    draw_rect_outline(img, 1, 1, W - 2, H - 2, ST)

    # Inner frame
    draw_rect_outline(img, 2, 2, W - 4, H - 4, MG)

    # Title bar background
    fill_rect(img, 3, 3, W - 6, 12, ST)
    draw_rect_outline(img, 3, 3, W - 6, 12, K)

    # Title text: "PRESTIGE RESET" — pixel font representation
    # Using 3x5 pixel glyphs, simplified
    title_glyphs = {
        'P': [(0,0),(1,0),(2,0),(0,1),(2,1),(0,2),(1,2),(2,2),(0,3),(0,4)],
        'R': [(0,0),(1,0),(2,0),(0,1),(2,1),(0,2),(1,2),(0,3),(2,3),(0,4),(2,4)],
        'E': [(0,0),(1,0),(2,0),(0,1),(0,2),(1,2),(0,3),(0,4),(1,4),(2,4)],
        'S': [(1,0),(2,0),(0,1),(1,2),(2,3),(0,4),(1,4)],
        'T': [(0,0),(1,0),(2,0),(1,1),(1,2),(1,3),(1,4)],
        'I': [(0,0),(1,0),(2,0),(1,1),(1,2),(1,3),(0,4),(1,4),(2,4)],
        'G': [(1,0),(2,0),(0,1),(0,2),(2,2),(0,3),(2,3),(1,4),(2,4)],
        ' ': [],
        '?': [(0,0),(1,0),(2,1),(1,2),(1,4)],
    }

    def draw_text(grid, text, start_x, start_y, color):
        x = start_x
        for ch in text:
            glyph = title_glyphs.get(ch, [])
            for (gx, gy) in glyph:
                set_px(grid, x + gx, start_y + gy, color)
            x += 4  # 3px glyph + 1px spacing

    # "PRESTIGE" on title bar
    draw_text(img, 'PRESTIGE', 16, 6, NW)
    # "RESET" after
    draw_text(img, 'RESET', 52, 6, GD)

    # Separator line
    for x in range(4, W - 4):
        set_px(img, x, 16, MG)

    # Stat preview section — "Level 50" indicator area
    # "LV" label
    draw_text(img, 'TIER', 8, 22, LS)

    # Tier icon placeholder (small shield outline)
    shield_x, shield_y = 40, 20
    draw_rect_outline(img, shield_x, shield_y, 10, 12, GD)
    fill_rect(img, shield_x + 1, shield_y + 1, 8, 10, DG)
    set_px(img, shield_x + 4, shield_y + 3, YL)
    set_px(img, shield_x + 5, shield_y + 3, YL)
    # Arrow pointing right
    for dy in range(-2, 3):
        set_px(img, 54, 26 + dy, NW)
    set_px(img, 55, 26, NW)
    set_px(img, 56, 26, NW)
    # Next tier placeholder
    draw_rect_outline(img, 60, 20, 10, 12, YL)
    fill_rect(img, 61, 21, 8, 10, GD)
    set_px(img, 64, 23, PY)
    set_px(img, 65, 23, PY)

    # Stats preview section
    stat_y = 36
    draw_text(img, 'RESET', 8, stat_y, LS)

    # "Level → 1" text area
    draw_text(img, 'TIER', 8, stat_y + 8, MG)

    # Rewards section header
    for x in range(4, W - 4):
        set_px(img, x, stat_y + 16, MG)

    # Reward items — small icons
    reward_y = stat_y + 20
    # Star icon
    set_px(img, 10, reward_y, YL)
    set_px(img, 9, reward_y + 1, YL)
    set_px(img, 10, reward_y + 1, GD)
    set_px(img, 11, reward_y + 1, YL)
    set_px(img, 10, reward_y + 2, YL)

    # Border icon
    draw_rect_outline(img, 20, reward_y - 1, 6, 5, GD)
    set_px(img, 22, reward_y + 1, YL)

    # Badge icon
    set_px(img, 34, reward_y - 1, GD)
    set_px(img, 33, reward_y, GD)
    set_px(img, 34, reward_y, YL)
    set_px(img, 35, reward_y, GD)
    set_px(img, 34, reward_y + 1, GD)

    # Confirm button — green
    btn_y = H - 22
    # Confirm
    fill_rect(img, 8, btn_y, 50, 14, DF)
    draw_rect_outline(img, 8, btn_y, 50, 14, K)
    draw_rect_outline(img, 9, btn_y + 1, 48, 12, FG)
    fill_rect(img, 10, btn_y + 2, 46, 10, LG)
    # "RESET" text on button
    draw_text(img, 'RESET', 18, btn_y + 5, NW)

    # Cancel button — red
    fill_rect(img, 70, btn_y, 50, 14, DB)
    draw_rect_outline(img, 70, btn_y, 50, 14, K)
    draw_rect_outline(img, 71, btn_y + 1, 48, 12, ER)
    fill_rect(img, 72, btn_y + 2, 46, 10, BR)
    # Placeholder "X" for cancel
    set_px(img, 92, btn_y + 4, NW)
    set_px(img, 93, btn_y + 5, NW)
    set_px(img, 94, btn_y + 6, NW)
    set_px(img, 95, btn_y + 7, NW)
    set_px(img, 95, btn_y + 4, NW)
    set_px(img, 94, btn_y + 5, NW)
    set_px(img, 93, btn_y + 6, NW)
    set_px(img, 92, btn_y + 7, NW)

    # Corner ornaments on dialog
    for (cx, cy) in [(2, 2), (W-3, 2), (2, H-3), (W-3, H-3)]:
        set_px(img, cx, cy, GD)

    return img

dialog = make_reset_dialog()
write_png(os.path.join(PRESTIGE_DIR, 'ui_panel_prestige_reset.png'), dialog)


# ─── 4. PRESTIGE BADGES (16×16 each) ───────────────────────────────────────
# Small badges for leaderboard entries. Compact shield/circle with tier color.

print('\n=== Prestige Badges (16x16 each) ===')

def make_badge(tier_name, palette):
    """Generate a 16×16 prestige badge for leaderboard."""
    out, dk, md, lt, hi = palette
    img = blank(16, 16)

    # Circular badge shape
    circle_rows = [
        (5,  10),  # y=2
        (4,  11),  # y=3
        (3,  12),  # y=4
        (2,  13),  # y=5
        (2,  13),  # y=6
        (2,  13),  # y=7
        (2,  13),  # y=8
        (2,  13),  # y=9
        (2,  13),  # y=10
        (3,  12),  # y=11
        (4,  11),  # y=12
        (5,  10),  # y=13
    ]

    base_y = 2
    for i, (xs, xe) in enumerate(circle_rows):
        y = base_y + i
        set_px(img, xs, y, out)
        set_px(img, xe, y, out)
        for x in range(xs + 1, xe):
            if x < xs + 2:
                set_px(img, x, y, lt)
            elif x > xe - 2:
                set_px(img, x, y, dk)
            else:
                set_px(img, x, y, md)

    # Top/bottom outline curve fill
    for x in range(5, 11):
        set_px(img, x, 1, out)
        set_px(img, x, 14, out)

    # Central gem dot
    set_px(img, 7, 7, hi)
    set_px(img, 8, 7, hi)
    set_px(img, 7, 8, hi)
    set_px(img, 8, 8, hi)

    # Cross highlight
    set_px(img, 7, 5, lt)
    set_px(img, 8, 5, lt)
    set_px(img, 7, 10, lt)
    set_px(img, 8, 10, lt)
    set_px(img, 5, 7, lt)
    set_px(img, 5, 8, lt)
    set_px(img, 10, 7, lt)
    set_px(img, 10, 8, lt)

    # Tier number
    tier_num = int(tier_name[-1])
    if tier_num == 2:
        # Two dots below center
        set_px(img, 6, 11, hi)
        set_px(img, 9, 11, hi)
    else:
        # One dot
        set_px(img, 7, 11, hi)

    return img


badges = []
for name in TIER_NAMES:
    pal = TIER_PALETTES[name]
    badge = make_badge(name, pal)
    badges.append(badge)

sheet = hstack(badges)
write_png(os.path.join(PRESTIGE_DIR, 'ui_prestige_badge.png'), sheet)


# ─── 5. STAR/CHEVRON INDICATORS (16×8 each) ────────────────────────────────
# Small indicators overlaid on character sprites to show prestige level.
# Tier 1: 1 chevron, Tier 2: 2 chevrons. Color matches tier.

print('\n=== Prestige Star/Chevron Indicators (16x8 each) ===')

def make_star_indicator(tier_name, palette):
    """Generate a 16×8 prestige indicator overlay for character sprites."""
    out, dk, md, lt, hi = palette
    img = blank(16, 8)

    tier_num = int(tier_name[-1])
    tier_base = tier_name[:-1]
    tier_rank = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].index(tier_base)

    if tier_num == 1:
        # Single chevron/star centered
        cx = 7
        # Small star shape
        set_px(img, cx, 1, hi)
        set_px(img, cx + 1, 1, hi)
        set_px(img, cx - 1, 2, lt)
        set_px(img, cx, 2, hi)
        set_px(img, cx + 1, 2, hi)
        set_px(img, cx + 2, 2, lt)
        set_px(img, cx - 2, 3, md)
        set_px(img, cx - 1, 3, lt)
        set_px(img, cx, 3, hi)
        set_px(img, cx + 1, 3, hi)
        set_px(img, cx + 2, 3, lt)
        set_px(img, cx + 3, 3, md)
        set_px(img, cx - 1, 4, lt)
        set_px(img, cx, 4, hi)
        set_px(img, cx + 1, 4, hi)
        set_px(img, cx + 2, 4, lt)
        set_px(img, cx, 5, lt)
        set_px(img, cx + 1, 5, lt)
        # Outline
        set_px(img, cx, 0, out)
        set_px(img, cx + 1, 0, out)
        set_px(img, cx - 1, 1, out)
        set_px(img, cx + 2, 1, out)
        set_px(img, cx - 3, 3, out)
        set_px(img, cx + 4, 3, out)
        set_px(img, cx - 1, 5, out)
        set_px(img, cx + 2, 5, out)
        set_px(img, cx, 6, out)
        set_px(img, cx + 1, 6, out)
    else:
        # Two chevrons/stars side by side
        for cx in [4, 10]:
            set_px(img, cx, 1, hi)
            set_px(img, cx + 1, 1, hi)
            set_px(img, cx - 1, 2, lt)
            set_px(img, cx, 2, hi)
            set_px(img, cx + 1, 2, hi)
            set_px(img, cx + 2, 2, lt)
            set_px(img, cx, 3, lt)
            set_px(img, cx + 1, 3, lt)
            set_px(img, cx - 1, 3, md)
            set_px(img, cx + 2, 3, md)
            set_px(img, cx, 4, md)
            set_px(img, cx + 1, 4, md)
            # Outline
            set_px(img, cx, 0, out)
            set_px(img, cx + 1, 0, out)
            set_px(img, cx - 1, 1, out)
            set_px(img, cx + 2, 1, out)
            set_px(img, cx - 2, 2, out)
            set_px(img, cx + 3, 2, out)
            set_px(img, cx - 1, 4, out)
            set_px(img, cx + 2, 4, out)
            set_px(img, cx, 5, out)
            set_px(img, cx + 1, 5, out)

    # Higher tiers get extra sparkle
    if tier_rank >= 3:
        set_px(img, 0, 3, hi)
        set_px(img, 15, 3, hi)
    if tier_rank >= 4:
        set_px(img, 1, 1, hi)
        set_px(img, 14, 1, hi)

    return img


stars = []
for name in TIER_NAMES:
    pal = TIER_PALETTES[name]
    star = make_star_indicator(name, pal)
    stars.append(star)

sheet = hstack(stars)
write_png(os.path.join(PRESTIGE_DIR, 'ui_prestige_stars.png'), sheet)


# ─── Summary ────────────────────────────────────────────────────────────────

print('\n=== All prestige assets generated ===')
print(f'Output directory: {PRESTIGE_DIR}')
print(f'Total individual tier icons: 10')
print(f'Combined spritesheet: ui_prestige_tier_icons.png (320x32)')
print(f'Nameplate borders:   ui_prestige_borders.png (320x24)')
print(f'Reset dialog:        ui_panel_prestige_reset.png (128x96)')
print(f'Leaderboard badges:  ui_prestige_badge.png (160x16)')
print(f'Star indicators:     ui_prestige_stars.png (160x8)')
