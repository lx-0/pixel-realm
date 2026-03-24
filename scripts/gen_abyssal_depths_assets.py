#!/usr/bin/env python3
"""
Generate Abyssal Depths zone art assets for PixelRealm (PIX-176).
Produces:
  - 3 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Abyssal Depths color language: deep ocean blacks, bioluminescent teals/cyans,
coral pinks, ghostly greens — underwater ruins, pressure/darkness atmosphere.
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

# -- Abyssal Depths Color Palette -------------------------------------------
# All colors from the 32-color master palette + zone-specific variants

# Deep ocean (background depths)
ABYSS_BLACK   = (5, 8, 18, 255)       # #050812 -- near-black deep
ABYSS_DEEP    = (8, 16, 36, 255)      # #081024 -- deep ocean floor
ABYSS_DARK    = (12, 28, 56, 255)     # #0c1c38 -- dark water
ABYSS_MED     = (18, 48, 82, 255)     # #123052 -- medium depth
ABYSS_LIGHT   = (30, 72, 110, 255)    # #1e486e -- lighter water

# Bioluminescence (core visual identity)
BIOLUM_TEAL   = (0, 200, 200, 255)    # #00c8c8 -- bright bioluminescence
BIOLUM_CYAN   = (40, 240, 240, 255)   # #28f0f0 -- intense cyan glow
BIOLUM_GREEN  = (0, 180, 120, 255)    # #00b478 -- green bioluminescence
BIOLUM_DIM    = (0, 120, 120, 255)    # #007878 -- dim teal glow
BIOLUM_WHITE  = (160, 255, 240, 255)  # #a0fff0 -- white-teal highlight

# Coral (warm accents against cool depths)
CORAL_DEEP    = (120, 20, 60, 255)    # #78143c -- deep coral
CORAL_PINK    = (200, 80, 120, 255)   # #c85078 -- coral pink
CORAL_LIGHT   = (240, 140, 160, 255)  # #f08ca0 -- light coral
CORAL_ORANGE  = (220, 120, 50, 255)   # #dc7832 -- warm coral

# Underwater ruins
RUIN_DARK     = (20, 30, 40, 255)     # #141e28 -- dark encrusted stone
RUIN_MED      = (45, 60, 70, 255)     # #2d3c46 -- medium ruin stone
RUIN_LIGHT    = (70, 90, 100, 255)    # #465a64 -- lighter stone
RUIN_MOSS     = (20, 80, 60, 255)     # #14503c -- algae/moss on ruins

# Sand/seabed
SAND_DARK     = (80, 70, 50, 255)     # #504632 -- dark ocean sand
SAND_MED      = (120, 110, 80, 255)   # #786e50 -- medium sand
SAND_LIGHT    = (160, 150, 110, 255)  # #a0966e -- light sand

# Neutrals
BLACK         = (13, 13, 13, 255)     # #0d0d0d
WHITE         = (240, 240, 240, 255)  # #f0f0f0

# Accent colors
PURPLE_DEEP   = (40, 10, 70, 255)    # #280a46 -- deep magic
PURPLE_GLOW   = (120, 60, 200, 255)  # #783cc8 -- arcane glow
GOLD          = (232, 184, 0, 255)   # #e8b800 -- treasure/ancient

OUTLINE       = (5, 10, 20, 255)
TRANSPARENT   = (0, 0, 0, 0)

# -- Creature-specific palettes ----------------------------------------------

# Deep Angler -- bioluminescent anglerfish predator
ANGLER_BODY    = ABYSS_DARK
ANGLER_BODY_L  = ABYSS_MED
ANGLER_BELLY   = (25, 40, 65, 255)
ANGLER_FIN     = ABYSS_MED
ANGLER_LURE    = BIOLUM_CYAN
ANGLER_LURE_D  = BIOLUM_TEAL
ANGLER_EYE     = BIOLUM_CYAN
ANGLER_TEETH   = WHITE
ANGLER_JAW     = (8, 18, 38, 255)

# Abyssal Leviathan -- serpentine deep-sea beast
LEVIATHAN_BODY   = (15, 35, 50, 255)
LEVIATHAN_SCALE  = (20, 55, 70, 255)
LEVIATHAN_BELLY  = (35, 65, 85, 255)
LEVIATHAN_SPINE  = BIOLUM_GREEN
LEVIATHAN_EYE    = (255, 200, 0, 255)
LEVIATHAN_FANG   = WHITE
LEVIATHAN_FIN    = (12, 40, 55, 255)
LEVIATHAN_GLOW   = BIOLUM_TEAL

# Coral Golem -- animated coral/rock construct
GOLEM_BODY     = CORAL_DEEP
GOLEM_BODY_L   = CORAL_PINK
GOLEM_ROCK     = RUIN_MED
GOLEM_ROCK_L   = RUIN_LIGHT
GOLEM_CORAL    = CORAL_LIGHT
GOLEM_EYE      = BIOLUM_CYAN
GOLEM_MOSS     = RUIN_MOSS
GOLEM_GLOW     = BIOLUM_TEAL

# Abyssal Kraken Lord boss
KRAKEN_BODY    = (10, 20, 40, 255)
KRAKEN_BODY_L  = (20, 35, 60, 255)
KRAKEN_SKIN    = (25, 45, 70, 255)
KRAKEN_SUCKER  = CORAL_PINK
KRAKEN_EYE     = (255, 220, 0, 255)
KRAKEN_EYE_GLOW = BIOLUM_CYAN
KRAKEN_TENTACLE = (15, 30, 50, 255)
KRAKEN_CROWN   = PURPLE_GLOW
KRAKEN_GLOW    = BIOLUM_CYAN
KRAKEN_DARK    = ABYSS_BLACK

# NPC: Abyssal Scholar -- deep-sea researcher
SCHOLAR_ROBE    = (20, 50, 65, 255)
SCHOLAR_ROBE_L  = (30, 65, 80, 255)
SCHOLAR_SKIN    = (140, 160, 170, 255)    # pale, adapted to depths
SCHOLAR_SKIN_D  = (110, 130, 140, 255)
SCHOLAR_HAIR    = (60, 80, 100, 255)
SCHOLAR_HELM    = RUIN_LIGHT
SCHOLAR_LANTERN = BIOLUM_CYAN
SCHOLAR_LANTERN_D = BIOLUM_DIM
SCHOLAR_BELT    = RUIN_MED
SCHOLAR_EYES    = BIOLUM_TEAL
SCHOLAR_BOOK    = (50, 40, 30, 255)

# Tileset colors
TILE_FLOOR     = SAND_MED
TILE_FLOOR_D   = SAND_DARK
TILE_FLOOR_L   = SAND_LIGHT
TILE_CORAL     = CORAL_PINK
TILE_CORAL_D   = CORAL_DEEP
TILE_CORAL_L   = CORAL_LIGHT
TILE_RUIN      = RUIN_MED
TILE_RUIN_D    = RUIN_DARK
TILE_RUIN_L    = RUIN_LIGHT
TILE_MOSS      = RUIN_MOSS
TILE_GLOW      = BIOLUM_TEAL
TILE_GLOW_B    = BIOLUM_CYAN
TILE_WATER     = ABYSS_DARK
TILE_WATER_D   = ABYSS_DEEP
TILE_BUBBLE    = (100, 200, 220, 255)


def ensure_dir(path):
    os.makedirs(os.path.dirname(path) if isinstance(path, str) else path.parent, exist_ok=True)


def save_asset(img, rel_path):
    full_path = ASSET_ROOT / rel_path if isinstance(rel_path, str) else rel_path
    ensure_dir(full_path)
    img.save(str(full_path))
    print(f"  Created: {full_path.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# ENEMY 1: DEEP ANGLER -- bioluminescent anglerfish, 16x16, 8 frames
# Frames 0-3: swim/float, Frames 4-7: attack (lunge bite)
# =========================================================================

def draw_deep_angler(draw, ox, oy, frame):
    """Draw a single 16x16 Deep Angler frame."""
    is_attack = frame >= 4
    anim = frame % 4

    swim_y = [0, -1, 0, 1][anim]
    swim_x = [0, 0, 0, 0][anim]

    # Lure stalk (antenna with bioluminescent tip)
    lure_sway = [-1, 0, 1, 0][anim]
    stalk_top = 1 + swim_y
    draw.point((ox + 9 + lure_sway, oy + stalk_top), fill=ANGLER_LURE)
    draw.point((ox + 9 + lure_sway, oy + stalk_top + 1), fill=ANGLER_LURE_D)
    draw.point((ox + 8, oy + stalk_top + 2), fill=ANGLER_FIN)
    draw.point((ox + 8, oy + stalk_top + 3), fill=ANGLER_FIN)
    # Lure glow halo
    if anim % 2 == 0:
        draw.point((ox + 8 + lure_sway, oy + stalk_top), fill=BIOLUM_WHITE)
        draw.point((ox + 10 + lure_sway, oy + stalk_top), fill=BIOLUM_DIM)

    # Body (bulky anglerfish shape)
    body_y = 6 + swim_y
    draw.rectangle([ox + 4, oy + body_y, ox + 11, oy + body_y + 5], fill=ANGLER_BODY)
    draw.rectangle([ox + 5, oy + body_y + 1, ox + 10, oy + body_y + 4], fill=ANGLER_BODY_L)
    # Belly
    draw.rectangle([ox + 5, oy + body_y + 3, ox + 9, oy + body_y + 5], fill=ANGLER_BELLY)

    # Eye (large, glowing)
    draw.point((ox + 9, oy + body_y + 1), fill=ANGLER_EYE)
    draw.point((ox + 10, oy + body_y + 1), fill=BIOLUM_WHITE)

    # Mouth / jaw
    jaw_open = [0, 0, 0, 0]
    if is_attack:
        jaw_open = [0, 1, 2, 1]
    jo = jaw_open[anim]
    draw.rectangle([ox + 11, oy + body_y + 2, ox + 13 + jo, oy + body_y + 3 + jo], fill=ANGLER_JAW)
    # Teeth
    draw.point((ox + 12, oy + body_y + 2), fill=ANGLER_TEETH)
    draw.point((ox + 12, oy + body_y + 3 + jo), fill=ANGLER_TEETH)
    if jo > 0:
        draw.point((ox + 13, oy + body_y + 2), fill=ANGLER_TEETH)

    # Tail fin
    tail_sway = [0, 1, 0, -1][anim]
    draw.point((ox + 2, oy + body_y + 2 + tail_sway), fill=ANGLER_FIN)
    draw.point((ox + 3, oy + body_y + 1 + tail_sway), fill=ANGLER_FIN)
    draw.point((ox + 3, oy + body_y + 3 + tail_sway), fill=ANGLER_FIN)
    draw.point((ox + 1, oy + body_y + 2 + tail_sway), fill=ABYSS_MED)

    # Pectoral fins
    fin_wave = [0, -1, 0, 1][anim]
    draw.point((ox + 6, oy + body_y + 5 + fin_wave), fill=ANGLER_FIN)
    draw.point((ox + 8, oy + body_y + 5 + fin_wave), fill=ANGLER_FIN)

    # Attack: lunge glow
    if is_attack and anim in (1, 2):
        draw.point((ox + 14, oy + body_y + 2), fill=BIOLUM_CYAN)
        draw.point((ox + 14, oy + body_y + 3), fill=BIOLUM_TEAL)


def generate_deep_angler():
    """Generate 8-frame Deep Angler sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_deep_angler(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_deep_angler.png")
    return img


# =========================================================================
# ENEMY 2: ABYSSAL LEVIATHAN -- serpentine deep-sea beast, 16x16, 8 frames
# Frames 0-3: undulate/swim, Frames 4-7: attack (strike forward)
# =========================================================================

def draw_abyssal_leviathan(draw, ox, oy, frame):
    """Draw a single 16x16 Abyssal Leviathan frame."""
    is_attack = frame >= 4
    anim = frame % 4

    undulate = [0, -1, 0, 1][anim]

    # Serpentine body (S-curve, 3 segments)
    # Tail segment
    tail_y = 9 + undulate
    draw.rectangle([ox + 1, oy + tail_y, ox + 4, oy + tail_y + 2], fill=LEVIATHAN_BODY)
    draw.point((ox + 1, oy + tail_y + 1), fill=LEVIATHAN_BELLY)
    # Tail fin
    draw.point((ox + 0, oy + tail_y), fill=LEVIATHAN_FIN)
    draw.point((ox + 0, oy + tail_y + 2), fill=LEVIATHAN_FIN)

    # Mid segment
    mid_y = 7 - undulate
    draw.rectangle([ox + 4, oy + mid_y, ox + 8, oy + mid_y + 3], fill=LEVIATHAN_BODY)
    draw.rectangle([ox + 5, oy + mid_y + 1, ox + 7, oy + mid_y + 2], fill=LEVIATHAN_SCALE)
    # Belly
    draw.rectangle([ox + 5, oy + mid_y + 2, ox + 7, oy + mid_y + 3], fill=LEVIATHAN_BELLY)
    # Spine glow
    draw.point((ox + 5, oy + mid_y), fill=LEVIATHAN_SPINE)
    draw.point((ox + 7, oy + mid_y), fill=LEVIATHAN_SPINE)

    # Head segment
    head_y = 5 + undulate
    strike = [0, 1, 2, 1][anim] if is_attack else 0
    draw.rectangle([ox + 8, oy + head_y, ox + 13 + strike, oy + head_y + 4], fill=LEVIATHAN_BODY)
    draw.rectangle([ox + 9, oy + head_y + 1, ox + 12 + strike, oy + head_y + 3], fill=LEVIATHAN_SCALE)

    # Head crest
    draw.point((ox + 10, oy + head_y - 1), fill=LEVIATHAN_FIN)
    draw.point((ox + 12, oy + head_y - 1), fill=LEVIATHAN_FIN)

    # Eye (yellow, menacing)
    draw.point((ox + 12 + strike, oy + head_y + 1), fill=LEVIATHAN_EYE)

    # Jaw / fangs
    draw.point((ox + 13 + strike, oy + head_y + 2), fill=LEVIATHAN_BODY)
    draw.point((ox + 14 + strike, oy + head_y + 2), fill=LEVIATHAN_FANG)
    if is_attack and anim in (1, 2):
        draw.point((ox + 14 + strike, oy + head_y + 3), fill=LEVIATHAN_FANG)

    # Dorsal spine glow trail
    draw.point((ox + 3, oy + tail_y - 1), fill=LEVIATHAN_SPINE)
    draw.point((ox + 6, oy + mid_y - 1), fill=LEVIATHAN_SPINE)

    # Bioluminescent trail (attack only)
    if is_attack and anim >= 1:
        for gx in range(2):
            draw.point((ox + 14 + strike + gx, oy + head_y + 1), fill=LEVIATHAN_GLOW)


def generate_abyssal_leviathan():
    """Generate 8-frame Abyssal Leviathan sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_abyssal_leviathan(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_abyssal_leviathan.png")
    return img


# =========================================================================
# ENEMY 3: CORAL GOLEM -- animated coral/rock construct, 16x16, 8 frames
# Frames 0-3: lumber/walk, Frames 4-7: attack (slam)
# =========================================================================

def draw_coral_golem(draw, ox, oy, frame):
    """Draw a single 16x16 Coral Golem frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, -1, 0, -1][anim]
    slam = [0, 0, -2, 0][anim] if is_attack else 0

    # Legs (rocky stumps)
    leg_step = [0, 1, 0, -1][anim]
    draw.rectangle([ox + 4, oy + 12, ox + 6, oy + 15], fill=GOLEM_ROCK)
    draw.rectangle([ox + 9, oy + 12, ox + 11, oy + 15], fill=GOLEM_ROCK)
    # Moss on feet
    draw.point((ox + 4, oy + 14), fill=GOLEM_MOSS)
    draw.point((ox + 11, oy + 14), fill=GOLEM_MOSS)

    # Torso (coral-encrusted rock)
    draw.rectangle([ox + 3, oy + 5 + bob, ox + 12, oy + 12], fill=GOLEM_ROCK)
    draw.rectangle([ox + 4, oy + 6 + bob, ox + 11, oy + 11], fill=GOLEM_ROCK_L)
    # Coral growths on body
    draw.point((ox + 4, oy + 6 + bob), fill=GOLEM_BODY)
    draw.point((ox + 5, oy + 5 + bob), fill=GOLEM_BODY_L)
    draw.point((ox + 10, oy + 7 + bob), fill=GOLEM_CORAL)
    draw.point((ox + 11, oy + 6 + bob), fill=GOLEM_BODY)
    draw.point((ox + 6, oy + 10), fill=GOLEM_CORAL)
    draw.point((ox + 9, oy + 9), fill=GOLEM_BODY_L)

    # Bioluminescent veins
    draw.point((ox + 7, oy + 8 + bob), fill=GOLEM_GLOW)
    draw.point((ox + 8, oy + 9 + bob), fill=GOLEM_GLOW)

    # Head (rough rocky dome with coral crown)
    draw.rectangle([ox + 5, oy + 2 + bob, ox + 10, oy + 6 + bob], fill=GOLEM_ROCK)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 5 + bob], fill=GOLEM_ROCK_L)
    # Coral crown protrusions
    draw.point((ox + 5, oy + 1 + bob), fill=GOLEM_BODY)
    draw.point((ox + 7, oy + 1 + bob), fill=GOLEM_BODY_L)
    draw.point((ox + 9, oy + 1 + bob), fill=GOLEM_CORAL)
    draw.point((ox + 10, oy + 2 + bob), fill=GOLEM_BODY)

    # Eyes (glowing teal, set into rock)
    draw.point((ox + 6, oy + 4 + bob), fill=GOLEM_EYE)
    draw.point((ox + 9, oy + 4 + bob), fill=GOLEM_EYE)

    # Arms
    if is_attack:
        # Slam: arms raise then come down
        arm_y = 5 + bob + slam
        draw.rectangle([ox + 1, oy + arm_y, ox + 3, oy + arm_y + 3], fill=GOLEM_ROCK)
        draw.rectangle([ox + 12, oy + arm_y, ox + 14, oy + arm_y + 3], fill=GOLEM_ROCK)
        # Coral fists
        draw.point((ox + 1, oy + arm_y), fill=GOLEM_CORAL)
        draw.point((ox + 14, oy + arm_y), fill=GOLEM_CORAL)
        # Impact effect
        if anim == 2:
            draw.point((ox + 2, oy + 14), fill=GOLEM_GLOW)
            draw.point((ox + 13, oy + 14), fill=GOLEM_GLOW)
            draw.point((ox + 7, oy + 15), fill=BIOLUM_DIM)
            draw.point((ox + 8, oy + 15), fill=BIOLUM_DIM)
    else:
        # Arms at sides
        arm_wave = [0, 0, 1, 0][anim]
        draw.rectangle([ox + 1, oy + 6 + bob + arm_wave, ox + 3, oy + 11 + bob], fill=GOLEM_ROCK)
        draw.rectangle([ox + 12, oy + 6 + bob + arm_wave, ox + 14, oy + 11 + bob], fill=GOLEM_ROCK)
        # Moss on arms
        draw.point((ox + 2, oy + 11 + bob), fill=GOLEM_MOSS)
        draw.point((ox + 13, oy + 11 + bob), fill=GOLEM_MOSS)


