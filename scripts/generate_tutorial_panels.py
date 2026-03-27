#!/usr/bin/env python3
"""Generate 160x90 pixel art tutorial panel illustrations for PixelRealm.

Panels:
  1. tut_mount.png       — mount summon, dismount, speed boost
  2. tut_housing.png     — plot purchase, furniture placement, visiting
  3. tut_fishing.png     — cast, reel, catch mechanics
  4. tut_auction.png     — list item, bid, buyout flow
  5. tut_cosmetic.png    — preview, purchase, equip

Style: dark panel background with gold border studs matching existing UI.
Each panel shows a 3-step sequence left-to-right with numbered circles.
"""

import sys, os
sys.path.insert(0, "/tmp/pylibs")

from PIL import Image, ImageDraw

W, H = 160, 90

# Palette matching existing PixelRealm UI
COL = {
    "bg_dark":     (30, 28, 36),
    "bg_mid":      (45, 42, 54),
    "border":      (120, 85, 40),
    "border_hi":   (180, 140, 60),
    "stud":        (200, 160, 60),
    "stud_shadow": (100, 75, 30),
    "text_white":  (230, 225, 215),
    "text_gold":   (220, 185, 80),
    "green":       (80, 180, 80),
    "green_dark":  (50, 120, 50),
    "blue":        (70, 130, 200),
    "blue_dark":   (40, 80, 140),
    "blue_light":  (120, 180, 240),
    "red":         (200, 70, 70),
    "red_dark":    (140, 40, 40),
    "brown":       (140, 100, 50),
    "brown_dark":  (90, 65, 35),
    "brown_light": (180, 140, 80),
    "tan":         (200, 175, 130),
    "skin":        (220, 190, 150),
    "hair":        (100, 70, 40),
    "cyan":        (80, 200, 200),
    "cyan_dark":   (40, 140, 140),
    "orange":      (220, 150, 50),
    "yellow":      (240, 220, 80),
    "purple":      (140, 80, 180),
    "purple_dark": (90, 50, 120),
    "white":       (255, 255, 255),
    "gray":        (120, 115, 110),
    "gray_dark":   (70, 65, 62),
    "water":       (50, 100, 170),
    "water_light": (80, 140, 210),
    "grass":       (60, 140, 50),
    "grass_dark":  (40, 100, 35),
    "wood":        (130, 90, 45),
    "wood_dark":   (90, 60, 30),
    "roof":        (160, 60, 50),
    "roof_dark":   (120, 40, 35),
    "gold_coin":   (240, 200, 60),
    "silver":      (180, 185, 195),
}


def new_panel():
    """Create base panel with dark bg and gold studded border."""
    img = Image.new("RGBA", (W, H), COL["bg_dark"])
    d = ImageDraw.Draw(img)

    # Border rectangles
    d.rectangle([0, 0, W-1, H-1], outline=COL["border"])
    d.rectangle([1, 1, W-2, H-2], outline=COL["border_hi"])

    # Corner studs
    for x, y in [(3, 3), (W-5, 3), (3, H-5), (W-5, H-5)]:
        d.rectangle([x, y, x+1, y+1], fill=COL["stud"])
        d.point((x+1, y+1), fill=COL["stud_shadow"])

    # Edge studs along top/bottom
    for sx in range(15, W-15, 20):
        for y in [3, H-5]:
            d.rectangle([sx, y, sx+1, y+1], fill=COL["stud"])
            d.point((sx+1, y+1), fill=COL["stud_shadow"])

    return img, d


