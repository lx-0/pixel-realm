#!/usr/bin/env python3
"""
Generate Eclipsed Throne zone art assets for PixelRealm (PIX-190).
Produces:
  - 3 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Eclipsed Throne color language: dark corrupted gold, deep crimson eclipse,
royal purple shadows, shattered stained-glass accents — an ancient citadel
where a once-glorious throne room is consumed by eclipse energy.
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

# -- Eclipsed Throne Color Palette ------------------------------------------
# All colors from the 32-color master palette

# Eclipse / dark sky tones
ECLIPSE_BLACK   = (10, 6, 8, 255)          # #0a0608 -- deepest eclipse
ECLIPSE_DARK    = (25, 12, 18, 255)        # #190c12 -- dark eclipse
ECLIPSE_MED     = (60, 20, 35, 255)        # #3c1423 -- eclipse crimson
ECLIPSE_LIGHT   = (100, 30, 50, 255)       # #641e32 -- lighter eclipse
ECLIPSE_GLOW    = (180, 60, 80, 255)       # #b43c50 -- eclipse glow

# Corrupted gold / royal tones
GOLD_DEEP       = (50, 35, 10, 255)        # #32230a -- deep tarnished gold
GOLD_DARK       = (100, 70, 15, 255)       # #64460f -- dark gold
GOLD_MED        = (168, 120, 40, 255)      # #a87828 -- corrupted gold
GOLD_BRIGHT     = (220, 170, 50, 255)      # #dcaa32 -- bright gold
GOLD_GLOW       = (255, 220, 100, 255)     # #ffdc64 -- gold-white glow

# Royal purple (corrupted regality)
ROYAL_DEEP      = (20, 8, 35, 255)         # #140823 -- deep royal
ROYAL_DARK      = (45, 18, 70, 255)        # #2d1246 -- dark royal purple
ROYAL_MED       = (80, 35, 120, 255)       # #502378 -- royal purple
ROYAL_BRIGHT    = (130, 70, 180, 255)      # #8246b4 -- bright royal
ROYAL_GLOW      = (200, 150, 240, 255)     # #c896f0 -- royal glow

# Neutrals
WHITE           = (240, 238, 230, 255)
BLACK           = (8, 6, 10, 255)
STONE_DARK      = (35, 28, 25, 255)
STONE_MED       = (60, 50, 45, 255)
STONE_LIGHT     = (90, 78, 70, 255)

# Throne room stone / architecture
ARCH_DARK       = (40, 32, 30, 255)        # #28201e
ARCH_MED        = (70, 58, 52, 255)        # #463a34
ARCH_LIGHT      = (100, 86, 76, 255)       # #64564c
ARCH_EDGE       = (130, 115, 105, 255)     # #827369

# Sky / atmosphere
SKY_ECLIPSE     = (15, 6, 10, 255)         # #0f060a -- eclipse sky
SKY_DEEP        = (25, 10, 16, 255)        # #190a10
SKY_GLOW        = (60, 20, 30, 255)        # #3c141e -- horizon glow

# Stained glass shards (accent colors)
GLASS_RED       = (200, 50, 40, 255)
GLASS_BLUE      = (50, 100, 200, 255)
GLASS_GREEN     = (50, 160, 80, 255)
GLASS_AMBER     = (220, 160, 40, 255)

OUTLINE         = (6, 4, 6, 255)
TRANSPARENT     = (0, 0, 0, 0)

# -- Creature-specific palettes -------------------------------------------

# Eclipse Knight -- armored warrior wreathed in dark energy
KNIGHT_ARMOR     = ARCH_MED
KNIGHT_ARMOR_L   = ARCH_LIGHT
KNIGHT_ARMOR_D   = ARCH_DARK
KNIGHT_TRIM      = GOLD_MED
KNIGHT_EYE       = ECLIPSE_GLOW
KNIGHT_VISOR     = ECLIPSE_DARK
KNIGHT_WEAPON    = STONE_LIGHT
KNIGHT_WEAPON_L  = GOLD_BRIGHT
KNIGHT_GLOW      = ECLIPSE_GLOW
KNIGHT_CAPE      = ROYAL_DARK
KNIGHT_CAPE_L    = ROYAL_MED
KNIGHT_PLUME     = ECLIPSE_LIGHT

# Shadow Herald -- floating caster projecting eclipse beams
HERALD_BODY      = (30, 12, 20, 200)       # semi-transparent dark form
HERALD_BODY_D    = (18, 6, 14, 220)
HERALD_ROBE      = ROYAL_DARK
HERALD_ROBE_L    = ROYAL_MED
HERALD_EYE       = GOLD_GLOW
HERALD_EYE_GLOW  = GOLD_BRIGHT
HERALD_MAGIC     = ECLIPSE_GLOW
HERALD_MAGIC_B   = ECLIPSE_LIGHT
HERALD_HANDS     = (120, 80, 140, 180)
HERALD_HOOD      = ECLIPSE_BLACK
HERALD_ORB       = ECLIPSE_GLOW

# Dusk Wraith -- fast ghostly assassin trailing shadow particles
WRAITH_BODY      = (25, 15, 30, 160)       # ghostly semi-transparent
WRAITH_BODY_D    = (15, 8, 20, 180)
WRAITH_CLOAK     = ECLIPSE_DARK
WRAITH_CLOAK_L   = ECLIPSE_MED
WRAITH_EYE       = ECLIPSE_GLOW
WRAITH_BLADE     = GOLD_MED
WRAITH_BLADE_L   = GOLD_BRIGHT
WRAITH_TRAIL     = (40, 15, 25, 100)       # fading shadow trail
WRAITH_TRAIL_L   = (60, 20, 35, 60)

# The Eclipsed King boss
KING_BODY        = ROYAL_MED
KING_BODY_D      = ROYAL_DARK
KING_ARMOR       = ARCH_LIGHT
KING_ARMOR_D     = ARCH_MED
KING_EYE         = ECLIPSE_GLOW
KING_ECLIPSE     = ECLIPSE_GLOW
KING_GOLD        = GOLD_BRIGHT
KING_GLOW        = GOLD_GLOW
KING_CROWN       = GOLD_MED
KING_CROWN_G     = GOLD_GLOW
KING_CAPE        = ROYAL_DARK
KING_CAPE_L      = ROYAL_MED
KING_WEAPON      = GOLD_MED
KING_MAGIC       = ECLIPSE_GLOW

# NPC: Twilight Oracle
ORACLE_ROBE      = (55, 30, 60, 255)
ORACLE_ROBE_L    = (75, 45, 80, 255)
ORACLE_SKIN      = (175, 160, 150, 255)
ORACLE_SKIN_D    = (145, 130, 120, 255)
ORACLE_HAIR      = (90, 70, 100, 255)
ORACLE_STAFF     = GOLD_MED
ORACLE_STAFF_ORB = ECLIPSE_GLOW
ORACLE_TRIM      = GOLD_DARK
ORACLE_BELT      = ARCH_DARK
ORACLE_EYES      = ECLIPSE_GLOW
ORACLE_HOOD      = ROYAL_DARK

# Tileset colors
TILE_ARCH      = ARCH_MED
TILE_ARCH_D    = ARCH_DARK
TILE_ARCH_L    = ARCH_LIGHT
TILE_ARCH_E    = ARCH_EDGE
TILE_GOLD      = GOLD_MED
TILE_GOLD_D    = GOLD_DARK
TILE_GOLD_B    = GOLD_BRIGHT
TILE_ECLIPSE   = ECLIPSE_MED
TILE_ECLIPSE_D = ECLIPSE_DARK
TILE_ECLIPSE_L = ECLIPSE_LIGHT
TILE_STONE     = STONE_MED
TILE_STONE_D   = STONE_DARK
TILE_STONE_L   = STONE_LIGHT
TILE_ROYAL     = ROYAL_MED
TILE_ROYAL_D   = ROYAL_DARK


def ensure_dir(path):
    os.makedirs(os.path.dirname(path) if isinstance(path, str) else path.parent, exist_ok=True)


def save_asset(img, rel_path):
    full_path = ASSET_ROOT / rel_path if isinstance(rel_path, str) else rel_path
    ensure_dir(full_path)
    img.save(str(full_path))
    print(f"  Created: {full_path.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# ENEMY 1: ECLIPSE KNIGHT -- armored warrior, 16x16, 8 frames
# Frames 0-3: walk/patrol, Frames 4-7: attack (sword slash with eclipse energy)
# =========================================================================

def draw_eclipse_knight(draw, ox, oy, frame):
    """Draw a single 16x16 Eclipse Knight frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, 0, -1, 0][anim]
    stride = [0, 1, 0, -1][anim]

    # Heavy legs (armored)
    draw.rectangle([ox + 4, oy + 12 + bob, ox + 6, oy + 14], fill=KNIGHT_ARMOR_D)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 11, oy + 14], fill=KNIGHT_ARMOR_D)
    # Armored boots
    draw.rectangle([ox + 4 + stride, oy + 14, ox + 6 + stride, oy + 15], fill=KNIGHT_ARMOR)
    draw.rectangle([ox + 9 - stride, oy + 14, ox + 11 - stride, oy + 15], fill=KNIGHT_ARMOR)

    # Torso (plate armor with gold trim)
    draw.rectangle([ox + 4, oy + 6 + bob, ox + 11, oy + 12 + bob], fill=KNIGHT_ARMOR)
    draw.rectangle([ox + 5, oy + 7 + bob, ox + 10, oy + 11 + bob], fill=KNIGHT_ARMOR_L)
    # Gold trim lines on chest plate
    draw.point((ox + 7, oy + 8 + bob), fill=KNIGHT_TRIM)
    draw.point((ox + 8, oy + 8 + bob), fill=KNIGHT_TRIM)
    draw.point((ox + 7, oy + 10 + bob), fill=KNIGHT_TRIM)
    draw.point((ox + 8, oy + 10 + bob), fill=KNIGHT_TRIM)
    # Shoulder pauldrons
    draw.rectangle([ox + 3, oy + 6 + bob, ox + 4, oy + 8 + bob], fill=KNIGHT_ARMOR_L)
    draw.rectangle([ox + 11, oy + 6 + bob, ox + 12, oy + 8 + bob], fill=KNIGHT_ARMOR_L)
    # Gold trim on pauldrons
    draw.point((ox + 3, oy + 6 + bob), fill=KNIGHT_TRIM)
    draw.point((ox + 12, oy + 6 + bob), fill=KNIGHT_TRIM)

    # Cape (behind body)
    draw.point((ox + 5, oy + 12 + bob), fill=KNIGHT_CAPE)
    draw.point((ox + 10, oy + 12 + bob), fill=KNIGHT_CAPE)

    # Helm (enclosed visor with plume)
    draw.rectangle([ox + 5, oy + 2 + bob, ox + 10, oy + 6 + bob], fill=KNIGHT_ARMOR)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 5 + bob], fill=KNIGHT_VISOR)
    # Glowing visor slit (eclipse red)
    draw.rectangle([ox + 6, oy + 4 + bob, ox + 9, oy + 4 + bob], fill=KNIGHT_EYE)
    # Helm crest / plume
    draw.point((ox + 7, oy + 1 + bob), fill=KNIGHT_PLUME)
    draw.point((ox + 8, oy + 1 + bob), fill=KNIGHT_TRIM)

    # Arms + eclipse sword
    if is_attack:
        thrust = [0, 2, 4, 2][anim]
        # Right arm thrusting with sword
        draw.rectangle([ox + 11, oy + 7 + bob, ox + 12, oy + 10 + bob], fill=KNIGHT_ARMOR)
        # Sword extending with eclipse energy
        for lx in range(thrust + 2):
            draw.point((ox + 13 + lx, oy + 8 + bob), fill=KNIGHT_WEAPON)
        if thrust > 0:
            draw.point((ox + 13 + thrust + 1, oy + 8 + bob), fill=KNIGHT_WEAPON_L)
            draw.point((ox + 13 + thrust + 1, oy + 7 + bob), fill=KNIGHT_GLOW)
        # Left arm with shield
        draw.rectangle([ox + 2, oy + 7 + bob, ox + 4, oy + 11 + bob], fill=KNIGHT_ARMOR_L)
        draw.point((ox + 3, oy + 9 + bob), fill=KNIGHT_TRIM)
    else:
        # Arms at sides with sword resting
        draw.rectangle([ox + 3, oy + 8 + bob, ox + 4, oy + 12 + bob], fill=KNIGHT_ARMOR)
        draw.rectangle([ox + 11, oy + 8 + bob, ox + 12, oy + 12 + bob], fill=KNIGHT_ARMOR)
        # Sword held vertically
        draw.rectangle([ox + 13, oy + 3 + bob, ox + 13, oy + 14 + bob], fill=KNIGHT_WEAPON)
        draw.point((ox + 13, oy + 2 + bob), fill=KNIGHT_WEAPON_L)


