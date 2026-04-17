#!/usr/bin/env python3
"""
Generate NFT integration UI/UX art assets for PixelRealm (PIX-156).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md:
  - 32-color master palette only
  - Nearest-neighbor scaling
  - Consistent naming convention

Assets produced in public/assets/ui/nft/:

  Wallet panel:
    ui_panel_wallet.png         — 200×140 wallet connection panel
    ui_wallet_address_frame.png — 120×16 wallet address display frame

  Wallet provider icons (16×16):
    icon_wallet_metamask.png    — MetaMask fox pixel art
    icon_wallet_walletconnect.png — WalletConnect bridge icon
    icon_wallet_coinbase.png    — Coinbase shield icon

  Wallet state indicators (16×16):
    icon_wallet_connected.png   — green connected indicator
    icon_wallet_disconnected.png — red/gray disconnected indicator

  NFT badge overlays:
    icon_nft_badge.png          — 10×10 NFT badge for inventory items
    icon_nft_badge_land.png     — 12×12 NFT badge for land parcels

  Tokenize buttons (80×20):
    ui_btn_tokenize.png         — "mint" tokenize button
    ui_btn_detokenize.png       — "burn" de-tokenize button

  Craft-as-NFT toggle (80×16, 2 states: off|on):
    ui_btn_craft_nft_toggle.png — toggle off (left 40px) / on (right 40px)

  NFT confirmation dialog:
    ui_panel_nft_confirm.png    — 160×100 confirmation dialog frame

  Mint spinner animation (8 frames × 16×16 = 128×16):
    vfx_nft_mint_spinner.png    — golden shimmer spinner spritesheet
"""

import struct
import zlib
import os
import math

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, '..', 'public', 'assets', 'ui', 'nft')

os.makedirs(OUT_DIR, exist_ok=True)

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
LF  = (168, 228, 160, 255)  # light foliage

# Cyan / player-friendly
OC  = (10,  26,  58,  255)  # deep ocean
DP  = (26,  74,  138, 255)  # ocean blue
SB  = (42,  122, 192, 255)  # sky blue
PB  = (80,  168, 232, 255)  # player blue
HB  = (144, 208, 248, 255)  # ice / highlight
CB  = (200, 240, 255, 255)  # shimmer

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


def copy_frame(src):
    return [row[:] for row in src]


def fill_rounded_rect(grid, x, y, w, h, fill_color, border_color):
    """Draw a rounded rectangle (1px corner cut) with fill and border."""
    draw_rect(grid, x + 1, y, w - 2, h, fill_color)
    draw_rect(grid, x, y + 1, w, h - 2, fill_color)
    # Border
    draw_rect(grid, x + 1, y, w - 2, 1, border_color)      # top
    draw_rect(grid, x + 1, y + h - 1, w - 2, 1, border_color)  # bottom
    draw_rect(grid, x, y + 1, 1, h - 2, border_color)      # left
    draw_rect(grid, x + w - 1, y + 1, 1, h - 2, border_color)  # right


# ─── Wallet Panel (200×140) ─────────────────────────────────────────────────

