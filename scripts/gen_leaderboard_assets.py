#!/usr/bin/env python3
"""
Generate leaderboard and ranking UI art assets for PixelRealm (PIX-82).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md:
  - 32-color master palette only
  - Nearest-neighbor scaling
  - Consistent naming convention

Assets produced:
  Leaderboard panel (220×200):
    ui_panel_leaderboard.png         — main leaderboard backdrop

  Rank tier badges (32×32 each):
    icon_rank_bronze.png             — bronze rank badge
    icon_rank_silver.png             — silver rank badge
    icon_rank_gold.png               — gold rank badge
    icon_rank_platinum.png           — platinum rank badge
    icon_rank_diamond.png            — diamond rank badge

  Trophy/crown icons for top-3 (32×32 each):
    icon_trophy_1st.png              — gold trophy (#1)
    icon_trophy_2nd.png              — silver trophy (#2)
    icon_trophy_3rd.png              — bronze trophy (#3)

  Category icons (16×16 each):
    icon_cat_pvekills.png            — sword (PvE kills)
    icon_cat_quests.png              — scroll (quests)
    icon_cat_achievements.png        — star (achievements)
    icon_cat_crafting.png            — hammer (crafting)
    icon_cat_totalxp.png             — XP orb (total XP)

  Tab button sprites (60×16 each):
    ui_tab_daily_active.png          — active daily tab
    ui_tab_daily_inactive.png        — inactive daily tab
    ui_tab_weekly_active.png         — active weekly tab
    ui_tab_weekly_inactive.png       — inactive weekly tab
    ui_tab_alltime_active.png        — active all-time tab
    ui_tab_alltime_inactive.png      — inactive all-time tab

  Player highlight row (200×16):
    ui_row_highlight.png             — highlight bar for current player

  Rank change arrows (8×8 each):
    icon_arrow_up.png                — green up arrow
    icon_arrow_down.png              — red down arrow
    icon_arrow_same.png              — gray dash (no change)
"""

import struct
import zlib
import os
import shutil

SCRIPT_DIR = os.path.dirname(__file__)
ART_UI     = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui')
ART_LB     = os.path.join(ART_UI, 'leaderboard')
ART_PANELS = os.path.join(ART_UI, 'panels')
PUB_LB     = os.path.join(SCRIPT_DIR, '..', 'public', 'assets', 'ui', 'leaderboard')

for d in [ART_LB, ART_PANELS, PUB_LB]:
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

# ─── Tier palette aliases ────────────────────────────────────────────────────

BRONZE_DARK  = BN   # rich earth
BRONZE_MID   = DT   # dirt
BRONZE_LIGHT = SN   # sand

SILVER_DARK  = ST   # stone gray
SILVER_MID   = LS   # light stone
SILVER_LIGHT = PG   # pale gray

GOLD_DARK    = DG   # dark gold
GOLD_MID     = GD   # gold
GOLD_LIGHT   = YL   # bright yellow

PLAT_DARK    = HB   # ice
PLAT_MID     = IW   # shimmer
PLAT_LIGHT   = NW   # near white

DIAMOND_DARK  = DP   # ocean blue
DIAMOND_MID   = PB   # player blue
DIAMOND_LIGHT = HB   # ice / highlight

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


# ─── Drawing helpers ─────────────────────────────────────────────────────────

def blank(w, h, fill=_):
    return [[fill] * w for _ in range(h)]


def set_pixel(grid, x, y, color):
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color


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


def draw_line_h(grid, x, y, length, color):
    for i in range(length):
        set_pixel(grid, x + i, y, color)


def draw_line_v(grid, x, y, length, color):
    for i in range(length):
        set_pixel(grid, x, y + i, color)


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


def draw_diamond(grid, cx, cy, r, color):
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if abs(dx) + abs(dy) <= r:
                set_pixel(grid, cx + dx, cy + dy, color)


# ─── 1. LEADERBOARD PANEL (220×200) ─────────────────────────────────────────