def draw_step_number(d, x, y, num, color=None):
    """Draw a numbered circle indicator (1, 2, 3)."""
    c = color or COL["text_gold"]
    # Small 5x5 circle
    d.ellipse([x, y, x+6, y+6], fill=COL["bg_dark"], outline=c)
    # Number pixel pattern (centered in circle)
    cx, cy = x+2, y+1
    if num == 1:
        d.point((cx+1, cy), fill=c)
        d.point((cx, cy+1), fill=c)
        d.point((cx+1, cy+1), fill=c)
        d.point((cx+1, cy+2), fill=c)
        d.point((cx, cy+3), fill=c)
        d.point((cx+1, cy+3), fill=c)
        d.point((cx+2, cy+3), fill=c)
    elif num == 2:
        d.point((cx, cy), fill=c)
        d.point((cx+1, cy), fill=c)
        d.point((cx+2, cy+1), fill=c)
        d.point((cx+1, cy+2), fill=c)
        d.point((cx, cy+3), fill=c)
        d.point((cx+1, cy+3), fill=c)
        d.point((cx+2, cy+3), fill=c)
    elif num == 3:
        d.point((cx, cy), fill=c)
        d.point((cx+1, cy), fill=c)
        d.point((cx+2, cy+1), fill=c)
        d.point((cx+1, cy+2), fill=c)
        d.point((cx+2, cy+3), fill=c)
        d.point((cx, cy+3), fill=c)
        d.point((cx+1, cy+3), fill=c)


def draw_arrow(d, x1, y, x2):
    """Draw a small right-pointing arrow between steps."""
    mid_y = y
    d.line([(x1, mid_y), (x2, mid_y)], fill=COL["text_gold"])
    d.point((x2-1, mid_y-1), fill=COL["text_gold"])
    d.point((x2-1, mid_y+1), fill=COL["text_gold"])


def draw_mini_player(d, x, y, facing_right=True):
    """Draw a tiny 6x10 pixel player character."""
    # Head
    d.rectangle([x+1, y, x+3, y+2], fill=COL["skin"])
    # Hair
    d.line([(x+1, y), (x+3, y)], fill=COL["hair"])
    # Body (blue tunic)
    d.rectangle([x, y+3, x+4, y+6], fill=COL["blue"])
    d.point((x+2, y+3), fill=COL["blue_light"])
    # Legs
    d.rectangle([x+1, y+7, x+1, y+9], fill=COL["brown"])
    d.rectangle([x+3, y+7, x+3, y+9], fill=COL["brown"])


def draw_mini_mount(d, x, y, has_rider=False):
    """Draw a small mount (horse-like creature)."""
    # Body
    d.rectangle([x+2, y+3, x+9, y+6], fill=COL["brown_light"])
    d.rectangle([x+3, y+4, x+8, y+5], fill=COL["tan"])
    # Head
    d.rectangle([x+10, y+1, x+12, y+4], fill=COL["brown_light"])
    d.point((x+12, y+2), fill=COL["bg_dark"])  # eye
    # Ears
    d.point((x+11, y), fill=COL["brown_light"])
    # Legs
    d.rectangle([x+3, y+7, x+3, y+9], fill=COL["brown"])
    d.rectangle([x+5, y+7, x+5, y+9], fill=COL["brown"])
    d.rectangle([x+7, y+7, x+7, y+9], fill=COL["brown"])
    d.rectangle([x+9, y+7, x+9, y+9], fill=COL["brown"])
    # Tail
    d.line([(x, y+3), (x, y+5)], fill=COL["brown"])
    # Saddle
    d.rectangle([x+4, y+2, x+7, y+3], fill=COL["red"])
    if has_rider:
        # Small rider on top
        d.rectangle([x+5, y-2, x+7, y], fill=COL["skin"])  # head
        d.line([(x+5, y-2), (x+7, y-2)], fill=COL["hair"])
        d.rectangle([x+4, y+1, x+7, y+2], fill=COL["blue"])  # body on saddle


def draw_speed_lines(d, x, y, length=8):
    """Draw motion/speed lines."""
    for i in range(3):
        ly = y + i * 3
        d.line([(x, ly), (x + length, ly)], fill=COL["yellow"])


