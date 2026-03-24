#!/usr/bin/env python3
"""
Generate Void Sanctum zone art assets for PixelRealm (PIX-186).
Produces:
  - 3 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Void Sanctum color language: deep purple void, teal dimensional energy,
bright rift accents, shattered reality fragments — an otherworldly space
between realms where reality fractures and reforms.
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

# -- Void Sanctum Color Palette -----------------------------------------------
# All colors from the 32-color master palette

# Void / deep purple tones
VOID_BLACK    = (8, 4, 16, 255)        # #080410 -- deepest void
VOID_DARK     = (20, 10, 40, 255)      # #140a28 -- dark void
VOID_MED      = (45, 20, 80, 255)      # #2d1450 -- mid purple
VOID_LIGHT    = (70, 35, 120, 255)     # #462378 -- lighter void

# Dimensional teal energy
TEAL_DEEP     = (8, 50, 60, 255)       # #08323c -- deep teal
TEAL_DARK     = (15, 90, 110, 255)     # #0f5a6e -- dark teal
TEAL_MED      = (30, 160, 180, 255)    # #1ea0b4 -- dimensional teal
TEAL_BRIGHT   = (80, 220, 240, 255)    # #50dcf0 -- bright teal
TEAL_GLOW     = (180, 245, 255, 255)   # #b4f5ff -- teal-white glow

# Rift accents (hot magenta/pink tears in reality)
RIFT_DEEP     = (80, 10, 50, 255)      # #500a32 -- deep rift
RIFT_DARK     = (140, 20, 80, 255)     # #8c1450 -- dark rift
RIFT_MED      = (200, 50, 130, 255)    # #c83282 -- rift magenta
RIFT_BRIGHT   = (255, 120, 200, 255)   # #ff78c8 -- bright rift
RIFT_GLOW     = (255, 200, 240, 255)   # #ffc8f0 -- rift white-pink

# Neutrals
WHITE         = (240, 240, 245, 255)
BLACK         = (8, 6, 12, 255)
STONE_DARK    = (30, 25, 40, 255)
STONE_MED     = (55, 45, 70, 255)
STONE_LIGHT   = (85, 75, 100, 255)

# Shattered world fragment colors
FRAG_DARK     = (40, 35, 55, 255)      # #282337
FRAG_MED      = (65, 55, 85, 255)      # #413755
FRAG_LIGHT    = (100, 90, 130, 255)    # #645a82
FRAG_EDGE     = (130, 120, 160, 255)   # #8278a0

# Sky / atmosphere
SKY_VOID      = (12, 6, 24, 255)       # #0c0618 -- void sky
SKY_DEEP      = (18, 10, 35, 255)      # #120a23
SKY_SHIMMER   = (50, 30, 80, 255)      # #321e50

# Crystal / reality shards
CRYSTAL_DARK  = (60, 40, 100, 255)
CRYSTAL_MED   = (100, 80, 160, 255)
CRYSTAL_LIGHT = (160, 140, 220, 255)
CRYSTAL_GLOW  = (200, 190, 255, 255)

OUTLINE       = (6, 4, 10, 255)
TRANSPARENT   = (0, 0, 0, 0)

# -- Creature-specific palettes -------------------------------------------

# Rift Walker -- humanoid phasing between dimensions
WALKER_BODY      = VOID_MED
WALKER_BODY_L    = VOID_LIGHT
WALKER_CLOAK     = VOID_DARK
WALKER_CLOAK_L   = VOID_MED
WALKER_EYE       = TEAL_BRIGHT
WALKER_PHASE     = (60, 30, 100, 140)    # semi-transparent phase effect
WALKER_PHASE_L   = (90, 50, 140, 100)
WALKER_BLADE     = TEAL_MED
WALKER_BLADE_L   = TEAL_BRIGHT
WALKER_SKIN      = (130, 110, 160, 255)
WALKER_SKIN_D    = (90, 70, 120, 255)

# Void Sentinel -- armored guardian of the sanctum
SENTINEL_ARMOR   = FRAG_MED
SENTINEL_ARMOR_L = FRAG_LIGHT
SENTINEL_ARMOR_D = FRAG_DARK
SENTINEL_TRIM    = TEAL_MED
SENTINEL_EYE     = RIFT_BRIGHT
SENTINEL_VISOR   = VOID_DARK
SENTINEL_WEAPON  = STONE_LIGHT
SENTINEL_WEAPON_L = CRYSTAL_LIGHT
SENTINEL_GLOW    = TEAL_BRIGHT
SENTINEL_CAPE    = VOID_MED

# Shadow Weaver -- caster that bends reality
WEAVER_BODY      = (30, 15, 50, 200)     # semi-transparent shadowy form
WEAVER_BODY_D    = (18, 8, 35, 220)
WEAVER_ROBE      = VOID_DARK
WEAVER_ROBE_L    = VOID_MED
WEAVER_EYE       = RIFT_BRIGHT
WEAVER_EYE_GLOW  = RIFT_GLOW
WEAVER_MAGIC     = RIFT_MED
WEAVER_MAGIC_B   = RIFT_BRIGHT
WEAVER_HANDS     = (100, 60, 140, 180)
WEAVER_HOOD      = VOID_BLACK

# Void Architect boss
ARCHITECT_BODY   = VOID_MED
ARCHITECT_BODY_D = VOID_DARK
ARCHITECT_ARMOR  = FRAG_LIGHT
ARCHITECT_ARMOR_D = FRAG_MED
ARCHITECT_EYE    = TEAL_GLOW
ARCHITECT_RIFT   = RIFT_BRIGHT
ARCHITECT_TEAL   = TEAL_BRIGHT
ARCHITECT_GLOW   = TEAL_GLOW
ARCHITECT_CROWN  = CRYSTAL_LIGHT
ARCHITECT_CROWN_G = CRYSTAL_GLOW
ARCHITECT_CAPE   = VOID_DARK
ARCHITECT_CAPE_L = VOID_MED
ARCHITECT_WEAPON = CRYSTAL_MED
ARCHITECT_MAGIC  = RIFT_MED

# NPC: Dimensional Scholar
SCHOLAR_ROBE     = (50, 35, 75, 255)
SCHOLAR_ROBE_L   = (70, 50, 100, 255)
SCHOLAR_SKIN     = (180, 165, 200, 255)
SCHOLAR_SKIN_D   = (150, 135, 170, 255)
SCHOLAR_HAIR     = (200, 190, 220, 255)
SCHOLAR_STAFF    = CRYSTAL_MED
SCHOLAR_STAFF_ORB = TEAL_BRIGHT
SCHOLAR_TRIM     = TEAL_MED
SCHOLAR_BELT     = FRAG_DARK
SCHOLAR_EYES     = TEAL_MED
SCHOLAR_BOOK     = VOID_MED
SCHOLAR_BOOK_G   = RIFT_MED

# Tileset colors
TILE_VOID      = VOID_MED
TILE_VOID_D    = VOID_DARK
TILE_VOID_L    = VOID_LIGHT
TILE_FRAG      = FRAG_MED
TILE_FRAG_D    = FRAG_DARK
TILE_FRAG_L    = FRAG_LIGHT
TILE_FRAG_E    = FRAG_EDGE
TILE_TEAL      = TEAL_MED
TILE_TEAL_D    = TEAL_DARK
TILE_TEAL_B    = TEAL_BRIGHT
TILE_RIFT      = RIFT_MED
TILE_RIFT_D    = RIFT_DARK
TILE_STONE     = STONE_MED
TILE_STONE_D   = STONE_DARK
TILE_STONE_L   = STONE_LIGHT
TILE_CRYSTAL   = CRYSTAL_MED
TILE_CRYSTAL_L = CRYSTAL_LIGHT


def ensure_dir(path):
    os.makedirs(os.path.dirname(path) if isinstance(path, str) else path.parent, exist_ok=True)


def save_asset(img, rel_path):
    full_path = ASSET_ROOT / rel_path if isinstance(rel_path, str) else rel_path
    ensure_dir(full_path)
    img.save(str(full_path))
    print(f"  Created: {full_path.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# ENEMY 1: RIFT WALKER -- humanoid phasing between dimensions, 16x16, 8 frames
# Frames 0-3: walk/phase, Frames 4-7: attack (dimensional blade slash)
# =========================================================================

def draw_rift_walker(draw, ox, oy, frame):
    """Draw a single 16x16 Rift Walker frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, -1, 0, -1][anim]
    stride = [0, 1, 0, -1][anim]
    # Phase transparency shift per frame
    phase_offset = [0, 1, 2, 1][anim]

    # Legs (phasing, slightly transparent at edges)
    draw.rectangle([ox + 5, oy + 12 + bob, ox + 6, oy + 14], fill=WALKER_BODY)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 10, oy + 14], fill=WALKER_BODY)
    # Feet
    draw.point((ox + 5 + stride, oy + 15), fill=WALKER_BODY)
    draw.point((ox + 10 - stride, oy + 15), fill=WALKER_BODY)

    # Cloak / torso
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 11, oy + 12 + bob], fill=WALKER_CLOAK)
    draw.rectangle([ox + 5, oy + 8 + bob, ox + 10, oy + 11 + bob], fill=WALKER_CLOAK_L)
    # Dimensional rift lines on cloak
    draw.point((ox + 6, oy + 9 + bob), fill=TEAL_DARK)
    draw.point((ox + 9, oy + 9 + bob), fill=TEAL_DARK)
    draw.point((ox + 7, oy + 11 + bob), fill=TEAL_DARK)

    # Phase echo (ghostly duplicate offset)
    if phase_offset > 0:
        draw.point((ox + 3 - phase_offset, oy + 9 + bob), fill=WALKER_PHASE)
        draw.point((ox + 3 - phase_offset, oy + 10 + bob), fill=WALKER_PHASE_L)

    # Head (hooded)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 10, oy + 7 + bob], fill=WALKER_CLOAK)
    draw.rectangle([ox + 7, oy + 4 + bob, ox + 9, oy + 6 + bob], fill=WALKER_SKIN_D)
    # Glowing teal eyes
    draw.point((ox + 7, oy + 5 + bob), fill=WALKER_EYE)
    draw.point((ox + 9, oy + 5 + bob), fill=WALKER_EYE)
    # Hood peak
    draw.point((ox + 8, oy + 2 + bob), fill=WALKER_CLOAK)

    # Arms + dimensional blade
    if is_attack:
        slash_arc = [0, 2, 3, 1][anim]
        # Right arm raised with blade
        draw.rectangle([ox + 11, oy + 6 + bob - slash_arc, ox + 12, oy + 9 + bob], fill=WALKER_BODY_L)
        # Dimensional blade (teal energy)
        for sx in range(slash_arc + 2):
            draw.point((ox + 12 + sx, oy + 6 + bob - slash_arc + sx), fill=WALKER_BLADE)
        draw.point((ox + 12 + slash_arc + 1, oy + 6 + bob), fill=WALKER_BLADE_L)
        # Left arm forward
        draw.rectangle([ox + 3, oy + 8 + bob, ox + 4, oy + 11 + bob], fill=WALKER_BODY)
    else:
        # Arms at sides
        draw.rectangle([ox + 3, oy + 8 + bob, ox + 4, oy + 12 + bob], fill=WALKER_BODY)
        draw.rectangle([ox + 11, oy + 8 + bob, ox + 12, oy + 12 + bob], fill=WALKER_BODY)
        # Blade held at side
        draw.rectangle([ox + 12, oy + 5 + bob, ox + 12, oy + 13 + bob], fill=WALKER_BLADE)
        draw.point((ox + 12, oy + 4 + bob), fill=WALKER_BLADE_L)


