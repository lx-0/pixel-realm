#!/usr/bin/env python3
"""Generate swamp biome art assets for PixelRealm.

Produces:
  - tileset_swamp.png          (256x64, 16 cols x 4 rows of 16x16 tiles)
  - animated swamp water tiles (4 frames, individual 16x16 PNGs)
  - animated firefly tiles     (4 frames, individual 16x16 PNGs)
  - animated reed tiles        (4 frames, individual 16x16 PNGs)
  - 3 parallax backgrounds     (320x180 each)
  - 2 NPC spritesheets         (swamp hermit, potion seller)
  - 3 enemy spritesheets       (bog creature, swamp serpent, will-o-wisp)

All colors from the 32-color master palette in ART-STYLE-GUIDE.md.
"""

import os
import sys
import random
from pathlib import Path

sys.path.insert(0, "/tmp/pylibs")
from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# Master palette (from ART-STYLE-GUIDE.md)
# ---------------------------------------------------------------------------
PAL = {
    "shadow_black":   (0x0d, 0x0d, 0x0d),
    "dark_rock":      (0x2b, 0x2b, 0x2b),
    "stone_gray":     (0x4a, 0x4a, 0x4a),
    "mid_gray":       (0x6e, 0x6e, 0x6e),
    "light_stone":    (0x96, 0x96, 0x96),
    "pale_gray":      (0xc8, 0xc8, 0xc8),
    "near_white":     (0xf0, 0xf0, 0xf0),
    "deep_soil":      (0x3b, 0x20, 0x10),
    "rich_earth":     (0x6b, 0x3a, 0x1f),
    "dirt":           (0x8b, 0x5c, 0x2a),
    "sand":           (0xb8, 0x84, 0x3f),
    "desert_gold":    (0xd4, 0xa8, 0x5a),
    "pale_sand":      (0xe8, 0xd0, 0x8a),
    "deep_forest":    (0x1a, 0x3a, 0x1a),
    "forest_green":   (0x2d, 0x6e, 0x2d),
    "leaf_green":     (0x4c, 0x9b, 0x4c),
    "bright_grass":   (0x78, 0xc8, 0x78),
    "light_foliage":  (0xa8, 0xe4, 0xa0),
    "deep_ocean":     (0x0a, 0x1a, 0x3a),
    "ocean_blue":     (0x1a, 0x4a, 0x8a),
    "sky_blue":       (0x2a, 0x7a, 0xc0),
    "player_blue":    (0x50, 0xa8, 0xe8),
    "pale_water":     (0x90, 0xd0, 0xf8),
    "shimmer":        (0xc8, 0xf0, 0xff),
    "deep_blood":     (0x5a, 0x0a, 0x0a),
    "enemy_red":      (0xa0, 0x10, 0x10),
    "bright_red":     (0xd4, 0x20, 0x20),
    "fire_orange":    (0xf0, 0x60, 0x20),
    "ember":          (0xf8, 0xa0, 0x60),
    "dark_gold":      (0xa8, 0x70, 0x00),
    "gold":           (0xe8, 0xb8, 0x00),
    "bright_yellow":  (0xff, 0xe0, 0x40),
    "pale_highlight": (0xff, 0xf8, 0xa0),
    "deep_magic":     (0x1a, 0x0a, 0x3a),
    "magic_purple":   (0x5a, 0x20, 0xa0),
    "mana_violet":    (0x90, 0x50, 0xe0),
    "spell_glow":     (0xd0, 0x90, 0xff),
}

# Swamp biome palette subset
SWAMP_MUD       = PAL["deep_soil"]      # #3b2010
SWAMP_MUD_LIGHT = PAL["rich_earth"]     # #6b3a1f
SWAMP_DIRT      = PAL["dirt"]           # #8b5c2a
SWAMP_WATER_D   = PAL["deep_ocean"]     # #0a1a3a
SWAMP_WATER     = PAL["deep_forest"]    # #1a3a1a (murky green-brown water)
SWAMP_WATER_L   = PAL["forest_green"]   # #2d6e2d
SWAMP_GREEN_D   = PAL["deep_forest"]    # #1a3a1a
SWAMP_GREEN     = PAL["forest_green"]   # #2d6e2d
SWAMP_GREEN_L   = PAL["leaf_green"]     # #4c9b4c
SWAMP_MOSS      = PAL["bright_grass"]   # #78c878
SWAMP_FOG       = PAL["pale_gray"]      # #c8c8c8
SWAMP_DARK      = PAL["shadow_black"]   # #0d0d0d
SWAMP_STONE     = PAL["stone_gray"]     # #4a4a4a
SWAMP_ROCK      = PAL["dark_rock"]      # #2b2b2b
SWAMP_LILY      = PAL["leaf_green"]     # #4c9b4c
SWAMP_LILY_L    = PAL["light_foliage"]  # #a8e4a0

TRANSPARENT = (0, 0, 0, 0)

# Project root
ROOT = Path("/host-workdir/companies/PixelForgeStudios/projects/PixelRealm")
TILESETS_DIR = ROOT / "assets" / "tiles" / "tilesets"
ANIMATED_DIR = ROOT / "assets" / "tiles" / "animated"
PARALLAX_DIR = ROOT / "assets" / "backgrounds" / "parallax"
CHARS_DIR    = ROOT / "assets" / "sprites" / "characters"
ENEMIES_DIR  = ROOT / "assets" / "sprites" / "enemies"

random.seed(42)  # reproducible art


def c(color, alpha=255):
    """Return RGBA tuple from an RGB color."""
    return (*color, alpha)


# ===========================================================================
# 1. TILESET — tileset_swamp.png (256x64, 16 cols × 4 rows)
# ===========================================================================
# Layout:
# Row 0: Ground tiles (mud, shallow water, lily pad, dry patch, variants)
# Row 1: Terrain features (dead tree, mossy rock, hanging vine, fog, edges)
# Row 2: Transitions (mud-to-water edges, corners)
# Row 3: Decorations (mushrooms, roots, logs, cattails)

