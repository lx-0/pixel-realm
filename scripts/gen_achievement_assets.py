#!/usr/bin/env python3
"""
Generate achievement and progression art assets for PixelRealm (PIX-76).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md:
  - 32-color master palette only
  - Nearest-neighbor scaling
  - Consistent naming convention

Assets produced:
  Achievement category icons (32×32 each):
    icon_achieve_cat_combat.png       — sword icon
    icon_achieve_cat_exploration.png  — compass icon
    icon_achieve_cat_crafting.png     — anvil icon
    icon_achieve_cat_social.png       — handshake icon
    icon_achieve_cat_questing.png     — scroll icon

  Tier badge frames (32×32 each):
    icon_achieve_tier_bronze.png      — bronze circular frame
    icon_achieve_tier_silver.png      — silver circular frame
    icon_achieve_tier_gold.png        — gold circular frame
    icon_achieve_tier_platinum.png    — platinum circular frame

  Unlock notification popup (160×48):
    ui_achieve_popup_bg.png           — notification banner

  Achievement panel (220×200):
    ui_panel_achievements.png         — main panel background

  Progress bar textures:
    ui_achieve_bar_bg.png             — 64×8 bar background
    ui_achieve_bar_fill.png           — 64×8 bar fill

  Achievement points counter icon (16×16):
    icon_achieve_points.png           — star/trophy icon

  Locked achievement overlay (32×32):
    icon_achieve_locked.png           — padlock overlay

  Individual achievement milestone icons (32×32 each):
    icon_achieve_first_kill.png       — skull (first enemy killed)
    icon_achieve_first_craft.png      — hammer & anvil (first craft)
    icon_achieve_zone_discovered.png  — map pin (zone discovery)
    icon_achieve_level_10.png         — level badge
    icon_achieve_100_enemies.png      — crossed swords (100 kills)
    icon_achieve_trader.png           — coin stack (first trade)
    icon_achieve_guild_join.png       — banner (join a guild)
    icon_achieve_boss_slain.png       — crowned skull (boss kill)
    icon_achieve_collector.png        — treasure chest
    icon_achieve_explorer.png         — compass rose (all zones)
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
ART_UI     = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui')
ART_ACHIEVE = os.path.join(ART_UI, 'achievements')
ART_ICONS  = os.path.join(ART_UI, 'icons')
ART_PANELS = os.path.join(ART_UI, 'panels')

for d in [ART_ACHIEVE, ART_ICONS, ART_PANELS]:
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

# ─── Bronze / Silver / Platinum derived from palette ─────────────────────────

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


# ─── Icon base frame (circular badge, 32×32) ────────────────────────────────

def make_badge_frame(bg_color, border_dark, border_mid, border_light):
    """32×32 circular badge frame with metallic border."""
    g = blank(32, 32)
    # Filled circle background
    draw_circle_filled(g, 15, 15, 13, bg_color)
    # Outer border ring
    draw_circle_outline(g, 15, 15, 13, border_dark)
    draw_circle_outline(g, 15, 15, 14, border_dark)
    # Inner highlight ring (top-left lit)
    for dy in range(-12, 13):
        for dx in range(-12, 13):
            dist_sq = dx * dx + dy * dy
            if 132 <= dist_sq <= 156:
                if dx + dy < -4:
                    set_pixel(g, 15 + dx, 15 + dy, border_light)
                elif dx + dy < 4:
                    set_pixel(g, 15 + dx, 15 + dy, border_mid)
    # Outline ring
    draw_circle_outline(g, 15, 15, 15, K)
    return g


def make_category_icon_base(accent_color):
    """32×32 category icon with dark blue background and accent ring."""
    g = blank(32, 32)
    draw_circle_filled(g, 15, 15, 13, OC)
    draw_circle_outline(g, 15, 15, 13, accent_color)
    draw_circle_outline(g, 15, 15, 14, K)
    draw_circle_outline(g, 15, 15, 15, K)
    return g


# ─── 1. ACHIEVEMENT CATEGORY ICONS (32×32) ──────────────────────────────────

def gen_cat_combat():
    """Combat category — sword pointing up."""
    g = make_category_icon_base(ER)
    # Blade
    draw_line_v(g, 15, 5, 14, LS)
    draw_line_v(g, 16, 5, 14, PG)
    # Blade tip
    set_pixel(g, 15, 4, PG)
    set_pixel(g, 16, 4, NW)
    # Blade edge highlight
    draw_line_v(g, 14, 6, 12, MG)
    # Cross guard
    draw_line_h(g, 11, 19, 10, DG)
    draw_line_h(g, 11, 20, 10, GD)
    # Grip
    draw_line_v(g, 15, 21, 4, BN)
    draw_line_v(g, 16, 21, 4, DT)
    # Pommel
    set_pixel(g, 14, 25, DG)
    set_pixel(g, 15, 25, GD)
    set_pixel(g, 16, 25, GD)
    set_pixel(g, 17, 25, DG)
    set_pixel(g, 15, 26, DG)
    set_pixel(g, 16, 26, DG)
    return g


def gen_cat_exploration():
    """Exploration category — compass."""
    g = make_category_icon_base(SB)
    cx, cy = 15, 15
    # Compass body
    draw_circle_filled(g, cx, cy, 8, DK)
    draw_circle_outline(g, cx, cy, 8, SN)
    draw_circle_outline(g, cx, cy, 9, DT)
    # Cardinal dots
    set_pixel(g, cx, cy - 7, NW)  # N
    set_pixel(g, cx, cy + 7, MG)  # S
    set_pixel(g, cx - 7, cy, MG)  # W
    set_pixel(g, cx + 7, cy, MG)  # E
    # Needle — north (red triangle)
    set_pixel(g, cx, cy - 5, BR)
    set_pixel(g, cx, cy - 4, BR)
    set_pixel(g, cx - 1, cy - 3, ER)
    set_pixel(g, cx, cy - 3, BR)
    set_pixel(g, cx + 1, cy - 3, ER)
    set_pixel(g, cx - 1, cy - 2, ER)
    set_pixel(g, cx, cy - 2, BR)
    set_pixel(g, cx + 1, cy - 2, ER)
    # Needle — south (white triangle)
    set_pixel(g, cx, cy + 5, PG)
    set_pixel(g, cx, cy + 4, PG)
    set_pixel(g, cx - 1, cy + 3, LS)
    set_pixel(g, cx, cy + 3, PG)
    set_pixel(g, cx + 1, cy + 3, LS)
    set_pixel(g, cx - 1, cy + 2, LS)
    set_pixel(g, cx, cy + 2, PG)
    set_pixel(g, cx + 1, cy + 2, LS)
    # Center pivot
    set_pixel(g, cx, cy, GD)
    set_pixel(g, cx - 1, cy, DG)
    set_pixel(g, cx + 1, cy, DG)
    set_pixel(g, cx, cy - 1, DG)
    set_pixel(g, cx, cy + 1, DG)
    return g


def gen_cat_crafting():
    """Crafting category — anvil."""
    g = make_category_icon_base(DT)
    # Anvil top surface
    draw_rect(g, 9, 10, 14, 3, LS)
    draw_line_h(g, 10, 9, 12, PG)
    # Anvil horn (left)
    draw_rect(g, 7, 10, 2, 2, MG)
    set_pixel(g, 6, 11, ST)
    # Anvil body
    draw_rect(g, 11, 13, 10, 5, ST)
    draw_rect(g, 12, 13, 8, 5, MG)
    # Anvil base
    draw_rect(g, 9, 18, 14, 2, ST)
    draw_rect(g, 10, 18, 12, 2, MG)
    # Legs
    draw_rect(g, 10, 20, 3, 3, DK)
    draw_rect(g, 19, 20, 3, 3, DK)
    # Highlight on top
    draw_line_h(g, 11, 9, 10, NW)
    # Hammer (small, resting on anvil)
    draw_rect(g, 14, 6, 4, 3, SN)
    draw_rect(g, 14, 6, 4, 1, DS)
    draw_line_v(g, 16, 6, 5, BN)
    return g


def gen_cat_social():
    """Social category — two figures / handshake."""
    g = make_category_icon_base(FG)
    # Left figure (head + body)
    draw_circle_filled(g, 11, 9, 2, PB)
    draw_rect(g, 9, 12, 5, 5, PB)
    draw_rect(g, 10, 17, 3, 3, DP)
    # Right figure (head + body)
    draw_circle_filled(g, 20, 9, 2, LG)
    draw_rect(g, 18, 12, 5, 5, LG)
    draw_rect(g, 19, 17, 3, 3, FG)
    # Handshake in the middle — overlapping arms
    draw_line_h(g, 13, 15, 2, PB)
    draw_line_h(g, 15, 15, 2, SN)
    draw_line_h(g, 17, 15, 2, LG)
    draw_line_h(g, 13, 16, 2, DP)
    draw_line_h(g, 15, 16, 2, DT)
    draw_line_h(g, 17, 16, 2, FG)
    # Shake clasp
    draw_rect(g, 14, 14, 4, 1, SN)
    return g


def gen_cat_questing():
    """Questing category — scroll."""
    g = make_category_icon_base(GD)
    # Scroll body
    draw_rect(g, 11, 8, 10, 16, PS)
    draw_rect(g, 12, 9, 8, 14, NW)
    # Top roll
    draw_rect(g, 10, 7, 12, 2, SN)
    draw_line_h(g, 10, 6, 12, DT)
    set_pixel(g, 10, 7, DT)
    set_pixel(g, 21, 7, DT)
    # Bottom roll
    draw_rect(g, 10, 24, 12, 2, SN)
    draw_line_h(g, 10, 26, 12, DT)
    set_pixel(g, 10, 24, DT)
    set_pixel(g, 21, 24, DT)
    # Text lines on scroll
    draw_line_h(g, 13, 11, 6, MG)
    draw_line_h(g, 13, 13, 5, MG)
    draw_line_h(g, 13, 15, 6, MG)
    draw_line_h(g, 13, 17, 4, MG)
    draw_line_h(g, 13, 19, 6, MG)
    draw_line_h(g, 13, 21, 3, MG)
    # Quest exclamation mark (gold)
    set_pixel(g, 16, 10, GD)
    return g


# ─── 2. TIER BADGE FRAMES (32×32) ───────────────────────────────────────────

def gen_tier_bronze():
    g = make_badge_frame(BD, BRONZE_DARK, BRONZE_MID, BRONZE_LIGHT)
    # Star emblem center
    draw_diamond(g, 15, 15, 4, BRONZE_LIGHT)
    draw_diamond(g, 15, 15, 3, BRONZE_MID)
    draw_diamond(g, 15, 15, 1, BRONZE_DARK)
    return g


def gen_tier_silver():
    g = make_badge_frame(DK, SILVER_DARK, SILVER_MID, SILVER_LIGHT)
    # Star emblem center
    draw_diamond(g, 15, 15, 4, SILVER_LIGHT)
    draw_diamond(g, 15, 15, 3, SILVER_MID)
    draw_diamond(g, 15, 15, 1, SILVER_DARK)
    # Extra sparkle
    set_pixel(g, 15, 9, NW)
    set_pixel(g, 15, 21, NW)
    set_pixel(g, 9, 15, NW)
    set_pixel(g, 21, 15, NW)
    return g


def gen_tier_gold():
    g = make_badge_frame(BD, GOLD_DARK, GOLD_MID, GOLD_LIGHT)
    # Star emblem center
    draw_diamond(g, 15, 15, 5, GOLD_LIGHT)
    draw_diamond(g, 15, 15, 4, GOLD_MID)
    draw_diamond(g, 15, 15, 2, GOLD_DARK)
    # Crown points at top
    set_pixel(g, 13, 5, GD)
    set_pixel(g, 15, 4, YL)
    set_pixel(g, 17, 5, GD)
    # Sparkles
    set_pixel(g, 15, 8, PY)
    set_pixel(g, 15, 22, PY)
    set_pixel(g, 8, 15, PY)
    set_pixel(g, 22, 15, PY)
    return g


def gen_tier_platinum():
    g = make_badge_frame(OC, PLAT_DARK, PLAT_MID, PLAT_LIGHT)
    # Star emblem center — bright
    draw_diamond(g, 15, 15, 5, PLAT_LIGHT)
    draw_diamond(g, 15, 15, 4, PLAT_MID)
    draw_diamond(g, 15, 15, 2, PLAT_DARK)
    # Radiating lines (platinum glow)
    for i in range(4, 8):
        set_pixel(g, 15, 15 - i, IW)
        set_pixel(g, 15, 15 + i, IW)
        set_pixel(g, 15 - i, 15, IW)
        set_pixel(g, 15 + i, 15, IW)
    # Corner sparkles
    set_pixel(g, 7, 7, NW)
    set_pixel(g, 23, 7, NW)
    set_pixel(g, 7, 23, NW)
    set_pixel(g, 23, 23, NW)
    return g


# ─── 3. UNLOCK NOTIFICATION POPUP (160×48) ──────────────────────────────────

def gen_popup_bg():
    """Achievement unlock notification banner."""
    w, h = 160, 48
    g = blank(w, h)
    # Dark panel body
    draw_rect(g, 0, 0, w, h, OC)
    # Gold border
    draw_rect_outline(g, 0, 0, w, h, DG)
    draw_rect_outline(g, 1, 1, w - 2, h - 2, GD)
    draw_rect_outline(g, 2, 2, w - 4, h - 4, DG)
    # Inner fill (slightly lighter than OC)
    draw_rect(g, 3, 3, w - 6, h - 6, DK)
    # Top decorative gold line
    draw_line_h(g, 8, 5, w - 16, GD)
    # Bottom decorative gold line
    draw_line_h(g, 8, h - 6, w - 16, DG)
    # Left icon area glow effect (golden circle area)
    for dy in range(-14, 15):
        for dx in range(-14, 15):
            dist_sq = dx * dx + dy * dy
            if dist_sq <= 196:
                px = 24 + dx
                py = 24 + dy
                if 3 <= px < w - 3 and 3 <= py < h - 3:
                    if dist_sq <= 100:
                        set_pixel(g, px, py, BD)
                    elif dist_sq <= 144:
                        # Subtle glow ring
                        alpha_color = (168, 112, 0, 80)
                        set_pixel(g, px, py, DK)
    # Icon placeholder border
    draw_rect_outline(g, 8, 8, 32, 32, GD)
    draw_rect_outline(g, 9, 9, 30, 30, DG)
    # "ACHIEVEMENT UNLOCKED" text area highlight
    draw_line_h(g, 46, 12, 100, GD)
    draw_line_h(g, 46, 13, 100, DG)
    # Sparkle corners
    set_pixel(g, 4, 4, YL)
    set_pixel(g, w - 5, 4, YL)
    set_pixel(g, 4, h - 5, YL)
    set_pixel(g, w - 5, h - 5, YL)
    return g


# ─── 4. ACHIEVEMENT PANEL BACKGROUND (220×200) ──────────────────────────────

def gen_panel_achievements():
    """Main achievement panel background with header."""
    w, h = 220, 200
    g = blank(w, h)
    # Panel body
    draw_rect(g, 0, 0, w, h, OC)
    # Outer border
    draw_rect_outline(g, 0, 0, w, h, K)
    draw_rect_outline(g, 1, 1, w - 2, h - 2, DK)
    # Inner body
    draw_rect(g, 2, 2, w - 4, h - 4, DK)
    # Header area
    draw_rect(g, 2, 2, w - 4, 24, OC)
    draw_line_h(g, 4, 25, w - 8, DG)
    draw_line_h(g, 4, 26, w - 8, GD)
    draw_line_h(g, 4, 27, w - 8, DG)
    # Header decorations — trophy silhouette left side
    # Simple trophy: cup + handles + base
    tx, ty = 10, 6
    draw_rect(g, tx, ty, 8, 8, GD)
    draw_rect(g, tx + 1, ty + 1, 6, 6, YL)
    set_pixel(g, tx - 1, ty + 1, GD)
    set_pixel(g, tx - 1, ty + 2, GD)
    set_pixel(g, tx + 8, ty + 1, GD)
    set_pixel(g, tx + 8, ty + 2, GD)
    draw_rect(g, tx + 2, ty + 8, 4, 2, DG)
    draw_rect(g, tx + 1, ty + 10, 6, 2, GD)
    # Header highlight
    draw_line_h(g, 4, 3, w - 8, ST)
    # Content area — dark panels for rows
    for row in range(5):
        ry = 34 + row * 32
        draw_rect(g, 6, ry, w - 12, 28, K)
        draw_rect_outline(g, 6, ry, w - 12, 28, ST)
        # Subtle inner shadow
        draw_line_h(g, 7, ry + 1, w - 14, DK)
    # Close button area (top right)
    draw_rect(g, w - 20, 5, 14, 14, DB)
    draw_rect_outline(g, w - 20, 5, 14, 14, ER)
    # X mark
    set_pixel(g, w - 16, 8, NW)
    set_pixel(g, w - 15, 9, NW)
    set_pixel(g, w - 14, 10, NW)
    set_pixel(g, w - 13, 11, NW)
    set_pixel(g, w - 10, 8, NW)
    set_pixel(g, w - 11, 9, NW)
    set_pixel(g, w - 12, 10, NW)
    set_pixel(g, w - 13, 11, NW)
    set_pixel(g, w - 16, 14, NW)
    set_pixel(g, w - 15, 13, NW)
    set_pixel(g, w - 14, 12, NW)
    set_pixel(g, w - 10, 14, NW)
    set_pixel(g, w - 11, 13, NW)
    set_pixel(g, w - 12, 12, NW)
    # Scroll bar track (right side)
    draw_rect(g, w - 8, 30, 4, h - 36, K)
    draw_rect(g, w - 7, 32, 2, 40, ST)
    return g


# ─── 5. PROGRESS BAR TEXTURES (64×8) ────────────────────────────────────────

def gen_bar_bg():
    """Progress bar background — dark empty bar."""
    w, h = 64, 8
    g = blank(w, h)
    draw_rect(g, 0, 0, w, h, K)
    draw_rect_outline(g, 0, 0, w, h, ST)
    draw_rect(g, 1, 1, w - 2, h - 2, DK)
    # Inner groove
    draw_line_h(g, 2, 2, w - 4, K)
    return g


def gen_bar_fill():
    """Progress bar fill — golden gradient."""
    w, h = 64, 8
    g = blank(w, h)
    draw_rect(g, 0, 0, w, h, DG)
    draw_rect(g, 0, 1, w, h - 2, GD)
    # Top highlight
    draw_line_h(g, 0, 1, w, YL)
    draw_line_h(g, 0, 2, w, GD)
    # Bottom shadow
    draw_line_h(g, 0, h - 2, w, DG)
    # Shimmer spots
    for x in range(4, w, 8):
        set_pixel(g, x, 2, PY)
    return g


# ─── 6. ACHIEVEMENT POINTS COUNTER ICON (16×16) ─────────────────────────────

def gen_points_icon():
    """Star/trophy icon for achievement points."""
    g = blank(16, 16)
    # 5-pointed star shape
    star_pixels = [
        (7, 1), (8, 1),
        (7, 2), (8, 2),
        (6, 3), (7, 3), (8, 3), (9, 3),
        (6, 4), (7, 4), (8, 4), (9, 4),
        (2, 5), (3, 5), (4, 5), (5, 5), (6, 5), (7, 5), (8, 5), (9, 5), (10, 5), (11, 5), (12, 5), (13, 5),
        (3, 6), (4, 6), (5, 6), (6, 6), (7, 6), (8, 6), (9, 6), (10, 6), (11, 6), (12, 6),
        (4, 7), (5, 7), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7), (11, 7),
        (5, 8), (6, 8), (7, 8), (8, 8), (9, 8), (10, 8),
        (4, 9), (5, 9), (6, 9), (7, 9), (8, 9), (9, 9), (10, 9), (11, 9),
        (3, 10), (4, 10), (5, 10), (6, 10), (9, 10), (10, 10), (11, 10), (12, 10),
        (2, 11), (3, 11), (4, 11), (5, 11), (10, 11), (11, 11), (12, 11), (13, 11),
        (2, 12), (3, 12), (4, 12), (11, 12), (12, 12), (13, 12),
        (1, 13), (2, 13), (3, 13), (12, 13), (13, 13), (14, 13),
    ]
    for x, y in star_pixels:
        set_pixel(g, x, y, GD)
    # Inner highlight
    inner = [
        (7, 2), (8, 2),
        (7, 3), (8, 3),
        (6, 5), (7, 5), (8, 5), (9, 5),
        (6, 6), (7, 6), (8, 6), (9, 6),
        (6, 7), (7, 7), (8, 7), (9, 7),
        (6, 8), (7, 8), (8, 8), (9, 8),
    ]
    for x, y in inner:
        set_pixel(g, x, y, YL)
    # Center bright
    set_pixel(g, 7, 5, PY)
    set_pixel(g, 8, 5, PY)
    # Outline
    for x, y in star_pixels:
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if (nx, ny) not in star_pixels:
                set_pixel(g, nx, ny, DG)
    return g


# ─── 7. LOCKED ACHIEVEMENT OVERLAY (32×32) ──────────────────────────────────

def gen_locked():
    """Greyed-out padlock overlay for locked achievements."""
    g = blank(32, 32)
    # Semi-transparent dark overlay (circle shape)
    for dy in range(-13, 14):
        for dx in range(-13, 14):
            if dx * dx + dy * dy <= 169:
                set_pixel(g, 15 + dx, 15 + dy, (13, 13, 13, 160))
    # Padlock shackle (arch)
    for dy in range(-5, 1):
        for dx in range(-4, 5):
            dist_sq = dx * dx + dy * dy
            if 9 <= dist_sq <= 25:
                set_pixel(g, 15 + dx, 12 + dy, ST)
    # Shackle inner
    for dy in range(-3, 1):
        for dx in range(-2, 3):
            dist_sq = dx * dx + dy * dy
            if dist_sq <= 4:
                set_pixel(g, 15 + dx, 12 + dy, (13, 13, 13, 160))
    # Lock body
    draw_rect(g, 11, 13, 10, 8, MG)
    draw_rect(g, 12, 14, 8, 6, ST)
    draw_rect_outline(g, 11, 13, 10, 8, DK)
    # Keyhole
    draw_circle_filled(g, 15, 16, 1, DK)
    set_pixel(g, 15, 16, K)
    set_pixel(g, 15, 17, K)
    set_pixel(g, 15, 18, K)
    set_pixel(g, 16, 16, K)
    set_pixel(g, 16, 17, K)
    return g


# ─── 8. INDIVIDUAL ACHIEVEMENT ICONS (32×32) ────────────────────────────────

def make_milestone_base():
    """Base circle for milestone icons — dark bg with gold ring."""
    g = blank(32, 32)
    draw_circle_filled(g, 15, 15, 13, OC)
    draw_circle_outline(g, 15, 15, 13, DG)
    draw_circle_outline(g, 15, 15, 14, GD)
    draw_circle_outline(g, 15, 15, 15, K)
    return g


def gen_first_kill():
    """First enemy killed — skull icon."""
    g = make_milestone_base()
    # Skull shape
    draw_rect(g, 11, 8, 10, 8, NW)
    draw_rect(g, 12, 7, 8, 1, PG)
    draw_rect(g, 12, 16, 8, 2, PG)
    # Rounded top
    set_pixel(g, 11, 8, _)
    set_pixel(g, 20, 8, _)
    set_pixel(g, 11, 8, PG)
    set_pixel(g, 20, 8, PG)
    # Eye sockets
    draw_rect(g, 12, 10, 3, 3, K)
    draw_rect(g, 17, 10, 3, 3, K)
    # Nose
    set_pixel(g, 15, 13, DK)
    set_pixel(g, 16, 13, DK)
    set_pixel(g, 15, 14, DK)
    set_pixel(g, 16, 14, DK)
    # Teeth
    for x in range(12, 20):
        set_pixel(g, x, 16, PG)
        if x % 2 == 0:
            set_pixel(g, x, 17, NW)
        else:
            set_pixel(g, x, 17, K)
    # Jaw
    draw_line_h(g, 12, 18, 8, PG)
    set_pixel(g, 12, 19, LS)
    set_pixel(g, 19, 19, LS)
    # Crossbones below
    set_pixel(g, 10, 21, PG)
    set_pixel(g, 11, 22, PG)
    set_pixel(g, 12, 23, PG)
    set_pixel(g, 19, 21, PG)
    set_pixel(g, 20, 22, PG)
    set_pixel(g, 21, 23, PG)
    set_pixel(g, 19, 23, PG)
    set_pixel(g, 20, 22, PG)
    set_pixel(g, 21, 21, PG)
    set_pixel(g, 10, 23, PG)
    set_pixel(g, 11, 22, PG)
    set_pixel(g, 12, 21, PG)
    return g


def gen_first_craft():
    """First craft — hammer and anvil."""
    g = make_milestone_base()
    # Small anvil
    draw_rect(g, 11, 16, 10, 3, ST)
    draw_rect(g, 12, 16, 8, 2, MG)
    draw_line_h(g, 11, 15, 10, LS)
    draw_rect(g, 10, 15, 1, 2, MG)
    draw_rect(g, 12, 19, 3, 2, DK)
    draw_rect(g, 17, 19, 3, 2, DK)
    # Hammer above
    draw_rect(g, 13, 7, 6, 3, LS)
    draw_rect(g, 13, 7, 6, 1, PG)
    draw_line_v(g, 16, 10, 5, BN)
    draw_line_v(g, 15, 10, 5, DT)
    return g


def gen_zone_discovered():
    """Zone discovered — map with pin."""
    g = make_milestone_base()
    # Map rectangle
    draw_rect(g, 8, 8, 16, 14, PS)
    draw_rect(g, 9, 9, 14, 12, SN)
    draw_rect_outline(g, 8, 8, 16, 14, BN)
    # Map features (terrain lines)
    draw_line_h(g, 10, 11, 5, FG)
    draw_line_h(g, 11, 12, 4, FG)
    draw_line_h(g, 16, 13, 4, SB)
    draw_line_h(g, 17, 14, 3, SB)
    draw_line_h(g, 10, 16, 8, DT)
    # Map pin (red)
    set_pixel(g, 18, 9, BR)
    set_pixel(g, 17, 10, ER)
    set_pixel(g, 18, 10, BR)
    set_pixel(g, 19, 10, ER)
    set_pixel(g, 18, 11, ER)
    set_pixel(g, 18, 12, K)
    return g


def gen_level_10():
    """Level 10 milestone — number on shield."""
    g = make_milestone_base()
    # Shield shape
    for y in range(7, 18):
        left = 9
        right = 22
        draw_line_h(g, left, y, right - left + 1, DP)
    for y in range(18, 23):
        inset = y - 17
        left = 9 + inset
        right = 22 - inset
        if left <= right:
            draw_line_h(g, left, y, right - left + 1, DP)
    set_pixel(g, 15, 23, DP)
    set_pixel(g, 16, 23, DP)
    # Shield border
    draw_line_h(g, 9, 6, 14, SB)
    # "10" in gold
    # "1"
    draw_line_v(g, 12, 10, 7, YL)
    set_pixel(g, 11, 11, YL)
    draw_line_h(g, 10, 17, 5, YL)
    # "0"
    draw_rect_outline(g, 17, 10, 5, 8, YL)
    draw_rect(g, 18, 11, 3, 6, DP)
    return g


def gen_100_enemies():
    """100 enemies killed — crossed swords."""
    g = make_milestone_base()
    # Left sword (diagonal \)
    for i in range(14):
        set_pixel(g, 6 + i, 6 + i, LS)
        set_pixel(g, 7 + i, 6 + i, PG)
    # Right sword (diagonal /)
    for i in range(14):
        set_pixel(g, 24 - i, 6 + i, LS)
        set_pixel(g, 25 - i, 6 + i, PG)
    # Cross guards
    draw_line_h(g, 8, 16, 4, DG)
    draw_line_h(g, 8, 17, 4, GD)
    draw_line_h(g, 20, 16, 4, DG)
    draw_line_h(g, 20, 17, 4, GD)
    # Center shield
    draw_circle_filled(g, 15, 14, 4, ER)
    draw_circle_outline(g, 15, 14, 4, DB)
    # Skull in center
    draw_rect(g, 14, 12, 3, 3, NW)
    set_pixel(g, 14, 13, K)
    set_pixel(g, 16, 13, K)
    set_pixel(g, 15, 15, NW)
    return g


def gen_trader():
    """First trade — coin stack."""
    g = make_milestone_base()
    # Bottom coin
    draw_circle_filled(g, 15, 20, 5, DG)
    draw_circle_filled(g, 15, 20, 4, GD)
    draw_circle_filled(g, 15, 20, 2, YL)
    # Middle coin (offset)
    draw_circle_filled(g, 15, 16, 5, DG)
    draw_circle_filled(g, 15, 16, 4, GD)
    draw_circle_filled(g, 15, 16, 2, YL)
    # Top coin
    draw_circle_filled(g, 15, 12, 5, DG)
    draw_circle_filled(g, 15, 12, 4, GD)
    draw_circle_filled(g, 15, 12, 2, YL)
    set_pixel(g, 15, 11, PY)
    # Coin detail on top coin
    set_pixel(g, 14, 12, PY)
    set_pixel(g, 16, 12, PY)
    # Stack edges
    draw_line_v(g, 10, 12, 9, DG)
    draw_line_v(g, 20, 12, 9, DG)
    return g


def gen_guild_join():
    """Join a guild — banner/flag."""
    g = make_milestone_base()
    # Flag pole
    draw_line_v(g, 11, 5, 20, BN)
    draw_line_v(g, 12, 5, 20, DT)
    set_pixel(g, 11, 5, GD)
    set_pixel(g, 12, 5, GD)
    # Banner body
    draw_rect(g, 13, 7, 10, 12, DP)
    draw_rect(g, 14, 8, 8, 10, SB)
    # Banner bottom — pointed
    set_pixel(g, 13, 19, DP)
    set_pixel(g, 14, 19, DP)
    set_pixel(g, 15, 20, DP)
    set_pixel(g, 16, 20, DP)
    set_pixel(g, 17, 21, DP)
    set_pixel(g, 22, 19, DP)
    set_pixel(g, 21, 19, DP)
    set_pixel(g, 20, 20, DP)
    set_pixel(g, 19, 20, DP)
    set_pixel(g, 18, 21, DP)
    # Emblem on banner — simple star
    draw_diamond(g, 18, 12, 2, GD)
    set_pixel(g, 18, 12, YL)
    return g


def gen_boss_slain():
    """Boss slain — crowned skull."""
    g = make_milestone_base()
    # Crown
    draw_rect(g, 10, 6, 12, 4, GD)
    draw_rect(g, 11, 7, 10, 2, YL)
    # Crown points
    set_pixel(g, 10, 5, GD)
    set_pixel(g, 14, 4, GD)
    set_pixel(g, 15, 3, YL)
    set_pixel(g, 16, 3, YL)
    set_pixel(g, 17, 4, GD)
    set_pixel(g, 21, 5, GD)
    # Crown gems
    set_pixel(g, 13, 7, BR)
    set_pixel(g, 16, 7, MV)
    set_pixel(g, 19, 7, BR)
    # Skull
    draw_rect(g, 11, 10, 10, 7, NW)
    draw_rect(g, 12, 9, 8, 1, PG)
    # Eyes (red for boss)
    draw_rect(g, 12, 12, 3, 2, BR)
    draw_rect(g, 17, 12, 3, 2, BR)
    set_pixel(g, 13, 12, ER)
    set_pixel(g, 18, 12, ER)
    # Nose
    set_pixel(g, 15, 14, DK)
    set_pixel(g, 16, 14, DK)
    # Teeth
    for x in range(12, 20):
        if x % 2 == 0:
            set_pixel(g, x, 17, NW)
        else:
            set_pixel(g, x, 17, K)
    draw_line_h(g, 12, 18, 8, PG)
    return g


def gen_collector():
    """Collector — treasure chest."""
    g = make_milestone_base()
    # Chest body
    draw_rect(g, 8, 13, 16, 9, BN)
    draw_rect(g, 9, 14, 14, 7, DT)
    # Chest lid
    draw_rect(g, 8, 10, 16, 4, DT)
    draw_rect(g, 9, 11, 14, 2, SN)
    draw_line_h(g, 8, 10, 16, BN)
    # Lid hinge line
    draw_line_h(g, 8, 13, 16, BD)
    # Metal bands
    draw_line_v(g, 8, 10, 12, BD)
    draw_line_v(g, 23, 10, 12, BD)
    draw_line_v(g, 15, 10, 12, BD)
    draw_line_v(g, 16, 10, 12, BD)
    # Lock/clasp
    draw_rect(g, 14, 13, 4, 3, GD)
    draw_rect(g, 15, 14, 2, 1, DG)
    # Treasure peeking out (open lid style)
    set_pixel(g, 11, 12, YL)
    set_pixel(g, 13, 11, GD)
    set_pixel(g, 18, 12, MV)
    set_pixel(g, 20, 11, GD)
    # Chest base
    draw_line_h(g, 8, 22, 16, BD)
    return g


def gen_explorer():
    """All zones explored — compass rose."""
    g = make_milestone_base()
    cx, cy = 15, 15
    # Compass rose — 8-pointed star
    # Main 4 points
    for i in range(1, 8):
        set_pixel(g, cx, cy - i, PG)  # N
        set_pixel(g, cx, cy + i, PG)  # S
        set_pixel(g, cx - i, cy, PG)  # W
        set_pixel(g, cx + i, cy, PG)  # E
    # Diagonal points (shorter)
    for i in range(1, 5):
        set_pixel(g, cx - i, cy - i, LS)
        set_pixel(g, cx + i, cy - i, LS)
        set_pixel(g, cx - i, cy + i, LS)
        set_pixel(g, cx + i, cy + i, LS)
    # North point highlight (red for north)
    set_pixel(g, cx, cy - 7, BR)
    set_pixel(g, cx, cy - 6, BR)
    set_pixel(g, cx, cy - 5, ER)
    # Center gem
    draw_circle_filled(g, cx, cy, 2, GD)
    set_pixel(g, cx, cy, YL)
    # Cardinal letters (single pixels)
    set_pixel(g, cx, cy - 9, NW)  # N dot
    set_pixel(g, cx, cy + 9, MG)  # S dot
    set_pixel(g, cx - 9, cy, MG)  # W dot
    set_pixel(g, cx + 9, cy, MG)  # E dot
    return g


# ─── GENERATE ALL ────────────────────────────────────────────────────────────

def main():
    print('Generating achievement art assets (PIX-76)...\n')

    # 1. Category icons
    print('Category icons (32x32):')
    write_png(os.path.join(ART_ICONS, 'icon_achieve_cat_combat.png'), gen_cat_combat())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_cat_exploration.png'), gen_cat_exploration())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_cat_crafting.png'), gen_cat_crafting())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_cat_social.png'), gen_cat_social())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_cat_questing.png'), gen_cat_questing())

    # 2. Tier badges
    print('\nTier badge frames (32x32):')
    write_png(os.path.join(ART_ACHIEVE, 'icon_achieve_tier_bronze.png'), gen_tier_bronze())
    write_png(os.path.join(ART_ACHIEVE, 'icon_achieve_tier_silver.png'), gen_tier_silver())
    write_png(os.path.join(ART_ACHIEVE, 'icon_achieve_tier_gold.png'), gen_tier_gold())
    write_png(os.path.join(ART_ACHIEVE, 'icon_achieve_tier_platinum.png'), gen_tier_platinum())

    # 3. Unlock popup
    print('\nUnlock notification popup (160x48):')
    write_png(os.path.join(ART_ACHIEVE, 'ui_achieve_popup_bg.png'), gen_popup_bg())

    # 4. Achievement panel
    print('\nAchievement panel (220x200):')
    write_png(os.path.join(ART_PANELS, 'ui_panel_achievements.png'), gen_panel_achievements())

    # 5. Progress bars
    print('\nProgress bar textures (64x8):')
    write_png(os.path.join(ART_ACHIEVE, 'ui_achieve_bar_bg.png'), gen_bar_bg())
    write_png(os.path.join(ART_ACHIEVE, 'ui_achieve_bar_fill.png'), gen_bar_fill())

    # 6. Points counter icon
    print('\nAchievement points icon (16x16):')
    write_png(os.path.join(ART_ICONS, 'icon_achieve_points.png'), gen_points_icon())

    # 7. Locked overlay
    print('\nLocked achievement overlay (32x32):')
    write_png(os.path.join(ART_ACHIEVE, 'icon_achieve_locked.png'), gen_locked())

    # 8. Individual milestone icons
    print('\nMilestone achievement icons (32x32):')
    write_png(os.path.join(ART_ICONS, 'icon_achieve_first_kill.png'), gen_first_kill())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_first_craft.png'), gen_first_craft())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_zone_discovered.png'), gen_zone_discovered())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_level_10.png'), gen_level_10())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_100_enemies.png'), gen_100_enemies())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_trader.png'), gen_trader())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_guild_join.png'), gen_guild_join())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_boss_slain.png'), gen_boss_slain())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_collector.png'), gen_collector())
    write_png(os.path.join(ART_ICONS, 'icon_achieve_explorer.png'), gen_explorer())

    print('\nDone! All achievement assets generated.')


if __name__ == '__main__':
    main()
