#!/usr/bin/env python3
"""
PIX-319: Generate auction house and trading post art assets.

Creates:
- Auction house building exterior tileset (256x64, 16x16 tiles)
- Auction house interior background (320x180)
- Trading post NPC auctioneer sprite with idle animation (32x24, 2 frames)
- Auction UI panels: listing creation (220x180), search/browse (220x200),
  bid history (220x180), sold items (220x160)
- Currency and price tag icons (16x16)
- Item rarity glow borders for auction listings (20x20, 4 rarities)
- Transaction confirmation and sale notification VFX (192x32, 6 frames)
- "Sold" and "Expired" stamp overlays (32x16)

All assets use the master 32-color palette from ART-STYLE-GUIDE.md.
"""
import sys
sys.path.insert(0, '/tmp/pip_pkgs')

from PIL import Image, ImageDraw
import os

# === MASTER PALETTE (32 colors from ART-STYLE-GUIDE.md) ===
PALETTE = {
    # Neutrals
    'shadow_black':   (13, 13, 13),
    'dark_rock':      (43, 43, 43),
    'stone_gray':     (74, 74, 74),
    'mid_gray':       (110, 110, 110),
    'light_stone':    (150, 150, 150),
    'pale_gray':      (200, 200, 200),
    'near_white':     (240, 240, 240),
    # Warm Earth
    'deep_soil':      (59, 32, 16),
    'rich_earth':     (107, 58, 31),
    'dirt':           (139, 92, 42),
    'sand':           (184, 132, 63),
    'desert_gold':    (212, 168, 90),
    'pale_sand':      (232, 208, 138),
    # Greens
    'deep_forest':    (26, 58, 26),
    'forest_green':   (45, 110, 45),
    'leaf_green':     (76, 155, 76),
    'bright_grass':   (120, 200, 120),
    'light_foliage':  (168, 228, 160),
    # Blues
    'deep_ocean':     (10, 26, 58),
    'ocean_blue':     (26, 74, 138),
    'sky_blue':       (42, 122, 192),
    'player_blue':    (80, 168, 232),
    'ice_water':      (144, 208, 248),
    'shimmer':        (200, 240, 255),
    # Red/Orange
    'deep_blood':     (90, 10, 10),
    'enemy_red':      (160, 16, 16),
    'bright_red':     (212, 32, 32),
    'fire_orange':    (240, 96, 32),
    'ember':          (248, 160, 96),
    # Yellow/Gold
    'dark_gold':      (168, 112, 0),
    'gold':           (232, 184, 0),
    'bright_yellow':  (255, 224, 64),
    'pale_highlight': (255, 248, 160),
    # Purple/Magenta
    'deep_magic':     (26, 10, 58),
    'magic_purple':   (90, 32, 160),
    'mana_violet':    (144, 80, 224),
    'spell_glow':     (208, 144, 255),
}

TRANSPARENT = (0, 0, 0, 0)
ASSET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')


def ensure_dir(p):
    os.makedirs(p, exist_ok=True)


def _resolve_color(color, alpha=255):
    if isinstance(color, str):
        color = PALETTE[color]
    if len(color) == 4:
        return color  # already RGBA
    return (*color, alpha)


def px(draw, x, y, color, alpha=255):
    draw.point((x, y), fill=_resolve_color(color, alpha))


def fill_rect(draw, x, y, w, h, color, alpha=255):
    c = _resolve_color(color, alpha)
    for dy in range(h):
        for dx in range(w):
            draw.point((x + dx, y + dy), fill=c)


def fill_circle(draw, cx, cy, r, color, alpha=255):
    c = _resolve_color(color, alpha)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                draw.point((cx + dx, cy + dy), fill=c)


def border_rect(draw, x, y, w, h, border_color, fill_color=None, alpha=255):
    fill_rect(draw, x, y, w, h, border_color, alpha)
    if fill_color is not None:
        fill_rect(draw, x + 1, y + 1, w - 2, h - 2, fill_color, alpha)


def hline(draw, x, y, length, color, alpha=255):
    for dx in range(length):
        px(draw, x + dx, y, color, alpha)


def vline(draw, x, y, length, color, alpha=255):
    for dy in range(length):
        px(draw, x, y + dy, color, alpha)


def save_png(img, rel_path):
    full = os.path.join(ASSET_DIR, rel_path)
    ensure_dir(os.path.dirname(full))
    img.save(full)
    print(f'  \u2713 {rel_path} ({img.size[0]}x{img.size[1]})')


# =====================================================================
# 1. AUCTION HOUSE BUILDING EXTERIOR TILESET (256x64)
# 16 tiles wide x 4 rows: walls, roof, door/windows, decorative
# =====================================================================