def draw_tile(img, col, row, draw_fn):
    """Draw a 16x16 tile at grid position (col, row)."""
    x0, y0 = col * 16, row * 16
    tile = Image.new("RGBA", (16, 16), TRANSPARENT)
    td = ImageDraw.Draw(tile)
    draw_fn(tile, td)
    img.paste(tile, (x0, y0), tile)


def fill_tile(tile, draw, color):
    """Fill entire 16x16 tile with solid color."""
    draw.rectangle([0, 0, 15, 15], fill=c(color))


def noise_fill(tile, base, alt, density=0.15):
    """Fill tile with base color + scattered noise pixels."""
    for y in range(16):
        for x in range(16):
            if random.random() < density:
                tile.putpixel((x, y), c(alt))
            else:
                tile.putpixel((x, y), c(base))


# --- Row 0: Ground tiles ---

def tile_mud(tile, draw):
    """Deep mud ground."""
    noise_fill(tile, SWAMP_MUD, SWAMP_MUD_LIGHT, 0.12)
    # Occasional dark spots
    for _ in range(3):
        x, y = random.randint(1, 14), random.randint(1, 14)
        tile.putpixel((x, y), c(SWAMP_DARK))

def tile_mud_light(tile, draw):
    """Lighter mud / dry patch."""
    noise_fill(tile, SWAMP_MUD_LIGHT, SWAMP_DIRT, 0.15)

def tile_shallow_water(tile, draw):
    """Shallow swamp water - murky green."""
    noise_fill(tile, SWAMP_WATER, SWAMP_WATER_D, 0.1)
    # Subtle lighter ripple hints
    for _ in range(4):
        x = random.randint(2, 13)
        y = random.randint(2, 13)
        tile.putpixel((x, y), c(SWAMP_GREEN))

def tile_deep_water(tile, draw):
    """Deeper swamp water."""
    noise_fill(tile, SWAMP_WATER_D, SWAMP_WATER, 0.08)

def tile_lily_pad(tile, draw):
    """Lily pad on water."""
    # Water base
    noise_fill(tile, SWAMP_WATER, SWAMP_WATER_D, 0.08)
    # Lily pad - oval shape centered
    for y in range(5, 12):
        for x in range(4, 13):
            dx = x - 8
            dy = y - 8
            if dx*dx + dy*dy*1.5 < 16:
                tile.putpixel((x, y), c(SWAMP_GREEN_L))
            elif dx*dx + dy*dy*1.5 < 20:
                tile.putpixel((x, y), c(SWAMP_GREEN))
    # Center detail
    tile.putpixel((8, 7), c(SWAMP_MOSS))
    tile.putpixel((7, 8), c(SWAMP_MOSS))

def tile_lily_flower(tile, draw):
    """Lily pad with flower."""
    tile_lily_pad(tile, draw)
    # Pink/white flower (using pale highlight + ember for warmth)
    tile.putpixel((9, 5), c(PAL["near_white"]))
    tile.putpixel((10, 6), c(PAL["pale_highlight"]))
    tile.putpixel((8, 5), c(PAL["pale_highlight"]))
    tile.putpixel((9, 4), c(PAL["near_white"]))
    tile.putpixel((10, 5), c(PAL["ember"]))

def tile_dry_patch(tile, draw):
    """Dry ground patch amid swamp."""
    noise_fill(tile, SWAMP_DIRT, SWAMP_MUD_LIGHT, 0.2)
    # Some grass tufts
    for _ in range(3):
        x = random.randint(2, 13)
        y = random.randint(1, 12)
        tile.putpixel((x, y), c(SWAMP_GREEN))
        tile.putpixel((x, y-1), c(SWAMP_GREEN_L))

def tile_mud_puddle(tile, draw):
    """Mud tile with small water puddle."""
    noise_fill(tile, SWAMP_MUD, SWAMP_MUD_LIGHT, 0.12)
    # Small puddle
    for y in range(6, 11):
        for x in range(5, 12):
            dx = x - 8
            dy = y - 8
            if dx*dx + dy*dy < 9:
                tile.putpixel((x, y), c(SWAMP_WATER))

def tile_mud_variant1(tile, draw):
    """Mud variant with roots."""
    noise_fill(tile, SWAMP_MUD, SWAMP_MUD_LIGHT, 0.1)
    # Root lines
    for x in range(3, 12):
        y = 7 + (x % 3) - 1
        tile.putpixel((x, y), c(SWAMP_ROCK))

def tile_mud_variant2(tile, draw):
    """Mud variant with pebbles."""
    noise_fill(tile, SWAMP_MUD_LIGHT, SWAMP_MUD, 0.1)
    for _ in range(5):
        x, y = random.randint(2, 13), random.randint(2, 13)
        tile.putpixel((x, y), c(SWAMP_STONE))

def tile_water_edge_n(tile, draw):
    """Water with mud edge on north side."""
    # Water base
    noise_fill(tile, SWAMP_WATER, SWAMP_WATER_D, 0.08)
    # Mud edge top 4 rows
    for y in range(4):
        for x in range(16):
            if y < 2:
                tile.putpixel((x, y), c(SWAMP_MUD))
            elif random.random() < 0.6 - y*0.1:
                tile.putpixel((x, y), c(SWAMP_MUD_LIGHT))

def tile_water_edge_s(tile, draw):
    """Water with mud edge on south side."""
    noise_fill(tile, SWAMP_WATER, SWAMP_WATER_D, 0.08)
    for y in range(12, 16):
        for x in range(16):
            if y > 13:
                tile.putpixel((x, y), c(SWAMP_MUD))
            elif random.random() < 0.6 - (15-y)*0.1:
                tile.putpixel((x, y), c(SWAMP_MUD_LIGHT))

