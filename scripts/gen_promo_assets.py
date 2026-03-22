#!/usr/bin/env python3
"""Generate promotional art assets for PixelRealm itch.io launch.

All art uses the master 32-color palette and pixel art style (base 4px pixel).
Outputs: cover image (630x500), banner (960x540), loading screen (960x540).
"""

import sys, os, random, math

sys.path.insert(0, "/tmp/pylibs")
from PIL import Image, ImageDraw

# ── Master Palette ──────────────────────────────────────────────────────
PAL = {
    # Neutrals
    "black":       (0x0d, 0x0d, 0x0d),
    "dark_gray":   (0x2b, 0x2b, 0x2b),
    "mid_gray":    (0x4a, 0x4a, 0x4a),
    "gray":        (0x6e, 0x6e, 0x6e),
    "light_gray":  (0x96, 0x96, 0x96),
    "silver":      (0xc8, 0xc8, 0xc8),
    "white":       (0xf0, 0xf0, 0xf0),
    # Warm Earth
    "earth_dark":  (0x3b, 0x20, 0x10),
    "earth_mid":   (0x6b, 0x3a, 0x1f),
    "brown":       (0x8b, 0x5c, 0x2a),
    "tan":         (0xb8, 0x84, 0x3f),
    "sand":        (0xd4, 0xa8, 0x5a),
    "cream":       (0xe8, 0xd0, 0x8a),
    # Greens
    "green_dark":  (0x1a, 0x3a, 0x1a),
    "green_mid":   (0x2d, 0x6e, 0x2d),
    "green":       (0x4c, 0x9b, 0x4c),
    "green_light": (0x78, 0xc8, 0x78),
    "green_pale":  (0xa8, 0xe4, 0xa0),
    # Cyan / Blue
    "navy":        (0x0a, 0x1a, 0x3a),
    "blue_dark":   (0x1a, 0x4a, 0x8a),
    "blue":        (0x2a, 0x7a, 0xc0),
    "cyan":        (0x50, 0xa8, 0xe8),
    "cyan_light":  (0x90, 0xd0, 0xf8),
    "ice":         (0xc8, 0xf0, 0xff),
    # Red / Orange
    "red_dark":    (0x5a, 0x0a, 0x0a),
    "red":         (0xa0, 0x10, 0x10),
    "red_bright":  (0xd4, 0x20, 0x20),
    "orange":      (0xf0, 0x60, 0x20),
    "peach":       (0xf8, 0xa0, 0x60),
    # Yellow / Gold
    "gold_dark":   (0xa8, 0x70, 0x00),
    "gold":        (0xe8, 0xb8, 0x00),
    "yellow":      (0xff, 0xe0, 0x40),
    "yellow_pale": (0xff, 0xf8, 0xa0),
    # Purple
    "purple_dark": (0x1a, 0x0a, 0x3a),
    "purple_mid":  (0x5a, 0x20, 0xa0),
    "purple":      (0x90, 0x50, 0xe0),
    "purple_light":(0xd0, 0x90, 0xff),
}

# Pixel scale: 1 "game pixel" = PX screen pixels
PX = 4


def fill_rect(draw, x, y, w, h, color):
    """Draw a rectangle in game-pixel coordinates."""
    draw.rectangle([x * PX, y * PX, (x + w) * PX - 1, (y + h) * PX - 1], fill=color)


def draw_sky_gradient(draw, width_px, height_px, top_color, bottom_color):
    """Draw a vertical gradient sky in game-pixel rows."""
    gw = width_px // PX
    gh = height_px // PX
    for row in range(gh):
        t = row / max(gh - 1, 1)
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * t)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * t)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * t)
        fill_rect(draw, 0, row, gw, 1, (r, g, b))