def generate_coral_golem():
    """Generate 8-frame Coral Golem sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_coral_golem(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_coral_golem.png")
    return img


# =========================================================================
# BOSS: ABYSSAL KRAKEN LORD -- massive deep-sea horror, 32x32, multi-phase
# idle (1 frame), attack (4 frames), phase1/2/3 (1 frame each)
# =========================================================================

def draw_abyssal_kraken(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw the Abyssal Kraken Lord boss at 32x32."""
    anim = frame % 4
    breath = [0, -1, 0, 1][anim]

    # Phase color shifts
    body = KRAKEN_BODY
    body_l = KRAKEN_BODY_L
    skin = KRAKEN_SKIN
    glow = KRAKEN_GLOW
    crown = KRAKEN_CROWN
    eye = KRAKEN_EYE
    tentacle = KRAKEN_TENTACLE
    if phase == 2:
        body = (15, 25, 50, 255)
        body_l = (25, 40, 70, 255)
        glow = BIOLUM_WHITE
        crown = (160, 80, 240, 255)
        eye = (255, 240, 60, 255)
    elif phase == 3:
        body = (20, 10, 40, 255)
        body_l = (35, 20, 60, 255)
        glow = (200, 100, 255, 255)
        crown = (200, 120, 255, 255)
        tentacle = (25, 12, 45, 255)
        eye = (255, 100, 100, 255)

    # Tentacles (8 sprawling from bottom, 4 visible at this angle)
    tentacle_sway = [0, 1, 2, 1][anim]
    for i, (tx, base_y) in enumerate([(3, 24), (9, 25), (20, 25), (27, 24)]):
        sway = tentacle_sway if i % 2 == 0 else -tentacle_sway
        for seg in range(6):
            ty = base_y + breath + seg
            sx = tx + sway * (seg // 2) // 2
            if 0 <= sx < 32 and 0 <= ty < 32:
                draw.point((ox + sx, oy + ty), fill=tentacle)
                if sx + 1 < 32:
                    draw.point((ox + sx + 1, oy + ty), fill=body_l)
        # Sucker markings
        draw.point((ox + tx + sway, oy + base_y + breath + 2), fill=KRAKEN_SUCKER)
        draw.point((ox + tx + sway, oy + base_y + breath + 4), fill=KRAKEN_SUCKER)

    # Main body (bulbous head/mantle)
    draw.rectangle([ox + 8, oy + 8 + breath, ox + 23, oy + 24 + breath], fill=body)
    draw.rectangle([ox + 9, oy + 9 + breath, ox + 22, oy + 23 + breath], fill=body_l)
    # Body texture (spots/bumps)
    draw.point((ox + 12, oy + 12 + breath), fill=skin)
    draw.point((ox + 19, oy + 14 + breath), fill=skin)
    draw.point((ox + 14, oy + 20 + breath), fill=skin)
    draw.point((ox + 18, oy + 18 + breath), fill=skin)

    # Mantle dome (top of head)
    draw.rectangle([ox + 10, oy + 4 + breath, ox + 21, oy + 9 + breath], fill=body)
    draw.rectangle([ox + 11, oy + 3 + breath, ox + 20, oy + 8 + breath], fill=body_l)
    draw.rectangle([ox + 13, oy + 2 + breath, ox + 18, oy + 4 + breath], fill=body_l)

    # Crown (bioluminescent crest / tentacle-crown)
    draw.point((ox + 12, oy + 2 + breath), fill=crown)
    draw.point((ox + 14, oy + 1 + breath), fill=crown)
    draw.point((ox + 16, oy + 0 + breath), fill=crown)
    draw.point((ox + 18, oy + 1 + breath), fill=crown)
    draw.point((ox + 20, oy + 2 + breath), fill=crown)
    # Crown glow
    draw.point((ox + 15, oy + 0 + breath), fill=glow)
    draw.point((ox + 17, oy + 0 + breath), fill=glow)

    # Eyes (large, menacing, set wide)
    draw.rectangle([ox + 10, oy + 11 + breath, ox + 13, oy + 14 + breath], fill=BLACK)
    draw.rectangle([ox + 11, oy + 12 + breath, ox + 12, oy + 13 + breath], fill=eye)
    draw.rectangle([ox + 18, oy + 11 + breath, ox + 21, oy + 14 + breath], fill=BLACK)
    draw.rectangle([ox + 19, oy + 12 + breath, ox + 20, oy + 13 + breath], fill=eye)
    # Eye glow
    draw.point((ox + 11, oy + 11 + breath), fill=KRAKEN_EYE_GLOW)
    draw.point((ox + 20, oy + 11 + breath), fill=KRAKEN_EYE_GLOW)

    # Beak/mouth
    if is_attack and anim in (1, 2):
        # Open maw
        draw.rectangle([ox + 13, oy + 16 + breath, ox + 18, oy + 20 + breath], fill=BLACK)
        draw.point((ox + 14, oy + 16 + breath), fill=body)
        draw.point((ox + 17, oy + 16 + breath), fill=body)
        # Ink blast from mouth
        for bx in range(3):
            draw.point((ox + 15, oy + 21 + breath + bx), fill=PURPLE_DEEP)
            draw.point((ox + 16, oy + 21 + breath + bx), fill=PURPLE_GLOW)
    else:
        draw.rectangle([ox + 14, oy + 16 + breath, ox + 17, oy + 17 + breath], fill=BLACK)

    # Side tentacle arms
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        attack_ext = [0, 2, 4, 2][anim]
        # Left tentacle arm sweeps
        draw.rectangle([ox + 2, oy + 12 + breath, ox + 8, oy + 15 + breath], fill=tentacle)
        draw.rectangle([ox + 0, oy + 10 + breath - attack_ext, ox + 4, oy + 12 + breath], fill=tentacle)
        draw.point((ox + 0, oy + 10 + breath - attack_ext), fill=glow)
        # Right tentacle arm sweeps
        draw.rectangle([ox + 23, oy + 12 + breath, ox + 29, oy + 15 + breath], fill=tentacle)
        draw.rectangle([ox + 27, oy + 10 + breath - attack_ext, ox + 31, oy + 12 + breath], fill=tentacle)
        draw.point((ox + 31, oy + 10 + breath - attack_ext), fill=glow)
        # Ink splatter during peak attack
        if attack_ext >= 3:
            for ix in range(5, 27, 5):
                draw.point((ox + ix, oy + 30), fill=PURPLE_GLOW)
                draw.point((ox + ix, oy + 31), fill=PURPLE_DEEP)
    else:
        # Idle tentacle arms
        draw.rectangle([ox + 3, oy + 14 + breath + arm_wave, ox + 8, oy + 20 + breath], fill=tentacle)
        draw.rectangle([ox + 23, oy + 14 + breath + arm_wave, ox + 28, oy + 20 + breath], fill=tentacle)
        # Sucker detail
        draw.point((ox + 5, oy + 17 + breath + arm_wave), fill=KRAKEN_SUCKER)
        draw.point((ox + 26, oy + 17 + breath + arm_wave), fill=KRAKEN_SUCKER)

    # Bioluminescent spots on body
    spots = [(12, 18), (19, 16), (15, 22), (11, 15), (20, 20)]
    for sx, sy in spots:
        if (anim + sx) % 3 == 0:
            draw.point((ox + sx, oy + sy + breath), fill=glow)

    # Phase-specific effects
    if phase >= 2:
        # Aura particles
        aura_pos = [(5, 6), (26, 8), (3, 18), (28, 20)]
        for i, (ax, ay) in enumerate(aura_pos):
            if (anim + i) % 3 == 0:
                draw.point((ox + ax, oy + ay + breath), fill=glow)

    if phase == 3:
        # Swirling void beneath
        for tx in range(2, 30, 3):
            ty = 28 + (anim + tx) % 4
            if ty < 32:
                draw.point((ox + tx, oy + ty), fill=PURPLE_GLOW)
        # Crown radiates intensely
        draw.point((ox + 16, oy + breath), fill=glow)
        draw.point((ox + 13, oy + 1 + breath), fill=glow)
        draw.point((ox + 19, oy + 1 + breath), fill=glow)


def generate_abyssal_kraken():
    """Generate all Abyssal Kraken Lord boss sprite sheets."""
    # Idle
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_abyssal_kraken(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_abyssal_kraken_idle.png")

    # Attack -- 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        draw_abyssal_kraken(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_abyssal_kraken_attack.png")

    # Phase 1
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_abyssal_kraken(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_abyssal_kraken_phase1.png")

    # Phase 2 -- intensified bioluminescence
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_abyssal_kraken(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_abyssal_kraken_phase2.png")

    # Phase 3 -- void empowered
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_abyssal_kraken(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_abyssal_kraken_phase3.png")


# =========================================================================
# NPC: ABYSSAL SCHOLAR -- deep-sea researcher, 16x24
# Robed scholar with diving helm and bioluminescent lantern
# =========================================================================

def draw_abyssal_scholar(draw, ox, oy):
    """Draw the Abyssal Scholar NPC at 16x24."""
    # Feet / boots (heavy diving boots)
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=RUIN_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=RUIN_DARK)

    # Robe (waterproof researcher's coat)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=SCHOLAR_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=SCHOLAR_ROBE_L)
    # Coat widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=SCHOLAR_ROBE)
    # Bioluminescent trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=BIOLUM_DIM)

    # Belt with specimen buckle
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=SCHOLAR_BELT)
    draw.point((ox + 8, oy + 15), fill=BIOLUM_TEAL)
    draw.point((ox + 8, oy + 16), fill=BIOLUM_DIM)

    # Arms (in coat sleeves)
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=SCHOLAR_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=SCHOLAR_ROBE)
    # Gloves
    draw.point((ox + 2, oy + 17), fill=SCHOLAR_SKIN_D)
    draw.point((ox + 14, oy + 17), fill=SCHOLAR_SKIN_D)

    # Lantern (held with left hand, bioluminescent)
    draw.rectangle([ox + 0, oy + 14, ox + 2, oy + 18], fill=RUIN_LIGHT)
    draw.point((ox + 1, oy + 15), fill=SCHOLAR_LANTERN)
    draw.point((ox + 1, oy + 16), fill=SCHOLAR_LANTERN)
    draw.point((ox + 1, oy + 17), fill=SCHOLAR_LANTERN_D)
    # Lantern glow halo
    draw.point((ox + 0, oy + 13), fill=BIOLUM_DIM)
    draw.point((ox + 2, oy + 13), fill=BIOLUM_DIM)

    # Research notebook (right hand)
    draw.rectangle([ox + 13, oy + 15, ox + 15, oy + 18], fill=SCHOLAR_BOOK)
    draw.rectangle([ox + 14, oy + 16, ox + 14, oy + 17], fill=WHITE)

    # Head (inside diving helm)
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=SCHOLAR_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=SCHOLAR_SKIN)

    # Diving helm (glass dome)
    draw.rectangle([ox + 4, oy + 3, ox + 12, oy + 4], fill=SCHOLAR_HELM)
    draw.point((ox + 4, oy + 5), fill=SCHOLAR_HELM)
    draw.point((ox + 4, oy + 6), fill=SCHOLAR_HELM)
    draw.point((ox + 12, oy + 5), fill=SCHOLAR_HELM)
    draw.point((ox + 12, oy + 6), fill=SCHOLAR_HELM)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 10], fill=SCHOLAR_HELM)

    # Hair visible through helm
    draw.rectangle([ox + 5, oy + 3, ox + 11, oy + 5], fill=SCHOLAR_HAIR)

    # Helm viewport tint
    draw.point((ox + 5, oy + 4), fill=(80, 120, 140, 200))
    draw.point((ox + 11, oy + 4), fill=(80, 120, 140, 200))

    # Helm top light
    draw.point((ox + 8, oy + 2), fill=BIOLUM_TEAL)
    draw.point((ox + 8, oy + 1), fill=BIOLUM_DIM)

    # Eyes (adapted to darkness, slightly glowing)
    draw.point((ox + 7, oy + 6), fill=SCHOLAR_EYES)
    draw.point((ox + 9, oy + 6), fill=SCHOLAR_EYES)