def gen_wallet_panel():
    """Wallet connection panel — dark frame with inner area for wallet UI."""
    W, H = 200, 140
    g = blank(W, H)

    # Outer border (dark outline)
    draw_rect_outline(g, 0, 0, W, H, K)
    # Panel fill (dark blue-gray)
    draw_rect(g, 1, 1, W - 2, H - 2, OC)
    # Inner border highlight
    draw_rect_outline(g, 1, 1, W - 2, H - 2, DK)
    # Inner panel area
    draw_rect(g, 2, 2, W - 4, H - 4, DK)

    # Title bar area (top 16px)
    draw_rect(g, 2, 2, W - 4, 14, ST)
    draw_rect(g, 2, 2, W - 4, 1, MG)  # top highlight
    draw_rect(g, 2, 15, W - 4, 1, K)  # separator

    # "WALLET" text pixels (simplified 3×5 pixel font in title bar)
    # W-A-L-L-E-T at y=5, starting x=70 (centered roughly)
    text_y = 5
    text_color = NW
    # W
    for dy in range(5):
        set_pixel(g, 72, text_y + dy, text_color)
        set_pixel(g, 76, text_y + dy, text_color)
    set_pixel(g, 73, text_y + 3, text_color)
    set_pixel(g, 74, text_y + 4, text_color)
    set_pixel(g, 75, text_y + 3, text_color)
    # A
    set_pixel(g, 79, text_y, text_color)
    set_pixel(g, 78, text_y + 1, text_color)
    set_pixel(g, 80, text_y + 1, text_color)
    for dy in range(2, 5):
        set_pixel(g, 78, text_y + dy, text_color)
        set_pixel(g, 80, text_y + dy, text_color)
    set_pixel(g, 79, text_y + 2, text_color)
    # L
    for dy in range(5):
        set_pixel(g, 82, text_y + dy, text_color)
    set_pixel(g, 83, text_y + 4, text_color)
    set_pixel(g, 84, text_y + 4, text_color)
    # L
    for dy in range(5):
        set_pixel(g, 86, text_y + dy, text_color)
    set_pixel(g, 87, text_y + 4, text_color)
    set_pixel(g, 88, text_y + 4, text_color)
    # E
    for dy in range(5):
        set_pixel(g, 90, text_y + dy, text_color)
    set_pixel(g, 91, text_y, text_color)
    set_pixel(g, 92, text_y, text_color)
    set_pixel(g, 91, text_y + 2, text_color)
    set_pixel(g, 91, text_y + 4, text_color)
    set_pixel(g, 92, text_y + 4, text_color)
    # T
    set_pixel(g, 94, text_y, text_color)
    set_pixel(g, 95, text_y, text_color)
    set_pixel(g, 96, text_y, text_color)
    for dy in range(1, 5):
        set_pixel(g, 95, text_y + dy, text_color)

    # Provider slots area — 3 slots at y=20
    for i in range(3):
        sx = 10 + i * 62
        # Slot background
        draw_rect(g, sx, 20, 56, 24, ST)
        draw_rect_outline(g, sx, 20, 56, 24, K)
        # Inner highlight
        draw_rect(g, sx + 1, 21, 54, 1, MG)
        # Icon placeholder area (16×16)
        draw_rect(g, sx + 4, 24, 16, 16, DK)
        draw_rect_outline(g, sx + 4, 24, 16, 16, K)

    # Status area (bottom)
    draw_rect(g, 4, 110, W - 8, 24, ST)
    draw_rect_outline(g, 4, 110, W - 8, 24, K)
    # Inner lighter area for address display
    draw_rect(g, 6, 112, W - 12, 20, DK)
    draw_rect(g, 6, 112, W - 12, 1, MG)

    # Subtle gold accent line at top of panel (NFT branding)
    draw_rect(g, 3, 2, W - 6, 1, DG)

    # Close button (X) top-right
    set_pixel(g, W - 10, 5, NW)
    set_pixel(g, W - 8, 5, NW)
    set_pixel(g, W - 9, 6, NW)
    set_pixel(g, W - 10, 7, NW)
    set_pixel(g, W - 8, 7, NW)

    write_png(os.path.join(OUT_DIR, 'ui_panel_wallet.png'), g)


# ─── Wallet Address Frame (120×16) ──────────────────────────────────────────

def gen_wallet_address_frame():
    """Frame for displaying truncated wallet address (0x1234...abcd)."""
    W, H = 120, 16
    g = blank(W, H)

    # Outer border
    draw_rect_outline(g, 0, 0, W, H, K)
    # Fill dark
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    # Top highlight
    draw_rect(g, 1, 1, W - 2, 1, ST)
    # Inner shadow at bottom
    draw_rect(g, 1, H - 2, W - 2, 1, K)

    # Gold left accent (chain link feel)
    draw_rect(g, 2, 3, 2, 10, DG)
    draw_rect(g, 2, 4, 2, 8, GD)

    # Dot pattern to suggest text area
    for i in range(8):
        set_pixel(g, 8 + i * 4, 7, MG)
        set_pixel(g, 9 + i * 4, 7, MG)

    # Ellipsis
    for i in range(3):
        set_pixel(g, 44 + i * 3, 7, LS)

    # Copy icon suggestion (right side)
    draw_rect_outline(g, W - 14, 3, 8, 10, MG)
    draw_rect_outline(g, W - 12, 5, 8, 10, LS)

    write_png(os.path.join(OUT_DIR, 'ui_wallet_address_frame.png'), g)


# ─── Wallet Provider Icons (16×16) ──────────────────────────────────────────

