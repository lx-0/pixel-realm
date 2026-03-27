#!/usr/bin/env python3
"""
PIX-322: Generate procedural dungeon biome tilesets and associated art assets.

Creates three dungeon biomes (Fire Caverns, Ice Tomb, Shadow Crypt) with:
- 16x16 tileset sheets (floor, wall, corner, edge tiles)
- Biome-specific VFX sprites (particle effects, ambient FX)
- Hazard/trap sprites per biome
- Treasure room decoration sprites per biome
- Difficulty tier visual indicators (Normal/Hard/Nightmare overlays)
- Boss chamber entrance gate sprites per biome

All assets use the master 32-color palette.
"""
import sys
sys.path.insert(0, '/tmp/pip_pkgs')

from PIL import Image, ImageDraw
import os
import random

# === MASTER PALETTE (32 colors) ===
PAL = {
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
    'ice_blue':       (144, 208, 248),
    'shimmer':        (200, 240, 255),
    # Reds
    'deep_blood':     (90, 10, 10),
    'enemy_red':      (160, 16, 16),
    'bright_red':     (212, 32, 32),
    'fire_orange':    (240, 96, 32),
    'ember':          (248, 160, 96),
    # Yellows
    'dark_gold':      (168, 112, 0),
    'gold':           (232, 184, 0),
    'bright_yellow':  (255, 224, 64),
    'pale_highlight': (255, 248, 160),
    # Purples
    'deep_magic':     (26, 10, 58),
    'magic_purple':   (90, 32, 160),
    'mana_violet':    (144, 80, 224),
    'spell_glow':     (208, 144, 255),
}

TILE = 16
ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def seeded_random(seed):
    """Return a seeded Random instance for reproducible art."""
    return random.Random(seed)

def draw_pixel(draw, x, y, color, size=1):
    """Draw a single pixel or small block."""
    draw.rectangle([x, y, x + size - 1, y + size - 1], fill=color)

def dither_rect(draw, x, y, w, h, color_a, color_b, rng, density=0.3):
    """Fill a rect with dithered two-color pattern."""
    for py in range(y, y + h):
        for px in range(x, x + w):
            draw_pixel(draw, px, py, color_b if rng.random() < density else color_a)

def noise_fill(draw, x, y, w, h, colors, rng, weights=None):
    """Fill a rect with weighted random color noise."""
    if weights is None:
        weights = [1.0 / len(colors)] * len(colors)
    cum = []
    s = 0
    for wt in weights:
        s += wt
        cum.append(s)
    for py in range(y, y + h):
        for px in range(x, x + w):
            r = rng.random() * s
            for i, c in enumerate(cum):
                if r <= c:
                    draw_pixel(draw, px, py, colors[i])
                    break