def generate_eclipse_knight():
    """Generate 8-frame Eclipse Knight sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_eclipse_knight(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_eclipse_knight.png")
    return img


# =========================================================================
# ENEMY 2: SHADOW HERALD -- floating eclipse caster, 16x16, 8 frames
# Frames 0-3: hover/float, Frames 4-7: attack (eclipse beam)
# =========================================================================

def draw_shadow_herald(draw, ox, oy, frame):
    """Draw a single 16x16 Shadow Herald frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [0, -1, -2, -1][anim]

    # Tattered robe bottom (no visible feet -- floats)
    draw.rectangle([ox + 5, oy + 12 + float_y, ox + 10, oy + 15], fill=HERALD_ROBE)
    # Robe wisps trailing below
    draw.point((ox + 4, oy + 14 + float_y), fill=HERALD_BODY)
    draw.point((ox + 11, oy + 14 + float_y), fill=HERALD_BODY)
    draw.point((ox + 6, oy + 15), fill=HERALD_BODY_D)

    # Torso / upper robe
    draw.rectangle([ox + 5, oy + 7 + float_y, ox + 10, oy + 12 + float_y], fill=HERALD_ROBE)
    draw.rectangle([ox + 6, oy + 8 + float_y, ox + 9, oy + 11 + float_y], fill=HERALD_ROBE_L)
    # Eclipse sigil across chest
    draw.point((ox + 7, oy + 9 + float_y), fill=ECLIPSE_DARK)
    draw.point((ox + 8, oy + 10 + float_y), fill=ECLIPSE_DARK)

    # Hood / head (deep shadow with glowing gold eyes)
    draw.rectangle([ox + 5, oy + 3 + float_y, ox + 10, oy + 7 + float_y], fill=HERALD_HOOD)
    draw.rectangle([ox + 6, oy + 4 + float_y, ox + 9, oy + 6 + float_y], fill=HERALD_ROBE)
    # Glowing eclipse-marked eyes
    draw.point((ox + 7, oy + 5 + float_y), fill=HERALD_EYE)
    draw.point((ox + 9, oy + 5 + float_y), fill=HERALD_EYE)
    # Eye glow aura
    draw.point((ox + 6, oy + 5 + float_y), fill=HERALD_EYE_GLOW)
    # Hood peak
    draw.point((ox + 7, oy + 2 + float_y), fill=HERALD_HOOD)
    draw.point((ox + 8, oy + 2 + float_y), fill=HERALD_HOOD)

    # Floating eclipse orb above head
    draw.point((ox + 8, oy + 1 + float_y), fill=HERALD_ORB)

    # Arms and magic
    if is_attack:
        beam_ext = [0, 2, 4, 2][anim]
        # Arms outstretched channeling eclipse beam
        draw.rectangle([ox + 2, oy + 8 + float_y, ox + 5, oy + 9 + float_y], fill=HERALD_ROBE)
        draw.point((ox + 2, oy + 8 + float_y), fill=HERALD_HANDS)
        draw.rectangle([ox + 10, oy + 8 + float_y, ox + 13, oy + 9 + float_y], fill=HERALD_ROBE)
        draw.point((ox + 13, oy + 8 + float_y), fill=HERALD_HANDS)
        # Eclipse beam projectile
        if beam_ext > 0:
            for bx in range(beam_ext):
                draw.point((ox + 14 + bx, oy + 8 + float_y), fill=HERALD_MAGIC)
                if bx > 0:
                    draw.point((ox + 14 + bx, oy + 7 + float_y), fill=HERALD_MAGIC_B)
                    draw.point((ox + 14 + bx, oy + 9 + float_y), fill=HERALD_MAGIC_B)
            if beam_ext >= 3:
                draw.point((ox + 14 + beam_ext, oy + 8 + float_y), fill=GOLD_GLOW)
    else:
        # Arms at sides, gathering eclipse energy
        draw.rectangle([ox + 3, oy + 8 + float_y, ox + 5, oy + 11 + float_y], fill=HERALD_ROBE)
        draw.rectangle([ox + 10, oy + 8 + float_y, ox + 12, oy + 11 + float_y], fill=HERALD_ROBE)
        # Hands with faint glow
        draw.point((ox + 3, oy + 11 + float_y), fill=HERALD_HANDS)
        draw.point((ox + 12, oy + 11 + float_y), fill=HERALD_HANDS)
        # Ambient eclipse particles
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 3 + sway, oy + 12 + float_y), fill=HERALD_MAGIC)
        draw.point((ox + 12 - sway, oy + 12 + float_y), fill=HERALD_MAGIC)

    # Shadow wisps trailing (floating effect)
    wisp_sway = [0, 1, 0, -1][anim]
    draw.point((ox + 7 + wisp_sway, oy + 15), fill=HERALD_BODY)
    draw.point((ox + 9 - wisp_sway, oy + 15), fill=HERALD_BODY_D)


