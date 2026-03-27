#!/usr/bin/env python3
"""
PIX-337: Generate bestiary and monster compendium UI art assets.

Creates:
- Bestiary book UI frame (leather-bound tome, 200x180)
- Monster portrait frames with rarity border variants (common, uncommon, rare, boss, world_boss) — 32x32 each
- Monster info panel background (160x120, stats/lore/drops)
- Discovered vs undiscovered monster silhouette states (32x32)
- Zone filter tab icons (one per biome type, 16x16)
- Collection progress bar and completion badges (bar: 120x8, badges: 16x16)
- Boss trophy icons (16x16, defeated world bosses + dungeon bosses)
- Bestiary NPC sprite (lorekeeper/scholar, 16x24)

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


def border_rect(draw, x, y, w, h, border_color, fill_color=None, alpha=255):
    fill_rect(draw, x, y, w, h, border_color, alpha)
    if fill_color:
        fill_rect(draw, x + 1, y + 1, w - 2, h - 2, fill_color, alpha)


def save_png(img, rel_path):
    full = os.path.join(ASSET_DIR, rel_path)
    ensure_dir(os.path.dirname(full))
    img.save(full)
    print(f'  ✓ {rel_path} ({img.size[0]}x{img.size[1]})')


# =====================================================================
# 1. BESTIARY BOOK UI FRAME (200x180)
# Leather-bound tome aesthetic — dark brown border, warm interior
# =====================================================================

def generate_bestiary_book_frame():
    """Leather-bound bestiary book frame — main UI container."""
    W, H = 200, 180
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Outer leather border (deep brown)
    fill_rect(d, 0, 0, W, H, 'deep_soil')

    # Leather tooling — decorative stitching border (1px inset)
    fill_rect(d, 1, 1, W - 2, H - 2, 'rich_earth')

    # Stitch line (2px inset)
    for x in range(2, W - 2):
        if x % 3 != 0:
            px(d, x, 2, 'sand')
            px(d, x, H - 3, 'sand')
    for y in range(2, H - 2):
        if y % 3 != 0:
            px(d, 2, y, 'sand')
            px(d, W - 3, y, 'sand')

    # Inner parchment area (slightly warm)
    fill_rect(d, 4, 4, W - 8, H - 8, 'dark_rock')

    # Book spine line down the center
    fill_rect(d, W // 2 - 1, 1, 2, H - 2, 'deep_soil')
    px(d, W // 2, 0, 'deep_soil')
    px(d, W // 2, H - 1, 'deep_soil')

    # Spine rivets (decorative dots)
    for y_off in [20, 50, 80, 110, 140, 160]:
        if y_off < H - 4:
            fill_circle(d, W // 2, y_off, 1, 'sand')

    # Title bar area at top of left page
    fill_rect(d, 6, 6, W // 2 - 8, 12, 'stone_gray', 120)

    # Corner ornaments (leather embossing)
    for cx, cy in [(6, 6), (W - 7, 6), (6, H - 7), (W - 7, H - 7)]:
        px(d, cx, cy, 'sand')
        px(d, cx + 1 if cx < W // 2 else cx - 1, cy, 'dirt')
        px(d, cx, cy + 1 if cy < H // 2 else cy - 1, 'dirt')

    # Book clasp on right edge
    fill_rect(d, W - 4, H // 2 - 6, 3, 12, 'dark_gold')
    fill_rect(d, W - 3, H // 2 - 4, 2, 8, 'gold')
    px(d, W - 2, H // 2, 'bright_yellow')

    save_png(img, 'ui/bestiary/ui_bestiary_book_frame.png')


# =====================================================================
# 2. MONSTER PORTRAIT FRAMES (32x32 each, 5 rarity variants)
# Borders colored by rarity, dark interior for monster sprite
# =====================================================================

RARITY_THEMES = {
    'common': {
        'border': 'stone_gray',
        'accent': 'mid_gray',
        'corner': 'light_stone',
    },
    'uncommon': {
        'border': 'forest_green',
        'accent': 'leaf_green',
        'corner': 'bright_grass',
    },
    'rare': {
        'border': 'ocean_blue',
        'accent': 'sky_blue',
        'corner': 'player_blue',
    },
    'boss': {
        'border': 'dark_gold',
        'accent': 'gold',
        'corner': 'bright_yellow',
    },
    'world_boss': {
        'border': 'magic_purple',
        'accent': 'mana_violet',
        'corner': 'spell_glow',
    },
}


def generate_portrait_frame(rarity):
    """32x32 monster portrait frame with rarity-colored border."""
    S = 32
    img = Image.new('RGBA', (S, S), TRANSPARENT)
    d = ImageDraw.Draw(img)
    t = RARITY_THEMES[rarity]

    # Outer border
    fill_rect(d, 0, 0, S, S, t['border'])

    # Inner border accent
    fill_rect(d, 1, 1, S - 2, S - 2, t['accent'])

    # Dark interior for monster sprite
    fill_rect(d, 2, 2, S - 4, S - 4, 'shadow_black')

    # Corner jewels
    for cx, cy in [(1, 1), (S - 2, 1), (1, S - 2), (S - 2, S - 2)]:
        px(d, cx, cy, t['corner'])

    # Top decorative edge (boss+ gets extra detail)
    if rarity in ('boss', 'world_boss'):
        for x in range(4, S - 4, 4):
            px(d, x, 0, t['corner'])
            px(d, x, S - 1, t['corner'])

    # World boss gets shimmer dots on sides
    if rarity == 'world_boss':
        for y in range(4, S - 4, 4):
            px(d, 0, y, 'spell_glow')
            px(d, S - 1, y, 'spell_glow')

    save_png(img, f'ui/bestiary/ui_bestiary_portrait_{rarity}.png')


# =====================================================================
# 3. MONSTER INFO PANEL (160x120)
# Stats display, lore text area, drop table section
# =====================================================================

def generate_monster_info_panel():
    """Monster details panel — stats, lore, drops sections."""
    W, H = 160, 120
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Panel background
    fill_rect(d, 0, 0, W, H, 'dark_rock')
    border_rect(d, 0, 0, W, H, 'stone_gray', 'dark_rock')

    # Header bar — monster name area
    fill_rect(d, 1, 1, W - 2, 14, 'deep_soil')
    fill_rect(d, 2, 2, W - 4, 12, 'rich_earth')
    # Name text placeholder line
    fill_rect(d, 6, 5, 60, 3, 'pale_sand')
    # Level indicator on right
    fill_rect(d, W - 30, 4, 24, 6, 'deep_soil')
    fill_rect(d, W - 28, 5, 20, 4, 'dark_gold')

    # Stats section (left side) — HP, ATK, DEF, SPD bars
    stats_y = 18
    stat_labels = [
        ('enemy_red', 'bright_red'),      # HP
        ('fire_orange', 'ember'),          # ATK
        ('ocean_blue', 'sky_blue'),        # DEF
        ('leaf_green', 'bright_grass'),    # SPD
    ]
    for i, (bar_bg, bar_fill) in enumerate(stat_labels):
        y = stats_y + i * 10
        # Stat label placeholder
        fill_rect(d, 4, y, 16, 3, 'mid_gray')
        # Stat bar background
        fill_rect(d, 22, y, 50, 5, 'shadow_black')
        fill_rect(d, 23, y + 1, 48, 3, bar_bg, 100)
        # Filled portion (varies per stat for visual interest)
        fill_w = 30 + (i * 5) % 18
        fill_rect(d, 23, y + 1, fill_w, 3, bar_fill)

    # Divider line
    fill_rect(d, 4, 58, W - 8, 1, 'stone_gray')

    # Lore text section
    lore_y = 62
    for line in range(4):
        y = lore_y + line * 6
        line_w = W - 16 if line < 3 else W - 40
        fill_rect(d, 6, y, line_w, 2, 'mid_gray', 150)

    # Divider
    fill_rect(d, 4, 88, W - 8, 1, 'stone_gray')

    # Drop table section
    drop_y = 92
    # "Drops" label
    fill_rect(d, 4, drop_y, 24, 3, 'gold')
    # Drop item slots (4 empty slots)
    for i in range(4):
        x = 6 + i * 20
        border_rect(d, x, drop_y + 6, 16, 16, 'stone_gray', 'shadow_black')
        # Small question mark placeholder
        fill_rect(d, x + 6, drop_y + 10, 4, 2, 'mid_gray')
        fill_rect(d, x + 7, drop_y + 12, 2, 3, 'mid_gray')
        px(d, x + 7, drop_y + 16, 'mid_gray')

    save_png(img, 'ui/bestiary/ui_bestiary_info_panel.png')


# =====================================================================
# 4. DISCOVERED / UNDISCOVERED SILHOUETTE STATES (32x32)
# Discovered: full-color placeholder, Undiscovered: dark silhouette
# =====================================================================

def generate_discovery_states():
    """Discovered and undiscovered monster placeholder sprites."""
    S = 32

    # --- Undiscovered: dark silhouette with question mark ---
    img = Image.new('RGBA', (S, S), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Monster silhouette (generic menacing shape)
    # Body mass
    fill_rect(d, 10, 8, 12, 16, 'dark_rock')
    fill_rect(d, 8, 12, 16, 10, 'dark_rock')
    # Head bump
    fill_rect(d, 12, 5, 8, 6, 'dark_rock')
    # Arms/wings extending
    fill_rect(d, 5, 10, 4, 8, 'dark_rock')
    fill_rect(d, 23, 10, 4, 8, 'dark_rock')
    # Legs
    fill_rect(d, 10, 24, 4, 4, 'dark_rock')
    fill_rect(d, 18, 24, 4, 4, 'dark_rock')

    # Question mark overlay
    fill_rect(d, 14, 11, 4, 1, 'stone_gray')
    px(d, 17, 12, 'stone_gray')
    px(d, 16, 13, 'stone_gray')
    px(d, 15, 14, 'stone_gray')
    px(d, 15, 15, 'stone_gray')
    px(d, 15, 17, 'stone_gray')

    save_png(img, 'ui/bestiary/ui_bestiary_undiscovered.png')

    # --- Discovered: warm-outlined placeholder with checkmark ---
    img2 = Image.new('RGBA', (S, S), TRANSPARENT)
    d2 = ImageDraw.Draw(img2)

    # Subtle glow background
    fill_rect(d2, 4, 4, S - 8, S - 8, 'deep_soil', 80)

    # Checkmark icon (bottom-right corner indicator)
    px(d2, 24, 24, 'leaf_green')
    px(d2, 25, 25, 'leaf_green')
    px(d2, 26, 26, 'bright_grass')
    px(d2, 27, 25, 'bright_grass')
    px(d2, 28, 24, 'bright_grass')
    px(d2, 29, 23, 'leaf_green')

    # "Discovered" frame accent
    border_rect(d2, 2, 2, S - 4, S - 4, 'dirt')
    # Clear interior back to transparent
    for dy in range(S - 6):
        for dx in range(S - 6):
            d2.point((3 + dx, 3 + dy), fill=TRANSPARENT)

    save_png(img2, 'ui/bestiary/ui_bestiary_discovered.png')


# =====================================================================
# 5. ZONE FILTER TAB ICONS (16x16 each)
# One per biome type for filtering the bestiary by zone
# =====================================================================

ZONE_BIOMES = {
    'plains':    {'bg': 'bright_grass', 'fg': 'leaf_green',    'accent': 'sky_blue'},
    'forest':    {'bg': 'forest_green', 'fg': 'deep_forest',   'accent': 'leaf_green'},
    'desert':    {'bg': 'sand',         'fg': 'desert_gold',   'accent': 'dark_gold'},
    'volcanic':  {'bg': 'bright_red',   'fg': 'fire_orange',   'accent': 'ember'},
    'swamp':     {'bg': 'deep_forest',  'fg': 'forest_green',  'accent': 'dirt'},
    'ice':       {'bg': 'ice_water',    'fg': 'sky_blue',      'accent': 'shimmer'},
    'ocean':     {'bg': 'ocean_blue',   'fg': 'deep_ocean',    'accent': 'player_blue'},
    'sky':       {'bg': 'shimmer',      'fg': 'ice_water',     'accent': 'player_blue'},
    'void':      {'bg': 'deep_magic',   'fg': 'magic_purple',  'accent': 'mana_violet'},
    'dungeon':   {'bg': 'dark_rock',    'fg': 'stone_gray',    'accent': 'mana_violet'},
    'town':      {'bg': 'sand',         'fg': 'rich_earth',    'accent': 'gold'},
    'all':       {'bg': 'gold',         'fg': 'dark_gold',     'accent': 'bright_yellow'},
}


def generate_zone_filter_icon(biome):
    """16x16 zone filter tab icon — stylized biome representation."""
    S = 16
    img = Image.new('RGBA', (S, S), TRANSPARENT)
    d = ImageDraw.Draw(img)
    t = ZONE_BIOMES[biome]

    # Background circle
    fill_circle(d, 7, 7, 6, t['bg'])
    fill_circle(d, 7, 7, 5, t['fg'])

    if biome == 'plains':
        # Rolling hills
        for x in range(3, 12):
            y = 8 - (1 if 5 <= x <= 9 else 0)
            px(d, x, y, t['accent'])
            fill_rect(d, x, y + 1, 1, 4, t['bg'])
    elif biome == 'forest':
        # Tree shape
        fill_rect(d, 6, 3, 3, 2, t['accent'])
        fill_rect(d, 5, 5, 5, 2, t['accent'])
        fill_rect(d, 4, 7, 7, 2, t['accent'])
        fill_rect(d, 7, 9, 1, 3, 'rich_earth')
    elif biome == 'desert':
        # Sand dune with sun
        for x in range(3, 12):
            y = 9 - abs(7 - x) // 2
            fill_rect(d, x, y, 1, 12 - y, t['bg'])
        px(d, 10, 3, t['accent'])
        px(d, 9, 3, t['accent'])
        px(d, 10, 4, t['accent'])
    elif biome == 'volcanic':
        # Volcano peak with lava
        fill_rect(d, 6, 4, 3, 1, t['accent'])
        fill_rect(d, 5, 5, 5, 1, t['bg'])
        fill_rect(d, 4, 6, 7, 2, t['fg'])
        fill_rect(d, 3, 8, 9, 3, t['fg'])
        # Lava glow
        px(d, 7, 3, 'bright_yellow')
    elif biome == 'swamp':
        # Water with reeds
        fill_rect(d, 3, 8, 9, 3, t['bg'])
        px(d, 5, 5, t['accent'])
        px(d, 5, 6, t['accent'])
        px(d, 5, 7, t['accent'])
        px(d, 9, 4, t['accent'])
        px(d, 9, 5, t['accent'])
        px(d, 9, 6, t['accent'])
        px(d, 9, 7, t['accent'])
    elif biome == 'ice':
        # Snowflake/crystal
        px(d, 7, 4, t['accent'])
        px(d, 7, 10, t['accent'])
        px(d, 4, 7, t['accent'])
        px(d, 10, 7, t['accent'])
        px(d, 5, 5, t['bg'])
        px(d, 9, 5, t['bg'])
        px(d, 5, 9, t['bg'])
        px(d, 9, 9, t['bg'])
        px(d, 7, 7, t['accent'])
    elif biome == 'ocean':
        # Wave pattern
        for x in range(3, 12):
            y = 7 + (1 if x % 3 == 0 else 0)
            px(d, x, y, t['accent'])
            px(d, x, y - 1, t['bg'])
    elif biome == 'sky':
        # Cloud with star
        fill_rect(d, 4, 7, 7, 3, t['bg'])
        fill_rect(d, 5, 6, 5, 1, t['bg'])
        px(d, 9, 4, t['accent'])
        px(d, 8, 3, t['accent'])
        px(d, 10, 3, t['accent'])
    elif biome == 'void':
        # Swirling void portal
        fill_circle(d, 7, 7, 3, t['accent'])
        fill_circle(d, 7, 7, 2, t['bg'])
        fill_circle(d, 7, 7, 1, 'shadow_black')
        px(d, 4, 4, t['accent'])
        px(d, 10, 10, t['accent'])
    elif biome == 'dungeon':
        # Skull-like dungeon entrance
        fill_rect(d, 5, 4, 5, 4, t['fg'])
        fill_rect(d, 6, 8, 3, 3, t['fg'])
        # Eye holes
        px(d, 6, 5, t['accent'])
        px(d, 8, 5, t['accent'])
        # Arch top
        fill_rect(d, 6, 3, 3, 1, t['fg'])
    elif biome == 'town':
        # House shape
        fill_rect(d, 5, 7, 5, 4, t['fg'])
        fill_rect(d, 6, 5, 3, 2, t['bg'])
        px(d, 7, 4, t['accent'])
        # Door
        px(d, 7, 9, t['accent'])
        px(d, 7, 10, t['accent'])
    elif biome == 'all':
        # Star/compass — all zones
        px(d, 7, 3, t['accent'])
        px(d, 7, 11, t['accent'])
        px(d, 3, 7, t['accent'])
        px(d, 11, 7, t['accent'])
        fill_circle(d, 7, 7, 2, t['bg'])
        px(d, 7, 7, t['accent'])

    # Subtle outline ring
    for angle_x, angle_y in [(-6, 0), (6, 0), (0, -6), (0, 6)]:
        ax, ay = 7 + angle_x, 7 + angle_y
        if 0 <= ax < S and 0 <= ay < S:
            px(d, ax, ay, t['bg'], 180)

    save_png(img, f'ui/bestiary/ui_bestiary_zone_{biome}.png')


# =====================================================================
# 6. COLLECTION PROGRESS BAR (120x8) AND COMPLETION BADGES (16x16)
# =====================================================================

def generate_progress_bar():
    """120x8 collection progress bar — background and fill segments."""
    # Bar background
    W, H = 120, 8
    img_bg = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img_bg)
    border_rect(d, 0, 0, W, H, 'stone_gray', 'shadow_black')
    # Inner groove
    fill_rect(d, 1, 1, W - 2, H - 2, 'dark_rock')
    save_png(img_bg, 'ui/bestiary/ui_bestiary_progress_bg.png')

    # Bar fill segment (1x6 tile, tiled horizontally by engine)
    img_fill = Image.new('RGBA', (1, 6), TRANSPARENT)
    d2 = ImageDraw.Draw(img_fill)
    px(d2, 0, 0, 'dark_gold')
    px(d2, 0, 1, 'gold')
    px(d2, 0, 2, 'bright_yellow')
    px(d2, 0, 3, 'bright_yellow')
    px(d2, 0, 4, 'gold')
    px(d2, 0, 5, 'dark_gold')
    save_png(img_fill, 'ui/bestiary/ui_bestiary_progress_fill.png')


BADGE_TIERS = {
    'bronze':   {'primary': 'dirt', 'secondary': 'rich_earth', 'shine': 'sand'},
    'silver':   {'primary': 'light_stone', 'secondary': 'mid_gray', 'shine': 'pale_gray'},
    'gold':     {'primary': 'gold', 'secondary': 'dark_gold', 'shine': 'bright_yellow'},
    'platinum': {'primary': 'ice_water', 'secondary': 'sky_blue', 'shine': 'shimmer'},
}


def generate_completion_badge(tier):
    """16x16 collection completion badge — tiered medal."""
    S = 16
    img = Image.new('RGBA', (S, S), TRANSPARENT)
    d = ImageDraw.Draw(img)
    t = BADGE_TIERS[tier]

    # Ribbon tails
    fill_rect(d, 4, 10, 3, 5, 'enemy_red')
    fill_rect(d, 9, 10, 3, 5, 'bright_red')
    d.point((4, 14), fill=TRANSPARENT)
    d.point((11, 14), fill=TRANSPARENT)

    # Medal circle
    fill_circle(d, 7, 7, 5, t['secondary'])
    fill_circle(d, 7, 7, 4, t['primary'])
    fill_circle(d, 7, 7, 3, t['secondary'])

    # Star in center
    px(d, 7, 4, t['shine'])
    px(d, 6, 6, t['shine'])
    px(d, 8, 6, t['shine'])
    px(d, 7, 7, t['shine'])
    px(d, 5, 7, t['shine'])
    px(d, 9, 7, t['shine'])
    px(d, 6, 8, t['shine'])
    px(d, 8, 8, t['shine'])
    px(d, 7, 9, t['shine'])

    # Shine highlight
    px(d, 5, 4, t['shine'])

    save_png(img, f'ui/bestiary/ui_bestiary_badge_{tier}.png')


# =====================================================================
# 7. BOSS TROPHY ICONS (16x16)
# Defeated world boss and dungeon boss trophies
# =====================================================================

def generate_boss_trophy_dungeon():
    """16x16 dungeon boss trophy — skull on shield."""
    S = 16
    img = Image.new('RGBA', (S, S), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Shield shape
    fill_rect(d, 3, 2, 10, 8, 'dark_gold')
    fill_rect(d, 4, 10, 8, 2, 'dark_gold')
    fill_rect(d, 5, 12, 6, 1, 'dark_gold')
    fill_rect(d, 6, 13, 4, 1, 'dark_gold')
    px(d, 7, 14, 'dark_gold')
    px(d, 8, 14, 'dark_gold')

    # Shield interior
    fill_rect(d, 4, 3, 8, 6, 'deep_soil')
    fill_rect(d, 5, 9, 6, 2, 'deep_soil')

    # Skull
    fill_rect(d, 5, 3, 6, 4, 'pale_gray')
    fill_rect(d, 6, 7, 4, 2, 'pale_gray')
    # Eyes
    px(d, 6, 5, 'shadow_black')
    px(d, 9, 5, 'shadow_black')
    # Nose
    px(d, 7, 6, 'mid_gray')
    px(d, 8, 6, 'mid_gray')
    # Jaw teeth
    px(d, 6, 8, 'mid_gray')
    px(d, 7, 8, 'mid_gray')
    px(d, 8, 8, 'mid_gray')
    px(d, 9, 8, 'mid_gray')

    save_png(img, 'ui/bestiary/ui_bestiary_trophy_dungeon.png')


def generate_boss_trophy_world():
    """16x16 world boss trophy — crowned skull on ornate shield."""
    S = 16
    img = Image.new('RGBA', (S, S), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Ornate shield (purple/gold)
    fill_rect(d, 3, 3, 10, 8, 'magic_purple')
    fill_rect(d, 4, 11, 8, 2, 'magic_purple')
    fill_rect(d, 5, 13, 6, 1, 'magic_purple')
    px(d, 7, 14, 'magic_purple')
    px(d, 8, 14, 'magic_purple')

    # Gold edge
    for y in range(3, 11):
        px(d, 3, y, 'gold')
        px(d, 12, y, 'gold')
    fill_rect(d, 3, 3, 10, 1, 'gold')

    # Interior
    fill_rect(d, 4, 4, 8, 6, 'deep_magic')
    fill_rect(d, 5, 10, 6, 2, 'deep_magic')

    # Crown
    px(d, 5, 1, 'gold')
    px(d, 7, 0, 'bright_yellow')
    px(d, 9, 1, 'gold')
    fill_rect(d, 5, 2, 5, 2, 'gold')
    px(d, 7, 1, 'bright_yellow')

    # Skull (smaller, on shield)
    fill_rect(d, 6, 4, 4, 3, 'pale_gray')
    fill_rect(d, 6, 7, 4, 2, 'pale_gray')
    # Eyes (glowing)
    px(d, 6, 5, 'mana_violet')
    px(d, 9, 5, 'mana_violet')
    # Nose
    px(d, 7, 6, 'mid_gray')
    px(d, 8, 6, 'mid_gray')

    save_png(img, 'ui/bestiary/ui_bestiary_trophy_world.png')


def generate_boss_trophy_locked():
    """16x16 locked boss trophy — dark with lock icon."""
    S = 16
    img = Image.new('RGBA', (S, S), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Dark shield silhouette
    fill_rect(d, 3, 3, 10, 8, 'dark_rock')
    fill_rect(d, 4, 11, 8, 2, 'dark_rock')
    fill_rect(d, 5, 13, 6, 1, 'dark_rock')
    px(d, 7, 14, 'dark_rock')
    px(d, 8, 14, 'dark_rock')

    # Lock body
    fill_rect(d, 6, 7, 5, 4, 'stone_gray')
    fill_rect(d, 7, 8, 3, 2, 'mid_gray')
    # Lock shackle
    fill_rect(d, 7, 4, 3, 3, 'stone_gray')
    fill_rect(d, 8, 5, 1, 1, 'dark_rock')
    # Keyhole
    px(d, 8, 9, 'shadow_black')
    px(d, 8, 10, 'shadow_black')

    save_png(img, 'ui/bestiary/ui_bestiary_trophy_locked.png')


# =====================================================================
# 8. BESTIARY NPC SPRITE (16x24 lorekeeper/scholar)
# Scholarly character in robes, carries a book
# =====================================================================

def generate_bestiary_npc():
    """16x24 lorekeeper NPC — robed scholar carrying a bestiary tome."""
    W, H = 16, 24
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # --- HEAD (rows 0-7) ---
    # Hair (brown, scholarly cut)
    fill_rect(d, 5, 0, 6, 2, 'rich_earth')
    fill_rect(d, 4, 1, 8, 2, 'rich_earth')

    # Face
    fill_rect(d, 5, 2, 6, 5, 'pale_sand')
    fill_rect(d, 4, 3, 8, 3, 'pale_sand')

    # Eyes (glasses — sky blue lenses)
    px(d, 6, 4, 'sky_blue')
    px(d, 9, 4, 'sky_blue')
    # Glasses bridge
    px(d, 7, 4, 'stone_gray')
    px(d, 8, 4, 'stone_gray')
    # Glasses frame
    px(d, 5, 4, 'stone_gray')
    px(d, 10, 4, 'stone_gray')

    # Mouth
    px(d, 7, 6, 'dirt')
    px(d, 8, 6, 'dirt')

    # --- BODY (rows 8-18) — scholar robes (deep blue/purple) ---
    # Robe collar
    fill_rect(d, 5, 7, 6, 2, 'deep_ocean')

    # Main robe body
    fill_rect(d, 4, 9, 8, 8, 'ocean_blue')
    fill_rect(d, 3, 10, 10, 6, 'ocean_blue')

    # Robe detail — golden trim
    for y in range(9, 17):
        px(d, 4, y, 'dark_gold')
        px(d, 11, y, 'dark_gold')
    fill_rect(d, 4, 16, 8, 1, 'dark_gold')

    # Belt/sash
    fill_rect(d, 4, 12, 8, 1, 'gold')
    px(d, 7, 12, 'bright_yellow')  # buckle

    # Book held in left hand (a leather tome)
    fill_rect(d, 2, 11, 3, 4, 'rich_earth')
    fill_rect(d, 2, 11, 3, 1, 'deep_soil')  # spine
    px(d, 3, 12, 'sand')  # page edge
    px(d, 3, 13, 'sand')

    # Right hand (pointing/holding quill)
    px(d, 12, 12, 'pale_sand')
    px(d, 13, 11, 'pale_sand')
    # Quill
    px(d, 13, 10, 'near_white')
    px(d, 14, 9, 'near_white')
    px(d, 14, 8, 'bright_grass')  # feather tip

    # --- LEGS (rows 19-23) ---
    fill_rect(d, 5, 17, 2, 4, 'deep_ocean')
    fill_rect(d, 9, 17, 2, 4, 'deep_ocean')

    # Boots
    fill_rect(d, 4, 21, 4, 3, 'deep_soil')
    fill_rect(d, 8, 21, 4, 3, 'deep_soil')
    fill_rect(d, 5, 22, 2, 1, 'rich_earth')  # boot highlight
    fill_rect(d, 9, 22, 2, 1, 'rich_earth')

    save_png(img, 'sprites/npcs/char_npc_lorekeeper.png')


# =====================================================================
# 9. BESTIARY TAB BUTTON (active/inactive states, 24x16)
# =====================================================================

def generate_tab_button(state):
    """24x16 bestiary tab button — active (raised) or inactive (flat)."""
    W, H = 24, 16
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    if state == 'active':
        # Raised tab with warm leather tone
        fill_rect(d, 0, 2, W, H - 2, 'rich_earth')
        fill_rect(d, 1, 1, W - 2, 1, 'rich_earth')
        fill_rect(d, 2, 0, W - 4, 1, 'dirt')
        # Highlight top edge
        fill_rect(d, 2, 1, W - 4, 1, 'sand')
        # Dark interior
        fill_rect(d, 1, 3, W - 2, H - 4, 'dark_rock')
    else:
        # Flat inactive tab
        fill_rect(d, 0, 4, W, H - 4, 'deep_soil')
        fill_rect(d, 1, 3, W - 2, 1, 'deep_soil')
        # Dim interior
        fill_rect(d, 1, 5, W - 2, H - 6, 'dark_rock', 180)
        # Bottom border matching parent
        fill_rect(d, 0, H - 1, W, 1, 'stone_gray')

    save_png(img, f'ui/bestiary/ui_bestiary_tab_{state}.png')


# =====================================================================
# 10. BESTIARY SEARCH BAR (140x12)
# =====================================================================

def generate_search_bar():
    """140x12 search bar for filtering monsters by name."""
    W, H = 140, 12
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Bar frame
    border_rect(d, 0, 0, W, H, 'stone_gray', 'shadow_black')
    fill_rect(d, 1, 1, W - 2, H - 2, 'dark_rock')

    # Magnifying glass icon
    fill_circle(d, 6, 5, 3, 'stone_gray')
    fill_circle(d, 6, 5, 2, 'dark_rock')
    px(d, 9, 8, 'stone_gray')
    px(d, 10, 9, 'stone_gray')

    # Placeholder text lines
    fill_rect(d, 14, 4, 30, 2, 'stone_gray', 100)

    save_png(img, 'ui/bestiary/ui_bestiary_search_bar.png')


# =====================================================================
# 11. BESTIARY LIST ROW (180x24)
# Row item for monster list — portrait slot, name area, rarity dot
# =====================================================================

def generate_list_row():
    """180x24 bestiary list row — monster entry in the compendium list."""
    W, H = 180, 24
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Row background
    fill_rect(d, 0, 0, W, H, 'dark_rock')
    # Bottom border
    fill_rect(d, 0, H - 1, W, 1, 'stone_gray', 80)

    # Portrait slot (left side, 20x20 centered)
    border_rect(d, 2, 2, 20, 20, 'stone_gray', 'shadow_black')

    # Name placeholder
    fill_rect(d, 26, 4, 60, 3, 'pale_gray', 200)

    # Level text placeholder
    fill_rect(d, 26, 10, 20, 2, 'mid_gray', 150)

    # Zone indicator dot
    fill_circle(d, 26 + 70, 7, 3, 'leaf_green')

    # Rarity indicator (right side)
    fill_rect(d, W - 22, 4, 18, 8, 'shadow_black')
    fill_rect(d, W - 21, 5, 16, 6, 'dark_gold', 150)

    # Discovered checkmark area (far right)
    px(d, W - 6, 10, 'leaf_green')
    px(d, W - 5, 11, 'leaf_green')
    px(d, W - 4, 10, 'bright_grass')
    px(d, W - 3, 9, 'bright_grass')

    save_png(img, 'ui/bestiary/ui_bestiary_list_row.png')

    # Hover variant
    img_h = Image.new('RGBA', (W, H), TRANSPARENT)
    dh = ImageDraw.Draw(img_h)
    fill_rect(dh, 0, 0, W, H, 'stone_gray', 60)
    fill_rect(dh, 0, 0, W, 1, 'gold', 120)
    fill_rect(dh, 0, H - 1, W, 1, 'gold', 120)
    save_png(img_h, 'ui/bestiary/ui_bestiary_list_row_hover.png')


# =====================================================================
# MAIN — Generate all assets
# =====================================================================

def main():
    print('PIX-337: Generating bestiary and monster compendium UI art...\n')

    print('[1/11] Bestiary book frame (200x180)')
    generate_bestiary_book_frame()

    print('[2/11] Monster portrait frames (32x32 × 5 rarities)')
    for rarity in RARITY_THEMES:
        generate_portrait_frame(rarity)

    print('[3/11] Monster info panel (160x120)')
    generate_monster_info_panel()

    print('[4/11] Discovery state sprites (32x32 × 2)')
    generate_discovery_states()

    print('[5/11] Zone filter tab icons (16x16 × 12 biomes)')
    for biome in ZONE_BIOMES:
        generate_zone_filter_icon(biome)

    print('[6/11] Progress bar and completion badges')
    generate_progress_bar()
    for tier in BADGE_TIERS:
        generate_completion_badge(tier)

    print('[7/11] Boss trophy icons (16x16 × 3)')
    generate_boss_trophy_dungeon()
    generate_boss_trophy_world()
    generate_boss_trophy_locked()

    print('[8/11] Bestiary NPC lorekeeper sprite (16x24)')
    generate_bestiary_npc()

    print('[9/11] Tab buttons (24x16 × 2)')
    generate_tab_button('active')
    generate_tab_button('inactive')

    print('[10/11] Search bar (140x12)')
    generate_search_bar()

    print('[11/11] List row (180x24 + hover)')
    generate_list_row()

    print('\n✅ All bestiary assets generated successfully!')


if __name__ == '__main__':
    main()