def gen_wallet_metamask():
    """MetaMask-inspired fox icon — pixel art, 16×16."""
    g = blank(16, 16)

    # Fox head shape — orange/amber tones
    # Ears (triangles at top)
    set_pixel(g, 3, 2, FR)
    set_pixel(g, 12, 2, FR)
    set_pixel(g, 3, 3, FR)
    set_pixel(g, 4, 3, FR)
    set_pixel(g, 11, 3, FR)
    set_pixel(g, 12, 3, FR)

    # Head body
    draw_rect(g, 4, 4, 8, 3, FR)  # forehead
    draw_rect(g, 3, 7, 10, 3, EM)  # mid face
    draw_rect(g, 5, 7, 6, 2, FR)   # darker center stripe

    # Eyes
    set_pixel(g, 5, 6, K)
    set_pixel(g, 10, 6, K)
    set_pixel(g, 5, 5, NW)  # eye highlight
    set_pixel(g, 10, 5, NW)

    # Snout
    draw_rect(g, 5, 10, 6, 2, DS)
    set_pixel(g, 7, 10, K)  # nose
    set_pixel(g, 8, 10, K)

    # Chin
    draw_rect(g, 6, 12, 4, 1, SN)

    # Outline key edges
    set_pixel(g, 2, 4, K)
    set_pixel(g, 13, 4, K)
    set_pixel(g, 2, 7, K)
    set_pixel(g, 13, 7, K)
    set_pixel(g, 4, 13, K)
    set_pixel(g, 11, 13, K)

    # Subtle jaw line
    set_pixel(g, 3, 10, K)
    set_pixel(g, 12, 10, K)
    set_pixel(g, 4, 11, K)
    set_pixel(g, 11, 11, K)
    set_pixel(g, 5, 12, K)
    set_pixel(g, 10, 12, K)

    write_png(os.path.join(OUT_DIR, 'icon_wallet_metamask.png'), g)


def gen_wallet_walletconnect():
    """WalletConnect-inspired bridge icon — pixel art, 16×16."""
    g = blank(16, 16)

    # Two arches representing the WC bridge logo
    # Using player blue (friendly/connected feel)

    # Left arch
    set_pixel(g, 3, 8, PB)
    set_pixel(g, 4, 7, PB)
    set_pixel(g, 5, 6, PB)
    set_pixel(g, 6, 5, PB)
    set_pixel(g, 7, 5, PB)
    set_pixel(g, 7, 6, SB)

    # Right arch
    set_pixel(g, 12, 8, PB)
    set_pixel(g, 11, 7, PB)
    set_pixel(g, 10, 6, PB)
    set_pixel(g, 9, 5, PB)
    set_pixel(g, 8, 5, PB)
    set_pixel(g, 8, 6, SB)

    # Bridge connection at bottom
    set_pixel(g, 4, 9, PB)
    set_pixel(g, 5, 10, PB)
    set_pixel(g, 6, 10, SB)
    set_pixel(g, 7, 11, HB)
    set_pixel(g, 8, 11, HB)
    set_pixel(g, 9, 10, SB)
    set_pixel(g, 10, 10, PB)
    set_pixel(g, 11, 9, PB)

    # Outer glow dots
    set_pixel(g, 3, 9, DP)
    set_pixel(g, 12, 9, DP)
    set_pixel(g, 5, 5, DP)
    set_pixel(g, 10, 5, DP)

    # Subtle fill inside arches
    set_pixel(g, 6, 7, DP)
    set_pixel(g, 7, 7, DP)
    set_pixel(g, 8, 7, DP)
    set_pixel(g, 9, 7, DP)
    set_pixel(g, 6, 8, SB)
    set_pixel(g, 7, 8, SB)
    set_pixel(g, 8, 8, SB)
    set_pixel(g, 9, 8, SB)

    write_png(os.path.join(OUT_DIR, 'icon_wallet_walletconnect.png'), g)


