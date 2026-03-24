#!/usr/bin/env python3
"""
Generate Celestial Spire zone art assets for PixelRealm (PIX-173).
Produces:
  - 3 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Celestial Spire color language: deep sky blues, bright golds, airy whites,
ethereal purples — floating islands, cloud platforms, ancient sky-ruin tiles.
"""

import sys
sys.path.insert(0, "/tmp/pylib")

from PIL import Image, ImageDraw
from pathlib import Path
import os
import math
import random

ROOT = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASSET_ROOT = ROOT / "assets"
TILESETS_DIR = ROOT / "assets" / "tiles" / "tilesets"
PARALLAX_DIR = ROOT / "assets" / "backgrounds" / "parallax"

# -- Celestial Spire Color Palette ----------------------------------------
# All colors from the 32-color master palette

# Sky blues
SKY_DEEP      = (10, 26, 58, 255)     # #0a1a3a -- deep void
SKY_DARK      = (26, 74, 138, 255)    # #1a4a8a -- dark sky
SKY_MED       = (42, 122, 192, 255)   # #2a7ac0 -- medium sky
SKY_BRIGHT    = (80, 168, 232, 255)   # #50a8e8 -- bright sky
SKY_PALE      = (144, 208, 248, 255)  # #90d0f8 -- pale sky
SKY_WHITE     = (200, 240, 255, 255)  # #c8f0ff -- near-white shimmer

# Neutrals
WHITE         = (240, 240, 240, 255)  # #f0f0f0
CLOUD_GREY    = (200, 200, 200, 255)  # #c8c8c8
STONE_DARK    = (43, 43, 43, 255)     # #2b2b2b
STONE_MED     = (74, 74, 74, 255)     # #4a4a4a
STONE_LIGHT   = (110, 110, 110, 255)  # #6e6e6e
BLACK         = (13, 13, 13, 255)     # #0d0d0d

# Gold/yellow -- celestial glow
GOLD_DARK     = (168, 112, 0, 255)    # #a87000
GOLD          = (232, 184, 0, 255)    # #e8b800
GOLD_BRIGHT   = (255, 224, 64, 255)   # #ffe040

# Purple/magic -- ancient ruins
PURPLE_DEEP   = (26, 10, 58, 255)     # #1a0a3a
PURPLE_MED    = (144, 80, 224, 255)   # #9050e0
PURPLE_LIGHT  = (208, 144, 255, 255)  # #d090ff

# Earth tones -- ruin stone
EARTH_DARK    = (59, 32, 16, 255)     # #3b2010
EARTH_MED     = (139, 92, 42, 255)    # #8b5c2a
EARTH_LIGHT   = (184, 132, 63, 255)   # #b8843f
SAND          = (232, 208, 138, 255)  # #e8d08a

# Red/warm accents
RED_DARK      = (90, 10, 10, 255)     # #5a0a0a
ORANGE        = (240, 96, 32, 255)    # #f06020
EMBER         = (248, 160, 96, 255)   # #f8a060

OUTLINE       = (10, 15, 30, 255)
TRANSPARENT   = (0, 0, 0, 0)

# -- Creature-specific palettes -------------------------------------------

# Wind Elemental -- swirling air spirit
WIND_BODY     = SKY_BRIGHT
WIND_CORE     = SKY_WHITE
WIND_GLOW     = WHITE
WIND_DARK     = SKY_MED
WIND_SWIRL    = SKY_PALE
WIND_EYE      = GOLD_BRIGHT

# Sky Sentinel -- armored guardian of the spire
SENTINEL_ARMOR   = STONE_MED
SENTINEL_ARMOR_L = STONE_LIGHT
SENTINEL_TRIM    = GOLD
SENTINEL_VISOR   = SKY_BRIGHT
SENTINEL_CAPE    = SKY_DARK
SENTINEL_GLOW    = GOLD_BRIGHT
SENTINEL_SKIN    = STONE_DARK
SENTINEL_WEAPON  = CLOUD_GREY

# Storm Harpy -- winged sky predator
HARPY_BODY    = PURPLE_MED
HARPY_WING_D  = SKY_DARK
HARPY_WING_L  = SKY_MED
HARPY_FEATHER = SKY_BRIGHT
HARPY_SKIN    = (180, 170, 200, 255)
HARPY_HAIR    = PURPLE_LIGHT
HARPY_EYE     = GOLD_BRIGHT
HARPY_TALON   = STONE_DARK
HARPY_SPARK   = GOLD_BRIGHT

# Stormkeeper Titan boss
TITAN_BODY    = SKY_DARK
TITAN_ARMOR   = (30, 50, 100, 255)
TITAN_CRYSTAL = GOLD
TITAN_GLOW    = GOLD_BRIGHT
TITAN_EYE     = GOLD_BRIGHT
TITAN_CROWN   = PURPLE_MED
TITAN_DARK    = SKY_DEEP
TITAN_SKIN    = (60, 90, 140, 255)
TITAN_WEAPON  = STONE_LIGHT
TITAN_WING    = SKY_MED

# NPC: Celestial Scholar
SCHOLAR_ROBE   = (60, 50, 100, 255)
SCHOLAR_ROBE_L = (80, 70, 130, 255)
SCHOLAR_SKIN   = (200, 180, 160, 255)
SCHOLAR_SKIN_D = (170, 150, 130, 255)
SCHOLAR_HAIR   = SKY_PALE
SCHOLAR_BOOK   = EARTH_MED
SCHOLAR_TRIM   = GOLD
SCHOLAR_BELT   = GOLD_DARK
SCHOLAR_EYES   = STONE_DARK

