#!/usr/bin/env python3
"""
Generate Ethereal Nexus zone art assets for PixelRealm (PIX-209).
Produces:
  - 3 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Ethereal Nexus color language: dimensional indigo, nexus teal, prismatic
silver, rift violet, crystallized spacetime white — a cosmic convergence
zone where multiple planes of reality overlap, fracture, and fuse.
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

# -- Ethereal Nexus Color Palette ----------------------------------------------

# Dimensional indigo / deep plane energy
INDIGO_BLACK    = (6, 4, 18, 255)            # deepest dimensional void
INDIGO_DARK     = (15, 10, 42, 255)          # dark dimensional
INDIGO_MED      = (45, 30, 110, 255)         # mid indigo
INDIGO_BRIGHT   = (80, 55, 180, 255)         # bright indigo
INDIGO_GLOW     = (130, 100, 240, 255)       # searing indigo glow

# Nexus teal / convergence energy
NEXUS_DEEP      = (5, 22, 28, 255)           # deep nexus dark
NEXUS_DARK      = (10, 50, 65, 255)          # dark nexus
NEXUS_MED       = (25, 130, 155, 255)        # nexus energy
NEXUS_BRIGHT    = (70, 210, 230, 255)        # bright nexus
NEXUS_GLOW      = (150, 245, 255, 255)       # blinding nexus

# Prismatic silver / crystallized spacetime
PRISM_BLACK     = (12, 12, 15, 255)          # deepest crystal
PRISM_DARK      = (28, 28, 35, 255)          # dark crystal
PRISM_MED       = (80, 82, 95, 255)          # mid crystal
PRISM_LIGHT     = (145, 148, 165, 255)       # light crystal
PRISM_EDGE      = (195, 200, 220, 255)       # crystal edge highlight

# Rift violet / dimensional tears
RIFT_FIRE       = (200, 60, 255, 255)        # rift flare
RIFT_DEEP       = (90, 20, 140, 255)         # deep rift
RIFT_MED        = (160, 70, 220, 255)        # mid rift
RIFT_BRIGHT     = (210, 130, 255, 255)       # bright rift
RIFT_GLOW       = (235, 190, 255, 255)       # blinding rift

# Convergence energy (where planes meet)
CONV_CYAN       = (100, 240, 255, 255)       # cyan convergence
CONV_GOLD       = (255, 220, 100, 255)       # gold convergence
CONV_ROSE       = (255, 140, 180, 255)       # rose convergence
CONV_WHITE      = (240, 240, 255, 255)       # white convergence
CONV_SPARK      = (220, 255, 255, 255)       # spark

# Spacetime rune markings
RUNE_DIM        = (100, 90, 140, 255)        # dim rune
RUNE_MED        = (160, 140, 210, 255)       # rune shimmer
RUNE_BRIGHT     = (210, 195, 250, 255)       # bright rune
RUNE_WHITE      = (240, 235, 255, 255)       # near-white rune
RUNE_GLOW       = (250, 245, 255, 255)       # blinding rune

# Neutrals
WHITE           = (235, 235, 245, 255)
BLACK           = (4, 4, 8, 255)
STONE_DARK      = (22, 22, 30, 255)
STONE_MED       = (42, 42, 55, 255)
STONE_LIGHT     = (68, 68, 82, 255)

# Platform / nexus crystal foundation
PLAT_DARK       = (25, 22, 38, 255)
PLAT_MED        = (48, 44, 68, 255)
PLAT_LIGHT      = (75, 70, 100, 255)
PLAT_EDGE       = (100, 96, 130, 255)

# Sky / atmosphere
SKY_VOID        = (4, 2, 12, 255)            # dimensional void
SKY_DEEP        = (10, 6, 28, 255)
SKY_GLOW        = (30, 18, 60, 255)          # horizon glow

# Crystal accent colors
CRYSTAL_INDIGO  = (120, 80, 220, 255)
CRYSTAL_TEAL    = (60, 200, 210, 255)
CRYSTAL_ROSE    = (200, 120, 180, 255)
CRYSTAL_WHITE   = (220, 220, 240, 255)

OUTLINE         = (4, 2, 8, 255)
TRANSPARENT     = (0, 0, 0, 0)

# -- Creature-specific palettes -----------------------------------------------

# Nexus Guardian -- armored interdimensional sentinel, heavy and imposing
GUARDIAN_BODY   = PRISM_MED
GUARDIAN_BODY_L = PRISM_LIGHT
GUARDIAN_BODY_D = PRISM_DARK
GUARDIAN_ARMOR  = PLAT_LIGHT
GUARDIAN_ARMOR_D = PLAT_MED
GUARDIAN_EYE    = NEXUS_GLOW
GUARDIAN_CORE   = INDIGO_BRIGHT
GUARDIAN_RUNE   = RUNE_BRIGHT
GUARDIAN_GLOW   = NEXUS_BRIGHT

# Phase Strider -- phase-shifting creature, lean and flickering
STRIDER_BODY    = (55, 30, 100, 200)         # semi-transparent
STRIDER_BODY_D  = (30, 15, 65, 220)
STRIDER_EDGE    = RIFT_BRIGHT
STRIDER_CORE    = RIFT_GLOW
STRIDER_GLOW    = (235, 200, 255, 255)
STRIDER_TRAIL   = (100, 50, 160, 80)
STRIDER_TRAIL_L = (130, 80, 190, 50)
STRIDER_EYE     = CONV_CYAN
STRIDER_FLICKER = RIFT_MED

# Energy Parasite -- translucent feeder on dimensional energy
PARASITE_BODY   = (40, 80, 90, 160)          # translucent body
PARASITE_BODY_D = (20, 50, 60, 180)
PARASITE_EDGE   = NEXUS_BRIGHT
PARASITE_CORE   = CONV_CYAN
PARASITE_GLOW   = NEXUS_GLOW
PARASITE_TRAIL  = (30, 100, 120, 70)
PARASITE_TRAIL_L = (50, 130, 150, 40)
PARASITE_EYE    = CONV_GOLD
PARASITE_VEIN   = NEXUS_MED

# Nexus Overseer boss
OVERSEER_BODY   = INDIGO_MED
OVERSEER_BODY_D = INDIGO_DARK
OVERSEER_ARMOR  = PLAT_LIGHT
OVERSEER_ARMOR_D = PLAT_MED
OVERSEER_EYE    = NEXUS_GLOW
OVERSEER_FLAME  = RIFT_BRIGHT
OVERSEER_RUNE   = RUNE_BRIGHT
OVERSEER_GLOW   = RUNE_GLOW
OVERSEER_CROWN  = RUNE_MED
OVERSEER_CROWN_G = RUNE_GLOW
OVERSEER_CAPE   = INDIGO_DARK
OVERSEER_CAPE_L = INDIGO_MED
OVERSEER_WEAPON = RUNE_MED
OVERSEER_MAGIC  = NEXUS_BRIGHT

# NPC: Dimensional Weaver
WEAVER_ROBE     = (35, 30, 58, 255)
WEAVER_ROBE_L   = (52, 48, 78, 255)
WEAVER_SKIN     = (170, 165, 180, 255)
WEAVER_SKIN_D   = (140, 135, 150, 255)
WEAVER_HAIR     = (90, 80, 120, 255)
WEAVER_STAFF    = RUNE_MED
WEAVER_STAFF_ORB = NEXUS_BRIGHT
WEAVER_TRIM     = INDIGO_BRIGHT
WEAVER_BELT     = PRISM_DARK
WEAVER_EYES     = NEXUS_GLOW
WEAVER_HOOD     = (20, 18, 35, 255)

# Tileset colors
TILE_PLAT       = PLAT_MED
TILE_PLAT_D     = PLAT_DARK
TILE_PLAT_L     = PLAT_LIGHT
TILE_PLAT_E     = PLAT_EDGE
TILE_INDIGO     = INDIGO_MED
TILE_INDIGO_D   = INDIGO_DARK
TILE_INDIGO_B   = INDIGO_BRIGHT
TILE_NEXUS      = NEXUS_MED
TILE_NEXUS_D    = NEXUS_DARK
TILE_NEXUS_L    = NEXUS_BRIGHT
TILE_STONE      = STONE_MED
TILE_STONE_D    = STONE_DARK
TILE_STONE_L    = STONE_LIGHT
TILE_RUNE       = RUNE_MED
TILE_RUNE_D     = RUNE_DIM


def ensure_dir(path):
    os.makedirs(os.path.dirname(path) if isinstance(path, str) else path.parent, exist_ok=True)


def save_asset(img, rel_path):
    full_path = ASSET_ROOT / rel_path if isinstance(rel_path, str) else rel_path
    ensure_dir(full_path)
    img.save(str(full_path))
    print(f"  Created: {full_path.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# ENEMY 1: NEXUS GUARDIAN -- armored interdimensional sentinel, 16x16, 8 frames
# Frames 0-3: walk/patrol, Frames 4-7: attack (dimensional slam)
# =========================================================================

def draw_nexus_guardian(draw, ox, oy, frame):
    """Draw a single 16x16 Nexus Guardian frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, 0, -1, 0][anim]
    stride = [0, 1, 0, -1][anim]

    # Heavy armored legs (crystallized spacetime greaves)
    draw.rectangle([ox + 4, oy + 12 + bob, ox + 6, oy + 14], fill=GUARDIAN_BODY_D)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 11, oy + 14], fill=GUARDIAN_BODY_D)
    # Boots with nexus runes
    draw.rectangle([ox + 3 + stride, oy + 14, ox + 6 + stride, oy + 15], fill=GUARDIAN_ARMOR)
    draw.rectangle([ox + 9 - stride, oy + 14, ox + 12 - stride, oy + 15], fill=GUARDIAN_ARMOR)
    draw.point((ox + 4 + stride, oy + 14), fill=GUARDIAN_RUNE)
    draw.point((ox + 10 - stride, oy + 14), fill=GUARDIAN_RUNE)

    # Torso (dimensional armor with nexus core)
    draw.rectangle([ox + 3, oy + 6 + bob, ox + 12, oy + 12 + bob], fill=GUARDIAN_BODY)
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 11, oy + 11 + bob], fill=GUARDIAN_BODY_L)
    # Central nexus core (glowing teal)
    draw.point((ox + 7, oy + 9 + bob), fill=GUARDIAN_CORE)
    draw.point((ox + 8, oy + 9 + bob), fill=GUARDIAN_CORE)
    # Indigo energy veins on armor
    draw.point((ox + 5, oy + 8 + bob), fill=INDIGO_BRIGHT)
    draw.point((ox + 10, oy + 8 + bob), fill=INDIGO_BRIGHT)
    # Dimensional rune marks
    draw.point((ox + 4, oy + 10 + bob), fill=GUARDIAN_RUNE)
    draw.point((ox + 11, oy + 10 + bob), fill=GUARDIAN_RUNE)
    # Shoulder pauldrons (crystal-edged)
    draw.rectangle([ox + 2, oy + 6 + bob, ox + 3, oy + 8 + bob], fill=GUARDIAN_ARMOR)
    draw.rectangle([ox + 12, oy + 6 + bob, ox + 13, oy + 8 + bob], fill=GUARDIAN_ARMOR)
    draw.point((ox + 2, oy + 6 + bob), fill=NEXUS_BRIGHT)
    draw.point((ox + 13, oy + 6 + bob), fill=NEXUS_BRIGHT)

    # Head (helm with dimensional visor)
    draw.rectangle([ox + 5, oy + 2 + bob, ox + 10, oy + 6 + bob], fill=GUARDIAN_ARMOR)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 5 + bob], fill=GUARDIAN_ARMOR_D)
    # Visor slit with nexus-glow eyes
    draw.rectangle([ox + 6, oy + 4 + bob, ox + 9, oy + 4 + bob], fill=OUTLINE)
    draw.point((ox + 6, oy + 4 + bob), fill=GUARDIAN_EYE)
    draw.point((ox + 9, oy + 4 + bob), fill=GUARDIAN_EYE)
    # Helm crest (dimensional crystal spike)
    draw.point((ox + 7, oy + 1 + bob), fill=PRISM_LIGHT)
    draw.point((ox + 8, oy + 1 + bob), fill=PRISM_EDGE)

    # Arms and attack
    if is_attack:
        burst = [0, 2, 4, 2][anim]
        # Arms raised for dimensional slam
        draw.rectangle([ox + 1, oy + 5 + bob - burst, ox + 3, oy + 10 + bob], fill=GUARDIAN_BODY_L)
        draw.rectangle([ox + 12, oy + 5 + bob - burst, ox + 14, oy + 10 + bob], fill=GUARDIAN_BODY_L)
        # Energy gauntlets charging
        draw.point((ox + 1, oy + 5 + bob - burst), fill=NEXUS_GLOW)
        draw.point((ox + 14, oy + 5 + bob - burst), fill=NEXUS_GLOW)
        # Dimensional shockwave below
        if burst >= 2:
            draw.point((ox + 2, oy + 4 + bob - burst), fill=RIFT_BRIGHT)
            draw.point((ox + 13, oy + 4 + bob - burst), fill=RIFT_BRIGHT)
            draw.point((ox + 7, oy + 15), fill=NEXUS_BRIGHT)
            draw.point((ox + 8, oy + 15), fill=NEXUS_BRIGHT)
    else:
        # Idle arms with dimensional halberd
        draw.rectangle([ox + 1, oy + 7 + bob, ox + 3, oy + 12 + bob], fill=GUARDIAN_BODY)
        draw.rectangle([ox + 12, oy + 7 + bob, ox + 14, oy + 12 + bob], fill=GUARDIAN_BODY)
        # Halberd in right hand
        draw.rectangle([ox + 14, oy + 3 + bob, ox + 14, oy + 13 + bob], fill=RUNE_MED)
        draw.point((ox + 14, oy + 2 + bob), fill=NEXUS_BRIGHT)
        draw.point((ox + 13, oy + 3 + bob), fill=PRISM_LIGHT)


