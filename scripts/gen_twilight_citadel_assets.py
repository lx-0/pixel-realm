#!/usr/bin/env python3
"""
Generate Twilight Citadel zone art assets for PixelRealm (PIX-213).
Produces:
  - 3 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Twilight Citadel color language: dusk amber, twilight violet, shadow steel,
citadel stone, dimensional rift glow — a crumbling citadel suspended between
twilight dimensions, half light and half shadow, ancient grandeur corrupted
by dimensional instability.
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

# -- Twilight Citadel Color Palette -------------------------------------------

# Dusk amber / twilight warmth (the "light" dimension)
AMBER_BLACK     = (18, 10, 4, 255)              # deepest dusk
AMBER_DARK      = (42, 25, 10, 255)             # dark amber
AMBER_MED       = (110, 65, 25, 255)            # mid amber
AMBER_BRIGHT    = (180, 110, 40, 255)           # bright amber
AMBER_GLOW      = (240, 170, 60, 255)           # searing amber glow

# Twilight violet / shadow dimension
TWIL_BLACK      = (12, 6, 22, 255)              # deepest twilight
TWIL_DARK       = (28, 14, 52, 255)             # dark twilight
TWIL_MED        = (65, 35, 110, 255)            # mid twilight violet
TWIL_BRIGHT     = (120, 70, 180, 255)           # bright twilight
TWIL_GLOW       = (180, 130, 240, 255)          # twilight glow

# Shadow steel / citadel metal
STEEL_BLACK     = (10, 12, 16, 255)             # deepest steel
STEEL_DARK      = (22, 28, 35, 255)             # dark steel
STEEL_MED       = (55, 65, 78, 255)             # mid steel
STEEL_LIGHT     = (95, 108, 125, 255)           # light steel
STEEL_EDGE      = (140, 155, 175, 255)          # steel highlight

# Citadel stone / crumbling architecture
STONE_BLACK     = (15, 13, 18, 255)             # deepest stone
STONE_DARK      = (30, 28, 38, 255)             # dark stone
STONE_MED       = (58, 55, 68, 255)             # mid stone
STONE_LIGHT     = (88, 85, 100, 255)            # light stone
STONE_EDGE      = (120, 118, 135, 255)          # stone highlight

# Dimensional rift energy (where light meets shadow)
RIFT_CYAN       = (60, 220, 240, 255)           # cyan rift energy
RIFT_GOLD       = (255, 200, 80, 255)           # gold rift energy
RIFT_WHITE      = (240, 235, 250, 255)          # white rift flash
RIFT_VIOLET     = (180, 100, 255, 255)          # violet rift tear
RIFT_DEEP       = (80, 40, 140, 255)            # deep rift

# Dusk sky gradient
SKY_NIGHT       = (8, 4, 18, 255)               # upper sky (night side)
SKY_DUSK        = (35, 18, 55, 255)             # mid sky dusk
SKY_HORIZON     = (90, 45, 30, 255)             # horizon amber glow
SKY_GLOW        = (140, 70, 25, 255)            # horizon bright

# Twin suns
SUN_AMBER       = (255, 190, 80, 255)           # amber sun
SUN_VIOLET      = (180, 120, 220, 255)          # violet sun (shadow dim)
SUN_CORE        = (255, 240, 200, 255)          # sun core white

# Neutrals
WHITE           = (235, 230, 240, 255)
BLACK           = (6, 4, 10, 255)
OUTLINE         = (6, 4, 10, 255)
TRANSPARENT     = (0, 0, 0, 0)

# Platform / citadel floor
PLAT_DARK       = (32, 28, 42, 255)
PLAT_MED        = (52, 48, 65, 255)
PLAT_LIGHT      = (78, 74, 95, 255)
PLAT_EDGE       = (105, 100, 125, 255)

# -- Creature-specific palettes -----------------------------------------------

# Twilight Sentinel -- armored guardian phasing between light and shadow
SENTINEL_BODY    = STEEL_MED
SENTINEL_BODY_L  = STEEL_LIGHT
SENTINEL_BODY_D  = STEEL_DARK
SENTINEL_ARMOR   = PLAT_LIGHT
SENTINEL_ARMOR_D = PLAT_MED
SENTINEL_EYE     = AMBER_GLOW
SENTINEL_CORE    = TWIL_BRIGHT
SENTINEL_RUNE    = AMBER_BRIGHT
SENTINEL_GLOW    = RIFT_GOLD
SENTINEL_SHADOW  = (30, 20, 50, 180)           # shadow phase

# Rift Stalker -- fast predator emerging from dimensional tears
STALKER_BODY     = (45, 25, 70, 220)            # semi-transparent dark
STALKER_BODY_D   = (25, 12, 45, 240)
STALKER_EDGE     = RIFT_VIOLET
STALKER_CORE     = RIFT_CYAN
STALKER_GLOW     = (200, 230, 255, 255)
STALKER_TRAIL    = (60, 30, 100, 80)
STALKER_TRAIL_L  = (80, 50, 130, 50)
STALKER_EYE      = RIFT_CYAN
STALKER_CLAW     = STEEL_EDGE

# Echo Wraith -- spectral remnant of fallen citadel defenders
WRAITH_BODY      = (70, 65, 90, 140)            # translucent spectral
WRAITH_BODY_D    = (45, 40, 65, 160)
WRAITH_EDGE      = TWIL_GLOW
WRAITH_CORE      = (200, 180, 240, 200)
WRAITH_GLOW      = (220, 210, 255, 255)
WRAITH_TRAIL     = (60, 55, 85, 70)
WRAITH_TRAIL_L   = (80, 75, 110, 40)
WRAITH_EYE       = AMBER_GLOW
WRAITH_SHIELD    = STEEL_LIGHT

# Twilight Warden boss
WARDEN_BODY      = STEEL_MED
WARDEN_BODY_D    = STEEL_DARK
WARDEN_ARMOR     = STONE_LIGHT
WARDEN_ARMOR_D   = STONE_MED
WARDEN_EYE       = AMBER_GLOW
WARDEN_FLAME     = RIFT_VIOLET
WARDEN_RUNE      = AMBER_BRIGHT
WARDEN_GLOW      = RIFT_GOLD
WARDEN_CROWN     = AMBER_MED
WARDEN_CROWN_G   = AMBER_GLOW
WARDEN_CAPE      = TWIL_DARK
WARDEN_CAPE_L    = TWIL_MED
WARDEN_WEAPON    = RIFT_CYAN
WARDEN_BLADE     = (180, 240, 255, 255)
WARDEN_MAGIC     = TWIL_BRIGHT

# NPC: Dusk Scholar
SCHOLAR_ROBE     = (38, 32, 55, 255)
SCHOLAR_ROBE_L   = (55, 48, 75, 255)
SCHOLAR_SKIN     = (175, 160, 150, 255)
SCHOLAR_SKIN_D   = (145, 130, 120, 255)
SCHOLAR_HAIR     = (60, 55, 72, 255)
SCHOLAR_BOOK     = AMBER_MED
SCHOLAR_BOOK_G   = AMBER_BRIGHT
SCHOLAR_TRIM     = AMBER_MED
SCHOLAR_BELT     = STEEL_DARK
SCHOLAR_EYES     = AMBER_GLOW
SCHOLAR_HOOD     = (22, 18, 38, 255)
SCHOLAR_LENS     = RIFT_CYAN

# Tileset colors
TILE_PLAT        = PLAT_MED
TILE_PLAT_D      = PLAT_DARK
TILE_PLAT_L      = PLAT_LIGHT
TILE_PLAT_E      = PLAT_EDGE
TILE_TWIL        = TWIL_MED
TILE_TWIL_D      = TWIL_DARK
TILE_TWIL_B      = TWIL_BRIGHT
TILE_AMBER       = AMBER_MED
TILE_AMBER_D     = AMBER_DARK
TILE_AMBER_L     = AMBER_BRIGHT
TILE_STONE       = STONE_MED
TILE_STONE_D     = STONE_DARK
TILE_STONE_L     = STONE_LIGHT
TILE_RIFT        = RIFT_VIOLET
TILE_RIFT_D      = RIFT_DEEP


def ensure_dir(path):
    os.makedirs(os.path.dirname(path) if isinstance(path, str) else path.parent, exist_ok=True)


def save_asset(img, rel_path):
    full_path = ASSET_ROOT / rel_path if isinstance(rel_path, str) else rel_path
    ensure_dir(full_path)
    img.save(str(full_path))
    print(f"  Created: {full_path.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# ENEMY 1: TWILIGHT SENTINEL -- armored guardian, 16x16, 8 frames
# Frames 0-3: walk/patrol, Frames 4-7: attack (phase strike)
# Phasing between light (amber) and shadow (violet) forms
# =========================================================================

def draw_twilight_sentinel(draw, ox, oy, frame):
    """Draw a single 16x16 Twilight Sentinel frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, 0, -1, 0][anim]
    stride = [0, 1, 0, -1][anim]

    # Phase shimmer — alternates amber/violet highlights per frame
    phase_color = SENTINEL_RUNE if anim % 2 == 0 else TWIL_BRIGHT

    # Heavy armored legs (citadel greaves)
    draw.rectangle([ox + 4, oy + 12 + bob, ox + 6, oy + 14], fill=SENTINEL_BODY_D)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 11, oy + 14], fill=SENTINEL_BODY_D)
    # Boots with amber runes
    draw.rectangle([ox + 3 + stride, oy + 14, ox + 6 + stride, oy + 15], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 9 - stride, oy + 14, ox + 12 - stride, oy + 15], fill=SENTINEL_ARMOR)
    draw.point((ox + 4 + stride, oy + 14), fill=SENTINEL_RUNE)
    draw.point((ox + 10 - stride, oy + 14), fill=SENTINEL_RUNE)

    # Torso (twilight-forged armor with dual-energy core)
    draw.rectangle([ox + 3, oy + 6 + bob, ox + 12, oy + 12 + bob], fill=SENTINEL_BODY)
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 11, oy + 11 + bob], fill=SENTINEL_BODY_L)
    # Split core: amber left, violet right (dimensional duality)
    draw.point((ox + 7, oy + 9 + bob), fill=AMBER_BRIGHT)
    draw.point((ox + 8, oy + 9 + bob), fill=TWIL_BRIGHT)
    # Energy veins
    draw.point((ox + 5, oy + 8 + bob), fill=phase_color)
    draw.point((ox + 10, oy + 8 + bob), fill=phase_color)
    # Rune marks on armor
    draw.point((ox + 4, oy + 10 + bob), fill=SENTINEL_RUNE)
    draw.point((ox + 11, oy + 10 + bob), fill=SENTINEL_RUNE)
    # Shoulder pauldrons (asymmetric: light/shadow)
    draw.rectangle([ox + 2, oy + 6 + bob, ox + 3, oy + 8 + bob], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 12, oy + 6 + bob, ox + 13, oy + 8 + bob], fill=SENTINEL_ARMOR_D)
    draw.point((ox + 2, oy + 6 + bob), fill=AMBER_BRIGHT)
    draw.point((ox + 13, oy + 6 + bob), fill=TWIL_BRIGHT)

    # Head (helm with split visor — light/shadow sides)
    draw.rectangle([ox + 5, oy + 2 + bob, ox + 10, oy + 6 + bob], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 5 + bob], fill=SENTINEL_ARMOR_D)
    # Visor slit with glowing eyes
    draw.rectangle([ox + 6, oy + 4 + bob, ox + 9, oy + 4 + bob], fill=OUTLINE)
    draw.point((ox + 6, oy + 4 + bob), fill=SENTINEL_EYE)
    draw.point((ox + 9, oy + 4 + bob), fill=TWIL_GLOW)
    # Helm crest (dual crystal spikes)
    draw.point((ox + 7, oy + 1 + bob), fill=AMBER_BRIGHT)
    draw.point((ox + 8, oy + 1 + bob), fill=TWIL_BRIGHT)

    # Arms and attack
    if is_attack:
        burst = [0, 2, 4, 2][anim]
        # Arms raised for phase strike
        draw.rectangle([ox + 1, oy + 5 + bob - burst, ox + 3, oy + 10 + bob], fill=SENTINEL_BODY_L)
        draw.rectangle([ox + 12, oy + 5 + bob - burst, ox + 14, oy + 10 + bob], fill=SENTINEL_BODY_L)
        # Gauntlets charging with dimensional energy
        draw.point((ox + 1, oy + 5 + bob - burst), fill=SENTINEL_GLOW)
        draw.point((ox + 14, oy + 5 + bob - burst), fill=RIFT_VIOLET)
        # Phase shockwave
        if burst >= 2:
            draw.point((ox + 2, oy + 4 + bob - burst), fill=RIFT_VIOLET)
            draw.point((ox + 13, oy + 4 + bob - burst), fill=AMBER_GLOW)
            draw.point((ox + 7, oy + 15), fill=RIFT_GOLD)
            draw.point((ox + 8, oy + 15), fill=TWIL_GLOW)
    else:
        # Idle arms with twilight halberd
        draw.rectangle([ox + 1, oy + 7 + bob, ox + 3, oy + 12 + bob], fill=SENTINEL_BODY)
        draw.rectangle([ox + 12, oy + 7 + bob, ox + 14, oy + 12 + bob], fill=SENTINEL_BODY)
        # Halberd in right hand
        draw.rectangle([ox + 14, oy + 3 + bob, ox + 14, oy + 13 + bob], fill=STEEL_LIGHT)
        draw.point((ox + 14, oy + 2 + bob), fill=RIFT_GOLD)
        draw.point((ox + 13, oy + 3 + bob), fill=STEEL_EDGE)


