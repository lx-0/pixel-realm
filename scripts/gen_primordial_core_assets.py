#!/usr/bin/env python3
"""
Generate Primordial Core zone art assets for PixelRealm (PIX-205).
Produces:
  - 3 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Primordial Core color language: molten amber, crystallized energy cyan,
proto-matter obsidian, elemental chaos — the raw forge at creation's center
where colliding elemental planes birth and destroy matter endlessly.
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

# -- Primordial Core Color Palette --------------------------------------------

# Molten amber / primordial fire tones
AMBER_BLACK     = (18, 6, 2, 255)           # deepest molten dark
AMBER_DARK      = (45, 15, 4, 255)          # dark ember
AMBER_MED       = (140, 55, 10, 255)        # molten amber
AMBER_BRIGHT    = (220, 120, 20, 255)       # bright lava
AMBER_GLOW      = (255, 180, 50, 255)       # searing glow

# Crystallized energy / primordial spark
ENERGY_DEEP     = (5, 25, 30, 255)          # deep crystal dark
ENERGY_DARK     = (10, 60, 75, 255)         # dark energy
ENERGY_MED      = (30, 150, 170, 255)       # crystallized energy
ENERGY_BRIGHT   = (80, 220, 240, 255)       # bright energy
ENERGY_GLOW     = (160, 250, 255, 255)      # blinding energy

# Proto-matter / elemental obsidian
PROTO_BLACK     = (10, 8, 6, 255)           # deepest proto-matter
PROTO_DARK      = (22, 18, 14, 255)         # dark obsidian
PROTO_MED       = (45, 36, 28, 255)         # mid proto-matter
PROTO_LIGHT     = (70, 58, 45, 255)         # lighter proto
PROTO_EDGE      = (95, 80, 65, 255)         # proto edge highlight

# Elemental chaos / phase-shift energy
CHAOS_FIRE      = (255, 80, 20, 255)        # fire element
CHAOS_ICE       = (100, 200, 255, 255)      # ice element
CHAOS_LIGHTNING = (255, 255, 100, 255)      # lightning element
CHAOS_EARTH     = (120, 90, 50, 255)        # earth element
CHAOS_VOID      = (140, 60, 200, 255)       # void element

# Rune energy (creation-script markings)
RUNE_DIM        = (140, 110, 80, 255)       # dim rune
RUNE_MED        = (200, 165, 100, 255)      # rune shimmer
RUNE_BRIGHT     = (240, 210, 140, 255)      # bright rune
RUNE_WHITE      = (255, 245, 200, 255)      # near-white rune
RUNE_GLOW       = (255, 250, 220, 255)      # blinding rune

# Neutrals
WHITE           = (240, 235, 220, 255)
BLACK           = (8, 6, 4, 255)
STONE_DARK      = (30, 26, 22, 255)
STONE_MED       = (52, 44, 38, 255)
STONE_LIGHT     = (80, 70, 58, 255)

# Platform / crystallized foundation
PLAT_DARK       = (35, 28, 20, 255)
PLAT_MED        = (60, 50, 38, 255)
PLAT_LIGHT      = (88, 74, 58, 255)
PLAT_EDGE       = (112, 96, 78, 255)

# Sky / atmosphere
SKY_ABYSS       = (12, 5, 2, 255)          # primordial abyss
SKY_DEEP        = (22, 10, 4, 255)
SKY_GLOW        = (55, 20, 8, 255)         # horizon glow

# Crystal accent colors
CRYSTAL_AMBER   = (255, 160, 40, 255)
CRYSTAL_TEAL    = (60, 200, 190, 255)
CRYSTAL_ROSE    = (220, 80, 100, 255)
CRYSTAL_WHITE   = (230, 225, 210, 255)

OUTLINE         = (6, 4, 2, 255)
TRANSPARENT     = (0, 0, 0, 0)

# -- Creature-specific palettes -----------------------------------------------

# Elemental Amalgam -- fused multi-element creature, heavy and unstable
AMALGAM_BODY    = PROTO_MED
AMALGAM_BODY_L  = PROTO_LIGHT
AMALGAM_BODY_D  = PROTO_DARK
AMALGAM_FIRE    = AMBER_BRIGHT
AMALGAM_FIRE_G  = AMBER_GLOW
AMALGAM_ICE     = ENERGY_BRIGHT
AMALGAM_ICE_D   = ENERGY_MED
AMALGAM_EYE     = CHAOS_LIGHTNING
AMALGAM_CORE    = AMBER_MED
AMALGAM_VEIN    = AMBER_BRIGHT

# Primordial Shard -- crystalline energy fragment enemy, angular and floating
SHARD_BODY      = (50, 140, 155, 200)      # semi-transparent crystal
SHARD_BODY_D    = (25, 80, 95, 220)
SHARD_EDGE      = ENERGY_BRIGHT
SHARD_CORE      = ENERGY_GLOW
SHARD_GLOW      = (200, 255, 255, 255)
SHARD_TRAIL     = (40, 120, 140, 80)
SHARD_TRAIL_L   = (60, 150, 170, 50)
SHARD_EYE       = RUNE_GLOW
SHARD_FACET     = CRYSTAL_TEAL

# Core Sentinel -- ancient guardian, imposing armored construct
SENTINEL_BODY   = PLAT_MED
SENTINEL_BODY_D = PLAT_DARK
SENTINEL_ARMOR  = PLAT_LIGHT
SENTINEL_RUNE   = RUNE_BRIGHT
SENTINEL_RUNE_D = RUNE_MED
SENTINEL_EYE    = AMBER_GLOW
SENTINEL_EYE_D  = AMBER_BRIGHT
SENTINEL_CORE   = AMBER_MED
SENTINEL_MAGIC  = RUNE_GLOW
SENTINEL_MAGIC_B = RUNE_BRIGHT

# The Genesis Flame boss
GENESIS_BODY    = AMBER_MED
GENESIS_BODY_D  = AMBER_DARK
GENESIS_ARMOR   = PLAT_LIGHT
GENESIS_ARMOR_D = PLAT_MED
GENESIS_EYE     = ENERGY_GLOW
GENESIS_FLAME   = AMBER_GLOW
GENESIS_RUNE    = RUNE_BRIGHT
GENESIS_GLOW    = RUNE_GLOW
GENESIS_CROWN   = RUNE_MED
GENESIS_CROWN_G = RUNE_GLOW
GENESIS_CAPE    = AMBER_DARK
GENESIS_CAPE_L  = AMBER_MED
GENESIS_WEAPON  = RUNE_MED
GENESIS_MAGIC   = ENERGY_BRIGHT

# NPC: Echo of Creation
ECHO_ROBE       = (42, 55, 60, 255)
ECHO_ROBE_L     = (62, 78, 82, 255)
ECHO_SKIN       = (175, 160, 145, 255)
ECHO_SKIN_D     = (145, 130, 115, 255)
ECHO_HAIR       = (85, 95, 100, 255)
ECHO_STAFF      = RUNE_MED
ECHO_STAFF_ORB  = ENERGY_BRIGHT
ECHO_TRIM       = AMBER_MED
ECHO_BELT       = PROTO_DARK
ECHO_EYES       = ENERGY_GLOW
ECHO_HOOD       = (25, 35, 40, 255)

# Tileset colors
TILE_PLAT       = PLAT_MED
TILE_PLAT_D     = PLAT_DARK
TILE_PLAT_L     = PLAT_LIGHT
TILE_PLAT_E     = PLAT_EDGE
TILE_AMBER      = AMBER_MED
TILE_AMBER_D    = AMBER_DARK
TILE_AMBER_B    = AMBER_BRIGHT
TILE_ENERGY     = ENERGY_MED
TILE_ENERGY_D   = ENERGY_DARK
TILE_ENERGY_L   = ENERGY_BRIGHT
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
# ENEMY 1: ELEMENTAL AMALGAM -- fused multi-element creature, 16x16, 8 frames
# Frames 0-3: walk/lumber, Frames 4-7: attack (elemental burst)
# =========================================================================

def draw_elemental_amalgam(draw, ox, oy, frame):
    """Draw a single 16x16 Elemental Amalgam frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, 0, -1, 0][anim]
    stride = [0, 1, 0, -1][anim]

    # Heavy mismatched legs (one molten, one crystalline)
    draw.rectangle([ox + 4, oy + 12 + bob, ox + 6, oy + 14], fill=AMALGAM_BODY_D)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 11, oy + 14], fill=ENERGY_DARK)
    # Feet
    draw.rectangle([ox + 3 + stride, oy + 14, ox + 6 + stride, oy + 15], fill=AMALGAM_BODY)
    draw.rectangle([ox + 9 - stride, oy + 14, ox + 12 - stride, oy + 15], fill=AMALGAM_ICE_D)

    # Torso (fused elemental mass with glowing veins)
    draw.rectangle([ox + 3, oy + 6 + bob, ox + 12, oy + 12 + bob], fill=AMALGAM_BODY)
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 11, oy + 11 + bob], fill=AMALGAM_BODY_L)
    # Fire veins on left side
    draw.point((ox + 5, oy + 8 + bob), fill=AMALGAM_FIRE)
    draw.point((ox + 4, oy + 10 + bob), fill=AMALGAM_FIRE_G)
    # Ice veins on right side
    draw.point((ox + 10, oy + 8 + bob), fill=AMALGAM_ICE)
    draw.point((ox + 11, oy + 10 + bob), fill=AMALGAM_ICE_D)
    # Central instability core
    draw.point((ox + 7, oy + 9 + bob), fill=AMALGAM_CORE)
    draw.point((ox + 8, oy + 9 + bob), fill=AMALGAM_CORE)
    # Shoulder elemental nodes
    draw.rectangle([ox + 2, oy + 6 + bob, ox + 3, oy + 8 + bob], fill=AMALGAM_BODY_L)
    draw.rectangle([ox + 12, oy + 6 + bob, ox + 13, oy + 8 + bob], fill=AMALGAM_BODY_L)
    draw.point((ox + 2, oy + 6 + bob), fill=AMALGAM_FIRE)
    draw.point((ox + 13, oy + 6 + bob), fill=AMALGAM_ICE)

    # Head (asymmetric, half-molten half-frozen)
    draw.rectangle([ox + 5, oy + 2 + bob, ox + 10, oy + 6 + bob], fill=AMALGAM_BODY)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 5 + bob], fill=AMALGAM_BODY_D)
    # Split eyes (fire left, ice right)
    draw.point((ox + 6, oy + 4 + bob), fill=AMALGAM_FIRE_G)
    draw.point((ox + 9, oy + 4 + bob), fill=AMALGAM_ICE)
    # Jagged crown protrusions
    draw.point((ox + 6, oy + 1 + bob), fill=AMALGAM_FIRE)
    draw.point((ox + 9, oy + 1 + bob), fill=AMALGAM_ICE)

    # Arms and attack
    if is_attack:
        burst = [0, 2, 4, 2][anim]
        # Arms raised, elemental energy surging
        draw.rectangle([ox + 12, oy + 5 + bob - burst, ox + 13, oy + 10 + bob], fill=AMALGAM_BODY_L)
        # Fire burst from left arm
        draw.point((ox + 2, oy + 6 + bob - burst), fill=AMALGAM_FIRE_G)
        draw.point((ox + 1, oy + 5 + bob - burst), fill=AMALGAM_FIRE)
        # Ice shard from right arm
        draw.point((ox + 13, oy + 4 + bob - burst), fill=AMALGAM_ICE)
        draw.point((ox + 14, oy + 3 + bob - burst), fill=ENERGY_GLOW)
        # Left arm bracing
        draw.rectangle([ox + 2, oy + 7 + bob, ox + 3, oy + 12 + bob], fill=AMALGAM_BODY_D)
        # Ground elemental scatter
        if burst >= 3:
            draw.point((ox + 12, oy + 15), fill=AMALGAM_FIRE)
            draw.point((ox + 14, oy + 15), fill=AMALGAM_ICE)
    else:
        # Arms at sides, elements flickering
        draw.rectangle([ox + 2, oy + 8 + bob, ox + 3, oy + 12 + bob], fill=AMALGAM_BODY)
        draw.rectangle([ox + 12, oy + 8 + bob, ox + 13, oy + 12 + bob], fill=AMALGAM_BODY)
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 1 + sway, oy + 11 + bob), fill=AMALGAM_FIRE)
        draw.point((ox + 14 - sway, oy + 11 + bob), fill=AMALGAM_ICE)


