#!/usr/bin/env python3
"""Generate menu, transition, loading, gameover, and connection screen assets.

All assets use the PixelRealm 32-color master palette.
Output: PNG files in assets/ui/{loading,transitions,menu,gameover,connection}/
"""

import sys, os, math
sys.path.insert(0, "/tmp/pylibs")
from PIL import Image, ImageDraw

# ---------- PixelRealm 32-color palette ----------
PAL = {
    # Neutrals
    "black":        (0x0d, 0x0d, 0x0d),
    "dark_gray":    (0x2b, 0x2b, 0x2b),
    "mid_gray":     (0x4a, 0x4a, 0x4a),
    "gray":         (0x6e, 0x6e, 0x6e),
    "light_gray":   (0x96, 0x96, 0x96),
    "silver":       (0xc8, 0xc8, 0xc8),
    "white":        (0xf0, 0xf0, 0xf0),
    # Warm earth
    "dark_brown":   (0x3b, 0x20, 0x10),
    "brown":        (0x6b, 0x3a, 0x1f),
    "med_brown":    (0x8b, 0x5c, 0x2a),
    "tan":          (0xb8, 0x84, 0x3f),
    "sand":         (0xd4, 0xa8, 0x5a),
    "cream":        (0xe8, 0xd0, 0x8a),
    # Greens
    "dark_green":   (0x1a, 0x3a, 0x1a),
    "green":        (0x2d, 0x6e, 0x2d),
    "mid_green":    (0x4c, 0x9b, 0x4c),
    "light_green":  (0x78, 0xc8, 0x78),
    "pale_green":   (0xa8, 0xe4, 0xa0),
    # Cyan / Blue
    "dark_navy":    (0x0a, 0x1a, 0x3a),
    "navy":         (0x1a, 0x4a, 0x8a),
    "blue":         (0x2a, 0x7a, 0xc0),
    "cyan":         (0x50, 0xa8, 0xe8),
    "light_cyan":   (0x90, 0xd0, 0xf8),
    "pale_cyan":    (0xc8, 0xf0, 0xff),
    # Red / Orange
    "dark_red":     (0x5a, 0x0a, 0x0a),
    "red":          (0xa0, 0x10, 0x10),
    "bright_red":   (0xd4, 0x20, 0x20),
    "orange":       (0xf0, 0x60, 0x20),
    "peach":        (0xf8, 0xa0, 0x60),
    # Yellow / Gold
    "dark_gold":    (0xa8, 0x70, 0x00),
    "gold":         (0xe8, 0xb8, 0x00),
    "yellow":       (0xff, 0xe0, 0x40),
    "pale_yellow":  (0xff, 0xf8, 0xa0),
    # Purple
    "dark_purple":  (0x1a, 0x0a, 0x3a),
    "purple":       (0x5a, 0x20, 0xa0),
    "mid_purple":   (0x90, 0x50, 0xe0),
    "light_purple": (0xd0, 0x90, 0xff),
}

TRANSPARENT = (0, 0, 0, 0)
BASE = "/host-workdir/companies/PixelForgeStudios/projects/PixelRealm/assets"


def rgba(name, a=255):
    r, g, b = PAL[name]
    return (r, g, b, a)


def save(img, *path_parts):
    fp = os.path.join(BASE, *path_parts)
    img.save(fp)
    print(f"  -> {fp}")


def draw_pixel_rect(draw, x, y, w, h, fill, border=None, border_w=1):
    """Draw a rectangle with optional 1px border, pixel-art style."""
    if border:
        draw.rectangle([x, y, x+w-1, y+h-1], fill=border)
        draw.rectangle([x+border_w, y+border_w, x+w-1-border_w, y+h-1-border_w], fill=fill)
    else:
        draw.rectangle([x, y, x+w-1, y+h-1], fill=fill)