def gen_wallet_coinbase():
    """Coinbase-inspired shield/circle icon — pixel art, 16×16."""
    g = blank(16, 16)

    # Circle outline (blue)
    circle_pixels = [
        (5, 2), (6, 2), (7, 2), (8, 2), (9, 2), (10, 2),
        (3, 3), (4, 3), (11, 3), (12, 3),
        (2, 4), (13, 4),
        (2, 5), (13, 5),
        (2, 6), (13, 6),
        (2, 7), (13, 7),
        (2, 8), (13, 8),
        (2, 9), (13, 9),
        (2, 10), (13, 10),
        (2, 11), (13, 11),
        (3, 12), (4, 12), (11, 12), (12, 12),
        (5, 13), (6, 13), (7, 13), (8, 13), (9, 13), (10, 13),
    ]
    for px, py in circle_pixels:
        set_pixel(g, px, py, PB)

    # Fill circle interior
    for y in range(3, 13):
        for x in range(3, 13):
            if g[y][x] == _:
                mid_y = y >= 4 and y <= 11
                mid_x = x >= 3 and x <= 12
                if mid_y and mid_x:
                    set_pixel(g, x, y, DP)

    # Inner "C" shape (white on blue)
    set_pixel(g, 7, 5, NW)
    set_pixel(g, 8, 5, NW)
    set_pixel(g, 9, 5, NW)
    set_pixel(g, 6, 6, NW)
    set_pixel(g, 6, 7, NW)
    set_pixel(g, 6, 8, NW)
    set_pixel(g, 6, 9, NW)
    set_pixel(g, 7, 10, NW)
    set_pixel(g, 8, 10, NW)
    set_pixel(g, 9, 10, NW)

    write_png(os.path.join(OUT_DIR, 'icon_wallet_coinbase.png'), g)


# ─── Wallet State Indicators (16×16) ────────────────────────────────────────

def gen_wallet_connected():
    """Connected state — green checkmark in circle, 16×16."""
    g = blank(16, 16)

    # Green circle background
    for y in range(16):
        for x in range(16):
            dx = x - 7.5
            dy = y - 7.5
            dist = math.sqrt(dx * dx + dy * dy)
            if dist < 5.5:
                set_pixel(g, x, y, FG)
            elif dist < 6.5:
                set_pixel(g, x, y, DF)

    # Checkmark (bright green/white)
    set_pixel(g, 5, 8, NW)
    set_pixel(g, 6, 9, NW)
    set_pixel(g, 7, 10, NW)
    set_pixel(g, 8, 9, NW)
    set_pixel(g, 9, 8, NW)
    set_pixel(g, 10, 7, NW)
    set_pixel(g, 11, 6, NW)

    # Highlight on circle
    set_pixel(g, 5, 4, LG)
    set_pixel(g, 6, 4, LG)
    set_pixel(g, 7, 4, LG)

    write_png(os.path.join(OUT_DIR, 'icon_wallet_connected.png'), g)


def gen_wallet_disconnected():
    """Disconnected state — red X in circle, 16×16."""
    g = blank(16, 16)

    # Gray circle background
    for y in range(16):
        for x in range(16):
            dx = x - 7.5
            dy = y - 7.5
            dist = math.sqrt(dx * dx + dy * dy)
            if dist < 5.5:
                set_pixel(g, x, y, ST)
            elif dist < 6.5:
                set_pixel(g, x, y, DK)

    # X mark (red)
    set_pixel(g, 5, 5, BR)
    set_pixel(g, 6, 6, BR)
    set_pixel(g, 7, 7, BR)
    set_pixel(g, 8, 8, BR)
    set_pixel(g, 9, 9, BR)
    set_pixel(g, 10, 10, BR)
    set_pixel(g, 10, 5, BR)
    set_pixel(g, 9, 6, BR)
    set_pixel(g, 6, 9, BR)
    set_pixel(g, 5, 10, BR)

    # Dark outline on X
    set_pixel(g, 4, 5, ER)
    set_pixel(g, 11, 5, ER)
    set_pixel(g, 4, 10, ER)
    set_pixel(g, 11, 10, ER)

    write_png(os.path.join(OUT_DIR, 'icon_wallet_disconnected.png'), g)


# ─── NFT Badge Overlays ─────────────────────────────────────────────────────