def generate_auction_tileset():
    """Generate auction house building exterior tileset (256x64).

    Row 0: Roof tiles (peaked, ridge, eaves, gable ends)
    Row 1: Wall tiles (stone wall, window, pillar, arch)
    Row 2: Ground level (door, counter, steps, foundation)
    Row 3: Decorative (sign, banner, awning, gold trim)
    """
    W, H = 256, 64
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # --- Row 0: Roof tiles (y=0..15) ---

    # Tile 0: Roof center (dark brown shingle)
    fill_rect(d, 0, 0, 16, 16, 'rich_earth')
    hline(d, 0, 0, 16, 'deep_soil')
    hline(d, 0, 4, 16, 'deep_soil')
    hline(d, 0, 8, 16, 'deep_soil')
    hline(d, 0, 12, 16, 'deep_soil')
    # Shingle stagger
    for row in range(4):
        offset = 4 if row % 2 else 0
        for col in range(2):
            px(d, offset + col * 8, row * 4, 'dirt')

    # Tile 1: Roof ridge (top edge)
    fill_rect(d, 16, 0, 16, 16, 'rich_earth')
    fill_rect(d, 16, 0, 16, 3, 'dark_gold')
    hline(d, 16, 0, 16, 'gold')
    hline(d, 16, 3, 16, 'deep_soil')
    hline(d, 16, 7, 16, 'deep_soil')
    hline(d, 16, 11, 16, 'deep_soil')

    # Tile 2: Roof left eave
    fill_rect(d, 32, 0, 16, 16, 'rich_earth')
    vline(d, 32, 0, 16, 'dirt')
    vline(d, 33, 0, 16, 'deep_soil')
    hline(d, 34, 4, 14, 'deep_soil')
    hline(d, 34, 8, 14, 'deep_soil')
    hline(d, 34, 12, 14, 'deep_soil')
    # Overhang shadow
    fill_rect(d, 32, 13, 3, 3, 'dark_rock')

    # Tile 3: Roof right eave
    fill_rect(d, 48, 0, 16, 16, 'rich_earth')
    vline(d, 63, 0, 16, 'dirt')
    vline(d, 62, 0, 16, 'deep_soil')
    hline(d, 48, 4, 14, 'deep_soil')
    hline(d, 48, 8, 14, 'deep_soil')
    hline(d, 48, 12, 14, 'deep_soil')
    fill_rect(d, 61, 13, 3, 3, 'dark_rock')

    # Tile 4: Roof peak left
    fill_rect(d, 64, 0, 16, 16, TRANSPARENT)
    for row in range(16):
        start_x = 15 - row
        if start_x >= 0:
            fill_rect(d, 64 + start_x, row, 16 - start_x, 1, 'rich_earth')
            px(d, 64 + start_x, row, 'deep_soil')

    # Tile 5: Roof peak right
    fill_rect(d, 80, 0, 16, 16, TRANSPARENT)
    for row in range(16):
        end_x = row
        if end_x < 16:
            fill_rect(d, 80, row, end_x + 1, 1, 'rich_earth')
            px(d, 80 + end_x, row, 'deep_soil')

    # Tile 6: Chimney
    fill_rect(d, 96, 0, 16, 16, TRANSPARENT)
    fill_rect(d, 100, 0, 8, 14, 'stone_gray')
    fill_rect(d, 101, 1, 6, 12, 'mid_gray')
    border_rect(d, 100, 0, 8, 2, 'dark_rock', 'stone_gray')
    # Smoke hint
    px(d, 103, 0, 'pale_gray', 180)
    px(d, 104, 0, 'pale_gray', 120)

    # Tile 7: Roof gold trim
    fill_rect(d, 112, 0, 16, 16, 'rich_earth')
    hline(d, 112, 14, 16, 'dark_gold')
    hline(d, 112, 15, 16, 'gold')
    hline(d, 112, 4, 16, 'deep_soil')
    hline(d, 112, 8, 16, 'deep_soil')

    # Tiles 8-15 row 0: empty/reserve
    # (leave transparent for future expansion)

    # --- Row 1: Wall tiles (y=16..31) ---

    # Tile 0 (col 0): Stone wall base
    fill_rect(d, 0, 16, 16, 16, 'stone_gray')
    # Brick pattern
    for row in range(4):
        y_off = 16 + row * 4
        hline(d, 0, y_off, 16, 'dark_rock')
        offset = 4 if row % 2 else 0
        vline(d, offset, y_off, 4, 'dark_rock')
        vline(d, offset + 8, y_off, 4, 'dark_rock')
    # Highlight top-left of bricks
    for row in range(4):
        y_off = 16 + row * 4 + 1
        offset = 4 if row % 2 else 0
        px(d, offset + 1, y_off, 'light_stone')

    # Tile 1 (col 1): Window
    fill_rect(d, 16, 16, 16, 16, 'stone_gray')
    # Window frame
    border_rect(d, 19, 18, 10, 12, 'dark_gold', 'deep_ocean')
    # Window cross
    hline(d, 20, 24, 8, 'dark_gold')
    vline(d, 24, 19, 10, 'dark_gold')
    # Glass reflection
    px(d, 21, 20, 'sky_blue', 120)
    px(d, 22, 20, 'ocean_blue', 80)
    # Sill
    fill_rect(d, 18, 30, 12, 1, 'desert_gold')

    # Tile 2 (col 2): Pillar
    fill_rect(d, 32, 16, 16, 16, TRANSPARENT)
    fill_rect(d, 36, 16, 8, 16, 'light_stone')
    vline(d, 36, 16, 16, 'stone_gray')
    vline(d, 43, 16, 16, 'pale_gray')
    # Capital detail
    fill_rect(d, 35, 16, 10, 2, 'desert_gold')
    # Base detail
    fill_rect(d, 35, 30, 10, 2, 'desert_gold')

    # Tile 3 (col 3): Arch top
    fill_rect(d, 48, 16, 16, 16, TRANSPARENT)
    # Arch curve
    for dx in range(-7, 8):
        dy = int((49 - dx * dx) ** 0.5) if 49 - dx * dx > 0 else 0
        y_pos = 16 + (7 - dy)
        px(d, 56 + dx, y_pos, 'desert_gold')
        px(d, 56 + dx, y_pos + 1, 'dark_gold')
    # Fill below arch
    for x in range(50, 62):
        for y in range(24, 32):
            px(d, x, y, 'deep_ocean')

    # Tile 4 (col 4): Wall with gold banner hook
    fill_rect(d, 64, 16, 16, 16, 'stone_gray')
    for row in range(4):
        hline(d, 64, 16 + row * 4, 16, 'dark_rock')
    # Banner hook bracket
    fill_rect(d, 71, 18, 2, 3, 'dark_gold')
    px(d, 70, 21, 'dark_gold')
    px(d, 73, 21, 'dark_gold')

    # Tile 5 (col 5): Wall with torch bracket
    fill_rect(d, 80, 16, 16, 16, 'stone_gray')
    for row in range(4):
        hline(d, 80, 16 + row * 4, 16, 'dark_rock')
    # Torch bracket
    fill_rect(d, 87, 20, 2, 6, 'dark_rock')
    px(d, 86, 20, 'dark_rock')
    # Torch flame
    px(d, 87, 18, 'bright_yellow')
    px(d, 88, 18, 'bright_yellow')
    px(d, 87, 19, 'fire_orange')
    px(d, 88, 19, 'gold')

    # Tile 6 (col 6): Fancy wall with gold inlay
    fill_rect(d, 96, 16, 16, 16, 'stone_gray')
    border_rect(d, 99, 19, 10, 10, 'dark_gold')
    fill_rect(d, 100, 20, 8, 8, 'stone_gray')
    # Diamond inlay
    px(d, 104, 22, 'gold')
    px(d, 103, 23, 'gold')
    px(d, 105, 23, 'gold')
    px(d, 104, 24, 'gold')
    px(d, 104, 23, 'bright_yellow')

    # Tile 7 (col 7): Wall corner piece
    fill_rect(d, 112, 16, 16, 16, 'stone_gray')
    vline(d, 112, 16, 16, 'dark_rock')
    vline(d, 113, 16, 16, 'light_stone')
    for row in range(4):
        hline(d, 114, 16 + row * 4, 14, 'dark_rock')

    # --- Row 2: Ground level (y=32..47) ---

    # Tile 0 (col 0): Main double door (left half)
    fill_rect(d, 0, 32, 16, 16, 'rich_earth')
    fill_rect(d, 1, 33, 14, 14, 'dirt')
    vline(d, 0, 32, 16, 'dark_gold')
    hline(d, 0, 32, 16, 'dark_gold')
    # Door panel detail
    border_rect(d, 3, 35, 10, 5, 'deep_soil')
    border_rect(d, 3, 42, 10, 4, 'deep_soil')
    # Door handle
    px(d, 12, 40, 'gold')
    px(d, 12, 41, 'bright_yellow')

    # Tile 1 (col 1): Main double door (right half)
    fill_rect(d, 16, 32, 16, 16, 'rich_earth')
    fill_rect(d, 17, 33, 14, 14, 'dirt')
    vline(d, 31, 32, 16, 'dark_gold')
    hline(d, 16, 32, 16, 'dark_gold')
    border_rect(d, 19, 35, 10, 5, 'deep_soil')
    border_rect(d, 19, 42, 10, 4, 'deep_soil')
    px(d, 19, 40, 'gold')
    px(d, 19, 41, 'bright_yellow')

    # Tile 2 (col 2): Trade counter
    fill_rect(d, 32, 32, 16, 16, TRANSPARENT)
    # Counter top
    fill_rect(d, 32, 36, 16, 4, 'desert_gold')
    hline(d, 32, 36, 16, 'gold')
    fill_rect(d, 32, 37, 16, 1, 'sand')
    # Counter front
    fill_rect(d, 32, 40, 16, 8, 'rich_earth')
    fill_rect(d, 33, 41, 14, 6, 'dirt')
    # Counter trim
    hline(d, 32, 40, 16, 'dark_gold')

    # Tile 3 (col 3): Steps (3-step entry)
    fill_rect(d, 48, 32, 16, 16, TRANSPARENT)
    # Step 1 (bottom, widest)
    fill_rect(d, 48, 43, 16, 5, 'light_stone')
    hline(d, 48, 43, 16, 'pale_gray')
    # Step 2
    fill_rect(d, 50, 38, 12, 5, 'light_stone')
    hline(d, 50, 38, 12, 'pale_gray')
    # Step 3 (top)
    fill_rect(d, 52, 33, 8, 5, 'light_stone')
    hline(d, 52, 33, 8, 'pale_gray')

    # Tile 4 (col 4): Foundation stone
    fill_rect(d, 64, 32, 16, 16, 'dark_rock')
    # Large stone blocks
    hline(d, 64, 32, 16, 'shadow_black')
    hline(d, 64, 40, 16, 'shadow_black')
    vline(d, 72, 32, 8, 'shadow_black')
    vline(d, 68, 40, 8, 'shadow_black')
    vline(d, 76, 40, 8, 'shadow_black')
    # Highlight
    px(d, 65, 33, 'stone_gray')
    px(d, 73, 33, 'stone_gray')
    px(d, 65, 41, 'stone_gray')

    # Tile 5 (col 5): Floor tile (interior/threshold)
    fill_rect(d, 80, 32, 16, 16, 'sand')
    # Checker pattern
    for row in range(2):
        for col in range(2):
            if (row + col) % 2 == 0:
                fill_rect(d, 80 + col * 8, 32 + row * 8, 8, 8, 'desert_gold')
    hline(d, 80, 32, 16, 'dark_gold')
    hline(d, 80, 40, 16, 'dark_gold')
    vline(d, 88, 32, 16, 'dark_gold')

    # Tile 6 (col 6): Coin pile decoration
    fill_rect(d, 96, 32, 16, 16, TRANSPARENT)
    # Pile of coins
    fill_circle(d, 102, 43, 4, 'dark_gold')
    fill_circle(d, 102, 43, 3, 'gold')
    fill_circle(d, 105, 41, 3, 'dark_gold')
    fill_circle(d, 105, 41, 2, 'bright_yellow')
    fill_circle(d, 100, 41, 2, 'gold')
    px(d, 102, 40, 'pale_highlight')
    px(d, 104, 39, 'pale_highlight')

    # Tile 7 (col 7): Barrel
    fill_rect(d, 112, 32, 16, 16, TRANSPARENT)
    fill_rect(d, 115, 34, 10, 12, 'rich_earth')
    fill_rect(d, 116, 35, 8, 10, 'dirt')
    # Barrel bands
    hline(d, 115, 37, 10, 'dark_gold')
    hline(d, 115, 42, 10, 'dark_gold')
    # Barrel top
    fill_rect(d, 116, 33, 8, 2, 'sand')
    # Barrel highlight
    vline(d, 118, 35, 10, 'sand')

    # --- Row 3: Decorative (y=48..63) ---

    # Tile 0 (col 0): Auction sign (left half)
    fill_rect(d, 0, 48, 16, 16, TRANSPARENT)
    # Sign board
    fill_rect(d, 0, 50, 16, 10, 'rich_earth')
    fill_rect(d, 1, 51, 14, 8, 'dirt')
    hline(d, 0, 50, 16, 'dark_gold')
    hline(d, 0, 59, 16, 'dark_gold')
    # "A" letter hint
    px(d, 3, 53, 'gold')
    px(d, 4, 52, 'gold')
    px(d, 5, 53, 'gold')
    px(d, 3, 54, 'gold')
    px(d, 5, 54, 'gold')
    hline(d, 3, 55, 3, 'gold')
    # "H" letter hint
    px(d, 7, 52, 'gold')
    px(d, 7, 55, 'gold')
    px(d, 9, 52, 'gold')
    px(d, 9, 55, 'gold')
    vline(d, 7, 52, 4, 'gold')
    vline(d, 9, 52, 4, 'gold')
    hline(d, 7, 54, 3, 'gold')
    # Hanging chains
    px(d, 2, 48, 'dark_gold')
    px(d, 2, 49, 'dark_gold')
    px(d, 13, 48, 'dark_gold')
    px(d, 13, 49, 'dark_gold')

    # Tile 1 (col 1): Auction sign (right half / gavel icon)
    fill_rect(d, 16, 48, 16, 16, TRANSPARENT)
    fill_rect(d, 16, 50, 16, 10, 'rich_earth')
    fill_rect(d, 17, 51, 14, 8, 'dirt')
    hline(d, 16, 50, 16, 'dark_gold')
    hline(d, 16, 59, 16, 'dark_gold')
    # Gavel icon
    fill_rect(d, 20, 52, 6, 3, 'desert_gold')
    fill_rect(d, 21, 53, 4, 1, 'gold')
    fill_rect(d, 22, 55, 2, 3, 'sand')
    px(d, 21, 58, 'sand')
    px(d, 24, 58, 'sand')
    # Chains
    px(d, 18, 48, 'dark_gold')
    px(d, 18, 49, 'dark_gold')
    px(d, 29, 48, 'dark_gold')
    px(d, 29, 49, 'dark_gold')

    # Tile 2 (col 2): Banner (gold)
    fill_rect(d, 32, 48, 16, 16, TRANSPARENT)
    # Banner pole
    hline(d, 34, 48, 12, 'dark_gold')
    # Banner fabric
    fill_rect(d, 35, 49, 10, 12, 'gold')
    fill_rect(d, 36, 50, 8, 10, 'bright_yellow')
    # Bottom triangle cut
    px(d, 35, 61, TRANSPARENT)
    px(d, 44, 61, TRANSPARENT)
    px(d, 36, 61, TRANSPARENT)
    px(d, 43, 61, TRANSPARENT)
    # Coin emblem on banner
    fill_circle(d, 40, 55, 2, 'dark_gold')
    px(d, 40, 54, 'pale_highlight')

    # Tile 3 (col 3): Awning (striped)
    fill_rect(d, 48, 48, 16, 16, TRANSPARENT)
    # Awning fabric
    for col in range(4):
        color = 'gold' if col % 2 == 0 else 'rich_earth'
        fill_rect(d, 48 + col * 4, 48, 4, 10, color)
    # Awning bottom fringe
    for col in range(8):
        px(d, 48 + col * 2, 58, 'dark_gold')
    # Support rod
    hline(d, 48, 48, 16, 'dark_rock')

    # Tile 4 (col 4): Gold trim horizontal
    fill_rect(d, 64, 48, 16, 16, TRANSPARENT)
    fill_rect(d, 64, 54, 16, 4, 'dark_gold')
    fill_rect(d, 64, 55, 16, 2, 'gold')
    hline(d, 64, 54, 16, 'bright_yellow')
    # Repeating diamond pattern
    for i in range(4):
        px(d, 66 + i * 4, 56, 'bright_yellow')

    # Tile 5 (col 5): Gold trim vertical
    fill_rect(d, 80, 48, 16, 16, TRANSPARENT)
    fill_rect(d, 86, 48, 4, 16, 'dark_gold')
    fill_rect(d, 87, 48, 2, 16, 'gold')
    vline(d, 86, 48, 16, 'bright_yellow')
    for i in range(4):
        px(d, 88, 50 + i * 4, 'bright_yellow')

    # Tile 6 (col 6): Scales of trade emblem (decorative)
    fill_rect(d, 96, 48, 16, 16, TRANSPARENT)
    # Balance beam
    hline(d, 99, 52, 10, 'gold')
    # Pivot
    vline(d, 104, 49, 4, 'dark_gold')
    px(d, 104, 49, 'bright_yellow')
    # Left pan
    fill_rect(d, 99, 53, 4, 1, 'dark_gold')
    fill_rect(d, 100, 54, 2, 2, 'gold')
    # Right pan
    fill_rect(d, 105, 53, 4, 1, 'dark_gold')
    fill_rect(d, 106, 54, 2, 2, 'gold')
    # Base
    vline(d, 104, 56, 5, 'dark_gold')
    hline(d, 102, 60, 5, 'dark_gold')

    # Tile 7 (col 7): Lantern
    fill_rect(d, 112, 48, 16, 16, TRANSPARENT)
    # Hanging chain
    vline(d, 120, 48, 3, 'dark_gold')
    # Lantern frame
    border_rect(d, 117, 51, 7, 8, 'dark_gold', 'shadow_black')
    # Light glow
    fill_rect(d, 118, 52, 5, 6, 'bright_yellow')
    fill_rect(d, 119, 53, 3, 4, 'pale_highlight')
    # Bottom cap
    fill_rect(d, 118, 59, 5, 1, 'dark_gold')

    return img