def gen_panel_leaderboard():
    """220×200 leaderboard panel — trophy-room themed dark panel with gold trim."""
    W, H = 220, 200
    grid = blank(W, H)

    # Dark background fill
    BK = (0, 0, 0, 224)
    draw_rect(grid, 0, 0, W, H, BK)

    # Inner dark blue panel body
    draw_rect(grid, 3, 3, W - 6, H - 6, (8, 16, 36, 240))

    # Gold double-border frame (outer)
    draw_rect_outline(grid, 0, 0, W, H, K)
    draw_rect_outline(grid, 1, 1, W - 2, H - 2, DG)
    draw_rect_outline(grid, 2, 2, W - 4, H - 4, GD)

    # Inner gold accent line
    draw_rect_outline(grid, 5, 5, W - 10, H - 10, DG)

    # Corner trophy ornaments (4 corners — small gold diamond accent)
    for cx, cy in [(8, 8), (W - 9, 8), (8, H - 9), (W - 9, H - 9)]:
        set_pixel(grid, cx, cy, YL)
        set_pixel(grid, cx - 1, cy, GD)
        set_pixel(grid, cx + 1, cy, GD)
        set_pixel(grid, cx, cy - 1, GD)
        set_pixel(grid, cx, cy + 1, GD)

    # Title bar area (top 24px) — darker strip with gold underline
    draw_rect(grid, 6, 6, W - 12, 20, (4, 10, 28, 255))
    draw_line_h(grid, 6, 26, W - 12, DG)
    draw_line_h(grid, 6, 27, W - 12, GD)

    # Trophy silhouette in title bar center
    cx = W // 2
    # Cup body
    draw_rect(grid, cx - 4, 10, 9, 8, DG)
    draw_rect(grid, cx - 3, 10, 7, 7, GD)
    # Cup rim highlight
    draw_line_h(grid, cx - 3, 10, 7, YL)
    # Cup handles
    set_pixel(grid, cx - 5, 12, GD)
    set_pixel(grid, cx - 5, 13, GD)
    set_pixel(grid, cx - 5, 14, DG)
    set_pixel(grid, cx + 5, 12, GD)
    set_pixel(grid, cx + 5, 13, GD)
    set_pixel(grid, cx + 5, 14, DG)
    # Cup base
    draw_line_h(grid, cx - 2, 18, 5, DG)
    draw_line_h(grid, cx - 1, 19, 3, GD)
    draw_line_h(grid, cx - 3, 20, 7, DG)

    # Tab area (below title) — 3 tab slots
    tab_y = 30
    tab_w = 60
    for i in range(3):
        tx = 10 + i * (tab_w + 5)
        draw_rect(grid, tx, tab_y, tab_w, 14, (16, 28, 56, 255))
        draw_rect_outline(grid, tx, tab_y, tab_w, 14, DG)

    # Row area (list entries) — alternating stripe hints
    row_start = 48
    row_h = 18
    for i in range(7):
        ry = row_start + i * row_h
        if i % 2 == 0:
            draw_rect(grid, 8, ry, W - 16, row_h, (10, 20, 44, 200))
        else:
            draw_rect(grid, 8, ry, W - 16, row_h, (14, 26, 52, 200))
        # Subtle row separator
        draw_line_h(grid, 8, ry + row_h - 1, W - 16, (24, 40, 72, 180))

    # Footer area — navigation hint strip
    draw_rect(grid, 6, H - 22, W - 12, 16, (4, 10, 28, 255))
    draw_line_h(grid, 6, H - 23, W - 12, DG)

    # Scroll indicators at bottom
    # Up arrow hint
    set_pixel(grid, W // 2, H - 18, LS)
    set_pixel(grid, W // 2 - 1, H - 17, LS)
    set_pixel(grid, W // 2 + 1, H - 17, LS)
    set_pixel(grid, W // 2 - 2, H - 16, MG)
    set_pixel(grid, W // 2 + 2, H - 16, MG)

    path = os.path.join(ART_PANELS, 'ui_panel_leaderboard.png')
    write_png(path, grid)
    shutil.copy2(path, os.path.join(PUB_LB, 'ui_panel_leaderboard.png'))


# ─── 2. RANK TIER BADGES (32×32 each) ───────────────────────────────────────

def make_rank_badge(bg_color, border_dark, border_mid, border_light, emblem_fn=None):
    """32×32 shield-shaped rank badge with metallic border."""
    g = blank(32, 32)
    # Shield body — rounded top, pointed bottom
    # Top half: wide rounded rect
    for dy in range(0, 20):
        half_w = 13 if dy > 2 else (11 + dy)
        cx = 15
        for dx in range(-half_w, half_w + 1):
            set_pixel(g, cx + dx, 2 + dy, bg_color)
    # Bottom taper to point
    for dy in range(0, 10):
        half_w = 13 - int(dy * 1.4)
        if half_w < 0:
            half_w = 0
        cx = 15
        for dx in range(-half_w, half_w + 1):
            set_pixel(g, cx + dx, 22 + dy, bg_color)

    # Shield border — outline with metallic shading
    # Top edge
    for x in range(4, 28):
        set_pixel(g, x, 2, border_dark)
        set_pixel(g, x, 3, border_light)
    # Left/right edges
    for y in range(3, 22):
        set_pixel(g, 2, y, border_dark)
        set_pixel(g, 3, y, border_mid)
        set_pixel(g, 28, y, border_dark)
        set_pixel(g, 27, y, border_mid)
    # Bottom taper edges
    for dy in range(0, 10):
        half_w = 13 - int(dy * 1.4)
        if half_w < 1:
            break
        set_pixel(g, 15 - half_w - 1, 22 + dy, border_dark)
        set_pixel(g, 15 - half_w, 22 + dy, border_mid)
        set_pixel(g, 15 + half_w + 1, 22 + dy, border_dark)
        set_pixel(g, 15 + half_w, 22 + dy, border_mid)
    # Bottom point
    set_pixel(g, 15, 30, border_light)
    set_pixel(g, 15, 29, border_mid)

    # Top highlight arc
    for x in range(6, 26):
        set_pixel(g, x, 4, border_light)

    # Outer outline
    # Top row
    for x in range(3, 29):
        set_pixel(g, x, 1, K)
    set_pixel(g, 2, 2, K)
    set_pixel(g, 29, 2, K)
    # Sides
    for y in range(3, 22):
        set_pixel(g, 1, y, K)
        set_pixel(g, 29, y, K)
    # Bottom taper
    for dy in range(0, 10):
        half_w = 13 - int(dy * 1.4)
        if half_w < 1:
            break
        set_pixel(g, 15 - half_w - 2, 22 + dy, K)
        set_pixel(g, 15 + half_w + 2, 22 + dy, K)
    set_pixel(g, 15, 31, K)
    set_pixel(g, 14, 30, K)
    set_pixel(g, 16, 30, K)

    if emblem_fn:
        emblem_fn(g)
    return g


def emblem_star(g):
    """Small 5-point star emblem in center of badge."""
    cx, cy = 15, 14
    # Star center
    set_pixel(g, cx, cy, NW)
    # Star arms
    set_pixel(g, cx, cy - 3, NW)
    set_pixel(g, cx, cy - 2, PG)
    set_pixel(g, cx, cy - 1, PG)
    set_pixel(g, cx, cy + 1, PG)
    set_pixel(g, cx, cy + 2, PG)
    set_pixel(g, cx - 3, cy, NW)
    set_pixel(g, cx - 2, cy, PG)
    set_pixel(g, cx - 1, cy, PG)
    set_pixel(g, cx + 1, cy, PG)
    set_pixel(g, cx + 2, cy, PG)
    set_pixel(g, cx + 3, cy, NW)
    # Diagonal arms
    set_pixel(g, cx - 2, cy - 2, PG)
    set_pixel(g, cx + 2, cy - 2, PG)
    set_pixel(g, cx - 2, cy + 2, PG)
    set_pixel(g, cx + 2, cy + 2, PG)
    set_pixel(g, cx - 1, cy - 1, NW)
    set_pixel(g, cx + 1, cy - 1, NW)
    set_pixel(g, cx - 1, cy + 1, NW)
    set_pixel(g, cx + 1, cy + 1, NW)


def gen_rank_badges():
    """Generate 5 rank tier badges: Bronze, Silver, Gold, Platinum, Diamond."""
    tiers = [
        ('bronze',   (80, 48, 24, 255),   BRONZE_DARK, BRONZE_MID, BRONZE_LIGHT),
        ('silver',   (56, 56, 64, 255),   SILVER_DARK, SILVER_MID, SILVER_LIGHT),
        ('gold',     (80, 60, 8, 255),    GOLD_DARK,   GOLD_MID,   GOLD_LIGHT),
        ('platinum', (40, 56, 72, 255),   PLAT_DARK,   PLAT_MID,   PLAT_LIGHT),
        ('diamond',  (16, 40, 80, 255),   DIAMOND_DARK, DIAMOND_MID, DIAMOND_LIGHT),
    ]
    for name, bg, bd, bm, bl in tiers:
        g = make_rank_badge(bg, bd, bm, bl, emblem_star)
        path = os.path.join(ART_LB, f'icon_rank_{name}.png')
        write_png(path, g)
        shutil.copy2(path, os.path.join(PUB_LB, f'icon_rank_{name}.png'))


# ─── 3. TROPHY / CROWN ICONS (32×32) ────────────────────────────────────────

def gen_trophy(body_dark, body_mid, body_light, accent):
    """32×32 trophy cup icon."""
    g = blank(32, 32)
    cx = 15

    # Cup rim
    draw_rect(g, cx - 7, 4, 15, 2, body_light)
    draw_line_h(g, cx - 7, 3, 15, body_mid)

    # Cup body (tapers down)
    for dy in range(0, 12):
        taper = dy // 3
        left = cx - 6 + taper
        width = 13 - taper * 2
        if width < 3:
            width = 3
            left = cx - 1
        draw_line_h(g, left, 6 + dy, width, body_mid)
    # Body highlights
    for dy in range(0, 10):
        taper = dy // 3
        set_pixel(g, cx - 5 + taper, 6 + dy, body_light)

    # Cup handles
    for dy in range(0, 5):
        set_pixel(g, cx - 8, 6 + dy, body_dark)
        set_pixel(g, cx - 9, 7 + dy, body_dark)
        set_pixel(g, cx + 8, 6 + dy, body_dark)
        set_pixel(g, cx + 9, 7 + dy, body_dark)
    set_pixel(g, cx - 8, 11, body_dark)
    set_pixel(g, cx + 8, 11, body_dark)

    # Stem
    draw_rect(g, cx - 1, 18, 3, 4, body_dark)
    set_pixel(g, cx, 18, body_mid)
    set_pixel(g, cx, 19, body_mid)

    # Base
    draw_rect(g, cx - 5, 22, 11, 2, body_dark)
    draw_line_h(g, cx - 5, 22, 11, body_mid)
    draw_rect(g, cx - 6, 24, 13, 2, body_dark)
    draw_line_h(g, cx - 6, 24, 13, body_mid)

    # Star accent on cup face
    set_pixel(g, cx, 9, accent)
    set_pixel(g, cx - 1, 10, accent)
    set_pixel(g, cx + 1, 10, accent)
    set_pixel(g, cx, 11, accent)

    # Outline
    # Top rim outline
    draw_line_h(g, cx - 8, 2, 17, K)
    set_pixel(g, cx - 8, 3, K)
    set_pixel(g, cx + 8, 3, K)
    set_pixel(g, cx - 8, 4, K)
    set_pixel(g, cx + 8, 4, K)
    set_pixel(g, cx - 8, 5, K)
    set_pixel(g, cx + 8, 5, K)
    # Handle outlines
    set_pixel(g, cx - 10, 7, K)
    set_pixel(g, cx - 10, 8, K)
    set_pixel(g, cx - 10, 9, K)
    set_pixel(g, cx - 10, 10, K)
    set_pixel(g, cx - 10, 11, K)
    set_pixel(g, cx + 10, 7, K)
    set_pixel(g, cx + 10, 8, K)
    set_pixel(g, cx + 10, 9, K)
    set_pixel(g, cx + 10, 10, K)
    set_pixel(g, cx + 10, 11, K)
    # Base outline
    draw_line_h(g, cx - 7, 26, 15, K)

    return g


def gen_trophies():
    """Generate trophy icons for 1st, 2nd, 3rd place."""
    configs = [
        ('1st', GOLD_DARK, GOLD_MID, GOLD_LIGHT, YL),
        ('2nd', SILVER_DARK, SILVER_MID, SILVER_LIGHT, NW),
        ('3rd', BRONZE_DARK, BRONZE_MID, BRONZE_LIGHT, PS),
    ]
    for name, bd, bm, bl, accent in configs:
        g = gen_trophy(bd, bm, bl, accent)

        # Number emblem on cup (above star)
        cx = 15
        if name == '1st':
            # "1" in bright yellow
            set_pixel(g, cx, 6, PY)
            set_pixel(g, cx, 7, PY)
            set_pixel(g, cx - 1, 6, PY)
        elif name == '2nd':
            # "2" simplified
            draw_line_h(g, cx - 1, 6, 3, NW)
            set_pixel(g, cx + 1, 7, NW)
            set_pixel(g, cx, 8, NW)
        elif name == '3rd':
            # "3" simplified
            draw_line_h(g, cx - 1, 6, 3, PS)
            set_pixel(g, cx + 1, 7, PS)
            draw_line_h(g, cx - 1, 8, 3, PS)

        path = os.path.join(ART_LB, f'icon_trophy_{name}.png')
        write_png(path, g)
        shutil.copy2(path, os.path.join(PUB_LB, f'icon_trophy_{name}.png'))


# ─── 4. CATEGORY ICONS (16×16) ──────────────────────────────────────────────

def gen_cat_pvekills():
    """16×16 sword icon for PvE kills category."""
    g = blank(16, 16)
    # Dark circle background
    draw_circle_filled(g, 7, 7, 7, OC)
    draw_circle_outline(g, 7, 7, 7, K)
    # Blade (diagonal from top-right to center)
    set_pixel(g, 10, 2, NW)
    set_pixel(g, 9, 3, PG)
    set_pixel(g, 8, 4, LS)
    set_pixel(g, 7, 5, LS)
    set_pixel(g, 6, 6, LS)
    set_pixel(g, 5, 7, MG)
    # Cross guard
    set_pixel(g, 3, 7, DG)
    set_pixel(g, 4, 8, GD)
    set_pixel(g, 6, 6, GD)
    set_pixel(g, 7, 5, GD)
    # Grip
    set_pixel(g, 4, 9, BN)
    set_pixel(g, 3, 10, DT)
    # Pommel
    set_pixel(g, 2, 11, DG)
    # Accent border
    draw_circle_outline(g, 7, 7, 6, ER)
    return g


def gen_cat_quests():
    """16×16 scroll icon for quests category."""
    g = blank(16, 16)
    draw_circle_filled(g, 7, 7, 7, OC)
    draw_circle_outline(g, 7, 7, 7, K)
    # Scroll body
    draw_rect(g, 4, 4, 8, 8, PS)
    draw_rect(g, 5, 5, 6, 6, SN)
    # Scroll top/bottom rolls
    draw_line_h(g, 4, 3, 8, DT)
    draw_line_h(g, 4, 12, 8, DT)
    draw_line_h(g, 4, 4, 8, SN)
    draw_line_h(g, 4, 11, 8, SN)
    # Text lines
    draw_line_h(g, 5, 6, 5, BN)
    draw_line_h(g, 5, 8, 4, BN)
    draw_line_h(g, 5, 10, 3, BN)
    # Accent
    draw_circle_outline(g, 7, 7, 6, DS)
    return g


def gen_cat_achievements():
    """16×16 star icon for achievements category."""
    g = blank(16, 16)
    draw_circle_filled(g, 7, 7, 7, OC)
    draw_circle_outline(g, 7, 7, 7, K)
    # 5-point star
    cx, cy = 7, 7
    set_pixel(g, cx, cy, YL)
    # Top
    set_pixel(g, cx, cy - 1, YL)
    set_pixel(g, cx, cy - 2, GD)
    set_pixel(g, cx, cy - 3, GD)
    set_pixel(g, cx, cy - 4, DG)
    # Bottom-left
    set_pixel(g, cx - 1, cy + 1, YL)
    set_pixel(g, cx - 2, cy + 2, GD)
    set_pixel(g, cx - 3, cy + 3, DG)
    # Bottom-right
    set_pixel(g, cx + 1, cy + 1, YL)
    set_pixel(g, cx + 2, cy + 2, GD)
    set_pixel(g, cx + 3, cy + 3, DG)
    # Top-left
    set_pixel(g, cx - 1, cy - 1, GD)
    set_pixel(g, cx - 2, cy, GD)
    set_pixel(g, cx - 3, cy, DG)
    set_pixel(g, cx - 4, cy, DG)
    # Top-right
    set_pixel(g, cx + 1, cy - 1, GD)
    set_pixel(g, cx + 2, cy, GD)
    set_pixel(g, cx + 3, cy, DG)
    set_pixel(g, cx + 4, cy, DG)
    # Fill center
    set_pixel(g, cx - 1, cy, YL)
    set_pixel(g, cx + 1, cy, YL)
    # Accent
    draw_circle_outline(g, 7, 7, 6, GD)
    return g


def gen_cat_crafting():
    """16×16 hammer icon for crafting category."""
    g = blank(16, 16)
    draw_circle_filled(g, 7, 7, 7, OC)
    draw_circle_outline(g, 7, 7, 7, K)
    # Hammer head
    draw_rect(g, 4, 3, 7, 3, LS)
    draw_rect(g, 4, 3, 7, 1, PG)
    draw_line_h(g, 4, 5, 7, MG)
    # Handle
    draw_line_v(g, 7, 6, 6, DT)
    draw_line_v(g, 8, 6, 6, BN)
    # Accent
    draw_circle_outline(g, 7, 7, 6, SN)
    return g


def gen_cat_totalxp():
    """16×16 XP orb icon for total XP category."""
    g = blank(16, 16)
    draw_circle_filled(g, 7, 7, 7, OC)
    draw_circle_outline(g, 7, 7, 7, K)
    # XP orb (glowing purple/magic circle)
    draw_circle_filled(g, 7, 7, 4, MP)
    draw_circle_filled(g, 7, 7, 3, MV)
    draw_circle_filled(g, 7, 7, 1, SG)
    set_pixel(g, 7, 7, NW)
    # Glow rays
    set_pixel(g, 7, 2, SG)
    set_pixel(g, 7, 12, SG)
    set_pixel(g, 2, 7, SG)
    set_pixel(g, 12, 7, SG)
    # Accent
    draw_circle_outline(g, 7, 7, 6, MV)
    return g


def gen_category_icons():
    """Generate all 5 category icons."""
    icons = [
        ('pvekills', gen_cat_pvekills),
        ('quests', gen_cat_quests),
        ('achievements', gen_cat_achievements),
        ('crafting', gen_cat_crafting),
        ('totalxp', gen_cat_totalxp),
    ]
    for name, fn in icons:
        g = fn()
        path = os.path.join(ART_LB, f'icon_cat_{name}.png')
        write_png(path, g)
        shutil.copy2(path, os.path.join(PUB_LB, f'icon_cat_{name}.png'))


# ─── 5. TAB BUTTON SPRITES (60×16) ──────────────────────────────────────────

def make_tab(label_pixels, active=True):
    """60×16 tab button. label_pixels is list of (x,y) offsets for text dots."""
    W, H = 60, 16
    g = blank(W, H)

    if active:
        # Active tab — gold border, lit background
        draw_rect(g, 0, 0, W, H, (16, 32, 64, 255))
        draw_rect_outline(g, 0, 0, W, H, GD)
        draw_line_h(g, 1, 1, W - 2, YL)   # top highlight
        # Bottom open (connected to content)
        draw_line_h(g, 1, H - 1, W - 2, (16, 32, 64, 255))
        text_color = YL
    else:
        # Inactive tab — dark, muted border
        draw_rect(g, 0, 0, W, H, (8, 16, 36, 200))
        draw_rect_outline(g, 0, 0, W, H, DK)
        text_color = MG

    # Draw label pixels
    for px, py in label_pixels:
        set_pixel(g, px, py, text_color)

    return g


# Simple 3×5 pixel font for tab labels
def char_D():
    return [(0,0),(1,0),(0,1),(2,1),(0,2),(2,2),(0,3),(2,3),(0,4),(1,4)]
def char_A():
    return [(1,0),(0,1),(2,1),(0,2),(1,2),(2,2),(0,3),(2,3),(0,4),(2,4)]
def char_I():
    return [(0,0),(1,0),(2,0),(1,1),(1,2),(1,3),(0,4),(1,4),(2,4)]
def char_L():
    return [(0,0),(0,1),(0,2),(0,3),(0,4),(1,4),(2,4)]
def char_Y():
    return [(0,0),(2,0),(0,1),(2,1),(1,2),(1,3),(1,4)]
def char_W():
    return [(0,0),(2,0),(4,0),(0,1),(2,1),(4,1),(0,2),(2,2),(4,2),(0,3),(1,3),(3,3),(4,3),(0,4),(4,4)]
def char_E():
    return [(0,0),(1,0),(2,0),(0,1),(0,2),(1,2),(2,2),(0,3),(0,4),(1,4),(2,4)]
def char_K():
    return [(0,0),(2,0),(0,1),(1,1),(0,2),(1,2),(0,3),(1,3),(0,4),(2,4)]
def char_T():
    return [(0,0),(1,0),(2,0),(1,1),(1,2),(1,3),(1,4)]
def char_M():
    return [(0,0),(4,0),(0,1),(1,1),(3,1),(4,1),(0,2),(2,2),(4,2),(0,3),(4,3),(0,4),(4,4)]
def char_DASH():
    return [(0,2),(1,2),(2,2)]


def offset_char(char_pts, ox, oy):
    return [(ox + x, oy + y) for x, y in char_pts]


def make_label(chars, start_x, start_y, spacing=4):
    """Build pixel list for a word from character definitions."""
    pts = []
    x = start_x
    for ch_fn in chars:
        ch = ch_fn()
        max_x = max(px for px, _ in ch)
        pts.extend(offset_char(ch, x, start_y))
        x += max_x + spacing
    return pts


def gen_tab_sprites():
    """Generate tab sprites for Daily / Weekly / All-Time."""
    # Center text vertically: (16 - 5) // 2 = 5, horizontally calculated per word
    # "DAILY" — 5 chars
    daily_label = make_label([char_D, char_A, char_I, char_L, char_Y], 12, 5)
    # "WEEKLY" — 6 chars
    weekly_label = make_label([char_W, char_E, char_E, char_K, char_L, char_Y], 5, 5)
    # "ALL-TIME" — abbreviate since W is 5px wide
    alltime_label = make_label([char_A, char_L, char_L, char_DASH, char_T, char_I, char_M, char_E], 3, 5, spacing=3)

    tabs = [
        ('daily', daily_label),
        ('weekly', weekly_label),
        ('alltime', alltime_label),
    ]
    for name, label in tabs:
        for active in [True, False]:
            suffix = 'active' if active else 'inactive'
            g = make_tab(label, active=active)
            path = os.path.join(ART_LB, f'ui_tab_{name}_{suffix}.png')
            write_png(path, g)
            shutil.copy2(path, os.path.join(PUB_LB, f'ui_tab_{name}_{suffix}.png'))


# ─── 6. PLAYER HIGHLIGHT ROW (200×16) ───────────────────────────────────────

def gen_row_highlight():
    """200×16 semi-transparent highlight bar for current player row."""
    W, H = 200, 16
    g = blank(W, H)
    # Gradient blue highlight — brighter in center
    for y in range(H):
        for x in range(W):
            # Distance from center Y
            dy = abs(y - H // 2)
            alpha = max(60, 140 - dy * 20)
            g[y][x] = (42, 122, 192, alpha)
    # Top/bottom bright edges
    for x in range(W):
        g[0][x] = (80, 168, 232, 160)
        g[H - 1][x] = (80, 168, 232, 160)
    # Gold left accent stripe
    for y in range(H):
        g[y][0] = (232, 184, 0, 200)
        g[y][1] = (168, 112, 0, 160)

    path = os.path.join(ART_LB, 'ui_row_highlight.png')
    write_png(path, g)
    shutil.copy2(path, os.path.join(PUB_LB, 'ui_row_highlight.png'))


# ─── 7. RANK CHANGE ARROWS (8×8) ────────────────────────────────────────────

def gen_arrow_up():
    """8×8 green up arrow."""
    g = blank(8, 8)
    # Arrow pointing up
    set_pixel(g, 3, 1, LG)
    set_pixel(g, 4, 1, LG)
    set_pixel(g, 2, 2, FG)
    set_pixel(g, 3, 2, LG)
    set_pixel(g, 4, 2, LG)
    set_pixel(g, 5, 2, FG)
    set_pixel(g, 1, 3, FG)
    set_pixel(g, 2, 3, LG)
    set_pixel(g, 5, 3, LG)
    set_pixel(g, 6, 3, FG)
    # Shaft
    set_pixel(g, 3, 4, FG)
    set_pixel(g, 4, 4, FG)
    set_pixel(g, 3, 5, FG)
    set_pixel(g, 4, 5, FG)
    set_pixel(g, 3, 6, DF)
    set_pixel(g, 4, 6, DF)
    return g


def gen_arrow_down():
    """8×8 red down arrow."""
    g = blank(8, 8)
    # Shaft
    set_pixel(g, 3, 1, DB)
    set_pixel(g, 4, 1, DB)
    set_pixel(g, 3, 2, ER)
    set_pixel(g, 4, 2, ER)
    set_pixel(g, 3, 3, ER)
    set_pixel(g, 4, 3, ER)
    # Arrow pointing down
    set_pixel(g, 1, 4, ER)
    set_pixel(g, 2, 4, BR)
    set_pixel(g, 5, 4, BR)
    set_pixel(g, 6, 4, ER)
    set_pixel(g, 2, 5, ER)
    set_pixel(g, 3, 5, BR)
    set_pixel(g, 4, 5, BR)
    set_pixel(g, 5, 5, ER)
    set_pixel(g, 3, 6, BR)
    set_pixel(g, 4, 6, BR)
    return g


def gen_arrow_same():
    """8×8 gray dash for no rank change."""
    g = blank(8, 8)
    draw_line_h(g, 2, 3, 4, MG)
    draw_line_h(g, 2, 4, 4, ST)
    return g


def gen_arrows():
    """Generate rank change arrow indicators."""
    arrows = [
        ('up', gen_arrow_up),
        ('down', gen_arrow_down),
        ('same', gen_arrow_same),
    ]
    for name, fn in arrows:
        g = fn()
        path = os.path.join(ART_LB, f'icon_arrow_{name}.png')
        write_png(path, g)
        shutil.copy2(path, os.path.join(PUB_LB, f'icon_arrow_{name}.png'))


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print('Generating leaderboard assets (PIX-82)...\n')

    print('1. Leaderboard panel:')
    gen_panel_leaderboard()

    print('\n2. Rank tier badges:')
    gen_rank_badges()

    print('\n3. Trophy icons:')
    gen_trophies()

    print('\n4. Category icons:')
    gen_category_icons()

    print('\n5. Tab button sprites:')
    gen_tab_sprites()

    print('\n6. Player highlight row:')
    gen_row_highlight()

    print('\n7. Rank change arrows:')
    gen_arrows()

    # Count total assets
    count = 0
    for root, dirs, files in os.walk(ART_LB):
        count += sum(1 for f in files if f.endswith('.png'))
    # Panel is in panels dir
    count += 1
    print(f'\nDone! Generated {count} leaderboard assets.')
    print(f'  Assets dir:  {os.path.abspath(ART_LB)}')
    print(f'  Panels dir:  {os.path.abspath(ART_PANELS)}')
    print(f'  Public dir:  {os.path.abspath(PUB_LB)}')


if __name__ == '__main__':
    main()