def generate_rift_walker():
    """Generate 8-frame Rift Walker sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_rift_walker(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_rift_walker.png")
    return img


# =========================================================================
# ENEMY 2: VOID SENTINEL -- armored guardian, 16x16, 8 frames
# Frames 0-3: patrol/march, Frames 4-7: attack (energy lance thrust)
# =========================================================================

def draw_void_sentinel(draw, ox, oy, frame):
    """Draw a single 16x16 Void Sentinel frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, 0, -1, 0][anim]
    stride = [0, 1, 0, -1][anim]

    # Heavy legs (armored)
    draw.rectangle([ox + 4, oy + 12 + bob, ox + 6, oy + 14], fill=SENTINEL_ARMOR_D)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 11, oy + 14], fill=SENTINEL_ARMOR_D)
    # Armored boots
    draw.rectangle([ox + 4 + stride, oy + 14, ox + 6 + stride, oy + 15], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 9 - stride, oy + 14, ox + 11 - stride, oy + 15], fill=SENTINEL_ARMOR)

    # Torso (heavy plate armor)
    draw.rectangle([ox + 4, oy + 6 + bob, ox + 11, oy + 12 + bob], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 5, oy + 7 + bob, ox + 10, oy + 11 + bob], fill=SENTINEL_ARMOR_L)
    # Teal energy lines on chest plate
    draw.point((ox + 7, oy + 8 + bob), fill=SENTINEL_TRIM)
    draw.point((ox + 8, oy + 8 + bob), fill=SENTINEL_TRIM)
    draw.point((ox + 7, oy + 10 + bob), fill=SENTINEL_TRIM)
    draw.point((ox + 8, oy + 10 + bob), fill=SENTINEL_TRIM)
    # Shoulder pauldrons
    draw.rectangle([ox + 3, oy + 6 + bob, ox + 4, oy + 8 + bob], fill=SENTINEL_ARMOR_L)
    draw.rectangle([ox + 11, oy + 6 + bob, ox + 12, oy + 8 + bob], fill=SENTINEL_ARMOR_L)
    # Pauldron glow trim
    draw.point((ox + 3, oy + 6 + bob), fill=SENTINEL_GLOW)
    draw.point((ox + 12, oy + 6 + bob), fill=SENTINEL_GLOW)

    # Cape (behind)
    draw.point((ox + 5, oy + 12 + bob), fill=SENTINEL_CAPE)
    draw.point((ox + 10, oy + 12 + bob), fill=SENTINEL_CAPE)

    # Helm (enclosed visor)
    draw.rectangle([ox + 5, oy + 2 + bob, ox + 10, oy + 6 + bob], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 5 + bob], fill=SENTINEL_VISOR)
    # Glowing visor slit
    draw.rectangle([ox + 6, oy + 4 + bob, ox + 9, oy + 4 + bob], fill=SENTINEL_EYE)
    # Helm crest
    draw.point((ox + 7, oy + 1 + bob), fill=SENTINEL_ARMOR_L)
    draw.point((ox + 8, oy + 1 + bob), fill=SENTINEL_TRIM)

    # Arms + energy lance
    if is_attack:
        thrust = [0, 2, 4, 2][anim]
        # Right arm thrusting forward with lance
        draw.rectangle([ox + 11, oy + 7 + bob, ox + 12, oy + 10 + bob], fill=SENTINEL_ARMOR)
        # Energy lance extending
        for lx in range(thrust + 2):
            draw.point((ox + 13 + lx, oy + 8 + bob), fill=SENTINEL_WEAPON)
        if thrust > 0:
            draw.point((ox + 13 + thrust + 1, oy + 8 + bob), fill=SENTINEL_WEAPON_L)
            draw.point((ox + 13 + thrust + 1, oy + 7 + bob), fill=SENTINEL_GLOW)
        # Left arm with shield
        draw.rectangle([ox + 2, oy + 7 + bob, ox + 4, oy + 11 + bob], fill=SENTINEL_ARMOR_L)
        draw.point((ox + 3, oy + 9 + bob), fill=SENTINEL_TRIM)
    else:
        # Arms at sides with lance resting
        draw.rectangle([ox + 3, oy + 8 + bob, ox + 4, oy + 12 + bob], fill=SENTINEL_ARMOR)
        draw.rectangle([ox + 11, oy + 8 + bob, ox + 12, oy + 12 + bob], fill=SENTINEL_ARMOR)
        # Lance held vertically
        draw.rectangle([ox + 13, oy + 3 + bob, ox + 13, oy + 14 + bob], fill=SENTINEL_WEAPON)
        draw.point((ox + 13, oy + 2 + bob), fill=SENTINEL_WEAPON_L)


