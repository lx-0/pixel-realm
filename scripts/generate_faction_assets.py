#!/usr/bin/env python3
"""
PIX-313: Generate reputation and faction system art assets.

Creates:
- 16x16 faction emblems (4 factions) to complement existing 32x32 versions
- Faction shop UI frame/panel (160x180)
- Faction-themed reward item sprites (4+ per faction, 16x16 icons)

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

def draw_diamond(draw, cx, cy, r, color, alpha=255):
    """Draw a diamond (rotated square) shape."""
    if isinstance(color, str):
        color = PALETTE[color]
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if abs(dx) + abs(dy) <= r:
                draw.point((cx + dx, cy + dy), fill=(*color, alpha))

def border_rect(draw, x, y, w, h, border_color, fill_color=None, alpha=255):
    """Draw bordered rectangle."""
    fill_rect(draw, x, y, w, h, border_color, alpha)
    if fill_color:
        fill_rect(draw, x + 1, y + 1, w - 2, h - 2, fill_color, alpha)

def save_png(img, rel_path):
    full = os.path.join(ASSET_DIR, rel_path)
    ensure_dir(os.path.dirname(full))
    img.save(full)
    print(f'  \u2713 {rel_path} ({img.size[0]}x{img.size[1]})')


# Faction color themes
FACTIONS = {
    'merchants': {
        'primary': 'gold',
        'secondary': 'dark_gold',
        'accent': 'pale_highlight',
        'dark': 'deep_soil',
        'mid': 'desert_gold',
        'light': 'pale_sand',
    },
    'mages': {
        'primary': 'mana_violet',
        'secondary': 'magic_purple',
        'accent': 'spell_glow',
        'dark': 'deep_magic',
        'mid': 'sky_blue',
        'light': 'shimmer',
    },
    'nature': {
        'primary': 'leaf_green',
        'secondary': 'forest_green',
        'accent': 'bright_grass',
        'dark': 'deep_forest',
        'mid': 'light_foliage',
        'light': 'pale_sand',
    },
    'shadow': {
        'primary': 'enemy_red',
        'secondary': 'deep_blood',
        'accent': 'bright_red',
        'dark': 'shadow_black',
        'mid': 'dark_rock',
        'light': 'stone_gray',
    },
}

# =====================================================================
# 1. 16x16 FACTION EMBLEMS
# Miniaturized versions of the 32x32 emblems for UI use
# =====================================================================

def generate_emblem_merchants_16():
    """Merchants Guild — gold coin with scales."""
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Coin circle
    fill_circle(d, 7, 7, 6, 'dark_gold')
    fill_circle(d, 7, 7, 5, 'gold')
    fill_circle(d, 7, 7, 4, 'bright_yellow')
    # Scales of trade (balance beam)
    fill_rect(d, 4, 6, 8, 1, 'dark_gold')   # horizontal beam
    px(d, 7, 5, 'dark_gold')                 # pivot top
    px(d, 8, 5, 'dark_gold')
    # Left pan
    px(d, 4, 7, 'deep_soil')
    px(d, 5, 7, 'deep_soil')
    px(d, 3, 8, 'deep_soil')
    px(d, 4, 8, 'dark_gold')
    px(d, 5, 8, 'dark_gold')
    px(d, 6, 8, 'deep_soil')
    # Right pan
    px(d, 9, 7, 'deep_soil')
    px(d, 10, 7, 'deep_soil')
    px(d, 9, 8, 'dark_gold')
    px(d, 10, 8, 'dark_gold')
    px(d, 8, 8, 'deep_soil')
    px(d, 11, 8, 'deep_soil')
    # Highlight
    px(d, 5, 4, 'pale_highlight')
    px(d, 6, 3, 'pale_highlight')
    return img

def generate_emblem_mages_16():
    """Mages Circle — arcane star/eye."""
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Outer circle
    fill_circle(d, 7, 7, 6, 'deep_magic')
    fill_circle(d, 7, 7, 5, 'magic_purple')
    # Inner arcane eye
    fill_circle(d, 7, 7, 3, 'mana_violet')
    fill_circle(d, 7, 7, 1, 'spell_glow')
    px(d, 7, 7, 'near_white')
    # Star points (4 cardinal)
    px(d, 7, 1, 'spell_glow')
    px(d, 7, 2, 'mana_violet')
    px(d, 7, 12, 'spell_glow')
    px(d, 7, 11, 'mana_violet')
    px(d, 1, 7, 'spell_glow')
    px(d, 2, 7, 'mana_violet')
    px(d, 13, 7, 'spell_glow')
    px(d, 12, 7, 'mana_violet')
    # Diagonal accents
    px(d, 3, 3, 'spell_glow')
    px(d, 11, 3, 'spell_glow')
    px(d, 3, 11, 'spell_glow')
    px(d, 11, 11, 'spell_glow')
    return img

def generate_emblem_nature_16():
    """Nature Wardens — leaf/tree icon."""
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Circle background
    fill_circle(d, 7, 7, 6, 'deep_forest')
    fill_circle(d, 7, 7, 5, 'forest_green')
    # Tree trunk
    fill_rect(d, 7, 8, 2, 5, 'rich_earth')
    px(d, 7, 13, 'dirt')
    # Canopy — layered triangular
    fill_rect(d, 5, 5, 6, 1, 'leaf_green')
    fill_rect(d, 4, 6, 8, 1, 'bright_grass')
    fill_rect(d, 5, 7, 6, 1, 'leaf_green')
    fill_rect(d, 6, 3, 4, 2, 'leaf_green')
    px(d, 7, 2, 'bright_grass')
    px(d, 8, 2, 'bright_grass')
    # Leaf highlight
    px(d, 5, 5, 'light_foliage')
    px(d, 6, 3, 'light_foliage')
    return img

def generate_emblem_shadow_16():
    """Shadow Order — dagger/skull icon."""
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Dark circle
    fill_circle(d, 7, 7, 6, 'shadow_black')
    fill_circle(d, 7, 7, 5, 'dark_rock')
    # Dagger blade (vertical)
    fill_rect(d, 7, 2, 2, 8, 'light_stone')
    fill_rect(d, 7, 2, 2, 2, 'near_white')     # tip highlight
    px(d, 7, 1, 'pale_gray')                     # point
    # Cross guard
    fill_rect(d, 5, 9, 6, 1, 'enemy_red')
    fill_rect(d, 5, 10, 6, 1, 'deep_blood')
    # Handle
    fill_rect(d, 7, 11, 2, 2, 'stone_gray')
    px(d, 7, 13, 'mid_gray')
    px(d, 8, 13, 'mid_gray')
    # Red accents
    px(d, 4, 4, 'enemy_red')
    px(d, 11, 4, 'enemy_red')
    return img

def generate_all_emblems_16():
    """Generate 16x16 faction emblems."""
    print('\n=== 16x16 Faction Emblems ===')
    generators = {
        'merchants': generate_emblem_merchants_16,
        'mages': generate_emblem_mages_16,
        'nature': generate_emblem_nature_16,
        'shadow': generate_emblem_shadow_16,
    }
    for name, gen in generators.items():
        img = gen()
        save_png(img, f'ui/icons/icon_faction_emblem_{name}_sm.png')


# =====================================================================
# 2. FACTION SHOP UI FRAME/PANEL (160x180)
# Themed shop panel with faction crest area, item slots, and buy button
# =====================================================================

def generate_shop_panel(faction_name):
    """Generate a faction-themed shop panel."""
    W, H = 160, 180
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)
    fc = FACTIONS[faction_name]

    # Outer border
    border_rect(d, 0, 0, W, H, fc['dark'], fc['mid'])
    # Inner panel
    fill_rect(d, 2, 2, W - 4, H - 4, 'dark_rock')

    # Header bar (faction-colored)
    fill_rect(d, 2, 2, W - 4, 16, fc['secondary'])
    fill_rect(d, 3, 3, W - 6, 14, fc['primary'])
    # Header highlight line
    fill_rect(d, 3, 3, W - 6, 1, fc['accent'])

    # Faction emblem area (32x32 placeholder in header)
    emblem_x, emblem_y = 4, 20
    border_rect(d, emblem_x, emblem_y, 34, 34, fc['dark'], 'shadow_black')
    # Simple emblem representation
    fill_circle(d, emblem_x + 17, emblem_y + 17, 12, fc['secondary'])
    fill_circle(d, emblem_x + 17, emblem_y + 17, 10, fc['primary'])
    fill_circle(d, emblem_x + 17, emblem_y + 17, 4, fc['accent'])

    # "SHOP" text area (to the right of emblem)
    fill_rect(d, 42, 24, 112, 10, fc['dark'])
    # Decorative dots representing text
    for i in range(4):
        fill_rect(d, 46 + i * 12, 27, 8, 4, fc['accent'])

    # Reputation requirement bar under header
    fill_rect(d, 42, 38, 112, 6, 'shadow_black')
    fill_rect(d, 43, 39, 80, 4, fc['primary'])    # filled portion
    # Star markers
    for i in range(5):
        px(d, 44 + i * 20, 39, fc['accent'])
        px(d, 44 + i * 20, 42, fc['accent'])

    # Divider line
    fill_rect(d, 4, 56, W - 8, 1, fc['dark'])
    fill_rect(d, 4, 57, W - 8, 1, fc['secondary'])

    # Item grid (4 columns x 4 rows of 32x32 slots)
    grid_x, grid_y = 8, 62
    slot_size = 34
    slot_gap = 2
    for row in range(4):
        for col in range(4):
            sx = grid_x + col * (slot_size + slot_gap)
            sy = grid_y + row * (slot_size + slot_gap)
            # Slot border
            border_rect(d, sx, sy, slot_size, slot_size, fc['dark'], 'shadow_black')
            # Inner slot highlight (top-left)
            px(d, sx + 1, sy + 1, 'stone_gray')
            # Inner slot shadow (bottom-right)
            px(d, sx + slot_size - 2, sy + slot_size - 2, 'dark_rock')

    # Bottom info area
    info_y = grid_y + 4 * (slot_size + slot_gap) + 4
    # Price/description area
    fill_rect(d, 4, info_y, W - 8, 14, 'shadow_black')
    # Gold coin icon placeholder
    fill_circle(d, 12, info_y + 7, 4, 'gold')
    fill_circle(d, 12, info_y + 7, 3, 'bright_yellow')
    px(d, 11, info_y + 5, 'pale_highlight')
    # Price bar
    fill_rect(d, 20, info_y + 3, 50, 8, 'dark_rock')

    # Buy button
    btn_y = info_y + 18
    border_rect(d, 4, btn_y, W - 8, 14, fc['dark'], fc['secondary'])
    fill_rect(d, 5, btn_y + 1, W - 10, 2, fc['accent'])   # button highlight

    # Close button (top right corner X)
    px(d, W - 10, 5, 'enemy_red')
    px(d, W - 9, 6, 'enemy_red')
    px(d, W - 8, 7, 'enemy_red')
    px(d, W - 8, 5, 'enemy_red')
    px(d, W - 9, 6, 'enemy_red')
    px(d, W - 10, 7, 'enemy_red')

    # Corner decorations (faction-colored corner accents)
    for corner in [(2, 2), (W - 6, 2), (2, H - 6), (W - 6, H - 6)]:
        cx, cy = corner
        px(d, cx, cy, fc['accent'])
        px(d, cx + 1, cy, fc['accent'])
        px(d, cx, cy + 1, fc['accent'])

    return img

def generate_all_shop_panels():
    """Generate faction shop panels."""
    print('\n=== Faction Shop UI Panels ===')
    for name in FACTIONS:
        img = generate_shop_panel(name)
        save_png(img, f'ui/faction/ui_panel_faction_shop_{name}.png')


# =====================================================================
# 3. FACTION-THEMED REWARD ITEM SPRITES (16x16 icons)
# 4+ exclusive rewards per faction = 16+ items total
# =====================================================================

def draw_sword_icon(d, color_blade, color_guard, color_handle):
    """Generic sword icon at 16x16."""
    # Blade (diagonal)
    px(d, 11, 2, color_blade)
    px(d, 10, 3, color_blade)
    px(d, 9, 4, color_blade)
    px(d, 8, 5, color_blade)
    px(d, 7, 6, color_blade)
    px(d, 6, 7, color_blade)
    # Blade width
    px(d, 12, 3, color_blade)
    px(d, 11, 4, color_blade)
    px(d, 10, 5, color_blade)
    px(d, 9, 6, color_blade)
    px(d, 8, 7, color_blade)
    # Tip highlight
    px(d, 12, 2, 'near_white')
    # Guard
    px(d, 5, 8, color_guard)
    px(d, 6, 8, color_guard)
    px(d, 7, 8, color_guard)
    px(d, 5, 9, color_guard)
    px(d, 8, 8, color_guard)
    # Handle
    px(d, 4, 9, color_handle)
    px(d, 3, 10, color_handle)
    px(d, 4, 10, color_handle)
    # Pommel
    px(d, 2, 11, color_guard)
    px(d, 3, 11, color_guard)

def draw_ring_icon(d, color_band, color_gem):
    """Ring icon at 16x16."""
    # Band (oval)
    for pos in [(6,5),(7,4),(8,4),(9,4),(10,5),(10,6),(10,7),(9,8),(8,9),(7,9),(6,8),(6,7),(6,6)]:
        px(d, pos[0], pos[1] + 2, color_band)
    # Gem setting
    px(d, 7, 5, color_gem)
    px(d, 8, 5, color_gem)
    px(d, 7, 6, color_gem)
    px(d, 8, 6, color_gem)
    # Gem highlight
    px(d, 7, 5, 'near_white')

def draw_cape_icon(d, color_main, color_trim, color_clasp):
    """Cape/cloak icon at 16x16."""
    # Clasp
    px(d, 7, 2, color_clasp)
    px(d, 8, 2, color_clasp)
    # Top edge
    fill_rect(d, 5, 3, 6, 1, color_trim)
    # Cape body
    fill_rect(d, 4, 4, 8, 2, color_main)
    fill_rect(d, 3, 6, 10, 2, color_main)
    fill_rect(d, 3, 8, 10, 2, color_main)
    fill_rect(d, 4, 10, 8, 2, color_main)
    # Bottom fringe
    for i in range(4):
        px(d, 4 + i * 2, 12, color_trim)
        px(d, 5 + i * 2, 12, color_main)
    px(d, 4, 13, color_trim)
    px(d, 6, 13, color_trim)
    px(d, 8, 13, color_trim)
    px(d, 10, 13, color_trim)
    # Fold/shadow
    fill_rect(d, 5, 5, 1, 6, color_trim)

def draw_amulet_icon(d, color_chain, color_gem, color_setting):
    """Amulet/pendant icon at 16x16."""
    # Chain
    px(d, 5, 2, color_chain)
    px(d, 6, 3, color_chain)
    px(d, 10, 2, color_chain)
    px(d, 9, 3, color_chain)
    px(d, 7, 3, color_chain)
    px(d, 8, 3, color_chain)
    # Setting frame
    border_rect(d, 5, 5, 6, 6, color_setting, 'shadow_black')
    # Gem (centered)
    fill_rect(d, 6, 6, 4, 4, color_gem)
    # Gem highlight
    px(d, 6, 6, 'near_white')
    px(d, 7, 6, color_setting)
    # Bottom point
    px(d, 7, 11, color_setting)
    px(d, 8, 11, color_setting)
    px(d, 7, 12, color_setting)

def draw_scroll_icon(d, color_paper, color_ribbon, color_seal):
    """Scroll icon at 16x16."""
    # Paper roll
    fill_rect(d, 4, 3, 8, 10, color_paper)
    # Top roll
    fill_rect(d, 3, 2, 10, 2, color_paper)
    px(d, 3, 2, color_ribbon)
    px(d, 12, 2, color_ribbon)
    # Bottom roll
    fill_rect(d, 3, 12, 10, 2, color_paper)
    px(d, 3, 13, color_ribbon)
    px(d, 12, 13, color_ribbon)
    # Text lines
    for row in range(4):
        fill_rect(d, 5, 4 + row * 2, 6, 1, 'mid_gray')
    # Seal
    fill_circle(d, 8, 10, 2, color_seal)
    px(d, 8, 9, 'near_white')

def draw_potion_icon(d, color_liquid, color_bottle, color_cork):
    """Potion icon at 16x16."""
    # Cork
    fill_rect(d, 7, 2, 2, 2, color_cork)
    # Bottle neck
    fill_rect(d, 7, 4, 2, 2, color_bottle)
    # Bottle body
    fill_rect(d, 5, 6, 6, 6, color_bottle)
    fill_rect(d, 6, 5, 4, 1, color_bottle)
    # Liquid inside
    fill_rect(d, 6, 7, 4, 4, color_liquid)
    # Highlight
    px(d, 6, 7, 'near_white')
    px(d, 6, 8, color_bottle)
    # Bottom
    fill_rect(d, 5, 12, 6, 1, color_bottle)

def draw_shield_icon(d, color_face, color_rim, color_emblem):
    """Shield icon at 16x16."""
    # Shield body (kite shape)
    fill_rect(d, 4, 2, 8, 2, color_rim)
    fill_rect(d, 3, 4, 10, 2, color_rim)
    fill_rect(d, 4, 6, 8, 2, color_rim)
    fill_rect(d, 5, 8, 6, 2, color_rim)
    fill_rect(d, 6, 10, 4, 2, color_rim)
    px(d, 7, 12, color_rim)
    px(d, 8, 12, color_rim)
    # Inner face
    fill_rect(d, 5, 3, 6, 1, color_face)
    fill_rect(d, 4, 4, 8, 2, color_face)
    fill_rect(d, 5, 6, 6, 2, color_face)
    fill_rect(d, 6, 8, 4, 2, color_face)
    fill_rect(d, 7, 10, 2, 1, color_face)
    # Central emblem
    px(d, 7, 5, color_emblem)
    px(d, 8, 5, color_emblem)
    px(d, 7, 6, color_emblem)
    px(d, 8, 6, color_emblem)
    # Highlight
    px(d, 5, 3, 'near_white')
    px(d, 4, 4, 'pale_gray')


# === MERCHANTS GUILD REWARDS ===
def generate_merchants_rewards():
    """Golden trade items: golden sword, merchant ring, trade scroll, gold potion."""
    items = []

    # 1: Golden Scales Blade (gold-hilted sword)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_sword_icon(d, 'bright_yellow', 'gold', 'dark_gold')
    items.append(('icon_reward_merchants_blade.png', img))

    # 2: Ring of Commerce
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_ring_icon(d, 'gold', 'bright_yellow')
    items.append(('icon_reward_merchants_ring.png', img))

    # 3: Merchant's Charter (scroll)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_scroll_icon(d, 'pale_sand', 'dark_gold', 'gold')
    items.append(('icon_reward_merchants_charter.png', img))

    # 4: Gilded Tonic (gold potion)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_potion_icon(d, 'bright_yellow', 'desert_gold', 'dark_gold')
    items.append(('icon_reward_merchants_tonic.png', img))

    # 5: Trader's Cloak
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_cape_icon(d, 'desert_gold', 'gold', 'bright_yellow')
    items.append(('icon_reward_merchants_cloak.png', img))

    return items

# === MAGES CIRCLE REWARDS ===
def generate_mages_rewards():
    """Arcane magical items: spell blade, arcane ring, grimoire, mana potion."""
    items = []

    # 1: Arcane Edge (purple/blue sword)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_sword_icon(d, 'spell_glow', 'mana_violet', 'magic_purple')
    items.append(('icon_reward_mages_blade.png', img))

    # 2: Band of Insight (arcane ring)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_ring_icon(d, 'mana_violet', 'spell_glow')
    items.append(('icon_reward_mages_ring.png', img))

    # 3: Grimoire of the Circle (magic scroll)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_scroll_icon(d, 'shimmer', 'magic_purple', 'mana_violet')
    items.append(('icon_reward_mages_grimoire.png', img))

    # 4: Distilled Mana (purple potion)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_potion_icon(d, 'mana_violet', 'sky_blue', 'deep_magic')
    items.append(('icon_reward_mages_elixir.png', img))

    # 5: Archmage Pendant (amulet)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_amulet_icon(d, 'light_stone', 'spell_glow', 'mana_violet')
    items.append(('icon_reward_mages_pendant.png', img))

    return items

# === NATURE WARDENS REWARDS ===
def generate_nature_rewards():
    """Natural/druidic items: vine blade, nature ring, herbal tome, growth potion."""
    items = []

    # 1: Thornblade (green vine sword)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_sword_icon(d, 'bright_grass', 'leaf_green', 'forest_green')
    items.append(('icon_reward_nature_blade.png', img))

    # 2: Seedling Ring
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_ring_icon(d, 'forest_green', 'bright_grass')
    items.append(('icon_reward_nature_ring.png', img))

    # 3: Druid's Tome
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_scroll_icon(d, 'light_foliage', 'deep_forest', 'leaf_green')
    items.append(('icon_reward_nature_tome.png', img))

    # 4: Sap of Renewal (green potion)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_potion_icon(d, 'leaf_green', 'forest_green', 'rich_earth')
    items.append(('icon_reward_nature_sap.png', img))

    # 5: Warden's Bark Shield
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_shield_icon(d, 'forest_green', 'rich_earth', 'bright_grass')
    items.append(('icon_reward_nature_shield.png', img))

    return items

# === SHADOW ORDER REWARDS ===
def generate_shadow_rewards():
    """Dark/stealth items: shadow dagger, assassin ring, cipher, shadow veil."""
    items = []

    # 1: Nightfang Dagger (dark blade)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_sword_icon(d, 'light_stone', 'enemy_red', 'dark_rock')
    items.append(('icon_reward_shadow_blade.png', img))

    # 2: Phantom Band (dark ring with red gem)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_ring_icon(d, 'stone_gray', 'bright_red')
    items.append(('icon_reward_shadow_ring.png', img))

    # 3: Shadow Cipher (encoded scroll)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_scroll_icon(d, 'dark_rock', 'shadow_black', 'enemy_red')
    items.append(('icon_reward_shadow_cipher.png', img))

    # 4: Venom Extract (dark red potion)
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_potion_icon(d, 'enemy_red', 'dark_rock', 'shadow_black')
    items.append(('icon_reward_shadow_venom.png', img))

    # 5: Umbral Cloak
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_cape_icon(d, 'dark_rock', 'enemy_red', 'stone_gray')
    items.append(('icon_reward_shadow_cloak.png', img))

    return items

def generate_all_rewards():
    """Generate all faction reward items."""
    print('\n=== Faction Reward Items ===')
    all_items = []
    all_items.extend(generate_merchants_rewards())
    all_items.extend(generate_mages_rewards())
    all_items.extend(generate_nature_rewards())
    all_items.extend(generate_shadow_rewards())

    for filename, img in all_items:
        save_png(img, f'ui/icons/{filename}')


# =====================================================================
# MAIN
# =====================================================================
if __name__ == '__main__':
    print('PIX-313: Generating faction & reputation system art assets')
    print(f'Output: {ASSET_DIR}')

    generate_all_emblems_16()
    generate_all_shop_panels()
    generate_all_rewards()

    print(f'\nDone! All faction assets generated.')
