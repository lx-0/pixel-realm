#!/usr/bin/env python3
"""
Generate Astral Pinnacle zone art assets for PixelRealm (PIX-221).
Produces:
  - 4 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Astral Pinnacle color language: pure starlight white, cosmic violet, nebula
magenta, stellar gold, deep-space black, aurora teal — the ultimate celestial
apex where reality converges to a single transcendent point of cosmic power.
Final endgame zone (level 50), conveying ultimate cosmic grandeur and finality.
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

# -- Astral Pinnacle Color Palette -----------------------------------------------

# Deep space / cosmic void (base atmosphere)
SPACE_BLACK     = (2, 1, 8, 255)               # absolute deep space
SPACE_DARK      = (6, 4, 18, 255)              # dark space
SPACE_MED       = (14, 10, 35, 255)            # mid space
SPACE_DEEP      = (22, 16, 48, 255)            # deep cosmic haze

# Cosmic violet / stellar purple (dominant atmosphere)
VIOLET_BLACK    = (12, 6, 28, 255)             # deepest cosmic violet
VIOLET_DARK     = (28, 16, 58, 255)            # dark violet
VIOLET_MED      = (55, 32, 100, 255)           # mid violet
VIOLET_BRIGHT   = (90, 55, 160, 255)           # bright violet
VIOLET_GLOW     = (140, 90, 220, 255)          # violet glow

# Nebula magenta / pink (secondary accent)
NEBULA_DARK     = (45, 12, 40, 255)            # deep nebula
NEBULA_MED      = (100, 30, 85, 255)           # mid nebula
NEBULA_BRIGHT   = (170, 60, 140, 255)          # bright nebula
NEBULA_GLOW     = (220, 100, 180, 255)         # nebula glow
NEBULA_PULSE    = (240, 140, 210, 255)         # pulsing nebula

# Pure starlight / celestial white (primary energy)
STAR_DIM        = (180, 180, 210, 255)         # dim starlight
STAR_BRIGHT     = (220, 220, 245, 255)         # bright starlight
STAR_WHITE      = (245, 242, 255, 255)         # near-pure white
STAR_CORE       = (255, 252, 255, 255)         # core starlight
STAR_WARM       = (255, 240, 220, 255)         # warm starlight

# Stellar gold / cosmic radiance
SGOLD_DARK      = (50, 40, 15, 255)            # deep stellar gold
SGOLD_MED       = (120, 95, 30, 255)           # mid gold
SGOLD_BRIGHT    = (200, 170, 50, 255)          # bright gold
SGOLD_GLOW      = (255, 225, 80, 255)          # searing stellar gold

# Aurora teal / cosmic energy (tertiary accent)
AURORA_DARK     = (10, 40, 45, 255)            # deep aurora
AURORA_MED      = (30, 100, 110, 255)          # mid aurora
AURORA_BRIGHT   = (60, 180, 190, 255)          # bright aurora
AURORA_GLOW     = (100, 230, 235, 255)         # aurora glow

# Astral crystal / pinnacle architecture
ASTRAL_BLACK    = (8, 6, 16, 255)              # deepest astral stone
ASTRAL_DARK     = (18, 14, 32, 255)            # dark astral stone
ASTRAL_MED      = (38, 30, 62, 255)            # mid astral stone
ASTRAL_LIGHT    = (60, 52, 90, 255)            # light astral stone
ASTRAL_EDGE     = (85, 76, 120, 255)           # astral highlight

# Cosmic rift / convergence energy
RIFT_VIOLET     = (130, 70, 220, 255)          # violet convergence
RIFT_STAR       = (240, 235, 255, 255)         # starlight rift flash
RIFT_NEBULA     = (200, 80, 160, 255)          # nebula rift

# Sky / deep space gradient
SKY_VOID        = (2, 1, 6, 255)              # upper void
SKY_DEEP        = (8, 5, 22, 255)             # deep cosmic sky
SKY_MID         = (18, 12, 42, 255)           # mid cosmic
SKY_HORIZON     = (35, 22, 65, 255)           # horizon glow

# Neutrals
WHITE           = (245, 242, 255, 255)
BLACK           = (2, 1, 8, 255)
OUTLINE         = (2, 1, 8, 255)
TRANSPARENT     = (0, 0, 0, 0)

# Platform / astral floor
PLAT_DARK       = (22, 18, 40, 255)
PLAT_MED        = (38, 32, 60, 255)
PLAT_LIGHT      = (58, 50, 85, 255)
PLAT_EDGE       = (80, 72, 110, 255)

# -- Creature-specific palettes -----------------------------------------------

# Astral Warden -- celestial guardian, star-forged armor, dual starlight blades
WARDEN_BODY     = ASTRAL_MED
WARDEN_BODY_L   = ASTRAL_LIGHT
WARDEN_BODY_D   = ASTRAL_DARK
WARDEN_ARMOR    = PLAT_LIGHT
WARDEN_ARMOR_D  = PLAT_MED
WARDEN_EYE      = STAR_WHITE
WARDEN_CORE     = VIOLET_BRIGHT
WARDEN_RUNE     = SGOLD_BRIGHT
WARDEN_GLOW     = STAR_BRIGHT
WARDEN_BLADE    = AURORA_GLOW

# Cosmic Devourer -- black-hole entity, consumes starlight, dark core with light rim
DEVOURER_BODY   = (8, 4, 14, 240)             # near-black absorbing
DEVOURER_BODY_D = (4, 2, 8, 250)
DEVOURER_EDGE   = NEBULA_BRIGHT
DEVOURER_CORE   = (2, 1, 4, 255)              # absolute black core
DEVOURER_GLOW   = NEBULA_GLOW
DEVOURER_RIM    = SGOLD_GLOW
DEVOURER_TRAIL  = (30, 15, 50, 80)
DEVOURER_TRAIL_L = (50, 25, 80, 50)
DEVOURER_EYE    = NEBULA_PULSE

# Nebula Wisp -- born from dying stars, ethereal and luminescent
WISP_BODY       = (80, 50, 140, 160)          # semi-transparent nebula
WISP_BODY_D     = (55, 30, 100, 180)
WISP_EDGE       = NEBULA_GLOW
WISP_CORE       = STAR_WHITE
WISP_GLOW       = NEBULA_PULSE
WISP_TRAIL      = (70, 40, 120, 60)
WISP_TRAIL_L    = (90, 55, 150, 35)
WISP_EYE        = STAR_CORE
WISP_PULSE      = AURORA_BRIGHT

# Stellar Knight -- elite warrior of the astral realm, radiant golden armor
KNIGHT_BODY     = ASTRAL_MED
KNIGHT_BODY_L   = ASTRAL_LIGHT
KNIGHT_BODY_D   = ASTRAL_DARK
KNIGHT_ARMOR    = SGOLD_MED
KNIGHT_ARMOR_L  = SGOLD_BRIGHT
KNIGHT_EYE      = STAR_CORE
KNIGHT_RUNE     = VIOLET_BRIGHT
KNIGHT_GLOW     = SGOLD_GLOW
KNIGHT_BLADE    = STAR_WHITE

# Astral Sovereign boss -- ultimate cosmic entity, the pinnacle incarnate
SOVEREIGN_BODY      = ASTRAL_MED
SOVEREIGN_BODY_D    = ASTRAL_DARK
SOVEREIGN_ARMOR     = ASTRAL_LIGHT
SOVEREIGN_ARMOR_D   = ASTRAL_MED
SOVEREIGN_EYE       = STAR_CORE
SOVEREIGN_FLAME     = VIOLET_GLOW
SOVEREIGN_RUNE      = SGOLD_BRIGHT
SOVEREIGN_GLOW      = STAR_WHITE
SOVEREIGN_CROWN     = SGOLD_MED
SOVEREIGN_CROWN_G   = SGOLD_GLOW
SOVEREIGN_CAPE      = VIOLET_DARK
SOVEREIGN_CAPE_L    = VIOLET_MED
SOVEREIGN_WEAPON    = AURORA_GLOW
SOVEREIGN_BLADE     = STAR_WHITE
SOVEREIGN_MAGIC     = NEBULA_GLOW

# NPC: Star Weaver
WEAVER_ROBE     = (28, 20, 55, 255)
WEAVER_ROBE_L   = (45, 36, 75, 255)
WEAVER_SKIN     = (190, 185, 210, 255)
WEAVER_SKIN_D   = (160, 155, 180, 255)
WEAVER_HAIR     = (220, 215, 240, 255)        # silvery-white cosmic hair
WEAVER_ORB      = AURORA_BRIGHT
WEAVER_ORB_G    = AURORA_GLOW
WEAVER_TRIM     = SGOLD_MED
WEAVER_BELT     = ASTRAL_DARK
WEAVER_EYES     = STAR_CORE
WEAVER_HOOD     = (14, 10, 30, 255)
WEAVER_CRYSTAL  = STAR_WHITE

# Tileset colors
TILE_PLAT       = PLAT_MED
TILE_PLAT_D     = PLAT_DARK
TILE_PLAT_L     = PLAT_LIGHT
TILE_PLAT_E     = PLAT_EDGE
TILE_VIOLET     = VIOLET_MED
TILE_VIOLET_D   = VIOLET_DARK
TILE_VIOLET_B   = VIOLET_BRIGHT
TILE_GOLD       = SGOLD_MED
TILE_GOLD_D     = SGOLD_DARK
TILE_GOLD_L     = SGOLD_BRIGHT
TILE_ASTRAL     = ASTRAL_MED
TILE_ASTRAL_D   = ASTRAL_DARK
TILE_ASTRAL_L   = ASTRAL_LIGHT
TILE_NEBULA     = NEBULA_MED
TILE_NEBULA_D   = NEBULA_DARK


def ensure_dir(path):
    os.makedirs(os.path.dirname(path) if isinstance(path, str) else path.parent, exist_ok=True)


def save_asset(img, rel_path):
    full_path = ASSET_ROOT / rel_path if isinstance(rel_path, str) else rel_path
    ensure_dir(full_path)
    img.save(str(full_path))
    print(f"  Created: {full_path.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# ENEMY 1: ASTRAL WARDEN -- celestial guardian, 16x16, 8 frames
# Frames 0-3: walk/patrol, Frames 4-7: attack (starlight strike)
# Star-forged armor with aurora energy blades
# =========================================================================

def draw_astral_warden(draw, ox, oy, frame):
    """Draw a single 16x16 Astral Warden frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, 0, -1, 0][anim]
    stride = [0, 1, 0, -1][anim]

    # Starlight phase — alternates violet/gold highlights per frame
    phase_color = WARDEN_RUNE if anim % 2 == 0 else VIOLET_BRIGHT

    # Heavy star-forged legs (celestial greaves)
    draw.rectangle([ox + 4, oy + 12 + bob, ox + 6, oy + 14], fill=WARDEN_BODY_D)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 11, oy + 14], fill=WARDEN_BODY_D)
    # Boots with stellar runes
    draw.rectangle([ox + 3 + stride, oy + 14, ox + 6 + stride, oy + 15], fill=WARDEN_ARMOR)
    draw.rectangle([ox + 9 - stride, oy + 14, ox + 12 - stride, oy + 15], fill=WARDEN_ARMOR)
    draw.point((ox + 4 + stride, oy + 14), fill=WARDEN_RUNE)
    draw.point((ox + 10 - stride, oy + 14), fill=WARDEN_RUNE)

    # Torso (star-forged celestial armor with cosmic core)
    draw.rectangle([ox + 3, oy + 6 + bob, ox + 12, oy + 12 + bob], fill=WARDEN_BODY)
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 11, oy + 11 + bob], fill=WARDEN_BODY_L)
    # Cosmic core: starlight center
    draw.point((ox + 7, oy + 9 + bob), fill=STAR_BRIGHT)
    draw.point((ox + 8, oy + 9 + bob), fill=VIOLET_BRIGHT)
    # Stellar rune veins
    draw.point((ox + 5, oy + 8 + bob), fill=phase_color)
    draw.point((ox + 10, oy + 8 + bob), fill=phase_color)
    # Gold rune marks
    draw.point((ox + 4, oy + 10 + bob), fill=WARDEN_RUNE)
    draw.point((ox + 11, oy + 10 + bob), fill=WARDEN_RUNE)
    # Shoulder pauldrons (stellar gold / cosmic violet)
    draw.rectangle([ox + 2, oy + 6 + bob, ox + 3, oy + 8 + bob], fill=WARDEN_ARMOR)
    draw.rectangle([ox + 12, oy + 6 + bob, ox + 13, oy + 8 + bob], fill=WARDEN_ARMOR_D)
    draw.point((ox + 2, oy + 6 + bob), fill=SGOLD_BRIGHT)
    draw.point((ox + 13, oy + 6 + bob), fill=VIOLET_BRIGHT)

    # Head (helm with starlight visor)
    draw.rectangle([ox + 5, oy + 2 + bob, ox + 10, oy + 6 + bob], fill=WARDEN_ARMOR)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 5 + bob], fill=WARDEN_ARMOR_D)
    # Visor slit with blazing starlight eyes
    draw.rectangle([ox + 6, oy + 4 + bob, ox + 9, oy + 4 + bob], fill=OUTLINE)
    draw.point((ox + 6, oy + 4 + bob), fill=WARDEN_EYE)
    draw.point((ox + 9, oy + 4 + bob), fill=AURORA_BRIGHT)
    # Helm crest (twin star spikes)
    draw.point((ox + 7, oy + 1 + bob), fill=STAR_BRIGHT)
    draw.point((ox + 8, oy + 1 + bob), fill=SGOLD_BRIGHT)

    # Arms and attack
    if is_attack:
        burst = [0, 2, 4, 2][anim]
        # Arms raised for starlight strike
        draw.rectangle([ox + 1, oy + 5 + bob - burst, ox + 3, oy + 10 + bob], fill=WARDEN_BODY_L)
        draw.rectangle([ox + 12, oy + 5 + bob - burst, ox + 14, oy + 10 + bob], fill=WARDEN_BODY_L)
        # Gauntlets charging with aurora energy
        draw.point((ox + 1, oy + 5 + bob - burst), fill=WARDEN_BLADE)
        draw.point((ox + 14, oy + 5 + bob - burst), fill=AURORA_GLOW)
        # Starlight shockwave
        if burst >= 2:
            draw.point((ox + 2, oy + 4 + bob - burst), fill=STAR_WHITE)
            draw.point((ox + 13, oy + 4 + bob - burst), fill=SGOLD_GLOW)
            draw.point((ox + 7, oy + 15), fill=AURORA_BRIGHT)
            draw.point((ox + 8, oy + 15), fill=VIOLET_GLOW)
    else:
        # Idle arms with star-forged halberd
        draw.rectangle([ox + 1, oy + 7 + bob, ox + 3, oy + 12 + bob], fill=WARDEN_BODY)
        draw.rectangle([ox + 12, oy + 7 + bob, ox + 14, oy + 12 + bob], fill=WARDEN_BODY)
        # Halberd in right hand
        draw.rectangle([ox + 14, oy + 3 + bob, ox + 14, oy + 13 + bob], fill=ASTRAL_LIGHT)
        draw.point((ox + 14, oy + 2 + bob), fill=AURORA_GLOW)
        draw.point((ox + 13, oy + 3 + bob), fill=ASTRAL_EDGE)


