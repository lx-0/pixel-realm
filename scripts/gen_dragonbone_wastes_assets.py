#!/usr/bin/env python3
"""
Generate Dragonbone Wastes zone art assets for PixelRealm (PIX-182).
Produces:
  - 3 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Dragonbone Wastes color language: bone whites, ash grays, spectral green fire,
dark charcoal — a desolate expanse of massive dragon skeletons and lingering magic.
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

# -- Dragonbone Wastes Color Palette ----------------------------------------
# All colors from the 32-color master palette

# Bone / ivory tones
BONE_DARK     = (139, 119, 101, 255)   # #8b7765 -- shadow bone
BONE_MED      = (184, 168, 148, 255)   # #b8a894 -- mid bone
BONE_LIGHT    = (220, 210, 195, 255)   # #dcd2c3 -- bright bone
BONE_WHITE    = (240, 235, 225, 255)   # #f0ebe1 -- near-white bone

# Ash / charcoal terrain
ASH_BLACK     = (20, 18, 16, 255)      # #141210 -- deep charcoal
ASH_DARK      = (43, 40, 36, 255)      # #2b2824 -- dark ash
ASH_MED       = (74, 68, 60, 255)      # #4a443c -- medium ash
ASH_LIGHT     = (110, 102, 90, 255)    # #6e665a -- light ash

# Spectral fire (ghostly green)
SPECFIRE_DEEP = (10, 58, 32, 255)      # #0a3a20 -- deep spectral
SPECFIRE_DARK = (20, 100, 60, 255)     # #14643c -- dark fire
SPECFIRE_MED  = (48, 180, 96, 255)     # #30b460 -- spectral green
SPECFIRE_BRIGHT = (96, 240, 140, 255)  # #60f08c -- bright spectral
SPECFIRE_GLOW = (180, 255, 200, 255)   # #b4ffc8 -- glow white-green

# Neutrals
WHITE         = (240, 240, 240, 255)
BLACK         = (13, 13, 13, 255)
STONE_DARK    = (43, 43, 43, 255)
STONE_MED     = (74, 74, 74, 255)
STONE_LIGHT   = (110, 110, 110, 255)

# Ancient magic accents (deep red/maroon)
MAGIC_DARK    = (90, 10, 10, 255)      # #5a0a0a
MAGIC_MED     = (160, 40, 40, 255)     # #a02828
MAGIC_BRIGHT  = (240, 96, 96, 255)     # #f06060

# Sky / atmosphere
SKY_ASH       = (50, 45, 42, 255)      # #322d2a -- ash-gray sky
SKY_DARK      = (35, 32, 30, 255)      # #23201e
SKY_PALE      = (120, 112, 100, 255)   # #787064

# Earth (cracked ground)
EARTH_DARK    = (59, 32, 16, 255)
EARTH_MED     = (139, 92, 42, 255)
EARTH_LIGHT   = (184, 132, 63, 255)

OUTLINE       = (10, 10, 8, 255)
TRANSPARENT   = (0, 0, 0, 0)

# -- Creature-specific palettes -------------------------------------------

# Bone Revenant -- skeletal warrior risen from dragon bones
REVENANT_BONE    = BONE_LIGHT
REVENANT_BONE_D  = BONE_MED
REVENANT_SKULL   = BONE_WHITE
REVENANT_ARMOR   = ASH_MED
REVENANT_ARMOR_L = ASH_LIGHT
REVENANT_EYE     = SPECFIRE_BRIGHT
REVENANT_WEAPON  = BONE_DARK
REVENANT_WEAPON_L = BONE_MED
REVENANT_GLOW    = SPECFIRE_MED

# Ashwyrm -- serpent-like ash creature
ASHWYRM_BODY     = ASH_MED
ASHWYRM_BODY_L   = ASH_LIGHT
ASHWYRM_BELLY    = BONE_DARK
ASHWYRM_EYE      = MAGIC_BRIGHT
ASHWYRM_FIRE     = SPECFIRE_MED
ASHWYRM_FIRE_B   = SPECFIRE_BRIGHT
ASHWYRM_SCALE    = ASH_DARK
ASHWYRM_HORN     = BONE_MED

# Spectral Drake -- ghostly dragon remnant
DRAKE_BODY       = (80, 200, 140, 160)   # semi-transparent spectral green
DRAKE_BODY_D     = (40, 140, 90, 140)
DRAKE_WING       = (60, 180, 120, 120)
DRAKE_WING_L     = (100, 220, 160, 100)
DRAKE_EYE        = SPECFIRE_GLOW
DRAKE_SKULL      = (200, 230, 210, 180)
DRAKE_FIRE       = SPECFIRE_BRIGHT
DRAKE_TAIL       = (60, 160, 100, 100)

# Ancient Dracolich boss
DRACOLICH_BONE    = BONE_LIGHT
DRACOLICH_BONE_D  = BONE_DARK
DRACOLICH_SKULL   = BONE_WHITE
DRACOLICH_ARMOR   = ASH_DARK
DRACOLICH_EYE     = SPECFIRE_GLOW
DRACOLICH_FIRE    = SPECFIRE_BRIGHT
DRACOLICH_GLOW    = SPECFIRE_MED
DRACOLICH_WING    = BONE_MED
DRACOLICH_WING_D  = ASH_MED
DRACOLICH_CLAW    = BONE_MED
DRACOLICH_MAGIC   = MAGIC_BRIGHT
DRACOLICH_CROWN   = MAGIC_MED

# NPC: Dragonbone Sage
SAGE_ROBE      = (70, 60, 50, 255)
SAGE_ROBE_L    = (95, 82, 68, 255)
SAGE_SKIN      = (200, 180, 160, 255)
SAGE_SKIN_D    = (170, 150, 130, 255)
SAGE_HAIR      = BONE_WHITE
SAGE_STAFF     = BONE_MED
SAGE_STAFF_ORB = SPECFIRE_BRIGHT
SAGE_TRIM      = SPECFIRE_MED
SAGE_BELT      = BONE_DARK
SAGE_EYES      = STONE_DARK
SAGE_BOOK      = EARTH_MED

# Tileset colors
TILE_ASH       = ASH_MED
TILE_ASH_D     = ASH_DARK
TILE_ASH_L     = ASH_LIGHT
TILE_BONE      = BONE_MED
TILE_BONE_D    = BONE_DARK
TILE_BONE_L    = BONE_LIGHT
TILE_BONE_W    = BONE_WHITE
TILE_FIRE      = SPECFIRE_MED
TILE_FIRE_D    = SPECFIRE_DARK
TILE_FIRE_B    = SPECFIRE_BRIGHT
TILE_EARTH     = EARTH_MED
TILE_EARTH_D   = EARTH_DARK
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
# ENEMY 1: BONE REVENANT -- skeletal warrior, 16x16, 8 frames
# Frames 0-3: shamble/walk, Frames 4-7: attack (bone sword slash)
# =========================================================================

def draw_bone_revenant(draw, ox, oy, frame):
    """Draw a single 16x16 Bone Revenant frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, -1, 0, -1][anim]
    stride = [0, 1, 0, -1][anim]

    # Legs (bony, shambling)
    draw.rectangle([ox + 5, oy + 12 + bob, ox + 6, oy + 14], fill=REVENANT_BONE_D)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 10, oy + 14], fill=REVENANT_BONE_D)
    # Feet
    draw.point((ox + 5 + stride, oy + 15), fill=REVENANT_BONE_D)
    draw.point((ox + 10 - stride, oy + 15), fill=REVENANT_BONE_D)

    # Ribcage torso
    draw.rectangle([ox + 5, oy + 7 + bob, ox + 10, oy + 12 + bob], fill=REVENANT_BONE)
    # Rib detail
    draw.point((ox + 6, oy + 8 + bob), fill=REVENANT_BONE_D)
    draw.point((ox + 9, oy + 8 + bob), fill=REVENANT_BONE_D)
    draw.point((ox + 6, oy + 10 + bob), fill=REVENANT_BONE_D)
    draw.point((ox + 9, oy + 10 + bob), fill=REVENANT_BONE_D)
    # Armor fragment on shoulder
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 5, oy + 9 + bob], fill=REVENANT_ARMOR)
    draw.rectangle([ox + 10, oy + 7 + bob, ox + 11, oy + 9 + bob], fill=REVENANT_ARMOR_L)

    # Skull head
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 7 + bob], fill=REVENANT_SKULL)
    # Eye sockets with spectral glow
    draw.point((ox + 7, oy + 4 + bob), fill=REVENANT_EYE)
    draw.point((ox + 9, oy + 4 + bob), fill=REVENANT_EYE)
    # Jaw
    draw.rectangle([ox + 7, oy + 6 + bob, ox + 9, oy + 7 + bob], fill=REVENANT_BONE_D)
    # Helmet fragment
    draw.point((ox + 6, oy + 2 + bob), fill=REVENANT_ARMOR)
    draw.point((ox + 7, oy + 2 + bob), fill=REVENANT_ARMOR_L)

    # Arms + bone sword
    if is_attack:
        slash_arc = [0, 2, 3, 1][anim]
        # Right arm raised with sword
        draw.rectangle([ox + 10, oy + 6 + bob - slash_arc, ox + 11, oy + 9 + bob], fill=REVENANT_BONE)
        # Bone sword
        for sx in range(slash_arc + 2):
            draw.point((ox + 12 + sx, oy + 6 + bob - slash_arc + sx), fill=REVENANT_WEAPON_L)
        draw.point((ox + 12 + slash_arc + 1, oy + 6 + bob), fill=REVENANT_GLOW)
        # Left arm forward
        draw.rectangle([ox + 4, oy + 8 + bob, ox + 5, oy + 11 + bob], fill=REVENANT_BONE)
    else:
        # Arms at sides
        draw.rectangle([ox + 4, oy + 8 + bob, ox + 5, oy + 12 + bob], fill=REVENANT_BONE)
        draw.rectangle([ox + 10, oy + 8 + bob, ox + 11, oy + 12 + bob], fill=REVENANT_BONE)
        # Sword held at side
        draw.rectangle([ox + 11, oy + 5 + bob, ox + 11, oy + 13 + bob], fill=REVENANT_WEAPON)
        draw.point((ox + 11, oy + 4 + bob), fill=REVENANT_WEAPON_L)


