#!/usr/bin/env python3
"""
Generate VFX spritesheet assets for PIX-144: Game Juice Pass.

All spritesheets follow project conventions:
  - 6 frames × 32×32px = 192×32px PNG with transparency
  - Uses only the 32-color master palette from ART-STYLE-GUIDE.md
  - 12 FPS animation (frame-stepped at 60 FPS)
  - Naming: vfx_<category>_<name>.png
"""

import os
import sys
import math
import random

sys.path.insert(0, "/tmp/pillow_lib")
from PIL import Image, ImageDraw

# ── Master palette (32 colors from ART-STYLE-GUIDE.md) ──────────────────────
PALETTE = {
    # Neutrals
    "black":        (0x0D, 0x0D, 0x0D),
    "dark_gray":    (0x2B, 0x2B, 0x2B),
    "mid_gray":     (0x4A, 0x4A, 0x4A),
    "gray":         (0x6B, 0x6B, 0x6B),
    "light_gray":   (0x9A, 0x9A, 0x9A),
    "pale_gray":    (0xC8, 0xC8, 0xC8),
    "white":        (0xF0, 0xF0, 0xF0),
    # Warm earth
    "dark_brown":   (0x3A, 0x20, 0x10),
    "brown":        (0x6B, 0x42, 0x20),
    "tan":          (0x9B, 0x6B, 0x3A),
    "sand":         (0xC8, 0x9B, 0x5A),
    "pale_sand":    (0xE0, 0xC0, 0x80),
    "cream":        (0xF0, 0xE0, 0xB0),
    # Greens
    "dark_green":   (0x20, 0x50, 0x20),
    "forest_green": (0x3A, 0x7A, 0x3A),
    "green":        (0x4C, 0x9B, 0x4C),
    "bright_green": (0x78, 0xC8, 0x78),
    "pale_green":   (0xA8, 0xE0, 0xA8),
    # Blues
    "deep_blue":    (0x1A, 0x4A, 0x8A),
    "blue":         (0x30, 0x70, 0xB0),
    "player_cyan":  (0x50, 0xA8, 0xE8),
    "light_blue":   (0x90, 0xD0, 0xF8),
    "pale_blue":    (0xC8, 0xF0, 0xFF),
    "sky_blue":     (0x80, 0xC0, 0xF0),
    # Reds/Oranges
    "dark_red":     (0xA0, 0x10, 0x10),
    "red":          (0xD4, 0x20, 0x20),
    "orange":       (0xF0, 0x60, 0x20),
    "light_orange": (0xF0, 0x90, 0x50),
    "peach":        (0xF0, 0xB0, 0x80),
    # Yellows/Golds
    "dark_gold":    (0xB0, 0x80, 0x00),
    "gold":         (0xE8, 0xB8, 0x00),
    "yellow":       (0xFF, 0xE0, 0x40),
    "bright_yellow":(0xFF, 0xF0, 0x80),
    # Purples
    "dark_purple":  (0x5A, 0x20, 0xA0),
    "purple":       (0x90, 0x50, 0xE0),
    "light_purple": (0xB8, 0x80, 0xF0),
    "pale_purple":  (0xD8, 0xB0, 0xFF),
}

FRAME_SIZE = 32
NUM_FRAMES = 6
SHEET_W = FRAME_SIZE * NUM_FRAMES  # 192
SHEET_H = FRAME_SIZE               # 32

VFX_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                       "assets", "vfx")


def new_sheet():
    """Create a new 192×32 RGBA spritesheet."""
    return Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))


def px(draw, frame, x, y, color, alpha=255):
    """Draw a single pixel at (x, y) within the given frame."""
    if 0 <= x < FRAME_SIZE and 0 <= y < FRAME_SIZE:
        ax = frame * FRAME_SIZE + x
        r, g, b = PALETTE[color]
        draw.point((ax, y), fill=(r, g, b, alpha))


def rect(draw, frame, x, y, w, h, color, alpha=255):
    """Draw a filled rectangle within the given frame."""
    for dy in range(h):
        for dx in range(w):
            px(draw, frame, x + dx, y + dy, color, alpha)