def create_tileset_sheet(tiles, cols=16):
    """Arrange a list of 16x16 PIL Images into a tileset sheet."""
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * TILE, rows * TILE), (0, 0, 0, 0))
    for i, tile in enumerate(tiles):
        tx = (i % cols) * TILE
        ty = (i // cols) * TILE
        sheet.paste(tile, (tx, ty))
    return sheet

def save(img, *path_parts):
    """Save image, creating directories as needed."""
    fp = os.path.join(ASSETS_DIR, *path_parts)
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    img.save(fp)
    print(f"  -> {os.path.relpath(fp, ASSETS_DIR)}")

# ---------------------------------------------------------------------------
# TILE GENERATORS - shared patterns
# ---------------------------------------------------------------------------

def make_floor_tile(base, accent, highlight, rng, cracks=True):
    """Generic floor tile with optional cracks."""
    img = Image.new('RGBA', (TILE, TILE), base)
    draw = ImageDraw.Draw(img)
    # Subtle noise
    for _ in range(rng.randint(8, 16)):
        px, py = rng.randint(0, 15), rng.randint(0, 15)
        draw_pixel(draw, px, py, accent)
    # Occasional highlight
    for _ in range(rng.randint(1, 3)):
        px, py = rng.randint(0, 15), rng.randint(0, 15)
        draw_pixel(draw, px, py, highlight)
    # Cracks
    if cracks:
        cx = rng.randint(3, 12)
        for cy in range(rng.randint(2, 6), rng.randint(9, 14)):
            cx += rng.randint(-1, 1)
            cx = max(0, min(15, cx))
            draw_pixel(draw, cx, cy, accent)
    return img

def make_wall_tile(base, dark, light, accent, rng):
    """Generic wall tile with brick pattern."""
    img = Image.new('RGBA', (TILE, TILE), base)
    draw = ImageDraw.Draw(img)
    # Horizontal mortar lines
    for row_y in [0, 4, 8, 12]:
        draw.line([(0, row_y), (15, row_y)], fill=dark)
    # Vertical mortar (offset every other row)
    for row_y, offset in [(0, 0), (4, 4), (8, 0), (12, 4)]:
        for vx in range(offset, 16, 8):
            draw.line([(vx, row_y), (vx, row_y + 3)], fill=dark)
    # Accent pixels
    for _ in range(rng.randint(3, 8)):
        px, py = rng.randint(0, 15), rng.randint(0, 15)
        draw_pixel(draw, px, py, accent)
    # Light edge (top)
    for px in range(16):
        if rng.random() < 0.4:
            draw_pixel(draw, px, 1, light)
    return img

def make_corner_tile(base, dark, light, rng, direction='tl'):
    """Corner tile with two wall edges."""
    img = Image.new('RGBA', (TILE, TILE), base)
    draw = ImageDraw.Draw(img)
    # Wall edges based on direction
    if 't' in direction:
        draw.rectangle([0, 0, 15, 3], fill=dark)
        draw.line([(0, 4), (15, 4)], fill=light)
    if 'b' in direction:
        draw.rectangle([0, 12, 15, 15], fill=dark)
        draw.line([(0, 11), (15, 11)], fill=light)
    if 'l' in direction:
        draw.rectangle([0, 0, 3, 15], fill=dark)
        draw.line([(4, 0), (4, 15)], fill=light)
    if 'r' in direction:
        draw.rectangle([12, 0, 15, 15], fill=dark)
        draw.line([(11, 0), (11, 15)], fill=light)
    # Noise
    for _ in range(rng.randint(3, 6)):
        px, py = rng.randint(4, 11), rng.randint(4, 11)
        draw_pixel(draw, px, py, light)
    return img

def make_edge_tile(base, dark, light, rng, side='t'):
    """Edge tile with one wall edge."""
    img = Image.new('RGBA', (TILE, TILE), base)
    draw = ImageDraw.Draw(img)
    if side == 't':
        draw.rectangle([0, 0, 15, 2], fill=dark)
        draw.line([(0, 3), (15, 3)], fill=light)
    elif side == 'b':
        draw.rectangle([0, 13, 15, 15], fill=dark)
        draw.line([(0, 12), (15, 12)], fill=light)
    elif side == 'l':
        draw.rectangle([0, 0, 2, 15], fill=dark)
        draw.line([(3, 0), (3, 15)], fill=light)
    elif side == 'r':
        draw.rectangle([13, 0, 15, 15], fill=dark)
        draw.line([(12, 0), (12, 15)], fill=light)
    # Floor noise
    for _ in range(rng.randint(4, 10)):
        px, py = rng.randint(0, 15), rng.randint(0, 15)
        draw_pixel(draw, px, py, light)
    return img

# ---------------------------------------------------------------------------
# FIRE CAVERNS BIOME
# ---------------------------------------------------------------------------

def generate_fire_caverns():
    """Generate all Fire Caverns biome assets."""
    print("\n=== FIRE CAVERNS BIOME ===")
    rng = seeded_random(4201)

    base_floor = PAL['dark_rock']
    lava_bright = PAL['fire_orange']
    lava_dark = PAL['enemy_red']
    char_wall = PAL['deep_blood']
    ember_col = PAL['ember']
    highlight = PAL['bright_yellow']
    dark = PAL['shadow_black']

    tiles = []

    # --- Floor tiles (4 variants) ---
    for i in range(4):
        r = seeded_random(4201 + i)
        t = make_floor_tile(base_floor, char_wall, lava_dark, r)
        draw = ImageDraw.Draw(t)
        # Add lava cracks
        for _ in range(r.randint(1, 3)):
            sx = r.randint(2, 13)
            sy = r.randint(2, 13)
            for step in range(r.randint(3, 6)):
                draw_pixel(draw, sx, sy, lava_bright)
                sx += r.choice([-1, 0, 1])
                sy += r.choice([0, 1])
                sx = max(0, min(15, sx))
                sy = max(0, min(15, sy))
        tiles.append(t)

    # --- Lava pool tiles (2 variants) ---
    for i in range(2):
        r = seeded_random(4210 + i)
        t = Image.new('RGBA', (TILE, TILE), lava_dark)
        draw = ImageDraw.Draw(t)
        noise_fill(draw, 0, 0, 16, 16,
                   [lava_dark, lava_bright, ember_col, highlight],
                   r, [0.3, 0.35, 0.25, 0.1])
        # Lava bubbles
        for _ in range(r.randint(2, 4)):
            bx, by = r.randint(2, 13), r.randint(2, 13)
            draw_pixel(draw, bx, by, highlight)
            draw_pixel(draw, bx + 1, by, ember_col)
        tiles.append(t)

    # --- Charred wall tiles (4 variants) ---
    for i in range(4):
        r = seeded_random(4220 + i)
        t = make_wall_tile(char_wall, dark, lava_dark, ember_col, r)
        draw = ImageDraw.Draw(t)
        # Glowing cracks in wall
        for _ in range(r.randint(1, 2)):
            wx = r.randint(1, 14)
            for wy in range(r.randint(0, 4), r.randint(10, 15)):
                draw_pixel(draw, wx, wy, lava_bright)
                wx += r.choice([-1, 0, 0, 1])
                wx = max(0, min(15, wx))
        tiles.append(t)

    # --- Edge tiles (4 sides) ---
    for side in ['t', 'b', 'l', 'r']:
        r = seeded_random(4230 + ord(side))
        tiles.append(make_edge_tile(base_floor, char_wall, lava_dark, r, side))

    # --- Corner tiles (4 directions) ---
    for d in ['tl', 'tr', 'bl', 'br']:
        r = seeded_random(4240 + hash(d) % 100)
        tiles.append(make_corner_tile(base_floor, char_wall, lava_dark, r, d))

    # --- Lava edge tiles (lava meets floor) ---
    for i in range(2):
        r = seeded_random(4250 + i)
        t = Image.new('RGBA', (TILE, TILE), base_floor)
        draw = ImageDraw.Draw(t)
        # Bottom half is lava
        noise_fill(draw, 0, 8, 16, 8,
                   [lava_dark, lava_bright, ember_col],
                   r, [0.4, 0.4, 0.2])
        # Transition dither
        dither_rect(draw, 0, 6, 16, 4, base_floor, lava_dark, r, 0.5)
        tiles.append(t)

    # --- Stalagmite decoration ---
    t = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(t)
    # Stalagmite from bottom
    for sy in range(15, 5, -1):
        w = max(1, (15 - sy) // 2)
        cx = 7
        draw.line([(cx - w, sy), (cx + w, sy)], fill=char_wall)
    draw_pixel(draw, 7, 6, lava_dark)
    draw_pixel(draw, 7, 5, ember_col)
    tiles.append(t)

    # --- Ember particle decoration ---
    t = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(t)
    r = seeded_random(4260)
    for _ in range(6):
        px, py = r.randint(0, 15), r.randint(0, 15)
        c = r.choice([ember_col, lava_bright, highlight])
        draw_pixel(draw, px, py, c)
    tiles.append(t)

    sheet = create_tileset_sheet(tiles)
    save(sheet, 'tiles', 'tilesets', 'tileset_dungeon_fire_caverns.png')

    # --- Fire trap sprite (16x16) ---
    trap = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(trap)
    # Base plate
    draw.rectangle([2, 12, 13, 15], fill=PAL['dark_rock'])
    draw.rectangle([3, 13, 12, 14], fill=PAL['stone_gray'])
    # Fire jets (3 prongs)
    for fx in [5, 7, 9]:
        draw.line([(fx, 11), (fx, 6)], fill=lava_bright)
        draw.line([(fx, 5), (fx, 3)], fill=ember_col)
        draw_pixel(draw, fx, 2, highlight)
    # Grate holes
    for gx in [4, 6, 8, 10]:
        draw_pixel(draw, gx, 12, dark)
    save(trap, 'sprites', 'dungeon', 'sprite_dun_trap_fire.png')

    # --- Ember particle VFX (32x32 spritesheet, 4 frames) ---
    vfx = Image.new('RGBA', (32 * 4, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(vfx)
    for frame in range(4):
        ox = frame * 32
        r = seeded_random(4270 + frame)
        for _ in range(8):
            px = ox + r.randint(4, 27)
            py = r.randint(2, 29) - frame * 2
            if 0 <= py < 32:
                c = r.choice([ember_col, lava_bright, highlight])
                draw_pixel(draw, px, py, c)
                if r.random() < 0.3:
                    draw_pixel(draw, px + 1, py, c)
    save(vfx, 'vfx', 'vfx_dungeon_fire_embers.png')

    print("  Fire Caverns biome complete.")


# ---------------------------------------------------------------------------
# ICE TOMB BIOME
# ---------------------------------------------------------------------------

def generate_ice_tomb():
    """Generate all Ice Tomb biome assets."""
    print("\n=== ICE TOMB BIOME ===")

    base_floor = PAL['deep_ocean']
    ice_mid = PAL['ocean_blue']
    ice_light = PAL['ice_blue']
    crystal_wall = PAL['sky_blue']
    frost = PAL['shimmer']
    dark = PAL['shadow_black']
    highlight = PAL['near_white']

    tiles = []

    # --- Frozen floor tiles (4 variants) ---
    for i in range(4):
        r = seeded_random(5001 + i)
        t = make_floor_tile(base_floor, ice_mid, ice_light, r)
        draw = ImageDraw.Draw(t)
        # Frost crystals on floor
        for _ in range(r.randint(1, 3)):
            cx, cy = r.randint(2, 13), r.randint(2, 13)
            draw_pixel(draw, cx, cy, frost)
            draw_pixel(draw, cx + 1, cy, ice_light)
            draw_pixel(draw, cx, cy - 1, ice_light)
        tiles.append(t)

    # --- Ice sheet tiles (slippery, reflective) ---
    for i in range(2):
        r = seeded_random(5010 + i)
        t = Image.new('RGBA', (TILE, TILE), ice_mid)
        draw = ImageDraw.Draw(t)
        noise_fill(draw, 0, 0, 16, 16,
                   [ice_mid, ice_light, frost, crystal_wall],
                   r, [0.3, 0.35, 0.2, 0.15])
        # Reflective streaks
        for _ in range(r.randint(2, 4)):
            sx = r.randint(0, 12)
            sy = r.randint(0, 15)
            for step in range(r.randint(2, 5)):
                draw_pixel(draw, sx + step, sy, highlight)
        tiles.append(t)

    # --- Crystal wall tiles (4 variants) ---
    for i in range(4):
        r = seeded_random(5020 + i)
        t = make_wall_tile(crystal_wall, base_floor, ice_light, frost, r)
        draw = ImageDraw.Draw(t)
        # Crystal facets
        for _ in range(r.randint(2, 4)):
            fx, fy = r.randint(1, 14), r.randint(1, 14)
            draw_pixel(draw, fx, fy, highlight)
            draw_pixel(draw, fx + 1, fy + 1, frost)
        tiles.append(t)

    # --- Edge tiles ---
    for side in ['t', 'b', 'l', 'r']:
        r = seeded_random(5030 + ord(side))
        tiles.append(make_edge_tile(base_floor, crystal_wall, ice_light, r, side))

    # --- Corner tiles ---
    for d in ['tl', 'tr', 'bl', 'br']:
        r = seeded_random(5040 + hash(d) % 100)
        tiles.append(make_corner_tile(base_floor, crystal_wall, ice_light, r, d))

    # --- Ice-to-floor transition tiles ---
    for i in range(2):
        r = seeded_random(5050 + i)
        t = Image.new('RGBA', (TILE, TILE), base_floor)
        draw = ImageDraw.Draw(t)
        noise_fill(draw, 0, 0, 16, 8,
                   [ice_mid, ice_light, frost],
                   r, [0.5, 0.3, 0.2])
        dither_rect(draw, 0, 6, 16, 4, base_floor, ice_mid, r, 0.5)
        tiles.append(t)

    # --- Icicle decoration (hanging from ceiling) ---
    t = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(t)
    for ix, length in [(3, 8), (7, 11), (11, 6), (14, 4)]:
        for iy in range(0, length):
            c = frost if iy < 2 else (ice_light if iy < length - 2 else crystal_wall)
            draw_pixel(draw, ix, iy, c)
    tiles.append(t)

    # --- Frost crystal decoration ---
    t = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(t)
    # Snowflake-like crystal at center
    cx, cy = 7, 7
    for dx, dy in [(0, -3), (0, 3), (-3, 0), (3, 0), (-2, -2), (2, -2), (-2, 2), (2, 2)]:
        draw_pixel(draw, cx + dx, cy + dy, frost)
    for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
        draw_pixel(draw, cx + dx, cy + dy, highlight)
    draw_pixel(draw, cx, cy, highlight)
    tiles.append(t)

    sheet = create_tileset_sheet(tiles)
    save(sheet, 'tiles', 'tilesets', 'tileset_dungeon_ice_tomb.png')

    # --- Ice hazard sprite (16x16) ---
    hazard = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(hazard)
    # Ice spikes from ground
    for sx, sh in [(3, 10), (6, 13), (9, 11), (12, 8)]:
        for sy in range(15, 15 - sh, -1):
            w = max(0, (15 - (15 - sy)) // 4)
            draw.line([(sx - w, sy), (sx + w, sy)],
                      fill=ice_light if sy > 15 - sh + 2 else frost)
        draw_pixel(draw, sx, 15 - sh, highlight)
    save(hazard, 'sprites', 'dungeon', 'sprite_dun_hazard_ice.png')

    # --- Frost VFX (32x32 spritesheet, 4 frames) ---
    vfx = Image.new('RGBA', (32 * 4, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(vfx)
    for frame in range(4):
        ox = frame * 32
        r = seeded_random(5070 + frame)
        # Frost particles drifting down
        for _ in range(10):
            px = ox + r.randint(2, 29)
            py = r.randint(0, 28) + frame * 2
            if py < 32:
                c = r.choice([frost, ice_light, highlight])
                draw_pixel(draw, px, py, c)
                if r.random() < 0.4:
                    draw_pixel(draw, px + r.choice([-1, 1]), py, ice_mid)
    save(vfx, 'vfx', 'vfx_dungeon_ice_frost.png')

    print("  Ice Tomb biome complete.")


# ---------------------------------------------------------------------------
# SHADOW CRYPT BIOME
# ---------------------------------------------------------------------------

def generate_shadow_crypt():
    """Generate all Shadow Crypt biome assets."""
    print("\n=== SHADOW CRYPT BIOME ===")

    base_floor = PAL['shadow_black']
    dark_stone = PAL['dark_rock']
    accent = PAL['deep_magic']
    tendril = PAL['magic_purple']
    glow = PAL['mana_violet']
    curse_glow = PAL['spell_glow']
    highlight = PAL['near_white']
    dark = PAL['shadow_black']

    tiles = []

    # --- Dark stone floor tiles (4 variants) ---
    for i in range(4):
        r = seeded_random(6001 + i)
        t = make_floor_tile(base_floor, dark_stone, accent, r)
        draw = ImageDraw.Draw(t)
        # Cursed glowing runes
        if r.random() < 0.5:
            rx, ry = r.randint(4, 11), r.randint(4, 11)
            for dx, dy in [(0, 0), (1, 0), (0, 1), (-1, 0), (0, -1)]:
                draw_pixel(draw, rx + dx, ry + dy, glow)
        tiles.append(t)

    # --- Shadow pool tiles (2 variants) ---
    for i in range(2):
        r = seeded_random(6010 + i)
        t = Image.new('RGBA', (TILE, TILE), base_floor)
        draw = ImageDraw.Draw(t)
        noise_fill(draw, 0, 0, 16, 16,
                   [base_floor, dark_stone, accent, tendril],
                   r, [0.35, 0.3, 0.2, 0.15])
        # Pulsing glow spots
        for _ in range(r.randint(2, 4)):
            gx, gy = r.randint(2, 13), r.randint(2, 13)
            draw_pixel(draw, gx, gy, glow)
            draw_pixel(draw, gx + 1, gy, accent)
        tiles.append(t)

    # --- Shadow stone wall tiles (4 variants) ---
    for i in range(4):
        r = seeded_random(6020 + i)
        t = make_wall_tile(dark_stone, dark, accent, tendril, r)
        draw = ImageDraw.Draw(t)
        # Shadow tendrils growing through wall
        for _ in range(r.randint(1, 2)):
            tx = r.randint(1, 14)
            ty = r.randint(0, 4)
            for step in range(r.randint(4, 8)):
                draw_pixel(draw, tx, ty + step, tendril)
                if r.random() < 0.3:
                    draw_pixel(draw, tx + r.choice([-1, 1]), ty + step, glow)
                tx += r.choice([-1, 0, 0, 1])
                tx = max(0, min(15, tx))
        tiles.append(t)

    # --- Edge tiles ---
    for side in ['t', 'b', 'l', 'r']:
        r = seeded_random(6030 + ord(side))
        tiles.append(make_edge_tile(base_floor, dark_stone, accent, r, side))

    # --- Corner tiles ---
    for d in ['tl', 'tr', 'bl', 'br']:
        r = seeded_random(6040 + hash(d) % 100)
        tiles.append(make_corner_tile(base_floor, dark_stone, accent, r, d))

    # --- Shadow-to-floor transition ---
    for i in range(2):
        r = seeded_random(6050 + i)
        t = Image.new('RGBA', (TILE, TILE), base_floor)
        draw = ImageDraw.Draw(t)
        noise_fill(draw, 0, 8, 16, 8,
                   [base_floor, accent, tendril],
                   r, [0.4, 0.35, 0.25])
        dither_rect(draw, 0, 6, 16, 4, base_floor, accent, r, 0.4)
        tiles.append(t)

    # --- Shadow tendril decoration ---
    t = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(t)
    r = seeded_random(6060)
    # Curling tendrils from bottom
    for start_x in [3, 8, 12]:
        tx = start_x
        for ty in range(15, 3, -1):
            draw_pixel(draw, tx, ty, tendril)
            if r.random() < 0.3:
                draw_pixel(draw, tx + r.choice([-1, 1]), ty, glow)
            tx += r.choice([-1, 0, 0, 1])
            tx = max(0, min(15, tx))
    tiles.append(t)

    # --- Cursed rune decoration ---
    t = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(t)
    # Glowing rune circle
    cx, cy = 7, 7
    for angle_pts in [(0, -4), (3, -3), (4, 0), (3, 3), (0, 4), (-3, 3), (-4, 0), (-3, -3)]:
        draw_pixel(draw, cx + angle_pts[0], cy + angle_pts[1], glow)
    # Inner cross
    for d in range(-2, 3):
        draw_pixel(draw, cx + d, cy, curse_glow)
        draw_pixel(draw, cx, cy + d, curse_glow)
    tiles.append(t)

    sheet = create_tileset_sheet(tiles)
    save(sheet, 'tiles', 'tilesets', 'tileset_dungeon_shadow_crypt.png')

    # --- Cursed glow effect VFX (32x32 spritesheet, 4 frames) ---
    vfx = Image.new('RGBA', (32 * 4, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(vfx)
    for frame in range(4):
        ox = frame * 32
        r = seeded_random(6070 + frame)
        # Pulsing glow particles
        radius = 6 + frame * 2
        for _ in range(12):
            angle_x = r.randint(-radius, radius)
            angle_y = r.randint(-radius, radius)
            if angle_x * angle_x + angle_y * angle_y <= radius * radius:
                px = ox + 16 + angle_x
                py = 16 + angle_y
                c = r.choice([glow, curse_glow, tendril])
                draw_pixel(draw, px, py, c)
    save(vfx, 'vfx', 'vfx_dungeon_shadow_curse.png')

    # --- Shadow tendril hazard sprite ---
    hazard = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(hazard)
    r = seeded_random(6080)
    # Tendrils reaching up from ground
    for start_x in [2, 5, 8, 11, 14]:
        tx = start_x
        height = r.randint(6, 12)
        for ty in range(15, 15 - height, -1):
            draw_pixel(draw, tx, ty, tendril)
            tx += r.choice([-1, 0, 1])
            tx = max(0, min(15, tx))
        draw_pixel(draw, tx, 15 - height, glow)
    save(hazard, 'sprites', 'dungeon', 'sprite_dun_hazard_shadow.png')

    print("  Shadow Crypt biome complete.")


# ---------------------------------------------------------------------------
# TREASURE ROOM DECORATIONS (per biome)
# ---------------------------------------------------------------------------

def generate_treasure_decorations():
    """Generate treasure room decoration sprites for each biome."""
    print("\n=== TREASURE ROOM DECORATIONS ===")

    biomes = {
        'fire': {
            'chest_base': PAL['deep_blood'],
            'chest_accent': PAL['fire_orange'],
            'chest_lock': PAL['gold'],
            'pedestal': PAL['dark_rock'],
            'loot_glow': PAL['ember'],
        },
        'ice': {
            'chest_base': PAL['ocean_blue'],
            'chest_accent': PAL['ice_blue'],
            'chest_lock': PAL['shimmer'],
            'pedestal': PAL['sky_blue'],
            'loot_glow': PAL['shimmer'],
        },
        'shadow': {
            'chest_base': PAL['dark_rock'],
            'chest_accent': PAL['magic_purple'],
            'chest_lock': PAL['spell_glow'],
            'pedestal': PAL['deep_magic'],
            'loot_glow': PAL['mana_violet'],
        },
    }

    for biome_name, colors in biomes.items():
        # --- Treasure chest (16x16) ---
        chest = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(chest)
        # Chest body
        draw.rectangle([2, 8, 13, 15], fill=colors['chest_base'])
        draw.rectangle([3, 9, 12, 14], fill=colors['chest_accent'])
        # Chest lid
        draw.rectangle([1, 5, 14, 8], fill=colors['chest_base'])
        draw.rectangle([2, 6, 13, 7], fill=colors['chest_accent'])
        # Lock
        draw_pixel(draw, 7, 10, colors['chest_lock'])
        draw_pixel(draw, 8, 10, colors['chest_lock'])
        draw_pixel(draw, 7, 11, colors['chest_lock'])
        draw_pixel(draw, 8, 11, colors['chest_lock'])
        # Highlight
        draw_pixel(draw, 3, 6, PAL['near_white'])
        save(chest, 'sprites', 'dungeon', f'sprite_dun_treasure_chest_{biome_name}.png')

        # --- Pedestal (16x16) ---
        ped = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(ped)
        # Pillar
        draw.rectangle([5, 4, 10, 15], fill=colors['pedestal'])
        draw.rectangle([6, 5, 9, 14], fill=colors['chest_accent'])
        # Top platform
        draw.rectangle([3, 3, 12, 4], fill=colors['pedestal'])
        # Base
        draw.rectangle([4, 14, 11, 15], fill=colors['pedestal'])
        # Glow on top
        draw_pixel(draw, 7, 2, colors['loot_glow'])
        draw_pixel(draw, 8, 2, colors['loot_glow'])
        draw_pixel(draw, 7, 1, colors['chest_lock'])
        save(ped, 'sprites', 'dungeon', f'sprite_dun_treasure_pedestal_{biome_name}.png')

        # --- Loot pile (16x16) ---
        loot = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(loot)
        r = seeded_random(7000 + hash(biome_name))
        # Pile of coins/gems
        for _ in range(20):
            px = r.randint(2, 13)
            py = r.randint(8, 15)
            c = r.choice([PAL['gold'], PAL['bright_yellow'], colors['chest_accent'],
                         colors['loot_glow']])
            draw_pixel(draw, px, py, c)
        # Top sparkle
        draw_pixel(draw, r.randint(4, 11), 7, PAL['pale_highlight'])
        draw_pixel(draw, r.randint(4, 11), 8, PAL['bright_yellow'])
        save(loot, 'sprites', 'dungeon', f'sprite_dun_treasure_loot_{biome_name}.png')

    print("  Treasure decorations complete.")


# ---------------------------------------------------------------------------
# DIFFICULTY TIER VISUAL INDICATORS
# ---------------------------------------------------------------------------

def generate_difficulty_indicators():
    """Generate difficulty tier border frames / overlay indicators."""
    print("\n=== DIFFICULTY TIER INDICATORS ===")

    tiers = {
        'normal': {
            'border': PAL['stone_gray'],
            'accent': PAL['mid_gray'],
            'icon_color': PAL['light_stone'],
            'bg': PAL['dark_rock'],
        },
        'hard': {
            'border': PAL['fire_orange'],
            'accent': PAL['enemy_red'],
            'icon_color': PAL['ember'],
            'bg': PAL['deep_blood'],
        },
        'nightmare': {
            'border': PAL['magic_purple'],
            'accent': PAL['deep_magic'],
            'icon_color': PAL['spell_glow'],
            'bg': PAL['shadow_black'],
        },
    }

    for tier_name, colors in tiers.items():
        # --- Border frame overlay (16x16, transparent center) ---
        frame = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame)
        # Outer border
        draw.rectangle([0, 0, 15, 0], fill=colors['border'])
        draw.rectangle([0, 15, 15, 15], fill=colors['border'])
        draw.rectangle([0, 0, 0, 15], fill=colors['border'])
        draw.rectangle([15, 0, 15, 15], fill=colors['border'])
        # Inner accent line
        draw.rectangle([1, 1, 14, 1], fill=colors['accent'])
        draw.rectangle([1, 14, 14, 14], fill=colors['accent'])
        draw.rectangle([1, 1, 1, 14], fill=colors['accent'])
        draw.rectangle([14, 1, 14, 14], fill=colors['accent'])
        # Corner diamonds
        for cx, cy in [(0, 0), (15, 0), (0, 15), (15, 15)]:
            draw_pixel(draw, cx, cy, colors['icon_color'])
        save(frame, 'ui', 'dungeon', f'ui_dungeon_tier_frame_{tier_name}.png')

        # --- Difficulty badge icon (16x16) ---
        badge = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(badge)
        # Shield shape
        draw.rectangle([3, 1, 12, 10], fill=colors['bg'])
        draw.polygon([(3, 10), (7, 14), (12, 10)], fill=colors['bg'])
        # Border
        draw.rectangle([3, 1, 12, 1], fill=colors['border'])
        draw.line([(3, 1), (3, 10)], fill=colors['border'])
        draw.line([(12, 1), (12, 10)], fill=colors['border'])
        draw.line([(3, 10), (7, 14)], fill=colors['border'])
        draw.line([(12, 10), (8, 14)], fill=colors['border'])
        # Tier symbol
        if tier_name == 'normal':
            # Single star
            draw_pixel(draw, 7, 5, colors['icon_color'])
            draw_pixel(draw, 8, 5, colors['icon_color'])
            draw_pixel(draw, 7, 6, colors['icon_color'])
            draw_pixel(draw, 8, 6, colors['icon_color'])
        elif tier_name == 'hard':
            # Double star / flame
            draw_pixel(draw, 7, 3, colors['icon_color'])
            draw_pixel(draw, 6, 5, colors['icon_color'])
            draw_pixel(draw, 8, 5, colors['icon_color'])
            draw_pixel(draw, 7, 7, colors['icon_color'])
            draw_pixel(draw, 7, 5, colors['border'])
        else:  # nightmare
            # Skull-like
            draw_pixel(draw, 6, 4, colors['icon_color'])
            draw_pixel(draw, 9, 4, colors['icon_color'])
            draw_pixel(draw, 7, 6, colors['icon_color'])
            draw_pixel(draw, 8, 6, colors['icon_color'])
            draw_pixel(draw, 6, 7, colors['icon_color'])
            draw_pixel(draw, 9, 7, colors['icon_color'])
            draw_pixel(draw, 7, 8, colors['accent'])
            draw_pixel(draw, 8, 8, colors['accent'])
        save(badge, 'ui', 'dungeon', f'ui_dungeon_tier_badge_{tier_name}.png')

    print("  Difficulty indicators complete.")


# ---------------------------------------------------------------------------
# BOSS CHAMBER ENTRANCE GATES
# ---------------------------------------------------------------------------

def generate_boss_gates():
    """Generate boss chamber entrance gate sprites per biome."""
    print("\n=== BOSS CHAMBER GATES ===")

    gate_configs = {
        'fire': {
            'stone': PAL['dark_rock'],
            'frame': PAL['deep_blood'],
            'accent': PAL['fire_orange'],
            'glow': PAL['ember'],
            'symbol': PAL['bright_yellow'],
        },
        'ice': {
            'stone': PAL['deep_ocean'],
            'frame': PAL['sky_blue'],
            'accent': PAL['ice_blue'],
            'glow': PAL['shimmer'],
            'symbol': PAL['near_white'],
        },
        'shadow': {
            'stone': PAL['shadow_black'],
            'frame': PAL['dark_rock'],
            'accent': PAL['magic_purple'],
            'glow': PAL['spell_glow'],
            'symbol': PAL['mana_violet'],
        },
    }

    for biome_name, c in gate_configs.items():
        # Boss gate is 32x32 (2x2 tiles)
        gate = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
        draw = ImageDraw.Draw(gate)

        # Stone frame
        draw.rectangle([0, 0, 31, 31], fill=c['stone'])
        draw.rectangle([2, 2, 29, 29], fill=c['frame'])

        # Door opening (dark center)
        draw.rectangle([6, 4, 25, 29], fill=PAL['shadow_black'])
        draw.rectangle([7, 5, 24, 28], fill=(8, 8, 8))

        # Door frame detail
        draw.rectangle([4, 2, 5, 29], fill=c['accent'])
        draw.rectangle([26, 2, 27, 29], fill=c['accent'])
        draw.rectangle([4, 2, 27, 3], fill=c['accent'])

        # Arch top
        for ax in range(6, 26):
            ay = max(2, int(4 - ((ax - 15.5) ** 2) / 30))
            draw_pixel(draw, ax, ay, c['accent'])

        # Glowing rune symbols on pillars
        for px_col in [4, 26]:
            for ry in [8, 14, 20, 26]:
                draw_pixel(draw, px_col, ry, c['glow'])
                draw_pixel(draw, px_col + 1 if px_col == 4 else px_col - 1, ry, c['glow'])

        # Central symbol above door
        cx, cy = 15, 1
        draw_pixel(draw, cx, cy, c['symbol'])
        draw_pixel(draw, cx + 1, cy, c['symbol'])
        draw_pixel(draw, cx - 1, cy + 1, c['glow'])
        draw_pixel(draw, cx + 2, cy + 1, c['glow'])
        draw_pixel(draw, cx, cy + 1, c['symbol'])
        draw_pixel(draw, cx + 1, cy + 1, c['symbol'])

        # Glow particles around gate
        r = seeded_random(8000 + hash(biome_name))
        for _ in range(6):
            gx, gy = r.randint(0, 31), r.randint(0, 31)
            if gate.getpixel((gx, gy))[3] == 0 or gate.getpixel((gx, gy))[:3] == PAL['shadow_black']:
                continue
            draw_pixel(draw, gx, gy, c['glow'])

        save(gate, 'sprites', 'dungeon', f'sprite_dun_boss_gate_{biome_name}.png')

    print("  Boss chamber gates complete.")


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    print("PIX-322: Generating dungeon biome assets...")
    generate_fire_caverns()
    generate_ice_tomb()
    generate_shadow_crypt()
    generate_treasure_decorations()
    generate_difficulty_indicators()
    generate_boss_gates()
    print("\nAll dungeon biome assets generated successfully!")

if __name__ == '__main__':
    main()