# ── Panel 1: Mount Tutorial ─────────────────────────────────────────
def gen_mount():
    img, d = new_panel()

    # Section dividers (3 equal sections ~50px each)
    sec_w = 48
    gap = 5
    base_x = 6

    # Step 1: Summon — player + sparkles + mount appearing
    s1x = base_x
    draw_step_number(d, s1x, 8, 1)
    # Player standing
    draw_mini_player(d, s1x + 4, 22)
    # Sparkle effect (summon)
    for sx, sy in [(s1x+18, 24), (s1x+20, 28), (s1x+16, 30), (s1x+22, 22), (s1x+19, 32)]:
        d.point((sx, sy), fill=COL["yellow"])
    for sx, sy in [(s1x+17, 26), (s1x+21, 30)]:
        d.point((sx, sy), fill=COL["orange"])
    # Ghost mount appearing
    d.rectangle([s1x+14, 35, s1x+27, 42], fill=COL["brown_light"] + (100,))
    # Ground line
    d.line([(s1x, 50), (s1x+sec_w-gap, 50)], fill=COL["gray_dark"])
    # Label pixels for "SUMMON" - simplified
    for i, px in enumerate(range(s1x+6, s1x+34, 4)):
        d.rectangle([px, 56, px+2, 58], fill=COL["text_gold"])

    # Arrow
    draw_arrow(d, s1x+sec_w-2, 40, s1x+sec_w+4)

    # Step 2: Ride — player on mount, motion lines
    s2x = base_x + sec_w + gap
    draw_step_number(d, s2x, 8, 2)
    draw_mini_mount(d, s2x+4, 26, has_rider=True)
    # Ground
    d.line([(s2x, 50), (s2x+sec_w-gap, 50)], fill=COL["gray_dark"])
    # Motion lines behind
    draw_speed_lines(d, s2x+2, 32, 6)
    # Label
    for i, px in enumerate(range(s2x+10, s2x+30, 4)):
        d.rectangle([px, 56, px+2, 58], fill=COL["text_gold"])

    # Arrow
    draw_arrow(d, s2x+sec_w-2, 40, s2x+sec_w+4)

    # Step 3: Speed Boost — mount with big speed lines + particles
    s3x = base_x + 2*(sec_w + gap)
    draw_step_number(d, s3x, 8, 3)
    draw_mini_mount(d, s3x+6, 26, has_rider=True)
    # Big speed lines
    draw_speed_lines(d, s3x, 30, 10)
    draw_speed_lines(d, s3x+2, 36, 8)
    # Speed particles
    for sx, sy in [(s3x+3, 28), (s3x+1, 34), (s3x+5, 40)]:
        d.point((sx, sy), fill=COL["cyan"])
    # Ground
    d.line([(s3x, 50), (s3x+sec_w-gap-4, 50)], fill=COL["gray_dark"])
    # Boost icon
    d.rectangle([s3x+30, 18, s3x+38, 24], fill=COL["cyan_dark"])
    d.rectangle([s3x+31, 19, s3x+37, 23], fill=COL["cyan"])
    # Up arrow in boost icon
    d.point((s3x+34, 20), fill=COL["white"])
    d.point((s3x+33, 21), fill=COL["white"])
    d.point((s3x+35, 21), fill=COL["white"])

    # Title bar area
    d.rectangle([4, 64, W-5, 74], fill=COL["bg_mid"])
    # "MOUNT" label (pixel blocks)
    label_y = 67
    for i, px in enumerate(range(55, 105, 6)):
        d.rectangle([px, label_y, px+4, label_y+3], fill=COL["text_gold"])

    # Subtitle dots
    for px in [50, 70, 90, 110]:
        d.point((px, 80), fill=COL["gray"])

    return img


# ── Panel 2: Housing Tutorial ───────────────────────────────────────
def draw_house(d, x, y, size="normal"):
    """Draw a small pixel house."""
    s = 1 if size == "small" else 1
    # Walls
    d.rectangle([x, y+4, x+12, y+12], fill=COL["tan"])
    d.rectangle([x+1, y+5, x+11, y+11], fill=COL["brown_light"])
    # Roof
    for i in range(5):
        d.line([(x+1+i, y+4-i), (x+11-i, y+4-i)], fill=COL["roof"])
    d.line([(x+5, y), (x+7, y)], fill=COL["roof_dark"])
    # Door
    d.rectangle([x+5, y+8, x+7, y+12], fill=COL["wood_dark"])
    d.point((x+7, y+10), fill=COL["gold_coin"])  # doorknob
    # Window
    d.rectangle([x+2, y+6, x+4, y+8], fill=COL["blue_light"])
    d.rectangle([x+9, y+6, x+11, y+8], fill=COL["blue_light"])