def generate_nexus_guardian():
    """Generate 8-frame Nexus Guardian sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_nexus_guardian(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_nexus_guardian.png")
    return img


# =========================================================================
# ENEMY 2: PHASE STRIDER -- phase-shifting creature, 16x16, 8 frames
# Frames 0-3: float/phase, Frames 4-7: attack (rift tear)
# =========================================================================

def draw_phase_strider(draw, ox, oy, frame):
    """Draw a single 16x16 Phase Strider frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [0, -1, -2, -1][anim]
    phase_shift = [0, 1, 2, 1][anim]

    # Lower tendrils (phase-shifting legs, wispy)
    draw.rectangle([ox + 6, oy + 12 + float_y, ox + 7, oy + 15], fill=STRIDER_TRAIL)
    draw.rectangle([ox + 9, oy + 12 + float_y, ox + 10, oy + 15], fill=STRIDER_TRAIL)
    # Flickering trail below
    draw.point((ox + 5, oy + 14 + float_y), fill=STRIDER_TRAIL_L)
    draw.point((ox + 10, oy + 14 + float_y), fill=STRIDER_TRAIL_L)

    # Central body (semi-transparent, shifting form)
    draw.rectangle([ox + 5, oy + 5 + float_y, ox + 10, oy + 12 + float_y], fill=STRIDER_BODY)
    draw.rectangle([ox + 6, oy + 6 + float_y, ox + 9, oy + 11 + float_y], fill=STRIDER_BODY_D)
    # Rift core (pulsing violet energy)
    draw.rectangle([ox + 7, oy + 7 + float_y, ox + 8, oy + 10 + float_y], fill=STRIDER_CORE)
    # Phase flicker edges
    if phase_shift > 0:
        draw.point((ox + 4 - phase_shift, oy + 8 + float_y), fill=STRIDER_TRAIL)
        draw.point((ox + 11 + phase_shift, oy + 8 + float_y), fill=STRIDER_TRAIL)
    # Dimensional crack lines on body
    draw.point((ox + 5, oy + 7 + float_y), fill=STRIDER_EDGE)
    draw.point((ox + 10, oy + 9 + float_y), fill=STRIDER_EDGE)

    # Head (elongated, with cyan eye)
    draw.rectangle([ox + 6, oy + 2 + float_y, ox + 9, oy + 5 + float_y], fill=STRIDER_BODY)
    draw.rectangle([ox + 7, oy + 3 + float_y, ox + 8, oy + 4 + float_y], fill=STRIDER_BODY_D)
    # Eyes (single large cyan eye)
    draw.point((ox + 7, oy + 3 + float_y), fill=STRIDER_EYE)
    draw.point((ox + 8, oy + 3 + float_y), fill=STRIDER_EYE)
    # Antenna/horns (dimensional probes)
    draw.point((ox + 6, oy + 1 + float_y), fill=STRIDER_FLICKER)
    draw.point((ox + 9, oy + 1 + float_y), fill=STRIDER_FLICKER)

    if is_attack:
        burst = [0, 2, 3, 1][anim]
        # Rift tear projectiles
        for sx in range(burst + 1):
            draw.point((ox + 4 - sx, oy + 7 + float_y), fill=STRIDER_EDGE)
            draw.point((ox + 11 + sx, oy + 9 + float_y), fill=STRIDER_EDGE)
        if burst >= 2:
            draw.point((ox + 3 - burst, oy + 6 + float_y), fill=STRIDER_FLICKER)
            draw.point((ox + 12 + burst, oy + 10 + float_y), fill=STRIDER_FLICKER)
            draw.point((ox + 3 - burst, oy + 8 + float_y), fill=STRIDER_CORE)
        # Core overcharge
        draw.rectangle([ox + 6, oy + 6 + float_y, ox + 9, oy + 11 + float_y], fill=STRIDER_CORE)
        draw.point((ox + 7, oy + 8 + float_y), fill=STRIDER_GLOW)
        draw.point((ox + 8, oy + 8 + float_y), fill=STRIDER_GLOW)
    else:
        # Ambient phase particles
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 4 + sway, oy + 6 + float_y), fill=STRIDER_TRAIL)
        draw.point((ox + 11 - sway, oy + 10 + float_y), fill=STRIDER_TRAIL)


