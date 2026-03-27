#!/usr/bin/env python3
"""
Generate world map and fast-travel waystone art assets for PixelRealm.
All assets use the 32-color master palette, nearest-neighbor pixel art style.
"""
import struct
import zlib
import os
import random

# ── Master Palette ──
PALETTE = {
    'shadow_black':  (0x0d, 0x0d, 0x0d),
    'dark_rock':     (0x2b, 0x2b, 0x2b),
    'stone':         (0x4a, 0x4a, 0x4a),
    'mid_gray':      (0x6e, 0x6e, 0x6e),
    'light_stone':   (0x96, 0x96, 0x96),
    'pale_gray':     (0xc8, 0xc8, 0xc8),
    'near_white':    (0xf0, 0xf0, 0xf0),
    'deep_soil':     (0x3b, 0x20, 0x10),
    'rich_earth':    (0x6b, 0x3a, 0x1f),
    'dirt':          (0x8b, 0x5c, 0x2a),
    'sand':          (0xb8, 0x84, 0x3f),
    'desert_gold':   (0xd4, 0xa8, 0x5a),
    'pale_sand':     (0xe8, 0xd0, 0x8a),
    'deep_forest':   (0x1a, 0x3a, 0x1a),
    'forest_green':  (0x2d, 0x6e, 0x2d),
    'leaf_green':    (0x4c, 0x9b, 0x4c),
    'bright_grass':  (0x78, 0xc8, 0x78),
    'light_foliage': (0xa8, 0xe4, 0xa0),
    'deep_ocean':    (0x0a, 0x1a, 0x3a),
    'ocean_blue':    (0x1a, 0x4a, 0x8a),
    'sky_blue':      (0x2a, 0x7a, 0xc0),
    'player_blue':   (0x50, 0xa8, 0xe8),
    'ice_pale':      (0x90, 0xd0, 0xf8),
    'shimmer':       (0xc8, 0xf0, 0xff),
    'deep_blood':    (0x5a, 0x0a, 0x0a),
    'enemy_red':     (0xa0, 0x10, 0x10),
    'bright_red':    (0xd4, 0x20, 0x20),
    'fire_orange':   (0xf0, 0x60, 0x20),
    'ember':         (0xf8, 0xa0, 0x60),
    'dark_gold':     (0xa8, 0x70, 0x00),
    'gold':          (0xe8, 0xb8, 0x00),
    'bright_yellow': (0xff, 0xe0, 0x40),
    'pale_highlight':(0xff, 0xf8, 0xa0),
    'deep_magic':    (0x1a, 0x0a, 0x3a),
    'magic_purple':  (0x5a, 0x20, 0xa0),
    'mana_violet':   (0x90, 0x50, 0xe0),
    'spell_glow':    (0xd0, 0x90, 0xff),
}

P = PALETTE  # shorthand


def make_png(width, height, pixels):
    """Create a PNG file from a 2D list of (r, g, b, a) tuples."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter: none
        for x in range(width):
            r, g, b, a = pixels[y][x]
            raw += struct.pack('BBBB', r, g, b, a)

    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend


def rgba(color, alpha=255):
    """Convert palette color to RGBA tuple."""
    return (color[0], color[1], color[2], alpha)


def make_blank(w, h, color=(0, 0, 0, 0)):
    """Create blank pixel grid."""
    return [[color for _ in range(w)] for _ in range(h)]


def draw_rect(pixels, x1, y1, x2, y2, color):
    """Draw filled rectangle."""
    for y in range(max(0, y1), min(len(pixels), y2 + 1)):
        for x in range(max(0, x1), min(len(pixels[0]), x2 + 1)):
            pixels[y][x] = color


def draw_rect_outline(pixels, x1, y1, x2, y2, color):
    """Draw rectangle outline."""
    h, w = len(pixels), len(pixels[0])
    for x in range(max(0, x1), min(w, x2 + 1)):
        if 0 <= y1 < h: pixels[y1][x] = color
        if 0 <= y2 < h: pixels[y2][x] = color
    for y in range(max(0, y1), min(h, y2 + 1)):
        if 0 <= x1 < w: pixels[y][x1] = color
        if 0 <= x2 < w: pixels[y][x2] = color


def draw_pixel(pixels, x, y, color):
    """Set single pixel if in bounds."""
    if 0 <= y < len(pixels) and 0 <= x < len(pixels[0]):
        pixels[y][x] = color


def save_png(path, width, height, pixels):
    """Save pixel data as PNG."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(make_png(width, height, pixels))
    print(f"  Created: {os.path.basename(path)} ({width}x{height})")


# ── Asset output directory ──
BASE = '/host-workdir/companies/PixelForgeStudios/projects/PixelRealm/assets'
MAP_DIR = os.path.join(BASE, 'ui', 'map')
SPRITE_DIR = os.path.join(BASE, 'sprites')

# ════════════════════════════════════════════════════════════════════
# 1. ZONE ICON MARKERS (32x32 each)
#    Matching existing style: 1px border, filled with biome pattern
# ════════════════════════════════════════════════════════════════════

def gen_zone_icon(name, border_color, bg_color, pattern_func):
    """Generate a 32x32 zone icon with border and biome pattern."""
    size = 32
    px = make_blank(size, size)

    # Fill background
    draw_rect(px, 1, 1, size - 2, size - 2, rgba(bg_color))

    # Apply biome pattern
    pattern_func(px, size)

    # Draw border
    draw_rect_outline(px, 0, 0, size - 1, size - 1, rgba(border_color))

    path = os.path.join(MAP_DIR, f'ui_worldmap_zone_{name}.png')
    save_png(path, size, size, px)