# =====================================================================
# 2. AUCTION HOUSE INTERIOR BACKGROUND (320x180)
# =====================================================================

def generate_interior_background():
    """Generate auction house interior background."""
    W, H = 320, 180
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Floor
    fill_rect(d, 0, 120, W, 60, 'sand')
    # Floor tile pattern
    for row in range(4):
        for col in range(20):
            y_off = 120 + row * 16
            x_off = col * 16
            if (row + col) % 2 == 0:
                fill_rect(d, x_off, y_off, 16, 16, 'desert_gold')
            hline(d, x_off, y_off, 16, 'dark_gold', 80)
            vline(d, x_off, y_off, 16, 'dark_gold', 80)

    # Back wall
    fill_rect(d, 0, 0, W, 120, 'stone_gray')
    # Brick pattern on wall
    for row in range(15):
        y_off = row * 8
        hline(d, 0, y_off, W, 'dark_rock')
        offset = 16 if row % 2 else 0
        for col in range(11):
            vline(d, offset + col * 32, y_off, 8, 'dark_rock')

    # Wainscoting (lower wall panel)
    fill_rect(d, 0, 80, W, 40, 'rich_earth')
    fill_rect(d, 0, 82, W, 36, 'dirt')
    hline(d, 0, 80, W, 'dark_gold')
    hline(d, 0, 81, W, 'gold')
    # Panel details
    for i in range(10):
        border_rect(d, 4 + i * 32, 84, 28, 30, 'deep_soil')

    # Large center arch window
    cx = W // 2
    fill_rect(d, cx - 30, 10, 60, 60, 'deep_ocean')
    border_rect(d, cx - 31, 9, 62, 62, 'dark_gold')
    # Window cross
    hline(d, cx - 30, 40, 60, 'dark_gold')
    vline(d, cx, 10, 60, 'dark_gold')
    # Light glow through window
    fill_rect(d, cx - 28, 12, 27, 27, 'ocean_blue')
    fill_rect(d, cx + 2, 12, 27, 27, 'ocean_blue')
    px(d, cx - 20, 20, 'sky_blue')
    px(d, cx + 10, 20, 'sky_blue')

    # Side windows
    for wx in [40, 240]:
        fill_rect(d, wx, 20, 30, 40, 'deep_ocean')
        border_rect(d, wx - 1, 19, 32, 42, 'dark_gold')
        hline(d, wx, 40, 30, 'dark_gold')
        vline(d, wx + 15, 20, 40, 'dark_gold')
        # Sill
        fill_rect(d, wx - 2, 60, 34, 2, 'desert_gold')

    # Auction podium (center)
    fill_rect(d, cx - 20, 100, 40, 20, 'rich_earth')
    fill_rect(d, cx - 18, 102, 36, 16, 'dirt')
    hline(d, cx - 20, 100, 40, 'dark_gold')
    hline(d, cx - 20, 101, 40, 'gold')
    # Podium front emblem
    fill_circle(d, cx, 110, 5, 'dark_gold')
    fill_circle(d, cx, 110, 4, 'gold')
    fill_circle(d, cx, 110, 2, 'bright_yellow')
    px(d, cx - 1, 108, 'pale_highlight')

    # Gavel on podium
    fill_rect(d, cx + 8, 97, 5, 3, 'desert_gold')
    fill_rect(d, cx + 9, 98, 3, 1, 'gold')
    fill_rect(d, cx + 10, 100, 1, 3, 'sand')

    # Wall torches
    for tx in [15, 95, 210, 290]:
        fill_rect(d, tx, 40, 2, 6, 'dark_rock')
        px(d, tx, 38, 'bright_yellow')
        px(d, tx + 1, 38, 'bright_yellow')
        px(d, tx, 39, 'fire_orange')
        px(d, tx + 1, 39, 'gold')
        # Glow
        px(d, tx - 1, 37, 'bright_yellow', 80)
        px(d, tx + 2, 37, 'bright_yellow', 80)

    # Display shelves on left wall
    for sy in [30, 55]:
        fill_rect(d, 4, sy, 28, 3, 'desert_gold')
        hline(d, 4, sy, 28, 'gold')
        # Items on shelves
        fill_rect(d, 8, sy - 4, 4, 4, 'player_blue')
        fill_rect(d, 16, sy - 6, 4, 6, 'mana_violet')
        fill_rect(d, 24, sy - 3, 3, 3, 'bright_red')

    # Display shelves on right wall
    for sy in [30, 55]:
        fill_rect(d, W - 32, sy, 28, 3, 'desert_gold')
        hline(d, W - 32, sy, 28, 'gold')
        fill_rect(d, W - 28, sy - 4, 4, 4, 'leaf_green')
        fill_rect(d, W - 20, sy - 5, 3, 5, 'gold')
        fill_rect(d, W - 12, sy - 3, 4, 3, 'ember')

    # Rope barrier posts
    for rx in [cx - 50, cx + 50]:
        fill_rect(d, rx, 108, 3, 12, 'dark_gold')
        px(d, rx + 1, 107, 'gold')
    # Rope between posts
    for x_off in range(cx - 47, cx + 50):
        y_sag = 112 + int(((x_off - cx) / 50.0) ** 2 * 3)
        if y_sag < 120:
            px(d, x_off, y_sag, 'dark_gold')

    # Ceiling beams
    for bx in [60, 160, 260]:
        fill_rect(d, bx - 4, 0, 8, 4, 'rich_earth')
        hline(d, bx - 4, 3, 8, 'deep_soil')

    return img