def generate_phase_strider():
    """Generate 8-frame Phase Strider sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_phase_strider(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_phase_strider.png")
    return img


# =========================================================================
# ENEMY 3: ENERGY PARASITE -- translucent feeder, 16x16, 8 frames
# Frames 0-3: drift/pulse, Frames 4-7: attack (energy drain)
# =========================================================================

def draw_energy_parasite(draw, ox, oy, frame):
    """Draw a single 16x16 Energy Parasite frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [-1, 0, 1, 0][anim]
    pulse = [0, 1, 2, 1][anim]

    # Trailing tendrils (energy feeders)
    draw.rectangle([ox + 5, oy + 12 + float_y, ox + 6, oy + 15], fill=PARASITE_TRAIL)
    draw.rectangle([ox + 9, oy + 12 + float_y, ox + 10, oy + 15], fill=PARASITE_TRAIL)
    draw.point((ox + 7, oy + 13 + float_y), fill=PARASITE_TRAIL_L)
    draw.point((ox + 8, oy + 14 + float_y), fill=PARASITE_TRAIL_L)

    # Body (translucent jellyfish-like dome)
    draw.rectangle([ox + 4, oy + 5 + float_y, ox + 11, oy + 12 + float_y], fill=PARASITE_BODY)
    draw.rectangle([ox + 5, oy + 6 + float_y, ox + 10, oy + 11 + float_y], fill=PARASITE_BODY_D)
    # Energy veins visible through body
    draw.point((ox + 6, oy + 7 + float_y), fill=PARASITE_VEIN)
    draw.point((ox + 9, oy + 9 + float_y), fill=PARASITE_VEIN)
    draw.point((ox + 5, oy + 10 + float_y), fill=PARASITE_VEIN)
    draw.point((ox + 10, oy + 7 + float_y), fill=PARASITE_VEIN)
    # Inner energy core (pulsing cyan)
    draw.rectangle([ox + 7, oy + 8 + float_y, ox + 8, oy + 9 + float_y], fill=PARASITE_CORE)
    # Expanding energy halo on pulse
    if pulse > 0:
        draw.point((ox + 4 - pulse, oy + 8 + float_y), fill=PARASITE_TRAIL)
        draw.point((ox + 11 + pulse, oy + 8 + float_y), fill=PARASITE_TRAIL)

    # Dome top (rounded, with sensor spots)
    draw.rectangle([ox + 5, oy + 3 + float_y, ox + 10, oy + 5 + float_y], fill=PARASITE_BODY)
    draw.point((ox + 7, oy + 2 + float_y), fill=PARASITE_EDGE)
    draw.point((ox + 8, oy + 2 + float_y), fill=PARASITE_EDGE)
    # Gold sensor eyes
    draw.point((ox + 6, oy + 4 + float_y), fill=PARASITE_EYE)
    draw.point((ox + 9, oy + 4 + float_y), fill=PARASITE_EYE)

    if is_attack:
        drain = [0, 2, 3, 1][anim]
        # Energy drain beams extending downward
        for dy in range(drain + 1):
            draw.point((ox + 5, oy + 13 + float_y + dy), fill=PARASITE_EDGE)
            draw.point((ox + 10, oy + 13 + float_y + dy), fill=PARASITE_EDGE)
        if drain >= 2:
            # Draining aura
            draw.point((ox + 6, oy + 14 + float_y), fill=PARASITE_CORE)
            draw.point((ox + 9, oy + 14 + float_y), fill=PARASITE_CORE)
            draw.point((ox + 7, oy + 15), fill=PARASITE_GLOW)
            draw.point((ox + 8, oy + 15), fill=PARASITE_GLOW)
        # Body brightens as it feeds
        draw.rectangle([ox + 6, oy + 7 + float_y, ox + 9, oy + 10 + float_y], fill=PARASITE_CORE)
        draw.point((ox + 7, oy + 8 + float_y), fill=PARASITE_GLOW)
        draw.point((ox + 8, oy + 8 + float_y), fill=PARASITE_GLOW)
    else:
        # Ambient drift particles
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 3 + sway, oy + 7 + float_y), fill=PARASITE_TRAIL_L)
        draw.point((ox + 12 - sway, oy + 9 + float_y), fill=PARASITE_TRAIL_L)