def generate_void_sentinel():
    """Generate 8-frame Void Sentinel sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_void_sentinel(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_void_sentinel.png")
    return img


# =========================================================================
# ENEMY 3: SHADOW WEAVER -- reality-bending caster, 16x16, 8 frames
# Frames 0-3: hover/float, Frames 4-7: attack (rift bolt)
# =========================================================================

def draw_shadow_weaver(draw, ox, oy, frame):
    """Draw a single 16x16 Shadow Weaver frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [0, -1, -2, -1][anim]

    # Tattered robe bottom (no visible feet -- floats)
    draw.rectangle([ox + 5, oy + 12 + float_y, ox + 10, oy + 15], fill=WEAVER_ROBE)
    # Robe wisps trailing below
    draw.point((ox + 4, oy + 14 + float_y), fill=WEAVER_BODY)
    draw.point((ox + 11, oy + 14 + float_y), fill=WEAVER_BODY)
    draw.point((ox + 6, oy + 15), fill=WEAVER_BODY_D)

    # Torso / upper robe
    draw.rectangle([ox + 5, oy + 7 + float_y, ox + 10, oy + 12 + float_y], fill=WEAVER_ROBE)
    draw.rectangle([ox + 6, oy + 8 + float_y, ox + 9, oy + 11 + float_y], fill=WEAVER_ROBE_L)
    # Rift energy across chest
    draw.point((ox + 7, oy + 9 + float_y), fill=RIFT_DARK)
    draw.point((ox + 8, oy + 10 + float_y), fill=RIFT_DARK)

    # Hood / head (deep shadow with glowing eyes)
    draw.rectangle([ox + 5, oy + 3 + float_y, ox + 10, oy + 7 + float_y], fill=WEAVER_HOOD)
    draw.rectangle([ox + 6, oy + 4 + float_y, ox + 9, oy + 6 + float_y], fill=WEAVER_ROBE)
    # Glowing rift eyes
    draw.point((ox + 7, oy + 5 + float_y), fill=WEAVER_EYE)
    draw.point((ox + 9, oy + 5 + float_y), fill=WEAVER_EYE)
    # Eye glow aura
    draw.point((ox + 6, oy + 5 + float_y), fill=WEAVER_EYE_GLOW)
    # Hood peak
    draw.point((ox + 7, oy + 2 + float_y), fill=WEAVER_HOOD)
    draw.point((ox + 8, oy + 2 + float_y), fill=WEAVER_HOOD)

    # Arms and magic
    if is_attack:
        bolt_ext = [0, 2, 4, 2][anim]
        # Arms outstretched casting
        draw.rectangle([ox + 2, oy + 8 + float_y, ox + 5, oy + 9 + float_y], fill=WEAVER_ROBE)
        draw.point((ox + 2, oy + 8 + float_y), fill=WEAVER_HANDS)
        draw.rectangle([ox + 10, oy + 8 + float_y, ox + 13, oy + 9 + float_y], fill=WEAVER_ROBE)
        draw.point((ox + 13, oy + 8 + float_y), fill=WEAVER_HANDS)
        # Rift bolt projectile
        if bolt_ext > 0:
            for bx in range(bolt_ext):
                draw.point((ox + 14 + bx, oy + 8 + float_y), fill=WEAVER_MAGIC)
                if bx > 0:
                    draw.point((ox + 14 + bx, oy + 7 + float_y), fill=WEAVER_MAGIC_B)
                    draw.point((ox + 14 + bx, oy + 9 + float_y), fill=WEAVER_MAGIC_B)
            if bolt_ext >= 3:
                draw.point((ox + 14 + bolt_ext, oy + 8 + float_y), fill=RIFT_GLOW)
    else:
        # Arms at sides, gathering energy
        draw.rectangle([ox + 3, oy + 8 + float_y, ox + 5, oy + 11 + float_y], fill=WEAVER_ROBE)
        draw.rectangle([ox + 10, oy + 8 + float_y, ox + 12, oy + 11 + float_y], fill=WEAVER_ROBE)
        # Hands with faint glow
        draw.point((ox + 3, oy + 11 + float_y), fill=WEAVER_HANDS)
        draw.point((ox + 12, oy + 11 + float_y), fill=WEAVER_HANDS)
        # Ambient magic particles
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 3 + sway, oy + 12 + float_y), fill=WEAVER_MAGIC)
        draw.point((ox + 12 - sway, oy + 12 + float_y), fill=WEAVER_MAGIC)

    # Shadow wisps trailing (floating effect)
    wisp_sway = [0, 1, 0, -1][anim]
    draw.point((ox + 7 + wisp_sway, oy + 15), fill=WEAVER_BODY)
    draw.point((ox + 9 - wisp_sway, oy + 15), fill=WEAVER_BODY_D)