def generate_elemental_amalgam():
    """Generate 8-frame Elemental Amalgam sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_elemental_amalgam(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_elemental_amalgam.png")
    return img


# =========================================================================
# ENEMY 2: PRIMORDIAL SHARD -- crystalline energy fragment, 16x16, 8 frames
# Frames 0-3: float/pulse, Frames 4-7: attack (shard salvo)
# =========================================================================

def draw_primordial_shard(draw, ox, oy, frame):
    """Draw a single 16x16 Primordial Shard frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [0, -1, -2, -1][anim]
    pulse = [0, 1, 2, 1][anim]

    # Central crystal body (angular diamond shape)
    draw.rectangle([ox + 6, oy + 4 + float_y, ox + 9, oy + 13 + float_y], fill=SHARD_BODY)
    draw.rectangle([ox + 7, oy + 5 + float_y, ox + 8, oy + 12 + float_y], fill=SHARD_BODY_D)
    # Bright energy core
    draw.rectangle([ox + 7, oy + 7 + float_y, ox + 8, oy + 10 + float_y], fill=SHARD_CORE)
    # Crystal facet edges
    draw.point((ox + 5, oy + 6 + float_y), fill=SHARD_EDGE)
    draw.point((ox + 10, oy + 5 + float_y), fill=SHARD_EDGE)
    draw.point((ox + 5, oy + 10 + float_y), fill=SHARD_EDGE)
    draw.point((ox + 10, oy + 9 + float_y), fill=SHARD_EDGE)
    # Expanding pulse halo
    if pulse > 0:
        draw.point((ox + 5 - pulse, oy + 8 + float_y), fill=SHARD_TRAIL)
        draw.point((ox + 10 + pulse, oy + 8 + float_y), fill=SHARD_TRAIL)
    # Rune-script eye markings
    draw.point((ox + 7, oy + 7 + float_y), fill=SHARD_EYE)
    draw.point((ox + 8, oy + 7 + float_y), fill=SHARD_EYE)

    # Top point (sharp crystal crown)
    draw.point((ox + 7, oy + 3 + float_y), fill=SHARD_EDGE)
    draw.point((ox + 8, oy + 2 + float_y), fill=SHARD_CORE)
    draw.point((ox + 6, oy + 4 + float_y), fill=SHARD_FACET)

    # Bottom trailing energy
    draw.point((ox + 7, oy + 14 + float_y), fill=SHARD_TRAIL)
    draw.point((ox + 8, oy + 15), fill=SHARD_TRAIL_L)
    draw.point((ox + 6, oy + 14 + float_y), fill=SHARD_TRAIL_L)

    if is_attack:
        burst = [0, 2, 3, 1][anim]
        # Shard projectiles launching outward
        for sx in range(burst + 1):
            draw.point((ox + 4 - sx, oy + 7 + float_y), fill=SHARD_EDGE)
            draw.point((ox + 11 + sx, oy + 9 + float_y), fill=SHARD_EDGE)
        if burst >= 2:
            draw.point((ox + 3 - burst, oy + 6 + float_y), fill=SHARD_FACET)
            draw.point((ox + 12 + burst, oy + 10 + float_y), fill=SHARD_FACET)
            draw.point((ox + 3 - burst, oy + 8 + float_y), fill=SHARD_CORE)
        # Core overcharges
        draw.rectangle([ox + 6, oy + 6 + float_y, ox + 9, oy + 11 + float_y], fill=SHARD_CORE)
        draw.point((ox + 7, oy + 8 + float_y), fill=SHARD_GLOW)
        draw.point((ox + 8, oy + 8 + float_y), fill=SHARD_GLOW)
    else:
        # Ambient orbiting particles
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 4 + sway, oy + 6 + float_y), fill=SHARD_TRAIL)
        draw.point((ox + 11 - sway, oy + 10 + float_y), fill=SHARD_TRAIL)