def generate_energy_parasite():
    """Generate 8-frame Energy Parasite sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_energy_parasite(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_energy_parasite.png")
    return img


# =========================================================================
# BOSS: THE NEXUS OVERSEER -- controller of convergence, 32x32
# Massive dimensional entity with crystallized armor and rift energy
# =========================================================================

def draw_nexus_overseer(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw The Nexus Overseer boss at 32x32."""
    anim = frame % 4
    breath = [0, -1, 0, 1][anim]

    # Phase color shifts
    body = OVERSEER_BODY
    armor = OVERSEER_ARMOR
    eye = OVERSEER_EYE
    flame = OVERSEER_FLAME
    rune = OVERSEER_RUNE
    glow = OVERSEER_GLOW
    crown = OVERSEER_CROWN
    magic = OVERSEER_MAGIC
    if phase == 2:
        body = (70, 45, 150, 255)            # intensified dimensional
        armor = (100, 96, 130, 255)
        eye = RUNE_GLOW
        flame = (220, 150, 255, 255)
        rune = RUNE_GLOW
        glow = (245, 230, 255, 255)
        crown = RUNE_BRIGHT
    elif phase == 3:
        body = (110, 70, 200, 255)           # full nexus overcharge
        armor = (115, 110, 145, 255)
        eye = (255, 250, 255, 255)
        magic = NEXUS_GLOW
        flame = (240, 200, 255, 255)
        glow = (250, 245, 255, 255)
        crown = (220, 200, 250, 255)

    outline = OUTLINE

    # Legs -- massive, crystallized stone
    draw.rectangle([ox + 9, oy + 22 + breath, ox + 13, oy + 27], fill=body)
    draw.rectangle([ox + 18, oy + 22 + breath, ox + 22, oy + 27], fill=body)
    # Crystal-encrusted boots
    draw.rectangle([ox + 8, oy + 27, ox + 14, oy + 30], fill=armor)
    draw.rectangle([ox + 17, oy + 27, ox + 23, oy + 30], fill=armor)
    # Rune trim on boots
    draw.point((ox + 10, oy + 28), fill=rune)
    draw.point((ox + 20, oy + 28), fill=rune)

    # Dimensional torso with nexus plating
    draw.rectangle([ox + 8, oy + 12 + breath, ox + 23, oy + 22 + breath], fill=OVERSEER_CAPE)
    draw.rectangle([ox + 9, oy + 13 + breath, ox + 22, oy + 21 + breath], fill=OVERSEER_CAPE_L)
    # Chest nexus plate
    draw.rectangle([ox + 11, oy + 14 + breath, ox + 20, oy + 20 + breath], fill=armor)
    draw.rectangle([ox + 12, oy + 15 + breath, ox + 19, oy + 19 + breath], fill=OVERSEER_ARMOR_D)
    # Nexus convergence core in chest
    draw.rectangle([ox + 14, oy + 16 + breath, ox + 17, oy + 18 + breath], fill=flame)
    draw.point((ox + 15, oy + 17 + breath), fill=glow)
    draw.point((ox + 16, oy + 17 + breath), fill=glow)
    # Rune veins on armor
    draw.point((ox + 12, oy + 15 + breath), fill=rune)
    draw.point((ox + 19, oy + 15 + breath), fill=rune)
    draw.point((ox + 12, oy + 19 + breath), fill=rune)
    draw.point((ox + 19, oy + 19 + breath), fill=rune)

    # Shoulder crystals (large, prismatic)
    draw.rectangle([ox + 4, oy + 10 + breath, ox + 9, oy + 14 + breath], fill=armor)
    draw.point((ox + 5, oy + 10 + breath), fill=rune)
    draw.point((ox + 5, oy + 11 + breath), fill=NEXUS_BRIGHT)
    draw.rectangle([ox + 22, oy + 10 + breath, ox + 27, oy + 14 + breath], fill=armor)
    draw.point((ox + 26, oy + 10 + breath), fill=rune)
    draw.point((ox + 26, oy + 11 + breath), fill=NEXUS_BRIGHT)
    # Rift wisps off shoulder crystals
    draw.point((ox + 6, oy + 12 + breath), fill=flame)
    draw.point((ox + 25, oy + 12 + breath), fill=flame)

    # Cape (dimensional fabric, shifting)
    cape_wave = [0, 1, 2, 1][anim]
    draw.rectangle([ox + 10, oy + 20 + breath, ox + 21, oy + 24 + breath + cape_wave], fill=OVERSEER_CAPE)
    draw.point((ox + 11, oy + 24 + breath + cape_wave), fill=OVERSEER_CAPE_L)
    draw.point((ox + 20, oy + 24 + breath + cape_wave), fill=OVERSEER_CAPE_L)

    # Head (crystalline helm with dimensional crown)
    draw.rectangle([ox + 11, oy + 5 + breath, ox + 20, oy + 12 + breath], fill=body)
    draw.rectangle([ox + 12, oy + 6 + breath, ox + 19, oy + 11 + breath], fill=OVERSEER_BODY_D)
    # Face plate (prismatic mask)
    draw.rectangle([ox + 13, oy + 7 + breath, ox + 18, oy + 10 + breath], fill=armor)
    # Nexus eyes (blazing teal)
    draw.rectangle([ox + 13, oy + 8 + breath, ox + 14, oy + 9 + breath], fill=outline)
    draw.point((ox + 13, oy + 8 + breath), fill=eye)
    draw.rectangle([ox + 17, oy + 8 + breath, ox + 18, oy + 9 + breath], fill=outline)
    draw.point((ox + 18, oy + 8 + breath), fill=eye)

    # Dimensional crown (prismatic crystal spires)
    draw.rectangle([ox + 12, oy + 4 + breath, ox + 19, oy + 5 + breath], fill=crown)
    draw.point((ox + 14, oy + 3 + breath), fill=crown)
    draw.point((ox + 15, oy + 2 + breath), fill=OVERSEER_CROWN_G)
    draw.point((ox + 16, oy + 2 + breath), fill=OVERSEER_CROWN_G)
    draw.point((ox + 17, oy + 3 + breath), fill=crown)
    # Crown center gem (nexus convergence crystal)
    draw.point((ox + 15, oy + 3 + breath), fill=flame)
    draw.point((ox + 16, oy + 3 + breath), fill=flame)
    # Crown tips (rift energy rising)
    draw.point((ox + 13, oy + 2 + breath), fill=INDIGO_BRIGHT)
    draw.point((ox + 15, oy + 1 + breath), fill=RIFT_GLOW)
    draw.point((ox + 16, oy + 1 + breath), fill=RIFT_GLOW)
    draw.point((ox + 18, oy + 2 + breath), fill=INDIGO_BRIGHT)

    # Arms
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        attack_ext = [0, 2, 4, 2][anim]
        # Arms raised, nexus convergence eruption
        draw.rectangle([ox + 4, oy + 12 + breath - attack_ext, ox + 8, oy + 18 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 12 + breath - attack_ext, ox + 27, oy + 18 + breath], fill=body)
        # Crystal gauntlets
        draw.rectangle([ox + 3, oy + 12 + breath - attack_ext, ox + 5, oy + 13 + breath - attack_ext], fill=armor)
        draw.rectangle([ox + 26, oy + 12 + breath - attack_ext, ox + 28, oy + 13 + breath - attack_ext], fill=armor)
        # Rift energy between hands
        if attack_ext >= 2:
            for rx in range(6, 26, 2):
                ry = 11 + breath - attack_ext + random.randint(-1, 1)
                if 0 <= oy + ry < 32:
                    draw.point((ox + rx, oy + ry), fill=flame)
            # Central nexus flare
            draw.rectangle([ox + 13, oy + 10 + breath - attack_ext, ox + 18, oy + 12 + breath - attack_ext], fill=magic)
            draw.point((ox + 15, oy + 11 + breath - attack_ext), fill=glow)
            draw.point((ox + 16, oy + 11 + breath - attack_ext), fill=glow)
        # Dimensional cracks on ground
        if attack_ext >= 3:
            for gx in range(3, 29, 3):
                draw.point((ox + gx, oy + 30), fill=flame)
                draw.point((ox + gx, oy + 31), fill=INDIGO_DARK)
    else:
        # Idle arms with nexus scepter
        draw.rectangle([ox + 4, oy + 14 + breath, ox + 8, oy + 22 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 14 + breath, ox + 27, oy + 22 + breath], fill=body)
        # Crystal gauntlets
        draw.rectangle([ox + 3, oy + 20 + breath, ox + 5, oy + 22 + breath], fill=armor)
        draw.rectangle([ox + 26, oy + 20 + breath, ox + 28, oy + 22 + breath], fill=armor)
        draw.point((ox + 4, oy + 20 + breath), fill=rune)
        draw.point((ox + 27, oy + 20 + breath), fill=rune)
        # Nexus scepter in right hand (convergence rod)
        draw.rectangle([ox + 27, oy + 8 + breath, ox + 27, oy + 22 + breath], fill=OVERSEER_WEAPON)
        draw.rectangle([ox + 26, oy + 6 + breath, ox + 28, oy + 8 + breath], fill=rune)
        draw.point((ox + 27, oy + 5 + breath), fill=glow)
        # Floating rift energy around scepter top
        draw.point((ox + 26, oy + 4 + breath + arm_wave), fill=flame)
        draw.point((ox + 28, oy + 4 + breath + arm_wave), fill=flame)
        draw.point((ox + 27, oy + 3 + breath + arm_wave), fill=RIFT_GLOW)

    # Ambient dimensional particles rising from body
    for tx in range(10, 22, 3):
        ty = 28 + (anim + tx) % 4
        if ty < 32:
            draw.point((ox + tx, oy + ty), fill=INDIGO_BRIGHT)
    # Crown blazing with nexus energy
    draw.point((ox + 14, oy + 2 + breath), fill=flame)
    draw.point((ox + 15, oy + 1 + breath), fill=glow)
    draw.point((ox + 16, oy + 1 + breath), fill=glow)
    draw.point((ox + 17, oy + 2 + breath), fill=flame)


