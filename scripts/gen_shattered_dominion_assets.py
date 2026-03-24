#!/usr/bin/env python3
"""
Generate Shattered Dominion zone art assets for PixelRealm (PIX-193).
Produces:
  - 3 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Shattered Dominion color language: deep indigo, shattered gold, reality-tear
white, void purple — a ruined god-realm where reality has splintered into
floating fragments of broken dimensions.
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

# -- Shattered Dominion Color Palette ----------------------------------------
# All colors from the 32-color master palette

# Deep indigo / void tones
INDIGO_BLACK    = (8, 4, 18, 255)           # #080412 -- deepest void
INDIGO_DARK     = (15, 8, 35, 255)          # #0f0823 -- dark indigo
INDIGO_MED      = (30, 15, 65, 255)         # #1e0f41 -- mid indigo
INDIGO_LIGHT    = (55, 30, 100, 255)        # #371e64 -- lighter indigo
INDIGO_GLOW     = (90, 60, 170, 255)        # #5a3caa -- indigo glow

# Shattered gold / divine remnant tones
SGOLD_DEEP      = (55, 40, 8, 255)          # #372808 -- deep tarnished gold
SGOLD_DARK      = (110, 80, 15, 255)        # #6e500f -- dark gold
SGOLD_MED       = (175, 135, 40, 255)       # #af8728 -- divine gold
SGOLD_BRIGHT    = (230, 190, 60, 255)       # #e6be3c -- bright shattered gold
SGOLD_GLOW      = (255, 230, 120, 255)      # #ffe678 -- gold-white glow

# Reality-tear white / fracture energy
TEAR_DIM        = (140, 130, 150, 255)      # #8c8296 -- dim tear
TEAR_MED        = (190, 180, 210, 255)      # #beb4d2 -- fracture shimmer
TEAR_BRIGHT     = (230, 225, 245, 255)      # #e6e1f5 -- bright tear
TEAR_WHITE      = (248, 245, 255, 255)      # #f8f5ff -- near-white tear
TEAR_GLOW       = (255, 250, 255, 255)      # #fffaff -- blinding tear

# Void purple (corrupted divinity)
VOID_DEEP       = (20, 6, 30, 255)          # #14061e -- deep void
VOID_DARK       = (40, 12, 55, 255)         # #280c37 -- dark void purple
VOID_MED        = (70, 25, 100, 255)        # #461964 -- void purple
VOID_BRIGHT     = (120, 55, 160, 255)       # #7837a0 -- bright void
VOID_GLOW       = (180, 100, 230, 255)      # #b464e6 -- void glow

# Neutrals
WHITE           = (240, 238, 230, 255)
BLACK           = (6, 3, 12, 255)
STONE_DARK      = (30, 25, 35, 255)
STONE_MED       = (50, 42, 55, 255)
STONE_LIGHT     = (78, 68, 85, 255)

# Shattered platform / crystallized architecture
FRAG_DARK       = (35, 28, 42, 255)         # #231c2a
FRAG_MED        = (58, 48, 68, 255)         # #3a3044
FRAG_LIGHT      = (85, 72, 95, 255)         # #55485f
FRAG_EDGE       = (110, 96, 120, 255)       # #6e6078

# Sky / atmosphere
SKY_VOID        = (10, 4, 16, 255)          # #0a0410 -- void sky
SKY_DEEP        = (18, 8, 28, 255)          # #12081c
SKY_GLOW        = (45, 20, 65, 255)         # #2d1441 -- horizon glow

# Crystallized void shards (accent colors)
CRYSTAL_VIOLET  = (160, 80, 200, 255)
CRYSTAL_CYAN    = (80, 180, 220, 255)
CRYSTAL_ROSE    = (200, 90, 140, 255)
CRYSTAL_WHITE   = (220, 215, 240, 255)

OUTLINE         = (5, 3, 8, 255)
TRANSPARENT     = (0, 0, 0, 0)

# -- Creature-specific palettes -----------------------------------------------

# Shattered Golem -- heavy construct of fractured reality
GOLEM_BODY      = FRAG_MED
GOLEM_BODY_L    = FRAG_LIGHT
GOLEM_BODY_D    = FRAG_DARK
GOLEM_CRACK     = TEAR_MED
GOLEM_CRACK_G   = TEAR_BRIGHT
GOLEM_EYE       = SGOLD_GLOW
GOLEM_CORE      = INDIGO_GLOW
GOLEM_ARM       = FRAG_LIGHT
GOLEM_ARM_D     = FRAG_MED
GOLEM_GOLD      = SGOLD_MED

# Reality Fracture -- living tear in reality, ethereal and jagged
FRACTURE_BODY   = (100, 90, 130, 160)       # semi-transparent tear form
FRACTURE_BODY_D = (60, 50, 90, 180)
FRACTURE_EDGE   = TEAR_BRIGHT
FRACTURE_CORE   = TEAR_WHITE
FRACTURE_GLOW   = TEAR_GLOW
FRACTURE_TRAIL  = (120, 110, 150, 80)       # fading fracture trail
FRACTURE_TRAIL_L = (160, 150, 190, 50)
FRACTURE_EYE    = VOID_GLOW
FRACTURE_SHARD  = CRYSTAL_VIOLET

# Dominion Shade -- shadow of a fallen god, dark and imposing
SHADE_BODY      = (20, 10, 30, 200)         # semi-transparent dark form
SHADE_BODY_D    = (12, 5, 20, 220)
SHADE_CLOAK     = VOID_DARK
SHADE_CLOAK_L   = VOID_MED
SHADE_EYE       = SGOLD_GLOW
SHADE_EYE_D     = SGOLD_BRIGHT
SHADE_CROWN     = SGOLD_MED
SHADE_MAGIC     = VOID_GLOW
SHADE_MAGIC_B   = VOID_BRIGHT
SHADE_TRAIL     = (30, 12, 40, 100)
SHADE_TRAIL_L   = (50, 20, 60, 50)

# The Unmaker boss
UNMAKER_BODY    = VOID_MED
UNMAKER_BODY_D  = VOID_DARK
UNMAKER_ARMOR   = FRAG_LIGHT
UNMAKER_ARMOR_D = FRAG_MED
UNMAKER_EYE     = TEAR_GLOW
UNMAKER_TEAR    = TEAR_BRIGHT
UNMAKER_GOLD    = SGOLD_BRIGHT
UNMAKER_GLOW    = SGOLD_GLOW
UNMAKER_CROWN   = SGOLD_MED
UNMAKER_CROWN_G = SGOLD_GLOW
UNMAKER_CAPE    = VOID_DARK
UNMAKER_CAPE_L  = VOID_MED
UNMAKER_WEAPON  = SGOLD_MED
UNMAKER_MAGIC   = TEAR_BRIGHT

# NPC: Keeper of Fragments
KEEPER_ROBE     = (40, 30, 55, 255)
KEEPER_ROBE_L   = (60, 48, 75, 255)
KEEPER_SKIN     = (170, 155, 165, 255)
KEEPER_SKIN_D   = (140, 125, 135, 255)
KEEPER_HAIR     = (80, 65, 95, 255)
KEEPER_STAFF    = SGOLD_MED
KEEPER_STAFF_ORB = TEAR_BRIGHT
KEEPER_TRIM     = SGOLD_DARK
KEEPER_BELT     = FRAG_DARK
KEEPER_EYES     = INDIGO_GLOW
KEEPER_HOOD     = VOID_DARK

# Tileset colors
TILE_FRAG       = FRAG_MED
TILE_FRAG_D     = FRAG_DARK
TILE_FRAG_L     = FRAG_LIGHT
TILE_FRAG_E     = FRAG_EDGE
TILE_GOLD       = SGOLD_MED
TILE_GOLD_D     = SGOLD_DARK
TILE_GOLD_B     = SGOLD_BRIGHT
TILE_TEAR       = TEAR_MED
TILE_TEAR_D     = TEAR_DIM
TILE_TEAR_L     = TEAR_BRIGHT
TILE_STONE      = STONE_MED
TILE_STONE_D    = STONE_DARK
TILE_STONE_L    = STONE_LIGHT
TILE_VOID       = VOID_MED
TILE_VOID_D     = VOID_DARK


def ensure_dir(path):
    os.makedirs(os.path.dirname(path) if isinstance(path, str) else path.parent, exist_ok=True)


def save_asset(img, rel_path):
    full_path = ASSET_ROOT / rel_path if isinstance(rel_path, str) else rel_path
    ensure_dir(full_path)
    img.save(str(full_path))
    print(f"  Created: {full_path.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# ENEMY 1: SHATTERED GOLEM -- heavy construct, 16x16, 8 frames
# Frames 0-3: walk/patrol, Frames 4-7: attack (reality-shard slam)
# =========================================================================

def draw_shattered_golem(draw, ox, oy, frame):
    """Draw a single 16x16 Shattered Golem frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, 0, -1, 0][anim]
    stride = [0, 1, 0, -1][anim]

    # Heavy stone legs
    draw.rectangle([ox + 4, oy + 12 + bob, ox + 6, oy + 14], fill=GOLEM_BODY_D)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 11, oy + 14], fill=GOLEM_BODY_D)
    # Massive feet
    draw.rectangle([ox + 3 + stride, oy + 14, ox + 6 + stride, oy + 15], fill=GOLEM_BODY)
    draw.rectangle([ox + 9 - stride, oy + 14, ox + 12 - stride, oy + 15], fill=GOLEM_BODY)

    # Torso (fragmented stone with reality cracks)
    draw.rectangle([ox + 3, oy + 6 + bob, ox + 12, oy + 12 + bob], fill=GOLEM_BODY)
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 11, oy + 11 + bob], fill=GOLEM_BODY_L)
    # Reality-tear cracks glowing through body
    draw.point((ox + 6, oy + 8 + bob), fill=GOLEM_CRACK)
    draw.point((ox + 9, oy + 8 + bob), fill=GOLEM_CRACK)
    draw.point((ox + 7, oy + 10 + bob), fill=GOLEM_CRACK_G)
    draw.point((ox + 8, oy + 10 + bob), fill=GOLEM_CRACK)
    # Core glow in chest
    draw.point((ox + 7, oy + 9 + bob), fill=GOLEM_CORE)
    draw.point((ox + 8, oy + 9 + bob), fill=GOLEM_CORE)
    # Gold rune fragments on shoulders
    draw.rectangle([ox + 2, oy + 6 + bob, ox + 3, oy + 8 + bob], fill=GOLEM_BODY_L)
    draw.rectangle([ox + 12, oy + 6 + bob, ox + 13, oy + 8 + bob], fill=GOLEM_BODY_L)
    draw.point((ox + 2, oy + 6 + bob), fill=GOLEM_GOLD)
    draw.point((ox + 13, oy + 6 + bob), fill=GOLEM_GOLD)

    # Head (angular, cracked stone with single glowing eye)
    draw.rectangle([ox + 5, oy + 2 + bob, ox + 10, oy + 6 + bob], fill=GOLEM_BODY)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 5 + bob], fill=GOLEM_BODY_D)
    # Single cyclopean eye
    draw.rectangle([ox + 7, oy + 4 + bob, ox + 8, oy + 4 + bob], fill=GOLEM_EYE)
    # Jagged top (fractured head)
    draw.point((ox + 6, oy + 1 + bob), fill=GOLEM_BODY)
    draw.point((ox + 9, oy + 1 + bob), fill=GOLEM_BODY_L)

    # Arms + reality-shard weapon
    if is_attack:
        slam = [0, 2, 4, 2][anim]
        # Right arm raised for slam
        draw.rectangle([ox + 12, oy + 5 + bob - slam, ox + 13, oy + 10 + bob], fill=GOLEM_ARM)
        # Reality shard in fist (massive crystallized fragment)
        draw.point((ox + 13, oy + 4 + bob - slam), fill=GOLEM_CRACK_G)
        draw.point((ox + 14, oy + 4 + bob - slam), fill=GOLEM_CRACK)
        draw.point((ox + 14, oy + 3 + bob - slam), fill=TEAR_WHITE)
        # Left arm bracing
        draw.rectangle([ox + 2, oy + 7 + bob, ox + 3, oy + 12 + bob], fill=GOLEM_ARM_D)
        # Ground crack on slam
        if slam >= 3:
            draw.point((ox + 12, oy + 15), fill=GOLEM_CRACK)
            draw.point((ox + 14, oy + 15), fill=GOLEM_CRACK_G)
    else:
        # Arms at sides, fragments floating near hands
        draw.rectangle([ox + 2, oy + 8 + bob, ox + 3, oy + 12 + bob], fill=GOLEM_ARM)
        draw.rectangle([ox + 12, oy + 8 + bob, ox + 13, oy + 12 + bob], fill=GOLEM_ARM)
        # Floating shard fragments near hands
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 1 + sway, oy + 11 + bob), fill=GOLEM_CRACK)
        draw.point((ox + 14 - sway, oy + 11 + bob), fill=GOLEM_CRACK)