def generate_abyssal_scholar():
    """Generate Abyssal Scholar NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_abyssal_scholar(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_abyssal.png")
    return img


# =========================================================================
# TILESET -- tileset_abyssal.png (256x64, 16 cols x 4 rows)
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


# -- Individual tile functions -----------------------------------------------

def tile_ocean_floor(tile):
    """Sandy ocean floor."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FLOOR)
    # Sand ripples
    for x in range(0, 16, 4):
        d.point((x + 2, 5), fill=TILE_FLOOR_D)
        d.point((x + 1, 10), fill=TILE_FLOOR_D)
    d.point((6, 8), fill=TILE_FLOOR_L)
    d.point((11, 3), fill=TILE_FLOOR_L)


def tile_ocean_floor_dark(tile):
    """Darker ocean floor variant."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FLOOR_D)
    d.point((3, 7), fill=TILE_FLOOR)
    d.point((10, 4), fill=TILE_FLOOR)
    d.point((7, 12), fill=TILE_FLOOR)


def tile_coral_formation(tile):
    """Coral cluster tile."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 10, 15, 15], fill=TILE_FLOOR)
    # Branching coral
    d.rectangle([3, 2, 5, 10], fill=TILE_CORAL)
    d.rectangle([4, 0, 4, 2], fill=TILE_CORAL_L)
    d.rectangle([7, 4, 9, 10], fill=TILE_CORAL_D)
    d.rectangle([8, 2, 8, 4], fill=TILE_CORAL)
    d.rectangle([11, 3, 13, 10], fill=TILE_CORAL_L)
    d.point((12, 1), fill=TILE_CORAL)
    # Glow spots on coral tips
    d.point((4, 0), fill=TILE_GLOW)
    d.point((12, 1), fill=TILE_GLOW)