def draw_pixel_text(draw, x, y, text, color, scale=1):
    """Draw blocky pixel text using a minimal 3x5 bitmap font."""
    FONT = {
        'A': ["111","101","111","101","101"], 'B': ["110","101","110","101","110"],
        'C': ["111","100","100","100","111"], 'D': ["110","101","101","101","110"],
        'E': ["111","100","110","100","111"], 'F': ["111","100","110","100","100"],
        'G': ["111","100","101","101","111"], 'H': ["101","101","111","101","101"],
        'I': ["111","010","010","010","111"], 'J': ["011","001","001","101","111"],
        'K': ["101","101","110","101","101"], 'L': ["100","100","100","100","111"],
        'M': ["101","111","111","101","101"], 'N': ["101","111","111","111","101"],
        'O': ["111","101","101","101","111"], 'P': ["111","101","111","100","100"],
        'Q': ["111","101","101","111","001"], 'R': ["111","101","111","110","101"],
        'S': ["111","100","111","001","111"], 'T': ["111","010","010","010","010"],
        'U': ["101","101","101","101","111"], 'V': ["101","101","101","101","010"],
        'W': ["101","101","111","111","101"], 'X': ["101","101","010","101","101"],
        'Y': ["101","101","111","010","010"], 'Z': ["111","001","010","100","111"],
        '0': ["111","101","101","101","111"], '1': ["010","110","010","010","111"],
        '2': ["111","001","111","100","111"], '3': ["111","001","111","001","111"],
        '4': ["101","101","111","001","001"], '5': ["111","100","111","001","111"],
        '6': ["111","100","111","101","111"], '7': ["111","001","001","001","001"],
        '8': ["111","101","111","101","111"], '9': ["111","101","111","001","111"],
        ':': ["0","1","0","1","0"], '.': ["0","0","0","0","1"],
        ' ': ["000","000","000","000","000"], '-': ["000","000","111","000","000"],
        '/': ["001","001","010","100","100"], '!': ["010","010","010","000","010"],
        '?': ["111","001","011","000","010"],
    }
    cx = x
    for ch in text.upper():
        glyph = FONT.get(ch, FONT[' '])
        for gy, row in enumerate(glyph):
            for gx, bit in enumerate(row):
                if bit == '1':
                    px, py = cx + gx * scale, y + gy * scale
                    if scale == 1:
                        draw.point((px, py), fill=color)
                    else:
                        draw.rectangle([px, py, px+scale-1, py+scale-1], fill=color)
        cx += (len(glyph[0]) + 1) * scale
    return cx - x  # width used