def tile_water_edge_w(tile, draw):
    """Water with mud edge on west side."""
    noise_fill(tile, SWAMP_WATER, SWAMP_WATER_D, 0.08)
    for y in range(16):
        for x in range(4):
            if x < 2:
                tile.putpixel((x, y), c(SWAMP_MUD))
            elif random.random() < 0.5:
                tile.putpixel((x, y), c(SWAMP_MUD_LIGHT))

def tile_water_edge_e(tile, draw):
    """Water with mud edge on east side."""
    noise_fill(tile, SWAMP_WATER, SWAMP_WATER_D, 0.08)
    for y in range(16):
        for x in range(12, 16):
            if x > 13:
                tile.putpixel((x, y), c(SWAMP_MUD))
            elif random.random() < 0.5:
                tile.putpixel((x, y), c(SWAMP_MUD_LIGHT))

def tile_water_variant(tile, draw):
    """Water tile variant with algae."""
    noise_fill(tile, SWAMP_WATER, SWAMP_WATER_D, 0.08)
    for _ in range(6):
        x, y = random.randint(1, 14), random.randint(1, 14)
        tile.putpixel((x, y), c(SWAMP_GREEN_D))
        if x < 15:
            tile.putpixel((x+1, y), c(SWAMP_GREEN_D))

# --- Row 1: Terrain features ---

def tile_dead_tree(tile, draw):
    """Dead tree trunk — lower half."""
    fill_tile(tile, draw, SWAMP_MUD)
    # Trunk
    for y in range(0, 16):
        for x in range(6, 10):
            tile.putpixel((x, y), c(SWAMP_ROCK))
    # Bark detail
    tile.putpixel((7, 3), c(SWAMP_STONE))
    tile.putpixel((8, 7), c(SWAMP_STONE))
    tile.putpixel((7, 11), c(SWAMP_STONE))
    # Moss patches
    tile.putpixel((6, 8), c(SWAMP_GREEN_D))
    tile.putpixel((6, 9), c(SWAMP_GREEN))
    tile.putpixel((9, 4), c(SWAMP_GREEN_D))

def tile_dead_tree_top(tile, draw):
    """Dead tree — upper half with bare branches."""
    # Transparent bg (overlaid on parallax)
    # Trunk center
    for y in range(8, 16):
        for x in range(6, 10):
            tile.putpixel((x, y), c(SWAMP_ROCK))
    # Branches
    # Left branch
    for i in range(5):
        tile.putpixel((5-i, 6-i), c(SWAMP_ROCK))
        if i < 3:
            tile.putpixel((4-i, 5-i), c(SWAMP_STONE))
    # Right branch
    for i in range(4):
        tile.putpixel((10+i, 5-i), c(SWAMP_ROCK))
        if i < 2:
            tile.putpixel((11+i, 4-i), c(SWAMP_STONE))
    # Top branch
    for y in range(4, 8):
        tile.putpixel((7, y), c(SWAMP_ROCK))
        tile.putpixel((8, y), c(SWAMP_ROCK))
    tile.putpixel((7, 3), c(SWAMP_STONE))
    tile.putpixel((8, 2), c(SWAMP_STONE))

def tile_mossy_rock(tile, draw):
    """Mossy boulder."""
    fill_tile(tile, draw, SWAMP_MUD)
    # Rock body
    for y in range(4, 14):
        span = max(0, 6 - abs(y - 9))
        for x in range(8 - span, 8 + span + 1):
            if 0 <= x < 16:
                tile.putpixel((x, y), c(SWAMP_STONE))
    # Rock highlight
    for y in range(5, 8):
        for x in range(6, 9):
            tile.putpixel((x, y), c(PAL["mid_gray"]))
    # Moss on top
    for x in range(5, 11):
        if random.random() < 0.7:
            tile.putpixel((x, 4), c(SWAMP_GREEN))
            tile.putpixel((x, 5), c(SWAMP_GREEN_D))

def tile_hanging_vine(tile, draw):
    """Hanging vine (canopy decoration)."""
    # Mostly transparent - vine drops from top
    x = 7
    for y in range(16):
        # Vine sways slightly
        vx = x + (1 if y % 5 == 0 else (-1 if y % 7 == 0 else 0))
        tile.putpixel((vx, y), c(SWAMP_GREEN_D))
        if y % 3 == 0:
            tile.putpixel((vx + 1, y), c(SWAMP_GREEN))  # leaf
    # Second vine
    x2 = 11
    for y in range(3, 14):
        vx = x2 + (1 if y % 4 == 0 else 0)
        tile.putpixel((vx, y), c(SWAMP_GREEN_D))

def tile_fog_patch(tile, draw):
    """Fog overlay using stipple pattern (no alpha blending)."""
    # Mud base
    noise_fill(tile, SWAMP_MUD, SWAMP_MUD_LIGHT, 0.1)
    # Fog stipple: scatter pale gray pixels in a wispy pattern
    for y in range(16):
        for x in range(16):
            v = ((x + y) * 7 + x * 3) % 17
            if v < 3:
                tile.putpixel((x, y), c(SWAMP_FOG))
            elif v < 5:
                tile.putpixel((x, y), c(PAL["light_stone"]))

def tile_roots(tile, draw):
    """Exposed tree roots on mud."""
    noise_fill(tile, SWAMP_MUD, SWAMP_MUD_LIGHT, 0.1)
    # Root paths
    points = [(1,8), (3,7), (5,6), (7,7), (9,8), (11,6), (13,7), (15,8)]
    for px, py in points:
        tile.putpixel((px, py), c(SWAMP_ROCK))
        if py+1 < 16:
            tile.putpixel((px, py+1), c(SWAMP_ROCK))
    # Secondary root
    for x in range(2, 14):
        y2 = 11 + (x % 3)
        tile.putpixel((x, y2), c(SWAMP_ROCK))

