#!/usr/bin/env python3
"""
Generate Frostpeak Highlands zone art assets for PixelRealm (PIX-170).
Produces:
  - 3 enemy sprite sheets   (128x16 each, 8 frames: 4 walk + 4 attack)
  - 1 boss (5 sheets)        idle 32x32, attack 128x32, phase1/2/3 32x32
  - 1 NPC quest giver        16x24
  - 1 tileset                256x64 (16 cols x 4 rows of 16x16 tiles)
  - 3 parallax backgrounds   320x180 each (far/mid/near)

All assets follow the 16x16 base pixel art style (SNES-era 32-color palette).
Frostpeak color language: icy blues, crisp whites, deep blue-blacks, pale lavender.
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
ANIMATED_DIR = ROOT / "assets" / "tiles" / "animated"

# ── Frostpeak Color Palette ──────────────────────────────────────────────────
# All colors from the 32-color master palette

# Ice blues
ICE_DEEP      = (10, 26, 58, 255)     # #0a1a3a — deep shadow blue
ICE_DARK      = (26, 74, 138, 255)    # #1a4a8a — dark ice
ICE_MED       = (42, 122, 192, 255)   # #2a7ac0 — medium ice
ICE_BRIGHT    = (80, 168, 232, 255)   # #50a8e8 — bright ice
ICE_PALE      = (144, 208, 248, 255)  # #90d0f8 — pale ice
ICE_WHITE     = (200, 240, 255, 255)  # #c8f0ff — near-white ice

# Neutral tones
SNOW_WHITE    = (240, 240, 240, 255)  # #f0f0f0
SNOW_GREY     = (150, 200, 200, 255)  # #96c8c8
STONE_DARK    = (43, 43, 43, 255)     # #2b2b2b
STONE_MED     = (74, 74, 74, 255)     # #4a4a4a
STONE_LIGHT   = (110, 110, 110, 255)  # #6e6e6e
BLACK         = (13, 13, 13, 255)     # #0d0d0d

# Accent colors
PURPLE_DARK   = (26, 10, 58, 255)     # #1a0a3a
PURPLE_MED    = (90, 32, 160, 255)    # #5a20a0
PURPLE_LIGHT  = (144, 80, 224, 255)   # #9050e0
LAVENDER      = (208, 144, 255, 255)  # #d090ff

# Warm accents (for eyes, magic effects)
GOLD          = (232, 184, 0, 255)    # #e8b800
YELLOW_BRIGHT = (255, 224, 64, 255)   # #ffe040
RED_DARK      = (90, 10, 10, 255)     # #5a0a0a
RED_MED       = (160, 16, 16, 255)    # #a01010

OUTLINE       = (10, 15, 30, 255)
TRANSPARENT   = (0, 0, 0, 0)

# ── Creature-specific palettes ───────────────────────────────────────────────

# Frost Elemental
ELEM_BODY     = ICE_MED
ELEM_CORE     = ICE_BRIGHT
ELEM_GLOW     = ICE_WHITE
ELEM_DARK     = ICE_DARK
ELEM_SHARD    = ICE_PALE
ELEM_EYE      = YELLOW_BRIGHT

# Snow Wolf
WOLF_FUR_DARK  = SNOW_GREY
WOLF_FUR_MED   = (180, 210, 220, 255)
WOLF_FUR_LIGHT = SNOW_WHITE
WOLF_BELLY     = (220, 230, 240, 255)
WOLF_NOSE      = STONE_DARK
WOLF_EYE       = (80, 168, 232, 255)
WOLF_FANG      = SNOW_WHITE

# Ice Archer
ARCHER_SKIN    = (180, 200, 220, 255)
ARCHER_SKIN_D  = (140, 165, 190, 255)
ARCHER_ARMOR   = ICE_DARK
ARCHER_ARMOR_L = ICE_MED
ARCHER_CAPE    = (60, 80, 120, 255)
ARCHER_HAIR    = ICE_PALE
ARCHER_BOW     = (100, 80, 50, 255)
ARCHER_ARROW   = ICE_WHITE
ARCHER_EYE     = ICE_BRIGHT

# Frost Titan boss
TITAN_BODY     = ICE_DARK
TITAN_ARMOR    = (30, 50, 80, 255)
TITAN_CRYSTAL  = ICE_BRIGHT
TITAN_GLOW     = ICE_WHITE
TITAN_EYE      = YELLOW_BRIGHT
TITAN_CROWN    = ICE_PALE
TITAN_DARK     = ICE_DEEP
TITAN_SKIN     = (60, 100, 150, 255)
TITAN_WEAPON   = STONE_LIGHT

# NPC: Mountain Sage
SAGE_ROBE      = (60, 80, 120, 255)
SAGE_ROBE_L    = (80, 105, 150, 255)
SAGE_SKIN      = (200, 180, 160, 255)
SAGE_SKIN_D    = (170, 150, 130, 255)
SAGE_HAIR      = SNOW_WHITE
SAGE_STAFF     = (100, 80, 50, 255)
SAGE_CRYSTAL   = ICE_BRIGHT
SAGE_BELT      = STONE_MED
SAGE_EYES      = STONE_DARK

# Tileset colors
TILE_SNOW      = SNOW_WHITE
TILE_SNOW_D    = SNOW_GREY
TILE_ICE       = ICE_PALE
TILE_ICE_D     = ICE_MED
TILE_ROCK      = STONE_MED
TILE_ROCK_D    = STONE_DARK
TILE_ROCK_L    = STONE_LIGHT
TILE_DARK_ICE  = ICE_DARK
TILE_WATER     = ICE_MED
TILE_WATER_D   = ICE_DEEP
TILE_PINE      = (26, 50, 26, 255)
TILE_PINE_L    = (45, 110, 45, 255)


def ensure_dir(path):
    os.makedirs(os.path.dirname(path) if isinstance(path, str) else path.parent, exist_ok=True)


def save_asset(img, rel_path):
    full_path = ASSET_ROOT / rel_path if isinstance(rel_path, str) else rel_path
    ensure_dir(full_path)
    img.save(str(full_path))
    print(f"  Created: {full_path.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# ══════════════════════════════════════════════════════════════════════════════
# ENEMY 1: FROST ELEMENTAL — floating ice crystal creature, 16x16, 8 frames
# Frames 0-3: float/pulse, Frames 4-7: attack (shard burst)
# ══════════════════════════════════════════════════════════════════════════════

def draw_frost_elemental(draw, ox, oy, frame):
    """Draw a single 16x16 Frost Elemental frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [0, -1, -2, -1][anim]
    pulse = [0, 1, 0, -1][anim]

    # Core crystal body — diamond shape
    cx, cy = 8, 8 + float_y
    # Inner core (bright)
    draw.point((ox + cx, oy + cy), fill=ELEM_GLOW)
    draw.point((ox + cx - 1, oy + cy), fill=ELEM_CORE)
    draw.point((ox + cx + 1, oy + cy), fill=ELEM_CORE)
    draw.point((ox + cx, oy + cy - 1), fill=ELEM_CORE)
    draw.point((ox + cx, oy + cy + 1), fill=ELEM_CORE)

    # Mid body
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            if abs(dx) + abs(dy) <= 2 and abs(dx) + abs(dy) > 1:
                draw.point((ox + cx + dx, oy + cy + dy), fill=ELEM_BODY)

    # Outer shell — diamond outline
    for dx in range(-3, 4):
        for dy in range(-3, 4):
            if abs(dx) + abs(dy) == 3:
                draw.point((ox + cx + dx, oy + cy + dy), fill=ELEM_DARK)

    # Crystal spikes (top, bottom, sides)
    draw.point((ox + cx, oy + cy - 4), fill=ELEM_SHARD)
    draw.point((ox + cx, oy + cy + 4), fill=ELEM_SHARD)
    draw.point((ox + cx - 4, oy + cy), fill=ELEM_SHARD)
    draw.point((ox + cx + 4, oy + cy), fill=ELEM_SHARD)
    # Diagonal shards
    draw.point((ox + cx - 3, oy + cy - 3 + pulse), fill=ELEM_SHARD)
    draw.point((ox + cx + 3, oy + cy - 3 + pulse), fill=ELEM_SHARD)

    # Eyes (two glowing dots)
    draw.point((ox + cx - 1, oy + cy - 1), fill=ELEM_EYE)
    draw.point((ox + cx + 1, oy + cy - 1), fill=ELEM_EYE)

    # Frost particles (rotating around body)
    particle_angles = [anim * 0.8, anim * 0.8 + 2.0, anim * 0.8 + 4.0]
    for angle in particle_angles:
        px = int(cx + 5 * math.cos(angle))
        py = int(cy + 5 * math.sin(angle) + float_y)
        if 0 <= px < 16 and 0 <= py < 16:
            draw.point((ox + px, oy + py), fill=ICE_PALE)

    # Attack: shard projectiles
    if is_attack:
        shard_ext = [0, 2, 4, 2][anim]
        if shard_ext > 0:
            for s in range(shard_ext):
                draw.point((ox + cx + 5 + s, oy + cy), fill=ELEM_SHARD)
                draw.point((ox + cx + 5 + s, oy + cy - 1), fill=ICE_PALE)
            # Impact sparkle
            if shard_ext >= 3:
                draw.point((ox + cx + 5 + shard_ext, oy + cy + 1), fill=ELEM_GLOW)