def draw_furniture_icon(d, x, y, kind="chair"):
    """Draw a tiny furniture item."""
    if kind == "chair":
        d.rectangle([x, y+2, x+3, y+5], fill=COL["wood"])
        d.rectangle([x, y, x, y+5], fill=COL["wood_dark"])
    elif kind == "table":
        d.rectangle([x, y+1, x+5, y+2], fill=COL["wood"])
        d.rectangle([x+1, y+3, x+1, y+5], fill=COL["wood_dark"])
        d.rectangle([x+4, y+3, x+4, y+5], fill=COL["wood_dark"])
    elif kind == "lamp":
        d.rectangle([x+1, y, x+2, y+1], fill=COL["yellow"])
        d.rectangle([x+1, y+2, x+1, y+4], fill=COL["gray"])


def gen_housing():
    img, d = new_panel()
    sec_w = 48
    gap = 5
    base_x = 6

    # Step 1: Purchase plot — gold coin + plot outline
    s1x = base_x
    draw_step_number(d, s1x, 8, 1)
    # Plot outline (dashed)
    for px in range(s1x+2, s1x+38, 3):
        d.point((px, 45), fill=COL["green"])
        d.point((px, 25), fill=COL["green"])
    for py in range(25, 46, 3):
        d.point((s1x+2, py), fill=COL["green"])
        d.point((s1x+38, py), fill=COL["green"])
    # "FOR SALE" sign
    d.rectangle([s1x+14, 28, s1x+26, 36], fill=COL["wood"])
    d.rectangle([s1x+15, 29, s1x+25, 35], fill=COL["tan"])
    d.rectangle([s1x+19, 36, s1x+21, 40], fill=COL["wood_dark"])  # post
    # Gold coin
    d.ellipse([s1x+10, 38, s1x+16, 44], fill=COL["gold_coin"], outline=COL["orange"])
    # Ground
    d.line([(s1x, 50), (s1x+sec_w-gap, 50)], fill=COL["grass_dark"])
    # Grass patches
    for px in range(s1x, s1x+sec_w-gap, 5):
        d.point((px, 49), fill=COL["grass"])

    draw_arrow(d, s1x+sec_w-2, 40, s1x+sec_w+4)

    # Step 2: Build & furnish — house with furniture icons
    s2x = base_x + sec_w + gap
    draw_step_number(d, s2x, 8, 2)
    draw_house(d, s2x+8, 22)
    # Furniture icons floating nearby
    draw_furniture_icon(d, s2x+28, 24, "chair")
    draw_furniture_icon(d, s2x+28, 33, "table")
    draw_furniture_icon(d, s2x+35, 28, "lamp")
    # Cursor/hand icon
    d.rectangle([s2x+32, 36, s2x+34, 39], fill=COL["white"])
    d.point((s2x+33, 40), fill=COL["white"])
    # Ground
    d.line([(s2x, 50), (s2x+sec_w-gap, 50)], fill=COL["grass_dark"])
    for px in range(s2x, s2x+sec_w-gap, 5):
        d.point((px, 49), fill=COL["grass"])

    draw_arrow(d, s2x+sec_w-2, 40, s2x+sec_w+4)

    # Step 3: Visit — two players at a house
    s3x = base_x + 2*(sec_w + gap)
    draw_step_number(d, s3x, 8, 3)
    draw_house(d, s3x+8, 22)
    # Two players visiting
    draw_mini_player(d, s3x+2, 36)
    draw_mini_player(d, s3x+26, 36)
    # Heart/welcome icon above door
    d.point((s3x+14, 20), fill=COL["red"])
    d.point((s3x+16, 20), fill=COL["red"])
    d.point((s3x+13, 21), fill=COL["red"])
    d.point((s3x+15, 22), fill=COL["red"])
    d.point((s3x+17, 21), fill=COL["red"])
    # Ground
    d.line([(s3x, 50), (s3x+sec_w-gap-4, 50)], fill=COL["grass_dark"])
    for px in range(s3x, s3x+sec_w-gap-4, 5):
        d.point((px, 49), fill=COL["grass"])

    # Title bar
    d.rectangle([4, 64, W-5, 74], fill=COL["bg_mid"])
    for i, px in enumerate(range(50, 110, 6)):
        d.rectangle([px, 67, px+4, 70], fill=COL["text_gold"])
    for px in [50, 70, 90, 110]:
        d.point((px, 80), fill=COL["gray"])

    return img