def generate_shadow_herald():
    """Generate 8-frame Shadow Herald sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_shadow_herald(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_shadow_herald.png")
    return img


# =========================================================================
# ENEMY 3: DUSK WRAITH -- fast ghostly assassin, 16x16, 8 frames
# Frames 0-3: glide/phase, Frames 4-7: attack (shadow blade dash)
# =========================================================================

def draw_dusk_wraith(draw, ox, oy, frame):
    """Draw a single 16x16 Dusk Wraith frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, -1, 0, -1][anim]
    phase_offset = [0, 1, 2, 1][anim]

    # Ghostly lower body (wisping away, no real legs)
    draw.rectangle([ox + 6, oy + 12 + bob, ox + 10, oy + 15], fill=WRAITH_CLOAK)
    draw.point((ox + 5, oy + 14 + bob), fill=WRAITH_TRAIL)
    draw.point((ox + 11, oy + 14 + bob), fill=WRAITH_TRAIL)
    # Trailing shadow particles
    draw.point((ox + 7, oy + 15), fill=WRAITH_TRAIL_L)
    draw.point((ox + 9, oy + 15), fill=WRAITH_TRAIL_L)

    # Cloak / torso
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 11, oy + 12 + bob], fill=WRAITH_CLOAK)
    draw.rectangle([ox + 5, oy + 8 + bob, ox + 10, oy + 11 + bob], fill=WRAITH_CLOAK_L)
    # Shadow energy lines on cloak
    draw.point((ox + 6, oy + 9 + bob), fill=ECLIPSE_DARK)
    draw.point((ox + 9, oy + 9 + bob), fill=ECLIPSE_DARK)

    # Shadow trail echo (ghostly duplicate offset)
    if phase_offset > 0:
        draw.point((ox + 3 - phase_offset, oy + 9 + bob), fill=WRAITH_TRAIL)
        draw.point((ox + 3 - phase_offset, oy + 10 + bob), fill=WRAITH_TRAIL_L)

    # Head (hooded, spectral)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 10, oy + 7 + bob], fill=WRAITH_CLOAK)
    draw.rectangle([ox + 7, oy + 4 + bob, ox + 9, oy + 6 + bob], fill=WRAITH_BODY_D)
    # Glowing eclipse eyes
    draw.point((ox + 7, oy + 5 + bob), fill=WRAITH_EYE)
    draw.point((ox + 9, oy + 5 + bob), fill=WRAITH_EYE)
    # Hood peak
    draw.point((ox + 8, oy + 2 + bob), fill=WRAITH_CLOAK)

    # Arms + shadow blades
    if is_attack:
        slash_arc = [0, 2, 3, 1][anim]
        # Right arm raised with shadow blade
        draw.rectangle([ox + 11, oy + 6 + bob - slash_arc, ox + 12, oy + 9 + bob], fill=WRAITH_CLOAK_L)
        # Shadow blade (gold energy edge)
        for sx in range(slash_arc + 2):
            draw.point((ox + 12 + sx, oy + 6 + bob - slash_arc + sx), fill=WRAITH_BLADE)
        draw.point((ox + 12 + slash_arc + 1, oy + 6 + bob), fill=WRAITH_BLADE_L)
        # Left arm forward
        draw.rectangle([ox + 3, oy + 8 + bob, ox + 4, oy + 11 + bob], fill=WRAITH_CLOAK)
    else:
        # Arms at sides, trailing shadow
        draw.rectangle([ox + 3, oy + 8 + bob, ox + 4, oy + 12 + bob], fill=WRAITH_CLOAK)
        draw.rectangle([ox + 11, oy + 8 + bob, ox + 12, oy + 12 + bob], fill=WRAITH_CLOAK)
        # Blade held at side
        draw.rectangle([ox + 12, oy + 5 + bob, ox + 12, oy + 13 + bob], fill=WRAITH_BLADE)
        draw.point((ox + 12, oy + 4 + bob), fill=WRAITH_BLADE_L)