def tile_coral_small(tile):
    """Small coral accent tile."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FLOOR)
    # Small coral growths
    d.rectangle([5, 8, 7, 14], fill=TILE_CORAL)
    d.point((6, 7), fill=TILE_CORAL_L)
    d.rectangle([10, 10, 12, 14], fill=TILE_CORAL_D)
    d.point((11, 9), fill=TILE_CORAL)


def tile_ruin_block(tile):
    """Underwater ruin stone block."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_RUIN)
    d.rectangle([1, 1, 14, 14], fill=TILE_RUIN_L)
    # Mortar lines (waterlogged)
    d.line([(0, 8), (15, 8)], fill=TILE_RUIN_D, width=1)
    d.line([(8, 0), (8, 8)], fill=TILE_RUIN_D, width=1)
    d.line([(4, 8), (4, 15)], fill=TILE_RUIN_D, width=1)
    d.line([(12, 8), (12, 15)], fill=TILE_RUIN_D, width=1)
    # Moss/algae patches
    d.point((3, 3), fill=TILE_MOSS)
    d.point((11, 12), fill=TILE_MOSS)


def tile_ruin_pillar(tile):
    """Underwater ruin pillar."""
    d = ImageDraw.Draw(tile)
    d.rectangle([5, 0, 10, 15], fill=TILE_RUIN_L)
    d.rectangle([6, 0, 9, 15], fill=TILE_RUIN)
    # Carved rune (glowing)
    d.point((7, 5), fill=TILE_GLOW)
    d.point((8, 6), fill=TILE_GLOW)
    d.point((7, 7), fill=TILE_GLOW_B)
    # Moss
    d.point((5, 12), fill=TILE_MOSS)
    d.point((10, 8), fill=TILE_MOSS)