def generate_nexus_overseer():
    """Generate all Nexus Overseer boss sprite sheets."""
    random.seed(209)

    # Idle
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_nexus_overseer(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_nexus_overseer_idle.png")

    # Attack -- 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        random.seed(209 + f)
        draw_nexus_overseer(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_nexus_overseer_attack.png")

    # Phase 1
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_nexus_overseer(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_nexus_overseer_phase1.png")

    # Phase 2 -- dimensional surge
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_nexus_overseer(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_nexus_overseer_phase2.png")

    # Phase 3 -- full nexus overcharge
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_nexus_overseer(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_nexus_overseer_phase3.png")


# =========================================================================
# NPC: DIMENSIONAL WEAVER -- zone quest giver, 16x24
# Ethereal robed figure who navigates between converging planes
# =========================================================================

def draw_dimensional_weaver(draw, ox, oy):
    """Draw the Dimensional Weaver NPC at 16x24."""
    # Feet / boots (dimensional traveler boots)
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=PRISM_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=PRISM_DARK)

    # Robe (long, with dimensional shimmer)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=WEAVER_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=WEAVER_ROBE_L)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=WEAVER_ROBE)
    # Indigo trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=WEAVER_TRIM)

    # Belt with nexus clasp
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=WEAVER_BELT)
    # Nexus crystal pendant
    draw.point((ox + 8, oy + 15), fill=NEXUS_BRIGHT)
    draw.point((ox + 8, oy + 16), fill=INDIGO_MED)

    # Arms (in robe sleeves)
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=WEAVER_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=WEAVER_ROBE)
    # Indigo cuffs
    draw.point((ox + 2, oy + 16), fill=WEAVER_TRIM)
    draw.point((ox + 14, oy + 16), fill=WEAVER_TRIM)
    # Hands
    draw.point((ox + 2, oy + 17), fill=WEAVER_SKIN)
    draw.point((ox + 14, oy + 17), fill=WEAVER_SKIN)

    # Dimensional rift orb (held in left hand)
    draw.rectangle([ox + 1, oy + 15, ox + 3, oy + 18], fill=NEXUS_DARK)
    draw.point((ox + 2, oy + 16), fill=NEXUS_BRIGHT)
    # Glowing core inside orb
    draw.rectangle([ox + 1, oy + 16, ox + 1, oy + 17], fill=NEXUS_GLOW)

    # Staff (right hand -- nexus-touched rod)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=WEAVER_STAFF)
    # Convergence crystal at top of staff
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=INDIGO_DARK)
    draw.point((ox + 14, oy + 1), fill=WEAVER_STAFF_ORB)
    draw.point((ox + 14, oy + 2), fill=NEXUS_BRIGHT)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=WEAVER_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=WEAVER_SKIN)

    # Hood (deep, dimensional-touched)
    draw.rectangle([ox + 4, oy + 2, ox + 12, oy + 5], fill=WEAVER_HOOD)
    draw.point((ox + 4, oy + 5), fill=WEAVER_HOOD)
    draw.point((ox + 4, oy + 6), fill=WEAVER_HOOD)
    draw.point((ox + 12, oy + 5), fill=WEAVER_HOOD)
    draw.point((ox + 12, oy + 6), fill=WEAVER_HOOD)

    # Glowing nexus eyes (dimensional sight)
    draw.point((ox + 6, oy + 6), fill=WEAVER_EYES)
    draw.point((ox + 10, oy + 6), fill=WEAVER_EYES)
    # Rift mark on forehead
    draw.point((ox + 8, oy + 5), fill=NEXUS_BRIGHT)

    # Circlet under hood (rune-studded)
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 4], fill=INDIGO_BRIGHT)
    draw.point((ox + 8, oy + 3), fill=NEXUS_BRIGHT)


