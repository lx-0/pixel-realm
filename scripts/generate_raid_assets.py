#!/usr/bin/env python3
"""
Generate guild raid art assets for PixelRealm.
Produces: boss sprites, raid UI panels, loot dialog, lockout calendar, VFX, portal.
All assets follow the existing 16x16 base pixel art style with dark UI + orange/yellow borders.
"""

import sys
sys.path.insert(0, "/tmp/pylib")

from PIL import Image, ImageDraw
import os
import math
import random

ASSET_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

# ── Color Palette (matching existing PixelRealm style) ──────────────────────
# UI colors (from existing panels)
UI_BG_DARK = (40, 40, 48, 255)
UI_BG_MED = (60, 60, 68, 255)
UI_BG_LIGHT = (80, 80, 88, 255)
UI_BORDER_ORANGE = (200, 140, 40, 255)
UI_BORDER_DARK = (120, 80, 20, 255)
UI_HEADER_GOLD = (220, 180, 40, 255)
UI_HEADER_DARK = (180, 130, 20, 255)
UI_TEXT_WHITE = (230, 230, 230, 255)
UI_TEXT_GRAY = (160, 160, 160, 255)
UI_SLOT_BG = (30, 30, 35, 255)
UI_SLOT_BORDER = (100, 100, 110, 255)

# HP bar colors
HP_GREEN = (60, 180, 60, 255)
HP_YELLOW = (220, 200, 40, 255)
HP_RED = (200, 50, 50, 255)
HP_BG = (30, 20, 20, 255)
HP_PHASE_MARKER = (255, 255, 255, 200)

# Button colors
BTN_BLUE = (50, 100, 200, 255)
BTN_GOLD = (200, 160, 40, 255)
BTN_RED = (180, 50, 50, 255)
BTN_GREEN = (50, 160, 60, 255)

# Boss palettes
DRAGON_BODY = (180, 50, 30, 255)
DRAGON_BELLY = (220, 140, 40, 255)
DRAGON_WING = (140, 30, 20, 255)
DRAGON_EYE = (255, 220, 40, 255)
DRAGON_FIRE = (255, 160, 30, 255)
DRAGON_OUTLINE = (60, 20, 10, 255)

SHADOW_BODY = (40, 20, 60, 255)
SHADOW_GLOW = (120, 50, 180, 255)
SHADOW_CORE = (80, 30, 120, 255)
SHADOW_EYE = (200, 60, 255, 255)
SHADOW_AURA = (100, 40, 160, 180)
SHADOW_OUTLINE = (20, 10, 30, 255)

CRYSTAL_BODY = (60, 160, 200, 255)
CRYSTAL_LIGHT = (180, 230, 255, 255)
CRYSTAL_DARK = (30, 80, 120, 255)
CRYSTAL_EYE = (255, 255, 200, 255)
CRYSTAL_SHARD = (100, 200, 240, 255)
CRYSTAL_OUTLINE = (20, 50, 70, 255)

# VFX colors
VFX_WHITE = (255, 255, 255, 255)
VFX_YELLOW = (255, 220, 80, 255)
VFX_ORANGE = (255, 140, 40, 255)
VFX_RED = (220, 50, 30, 255)
VFX_PURPLE = (160, 60, 220, 255)
VFX_CYAN = (80, 220, 255, 255)

TRANSPARENT = (0, 0, 0, 0)

# Portal colors
PORTAL_FRAME = (80, 60, 100, 255)
PORTAL_FRAME_LIGHT = (120, 90, 150, 255)
PORTAL_INNER = (60, 20, 120, 200)
PORTAL_SWIRL = (140, 80, 220, 180)
PORTAL_GLOW = (180, 120, 255, 120)


def ensure_dir(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)


def save_asset(img, rel_path):
    full_path = os.path.join(ASSET_ROOT, rel_path)
    ensure_dir(full_path)
    img.save(full_path)
    print(f"  Created: assets/{rel_path} ({img.size[0]}x{img.size[1]})")


# ── Helper: draw a filled pixel-art rectangle with border ────────────────────
def draw_panel(draw, x, y, w, h, bg=UI_BG_DARK, border=UI_BORDER_ORANGE, border_w=2):
    """Draw a UI panel rectangle with border."""
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=border)
    draw.rectangle([x + border_w, y + border_w, x + w - 1 - border_w, y + h - 1 - border_w], fill=bg)


def draw_header(draw, x, y, w, h=14, color=UI_HEADER_GOLD):
    """Draw a colored header bar."""
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=color)


def draw_button(draw, x, y, w, h, color, label_dots=3):
    """Draw a small UI button with dot 'text'."""
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=color)
    draw.rectangle([x + 1, y + 1, x + w - 2, y + h - 2], fill=color)
    # Highlight top edge
    lighter = tuple(min(c + 40, 255) for c in color[:3]) + (255,)
    draw.line([x + 1, y + 1, x + w - 2, y + 1], fill=lighter)
    # "text" dots
    cx = x + w // 2 - (label_dots * 2) // 2
    cy = y + h // 2
    for i in range(label_dots):
        draw.point((cx + i * 2, cy), fill=UI_TEXT_WHITE)


