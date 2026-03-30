#!/usr/bin/env python3
"""
Generate class showcase portraits, archetype thumbnails, and itch.io feature banner
for PixelRealm v1.3.0 launch (PIX-427).

Uses only Python stdlib (struct + zlib) — no PIL required.

Assets generated:
  Class showcase portraits (64x64, in assets/ui/class-select/):
    - portrait_showcase_warrior.png
    - portrait_showcase_mage.png
    - portrait_showcase_ranger.png
    - portrait_showcase_artisan.png

  Archetype preview thumbnails (32x32, in assets/ui/class-select/):
    Warrior:  thumb_archetype_berserker.png, thumb_archetype_guardian.png, thumb_archetype_paladin.png
    Mage:     thumb_archetype_pyromancer.png, thumb_archetype_frostbinder.png, thumb_archetype_arcanist.png
    Ranger:   thumb_archetype_sharpshooter.png, thumb_archetype_shadowstalker.png, thumb_archetype_beastmaster.png
    Artisan:  thumb_archetype_blacksmith.png, thumb_archetype_alchemist.png, thumb_archetype_enchanter.png

  Feature banner (630x500, in assets/marketing/):
    - banner_feature_v130.png
"""

import struct
import zlib
import os

REPO_ROOT = os.path.join(os.path.dirname(__file__), '..')

# Output directories
SELECT_DIR   = os.path.join(REPO_ROOT, 'assets', 'ui', 'class-select')
MARKETING_DIR = os.path.join(REPO_ROOT, 'assets', 'marketing')

for d in [SELECT_DIR, MARKETING_DIR]:
    os.makedirs(d, exist_ok=True)

# ─── Master Palette (RGBA) ──────────────────────────────────────────────────

_ = (0, 0, 0, 0)          # transparent

# Neutrals
K   = (13,  13,  13,  255)  # shadow black / outline
DK  = (43,  43,  43,  255)  # dark rock
ST  = (74,  74,  74,  255)  # stone gray
MG  = (110, 110, 110, 255)  # mid gray
LS  = (150, 150, 150, 255)  # light stone
PG  = (200, 200, 200, 255)  # pale gray (skin)
NW  = (240, 240, 240, 255)  # near white (highlight)

# Warm earth
BD  = (59,  32,  16,  255)  # deep soil
BN  = (107, 58,  31,  255)  # rich earth
DT  = (139, 92,  42,  255)  # dirt / boots
SN  = (184, 132, 63,  255)  # sand / sandstone
DS  = (212, 168, 90,  255)  # desert gold
PS  = (232, 208, 138, 255)  # pale sand

# Greens
DF  = (26,  58,  26,  255)  # deep forest
FG  = (45,  110, 45,  255)  # forest green
LG  = (76,  155, 76,  255)  # leaf green
BG  = (120, 200, 120, 255)  # bright grass
FL  = (168, 228, 160, 255)  # light foliage

# Cyan / player
OC  = (10,  26,  58,  255)  # deep ocean
DP  = (26,  74,  138, 255)  # ocean blue / player shadow
SB  = (42,  122, 192, 255)  # sky blue
PB  = (80,  168, 232, 255)  # player blue (main)
HB  = (144, 208, 248, 255)  # ice / pale water / highlight
IW  = (200, 240, 255, 255)  # ice white / shimmer

# Red / enemy
DB  = (90,  10,  10,  255)  # deep blood
ER  = (160, 16,  16,  255)  # enemy red
BR  = (212, 32,  32,  255)  # bright red
FR  = (240, 96,  32,  255)  # fire orange
EM  = (248, 160, 96,  255)  # ember

# Yellow / gold
DG  = (168, 112, 0,   255)  # dark gold
GD  = (232, 184, 0,   255)  # gold
YL  = (255, 224, 64,  255)  # bright yellow / XP
PY  = (255, 248, 160, 255)  # pale highlight

# Purple / magic
PM  = (26,  10,  58,  255)  # deep magic
MP  = (90,  32,  160, 255)  # magic purple
MV  = (144, 80,  224, 255)  # mana violet
SG  = (208, 144, 255, 255)  # spell glow

# Skin tones for portraits
SK  = PG   # base skin
SH  = LS   # skin highlight
SD  = MG   # skin shadow


# ─── PNG writer ──────────────────────────────────────────────────────────────

def _make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    payload = chunk_type + data
    crc = zlib.crc32(payload) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)

def write_png(path: str, pixels: list) -> None:
    height = len(pixels)
    width  = len(pixels[0])
    ihdr_data = struct.pack('>II', width, height) + bytes([8, 6, 0, 0, 0])
    raw_rows = b''
    for row in pixels:
        raw_rows += b'\x00'
        for r, g, b, a in row:
            raw_rows += bytes([r, g, b, a])
    compressed = zlib.compress(raw_rows, 9)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(_make_chunk(b'IHDR', ihdr_data))
        f.write(_make_chunk(b'IDAT', compressed))
        f.write(_make_chunk(b'IEND', b''))
    print(f'  wrote {path}  ({width}x{height})')


# ─── Helpers ─────────────────────────────────────────────────────────────────

def blank(w, h, fill=None):
    fill = fill or _
    return [[fill]*w for _ in range(h)]

def set_pixel(px, x, y, c):
    if 0 <= y < len(px) and 0 <= x < len(px[0]) and c[3] > 0:
        px[y][x] = c

def fill_rect(px, x0, y0, w, h, c):
    for yy in range(y0, y0+h):
        for xx in range(x0, x0+w):
            set_pixel(px, xx, yy, c)

def draw_rect(px, x0, y0, w, h, c):
    for xx in range(x0, x0+w):
        set_pixel(px, xx, y0, c)
        set_pixel(px, xx, y0+h-1, c)
    for yy in range(y0, y0+h):
        set_pixel(px, x0, yy, c)
        set_pixel(px, x0+w-1, yy, c)

def draw_circle_filled(px, cx, cy, r, c):
    for yy in range(cy-r, cy+r+1):
        for xx in range(cx-r, cx+r+1):
            if (xx-cx)**2 + (yy-cy)**2 <= r*r:
                set_pixel(px, xx, yy, c)

def draw_circle_outline(px, cx, cy, r, c):
    for yy in range(cy-r-1, cy+r+2):
        for xx in range(cx-r-1, cx+r+2):
            d = (xx-cx)**2 + (yy-cy)**2
            if r*r - r <= d <= r*r + r:
                set_pixel(px, xx, yy, c)

def draw_line(px, x0, y0, x1, y1, c):
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    while True:
        set_pixel(px, x0, y0, c)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy

def draw_diamond(px, cx, cy, r, c):
    for i in range(r+1):
        set_pixel(px, cx+i, cy-r+i, c)
        set_pixel(px, cx-i, cy-r+i, c)
        set_pixel(px, cx+i, cy+r-i, c)
        set_pixel(px, cx-i, cy+r-i, c)

def blend(c1, c2, t):
    """Blend c1 toward c2 by factor t (0.0=c1, 1.0=c2)."""
    return (
        int(c1[0]*(1-t) + c2[0]*t),
        int(c1[1]*(1-t) + c2[1]*t),
        int(c1[2]*(1-t) + c2[2]*t),
        255
    )

def copy_region(src, dst, sx, sy, dx, dy, w, h):
    for yy in range(h):
        for xx in range(w):
            if 0 <= sy+yy < len(src) and 0 <= sx+xx < len(src[0]):
                c = src[sy+yy][sx+xx]
                if c[3] > 0:
                    set_pixel(dst, dx+xx, dy+yy, c)