def generate_primordial_shard():
    """Generate 8-frame Primordial Shard sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_primordial_shard(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_primordial_shard.png")
    return img


# =========================================================================
# ENEMY 3: CORE SENTINEL -- ancient guardian construct, 16x16, 8 frames
# Frames 0-3: patrol/hover, Frames 4-7: attack (rune beam)
# =========================================================================

def draw_core_sentinel(draw, ox, oy, frame):
    """Draw a single 16x16 Core Sentinel frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, -1, 0, -1][anim]
    drift = [0, 1, 2, 1][anim]

    # Hovering lower body (no legs — levitates on rune energy)
    draw.rectangle([ox + 5, oy + 12 + bob, ox + 10, oy + 15], fill=SENTINEL_BODY)
    draw.point((ox + 4, oy + 14 + bob), fill=RUNE_DIM)
    draw.point((ox + 11, oy + 14 + bob), fill=RUNE_DIM)
    # Energy trail below
    draw.point((ox + 6, oy + 15), fill=AMBER_MED)
    draw.point((ox + 9, oy + 15), fill=AMBER_MED)

    # Armored torso (ancient construct plating)
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 11, oy + 12 + bob], fill=SENTINEL_BODY)
    draw.rectangle([ox + 5, oy + 8 + bob, ox + 10, oy + 11 + bob], fill=SENTINEL_ARMOR)
    # Central rune sigil on chest
    draw.point((ox + 7, oy + 9 + bob), fill=SENTINEL_RUNE)
    draw.point((ox + 8, oy + 10 + bob), fill=SENTINEL_RUNE)

    # Head (helmet with visor slit and rune crest)
    draw.rectangle([ox + 5, oy + 3 + bob, ox + 10, oy + 7 + bob], fill=SENTINEL_BODY)
    draw.rectangle([ox + 6, oy + 4 + bob, ox + 9, oy + 6 + bob], fill=SENTINEL_BODY_D)
    # Glowing amber visor
    draw.point((ox + 7, oy + 5 + bob), fill=SENTINEL_EYE)
    draw.point((ox + 9, oy + 5 + bob), fill=SENTINEL_EYE)
    # Rune crest atop helmet
    draw.point((ox + 6, oy + 2 + bob), fill=SENTINEL_RUNE_D)
    draw.point((ox + 8, oy + 2 + bob), fill=SENTINEL_RUNE_D)
    draw.point((ox + 10, oy + 2 + bob), fill=SENTINEL_RUNE_D)
    draw.point((ox + 7, oy + 1 + bob), fill=SENTINEL_RUNE)

    # Energy drift trail
    if drift > 0:
        draw.point((ox + 3 - drift, oy + 9 + bob), fill=AMBER_DARK)
        draw.point((ox + 3 - drift, oy + 10 + bob), fill=(45, 15, 4, 100))

    # Arms and weapon
    if is_attack:
        strike = [0, 2, 4, 2][anim]
        # Arms outstretched channeling rune beam
        draw.rectangle([ox + 2, oy + 8 + bob, ox + 4, oy + 9 + bob], fill=SENTINEL_BODY)
        draw.rectangle([ox + 11, oy + 8 + bob, ox + 13, oy + 9 + bob], fill=SENTINEL_BODY)
        # Rune beam projectile
        if strike > 0:
            for bx in range(strike):
                draw.point((ox + 14 + bx, oy + 8 + bob), fill=SENTINEL_MAGIC)
                if bx > 0:
                    draw.point((ox + 14 + bx, oy + 7 + bob), fill=SENTINEL_MAGIC_B)
                    draw.point((ox + 14 + bx, oy + 9 + bob), fill=SENTINEL_MAGIC_B)
            if strike >= 3:
                draw.point((ox + 14 + strike, oy + 8 + bob), fill=RUNE_GLOW)
    else:
        # Arms at sides, rune energy gathering
        draw.rectangle([ox + 3, oy + 8 + bob, ox + 4, oy + 11 + bob], fill=SENTINEL_BODY)
        draw.rectangle([ox + 11, oy + 8 + bob, ox + 12, oy + 11 + bob], fill=SENTINEL_BODY)
        # Faint rune sparks in hands
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 3 + sway, oy + 12 + bob), fill=SENTINEL_MAGIC)
        draw.point((ox + 12 - sway, oy + 12 + bob), fill=SENTINEL_MAGIC)

    # Ambient rune particles
    wisp_sway = [0, 1, 0, -1][anim]
    draw.point((ox + 7 + wisp_sway, oy + 15), fill=AMBER_DARK)
    draw.point((ox + 9 - wisp_sway, oy + 15), fill=(22, 18, 14, 200))


