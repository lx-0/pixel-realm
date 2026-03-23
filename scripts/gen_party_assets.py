#!/usr/bin/env python3
"""
Generate party system art assets for PixelRealm (PIX-99).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md:
  - 32-color master palette only
  - Nearest-neighbor scaling
  - Consistent naming convention

Assets produced:
  Party UI panel:
    ui_panel_party.png              — 200×180 party panel with 4 member slots

  Party leader indicator:
    icon_party_leader.png           — 16×16 golden crown icon

  Invite popup panel:
    ui_panel_party_invite.png       — 160×100 invite/accept/decline dialog

  Loot distribution UI:
    ui_panel_loot_roll.png          — 180×80 loot roll popup
    icon_loot_need.png              — 16×16 sword (need) icon
    icon_loot_greed.png             — 16×16 coin (greed) icon
    icon_loot_pass.png              — 16×16 X (pass) icon

  Party minimap icons (8×8):
    icon_minimap_party_1.png        — cyan dot (player 1 / self)
    icon_minimap_party_2.png        — green dot (player 2)
    icon_minimap_party_3.png        — yellow dot (player 3)
    icon_minimap_party_4.png        — purple dot (player 4)

  Party chat tab icon:
    icon_party_chat_tab.png         — 16×16 speech bubble with group indicator
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
OUT_DIR    = os.path.join(SCRIPT_DIR, '..', 'public', 'assets')
ART_UI     = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui')
ART_PARTY  = os.path.join(ART_UI, 'party')
ART_ICONS  = os.path.join(ART_UI, 'icons')

for d in [OUT_DIR, ART_PARTY, ART_ICONS]:
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


# ─── Drawing helpers ─────────────────────────────────────────────────────────

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


def draw_line_h(grid, x, y, length, color):
    for i in range(length):
        set_pixel(grid, x + i, y, color)


def draw_line_v(grid, x, y, length, color):
    for i in range(length):
        set_pixel(grid, x, y + i, color)


# ─── Party UI Panel (200×180) ────────────────────────────────────────────────

def gen_panel_party():
    """200×180 party panel — 4 member slots with HP/mana bars, level, class icon."""
    W, H = 200, 180
    g = blank(W, H)

    # Outer border (dark frame like guild panels)
    draw_rect(g, 0, 0, W, H, K)
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    draw_rect(g, 2, 2, W - 4, H - 4, ST)

    # Title bar (cyan/blue accent — party = friendly/player)
    draw_rect(g, 2, 2, W - 4, 16, DP)
    draw_rect(g, 3, 3, W - 6, 14, SB)
    draw_line_h(g, 4, 4, W - 8, PB)   # top highlight
    draw_line_h(g, 4, 15, W - 8, DP)  # bottom shadow

    # "PARTY" label area (placeholder bar in title)
    draw_rect(g, 70, 6, 60, 8, DP)
    draw_rect(g, 71, 7, 58, 6, PB)

    # Content area background
    draw_rect(g, 4, 20, W - 8, H - 26, DK)
    draw_rect(g, 5, 21, W - 10, H - 28, ST)

    # 4 member slots (36px tall each, with 2px gap)
    slot_colors = [PB, LG, YL, MV]  # cyan, green, yellow, purple — matches minimap
    for i in range(4):
        y = 24 + i * 38
        slot_bg = MG if i % 2 == 0 else ST
        # Slot background
        draw_rect(g, 6, y, W - 12, 34, slot_bg)
        draw_rect_outline(g, 6, y, W - 12, 34, DK)

        # Party member color indicator (left edge stripe)
        draw_rect(g, 7, y + 1, 3, 32, slot_colors[i])

        # Leader crown spot (only slot 0)
        if i == 0:
            # Small gold crown indicator
            draw_rect(g, 12, y + 2, 8, 6, GD)
            draw_rect(g, 13, y + 3, 6, 4, YL)
            set_pixel(g, 13, y + 1, GD)
            set_pixel(g, 16, y + 1, GD)
            set_pixel(g, 19, y + 1, GD)

        # Class icon placeholder (16×16 colored square)
        icon_x = 12 if i > 0 else 22
        draw_rect(g, icon_x, y + 10, 16, 16, DK)
        draw_rect(g, icon_x + 1, y + 11, 14, 14, slot_colors[i])
        draw_rect_outline(g, icon_x, y + 10, 16, 16, K)

        # Name area placeholder
        name_x = icon_x + 20
        draw_rect(g, name_x, y + 4, 70, 8, DK)
        draw_rect(g, name_x + 1, y + 5, 68, 6, slot_bg)

        # Level area (small box)
        lv_x = name_x + 74
        draw_rect(g, lv_x, y + 4, 20, 8, DK)
        draw_rect(g, lv_x + 1, y + 5, 18, 6, YL)

        # HP bar
        bar_x = name_x
        bar_y = y + 15
        bar_w = 94
        # HP background (dark)
        draw_rect(g, bar_x, bar_y, bar_w, 6, DK)
        # HP fill (green, ~80% full for visual)
        hp_fill = int(bar_w * 0.8) if i < 3 else int(bar_w * 0.4)
        draw_rect(g, bar_x + 1, bar_y + 1, hp_fill - 2, 4, FG)
        draw_line_h(g, bar_x + 1, bar_y + 1, hp_fill - 2, LG)  # highlight
        draw_rect_outline(g, bar_x, bar_y, bar_w, 6, K)

        # Mana bar (below HP)
        mp_y = bar_y + 8
        draw_rect(g, bar_x, mp_y, bar_w, 6, DK)
        mp_fill = int(bar_w * 0.6) if i < 2 else int(bar_w * 0.9)
        draw_rect(g, bar_x + 1, mp_y + 1, mp_fill - 2, 4, DP)
        draw_line_h(g, bar_x + 1, mp_y + 1, mp_fill - 2, SB)  # highlight
        draw_rect_outline(g, bar_x, mp_y, bar_w, 6, K)

    # Bottom bar — Leave Party button
    btn_y = H - 18
    draw_rect(g, 6, btn_y, 80, 14, DB)
    draw_rect(g, 7, btn_y + 1, 78, 12, ER)
    draw_line_h(g, 8, btn_y + 1, 76, BR)
    draw_rect_outline(g, 6, btn_y, 80, 14, K)

    # Invite button
    draw_rect(g, 110, btn_y, 80, 14, DP)
    draw_rect(g, 111, btn_y + 1, 78, 12, SB)
    draw_line_h(g, 112, btn_y + 1, 76, PB)
    draw_rect_outline(g, 110, btn_y, 80, 14, K)

    # Corner accents (blue, matching party theme)
    for corner in [(3, 3), (W - 6, 3), (3, H - 6), (W - 6, H - 6)]:
        set_pixel(g, corner[0], corner[1], PB)
        set_pixel(g, corner[0] + 1, corner[1], SB)
        set_pixel(g, corner[0], corner[1] + 1, SB)

    return g


# ─── Party Leader Indicator (16×16) ──────────────────────────────────────────

def gen_party_leader():
    """16×16 golden crown icon for party leader slot."""
    g = blank(16, 16)

    # Crown base (wide)
    draw_rect(g, 2, 9, 12, 4, DG)
    draw_rect(g, 3, 10, 10, 2, GD)
    draw_line_h(g, 3, 9, 10, YL)  # top highlight

    # Crown points (three prongs)
    # Left prong
    draw_rect(g, 3, 5, 2, 4, GD)
    set_pixel(g, 3, 4, YL)
    set_pixel(g, 4, 4, GD)

    # Center prong (tallest)
    draw_rect(g, 7, 3, 2, 6, GD)
    set_pixel(g, 7, 2, YL)
    set_pixel(g, 8, 2, GD)

    # Right prong
    draw_rect(g, 11, 5, 2, 4, GD)
    set_pixel(g, 11, 4, YL)
    set_pixel(g, 12, 4, GD)

    # Jewels on prong tips
    set_pixel(g, 4, 5, BR)   # ruby left
    set_pixel(g, 7, 3, SB)   # sapphire center
    set_pixel(g, 12, 5, LG)  # emerald right

    # Band along bottom of crown
    draw_rect(g, 2, 13, 12, 2, DG)
    draw_rect(g, 3, 13, 10, 1, DS)

    # Outline
    draw_rect_outline(g, 1, 1, 14, 14, K)

    return g


# ─── Invite/Accept/Decline Popup (160×100) ───────────────────────────────────

def gen_panel_invite():
    """160×100 party invitation popup with accept/decline buttons."""
    W, H = 160, 100
    g = blank(W, H)

    # Outer frame
    draw_rect(g, 0, 0, W, H, K)
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    draw_rect(g, 2, 2, W - 4, H - 4, ST)

    # Title bar (blue for friendly action)
    draw_rect(g, 2, 2, W - 4, 14, DP)
    draw_rect(g, 3, 3, W - 6, 12, SB)
    draw_line_h(g, 4, 4, W - 8, PB)
    draw_line_h(g, 4, 13, W - 8, DP)

    # "PARTY INVITE" label placeholder
    draw_rect(g, 40, 5, 80, 7, DP)
    draw_rect(g, 41, 6, 78, 5, PB)

    # Content area
    draw_rect(g, 4, 18, W - 8, H - 24, DK)
    draw_rect(g, 5, 19, W - 10, H - 26, ST)

    # Inviter name placeholder area
    draw_rect(g, 20, 26, 120, 10, DK)
    draw_rect(g, 21, 27, 118, 8, MG)

    # "invites you to a party" text placeholder
    draw_rect(g, 30, 42, 100, 8, DK)
    draw_rect(g, 31, 43, 98, 6, ST)

    # Accept button (green)
    btn_y = H - 26
    draw_rect(g, 10, btn_y, 60, 16, DF)
    draw_rect(g, 11, btn_y + 1, 58, 14, FG)
    draw_line_h(g, 12, btn_y + 1, 56, LG)  # highlight
    draw_rect_outline(g, 10, btn_y, 60, 16, K)
    # Checkmark inside accept button
    set_pixel(g, 30, btn_y + 8, NW)
    set_pixel(g, 31, btn_y + 9, NW)
    set_pixel(g, 32, btn_y + 10, NW)
    set_pixel(g, 33, btn_y + 9, NW)
    set_pixel(g, 34, btn_y + 8, NW)
    set_pixel(g, 35, btn_y + 7, NW)
    set_pixel(g, 36, btn_y + 6, NW)

    # Decline button (red)
    draw_rect(g, 90, btn_y, 60, 16, DB)
    draw_rect(g, 91, btn_y + 1, 58, 14, ER)
    draw_line_h(g, 92, btn_y + 1, 56, BR)  # highlight
    draw_rect_outline(g, 90, btn_y, 60, 16, K)
    # X mark inside decline button
    for d in range(5):
        set_pixel(g, 115 + d, btn_y + 5 + d, NW)
        set_pixel(g, 119 - d, btn_y + 5 + d, NW)

    return g


# ─── Loot Roll Popup (180×80) ────────────────────────────────────────────────

def gen_panel_loot_roll():
    """180×80 loot roll popup with item display and need/greed/pass buttons."""
    W, H = 180, 80
    g = blank(W, H)

    # Outer frame
    draw_rect(g, 0, 0, W, H, K)
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    draw_rect(g, 2, 2, W - 4, H - 4, ST)

    # Title bar (gold for loot)
    draw_rect(g, 2, 2, W - 4, 14, DG)
    draw_rect(g, 3, 3, W - 6, 12, GD)
    draw_line_h(g, 4, 4, W - 8, YL)
    draw_line_h(g, 4, 13, W - 8, DG)

    # Content area
    draw_rect(g, 4, 18, W - 8, H - 22, DK)
    draw_rect(g, 5, 19, W - 10, H - 24, ST)

    # Item icon placeholder (24×24 slot)
    draw_rect(g, 10, 24, 24, 24, DK)
    draw_rect(g, 11, 25, 22, 22, MG)
    draw_rect_outline(g, 10, 24, 24, 24, GD)  # gold border = loot
    # Sparkle inside item slot
    set_pixel(g, 16, 30, YL)
    set_pixel(g, 22, 34, PY)
    set_pixel(g, 28, 28, GD)

    # Item name placeholder
    draw_rect(g, 40, 26, 100, 8, DK)
    draw_rect(g, 41, 27, 98, 6, MG)

    # Item rarity indicator (gold bar)
    draw_rect(g, 40, 38, 60, 4, DG)
    draw_rect(g, 41, 39, 58, 2, GD)

    # Need / Greed / Pass buttons
    btn_y = H - 22
    btn_w = 48

    # Need button (blue — player wants it)
    draw_rect(g, 8, btn_y, btn_w, 14, DP)
    draw_rect(g, 9, btn_y + 1, btn_w - 2, 12, SB)
    draw_line_h(g, 10, btn_y + 1, btn_w - 4, PB)
    draw_rect_outline(g, 8, btn_y, btn_w, 14, K)

    # Greed button (gold — player wants for gold)
    draw_rect(g, 64, btn_y, btn_w, 14, DG)
    draw_rect(g, 65, btn_y + 1, btn_w - 2, 12, GD)
    draw_line_h(g, 66, btn_y + 1, btn_w - 4, YL)
    draw_rect_outline(g, 64, btn_y, btn_w, 14, K)

    # Pass button (gray — skip)
    draw_rect(g, 120, btn_y, btn_w, 14, DK)
    draw_rect(g, 121, btn_y + 1, btn_w - 2, 12, MG)
    draw_line_h(g, 122, btn_y + 1, btn_w - 4, LS)
    draw_rect_outline(g, 120, btn_y, btn_w, 14, K)

    return g


# ─── Loot Need Icon (16×16) — sword ─────────────────────────────────────────

def gen_icon_loot_need():
    """16×16 sword icon representing 'Need' loot roll."""
    g = blank(16, 16)

    # Blade (diagonal from top-right to center)
    set_pixel(g, 12, 2, LS)
    set_pixel(g, 11, 3, PG)
    set_pixel(g, 10, 4, PG)
    set_pixel(g, 9, 5, PG)
    set_pixel(g, 8, 6, LS)
    set_pixel(g, 7, 7, LS)

    # Blade edge highlight
    set_pixel(g, 13, 2, NW)
    set_pixel(g, 12, 3, NW)
    set_pixel(g, 11, 4, NW)
    set_pixel(g, 10, 5, NW)
    set_pixel(g, 9, 6, NW)

    # Crossguard
    draw_rect(g, 5, 8, 6, 2, DG)
    draw_rect(g, 6, 8, 4, 2, GD)

    # Grip
    set_pixel(g, 6, 9, BN)
    set_pixel(g, 5, 10, BN)
    set_pixel(g, 6, 10, DT)
    set_pixel(g, 5, 11, DT)

    # Pommel
    set_pixel(g, 4, 12, DG)
    set_pixel(g, 3, 13, GD)
    set_pixel(g, 4, 13, GD)

    # Outline key pixels
    set_pixel(g, 13, 1, K)
    set_pixel(g, 3, 14, K)

    # Blue tint background glow (need = player-friendly blue)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            px, py = 8 + dx, 8 + dy
            if g[py][px] == _:
                if abs(dx) + abs(dy) <= 2:
                    set_pixel(g, px, py, OC)

    return g


# ─── Loot Greed Icon (16×16) — coin ─────────────────────────────────────────

def gen_icon_loot_greed():
    """16×16 gold coin icon representing 'Greed' loot roll."""
    g = blank(16, 16)

    # Coin body (circle)
    draw_circle_filled(g, 8, 8, 5, GD)
    draw_circle_filled(g, 8, 8, 4, YL)

    # Coin inner detail (G symbol suggestion)
    draw_rect(g, 7, 6, 3, 5, GD)
    draw_rect(g, 7, 6, 3, 1, YL)
    set_pixel(g, 9, 8, YL)
    set_pixel(g, 8, 10, YL)

    # Highlight (top-left)
    set_pixel(g, 5, 5, PY)
    set_pixel(g, 6, 4, PY)
    set_pixel(g, 7, 4, PY)

    # Shadow (bottom-right)
    set_pixel(g, 10, 12, DG)
    set_pixel(g, 11, 11, DG)
    set_pixel(g, 12, 10, DG)

    # Outline
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            dist = dx * dx + dy * dy
            if 25 <= dist <= 36:
                set_pixel(g, 8 + dx, 8 + dy, K)

    return g


# ─── Loot Pass Icon (16×16) — X mark ────────────────────────────────────────

def gen_icon_loot_pass():
    """16×16 X icon representing 'Pass' on loot roll."""
    g = blank(16, 16)

    # X mark (two diagonal lines)
    for i in range(8):
        # Top-left to bottom-right
        set_pixel(g, 4 + i, 4 + i, ER)
        set_pixel(g, 5 + i, 4 + i, BR)
        # Top-right to bottom-left
        set_pixel(g, 11 - i, 4 + i, ER)
        set_pixel(g, 10 - i, 4 + i, BR)

    # Circle around the X
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            dist = dx * dx + dy * dy
            if 30 <= dist <= 42:
                set_pixel(g, 8 + dx, 8 + dy, MG)

    # Outline accents
    set_pixel(g, 4, 3, K)
    set_pixel(g, 11, 3, K)
    set_pixel(g, 4, 12, K)
    set_pixel(g, 11, 12, K)

    return g


# ─── Party Minimap Icons (8×8) ──────────────────────────────────────────────

def gen_minimap_party(color_inner, color_outer):
    """8×8 colored dot for party member on minimap."""
    g = blank(8, 8)

    # Outer ring
    draw_circle_filled(g, 4, 4, 3, color_outer)
    # Inner dot
    draw_circle_filled(g, 4, 4, 2, color_inner)
    # Highlight
    set_pixel(g, 3, 3, NW)
    # Outline
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            dist = dx * dx + dy * dy
            if 9 <= dist <= 16:
                set_pixel(g, 4 + dx, 4 + dy, K)

    return g


# ─── Party Chat Tab Icon (16×16) ────────────────────────────────────────────

def gen_party_chat_tab():
    """16×16 speech bubble icon with multi-person indicator for party chat."""
    g = blank(16, 16)

    # Main speech bubble (rounded rect)
    draw_rect(g, 3, 3, 10, 7, SB)
    draw_rect(g, 4, 2, 8, 9, SB)
    # Bubble interior
    draw_rect(g, 4, 3, 8, 7, PB)
    draw_rect(g, 5, 3, 6, 7, PB)

    # Bubble tail (bottom-left)
    set_pixel(g, 4, 10, SB)
    set_pixel(g, 3, 11, SB)
    set_pixel(g, 2, 12, SB)

    # Outline
    draw_line_h(g, 4, 1, 8, K)
    draw_line_h(g, 4, 11, 8, K)
    set_pixel(g, 3, 2, K)
    set_pixel(g, 12, 2, K)
    set_pixel(g, 2, 3, K)
    set_pixel(g, 13, 3, K)
    draw_line_v(g, 2, 3, 7, K)
    draw_line_v(g, 13, 3, 7, K)
    set_pixel(g, 3, 10, K)
    set_pixel(g, 12, 10, K)
    # Tail outline
    set_pixel(g, 3, 11, K)
    set_pixel(g, 2, 11, K)
    set_pixel(g, 1, 12, K)
    set_pixel(g, 1, 13, K)
    set_pixel(g, 2, 13, K)
    set_pixel(g, 3, 12, K)

    # Three dots inside bubble (representing group chat)
    set_pixel(g, 6, 6, DP)
    set_pixel(g, 8, 6, DP)
    set_pixel(g, 10, 6, DP)

    # Highlight
    set_pixel(g, 5, 3, HB)
    set_pixel(g, 6, 3, HB)

    return g


# ─── Dual Write (source + public) ───────────────────────────────────────────

def dual_write(rel_path, pixels):
    """Write to both assets/ source dir and public/assets/ deploy dir."""
    art_path = os.path.join(SCRIPT_DIR, '..', rel_path)
    os.makedirs(os.path.dirname(art_path), exist_ok=True)
    write_png(art_path, pixels)

    pub_path = os.path.join(OUT_DIR, os.path.basename(rel_path))
    write_png(pub_path, pixels)


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print('=== Generating Party System Assets (PIX-99) ===\n')

    # ── Party Panel ──
    print('-- Party UI Panel (200×180) --')
    dual_write('assets/ui/party/ui_panel_party.png', gen_panel_party())

    # ── Party Leader Icon ──
    print('\n-- Party Leader Icon (16×16) --')
    dual_write('assets/ui/icons/icon_party_leader.png', gen_party_leader())

    # ── Invite Popup ──
    print('\n-- Party Invite Popup (160×100) --')
    dual_write('assets/ui/party/ui_panel_party_invite.png', gen_panel_invite())

    # ── Loot Roll UI ──
    print('\n-- Loot Roll Popup (180×80) --')
    dual_write('assets/ui/party/ui_panel_loot_roll.png', gen_panel_loot_roll())

    print('\n-- Loot Roll Icons (16×16) --')
    dual_write('assets/ui/icons/icon_loot_need.png',  gen_icon_loot_need())
    dual_write('assets/ui/icons/icon_loot_greed.png', gen_icon_loot_greed())
    dual_write('assets/ui/icons/icon_loot_pass.png',  gen_icon_loot_pass())

    # ── Party Minimap Icons ──
    print('\n-- Party Minimap Icons (8×8) --')
    minimap_colors = [
        ('icon_minimap_party_1.png', PB, SB),   # cyan — self/player 1
        ('icon_minimap_party_2.png', LG, FG),   # green — player 2
        ('icon_minimap_party_3.png', YL, GD),   # yellow — player 3
        ('icon_minimap_party_4.png', MV, MP),   # purple — player 4
    ]
    for fname, inner, outer in minimap_colors:
        dual_write(f'assets/ui/icons/{fname}', gen_minimap_party(inner, outer))

    # ── Party Chat Tab Icon ──
    print('\n-- Party Chat Tab Icon (16×16) --')
    dual_write('assets/ui/icons/icon_party_chat_tab.png', gen_party_chat_tab())

    total = 1 + 1 + 1 + 1 + 3 + 4 + 1  # panel + leader + invite + loot_roll + loot_icons + minimap + chat
    print(f'\n=== Done! Generated {total} party system assets ===')


if __name__ == '__main__':
    main()
