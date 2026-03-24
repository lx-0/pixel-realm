#!/usr/bin/env python3
"""Generate Volcanic Highlands zone creature and character sprites for PixelRealm.

Produces:
  - char_enemy_lava_slime.png   (128x16: 8 frames x 16x16 — 4 walk + 4 attack)
  - char_enemy_magma_golem.png  (128x16: 8 frames x 16x16 — 4 walk + 4 attack)
  - char_enemy_fire_imp.png     (128x16: 8 frames x 16x16 — 4 walk + 4 attack)
  - boss_infernal_warden_idle.png    (128x32: 4 frames x 32x32)
  - boss_infernal_warden_attack.png  (128x32: 4 frames x 32x32)
  - boss_infernal_warden_phase1.png  (32x32: single frame)
  - boss_infernal_warden_phase2.png  (32x32: single frame)
  - boss_infernal_warden_phase3.png  (32x32: single frame)
  - char_npc_volcanic_researcher.png (32x24: 2-frame idle)

All colors from the 32-color master palette (ART-STYLE-GUIDE.md).
Fire/lava color language: red/orange per GDD color guide.
"""

import os
import sys
import math
import random
from pathlib import Path

sys.path.insert(0, "/tmp/pylibs")
from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# Master palette (from ART-STYLE-GUIDE.md)
# ---------------------------------------------------------------------------
PAL = {
    "shadow_black":   (0x0d, 0x0d, 0x0d),
    "dark_rock":      (0x2b, 0x2b, 0x2b),
    "stone_gray":     (0x4a, 0x4a, 0x4a),
    "mid_gray":       (0x6e, 0x6e, 0x6e),
    "light_stone":    (0x96, 0x96, 0x96),
    "pale_gray":      (0xc8, 0xc8, 0xc8),
    "near_white":     (0xf0, 0xf0, 0xf0),
    "deep_soil":      (0x3b, 0x20, 0x10),
    "rich_earth":     (0x6b, 0x3a, 0x1f),
    "dirt":           (0x8b, 0x5c, 0x2a),
    "sand":           (0xb8, 0x84, 0x3f),
    "desert_gold":    (0xd4, 0xa8, 0x5a),
    "pale_sand":      (0xe8, 0xd0, 0x8a),
    "deep_forest":    (0x1a, 0x3a, 0x1a),
    "forest_green":   (0x2d, 0x6e, 0x2d),
    "leaf_green":     (0x4c, 0x9b, 0x4c),
    "bright_grass":   (0x78, 0xc8, 0x78),
    "light_foliage":  (0xa8, 0xe4, 0xa0),
    "deep_ocean":     (0x0a, 0x1a, 0x3a),
    "ocean_blue":     (0x1a, 0x4a, 0x8a),
    "sky_blue":       (0x2a, 0x7a, 0xc0),
    "player_blue":    (0x50, 0xa8, 0xe8),
    "pale_water":     (0x90, 0xd0, 0xf8),
    "shimmer":        (0xc8, 0xf0, 0xff),
    "deep_blood":     (0x5a, 0x0a, 0x0a),
    "enemy_red":      (0xa0, 0x10, 0x10),
    "bright_red":     (0xd4, 0x20, 0x20),
    "fire_orange":    (0xf0, 0x60, 0x20),
    "ember":          (0xf8, 0xa0, 0x60),
    "dark_gold":      (0xa8, 0x70, 0x00),
    "gold":           (0xe8, 0xb8, 0x00),
    "bright_yellow":  (0xff, 0xe0, 0x40),
    "pale_highlight": (0xff, 0xf8, 0xa0),
    "deep_magic":     (0x1a, 0x0a, 0x3a),
    "magic_purple":   (0x5a, 0x20, 0xa0),
    "mana_violet":    (0x90, 0x50, 0xe0),
    "spell_glow":     (0xd0, 0x90, 0xff),
}

# Volcanic palette shortcuts
LAVA_CORE    = PAL["bright_yellow"]
LAVA_HOT     = PAL["gold"]
LAVA_BRIGHT  = PAL["fire_orange"]
LAVA_MED     = PAL["bright_red"]
LAVA_DARK    = PAL["enemy_red"]
LAVA_DEEP    = PAL["deep_blood"]
EMBER        = PAL["ember"]
ROCK_DARK    = PAL["shadow_black"]
ROCK_MED     = PAL["dark_rock"]
ROCK_LIGHT   = PAL["stone_gray"]
ROCK_PALE    = PAL["mid_gray"]
HIGHLIGHT    = PAL["pale_highlight"]