def generate_bone_revenant():
    """Generate 8-frame Bone Revenant sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_bone_revenant(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_bone_revenant.png")
    return img


# =========================================================================
# ENEMY 2: ASHWYRM -- serpentine ash creature, 16x16, 8 frames
# Frames 0-3: slither/undulate, Frames 4-7: attack (ash breath)
# =========================================================================

def draw_ashwyrm(draw, ox, oy, frame):
    """Draw a single 16x16 Ashwyrm frame."""
    is_attack = frame >= 4
    anim = frame % 4

    # Undulation offsets for body segments
    wave = [0, 1, 0, -1][anim]
    wave2 = [1, 0, -1, 0][anim]

    # Tail section (rear)
    draw.rectangle([ox + 1, oy + 10 + wave2, ox + 3, oy + 12 + wave2], fill=ASHWYRM_BODY)
    draw.point((ox + 0, oy + 11 + wave2), fill=ASHWYRM_SCALE)
    # Tail tip
    draw.point((ox + 0, oy + 10 + wave2), fill=ASHWYRM_BODY_L)

    # Mid body
    draw.rectangle([ox + 3, oy + 8 + wave, ox + 7, oy + 12 + wave], fill=ASHWYRM_BODY)
    draw.rectangle([ox + 4, oy + 9 + wave, ox + 6, oy + 11 + wave], fill=ASHWYRM_BODY_L)
    # Belly scales
    draw.point((ox + 4, oy + 11 + wave), fill=ASHWYRM_BELLY)
    draw.point((ox + 6, oy + 11 + wave), fill=ASHWYRM_BELLY)
    # Dorsal ridges
    draw.point((ox + 4, oy + 7 + wave), fill=ASHWYRM_SCALE)
    draw.point((ox + 6, oy + 7 + wave), fill=ASHWYRM_SCALE)

    # Front body / neck
    draw.rectangle([ox + 7, oy + 6 + wave2, ox + 10, oy + 10 + wave2], fill=ASHWYRM_BODY)
    draw.rectangle([ox + 8, oy + 7 + wave2, ox + 9, oy + 9 + wave2], fill=ASHWYRM_BODY_L)

    # Head
    draw.rectangle([ox + 10, oy + 5 + wave2, ox + 14, oy + 9 + wave2], fill=ASHWYRM_BODY)
    draw.rectangle([ox + 11, oy + 6 + wave2, ox + 13, oy + 8 + wave2], fill=ASHWYRM_BODY_L)
    # Eyes (ember red)
    draw.point((ox + 12, oy + 6 + wave2), fill=ASHWYRM_EYE)
    draw.point((ox + 13, oy + 6 + wave2), fill=ASHWYRM_EYE)
    # Horns
    draw.point((ox + 11, oy + 4 + wave2), fill=ASHWYRM_HORN)
    draw.point((ox + 13, oy + 4 + wave2), fill=ASHWYRM_HORN)
    # Jaw
    draw.rectangle([ox + 12, oy + 8 + wave2, ox + 14, oy + 9 + wave2], fill=ASHWYRM_SCALE)

    # Attack: ash breath
    if is_attack:
        breath_ext = [0, 2, 4, 2][anim]
        if breath_ext > 0:
            for bx in range(breath_ext):
                # Ash cloud expanding forward
                draw.point((ox + 14 + bx, oy + 7 + wave2), fill=ASHWYRM_FIRE)
                if bx > 0:
                    draw.point((ox + 14 + bx, oy + 6 + wave2), fill=ASHWYRM_FIRE_B)
                    draw.point((ox + 14 + bx, oy + 8 + wave2), fill=ASHWYRM_FIRE_B)
            if breath_ext >= 3:
                draw.point((ox + 14 + breath_ext, oy + 7 + wave2), fill=SPECFIRE_GLOW)


def generate_ashwyrm():
    """Generate 8-frame Ashwyrm sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_ashwyrm(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_ashwyrm.png")
    return img


# =========================================================================
# ENEMY 3: SPECTRAL DRAKE -- ghostly dragon remnant, 16x16, 8 frames
# Frames 0-3: hover/float, Frames 4-7: attack (spectral fire burst)
# =========================================================================

def draw_spectral_drake(draw, ox, oy, frame):
    """Draw a single 16x16 Spectral Drake frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [0, -1, -2, -1][anim]

    # Tail (ghostly, trailing)
    draw.point((ox + 2, oy + 11 + float_y), fill=DRAKE_TAIL)
    draw.point((ox + 1, oy + 12 + float_y), fill=DRAKE_TAIL)
    draw.point((ox + 3, oy + 10 + float_y), fill=DRAKE_BODY_D)

    # Body (semi-transparent ghostly shape)
    draw.rectangle([ox + 4, oy + 7 + float_y, ox + 10, oy + 11 + float_y], fill=DRAKE_BODY)
    draw.rectangle([ox + 5, oy + 8 + float_y, ox + 9, oy + 10 + float_y], fill=DRAKE_BODY_D)
    # Spectral ribcage outline
    draw.point((ox + 5, oy + 8 + float_y), fill=DRAKE_SKULL)
    draw.point((ox + 9, oy + 8 + float_y), fill=DRAKE_SKULL)
    draw.point((ox + 5, oy + 10 + float_y), fill=DRAKE_SKULL)
    draw.point((ox + 9, oy + 10 + float_y), fill=DRAKE_SKULL)

    # Wings (ghostly, flapping)
    wing_flap = [0, -1, -2, -1][anim]
    # Left wing
    draw.rectangle([ox + 1, oy + 6 + float_y + wing_flap, ox + 4, oy + 8 + float_y], fill=DRAKE_WING)
    draw.point((ox + 0, oy + 6 + float_y + wing_flap), fill=DRAKE_WING_L)
    # Right wing
    draw.rectangle([ox + 10, oy + 6 + float_y + wing_flap, ox + 14, oy + 8 + float_y], fill=DRAKE_WING)
    draw.point((ox + 15, oy + 6 + float_y + wing_flap), fill=DRAKE_WING_L)

    # Head (dragon skull shape)
    draw.rectangle([ox + 9, oy + 4 + float_y, ox + 13, oy + 7 + float_y], fill=DRAKE_SKULL)
    draw.rectangle([ox + 10, oy + 5 + float_y, ox + 12, oy + 6 + float_y], fill=DRAKE_BODY)
    # Glowing eyes
    draw.point((ox + 10, oy + 5 + float_y), fill=DRAKE_EYE)
    draw.point((ox + 12, oy + 5 + float_y), fill=DRAKE_EYE)
    # Snout
    draw.point((ox + 13, oy + 5 + float_y), fill=DRAKE_SKULL)
    draw.point((ox + 13, oy + 6 + float_y), fill=DRAKE_SKULL)
    # Horns
    draw.point((ox + 9, oy + 3 + float_y), fill=DRAKE_SKULL)
    draw.point((ox + 11, oy + 3 + float_y), fill=DRAKE_SKULL)

    # Spectral wisps beneath (trailing ectoplasm)
    wisp_sway = [0, 1, 0, -1][anim]
    draw.point((ox + 6 + wisp_sway, oy + 12 + float_y), fill=DRAKE_TAIL)
    draw.point((ox + 8 - wisp_sway, oy + 13 + float_y), fill=DRAKE_TAIL)

    # Attack: spectral fire burst from mouth
    if is_attack:
        fire_ext = [0, 2, 3, 1][anim]
        if fire_ext > 0:
            for fx in range(fire_ext):
                draw.point((ox + 14 + fx, oy + 5 + float_y), fill=DRAKE_FIRE)
                draw.point((ox + 14 + fx, oy + 6 + float_y), fill=SPECFIRE_MED)
            if fire_ext >= 2:
                draw.point((ox + 14 + fire_ext, oy + 5 + float_y), fill=SPECFIRE_GLOW)
                draw.point((ox + 14 + fire_ext, oy + 4 + float_y), fill=SPECFIRE_MED)
                draw.point((ox + 14 + fire_ext, oy + 7 + float_y), fill=SPECFIRE_MED)


def generate_spectral_drake():
    """Generate 8-frame Spectral Drake sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_spectral_drake(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_spectral_drake.png")
    return img


# =========================================================================
# BOSS: ANCIENT DRACOLICH -- massive undead dragon, 32x32, multi-phase
# idle (1 frame), attack (4 frames), phase1/2/3 (1 frame each)
# =========================================================================

def draw_ancient_dracolich(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw the Ancient Dracolich boss at 32x32."""
    anim = frame % 4
    breath = [0, -1, 0, 1][anim]

    # Phase color shifts
    bone = DRACOLICH_BONE
    skull = DRACOLICH_SKULL
    fire = DRACOLICH_FIRE
    glow = DRACOLICH_GLOW
    wing = DRACOLICH_WING
    eye = DRACOLICH_EYE
    magic = DRACOLICH_MAGIC
    if phase == 2:
        bone = (200, 220, 205, 255)   # brighter bone with green tint
        fire = SPECFIRE_GLOW
        glow = (140, 255, 180, 255)
        eye = (200, 255, 220, 255)
        wing = BONE_LIGHT
    elif phase == 3:
        bone = (220, 200, 200, 255)   # reddish bone
        fire = MAGIC_BRIGHT
        glow = (255, 140, 140, 255)
        eye = (255, 200, 200, 255)
        magic = (255, 120, 120, 255)
        wing = (180, 140, 140, 255)

    outline = OUTLINE

    # Legs -- massive bone pillars
    draw.rectangle([ox + 8, oy + 22 + breath, ox + 12, oy + 27], fill=bone)
    draw.rectangle([ox + 19, oy + 22 + breath, ox + 23, oy + 27], fill=bone)
    # Claws
    draw.rectangle([ox + 7, oy + 27, ox + 13, oy + 30], fill=DRACOLICH_CLAW)
    draw.rectangle([ox + 18, oy + 27, ox + 24, oy + 30], fill=DRACOLICH_CLAW)
    # Claw tips
    draw.point((ox + 7, oy + 30), fill=BONE_WHITE)
    draw.point((ox + 13, oy + 30), fill=BONE_WHITE)
    draw.point((ox + 18, oy + 30), fill=BONE_WHITE)
    draw.point((ox + 24, oy + 30), fill=BONE_WHITE)

    # Ribcage torso
    draw.rectangle([ox + 8, oy + 12 + breath, ox + 23, oy + 22 + breath], fill=bone)
    draw.rectangle([ox + 9, oy + 13 + breath, ox + 22, oy + 21 + breath], fill=DRACOLICH_ARMOR)
    # Rib details (visible bone structure)
    for ry in range(14, 21, 2):
        draw.point((ox + 10, oy + ry + breath), fill=skull)
        draw.point((ox + 21, oy + ry + breath), fill=skull)
    # Spectral fire in chest cavity
    draw.rectangle([ox + 13, oy + 15 + breath, ox + 18, oy + 19 + breath], fill=glow)
    draw.rectangle([ox + 14, oy + 16 + breath, ox + 17, oy + 18 + breath], fill=fire)

    # Spine ridge along back
    for sx in range(10, 22, 2):
        draw.point((ox + sx, oy + 11 + breath), fill=skull)

    # Wings (skeletal bone wings with tattered membrane)
    wing_wave = [0, 1, 2, 1][anim]
    # Left wing
    draw.rectangle([ox + 0, oy + 8 + breath - wing_wave, ox + 7, oy + 13 + breath], fill=wing)
    draw.rectangle([ox + 1, oy + 9 + breath - wing_wave, ox + 6, oy + 12 + breath], fill=DRACOLICH_WING_D)
    # Wing bone struts
    draw.point((ox + 0, oy + 8 + breath - wing_wave), fill=skull)
    draw.point((ox + 2, oy + 8 + breath - wing_wave), fill=skull)
    draw.point((ox + 4, oy + 9 + breath - wing_wave), fill=skull)
    # Right wing
    draw.rectangle([ox + 24, oy + 8 + breath - wing_wave, ox + 31, oy + 13 + breath], fill=wing)
    draw.rectangle([ox + 25, oy + 9 + breath - wing_wave, ox + 30, oy + 12 + breath], fill=DRACOLICH_WING_D)
    draw.point((ox + 31, oy + 8 + breath - wing_wave), fill=skull)
    draw.point((ox + 29, oy + 8 + breath - wing_wave), fill=skull)
    draw.point((ox + 27, oy + 9 + breath - wing_wave), fill=skull)

    # Head (dragon skull)
    draw.rectangle([ox + 10, oy + 5 + breath, ox + 21, oy + 12 + breath], fill=bone)
    draw.rectangle([ox + 11, oy + 6 + breath, ox + 20, oy + 11 + breath], fill=skull)
    # Eye sockets with spectral fire
    draw.rectangle([ox + 12, oy + 7 + breath, ox + 14, oy + 9 + breath], fill=outline)
    draw.point((ox + 13, oy + 8 + breath), fill=eye)
    draw.rectangle([ox + 17, oy + 7 + breath, ox + 19, oy + 9 + breath], fill=outline)
    draw.point((ox + 18, oy + 8 + breath), fill=eye)

    # Horns (curving back)
    draw.point((ox + 10, oy + 4 + breath), fill=bone)
    draw.point((ox + 9, oy + 3 + breath), fill=bone)
    draw.point((ox + 8, oy + 2 + breath), fill=DRACOLICH_CLAW)
    draw.point((ox + 21, oy + 4 + breath), fill=bone)
    draw.point((ox + 22, oy + 3 + breath), fill=bone)
    draw.point((ox + 23, oy + 2 + breath), fill=DRACOLICH_CLAW)
    # Crown of ancient runes between horns
    draw.point((ox + 14, oy + 4 + breath), fill=DRACOLICH_CROWN)
    draw.point((ox + 16, oy + 3 + breath), fill=magic)
    draw.point((ox + 18, oy + 4 + breath), fill=DRACOLICH_CROWN)

    # Jaw
    if is_attack and anim in (1, 2):
        # Open jaw -- spectral fire breath
        draw.rectangle([ox + 13, oy + 10 + breath, ox + 18, oy + 12 + breath], fill=outline)
        draw.point((ox + 14, oy + 11 + breath), fill=fire)
        draw.point((ox + 17, oy + 11 + breath), fill=fire)
        # Fire breath downward
        for bx in range(1, 6):
            draw.point((ox + 15, oy + 12 + breath + bx), fill=fire)
            if bx > 1:
                draw.point((ox + 14, oy + 12 + breath + bx), fill=glow)
                draw.point((ox + 16, oy + 12 + breath + bx), fill=glow)
            if bx > 3:
                draw.point((ox + 13, oy + 12 + breath + bx), fill=SPECFIRE_DARK)
                draw.point((ox + 17, oy + 12 + breath + bx), fill=SPECFIRE_DARK)
    else:
        # Closed jaw
        draw.rectangle([ox + 13, oy + 10 + breath, ox + 18, oy + 11 + breath], fill=bone)

    # Arms / forelegs
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        attack_ext = [0, 2, 4, 2][anim]
        # Arms raised for strike
        draw.rectangle([ox + 4, oy + 14 + breath - attack_ext, ox + 8, oy + 20 + breath], fill=bone)
        draw.point((ox + 4, oy + 14 + breath - attack_ext), fill=DRACOLICH_CLAW)
        draw.point((ox + 3, oy + 13 + breath - attack_ext), fill=BONE_WHITE)
        draw.rectangle([ox + 23, oy + 14 + breath - attack_ext, ox + 27, oy + 20 + breath], fill=bone)
        draw.point((ox + 27, oy + 14 + breath - attack_ext), fill=DRACOLICH_CLAW)
        draw.point((ox + 28, oy + 13 + breath - attack_ext), fill=BONE_WHITE)
        # Ground slam effect
        if attack_ext >= 3:
            for gx in range(3, 29, 3):
                draw.point((ox + gx, oy + 30), fill=glow)
                draw.point((ox + gx, oy + 31), fill=SPECFIRE_DARK)
    else:
        # Idle arms
        draw.rectangle([ox + 4, oy + 15 + breath + arm_wave, ox + 8, oy + 22 + breath], fill=bone)
        draw.rectangle([ox + 23, oy + 15 + breath + arm_wave, ox + 27, oy + 22 + breath], fill=bone)
        # Claws
        draw.rectangle([ox + 3, oy + 21 + breath + arm_wave, ox + 7, oy + 23 + breath], fill=DRACOLICH_CLAW)
        draw.rectangle([ox + 24, oy + 21 + breath + arm_wave, ox + 28, oy + 23 + breath], fill=DRACOLICH_CLAW)

    # Tail (extending behind/below)
    draw.rectangle([ox + 12, oy + 22 + breath, ox + 14, oy + 25 + breath], fill=bone)
    draw.point((ox + 13, oy + 26 + breath), fill=DRACOLICH_CLAW)
    draw.point((ox + 12, oy + 27 + breath), fill=DRACOLICH_WING_D)

    # Phase-specific effects
    if phase >= 2:
        # Spectral aura particles
        aura_pos = [(3, 6), (28, 8), (5, 4), (26, 5), (15, 1)]
        for i, (ax, ay) in enumerate(aura_pos):
            if (anim + i) % 3 == 0:
                draw.point((ox + ax, oy + ay + breath), fill=fire)

    if phase == 3:
        # Dark magic swirling at base
        for tx in range(2, 30, 3):
            ty = 28 + (anim + tx) % 4
            if ty < 32:
                draw.point((ox + tx, oy + ty), fill=magic)
        # Burning crown intensifies
        draw.point((ox + 15, oy + 2 + breath), fill=magic)
        draw.point((ox + 16, oy + 1 + breath), fill=fire)
        draw.point((ox + 17, oy + 2 + breath), fill=magic)


def generate_ancient_dracolich():
    """Generate all Ancient Dracolich boss sprite sheets."""
    # Idle
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_ancient_dracolich(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_ancient_dracolich_idle.png")

    # Attack -- 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        draw_ancient_dracolich(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_ancient_dracolich_attack.png")

    # Phase 1
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_ancient_dracolich(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_ancient_dracolich_phase1.png")

    # Phase 2 -- spectral intensification
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_ancient_dracolich(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_ancient_dracolich_phase2.png")

    # Phase 3 -- dark magic empowered
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_ancient_dracolich(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_ancient_dracolich_phase3.png")


# =========================================================================
# NPC: DRAGONBONE SAGE -- zone quest giver, 16x24
# Ancient scholar studying dragon remains, robed with spectral staff
# =========================================================================

def draw_dragonbone_sage(draw, ox, oy):
    """Draw the Dragonbone Sage NPC at 16x24."""
    # Feet / boots (sturdy traveler boots)
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=ASH_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=ASH_DARK)

    # Robe (long, weathered with spectral trim)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=SAGE_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=SAGE_ROBE_L)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=SAGE_ROBE)
    # Spectral green trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=SAGE_TRIM)

    # Belt with bone clasp
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=SAGE_BELT)
    # Dragon bone pendant
    draw.point((ox + 8, oy + 15), fill=BONE_WHITE)
    draw.point((ox + 8, oy + 16), fill=SPECFIRE_MED)

    # Arms (in robe sleeves)
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=SAGE_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=SAGE_ROBE)
    # Spectral cuffs
    draw.point((ox + 2, oy + 16), fill=SAGE_TRIM)
    draw.point((ox + 14, oy + 16), fill=SAGE_TRIM)
    # Hands
    draw.point((ox + 2, oy + 17), fill=SAGE_SKIN)
    draw.point((ox + 14, oy + 17), fill=SAGE_SKIN)

    # Tome of dragon lore (held in left hand)
    draw.rectangle([ox + 1, oy + 15, ox + 3, oy + 18], fill=SAGE_BOOK)
    draw.point((ox + 2, oy + 16), fill=SPECFIRE_MED)
    # Pages
    draw.rectangle([ox + 1, oy + 16, ox + 1, oy + 17], fill=WHITE)

    # Staff (right hand -- bone staff with spectral orb)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=SAGE_STAFF)
    # Dragon bone staff top (claw holding orb)
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=BONE_DARK)
    draw.point((ox + 14, oy + 1), fill=SAGE_STAFF_ORB)
    draw.point((ox + 14, oy + 2), fill=SPECFIRE_GLOW)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=SAGE_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=SAGE_SKIN)

    # Hair (long, white/silver -- ancient sage)
    draw.rectangle([ox + 5, oy + 3, ox + 11, oy + 5], fill=SAGE_HAIR)
    draw.point((ox + 4, oy + 5), fill=SAGE_HAIR)
    draw.point((ox + 4, oy + 6), fill=SAGE_HAIR)
    draw.point((ox + 12, oy + 5), fill=SAGE_HAIR)
    draw.point((ox + 12, oy + 6), fill=SAGE_HAIR)
    # Beard
    draw.point((ox + 7, oy + 9), fill=SAGE_HAIR)
    draw.point((ox + 8, oy + 10), fill=SAGE_HAIR)
    draw.point((ox + 9, oy + 9), fill=SAGE_HAIR)

    # Bone circlet headband
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 4], fill=BONE_MED)
    draw.point((ox + 8, oy + 3), fill=SPECFIRE_BRIGHT)

    # Eyes
    draw.point((ox + 7, oy + 6), fill=SAGE_EYES)
    draw.point((ox + 9, oy + 6), fill=SAGE_EYES)


def generate_dragonbone_sage():
    """Generate Dragonbone Sage NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_dragonbone_sage(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_dragonbone.png")
    return img


# =========================================================================
# TILESET -- tileset_dragonbone.png (256x64, 16 cols x 4 rows)
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

def tile_ash_ground(tile):
    """Solid ashen ground."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ASH)
    # Subtle ash texture
    for x in range(0, 16, 3):
        for y in range(0, 16, 4):
            d.point((x + 1, y + 2), fill=TILE_ASH_D)


def tile_ash_cracked(tile):
    """Cracked ash ground."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ASH)
    # Cracks
    d.line([(2, 3), (6, 8)], fill=TILE_ASH_D, width=1)
    d.line([(10, 1), (8, 7)], fill=TILE_ASH_D, width=1)
    d.line([(5, 10), (12, 14)], fill=TILE_ASH_D, width=1)
    # Lighter dust in cracks
    d.point((4, 5), fill=TILE_ASH_L)
    d.point((9, 4), fill=TILE_ASH_L)


def tile_bone_ground(tile):
    """Ground littered with small bone fragments."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ASH)
    # Scattered bone fragments
    d.rectangle([2, 3, 5, 4], fill=TILE_BONE)
    d.rectangle([9, 8, 12, 9], fill=TILE_BONE_L)
    d.point((7, 12), fill=TILE_BONE_D)
    d.point((13, 2), fill=TILE_BONE)
    d.rectangle([1, 10, 3, 11], fill=TILE_BONE_D)


def tile_ribcage_wall(tile):
    """Dragon ribcage serving as wall."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=c(TILE_ASH, 180))
    # Rib bones (curved vertical)
    d.rectangle([2, 0, 4, 15], fill=TILE_BONE)
    d.rectangle([3, 0, 3, 15], fill=TILE_BONE_L)
    d.rectangle([7, 0, 9, 15], fill=TILE_BONE)
    d.rectangle([8, 0, 8, 15], fill=TILE_BONE_L)
    d.rectangle([12, 0, 14, 15], fill=TILE_BONE)
    d.rectangle([13, 0, 13, 15], fill=TILE_BONE_L)
    # Joint/cartilage details
    d.point((3, 4), fill=TILE_BONE_D)
    d.point((8, 7), fill=TILE_BONE_D)
    d.point((13, 3), fill=TILE_BONE_D)


def tile_ribcage_top(tile):
    """Top of dragon ribcage wall."""
    d = ImageDraw.Draw(tile)
    # Rib tips curving inward
    d.rectangle([2, 6, 4, 15], fill=TILE_BONE)
    d.point((3, 5), fill=TILE_BONE_L)
    d.point((3, 4), fill=TILE_BONE_L)
    d.rectangle([7, 4, 9, 15], fill=TILE_BONE)
    d.point((8, 3), fill=TILE_BONE_L)
    d.point((8, 2), fill=TILE_BONE_L)
    d.rectangle([12, 6, 14, 15], fill=TILE_BONE)
    d.point((13, 5), fill=TILE_BONE_L)
    d.point((13, 4), fill=TILE_BONE_L)


def tile_spectral_fire(tile):
    """Spectral fire geyser tile."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ASH)
    # Fire geyser from ground crack
    d.line([(6, 15), (10, 15)], fill=TILE_ASH_D, width=1)
    # Fire column
    d.rectangle([7, 6, 9, 14], fill=TILE_FIRE_D)
    d.rectangle([7, 3, 9, 10], fill=TILE_FIRE)
    d.rectangle([8, 1, 8, 6], fill=TILE_FIRE_B)
    # Fire tip
    d.point((8, 0), fill=c(SPECFIRE_GLOW))
    # Flicker
    d.point((6, 4), fill=TILE_FIRE)
    d.point((10, 5), fill=TILE_FIRE)


def tile_dragon_skull(tile):
    """Partial dragon skull embedded in ground."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ASH)
    # Skull dome
    d.rectangle([3, 4, 12, 10], fill=TILE_BONE)
    d.rectangle([4, 5, 11, 9], fill=TILE_BONE_L)
    # Eye socket
    d.rectangle([5, 6, 7, 8], fill=TILE_ASH_D)
    d.point((6, 7), fill=TILE_FIRE)
    # Snout
    d.rectangle([9, 7, 13, 10], fill=TILE_BONE)
    # Jaw/teeth
    d.point((10, 10), fill=TILE_BONE_W)
    d.point((12, 10), fill=TILE_BONE_W)
    # Half buried
    d.rectangle([0, 11, 15, 15], fill=TILE_ASH)


def tile_bone_pillar(tile):
    """Vertical bone pillar (large leg bone)."""
    d = ImageDraw.Draw(tile)
    # Bone shaft
    d.rectangle([5, 0, 10, 15], fill=TILE_BONE)
    d.rectangle([6, 0, 9, 15], fill=TILE_BONE_L)
    # Knobby joint at top
    d.rectangle([4, 0, 11, 3], fill=TILE_BONE)
    d.point((7, 1), fill=TILE_BONE_W)
    # Cracks
    d.point((7, 7), fill=TILE_BONE_D)
    d.point((8, 10), fill=TILE_BONE_D)


def tile_ash_edge_n(tile):
    """Ash ground north edge (transition to void/bone)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 4, 15, 15], fill=TILE_ASH)
    # Crumbling edge
    d.point((3, 3), fill=TILE_ASH)
    d.point((7, 2), fill=TILE_ASH)
    d.point((11, 3), fill=TILE_ASH_D)
    d.point((14, 2), fill=TILE_ASH_D)


def tile_ash_edge_s(tile):
    """Ash ground south edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 11], fill=TILE_ASH)
    d.point((4, 12), fill=TILE_ASH)
    d.point((8, 13), fill=TILE_ASH_D)
    d.point((12, 12), fill=TILE_ASH)


def tile_ash_edge_w(tile):
    """Ash ground west edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([4, 0, 15, 15], fill=TILE_ASH)
    d.point((3, 3), fill=TILE_ASH)
    d.point((2, 8), fill=TILE_ASH_D)
    d.point((3, 12), fill=TILE_ASH)


def tile_ash_edge_e(tile):
    """Ash ground east edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 11, 15], fill=TILE_ASH)
    d.point((12, 4), fill=TILE_ASH)
    d.point((13, 9), fill=TILE_ASH_D)
    d.point((12, 13), fill=TILE_ASH)