def generate_twilight_sentinel():
    """Generate 8-frame Twilight Sentinel sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_twilight_sentinel(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_twilight_sentinel.png")
    return img


# =========================================================================
# ENEMY 2: RIFT STALKER -- fast predator, 16x16, 8 frames
# Frames 0-3: prowl/phase, Frames 4-7: attack (claw lunge)
# =========================================================================

def draw_rift_stalker(draw, ox, oy, frame):
    """Draw a single 16x16 Rift Stalker frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [0, -1, -2, -1][anim]
    phase_shift = [0, 1, 2, 1][anim]

    # Trailing rift energy (wispy legs dissolving into tears)
    draw.rectangle([ox + 5, oy + 12 + float_y, ox + 6, oy + 15], fill=STALKER_TRAIL)
    draw.rectangle([ox + 9, oy + 12 + float_y, ox + 10, oy + 15], fill=STALKER_TRAIL)
    # Flickering trail below
    draw.point((ox + 4, oy + 14 + float_y), fill=STALKER_TRAIL_L)
    draw.point((ox + 11, oy + 14 + float_y), fill=STALKER_TRAIL_L)

    # Lean predatory body (semi-transparent, phasing)
    draw.rectangle([ox + 4, oy + 5 + float_y, ox + 11, oy + 12 + float_y], fill=STALKER_BODY)
    draw.rectangle([ox + 5, oy + 6 + float_y, ox + 10, oy + 11 + float_y], fill=STALKER_BODY_D)
    # Rift core (pulsing cyan energy)
    draw.rectangle([ox + 7, oy + 7 + float_y, ox + 8, oy + 10 + float_y], fill=STALKER_CORE)
    # Phase shift edges
    if phase_shift > 0:
        draw.point((ox + 3 - phase_shift, oy + 8 + float_y), fill=STALKER_TRAIL)
        draw.point((ox + 12 + phase_shift, oy + 8 + float_y), fill=STALKER_TRAIL)
    # Dimensional crack lines
    draw.point((ox + 4, oy + 7 + float_y), fill=STALKER_EDGE)
    draw.point((ox + 11, oy + 9 + float_y), fill=STALKER_EDGE)

    # Head (angular, predatory with glowing eyes)
    draw.rectangle([ox + 5, oy + 2 + float_y, ox + 10, oy + 5 + float_y], fill=STALKER_BODY)
    draw.rectangle([ox + 6, oy + 3 + float_y, ox + 9, oy + 4 + float_y], fill=STALKER_BODY_D)
    # Glowing cyan eyes
    draw.point((ox + 6, oy + 3 + float_y), fill=STALKER_EYE)
    draw.point((ox + 9, oy + 3 + float_y), fill=STALKER_EYE)
    # Horn-like rift protrusions
    draw.point((ox + 5, oy + 1 + float_y), fill=RIFT_VIOLET)
    draw.point((ox + 10, oy + 1 + float_y), fill=RIFT_VIOLET)

    if is_attack:
        lunge = [0, 2, 3, 1][anim]
        # Claw swipe — extending forward
        for sx in range(lunge + 1):
            draw.point((ox + 3 - sx, oy + 6 + float_y), fill=STALKER_CLAW)
            draw.point((ox + 12 + sx, oy + 8 + float_y), fill=STALKER_CLAW)
        if lunge >= 2:
            draw.point((ox + 2 - lunge, oy + 5 + float_y), fill=STALKER_EDGE)
            draw.point((ox + 13 + lunge, oy + 9 + float_y), fill=STALKER_EDGE)
            draw.point((ox + 2 - lunge, oy + 7 + float_y), fill=STALKER_CORE)
        # Body overcharge during lunge
        draw.rectangle([ox + 5, oy + 6 + float_y, ox + 10, oy + 11 + float_y], fill=STALKER_CORE)
        draw.point((ox + 7, oy + 8 + float_y), fill=STALKER_GLOW)
        draw.point((ox + 8, oy + 8 + float_y), fill=STALKER_GLOW)
    else:
        # Ambient prowl particles
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 3 + sway, oy + 6 + float_y), fill=STALKER_TRAIL)
        draw.point((ox + 12 - sway, oy + 10 + float_y), fill=STALKER_TRAIL)