def generate_shadow_weaver():
    """Generate 8-frame Shadow Weaver sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_shadow_weaver(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_shadow_weaver.png")
    return img


# =========================================================================
# BOSS: VOID ARCHITECT -- master of dimensional construction, 32x32, multi-phase
# idle (1 frame), attack (4 frames), phase1/2/3 (1 frame each)
# =========================================================================

def draw_void_architect(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw the Void Architect boss at 32x32."""
    anim = frame % 4
    breath = [0, -1, 0, 1][anim]

    # Phase color shifts
    body = ARCHITECT_BODY
    armor = ARCHITECT_ARMOR
    eye = ARCHITECT_EYE
    rift = ARCHITECT_RIFT
    teal = ARCHITECT_TEAL
    glow = ARCHITECT_GLOW
    crown = ARCHITECT_CROWN
    magic = ARCHITECT_MAGIC
    if phase == 2:
        body = (60, 25, 100, 255)       # deeper purple
        armor = (120, 110, 170, 255)
        eye = RIFT_GLOW
        rift = RIFT_GLOW
        teal = TEAL_GLOW
        glow = (220, 250, 255, 255)
        crown = CRYSTAL_GLOW
    elif phase == 3:
        body = (80, 15, 60, 255)        # rift-corrupted purple-red
        armor = (140, 100, 140, 255)
        eye = RIFT_GLOW
        rift = (255, 150, 220, 255)
        magic = RIFT_BRIGHT
        glow = RIFT_GLOW
        crown = (255, 200, 240, 255)

    outline = OUTLINE

    # Legs -- tall, armored
    draw.rectangle([ox + 9, oy + 22 + breath, ox + 13, oy + 27], fill=body)
    draw.rectangle([ox + 18, oy + 22 + breath, ox + 22, oy + 27], fill=body)
    # Armored boots
    draw.rectangle([ox + 8, oy + 27, ox + 14, oy + 30], fill=armor)
    draw.rectangle([ox + 17, oy + 27, ox + 23, oy + 30], fill=armor)
    # Boot teal energy lines
    draw.point((ox + 10, oy + 28), fill=teal)
    draw.point((ox + 20, oy + 28), fill=teal)

    # Robed torso with dimensional armor plates
    draw.rectangle([ox + 8, oy + 12 + breath, ox + 23, oy + 22 + breath], fill=ARCHITECT_CAPE)
    draw.rectangle([ox + 9, oy + 13 + breath, ox + 22, oy + 21 + breath], fill=ARCHITECT_CAPE_L)
    # Chest armor plate
    draw.rectangle([ox + 11, oy + 14 + breath, ox + 20, oy + 20 + breath], fill=armor)
    draw.rectangle([ox + 12, oy + 15 + breath, ox + 19, oy + 19 + breath], fill=ARCHITECT_ARMOR_D)
    # Dimensional rift core in chest
    draw.rectangle([ox + 14, oy + 16 + breath, ox + 17, oy + 18 + breath], fill=rift)
    draw.point((ox + 15, oy + 17 + breath), fill=glow)
    draw.point((ox + 16, oy + 17 + breath), fill=glow)
    # Teal energy veins on armor
    draw.point((ox + 12, oy + 15 + breath), fill=teal)
    draw.point((ox + 19, oy + 15 + breath), fill=teal)
    draw.point((ox + 12, oy + 19 + breath), fill=teal)
    draw.point((ox + 19, oy + 19 + breath), fill=teal)

    # Shoulder plates (large, angular)
    draw.rectangle([ox + 4, oy + 10 + breath, ox + 9, oy + 14 + breath], fill=armor)
    draw.point((ox + 5, oy + 10 + breath), fill=teal)
    draw.rectangle([ox + 22, oy + 10 + breath, ox + 27, oy + 14 + breath], fill=armor)
    draw.point((ox + 26, oy + 10 + breath), fill=teal)

    # Cape (flowing behind)
    cape_wave = [0, 1, 2, 1][anim]
    draw.rectangle([ox + 10, oy + 20 + breath, ox + 21, oy + 24 + breath + cape_wave], fill=ARCHITECT_CAPE)
    draw.point((ox + 11, oy + 24 + breath + cape_wave), fill=ARCHITECT_CAPE_L)
    draw.point((ox + 20, oy + 24 + breath + cape_wave), fill=ARCHITECT_CAPE_L)

    # Head (regal, crowned)
    draw.rectangle([ox + 11, oy + 5 + breath, ox + 20, oy + 12 + breath], fill=body)
    draw.rectangle([ox + 12, oy + 6 + breath, ox + 19, oy + 11 + breath], fill=ARCHITECT_BODY_D)
    # Face plate / mask
    draw.rectangle([ox + 13, oy + 7 + breath, ox + 18, oy + 10 + breath], fill=armor)
    # Glowing eyes
    draw.rectangle([ox + 13, oy + 8 + breath, ox + 14, oy + 9 + breath], fill=outline)
    draw.point((ox + 13, oy + 8 + breath), fill=eye)
    draw.rectangle([ox + 17, oy + 8 + breath, ox + 18, oy + 9 + breath], fill=outline)
    draw.point((ox + 18, oy + 8 + breath), fill=eye)

    # Crown (dimensional crystal crown)
    draw.rectangle([ox + 12, oy + 4 + breath, ox + 19, oy + 5 + breath], fill=crown)
    draw.point((ox + 14, oy + 3 + breath), fill=crown)
    draw.point((ox + 15, oy + 2 + breath), fill=ARCHITECT_CROWN_G)
    draw.point((ox + 16, oy + 2 + breath), fill=ARCHITECT_CROWN_G)
    draw.point((ox + 17, oy + 3 + breath), fill=crown)
    # Crown center gem
    draw.point((ox + 15, oy + 3 + breath), fill=glow)
    draw.point((ox + 16, oy + 3 + breath), fill=glow)

    # Arms
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        attack_ext = [0, 2, 4, 2][anim]
        # Arms raised, channeling dimensional rift
        draw.rectangle([ox + 4, oy + 12 + breath - attack_ext, ox + 8, oy + 18 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 12 + breath - attack_ext, ox + 27, oy + 18 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 12 + breath - attack_ext, ox + 5, oy + 13 + breath - attack_ext], fill=armor)
        draw.rectangle([ox + 26, oy + 12 + breath - attack_ext, ox + 28, oy + 13 + breath - attack_ext], fill=armor)
        # Rift energy between hands
        if attack_ext >= 2:
            for rx in range(6, 26, 2):
                ry = 11 + breath - attack_ext + random.randint(-1, 1)
                if 0 <= oy + ry < 32:
                    draw.point((ox + rx, oy + ry), fill=rift)
            # Central rift tear
            draw.rectangle([ox + 13, oy + 10 + breath - attack_ext, ox + 18, oy + 12 + breath - attack_ext], fill=magic)
            draw.point((ox + 15, oy + 11 + breath - attack_ext), fill=glow)
            draw.point((ox + 16, oy + 11 + breath - attack_ext), fill=glow)
        # Ground shockwave
        if attack_ext >= 3:
            for gx in range(3, 29, 3):
                draw.point((ox + gx, oy + 30), fill=teal)
                draw.point((ox + gx, oy + 31), fill=TEAL_DARK)
    else:
        # Idle arms with staff/scepter
        draw.rectangle([ox + 4, oy + 14 + breath + arm_wave, ox + 8, oy + 21 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 14 + breath + arm_wave, ox + 27, oy + 21 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 20 + breath + arm_wave, ox + 7, oy + 22 + breath], fill=armor)
        draw.rectangle([ox + 24, oy + 20 + breath + arm_wave, ox + 28, oy + 22 + breath], fill=armor)
        # Scepter in right hand
        draw.rectangle([ox + 28, oy + 8 + breath, ox + 28, oy + 22 + breath], fill=ARCHITECT_WEAPON)
        draw.point((ox + 28, oy + 7 + breath), fill=teal)
        draw.point((ox + 28, oy + 6 + breath), fill=glow)

    # Dimensional aura (floating fragments around boss)
    if phase >= 2:
        aura_pos = [(3, 6), (28, 8), (5, 4), (26, 5), (15, 1)]
        for i, (ax, ay) in enumerate(aura_pos):
            if (anim + i) % 3 == 0:
                draw.point((ox + ax, oy + ay + breath), fill=rift)

    if phase == 3:
        # Reality fracture lines radiating from boss
        for tx in range(2, 30, 3):
            ty = 28 + (anim + tx) % 4
            if ty < 32:
                draw.point((ox + tx, oy + ty), fill=magic)
        # Crown blazing with rift energy
        draw.point((ox + 14, oy + 2 + breath), fill=magic)
        draw.point((ox + 15, oy + 1 + breath), fill=rift)
        draw.point((ox + 16, oy + 1 + breath), fill=rift)
        draw.point((ox + 17, oy + 2 + breath), fill=magic)