def gen_nft_badge():
    """Small NFT badge overlay for inventory items — 10×10.
    Gold border with subtle inner glow, 'N' letterform."""
    g = blank(10, 10)

    # Gold rounded rect background
    draw_rect(g, 1, 0, 8, 10, DG)
    draw_rect(g, 0, 1, 10, 8, DG)
    # Inner fill
    draw_rect(g, 1, 1, 8, 8, GD)
    draw_rect(g, 2, 2, 6, 6, DG)

    # "N" letterform (white on dark gold) — 4×5 at (3, 2)
    nx, ny = 3, 2
    # Left vertical
    for dy in range(5):
        set_pixel(g, nx, ny + dy, YL)
    # Right vertical
    for dy in range(5):
        set_pixel(g, nx + 3, ny + dy, YL)
    # Diagonal
    set_pixel(g, nx + 1, ny + 1, YL)
    set_pixel(g, nx + 2, ny + 2, YL)
    set_pixel(g, nx + 2, ny + 3, YL)

    # Corner highlights
    set_pixel(g, 1, 1, YL)
    set_pixel(g, 8, 1, YL)

    write_png(os.path.join(OUT_DIR, 'icon_nft_badge.png'), g)


def gen_nft_badge_land():
    """NFT badge for land parcels — 12×12. Gold diamond/shield shape with chain link."""
    g = blank(12, 12)

    # Diamond/shield shape
    # Top half — expanding
    set_pixel(g, 5, 0, GD)
    set_pixel(g, 6, 0, GD)
    draw_rect(g, 4, 1, 4, 1, GD)
    draw_rect(g, 3, 2, 6, 1, GD)
    draw_rect(g, 2, 3, 8, 1, GD)
    draw_rect(g, 1, 4, 10, 1, GD)
    draw_rect(g, 1, 5, 10, 1, GD)
    # Bottom half — contracting
    draw_rect(g, 1, 6, 10, 1, DG)
    draw_rect(g, 2, 7, 8, 1, DG)
    draw_rect(g, 3, 8, 6, 1, DG)
    draw_rect(g, 4, 9, 4, 1, DG)
    set_pixel(g, 5, 10, DG)
    set_pixel(g, 6, 10, DG)

    # Chain link symbol in center (2 interlocking loops)
    set_pixel(g, 4, 4, K)
    set_pixel(g, 5, 3, K)
    set_pixel(g, 6, 3, K)
    set_pixel(g, 7, 4, K)
    set_pixel(g, 4, 5, K)
    set_pixel(g, 5, 6, K)

    set_pixel(g, 5, 5, YL)
    set_pixel(g, 6, 5, YL)
    set_pixel(g, 6, 6, K)
    set_pixel(g, 7, 5, K)
    set_pixel(g, 7, 7, K)
    set_pixel(g, 6, 7, K)
    set_pixel(g, 5, 7, K)

    # Highlight
    set_pixel(g, 5, 1, YL)
    set_pixel(g, 6, 1, YL)
    set_pixel(g, 4, 2, YL)

    write_png(os.path.join(OUT_DIR, 'icon_nft_badge_land.png'), g)


# ─── Tokenize/De-tokenize Buttons (80×20) ───────────────────────────────────

def _gen_button(width, height, fill, border, highlight, accent):
    """Generate a 9-slice-ready button frame."""
    g = blank(width, height)

    # Outer border
    draw_rect(g, 1, 0, width - 2, height, border)
    draw_rect(g, 0, 1, width, height - 2, border)
    # Fill
    draw_rect(g, 1, 1, width - 2, height - 2, fill)
    # Top highlight
    draw_rect(g, 2, 1, width - 4, 1, highlight)
    # Bottom shadow
    draw_rect(g, 2, height - 2, width - 4, 1, border)
    # Accent line under top
    draw_rect(g, 2, 2, width - 4, 1, accent)

    return g


