#!/usr/bin/env python3
"""
Generate Shadowmire Swamp zone art assets for PixelRealm (PIX-164).
Produces: 3 enemy sprite sheets, 1 boss (5 sheets), 1 zone NPC.
All assets follow the existing 16x16 base pixel art style (SNES-era palette).
Swamp color language: dark greens, murky purples, toxic yellows.
"""

import sys
sys.path.insert(0, "/tmp/pylib")

from PIL import Image, ImageDraw
import os
import math

ASSET_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

# ── Swamp Color Palette ──────────────────────────────────────────────────────
# Dark greens
SWAMP_GREEN_DARK = (20, 50, 20, 255)
SWAMP_GREEN_MED = (40, 80, 35, 255)
SWAMP_GREEN_LIGHT = (60, 110, 50, 255)
SWAMP_GREEN_BRIGHT = (80, 140, 60, 255)

# Murky purples
SWAMP_PURPLE_DARK = (40, 15, 50, 255)
SWAMP_PURPLE_MED = (70, 30, 80, 255)
SWAMP_PURPLE_LIGHT = (100, 50, 120, 255)
SWAMP_PURPLE_GLOW = (140, 80, 180, 200)

# Toxic yellows / acid
TOXIC_YELLOW = (180, 190, 30, 255)
TOXIC_GREEN = (140, 200, 40, 255)
TOXIC_BRIGHT = (220, 230, 60, 255)
TOXIC_DIM = (100, 110, 20, 255)

# Mud / brown
MUD_DARK = (40, 30, 15, 255)
MUD_MED = (70, 55, 30, 255)
MUD_LIGHT = (100, 80, 45, 255)

# Creature base colors
CRAWLER_BODY = (50, 65, 30, 255)
CRAWLER_SHELL = (35, 50, 20, 255)
CRAWLER_BELLY = (70, 85, 45, 255)
CRAWLER_LEG = (30, 40, 15, 255)
CRAWLER_EYE = (200, 200, 40, 255)

WRAITH_BODY = (60, 40, 80, 160)
WRAITH_CORE = (80, 55, 110, 200)
WRAITH_GLOW = (120, 80, 160, 140)
WRAITH_EYE = (160, 255, 120, 255)
WRAITH_WISP = (100, 180, 80, 120)

TOAD_BODY = (50, 80, 30, 255)
TOAD_BELLY = (80, 110, 50, 255)
TOAD_SPOT = (180, 190, 30, 255)
TOAD_EYE = (220, 60, 30, 255)
TOAD_TONGUE = (180, 50, 50, 255)

QUEEN_BODY = (30, 60, 35, 255)
QUEEN_ARMOR = (50, 40, 60, 255)
QUEEN_CROWN = (100, 50, 120, 255)
QUEEN_EYE = (200, 255, 80, 255)
QUEEN_VINE = (40, 90, 30, 255)
QUEEN_POISON = (160, 200, 40, 255)
QUEEN_OUTLINE = (15, 25, 15, 255)

NPC_ROBE = (50, 70, 45, 255)
NPC_ROBE_LIGHT = (70, 95, 60, 255)
NPC_SKIN = (160, 130, 100, 255)
NPC_SKIN_DARK = (130, 100, 75, 255)
NPC_HAIR = (140, 140, 130, 255)
NPC_VIAL = (100, 200, 80, 255)
NPC_BELT = (80, 60, 35, 255)

OUTLINE = (15, 20, 10, 255)
TRANSPARENT = (0, 0, 0, 0)


def ensure_dir(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)


def save_asset(img, rel_path):
    full_path = os.path.join(ASSET_ROOT, rel_path)
    ensure_dir(full_path)
    img.save(full_path)
    print(f"  Created: assets/{rel_path} ({img.size[0]}x{img.size[1]})")


# ══════════════════════════════════════════════════════════════════════════════
# ENEMY 1: BOG CRAWLER — low armored insect, 16x16, 8 frames
# Frames 0-3: walk cycle, Frames 4-7: attack (lunge + snap)
# ══════════════════════════════════════════════════════════════════════════════