TRANSPARENT = (0, 0, 0, 0)

# Project paths
ROOT = Path("/host-workdir/companies/PixelForgeStudios/projects/PixelRealm")
ENEMIES_DIR = ROOT / "assets" / "sprites" / "enemies"
BOSSES_DIR  = ROOT / "assets" / "sprites" / "enemies" / "bosses"
CHARS_DIR   = ROOT / "assets" / "sprites" / "characters"

random.seed(42)  # reproducible art


def c(color, alpha=255):
    """Return RGBA tuple from an RGB color."""
    return (*color, alpha)


def safe_put(img, x, y, color):
    """Put pixel only if within bounds."""
    w, h = img.size
    if 0 <= x < w and 0 <= y < h:
        img.putpixel((x, y), color)


# ===========================================================================
# ENEMY 1: Lava Slime (16x16, 8 frames = 128x16)
# A bubbling blob of molten lava. Walk: oozes and jiggles. Attack: lunges up.
# ===========================================================================

def generate_lava_slime():
    sheet = Image.new("RGBA", (128, 16), TRANSPARENT)

    for frame in range(8):
        x0 = frame * 16
        is_attack = frame >= 4
        attack_frame = frame - 4 if is_attack else 0

        # Walk bob cycle / attack lunge
        if is_attack:
            bob = [-2, -3, -1, 0][attack_frame]  # jump up then land
            squash_x = [0, 0, 1, 0][attack_frame]  # stretch on landing
        else:
            bob = [0, -1, 0, 1][frame]  # gentle bob
            squash_x = 0

        # Base blob shape — elliptical body
        cx, cy = 8, 11 + bob
        rx, ry = 5 + squash_x, 4

        for y in range(16):
            for x in range(16):
                dx = (x - cx) / max(rx, 1)
                dy = (y - cy) / max(ry, 1)
                dist = dx * dx + dy * dy

                if dist < 0.4:
                    # Core — hottest lava
                    safe_put(sheet, x0 + x, y, c(LAVA_CORE))
                elif dist < 0.65:
                    safe_put(sheet, x0 + x, y, c(LAVA_HOT))
                elif dist < 0.85:
                    safe_put(sheet, x0 + x, y, c(LAVA_BRIGHT))
                elif dist < 1.0:
                    safe_put(sheet, x0 + x, y, c(LAVA_MED))

        # Eyes (dark spots in the lava)
        ey = 9 + bob
        safe_put(sheet, x0 + 6, ey, c(ROCK_DARK))
        safe_put(sheet, x0 + 10, ey, c(ROCK_DARK))

        # Bubbles — small bright spots that shift per frame
        bubble_offsets = [
            [(4, 12), (11, 10)],
            [(5, 11), (10, 12)],
            [(3, 10), (12, 11)],
            [(5, 12), (9, 10)],
        ]
        for bx, by in bubble_offsets[frame % 4]:
            by_adj = by + bob
            safe_put(sheet, x0 + bx, by_adj, c(HIGHLIGHT))

        # Attack: dripping lava projectile particles above
        if is_attack and attack_frame in (1, 2):
            for px, py in [(7, 3 + bob), (9, 4 + bob), (8, 2 + bob)]:
                safe_put(sheet, x0 + px, py, c(EMBER))

    out = ENEMIES_DIR / "char_enemy_lava_slime.png"
    sheet.save(out)
    print(f"  Created: {out}")


# ===========================================================================
# ENEMY 2: Magma Golem (16x16, 8 frames = 128x16)
# Rocky humanoid with lava veins. Walk: heavy stomp. Attack: overhead smash.
# ===========================================================================

