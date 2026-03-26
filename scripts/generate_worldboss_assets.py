#!/usr/bin/env python3
"""
Generate world boss sprites and battle event art for PixelRealm.
PIX-310: World boss event system art assets.

All assets use the master 32-color palette from ART-STYLE-GUIDE.md.
World boss sprites are 64x64 (Giant+ class, double dungeon boss size).
"""
import sys
sys.path.insert(0, '/tmp/pip_pkgs')

from PIL import Image, ImageDraw
import os
import math
import random

# === MASTER PALETTE (32 colors from ART-STYLE-GUIDE.md) ===
PALETTE = {
    # Neutrals
    'shadow_black':   (13, 13, 13),
    'dark_rock':      (43, 43, 43),
    'stone_gray':     (74, 74, 74),
    'mid_gray':       (110, 110, 110),
    'light_stone':    (150, 150, 150),
    'pale_gray':      (200, 200, 200),
    'near_white':     (240, 240, 240),
    # Warm Earth
    'deep_soil':      (59, 32, 16),
    'rich_earth':     (107, 58, 31),
    'dirt':           (139, 92, 42),
    'sand':           (184, 132, 63),
    'desert_gold':    (212, 168, 90),
    'pale_sand':      (232, 208, 138),
    # Greens
    'deep_forest':    (26, 58, 26),
    'forest_green':   (45, 110, 45),
    'leaf_green':     (76, 155, 76),
    'bright_grass':   (120, 200, 120),
    'light_foliage':  (168, 228, 160),
    # Blues
    'deep_ocean':     (10, 26, 58),
    'ocean_blue':     (26, 74, 138),
    'sky_blue':       (42, 122, 192),
    'player_blue':    (80, 168, 232),
    'ice_water':      (144, 208, 248),
    'shimmer':        (200, 240, 255),
    # Red/Orange
    'deep_blood':     (90, 10, 10),
    'enemy_red':      (160, 16, 16),
    'bright_red':     (212, 32, 32),
    'fire_orange':    (240, 96, 32),
    'ember':          (248, 160, 96),
    # Yellow/Gold
    'dark_gold':      (168, 112, 0),
    'gold':           (232, 184, 0),
    'bright_yellow':  (255, 224, 64),
    'pale_highlight': (255, 248, 160),
    # Purple/Magenta
    'deep_magic':     (26, 10, 58),
    'magic_purple':   (90, 32, 160),
    'mana_violet':    (144, 80, 224),
    'spell_glow':     (208, 144, 255),
}

TRANSPARENT = (0, 0, 0, 0)
ASSET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def px(draw, x, y, color, alpha=255):
    """Draw a single pixel with optional alpha."""
    if isinstance(color, str):
        color = PALETTE[color]
    draw.point((x, y), fill=(*color, alpha))

def fill_rect(draw, x, y, w, h, color, alpha=255):
    """Fill a rectangle."""
    if isinstance(color, str):
        color = PALETTE[color]
    for dy in range(h):
        for dx in range(w):
            draw.point((x + dx, y + dy), fill=(*color, alpha))

def fill_ellipse(draw, cx, cy, rx, ry, color, alpha=255):
    """Fill an ellipse centered at cx,cy with radii rx,ry."""
    if isinstance(color, str):
        color = PALETTE[color]
    for dy in range(-ry, ry + 1):
        for dx in range(-rx, rx + 1):
            if (dx * dx) / max(rx * rx, 1) + (dy * dy) / max(ry * ry, 1) <= 1.0:
                draw.point((cx + dx, cy + dy), fill=(*color, alpha))

def fill_circle(draw, cx, cy, r, color, alpha=255):
    fill_ellipse(draw, cx, cy, r, r, color, alpha)

def draw_line(draw, x1, y1, x2, y2, color, alpha=255):
    """Draw a 1px line using Bresenham's."""
    if isinstance(color, str):
        color = PALETTE[color]
    dx = abs(x2 - x1)
    dy = abs(y2 - y1)
    sx = 1 if x1 < x2 else -1
    sy = 1 if y1 < y2 else -1
    err = dx - dy
    while True:
        draw.point((x1, y1), fill=(*color, alpha))
        if x1 == x2 and y1 == y2:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x1 += sx
        if e2 < dx:
            err += dx
            y1 += sy

