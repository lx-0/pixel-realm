#!/usr/bin/env python3
"""
Generate hardcore mode art assets for PixelRealm (PIX-281).
Uses only Python stdlib (struct + zlib) — no PIL required.
Follows the master 32-color palette exactly.

Assets produced:
  UI icons (16×16 each):
    icon_hardcore_skull.png       — Skull icon for hardcore toggle
    ui_badge_permadeath.png       — Permadeath badge/border
    icon_hc_crown.png             — Hardcore crown for leaderboard
    icon_cod_sword.png            — Cause-of-death: melee
    icon_cod_fire.png             — Cause-of-death: fire
    icon_cod_poison.png           — Cause-of-death: poison
    icon_cod_boss.png             — Cause-of-death: boss
    icon_cod_fall.png             — Cause-of-death: fall

  Leaderboard rank badges (16×16 each):
    ui_hc_rank_1.png              — Rank 1 skull badge (gold)
    ui_hc_rank_2.png              — Rank 2 skull badge (silver)
    ui_hc_rank_3.png              — Rank 3 skull badge (bronze)

  Panels / banners:
    ui_rip_banner.png             — RIP banner (64×32)
    ui_hc_title_frame.png         — Cosmetic title frame (48×16)
    ui_hc_nameplate.png           — Cosmetic nameplate border (48×12)
    ui_panel_death_recap.png      — Death recap panel background (160×120)

  Sprites:
    sprite_gravestone.png         — Gravestone world marker (16×24)

  VFX spritesheets:
    vfx_hc_death.png              — Death effect (32×32, 6 frames = 192×32)
    vfx_hc_glow.png               — Hardcore character glow (16×16, 4 frames = 64×16)
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
OUT_DIR = os.path.join(SCRIPT_DIR, '..', 'public', 'assets')
ART_DIR = os.path.join(SCRIPT_DIR, '..', 'assets')
ART_UI = os.path.join(ART_DIR, 'ui', 'hardcore')
ART_ICONS = os.path.join(ART_DIR, 'ui', 'icons')
ART_PANELS = os.path.join(ART_DIR, 'ui', 'panels')
ART_VFX = os.path.join(ART_DIR, 'vfx')
ART_SPRITES = os.path.join(ART_DIR, 'sprites')

for d in [OUT_DIR, ART_UI, ART_ICONS, ART_PANELS, ART_VFX, ART_SPRITES]:
    os.makedirs(d, exist_ok=True)

# ─── Palette (RGBA tuples) — master 32-color palette ─────────────────────────

_ = (0, 0, 0, 0)          # transparent

# Neutrals
K  = (13,  13,  13,  255)   # shadow black / outline
DK = (43,  43,  43,  255)   # dark rock
ST = (74,  74,  74,  255)   # stone gray
MG = (110, 110, 110, 255)   # mid gray
LS = (150, 150, 150, 255)   # light stone
PG = (200, 200, 200, 255)   # pale gray
NW = (240, 240, 240, 255)   # near white

# Warm earth
BD = (59,  32,  16,  255)   # deep soil
BN = (107, 58,  31,  255)   # rich earth
DT = (139, 92,  42,  255)   # dirt / wood
SN = (184, 132, 63,  255)   # sand / light wood
DS = (212, 168, 90,  255)   # desert gold
PS = (232, 208, 138, 255)   # pale sand

# Greens
DF = (26,  58,  26,  255)   # deep forest
FG = (45,  110, 45,  255)   # forest green
LG = (76,  155, 76,  255)   # leaf green
BG = (120, 200, 120, 255)   # bright grass

# Cyan / blue
OC = (10,  26,  58,  255)   # deep ocean
DP = (26,  74,  138, 255)   # ocean blue
SB = (42,  122, 192, 255)   # sky blue
PB = (80,  168, 232, 255)   # player blue
HB = (144, 208, 248, 255)   # ice / highlight
IW = (200, 240, 255, 255)   # shimmer

# Red / enemy / fire
DB = (90,  10,  10,  255)   # deep blood
ER = (160, 16,  16,  255)   # enemy red
BR = (212, 32,  32,  255)   # bright red
FR = (240, 96,  32,  255)   # fire orange
EM = (248, 160, 96,  255)   # ember

# Yellow / gold
DG = (168, 112, 0,   255)   # dark gold
GD = (232, 184, 0,   255)   # gold
YL = (255, 224, 64,  255)   # bright yellow
PY = (255, 248, 160, 255)   # pale highlight

# Purple / magic
PM = (26,  10,  58,  255)   # deep magic
MP = (90,  32,  160, 255)   # magic purple
MV = (144, 80,  224, 255)   # mana violet
SG = (208, 144, 255, 255)   # spell glow


# ─── PNG writer ──────────────────────────────────────────────────────────────

def _make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    payload = chunk_type + data
    crc = zlib.crc32(payload) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)


def write_png(path: str, pixels: list) -> None:
    height = len(pixels)
    width = len(pixels[0])
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
    print(f'  wrote {os.path.relpath(path)}  ({width}x{height})')


# ─── Pixel helpers ───────────────────────────────────────────────────────────

def blank(w, h, fill=None):
    fill = fill or _
    return [[fill] * w for __ in range(h)]


def hstack(frames):
    result = []
    for r in range(len(frames[0])):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result


def rect(grid, x, y, w, h, color):
    for row in range(y, y + h):
        for col in range(x, x + w):
            if 0 <= row < len(grid) and 0 <= col < len(grid[0]):
                grid[row][col] = color


def border_rect(grid, x, y, w, h, color):
    """Draw a 1px outline rectangle."""
    for col in range(x, x + w):
        if 0 <= y < len(grid) and 0 <= col < len(grid[0]):
            grid[y][col] = color
        if 0 <= y + h - 1 < len(grid) and 0 <= col < len(grid[0]):
            grid[y + h - 1][col] = color
    for row in range(y, y + h):
        if 0 <= row < len(grid) and 0 <= x < len(grid[0]):
            grid[row][x] = color
        if 0 <= row < len(grid) and 0 <= x + w - 1 < len(grid[0]):
            grid[row][x + w - 1] = color


def set_px(grid, x, y, color):
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color


def draw_from_map(grid, ox, oy, pixel_map, palette):
    """Draw pixels from a string map. Each char maps to a palette entry."""
    for r, row_str in enumerate(pixel_map):
        for c, ch in enumerate(row_str):
            if ch in palette:
                set_px(grid, ox + c, oy + r, palette[ch])


# ─── 1. Skull icon (16×16) ──────────────────────────────────────────────────
# A recognizable pixel skull in red/dark tones

def make_skull_icon():
    g = blank(16, 16)
    # Skull shape: cream/white skull on dark red background circle
    pal = {
        '.': _, 'k': K, 'd': DB, 'r': ER, 'b': BR,
        'w': NW, 'g': PG, 's': LS, 'm': MG
    }
    skull_map = [
        '................',
        '......kkkk......',
        '....kkwwwwkk....',
        '...kwwwwwwwwk...',
        '...kwwwwwwwwk...',
        '..kwwkwwwwkwwk..',
        '..kwwkwwwwkwwk..',
        '..kwwkwwwwkwwk..',
        '...kwwwwwwwwk...',
        '...kwwwggwwwk...',
        '....kwwwwwwk....',
        '....kkwkwkwk....',
        '.....kwkwkk.....',
        '......kkkk......',
        '................',
        '................',
    ]
    draw_from_map(g, 0, 0, skull_map, pal)
    return g


# ─── 2. Permadeath badge (16×16) ────────────────────────────────────────────
# Red diamond border with skull center

def make_permadeath_badge():
    g = blank(16, 16)
    pal = {
        '.': _, 'k': K, 'r': BR, 'd': ER, 'e': DB,
        'w': NW, 'g': PG, 's': LS
    }
    badge_map = [
        '........k.......',
        '.......krk......',
        '......krrk......',
        '.....krddrk.....',
        '....krdwwdrk....',
        '...krdwwwwdrk...',
        '..krdwkwwkwdrk..',
        '..krdwkwwkwdrk..',
        '...krdwwwwdrk...',
        '....krdwwdrk....',
        '.....krwwrk.....',
        '......krwk......',
        '.......kk.......',
        '................',
        '................',
        '................',
    ]
    draw_from_map(g, 0, 0, badge_map, pal)
    return g


# ─── 3. Cause-of-death icons (16×16 each) ───────────────────────────────────

def make_cod_sword():
    """Sword icon — died to melee."""
    g = blank(16, 16)
    pal = {'.': _, 'k': K, 's': LS, 'w': NW, 'g': MG, 'b': BN, 'd': DT}
    sword_map = [
        '................',
        '..............kk',
        '.............kwk',
        '............kwk.',
        '...........kwk..',
        '..........kwk...',
        '.........kwk....',
        '........kwk.....',
        '.......kwk......',
        '......kwk.......',
        '..k..kwk........',
        '...kkwk.........',
        '...kbdk.........',
        '..kkkkk.........',
        '..k..k..........',
        '................',
    ]
    draw_from_map(g, 0, 0, sword_map, pal)
    return g


def make_cod_fire():
    """Fire icon — died to fire."""
    g = blank(16, 16)
    pal = {'.': _, 'k': K, 'r': BR, 'f': FR, 'e': EM, 'y': YL, 'g': GD}
    fire_map = [
        '................',
        '......k.........',
        '.....ke.........',
        '.....kek..k.....',
        '..k.kfek.ke.....',
        '..kekfek.kek....',
        '.kerkfrkkkfek...',
        '.kerfffrffrek...',
        '.kerrfyfrfrek...',
        '..krrfyffrrek...',
        '..kerrfyfrrek...',
        '...kerffffek....',
        '...kerrfrrk.....',
        '....kerrrek.....',
        '.....kkkkk......',
        '................',
    ]
    draw_from_map(g, 0, 0, fire_map, pal)
    return g


def make_cod_poison():
    """Poison icon — died to poison."""
    g = blank(16, 16)
    pal = {'.': _, 'k': K, 'd': DF, 'f': FG, 'l': LG, 'b': BG}
    poison_map = [
        '................',
        '......kkkk......',
        '.....klllk......',
        '.....klblk......',
        '......kllk......',
        '......kfk.......',
        '......kfk.......',
        '.....kffk.......',
        '....kfffk.......',
        '...kfffk........',
        '...kffk.........',
        '..kfffk.........',
        '..kffffffffffk..',
        '..kdddddddddk..',
        '...kkkkkkkkkk...',
        '................',
    ]
    draw_from_map(g, 0, 0, poison_map, pal)
    return g


def make_cod_boss():
    """Boss skull icon — died to boss."""
    g = blank(16, 16)
    pal = {
        '.': _, 'k': K, 'r': BR, 'e': ER, 'd': DB,
        'y': YL, 'g': GD, 'w': NW, 'p': PG
    }
    boss_map = [
        '......yyyy......',
        '.....ygygyy.....',
        '....kkkkkkkk....',
        '...kwwwwwwwwk...',
        '...kwwwwwwwwk...',
        '..kwwrwwwwrwwk..',
        '..kwwrwwwwrwwk..',
        '..kwwwwwwwwwwk..',
        '...kwwwppwwwk...',
        '...kwwwwwwwwk...',
        '....kwwwwwwk....',
        '....kkwkwkwk....',
        '.....kwkwkk.....',
        '......kkkk......',
        '................',
        '................',
    ]
    draw_from_map(g, 0, 0, boss_map, pal)
    return g


def make_cod_fall():
    """Fall icon — died to falling."""
    g = blank(16, 16)
    pal = {'.': _, 'k': K, 's': ST, 'm': MG, 'l': LS, 'b': PB, 'w': NW}
    fall_map = [
        '................',
        '......kk........',
        '.....kbbk.......',
        '.....kbbk.......',
        '......kk........',
        '.....kwwk.......',
        '..k.kkwwkk......',
        '..kk..kwk.......',
        '......kwk.......',
        '.....kwkwk......',
        '....kwk.kwk.....',
        '...kk....kk.....',
        '................',
        '..kssssssssk....',
        '..kmmmmmmmsk....',
        '..kkkkkkkkkk....',
    ]
    draw_from_map(g, 0, 0, fall_map, pal)
    return g


# ─── 4. Hardcore leaderboard rank badges (16×16 each) ───────────────────────

def make_rank_badge(accent1, accent2, highlight):
    """Skull-themed rank badge with colored accent."""
    g = blank(16, 16)
    pal = {
        '.': _, 'k': K, 'a': accent1, 'b': accent2, 'h': highlight,
        'w': NW, 'g': PG, 's': LS
    }
    badge_map = [
        '....kaaaak......',
        '...kabbbhak.....',
        '...kahhhbak.....',
        '....kaaaak......',
        '....kwwwwk......',
        '...kwwwwwwk.....',
        '...kwwwwwwk.....',
        '..kwkwwwwkwk....',
        '..kwkwwwwkwk....',
        '...kwwwwwwk.....',
        '...kwwggwwk.....',
        '....kwwwwk......',
        '....kwkwkk......',
        '.....kkkk.......',
        '................',
        '................',
    ]
    draw_from_map(g, 0, 0, badge_map, pal)
    return g


# ─── 5. Hardcore crown (16×16) ──────────────────────────────────────────────

def make_hc_crown():
    g = blank(16, 16)
    pal = {
        '.': _, 'k': K, 'r': BR, 'e': ER, 'd': DB,
        'g': GD, 'y': YL, 'p': PY
    }
    crown_map = [
        '................',
        '................',
        '..k..k..k..k....',
        '..ke.kr.kg.k....',
        '..kek.krk.kgk...',
        '..kekrkrkrkgk...',
        '..kererrrrrgk...',
        '...kerrrrrrk....',
        '...kerrrrrrk....',
        '...kggggggggk...',
        '...kyyyyyyyyk...',
        '...kggggggggk...',
        '....kkkkkkkk....',
        '................',
        '................',
        '................',
    ]
    draw_from_map(g, 0, 0, crown_map, pal)
    return g


# ─── 6. RIP banner (64×32) ──────────────────────────────────────────────────

def make_rip_banner():
    g = blank(64, 32)
    # Dark panel with red border and "RIP" text
    rect(g, 0, 0, 64, 32, K)
    rect(g, 1, 1, 62, 30, DB)
    rect(g, 2, 2, 60, 28, K)
    rect(g, 3, 3, 58, 26, DK)

    # Red top/bottom accent lines
    rect(g, 3, 3, 58, 1, ER)
    rect(g, 3, 28, 58, 1, ER)

    # "R" at x=12, y=8 (pixel font, 10x14 area)
    r_pixels = [
        (12, 8), (13, 8), (14, 8), (15, 8), (16, 8),
        (12, 9), (16, 9),
        (12, 10), (16, 10),
        (12, 11), (16, 11),
        (12, 12), (13, 12), (14, 12), (15, 12),
        (12, 13), (15, 13),
        (12, 14), (16, 14),
        (12, 15), (16, 15),
        (12, 16), (17, 16),
        (12, 17), (17, 17),
        (12, 18), (18, 18),
    ]
    for px, py in r_pixels:
        set_px(g, px, py, BR)

    # "I" at x=25, y=8
    i_pixels = [
        (24, 8), (25, 8), (26, 8), (27, 8), (28, 8),
        (26, 9), (26, 10), (26, 11), (26, 12), (26, 13),
        (26, 14), (26, 15), (26, 16), (26, 17),
        (24, 18), (25, 18), (26, 18), (27, 18), (28, 18),
    ]
    for px, py in i_pixels:
        set_px(g, px, py, BR)

    # "P" at x=35, y=8
    p_pixels = [
        (35, 8), (36, 8), (37, 8), (38, 8), (39, 8),
        (35, 9), (39, 9),
        (35, 10), (39, 10),
        (35, 11), (39, 11),
        (35, 12), (36, 12), (37, 12), (38, 12),
        (35, 13), (35, 14), (35, 15), (35, 16), (35, 17), (35, 18),
    ]
    for px, py in p_pixels:
        set_px(g, px, py, BR)

    # Small skulls in bottom corners
    for ox in [5, 52]:
        set_px(g, ox, 22, LS)
        set_px(g, ox + 1, 22, LS)
        set_px(g, ox, 23, MG)
        set_px(g, ox + 1, 23, MG)
        set_px(g, ox, 24, LS)
        set_px(g, ox + 1, 24, K)

    return g


# ─── 7. Title frame (48×16) ─────────────────────────────────────────────────

def make_hc_title_frame():
    g = blank(48, 16)
    # Dark panel with red accent borders — cosmetic nameplate for HC survivors
    rect(g, 0, 0, 48, 16, K)
    rect(g, 1, 1, 46, 14, DK)
    border_rect(g, 2, 2, 44, 12, ER)
    rect(g, 3, 3, 42, 10, DB)
    # Corner skulls (2x2 each)
    for ox in [4, 42]:
        set_px(g, ox, 5, NW)
        set_px(g, ox + 1, 5, NW)
        set_px(g, ox, 6, LS)
        set_px(g, ox + 1, 6, LS)
    # Red diamond accents along top
    for cx in [12, 24, 36]:
        set_px(g, cx, 4, BR)
        set_px(g, cx - 1, 5, ER)
        set_px(g, cx, 5, BR)
        set_px(g, cx + 1, 5, ER)
        set_px(g, cx, 6, BR)
    return g


# ─── 8. Nameplate border (48×12) ────────────────────────────────────────────

def make_hc_nameplate():
    g = blank(48, 12)
    rect(g, 0, 0, 48, 12, K)
    rect(g, 1, 1, 46, 10, PM)
    border_rect(g, 2, 2, 44, 8, MP)
    rect(g, 3, 3, 42, 6, PM)
    # Purple accent dots
    for cx in [8, 16, 24, 32, 40]:
        set_px(g, cx, 5, MV)
        set_px(g, cx, 6, SG)
    return g


# ─── 9. Death recap panel (160×120) ─────────────────────────────────────────

def make_death_recap_panel():
    g = blank(160, 120)
    # Dark background with red border
    rect(g, 0, 0, 160, 120, K)
    rect(g, 1, 1, 158, 118, DB)
    rect(g, 2, 2, 156, 116, K)
    rect(g, 3, 3, 154, 114, DK)
    # Red header bar
    rect(g, 3, 3, 154, 12, ER)
    rect(g, 3, 3, 154, 1, BR)
    # Divider line
    rect(g, 6, 18, 148, 1, ST)
    # Content area (dark)
    rect(g, 6, 20, 148, 92, K)
    rect(g, 7, 21, 146, 90, DK)
    # Bottom accent
    rect(g, 3, 115, 154, 1, ER)
    return g


# ─── 10. Gravestone sprite (16×24) ──────────────────────────────────────────

def make_gravestone():
    g = blank(16, 24)
    pal = {
        '.': _, 'k': K, 's': ST, 'm': MG, 'l': LS,
        'g': PG, 'd': DK, 'f': DF, 'e': FG
    }
    stone_map = [
        '................',
        '......kkkk......',
        '.....kssslk.....',
        '....ksssslk.....',
        '....ksslslk.....',
        '...kssssslk.....',
        '...ksssssslk....',
        '...ksslssssk....',
        '...ksssssssk....',
        '...kssskssk.....',
        '...ksskkssk.....',
        '...ksskssk......',
        '...kssssssk.....',
        '...ksssssk......',
        '...kssmmssk.....',
        '...ksssssk......',
        '...ksssssk......',
        '...ksssssk......',
        '..kksssskk......',
        '..kddddddk......',
        '..kffffffk......',
        '.keffffffek.....',
        '.keeeeeeeek.....',
        '................',
    ]
    draw_from_map(g, 0, 0, stone_map, pal)
    # Add a small cross on the gravestone
    set_px(g, 7, 6, MG)
    set_px(g, 8, 6, MG)
    set_px(g, 7, 7, MG)
    set_px(g, 8, 7, MG)
    set_px(g, 6, 7, MG)
    set_px(g, 9, 7, MG)
    set_px(g, 7, 8, MG)
    set_px(g, 8, 8, MG)
    set_px(g, 7, 9, MG)
    set_px(g, 8, 9, MG)
    set_px(g, 7, 10, MG)
    set_px(g, 8, 10, MG)
    return g


# ─── 11. Death VFX spritesheet (32×32, 6 frames = 192×32) ──────────────────

def make_death_vfx():
    frames = []
    for i in range(6):
        f = blank(32, 32)
        cx, cy = 15, 15
        # Expanding red/dark burst — each frame larger
        r = 2 + i * 2
        # Draw concentric rings
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                dist = (dx * dx + dy * dy) ** 0.5
                x, y = cx + dx, cy + dy
                if dist <= r and dist > r - 2:
                    if i < 2:
                        set_px(f, x, y, BR)
                    elif i < 4:
                        set_px(f, x, y, ER)
                    else:
                        set_px(f, x, y, DB)
                elif dist <= r - 2 and dist > r - 3 and i > 0:
                    if i < 3:
                        set_px(f, x, y, ER)
                    else:
                        set_px(f, x, y, K)

        # Central skull fade-in on frame 2+
        if i >= 2:
            alpha = min(255, 80 + (i - 2) * 60)
            sk = (NW[0], NW[1], NW[2], alpha)
            dk_a = (K[0], K[1], K[2], alpha)
            # Tiny 6x5 skull at center
            skull_tiny = [
                [_, sk, sk, sk, sk, _],
                [sk, dk_a, sk, sk, dk_a, sk],
                [sk, sk, sk, sk, sk, sk],
                [_, sk, dk_a, dk_a, sk, _],
                [_, _, sk, sk, _, _],
            ]
            for sy, srow in enumerate(skull_tiny):
                for sx, spx in enumerate(srow):
                    if spx != _:
                        set_px(f, cx - 2 + sx, cy - 2 + sy, spx)

        # Scattered ember particles
        import random
        rng = random.Random(42 + i)
        for _ in range(3 + i * 2):
            px = rng.randint(cx - r - 2, cx + r + 2)
            py = rng.randint(cy - r - 2, cy + r + 2)
            colors = [EM, FR, BR, ER]
            set_px(f, px, py, colors[rng.randint(0, 3)])

        frames.append(f)
    return hstack(frames)


# ─── 12. Hardcore glow VFX (16×16, 4 frames = 64×16) ────────────────────────

def make_hc_glow():
    frames = []
    for i in range(4):
        f = blank(16, 16)
        cx, cy = 7, 7
        # Subtle pulsing red/purple glow outline
        r_base = 5
        phase = [0, 1, 2, 1][i]  # pulsing pattern
        r = r_base + phase
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                dist = (dx * dx + dy * dy) ** 0.5
                x, y = cx + dx, cy + dy
                if r - 1.5 < dist <= r:
                    alpha = max(40, 180 - phase * 30)
                    if (dx + dy) % 2 == 0:
                        set_px(f, x, y, (BR[0], BR[1], BR[2], alpha))
                    else:
                        set_px(f, x, y, (MV[0], MV[1], MV[2], alpha))
                elif r - 2.5 < dist <= r - 1.5:
                    alpha = max(20, 100 - phase * 20)
                    set_px(f, x, y, (ER[0], ER[1], ER[2], alpha))
        frames.append(f)
    return hstack(frames)


# ─── Write all assets ────────────────────────────────────────────────────────

def dual_write(subdir_art, subdir_pub, filename, pixels):
    """Write asset to both assets/ (source) and public/assets/ (runtime)."""
    art_path = os.path.join(subdir_art, filename)
    write_png(art_path, pixels)
    # Also write to public for game runtime
    pub_dir = os.path.join(OUT_DIR, os.path.relpath(subdir_art, ART_DIR))
    os.makedirs(pub_dir, exist_ok=True)
    write_png(os.path.join(pub_dir, filename), pixels)


def main():
    print('Generating hardcore mode assets (PIX-281)...\n')

    # ── Icons ──
    print('Icons:')
    dual_write(ART_ICONS, OUT_DIR, 'icon_hardcore_skull.png', make_skull_icon())
    dual_write(ART_UI, OUT_DIR, 'ui_badge_permadeath.png', make_permadeath_badge())
    dual_write(ART_ICONS, OUT_DIR, 'icon_hc_crown.png', make_hc_crown())

    # Cause of death icons
    print('\nCause-of-death icons:')
    dual_write(ART_ICONS, OUT_DIR, 'icon_cod_sword.png', make_cod_sword())
    dual_write(ART_ICONS, OUT_DIR, 'icon_cod_fire.png', make_cod_fire())
    dual_write(ART_ICONS, OUT_DIR, 'icon_cod_poison.png', make_cod_poison())
    dual_write(ART_ICONS, OUT_DIR, 'icon_cod_boss.png', make_cod_boss())
    dual_write(ART_ICONS, OUT_DIR, 'icon_cod_fall.png', make_cod_fall())

    # Leaderboard rank badges
    print('\nLeaderboard rank badges:')
    dual_write(ART_UI, OUT_DIR, 'ui_hc_rank_1.png', make_rank_badge(GD, YL, PY))   # gold
    dual_write(ART_UI, OUT_DIR, 'ui_hc_rank_2.png', make_rank_badge(LS, PG, NW))    # silver
    dual_write(ART_UI, OUT_DIR, 'ui_hc_rank_3.png', make_rank_badge(DT, SN, DS))    # bronze

    # Panels / banners
    print('\nPanels & banners:')
    dual_write(ART_UI, OUT_DIR, 'ui_rip_banner.png', make_rip_banner())
    dual_write(ART_UI, OUT_DIR, 'ui_hc_title_frame.png', make_hc_title_frame())
    dual_write(ART_UI, OUT_DIR, 'ui_hc_nameplate.png', make_hc_nameplate())
    dual_write(ART_PANELS, OUT_DIR, 'ui_panel_death_recap.png', make_death_recap_panel())

    # Sprites
    print('\nSprites:')
    dual_write(ART_SPRITES, OUT_DIR, 'sprite_gravestone.png', make_gravestone())

    # VFX
    print('\nVFX spritesheets:')
    dual_write(ART_VFX, OUT_DIR, 'vfx_hc_death.png', make_death_vfx())
    dual_write(ART_VFX, OUT_DIR, 'vfx_hc_glow.png', make_hc_glow())

    print('\nDone! All hardcore mode assets generated.')


if __name__ == '__main__':
    main()