# ── Panel 3: Fishing Tutorial ───────────────────────────────────────
def gen_fishing():
    img, d = new_panel()
    sec_w = 48
    gap = 5
    base_x = 6

    # Step 1: Cast — player with fishing rod, line going out
    s1x = base_x
    draw_step_number(d, s1x, 8, 1)
    # Player
    draw_mini_player(d, s1x+6, 22)
    # Fishing rod
    d.line([(s1x+11, 24), (s1x+16, 18), (s1x+30, 18)], fill=COL["wood"])
    # Fishing line going down
    d.line([(s1x+30, 18), (s1x+32, 22), (s1x+32, 42)], fill=COL["gray"])
    # Bobber
    d.rectangle([s1x+31, 38, s1x+33, 40], fill=COL["red"])
    d.point((s1x+32, 37), fill=COL["white"])
    # Water
    d.rectangle([s1x+20, 42, s1x+sec_w-gap, 50], fill=COL["water"])
    for px in range(s1x+20, s1x+sec_w-gap, 4):
        d.point((px, 42), fill=COL["water_light"])
    # Shore
    d.line([(s1x, 50), (s1x+20, 42)], fill=COL["grass_dark"])
    for py in range(42, 51):
        d.line([(s1x, py), (s1x + 20 - int((py-42)*2.2), py)], fill=COL["grass"])

    draw_arrow(d, s1x+sec_w-2, 35, s1x+sec_w+4)

    # Step 2: Reel — exclamation mark, tension bar
    s2x = base_x + sec_w + gap
    draw_step_number(d, s2x, 8, 2)
    # Player
    draw_mini_player(d, s2x+6, 22)
    # Rod bending
    d.line([(s2x+11, 24), (s2x+14, 19), (s2x+24, 20), (s2x+28, 25)], fill=COL["wood"])
    d.line([(s2x+28, 25), (s2x+30, 42)], fill=COL["gray"])
    # Exclamation
    d.rectangle([s2x+14, 14, s2x+15, 18], fill=COL["yellow"])
    d.point((s2x+14, 20), fill=COL["yellow"])
    # Bobber splashing
    d.rectangle([s2x+29, 38, s2x+31, 40], fill=COL["red"])
    for sx, sy in [(s2x+27, 37), (s2x+33, 37), (s2x+26, 39), (s2x+34, 39)]:
        d.point((sx, sy), fill=COL["water_light"])
    # Water
    d.rectangle([s2x+18, 42, s2x+sec_w-gap, 50], fill=COL["water"])
    for px in range(s2x+18, s2x+sec_w-gap, 4):
        d.point((px, 42), fill=COL["water_light"])
    # Tension bar
    d.rectangle([s2x+16, 52, s2x+38, 55], fill=COL["gray_dark"])
    d.rectangle([s2x+16, 52, s2x+30, 55], fill=COL["green"])
    d.rectangle([s2x+30, 52, s2x+34, 55], fill=COL["yellow"])

    draw_arrow(d, s2x+sec_w-2, 35, s2x+sec_w+4)

    # Step 3: Catch — fish icon, sparkles
    s3x = base_x + 2*(sec_w + gap)
    draw_step_number(d, s3x, 8, 3)
    # Player celebrating
    draw_mini_player(d, s3x+4, 22)
    # Fish (bigger, prominent)
    fx, fy = s3x+18, 24
    # Fish body
    d.rectangle([fx, fy+2, fx+14, fy+6], fill=COL["blue_light"])
    d.rectangle([fx+1, fy+3, fx+13, fy+5], fill=COL["cyan"])
    # Fish tail
    d.rectangle([fx-2, fy+1, fx, fy+7], fill=COL["blue"])
    # Fish eye
    d.point((fx+11, fy+3), fill=COL["bg_dark"])
    # Fish mouth
    d.point((fx+14, fy+4), fill=COL["bg_dark"])
    # Sparkles around fish
    for sx, sy in [(fx+2, fy-2), (fx+10, fy-1), (fx+16, fy+1), (fx+8, fy+9), (fx-1, fy+8)]:
        d.point((sx, sy), fill=COL["yellow"])
    for sx, sy in [(fx+5, fy-1), (fx+14, fy+8)]:
        d.point((sx, sy), fill=COL["orange"])
    # Water below
    d.rectangle([s3x, 42, s3x+sec_w-gap-4, 50], fill=COL["water"])
    for px in range(s3x, s3x+sec_w-gap-4, 4):
        d.point((px, 42), fill=COL["water_light"])

    # Title bar
    d.rectangle([4, 64, W-5, 74], fill=COL["bg_mid"])
    for i, px in enumerate(range(48, 112, 6)):
        d.rectangle([px, 67, px+4, 70], fill=COL["text_gold"])
    for px in [50, 70, 90, 110]:
        d.point((px, 80), fill=COL["gray"])

    return img