def generate_shattered_golem():
    """Generate 8-frame Shattered Golem sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_shattered_golem(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_shattered_golem.png")
    return img


# =========================================================================
# ENEMY 2: REALITY FRACTURE -- living tear in reality, 16x16, 8 frames
# Frames 0-3: drift/pulse, Frames 4-7: attack (shard burst)
# =========================================================================

def draw_reality_fracture(draw, ox, oy, frame):
    """Draw a single 16x16 Reality Fracture frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [0, -1, -2, -1][anim]
    pulse = [0, 1, 2, 1][anim]

    # Central tear form (jagged vertical rift shape)
    draw.rectangle([ox + 6, oy + 4 + float_y, ox + 9, oy + 13 + float_y], fill=FRACTURE_BODY)
    draw.rectangle([ox + 7, oy + 5 + float_y, ox + 8, oy + 12 + float_y], fill=FRACTURE_BODY_D)
    # Bright tear core
    draw.rectangle([ox + 7, oy + 7 + float_y, ox + 8, oy + 10 + float_y], fill=FRACTURE_CORE)
    # Reality-tear edges (jagged, glowing)
    draw.point((ox + 5, oy + 6 + float_y), fill=FRACTURE_EDGE)
    draw.point((ox + 10, oy + 5 + float_y), fill=FRACTURE_EDGE)
    draw.point((ox + 5, oy + 10 + float_y), fill=FRACTURE_EDGE)
    draw.point((ox + 10, oy + 9 + float_y), fill=FRACTURE_EDGE)
    # Expanding/contracting pulse around tear
    if pulse > 0:
        draw.point((ox + 5 - pulse, oy + 8 + float_y), fill=FRACTURE_TRAIL)
        draw.point((ox + 10 + pulse, oy + 8 + float_y), fill=FRACTURE_TRAIL)
    # Void eyes within the tear
    draw.point((ox + 7, oy + 7 + float_y), fill=FRACTURE_EYE)
    draw.point((ox + 8, oy + 7 + float_y), fill=FRACTURE_EYE)

    # Top jagged crown (shard-like protrusions)
    draw.point((ox + 7, oy + 3 + float_y), fill=FRACTURE_EDGE)
    draw.point((ox + 8, oy + 2 + float_y), fill=FRACTURE_CORE)
    draw.point((ox + 6, oy + 4 + float_y), fill=FRACTURE_SHARD)

    # Bottom trailing wisps
    draw.point((ox + 7, oy + 14 + float_y), fill=FRACTURE_TRAIL)
    draw.point((ox + 8, oy + 15), fill=FRACTURE_TRAIL_L)
    draw.point((ox + 6, oy + 14 + float_y), fill=FRACTURE_TRAIL_L)

    if is_attack:
        burst = [0, 2, 3, 1][anim]
        # Shard projectiles bursting outward
        for sx in range(burst + 1):
            draw.point((ox + 4 - sx, oy + 7 + float_y), fill=FRACTURE_EDGE)
            draw.point((ox + 11 + sx, oy + 9 + float_y), fill=FRACTURE_EDGE)
        if burst >= 2:
            draw.point((ox + 3 - burst, oy + 6 + float_y), fill=FRACTURE_SHARD)
            draw.point((ox + 12 + burst, oy + 10 + float_y), fill=FRACTURE_SHARD)
            draw.point((ox + 3 - burst, oy + 8 + float_y), fill=FRACTURE_CORE)
        # Core intensifies
        draw.rectangle([ox + 6, oy + 6 + float_y, ox + 9, oy + 11 + float_y], fill=FRACTURE_CORE)
        draw.point((ox + 7, oy + 8 + float_y), fill=FRACTURE_GLOW)
        draw.point((ox + 8, oy + 8 + float_y), fill=FRACTURE_GLOW)
    else:
        # Ambient shimmering particles
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 4 + sway, oy + 6 + float_y), fill=FRACTURE_TRAIL)
        draw.point((ox + 11 - sway, oy + 10 + float_y), fill=FRACTURE_TRAIL)