def generate_frost_elemental():
    """Generate 8-frame Frost Elemental sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_frost_elemental(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_frost_elemental.png")
    return img


# ══════════════════════════════════════════════════════════════════════════════
# ENEMY 2: SNOW WOLF — quadruped predator, 16x16, 8 frames
# Frames 0-3: walk/trot, Frames 4-7: attack (lunge + bite)
# ══════════════════════════════════════════════════════════════════════════════

def draw_snow_wolf(draw, ox, oy, frame):
    """Draw a single 16x16 Snow Wolf frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, -1, 0, -1][anim]
    lunge = [0, 1, 2, 1][anim] if is_attack else 0

    # Body (horizontal oval — wolf in profile)
    body_y = 7 + bob
    draw.rectangle([ox + 3 + lunge, oy + body_y, ox + 11 + lunge, oy + body_y + 3], fill=WOLF_FUR_MED)
    # Back/spine highlight
    draw.rectangle([ox + 4 + lunge, oy + body_y, ox + 10 + lunge, oy + body_y], fill=WOLF_FUR_LIGHT)
    # Belly
    draw.rectangle([ox + 5 + lunge, oy + body_y + 3, ox + 9 + lunge, oy + body_y + 3], fill=WOLF_BELLY)

    # Head
    head_x = 11 + lunge
    draw.rectangle([ox + head_x, oy + body_y - 1, ox + head_x + 3, oy + body_y + 2], fill=WOLF_FUR_MED)
    draw.rectangle([ox + head_x + 1, oy + body_y - 1, ox + head_x + 2, oy + body_y - 1], fill=WOLF_FUR_LIGHT)
    # Snout
    draw.point((ox + head_x + 3, oy + body_y + 1), fill=WOLF_FUR_DARK)
    draw.point((ox + head_x + 4, oy + body_y + 1), fill=WOLF_NOSE)
    # Eye
    draw.point((ox + head_x + 2, oy + body_y), fill=WOLF_EYE)
    # Ears
    draw.point((ox + head_x, oy + body_y - 2), fill=WOLF_FUR_DARK)
    draw.point((ox + head_x + 1, oy + body_y - 2), fill=WOLF_FUR_DARK)

    # Tail
    tail_wave = [0, 1, 0, -1][anim]
    draw.point((ox + 2 + lunge, oy + body_y - 1 + tail_wave), fill=WOLF_FUR_MED)
    draw.point((ox + 1 + lunge, oy + body_y - 2 + tail_wave), fill=WOLF_FUR_DARK)

    # Legs (4 legs, alternating walk)
    leg_y = body_y + 4
    # Front legs
    front_step = [0, 1, 0, -1][anim]
    draw.rectangle([ox + 9 + lunge + front_step, oy + leg_y, ox + 9 + lunge + front_step, oy + leg_y + 2], fill=WOLF_FUR_DARK)
    draw.rectangle([ox + 10 + lunge - front_step, oy + leg_y, ox + 10 + lunge - front_step, oy + leg_y + 2], fill=WOLF_FUR_DARK)
    # Back legs
    back_step = [0, -1, 0, 1][anim]
    draw.rectangle([ox + 4 + lunge + back_step, oy + leg_y, ox + 4 + lunge + back_step, oy + leg_y + 2], fill=WOLF_FUR_DARK)
    draw.rectangle([ox + 5 + lunge - back_step, oy + leg_y, ox + 5 + lunge - back_step, oy + leg_y + 2], fill=WOLF_FUR_DARK)

    # Attack: open jaws
    if is_attack and anim in (1, 2):
        draw.point((ox + head_x + 4, oy + body_y), fill=WOLF_FANG)
        draw.point((ox + head_x + 4, oy + body_y + 2), fill=WOLF_FANG)
        # Open mouth
        draw.point((ox + head_x + 3, oy + body_y + 2), fill=RED_DARK)

    # Breath mist in cold air
    if not is_attack and anim in (0, 2):
        draw.point((ox + head_x + 5, oy + body_y), fill=ICE_PALE)