def circle_pixels(cx, cy, r):
    """Return pixel coords for a filled circle (pixel-art friendly)."""
    pts = []
    for y in range(int(cy - r), int(cy + r) + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2:
                pts.append((x, y))
    return pts


def ring_pixels(cx, cy, r, thickness=1):
    """Return pixel coords for a ring outline."""
    pts = []
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            if r - thickness <= d <= r + 0.5:
                pts.append((x, y))
    return pts


def diamond_pixels(cx, cy, size):
    """Return pixel coords for a diamond shape."""
    pts = []
    for dy in range(-size, size + 1):
        w = size - abs(dy)
        for dx in range(-w, w + 1):
            pts.append((cx + dx, cy + dy))
    return pts


def cross_pixels(cx, cy, arm_len, thickness=1):
    """Return pixel coords for a + cross shape."""
    pts = []
    half_t = thickness // 2
    for i in range(-arm_len, arm_len + 1):
        for t in range(-half_t, half_t + 1):
            pts.append((cx + i, cy + t))
            pts.append((cx + t, cy + i))
    return pts


def star_pixels(cx, cy, size):
    """Return pixel coords for a 4-point star/sparkle."""
    pts = cross_pixels(cx, cy, size, 1)
    # Add diagonal accents for larger stars
    if size >= 2:
        for d in range(1, size):
            pts.extend([(cx + d, cy + d), (cx - d, cy + d),
                        (cx + d, cy - d), (cx - d, cy - d)])
    return pts


# ═══════════════════════════════════════════════════════════════════════════
# 1. HIT FEEDBACK VFX
# ═══════════════════════════════════════════════════════════════════════════

def gen_hit_sparks():
    """Melee hit sparks — white/gold radiating dots, 300ms."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16
    random.seed(42)

    for f in range(6):
        t = f / 5.0  # 0..1
        num_sparks = 5
        for i in range(num_sparks):
            angle = (i / num_sparks) * 2 * math.pi + 0.3
            dist = 2 + t * 10
            sx = int(cx + math.cos(angle) * dist)
            sy = int(cy + math.sin(angle) * dist)
            alpha = int(255 * (1 - t * 0.7))
            color = "white" if i % 2 == 0 else "gold"
            px(draw, f, sx, sy, color, alpha)
            if f < 4:
                # Spark tail
                tx = int(cx + math.cos(angle) * (dist - 1))
                ty = int(cy + math.sin(angle) * (dist - 1))
                px(draw, f, tx, ty, "yellow", alpha // 2)

        # Center flash on first 2 frames
        if f < 2:
            px(draw, f, cx, cy, "white", 255)
            px(draw, f, cx - 1, cy, "white", 200)
            px(draw, f, cx + 1, cy, "white", 200)
            px(draw, f, cx, cy - 1, "white", 200)
            px(draw, f, cx, cy + 1, "white", 200)

    return img


def gen_hit_flash():
    """Directional knockback flash — white expanding arc, 200ms."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16

    for f in range(6):
        t = f / 5.0
        # Expanding arc from left side (impact direction)
        radius = 3 + int(t * 8)
        alpha = int(255 * (1 - t))
        # Draw a partial arc (right half = knockback direction)
        for angle_deg in range(-60, 61, 15):
            angle = math.radians(angle_deg)
            x = int(cx + math.cos(angle) * radius)
            y = int(cy + math.sin(angle) * radius)
            px(draw, f, x, y, "white", alpha)
            if f < 3:
                px(draw, f, x + 1, y, "pale_gray", alpha // 2)

        # Bright center on early frames
        if f < 2:
            for dy in range(-1, 2):
                for dx in range(-1, 2):
                    px(draw, f, cx + dx, cy + dy, "white", 255)

    return img


def gen_hit_damage():
    """Enemy damage flash — red overlay pulse, 2 frames white then red fade."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16

    for f in range(6):
        if f == 0:
            # Full white flash (frame 1 of hit)
            for pts in circle_pixels(cx, cy, 6):
                px(draw, f, pts[0], pts[1], "white", 230)
        elif f == 1:
            # White shrinking
            for pts in circle_pixels(cx, cy, 4):
                px(draw, f, pts[0], pts[1], "white", 180)
        elif f == 2:
            # Red flash
            for pts in circle_pixels(cx, cy, 5):
                px(draw, f, pts[0], pts[1], "red", 200)
        elif f == 3:
            # Red fading
            for pts in circle_pixels(cx, cy, 4):
                px(draw, f, pts[0], pts[1], "red", 140)
        elif f == 4:
            # Red small
            for pts in circle_pixels(cx, cy, 3):
                px(draw, f, pts[0], pts[1], "dark_red", 100)
        else:
            # Almost gone
            for pts in circle_pixels(cx, cy, 2):
                px(draw, f, pts[0], pts[1], "dark_red", 60)

    return img


# ═══════════════════════════════════════════════════════════════════════════
# 2. SPELL IMPACT PARTICLES
# ═══════════════════════════════════════════════════════════════════════════

def gen_impact_fire():
    """Fire impact embers — orange/red particles radiating out, 500ms."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16
    random.seed(101)

    embers = []
    for i in range(8):
        angle = random.uniform(0, 2 * math.pi)
        speed = random.uniform(0.8, 1.5)
        embers.append((angle, speed, random.choice(["orange", "red", "yellow", "light_orange"])))

    for f in range(6):
        t = f / 5.0
        # Core burst on early frames
        if f < 3:
            r = 2 + f
            core_alpha = int(255 * (1 - t * 0.8))
            for pt in circle_pixels(cx, cy, r):
                px(draw, f, pt[0], pt[1], "orange", core_alpha)
            # Bright center
            for pt in circle_pixels(cx, cy, max(1, r - 2)):
                px(draw, f, pt[0], pt[1], "yellow", core_alpha)

        # Flying embers
        for angle, speed, color in embers:
            dist = 2 + t * speed * 12
            ex = int(cx + math.cos(angle) * dist)
            ey = int(cy + math.sin(angle) * dist)
            alpha = int(255 * max(0, 1 - t * 0.9))
            px(draw, f, ex, ey, color, alpha)
            # Ember trail
            if f > 0:
                trail_dist = dist - speed * 1.5
                tx = int(cx + math.cos(angle) * trail_dist)
                ty = int(cy + math.sin(angle) * trail_dist)
                px(draw, f, tx, ty, "dark_red", alpha // 3)

    return img


def gen_impact_ice():
    """Ice impact crystal shards — pale blue/white shards radiating, 500ms."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16
    random.seed(102)

    shards = []
    for i in range(6):
        angle = i * math.pi / 3 + random.uniform(-0.2, 0.2)
        speed = random.uniform(0.8, 1.3)
        shards.append((angle, speed))

    for f in range(6):
        t = f / 5.0
        # Center crystal burst
        if f < 3:
            size = 2 + f
            alpha = int(255 * (1 - t * 0.6))
            for pt in diamond_pixels(cx, cy, size):
                px(draw, f, pt[0], pt[1], "light_blue", alpha)
            for pt in diamond_pixels(cx, cy, max(1, size - 1)):
                px(draw, f, pt[0], pt[1], "pale_blue", alpha)

        # Flying shards (small diamond shapes)
        for angle, speed in shards:
            dist = 2 + t * speed * 11
            sx = int(cx + math.cos(angle) * dist)
            sy = int(cy + math.sin(angle) * dist)
            alpha = int(255 * max(0, 1 - t * 0.8))
            # Each shard is 2-3 pixels
            px(draw, f, sx, sy, "pale_blue", alpha)
            px(draw, f, sx + (1 if math.cos(angle) > 0 else -1), sy,
               "light_blue", alpha)
            if f < 4:
                px(draw, f, sx, sy + (1 if math.sin(angle) > 0 else -1),
                   "white", alpha // 2)

    return img


def gen_impact_poison():
    """Poison impact green bubbles — rising bubbles with pop, 500ms."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 18  # Slightly lower since bubbles rise
    random.seed(103)

    bubbles = []
    for i in range(7):
        bx = random.uniform(-5, 5)
        speed = random.uniform(0.6, 1.2)
        delay = random.uniform(0, 0.3)
        size = random.choice([1, 1, 2])
        bubbles.append((bx, speed, delay, size))

    for f in range(6):
        t = f / 5.0
        # Ground splash
        if f < 2:
            alpha = int(255 * (1 - t * 2))
            for dx in range(-3, 4):
                px(draw, f, cx + dx, cy + 2, "green", alpha)
                px(draw, f, cx + dx, cy + 3, "dark_green", alpha // 2)

        # Rising bubbles
        for bx, speed, delay, size in bubbles:
            bt = max(0, t - delay)
            if bt <= 0:
                continue
            rise = bt * speed * 14
            by = int(cy - rise)
            bpx = int(cx + bx + math.sin(bt * 4) * 2)
            alpha = int(255 * max(0, 1 - bt * 0.8))
            if size == 1:
                px(draw, f, bpx, by, "bright_green", alpha)
            else:
                px(draw, f, bpx, by, "bright_green", alpha)
                px(draw, f, bpx + 1, by, "green", alpha)
                px(draw, f, bpx, by - 1, "pale_green", alpha // 2)

    return img


def gen_impact_lightning():
    """Lightning impact spark arcs — yellow/white branching sparks, 400ms."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16
    random.seed(104)

    # Pre-compute lightning branches
    branches = []
    for i in range(4):
        angle = i * math.pi / 2 + random.uniform(-0.3, 0.3)
        length = random.randint(6, 10)
        segments = []
        x, y = float(cx), float(cy)
        for s in range(length):
            dx = math.cos(angle) + random.uniform(-0.5, 0.5)
            dy = math.sin(angle) + random.uniform(-0.5, 0.5)
            x += dx
            y += dy
            segments.append((int(x), int(y)))
        branches.append(segments)

    for f in range(6):
        t = f / 5.0
        alpha = int(255 * max(0, 1 - t * 0.8))

        # Center flash
        if f < 2:
            for pt in cross_pixels(cx, cy, 2, 1):
                px(draw, f, pt[0], pt[1], "white", 255)
            px(draw, f, cx, cy, "bright_yellow", 255)

        # Lightning branches — show progressively then fade
        visible_len = min(len(branches[0]), int((t + 0.3) * 12))
        for branch in branches:
            for s, (bx, by) in enumerate(branch[:visible_len]):
                seg_alpha = int(alpha * max(0, 1 - s / len(branch) * 0.5))
                if f < 3:
                    px(draw, f, bx, by, "yellow", seg_alpha)
                    # Glow
                    px(draw, f, bx + 1, by, "bright_yellow", seg_alpha // 3)
                else:
                    # Fading sparks at endpoints
                    if s > len(branch) // 2:
                        px(draw, f, bx, by, "yellow", seg_alpha // 2)

        # Residual sparks at tips
        if f >= 3:
            for branch in branches:
                if branch:
                    ex, ey = branch[-1]
                    spark_alpha = int(80 * (1 - (t - 0.5) * 2))
                    if spark_alpha > 0:
                        px(draw, f, ex, ey, "bright_yellow", spark_alpha)

    return img


# ═══════════════════════════════════════════════════════════════════════════
# 3. LEVEL-UP CELEBRATION
# ═══════════════════════════════════════════════════════════════════════════

def gen_levelup_burst():
    """Level-up golden burst — expanding star with gold particles, 800ms."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16

    for f in range(6):
        t = f / 5.0
        # Central star expanding
        star_size = 1 + int(t * 5)
        alpha = int(255 * max(0.2, 1 - t * 0.6))
        for pt in star_pixels(cx, cy, star_size):
            px(draw, f, pt[0], pt[1], "gold", alpha)
        # Inner bright core
        core = max(1, star_size - 2)
        for pt in star_pixels(cx, cy, core):
            px(draw, f, pt[0], pt[1], "yellow", min(255, alpha + 50))

        # Radiating gold particles (16 as per style guide)
        random.seed(200 + f)
        for i in range(16):
            angle = (i / 16) * 2 * math.pi
            dist = 3 + t * 12
            gx = int(cx + math.cos(angle) * dist)
            gy = int(cy + math.sin(angle) * dist)
            p_alpha = int(255 * max(0, 1 - t * 0.7))
            color = ["gold", "yellow", "bright_yellow", "white"][i % 4]
            px(draw, f, gx, gy, color, p_alpha)

        # Ascending sparkle lines (upward motion)
        if f >= 1:
            for i in range(3):
                lx = cx - 4 + i * 4
                ly = int(cy - 3 - t * 8 + i * 2)
                px(draw, f, lx, ly, "bright_yellow", alpha)
                px(draw, f, lx, ly + 1, "gold", alpha // 2)

    return img


def gen_levelup_glow():
    """Level-up golden glow — expanding ring of light, 800ms."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16

    for f in range(6):
        t = f / 5.0
        radius = 3 + int(t * 10)
        alpha = int(200 * max(0, 1 - t * 0.7))

        # Expanding golden ring
        for pt in ring_pixels(cx, cy, radius, 1):
            px(draw, f, pt[0], pt[1], "gold", alpha)
        # Inner softer ring
        if radius > 2:
            for pt in ring_pixels(cx, cy, radius - 1, 1):
                px(draw, f, pt[0], pt[1], "yellow", alpha // 2)

        # Center bright dot fading
        if f < 4:
            px(draw, f, cx, cy, "bright_yellow", int(255 * (1 - t)))
            px(draw, f, cx - 1, cy, "yellow", int(200 * (1 - t)))
            px(draw, f, cx + 1, cy, "yellow", int(200 * (1 - t)))

    return img


def gen_levelup_fountain():
    """Level-up particle fountain — upward spray of gold/purple sparkles."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 24  # Start from bottom

    random.seed(300)
    particles = []
    for i in range(12):
        vx = random.uniform(-1.5, 1.5)
        vy = random.uniform(-2.5, -1.0)
        color = random.choice(["gold", "yellow", "purple", "light_purple", "white"])
        particles.append((vx, vy, color))

    for f in range(6):
        t = f / 5.0
        # Base glow at spawn point
        if f < 4:
            alpha = int(200 * (1 - t * 0.5))
            px(draw, f, cx, cy, "gold", alpha)
            px(draw, f, cx - 1, cy, "yellow", alpha // 2)
            px(draw, f, cx + 1, cy, "yellow", alpha // 2)

        for vx, vy, color in particles:
            pt = t + 0.1
            fx = int(cx + vx * pt * 8)
            fy = int(cy + vy * pt * 8 + 0.5 * pt * pt * 4)  # Gravity
            alpha = int(255 * max(0, 1 - t * 0.6))
            px(draw, f, fx, fy, color, alpha)

    return img


# ═══════════════════════════════════════════════════════════════════════════
# 4. LOOT PICKUP SPARKLE
# ═══════════════════════════════════════════════════════════════════════════

def gen_loot_glow():
    """Loot idle glow — pulsing soft glow around ground item, loops."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16

    for f in range(6):
        # Pulsing cycle (loops: frame 0 matches frame 5+1)
        pulse = 0.5 + 0.5 * math.sin(f / 5.0 * 2 * math.pi)
        alpha = int(80 + 100 * pulse)
        size = int(3 + 2 * pulse)

        # Soft diamond glow
        for pt in diamond_pixels(cx, cy, size):
            dist = abs(pt[0] - cx) + abs(pt[1] - cy)
            pa = int(alpha * max(0, 1 - dist / (size + 1)))
            px(draw, f, pt[0], pt[1], "gold", pa)

        # Corner sparkle dots that rotate
        for i in range(4):
            angle = (i / 4) * 2 * math.pi + f * 0.5
            sx = int(cx + math.cos(angle) * (size + 1))
            sy = int(cy + math.sin(angle) * (size + 1))
            px(draw, f, sx, sy, "bright_yellow", int(alpha * 0.8))

    return img


def gen_loot_sparkle():
    """Loot pickup sparkle trail — sparkles converging then swooshing up."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16

    random.seed(400)
    sparkles = []
    for i in range(8):
        angle = (i / 8) * 2 * math.pi
        start_dist = 8 + random.uniform(0, 4)
        sparkles.append((angle, start_dist))

    for f in range(6):
        t = f / 5.0
        if f < 3:
            # Converging phase — sparkles move inward
            for angle, start_dist in sparkles:
                dist = start_dist * (1 - t * 1.5)
                sx = int(cx + math.cos(angle) * max(0, dist))
                sy = int(cy + math.sin(angle) * max(0, dist))
                alpha = int(255 * min(1, t * 2 + 0.3))
                px(draw, f, sx, sy, "bright_yellow", alpha)
                px(draw, f, sx, sy, "white", alpha // 2)
        else:
            # Swoosh upward phase
            up_t = (f - 3) / 2.0
            trail_y = int(cy - up_t * 12)
            alpha = int(255 * (1 - up_t * 0.8))
            # Vertical trail
            for dy in range(4):
                ya = int(alpha * (1 - dy * 0.25))
                px(draw, f, cx, trail_y + dy, "yellow", ya)
                px(draw, f, cx - 1, trail_y + dy + 1, "gold", ya // 2)
                px(draw, f, cx + 1, trail_y + dy + 1, "gold", ya // 2)
            # Tip sparkle
            for pt in cross_pixels(cx, trail_y, 1, 1):
                px(draw, f, pt[0], pt[1], "white", alpha)

    return img


# ═══════════════════════════════════════════════════════════════════════════
# 5. CRITICAL HIT EMPHASIS
# ═══════════════════════════════════════════════════════════════════════════

def gen_crit_impact():
    """Critical hit impact — large starburst with shockwave ring."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16

    for f in range(6):
        t = f / 5.0
        alpha = int(255 * max(0, 1 - t * 0.7))

        # Large expanding starburst
        star_size = 2 + int(t * 8)
        if f < 4:
            for pt in star_pixels(cx, cy, min(star_size, 10)):
                px(draw, f, pt[0], pt[1], "white", alpha)
            for pt in star_pixels(cx, cy, min(star_size - 1, 8)):
                px(draw, f, pt[0], pt[1], "yellow", alpha)

        # Expanding shockwave ring
        ring_r = 4 + int(t * 10)
        ring_alpha = int(200 * max(0, 1 - t * 0.8))
        for pt in ring_pixels(cx, cy, ring_r, 1):
            px(draw, f, pt[0], pt[1], "gold", ring_alpha)

        # Radial speed lines
        for i in range(8):
            angle = (i / 8) * 2 * math.pi
            line_start = 4 + int(t * 6)
            line_end = line_start + 3
            for d in range(line_start, line_end):
                lx = int(cx + math.cos(angle) * d)
                ly = int(cy + math.sin(angle) * d)
                px(draw, f, lx, ly, "yellow", ring_alpha)

    return img


def gen_crit_zoom():
    """Critical hit zoom punch — radial lines converging for emphasis."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16

    for f in range(6):
        t = f / 5.0
        alpha = int(255 * max(0, 1 - t))

        # Radial lines from edges toward center
        for i in range(12):
            angle = (i / 12) * 2 * math.pi
            # Lines start far and converge
            start_d = 14 - int(t * 6)
            end_d = max(3, start_d - 4)
            for d in range(end_d, start_d):
                lx = int(cx + math.cos(angle) * d)
                ly = int(cy + math.sin(angle) * d)
                line_alpha = int(alpha * (d - end_d) / max(1, start_d - end_d))
                px(draw, f, lx, ly, "white", line_alpha)

        # Center bright burst on frame 0-1
        if f < 2:
            for pt in cross_pixels(cx, cy, 2, 1):
                px(draw, f, pt[0], pt[1], "white", 255)

    return img


# ═══════════════════════════════════════════════════════════════════════════
# 6. BOSS PHASE TRANSITIONS
# ═══════════════════════════════════════════════════════════════════════════

def gen_boss_roar():
    """Boss roar shockwave — expanding circular distortion ring."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16

    for f in range(6):
        t = f / 5.0
        # Multiple expanding rings
        for ring_i in range(3):
            ring_delay = ring_i * 0.15
            rt = max(0, t - ring_delay)
            if rt <= 0:
                continue
            radius = int(3 + rt * 12)
            alpha = int(200 * max(0, 1 - rt * 0.8))
            color = ["red", "orange", "dark_red"][ring_i]
            for pt in ring_pixels(cx, cy, radius, 1):
                px(draw, f, pt[0], pt[1], color, alpha)

        # Center boss rage indicator
        if f < 3:
            rage_alpha = int(255 * (1 - t * 0.8))
            for pt in circle_pixels(cx, cy, 3 - f):
                px(draw, f, pt[0], pt[1], "red", rage_alpha)

    return img


def gen_boss_shield():
    """Boss invulnerability shield — glowing protective aura."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16

    for f in range(6):
        # Pulsing shield (loops)
        pulse = 0.6 + 0.4 * math.sin(f / 5.0 * 2 * math.pi)
        alpha = int(150 * pulse)

        # Outer ring
        for pt in ring_pixels(cx, cy, 10, 1):
            px(draw, f, pt[0], pt[1], "player_cyan", alpha)
        # Inner ring
        for pt in ring_pixels(cx, cy, 8, 1):
            px(draw, f, pt[0], pt[1], "light_blue", int(alpha * 0.6))

        # Shimmer points rotating around the shield
        for i in range(6):
            angle = (i / 6) * 2 * math.pi + f * 0.8
            sx = int(cx + math.cos(angle) * 9)
            sy = int(cy + math.sin(angle) * 9)
            px(draw, f, sx, sy, "white", int(alpha * 1.2))

        # Subtle inner glow
        for pt in circle_pixels(cx, cy, 5):
            dist = math.sqrt((pt[0] - cx) ** 2 + (pt[1] - cy) ** 2)
            ga = int(40 * pulse * (1 - dist / 5))
            px(draw, f, pt[0], pt[1], "pale_blue", max(0, ga))

    return img


def gen_boss_darken():
    """Boss phase darken — vignette darkening from edges."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 16

    for f in range(6):
        t = f / 5.0
        # Increasing darkness from edges
        darkness = t * 0.8
        for y in range(32):
            for x in range(32):
                dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
                max_dist = 22
                # Vignette: darker at edges, lighter at center
                edge_factor = min(1, dist / max_dist)
                alpha = int(200 * darkness * edge_factor)
                if alpha > 10:
                    px(draw, f, x, y, "black", min(200, alpha))

        # Red flash on health bar area (top of frame)
        if f >= 2 and f <= 4:
            flash_alpha = int(150 * (1 - abs(f - 3) / 2))
            for x in range(8, 24):
                px(draw, f, x, 2, "red", flash_alpha)
                px(draw, f, x, 3, "dark_red", flash_alpha // 2)

    return img


def gen_boss_phase_flash():
    """Boss phase health bar flash — dramatic red/gold flash on health bar."""
    img = new_sheet()
    draw = ImageDraw.Draw(img)
    cx, cy = 16, 4  # Top of frame for HUD area

    for f in range(6):
        t = f / 5.0
        # Health bar flash pulse
        if f < 3:
            # Bright flash phase
            alpha = int(255 * (1 - t * 0.5))
            for x in range(4, 28):
                px(draw, f, x, 3, "red", alpha)
                px(draw, f, x, 4, "red", alpha)
                px(draw, f, x, 5, "dark_red", alpha // 2)
            # Gold highlight sweep
            sweep_x = 4 + int(t * 24)
            for dx in range(-2, 3):
                sx = sweep_x + dx
                if 4 <= sx < 28:
                    px(draw, f, sx, 3, "gold", alpha)
                    px(draw, f, sx, 4, "yellow", alpha)
        else:
            # Fading back
            fade = (f - 3) / 2.0
            alpha = int(180 * (1 - fade))
            for x in range(4, 28):
                px(draw, f, x, 3, "dark_red", alpha)
                px(draw, f, x, 4, "dark_red", alpha)

    return img


# ═══════════════════════════════════════════════════════════════════════════
# MAIN: Generate all assets
# ═══════════════════════════════════════════════════════════════════════════

ASSETS = {
    # Hit feedback
    "vfx_hit_sparks":       gen_hit_sparks,
    "vfx_hit_flash":        gen_hit_flash,
    "vfx_hit_damage":       gen_hit_damage,
    # Spell impact
    "vfx_impact_fire":      gen_impact_fire,
    "vfx_impact_ice":       gen_impact_ice,
    "vfx_impact_poison":    gen_impact_poison,
    "vfx_impact_lightning": gen_impact_lightning,
    # Level-up
    "vfx_levelup_burst":    gen_levelup_burst,
    "vfx_levelup_glow":     gen_levelup_glow,
    "vfx_levelup_fountain": gen_levelup_fountain,
    # Loot
    "vfx_loot_glow":        gen_loot_glow,
    "vfx_loot_sparkle":     gen_loot_sparkle,
    # Critical hit
    "vfx_crit_impact":      gen_crit_impact,
    "vfx_crit_zoom":        gen_crit_zoom,
    # Boss phase
    "vfx_boss_roar":        gen_boss_roar,
    "vfx_boss_shield":      gen_boss_shield,
    "vfx_boss_darken":      gen_boss_darken,
    "vfx_boss_phase_flash": gen_boss_phase_flash,
}


def main():
    os.makedirs(VFX_DIR, exist_ok=True)
    print(f"Generating {len(ASSETS)} VFX spritesheets to {VFX_DIR}/")

    for name, gen_func in ASSETS.items():
        path = os.path.join(VFX_DIR, f"{name}.png")
        img = gen_func()
        assert img.size == (SHEET_W, SHEET_H), \
            f"{name}: expected {SHEET_W}×{SHEET_H}, got {img.size}"
        img.save(path)
        print(f"  ✓ {name}.png ({SHEET_W}×{SHEET_H})")

    print(f"\nDone! {len(ASSETS)} VFX spritesheets generated.")


if __name__ == "__main__":
    main()