def generate_dusk_wraith():
    """Generate 8-frame Dusk Wraith sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_dusk_wraith(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_dusk_wraith.png")
    return img


# =========================================================================
# BOSS: THE ECLIPSED KING -- corrupted monarch, 32x32, multi-phase
# idle (1 frame), attack (4 frames), phase1/2/3 (1 frame each)
# =========================================================================

def draw_eclipsed_king(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw the Eclipsed King boss at 32x32."""
    anim = frame % 4
    breath = [0, -1, 0, 1][anim]

    # Phase color shifts
    body = KING_BODY
    armor = KING_ARMOR
    eye = KING_EYE
    eclipse = KING_ECLIPSE
    gold = KING_GOLD
    glow = KING_GLOW
    crown = KING_CROWN
    magic = KING_MAGIC
    if phase == 2:
        body = (100, 40, 60, 255)          # deeper eclipse-infused
        armor = (120, 100, 90, 255)
        eye = GOLD_GLOW
        eclipse = GOLD_GLOW
        gold = GOLD_GLOW
        glow = (255, 240, 140, 255)
        crown = GOLD_BRIGHT
    elif phase == 3:
        body = (80, 15, 30, 255)           # full eclipse corruption
        armor = (110, 80, 70, 255)
        eye = ECLIPSE_GLOW
        eclipse = (220, 80, 100, 255)
        magic = ECLIPSE_GLOW
        glow = (255, 120, 140, 255)
        crown = (200, 140, 50, 255)

    outline = OUTLINE

    # Legs -- tall, armored
    draw.rectangle([ox + 9, oy + 22 + breath, ox + 13, oy + 27], fill=body)
    draw.rectangle([ox + 18, oy + 22 + breath, ox + 22, oy + 27], fill=body)
    # Armored boots
    draw.rectangle([ox + 8, oy + 27, ox + 14, oy + 30], fill=armor)
    draw.rectangle([ox + 17, oy + 27, ox + 23, oy + 30], fill=armor)
    # Boot gold trim
    draw.point((ox + 10, oy + 28), fill=gold)
    draw.point((ox + 20, oy + 28), fill=gold)

    # Robed torso with royal armor plates
    draw.rectangle([ox + 8, oy + 12 + breath, ox + 23, oy + 22 + breath], fill=KING_CAPE)
    draw.rectangle([ox + 9, oy + 13 + breath, ox + 22, oy + 21 + breath], fill=KING_CAPE_L)
    # Chest armor plate
    draw.rectangle([ox + 11, oy + 14 + breath, ox + 20, oy + 20 + breath], fill=armor)
    draw.rectangle([ox + 12, oy + 15 + breath, ox + 19, oy + 19 + breath], fill=KING_ARMOR_D)
    # Eclipse core in chest (corrupted heart)
    draw.rectangle([ox + 14, oy + 16 + breath, ox + 17, oy + 18 + breath], fill=eclipse)
    draw.point((ox + 15, oy + 17 + breath), fill=glow)
    draw.point((ox + 16, oy + 17 + breath), fill=glow)
    # Gold trim veins on armor
    draw.point((ox + 12, oy + 15 + breath), fill=gold)
    draw.point((ox + 19, oy + 15 + breath), fill=gold)
    draw.point((ox + 12, oy + 19 + breath), fill=gold)
    draw.point((ox + 19, oy + 19 + breath), fill=gold)

    # Shoulder plates (large, regal)
    draw.rectangle([ox + 4, oy + 10 + breath, ox + 9, oy + 14 + breath], fill=armor)
    draw.point((ox + 5, oy + 10 + breath), fill=gold)
    draw.rectangle([ox + 22, oy + 10 + breath, ox + 27, oy + 14 + breath], fill=armor)
    draw.point((ox + 26, oy + 10 + breath), fill=gold)

    # Cape (flowing behind)
    cape_wave = [0, 1, 2, 1][anim]
    draw.rectangle([ox + 10, oy + 20 + breath, ox + 21, oy + 24 + breath + cape_wave], fill=KING_CAPE)
    draw.point((ox + 11, oy + 24 + breath + cape_wave), fill=KING_CAPE_L)
    draw.point((ox + 20, oy + 24 + breath + cape_wave), fill=KING_CAPE_L)

    # Head (regal, crowned)
    draw.rectangle([ox + 11, oy + 5 + breath, ox + 20, oy + 12 + breath], fill=body)
    draw.rectangle([ox + 12, oy + 6 + breath, ox + 19, oy + 11 + breath], fill=KING_BODY_D)
    # Face plate / royal mask
    draw.rectangle([ox + 13, oy + 7 + breath, ox + 18, oy + 10 + breath], fill=armor)
    # Glowing eyes
    draw.rectangle([ox + 13, oy + 8 + breath, ox + 14, oy + 9 + breath], fill=outline)
    draw.point((ox + 13, oy + 8 + breath), fill=eye)
    draw.rectangle([ox + 17, oy + 8 + breath, ox + 18, oy + 9 + breath], fill=outline)
    draw.point((ox + 18, oy + 8 + breath), fill=eye)

    # Corrupted crown (eclipse-infused gold)
    draw.rectangle([ox + 12, oy + 4 + breath, ox + 19, oy + 5 + breath], fill=crown)
    draw.point((ox + 14, oy + 3 + breath), fill=crown)
    draw.point((ox + 15, oy + 2 + breath), fill=KING_CROWN_G)
    draw.point((ox + 16, oy + 2 + breath), fill=KING_CROWN_G)
    draw.point((ox + 17, oy + 3 + breath), fill=crown)
    # Crown center gem (eclipse-corrupted)
    draw.point((ox + 15, oy + 3 + breath), fill=eclipse)
    draw.point((ox + 16, oy + 3 + breath), fill=eclipse)

    # Arms
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        attack_ext = [0, 2, 4, 2][anim]
        # Arms raised, channeling eclipse power
        draw.rectangle([ox + 4, oy + 12 + breath - attack_ext, ox + 8, oy + 18 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 12 + breath - attack_ext, ox + 27, oy + 18 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 12 + breath - attack_ext, ox + 5, oy + 13 + breath - attack_ext], fill=armor)
        draw.rectangle([ox + 26, oy + 12 + breath - attack_ext, ox + 28, oy + 13 + breath - attack_ext], fill=armor)
        # Eclipse energy between hands
        if attack_ext >= 2:
            for rx in range(6, 26, 2):
                ry = 11 + breath - attack_ext + random.randint(-1, 1)
                if 0 <= oy + ry < 32:
                    draw.point((ox + rx, oy + ry), fill=eclipse)
            # Central eclipse flare
            draw.rectangle([ox + 13, oy + 10 + breath - attack_ext, ox + 18, oy + 12 + breath - attack_ext], fill=magic)
            draw.point((ox + 15, oy + 11 + breath - attack_ext), fill=glow)
            draw.point((ox + 16, oy + 11 + breath - attack_ext), fill=glow)
        # Ground shockwave
        if attack_ext >= 3:
            for gx in range(3, 29, 3):
                draw.point((ox + gx, oy + 30), fill=eclipse)
                draw.point((ox + gx, oy + 31), fill=ECLIPSE_DARK)
    else:
        # Idle arms with scepter
        draw.rectangle([ox + 4, oy + 14 + breath + arm_wave, ox + 8, oy + 21 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 14 + breath + arm_wave, ox + 27, oy + 21 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 20 + breath + arm_wave, ox + 7, oy + 22 + breath], fill=armor)
        draw.rectangle([ox + 24, oy + 20 + breath + arm_wave, ox + 28, oy + 22 + breath], fill=armor)
        # Royal scepter in right hand
        draw.rectangle([ox + 28, oy + 8 + breath, ox + 28, oy + 22 + breath], fill=KING_WEAPON)
        draw.point((ox + 28, oy + 7 + breath), fill=gold)
        draw.point((ox + 28, oy + 6 + breath), fill=glow)

    # Eclipse aura (dark energy fragments orbiting)
    if phase >= 2:
        aura_pos = [(3, 6), (28, 8), (5, 4), (26, 5), (15, 1)]
        for i, (ax, ay) in enumerate(aura_pos):
            if (anim + i) % 3 == 0:
                draw.point((ox + ax, oy + ay + breath), fill=eclipse)

    if phase == 3:
        # Eclipse fracture lines radiating from boss
        for tx in range(2, 30, 3):
            ty = 28 + (anim + tx) % 4
            if ty < 32:
                draw.point((ox + tx, oy + ty), fill=magic)
        # Crown blazing with eclipse energy
        draw.point((ox + 14, oy + 2 + breath), fill=magic)
        draw.point((ox + 15, oy + 1 + breath), fill=eclipse)
        draw.point((ox + 16, oy + 1 + breath), fill=eclipse)
        draw.point((ox + 17, oy + 2 + breath), fill=magic)