def draw_bog_crawler(draw, ox, oy, frame):
    """Draw a single 16x16 Bog Crawler frame."""
    is_attack = frame >= 4
    anim = frame % 4

    # Walk: legs alternate, body bobs
    # Attack: body lunges forward, mandibles open
    bob = [0, -1, 0, -1][anim]
    lunge = 0
    if is_attack:
        lunge = [0, 1, 2, 1][anim]

    # Body: oval shell (top-down-ish, low creature)
    # Shell top
    for dx in range(4, 12):
        for dy in range(4 + bob, 10 + bob):
            # Oval check
            cx, cy = 8, 7 + bob
            rx, ry = 4.5, 3.5
            if ((dx - cx) / rx) ** 2 + ((dy - cy) / ry) ** 2 <= 1.0:
                draw.point((ox + dx + lunge, oy + dy), fill=CRAWLER_SHELL)

    # Shell highlight ridge
    draw.point((ox + 7 + lunge, oy + 5 + bob), fill=CRAWLER_BODY)
    draw.point((ox + 8 + lunge, oy + 5 + bob), fill=CRAWLER_BODY)
    draw.point((ox + 7 + lunge, oy + 6 + bob), fill=CRAWLER_BELLY)
    draw.point((ox + 8 + lunge, oy + 6 + bob), fill=CRAWLER_BELLY)

    # Head (front)
    draw.rectangle([ox + 11 + lunge, oy + 6 + bob, ox + 13 + lunge, oy + 8 + bob], fill=CRAWLER_BODY)
    # Eyes
    draw.point((ox + 12 + lunge, oy + 6 + bob), fill=CRAWLER_EYE)
    draw.point((ox + 13 + lunge, oy + 6 + bob), fill=CRAWLER_EYE)

    # Mandibles
    if is_attack and anim in (1, 2):
        # Open mandibles for attack
        draw.point((ox + 14 + lunge, oy + 5 + bob), fill=OUTLINE)
        draw.point((ox + 14 + lunge, oy + 9 + bob), fill=OUTLINE)
        draw.point((ox + 15 + lunge, oy + 5 + bob), fill=TOAD_EYE)
        draw.point((ox + 15 + lunge, oy + 9 + bob), fill=TOAD_EYE)
    else:
        # Closed mandibles
        draw.point((ox + 14 + lunge, oy + 6 + bob), fill=OUTLINE)
        draw.point((ox + 14 + lunge, oy + 8 + bob), fill=OUTLINE)

    # Legs (3 pairs, alternating animation)
    leg_offsets = [(5, 10), (7, 10), (10, 10)]
    for i, (lx, ly) in enumerate(leg_offsets):
        leg_anim = (anim + i) % 2
        y_off = 0 if leg_anim == 0 else 1
        # Top legs
        draw.point((ox + lx + lunge, oy + ly + bob + y_off), fill=CRAWLER_LEG)
        draw.point((ox + lx + lunge, oy + ly + 1 + bob + y_off), fill=CRAWLER_LEG)
        # Bottom reflection would be above — but for side-view, draw below
        draw.point((ox + lx + lunge, oy + ly + 2 + bob), fill=CRAWLER_LEG)