def generate_snow_wolf():
    """Generate 8-frame Snow Wolf sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_snow_wolf(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_snow_wolf.png")
    return img


# ══════════════════════════════════════════════════════════════════════════════
# ENEMY 3: ICE ARCHER — humanoid frost archer, 16x16, 8 frames
# Frames 0-3: walk, Frames 4-7: attack (draw + shoot arrow)
# ══════════════════════════════════════════════════════════════════════════════

def draw_ice_archer(draw, ox, oy, frame):
    """Draw a single 16x16 Ice Archer frame."""
    is_attack = frame >= 4
    anim = frame % 4

    bob = [0, -1, 0, -1][anim]
    step = [0, 1, 0, -1][anim]

    # Legs
    draw.rectangle([ox + 6, oy + 12 + bob, ox + 6, oy + 14], fill=ARCHER_ARMOR)
    draw.rectangle([ox + 9, oy + 12 + bob, ox + 9, oy + 14], fill=ARCHER_ARMOR)
    # Feet
    draw.point((ox + 5 + step, oy + 15), fill=ARCHER_ARMOR)
    draw.point((ox + 6 + step, oy + 15), fill=ARCHER_ARMOR)
    draw.point((ox + 9 - step, oy + 15), fill=ARCHER_ARMOR)
    draw.point((ox + 10 - step, oy + 15), fill=ARCHER_ARMOR)

    # Torso (armored)
    draw.rectangle([ox + 5, oy + 7 + bob, ox + 10, oy + 12 + bob], fill=ARCHER_ARMOR)
    draw.rectangle([ox + 6, oy + 8 + bob, ox + 9, oy + 11 + bob], fill=ARCHER_ARMOR_L)

    # Cape (behind)
    cape_sway = [0, 1, 0, -1][anim]
    draw.rectangle([ox + 4, oy + 8 + bob, ox + 5, oy + 13 + bob + cape_sway], fill=ARCHER_CAPE)

    # Head
    draw.rectangle([ox + 6, oy + 3 + bob, ox + 9, oy + 7 + bob], fill=ARCHER_SKIN)
    draw.rectangle([ox + 7, oy + 4 + bob, ox + 8, oy + 6 + bob], fill=ARCHER_SKIN)
    # Hair
    draw.rectangle([ox + 6, oy + 2 + bob, ox + 9, oy + 4 + bob], fill=ARCHER_HAIR)
    draw.point((ox + 5, oy + 3 + bob), fill=ARCHER_HAIR)
    draw.point((ox + 10, oy + 3 + bob), fill=ARCHER_HAIR)
    # Eyes
    draw.point((ox + 7, oy + 5 + bob), fill=ARCHER_EYE)
    draw.point((ox + 9, oy + 5 + bob), fill=ARCHER_EYE)

    # Arms + bow
    if is_attack:
        # Drawing/shooting bow
        draw_phase = [0, 1, 2, 1][anim]  # pull back, full draw, release, follow-through
        # Left arm (holds bow)
        draw.rectangle([ox + 11, oy + 8 + bob, ox + 12, oy + 11 + bob], fill=ARCHER_SKIN_D)
        # Bow
        draw.point((ox + 13, oy + 7 + bob), fill=ARCHER_BOW)
        draw.rectangle([ox + 13, oy + 8 + bob, ox + 13, oy + 11 + bob], fill=ARCHER_BOW)
        draw.point((ox + 13, oy + 12 + bob), fill=ARCHER_BOW)
        # Bowstring
        draw.point((ox + 12, oy + 7 + bob), fill=SNOW_WHITE)
        draw.point((ox + 12 - draw_phase, oy + 9 + bob), fill=SNOW_WHITE)
        draw.point((ox + 12, oy + 12 + bob), fill=SNOW_WHITE)
        # Right arm (draws string)
        draw.rectangle([ox + 4, oy + 8 + bob, ox + 5, oy + 10 + bob], fill=ARCHER_SKIN_D)
        # Arrow
        if draw_phase >= 1:
            arrow_ext = [0, 0, 3, 5][anim]
            for ax in range(arrow_ext + 1):
                draw.point((ox + 13 + ax, oy + 9 + bob), fill=ARCHER_ARROW)
            # Arrowhead
            if arrow_ext > 0:
                draw.point((ox + 13 + arrow_ext + 1, oy + 9 + bob), fill=ICE_BRIGHT)
    else:
        # Walking — arms at sides
        draw.rectangle([ox + 4, oy + 8 + bob, ox + 5, oy + 11 + bob], fill=ARCHER_SKIN_D)
        draw.rectangle([ox + 10, oy + 8 + bob, ox + 11, oy + 11 + bob], fill=ARCHER_SKIN_D)
        # Bow on back
        draw.point((ox + 4, oy + 7 + bob), fill=ARCHER_BOW)
        draw.rectangle([ox + 3, oy + 8 + bob, ox + 3, oy + 11 + bob], fill=ARCHER_BOW)
        draw.point((ox + 4, oy + 12 + bob), fill=ARCHER_BOW)


def generate_ice_archer():
    """Generate 8-frame Ice Archer sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_ice_archer(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_ice_archer.png")
    return img


# ══════════════════════════════════════════════════════════════════════════════
# BOSS: FROST TITAN — massive ice golem, 32x32, multi-phase
# idle (1 frame), attack (4 frames), phase1/2/3 (1 frame each)
# ══════════════════════════════════════════════════════════════════════════════

def draw_frost_titan(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw the Frost Titan boss at 32x32."""
    anim = frame % 4
    breath = [0, -1, 0, 1][anim]

    # Phase color shifts
    body = TITAN_BODY
    crystal = TITAN_CRYSTAL
    glow = TITAN_GLOW
    crown = TITAN_CROWN
    if phase == 2:
        body = (20, 60, 120, 255)
        crystal = ICE_PALE
        glow = (220, 245, 255, 255)
    elif phase == 3:
        body = (15, 40, 100, 255)
        crystal = LAVENDER
        glow = (230, 200, 255, 255)
        crown = LAVENDER

    outline = OUTLINE

    # Legs — massive pillars
    draw.rectangle([ox + 8, oy + 24 + breath, ox + 13, oy + 30], fill=body)
    draw.rectangle([ox + 19, oy + 24 + breath, ox + 24, oy + 30], fill=body)
    # Feet
    draw.rectangle([ox + 7, oy + 29, ox + 14, oy + 31], fill=TITAN_DARK)
    draw.rectangle([ox + 18, oy + 29, ox + 25, oy + 31], fill=TITAN_DARK)
    # Knee crystals
    draw.point((ox + 10, oy + 26 + breath), fill=crystal)
    draw.point((ox + 22, oy + 26 + breath), fill=crystal)

    # Torso — broad chest
    draw.rectangle([ox + 8, oy + 14 + breath, ox + 24, oy + 24 + breath], fill=body)
    draw.rectangle([ox + 9, oy + 15 + breath, ox + 23, oy + 23 + breath], fill=TITAN_ARMOR)
    # Chest crystal
    draw.rectangle([ox + 14, oy + 17 + breath, ox + 18, oy + 21 + breath], fill=crystal)
    draw.rectangle([ox + 15, oy + 18 + breath, ox + 17, oy + 20 + breath], fill=glow)

    # Shoulders — ice pauldrons
    draw.rectangle([ox + 5, oy + 13 + breath, ox + 9, oy + 17 + breath], fill=TITAN_ARMOR)
    draw.rectangle([ox + 23, oy + 13 + breath, ox + 27, oy + 17 + breath], fill=TITAN_ARMOR)
    # Shoulder crystals
    draw.point((ox + 6, oy + 13 + breath), fill=crystal)
    draw.point((ox + 7, oy + 12 + breath), fill=crystal)
    draw.point((ox + 26, oy + 13 + breath), fill=crystal)
    draw.point((ox + 25, oy + 12 + breath), fill=crystal)

    # Head
    draw.rectangle([ox + 11, oy + 7 + breath, ox + 21, oy + 14 + breath], fill=body)
    draw.rectangle([ox + 12, oy + 8 + breath, ox + 20, oy + 13 + breath], fill=TITAN_SKIN)

    # Crown of ice crystals
    draw.point((ox + 11, oy + 5 + breath), fill=crown)
    draw.point((ox + 13, oy + 4 + breath), fill=crown)
    draw.point((ox + 16, oy + 3 + breath), fill=crown)
    draw.point((ox + 19, oy + 4 + breath), fill=crown)
    draw.point((ox + 21, oy + 5 + breath), fill=crown)
    # Crown connectors
    draw.point((ox + 12, oy + 6 + breath), fill=crown)
    draw.point((ox + 14, oy + 5 + breath), fill=crown)
    draw.point((ox + 15, oy + 4 + breath), fill=crown)
    draw.point((ox + 17, oy + 4 + breath), fill=crown)
    draw.point((ox + 18, oy + 5 + breath), fill=crown)
    draw.point((ox + 20, oy + 6 + breath), fill=crown)

    # Eyes (glowing)
    draw.rectangle([ox + 13, oy + 9 + breath, ox + 14, oy + 10 + breath], fill=TITAN_EYE)
    draw.rectangle([ox + 18, oy + 9 + breath, ox + 19, oy + 10 + breath], fill=TITAN_EYE)

    # Mouth
    if is_attack and anim in (1, 2):
        # Roaring — frost breath
        draw.rectangle([ox + 14, oy + 11 + breath, ox + 18, oy + 12 + breath], fill=outline)
        draw.point((ox + 15, oy + 12 + breath), fill=ICE_PALE)
        draw.point((ox + 17, oy + 12 + breath), fill=ICE_PALE)
        # Frost breath particles
        for bx in range(1, 4):
            draw.point((ox + 16, oy + 13 + breath + bx), fill=ICE_PALE)
    else:
        draw.rectangle([ox + 15, oy + 11 + breath, ox + 17, oy + 11 + breath], fill=outline)

    # Arms
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        # Smashing arms down / ice slam
        attack_ext = [0, 2, 4, 2][anim]
        # Left arm — raises then slams
        draw.rectangle([ox + 3, oy + 14 + breath - attack_ext, ox + 7, oy + 20 + breath], fill=body)
        draw.point((ox + 3, oy + 14 + breath - attack_ext), fill=TITAN_WEAPON)
        draw.point((ox + 4, oy + 13 + breath - attack_ext), fill=TITAN_WEAPON)
        # Right arm
        draw.rectangle([ox + 25, oy + 14 + breath - attack_ext, ox + 29, oy + 20 + breath], fill=body)
        draw.point((ox + 29, oy + 14 + breath - attack_ext), fill=TITAN_WEAPON)
        draw.point((ox + 28, oy + 13 + breath - attack_ext), fill=TITAN_WEAPON)
        # Ground impact effect
        if attack_ext >= 3:
            for ix in range(4, 28, 3):
                draw.point((ox + ix, oy + 30), fill=ICE_PALE)
                draw.point((ox + ix, oy + 31), fill=ICE_WHITE)
    else:
        # Idle arms
        draw.rectangle([ox + 4, oy + 16 + breath + arm_wave, ox + 8, oy + 23 + breath + arm_wave], fill=body)
        draw.rectangle([ox + 24, oy + 16 + breath + arm_wave, ox + 28, oy + 23 + breath + arm_wave], fill=body)
        # Fists
        draw.rectangle([ox + 3, oy + 22 + breath + arm_wave, ox + 7, oy + 24 + breath + arm_wave], fill=TITAN_SKIN)
        draw.rectangle([ox + 25, oy + 22 + breath + arm_wave, ox + 29, oy + 24 + breath + arm_wave], fill=TITAN_SKIN)

    # Phase-specific effects
    if phase >= 2:
        # Ice aura particles
        aura_pos = [(4, 10), (28, 12), (6, 6), (26, 8)]
        for i, (ax, ay) in enumerate(aura_pos):
            if (anim + i) % 3 == 0:
                draw.point((ox + ax, oy + ay + breath), fill=ICE_PALE)

    if phase == 3:
        # Blizzard particles around base
        for tx in range(3, 29, 3):
            ty = 28 + (anim + tx) % 4
            if ty < 32:
                draw.point((ox + tx, oy + ty), fill=(ICE_PALE[0], ICE_PALE[1], ICE_PALE[2], 160))
        # Crown radiates
        draw.point((ox + 16, oy + 2 + breath), fill=glow)
        draw.point((ox + 15, oy + 2 + breath), fill=crystal)
        draw.point((ox + 17, oy + 2 + breath), fill=crystal)


def generate_frost_titan():
    """Generate all Frost Titan boss sprite sheets."""
    # Idle — single 32x32 frame
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_frost_titan(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_frost_titan_idle.png")

    # Attack — 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        draw_frost_titan(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_frost_titan_attack.png")

    # Phase 1 — single frame
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_frost_titan(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_frost_titan_phase1.png")

    # Phase 2 — intensified ice
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_frost_titan(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_frost_titan_phase2.png")

    # Phase 3 — blizzard aura
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_frost_titan(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_frost_titan_phase3.png")


# ══════════════════════════════════════════════════════════════════════════════
# NPC: MOUNTAIN SAGE — zone quest giver, 16x24
# Robed elder with ice staff and warm furs
# ══════════════════════════════════════════════════════════════════════════════

def draw_mountain_sage(draw, ox, oy):
    """Draw the Mountain Sage NPC at 16x24."""
    # Feet / boots (fur-lined)
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=STONE_DARK)
    draw.point((ox + 5, oy + 21), fill=WOLF_FUR_MED)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=STONE_DARK)
    draw.point((ox + 11, oy + 21), fill=WOLF_FUR_MED)

    # Robe (long, heavy winter robe)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=SAGE_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=SAGE_ROBE_L)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=SAGE_ROBE)
    # Fur trim at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 18], fill=WOLF_FUR_MED)

    # Belt
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=SAGE_BELT)
    # Crystal pendant
    draw.point((ox + 8, oy + 15), fill=SAGE_CRYSTAL)
    draw.point((ox + 8, oy + 16), fill=ICE_PALE)

    # Arms (in robe sleeves)
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=SAGE_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=SAGE_ROBE)
    # Fur cuffs
    draw.point((ox + 2, oy + 16), fill=WOLF_FUR_MED)
    draw.point((ox + 14, oy + 16), fill=WOLF_FUR_MED)
    # Hands
    draw.point((ox + 2, oy + 17), fill=SAGE_SKIN)
    draw.point((ox + 14, oy + 17), fill=SAGE_SKIN)

    # Staff (held in right hand)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=SAGE_STAFF)
    # Staff ice crystal on top
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=SAGE_CRYSTAL)
    draw.point((ox + 14, oy + 1), fill=ICE_PALE)
    draw.point((ox + 14, oy + 2), fill=ICE_WHITE)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=SAGE_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=SAGE_SKIN)

    # Hair (white, long — old mountain sage)
    draw.rectangle([ox + 5, oy + 3, ox + 11, oy + 5], fill=SAGE_HAIR)
    draw.point((ox + 4, oy + 5), fill=SAGE_HAIR)
    draw.point((ox + 4, oy + 6), fill=SAGE_HAIR)
    draw.point((ox + 12, oy + 5), fill=SAGE_HAIR)
    draw.point((ox + 12, oy + 6), fill=SAGE_HAIR)

    # Hood (fur-lined, pulled back)
    draw.rectangle([ox + 4, oy + 2, ox + 12, oy + 4], fill=SAGE_ROBE)
    draw.rectangle([ox + 5, oy + 1, ox + 11, oy + 3], fill=SAGE_ROBE)
    # Fur trim on hood
    draw.point((ox + 4, oy + 4), fill=WOLF_FUR_MED)
    draw.point((ox + 12, oy + 4), fill=WOLF_FUR_MED)

    # Face details
    # Eyes
    draw.point((ox + 7, oy + 6), fill=SAGE_EYES)
    draw.point((ox + 9, oy + 6), fill=SAGE_EYES)
    # Beard (long, white)
    draw.point((ox + 7, oy + 9), fill=SAGE_HAIR)
    draw.point((ox + 8, oy + 9), fill=SAGE_HAIR)
    draw.point((ox + 9, oy + 9), fill=SAGE_HAIR)
    draw.point((ox + 8, oy + 10), fill=SAGE_HAIR)
    draw.point((ox + 7, oy + 10), fill=SAGE_HAIR)
    draw.point((ox + 9, oy + 10), fill=SAGE_HAIR)


def generate_mountain_sage():
    """Generate Mountain Sage NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_mountain_sage(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_frostpeak.png")
    return img


# ══════════════════════════════════════════════════════════════════════════════
# TILESET — tileset_frostpeak.png (256x64, 16 cols x 4 rows)
# ══════════════════════════════════════════════════════════════════════════════

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


# ── Individual tile functions ────────────────────────────────────────────────

def tile_snow_ground(tile):
    """Plain snow ground."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_SNOW)
    # Subtle texture
    random.seed(random.getstate()[1][0])
    for _ in range(4):
        x, y = random.randint(0, 15), random.randint(0, 15)
        d.point((x, y), fill=TILE_SNOW_D)


def tile_snow_light(tile):
    """Light snow with sparkles."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_SNOW)
    for x in range(0, 16, 4):
        for y in range(0, 16, 4):
            d.point((x + 1, y + 1), fill=ICE_WHITE)


def tile_ice_surface(tile):
    """Frozen ice surface."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ICE)
    # Cracks
    d.line([(2, 4), (8, 6), (14, 3)], fill=TILE_ICE_D, width=1)
    d.line([(5, 12), (10, 10)], fill=TILE_ICE_D, width=1)
    # Sheen
    d.point((4, 2), fill=ICE_WHITE)
    d.point((11, 8), fill=ICE_WHITE)


def tile_deep_ice(tile):
    """Deep/thick ice."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_DARK_ICE)
    # Frozen bubbles
    d.point((4, 6), fill=TILE_ICE)
    d.point((10, 3), fill=TILE_ICE)
    d.point((7, 11), fill=TILE_ICE)
    d.point((12, 13), fill=TILE_ICE_D)


def tile_frozen_water(tile):
    """Frozen water with visible water underneath."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_WATER)
    # Ice surface layer on top
    d.rectangle([0, 0, 15, 4], fill=TILE_ICE)
    d.line([(1, 3), (7, 2), (14, 4)], fill=TILE_ICE_D, width=1)


def tile_snow_rock(tile):
    """Snow-covered rock."""
    d = ImageDraw.Draw(tile)
    # Rock base
    d.rectangle([0, 0, 15, 15], fill=TILE_ROCK)
    d.rectangle([1, 1, 14, 14], fill=TILE_ROCK_L)
    # Snow on top
    d.rectangle([0, 0, 15, 6], fill=TILE_SNOW)
    d.point((2, 7), fill=TILE_SNOW)
    d.point((8, 7), fill=TILE_SNOW)
    d.point((13, 7), fill=TILE_SNOW)


def tile_bare_rock(tile):
    """Exposed mountain rock."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_ROCK)
    # Texture
    d.point((3, 5), fill=TILE_ROCK_L)
    d.point((8, 3), fill=TILE_ROCK_D)
    d.point((12, 9), fill=TILE_ROCK_L)
    d.point((5, 12), fill=TILE_ROCK_D)
    d.rectangle([6, 7, 10, 10], fill=TILE_ROCK_D)


def tile_ice_crystal(tile):
    """Crystal formation growing from ground."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TRANSPARENT)
    # Base snow
    d.rectangle([0, 12, 15, 15], fill=TILE_SNOW)
    # Crystal shards
    d.rectangle([6, 4, 9, 12], fill=ICE_MED)
    d.rectangle([7, 2, 8, 11], fill=ICE_BRIGHT)
    d.point((7, 1), fill=ICE_PALE)
    # Small shard left
    d.rectangle([3, 7, 5, 12], fill=ICE_MED)
    d.point((4, 6), fill=ICE_PALE)
    # Small shard right
    d.rectangle([11, 8, 13, 12], fill=ICE_MED)
    d.point((12, 7), fill=ICE_PALE)


def tile_pine_tree(tile):
    """Snow-covered pine tree (top part)."""
    d = ImageDraw.Draw(tile)
    # Trunk
    d.rectangle([7, 10, 8, 15], fill=(60, 40, 20, 255))
    # Canopy layers with snow
    d.rectangle([4, 6, 11, 10], fill=TILE_PINE)
    d.rectangle([5, 3, 10, 7], fill=TILE_PINE)
    d.rectangle([6, 1, 9, 4], fill=TILE_PINE)
    # Snow on branches
    d.rectangle([4, 6, 11, 6], fill=TILE_SNOW)
    d.rectangle([5, 3, 10, 3], fill=TILE_SNOW)
    d.rectangle([6, 1, 9, 1], fill=TILE_SNOW)
    d.point((7, 0), fill=TILE_SNOW)


def tile_pine_tree_top(tile):
    """Pine tree top (for tall trees spanning 2 tiles)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([6, 8, 9, 15], fill=TILE_PINE)
    d.rectangle([5, 5, 10, 10], fill=TILE_PINE)
    d.rectangle([6, 2, 9, 7], fill=TILE_PINE)
    d.point((7, 1), fill=TILE_PINE_L)
    d.point((8, 1), fill=TILE_PINE_L)
    # Snow caps
    d.rectangle([5, 5, 10, 5], fill=TILE_SNOW)
    d.rectangle([6, 2, 9, 2], fill=TILE_SNOW)


def tile_snow_edge_n(tile):
    """Snow-to-ice transition (north edge)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 7], fill=TILE_SNOW)
    d.rectangle([0, 8, 15, 15], fill=TILE_ICE)
    d.point((3, 8), fill=TILE_SNOW)
    d.point((9, 7), fill=TILE_ICE)


def tile_snow_edge_s(tile):
    """Snow-to-ice transition (south edge)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 7], fill=TILE_ICE)
    d.rectangle([0, 8, 15, 15], fill=TILE_SNOW)
    d.point((5, 8), fill=TILE_ICE)
    d.point((11, 7), fill=TILE_SNOW)


def tile_snow_edge_w(tile):
    """Snow-to-ice transition (west edge)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 7, 15], fill=TILE_SNOW)
    d.rectangle([8, 0, 15, 15], fill=TILE_ICE)


def tile_snow_edge_e(tile):
    """Snow-to-ice transition (east edge)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 7, 15], fill=TILE_ICE)
    d.rectangle([8, 0, 15, 15], fill=TILE_SNOW)