# =====================================================================
# 3. AUCTIONEER NPC SPRITE (32x24, 2 idle frames)
# =====================================================================

def generate_auctioneer_npc():
    """Generate auctioneer NPC sprite (16x24 per frame, 2 frames idle)."""
    W, H = 32, 24
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    for frame in range(2):
        ox = frame * 16  # frame offset

        # -- Feet (y=20..23) --
        fill_rect(d, ox + 5, 21, 3, 2, 'deep_soil')
        fill_rect(d, ox + 9, 21, 3, 2, 'deep_soil')
        px(d, ox + 5, 23, 'dark_rock')
        px(d, ox + 11, 23, 'dark_rock')

        # -- Legs (y=17..20) --
        fill_rect(d, ox + 6, 17, 2, 4, 'dark_rock')
        fill_rect(d, ox + 9, 17, 2, 4, 'dark_rock')

        # -- Body/torso (y=10..16) --
        fill_rect(d, ox + 5, 10, 7, 7, 'rich_earth')
        fill_rect(d, ox + 6, 11, 5, 5, 'dirt')
        # Gold vest/apron
        fill_rect(d, ox + 6, 12, 5, 3, 'dark_gold')
        fill_rect(d, ox + 7, 13, 3, 1, 'gold')
        # Belt
        hline(d, ox + 5, 16, 7, 'dark_gold')
        px(d, ox + 8, 16, 'bright_yellow')

        # -- Arms --
        # Left arm (holds gavel in frame 0, raised in frame 1)
        if frame == 0:
            # Arm down holding gavel
            fill_rect(d, ox + 4, 11, 1, 5, 'sand')
            px(d, ox + 3, 16, 'sand')
            # Gavel
            fill_rect(d, ox + 2, 14, 3, 2, 'desert_gold')
            px(d, ox + 3, 13, 'gold')
        else:
            # Arm raised with gavel up
            fill_rect(d, ox + 4, 11, 1, 3, 'sand')
            px(d, ox + 3, 10, 'sand')
            px(d, ox + 2, 9, 'sand')
            # Gavel raised
            fill_rect(d, ox + 1, 7, 3, 2, 'desert_gold')
            px(d, ox + 2, 6, 'gold')

        # Right arm (gesturing)
        fill_rect(d, ox + 12, 11, 1, 4, 'sand')
        if frame == 0:
            px(d, ox + 13, 14, 'sand')
        else:
            px(d, ox + 13, 13, 'sand')
            px(d, ox + 13, 14, 'sand')

        # -- Head (y=3..9) --
        fill_rect(d, ox + 6, 4, 5, 6, 'sand')
        fill_rect(d, ox + 5, 5, 7, 4, 'sand')
        # Hair (fancy wig / top hat)
        fill_rect(d, ox + 5, 2, 7, 3, 'dark_rock')
        fill_rect(d, ox + 4, 4, 9, 1, 'dark_rock')
        # Top hat brim
        fill_rect(d, ox + 4, 4, 9, 1, 'shadow_black')
        fill_rect(d, ox + 5, 1, 7, 3, 'shadow_black')
        fill_rect(d, ox + 6, 0, 5, 2, 'shadow_black')
        # Hat band
        hline(d, ox + 5, 3, 7, 'dark_gold')
        # Eyes
        px(d, ox + 7, 6, 'shadow_black')
        px(d, ox + 9, 6, 'shadow_black')
        # Mouth (slight smile)
        px(d, ox + 8, 8, 'deep_soil')
        # Monocle on right eye
        px(d, ox + 10, 5, 'gold')
        px(d, ox + 10, 6, 'gold')
        px(d, ox + 10, 7, 'gold')
        px(d, ox + 9, 5, 'gold')
        # Monocle chain
        px(d, ox + 11, 7, 'dark_gold')
        px(d, ox + 11, 8, 'dark_gold')

        # Mustache
        px(d, ox + 7, 7, 'dark_rock')
        px(d, ox + 8, 7, 'dark_rock')
        px(d, ox + 9, 7, 'dark_rock')
        px(d, ox + 6, 8, 'dark_rock')
        px(d, ox + 10, 8, 'dark_rock')

    return img


# =====================================================================
# 4. AUCTION UI PANELS
# =====================================================================

def _draw_panel_frame(d, W, H, title_color='dark_gold', accent='gold'):
    """Draw standard auction panel frame (matches faction shop style)."""
    # Outer border
    border_rect(d, 0, 0, W, H, 'deep_soil', 'dark_rock')
    # Inner panel
    fill_rect(d, 2, 2, W - 4, H - 4, 'dark_rock')

    # Header bar
    fill_rect(d, 2, 2, W - 4, 16, title_color)
    fill_rect(d, 3, 3, W - 6, 14, accent)
    # Header highlight
    hline(d, 3, 3, W - 6, 'bright_yellow')

    # Close button (top right X)
    px(d, W - 10, 5, 'enemy_red')
    px(d, W - 9, 6, 'enemy_red')
    px(d, W - 8, 7, 'enemy_red')
    px(d, W - 8, 5, 'enemy_red')
    px(d, W - 10, 7, 'enemy_red')

    # Corner accents
    for cx, cy in [(2, 2), (W - 6, 2), (2, H - 6), (W - 6, H - 6)]:
        px(d, cx, cy, 'bright_yellow')
        px(d, cx + 1, cy, 'bright_yellow')
        px(d, cx, cy + 1, 'bright_yellow')


def _draw_item_slot(d, x, y, size=18):
    """Draw a single item slot."""
    border_rect(d, x, y, size, size, 'deep_soil', 'shadow_black')
    px(d, x + 1, y + 1, 'stone_gray')
    px(d, x + size - 2, y + size - 2, 'dark_rock')


def _draw_button(d, x, y, w, h, color='dark_gold', highlight='gold'):
    """Draw a UI button."""
    border_rect(d, x, y, w, h, 'deep_soil', color)
    hline(d, x + 1, y + 1, w - 2, highlight)


def _draw_gold_coin_small(d, x, y):
    """Draw a small gold coin icon at given position."""
    fill_circle(d, x + 3, y + 3, 3, 'dark_gold')
    fill_circle(d, x + 3, y + 3, 2, 'gold')
    px(d, x + 2, y + 2, 'bright_yellow')
    px(d, x + 1, y + 1, 'pale_highlight')


def _draw_text_placeholder(d, x, y, w, color='mid_gray'):
    """Draw a placeholder for text (dashes)."""
    for dx in range(0, w, 3):
        hline(d, x + dx, y, 2, color)