def generate_core_sentinel():
    """Generate 8-frame Core Sentinel sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_core_sentinel(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_core_sentinel.png")
    return img


# =========================================================================
# BOSS: THE GENESIS FLAME -- towering elemental entity, 32x32, multi-phase
# idle (1 frame), attack (4 frames), phase1/2/3 (1 frame each)
# =========================================================================

def draw_genesis_flame(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw The Genesis Flame boss at 32x32."""
    anim = frame % 4
    breath = [0, -1, 0, 1][anim]

    # Phase color shifts
    body = GENESIS_BODY
    armor = GENESIS_ARMOR
    eye = GENESIS_EYE
    flame = GENESIS_FLAME
    rune = GENESIS_RUNE
    glow = GENESIS_GLOW
    crown = GENESIS_CROWN
    magic = GENESIS_MAGIC
    if phase == 2:
        body = (180, 70, 15, 255)           # intensified molten
        armor = (100, 88, 72, 255)
        eye = RUNE_GLOW
        flame = (255, 200, 80, 255)
        rune = RUNE_GLOW
        glow = (255, 240, 150, 255)
        crown = RUNE_BRIGHT
    elif phase == 3:
        body = (255, 100, 30, 255)          # full primordial ignition
        armor = (110, 95, 78, 255)
        eye = (255, 255, 200, 255)
        magic = ENERGY_GLOW
        flame = (255, 230, 120, 255)
        glow = (255, 250, 200, 255)
        crown = (240, 200, 100, 255)

    outline = OUTLINE

    # Legs -- massive, burning stone
    draw.rectangle([ox + 9, oy + 22 + breath, ox + 13, oy + 27], fill=body)
    draw.rectangle([ox + 18, oy + 22 + breath, ox + 22, oy + 27], fill=body)
    # Molten-stone boots
    draw.rectangle([ox + 8, oy + 27, ox + 14, oy + 30], fill=armor)
    draw.rectangle([ox + 17, oy + 27, ox + 23, oy + 30], fill=armor)
    # Rune trim on boots
    draw.point((ox + 10, oy + 28), fill=rune)
    draw.point((ox + 20, oy + 28), fill=rune)

    # Burning torso with primordial plating
    draw.rectangle([ox + 8, oy + 12 + breath, ox + 23, oy + 22 + breath], fill=GENESIS_CAPE)
    draw.rectangle([ox + 9, oy + 13 + breath, ox + 22, oy + 21 + breath], fill=GENESIS_CAPE_L)
    # Chest elemental plate
    draw.rectangle([ox + 11, oy + 14 + breath, ox + 20, oy + 20 + breath], fill=armor)
    draw.rectangle([ox + 12, oy + 15 + breath, ox + 19, oy + 19 + breath], fill=GENESIS_ARMOR_D)
    # Genesis flame core in chest (the primordial spark)
    draw.rectangle([ox + 14, oy + 16 + breath, ox + 17, oy + 18 + breath], fill=flame)
    draw.point((ox + 15, oy + 17 + breath), fill=glow)
    draw.point((ox + 16, oy + 17 + breath), fill=glow)
    # Rune veins on armor
    draw.point((ox + 12, oy + 15 + breath), fill=rune)
    draw.point((ox + 19, oy + 15 + breath), fill=rune)
    draw.point((ox + 12, oy + 19 + breath), fill=rune)
    draw.point((ox + 19, oy + 19 + breath), fill=rune)

    # Shoulder plates (massive, burning)
    draw.rectangle([ox + 4, oy + 10 + breath, ox + 9, oy + 14 + breath], fill=armor)
    draw.point((ox + 5, oy + 10 + breath), fill=rune)
    draw.rectangle([ox + 22, oy + 10 + breath, ox + 27, oy + 14 + breath], fill=armor)
    draw.point((ox + 26, oy + 10 + breath), fill=rune)
    # Flame wisps off shoulder plates
    draw.point((ox + 6, oy + 12 + breath), fill=flame)
    draw.point((ox + 25, oy + 12 + breath), fill=flame)

    # Cape (burning elemental fabric)
    cape_wave = [0, 1, 2, 1][anim]
    draw.rectangle([ox + 10, oy + 20 + breath, ox + 21, oy + 24 + breath + cape_wave], fill=GENESIS_CAPE)
    draw.point((ox + 11, oy + 24 + breath + cape_wave), fill=GENESIS_CAPE_L)
    draw.point((ox + 20, oy + 24 + breath + cape_wave), fill=GENESIS_CAPE_L)

    # Head (elemental crown, burning visage)
    draw.rectangle([ox + 11, oy + 5 + breath, ox + 20, oy + 12 + breath], fill=body)
    draw.rectangle([ox + 12, oy + 6 + breath, ox + 19, oy + 11 + breath], fill=GENESIS_BODY_D)
    # Face plate (primordial mask)
    draw.rectangle([ox + 13, oy + 7 + breath, ox + 18, oy + 10 + breath], fill=armor)
    # Blazing eyes
    draw.rectangle([ox + 13, oy + 8 + breath, ox + 14, oy + 9 + breath], fill=outline)
    draw.point((ox + 13, oy + 8 + breath), fill=eye)
    draw.rectangle([ox + 17, oy + 8 + breath, ox + 18, oy + 9 + breath], fill=outline)
    draw.point((ox + 18, oy + 8 + breath), fill=eye)

    # Primordial flame crown
    draw.rectangle([ox + 12, oy + 4 + breath, ox + 19, oy + 5 + breath], fill=crown)
    draw.point((ox + 14, oy + 3 + breath), fill=crown)
    draw.point((ox + 15, oy + 2 + breath), fill=GENESIS_CROWN_G)
    draw.point((ox + 16, oy + 2 + breath), fill=GENESIS_CROWN_G)
    draw.point((ox + 17, oy + 3 + breath), fill=crown)
    # Crown center gem (genesis spark)
    draw.point((ox + 15, oy + 3 + breath), fill=flame)
    draw.point((ox + 16, oy + 3 + breath), fill=flame)

    # Flame crown tips (rising fire)
    draw.point((ox + 13, oy + 2 + breath), fill=AMBER_BRIGHT)
    draw.point((ox + 15, oy + 1 + breath), fill=AMBER_GLOW)
    draw.point((ox + 16, oy + 1 + breath), fill=AMBER_GLOW)
    draw.point((ox + 18, oy + 2 + breath), fill=AMBER_BRIGHT)

    # Arms
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        attack_ext = [0, 2, 4, 2][anim]
        # Arms raised, genesis flame eruption
        draw.rectangle([ox + 4, oy + 12 + breath - attack_ext, ox + 8, oy + 18 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 12 + breath - attack_ext, ox + 27, oy + 18 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 12 + breath - attack_ext, ox + 5, oy + 13 + breath - attack_ext], fill=armor)
        draw.rectangle([ox + 26, oy + 12 + breath - attack_ext, ox + 28, oy + 13 + breath - attack_ext], fill=armor)
        # Flame energy between hands
        if attack_ext >= 2:
            for rx in range(6, 26, 2):
                ry = 11 + breath - attack_ext + random.randint(-1, 1)
                if 0 <= oy + ry < 32:
                    draw.point((ox + rx, oy + ry), fill=flame)
            # Central genesis flare
            draw.rectangle([ox + 13, oy + 10 + breath - attack_ext, ox + 18, oy + 12 + breath - attack_ext], fill=magic)
            draw.point((ox + 15, oy + 11 + breath - attack_ext), fill=glow)
            draw.point((ox + 16, oy + 11 + breath - attack_ext), fill=glow)
        # Ground lava cracks
        if attack_ext >= 3:
            for gx in range(3, 29, 3):
                draw.point((ox + gx, oy + 30), fill=flame)
                draw.point((ox + gx, oy + 31), fill=AMBER_DARK)
    else:
        # Idle arms with genesis scepter
        draw.rectangle([ox + 4, oy + 14 + breath, ox + 8, oy + 22 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 14 + breath, ox + 27, oy + 22 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 20 + breath, ox + 5, oy + 22 + breath], fill=armor)
        draw.rectangle([ox + 26, oy + 20 + breath, ox + 28, oy + 22 + breath], fill=armor)
        draw.point((ox + 4, oy + 20 + breath), fill=rune)
        draw.point((ox + 27, oy + 20 + breath), fill=rune)
        # Scepter in right hand (burning staff)
        draw.rectangle([ox + 27, oy + 8 + breath, ox + 27, oy + 22 + breath], fill=GENESIS_WEAPON)
        draw.rectangle([ox + 26, oy + 6 + breath, ox + 28, oy + 8 + breath], fill=rune)
        draw.point((ox + 27, oy + 5 + breath), fill=glow)
        # Floating flame around scepter top
        draw.point((ox + 26, oy + 4 + breath + arm_wave), fill=flame)
        draw.point((ox + 28, oy + 4 + breath + arm_wave), fill=flame)
        draw.point((ox + 27, oy + 3 + breath + arm_wave), fill=AMBER_GLOW)

    # Ambient flame particles rising from body
    for tx in range(10, 22, 3):
        ty = 28 + (anim + tx) % 4
        if ty < 32:
            draw.point((ox + tx, oy + ty), fill=AMBER_BRIGHT)
    # Crown blazing with genesis energy
    draw.point((ox + 14, oy + 2 + breath), fill=flame)
    draw.point((ox + 15, oy + 1 + breath), fill=glow)
    draw.point((ox + 16, oy + 1 + breath), fill=glow)
    draw.point((ox + 17, oy + 2 + breath), fill=flame)