def draw_stars(draw, width_px, height_px, count=30):
    """Scatter star pixels in the upper portion of the sky."""
    gw = width_px // PX
    gh = height_px // PX
    random.seed(42)  # reproducible
    for _ in range(count):
        sx = random.randint(1, gw - 2)
        sy = random.randint(1, gh // 3)
        brightness = random.choice([PAL["white"], PAL["silver"], PAL["cyan_light"]])
        fill_rect(draw, sx, sy, 1, 1, brightness)


def draw_moon(draw, cx, cy):
    """Draw a small pixel moon."""
    fill_rect(draw, cx, cy, 3, 3, PAL["ice"])
    fill_rect(draw, cx + 1, cy - 1, 1, 1, PAL["ice"])
    fill_rect(draw, cx - 1, cy + 1, 1, 1, PAL["cyan_light"])
    fill_rect(draw, cx + 3, cy + 1, 1, 1, PAL["cyan_light"])


def draw_mountains(draw, base_y, width_gx, color_dark, color_mid):
    """Draw a mountain range."""
    random.seed(99)
    peaks = [(width_gx * i // 5, base_y - random.randint(12, 22)) for i in range(6)]
    for i in range(len(peaks) - 1):
        x1, y1 = peaks[i]
        x2, y2 = peaks[i + 1]
        for x in range(x1, x2):
            t = (x - x1) / max(x2 - x1, 1)
            y_top = int(y1 + (y2 - y1) * t)
            for y in range(y_top, base_y):
                c = color_dark if (y - y_top) > (base_y - y_top) // 2 else color_mid
                fill_rect(draw, x, y, 1, 1, c)


def draw_trees(draw, base_y, width_gx, count=12):
    """Draw pixel art trees along the ground."""
    random.seed(77)
    for i in range(count):
        tx = random.randint(2, width_gx - 4)
        # Trunk
        fill_rect(draw, tx, base_y - 4, 1, 4, PAL["earth_mid"])
        # Canopy (triangle-ish)
        fill_rect(draw, tx - 1, base_y - 6, 3, 2, PAL["green_mid"])
        fill_rect(draw, tx, base_y - 7, 1, 1, PAL["green"])
        # Highlight
        fill_rect(draw, tx - 1, base_y - 6, 1, 1, PAL["green_light"])


def draw_ground(draw, base_y, width_gx, height_gy):
    """Draw ground with grass."""
    # Dirt
    for y in range(base_y, height_gy):
        for x in range(width_gx):
            c = PAL["green_dark"] if y == base_y else PAL["earth_dark"]
            fill_rect(draw, x, y, 1, 1, c)
    # Grass blades
    random.seed(33)
    for x in range(0, width_gx, 2):
        if random.random() > 0.4:
            fill_rect(draw, x, base_y - 1, 1, 1, PAL["green"])


def draw_pixel_char(draw, x, y, char_type="warrior"):
    """Draw a 8x12 game-pixel character at position (x, y)."""
    if char_type == "warrior":
        # Head
        fill_rect(draw, x + 2, y, 4, 3, PAL["peach"])
        # Hair
        fill_rect(draw, x + 2, y, 4, 1, PAL["tan"])
        # Eyes
        fill_rect(draw, x + 3, y + 1, 1, 1, PAL["cyan"])
        fill_rect(draw, x + 5, y + 1, 1, 1, PAL["cyan"])
        # Body (blue armor)
        fill_rect(draw, x + 1, y + 3, 6, 4, PAL["blue"])
        fill_rect(draw, x + 3, y + 3, 2, 1, PAL["cyan"])  # chest emblem
        # Arms
        fill_rect(draw, x, y + 3, 1, 4, PAL["cyan"])
        fill_rect(draw, x + 7, y + 3, 1, 4, PAL["cyan"])
        # Legs
        fill_rect(draw, x + 2, y + 7, 2, 3, PAL["blue_dark"])
        fill_rect(draw, x + 4, y + 7, 2, 3, PAL["blue_dark"])
        # Boots
        fill_rect(draw, x + 1, y + 10, 3, 2, PAL["brown"])
        fill_rect(draw, x + 4, y + 10, 3, 2, PAL["brown"])
        # Sword (right side)
        fill_rect(draw, x + 8, y + 1, 1, 7, PAL["silver"])
        fill_rect(draw, x + 7, y + 5, 3, 1, PAL["gold"])  # crossguard
        fill_rect(draw, x + 8, y + 8, 1, 2, PAL["brown"])  # handle
    elif char_type == "mage":
        # Hat
        fill_rect(draw, x + 3, y - 2, 2, 2, PAL["purple"])
        fill_rect(draw, x + 2, y, 4, 1, PAL["purple"])
        # Head
        fill_rect(draw, x + 2, y + 1, 4, 2, PAL["peach"])
        fill_rect(draw, x + 3, y + 2, 1, 1, PAL["purple"])
        fill_rect(draw, x + 5, y + 2, 1, 1, PAL["purple"])
        # Robe
        fill_rect(draw, x + 1, y + 3, 6, 5, PAL["purple_mid"])
        fill_rect(draw, x + 3, y + 4, 2, 1, PAL["purple_light"])
        # Arms
        fill_rect(draw, x, y + 3, 1, 4, PAL["purple"])
        fill_rect(draw, x + 7, y + 3, 1, 4, PAL["purple"])
        # Robe bottom
        fill_rect(draw, x + 1, y + 8, 6, 3, PAL["purple_dark"])
        fill_rect(draw, x, y + 9, 1, 2, PAL["purple_mid"])
        fill_rect(draw, x + 7, y + 9, 1, 2, PAL["purple_mid"])
        # Staff
        fill_rect(draw, x - 1, y - 1, 1, 12, PAL["brown"])
        fill_rect(draw, x - 2, y - 2, 3, 1, PAL["purple_light"])  # crystal
        fill_rect(draw, x - 1, y - 3, 1, 1, PAL["yellow"])
    elif char_type == "ranger":
        # Head
        fill_rect(draw, x + 2, y, 4, 3, PAL["peach"])
        # Hood
        fill_rect(draw, x + 1, y, 6, 1, PAL["green_mid"])
        fill_rect(draw, x + 1, y - 1, 2, 1, PAL["green_mid"])
        # Eyes
        fill_rect(draw, x + 3, y + 1, 1, 1, PAL["green"])
        fill_rect(draw, x + 5, y + 1, 1, 1, PAL["green"])
        # Tunic
        fill_rect(draw, x + 1, y + 3, 6, 4, PAL["green_mid"])
        fill_rect(draw, x + 2, y + 3, 4, 1, PAL["green"])
        # Arms
        fill_rect(draw, x, y + 3, 1, 4, PAL["green"])
        fill_rect(draw, x + 7, y + 3, 1, 4, PAL["green"])
        # Legs
        fill_rect(draw, x + 2, y + 7, 2, 3, PAL["earth_mid"])
        fill_rect(draw, x + 4, y + 7, 2, 3, PAL["earth_mid"])
        # Boots
        fill_rect(draw, x + 1, y + 10, 3, 2, PAL["earth_dark"])
        fill_rect(draw, x + 4, y + 10, 3, 2, PAL["earth_dark"])
        # Bow
        fill_rect(draw, x + 8, y + 1, 1, 8, PAL["brown"])
        fill_rect(draw, x + 9, y + 2, 1, 1, PAL["tan"])
        fill_rect(draw, x + 9, y + 7, 1, 1, PAL["tan"])
        fill_rect(draw, x + 9, y + 3, 1, 4, PAL["silver"])  # string


def draw_enemy(draw, x, y, enemy_type="goblin"):
    """Draw a small enemy sprite."""
    if enemy_type == "goblin":
        # Head
        fill_rect(draw, x + 1, y, 4, 3, PAL["orange"])
        fill_rect(draw, x + 2, y + 1, 1, 1, PAL["red_bright"])
        fill_rect(draw, x + 4, y + 1, 1, 1, PAL["red_bright"])
        # Ears
        fill_rect(draw, x, y, 1, 2, PAL["orange"])
        fill_rect(draw, x + 5, y, 1, 2, PAL["orange"])
        # Body
        fill_rect(draw, x + 1, y + 3, 4, 3, PAL["red_dark"])
        # Arms
        fill_rect(draw, x, y + 3, 1, 3, PAL["orange"])
        fill_rect(draw, x + 5, y + 3, 1, 3, PAL["orange"])
        # Legs
        fill_rect(draw, x + 1, y + 6, 2, 2, PAL["red_dark"])
        fill_rect(draw, x + 3, y + 6, 2, 2, PAL["red_dark"])
    elif enemy_type == "slime":
        fill_rect(draw, x + 1, y + 2, 4, 3, PAL["green"])
        fill_rect(draw, x, y + 3, 1, 2, PAL["green"])
        fill_rect(draw, x + 5, y + 3, 1, 2, PAL["green"])
        fill_rect(draw, x + 1, y + 5, 4, 1, PAL["green_dark"])
        fill_rect(draw, x + 2, y + 1, 2, 1, PAL["green_light"])
        fill_rect(draw, x + 2, y + 3, 1, 1, PAL["white"])
        fill_rect(draw, x + 4, y + 3, 1, 1, PAL["white"])
    elif enemy_type == "skeleton":
        fill_rect(draw, x + 1, y, 4, 3, PAL["white"])
        fill_rect(draw, x + 2, y + 1, 1, 1, PAL["black"])
        fill_rect(draw, x + 4, y + 1, 1, 1, PAL["black"])
        fill_rect(draw, x + 1, y + 3, 4, 4, PAL["silver"])
        fill_rect(draw, x, y + 3, 1, 3, PAL["silver"])
        fill_rect(draw, x + 5, y + 3, 1, 3, PAL["silver"])
        fill_rect(draw, x + 1, y + 7, 2, 2, PAL["silver"])
        fill_rect(draw, x + 3, y + 7, 2, 2, PAL["silver"])


def draw_title_text(draw, text, start_x, y, color, px_scale=1):
    """Draw pixel-font text. Simple 5x7 bitmap font for A-Z and space."""
    FONT = {
        'A': ["0110","1001","1001","1111","1001","1001","1001"],
        'B': ["1110","1001","1001","1110","1001","1001","1110"],
        'C': ["0111","1000","1000","1000","1000","1000","0111"],
        'D': ["1110","1001","1001","1001","1001","1001","1110"],
        'E': ["1111","1000","1000","1110","1000","1000","1111"],
        'F': ["1111","1000","1000","1110","1000","1000","1000"],
        'G': ["0111","1000","1000","1011","1001","1001","0110"],
        'H': ["1001","1001","1001","1111","1001","1001","1001"],
        'I': ["111","010","010","010","010","010","111"],
        'J': ["0011","0001","0001","0001","0001","1001","0110"],
        'K': ["1001","1010","1100","1000","1100","1010","1001"],
        'L': ["1000","1000","1000","1000","1000","1000","1111"],
        'M': ["10001","11011","10101","10001","10001","10001","10001"],
        'N': ["10001","11001","10101","10011","10001","10001","10001"],
        'O': ["0110","1001","1001","1001","1001","1001","0110"],
        'P': ["1110","1001","1001","1110","1000","1000","1000"],
        'Q': ["0110","1001","1001","1001","1001","0110","0001"],
        'R': ["1110","1001","1001","1110","1010","1001","1001"],
        'S': ["0111","1000","1000","0110","0001","0001","1110"],
        'T': ["11111","00100","00100","00100","00100","00100","00100"],
        'U': ["1001","1001","1001","1001","1001","1001","0110"],
        'V': ["10001","10001","10001","10001","01010","01010","00100"],
        'W': ["10001","10001","10001","10101","10101","11011","10001"],
        'X': ["10001","01010","00100","00100","00100","01010","10001"],
        'Y': ["10001","01010","00100","00100","00100","00100","00100"],
        'Z': ["1111","0001","0010","0100","1000","1000","1111"],
        '0': ["0110","1001","1001","1001","1001","1001","0110"],
        '1': ["010","110","010","010","010","010","111"],
        '.': ["0","0","0","0","0","0","1"],
        '-': ["000","000","000","111","000","000","000"],
        ' ': ["00","00","00","00","00","00","00"],
    }
    cx = start_x
    for ch in text.upper():
        glyph = FONT.get(ch, FONT[' '])
        for row_i, row in enumerate(glyph):
            for col_i, bit in enumerate(row):
                if bit == '1':
                    fill_rect(draw, cx + col_i * px_scale, y + row_i * px_scale, px_scale, px_scale, color)
        cx += (len(glyph[0]) + 1) * px_scale


def draw_logo_block(draw, cx, cy, scale=2):
    """Draw the PixelRealm logo at a given center, using the pixel font."""
    # "PIXEL" in cyan
    pw = (5 + 3 + 5 + 4 + 4) * scale + 4 * scale  # total width of PIXEL
    rw = (4 + 4 + 4 + 4 + 5) * scale + 4 * scale  # total width of REALM
    total_w = pw + 2 * scale + rw  # gap between words
    sx = cx - total_w // 2
    draw_title_text(draw, "PIXEL", sx, cy, PAL["cyan"], scale)
    draw_title_text(draw, "REALM", sx + pw + 2 * scale, cy, PAL["yellow"], scale)


def draw_xp_orbs(draw, cx, cy, count=3):
    """Draw small XP orb pickups."""
    for i in range(count):
        ox = cx + i * 4
        fill_rect(draw, ox, cy, 2, 2, PAL["yellow"])
        fill_rect(draw, ox, cy, 1, 1, PAL["yellow_pale"])


def draw_health_pickup(draw, x, y):
    """Draw a health pickup (green cross)."""
    fill_rect(draw, x + 1, y, 1, 3, PAL["green_light"])
    fill_rect(draw, x, y + 1, 3, 1, PAL["green_light"])


def draw_gem(draw, x, y):
    """Draw a small gem pickup."""
    fill_rect(draw, x + 1, y, 2, 1, PAL["purple_light"])
    fill_rect(draw, x, y + 1, 4, 2, PAL["purple"])
    fill_rect(draw, x + 1, y + 3, 2, 1, PAL["purple_mid"])


def draw_coin(draw, x, y):
    """Draw a coin."""
    fill_rect(draw, x + 1, y, 2, 1, PAL["gold"])
    fill_rect(draw, x, y + 1, 4, 2, PAL["yellow"])
    fill_rect(draw, x + 1, y + 3, 2, 1, PAL["gold"])
    fill_rect(draw, x + 2, y + 1, 1, 2, PAL["gold_dark"])


def draw_path(draw, base_y, width_gx, y_offset=0):
    """Draw a path/road on the ground."""
    py = base_y + y_offset
    for x in range(width_gx):
        fill_rect(draw, x, py, 1, 2, PAL["tan"])
        if x % 4 == 0:
            fill_rect(draw, x, py, 1, 1, PAL["sand"])


def draw_torch(draw, x, y):
    """Draw a small torch with flame."""
    fill_rect(draw, x, y + 2, 1, 4, PAL["brown"])
    fill_rect(draw, x - 1, y, 3, 2, PAL["orange"])
    fill_rect(draw, x, y - 1, 1, 1, PAL["yellow"])


def draw_pixel_border(draw, width_px, height_px, color, thickness=1):
    """Draw a decorative pixel border."""
    gw = width_px // PX
    gh = height_px // PX
    for t in range(thickness):
        for x in range(gw):
            fill_rect(draw, x, t, 1, 1, color)
            fill_rect(draw, x, gh - 1 - t, 1, 1, color)
        for y in range(gh):
            fill_rect(draw, t, y, 1, 1, color)
            fill_rect(draw, gw - 1 - t, y, 1, 1, color)


# ════════════════════════════════════════════════════════════════════════
# ASSET 1: itch.io Cover Image (630×500)
# ════════════════════════════════════════════════════════════════════════
def generate_cover(out_path):
    W, H = 632, 500  # round to PX multiple (632=158*4, 500=125*4)
    img = Image.new("RGBA", (W, H), PAL["black"])
    draw = ImageDraw.Draw(img)
    gw, gh = W // PX, H // PX  # 158, 125

    # Sky gradient
    draw_sky_gradient(draw, W, H, PAL["navy"], PAL["blue_dark"])

    # Stars
    draw_stars(draw, W, H, count=40)

    # Moon
    draw_moon(draw, gw - 20, 8)

    # Mountains (background)
    draw_mountains(draw, gh - 28, gw, PAL["dark_gray"], PAL["mid_gray"])

    # Trees (midground)
    draw_trees(draw, gh - 18, gw, count=16)

    # Ground
    draw_ground(draw, gh - 14, gw, gh)

    # Path
    draw_path(draw, gh - 14, gw, 2)

    # Characters (center group - party of three)
    center_x = gw // 2
    draw_pixel_char(draw, center_x - 14, gh - 28, "warrior")
    draw_pixel_char(draw, center_x - 3, gh - 29, "mage")
    draw_pixel_char(draw, center_x + 8, gh - 28, "ranger")

    # Enemies (flanking)
    draw_enemy(draw, center_x - 30, gh - 22, "goblin")
    draw_enemy(draw, center_x - 36, gh - 20, "slime")
    draw_enemy(draw, center_x + 24, gh - 22, "skeleton")
    draw_enemy(draw, center_x + 30, gh - 21, "goblin")

    # Pickups scattered
    draw_coin(draw, center_x - 20, gh - 18)
    draw_gem(draw, center_x + 18, gh - 19)
    draw_health_pickup(draw, center_x - 8, gh - 17)
    draw_xp_orbs(draw, center_x + 5, gh - 16, 3)

    # Torches
    draw_torch(draw, center_x - 40, gh - 24)
    draw_torch(draw, center_x + 40, gh - 24)

    # Logo at top
    draw_logo_block(draw, gw // 2, 12, scale=3)

    # Subtitle
    sub_y = 36
    draw_title_text(draw, "PIXELATED MMORPG ADVENTURE", gw // 2 - 65, sub_y, PAL["light_gray"], 1)

    # Decorative border
    draw_pixel_border(draw, W, H, PAL["gold_dark"], 2)

    # Corner accents
    fill_rect(draw, 2, 2, 3, 3, PAL["yellow"])
    fill_rect(draw, gw - 5, 2, 3, 3, PAL["yellow"])
    fill_rect(draw, 2, gh - 5, 3, 3, PAL["yellow"])
    fill_rect(draw, gw - 5, gh - 5, 3, 3, PAL["yellow"])

    # Crop to exact 630x500
    img = img.crop((0, 0, 630, 500))
    img.save(out_path)
    print(f"  Cover image: {out_path} ({img.size[0]}x{img.size[1]})")


# ════════════════════════════════════════════════════════════════════════
# ASSET 2: Banner Image (960×540)
# ════════════════════════════════════════════════════════════════════════
def generate_banner(out_path):
    W, H = 960, 540
    img = Image.new("RGBA", (W, H), PAL["black"])
    draw = ImageDraw.Draw(img)
    gw, gh = W // PX, H // PX  # 240, 135

    # Dusk sky gradient (warmer for banner)
    draw_sky_gradient(draw, W, H, PAL["navy"], PAL["blue"])

    # Stars (fewer, dusk)
    draw_stars(draw, W, H, count=25)

    # Moon
    draw_moon(draw, gw - 30, 10)

    # Multiple mountain ranges for depth
    # Far mountains (darker)
    random.seed(50)
    for i in range(0, gw, 15):
        peak_h = random.randint(15, 28)
        for dx in range(15):
            col_h = int(peak_h * (1 - abs(dx - 7) / 8))
            if col_h > 0:
                for dy in range(col_h):
                    fill_rect(draw, i + dx, gh - 35 - col_h + dy, 1, 1, PAL["dark_gray"])

    # Near mountains (slightly lighter)
    random.seed(60)
    for i in range(0, gw, 20):
        peak_h = random.randint(10, 20)
        for dx in range(20):
            col_h = int(peak_h * (1 - abs(dx - 10) / 11))
            if col_h > 0:
                for dy in range(col_h):
                    fill_rect(draw, i + dx, gh - 25 - col_h + dy, 1, 1, PAL["mid_gray"])

    # Forest tree line
    random.seed(70)
    for x in range(0, gw, 3):
        th = random.randint(3, 7)
        fill_rect(draw, x, gh - 22 - th, 2, th, PAL["green_dark"])
        fill_rect(draw, x, gh - 22 - th, 1, 1, PAL["green_mid"])

    # Ground
    draw_ground(draw, gh - 16, gw, gh)

    # Wider path across the banner
    draw_path(draw, gh - 16, gw, 2)

    # Scene: wider adventure panorama
    # Town buildings on the left
    # Building 1
    fill_rect(draw, 15, gh - 28, 8, 12, PAL["gray"])
    fill_rect(draw, 16, gh - 26, 2, 2, PAL["yellow"])  # window lit
    fill_rect(draw, 20, gh - 26, 2, 2, PAL["yellow"])  # window lit
    fill_rect(draw, 18, gh - 18, 3, 2, PAL["brown"])  # door
    fill_rect(draw, 14, gh - 30, 10, 2, PAL["red_dark"])  # roof

    # Building 2
    fill_rect(draw, 26, gh - 32, 10, 16, PAL["mid_gray"])
    fill_rect(draw, 28, gh - 30, 2, 2, PAL["yellow"])
    fill_rect(draw, 32, gh - 30, 2, 2, PAL["yellow"])
    fill_rect(draw, 30, gh - 18, 3, 2, PAL["brown"])
    fill_rect(draw, 25, gh - 34, 12, 2, PAL["red_dark"])
    # Tower on building 2
    fill_rect(draw, 29, gh - 38, 4, 6, PAL["gray"])
    fill_rect(draw, 30, gh - 36, 2, 2, PAL["yellow"])

    # Party of three in center-left
    draw_pixel_char(draw, 65, gh - 28, "warrior")
    draw_pixel_char(draw, 78, gh - 29, "mage")
    draw_pixel_char(draw, 91, gh - 28, "ranger")

    # Action sparkle from mage
    fill_rect(draw, 83, gh - 34, 1, 1, PAL["purple_light"])
    fill_rect(draw, 85, gh - 33, 1, 1, PAL["yellow"])
    fill_rect(draw, 81, gh - 33, 1, 1, PAL["purple_light"])

    # Enemy camp on the right
    draw_enemy(draw, 160, gh - 24, "goblin")
    draw_enemy(draw, 170, gh - 22, "goblin")
    draw_enemy(draw, 180, gh - 24, "skeleton")
    draw_enemy(draw, 190, gh - 23, "slime")

    # Campfire between enemies
    fill_rect(draw, 175, gh - 18, 2, 2, PAL["orange"])
    fill_rect(draw, 174, gh - 19, 4, 1, PAL["red_bright"])
    fill_rect(draw, 175, gh - 20, 2, 1, PAL["yellow"])

    # Treasure chest
    fill_rect(draw, 140, gh - 18, 5, 3, PAL["brown"])
    fill_rect(draw, 140, gh - 18, 5, 1, PAL["tan"])
    fill_rect(draw, 142, gh - 19, 1, 1, PAL["gold"])  # lock

    # Scattered loot
    draw_coin(draw, 110, gh - 17)
    draw_coin(draw, 115, gh - 16)
    draw_gem(draw, 120, gh - 18)
    draw_xp_orbs(draw, 130, gh - 17, 4)

    # Torches along path
    for tx in [50, 100, 150, 200]:
        draw_torch(draw, tx, gh - 25)

    # NPC guide on right side
    fill_rect(draw, 215, gh - 27, 4, 3, PAL["peach"])  # head
    fill_rect(draw, 215, gh - 28, 4, 1, PAL["gold"])  # hat
    fill_rect(draw, 214, gh - 24, 6, 4, PAL["cyan"])  # robe
    fill_rect(draw, 215, gh - 20, 4, 3, PAL["blue"])  # robe bottom
    # Speech bubble "!"
    fill_rect(draw, 220, gh - 32, 4, 4, PAL["white"])
    fill_rect(draw, 221, gh - 31, 1, 2, PAL["gold"])

    # Logo centered at top
    draw_logo_block(draw, gw // 2, 10, scale=3)

    # Decorative border
    draw_pixel_border(draw, W, H, PAL["gold_dark"], 2)

    # Corner accents
    fill_rect(draw, 2, 2, 3, 3, PAL["yellow"])
    fill_rect(draw, gw - 5, 2, 3, 3, PAL["yellow"])
    fill_rect(draw, 2, gh - 5, 3, 3, PAL["yellow"])
    fill_rect(draw, gw - 5, gh - 5, 3, 3, PAL["yellow"])

    img.save(out_path)
    print(f"  Banner image: {out_path} ({img.size[0]}x{img.size[1]})")


# ════════════════════════════════════════════════════════════════════════
# ASSET 3: Loading / Splash Screen (960×540)
# ════════════════════════════════════════════════════════════════════════
def generate_loading_screen(out_path):
    W, H = 960, 540
    img = Image.new("RGBA", (W, H), PAL["black"])
    draw = ImageDraw.Draw(img)
    gw, gh = W // PX, H // PX  # 240, 135

    # Dark gradient background
    draw_sky_gradient(draw, W, H, PAL["black"], PAL["navy"])

    # Subtle star field
    draw_stars(draw, W, H, count=50)

    # Central logo (large)
    draw_logo_block(draw, gw // 2, gh // 2 - 16, scale=4)

    # Decorative sword crossed behind logo
    # Left sword (diagonal implied via pixel blocks)
    sx = gw // 2 - 30
    sy = gh // 2 - 8
    for i in range(16):
        fill_rect(draw, sx + i, sy + i // 2, 1, 1, PAL["silver"])
    fill_rect(draw, sx + 6, sy + 3, 1, 3, PAL["gold"])  # crossguard

    # Right sword (mirror)
    sx2 = gw // 2 + 30
    for i in range(16):
        fill_rect(draw, sx2 - i, sy + i // 2, 1, 1, PAL["silver"])
    fill_rect(draw, sx2 - 6, sy + 3, 1, 3, PAL["gold"])

    # Loading bar frame
    bar_y = gh // 2 + 20
    bar_w = 60
    bar_x = gw // 2 - bar_w // 2
    # Frame
    fill_rect(draw, bar_x - 1, bar_y - 1, bar_w + 2, 5, PAL["mid_gray"])
    fill_rect(draw, bar_x, bar_y, bar_w, 3, PAL["dark_gray"])
    # Fill (show ~70% loaded for the splash)
    fill_w = int(bar_w * 0.7)
    fill_rect(draw, bar_x, bar_y, fill_w, 3, PAL["cyan"])
    # Highlight on fill
    fill_rect(draw, bar_x, bar_y, fill_w, 1, PAL["cyan_light"])

    # "LOADING..." text below bar
    load_text_y = bar_y + 8
    draw_title_text(draw, "LOADING...", gw // 2 - 24, load_text_y, PAL["light_gray"], 1)

    # Decorative pixel particles around logo
    random.seed(123)
    for _ in range(20):
        px = gw // 2 + random.randint(-50, 50)
        py = gh // 2 + random.randint(-25, 25)
        pc = random.choice([PAL["purple_light"], PAL["cyan_light"], PAL["yellow"], PAL["gold"]])
        fill_rect(draw, px, py, 1, 1, pc)

    # Bottom text: version
    ver_y = gh - 10
    draw_title_text(draw, "PIXELREALM", gw // 2 - 26, ver_y, PAL["mid_gray"], 1)

    # Subtle border
    draw_pixel_border(draw, W, H, PAL["dark_gray"], 1)

    img.save(out_path)
    print(f"  Loading screen: {out_path} ({img.size[0]}x{img.size[1]})")


# ════════════════════════════════════════════════════════════════════════
# ASSET 4: Logo as high-res PNG (for use without SVG support)
# ════════════════════════════════════════════════════════════════════════
def generate_logo_png(out_path):
    W, H = 640, 160
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))  # transparent bg
    draw = ImageDraw.Draw(img)
    gw, gh = W // PX, H // PX  # 160, 40

    # Logo centered
    draw_logo_block(draw, gw // 2, gh // 2 - 6, scale=3)

    # Subtitle line
    sub_y = gh // 2 + 12
    draw_title_text(draw, "PIXELATED MMORPG ADVENTURE", gw // 2 - 65, sub_y, PAL["light_gray"], 1)

    img.save(out_path)
    print(f"  Logo PNG: {out_path} ({img.size[0]}x{img.size[1]})")


# ════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    promo_dir = os.path.join(base, "assets", "promo")
    bg_dir = os.path.join(base, "assets", "backgrounds")
    os.makedirs(promo_dir, exist_ok=True)

    print("Generating PixelRealm promotional assets...")
    generate_cover(os.path.join(promo_dir, "cover_itchio_630x500.png"))
    generate_banner(os.path.join(promo_dir, "banner_promo_960x540.png"))
    generate_loading_screen(os.path.join(bg_dir, "bg_loading.png"))
    generate_logo_png(os.path.join(promo_dir, "logo_pixelrealm.png"))
    print("Done! All assets generated with the master 32-color palette.")