def generate_astral_warden():
    """Generate 8-frame Astral Warden sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_astral_warden(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_astral_warden.png")
    return img


# =========================================================================
# ENEMY 2: COSMIC DEVOURER -- black-hole entity, 16x16, 8 frames
# Frames 0-3: float/pulse, Frames 4-7: attack (gravity pull)
# =========================================================================

def draw_cosmic_devourer(draw, ox, oy, frame):
    """Draw a single 16x16 Cosmic Devourer frame."""
    is_attack = frame >= 4
    anim = frame % 4

    pulse = [0, 1, 2, 1][anim]
    float_y = [0, -1, 0, 1][anim]

    # Gravitational distortion trail (light bending into it)
    draw.rectangle([ox + 5, oy + 13 + float_y, ox + 10, oy + 15], fill=DEVOURER_TRAIL)
    draw.point((ox + 4, oy + 14 + float_y), fill=DEVOURER_TRAIL_L)
    draw.point((ox + 11, oy + 14 + float_y), fill=DEVOURER_TRAIL_L)

    # Event horizon rim (bright ring around darkness)
    draw.rectangle([ox + 3 - pulse // 2, oy + 4 + float_y, ox + 12 + pulse // 2, oy + 13 + float_y], fill=DEVOURER_BODY)
    # Accretion disc glow (nebula magenta + gold ring)
    draw.rectangle([ox + 3 - pulse // 2, oy + 4 + float_y, ox + 12 + pulse // 2, oy + 4 + float_y], fill=DEVOURER_RIM)
    draw.rectangle([ox + 3 - pulse // 2, oy + 13 + float_y, ox + 12 + pulse // 2, oy + 13 + float_y], fill=NEBULA_BRIGHT)
    draw.point((ox + 3 - pulse // 2, oy + 8 + float_y), fill=DEVOURER_EDGE)
    draw.point((ox + 12 + pulse // 2, oy + 8 + float_y), fill=DEVOURER_EDGE)

    # Inner body (absolute black core)
    draw.rectangle([ox + 5, oy + 6 + float_y, ox + 10, oy + 11 + float_y], fill=DEVOURER_BODY_D)
    draw.rectangle([ox + 6, oy + 7 + float_y, ox + 9, oy + 10 + float_y], fill=DEVOURER_CORE)

    # Accretion disc detail
    draw.point((ox + 4, oy + 5 + float_y), fill=SGOLD_BRIGHT)
    draw.point((ox + 11, oy + 5 + float_y), fill=SGOLD_BRIGHT)
    draw.point((ox + 4, oy + 12 + float_y), fill=NEBULA_MED)
    draw.point((ox + 11, oy + 12 + float_y), fill=NEBULA_MED)

    # Top distortion (light bending over)
    draw.rectangle([ox + 5, oy + 2 + float_y, ox + 10, oy + 4 + float_y], fill=DEVOURER_BODY)
    draw.point((ox + 7, oy + 1 + float_y), fill=DEVOURER_RIM)
    draw.point((ox + 8, oy + 1 + float_y), fill=NEBULA_GLOW)

    # Singular eye (eerie nebula pulse at center)
    draw.point((ox + 7, oy + 8 + float_y), fill=DEVOURER_EYE)
    draw.point((ox + 8, oy + 8 + float_y), fill=NEBULA_MED)

    if is_attack:
        pull = [0, 2, 4, 2][anim]
        # Gravity tendrils reaching out to pull
        draw.rectangle([ox + 1 - pull, oy + 6 + float_y, ox + 3, oy + 10 + float_y], fill=DEVOURER_BODY)
        draw.rectangle([ox + 12, oy + 6 + float_y, ox + 14 + pull, oy + 10 + float_y], fill=DEVOURER_BODY)
        # Tendril tips with gravitational lensing
        draw.point((ox + 1 - pull, oy + 7 + float_y), fill=DEVOURER_RIM)
        draw.point((ox + 14 + pull, oy + 7 + float_y), fill=DEVOURER_RIM)
        # Gravity well flash
        if pull >= 2:
            draw.point((ox + 0 - pull, oy + 8 + float_y), fill=NEBULA_GLOW)
            draw.point((ox + 15 + pull, oy + 8 + float_y), fill=NEBULA_GLOW)
            draw.point((ox + 7, oy + 15), fill=DEVOURER_RIM)
            draw.point((ox + 8, oy + 15), fill=NEBULA_PULSE)
    else:
        # Orbiting captured starlight particles
        orbit_offset = anim * 2
        for angle_idx in range(4):
            angle = math.radians(orbit_offset * 30 + angle_idx * 90)
            px = int(ox + 7 + 6 * math.cos(angle))
            py = int(oy + 8 + float_y + 5 * math.sin(angle))
            if 0 <= px - ox < 16 and 0 <= py - oy < 16:
                draw.point((px, py), fill=SGOLD_GLOW)


def generate_cosmic_devourer():
    """Generate 8-frame Cosmic Devourer sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_cosmic_devourer(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_cosmic_devourer.png")
    return img


# =========================================================================
# ENEMY 3: NEBULA WISP -- born from dying stars, 16x16, 8 frames
# Frames 0-3: drift/shimmer, Frames 4-7: attack (stellar flare)
# =========================================================================

def draw_nebula_wisp(draw, ox, oy, frame):
    """Draw a single 16x16 Nebula Wisp frame."""
    is_attack = frame >= 4
    anim = frame % 4

    drift_y = [0, -1, -2, -1][anim]
    shimmer = [0, 1, 2, 1][anim]

    # Luminescent nebula trail (dissolving starlight)
    draw.rectangle([ox + 5, oy + 12 + drift_y, ox + 6, oy + 15], fill=WISP_TRAIL)
    draw.rectangle([ox + 9, oy + 12 + drift_y, ox + 10, oy + 15], fill=WISP_TRAIL)
    draw.point((ox + 4, oy + 14 + drift_y), fill=WISP_TRAIL_L)
    draw.point((ox + 11, oy + 14 + drift_y), fill=WISP_TRAIL_L)

    # Nebula body (semi-transparent, luminescent)
    draw.rectangle([ox + 4, oy + 5 + drift_y, ox + 11, oy + 12 + drift_y], fill=WISP_BODY)
    draw.rectangle([ox + 5, oy + 6 + drift_y, ox + 10, oy + 11 + drift_y], fill=WISP_BODY_D)
    # Nebula swirl highlights
    draw.point((ox + 5, oy + 6 + drift_y), fill=WISP_PULSE)
    draw.point((ox + 10, oy + 8 + drift_y), fill=WISP_PULSE)
    draw.point((ox + 7, oy + 11 + drift_y), fill=NEBULA_BRIGHT)
    # Starlight core
    draw.rectangle([ox + 6, oy + 7 + drift_y, ox + 9, oy + 10 + drift_y], fill=WISP_EDGE)
    draw.point((ox + 7, oy + 8 + drift_y), fill=WISP_CORE)
    draw.point((ox + 8, oy + 9 + drift_y), fill=WISP_GLOW)

    # Top flame tendril
    draw.rectangle([ox + 6, oy + 3 + drift_y, ox + 9, oy + 5 + drift_y], fill=WISP_BODY)
    draw.point((ox + 7, oy + 2 + drift_y), fill=WISP_EDGE)
    draw.point((ox + 8, oy + 2 + drift_y), fill=NEBULA_GLOW)
    draw.point((ox + 7, oy + 1 + drift_y + shimmer // 2), fill=WISP_GLOW)

    # Side nebula tendrils
    draw.rectangle([ox + 3, oy + 7 + drift_y, ox + 4, oy + 9 + drift_y], fill=WISP_BODY)
    draw.point((ox + 2, oy + 7 + drift_y), fill=WISP_EDGE)
    draw.rectangle([ox + 11, oy + 6 + drift_y, ox + 12, oy + 8 + drift_y], fill=WISP_BODY)
    draw.point((ox + 13, oy + 6 + drift_y), fill=WISP_EDGE)

    # Starlight eyes (pure white, piercing)
    draw.point((ox + 7, oy + 7 + drift_y), fill=WISP_EYE)
    draw.point((ox + 8, oy + 7 + drift_y), fill=STAR_BRIGHT)

    if is_attack:
        burst_ext = [0, 2, 3, 1][anim]
        # Stellar flare — nebula energy flying outward
        draw.point((ox + 2 - burst_ext, oy + 5 + drift_y), fill=WISP_EDGE)
        draw.point((ox + 13 + burst_ext, oy + 5 + drift_y), fill=WISP_EDGE)
        draw.point((ox + 1 - burst_ext, oy + 8 + drift_y), fill=NEBULA_GLOW)
        draw.point((ox + 14 + burst_ext, oy + 8 + drift_y), fill=NEBULA_GLOW)
        # Central flare flash
        if burst_ext >= 2:
            draw.point((ox + 7, oy + 5 + drift_y), fill=STAR_WHITE)
            draw.point((ox + 8, oy + 5 + drift_y), fill=STAR_WHITE)
            draw.point((ox + 6, oy + 12 + drift_y), fill=NEBULA_PULSE)
            draw.point((ox + 9, oy + 12 + drift_y), fill=NEBULA_PULSE)
    else:
        # Ambient starlight particles orbiting
        orbit_offset = anim * 2
        for angle_idx in range(3):
            angle = math.radians(orbit_offset * 30 + angle_idx * 120)
            px = int(ox + 7 + 5 * math.cos(angle))
            py = int(oy + 8 + drift_y + 4 * math.sin(angle))
            if 0 <= px - ox < 16 and 0 <= py - oy < 16:
                draw.point((px, py), fill=NEBULA_PULSE)


def generate_nebula_wisp():
    """Generate 8-frame Nebula Wisp sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_nebula_wisp(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_nebula_wisp.png")
    return img


# =========================================================================
# ENEMY 4: STELLAR KNIGHT -- elite astral warrior, 16x16, 8 frames
# Frames 0-3: walk/patrol, Frames 4-7: attack (radiant slash)
# Golden celestial plate with starlight sword
# =========================================================================

def draw_stellar_knight(draw, ox, oy, frame):
    """Draw a single 16x16 Stellar Knight frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, 0, -1, 0][anim]
    stride = [0, 1, 0, -1][anim]

    # Phase glow — alternates gold/violet per frame
    phase_color = KNIGHT_ARMOR_L if anim % 2 == 0 else KNIGHT_RUNE

    # Legs (golden celestial greaves)
    draw.rectangle([ox + 4, oy + 12 + bob, ox + 6, oy + 14], fill=KNIGHT_BODY_D)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 11, oy + 14], fill=KNIGHT_BODY_D)
    # Boots (gold-plated)
    draw.rectangle([ox + 3 + stride, oy + 14, ox + 6 + stride, oy + 15], fill=KNIGHT_ARMOR)
    draw.rectangle([ox + 9 - stride, oy + 14, ox + 12 - stride, oy + 15], fill=KNIGHT_ARMOR)
    draw.point((ox + 4 + stride, oy + 14), fill=SGOLD_GLOW)
    draw.point((ox + 10 - stride, oy + 14), fill=SGOLD_GLOW)

    # Torso (golden celestial plate armor)
    draw.rectangle([ox + 3, oy + 6 + bob, ox + 12, oy + 12 + bob], fill=KNIGHT_BODY)
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 11, oy + 11 + bob], fill=KNIGHT_BODY_L)
    # Radiant starlight core
    draw.point((ox + 7, oy + 9 + bob), fill=STAR_CORE)
    draw.point((ox + 8, oy + 9 + bob), fill=SGOLD_GLOW)
    # Violet cosmic runes
    draw.point((ox + 5, oy + 8 + bob), fill=phase_color)
    draw.point((ox + 10, oy + 8 + bob), fill=phase_color)
    # Gold trim
    draw.point((ox + 4, oy + 10 + bob), fill=KNIGHT_ARMOR_L)
    draw.point((ox + 11, oy + 10 + bob), fill=KNIGHT_ARMOR_L)
    # Golden shoulder pauldrons
    draw.rectangle([ox + 2, oy + 6 + bob, ox + 3, oy + 8 + bob], fill=KNIGHT_ARMOR)
    draw.rectangle([ox + 12, oy + 6 + bob, ox + 13, oy + 8 + bob], fill=KNIGHT_ARMOR)
    draw.point((ox + 2, oy + 6 + bob), fill=SGOLD_GLOW)
    draw.point((ox + 13, oy + 6 + bob), fill=SGOLD_GLOW)

    # Head (stellar helm with radiant crest)
    draw.rectangle([ox + 5, oy + 2 + bob, ox + 10, oy + 6 + bob], fill=KNIGHT_ARMOR)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 5 + bob], fill=SGOLD_MED)
    # Visor with starlight eyes
    draw.rectangle([ox + 6, oy + 4 + bob, ox + 9, oy + 4 + bob], fill=OUTLINE)
    draw.point((ox + 6, oy + 4 + bob), fill=KNIGHT_EYE)
    draw.point((ox + 9, oy + 4 + bob), fill=STAR_BRIGHT)
    # Radiant crest (golden star spikes)
    draw.point((ox + 7, oy + 1 + bob), fill=SGOLD_GLOW)
    draw.point((ox + 8, oy + 1 + bob), fill=STAR_WHITE)

    # Arms and attack
    if is_attack:
        slash = [0, 2, 4, 2][anim]
        # Arms raised for radiant slash
        draw.rectangle([ox + 1, oy + 5 + bob - slash, ox + 3, oy + 10 + bob], fill=KNIGHT_BODY_L)
        draw.rectangle([ox + 12, oy + 5 + bob - slash, ox + 14, oy + 10 + bob], fill=KNIGHT_BODY_L)
        # Starlight blade energy
        draw.point((ox + 1, oy + 5 + bob - slash), fill=KNIGHT_BLADE)
        draw.point((ox + 14, oy + 5 + bob - slash), fill=STAR_CORE)
        # Radiant slash wave
        if slash >= 2:
            draw.point((ox + 2, oy + 4 + bob - slash), fill=STAR_WHITE)
            draw.point((ox + 13, oy + 4 + bob - slash), fill=SGOLD_GLOW)
            draw.point((ox + 7, oy + 15), fill=SGOLD_BRIGHT)
            draw.point((ox + 8, oy + 15), fill=STAR_BRIGHT)
    else:
        # Idle arms with starlight sword
        draw.rectangle([ox + 1, oy + 7 + bob, ox + 3, oy + 12 + bob], fill=KNIGHT_BODY)
        draw.rectangle([ox + 12, oy + 7 + bob, ox + 14, oy + 12 + bob], fill=KNIGHT_BODY)
        # Starlight sword in right hand
        draw.rectangle([ox + 14, oy + 3 + bob, ox + 14, oy + 13 + bob], fill=SGOLD_BRIGHT)
        draw.point((ox + 14, oy + 2 + bob), fill=STAR_WHITE)
        draw.point((ox + 13, oy + 3 + bob), fill=SGOLD_MED)