def generate_genesis_flame():
    """Generate all Genesis Flame boss sprite sheets."""
    random.seed(205)

    # Idle
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_genesis_flame(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_genesis_flame_idle.png")

    # Attack -- 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        random.seed(205 + f)
        draw_genesis_flame(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_genesis_flame_attack.png")

    # Phase 1
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_genesis_flame(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_genesis_flame_phase1.png")

    # Phase 2 -- elemental surge
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_genesis_flame(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_genesis_flame_phase2.png")

    # Phase 3 -- full primordial ignition
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_genesis_flame(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_genesis_flame_phase3.png")


# =========================================================================
# NPC: ECHO OF CREATION -- zone quest giver, 16x24
# Ethereal robed figure channeling primordial memory
# =========================================================================

def draw_echo_of_creation(draw, ox, oy):
    """Draw the Echo of Creation NPC at 16x24."""
    # Feet / boots (ancient elemental traveler boots)
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=PROTO_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=PROTO_DARK)

    # Robe (long, with elemental shimmer)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=ECHO_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=ECHO_ROBE_L)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=ECHO_ROBE)
    # Amber trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=ECHO_TRIM)

    # Belt with primordial clasp
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=ECHO_BELT)
    # Energy crystal pendant
    draw.point((ox + 8, oy + 15), fill=ENERGY_BRIGHT)
    draw.point((ox + 8, oy + 16), fill=AMBER_MED)

    # Arms (in robe sleeves)
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=ECHO_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=ECHO_ROBE)
    # Amber cuffs
    draw.point((ox + 2, oy + 16), fill=ECHO_TRIM)
    draw.point((ox + 14, oy + 16), fill=ECHO_TRIM)
    # Hands
    draw.point((ox + 2, oy + 17), fill=ECHO_SKIN)
    draw.point((ox + 14, oy + 17), fill=ECHO_SKIN)

    # Primordial memory orb (held in left hand)
    draw.rectangle([ox + 1, oy + 15, ox + 3, oy + 18], fill=ENERGY_DARK)
    draw.point((ox + 2, oy + 16), fill=ENERGY_BRIGHT)
    # Glowing core inside orb
    draw.rectangle([ox + 1, oy + 16, ox + 1, oy + 17], fill=ENERGY_GLOW)

    # Staff (right hand -- creation-touched rod)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=ECHO_STAFF)
    # Flame crystal at top of staff
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=AMBER_DARK)
    draw.point((ox + 14, oy + 1), fill=ECHO_STAFF_ORB)
    draw.point((ox + 14, oy + 2), fill=ENERGY_BRIGHT)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=ECHO_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=ECHO_SKIN)

    # Hood (deep, elemental-touched)
    draw.rectangle([ox + 4, oy + 2, ox + 12, oy + 5], fill=ECHO_HOOD)
    draw.point((ox + 4, oy + 5), fill=ECHO_HOOD)
    draw.point((ox + 4, oy + 6), fill=ECHO_HOOD)
    draw.point((ox + 12, oy + 5), fill=ECHO_HOOD)
    draw.point((ox + 12, oy + 6), fill=ECHO_HOOD)

    # Glowing energy eyes (primordial sight)
    draw.point((ox + 6, oy + 6), fill=ECHO_EYES)
    draw.point((ox + 10, oy + 6), fill=ECHO_EYES)
    # Rune mark on forehead
    draw.point((ox + 8, oy + 5), fill=ENERGY_BRIGHT)

    # Circlet under hood (rune-studded)
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 4], fill=AMBER_MED)
    draw.point((ox + 8, oy + 3), fill=ENERGY_BRIGHT)


