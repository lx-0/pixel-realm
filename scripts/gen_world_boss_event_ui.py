#!/usr/bin/env python3
"""
Generate world boss event UI art assets for PixelRealm.
PIX-358: Announcement banners, reward tier badges, boss HP frame,
rally point beacon, and event completion splash.

All assets use the master 32-color palette from ART-STYLE-GUIDE.md.
Output: public/assets/world-boss-events/
"""
import sys
sys.path.insert(0, '/tmp/pip_pkgs')

from PIL import Image, ImageDraw
import os
import math

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
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSET_DIR = os.path.join(PROJECT_ROOT, 'public', 'assets', 'world-boss-events')


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def c(name, alpha=255):
    """Get palette color as RGBA tuple."""
    return (*PALETTE[name], alpha)


def px(draw, x, y, color, alpha=255):
    if isinstance(color, str):
        color = PALETTE[color]
    draw.point((x, y), fill=(*color, alpha))


def fill_rect(draw, x, y, w, h, color, alpha=255):
    if isinstance(color, str):
        color = PALETTE[color]
    for dy in range(h):
        for dx in range(w):
            draw.point((x + dx, y + dy), fill=(*color, alpha))


def fill_ellipse(draw, cx, cy, rx, ry, color, alpha=255):
    if isinstance(color, str):
        color = PALETTE[color]
    for dy in range(-ry, ry + 1):
        for dx in range(-rx, rx + 1):
            if (dx * dx) / max(rx * rx, 1) + (dy * dy) / max(ry * ry, 1) <= 1.0:
                draw.point((cx + dx, cy + dy), fill=(*color, alpha))


def fill_circle(draw, cx, cy, r, color, alpha=255):
    fill_ellipse(draw, cx, cy, r, r, color, alpha)