# =====================================================================
# WORLD BOSS 1: INFERNO WYRM (Fire Dragon)
# Massive serpentine dragon, red/orange/ember palette
# =====================================================================
def draw_inferno_wyrm(frame_idx, anim_type='idle'):
    """Draw the Inferno Wyrm world boss. 64x64."""
    img = Image.new('RGBA', (64, 64), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Animation offsets
    breathe = [0, 1, 0, -1][frame_idx % 4] if anim_type == 'idle' else 0
    attack_phase = frame_idx if anim_type == 'attack' else 0

    # Body - massive serpentine form
    # Main body (thick serpent torso)
    body_y = 34 + breathe
    fill_ellipse(d, 32, body_y, 18, 12, 'enemy_red')
    fill_ellipse(d, 32, body_y, 16, 10, 'bright_red')
    # Dark underbelly
    fill_ellipse(d, 32, body_y + 4, 14, 5, 'deep_blood')

    # Scales detail on body
    for sx in range(-12, 13, 4):
        for sy in range(-6, 7, 4):
            if (sx + sy) % 8 == 0:
                px(d, 32 + sx, body_y + sy, 'fire_orange')

    # Tail - curling to the right
    tail_points = [(50, body_y + 2), (55, body_y + 6), (58, body_y + 10),
                   (59, body_y + 14), (57, body_y + 17), (54, body_y + 18)]
    for i, (tx, ty) in enumerate(tail_points):
        r = max(6 - i, 2)
        fill_circle(d, tx, ty, r, 'enemy_red')
        fill_circle(d, tx, ty, r - 1, 'bright_red')
    # Tail spikes
    for i in range(0, len(tail_points) - 1, 2):
        tx, ty = tail_points[i]
        px(d, tx, ty - 3, 'fire_orange')
        px(d, tx + 1, ty - 4, 'ember')

    # Neck - rising up
    neck_y = body_y - 8
    fill_ellipse(d, 26, neck_y, 8, 10, 'enemy_red')
    fill_ellipse(d, 26, neck_y, 6, 8, 'bright_red')

    # Head
    head_y = neck_y - 10 + breathe
    head_x = 24
    if anim_type == 'attack' and attack_phase >= 3:
        head_x += 3  # Lunge forward
        head_y += 2

    fill_ellipse(d, head_x, head_y, 10, 7, 'bright_red')
    fill_ellipse(d, head_x, head_y, 8, 5, 'enemy_red')
    # Snout
    fill_ellipse(d, head_x - 8, head_y + 1, 5, 3, 'bright_red')
    fill_ellipse(d, head_x - 8, head_y + 2, 4, 2, 'deep_blood')

    # Eyes (menacing, glowing)
    eye_glow = 'bright_yellow' if frame_idx % 2 == 0 else 'gold'
    px(d, head_x - 4, head_y - 3, eye_glow)
    px(d, head_x - 3, head_y - 3, eye_glow)
    px(d, head_x - 4, head_y - 2, 'shadow_black')  # pupil
    px(d, head_x + 1, head_y - 3, eye_glow)
    px(d, head_x + 2, head_y - 3, eye_glow)
    px(d, head_x + 1, head_y - 2, 'shadow_black')

    # Horns
    for hx_off in [-5, 5]:
        hx = head_x + hx_off
        draw_line(d, hx, head_y - 5, hx + (2 if hx_off > 0 else -2), head_y - 12, 'dark_rock')
        px(d, hx + (2 if hx_off > 0 else -2), head_y - 12, 'ember')

    # Wings (large, bat-like)
    wing_flap = [0, -2, -1, 1][frame_idx % 4] if anim_type == 'idle' else [-1, 0, 2, 3, 1, -1][frame_idx % 6]

    # Left wing
    wing_base_y = body_y - 8
    for i in range(12):
        wy = wing_base_y - i + wing_flap
        wx_start = 14 - i
        wx_end = 14
        fill_rect(d, max(wx_start, 1), wy, wx_end - max(wx_start, 1), 1, 'deep_blood')
        if i % 3 == 0:
            draw_line(d, 14, wing_base_y, max(wx_start, 1), wy, 'enemy_red')
    # Wing membrane
    for i in range(8):
        wy = wing_base_y - i + wing_flap
        fill_rect(d, max(6 - i // 2, 1), wy, 8 + i // 2, 1, 'deep_blood', 180)

    # Right wing
    for i in range(12):
        wy = wing_base_y - i + wing_flap
        wx_start = 50
        wx_end = min(50 + i, 62)
        fill_rect(d, wx_start, wy, wx_end - wx_start, 1, 'deep_blood')
        if i % 3 == 0:
            draw_line(d, 50, wing_base_y, min(wx_end, 62), wy, 'enemy_red')
    for i in range(8):
        wy = wing_base_y - i + wing_flap
        fill_rect(d, 50, wy, min(8 + i // 2, 13), 1, 'deep_blood', 180)

    # Fire breath (attack animation)
    if anim_type == 'attack' and attack_phase >= 2:
        fire_intensity = min(attack_phase - 1, 4)
        for fi in range(fire_intensity * 3):
            fx = head_x - 12 - fi * 2
            fy = head_y + 1 + (fi % 3 - 1) * 2
            if 0 <= fx < 64 and 0 <= fy < 64:
                r = max(4 - fi // 2, 1)
                color = ['bright_yellow', 'fire_orange', 'bright_red', 'ember'][fi % 4]
                fill_circle(d, fx, fy, r, color, 200)

    # Legs (front pair visible)
    leg_y = body_y + 8
    for lx in [22, 42]:
        fill_rect(d, lx, leg_y, 3, 8, 'deep_blood')
        fill_rect(d, lx - 1, leg_y + 7, 5, 2, 'dark_rock')  # claws
        px(d, lx - 2, leg_y + 8, 'ember')
        px(d, lx + 3, leg_y + 8, 'ember')

    # Ember particles
    random.seed(42 + frame_idx)
    for _ in range(5):
        ex = random.randint(5, 58)
        ey = random.randint(2, 20)
        px(d, ex, ey, 'bright_yellow', 160)

    return img


# =====================================================================
# WORLD BOSS 2: VOID LEVIATHAN (Cosmic Horror)
# Massive tentacled cosmic entity, purple/dark palette
# =====================================================================
def draw_void_leviathan(frame_idx, anim_type='idle'):
    """Draw the Void Leviathan world boss. 64x64."""
    img = Image.new('RGBA', (64, 64), TRANSPARENT)
    d = ImageDraw.Draw(img)

    pulse = [0, 1, 2, 1][frame_idx % 4] if anim_type == 'idle' else 0
    attack_phase = frame_idx if anim_type == 'attack' else 0

    # Dark aura background
    fill_circle(d, 32, 30, 28 + pulse, 'deep_magic', 60)
    fill_circle(d, 32, 30, 24 + pulse, 'deep_magic', 90)

    # Main body - large amorphous mass
    body_cx, body_cy = 32, 28
    fill_ellipse(d, body_cx, body_cy, 16 + pulse, 14 + pulse, 'deep_magic')
    fill_ellipse(d, body_cx, body_cy, 14 + pulse, 12 + pulse, 'magic_purple')
    fill_ellipse(d, body_cx, body_cy, 10, 8, 'mana_violet', 180)

    # Central eye (massive, glowing)
    eye_cx, eye_cy = 32, 24
    fill_ellipse(d, eye_cx, eye_cy, 8, 6, 'shadow_black')
    fill_ellipse(d, eye_cx, eye_cy, 6, 4, 'deep_magic')
    # Iris
    iris_color = 'spell_glow' if frame_idx % 2 == 0 else 'mana_violet'
    fill_ellipse(d, eye_cx, eye_cy, 4, 3, iris_color)
    # Pupil (vertical slit)
    fill_rect(d, eye_cx - 1, eye_cy - 2, 2, 5, 'shadow_black')
    # Eye glow
    px(d, eye_cx - 3, eye_cy - 1, 'spell_glow', 200)
    px(d, eye_cx + 3, eye_cy - 1, 'spell_glow', 200)

    # Secondary eyes (smaller, scattered)
    secondary_eyes = [(22, 20), (42, 20), (20, 30), (44, 30), (26, 34), (38, 34)]
    for i, (ex, ey) in enumerate(secondary_eyes):
        ey_adj = ey + pulse * (1 if i % 2 == 0 else -1)
        fill_circle(d, ex, ey_adj, 2, 'shadow_black')
        px(d, ex, ey_adj, 'spell_glow' if (frame_idx + i) % 3 != 0 else 'mana_violet')

    # Tentacles (8 writhing appendages)
    tentacle_bases = [
        (16, 34), (12, 28), (10, 22),   # left
        (48, 34), (52, 28), (54, 22),   # right
        (26, 42), (38, 42),              # bottom
    ]

    for ti, (tx, ty) in enumerate(tentacle_bases):
        wave = math.sin(frame_idx * 0.8 + ti * 1.5) * 3
        segments = 6
        cx, cy = tx, ty
        for s in range(segments):
            # Direction toward outside
            if tx < 32:
                nx = cx - 2 + int(wave * (s / segments))
            else:
                nx = cx + 2 - int(wave * (s / segments))
            if ty > 32:
                ny = cy + 2 + abs(int(wave * 0.5))
            else:
                ny = cy + 1

            r = max(4 - s, 1)
            fill_circle(d, int(cx), int(cy), r, 'magic_purple')
            if r > 1:
                fill_circle(d, int(cx), int(cy), r - 1, 'mana_violet', 180)
            cx, cy = nx, ny
        # Tentacle tip glow
        px(d, int(cx), int(cy), 'spell_glow', 220)

    # Void blast (attack animation)
    if anim_type == 'attack' and attack_phase >= 2:
        blast_r = (attack_phase - 1) * 4
        for angle_deg in range(0, 360, 30):
            angle = math.radians(angle_deg + frame_idx * 15)
            bx = int(eye_cx + math.cos(angle) * blast_r)
            by = int(eye_cy + math.sin(angle) * blast_r)
            if 0 <= bx < 64 and 0 <= by < 64:
                fill_circle(d, bx, by, 2, 'spell_glow', 180)
                px(d, bx, by, 'near_white', 200)

    # Floating particles
    random.seed(100 + frame_idx)
    for _ in range(8):
        ppx = random.randint(4, 59)
        ppy = random.randint(4, 59)
        px(d, ppx, ppy, 'spell_glow', 120)

    # Crown of dark spikes
    for sx in range(-14, 15, 4):
        spike_h = abs(sx) // 2 + 3
        bx = body_cx + sx
        by = body_cy - 14 - pulse
        for sh in range(spike_h):
            px(d, bx, by - sh, 'deep_magic')
        px(d, bx, by - spike_h, 'mana_violet')

    return img


# =====================================================================
# WORLD BOSS 3: STORM COLOSSUS (Lightning Giant)
# Massive armored titan crackling with lightning, blue/yellow palette
# =====================================================================
def draw_storm_colossus(frame_idx, anim_type='idle'):
    """Draw the Storm Colossus world boss. 64x64."""
    img = Image.new('RGBA', (64, 64), TRANSPARENT)
    d = ImageDraw.Draw(img)

    sway = [0, 1, 0, -1][frame_idx % 4] if anim_type == 'idle' else 0
    attack_phase = frame_idx if anim_type == 'attack' else 0

    # Body - massive armored humanoid torso
    torso_x, torso_y = 32, 30
    # Torso
    fill_ellipse(d, torso_x, torso_y, 14, 12, 'ocean_blue')
    fill_ellipse(d, torso_x, torso_y, 12, 10, 'sky_blue')
    # Armor plates
    fill_rect(d, 22, 24, 20, 3, 'stone_gray')
    fill_rect(d, 24, 28, 16, 2, 'mid_gray')
    fill_rect(d, 22, 34, 20, 3, 'stone_gray')
    # Chest emblem (lightning bolt)
    draw_line(d, 32, 26, 30, 30, 'bright_yellow')
    draw_line(d, 30, 30, 33, 29, 'bright_yellow')
    draw_line(d, 33, 29, 31, 33, 'bright_yellow')
    px(d, 31, 33, 'gold')

    # Head - helmet
    head_y = 14 + sway
    fill_ellipse(d, 32, head_y, 8, 7, 'stone_gray')
    fill_ellipse(d, 32, head_y, 6, 5, 'mid_gray')
    # Visor slit
    fill_rect(d, 27, head_y - 1, 10, 2, 'shadow_black')
    # Glowing eyes behind visor
    eye_color = 'bright_yellow' if frame_idx % 2 == 0 else 'gold'
    px(d, 29, head_y - 1, eye_color)
    px(d, 30, head_y - 1, eye_color)
    px(d, 34, head_y - 1, eye_color)
    px(d, 35, head_y - 1, eye_color)
    # Helmet horns/crest
    draw_line(d, 26, head_y - 4, 22, head_y - 10, 'light_stone')
    draw_line(d, 38, head_y - 4, 42, head_y - 10, 'light_stone')
    px(d, 22, head_y - 10, 'ice_water')
    px(d, 42, head_y - 10, 'ice_water')
    # Central crest
    for cy_off in range(6):
        px(d, 32, head_y - 6 - cy_off, 'player_blue')
    px(d, 32, head_y - 12, 'bright_yellow')

    # Shoulders (massive pauldrons)
    for side in [-1, 1]:
        sx = torso_x + side * 18
        fill_ellipse(d, sx, 22, 7, 5, 'stone_gray')
        fill_ellipse(d, sx, 22, 5, 3, 'mid_gray')
        # Shoulder spike
        px(d, sx, 16, 'ice_water')
        draw_line(d, sx, 22, sx, 16, 'light_stone')

    # Arms
    arm_raise = 0
    if anim_type == 'attack':
        arm_raise = min(attack_phase * 3, 10)

    # Left arm
    fill_rect(d, 10, 24 - arm_raise, 5, 16, 'ocean_blue')
    fill_rect(d, 11, 25 - arm_raise, 3, 14, 'sky_blue')
    # Left fist
    fill_rect(d, 9, 38 - arm_raise, 7, 5, 'stone_gray')

    # Right arm (weapon arm)
    fill_rect(d, 49, 24 - arm_raise, 5, 16, 'ocean_blue')
    fill_rect(d, 50, 25 - arm_raise, 3, 14, 'sky_blue')
    # Right fist + hammer
    fill_rect(d, 48, 38 - arm_raise, 7, 5, 'stone_gray')
    # Hammer handle
    draw_line(d, 51, 36 - arm_raise, 51, 48 - arm_raise, 'dark_rock')
    # Hammer head
    fill_rect(d, 47, 48 - arm_raise, 9, 5, 'light_stone')
    fill_rect(d, 48, 49 - arm_raise, 7, 3, 'pale_gray')
    px(d, 51, 49 - arm_raise, 'bright_yellow')  # Lightning core

    # Legs
    leg_y = 40
    for lx_off in [-6, 6]:
        lx = torso_x + lx_off
        fill_rect(d, lx - 3, leg_y, 6, 14, 'ocean_blue')
        fill_rect(d, lx - 2, leg_y + 1, 4, 12, 'sky_blue')
        # Boots
        fill_rect(d, lx - 4, leg_y + 12, 8, 4, 'stone_gray')
        fill_rect(d, lx - 3, leg_y + 13, 6, 2, 'mid_gray')

    # Lightning crackling (always present, varies per frame)
    random.seed(200 + frame_idx)
    for _ in range(4 + (attack_phase * 2 if anim_type == 'attack' else 0)):
        lx1 = random.randint(8, 56)
        ly1 = random.randint(4, 58)
        lx2 = lx1 + random.randint(-8, 8)
        ly2 = ly1 + random.randint(-8, 8)
        lx2 = max(0, min(63, lx2))
        ly2 = max(0, min(63, ly2))
        lcolor = ['bright_yellow', 'gold', 'shimmer', 'ice_water'][random.randint(0, 3)]
        draw_line(d, lx1, ly1, lx2, ly2, lcolor, 180)

    # Lightning strike (attack)
    if anim_type == 'attack' and attack_phase >= 3:
        # Massive lightning bolt from hammer
        bolt_x = 51
        bolt_y = 53 - arm_raise
        for by in range(bolt_y, 64):
            bx_off = random.randint(-2, 2)
            fill_rect(d, bolt_x + bx_off - 1, by, 3, 1, 'bright_yellow')
            px(d, bolt_x + bx_off, by, 'near_white')

    return img


# =====================================================================
# VFX: BOSS SPAWN PORTAL
# =====================================================================
def draw_spawn_portal(frame_idx):
    """8-frame portal opening animation. 64x64 per frame."""
    img = Image.new('RGBA', (64, 64), TRANSPARENT)
    d = ImageDraw.Draw(img)

    progress = (frame_idx + 1) / 8.0  # 0.125 to 1.0

    # Outer ring
    ring_r = int(24 * progress)
    if ring_r > 2:
        for angle_deg in range(0, 360, 3):
            angle = math.radians(angle_deg + frame_idx * 20)
            rx = int(32 + math.cos(angle) * ring_r)
            ry = int(32 + math.sin(angle) * ring_r)
            if 0 <= rx < 64 and 0 <= ry < 64:
                px(d, rx, ry, 'mana_violet', int(200 * progress))
                # Glow
                for g in range(1, 3):
                    grx = rx + int(math.cos(angle) * g)
                    gry = ry + int(math.sin(angle) * g)
                    if 0 <= grx < 64 and 0 <= gry < 64:
                        px(d, grx, gry, 'spell_glow', int(100 * progress))

    # Inner vortex
    vortex_r = int(16 * progress)
    if vortex_r > 1:
        fill_circle(d, 32, 32, vortex_r, 'deep_magic', int(180 * progress))
        fill_circle(d, 32, 32, max(vortex_r - 3, 1), 'magic_purple', int(150 * progress))

    # Center glow
    if progress > 0.3:
        center_r = int(6 * progress)
        fill_circle(d, 32, 32, center_r, 'spell_glow', int(120 * progress))
        fill_circle(d, 32, 32, max(center_r - 2, 1), 'near_white', int(80 * progress))

    # Sparks radiating outward
    random.seed(300 + frame_idx)
    spark_count = int(12 * progress)
    for _ in range(spark_count):
        angle = random.uniform(0, 2 * math.pi)
        dist = random.uniform(ring_r * 0.5, ring_r * 1.3)
        sx = int(32 + math.cos(angle) * dist)
        sy = int(32 + math.sin(angle) * dist)
        if 0 <= sx < 64 and 0 <= sy < 64:
            px(d, sx, sy, 'bright_yellow', 200)

    # Energy tendrils (later frames)
    if progress > 0.5:
        for t in range(4):
            angle = math.radians(t * 90 + frame_idx * 30)
            for seg in range(int(20 * progress)):
                tx = int(32 + math.cos(angle + seg * 0.15) * seg * 1.2)
                ty = int(32 + math.sin(angle + seg * 0.15) * seg * 1.2)
                if 0 <= tx < 64 and 0 <= ty < 64:
                    px(d, tx, ty, 'mana_violet', 180)

    return img


# =====================================================================
# VFX: BOSS DEATH EXPLOSION
# =====================================================================
def draw_death_explosion(frame_idx):
    """8-frame defeat explosion animation. 64x64 per frame."""
    img = Image.new('RGBA', (64, 64), TRANSPARENT)
    d = ImageDraw.Draw(img)

    progress = (frame_idx + 1) / 8.0

    if frame_idx < 2:
        # Phase 1: Flash
        flash_alpha = int(255 * (1 - progress * 2))
        fill_rect(d, 0, 0, 64, 64, 'near_white', min(flash_alpha, 200))
        fill_circle(d, 32, 32, 10, 'bright_yellow', 255)
    elif frame_idx < 5:
        # Phase 2: Expanding explosion ring
        ring_r = int((frame_idx - 1) * 10)
        ring_width = 4
        for angle_deg in range(0, 360, 2):
            angle = math.radians(angle_deg)
            for rw in range(ring_width):
                rx = int(32 + math.cos(angle) * (ring_r + rw))
                ry = int(32 + math.sin(angle) * (ring_r + rw))
                if 0 <= rx < 64 and 0 <= ry < 64:
                    color = ['bright_yellow', 'fire_orange', 'bright_red', 'ember'][rw % 4]
                    px(d, rx, ry, color, 220)
        # Core
        core_r = max(8 - (frame_idx - 2) * 2, 2)
        fill_circle(d, 32, 32, core_r, 'near_white', 200)
    else:
        # Phase 3: Particles dispersing
        random.seed(400 + frame_idx)
        particle_count = max(30 - (frame_idx - 5) * 8, 5)
        for _ in range(particle_count):
            angle = random.uniform(0, 2 * math.pi)
            dist = random.uniform(10, 28 + frame_idx * 3)
            ppx = int(32 + math.cos(angle) * dist)
            ppy = int(32 + math.sin(angle) * dist)
            if 0 <= ppx < 64 and 0 <= ppy < 64:
                color = random.choice(['bright_yellow', 'fire_orange', 'ember', 'gold'])
                size = random.randint(1, 3)
                fill_circle(d, ppx, ppy, size, color, 180 - (frame_idx - 5) * 30)

    # Loot sparkles (last 3 frames)
    if frame_idx >= 5:
        random.seed(500 + frame_idx)
        for _ in range(6):
            sx = random.randint(10, 54)
            sy = random.randint(10, 54)
            px(d, sx, sy, 'gold', 255)
            px(d, sx + 1, sy, 'bright_yellow', 200)
            px(d, sx, sy + 1, 'bright_yellow', 200)

    return img


# =====================================================================
# UI: WORLD BOSS HP BAR
# =====================================================================
def generate_boss_hp_bar():
    """World boss HP bar - wider than normal, with boss icon frame.
    128x20 total: 8px icon frame + 120px bar.
    """
    img = Image.new('RGBA', (128, 20), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Background frame
    fill_rect(d, 0, 0, 128, 20, 'shadow_black')
    fill_rect(d, 1, 1, 126, 18, 'dark_rock')

    # Boss icon frame (left side)
    fill_rect(d, 2, 2, 16, 16, 'stone_gray')
    fill_rect(d, 3, 3, 14, 14, 'shadow_black')
    # Skull icon inside
    fill_ellipse(d, 10, 9, 4, 3, 'near_white')
    fill_rect(d, 7, 11, 6, 4, 'near_white')
    px(d, 8, 8, 'shadow_black')  # left eye
    px(d, 11, 8, 'shadow_black')  # right eye
    fill_rect(d, 8, 12, 4, 1, 'shadow_black')  # mouth
    px(d, 9, 13, 'shadow_black')
    px(d, 10, 13, 'shadow_black')

    # HP bar area
    bar_x = 20
    bar_w = 104
    # Bar border
    fill_rect(d, bar_x, 3, bar_w, 14, 'stone_gray')
    fill_rect(d, bar_x + 1, 4, bar_w - 2, 12, 'shadow_black')

    # HP fill (full - red gradient)
    for x in range(bar_w - 4):
        ratio = x / (bar_w - 4)
        if ratio < 0.33:
            color = 'bright_red'
        elif ratio < 0.66:
            color = 'enemy_red'
        else:
            color = 'bright_red'
        fill_rect(d, bar_x + 2 + x, 5, 1, 10, color)

    # HP bar segments (tick marks)
    for seg in range(1, 10):
        seg_x = bar_x + 2 + int((bar_w - 4) * seg / 10)
        fill_rect(d, seg_x, 5, 1, 10, 'shadow_black', 120)

    # Highlight on HP bar
    fill_rect(d, bar_x + 2, 5, bar_w - 4, 2, 'ember', 80)

    # Corner decorations
    px(d, 0, 0, 'dark_gold')
    px(d, 127, 0, 'dark_gold')
    px(d, 0, 19, 'dark_gold')
    px(d, 127, 19, 'dark_gold')

    return img


# =====================================================================
# UI: DAMAGE CONTRIBUTION OVERLAY
# =====================================================================
def generate_damage_overlay():
    """Damage contribution overlay panel. 80x48.
    Shows: player name row, damage bar, contribution %.
    """
    img = Image.new('RGBA', (80, 48), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Panel background (semi-transparent dark)
    fill_rect(d, 0, 0, 80, 48, 'shadow_black', 200)
    fill_rect(d, 1, 1, 78, 46, 'dark_rock', 180)

    # Border
    fill_rect(d, 0, 0, 80, 1, 'stone_gray')
    fill_rect(d, 0, 47, 80, 1, 'stone_gray')
    fill_rect(d, 0, 0, 1, 48, 'stone_gray')
    fill_rect(d, 79, 0, 1, 48, 'stone_gray')

    # Title area - sword icon
    px(d, 4, 4, 'light_stone')
    draw_line(d, 4, 4, 8, 8, 'light_stone')
    px(d, 5, 8, 'dark_rock')  # crossguard
    px(d, 6, 8, 'dark_rock')
    px(d, 7, 8, 'dark_rock')
    draw_line(d, 6, 9, 6, 11, 'rich_earth')  # handle

    # Damage bar rows (3 sample entries)
    bar_colors = ['bright_red', 'fire_orange', 'gold']
    bar_widths = [60, 42, 28]
    for i in range(3):
        row_y = 14 + i * 11
        # Player dot
        fill_circle(d, 6, row_y + 3, 2, 'player_blue')
        # Damage bar background
        fill_rect(d, 12, row_y, 64, 7, 'shadow_black')
        # Damage bar fill
        fill_rect(d, 13, row_y + 1, bar_widths[i], 5, bar_colors[i])
        # Bar highlight
        fill_rect(d, 13, row_y + 1, bar_widths[i], 1, 'near_white', 60)

    # Corner accents
    px(d, 1, 1, 'dark_gold')
    px(d, 78, 1, 'dark_gold')
    px(d, 1, 46, 'dark_gold')
    px(d, 78, 46, 'dark_gold')

    return img


# =====================================================================
# UI: DAMAGE CONTRIBUTION RANK ICONS
# =====================================================================
def generate_damage_rank_icon(rank):
    """Individual damage rank icon. 16x16.
    rank: 1 = top (gold crown), 2 = silver sword, 3 = bronze shield
    """
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)

    if rank == 1:
        # Gold crown
        fill_rect(d, 3, 8, 10, 5, 'gold')
        fill_rect(d, 4, 9, 8, 3, 'dark_gold')
        # Crown points
        fill_rect(d, 4, 5, 2, 3, 'gold')
        fill_rect(d, 7, 4, 2, 4, 'bright_yellow')
        fill_rect(d, 10, 5, 2, 3, 'gold')
        # Gems
        px(d, 5, 6, 'bright_red')
        px(d, 8, 5, 'bright_red')
        px(d, 11, 6, 'bright_red')
        # Highlight
        px(d, 5, 8, 'bright_yellow')
        px(d, 8, 8, 'bright_yellow')
        px(d, 11, 8, 'bright_yellow')
    elif rank == 2:
        # Silver crossed swords
        draw_line(d, 3, 3, 12, 12, 'pale_gray')
        draw_line(d, 12, 3, 3, 12, 'pale_gray')
        # Hilts
        fill_rect(d, 6, 6, 4, 4, 'light_stone')
        fill_rect(d, 7, 7, 2, 2, 'mid_gray')
        # Blade tips
        px(d, 2, 2, 'shimmer')
        px(d, 13, 2, 'shimmer')
        px(d, 2, 13, 'shimmer')
        px(d, 13, 13, 'shimmer')
    elif rank == 3:
        # Bronze shield
        fill_ellipse(d, 8, 8, 5, 6, 'sand')
        fill_ellipse(d, 8, 8, 4, 5, 'dirt')
        fill_ellipse(d, 8, 8, 2, 3, 'rich_earth')
        # Shield boss
        fill_circle(d, 8, 7, 2, 'sand')
        px(d, 8, 7, 'desert_gold')
        # Highlight
        px(d, 6, 5, 'pale_sand')

    return img


# =====================================================================
# UI: ANNOUNCEMENT BANNER
# =====================================================================
def generate_announcement_banner():
    """Server-wide announcement banner. 192x32.
    Decorative frame for boss spawn/defeat text.
    """
    img = Image.new('RGBA', (192, 32), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Main banner background
    fill_rect(d, 4, 2, 184, 28, 'shadow_black', 220)
    fill_rect(d, 5, 3, 182, 26, 'deep_blood', 200)
    fill_rect(d, 6, 4, 180, 24, 'dark_rock', 240)

    # Gold border
    fill_rect(d, 4, 2, 184, 2, 'dark_gold')
    fill_rect(d, 4, 28, 184, 2, 'dark_gold')
    fill_rect(d, 4, 2, 2, 28, 'dark_gold')
    fill_rect(d, 186, 2, 2, 28, 'dark_gold')

    # Corner ornaments
    for cx, cy in [(4, 2), (186, 2), (4, 28), (186, 28)]:
        fill_rect(d, cx - 2, cy - 1, 6, 4, 'gold')
        px(d, cx, cy, 'bright_yellow')

    # Left skull ornament
    fill_ellipse(d, 16, 16, 5, 4, 'near_white')
    fill_rect(d, 12, 18, 8, 4, 'near_white')
    px(d, 14, 15, 'shadow_black')  # eye
    px(d, 18, 15, 'shadow_black')  # eye
    fill_rect(d, 14, 19, 4, 1, 'shadow_black')  # mouth
    px(d, 15, 20, 'shadow_black')
    px(d, 16, 20, 'shadow_black')

    # Right skull ornament (mirrored)
    fill_ellipse(d, 176, 16, 5, 4, 'near_white')
    fill_rect(d, 172, 18, 8, 4, 'near_white')
    px(d, 174, 15, 'shadow_black')
    px(d, 178, 15, 'shadow_black')
    fill_rect(d, 174, 19, 4, 1, 'shadow_black')
    px(d, 175, 20, 'shadow_black')
    px(d, 176, 20, 'shadow_black')

    # Decorative dividers (sword shapes flanking center)
    for sx, direction in [(28, 1), (164, -1)]:
        draw_line(d, sx, 16, sx + direction * 14, 16, 'gold')
        px(d, sx + direction * 14, 16, 'bright_yellow')
        px(d, sx, 14, 'dark_gold')
        px(d, sx, 18, 'dark_gold')

    # Center text area indicator (red glow behind text)
    fill_rect(d, 44, 8, 104, 16, 'deep_blood', 100)

    # Cross-bone accents
    draw_line(d, 10, 8, 22, 8, 'pale_gray')
    draw_line(d, 10, 24, 22, 24, 'pale_gray')
    draw_line(d, 170, 8, 182, 8, 'pale_gray')
    draw_line(d, 170, 24, 182, 24, 'pale_gray')

    return img


# =====================================================================
# SPRITE: LOOT REWARD CHEST (World Boss Tier)
# =====================================================================
def generate_loot_chest():
    """World boss loot chest. 32x32. Grander than normal chests."""
    img = Image.new('RGBA', (32, 32), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Chest body
    fill_rect(d, 4, 14, 24, 14, 'rich_earth')
    fill_rect(d, 5, 15, 22, 12, 'dirt')

    # Chest lid (domed)
    fill_rect(d, 3, 10, 26, 5, 'rich_earth')
    fill_rect(d, 5, 8, 22, 3, 'rich_earth')
    fill_rect(d, 7, 7, 18, 2, 'dirt')
    # Lid highlight
    fill_rect(d, 7, 8, 18, 1, 'sand', 120)

    # Metal bands
    fill_rect(d, 4, 14, 24, 1, 'dark_gold')
    fill_rect(d, 4, 20, 24, 1, 'dark_gold')
    fill_rect(d, 4, 26, 24, 1, 'dark_gold')
    # Vertical bands
    fill_rect(d, 8, 10, 1, 18, 'dark_gold')
    fill_rect(d, 23, 10, 1, 18, 'dark_gold')

    # Central lock (ornate)
    fill_rect(d, 13, 12, 6, 8, 'gold')
    fill_rect(d, 14, 13, 4, 6, 'dark_gold')
    # Keyhole
    fill_circle(d, 16, 15, 1, 'shadow_black')
    fill_rect(d, 15, 16, 2, 2, 'shadow_black')

    # Glow effect (boss-tier = purple/gold glow)
    for gx in range(32):
        for gy in range(8):
            if (gx + gy) % 3 == 0:
                px(d, gx, gy, 'spell_glow', 40)
    # Gold sparkles
    for sx, sy in [(6, 9), (25, 9), (10, 16), (22, 16), (16, 7)]:
        px(d, sx, sy, 'bright_yellow')

    # Purple aura corners
    for corner in [(3, 9), (28, 9), (3, 27), (28, 27)]:
        px(d, corner[0], corner[1], 'mana_violet', 180)
        px(d, corner[0] + 1, corner[1], 'spell_glow', 100)

    # Shadow
    fill_ellipse(d, 16, 30, 12, 2, 'shadow_black', 80)

    return img


# =====================================================================
# UI: LEADERBOARD FRAME
# =====================================================================
def generate_leaderboard_frame():
    """World boss leaderboard frame. 128x96."""
    img = Image.new('RGBA', (128, 96), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Outer frame
    fill_rect(d, 0, 0, 128, 96, 'shadow_black', 220)
    fill_rect(d, 1, 1, 126, 94, 'dark_rock', 240)

    # Gold border
    fill_rect(d, 0, 0, 128, 2, 'dark_gold')
    fill_rect(d, 0, 94, 128, 2, 'dark_gold')
    fill_rect(d, 0, 0, 2, 96, 'dark_gold')
    fill_rect(d, 126, 0, 2, 96, 'dark_gold')

    # Corner ornaments
    for cx, cy in [(2, 2), (125, 2), (2, 93), (125, 93)]:
        fill_rect(d, cx - 1, cy - 1, 4, 4, 'gold')
        px(d, cx, cy, 'bright_yellow')

    # Header area
    fill_rect(d, 4, 4, 120, 14, 'deep_blood', 200)
    fill_rect(d, 4, 4, 120, 1, 'gold')
    fill_rect(d, 4, 17, 120, 1, 'gold')

    # Trophy icon in header
    # Cup shape
    fill_rect(d, 8, 7, 8, 6, 'gold')
    fill_rect(d, 9, 8, 6, 4, 'bright_yellow')
    fill_rect(d, 10, 13, 4, 2, 'dark_gold')
    fill_rect(d, 9, 15, 6, 1, 'gold')
    # Handles
    px(d, 7, 8, 'dark_gold')
    px(d, 7, 9, 'dark_gold')
    px(d, 16, 8, 'dark_gold')
    px(d, 16, 9, 'dark_gold')

    # Row dividers
    for row in range(5):
        row_y = 20 + row * 14
        fill_rect(d, 4, row_y, 120, 13, 'dark_rock' if row % 2 == 0 else 'shadow_black', 200)
        fill_rect(d, 4, row_y + 13, 120, 1, 'stone_gray', 80)

        # Rank number placeholder circle
        rank_color = ['gold', 'light_stone', 'sand', 'stone_gray', 'stone_gray'][row]
        fill_circle(d, 12, row_y + 6, 4, rank_color)
        px(d, 12, row_y + 6, 'shadow_black')  # number dot

        # Name bar placeholder
        fill_rect(d, 20, row_y + 3, 50, 7, 'stone_gray', 60)

        # Damage bar placeholder
        bar_w = max(80 - row * 14, 20)
        fill_rect(d, 74, row_y + 3, bar_w - 26, 7, 'enemy_red', 180)
        fill_rect(d, 74, row_y + 3, bar_w - 26, 2, 'ember', 60)

    # Scrollbar track
    fill_rect(d, 122, 20, 3, 72, 'shadow_black')
    fill_rect(d, 122, 20, 3, 20, 'stone_gray')

    return img


# =====================================================================
# UI: WORLD BOSS RANK BADGE SPRITES
# =====================================================================
def generate_wb_rank_badge(rank_name):
    """World boss-specific rank badges. 16x16.
    Distinct from regular leaderboard badges — these show boss-kill ranks.
    """
    img = Image.new('RGBA', (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)

    if rank_name == 'slayer':
        # Dragon slayer badge - sword through skull
        # Skull
        fill_ellipse(d, 8, 7, 4, 3, 'near_white')
        fill_rect(d, 5, 9, 6, 3, 'near_white')
        px(d, 6, 6, 'shadow_black')  # eye
        px(d, 9, 6, 'shadow_black')  # eye
        px(d, 7, 9, 'shadow_black')  # tooth gap
        px(d, 8, 9, 'shadow_black')
        # Sword through
        draw_line(d, 2, 2, 13, 13, 'light_stone')
        px(d, 2, 2, 'shimmer')
        fill_rect(d, 12, 12, 3, 3, 'rich_earth')
        # Red glow
        px(d, 8, 11, 'bright_red', 180)

    elif rank_name == 'champion':
        # Champion star badge
        # Star shape
        star_points = []
        for i in range(5):
            angle = math.radians(-90 + i * 72)
            star_points.append((8 + int(6 * math.cos(angle)), 8 + int(6 * math.sin(angle))))
            angle2 = math.radians(-90 + i * 72 + 36)
            star_points.append((8 + int(3 * math.cos(angle2)), 8 + int(3 * math.sin(angle2))))

        # Fill star
        fill_circle(d, 8, 8, 5, 'gold')
        fill_circle(d, 8, 8, 3, 'bright_yellow')
        # Star points
        for sx, sy in star_points[::2]:
            px(d, sx, sy, 'bright_yellow')
            if 0 <= sx + 1 < 16:
                px(d, sx + 1, sy, 'gold', 180)
        # Center gem
        px(d, 8, 8, 'bright_red')
        px(d, 7, 7, 'pale_highlight')

    elif rank_name == 'veteran':
        # Shield with lightning bolt
        # Shield
        fill_ellipse(d, 8, 9, 5, 6, 'sky_blue')
        fill_ellipse(d, 8, 9, 4, 5, 'ocean_blue')
        # Lightning bolt
        draw_line(d, 9, 4, 7, 8, 'bright_yellow')
        draw_line(d, 7, 8, 10, 7, 'bright_yellow')
        draw_line(d, 10, 7, 7, 12, 'bright_yellow')
        px(d, 7, 12, 'gold')
        # Shield border
        for angle_deg in range(0, 360, 15):
            angle = math.radians(angle_deg)
            bx = int(8 + 5 * math.cos(angle))
            by = int(9 + 6 * math.sin(angle))
            if 0 <= bx < 16 and 0 <= by < 16:
                px(d, bx, by, 'light_stone')

    elif rank_name == 'participant':
        # Simple fist/gauntlet badge
        fill_rect(d, 5, 5, 6, 8, 'stone_gray')
        fill_rect(d, 6, 6, 4, 6, 'mid_gray')
        # Fingers
        fill_rect(d, 4, 5, 2, 3, 'stone_gray')
        fill_rect(d, 11, 5, 2, 3, 'stone_gray')
        # Knuckle highlight
        px(d, 6, 5, 'light_stone')
        px(d, 8, 5, 'light_stone')
        px(d, 10, 5, 'light_stone')

    return img


# =====================================================================
# MAIN: Generate all assets
# =====================================================================
def main():
    boss_dir = os.path.join(ASSET_DIR, 'sprites', 'enemies', 'bosses')
    vfx_dir = os.path.join(ASSET_DIR, 'vfx')
    ui_wb_dir = os.path.join(ASSET_DIR, 'ui', 'worldboss')

    ensure_dir(boss_dir)
    ensure_dir(vfx_dir)
    ensure_dir(ui_wb_dir)

    generated = []

    # --- 1. World Boss Sprites ---
    bosses = [
        ('worldboss_inferno_wyrm', draw_inferno_wyrm),
        ('worldboss_void_leviathan', draw_void_leviathan),
        ('worldboss_storm_colossus', draw_storm_colossus),
    ]

    for name, draw_fn in bosses:
        # Idle spritesheet: 4 frames
        idle_sheet = Image.new('RGBA', (256, 64), TRANSPARENT)
        for f in range(4):
            frame = draw_fn(f, 'idle')
            idle_sheet.paste(frame, (f * 64, 0))
        idle_path = os.path.join(boss_dir, f'{name}_idle.png')
        idle_sheet.save(idle_path)
        generated.append(idle_path)
        print(f'  [boss] {name}_idle.png (256x64, 4 frames)')

        # Attack spritesheet: 6 frames
        attack_sheet = Image.new('RGBA', (384, 64), TRANSPARENT)
        for f in range(6):
            frame = draw_fn(f, 'attack')
            attack_sheet.paste(frame, (f * 64, 0))
        attack_path = os.path.join(boss_dir, f'{name}_attack.png')
        attack_sheet.save(attack_path)
        generated.append(attack_path)
        print(f'  [boss] {name}_attack.png (384x64, 6 frames)')

    # --- 2. VFX: Boss Spawn Portal ---
    portal_sheet = Image.new('RGBA', (512, 64), TRANSPARENT)
    for f in range(8):
        frame = draw_spawn_portal(f)
        portal_sheet.paste(frame, (f * 64, 0))
    portal_path = os.path.join(vfx_dir, 'vfx_worldboss_spawn_portal.png')
    portal_sheet.save(portal_path)
    generated.append(portal_path)
    print(f'  [vfx]  vfx_worldboss_spawn_portal.png (512x64, 8 frames)')

    # --- 3. VFX: Boss Death Explosion ---
    death_sheet = Image.new('RGBA', (512, 64), TRANSPARENT)
    for f in range(8):
        frame = draw_death_explosion(f)
        death_sheet.paste(frame, (f * 64, 0))
    death_path = os.path.join(vfx_dir, 'vfx_worldboss_death_explosion.png')
    death_sheet.save(death_path)
    generated.append(death_path)
    print(f'  [vfx]  vfx_worldboss_death_explosion.png (512x64, 8 frames)')

    # --- 4. UI: World Boss HP Bar ---
    hp_bar = generate_boss_hp_bar()
    hp_path = os.path.join(ui_wb_dir, 'ui_worldboss_hp_bar.png')
    hp_bar.save(hp_path)
    generated.append(hp_path)
    print(f'  [ui]   ui_worldboss_hp_bar.png (128x20)')

    # --- 5. UI: Damage Contribution Overlay ---
    dmg_overlay = generate_damage_overlay()
    dmg_path = os.path.join(ui_wb_dir, 'ui_worldboss_damage_overlay.png')
    dmg_overlay.save(dmg_path)
    generated.append(dmg_path)
    print(f'  [ui]   ui_worldboss_damage_overlay.png (80x48)')

    # Damage rank icons
    for rank in range(1, 4):
        rank_icon = generate_damage_rank_icon(rank)
        rank_path = os.path.join(ui_wb_dir, f'ui_worldboss_dmg_rank_{rank}.png')
        rank_icon.save(rank_path)
        generated.append(rank_path)
        print(f'  [ui]   ui_worldboss_dmg_rank_{rank}.png (16x16)')

    # --- 6. UI: Announcement Banner ---
    banner = generate_announcement_banner()
    banner_path = os.path.join(ui_wb_dir, 'ui_worldboss_announcement_banner.png')
    banner.save(banner_path)
    generated.append(banner_path)
    print(f'  [ui]   ui_worldboss_announcement_banner.png (192x32)')

    # --- 7. Loot Reward Chest ---
    chest = generate_loot_chest()
    chest_path = os.path.join(boss_dir, 'worldboss_loot_chest.png')
    chest.save(chest_path)
    generated.append(chest_path)
    print(f'  [item] worldboss_loot_chest.png (32x32)')

    # --- 8. Leaderboard Frame ---
    lb_frame = generate_leaderboard_frame()
    lb_path = os.path.join(ui_wb_dir, 'ui_worldboss_leaderboard_frame.png')
    lb_frame.save(lb_path)
    generated.append(lb_path)
    print(f'  [ui]   ui_worldboss_leaderboard_frame.png (128x96)')

    # --- 9. World Boss Rank Badges ---
    for badge_name in ['slayer', 'champion', 'veteran', 'participant']:
        badge = generate_wb_rank_badge(badge_name)
        badge_path = os.path.join(ui_wb_dir, f'ui_worldboss_badge_{badge_name}.png')
        badge.save(badge_path)
        generated.append(badge_path)
        print(f'  [ui]   ui_worldboss_badge_{badge_name}.png (16x16)')

    print(f'\n=== Generated {len(generated)} world boss assets ===')
    return generated


if __name__ == '__main__':
    print('Generating world boss assets for PixelRealm (PIX-310)...\n')
    assets = main()
    print('\nDone!')