def generate_echo_of_creation():
    """Generate Echo of Creation NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_echo_of_creation(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_primordial_core.png")
    return img


# =========================================================================
# TILESET -- tileset_primordial_core.png (256x64, 16 cols x 4 rows)
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

def tile_crystal_platform(tile):
    """Crystallized energy platform surface."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    for x in range(0, 16, 3):
        for y in range(0, 16, 4):
            d.point((x + 1, y + 2), fill=TILE_PLAT_D)


def tile_molten_rune_floor(tile):
    """Molten rune-inscribed floor with glowing cracks."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    # Molten cracks
    d.line([(2, 3), (7, 9)], fill=TILE_AMBER_D, width=1)
    d.line([(10, 1), (8, 6)], fill=TILE_AMBER_D, width=1)
    d.line([(5, 11), (12, 14)], fill=TILE_AMBER_D, width=1)
    # Lava glow in cracks
    d.point((5, 6), fill=TILE_AMBER)
    d.point((9, 3), fill=TILE_AMBER)


def tile_energy_pillar(tile):
    """Crystallized energy pillar."""
    d = ImageDraw.Draw(tile)
    # Pillar body
    d.rectangle([4, 0, 11, 15], fill=TILE_PLAT)
    d.rectangle([5, 0, 10, 15], fill=TILE_PLAT_L)
    # Rune bands
    d.rectangle([4, 3, 11, 3], fill=TILE_RUNE)
    d.rectangle([4, 12, 11, 12], fill=TILE_RUNE)
    # Energy crystal veins
    d.point((6, 7), fill=TILE_ENERGY)
    d.point((9, 9), fill=TILE_ENERGY_D)


def tile_fractured_reality(tile):
    """Fractured reality shard floor."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([1, 1, 14, 14], fill=TILE_PLAT_D)
    # Element stains
    d.point((4, 4), fill=TILE_AMBER_D)
    d.point((11, 7), fill=TILE_ENERGY_D)
    d.point((7, 12), fill=TILE_AMBER_D)
    d.point((3, 9), fill=TILE_ENERGY_D)


def tile_wall_top(tile):
    """Top of primordial wall."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 6, 15, 15], fill=TILE_PLAT)
    d.rectangle([1, 7, 14, 14], fill=TILE_PLAT_D)
    # Crumbling edge
    d.point((3, 5), fill=TILE_PLAT)
    d.point((7, 4), fill=TILE_PLAT)
    d.point((11, 5), fill=TILE_PLAT_D)
    # Amber rune trim at top
    d.rectangle([0, 6, 15, 6], fill=TILE_RUNE_D)


def tile_energy_crystal_cluster(tile):
    """Crystallized energy shard cluster."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TRANSPARENT)
    # Central crystal
    d.rectangle([5, 2, 8, 10], fill=TILE_ENERGY)
    d.rectangle([6, 3, 7, 9], fill=TILE_ENERGY_L)
    # Side crystals (smaller, angled)
    d.rectangle([2, 5, 4, 10], fill=TILE_ENERGY_D)
    d.point((3, 4), fill=TILE_ENERGY)
    d.rectangle([10, 4, 12, 10], fill=TILE_ENERGY_D)
    d.point((11, 3), fill=TILE_ENERGY)
    # Glow at tips
    d.point((6, 1), fill=ENERGY_GLOW)
    d.point((11, 2), fill=ENERGY_BRIGHT)
    # Base rock
    d.rectangle([1, 10, 13, 15], fill=TILE_PLAT_D)


def tile_lava_pool(tile):
    """Molten lava pool tile."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Lava pool interior
    d.rectangle([2, 2, 13, 13], fill=AMBER_DARK)
    d.rectangle([3, 3, 12, 12], fill=AMBER_MED)
    d.rectangle([5, 5, 10, 10], fill=AMBER_BRIGHT)
    # Bright center
    d.rectangle([6, 6, 9, 9], fill=AMBER_GLOW)
    # Edge crust
    d.point((2, 5), fill=TILE_PLAT)
    d.point((13, 8), fill=TILE_PLAT)


def tile_floating_dais(tile):
    """Floating elemental dais with rune circle."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TRANSPARENT)
    # Dais platform
    d.rectangle([1, 6, 14, 14], fill=TILE_PLAT)
    d.rectangle([2, 7, 13, 13], fill=TILE_PLAT_L)
    # Rune circle
    d.point((4, 9), fill=TILE_RUNE)
    d.point((7, 8), fill=TILE_RUNE)
    d.point((10, 9), fill=TILE_RUNE)
    d.point((7, 12), fill=TILE_RUNE)
    # Center power node
    d.point((7, 10), fill=RUNE_BRIGHT)
    d.point((8, 10), fill=RUNE_BRIGHT)
    # Underside glow
    d.rectangle([3, 14, 12, 15], fill=c(AMBER_DARK, 120))


def tile_void_gap(tile):
    """Empty void gap (transparent with faint energy)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TRANSPARENT)
    # Faint swirling energy
    d.point((4, 4), fill=c(AMBER_DARK, 40))
    d.point((10, 8), fill=c(ENERGY_DARK, 40))
    d.point((7, 12), fill=c(AMBER_DARK, 30))


def tile_rune_plate(tile):
    """Inscribed rune plate floor tile."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([1, 1, 14, 14], fill=TILE_PLAT_L)
    # Rune inscriptions
    d.line([(3, 3), (12, 3)], fill=TILE_RUNE_D, width=1)
    d.line([(3, 12), (12, 12)], fill=TILE_RUNE_D, width=1)
    d.line([(3, 3), (3, 12)], fill=TILE_RUNE_D, width=1)
    d.line([(12, 3), (12, 12)], fill=TILE_RUNE_D, width=1)
    # Center rune glow
    d.point((7, 7), fill=RUNE_BRIGHT)
    d.point((8, 8), fill=RUNE_BRIGHT)


def tile_reality_portal(tile):
    """Swirling elemental portal fragment."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TRANSPARENT)
    # Portal ring
    d.ellipse([2, 2, 13, 13], fill=c(ENERGY_DARK, 120))
    d.ellipse([4, 4, 11, 11], fill=c(AMBER_DARK, 150))
    d.ellipse([6, 6, 9, 9], fill=c(AMBER_BRIGHT, 200))
    # Core glow
    d.point((7, 7), fill=AMBER_GLOW)
    d.point((8, 8), fill=ENERGY_GLOW)


def tile_elemental_carpet(tile):
    """Woven elemental energy floor."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    # Woven pattern
    for x in range(0, 16, 4):
        for y in range(0, 16, 4):
            d.rectangle([x, y, x + 1, y + 1], fill=TILE_RUNE_D)
    # Central motif
    d.rectangle([6, 6, 9, 9], fill=TILE_RUNE)
    d.point((7, 7), fill=TILE_AMBER)