# ================================================================
# 1. LOADING SCREEN ASSETS
# ================================================================
def gen_loading_assets():
    print("Loading screen assets:")

    # --- Logo: "PIXELREALM" pixel text on dark bg, 128x48 ---
    w, h = 128, 48
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Dark panel background
    draw_pixel_rect(d, 0, 0, w, h, rgba("dark_navy"), rgba("navy"))
    # Title text
    draw_pixel_text(d, 8, 8, "PIXEL", rgba("cyan"), scale=3)
    draw_pixel_text(d, 8, 28, "REALM", rgba("gold"), scale=3)
    save(img, "ui", "loading", "ui_loading_logo.png")

    # --- Progress bar frame: 120x12 ---
    w, h = 120, 12
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("black"), rgba("mid_gray"))
    save(img, "ui", "loading", "ui_loading_bar_frame.png")

    # --- Progress bar fill: 116x8 (fits inside frame with 2px padding) ---
    w, h = 116, 8
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Gradient from cyan to light_cyan
    for x in range(w):
        t = x / max(w - 1, 1)
        r = int(PAL["cyan"][0] * (1-t) + PAL["light_cyan"][0] * t)
        g = int(PAL["cyan"][1] * (1-t) + PAL["light_cyan"][1] * t)
        b = int(PAL["cyan"][2] * (1-t) + PAL["light_cyan"][2] * t)
        d.line([(x, 0), (x, h-1)], fill=(r, g, b, 255))
    save(img, "ui", "loading", "ui_loading_bar_fill.png")

    # --- Tips panel: 200x32 dark semi-transparent panel ---
    w, h = 200, 32
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("black", 180), rgba("dark_gray", 200))
    draw_pixel_text(d, 6, 4, "TIP:", rgba("gold"), scale=2)
    draw_pixel_text(d, 6, 20, "PRESS E TO INTERACT", rgba("silver"), scale=1)
    save(img, "ui", "loading", "ui_loading_tips_panel.png")

    # --- Spinner frames: 4 frames of a rotating pixel indicator, 16x16 ---
    for frame_idx in range(4):
        img = Image.new("RGBA", (16, 16), TRANSPARENT)
        d = ImageDraw.Draw(img)
        cx, cy = 7, 7
        for i in range(8):
            angle = (i / 8) * 2 * math.pi
            px = int(cx + 5 * math.cos(angle))
            py = int(cy + 5 * math.sin(angle))
            # Highlight 2 consecutive dots based on frame
            dist = (i - frame_idx * 2) % 8
            if dist == 0:
                color = rgba("white")
            elif dist == 1:
                color = rgba("light_cyan")
            elif dist == 7:
                color = rgba("cyan")
            else:
                color = rgba("mid_gray")
            d.rectangle([px, py, px+1, py+1], fill=color)
        save(img, "ui", "loading", f"ui_loading_spinner_{frame_idx}.png")

    # --- Loading screen background overlay: 320x180 dark vignette ---
    w, h = 320, 180
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Dark semi-transparent overlay
    d.rectangle([0, 0, w-1, h-1], fill=rgba("black", 200))
    save(img, "ui", "loading", "ui_loading_overlay.png")


# ================================================================
# 2. ZONE TRANSITION ASSETS
# ================================================================
def gen_transition_assets():
    print("Zone transition assets:")

    # --- Zone name banner: 200x28, dark panel with gold border ---
    w, h = 200, 28
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("black", 220), rgba("dark_gold", 240))
    draw_pixel_text(d, 8, 4, "ENTERING:", rgba("gold"), scale=1)
    draw_pixel_text(d, 8, 12, "ZONE NAME", rgba("white"), scale=2)
    save(img, "ui", "transitions", "ui_zone_banner.png")

    # --- Zone banner background (without text, for dynamic text overlay) ---
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("black", 220), rgba("dark_gold", 240))
    save(img, "ui", "transitions", "ui_zone_banner_bg.png")

    # --- Fade overlay: solid black, full screen 320x180 ---
    w, h = 320, 180
    img = Image.new("RGBA", (w, h), (0x0d, 0x0d, 0x0d, 255))
    save(img, "ui", "transitions", "ui_transition_fade.png")

    # --- Wipe mask: horizontal gradient for wipe transitions, 320x180 ---
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    for x in range(w):
        a = int(255 * x / (w - 1))
        for y in range(h):
            img.putpixel((x, y), (0x0d, 0x0d, 0x0d, a))
    save(img, "ui", "transitions", "ui_transition_wipe.png")

    # --- Diamond wipe mask: diamond-shaped reveal pattern ---
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    cx, cy = w // 2, h // 2
    max_dist = cx + cy
    for y in range(h):
        for x in range(w):
            dist = abs(x - cx) + abs(y - cy)
            a = min(255, int(255 * dist / max_dist))
            img.putpixel((x, y), (0x0d, 0x0d, 0x0d, a))
    save(img, "ui", "transitions", "ui_transition_diamond.png")

    # --- Zone transition decorative line: 320x2, gold ---
    w2, h2 = 320, 2
    img = Image.new("RGBA", (w2, h2), TRANSPARENT)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w2-1, 0], fill=rgba("dark_gold"))
    d.rectangle([0, 1, w2-1, 1], fill=rgba("gold"))
    save(img, "ui", "transitions", "ui_zone_line.png")