def generate_void_architect():
    """Generate all Void Architect boss sprite sheets."""
    random.seed(186)

    # Idle
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_void_architect(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_void_architect_idle.png")

    # Attack -- 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        random.seed(186 + f)
        draw_void_architect(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_void_architect_attack.png")

    # Phase 1
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_void_architect(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_void_architect_phase1.png")

    # Phase 2 -- dimensional surge
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_void_architect(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_void_architect_phase2.png")

    # Phase 3 -- rift-corrupted
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_void_architect(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_void_architect_phase3.png")


# =========================================================================
# NPC: DIMENSIONAL SCHOLAR -- zone quest giver, 16x24
# A researcher studying the fractured dimensions, robed with crystal staff
# =========================================================================

def draw_dimensional_scholar(draw, ox, oy):
    """Draw the Dimensional Scholar NPC at 16x24."""
    # Feet / boots (sturdy dimensional-travel boots)
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=FRAG_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=FRAG_DARK)

    # Robe (long, with dimensional shimmer)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=SCHOLAR_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=SCHOLAR_ROBE_L)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=SCHOLAR_ROBE)
    # Teal dimensional trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=SCHOLAR_TRIM)

    # Belt with crystal clasp
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=SCHOLAR_BELT)
    # Rift crystal pendant
    draw.point((ox + 8, oy + 15), fill=TEAL_BRIGHT)
    draw.point((ox + 8, oy + 16), fill=RIFT_MED)

    # Arms (in robe sleeves)
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=SCHOLAR_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=SCHOLAR_ROBE)
    # Teal cuffs
    draw.point((ox + 2, oy + 16), fill=SCHOLAR_TRIM)
    draw.point((ox + 14, oy + 16), fill=SCHOLAR_TRIM)
    # Hands
    draw.point((ox + 2, oy + 17), fill=SCHOLAR_SKIN)
    draw.point((ox + 14, oy + 17), fill=SCHOLAR_SKIN)

    # Dimensional research tome (held in left hand)
    draw.rectangle([ox + 1, oy + 15, ox + 3, oy + 18], fill=SCHOLAR_BOOK)
    draw.point((ox + 2, oy + 16), fill=SCHOLAR_BOOK_G)
    # Pages
    draw.rectangle([ox + 1, oy + 16, ox + 1, oy + 17], fill=WHITE)

    # Staff (right hand -- crystal staff with teal orb)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=SCHOLAR_STAFF)
    # Crystal staff top (prism holding orb)
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=CRYSTAL_DARK)
    draw.point((ox + 14, oy + 1), fill=SCHOLAR_STAFF_ORB)
    draw.point((ox + 14, oy + 2), fill=TEAL_GLOW)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=SCHOLAR_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=SCHOLAR_SKIN)

    # Hair (silver-lavender, scholarly)
    draw.rectangle([ox + 5, oy + 3, ox + 11, oy + 5], fill=SCHOLAR_HAIR)
    draw.point((ox + 4, oy + 5), fill=SCHOLAR_HAIR)
    draw.point((ox + 4, oy + 6), fill=SCHOLAR_HAIR)
    draw.point((ox + 12, oy + 5), fill=SCHOLAR_HAIR)
    draw.point((ox + 12, oy + 6), fill=SCHOLAR_HAIR)

    # Spectacles / goggles (dimensional viewing lenses)
    draw.rectangle([ox + 6, oy + 6, ox + 7, oy + 7], fill=TEAL_DARK)
    draw.rectangle([ox + 9, oy + 6, ox + 10, oy + 7], fill=TEAL_DARK)
    draw.point((ox + 6, oy + 6), fill=SCHOLAR_EYES)
    draw.point((ox + 10, oy + 6), fill=SCHOLAR_EYES)
    # Goggle bridge
    draw.point((ox + 8, oy + 6), fill=FRAG_DARK)

    # Crystal circlet
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 4], fill=CRYSTAL_MED)
    draw.point((ox + 8, oy + 3), fill=TEAL_BRIGHT)