def generate_eclipsed_king():
    """Generate all Eclipsed King boss sprite sheets."""
    random.seed(190)

    # Idle
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_eclipsed_king(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_eclipsed_king_idle.png")

    # Attack -- 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        random.seed(190 + f)
        draw_eclipsed_king(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_eclipsed_king_attack.png")

    # Phase 1
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_eclipsed_king(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_eclipsed_king_phase1.png")

    # Phase 2 -- eclipse surge
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_eclipsed_king(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_eclipsed_king_phase2.png")

    # Phase 3 -- full eclipse corruption
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_eclipsed_king(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_eclipsed_king_phase3.png")


# =========================================================================
# NPC: TWILIGHT ORACLE -- zone quest giver, 16x24
# Hooded seer with glowing eclipse-marked eyes
# =========================================================================

def draw_twilight_oracle(draw, ox, oy):
    """Draw the Twilight Oracle NPC at 16x24."""
    # Feet / boots (worn traveler boots)
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=ARCH_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=ARCH_DARK)

    # Robe (long, with eclipse shimmer)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=ORACLE_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=ORACLE_ROBE_L)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=ORACLE_ROBE)
    # Gold trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=ORACLE_TRIM)

    # Belt with eclipse clasp
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=ORACLE_BELT)
    # Eclipse pendant
    draw.point((ox + 8, oy + 15), fill=ECLIPSE_GLOW)
    draw.point((ox + 8, oy + 16), fill=GOLD_MED)

    # Arms (in robe sleeves)
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=ORACLE_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=ORACLE_ROBE)
    # Gold cuffs
    draw.point((ox + 2, oy + 16), fill=ORACLE_TRIM)
    draw.point((ox + 14, oy + 16), fill=ORACLE_TRIM)
    # Hands
    draw.point((ox + 2, oy + 17), fill=ORACLE_SKIN)
    draw.point((ox + 14, oy + 17), fill=ORACLE_SKIN)

    # Prophecy scroll (held in left hand)
    draw.rectangle([ox + 1, oy + 15, ox + 3, oy + 18], fill=STONE_LIGHT)
    draw.point((ox + 2, oy + 16), fill=GOLD_DARK)
    # Parchment edge
    draw.rectangle([ox + 1, oy + 16, ox + 1, oy + 17], fill=WHITE)

    # Staff (right hand -- golden staff with eclipse orb)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=ORACLE_STAFF)
    # Eclipse orb at top of staff
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=GOLD_DARK)
    draw.point((ox + 14, oy + 1), fill=ORACLE_STAFF_ORB)
    draw.point((ox + 14, oy + 2), fill=ECLIPSE_GLOW)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=ORACLE_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=ORACLE_SKIN)

    # Hood (deep, shadowed)
    draw.rectangle([ox + 4, oy + 2, ox + 12, oy + 5], fill=ORACLE_HOOD)
    draw.point((ox + 4, oy + 5), fill=ORACLE_HOOD)
    draw.point((ox + 4, oy + 6), fill=ORACLE_HOOD)
    draw.point((ox + 12, oy + 5), fill=ORACLE_HOOD)
    draw.point((ox + 12, oy + 6), fill=ORACLE_HOOD)

    # Eclipse-marked eyes (glowing under the hood)
    draw.point((ox + 6, oy + 6), fill=ORACLE_EYES)
    draw.point((ox + 10, oy + 6), fill=ORACLE_EYES)
    # Third eye mark on forehead
    draw.point((ox + 8, oy + 5), fill=ECLIPSE_GLOW)

    # Eclipse circlet under hood
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 4], fill=GOLD_MED)
    draw.point((ox + 8, oy + 3), fill=ECLIPSE_GLOW)


def generate_twilight_oracle():
    """Generate Twilight Oracle NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_twilight_oracle(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_eclipsed_throne.png")
    return img


# =========================================================================
# TILESET -- tileset_eclipsed_throne.png (256x64, 16 cols x 4 rows)
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

def tile_dark_stone_floor(tile):
    """Dark stone floor of the throne room."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ARCH)
    # Subtle stone texture
    for x in range(0, 16, 3):
        for y in range(0, 16, 4):
            d.point((x + 1, y + 2), fill=TILE_ARCH_D)