def draw_hp_bar(draw, x, y, w, h, fill_pct=1.0, color=HP_GREEN, phase_markers=None):
    """Draw an HP bar with optional phase markers."""
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=HP_BG)
    fill_w = int((w - 2) * fill_pct)
    if fill_w > 0:
        draw.rectangle([x + 1, y + 1, x + 1 + fill_w - 1, y + h - 2], fill=color)
    # Phase markers
    if phase_markers:
        for pct in phase_markers:
            mx = x + 1 + int((w - 2) * pct)
            draw.line([mx, y, mx, y + h - 1], fill=HP_PHASE_MARKER)


def draw_slot(draw, x, y, size=16):
    """Draw an inventory/item slot."""
    draw.rectangle([x, y, x + size - 1, y + size - 1], fill=UI_SLOT_BORDER)
    draw.rectangle([x + 1, y + 1, x + size - 2, y + size - 2], fill=UI_SLOT_BG)


def draw_text_line(draw, x, y, width, color=UI_TEXT_GRAY, height=1):
    """Draw a fake text line (horizontal bar of dots)."""
    draw.rectangle([x, y, x + width - 1, y + height - 1], fill=color)


def draw_status_dot(draw, x, y, color):
    """Draw a small status indicator dot."""
    draw.rectangle([x, y, x + 2, y + 2], fill=color)


# ══════════════════════════════════════════════════════════════════════════════
# BOSS SPRITE GENERATION
# ══════════════════════════════════════════════════════════════════════════════

def draw_dragon_boss(img, ox, oy, frame=0, phase=1):
    """Draw the Dragon Overlord raid boss at 48x48."""
    draw = ImageDraw.Draw(img)
    # Body base - large draconic form
    # Phase affects color intensity
    body = DRAGON_BODY if phase < 3 else (220, 60, 30, 255)
    belly = DRAGON_BELLY
    wing = DRAGON_WING if phase < 2 else (180, 40, 20, 255)
    eye = DRAGON_EYE
    outline = DRAGON_OUTLINE

    # Breathing animation offset
    breath = [0, -1, 0, 1][frame % 4]

    # Body (large central mass)
    draw.rectangle([ox + 16, oy + 18 + breath, ox + 32, oy + 38], fill=body)
    draw.rectangle([ox + 18, oy + 20 + breath, ox + 30, oy + 36], fill=belly)

    # Head
    draw.rectangle([ox + 18, oy + 8 + breath, ox + 30, oy + 18 + breath], fill=body)
    draw.rectangle([ox + 20, oy + 10 + breath, ox + 28, oy + 16 + breath], fill=body)
    # Horns
    draw.rectangle([ox + 17, oy + 6 + breath, ox + 19, oy + 10 + breath], fill=outline)
    draw.rectangle([ox + 29, oy + 6 + breath, ox + 31, oy + 10 + breath], fill=outline)
    # Eyes
    draw.point((ox + 21, oy + 12 + breath), fill=eye)
    draw.point((ox + 27, oy + 12 + breath), fill=eye)
    # Mouth/jaw
    draw.rectangle([ox + 22, oy + 15 + breath, ox + 26, oy + 17 + breath], fill=outline)
    if frame == 1 or frame == 2:  # Open mouth for attack frames
        draw.point((ox + 23, oy + 16 + breath), fill=DRAGON_FIRE)
        draw.point((ox + 25, oy + 16 + breath), fill=DRAGON_FIRE)

    # Wings
    wing_spread = [0, 2, 4, 2][frame % 4]
    # Left wing
    draw.rectangle([ox + 6 - wing_spread, oy + 14 + breath, ox + 16, oy + 30 + breath], fill=wing)
    draw.rectangle([ox + 4 - wing_spread, oy + 16 + breath, ox + 10, oy + 26 + breath], fill=wing)
    # Right wing
    draw.rectangle([ox + 32, oy + 14 + breath, ox + 42 + wing_spread, oy + 30 + breath], fill=wing)
    draw.rectangle([ox + 38, oy + 16 + breath, ox + 44 + wing_spread, oy + 26 + breath], fill=wing)

    # Legs/claws
    draw.rectangle([ox + 18, oy + 38, ox + 22, oy + 44], fill=body)
    draw.rectangle([ox + 26, oy + 38, ox + 30, oy + 44], fill=body)
    draw.rectangle([ox + 16, oy + 42, ox + 23, oy + 44], fill=outline)
    draw.rectangle([ox + 25, oy + 42, ox + 32, oy + 44], fill=outline)

    # Tail
    draw.rectangle([ox + 32, oy + 32, ox + 40, oy + 34], fill=body)
    draw.rectangle([ox + 38, oy + 30, ox + 44, oy + 32], fill=body)
    draw.point((ox + 44, oy + 30), fill=DRAGON_FIRE)

    # Outline pass - darken edges
    # Phase 3 fire aura
    if phase == 3:
        for px in range(ox + 10, ox + 38, 3):
            fy = oy + 6 + breath + random.randint(-2, 2)
            draw.point((px, fy), fill=DRAGON_FIRE)
            draw.point((px + 1, fy - 1), fill=(255, 200, 60, 180))