# Tileset colors
TILE_CLOUD     = WHITE
TILE_CLOUD_D   = CLOUD_GREY
TILE_SKY       = SKY_BRIGHT
TILE_SKY_D     = SKY_MED
TILE_RUIN      = EARTH_MED
TILE_RUIN_D    = EARTH_DARK
TILE_RUIN_L    = EARTH_LIGHT
TILE_GOLD      = GOLD
TILE_GOLD_D    = GOLD_DARK
TILE_ISLAND    = (76, 155, 76, 255)   # #4c9b4c -- green grass on islands
TILE_ISLAND_D  = (45, 110, 45, 255)   # #2d6e2d -- dark grass
TILE_STONE     = STONE_MED
TILE_STONE_D   = STONE_DARK
TILE_STONE_L   = STONE_LIGHT


def ensure_dir(path):
    os.makedirs(os.path.dirname(path) if isinstance(path, str) else path.parent, exist_ok=True)


def save_asset(img, rel_path):
    full_path = ASSET_ROOT / rel_path if isinstance(rel_path, str) else rel_path
    ensure_dir(full_path)
    img.save(str(full_path))
    print(f"  Created: {full_path.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# ENEMY 1: WIND ELEMENTAL -- swirling air vortex, 16x16, 8 frames
# Frames 0-3: float/swirl, Frames 4-7: attack (gust blast)
# =========================================================================

def draw_wind_elemental(draw, ox, oy, frame):
    """Draw a single 16x16 Wind Elemental frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [0, -1, -2, -1][anim]
    spin = anim * 1.5

    cx, cy = 8, 8 + float_y

    # Outer swirl ring (rotating wind trails)
    for i in range(6):
        angle = spin + i * (math.pi / 3)
        r = 5
        px = int(cx + r * math.cos(angle))
        py = int(cy + r * math.sin(angle))
        if 0 <= px < 16 and 0 <= py < 16:
            draw.point((ox + px, oy + py), fill=WIND_SWIRL)

    # Mid body -- swirling vortex shape
    for dx in range(-3, 4):
        for dy in range(-3, 4):
            dist = abs(dx) + abs(dy)
            if dist <= 3 and dist > 1:
                draw.point((ox + cx + dx, oy + cy + dy), fill=WIND_DARK)

    # Inner body
    for dx in range(-1, 2):
        for dy in range(-1, 2):
            if abs(dx) + abs(dy) <= 1:
                draw.point((ox + cx + dx, oy + cy + dy), fill=WIND_BODY)

    # Core glow
    draw.point((ox + cx, oy + cy), fill=WIND_CORE)

    # Eyes
    draw.point((ox + cx - 1, oy + cy - 1), fill=WIND_EYE)
    draw.point((ox + cx + 1, oy + cy - 1), fill=WIND_EYE)

    # Wispy tendrils (top/bottom)
    tendril_sway = [0, 1, 0, -1][anim]
    draw.point((ox + cx + tendril_sway, oy + cy - 4), fill=WIND_SWIRL)
    draw.point((ox + cx - tendril_sway, oy + cy + 4), fill=WIND_SWIRL)
    draw.point((ox + cx + 3 + tendril_sway, oy + cy - 2), fill=SKY_PALE)
    draw.point((ox + cx - 3 - tendril_sway, oy + cy + 2), fill=SKY_PALE)

    # Attack: gust projectile
    if is_attack:
        gust_ext = [0, 2, 4, 2][anim]
        if gust_ext > 0:
            for s in range(gust_ext):
                draw.point((ox + cx + 5 + s, oy + cy), fill=WIND_SWIRL)
                draw.point((ox + cx + 5 + s, oy + cy - 1), fill=SKY_PALE)
            if gust_ext >= 3:
                draw.point((ox + cx + 5 + gust_ext, oy + cy + 1), fill=WIND_CORE)
                draw.point((ox + cx + 5 + gust_ext, oy + cy - 1), fill=WIND_CORE)


def generate_wind_elemental():
    """Generate 8-frame Wind Elemental sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_wind_elemental(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_wind_elemental.png")
    return img


# =========================================================================
# ENEMY 2: SKY SENTINEL -- armored floating guardian, 16x16, 8 frames
# Frames 0-3: hover/patrol, Frames 4-7: attack (lance thrust)
# =========================================================================

def draw_sky_sentinel(draw, ox, oy, frame):
    """Draw a single 16x16 Sky Sentinel frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, -1, 0, -1][anim]
    thrust = [0, 1, 3, 1][anim] if is_attack else 0

    # Legs (armored, hovering -- short stubs with glow beneath)
    draw.rectangle([ox + 6, oy + 12 + bob, ox + 6, oy + 13], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 9, oy + 13], fill=SENTINEL_ARMOR)
    # Hover glow beneath feet
    draw.point((ox + 6, oy + 14), fill=GOLD)
    draw.point((ox + 9, oy + 14), fill=GOLD)
    if anim % 2 == 0:
        draw.point((ox + 7, oy + 15), fill=GOLD_DARK)
        draw.point((ox + 8, oy + 15), fill=GOLD_DARK)

    # Torso (armored chestplate)
    draw.rectangle([ox + 5, oy + 7 + bob, ox + 10, oy + 12 + bob], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 6, oy + 8 + bob, ox + 9, oy + 11 + bob], fill=SENTINEL_ARMOR_L)
    # Gold trim on chest
    draw.point((ox + 7, oy + 9 + bob), fill=SENTINEL_TRIM)
    draw.point((ox + 8, oy + 9 + bob), fill=SENTINEL_TRIM)

    # Cape
    cape_sway = [0, 1, 0, -1][anim]
    draw.rectangle([ox + 4, oy + 8 + bob, ox + 5, oy + 13 + bob + cape_sway], fill=SENTINEL_CAPE)

    # Helmet/head
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 7 + bob], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 4 + bob], fill=SENTINEL_ARMOR_L)
    # Visor glow
    draw.point((ox + 7, oy + 5 + bob), fill=SENTINEL_VISOR)
    draw.point((ox + 8, oy + 5 + bob), fill=SENTINEL_VISOR)
    # Crest
    draw.point((ox + 7, oy + 2 + bob), fill=SENTINEL_TRIM)
    draw.point((ox + 8, oy + 2 + bob), fill=SENTINEL_TRIM)

    # Arms + lance
    if is_attack:
        # Lance thrust forward
        draw.rectangle([ox + 10, oy + 8 + bob, ox + 11, oy + 10 + bob], fill=SENTINEL_ARMOR)
        # Lance
        for lx in range(thrust + 2):
            draw.point((ox + 12 + lx, oy + 9 + bob), fill=SENTINEL_WEAPON)
        # Lance tip
        draw.point((ox + 12 + thrust + 2, oy + 9 + bob), fill=SENTINEL_GLOW)
        # Left arm back
        draw.rectangle([ox + 4, oy + 8 + bob, ox + 5, oy + 10 + bob], fill=SENTINEL_ARMOR)
    else:
        # Arms at sides
        draw.rectangle([ox + 4, oy + 8 + bob, ox + 5, oy + 11 + bob], fill=SENTINEL_ARMOR)
        draw.rectangle([ox + 10, oy + 8 + bob, ox + 11, oy + 11 + bob], fill=SENTINEL_ARMOR)
        # Lance held vertically
        draw.rectangle([ox + 11, oy + 4 + bob, ox + 11, oy + 13 + bob], fill=SENTINEL_WEAPON)
        draw.point((ox + 11, oy + 3 + bob), fill=SENTINEL_GLOW)


def generate_sky_sentinel():
    """Generate 8-frame Sky Sentinel sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_sky_sentinel(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_sky_sentinel.png")
    return img


# =========================================================================
# ENEMY 3: STORM HARPY -- winged sky predator, 16x16, 8 frames
# Frames 0-3: fly/glide, Frames 4-7: attack (dive + lightning talon)
# =========================================================================

def draw_storm_harpy(draw, ox, oy, frame):
    """Draw a single 16x16 Storm Harpy frame."""
    is_attack = frame >= 4
    anim = frame % 4

    flap = [0, -2, -1, 0][anim]
    dive = [0, 1, 2, 1][anim] if is_attack else 0

    # Body (center torso)
    body_y = 8 + dive
    draw.rectangle([ox + 6, oy + body_y, ox + 9, oy + body_y + 3], fill=HARPY_BODY)
    draw.rectangle([ox + 7, oy + body_y + 1, ox + 8, oy + body_y + 2], fill=HARPY_SKIN)

    # Head
    draw.rectangle([ox + 6, oy + body_y - 3, ox + 9, oy + body_y], fill=HARPY_SKIN)
    # Hair
    draw.rectangle([ox + 6, oy + body_y - 4, ox + 9, oy + body_y - 3], fill=HARPY_HAIR)
    draw.point((ox + 5, oy + body_y - 3), fill=HARPY_HAIR)
    draw.point((ox + 10, oy + body_y - 3), fill=HARPY_HAIR)
    # Eyes
    draw.point((ox + 7, oy + body_y - 2), fill=HARPY_EYE)
    draw.point((ox + 9, oy + body_y - 2), fill=HARPY_EYE)

    # Wings (large, flapping)
    wing_y = body_y - 1 + flap
    # Left wing
    draw.rectangle([ox + 1, oy + wing_y, ox + 5, oy + wing_y + 2], fill=HARPY_WING_D)
    draw.rectangle([ox + 2, oy + wing_y, ox + 4, oy + wing_y + 1], fill=HARPY_WING_L)
    draw.point((ox + 0, oy + wing_y + 1), fill=HARPY_FEATHER)
    # Right wing
    draw.rectangle([ox + 10, oy + wing_y, ox + 14, oy + wing_y + 2], fill=HARPY_WING_D)
    draw.rectangle([ox + 11, oy + wing_y, ox + 13, oy + wing_y + 1], fill=HARPY_WING_L)
    draw.point((ox + 15, oy + wing_y + 1), fill=HARPY_FEATHER)

    # Talons
    draw.point((ox + 7, oy + body_y + 4), fill=HARPY_TALON)
    draw.point((ox + 9, oy + body_y + 4), fill=HARPY_TALON)

    # Attack: lightning sparks from talons
    if is_attack:
        spark_ext = [0, 1, 3, 1][anim]
        if spark_ext > 0:
            for s in range(spark_ext):
                draw.point((ox + 8, oy + body_y + 5 + s), fill=HARPY_SPARK)
            # Lightning fork
            if spark_ext >= 2:
                draw.point((ox + 7, oy + body_y + 5 + spark_ext), fill=GOLD)
                draw.point((ox + 9, oy + body_y + 5 + spark_ext), fill=GOLD)


def generate_storm_harpy():
    """Generate 8-frame Storm Harpy sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_storm_harpy(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_storm_harpy.png")
    return img


# =========================================================================
# BOSS: STORMKEEPER TITAN -- massive sky lord, 32x32, multi-phase
# idle (1 frame), attack (4 frames), phase1/2/3 (1 frame each)
# =========================================================================

def draw_stormkeeper_titan(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw the Stormkeeper Titan boss at 32x32."""
    anim = frame % 4
    breath = [0, -1, 0, 1][anim]

    # Phase color shifts
    body = TITAN_BODY
    crystal = TITAN_CRYSTAL
    glow = TITAN_GLOW
    crown = TITAN_CROWN
    wing_c = TITAN_WING
    if phase == 2:
        body = (20, 50, 110, 255)
        crystal = GOLD_BRIGHT
        glow = (255, 240, 120, 255)
        wing_c = SKY_BRIGHT
    elif phase == 3:
        body = (40, 20, 80, 255)
        crystal = PURPLE_LIGHT
        glow = (230, 180, 255, 255)
        crown = PURPLE_LIGHT
        wing_c = PURPLE_MED

    outline = OUTLINE

    # Legs -- massive pillars
    draw.rectangle([ox + 9, oy + 24 + breath, ox + 13, oy + 29], fill=body)
    draw.rectangle([ox + 19, oy + 24 + breath, ox + 23, oy + 29], fill=body)
    # Feet
    draw.rectangle([ox + 8, oy + 28, ox + 14, oy + 31], fill=TITAN_DARK)
    draw.rectangle([ox + 18, oy + 28, ox + 24, oy + 31], fill=TITAN_DARK)

    # Torso
    draw.rectangle([ox + 9, oy + 14 + breath, ox + 23, oy + 24 + breath], fill=body)
    draw.rectangle([ox + 10, oy + 15 + breath, ox + 22, oy + 23 + breath], fill=TITAN_ARMOR)
    # Chest rune/crystal
    draw.rectangle([ox + 14, oy + 17 + breath, ox + 18, oy + 21 + breath], fill=crystal)
    draw.rectangle([ox + 15, oy + 18 + breath, ox + 17, oy + 20 + breath], fill=glow)

    # Shoulders -- golden pauldrons
    draw.rectangle([ox + 5, oy + 13 + breath, ox + 10, oy + 17 + breath], fill=TITAN_ARMOR)
    draw.rectangle([ox + 22, oy + 13 + breath, ox + 27, oy + 17 + breath], fill=TITAN_ARMOR)
    # Shoulder crystals
    draw.point((ox + 6, oy + 12 + breath), fill=crystal)
    draw.point((ox + 7, oy + 11 + breath), fill=crystal)
    draw.point((ox + 26, oy + 12 + breath), fill=crystal)
    draw.point((ox + 25, oy + 11 + breath), fill=crystal)

    # Wings (ethereal sky energy)
    wing_wave = [0, 1, 2, 1][anim]
    # Left wing
    draw.rectangle([ox + 1, oy + 10 + breath - wing_wave, ox + 6, oy + 14 + breath], fill=wing_c)
    draw.point((ox + 0, oy + 11 + breath - wing_wave), fill=SKY_PALE)
    draw.point((ox + 0, oy + 12 + breath - wing_wave), fill=SKY_PALE)
    # Right wing
    draw.rectangle([ox + 26, oy + 10 + breath - wing_wave, ox + 31, oy + 14 + breath], fill=wing_c)
    draw.point((ox + 31, oy + 11 + breath - wing_wave), fill=SKY_PALE)
    draw.point((ox + 31, oy + 12 + breath - wing_wave), fill=SKY_PALE)

    # Head
    draw.rectangle([ox + 11, oy + 7 + breath, ox + 21, oy + 14 + breath], fill=body)
    draw.rectangle([ox + 12, oy + 8 + breath, ox + 20, oy + 13 + breath], fill=TITAN_SKIN)

    # Crown of lightning/runes
    draw.point((ox + 11, oy + 5 + breath), fill=crown)
    draw.point((ox + 13, oy + 4 + breath), fill=crown)
    draw.point((ox + 16, oy + 3 + breath), fill=crown)
    draw.point((ox + 19, oy + 4 + breath), fill=crown)
    draw.point((ox + 21, oy + 5 + breath), fill=crown)
    # Crown connectors
    draw.point((ox + 12, oy + 6 + breath), fill=crown)
    draw.point((ox + 14, oy + 5 + breath), fill=glow)
    draw.point((ox + 16, oy + 2 + breath), fill=glow)
    draw.point((ox + 18, oy + 5 + breath), fill=glow)
    draw.point((ox + 20, oy + 6 + breath), fill=crown)

    # Eyes (glowing gold)
    draw.rectangle([ox + 13, oy + 9 + breath, ox + 14, oy + 10 + breath], fill=TITAN_EYE)
    draw.rectangle([ox + 18, oy + 9 + breath, ox + 19, oy + 10 + breath], fill=TITAN_EYE)

    # Mouth
    if is_attack and anim in (1, 2):
        # Storm roar
        draw.rectangle([ox + 14, oy + 11 + breath, ox + 18, oy + 12 + breath], fill=outline)
        draw.point((ox + 15, oy + 12 + breath), fill=GOLD)
        draw.point((ox + 17, oy + 12 + breath), fill=GOLD)
        # Lightning breath
        for bx in range(1, 5):
            draw.point((ox + 16, oy + 13 + breath + bx), fill=GOLD_BRIGHT)
            if bx > 1:
                draw.point((ox + 15, oy + 13 + breath + bx), fill=GOLD)
                draw.point((ox + 17, oy + 13 + breath + bx), fill=GOLD)
    else:
        draw.rectangle([ox + 15, oy + 11 + breath, ox + 17, oy + 11 + breath], fill=outline)

    # Arms
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        attack_ext = [0, 2, 4, 2][anim]
        # Arms raise for storm call
        draw.rectangle([ox + 3, oy + 14 + breath - attack_ext, ox + 7, oy + 20 + breath], fill=body)
        draw.point((ox + 3, oy + 14 + breath - attack_ext), fill=TITAN_WEAPON)
        draw.point((ox + 4, oy + 13 + breath - attack_ext), fill=TITAN_WEAPON)
        draw.rectangle([ox + 25, oy + 14 + breath - attack_ext, ox + 29, oy + 20 + breath], fill=body)
        draw.point((ox + 29, oy + 14 + breath - attack_ext), fill=TITAN_WEAPON)
        draw.point((ox + 28, oy + 13 + breath - attack_ext), fill=TITAN_WEAPON)
        # Lightning bolts from hands
        if attack_ext >= 3:
            for ix in range(4, 28, 4):
                draw.point((ox + ix, oy + 30), fill=GOLD_BRIGHT)
                draw.point((ox + ix, oy + 31), fill=GOLD)
    else:
        # Idle arms
        draw.rectangle([ox + 4, oy + 16 + breath + arm_wave, ox + 8, oy + 23 + breath + arm_wave], fill=body)
        draw.rectangle([ox + 24, oy + 16 + breath + arm_wave, ox + 28, oy + 23 + breath + arm_wave], fill=body)
        # Fists
        draw.rectangle([ox + 3, oy + 22 + breath + arm_wave, ox + 7, oy + 24 + breath + arm_wave], fill=TITAN_SKIN)
        draw.rectangle([ox + 25, oy + 22 + breath + arm_wave, ox + 29, oy + 24 + breath + arm_wave], fill=TITAN_SKIN)

    # Phase-specific effects
    if phase >= 2:
        # Storm aura particles
        aura_pos = [(4, 8), (28, 10), (6, 5), (26, 7)]
        for i, (ax, ay) in enumerate(aura_pos):
            if (anim + i) % 3 == 0:
                draw.point((ox + ax, oy + ay + breath), fill=GOLD_BRIGHT)

    if phase == 3:
        # Swirling purple storm around base
        for tx in range(3, 29, 3):
            ty = 27 + (anim + tx) % 4
            if ty < 32:
                draw.point((ox + tx, oy + ty), fill=PURPLE_LIGHT)
        # Crown radiates
        draw.point((ox + 16, oy + 1 + breath), fill=glow)
        draw.point((ox + 15, oy + 1 + breath), fill=crystal)
        draw.point((ox + 17, oy + 1 + breath), fill=crystal)


def generate_stormkeeper_titan():
    """Generate all Stormkeeper Titan boss sprite sheets."""
    # Idle
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_stormkeeper_titan(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_stormkeeper_titan_idle.png")

    # Attack -- 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        draw_stormkeeper_titan(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_stormkeeper_titan_attack.png")

    # Phase 1
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_stormkeeper_titan(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_stormkeeper_titan_phase1.png")

    # Phase 2 -- intensified storm
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_stormkeeper_titan(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_stormkeeper_titan_phase2.png")

    # Phase 3 -- arcane storm
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_stormkeeper_titan(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_stormkeeper_titan_phase3.png")


# =========================================================================
# NPC: CELESTIAL SCHOLAR -- zone quest giver, 16x24
# Robed sage with floating book and gold trim
# =========================================================================

def draw_celestial_scholar(draw, ox, oy):
    """Draw the Celestial Scholar NPC at 16x24."""
    # Feet / sandals
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=EARTH_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=EARTH_DARK)

    # Robe (long, ornate celestial robe)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=SCHOLAR_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=SCHOLAR_ROBE_L)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=SCHOLAR_ROBE)
    # Gold trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=SCHOLAR_TRIM)

    # Belt with celestial buckle
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=SCHOLAR_BELT)
    # Star pendant
    draw.point((ox + 8, oy + 15), fill=GOLD_BRIGHT)
    draw.point((ox + 8, oy + 16), fill=GOLD)

    # Arms (in robe sleeves)
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=SCHOLAR_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=SCHOLAR_ROBE)
    # Gold cuffs
    draw.point((ox + 2, oy + 16), fill=SCHOLAR_TRIM)
    draw.point((ox + 14, oy + 16), fill=SCHOLAR_TRIM)
    # Hands
    draw.point((ox + 2, oy + 17), fill=SCHOLAR_SKIN)
    draw.point((ox + 14, oy + 17), fill=SCHOLAR_SKIN)

    # Floating book (held with left hand)
    draw.rectangle([ox + 1, oy + 15, ox + 3, oy + 18], fill=SCHOLAR_BOOK)
    draw.point((ox + 2, oy + 16), fill=GOLD)
    # Pages
    draw.rectangle([ox + 1, oy + 16, ox + 1, oy + 17], fill=WHITE)

    # Staff (right hand -- celestial staff with star orb)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=EARTH_MED)
    # Star orb on top
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=GOLD)
    draw.point((ox + 14, oy + 1), fill=GOLD_BRIGHT)
    draw.point((ox + 14, oy + 2), fill=SKY_WHITE)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=SCHOLAR_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=SCHOLAR_SKIN)

    # Hair (silvery-blue, styled)
    draw.rectangle([ox + 5, oy + 3, ox + 11, oy + 5], fill=SCHOLAR_HAIR)
    draw.point((ox + 4, oy + 5), fill=SCHOLAR_HAIR)
    draw.point((ox + 4, oy + 6), fill=SCHOLAR_HAIR)
    draw.point((ox + 12, oy + 5), fill=SCHOLAR_HAIR)
    draw.point((ox + 12, oy + 6), fill=SCHOLAR_HAIR)

    # Circlet / headband
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 4], fill=GOLD)
    draw.point((ox + 8, oy + 3), fill=GOLD_BRIGHT)

    # Eyes
    draw.point((ox + 7, oy + 6), fill=SCHOLAR_EYES)
    draw.point((ox + 9, oy + 6), fill=SCHOLAR_EYES)