def gen_btn_tokenize():
    """Tokenize button — gold-accented, 80×20. Arrow-up + chain icon feel."""
    g = _gen_button(80, 20, DK, K, ST, DG)

    # Gold accent on left side (chain/mint icon area)
    draw_rect(g, 4, 4, 12, 12, ST)
    draw_rect_outline(g, 4, 4, 12, 12, K)
    # Up arrow (mint/upload)
    set_pixel(g, 9, 6, GD)
    set_pixel(g, 10, 6, GD)
    set_pixel(g, 8, 7, GD)
    set_pixel(g, 11, 7, GD)
    set_pixel(g, 7, 8, GD)
    set_pixel(g, 12, 8, GD)
    # Arrow shaft
    set_pixel(g, 9, 9, GD)
    set_pixel(g, 10, 9, GD)
    set_pixel(g, 9, 10, GD)
    set_pixel(g, 10, 10, GD)
    set_pixel(g, 9, 11, GD)
    set_pixel(g, 10, 11, GD)
    # Chain dot
    set_pixel(g, 9, 13, YL)
    set_pixel(g, 10, 13, YL)

    # "TOKENIZE" text area (dots suggesting text)
    text_x = 20
    for i in range(8):
        set_pixel(g, text_x + i * 6, 8, PG)
        set_pixel(g, text_x + i * 6 + 1, 8, PG)
        set_pixel(g, text_x + i * 6, 9, MG)
        set_pixel(g, text_x + i * 6 + 1, 9, MG)
        set_pixel(g, text_x + i * 6, 10, PG)

    # Gold border accent
    draw_rect(g, 2, 3, 1, 14, DG)
    draw_rect(g, 77, 3, 1, 14, DG)

    write_png(os.path.join(OUT_DIR, 'ui_btn_tokenize.png'), g)


def gen_btn_detokenize():
    """De-tokenize button — red-accented, 80×20. Arrow-down + break chain feel."""
    g = _gen_button(80, 20, DK, K, ST, DB)

    # Red accent on left side
    draw_rect(g, 4, 4, 12, 12, ST)
    draw_rect_outline(g, 4, 4, 12, 12, K)
    # Down arrow (burn/withdraw)
    set_pixel(g, 9, 13, ER)
    set_pixel(g, 10, 13, ER)
    set_pixel(g, 8, 12, ER)
    set_pixel(g, 11, 12, ER)
    set_pixel(g, 7, 11, ER)
    set_pixel(g, 12, 11, ER)
    # Arrow shaft
    set_pixel(g, 9, 10, ER)
    set_pixel(g, 10, 10, ER)
    set_pixel(g, 9, 9, ER)
    set_pixel(g, 10, 9, ER)
    set_pixel(g, 9, 8, ER)
    set_pixel(g, 10, 8, ER)
    # Break mark
    set_pixel(g, 8, 6, BR)
    set_pixel(g, 11, 6, BR)
    set_pixel(g, 9, 5, BR)
    set_pixel(g, 10, 5, BR)

    # "DETOKENIZE" text area
    text_x = 20
    for i in range(10):
        set_pixel(g, text_x + i * 5, 8, PG)
        set_pixel(g, text_x + i * 5 + 1, 8, PG)
        set_pixel(g, text_x + i * 5, 9, MG)
        set_pixel(g, text_x + i * 5 + 1, 9, MG)
        set_pixel(g, text_x + i * 5, 10, PG)

    # Red border accent
    draw_rect(g, 2, 3, 1, 14, DB)
    draw_rect(g, 77, 3, 1, 14, DB)

    write_png(os.path.join(OUT_DIR, 'ui_btn_detokenize.png'), g)


# ─── Craft-as-NFT Toggle (80×16 — 2 states side by side) ────────────────────

def gen_craft_nft_toggle():
    """Toggle button: left 40px = OFF state, right 40px = ON state. 80×16."""
    g = blank(80, 16)

    # --- OFF state (left half: 0-39) ---
    # Dark track
    draw_rect(g, 2, 3, 36, 10, DK)
    draw_rect_outline(g, 2, 3, 36, 10, K)
    # Slider knob (left position = off)
    draw_rect(g, 3, 4, 12, 8, ST)
    draw_rect(g, 3, 4, 12, 1, MG)  # top highlight
    draw_rect_outline(g, 3, 4, 12, 8, K)
    # "off" indicator dots
    set_pixel(g, 7, 7, ER)
    set_pixel(g, 8, 7, ER)
    set_pixel(g, 9, 7, ER)

    # --- ON state (right half: 40-79) ---
    # Gold track (active)
    draw_rect(g, 42, 3, 36, 10, DG)
    draw_rect_outline(g, 42, 3, 36, 10, K)
    # Track fill with gold tint
    draw_rect(g, 43, 4, 34, 8, DG)
    # Slider knob (right position = on)
    draw_rect(g, 65, 4, 12, 8, GD)
    draw_rect(g, 65, 4, 12, 1, YL)  # top highlight
    draw_rect_outline(g, 65, 4, 12, 8, K)
    # "on" indicator — small chain/NFT mark
    set_pixel(g, 69, 6, NW)
    set_pixel(g, 70, 7, NW)
    set_pixel(g, 71, 8, NW)
    set_pixel(g, 70, 6, K)
    set_pixel(g, 71, 7, K)
    # Glow on track
    set_pixel(g, 48, 7, GD)
    set_pixel(g, 52, 7, GD)
    set_pixel(g, 56, 7, GD)
    set_pixel(g, 60, 7, GD)

    write_png(os.path.join(OUT_DIR, 'ui_btn_craft_nft_toggle.png'), g)