def generate_dimensional_scholar():
    """Generate Dimensional Scholar NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_dimensional_scholar(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_void_sanctum.png")
    return img


# =========================================================================
# TILESET -- tileset_void_sanctum.png (256x64, 16 cols x 4 rows)
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

def tile_void_stone(tile):
    """Solid void stone ground."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    # Subtle void texture
    for x in range(0, 16, 3):
        for y in range(0, 16, 4):
            d.point((x + 1, y + 2), fill=TILE_FRAG_D)


def tile_cracked_void(tile):
    """Rift-cracked void stone."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    # Dimensional cracks (glowing teal/rift lines)
    d.line([(2, 3), (6, 8)], fill=TILE_TEAL_D, width=1)
    d.line([(10, 1), (8, 7)], fill=TILE_RIFT_D, width=1)
    d.line([(5, 10), (12, 14)], fill=TILE_TEAL_D, width=1)
    # Glow in cracks
    d.point((4, 5), fill=TILE_TEAL)
    d.point((9, 4), fill=TILE_RIFT)


def tile_floating_platform(tile):
    """Floating platform edge (suspended in void)."""
    d = ImageDraw.Draw(tile)
    # Platform surface
    d.rectangle([0, 4, 15, 10], fill=TILE_FRAG)
    d.rectangle([1, 5, 14, 9], fill=TILE_FRAG_L)
    # Teal edge glow
    d.rectangle([0, 10, 15, 11], fill=TILE_TEAL_D)
    d.rectangle([0, 11, 15, 12], fill=TILE_TEAL)
    # Underside fragments
    d.point((3, 13), fill=TILE_FRAG_D)
    d.point((8, 14), fill=TILE_FRAG_D)
    d.point((12, 13), fill=TILE_FRAG_D)


def tile_rift_tear(tile):
    """Active dimensional tear in ground."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    # Rift tear (vertical slash of energy)
    d.rectangle([6, 2, 9, 13], fill=TILE_VOID_D)
    d.rectangle([7, 3, 8, 12], fill=TILE_RIFT)
    d.point((7, 5), fill=TILE_RIFT)
    d.point((8, 8), fill=TILE_RIFT)
    # Rift glow edges
    d.point((6, 4), fill=RIFT_BRIGHT)
    d.point((9, 7), fill=RIFT_BRIGHT)
    d.point((7, 1), fill=RIFT_DARK)
    d.point((8, 14), fill=RIFT_DARK)


def tile_crystal_formation(tile):
    """Dimensional crystal cluster."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    # Crystal shards growing from ground
    d.rectangle([4, 4, 6, 12], fill=TILE_CRYSTAL)
    d.rectangle([5, 2, 5, 4], fill=TILE_CRYSTAL_L)
    d.rectangle([8, 6, 10, 13], fill=TILE_CRYSTAL)
    d.rectangle([9, 3, 9, 6], fill=TILE_CRYSTAL_L)
    d.point((12, 8), fill=TILE_CRYSTAL)
    d.point((12, 7), fill=TILE_CRYSTAL_L)
    # Crystal glow
    d.point((5, 3), fill=CRYSTAL_GLOW)
    d.point((9, 4), fill=CRYSTAL_GLOW)


def tile_void_wall(tile):
    """Solid void wall block."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_VOID)
    d.rectangle([1, 1, 14, 14], fill=TILE_VOID_D)
    # Teal energy veins in wall
    d.point((4, 4), fill=TILE_TEAL_D)
    d.point((11, 7), fill=TILE_TEAL_D)
    d.point((7, 12), fill=TILE_TEAL_D)
    d.point((3, 9), fill=TILE_TEAL_D)


def tile_void_wall_top(tile):
    """Top of void wall block."""
    d = ImageDraw.Draw(tile)
    # Top surface
    d.rectangle([0, 6, 15, 15], fill=TILE_VOID)
    d.rectangle([1, 7, 14, 14], fill=TILE_VOID_D)
    # Crumbling edge
    d.point((3, 5), fill=TILE_VOID)
    d.point((7, 4), fill=TILE_VOID)
    d.point((11, 5), fill=TILE_VOID_D)
    # Teal trim at top
    d.rectangle([0, 6, 15, 6], fill=TILE_TEAL_D)


def tile_platform_edge_left(tile):
    """Left edge of floating platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([4, 0, 15, 15], fill=TILE_FRAG)
    d.rectangle([5, 1, 14, 14], fill=TILE_FRAG_L)
    # Edge glow
    d.rectangle([4, 0, 4, 15], fill=TILE_TEAL_D)
    d.point((3, 3), fill=TILE_FRAG_D)
    d.point((2, 8), fill=TILE_FRAG_D)
    d.point((3, 12), fill=TILE_FRAG_D)


def tile_platform_edge_right(tile):
    """Right edge of floating platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 11, 15], fill=TILE_FRAG)
    d.rectangle([1, 1, 10, 14], fill=TILE_FRAG_L)
    # Edge glow
    d.rectangle([11, 0, 11, 15], fill=TILE_TEAL_D)
    d.point((12, 4), fill=TILE_FRAG_D)
    d.point((13, 9), fill=TILE_FRAG_D)
    d.point((12, 13), fill=TILE_FRAG_D)