def tile_mushroom_cluster(tile, draw):
    """Glowing mushrooms on mud."""
    noise_fill(tile, SWAMP_MUD, SWAMP_MUD_LIGHT, 0.1)
    # Mushroom 1
    tile.putpixel((4, 10), c(PAL["light_stone"]))  # stem
    tile.putpixel((4, 11), c(PAL["light_stone"]))
    tile.putpixel((3, 9), c(SWAMP_MOSS))  # cap
    tile.putpixel((4, 9), c(SWAMP_LILY_L))
    tile.putpixel((5, 9), c(SWAMP_MOSS))
    tile.putpixel((4, 8), c(SWAMP_LILY_L))
    # Mushroom 2
    tile.putpixel((10, 11), c(PAL["light_stone"]))
    tile.putpixel((9, 10), c(SWAMP_MOSS))
    tile.putpixel((10, 10), c(SWAMP_LILY_L))
    tile.putpixel((11, 10), c(SWAMP_MOSS))
    # Small mushroom
    tile.putpixel((7, 13), c(PAL["light_stone"]))
    tile.putpixel((7, 12), c(SWAMP_MOSS))

def tile_log(tile, draw):
    """Fallen log."""
    noise_fill(tile, SWAMP_MUD, SWAMP_MUD_LIGHT, 0.1)
    # Log body horizontal
    for x in range(2, 14):
        tile.putpixel((x, 7), c(SWAMP_ROCK))
        tile.putpixel((x, 8), c(SWAMP_STONE))
        tile.putpixel((x, 9), c(SWAMP_ROCK))
    # End circles
    tile.putpixel((1, 8), c(SWAMP_STONE))
    tile.putpixel((14, 8), c(PAL["mid_gray"]))
    # Moss on log
    tile.putpixel((5, 7), c(SWAMP_GREEN_D))
    tile.putpixel((8, 7), c(SWAMP_GREEN))
    tile.putpixel((11, 7), c(SWAMP_GREEN_D))

def tile_cattails(tile, draw):
    """Cattails / bullrushes at water edge."""
    noise_fill(tile, SWAMP_WATER, SWAMP_WATER_D, 0.08)
    # Three cattail stalks
    for cx in [4, 8, 12]:
        for y in range(3, 15):
            tile.putpixel((cx, y), c(SWAMP_GREEN_D))
        # Brown head
        tile.putpixel((cx, 3), c(SWAMP_DIRT))
        tile.putpixel((cx, 4), c(SWAMP_MUD_LIGHT))
        tile.putpixel((cx, 5), c(SWAMP_DIRT))
        # Leaf
        tile.putpixel((cx+1, 8), c(SWAMP_GREEN))
        tile.putpixel((cx+1, 9), c(SWAMP_GREEN))

def tile_swamp_flower(tile, draw):
    """Swamp flower on mud."""
    noise_fill(tile, SWAMP_MUD, SWAMP_MUD_LIGHT, 0.1)
    # Stem
    for y in range(7, 14):
        tile.putpixel((8, y), c(SWAMP_GREEN_D))
    # Leaves
    tile.putpixel((7, 10), c(SWAMP_GREEN))
    tile.putpixel((9, 11), c(SWAMP_GREEN))
    # Flower head (purple/magic)
    tile.putpixel((7, 6), c(PAL["mana_violet"]))
    tile.putpixel((8, 5), c(PAL["spell_glow"]))
    tile.putpixel((9, 6), c(PAL["mana_violet"]))
    tile.putpixel((8, 6), c(PAL["magic_purple"]))
    tile.putpixel((8, 7), c(PAL["mana_violet"]))

def tile_stepping_stone(tile, draw):
    """Stepping stones in water."""
    noise_fill(tile, SWAMP_WATER, SWAMP_WATER_D, 0.08)
    # Stone
    for y in range(5, 11):
        for x in range(5, 11):
            dx = x - 8
            dy = y - 8
            if dx*dx + dy*dy < 10:
                tile.putpixel((x, y), c(SWAMP_STONE))
    tile.putpixel((7, 6), c(PAL["mid_gray"]))
    tile.putpixel((6, 7), c(PAL["mid_gray"]))

def tile_web(tile, draw):
    """Spider web between trees (stippled, no alpha)."""
    noise_fill(tile, SWAMP_MUD, SWAMP_MUD_LIGHT, 0.08)
    # Web strands from corners — use light_stone for thinner look
    for i in range(8):
        tile.putpixel((i, i), c(PAL["light_stone"]))
        tile.putpixel((15-i, i), c(PAL["light_stone"]))
    # Center web — checkerboard stipple for delicate look
    for x in range(5, 11):
        if x % 2 == 0:
            tile.putpixel((x, 7), c(PAL["pale_gray"]))
        if x % 2 == 1:
            tile.putpixel((x, 8), c(PAL["pale_gray"]))

def tile_mud_bubbles(tile, draw):
    """Bubbling mud (static frame for tileset)."""
    noise_fill(tile, SWAMP_MUD, SWAMP_MUD_LIGHT, 0.12)
    # Bubble circles
    for (bx, by) in [(5, 6), (10, 10), (3, 12)]:
        tile.putpixel((bx, by), c(SWAMP_DIRT))
        tile.putpixel((bx+1, by), c(SWAMP_DIRT))
        tile.putpixel((bx, by-1), c(PAL["mid_gray"]))


