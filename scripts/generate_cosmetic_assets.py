#!/usr/bin/env python3
"""Generate pixel art assets for the cosmetic shop system (PIX-366).

Art conventions (from existing assets):
- UI panels: dark charcoal bg (#2a2a2a-#3a3a3a), golden borders (#c8a832), amber rivets
- Icons: 16x16, bold silhouettes
- Slots: 18x18
- Buttons: 80x20
- Character sprites: 24px tall, horizontal strip sheets
- Equipment overlays: 32x24
- VFX: 32px frames, horizontal strip
- All RGBA PNGs
"""

import sys
sys.path.insert(0, "/tmp/pylib")

from PIL import Image, ImageDraw
import os
import random

OUT = "public/assets/cosmetics"
os.makedirs(OUT, exist_ok=True)

# ── Color palette (matching existing style) ──────────────────────────────
BG_DARK = (42, 42, 42, 255)
BG_MID = (50, 50, 50, 255)
BG_LIGHT = (58, 58, 58, 255)
BORDER_GOLD = (200, 168, 50, 255)
BORDER_DARK = (140, 112, 32, 255)
RIVET = (180, 144, 40, 255)
SLOT_BG = (34, 34, 34, 255)
SLOT_BORDER = (80, 80, 80, 255)
TEXT_GOLD = (220, 190, 80, 255)
TEXT_WHITE = (220, 220, 220, 255)
TRANSPARENT = (0, 0, 0, 0)

# Class colors
CLASS_COLORS = {
    "warrior": {"primary": (70, 130, 200, 255), "secondary": (50, 100, 160, 255), "accent": (180, 200, 220, 255)},
    "mage":    {"primary": (140, 60, 180, 255), "secondary": (100, 40, 140, 255), "accent": (200, 160, 240, 255)},
    "ranger":  {"primary": (60, 140, 60, 255),  "secondary": (40, 100, 40, 255),  "accent": (160, 220, 160, 255)},
    "artisan": {"primary": (180, 120, 60, 255), "secondary": (140, 90, 40, 255),  "accent": (220, 190, 140, 255)},
}

# Outfit themes
OUTFIT_THEMES = {
    "royal":    {"h1": (180, 50, 50, 255),  "h2": (220, 180, 40, 255), "h3": (140, 30, 30, 255)},
    "shadow":   {"h1": (40, 40, 50, 255),   "h2": (80, 60, 100, 255),  "h3": (20, 20, 30, 255)},
    "celestial":{"h1": (200, 200, 240, 255),"h2": (160, 180, 255, 255),"h3": (120, 140, 200, 255)},
    "ember":    {"h1": (200, 80, 30, 255),  "h2": (240, 160, 40, 255), "h3": (160, 50, 20, 255)},
    "frost":    {"h1": (160, 210, 240, 255),"h2": (200, 230, 255, 255),"h3": (100, 160, 200, 255)},
    "nature":   {"h1": (60, 140, 50, 255),  "h2": (120, 180, 80, 255), "h3": (40, 100, 30, 255)},
}

# Accessory colors
ACC_COLORS = {
    "gold":   (220, 180, 40, 255),
    "silver": (180, 190, 200, 255),
    "ruby":   (200, 40, 50, 255),
    "emerald":(40, 180, 80, 255),
    "shadow": (60, 50, 80, 255),
    "sky":    (120, 180, 240, 255),
}


def draw_panel_border(draw, w, h, thick=2):
    """Draw the standard golden-riveted border."""
    # Outer border
    for t in range(thick):
        draw.rectangle([t, t, w - 1 - t, h - 1 - t], outline=BORDER_GOLD if t == 0 else BORDER_DARK)
    # Corner rivets
    for x, y in [(3, 3), (w - 4, 3), (3, h - 4), (w - 4, h - 4)]:
        draw.rectangle([x, y, x + 1, y + 1], fill=RIVET)