def generate_celestial_scholar():
    """Generate Celestial Scholar NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_celestial_scholar(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_celestial.png")
    return img


# =========================================================================
# TILESET -- tileset_celestial.png (256x64, 16 cols x 4 rows)
# =========================================================================

def c(color, alpha=None):
    """Ensure RGBA tuple, optionally override alpha."""
    if alpha is not None:
        return (color[0], color[1], color[2], alpha)
    return color


def draw_tile(img, col, row, tile_fn):
    """Draw a single 16x16 tile at grid position."""
    tile = Image.new("RGBA", (16, 16), TRANSPARENT)
    tile_fn(tile)
    img.paste(tile, (col * 16, row * 16), tile)


# -- Individual tile functions ---------------------------------------------

def tile_cloud_solid(tile):
    """Solid cloud platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_CLOUD)
    # Subtle puffiness
    for x in range(0, 16, 4):
        for y in range(0, 16, 5):
            d.point((x + 2, y + 2), fill=TILE_CLOUD_D)


def tile_cloud_light(tile):
    """Light/translucent cloud."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=c(TILE_CLOUD, 200))
    d.point((4, 3), fill=c(WHITE, 220))
    d.point((10, 8), fill=c(WHITE, 220))
    d.point((7, 12), fill=c(TILE_CLOUD_D, 180))


def tile_island_grass(tile):
    """Floating island grass top."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ISLAND)
    # Grass texture
    for x in range(1, 15, 3):
        d.point((x, 0), fill=TILE_ISLAND_D)
        d.point((x + 1, 1), fill=TILE_ISLAND_D)
    # Lighter highlights
    d.point((5, 5), fill=(120, 200, 120, 255))
    d.point((10, 9), fill=(120, 200, 120, 255))