def draw_line(draw, x1, y1, x2, y2, color, alpha=255):
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
# 1. WORLD BOSS ANNOUNCEMENT BANNER (320x40)
# Full-width pixel art banner with boss silhouette + timer frame area
# =====================================================================
def gen_announcement_banner():
    """320x40 banner: dark ornate frame, boss silhouette center, timer area right."""
    W, H = 320, 40
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Background fill — dark gradient base
    for y in range(H):
        t = y / H
        r = int(13 + (26 - 13) * t)
        g = int(10 + (10) * t)
        b = int(58 + (0) * t)
        for x in range(W):
            px(d, x, y, (r, g, b))

    # Top and bottom border — ornate gold frame
    for x in range(W):
        px(d, x, 0, 'dark_gold')
        px(d, x, 1, 'gold')
        px(d, x, H - 2, 'gold')
        px(d, x, H - 1, 'dark_gold')

    # Left and right vertical border
    for y in range(H):
        px(d, 0, y, 'dark_gold')
        px(d, 1, y, 'gold')
        px(d, W - 2, y, 'gold')
        px(d, W - 1, y, 'dark_gold')

    # Corner ornaments (4px diamond shapes)
    for cx, cy in [(4, 4), (W - 5, 4), (4, H - 5), (W - 5, H - 5)]:
        px(d, cx, cy - 2, 'bright_yellow')
        px(d, cx - 1, cy - 1, 'gold')
        px(d, cx + 1, cy - 1, 'gold')
        px(d, cx - 2, cy, 'bright_yellow')
        px(d, cx, cy, 'pale_highlight')
        px(d, cx + 2, cy, 'bright_yellow')
        px(d, cx - 1, cy + 1, 'gold')
        px(d, cx + 1, cy + 1, 'gold')
        px(d, cx, cy + 2, 'bright_yellow')

    # Boss silhouette — center of banner (menacing horned figure)
    sx, sy = 155, 5  # Silhouette anchor
    # Head
    fill_ellipse(d, sx + 5, sy + 10, 5, 5, 'shadow_black')
    # Horns
    for i in range(7):
        px(d, sx + 5 - 5 - i // 2, sy + 8 - i, 'enemy_red')
        px(d, sx + 5 + 5 + i // 2, sy + 8 - i, 'enemy_red')
    # Eyes — glowing red
    px(d, sx + 3, sy + 9, 'bright_red')
    px(d, sx + 7, sy + 9, 'bright_red')
    px(d, sx + 3, sy + 9, 'fire_orange', 200)
    px(d, sx + 7, sy + 9, 'fire_orange', 200)
    # Body silhouette
    fill_rect(d, sx + 1, sy + 15, 9, 10, 'shadow_black')
    fill_rect(d, sx + 2, sy + 15, 7, 8, 'dark_rock')
    # Shoulders/armor
    fill_rect(d, sx - 2, sy + 14, 4, 3, 'shadow_black')
    fill_rect(d, sx + 9, sy + 14, 4, 3, 'shadow_black')
    # Glowing chest sigil
    px(d, sx + 5, sy + 18, 'bright_red')
    px(d, sx + 4, sy + 19, 'enemy_red')
    px(d, sx + 6, sy + 19, 'enemy_red')
    px(d, sx + 5, sy + 20, 'fire_orange')

    # Decorative fire wisps flanking the silhouette
    for offset in [-30, -20, 20, 30]:
        fx = sx + 5 + offset
        fy = sy + 14
        for i in range(5):
            px(d, fx, fy - i, 'fire_orange', 200 - i * 30)
        px(d, fx - 1, fy - 2, 'ember', 160)
        px(d, fx + 1, fy - 3, 'ember', 140)

    # Timer frame area (right side, 60x24 inset box)
    tx, ty = 240, 8
    tw, th = 60, 24
    fill_rect(d, tx, ty, tw, th, 'deep_ocean')
    # Timer border
    for x in range(tw):
        px(d, tx + x, ty, 'gold')
        px(d, tx + x, ty + th - 1, 'gold')
    for y in range(th):
        px(d, tx, ty + y, 'gold')
        px(d, tx + tw - 1, ty + y, 'gold')
    # Inner highlight
    fill_rect(d, tx + 2, ty + 2, tw - 4, th - 4, 'deep_magic')
    # Placeholder colon for "00:00" timer display area
    px(d, tx + tw // 2, ty + th // 2 - 2, 'bright_yellow')
    px(d, tx + tw // 2, ty + th // 2 + 1, 'bright_yellow')

    # Alert text area (left side decorative bars)
    for i in range(3):
        bx = 16 + i * 6
        fill_rect(d, bx, 14, 4, 12, 'enemy_red')
        fill_rect(d, bx + 1, 15, 2, 10, 'bright_red')

    # Horizontal divider lines
    for x in range(40, 140):
        px(d, x, 18, 'dark_gold', 140)
    for x in range(185, 235):
        px(d, x, 18, 'dark_gold', 140)

    img.save(os.path.join(ASSET_DIR, 'ui_worldboss_banner.png'))
    print('  [+] ui_worldboss_banner.png (320x40)')


# =====================================================================
# 2. REWARD TIER BADGES — Bronze, Silver, Gold (24x24 each)
# Circular medal with tier-colored rim and star center
# =====================================================================
def gen_reward_badges():
    """3 reward tier badges: bronze, silver, gold. 24x24 pixel art medals."""
    tiers = {
        'bronze': {
            'outer': 'rich_earth',
            'mid': 'dirt',
            'inner': 'sand',
            'highlight': 'desert_gold',
            'star': 'pale_sand',
        },
        'silver': {
            'outer': 'stone_gray',
            'mid': 'mid_gray',
            'inner': 'light_stone',
            'highlight': 'pale_gray',
            'star': 'near_white',
        },
        'gold': {
            'outer': 'dark_gold',
            'mid': 'gold',
            'inner': 'bright_yellow',
            'highlight': 'pale_highlight',
            'star': 'near_white',
        },
    }

    for tier_name, colors in tiers.items():
        S = 24
        img = Image.new('RGBA', (S, S), TRANSPARENT)
        d = ImageDraw.Draw(img)

        cx, cy = S // 2, S // 2

        # Ribbon tails at bottom
        for i in range(5):
            px(d, cx - 3, cy + 8 + i, colors['outer'])
            px(d, cx - 4, cy + 8 + i, colors['mid'])
            px(d, cx + 3, cy + 8 + i, colors['outer'])
            px(d, cx + 4, cy + 8 + i, colors['mid'])
        # Ribbon tips
        px(d, cx - 5, cy + 12, colors['outer'])
        px(d, cx + 5, cy + 12, colors['outer'])

        # Outer medal circle
        fill_circle(d, cx, cy, 9, colors['outer'])
        fill_circle(d, cx, cy, 8, colors['mid'])
        fill_circle(d, cx, cy, 6, colors['inner'])

        # Inner decorative ring
        for angle_deg in range(0, 360, 15):
            rad = math.radians(angle_deg)
            rx = int(cx + 7 * math.cos(rad))
            ry = int(cy + 7 * math.sin(rad))
            px(d, rx, ry, colors['highlight'])

        # Central star (5-pointed, simplified pixel art)
        # Center dot
        px(d, cx, cy, colors['star'])
        # Top point
        px(d, cx, cy - 3, colors['highlight'])
        px(d, cx, cy - 2, colors['star'])
        # Bottom-left
        px(d, cx - 3, cy + 1, colors['highlight'])
        px(d, cx - 2, cy + 1, colors['star'])
        # Bottom-right
        px(d, cx + 3, cy + 1, colors['highlight'])
        px(d, cx + 2, cy + 1, colors['star'])
        # Upper-left
        px(d, cx - 2, cy - 2, colors['highlight'])
        px(d, cx - 1, cy - 1, colors['star'])
        # Upper-right
        px(d, cx + 2, cy - 2, colors['highlight'])
        px(d, cx + 1, cy - 1, colors['star'])
        # Star fill connecting lines
        px(d, cx - 1, cy, colors['star'])
        px(d, cx + 1, cy, colors['star'])
        px(d, cx, cy + 1, colors['star'])
        px(d, cx, cy - 1, colors['star'])

        # Top highlight
        px(d, cx - 1, cy - 8, colors['highlight'], 180)
        px(d, cx, cy - 8, colors['highlight'], 220)
        px(d, cx + 1, cy - 8, colors['highlight'], 180)

        fname = f'icon_wb_badge_{tier_name}.png'
        img.save(os.path.join(ASSET_DIR, fname))
        print(f'  [+] {fname} (24x24)')


# =====================================================================
# 3. BOSS HEALTH BAR FRAME (160x16)
# Ornate frame distinct from regular enemy bars — wider, with skull deco
# =====================================================================
def gen_boss_hp_frame():
    """160x16 ornate health bar frame for world bosses."""
    W, H = 160, 16
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Outer frame — dark gold border
    fill_rect(d, 0, 0, W, H, 'shadow_black')
    # Top/bottom borders
    for x in range(W):
        px(d, x, 0, 'dark_gold')
        px(d, x, 1, 'gold')
        px(d, x, H - 2, 'gold')
        px(d, x, H - 1, 'dark_gold')
    # Left/right borders
    for y in range(H):
        px(d, 0, y, 'dark_gold')
        px(d, 1, y, 'gold')
        px(d, W - 2, y, 'gold')
        px(d, W - 1, y, 'dark_gold')

    # Inner fill area (where HP bar renders) — dark background
    fill_rect(d, 3, 3, W - 6, H - 6, 'deep_blood')
    fill_rect(d, 4, 4, W - 8, H - 8, 'shadow_black')

    # Skull decoration on left side of frame
    skull_x, skull_y = 6, 5
    # Skull top
    px(d, skull_x, skull_y, 'light_stone')
    px(d, skull_x + 1, skull_y, 'light_stone')
    px(d, skull_x + 2, skull_y, 'light_stone')
    # Skull middle — eyes
    px(d, skull_x - 1, skull_y + 1, 'light_stone')
    px(d, skull_x, skull_y + 1, 'deep_blood')  # left eye
    px(d, skull_x + 1, skull_y + 1, 'light_stone')
    px(d, skull_x + 2, skull_y + 1, 'deep_blood')  # right eye
    px(d, skull_x + 3, skull_y + 1, 'light_stone')
    # Skull jaw
    px(d, skull_x, skull_y + 2, 'mid_gray')
    px(d, skull_x + 1, skull_y + 2, 'light_stone')
    px(d, skull_x + 2, skull_y + 2, 'mid_gray')
    # Teeth
    px(d, skull_x, skull_y + 3, 'pale_gray')
    px(d, skull_x + 1, skull_y + 3, 'shadow_black')
    px(d, skull_x + 2, skull_y + 3, 'pale_gray')

    # Matching skull on right side
    skull_x2 = W - 10
    px(d, skull_x2, skull_y, 'light_stone')
    px(d, skull_x2 + 1, skull_y, 'light_stone')
    px(d, skull_x2 + 2, skull_y, 'light_stone')
    px(d, skull_x2 - 1, skull_y + 1, 'light_stone')
    px(d, skull_x2, skull_y + 1, 'deep_blood')
    px(d, skull_x2 + 1, skull_y + 1, 'light_stone')
    px(d, skull_x2 + 2, skull_y + 1, 'deep_blood')
    px(d, skull_x2 + 3, skull_y + 1, 'light_stone')
    px(d, skull_x2, skull_y + 2, 'mid_gray')
    px(d, skull_x2 + 1, skull_y + 2, 'light_stone')
    px(d, skull_x2 + 2, skull_y + 2, 'mid_gray')
    px(d, skull_x2, skull_y + 3, 'pale_gray')
    px(d, skull_x2 + 1, skull_y + 3, 'shadow_black')
    px(d, skull_x2 + 2, skull_y + 3, 'pale_gray')

    # Decorative cross-bones between skulls and HP bar
    for offset in [14, W - 16]:
        px(d, offset, 6, 'mid_gray')
        px(d, offset + 1, 7, 'mid_gray')
        px(d, offset + 1, 6, 'mid_gray')
        px(d, offset, 7, 'mid_gray')

    # Gold notch marks along top inner edge (damage phase markers)
    for nx in range(20, W - 20, 20):
        px(d, nx, 3, 'gold')
        px(d, nx, 4, 'dark_gold')

    img.save(os.path.join(ASSET_DIR, 'ui_worldboss_hp_frame.png'))
    print('  [+] ui_worldboss_hp_frame.png (160x16)')


# =====================================================================
# 4. RALLY POINT MAP MARKER — Animated beacon (4 frames, 16x32 each)
# Vertical beacon sprite with pulsing glow, assembled as spritesheet
# =====================================================================
def gen_rally_beacon():
    """4-frame animated beacon spritesheet (64x32). Each frame 16x32."""
    FW, FH = 16, 32
    FRAMES = 4
    img = Image.new('RGBA', (FW * FRAMES, FH), TRANSPARENT)

    for f in range(FRAMES):
        frame = Image.new('RGBA', (FW, FH), TRANSPARENT)
        d = ImageDraw.Draw(frame)

        cx = FW // 2
        # Pulse phase
        pulse = [0, 1, 2, 1][f]
        glow_alpha = [140, 180, 220, 180][f]

        # Ground base — stone pedestal
        fill_rect(d, cx - 3, FH - 4, 7, 3, 'stone_gray')
        fill_rect(d, cx - 2, FH - 5, 5, 1, 'mid_gray')
        px(d, cx - 3, FH - 4, 'dark_rock')
        px(d, cx + 3, FH - 4, 'dark_rock')
        # Ground highlight
        px(d, cx - 1, FH - 5, 'light_stone')
        px(d, cx, FH - 5, 'light_stone')
        px(d, cx + 1, FH - 5, 'light_stone')

        # Beacon pole
        for y in range(10, FH - 5):
            px(d, cx, y, 'mid_gray')
            px(d, cx - 1, y, 'stone_gray')

        # Beacon crystal (top) — pulsing
        crystal_y = 6 + pulse
        fill_ellipse(d, cx, crystal_y, 3, 4, 'enemy_red')
        fill_ellipse(d, cx, crystal_y, 2, 3, 'bright_red')
        px(d, cx, crystal_y - 1, 'fire_orange')
        px(d, cx, crystal_y, 'ember')

        # Glow aura — radiating outward based on frame
        glow_r = 4 + pulse
        for angle in range(0, 360, 20):
            rad = math.radians(angle)
            for dist in range(2, glow_r + 1):
                gx = int(cx + dist * math.cos(rad))
                gy = int(crystal_y + dist * math.sin(rad))
                if 0 <= gx < FW and 0 <= gy < FH:
                    fade = max(glow_alpha - dist * 35, 0)
                    px(d, gx, gy, 'fire_orange', fade)

        # Vertical beam upward
        for y in range(0, crystal_y - 3):
            beam_alpha = max(glow_alpha - (crystal_y - 3 - y) * 15, 0)
            px(d, cx, y, 'bright_red', beam_alpha)
            if beam_alpha > 60:
                px(d, cx - 1, y, 'enemy_red', beam_alpha // 2)
                px(d, cx + 1, y, 'enemy_red', beam_alpha // 2)

        # Paste frame into spritesheet
        img.paste(frame, (f * FW, 0))

    img.save(os.path.join(ASSET_DIR, 'sprite_wb_rally_beacon.png'))
    print(f'  [+] sprite_wb_rally_beacon.png ({FW * FRAMES}x{FH}, {FRAMES} frames)')


# =====================================================================
# 5. EVENT COMPLETION SPLASH (160x90)
# Victory illustration: defeated boss silhouette, triumphant players,
# golden rays and particle confetti
# =====================================================================
def gen_completion_splash():
    """160x90 victory splash shown when server-wide boss is defeated."""
    W, H = 160, 90
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Background — dark to golden gradient (bottom-up victory feel)
    for y in range(H):
        t = y / H
        r = int(13 + (59 - 13) * (1 - t))
        g = int(10 + (32 - 10) * (1 - t))
        b = int(58 + (16 - 58) * (1 - t))
        for x in range(W):
            px(d, x, y, (r, g, b))

    # Golden sun rays emanating from top center
    ray_cx, ray_cy = W // 2, 0
    for angle_deg in range(-80, 81, 10):
        rad = math.radians(angle_deg)
        for dist in range(10, 80):
            rx = int(ray_cx + dist * math.sin(rad))
            ry = int(ray_cy + dist * math.cos(rad))
            if 0 <= rx < W and 0 <= ry < H:
                fade = max(100 - dist, 0)
                px(d, rx, ry, 'gold', fade)

    # Defeated boss silhouette — fallen, center-bottom
    boss_x, boss_y = W // 2 - 10, H - 30
    # Collapsed body mass
    fill_ellipse(d, boss_x + 10, boss_y + 10, 14, 6, 'shadow_black')
    fill_ellipse(d, boss_x + 10, boss_y + 10, 12, 5, 'dark_rock')
    # Broken horn fragments
    px(d, boss_x + 3, boss_y + 4, 'stone_gray')
    px(d, boss_x + 2, boss_y + 3, 'mid_gray')
    px(d, boss_x + 17, boss_y + 4, 'stone_gray')
    px(d, boss_x + 18, boss_y + 3, 'mid_gray')
    # Fading red glow (dying embers)
    px(d, boss_x + 10, boss_y + 9, 'enemy_red', 120)
    px(d, boss_x + 9, boss_y + 10, 'deep_blood', 80)
    px(d, boss_x + 11, boss_y + 10, 'deep_blood', 80)

    # Triumphant player silhouettes (3 heroes standing on boss)
    heroes = [
        (boss_x - 2, boss_y - 4, 'player_blue'),    # left hero
        (boss_x + 10, boss_y - 8, 'bright_yellow'),  # center hero (raised weapon)
        (boss_x + 22, boss_y - 4, 'leaf_green'),     # right hero
    ]
    for hx, hy, accent in heroes:
        # Head
        fill_circle(d, hx, hy, 2, 'near_white')
        # Body
        fill_rect(d, hx - 1, hy + 3, 3, 5, accent)
        # Legs
        px(d, hx - 1, hy + 8, accent)
        px(d, hx + 1, hy + 8, accent)

    # Center hero raised weapon
    mid_hx = boss_x + 10
    mid_hy = boss_y - 8
    px(d, mid_hx, mid_hy - 4, 'gold')
    px(d, mid_hx, mid_hy - 5, 'bright_yellow')
    px(d, mid_hx, mid_hy - 6, 'pale_highlight')
    px(d, mid_hx - 1, mid_hy - 6, 'gold')
    px(d, mid_hx + 1, mid_hy - 6, 'gold')

    # Confetti / victory particles
    import random
    random.seed(42)  # Deterministic
    confetti_colors = ['bright_red', 'gold', 'player_blue', 'bright_yellow',
                       'leaf_green', 'fire_orange', 'mana_violet']
    for _ in range(40):
        cx = random.randint(4, W - 5)
        cy = random.randint(4, H // 2)
        col = random.choice(confetti_colors)
        alpha = random.randint(120, 240)
        px(d, cx, cy, col, alpha)
        # Some confetti as 2px dashes
        if random.random() > 0.5:
            px(d, cx + 1, cy, col, alpha)

    # Border frame — thin gold
    for x in range(W):
        px(d, x, 0, 'dark_gold')
        px(d, x, H - 1, 'dark_gold')
    for y in range(H):
        px(d, 0, y, 'dark_gold')
        px(d, W - 1, y, 'dark_gold')

    # Inner border
    for x in range(1, W - 1):
        px(d, x, 1, 'gold', 180)
        px(d, x, H - 2, 'gold', 180)
    for y in range(1, H - 1):
        px(d, 1, y, 'gold', 180)
        px(d, W - 2, y, 'gold', 180)

    img.save(os.path.join(ASSET_DIR, 'ui_worldboss_victory_splash.png'))
    print('  [+] ui_worldboss_victory_splash.png (160x90)')


# =====================================================================
# MAIN
# =====================================================================
def main():
    ensure_dir(ASSET_DIR)
    print('Generating world boss event UI assets...')
    print(f'Output: {ASSET_DIR}')
    print()

    gen_announcement_banner()
    gen_reward_badges()
    gen_boss_hp_frame()
    gen_rally_beacon()
    gen_completion_splash()

    print()
    print('Done! All world boss event UI assets generated.')


if __name__ == '__main__':
    main()