def tile_cracked_throne_floor(tile):
    """Eclipse-cracked throne room floor."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ARCH)
    # Eclipse energy cracks
    d.line([(2, 3), (6, 8)], fill=TILE_ECLIPSE_D, width=1)
    d.line([(10, 1), (8, 7)], fill=TILE_ECLIPSE_D, width=1)
    d.line([(5, 10), (12, 14)], fill=TILE_ECLIPSE_D, width=1)
    # Eclipse glow in cracks
    d.point((4, 5), fill=TILE_ECLIPSE)
    d.point((9, 4), fill=TILE_ECLIPSE)


def tile_throne_pillar(tile):
    """Corrupted throne room pillar."""
    d = ImageDraw.Draw(tile)
    # Pillar body
    d.rectangle([4, 0, 11, 15], fill=TILE_ARCH)
    d.rectangle([5, 0, 10, 15], fill=TILE_ARCH_L)
    # Gold trim bands
    d.rectangle([4, 3, 11, 3], fill=TILE_GOLD)
    d.rectangle([4, 12, 11, 12], fill=TILE_GOLD)
    # Eclipse corruption veins
    d.point((6, 7), fill=TILE_ECLIPSE)
    d.point((9, 9), fill=TILE_ECLIPSE_D)


def tile_eclipse_stained_wall(tile):
    """Eclipse-stained wall block."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ARCH)
    d.rectangle([1, 1, 14, 14], fill=TILE_ARCH_D)
    # Eclipse energy stains
    d.point((4, 4), fill=TILE_ECLIPSE_D)
    d.point((11, 7), fill=TILE_ECLIPSE_D)
    d.point((7, 12), fill=TILE_ECLIPSE_D)
    d.point((3, 9), fill=TILE_ECLIPSE_D)


def tile_wall_top(tile):
    """Top of throne room wall."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 6, 15, 15], fill=TILE_ARCH)
    d.rectangle([1, 7, 14, 14], fill=TILE_ARCH_D)
    # Crumbling edge
    d.point((3, 5), fill=TILE_ARCH)
    d.point((7, 4), fill=TILE_ARCH)
    d.point((11, 5), fill=TILE_ARCH_D)
    # Gold trim at top
    d.rectangle([0, 6, 15, 6], fill=TILE_GOLD_D)


def tile_shattered_stained_glass(tile):
    """Shattered stained glass fragments."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ARCH_D)
    # Scattered colored glass shards
    d.rectangle([2, 3, 4, 5], fill=c(GLASS_RED))
    d.rectangle([7, 1, 9, 3], fill=c(GLASS_BLUE))
    d.rectangle([11, 6, 13, 8], fill=c(GLASS_GREEN))
    d.rectangle([4, 10, 6, 12], fill=c(GLASS_AMBER))
    d.point((9, 9), fill=c(GLASS_RED))
    d.point((1, 13), fill=c(GLASS_BLUE))
    # Gold lead lines between glass
    d.point((5, 4), fill=TILE_GOLD_D)
    d.point((10, 2), fill=TILE_GOLD_D)
    d.point((7, 8), fill=TILE_GOLD_D)


def tile_shadow_pool(tile):
    """Dark shadow pool on floor."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ARCH)
    # Shadow pool (dark circular area)
    d.ellipse([3, 4, 13, 12], fill=TILE_ECLIPSE_D)
    d.ellipse([5, 6, 11, 10], fill=ECLIPSE_BLACK)
    # Eclipse glow at center
    d.point((8, 8), fill=TILE_ECLIPSE)
    d.point((7, 7), fill=TILE_ECLIPSE_D)


def tile_eclipse_portal_fragment(tile):
    """Fragment of an eclipse portal."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ARCH)
    # Portal arc fragment
    d.rectangle([6, 2, 9, 13], fill=TILE_ECLIPSE_D)
    d.rectangle([7, 3, 8, 12], fill=TILE_ECLIPSE)
    d.point((7, 5), fill=TILE_ECLIPSE_L)
    d.point((8, 8), fill=TILE_ECLIPSE_L)
    # Portal glow edges
    d.point((6, 4), fill=ECLIPSE_GLOW)
    d.point((9, 7), fill=ECLIPSE_GLOW)
    d.point((7, 1), fill=ECLIPSE_DARK)
    d.point((8, 14), fill=ECLIPSE_DARK)


def tile_royal_carpet(tile):
    """Royal carpet (worn, eclipse-stained)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ROYAL)
    d.rectangle([1, 0, 14, 15], fill=TILE_ROYAL_D)
    # Gold border pattern
    d.rectangle([0, 0, 0, 15], fill=TILE_GOLD_D)
    d.rectangle([15, 0, 15, 15], fill=TILE_GOLD_D)
    # Eclipse stains on carpet
    d.point((5, 5), fill=TILE_ECLIPSE_D)
    d.point((10, 10), fill=TILE_ECLIPSE_D)


def tile_throne_dais(tile):
    """Raised throne platform / dais."""
    d = ImageDraw.Draw(tile)
    # Platform surface
    d.rectangle([0, 4, 15, 10], fill=TILE_ARCH)
    d.rectangle([1, 5, 14, 9], fill=TILE_ARCH_L)
    # Gold edge trim
    d.rectangle([0, 10, 15, 11], fill=TILE_GOLD_D)
    d.rectangle([0, 11, 15, 12], fill=TILE_GOLD)
    # Dais decorative dots
    d.point((3, 13), fill=TILE_ARCH_D)
    d.point((8, 14), fill=TILE_ARCH_D)
    d.point((12, 13), fill=TILE_ARCH_D)


def tile_edge_left(tile):
    """Left edge of throne room platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([4, 0, 15, 15], fill=TILE_ARCH)
    d.rectangle([5, 1, 14, 14], fill=TILE_ARCH_L)
    # Edge gold trim
    d.rectangle([4, 0, 4, 15], fill=TILE_GOLD_D)
    d.point((3, 3), fill=TILE_ARCH_D)
    d.point((2, 8), fill=TILE_ARCH_D)
    d.point((3, 12), fill=TILE_ARCH_D)


def tile_edge_right(tile):
    """Right edge of throne room platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 11, 15], fill=TILE_ARCH)
    d.rectangle([1, 1, 10, 14], fill=TILE_ARCH_L)
    # Edge gold trim
    d.rectangle([11, 0, 11, 15], fill=TILE_GOLD_D)
    d.point((12, 4), fill=TILE_ARCH_D)
    d.point((13, 9), fill=TILE_ARCH_D)
    d.point((12, 13), fill=TILE_ARCH_D)


def tile_edge_top(tile):
    """Top edge of throne room platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 4, 15, 15], fill=TILE_ARCH)
    d.rectangle([1, 5, 14, 14], fill=TILE_ARCH_L)
    # Gold edge trim
    d.rectangle([0, 4, 15, 4], fill=TILE_GOLD_D)
    d.point((3, 3), fill=TILE_ARCH_D)
    d.point((7, 2), fill=TILE_ARCH_D)
    d.point((11, 3), fill=TILE_ARCH_D)


