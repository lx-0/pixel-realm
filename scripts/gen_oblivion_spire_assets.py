#!/usr/bin/env python3
"""
Generate Oblivion Spire zone art assets for PixelRealm (PIX-218).
Produces:
  - 3 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Oblivion Spire color language: deep indigo, shattered gold, void-black,
luminescent cracks — a towering crystalline structure at the edge of reality,
fractured platforms floating over a void, corrupted celestial architecture.
Penultimate zone (level 47+), conveying escalating stakes and otherworldly grandeur.
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

# -- Oblivion Spire Color Palette -----------------------------------------------

# Deep indigo / void core (the dominant atmosphere)
INDIGO_BLACK    = (6, 4, 18, 255)               # deepest void indigo
INDIGO_DARK     = (14, 10, 38, 255)             # dark indigo
INDIGO_MED      = (30, 22, 72, 255)             # mid indigo
INDIGO_BRIGHT   = (55, 42, 120, 255)            # bright indigo
INDIGO_GLOW     = (90, 70, 180, 255)            # indigo glow

# Shattered gold / corrupted celestial radiance
GOLD_BLACK      = (20, 14, 4, 255)              # deepest gold shadow
GOLD_DARK       = (60, 42, 10, 255)             # dark gold
GOLD_MED        = (140, 100, 25, 255)           # mid gold
GOLD_BRIGHT     = (210, 165, 40, 255)           # bright gold
GOLD_GLOW       = (255, 210, 70, 255)           # searing gold glow

# Void-black / absolute emptiness
VOID_BLACK      = (4, 2, 8, 255)               # absolute void
VOID_DARK       = (10, 6, 18, 255)             # near-void darkness
VOID_MED        = (20, 14, 35, 255)            # mid void
VOID_SHIMMER    = (35, 25, 60, 255)            # void with faint shimmer

# Luminescent crystal / reality cracks
LUMI_CYAN       = (80, 200, 255, 255)          # cyan luminescence
LUMI_WHITE      = (220, 230, 255, 255)         # near-white crack glow
LUMI_BLUE       = (50, 120, 220, 255)          # deep blue luminescence
LUMI_PULSE      = (160, 200, 255, 255)         # pulsing crack light

# Corrupted celestial stone / spire architecture
SPIRE_BLACK     = (12, 10, 22, 255)            # deepest spire stone
SPIRE_DARK      = (24, 20, 42, 255)            # dark spire stone
SPIRE_MED       = (48, 42, 72, 255)            # mid spire stone
SPIRE_LIGHT     = (75, 68, 105, 255)           # light spire stone
SPIRE_EDGE      = (100, 92, 135, 255)          # spire highlight

# Shattered reality (where void meets celestial)
RIFT_GOLD       = (255, 200, 80, 255)          # gold rift energy
RIFT_INDIGO     = (120, 80, 220, 255)          # indigo rift tear
RIFT_WHITE      = (235, 230, 255, 255)         # rift flash
RIFT_DEEP       = (40, 28, 80, 255)            # deep rift

# Sky / void gradient
SKY_VOID        = (4, 2, 12, 255)             # upper void (absolute dark)
SKY_DEEP        = (12, 8, 30, 255)            # deep void sky
SKY_MID         = (25, 18, 55, 255)           # mid void
SKY_HORIZON     = (45, 30, 80, 255)           # horizon (faint glow)

# Celestial remnants
CELEST_GOLD     = (255, 220, 120, 255)        # celestial gold
CELEST_DIM      = (180, 150, 80, 255)         # dimmed celestial
CELEST_CORE     = (255, 245, 200, 255)        # celestial core white

# Neutrals
WHITE           = (230, 225, 245, 255)
BLACK           = (4, 2, 8, 255)
OUTLINE         = (4, 2, 8, 255)
TRANSPARENT     = (0, 0, 0, 0)

# Platform / spire floor
PLAT_DARK       = (28, 24, 48, 255)
PLAT_MED        = (45, 40, 70, 255)
PLAT_LIGHT      = (68, 62, 98, 255)
PLAT_EDGE       = (90, 84, 125, 255)

# -- Creature-specific palettes -----------------------------------------------

# Void Sentinel -- corrupted celestial guardian, phasing between gold and void
SENTINEL_BODY    = SPIRE_MED
SENTINEL_BODY_L  = SPIRE_LIGHT
SENTINEL_BODY_D  = SPIRE_DARK
SENTINEL_ARMOR   = PLAT_LIGHT
SENTINEL_ARMOR_D = PLAT_MED
SENTINEL_EYE     = GOLD_GLOW
SENTINEL_CORE    = INDIGO_BRIGHT
SENTINEL_RUNE    = GOLD_BRIGHT
SENTINEL_GLOW    = RIFT_GOLD
SENTINEL_SHADOW  = (25, 18, 50, 180)          # void phase

# Reality Shard -- living crystal fragment, jagged and luminescent
SHARD_BODY       = (55, 80, 140, 220)         # semi-transparent crystal
SHARD_BODY_D     = (35, 55, 100, 240)
SHARD_EDGE       = LUMI_CYAN
SHARD_CORE       = LUMI_WHITE
SHARD_GLOW       = (180, 220, 255, 255)
SHARD_TRAIL      = (40, 60, 120, 80)
SHARD_TRAIL_L    = (60, 90, 150, 50)
SHARD_EYE        = GOLD_GLOW
SHARD_FACET      = LUMI_BLUE

# Oblivion Wraith -- formless void entity with gold-cracked surface
WRAITH_BODY      = (30, 22, 55, 140)          # translucent void
WRAITH_BODY_D    = (18, 12, 38, 160)
WRAITH_EDGE      = INDIGO_GLOW
WRAITH_CORE      = (180, 160, 220, 200)
WRAITH_GLOW      = (200, 190, 240, 255)
WRAITH_TRAIL     = (25, 18, 50, 70)
WRAITH_TRAIL_L   = (40, 30, 70, 40)
WRAITH_EYE       = GOLD_GLOW
WRAITH_CRACK     = GOLD_BRIGHT

# Spire Keeper boss -- corrupted celestial overseer
KEEPER_BODY      = SPIRE_MED
KEEPER_BODY_D    = SPIRE_DARK
KEEPER_ARMOR     = SPIRE_LIGHT
KEEPER_ARMOR_D   = SPIRE_MED
KEEPER_EYE       = GOLD_GLOW
KEEPER_FLAME     = RIFT_INDIGO
KEEPER_RUNE      = GOLD_BRIGHT
KEEPER_GLOW      = RIFT_GOLD
KEEPER_CROWN     = GOLD_MED
KEEPER_CROWN_G   = GOLD_GLOW
KEEPER_CAPE      = INDIGO_DARK
KEEPER_CAPE_L    = INDIGO_MED
KEEPER_WEAPON    = LUMI_CYAN
KEEPER_BLADE     = (160, 220, 255, 255)
KEEPER_MAGIC     = INDIGO_BRIGHT

# NPC: Void Oracle
ORACLE_ROBE      = (32, 26, 58, 255)
ORACLE_ROBE_L    = (48, 42, 78, 255)
ORACLE_SKIN      = (170, 165, 180, 255)
ORACLE_SKIN_D    = (140, 135, 150, 255)
ORACLE_HAIR      = (55, 50, 75, 255)
ORACLE_ORB       = LUMI_CYAN
ORACLE_ORB_G     = LUMI_PULSE
ORACLE_TRIM      = GOLD_MED
ORACLE_BELT      = SPIRE_DARK
ORACLE_EYES      = GOLD_GLOW
ORACLE_HOOD      = (18, 14, 35, 255)
ORACLE_CRYSTAL   = LUMI_WHITE

# Tileset colors
TILE_PLAT        = PLAT_MED
TILE_PLAT_D      = PLAT_DARK
TILE_PLAT_L      = PLAT_LIGHT
TILE_PLAT_E      = PLAT_EDGE
TILE_INDIGO      = INDIGO_MED
TILE_INDIGO_D    = INDIGO_DARK
TILE_INDIGO_B    = INDIGO_BRIGHT
TILE_GOLD        = GOLD_MED
TILE_GOLD_D      = GOLD_DARK
TILE_GOLD_L      = GOLD_BRIGHT
TILE_SPIRE       = SPIRE_MED
TILE_SPIRE_D     = SPIRE_DARK
TILE_SPIRE_L     = SPIRE_LIGHT
TILE_RIFT        = RIFT_INDIGO
TILE_RIFT_D      = RIFT_DEEP


def ensure_dir(path):
    os.makedirs(os.path.dirname(path) if isinstance(path, str) else path.parent, exist_ok=True)


def save_asset(img, rel_path):
    full_path = ASSET_ROOT / rel_path if isinstance(rel_path, str) else rel_path
    ensure_dir(full_path)
    img.save(str(full_path))
    print(f"  Created: {full_path.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# ENEMY 1: VOID SENTINEL -- corrupted celestial guardian, 16x16, 8 frames
# Frames 0-3: walk/patrol, Frames 4-7: attack (void strike)
# Gold-cracked armor over void-infused body
# =========================================================================

def draw_void_sentinel(draw, ox, oy, frame):
    """Draw a single 16x16 Void Sentinel frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, 0, -1, 0][anim]
    stride = [0, 1, 0, -1][anim]

    # Phase shimmer — alternates gold/indigo highlights per frame
    phase_color = SENTINEL_RUNE if anim % 2 == 0 else INDIGO_BRIGHT

    # Heavy armored legs (celestial greaves, cracked with gold)
    draw.rectangle([ox + 4, oy + 12 + bob, ox + 6, oy + 14], fill=SENTINEL_BODY_D)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 11, oy + 14], fill=SENTINEL_BODY_D)
    # Boots with gold luminescent runes
    draw.rectangle([ox + 3 + stride, oy + 14, ox + 6 + stride, oy + 15], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 9 - stride, oy + 14, ox + 12 - stride, oy + 15], fill=SENTINEL_ARMOR)
    draw.point((ox + 4 + stride, oy + 14), fill=SENTINEL_RUNE)
    draw.point((ox + 10 - stride, oy + 14), fill=SENTINEL_RUNE)

    # Torso (void-corrupted celestial armor with cracked gold core)
    draw.rectangle([ox + 3, oy + 6 + bob, ox + 12, oy + 12 + bob], fill=SENTINEL_BODY)
    draw.rectangle([ox + 4, oy + 7 + bob, ox + 11, oy + 11 + bob], fill=SENTINEL_BODY_L)
    # Split core: gold left, void-indigo right
    draw.point((ox + 7, oy + 9 + bob), fill=GOLD_BRIGHT)
    draw.point((ox + 8, oy + 9 + bob), fill=INDIGO_BRIGHT)
    # Luminescent crack veins
    draw.point((ox + 5, oy + 8 + bob), fill=phase_color)
    draw.point((ox + 10, oy + 8 + bob), fill=phase_color)
    # Gold rune marks on armor
    draw.point((ox + 4, oy + 10 + bob), fill=SENTINEL_RUNE)
    draw.point((ox + 11, oy + 10 + bob), fill=SENTINEL_RUNE)
    # Shoulder pauldrons (asymmetric: celestial gold / void indigo)
    draw.rectangle([ox + 2, oy + 6 + bob, ox + 3, oy + 8 + bob], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 12, oy + 6 + bob, ox + 13, oy + 8 + bob], fill=SENTINEL_ARMOR_D)
    draw.point((ox + 2, oy + 6 + bob), fill=GOLD_BRIGHT)
    draw.point((ox + 13, oy + 6 + bob), fill=INDIGO_BRIGHT)

    # Head (helm with cracked visor — celestial/void sides)
    draw.rectangle([ox + 5, oy + 2 + bob, ox + 10, oy + 6 + bob], fill=SENTINEL_ARMOR)
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 5 + bob], fill=SENTINEL_ARMOR_D)
    # Visor slit with glowing eyes
    draw.rectangle([ox + 6, oy + 4 + bob, ox + 9, oy + 4 + bob], fill=OUTLINE)
    draw.point((ox + 6, oy + 4 + bob), fill=SENTINEL_EYE)
    draw.point((ox + 9, oy + 4 + bob), fill=INDIGO_GLOW)
    # Helm crest (shattered crystal spikes)
    draw.point((ox + 7, oy + 1 + bob), fill=GOLD_BRIGHT)
    draw.point((ox + 8, oy + 1 + bob), fill=INDIGO_BRIGHT)

    # Arms and attack
    if is_attack:
        burst = [0, 2, 4, 2][anim]
        # Arms raised for void strike
        draw.rectangle([ox + 1, oy + 5 + bob - burst, ox + 3, oy + 10 + bob], fill=SENTINEL_BODY_L)
        draw.rectangle([ox + 12, oy + 5 + bob - burst, ox + 14, oy + 10 + bob], fill=SENTINEL_BODY_L)
        # Gauntlets charging with void energy
        draw.point((ox + 1, oy + 5 + bob - burst), fill=SENTINEL_GLOW)
        draw.point((ox + 14, oy + 5 + bob - burst), fill=RIFT_INDIGO)
        # Void shockwave
        if burst >= 2:
            draw.point((ox + 2, oy + 4 + bob - burst), fill=RIFT_INDIGO)
            draw.point((ox + 13, oy + 4 + bob - burst), fill=GOLD_GLOW)
            draw.point((ox + 7, oy + 15), fill=RIFT_GOLD)
            draw.point((ox + 8, oy + 15), fill=INDIGO_GLOW)
    else:
        # Idle arms with void halberd
        draw.rectangle([ox + 1, oy + 7 + bob, ox + 3, oy + 12 + bob], fill=SENTINEL_BODY)
        draw.rectangle([ox + 12, oy + 7 + bob, ox + 14, oy + 12 + bob], fill=SENTINEL_BODY)
        # Halberd in right hand
        draw.rectangle([ox + 14, oy + 3 + bob, ox + 14, oy + 13 + bob], fill=SPIRE_LIGHT)
        draw.point((ox + 14, oy + 2 + bob), fill=RIFT_GOLD)
        draw.point((ox + 13, oy + 3 + bob), fill=SPIRE_EDGE)