def generate_panel_listing_create():
    """Auction listing creation panel (220x180)."""
    W, H = 220, 180
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)
    _draw_panel_frame(d, W, H)

    # Title text placeholder: "CREATE LISTING"
    _draw_text_placeholder(d, 8, 7, 80, 'pale_highlight')

    # Divider
    hline(d, 4, 20, W - 8, 'deep_soil')
    hline(d, 4, 21, W - 8, 'dark_gold')

    # Item slot (large, for dragging item)
    border_rect(d, 8, 26, 34, 34, 'dark_gold', 'shadow_black')
    # "+" icon in slot
    hline(d, 19, 40, 10, 'stone_gray')
    vline(d, 24, 35, 10, 'stone_gray')
    # Label area: "DRAG ITEM"
    _draw_text_placeholder(d, 48, 30, 60, 'light_stone')

    # Item name area
    fill_rect(d, 48, 40, 160, 10, 'shadow_black')
    _draw_text_placeholder(d, 50, 43, 80, 'mid_gray')

    # Rarity indicator bar
    fill_rect(d, 48, 52, 80, 4, 'shadow_black')
    fill_rect(d, 49, 53, 30, 2, 'leaf_green')  # common example

    # --- Starting price section ---
    hline(d, 4, 64, W - 8, 'deep_soil')
    _draw_text_placeholder(d, 8, 68, 60, 'desert_gold')  # "STARTING PRICE"

    # Price input field
    fill_rect(d, 8, 76, 120, 14, 'shadow_black')
    border_rect(d, 8, 76, 120, 14, 'deep_soil')
    _draw_gold_coin_small(d, 10, 78)
    _draw_text_placeholder(d, 24, 81, 40, 'gold')

    # +/- buttons
    _draw_button(d, 132, 76, 18, 14, 'dark_gold', 'gold')
    px(d, 138, 81, 'near_white')  # minus
    hline(d, 136, 83, 8, 'near_white')
    _draw_button(d, 154, 76, 18, 14, 'dark_gold', 'gold')
    hline(d, 158, 83, 8, 'near_white')  # plus
    vline(d, 162, 80, 6, 'near_white')

    # --- Buyout price section ---
    _draw_text_placeholder(d, 8, 96, 50, 'desert_gold')  # "BUYOUT PRICE"
    fill_rect(d, 8, 104, 120, 14, 'shadow_black')
    border_rect(d, 8, 104, 120, 14, 'deep_soil')
    _draw_gold_coin_small(d, 10, 106)
    _draw_text_placeholder(d, 24, 109, 40, 'gold')

    # +/- buttons for buyout
    _draw_button(d, 132, 104, 18, 14, 'dark_gold', 'gold')
    hline(d, 136, 111, 8, 'near_white')
    _draw_button(d, 154, 104, 18, 14, 'dark_gold', 'gold')
    hline(d, 158, 111, 8, 'near_white')
    vline(d, 162, 108, 6, 'near_white')

    # --- Duration selector ---
    hline(d, 4, 124, W - 8, 'deep_soil')
    _draw_text_placeholder(d, 8, 128, 40, 'desert_gold')  # "DURATION"
    # Duration options: 12h, 24h, 48h
    for i, w_btn in enumerate([36, 36, 36]):
        bx = 8 + i * 40
        selected = (i == 1)  # 24h selected by default
        bg = 'gold' if selected else 'dark_rock'
        hl = 'bright_yellow' if selected else 'stone_gray'
        _draw_button(d, bx, 136, w_btn, 12, bg, hl)
        _draw_text_placeholder(d, bx + 4, 140, 20, 'near_white' if selected else 'mid_gray')

    # --- Listing fee ---
    hline(d, 4, 152, W - 8, 'deep_soil')
    _draw_text_placeholder(d, 8, 156, 50, 'light_stone')  # "LISTING FEE:"
    _draw_gold_coin_small(d, 70, 154)
    _draw_text_placeholder(d, 84, 157, 30, 'gold')

    # --- Confirm button ---
    _draw_button(d, 8, 164, W - 16, 12, 'dark_gold', 'gold')
    _draw_text_placeholder(d, 80, 168, 60, 'pale_highlight')  # "CREATE LISTING"

    return img


def generate_panel_search_browse():
    """Auction search/browse panel (220x200)."""
    W, H = 220, 200
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)
    _draw_panel_frame(d, W, H)

    # Title: "AUCTION HOUSE"
    _draw_text_placeholder(d, 8, 7, 80, 'pale_highlight')

    hline(d, 4, 20, W - 8, 'deep_soil')
    hline(d, 4, 21, W - 8, 'dark_gold')

    # Search bar
    fill_rect(d, 8, 24, 160, 12, 'shadow_black')
    border_rect(d, 8, 24, 160, 12, 'deep_soil')
    _draw_text_placeholder(d, 12, 28, 60, 'stone_gray')
    # Search icon (magnifying glass)
    fill_circle(d, 156, 29, 3, 'mid_gray')
    fill_circle(d, 156, 29, 2, 'shadow_black')
    px(d, 158, 31, 'mid_gray')
    px(d, 159, 32, 'mid_gray')
    # Search button
    _draw_button(d, 172, 24, 40, 12, 'dark_gold', 'gold')

    # Filter tabs (All, Weapons, Armor, Materials, Consumables)
    tab_x = 8
    tab_names_w = [28, 36, 32, 40, 46]
    for i, tw in enumerate(tab_names_w):
        active = (i == 0)
        bg = 'dark_gold' if active else 'dark_rock'
        _draw_button(d, tab_x, 40, tw, 10, bg, 'gold' if active else 'stone_gray')
        _draw_text_placeholder(d, tab_x + 3, 43, tw - 6, 'near_white' if active else 'mid_gray')
        tab_x += tw + 2

    # Sort dropdown
    fill_rect(d, 8, 54, 80, 10, 'shadow_black')
    border_rect(d, 8, 54, 80, 10, 'deep_soil')
    _draw_text_placeholder(d, 12, 57, 40, 'light_stone')
    # Dropdown arrow
    px(d, 80, 57, 'light_stone')
    px(d, 79, 58, 'light_stone')
    px(d, 81, 58, 'light_stone')

    # Listing rows (5 rows)
    for row in range(5):
        ry = 68 + row * 24
        # Row background (alternating)
        bg = 'shadow_black' if row % 2 == 0 else 'dark_rock'
        fill_rect(d, 4, ry, W - 8, 22, bg)
        border_rect(d, 4, ry, W - 8, 22, 'deep_soil')

        # Item icon slot
        _draw_item_slot(d, 6, ry + 2, 18)

        # Item name
        _draw_text_placeholder(d, 28, ry + 3, 70, 'near_white')

        # Rarity dot
        rarity_colors = ['light_stone', 'player_blue', 'mana_violet', 'bright_yellow', 'fire_orange']
        px(d, 28, ry + 10, rarity_colors[row % 5])

        # Time remaining
        _draw_text_placeholder(d, 28, ry + 13, 30, 'stone_gray')

        # Current bid
        _draw_gold_coin_small(d, 130, ry + 2)
        _draw_text_placeholder(d, 144, ry + 5, 30, 'gold')

        # Buyout price
        _draw_gold_coin_small(d, 130, ry + 12)
        _draw_text_placeholder(d, 144, ry + 15, 30, 'bright_yellow')

        # Bid button
        _draw_button(d, 180, ry + 2, 28, 8, 'dark_gold', 'gold')
        # Buy button
        _draw_button(d, 180, ry + 12, 28, 8, 'leaf_green', 'bright_grass')

    # Page navigation
    pny = H - 12
    _draw_button(d, 80, pny - 4, 16, 10, 'dark_rock', 'stone_gray')  # prev
    px(d, 86, pny, 'near_white')
    px(d, 87, pny - 1, 'near_white')
    px(d, 87, pny + 1, 'near_white')

    _draw_text_placeholder(d, 100, pny - 1, 20, 'light_stone')  # page num

    _draw_button(d, 124, pny - 4, 16, 10, 'dark_rock', 'stone_gray')  # next
    px(d, 132, pny, 'near_white')
    px(d, 131, pny - 1, 'near_white')
    px(d, 131, pny + 1, 'near_white')

    return img