def generate_rift_stalker():
    """Generate 8-frame Rift Stalker sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_rift_stalker(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_rift_stalker.png")
    return img


# =========================================================================
# ENEMY 3: ECHO WRAITH -- spectral remnant, 16x16, 8 frames
# Frames 0-3: drift/flicker, Frames 4-7: attack (spectral wail)
# =========================================================================

def draw_echo_wraith(draw, ox, oy, frame):
    """Draw a single 16x16 Echo Wraith frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [-1, 0, 1, 0][anim]
    flicker = [0, 1, 2, 1][anim]

    # Trailing spectral wisps (fading lower body)
    draw.rectangle([ox + 6, oy + 12 + float_y, ox + 7, oy + 15], fill=WRAITH_TRAIL)
    draw.rectangle([ox + 9, oy + 12 + float_y, ox + 10, oy + 15], fill=WRAITH_TRAIL)
    draw.point((ox + 7, oy + 14 + float_y), fill=WRAITH_TRAIL_L)
    draw.point((ox + 8, oy + 15), fill=WRAITH_TRAIL_L)

    # Spectral body (translucent, armored ghost)
    draw.rectangle([ox + 4, oy + 5 + float_y, ox + 11, oy + 12 + float_y], fill=WRAITH_BODY)
    draw.rectangle([ox + 5, oy + 6 + float_y, ox + 10, oy + 11 + float_y], fill=WRAITH_BODY_D)
    # Ghostly remnant of citadel armor (faded steel marks)
    draw.point((ox + 5, oy + 7 + float_y), fill=WRAITH_SHIELD)
    draw.point((ox + 10, oy + 7 + float_y), fill=WRAITH_SHIELD)
    draw.point((ox + 7, oy + 10 + float_y), fill=WRAITH_SHIELD)
    # Inner spectral core
    draw.rectangle([ox + 7, oy + 8 + float_y, ox + 8, oy + 9 + float_y], fill=WRAITH_CORE)
    # Flicker edges (phasing in and out)
    if flicker > 0:
        draw.point((ox + 3 - flicker, oy + 8 + float_y), fill=WRAITH_TRAIL)
        draw.point((ox + 12 + flicker, oy + 8 + float_y), fill=WRAITH_TRAIL)

    # Helm-like head (spectral knight remnant)
    draw.rectangle([ox + 5, oy + 2 + float_y, ox + 10, oy + 5 + float_y], fill=WRAITH_BODY)
    draw.rectangle([ox + 6, oy + 3 + float_y, ox + 9, oy + 4 + float_y], fill=WRAITH_BODY_D)
    # Hollow amber eyes (memory of life)
    draw.point((ox + 6, oy + 3 + float_y), fill=WRAITH_EYE)
    draw.point((ox + 9, oy + 3 + float_y), fill=WRAITH_EYE)
    # Faded helm crest
    draw.point((ox + 7, oy + 1 + float_y), fill=WRAITH_EDGE)
    draw.point((ox + 8, oy + 1 + float_y), fill=WRAITH_EDGE)

    if is_attack:
        wail = [0, 2, 3, 1][anim]
        # Spectral wail — expanding ring of ghostly energy
        for sx in range(wail + 1):
            draw.point((ox + 4 - sx, oy + 7 + float_y), fill=WRAITH_EDGE)
            draw.point((ox + 11 + sx, oy + 9 + float_y), fill=WRAITH_EDGE)
        if wail >= 2:
            draw.point((ox + 3 - wail, oy + 6 + float_y), fill=WRAITH_GLOW)
            draw.point((ox + 12 + wail, oy + 10 + float_y), fill=WRAITH_GLOW)
            # Spectral scream aura
            draw.point((ox + 7, oy + 15), fill=WRAITH_GLOW)
            draw.point((ox + 8, oy + 15), fill=WRAITH_GLOW)
        # Body intensifies during wail
        draw.rectangle([ox + 6, oy + 7 + float_y, ox + 9, oy + 10 + float_y], fill=WRAITH_CORE)
        draw.point((ox + 7, oy + 8 + float_y), fill=WRAITH_GLOW)
        draw.point((ox + 8, oy + 8 + float_y), fill=WRAITH_GLOW)
    else:
        # Ambient spectral drift
        sway = [0, 1, 0, -1][anim]
        draw.point((ox + 3 + sway, oy + 7 + float_y), fill=WRAITH_TRAIL_L)
        draw.point((ox + 12 - sway, oy + 9 + float_y), fill=WRAITH_TRAIL_L)