# ─── NFT Confirmation Dialog (160×100) ──────────────────────────────────────

def gen_nft_confirm_dialog():
    """NFT confirmation dialog frame — 160×100.
    Dark panel with gold accent, space for icon + text + 2 buttons."""
    W, H = 160, 100
    g = blank(W, H)

    # Drop shadow (offset 2px)
    draw_rect(g, 3, 3, W - 2, H - 2, K)

    # Outer frame
    draw_rect(g, 0, 0, W - 2, H - 2, DK)
    draw_rect_outline(g, 0, 0, W - 2, H - 2, K)

    # Inner fill
    draw_rect(g, 1, 1, W - 4, H - 4, DK)

    # Title bar (gold accent)
    draw_rect(g, 1, 1, W - 4, 14, ST)
    draw_rect(g, 2, 1, W - 6, 1, GD)  # gold top line
    draw_rect(g, 1, 14, W - 4, 1, K)  # separator

    # "CONFIRM" title text area
    ty = 4
    # Simple "NFT" text in gold on title bar
    # N
    for dy in range(5):
        set_pixel(g, 58, ty + dy, GD)
        set_pixel(g, 61, ty + dy, GD)
    set_pixel(g, 59, ty + 1, GD)
    set_pixel(g, 60, ty + 2, GD)
    set_pixel(g, 60, ty + 3, GD)
    # F
    for dy in range(5):
        set_pixel(g, 63, ty + dy, GD)
    set_pixel(g, 64, ty, GD)
    set_pixel(g, 65, ty, GD)
    set_pixel(g, 64, ty + 2, GD)
    # T
    set_pixel(g, 67, ty, GD)
    set_pixel(g, 68, ty, GD)
    set_pixel(g, 69, ty, GD)
    for dy in range(1, 5):
        set_pixel(g, 68, ty + dy, GD)

    # Close X button
    set_pixel(g, W - 10, 4, NW)
    set_pixel(g, W - 8, 4, NW)
    set_pixel(g, W - 9, 5, NW)
    set_pixel(g, W - 10, 6, NW)
    set_pixel(g, W - 8, 6, NW)

    # Content area
    draw_rect(g, 4, 18, W - 10, 48, ST)
    draw_rect_outline(g, 4, 18, W - 10, 48, K)
    draw_rect(g, 5, 19, W - 12, 46, DK)

    # Icon placeholder (NFT badge area, 16×16)
    draw_rect(g, 8, 22, 18, 18, ST)
    draw_rect_outline(g, 8, 22, 18, 18, K)
    # Gold diamond inside
    set_pixel(g, 16, 26, GD)
    set_pixel(g, 17, 26, GD)
    set_pixel(g, 15, 27, GD)
    set_pixel(g, 18, 27, GD)
    set_pixel(g, 14, 28, GD)
    set_pixel(g, 19, 28, GD)
    set_pixel(g, 15, 29, DG)
    set_pixel(g, 18, 29, DG)
    set_pixel(g, 16, 30, DG)
    set_pixel(g, 17, 30, DG)
    # Center highlight
    set_pixel(g, 16, 28, YL)
    set_pixel(g, 17, 28, YL)

    # Text line placeholders
    for i in range(12):
        draw_rect(g, 30 + i * 10, 26, 6, 1, MG)
    for i in range(10):
        draw_rect(g, 30 + i * 10, 32, 6, 1, MG)
    for i in range(8):
        draw_rect(g, 30 + i * 10, 38, 6, 1, MG)

    # Gas fee line (gold text area)
    draw_rect(g, 30, 48, 60, 1, DG)
    draw_rect(g, 92, 48, 40, 1, GD)

    # Button area — two buttons at bottom
    # Confirm button (gold)
    bx, by = 20, 72
    fill_rounded_rect(g, bx, by, 50, 18, DG, K)
    draw_rect(g, bx + 1, by + 1, 48, 1, GD)  # highlight
    # "OK" dots
    set_pixel(g, bx + 22, by + 7, YL)
    set_pixel(g, bx + 23, by + 7, YL)
    set_pixel(g, bx + 24, by + 8, YL)
    set_pixel(g, bx + 25, by + 7, YL)
    set_pixel(g, bx + 26, by + 7, YL)

    # Cancel button (gray)
    bx2 = 88
    fill_rounded_rect(g, bx2, by, 50, 18, ST, K)
    draw_rect(g, bx2 + 1, by + 1, 48, 1, MG)
    # "X" dots
    set_pixel(g, bx2 + 23, by + 6, NW)
    set_pixel(g, bx2 + 25, by + 6, NW)
    set_pixel(g, bx2 + 24, by + 7, NW)
    set_pixel(g, bx2 + 23, by + 8, NW)
    set_pixel(g, bx2 + 25, by + 8, NW)

    write_png(os.path.join(OUT_DIR, 'ui_panel_nft_confirm.png'), g)