# ================================================================
# 3. MAIN MENU UI POLISH
# ================================================================
def gen_menu_assets():
    print("Main menu assets:")

    # --- Title logo: larger "PIXELREALM" with decorative frame, 192x64 ---
    w, h = 192, 64
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Outer frame
    draw_pixel_rect(d, 0, 0, w, h, rgba("dark_navy", 220), rgba("gold"))
    # Inner frame
    draw_pixel_rect(d, 3, 3, w-6, h-6, rgba("dark_navy", 240), rgba("dark_gold"))
    # Text
    draw_pixel_text(d, 16, 12, "PIXEL", rgba("cyan"), scale=4)
    draw_pixel_text(d, 16, 38, "REALM", rgba("gold"), scale=4)
    save(img, "ui", "menu", "ui_menu_title_logo.png")

    # --- Menu button: normal state, 96x20 ---
    for state, bg, border, text_col in [
        ("normal",  "dark_gray",  "gray",       "silver"),
        ("hover",   "mid_gray",   "cyan",       "white"),
        ("pressed", "dark_navy",  "light_cyan", "pale_cyan"),
    ]:
        w, h = 96, 20
        img = Image.new("RGBA", (w, h), TRANSPARENT)
        d = ImageDraw.Draw(img)
        draw_pixel_rect(d, 0, 0, w, h, rgba(bg), rgba(border))
        # Center placeholder text
        draw_pixel_text(d, 8, 6, "PLAY GAME", rgba(text_col), scale=1)
        save(img, "ui", "menu", f"ui_menu_btn_{state}.png")

    # --- Menu panel background (9-slice friendly): 64x64 with corners ---
    w, h = 64, 64
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Outer border
    draw_pixel_rect(d, 0, 0, w, h, rgba("dark_gray", 240), rgba("gray"))
    # Inner fill
    draw_pixel_rect(d, 2, 2, w-4, h-4, rgba("dark_gray", 220), rgba("mid_gray", 180))
    # Corner accents in gold
    for cx, cy in [(0,0),(w-3,0),(0,h-3),(w-3,h-3)]:
        d.rectangle([cx, cy, cx+2, cy+2], fill=rgba("dark_gold"))
    save(img, "ui", "menu", "ui_menu_panel.png")

    # --- Subtitle/version label: 80x10 ---
    w, h = 80, 10
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_text(d, 0, 2, "V0.1.0 ALPHA", rgba("gray"), scale=1)
    save(img, "ui", "menu", "ui_menu_version.png")

    # --- Menu divider line: 96x2 ---
    w, h = 96, 2
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w-1, 0], fill=rgba("mid_gray"))
    d.rectangle([0, 1, w-1, 1], fill=rgba("dark_gray"))
    save(img, "ui", "menu", "ui_menu_divider.png")