def tile_ruin_floor(tile):
    """Decorated underwater ruin floor."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_RUIN_L)
    # Ornamental border
    d.rectangle([0, 0, 15, 0], fill=TILE_RUIN_D)
    d.rectangle([0, 15, 15, 15], fill=TILE_RUIN_D)
    d.rectangle([0, 0, 0, 15], fill=TILE_RUIN_D)
    d.rectangle([15, 0, 15, 15], fill=TILE_RUIN_D)
    # Center glow pattern
    d.point((8, 8), fill=TILE_GLOW_B)
    d.point((7, 7), fill=TILE_GLOW)
    d.point((9, 7), fill=TILE_GLOW)
    d.point((7, 9), fill=TILE_GLOW)
    d.point((9, 9), fill=TILE_GLOW)


def tile_ruin_wall_top(tile):
    """Ruin wall cap with moss."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_RUIN)
    d.rectangle([0, 0, 15, 3], fill=TILE_RUIN_L)
    d.rectangle([0, 3, 15, 4], fill=TILE_MOSS)


def tile_water_open(tile):
    """Open deep water tile (background)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=c(TILE_WATER, 180))
    # Subtle current streaks
    d.point((3, 6), fill=c(ABYSS_LIGHT, 100))
    d.point((4, 6), fill=c(ABYSS_LIGHT, 100))
    d.point((10, 11), fill=c(ABYSS_LIGHT, 80))


def tile_water_dark(tile):
    """Darker deep water."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=c(TILE_WATER_D, 200))
    d.point((7, 4), fill=c(ABYSS_DARK, 160))