def draw_pixel_text(draw, x, y, text, color=TEXT_GOLD):
    """Draw tiny 3x5 pixel font text."""
    FONT = {
        'A': [(1,0),(0,1),(2,1),(0,2),(1,2),(2,2),(0,3),(2,3),(0,4),(2,4)],
        'B': [(0,0),(1,0),(0,1),(2,1),(0,2),(1,2),(0,3),(2,3),(0,4),(1,4)],
        'C': [(1,0),(2,0),(0,1),(0,2),(0,3),(1,4),(2,4)],
        'D': [(0,0),(1,0),(0,1),(2,1),(0,2),(2,2),(0,3),(2,3),(0,4),(1,4)],
        'E': [(0,0),(1,0),(2,0),(0,1),(0,2),(1,2),(0,3),(0,4),(1,4),(2,4)],
        'F': [(0,0),(1,0),(2,0),(0,1),(0,2),(1,2),(0,3),(0,4)],
        'G': [(1,0),(2,0),(0,1),(0,2),(1,2),(2,2),(0,3),(2,3),(1,4),(2,4)],
        'H': [(0,0),(2,0),(0,1),(2,1),(0,2),(1,2),(2,2),(0,3),(2,3),(0,4),(2,4)],
        'I': [(0,0),(1,0),(2,0),(1,1),(1,2),(1,3),(0,4),(1,4),(2,4)],
        'K': [(0,0),(2,0),(0,1),(1,1),(0,2),(0,3),(1,3),(0,4),(2,4)],
        'L': [(0,0),(0,1),(0,2),(0,3),(0,4),(1,4),(2,4)],
        'M': [(0,0),(4,0),(0,1),(1,1),(3,1),(4,1),(0,2),(2,2),(4,2),(0,3),(4,3),(0,4),(4,4)],
        'N': [(0,0),(2,0),(0,1),(1,1),(2,1),(0,2),(2,2),(0,3),(2,3),(0,4),(2,4)],
        'O': [(1,0),(0,1),(2,1),(0,2),(2,2),(0,3),(2,3),(1,4)],
        'P': [(0,0),(1,0),(0,1),(2,1),(0,2),(1,2),(0,3),(0,4)],
        'R': [(0,0),(1,0),(0,1),(2,1),(0,2),(1,2),(0,3),(2,3),(0,4),(2,4)],
        'S': [(1,0),(2,0),(0,1),(1,2),(2,3),(0,4),(1,4)],
        'T': [(0,0),(1,0),(2,0),(1,1),(1,2),(1,3),(1,4)],
        'U': [(0,0),(2,0),(0,1),(2,1),(0,2),(2,2),(0,3),(2,3),(1,4)],
        'V': [(0,0),(2,0),(0,1),(2,1),(0,2),(2,2),(1,3),(1,4)],
        'W': [(0,0),(4,0),(0,1),(4,1),(0,2),(2,2),(4,2),(0,3),(1,3),(3,3),(4,3),(0,4),(4,4)],
        'X': [(0,0),(2,0),(0,1),(2,1),(1,2),(0,3),(2,3),(0,4),(2,4)],
        ' ': [],
    }
    cx = x
    for ch in text.upper():
        glyph = FONT.get(ch, [])
        for gx, gy in glyph:
            draw.point((cx + gx, y + gy), fill=color)
        cx += 5 if ch.upper() == 'M' or ch.upper() == 'W' else 4


def draw_horizontal_separator(draw, y, w, margin=4):
    """Draw a subtle horizontal line separator."""
    for x in range(margin, w - margin):
        draw.point((x, y), fill=(70, 70, 70, 255))


# ═══════════════════════════════════════════════════════════════════════════
# 1. SHOP UI PANEL ART
# ═══════════════════════════════════════════════════════════════════════════

def create_shop_storefront_panel():
    """Main shop UI panel - 240x200, dark with golden borders, category tabs area."""
    w, h = 240, 200
    img = Image.new("RGBA", (w, h), BG_DARK)
    draw = ImageDraw.Draw(img)
    draw_panel_border(draw, w, h)
    # Title bar
    draw.rectangle([2, 2, w - 3, 14], fill=BG_MID)
    draw_pixel_text(draw, 6, 5, "SHOP", TEXT_GOLD)
    draw_horizontal_separator(draw, 15, w)
    # Category tab area (top row under title)
    for i in range(5):
        tx = 6 + i * 46
        sel = (i == 0)
        c = BG_LIGHT if sel else BG_DARK
        draw.rectangle([tx, 18, tx + 42, 30], fill=c, outline=SLOT_BORDER)
    # Item grid area (4 cols x 4 rows of 18x18 slots)
    for row in range(4):
        for col in range(4):
            sx = 10 + col * 24
            sy = 36 + row * 24
            draw.rectangle([sx, sy, sx + 17, sy + 17], fill=SLOT_BG, outline=SLOT_BORDER)
    # Preview area on right
    draw.rectangle([110, 36, 230, 140], fill=(30, 35, 40, 255), outline=SLOT_BORDER)
    draw_pixel_text(draw, 150, 84, "PREVIEW", (80, 80, 80, 255))
    # Bottom bar: currency + buy button
    draw.rectangle([2, h - 28, w - 3, h - 3], fill=BG_MID)
    draw_horizontal_separator(draw, h - 29, w)
    # Gold icon spot
    draw.rectangle([8, h - 22, 13, h - 17], fill=(220, 180, 40, 255))
    draw_pixel_text(draw, 16, h - 22, "0", TEXT_GOLD)
    # Buy button
    bx = w - 60
    draw.rectangle([bx, h - 24, bx + 50, h - 8], fill=(60, 120, 60, 255), outline=(80, 160, 80, 255))
    draw_pixel_text(draw, bx + 14, h - 19, "BUY", TEXT_WHITE)
    img.save(f"{OUT}/ui_panel_shop_storefront.png")
    print(f"  Created ui_panel_shop_storefront.png ({w}x{h})")