def generate_panel_bid_history():
    """Bid history panel (220x180)."""
    W, H = 220, 180
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)
    _draw_panel_frame(d, W, H)

    # Title: "BID HISTORY"
    _draw_text_placeholder(d, 8, 7, 60, 'pale_highlight')

    hline(d, 4, 20, W - 8, 'deep_soil')
    hline(d, 4, 21, W - 8, 'dark_gold')

    # Item preview (top section)
    _draw_item_slot(d, 8, 26, 32)
    # Item info
    _draw_text_placeholder(d, 46, 28, 80, 'near_white')  # item name
    _draw_text_placeholder(d, 46, 36, 40, 'stone_gray')  # rarity
    # Time remaining
    _draw_text_placeholder(d, 46, 46, 50, 'fire_orange')  # time left

    # Current price area
    fill_rect(d, 130, 26, 82, 30, 'shadow_black')
    border_rect(d, 130, 26, 82, 30, 'deep_soil')
    _draw_text_placeholder(d, 134, 29, 40, 'desert_gold')  # "CURRENT BID"
    _draw_gold_coin_small(d, 140, 38)
    _draw_text_placeholder(d, 155, 41, 40, 'bright_yellow')

    hline(d, 4, 62, W - 8, 'deep_soil')

    # Column headers
    fill_rect(d, 4, 64, W - 8, 10, 'deep_soil')
    _draw_text_placeholder(d, 8, 67, 30, 'desert_gold')  # "BIDDER"
    _draw_text_placeholder(d, 80, 67, 30, 'desert_gold')  # "AMOUNT"
    _draw_text_placeholder(d, 150, 67, 30, 'desert_gold')  # "TIME"

    # Bid history rows (7 rows)
    for row in range(7):
        ry = 76 + row * 13
        bg = 'shadow_black' if row % 2 == 0 else 'dark_rock'
        fill_rect(d, 4, ry, W - 8, 12, bg)

        # Bidder name
        _draw_text_placeholder(d, 8, ry + 3, 50, 'light_stone')
        # Bid amount
        _draw_gold_coin_small(d, 80, ry + 1)
        _draw_text_placeholder(d, 94, ry + 4, 30, 'gold')
        # Time of bid
        _draw_text_placeholder(d, 150, ry + 3, 40, 'stone_gray')

        # Highlight for winning bid (first row)
        if row == 0:
            hline(d, 4, ry, W - 8, 'bright_yellow')
            fill_rect(d, 4, ry + 1, 2, 10, 'gold')

    # Quick bid button
    _draw_button(d, 8, 166, 100, 12, 'dark_gold', 'gold')
    _draw_text_placeholder(d, 20, 170, 60, 'pale_highlight')  # "PLACE BID"

    # Cancel/retract button
    _draw_button(d, 112, 166, 100, 12, 'dark_rock', 'stone_gray')
    _draw_text_placeholder(d, 124, 170, 60, 'light_stone')  # "RETRACT BID"

    return img


def generate_panel_sold_items():
    """Sold items / transaction log panel (220x160)."""
    W, H = 220, 160
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)
    _draw_panel_frame(d, W, H)

    # Title: "SOLD ITEMS"
    _draw_text_placeholder(d, 8, 7, 60, 'pale_highlight')

    hline(d, 4, 20, W - 8, 'deep_soil')
    hline(d, 4, 21, W - 8, 'dark_gold')

    # Summary bar (total earned)
    fill_rect(d, 4, 24, W - 8, 14, 'shadow_black')
    _draw_text_placeholder(d, 8, 27, 50, 'desert_gold')  # "TOTAL EARNED:"
    _draw_gold_coin_small(d, 70, 25)
    _draw_text_placeholder(d, 84, 28, 40, 'bright_yellow')
    # Collect all button
    _draw_button(d, 150, 25, 60, 12, 'leaf_green', 'bright_grass')
    _draw_text_placeholder(d, 156, 29, 40, 'near_white')

    # Column headers
    fill_rect(d, 4, 42, W - 8, 10, 'deep_soil')
    _draw_text_placeholder(d, 8, 45, 20, 'desert_gold')  # "ITEM"
    _draw_text_placeholder(d, 80, 45, 30, 'desert_gold')  # "BUYER"
    _draw_text_placeholder(d, 130, 45, 20, 'desert_gold')  # "PRICE"
    _draw_text_placeholder(d, 180, 45, 20, 'desert_gold')  # "STATUS"

    # Transaction rows (6 rows)
    for row in range(6):
        ry = 54 + row * 16
        bg = 'shadow_black' if row % 2 == 0 else 'dark_rock'
        fill_rect(d, 4, ry, W - 8, 14, bg)

        # Item icon
        _draw_item_slot(d, 6, ry + 1, 12)

        # Item name
        _draw_text_placeholder(d, 22, ry + 3, 50, 'near_white')

        # Buyer
        _draw_text_placeholder(d, 80, ry + 3, 40, 'light_stone')

        # Price
        _draw_gold_coin_small(d, 130, ry + 1)
        _draw_text_placeholder(d, 144, ry + 4, 24, 'gold')

        # Status indicator
        if row < 4:
            # Collected (green check)
            px(d, 186, ry + 5, 'leaf_green')
            px(d, 187, ry + 6, 'leaf_green')
            px(d, 188, ry + 5, 'leaf_green')
            px(d, 189, ry + 4, 'leaf_green')
        elif row == 4:
            # Pending (gold clock)
            fill_circle(d, 188, ry + 5, 3, 'dark_gold')
            fill_circle(d, 188, ry + 5, 2, 'gold')
            px(d, 188, ry + 4, 'shadow_black')
            px(d, 189, ry + 5, 'shadow_black')
        else:
            # Expired (red X)
            px(d, 186, ry + 3, 'enemy_red')
            px(d, 190, ry + 3, 'enemy_red')
            px(d, 188, ry + 5, 'enemy_red')
            px(d, 186, ry + 7, 'enemy_red')
            px(d, 190, ry + 7, 'enemy_red')

    # Bottom action bar
    hline(d, 4, H - 14, W - 8, 'deep_soil')
    _draw_button(d, 8, H - 12, 60, 10, 'dark_gold', 'gold')
    _draw_text_placeholder(d, 14, H - 9, 40, 'near_white')  # "RELIST"

    return img


def generate_all_panels():
    """Generate all auction UI panels."""
    print('\n=== Auction UI Panels ===')
    save_png(generate_panel_listing_create(), 'ui/auction/ui_panel_auction_listing.png')
    save_png(generate_panel_search_browse(), 'ui/auction/ui_panel_auction_browse.png')
    save_png(generate_panel_bid_history(), 'ui/auction/ui_panel_auction_bids.png')
    save_png(generate_panel_sold_items(), 'ui/auction/ui_panel_auction_sold.png')


# =====================================================================
# 5. CURRENCY AND PRICE TAG ICONS (16x16)
# =====================================================================

def generate_icon_gold_coin():
    """Gold coin icon (16x16)."""
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    fill_circle(d, 7, 7, 6, 'dark_gold')
    fill_circle(d, 7, 7, 5, 'gold')
    fill_circle(d, 7, 7, 4, 'bright_yellow')
    # Inner detail (embossed coin design)
    fill_circle(d, 7, 7, 2, 'gold')
    px(d, 7, 7, 'dark_gold')
    # Highlight
    px(d, 5, 4, 'pale_highlight')
    px(d, 4, 5, 'pale_highlight')
    # Edge shadow
    px(d, 10, 10, 'deep_soil')
    px(d, 9, 11, 'deep_soil')
    return img


def generate_icon_silver_coin():
    """Silver coin icon (16x16)."""
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    fill_circle(d, 7, 7, 6, 'stone_gray')
    fill_circle(d, 7, 7, 5, 'light_stone')
    fill_circle(d, 7, 7, 4, 'pale_gray')
    fill_circle(d, 7, 7, 2, 'light_stone')
    px(d, 7, 7, 'stone_gray')
    px(d, 5, 4, 'near_white')
    px(d, 4, 5, 'near_white')
    px(d, 10, 10, 'dark_rock')
    px(d, 9, 11, 'dark_rock')
    return img


def generate_icon_price_tag():
    """Price tag icon (16x16)."""
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Tag body
    fill_rect(d, 2, 4, 10, 8, 'pale_sand')
    fill_rect(d, 3, 5, 8, 6, 'desert_gold')
    # Tag point (right side triangle)
    px(d, 12, 6, 'pale_sand')
    px(d, 12, 7, 'pale_sand')
    px(d, 12, 8, 'pale_sand')
    px(d, 12, 9, 'pale_sand')
    px(d, 13, 7, 'desert_gold')
    px(d, 13, 8, 'desert_gold')
    px(d, 14, 8, 'desert_gold')
    # String hole
    px(d, 4, 7, 'shadow_black')
    px(d, 4, 8, 'shadow_black')
    # String
    px(d, 3, 6, 'dark_gold')
    px(d, 2, 5, 'dark_gold')
    px(d, 1, 4, 'dark_gold')
    px(d, 1, 3, 'dark_gold')
    # Coin symbol on tag
    fill_circle(d, 9, 8, 2, 'dark_gold')
    px(d, 9, 7, 'gold')
    return img