def generate_echo_wraith():
    """Generate 8-frame Echo Wraith sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_echo_wraith(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_echo_wraith.png")
    return img


# =========================================================================
# BOSS: THE TWILIGHT WARDEN -- colossal armored figure, 32x32
# Wielding a blade of pure dimensional energy, split light/shadow
# =========================================================================

def draw_twilight_warden(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw The Twilight Warden boss at 32x32."""
    anim = frame % 4
    breath = [0, -1, 0, 1][anim]

    # Phase color shifts
    body = WARDEN_BODY
    armor = WARDEN_ARMOR
    eye = WARDEN_EYE
    flame = WARDEN_FLAME
    rune = WARDEN_RUNE
    glow = WARDEN_GLOW
    crown = WARDEN_CROWN
    blade = WARDEN_BLADE
    magic = WARDEN_MAGIC
    if phase == 2:
        body = (75, 50, 100, 255)               # shadow intensifies
        armor = (100, 95, 115, 255)
        eye = RIFT_GOLD
        flame = (200, 130, 255, 255)
        rune = AMBER_GLOW
        glow = (255, 220, 140, 255)
        crown = AMBER_BRIGHT
        blade = (200, 255, 255, 255)
    elif phase == 3:
        body = (100, 65, 140, 255)              # full twilight overcharge
        armor = (120, 115, 140, 255)
        eye = (255, 240, 200, 255)
        magic = RIFT_CYAN
        flame = (220, 180, 255, 255)
        glow = (255, 245, 220, 255)
        crown = (200, 160, 60, 255)
        blade = (230, 255, 255, 255)

    outline = OUTLINE

    # Legs — massive citadel-forged greaves
    draw.rectangle([ox + 9, oy + 22 + breath, ox + 13, oy + 27], fill=body)
    draw.rectangle([ox + 18, oy + 22 + breath, ox + 22, oy + 27], fill=body)
    # Armored boots with twilight runes
    draw.rectangle([ox + 8, oy + 27, ox + 14, oy + 30], fill=armor)
    draw.rectangle([ox + 17, oy + 27, ox + 23, oy + 30], fill=armor)
    draw.point((ox + 10, oy + 28), fill=rune)
    draw.point((ox + 20, oy + 28), fill=rune)

    # Torso — heavy citadel plate with dual-energy core
    draw.rectangle([ox + 8, oy + 12 + breath, ox + 23, oy + 22 + breath], fill=WARDEN_CAPE)
    draw.rectangle([ox + 9, oy + 13 + breath, ox + 22, oy + 21 + breath], fill=WARDEN_CAPE_L)
    # Chest plate
    draw.rectangle([ox + 11, oy + 14 + breath, ox + 20, oy + 20 + breath], fill=armor)
    draw.rectangle([ox + 12, oy + 15 + breath, ox + 19, oy + 19 + breath], fill=WARDEN_ARMOR_D)
    # Split dimensional core (amber left / violet right)
    draw.rectangle([ox + 14, oy + 16 + breath, ox + 15, oy + 18 + breath], fill=AMBER_BRIGHT)
    draw.rectangle([ox + 16, oy + 16 + breath, ox + 17, oy + 18 + breath], fill=TWIL_BRIGHT)
    draw.point((ox + 15, oy + 17 + breath), fill=glow)
    draw.point((ox + 16, oy + 17 + breath), fill=glow)
    # Rune veins on armor
    draw.point((ox + 12, oy + 15 + breath), fill=rune)
    draw.point((ox + 19, oy + 15 + breath), fill=rune)
    draw.point((ox + 12, oy + 19 + breath), fill=rune)
    draw.point((ox + 19, oy + 19 + breath), fill=rune)

    # Shoulder pauldrons (asymmetric: light/shadow)
    draw.rectangle([ox + 4, oy + 10 + breath, ox + 9, oy + 14 + breath], fill=armor)
    draw.point((ox + 5, oy + 10 + breath), fill=AMBER_BRIGHT)
    draw.point((ox + 5, oy + 11 + breath), fill=AMBER_MED)
    draw.rectangle([ox + 22, oy + 10 + breath, ox + 27, oy + 14 + breath], fill=armor)
    draw.point((ox + 26, oy + 10 + breath), fill=TWIL_BRIGHT)
    draw.point((ox + 26, oy + 11 + breath), fill=TWIL_MED)
    # Rift wisps off shoulders
    draw.point((ox + 6, oy + 12 + breath), fill=flame)
    draw.point((ox + 25, oy + 12 + breath), fill=flame)

    # Cape (twilight fabric, shifting shadows)
    cape_wave = [0, 1, 2, 1][anim]
    draw.rectangle([ox + 10, oy + 20 + breath, ox + 21, oy + 24 + breath + cape_wave], fill=WARDEN_CAPE)
    draw.point((ox + 11, oy + 24 + breath + cape_wave), fill=WARDEN_CAPE_L)
    draw.point((ox + 20, oy + 24 + breath + cape_wave), fill=WARDEN_CAPE_L)

    # Head (helm with twilight crown)
    draw.rectangle([ox + 11, oy + 5 + breath, ox + 20, oy + 12 + breath], fill=body)
    draw.rectangle([ox + 12, oy + 6 + breath, ox + 19, oy + 11 + breath], fill=WARDEN_BODY_D)
    # Face plate (split-tone mask)
    draw.rectangle([ox + 13, oy + 7 + breath, ox + 18, oy + 10 + breath], fill=armor)
    # Blazing eyes (amber/violet split)
    draw.rectangle([ox + 13, oy + 8 + breath, ox + 14, oy + 9 + breath], fill=outline)
    draw.point((ox + 13, oy + 8 + breath), fill=eye)
    draw.rectangle([ox + 17, oy + 8 + breath, ox + 18, oy + 9 + breath], fill=outline)
    draw.point((ox + 18, oy + 8 + breath), fill=TWIL_GLOW)

    # Twilight crown (amber and violet crystal spires)
    draw.rectangle([ox + 12, oy + 4 + breath, ox + 19, oy + 5 + breath], fill=crown)
    draw.point((ox + 14, oy + 3 + breath), fill=AMBER_BRIGHT)
    draw.point((ox + 15, oy + 2 + breath), fill=WARDEN_CROWN_G)
    draw.point((ox + 16, oy + 2 + breath), fill=TWIL_GLOW)
    draw.point((ox + 17, oy + 3 + breath), fill=TWIL_BRIGHT)
    # Crown center gem (dimensional nexus)
    draw.point((ox + 15, oy + 3 + breath), fill=flame)
    draw.point((ox + 16, oy + 3 + breath), fill=flame)
    # Crown tips (rift energy rising)
    draw.point((ox + 13, oy + 2 + breath), fill=AMBER_MED)
    draw.point((ox + 15, oy + 1 + breath), fill=glow)
    draw.point((ox + 16, oy + 1 + breath), fill=glow)
    draw.point((ox + 18, oy + 2 + breath), fill=TWIL_MED)

    # Arms
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        attack_ext = [0, 2, 4, 2][anim]
        # Arms raised, dimensional blade slash
        draw.rectangle([ox + 4, oy + 12 + breath - attack_ext, ox + 8, oy + 18 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 12 + breath - attack_ext, ox + 27, oy + 18 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 12 + breath - attack_ext, ox + 5, oy + 13 + breath - attack_ext], fill=armor)
        draw.rectangle([ox + 26, oy + 12 + breath - attack_ext, ox + 28, oy + 13 + breath - attack_ext], fill=armor)
        # Dimensional blade energy between hands
        if attack_ext >= 2:
            for rx in range(6, 26, 2):
                ry = 11 + breath - attack_ext + random.randint(-1, 1)
                if 0 <= oy + ry < 32:
                    draw.point((ox + rx, oy + ry), fill=blade)
            # Central blade flare
            draw.rectangle([ox + 13, oy + 10 + breath - attack_ext, ox + 18, oy + 12 + breath - attack_ext], fill=WARDEN_BLADE)
            draw.point((ox + 15, oy + 11 + breath - attack_ext), fill=glow)
            draw.point((ox + 16, oy + 11 + breath - attack_ext), fill=glow)
        # Ground cracks from impact
        if attack_ext >= 3:
            for gx in range(3, 29, 3):
                draw.point((ox + gx, oy + 30), fill=flame)
                draw.point((ox + gx, oy + 31), fill=TWIL_DARK)
    else:
        # Idle arms with dimensional blade
        draw.rectangle([ox + 4, oy + 14 + breath, ox + 8, oy + 22 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 14 + breath, ox + 27, oy + 22 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 20 + breath, ox + 5, oy + 22 + breath], fill=armor)
        draw.rectangle([ox + 26, oy + 20 + breath, ox + 28, oy + 22 + breath], fill=armor)
        draw.point((ox + 4, oy + 20 + breath), fill=rune)
        draw.point((ox + 27, oy + 20 + breath), fill=rune)
        # Dimensional blade in right hand (glowing energy sword)
        draw.rectangle([ox + 27, oy + 6 + breath, ox + 27, oy + 22 + breath], fill=RIFT_CYAN)
        draw.rectangle([ox + 28, oy + 7 + breath, ox + 28, oy + 20 + breath], fill=blade)
        draw.point((ox + 27, oy + 5 + breath), fill=glow)
        # Blade energy aura
        draw.point((ox + 26, oy + 4 + breath + arm_wave), fill=flame)
        draw.point((ox + 29, oy + 4 + breath + arm_wave), fill=blade)
        draw.point((ox + 27, oy + 3 + breath + arm_wave), fill=RIFT_WHITE)

    # Ambient twilight particles rising
    for tx in range(10, 22, 3):
        ty = 28 + (anim + tx) % 4
        if ty < 32:
            draw.point((ox + tx, oy + ty), fill=TWIL_BRIGHT)
    # Crown blazing
    draw.point((ox + 14, oy + 2 + breath), fill=AMBER_BRIGHT)
    draw.point((ox + 15, oy + 1 + breath), fill=glow)
    draw.point((ox + 16, oy + 1 + breath), fill=glow)
    draw.point((ox + 17, oy + 2 + breath), fill=TWIL_BRIGHT)