def draw_shadow_boss(img, ox, oy, frame=0, phase=1):
    """Draw the Shadow Colossus raid boss at 48x48."""
    draw = ImageDraw.Draw(img)
    body = SHADOW_BODY
    glow = SHADOW_GLOW if phase < 3 else (180, 80, 255, 255)
    core = SHADOW_CORE
    eye = SHADOW_EYE
    aura = SHADOW_AURA
    outline = SHADOW_OUTLINE

    float_y = [0, -1, -2, -1][frame % 4]

    # Shadow aura (semi-transparent around body)
    if phase >= 2:
        draw.ellipse([ox + 8, oy + 10 + float_y, ox + 40, oy + 42 + float_y], fill=(40, 15, 60, 100))

    # Main body - amorphous shadow mass
    draw.ellipse([ox + 12, oy + 12 + float_y, ox + 36, oy + 40 + float_y], fill=body)
    draw.ellipse([ox + 14, oy + 14 + float_y, ox + 34, oy + 38 + float_y], fill=core)

    # Head/upper protrusion
    draw.ellipse([ox + 16, oy + 6 + float_y, ox + 32, oy + 20 + float_y], fill=body)
    draw.ellipse([ox + 18, oy + 8 + float_y, ox + 30, oy + 18 + float_y], fill=core)

    # Glowing eyes
    draw.rectangle([ox + 19, oy + 11 + float_y, ox + 22, oy + 13 + float_y], fill=eye)
    draw.rectangle([ox + 26, oy + 11 + float_y, ox + 29, oy + 13 + float_y], fill=eye)

    # Shadow tendrils
    tendril_wave = [0, 1, 2, 1][frame % 4]
    # Left tendril
    draw.rectangle([ox + 8, oy + 22 + float_y, ox + 14, oy + 26 + float_y + tendril_wave], fill=body)
    draw.rectangle([ox + 4, oy + 24 + float_y, ox + 10, oy + 28 + float_y + tendril_wave], fill=body)
    # Right tendril
    draw.rectangle([ox + 34, oy + 22 + float_y, ox + 40, oy + 26 + float_y + tendril_wave], fill=body)
    draw.rectangle([ox + 38, oy + 24 + float_y, ox + 44, oy + 28 + float_y + tendril_wave], fill=body)

    # Lower tendrils (legs)
    draw.rectangle([ox + 16, oy + 38 + float_y, ox + 20, oy + 44 + float_y], fill=body)
    draw.rectangle([ox + 28, oy + 38 + float_y, ox + 32, oy + 44 + float_y], fill=body)

    # Glow runes on body
    if phase >= 2:
        for px, py in [(22, 24), (26, 28), (20, 30), (28, 24)]:
            draw.point((ox + px, oy + py + float_y), fill=glow)

    # Phase 3 dark eruption particles
    if phase == 3:
        for i in range(4):
            px = ox + 14 + i * 6
            py = oy + 4 + float_y + random.randint(-2, 1)
            draw.point((px, py), fill=glow)


def draw_crystal_boss(img, ox, oy, frame=0, phase=1):
    """Draw the Crystal Titan raid boss at 48x48."""
    draw = ImageDraw.Draw(img)
    body = CRYSTAL_BODY
    light = CRYSTAL_LIGHT if phase < 3 else (220, 250, 255, 255)
    dark = CRYSTAL_DARK
    eye = CRYSTAL_EYE
    shard = CRYSTAL_SHARD
    outline = CRYSTAL_OUTLINE

    pulse = [0, 0, 1, 1][frame % 4]  # Subtle size pulse

    # Core body - crystalline humanoid
    # Torso
    draw.rectangle([ox + 16, oy + 16, ox + 32, oy + 34], fill=body)
    draw.rectangle([ox + 18, oy + 18, ox + 30, oy + 32], fill=dark)
    # Crystal facets (highlights)
    draw.line([ox + 20, oy + 18, ox + 24, oy + 26], fill=light)
    draw.line([ox + 28, oy + 20, ox + 24, oy + 30], fill=light)

    # Head - angular crystal
    draw.polygon([(ox + 24, oy + 4), (ox + 18, oy + 14), (ox + 30, oy + 14)], fill=body)
    draw.polygon([(ox + 24, oy + 6), (ox + 20, oy + 13), (ox + 28, oy + 13)], fill=dark)
    # Eyes
    draw.point((ox + 22, oy + 11), fill=eye)
    draw.point((ox + 26, oy + 11), fill=eye)

    # Crystal shoulders/pauldrons
    shoulder_ext = pulse
    draw.polygon([(ox + 10 - shoulder_ext, oy + 16), (ox + 16, oy + 12), (ox + 16, oy + 22)], fill=shard)
    draw.polygon([(ox + 38 + shoulder_ext, oy + 16), (ox + 32, oy + 12), (ox + 32, oy + 22)], fill=shard)

    # Arms
    arm_swing = [-1, 0, 1, 0][frame % 4]
    draw.rectangle([ox + 10, oy + 22 + arm_swing, ox + 16, oy + 34 + arm_swing], fill=body)
    draw.rectangle([ox + 32, oy + 22 - arm_swing, ox + 38, oy + 34 - arm_swing], fill=body)
    # Crystal fists
    draw.rectangle([ox + 8, oy + 32 + arm_swing, ox + 16, oy + 38 + arm_swing], fill=shard)
    draw.rectangle([ox + 32, oy + 32 - arm_swing, ox + 40, oy + 38 - arm_swing], fill=shard)

    # Legs
    draw.rectangle([ox + 18, oy + 34, ox + 23, oy + 44], fill=body)
    draw.rectangle([ox + 25, oy + 34, ox + 30, oy + 44], fill=body)
    # Crystal feet
    draw.rectangle([ox + 16, oy + 42, ox + 24, oy + 46], fill=dark)
    draw.rectangle([ox + 24, oy + 42, ox + 32, oy + 46], fill=dark)

    # Floating crystal shards (phase 2+)
    if phase >= 2:
        shard_positions = [(8, 8), (38, 6), (6, 30), (40, 28)]
        for sx, sy in shard_positions:
            sy_off = [0, -1, 0, 1][(frame + shard_positions.index((sx, sy))) % 4]
            draw.rectangle([ox + sx, oy + sy + sy_off, ox + sx + 3, oy + sy + sy_off + 5], fill=shard)
            draw.point((ox + sx + 1, oy + sy + sy_off + 1), fill=light)

    # Phase 3: bright crystal corona
    if phase == 3:
        for i in range(6):
            angle = i * 60 + frame * 15
            rx = int(24 + 20 * math.cos(math.radians(angle)))
            ry = int(24 + 20 * math.sin(math.radians(angle)))
            if 0 <= rx < 48 and 0 <= ry < 48:
                draw.point((ox + rx, oy + ry), fill=light)