def generate_dimensional_weaver():
    """Generate Dimensional Weaver NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_dimensional_weaver(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_ethereal_nexus.png")
    return img


# =========================================================================
# TILESET -- tileset_ethereal_nexus.png (256x64, 16 cols x 4 rows)
# =========================================================================

def c(color, alpha=None):
    """Create a color tuple with optional alpha override."""
    if alpha is not None:
        return (color[0], color[1], color[2], min(255, max(0, alpha)))
    return color


def draw_tile(img, col, row, tile_fn):
    """Draw a 16x16 tile at grid position."""
    tile = Image.new("RGBA", (16, 16), TRANSPARENT)
    tile_fn(tile)
    img.paste(tile, (col * 16, row * 16), tile)


def tile_nexus_platform(tile):
    """Solid nexus crystal platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([1, 1, 14, 14], fill=TILE_PLAT_L)
    # Nexus energy seams
    d.point((4, 4), fill=TILE_NEXUS)
    d.point((11, 7), fill=TILE_NEXUS)
    d.point((7, 12), fill=TILE_NEXUS)
    # Crystal edge highlight
    d.rectangle([0, 0, 15, 0], fill=TILE_PLAT_E)


def tile_rift_floor(tile):
    """Floor with dimensional rift cracks."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    # Rift crack pattern
    d.rectangle([3, 3, 4, 12], fill=TILE_INDIGO)
    d.rectangle([8, 1, 9, 8], fill=TILE_INDIGO)
    d.rectangle([12, 6, 13, 14], fill=TILE_INDIGO)
    # Rift glow in cracks
    d.point((3, 6), fill=TILE_NEXUS_L)
    d.point((8, 4), fill=TILE_NEXUS_L)
    d.point((12, 10), fill=TILE_NEXUS_L)
    # Rune marks
    d.point((6, 8), fill=TILE_RUNE)
    d.point((10, 3), fill=TILE_RUNE)


def tile_convergence_pillar(tile):
    """Vertical convergence energy pillar."""
    d = ImageDraw.Draw(tile)
    d.rectangle([5, 0, 10, 15], fill=TILE_PLAT_L)
    d.rectangle([6, 0, 9, 15], fill=TILE_PLAT_E)
    # Nexus energy flowing through pillar
    d.rectangle([7, 0, 8, 15], fill=TILE_NEXUS)
    # Energy nodes along pillar
    d.point((7, 3), fill=TILE_NEXUS_L)
    d.point((8, 7), fill=TILE_NEXUS_L)
    d.point((7, 11), fill=TILE_NEXUS_L)
    # Crystal cap
    d.rectangle([4, 0, 11, 1], fill=TILE_PLAT_E)
    d.point((7, 0), fill=NEXUS_GLOW)
    d.point((8, 0), fill=NEXUS_GLOW)


def tile_dimensional_rift(tile):
    """Active dimensional rift tear."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Rift tear (diagonal energy slash)
    for i in range(12):
        x = 2 + i
        y = 2 + int(i * 0.8)
        if 0 <= x < 16 and 0 <= y < 16:
            d.point((x, y), fill=RIFT_BRIGHT)
            if y + 1 < 16:
                d.point((x, y + 1), fill=RIFT_MED)
    # Energy bleeding from rift
    d.point((5, 5), fill=NEXUS_BRIGHT)
    d.point((10, 9), fill=NEXUS_BRIGHT)
    # Void visible through rift
    d.point((7, 7), fill=INDIGO_GLOW)
    d.point((8, 8), fill=INDIGO_GLOW)


def tile_wall_top(tile):
    """Wall top with crystal inlay."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    d.rectangle([0, 0, 15, 3], fill=TILE_STONE_L)
    d.rectangle([0, 12, 15, 15], fill=TILE_STONE_D)
    # Crystal inlay
    d.point((4, 7), fill=TILE_NEXUS)
    d.point((11, 7), fill=TILE_NEXUS)
    d.point((7, 5), fill=TILE_INDIGO)
    d.point((8, 10), fill=TILE_INDIGO)
    # Top edge glow
    d.rectangle([0, 0, 15, 0], fill=TILE_PLAT_E)


def tile_nexus_crystal_cluster(tile):
    """Cluster of nexus energy crystals."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Main crystal (tall, center)
    d.rectangle([6, 2, 9, 13], fill=PRISM_MED)
    d.rectangle([7, 3, 8, 12], fill=PRISM_LIGHT)
    d.point((7, 1), fill=PRISM_EDGE)
    # Side crystals
    d.rectangle([3, 6, 5, 13], fill=PRISM_MED)
    d.point((4, 5), fill=PRISM_LIGHT)
    d.rectangle([10, 5, 12, 13], fill=PRISM_MED)
    d.point((11, 4), fill=PRISM_LIGHT)
    # Nexus energy glow
    d.point((7, 7), fill=NEXUS_BRIGHT)
    d.point((4, 9), fill=NEXUS_MED)
    d.point((11, 8), fill=NEXUS_MED)


def tile_void_gap(tile):
    """Empty void gap between platforms."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=INDIGO_BLACK)
    # Distant dimensional shimmer
    d.point((4, 5), fill=c(INDIGO_DARK, 120))
    d.point((11, 10), fill=c(INDIGO_DARK, 120))
    d.point((7, 13), fill=c(RIFT_DEEP, 80))
    d.point((2, 8), fill=c(NEXUS_DARK, 60))


def tile_convergence_dais(tile):
    """Raised dais where energy converges."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([2, 2, 13, 13], fill=TILE_PLAT_L)
    d.rectangle([4, 4, 11, 11], fill=TILE_PLAT_E)
    # Convergence rune pattern (cross)
    d.rectangle([7, 2, 8, 13], fill=TILE_NEXUS)
    d.rectangle([2, 7, 13, 8], fill=TILE_NEXUS)
    # Center glow
    d.rectangle([6, 6, 9, 9], fill=NEXUS_BRIGHT)
    d.point((7, 7), fill=NEXUS_GLOW)
    d.point((8, 8), fill=NEXUS_GLOW)