def generate_bog_crawler():
    """Generate 8-frame Bog Crawler sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_bog_crawler(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_bog_crawler.png")
    return img


# ══════════════════════════════════════════════════════════════════════════════
# ENEMY 2: SWAMP WRAITH — ethereal ghost, 16x16, 8 frames
# Frames 0-3: float/drift, Frames 4-7: attack (surge + claw)
# ══════════════════════════════════════════════════════════════════════════════

def draw_swamp_wraith(draw, ox, oy, frame):
    """Draw a single 16x16 Swamp Wraith frame."""
    is_attack = frame >= 4
    anim = frame % 4

    float_y = [0, -1, -2, -1][anim]
    surge = [0, 1, 2, 1][anim] if is_attack else 0

    # Wispy tail (bottom, fading)
    tail_sway = [-1, 0, 1, 0][anim]
    draw.point((ox + 7 + tail_sway, oy + 14 + float_y), fill=WRAITH_WISP)
    draw.point((ox + 8 + tail_sway, oy + 13 + float_y), fill=WRAITH_WISP)
    draw.point((ox + 7, oy + 12 + float_y), fill=WRAITH_GLOW)
    draw.point((ox + 8, oy + 12 + float_y), fill=WRAITH_GLOW)
    draw.point((ox + 9, oy + 12 + float_y), fill=WRAITH_GLOW)

    # Body: ethereal mass
    for dx in range(5, 11):
        for dy in range(5 + float_y, 12 + float_y):
            cx, cy = 8, 8 + float_y
            rx, ry = 3.5, 4.0
            if ((dx - cx) / rx) ** 2 + ((dy - cy) / ry) ** 2 <= 1.0:
                draw.point((ox + dx + surge, oy + dy), fill=WRAITH_BODY)

    # Inner core
    draw.rectangle([ox + 6 + surge, oy + 6 + float_y, ox + 9 + surge, oy + 10 + float_y], fill=WRAITH_CORE)

    # Hood / head shape
    draw.rectangle([ox + 5 + surge, oy + 3 + float_y, ox + 10 + surge, oy + 6 + float_y], fill=WRAITH_BODY)
    draw.rectangle([ox + 6 + surge, oy + 2 + float_y, ox + 9 + surge, oy + 4 + float_y], fill=WRAITH_CORE)

    # Glowing eyes
    draw.point((ox + 6 + surge, oy + 4 + float_y), fill=WRAITH_EYE)
    draw.point((ox + 9 + surge, oy + 4 + float_y), fill=WRAITH_EYE)

    # Ghostly arms / claws
    if is_attack:
        # Extended claws
        arm_y = 7 + float_y
        draw.point((ox + 3 + surge, oy + arm_y), fill=WRAITH_GLOW)
        draw.point((ox + 2 + surge, oy + arm_y - 1), fill=WRAITH_WISP)
        draw.point((ox + 12 + surge, oy + arm_y), fill=WRAITH_GLOW)
        draw.point((ox + 13 + surge, oy + arm_y - 1), fill=WRAITH_WISP)
    else:
        # Relaxed wisps
        arm_y = 8 + float_y
        draw.point((ox + 4, oy + arm_y), fill=WRAITH_GLOW)
        draw.point((ox + 11, oy + arm_y), fill=WRAITH_GLOW)

    # Aura particles
    px_offsets = [(3, 3), (12, 5), (4, 11), (11, 10)]
    active = anim % 3
    if active < len(px_offsets):
        ax, ay = px_offsets[active]
        draw.point((ox + ax + surge, oy + ay + float_y), fill=WRAITH_WISP)


def generate_swamp_wraith():
    """Generate 8-frame Swamp Wraith sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_swamp_wraith(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_swamp_wraith.png")
    return img


# ══════════════════════════════════════════════════════════════════════════════
# ENEMY 3: TOXIC TOAD — bulbous poisonous toad, 16x16, 8 frames
# Frames 0-3: idle/hop, Frames 4-7: attack (tongue lash + spit)
# ══════════════════════════════════════════════════════════════════════════════

def draw_toxic_toad(draw, ox, oy, frame):
    """Draw a single 16x16 Toxic Toad frame."""
    is_attack = frame >= 4
    anim = frame % 4

    # Hop animation: crouch, leap, airborne, land
    hop_y = [0, -1, -2, -1][anim] if not is_attack else 0
    # Squish for crouch frames
    squish = 1 if anim == 0 and not is_attack else 0

    # Body: wide squat shape
    body_top = 7 + hop_y + squish
    body_bot = 12 + hop_y
    # Main body
    draw.rectangle([ox + 4, oy + body_top, ox + 12, oy + body_bot], fill=TOAD_BODY)
    # Belly
    draw.rectangle([ox + 5, oy + body_top + 2, ox + 11, oy + body_bot], fill=TOAD_BELLY)

    # Head (slightly raised)
    head_top = body_top - 2
    draw.rectangle([ox + 5, oy + head_top, ox + 11, oy + body_top], fill=TOAD_BODY)
    # Forehead
    draw.rectangle([ox + 6, oy + head_top - 1, ox + 10, oy + head_top], fill=TOAD_BODY)

    # Eyes (bulging, on top)
    draw.rectangle([ox + 4, oy + head_top - 1, ox + 6, oy + head_top], fill=TOAD_BODY)
    draw.point((ox + 5, oy + head_top - 1), fill=TOAD_EYE)
    draw.rectangle([ox + 10, oy + head_top - 1, ox + 12, oy + head_top], fill=TOAD_BODY)
    draw.point((ox + 11, oy + head_top - 1), fill=TOAD_EYE)

    # Toxic spots on back
    draw.point((ox + 6, oy + body_top + 1), fill=TOAD_SPOT)
    draw.point((ox + 9, oy + body_top), fill=TOAD_SPOT)
    draw.point((ox + 7, oy + body_top + 2), fill=TOXIC_DIM)

    # Front legs
    leg_y = body_bot + 1
    draw.point((ox + 4, oy + leg_y), fill=TOAD_BODY)
    draw.point((ox + 3, oy + leg_y), fill=SWAMP_GREEN_DARK)
    draw.point((ox + 12, oy + leg_y), fill=TOAD_BODY)
    draw.point((ox + 13, oy + leg_y), fill=SWAMP_GREEN_DARK)

    # Back legs (larger, for hopping)
    draw.rectangle([ox + 2, oy + body_bot - 1, ox + 4, oy + body_bot + 1], fill=TOAD_BODY)
    draw.rectangle([ox + 12, oy + body_bot - 1, ox + 14, oy + body_bot + 1], fill=TOAD_BODY)
    if anim == 1 or anim == 2:
        # Extended legs during jump
        draw.point((ox + 1, oy + body_bot + 2), fill=SWAMP_GREEN_DARK)
        draw.point((ox + 15, oy + body_bot + 2), fill=SWAMP_GREEN_DARK)

    # Attack: tongue lash
    if is_attack:
        tongue_len = [0, 2, 4, 2][anim]
        if tongue_len > 0:
            for t in range(tongue_len):
                draw.point((ox + 13 + t, oy + body_top + 1), fill=TOAD_TONGUE)
            # Poison drip at tongue tip
            if tongue_len >= 3:
                draw.point((ox + 13 + tongue_len, oy + body_top + 2), fill=TOXIC_GREEN)

    # Puff cheeks on attack frame 0 and 3
    if is_attack and anim in (0, 3):
        draw.point((ox + 3, oy + body_top + 1), fill=TOXIC_GREEN)
        draw.point((ox + 13, oy + body_top + 1), fill=TOXIC_GREEN)


def generate_toxic_toad():
    """Generate 8-frame Toxic Toad sprite sheet."""
    img = Image.new("RGBA", (128, 16), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    for frame in range(8):
        draw_toxic_toad(draw, frame * 16, 0, frame)
    save_asset(img, "sprites/enemies/char_enemy_toxic_toad.png")
    return img


# ══════════════════════════════════════════════════════════════════════════════
# BOSS: MIRE QUEEN — poison/nature multi-phase boss, 32x32
# idle (1 frame), attack (4 frames), phase1/2/3 (1 frame each)
# ══════════════════════════════════════════════════════════════════════════════

def draw_mire_queen(draw, ox, oy, frame=0, phase=1, is_attack=False):
    """Draw the Mire Queen boss at 32x32."""
    anim = frame % 4
    breath = [0, -1, 0, 1][anim]

    # Phase color shifts
    body = QUEEN_BODY
    crown = QUEEN_CROWN
    vine = QUEEN_VINE
    poison_col = QUEEN_POISON
    if phase == 2:
        body = (25, 50, 40, 255)
        crown = (120, 60, 140, 255)
        poison_col = (180, 220, 50, 255)
    elif phase == 3:
        body = (20, 40, 30, 255)
        crown = (140, 70, 160, 255)
        vine = (30, 70, 25, 255)
        poison_col = (200, 240, 60, 255)

    outline = QUEEN_OUTLINE

    # Lower body: root/tendril mass (wider base)
    draw.rectangle([ox + 8, oy + 22 + breath, ox + 24, oy + 30], fill=vine)
    draw.rectangle([ox + 10, oy + 24 + breath, ox + 22, oy + 29], fill=body)
    # Tendrils extending down
    draw.rectangle([ox + 6, oy + 26, ox + 9, oy + 31], fill=vine)
    draw.rectangle([ox + 23, oy + 26, ox + 26, oy + 31], fill=vine)
    draw.point((ox + 5, oy + 28), fill=vine)
    draw.point((ox + 27, oy + 28), fill=vine)

    # Torso
    draw.rectangle([ox + 10, oy + 14 + breath, ox + 22, oy + 22 + breath], fill=body)
    draw.rectangle([ox + 11, oy + 15 + breath, ox + 21, oy + 21 + breath], fill=QUEEN_ARMOR)

    # Poison sacs on torso (glow brighter in later phases)
    draw.point((ox + 12, oy + 17 + breath), fill=poison_col)
    draw.point((ox + 20, oy + 17 + breath), fill=poison_col)
    draw.point((ox + 16, oy + 20 + breath), fill=poison_col)

    # Head
    draw.rectangle([ox + 11, oy + 8 + breath, ox + 21, oy + 14 + breath], fill=body)
    draw.rectangle([ox + 12, oy + 9 + breath, ox + 20, oy + 13 + breath], fill=body)

    # Crown of thorns/vines
    draw.point((ox + 11, oy + 6 + breath), fill=crown)
    draw.point((ox + 13, oy + 5 + breath), fill=crown)
    draw.point((ox + 16, oy + 4 + breath), fill=crown)
    draw.point((ox + 19, oy + 5 + breath), fill=crown)
    draw.point((ox + 21, oy + 6 + breath), fill=crown)
    # Crown connectors
    draw.point((ox + 12, oy + 7 + breath), fill=crown)
    draw.point((ox + 14, oy + 6 + breath), fill=crown)
    draw.point((ox + 15, oy + 5 + breath), fill=crown)
    draw.point((ox + 17, oy + 5 + breath), fill=crown)
    draw.point((ox + 18, oy + 6 + breath), fill=crown)
    draw.point((ox + 20, oy + 7 + breath), fill=crown)

    # Eyes (glowing toxic green)
    draw.rectangle([ox + 13, oy + 10 + breath, ox + 14, oy + 11 + breath], fill=QUEEN_EYE)
    draw.rectangle([ox + 18, oy + 10 + breath, ox + 19, oy + 11 + breath], fill=QUEEN_EYE)

    # Mouth
    if is_attack and anim in (1, 2):
        # Open mouth — spewing poison
        draw.rectangle([ox + 14, oy + 12 + breath, ox + 18, oy + 13 + breath], fill=outline)
        draw.point((ox + 15, oy + 12 + breath), fill=poison_col)
        draw.point((ox + 17, oy + 12 + breath), fill=poison_col)
    else:
        draw.rectangle([ox + 15, oy + 12 + breath, ox + 17, oy + 12 + breath], fill=outline)

    # Arms / vine-whips
    arm_wave = [0, 1, 2, 1][anim]
    if is_attack:
        # Extended vine whip attack
        attack_ext = [0, 2, 4, 2][anim]
        # Left arm
        draw.rectangle([ox + 6 - attack_ext, oy + 16 + breath, ox + 10, oy + 18 + breath], fill=vine)
        draw.point((ox + 5 - attack_ext, oy + 17 + breath), fill=SWAMP_GREEN_LIGHT)
        # Right arm
        draw.rectangle([ox + 22, oy + 16 + breath, ox + 26 + attack_ext, oy + 18 + breath], fill=vine)
        draw.point((ox + 27 + attack_ext, oy + 17 + breath), fill=SWAMP_GREEN_LIGHT)
        # Poison drip from attack
        if attack_ext >= 3:
            draw.point((ox + 4 - attack_ext, oy + 19 + breath), fill=poison_col)
            draw.point((ox + 28 + attack_ext, oy + 19 + breath), fill=poison_col)
    else:
        # Idle arms
        draw.rectangle([ox + 7, oy + 16 + breath + arm_wave, ox + 10, oy + 20 + breath + arm_wave], fill=vine)
        draw.rectangle([ox + 22, oy + 16 + breath + arm_wave, ox + 25, oy + 20 + breath + arm_wave], fill=vine)

    # Phase-specific effects
    if phase >= 2:
        # Poison aura particles
        aura_pos = [(5, 12), (27, 14), (8, 8), (24, 10)]
        for i, (ax, ay) in enumerate(aura_pos):
            if (anim + i) % 3 == 0:
                draw.point((ox + ax, oy + ay + breath), fill=poison_col)

    if phase == 3:
        # Toxic miasma around base
        for tx in range(4, 28, 3):
            ty = 29 + (anim + tx) % 3
            if ty < 32:
                draw.point((ox + tx, oy + ty), fill=(poison_col[0], poison_col[1], poison_col[2], 140))
        # Crown glows more intensely
        draw.point((ox + 16, oy + 3 + breath), fill=QUEEN_EYE)


def generate_mire_queen():
    """Generate all Mire Queen boss sprite sheets."""
    # Idle — single 32x32 frame
    img_idle = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_idle = ImageDraw.Draw(img_idle)
    draw_mire_queen(draw_idle, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_idle, "sprites/enemies/bosses/boss_mire_queen_idle.png")

    # Attack — 4 frames, 128x32
    img_attack = Image.new("RGBA", (128, 32), TRANSPARENT)
    draw_attack = ImageDraw.Draw(img_attack)
    for f in range(4):
        draw_mire_queen(draw_attack, f * 32, 0, frame=f, phase=1, is_attack=True)
    save_asset(img_attack, "sprites/enemies/bosses/boss_mire_queen_attack.png")

    # Phase 1 — single frame
    img_p1 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p1 = ImageDraw.Draw(img_p1)
    draw_mire_queen(draw_p1, 0, 0, frame=0, phase=1, is_attack=False)
    save_asset(img_p1, "sprites/enemies/bosses/boss_mire_queen_phase1.png")

    # Phase 2 — intensified colors
    img_p2 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p2 = ImageDraw.Draw(img_p2)
    draw_mire_queen(draw_p2, 0, 0, frame=0, phase=2, is_attack=False)
    save_asset(img_p2, "sprites/enemies/bosses/boss_mire_queen_phase2.png")

    # Phase 3 — full toxic aura
    img_p3 = Image.new("RGBA", (32, 32), TRANSPARENT)
    draw_p3 = ImageDraw.Draw(img_p3)
    draw_mire_queen(draw_p3, 0, 0, frame=0, phase=3, is_attack=False)
    save_asset(img_p3, "sprites/enemies/bosses/boss_mire_queen_phase3.png")


# ══════════════════════════════════════════════════════════════════════════════
# NPC: SWAMP ALCHEMIST — zone quest giver, 16x24
# Robed hermit figure with potion vials and staff
# ══════════════════════════════════════════════════════════════════════════════

def draw_swamp_alchemist(draw, ox, oy):
    """Draw the Swamp Alchemist NPC at 16x24."""
    # Feet / boots
    draw.rectangle([ox + 5, oy + 21, ox + 7, oy + 23], fill=MUD_DARK)
    draw.rectangle([ox + 9, oy + 21, ox + 11, oy + 23], fill=MUD_DARK)

    # Robe (long, covers most of body)
    draw.rectangle([ox + 4, oy + 10, ox + 12, oy + 21], fill=NPC_ROBE)
    draw.rectangle([ox + 5, oy + 11, ox + 11, oy + 20], fill=NPC_ROBE_LIGHT)
    # Robe widens at bottom
    draw.rectangle([ox + 3, oy + 18, ox + 13, oy + 21], fill=NPC_ROBE)

    # Belt with potion vials
    draw.rectangle([ox + 4, oy + 14, ox + 12, oy + 15], fill=NPC_BELT)
    # Vial 1 (green)
    draw.rectangle([ox + 5, oy + 15, ox + 6, oy + 17], fill=NPC_VIAL)
    draw.point((ox + 5, oy + 15), fill=TOXIC_BRIGHT)
    # Vial 2 (purple)
    draw.rectangle([ox + 10, oy + 15, ox + 11, oy + 17], fill=SWAMP_PURPLE_LIGHT)
    draw.point((ox + 10, oy + 15), fill=SWAMP_PURPLE_GLOW[:3] + (255,))

    # Arms
    draw.rectangle([ox + 2, oy + 11, ox + 4, oy + 16], fill=NPC_ROBE)
    draw.rectangle([ox + 12, oy + 11, ox + 14, oy + 16], fill=NPC_ROBE)
    # Hands
    draw.point((ox + 2, oy + 16), fill=NPC_SKIN)
    draw.point((ox + 14, oy + 16), fill=NPC_SKIN)

    # Staff (held in right hand)
    draw.rectangle([ox + 14, oy + 4, ox + 14, oy + 20], fill=MUD_MED)
    draw.rectangle([ox + 14, oy + 3, ox + 14, oy + 4], fill=MUD_LIGHT)
    # Staff crystal/orb
    draw.rectangle([ox + 13, oy + 2, ox + 15, oy + 4], fill=TOXIC_GREEN)
    draw.point((ox + 14, oy + 2), fill=TOXIC_BRIGHT)

    # Head
    draw.rectangle([ox + 5, oy + 4, ox + 11, oy + 10], fill=NPC_SKIN)
    draw.rectangle([ox + 6, oy + 5, ox + 10, oy + 9], fill=NPC_SKIN)

    # Hair (long, gray — old hermit)
    draw.rectangle([ox + 5, oy + 3, ox + 11, oy + 5], fill=NPC_HAIR)
    draw.point((ox + 4, oy + 5), fill=NPC_HAIR)
    draw.point((ox + 4, oy + 6), fill=NPC_HAIR)
    draw.point((ox + 12, oy + 5), fill=NPC_HAIR)
    draw.point((ox + 12, oy + 6), fill=NPC_HAIR)

    # Hood (pulled back)
    draw.rectangle([ox + 4, oy + 2, ox + 12, oy + 4], fill=NPC_ROBE)
    draw.rectangle([ox + 5, oy + 1, ox + 11, oy + 3], fill=NPC_ROBE)

    # Face details
    # Eyes
    draw.point((ox + 7, oy + 6), fill=(40, 40, 40, 255))
    draw.point((ox + 9, oy + 6), fill=(40, 40, 40, 255))
    # Beard (short, gray)
    draw.point((ox + 7, oy + 9), fill=NPC_HAIR)
    draw.point((ox + 8, oy + 9), fill=NPC_HAIR)
    draw.point((ox + 9, oy + 9), fill=NPC_HAIR)
    draw.point((ox + 8, oy + 10), fill=NPC_HAIR)


def generate_swamp_alchemist():
    """Generate Swamp Alchemist NPC sprite."""
    img = Image.new("RGBA", (16, 24), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    draw_swamp_alchemist(draw, 0, 0)
    save_asset(img, "sprites/characters/char_npc_quest_swamp.png")
    return img


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("Generating Shadowmire Swamp zone assets (PIX-164)...")
    print()

    print("[1/5] Bog Crawler enemy sprite sheet")
    generate_bog_crawler()
    print()

    print("[2/5] Swamp Wraith enemy sprite sheet")
    generate_swamp_wraith()
    print()

    print("[3/5] Toxic Toad enemy sprite sheet")
    generate_toxic_toad()
    print()

    print("[4/5] Mire Queen boss sprites (idle, attack, phases 1-3)")
    generate_mire_queen()
    print()

    print("[5/5] Swamp Alchemist NPC sprite")
    generate_swamp_alchemist()
    print()

    print("Done! All Shadowmire Swamp zone assets generated.")


if __name__ == "__main__":
    main()