def tile_platform_edge_top(tile):
    """Top edge of floating platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 4, 15, 15], fill=TILE_FRAG)
    d.rectangle([1, 5, 14, 14], fill=TILE_FRAG_L)
    # Teal edge glow
    d.rectangle([0, 4, 15, 4], fill=TILE_TEAL_D)
    d.point((3, 3), fill=TILE_FRAG_D)
    d.point((7, 2), fill=TILE_FRAG_D)
    d.point((11, 3), fill=TILE_FRAG_D)


def tile_platform_edge_bottom(tile):
    """Bottom edge of floating platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 11], fill=TILE_FRAG)
    d.rectangle([1, 1, 14, 10], fill=TILE_FRAG_L)
    # Underside glow
    d.rectangle([0, 11, 15, 11], fill=TILE_TEAL_D)
    d.point((4, 12), fill=TILE_FRAG_D)
    d.point((8, 13), fill=TILE_FRAG_D)
    d.point((12, 12), fill=TILE_FRAG_D)


def tile_rune_plate(tile):
    """Ancient rune-carved dimensional plate."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    d.rectangle([1, 1, 14, 14], fill=TILE_STONE_L)
    # Rune circle
    cx, cy = 8, 8
    for angle_i in range(12):
        angle = angle_i * (math.pi / 6)
        px = int(cx + 5 * math.cos(angle))
        py = int(cy + 5 * math.sin(angle))
        if 0 <= px < 16 and 0 <= py < 16:
            d.point((px, py), fill=TILE_RIFT)
    # Center rift glyph
    d.point((8, 8), fill=RIFT_BRIGHT)
    d.point((7, 7), fill=TILE_RIFT)
    d.point((9, 9), fill=TILE_RIFT)


def tile_void_floor(tile):
    """Dark void floor (between floating platforms)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_VOID_D)
    # Faint star-like dots
    d.point((3, 5), fill=TILE_VOID_L)
    d.point((10, 2), fill=TILE_VOID_L)
    d.point((7, 12), fill=TILE_VOID)
    d.point((13, 9), fill=TILE_VOID_L)


def tile_void_variant1(tile):
    """Void stone variant 1 (lighter patches)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    d.point((3, 4), fill=TILE_FRAG_L)
    d.point((10, 2), fill=TILE_FRAG_L)
    d.point((7, 11), fill=TILE_FRAG_D)
    d.point((13, 8), fill=TILE_FRAG_L)


def tile_void_variant2(tile):
    """Void stone variant 2 (darker patches)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FRAG)
    d.point((4, 7), fill=TILE_FRAG_D)
    d.point((11, 3), fill=TILE_FRAG_D)
    d.point((8, 13), fill=TILE_FRAG_L)
    d.point((2, 10), fill=TILE_FRAG_D)