def tile_island_dirt(tile):
    """Floating island underside (dirt/rock)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_RUIN_D)
    d.rectangle([1, 1, 14, 14], fill=TILE_RUIN)
    # Crumbling edge texture
    d.point((3, 13), fill=TILE_RUIN_D)
    d.point((8, 14), fill=TILE_RUIN_D)
    d.point((12, 12), fill=TILE_RUIN_D)


def tile_island_edge_n(tile):
    """Floating island top edge (grass on top, dirt below)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 6], fill=TILE_ISLAND)
    d.rectangle([0, 7, 15, 15], fill=TILE_RUIN)
    # Grass blades on edge
    d.point((3, 6), fill=TILE_ISLAND_D)
    d.point((8, 6), fill=TILE_ISLAND_D)
    d.point((12, 6), fill=TILE_ISLAND_D)


def tile_ruin_stone(tile):
    """Ancient ruin stone block."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    d.rectangle([1, 1, 14, 14], fill=TILE_STONE_L)
    # Mortar lines
    d.line([(0, 8), (15, 8)], fill=TILE_STONE_D, width=1)
    d.line([(8, 0), (8, 8)], fill=TILE_STONE_D, width=1)
    d.line([(4, 8), (4, 15)], fill=TILE_STONE_D, width=1)
    d.line([(12, 8), (12, 15)], fill=TILE_STONE_D, width=1)


def tile_ruin_pillar(tile):
    """Ruin column/pillar."""
    d = ImageDraw.Draw(tile)
    # Column shaft
    d.rectangle([5, 0, 10, 15], fill=TILE_STONE_L)
    d.rectangle([6, 0, 9, 15], fill=TILE_STONE)
    # Carved rune
    d.point((7, 5), fill=TILE_GOLD)
    d.point((8, 6), fill=TILE_GOLD)
    d.point((7, 7), fill=TILE_GOLD)


def tile_ruin_floor(tile):
    """Decorated ruin floor tile."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE_L)
    # Ornamental border
    d.rectangle([0, 0, 15, 0], fill=TILE_GOLD_D)
    d.rectangle([0, 15, 15, 15], fill=TILE_GOLD_D)
    d.rectangle([0, 0, 0, 15], fill=TILE_GOLD_D)
    d.rectangle([15, 0, 15, 15], fill=TILE_GOLD_D)
    # Center star pattern
    d.point((8, 8), fill=TILE_GOLD)
    d.point((7, 7), fill=TILE_GOLD_D)
    d.point((9, 7), fill=TILE_GOLD_D)
    d.point((7, 9), fill=TILE_GOLD_D)
    d.point((9, 9), fill=TILE_GOLD_D)