def tile_charred_earth(tile):
    """Dark charred earth tile."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_EARTH_D)
    d.rectangle([1, 1, 14, 14], fill=TILE_EARTH)
    # Char marks
    d.point((4, 5), fill=TILE_ASH_D)
    d.point((10, 3), fill=TILE_ASH_D)
    d.point((7, 11), fill=TILE_ASH_D)


def tile_bone_floor(tile):
    """Floor made of interlocking bones."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_BONE_D)
    # Horizontal bone rows
    d.rectangle([0, 0, 15, 3], fill=TILE_BONE)
    d.rectangle([0, 6, 15, 9], fill=TILE_BONE)
    d.rectangle([0, 12, 15, 15], fill=TILE_BONE)
    # Joint gaps
    d.line([(4, 0), (4, 3)], fill=TILE_BONE_D, width=1)
    d.line([(10, 0), (10, 3)], fill=TILE_BONE_D, width=1)
    d.line([(7, 6), (7, 9)], fill=TILE_BONE_D, width=1)
    d.line([(13, 6), (13, 9)], fill=TILE_BONE_D, width=1)
    d.line([(3, 12), (3, 15)], fill=TILE_BONE_D, width=1)
    d.line([(9, 12), (9, 15)], fill=TILE_BONE_D, width=1)