def tile_edge_top(tile):
    """Top edge tile."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TRANSPARENT)
    d.rectangle([0, 8, 15, 15], fill=TILE_PLAT)
    d.rectangle([0, 8, 15, 8], fill=TILE_PLAT_E)


def tile_edge_bottom(tile):
    """Bottom edge tile."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 7], fill=TILE_PLAT)
    d.rectangle([0, 7, 15, 7], fill=TILE_PLAT_E)
    d.rectangle([0, 8, 15, 15], fill=TRANSPARENT)


def tile_edge_left(tile):
    """Left edge tile."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TRANSPARENT)
    d.rectangle([8, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([8, 0, 8, 15], fill=TILE_PLAT_E)


def tile_edge_right(tile):
    """Right edge tile."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 7, 15], fill=TILE_PLAT)
    d.rectangle([7, 0, 7, 15], fill=TILE_PLAT_E)
    d.rectangle([8, 0, 15, 15], fill=TRANSPARENT)


def tile_stone_variant1(tile):
    """Stone floor variant 1."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.point((3, 5), fill=TILE_PLAT_L)
    d.point((10, 10), fill=TILE_PLAT_D)
    d.point((7, 3), fill=TILE_PLAT_L)
    d.point((12, 8), fill=TILE_PLAT_D)


def tile_stone_variant2(tile):
    """Stone floor variant 2."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.point((4, 7), fill=TILE_PLAT_D)
    d.point((11, 3), fill=TILE_PLAT_D)
    d.point((8, 13), fill=TILE_PLAT_L)
    d.point((2, 10), fill=TILE_PLAT_D)


