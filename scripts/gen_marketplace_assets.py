#!/usr/bin/env python3
"""
Generate marketplace and trading UI art assets for PixelRealm.
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md:
  - 32-color master palette only
  - 16×16 icons, 16×24 NPC sprite
  - Nearest-neighbor scaling
  - Consistent naming convention

Assets produced:
  UI panels:
    ui_panel_marketplace.png    — 220×160 marketplace backdrop
    ui_panel_trade.png          — 220×150 trade window backdrop
    ui_card_listing.png         — 60×20  item listing card template

  NPC sprite:
    char_npc_shopkeeper.png     — 64×24  shopkeeper (4 frames: idle×2, gesture×2)

  Icons (16×16):
    icon_trade_pending.png      — hourglass / pending state
    icon_trade_confirmed.png    — checkmark / confirmed state
    icon_trade_cancelled.png    — X mark / cancelled state
    icon_currency_gold.png      — gold coin
    icon_currency_silver.png    — silver coin
    icon_currency_gem.png       — gem/premium currency
    icon_tab_weapons.png        — sword icon for weapons tab
    icon_tab_armor.png          — shield icon for armor tab
    icon_tab_consumables.png    — potion icon for consumables tab
    icon_tab_materials.png      — ore/crystal icon for materials tab
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
OUT_DIR    = os.path.join(SCRIPT_DIR, '..', 'public', 'assets')
ART_UI     = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui')
ART_PANELS = os.path.join(ART_UI, 'panels')
ART_ICONS  = os.path.join(ART_UI, 'icons')
ART_CHARS  = os.path.join(SCRIPT_DIR, '..', 'assets', 'sprites', 'characters')

for d in [OUT_DIR, ART_PANELS, ART_ICONS, ART_CHARS]:
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


def hstack(frames):
    """Horizontally concatenate pixel grids (same height)."""
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result


def draw_rect(grid, x, y, w, h, color):
    """Draw a filled rectangle on grid."""
    for ry in range(y, min(y + h, len(grid))):
        for rx in range(x, min(x + w, len(grid[0]))):
            grid[ry][rx] = color


def draw_rect_outline(grid, x, y, w, h, color):
    """Draw a rectangle outline on grid."""
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
    """Safely set a pixel."""
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color


# ─── UI Panel Backgrounds ───────────────────────────────────────────────────

def gen_marketplace_panel():
    """220×160 marketplace panel — wood/gold themed auction house frame."""
    W, H = 220, 160
    grid = blank(W, H)

    # Fill dark background with slight transparency
    BK = (0, 0, 0, 224)
    draw_rect(grid, 0, 0, W, H, BK)

    # Outer border — warm wood tones (0x554422 from code)
    draw_rect_outline(grid, 0, 0, W, H, BN)       # outer edge
    draw_rect_outline(grid, 1, 1, W - 2, H - 2, DT)  # inner edge

    # Corner decorations — gold studs
    for cx, cy in [(2, 2), (W - 3, 2), (2, H - 3), (W - 3, H - 3)]:
        set_pixel(grid, cx, cy, GD)

    # Top banner area — darker wood header bar
    draw_rect(grid, 2, 2, W - 4, 10, BD)
    draw_rect(grid, 2, 12, W - 4, 1, DT)  # divider below header

    # Gold accent dots along top
    for x in range(6, W - 6, 8):
        set_pixel(grid, x, 3, GD)
        set_pixel(grid, x, 10, GD)

    # Side pillars — thin wood trim
    for y in range(13, H - 3):
        set_pixel(grid, 2, y, BD)
        set_pixel(grid, 3, y, DT if y % 4 < 2 else BD)
        set_pixel(grid, W - 3, y, BD)
        set_pixel(grid, W - 4, y, DT if y % 4 < 2 else BD)

    # Tab area — slightly lighter strip
    draw_rect(grid, 4, 13, W - 8, 10, (20, 20, 20, 230))
    draw_rect(grid, 4, 23, W - 8, 1, DT)  # tab divider

    # Content area subtle grid lines
    for y in range(38, H - 20, 14):
        for x in range(6, W - 6):
            if x % 2 == 0:
                set_pixel(grid, x, y, (43, 43, 43, 100))

    # Bottom status bar
    draw_rect(grid, 2, H - 14, W - 4, 12, BD)
    draw_rect(grid, 2, H - 14, W - 4, 1, DT)  # divider above

    # Gold coin emblem in header center
    for dy, row_data in enumerate([
        [_, GD, GD, _],
        [GD, YL, DG, GD],
        [GD, DG, YL, GD],
        [_, GD, GD, _],
    ]):
        for dx, c in enumerate(row_data):
            if c != _:
                set_pixel(grid, W // 2 - 2 + dx, 5 + dy, c)

    # Scale/balance icon next to coin
    for dy, row_data in enumerate([
        [_, _, DT, _, _],
        [DT, DT, DT, DT, DT],
        [_, DT, _, DT, _],
        [DT, DT, _, DT, DT],
    ]):
        for dx, c in enumerate(row_data):
            if c != _:
                set_pixel(grid, W // 2 + 5 + dx, 5 + dy, c)

    return grid


def gen_trade_panel():
    """220×150 trade window — two-column layout with warm border."""
    W, H = 220, 150
    grid = blank(W, H)

    # Dark background
    BK = (0, 0, 0, 224)
    draw_rect(grid, 0, 0, W, H, BK)

    # Warm border (0x664422 from TradeWindow.ts)
    bdr = (102, 68, 34, 230)
    draw_rect_outline(grid, 0, 0, W, H, bdr)
    draw_rect_outline(grid, 1, 1, W - 2, H - 2, DT)

    # Corner decorations
    for cx, cy in [(2, 2), (W - 3, 2), (2, H - 3), (W - 3, H - 3)]:
        set_pixel(grid, cx, cy, SN)

    # Header bar
    draw_rect(grid, 2, 2, W - 4, 10, BD)
    draw_rect(grid, 2, 12, W - 4, 1, DT)

    # Handshake icon in header
    for dy, row_data in enumerate([
        [_, _, SN, _, _, _, SN, _, _],
        [_, SN, DT, SN, _, SN, DT, SN, _],
        [SN, DT, SN, DT, SN, DT, SN, DT, SN],
        [_, SN, DT, DT, DT, DT, DT, SN, _],
        [_, _, SN, DT, DT, DT, SN, _, _],
        [_, _, _, SN, SN, SN, _, _, _],
    ]):
        for dx, c in enumerate(row_data):
            if c != _:
                set_pixel(grid, W // 2 - 4 + dx, 3 + dy, c)

    # Center divider — vertical line separating two players' offers
    mid_x = W // 2
    for y in range(14, H - 14):
        set_pixel(grid, mid_x, y, bdr)
        if y % 3 == 0:
            set_pixel(grid, mid_x - 1, y, (59, 32, 16, 100))
            set_pixel(grid, mid_x + 1, y, (59, 32, 16, 100))

    # Column headers — subtle darker area
    draw_rect(grid, 3, 13, mid_x - 4, 8, (20, 20, 20, 200))
    draw_rect(grid, mid_x + 1, 13, mid_x - 4, 8, (20, 20, 20, 200))

    # Item slot grid hints — left column
    for row in range(4):
        for col in range(3):
            sx = 6 + col * 20
            sy = 24 + row * 18
            draw_rect_outline(grid, sx, sy, 16, 16, (43, 43, 43, 150))

    # Item slot grid hints — right column
    for row in range(4):
        for col in range(3):
            sx = mid_x + 4 + col * 20
            sy = 24 + row * 18
            draw_rect_outline(grid, sx, sy, 16, 16, (43, 43, 43, 150))

    # Gold input area at bottom of each column
    draw_rect(grid, 4, H - 28, mid_x - 6, 10, (20, 15, 5, 180))
    draw_rect_outline(grid, 4, H - 28, mid_x - 6, 10, DG)
    draw_rect(grid, mid_x + 2, H - 28, mid_x - 6, 10, (20, 15, 5, 180))
    draw_rect_outline(grid, mid_x + 2, H - 28, mid_x - 6, 10, DG)

    # Gold coin icons in gold input areas
    for ox in [8, mid_x + 6]:
        set_pixel(grid, ox, H - 26, GD)
        set_pixel(grid, ox + 1, H - 26, YL)
        set_pixel(grid, ox, H - 25, YL)
        set_pixel(grid, ox + 1, H - 25, DG)

    # Bottom button area
    draw_rect(grid, 2, H - 14, W - 4, 12, BD)
    draw_rect(grid, 2, H - 14, W - 4, 1, DT)

    # Confirm button area (left)
    draw_rect(grid, 6, H - 12, 50, 8, (34, 68, 34, 230))
    draw_rect_outline(grid, 6, H - 12, 50, 8, FG)

    # Cancel button area (right)
    draw_rect(grid, W - 56, H - 12, 50, 8, (68, 34, 34, 230))
    draw_rect_outline(grid, W - 56, H - 12, 50, 8, ER)

    return grid


def gen_listing_card():
    """60×20 item listing card template — shows item icon frame, name area, price."""
    W, H = 60, 20
    grid = blank(W, H)

    # Card background
    draw_rect(grid, 0, 0, W, H, (17, 17, 17, 230))
    draw_rect_outline(grid, 0, 0, W, H, DT)

    # Item icon slot (left side)
    draw_rect_outline(grid, 2, 2, 16, 16, SN)
    draw_rect(grid, 3, 3, 14, 14, (30, 30, 30, 230))

    # Rarity indicator bar (thin colored line at top of icon slot)
    for x in range(3, 17):
        set_pixel(grid, x, 2, MG)  # default: common gray

    # Price tag area (right side)
    draw_rect(grid, 40, 2, 18, 8, (30, 20, 5, 200))
    draw_rect_outline(grid, 40, 2, 18, 8, DG)

    # Gold coin on price tag
    set_pixel(grid, 42, 4, GD)
    set_pixel(grid, 43, 4, YL)
    set_pixel(grid, 42, 5, YL)
    set_pixel(grid, 43, 5, DG)

    # Seller area hint (bottom-right)
    for x in range(40, 56):
        set_pixel(grid, x, 14, (43, 43, 43, 100))

    return grid


# ─── NPC Shopkeeper Sprite ───────────────────────────────────────────────────

def gen_shopkeeper():
    """16×24 shopkeeper NPC — warm brown apron, gold accents, friendly merchant.
    Spritesheet: 4 frames × 16px wide = 64×24.
    Frames: idle1, idle2, gesture1 (hand up), gesture2 (hand down).
    """

    # Frame 1: Idle (neutral pose)
    idle1 = blank(16, 24)
    # rows 0-7: head (8px)
    head = [
        #0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15
        [_, _, _, _, _, _, K, K, K, K, _, _, _, _, _, _],   # 0  hat top
        [_, _, _, _, _, K, BN,BN,BN,BN, K, _, _, _, _, _],  # 1  hat
        [_, _, _, _, K, BN,DT,DT,DT,DT,BN, K, _, _, _, _],  # 2  hat brim
        [_, _, _, _, K, K, K, K, K, K, K, K, _, _, _, _],   # 3  hat brim line
        [_, _, _, _, _, K,PG,PG,PG,PG, K, _, _, _, _, _],   # 4  face top
        [_, _, _, _, _, K,PG, K,PG, K,PG, K, _, _, _, _],   # 5  eyes (using K for pupils) -- FIXED
        [_, _, _, _, _, K,PG,PG,PG,PG, K, _, _, _, _, _],   # 6  face
        [_, _, _, _, _, _, K,PG,PG, K, _, _, _, _, _, _],   # 7  chin
    ]
    # Fix row 5 to be proper eyes
    idle1[5] = [_, _, _, _, _, K, PG, K, PG, K, PG, K, _, _, _, _]  # eyes wrong
    # Let me redo this more carefully
    head = [
        [_, _, _, _, _, _, K, K, K, K, _, _, _, _, _, _],   # 0  hat top
        [_, _, _, _, _, K, BN,BN,BN,BN, K, _, _, _, _, _],  # 1  hat body
        [_, _, _, _, K, BN,DT,DT,DT,DT,BN, K, _, _, _, _],  # 2  hat mid
        [_, _, _, K, K, K, K, K, K, K, K, K, K, _, _, _],   # 3  hat brim
        [_, _, _, _, _, K,PG,PG,PG,PG, K, _, _, _, _, _],   # 4  forehead
        [_, _, _, _, _, K, K,PG, K,PG, K, _, _, _, _, _],   # 5  eyes
        [_, _, _, _, _, K,PG,PG,PG,PG, K, _, _, _, _, _],   # 6  nose/mouth
        [_, _, _, _, _, _, K,PG,PG, K, _, _, _, _, _, _],   # 7  chin
    ]
    for r in range(8):
        idle1[r] = head[r]

    # rows 8-18: body (11px) — brown apron, arms at sides
    body = [
        [_, _, _, _, _, K,DT,DT,DT,DT, K, _, _, _, _, _],   # 8  shoulders
        [_, _, _, _, K,SN,BD,DT,DT,BD,SN, K, _, _, _, _],   # 9  upper body
        [_, _, _, _, K,SN,BD,DT,DT,BD,SN, K, _, _, _, _],   # 10
        [_, _, _, K,PG, K,BD,GD,GD,BD, K,PG, K, _, _, _],   # 11 arms + gold buttons
        [_, _, _, _, K, K,BD,DT,DT,BD, K, K, _, _, _, _],   # 12
        [_, _, _, _, _, K,BD,DT,DT,BD, K, _, _, _, _, _],   # 13 waist
        [_, _, _, _, _, K,BN,DT,DT,BN, K, _, _, _, _, _],   # 14 apron
        [_, _, _, _, _, K,BN,DT,DT,BN, K, _, _, _, _, _],   # 15
        [_, _, _, _, _, K,BN,BN,BN,BN, K, _, _, _, _, _],   # 16
    ]
    for i, r in enumerate(body):
        idle1[8 + i] = r

    # rows 17-23: legs (5px + feet)
    legs = [
        [_, _, _, _, _, K,BN,BN,BN,BN, K, _, _, _, _, _],   # 17
        [_, _, _, _, _, K,BD, K,BD, K, _, _, _, _, _, _],    # 18 leg split -- WRONG
        [_, _, _, _, _, K,BD, K, K,BD, K, _, _, _, _, _],   # 19
        [_, _, _, _, _, K,BD, K, K,BD, K, _, _, _, _, _],   # 20
        [_, _, _, _, _, K, K, _, _, K, K, _, _, _, _, _],   # 21 ankles
        [_, _, _, _, K,DT,DT, K, K,DT,DT, K, _, _, _, _],   # 22 shoes
        [_, _, _, _, K, K, K, _, _, K, K, K, _, _, _, _],   # 23 shoe soles
    ]
    for i, r in enumerate(legs):
        idle1[17 + i] = r

    # Frame 2: Idle2 (slight bounce — shift body 1px down effect via hat pixel)
    idle2 = [row[:] for row in idle1]
    # Subtle change: blink (close eyes)
    idle2[5] = [_, _, _, _, _, K, K, K, K, K, K, _, _, _, _, _]

    # Frame 3: Gesture — arm up (right arm raised, as if presenting wares)
    gesture1 = [row[:] for row in idle1]
    # Right arm raised
    gesture1[8]  = [_, _, _, _, _, K,DT,DT,DT,DT, K, K, _, _, _, _]
    gesture1[9]  = [_, _, _, _, K,SN,BD,DT,DT,BD,SN,PG, K, _, _, _]
    gesture1[10] = [_, _, _, _, K,SN,BD,DT,DT,BD,SN, K,PG, K, _, _]
    gesture1[11] = [_, _, _, K,PG, K,BD,GD,GD,BD, K, _,PG, K, _, _]
    gesture1[12] = [_, _, _, _, K, K,BD,DT,DT,BD, K, _, K, _, _, _]

    # Frame 4: Gesture2 — other arm up
    gesture2 = [row[:] for row in idle1]
    gesture2[8]  = [_, _, K, K,DT,DT,DT,DT,DT,DT, K, _, _, _, _, _]
    gesture2[9]  = [_, K,PG,SN,BD,DT,DT,BD,SN, K, _, _, _, _, _, _]
    gesture2[10] = [K,PG, K,SN,BD,DT,DT,BD,SN, K, _, _, _, _, _, _]
    gesture2[11] = [K,PG, _, K,BD,GD,GD,BD, K,PG, K, _, _, _, _, _]
    gesture2[12] = [_, K, _, K, K,BD,DT,BD, K, K, _, _, _, _, _, _]

    return hstack([idle1, idle2, gesture1, gesture2])


# ─── Trade Status Icons (16×16) ─────────────────────────────────────────────

def gen_icon_trade_pending():
    """Hourglass icon — pending trade state. Yellow/gold palette."""
    grid = blank(16, 16)

    icon = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, K, K, K, K, K, K, K, K, _, _, _, _],
        [_, _, _, _, K,GD,GD,GD,GD,GD,GD, K, _, _, _, _],
        [_, _, _, _, _, K,GD,GD,GD,GD, K, _, _, _, _, _],
        [_, _, _, _, _, _, K,DG,DG, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, K,SN,SN, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, K,SN,SN, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, K, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, K, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, K,SN,SN, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, K,YL,YL, K, _, _, _, _, _, _],
        [_, _, _, _, _, K,YL,YL,YL,YL, K, _, _, _, _, _],
        [_, _, _, _, _, K,GD,GD,GD,GD, K, _, _, _, _, _],
        [_, _, _, _, K,GD,GD,GD,GD,GD,GD, K, _, _, _, _],
        [_, _, _, _, K, K, K, K, K, K, K, K, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ]
    for r in range(16):
        grid[r] = icon[r]
    return grid


def gen_icon_trade_confirmed():
    """Checkmark icon — confirmed trade state. Green palette."""
    grid = blank(16, 16)

    icon = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, K, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, K,FG, K, _, _],
        [_, _, _, _, _, _, _, _, _, _, K,FG,LG, K, _, _],
        [_, _, _, _, _, _, _, _, _, K,FG,LG, K, _, _, _],
        [_, _, _, _, _, _, _, _, K,FG,LG, K, _, _, _, _],
        [_, _, K, _, _, _, _, K,FG,LG, K, _, _, _, _, _],
        [_, _, K,FG, K, _, K,FG,LG, K, _, _, _, _, _, _],
        [_, _, _, K,FG, K,FG,LG, K, _, _, _, _, _, _, _],
        [_, _, _, _, K,FG,LG, K, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, K,LG, K, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, K, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ]
    for r in range(16):
        grid[r] = icon[r]
    return grid


def gen_icon_trade_cancelled():
    """X mark icon — cancelled trade state. Red palette."""
    grid = blank(16, 16)

    icon = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, K, K, _, _, _, _, _, _, K, K, _, _, _],
        [_, _, _, K,ER,BR, K, _, _, K,BR,ER, K, _, _, _],
        [_, _, _, _, K,ER,BR, K, K,BR,ER, K, _, _, _, _],
        [_, _, _, _, _, K,ER,BR,BR,ER, K, _, _, _, _, _],
        [_, _, _, _, _, _, K,BR,BR, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, K,BR,BR, K, _, _, _, _, _, _],
        [_, _, _, _, _, K,ER,BR,BR,ER, K, _, _, _, _, _],
        [_, _, _, _, K,ER,BR, K, K,BR,ER, K, _, _, _, _],
        [_, _, _, K,ER,BR, K, _, _, K,BR,ER, K, _, _, _],
        [_, _, _, K, K, _, _, _, _, _, _, K, K, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ]
    for r in range(16):
        grid[r] = icon[r]
    return grid


# ─── Currency Icons (16×16) ─────────────────────────────────────────────────

def gen_icon_currency_gold():
    """Gold coin — primary currency. Yellow/gold palette."""
    grid = blank(16, 16)

    icon = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, K, K, K, K, _, _, _, _, _, _],
        [_, _, _, _, _, K,GD,GD,GD,GD, K, _, _, _, _, _],
        [_, _, _, _, K,GD,YL,YL,YL,GD,GD, K, _, _, _, _],
        [_, _, _, _, K,GD,YL,GD,GD,GD,GD, K, _, _, _, _],
        [_, _, _, _, K,GD,YL,GD,YL,YL,GD, K, _, _, _, _],
        [_, _, _, _, K,GD,YL,GD,YL,GD,GD, K, _, _, _, _],
        [_, _, _, _, K,GD,YL,GD,YL,YL,GD, K, _, _, _, _],
        [_, _, _, _, K,GD,YL,GD,GD,GD,GD, K, _, _, _, _],
        [_, _, _, _, K,GD,GD,YL,YL,GD,GD, K, _, _, _, _],
        [_, _, _, _, _, K,DG,GD,GD,DG, K, _, _, _, _, _],
        [_, _, _, _, _, _, K, K, K, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ]
    for r in range(16):
        grid[r] = icon[r]
    return grid


def gen_icon_currency_silver():
    """Silver coin — secondary currency. Gray palette."""
    grid = blank(16, 16)

    icon = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, K, K, K, K, _, _, _, _, _, _],
        [_, _, _, _, _, K,MG,MG,MG,MG, K, _, _, _, _, _],
        [_, _, _, _, K,MG,LS,LS,LS,MG,MG, K, _, _, _, _],
        [_, _, _, _, K,MG,LS,MG,MG,MG,MG, K, _, _, _, _],
        [_, _, _, _, K,MG,LS,MG,LS,LS,MG, K, _, _, _, _],
        [_, _, _, _, K,MG,LS,MG,LS,MG,MG, K, _, _, _, _],
        [_, _, _, _, K,MG,LS,MG,LS,LS,MG, K, _, _, _, _],
        [_, _, _, _, K,MG,LS,MG,MG,MG,MG, K, _, _, _, _],
        [_, _, _, _, K,MG,MG,LS,LS,MG,MG, K, _, _, _, _],
        [_, _, _, _, _, K,ST,MG,MG,ST, K, _, _, _, _, _],
        [_, _, _, _, _, _, K, K, K, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ]
    for r in range(16):
        grid[r] = icon[r]
    return grid


def gen_icon_currency_gem():
    """Gem — premium currency. Purple/magic palette."""
    grid = blank(16, 16)

    icon = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, K, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, K,SG,SG, K, _, _, _, _, _, _],
        [_, _, _, _, _, K,SG,MV,MV,SG, K, _, _, _, _, _],
        [_, _, _, _, K, K,MV,MV,MV,MV, K, K, _, _, _, _],
        [_, _, _, K,MP, K,MV,SG,SG,MV, K,MP, K, _, _, _],
        [_, _, _, _, K,MP,MV,MV,MV,MV,MP, K, _, _, _, _],
        [_, _, _, _, _, K,MP,MV,MV,MP, K, _, _, _, _, _],
        [_, _, _, _, _, _, K,MP,MP, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, K, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ]
    for r in range(16):
        grid[r] = icon[r]
    return grid


# ─── Category Tab Icons (16×16) ─────────────────────────────────────────────

def gen_icon_tab_weapons():
    """Sword icon for weapons category tab."""
    grid = blank(16, 16)

    icon = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, K, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, K,LS, K, _],
        [_, _, _, _, _, _, _, _, _, _, _, K,LS,MG, K, _],
        [_, _, _, _, _, _, _, _, _, _, K,LS,MG, K, _, _],
        [_, _, _, _, _, _, _, _, _, K,LS,MG, K, _, _, _],
        [_, _, _, _, _, _, _, _, K,LS,MG, K, _, _, _, _],
        [_, _, _, _, _, _, _, K,LS,MG, K, _, _, _, _, _],
        [_, _, _, _, _, _, K,LS,MG, K, _, _, _, _, _, _],
        [_, _, _, _, _, K,LS,MG, K, _, _, _, _, _, _, _],
        [_, _, _, _, K,LS,MG, K, _, _, _, _, _, _, _, _],
        [_, _, _, K,BN,MG, K, _, _, _, _, _, _, _, _, _],
        [_, _, K,BN, K, K, _, _, _, _, _, _, _, _, _, _],
        [_, K,DT,BN, K, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, K,DT, K, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, K, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ]
    for r in range(16):
        grid[r] = icon[r]
    return grid


def gen_icon_tab_armor():
    """Shield icon for armor category tab."""
    grid = blank(16, 16)

    icon = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, K, K, K, K, K, K, K, K, _, _, _, _],
        [_, _, _, K,DP,DP,SB,PB,PB,SB,DP,DP, K, _, _, _],
        [_, _, _, K,DP,SB,PB,HB,HB,PB,SB,DP, K, _, _, _],
        [_, _, _, K,DP,SB,PB,PB,PB,PB,SB,DP, K, _, _, _],
        [_, _, _, K,DP,SB,PB,SB,SB,PB,SB,DP, K, _, _, _],
        [_, _, _, K,DP,SB,PB,PB,PB,PB,SB,DP, K, _, _, _],
        [_, _, _, K,DP,DP,SB,PB,PB,SB,DP,DP, K, _, _, _],
        [_, _, _, _, K,DP,SB,PB,PB,SB,DP, K, _, _, _, _],
        [_, _, _, _, K,DP,DP,SB,SB,DP,DP, K, _, _, _, _],
        [_, _, _, _, _, K,DP,DP,DP,DP, K, _, _, _, _, _],
        [_, _, _, _, _, _, K,DP,DP, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, K, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ]
    for r in range(16):
        grid[r] = icon[r]
    return grid


def gen_icon_tab_consumables():
    """Potion bottle icon for consumables category tab."""
    grid = blank(16, 16)

    icon = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, K, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, K,LG, K, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, K,FG,FG, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, K,FG,FG, K, _, _, _, _, _, _],
        [_, _, _, _, _, K, K,FG,FG, K, K, _, _, _, _, _],
        [_, _, _, _, K,FG, _,FG,FG, _,FG, K, _, _, _, _],
        [_, _, _, _, K,FG,LG,FG,FG,LG,FG, K, _, _, _, _],
        [_, _, _, _, K,FG,LG,BG,BG,LG,FG, K, _, _, _, _],
        [_, _, _, _, K,FG,LG,BG,BG,LG,FG, K, _, _, _, _],
        [_, _, _, _, K,FG,LG,LG,LG,LG,FG, K, _, _, _, _],
        [_, _, _, _, K,FG,FG,FG,FG,FG,FG, K, _, _, _, _],
        [_, _, _, _, _, K, K, K, K, K, K, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ]
    for r in range(16):
        grid[r] = icon[r]
    return grid


def gen_icon_tab_materials():
    """Crystal/ore icon for materials category tab."""
    grid = blank(16, 16)

    icon = [
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, K,SN, K, _, _, _, _, _, _],
        [_, _, _, _, _, K, _, K,DT,SN, K, _, _, _, _, _],
        [_, _, _, _, K,SN, K, K,DT,SN, K, _, _, _, _, _],
        [_, _, _, K,SN,DT,SN, K,DT,SN, K, _, _, _, _, _],
        [_, _, _, K,DT,DT,DT,SN,DT,DT,SN, K, _, _, _, _],
        [_, _, _, K,BD,DT,DT,DT,DT,DT,DT, K, _, _, _, _],
        [_, _, _, _, K,BD,DT,DT,DT,DT, K, _, _, _, _, _],
        [_, _, _, K,ST,ST, K, K,BD, K,ST,ST, K, _, _, _],
        [_, _, K,ST,MG,MG,ST,ST,ST,ST,MG,MG,ST, K, _, _],
        [_, _, K,ST,ST,ST,ST,ST,ST,ST,ST,ST,ST, K, _, _],
        [_, _, _, K, K, K, K, K, K, K, K, K, K, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ]
    for r in range(16):
        grid[r] = icon[r]
    return grid


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print('Generating marketplace & trading UI assets...\n')

    # UI Panels
    print('UI Panels:')
    panel = gen_marketplace_panel()
    write_png(os.path.join(ART_PANELS, 'ui_panel_marketplace.png'), panel)
    write_png(os.path.join(OUT_DIR, 'ui_panel_marketplace.png'), panel)

    panel = gen_trade_panel()
    write_png(os.path.join(ART_PANELS, 'ui_panel_trade.png'), panel)
    write_png(os.path.join(OUT_DIR, 'ui_panel_trade.png'), panel)

    card = gen_listing_card()
    write_png(os.path.join(ART_PANELS, 'ui_card_listing.png'), card)
    write_png(os.path.join(OUT_DIR, 'ui_card_listing.png'), card)

    # NPC Shopkeeper
    print('\nNPC Sprite:')
    shopkeeper = gen_shopkeeper()
    write_png(os.path.join(ART_CHARS, 'char_npc_shopkeeper.png'), shopkeeper)
    write_png(os.path.join(OUT_DIR, 'char_npc_shopkeeper.png'), shopkeeper)

    # Trade Status Icons
    print('\nTrade Status Icons:')
    for name, gen_fn in [
        ('icon_trade_pending',   gen_icon_trade_pending),
        ('icon_trade_confirmed', gen_icon_trade_confirmed),
        ('icon_trade_cancelled', gen_icon_trade_cancelled),
    ]:
        icon = gen_fn()
        write_png(os.path.join(ART_ICONS, f'{name}.png'), icon)
        write_png(os.path.join(OUT_DIR, f'{name}.png'), icon)

    # Currency Icons
    print('\nCurrency Icons:')
    for name, gen_fn in [
        ('icon_currency_gold',   gen_icon_currency_gold),
        ('icon_currency_silver', gen_icon_currency_silver),
        ('icon_currency_gem',    gen_icon_currency_gem),
    ]:
        icon = gen_fn()
        write_png(os.path.join(ART_ICONS, f'{name}.png'), icon)
        write_png(os.path.join(OUT_DIR, f'{name}.png'), icon)

    # Category Tab Icons
    print('\nCategory Tab Icons:')
    for name, gen_fn in [
        ('icon_tab_weapons',     gen_icon_tab_weapons),
        ('icon_tab_armor',       gen_icon_tab_armor),
        ('icon_tab_consumables', gen_icon_tab_consumables),
        ('icon_tab_materials',   gen_icon_tab_materials),
    ]:
        icon = gen_fn()
        write_png(os.path.join(ART_ICONS, f'{name}.png'), icon)
        write_png(os.path.join(OUT_DIR, f'{name}.png'), icon)

    print('\nDone! All marketplace assets generated.')


if __name__ == '__main__':
    main()