def generate_twilight_warden():
    """Generate all Twilight Warden boss sprite sheets."""
    random.seed(213)

    # Idle
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_twilight_warden(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_twilight_warden_idle.png")

    # Attack -- 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        random.seed(213 + f)
        draw_twilight_warden(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_twilight_warden_attack.png")

    # Phase 1
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_twilight_warden(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_twilight_warden_phase1.png")

    # Phase 2 -- shadow intensifies
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_twilight_warden(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_twilight_warden_phase2.png")

    # Phase 3 -- full twilight overcharge
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_twilight_warden(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_twilight_warden_phase3.png")


# =========================================================================
# NPC: DUSK SCHOLAR -- citadel researcher, 16x24
# Studies the dimensional collapse with ancient instruments
# =========================================================================

def draw_dusk_scholar(draw, ox, oy):
    """Draw the Dusk Scholar NPC at 16x24."""
    # Feet / boots (scholar's travel boots)
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=STEEL_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=STEEL_DARK)

    # Robe (long, twilight-themed with amber trim)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=SCHOLAR_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=SCHOLAR_ROBE_L)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=SCHOLAR_ROBE)
    # Amber trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=SCHOLAR_TRIM)

    # Belt with dimensional clasp
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=SCHOLAR_BELT)
    # Amber crystal pendant
    draw.point((ox + 8, oy + 15), fill=AMBER_BRIGHT)
    draw.point((ox + 8, oy + 16), fill=AMBER_MED)

    # Arms (in robe sleeves)
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=SCHOLAR_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=SCHOLAR_ROBE)
    # Amber cuffs
    draw.point((ox + 2, oy + 16), fill=SCHOLAR_TRIM)
    draw.point((ox + 14, oy + 16), fill=SCHOLAR_TRIM)
    # Hands
    draw.point((ox + 2, oy + 17), fill=SCHOLAR_SKIN)
    draw.point((ox + 14, oy + 17), fill=SCHOLAR_SKIN)

    # Research tome (held in left hand, glowing amber)
    draw.rectangle([ox + 1, oy + 15, ox + 3, oy + 19], fill=SCHOLAR_BOOK)
    draw.point((ox + 2, oy + 16), fill=SCHOLAR_BOOK_G)
    # Glowing runes on book
    draw.point((ox + 1, oy + 17), fill=AMBER_GLOW)

    # Dimensional lens (right hand — rift-measurement tool)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=STEEL_LIGHT)
    # Lens at top
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=STEEL_MED)
    draw.point((ox + 14, oy + 1), fill=SCHOLAR_LENS)
    draw.point((ox + 14, oy + 2), fill=RIFT_CYAN)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=SCHOLAR_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=SCHOLAR_SKIN)

    # Hood (deep, twilight-dyed)
    draw.rectangle([ox + 4, oy + 2, ox + 12, oy + 5], fill=SCHOLAR_HOOD)
    draw.point((ox + 4, oy + 5), fill=SCHOLAR_HOOD)
    draw.point((ox + 4, oy + 6), fill=SCHOLAR_HOOD)
    draw.point((ox + 12, oy + 5), fill=SCHOLAR_HOOD)
    draw.point((ox + 12, oy + 6), fill=SCHOLAR_HOOD)

    # Glowing amber eyes (twilight sight)
    draw.point((ox + 6, oy + 6), fill=SCHOLAR_EYES)
    draw.point((ox + 10, oy + 6), fill=SCHOLAR_EYES)
    # Spectacles frame (hint of scholar)
    draw.point((ox + 5, oy + 6), fill=STEEL_LIGHT)
    draw.point((ox + 11, oy + 6), fill=STEEL_LIGHT)

    # Circlet under hood (amber-studded)
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 4], fill=AMBER_MED)
    draw.point((ox + 8, oy + 3), fill=AMBER_BRIGHT)


def generate_dusk_scholar():
    """Generate Dusk Scholar NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_dusk_scholar(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_twilight_citadel.png")
    return img


# =========================================================================
# TILESET -- tileset_twilight_citadel.png (256x64, 16 cols x 4 rows)
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


def tile_citadel_platform(tile):
    """Solid citadel stone platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([1, 1, 14, 14], fill=TILE_PLAT_L)
    # Amber energy seams
    d.point((4, 4), fill=TILE_AMBER)
    d.point((11, 7), fill=TILE_AMBER)
    d.point((7, 12), fill=TILE_AMBER)
    # Stone edge highlight
    d.rectangle([0, 0, 15, 0], fill=TILE_PLAT_E)