def generate_boss_sprites():
    """Generate all raid boss sprite assets."""
    print("\n=== Generating Raid Boss Sprites ===")

    bosses = [
        ("dragon", draw_dragon_boss),
        ("shadow", draw_shadow_boss),
        ("crystal", draw_crystal_boss),
    ]

    for name, draw_fn in bosses:
        random.seed(42)  # Consistent randomness per boss

        # Idle animation: 4 frames at 48x48 = 192x48 strip
        idle = Image.new("RGBA", (192, 48), TRANSPARENT)
        for f in range(4):
            draw_fn(idle, f * 48, 0, frame=f, phase=1)
        save_asset(idle, f"sprites/enemies/bosses/boss_raid_{name}_idle.png")

        # Attack animation: 4 frames at 48x48 = 192x48 strip
        attack = Image.new("RGBA", (192, 48), TRANSPARENT)
        for f in range(4):
            draw_fn(attack, f * 48, 0, frame=f, phase=1)
        # Add attack VFX overlay for attack frames
        draw = ImageDraw.Draw(attack)
        # Frame 1: wind-up
        # Frame 2-3: strike with effect
        if name == "dragon":
            # Fire breath
            for f in [1, 2]:
                for i in range(6):
                    draw.rectangle([f * 48 + 22 + i * 3, 16 - i, f * 48 + 26 + i * 3, 20 + i], fill=DRAGON_FIRE)
        elif name == "shadow":
            # Shadow wave
            for f in [1, 2]:
                for i in range(5):
                    draw.rectangle([f * 48 + 4 + i * 8, 36 - i * 2, f * 48 + 10 + i * 8, 40 - i * 2], fill=SHADOW_GLOW)
        elif name == "crystal":
            # Crystal shatter
            for f in [1, 2]:
                for i in range(6):
                    cx = f * 48 + 10 + random.randint(0, 28)
                    cy = 8 + random.randint(0, 20)
                    draw.rectangle([cx, cy, cx + 2, cy + 3], fill=CRYSTAL_LIGHT)
        save_asset(attack, f"sprites/enemies/bosses/boss_raid_{name}_attack.png")

        # Phase sprites: 3 phases, 48x48 each
        for phase in range(1, 4):
            random.seed(42 + phase)
            phase_img = Image.new("RGBA", (48, 48), TRANSPARENT)
            draw_fn(phase_img, 0, 0, frame=0, phase=phase)
            save_asset(phase_img, f"sprites/enemies/bosses/boss_raid_{name}_phase{phase}.png")


# ══════════════════════════════════════════════════════════════════════════════
# UI PANEL GENERATION
# ══════════════════════════════════════════════════════════════════════════════