# ── Panel 4: Auction House Tutorial ─────────────────────────────────
def draw_item_slot(d, x, y, item_color=None):
    """Draw an inventory slot with optional item."""
    d.rectangle([x, y, x+10, y+10], fill=COL["bg_mid"], outline=COL["border"])
    if item_color:
        d.rectangle([x+2, y+2, x+8, y+8], fill=item_color)
        d.point((x+3, y+3), fill=COL["white"])  # highlight


def gen_auction():
    img, d = new_panel()
    sec_w = 48
    gap = 5
    base_x = 6

    # Step 1: List item — item slot + price tag
    s1x = base_x
    draw_step_number(d, s1x, 8, 1)
    # Big item slot
    d.rectangle([s1x+8, 18, s1x+26, 36], fill=COL["bg_mid"], outline=COL["border"])
    d.rectangle([s1x+9, 19, s1x+25, 35], outline=COL["border_hi"])
    # Sword icon in slot
    d.line([(s1x+14, 22), (s1x+14, 32)], fill=COL["silver"])
    d.line([(s1x+15, 22), (s1x+15, 32)], fill=COL["gray"])
    d.rectangle([s1x+12, 28, s1x+17, 29], fill=COL["brown"])  # crossguard
    d.rectangle([s1x+13, 32, s1x+16, 34], fill=COL["brown_dark"])  # hilt
    # Price tag
    d.rectangle([s1x+10, 38, s1x+32, 44], fill=COL["bg_mid"], outline=COL["border"])
    # Gold coin icon
    d.ellipse([s1x+12, 39, s1x+16, 43], fill=COL["gold_coin"])
    # Price blocks
    for px in range(s1x+18, s1x+30, 3):
        d.rectangle([px, 40, px+1, 42], fill=COL["text_gold"])
    # Up arrow (listing)
    d.line([(s1x+34, 30), (s1x+34, 22)], fill=COL["green"])
    d.point((s1x+33, 24), fill=COL["green"])
    d.point((s1x+35, 24), fill=COL["green"])

    draw_arrow(d, s1x+sec_w-2, 35, s1x+sec_w+4)

    # Step 2: Bid — auction panel with bid button
    s2x = base_x + sec_w + gap
    draw_step_number(d, s2x, 8, 2)
    # Auction listing panel
    d.rectangle([s2x+4, 18, s2x+40, 46], fill=COL["bg_mid"], outline=COL["border"])
    # Item row 1
    d.rectangle([s2x+6, 20, s2x+12, 26], fill=COL["bg_dark"], outline=COL["border"])
    d.rectangle([s2x+7, 21, s2x+11, 25], fill=COL["blue"])
    # Price
    d.ellipse([s2x+14, 21, s2x+17, 24], fill=COL["gold_coin"])
    for px in range(s2x+19, s2x+28, 3):
        d.rectangle([px, 22, px+1, 24], fill=COL["text_gold"])
    # Bid button
    d.rectangle([s2x+30, 20, s2x+38, 26], fill=COL["green_dark"], outline=COL["green"])
    # Item row 2
    d.rectangle([s2x+6, 28, s2x+12, 34], fill=COL["bg_dark"], outline=COL["border"])
    d.rectangle([s2x+7, 29, s2x+11, 33], fill=COL["red"])
    d.ellipse([s2x+14, 29, s2x+17, 32], fill=COL["gold_coin"])
    for px in range(s2x+19, s2x+28, 3):
        d.rectangle([px, 30, px+1, 32], fill=COL["text_gold"])
    d.rectangle([s2x+30, 28, s2x+38, 34], fill=COL["bg_dark"], outline=COL["border"])
    # Cursor on bid button row 1
    d.rectangle([s2x+28, 22, s2x+29, 25], fill=COL["white"])

    draw_arrow(d, s2x+sec_w-2, 35, s2x+sec_w+4)

    # Step 3: Buyout — item received, checkmark
    s3x = base_x + 2*(sec_w + gap)
    draw_step_number(d, s3x, 8, 3)
    # Item received
    d.rectangle([s3x+6, 22, s3x+22, 38], fill=COL["bg_mid"], outline=COL["border"])
    d.rectangle([s3x+8, 24, s3x+20, 36], fill=COL["blue"])
    d.point((s3x+10, 26), fill=COL["white"])
    # Big green checkmark
    cx, cy = s3x+26, 24
    d.line([(cx, cy+4), (cx+2, cy+6), (cx+6, cy)], fill=COL["green"], width=1)
    d.line([(cx, cy+5), (cx+2, cy+7), (cx+6, cy+1)], fill=COL["green"], width=1)
    # Sparkles
    for sx, sy in [(s3x+8, 20), (s3x+20, 18), (s3x+28, 20), (s3x+14, 40)]:
        d.point((sx, sy), fill=COL["yellow"])
    # "SOLD" indicator
    d.rectangle([s3x+4, 42, s3x+30, 48], fill=COL["green_dark"])
    for px in range(s3x+8, s3x+26, 4):
        d.rectangle([px, 44, px+2, 46], fill=COL["text_gold"])

    # Title bar
    d.rectangle([4, 64, W-5, 74], fill=COL["bg_mid"])
    for i, px in enumerate(range(42, 118, 6)):
        d.rectangle([px, 67, px+4, 70], fill=COL["text_gold"])
    for px in [50, 70, 90, 110]:
        d.point((px, 80), fill=COL["gray"])

    return img