def generate_tileset():
    """Generate the main tileset_swamp.png."""
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground tiles (16 tiles)
    row0 = [
        tile_mud, tile_mud_light, tile_shallow_water, tile_deep_water,
        tile_lily_pad, tile_lily_flower, tile_dry_patch, tile_mud_puddle,
        tile_mud_variant1, tile_mud_variant2, tile_water_edge_n, tile_water_edge_s,
        tile_water_edge_w, tile_water_edge_e, tile_water_variant, tile_mud_bubbles,
    ]
    for i, fn in enumerate(row0):
        draw_tile(img, i, 0, fn)

    # Row 1: Terrain features
    row1 = [
        tile_dead_tree, tile_dead_tree_top, tile_mossy_rock, tile_hanging_vine,
        tile_fog_patch, tile_roots, tile_mushroom_cluster, tile_log,
        tile_cattails, tile_swamp_flower, tile_stepping_stone, tile_web,
        tile_mud, tile_mud, tile_mud, tile_mud,  # filler variants
    ]
    for i, fn in enumerate(row1):
        draw_tile(img, i, 1, fn)

    # Row 2: Corner transitions (mud-water)
    row2_fns = [
        tile_water_edge_n, tile_water_edge_s, tile_water_edge_w, tile_water_edge_e,
        tile_shallow_water, tile_shallow_water, tile_deep_water, tile_deep_water,
        tile_mud, tile_mud_light, tile_dry_patch, tile_mud_puddle,
        tile_lily_pad, tile_lily_flower, tile_cattails, tile_stepping_stone,
    ]
    for i, fn in enumerate(row2_fns):
        # Re-seed for different variants
        random.seed(42 + 100 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: More decorations with variants
    row3_fns = [
        tile_mushroom_cluster, tile_swamp_flower, tile_log, tile_roots,
        tile_hanging_vine, tile_dead_tree, tile_mossy_rock, tile_fog_patch,
        tile_cattails, tile_web, tile_stepping_stone, tile_mud_bubbles,
        tile_dry_patch, tile_lily_pad, tile_mud_variant1, tile_mud_variant2,
    ]
    for i, fn in enumerate(row3_fns):
        random.seed(42 + 200 + i)
        draw_tile(img, i, 3, fn)

    random.seed(42)
    out = TILESETS_DIR / "tileset_swamp.png"
    img.save(out)
    print(f"  Created: {out} ({img.size[0]}x{img.size[1]})")


# ===========================================================================
# 2. ANIMATED TILES — individual 16x16 PNGs
# ===========================================================================

def generate_animated_water():
    """4-frame bubbling swamp water animation."""
    random.seed(42)
    for frame in range(1, 5):
        tile = Image.new("RGBA", (16, 16), TRANSPARENT)
        # Base murky water
        for y in range(16):
            for x in range(16):
                if random.random() < 0.1:
                    tile.putpixel((x, y), c(SWAMP_WATER_D))
                else:
                    tile.putpixel((x, y), c(SWAMP_WATER))

        # Bubbles that move up per frame
        bubble_positions = [
            (4, 12 - frame), (10, 10 - frame), (7, 14 - frame),
        ]
        for bx, by in bubble_positions:
            by = by % 16
            tile.putpixel((bx, by), c(SWAMP_GREEN_L))
            if by > 0:
                tile.putpixel((bx, by-1), c(SWAMP_MOSS))

        # Ripple rings that expand per frame
        cx, cy = 8, 8
        r = frame + 1
        for angle_step in range(16):
            import math
            a = angle_step * math.pi / 8
            rx = int(cx + r * math.cos(a))
            ry = int(cy + r * math.sin(a))
            if 0 <= rx < 16 and 0 <= ry < 16:
                tile.putpixel((rx, ry), c(SWAMP_GREEN_L))

        out = ANIMATED_DIR / f"tile_water_swamp_{frame:02d}.png"
        tile.save(out)
        print(f"  Created: {out}")


def generate_animated_fireflies():
    """4-frame firefly animation — tiny yellow dots that move."""
    positions = [
        [(3,4), (9,2), (12,10), (6,13)],
        [(4,3), (10,3), (11,9), (5,12)],
        [(5,2), (11,4), (10,8), (4,11)],
        [(4,3), (10,3), (11,9), (5,12)],
    ]
    for frame in range(1, 5):
        tile = Image.new("RGBA", (16, 16), TRANSPARENT)
        for (fx, fy) in positions[frame-1]:
            # Glow (dim)
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    nx, ny = fx+dx, fy+dy
                    if 0 <= nx < 16 and 0 <= ny < 16 and (dx != 0 or dy != 0):
                        tile.putpixel((nx, ny), c(PAL["bright_yellow"], 60))
            # Core
            tile.putpixel((fx, fy), c(PAL["bright_yellow"], 220))

        out = ANIMATED_DIR / f"tile_swamp_firefly_{frame:02d}.png"
        tile.save(out)
        print(f"  Created: {out}")


def generate_animated_reeds():
    """4-frame swaying reed animation."""
    for frame in range(1, 5):
        tile = Image.new("RGBA", (16, 16), TRANSPARENT)
        # Water base
        for y in range(16):
            for x in range(16):
                tile.putpixel((x, y), c(SWAMP_WATER))
        # Three reed stalks that sway
        sway = [-1, 0, 1, 0][frame - 1]
        for base_x in [4, 8, 12]:
            for y in range(2, 15):
                # Sway increases toward top
                sx = base_x + (sway if y < 7 else 0)
                if 0 <= sx < 16:
                    tile.putpixel((sx, y), c(SWAMP_GREEN_D))
            # Tip
            tip_x = base_x + sway
            if 0 <= tip_x < 16:
                tile.putpixel((tip_x, 2), c(SWAMP_GREEN))
                tile.putpixel((tip_x, 1), c(SWAMP_GREEN_L))

        out = ANIMATED_DIR / f"tile_swamp_reed_{frame:02d}.png"
        tile.save(out)
        print(f"  Created: {out}")


# ===========================================================================
# 3. PARALLAX BACKGROUNDS — 320x180 each
# ===========================================================================

def generate_parallax():
    """Three parallax layers for swamp biome."""

    # Far layer: misty sky with dead tree silhouettes
    far = Image.new("RGBA", (320, 180), c(SWAMP_GREEN_D))
    fd = ImageDraw.Draw(far)
    # Sky gradient (top = deep ocean, bottom = deep forest)
    for y in range(180):
        ratio = y / 180
        r = int(SWAMP_WATER_D[0] * (1-ratio) + SWAMP_GREEN_D[0] * ratio)
        g = int(SWAMP_WATER_D[1] * (1-ratio) + SWAMP_GREEN_D[1] * ratio)
        b = int(SWAMP_WATER_D[2] * (1-ratio) + SWAMP_GREEN_D[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))
    # Distant tree silhouettes
    random.seed(42)
    for tx in range(0, 320, 20):
        h = random.randint(40, 80)
        w = random.randint(2, 5)
        base_y = 130
        # Trunk
        fd.rectangle([tx+8, base_y-h, tx+8+w, base_y], fill=c(SWAMP_DARK))
        # Bare branches (simple lines)
        for _ in range(3):
            bx = random.randint(-12, 12)
            by = random.randint(10, h-5)
            fd.line([(tx+9, base_y-by), (tx+9+bx, base_y-by-8)], fill=c(SWAMP_DARK), width=1)
    # Fog band
    for y in range(100, 140):
        alpha = int(60 * (1 - abs(y - 120) / 20))
        if alpha > 0:
            for x in range(320):
                if (x + y) % 7 < 3:
                    px = far.getpixel((x, y))
                    # Blend with fog
                    fog = SWAMP_FOG
                    nr = int(px[0] * (1-alpha/255) + fog[0] * (alpha/255))
                    ng = int(px[1] * (1-alpha/255) + fog[1] * (alpha/255))
                    nb = int(px[2] * (1-alpha/255) + fog[2] * (alpha/255))
                    far.putpixel((x, y), (nr, ng, nb, 255))
    # Ground line
    fd.rectangle([0, 130, 319, 179], fill=c(SWAMP_DARK))

    far_out = PARALLAX_DIR / "bg_parallax_swamp_far.png"
    far.save(far_out)
    print(f"  Created: {far_out}")

    # Mid layer: closer trees, hanging vines, more detail
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(43)
    for tx in range(0, 320, 30):
        h = random.randint(60, 120)
        w = random.randint(3, 6)
        base_y = 145
        # Trunk
        md.rectangle([tx+12, base_y-h, tx+12+w, base_y], fill=c(SWAMP_ROCK))
        # Bark texture
        for by in range(base_y-h, base_y, 4):
            md.point((tx+13, by), fill=c(SWAMP_STONE))
        # Moss patches
        for by in range(base_y-h+10, base_y, 7):
            md.point((tx+12, by), fill=c(SWAMP_GREEN_D))
            md.point((tx+11, by), fill=c(SWAMP_GREEN))
        # Hanging vines
        vx = tx + 14
        vine_len = random.randint(20, 50)
        for vy in range(base_y-h, base_y-h+vine_len):
            sway = 1 if vy % 6 < 3 else 0
            if 0 <= vx+sway < 320 and 0 <= vy < 180:
                mid.putpixel((vx+sway, vy), c(SWAMP_GREEN_D))
        # Canopy blob
        cy = base_y - h
        for dy in range(-8, 5):
            for dx in range(-10, 11):
                if dx*dx + dy*dy < 80 + random.randint(-20, 20):
                    px = tx + 13 + dx
                    py = cy + dy
                    if 0 <= px < 320 and 0 <= py < 180:
                        mid.putpixel((px, py), c(SWAMP_GREEN_D))
        # Lighter canopy center
        for dy in range(-5, 2):
            for dx in range(-6, 7):
                if dx*dx + dy*dy < 30:
                    px = tx + 13 + dx
                    py = cy + dy
                    if 0 <= px < 320 and 0 <= py < 180:
                        mid.putpixel((px, py), c(SWAMP_GREEN))
    # Ground at bottom
    md.rectangle([0, 145, 319, 179], fill=c(SWAMP_MUD))
    # Water/mud texture at bottom
    for y in range(150, 180):
        for x in range(320):
            if random.random() < 0.15:
                mid.putpixel((x, y), c(SWAMP_MUD_LIGHT))

    mid_out = PARALLAX_DIR / "bg_parallax_swamp_mid.png"
    mid.save(mid_out)
    print(f"  Created: {mid_out}")

    # Near layer: foreground foliage, reeds, close vines
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(44)
    # Dense reeds at bottom
    for x in range(0, 320, 3):
        h = random.randint(20, 50)
        base_y = 175
        sway = random.choice([-1, 0, 1])
        for y in range(base_y - h, base_y):
            sx = x + (sway if y < base_y - h + 10 else 0)
            if 0 <= sx < 320:
                near.putpixel((sx, y), c(SWAMP_GREEN_D))
        # Reed tip
        if x + sway >= 0 and x + sway < 320 and base_y - h - 1 >= 0:
            near.putpixel((x + sway, base_y - h - 1), c(SWAMP_GREEN))
    # Lily pads on foreground water
    for lx in range(10, 310, 40):
        ly = random.randint(155, 170)
        for dy in range(-2, 3):
            for dx in range(-3, 4):
                if dx*dx + dy*dy*2 < 10:
                    px, py = lx+dx, ly+dy
                    if 0 <= px < 320 and 0 <= py < 180:
                        near.putpixel((px, py), c(SWAMP_GREEN_L))
    # Ground
    nd.rectangle([0, 170, 319, 179], fill=c(SWAMP_MUD))
    # Hanging vines from top
    for vx in range(5, 320, 25):
        vlen = random.randint(30, 60)
        for vy in range(0, vlen):
            sx = vx + (1 if vy % 5 < 2 else (-1 if vy % 7 < 2 else 0))
            if 0 <= sx < 320 and vy < 180:
                near.putpixel((sx, vy), c(SWAMP_GREEN_D))
                # Leaves
                if vy % 4 == 0 and sx+1 < 320:
                    near.putpixel((sx+1, vy), c(SWAMP_GREEN))

    near_out = PARALLAX_DIR / "bg_parallax_swamp_near.png"
    near.save(near_out)
    print(f"  Created: {near_out}")


# ===========================================================================
# 4. NPC SPRITES — 16x24 per frame
# ===========================================================================

def draw_npc(name, body_color, hat_color, accent_color, cloak=False):
    """Generate a 2-frame idle NPC spritesheet (32x24: 2 cols of 16x24)."""
    sheet = Image.new("RGBA", (32, 24), TRANSPARENT)

    for frame in range(2):
        x0 = frame * 16
        bob = 1 if frame == 1 else 0  # subtle idle bob

        # --- Head (rows 0-7) ---
        # Hair/hat
        for x in range(6, 11):
            sheet.putpixel((x0+x, 0+bob), c(hat_color))
            sheet.putpixel((x0+x, 1+bob), c(hat_color))
        # Face
        skin = PAL["sand"]
        for y in range(2, 7):
            for x in range(6, 11):
                sheet.putpixel((x0+x, y+bob), c(skin))
        # Eyes
        sheet.putpixel((x0+7, 4+bob), c(SWAMP_DARK))
        sheet.putpixel((x0+9, 4+bob), c(SWAMP_DARK))
        # Beard for hermit
        if "hermit" in name:
            for x in range(6, 11):
                sheet.putpixel((x0+x, 6+bob), c(PAL["pale_gray"]))
                sheet.putpixel((x0+x, 7+bob), c(PAL["light_stone"]))

        # --- Body (rows 8-18) ---
        for y in range(8, 18):
            for x in range(5, 12):
                sheet.putpixel((x0+x, y+bob), c(body_color))
        # Body accent/detail
        for y in range(9, 16):
            sheet.putpixel((x0+8, y+bob), c(accent_color))

        if cloak:
            # Cloak drape on sides
            for y in range(7, 17):
                sheet.putpixel((x0+4, y+bob), c(body_color))
                sheet.putpixel((x0+12, y+bob), c(body_color))

        # Arms
        sheet.putpixel((x0+4, 10+bob), c(skin))
        sheet.putpixel((x0+4, 11+bob), c(skin))
        sheet.putpixel((x0+12, 10+bob), c(skin))
        sheet.putpixel((x0+12, 11+bob), c(skin))

        # --- Legs (rows 19-23) ---
        for y in range(19, 23):
            sheet.putpixel((x0+6, y), c(SWAMP_ROCK))
            sheet.putpixel((x0+7, y), c(SWAMP_ROCK))
            sheet.putpixel((x0+9, y), c(SWAMP_ROCK))
            sheet.putpixel((x0+10, y), c(SWAMP_ROCK))
        # Feet
        sheet.putpixel((x0+5, 23), c(SWAMP_ROCK))
        sheet.putpixel((x0+6, 23), c(SWAMP_STONE))
        sheet.putpixel((x0+10, 23), c(SWAMP_STONE))
        sheet.putpixel((x0+11, 23), c(SWAMP_ROCK))

    return sheet


def generate_npcs():
    """Generate swamp hermit and potion seller sprites."""
    # Swamp hermit: tattered green cloak, gray beard
    hermit = draw_npc(
        "hermit",
        body_color=SWAMP_GREEN_D,
        hat_color=SWAMP_ROCK,
        accent_color=SWAMP_GREEN,
        cloak=True,
    )
    # Add staff in hermit's hand (frame 0 and 1)
    for frame in range(2):
        x0 = frame * 16
        bob = 1 if frame == 1 else 0
        for y in range(3, 22):
            sheet_x = x0 + 13
            if sheet_x < 32 and y+bob < 24:
                hermit.putpixel((sheet_x, y+bob), c(SWAMP_DIRT))
        # Staff top ornament
        if 2+bob < 24:
            hermit.putpixel((x0+13, 2+bob), c(SWAMP_MOSS))

    hermit_out = CHARS_DIR / "char_npc_swamp_hermit.png"
    hermit.save(hermit_out)
    print(f"  Created: {hermit_out}")

    # Potion seller: purple robes, potion bottles
    seller = draw_npc(
        "potion_seller",
        body_color=PAL["magic_purple"],
        hat_color=PAL["deep_magic"],
        accent_color=PAL["mana_violet"],
        cloak=False,
    )
    # Add potion bottle detail (in hand area)
    for frame in range(2):
        x0 = frame * 16
        bob = 1 if frame == 1 else 0
        # Bottle in left hand
        seller.putpixel((x0+3, 12+bob), c(SWAMP_GREEN_L))
        seller.putpixel((x0+3, 13+bob), c(SWAMP_GREEN_L))
        seller.putpixel((x0+3, 11+bob), c(PAL["light_stone"]))
        # Belt pouch
        for x in range(6, 11):
            seller.putpixel((x0+x, 16+bob), c(SWAMP_DIRT))

    seller_out = CHARS_DIR / "char_npc_swamp_potion_seller.png"
    seller.save(seller_out)
    print(f"  Created: {seller_out}")


# ===========================================================================
# 5. ENEMY SPRITES
# ===========================================================================

def generate_enemies():
    """Generate bog creature, swamp serpent, and will-o-wisp."""

    # --- Bog Creature (medium, 16x24, 4-frame idle = 64x24) ---
    bog = Image.new("RGBA", (64, 24), TRANSPARENT)
    for frame in range(4):
        x0 = frame * 16
        bob = [0, 1, 0, -1][frame]

        # Amorphous muddy body (rounded blob)
        for y in range(6, 22):
            for x in range(3, 14):
                dx = x - 8
                dy = y - 14
                dist = dx*dx*0.8 + dy*dy*0.5
                if dist < 35:
                    # Outer = darker
                    if dist > 25:
                        bog.putpixel((x0+x, y+bob), c(SWAMP_MUD))
                    elif dist > 15:
                        bog.putpixel((x0+x, y+bob), c(SWAMP_MUD_LIGHT))
                    else:
                        bog.putpixel((x0+x, y+bob), c(SWAMP_DIRT))

        # Angry eyes (red = enemy)
        ey = 10 + bob
        if 0 <= ey < 24:
            bog.putpixel((x0+6, ey), c(PAL["enemy_red"]))
            bog.putpixel((x0+10, ey), c(PAL["enemy_red"]))
            # Eye glow
            if ey-1 >= 0:
                bog.putpixel((x0+6, ey-1), c(PAL["fire_orange"]))
                bog.putpixel((x0+10, ey-1), c(PAL["fire_orange"]))

        # Dripping mud detail
        drip_y = 20 + bob
        if 0 <= drip_y < 24:
            bog.putpixel((x0+5, drip_y), c(SWAMP_MUD))
            bog.putpixel((x0+11, drip_y), c(SWAMP_MUD))
        # Moss on top
        moss_y = 6 + bob
        if 0 <= moss_y < 24:
            for x in [5, 7, 9, 11]:
                bog.putpixel((x0+x, moss_y), c(SWAMP_GREEN_D))

    bog_out = ENEMIES_DIR / "char_enemy_bog_creature.png"
    bog.save(bog_out)
    print(f"  Created: {bog_out}")

    # --- Swamp Serpent (medium-long, 16x24, 4-frame = 64x24) ---
    serpent = Image.new("RGBA", (64, 24), TRANSPARENT)
    import math
    for frame in range(4):
        x0 = frame * 16
        phase = frame * math.pi / 2

        # Serpent body as a sinusoidal curve
        for seg in range(14):
            sx = 1 + seg
            sy = int(12 + 3 * math.sin(seg * 0.8 + phase))
            if 0 <= sx < 16 and 0 <= sy < 24:
                serpent.putpixel((x0+sx, sy), c(PAL["enemy_red"]))
                if sy+1 < 24:
                    serpent.putpixel((x0+sx, sy+1), c(PAL["deep_blood"]))
                if sy-1 >= 0:
                    serpent.putpixel((x0+sx, sy-1), c(PAL["fire_orange"]))

        # Head (at front)
        hx = 14
        hy = int(12 + 3 * math.sin(13 * 0.8 + phase))
        if 0 <= hx < 16 and 0 <= hy < 24:
            serpent.putpixel((x0+hx, hy), c(PAL["bright_red"]))
            if hx+1 < 16:
                serpent.putpixel((x0+hx+1, hy), c(PAL["bright_red"]))
            # Eye
            if hy-1 >= 0 and hx+1 < 16:
                serpent.putpixel((x0+hx+1, hy-1), c(PAL["bright_yellow"]))
            # Fangs
            if hy+1 < 24 and hx+1 < 16:
                serpent.putpixel((x0+hx+1, hy+1), c(PAL["near_white"]))

        # Underbelly accent (lighter)
        for seg in range(12):
            sx = 2 + seg
            sy = int(12 + 3 * math.sin(seg * 0.8 + phase)) + 2
            if 0 <= sx < 16 and 0 <= sy < 24:
                serpent.putpixel((x0+sx, sy), c(PAL["ember"]))

    serpent_out = ENEMIES_DIR / "char_enemy_swamp_serpent.png"
    serpent.save(serpent_out)
    print(f"  Created: {serpent_out}")

    # --- Will-o'-Wisp (small, 12x12 in 16x16 frame, 4-frame = 64x16) ---
    wisp = Image.new("RGBA", (64, 16), TRANSPARENT)
    for frame in range(4):
        x0 = frame * 16
        # Floating bob
        bob = [0, -1, 0, 1][frame]
        cx, cy = 8, 8 + bob

        # Outer glow (dim)
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                dist = dx*dx + dy*dy
                px, py = cx+dx, cy+dy
                if 0 <= px < 16 and 0 <= py < 16:
                    if dist < 16:
                        wisp.putpixel((x0+px, py), c(PAL["bright_yellow"], 60))
                    elif dist < 10:
                        wisp.putpixel((x0+px, py), c(PAL["bright_yellow"], 100))

        # Inner glow
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                dist = dx*dx + dy*dy
                px, py = cx+dx, cy+dy
                if 0 <= px < 16 and 0 <= py < 16:
                    if dist < 5:
                        wisp.putpixel((x0+px, py), c(PAL["pale_highlight"]))
                    elif dist < 3:
                        wisp.putpixel((x0+px, py), c(PAL["near_white"]))

        # Core
        if 0 <= cy < 16:
            wisp.putpixel((x0+cx, cy), c(PAL["near_white"]))

        # Trailing particles
        trail_positions = [
            (cx-2, cy+3+bob), (cx+1, cy+2+bob), (cx-1, cy+4+bob)
        ]
        for tx, ty in trail_positions:
            if 0 <= tx < 16 and 0 <= ty < 16:
                wisp.putpixel((x0+tx, ty), c(PAL["bright_yellow"], 140))

    wisp_out = ENEMIES_DIR / "char_enemy_wisp.png"
    wisp.save(wisp_out)
    print(f"  Created: {wisp_out}")


# ===========================================================================
# MAIN
# ===========================================================================

def main():
    # Ensure directories exist
    for d in [TILESETS_DIR, ANIMATED_DIR, PARALLAX_DIR, CHARS_DIR, ENEMIES_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    print("Generating swamp biome assets...")
    print()
    print("[1/5] Tileset")
    generate_tileset()
    print()
    print("[2/5] Animated tiles")
    generate_animated_water()
    generate_animated_fireflies()
    generate_animated_reeds()
    print()
    print("[3/5] Parallax backgrounds")
    generate_parallax()
    print()
    print("[4/5] NPC sprites")
    generate_npcs()
    print()
    print("[5/5] Enemy sprites")
    generate_enemies()
    print()
    print("Done! All swamp biome assets generated.")


if __name__ == "__main__":
    main()