def pattern_volcanic(px, size):
    """Lava flow cracks and ember glow."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Base obsidian
            px[y][x] = rgba(P['dark_rock'])
            # Lava cracks - sinuous horizontal lines
            if (y + x // 3) % 6 == 0 or (y - x // 4) % 7 == 0:
                px[y][x] = rgba(P['bright_red'])
            elif (y + x // 3) % 6 == 1 or (y - x // 4) % 7 == 1:
                px[y][x] = rgba(P['fire_orange'])
            # Ember spots
            if (x * 7 + y * 13) % 31 == 0:
                px[y][x] = rgba(P['bright_yellow'])


def pattern_swamp(px, size):
    """Murky water with moss patches."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Base murky dark green
            px[y][x] = rgba(P['deep_forest'])
            # Mud patches
            if (x * 5 + y * 3) % 11 < 3:
                px[y][x] = rgba(P['deep_soil'])
            # Moss highlights
            elif (x * 7 + y * 11) % 13 == 0:
                px[y][x] = rgba(P['forest_green'])
            # Murky water
            elif (y + (x // 4)) % 5 == 0:
                px[y][x] = rgba(P['deep_ocean'])


def pattern_ocean(px, size):
    """Wave patterns in deep blue."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Base ocean
            px[y][x] = rgba(P['ocean_blue'])
            # Wave crests
            wave = (y + (x * 3 + 2) // 5) % 6
            if wave == 0:
                px[y][x] = rgba(P['sky_blue'])
            elif wave == 1:
                px[y][x] = rgba(P['player_blue'])
            # Deep troughs
            elif wave == 4:
                px[y][x] = rgba(P['deep_ocean'])


def pattern_sky(px, size):
    """Cloud wisps on sky blue."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Sky gradient
            if y < size // 3:
                px[y][x] = rgba(P['player_blue'])
            elif y < 2 * size // 3:
                px[y][x] = rgba(P['sky_blue'])
            else:
                px[y][x] = rgba(P['player_blue'])
            # Cloud patches
            cx, cy = x - 8, y - 10
            if (cx * cx + cy * cy * 2) < 40:
                px[y][x] = rgba(P['shimmer'])
            cx2, cy2 = x - 20, y - 18
            if (cx2 * cx2 + cy2 * cy2 * 2) < 30:
                px[y][x] = rgba(P['near_white'])
            # Cloud wisps
            if (x + y * 2) % 9 == 0 and y > 5 and y < 27:
                px[y][x] = rgba(P['ice_pale'])


def pattern_void(px, size):
    """Dark void with purple rifts."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Base void black
            px[y][x] = rgba(P['shadow_black'])
            # Purple rift lines
            if abs((x - size // 2) * 2 + (y - size // 2)) % 8 < 2:
                px[y][x] = rgba(P['magic_purple'])
            elif abs((x - size // 2) - (y - size // 2) * 2) % 10 < 2:
                px[y][x] = rgba(P['mana_violet'])
            # Dimensional sparks
            if (x * 11 + y * 7) % 37 == 0:
                px[y][x] = rgba(P['spell_glow'])
            elif (x * 13 + y * 17) % 41 == 0:
                px[y][x] = rgba(P['deep_magic'])


def pattern_crystal(px, size):
    """Crystal formations in purple/gray."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Base stone
            px[y][x] = rgba(P['stone'])
            # Crystal formations - diagonal lines
            if (x + y) % 4 == 0:
                px[y][x] = rgba(P['mana_violet'])
            elif (x + y) % 4 == 1:
                px[y][x] = rgba(P['magic_purple'])
            # Crystal highlights
            if (x * 3 + y * 5) % 17 == 0:
                px[y][x] = rgba(P['spell_glow'])
            # Dark crevices
            elif (x * 7 + y * 3) % 19 == 0:
                px[y][x] = rgba(P['dark_rock'])


def pattern_dungeon(px, size):
    """Stone brick pattern."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Base stone
            px[y][x] = rgba(P['stone'])
            # Brick mortar lines
            row = (y - 1) % 6
            col = (x - 1 + (3 if ((y - 1) // 6) % 2 == 1 else 0)) % 8
            if row == 0 or col == 0:
                px[y][x] = rgba(P['dark_rock'])
            # Moss spots
            if (x * 11 + y * 7) % 23 == 0:
                px[y][x] = rgba(P['deep_forest'])


def pattern_plains(px, size):
    """Gentle rolling grass."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Base grass
            px[y][x] = rgba(P['bright_grass'])
            # Grass variation
            if (x + y * 3) % 5 == 0:
                px[y][x] = rgba(P['leaf_green'])
            elif (x * 2 + y) % 7 == 0:
                px[y][x] = rgba(P['light_foliage'])
            # Dirt path hints
            if (x * 5 + y * 3) % 29 == 0:
                px[y][x] = rgba(P['dirt'])


def pattern_celestial(px, size):
    """Golden starry sky."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Deep blue base
            px[y][x] = rgba(P['deep_ocean'])
            # Stars
            if (x * 7 + y * 13) % 19 == 0:
                px[y][x] = rgba(P['bright_yellow'])
            elif (x * 11 + y * 3) % 23 == 0:
                px[y][x] = rgba(P['gold'])
            elif (x * 3 + y * 7) % 31 == 0:
                px[y][x] = rgba(P['near_white'])
            # Golden aura bands
            if (y + x // 2) % 8 == 0:
                px[y][x] = rgba(P['dark_gold'])


def pattern_abyssal(px, size):
    """Deep dark underwater abyss."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Abyss black-blue
            px[y][x] = rgba(P['shadow_black'])
            # Faint bioluminescence
            if (x * 13 + y * 7) % 29 == 0:
                px[y][x] = rgba(P['ocean_blue'])
            elif (x * 3 + y * 17) % 37 == 0:
                px[y][x] = rgba(P['player_blue'])
            # Pressure lines
            if (y + x // 3) % 9 == 0:
                px[y][x] = rgba(P['deep_ocean'])


def pattern_dragonbone(px, size):
    """Bone-white wasteland with dragon remains."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Sandy bone base
            px[y][x] = rgba(P['pale_sand'])
            # Bone fragments
            if (x + y * 2) % 7 == 0:
                px[y][x] = rgba(P['near_white'])
            elif (x * 3 + y) % 5 == 0:
                px[y][x] = rgba(P['pale_gray'])
            # Dark cracks
            if (x * 7 + y * 11) % 23 == 0:
                px[y][x] = rgba(P['rich_earth'])
            # Scorched marks
            elif (x * 11 + y * 5) % 31 == 0:
                px[y][x] = rgba(P['dark_rock'])


def pattern_guild(px, size):
    """Banner/territory markers."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Stone base
            px[y][x] = rgba(P['light_stone'])
            # Territorial grid
            if x % 8 == 0 or y % 8 == 0:
                px[y][x] = rgba(P['gold'])
            # Banner colors
            qx, qy = (x - 1) // 8, (y - 1) // 8
            colors = [P['enemy_red'], P['ocean_blue'], P['forest_green'],
                      P['magic_purple'], P['fire_orange'], P['bright_yellow']]
            idx = (qx + qy * 4) % len(colors)
            if (x % 8 > 2) and (x % 8 < 6) and (y % 8 > 2) and (y % 8 < 6):
                px[y][x] = rgba(colors[idx])


def pattern_seasonal(px, size):
    """Rotating seasonal—autumn leaves theme."""
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            # Warm autumn base
            px[y][x] = rgba(P['sand'])
            # Leaf scatter
            if (x * 7 + y * 5) % 11 < 2:
                px[y][x] = rgba(P['enemy_red'])
            elif (x * 3 + y * 11) % 13 < 2:
                px[y][x] = rgba(P['fire_orange'])
            elif (x * 11 + y * 3) % 17 < 2:
                px[y][x] = rgba(P['bright_yellow'])
            elif (x * 5 + y * 7) % 19 == 0:
                px[y][x] = rgba(P['forest_green'])


print("=== Generating Zone Icon Markers (32x32) ===")

zone_icons = [
    ('volcanic',   P['deep_blood'],  P['dark_rock'],    pattern_volcanic),
    ('swamp',      P['deep_forest'], P['deep_forest'],  pattern_swamp),
    ('ocean',      P['deep_ocean'],  P['ocean_blue'],   pattern_ocean),
    ('sky',        P['ocean_blue'],  P['sky_blue'],     pattern_sky),
    ('void',       P['deep_magic'],  P['shadow_black'], pattern_void),
    ('crystal',    P['magic_purple'],P['stone'],        pattern_crystal),
    ('dungeon',    P['dark_rock'],   P['stone'],        pattern_dungeon),
    ('plains',     P['forest_green'],P['bright_grass'], pattern_plains),
    ('celestial',  P['dark_gold'],   P['deep_ocean'],   pattern_celestial),
    ('abyssal',    P['deep_ocean'],  P['shadow_black'], pattern_abyssal),
    ('dragonbone', P['rich_earth'],  P['pale_sand'],    pattern_dragonbone),
    ('guild',      P['dark_gold'],   P['light_stone'],  pattern_guild),
    ('seasonal',   P['dark_gold'],   P['sand'],         pattern_seasonal),
]

for name, border, bg, pattern_fn in zone_icons:
    gen_zone_icon(name, border, bg, pattern_fn)


# ════════════════════════════════════════════════════════════════════
# 2. WAYSTONE SPRITES
# ════════════════════════════════════════════════════════════════════
print("\n=== Generating Waystone Sprites ===")

def gen_waystone_overworld():
    """16x24 waystone sprite for in-zone placement (same as character height)."""
    w, h = 16, 24
    px = make_blank(w, h)

    # Stone base pedestal (bottom)
    draw_rect(px, 3, 20, 12, 23, rgba(P['stone']))
    draw_rect(px, 4, 21, 11, 22, rgba(P['mid_gray']))
    # Pedestal highlight
    for x in range(4, 12):
        draw_pixel(px, x, 20, rgba(P['light_stone']))

    # Stone pillar
    draw_rect(px, 5, 6, 10, 19, rgba(P['stone']))
    draw_rect(px, 6, 7, 9, 18, rgba(P['mid_gray']))
    # Left edge highlight
    for y in range(6, 20):
        draw_pixel(px, 5, y, rgba(P['light_stone']))

    # Pointed top
    draw_rect(px, 6, 4, 9, 5, rgba(P['stone']))
    draw_rect(px, 7, 3, 8, 3, rgba(P['light_stone']))
    draw_pixel(px, 7, 2, rgba(P['pale_gray']))

    # Glowing rune (cyan = player/friendly)
    draw_pixel(px, 7, 10, rgba(P['player_blue']))
    draw_pixel(px, 8, 10, rgba(P['player_blue']))
    draw_pixel(px, 7, 12, rgba(P['player_blue']))
    draw_pixel(px, 8, 12, rgba(P['player_blue']))
    draw_pixel(px, 6, 11, rgba(P['sky_blue']))
    draw_pixel(px, 9, 11, rgba(P['sky_blue']))
    draw_pixel(px, 7, 14, rgba(P['sky_blue']))
    draw_pixel(px, 8, 14, rgba(P['sky_blue']))
    # Center glow
    draw_pixel(px, 7, 11, rgba(P['shimmer']))
    draw_pixel(px, 8, 11, rgba(P['shimmer']))

    save_png(os.path.join(SPRITE_DIR, 'waystone', 'sprite_waystone_overworld.png'), w, h, px)


def gen_waystone_map_icon():
    """16x16 waystone icon for world map placement."""
    size = 16
    px = make_blank(size, size)

    # Diamond shape in cyan
    center = 7
    for d in range(6):
        c = rgba(P['player_blue']) if d > 1 else rgba(P['shimmer'])
        draw_pixel(px, center, center - d, c)
        draw_pixel(px, center + 1, center - d, c)
        draw_pixel(px, center, center + d + 1, c)
        draw_pixel(px, center + 1, center + d + 1, c)
        draw_pixel(px, center - d, center, c)
        draw_pixel(px, center + d + 1, center, c)
        draw_pixel(px, center - d, center + 1, c)
        draw_pixel(px, center + d + 1, center + 1, c)

    # Inner bright core
    draw_rect(px, 6, 6, 9, 9, rgba(P['shimmer']))
    draw_rect(px, 7, 7, 8, 8, rgba(P['near_white']))

    # Outer glow ring
    for d in range(5):
        angle_offsets = [(d, -d-1), (d+1, d), (-d, d+1), (-d-1, -d)]
        for ox, oy in angle_offsets:
            draw_pixel(px, center + ox, center + oy, rgba(P['sky_blue'], 180))

    save_png(os.path.join(MAP_DIR, 'ui_worldmap_waystone.png'), size, size, px)


def gen_waystone_active():
    """16x24 active/glowing waystone variant."""
    w, h = 16, 24
    px = make_blank(w, h)

    # Stone base pedestal
    draw_rect(px, 3, 20, 12, 23, rgba(P['stone']))
    draw_rect(px, 4, 21, 11, 22, rgba(P['mid_gray']))
    for x in range(4, 12):
        draw_pixel(px, x, 20, rgba(P['light_stone']))

    # Stone pillar
    draw_rect(px, 5, 6, 10, 19, rgba(P['stone']))
    draw_rect(px, 6, 7, 9, 18, rgba(P['mid_gray']))
    for y in range(6, 20):
        draw_pixel(px, 5, y, rgba(P['light_stone']))

    # Pointed top
    draw_rect(px, 6, 4, 9, 5, rgba(P['stone']))
    draw_rect(px, 7, 3, 8, 3, rgba(P['light_stone']))
    draw_pixel(px, 7, 2, rgba(P['pale_gray']))

    # ACTIVE glowing runes (brighter, more spread)
    for y in range(8, 18):
        if y % 2 == 0:
            draw_pixel(px, 6, y, rgba(P['player_blue']))
            draw_pixel(px, 9, y, rgba(P['player_blue']))
        draw_pixel(px, 7, y, rgba(P['shimmer']))
        draw_pixel(px, 8, y, rgba(P['shimmer']))

    # Top glow
    draw_pixel(px, 7, 1, rgba(P['player_blue'], 128))
    draw_pixel(px, 8, 1, rgba(P['player_blue'], 128))
    draw_pixel(px, 6, 2, rgba(P['sky_blue'], 100))
    draw_pixel(px, 9, 2, rgba(P['sky_blue'], 100))

    # Ground glow
    for x in range(2, 14):
        draw_pixel(px, x, 23, rgba(P['sky_blue'], 80))

    save_png(os.path.join(SPRITE_DIR, 'waystone', 'sprite_waystone_active.png'), w, h, px)


gen_waystone_overworld()
gen_waystone_map_icon()
gen_waystone_active()


# ════════════════════════════════════════════════════════════════════
# 3. MAP FRAME BORDER (for full world map view)
# ════════════════════════════════════════════════════════════════════
print("\n=== Generating Map Frame Border ===")

def gen_map_frame():
    """280x210 map frame with ornate wood/gold border for the world map."""
    w, h = 280, 210
    px = make_blank(w, h)
    border = 12  # border thickness

    # Outer dark wood border
    draw_rect(px, 0, 0, w - 1, h - 1, rgba(P['deep_soil']))

    # Gold trim outer
    draw_rect_outline(px, 1, 1, w - 2, h - 2, rgba(P['dark_gold']))
    draw_rect_outline(px, 2, 2, w - 3, h - 3, rgba(P['gold']))

    # Wood fill
    draw_rect(px, 3, 3, w - 4, h - 4, rgba(P['rich_earth']))

    # Gold trim inner
    draw_rect_outline(px, border - 2, border - 2, w - border + 1, h - border + 1, rgba(P['gold']))
    draw_rect_outline(px, border - 1, border - 1, w - border, h - border, rgba(P['dark_gold']))

    # Inner transparent area (map shows through)
    draw_rect(px, border, border, w - border - 1, h - border - 1, (0, 0, 0, 0))

    # Corner ornaments (gold diamonds)
    corners = [(6, 6), (w - 7, 6), (6, h - 7), (w - 7, h - 7)]
    for cx, cy in corners:
        draw_pixel(px, cx, cy, rgba(P['bright_yellow']))
        draw_pixel(px, cx - 1, cy, rgba(P['gold']))
        draw_pixel(px, cx + 1, cy, rgba(P['gold']))
        draw_pixel(px, cx, cy - 1, rgba(P['gold']))
        draw_pixel(px, cx, cy + 1, rgba(P['gold']))

    # Wood grain texture on border
    for y in range(4, border - 2):
        for x in range(4 + y % 3, w - 4, 6):
            draw_pixel(px, x, y, rgba(P['dirt']))
    for y in range(h - border + 2, h - 4):
        for x in range(4 + y % 3, w - 4, 6):
            draw_pixel(px, x, y, rgba(P['dirt']))
    for x in range(4, border - 2):
        for y in range(4 + x % 3, h - 4, 6):
            draw_pixel(px, x, y, rgba(P['dirt']))
    for x in range(w - border + 2, w - 4):
        for y in range(4 + x % 3, h - 4, 6):
            draw_pixel(px, x, y, rgba(P['dirt']))

    save_png(os.path.join(MAP_DIR, 'ui_worldmap_frame.png'), w, h, px)


gen_map_frame()


# ════════════════════════════════════════════════════════════════════
# 4. COMPASS ROSE (already exists at 32x32, create enhanced 48x48)
# ════════════════════════════════════════════════════════════════════
print("\n=== Generating Enhanced Compass Rose ===")

def gen_compass_rose():
    """48x48 detailed compass rose with N/S/E/W markings."""
    size = 48
    cx, cy = size // 2, size // 2
    px = make_blank(size, size)

    # Outer ring
    for a in range(360):
        import math
        rad = math.radians(a)
        for r in range(18, 21):
            x = int(cx + r * math.cos(rad))
            y = int(cy + r * math.sin(rad))
            draw_pixel(px, x, y, rgba(P['dark_gold']))

    # Inner ring
    for a in range(360):
        rad = math.radians(a)
        for r in range(15, 17):
            x = int(cx + r * math.cos(rad))
            y = int(cy + r * math.sin(rad))
            draw_pixel(px, x, y, rgba(P['gold']))

    # Cardinal points (N, S, E, W) - pointed triangles
    # North
    for d in range(12):
        w_at = max(1, (12 - d) // 3)
        for dx in range(-w_at, w_at + 1):
            draw_pixel(px, cx + dx, cy - d - 3, rgba(P['gold']))
        if d < 4:
            draw_pixel(px, cx, cy - d - 3, rgba(P['bright_yellow']))

    # South
    for d in range(12):
        w_at = max(1, (12 - d) // 3)
        for dx in range(-w_at, w_at + 1):
            draw_pixel(px, cx + dx, cy + d + 3, rgba(P['dark_gold']))
        if d < 4:
            draw_pixel(px, cx, cy + d + 3, rgba(P['gold']))

    # East
    for d in range(12):
        h_at = max(1, (12 - d) // 3)
        for dy in range(-h_at, h_at + 1):
            draw_pixel(px, cx + d + 3, cy + dy, rgba(P['gold']))
        if d < 4:
            draw_pixel(px, cx + d + 3, cy, rgba(P['bright_yellow']))

    # West
    for d in range(12):
        h_at = max(1, (12 - d) // 3)
        for dy in range(-h_at, h_at + 1):
            draw_pixel(px, cx - d - 3, cy + dy, rgba(P['dark_gold']))
        if d < 4:
            draw_pixel(px, cx - d - 3, cy, rgba(P['gold']))

    # Center jewel
    draw_rect(px, cx - 2, cy - 2, cx + 2, cy + 2, rgba(P['gold']))
    draw_rect(px, cx - 1, cy - 1, cx + 1, cy + 1, rgba(P['bright_yellow']))
    draw_pixel(px, cx, cy, rgba(P['near_white']))

    # N label (small pixel letter)
    # Simple 3x3 N at top
    n_y = 1
    n_x = cx - 1
    draw_pixel(px, n_x, n_y, rgba(P['near_white']))
    draw_pixel(px, n_x, n_y + 1, rgba(P['near_white']))
    draw_pixel(px, n_x, n_y + 2, rgba(P['near_white']))
    draw_pixel(px, n_x + 1, n_y + 1, rgba(P['near_white']))
    draw_pixel(px, n_x + 2, n_y, rgba(P['near_white']))
    draw_pixel(px, n_x + 2, n_y + 1, rgba(P['near_white']))
    draw_pixel(px, n_x + 2, n_y + 2, rgba(P['near_white']))

    save_png(os.path.join(MAP_DIR, 'ui_worldmap_compass_large.png'), size, size, px)


gen_compass_rose()


# ════════════════════════════════════════════════════════════════════
# 5. FOG OF WAR TEXTURE (tileable)
# ════════════════════════════════════════════════════════════════════
print("\n=== Generating Fog of War Textures ===")

def gen_fog_dense():
    """32x32 dense fog (fully unexplored)."""
    size = 32
    px = make_blank(size, size)
    for y in range(size):
        for x in range(size):
            # Dense dithered fog
            if (x + y) % 2 == 0:
                px[y][x] = rgba(P['shadow_black'], 220)
            else:
                px[y][x] = rgba(P['dark_rock'], 200)
    save_png(os.path.join(MAP_DIR, 'ui_worldmap_fog_dense.png'), size, size, px)


def gen_fog_light():
    """32x32 light fog (partially explored, semi-transparent)."""
    size = 32
    px = make_blank(size, size)
    for y in range(size):
        for x in range(size):
            # Light dithered fog with more transparency
            if (x + y) % 2 == 0:
                px[y][x] = rgba(P['shadow_black'], 100)
            elif (x + y * 3) % 4 == 0:
                px[y][x] = rgba(P['dark_rock'], 80)
            # else transparent
    save_png(os.path.join(MAP_DIR, 'ui_worldmap_fog_light.png'), size, size, px)


def gen_fog_edge():
    """32x32 fog edge transition (top-to-bottom fade)."""
    size = 32
    px = make_blank(size, size)
    for y in range(size):
        alpha = max(0, 200 - (y * 200 // size))
        for x in range(size):
            if (x + y) % 2 == 0:
                px[y][x] = rgba(P['shadow_black'], alpha)
            elif alpha > 100:
                px[y][x] = rgba(P['dark_rock'], alpha - 60)
    save_png(os.path.join(MAP_DIR, 'ui_worldmap_fog_edge.png'), size, size, px)


gen_fog_dense()
gen_fog_light()
gen_fog_edge()


# ════════════════════════════════════════════════════════════════════
# 6. PLAYER POSITION & DESTINATION MARKERS
# ════════════════════════════════════════════════════════════════════
print("\n=== Generating Map Markers ===")

def gen_player_marker():
    """12x12 player position marker (cyan arrow pointing down)."""
    size = 12
    px = make_blank(size, size)

    # Downward-pointing chevron in player blue
    # Top of arrow
    draw_pixel(px, 5, 1, rgba(P['shimmer']))
    draw_pixel(px, 6, 1, rgba(P['shimmer']))
    # Arrow body
    for d in range(5):
        draw_pixel(px, 5 - d, 2 + d, rgba(P['player_blue']))
        draw_pixel(px, 6 + d, 2 + d, rgba(P['player_blue']))
        # Fill inside
        for x in range(5 - d + 1, 6 + d):
            draw_pixel(px, x, 2 + d, rgba(P['sky_blue']))
    # Center bright core
    draw_pixel(px, 5, 3, rgba(P['shimmer']))
    draw_pixel(px, 6, 3, rgba(P['shimmer']))
    draw_pixel(px, 5, 4, rgba(P['near_white']))
    draw_pixel(px, 6, 4, rgba(P['near_white']))
    # Bottom point
    draw_pixel(px, 5, 7, rgba(P['player_blue']))
    draw_pixel(px, 6, 7, rgba(P['player_blue']))
    draw_pixel(px, 5, 8, rgba(P['sky_blue']))
    draw_pixel(px, 6, 8, rgba(P['sky_blue']))

    save_png(os.path.join(MAP_DIR, 'ui_worldmap_marker_player.png'), size, size, px)


def gen_destination_marker():
    """12x12 destination marker (gold flag/pin)."""
    size = 12
    px = make_blank(size, size)

    # Flag pole
    for y in range(2, 11):
        draw_pixel(px, 3, y, rgba(P['dark_gold']))

    # Flag triangle
    draw_rect(px, 4, 2, 9, 3, rgba(P['bright_yellow']))
    draw_rect(px, 4, 4, 8, 5, rgba(P['gold']))
    draw_rect(px, 4, 6, 7, 6, rgba(P['bright_yellow']))

    # Pin base
    draw_pixel(px, 2, 10, rgba(P['dark_gold']))
    draw_pixel(px, 3, 10, rgba(P['gold']))
    draw_pixel(px, 4, 10, rgba(P['dark_gold']))
    draw_pixel(px, 3, 11, rgba(P['bright_yellow']))

    save_png(os.path.join(MAP_DIR, 'ui_worldmap_marker_destination.png'), size, size, px)


def gen_waystone_marker():
    """12x12 waystone map marker (distinct from full waystone sprite)."""
    size = 12
    px = make_blank(size, size)

    # Diamond shape
    diamond_pts = [(5, 1), (6, 1),
                   (4, 2), (7, 2),
                   (3, 3), (8, 3),
                   (3, 4), (8, 4),
                   (3, 5), (8, 5),
                   (3, 6), (8, 6),
                   (4, 7), (7, 7),
                   (5, 8), (6, 8)]
    for x, y in diamond_pts:
        draw_pixel(px, x, y, rgba(P['player_blue']))

    # Fill inside
    fills = [(5, 2), (6, 2),
             (4, 3), (5, 3), (6, 3), (7, 3),
             (4, 4), (5, 4), (6, 4), (7, 4),
             (4, 5), (5, 5), (6, 5), (7, 5),
             (4, 6), (5, 6), (6, 6), (7, 6),
             (5, 7), (6, 7)]
    for x, y in fills:
        draw_pixel(px, x, y, rgba(P['sky_blue']))

    # Center glow
    draw_pixel(px, 5, 4, rgba(P['shimmer']))
    draw_pixel(px, 6, 4, rgba(P['shimmer']))
    draw_pixel(px, 5, 5, rgba(P['near_white']))
    draw_pixel(px, 6, 5, rgba(P['near_white']))

    save_png(os.path.join(MAP_DIR, 'ui_worldmap_marker_waystone.png'), size, size, px)


def gen_quest_marker():
    """12x12 quest marker (gold exclamation)."""
    size = 12
    px = make_blank(size, size)

    # Exclamation mark
    for y in range(2, 8):
        draw_pixel(px, 5, y, rgba(P['bright_yellow']))
        draw_pixel(px, 6, y, rgba(P['gold']))
    # Dot
    draw_pixel(px, 5, 9, rgba(P['bright_yellow']))
    draw_pixel(px, 6, 9, rgba(P['gold']))

    save_png(os.path.join(MAP_DIR, 'ui_worldmap_marker_quest.png'), size, size, px)


gen_player_marker()
gen_destination_marker()
gen_waystone_marker()
gen_quest_marker()


# ════════════════════════════════════════════════════════════════════
# 7. ZONE LABEL BANNERS / RIBBONS
# ════════════════════════════════════════════════════════════════════
print("\n=== Generating Zone Label Banners ===")

def gen_zone_banner():
    """80x16 zone label banner/ribbon (9-slice scalable)."""
    w, h = 80, 16
    px = make_blank(w, h)

    # Ribbon body (parchment)
    draw_rect(px, 4, 2, w - 5, h - 3, rgba(P['pale_sand']))
    draw_rect(px, 4, 3, w - 5, h - 4, rgba(P['desert_gold']))

    # Top highlight
    for x in range(4, w - 4):
        draw_pixel(px, x, 2, rgba(P['pale_highlight']))

    # Bottom shadow
    for x in range(4, w - 4):
        draw_pixel(px, x, h - 3, rgba(P['sand']))

    # Gold border
    draw_rect_outline(px, 3, 1, w - 4, h - 2, rgba(P['dark_gold']))

    # Ribbon tail left
    draw_pixel(px, 0, h // 2 - 2, rgba(P['dark_gold']))
    draw_pixel(px, 1, h // 2 - 1, rgba(P['dark_gold']))
    draw_pixel(px, 2, h // 2, rgba(P['dark_gold']))
    draw_pixel(px, 1, h // 2 + 1, rgba(P['dark_gold']))
    draw_pixel(px, 0, h // 2 + 2, rgba(P['dark_gold']))
    # Fill tail
    draw_pixel(px, 1, h // 2 - 2, rgba(P['desert_gold']))
    draw_pixel(px, 2, h // 2 - 2, rgba(P['desert_gold']))
    draw_pixel(px, 2, h // 2 - 1, rgba(P['desert_gold']))
    draw_pixel(px, 3, h // 2, rgba(P['pale_sand']))
    draw_pixel(px, 2, h // 2 + 1, rgba(P['desert_gold']))
    draw_pixel(px, 1, h // 2 + 2, rgba(P['desert_gold']))
    draw_pixel(px, 2, h // 2 + 2, rgba(P['desert_gold']))

    # Ribbon tail right (mirrored)
    draw_pixel(px, w - 1, h // 2 - 2, rgba(P['dark_gold']))
    draw_pixel(px, w - 2, h // 2 - 1, rgba(P['dark_gold']))
    draw_pixel(px, w - 3, h // 2, rgba(P['dark_gold']))
    draw_pixel(px, w - 2, h // 2 + 1, rgba(P['dark_gold']))
    draw_pixel(px, w - 1, h // 2 + 2, rgba(P['dark_gold']))
    draw_pixel(px, w - 2, h // 2 - 2, rgba(P['desert_gold']))
    draw_pixel(px, w - 3, h // 2 - 2, rgba(P['desert_gold']))
    draw_pixel(px, w - 3, h // 2 - 1, rgba(P['desert_gold']))
    draw_pixel(px, w - 4, h // 2, rgba(P['pale_sand']))
    draw_pixel(px, w - 3, h // 2 + 1, rgba(P['desert_gold']))
    draw_pixel(px, w - 2, h // 2 + 2, rgba(P['desert_gold']))
    draw_pixel(px, w - 3, h // 2 + 2, rgba(P['desert_gold']))

    save_png(os.path.join(MAP_DIR, 'ui_worldmap_banner_zone.png'), w, h, px)


def gen_zone_banner_small():
    """48x12 small zone label for compact labels."""
    w, h = 48, 12
    px = make_blank(w, h)

    # Simple parchment ribbon
    draw_rect(px, 2, 1, w - 3, h - 2, rgba(P['desert_gold']))
    draw_rect(px, 3, 2, w - 4, h - 3, rgba(P['pale_sand']))
    draw_rect_outline(px, 1, 0, w - 2, h - 1, rgba(P['dark_gold']))

    # Top highlight
    for x in range(3, w - 3):
        draw_pixel(px, x, 2, rgba(P['pale_highlight']))

    save_png(os.path.join(MAP_DIR, 'ui_worldmap_banner_zone_small.png'), w, h, px)


gen_zone_banner()
gen_zone_banner_small()


# ════════════════════════════════════════════════════════════════════
# 8. ILLUSTRATED WORLD MAP BACKGROUND (320x180 — game canvas size)
# ════════════════════════════════════════════════════════════════════
print("\n=== Generating Illustrated World Map Background ===")

def gen_world_map_illustrated():
    """320x180 illustrated world map with 19 zone regions on parchment."""
    w, h = 320, 180
    random.seed(42)  # deterministic
    px = make_blank(w, h)

    # Parchment base with subtle variation
    for y in range(h):
        for x in range(w):
            base = P['desert_gold']
            # Add parchment texture variation
            noise = ((x * 7 + y * 13) % 5) - 2
            r = max(0, min(255, base[0] + noise * 3))
            g = max(0, min(255, base[1] + noise * 3))
            b = max(0, min(255, base[2] + noise * 2))
            px[y][x] = (r, g, b, 255)

    # Parchment edge darkening (vignette)
    for y in range(h):
        for x in range(w):
            edge_dist = min(x, y, w - 1 - x, h - 1 - y)
            if edge_dist < 8:
                factor = edge_dist / 8.0
                r, g, b, a = px[y][x]
                br = P['sand']
                r = int(r * factor + br[0] * (1 - factor))
                g = int(g * factor + br[1] * (1 - factor))
                b = int(b * factor + br[2] * (1 - factor))
                px[y][x] = (r, g, b, 255)

    # ── Zone Regions ──
    # Each zone gets a colored region on the map
    # Layout: rough geographic positions on 320x180

    zones = [
        # (name, x_center, y_center, radius, primary_color, accent_color)
        # Tier 1 - Center/South (starting areas)
        ('Verdant Hollow',    80,  90,  20, P['forest_green'],  P['leaf_green']),
        ('Dusty Trail',       130, 100, 18, P['sand'],          P['dirt']),
        ('Ironveil Ruins',    110, 65,  15, P['stone'],         P['mid_gray']),
        ('Saltmarsh Harbor',  50,  130, 20, P['ocean_blue'],    P['sky_blue']),

        # Tier 2 - Expanding outward
        ('Forest Deep',       40,  60,  22, P['deep_forest'],   P['forest_green']),
        ('Ember Waste',       200, 130, 22, P['bright_red'],    P['fire_orange']),
        ('Frostpeak Highlands',260, 30, 22, P['ice_pale'],      P['shimmer']),
        ('Shadow Bog',        30,  30,  18, P['deep_forest'],   P['deep_soil']),
        ('Sky Reaches',       160, 20,  20, P['sky_blue'],      P['player_blue']),

        # Tier 3 - Edges and endgame
        ('Void Rift',         290, 90,  16, P['magic_purple'],  P['mana_violet']),
        ('Sunken Titan Trench', 100, 155, 18, P['deep_ocean'],  P['ocean_blue']),
        ('Guild Territories', 180, 80,  18, P['light_stone'],   P['gold']),
        ('Season Arc',        220, 60,  16, P['ember'],         P['bright_yellow']),

        # Late zones
        ('Celestial Spire',   270, 150, 14, P['bright_yellow'], P['gold']),
        ('Abyssal Depths',    15,  150, 14, P['shadow_black'],  P['deep_ocean']),
        ('Dragonbone Wastes', 240, 100, 18, P['pale_sand'],     P['pale_gray']),
        ('Void Sanctum',      300, 50,  12, P['deep_magic'],    P['magic_purple']),
        ('Eclipsed Throne',   160, 150, 15, P['dark_rock'],     P['gold']),
        ('Astral Pinnacle',   160, 85,  12, P['bright_yellow'], P['spell_glow']),
    ]

    # Draw zone regions as colored patches
    for name, cx, cy, radius, primary, accent in zones:
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                dist_sq = dx * dx + dy * dy
                if dist_sq <= radius * radius:
                    x, y = cx + dx, cy + dy
                    if 0 <= x < w and 0 <= y < h:
                        # Organic edge with noise
                        edge_noise = ((x * 7 + y * 13) % 5) - 2
                        if dist_sq <= (radius - 2 + edge_noise) ** 2:
                            # Inner zone color
                            if (x + y) % 3 == 0:
                                px[y][x] = rgba(accent)
                            else:
                                px[y][x] = rgba(primary)
                        elif dist_sq <= (radius + edge_noise) ** 2:
                            # Edge blend
                            px[y][x] = rgba(accent)

    # Draw coastlines/water for ocean zones
    # Ocean border around the map edges (south and west)
    for y in range(h):
        for x in range(w):
            # South ocean strip
            if y > h - 12:
                depth = y - (h - 12)
                if (x + y) % 3 == 0:
                    px[y][x] = rgba(P['ocean_blue'])
                else:
                    px[y][x] = rgba(P['deep_ocean'])
            # West ocean edge
            if x < 6:
                if (x + y) % 3 == 0:
                    px[y][x] = rgba(P['ocean_blue'])
                else:
                    px[y][x] = rgba(P['deep_ocean'])

    # Mountain range indicators (small triangles)
    mountains = [(250, 25), (255, 28), (260, 24), (265, 30),  # Frostpeak
                 (105, 60), (115, 58),  # Ironveil
                 (195, 125), (205, 128), (210, 123)]  # Ember Waste
    for mx, my in mountains:
        if 0 <= mx < w and 0 <= my < h:
            draw_pixel(px, mx, my - 2, rgba(P['mid_gray']))
            draw_pixel(px, mx - 1, my - 1, rgba(P['stone']))
            draw_pixel(px, mx + 1, my - 1, rgba(P['stone']))
            draw_pixel(px, mx - 2, my, rgba(P['mid_gray']))
            draw_pixel(px, mx, my, rgba(P['light_stone']))
            draw_pixel(px, mx + 2, my, rgba(P['mid_gray']))
            draw_pixel(px, mx, my - 3, rgba(P['near_white']))

    # River flowing from mountains through forest
    river_points = [(110, 62), (108, 68), (105, 75), (100, 82),
                    (95, 88), (88, 95), (80, 100), (72, 108),
                    (65, 115), (58, 122), (52, 128)]
    for rx, ry in river_points:
        draw_pixel(px, rx, ry, rgba(P['sky_blue']))
        draw_pixel(px, rx + 1, ry, rgba(P['ocean_blue']))
        draw_pixel(px, rx, ry + 1, rgba(P['sky_blue']))

    # Road/path network (dotted lines connecting towns)
    # Main road: Verdant Hollow -> Dusty Trail -> Ironveil
    road_segments = [
        (80, 90, 130, 100),    # Verdant -> Dusty
        (110, 65, 130, 100),   # Ironveil -> Dusty
        (80, 90, 50, 130),     # Verdant -> Harbor
        (130, 100, 180, 80),   # Dusty -> Guild
        (180, 80, 220, 60),    # Guild -> Season
    ]
    for x1, y1, x2, y2 in road_segments:
        steps = max(abs(x2 - x1), abs(y2 - y1))
        if steps == 0:
            continue
        for s in range(steps):
            rx = x1 + (x2 - x1) * s // steps
            ry = y1 + (y2 - y1) * s // steps
            if s % 3 < 2:  # dotted
                draw_pixel(px, rx, ry, rgba(P['dirt']))

    save_png(os.path.join(MAP_DIR, 'ui_worldmap_illustrated.png'), w, h, px)


gen_world_map_illustrated()


# ════════════════════════════════════════════════════════════════════
# 9. FAST-TRAVEL UI PANEL
# ════════════════════════════════════════════════════════════════════
print("\n=== Generating Fast-Travel UI Panel ===")

def gen_fast_travel_panel():
    """180x200 fast-travel waystone selection panel."""
    w, h = 180, 200
    px = make_blank(w, h)

    # Dark panel background
    draw_rect(px, 0, 0, w - 1, h - 1, rgba(P['shadow_black']))
    draw_rect(px, 1, 1, w - 2, h - 2, rgba(P['dark_rock']))
    draw_rect(px, 2, 2, w - 3, h - 3, rgba(P['deep_soil']))

    # Gold border
    draw_rect_outline(px, 0, 0, w - 1, h - 1, rgba(P['dark_gold']))
    draw_rect_outline(px, 1, 1, w - 2, h - 2, rgba(P['gold']))

    # Title bar area
    draw_rect(px, 3, 3, w - 4, 18, rgba(P['rich_earth']))
    draw_rect_outline(px, 3, 3, w - 4, 18, rgba(P['dark_gold']))
    # Title bar highlight
    for x in range(4, w - 4):
        draw_pixel(px, x, 4, rgba(P['dirt']))

    # Waystone icon in title bar (small cyan diamond)
    for d in range(3):
        draw_pixel(px, 10, 8 + d, rgba(P['player_blue']))
        draw_pixel(px, 10, 14 - d, rgba(P['player_blue']))
        draw_pixel(px, 7 + d, 11, rgba(P['player_blue']))
        draw_pixel(px, 13 - d, 11, rgba(P['player_blue']))
    draw_pixel(px, 10, 11, rgba(P['shimmer']))

    # Zone list entries (6 slots)
    for i in range(6):
        slot_y = 24 + i * 24
        # Slot background
        bg_color = rgba(P['dark_rock']) if i % 2 == 0 else rgba(P['shadow_black'])
        draw_rect(px, 4, slot_y, w - 5, slot_y + 20, bg_color)
        # Slot border
        draw_rect_outline(px, 4, slot_y, w - 5, slot_y + 20, rgba(P['stone']))

        # Zone type indicator (colored dot)
        zone_colors = [P['forest_green'], P['sand'], P['ice_pale'],
                       P['bright_red'], P['ocean_blue'], P['magic_purple']]
        dot_c = zone_colors[i]
        draw_rect(px, 8, slot_y + 7, 11, slot_y + 14, rgba(dot_c))

        # Waystone indicator (small cyan diamond in each slot)
        wy_cx = w - 20
        wy_cy = slot_y + 10
        draw_pixel(px, wy_cx, wy_cy - 2, rgba(P['player_blue']))
        draw_pixel(px, wy_cx - 1, wy_cy, rgba(P['player_blue']))
        draw_pixel(px, wy_cx + 1, wy_cy, rgba(P['player_blue']))
        draw_pixel(px, wy_cx, wy_cy + 2, rgba(P['player_blue']))
        draw_pixel(px, wy_cx, wy_cy, rgba(P['shimmer']))

        # Text placeholder lines
        for lx in range(16, w - 28):
            if lx % 2 == 0:
                draw_pixel(px, lx, slot_y + 8, rgba(P['pale_gray']))
        for lx in range(16, w - 40):
            if lx % 2 == 0:
                draw_pixel(px, lx, slot_y + 13, rgba(P['mid_gray']))

    # Bottom buttons area
    btn_y = h - 28

    # "Travel" button
    draw_rect(px, 10, btn_y, 80, btn_y + 20, rgba(P['deep_forest']))
    draw_rect_outline(px, 10, btn_y, 80, btn_y + 20, rgba(P['forest_green']))
    draw_rect(px, 12, btn_y + 2, 78, btn_y + 3, rgba(P['leaf_green']))
    # Button text placeholder
    for lx in range(25, 65):
        if lx % 2 == 0:
            draw_pixel(px, lx, btn_y + 10, rgba(P['near_white']))

    # "Cancel" button
    draw_rect(px, 95, btn_y, 165, btn_y + 20, rgba(P['dark_rock']))
    draw_rect_outline(px, 95, btn_y, 165, btn_y + 20, rgba(P['stone']))
    draw_rect(px, 97, btn_y + 2, 163, btn_y + 3, rgba(P['mid_gray']))
    # Button text placeholder
    for lx in range(110, 150):
        if lx % 2 == 0:
            draw_pixel(px, lx, btn_y + 10, rgba(P['pale_gray']))

    # Scrollbar track
    draw_rect(px, w - 8, 22, w - 5, h - 32, rgba(P['shadow_black']))
    draw_rect_outline(px, w - 8, 22, w - 5, h - 32, rgba(P['stone']))
    # Scroll handle
    draw_rect(px, w - 7, 24, w - 6, 50, rgba(P['gold']))

    save_png(os.path.join(MAP_DIR, 'ui_panel_fast_travel.png'), w, h, px)


def gen_fast_travel_slot_hover():
    """176x22 hover state for fast-travel zone slot."""
    w, h = 176, 22
    px = make_blank(w, h)

    # Highlighted slot
    draw_rect(px, 0, 0, w - 1, h - 1, rgba(P['deep_soil']))
    draw_rect_outline(px, 0, 0, w - 1, h - 1, rgba(P['gold']))

    # Zone color dot
    draw_rect(px, 4, 7, 7, 14, rgba(P['forest_green']))

    # Waystone icon
    draw_pixel(px, w - 16, 9, rgba(P['player_blue']))
    draw_pixel(px, w - 17, 11, rgba(P['player_blue']))
    draw_pixel(px, w - 15, 11, rgba(P['player_blue']))
    draw_pixel(px, w - 16, 13, rgba(P['player_blue']))
    draw_pixel(px, w - 16, 11, rgba(P['shimmer']))

    # Text lines
    for lx in range(12, w - 24):
        if lx % 2 == 0:
            draw_pixel(px, lx, 8, rgba(P['near_white']))
    for lx in range(12, w - 36):
        if lx % 2 == 0:
            draw_pixel(px, lx, 13, rgba(P['pale_sand']))

    save_png(os.path.join(MAP_DIR, 'ui_fast_travel_slot_hover.png'), w, h, px)


def gen_fast_travel_confirm():
    """160x100 travel confirmation dialog."""
    w, h = 160, 100
    px = make_blank(w, h)

    # Dark panel
    draw_rect(px, 0, 0, w - 1, h - 1, rgba(P['dark_rock']))
    draw_rect_outline(px, 0, 0, w - 1, h - 1, rgba(P['dark_gold']))
    draw_rect_outline(px, 1, 1, w - 2, h - 2, rgba(P['gold']))

    # Title bar
    draw_rect(px, 2, 2, w - 3, 14, rgba(P['rich_earth']))
    draw_rect_outline(px, 2, 2, w - 3, 14, rgba(P['dark_gold']))

    # Waystone icon in center
    cx, cy = w // 2, 42
    for d in range(5):
        draw_pixel(px, cx, cy - d, rgba(P['player_blue']))
        draw_pixel(px, cx, cy + d, rgba(P['player_blue']))
        draw_pixel(px, cx - d, cy, rgba(P['player_blue']))
        draw_pixel(px, cx + d, cy, rgba(P['player_blue']))
    draw_pixel(px, cx, cy, rgba(P['shimmer']))
    draw_pixel(px, cx - 1, cy, rgba(P['sky_blue']))
    draw_pixel(px, cx + 1, cy, rgba(P['sky_blue']))
    draw_pixel(px, cx, cy - 1, rgba(P['sky_blue']))
    draw_pixel(px, cx, cy + 1, rgba(P['sky_blue']))

    # Text placeholder (zone name area)
    for lx in range(30, w - 30):
        if lx % 2 == 0:
            draw_pixel(px, lx, 55, rgba(P['pale_gray']))

    # Arrow down indicator
    draw_pixel(px, cx, 62, rgba(P['gold']))
    draw_pixel(px, cx - 1, 60, rgba(P['gold']))
    draw_pixel(px, cx + 1, 60, rgba(P['gold']))
    draw_pixel(px, cx - 2, 58, rgba(P['gold']))
    draw_pixel(px, cx + 2, 58, rgba(P['gold']))

    # Confirm button
    draw_rect(px, 10, h - 25, 70, h - 8, rgba(P['deep_forest']))
    draw_rect_outline(px, 10, h - 25, 70, h - 8, rgba(P['forest_green']))
    for lx in range(22, 58):
        if lx % 2 == 0:
            draw_pixel(px, lx, h - 16, rgba(P['near_white']))

    # Cancel button
    draw_rect(px, 85, h - 25, 145, h - 8, rgba(P['dark_rock']))
    draw_rect_outline(px, 85, h - 25, 145, h - 8, rgba(P['stone']))
    for lx in range(97, 133):
        if lx % 2 == 0:
            draw_pixel(px, lx, h - 16, rgba(P['pale_gray']))

    save_png(os.path.join(MAP_DIR, 'ui_fast_travel_confirm.png'), w, h, px)


gen_fast_travel_panel()
gen_fast_travel_slot_hover()
gen_fast_travel_confirm()


# ════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════
print("\n=== Asset Generation Complete ===")
print("Generated assets:")
print("  Zone icons (32x32): volcanic, swamp, ocean, sky, void, crystal, dungeon,")
print("    plains, celestial, abyssal, dragonbone, guild, seasonal")
print("  Waystone sprites: overworld (16x24), active (16x24), map icon (16x16)")
print("  Map frame: world map border (280x210)")
print("  Compass rose: enhanced (48x48)")
print("  Fog of war: dense, light, edge transition (32x32 each)")
print("  Markers: player (12x12), destination (12x12), waystone (12x12), quest (12x12)")
print("  Zone banners: standard (80x16), small (48x12)")
print("  World map: illustrated background (320x180)")
print("  Fast-travel UI: panel (180x200), slot hover (176x22), confirm dialog (160x100)")