def generate_raid_ui_panel():
    """Generate the main raid UI panel (240x220): party roster + boss HP + raid chat."""
    print("\n=== Generating Raid UI Panel ===")
    W, H = 240, 220
    img = Image.new("RGBA", (W, H), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Main frame
    draw_panel(draw, 0, 0, W, H, bg=UI_BG_DARK, border=UI_BORDER_ORANGE, border_w=2)

    # Header: "RAID" title bar
    draw_header(draw, 2, 2, W - 4, 14, UI_HEADER_GOLD)
    draw_text_line(draw, 10, 6, 40, UI_BG_DARK)  # "RAID" text

    # ── Boss HP Bar section (top area) ──
    # Boss name placeholder
    draw_text_line(draw, 10, 20, 60, UI_TEXT_WHITE)

    # Boss HP bar with phase markers at 33% and 66%
    draw_hp_bar(draw, 10, 28, W - 20, 12, fill_pct=0.75, color=HP_GREEN, phase_markers=[0.33, 0.66])

    # Phase indicator dots
    for i in range(3):
        color = UI_HEADER_GOLD if i == 0 else UI_BG_LIGHT
        draw.ellipse([10 + i * 14, 44, 18 + i * 14, 52], fill=color)

    # ── Party Roster section (left side) ──
    roster_x, roster_y = 4, 58
    roster_w, roster_h = 140, 120
    draw_panel(draw, roster_x, roster_y, roster_w, roster_h, bg=UI_BG_MED, border=UI_BORDER_DARK, border_w=1)

    # Party member rows (up to 8 slots for a raid)
    party_colors = [
        (60, 120, 200, 255),  # Blue - tank
        (60, 120, 200, 255),  # Blue - tank
        (60, 180, 60, 255),   # Green - healer
        (60, 180, 60, 255),   # Green - healer
        (200, 50, 50, 255),   # Red - DPS
        (200, 50, 50, 255),   # Red - DPS
        (200, 160, 40, 255),  # Gold - DPS
        (200, 160, 40, 255),  # Gold - DPS
    ]
    for i in range(8):
        py = roster_y + 4 + i * 14
        # Class color indicator
        draw_status_dot(draw, roster_x + 4, py + 2, party_colors[i])
        # Player name placeholder
        draw_text_line(draw, roster_x + 10, py + 2, 50, UI_TEXT_WHITE)
        # Mini HP bar
        draw_hp_bar(draw, roster_x + 64, py + 1, 50, 6, fill_pct=0.5 + i * 0.06, color=HP_GREEN)
        # Mana bar
        draw_hp_bar(draw, roster_x + 64, py + 8, 50, 4, fill_pct=0.7 - i * 0.05, color=BTN_BLUE)
        # Status icon slot
        draw.rectangle([roster_x + 118, py, roster_x + 126, py + 10], fill=UI_SLOT_BG)

    # ── Raid Chat section (right side) ──
    chat_x, chat_y = 148, 58
    chat_w, chat_h = 88, 120
    draw_panel(draw, chat_x, chat_y, chat_w, chat_h, bg=UI_BG_MED, border=UI_BORDER_DARK, border_w=1)

    # Chat header tab
    draw_header(draw, chat_x + 1, chat_y + 1, chat_w - 2, 10, (100, 100, 110, 255))
    draw_text_line(draw, chat_x + 6, chat_y + 4, 30, UI_TEXT_WHITE)

    # Chat messages (fake text lines)
    for i in range(8):
        cy = chat_y + 14 + i * 12
        msg_color = [UI_TEXT_GRAY, UI_TEXT_WHITE, (200, 160, 40, 255), UI_TEXT_GRAY][i % 4]
        draw_text_line(draw, chat_x + 4, cy, 40 + (i * 7) % 30, msg_color)

    # Chat input field
    draw.rectangle([chat_x + 2, chat_y + chat_h - 14, chat_x + chat_w - 3, chat_y + chat_h - 3], fill=UI_SLOT_BG)
    draw.rectangle([chat_x + 3, chat_y + chat_h - 13, chat_x + chat_w - 4, chat_y + chat_h - 4], fill=(25, 25, 30, 255))

    # ── Bottom bar: raid controls ──
    bar_y = 182
    draw_panel(draw, 4, bar_y, W - 8, 34, bg=UI_BG_MED, border=UI_BORDER_DARK, border_w=1)

    # Raid ready check button
    draw_button(draw, 10, bar_y + 6, 50, 14, BTN_GREEN, label_dots=5)
    # Pull timer button
    draw_button(draw, 66, bar_y + 6, 50, 14, BTN_GOLD, label_dots=4)
    # Loot rules button
    draw_button(draw, 122, bar_y + 6, 50, 14, BTN_BLUE, label_dots=4)
    # Leave raid button
    draw_button(draw, 178, bar_y + 6, 50, 14, BTN_RED, label_dots=4)

    save_asset(img, "ui/raid/ui_panel_raid.png")


def generate_raid_boss_hp_frame():
    """Generate the raid boss HP bar frame (200x20) with phase markers."""
    print("\n=== Generating Raid Boss HP Frame ===")
    W, H = 200, 20
    img = Image.new("RGBA", (W, H), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Outer frame
    draw.rectangle([0, 0, W - 1, H - 1], fill=UI_BORDER_ORANGE)
    draw.rectangle([1, 1, W - 2, H - 2], fill=UI_BORDER_DARK)
    draw.rectangle([2, 2, W - 3, H - 3], fill=HP_BG)

    # HP fill (full by default - will be masked in-game)
    draw.rectangle([3, 3, W - 4, H - 4], fill=HP_RED)

    # Phase dividers at 33% and 66%
    for pct in [0.33, 0.66]:
        mx = 3 + int((W - 7) * pct)
        draw.line([mx, 2, mx, H - 3], fill=HP_PHASE_MARKER)
        draw.line([mx - 1, 0, mx - 1, H - 1], fill=UI_BORDER_DARK)
        draw.line([mx + 1, 0, mx + 1, H - 1], fill=UI_BORDER_DARK)

    # Small skull icon at center top
    draw.rectangle([W // 2 - 3, 0, W // 2 + 3, 4], fill=UI_BORDER_ORANGE)
    draw.rectangle([W // 2 - 2, 1, W // 2 + 2, 3], fill=UI_BG_DARK)
    draw.point((W // 2 - 1, 2), fill=HP_RED)
    draw.point((W // 2 + 1, 2), fill=HP_RED)

    save_asset(img, "ui/raid/ui_raid_boss_hp_frame.png")


def generate_loot_dialog():
    """Generate raid loot distribution dialog (200x120)."""
    print("\n=== Generating Raid Loot Dialog ===")
    W, H = 200, 120
    img = Image.new("RGBA", (W, H), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Main frame
    draw_panel(draw, 0, 0, W, H, bg=UI_BG_DARK, border=UI_BORDER_ORANGE, border_w=2)

    # Header: "LOOT"
    draw_header(draw, 2, 2, W - 4, 14, UI_HEADER_GOLD)
    draw_text_line(draw, 10, 6, 30, UI_BG_DARK)

    # Item preview area (left side)
    item_x, item_y = 8, 20
    # Item icon slot (large)
    draw_slot(draw, item_x, item_y, 32)
    # Rarity border (epic purple)
    draw.rectangle([item_x, item_y, item_x + 31, item_y + 31], outline=(160, 60, 220, 255))
    # Item icon placeholder (sword shape)
    draw.line([item_x + 10, item_y + 6, item_x + 22, item_y + 26], fill=UI_TEXT_WHITE)
    draw.line([item_x + 12, item_y + 18, item_x + 20, item_y + 18], fill=UI_TEXT_WHITE)

    # Item name and stats
    draw_text_line(draw, 46, 22, 80, (160, 60, 220, 255))  # Purple item name
    draw_text_line(draw, 46, 30, 60, UI_TEXT_GRAY)  # Item type
    draw_text_line(draw, 46, 40, 70, UI_TEXT_WHITE)  # Stat line 1
    draw_text_line(draw, 46, 48, 50, UI_TEXT_WHITE)  # Stat line 2

    # Timer bar
    draw.rectangle([8, 58, W - 8, 62], fill=HP_BG)
    draw.rectangle([9, 59, W - 40, 61], fill=UI_HEADER_GOLD)  # Countdown

    # Need / Greed / Pass buttons
    btn_y = 68
    btn_w = 56
    btn_h = 18

    # NEED button (blue)
    draw_button(draw, 10, btn_y, btn_w, btn_h, BTN_BLUE, label_dots=4)
    # Dice icon
    draw.rectangle([14, btn_y + 4, 20, btn_y + 12], fill=UI_TEXT_WHITE)
    draw.point((16, btn_y + 6), fill=BTN_BLUE)
    draw.point((18, btn_y + 10), fill=BTN_BLUE)

    # GREED button (gold)
    draw_button(draw, 72, btn_y, btn_w, btn_h, BTN_GOLD, label_dots=5)
    # Coin icon
    draw.ellipse([76, btn_y + 4, 82, btn_y + 12], fill=UI_HEADER_GOLD)
    draw.point((79, btn_y + 8), fill=UI_BORDER_DARK)

    # PASS button (red/gray)
    draw_button(draw, 134, btn_y, btn_w, btn_h, (100, 60, 60, 255), label_dots=4)
    # X icon
    draw.line([138, btn_y + 5, 144, btn_y + 13], fill=UI_TEXT_WHITE)
    draw.line([144, btn_y + 5, 138, btn_y + 13], fill=UI_TEXT_WHITE)

    # Roll results area
    results_y = 92
    draw.rectangle([8, results_y, W - 8, H - 4], fill=UI_BG_MED)
    # Sample roll entries
    for i in range(2):
        ry = results_y + 2 + i * 10
        # Player name
        draw_text_line(draw, 12, ry + 2, 40, UI_TEXT_WHITE)
        # Roll type icon
        color = BTN_BLUE if i == 0 else BTN_GOLD
        draw.rectangle([56, ry + 1, 62, ry + 7], fill=color)
        # Roll number
        draw_text_line(draw, 66, ry + 2, 16, UI_TEXT_WHITE)

    save_asset(img, "ui/raid/ui_panel_raid_loot.png")


def generate_lockout_calendar():
    """Generate raid lockout calendar UI element (180x140)."""
    print("\n=== Generating Raid Lockout Calendar ===")
    W, H = 180, 140
    img = Image.new("RGBA", (W, H), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Main frame
    draw_panel(draw, 0, 0, W, H, bg=UI_BG_DARK, border=UI_BORDER_ORANGE, border_w=2)

    # Header
    draw_header(draw, 2, 2, W - 4, 14, UI_HEADER_GOLD)
    draw_text_line(draw, 10, 6, 50, UI_BG_DARK)  # "LOCKOUTS"

    # Navigation arrows
    draw.polygon([(8, 24), (14, 20), (14, 28)], fill=UI_TEXT_WHITE)  # Left arrow
    draw.polygon([(W - 8, 24), (W - 14, 20), (W - 14, 28)], fill=UI_TEXT_WHITE)  # Right arrow
    # Week label
    draw_text_line(draw, W // 2 - 20, 22, 40, UI_TEXT_WHITE)

    # Day headers (7 columns)
    day_w = 22
    day_start_x = 8
    day_start_y = 34
    day_colors = [UI_TEXT_GRAY] * 5 + [UI_HEADER_GOLD, UI_HEADER_GOLD]  # Weekdays gray, weekend gold
    for d in range(7):
        dx = day_start_x + d * day_w + 2
        draw_text_line(draw, dx, day_start_y, 10, day_colors[d])

    # Calendar grid (5 rows x 7 cols)
    for row in range(5):
        for col in range(7):
            cx = day_start_x + col * day_w
            cy = day_start_y + 10 + row * 18

            # Day cell
            draw.rectangle([cx, cy, cx + day_w - 2, cy + 14], fill=UI_BG_MED)
            draw.rectangle([cx + 1, cy + 1, cx + day_w - 3, cy + 13], fill=UI_SLOT_BG)

            # Day number dot
            draw_text_line(draw, cx + 3, cy + 2, 6, UI_TEXT_GRAY)

            # Lockout indicators (simulate some locked-out days)
            if row < 3 and col < 5 and (row * 7 + col) % 3 == 0:
                # Red X = locked out
                draw.line([cx + 4, cy + 6, cx + day_w - 6, cy + 12], fill=HP_RED)
                draw.line([cx + day_w - 6, cy + 6, cx + 4, cy + 12], fill=HP_RED)
            elif row == 1 and col == 3:
                # Green check = available
                draw.line([cx + 6, cy + 10, cx + 10, cy + 12], fill=HP_GREEN)
                draw.line([cx + 10, cy + 12, cx + day_w - 6, cy + 6], fill=HP_GREEN)

    # Reset timer at bottom
    draw.rectangle([4, H - 18, W - 4, H - 4], fill=UI_BG_MED)
    draw_text_line(draw, 8, H - 14, 40, UI_TEXT_GRAY)  # "Resets in:"
    draw_text_line(draw, 52, H - 14, 30, UI_HEADER_GOLD)  # Timer value

    save_asset(img, "ui/raid/ui_raid_lockout_calendar.png")


# ══════════════════════════════════════════════════════════════════════════════
# VFX GENERATION
# ══════════════════════════════════════════════════════════════════════════════

def generate_phase_flash_vfx():
    """Generate boss phase transition screen flash (6 frames, 192x32 strip)."""
    print("\n=== Generating Phase Transition VFX ===")
    W, H = 192, 32
    img = Image.new("RGBA", (W, H), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # 6 frames: build-up -> flash -> fade
    frame_alphas = [40, 100, 200, 255, 160, 60]
    frame_colors = [
        (255, 200, 60),   # Warm gold buildup
        (255, 220, 100),  # Brighter
        (255, 240, 180),  # Near white
        (255, 255, 255),  # Full white flash
        (255, 220, 140),  # Fade warm
        (255, 180, 80),   # Fade out
    ]

    for f in range(6):
        fx = f * 32
        r, g, b = frame_colors[f]
        a = frame_alphas[f]

        # Radial flash from center
        cx, cy = fx + 16, 16
        for radius in range(16, 0, -2):
            ra = max(0, a - (16 - radius) * 12)
            if ra > 0:
                draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                             fill=(r, g, b, ra))

        # Bright center point
        if f >= 2 and f <= 4:
            draw.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(255, 255, 255, min(255, a + 40)))

    save_asset(img, "vfx/vfx_raid_phase_flash.png")


def generate_particle_burst_vfx():
    """Generate particle burst effect (6 frames, 192x32 strip)."""
    print("\n=== Generating Particle Burst VFX ===")
    W, H = 192, 32
    img = Image.new("RGBA", (W, H), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    random.seed(123)
    # Pre-generate particle directions
    num_particles = 12
    particles = []
    for i in range(num_particles):
        angle = (360 / num_particles) * i + random.uniform(-10, 10)
        speed = random.uniform(1.5, 3.0)
        color = random.choice([VFX_YELLOW, VFX_ORANGE, VFX_RED, VFX_WHITE, VFX_PURPLE])
        particles.append((angle, speed, color))

    for f in range(6):
        fx = f * 32
        cx, cy = fx + 16, 16

        # Center glow (fades over frames)
        if f < 4:
            glow_a = max(0, 200 - f * 60)
            draw.ellipse([cx - 4 + f, cy - 4 + f, cx + 4 - f, cy + 4 - f],
                         fill=(255, 220, 100, glow_a))

        # Particles expand outward
        for angle, speed, color in particles:
            dist = speed * (f + 1)
            px = int(cx + dist * math.cos(math.radians(angle)))
            py = int(cy + dist * math.sin(math.radians(angle)))

            # Fade out over time
            alpha = max(0, 255 - f * 40)
            r, g, b, _ = color
            if fx <= px < fx + 32 and 0 <= py < 32:
                draw.point((px, py), fill=(r, g, b, alpha))
                # Slightly larger for first frames
                if f < 3:
                    for dx, dy in [(1, 0), (0, 1)]:
                        npx, npy = px + dx, py + dy
                        if fx <= npx < fx + 32 and 0 <= npy < 32:
                            draw.point((npx, npy), fill=(r, g, b, alpha // 2))

    save_asset(img, "vfx/vfx_raid_particle_burst.png")


# ══════════════════════════════════════════════════════════════════════════════
# PORTAL & ZONE TRANSITION
# ══════════════════════════════════════════════════════════════════════════════

def generate_raid_portal():
    """Generate raid entrance portal sprite (32x48, 4-frame animation strip = 128x48)."""
    print("\n=== Generating Raid Portal Sprite ===")
    W, H = 128, 48  # 4 frames at 32x48
    img = Image.new("RGBA", (W, H), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    for f in range(4):
        fx = f * 32
        # Stone archway frame
        # Left pillar
        draw.rectangle([fx + 4, oy := 8, fx + 10, 46], fill=PORTAL_FRAME)
        draw.rectangle([fx + 5, 9, fx + 9, 45], fill=PORTAL_FRAME_LIGHT)
        # Right pillar
        draw.rectangle([fx + 22, 8, fx + 28, 46], fill=PORTAL_FRAME)
        draw.rectangle([fx + 23, 9, fx + 27, 45], fill=PORTAL_FRAME_LIGHT)
        # Arch top
        draw.arc([fx + 4, 2, fx + 28, 24], 180, 0, fill=PORTAL_FRAME, width=3)
        draw.rectangle([fx + 4, 12, fx + 28, 16], fill=PORTAL_FRAME)

        # Keystone at top
        draw.rectangle([fx + 13, 2, fx + 19, 8], fill=UI_HEADER_GOLD)
        draw.point((fx + 16, 5), fill=HP_RED)  # Gem

        # Portal inner (animated swirl)
        inner_x1, inner_y1 = fx + 10, 16
        inner_x2, inner_y2 = fx + 22, 44
        draw.rectangle([inner_x1, inner_y1, inner_x2, inner_y2], fill=PORTAL_INNER)

        # Swirl effect
        swirl_offset = f * 3
        for y in range(inner_y1 + 1, inner_y2):
            wave = int(2 * math.sin((y + swirl_offset) * 0.5))
            cx = (inner_x1 + inner_x2) // 2 + wave
            draw.point((cx, y), fill=PORTAL_SWIRL)
            if abs(wave) > 0:
                draw.point((cx - 1, y), fill=PORTAL_GLOW)
                draw.point((cx + 1, y), fill=PORTAL_GLOW)

        # Glow particles around portal
        for i in range(3):
            gx = fx + 8 + (i * 8 + f * 3) % 18
            gy = 10 + (i * 7 + f * 5) % 30
            alpha = [160, 200, 255, 200][f]
            draw.point((gx, gy), fill=(180, 120, 255, alpha))

        # Base stones
        draw.rectangle([fx + 2, 44, fx + 30, 47], fill=PORTAL_FRAME)
        draw.rectangle([fx + 3, 44, fx + 29, 46], fill=PORTAL_FRAME_LIGHT)

    save_asset(img, "sprites/enemies/bosses/sprite_raid_portal.png")


def generate_zone_transition():
    """Generate zone transition overlay effect (6 frames, 192x32 strip)."""
    print("\n=== Generating Zone Transition Art ===")
    W, H = 192, 32
    img = Image.new("RGBA", (W, H), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Transition: dark purple sweep from edges to center, then clear
    for f in range(6):
        fx = f * 32

        if f < 3:
            # Closing: dark edges sweep in
            coverage = (f + 1) * 5  # pixels from each edge
            # Left dark
            draw.rectangle([fx, 0, fx + coverage, 31], fill=(20, 10, 40, 200))
            # Right dark
            draw.rectangle([fx + 32 - coverage, 0, fx + 31, 31], fill=(20, 10, 40, 200))
            # Top dark
            draw.rectangle([fx, 0, fx + 31, coverage], fill=(20, 10, 40, 150))
            # Bottom dark
            draw.rectangle([fx, 32 - coverage, fx + 31, 31], fill=(20, 10, 40, 150))
        else:
            # Opening: dark edges retreat
            coverage = (6 - f) * 5
            if coverage > 0:
                draw.rectangle([fx, 0, fx + coverage, 31], fill=(20, 10, 40, 200))
                draw.rectangle([fx + 32 - coverage, 0, fx + 31, 31], fill=(20, 10, 40, 200))
                draw.rectangle([fx, 0, fx + 31, coverage], fill=(20, 10, 40, 150))
                draw.rectangle([fx, 32 - coverage, fx + 31, 31], fill=(20, 10, 40, 150))

        # Sparkle particles at edges
        for i in range(4):
            sx = fx + random.randint(2, 29)
            sy = random.randint(2, 29)
            draw.point((sx, sy), fill=(180, 120, 255, 100 + f * 20))

    save_asset(img, "vfx/vfx_raid_zone_transition.png")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    random.seed(42)
    print("PixelRealm Raid Asset Generator")
    print("=" * 50)

    # Boss sprites
    generate_boss_sprites()

    # UI elements
    generate_raid_ui_panel()
    generate_raid_boss_hp_frame()
    generate_loot_dialog()
    generate_lockout_calendar()

    # VFX
    generate_phase_flash_vfx()
    generate_particle_burst_vfx()

    # Portal & transitions
    generate_raid_portal()
    generate_zone_transition()

    print("\n" + "=" * 50)
    print("All raid assets generated successfully!")