def tile_ruin_wall_top(tile):
    """Ruin wall cap with gold trim."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    # Cap/cornice
    d.rectangle([0, 0, 15, 3], fill=TILE_STONE_L)
    d.rectangle([0, 3, 15, 4], fill=TILE_GOLD_D)


def tile_sky_open(tile):
    """Open sky tile (background)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=c(TILE_SKY, 120))
    # Wispy cloud streak
    d.point((3, 6), fill=c(WHITE, 80))
    d.point((4, 6), fill=c(WHITE, 80))
    d.point((5, 7), fill=c(WHITE, 60))


def tile_cloud_edge_n(tile):
    """Cloud platform north edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 7], fill=TILE_CLOUD)
    # Fluffy edge
    d.point((2, 8), fill=TILE_CLOUD)
    d.point((6, 9), fill=TILE_CLOUD)
    d.point((11, 8), fill=TILE_CLOUD)
    d.point((14, 9), fill=TILE_CLOUD_D)


def tile_cloud_edge_s(tile):
    """Cloud platform south edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 8, 15, 15], fill=TILE_CLOUD)
    d.point((3, 7), fill=TILE_CLOUD)
    d.point((9, 6), fill=TILE_CLOUD)
    d.point((13, 7), fill=TILE_CLOUD_D)


