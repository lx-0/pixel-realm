"""
PixelRealm Marketing Asset Generator
Creates composite screenshots, GIF previews, banners, and infographic
from existing game assets for the itch.io store page.

Output: assets/marketing/
"""
import sys
sys.path.insert(0, '/tmp/pillow_pkg')

import os
import random
from PIL import Image, ImageDraw

# Paths
PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(PROJECT, 'assets')
OUT = os.path.join(ASSETS, 'marketing')
os.makedirs(OUT, exist_ok=True)

# Constants
NATIVE_W, NATIVE_H = 320, 180
SCALE = 3
DISPLAY_W, DISPLAY_H = NATIVE_W * SCALE, NATIVE_H * SCALE
TILE = 16

# Master palette
PALETTE = {
    'shadow_black': (13, 13, 13),
    'dark_rock': (43, 43, 43),
    'stone_gray': (74, 74, 74),
    'mid_gray': (110, 110, 110),
    'light_stone': (150, 150, 150),
    'pale_gray': (200, 200, 200),
    'near_white': (240, 240, 240),
    'deep_soil': (59, 32, 16),
    'rich_earth': (107, 58, 31),
    'dirt': (139, 92, 42),
    'sand': (184, 132, 63),
    'desert_gold': (212, 168, 90),
    'pale_sand': (232, 208, 138),
    'deep_forest': (26, 58, 26),
    'forest_green': (45, 110, 45),
    'leaf_green': (76, 155, 76),
    'bright_grass': (120, 200, 120),
    'light_foliage': (168, 228, 160),
    'deep_ocean': (10, 26, 58),
    'ocean_blue': (26, 74, 138),
    'sky_blue': (42, 122, 192),
    'player_cyan': (80, 168, 232),
    'ice_blue': (144, 208, 248),
    'shimmer': (200, 240, 255),
    'deep_blood': (90, 10, 10),
    'enemy_red': (160, 16, 16),
    'bright_red': (212, 32, 32),
    'fire_orange': (240, 96, 32),
    'ember': (248, 160, 96),
    'dark_gold': (168, 112, 0),
    'gold': (232, 184, 0),
    'bright_yellow': (255, 224, 64),
    'pale_highlight': (255, 248, 160),
    'deep_magic': (26, 10, 58),
    'magic_purple': (90, 32, 160),
    'mana_violet': (144, 80, 224),
    'spell_glow': (208, 144, 255),
}
P = PALETTE


def load(path):
    return Image.open(os.path.join(ASSETS, path)).convert('RGBA')


def extract_tile(tileset, col, row, tw=TILE, th=TILE):
    return tileset.crop((col * tw, row * th, col * tw + tw, row * th + th))


def extract_char_frame(sheet, frame_idx, fw=16, fh=24):
    x = frame_idx * fw
    return sheet.crop((x, 0, x + fw, fh))


def extract_boss_frame(sheet, frame_idx, fw=32, fh=32):
    x = frame_idx * fw
    return sheet.crop((x, 0, x + fw, fh))


def extract_vfx_frame(sheet, frame_idx, fw=32, fh=32):
    x = frame_idx * fw
    return sheet.crop((x, 0, x + fw, fh))


def scale_up(img, factor=SCALE):
    return img.resize((img.width * factor, img.height * factor), Image.NEAREST)


def fill_tiles(canvas, tileset, tile_col, tile_row, y_start, y_end,
               x_start=0, x_end=NATIVE_W):
    """Fill a horizontal band with a single tile from the tileset."""
    tile = extract_tile(tileset, tile_col, tile_row)
    for y in range(y_start, y_end, TILE):
        for x in range(x_start, x_end, TILE):
            canvas.paste(tile, (x, y), tile)


def fill_tiles_varied(canvas, tileset, tile_options, y_start, y_end,
                      x_start=0, x_end=NATIVE_W, seed=42):
    """Fill band with varied tiles (list of (col, row) tuples)."""
    rng = random.Random(seed)
    for y in range(y_start, y_end, TILE):
        for x in range(x_start, x_end, TILE):
            col, row = rng.choice(tile_options)
            tile = extract_tile(tileset, col, row)
            canvas.paste(tile, (x, y), tile)


def draw_hud(canvas, hp_pct=0.75, mp_pct=0.6, level=5):
    """Draw a simplified HUD overlay matching the game's style."""
    draw = ImageDraw.Draw(canvas)
    # HP bar background
    draw.rectangle([4, 4, 84, 10], fill=P['dark_rock'])
    # HP fill
    hp_w = int(78 * hp_pct)
    draw.rectangle([5, 5, 5 + hp_w, 9], fill=P['bright_red'])
    # MP bar
    draw.rectangle([4, 12, 64, 18], fill=P['dark_rock'])
    mp_w = int(58 * mp_pct)
    draw.rectangle([5, 13, 5 + mp_w, 17], fill=P['mana_violet'])
    # Level indicator
    draw.rectangle([88, 4, 104, 12], fill=P['dark_rock'])
    # Simple "Lv" text as pixels
    draw.point((90, 6), fill=P['bright_yellow'])
    draw.point((90, 7), fill=P['bright_yellow'])
    draw.point((90, 8), fill=P['bright_yellow'])
    draw.point((90, 9), fill=P['bright_yellow'])
    draw.point((91, 9), fill=P['bright_yellow'])
    draw.point((92, 9), fill=P['bright_yellow'])
    # Level number dots
    for i in range(level):
        if i < 5:
            draw.point((95 + i * 2, 7), fill=P['gold'])
    # Minimap corner
    draw.rectangle([NATIVE_W - 36, 4, NATIVE_W - 4, 36], fill=(43, 43, 43, 180))
    draw.rectangle([NATIVE_W - 35, 5, NATIVE_W - 5, 35], outline=P['mid_gray'])
    # Player dot on minimap
    draw.point((NATIVE_W - 20, 20), fill=P['player_cyan'])
    draw.point((NATIVE_W - 19, 20), fill=P['player_cyan'])
    draw.point((NATIVE_W - 20, 21), fill=P['player_cyan'])
    draw.point((NATIVE_W - 19, 21), fill=P['player_cyan'])


def draw_enemy_hp(canvas, x, y, pct=0.5):
    """Draw small enemy HP bar above an enemy."""
    draw = ImageDraw.Draw(canvas)
    bar_w = 14
    draw.rectangle([x, y, x + bar_w, y + 2], fill=P['dark_rock'])
    fill_w = int(bar_w * pct)
    draw.rectangle([x, y, x + fill_w, y + 2], fill=P['bright_red'])


def draw_damage_number(canvas, x, y, color):
    """Draw a small damage indicator (a few bright pixels)."""
    draw = ImageDraw.Draw(canvas)
    # Simple -25 as pixel dots
    draw.point((x, y), fill=color)
    draw.point((x + 1, y), fill=color)
    draw.point((x + 2, y - 1), fill=color)
    draw.point((x + 3, y), fill=color)
    draw.point((x + 4, y), fill=color)