def generate_reality_fracture():
    """Generate 8-frame Reality Fracture sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_reality_fracture(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_reality_fracture.png")
    return img


# =========================================================================
# ENEMY 3: DOMINION SHADE -- shadow of a fallen god, 16x16, 8 frames
# Frames 0-3: hover/drift, Frames 4-7: attack (divine shadow strike)
# =========================================================================

def draw_dominion_shade(draw, ox, oy, frame):
    """Draw a single 16x16 Dominion Shade frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, -1, 0, -1][anim]
    drift = [0, 1, 2, 1][anim]

    # Ghostly lower body (no legs — hovers as a dark mass)
    draw.rectangle([ox + 5, oy + 12 + bob, ox + 10, oy + 15], fill=SHADE_CLOAK)
    draw.point((ox + 4, oy + 14 + bob), fill=SHADE_TRAIL)
    draw.point((ox + 11, oy + 14 + bob), fill=SHADE_TRAIL)
    # Shadow wisps trailing below
    draw.point((ox + 6, oy + 15), fill=SHADE_TRAIL_L)
    draw.point((ox + 9, oy + 15), fill=SHADE_TRAIL_L)

    # Torso / upper cloak (divine dark form)
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 11, oy + 12 + bob], fill=SHADE_CLOAK)
    draw.rectangle([ox + 5, oy + 8 + bob, ox + 10, oy + 11 + bob], fill=SHADE_CLOAK_L)
    # Faded divine sigil on chest
    draw.point((ox + 7, oy + 9 + bob), fill=SGOLD_DARK)
    draw.point((ox + 8, oy + 10 + bob), fill=SGOLD_DARK)

    # Head (hooded, with broken divine crown)
    draw.rectangle([ox + 5, oy + 3 + bob, ox + 10, oy + 7 + bob], fill=SHADE_CLOAK)
    draw.rectangle([ox + 6, oy + 4 + bob, ox + 9, oy + 6 + bob], fill=SHADE_BODY_D)
    # Glowing gold eyes (remnants of divinity)
    draw.point((ox + 7, oy + 5 + bob), fill=SHADE_EYE)
    draw.point((ox + 9, oy + 5 + bob), fill=SHADE_EYE)
    # Broken crown fragments
    draw.point((ox + 6, oy + 2 + bob), fill=SHADE_CROWN)
    draw.point((ox + 8, oy + 2 + bob), fill=SHADE_CROWN)
    draw.point((ox + 10, oy + 2 + bob), fill=SHADE_CROWN)
    draw.point((ox + 7, oy + 1 + bob), fill=SGOLD_GLOW)

    # Shadow trail echo
    if drift > 0:
        draw.point((ox + 3 - drift, oy + 9 + bob), fill=SHADE_TRAIL)
        draw.point((ox + 3 - drift, oy + 10 + bob), fill=SHADE_TRAIL_L)

    # Arms and magic
    if is_attack:
        strike = [0, 2, 4, 2][anim]
        # Arms outstretched channeling void strike
        draw.rectangle([ox + 2, oy + 8 + bob, ox + 4, oy + 9 + bob], fill=SHADE_CLOAK)
        draw.rectangle([ox + 11, oy + 8 + bob, ox + 13, oy + 9 + bob], fill=SHADE_CLOAK)
        # Void energy projectile
        if strike > 0:
            for bx in range(strike):
                draw.point((ox + 14 + bx, oy + 8 + bob), fill=SHADE_MAGIC)
                if bx > 0:
                    draw.point((ox + 14 + bx, oy + 7 + bob), fill=SHADE_MAGIC_B)
                    draw.point((ox + 14 + bx, oy + 9 + bob), fill=SHADE_MAGIC_B)
            if strike >= 3:
                draw.point((ox + 14 + strike, oy + 8 + bob), fill=SGOLD_GLOW)
    else:
        # Arms at sides, gathering void energy
        draw.rectangle([ox + 3, oy + 8 + bob, ox + 4, oy + 11 + bob], fill=SHADE_CLOAK)
        draw.rectangle([ox + 11, oy + 8 + bob, ox + 12, oy + 11 + bob], fill=SHADE_CLOAK)
        # Faint void sparks in hands
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 3 + sway, oy + 12 + bob), fill=SHADE_MAGIC)
        draw.point((ox + 12 - sway, oy + 12 + bob), fill=SHADE_MAGIC)

    # Ambient shadow wisps
    wisp_sway = [0, 1, 0, -1][anim]
    draw.point((ox + 7 + wisp_sway, oy + 15), fill=SHADE_BODY)
    draw.point((ox + 9 - wisp_sway, oy + 15), fill=SHADE_BODY_D)