def generate_tileset():
    """Generate tileset_primordial_core.png (256x64)."""
    random.seed(205)
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground / terrain tiles
    row0 = [
        tile_crystal_platform, tile_molten_rune_floor, tile_floating_dais, tile_void_gap,
        tile_fractured_reality, tile_wall_top, tile_energy_crystal_cluster, tile_lava_pool,
        tile_stone_variant1, tile_stone_variant2, tile_edge_top, tile_edge_bottom,
        tile_edge_left, tile_edge_right, tile_rune_plate, tile_crystal_platform,
    ]
    for i, fn in enumerate(row0):
        random.seed(205 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Features and decorations
    row1 = [
        tile_energy_pillar, tile_reality_portal, tile_rune_plate, tile_floating_dais,
        tile_crystal_platform, tile_molten_rune_floor, tile_void_gap, tile_fractured_reality,
        tile_wall_top, tile_edge_top, tile_stone_variant1, tile_stone_variant2,
        tile_edge_left, tile_edge_right, tile_elemental_carpet, tile_energy_crystal_cluster,
    ]
    for i, fn in enumerate(row1):
        random.seed(205 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions
    row2 = [
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_void_gap, tile_void_gap, tile_crystal_platform, tile_fractured_reality,
        tile_crystal_platform, tile_molten_rune_floor, tile_fractured_reality, tile_wall_top,
        tile_rune_plate, tile_lava_pool, tile_energy_crystal_cluster, tile_floating_dais,
    ]
    for i, fn in enumerate(row2):
        random.seed(205 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: Variants and fill
    row3 = [
        tile_reality_portal, tile_rune_plate, tile_energy_pillar, tile_floating_dais,
        tile_wall_top, tile_fractured_reality, tile_void_gap, tile_crystal_platform,
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_stone_variant1, tile_stone_variant2, tile_elemental_carpet, tile_molten_rune_floor,
    ]
    for i, fn in enumerate(row3):
        random.seed(205 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(205)
    out = TILESETS_DIR / "tileset_primordial_core.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# PARALLAX BACKGROUNDS -- 320x180, three layers (far/mid/near)
# =========================================================================

def generate_parallax():
    """Three parallax layers for Primordial Core zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # -- FAR LAYER: swirling elemental vortex sky --
    far = Image.new("RGBA", (320, 180), SKY_ABYSS)
    fd = ImageDraw.Draw(far)
    # Primordial sky gradient (top = abyss, bottom = deep amber glow)
    for y in range(180):
        ratio = y / 180
        r = int(SKY_ABYSS[0] * (1 - ratio) + SKY_DEEP[0] * ratio)
        g = int(SKY_ABYSS[1] * (1 - ratio) + SKY_DEEP[1] * ratio)
        b = int(SKY_ABYSS[2] * (1 - ratio) + SKY_DEEP[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    # Massive elemental vortex across sky (swirling amber-energy rift)
    random.seed(205)
    vortex_cx, vortex_cy = 160, 55
    for tx in range(-70, 71):
        ty = int(tx * 0.35 + 8 * math.sin(tx * 0.08) + random.randint(-2, 2))
        px, py = vortex_cx + tx, vortex_cy + ty
        if 0 <= px < 320 and 0 <= py < 180:
            dist = abs(tx) / 70
            alpha = int(180 * (1 - dist))
            if alpha > 0:
                far.putpixel((px, py), c(AMBER_BRIGHT, min(alpha, 200)))
                for dy in range(-2, 3):
                    if 0 <= py + dy < 180:
                        ga = int(alpha * 0.3 * (1 - abs(dy) / 3))
                        if ga > 0:
                            far.putpixel((px, py + dy), c(AMBER_DARK, ga))

    # Scattered elemental nebula clouds
    for _ in range(6):
        nx = random.randint(20, 300)
        ny = random.randint(10, 80)
        nw = random.randint(30, 60)
        nh = random.randint(8, 20)
        cloud_color = random.choice([AMBER_DARK, ENERGY_DEEP, PROTO_DARK])
        for px in range(nx, nx + nw):
            for py in range(ny, ny + nh):
                if 0 <= px < 320 and 0 <= py < 180:
                    dist = ((px - nx - nw / 2) ** 2 + (py - ny - nh / 2) ** 2) ** 0.5
                    max_dist = (nw / 2 + nh / 2) / 2
                    if dist < max_dist:
                        alpha = int(30 * (1 - dist / max_dist))
                        if alpha > 0:
                            far.putpixel((px, py), c(cloud_color, alpha))

    # Dim elemental sparks across sky
    for _ in range(25):
        sx, sy = random.randint(0, 319), random.randint(0, 100)
        alpha = random.randint(40, 120)
        spark_color = random.choice([AMBER_MED, ENERGY_MED, RUNE_DIM])
        far.putpixel((sx, sy), c(spark_color, alpha))

    # Distant proto-matter formations on horizon
    formation_positions = [(15, 130), (70, 118), (140, 132), (220, 122), (285, 128)]
    for fp_x, fp_y in formation_positions:
        fw = random.randint(8, 16)
        fh = random.randint(18, 40)
        # Formation body (dark molten chunk)
        fd.rectangle([fp_x, fp_y - fh, fp_x + fw, fp_y], fill=c(PROTO_DARK))
        # Crumbling top
        fd.rectangle([fp_x + fw // 4, fp_y - fh - 6, fp_x + fw - fw // 4, fp_y - fh], fill=c(PROTO_DARK))
        fd.point((fp_x + fw // 2, fp_y - fh - 8), fill=c(PROTO_DARK))
        # Amber lava glow at tip
        fd.point((fp_x + fw // 2, fp_y - fh - 7), fill=c(AMBER_BRIGHT, 120))
        # Faint internal glow
        fd.point((fp_x + fw // 2, fp_y - fh + 5), fill=c(AMBER_DARK, 80))

    # Horizon glow (primordial amber)
    for y in range(140, 180):
        ratio = (y - 140) / 40
        alpha = int(60 * ratio)
        if alpha > 0:
            fd.line([(0, y), (319, y)], fill=c(SKY_GLOW, alpha))

    far_out = PARALLAX_DIR / "bg_parallax_primordial_core_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # -- MID LAYER: colliding energy planes and floating platforms --
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(206)

    # Elemental energy clouds
    for _ in range(5):
        cx = random.randint(-20, 300)
        cy = random.randint(50, 120)
        cw = random.randint(40, 80)
        ch = random.randint(5, 10)
        cloud_color = random.choice([AMBER_DARK, ENERGY_DEEP])
        md.rectangle([cx, cy, cx + cw, cy + ch], fill=c(cloud_color, 40))
        md.rectangle([cx + 8, cy + 2, cx + cw - 8, cy + ch - 2], fill=c(PROTO_DARK, 60))

    # Mid-ground floating energy platforms
    platform_positions = [(15, 138), (85, 128), (165, 142), (255, 132)]
    for bx, by in platform_positions:
        bw = random.randint(30, 50)
        bh = random.randint(10, 18)
        # Platform body
        md.rectangle([bx, by, bx + bw, by + bh], fill=c(PLAT_MED))
        md.rectangle([bx + 1, by + 1, bx + bw - 1, by + bh - 2], fill=c(PLAT_LIGHT))
        # Jagged top
        for mx in range(bx, bx + bw, 8):
            md.rectangle([mx, by - 4, mx + 3, by], fill=c(PLAT_MED))
        # Amber rune trim along edge
        md.rectangle([bx, by, bx + bw, by], fill=c(AMBER_DARK, 140))
        # Lava glow through cracks
        crack_x = bx + random.randint(8, max(9, bw - 8))
        md.rectangle([crack_x, by + 2, crack_x + 2, by + 6], fill=c(AMBER_MED, 120))

    # Mid-ground floating debris (proto-matter chunks)
    for _ in range(8):
        dx = random.randint(10, 310)
        dy = random.randint(60, 140)
        dw = random.randint(4, 10)
        dh = random.randint(2, 5)
        md.rectangle([dx, dy, dx + dw, dy + dh], fill=c(PLAT_MED, 80))

    # Elemental energy wisps
    for _ in range(10):
        wx = random.randint(10, 310)
        wy = random.randint(40, 150)
        wlen = random.randint(8, 22)
        wisp_color = random.choice([AMBER_MED, ENERGY_MED])
        for wi in range(wlen):
            wpx = wx + wi
            wpy = wy + int(3 * math.sin(wi * 0.5))
            if 0 <= wpx < 320 and 0 <= wpy < 180:
                alpha = 110 - wi * 4
                if alpha > 0:
                    mid.putpixel((wpx, wpy), c(wisp_color, alpha))

    mid_out = PARALLAX_DIR / "bg_parallax_primordial_core_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # -- NEAR LAYER: foreground elemental mist and particles --
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(207)

    # Foreground elemental mist at bottom
    for x in range(0, 320, 2):
        h = random.randint(8, 25)
        base_y = 175
        for y in range(base_y - h, base_y):
            if 0 <= y < 180:
                alpha = 140 - int((base_y - y) * 4.5)
                if alpha > 0:
                    near.putpixel((x, y), c(AMBER_DARK, min(alpha, 160)))
                    if x + 1 < 320:
                        near.putpixel((x + 1, y), c(AMBER_DARK, min(alpha, 160)))

    # Bottom lava floor glow
    nd.rectangle([0, 172, 319, 179], fill=c(AMBER_MED, 120))

    # Floating energy particles (rising embers)
    for _ in range(25):
        ax = random.randint(0, 319)
        ay = random.randint(20, 170)
        length = random.randint(3, 6)
        color_choice = random.choice([AMBER_GLOW, ENERGY_BRIGHT, RUNE_BRIGHT])
        for i in range(length):
            px = ax + i
            py = ay - i * 2  # drift upward
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = 130 - i * 20
                if alpha > 0:
                    near.putpixel((px, py), c(color_choice, alpha))

    # Ember / spark particles
    for _ in range(25):
        wx = random.randint(0, 319)
        wy = random.randint(10, 155)
        color_choice = random.choice([AMBER_GLOW, ENERGY_BRIGHT, RUNE_BRIGHT, CRYSTAL_AMBER])
        near.putpixel((wx, wy), c(color_choice, 160))
        if wx + 1 < 320:
            near.putpixel((wx + 1, wy), c(color_choice, 80))

    # Foreground floating proto-matter fragments
    for fx in range(15, 320, 65):
        fy = random.randint(12, 50)
        fw = random.randint(5, 12)
        fh = random.randint(2, 4)
        nd.rectangle([fx, fy, fx + fw, fy + fh], fill=c(PLAT_MED, 70))
        nd.point((fx + fw // 2, fy), fill=c(PLAT_LIGHT, 90))

    near_out = PARALLAX_DIR / "bg_parallax_primordial_core_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# =========================================================================
# MAIN
# =========================================================================

def main():
    print("Generating Primordial Core zone assets (PIX-205)...")
    print()

    print("[1/8] Elemental Amalgam enemy sprite sheet")
    generate_elemental_amalgam()
    print()

    print("[2/8] Primordial Shard enemy sprite sheet")
    generate_primordial_shard()
    print()

    print("[3/8] Core Sentinel enemy sprite sheet")
    generate_core_sentinel()
    print()

    print("[4/8] The Genesis Flame boss sprites (idle, attack, phases 1-3)")
    generate_genesis_flame()
    print()

    print("[5/8] Echo of Creation NPC sprite")
    generate_echo_of_creation()
    print()

    print("[6/8] Primordial Core tileset (256x64)")
    generate_tileset()
    print()

    print("[7/8] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[8/8] Done! All Primordial Core zone assets generated.")


if __name__ == "__main__":
    main()
