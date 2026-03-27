#!/usr/bin/env python3
"""
Generate multiplayer HUD and chat UI art assets for PixelRealm (PIX-330).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows the 32-color master palette from existing art pipeline.

Assets produced under assets/ui/multiplayer/:

  Player nameplates:
    ui_nameplate_frame.png          — 96×16 nameplate background frame
    icon_class_badge_warrior.png    — 16×16 warrior class icon badge
    icon_class_badge_mage.png       — 16×16 mage class icon badge
    icon_class_badge_ranger.png     — 16×16 ranger class icon badge
    ui_nameplate_level_bg.png       — 16×16 level number background

  Party member frames (compact):
    ui_party_compact_frame.png      — 128×64 compact 4-party member display

  Chat UI:
    ui_panel_chat.png               — 240×160 chat box background panel
    ui_chat_input_bar.png           — 224×16 chat text input bar
    ui_btn_tab_general.png          — 48×16 General channel tab
    ui_btn_tab_party.png            — 48×16 Party channel tab
    ui_btn_tab_trade.png            — 48×16 Trade channel tab
    ui_btn_tab_system.png           — 48×16 System channel tab
    icon_chat_bubble.png            — 16×16 speech bubble indicator

  Connection status icons (16×16):
    icon_status_connected.png       — green signal icon
    icon_status_reconnecting.png    — yellow signal icon
    icon_status_disconnected.png    — red signal icon

  Player list panel:
    ui_panel_player_list.png        — 160×192 scrollable player list panel
    ui_player_row_highlight.png     — 144×16 row highlight overlay
    icon_dot_online.png             — 8×8 green online dot
    icon_dot_offline.png            — 8×8 gray offline dot
    icon_dot_away.png               — 8×8 yellow away dot

  Minimap player dots (8×8):
    icon_minimap_self.png           — white dot (self)
    icon_minimap_party_mp.png       — blue dot (party member)
    icon_minimap_other_player.png   — green dot (other players)
    icon_minimap_hostile.png        — red dot (hostile)
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
OUT_DIR    = os.path.join(SCRIPT_DIR, '..', 'public', 'assets')
ART_UI     = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui')
ART_MP     = os.path.join(ART_UI, 'multiplayer')

for d in [OUT_DIR, ART_MP]:
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


# ─── 1. Player Nameplate Frame (96×16) ──────────────────────────────────────

def gen_nameplate_frame():
    """96×16 nameplate background — dark frame with gold border accents."""
    W, H = 96, 16
    g = blank(W, H)

    # Outer border
    draw_rect_outline(g, 0, 0, W, H, K)
    # Inner frame
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    # Gold accent lines (top and bottom inner border)
    draw_line_h(g, 2, 1, W - 4, DG)
    draw_line_h(g, 2, H - 2, W - 4, DG)
    # Left and right gold accents
    draw_line_v(g, 1, 2, H - 4, DG)
    draw_line_v(g, W - 2, 2, H - 4, DG)

    # Interior background (dark stone)
    draw_rect(g, 2, 2, W - 4, H - 4, ST)
    draw_rect(g, 3, 3, W - 6, H - 6, DK)

    # Class badge slot area (left 16px reserved)
    draw_rect(g, 3, 3, 12, 10, ST)
    draw_rect_outline(g, 3, 3, 12, 10, DG)

    # Name text area (center)
    draw_rect(g, 17, 4, 50, 8, ST)
    draw_rect(g, 18, 5, 48, 6, MG)

    # Level area (right side)
    draw_rect(g, 70, 3, 22, 10, ST)
    draw_rect(g, 71, 4, 20, 8, DK)
    draw_rect_outline(g, 70, 3, 22, 10, DG)

    # Corner gems (gold)
    set_pixel(g, 2, 2, GD)
    set_pixel(g, W - 3, 2, GD)
    set_pixel(g, 2, H - 3, GD)
    set_pixel(g, W - 3, H - 3, GD)

    return g


# ─── Class Badge Icons (16×16) ──────────────────────────────────────────────

def gen_class_badge_warrior():
    """16×16 warrior class badge — sword & shield silhouette."""
    g = blank(16, 16)

    # Background circle
    draw_circle_filled(g, 8, 8, 6, DK)
    draw_circle_filled(g, 8, 8, 5, ST)

    # Shield shape (left side)
    draw_rect(g, 4, 4, 5, 8, ER)
    draw_rect(g, 5, 5, 3, 6, BR)
    set_pixel(g, 6, 5, NW)  # highlight

    # Sword blade (right diagonal)
    set_pixel(g, 9, 3, PG)
    set_pixel(g, 9, 4, LS)
    set_pixel(g, 10, 5, LS)
    set_pixel(g, 10, 6, PG)
    set_pixel(g, 10, 7, PG)
    # Crossguard
    draw_line_h(g, 9, 8, 3, DG)
    # Grip
    set_pixel(g, 10, 9, BN)
    set_pixel(g, 10, 10, BN)
    # Pommel
    set_pixel(g, 10, 11, GD)

    # Outline ring
    for dy in range(-7, 8):
        for dx in range(-7, 8):
            dist = dx * dx + dy * dy
            if 36 <= dist <= 49:
                set_pixel(g, 8 + dx, 8 + dy, K)

    return g


def gen_class_badge_mage():
    """16×16 mage class badge — arcane star/crystal."""
    g = blank(16, 16)

    # Background circle
    draw_circle_filled(g, 8, 8, 6, DK)
    draw_circle_filled(g, 8, 8, 5, PM)

    # Arcane crystal (diamond shape)
    set_pixel(g, 8, 3, SG)
    set_pixel(g, 7, 4, MV)
    set_pixel(g, 8, 4, SG)
    set_pixel(g, 9, 4, MV)
    set_pixel(g, 6, 5, MP)
    set_pixel(g, 7, 5, MV)
    set_pixel(g, 8, 5, SG)
    set_pixel(g, 9, 5, MV)
    set_pixel(g, 10, 5, MP)
    # Middle widest part
    for dx in range(-3, 4):
        c = SG if dx == 0 else (MV if abs(dx) <= 1 else MP)
        set_pixel(g, 8 + dx, 6, c)
    set_pixel(g, 6, 7, MP)
    set_pixel(g, 7, 7, MV)
    set_pixel(g, 8, 7, SG)
    set_pixel(g, 9, 7, MV)
    set_pixel(g, 10, 7, MP)
    # Lower half tapers
    set_pixel(g, 7, 8, MV)
    set_pixel(g, 8, 8, MV)
    set_pixel(g, 9, 8, MV)
    set_pixel(g, 7, 9, MP)
    set_pixel(g, 8, 9, MV)
    set_pixel(g, 9, 9, MP)
    set_pixel(g, 8, 10, MP)

    # Sparkle accents
    set_pixel(g, 4, 4, SG)
    set_pixel(g, 12, 4, SG)
    set_pixel(g, 4, 10, SG)
    set_pixel(g, 12, 10, SG)

    # Outline ring
    for dy in range(-7, 8):
        for dx in range(-7, 8):
            dist = dx * dx + dy * dy
            if 36 <= dist <= 49:
                set_pixel(g, 8 + dx, 8 + dy, K)

    return g


def gen_class_badge_ranger():
    """16×16 ranger class badge — bow/arrow silhouette."""
    g = blank(16, 16)

    # Background circle
    draw_circle_filled(g, 8, 8, 6, DK)
    draw_circle_filled(g, 8, 8, 5, DF)

    # Bow (arc on left)
    set_pixel(g, 5, 3, BN)
    set_pixel(g, 4, 4, DT)
    set_pixel(g, 4, 5, DT)
    set_pixel(g, 4, 6, DT)
    set_pixel(g, 4, 7, SN)
    set_pixel(g, 4, 8, DT)
    set_pixel(g, 4, 9, DT)
    set_pixel(g, 4, 10, DT)
    set_pixel(g, 5, 11, BN)

    # Bowstring
    draw_line_v(g, 6, 3, 9, LS)

    # Arrow shaft (horizontal)
    draw_line_h(g, 6, 7, 6, SN)
    # Arrowhead
    set_pixel(g, 12, 6, LS)
    set_pixel(g, 12, 7, PG)
    set_pixel(g, 13, 7, NW)
    set_pixel(g, 12, 8, LS)
    # Fletching
    set_pixel(g, 6, 6, LG)
    set_pixel(g, 6, 8, LG)

    # Outline ring
    for dy in range(-7, 8):
        for dx in range(-7, 8):
            dist = dx * dx + dy * dy
            if 36 <= dist <= 49:
                set_pixel(g, 8 + dx, 8 + dy, K)

    return g


# ─── Nameplate Level Background (16×16) ─────────────────────────────────────

def gen_nameplate_level_bg():
    """16×16 level number background — gold bordered square."""
    g = blank(16, 16)

    draw_rect(g, 1, 1, 14, 14, DK)
    draw_rect(g, 2, 2, 12, 12, ST)
    draw_rect(g, 3, 3, 10, 10, DK)
    draw_rect_outline(g, 1, 1, 14, 14, DG)
    draw_rect_outline(g, 0, 0, 16, 16, K)

    # Gold corner accents
    set_pixel(g, 2, 2, GD)
    set_pixel(g, 13, 2, GD)
    set_pixel(g, 2, 13, GD)
    set_pixel(g, 13, 13, GD)

    return g


# ─── 2. Compact Party Frame (128×64) ────────────────────────────────────────

def gen_party_compact_frame():
    """128×64 compact party display — 4 members with mini HP/MP bars."""
    W, H = 128, 64
    g = blank(W, H)

    # Panel background
    draw_rect(g, 0, 0, W, H, K)
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    draw_rect(g, 2, 2, W - 4, H - 4, ST)

    # 4 member rows (14px each, 1px gap)
    slot_colors = [PB, LG, YL, MV]  # party member accent colors
    for i in range(4):
        y = 3 + i * 15
        slot_bg = DK if i % 2 == 0 else ST

        # Row background
        draw_rect(g, 3, y, W - 6, 13, slot_bg)
        draw_rect_outline(g, 3, y, W - 6, 13, K)

        # Color indicator stripe (left)
        draw_rect(g, 4, y + 1, 2, 11, slot_colors[i])

        # Class icon placeholder (10×10)
        draw_rect(g, 8, y + 2, 10, 10, DK)
        draw_rect(g, 9, y + 3, 8, 8, slot_colors[i])
        draw_rect_outline(g, 8, y + 2, 10, 10, K)

        # Name placeholder
        draw_rect(g, 20, y + 2, 40, 5, DK)
        draw_rect(g, 21, y + 3, 38, 3, MG)

        # HP bar
        hp_x, hp_y = 20, y + 8
        hp_w = 40
        draw_rect(g, hp_x, hp_y, hp_w, 3, K)
        hp_fill = int(hp_w * (0.9 - i * 0.15))
        draw_rect(g, hp_x + 1, hp_y + 1, max(1, hp_fill - 2), 1, FG)

        # MP bar
        mp_x = hp_x + hp_w + 2
        mp_w = 30
        draw_rect(g, mp_x, hp_y, mp_w, 3, K)
        mp_fill = int(mp_w * (0.8 - i * 0.1))
        draw_rect(g, mp_x + 1, hp_y + 1, max(1, mp_fill - 2), 1, DP)

        # Level text area
        lv_x = mp_x + mp_w + 3
        draw_rect(g, lv_x, y + 3, 14, 8, DK)
        draw_rect(g, lv_x + 1, y + 4, 12, 6, ST)
        draw_rect_outline(g, lv_x, y + 3, 14, 8, DG)

    return g


# ─── 3. Chat UI Panel (240×160) ─────────────────────────────────────────────

def gen_panel_chat():
    """240×160 chat box background with header tabs area and message display."""
    W, H = 240, 160
    g = blank(W, H)

    # Outer frame (matches marketplace panel style)
    draw_rect(g, 0, 0, W, H, K)
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    draw_rect(g, 2, 2, W - 4, H - 4, ST)

    # Gold border accent (like marketplace)
    draw_line_h(g, 3, 2, W - 6, DG)
    draw_line_h(g, 3, H - 3, W - 6, DG)
    draw_line_v(g, 2, 3, H - 6, DG)
    draw_line_v(g, W - 3, 3, H - 6, DG)

    # Tab bar area (top 18px)
    draw_rect(g, 3, 3, W - 6, 16, DK)
    draw_line_h(g, 3, 19, W - 6, DG)

    # 4 tab slots
    tab_names_w = [48, 48, 48, 48]
    tab_x = 4
    for i, tw in enumerate(tab_names_w):
        # Active tab (first one) is highlighted
        bg = SB if i == 0 else DK
        top = PB if i == 0 else ST
        draw_rect(g, tab_x, 4, tw, 14, bg)
        draw_line_h(g, tab_x + 1, 4, tw - 2, top)
        draw_rect_outline(g, tab_x, 4, tw, 14, K)
        # Tab label placeholder
        draw_rect(g, tab_x + 6, 7, tw - 12, 6, DK if i == 0 else ST)
        tab_x += tw + 2

    # Message area (scrollable region)
    draw_rect(g, 3, 20, W - 6, H - 42, DK)
    draw_rect(g, 4, 21, W - 8, H - 44, ST)

    # Sample message rows (to show visual structure)
    for row in range(6):
        my = 24 + row * 18
        if my + 14 > H - 24:
            break
        row_bg = DK if row % 2 == 0 else ST
        draw_rect(g, 5, my, W - 10, 16, row_bg)

        # Timestamp area
        draw_rect(g, 7, my + 2, 24, 5, MG)
        draw_rect(g, 8, my + 3, 22, 3, DK)

        # Username area
        name_color = PB if row % 3 == 0 else (LG if row % 3 == 1 else GD)
        draw_rect(g, 34, my + 2, 32, 5, name_color)

        # Message text placeholder
        msg_w = 120 + (row * 7) % 40
        draw_rect(g, 70, my + 2, min(msg_w, W - 82), 5, LS)
        draw_rect(g, 70, my + 9, min(msg_w - 30, W - 82), 4, MG)

    # Input bar area (bottom)
    draw_rect(g, 3, H - 20, W - 6, 17, DK)
    draw_rect(g, 4, H - 19, W - 8, 15, ST)
    draw_rect_outline(g, 3, H - 20, W - 6, 17, DG)

    # Text input field
    draw_rect(g, 6, H - 17, W - 40, 11, DK)
    draw_rect(g, 7, H - 16, W - 42, 9, MG)

    # Send button
    draw_rect(g, W - 30, H - 17, 24, 11, DP)
    draw_rect(g, W - 29, H - 16, 22, 9, SB)
    draw_line_h(g, W - 28, H - 16, 20, PB)
    draw_rect_outline(g, W - 30, H - 17, 24, 11, K)

    # Corner gems (gold, matching marketplace style)
    for cx, cy in [(3, 3), (W - 4, 3), (3, H - 4), (W - 4, H - 4)]:
        set_pixel(g, cx, cy, GD)

    return g


# ─── Chat Input Bar (224×16) ────────────────────────────────────────────────

def gen_chat_input_bar():
    """224×16 standalone chat text input bar."""
    W, H = 224, 16
    g = blank(W, H)

    draw_rect(g, 0, 0, W, H, K)
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    draw_rect(g, 2, 2, W - 4, H - 4, ST)
    draw_rect(g, 3, 3, W - 6, H - 6, MG)

    # Gold frame accents
    draw_line_h(g, 2, 1, W - 4, DG)
    draw_line_h(g, 2, H - 2, W - 4, DG)

    # Cursor blink indicator (left side)
    draw_line_v(g, 5, 4, H - 8, NW)

    return g


# ─── Channel Tab Buttons (48×16 each) ───────────────────────────────────────

def gen_tab_button(accent_color, accent_light, active=False):
    """48×16 channel tab button."""
    W, H = 48, 16
    g = blank(W, H)

    if active:
        draw_rect(g, 0, 0, W, H, K)
        draw_rect(g, 1, 1, W - 2, H - 2, accent_color)
        draw_rect(g, 2, 2, W - 4, H - 4, accent_light)
        draw_line_h(g, 2, 2, W - 4, NW)  # top highlight
        draw_line_h(g, 2, H - 3, W - 4, accent_color)  # bottom shadow
    else:
        draw_rect(g, 0, 0, W, H, K)
        draw_rect(g, 1, 1, W - 2, H - 2, DK)
        draw_rect(g, 2, 2, W - 4, H - 4, ST)
        draw_line_h(g, 2, 2, W - 4, MG)  # subtle highlight

    # Label placeholder
    draw_rect(g, 8, 5, W - 16, 6, K if active else DK)

    return g


# ─── Chat Bubble Icon (16×16) ───────────────────────────────────────────────

def gen_icon_chat_bubble():
    """16×16 speech bubble indicator for above-head chat."""
    g = blank(16, 16)

    # Main bubble body
    draw_rect(g, 3, 2, 10, 8, PB)
    draw_rect(g, 2, 3, 12, 6, PB)
    # Interior
    draw_rect(g, 3, 3, 10, 6, HB)
    draw_rect(g, 4, 3, 8, 6, HB)

    # Bubble tail (bottom center pointing down)
    set_pixel(g, 6, 10, PB)
    set_pixel(g, 7, 10, PB)
    set_pixel(g, 5, 11, PB)
    set_pixel(g, 6, 11, PB)
    set_pixel(g, 5, 12, PB)

    # Three dots inside (typing/chat indicator)
    set_pixel(g, 5, 6, DP)
    set_pixel(g, 8, 6, DP)
    set_pixel(g, 11, 6, DP)

    # Outline
    draw_line_h(g, 3, 1, 10, K)
    draw_line_h(g, 3, 10, 10, K)
    set_pixel(g, 2, 2, K)
    set_pixel(g, 13, 2, K)
    draw_line_v(g, 1, 3, 6, K)
    draw_line_v(g, 14, 3, 6, K)
    set_pixel(g, 2, 9, K)
    set_pixel(g, 13, 9, K)
    # Tail outline
    set_pixel(g, 5, 10, K)
    set_pixel(g, 4, 11, K)
    set_pixel(g, 4, 12, K)
    set_pixel(g, 5, 13, K)
    set_pixel(g, 6, 12, K)
    set_pixel(g, 7, 11, K)
    set_pixel(g, 8, 10, K)

    # Highlight
    set_pixel(g, 4, 3, IW)
    set_pixel(g, 5, 3, IW)

    return g


# ─── 4. Connection Status Icons (16×16) ─────────────────────────────────────

def gen_connection_icon(bar_colors, dot_color):
    """16×16 signal strength icon with colored bars."""
    g = blank(16, 16)

    # Signal bars (3 bars, increasing height)
    bar_w = 3
    bar_gap = 1
    bar_heights = [4, 7, 10]
    for i, bh in enumerate(bar_heights):
        bx = 2 + i * (bar_w + bar_gap)
        by = 13 - bh
        draw_rect(g, bx, by, bar_w, bh, bar_colors[i])
        draw_rect_outline(g, bx, by, bar_w, bh, K)
        # Top highlight
        draw_line_h(g, bx + 1, by + 1, bar_w - 2, bar_colors[min(i + 1, 2)])

    # Status dot (top-right)
    draw_circle_filled(g, 13, 4, 2, dot_color)
    # Dot outline
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            dist = dx * dx + dy * dy
            if 4 <= dist <= 9:
                set_pixel(g, 13 + dx, 4 + dy, K)

    # Dot highlight
    set_pixel(g, 12, 3, NW)

    return g


def gen_status_connected():
    return gen_connection_icon([FG, LG, BG], LG)


def gen_status_reconnecting():
    return gen_connection_icon([DG, GD, ST], YL)


def gen_status_disconnected():
    return gen_connection_icon([DB, ER, ST], BR)


# ─── 5. Player List Panel (160×192) ─────────────────────────────────────────

def gen_panel_player_list():
    """160×192 scrollable player list panel."""
    W, H = 160, 192
    g = blank(W, H)

    # Outer frame (marketplace panel style)
    draw_rect(g, 0, 0, W, H, K)
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    draw_rect(g, 2, 2, W - 4, H - 4, ST)

    # Gold border
    draw_line_h(g, 3, 2, W - 6, DG)
    draw_line_h(g, 3, H - 3, W - 6, DG)
    draw_line_v(g, 2, 3, H - 6, DG)
    draw_line_v(g, W - 3, 3, H - 6, DG)

    # Title bar
    draw_rect(g, 3, 3, W - 6, 14, DP)
    draw_rect(g, 4, 4, W - 8, 12, SB)
    draw_line_h(g, 5, 5, W - 10, PB)
    draw_line_h(g, 5, 14, W - 10, DP)

    # "PLAYERS" label placeholder
    draw_rect(g, 40, 7, 80, 6, DP)
    draw_rect(g, 41, 8, 78, 4, PB)

    # Content area
    draw_rect(g, 3, 18, W - 6, H - 24, DK)
    draw_rect(g, 4, 19, W - 8, H - 26, ST)

    # Player rows (8 visible)
    for i in range(8):
        ry = 21 + i * 20
        if ry + 18 > H - 8:
            break
        row_bg = DK if i % 2 == 0 else ST
        draw_rect(g, 5, ry, W - 10, 18, row_bg)
        draw_rect_outline(g, 5, ry, W - 10, 18, K)

        # Online status dot
        dot_color = LG if i < 5 else (YL if i == 5 else MG)
        draw_circle_filled(g, 12, ry + 9, 2, dot_color)
        set_pixel(g, 11, ry + 8, NW)

        # Player name placeholder
        draw_rect(g, 18, ry + 3, 60, 5, MG)
        draw_rect(g, 19, ry + 4, 58, 3, row_bg)

        # Level badge
        draw_rect(g, 82, ry + 2, 16, 8, DK)
        draw_rect(g, 83, ry + 3, 14, 6, ST)
        draw_rect_outline(g, 82, ry + 2, 16, 8, DG)

        # Class icon (mini)
        class_colors = [BR, MV, LG, BR, MV, LG, BR, MV]
        draw_rect(g, 102, ry + 2, 10, 10, DK)
        draw_rect(g, 103, ry + 3, 8, 8, class_colors[i])
        draw_rect_outline(g, 102, ry + 2, 10, 10, K)

        # Action buttons area (invite/inspect)
        draw_rect(g, 118, ry + 3, 28, 10, DP)
        draw_rect(g, 119, ry + 4, 26, 8, SB)
        draw_rect_outline(g, 118, ry + 3, 28, 10, K)

    # Scrollbar track (right side)
    draw_rect(g, W - 8, 19, 4, H - 26, DK)
    draw_rect_outline(g, W - 8, 19, 4, H - 26, K)
    # Scrollbar thumb
    draw_rect(g, W - 7, 22, 2, 40, DG)
    draw_rect(g, W - 7, 22, 2, 2, GD)

    # Corner gems
    for cx, cy in [(3, 3), (W - 4, 3), (3, H - 4), (W - 4, H - 4)]:
        set_pixel(g, cx, cy, GD)

    return g


# ─── Player Row Highlight (144×16) ──────────────────────────────────────────

def gen_player_row_highlight():
    """144×16 semi-transparent row highlight overlay."""
    W, H = 144, 16
    g = blank(W, H)

    # Highlight fill (player blue, slightly transparent feel via dithering)
    for y in range(H):
        for x in range(W):
            if (x + y) % 2 == 0:
                g[y][x] = (80, 168, 232, 128)
            else:
                g[y][x] = (42, 122, 192, 64)

    # Solid border edges
    draw_line_h(g, 0, 0, W, DP)
    draw_line_h(g, 0, H - 1, W, DP)

    return g


# ─── Online/Offline/Away Status Dots (8×8) ──────────────────────────────────

def gen_status_dot(outer_color, inner_color):
    """8×8 status indicator dot."""
    g = blank(8, 8)

    draw_circle_filled(g, 4, 4, 3, outer_color)
    draw_circle_filled(g, 4, 4, 2, inner_color)
    set_pixel(g, 3, 3, NW)  # highlight

    # Outline
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            dist = dx * dx + dy * dy
            if 9 <= dist <= 16:
                set_pixel(g, 4 + dx, 4 + dy, K)

    return g


# ─── 6. Minimap Player Dots (8×8) ───────────────────────────────────────────

def gen_minimap_dot(outer_color, inner_color, highlight=NW):
    """8×8 minimap player dot."""
    g = blank(8, 8)

    draw_circle_filled(g, 4, 4, 3, outer_color)
    draw_circle_filled(g, 4, 4, 2, inner_color)
    set_pixel(g, 3, 3, highlight)

    # Outline
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            dist = dx * dx + dy * dy
            if 9 <= dist <= 16:
                set_pixel(g, 4 + dx, 4 + dy, K)

    return g


# ─── Dual Write ─────────────────────────────────────────────────────────────

def dual_write(rel_path, pixels):
    """Write to both assets/ source dir and public/assets/ deploy dir."""
    art_path = os.path.join(SCRIPT_DIR, '..', rel_path)
    os.makedirs(os.path.dirname(art_path), exist_ok=True)
    write_png(art_path, pixels)

    pub_path = os.path.join(OUT_DIR, os.path.basename(rel_path))
    write_png(pub_path, pixels)


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print('=== Generating Multiplayer HUD & Chat UI Assets (PIX-330) ===\n')

    # ── 1. Player Nameplates ──
    print('-- Player Nameplates --')
    dual_write('assets/ui/multiplayer/ui_nameplate_frame.png', gen_nameplate_frame())
    dual_write('assets/ui/multiplayer/icon_class_badge_warrior.png', gen_class_badge_warrior())
    dual_write('assets/ui/multiplayer/icon_class_badge_mage.png', gen_class_badge_mage())
    dual_write('assets/ui/multiplayer/icon_class_badge_ranger.png', gen_class_badge_ranger())
    dual_write('assets/ui/multiplayer/ui_nameplate_level_bg.png', gen_nameplate_level_bg())

    # ── 2. Compact Party Frame ──
    print('\n-- Compact Party Frame --')
    dual_write('assets/ui/multiplayer/ui_party_compact_frame.png', gen_party_compact_frame())

    # ── 3. Chat UI ──
    print('\n-- Chat UI --')
    dual_write('assets/ui/multiplayer/ui_panel_chat.png', gen_panel_chat())
    dual_write('assets/ui/multiplayer/ui_chat_input_bar.png', gen_chat_input_bar())
    dual_write('assets/ui/multiplayer/ui_btn_tab_general.png', gen_tab_button(SB, PB, active=True))
    dual_write('assets/ui/multiplayer/ui_btn_tab_party.png', gen_tab_button(DP, SB, active=False))
    dual_write('assets/ui/multiplayer/ui_btn_tab_trade.png', gen_tab_button(DG, GD, active=False))
    dual_write('assets/ui/multiplayer/ui_btn_tab_system.png', gen_tab_button(MG, LS, active=False))
    dual_write('assets/ui/multiplayer/icon_chat_bubble.png', gen_icon_chat_bubble())

    # ── 4. Connection Status Icons ──
    print('\n-- Connection Status Icons --')
    dual_write('assets/ui/multiplayer/icon_status_connected.png', gen_status_connected())
    dual_write('assets/ui/multiplayer/icon_status_reconnecting.png', gen_status_reconnecting())
    dual_write('assets/ui/multiplayer/icon_status_disconnected.png', gen_status_disconnected())

    # ── 5. Player List Panel ──
    print('\n-- Player List Panel --')
    dual_write('assets/ui/multiplayer/ui_panel_player_list.png', gen_panel_player_list())
    dual_write('assets/ui/multiplayer/ui_player_row_highlight.png', gen_player_row_highlight())
    dual_write('assets/ui/multiplayer/icon_dot_online.png', gen_status_dot(FG, LG))
    dual_write('assets/ui/multiplayer/icon_dot_offline.png', gen_status_dot(ST, MG))
    dual_write('assets/ui/multiplayer/icon_dot_away.png', gen_status_dot(DG, YL))

    # ── 6. Minimap Player Dots ──
    print('\n-- Minimap Player Dots --')
    dual_write('assets/ui/multiplayer/icon_minimap_self.png', gen_minimap_dot(PG, NW))
    dual_write('assets/ui/multiplayer/icon_minimap_party_mp.png', gen_minimap_dot(DP, PB))
    dual_write('assets/ui/multiplayer/icon_minimap_other_player.png', gen_minimap_dot(FG, LG))
    dual_write('assets/ui/multiplayer/icon_minimap_hostile.png', gen_minimap_dot(DB, BR))

    total = 5 + 1 + 7 + 3 + 5 + 4  # nameplates + party + chat + connection + playerlist + minimap
    print(f'\n=== Done! Generated {total} multiplayer HUD & chat UI assets ===')


if __name__ == '__main__':
    main()