def draw_text_label(canvas, x, y, text, fg, bg=None):
    """Draw a simple pixel text label (5px tall font approximation)."""
    draw = ImageDraw.Draw(canvas)
    # Simple box with colored fill to indicate text
    w = len(text) * 4 + 2
    if bg:
        draw.rectangle([x - 1, y - 1, x + w, y + 5], fill=bg)
    # Draw approximate pixel characters
    cx = x
    for ch in text:
        if ch == ' ':
            cx += 3
            continue
        # Simple 3x5 pixel character approximation
        for py in range(5):
            for px in range(3):
                if _char_pixel(ch, px, py):
                    draw.point((cx + px, y + py), fill=fg)
        cx += 4


# Minimal 3x5 pixel font for labels
_FONT = {
    'A': ['010', '101', '111', '101', '101'],
    'B': ['110', '101', '110', '101', '110'],
    'C': ['011', '100', '100', '100', '011'],
    'D': ['110', '101', '101', '101', '110'],
    'E': ['111', '100', '110', '100', '111'],
    'F': ['111', '100', '110', '100', '100'],
    'G': ['011', '100', '101', '101', '011'],
    'H': ['101', '101', '111', '101', '101'],
    'I': ['111', '010', '010', '010', '111'],
    'J': ['111', '001', '001', '101', '010'],
    'K': ['101', '110', '100', '110', '101'],
    'L': ['100', '100', '100', '100', '111'],
    'M': ['101', '111', '111', '101', '101'],
    'N': ['101', '111', '111', '111', '101'],
    'O': ['010', '101', '101', '101', '010'],
    'P': ['110', '101', '110', '100', '100'],
    'Q': ['010', '101', '101', '111', '011'],
    'R': ['110', '101', '110', '101', '101'],
    'S': ['011', '100', '010', '001', '110'],
    'T': ['111', '010', '010', '010', '010'],
    'U': ['101', '101', '101', '101', '010'],
    'V': ['101', '101', '101', '010', '010'],
    'W': ['101', '101', '111', '111', '101'],
    'X': ['101', '101', '010', '101', '101'],
    'Y': ['101', '101', '010', '010', '010'],
    'Z': ['111', '001', '010', '100', '111'],
    '0': ['010', '101', '101', '101', '010'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['110', '001', '010', '100', '111'],
    '3': ['110', '001', '010', '001', '110'],
    '4': ['101', '101', '111', '001', '001'],
    '5': ['111', '100', '110', '001', '110'],
    '6': ['011', '100', '110', '101', '010'],
    '7': ['111', '001', '010', '010', '010'],
    '8': ['010', '101', '010', '101', '010'],
    '9': ['010', '101', '011', '001', '110'],
    '-': ['000', '000', '111', '000', '000'],
    '+': ['000', '010', '111', '010', '000'],
    ':': ['000', '010', '000', '010', '000'],
    '/': ['001', '001', '010', '100', '100'],
    '.': ['000', '000', '000', '000', '010'],
    '!': ['010', '010', '010', '000', '010'],
    '?': ['110', '001', '010', '000', '010'],
    'x': ['000', '101', '010', '101', '000'],
    'v': ['000', '101', '101', '010', '000'],
}


def _char_pixel(ch, px, py):
    ch = ch.upper()
    if ch not in _FONT:
        return False
    row = _FONT[ch][py]
    return px < len(row) and row[px] == '1'


def add_sparkle(canvas, x, y, color=None):
    """Add a small sparkle/particle effect."""
    draw = ImageDraw.Draw(canvas)
    c = color or P['bright_yellow']
    draw.point((x, y), fill=c)
    draw.point((x - 1, y), fill=c)
    draw.point((x + 1, y), fill=c)
    draw.point((x, y - 1), fill=c)
    draw.point((x, y + 1), fill=c)


def add_gold_border(img, thickness=2):
    """Add a gold pixel border around the image (at display scale)."""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    for t in range(thickness):
        draw.rectangle([t, t, w - 1 - t, h - 1 - t], outline=P['dark_gold'])
    # Inner border slightly brighter
    draw.rectangle([thickness, thickness, w - 1 - thickness, h - 1 - thickness],
                   outline=P['gold'])


# ========== SCREENSHOT 1: Forest Combat ==========
def make_screenshot_combat():
    print("  Creating combat screenshot...")
    canvas = Image.new('RGBA', (NATIVE_W, NATIVE_H), P['sky_blue'])
    draw = ImageDraw.Draw(canvas)

    # Sky gradient
    for y in range(60):
        t = y / 60
        r = int(42 + (80 - 42) * t)
        g = int(122 + (168 - 122) * t)
        b = int(192 + (232 - 192) * t)
        draw.line([(0, y), (NATIVE_W, y)], fill=(r, g, b))

    # Load forest tileset
    ts = load('tiles/tilesets/tileset_forest.png')

    # Ground layer - grass tiles
    fill_tiles_varied(canvas, ts, [(0, 0), (1, 0), (2, 0)], 120, NATIVE_H, seed=10)

    # Path tiles
    fill_tiles(canvas, ts, 6, 0, 136, 152, x_start=48, x_end=272)

    # Trees in background
    tree_tile = extract_tile(ts, 4, 0)
    tree_top = extract_tile(ts, 5, 0)
    for tx in [16, 48, 96, 208, 256, 288]:
        canvas.paste(tree_top, (tx, 88), tree_top)
        canvas.paste(tree_tile, (tx, 104), tree_tile)

    # Load characters
    warrior = load('sprites/characters/char_player_warrior.png')
    goblin = load('sprites/enemies/char_enemy_goblin.png')
    slime = load('sprites/enemies/char_enemy_slime.png')
    skeleton = load('sprites/enemies/char_enemy_skeleton.png')

    # Place warrior (attack frame facing right, frame ~5)
    w_frame = extract_char_frame(warrior, 5)
    canvas.paste(w_frame, (140, 116), w_frame)

    # Place enemies
    g_frame = extract_char_frame(goblin, 2)
    canvas.paste(g_frame, (188, 118), g_frame)
    draw_enemy_hp(canvas, 189, 114, 0.4)

    s_frame = extract_char_frame(slime, 0)
    canvas.paste(s_frame, (220, 122), s_frame)
    draw_enemy_hp(canvas, 221, 118, 0.7)

    sk_frame = extract_char_frame(skeleton, 4)
    canvas.paste(sk_frame, (100, 120), sk_frame)
    draw_enemy_hp(canvas, 101, 116, 0.9)

    # VFX - fireball
    vfx_fb = load('vfx/vfx_skill_fireball.png')
    fb_frame = extract_vfx_frame(vfx_fb, 2)
    canvas.paste(fb_frame, (164, 108), fb_frame)

    # Damage numbers
    draw_damage_number(canvas, 190, 110, P['bright_yellow'])
    draw_damage_number(canvas, 222, 115, P['near_white'])

    # Sparkle effects
    add_sparkle(canvas, 175, 115, P['fire_orange'])
    add_sparkle(canvas, 180, 120, P['bright_yellow'])

    # HUD
    draw_hud(canvas, hp_pct=0.6, mp_pct=0.4, level=5)

    # XP bar at bottom
    draw.rectangle([0, NATIVE_H - 3, NATIVE_W, NATIVE_H], fill=P['dark_rock'])
    xp_w = int(NATIVE_W * 0.35)
    draw.rectangle([0, NATIVE_H - 2, xp_w, NATIVE_H - 1], fill=P['bright_yellow'])

    result = scale_up(canvas)
    add_gold_border(result, 3)
    result.save(os.path.join(OUT, 'screenshot_combat_forest.png'))
    print("    -> screenshot_combat_forest.png")


# ========== SCREENSHOT 2: Player Housing Interior ==========
def make_screenshot_housing():
    print("  Creating housing screenshot...")
    canvas = Image.new('RGBA', (NATIVE_W, NATIVE_H), P['deep_soil'])

    # Load house interior tileset
    ts_int = load('tiles/tilesets/tileset_house_interior.png')
    ts_cot = load('tiles/tilesets/tileset_house_cottage.png')

    # Floor
    fill_tiles_varied(canvas, ts_int, [(0, 0), (1, 0), (2, 0)], 80, NATIVE_H,
                      x_start=32, x_end=288, seed=20)

    # Walls (top area)
    fill_tiles_varied(canvas, ts_int, [(4, 0), (5, 0)], 32, 80,
                      x_start=32, x_end=288, seed=21)

    # Wall border line
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([32, 78, 287, 81], fill=P['dirt'])

    # Exterior darkness
    draw.rectangle([0, 0, 31, NATIVE_H], fill=P['shadow_black'])
    draw.rectangle([288, 0, NATIVE_W, NATIVE_H], fill=P['shadow_black'])
    draw.rectangle([0, 0, NATIVE_W, 31], fill=P['shadow_black'])

    # Load furniture sprites
    bed = load('sprites/housing/sprite_furn_bed.png')
    table = load('sprites/housing/sprite_furn_table.png')
    fireplace = load('sprites/housing/sprite_furn_fireplace.png')
    chest = load('sprites/housing/sprite_furn_chest.png')
    rug = load('sprites/housing/sprite_furn_rug.png')
    lamp = load('sprites/housing/sprite_furn_lamp.png')
    painting = load('sprites/housing/sprite_decor_painting.png')
    plant = load('sprites/housing/sprite_decor_plant.png')

    # Place furniture
    canvas.paste(bed, (48, 96), bed)
    canvas.paste(table, (128, 112), table)
    canvas.paste(fireplace, (240, 80), fireplace)
    canvas.paste(chest, (80, 144), chest)
    canvas.paste(rug, (144, 128), rug)
    canvas.paste(rug, (160, 128), rug)
    canvas.paste(lamp, (112, 96), lamp)
    canvas.paste(painting, (96, 48), painting)
    canvas.paste(painting, (176, 48), painting)
    canvas.paste(plant, (256, 128), plant)
    canvas.paste(plant, (48, 144), plant)

    # Fireplace glow
    add_sparkle(canvas, 248, 88, P['fire_orange'])
    add_sparkle(canvas, 244, 85, P['ember'])
    add_sparkle(canvas, 250, 84, P['bright_yellow'])

    # Player character
    warrior = load('sprites/characters/char_player_warrior.png')
    w_frame = extract_char_frame(warrior, 0)  # idle facing down
    canvas.paste(w_frame, (152, 104), w_frame)

    # Housing UI hint at bottom
    draw.rectangle([60, NATIVE_H - 20, 260, NATIVE_H - 4], fill=(43, 43, 43, 200))
    draw.rectangle([61, NATIVE_H - 19, 259, NATIVE_H - 5], outline=P['gold'])
    draw_text_label(canvas, 72, NATIVE_H - 16, "EDIT MODE", P['gold'])
    draw_text_label(canvas, 142, NATIVE_H - 16, "FURNITURE", P['pale_gray'])
    draw_text_label(canvas, 212, NATIVE_H - 16, "SAVE", P['leaf_green'])

    # Mini HUD
    draw_hud(canvas, hp_pct=1.0, mp_pct=0.9, level=7)

    result = scale_up(canvas)
    add_gold_border(result, 3)
    result.save(os.path.join(OUT, 'screenshot_housing_interior.png'))
    print("    -> screenshot_housing_interior.png")


# ========== SCREENSHOT 3: PvP Arena ==========
def make_screenshot_arena():
    print("  Creating arena screenshot...")
    canvas = Image.new('RGBA', (NATIVE_W, NATIVE_H), P['dark_rock'])
    draw = ImageDraw.Draw(canvas)

    # Load arena tileset
    ts_arena = load('tiles/tilesets/tileset_arena_gladiator.png')

    # Arena floor
    fill_tiles_varied(canvas, ts_arena, [(0, 0), (1, 0), (2, 0), (3, 0)],
                      80, NATIVE_H - 16, seed=30)

    # Arena border walls
    fill_tiles(canvas, ts_arena, 8, 0, 64, 80, x_start=0, x_end=NATIVE_W)
    fill_tiles(canvas, ts_arena, 8, 0, NATIVE_H - 16, NATIVE_H,
               x_start=0, x_end=NATIVE_W)

    # Dark audience area at top
    draw.rectangle([0, 0, NATIVE_W, 63], fill=P['shadow_black'])
    # Audience dots (spectators)
    rng = random.Random(31)
    for _ in range(40):
        ax = rng.randint(4, NATIVE_W - 4)
        ay = rng.randint(20, 58)
        ac = rng.choice([P['player_cyan'], P['bright_grass'],
                         P['fire_orange'], P['mana_violet'], P['pale_gray']])
        draw.point((ax, ay), fill=ac)
        draw.point((ax, ay + 1), fill=ac)

    # Players
    warrior = load('sprites/characters/char_player_warrior.png')
    mage = load('sprites/characters/char_player_mage.png')

    # Warrior (left side, attacking right)
    w_frame = extract_char_frame(warrior, 5)
    canvas.paste(w_frame, (100, 104), w_frame)

    # Mage (right side, casting left)
    m_frame = extract_char_frame(mage, 8)
    canvas.paste(m_frame, (200, 100), m_frame)

    # VFX between them
    vfx = load('vfx/vfx_skill_fireball.png')
    vfx_frame = extract_vfx_frame(vfx, 3)
    canvas.paste(vfx_frame, (150, 96), vfx_frame)

    # Hit sparks
    add_sparkle(canvas, 195, 108, P['near_white'])
    add_sparkle(canvas, 198, 112, P['bright_yellow'])
    add_sparkle(canvas, 192, 105, P['fire_orange'])

    # Player name labels
    draw.rectangle([96, 97, 128, 103], fill=(13, 13, 13, 160))
    draw_text_label(canvas, 98, 98, "HERO", P['player_cyan'])
    draw.rectangle([195, 93, 232, 99], fill=(13, 13, 13, 160))
    draw_text_label(canvas, 197, 94, "RIVAL", P['bright_red'])

    # HP bars for each player
    # Left player HP
    draw.rectangle([92, 90, 132, 95], fill=P['dark_rock'])
    draw.rectangle([93, 91, 93 + 28, 94], fill=P['leaf_green'])
    # Right player HP
    draw.rectangle([191, 86, 236, 91], fill=P['dark_rock'])
    draw.rectangle([192, 87, 192 + 18, 90], fill=P['bright_red'])

    # Arena HUD - match timer
    draw.rectangle([NATIVE_W // 2 - 20, 2, NATIVE_W // 2 + 20, 14], fill=P['dark_rock'])
    draw.rectangle([NATIVE_W // 2 - 19, 3, NATIVE_W // 2 + 19, 13], outline=P['gold'])
    draw_text_label(canvas, NATIVE_W // 2 - 10, 5, "1:42", P['near_white'])

    # VS indicator
    draw_text_label(canvas, NATIVE_W // 2 - 6, 68, "VS", P['bright_red'])

    # Rank badges area
    draw.rectangle([4, 4, 60, 14], fill=(43, 43, 43, 180))
    draw_text_label(canvas, 6, 6, "GOLD III", P['gold'])
    draw.rectangle([NATIVE_W - 64, 4, NATIVE_W - 4, 14], fill=(43, 43, 43, 180))
    draw_text_label(canvas, NATIVE_W - 62, 6, "SILVER I", P['pale_gray'])

    result = scale_up(canvas)
    add_gold_border(result, 3)
    result.save(os.path.join(OUT, 'screenshot_pvp_arena.png'))
    print("    -> screenshot_pvp_arena.png")


# ========== SCREENSHOT 4: Crafting in Town ==========
def make_screenshot_crafting():
    print("  Creating crafting screenshot...")
    canvas = Image.new('RGBA', (NATIVE_W, NATIVE_H), P['sky_blue'])
    draw = ImageDraw.Draw(canvas)

    # Sky gradient (daytime warm)
    for y in range(50):
        t = y / 50
        r = int(42 + (120 - 42) * t)
        g = int(122 + (200 - 122) * t)
        b = int(192 + (248 - 192) * t)
        draw.line([(0, y), (NATIVE_W, y)], fill=(r, g, b))

    # Load town tileset
    ts = load('tiles/tilesets/tileset_town.png')

    # Ground
    fill_tiles_varied(canvas, ts, [(0, 0), (1, 0), (2, 0)], 100, NATIVE_H, seed=40)

    # Stone path
    fill_tiles(canvas, ts, 6, 0, 116, 132, x_start=32, x_end=192)

    # Buildings/walls in background
    for bx in [16, 224, 256]:
        wall_tile = extract_tile(ts, 8, 0)
        for by in range(52, 100, 16):
            canvas.paste(wall_tile, (bx, by), wall_tile)

    # Roof tiles
    roof = extract_tile(ts, 9, 0)
    for bx in [16, 224, 256]:
        canvas.paste(roof, (bx, 36), roof)
        canvas.paste(roof, (bx + 16, 36), roof)

    # Player at crafting station
    ranger = load('sprites/characters/char_player_ranger.png')
    r_frame = extract_char_frame(ranger, 0)
    canvas.paste(r_frame, (130, 96), r_frame)

    # NPC shopkeeper nearby
    shopkeep = load('sprites/characters/char_npc_shopkeeper.png')
    sk_frame = extract_char_frame(shopkeep, 0)
    canvas.paste(sk_frame, (80, 100), sk_frame)

    # Quest marker above NPC
    draw.point((88, 92), fill=P['bright_yellow'])
    draw.point((87, 93), fill=P['bright_yellow'])
    draw.point((88, 93), fill=P['bright_yellow'])
    draw.point((89, 93), fill=P['bright_yellow'])
    draw.point((88, 94), fill=P['bright_yellow'])
    draw.point((88, 96), fill=P['bright_yellow'])

    # Crafting UI panel overlay (right side)
    panel = load('ui/panels/ui_panel_crafting.png')
    pw, ph = panel.size
    # Scale panel to fit ~40% of screen width
    panel_scaled = panel.resize((int(pw * 0.8), int(ph * 0.8)), Image.NEAREST)
    psw, psh = panel_scaled.size
    panel_x = NATIVE_W - psw - 8
    panel_y = 20
    canvas.paste(panel_scaled, (panel_x, panel_y), panel_scaled)

    # VFX craft sparkle near station
    vfx_cs = load('vfx/vfx_craft_success.png')
    cs_frame = extract_vfx_frame(vfx_cs, 2)
    canvas.paste(cs_frame, (122, 84), cs_frame)

    # HUD
    draw_hud(canvas, hp_pct=1.0, mp_pct=0.8, level=4)

    result = scale_up(canvas)
    add_gold_border(result, 3)
    result.save(os.path.join(OUT, 'screenshot_crafting_town.png'))
    print("    -> screenshot_crafting_town.png")


# ========== SCREENSHOT 5: Dungeon Boss Encounter ==========
def make_screenshot_dungeon():
    print("  Creating dungeon screenshot...")
    canvas = Image.new('RGBA', (NATIVE_W, NATIVE_H), P['shadow_black'])
    draw = ImageDraw.Draw(canvas)

    # Load dungeon tileset
    ts = load('tiles/tilesets/tileset_dungeon.png')

    # Floor
    fill_tiles_varied(canvas, ts, [(0, 0), (1, 0), (2, 0)], 80, NATIVE_H, seed=50)

    # Walls at top
    fill_tiles_varied(canvas, ts, [(4, 0), (5, 0), (6, 0)], 32, 80, seed=51)

    # Darkness above walls
    draw.rectangle([0, 0, NATIVE_W, 31], fill=P['shadow_black'])

    # Torch glow effects on walls
    for tx in [48, 128, 208, 288]:
        add_sparkle(canvas, tx, 56, P['fire_orange'])
        add_sparkle(canvas, tx + 2, 54, P['ember'])
        draw.point((tx, 60), fill=P['bright_yellow'])

    # Boss enemy
    boss = load('sprites/enemies/char_enemy_boss.png')
    b_frame = extract_boss_frame(boss, 2)
    canvas.paste(b_frame, (144, 76), b_frame)
    # Boss HP bar (large)
    draw.rectangle([80, 68, 240, 74], fill=P['dark_rock'])
    draw.rectangle([81, 69, 81 + int(158 * 0.65), 73], fill=P['bright_red'])
    draw_text_label(canvas, 120, 62, "BOSS", P['ember'])

    # Party members
    warrior = load('sprites/characters/char_player_warrior.png')
    mage = load('sprites/characters/char_player_mage.png')
    ranger = load('sprites/characters/char_player_ranger.png')

    w_frame = extract_char_frame(warrior, 5)
    canvas.paste(w_frame, (80, 120), w_frame)
    m_frame = extract_char_frame(mage, 8)
    canvas.paste(m_frame, (56, 132), m_frame)
    r_frame = extract_char_frame(ranger, 3)
    canvas.paste(r_frame, (108, 128), r_frame)

    # Heal VFX on warrior
    vfx_heal = load('vfx/vfx_skill_heal.png')
    h_frame = extract_vfx_frame(vfx_heal, 3)
    canvas.paste(h_frame, (68, 104), h_frame)

    # Lightning on boss
    vfx_lt = load('vfx/vfx_skill_lightning.png')
    lt_frame = extract_vfx_frame(vfx_lt, 2)
    canvas.paste(lt_frame, (148, 68), lt_frame)

    # Purple dungeon ambient particles
    rng = random.Random(52)
    for _ in range(12):
        px = rng.randint(0, NATIVE_W)
        py = rng.randint(32, NATIVE_H)
        canvas.putpixel((px, py), P['mana_violet'] + (160,))

    # HUD
    draw_hud(canvas, hp_pct=0.45, mp_pct=0.2, level=8)

    # Party member indicators
    colors = [P['player_cyan'], P['mana_violet'], P['leaf_green']]
    for i, c in enumerate(colors):
        draw.rectangle([4, 24 + i * 8, 30, 30 + i * 8], fill=P['dark_rock'])
        bar_w = int(24 * [0.45, 0.8, 0.6][i])
        draw.rectangle([5, 25 + i * 8, 5 + bar_w, 29 + i * 8], fill=c)

    result = scale_up(canvas)
    add_gold_border(result, 3)
    result.save(os.path.join(OUT, 'screenshot_dungeon_boss.png'))
    print("    -> screenshot_dungeon_boss.png")


# ========== SCREENSHOT 6: Town Social / Exploration ==========
def make_screenshot_exploration():
    print("  Creating exploration screenshot...")
    canvas = Image.new('RGBA', (NATIVE_W, NATIVE_H), (0, 0, 0, 0))

    # Load backgrounds
    bg_sky = load('backgrounds/bg_sky.png')
    bg_far = load('backgrounds/bg_hills_far.png')
    bg_near = load('backgrounds/bg_hills_near.png')

    # Composite backgrounds
    canvas.paste(bg_sky, (0, 0))
    canvas.paste(bg_far, (0, 40), bg_far)
    canvas.paste(bg_near, (0, 60), bg_near)

    # Load town tileset
    ts = load('tiles/tilesets/tileset_town.png')

    # Ground
    fill_tiles_varied(canvas, ts, [(0, 0), (1, 0), (2, 0)], 120, NATIVE_H, seed=60)

    # Stone path
    fill_tiles(canvas, ts, 6, 0, 136, 152, x_start=16, x_end=304)

    # Buildings
    for bx in [16, 48, 240, 272]:
        wall = extract_tile(ts, 8, 0)
        roof = extract_tile(ts, 9, 0)
        for by in range(72, 120, 16):
            canvas.paste(wall, (bx, by), wall)
        canvas.paste(roof, (bx, 56), roof)
        canvas.paste(roof, (bx + 16, 56), roof)

    # Trees
    tree_ts = load('tiles/tilesets/tileset_forest.png')
    tree = extract_tile(tree_ts, 4, 0)
    tree_top = extract_tile(tree_ts, 5, 0)
    for tx in [0, 304]:
        canvas.paste(tree_top, (tx, 88), tree_top)
        canvas.paste(tree, (tx, 104), tree)

    # Multiple players and NPCs (social scene)
    warrior = load('sprites/characters/char_player_warrior.png')
    mage = load('sprites/characters/char_player_mage.png')
    ranger = load('sprites/characters/char_player_ranger.png')
    shopkeep = load('sprites/characters/char_npc_shopkeeper.png')

    # Player group
    canvas.paste(extract_char_frame(warrior, 1), (120, 116), extract_char_frame(warrior, 1))
    canvas.paste(extract_char_frame(mage, 0), (148, 118), extract_char_frame(mage, 0))
    canvas.paste(extract_char_frame(ranger, 2), (170, 114), extract_char_frame(ranger, 2))

    # NPCs
    canvas.paste(extract_char_frame(shopkeep, 0), (80, 120), extract_char_frame(shopkeep, 0))

    # Another player walking in distance
    canvas.paste(extract_char_frame(warrior, 3), (220, 124), extract_char_frame(warrior, 3))

    draw = ImageDraw.Draw(canvas)

    # Chat bubbles
    draw.rectangle([144, 104, 188, 114], fill=(43, 43, 43, 200))
    draw.rectangle([145, 105, 187, 113], outline=P['mid_gray'])
    draw_text_label(canvas, 148, 107, "GG!", P['near_white'])

    # Quest marker
    draw.point((88, 112), fill=P['bright_yellow'])
    draw.point((87, 113), fill=P['bright_yellow'])
    draw.point((88, 113), fill=P['bright_yellow'])
    draw.point((89, 113), fill=P['bright_yellow'])
    draw.point((88, 114), fill=P['bright_yellow'])

    # Gold coins pickup sparkle
    add_sparkle(canvas, 200, 140, P['gold'])
    add_sparkle(canvas, 210, 142, P['bright_yellow'])

    # HUD
    draw_hud(canvas, hp_pct=1.0, mp_pct=1.0, level=3)

    result = scale_up(canvas)
    add_gold_border(result, 3)
    result.save(os.path.join(OUT, 'screenshot_town_social.png'))
    print("    -> screenshot_town_social.png")


# ========== GIF 1: Combat Animation ==========
def make_gif_combat():
    print("  Creating combat GIF...")
    frames = []
    warrior = load('sprites/characters/char_player_warrior.png')
    goblin = load('sprites/enemies/char_enemy_goblin.png')
    ts = load('tiles/tilesets/tileset_forest.png')
    vfx_fb = load('vfx/vfx_skill_fireball.png')

    for f_idx in range(24):  # 24 frames at ~100ms = 2.4s loop
        canvas = Image.new('RGBA', (NATIVE_W, NATIVE_H), P['sky_blue'])
        draw = ImageDraw.Draw(canvas)

        # Sky
        for y in range(60):
            t = y / 60
            r = int(42 + (80 - 42) * t)
            g = int(122 + (168 - 122) * t)
            b = int(192 + (232 - 192) * t)
            draw.line([(0, y), (NATIVE_W, y)], fill=(r, g, b))

        # Ground
        fill_tiles_varied(canvas, ts, [(0, 0), (1, 0), (2, 0)], 120, NATIVE_H, seed=10)
        fill_tiles(canvas, ts, 6, 0, 136, 152, x_start=48, x_end=272)

        # Trees
        tree_tile = extract_tile(ts, 4, 0)
        tree_top = extract_tile(ts, 5, 0)
        for tx in [16, 48, 208, 256, 288]:
            canvas.paste(tree_top, (tx, 88), tree_top)
            canvas.paste(tree_tile, (tx, 104), tree_tile)

        # Animation phases
        phase = f_idx % 12
        if phase < 4:
            # Idle/walk approach
            w_fi = phase % 2
            w_x = 120 + phase * 5
            w_frame = extract_char_frame(warrior, w_fi)
            canvas.paste(w_frame, (w_x, 116), w_frame)
            g_frame = extract_char_frame(goblin, 0)
            canvas.paste(g_frame, (188, 118), g_frame)
        elif phase < 8:
            # Attack swing
            att_fi = 4 + (phase - 4) % 4
            if att_fi >= 14:
                att_fi = 13
            w_frame = extract_char_frame(warrior, min(att_fi, 13))
            canvas.paste(w_frame, (140, 116), w_frame)
            g_frame = extract_char_frame(goblin, 2)
            canvas.paste(g_frame, (188, 118), g_frame)
            # Hit flash on goblin
            if phase == 6:
                draw.rectangle([188, 118, 204, 142], fill=P['near_white'] + (100,))
            # VFX
            if phase >= 5:
                fb = extract_vfx_frame(vfx_fb, (phase - 5) % 6)
                canvas.paste(fb, (160, 108), fb)
            draw_enemy_hp(canvas, 189, 114, max(0, 0.8 - (phase - 4) * 0.15))
        else:
            # Goblin knockback + damage numbers
            kb_offset = (phase - 8) * 6
            w_frame = extract_char_frame(warrior, 0)
            canvas.paste(w_frame, (140, 116), w_frame)
            g_frame = extract_char_frame(goblin, 4)
            canvas.paste(g_frame, (188 + kb_offset, 118), g_frame)
            draw_enemy_hp(canvas, 189 + kb_offset, 114, 0.2)
            draw_damage_number(canvas, 195 + kb_offset, 110 - (phase - 8) * 2,
                               P['bright_yellow'])

        # Always show HUD
        draw_hud(canvas, hp_pct=0.75, mp_pct=max(0.1, 0.6 - f_idx * 0.01), level=5)

        # Convert to RGB for GIF
        bg = Image.new('RGB', canvas.size, P['sky_blue'])
        bg.paste(canvas, mask=canvas.split()[3])
        frames.append(scale_up(bg))

    frames[0].save(os.path.join(OUT, 'preview_combat.gif'),
                   save_all=True, append_images=frames[1:],
                   duration=100, loop=0, optimize=True)
    print("    -> preview_combat.gif")


# ========== GIF 2: Exploration with Day/Night ==========
def make_gif_exploration():
    print("  Creating exploration GIF...")
    frames = []
    warrior = load('sprites/characters/char_player_warrior.png')
    ts_forest = load('tiles/tilesets/tileset_forest.png')
    bg_sky = load('backgrounds/bg_sky.png')
    bg_far = load('backgrounds/bg_hills_far.png')
    bg_near = load('backgrounds/bg_hills_near.png')

    for f_idx in range(36):  # 36 frames = 3.6s loop
        canvas = Image.new('RGBA', (NATIVE_W, NATIVE_H), (0, 0, 0, 0))

        # Day/night cycle tint
        cycle = f_idx / 36.0
        if cycle < 0.5:
            # Day (warm)
            tint_r, tint_g, tint_b = 0, 0, 0
            tint_a = 0
        else:
            # Transition to night (blue tint)
            night_t = (cycle - 0.5) * 2
            tint_r, tint_g, tint_b = 26, 74, 138
            tint_a = int(80 * night_t)

        # Backgrounds with parallax scroll
        scroll_x = f_idx * 2
        canvas.paste(bg_sky, (0, 0))
        # Parallax: far hills move slower
        far_x = -(scroll_x % 320)
        canvas.paste(bg_far, (far_x, 40), bg_far)
        canvas.paste(bg_far, (far_x + 320, 40), bg_far)
        near_x = -(scroll_x * 2 % 320)
        canvas.paste(bg_near, (near_x, 60), bg_near)
        canvas.paste(bg_near, (near_x + 320, 60), bg_near)

        # Ground
        fill_tiles_varied(canvas, ts_forest, [(0, 0), (1, 0), (2, 0)],
                          120, NATIVE_H, seed=10)

        # Trees
        tree_tile = extract_tile(ts_forest, 4, 0)
        tree_top = extract_tile(ts_forest, 5, 0)
        for tx_base in [16, 80, 160, 240, 304]:
            tx = tx_base
            canvas.paste(tree_top, (tx, 88), tree_top)
            canvas.paste(tree_tile, (tx, 104), tree_tile)

        # Walking warrior (4-frame walk cycle)
        walk_frame = f_idx % 4
        # Use walk frames (the art has all frames in one row)
        w_frame = extract_char_frame(warrior, walk_frame)
        canvas.paste(w_frame, (148, 116), w_frame)

        # Pickup items occasionally
        if f_idx % 12 < 3:
            add_sparkle(canvas, 200, 136, P['gold'])

        # Apply night tint overlay
        if tint_a > 0:
            overlay = Image.new('RGBA', (NATIVE_W, NATIVE_H),
                                (tint_r, tint_g, tint_b, tint_a))
            canvas = Image.alpha_composite(canvas, overlay)

        # Stars at night
        draw = ImageDraw.Draw(canvas)
        if cycle > 0.6:
            rng = random.Random(70)
            for _ in range(15):
                sx = rng.randint(0, NATIVE_W)
                sy = rng.randint(0, 40)
                star_a = int(255 * min(1.0, (cycle - 0.6) * 2.5))
                draw.point((sx, sy), fill=P['near_white'][:3] + (star_a,))

        # HUD
        draw_hud(canvas, hp_pct=1.0, mp_pct=1.0, level=3)

        bg_rgb = Image.new('RGB', canvas.size, P['sky_blue'])
        bg_rgb.paste(canvas, mask=canvas.split()[3])
        frames.append(scale_up(bg_rgb))

    frames[0].save(os.path.join(OUT, 'preview_exploration.gif'),
                   save_all=True, append_images=frames[1:],
                   duration=100, loop=0, optimize=True)
    print("    -> preview_exploration.gif")


# ========== GIF 3: PvP Arena Action ==========
def make_gif_arena():
    print("  Creating arena GIF...")
    frames = []
    warrior = load('sprites/characters/char_player_warrior.png')
    mage = load('sprites/characters/char_player_mage.png')
    ts_arena = load('tiles/tilesets/tileset_arena_gladiator.png')
    vfx_fb = load('vfx/vfx_skill_fireball.png')
    vfx_ice = load('vfx/vfx_skill_ice_shard.png')

    for f_idx in range(20):  # 20 frames = 2s loop
        canvas = Image.new('RGBA', (NATIVE_W, NATIVE_H), P['dark_rock'])
        draw = ImageDraw.Draw(canvas)

        # Arena floor
        fill_tiles_varied(canvas, ts_arena, [(0, 0), (1, 0), (2, 0), (3, 0)],
                          80, NATIVE_H - 16, seed=30)
        fill_tiles(canvas, ts_arena, 8, 0, 64, 80, x_start=0, x_end=NATIVE_W)
        fill_tiles(canvas, ts_arena, 8, 0, NATIVE_H - 16, NATIVE_H,
                   x_start=0, x_end=NATIVE_W)

        # Dark audience
        draw.rectangle([0, 0, NATIVE_W, 63], fill=P['shadow_black'])
        rng = random.Random(31 + f_idx % 4)
        for _ in range(40):
            ax = rng.randint(4, NATIVE_W - 4)
            ay = rng.randint(20, 58)
            ac = rng.choice([P['player_cyan'], P['bright_grass'],
                             P['fire_orange'], P['mana_violet']])
            draw.point((ax, ay), fill=ac)
            draw.point((ax, ay + 1), fill=ac)

        phase = f_idx % 10
        warrior_hp = max(0.3, 0.9 - phase * 0.03)
        mage_hp = max(0.2, 0.8 - phase * 0.05)

        if phase < 3:
            # Approach
            w_frame = extract_char_frame(warrior, phase % 2)
            canvas.paste(w_frame, (90 + phase * 8, 108), w_frame)
            m_frame = extract_char_frame(mage, 0)
            canvas.paste(m_frame, (210 - phase * 4, 104), m_frame)
        elif phase < 6:
            # Warrior attacks
            w_frame = extract_char_frame(warrior, 4 + (phase - 3))
            canvas.paste(w_frame, (114, 108), w_frame)
            m_frame = extract_char_frame(mage, 2)
            canvas.paste(m_frame, (198, 104), m_frame)
            if phase == 5:
                fb = extract_vfx_frame(vfx_fb, 3)
                canvas.paste(fb, (140, 100), fb)
                add_sparkle(canvas, 195, 108, P['near_white'])
        else:
            # Mage counters with ice
            w_frame = extract_char_frame(warrior, 0)
            canvas.paste(w_frame, (114, 108), w_frame)
            m_frame = extract_char_frame(mage, 8 + (phase - 6) % 4)
            canvas.paste(m_frame, (198, 104), m_frame)
            ice = extract_vfx_frame(vfx_ice, (phase - 6) % 6)
            canvas.paste(ice, (130, 96), ice)
            if phase >= 8:
                add_sparkle(canvas, 120, 112, P['ice_blue'])

        # Timer
        draw.rectangle([NATIVE_W // 2 - 20, 2, NATIVE_W // 2 + 20, 14], fill=P['dark_rock'])
        draw.rectangle([NATIVE_W // 2 - 19, 3, NATIVE_W // 2 + 19, 13], outline=P['gold'])
        secs = 102 - f_idx
        draw_text_label(canvas, NATIVE_W // 2 - 10, 5,
                        f"1:{secs:02d}" if secs < 60 else f"2:{secs - 60:02d}",
                        P['near_white'])

        bg_rgb = Image.new('RGB', canvas.size, P['dark_rock'])
        bg_rgb.paste(canvas, mask=canvas.split()[3])
        frames.append(scale_up(bg_rgb))

    frames[0].save(os.path.join(OUT, 'preview_arena_pvp.gif'),
                   save_all=True, append_images=frames[1:],
                   duration=100, loop=0, optimize=True)
    print("    -> preview_arena_pvp.gif")


# ========== BANNER: Light Variant ==========
def make_banner_light():
    print("  Creating light banner...")
    canvas = Image.new('RGBA', (NATIVE_W, NATIVE_H), P['sky_blue'])
    draw = ImageDraw.Draw(canvas)

    # Warm sky gradient
    for y in range(NATIVE_H):
        t = y / NATIVE_H
        r = int(42 + (120 - 42) * t)
        g = int(122 + (200 - 122) * t)
        b = int(192 + (120 - 192) * t)
        draw.line([(0, y), (NATIVE_W, y)], fill=(r, g, b))

    # Backgrounds
    bg_sky = load('backgrounds/bg_sky.png')
    bg_far = load('backgrounds/bg_hills_far.png')
    bg_near = load('backgrounds/bg_hills_near.png')
    canvas.paste(bg_sky, (0, 0), bg_sky)
    canvas.paste(bg_far, (0, 40), bg_far)
    canvas.paste(bg_near, (0, 60), bg_near)

    # Ground
    ts = load('tiles/tilesets/tileset_forest.png')
    fill_tiles_varied(canvas, ts, [(0, 0), (1, 0)], 130, NATIVE_H, seed=70)

    # Characters lineup
    warrior = load('sprites/characters/char_player_warrior.png')
    mage = load('sprites/characters/char_player_mage.png')
    ranger = load('sprites/characters/char_player_ranger.png')
    shopkeep = load('sprites/characters/char_npc_shopkeeper.png')

    canvas.paste(extract_char_frame(warrior, 0), (116, 114), extract_char_frame(warrior, 0))
    canvas.paste(extract_char_frame(mage, 0), (140, 112), extract_char_frame(mage, 0))
    canvas.paste(extract_char_frame(ranger, 0), (164, 114), extract_char_frame(ranger, 0))
    canvas.paste(extract_char_frame(shopkeep, 0), (92, 118), extract_char_frame(shopkeep, 0))

    # Enemy in distance
    slime = load('sprites/enemies/char_enemy_slime.png')
    canvas.paste(extract_char_frame(slime, 0), (240, 124), extract_char_frame(slime, 0))

    # Trees
    tree = extract_tile(ts, 4, 0)
    tree_top = extract_tile(ts, 5, 0)
    for tx in [8, 40, 264, 296]:
        canvas.paste(tree_top, (tx, 96), tree_top)
        canvas.paste(tree, (tx, 112), tree)

    # Logo area (top center) - render from SVG rasterization equivalent
    # Since we can't easily render SVG, draw pixel text
    # "PIXEL" in cyan, "REALM" in gold
    draw_text_label(canvas, 104, 20, "PIXEL", P['player_cyan'])
    draw_text_label(canvas, 128, 20, "REALM", P['gold'])

    # Subtitle
    draw_text_label(canvas, 84, 32, "PIXELATED MMORPG ADVENTURE", P['pale_gray'])

    # Tagline
    draw_text_label(canvas, 96, 160, "EXPLORE  FIGHT  BUILD  CONQUER",
                    P['near_white'], bg=P['dark_rock'])

    # Sparkles
    add_sparkle(canvas, 100, 18, P['bright_yellow'])
    add_sparkle(canvas, 168, 17, P['bright_yellow'])
    add_sparkle(canvas, 134, 14, P['shimmer'])

    result = scale_up(canvas)

    # Larger logo text on the scaled-up version using bigger pixel blocks
    dr = ImageDraw.Draw(result)
    # Gold border
    for t in range(4):
        dr.rectangle([t, t, DISPLAY_W - 1 - t, DISPLAY_H - 1 - t], outline=P['dark_gold'])
    dr.rectangle([4, 4, DISPLAY_W - 5, DISPLAY_H - 5], outline=P['gold'])

    result.save(os.path.join(OUT, 'banner_store_light.png'))
    print("    -> banner_store_light.png")


# ========== BANNER: Dark Variant ==========
def make_banner_dark():
    print("  Creating dark banner...")
    canvas = Image.new('RGBA', (NATIVE_W, NATIVE_H), P['deep_ocean'])
    draw = ImageDraw.Draw(canvas)

    # Night sky gradient
    for y in range(NATIVE_H):
        t = y / NATIVE_H
        r = int(10 + (26 - 10) * t)
        g = int(26 + (58 - 26) * t)
        b = int(58 + (100 - 58) * t)
        draw.line([(0, y), (NATIVE_W, y)], fill=(r, g, b))

    # Stars
    rng = random.Random(80)
    for _ in range(30):
        sx = rng.randint(0, NATIVE_W)
        sy = rng.randint(0, 80)
        brightness = rng.choice([P['near_white'], P['pale_gray'], P['shimmer']])
        draw.point((sx, sy), fill=brightness)
    # Moon
    draw.ellipse([240, 12, 256, 28], fill=P['pale_highlight'])
    draw.ellipse([244, 14, 258, 28], fill=P['deep_ocean'])  # crescent

    # Dark forest silhouette
    ts = load('tiles/tilesets/tileset_forest.png')
    fill_tiles_varied(canvas, ts, [(0, 0), (1, 0)], 130, NATIVE_H, seed=70)

    # Apply night tint to ground
    night_tint = Image.new('RGBA', (NATIVE_W, NATIVE_H - 130),
                           (26, 74, 138, 80))
    canvas.paste(Image.alpha_composite(
        canvas.crop((0, 130, NATIVE_W, NATIVE_H)).convert('RGBA'),
        night_tint
    ), (0, 130))

    # Dark tree silhouettes
    for tx in [0, 32, 64, 96, 192, 224, 256, 288]:
        tree = extract_tile(ts, 4, 0)
        tree_top = extract_tile(ts, 5, 0)
        canvas.paste(tree_top, (tx, 96), tree_top)
        canvas.paste(tree, (tx, 112), tree)

    # Characters with slight glow
    warrior = load('sprites/characters/char_player_warrior.png')
    mage = load('sprites/characters/char_player_mage.png')
    ranger = load('sprites/characters/char_player_ranger.png')

    canvas.paste(extract_char_frame(warrior, 0), (128, 112),
                 extract_char_frame(warrior, 0))
    canvas.paste(extract_char_frame(mage, 0), (148, 110),
                 extract_char_frame(mage, 0))
    canvas.paste(extract_char_frame(ranger, 0), (168, 112),
                 extract_char_frame(ranger, 0))

    # Magic glow around mage
    add_sparkle(canvas, 154, 108, P['mana_violet'])
    add_sparkle(canvas, 158, 106, P['spell_glow'])

    # Campfire glow
    draw.rectangle([146, 140, 150, 144], fill=P['fire_orange'])
    add_sparkle(canvas, 148, 138, P['bright_yellow'])
    add_sparkle(canvas, 146, 136, P['ember'])
    add_sparkle(canvas, 150, 137, P['fire_orange'])

    # Enemy eyes in darkness
    for ex, ey in [(32, 120), (280, 118), (60, 128)]:
        draw.point((ex, ey), fill=P['bright_red'])
        draw.point((ex + 3, ey), fill=P['bright_red'])

    # Logo text
    draw_text_label(canvas, 104, 20, "PIXEL", P['player_cyan'])
    draw_text_label(canvas, 128, 20, "REALM", P['gold'])
    draw_text_label(canvas, 84, 32, "PIXELATED MMORPG ADVENTURE", P['pale_gray'])

    # Tagline
    draw_text_label(canvas, 96, 160, "EXPLORE  FIGHT  BUILD  CONQUER",
                    P['near_white'], bg=(13, 13, 13))

    # Sparkles around logo
    add_sparkle(canvas, 100, 18, P['bright_yellow'])
    add_sparkle(canvas, 168, 17, P['bright_yellow'])

    result = scale_up(canvas)
    dr = ImageDraw.Draw(result)
    for t in range(4):
        dr.rectangle([t, t, DISPLAY_W - 1 - t, DISPLAY_H - 1 - t], outline=P['dark_gold'])
    dr.rectangle([4, 4, DISPLAY_W - 5, DISPLAY_H - 5], outline=P['gold'])

    result.save(os.path.join(OUT, 'banner_store_dark.png'))
    print("    -> banner_store_dark.png")


# ========== FEATURES INFOGRAPHIC ==========
def make_infographic():
    print("  Creating features infographic...")
    # Wider format for infographic: 480×270 native (×2 = 960×540)
    INF_W, INF_H = 480, 270
    canvas = Image.new('RGBA', (INF_W, INF_H), P['shadow_black'])
    draw = ImageDraw.Draw(canvas)

    # Dark gradient background
    for y in range(INF_H):
        t = y / INF_H
        r = int(13 + (43 - 13) * t)
        g = int(13 + (43 - 13) * t)
        b = int(13 + (58 - 13) * t)
        draw.line([(0, y), (INF_W, y)], fill=(r, g, b))

    # Title
    draw_text_label(canvas, INF_W // 2 - 38, 8, "PIXEL REALM", P['player_cyan'])
    draw_text_label(canvas, INF_W // 2 - 30, 18, "FEATURES", P['gold'])

    # Decorative line
    draw.line([(40, 28), (INF_W - 40, 28)], fill=P['dark_gold'])
    draw.point((INF_W // 2, 27), fill=P['gold'])
    draw.point((INF_W // 2, 28), fill=P['gold'])
    draw.point((INF_W // 2, 29), fill=P['gold'])

    # Feature grid: 3 columns × 3 rows
    features = [
        ("COMBAT", P['bright_red'], "sprites/enemies/char_enemy_goblin.png"),
        ("HOUSING", P['bright_grass'], "sprites/housing/sprite_furn_bed.png"),
        ("PVP ARENA", P['fire_orange'], "sprites/enemies/char_enemy_boss.png"),
        ("CRAFTING", P['gold'], "sprites/housing/sprite_furn_chest.png"),
        ("DUNGEONS", P['mana_violet'], None),
        ("QUESTS", P['bright_yellow'], None),
        ("WEATHER", P['ice_blue'], None),
        ("GUILDS", P['player_cyan'], None),
        ("DAY NIGHT", P['ocean_blue'], None),
    ]

    col_w = (INF_W - 40) // 3
    row_h = 72
    start_y = 38

    for i, (name, color, icon_path) in enumerate(features):
        col = i % 3
        row = i // 3
        cx = 20 + col * col_w + col_w // 2
        cy = start_y + row * row_h + 20

        # Feature box
        box_x1 = cx - col_w // 2 + 4
        box_y1 = cy - 16
        box_x2 = cx + col_w // 2 - 4
        box_y2 = cy + row_h - 24
        draw.rectangle([box_x1, box_y1, box_x2, box_y2], fill=(43, 43, 43, 200))
        draw.rectangle([box_x1, box_y1, box_x2, box_y2], outline=color)

        # Icon
        if icon_path:
            try:
                icon_img = load(icon_path)
                # Extract first frame
                if icon_img.width > 16:
                    icon_img = icon_img.crop((0, 0, 16, min(24, icon_img.height)))
                icon_x = cx - icon_img.width // 2
                icon_y = cy - 4
                canvas.paste(icon_img, (icon_x, icon_y), icon_img)
            except Exception:
                pass
        else:
            # Draw a colored diamond icon
            draw.point((cx, cy), fill=color)
            draw.point((cx - 1, cy + 1), fill=color)
            draw.point((cx + 1, cy + 1), fill=color)
            draw.point((cx, cy + 2), fill=color)
            draw.point((cx - 1, cy - 1), fill=color)
            draw.point((cx + 1, cy - 1), fill=color)
            draw.point((cx, cy - 2), fill=color)
            draw.point((cx - 2, cy), fill=color)
            draw.point((cx + 2, cy), fill=color)

        # Feature name
        label_x = cx - len(name) * 2
        draw_text_label(canvas, label_x, cy + 24, name, color)

    # Bottom tagline
    draw_text_label(canvas, INF_W // 2 - 60, INF_H - 14,
                    "PIXELATED MMORPG ADVENTURE", P['pale_gray'])

    # Scale up ×2
    result = canvas.resize((960, 540), Image.NEAREST)
    dr = ImageDraw.Draw(result)
    for t in range(3):
        dr.rectangle([t, t, 959 - t, 539 - t], outline=P['dark_gold'])
    dr.rectangle([3, 3, 956, 536], outline=P['gold'])

    result.save(os.path.join(OUT, 'infographic_features.png'))
    print("    -> infographic_features.png")


# ========== MAIN ==========
if __name__ == '__main__':
    print("PixelRealm Marketing Asset Generator")
    print("=" * 40)

    os.chdir(PROJECT)

    print("\n[1/4] Screenshots...")
    make_screenshot_combat()
    make_screenshot_housing()
    make_screenshot_arena()
    make_screenshot_crafting()
    make_screenshot_dungeon()
    make_screenshot_exploration()

    print("\n[2/4] Animated GIFs...")
    make_gif_combat()
    make_gif_exploration()
    make_gif_arena()

    print("\n[3/4] Store Banners...")
    make_banner_light()
    make_banner_dark()

    print("\n[4/4] Features Infographic...")
    make_infographic()

    print("\n" + "=" * 40)
    print("Done! All assets saved to assets/marketing/")
    print("\nGenerated files:")
    for f in sorted(os.listdir(OUT)):
        path = os.path.join(OUT, f)
        size_kb = os.path.getsize(path) / 1024
        print(f"  {f} ({size_kb:.1f} KB)")