def create_currency_icons():
    """Create cosmetic-specific currency icons: fashion tokens and glamour gems."""
    icons = {
        "icon_currency_fashion_token": [
            # Star/token shape in pink/magenta
            (7, 2, (200, 80, 160, 255)), (8, 2, (200, 80, 160, 255)),
            (6, 3, (220, 100, 180, 255)), (7, 3, (240, 140, 200, 255)),
            (8, 3, (240, 140, 200, 255)), (9, 3, (220, 100, 180, 255)),
            (4, 4, (200, 80, 160, 255)), (5, 4, (220, 100, 180, 255)),
            (6, 4, (240, 140, 200, 255)), (7, 4, (255, 200, 230, 255)),
            (8, 4, (255, 200, 230, 255)), (9, 4, (240, 140, 200, 255)),
            (10, 4, (220, 100, 180, 255)), (11, 4, (200, 80, 160, 255)),
            (3, 5, (180, 60, 140, 255)), (4, 5, (200, 80, 160, 255)),
            (5, 5, (220, 100, 180, 255)), (6, 5, (240, 140, 200, 255)),
            (7, 5, (255, 220, 240, 255)), (8, 5, (255, 220, 240, 255)),
            (9, 5, (240, 140, 200, 255)), (10, 5, (220, 100, 180, 255)),
            (11, 5, (200, 80, 160, 255)), (12, 5, (180, 60, 140, 255)),
            (5, 6, (200, 80, 160, 255)), (6, 6, (220, 100, 180, 255)),
            (7, 6, (240, 160, 210, 255)), (8, 6, (240, 160, 210, 255)),
            (9, 6, (220, 100, 180, 255)), (10, 6, (200, 80, 160, 255)),
            (4, 7, (200, 80, 160, 255)), (5, 7, (220, 100, 180, 255)),
            (6, 7, (200, 80, 160, 255)), (7, 7, (240, 140, 200, 255)),
            (8, 7, (240, 140, 200, 255)), (9, 7, (200, 80, 160, 255)),
            (10, 7, (220, 100, 180, 255)), (11, 7, (200, 80, 160, 255)),
            (3, 8, (180, 60, 140, 255)), (4, 8, (200, 80, 160, 255)),
            (5, 8, (180, 60, 140, 255)), (7, 8, (200, 80, 160, 255)),
            (8, 8, (200, 80, 160, 255)), (10, 8, (180, 60, 140, 255)),
            (11, 8, (200, 80, 160, 255)), (12, 8, (180, 60, 140, 255)),
            (6, 9, (180, 60, 140, 255)), (7, 9, (200, 80, 160, 255)),
            (8, 9, (200, 80, 160, 255)), (9, 9, (180, 60, 140, 255)),
            (5, 10, (160, 50, 120, 255)), (6, 10, (180, 60, 140, 255)),
            (9, 10, (180, 60, 140, 255)), (10, 10, (160, 50, 120, 255)),
            (4, 11, (140, 40, 100, 255)), (5, 11, (160, 50, 120, 255)),
            (10, 11, (160, 50, 120, 255)), (11, 11, (140, 40, 100, 255)),
        ],
        "icon_currency_glamour_gem": [
            # Diamond/gem shape in cyan/teal
            (7, 1, (100, 220, 220, 255)), (8, 1, (100, 220, 220, 255)),
            (6, 2, (80, 200, 200, 255)), (7, 2, (140, 240, 240, 255)),
            (8, 2, (140, 240, 240, 255)), (9, 2, (80, 200, 200, 255)),
            (5, 3, (60, 180, 180, 255)), (6, 3, (100, 220, 220, 255)),
            (7, 3, (180, 255, 255, 255)), (8, 3, (160, 240, 240, 255)),
            (9, 3, (100, 220, 220, 255)), (10, 3, (60, 180, 180, 255)),
            (4, 4, (50, 160, 160, 255)), (5, 4, (80, 200, 200, 255)),
            (6, 4, (120, 230, 230, 255)), (7, 4, (200, 255, 255, 255)),
            (8, 4, (160, 240, 240, 255)), (9, 4, (120, 230, 230, 255)),
            (10, 4, (80, 200, 200, 255)), (11, 4, (50, 160, 160, 255)),
            (3, 5, (40, 140, 140, 255)), (4, 5, (60, 180, 180, 255)),
            (5, 5, (80, 200, 200, 255)), (6, 5, (120, 230, 230, 255)),
            (7, 5, (180, 255, 255, 255)), (8, 5, (140, 240, 240, 255)),
            (9, 5, (120, 230, 230, 255)), (10, 5, (80, 200, 200, 255)),
            (11, 5, (60, 180, 180, 255)), (12, 5, (40, 140, 140, 255)),
            # Bottom facets
            (4, 6, (40, 140, 150, 255)), (5, 6, (60, 160, 170, 255)),
            (6, 6, (80, 180, 190, 255)), (7, 6, (100, 200, 210, 255)),
            (8, 6, (80, 180, 190, 255)), (9, 6, (60, 160, 170, 255)),
            (10, 6, (40, 140, 150, 255)), (11, 6, (30, 120, 130, 255)),
            (5, 7, (40, 140, 150, 255)), (6, 7, (60, 160, 170, 255)),
            (7, 7, (80, 190, 200, 255)), (8, 7, (60, 160, 170, 255)),
            (9, 7, (40, 140, 150, 255)), (10, 7, (30, 120, 130, 255)),
            (6, 8, (40, 130, 140, 255)), (7, 8, (60, 160, 170, 255)),
            (8, 8, (40, 130, 140, 255)), (9, 8, (30, 110, 120, 255)),
            (6, 9, (30, 110, 120, 255)), (7, 9, (50, 140, 150, 255)),
            (8, 9, (30, 110, 120, 255)), (9, 9, (20, 100, 110, 255)),
            (7, 10, (30, 120, 130, 255)), (8, 10, (20, 100, 110, 255)),
            (7, 11, (20, 90, 100, 255)), (8, 11, (15, 80, 90, 255)),
            (7, 12, (15, 70, 80, 255)),
        ],
    }
    for name, pixels in icons.items():
        img = Image.new("RGBA", (16, 16), TRANSPARENT)
        for x, y, c in pixels:
            if 0 <= x < 16 and 0 <= y < 16:
                img.putpixel((x, y), c)
        img.save(f"{OUT}/{name}.png")
        print(f"  Created {name}.png (16x16)")