# ─── 1. CLASS SHOWCASE PORTRAITS (64x64) ────────────────────────────────────
# Large pixel art portraits: head + shoulders + weapon, dynamic pose.
# Color coding: Warrior=red/steel, Mage=purple/blue, Ranger=green/brown, Artisan=gold/brown
# Background: dark vignette circle per class color

def make_portrait_bg(w, h, accent_dark, accent_mid):
    """Create a circular vignette background for a class portrait."""
    px = blank(w, h, K)
    cx, cy = w//2, h//2
    r = min(w, h)//2 - 2
    # Gradient circle
    for yy in range(h):
        for xx in range(w):
            d = ((xx-cx)**2 + (yy-cy)**2) ** 0.5
            if d < r - 4:
                t = d / (r - 4)
                px[yy][xx] = blend(accent_mid, accent_dark, t * 0.8)
            elif d < r:
                px[yy][xx] = accent_dark
    return px

def draw_portrait_head(px, cx, top_y, hair_c, hair_hi):
    """Draw a character head at cx, top_y. Returns bottom y of head."""
    # Hair top
    for xx in range(cx-6, cx+7):
        set_pixel(px, xx, top_y, hair_c)
        set_pixel(px, xx, top_y+1, hair_c)
    for xx in range(cx-7, cx+8):
        set_pixel(px, xx, top_y+2, hair_c)
        set_pixel(px, xx, top_y+3, hair_c)
    # Hair highlight
    for xx in range(cx-4, cx-1):
        set_pixel(px, xx, top_y+1, hair_hi)
    # Face
    for yy in range(top_y+4, top_y+12):
        for xx in range(cx-6, cx+7):
            set_pixel(px, xx, yy, SK)
    # Skin shadow on sides
    for yy in range(top_y+4, top_y+12):
        set_pixel(px, cx-6, yy, SD)
        set_pixel(px, cx+6, yy, SD)
    # Skin highlight
    for yy in range(top_y+5, top_y+8):
        set_pixel(px, cx-3, yy, SH)
    # Eyes
    set_pixel(px, cx-3, top_y+7, K)
    set_pixel(px, cx-2, top_y+7, K)
    set_pixel(px, cx+2, top_y+7, K)
    set_pixel(px, cx+3, top_y+7, K)
    # Eye highlights
    set_pixel(px, cx-3, top_y+6, NW)
    set_pixel(px, cx+2, top_y+6, NW)
    # Mouth
    set_pixel(px, cx-1, top_y+10, SD)
    set_pixel(px, cx,   top_y+10, SD)
    set_pixel(px, cx+1, top_y+10, SD)
    # Chin outline
    for xx in range(cx-5, cx+6):
        set_pixel(px, xx, top_y+12, K)
    # Side outlines
    for yy in range(top_y, top_y+12):
        set_pixel(px, cx-7, yy, K)
        set_pixel(px, cx+7, yy, K)
    # Top outline
    for xx in range(cx-6, cx+7):
        set_pixel(px, xx, top_y-1, K)
    return top_y + 13


def gen_warrior_portrait():
    """Warrior: heavy plate armor, greatsword raised, red/steel palette."""
    px = make_portrait_bg(64, 64, DB, ER)
    cx = 32
    # Head
    bot = draw_portrait_head(px, cx, 6, BN, SN, )
    # Neck
    fill_rect(px, cx-3, bot, 7, 3, SK)
    bot += 3
    # Shoulder pauldrons (steel)
    # Left pauldron
    fill_rect(px, cx-15, bot, 10, 6, ST)
    fill_rect(px, cx-14, bot+1, 8, 4, MG)
    fill_rect(px, cx-13, bot+1, 2, 2, LS)  # highlight
    draw_rect(px, cx-15, bot, 10, 6, K)
    # Right pauldron
    fill_rect(px, cx+6, bot, 10, 6, ST)
    fill_rect(px, cx+7, bot+1, 8, 4, MG)
    fill_rect(px, cx+8, bot+1, 2, 2, LS)
    draw_rect(px, cx+6, bot, 10, 6, K)
    # Chest plate
    fill_rect(px, cx-8, bot, 17, 14, ST)
    fill_rect(px, cx-7, bot+1, 15, 12, MG)
    # Chest highlight (center ridge)
    fill_rect(px, cx-1, bot+2, 3, 10, LS)
    # Red tabard center
    fill_rect(px, cx-3, bot+4, 7, 6, ER)
    fill_rect(px, cx-2, bot+5, 5, 4, BR)
    # Chest outline
    draw_rect(px, cx-8, bot, 17, 14, K)
    bot += 14
    # Arms
    # Left arm (holding sword)
    fill_rect(px, cx-15, bot-8, 6, 12, ST)
    fill_rect(px, cx-14, bot-7, 4, 10, MG)
    draw_rect(px, cx-15, bot-8, 6, 12, K)
    # Right arm
    fill_rect(px, cx+10, bot-8, 6, 12, ST)
    fill_rect(px, cx+11, bot-7, 4, 10, MG)
    draw_rect(px, cx+10, bot-8, 6, 12, K)
    # Greatsword (left side, raised)
    # Blade
    fill_rect(px, cx-19, 2, 3, 30, LS)
    fill_rect(px, cx-18, 3, 1, 28, NW)
    draw_rect(px, cx-19, 2, 3, 30, K)
    # Crossguard
    fill_rect(px, cx-22, 32, 9, 2, DG)
    fill_rect(px, cx-21, 32, 7, 2, GD)
    draw_rect(px, cx-22, 32, 9, 2, K)
    # Grip
    fill_rect(px, cx-19, 34, 3, 6, BD)
    fill_rect(px, cx-18, 35, 1, 4, BN)
    # Pommel
    fill_rect(px, cx-20, 40, 5, 3, DG)
    fill_rect(px, cx-19, 41, 3, 1, GD)
    draw_rect(px, cx-20, 40, 5, 3, K)
    # Belt
    fill_rect(px, cx-8, bot, 17, 3, BD)
    fill_rect(px, cx-7, bot+1, 15, 1, BN)
    # Belt buckle
    fill_rect(px, cx-1, bot, 3, 3, GD)
    set_pixel(px, cx, bot+1, YL)
    draw_rect(px, cx-8, bot, 17, 3, K)
    # Lower body (fade to bottom)
    fill_rect(px, cx-8, bot+3, 17, 8, DK)
    fill_rect(px, cx-7, bot+4, 15, 6, ST)
    return px