def generate_stellar_knight():
    """Generate 8-frame Stellar Knight sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_stellar_knight(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_stellar_knight.png")
    return img


# =========================================================================
# BOSS: THE ASTRAL SOVEREIGN -- ultimate cosmic entity, 32x32
# =========================================================================

def draw_astral_sovereign(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw the Astral Sovereign boss at 32x32."""
    anim = frame % 4
    breath = [0, 0, -1, 0][anim]

    # Phase modifiers: increasing cosmic transcendence
    body = SOVEREIGN_BODY if phase == 1 else (SPACE_MED if phase == 3 else ASTRAL_DARK)
    armor = SOVEREIGN_ARMOR if phase < 3 else VIOLET_BRIGHT
    eye = SOVEREIGN_EYE if phase < 3 else STAR_WHITE
    flame = SOVEREIGN_FLAME if phase == 1 else (NEBULA_GLOW if phase == 2 else AURORA_GLOW)
    rune = SOVEREIGN_RUNE if phase < 3 else NEBULA_PULSE
    glow = SOVEREIGN_GLOW if phase == 1 else (STAR_CORE if phase == 3 else STAR_WHITE)
    crown = SOVEREIGN_CROWN if phase < 3 else SGOLD_GLOW
    blade = SOVEREIGN_BLADE if phase < 3 else STAR_CORE
    outline = OUTLINE

    # Legs (celestial greaves with stellar gold inlay)
    draw.rectangle([ox + 10, oy + 24 + breath, ox + 13, oy + 28], fill=body)
    draw.rectangle([ox + 18, oy + 24 + breath, ox + 21, oy + 28], fill=body)
    # Boots (ornate, gleaming with starlight)
    draw.rectangle([ox + 9, oy + 28, ox + 14, oy + 30], fill=armor)
    draw.rectangle([ox + 17, oy + 28, ox + 22, oy + 30], fill=armor)
    draw.point((ox + 11, oy + 28), fill=rune)
    draw.point((ox + 20, oy + 28), fill=rune)
    # Stellar gold accents on greaves
    draw.point((ox + 11, oy + 25 + breath), fill=SGOLD_BRIGHT)
    draw.point((ox + 20, oy + 25 + breath), fill=SGOLD_BRIGHT)

    # Torso (supreme celestial plate, radiating cosmic power)
    draw.rectangle([ox + 8, oy + 13 + breath, ox + 23, oy + 24 + breath], fill=body)
    draw.rectangle([ox + 9, oy + 14 + breath, ox + 22, oy + 23 + breath], fill=SOVEREIGN_BODY_D)
    # Cosmic chest plate with converging starlight
    draw.rectangle([ox + 11, oy + 15 + breath, ox + 20, oy + 21 + breath], fill=armor)
    draw.rectangle([ox + 12, oy + 16 + breath, ox + 19, oy + 20 + breath], fill=SOVEREIGN_ARMOR_D)
    # Central starlight nexus (the cosmic convergence point)
    draw.rectangle([ox + 14, oy + 17 + breath, ox + 17, oy + 19 + breath], fill=VIOLET_BRIGHT)
    draw.point((ox + 15, oy + 18 + breath), fill=glow)
    draw.point((ox + 16, oy + 18 + breath), fill=glow)
    # Starlight radiance lines from core
    draw.point((ox + 13, oy + 18 + breath), fill=SGOLD_BRIGHT)
    draw.point((ox + 18, oy + 18 + breath), fill=SGOLD_BRIGHT)
    draw.point((ox + 15, oy + 16 + breath), fill=STAR_BRIGHT)
    draw.point((ox + 16, oy + 20 + breath), fill=STAR_BRIGHT)
    # Ornate shoulder pauldrons (cosmic symmetry)
    draw.rectangle([ox + 5, oy + 13 + breath, ox + 8, oy + 17 + breath], fill=armor)
    draw.rectangle([ox + 23, oy + 13 + breath, ox + 26, oy + 17 + breath], fill=armor)
    draw.point((ox + 6, oy + 13 + breath), fill=SGOLD_BRIGHT)
    draw.point((ox + 25, oy + 13 + breath), fill=VIOLET_GLOW)
    # Stellar runes on pauldrons
    draw.point((ox + 6, oy + 15 + breath), fill=rune)
    draw.point((ox + 25, oy + 15 + breath), fill=rune)
    # Cosmic energy wisps off shoulders
    draw.point((ox + 5, oy + 12 + breath), fill=flame)
    draw.point((ox + 26, oy + 12 + breath), fill=flame)

    # Cape (cosmic nebula fabric, shimmering violet)
    cape_wave = [0, 1, 2, 1][anim]
    draw.rectangle([ox + 10, oy + 20 + breath, ox + 21, oy + 24 + breath + cape_wave], fill=SOVEREIGN_CAPE)
    draw.point((ox + 11, oy + 24 + breath + cape_wave), fill=SOVEREIGN_CAPE_L)
    draw.point((ox + 20, oy + 24 + breath + cape_wave), fill=SOVEREIGN_CAPE_L)
    # Nebula shimmer in cape
    draw.point((ox + 15, oy + 22 + breath), fill=NEBULA_MED)
    draw.point((ox + 16, oy + 23 + breath), fill=NEBULA_DARK)

    # Head (sovereign helm with celestial crown of stars)
    draw.rectangle([ox + 11, oy + 5 + breath, ox + 20, oy + 12 + breath], fill=body)
    draw.rectangle([ox + 12, oy + 6 + breath, ox + 19, oy + 11 + breath], fill=SOVEREIGN_BODY_D)
    # Face plate (cosmic mask radiating starlight)
    draw.rectangle([ox + 13, oy + 7 + breath, ox + 18, oy + 10 + breath], fill=armor)
    # Blazing eyes (starlight / cosmic violet)
    draw.rectangle([ox + 13, oy + 8 + breath, ox + 14, oy + 9 + breath], fill=outline)
    draw.point((ox + 13, oy + 8 + breath), fill=eye)
    draw.rectangle([ox + 17, oy + 8 + breath, ox + 18, oy + 9 + breath], fill=outline)
    draw.point((ox + 18, oy + 8 + breath), fill=VIOLET_GLOW)

    # Crown of stars (ultimate celestial crown with cosmic spires)
    draw.rectangle([ox + 12, oy + 4 + breath, ox + 19, oy + 5 + breath], fill=crown)
    draw.point((ox + 14, oy + 3 + breath), fill=SGOLD_BRIGHT)
    draw.point((ox + 15, oy + 2 + breath), fill=STAR_WHITE)
    draw.point((ox + 16, oy + 2 + breath), fill=VIOLET_GLOW)
    draw.point((ox + 17, oy + 3 + breath), fill=NEBULA_BRIGHT)
    # Crown center gem (cosmic singularity)
    draw.point((ox + 15, oy + 3 + breath), fill=flame)
    draw.point((ox + 16, oy + 3 + breath), fill=flame)
    # Crown stellar spires reaching upward
    draw.point((ox + 13, oy + 2 + breath), fill=SGOLD_MED)
    draw.point((ox + 15, oy + 1 + breath), fill=glow)
    draw.point((ox + 16, oy + 1 + breath), fill=glow)
    draw.point((ox + 18, oy + 2 + breath), fill=NEBULA_MED)
    # Ultimate crown tips — star points
    draw.point((ox + 14, oy + 1 + breath), fill=STAR_BRIGHT)
    draw.point((ox + 17, oy + 1 + breath), fill=STAR_BRIGHT)

    # Arms
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        attack_ext = [0, 2, 4, 2][anim]
        # Arms raised, cosmic annihilation strike
        draw.rectangle([ox + 4, oy + 12 + breath - attack_ext, ox + 8, oy + 18 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 12 + breath - attack_ext, ox + 27, oy + 18 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 12 + breath - attack_ext, ox + 5, oy + 13 + breath - attack_ext], fill=armor)
        draw.rectangle([ox + 26, oy + 12 + breath - attack_ext, ox + 28, oy + 13 + breath - attack_ext], fill=armor)
        # Cosmic annihilation beam between hands
        if attack_ext >= 2:
            random.seed(221 + frame)
            for rx in range(6, 26, 2):
                ry = 11 + breath - attack_ext + random.randint(-1, 1)
                if 0 <= oy + ry < 32:
                    draw.point((ox + rx, oy + ry), fill=blade)
            # Central beam flare
            draw.rectangle([ox + 13, oy + 10 + breath - attack_ext, ox + 18, oy + 12 + breath - attack_ext], fill=SOVEREIGN_BLADE)
            draw.point((ox + 15, oy + 11 + breath - attack_ext), fill=glow)
            draw.point((ox + 16, oy + 11 + breath - attack_ext), fill=glow)
        # Ground cracks from cosmic impact
        if attack_ext >= 3:
            for gx in range(3, 29, 3):
                draw.point((ox + gx, oy + 30), fill=flame)
                draw.point((ox + gx, oy + 31), fill=VIOLET_DARK)
    else:
        # Idle arms with cosmic scepter
        draw.rectangle([ox + 4, oy + 14 + breath, ox + 8, oy + 22 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 14 + breath, ox + 27, oy + 22 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 20 + breath, ox + 5, oy + 22 + breath], fill=armor)
        draw.rectangle([ox + 26, oy + 20 + breath, ox + 28, oy + 22 + breath], fill=armor)
        draw.point((ox + 4, oy + 20 + breath), fill=rune)
        draw.point((ox + 27, oy + 20 + breath), fill=rune)
        # Cosmic scepter (crystalline starlight staff)
        draw.rectangle([ox + 27, oy + 6 + breath, ox + 27, oy + 22 + breath], fill=AURORA_GLOW)
        draw.rectangle([ox + 28, oy + 7 + breath, ox + 28, oy + 20 + breath], fill=blade)
        draw.point((ox + 27, oy + 5 + breath), fill=glow)
        # Scepter head cosmic aura
        draw.point((ox + 26, oy + 4 + breath + arm_wave), fill=flame)
        draw.point((ox + 29, oy + 4 + breath + arm_wave), fill=blade)
        draw.point((ox + 27, oy + 3 + breath + arm_wave), fill=STAR_CORE)

    # Ambient cosmic particles rising
    for tx in range(10, 22, 3):
        ty = 28 + (anim + tx) % 4
        if ty < 32:
            draw.point((ox + tx, oy + ty), fill=VIOLET_BRIGHT)
    # Crown blazing with cosmic power
    draw.point((ox + 14, oy + 2 + breath), fill=SGOLD_BRIGHT)
    draw.point((ox + 15, oy + 1 + breath), fill=glow)
    draw.point((ox + 16, oy + 1 + breath), fill=glow)
    draw.point((ox + 17, oy + 2 + breath), fill=NEBULA_BRIGHT)