def create_category_tab_icons():
    """16x16 icons for shop category tabs: outfits, hair, accessories, effects, bundles."""
    tab_defs = {
        "icon_tab_outfits": [  # Shirt/tunic silhouette
            (6,2),(7,2),(8,2),(9,2),
            (5,3),(6,3),(7,3),(8,3),(9,3),(10,3),
            (4,4),(5,4),(6,4),(7,4),(8,4),(9,4),(10,4),(11,4),
            (3,5),(4,5),(5,5),(10,5),(11,5),(12,5),
            (6,5),(7,5),(8,5),(9,5),
            (6,6),(7,6),(8,6),(9,6),
            (6,7),(7,7),(8,7),(9,7),
            (5,8),(6,8),(7,8),(8,8),(9,8),(10,8),
            (5,9),(6,9),(7,9),(8,9),(9,9),(10,9),
            (5,10),(6,10),(7,10),(8,10),(9,10),(10,10),
            (5,11),(6,11),(7,11),(8,11),(9,11),(10,11),
            (5,12),(6,12),(7,12),(8,12),(9,12),(10,12),
        ],
        "icon_tab_hairstyles": [  # Hair/head silhouette
            (6,1),(7,1),(8,1),(9,1),
            (5,2),(6,2),(7,2),(8,2),(9,2),(10,2),
            (4,3),(5,3),(6,3),(9,3),(10,3),(11,3),
            (4,4),(5,4),(10,4),(11,4),
            (4,5),(5,5),(6,5),(9,5),(10,5),(11,5),
            (5,6),(6,6),(7,6),(8,6),(9,6),(10,6),
            (6,7),(7,7),(8,7),(9,7),
            (5,8),(6,8),(7,8),(8,8),(9,8),(10,8),
            (7,9),(8,9),
        ],
        "icon_tab_accessories": [  # Crown/accessory
            (5,3),(10,3),
            (5,4),(7,4),(8,4),(10,4),
            (4,5),(5,5),(6,5),(7,5),(8,5),(9,5),(10,5),(11,5),
            (4,6),(5,6),(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),
            (3,7),(4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),(12,7),
            (3,8),(4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),(12,8),
            (4,9),(5,9),(6,9),(7,9),(8,9),(9,9),(10,9),(11,9),
        ],
        "icon_tab_effects": [  # Sparkle/star
            (7,1),
            (7,2),(8,2),
            (4,3),(5,3),(6,3),(7,3),(8,3),(9,3),(10,3),(11,3),
            (5,4),(6,4),(7,4),(8,4),(9,4),(10,4),
            (5,5),(6,5),(9,5),(10,5),
            (4,6),(5,6),(10,6),(11,6),
            (3,7),(4,7),(11,7),(12,7),
            (7,8),(8,8),
            (7,10),(8,10),
            (7,12),
        ],
        "icon_tab_bundles": [  # Gift box
            (7,2),(8,2),
            (7,3),(8,3),
            (3,4),(4,4),(5,4),(6,4),(7,4),(8,4),(9,4),(10,4),(11,4),(12,4),
            (3,5),(4,5),(5,5),(6,5),(7,5),(8,5),(9,5),(10,5),(11,5),(12,5),
            (4,6),(5,6),(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),
            (4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),
            (4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),
            (4,9),(5,9),(6,9),(7,9),(8,9),(9,9),(10,9),(11,9),
            (4,10),(5,10),(6,10),(7,10),(8,10),(9,10),(10,10),(11,10),
            (4,11),(5,11),(6,11),(7,11),(8,11),(9,11),(10,11),(11,11),
        ],
    }
    palette = {
        "icon_tab_outfits": (180, 140, 220, 255),
        "icon_tab_hairstyles": (220, 160, 100, 255),
        "icon_tab_accessories": (220, 200, 60, 255),
        "icon_tab_effects": (120, 200, 255, 255),
        "icon_tab_bundles": (220, 100, 100, 255),
    }
    for name, pixels in tab_defs.items():
        img = Image.new("RGBA", (16, 16), TRANSPARENT)
        draw = ImageDraw.Draw(img)
        base = palette[name]
        light = tuple(min(255, c + 40) for c in base[:3]) + (255,)
        dark = tuple(max(0, c - 40) for c in base[:3]) + (255,)
        for x, y in pixels:
            # Slight shading: lighter at top
            if y < 5:
                draw.point((x, y), fill=light)
            elif y > 8:
                draw.point((x, y), fill=dark)
            else:
                draw.point((x, y), fill=base)
        img.save(f"{OUT}/{name}.png")
        print(f"  Created {name}.png (16x16)")


# ═══════════════════════════════════════════════════════════════════════════
# 2. COSMETIC OUTFIT SETS PER CLASS
# ═══════════════════════════════════════════════════════════════════════════