def tile_rune_plate(tile):
    """Floor plate with dimensional rune inscriptions."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([1, 1, 14, 14], fill=TILE_PLAT_L)
    # Rune circle border
    for angle in range(0, 360, 30):
        rx = 7 + int(5 * math.cos(math.radians(angle)))
        ry = 7 + int(5 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            d.point((rx, ry), fill=TILE_RUNE)
    # Center rune
    d.point((7, 7), fill=TILE_RUNE)
    d.point((8, 7), fill=TILE_RUNE)
    d.point((7, 8), fill=RUNE_BRIGHT)


def tile_rift_portal(tile):
    """Active portal to another dimension."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Portal ring
    for angle in range(0, 360, 20):
        rx = 7 + int(6 * math.cos(math.radians(angle)))
        ry = 7 + int(6 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            d.point((rx, ry), fill=RIFT_BRIGHT)
    # Inner swirl
    for angle in range(0, 360, 40):
        rx = 7 + int(3 * math.cos(math.radians(angle)))
        ry = 7 + int(3 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            d.point((rx, ry), fill=INDIGO_GLOW)
    # Center void
    d.rectangle([6, 6, 9, 9], fill=INDIGO_BLACK)
    d.point((7, 7), fill=RIFT_GLOW)
    d.point((8, 8), fill=RIFT_GLOW)


def tile_ethereal_carpet(tile):
    """Woven ethereal fabric floor covering."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    # Checkerboard shimmer pattern
    for x in range(0, 16, 4):
        for y in range(0, 16, 4):
            d.rectangle([x, y, x + 1, y + 1], fill=TILE_INDIGO)
    # Occasional nexus thread
    d.point((3, 3), fill=TILE_NEXUS)
    d.point((11, 11), fill=TILE_NEXUS)
    d.point((7, 7), fill=TILE_NEXUS_L)


def tile_edge_top(tile):
    """Platform top edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TRANSPARENT)
    d.rectangle([0, 8, 15, 15], fill=TILE_PLAT)
    d.rectangle([0, 8, 15, 8], fill=TILE_PLAT_E)
    d.rectangle([0, 9, 15, 9], fill=TILE_PLAT_L)


def tile_edge_bottom(tile):
    """Platform bottom edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TRANSPARENT)
    d.rectangle([0, 0, 15, 7], fill=TILE_PLAT)
    d.rectangle([0, 6, 15, 7], fill=TILE_PLAT_D)
    d.rectangle([0, 7, 15, 7], fill=TILE_STONE_D)


def tile_edge_left(tile):
    """Platform left edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TRANSPARENT)
    d.rectangle([8, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([8, 0, 8, 15], fill=TILE_PLAT_E)
    d.rectangle([9, 0, 9, 15], fill=TILE_PLAT_L)


def tile_edge_right(tile):
    """Platform right edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TRANSPARENT)
    d.rectangle([0, 0, 7, 15], fill=TILE_PLAT)
    d.rectangle([6, 0, 7, 15], fill=TILE_PLAT_D)
    d.rectangle([7, 0, 7, 15], fill=TILE_STONE_D)


def tile_stone_variant1(tile):
    """Crystal-veined stone variant 1."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    d.rectangle([1, 1, 14, 14], fill=TILE_STONE_L)
    # Crystal veins
    d.point((3, 5), fill=TILE_NEXUS)
    d.point((4, 6), fill=TILE_NEXUS)
    d.point((10, 3), fill=TILE_INDIGO)
    d.point((12, 11), fill=TILE_INDIGO)
    # Cracks
    d.point((7, 9), fill=TILE_STONE_D)
    d.point((8, 10), fill=TILE_STONE_D)


def tile_stone_variant2(tile):
    """Crystal-veined stone variant 2."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    d.rectangle([1, 1, 14, 14], fill=TILE_STONE_L)
    # Different vein pattern
    d.point((5, 10), fill=TILE_NEXUS)
    d.point((6, 11), fill=TILE_NEXUS)
    d.point((11, 4), fill=TILE_INDIGO)
    d.point((3, 8), fill=TILE_INDIGO)
    # Cracks
    d.point((9, 6), fill=TILE_STONE_D)
    d.point((10, 7), fill=TILE_STONE_D)


def generate_tileset():
    """Generate tileset_ethereal_nexus.png (256x64)."""
    random.seed(209)
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground / terrain tiles
    row0 = [
        tile_nexus_platform, tile_rift_floor, tile_convergence_dais, tile_void_gap,
        tile_dimensional_rift, tile_wall_top, tile_nexus_crystal_cluster, tile_rift_portal,
        tile_stone_variant1, tile_stone_variant2, tile_edge_top, tile_edge_bottom,
        tile_edge_left, tile_edge_right, tile_rune_plate, tile_nexus_platform,
    ]
    for i, fn in enumerate(row0):
        random.seed(209 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Features and decorations
    row1 = [
        tile_convergence_pillar, tile_rift_portal, tile_rune_plate, tile_convergence_dais,
        tile_nexus_platform, tile_rift_floor, tile_void_gap, tile_dimensional_rift,
        tile_wall_top, tile_edge_top, tile_stone_variant1, tile_stone_variant2,
        tile_edge_left, tile_edge_right, tile_ethereal_carpet, tile_nexus_crystal_cluster,
    ]
    for i, fn in enumerate(row1):
        random.seed(209 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions
    row2 = [
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_void_gap, tile_void_gap, tile_nexus_platform, tile_dimensional_rift,
        tile_nexus_platform, tile_rift_floor, tile_dimensional_rift, tile_wall_top,
        tile_rune_plate, tile_rift_portal, tile_nexus_crystal_cluster, tile_convergence_dais,
    ]
    for i, fn in enumerate(row2):
        random.seed(209 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: Variants and fill
    row3 = [
        tile_rift_portal, tile_rune_plate, tile_convergence_pillar, tile_convergence_dais,
        tile_wall_top, tile_dimensional_rift, tile_void_gap, tile_nexus_platform,
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_stone_variant1, tile_stone_variant2, tile_ethereal_carpet, tile_rift_floor,
    ]
    for i, fn in enumerate(row3):
        random.seed(209 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(209)
    out = TILESETS_DIR / "tileset_ethereal_nexus.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# PARALLAX BACKGROUNDS -- 320x180, three layers (far/mid/near)
# =========================================================================

def generate_parallax():
    """Three parallax layers for Ethereal Nexus zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # -- FAR LAYER: swirling dimensional void with converging plane rifts --
    far = Image.new("RGBA", (320, 180), SKY_VOID)
    fd = ImageDraw.Draw(far)
    # Dimensional void gradient (top = void, bottom = deep indigo)
    for y in range(180):
        ratio = y / 180
        r = int(SKY_VOID[0] * (1 - ratio) + SKY_DEEP[0] * ratio)
        g = int(SKY_VOID[1] * (1 - ratio) + SKY_DEEP[1] * ratio)
        b = int(SKY_VOID[2] * (1 - ratio) + SKY_DEEP[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    # Massive dimensional convergence rift across sky
    random.seed(209)
    rift_cx, rift_cy = 160, 55
    for tx in range(-70, 71):
        ty = int(tx * 0.35 + 8 * math.sin(tx * 0.08) + random.randint(-2, 2))
        px, py = rift_cx + tx, rift_cy + ty
        if 0 <= px < 320 and 0 <= py < 180:
            dist = abs(tx) / 70
            alpha = int(180 * (1 - dist))
            if alpha > 0:
                far.putpixel((px, py), c(RIFT_BRIGHT, min(alpha, 200)))
                for dy in range(-2, 3):
                    if 0 <= py + dy < 180:
                        ga = int(alpha * 0.3 * (1 - abs(dy) / 3))
                        if ga > 0:
                            far.putpixel((px, py + dy), c(INDIGO_DARK, ga))

    # Scattered dimensional nebula clouds
    for _ in range(6):
        nx = random.randint(20, 300)
        ny = random.randint(10, 80)
        nw = random.randint(30, 60)
        nh = random.randint(8, 20)
        cloud_color = random.choice([INDIGO_DARK, NEXUS_DEEP, PRISM_DARK])
        for px in range(nx, nx + nw):
            for py in range(ny, ny + nh):
                if 0 <= px < 320 and 0 <= py < 180:
                    dist = ((px - nx - nw / 2) ** 2 + (py - ny - nh / 2) ** 2) ** 0.5
                    max_dist = (nw / 2 + nh / 2) / 2
                    if dist < max_dist:
                        alpha = int(30 * (1 - dist / max_dist))
                        if alpha > 0:
                            far.putpixel((px, py), c(cloud_color, alpha))

    # Dim convergence sparks across sky
    for _ in range(25):
        sx, sy = random.randint(0, 319), random.randint(0, 100)
        alpha = random.randint(40, 120)
        spark_color = random.choice([INDIGO_MED, NEXUS_MED, RUNE_DIM])
        far.putpixel((sx, sy), c(spark_color, alpha))

    # Distant crystallized spacetime formations on horizon
    formation_positions = [(15, 130), (70, 118), (140, 132), (220, 122), (285, 128)]
    for fp_x, fp_y in formation_positions:
        fw = random.randint(8, 16)
        fh = random.randint(18, 40)
        # Formation body (dark crystal chunk)
        fd.rectangle([fp_x, fp_y - fh, fp_x + fw, fp_y], fill=c(PRISM_DARK))
        # Crumbling top
        fd.rectangle([fp_x + fw // 4, fp_y - fh - 6, fp_x + fw - fw // 4, fp_y - fh], fill=c(PRISM_DARK))
        fd.point((fp_x + fw // 2, fp_y - fh - 8), fill=c(PRISM_DARK))
        # Nexus glow at tip
        fd.point((fp_x + fw // 2, fp_y - fh - 7), fill=c(NEXUS_BRIGHT, 120))
        # Faint internal glow
        fd.point((fp_x + fw // 2, fp_y - fh + 5), fill=c(INDIGO_DARK, 80))

    # Horizon glow (dimensional indigo)
    for y in range(140, 180):
        ratio = (y - 140) / 40
        alpha = int(60 * ratio)
        if alpha > 0:
            fd.line([(0, y), (319, y)], fill=c(SKY_GLOW, alpha))

    far_out = PARALLAX_DIR / "bg_parallax_ethereal_nexus_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # -- MID LAYER: converging energy planes and floating crystal platforms --
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(210)

    # Dimensional energy clouds
    for _ in range(5):
        cx = random.randint(-20, 300)
        cy = random.randint(50, 120)
        cw = random.randint(40, 80)
        ch = random.randint(5, 10)
        cloud_color = random.choice([INDIGO_DARK, NEXUS_DEEP])
        md.rectangle([cx, cy, cx + cw, cy + ch], fill=c(cloud_color, 40))
        md.rectangle([cx + 8, cy + 2, cx + cw - 8, cy + ch - 2], fill=c(PRISM_DARK, 60))

    # Mid-ground floating crystal platforms
    platform_positions = [(15, 138), (85, 128), (165, 142), (255, 132)]
    for bx, by in platform_positions:
        bw = random.randint(30, 50)
        bh = random.randint(10, 18)
        # Platform body
        md.rectangle([bx, by, bx + bw, by + bh], fill=c(PLAT_MED))
        md.rectangle([bx + 1, by + 1, bx + bw - 1, by + bh - 2], fill=c(PLAT_LIGHT))
        # Crystal spires on top
        for mx in range(bx, bx + bw, 8):
            md.rectangle([mx, by - 4, mx + 3, by], fill=c(PLAT_MED))
            md.point((mx + 1, by - 5), fill=c(PRISM_LIGHT, 160))
        # Indigo rune trim along edge
        md.rectangle([bx, by, bx + bw, by], fill=c(INDIGO_DARK, 140))
        # Nexus glow through cracks
        crack_x = bx + random.randint(8, max(9, bw - 8))
        md.rectangle([crack_x, by + 2, crack_x + 2, by + 6], fill=c(NEXUS_MED, 120))

    # Mid-ground floating debris (crystallized spacetime chunks)
    for _ in range(8):
        dx = random.randint(10, 310)
        dy = random.randint(60, 140)
        dw = random.randint(4, 10)
        dh = random.randint(2, 5)
        md.rectangle([dx, dy, dx + dw, dy + dh], fill=c(PLAT_MED, 80))

    # Dimensional energy wisps
    for _ in range(10):
        wx = random.randint(10, 310)
        wy = random.randint(40, 150)
        wlen = random.randint(8, 22)
        wisp_color = random.choice([INDIGO_MED, NEXUS_MED])
        for wi in range(wlen):
            wpx = wx + wi
            wpy = wy + int(3 * math.sin(wi * 0.5))
            if 0 <= wpx < 320 and 0 <= wpy < 180:
                alpha = 110 - wi * 4
                if alpha > 0:
                    mid.putpixel((wpx, wpy), c(wisp_color, alpha))

    mid_out = PARALLAX_DIR / "bg_parallax_ethereal_nexus_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # -- NEAR LAYER: foreground dimensional mist and particles --
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(211)

    # Foreground dimensional mist at bottom
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

    # Bottom nexus energy floor glow
    nd.rectangle([0, 172, 319, 179], fill=c(NEXUS_MED, 120))

    # Floating energy particles (rising dimensional sparks)
    for _ in range(25):
        ax = random.randint(0, 319)
        ay = random.randint(20, 170)
        length = random.randint(3, 6)
        color_choice = random.choice([RIFT_GLOW, NEXUS_BRIGHT, RUNE_BRIGHT])
        for i in range(length):
            px = ax + i
            py = ay - i * 2  # drift upward
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = 130 - i * 20
                if alpha > 0:
                    near.putpixel((px, py), c(color_choice, alpha))

    # Dimensional spark particles
    for _ in range(25):
        wx = random.randint(0, 319)
        wy = random.randint(10, 155)
        color_choice = random.choice([RIFT_GLOW, NEXUS_BRIGHT, RUNE_BRIGHT, CRYSTAL_TEAL])
        near.putpixel((wx, wy), c(color_choice, 160))
        if wx + 1 < 320:
            near.putpixel((wx + 1, wy), c(color_choice, 80))

    # Foreground floating crystal fragments
    for fx in range(15, 320, 65):
        fy = random.randint(12, 50)
        fw = random.randint(5, 12)
        fh = random.randint(2, 4)
        nd.rectangle([fx, fy, fx + fw, fy + fh], fill=c(PLAT_MED, 70))
        nd.point((fx + fw // 2, fy), fill=c(PLAT_LIGHT, 90))

    near_out = PARALLAX_DIR / "bg_parallax_ethereal_nexus_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# =========================================================================
# MAIN
# =========================================================================

def main():
    print("Generating Ethereal Nexus zone assets (PIX-209)...")
    print()

    print("[1/8] Nexus Guardian enemy sprite sheet")
    generate_nexus_guardian()
    print()

    print("[2/8] Phase Strider enemy sprite sheet")
    generate_phase_strider()
    print()

    print("[3/8] Energy Parasite enemy sprite sheet")
    generate_energy_parasite()
    print()

    print("[4/8] The Nexus Overseer boss sprites (idle, attack, phases 1-3)")
    generate_nexus_overseer()
    print()

    print("[5/8] Dimensional Weaver NPC sprite")
    generate_dimensional_weaver()
    print()

    print("[6/8] Ethereal Nexus tileset (256x64)")
    generate_tileset()
    print()

    print("[7/8] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[8/8] Done! All Ethereal Nexus zone assets generated.")


if __name__ == "__main__":
    main()