def generate_magma_golem():
    sheet = Image.new("RGBA", (128, 16), TRANSPARENT)

    for frame in range(8):
        x0 = frame * 16
        is_attack = frame >= 4
        attack_frame = frame - 4 if is_attack else 0

        # Walk cycle: slight side-to-side sway
        if is_attack:
            bob = [0, -1, -2, 0][attack_frame]  # wind up, smash down
            arm_raise = [0, -2, -4, 0][attack_frame]
        else:
            bob = [0, 0, -1, 0][frame]
            arm_raise = 0

        # --- Head (rows 1-4) ---
        head_y = 1 + bob
        for y in range(3):
            for x in range(6, 11):
                safe_put(sheet, x0 + x, head_y + y, c(ROCK_MED))
        # Glowing eyes
        safe_put(sheet, x0 + 7, head_y + 1, c(LAVA_BRIGHT))
        safe_put(sheet, x0 + 9, head_y + 1, c(LAVA_BRIGHT))
        # Lava crack on forehead
        safe_put(sheet, x0 + 8, head_y, c(LAVA_HOT))

        # --- Body (rows 4-10) ---
        body_y = 4 + bob
        for y in range(6):
            width = 4 if y < 2 else (5 if y < 4 else 4)
            start = 8 - width
            end = 8 + width
            for x in range(start, end):
                safe_put(sheet, x0 + x, body_y + y, c(ROCK_LIGHT))
        # Lava veins down the torso
        for y in range(6):
            safe_put(sheet, x0 + 8, body_y + y, c(LAVA_MED))
        # Chest lava cracks
        safe_put(sheet, x0 + 6, body_y + 2, c(LAVA_BRIGHT))
        safe_put(sheet, x0 + 10, body_y + 2, c(LAVA_BRIGHT))

        # --- Arms ---
        arm_y_base = 5 + bob
        # Left arm
        for ay in range(3):
            safe_put(sheet, x0 + 3, arm_y_base + ay + arm_raise, c(ROCK_MED))
            safe_put(sheet, x0 + 4, arm_y_base + ay + arm_raise, c(ROCK_LIGHT))
        # Right arm
        for ay in range(3):
            safe_put(sheet, x0 + 12, arm_y_base + ay + arm_raise, c(ROCK_MED))
            safe_put(sheet, x0 + 11, arm_y_base + ay + arm_raise, c(ROCK_LIGHT))
        # Fists glow
        fist_y = arm_y_base + 3 + arm_raise
        safe_put(sheet, x0 + 3, fist_y, c(LAVA_BRIGHT))
        safe_put(sheet, x0 + 12, fist_y, c(LAVA_BRIGHT))

        # --- Legs (rows 10-15) ---
        leg_y = 10
        # Walk: alternate leg forward
        left_offset = 0 if frame % 2 == 0 else 1
        right_offset = 1 if frame % 2 == 0 else 0
        if is_attack:
            left_offset = 0
            right_offset = 0

        for y in range(4):
            # Left leg
            safe_put(sheet, x0 + 6, leg_y + y + left_offset, c(ROCK_MED))
            safe_put(sheet, x0 + 7, leg_y + y + left_offset, c(ROCK_LIGHT))
            # Right leg
            safe_put(sheet, x0 + 9, leg_y + y + right_offset, c(ROCK_LIGHT))
            safe_put(sheet, x0 + 10, leg_y + y + right_offset, c(ROCK_MED))
        # Lava glow at joints
        safe_put(sheet, x0 + 6, leg_y + left_offset, c(LAVA_MED))
        safe_put(sheet, x0 + 10, leg_y + right_offset, c(LAVA_MED))

        # Feet
        safe_put(sheet, x0 + 5, 14 + left_offset, c(ROCK_DARK))
        safe_put(sheet, x0 + 6, 14 + left_offset, c(ROCK_MED))
        safe_put(sheet, x0 + 10, 14 + right_offset, c(ROCK_MED))
        safe_put(sheet, x0 + 11, 14 + right_offset, c(ROCK_DARK))

        # Attack: impact sparks
        if is_attack and attack_frame == 3:
            for sx, sy in [(4, 14), (5, 15), (11, 14), (12, 15)]:
                safe_put(sheet, x0 + sx, sy, c(EMBER))

    out = ENEMIES_DIR / "char_enemy_magma_golem.png"
    sheet.save(out)
    print(f"  Created: {out}")


# ===========================================================================
# ENEMY 3: Fire Imp (16x16, 8 frames = 128x16)
# Small winged devil. Walk: flutters. Attack: throws fireball.
# ===========================================================================