def generate_tileset():
    """Generate the main tileset_void_sanctum.png (256x64)."""
    random.seed(186)  # Deterministic for PIX-186
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground / terrain tiles
    row0 = [
        tile_void_stone, tile_cracked_void, tile_floating_platform, tile_void_floor,
        tile_void_wall, tile_void_wall_top, tile_crystal_formation, tile_rift_tear,
        tile_void_variant1, tile_void_variant2, tile_platform_edge_top, tile_platform_edge_bottom,
        tile_platform_edge_left, tile_platform_edge_right, tile_rune_plate, tile_void_stone,
    ]
    for i, fn in enumerate(row0):
        random.seed(186 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Features and decorations
    row1 = [
        tile_crystal_formation, tile_rift_tear, tile_rune_plate, tile_floating_platform,
        tile_void_stone, tile_cracked_void, tile_void_floor, tile_void_wall,
        tile_void_wall_top, tile_platform_edge_top, tile_void_variant1, tile_void_variant2,
        tile_platform_edge_left, tile_platform_edge_right, tile_void_stone, tile_void_stone,
    ]
    for i, fn in enumerate(row1):
        random.seed(186 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions + more decorations
    row2 = [
        tile_platform_edge_top, tile_platform_edge_bottom, tile_platform_edge_left, tile_platform_edge_right,
        tile_void_floor, tile_void_floor, tile_void_stone, tile_void_wall,
        tile_void_stone, tile_cracked_void, tile_void_wall, tile_void_wall_top,
        tile_rune_plate, tile_rift_tear, tile_crystal_formation, tile_floating_platform,
    ]
    for i, fn in enumerate(row2):
        random.seed(186 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: Variants and fill
    row3 = [
        tile_rift_tear, tile_rune_plate, tile_crystal_formation, tile_floating_platform,
        tile_void_wall_top, tile_void_wall, tile_void_floor, tile_void_stone,
        tile_platform_edge_top, tile_platform_edge_bottom, tile_platform_edge_left, tile_platform_edge_right,
        tile_void_variant1, tile_void_variant2, tile_void_stone, tile_cracked_void,
    ]
    for i, fn in enumerate(row3):
        random.seed(186 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(186)
    out = TILESETS_DIR / "tileset_void_sanctum.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# PARALLAX BACKGROUNDS -- 320x180, three layers (far/mid/near)
# =========================================================================

def generate_parallax():
    """Three parallax layers for Void Sanctum zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # -- FAR LAYER: deep void sky with shattered world fragments --
    far = Image.new("RGBA", (320, 180), SKY_VOID)
    fd = ImageDraw.Draw(far)
    # Void sky gradient (top = near-black, bottom = deep purple)
    for y in range(180):
        ratio = y / 180
        r = int(SKY_VOID[0] * (1 - ratio) + SKY_DEEP[0] * ratio)
        g = int(SKY_VOID[1] * (1 - ratio) + SKY_DEEP[1] * ratio)
        b = int(SKY_VOID[2] * (1 - ratio) + SKY_DEEP[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    # Distant nebula / void shimmer in upper sky
    random.seed(186)
    for _ in range(8):
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
                        alpha = int(40 * (1 - dist / max_dist))
                        if alpha > 0:
                            far.putpixel((px, py), c(SKY_SHIMMER, alpha))

    # Dim distant stars (scattered across void)
    for _ in range(25):
        sx, sy = random.randint(0, 319), random.randint(0, 100)
        alpha = random.randint(60, 160)
        far.putpixel((sx, sy), c(CRYSTAL_GLOW, alpha))

    # Shattered world fragments (distant floating islands on horizon)
    fragment_positions = [(40, 115), (130, 100), (220, 120), (300, 108)]
    for fx_pos, fy_pos in fragment_positions:
        # Fragment body (irregular polygon approximation)
        fw = random.randint(20, 40)
        fh = random.randint(10, 18)
        fd.rectangle([fx_pos, fy_pos, fx_pos + fw, fy_pos + fh], fill=c(FRAG_DARK))
        fd.rectangle([fx_pos + 2, fy_pos + 1, fx_pos + fw - 2, fy_pos + fh - 2], fill=c(FRAG_MED))
        # Teal glow along bottom (dimensional energy)
        fd.rectangle([fx_pos, fy_pos + fh, fx_pos + fw, fy_pos + fh + 1], fill=c(TEAL_DARK, 120))
        # Surface detail
        for dx in range(fw // 4, fw, fw // 3):
            fd.point((fx_pos + dx, fy_pos + 2), fill=c(FRAG_LIGHT))

    # Distant rift tears in sky
    rift_positions = [(80, 50), (200, 35), (280, 65)]
    for rx_pos, ry_pos in rift_positions:
        rift_h = random.randint(10, 20)
        for ry in range(rift_h):
            sway = random.randint(-1, 1)
            if 0 <= rx_pos + sway < 320 and 0 <= ry_pos + ry < 180:
                alpha = 120 - ry * 5
                if alpha > 0:
                    far.putpixel((rx_pos + sway, ry_pos + ry), c(RIFT_MED, alpha))

    far_out = PARALLAX_DIR / "bg_parallax_void_sanctum_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # -- MID LAYER: closer floating platforms, void energy swirls, crystal formations --
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(187)

    # Void energy swirl banks
    for _ in range(5):
        cx = random.randint(-20, 300)
        cy = random.randint(50, 130)
        cw = random.randint(40, 80)
        ch = random.randint(5, 10)
        md.rectangle([cx, cy, cx + cw, cy + ch], fill=c(VOID_LIGHT, 60))
        md.rectangle([cx + 8, cy + 2, cx + cw - 8, cy + ch - 2], fill=c(VOID_MED, 80))

    # Mid-ground floating platform fragments
    platform_positions = [(30, 125), (140, 110), (260, 130)]
    for px_pos, py_pos in platform_positions:
        pw = random.randint(25, 45)
        ph = random.randint(8, 14)
        # Platform body
        md.rectangle([px_pos, py_pos, px_pos + pw, py_pos + ph], fill=c(FRAG_MED))
        md.rectangle([px_pos + 1, py_pos + 1, px_pos + pw - 1, py_pos + ph - 2], fill=c(FRAG_LIGHT))
        # Teal underside glow
        md.rectangle([px_pos, py_pos + ph, px_pos + pw, py_pos + ph + 2], fill=c(TEAL_DARK, 140))
        # Crystal growing on platform
        crystal_x = px_pos + random.randint(5, pw - 5)
        crystal_h = random.randint(6, 12)
        for cy in range(crystal_h):
            if 0 <= py_pos - cy < 180:
                alpha = 200 - cy * 12
                if alpha > 0:
                    mid.putpixel((crystal_x, py_pos - cy), c(CRYSTAL_MED, alpha))
                    if crystal_x + 1 < 320:
                        mid.putpixel((crystal_x + 1, py_pos - cy), c(CRYSTAL_LIGHT, max(alpha - 40, 0)))
        # Crystal tip glow
        if py_pos - crystal_h >= 0 and crystal_x < 320:
            mid.putpixel((crystal_x, py_pos - crystal_h), c(CRYSTAL_GLOW, 180))

    # Floating void energy wisps
    for _ in range(8):
        wx = random.randint(10, 310)
        wy = random.randint(40, 150)
        wlen = random.randint(8, 20)
        for wi in range(wlen):
            wpx = wx + wi
            wpy = wy + int(3 * math.sin(wi * 0.5))
            if 0 <= wpx < 320 and 0 <= wpy < 180:
                alpha = 140 - wi * 6
                if alpha > 0:
                    mid.putpixel((wpx, wpy), c(TEAL_MED, alpha))

    mid_out = PARALLAX_DIR / "bg_parallax_void_sanctum_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # -- NEAR LAYER: foreground rift particles, void debris, dimensional sparks --
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(188)

    # Foreground void mist at bottom
    for x in range(0, 320, 2):
        h = random.randint(6, 20)
        base_y = 175
        for y in range(base_y - h, base_y):
            if 0 <= y < 180:
                alpha = 120 - int((base_y - y) * 5)
                if alpha > 0:
                    near.putpixel((x, y), c(VOID_LIGHT, min(alpha, 150)))
                    if x + 1 < 320:
                        near.putpixel((x + 1, y), c(VOID_LIGHT, min(alpha, 150)))

    # Bottom void floor
    nd.rectangle([0, 172, 319, 179], fill=c(VOID_MED, 140))

    # Rift spark particles (diagonal drift upward)
    for _ in range(30):
        ax = random.randint(0, 319)
        ay = random.randint(20, 170)
        length = random.randint(3, 7)
        color_choice = random.choice([RIFT_MED, TEAL_BRIGHT, RIFT_BRIGHT])
        for i in range(length):
            px = ax + i
            py = ay - i * 2  # drift upward
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = 150 - i * 20
                if alpha > 0:
                    near.putpixel((px, py), c(color_choice, alpha))

    # Dimensional shimmer particles (floating teal/rift embers)
    for _ in range(25):
        wx = random.randint(0, 319)
        wy = random.randint(10, 155)
        color_choice = random.choice([TEAL_BRIGHT, RIFT_BRIGHT, CRYSTAL_GLOW])
        near.putpixel((wx, wy), c(color_choice, 180))
        if wx + 1 < 320:
            near.putpixel((wx + 1, wy), c(color_choice, 100))

    # Foreground floating void fragments (small debris)
    for fx in range(15, 320, 65):
        fy = random.randint(12, 50)
        fw = random.randint(5, 12)
        fh = random.randint(2, 4)
        nd.rectangle([fx, fy, fx + fw, fy + fh], fill=c(FRAG_MED, 70))
        nd.point((fx + fw // 2, fy), fill=c(FRAG_LIGHT, 90))

    near_out = PARALLAX_DIR / "bg_parallax_void_sanctum_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# =========================================================================
# MAIN
# =========================================================================

def main():
    print("Generating Void Sanctum zone assets (PIX-186)...")
    print()

    print("[1/8] Rift Walker enemy sprite sheet")
    generate_rift_walker()
    print()

    print("[2/8] Void Sentinel enemy sprite sheet")
    generate_void_sentinel()
    print()

    print("[3/8] Shadow Weaver enemy sprite sheet")
    generate_shadow_weaver()
    print()

    print("[4/8] Void Architect boss sprites (idle, attack, phases 1-3)")
    generate_void_architect()
    print()

    print("[5/8] Dimensional Scholar NPC sprite")
    generate_dimensional_scholar()
    print()

    print("[6/8] Void Sanctum tileset (256x64)")
    generate_tileset()
    print()

    print("[7/8] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[8/8] Done! All Void Sanctum zone assets generated.")


if __name__ == "__main__":
    main()