# ── Panel 5: Cosmetic Shop Tutorial ─────────────────────────────────
def draw_mannequin(d, x, y, outfit_color):
    """Draw a preview mannequin with outfit."""
    # Head
    d.rectangle([x+2, y, x+4, y+3], fill=COL["gray"])
    # Body
    d.rectangle([x+1, y+4, x+5, y+9], fill=outfit_color)
    d.point((x+3, y+4), fill=COL["white"])  # highlight
    # Legs
    d.rectangle([x+1, y+10, x+2, y+13], fill=outfit_color)
    d.rectangle([x+4, y+10, x+5, y+13], fill=outfit_color)
    # Stand
    d.line([(x, y+14), (x+6, y+14)], fill=COL["gray_dark"])


def gen_cosmetic():
    img, d = new_panel()
    sec_w = 48
    gap = 5
    base_x = 6

    # Step 1: Preview — mannequin with outfit, preview frame
    s1x = base_x
    draw_step_number(d, s1x, 8, 1)
    # Preview frame
    d.rectangle([s1x+6, 16, s1x+36, 48], fill=COL["bg_mid"], outline=COL["border_hi"])
    # Mannequin
    draw_mannequin(d, s1x+14, 20, COL["purple"])
    # Mirror/sparkle effect
    d.rectangle([s1x+7, 17, s1x+9, 19], fill=COL["white"])
    # Outfit options (small swatches on right)
    for i, col in enumerate([COL["red"], COL["blue"], COL["purple"], COL["green"]]):
        sy = 22 + i * 6
        d.rectangle([s1x+30, sy, s1x+34, sy+4], fill=col, outline=COL["border"])
    # Selection highlight
    d.rectangle([s1x+29, 34, s1x+35, 39], outline=COL["yellow"])

    draw_arrow(d, s1x+sec_w-2, 35, s1x+sec_w+4)

    # Step 2: Purchase — gold coin, purchase button
    s2x = base_x + sec_w + gap
    draw_step_number(d, s2x, 8, 2)
    # Item card
    d.rectangle([s2x+6, 18, s2x+36, 44], fill=COL["bg_mid"], outline=COL["border"])
    # Item preview (small)
    d.rectangle([s2x+12, 20, s2x+28, 34], fill=COL["bg_dark"])
    draw_mannequin(d, s2x+16, 21, COL["purple"])
    # Price
    d.ellipse([s2x+10, 36, s2x+14, 40], fill=COL["gold_coin"])
    for px in range(s2x+16, s2x+24, 3):
        d.rectangle([px, 37, px+1, 39], fill=COL["text_gold"])
    # Buy button
    d.rectangle([s2x+26, 36, s2x+34, 42], fill=COL["green_dark"], outline=COL["green"])

    draw_arrow(d, s2x+sec_w-2, 35, s2x+sec_w+4)

    # Step 3: Equip — player with new outfit, sparkles
    s3x = base_x + 2*(sec_w + gap)
    draw_step_number(d, s3x, 8, 3)
    # Player with new outfit
    px, py = s3x+12, 22
    # Head
    d.rectangle([px+1, py, px+3, py+2], fill=COL["skin"])
    d.line([(px+1, py), (px+3, py)], fill=COL["hair"])
    # New outfit body (purple)
    d.rectangle([px, py+3, px+4, py+6], fill=COL["purple"])
    d.point((px+2, py+3), fill=COL["purple_dark"])
    # Crown/accessory
    d.point((px+1, py-1), fill=COL["gold_coin"])
    d.point((px+2, py-1), fill=COL["gold_coin"])
    d.point((px+3, py-1), fill=COL["gold_coin"])
    d.point((px+2, py-2), fill=COL["yellow"])
    # Legs
    d.rectangle([px+1, py+7, px+1, py+9], fill=COL["purple_dark"])
    d.rectangle([px+3, py+7, px+3, py+9], fill=COL["purple_dark"])
    # Sparkles celebration
    sparkle_positions = [
        (s3x+4, 20), (s3x+24, 18), (s3x+28, 26), (s3x+6, 34),
        (s3x+26, 36), (s3x+10, 18), (s3x+22, 40), (s3x+30, 30)
    ]
    for i, (sx, sy) in enumerate(sparkle_positions):
        c = COL["yellow"] if i % 2 == 0 else COL["orange"]
        d.point((sx, sy), fill=c)
    # "EQUIPPED" badge
    d.rectangle([s3x+4, 42, s3x+32, 48], fill=COL["green_dark"])
    for px_b in range(s3x+8, s3x+28, 4):
        d.rectangle([px_b, 44, px_b+2, 46], fill=COL["text_gold"])

    # Title bar
    d.rectangle([4, 64, W-5, 74], fill=COL["bg_mid"])
    for i, px_l in enumerate(range(44, 116, 6)):
        d.rectangle([px_l, 67, px_l+4, 70], fill=COL["text_gold"])
    for px_l in [50, 70, 90, 110]:
        d.point((px_l, 80), fill=COL["gray"])

    return img


# ── Generate all panels ─────────────────────────────────────────────
def main():
    out_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "public", "assets", "tutorials"
    )
    os.makedirs(out_dir, exist_ok=True)

    panels = {
        "tut_mount.png": gen_mount,
        "tut_housing.png": gen_housing,
        "tut_fishing.png": gen_fishing,
        "tut_auction.png": gen_auction,
        "tut_cosmetic.png": gen_cosmetic,
    }

    for name, gen_fn in panels.items():
        img = gen_fn()
        path = os.path.join(out_dir, name)
        img.save(path)
        print(f"  -> {path} ({img.size[0]}x{img.size[1]})")

    print(f"\nGenerated {len(panels)} tutorial panels in {out_dir}")


if __name__ == "__main__":
    main()