def tile_edge_bottom(tile):
    """Bottom edge of throne room platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 11], fill=TILE_ARCH)
    d.rectangle([1, 1, 14, 10], fill=TILE_ARCH_L)
    # Underside gold trim
    d.rectangle([0, 11, 15, 11], fill=TILE_GOLD_D)
    d.point((4, 12), fill=TILE_ARCH_D)
    d.point((8, 13), fill=TILE_ARCH_D)
    d.point((12, 12), fill=TILE_ARCH_D)


def tile_rune_plate(tile):
    """Ancient throne room rune plate."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    d.rectangle([1, 1, 14, 14], fill=TILE_STONE_L)
    # Eclipse rune circle
    cx, cy = 8, 8
    for angle_i in range(12):
        angle = angle_i * (math.pi / 6)
        px = int(cx + 5 * math.cos(angle))
        py = int(cy + 5 * math.sin(angle))
        if 0 <= px < 16 and 0 <= py < 16:
            d.point((px, py), fill=TILE_ECLIPSE)
    # Center eclipse glyph
    d.point((8, 8), fill=ECLIPSE_GLOW)
    d.point((7, 7), fill=TILE_ECLIPSE)
    d.point((9, 9), fill=TILE_ECLIPSE)


def tile_void_floor(tile):
    """Dark void between platforms."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ECLIPSE_D)
    # Faint eclipse sparks
    d.point((3, 5), fill=TILE_ECLIPSE)
    d.point((10, 2), fill=TILE_ECLIPSE)
    d.point((7, 12), fill=TILE_ECLIPSE_D)
    d.point((13, 9), fill=TILE_ECLIPSE)


def tile_stone_variant1(tile):
    """Stone variant 1 (lighter patches)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ARCH)
    d.point((3, 4), fill=TILE_ARCH_L)
    d.point((10, 2), fill=TILE_ARCH_L)
    d.point((7, 11), fill=TILE_ARCH_D)
    d.point((13, 8), fill=TILE_ARCH_L)