def generate_fire_imp():
    sheet = Image.new("RGBA", (128, 16), TRANSPARENT)

    for frame in range(8):
        x0 = frame * 16
        is_attack = frame >= 4
        attack_frame = frame - 4 if is_attack else 0

        # Hover bob
        if is_attack:
            bob = [0, -1, 0, 1][attack_frame]
        else:
            bob = [0, -1, -1, 0][frame]

        # --- Head (rows 2-6) ---
        head_y = 3 + bob
        # Horns
        safe_put(sheet, x0 + 5, head_y - 2, c(LAVA_DARK))
        safe_put(sheet, x0 + 10, head_y - 2, c(LAVA_DARK))
        safe_put(sheet, x0 + 6, head_y - 1, c(LAVA_DARK))
        safe_put(sheet, x0 + 9, head_y - 1, c(LAVA_DARK))
        # Head shape
        for y in range(3):
            for x in range(6, 10):
                safe_put(sheet, x0 + x, head_y + y, c(LAVA_MED))
        # Face highlight
        safe_put(sheet, x0 + 7, head_y, c(LAVA_BRIGHT))
        safe_put(sheet, x0 + 8, head_y, c(LAVA_BRIGHT))
        # Eyes (bright yellow, menacing)
        safe_put(sheet, x0 + 7, head_y + 1, c(LAVA_CORE))
        safe_put(sheet, x0 + 9, head_y + 1, c(LAVA_CORE))
        # Mouth
        safe_put(sheet, x0 + 7, head_y + 2, c(LAVA_HOT))
        safe_put(sheet, x0 + 8, head_y + 2, c(LAVA_HOT))

        # --- Body (rows 6-10) ---
        body_y = 6 + bob
        for y in range(4):
            w = 3 if y < 2 else 2
            for x in range(8 - w, 8 + w):
                safe_put(sheet, x0 + x, body_y + y, c(LAVA_DARK))
        # Belly glow
        safe_put(sheet, x0 + 7, body_y + 1, c(LAVA_BRIGHT))
        safe_put(sheet, x0 + 8, body_y + 1, c(LAVA_BRIGHT))

        # --- Wings (flapping animation) ---
        wing_y = 5 + bob
        wing_spread = [2, 3, 2, 1][frame % 4]  # flap cycle
        for wy in range(wing_spread):
            # Left wing
            safe_put(sheet, x0 + 4 - wy, wing_y + wy, c(LAVA_DARK))
            safe_put(sheet, x0 + 5 - wy, wing_y + wy, c(EMBER))
            # Right wing
            safe_put(sheet, x0 + 11 + wy, wing_y + wy, c(LAVA_DARK))
            safe_put(sheet, x0 + 10 + wy, wing_y + wy, c(EMBER))

        # --- Legs (rows 10-13) ---
        leg_y = 10 + bob
        # Spindly legs
        safe_put(sheet, x0 + 7, leg_y, c(LAVA_DARK))
        safe_put(sheet, x0 + 9, leg_y, c(LAVA_DARK))
        safe_put(sheet, x0 + 6, leg_y + 1, c(LAVA_DARK))
        safe_put(sheet, x0 + 10, leg_y + 1, c(LAVA_DARK))
        # Feet (claws)
        safe_put(sheet, x0 + 5, leg_y + 2, c(ROCK_DARK))
        safe_put(sheet, x0 + 6, leg_y + 2, c(ROCK_DARK))
        safe_put(sheet, x0 + 10, leg_y + 2, c(ROCK_DARK))
        safe_put(sheet, x0 + 11, leg_y + 2, c(ROCK_DARK))

        # --- Tail ---
        tail_y = 9 + bob
        safe_put(sheet, x0 + 11, tail_y, c(LAVA_DARK))
        safe_put(sheet, x0 + 12, tail_y + 1, c(LAVA_DARK))
        safe_put(sheet, x0 + 13, tail_y + 1, c(LAVA_BRIGHT))  # tail flame tip

        # Attack: fireball projectile
        if is_attack:
            if attack_frame >= 1:
                fb_x = 12 + attack_frame
                fb_y = 5 + bob
                safe_put(sheet, x0 + fb_x, fb_y, c(LAVA_CORE))
                safe_put(sheet, x0 + fb_x, fb_y + 1, c(LAVA_HOT))
                if fb_x - 1 >= 0:
                    safe_put(sheet, x0 + fb_x - 1, fb_y, c(EMBER))

    out = ENEMIES_DIR / "char_enemy_fire_imp.png"
    sheet.save(out)
    print(f"  Created: {out}")