def generate_astral_sovereign():
    """Generate all Astral Sovereign boss sprite sheets."""
    random.seed(221)

    # Idle
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_astral_sovereign(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_astral_sovereign_idle.png")

    # Attack -- 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        random.seed(221 + f)
        draw_astral_sovereign(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_astral_sovereign_attack.png")

    # Phase 1
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_astral_sovereign(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_astral_sovereign_phase1.png")

    # Phase 2 -- cosmic transcendence deepens
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_astral_sovereign(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_astral_sovereign_phase2.png")

    # Phase 3 -- full cosmic apotheosis
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_astral_sovereign(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_astral_sovereign_phase3.png")


# =========================================================================
# NPC: STAR WEAVER -- cosmic sage, 16x24
# Weaves reality from starlight at the apex of the pinnacle
# =========================================================================

def draw_star_weaver(draw, ox, oy):
    """Draw the Star Weaver NPC at 16x24."""
    # Feet / boots (celestial drift boots)
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=ASTRAL_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=ASTRAL_DARK)

    # Robe (long, cosmic violet with stellar gold trim)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=WEAVER_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=WEAVER_ROBE_L)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=WEAVER_ROBE)
    # Gold trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=WEAVER_TRIM)

    # Belt with cosmic clasp
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=WEAVER_BELT)
    # Stellar gold pendant
    draw.point((ox + 8, oy + 15), fill=SGOLD_BRIGHT)
    draw.point((ox + 8, oy + 16), fill=SGOLD_MED)

    # Arms (in robe sleeves)
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=WEAVER_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=WEAVER_ROBE)
    # Gold cuffs
    draw.point((ox + 2, oy + 16), fill=WEAVER_TRIM)
    draw.point((ox + 14, oy + 16), fill=WEAVER_TRIM)
    # Hands
    draw.point((ox + 2, oy + 17), fill=WEAVER_SKIN)
    draw.point((ox + 14, oy + 17), fill=WEAVER_SKIN)

    # Star-weaving orb (held in left hand, aurora teal)
    draw.rectangle([ox + 1, oy + 15, ox + 3, oy + 19], fill=WEAVER_ORB)
    draw.point((ox + 2, oy + 16), fill=WEAVER_ORB_G)
    # Cosmic energy swirl in orb
    draw.point((ox + 1, oy + 17), fill=STAR_WHITE)

    # Celestial staff (right hand — cosmic anchor)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=ASTRAL_LIGHT)
    # Crystal at top
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=ASTRAL_MED)
    draw.point((ox + 14, oy + 1), fill=WEAVER_CRYSTAL)
    draw.point((ox + 14, oy + 2), fill=AURORA_BRIGHT)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=WEAVER_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=WEAVER_SKIN)

    # Hood (deep cosmic violet)
    draw.rectangle([ox + 4, oy + 2, ox + 12, oy + 5], fill=WEAVER_HOOD)
    draw.point((ox + 4, oy + 5), fill=WEAVER_HOOD)
    draw.point((ox + 4, oy + 6), fill=WEAVER_HOOD)
    draw.point((ox + 12, oy + 5), fill=WEAVER_HOOD)
    draw.point((ox + 12, oy + 6), fill=WEAVER_HOOD)

    # Blazing starlight eyes (cosmic sight)
    draw.point((ox + 6, oy + 6), fill=WEAVER_EYES)
    draw.point((ox + 10, oy + 6), fill=WEAVER_EYES)
    # Third-eye hint (faint nebula glow)
    draw.point((ox + 8, oy + 5), fill=NEBULA_GLOW)

    # Circlet under hood (stellar gold with star crystals)
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 4], fill=SGOLD_MED)
    draw.point((ox + 8, oy + 3), fill=STAR_WHITE)