def generate_dominion_shade():
    """Generate 8-frame Dominion Shade sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_dominion_shade(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_dominion_shade.png")
    return img


# =========================================================================
# BOSS: THE UNMAKER -- reality-shattering god-construct, 32x32, multi-phase
# idle (1 frame), attack (4 frames), phase1/2/3 (1 frame each)
# =========================================================================

def draw_unmaker(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw The Unmaker boss at 32x32."""
    anim = frame % 4
    breath = [0, -1, 0, 1][anim]

    # Phase color shifts
    body = UNMAKER_BODY
    armor = UNMAKER_ARMOR
    eye = UNMAKER_EYE
    tear = UNMAKER_TEAR
    gold = UNMAKER_GOLD
    glow = UNMAKER_GLOW
    crown = UNMAKER_CROWN
    magic = UNMAKER_MAGIC
    if phase == 2:
        body = (90, 35, 120, 255)           # deeper void-infused
        armor = (100, 85, 110, 255)
        eye = SGOLD_GLOW
        tear = TEAR_WHITE
        gold = SGOLD_GLOW
        glow = (255, 240, 150, 255)
        crown = SGOLD_BRIGHT
    elif phase == 3:
        body = (60, 15, 80, 255)            # full reality-shatter
        armor = (95, 75, 105, 255)
        eye = TEAR_GLOW
        tear = (255, 245, 255, 255)
        magic = TEAR_WHITE
        glow = (255, 230, 255, 255)
        crown = (210, 160, 60, 255)

    outline = OUTLINE

    # Legs -- tall, armored in void-plate
    draw.rectangle([ox + 9, oy + 22 + breath, ox + 13, oy + 27], fill=body)
    draw.rectangle([ox + 18, oy + 22 + breath, ox + 22, oy + 27], fill=body)
    # Void-plate boots
    draw.rectangle([ox + 8, oy + 27, ox + 14, oy + 30], fill=armor)
    draw.rectangle([ox + 17, oy + 27, ox + 23, oy + 30], fill=armor)
    # Gold trim on boots
    draw.point((ox + 10, oy + 28), fill=gold)
    draw.point((ox + 20, oy + 28), fill=gold)

    # Robed torso with reality-plate armor
    draw.rectangle([ox + 8, oy + 12 + breath, ox + 23, oy + 22 + breath], fill=UNMAKER_CAPE)
    draw.rectangle([ox + 9, oy + 13 + breath, ox + 22, oy + 21 + breath], fill=UNMAKER_CAPE_L)
    # Chest reality-plate
    draw.rectangle([ox + 11, oy + 14 + breath, ox + 20, oy + 20 + breath], fill=armor)
    draw.rectangle([ox + 12, oy + 15 + breath, ox + 19, oy + 19 + breath], fill=UNMAKER_ARMOR_D)
    # Reality-tear core in chest (the unmade heart)
    draw.rectangle([ox + 14, oy + 16 + breath, ox + 17, oy + 18 + breath], fill=tear)
    draw.point((ox + 15, oy + 17 + breath), fill=glow)
    draw.point((ox + 16, oy + 17 + breath), fill=glow)
    # Gold divine-rune veins on armor
    draw.point((ox + 12, oy + 15 + breath), fill=gold)
    draw.point((ox + 19, oy + 15 + breath), fill=gold)
    draw.point((ox + 12, oy + 19 + breath), fill=gold)
    draw.point((ox + 19, oy + 19 + breath), fill=gold)

    # Shoulder plates (massive, fractured)
    draw.rectangle([ox + 4, oy + 10 + breath, ox + 9, oy + 14 + breath], fill=armor)
    draw.point((ox + 5, oy + 10 + breath), fill=gold)
    draw.rectangle([ox + 22, oy + 10 + breath, ox + 27, oy + 14 + breath], fill=armor)
    draw.point((ox + 26, oy + 10 + breath), fill=gold)
    # Reality cracks on shoulder plates
    draw.point((ox + 6, oy + 12 + breath), fill=tear)
    draw.point((ox + 25, oy + 12 + breath), fill=tear)

    # Cape (torn reality-fabric)
    cape_wave = [0, 1, 2, 1][anim]
    draw.rectangle([ox + 10, oy + 20 + breath, ox + 21, oy + 24 + breath + cape_wave], fill=UNMAKER_CAPE)
    draw.point((ox + 11, oy + 24 + breath + cape_wave), fill=UNMAKER_CAPE_L)
    draw.point((ox + 20, oy + 24 + breath + cape_wave), fill=UNMAKER_CAPE_L)

    # Head (regal, with shattered divine crown)
    draw.rectangle([ox + 11, oy + 5 + breath, ox + 20, oy + 12 + breath], fill=body)
    draw.rectangle([ox + 12, oy + 6 + breath, ox + 19, oy + 11 + breath], fill=UNMAKER_BODY_D)
    # Face plate (cracked divine mask)
    draw.rectangle([ox + 13, oy + 7 + breath, ox + 18, oy + 10 + breath], fill=armor)
    # Glowing reality-tear eyes
    draw.rectangle([ox + 13, oy + 8 + breath, ox + 14, oy + 9 + breath], fill=outline)
    draw.point((ox + 13, oy + 8 + breath), fill=eye)
    draw.rectangle([ox + 17, oy + 8 + breath, ox + 18, oy + 9 + breath], fill=outline)
    draw.point((ox + 18, oy + 8 + breath), fill=eye)

    # Shattered divine crown
    draw.rectangle([ox + 12, oy + 4 + breath, ox + 19, oy + 5 + breath], fill=crown)
    draw.point((ox + 14, oy + 3 + breath), fill=crown)
    draw.point((ox + 15, oy + 2 + breath), fill=UNMAKER_CROWN_G)
    draw.point((ox + 16, oy + 2 + breath), fill=UNMAKER_CROWN_G)
    draw.point((ox + 17, oy + 3 + breath), fill=crown)
    # Crown center gem (reality tear)
    draw.point((ox + 15, oy + 3 + breath), fill=tear)
    draw.point((ox + 16, oy + 3 + breath), fill=tear)

    # Arms
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        attack_ext = [0, 2, 4, 2][anim]
        # Arms raised, unmake reality
        draw.rectangle([ox + 4, oy + 12 + breath - attack_ext, ox + 8, oy + 18 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 12 + breath - attack_ext, ox + 27, oy + 18 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 12 + breath - attack_ext, ox + 5, oy + 13 + breath - attack_ext], fill=armor)
        draw.rectangle([ox + 26, oy + 12 + breath - attack_ext, ox + 28, oy + 13 + breath - attack_ext], fill=armor)
        # Reality-tear energy between hands
        if attack_ext >= 2:
            for rx in range(6, 26, 2):
                ry = 11 + breath - attack_ext + random.randint(-1, 1)
                if 0 <= oy + ry < 32:
                    draw.point((ox + rx, oy + ry), fill=tear)
            # Central reality tear flare
            draw.rectangle([ox + 13, oy + 10 + breath - attack_ext, ox + 18, oy + 12 + breath - attack_ext], fill=magic)
            draw.point((ox + 15, oy + 11 + breath - attack_ext), fill=glow)
            draw.point((ox + 16, oy + 11 + breath - attack_ext), fill=glow)
        # Ground reality fractures
        if attack_ext >= 3:
            for gx in range(3, 29, 3):
                draw.point((ox + gx, oy + 30), fill=tear)
                draw.point((ox + gx, oy + 31), fill=INDIGO_DARK)
    else:
        # Idle arms with unmake scepter
        draw.rectangle([ox + 4, oy + 14 + breath + arm_wave, ox + 8, oy + 21 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 14 + breath + arm_wave, ox + 27, oy + 21 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 20 + breath + arm_wave, ox + 7, oy + 22 + breath], fill=armor)
        draw.rectangle([ox + 24, oy + 20 + breath + arm_wave, ox + 28, oy + 22 + breath], fill=armor)
        # Reality-tear scepter in right hand
        draw.rectangle([ox + 28, oy + 8 + breath, ox + 28, oy + 22 + breath], fill=UNMAKER_WEAPON)
        draw.point((ox + 28, oy + 7 + breath), fill=gold)
        draw.point((ox + 28, oy + 6 + breath), fill=glow)

    # Reality shatter aura (floating tear fragments)
    if phase >= 2:
        aura_pos = [(3, 6), (28, 8), (5, 4), (26, 5), (15, 1)]
        for i, (ax, ay) in enumerate(aura_pos):
            if (anim + i) % 3 == 0:
                draw.point((ox + ax, oy + ay + breath), fill=tear)

    if phase == 3:
        # Reality fracture lines radiating from boss
        for tx in range(2, 30, 3):
            ty = 28 + (anim + tx) % 4
            if ty < 32:
                draw.point((ox + tx, oy + ty), fill=magic)
        # Crown blazing with tear energy
        draw.point((ox + 14, oy + 2 + breath), fill=magic)
        draw.point((ox + 15, oy + 1 + breath), fill=tear)
        draw.point((ox + 16, oy + 1 + breath), fill=tear)
        draw.point((ox + 17, oy + 2 + breath), fill=magic)