# ===========================================================================
# BOSS: Infernal Warden (32x32 base, multi-phase)
# Large armored demon lord wreathed in flame. Three phases of escalating fire.
# ===========================================================================

def draw_warden_base(img, x0, y0, phase=1, bob=0, arm_offset=0):
    """Draw the Infernal Warden at (x0, y0) with optional phase tint and animation."""

    # Phase color intensification
    body_color = [ROCK_MED, ROCK_LIGHT, LAVA_DARK][min(phase - 1, 2)]
    vein_color = [LAVA_MED, LAVA_BRIGHT, LAVA_CORE][min(phase - 1, 2)]
    eye_color  = [LAVA_BRIGHT, LAVA_CORE, HIGHLIGHT][min(phase - 1, 2)]
    aura_color = [LAVA_DARK, LAVA_MED, LAVA_BRIGHT][min(phase - 1, 2)]

    # --- Helmet / Head (rows 0-8) ---
    # Crown / horns
    for dx in [-5, -4, 5, 4]:
        safe_put(img, x0 + 16 + dx, y0 + 1 + bob, c(ROCK_DARK))
    for dx in [-6, 6]:
        safe_put(img, x0 + 16 + dx, y0 + 0 + bob, c(ROCK_DARK))
    # Helmet dome
    for y in range(3, 7):
        w = 5 if y < 5 else 6
        for x in range(16 - w, 16 + w):
            safe_put(img, x0 + x, y0 + y + bob, c(ROCK_MED))
    # Helmet front plate
    for x in range(13, 19):
        safe_put(img, x0 + x, y0 + 3 + bob, c(ROCK_LIGHT))
    # Visor slit with glowing eyes
    safe_put(img, x0 + 13, y0 + 5 + bob, c(eye_color))
    safe_put(img, x0 + 14, y0 + 5 + bob, c(eye_color))
    safe_put(img, x0 + 18, y0 + 5 + bob, c(eye_color))
    safe_put(img, x0 + 19, y0 + 5 + bob, c(eye_color))
    # Jaw
    for x in range(13, 19):
        safe_put(img, x0 + x, y0 + 7 + bob, c(ROCK_DARK))

    # --- Shoulders & Pauldrons (rows 8-10) ---
    for y in range(8, 11):
        # Left pauldron
        for x in range(7, 13):
            safe_put(img, x0 + x, y0 + y + bob, c(body_color))
        # Right pauldron
        for x in range(19, 25):
            safe_put(img, x0 + x, y0 + y + bob, c(body_color))
    # Pauldron spikes
    safe_put(img, x0 + 7, y0 + 7 + bob, c(ROCK_DARK))
    safe_put(img, x0 + 25, y0 + 7 + bob, c(ROCK_DARK))
    # Pauldron lava glow
    safe_put(img, x0 + 9, y0 + 9 + bob, c(vein_color))
    safe_put(img, x0 + 22, y0 + 9 + bob, c(vein_color))

    # --- Torso (rows 10-19) ---
    for y in range(10):
        w = 6 if y < 5 else 5
        for x in range(16 - w, 16 + w):
            safe_put(img, x0 + x, y0 + 10 + y + bob, c(body_color))
    # Central lava vein
    for y in range(10, 20):
        safe_put(img, x0 + 16, y0 + y + bob, c(vein_color))
    # Cross veins
    for x in range(13, 19):
        safe_put(img, x0 + x, y0 + 14 + bob, c(vein_color))
    # Belt
    for x in range(11, 21):
        safe_put(img, x0 + x, y0 + 19 + bob, c(ROCK_DARK))
    safe_put(img, x0 + 16, y0 + 19 + bob, c(LAVA_HOT))  # belt buckle

    # --- Arms (rows 10-18) ---
    for ay in range(7):
        adj_y = y0 + 10 + ay + arm_offset + bob
        # Left arm
        safe_put(img, x0 + 7, adj_y, c(body_color))
        safe_put(img, x0 + 8, adj_y, c(ROCK_LIGHT))
        # Right arm
        safe_put(img, x0 + 23, adj_y, c(ROCK_LIGHT))
        safe_put(img, x0 + 24, adj_y, c(body_color))
    # Fists
    fist_y = y0 + 17 + arm_offset + bob
    safe_put(img, x0 + 6, fist_y, c(LAVA_BRIGHT))
    safe_put(img, x0 + 7, fist_y, c(LAVA_BRIGHT))
    safe_put(img, x0 + 24, fist_y, c(LAVA_BRIGHT))
    safe_put(img, x0 + 25, fist_y, c(LAVA_BRIGHT))

    # --- Legs (rows 20-29) ---
    for ly in range(8):
        # Left leg
        safe_put(img, x0 + 12, y0 + 20 + ly, c(body_color))
        safe_put(img, x0 + 13, y0 + 20 + ly, c(ROCK_LIGHT))
        safe_put(img, x0 + 14, y0 + 20 + ly, c(body_color))
        # Right leg
        safe_put(img, x0 + 18, y0 + 20 + ly, c(body_color))
        safe_put(img, x0 + 19, y0 + 20 + ly, c(ROCK_LIGHT))
        safe_put(img, x0 + 20, y0 + 20 + ly, c(body_color))
    # Lava veins on legs
    safe_put(img, x0 + 13, y0 + 22, c(vein_color))
    safe_put(img, x0 + 19, y0 + 22, c(vein_color))
    # Feet
    for x in range(11, 15):
        safe_put(img, x0 + x, y0 + 28, c(ROCK_DARK))
    for x in range(17, 21):
        safe_put(img, x0 + x, y0 + 28, c(ROCK_DARK))

    # --- Phase-specific aura particles ---
    if phase >= 2:
        aura_positions = [(6, 4), (26, 6), (4, 15), (27, 14), (8, 25), (24, 26)]
        for ax, ay in aura_positions[:phase * 2]:
            safe_put(img, x0 + ax, y0 + ay + bob, c(aura_color, 180))

    if phase >= 3:
        # Flame crown
        for x in range(12, 20):
            if (x + bob) % 2 == 0:
                safe_put(img, x0 + x, y0 + 0 + bob, c(LAVA_CORE))
                safe_put(img, x0 + x, y0 + 1 + bob, c(LAVA_HOT))