def tile_shadow_floor(tile):
    """Floor with shadow-light transition cracks."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    # Shadow crack pattern
    d.rectangle([3, 3, 4, 12], fill=TILE_TWIL)
    d.rectangle([8, 1, 9, 8], fill=TILE_TWIL)
    d.rectangle([12, 6, 13, 14], fill=TILE_TWIL)
    # Amber glow bleeding through cracks
    d.point((3, 6), fill=TILE_AMBER_L)
    d.point((8, 4), fill=TILE_AMBER_L)
    d.point((12, 10), fill=TILE_AMBER_L)
    # Shadow marks
    d.point((6, 8), fill=TILE_RIFT_D)
    d.point((10, 3), fill=TILE_RIFT_D)


def tile_spire_pillar(tile):
    """Vertical crumbling spire pillar."""
    d = ImageDraw.Draw(tile)
    d.rectangle([5, 0, 10, 15], fill=TILE_STONE_L)
    d.rectangle([6, 0, 9, 15], fill=TILE_PLAT_E)
    # Amber energy flowing through pillar
    d.rectangle([7, 0, 8, 15], fill=TILE_AMBER)
    # Crumbling damage
    d.point((5, 4), fill=TRANSPARENT)
    d.point((10, 9), fill=TRANSPARENT)
    # Energy nodes
    d.point((7, 3), fill=TILE_AMBER_L)
    d.point((8, 7), fill=TILE_AMBER_L)
    d.point((7, 11), fill=TILE_AMBER_L)
    # Cap
    d.rectangle([4, 0, 11, 1], fill=TILE_PLAT_E)
    d.point((7, 0), fill=AMBER_GLOW)
    d.point((8, 0), fill=AMBER_GLOW)


def tile_dimensional_rift(tile):
    """Active dimensional rift tear (light/shadow boundary)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Rift tear (diagonal energy slash)
    for i in range(12):
        x = 2 + i
        y = 2 + int(i * 0.8)
        if 0 <= x < 16 and 0 <= y < 16:
            d.point((x, y), fill=RIFT_VIOLET)
            if y + 1 < 16:
                d.point((x, y + 1), fill=TWIL_MED)
    # Amber bleeding from rift
    d.point((5, 5), fill=AMBER_BRIGHT)
    d.point((10, 9), fill=AMBER_BRIGHT)
    # Shadow visible through rift
    d.point((7, 7), fill=TWIL_GLOW)
    d.point((8, 8), fill=TWIL_GLOW)


def tile_wall_top(tile):
    """Crumbling citadel wall top."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    d.rectangle([0, 0, 15, 3], fill=TILE_STONE_L)
    d.rectangle([0, 12, 15, 15], fill=TILE_STONE_D)
    # Crumbling damage
    d.point((3, 1), fill=TRANSPARENT)
    d.point((12, 2), fill=TRANSPARENT)
    # Amber inlay
    d.point((4, 7), fill=TILE_AMBER)
    d.point((11, 7), fill=TILE_AMBER)
    d.point((7, 5), fill=TILE_TWIL)
    d.point((8, 10), fill=TILE_TWIL)
    # Top edge
    d.rectangle([0, 0, 15, 0], fill=TILE_PLAT_E)


def tile_crystal_formation(tile):
    """Cluster of twilight energy crystals."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Main crystal (amber, tall center)
    d.rectangle([6, 2, 9, 13], fill=AMBER_MED)
    d.rectangle([7, 3, 8, 12], fill=AMBER_BRIGHT)
    d.point((7, 1), fill=AMBER_GLOW)
    # Side crystals (violet)
    d.rectangle([3, 6, 5, 13], fill=TWIL_MED)
    d.point((4, 5), fill=TWIL_BRIGHT)
    d.rectangle([10, 5, 12, 13], fill=TWIL_MED)
    d.point((11, 4), fill=TWIL_BRIGHT)
    # Energy glow at bases
    d.point((7, 7), fill=RIFT_GOLD)
    d.point((4, 9), fill=RIFT_VIOLET)
    d.point((11, 8), fill=RIFT_VIOLET)


def tile_void_gap(tile):
    """Empty twilight void between platforms."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TWIL_BLACK)
    # Distant dimensional shimmer
    d.point((4, 5), fill=c(TWIL_DARK, 120))
    d.point((11, 10), fill=c(TWIL_DARK, 120))
    d.point((7, 13), fill=c(AMBER_DARK, 80))
    d.point((2, 8), fill=c(RIFT_DEEP, 60))


def tile_throne_dais(tile):
    """Raised dais with twilight energy convergence."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([2, 2, 13, 13], fill=TILE_PLAT_L)
    d.rectangle([4, 4, 11, 11], fill=TILE_PLAT_E)
    # Twilight rune cross pattern
    d.rectangle([7, 2, 8, 13], fill=TILE_AMBER)
    d.rectangle([2, 7, 13, 8], fill=TILE_TWIL)
    # Center glow
    d.rectangle([6, 6, 9, 9], fill=AMBER_BRIGHT)
    d.point((7, 7), fill=AMBER_GLOW)
    d.point((8, 8), fill=TWIL_GLOW)