def generate_unmaker():
    """Generate all Unmaker boss sprite sheets."""
    random.seed(193)

    # Idle
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_unmaker(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_unmaker_idle.png")

    # Attack -- 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        random.seed(193 + f)
        draw_unmaker(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_unmaker_attack.png")

    # Phase 1
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_unmaker(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_unmaker_phase1.png")

    # Phase 2 -- void surge
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_unmaker(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_unmaker_phase2.png")

    # Phase 3 -- full reality shatter
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_unmaker(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_unmaker_phase3.png")


# =========================================================================
# NPC: KEEPER OF FRAGMENTS -- zone quest giver, 16x24
# Robed figure carrying collected reality shards
# =========================================================================

def draw_keeper_of_fragments(draw, ox, oy):
    """Draw the Keeper of Fragments NPC at 16x24."""
    # Feet / boots (worn dimensional-traveler boots)
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=FRAG_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=FRAG_DARK)

    # Robe (long, with void shimmer)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=KEEPER_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=KEEPER_ROBE_L)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=KEEPER_ROBE)
    # Gold trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=KEEPER_TRIM)

    # Belt with fragment-holder clasp
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=KEEPER_BELT)
    # Reality shard pendant
    draw.point((ox + 8, oy + 15), fill=TEAR_BRIGHT)
    draw.point((ox + 8, oy + 16), fill=SGOLD_MED)

    # Arms (in robe sleeves)
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=KEEPER_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=KEEPER_ROBE)
    # Gold cuffs
    draw.point((ox + 2, oy + 16), fill=KEEPER_TRIM)
    draw.point((ox + 14, oy + 16), fill=KEEPER_TRIM)
    # Hands
    draw.point((ox + 2, oy + 17), fill=KEEPER_SKIN)
    draw.point((ox + 14, oy + 17), fill=KEEPER_SKIN)

    # Fragment collection jar (held in left hand)
    draw.rectangle([ox + 1, oy + 15, ox + 3, oy + 18], fill=TEAR_DIM)
    draw.point((ox + 2, oy + 16), fill=TEAR_BRIGHT)
    # Glowing shard inside jar
    draw.rectangle([ox + 1, oy + 16, ox + 1, oy + 17], fill=TEAR_WHITE)

    # Staff (right hand -- fragment-topped divining rod)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=KEEPER_STAFF)
    # Reality fragment at top of staff
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=SGOLD_DARK)
    draw.point((ox + 14, oy + 1), fill=KEEPER_STAFF_ORB)
    draw.point((ox + 14, oy + 2), fill=TEAR_BRIGHT)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=KEEPER_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=KEEPER_SKIN)

    # Hood (deep, shadowed)
    draw.rectangle([ox + 4, oy + 2, ox + 12, oy + 5], fill=KEEPER_HOOD)
    draw.point((ox + 4, oy + 5), fill=KEEPER_HOOD)
    draw.point((ox + 4, oy + 6), fill=KEEPER_HOOD)
    draw.point((ox + 12, oy + 5), fill=KEEPER_HOOD)
    draw.point((ox + 12, oy + 6), fill=KEEPER_HOOD)

    # Glowing indigo eyes (dimensional sight)
    draw.point((ox + 6, oy + 6), fill=KEEPER_EYES)
    draw.point((ox + 10, oy + 6), fill=KEEPER_EYES)
    # Third eye mark on forehead (reality vision)
    draw.point((ox + 8, oy + 5), fill=TEAR_BRIGHT)

    # Circlet under hood (fragment-studded)
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 4], fill=SGOLD_MED)
    draw.point((ox + 8, oy + 3), fill=TEAR_BRIGHT)


def generate_keeper_of_fragments():
    """Generate Keeper of Fragments NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_keeper_of_fragments(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_shattered_dominion.png")
    return img


# =========================================================================
# TILESET -- tileset_shattered_dominion.png (256x64, 16 cols x 4 rows)
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


# -- Individual tile functions -------------------------------------------------

def tile_broken_platform(tile):
    """Broken floating platform surface."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    # Subtle fracture texture
    for x in range(0, 16, 3):
        for y in range(0, 16, 4):
            d.point((x + 1, y + 2), fill=TILE_FRAG_D)