def tile_rune_stone(tile):
    """Ancient rune-carved stone slab."""
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
            d.point((px, py), fill=TILE_FIRE)
    # Center rune
    d.point((8, 8), fill=TILE_FIRE_B)
    d.point((7, 7), fill=TILE_FIRE)
    d.point((9, 9), fill=TILE_FIRE)


def tile_ash_variant1(tile):
    """Ash ground variant 1 (lighter patches)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ASH)
    d.point((3, 4), fill=TILE_ASH_L)
    d.point((10, 2), fill=TILE_ASH_L)
    d.point((7, 11), fill=TILE_ASH_D)
    d.point((13, 8), fill=TILE_ASH_L)


def tile_ash_variant2(tile):
    """Ash ground variant 2 (darker patches)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ASH)
    d.point((4, 7), fill=TILE_ASH_D)
    d.point((11, 3), fill=TILE_ASH_D)
    d.point((8, 13), fill=TILE_ASH_L)
    d.point((2, 10), fill=TILE_ASH_D)


def generate_tileset():
    """Generate the main tileset_dragonbone.png (256x64)."""
    random.seed(182)  # Deterministic for PIX-182
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground / terrain tiles
    row0 = [
        tile_ash_ground, tile_ash_cracked, tile_bone_ground, tile_charred_earth,
        tile_bone_floor, tile_ribcage_wall, tile_ribcage_top, tile_bone_pillar,
        tile_ash_variant1, tile_ash_variant2, tile_ash_edge_n, tile_ash_edge_s,
        tile_ash_edge_w, tile_ash_edge_e, tile_spectral_fire, tile_dragon_skull,
    ]
    for i, fn in enumerate(row0):
        random.seed(182 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Features and decorations
    row1 = [
        tile_dragon_skull, tile_bone_pillar, tile_spectral_fire, tile_rune_stone,
        tile_ash_ground, tile_ash_cracked, tile_bone_ground, tile_bone_floor,
        tile_ribcage_wall, tile_ribcage_top, tile_charred_earth, tile_charred_earth,
        tile_ash_variant1, tile_ash_variant2, tile_ash_ground, tile_ash_ground,
    ]
    for i, fn in enumerate(row1):
        random.seed(182 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions + more decorations
    row2 = [
        tile_ash_edge_n, tile_ash_edge_s, tile_ash_edge_w, tile_ash_edge_e,
        tile_charred_earth, tile_charred_earth, tile_bone_ground, tile_bone_floor,
        tile_ash_ground, tile_ash_cracked, tile_ribcage_wall, tile_ribcage_top,
        tile_rune_stone, tile_spectral_fire, tile_bone_pillar, tile_dragon_skull,
    ]
    for i, fn in enumerate(row2):
        random.seed(182 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: Variants and fill
    row3 = [
        tile_spectral_fire, tile_rune_stone, tile_bone_pillar, tile_dragon_skull,
        tile_ribcage_top, tile_ribcage_wall, tile_bone_floor, tile_bone_ground,
        tile_ash_edge_n, tile_ash_edge_s, tile_ash_edge_w, tile_ash_edge_e,
        tile_ash_variant1, tile_ash_variant2, tile_ash_ground, tile_charred_earth,
    ]
    for i, fn in enumerate(row3):
        random.seed(182 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(182)
    out = TILESETS_DIR / "tileset_dragonbone.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# PARALLAX BACKGROUNDS -- 320x180, three layers (far/mid/near)
# =========================================================================

def generate_parallax():
    """Three parallax layers for Dragonbone Wastes zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # -- FAR LAYER: ash-gray sky with distant dragon skeleton silhouettes --
    far = Image.new("RGBA", (320, 180), SKY_DARK)
    fd = ImageDraw.Draw(far)
    # Sky gradient (top = near-black, bottom = ash-gray)
    for y in range(180):
        ratio = y / 180
        r = int(SKY_DARK[0] * (1 - ratio) + SKY_ASH[0] * ratio)
        g = int(SKY_DARK[1] * (1 - ratio) + SKY_ASH[1] * ratio)
        b = int(SKY_DARK[2] * (1 - ratio) + SKY_ASH[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    # Sparse dim stars in upper sky (barely visible through ash haze)
    random.seed(182)
    for _ in range(15):
        sx, sy = random.randint(0, 319), random.randint(0, 60)
        alpha = random.randint(80, 160)
        far.putpixel((sx, sy), c(BONE_WHITE, alpha))

    # Distant dragon skeleton silhouettes (massive ribcages on horizon)
    skeleton_positions = [(60, 120), (160, 110), (260, 125)]
    for sx_pos, sy_pos in skeleton_positions:
        # Spine (horizontal)
        spine_len = random.randint(40, 70)
        for x in range(sx_pos - spine_len // 2, sx_pos + spine_len // 2):
            if 0 <= x < 320:
                fd.point((x, sy_pos), fill=c(BONE_DARK))
        # Ribs curving upward
        num_ribs = random.randint(5, 8)
        for ri in range(num_ribs):
            rx = sx_pos - spine_len // 2 + ri * (spine_len // num_ribs)
            rib_h = random.randint(15, 30)
            if 0 <= rx < 320:
                for ry in range(rib_h):
                    curve = int(ry * 0.3)
                    px = rx + curve
                    py = sy_pos - ry
                    if 0 <= px < 320 and 0 <= py < 180:
                        fd.point((px, py), fill=c(BONE_DARK))
                    px2 = rx - curve
                    if 0 <= px2 < 320 and 0 <= py < 180:
                        fd.point((px2, py), fill=c(BONE_DARK))
        # Skull at one end
        skull_x = sx_pos + spine_len // 2
        if skull_x < 310:
            fd.rectangle([skull_x, sy_pos - 12, skull_x + 10, sy_pos], fill=c(BONE_DARK))
            fd.point((skull_x + 7, sy_pos - 8), fill=c(SPECFIRE_DARK))

    # Distant ash haze at horizon
    for x in range(0, 320, 2):
        h = random.randint(5, 15)
        base_y = 155
        for y in range(base_y, base_y + h):
            if y < 180:
                alpha = 100 - (y - base_y) * 5
                if alpha > 0:
                    far.putpixel((x, y), c(ASH_MED, alpha))
                    if x + 1 < 320:
                        far.putpixel((x + 1, y), c(ASH_MED, alpha))

    far_out = PARALLAX_DIR / "bg_parallax_dragonbone_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # -- MID LAYER: closer bone formations, ash clouds, spectral fire geysers --
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(183)

    # Ash cloud banks
    for _ in range(4):
        cx = random.randint(-20, 300)
        cy = random.randint(60, 120)
        cw = random.randint(50, 90)
        ch = random.randint(6, 12)
        md.rectangle([cx, cy, cx + cw, cy + ch], fill=c(ASH_LIGHT, 80))
        md.rectangle([cx + 8, cy + 2, cx + cw - 8, cy + ch - 2], fill=c(ASH_LIGHT, 100))

    # Mid-ground bone formations (large skeleton parts)
    bone_formations = [(50, 130), (170, 115), (290, 135)]
    for bx_pos, by_pos in bone_formations:
        # Large bone arch/rib
        arch_h = random.randint(20, 35)
        arch_w = random.randint(15, 25)
        for a in range(0, 30):
            angle = a * (math.pi / 30)
            px = int(bx_pos + arch_w * math.cos(angle))
            py = int(by_pos - arch_h * math.sin(angle))
            if 0 <= px < 320 and 0 <= py < 180:
                md.rectangle([px - 1, py - 1, px + 1, py + 1], fill=c(BONE_MED))
                md.point((px, py), fill=c(BONE_LIGHT))

        # Spectral fire geyser near formation
        geyser_x = bx_pos + random.randint(-15, 15)
        geyser_y = by_pos + 5
        if 0 <= geyser_x < 316:
            geyser_h = random.randint(15, 30)
            for gy in range(geyser_h):
                fire_x = geyser_x + random.randint(-1, 1)
                fire_y = geyser_y - gy
                if 0 <= fire_x < 320 and 0 <= fire_y < 180:
                    alpha = 200 - gy * 6
                    if alpha > 0:
                        mid.putpixel((fire_x, fire_y), c(SPECFIRE_MED, alpha))
            # Fire base glow
            md.rectangle([geyser_x - 2, geyser_y, geyser_x + 2, geyser_y + 2], fill=c(SPECFIRE_DARK, 150))

    mid_out = PARALLAX_DIR / "bg_parallax_dragonbone_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # -- NEAR LAYER: foreground ash particles, bone debris, spectral wisps --
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(184)

    # Foreground ash/dust cloud at bottom
    for x in range(0, 320, 2):
        h = random.randint(6, 20)
        base_y = 175
        for y in range(base_y - h, base_y):
            if 0 <= y < 180:
                alpha = 150 - int((base_y - y) * 6)
                if alpha > 0:
                    near.putpixel((x, y), c(ASH_LIGHT, min(alpha, 180)))
                    if x + 1 < 320:
                        near.putpixel((x + 1, y), c(ASH_LIGHT, min(alpha, 180)))

    # Bottom ash floor
    nd.rectangle([0, 172, 319, 179], fill=c(ASH_MED, 160))

    # Falling ash particles (diagonal drift)
    for _ in range(35):
        ax = random.randint(0, 319)
        ay = random.randint(5, 160)
        length = random.randint(3, 8)
        for i in range(length):
            px = ax + i
            py = ay + i * 2
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = 120 - i * 15
                if alpha > 0:
                    near.putpixel((px, py), c(ASH_LIGHT, alpha))

    # Spectral wisps (floating green embers)
    for _ in range(20):
        wx = random.randint(0, 319)
        wy = random.randint(10, 155)
        near.putpixel((wx, wy), c(SPECFIRE_BRIGHT, 180))
        if wx + 1 < 320:
            near.putpixel((wx + 1, wy), c(SPECFIRE_MED, 120))

    # Foreground bone fragments (scattered)
    for fx in range(20, 320, 70):
        fy = random.randint(15, 55)
        fw = random.randint(6, 14)
        fh = random.randint(2, 5)
        nd.rectangle([fx, fy, fx + fw, fy + fh], fill=c(BONE_MED, 80))
        nd.point((fx + fw // 2, fy), fill=c(BONE_LIGHT, 100))

    near_out = PARALLAX_DIR / "bg_parallax_dragonbone_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# =========================================================================
# MAIN
# =========================================================================

def main():
    print("Generating Dragonbone Wastes zone assets (PIX-182)...")
    print()

    print("[1/8] Bone Revenant enemy sprite sheet")
    generate_bone_revenant()
    print()

    print("[2/8] Ashwyrm enemy sprite sheet")
    generate_ashwyrm()
    print()

    print("[3/8] Spectral Drake enemy sprite sheet")
    generate_spectral_drake()
    print()

    print("[4/8] Ancient Dracolich boss sprites (idle, attack, phases 1-3)")
    generate_ancient_dracolich()
    print()

    print("[5/8] Dragonbone Sage NPC sprite")
    generate_dragonbone_sage()
    print()

    print("[6/8] Dragonbone Wastes tileset (256x64)")
    generate_tileset()
    print()

    print("[7/8] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[8/8] Done! All Dragonbone Wastes zone assets generated.")


if __name__ == "__main__":
    main()