def tile_icicle(tile):
    """Hanging icicles (for cave/cliff overhangs)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 3], fill=TILE_ROCK)
    # Icicles hanging down
    for ix in [2, 5, 8, 11, 14]:
        length = random.randint(4, 10)
        for iy in range(4, 4 + length):
            if iy < 16:
                d.point((ix, iy), fill=ICE_PALE)
        if 4 + length < 16:
            d.point((ix, 4 + length), fill=ICE_WHITE)


def tile_snow_path(tile):
    """Packed snow path (slightly darker)."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_SNOW_D)
    # Footprint indentations
    d.point((4, 4), fill=TILE_ICE)
    d.point((4, 5), fill=TILE_ICE)
    d.point((10, 9), fill=TILE_ICE)
    d.point((10, 10), fill=TILE_ICE)


def tile_frozen_bush(tile):
    """Frozen bush/shrub."""
    d = ImageDraw.Draw(tile)
    # Snow ground
    d.rectangle([0, 12, 15, 15], fill=TILE_SNOW)
    # Bush shape
    d.rectangle([3, 6, 12, 12], fill=(30, 50, 35, 255))
    d.rectangle([4, 5, 11, 11], fill=TILE_PINE)
    # Frost coating
    d.point((5, 5), fill=ICE_PALE)
    d.point((8, 4), fill=ICE_PALE)
    d.point((10, 5), fill=ICE_PALE)
    d.rectangle([3, 6, 12, 6], fill=TILE_SNOW)