def tile_bubble_vent(tile):
    """Bubble vent from ocean floor."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 10, 15, 15], fill=TILE_FLOOR_D)
    # Vent crack
    d.rectangle([6, 12, 9, 15], fill=RUIN_DARK)
    d.point((7, 11), fill=RUIN_DARK)
    d.point((8, 11), fill=RUIN_DARK)
    # Rising bubbles
    d.point((7, 8), fill=TILE_BUBBLE)
    d.point((8, 5), fill=TILE_BUBBLE)
    d.point((6, 2), fill=c(TILE_BUBBLE, 180))
    d.point((9, 0), fill=c(TILE_BUBBLE, 140))
    # Heat shimmer glow
    d.point((7, 10), fill=TILE_GLOW)


def tile_glow_flora(tile):
    """Bioluminescent underwater plant."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 12, 15, 15], fill=TILE_FLOOR)
    # Glowing seaweed stalks
    d.rectangle([4, 3, 5, 12], fill=RUIN_MOSS)
    d.rectangle([8, 5, 9, 12], fill=RUIN_MOSS)
    d.rectangle([12, 4, 13, 12], fill=RUIN_MOSS)
    # Bioluminescent tips
    d.point((4, 2), fill=BIOLUM_TEAL)
    d.point((5, 3), fill=BIOLUM_DIM)
    d.point((8, 4), fill=BIOLUM_GREEN)
    d.point((9, 5), fill=BIOLUM_DIM)
    d.point((12, 3), fill=BIOLUM_CYAN)
    d.point((13, 4), fill=BIOLUM_DIM)
    # Glow halos
    d.point((3, 2), fill=c(BIOLUM_DIM, 120))
    d.point((7, 4), fill=c(BIOLUM_DIM, 120))