def generate_star_weaver():
    """Generate Star Weaver NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_star_weaver(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_astral_pinnacle.png")
    return img


# =========================================================================
# TILESET -- tileset_astral_pinnacle.png (256x64, 16 cols x 4 rows)
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


def tile_starlight_platform(tile):
    """Solid starlight-infused astral platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([1, 1, 14, 14], fill=TILE_PLAT_L)
    # Stellar luminescent veins
    d.point((4, 4), fill=TILE_GOLD)
    d.point((11, 7), fill=TILE_GOLD)
    d.point((7, 12), fill=TILE_GOLD)
    # Starlight edge highlight
    d.rectangle([0, 0, 15, 0], fill=TILE_PLAT_E)


def tile_nebula_floor(tile):
    """Floor with nebula cracks leaking cosmic light."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    # Nebula crack pattern
    d.rectangle([3, 3, 4, 12], fill=TILE_VIOLET)
    d.rectangle([8, 1, 9, 8], fill=TILE_VIOLET)
    d.rectangle([12, 6, 13, 14], fill=TILE_VIOLET)
    # Starlight bleeding through cracks
    d.point((3, 6), fill=TILE_GOLD_L)
    d.point((8, 4), fill=TILE_GOLD_L)
    d.point((12, 10), fill=TILE_GOLD_L)
    # Nebula marks
    d.point((6, 8), fill=TILE_NEBULA_D)
    d.point((10, 3), fill=TILE_NEBULA_D)


def tile_cosmic_pillar(tile):
    """Vertical cosmic crystal pillar."""
    d = ImageDraw.Draw(tile)
    d.rectangle([5, 0, 10, 15], fill=TILE_ASTRAL_L)
    d.rectangle([6, 0, 9, 15], fill=TILE_PLAT_E)
    # Starlight energy flowing through
    d.rectangle([7, 0, 8, 15], fill=TILE_GOLD)
    # Crystal fractures
    d.point((5, 4), fill=TRANSPARENT)
    d.point((10, 9), fill=TRANSPARENT)
    # Energy nodes
    d.point((7, 3), fill=TILE_GOLD_L)
    d.point((8, 7), fill=TILE_GOLD_L)
    d.point((7, 11), fill=TILE_GOLD_L)
    # Cap
    d.rectangle([4, 0, 11, 1], fill=TILE_PLAT_E)
    d.point((7, 0), fill=SGOLD_GLOW)
    d.point((8, 0), fill=SGOLD_GLOW)


def tile_cosmic_rift(tile):
    """Active cosmic convergence rift."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Rift tear (diagonal energy slash)
    for i in range(12):
        x = 2 + i
        y = 2 + int(i * 0.8)
        if 0 <= x < 16 and 0 <= y < 16:
            d.point((x, y), fill=RIFT_VIOLET)
            if y + 1 < 16:
                d.point((x, y + 1), fill=VIOLET_MED)
    # Starlight bleeding from rift
    d.point((5, 5), fill=STAR_BRIGHT)
    d.point((10, 9), fill=STAR_BRIGHT)
    # Nebula visible through rift
    d.point((7, 7), fill=NEBULA_GLOW)
    d.point((8, 8), fill=NEBULA_GLOW)