def generate_icon_bid():
    """Bid/auction hammer icon (16x16)."""
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Gavel head
    fill_rect(d, 3, 3, 7, 4, 'desert_gold')
    fill_rect(d, 4, 4, 5, 2, 'gold')
    px(d, 3, 3, 'dark_gold')
    px(d, 9, 3, 'dark_gold')
    # Handle
    fill_rect(d, 6, 7, 2, 5, 'rich_earth')
    px(d, 6, 12, 'dirt')
    px(d, 7, 12, 'dirt')
    # Strike base
    fill_rect(d, 4, 13, 8, 2, 'dark_rock')
    hline(d, 4, 13, 8, 'stone_gray')
    # Impact lines
    px(d, 2, 6, 'bright_yellow', 180)
    px(d, 10, 6, 'bright_yellow', 180)
    px(d, 1, 4, 'bright_yellow', 120)
    px(d, 11, 4, 'bright_yellow', 120)
    return img


def generate_icon_buyout():
    """Buyout/instant buy icon (16x16)."""
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Lightning bolt shape
    px(d, 9, 1, 'bright_yellow')
    px(d, 8, 2, 'bright_yellow')
    px(d, 8, 3, 'gold')
    px(d, 7, 4, 'gold')
    px(d, 7, 5, 'gold')
    fill_rect(d, 5, 6, 5, 2, 'bright_yellow')
    px(d, 8, 8, 'gold')
    px(d, 8, 9, 'gold')
    px(d, 7, 10, 'gold')
    px(d, 7, 11, 'bright_yellow')
    px(d, 6, 12, 'bright_yellow')
    # Coin at base
    fill_circle(d, 7, 12, 2, 'dark_gold')
    px(d, 7, 11, 'gold')
    return img


def generate_icon_listing_fee():
    """Listing fee icon - coin with arrow (16x16)."""
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Coin
    fill_circle(d, 6, 8, 5, 'dark_gold')
    fill_circle(d, 6, 8, 4, 'gold')
    fill_circle(d, 6, 8, 3, 'bright_yellow')
    fill_circle(d, 6, 8, 1, 'gold')
    px(d, 4, 6, 'pale_highlight')
    # Arrow going out (up-right)
    px(d, 10, 5, 'enemy_red')
    px(d, 11, 4, 'enemy_red')
    px(d, 12, 3, 'enemy_red')
    px(d, 13, 2, 'enemy_red')
    # Arrow head
    px(d, 11, 2, 'enemy_red')
    px(d, 12, 2, 'enemy_red')
    px(d, 13, 3, 'enemy_red')
    px(d, 13, 4, 'enemy_red')
    return img


def generate_all_icons():
    """Generate all currency and auction icons."""
    print('\n=== Currency & Auction Icons ===')
    save_png(generate_icon_gold_coin(), 'ui/icons/icon_currency_gold.png')
    save_png(generate_icon_silver_coin(), 'ui/icons/icon_currency_silver.png')
    save_png(generate_icon_price_tag(), 'ui/icons/icon_auction_price_tag.png')
    save_png(generate_icon_bid(), 'ui/icons/icon_auction_bid.png')
    save_png(generate_icon_buyout(), 'ui/icons/icon_auction_buyout.png')
    save_png(generate_icon_listing_fee(), 'ui/icons/icon_auction_listing_fee.png')


# =====================================================================
# 6. ITEM RARITY GLOW BORDERS FOR AUCTION LISTINGS (20x20)
# =====================================================================