def tile_glow_mushroom(tile):
    """Bioluminescent mushroom cluster."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 12, 15, 15], fill=TILE_FLOOR)
    # Large mushroom
    d.rectangle([6, 10, 7, 12], fill=RUIN_LIGHT)
    d.rectangle([4, 7, 9, 10], fill=BIOLUM_TEAL)
    d.rectangle([5, 8, 8, 9], fill=BIOLUM_CYAN)
    # Small mushroom
    d.rectangle([11, 11, 11, 12], fill=RUIN_LIGHT)
    d.rectangle([10, 9, 12, 11], fill=BIOLUM_GREEN)
    # Tiny mushroom
    d.point((3, 12), fill=RUIN_LIGHT)
    d.rectangle([2, 11, 4, 11], fill=BIOLUM_DIM)


def tile_floor_edge_n(tile):
    """Ocean floor top edge (sand on bottom, water on top)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 8, 15, 15], fill=TILE_FLOOR)
    d.rectangle([0, 0, 15, 7], fill=c(TILE_WATER, 100))
    # Edge detail
    d.point((3, 8), fill=TILE_FLOOR_D)
    d.point((8, 8), fill=TILE_FLOOR_L)
    d.point((12, 8), fill=TILE_FLOOR_D)


def tile_floor_edge_s(tile):
    """Ocean floor bottom edge."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 7], fill=TILE_FLOOR)
    d.rectangle([0, 8, 15, 15], fill=c(TILE_WATER, 100))
    d.point((4, 7), fill=TILE_FLOOR_D)
    d.point((11, 7), fill=TILE_FLOOR_D)


def tile_floor_variant1(tile):
    """Floor variant with shell debris."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FLOOR)
    # Shell fragments
    d.point((4, 6), fill=TILE_FLOOR_L)
    d.point((5, 7), fill=WHITE)
    d.point((11, 4), fill=TILE_FLOOR_L)
    d.point((8, 11), fill=WHITE)