def tile_wall_top(tile):
    """Astral wall top."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ASTRAL)
    d.rectangle([0, 0, 15, 3], fill=TILE_ASTRAL_L)
    d.rectangle([0, 12, 15, 15], fill=TILE_ASTRAL_D)
    # Crystal fractures
    d.point((3, 1), fill=TRANSPARENT)
    d.point((12, 2), fill=TRANSPARENT)
    # Stellar gold inlay
    d.point((4, 7), fill=TILE_GOLD)
    d.point((11, 7), fill=TILE_GOLD)
    d.point((7, 5), fill=TILE_VIOLET)
    d.point((8, 10), fill=TILE_VIOLET)
    # Top edge
    d.rectangle([0, 0, 15, 0], fill=TILE_PLAT_E)


def tile_star_cluster(tile):
    """Cluster of crystallized starlight."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Main crystal (starlight white, tall center)
    d.rectangle([6, 2, 9, 13], fill=STAR_DIM)
    d.rectangle([7, 3, 8, 12], fill=STAR_BRIGHT)
    d.point((7, 1), fill=STAR_WHITE)
    # Side crystals (violet and nebula)
    d.rectangle([3, 6, 5, 13], fill=VIOLET_MED)
    d.point((4, 5), fill=VIOLET_BRIGHT)
    d.rectangle([10, 5, 12, 13], fill=NEBULA_MED)
    d.point((11, 4), fill=NEBULA_BRIGHT)
    # Energy glow at bases
    d.point((7, 7), fill=SGOLD_GLOW)
    d.point((4, 9), fill=RIFT_VIOLET)
    d.point((11, 8), fill=RIFT_NEBULA)


def tile_void_gap(tile):
    """Deep space gap between floating platforms."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=SPACE_BLACK)
    # Distant star shimmer
    d.point((4, 5), fill=c(SPACE_DEEP, 120))
    d.point((11, 10), fill=c(SPACE_DEEP, 120))
    d.point((7, 13), fill=c(SGOLD_DARK, 80))
    d.point((2, 8), fill=c(NEBULA_DARK, 60))


def tile_convergence_nexus(tile):
    """Raised nexus dais where cosmic energy converges."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([2, 2, 13, 13], fill=TILE_PLAT_L)
    d.rectangle([4, 4, 11, 11], fill=TILE_PLAT_E)
    # Cosmic convergence cross pattern
    d.rectangle([7, 2, 8, 13], fill=TILE_GOLD)
    d.rectangle([2, 7, 13, 8], fill=TILE_VIOLET)
    # Center glow (starlight nexus)
    d.rectangle([6, 6, 9, 9], fill=STAR_BRIGHT)
    d.point((7, 7), fill=STAR_WHITE)
    d.point((8, 8), fill=NEBULA_GLOW)