def tile_snow_variant1(tile):
    """Snow ground variant 1."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_SNOW)
    d.point((5, 3), fill=TILE_SNOW_D)
    d.point((11, 8), fill=TILE_SNOW_D)
    d.point((2, 12), fill=TILE_SNOW_D)


def tile_snow_variant2(tile):
    """Snow ground variant 2."""
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, 15, 15], fill=TILE_SNOW)
    d.point((3, 7), fill=ICE_WHITE)
    d.point((9, 2), fill=ICE_WHITE)
    d.point((13, 11), fill=TILE_SNOW_D)


def generate_tileset():
    """Generate the main tileset_frostpeak.png (256x64)."""
    random.seed(170)  # Deterministic for PIX-170
    img = Image.new("RGBA", (256, 64), TRANSPARENT)

    # Row 0: Ground tiles (16 tiles)
    row0 = [
        tile_snow_ground, tile_snow_light, tile_ice_surface, tile_deep_ice,
        tile_frozen_water, tile_snow_rock, tile_bare_rock, tile_snow_path,
        tile_snow_variant1, tile_snow_variant2, tile_snow_edge_n, tile_snow_edge_s,
        tile_snow_edge_w, tile_snow_edge_e, tile_ice_surface, tile_snow_ground,
    ]
    for i, fn in enumerate(row0):
        random.seed(170 + i)
        draw_tile(img, i, 0, fn)

    # Row 1: Terrain features
    row1 = [
        tile_pine_tree, tile_pine_tree_top, tile_ice_crystal, tile_icicle,
        tile_frozen_bush, tile_snow_rock, tile_bare_rock, tile_snow_path,
        tile_snow_ground, tile_snow_light, tile_ice_surface, tile_deep_ice,
        tile_snow_variant1, tile_snow_variant2, tile_snow_ground, tile_snow_ground,
    ]
    for i, fn in enumerate(row1):
        random.seed(170 + 100 + i)
        draw_tile(img, i, 1, fn)

    # Row 2: Edge transitions + decorations
    row2 = [
        tile_snow_edge_n, tile_snow_edge_s, tile_snow_edge_w, tile_snow_edge_e,
        tile_ice_surface, tile_ice_surface, tile_deep_ice, tile_deep_ice,
        tile_snow_ground, tile_snow_light, tile_snow_rock, tile_bare_rock,
        tile_frozen_water, tile_frozen_bush, tile_icicle, tile_ice_crystal,
    ]
    for i, fn in enumerate(row2):
        random.seed(170 + 200 + i)
        draw_tile(img, i, 2, fn)

    # Row 3: More variants
    row3 = [
        tile_ice_crystal, tile_frozen_bush, tile_pine_tree, tile_pine_tree_top,
        tile_icicle, tile_snow_rock, tile_bare_rock, tile_snow_path,
        tile_snow_edge_n, tile_snow_edge_s, tile_snow_edge_w, tile_snow_edge_e,
        tile_snow_variant1, tile_snow_variant2, tile_snow_ground, tile_frozen_water,
    ]
    for i, fn in enumerate(row3):
        random.seed(170 + 300 + i)
        draw_tile(img, i, 3, fn)

    random.seed(170)
    out = TILESETS_DIR / "tileset_frostpeak.png"
    ensure_dir(out)
    img.save(str(out))
    print(f"  Created: {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


# ══════════════════════════════════════════════════════════════════════════════
# PARALLAX BACKGROUNDS — 320x180, three layers (far/mid/near)
# ══════════════════════════════════════════════════════════════════════════════

def generate_parallax():
    """Three parallax layers for Frostpeak Highlands zone."""
    ensure_dir(PARALLAX_DIR / "dummy")

    # ── FAR LAYER: sky gradient with distant mountain silhouettes ──
    far = Image.new("RGBA", (320, 180), ICE_DEEP)
    fd = ImageDraw.Draw(far)
    # Sky gradient (top = deep dark blue, bottom = pale ice blue)
    for y in range(180):
        ratio = y / 180
        r = int(ICE_DEEP[0] * (1 - ratio) + ICE_DARK[0] * ratio)
        g = int(ICE_DEEP[1] * (1 - ratio) + ICE_DARK[1] * ratio)
        b = int(ICE_DEEP[2] * (1 - ratio) + ICE_DARK[2] * ratio)
        fd.line([(0, y), (319, y)], fill=(r, g, b, 255))

    # Stars in upper sky
    random.seed(170)
    for _ in range(30):
        sx, sy = random.randint(0, 319), random.randint(0, 80)
        fd.point((sx, sy), fill=SNOW_WHITE)

    # Distant mountain silhouettes
    mountain_peaks = [(40, 60), (90, 45), (140, 55), (200, 40), (260, 50), (310, 58)]
    for mx, peak_y in mountain_peaks:
        width = random.randint(30, 50)
        for x in range(mx - width, mx + width):
            if 0 <= x < 320:
                # Triangle mountain shape
                dist = abs(x - mx)
                height = int((1 - dist / width) * (130 - peak_y))
                top_y = 130 - height
                if top_y < 130:
                    fd.line([(x, top_y), (x, 130)], fill=c(STONE_DARK))
                    # Snow cap on upper portion
                    snow_line = top_y + height // 3
                    if top_y < snow_line:
                        fd.line([(x, top_y), (x, snow_line)], fill=c(SNOW_GREY))

    # Ground below mountains
    fd.rectangle([0, 130, 319, 179], fill=c(STONE_DARK))

    far_out = PARALLAX_DIR / "bg_parallax_frostpeak_far.png"
    far.save(str(far_out))
    print(f"  Created: {far_out.relative_to(ROOT)}")

    # ── MID LAYER: closer mountain detail, pine trees, snowdrifts ──
    mid = Image.new("RGBA", (320, 180), TRANSPARENT)
    md = ImageDraw.Draw(mid)
    random.seed(171)

    # Closer mountain range
    for mx in range(0, 320, 40):
        peak_y = random.randint(40, 70)
        width = random.randint(25, 40)
        for x in range(mx - width, mx + width):
            if 0 <= x < 320:
                dist = abs(x - mx)
                height = int((1 - dist / width) * (140 - peak_y))
                top_y = 140 - height
                if top_y < 140:
                    md.line([(x, top_y), (x, 140)], fill=c(STONE_MED))
                    # Snow coverage
                    snow_line = top_y + height // 4
                    if top_y < snow_line:
                        md.line([(x, top_y), (x, snow_line)], fill=c(TILE_SNOW))

    # Pine tree silhouettes
    for tx in range(10, 320, 25):
        h = random.randint(30, 55)
        base_y = 145
        trunk_x = tx + random.randint(-3, 3)
        # Trunk
        md.rectangle([trunk_x, base_y - h, trunk_x + 2, base_y], fill=c(STONE_DARK))
        # Triangular canopy layers
        for layer in range(3):
            ly = base_y - h + layer * 8
            layer_width = 4 + layer * 3
            md.rectangle([trunk_x - layer_width, ly, trunk_x + 2 + layer_width, ly + 10],
                         fill=c(TILE_PINE))
            # Snow on each layer
            md.rectangle([trunk_x - layer_width, ly, trunk_x + 2 + layer_width, ly + 2],
                         fill=c(TILE_SNOW))

    # Snowdrift ground
    md.rectangle([0, 145, 319, 179], fill=c(TILE_SNOW_D))
    # Snow texture
    for y in range(150, 180):
        for x in range(0, 320, 3):
            if random.random() < 0.15:
                mid.putpixel((x, y), c(TILE_SNOW))

    mid_out = PARALLAX_DIR / "bg_parallax_frostpeak_mid.png"
    mid.save(str(mid_out))
    print(f"  Created: {mid_out.relative_to(ROOT)}")

    # ── NEAR LAYER: foreground snow, ice crystals, blowing snow ──
    near = Image.new("RGBA", (320, 180), TRANSPARENT)
    nd = ImageDraw.Draw(near)
    random.seed(172)

    # Foreground snowdrifts at bottom
    for x in range(0, 320, 2):
        h = random.randint(10, 30)
        base_y = 175
        for y in range(base_y - h, base_y):
            if 0 <= y < 180:
                near.putpixel((x, y), c(TILE_SNOW))
                if x + 1 < 320:
                    near.putpixel((x + 1, y), c(TILE_SNOW))
        # Snow sparkles on top
        if base_y - h >= 0 and base_y - h < 180:
            near.putpixel((x, base_y - h), c(ICE_WHITE))

    # Ground
    nd.rectangle([0, 170, 319, 179], fill=c(TILE_SNOW))

    # Ice crystal formations in foreground
    for cx_pos in range(20, 320, 60):
        crystal_h = random.randint(15, 30)
        base = 168
        # Main crystal
        for dy in range(crystal_h):
            width = max(1, int(3 * (1 - dy / crystal_h)))
            for dx in range(-width, width + 1):
                px, py = cx_pos + dx, base - dy
                if 0 <= px < 320 and 0 <= py < 180:
                    near.putpixel((px, py), c(ICE_PALE))
        # Crystal tip
        tip_y = base - crystal_h
        if 0 <= tip_y < 180:
            near.putpixel((cx_pos, tip_y), c(ICE_WHITE))

    # Blowing snow particles (diagonal streaks)
    for _ in range(40):
        sx = random.randint(0, 319)
        sy = random.randint(0, 140)
        length = random.randint(3, 8)
        for i in range(length):
            px = sx + i
            py = sy + i // 2
            if 0 <= px < 320 and 0 <= py < 180:
                alpha = 180 - i * 20
                if alpha > 0:
                    near.putpixel((px, py), c(TILE_SNOW, alpha))

    # Hanging icicles from top edge
    for ix in range(5, 320, 15):
        icicle_len = random.randint(8, 20)
        for iy in range(icicle_len):
            if iy < 180:
                width = max(0, 2 - iy // 5)
                for dx in range(-width, width + 1):
                    px = ix + dx
                    if 0 <= px < 320:
                        near.putpixel((px, iy), c(ICE_PALE))
        if icicle_len < 180:
            near.putpixel((ix, icicle_len), c(ICE_WHITE))

    near_out = PARALLAX_DIR / "bg_parallax_frostpeak_near.png"
    near.save(str(near_out))
    print(f"  Created: {near_out.relative_to(ROOT)}")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("Generating Frostpeak Highlands zone assets (PIX-170)...")
    print()

    print("[1/8] Frost Elemental enemy sprite sheet")
    generate_frost_elemental()
    print()

    print("[2/8] Snow Wolf enemy sprite sheet")
    generate_snow_wolf()
    print()

    print("[3/8] Ice Archer enemy sprite sheet")
    generate_ice_archer()
    print()

    print("[4/8] Frost Titan boss sprites (idle, attack, phases 1-3)")
    generate_frost_titan()
    print()

    print("[5/8] Mountain Sage NPC sprite")
    generate_mountain_sage()
    print()

    print("[6/8] Frostpeak tileset (256x64)")
    generate_tileset()
    print()

    print("[7/8] Parallax backgrounds (far/mid/near)")
    generate_parallax()
    print()

    print("[8/8] Done! All Frostpeak Highlands zone assets generated.")


if __name__ == "__main__":
    main()