# ─── Mint Progress Spinner (8 frames × 16×16 = 128×16) ──────────────────────

def gen_mint_spinner():
    """Golden shimmer spinner — 8-frame rotation spritesheet.
    Colors: gold (#e8b800) + bright yellow (#ffe040) + near white (#f0f0f0).
    Each frame rotates the highlight position around a circular path."""
    frames = []

    for frame_idx in range(8):
        g = blank(16, 16)

        # Base ring (dark gold)
        angle_start = frame_idx * (2 * math.pi / 8)

        # Draw ring of dots
        cx, cy = 7.5, 7.5
        radius = 5.0

        for i in range(12):
            angle = (2 * math.pi * i / 12)
            px = int(cx + radius * math.cos(angle))
            py = int(cy + radius * math.sin(angle))

            # Calculate distance from highlight position
            highlight_angle = angle_start
            angle_diff = abs(angle - highlight_angle)
            if angle_diff > math.pi:
                angle_diff = 2 * math.pi - angle_diff

            if angle_diff < 0.4:
                color = NW   # brightest highlight
            elif angle_diff < 1.0:
                color = YL   # bright yellow
            elif angle_diff < 1.8:
                color = GD   # gold
            else:
                color = DG   # dark gold (trail)

            set_pixel(g, px, py, color)

        # Center sparkle (alternates)
        if frame_idx % 2 == 0:
            set_pixel(g, 7, 7, YL)
            set_pixel(g, 8, 7, GD)
            set_pixel(g, 7, 8, GD)
            set_pixel(g, 8, 8, YL)
        else:
            set_pixel(g, 7, 7, GD)
            set_pixel(g, 8, 7, YL)
            set_pixel(g, 7, 8, YL)
            set_pixel(g, 8, 8, GD)

        # Inner ring subtle dots
        inner_r = 3.0
        for i in range(8):
            angle = (2 * math.pi * i / 8) + angle_start * 0.5
            px = int(cx + inner_r * math.cos(angle))
            py = int(cy + inner_r * math.sin(angle))
            if i % 2 == frame_idx % 2:
                set_pixel(g, px, py, DG)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'vfx_nft_mint_spinner.png'), sheet)


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print('=== Generating NFT UI assets (PIX-156) ===')
    print(f'Output: {os.path.abspath(OUT_DIR)}')
    print()

    print('--- Wallet Panel ---')
    gen_wallet_panel()
    gen_wallet_address_frame()

    print('--- Wallet Provider Icons ---')
    gen_wallet_metamask()
    gen_wallet_walletconnect()
    gen_wallet_coinbase()

    print('--- Wallet State Indicators ---')
    gen_wallet_connected()
    gen_wallet_disconnected()

    print('--- NFT Badge Overlays ---')
    gen_nft_badge()
    gen_nft_badge_land()

    print('--- Tokenize/De-tokenize Buttons ---')
    gen_btn_tokenize()
    gen_btn_detokenize()

    print('--- Craft-as-NFT Toggle ---')
    gen_craft_nft_toggle()

    print('--- NFT Confirmation Dialog ---')
    gen_nft_confirm_dialog()

    print('--- Mint Spinner Animation ---')
    gen_mint_spinner()

    print()
    print(f'Done! {len(os.listdir(OUT_DIR))} assets generated.')


if __name__ == '__main__':
    main()