def generate_rarity_glow_border(color_outer, color_inner, color_highlight):
    """Generate a glow border frame for auction item listings (20x20).

    These are overlaid on top of 18x18 item slots to indicate rarity.
    """
    img = Image.new('RGBA', (20, 20), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Outer glow edge (2px border with transparency)
    # Top edge
    hline(d, 2, 0, 16, color_outer, 120)
    hline(d, 1, 1, 18, color_inner, 180)
    # Bottom edge
    hline(d, 2, 19, 16, color_outer, 120)
    hline(d, 1, 18, 18, color_inner, 180)
    # Left edge
    vline(d, 0, 2, 16, color_outer, 120)
    vline(d, 1, 1, 18, color_inner, 180)
    # Right edge
    vline(d, 19, 2, 16, color_outer, 120)
    vline(d, 18, 1, 18, color_inner, 180)

    # Corner highlights
    px(d, 1, 1, color_highlight, 200)
    px(d, 18, 1, color_highlight, 200)
    px(d, 1, 18, color_highlight, 200)
    px(d, 18, 18, color_highlight, 200)

    # Inner highlight (top-left)
    px(d, 2, 2, color_highlight, 160)

    return img


def generate_all_rarity_borders():
    """Generate rarity glow borders for all tiers."""
    print('\n=== Item Rarity Glow Borders ===')
    borders = {
        'common':    ('light_stone',  'pale_gray',     'near_white'),
        'uncommon':  ('forest_green', 'leaf_green',    'bright_grass'),
        'rare':      ('ocean_blue',   'player_blue',   'ice_water'),
        'epic':      ('magic_purple', 'mana_violet',   'spell_glow'),
        'legendary': ('dark_gold',    'gold',          'bright_yellow'),
    }
    for name, (outer, inner, highlight) in borders.items():
        img = generate_rarity_glow_border(outer, inner, highlight)
        save_png(img, f'ui/auction/ui_auction_glow_{name}.png')


# =====================================================================
# 7. TRANSACTION VFX SPRITESHEETS (192x32, 6 frames)
# =====================================================================

def generate_vfx_sale_confirm():
    """Sale confirmation VFX (192x32, 6 frames of 32x32).

    Coin burst + checkmark animation.
    """
    W, H = 192, 32
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    for frame in range(6):
        ox = frame * 32
        cx, cy = ox + 16, 16

        if frame == 0:
            # Initial coin flash
            fill_circle(d, cx, cy, 3, 'gold')
            px(d, cx, cy, 'bright_yellow')

        elif frame == 1:
            # Expanding ring
            fill_circle(d, cx, cy, 6, 'gold', 200)
            fill_circle(d, cx, cy, 4, TRANSPARENT)
            fill_circle(d, cx, cy, 3, 'bright_yellow', 150)

        elif frame == 2:
            # Coin burst outward
            fill_circle(d, cx, cy, 8, 'gold', 120)
            fill_circle(d, cx, cy, 6, TRANSPARENT)
            # Sparkle particles
            for dx, dy in [(-6, -4), (5, -5), (-4, 6), (7, 3), (0, -8), (-7, 0)]:
                px(d, cx + dx, cy + dy, 'bright_yellow', 200)
                px(d, cx + dx + 1, cy + dy, 'pale_highlight', 150)

        elif frame == 3:
            # Checkmark appearing + fading ring
            fill_circle(d, cx, cy, 10, 'gold', 60)
            # Checkmark
            px(d, cx - 3, cy, 'bright_grass')
            px(d, cx - 2, cy + 1, 'bright_grass')
            px(d, cx - 1, cy + 2, 'bright_grass')
            px(d, cx, cy + 1, 'leaf_green')
            px(d, cx + 1, cy, 'leaf_green')
            px(d, cx + 2, cy - 1, 'leaf_green')
            px(d, cx + 3, cy - 2, 'leaf_green')
            # Coin particles
            for dx, dy in [(-8, -2), (7, -6), (-5, 8), (9, 4)]:
                fill_circle(d, cx + dx, cy + dy, 1, 'gold', 180)

        elif frame == 4:
            # Bold checkmark + sparkles
            px(d, cx - 4, cy - 1, 'leaf_green')
            px(d, cx - 3, cy, 'leaf_green')
            px(d, cx - 2, cy + 1, 'bright_grass')
            px(d, cx - 1, cy + 2, 'bright_grass')
            px(d, cx, cy + 3, 'bright_grass')
            px(d, cx + 1, cy + 2, 'leaf_green')
            px(d, cx + 2, cy + 1, 'leaf_green')
            px(d, cx + 3, cy, 'leaf_green')
            px(d, cx + 4, cy - 1, 'leaf_green')
            px(d, cx + 5, cy - 2, 'leaf_green')
            # Corner sparkles
            for dx, dy in [(-6, -6), (6, -6), (-6, 6), (6, 6)]:
                px(d, cx + dx, cy + dy, 'pale_highlight', 200)

        elif frame == 5:
            # Fading out
            px(d, cx - 2, cy + 1, 'bright_grass', 120)
            px(d, cx - 1, cy + 2, 'bright_grass', 120)
            px(d, cx + 1, cy + 1, 'leaf_green', 100)
            px(d, cx + 2, cy, 'leaf_green', 100)
            px(d, cx + 3, cy - 1, 'leaf_green', 80)

    return img


def generate_vfx_sale_notification():
    """Sale notification VFX (192x32, 6 frames of 32x32).

    Gold coin drop + sparkle alert animation.
    """
    W, H = 192, 32
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    for frame in range(6):
        ox = frame * 32
        cx, cy = ox + 16, 16

        coin_y = max(6, cy - 10 + frame * 4)  # Coin drops down

        if frame < 5:
            # Gold coin dropping
            fill_circle(d, cx, coin_y, 4, 'dark_gold')
            fill_circle(d, cx, coin_y, 3, 'gold')
            fill_circle(d, cx, coin_y, 2, 'bright_yellow')
            px(d, cx - 1, coin_y - 1, 'pale_highlight')

        if frame >= 2:
            # Sparkle trail above coin
            trail_y = coin_y - 6
            for i in range(min(frame - 1, 4)):
                px(d, cx + (i % 2) * 2 - 1, trail_y - i * 2, 'bright_yellow', 255 - i * 50)

        if frame >= 3:
            # Impact sparkles
            spread = (frame - 3) * 3
            for dx in [-spread, spread]:
                px(d, cx + dx, coin_y + 2, 'gold', 200 - frame * 30)
            px(d, cx, coin_y + 3, 'bright_yellow', 200 - frame * 30)

        if frame == 5:
            # Final glow burst
            fill_circle(d, cx, cy + 6, 5, 'gold', 80)
            fill_circle(d, cx, cy + 6, 3, 'bright_yellow', 120)
            for dx, dy in [(-4, -2), (4, -2), (-3, 3), (3, 3)]:
                px(d, cx + dx, cy + 6 + dy, 'pale_highlight', 150)

    return img


def generate_all_vfx():
    """Generate all auction VFX."""
    print('\n=== Auction VFX ===')
    save_png(generate_vfx_sale_confirm(), 'vfx/vfx_auction_sale_confirm.png')
    save_png(generate_vfx_sale_notification(), 'vfx/vfx_auction_sale_notify.png')


# =====================================================================
# 8. "SOLD" AND "EXPIRED" STAMP OVERLAYS (32x16)
# =====================================================================

def generate_stamp_sold():
    """'SOLD' stamp overlay (32x16)."""
    img = Image.new('RGBA', (32, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Stamp border (red, slightly tilted feel via offset corners)
    border_rect(d, 1, 1, 30, 14, 'enemy_red')
    fill_rect(d, 2, 2, 28, 12, TRANSPARENT)
    # Double border
    border_rect(d, 3, 3, 26, 10, 'bright_red')
    fill_rect(d, 4, 4, 24, 8, TRANSPARENT)

    # "S" letter (5x7 at x=5)
    px(d, 6, 4, 'enemy_red')
    px(d, 7, 4, 'enemy_red')
    px(d, 8, 4, 'enemy_red')
    px(d, 5, 5, 'enemy_red')
    px(d, 5, 6, 'enemy_red')
    px(d, 6, 7, 'enemy_red')
    px(d, 7, 7, 'enemy_red')
    px(d, 8, 8, 'enemy_red')
    px(d, 8, 9, 'enemy_red')
    px(d, 5, 10, 'enemy_red')
    px(d, 6, 10, 'enemy_red')
    px(d, 7, 10, 'enemy_red')

    # "O" letter (at x=10)
    px(d, 11, 4, 'enemy_red')
    px(d, 12, 4, 'enemy_red')
    px(d, 13, 4, 'enemy_red')
    px(d, 10, 5, 'enemy_red')
    px(d, 14, 5, 'enemy_red')
    px(d, 10, 6, 'enemy_red')
    px(d, 14, 6, 'enemy_red')
    px(d, 10, 7, 'enemy_red')
    px(d, 14, 7, 'enemy_red')
    px(d, 10, 8, 'enemy_red')
    px(d, 14, 8, 'enemy_red')
    px(d, 10, 9, 'enemy_red')
    px(d, 14, 9, 'enemy_red')
    px(d, 11, 10, 'enemy_red')
    px(d, 12, 10, 'enemy_red')
    px(d, 13, 10, 'enemy_red')

    # "L" letter (at x=16)
    px(d, 16, 4, 'enemy_red')
    px(d, 16, 5, 'enemy_red')
    px(d, 16, 6, 'enemy_red')
    px(d, 16, 7, 'enemy_red')
    px(d, 16, 8, 'enemy_red')
    px(d, 16, 9, 'enemy_red')
    px(d, 16, 10, 'enemy_red')
    px(d, 17, 10, 'enemy_red')
    px(d, 18, 10, 'enemy_red')
    px(d, 19, 10, 'enemy_red')

    # "D" letter (at x=21)
    px(d, 21, 4, 'enemy_red')
    px(d, 22, 4, 'enemy_red')
    px(d, 23, 4, 'enemy_red')
    px(d, 21, 5, 'enemy_red')
    px(d, 24, 5, 'enemy_red')
    px(d, 21, 6, 'enemy_red')
    px(d, 25, 6, 'enemy_red')
    px(d, 21, 7, 'enemy_red')
    px(d, 25, 7, 'enemy_red')
    px(d, 21, 8, 'enemy_red')
    px(d, 25, 8, 'enemy_red')
    px(d, 21, 9, 'enemy_red')
    px(d, 24, 9, 'enemy_red')
    px(d, 21, 10, 'enemy_red')
    px(d, 22, 10, 'enemy_red')
    px(d, 23, 10, 'enemy_red')

    return img


def generate_stamp_expired():
    """'EXPIRED' stamp overlay (32x16)."""
    img = Image.new('RGBA', (32, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Stamp border (gray/muted)
    border_rect(d, 1, 1, 30, 14, 'stone_gray')
    fill_rect(d, 2, 2, 28, 12, TRANSPARENT)
    border_rect(d, 3, 3, 26, 10, 'mid_gray')
    fill_rect(d, 4, 4, 24, 8, TRANSPARENT)

    # "EXP" letters in compact pixel font
    # "E" at x=5
    vline(d, 5, 4, 7, 'stone_gray')
    hline(d, 5, 4, 4, 'stone_gray')
    hline(d, 5, 7, 3, 'stone_gray')
    hline(d, 5, 10, 4, 'stone_gray')

    # "X" at x=10
    px(d, 10, 4, 'stone_gray')
    px(d, 13, 4, 'stone_gray')
    px(d, 11, 5, 'stone_gray')
    px(d, 12, 6, 'stone_gray')
    px(d, 11, 7, 'stone_gray')
    px(d, 12, 7, 'stone_gray')
    px(d, 11, 8, 'stone_gray')
    px(d, 10, 9, 'stone_gray')
    px(d, 13, 9, 'stone_gray')
    px(d, 10, 10, 'stone_gray')
    px(d, 13, 10, 'stone_gray')
    px(d, 12, 5, 'stone_gray')
    px(d, 13, 6, 'stone_gray')
    px(d, 10, 8, 'stone_gray')
    px(d, 13, 8, 'stone_gray')

    # "P" at x=15
    vline(d, 15, 4, 7, 'stone_gray')
    hline(d, 15, 4, 4, 'stone_gray')
    px(d, 18, 5, 'stone_gray')
    px(d, 18, 6, 'stone_gray')
    hline(d, 15, 7, 4, 'stone_gray')

    # Clock icon to the right (expired = time ran out)
    fill_circle(d, 24, 7, 4, 'stone_gray')
    fill_circle(d, 24, 7, 3, 'dark_rock')
    # Clock hands
    vline(d, 24, 5, 3, 'mid_gray')
    hline(d, 24, 7, 2, 'mid_gray')
    # X over clock
    px(d, 22, 5, 'enemy_red')
    px(d, 26, 5, 'enemy_red')
    px(d, 23, 6, 'enemy_red')
    px(d, 25, 6, 'enemy_red')
    px(d, 23, 8, 'enemy_red')
    px(d, 25, 8, 'enemy_red')
    px(d, 22, 9, 'enemy_red')
    px(d, 26, 9, 'enemy_red')

    return img


def generate_all_stamps():
    """Generate stamp overlays."""
    print('\n=== Stamp Overlays ===')
    save_png(generate_stamp_sold(), 'ui/auction/ui_stamp_sold.png')
    save_png(generate_stamp_expired(), 'ui/auction/ui_stamp_expired.png')


# =====================================================================
# MAIN
# =====================================================================
if __name__ == '__main__':
    print('PIX-319: Generating auction house and trading post art assets')
    print(f'Output: {ASSET_DIR}')

    print('\n=== Auction House Exterior Tileset ===')
    save_png(generate_auction_tileset(), 'tiles/tilesets/tileset_auction_house.png')

    print('\n=== Auction House Interior Background ===')
    save_png(generate_interior_background(), 'backgrounds/bg_auction_interior.png')

    print('\n=== Auctioneer NPC Sprite ===')
    save_png(generate_auctioneer_npc(), 'sprites/characters/char_npc_auctioneer.png')

    generate_all_panels()
    generate_all_icons()
    generate_all_rarity_borders()
    generate_all_vfx()
    generate_all_stamps()

    print(f'\nDone! All auction house assets generated.')