def tile_cloud_edge_w(tile):
    """Cloud platform west edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 7, 15], fill=TILE_CLOUD)
    d.point((8, 3), fill=TILE_CLOUD)
    d.point((8, 10), fill=TILE_CLOUD_D)


def tile_cloud_edge_e(tile):
    """Cloud platform east edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([8, 0, 15, 15], fill=TILE_CLOUD)
    d.point((7, 4), fill=TILE_CLOUD)
    d.point((7, 11), fill=TILE_CLOUD_D)


def tile_rune_glow(tile):
    """Glowing rune on floor."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    # Rune circle
    cx, cy = 8, 8
    for angle_i in range(12):
        angle = angle_i * (math.pi / 6)
        px = int(cx + 5 * math.cos(angle))
        py = int(cy + 5 * math.sin(angle))
        if 0 <= px < 16 and 0 <= py < 16:
            d.point((px, py), fill=TILE_GOLD)
    # Center rune
    d.point((8, 8), fill=GOLD_BRIGHT)
    d.point((7, 7), fill=GOLD)
    d.point((9, 9), fill=GOLD)


def tile_wind_crystal(tile):
    """Wind crystal formation."""
    d = ImageDraw.Draw(tile)
    # Base cloud
    d.rectangle([0, 12, 15, 15], fill=TILE_CLOUD)
    # Crystal shards
    d.rectangle([6, 3, 9, 12], fill=SKY_MED)
    d.rectangle([7, 1, 8, 11], fill=SKY_BRIGHT)
    d.point((7, 0), fill=SKY_PALE)
    # Side shards
    d.rectangle([3, 6, 5, 12], fill=SKY_MED)
    d.point((4, 5), fill=SKY_PALE)
    d.rectangle([11, 7, 13, 12], fill=SKY_MED)
    d.point((12, 6), fill=SKY_PALE)


def tile_cloud_variant1(tile):
    """Cloud ground variant 1."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_CLOUD)
    d.point((4, 5), fill=TILE_CLOUD_D)
    d.point((11, 3), fill=TILE_CLOUD_D)
    d.point((7, 11), fill=SKY_WHITE)