def generate_boss():
    """Generate all Infernal Warden sprite sheets."""

    # --- Idle (4 frames of 32x32 = 128x32) ---
    idle = Image.new("RGBA", (128, 32), TRANSPARENT)
    for frame in range(4):
        bob = [0, -1, 0, 1][frame]
        draw_warden_base(idle, frame * 32, 0, phase=1, bob=bob)
    idle_out = BOSSES_DIR / "boss_infernal_warden_idle.png"
    idle.save(idle_out)
    print(f"  Created: {idle_out}")

    # --- Attack (4 frames of 32x32 = 128x32) ---
    attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    arm_offsets = [0, -2, -4, 0]  # wind up, strike, recover
    for frame in range(4):
        draw_warden_base(attack, frame * 32, 0, phase=1, bob=0,
                         arm_offset=arm_offsets[frame])
        # Impact sparks on the smash frame
        if frame == 2:
            x0 = frame * 32
            for sx, sy in [(5, 28), (6, 29), (25, 28), (26, 29)]:
                safe_put(attack, x0 + sx, sy, c(EMBER))
            for sx, sy in [(6, 27), (7, 28), (24, 27), (25, 28)]:
                safe_put(attack, x0 + sx, sy, c(LAVA_CORE))
    attack_out = BOSSES_DIR / "boss_infernal_warden_attack.png"
    attack.save(attack_out)
    print(f"  Created: {attack_out}")

    # --- Phase portraits (single 32x32 each) ---
    for phase in range(1, 4):
        portrait = Image.new("RGBA", (32, 32), TRANSPARENT)
        draw_warden_base(portrait, 0, 0, phase=phase)
        out = BOSSES_DIR / f"boss_infernal_warden_phase{phase}.png"
        portrait.save(out)
        print(f"  Created: {out}")


# ===========================================================================
# NPC: Volcanic Researcher (16x24, 2-frame idle = 32x24)
# Scholarly figure with protective gear, goggles, and a leather apron.
# ===========================================================================