def generate_void_sentinel():
    """Generate 8-frame Void Sentinel sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_void_sentinel(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_void_sentinel.png")
    return img


# =========================================================================
# ENEMY 2: REALITY SHARD -- living crystal fragment, 16x16, 8 frames
# Frames 0-3: float/drift, Frames 4-7: attack (shard burst)
# =========================================================================

def draw_reality_shard(draw, ox, oy, frame):
    """Draw a single 16x16 Reality Shard frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [0, -1, -2, -1][anim]
    phase_shift = [0, 1, 2, 1][anim]

    # Trailing luminescent energy (crystal fragments dissolving)
    draw.rectangle([ox + 5, oy + 12 + float_y, ox + 6, oy + 15], fill=SHARD_TRAIL)
    draw.rectangle([ox + 9, oy + 12 + float_y, ox + 10, oy + 15], fill=SHARD_TRAIL)
    # Flickering trail below
    draw.point((ox + 4, oy + 14 + float_y), fill=SHARD_TRAIL_L)
    draw.point((ox + 11, oy + 14 + float_y), fill=SHARD_TRAIL_L)

    # Jagged crystal body (semi-transparent, luminescent)
    draw.rectangle([ox + 4, oy + 5 + float_y, ox + 11, oy + 12 + float_y], fill=SHARD_BODY)
    draw.rectangle([ox + 5, oy + 6 + float_y, ox + 10, oy + 11 + float_y], fill=SHARD_BODY_D)
    # Crystal facets (angular highlights)
    draw.point((ox + 5, oy + 6 + float_y), fill=SHARD_FACET)
    draw.point((ox + 10, oy + 8 + float_y), fill=SHARD_FACET)
    draw.point((ox + 7, oy + 11 + float_y), fill=SHARD_FACET)
    # Luminescent core
    draw.rectangle([ox + 6, oy + 7 + float_y, ox + 9, oy + 10 + float_y], fill=SHARD_EDGE)
    draw.point((ox + 7, oy + 8 + float_y), fill=SHARD_CORE)
    draw.point((ox + 8, oy + 9 + float_y), fill=SHARD_GLOW)

    # Top crystal spike
    draw.rectangle([ox + 6, oy + 3 + float_y, ox + 9, oy + 5 + float_y], fill=SHARD_BODY)
    draw.point((ox + 7, oy + 2 + float_y), fill=SHARD_EDGE)
    draw.point((ox + 8, oy + 2 + float_y), fill=LUMI_PULSE)
    # Top point
    draw.point((ox + 7, oy + 1 + float_y + phase_shift // 2), fill=SHARD_GLOW)

    # Side crystal protrusions (jagged)
    draw.rectangle([ox + 3, oy + 7 + float_y, ox + 4, oy + 9 + float_y], fill=SHARD_BODY)
    draw.point((ox + 2, oy + 7 + float_y), fill=SHARD_EDGE)
    draw.rectangle([ox + 11, oy + 6 + float_y, ox + 12, oy + 8 + float_y], fill=SHARD_BODY)
    draw.point((ox + 13, oy + 6 + float_y), fill=SHARD_EDGE)

    # Gold-cracked eye (reality seeing through the shard)
    draw.point((ox + 7, oy + 7 + float_y), fill=SHARD_EYE)
    draw.point((ox + 8, oy + 7 + float_y), fill=GOLD_MED)

    if is_attack:
        burst_ext = [0, 2, 3, 1][anim]
        # Shard burst — crystal fragments flying outward
        draw.point((ox + 2 - burst_ext, oy + 5 + float_y), fill=SHARD_EDGE)
        draw.point((ox + 13 + burst_ext, oy + 5 + float_y), fill=SHARD_EDGE)
        draw.point((ox + 1 - burst_ext, oy + 8 + float_y), fill=LUMI_CYAN)
        draw.point((ox + 14 + burst_ext, oy + 8 + float_y), fill=LUMI_CYAN)
        # Central burst flash
        if burst_ext >= 2:
            draw.point((ox + 7, oy + 5 + float_y), fill=LUMI_WHITE)
            draw.point((ox + 8, oy + 5 + float_y), fill=LUMI_WHITE)
            draw.point((ox + 6, oy + 12 + float_y), fill=GOLD_GLOW)
            draw.point((ox + 9, oy + 12 + float_y), fill=GOLD_GLOW)
    else:
        # Ambient glow particles orbiting
        orbit_offset = anim * 2
        for angle_idx in range(3):
            angle = math.radians(orbit_offset * 30 + angle_idx * 120)
            px = int(ox + 7 + 5 * math.cos(angle))
            py = int(oy + 8 + float_y + 4 * math.sin(angle))
            if 0 <= px - ox < 16 and 0 <= py - oy < 16:
                draw.point((px, py), fill=LUMI_PULSE)


def generate_reality_shard():
    """Generate 8-frame Reality Shard sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_reality_shard(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_reality_shard.png")
    return img


# =========================================================================
# ENEMY 3: OBLIVION WRAITH -- formless void entity, 16x16, 8 frames
# Frames 0-3: drift/phase, Frames 4-7: attack (void grasp)
# =========================================================================

def draw_oblivion_wraith(draw, ox, oy, frame):
    """Draw a single 16x16 Oblivion Wraith frame."""
    is_attack = frame >= 4
    anim = frame % 4

    drift_y = [0, -1, 0, 1][anim]
    sway = [0, 1, 0, -1][anim]

    # Void trail (dissolving into nothingness)
    for ty in range(13, 16):
        alpha = 100 - (ty - 13) * 30
        if alpha > 0:
            draw.rectangle([ox + 5 + sway, oy + ty + drift_y, ox + 10 + sway, oy + ty + drift_y],
                           fill=(WRAITH_TRAIL[0], WRAITH_TRAIL[1], WRAITH_TRAIL[2], alpha))

    # Formless void body (translucent, shifting)
    draw.rectangle([ox + 4 + sway, oy + 5 + drift_y, ox + 11 + sway, oy + 13 + drift_y], fill=WRAITH_BODY)
    draw.rectangle([ox + 5 + sway, oy + 6 + drift_y, ox + 10 + sway, oy + 12 + drift_y], fill=WRAITH_BODY_D)
    # Gold cracks across void surface
    draw.point((ox + 5 + sway, oy + 8 + drift_y), fill=WRAITH_CRACK)
    draw.point((ox + 8 + sway, oy + 10 + drift_y), fill=WRAITH_CRACK)
    draw.point((ox + 10 + sway, oy + 7 + drift_y), fill=WRAITH_CRACK)
    # Inner void glow
    draw.rectangle([ox + 6 + sway, oy + 7 + drift_y, ox + 9 + sway, oy + 10 + drift_y], fill=WRAITH_EDGE)
    draw.point((ox + 7 + sway, oy + 8 + drift_y), fill=WRAITH_CORE)
    draw.point((ox + 8 + sway, oy + 9 + drift_y), fill=WRAITH_GLOW)

    # Head (hooded void with blazing gold eyes)
    draw.rectangle([ox + 5 + sway, oy + 2 + drift_y, ox + 10 + sway, oy + 6 + drift_y], fill=WRAITH_BODY)
    draw.rectangle([ox + 6 + sway, oy + 3 + drift_y, ox + 9 + sway, oy + 5 + drift_y], fill=WRAITH_BODY_D)
    # Hood peak
    draw.point((ox + 7 + sway, oy + 1 + drift_y), fill=WRAITH_BODY)
    draw.point((ox + 8 + sway, oy + 1 + drift_y), fill=WRAITH_BODY)
    # Blazing gold eyes
    draw.point((ox + 6 + sway, oy + 4 + drift_y), fill=WRAITH_EYE)
    draw.point((ox + 9 + sway, oy + 4 + drift_y), fill=WRAITH_EYE)

    # Tendrils / arms
    if is_attack:
        reach = [0, 2, 4, 2][anim]
        # Void tendrils reaching outward
        draw.rectangle([ox + 2 + sway - reach, oy + 6 + drift_y, ox + 4 + sway, oy + 10 + drift_y], fill=WRAITH_BODY)
        draw.rectangle([ox + 11 + sway, oy + 6 + drift_y, ox + 13 + sway + reach, oy + 10 + drift_y], fill=WRAITH_BODY)
        # Tendril tips with gold cracks
        draw.point((ox + 2 + sway - reach, oy + 7 + drift_y), fill=WRAITH_CRACK)
        draw.point((ox + 13 + sway + reach, oy + 7 + drift_y), fill=WRAITH_CRACK)
        # Void grasp energy
        if reach >= 2:
            draw.point((ox + 1 + sway - reach, oy + 8 + drift_y), fill=INDIGO_GLOW)
            draw.point((ox + 14 + sway + reach, oy + 8 + drift_y), fill=INDIGO_GLOW)
            draw.point((ox + 7 + sway, oy + 15), fill=GOLD_GLOW)
    else:
        # Idle wisping tendrils
        draw.rectangle([ox + 2 + sway, oy + 7 + drift_y, ox + 4 + sway, oy + 11 + drift_y], fill=WRAITH_BODY)
        draw.rectangle([ox + 11 + sway, oy + 7 + drift_y, ox + 13 + sway, oy + 11 + drift_y], fill=WRAITH_BODY)
        # Wisp fade
        draw.point((ox + 2 + sway, oy + 11 + drift_y), fill=WRAITH_TRAIL_L)
        draw.point((ox + 13 + sway, oy + 11 + drift_y), fill=WRAITH_TRAIL_L)


def generate_oblivion_wraith():
    """Generate 8-frame Oblivion Wraith sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_oblivion_wraith(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_oblivion_wraith.png")
    return img


# =========================================================================
# BOSS: THE SPIRE KEEPER -- corrupted celestial overseer, 32x32
# =========================================================================

def draw_spire_keeper(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw the Spire Keeper boss at 32x32."""
    anim = frame % 4
    breath = [0, 0, -1, 0][anim]

    # Phase modifiers
    body = KEEPER_BODY if phase == 1 else (VOID_MED if phase == 3 else SPIRE_DARK)
    armor = KEEPER_ARMOR if phase < 3 else INDIGO_BRIGHT
    eye = KEEPER_EYE if phase < 3 else LUMI_WHITE
    flame = KEEPER_FLAME if phase == 1 else (GOLD_GLOW if phase == 2 else LUMI_CYAN)
    rune = KEEPER_RUNE if phase < 3 else LUMI_PULSE
    glow = KEEPER_GLOW if phase == 1 else (LUMI_WHITE if phase == 3 else GOLD_GLOW)
    crown = KEEPER_CROWN if phase < 3 else GOLD_GLOW
    blade = KEEPER_BLADE if phase < 3 else LUMI_WHITE
    outline = OUTLINE

    # Legs (celestial greaves with gold inlay)
    draw.rectangle([ox + 10, oy + 24 + breath, ox + 13, oy + 28], fill=body)
    draw.rectangle([ox + 18, oy + 24 + breath, ox + 21, oy + 28], fill=body)
    # Boots (heavy, cracked with gold)
    draw.rectangle([ox + 9, oy + 28, ox + 14, oy + 30], fill=armor)
    draw.rectangle([ox + 17, oy + 28, ox + 22, oy + 30], fill=armor)
    draw.point((ox + 11, oy + 28), fill=rune)
    draw.point((ox + 20, oy + 28), fill=rune)
    # Gold cracks on greaves
    draw.point((ox + 11, oy + 25 + breath), fill=GOLD_BRIGHT)
    draw.point((ox + 20, oy + 25 + breath), fill=GOLD_BRIGHT)

    # Torso (massive celestial plate armor, cracked with golden light)
    draw.rectangle([ox + 8, oy + 13 + breath, ox + 23, oy + 24 + breath], fill=body)
    draw.rectangle([ox + 9, oy + 14 + breath, ox + 22, oy + 23 + breath], fill=KEEPER_BODY_D)
    # Celestial chest plate with void corruption
    draw.rectangle([ox + 11, oy + 15 + breath, ox + 20, oy + 21 + breath], fill=armor)
    draw.rectangle([ox + 12, oy + 16 + breath, ox + 19, oy + 20 + breath], fill=KEEPER_ARMOR_D)
    # Central void core (cracked with gold)
    draw.rectangle([ox + 14, oy + 17 + breath, ox + 17, oy + 19 + breath], fill=INDIGO_BRIGHT)
    draw.point((ox + 15, oy + 18 + breath), fill=glow)
    draw.point((ox + 16, oy + 18 + breath), fill=glow)
    # Gold crack lines radiating from core
    draw.point((ox + 13, oy + 18 + breath), fill=GOLD_BRIGHT)
    draw.point((ox + 18, oy + 18 + breath), fill=GOLD_BRIGHT)
    draw.point((ox + 15, oy + 16 + breath), fill=GOLD_BRIGHT)
    draw.point((ox + 16, oy + 20 + breath), fill=GOLD_BRIGHT)
    # Shoulder pauldrons (ornate celestial, asymmetric corruption)
    draw.rectangle([ox + 5, oy + 13 + breath, ox + 8, oy + 17 + breath], fill=armor)
    draw.rectangle([ox + 23, oy + 13 + breath, ox + 26, oy + 17 + breath], fill=armor)
    draw.point((ox + 6, oy + 13 + breath), fill=GOLD_BRIGHT)
    draw.point((ox + 25, oy + 13 + breath), fill=INDIGO_GLOW)
    # Luminescent cracks on pauldrons
    draw.point((ox + 6, oy + 15 + breath), fill=rune)
    draw.point((ox + 25, oy + 15 + breath), fill=rune)
    # Void energy wisps off shoulders
    draw.point((ox + 5, oy + 12 + breath), fill=flame)
    draw.point((ox + 26, oy + 12 + breath), fill=flame)

    # Cape (void fabric, shifting indigo)
    cape_wave = [0, 1, 2, 1][anim]
    draw.rectangle([ox + 10, oy + 20 + breath, ox + 21, oy + 24 + breath + cape_wave], fill=KEEPER_CAPE)
    draw.point((ox + 11, oy + 24 + breath + cape_wave), fill=KEEPER_CAPE_L)
    draw.point((ox + 20, oy + 24 + breath + cape_wave), fill=KEEPER_CAPE_L)

    # Head (helm with shattered celestial crown)
    draw.rectangle([ox + 11, oy + 5 + breath, ox + 20, oy + 12 + breath], fill=body)
    draw.rectangle([ox + 12, oy + 6 + breath, ox + 19, oy + 11 + breath], fill=KEEPER_BODY_D)
    # Face plate (cracked celestial mask)
    draw.rectangle([ox + 13, oy + 7 + breath, ox + 18, oy + 10 + breath], fill=armor)
    # Blazing eyes (gold / void split)
    draw.rectangle([ox + 13, oy + 8 + breath, ox + 14, oy + 9 + breath], fill=outline)
    draw.point((ox + 13, oy + 8 + breath), fill=eye)
    draw.rectangle([ox + 17, oy + 8 + breath, ox + 18, oy + 9 + breath], fill=outline)
    draw.point((ox + 18, oy + 8 + breath), fill=INDIGO_GLOW)

    # Shattered celestial crown (gold and crystal spires)
    draw.rectangle([ox + 12, oy + 4 + breath, ox + 19, oy + 5 + breath], fill=crown)
    draw.point((ox + 14, oy + 3 + breath), fill=GOLD_BRIGHT)
    draw.point((ox + 15, oy + 2 + breath), fill=KEEPER_CROWN_G)
    draw.point((ox + 16, oy + 2 + breath), fill=INDIGO_GLOW)
    draw.point((ox + 17, oy + 3 + breath), fill=INDIGO_BRIGHT)
    # Crown center gem (reality nexus)
    draw.point((ox + 15, oy + 3 + breath), fill=flame)
    draw.point((ox + 16, oy + 3 + breath), fill=flame)
    # Crown tips (void energy rising)
    draw.point((ox + 13, oy + 2 + breath), fill=GOLD_MED)
    draw.point((ox + 15, oy + 1 + breath), fill=glow)
    draw.point((ox + 16, oy + 1 + breath), fill=glow)
    draw.point((ox + 18, oy + 2 + breath), fill=INDIGO_MED)

    # Arms
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        attack_ext = [0, 2, 4, 2][anim]
        # Arms raised, void blade slash
        draw.rectangle([ox + 4, oy + 12 + breath - attack_ext, ox + 8, oy + 18 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 12 + breath - attack_ext, ox + 27, oy + 18 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 12 + breath - attack_ext, ox + 5, oy + 13 + breath - attack_ext], fill=armor)
        draw.rectangle([ox + 26, oy + 12 + breath - attack_ext, ox + 28, oy + 13 + breath - attack_ext], fill=armor)
        # Void blade energy between hands
        if attack_ext >= 2:
            random.seed(218 + frame)
            for rx in range(6, 26, 2):
                ry = 11 + breath - attack_ext + random.randint(-1, 1)
                if 0 <= oy + ry < 32:
                    draw.point((ox + rx, oy + ry), fill=blade)
            # Central blade flare
            draw.rectangle([ox + 13, oy + 10 + breath - attack_ext, ox + 18, oy + 12 + breath - attack_ext], fill=KEEPER_BLADE)
            draw.point((ox + 15, oy + 11 + breath - attack_ext), fill=glow)
            draw.point((ox + 16, oy + 11 + breath - attack_ext), fill=glow)
        # Ground cracks from impact
        if attack_ext >= 3:
            for gx in range(3, 29, 3):
                draw.point((ox + gx, oy + 30), fill=flame)
                draw.point((ox + gx, oy + 31), fill=INDIGO_DARK)
    else:
        # Idle arms with void scepter
        draw.rectangle([ox + 4, oy + 14 + breath, ox + 8, oy + 22 + breath], fill=body)
        draw.rectangle([ox + 23, oy + 14 + breath, ox + 27, oy + 22 + breath], fill=body)
        # Gauntlets
        draw.rectangle([ox + 3, oy + 20 + breath, ox + 5, oy + 22 + breath], fill=armor)
        draw.rectangle([ox + 26, oy + 20 + breath, ox + 28, oy + 22 + breath], fill=armor)
        draw.point((ox + 4, oy + 20 + breath), fill=rune)
        draw.point((ox + 27, oy + 20 + breath), fill=rune)
        # Void scepter in right hand (crystalline energy staff)
        draw.rectangle([ox + 27, oy + 6 + breath, ox + 27, oy + 22 + breath], fill=LUMI_CYAN)
        draw.rectangle([ox + 28, oy + 7 + breath, ox + 28, oy + 20 + breath], fill=blade)
        draw.point((ox + 27, oy + 5 + breath), fill=glow)
        # Scepter head energy aura
        draw.point((ox + 26, oy + 4 + breath + arm_wave), fill=flame)
        draw.point((ox + 29, oy + 4 + breath + arm_wave), fill=blade)
        draw.point((ox + 27, oy + 3 + breath + arm_wave), fill=RIFT_WHITE)

    # Ambient void particles rising
    for tx in range(10, 22, 3):
        ty = 28 + (anim + tx) % 4
        if ty < 32:
            draw.point((ox + tx, oy + ty), fill=INDIGO_BRIGHT)
    # Crown blazing
    draw.point((ox + 14, oy + 2 + breath), fill=GOLD_BRIGHT)
    draw.point((ox + 15, oy + 1 + breath), fill=glow)
    draw.point((ox + 16, oy + 1 + breath), fill=glow)
    draw.point((ox + 17, oy + 2 + breath), fill=INDIGO_BRIGHT)


def generate_spire_keeper():
    """Generate all Spire Keeper boss sprite sheets."""
    random.seed(218)

    # Idle
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_spire_keeper(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_spire_keeper_idle.png")

    # Attack -- 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        random.seed(218 + f)
        draw_spire_keeper(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_spire_keeper_attack.png")

    # Phase 1
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_spire_keeper(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_spire_keeper_phase1.png")

    # Phase 2 -- corruption deepens
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_spire_keeper(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_spire_keeper_phase2.png")

    # Phase 3 -- full void overcharge
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_spire_keeper(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_spire_keeper_phase3.png")


# =========================================================================
# NPC: VOID ORACLE -- cosmic seer, 16x24
# Studies the boundary between reality and oblivion with a crystal orb
# =========================================================================

def draw_void_oracle(draw, ox, oy):
    """Draw the Void Oracle NPC at 16x24."""
    # Feet / boots (oracle's drift boots — barely touching ground)
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=SPIRE_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=SPIRE_DARK)

    # Robe (long, void-indigo with gold trim)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=ORACLE_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=ORACLE_ROBE_L)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=ORACLE_ROBE)
    # Gold trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=ORACLE_TRIM)

    # Belt with void clasp
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=ORACLE_BELT)
    # Gold crystal pendant
    draw.point((ox + 8, oy + 15), fill=GOLD_BRIGHT)
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

    # Void seeing orb (held in left hand, luminescent cyan)
    draw.rectangle([ox + 1, oy + 15, ox + 3, oy + 19], fill=ORACLE_ORB)
    draw.point((ox + 2, oy + 16), fill=ORACLE_ORB_G)
    # Glowing void energy in orb
    draw.point((ox + 1, oy + 17), fill=LUMI_WHITE)

    # Crystal staff (right hand — reality anchor)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=SPIRE_LIGHT)
    # Crystal at top
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=SPIRE_MED)
    draw.point((ox + 14, oy + 1), fill=ORACLE_CRYSTAL)
    draw.point((ox + 14, oy + 2), fill=LUMI_CYAN)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=ORACLE_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=ORACLE_SKIN)

    # Hood (deep void-indigo)
    draw.rectangle([ox + 4, oy + 2, ox + 12, oy + 5], fill=ORACLE_HOOD)
    draw.point((ox + 4, oy + 5), fill=ORACLE_HOOD)
    draw.point((ox + 4, oy + 6), fill=ORACLE_HOOD)
    draw.point((ox + 12, oy + 5), fill=ORACLE_HOOD)
    draw.point((ox + 12, oy + 6), fill=ORACLE_HOOD)

    # Blazing gold eyes (void sight)
    draw.point((ox + 6, oy + 6), fill=ORACLE_EYES)
    draw.point((ox + 10, oy + 6), fill=ORACLE_EYES)
    # Third eye hint (faint indigo)
    draw.point((ox + 8, oy + 5), fill=INDIGO_GLOW)

    # Circlet under hood (gold-studded with crystal)
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 4], fill=GOLD_MED)
    draw.point((ox + 8, oy + 3), fill=GOLD_BRIGHT)


def generate_void_oracle():
    """Generate Void Oracle NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_void_oracle(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_oblivion_spire.png")
    return img


# =========================================================================
# TILESET -- tileset_oblivion_spire.png (256x64, 16 cols x 4 rows)
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


def tile_crystal_platform(tile):
    """Solid crystalline spire platform."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([1, 1, 14, 14], fill=TILE_PLAT_L)
    # Gold luminescent crack seams
    d.point((4, 4), fill=TILE_GOLD)
    d.point((11, 7), fill=TILE_GOLD)
    d.point((7, 12), fill=TILE_GOLD)
    # Crystal edge highlight
    d.rectangle([0, 0, 15, 0], fill=TILE_PLAT_E)


def tile_void_floor(tile):
    """Floor with void cracks leaking golden light."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    # Void crack pattern
    d.rectangle([3, 3, 4, 12], fill=TILE_INDIGO)
    d.rectangle([8, 1, 9, 8], fill=TILE_INDIGO)
    d.rectangle([12, 6, 13, 14], fill=TILE_INDIGO)
    # Gold glow bleeding through cracks
    d.point((3, 6), fill=TILE_GOLD_L)
    d.point((8, 4), fill=TILE_GOLD_L)
    d.point((12, 10), fill=TILE_GOLD_L)
    # Void marks
    d.point((6, 8), fill=TILE_RIFT_D)
    d.point((10, 3), fill=TILE_RIFT_D)


def tile_spire_pillar(tile):
    """Vertical crystalline spire pillar."""
    d = ImageDraw.Draw(tile)
    d.rectangle([5, 0, 10, 15], fill=TILE_SPIRE_L)
    d.rectangle([6, 0, 9, 15], fill=TILE_PLAT_E)
    # Gold energy flowing through pillar
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
    d.point((7, 0), fill=GOLD_GLOW)
    d.point((8, 0), fill=GOLD_GLOW)


def tile_void_rift(tile):
    """Active void rift tear (reality boundary)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Rift tear (diagonal energy slash)
    for i in range(12):
        x = 2 + i
        y = 2 + int(i * 0.8)
        if 0 <= x < 16 and 0 <= y < 16:
            d.point((x, y), fill=RIFT_INDIGO)
            if y + 1 < 16:
                d.point((x, y + 1), fill=INDIGO_MED)
    # Gold bleeding from rift
    d.point((5, 5), fill=GOLD_BRIGHT)
    d.point((10, 9), fill=GOLD_BRIGHT)
    # Void visible through rift
    d.point((7, 7), fill=INDIGO_GLOW)
    d.point((8, 8), fill=INDIGO_GLOW)


def tile_wall_top(tile):
    """Crystalline spire wall top."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_SPIRE)
    d.rectangle([0, 0, 15, 3], fill=TILE_SPIRE_L)
    d.rectangle([0, 12, 15, 15], fill=TILE_SPIRE_D)
    # Crystal fractures
    d.point((3, 1), fill=TRANSPARENT)
    d.point((12, 2), fill=TRANSPARENT)
    # Gold inlay
    d.point((4, 7), fill=TILE_GOLD)
    d.point((11, 7), fill=TILE_GOLD)
    d.point((7, 5), fill=TILE_INDIGO)
    d.point((8, 10), fill=TILE_INDIGO)
    # Top edge
    d.rectangle([0, 0, 15, 0], fill=TILE_PLAT_E)


def tile_crystal_cluster(tile):
    """Cluster of shattered celestial crystals."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Main crystal (gold, tall center)
    d.rectangle([6, 2, 9, 13], fill=GOLD_MED)
    d.rectangle([7, 3, 8, 12], fill=GOLD_BRIGHT)
    d.point((7, 1), fill=GOLD_GLOW)
    # Side crystals (indigo)
    d.rectangle([3, 6, 5, 13], fill=INDIGO_MED)
    d.point((4, 5), fill=INDIGO_BRIGHT)
    d.rectangle([10, 5, 12, 13], fill=INDIGO_MED)
    d.point((11, 4), fill=INDIGO_BRIGHT)
    # Energy glow at bases
    d.point((7, 7), fill=RIFT_GOLD)
    d.point((4, 9), fill=RIFT_INDIGO)
    d.point((11, 8), fill=RIFT_INDIGO)


def tile_void_gap(tile):
    """Empty void between floating platforms."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=VOID_BLACK)
    # Distant void shimmer
    d.point((4, 5), fill=c(VOID_SHIMMER, 120))
    d.point((11, 10), fill=c(VOID_SHIMMER, 120))
    d.point((7, 13), fill=c(GOLD_DARK, 80))
    d.point((2, 8), fill=c(RIFT_DEEP, 60))


def tile_throne_nexus(tile):
    """Raised nexus dais with converging void energy."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([2, 2, 13, 13], fill=TILE_PLAT_L)
    d.rectangle([4, 4, 11, 11], fill=TILE_PLAT_E)
    # Void rune cross pattern
    d.rectangle([7, 2, 8, 13], fill=TILE_GOLD)
    d.rectangle([2, 7, 13, 8], fill=TILE_INDIGO)
    # Center glow
    d.rectangle([6, 6, 9, 9], fill=GOLD_BRIGHT)
    d.point((7, 7), fill=GOLD_GLOW)
    d.point((8, 8), fill=INDIGO_GLOW)


def tile_rune_plate(tile):
    """Floor plate with celestial rune inscriptions."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    d.rectangle([1, 1, 14, 14], fill=TILE_PLAT_L)
    # Rune circle border
    for angle in range(0, 360, 30):
        rx = 7 + int(5 * math.cos(math.radians(angle)))
        ry = 7 + int(5 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            d.point((rx, ry), fill=TILE_RIFT_D)
    # Center rune (gold/indigo alternating)
    d.point((7, 7), fill=TILE_GOLD)
    d.point((8, 7), fill=TILE_INDIGO)
    d.point((7, 8), fill=GOLD_BRIGHT)


def tile_void_portal(tile):
    """Active void portal to oblivion."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT_D)
    # Portal ring (alternating gold/indigo)
    for angle in range(0, 360, 20):
        rx = 7 + int(6 * math.cos(math.radians(angle)))
        ry = 7 + int(6 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            col = GOLD_BRIGHT if angle % 40 == 0 else RIFT_INDIGO
            d.point((rx, ry), fill=col)
    # Inner swirl
    for angle in range(0, 360, 40):
        rx = 7 + int(3 * math.cos(math.radians(angle)))
        ry = 7 + int(3 * math.sin(math.radians(angle)))
        if 0 <= rx < 16 and 0 <= ry < 16:
            d.point((rx, ry), fill=INDIGO_GLOW)
    # Center void
    d.rectangle([6, 6, 9, 9], fill=VOID_BLACK)
    d.point((7, 7), fill=RIFT_GOLD)
    d.point((8, 8), fill=RIFT_INDIGO)


def tile_celestial_mosaic(tile):
    """Woven celestial mosaic floor covering."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_PLAT)
    # Checkerboard shimmer pattern (gold/indigo)
    for x in range(0, 16, 4):
        for y in range(0, 16, 4):
            d.rectangle([x, y, x + 1, y + 1], fill=TILE_INDIGO)
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
    d.rectangle([0, 7, 15, 7], fill=TILE_SPIRE_D)


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
    d.rectangle([7, 0, 7, 15], fill=TILE_SPIRE_D)


def tile_spire_stone_v1(tile):
    """Crystalline spire stone variant 1."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_SPIRE)
    d.rectangle([1, 1, 14, 14], fill=TILE_SPIRE_L)
    # Gold veins
    d.point((3, 5), fill=TILE_GOLD)
    d.point((4, 6), fill=TILE_GOLD)
    d.point((10, 3), fill=TILE_INDIGO)
    d.point((12, 11), fill=TILE_INDIGO)
    # Crystal fracture cracks
    d.point((7, 9), fill=TILE_SPIRE_D)
    d.point((8, 10), fill=TILE_SPIRE_D)
    d.point((6, 2), fill=TRANSPARENT)


def tile_spire_stone_v2(tile):
    """Crystalline spire stone variant 2."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_SPIRE)
    d.rectangle([1, 1, 14, 14], fill=TILE_SPIRE_L)
    # Different vein pattern
    d.point((5, 10), fill=TILE_GOLD)
    d.point((6, 11), fill=TILE_GOLD)
    d.point((11, 4), fill=TILE_INDIGO)
    d.point((3, 8), fill=TILE_INDIGO)
    # Crystal fractures
    d.point((9, 6), fill=TILE_SPIRE_D)
    d.point((10, 7), fill=TILE_SPIRE_D)
    d.point((13, 3), fill=TRANSPARENT)


def generate_tileset():
    """Generate tileset_oblivion_spire.png (256x64)."""
    random.seed(218)
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground / terrain tiles
    row0 = [
        tile_crystal_platform, tile_void_floor, tile_throne_nexus, tile_void_gap,
        tile_void_rift, tile_wall_top, tile_crystal_cluster, tile_void_portal,
        tile_spire_stone_v1, tile_spire_stone_v2, tile_edge_top, tile_edge_bottom,
        tile_edge_left, tile_edge_right, tile_rune_plate, tile_crystal_platform,
    ]
    for i, fn in enumerate(row0):
        random.seed(218 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Features and decorations
    row1 = [
        tile_spire_pillar, tile_void_portal, tile_rune_plate, tile_throne_nexus,
        tile_crystal_platform, tile_void_floor, tile_void_gap, tile_void_rift,
        tile_wall_top, tile_edge_top, tile_spire_stone_v1, tile_spire_stone_v2,
        tile_edge_left, tile_edge_right, tile_celestial_mosaic, tile_crystal_cluster,
    ]
    for i, fn in enumerate(row1):
        random.seed(218 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions
    row2 = [
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_void_gap, tile_void_gap, tile_crystal_platform, tile_void_rift,
        tile_crystal_platform, tile_void_floor, tile_void_rift, tile_wall_top,
        tile_rune_plate, tile_void_portal, tile_crystal_cluster, tile_throne_nexus,
    ]
    for i, fn in enumerate(row2):
        random.seed(218 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: Variants and fill
    row3 = [
        tile_void_portal, tile_rune_plate, tile_spire_pillar, tile_throne_nexus,
        tile_wall_top, tile_void_rift, tile_void_gap, tile_crystal_platform,
        tile_edge_top, tile_edge_bottom, tile_edge_left, tile_edge_right,
        tile_spire_stone_v1, tile_spire_stone_v2, tile_celestial_mosaic, tile_void_floor,
    ]
    for i, fn in enumerate(row3):
        random.seed(218 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(218)
    out = TILESETS_DIR / "tileset_oblivion_spire.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# =========================================================================
# PARALLAX BACKGROUNDS -- 320x180, three layers (far/mid/near)
# Theme: Deep void sky with shattered golden spire, crystalline debris,
# luminescent cracks across reality
# =========================================================================

def generate_parallax():
    """Three parallax layers for Oblivion Spire zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # -- FAR LAYER: void sky with dying celestial light and fractured spire --
    far = Image.new("RGBA", (320, 180), SKY_VOID)
    fd = ImageDraw.Draw(far)
    # Void gradient (absolute dark at top -> faint indigo at horizon)
    for y in range(180):
        ratio = y / 180
        r = int(SKY_VOID[0] * (1 - ratio) + SKY_HORIZON[0] * ratio)
        g = int(SKY_VOID[1] * (1 - ratio) + SKY_HORIZON[1] * ratio)
        b = int(SKY_VOID[2] * (1 - ratio) + SKY_HORIZON[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    random.seed(218)

    # Dying celestial sun (eclipsed, with gold corona)
    sun_x, sun_y = 160, 40
    for dx in range(-8, 9):
        for dy in range(-8, 9):
            dist = (dx * dx + dy * dy) ** 0.5
            if dist <= 8:
                px, py = sun_x + dx, sun_y + dy
                if 0 <= px < 320 and 0 <= py < 180:
                    if dist <= 3:
                        far.putpixel((px, py), VOID_BLACK)  # eclipsed core
                    elif dist <= 5:
                        far.putpixel((px, py), c(GOLD_BRIGHT, 180))
                    elif dist <= 7:
                        far.putpixel((px, py), c(GOLD_MED, 100))
                    else:
                        far.putpixel((px, py), c(GOLD_DARK, 60))

    # Void corona rays (gold light escaping eclipse)
    for ray_angle in range(0, 360, 30):
        ray_len = random.randint(12, 25)
        for ri in range(5, ray_len):
            rx = int(sun_x + ri * math.cos(math.radians(ray_angle)))
            ry = int(sun_y + ri * math.sin(math.radians(ray_angle)))
            if 0 <= rx < 320 and 0 <= ry < 180:
                alpha = max(0, 100 - ri * 4)
                if alpha > 0:
                    far.putpixel((rx, ry), c(GOLD_BRIGHT, alpha))

    # Reality fracture lines across the sky (luminescent cracks)
    for _ in range(4):
        fx = random.randint(20, 300)
        fy = random.randint(20, 120)
        flen = random.randint(30, 80)
        fangle = random.uniform(-0.3, 0.3)
        for fi in range(flen):
            px = int(fx + fi * math.cos(fangle))
            py = int(fy + fi * math.sin(fangle) + 2 * math.sin(fi * 0.15))
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = int(90 * (1 - fi / flen))
                if alpha > 0:
                    far.putpixel((px, py), c(LUMI_CYAN, alpha))
                    if py + 1 < 180:
                        far.putpixel((px, py + 1), c(LUMI_BLUE, alpha // 2))

    # Scattered void nebula wisps
    for _ in range(6):
        nx = random.randint(10, 310)
        ny = random.randint(10, 100)
        nw = random.randint(20, 45)
        nh = random.randint(5, 14)
        cloud_color = random.choice([INDIGO_DARK, VOID_MED, SPIRE_DARK])
        for px in range(nx, nx + nw):
            for py in range(ny, ny + nh):
                if 0 <= px < 320 and 0 <= py < 180:
                    dist = ((px - nx - nw / 2) ** 2 + (py - ny - nh / 2) ** 2) ** 0.5
                    max_dist = (nw / 2 + nh / 2) / 2
                    if dist < max_dist:
                        alpha = int(30 * (1 - dist / max_dist))
                        if alpha > 0:
                            far.putpixel((px, py), c(cloud_color, alpha))

    # Faint stars (mostly absorbed by void)
    for _ in range(15):
        sx, sy = random.randint(0, 319), random.randint(0, 70)
        alpha = random.randint(30, 90)
        star_color = random.choice([SPIRE_EDGE, GOLD_DARK, INDIGO_MED])
        far.putpixel((sx, sy), c(star_color, alpha))

    # Distant shattered spire silhouettes on horizon
    spire_positions = [(30, 135), (90, 118), (160, 130), (240, 122), (300, 128)]
    for fp_x, fp_y in spire_positions:
        fw = random.randint(6, 14)
        fh = random.randint(25, 55)
        # Spire body (dark crystalline)
        fd.rectangle([fp_x, fp_y - fh, fp_x + fw, fp_y], fill=c(SPIRE_DARK))
        # Fractured spire top (jagged)
        fd.rectangle([fp_x + fw // 4, fp_y - fh - 10, fp_x + fw - fw // 4, fp_y - fh], fill=c(SPIRE_DARK))
        fd.point((fp_x + fw // 2, fp_y - fh - 12), fill=c(SPIRE_DARK))
        # Gold crack glow
        fd.point((fp_x + fw // 2, fp_y - fh + 8), fill=c(GOLD_BRIGHT, 90))
        fd.point((fp_x + fw // 2, fp_y - fh + 18), fill=c(GOLD_BRIGHT, 70))
        # Void energy at tip
        fd.point((fp_x + fw // 2, fp_y - fh - 11), fill=c(INDIGO_BRIGHT, 100))

    # Horizon glow (faint indigo and gold mix)
    for y in range(140, 180):
        ratio = (y - 140) / 40
        alpha = int(40 * ratio)
        if alpha > 0:
            fd.line([(0, y), (319, y)], fill=c(SKY_HORIZON, alpha))

    far_out = PARALLAX_DIR / "bg_parallax_oblivion_spire_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # -- MID LAYER: floating crystalline ruins and debris --
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(219)

    # Void energy clouds
    for _ in range(5):
        cx = random.randint(-20, 300)
        cy = random.randint(50, 120)
        cw = random.randint(40, 80)
        ch = random.randint(5, 10)
        cloud_color = random.choice([INDIGO_DARK, VOID_MED])
        md.rectangle([cx, cy, cx + cw, cy + ch], fill=c(cloud_color, 40))
        md.rectangle([cx + 8, cy + 2, cx + cw - 8, cy + ch - 2], fill=c(SPIRE_DARK, 60))

    # Mid-ground floating crystal platforms (shattered)
    platform_positions = [(15, 138), (85, 126), (165, 142), (255, 130)]
    for bx, by in platform_positions:
        bw = random.randint(30, 50)
        bh = random.randint(10, 18)
        # Platform body (crystalline spire stone)
        md.rectangle([bx, by, bx + bw, by + bh], fill=c(SPIRE_MED))
        md.rectangle([bx + 1, by + 1, bx + bw - 1, by + bh - 2], fill=c(SPIRE_LIGHT))
        # Shattered crystal spires on top
        for mx in range(bx, bx + bw, 10):
            tower_h = random.randint(8, 16)
            md.rectangle([mx, by - tower_h, mx + 4, by], fill=c(SPIRE_MED))
            md.point((mx + 2, by - tower_h - 1), fill=c(SPIRE_LIGHT, 160))
            # Gold crack glow
            md.point((mx + 2, by - tower_h + 4), fill=c(GOLD_BRIGHT, 130))
        # Gold crack trim along edge
        md.rectangle([bx, by, bx + bw, by], fill=c(GOLD_DARK, 140))
        # Indigo glow through cracks
        crack_x = bx + random.randint(8, max(9, bw - 8))
        md.rectangle([crack_x, by + 2, crack_x + 2, by + 6], fill=c(INDIGO_MED, 120))

    # Floating crystal debris
    for _ in range(10):
        dx = random.randint(10, 310)
        dy = random.randint(60, 140)
        dw = random.randint(4, 10)
        dh = random.randint(2, 5)
        md.rectangle([dx, dy, dx + dw, dy + dh], fill=c(SPIRE_MED, 80))

    # Void energy wisps (indigo and gold)
    for _ in range(10):
        wx = random.randint(10, 310)
        wy = random.randint(40, 150)
        wlen = random.randint(8, 22)
        wisp_color = random.choice([GOLD_MED, INDIGO_MED])
        for wi in range(wlen):
            wpx = wx + wi
            wpy = wy + int(3 * math.sin(wi * 0.5))
            if 0 <= wpx < 320 and 0 <= wpy < 180:
                alpha = 110 - wi * 4
                if alpha > 0:
                    mid.putpixel((wpx, wpy), c(wisp_color, alpha))

    mid_out = PARALLAX_DIR / "bg_parallax_oblivion_spire_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # -- NEAR LAYER: foreground void tendrils and luminescent particles --
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(220)

    # Foreground void tendrils creeping up from bottom
    for x in range(0, 320, 2):
        h = random.randint(12, 35)
        base_y = 175
        for y in range(base_y - h, base_y):
            if 0 <= y < 180:
                alpha = 150 - int((base_y - y) * 4)
                if alpha > 0:
                    near.putpixel((x, y), c(INDIGO_DARK, min(alpha, 170)))
                    if x + 1 < 320:
                        near.putpixel((x + 1, y), c(INDIGO_DARK, min(alpha, 170)))

    # Void tendril tips reaching upward
    for tx in range(10, 320, 30):
        th = random.randint(22, 50)
        for ty in range(th):
            py = 165 - ty
            px = tx + int(4 * math.sin(ty * 0.15))
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = max(0, 80 - ty * 2)
                if alpha > 0:
                    near.putpixel((px, py), c(INDIGO_DARK, alpha))

    # Bottom void energy glow
    nd.rectangle([0, 172, 319, 179], fill=c(GOLD_MED, 80))

    # Rising luminescent particles (gold and indigo)
    for _ in range(30):
        ax = random.randint(0, 319)
        ay = random.randint(20, 170)
        length = random.randint(3, 6)
        color_choice = random.choice([GOLD_GLOW, INDIGO_GLOW, RIFT_GOLD])
        for i in range(length):
            px = ax + i
            py = ay - i * 2
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = 130 - i * 20
                if alpha > 0:
                    near.putpixel((px, py), c(color_choice, alpha))

    # Reality spark particles (luminescent cracks in the air)
    for _ in range(30):
        wx = random.randint(0, 319)
        wy = random.randint(10, 155)
        color_choice = random.choice([GOLD_GLOW, INDIGO_GLOW, LUMI_CYAN, LUMI_PULSE])
        near.putpixel((wx, wy), c(color_choice, 160))
        if wx + 1 < 320:
            near.putpixel((wx + 1, wy), c(color_choice, 80))

    # Foreground floating crystal shards (dark silhouettes)
    for fx in range(15, 320, 55):
        fy = random.randint(10, 48)
        fw = random.randint(4, 10)
        fh = random.randint(2, 5)
        nd.rectangle([fx, fy, fx + fw, fy + fh], fill=c(SPIRE_MED, 70))
        nd.point((fx + fw // 2, fy), fill=c(SPIRE_LIGHT, 90))

    near_out = PARALLAX_DIR / "bg_parallax_oblivion_spire_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# =========================================================================
# MAIN
# =========================================================================

def main():
    print("Generating Oblivion Spire zone assets (PIX-218)...")
    print()

    print("[1/8] Void Sentinel enemy sprite sheet")
    generate_void_sentinel()
    print()

    print("[2/8] Reality Shard enemy sprite sheet")
    generate_reality_shard()
    print()

    print("[3/8] Oblivion Wraith enemy sprite sheet")
    generate_oblivion_wraith()
    print()

    print("[4/8] The Spire Keeper boss sprites (idle, attack, phases 1-3)")
    generate_spire_keeper()
    print()

    print("[5/8] Void Oracle NPC sprite")
    generate_void_oracle()
    print()

    print("[6/8] Oblivion Spire tileset (256x64)")
    generate_tileset()
    print()

    print("[7/8] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[8/8] Done! All Oblivion Spire zone assets generated.")


if __name__ == "__main__":
    main()