# ================================================================
# 4. GAME OVER SCREEN ASSETS
# ================================================================
def gen_gameover_assets():
    print("Game over screen assets:")

    # --- Stats panel: 160x120, dark panel for stat display ---
    w, h = 160, 120
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("black", 220), rgba("dark_red"))
    draw_pixel_rect(d, 2, 2, w-4, h-4, rgba("black", 200), rgba("red", 120))
    # Header
    draw_pixel_text(d, 8, 8, "DEFEATED", rgba("bright_red"), scale=2)
    # Stat labels
    draw_pixel_text(d, 8, 32, "TIME:  00:12:34", rgba("silver"), scale=1)
    draw_pixel_text(d, 8, 42, "KILLS: 42", rgba("silver"), scale=1)
    draw_pixel_text(d, 8, 52, "LEVEL: 5", rgba("silver"), scale=1)
    draw_pixel_text(d, 8, 62, "ZONE:  ICE CAVES", rgba("silver"), scale=1)
    # Divider
    d.rectangle([8, 76, w-9, 76], fill=rgba("dark_red"))
    save(img, "ui", "gameover", "ui_gameover_stats_panel.png")

    # --- Stats panel background only (no text, for dynamic overlay) ---
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("black", 220), rgba("dark_red"))
    draw_pixel_rect(d, 2, 2, w-4, h-4, rgba("black", 200), rgba("red", 120))
    save(img, "ui", "gameover", "ui_gameover_stats_bg.png")

    # --- Victory panel variant: gold border ---
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("black", 220), rgba("dark_gold"))
    draw_pixel_rect(d, 2, 2, w-4, h-4, rgba("black", 200), rgba("gold", 120))
    save(img, "ui", "gameover", "ui_victory_stats_bg.png")

    # --- Skull icon: 16x16 pixel skull ---
    img = Image.new("RGBA", (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    skull = [
        "..11111111..",
        ".1111111111.",
        "111111111111",
        "111111111111",
        "111..11..111",
        "111..11..111",
        ".1111111111.",
        "..11111111..",
        "..1..11..1..",
        "..11111111..",
        "...111111...",
        "....1111....",
    ]
    for sy, row in enumerate(skull):
        for sx, ch in enumerate(row):
            if ch == '1':
                # Map to 16x16 with some centering
                px, py = sx + 2, sy + 2
                if px < 16 and py < 16:
                    img.putpixel((px, py), PAL["white"] + (255,))
    save(img, "ui", "gameover", "ui_icon_skull.png")

    # --- Trophy icon: 16x16 pixel trophy ---
    img = Image.new("RGBA", (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    trophy = [
        "..11111111..",
        ".1111111111.",
        "111111111111",
        ".1111111111.",
        "..11111111..",
        "...111111...",
        "....1111....",
        ".....11.....",
        ".....11.....",
        "....1111....",
        "...111111...",
    ]
    for sy, row in enumerate(trophy):
        for sx, ch in enumerate(row):
            if ch == '1':
                px, py = sx + 2, sy + 2
                if px < 16 and py < 16:
                    img.putpixel((px, py), PAL["gold"] + (255,))
    save(img, "ui", "gameover", "ui_icon_trophy.png")

    # --- Respawn button: 80x20 ---
    w, h = 80, 20
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("dark_navy"), rgba("cyan"))
    draw_pixel_text(d, 12, 6, "RESPAWN", rgba("white"), scale=1)
    save(img, "ui", "gameover", "ui_btn_respawn.png")

    # --- Quit button: 80x20 ---
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("dark_gray"), rgba("gray"))
    draw_pixel_text(d, 20, 6, "QUIT", rgba("silver"), scale=1)
    save(img, "ui", "gameover", "ui_btn_quit.png")

    # --- "DEFEATED" title text: 128x24 ---
    w, h = 128, 24
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_text(d, 4, 2, "DEFEATED", rgba("bright_red"), scale=3)
    save(img, "ui", "gameover", "ui_gameover_title.png")

    # --- "VICTORY" title text: 128x24 ---
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_text(d, 8, 2, "VICTORY", rgba("gold"), scale=3)
    save(img, "ui", "gameover", "ui_victory_title.png")

    # --- Death vignette overlay: 320x180, red edges fading to center ---
    w, h = 320, 180
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    cx, cy = w // 2, h // 2
    max_dist = math.sqrt(cx**2 + cy**2)
    for y in range(h):
        for x in range(w):
            dist = math.sqrt((x - cx)**2 + (y - cy)**2)
            t = min(1.0, dist / max_dist)
            a = int(180 * t * t)  # quadratic falloff
            img.putpixel((x, y), (0x5a, 0x0a, 0x0a, a))
    save(img, "ui", "gameover", "ui_gameover_vignette.png")


# ================================================================
# 5. CONNECTION SCREEN ASSETS
# ================================================================
def gen_connection_assets():
    print("Connection screen assets:")

    # --- Connection panel: 160x80 ---
    w, h = 160, 80
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("black", 230), rgba("dark_gray"))
    draw_pixel_rect(d, 2, 2, w-4, h-4, rgba("dark_navy", 220), rgba("navy", 160))
    save(img, "ui", "connection", "ui_connection_panel.png")

    # --- Connection spinner: 4 frames, 24x24 ---
    for frame_idx in range(4):
        img = Image.new("RGBA", (24, 24), TRANSPARENT)
        d = ImageDraw.Draw(img)
        cx, cy = 11, 11
        for i in range(12):
            angle = (i / 12) * 2 * math.pi
            px = int(cx + 8 * math.cos(angle))
            py = int(cy + 8 * math.sin(angle))
            dist = (i - frame_idx * 3) % 12
            if dist == 0:
                color = rgba("white")
            elif dist == 1:
                color = rgba("light_cyan")
            elif dist == 2:
                color = rgba("cyan")
            elif dist == 11:
                color = rgba("blue")
            else:
                color = rgba("mid_gray")
            d.rectangle([px, py, px+1, py+1], fill=color)
        save(img, "ui", "connection", f"ui_connection_spinner_{frame_idx}.png")

    # --- "CONNECTING" text: 96x12 ---
    w, h = 96, 12
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_text(d, 0, 1, "CONNECTING...", rgba("silver"), scale=1)
    save(img, "ui", "connection", "ui_text_connecting.png")

    # --- Error panel: 160x80 with red accent ---
    w, h = 160, 80
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("black", 230), rgba("dark_red"))
    draw_pixel_rect(d, 2, 2, w-4, h-4, rgba("dark_navy", 220), rgba("red", 120))
    save(img, "ui", "connection", "ui_connection_error_panel.png")

    # --- Error icon: 16x16 X mark ---
    img = Image.new("RGBA", (16, 16), TRANSPARENT)
    d = ImageDraw.Draw(img)
    # Circle background
    for y in range(16):
        for x in range(16):
            dist = math.sqrt((x - 7.5)**2 + (y - 7.5)**2)
            if dist <= 7:
                img.putpixel((x, y), PAL["dark_red"] + (255,))
            if dist <= 6:
                img.putpixel((x, y), PAL["red"] + (255,))
    # X mark
    for i in range(3, 13):
        for off in [-1, 0, 1]:
            px1, py1 = i, i + off
            px2, py2 = i, 15 - i + off
            if 0 <= py1 < 16:
                img.putpixel((px1, py1), PAL["white"] + (255,))
            if 0 <= py2 < 16:
                img.putpixel((px1, py2), PAL["white"] + (255,))
    save(img, "ui", "connection", "ui_icon_error.png")

    # --- Retry button: 80x20 ---
    w, h = 80, 20
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_rect(d, 0, 0, w, h, rgba("dark_navy"), rgba("cyan"))
    draw_pixel_text(d, 16, 6, "RETRY", rgba("white"), scale=1)
    save(img, "ui", "connection", "ui_btn_retry.png")

    # --- "COULD NOT CONNECT" text: 120x12 ---
    w, h = 120, 12
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    draw_pixel_text(d, 0, 1, "CONNECTION FAILED", rgba("bright_red"), scale=1)
    save(img, "ui", "connection", "ui_text_error.png")

    # --- Connection background overlay: 320x180 ---
    w, h = 320, 180
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w-1, h-1], fill=rgba("black", 220))
    save(img, "ui", "connection", "ui_connection_overlay.png")


# ================================================================
# MAIN
# ================================================================
if __name__ == "__main__":
    print("Generating PixelRealm menu & transition assets...")
    print("=" * 50)
    gen_loading_assets()
    print()
    gen_transition_assets()
    print()
    gen_menu_assets()
    print()
    gen_gameover_assets()
    print()
    gen_connection_assets()
    print()
    print("=" * 50)
    print("Done! All assets generated.")