def draw_outfit_frame(draw, x_off, cls_name, theme_colors, frame_variant=0):
    """Draw a single 24x24 character outfit overlay frame.

    These are overlays drawn on top of the base character sprite.
    Simple torso+leg pixel art in theme colors.
    """
    h1, h2, h3 = theme_colors["h1"], theme_colors["h2"], theme_colors["h3"]
    cls = CLASS_COLORS[cls_name]

    # Head area stays transparent (overlay only body)
    # Shoulder pads (x_off+8..x_off+15, y=8..9)
    for dx in [8, 9, 14, 15]:
        draw.point((x_off + dx, 8), fill=h2)
        draw.point((x_off + dx, 9), fill=h3)

    # Torso (x_off+9..x_off+14, y=10..15)
    for y in range(10, 16):
        for x in range(9, 15):
            shade = h1 if x < 12 else h3
            draw.point((x_off + x, y), fill=shade)
    # Belt
    for x in range(9, 15):
        draw.point((x_off + x, 14), fill=h2)

    # Accent detail on chest
    draw.point((x_off + 11, 11), fill=h2)
    draw.point((x_off + 12, 11), fill=h2)
    draw.point((x_off + 11, 12), fill=h2)

    # Legs (x_off+10..x_off+13, y=16..20)
    for y in range(16, 21):
        for x in [10, 11]:
            draw.point((x_off + x, y), fill=h1)
        for x in [12, 13]:
            draw.point((x_off + x, y), fill=h3)

    # Boots (y=21..23)
    for y in range(21, 24):
        for x in [9, 10, 11]:
            draw.point((x_off + x, y), fill=h3)
        for x in [12, 13, 14]:
            draw.point((x_off + x, y), fill=h3)

    # Walk animation: offset legs slightly based on frame_variant
    if frame_variant % 2 == 1:
        draw.point((x_off + 10, 20), fill=TRANSPARENT)
        draw.point((x_off + 13, 21), fill=TRANSPARENT)


def create_outfit_sets():
    """Create 6 cosmetic outfit sets for each of 4 classes.
    Each set is a 144x24 sprite sheet (6 frames at 24x24).
    """
    for cls_name in CLASS_COLORS:
        for theme_name, theme_colors in OUTFIT_THEMES.items():
            w, h = 144, 24  # 6 frames x 24px
            img = Image.new("RGBA", (w, h), TRANSPARENT)
            draw = ImageDraw.Draw(img)
            for frame in range(6):
                draw_outfit_frame(draw, frame * 24, cls_name, theme_colors, frame)
            fname = f"cosmetic_outfit_{cls_name}_{theme_name}.png"
            img.save(f"{OUT}/{fname}")
            print(f"  Created {fname} ({w}x{h})")


# ═══════════════════════════════════════════════════════════════════════════
# 3. ACCESSORY SPRITES
# ═══════════════════════════════════════════════════════════════════════════

def create_hat_sprites():
    """Hats: 16x16 overlay sprites placed on character head. 6 variants."""
    hat_defs = {
        "hat_crown": {
            "pixels": [
                (4,6),(5,5),(6,4),(7,3),(8,3),(9,4),(10,5),(11,6),
                (4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),
                (3,8),(4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),(12,8),
                (3,9),(4,9),(5,9),(6,9),(7,9),(8,9),(9,9),(10,9),(11,9),(12,9),
                # Gem accents
                (6,5),(9,5),
            ],
            "color": ACC_COLORS["gold"],
            "accent": ACC_COLORS["ruby"],
            "accent_pixels": [(6,5),(9,5),(7,7),(8,7)],
        },
        "hat_wizard": {
            "pixels": [
                (8,1),(9,1),
                (7,2),(8,2),(9,2),(10,2),
                (7,3),(8,3),(9,3),(10,3),
                (6,4),(7,4),(8,4),(9,4),(10,4),(11,4),
                (6,5),(7,5),(8,5),(9,5),(10,5),(11,5),
                (5,6),(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),(12,6),
                (5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),(12,7),
                (4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),(12,8),(13,8),
                (3,9),(4,9),(5,9),(6,9),(7,9),(8,9),(9,9),(10,9),(11,9),(12,9),(13,9),
            ],
            "color": (80, 60, 140, 255),
            "accent": (220, 200, 60, 255),
            "accent_pixels": [(8,1),(9,1),(8,4),(5,8),(12,8)],
        },
        "hat_hood": {
            "pixels": [
                (6,2),(7,2),(8,2),(9,2),
                (5,3),(6,3),(7,3),(8,3),(9,3),(10,3),
                (4,4),(5,4),(6,4),(9,4),(10,4),(11,4),
                (4,5),(5,5),(10,5),(11,5),
                (3,6),(4,6),(11,6),(12,6),
                (3,7),(4,7),(11,7),(12,7),
                (3,8),(4,8),(5,8),(10,8),(11,8),(12,8),
                (4,9),(5,9),(6,9),(9,9),(10,9),(11,9),
                (5,10),(6,10),(9,10),(10,10),
                # Cape drape
                (3,9),(3,10),(3,11),(12,9),(12,10),(12,11),
            ],
            "color": (60, 50, 50, 255),
            "accent": (100, 80, 80, 255),
            "accent_pixels": [(6,2),(9,2),(4,5),(11,5)],
        },
        "hat_beret": {
            "pixels": [
                (7,3),(8,3),(9,3),
                (5,4),(6,4),(7,4),(8,4),(9,4),(10,4),(11,4),
                (4,5),(5,5),(6,5),(7,5),(8,5),(9,5),(10,5),(11,5),(12,5),
                (4,6),(5,6),(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),(12,6),
                (5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),
                (4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),(12,8),
            ],
            "color": (180, 40, 50, 255),
            "accent": (220, 80, 80, 255),
            "accent_pixels": [(7,3),(8,3),(6,5),(7,5)],
        },
        "hat_helm_horned": {
            "pixels": [
                (4,1),(11,1),
                (4,2),(5,2),(10,2),(11,2),
                (5,3),(6,3),(9,3),(10,3),
                (5,4),(6,4),(7,4),(8,4),(9,4),(10,4),
                (4,5),(5,5),(6,5),(7,5),(8,5),(9,5),(10,5),(11,5),
                (4,6),(5,6),(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),
                (4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),
                (3,8),(4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),(12,8),
                (3,9),(4,9),(5,9),(10,9),(11,9),(12,9),
            ],
            "color": ACC_COLORS["silver"],
            "accent": (140, 150, 170, 255),
            "accent_pixels": [(4,1),(11,1),(4,2),(11,2),(7,6),(8,6)],
        },
        "hat_pirate": {
            "pixels": [
                (7,2),(8,2),
                (6,3),(7,3),(8,3),(9,3),
                (5,4),(6,4),(7,4),(8,4),(9,4),(10,4),
                (4,5),(5,5),(6,5),(7,5),(8,5),(9,5),(10,5),(11,5),
                (3,6),(4,6),(5,6),(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),(12,6),
                (2,7),(3,7),(4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),(12,7),(13,7),
                (3,8),(4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),(12,8),
            ],
            "color": (50, 40, 30, 255),
            "accent": (220, 180, 40, 255),
            "accent_pixels": [(7,2),(8,2),(7,5),(8,5),(7,6),(8,6)],
        },
    }
    for name, spec in hat_defs.items():
        img = Image.new("RGBA", (16, 16), TRANSPARENT)
        draw = ImageDraw.Draw(img)
        for x, y in spec["pixels"]:
            c = spec["accent"] if (x, y) in spec["accent_pixels"] else spec["color"]
            draw.point((x, y), fill=c)
        img.save(f"{OUT}/{name}.png")
        print(f"  Created {name}.png (16x16)")