def tile_rune_plate(tile):
    """Floor plate with twilight rune inscriptions."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([1, 1, 14, 14], fill=TILE_PLAT_L)
    # Rune circle border
    for angle in range(0, 360, 30):
        rx = 7 + int(5 * math.cos(math.radians(angle)))
        ry = 7 + int(5 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            d.point((rx, ry), fill=TILE_RIFT_D)
    # Center rune (amber/violet alternating)
    d.point((7, 7), fill=TILE_AMBER)
    d.point((8, 7), fill=TILE_TWIL)
    d.point((7, 8), fill=AMBER_BRIGHT)


def tile_rift_portal(tile):
    """Active rift portal between dimensions."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Portal ring (alternating amber/violet)
    for angle in range(0, 360, 20):
        rx = 7 + int(6 * math.cos(math.radians(angle)))
        ry = 7 + int(6 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            col = AMBER_BRIGHT if angle % 40 == 0 else RIFT_VIOLET
            d.point((rx, ry), fill=col)
    # Inner swirl
    for angle in range(0, 360, 40):
        rx = 7 + int(3 * math.cos(math.radians(angle)))
        ry = 7 + int(3 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            d.point((rx, ry), fill=TWIL_GLOW)
    # Center void
    d.rectangle([6, 6, 9, 9], fill=TWIL_BLACK)
    d.point((7, 7), fill=RIFT_GOLD)
    d.point((8, 8), fill=RIFT_VIOLET)


def tile_twilight_carpet(tile):
    """Woven twilight fabric floor covering."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    # Checkerboard shimmer pattern (amber/violet)
    for x in range(0, 16, 4):
        for y in range(0, 16, 4):
            d.rectangle([x, y, x + 1, y + 1], fill=TILE_TWIL)
    # Amber thread accents
    d.point((3, 3), fill=TILE_AMBER)
    d.point((11, 11), fill=TILE_AMBER)
    d.point((7, 7), fill=TILE_AMBER_L)


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
    """Crumbling citadel stone variant 1."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    d.rectangle([1, 1, 14, 14], fill=TILE_STONE_L)
    # Amber veins
    d.point((3, 5), fill=TILE_AMBER)
    d.point((4, 6), fill=TILE_AMBER)
    d.point((10, 3), fill=TILE_TWIL)
    d.point((12, 11), fill=TILE_TWIL)
    # Crumbling cracks
    d.point((7, 9), fill=TILE_STONE_D)
    d.point((8, 10), fill=TILE_STONE_D)
    d.point((6, 2), fill=TRANSPARENT)


def tile_stone_variant2(tile):
    """Crumbling citadel stone variant 2."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_STONE)
    d.rectangle([1, 1, 14, 14], fill=TILE_STONE_L)
    # Different vein pattern
    d.point((5, 10), fill=TILE_AMBER)
    d.point((6, 11), fill=TILE_AMBER)
    d.point((11, 4), fill=TILE_TWIL)
    d.point((3, 8), fill=TILE_TWIL)
    # Crumbling damage
    d.point((9, 6), fill=TILE_STONE_D)
    d.point((10, 7), fill=TILE_STONE_D)
    d.point((13, 3), fill=TRANSPARENT)


def generate_tileset():
    """Generate tileset_twilight_citadel.png (256x64)."""
    random.seed(213)
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground / terrain tiles
    row0 = [
        tile_citadel_platform, tile_shadow_floor, tile_throne_dais, tile_void_gap,
        tile_dimensional_rift, tile_wall_top, tile_crystal_formation, tile_rift_portal,
        tile_stone_variant1, tile_stone_variant2, tile_edge_top, tile_edge_bottom,
        tile_edge_left, tile_edge_right, tile_rune_plate, tile_citadel_platform,
    ]
    for i, fn in enumerate(row0):
        random.seed(213 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Features and decorations
    row1 = [
        tile_spire_pillar, tile_rift_portal, tile_rune_plate, tile_throne_dais,
        tile_citadel_platform, tile_shadow_floor, tile_void_gap, tile_dimensional_rift,
        tile_wall_top, tile_edge_top, tile_stone_variant1, tile_stone_variant2,
        tile_edge_left, tile_edge_right, tile_twilight_carpet, tile_crystal_formation,
    ]
    for i, fn in enumerate(row1):
        random.seed(213 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions
    row2 = [
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_void_gap, tile_void_gap, tile_citadel_platform, tile_dimensional_rift,
        tile_citadel_platform, tile_shadow_floor, tile_dimensional_rift, tile_wall_top,
        tile_rune_plate, tile_rift_portal, tile_crystal_formation, tile_throne_dais,
    ]
    for i, fn in enumerate(row2):
        random.seed(213 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: Variants and fill
    row3 = [
        tile_rift_portal, tile_rune_plate, tile_spire_pillar, tile_throne_dais,
        tile_wall_top, tile_dimensional_rift, tile_void_gap, tile_citadel_platform,
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_stone_variant1, tile_stone_variant2, tile_twilight_carpet, tile_shadow_floor,
    ]
    for i, fn in enumerate(row3):
        random.seed(213 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(213)
    out = TILESETS_DIR / "tileset_twilight_citadel.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# PARALLAX BACKGROUNDS -- 320x180, three layers (far/mid/near)
# Theme: Twilight sky with twin suns, floating citadel ruins, shadow tendrils
# =========================================================================

def generate_parallax():
    """Three parallax layers for Twilight Citadel zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # -- FAR LAYER: twilight sky with twin suns and dimensional aurora --
    far = Image.new("RGBA", (320, 180), SKY_NIGHT)
    fd = ImageDraw.Draw(far)
    # Dusk gradient (night at top → amber horizon at bottom)
    for y in range(180):
        ratio = y / 180
        r = int(SKY_NIGHT[0] * (1 - ratio) + SKY_HORIZON[0] * ratio)
        g = int(SKY_NIGHT[1] * (1 - ratio) + SKY_HORIZON[1] * ratio)
        b = int(SKY_NIGHT[2] * (1 - ratio) + SKY_HORIZON[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    random.seed(213)

    # Twin suns — amber sun (setting, left) and violet sun (rising, right)
    # Amber sun
    sun1_x, sun1_y = 80, 45
    for dx in range(-6, 7):
        for dy in range(-6, 7):
            dist = (dx * dx + dy * dy) ** 0.5
            if dist <= 6:
                px, py = sun1_x + dx, sun1_y + dy
                if 0 <= px < 320 and 0 <= py < 180:
                    if dist <= 3:
                        far.putpixel((px, py), SUN_CORE)
                    elif dist <= 5:
                        far.putpixel((px, py), SUN_AMBER)
                    else:
                        far.putpixel((px, py), c(AMBER_BRIGHT, 120))
    # Violet sun (dimmer, shadow dimension)
    sun2_x, sun2_y = 240, 55
    for dx in range(-5, 6):
        for dy in range(-5, 6):
            dist = (dx * dx + dy * dy) ** 0.5
            if dist <= 5:
                px, py = sun2_x + dx, sun2_y + dy
                if 0 <= px < 320 and 0 <= py < 180:
                    if dist <= 2:
                        far.putpixel((px, py), c(SUN_VIOLET, 240))
                    elif dist <= 4:
                        far.putpixel((px, py), c(TWIL_BRIGHT, 180))
                    else:
                        far.putpixel((px, py), c(TWIL_MED, 100))

    # Dimensional aurora (ribbon across the sky between the suns)
    for tx in range(-40, 201):
        ty = int(50 + 15 * math.sin(tx * 0.03) + 5 * math.sin(tx * 0.08) + random.randint(-1, 1))
        px = 60 + tx
        if 0 <= px < 320 and 0 <= ty < 180:
            dist_ratio = abs(tx - 80) / 120
            alpha = int(120 * (1 - min(dist_ratio, 1.0)))
            if alpha > 0:
                ribbon_color = AMBER_BRIGHT if tx < 80 else TWIL_BRIGHT
                far.putpixel((px, ty), c(ribbon_color, min(alpha, 150)))
                for dy in range(-1, 2):
                    if 0 <= ty + dy < 180 and dy != 0:
                        ga = int(alpha * 0.3)
                        if ga > 0:
                            far.putpixel((px, ty + dy), c(ribbon_color, ga))

    # Scattered twilight nebula clouds
    for _ in range(5):
        nx = random.randint(20, 300)
        ny = random.randint(10, 80)
        nw = random.randint(25, 50)
        nh = random.randint(6, 16)
        cloud_color = random.choice([TWIL_DARK, AMBER_DARK, STONE_DARK])
        for px in range(nx, nx + nw):
            for py in range(ny, ny + nh):
                if 0 <= px < 320 and 0 <= py < 180:
                    dist = ((px - nx - nw / 2) ** 2 + (py - ny - nh / 2) ** 2) ** 0.5
                    max_dist = (nw / 2 + nh / 2) / 2
                    if dist < max_dist:
                        alpha = int(25 * (1 - dist / max_dist))
                        if alpha > 0:
                            far.putpixel((px, py), c(cloud_color, alpha))

    # Dim stars
    for _ in range(20):
        sx, sy = random.randint(0, 319), random.randint(0, 80)
        alpha = random.randint(40, 120)
        star_color = random.choice([STEEL_EDGE, AMBER_MED, TWIL_MED])
        far.putpixel((sx, sy), c(star_color, alpha))

    # Distant citadel silhouettes on horizon
    citadel_positions = [(20, 132), (75, 120), (150, 135), (230, 125), (290, 130)]
    for fp_x, fp_y in citadel_positions:
        fw = random.randint(8, 16)
        fh = random.randint(20, 45)
        # Citadel tower body (dark stone)
        fd.rectangle([fp_x, fp_y - fh, fp_x + fw, fp_y], fill=c(STONE_DARK))
        # Crumbling spire top
        fd.rectangle([fp_x + fw // 4, fp_y - fh - 8, fp_x + fw - fw // 4, fp_y - fh], fill=c(STONE_DARK))
        fd.point((fp_x + fw // 2, fp_y - fh - 10), fill=c(STONE_DARK))
        # Amber window glow
        fd.point((fp_x + fw // 2, fp_y - fh + 6), fill=c(AMBER_BRIGHT, 100))
        fd.point((fp_x + fw // 2, fp_y - fh + 14), fill=c(AMBER_BRIGHT, 80))
        # Rift glow at tip
        fd.point((fp_x + fw // 2, fp_y - fh - 9), fill=c(TWIL_BRIGHT, 110))

    # Horizon glow (amber and twilight mix)
    for y in range(140, 180):
        ratio = (y - 140) / 40
        alpha = int(50 * ratio)
        if alpha > 0:
            fd.line([(0, y), (319, y)], fill=c(SKY_GLOW, alpha))

    far_out = PARALLAX_DIR / "bg_parallax_twilight_citadel_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # -- MID LAYER: floating citadel ruins and debris --
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(214)

    # Twilight energy clouds
    for _ in range(5):
        cx = random.randint(-20, 300)
        cy = random.randint(50, 120)
        cw = random.randint(40, 80)
        ch = random.randint(5, 10)
        cloud_color = random.choice([TWIL_DARK, AMBER_DARK])
        md.rectangle([cx, cy, cx + cw, cy + ch], fill=c(cloud_color, 40))
        md.rectangle([cx + 8, cy + 2, cx + cw - 8, cy + ch - 2], fill=c(STONE_DARK, 60))

    # Mid-ground floating citadel platforms (ruined)
    platform_positions = [(15, 138), (85, 128), (165, 142), (255, 132)]
    for bx, by in platform_positions:
        bw = random.randint(30, 50)
        bh = random.randint(10, 18)
        # Platform body (citadel stone)
        md.rectangle([bx, by, bx + bw, by + bh], fill=c(STONE_MED))
        md.rectangle([bx + 1, by + 1, bx + bw - 1, by + bh - 2], fill=c(STONE_LIGHT))
        # Crumbling tower ruins on top
        for mx in range(bx, bx + bw, 10):
            tower_h = random.randint(6, 14)
            md.rectangle([mx, by - tower_h, mx + 4, by], fill=c(STONE_MED))
            md.point((mx + 2, by - tower_h - 1), fill=c(STONE_LIGHT, 160))
            # Amber window
            md.point((mx + 2, by - tower_h + 3), fill=c(AMBER_BRIGHT, 140))
        # Amber rune trim along edge
        md.rectangle([bx, by, bx + bw, by], fill=c(AMBER_DARK, 140))
        # Twilight glow through cracks
        crack_x = bx + random.randint(8, max(9, bw - 8))
        md.rectangle([crack_x, by + 2, crack_x + 2, by + 6], fill=c(TWIL_MED, 120))

    # Floating rubble debris
    for _ in range(8):
        dx = random.randint(10, 310)
        dy = random.randint(60, 140)
        dw = random.randint(4, 10)
        dh = random.randint(2, 5)
        md.rectangle([dx, dy, dx + dw, dy + dh], fill=c(STONE_MED, 80))

    # Dimensional energy wisps (amber and violet)
    for _ in range(10):
        wx = random.randint(10, 310)
        wy = random.randint(40, 150)
        wlen = random.randint(8, 22)
        wisp_color = random.choice([AMBER_MED, TWIL_MED])
        for wi in range(wlen):
            wpx = wx + wi
            wpy = wy + int(3 * math.sin(wi * 0.5))
            if 0 <= wpx < 320 and 0 <= wpy < 180:
                alpha = 110 - wi * 4
                if alpha > 0:
                    mid.putpixel((wpx, wpy), c(wisp_color, alpha))

    mid_out = PARALLAX_DIR / "bg_parallax_twilight_citadel_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # -- NEAR LAYER: foreground shadow tendrils and particles --
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(215)

    # Foreground shadow tendrils creeping up from bottom
    for x in range(0, 320, 2):
        h = random.randint(10, 30)
        base_y = 175
        for y in range(base_y - h, base_y):
            if 0 <= y < 180:
                alpha = 150 - int((base_y - y) * 4)
                if alpha > 0:
                    near.putpixel((x, y), c(TWIL_DARK, min(alpha, 170)))
                    if x + 1 < 320:
                        near.putpixel((x + 1, y), c(TWIL_DARK, min(alpha, 170)))

    # Shadow tendril tips reaching upward
    for tx in range(10, 320, 30):
        th = random.randint(20, 45)
        for ty in range(th):
            py = 165 - ty
            px = tx + int(4 * math.sin(ty * 0.15))
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = max(0, 80 - ty * 2)
                if alpha > 0:
                    near.putpixel((px, py), c(TWIL_DARK, alpha))

    # Bottom twilight energy glow
    nd.rectangle([0, 172, 319, 179], fill=c(AMBER_MED, 100))

    # Rising twilight particles (amber and violet)
    for _ in range(25):
        ax = random.randint(0, 319)
        ay = random.randint(20, 170)
        length = random.randint(3, 6)
        color_choice = random.choice([AMBER_GLOW, TWIL_GLOW, RIFT_GOLD])
        for i in range(length):
            px = ax + i
            py = ay - i * 2
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = 130 - i * 20
                if alpha > 0:
                    near.putpixel((px, py), c(color_choice, alpha))

    # Dimensional spark particles
    for _ in range(25):
        wx = random.randint(0, 319)
        wy = random.randint(10, 155)
        color_choice = random.choice([AMBER_GLOW, TWIL_GLOW, RIFT_GOLD, RIFT_CYAN])
        near.putpixel((wx, wy), c(color_choice, 160))
        if wx + 1 < 320:
            near.putpixel((wx + 1, wy), c(color_choice, 80))

    # Foreground floating citadel rubble (dark silhouettes)
    for fx in range(15, 320, 65):
        fy = random.randint(12, 50)
        fw = random.randint(5, 12)
        fh = random.randint(2, 4)
        nd.rectangle([fx, fy, fx + fw, fy + fh], fill=c(STONE_MED, 70))
        nd.point((fx + fw // 2, fy), fill=c(STONE_LIGHT, 90))

    near_out = PARALLAX_DIR / "bg_parallax_twilight_citadel_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# =========================================================================
# MAIN
# =========================================================================

def main():
    print("Generating Twilight Citadel zone assets (PIX-213)...")
    print()

    print("[1/8] Twilight Sentinel enemy sprite sheet")
    generate_twilight_sentinel()
    print()

    print("[2/8] Rift Stalker enemy sprite sheet")
    generate_rift_stalker()
    print()

    print("[3/8] Echo Wraith enemy sprite sheet")
    generate_echo_wraith()
    print()

    print("[4/8] The Twilight Warden boss sprites (idle, attack, phases 1-3)")
    generate_twilight_warden()
    print()

    print("[5/8] Dusk Scholar NPC sprite")
    generate_dusk_scholar()
    print()

    print("[6/8] Twilight Citadel tileset (256x64)")
    generate_tileset()
    print()

    print("[7/8] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[8/8] Done! All Twilight Citadel zone assets generated.")


if __name__ == "__main__":
    main()