def tile_fractured_platform(tile):
    """Reality-fractured platform with glowing cracks."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    # Reality-tear cracks
    d.line([(2, 3), (7, 9)], fill=TILE_TEAR_D, width=1)
    d.line([(10, 1), (8, 6)], fill=TILE_TEAR_D, width=1)
    d.line([(5, 11), (12, 14)], fill=TILE_TEAR_D, width=1)
    # Tear glow in cracks
    d.point((5, 6), fill=TILE_TEAR)
    d.point((9, 3), fill=TILE_TEAR)


def tile_void_crystal_pillar(tile):
    """Crystallized void pillar."""
    d = ImageDraw.Draw(tile)
    # Pillar body
    d.rectangle([4, 0, 11, 15], fill=TILE_FRAG)
    d.rectangle([5, 0, 10, 15], fill=TILE_FRAG_L)
    # Gold divine-rune bands
    d.rectangle([4, 3, 11, 3], fill=TILE_GOLD)
    d.rectangle([4, 12, 11, 12], fill=TILE_GOLD)
    # Void crystal veins
    d.point((6, 7), fill=TILE_TEAR)
    d.point((9, 9), fill=TILE_TEAR_D)


def tile_reality_torn_wall(tile):
    """Reality-torn wall block."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    d.rectangle([1, 1, 14, 14], fill=TILE_FRAG_D)
    # Reality tear stains
    d.point((4, 4), fill=TILE_TEAR_D)
    d.point((11, 7), fill=TILE_TEAR_D)
    d.point((7, 12), fill=TILE_TEAR_D)
    d.point((3, 9), fill=TILE_TEAR_D)


def tile_wall_top(tile):
    """Top of shattered dominion wall."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 6, 15, 15], fill=TILE_FRAG)
    d.rectangle([1, 7, 14, 14], fill=TILE_FRAG_D)
    # Crumbling edge
    d.point((3, 5), fill=TILE_FRAG)
    d.point((7, 4), fill=TILE_FRAG)
    d.point((11, 5), fill=TILE_FRAG_D)
    # Gold divine trim at top
    d.rectangle([0, 6, 15, 6], fill=TILE_GOLD_D)


def tile_crystal_shard_cluster(tile):
    """Crystallized void shard cluster."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG_D)
    # Crystal shards at various angles
    d.rectangle([2, 5, 4, 10], fill=c(CRYSTAL_VIOLET))
    d.rectangle([7, 2, 9, 8], fill=c(CRYSTAL_CYAN))
    d.rectangle([11, 6, 13, 12], fill=c(CRYSTAL_ROSE))
    d.rectangle([5, 10, 7, 14], fill=c(CRYSTAL_WHITE))
    d.point((3, 4), fill=c(CRYSTAL_VIOLET))
    d.point((8, 1), fill=c(CRYSTAL_CYAN))
    # Gold divine remnant between crystals
    d.point((6, 8), fill=TILE_GOLD_D)
    d.point((10, 5), fill=TILE_GOLD_D)


def tile_void_rift_pool(tile):
    """Dark void rift pool on platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    # Void rift pool (dark elliptical area)
    d.ellipse([3, 4, 13, 12], fill=TILE_VOID_D)
    d.ellipse([5, 6, 11, 10], fill=INDIGO_BLACK)
    # Reality-tear glow at center
    d.point((8, 8), fill=TILE_TEAR)
    d.point((7, 7), fill=TILE_TEAR_D)


def tile_reality_portal_fragment(tile):
    """Fragment of a reality portal."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    # Portal arc fragment
    d.rectangle([6, 2, 9, 13], fill=TILE_TEAR_D)
    d.rectangle([7, 3, 8, 12], fill=TILE_TEAR)
    d.point((7, 5), fill=TILE_TEAR_L)
    d.point((8, 8), fill=TILE_TEAR_L)
    # Portal glow edges
    d.point((6, 4), fill=TEAR_BRIGHT)
    d.point((9, 7), fill=TEAR_BRIGHT)
    d.point((7, 1), fill=INDIGO_DARK)
    d.point((8, 14), fill=INDIGO_DARK)


def tile_divine_carpet(tile):
    """Remnant divine carpet (torn, reality-stained)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_VOID)
    d.rectangle([1, 0, 14, 15], fill=TILE_VOID_D)
    # Gold divine border pattern
    d.rectangle([0, 0, 0, 15], fill=TILE_GOLD_D)
    d.rectangle([15, 0, 15, 15], fill=TILE_GOLD_D)
    # Reality-tear stains on carpet
    d.point((5, 5), fill=TILE_TEAR_D)
    d.point((10, 10), fill=TILE_TEAR_D)


def tile_floating_dais(tile):
    """Floating platform dais (suspended by reality tears)."""
    d = ImageDraw.Draw(tile)
    # Platform surface
    d.rectangle([0, 4, 15, 10], fill=TILE_FRAG)
    d.rectangle([1, 5, 14, 9], fill=TILE_FRAG_L)
    # Gold divine edge trim
    d.rectangle([0, 10, 15, 11], fill=TILE_GOLD_D)
    d.rectangle([0, 11, 15, 12], fill=TILE_GOLD)
    # Void beneath (floating)
    d.point((3, 13), fill=TILE_TEAR_D)
    d.point((8, 14), fill=TILE_TEAR_D)
    d.point((12, 13), fill=TILE_TEAR_D)


def tile_edge_left(tile):
    """Left edge of shattered platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([4, 0, 15, 15], fill=TILE_FRAG)
    d.rectangle([5, 1, 14, 14], fill=TILE_FRAG_L)
    # Edge gold trim
    d.rectangle([4, 0, 4, 15], fill=TILE_GOLD_D)
    d.point((3, 3), fill=TILE_FRAG_D)
    d.point((2, 8), fill=TILE_FRAG_D)
    d.point((3, 12), fill=TILE_FRAG_D)


def tile_edge_right(tile):
    """Right edge of shattered platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 11, 15], fill=TILE_FRAG)
    d.rectangle([1, 1, 10, 14], fill=TILE_FRAG_L)
    # Edge gold trim
    d.rectangle([11, 0, 11, 15], fill=TILE_GOLD_D)
    d.point((12, 4), fill=TILE_FRAG_D)
    d.point((13, 9), fill=TILE_FRAG_D)
    d.point((12, 13), fill=TILE_FRAG_D)


def tile_edge_top(tile):
    """Top edge of shattered platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 4, 15, 15], fill=TILE_FRAG)
    d.rectangle([1, 5, 14, 14], fill=TILE_FRAG_L)
    # Gold edge trim
    d.rectangle([0, 4, 15, 4], fill=TILE_GOLD_D)
    d.point((3, 3), fill=TILE_FRAG_D)
    d.point((7, 2), fill=TILE_FRAG_D)
    d.point((11, 3), fill=TILE_FRAG_D)