def tile_floor_variant2(tile):
    """Floor variant with pebbles."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_FLOOR)
    d.point((3, 9), fill=TILE_RUIN)
    d.point((9, 3), fill=TILE_RUIN)
    d.point((12, 11), fill=TILE_RUIN_L)


def generate_tileset():
    """Generate the main tileset_abyssal.png (256x64)."""
    random.seed(176)  # Deterministic for PIX-176
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground / platform tiles
    row0 = [
        tile_ocean_floor, tile_ocean_floor_dark, tile_coral_formation, tile_coral_small,
        tile_floor_edge_n, tile_ruin_block, tile_ruin_floor, tile_ruin_pillar,
        tile_floor_variant1, tile_floor_variant2, tile_bubble_vent, tile_glow_flora,
        tile_glow_mushroom, tile_water_open, tile_water_dark, tile_ocean_floor,
    ]
    for i, fn in enumerate(row0):
        random.seed(176 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Terrain features
    row1 = [
        tile_ruin_wall_top, tile_ruin_pillar, tile_glow_flora, tile_glow_mushroom,
        tile_coral_formation, tile_coral_small, tile_ruin_block, tile_ruin_floor,
        tile_ocean_floor, tile_ocean_floor_dark, tile_water_open, tile_water_dark,
        tile_floor_variant1, tile_floor_variant2, tile_bubble_vent, tile_floor_edge_n,
    ]
    for i, fn in enumerate(row1):
        random.seed(176 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions + decorations
    row2 = [
        tile_floor_edge_n, tile_floor_edge_s, tile_water_open, tile_water_dark,
        tile_ocean_floor, tile_ocean_floor_dark, tile_coral_formation, tile_coral_small,
        tile_ruin_block, tile_ruin_floor, tile_ruin_pillar, tile_ruin_wall_top,
        tile_glow_flora, tile_glow_mushroom, tile_bubble_vent, tile_floor_variant1,
    ]
    for i, fn in enumerate(row2):
        random.seed(176 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: More variants
    row3 = [
        tile_glow_mushroom, tile_glow_flora, tile_bubble_vent, tile_ruin_wall_top,
        tile_floor_edge_n, tile_floor_edge_s, tile_coral_formation, tile_ruin_floor,
        tile_ocean_floor, tile_ocean_floor_dark, tile_water_open, tile_water_dark,
        tile_floor_variant1, tile_floor_variant2, tile_coral_small, tile_ruin_block,
    ]
    for i, fn in enumerate(row3):
        random.seed(176 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(176)
    out = TILESETS_DIR / "tileset_abyssal.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# PARALLAX BACKGROUNDS -- 320x180, three layers (far/mid/near)
# =========================================================================

def generate_parallax():
    """Three parallax layers for Abyssal Depths zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # -- FAR LAYER: deep ocean gradient with distant underwater terrain --
    far = Image.new("RGBA", (320, 180), ABYSS_BLACK)
    fd = ImageDraw.Draw(far)
    # Ocean gradient (top = near-black abyss, bottom = slightly lighter deep)
    for y in range(180):
        ratio = y / 180
        r = int(ABYSS_BLACK[0] * (1 - ratio) + ABYSS_DARK[0] * ratio)
        g = int(ABYSS_BLACK[1] * (1 - ratio) + ABYSS_DARK[1] * ratio)
        b = int(ABYSS_BLACK[2] * (1 - ratio) + ABYSS_DARK[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    # Distant bioluminescent specks (like deep-sea stars)
    random.seed(176)
    for _ in range(50):
        sx, sy = random.randint(0, 319), random.randint(0, 179)
        color = random.choice([BIOLUM_TEAL, BIOLUM_GREEN, BIOLUM_DIM])
        fd.point((sx, sy), fill=c(color, random.randint(60, 150)))

    # Distant underwater mountain/ridge silhouettes
    ridge_positions = [(0, 140), (60, 130), (140, 145), (220, 135), (290, 140)]
    for rx, ry in ridge_positions:
        width = random.randint(40, 70)
        height = random.randint(15, 30)
        for x in range(rx, rx + width):
            if 0 <= x < 320:
                dist = abs(x - (rx + width // 2))
                h = int((1 - dist / (width // 2 + 1)) * height)
                for dy in range(h):
                    py = ry - dy
                    if 0 <= py < 180:
                        alpha = 80 - dy * 2
                        if alpha > 0:
                            fd.point((x, py), fill=c(ABYSS_MED, alpha))

    # Faint ocean floor line at bottom
    fd.rectangle([0, 165, 319, 179], fill=c(ABYSS_DEEP, 100))

    far_out = PARALLAX_DIR / "bg_parallax_abyssal_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # -- MID LAYER: closer ruins, coral formations, jellyfish --
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(177)

    # Mid-ground underwater ruin structures
    ruin_positions = [(30, 110), (140, 95), (260, 115)]
    for rx, ry in ruin_positions:
        width = random.randint(30, 50)
        # Ruin base (wall)
        md.rectangle([rx - width, ry, rx + width, ry + 20], fill=c(RUIN_MED, 120))
        md.rectangle([rx - width + 3, ry + 2, rx + width - 3, ry + 18], fill=c(RUIN_LIGHT, 100))
        # Broken arch/columns
        col_h = random.randint(20, 35)
        md.rectangle([rx - 5, ry - col_h, rx + 5, ry], fill=c(RUIN_MED, 130))
        md.rectangle([rx - 3, ry - col_h - 3, rx + 3, ry - col_h], fill=c(RUIN_LIGHT, 130))
        # Glowing rune on column
        md.point((rx, ry - col_h + 8), fill=c(BIOLUM_TEAL, 200))
        md.point((rx, ry - col_h + 12), fill=c(BIOLUM_TEAL, 200))

    # Coral formations in mid-ground
    for _ in range(6):
        cx = random.randint(10, 310)
        cy = random.randint(120, 160)
        ch = random.randint(10, 25)
        cw = random.randint(4, 8)
        coral_color = random.choice([CORAL_PINK, CORAL_DEEP, CORAL_ORANGE])
        md.rectangle([cx, cy - ch, cx + cw, cy], fill=c(coral_color, 100))
        md.point((cx + cw // 2, cy - ch - 1), fill=c(BIOLUM_TEAL, 120))

    # Floating jellyfish silhouettes
    for _ in range(4):
        jx = random.randint(20, 300)
        jy = random.randint(20, 80)
        # Bell
        md.rectangle([jx - 4, jy, jx + 4, jy + 5], fill=c(BIOLUM_DIM, 80))
        md.rectangle([jx - 3, jy + 1, jx + 3, jy + 4], fill=c(BIOLUM_TEAL, 60))
        # Tentacles
        for t in range(-2, 3, 2):
            for ty in range(8):
                md.point((jx + t, jy + 6 + ty), fill=c(BIOLUM_DIM, 50 - ty * 5))

    mid_out = PARALLAX_DIR / "bg_parallax_abyssal_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # -- NEAR LAYER: foreground particles, bubbles, floating debris --
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(178)

    # Ocean floor sediment at bottom
    for x in range(0, 320, 2):
        h = random.randint(5, 18)
        base_y = 175
        for y in range(base_y - h, base_y):
            if 0 <= y < 180:
                alpha = 120 - int((base_y - y) * 4)
                if alpha > 0:
                    near.putpixel((x, y), c(SAND_DARK, min(alpha, 160)))
                    if x + 1 < 320:
                        near.putpixel((x + 1, y), c(SAND_DARK, min(alpha, 160)))

    # Bottom sediment floor
    nd.rectangle([0, 172, 319, 179], fill=c(SAND_DARK, 140))

    # Rising bubble streams
    for _ in range(20):
        bx = random.randint(0, 319)
        by = random.randint(10, 160)
        count = random.randint(3, 6)
        for i in range(count):
            px = bx + random.randint(-2, 2)
            py = by - i * random.randint(8, 15)
            if 0 <= px < 320 and 0 <= py < 180:
                size = 1 if i > count // 2 else 2
                alpha = 180 - i * 25
                if alpha > 0:
                    near.putpixel((px, py), c(TILE_BUBBLE, alpha))

    # Bioluminescent floating particles
    for _ in range(35):
        gx = random.randint(0, 319)
        gy = random.randint(5, 165)
        color = random.choice([BIOLUM_TEAL, BIOLUM_GREEN, BIOLUM_CYAN])
        alpha = random.randint(100, 220)
        near.putpixel((gx, gy), c(color, alpha))
        if gx + 1 < 320:
            near.putpixel((gx + 1, gy), c(color, alpha // 2))

    # Floating seaweed/debris fragments
    for fx in range(20, 320, 70):
        fy = random.randint(15, 60)
        fw = random.randint(6, 12)
        fh = random.randint(3, 6)
        nd.rectangle([fx, fy, fx + fw, fy + fh], fill=c(RUIN_MOSS, 80))
        nd.point((fx + fw // 2, fy), fill=c(BIOLUM_DIM, 60))

    near_out = PARALLAX_DIR / "bg_parallax_abyssal_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# =========================================================================
# MAIN
# =========================================================================

def main():
    print("Generating Abyssal Depths zone assets (PIX-176)...")
    print()

    print("[1/8] Deep Angler enemy sprite sheet")
    generate_deep_angler()
    print()

    print("[2/8] Abyssal Leviathan enemy sprite sheet")
    generate_abyssal_leviathan()
    print()

    print("[3/8] Coral Golem enemy sprite sheet")
    generate_coral_golem()
    print()

    print("[4/8] Abyssal Kraken Lord boss sprites (idle, attack, phases 1-3)")
    generate_abyssal_kraken()
    print()

    print("[5/8] Abyssal Scholar NPC sprite")
    generate_abyssal_scholar()
    print()

    print("[6/8] Abyssal Depths tileset (256x64)")
    generate_tileset()
    print()

    print("[7/8] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[8/8] Done! All Abyssal Depths zone assets generated.")


if __name__ == "__main__":
    main()