def tile_stone_variant2(tile):
    """Stone variant 2 (darker patches)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ARCH)
    d.point((4, 7), fill=TILE_ARCH_D)
    d.point((11, 3), fill=TILE_ARCH_D)
    d.point((8, 13), fill=TILE_ARCH_L)
    d.point((2, 10), fill=TILE_ARCH_D)


def generate_tileset():
    """Generate tileset_eclipsed_throne.png (256x64)."""
    random.seed(190)  # Deterministic for PIX-190
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground / terrain tiles
    row0 = [
        tile_dark_stone_floor, tile_cracked_throne_floor, tile_throne_dais, tile_void_floor,
        tile_eclipse_stained_wall, tile_wall_top, tile_shattered_stained_glass, tile_shadow_pool,
        tile_stone_variant1, tile_stone_variant2, tile_edge_top, tile_edge_bottom,
        tile_edge_left, tile_edge_right, tile_rune_plate, tile_dark_stone_floor,
    ]
    for i, fn in enumerate(row0):
        random.seed(190 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Features and decorations
    row1 = [
        tile_throne_pillar, tile_eclipse_portal_fragment, tile_rune_plate, tile_throne_dais,
        tile_dark_stone_floor, tile_cracked_throne_floor, tile_void_floor, tile_eclipse_stained_wall,
        tile_wall_top, tile_edge_top, tile_stone_variant1, tile_stone_variant2,
        tile_edge_left, tile_edge_right, tile_royal_carpet, tile_shattered_stained_glass,
    ]
    for i, fn in enumerate(row1):
        random.seed(190 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions
    row2 = [
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_void_floor, tile_void_floor, tile_dark_stone_floor, tile_eclipse_stained_wall,
        tile_dark_stone_floor, tile_cracked_throne_floor, tile_eclipse_stained_wall, tile_wall_top,
        tile_rune_plate, tile_shadow_pool, tile_shattered_stained_glass, tile_throne_dais,
    ]
    for i, fn in enumerate(row2):
        random.seed(190 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: Variants and fill
    row3 = [
        tile_eclipse_portal_fragment, tile_rune_plate, tile_throne_pillar, tile_throne_dais,
        tile_wall_top, tile_eclipse_stained_wall, tile_void_floor, tile_dark_stone_floor,
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_stone_variant1, tile_stone_variant2, tile_royal_carpet, tile_cracked_throne_floor,
    ]
    for i, fn in enumerate(row3):
        random.seed(190 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(190)
    out = TILESETS_DIR / "tileset_eclipsed_throne.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# PARALLAX BACKGROUNDS -- 320x180, three layers (far/mid/near)
# =========================================================================

def generate_parallax():
    """Three parallax layers for Eclipsed Throne zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # -- FAR LAYER: eclipse-darkened sky with corrupted moon --
    far = Image.new("RGBA", (320, 180), SKY_ECLIPSE)
    fd = ImageDraw.Draw(far)
    # Eclipse sky gradient (top = near-black, bottom = deep crimson)
    for y in range(180):
        ratio = y / 180
        r = int(SKY_ECLIPSE[0] * (1 - ratio) + SKY_DEEP[0] * ratio)
        g = int(SKY_ECLIPSE[1] * (1 - ratio) + SKY_DEEP[1] * ratio)
        b = int(SKY_ECLIPSE[2] * (1 - ratio) + SKY_DEEP[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    # Corrupted eclipse moon (large, partially obscured)
    random.seed(190)
    moon_cx, moon_cy = 240, 45
    moon_r = 25
    for px in range(moon_cx - moon_r, moon_cx + moon_r + 1):
        for py in range(moon_cy - moon_r, moon_cy + moon_r + 1):
            if 0 <= px < 320 and 0 <= py < 180:
                dist = ((px - moon_cx) ** 2 + (py - moon_cy) ** 2) ** 0.5
                if dist < moon_r:
                    # Eclipse shadow across left side of moon
                    shadow_factor = max(0, min(1, (px - moon_cx + 8) / 16))
                    if shadow_factor > 0.3:
                        alpha = int(200 * (1 - dist / moon_r) * shadow_factor)
                        if alpha > 0:
                            far.putpixel((px, py), c(GOLD_DARK, min(alpha, 200)))
                    # Eclipse corona glow on edge
                    if moon_r - 3 < dist < moon_r:
                        corona_alpha = int(120 * (1 - (dist - moon_r + 3) / 3))
                        if corona_alpha > 0:
                            far.putpixel((px, py), c(ECLIPSE_GLOW, min(corona_alpha, 180)))

    # Distant nebula / eclipse shimmer
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

    # Dim stars scattered across dark sky
    for _ in range(20):
        sx, sy = random.randint(0, 319), random.randint(0, 100)
        alpha = random.randint(40, 120)
        far.putpixel((sx, sy), c(GOLD_GLOW, alpha))

    # Distant ruined spire silhouettes on horizon
    spire_positions = [(20, 130), (80, 120), (150, 135), (230, 125), (290, 130)]
    for sp_x, sp_y in spire_positions:
        sw = random.randint(6, 14)
        sh = random.randint(20, 45)
        # Spire body
        fd.rectangle([sp_x, sp_y - sh, sp_x + sw, sp_y], fill=c(ARCH_DARK))
        # Tapered top
        fd.rectangle([sp_x + sw // 4, sp_y - sh - 8, sp_x + sw - sw // 4, sp_y - sh], fill=c(ARCH_DARK))
        fd.point((sp_x + sw // 2, sp_y - sh - 10), fill=c(ARCH_DARK))
        # Eclipse glow at tip
        fd.point((sp_x + sw // 2, sp_y - sh - 9), fill=c(ECLIPSE_GLOW, 120))
        # Faint window glow
        fd.point((sp_x + sw // 2, sp_y - sh + 5), fill=c(ECLIPSE_MED, 80))

    # Horizon glow (eclipse-crimson)
    for y in range(140, 180):
        ratio = (y - 140) / 40
        alpha = int(60 * ratio)
        if alpha > 0:
            fd.line([(0, y), (319, y)], fill=c(SKY_GLOW, alpha))

    far_out = PARALLAX_DIR / "bg_parallax_eclipsed_throne_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # -- MID LAYER: silhouetted ruined spires and broken battlements --
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(191)

    # Eclipse energy clouds
    for _ in range(5):
        cx = random.randint(-20, 300)
        cy = random.randint(50, 120)
        cw = random.randint(40, 80)
        ch = random.randint(5, 10)
        md.rectangle([cx, cy, cx + cw, cy + ch], fill=c(ECLIPSE_MED, 40))
        md.rectangle([cx + 8, cy + 2, cx + cw - 8, cy + ch - 2], fill=c(ECLIPSE_DARK, 60))

    # Mid-ground broken battlements
    battlement_positions = [(20, 140), (90, 130), (170, 145), (260, 135)]
    for bx, by in battlement_positions:
        bw = random.randint(30, 50)
        bh = random.randint(12, 22)
        # Wall segment
        md.rectangle([bx, by, bx + bw, by + bh], fill=c(ARCH_MED))
        md.rectangle([bx + 1, by + 1, bx + bw - 1, by + bh - 2], fill=c(ARCH_LIGHT))
        # Battlements (crenellations)
        for mx in range(bx, bx + bw, 8):
            md.rectangle([mx, by - 5, mx + 4, by], fill=c(ARCH_MED))
        # Gold trim along top
        md.rectangle([bx, by, bx + bw, by], fill=c(GOLD_DARK, 140))
        # Eclipse glow through broken windows
        window_x = bx + random.randint(8, bw - 8)
        md.rectangle([window_x, by + 3, window_x + 3, by + 7], fill=c(ECLIPSE_MED, 120))

    # Mid-ground floating debris
    for _ in range(6):
        dx = random.randint(10, 310)
        dy = random.randint(60, 140)
        dw = random.randint(4, 10)
        dh = random.randint(2, 5)
        md.rectangle([dx, dy, dx + dw, dy + dh], fill=c(ARCH_MED, 80))

    # Eclipse energy wisps
    for _ in range(8):
        wx = random.randint(10, 310)
        wy = random.randint(40, 150)
        wlen = random.randint(8, 20)
        for wi in range(wlen):
            wpx = wx + wi
            wpy = wy + int(3 * math.sin(wi * 0.5))
            if 0 <= wpx < 320 and 0 <= wpy < 180:
                alpha = 100 - wi * 4
                if alpha > 0:
                    mid.putpixel((wpx, wpy), c(ECLIPSE_GLOW, alpha))

    mid_out = PARALLAX_DIR / "bg_parallax_eclipsed_throne_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # -- NEAR LAYER: foreground shadow mist and floating debris --
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(192)

    # Foreground shadow mist at bottom
    for x in range(0, 320, 2):
        h = random.randint(8, 25)
        base_y = 175
        for y in range(base_y - h, base_y):
            if 0 <= y < 180:
                alpha = 140 - int((base_y - y) * 4.5)
                if alpha > 0:
                    near.putpixel((x, y), c(ECLIPSE_DARK, min(alpha, 160)))
                    if x + 1 < 320:
                        near.putpixel((x + 1, y), c(ECLIPSE_DARK, min(alpha, 160)))

    # Bottom shadow floor
    nd.rectangle([0, 172, 319, 179], fill=c(ECLIPSE_MED, 120))

    # Floating debris particles (diagonal drift)
    for _ in range(25):
        ax = random.randint(0, 319)
        ay = random.randint(20, 170)
        length = random.randint(3, 6)
        color_choice = random.choice([ECLIPSE_GLOW, GOLD_BRIGHT, ECLIPSE_LIGHT])
        for i in range(length):
            px = ax + i
            py = ay - i * 2  # drift upward
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = 130 - i * 20
                if alpha > 0:
                    near.putpixel((px, py), c(color_choice, alpha))

    # Eclipse ember particles (floating gold/red sparks)
    for _ in range(20):
        wx = random.randint(0, 319)
        wy = random.randint(10, 155)
        color_choice = random.choice([GOLD_BRIGHT, ECLIPSE_GLOW, GOLD_GLOW])
        near.putpixel((wx, wy), c(color_choice, 160))
        if wx + 1 < 320:
            near.putpixel((wx + 1, wy), c(color_choice, 80))

    # Foreground floating stone fragments
    for fx in range(15, 320, 65):
        fy = random.randint(12, 50)
        fw = random.randint(5, 12)
        fh = random.randint(2, 4)
        nd.rectangle([fx, fy, fx + fw, fy + fh], fill=c(ARCH_MED, 70))
        nd.point((fx + fw // 2, fy), fill=c(ARCH_LIGHT, 90))

    near_out = PARALLAX_DIR / "bg_parallax_eclipsed_throne_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# =========================================================================
# MAIN
# =========================================================================

def main():
    print("Generating Eclipsed Throne zone assets (PIX-190)...")
    print()

    print("[1/8] Eclipse Knight enemy sprite sheet")
    generate_eclipse_knight()
    print()

    print("[2/8] Shadow Herald enemy sprite sheet")
    generate_shadow_herald()
    print()

    print("[3/8] Dusk Wraith enemy sprite sheet")
    generate_dusk_wraith()
    print()

    print("[4/8] Eclipsed King boss sprites (idle, attack, phases 1-3)")
    generate_eclipsed_king()
    print()

    print("[5/8] Twilight Oracle NPC sprite")
    generate_twilight_oracle()
    print()

    print("[6/8] Eclipsed Throne tileset (256x64)")
    generate_tileset()
    print()

    print("[7/8] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[8/8] Done! All Eclipsed Throne zone assets generated.")


if __name__ == "__main__":
    main()