def tile_rune_plate(tile):
    """Floor plate with cosmic rune inscriptions."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([1, 1, 14, 14], fill=TILE_PLAT_L)
    # Rune circle border
    for angle in range(0, 360, 30):
        rx = 7 + int(5 * math.cos(math.radians(angle)))
        ry = 7 + int(5 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            d.point((rx, ry), fill=TILE_NEBULA_D)
    # Center rune (gold/violet alternating)
    d.point((7, 7), fill=TILE_GOLD)
    d.point((8, 7), fill=TILE_VIOLET)
    d.point((7, 8), fill=SGOLD_BRIGHT)


def tile_stellar_portal(tile):
    """Active portal to the cosmic beyond."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Portal ring (alternating starlight/nebula)
    for angle in range(0, 360, 20):
        rx = 7 + int(6 * math.cos(math.radians(angle)))
        ry = 7 + int(6 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            col = STAR_BRIGHT if angle % 40 == 0 else NEBULA_BRIGHT
            d.point((rx, ry), fill=col)
    # Inner swirl
    for angle in range(0, 360, 40):
        rx = 7 + int(3 * math.cos(math.radians(angle)))
        ry = 7 + int(3 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            d.point((rx, ry), fill=VIOLET_GLOW)
    # Center singularity
    d.rectangle([6, 6, 9, 9], fill=SPACE_BLACK)
    d.point((7, 7), fill=STAR_CORE)
    d.point((8, 8), fill=NEBULA_PULSE)


def tile_cosmic_mosaic(tile):
    """Woven cosmic mosaic floor covering."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    # Checkerboard shimmer pattern (violet/nebula)
    for x in range(0, 16, 4):
        for y in range(0, 16, 4):
            d.rectangle([x, y, x + 1, y + 1], fill=TILE_VIOLET)
    # Gold thread accents
    d.point((3, 3), fill=TILE_GOLD)
    d.point((11, 11), fill=TILE_GOLD)
    d.point((7, 7), fill=TILE_GOLD_L)


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
    d.rectangle([0, 7, 15, 7], fill=TILE_ASTRAL_D)


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
    d.rectangle([7, 0, 7, 15], fill=TILE_ASTRAL_D)


def tile_astral_stone_v1(tile):
    """Astral stone variant 1."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ASTRAL)
    d.rectangle([1, 1, 14, 14], fill=TILE_ASTRAL_L)
    # Stellar veins
    d.point((3, 5), fill=TILE_GOLD)
    d.point((4, 6), fill=TILE_GOLD)
    d.point((10, 3), fill=TILE_VIOLET)
    d.point((12, 11), fill=TILE_VIOLET)
    # Crystal fracture cracks
    d.point((7, 9), fill=TILE_ASTRAL_D)
    d.point((8, 10), fill=TILE_ASTRAL_D)
    d.point((6, 2), fill=TRANSPARENT)


def tile_astral_stone_v2(tile):
    """Astral stone variant 2."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ASTRAL)
    d.rectangle([1, 1, 14, 14], fill=TILE_ASTRAL_L)
    # Different vein pattern
    d.point((5, 10), fill=TILE_GOLD)
    d.point((6, 11), fill=TILE_GOLD)
    d.point((11, 4), fill=TILE_VIOLET)
    d.point((3, 8), fill=TILE_VIOLET)
    # Crystal fractures
    d.point((9, 6), fill=TILE_ASTRAL_D)
    d.point((10, 7), fill=TILE_ASTRAL_D)
    d.point((13, 3), fill=TRANSPARENT)


def generate_tileset():
    """Generate tileset_astral_pinnacle.png (256x64)."""
    random.seed(221)
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground / terrain tiles
    row0 = [
        tile_starlight_platform, tile_nebula_floor, tile_convergence_nexus, tile_void_gap,
        tile_cosmic_rift, tile_wall_top, tile_star_cluster, tile_stellar_portal,
        tile_astral_stone_v1, tile_astral_stone_v2, tile_edge_top, tile_edge_bottom,
        tile_edge_left, tile_edge_right, tile_rune_plate, tile_starlight_platform,
    ]
    for i, fn in enumerate(row0):
        random.seed(221 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Features and decorations
    row1 = [
        tile_cosmic_pillar, tile_stellar_portal, tile_rune_plate, tile_convergence_nexus,
        tile_starlight_platform, tile_nebula_floor, tile_void_gap, tile_cosmic_rift,
        tile_wall_top, tile_edge_top, tile_astral_stone_v1, tile_astral_stone_v2,
        tile_edge_left, tile_edge_right, tile_cosmic_mosaic, tile_star_cluster,
    ]
    for i, fn in enumerate(row1):
        random.seed(221 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions
    row2 = [
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_void_gap, tile_void_gap, tile_starlight_platform, tile_cosmic_rift,
        tile_starlight_platform, tile_nebula_floor, tile_cosmic_rift, tile_wall_top,
        tile_rune_plate, tile_stellar_portal, tile_star_cluster, tile_convergence_nexus,
    ]
    for i, fn in enumerate(row2):
        random.seed(221 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: Variants and fill
    row3 = [
        tile_stellar_portal, tile_rune_plate, tile_cosmic_pillar, tile_convergence_nexus,
        tile_wall_top, tile_cosmic_rift, tile_void_gap, tile_starlight_platform,
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_astral_stone_v1, tile_astral_stone_v2, tile_cosmic_mosaic, tile_nebula_floor,
    ]
    for i, fn in enumerate(row3):
        random.seed(221 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(221)
    out = TILESETS_DIR / "tileset_astral_pinnacle.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# PARALLAX BACKGROUNDS -- 320x180, three layers (far/mid/near)
# Theme: Deep space with cosmic nebulae, distant galaxies, aurora streamers,
# floating astral ruins — the ultimate celestial apex
# =========================================================================

def generate_parallax():
    """Three parallax layers for Astral Pinnacle zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # -- FAR LAYER: deep space with nebulae, distant galaxies, and cosmic aurora --
    far = Image.new("RGBA", (320, 180), SKY_VOID)
    fd = ImageDraw.Draw(far)
    # Cosmic gradient (deep space at top -> violet horizon glow)
    for y in range(180):
        ratio = y / 180
        r = int(SKY_VOID[0] * (1 - ratio) + SKY_HORIZON[0] * ratio)
        g = int(SKY_VOID[1] * (1 - ratio) + SKY_HORIZON[1] * ratio)
        b = int(SKY_VOID[2] * (1 - ratio) + SKY_HORIZON[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    random.seed(221)

    # Cosmic nebula clouds (large violet/magenta/teal blends)
    nebula_positions = [(40, 30, 80, 40), (180, 60, 70, 30), (260, 20, 90, 35)]
    for nx, ny, nw, nh in nebula_positions:
        cloud_color = random.choice([VIOLET_DARK, NEBULA_DARK, AURORA_DARK])
        for px in range(nx, nx + nw):
            for py in range(ny, ny + nh):
                if 0 <= px < 320 and 0 <= py < 180:
                    dist = ((px - nx - nw / 2) ** 2 + (py - ny - nh / 2) ** 2) ** 0.5
                    max_dist = (nw / 2 + nh / 2) / 2
                    if dist < max_dist:
                        alpha = int(50 * (1 - dist / max_dist))
                        if alpha > 0:
                            far.putpixel((px, py), c(cloud_color, alpha))

    # Central cosmic singularity (bright converging point — the Pinnacle's core)
    sing_x, sing_y = 160, 55
    for dx in range(-10, 11):
        for dy in range(-10, 11):
            dist = (dx * dx + dy * dy) ** 0.5
            if dist <= 10:
                px, py = sing_x + dx, sing_y + dy
                if 0 <= px < 320 and 0 <= py < 180:
                    if dist <= 2:
                        far.putpixel((px, py), STAR_CORE)
                    elif dist <= 4:
                        far.putpixel((px, py), c(STAR_BRIGHT, 200))
                    elif dist <= 6:
                        far.putpixel((px, py), c(SGOLD_BRIGHT, 140))
                    elif dist <= 8:
                        far.putpixel((px, py), c(VIOLET_BRIGHT, 90))
                    else:
                        far.putpixel((px, py), c(NEBULA_MED, 50))

    # Cosmic corona rays from singularity
    for ray_angle in range(0, 360, 25):
        ray_len = random.randint(15, 35)
        ray_color = random.choice([STAR_BRIGHT, SGOLD_BRIGHT, VIOLET_BRIGHT])
        for ri in range(4, ray_len):
            rx = int(sing_x + ri * math.cos(math.radians(ray_angle)))
            ry = int(sing_y + ri * math.sin(math.radians(ray_angle)))
            if 0 <= rx < 320 and 0 <= ry < 180:
                alpha = max(0, 120 - ri * 3)
                if alpha > 0:
                    far.putpixel((rx, ry), c(ray_color, alpha))

    # Stars (bright cosmic field — the pinnacle sits above all creation)
    for _ in range(40):
        sx, sy = random.randint(0, 319), random.randint(0, 120)
        alpha = random.randint(60, 200)
        star_color = random.choice([STAR_DIM, STAR_BRIGHT, STAR_WARM, AURORA_BRIGHT, NEBULA_BRIGHT])
        far.putpixel((sx, sy), c(star_color, alpha))
        # Some stars get a subtle cross
        if alpha > 140 and random.random() > 0.5:
            for d in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = sx + d[0], sy + d[1]
                if 0 <= nx < 320 and 0 <= ny < 180:
                    far.putpixel((nx, ny), c(star_color, alpha // 3))

    # Distant galaxy spirals (tiny, ethereal)
    for _ in range(3):
        gx = random.randint(30, 290)
        gy = random.randint(10, 80)
        for arm in range(2):
            for ri in range(8):
                angle = arm * math.pi + ri * 0.5
                px = int(gx + ri * 1.5 * math.cos(angle))
                py = int(gy + ri * 0.8 * math.sin(angle))
                if 0 <= px < 320 and 0 <= py < 180:
                    alpha = max(0, 60 - ri * 6)
                    if alpha > 0:
                        far.putpixel((px, py), c(VIOLET_MED, alpha))

    # Distant astral pinnacle silhouettes on horizon
    pinnacle_positions = [(50, 140), (120, 125), (200, 135), (280, 128)]
    for fp_x, fp_y in pinnacle_positions:
        fw = random.randint(5, 12)
        fh = random.randint(30, 60)
        # Pinnacle body (dark crystalline spire)
        fd.rectangle([fp_x, fp_y - fh, fp_x + fw, fp_y], fill=c(ASTRAL_DARK))
        # Pinnacle tip (reaching toward the stars)
        fd.rectangle([fp_x + fw // 4, fp_y - fh - 12, fp_x + fw - fw // 4, fp_y - fh], fill=c(ASTRAL_DARK))
        fd.point((fp_x + fw // 2, fp_y - fh - 14), fill=c(ASTRAL_DARK))
        # Starlight crack glow
        fd.point((fp_x + fw // 2, fp_y - fh + 8), fill=c(STAR_BRIGHT, 90))
        fd.point((fp_x + fw // 2, fp_y - fh + 18), fill=c(SGOLD_BRIGHT, 70))
        # Star tip glow
        fd.point((fp_x + fw // 2, fp_y - fh - 13), fill=c(STAR_WHITE, 120))

    # Horizon glow (faint violet and nebula mix)
    for y in range(140, 180):
        ratio = (y - 140) / 40
        alpha = int(45 * ratio)
        if alpha > 0:
            fd.line([(0, y), (319, y)], fill=c(SKY_HORIZON, alpha))

    far_out = PARALLAX_DIR / "bg_parallax_astral_pinnacle_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # -- MID LAYER: floating astral ruins and cosmic debris --
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(222)

    # Cosmic energy clouds
    for _ in range(5):
        cx = random.randint(-20, 300)
        cy = random.randint(50, 120)
        cw = random.randint(40, 80)
        ch = random.randint(5, 10)
        cloud_color = random.choice([VIOLET_DARK, NEBULA_DARK])
        md.rectangle([cx, cy, cx + cw, cy + ch], fill=c(cloud_color, 40))
        md.rectangle([cx + 8, cy + 2, cx + cw - 8, cy + ch - 2], fill=c(ASTRAL_DARK, 60))

    # Mid-ground floating astral platforms
    platform_positions = [(15, 138), (85, 126), (165, 142), (255, 130)]
    for bx, by in platform_positions:
        bw = random.randint(30, 50)
        bh = random.randint(10, 18)
        # Platform body (astral crystal)
        md.rectangle([bx, by, bx + bw, by + bh], fill=c(ASTRAL_MED))
        md.rectangle([bx + 1, by + 1, bx + bw - 1, by + bh - 2], fill=c(ASTRAL_LIGHT))
        # Crystal spires on top
        for mx in range(bx, bx + bw, 10):
            tower_h = random.randint(8, 16)
            md.rectangle([mx, by - tower_h, mx + 4, by], fill=c(ASTRAL_MED))
            md.point((mx + 2, by - tower_h - 1), fill=c(ASTRAL_LIGHT, 160))
            # Starlight glow
            md.point((mx + 2, by - tower_h + 4), fill=c(STAR_BRIGHT, 130))
        # Starlight trim along edge
        md.rectangle([bx, by, bx + bw, by], fill=c(SGOLD_DARK, 140))
        # Nebula glow through cracks
        crack_x = bx + random.randint(8, max(9, bw - 8))
        md.rectangle([crack_x, by + 2, crack_x + 2, by + 6], fill=c(VIOLET_MED, 120))

    # Floating cosmic debris
    for _ in range(10):
        dx = random.randint(10, 310)
        dy = random.randint(60, 140)
        dw = random.randint(4, 10)
        dh = random.randint(2, 5)
        md.rectangle([dx, dy, dx + dw, dy + dh], fill=c(ASTRAL_MED, 80))

    # Cosmic energy wisps (violet and nebula)
    for _ in range(10):
        wx = random.randint(10, 310)
        wy = random.randint(40, 150)
        wlen = random.randint(8, 22)
        wisp_color = random.choice([SGOLD_MED, VIOLET_MED, NEBULA_MED])
        for wi in range(wlen):
            wpx = wx + wi
            wpy = wy + int(3 * math.sin(wi * 0.5))
            if 0 <= wpx < 320 and 0 <= wpy < 180:
                alpha = 110 - wi * 4
                if alpha > 0:
                    mid.putpixel((wpx, wpy), c(wisp_color, alpha))

    mid_out = PARALLAX_DIR / "bg_parallax_astral_pinnacle_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # -- NEAR LAYER: foreground cosmic tendrils and starlight particles --
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(223)

    # Foreground cosmic tendrils creeping up from bottom
    for x in range(0, 320, 2):
        h = random.randint(12, 35)
        base_y = 175
        for y in range(base_y - h, base_y):
            if 0 <= y < 180:
                alpha = 150 - int((base_y - y) * 4)
                if alpha > 0:
                    near.putpixel((x, y), c(VIOLET_DARK, min(alpha, 170)))
                    if x + 1 < 320:
                        near.putpixel((x + 1, y), c(VIOLET_DARK, min(alpha, 170)))

    # Cosmic tendril tips reaching upward
    for tx in range(10, 320, 30):
        th = random.randint(22, 50)
        for ty in range(th):
            py = 165 - ty
            px = tx + int(4 * math.sin(ty * 0.15))
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = max(0, 80 - ty * 2)
                if alpha > 0:
                    near.putpixel((px, py), c(VIOLET_DARK, alpha))

    # Bottom cosmic energy glow
    nd.rectangle([0, 172, 319, 179], fill=c(NEBULA_MED, 80))

    # Rising starlight particles (gold and violet and aurora)
    for _ in range(35):
        ax = random.randint(0, 319)
        ay = random.randint(20, 170)
        length = random.randint(3, 6)
        color_choice = random.choice([SGOLD_GLOW, VIOLET_GLOW, AURORA_GLOW, STAR_BRIGHT])
        for i in range(length):
            px = ax + i
            py = ay - i * 2
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = 130 - i * 20
                if alpha > 0:
                    near.putpixel((px, py), c(color_choice, alpha))

    # Cosmic spark particles (starlight flickers in the air)
    for _ in range(35):
        wx = random.randint(0, 319)
        wy = random.randint(10, 155)
        color_choice = random.choice([STAR_WHITE, SGOLD_GLOW, NEBULA_PULSE, AURORA_GLOW, VIOLET_GLOW])
        near.putpixel((wx, wy), c(color_choice, 170))
        if wx + 1 < 320:
            near.putpixel((wx + 1, wy), c(color_choice, 85))

    # Foreground floating crystal shards (dark silhouettes)
    for fx in range(15, 320, 55):
        fy = random.randint(10, 48)
        fw = random.randint(4, 10)
        fh = random.randint(2, 5)
        nd.rectangle([fx, fy, fx + fw, fy + fh], fill=c(ASTRAL_MED, 70))
        nd.point((fx + fw // 2, fy), fill=c(ASTRAL_LIGHT, 90))

    near_out = PARALLAX_DIR / "bg_parallax_astral_pinnacle_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# =========================================================================
# MAIN
# =========================================================================

def main():
    print("Generating Astral Pinnacle zone assets (PIX-221)...")
    print()

    print("[1/9] Astral Warden enemy sprite sheet")
    generate_astral_warden()
    print()

    print("[2/9] Cosmic Devourer enemy sprite sheet")
    generate_cosmic_devourer()
    print()

    print("[3/9] Nebula Wisp enemy sprite sheet")
    generate_nebula_wisp()
    print()

    print("[4/9] Stellar Knight enemy sprite sheet")
    generate_stellar_knight()
    print()

    print("[5/9] The Astral Sovereign boss sprites (idle, attack, phases 1-3)")
    generate_astral_sovereign()
    print()

    print("[6/9] Star Weaver NPC sprite")
    generate_star_weaver()
    print()

    print("[7/9] Astral Pinnacle tileset (256x64)")
    generate_tileset()
    print()

    print("[8/9] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[9/9] Done! All Astral Pinnacle zone assets generated.")


if __name__ == "__main__":
    main()