def create_cloak_sprites():
    """Cloaks: 32x24 overlay sprites. 4 color variants."""
    cloak_colors = {
        "cloak_crimson":  ((160, 30, 30, 255), (120, 20, 20, 255), (200, 50, 50, 255)),
        "cloak_midnight": ((30, 25, 50, 255), (20, 15, 40, 255), (60, 50, 90, 255)),
        "cloak_verdant":  ((30, 100, 40, 255), (20, 70, 30, 255), (50, 140, 60, 255)),
        "cloak_ivory":    ((200, 195, 180, 255), (170, 165, 150, 255), (230, 225, 210, 255)),
    }
    for name, (mid, dark, light) in cloak_colors.items():
        img = Image.new("RGBA", (32, 24), TRANSPARENT)
        draw = ImageDraw.Draw(img)
        # Cloak drapes from shoulders down back
        # Collar
        for x in range(12, 20):
            draw.point((x, 6), fill=light)
            draw.point((x, 7), fill=light)
        # Main body
        for y in range(8, 22):
            width = 8 + (y - 8) // 2
            cx = 16
            for x in range(cx - width // 2, cx + width // 2):
                if 0 <= x < 32:
                    shade = light if x < cx - 1 else (dark if x > cx + 1 else mid)
                    draw.point((x, y), fill=shade)
        # Bottom fringe
        for x in range(10, 22):
            if x % 2 == 0:
                draw.point((x, 22), fill=mid)
                draw.point((x, 23), fill=dark)
        img.save(f"{OUT}/{name}.png")
        print(f"  Created {name}.png (32x24)")


def create_wing_sprites():
    """Wings: 48x24 sprite (wide to show both sides). 3 variants."""
    wing_defs = {
        "wings_angel": ((220, 220, 240, 255), (180, 190, 220, 255), (240, 240, 255, 255)),
        "wings_demon": ((80, 30, 30, 255), (50, 15, 15, 255), (120, 50, 50, 255)),
        "wings_fairy": ((160, 220, 180, 255), (120, 200, 150, 255), (200, 240, 210, 200)),
    }
    for name, (mid, dark, light) in wing_defs.items():
        img = Image.new("RGBA", (48, 24), TRANSPARENT)
        draw = ImageDraw.Draw(img)
        # Left wing
        wing_shape_l = [
            (16,8),(15,7),(14,6),(13,5),(12,5),(11,4),(10,4),(9,4),(8,5),
            (7,5),(6,6),(5,6),(4,7),(3,7),(2,8),(2,9),(3,10),(4,11),
            (5,12),(6,13),(7,14),(8,14),(9,15),(10,15),(11,15),(12,15),
            (13,15),(14,14),(15,13),(16,12),
            # Fill
            (15,8),(14,7),(13,6),(12,6),(11,5),(10,5),(9,5),
            (8,6),(7,6),(6,7),(5,7),(4,8),(3,8),(3,9),
            (4,9),(4,10),(5,10),(5,11),(6,11),(6,12),(7,12),(7,13),
            (8,13),(9,13),(9,14),(10,14),(11,14),(12,14),(13,14),(14,13),
            (15,12),(15,11),(14,10),(13,9),(12,8),(11,7),(10,6),
            (14,8),(13,7),(12,7),(14,9),(13,8),(15,9),(15,10),
            (14,11),(13,10),(12,9),(11,8),(10,7),
            (8,7),(7,7),(6,8),(5,8),(4,8),
            (8,8),(7,8),(6,9),(5,9),
            (8,9),(7,9),(6,10),(8,10),(7,10),(8,11),(9,11),(10,11),
            (9,12),(10,12),(11,12),(12,12),(13,12),(9,10),(10,10),(11,10),
            (10,9),(11,9),(12,10),(13,11),(10,8),(9,8),(9,9),
            (11,11),(12,11),(14,12),(13,13),(12,13),(11,13),
        ]
        # Right wing (mirror)
        wing_shape_r = [(48 - 1 - x, y) for x, y in wing_shape_l]

        for x, y in wing_shape_l:
            if 0 <= x < 48 and 0 <= y < 24:
                # Gradient: lighter toward tips
                if x < 8:
                    draw.point((x, y), fill=light)
                elif x < 13:
                    draw.point((x, y), fill=mid)
                else:
                    draw.point((x, y), fill=dark)
        for x, y in wing_shape_r:
            if 0 <= x < 48 and 0 <= y < 24:
                if x > 39:
                    draw.point((x, y), fill=light)
                elif x > 34:
                    draw.point((x, y), fill=mid)
                else:
                    draw.point((x, y), fill=dark)
        img.save(f"{OUT}/{name}.png")
        print(f"  Created {name}.png (48x24)")


def create_aura_sprites():
    """Auras: 32x32 VFX overlays, 4 frames in a 128x32 strip."""
    aura_defs = {
        "aura_flame": ((255, 140, 40, 180), (255, 80, 20, 140), (255, 200, 80, 100)),
        "aura_frost": ((100, 180, 255, 180), (60, 140, 220, 140), (180, 220, 255, 100)),
        "aura_holy": ((255, 255, 180, 180), (255, 240, 120, 140), (255, 255, 220, 100)),
        "aura_shadow": ((80, 40, 120, 180), (40, 20, 80, 140), (120, 80, 160, 100)),
    }
    random.seed(42)
    for name, (mid, dark, light) in aura_defs.items():
        img = Image.new("RGBA", (128, 32), TRANSPARENT)
        draw = ImageDraw.Draw(img)
        for frame in range(4):
            cx = frame * 32 + 16
            cy = 16
            # Draw concentric rings of particles
            for ring in range(3):
                r = 6 + ring * 4
                n_particles = 8 + ring * 4
                for i in range(n_particles):
                    import math
                    angle = (2 * math.pi * i / n_particles) + frame * 0.3 + ring * 0.5
                    px = int(cx + r * math.cos(angle))
                    py = int(cy + r * math.sin(angle) * 0.7)  # Slightly squashed
                    if 0 <= px < 128 and 0 <= py < 32:
                        c = light if ring == 0 else (mid if ring == 1 else dark)
                        draw.point((px, py), fill=c)
                        # Slightly larger particles for inner ring
                        if ring == 0 and 0 <= px + 1 < 128:
                            draw.point((px + 1, py), fill=c)
        img.save(f"{OUT}/{name}.png")
        print(f"  Created {name}.png (128x32)")


# ═══════════════════════════════════════════════════════════════════════════
# 4. PREVIEW / FITTING ROOM UI BACKGROUND
# ═══════════════════════════════════════════════════════════════════════════

def create_fitting_room_bg():
    """Fitting room background: 200x180, shows a mirror/platform area."""
    w, h = 200, 180
    img = Image.new("RGBA", (w, h), (25, 30, 35, 255))
    draw = ImageDraw.Draw(img)
    draw_panel_border(draw, w, h)

    # Title
    draw.rectangle([2, 2, w - 3, 14], fill=BG_MID)
    draw_pixel_text(draw, 6, 5, "FITTING ROOM", TEXT_GOLD)
    draw_horizontal_separator(draw, 15, w)

    # Mirror frame (centered)
    mx, my, mw, mh = 50, 20, 100, 110
    # Ornate frame
    draw.rectangle([mx - 2, my - 2, mx + mw + 1, my + mh + 1], outline=BORDER_GOLD)
    draw.rectangle([mx - 1, my - 1, mx + mw, my + mh], outline=BORDER_DARK)
    # Mirror interior (slightly blue-tinted dark)
    for y in range(my, my + mh):
        for x in range(mx, mx + mw):
            brightness = 30 + int(10 * (1 - abs(y - my - mh // 2) / (mh // 2)))
            draw.point((x, y), fill=(brightness, brightness + 5, brightness + 10, 255))
    # Mirror shine streak
    for i in range(15):
        sx = mx + 20 + i
        sy = my + 10 + i
        if sx < mx + mw and sy < my + mh:
            draw.point((sx, sy), fill=(60, 65, 70, 255))

    # Frame corner ornaments
    for cx, cy in [(mx, my), (mx + mw - 1, my), (mx, my + mh - 1), (mx + mw - 1, my + mh - 1)]:
        draw.rectangle([cx - 1, cy - 1, cx + 2, cy + 2], fill=RIVET)

    # Platform below mirror
    py = my + mh + 8
    draw.ellipse([60, py, 140, py + 14], fill=(50, 45, 40, 255), outline=(70, 65, 55, 255))

    # Equipment slots on left side
    for i in range(4):
        sy = 24 + i * 22
        draw.rectangle([8, sy, 25, sy + 17], fill=SLOT_BG, outline=SLOT_BORDER)

    # Equipment slots on right side
    for i in range(4):
        sy = 24 + i * 22
        draw.rectangle([w - 26, sy, w - 9, sy + 17], fill=SLOT_BG, outline=SLOT_BORDER)

    # Bottom buttons area
    draw.rectangle([2, h - 28, w - 3, h - 3], fill=BG_MID)
    draw_horizontal_separator(draw, h - 29, w)
    # Equip button
    draw.rectangle([10, h - 24, 60, h - 8], fill=(60, 120, 60, 255), outline=(80, 160, 80, 255))
    draw_pixel_text(draw, 18, h - 19, "EQUIP", TEXT_WHITE)
    # Remove button
    draw.rectangle([70, h - 24, 130, h - 8], fill=(120, 60, 60, 255), outline=(160, 80, 80, 255))
    draw_pixel_text(draw, 78, h - 19, "REMOVE", TEXT_WHITE)

    img.save(f"{OUT}/ui_panel_fitting_room.png")
    print(f"  Created ui_panel_fitting_room.png ({w}x{h})")


# ═══════════════════════════════════════════════════════════════════════════
# 5. PURCHASE CONFIRMATION AND EQUIP VFX
# ═══════════════════════════════════════════════════════════════════════════

def create_purchase_vfx():
    """Purchase success VFX: gold sparkle burst, 6 frames at 32x32 = 192x32."""
    w, h = 192, 32
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    import math
    random.seed(123)

    for frame in range(6):
        cx = frame * 32 + 16
        cy = 16
        progress = frame / 5.0  # 0..1

        # Expanding ring of gold particles
        n = 12
        radius = 4 + int(progress * 10)
        for i in range(n):
            angle = 2 * math.pi * i / n + frame * 0.2
            px = int(cx + radius * math.cos(angle))
            py = int(cy + radius * math.sin(angle))
            alpha = int(255 * (1 - progress * 0.6))
            if 0 <= px < w and 0 <= py < h:
                draw.point((px, py), fill=(255, 220, 80, alpha))
                if radius < 10 and 0 <= px + 1 < w:
                    draw.point((px + 1, py), fill=(255, 240, 120, alpha // 2))

        # Central flash (fades out)
        if frame < 3:
            flash_size = 3 - frame
            for dy in range(-flash_size, flash_size + 1):
                for dx in range(-flash_size, flash_size + 1):
                    if abs(dx) + abs(dy) <= flash_size:
                        px, py = cx + dx, cy + dy
                        if 0 <= px < w and 0 <= py < h:
                            draw.point((px, py), fill=(255, 255, 200, 200))

        # Floating sparkle stars
        for s in range(4):
            sx = cx + random.randint(-12, 12)
            sy = cy - int(progress * 8) + random.randint(-4, 4)
            if 0 <= sx < w and 0 <= sy < h:
                draw.point((sx, sy), fill=(255, 240, 140, int(200 * (1 - progress))))

    img.save(f"{OUT}/vfx_purchase_success.png")
    print(f"  Created vfx_purchase_success.png ({w}x{h})")


def create_equip_vfx():
    """Equip VFX: swirl effect around character, 6 frames at 32x32 = 192x32."""
    w, h = 192, 32
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    import math

    colors = [
        (180, 160, 255, 200),  # Light purple
        (140, 200, 255, 180),  # Light blue
        (255, 220, 160, 160),  # Light gold
    ]

    for frame in range(6):
        cx = frame * 32 + 16
        cy = 16
        t = frame / 5.0

        # Upward swirling particles
        for ring in range(3):
            n = 6
            base_r = 8 + ring * 2
            r = base_r * (0.5 + t * 0.5)
            y_lift = t * 6
            for i in range(n):
                angle = 2 * math.pi * i / n + frame * 0.8 + ring * 1.0
                px = int(cx + r * math.cos(angle))
                py = int(cy + r * 0.4 * math.sin(angle) - y_lift + ring * 3)
                if 0 <= px < w and 0 <= py < h:
                    c = colors[ring % len(colors)]
                    alpha = int(c[3] * (1 - t * 0.5))
                    draw.point((px, py), fill=(c[0], c[1], c[2], alpha))

        # Rising sparkle line
        for i in range(5):
            sy = cy + 10 - int(t * 16) - i * 3
            sx = cx + int(2 * math.sin(sy * 0.5 + frame))
            if 0 <= sx < w and 0 <= sy < h:
                draw.point((sx, sy), fill=(220, 220, 255, int(180 * (1 - t * 0.4))))

    img.save(f"{OUT}/vfx_equip_sparkle.png")
    print(f"  Created vfx_equip_sparkle.png ({w}x{h})")


def create_unequip_vfx():
    """Unequip/remove VFX: dissolve particles, 4 frames at 32x32 = 128x32."""
    w, h = 128, 32
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    import math
    random.seed(99)

    for frame in range(4):
        cx = frame * 32 + 16
        cy = 16
        t = frame / 3.0

        # Dissolving particles falling outward
        n = 16
        for i in range(n):
            angle = 2 * math.pi * i / n + random.random() * 0.5
            dist = 2 + t * 10
            px = int(cx + dist * math.cos(angle))
            py = int(cy + dist * math.sin(angle) + t * 3)
            alpha = int(180 * (1 - t * 0.8))
            if 0 <= px < w and 0 <= py < h and alpha > 0:
                draw.point((px, py), fill=(160, 160, 180, alpha))

    img.save(f"{OUT}/vfx_unequip_dissolve.png")
    print(f"  Created vfx_unequip_dissolve.png ({w}x{h})")


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("Generating cosmetic shop assets...\n")

    print("=== Shop UI Panel Art ===")
    create_shop_storefront_panel()
    create_currency_icons()
    create_category_tab_icons()

    print("\n=== Cosmetic Outfit Sets ===")
    create_outfit_sets()

    print("\n=== Accessory Sprites ===")
    create_hat_sprites()
    create_cloak_sprites()
    create_wing_sprites()
    create_aura_sprites()

    print("\n=== Fitting Room Background ===")
    create_fitting_room_bg()

    print("\n=== VFX ===")
    create_purchase_vfx()
    create_equip_vfx()
    create_unequip_vfx()

    # Count total assets
    total = len([f for f in os.listdir(OUT) if f.endswith('.png')])
    print(f"\nDone! {total} assets created in {OUT}/")