def tile_edge_bottom(tile):
    """Bottom edge of shattered platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 11], fill=TILE_FRAG)
    d.rectangle([1, 1, 14, 10], fill=TILE_FRAG_L)
    # Underside gold trim
    d.rectangle([0, 11, 15, 11], fill=TILE_GOLD_D)
    d.point((4, 12), fill=TILE_FRAG_D)
    d.point((8, 13), fill=TILE_FRAG_D)
    d.point((12, 12), fill=TILE_FRAG_D)


def tile_divine_rune_plate(tile):
    """Ancient divine rune plate (cracked)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    d.rectangle([1, 1, 14, 14], fill=TILE_STONE_L)
    # Divine rune circle
    cx, cy = 8, 8
    for angle_i in range(12):
        angle = angle_i * (math.pi / 6)
        px = int(cx + 5 * math.cos(angle))
        py = int(cy + 5 * math.sin(angle))
        if 0 <= px < 16 and 0 <= py < 16:
            d.point((px, py), fill=TILE_TEAR)
    # Center divine glyph
    d.point((8, 8), fill=TEAR_BRIGHT)
    d.point((7, 7), fill=TILE_TEAR)
    d.point((9, 9), fill=TILE_TEAR)


def tile_void_gap(tile):
    """Dark void gap between platforms."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_VOID_D)
    # Faint reality sparks
    d.point((3, 5), fill=TILE_TEAR)
    d.point((10, 2), fill=TILE_TEAR)
    d.point((7, 12), fill=TILE_TEAR_D)
    d.point((13, 9), fill=TILE_TEAR)


def tile_stone_variant1(tile):
    """Stone variant 1 (lighter patches)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    d.point((3, 4), fill=TILE_FRAG_L)
    d.point((10, 2), fill=TILE_FRAG_L)
    d.point((7, 11), fill=TILE_FRAG_D)
    d.point((13, 8), fill=TILE_FRAG_L)