def generate_npc():
    sheet = Image.new("RGBA", (32, 24), TRANSPARENT)

    skin = PAL["sand"]
    coat = PAL["rich_earth"]    # leather protective coat
    apron = PAL["dirt"]         # work apron
    goggle = PAL["pale_water"]  # heat goggles (blue lens)
    hat = PAL["stone_gray"]     # metal helmet
    accent = LAVA_BRIGHT        # fire-themed accent

    for frame in range(2):
        x0 = frame * 16
        bob = 1 if frame == 1 else 0

        # --- Head (rows 0-7) ---
        # Helmet
        for x in range(6, 11):
            safe_put(sheet, x0 + x, 0 + bob, c(hat))
            safe_put(sheet, x0 + x, 1 + bob, c(hat))
        # Face
        for y in range(2, 7):
            for x in range(6, 11):
                safe_put(sheet, x0 + x, y + bob, c(skin))
        # Goggles (distinctive feature)
        safe_put(sheet, x0 + 6, 3 + bob, c(ROCK_DARK))
        safe_put(sheet, x0 + 7, 3 + bob, c(goggle))
        safe_put(sheet, x0 + 8, 3 + bob, c(ROCK_DARK))
        safe_put(sheet, x0 + 9, 3 + bob, c(goggle))
        safe_put(sheet, x0 + 10, 3 + bob, c(ROCK_DARK))
        # Eyes behind goggles
        safe_put(sheet, x0 + 7, 4 + bob, c(ROCK_DARK))
        safe_put(sheet, x0 + 9, 4 + bob, c(ROCK_DARK))
        # Mouth
        safe_put(sheet, x0 + 8, 6 + bob, c(PAL["deep_soil"]))

        # --- Body (rows 8-18) ---
        for y in range(8, 18):
            for x in range(5, 12):
                safe_put(sheet, x0 + x, y + bob, c(coat))
        # Apron (front panel)
        for y in range(10, 17):
            for x in range(6, 10):
                safe_put(sheet, x0 + x, y + bob, c(apron))
        # Tool belt accent
        for x in range(5, 12):
            safe_put(sheet, x0 + x, 9 + bob, c(ROCK_DARK))
        safe_put(sheet, x0 + 8, 9 + bob, c(accent))  # buckle glow
        # Notebook/tool in hand
        if frame == 0:
            safe_put(sheet, x0 + 4, 12 + bob, c(PAL["pale_sand"]))
            safe_put(sheet, x0 + 4, 13 + bob, c(PAL["pale_sand"]))
        else:
            safe_put(sheet, x0 + 4, 11 + bob, c(PAL["pale_sand"]))
            safe_put(sheet, x0 + 4, 12 + bob, c(PAL["pale_sand"]))

        # Arms
        safe_put(sheet, x0 + 4, 10 + bob, c(skin))
        safe_put(sheet, x0 + 4, 11 + bob, c(skin))
        safe_put(sheet, x0 + 12, 10 + bob, c(skin))
        safe_put(sheet, x0 + 12, 11 + bob, c(skin))

        # --- Legs (rows 19-23) ---
        for y in range(19, 23):
            safe_put(sheet, x0 + 6, y, c(PAL["deep_soil"]))
            safe_put(sheet, x0 + 7, y, c(PAL["deep_soil"]))
            safe_put(sheet, x0 + 9, y, c(PAL["deep_soil"]))
            safe_put(sheet, x0 + 10, y, c(PAL["deep_soil"]))
        # Heavy boots
        safe_put(sheet, x0 + 5, 23, c(ROCK_DARK))
        safe_put(sheet, x0 + 6, 23, c(ROCK_MED))
        safe_put(sheet, x0 + 10, 23, c(ROCK_MED))
        safe_put(sheet, x0 + 11, 23, c(ROCK_DARK))

    out = CHARS_DIR / "char_npc_volcanic_researcher.png"
    sheet.save(out)
    print(f"  Created: {out}")


# ===========================================================================
# MAIN
# ===========================================================================

def main():
    for d in [ENEMIES_DIR, BOSSES_DIR, CHARS_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    print("Generating Volcanic Highlands creature & character sprites...")
    print()
    print("[1/5] Lava Slime")
    generate_lava_slime()
    print()
    print("[2/5] Magma Golem")
    generate_magma_golem()
    print()
    print("[3/5] Fire Imp")
    generate_fire_imp()
    print()
    print("[4/5] Infernal Warden (boss)")
    generate_boss()
    print()
    print("[5/5] Volcanic Researcher (NPC)")
    generate_npc()
    print()
    print("Done! All volcanic zone sprites generated.")


if __name__ == "__main__":
    main()