def gen_mage_portrait():
    """Mage: pointed hat, arcane staff, purple/blue palette with spell glow."""
    px = make_portrait_bg(64, 64, PM, MP)
    cx = 32
    # Pointed hat
    hat_top = 2
    for i in range(10):
        w = 1 + i
        fill_rect(px, cx - w//2, hat_top + i, w, 1, MP)
    # Hat brim
    fill_rect(px, cx-8, hat_top+10, 17, 2, MP)
    fill_rect(px, cx-9, hat_top+11, 19, 1, MV)
    # Hat highlight
    set_pixel(px, cx-1, hat_top+2, SG)
    set_pixel(px, cx, hat_top+3, SG)
    set_pixel(px, cx-1, hat_top+4, MV)
    # Hat outline
    for i in range(10):
        w = 1 + i
        set_pixel(px, cx - w//2, hat_top + i, K)
        set_pixel(px, cx + w//2, hat_top + i, K)
    for xx in range(cx-9, cx+10):
        set_pixel(px, xx, hat_top+12, K)
    # Head
    bot = draw_portrait_head(px, cx, 15, MP, SG)
    # Neck
    fill_rect(px, cx-3, bot, 7, 2, SK)
    bot += 2
    # Collar (ornate)
    fill_rect(px, cx-8, bot, 17, 3, PM)
    fill_rect(px, cx-7, bot+1, 15, 1, MP)
    # Gem on collar
    set_pixel(px, cx, bot, MV)
    set_pixel(px, cx, bot+1, SG)
    draw_rect(px, cx-8, bot, 17, 3, K)
    bot += 3
    # Robe body
    fill_rect(px, cx-10, bot, 21, 16, PM)
    fill_rect(px, cx-9, bot+1, 19, 14, MP)
    # Robe center stripe
    fill_rect(px, cx-1, bot, 3, 16, MV)
    fill_rect(px, cx, bot+1, 1, 14, SG)
    # Rune symbols on robe
    for i in range(3):
        y = bot + 3 + i * 5
        set_pixel(px, cx-5, y, SG)
        set_pixel(px, cx-4, y+1, SG)
        set_pixel(px, cx+4, y, SG)
        set_pixel(px, cx+5, y+1, SG)
    # Robe outline
    draw_rect(px, cx-10, bot, 21, 16, K)
    # Sleeves (wide mage robes)
    # Left sleeve
    fill_rect(px, cx-16, bot, 6, 10, PM)
    fill_rect(px, cx-15, bot+1, 4, 8, MP)
    draw_rect(px, cx-16, bot, 6, 10, K)
    # Left hand with glow
    fill_rect(px, cx-16, bot+10, 5, 3, SK)
    draw_circle_filled(px, cx-14, bot+14, 3, MV)
    draw_circle_filled(px, cx-14, bot+14, 2, SG)
    set_pixel(px, cx-14, bot+14, NW)
    # Right sleeve
    fill_rect(px, cx+11, bot, 6, 10, PM)
    fill_rect(px, cx+12, bot+1, 4, 8, MP)
    draw_rect(px, cx+11, bot, 6, 10, K)
    # Staff (right side)
    fill_rect(px, cx+16, 3, 2, 50, BD)
    fill_rect(px, cx+17, 4, 1, 48, BN)
    # Staff orb
    draw_circle_filled(px, cx+17, 4, 4, MV)
    draw_circle_filled(px, cx+17, 4, 2, SG)
    set_pixel(px, cx+17, 3, NW)
    draw_circle_outline(px, cx+17, 4, 4, K)
    return px


def gen_ranger_portrait():
    """Ranger: hooded cloak, longbow, green/brown forest palette."""
    px = make_portrait_bg(64, 64, DF, FG)
    cx = 32
    # Hood
    hood_top = 4
    fill_rect(px, cx-9, hood_top, 19, 8, DF)
    fill_rect(px, cx-8, hood_top+1, 17, 6, FG)
    # Hood point
    fill_rect(px, cx-2, hood_top-2, 5, 2, DF)
    fill_rect(px, cx-1, hood_top-1, 3, 1, FG)
    # Hood highlight
    fill_rect(px, cx-5, hood_top+2, 3, 2, LG)
    # Hood outline
    draw_rect(px, cx-9, hood_top, 19, 8, K)
    for xx in range(cx-2, cx+3):
        set_pixel(px, xx, hood_top-3, K)
    set_pixel(px, cx-3, hood_top-2, K)
    set_pixel(px, cx+3, hood_top-2, K)
    # Head (partially shadowed by hood)
    bot = draw_portrait_head(px, cx, 10, FG, LG)
    # Neck
    fill_rect(px, cx-3, bot, 7, 2, SK)
    bot += 2
    # Cloak over shoulders
    fill_rect(px, cx-12, bot, 25, 4, DF)
    fill_rect(px, cx-11, bot+1, 23, 2, FG)
    draw_rect(px, cx-12, bot, 25, 4, K)
    # Clasp
    set_pixel(px, cx, bot, GD)
    set_pixel(px, cx, bot+1, YL)
    bot += 4
    # Leather vest
    fill_rect(px, cx-8, bot, 17, 12, BD)
    fill_rect(px, cx-7, bot+1, 15, 10, BN)
    # Vest highlight
    fill_rect(px, cx-4, bot+2, 3, 6, DT)
    # Belt pouch
    fill_rect(px, cx+3, bot+8, 4, 3, BD)
    fill_rect(px, cx+4, bot+9, 2, 1, BN)
    draw_rect(px, cx+3, bot+8, 4, 3, K)
    # Vest outline
    draw_rect(px, cx-8, bot, 17, 12, K)
    # Arms (lean build)
    # Left arm
    fill_rect(px, cx-14, bot-2, 5, 12, DF)
    fill_rect(px, cx-13, bot-1, 3, 10, FG)
    draw_rect(px, cx-14, bot-2, 5, 12, K)
    # Right arm (drawing bow)
    fill_rect(px, cx+10, bot-2, 5, 12, DF)
    fill_rect(px, cx+11, bot-1, 3, 10, FG)
    draw_rect(px, cx+10, bot-2, 5, 12, K)
    # Longbow (right side)
    # Bow stave (curved)
    for i in range(24):
        y = 8 + i
        x_off = int(3 * (1 - ((i - 12) / 12.0) ** 2))
        set_pixel(px, cx+18+x_off, y, BD)
        set_pixel(px, cx+19+x_off, y, BN)
    # Bowstring
    draw_line(px, cx+19, 8, cx+16, 20, LS)
    draw_line(px, cx+16, 20, cx+19, 32, LS)
    # Arrow (nocked)
    fill_rect(px, cx+10, 19, 10, 1, SN)
    # Arrowhead
    set_pixel(px, cx+9, 19, LS)
    set_pixel(px, cx+8, 19, NW)
    # Fletching
    set_pixel(px, cx+20, 18, LG)
    set_pixel(px, cx+20, 19, LG)
    set_pixel(px, cx+20, 20, LG)
    # Quiver (behind, visible on right)
    fill_rect(px, cx+12, bot-6, 3, 8, BD)
    fill_rect(px, cx+13, bot-5, 1, 6, BN)
    # Arrow tips poking out
    set_pixel(px, cx+12, bot-7, LS)
    set_pixel(px, cx+13, bot-8, LS)
    set_pixel(px, cx+14, bot-7, LS)
    # Lower cloak
    fill_rect(px, cx-10, bot+12, 21, 10, DF)
    fill_rect(px, cx-9, bot+13, 19, 8, FG)
    # Cloak tatter detail
    for i in range(0, 19, 3):
        set_pixel(px, cx-9+i, bot+21, DF)
    return px


def gen_artisan_portrait():
    """Artisan: work apron, hammer raised, gold/brown crafting palette."""
    px = make_portrait_bg(64, 64, BD, DG)
    cx = 32
    # Head with work bandana
    bandana_top = 6
    fill_rect(px, cx-7, bandana_top, 15, 3, DG)
    fill_rect(px, cx-6, bandana_top+1, 13, 1, GD)
    draw_rect(px, cx-7, bandana_top, 15, 3, K)
    # Head
    bot = draw_portrait_head(px, cx, 9, BN, SN)
    # Neck (stockier)
    fill_rect(px, cx-4, bot, 9, 3, SK)
    bot += 3
    # Broad shoulders (stocky build)
    fill_rect(px, cx-13, bot, 27, 4, BN)
    fill_rect(px, cx-12, bot+1, 25, 2, DT)
    draw_rect(px, cx-13, bot, 27, 4, K)
    bot += 4
    # Work apron (signature)
    fill_rect(px, cx-8, bot, 17, 14, DS)
    fill_rect(px, cx-7, bot+1, 15, 12, SN)
    # Apron pocket
    fill_rect(px, cx-4, bot+6, 9, 5, DS)
    fill_rect(px, cx-3, bot+7, 7, 3, SN)
    # Tools in pocket
    set_pixel(px, cx-2, bot+6, MG)
    set_pixel(px, cx+1, bot+6, LS)
    set_pixel(px, cx+3, bot+7, MG)
    # Apron ties
    draw_line(px, cx-8, bot, cx-11, bot+3, BD)
    draw_line(px, cx+8, bot, cx+11, bot+3, BD)
    # Apron outline
    draw_rect(px, cx-8, bot, 17, 14, K)
    # Arms (brawny)
    # Left arm (raised with hammer)
    fill_rect(px, cx-16, bot-6, 6, 14, BN)
    fill_rect(px, cx-15, bot-5, 4, 12, DT)
    # Glove
    fill_rect(px, cx-16, bot-8, 5, 3, BD)
    fill_rect(px, cx-15, bot-7, 3, 1, BN)
    draw_rect(px, cx-16, bot-8, 5, 3, K)
    draw_rect(px, cx-16, bot-6, 6, 14, K)
    # Hammer (raised above head)
    # Handle
    fill_rect(px, cx-15, 1, 2, 15, BD)
    fill_rect(px, cx-14, 2, 1, 13, BN)
    # Hammer head
    fill_rect(px, cx-19, 1, 10, 5, MG)
    fill_rect(px, cx-18, 2, 8, 3, LS)
    fill_rect(px, cx-17, 2, 2, 2, NW)  # highlight
    draw_rect(px, cx-19, 1, 10, 5, K)
    # Right arm
    fill_rect(px, cx+11, bot-4, 6, 14, BN)
    fill_rect(px, cx+12, bot-3, 4, 12, DT)
    draw_rect(px, cx+11, bot-4, 6, 14, K)
    # Tool belt
    fill_rect(px, cx-10, bot+14, 21, 3, BD)
    fill_rect(px, cx-9, bot+15, 19, 1, BN)
    # Belt buckle (gear shape represented as square with center dot)
    fill_rect(px, cx-2, bot+14, 5, 3, DG)
    fill_rect(px, cx-1, bot+15, 3, 1, GD)
    set_pixel(px, cx, bot+15, YL)
    draw_rect(px, cx-10, bot+14, 21, 3, K)
    # Hanging tools on belt
    # Tongs
    draw_line(px, cx-7, bot+17, cx-8, bot+21, MG)
    draw_line(px, cx-6, bot+17, cx-5, bot+21, MG)
    # Small hammer
    fill_rect(px, cx+4, bot+17, 2, 4, BD)
    fill_rect(px, cx+3, bot+17, 4, 2, MG)
    # Lower body
    fill_rect(px, cx-8, bot+17, 17, 8, BD)
    fill_rect(px, cx-7, bot+18, 15, 6, BN)
    return px


# ─── 2. ARCHETYPE PREVIEW THUMBNAILS (32x32) ────────────────────────────────
# Smaller bust portraits showing archetype identity through color and small details

def make_thumb_bg(w, h, c1, c2):
    """Simple gradient background for thumbnail."""
    px = blank(w, h)
    for yy in range(h):
        t = yy / h
        px[yy] = [blend(c1, c2, t)] * w
    # Corner cutoff
    for i in range(2):
        for j in range(2-i):
            px[i][j] = K
            px[i][w-1-j] = K
            px[h-1-i][j] = K
            px[h-1-i][w-1-j] = K
    return px

def draw_thumb_head(px, cx, top_y, hair_c):
    """Small character head for 32x32 thumbnails."""
    # Hair
    fill_rect(px, cx-3, top_y, 7, 2, hair_c)
    fill_rect(px, cx-4, top_y+2, 9, 1, hair_c)
    # Face
    fill_rect(px, cx-3, top_y+3, 7, 5, SK)
    set_pixel(px, cx-3, top_y+3, SD)
    set_pixel(px, cx+3, top_y+3, SD)
    # Eyes
    set_pixel(px, cx-2, top_y+5, K)
    set_pixel(px, cx+2, top_y+5, K)
    # Mouth
    set_pixel(px, cx, top_y+7, SD)
    # Outline
    for xx in range(cx-3, cx+4):
        set_pixel(px, xx, top_y-1, K)
        set_pixel(px, xx, top_y+8, K)
    for yy in range(top_y, top_y+8):
        set_pixel(px, cx-4, yy, K)
        set_pixel(px, cx+4, yy, K)
    return top_y + 9


# Warrior archetypes
def gen_thumb_berserker():
    px = make_thumb_bg(32, 32, DB, ER)
    cx = 16
    bot = draw_thumb_head(px, cx, 3, BR)
    # Spiky hair (red, wild)
    set_pixel(px, cx-3, 1, BR)
    set_pixel(px, cx-1, 0, BR)
    set_pixel(px, cx+1, 1, BR)
    set_pixel(px, cx+3, 0, BR)
    # Scar
    draw_line(px, cx-2, 6, cx+1, 8, ER)
    # Bare chest with warpaint
    fill_rect(px, cx-5, bot, 11, 8, SK)
    fill_rect(px, cx-6, bot+1, 13, 6, SK)
    # Red warpaint stripes
    draw_line(px, cx-4, bot+1, cx-2, bot+5, BR)
    draw_line(px, cx+2, bot+1, cx+4, bot+5, BR)
    # Shoulder spikes
    fill_rect(px, cx-8, bot, 3, 4, ST)
    set_pixel(px, cx-8, bot-1, MG)
    fill_rect(px, cx+6, bot, 3, 4, ST)
    set_pixel(px, cx+8, bot-1, MG)
    draw_rect(px, cx-5, bot, 11, 8, K)
    # Axes (dual)
    fill_rect(px, cx-10, 5, 2, 12, BD)
    fill_rect(px, cx-12, 4, 4, 3, MG)
    fill_rect(px, cx+9, 5, 2, 12, BD)
    fill_rect(px, cx+9, 4, 4, 3, MG)
    # Lower
    fill_rect(px, cx-5, bot+8, 11, 6, DK)
    return px

def gen_thumb_guardian():
    px = make_thumb_bg(32, 32, DP, SB)
    cx = 16
    bot = draw_thumb_head(px, cx, 4, SB)
    # Helmet visor
    fill_rect(px, cx-4, 3, 9, 2, MG)
    fill_rect(px, cx-3, 3, 7, 1, LS)
    # Heavy plate chest
    fill_rect(px, cx-6, bot, 13, 8, MG)
    fill_rect(px, cx-5, bot+1, 11, 6, LS)
    fill_rect(px, cx-1, bot+2, 3, 4, PB)  # blue crest
    draw_rect(px, cx-6, bot, 13, 8, K)
    # Shield (large, center-left)
    fill_rect(px, cx-11, bot-2, 7, 12, SB)
    fill_rect(px, cx-10, bot-1, 5, 10, PB)
    fill_rect(px, cx-9, bot+1, 3, 4, HB)  # shield emblem highlight
    draw_rect(px, cx-11, bot-2, 7, 12, K)
    # Sword (behind shield)
    fill_rect(px, cx+7, 2, 2, 16, LS)
    fill_rect(px, cx+6, 16, 4, 2, DG)
    draw_rect(px, cx+7, 2, 2, 14, K)
    # Lower
    fill_rect(px, cx-6, bot+8, 13, 6, ST)
    return px

def gen_thumb_paladin():
    px = make_thumb_bg(32, 32, DG, GD)
    cx = 16
    bot = draw_thumb_head(px, cx, 4, GD)
    # Golden halo
    draw_circle_outline(px, cx, 2, 5, YL)
    # White/gold armor
    fill_rect(px, cx-6, bot, 13, 8, LS)
    fill_rect(px, cx-5, bot+1, 11, 6, NW)
    # Gold cross on chest
    fill_rect(px, cx-1, bot+1, 3, 6, GD)
    fill_rect(px, cx-3, bot+3, 7, 2, GD)
    set_pixel(px, cx, bot+3, YL)
    draw_rect(px, cx-6, bot, 13, 8, K)
    # Mace (right)
    fill_rect(px, cx+8, 4, 2, 14, DS)
    fill_rect(px, cx+7, 3, 4, 3, GD)
    fill_rect(px, cx+8, 3, 2, 1, YL)
    # Cape
    fill_rect(px, cx-8, bot+2, 2, 12, GD)
    fill_rect(px, cx+7, bot+2, 2, 12, GD)
    # Lower
    fill_rect(px, cx-6, bot+8, 13, 6, DS)
    return px


# Mage archetypes
def gen_thumb_pyromancer():
    px = make_thumb_bg(32, 32, DB, FR)
    cx = 16
    bot = draw_thumb_head(px, cx, 5, FR)
    # Flame hair
    set_pixel(px, cx-2, 3, YL)
    set_pixel(px, cx, 2, FR)
    set_pixel(px, cx+2, 3, EM)
    set_pixel(px, cx-1, 2, EM)
    set_pixel(px, cx+1, 1, YL)
    # Red robe
    fill_rect(px, cx-6, bot, 13, 10, ER)
    fill_rect(px, cx-5, bot+1, 11, 8, BR)
    # Fire emblem
    fill_rect(px, cx-1, bot+2, 3, 3, FR)
    set_pixel(px, cx, bot+2, YL)
    draw_rect(px, cx-6, bot, 13, 10, K)
    # Fireball in hand
    draw_circle_filled(px, cx-8, bot+4, 3, FR)
    draw_circle_filled(px, cx-8, bot+4, 2, YL)
    set_pixel(px, cx-8, bot+3, NW)
    # Staff
    fill_rect(px, cx+8, 3, 2, 22, BD)
    set_pixel(px, cx+9, 2, FR)
    set_pixel(px, cx+8, 1, YL)
    # Lower
    fill_rect(px, cx-6, bot+10, 13, 6, DB)
    return px

def gen_thumb_frostbinder():
    px = make_thumb_bg(32, 32, OC, DP)
    cx = 16
    bot = draw_thumb_head(px, cx, 5, HB)
    # Icy hair tips
    set_pixel(px, cx-3, 4, IW)
    set_pixel(px, cx+3, 4, IW)
    # Blue/white robe
    fill_rect(px, cx-6, bot, 13, 10, DP)
    fill_rect(px, cx-5, bot+1, 11, 8, SB)
    # Ice crystal emblem
    set_pixel(px, cx, bot+3, IW)
    set_pixel(px, cx-1, bot+4, HB)
    set_pixel(px, cx+1, bot+4, HB)
    set_pixel(px, cx, bot+5, IW)
    draw_rect(px, cx-6, bot, 13, 10, K)
    # Ice shard in hand
    fill_rect(px, cx-9, bot+2, 2, 6, HB)
    set_pixel(px, cx-9, bot+1, IW)
    set_pixel(px, cx-8, bot+1, IW)
    set_pixel(px, cx-9, bot+8, PB)
    # Frost particles
    set_pixel(px, cx-11, bot, IW)
    set_pixel(px, cx-7, bot-1, HB)
    set_pixel(px, cx+9, bot+2, IW)
    # Staff
    fill_rect(px, cx+8, 3, 2, 22, SB)
    draw_circle_filled(px, cx+9, 3, 2, HB)
    set_pixel(px, cx+9, 2, IW)
    # Lower
    fill_rect(px, cx-6, bot+10, 13, 6, OC)
    return px

def gen_thumb_arcanist():
    px = make_thumb_bg(32, 32, PM, MP)
    cx = 16
    bot = draw_thumb_head(px, cx, 5, MV)
    # Arcane crown
    set_pixel(px, cx-3, 3, SG)
    set_pixel(px, cx, 2, SG)
    set_pixel(px, cx+3, 3, SG)
    # Purple/white robe
    fill_rect(px, cx-6, bot, 13, 10, MP)
    fill_rect(px, cx-5, bot+1, 11, 8, MV)
    # Arcane circle emblem
    draw_circle_outline(px, cx, bot+5, 3, SG)
    set_pixel(px, cx, bot+5, NW)
    draw_rect(px, cx-6, bot, 13, 10, K)
    # Floating orbs
    draw_circle_filled(px, cx-9, bot+2, 2, MV)
    set_pixel(px, cx-9, bot+1, SG)
    draw_circle_filled(px, cx+10, bot+3, 2, MV)
    set_pixel(px, cx+10, bot+2, SG)
    # Rune sparkles
    set_pixel(px, cx-7, 8, SG)
    set_pixel(px, cx+8, 6, SG)
    set_pixel(px, cx+6, 10, SG)
    # Staff
    fill_rect(px, cx+8, 2, 2, 22, PM)
    fill_rect(px, cx+9, 3, 1, 20, MP)
    # Lower
    fill_rect(px, cx-6, bot+10, 13, 6, PM)
    return px


# Ranger archetypes
def gen_thumb_sharpshooter():
    px = make_thumb_bg(32, 32, DF, FG)
    cx = 16
    bot = draw_thumb_head(px, cx, 4, FG)
    # Ranger hat brim
    fill_rect(px, cx-5, 3, 11, 2, DF)
    fill_rect(px, cx-4, 3, 9, 1, FG)
    # Leather vest
    fill_rect(px, cx-6, bot, 13, 8, BD)
    fill_rect(px, cx-5, bot+1, 11, 6, BN)
    # Belt buckle
    set_pixel(px, cx, bot+6, GD)
    draw_rect(px, cx-6, bot, 13, 8, K)
    # Longbow (prominent)
    for i in range(18):
        y = 4 + i
        x_off = int(2 * (1 - ((i - 9) / 9.0) ** 2))
        set_pixel(px, cx+10+x_off, y, BN)
    draw_line(px, cx+11, 4, cx+9, 13, LS)
    draw_line(px, cx+9, 13, cx+11, 22, LS)
    # Arrow
    fill_rect(px, cx+4, 12, 6, 1, SN)
    set_pixel(px, cx+3, 12, LS)
    # Quiver
    fill_rect(px, cx-9, bot, 2, 8, BD)
    set_pixel(px, cx-9, bot-1, LS)
    set_pixel(px, cx-8, bot-1, LS)
    # Lower
    fill_rect(px, cx-6, bot+8, 13, 8, DF)
    return px

def gen_thumb_shadowstalker():
    px = make_thumb_bg(32, 32, K, DK)
    cx = 16
    bot = draw_thumb_head(px, cx, 5, DK)
    # Dark hood
    fill_rect(px, cx-5, 3, 11, 4, K)
    fill_rect(px, cx-4, 4, 9, 2, DK)
    # Only eyes visible (glowing)
    set_pixel(px, cx-2, 8, LG)
    set_pixel(px, cx+2, 8, LG)
    # Dark cloak
    fill_rect(px, cx-6, bot, 13, 10, DK)
    fill_rect(px, cx-5, bot+1, 11, 8, ST)
    draw_rect(px, cx-6, bot, 13, 10, K)
    # Twin daggers
    fill_rect(px, cx-10, bot+2, 1, 6, LS)
    set_pixel(px, cx-10, bot+1, NW)
    fill_rect(px, cx+10, bot+2, 1, 6, LS)
    set_pixel(px, cx+10, bot+1, NW)
    # Shadow wisps
    set_pixel(px, cx-8, bot-1, ST)
    set_pixel(px, cx+9, bot, ST)
    set_pixel(px, cx-7, bot+8, ST)
    # Lower
    fill_rect(px, cx-6, bot+10, 13, 6, K)
    return px

def gen_thumb_beastmaster():
    px = make_thumb_bg(32, 32, DF, LG)
    cx = 16
    bot = draw_thumb_head(px, cx, 4, BN)
    # Feathered headband
    fill_rect(px, cx-4, 3, 9, 1, BD)
    set_pixel(px, cx+3, 1, LG)
    set_pixel(px, cx+4, 0, FG)
    set_pixel(px, cx+4, 2, LG)
    # Fur-trimmed vest
    fill_rect(px, cx-6, bot, 13, 8, BD)
    fill_rect(px, cx-5, bot+1, 11, 6, BN)
    # Fur trim
    for xx in range(cx-5, cx+6, 2):
        set_pixel(px, xx, bot, SN)
    draw_rect(px, cx-6, bot, 13, 8, K)
    # Beast companion (wolf head, lower right)
    fill_rect(px, cx+7, 18, 7, 5, MG)
    fill_rect(px, cx+8, 19, 5, 3, LS)
    # Wolf eyes
    set_pixel(px, cx+9, 19, FG)
    set_pixel(px, cx+11, 19, FG)
    # Wolf ears
    set_pixel(px, cx+8, 17, MG)
    set_pixel(px, cx+12, 17, MG)
    # Wolf snout
    set_pixel(px, cx+10, 21, DK)
    draw_rect(px, cx+7, 18, 7, 5, K)
    # Staff with bone
    fill_rect(px, cx-9, 4, 2, 16, BD)
    set_pixel(px, cx-9, 3, NW)
    set_pixel(px, cx-8, 3, NW)
    # Lower
    fill_rect(px, cx-6, bot+8, 13, 8, BD)
    return px


# Artisan archetypes
def gen_thumb_blacksmith():
    px = make_thumb_bg(32, 32, BD, DG)
    cx = 16
    bot = draw_thumb_head(px, cx, 4, BN)
    # Soot on face
    set_pixel(px, cx+2, 9, DK)
    # Thick apron
    fill_rect(px, cx-6, bot, 13, 9, DS)
    fill_rect(px, cx-5, bot+1, 11, 7, SN)
    # Apron burn marks
    set_pixel(px, cx-2, bot+4, DT)
    set_pixel(px, cx+3, bot+6, DT)
    draw_rect(px, cx-6, bot, 13, 9, K)
    # Hammer (raised)
    fill_rect(px, cx-9, 2, 2, 12, BD)
    fill_rect(px, cx-11, 1, 6, 4, MG)
    fill_rect(px, cx-10, 2, 4, 2, LS)
    draw_rect(px, cx-11, 1, 6, 4, K)
    # Anvil (lower right)
    fill_rect(px, cx+6, 20, 8, 3, ST)
    fill_rect(px, cx+7, 18, 6, 2, MG)
    fill_rect(px, cx+8, 23, 4, 3, ST)
    draw_rect(px, cx+6, 18, 8, 8, K)
    # Sparks
    set_pixel(px, cx+5, 17, YL)
    set_pixel(px, cx+8, 16, EM)
    set_pixel(px, cx+11, 17, YL)
    # Lower
    fill_rect(px, cx-6, bot+9, 13, 7, BD)
    return px

def gen_thumb_alchemist():
    px = make_thumb_bg(32, 32, DF, LG)
    cx = 16
    bot = draw_thumb_head(px, cx, 4, LG)
    # Goggles on forehead
    fill_rect(px, cx-3, 3, 3, 2, DG)
    fill_rect(px, cx+1, 3, 3, 2, DG)
    set_pixel(px, cx-2, 4, HB)
    set_pixel(px, cx+2, 4, HB)
    # Lab coat
    fill_rect(px, cx-6, bot, 13, 9, LS)
    fill_rect(px, cx-5, bot+1, 11, 7, NW)
    # Green stain
    set_pixel(px, cx-3, bot+3, LG)
    set_pixel(px, cx-2, bot+4, BG)
    draw_rect(px, cx-6, bot, 13, 9, K)
    # Flask (held, left)
    fill_rect(px, cx-10, bot+2, 3, 5, LG)
    fill_rect(px, cx-9, bot+3, 1, 3, BG)
    # Flask neck
    fill_rect(px, cx-10, bot, 3, 2, LS)
    # Bubbles
    set_pixel(px, cx-9, bot+1, FL)
    set_pixel(px, cx-10, bot-1, BG)
    # Potion rack (right)
    fill_rect(px, cx+8, bot, 5, 8, BD)
    # Small potions
    fill_rect(px, cx+9, bot+1, 1, 3, BR)  # red potion
    fill_rect(px, cx+11, bot+1, 1, 3, SB)  # blue potion
    fill_rect(px, cx+10, bot+4, 1, 3, LG)  # green potion
    draw_rect(px, cx+8, bot, 5, 8, K)
    # Lower
    fill_rect(px, cx-6, bot+9, 13, 7, FG)
    return px

def gen_thumb_enchanter():
    px = make_thumb_bg(32, 32, PM, MV)
    cx = 16
    bot = draw_thumb_head(px, cx, 5, MV)
    # Rune circlet
    set_pixel(px, cx-3, 4, SG)
    set_pixel(px, cx, 3, SG)
    set_pixel(px, cx+3, 4, SG)
    # Enchanted robe
    fill_rect(px, cx-6, bot, 13, 10, MP)
    fill_rect(px, cx-5, bot+1, 11, 8, MV)
    # Rune glow patterns
    set_pixel(px, cx-3, bot+3, SG)
    set_pixel(px, cx+3, bot+3, SG)
    set_pixel(px, cx-2, bot+6, SG)
    set_pixel(px, cx+2, bot+6, SG)
    set_pixel(px, cx, bot+4, NW)
    draw_rect(px, cx-6, bot, 13, 10, K)
    # Runestone (held left)
    fill_rect(px, cx-10, bot+2, 4, 4, MP)
    fill_rect(px, cx-9, bot+3, 2, 2, SG)
    set_pixel(px, cx-8, bot+3, NW)
    draw_rect(px, cx-10, bot+2, 4, 4, K)
    # Floating runes (right)
    draw_diamond(px, cx+10, bot+2, 2, SG)
    set_pixel(px, cx+10, bot+2, NW)
    draw_diamond(px, cx+9, bot+7, 2, MV)
    set_pixel(px, cx+9, bot+7, SG)
    # Magical glow
    set_pixel(px, cx-7, bot-1, SG)
    set_pixel(px, cx+8, bot-2, SG)
    # Lower
    fill_rect(px, cx-6, bot+10, 13, 6, PM)
    return px


# ─── 3. FEATURE BANNER (630x500) ────────────────────────────────────────────
# itch.io feature banner with all 4 classes in a pixel scene + PixelRealm logo
# Scaled up pixel art (each "pixel" is 5x5 real pixels for crisp look at 630x500)

def gen_feature_banner():
    """Generate 630x500 itch.io feature banner.

    Strategy: work at 126x100 pixel-art resolution, then scale ×5 to 630x500.
    This gives a crisp pixel-art look at the itch.io display size.
    """
    W, H = 126, 100
    px = blank(W, H)

    # Sky gradient (top half)
    for yy in range(50):
        t = yy / 50.0
        c = blend(OC, DP, t)
        for xx in range(W):
            px[yy][xx] = c

    # Ground gradient (bottom half)
    for yy in range(50, H):
        t = (yy - 50) / 50.0
        c = blend(FG, BD, t)
        for xx in range(W):
            px[yy][xx] = c

    # Ground line detail
    for xx in range(W):
        px[50][xx] = LG
        px[51][xx] = FG
        if xx % 6 < 3:
            px[49][xx] = LG

    # Stars in sky
    star_positions = [(8,5), (22,12), (38,3), (55,8), (72,14), (88,6),
                      (100,10), (115,4), (14,18), (45,22), (78,16), (110,20)]
    for sx, sy in star_positions:
        set_pixel(px, sx, sy, NW)
        if sx % 3 == 0:
            set_pixel(px, sx+1, sy, PY)

    # Mountains in background
    for peak_x, peak_y, width in [(20, 25, 30), (55, 20, 40), (95, 28, 25)]:
        for yy in range(peak_y, 51):
            hw = int(width * (yy - peak_y) / (50 - peak_y) / 2)
            for xx in range(peak_x - hw, peak_x + hw + 1):
                if 0 <= xx < W:
                    t = (yy - peak_y) / (50 - peak_y)
                    mc = blend(ST, DP, t * 0.5)
                    px[yy][xx] = mc
        # Snow cap
        for yy in range(peak_y, min(peak_y + 4, 51)):
            hw = int(3 * (1 - (yy - peak_y) / 4))
            for xx in range(peak_x - hw, peak_x + hw + 1):
                if 0 <= xx < W:
                    px[yy][xx] = NW

    # Trees on ground line
    tree_positions = [5, 15, 25, 100, 110, 120]
    for tx in tree_positions:
        # Trunk
        fill_rect(px, tx, 44, 2, 6, BD)
        # Canopy
        draw_circle_filled(px, tx+1, 42, 3, FG)
        draw_circle_filled(px, tx+1, 42, 2, LG)
        set_pixel(px, tx, 41, BG)

    # ─── Character placement (4 classes standing on ground) ───
    # Each character is ~12x18 pixels, spaced across the banner

    def draw_banner_char(cx, ground_y, body_c, body_hi, hair_c, weapon_fn):
        """Draw a small character for the banner scene."""
        top = ground_y - 18
        # Head
        fill_rect(px, cx-2, top, 5, 3, hair_c)
        fill_rect(px, cx-2, top+3, 5, 4, SK)
        set_pixel(px, cx-1, top+5, K)  # eye
        set_pixel(px, cx+1, top+5, K)  # eye
        # Outline head
        for xx in range(cx-2, cx+3):
            set_pixel(px, xx, top-1, K)
            set_pixel(px, xx, top+7, K)
        for yy in range(top, top+7):
            set_pixel(px, cx-3, yy, K)
            set_pixel(px, cx+3, yy, K)
        # Body
        fill_rect(px, cx-3, top+8, 7, 6, body_c)
        fill_rect(px, cx-2, top+9, 5, 4, body_hi)
        draw_rect(px, cx-3, top+8, 7, 6, K)
        # Legs
        fill_rect(px, cx-2, top+14, 2, 4, body_c)
        fill_rect(px, cx+1, top+14, 2, 4, body_c)
        set_pixel(px, cx-2, top+17, K)
        set_pixel(px, cx-1, top+17, K)
        set_pixel(px, cx+1, top+17, K)
        set_pixel(px, cx+2, top+17, K)
        # Boots
        fill_rect(px, cx-2, top+16, 2, 2, BD)
        fill_rect(px, cx+1, top+16, 2, 2, BD)
        # Weapon
        weapon_fn(px, cx, top)

    def warrior_weapon(px, cx, top):
        # Greatsword (right)
        fill_rect(px, cx+4, top-2, 2, 14, LS)
        fill_rect(px, cx+3, top+10, 4, 1, DG)
        fill_rect(px, cx+4, top+11, 2, 3, BD)
        set_pixel(px, cx+5, top-2, NW)

    def mage_weapon(px, cx, top):
        # Staff with orb
        fill_rect(px, cx+4, top-4, 1, 18, BD)
        draw_circle_filled(px, cx+4, top-4, 2, MV)
        set_pixel(px, cx+4, top-5, SG)
        # Spell particles
        set_pixel(px, cx-4, top+6, SG)
        set_pixel(px, cx-5, top+4, MV)

    def ranger_weapon(px, cx, top):
        # Bow
        for i in range(12):
            y = top + i
            x_off = int(2 * (1 - ((i - 6) / 6.0) ** 2))
            set_pixel(px, cx+4+x_off, y, BN)
        # String
        draw_line(px, cx+5, top, cx+4, top+6, LS)
        draw_line(px, cx+4, top+6, cx+5, top+12, LS)
        # Arrow
        fill_rect(px, cx-2, top+5, 6, 1, SN)
        set_pixel(px, cx-3, top+5, NW)

    def artisan_weapon(px, cx, top):
        # Hammer
        fill_rect(px, cx-5, top-2, 1, 10, BD)
        fill_rect(px, cx-7, top-3, 5, 3, MG)
        fill_rect(px, cx-6, top-2, 3, 1, LS)

    # Place 4 characters
    ground = 60
    draw_banner_char(28, ground, ST, MG, BN, warrior_weapon)     # Warrior
    draw_banner_char(48, ground, MP, MV, MV, mage_weapon)        # Mage
    draw_banner_char(68, ground, FG, LG, FG, ranger_weapon)      # Ranger
    draw_banner_char(88, ground, DT, SN, BN, artisan_weapon)     # Artisan

    # Class color glows under each character
    for gx, gc in [(28, ER), (48, MV), (68, LG), (88, GD)]:
        for xx in range(gx-4, gx+5):
            set_pixel(px, xx, ground+1, gc)
            if abs(xx - gx) < 3:
                set_pixel(px, xx, ground+2, gc)

    # ─── "PIXELREALM" text (pixel font, centered) ───
    # Simple 5x7 pixel font for title, placed at top area
    # Letters are drawn as filled rectangles to spell "PIXELREALM"

    text_y = 30
    text_start_x = 18  # Centered roughly

    def draw_letter_P(px, x, y, c):
        fill_rect(px, x, y, 1, 7, c)
        fill_rect(px, x+1, y, 3, 1, c)
        set_pixel(px, x+3, y+1, c)
        set_pixel(px, x+3, y+2, c)
        fill_rect(px, x+1, y+3, 3, 1, c)

    def draw_letter_I(px, x, y, c):
        fill_rect(px, x, y, 3, 1, c)
        fill_rect(px, x+1, y+1, 1, 5, c)
        fill_rect(px, x, y+6, 3, 1, c)

    def draw_letter_X(px, x, y, c):
        for i in range(7):
            set_pixel(px, x + i*4//6, y + i, c)
            set_pixel(px, x + 3 - i*4//6, y + i, c)

    def draw_letter_E(px, x, y, c):
        fill_rect(px, x, y, 1, 7, c)
        fill_rect(px, x+1, y, 3, 1, c)
        fill_rect(px, x+1, y+3, 2, 1, c)
        fill_rect(px, x+1, y+6, 3, 1, c)

    def draw_letter_L(px, x, y, c):
        fill_rect(px, x, y, 1, 7, c)
        fill_rect(px, x+1, y+6, 3, 1, c)

    def draw_letter_R(px, x, y, c):
        fill_rect(px, x, y, 1, 7, c)
        fill_rect(px, x+1, y, 3, 1, c)
        set_pixel(px, x+3, y+1, c)
        set_pixel(px, x+3, y+2, c)
        fill_rect(px, x+1, y+3, 3, 1, c)
        set_pixel(px, x+2, y+4, c)
        set_pixel(px, x+3, y+5, c)
        set_pixel(px, x+3, y+6, c)

    def draw_letter_A(px, x, y, c):
        fill_rect(px, x+1, y, 2, 1, c)
        set_pixel(px, x, y+1, c)
        set_pixel(px, x+3, y+1, c)
        fill_rect(px, x, y+2, 1, 5, c)
        fill_rect(px, x+3, y+2, 1, 5, c)
        fill_rect(px, x+1, y+3, 2, 1, c)

    def draw_letter_M(px, x, y, c):
        fill_rect(px, x, y, 1, 7, c)
        fill_rect(px, x+4, y, 1, 7, c)
        set_pixel(px, x+1, y+1, c)
        set_pixel(px, x+3, y+1, c)
        set_pixel(px, x+2, y+2, c)
        set_pixel(px, x+2, y+3, c)

    # Draw "PIXELREALM" — letters are 4px wide + 1px gap = 5px per char
    title_color = GD
    title_hi = YL
    letters = [
        (draw_letter_P, 0), (draw_letter_I, 5), (draw_letter_X, 10),
        (draw_letter_E, 15), (draw_letter_L, 20),
        (draw_letter_R, 27), (draw_letter_E, 32), (draw_letter_A, 37),
        (draw_letter_L, 42), (draw_letter_M, 47),
    ]
    for fn, offset in letters:
        fn(px, text_start_x + offset, text_y, title_color)
        # Highlight on top row
        fn(px, text_start_x + offset, text_y, title_hi)

    # Subtitle "v1.3.0 — Choose Your Class" as a simple underline bar
    fill_rect(px, text_start_x, text_y + 9, 52, 1, DS)
    fill_rect(px, text_start_x + 5, text_y + 9, 42, 1, GD)

    # Decorative border
    draw_rect(px, 0, 0, W, H, K)
    draw_rect(px, 1, 1, W-2, H-2, DG)

    # Corner gems
    for gx, gy in [(3, 3), (W-4, 3), (3, H-4), (W-4, H-4)]:
        set_pixel(px, gx, gy, GD)
        set_pixel(px, gx-1, gy, DG)
        set_pixel(px, gx+1, gy, DG)
        set_pixel(px, gx, gy-1, DG)
        set_pixel(px, gx, gy+1, DG)

    # Path on ground
    for xx in range(20, 100):
        if 55 <= xx <= 75:
            continue  # gap for characters
        py = 65 + (xx % 7 < 2)
        set_pixel(px, xx, py, SN)
        set_pixel(px, xx, py+1, DT)

    # Grass tufts
    for gx in [8, 18, 35, 58, 75, 95, 108, 118]:
        set_pixel(px, gx, 59, LG)
        set_pixel(px, gx+1, 58, BG)
        set_pixel(px, gx-1, 59, FG)

    # Ground detail (stones, flowers)
    for sx, sy in [(12, 68), (40, 72), (85, 70), (105, 66)]:
        set_pixel(px, sx, sy, ST)
        set_pixel(px, sx+1, sy, MG)
    for fx, fy, fc in [(32, 58, BR), (62, 57, YL), (92, 58, MV)]:
        set_pixel(px, fx, fy, fc)
        set_pixel(px, fx, fy-1, fc)

    # Lower area: darker ground with vignette
    for yy in range(80, H):
        t = (yy - 80) / 20.0
        for xx in range(W):
            px[yy][xx] = blend(px[yy][xx], K, t * 0.6)

    # ─── Scale up 5x to 630x500 ───
    final_w, final_h = 630, 500
    final = blank(final_w, final_h)
    for yy in range(H):
        for xx in range(W):
            c = px[yy][xx]
            for dy in range(5):
                for dx in range(5):
                    fy = yy * 5 + dy
                    fx = xx * 5 + dx
                    if fy < final_h and fx < final_w:
                        final[fy][fx] = c

    return final


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print('PIX-427: Generating class showcase art for v1.3.0 launch...\n')

    # 1. Class showcase portraits (64x64)
    print('── Class Showcase Portraits (64x64) ──')
    portraits = {
        'portrait_showcase_warrior.png': gen_warrior_portrait,
        'portrait_showcase_mage.png': gen_mage_portrait,
        'portrait_showcase_ranger.png': gen_ranger_portrait,
        'portrait_showcase_artisan.png': gen_artisan_portrait,
    }
    for name, fn in portraits.items():
        write_png(os.path.join(SELECT_DIR, name), fn())

    # 2. Archetype preview thumbnails (32x32)
    print('\n── Archetype Preview Thumbnails (32x32) ──')
    thumbs = {
        # Warrior
        'thumb_archetype_berserker.png': gen_thumb_berserker,
        'thumb_archetype_guardian.png': gen_thumb_guardian,
        'thumb_archetype_paladin.png': gen_thumb_paladin,
        # Mage
        'thumb_archetype_pyromancer.png': gen_thumb_pyromancer,
        'thumb_archetype_frostbinder.png': gen_thumb_frostbinder,
        'thumb_archetype_arcanist.png': gen_thumb_arcanist,
        # Ranger
        'thumb_archetype_sharpshooter.png': gen_thumb_sharpshooter,
        'thumb_archetype_shadowstalker.png': gen_thumb_shadowstalker,
        'thumb_archetype_beastmaster.png': gen_thumb_beastmaster,
        # Artisan
        'thumb_archetype_blacksmith.png': gen_thumb_blacksmith,
        'thumb_archetype_alchemist.png': gen_thumb_alchemist,
        'thumb_archetype_enchanter.png': gen_thumb_enchanter,
    }
    for name, fn in thumbs.items():
        write_png(os.path.join(SELECT_DIR, name), fn())

    # 3. Feature banner (630x500)
    print('\n── Feature Banner (630x500) ──')
    write_png(os.path.join(MARKETING_DIR, 'banner_feature_v130.png'), gen_feature_banner())

    print('\nDone! Generated 17 assets for PIX-427.')


if __name__ == '__main__':
    main()