def tile_stone_variant2(tile):
    """Stone variant 2 (darker patches)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    d.point((4, 7), fill=TILE_FRAG_D)
    d.point((11, 3), fill=TILE_FRAG_D)
    d.point((8, 13), fill=TILE_FRAG_L)
    d.point((2, 10), fill=TILE_FRAG_D)


def generate_tileset():
    """Generate tileset_shattered_dominion.png (256x64)."""
    random.seed(193)  # Deterministic for PIX-193
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground / terrain tiles
    row0 = [
        tile_broken_platform, tile_fractured_platform, tile_floating_dais, tile_void_gap,
        tile_reality_torn_wall, tile_wall_top, tile_crystal_shard_cluster, tile_void_rift_pool,
        tile_stone_variant1, tile_stone_variant2, tile_edge_top, tile_edge_bottom,
        tile_edge_left, tile_edge_right, tile_divine_rune_plate, tile_broken_platform,
    ]
    for i, fn in enumerate(row0):
        random.seed(193 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Features and decorations
    row1 = [
        tile_void_crystal_pillar, tile_reality_portal_fragment, tile_divine_rune_plate, tile_floating_dais,
        tile_broken_platform, tile_fractured_platform, tile_void_gap, tile_reality_torn_wall,
        tile_wall_top, tile_edge_top, tile_stone_variant1, tile_stone_variant2,
        tile_edge_left, tile_edge_right, tile_divine_carpet, tile_crystal_shard_cluster,
    ]
    for i, fn in enumerate(row1):
        random.seed(193 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions
    row2 = [
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_void_gap, tile_void_gap, tile_broken_platform, tile_reality_torn_wall,
        tile_broken_platform, tile_fractured_platform, tile_reality_torn_wall, tile_wall_top,
        tile_divine_rune_plate, tile_void_rift_pool, tile_crystal_shard_cluster, tile_floating_dais,
    ]
    for i, fn in enumerate(row2):
        random.seed(193 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: Variants and fill
    row3 = [
        tile_reality_portal_fragment, tile_divine_rune_plate, tile_void_crystal_pillar, tile_floating_dais,
        tile_wall_top, tile_reality_torn_wall, tile_void_gap, tile_broken_platform,
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_stone_variant1, tile_stone_variant2, tile_divine_carpet, tile_fractured_platform,
    ]
    for i, fn in enumerate(row3):
        random.seed(193 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(193)
    out = TILESETS_DIR / "tileset_shattered_dominion.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# PARALLAX BACKGROUNDS -- 320x180, three layers (far/mid/near)
# =========================================================================

def generate_parallax():
    """Three parallax layers for Shattered Dominion zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # -- FAR LAYER: fractured void sky with reality tears --
    far = Image.new("RGBA", (320, 180), SKY_VOID)
    fd = ImageDraw.Draw(far)
    # Void sky gradient (top = near-black, bottom = deep indigo)
    for y in range(180):
        ratio = y / 180
        r = int(SKY_VOID[0] * (1 - ratio) + SKY_DEEP[0] * ratio)
        g = int(SKY_VOID[1] * (1 - ratio) + SKY_DEEP[1] * ratio)
        b = int(SKY_VOID[2] * (1 - ratio) + SKY_DEEP[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    # Massive reality tear across sky (bright diagonal rift)
    random.seed(193)
    tear_cx, tear_cy = 160, 50
    for tx in range(-60, 61):
        ty = int(tx * 0.4 + random.randint(-3, 3))
        px, py = tear_cx + tx, tear_cy + ty
        if 0 <= px < 320 and 0 <= py < 180:
            dist = abs(tx) / 60
            alpha = int(180 * (1 - dist))
            if alpha > 0:
                far.putpixel((px, py), c(TEAR_BRIGHT, min(alpha, 200)))
                # Glow around tear
                for dy in range(-2, 3):
                    if 0 <= py + dy < 180:
                        ga = int(alpha * 0.3 * (1 - abs(dy) / 3))
                        if ga > 0:
                            far.putpixel((px, py + dy), c(TEAR_DIM, ga))

    # Scattered nebula / void shimmer
    for _ in range(6):
        nx = random.randint(20, 300)
        ny = random.randint(10, 80)
        nw = random.randint(30, 60)
        nh = random.randint(8, 20)
        for px in range(nx, nx + nw):
            for py in range(ny, ny + nh):
                if 0 <= px < 320 and 0 <= py < 180:
                    dist = ((px - nx - nw / 2) ** 2 + (py - ny - nh / 2) ** 2) ** 0.5
                    max_dist = (nw / 2 + nh / 2) / 2
                    if dist < max_dist:
                        alpha = int(30 * (1 - dist / max_dist))
                        if alpha > 0:
                            far.putpixel((px, py), c(SKY_GLOW, alpha))

    # Dim stars scattered across void sky
    for _ in range(25):
        sx, sy = random.randint(0, 319), random.randint(0, 100)
        alpha = random.randint(40, 120)
        far.putpixel((sx, sy), c(TEAR_MED, alpha))

    # Distant floating ruin silhouettes on horizon
    ruin_positions = [(15, 130), (70, 118), (140, 132), (220, 122), (285, 128)]
    for rp_x, rp_y in ruin_positions:
        rw = random.randint(8, 16)
        rh = random.randint(18, 40)
        # Ruin body (broken floating chunk)
        fd.rectangle([rp_x, rp_y - rh, rp_x + rw, rp_y], fill=c(FRAG_DARK))
        # Crumbling top
        fd.rectangle([rp_x + rw // 4, rp_y - rh - 6, rp_x + rw - rw // 4, rp_y - rh], fill=c(FRAG_DARK))
        fd.point((rp_x + rw // 2, rp_y - rh - 8), fill=c(FRAG_DARK))
        # Reality tear glow at tip
        fd.point((rp_x + rw // 2, rp_y - rh - 7), fill=c(TEAR_BRIGHT, 120))
        # Faint window glow
        fd.point((rp_x + rw // 2, rp_y - rh + 5), fill=c(INDIGO_MED, 80))

    # Horizon glow (void-indigo)
    for y in range(140, 180):
        ratio = (y - 140) / 40
        alpha = int(60 * ratio)
        if alpha > 0:
            fd.line([(0, y), (319, y)], fill=c(SKY_GLOW, alpha))

    far_out = PARALLAX_DIR / "bg_parallax_shattered_dominion_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # -- MID LAYER: floating ruins and shattered platform fragments --
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(194)

    # Reality-tear energy clouds
    for _ in range(5):
        cx = random.randint(-20, 300)
        cy = random.randint(50, 120)
        cw = random.randint(40, 80)
        ch = random.randint(5, 10)
        md.rectangle([cx, cy, cx + cw, cy + ch], fill=c(INDIGO_MED, 40))
        md.rectangle([cx + 8, cy + 2, cx + cw - 8, cy + ch - 2], fill=c(INDIGO_DARK, 60))

    # Mid-ground floating platform ruins
    platform_positions = [(15, 138), (85, 128), (165, 142), (255, 132)]
    for bx, by in platform_positions:
        bw = random.randint(30, 50)
        bh = random.randint(10, 18)
        # Platform body
        md.rectangle([bx, by, bx + bw, by + bh], fill=c(FRAG_MED))
        md.rectangle([bx + 1, by + 1, bx + bw - 1, by + bh - 2], fill=c(FRAG_LIGHT))
        # Broken edges (jagged top)
        for mx in range(bx, bx + bw, 8):
            md.rectangle([mx, by - 4, mx + 3, by], fill=c(FRAG_MED))
        # Gold divine trim along edge
        md.rectangle([bx, by, bx + bw, by], fill=c(SGOLD_DARK, 140))
        # Reality tear glow through cracks
        crack_x = bx + random.randint(8, bw - 8)
        md.rectangle([crack_x, by + 2, crack_x + 2, by + 6], fill=c(TEAR_MED, 120))

    # Mid-ground floating debris (broken dimensional chunks)
    for _ in range(8):
        dx = random.randint(10, 310)
        dy = random.randint(60, 140)
        dw = random.randint(4, 10)
        dh = random.randint(2, 5)
        md.rectangle([dx, dy, dx + dw, dy + dh], fill=c(FRAG_MED, 80))

    # Reality-tear energy wisps
    for _ in range(10):
        wx = random.randint(10, 310)
        wy = random.randint(40, 150)
        wlen = random.randint(8, 22)
        for wi in range(wlen):
            wpx = wx + wi
            wpy = wy + int(3 * math.sin(wi * 0.5))
            if 0 <= wpx < 320 and 0 <= wpy < 180:
                alpha = 110 - wi * 4
                if alpha > 0:
                    mid.putpixel((wpx, wpy), c(TEAR_MED, alpha))

    mid_out = PARALLAX_DIR / "bg_parallax_shattered_dominion_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # -- NEAR LAYER: foreground void mist and reality particles --
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(195)

    # Foreground void mist at bottom
    for x in range(0, 320, 2):
        h = random.randint(8, 25)
        base_y = 175
        for y in range(base_y - h, base_y):
            if 0 <= y < 180:
                alpha = 140 - int((base_y - y) * 4.5)
                if alpha > 0:
                    near.putpixel((x, y), c(INDIGO_DARK, min(alpha, 160)))
                    if x + 1 < 320:
                        near.putpixel((x + 1, y), c(INDIGO_DARK, min(alpha, 160)))

    # Bottom void floor
    nd.rectangle([0, 172, 319, 179], fill=c(INDIGO_MED, 120))

    # Floating reality-tear particles (diagonal drift)
    for _ in range(25):
        ax = random.randint(0, 319)
        ay = random.randint(20, 170)
        length = random.randint(3, 6)
        color_choice = random.choice([TEAR_BRIGHT, SGOLD_BRIGHT, VOID_GLOW])
        for i in range(length):
            px = ax + i
            py = ay - i * 2  # drift upward
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = 130 - i * 20
                if alpha > 0:
                    near.putpixel((px, py), c(color_choice, alpha))

    # Reality ember particles (floating tear/gold sparks)
    for _ in range(25):
        wx = random.randint(0, 319)
        wy = random.randint(10, 155)
        color_choice = random.choice([TEAR_BRIGHT, SGOLD_BRIGHT, VOID_GLOW, CRYSTAL_CYAN])
        near.putpixel((wx, wy), c(color_choice, 160))
        if wx + 1 < 320:
            near.putpixel((wx + 1, wy), c(color_choice, 80))

    # Foreground floating platform fragments
    for fx in range(15, 320, 65):
        fy = random.randint(12, 50)
        fw = random.randint(5, 12)
        fh = random.randint(2, 4)
        nd.rectangle([fx, fy, fx + fw, fy + fh], fill=c(FRAG_MED, 70))
        nd.point((fx + fw // 2, fy), fill=c(FRAG_LIGHT, 90))

    near_out = PARALLAX_DIR / "bg_parallax_shattered_dominion_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# =========================================================================
# MAIN
# =========================================================================

def main():
    print("Generating Shattered Dominion zone assets (PIX-193)...")
    print()

    print("[1/8] Shattered Golem enemy sprite sheet")
    generate_shattered_golem()
    print()

    print("[2/8] Reality Fracture enemy sprite sheet")
    generate_reality_fracture()
    print()

    print("[3/8] Dominion Shade enemy sprite sheet")
    generate_dominion_shade()
    print()

    print("[4/8] The Unmaker boss sprites (idle, attack, phases 1-3)")
    generate_unmaker()
    print()

    print("[5/8] Keeper of Fragments NPC sprite")
    generate_keeper_of_fragments()
    print()

    print("[6/8] Shattered Dominion tileset (256x64)")
    generate_tileset()
    print()

    print("[7/8] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[8/8] Done! All Shattered Dominion zone assets generated.")


if __name__ == "__main__":
    main()
