#!/usr/bin/env python3
"""
PIX-338: Generate cosmetic shop and character appearance customization art assets.

Creates:
- Cosmetic shop UI panel (storefront layout, 220x200)
- Category tab bar (7 tabs: head, chest, legs, back, weapon_skin, aura, title_frame — 16x16 each)
- Purchase confirmation dialog (120x80)
- Character preview/fitting room background (120x160)
- Dye color palette swatches (24 dye colors, 10x10 each + palette panel 120x60)
- Cosmetic category icons (7 icons, 16x16 each)
- Outfit preset save/load UI panel (100x60)
- Rarity shimmer effect spritesheets (common, uncommon, rare, epic, legendary — 6 frames each, 32x32)
- "New" and "Limited" badges (20x10 each)
- Cosmetic shop NPC sprite (fashion merchant/tailor, 16x24)
- Portrait frame collection (12 unlockable frames, 32x32 each)

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

# Rarity color themes
RARITY_THEMES = {
    'common':   {'border': 'mid_gray',     'accent': 'light_stone',  'glow': 'pale_gray'},
    'uncommon': {'border': 'forest_green', 'accent': 'leaf_green',   'glow': 'bright_grass'},
    'rare':     {'border': 'ocean_blue',   'accent': 'sky_blue',     'glow': 'player_blue'},
    'epic':     {'border': 'magic_purple', 'accent': 'mana_violet',  'glow': 'spell_glow'},
    'legendary':{'border': 'dark_gold',    'accent': 'gold',         'glow': 'bright_yellow'},
}

# Dye colors — 24 distinct hues for armor tinting
DYE_COLORS = {
    'crimson':      (180, 20, 20),
    'scarlet':      (212, 32, 32),
    'rose':         (200, 80, 100),
    'coral':        (240, 96, 32),
    'amber':        (232, 184, 0),
    'gold':         (168, 112, 0),
    'sunflower':    (255, 224, 64),
    'cream':        (232, 208, 138),
    'forest':       (26, 58, 26),
    'emerald':      (45, 110, 45),
    'jade':         (76, 155, 76),
    'mint':         (120, 200, 120),
    'teal':         (42, 122, 130),
    'azure':        (42, 122, 192),
    'sapphire':     (26, 74, 138),
    'cobalt':       (10, 26, 58),
    'royal':        (90, 32, 160),
    'violet':       (144, 80, 224),
    'lavender':     (208, 144, 255),
    'plum':         (100, 20, 80),
    'charcoal':     (43, 43, 43),
    'silver':       (150, 150, 150),
    'ivory':        (240, 240, 240),
    'midnight':     (13, 13, 30),
}


def ensure_dir(p):
    os.makedirs(p, exist_ok=True)


def px(draw, x, y, color, alpha=255):
    if isinstance(color, str):
        color = PALETTE[color]
    draw.point((x, y), fill=(*color, alpha))


def fill_rect(draw, x, y, w, h, color, alpha=255):
    if isinstance(color, str):
        color = PALETTE[color]
    for dy in range(h):
        for dx in range(w):
            draw.point((x + dx, y + dy), fill=(*color, alpha))


def fill_circle(draw, cx, cy, r, color, alpha=255):
    if isinstance(color, str):
        color = PALETTE[color]
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                draw.point((cx + dx, cy + dy), fill=(*color, alpha))


def border_rect(draw, x, y, w, h, border_color, fill_color=None, alpha=255):
    fill_rect(draw, x, y, w, h, border_color, alpha)
    if fill_color:
        fill_rect(draw, x + 1, y + 1, w - 2, h - 2, fill_color, alpha)


def save_png(img, rel_path):
    full = os.path.join(ASSET_DIR, rel_path)
    ensure_dir(os.path.dirname(full))
    img.save(full)
    print(f'  \u2713 {rel_path} ({img.size[0]}x{img.size[1]})')


# =====================================================================
# 1. COSMETIC SHOP UI PANEL (220x200)
# Elegant storefront with ornamental border, display area, tabs
# =====================================================================

def generate_shop_panel():
    """Main shop storefront panel — rich purple/gold luxury feel."""
    w, h = 220, 200
    img = Image.new('RGBA', (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Outer border — dark ornate frame
    fill_rect(d, 0, 0, w, h, 'deep_magic')
    fill_rect(d, 1, 1, w - 2, h - 2, 'magic_purple')
    fill_rect(d, 2, 2, w - 4, h - 4, 'deep_magic')
    # Inner fill — dark panel
    fill_rect(d, 3, 3, w - 6, h - 6, 'dark_rock')

    # Gold corner accents (4 corners, 5x5 flourishes)
    for cx, cy in [(3, 3), (w - 8, 3), (3, h - 8), (w - 8, h - 8)]:
        fill_rect(d, cx, cy, 5, 1, 'gold')
        fill_rect(d, cx, cy, 1, 5, 'gold')
        px(d, cx + 1, cy + 1, 'bright_yellow')
        px(d, cx + 2, cy + 2, 'dark_gold')

    # Title bar area (top, for "COSMETIC SHOP" text)
    fill_rect(d, 4, 4, w - 8, 14, 'deep_magic')
    fill_rect(d, 5, 5, w - 10, 12, 'magic_purple', 180)
    # Gold divider under title
    fill_rect(d, 4, 18, w - 8, 1, 'gold')
    fill_rect(d, 4, 19, w - 8, 1, 'dark_gold')

    # Category tab bar area (below title)
    fill_rect(d, 4, 20, w - 8, 18, 'shadow_black', 120)
    # Tab dividers — 7 slots each ~30px wide
    tab_w = (w - 8) // 7
    for i in range(1, 7):
        tx = 4 + i * tab_w
        fill_rect(d, tx, 21, 1, 16, 'stone_gray', 100)

    # Main display grid area (item grid)
    fill_rect(d, 4, 40, w - 8, 120, 'shadow_black', 80)
    # Grid lines — 4 columns x 3 rows of 48x36 item slots
    grid_cols, grid_rows = 4, 3
    slot_w, slot_h = (w - 16) // grid_cols, 36
    for row in range(grid_rows):
        for col in range(grid_cols):
            sx = 8 + col * slot_w
            sy = 44 + row * (slot_h + 2)
            border_rect(d, sx, sy, slot_w - 4, slot_h, 'stone_gray', 'dark_rock')
            # Inner item placeholder
            fill_rect(d, sx + 2, sy + 2, slot_w - 8, slot_h - 4, 'shadow_black', 60)

    # Bottom info/purchase bar
    fill_rect(d, 4, 162, w - 8, 1, 'gold')
    fill_rect(d, 4, 163, w - 8, 33, 'deep_magic', 200)
    # Price display area
    border_rect(d, 8, 167, 60, 12, 'dark_gold', 'shadow_black')
    # Gold coin icon hint
    fill_circle(d, 14, 173, 3, 'gold')
    px(d, 14, 173, 'bright_yellow')
    # Buy button
    border_rect(d, w - 68, 167, 60, 12, 'forest_green', 'deep_forest')
    fill_rect(d, w - 66, 169, 56, 8, 'forest_green')
    # Preview button
    border_rect(d, w - 68, 182, 60, 12, 'ocean_blue', 'deep_ocean')
    fill_rect(d, w - 66, 184, 56, 8, 'ocean_blue')

    # Scroll indicator (right edge)
    fill_rect(d, w - 7, 42, 3, 116, 'shadow_black', 100)
    fill_rect(d, w - 7, 42, 3, 30, 'mid_gray')

    save_png(img, 'ui/cosmetic_shop/ui_panel_cosmetic_shop.png')


# =====================================================================
# 2. COSMETIC CATEGORY ICONS (7 icons, 16x16 each)
# head, chest, legs, back, weapon_skin, aura, title_frame
# =====================================================================

def generate_category_icons():
    """Category icons for shop tab bar — 16x16 silhouette-style."""

    def _make_icon(name, draw_fn):
        img = Image.new('RGBA', (16, 16), TRANSPARENT)
        d = ImageDraw.Draw(img)
        draw_fn(d)
        save_png(img, f'ui/cosmetic_shop/icon_category_{name}.png')

    def draw_head(d):
        # Helmet silhouette
        fill_circle(d, 8, 7, 4, 'pale_gray')
        fill_rect(d, 4, 7, 8, 5, 'pale_gray')
        fill_rect(d, 5, 3, 6, 2, 'light_stone')  # crest
        px(d, 7, 2, 'gold')
        px(d, 8, 2, 'gold')
        # Visor slit
        fill_rect(d, 6, 8, 4, 1, 'shadow_black')
        # Chin guard
        fill_rect(d, 5, 12, 6, 2, 'mid_gray')

    def draw_chest(d):
        # Chestplate silhouette
        fill_rect(d, 4, 3, 8, 10, 'pale_gray')
        fill_rect(d, 3, 5, 10, 6, 'light_stone')
        # Shoulder pads
        fill_rect(d, 2, 3, 3, 3, 'mid_gray')
        fill_rect(d, 11, 3, 3, 3, 'mid_gray')
        # Center line detail
        fill_rect(d, 7, 4, 2, 8, 'stone_gray')
        px(d, 7, 5, 'gold')
        px(d, 8, 5, 'gold')

    def draw_legs(d):
        # Greaves/pants silhouette
        fill_rect(d, 4, 2, 8, 4, 'pale_gray')  # belt area
        fill_rect(d, 4, 6, 4, 7, 'light_stone')  # left leg
        fill_rect(d, 8, 6, 4, 7, 'light_stone')  # right leg
        # Knee guards
        fill_rect(d, 5, 8, 2, 2, 'mid_gray')
        fill_rect(d, 9, 8, 2, 2, 'mid_gray')
        # Belt buckle
        px(d, 7, 3, 'gold')
        px(d, 8, 3, 'gold')

    def draw_back(d):
        # Cape/cloak silhouette
        fill_rect(d, 5, 2, 6, 2, 'light_stone')  # collar
        fill_rect(d, 4, 4, 8, 4, 'magic_purple')  # upper cape
        fill_rect(d, 3, 8, 10, 4, 'deep_magic')  # lower cape flowing
        fill_rect(d, 2, 12, 12, 2, 'deep_magic')  # cape bottom edge
        # Clasp
        px(d, 7, 3, 'gold')
        px(d, 8, 3, 'gold')

    def draw_weapon_skin(d):
        # Sword with glowing accent
        # Blade
        for i in range(9):
            px(d, 11 - i, 2 + i, 'light_stone')
            px(d, 12 - i, 2 + i, 'pale_gray')
        # Guard
        fill_rect(d, 2, 11, 5, 1, 'gold')
        # Hilt
        fill_rect(d, 4, 12, 1, 3, 'rich_earth')
        # Pommel
        px(d, 4, 15, 'gold')

    def draw_aura(d):
        # Radial glow effect
        fill_circle(d, 8, 8, 6, 'deep_magic', 80)
        fill_circle(d, 8, 8, 4, 'magic_purple', 120)
        fill_circle(d, 8, 8, 2, 'spell_glow', 160)
        px(d, 8, 8, 'near_white')
        # Sparkle accents
        px(d, 4, 4, 'spell_glow')
        px(d, 12, 5, 'mana_violet')
        px(d, 5, 12, 'spell_glow')
        px(d, 11, 11, 'mana_violet')

    def draw_title_frame(d):
        # Ornamental frame border
        border_rect(d, 2, 3, 12, 10, 'gold', 'shadow_black')
        border_rect(d, 3, 4, 10, 8, 'dark_gold', 'deep_magic')
        # Corner dots
        px(d, 2, 3, 'bright_yellow')
        px(d, 13, 3, 'bright_yellow')
        px(d, 2, 12, 'bright_yellow')
        px(d, 13, 12, 'bright_yellow')
        # Inner text lines (placeholder)
        fill_rect(d, 5, 6, 6, 1, 'pale_gray', 140)
        fill_rect(d, 6, 8, 4, 1, 'pale_gray', 100)

    _make_icon('head', draw_head)
    _make_icon('chest', draw_chest)
    _make_icon('legs', draw_legs)
    _make_icon('back', draw_back)
    _make_icon('weapon_skin', draw_weapon_skin)
    _make_icon('aura', draw_aura)
    _make_icon('title_frame', draw_title_frame)


# =====================================================================
# 3. CHARACTER PREVIEW / FITTING ROOM BACKGROUND (120x160)
# Full-body character display with equipment preview area
# =====================================================================

def generate_fitting_room():
    """Fitting room background — dark stage with spotlight effect."""
    w, h = 120, 160
    img = Image.new('RGBA', (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Background — dark gradient-like zones
    fill_rect(d, 0, 0, w, h, 'shadow_black')
    fill_rect(d, 1, 1, w - 2, h - 2, 'dark_rock')

    # Spotlight cone from top center — radial fade
    # Outer glow
    for y_off in range(h - 20):
        spread = 8 + (y_off * 30) // h
        cx = w // 2
        cy = 10 + y_off
        alpha_base = max(10, 60 - (y_off * 50) // h)
        fill_rect(d, cx - spread, cy, spread * 2, 1, 'pale_gray', alpha_base)
    # Inner bright cone
    for y_off in range(h - 40):
        spread = 4 + (y_off * 15) // h
        cx = w // 2
        cy = 15 + y_off
        alpha_base = max(5, 40 - (y_off * 35) // h)
        fill_rect(d, cx - spread, cy, spread * 2, 1, 'near_white', alpha_base)

    # Floor reflection line
    fill_rect(d, 20, h - 30, w - 40, 1, 'mid_gray', 60)
    fill_rect(d, 30, h - 29, w - 60, 1, 'stone_gray', 40)

    # Platform / pedestal
    fill_rect(d, 30, h - 25, w - 60, 3, 'stone_gray')
    fill_rect(d, 28, h - 22, w - 56, 2, 'mid_gray')
    fill_rect(d, 32, h - 25, w - 64, 1, 'light_stone')

    # Ornamental frame border
    # Top
    fill_rect(d, 0, 0, w, 2, 'deep_magic')
    fill_rect(d, 0, 0, 2, h, 'deep_magic')
    fill_rect(d, w - 2, 0, 2, h, 'deep_magic')
    fill_rect(d, 0, h - 2, w, 2, 'deep_magic')
    # Gold trim
    fill_rect(d, 2, 2, w - 4, 1, 'dark_gold')
    fill_rect(d, 2, 2, 1, h - 4, 'dark_gold')
    fill_rect(d, w - 3, 2, 1, h - 4, 'dark_gold')
    fill_rect(d, 2, h - 3, w - 4, 1, 'dark_gold')

    # Rotation arrows at bottom corners
    # Left arrow
    px(d, 8, h - 10, 'light_stone')
    px(d, 7, h - 9, 'light_stone')
    px(d, 6, h - 8, 'light_stone')
    px(d, 7, h - 7, 'light_stone')
    px(d, 8, h - 6, 'light_stone')
    # Right arrow
    px(d, w - 9, h - 10, 'light_stone')
    px(d, w - 8, h - 9, 'light_stone')
    px(d, w - 7, h - 8, 'light_stone')
    px(d, w - 8, h - 7, 'light_stone')
    px(d, w - 9, h - 6, 'light_stone')

    save_png(img, 'ui/cosmetic_shop/ui_fitting_room_bg.png')


# =====================================================================
# 4. DYE COLOR PALETTE SWATCHES (24 colors, 10x10 each + panel 120x60)
# =====================================================================

def generate_dye_swatches():
    """Individual dye swatch tiles and assembled palette panel."""
    # Individual swatches (10x10)
    for name, color in DYE_COLORS.items():
        img = Image.new('RGBA', (10, 10), TRANSPARENT)
        d = ImageDraw.Draw(img)
        # Outer border
        fill_rect(d, 0, 0, 10, 10, 'shadow_black')
        # Fill with dye color
        fill_rect(d, 1, 1, 8, 8, color)
        # Highlight pixel (top-left inner)
        r, g, b = color
        highlight = (min(255, r + 60), min(255, g + 60), min(255, b + 60))
        px(d, 2, 2, highlight)
        save_png(img, f'ui/cosmetic_shop/dye_swatch_{name}.png')

    # Assembled palette panel (120x60)
    pw, ph = 120, 60
    img = Image.new('RGBA', (pw, ph), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Panel background
    border_rect(d, 0, 0, pw, ph, 'deep_magic', 'dark_rock')
    fill_rect(d, 1, 1, pw - 2, 10, 'deep_magic')  # title area
    fill_rect(d, 1, 11, pw - 2, 1, 'dark_gold')

    # Arrange 24 swatches in 6 columns x 4 rows
    cols, rows = 6, 4
    swatch_size = 10
    pad_x = (pw - cols * swatch_size) // 2
    pad_y = 14
    for idx, (name, color) in enumerate(DYE_COLORS.items()):
        col = idx % cols
        row = idx // cols
        sx = pad_x + col * (swatch_size + 2)
        sy = pad_y + row * (swatch_size + 1)
        fill_rect(d, sx, sy, swatch_size, swatch_size, 'shadow_black')
        fill_rect(d, sx + 1, sy + 1, swatch_size - 2, swatch_size - 2, color)
        # Highlight
        r, g, b = color
        hl = (min(255, r + 60), min(255, g + 60), min(255, b + 60))
        px(d, sx + 2, sy + 2, hl)

    save_png(img, 'ui/cosmetic_shop/ui_dye_palette_panel.png')


# =====================================================================
# 5. OUTFIT PRESET SAVE/LOAD UI (100x60)
# =====================================================================

def generate_outfit_preset_ui():
    """Panel for saving/loading outfit presets — 3 preset slots + buttons."""
    w, h = 100, 60
    img = Image.new('RGBA', (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Panel background
    border_rect(d, 0, 0, w, h, 'deep_magic', 'dark_rock')
    # Title bar
    fill_rect(d, 1, 1, w - 2, 10, 'deep_magic')
    fill_rect(d, 1, 11, w - 2, 1, 'dark_gold')

    # 3 preset slots
    slot_w = 28
    for i in range(3):
        sx = 5 + i * (slot_w + 4)
        sy = 15
        # Slot frame
        border_rect(d, sx, sy, slot_w, 24, 'stone_gray', 'shadow_black')
        # Mini character silhouette placeholder
        fill_rect(d, sx + 10, sy + 4, 8, 16, 'mid_gray', 80)
        fill_circle(d, sx + 14, sy + 6, 3, 'mid_gray', 100)
        # Slot number indicator
        px(d, sx + 2, sy + 2, 'gold')

    # Save button
    border_rect(d, 5, 43, 42, 12, 'forest_green', 'deep_forest')
    fill_rect(d, 7, 45, 38, 8, 'forest_green')

    # Load button
    border_rect(d, 53, 43, 42, 12, 'ocean_blue', 'deep_ocean')
    fill_rect(d, 55, 45, 38, 8, 'ocean_blue')

    save_png(img, 'ui/cosmetic_shop/ui_outfit_preset_panel.png')


# =====================================================================
# 6. PURCHASE CONFIRMATION DIALOG (120x80)
# =====================================================================

def generate_purchase_confirmation():
    """Modal dialog for confirming cosmetic purchases."""
    w, h = 120, 80
    img = Image.new('RGBA', (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Dialog background with ornate border
    fill_rect(d, 0, 0, w, h, 'shadow_black', 200)
    border_rect(d, 2, 2, w - 4, h - 4, 'magic_purple', 'dark_rock')
    # Gold inner border
    border_rect(d, 4, 4, w - 8, h - 8, 'dark_gold')
    fill_rect(d, 5, 5, w - 10, h - 10, 'dark_rock')

    # Title area
    fill_rect(d, 5, 5, w - 10, 12, 'deep_magic')
    fill_rect(d, 5, 17, w - 10, 1, 'gold')

    # Item preview slot (center)
    border_rect(d, (w - 32) // 2, 22, 32, 32, 'stone_gray', 'shadow_black')

    # Price display
    border_rect(d, 10, 58, 40, 10, 'dark_gold', 'shadow_black')
    fill_circle(d, 15, 63, 2, 'gold')
    px(d, 15, 63, 'bright_yellow')

    # Confirm button (green)
    border_rect(d, w - 58, 58, 24, 10, 'forest_green', 'deep_forest')
    # Cancel button (red)
    border_rect(d, w - 30, 58, 24, 10, 'deep_blood', 'enemy_red')

    save_png(img, 'ui/cosmetic_shop/ui_purchase_confirm.png')


# =====================================================================
# 7. RARITY SHIMMER EFFECTS (5 rarities, 6-frame spritesheets, 32x32)
# =====================================================================

def generate_rarity_shimmer():
    """Shimmer overlay spritesheets for cosmetic items by rarity.
    Each sheet: 192x32 (6 frames of 32x32), looping sparkle animation.
    """
    frames = 6
    fw, fh = 32, 32

    for rarity, theme in RARITY_THEMES.items():
        img = Image.new('RGBA', (fw * frames, fh), TRANSPARENT)
        d = ImageDraw.Draw(img)

        border_c = theme['border']
        accent_c = theme['accent']
        glow_c = theme['glow']

        for f in range(frames):
            ox = f * fw  # frame x offset

            # Frame border with rarity color
            border_rect(d, ox, 0, fw, fh, border_c)
            fill_rect(d, ox + 1, 1, fw - 2, fh - 2, 'shadow_black', 0)

            # Animated shimmer — diagonal sweep
            sweep_pos = (f * fw) // frames
            # Main sweep line
            for i in range(fh):
                sx = ox + (sweep_pos + i) % fw
                if 0 <= sx - ox < fw:
                    px(d, sx, i, glow_c, 120 - abs(i - fh // 2) * 6)

            # Sparkle dots that move per frame
            sparkle_positions = [
                (8, 6), (22, 10), (12, 22), (26, 18), (6, 14), (18, 26)
            ]
            active_sparkle = f % len(sparkle_positions)
            sx_s, sy_s = sparkle_positions[active_sparkle]
            px(d, ox + sx_s, sy_s, glow_c, 255)
            # Cross sparkle
            for dp in range(1, 3):
                a = max(0, 200 - dp * 80)
                if sx_s + dp < fw:
                    px(d, ox + sx_s + dp, sy_s, accent_c, a)
                if sx_s - dp >= 0:
                    px(d, ox + sx_s - dp, sy_s, accent_c, a)
                if sy_s + dp < fh:
                    px(d, ox + sx_s, sy_s + dp, accent_c, a)
                if sy_s - dp >= 0:
                    px(d, ox + sx_s, sy_s - dp, accent_c, a)

            # Corner glow accents
            corner_alpha = [80, 120, 160, 200, 160, 120][f]
            px(d, ox + 1, 1, accent_c, corner_alpha)
            px(d, ox + fw - 2, 1, accent_c, corner_alpha)
            px(d, ox + 1, fh - 2, accent_c, corner_alpha)
            px(d, ox + fw - 2, fh - 2, accent_c, corner_alpha)

        save_png(img, f'vfx/vfx_shimmer_{rarity}.png')


# =====================================================================
# 8. "NEW" AND "LIMITED" BADGES (20x10 each)
# =====================================================================

def generate_badges():
    """Small tag badges for shop item overlays."""
    # NEW badge — bright green
    img = Image.new('RGBA', (20, 10), TRANSPARENT)
    d = ImageDraw.Draw(img)
    fill_rect(d, 0, 0, 20, 10, 'forest_green')
    fill_rect(d, 1, 1, 18, 8, 'leaf_green')
    # N
    for y in range(2, 8):
        px(d, 3, y, 'near_white')
    px(d, 4, 3, 'near_white')
    px(d, 5, 4, 'near_white')
    for y in range(2, 8):
        px(d, 6, y, 'near_white')
    # E
    for y in range(2, 8):
        px(d, 8, y, 'near_white')
    fill_rect(d, 9, 2, 2, 1, 'near_white')
    px(d, 9, 4, 'near_white')
    fill_rect(d, 9, 7, 2, 1, 'near_white')
    # W
    for y in range(2, 8):
        px(d, 12, y, 'near_white')
    px(d, 13, 6, 'near_white')
    px(d, 14, 5, 'near_white')
    px(d, 15, 6, 'near_white')
    for y in range(2, 8):
        px(d, 16, y, 'near_white')
    save_png(img, 'ui/cosmetic_shop/badge_new.png')

    # LIMITED badge — gold/orange
    img = Image.new('RGBA', (20, 10), TRANSPARENT)
    d = ImageDraw.Draw(img)
    fill_rect(d, 0, 0, 20, 10, 'dark_gold')
    fill_rect(d, 1, 1, 18, 8, 'fire_orange')
    # Star icon on left
    px(d, 3, 3, 'bright_yellow')
    px(d, 2, 4, 'bright_yellow')
    px(d, 3, 4, 'bright_yellow')
    px(d, 4, 4, 'bright_yellow')
    px(d, 3, 5, 'bright_yellow')
    px(d, 2, 6, 'bright_yellow')
    px(d, 4, 6, 'bright_yellow')
    # "LTD" text hint
    for y in range(2, 8):
        px(d, 7, y, 'near_white')
    fill_rect(d, 8, 7, 2, 1, 'near_white')
    # T
    fill_rect(d, 10, 2, 3, 1, 'near_white')
    for y in range(3, 8):
        px(d, 11, y, 'near_white')
    # D
    for y in range(2, 8):
        px(d, 14, y, 'near_white')
    px(d, 15, 2, 'near_white')
    px(d, 16, 3, 'near_white')
    px(d, 16, 4, 'near_white')
    px(d, 16, 5, 'near_white')
    px(d, 16, 6, 'near_white')
    px(d, 15, 7, 'near_white')
    save_png(img, 'ui/cosmetic_shop/badge_limited.png')


# =====================================================================
# 9. COSMETIC SHOP NPC SPRITE (16x24, fashion merchant/tailor)
# =====================================================================

def generate_shop_npc():
    """Fashion merchant NPC — elegant outfit with measuring tape, 16x24."""
    w, h = 16, 24
    img = Image.new('RGBA', (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Hair — styled updo (purple/fancy)
    fill_rect(d, 5, 1, 6, 3, 'magic_purple')
    px(d, 6, 0, 'magic_purple')
    px(d, 7, 0, 'mana_violet')
    px(d, 8, 0, 'magic_purple')
    px(d, 9, 0, 'magic_purple')
    # Hair pin
    px(d, 10, 1, 'gold')
    px(d, 10, 0, 'bright_yellow')

    # Face
    fill_rect(d, 6, 3, 4, 4, 'sand')
    # Eyes
    px(d, 7, 4, 'deep_ocean')
    px(d, 9, 4, 'deep_ocean')
    # Mouth
    px(d, 8, 6, 'ember')

    # Collar / ruffled neckline
    fill_rect(d, 5, 7, 6, 1, 'near_white')
    px(d, 4, 7, 'pale_gray')
    px(d, 11, 7, 'pale_gray')

    # Torso — elegant vest/jacket
    fill_rect(d, 5, 8, 6, 6, 'deep_magic')
    fill_rect(d, 6, 8, 4, 6, 'magic_purple')
    # Gold buttons
    px(d, 8, 9, 'gold')
    px(d, 8, 11, 'gold')
    px(d, 8, 13, 'gold')
    # Lapel details
    px(d, 5, 8, 'mana_violet')
    px(d, 10, 8, 'mana_violet')

    # Arms
    fill_rect(d, 3, 8, 2, 6, 'deep_magic')
    fill_rect(d, 11, 8, 2, 6, 'deep_magic')
    # Hands
    px(d, 3, 14, 'sand')
    px(d, 12, 14, 'sand')

    # Measuring tape draped over shoulder (yellow accent)
    px(d, 4, 8, 'bright_yellow')
    px(d, 4, 9, 'gold')
    px(d, 4, 10, 'bright_yellow')
    px(d, 4, 11, 'gold')
    px(d, 4, 12, 'bright_yellow')
    px(d, 3, 13, 'gold')

    # Skirt/lower garment
    fill_rect(d, 5, 14, 6, 4, 'deep_magic')
    fill_rect(d, 4, 16, 8, 2, 'deep_magic')
    # Trim
    fill_rect(d, 4, 17, 8, 1, 'dark_gold')

    # Legs/feet
    fill_rect(d, 5, 18, 2, 4, 'dark_rock')
    fill_rect(d, 9, 18, 2, 4, 'dark_rock')
    # Shoes
    fill_rect(d, 4, 22, 3, 2, 'deep_magic')
    fill_rect(d, 9, 22, 3, 2, 'deep_magic')
    px(d, 4, 22, 'dark_gold')
    px(d, 11, 22, 'dark_gold')

    save_png(img, 'sprites/npcs/char_npc_tailor.png')


# =====================================================================
# 10. PORTRAIT FRAME COLLECTION (12 frames, 32x32 each)
# Unlockable borders for player profile portraits
# =====================================================================

def generate_portrait_frames():
    """12 unique portrait frames — ornamental borders around a 20x20 inner area."""
    fw, fh = 32, 32
    inner_x, inner_y = 6, 6
    inner_w, inner_h = 20, 20

    frame_designs = {
        'basic': {
            'border': 'stone_gray', 'accent': 'mid_gray',
            'corner': None, 'style': 'simple',
        },
        'iron': {
            'border': 'mid_gray', 'accent': 'light_stone',
            'corner': 'stone_gray', 'style': 'riveted',
        },
        'bronze': {
            'border': 'rich_earth', 'accent': 'dirt',
            'corner': 'sand', 'style': 'ornate',
        },
        'silver': {
            'border': 'light_stone', 'accent': 'pale_gray',
            'corner': 'near_white', 'style': 'ornate',
        },
        'gold': {
            'border': 'dark_gold', 'accent': 'gold',
            'corner': 'bright_yellow', 'style': 'ornate',
        },
        'emerald': {
            'border': 'deep_forest', 'accent': 'forest_green',
            'corner': 'leaf_green', 'style': 'gemmed',
        },
        'sapphire': {
            'border': 'deep_ocean', 'accent': 'ocean_blue',
            'corner': 'sky_blue', 'style': 'gemmed',
        },
        'ruby': {
            'border': 'deep_blood', 'accent': 'enemy_red',
            'corner': 'bright_red', 'style': 'gemmed',
        },
        'amethyst': {
            'border': 'deep_magic', 'accent': 'magic_purple',
            'corner': 'mana_violet', 'style': 'gemmed',
        },
        'celestial': {
            'border': 'deep_ocean', 'accent': 'sky_blue',
            'corner': 'shimmer', 'style': 'starry',
        },
        'infernal': {
            'border': 'shadow_black', 'accent': 'enemy_red',
            'corner': 'fire_orange', 'style': 'spiked',
        },
        'legendary': {
            'border': 'dark_gold', 'accent': 'gold',
            'corner': 'bright_yellow', 'style': 'legendary',
        },
    }

    for name, design in frame_designs.items():
        img = Image.new('RGBA', (fw, fh), TRANSPARENT)
        d = ImageDraw.Draw(img)

        bc = design['border']
        ac = design['accent']
        cc = design['corner']
        style = design['style']

        # Outer border (2px)
        fill_rect(d, 0, 0, fw, fh, bc)
        fill_rect(d, 1, 1, fw - 2, fh - 2, ac)
        fill_rect(d, 2, 2, fw - 4, fh - 4, bc)

        # Inner area (transparent for portrait)
        fill_rect(d, inner_x, inner_y, inner_w, inner_h, 'shadow_black', 40)

        # Inner border
        fill_rect(d, inner_x - 1, inner_y - 1, inner_w + 2, 1, bc)
        fill_rect(d, inner_x - 1, inner_y + inner_h, inner_w + 2, 1, bc)
        fill_rect(d, inner_x - 1, inner_y, 1, inner_h, bc)
        fill_rect(d, inner_x + inner_w, inner_y, 1, inner_h, bc)

        if style == 'simple':
            pass  # Minimal frame

        elif style == 'riveted':
            # Corner rivets
            for rx, ry in [(2, 2), (fw - 4, 2), (2, fh - 4), (fw - 4, fh - 4)]:
                fill_rect(d, rx, ry, 2, 2, cc if cc else ac)

        elif style == 'ornate':
            # Corner flourishes
            if cc:
                for cx, cy in [(0, 0), (fw - 4, 0), (0, fh - 4), (fw - 4, fh - 4)]:
                    fill_rect(d, cx, cy, 4, 1, cc)
                    fill_rect(d, cx, cy, 1, 4, cc)
                    px(d, cx + 1, cy + 1, cc)
            # Mid-edge accents
            mx = fw // 2
            my = fh // 2
            px(d, mx, 0, cc if cc else ac)
            px(d, mx, fh - 1, cc if cc else ac)
            px(d, 0, my, cc if cc else ac)
            px(d, fw - 1, my, cc if cc else ac)

        elif style == 'gemmed':
            # Gem at each edge center
            for gx, gy in [(fw // 2, 1), (fw // 2, fh - 2),
                           (1, fh // 2), (fw - 2, fh // 2)]:
                px(d, gx, gy, cc if cc else ac)
                px(d, gx - 1, gy, ac)
                px(d, gx + 1, gy, ac)
                px(d, gx, gy - 1, ac)
                px(d, gx, gy + 1, ac)
            # Corner brackets
            for cx, cy in [(0, 0), (fw - 3, 0), (0, fh - 3), (fw - 3, fh - 3)]:
                fill_rect(d, cx, cy, 3, 1, cc if cc else ac)
                fill_rect(d, cx, cy, 1, 3, cc if cc else ac)

        elif style == 'starry':
            # Sparkle dots scattered on border
            sparkle_positions = [(4, 1), (12, 0), (20, 1), (28, 2),
                                 (1, 8), (1, 20), (fw - 2, 10), (fw - 2, 22),
                                 (8, fh - 2), (18, fh - 1), (26, fh - 2)]
            for sx, sy in sparkle_positions:
                if 0 <= sx < fw and 0 <= sy < fh:
                    px(d, sx, sy, 'shimmer')
            # Corner stars
            if cc:
                for cx, cy in [(2, 2), (fw - 3, 2), (2, fh - 3), (fw - 3, fh - 3)]:
                    px(d, cx, cy, cc)

        elif style == 'spiked':
            # Spiky protrusions on corners
            for cx, cy, dx_dir, dy_dir in [(0, 0, 1, 1), (fw - 1, 0, -1, 1),
                                            (0, fh - 1, 1, -1), (fw - 1, fh - 1, -1, -1)]:
                for i in range(3):
                    sx = cx + dx_dir * i
                    sy = cy + dy_dir * i
                    if 0 <= sx < fw and 0 <= sy < fh:
                        px(d, sx, sy, cc if cc else ac)
            # Fire accent on top edge
            for fx in range(4, fw - 4, 4):
                px(d, fx, 0, 'fire_orange')
                px(d, fx + 1, 0, 'ember')

        elif style == 'legendary':
            # Full ornate — gold with glow
            # Corner L-brackets
            for cx, cy in [(0, 0), (fw - 5, 0), (0, fh - 5), (fw - 5, fh - 5)]:
                fill_rect(d, cx, cy, 5, 2, 'bright_yellow')
                fill_rect(d, cx, cy, 2, 5, 'bright_yellow')
            # Edge gems
            for gx, gy in [(fw // 2, 0), (fw // 2, fh - 1),
                           (0, fh // 2), (fw - 1, fh // 2)]:
                px(d, gx, gy, 'pale_highlight')
                if gx > 0:
                    px(d, gx - 1, gy, 'bright_yellow')
                if gx < fw - 1:
                    px(d, gx + 1, gy, 'bright_yellow')
            # Inner glow border
            fill_rect(d, inner_x - 1, inner_y - 1, inner_w + 2, 1, 'gold')
            fill_rect(d, inner_x - 1, inner_y + inner_h, inner_w + 2, 1, 'gold')
            fill_rect(d, inner_x - 1, inner_y, 1, inner_h, 'gold')
            fill_rect(d, inner_x + inner_w, inner_y, 1, inner_h, 'gold')

        save_png(img, f'ui/cosmetic_shop/portrait_frame_{name}.png')


# =====================================================================
# 11. CATEGORY TAB VARIANTS (selected/unselected states, 24x16)
# =====================================================================

def generate_category_tabs():
    """Selected and unselected tab states for the shop category bar."""
    tw, th = 24, 16

    # Unselected tab
    img = Image.new('RGBA', (tw, th), TRANSPARENT)
    d = ImageDraw.Draw(img)
    fill_rect(d, 0, 2, tw, th - 2, 'dark_rock')
    fill_rect(d, 1, 3, tw - 2, th - 4, 'stone_gray', 80)
    fill_rect(d, 0, th - 1, tw, 1, 'deep_magic')
    save_png(img, 'ui/cosmetic_shop/ui_tab_unselected.png')

    # Selected tab
    img = Image.new('RGBA', (tw, th), TRANSPARENT)
    d = ImageDraw.Draw(img)
    fill_rect(d, 0, 0, tw, th, 'deep_magic')
    fill_rect(d, 1, 1, tw - 2, th - 2, 'magic_purple', 180)
    fill_rect(d, 0, 0, tw, 1, 'gold')
    fill_rect(d, 0, 0, 1, th, 'dark_gold')
    fill_rect(d, tw - 1, 0, 1, th, 'dark_gold')
    save_png(img, 'ui/cosmetic_shop/ui_tab_selected.png')


# =====================================================================
# 12. SHOP ITEM SLOT FRAME (32x32)
# Reusable frame for item grid display
# =====================================================================

def generate_item_slot():
    """Empty item slot frame for the shop grid — 32x32."""
    img = Image.new('RGBA', (32, 32), TRANSPARENT)
    d = ImageDraw.Draw(img)
    border_rect(d, 0, 0, 32, 32, 'stone_gray', 'shadow_black')
    border_rect(d, 1, 1, 30, 30, 'dark_rock')
    fill_rect(d, 2, 2, 28, 28, 'shadow_black', 160)
    # Subtle corner highlights
    px(d, 2, 2, 'mid_gray')
    px(d, 29, 2, 'mid_gray')
    px(d, 2, 29, 'mid_gray')
    px(d, 29, 29, 'mid_gray')
    save_png(img, 'ui/cosmetic_shop/ui_item_slot.png')

    # Hovered variant
    img = Image.new('RGBA', (32, 32), TRANSPARENT)
    d = ImageDraw.Draw(img)
    border_rect(d, 0, 0, 32, 32, 'gold', 'shadow_black')
    border_rect(d, 1, 1, 30, 30, 'dark_gold')
    fill_rect(d, 2, 2, 28, 28, 'shadow_black', 120)
    px(d, 2, 2, 'bright_yellow')
    px(d, 29, 2, 'bright_yellow')
    px(d, 2, 29, 'bright_yellow')
    px(d, 29, 29, 'bright_yellow')
    save_png(img, 'ui/cosmetic_shop/ui_item_slot_hover.png')

    # Selected variant
    img = Image.new('RGBA', (32, 32), TRANSPARENT)
    d = ImageDraw.Draw(img)
    border_rect(d, 0, 0, 32, 32, 'mana_violet', 'shadow_black')
    border_rect(d, 1, 1, 30, 30, 'magic_purple')
    fill_rect(d, 2, 2, 28, 28, 'deep_magic', 100)
    px(d, 2, 2, 'spell_glow')
    px(d, 29, 2, 'spell_glow')
    px(d, 2, 29, 'spell_glow')
    px(d, 29, 29, 'spell_glow')
    save_png(img, 'ui/cosmetic_shop/ui_item_slot_selected.png')


# =====================================================================
# 13. CURRENCY/PRICE DISPLAY ELEMENTS
# =====================================================================

def generate_currency_icons():
    """Small currency icons for price tags — premium gem and gold coin."""
    # Gold coin (10x10)
    img = Image.new('RGBA', (10, 10), TRANSPARENT)
    d = ImageDraw.Draw(img)
    fill_circle(d, 5, 5, 4, 'dark_gold')
    fill_circle(d, 5, 5, 3, 'gold')
    fill_circle(d, 5, 5, 2, 'bright_yellow')
    px(d, 4, 4, 'pale_highlight')
    px(d, 5, 5, 'gold')
    save_png(img, 'ui/cosmetic_shop/icon_currency_coin.png')

    # Premium gem (10x10)
    img = Image.new('RGBA', (10, 10), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Diamond shape
    px(d, 5, 1, 'mana_violet')
    fill_rect(d, 4, 2, 3, 1, 'mana_violet')
    fill_rect(d, 3, 3, 5, 1, 'magic_purple')
    fill_rect(d, 2, 4, 7, 1, 'magic_purple')
    fill_rect(d, 3, 5, 5, 1, 'deep_magic')
    fill_rect(d, 4, 6, 3, 1, 'deep_magic')
    px(d, 5, 7, 'deep_magic')
    # Highlight
    px(d, 4, 3, 'spell_glow')
    px(d, 5, 2, 'spell_glow')
    save_png(img, 'ui/cosmetic_shop/icon_currency_gem.png')


# =====================================================================
# MAIN — generate all assets
# =====================================================================

def main():
    print('PIX-338: Generating cosmetic shop & character customization art assets...')
    print()

    print('[1/13] Cosmetic shop panel (220x200)')
    generate_shop_panel()

    print('[2/13] Category icons (7x 16x16)')
    generate_category_icons()

    print('[3/13] Character preview / fitting room (120x160)')
    generate_fitting_room()

    print('[4/13] Dye color swatches (24x 10x10 + palette panel)')
    generate_dye_swatches()

    print('[5/13] Outfit preset save/load UI (100x60)')
    generate_outfit_preset_ui()

    print('[6/13] Purchase confirmation dialog (120x80)')
    generate_purchase_confirmation()

    print('[7/13] Rarity shimmer effects (5x 192x32 spritesheets)')
    generate_rarity_shimmer()

    print('[8/13] New & Limited badges (20x10 each)')
    generate_badges()

    print('[9/13] Cosmetic shop NPC sprite (16x24)')
    generate_shop_npc()

    print('[10/13] Portrait frame collection (12x 32x32)')
    generate_portrait_frames()

    print('[11/13] Category tab states (24x16)')
    generate_category_tabs()

    print('[12/13] Item slot frames (32x32, 3 states)')
    generate_item_slot()

    print('[13/13] Currency icons (10x10)')
    generate_currency_icons()

    print()
    print('Done! All cosmetic shop assets generated.')


if __name__ == '__main__':
    main()