def tile_cloud_variant2(tile):
    """Cloud ground variant 2."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_CLOUD)
    d.point((3, 8), fill=SKY_WHITE)
    d.point((10, 2), fill=SKY_WHITE)
    d.point((13, 12), fill=TILE_CLOUD_D)


def generate_tileset():
    """Generate the main tileset_celestial.png (256x64)."""
    random.seed(173)  # Deterministic for PIX-173
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground / platform tiles
    row0 = [
        tile_cloud_solid, tile_cloud_light, tile_island_grass, tile_island_dirt,
        tile_island_edge_n, tile_ruin_stone, tile_ruin_floor, tile_ruin_pillar,
        tile_cloud_variant1, tile_cloud_variant2, tile_cloud_edge_n, tile_cloud_edge_s,
        tile_cloud_edge_w, tile_cloud_edge_e, tile_sky_open, tile_cloud_solid,
    ]
    for i, fn in enumerate(row0):
        random.seed(173 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Terrain features
    row1 = [
        tile_ruin_wall_top, tile_ruin_pillar, tile_wind_crystal, tile_rune_glow,
        tile_island_grass, tile_island_dirt, tile_ruin_stone, tile_ruin_floor,
        tile_cloud_solid, tile_cloud_light, tile_sky_open, tile_sky_open,
        tile_cloud_variant1, tile_cloud_variant2, tile_cloud_solid, tile_cloud_solid,
    ]
    for i, fn in enumerate(row1):
        random.seed(173 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions + decorations
    row2 = [
        tile_cloud_edge_n, tile_cloud_edge_s, tile_cloud_edge_w, tile_cloud_edge_e,
        tile_sky_open, tile_sky_open, tile_island_grass, tile_island_dirt,
        tile_cloud_solid, tile_cloud_light, tile_ruin_stone, tile_ruin_floor,
        tile_rune_glow, tile_wind_crystal, tile_ruin_pillar, tile_ruin_wall_top,
    ]
    for i, fn in enumerate(row2):
        random.seed(173 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: More variants
    row3 = [
        tile_wind_crystal, tile_rune_glow, tile_ruin_pillar, tile_ruin_wall_top,
        tile_island_edge_n, tile_island_grass, tile_island_dirt, tile_ruin_floor,
        tile_cloud_edge_n, tile_cloud_edge_s, tile_cloud_edge_w, tile_cloud_edge_e,
        tile_cloud_variant1, tile_cloud_variant2, tile_cloud_solid, tile_sky_open,
    ]
    for i, fn in enumerate(row3):
        random.seed(173 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(173)
    out = TILESETS_DIR / "tileset_celestial.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# PARALLAX BACKGROUNDS -- 320x180, three layers (far/mid/near)
# =========================================================================

def generate_parallax():
    """Three parallax layers for Celestial Spire zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # -- FAR LAYER: sky gradient with distant floating islands --
    far = Image.new("RGBA", (320, 180), SKY_DEEP)
    fd = ImageDraw.Draw(far)
    # Sky gradient (top = deep blue-black, bottom = bright sky blue)
    for y in range(180):
        ratio = y / 180
        r = int(SKY_DEEP[0] * (1 - ratio) + SKY_MED[0] * ratio)
        g = int(SKY_DEEP[1] * (1 - ratio) + SKY_MED[1] * ratio)
        b = int(SKY_DEEP[2] * (1 - ratio) + SKY_MED[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    # Stars in upper sky
    random.seed(173)
    for _ in range(40):
        sx, sy = random.randint(0, 319), random.randint(0, 90)
        fd.point((sx, sy), fill=WHITE)

    # Distant floating island silhouettes
    island_positions = [(50, 70), (120, 55), (200, 80), (280, 60), (350, 75)]
    for ix_pos, iy_pos in island_positions:
        width = random.randint(25, 45)
        height = random.randint(8, 14)
        for x in range(ix_pos - width, ix_pos + width):
            if 0 <= x < 320:
                dist = abs(x - ix_pos)
                h = int((1 - dist / width) * height)
                # Top (flat/slightly curved)
                fd.line([(x, iy_pos - h // 2), (x, iy_pos)], fill=c(STONE_MED))
                # Green on top
                if h > 2:
                    fd.point((x, iy_pos - h // 2), fill=c(TILE_ISLAND_D))
                # Bottom (tapered)
                bottom_h = int(h * 0.6 * (1 - dist / width))
                if bottom_h > 0:
                    fd.line([(x, iy_pos), (x, iy_pos + bottom_h)], fill=c(EARTH_DARK))

    # Distant clouds
    for _ in range(8):
        cx = random.randint(0, 300)
        cy = random.randint(100, 160)
        cw = random.randint(20, 50)
        ch = random.randint(3, 6)
        fd.rectangle([cx, cy, cx + cw, cy + ch], fill=c(WHITE, 60))

    far_out = PARALLAX_DIR / "bg_parallax_celestial_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # -- MID LAYER: closer floating islands, cloud banks, ruin towers --
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(174)

    # Cloud banks (large rolling clouds in mid-ground)
    for _ in range(5):
        cx = random.randint(-20, 300)
        cy = random.randint(80, 140)
        cw = random.randint(40, 80)
        ch = random.randint(8, 15)
        md.rectangle([cx, cy, cx + cw, cy + ch], fill=c(WHITE, 120))
        md.rectangle([cx + 5, cy + 2, cx + cw - 5, cy + ch - 2], fill=c(WHITE, 150))

    # Mid-ground floating islands with ruins
    mid_islands = [(40, 100), (160, 85), (280, 110)]
    for ix_pos, iy_pos in mid_islands:
        width = random.randint(30, 50)
        # Island top (grass)
        md.rectangle([ix_pos - width, iy_pos - 4, ix_pos + width, iy_pos], fill=c(TILE_ISLAND))
        md.rectangle([ix_pos - width + 2, iy_pos - 5, ix_pos + width - 2, iy_pos - 4], fill=c(TILE_ISLAND))
        # Island underside
        for x in range(ix_pos - width, ix_pos + width):
            if 0 <= x < 320:
                dist = abs(x - ix_pos)
                taper = int((1 - dist / width) * 15)
                md.line([(x, iy_pos), (x, iy_pos + taper)], fill=c(TILE_RUIN))

        # Ruin tower on island
        tower_x = ix_pos + random.randint(-10, 10)
        tower_h = random.randint(15, 25)
        tw = 6
        md.rectangle([tower_x - tw, iy_pos - tower_h, tower_x + tw, iy_pos - 4], fill=c(TILE_STONE_L))
        md.rectangle([tower_x - tw - 2, iy_pos - tower_h - 3, tower_x + tw + 2, iy_pos - tower_h], fill=c(TILE_STONE))
        # Tower window glow
        md.point((tower_x, iy_pos - tower_h + 5), fill=c(GOLD, 200))
        md.point((tower_x, iy_pos - tower_h + 10), fill=c(GOLD, 200))

    mid_out = PARALLAX_DIR / "bg_parallax_celestial_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # -- NEAR LAYER: foreground clouds, wind wisps, golden particles --
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(175)

    # Foreground cloud bank at bottom
    for x in range(0, 320, 2):
        h = random.randint(8, 25)
        base_y = 175
        for y in range(base_y - h, base_y):
            if 0 <= y < 180:
                alpha = 180 - int((base_y - y) * 5)
                if alpha > 0:
                    near.putpixel((x, y), c(WHITE, min(alpha, 220)))
                    if x + 1 < 320:
                        near.putpixel((x + 1, y), c(WHITE, min(alpha, 220)))

    # Bottom cloud floor
    nd.rectangle([0, 170, 319, 179], fill=c(WHITE, 200))

    # Wind streaks (diagonal wisps)
    for _ in range(30):
        sx = random.randint(0, 319)
        sy = random.randint(10, 140)
        length = random.randint(5, 12)
        for i in range(length):
            px = sx + i * 2
            py = sy + i
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = 140 - i * 12
                if alpha > 0:
                    near.putpixel((px, py), c(SKY_PALE, alpha))

    # Golden particles (floating celestial dust)
    for _ in range(25):
        gx = random.randint(0, 319)
        gy = random.randint(5, 160)
        near.putpixel((gx, gy), c(GOLD_BRIGHT, 200))
        if gx + 1 < 320:
            near.putpixel((gx + 1, gy), c(GOLD, 140))

    # Floating ruin fragments in foreground
    for fx in range(30, 320, 80):
        fy = random.randint(20, 60)
        fw = random.randint(8, 16)
        fh = random.randint(4, 8)
        nd.rectangle([fx, fy, fx + fw, fy + fh], fill=c(STONE_MED, 100))
        nd.rectangle([fx, fy, fx + fw, fy + 1], fill=c(GOLD_DARK, 80))

    near_out = PARALLAX_DIR / "bg_parallax_celestial_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# =========================================================================
# MAIN
# =========================================================================

def main():
    print("Generating Celestial Spire zone assets (PIX-173)...")
    print()

    print("[1/8] Wind Elemental enemy sprite sheet")
    generate_wind_elemental()
    print()

    print("[2/8] Sky Sentinel enemy sprite sheet")
    generate_sky_sentinel()
    print()

    print("[3/8] Storm Harpy enemy sprite sheet")
    generate_storm_harpy()
    print()

    print("[4/8] Stormkeeper Titan boss sprites (idle, attack, phases 1-3)")
    generate_stormkeeper_titan()
    print()

    print("[5/8] Celestial Scholar NPC sprite")
    generate_celestial_scholar()
    print()

    print("[6/8] Celestial Spire tileset (256x64)")
    generate_tileset()
    print()

    print("[7/8] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[8/8] Done! All Celestial Spire zone assets generated.")


if __name__ == "__main__":
    main()
