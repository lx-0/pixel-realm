#!/usr/bin/env python3
"""
Generate fall/autumn seasonal event art pack for PixelRealm (PIX-264).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md exactly:
  - 32-color master palette, SNES-era RPG style
  - Nearest-neighbor pixel art, no anti-aliasing
  - Naming convention: {category}_{name}_{variant}.{ext}

Outputs:
  -- Fall Event Enemies (128×16 horizontal strips, 8 frames × 16px) --
  assets/sprites/enemies/event/char_enemy_harvest_golem.png   (small 12×12 centered in 16×16)
  assets/sprites/enemies/event/char_enemy_scarecrow_shade.png (small 12×12 centered in 16×16)
  assets/sprites/enemies/event/char_enemy_pumpkin_wraith.png  (small 12×12 centered in 16×16)
  assets/sprites/enemies/event/char_enemy_maple_treant.png    (small 12×12 centered in 16×16)

  -- Fall Event Boss: Harvest King (256×32, 8 frames × 32px) --
  assets/sprites/enemies/event/char_enemy_boss_harvest_king.png

  -- Fall Decoration Tileset (128×48, 8×3 tiles of 16×16) --
  assets/tiles/tilesets/tileset_seasonal_fall.png

  -- Fall Reward Item Sprites (16×16 each) --
  assets/sprites/pickups/icon_reward_fall_harvest_scythe.png
  assets/sprites/pickups/icon_reward_fall_autumn_crown.png
  assets/sprites/pickups/icon_reward_fall_leaf_cloak.png
  assets/sprites/pickups/icon_reward_fall_acorn_amulet.png
  assets/sprites/pickups/icon_reward_fall_pumpkin_shield.png
  assets/sprites/pickups/icon_reward_fall_season_coin.png

  -- Fall Event Banner (128×48) --
  assets/ui/seasonal/ui_seasonal_banner_fall_event.png

  -- Fall Event UI Decorations (16×16 each) --
  assets/ui/seasonal/ui_fall_decor_corner.png
  assets/ui/seasonal/ui_fall_decor_divider.png

  -- Fall Character Overlay --
  assets/sprites/characters/char_overlay_hat_fall.png
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
PROJ_DIR = os.path.join(SCRIPT_DIR, '..')

# Output directories
ENEMY_EVENT_DIR = os.path.join(PROJ_DIR, 'assets', 'sprites', 'enemies', 'event')
TILESET_DIR = os.path.join(PROJ_DIR, 'assets', 'tiles', 'tilesets')
PICKUP_DIR = os.path.join(PROJ_DIR, 'assets', 'sprites', 'pickups')
SEASONAL_UI_DIR = os.path.join(PROJ_DIR, 'assets', 'ui', 'seasonal')
CHARACTER_DIR = os.path.join(PROJ_DIR, 'assets', 'sprites', 'characters')

for d in [ENEMY_EVENT_DIR, TILESET_DIR, PICKUP_DIR, SEASONAL_UI_DIR, CHARACTER_DIR]:
    os.makedirs(d, exist_ok=True)

# ─── Palette (RGBA tuples) — from ART-STYLE-GUIDE.md ────────────────────────

_ = (0, 0, 0, 0)          # transparent

# Neutrals
K   = (13,  13,  13,  255)  # shadow black / outline
DK  = (43,  43,  43,  255)  # dark rock
ST  = (74,  74,  74,  255)  # stone gray
MG  = (110, 110, 110, 255)  # mid gray
LS  = (150, 150, 150, 255)  # light stone
PG  = (200, 200, 200, 255)  # pale gray
NW  = (240, 240, 240, 255)  # near white

# Warm earth
BD  = (59,  32,  16,  255)  # deep soil
BN  = (107, 58,  31,  255)  # rich earth
DT  = (139, 92,  42,  255)  # dirt
SN  = (184, 132, 63,  255)  # sand
DS  = (212, 168, 90,  255)  # desert gold
PS  = (232, 208, 138, 255)  # pale sand

# Greens
DF  = (26,  58,  26,  255)  # deep forest
FG  = (45,  110, 45,  255)  # forest green
LG  = (76,  155, 76,  255)  # leaf green
BG  = (120, 200, 120, 255)  # bright grass
FL  = (168, 228, 160, 255)  # light foliage

# Cyan / blue
OC  = (10,  26,  58,  255)  # deep ocean
DP  = (26,  74,  138, 255)  # ocean blue
SB  = (42,  122, 192, 255)  # sky blue
PB  = (80,  168, 232, 255)  # player blue
HB  = (144, 208, 248, 255)  # ice / pale water
IW  = (200, 240, 255, 255)  # ice white / shimmer

# Red / orange
DB  = (90,  10,  10,  255)  # deep blood
ER  = (160, 16,  16,  255)  # enemy red
BR  = (212, 32,  32,  255)  # bright red
FR  = (240, 96,  32,  255)  # fire orange
EM  = (248, 160, 96,  255)  # ember

# Yellow / gold
DG  = (168, 112, 0,   255)  # dark gold
GD  = (232, 184, 0,   255)  # gold
YL  = (255, 224, 64,  255)  # bright yellow
PY  = (255, 248, 160, 255)  # pale highlight

# Purple / magic
PM  = (26,  10,  58,  255)  # deep magic
MP  = (90,  32,  160, 255)  # magic purple
MV  = (144, 80,  224, 255)  # mana violet
SG  = (208, 144, 255, 255)  # spell glow

# ─── Fall-specific color shortcuts ───────────────────────────────────────────
# Fall uses warm oranges, deep reds, golden yellows, earthy browns
# Leaf fire: FR (fire orange), EM (ember), BR (bright red), ER (enemy red)
# Harvest gold: GD (gold), DG (dark gold), YL (bright yellow)
# Bark/earth: BD (deep soil), BN (rich earth), DT (dirt), SN (sand)
AL  = FR   # autumn leaf (orange)
AR  = ER   # autumn red (deep)
AE  = EM   # autumn ember (warm glow)
HG  = GD   # harvest gold
AW  = DT   # autumn wood
AB  = BN   # autumn bark

# ─── PNG writer ──────────────────────────────────────────────────────────────

def _make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    payload = chunk_type + data
    crc = zlib.crc32(payload) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)

def write_png(path: str, pixels: list) -> None:
    """Write a list-of-rows of (R,G,B,A) tuples as a PNG file."""
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

# ─── Sprite helpers ──────────────────────────────────────────────────────────

def blank(w, h, fill=None):
    fill = fill or _
    return [[fill]*w for __ in range(h)]

def set_px(grid, x, y, color):
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color

def fill_rect(grid, x, y, w, h, color):
    for dy in range(h):
        for dx in range(w):
            set_px(grid, x + dx, y + dy, color)

def draw_rect_outline(grid, x, y, w, h, color):
    for dx in range(w):
        set_px(grid, x + dx, y, color)
        set_px(grid, x + dx, y + h - 1, color)
    for dy in range(h):
        set_px(grid, x, y + dy, color)
        set_px(grid, x + w - 1, y + dy, color)

def hstack(frames):
    """Horizontally stack list of same-height pixel grids."""
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result

def vstack(frames):
    """Vertically stack list of same-width pixel grids."""
    result = []
    for f in frames:
        result.extend([row[:] for row in f])
    return result

def copy_grid(src):
    return [row[:] for row in src]

def mirror_h(src):
    return [row[::-1] for row in src]


# ═══════════════════════════════════════════════════════════════════════════════
# ENEMY 1: HARVEST GOLEM — animated grain/wheat construct, 16×16, 8 frames
# Frames 0-3: idle sway, Frames 4-7: attack (grain lash)
# Color: wheat body (SN/DS/PS), brown core (BN/DT), red eyes (BR)
# ═══════════════════════════════════════════════════════════════════════════════

def make_harvest_golem():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, 0, -1, 0][anim] if not is_attack else 0
        slam = [0, 1, 2, 1][anim] if is_attack else 0

        # Feet (bundled wheat base)
        set_px(g, 5, 14 + bob, DT)
        set_px(g, 6, 14 + bob, SN)
        set_px(g, 9, 14 + bob, SN)
        set_px(g, 10, 14 + bob, DT)
        set_px(g, 5, 15, BN)
        set_px(g, 6, 15, BN)
        set_px(g, 9, 15, BN)
        set_px(g, 10, 15, BN)

        # Body (bundled grain stalks, golden/wheat colored)
        for dy in range(7, 14 + bob):
            set_px(g, 5, dy, BN)
            set_px(g, 6, dy, DS)
            set_px(g, 7, dy, SN)
            set_px(g, 8, dy, SN)
            set_px(g, 9, dy, DS)
            set_px(g, 10, dy, BN)
        # Body highlights (golden grain shimmer)
        set_px(g, 7, 9 + bob, PS)
        set_px(g, 8, 10 + bob, YL)

        # Arms (grain whip tendrils)
        if not is_attack:
            arm_y = 10 + bob + [0, 0, -1, 0][anim]
            set_px(g, 3, arm_y, DS)
            set_px(g, 4, arm_y, SN)
            set_px(g, 11, arm_y, SN)
            set_px(g, 12, arm_y, DS)
            set_px(g, 2, arm_y - 1, PS)
            set_px(g, 13, arm_y - 1, PS)
        else:
            # Grain lash — arms extend forward
            arm_y = 10
            set_px(g, 3, arm_y, SN)
            set_px(g, 4, arm_y, DS)
            set_px(g, 11, arm_y, DS)
            set_px(g, 12, arm_y, SN)
            sy = arm_y + slam
            set_px(g, 2, sy, PS)
            set_px(g, 13, sy, PS)
            if slam >= 2:
                set_px(g, 1, sy, YL)   # grain spark
                set_px(g, 14, sy, YL)

        # Head (wheat sheaf crown)
        set_px(g, 6, 5 + bob, DT)
        set_px(g, 7, 5 + bob, DS)
        set_px(g, 8, 5 + bob, DS)
        set_px(g, 9, 5 + bob, DT)
        set_px(g, 6, 4 + bob, SN)
        set_px(g, 7, 4 + bob, PS)
        set_px(g, 8, 4 + bob, PS)
        set_px(g, 9, 4 + bob, SN)
        # Wheat stalks on top
        set_px(g, 7, 3 + bob, DS)
        set_px(g, 8, 3 + bob, DS)
        set_px(g, 6, 2 + bob, SN)
        set_px(g, 9, 2 + bob, SN)

        # Eyes (enemy red)
        set_px(g, 7, 5 + bob, BR)
        set_px(g, 8, 5 + bob, BR)

        # Grain particles drifting
        particle_sets = [
            [(3, 6), (12, 8)],
            [(4, 5), (11, 9)],
            [(3, 8), (12, 6)],
            [(4, 7), (11, 7)],
        ]
        for px, py in particle_sets[anim]:
            set_px(g, px, py + bob, PS)

        # Outline key pixels
        set_px(g, 6, 2 + bob, K)
        set_px(g, 9, 2 + bob, K)
        set_px(g, 4, 7 + bob, K)
        set_px(g, 11, 7 + bob, K)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_harvest_golem.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# ENEMY 2: SCARECROW SHADE — eerie floating scarecrow, 16×16, 8 frames
# Frames 0-3: idle sway (cloth fluttering), Frames 4-7: attack (shadow lunge)
# Color: dark cloth (BD/DK), straw (DS/SN), glowing red eyes (BR/ER)
# ═══════════════════════════════════════════════════════════════════════════════

def make_scarecrow_shade():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, -1, -1, 0][anim]

        # Post body (dark tattered cloth)
        for dy in range(7, 15):
            set_px(g, 7, dy + bob, DK)
            set_px(g, 8, dy + bob, BD)

        # Cross beam (arms / scarecrow T-shape)
        arm_sway = [-1, 0, 1, 0][anim]
        for dx in range(-3, 4):
            ax = 7 + dx
            set_px(g, ax, 8 + bob, DT)

        # Tattered cloth hanging from arms
        cloth_wave = [0, 1, 0, -1][anim]
        # Left cloth
        set_px(g, 4, 9 + bob + cloth_wave, DK)
        set_px(g, 4, 10 + bob + cloth_wave, BD)
        set_px(g, 3, 10 + bob + cloth_wave, DK)
        # Right cloth
        set_px(g, 11, 9 + bob - cloth_wave, DK)
        set_px(g, 11, 10 + bob - cloth_wave, BD)
        set_px(g, 12, 10 + bob - cloth_wave, DK)

        # Straw poking out of sleeves/body
        set_px(g, 3, 8 + bob, DS)
        set_px(g, 12, 8 + bob, DS)
        set_px(g, 7, 14 + bob, SN)
        set_px(g, 8, 14 + bob, DS)

        # Head (sack head with stitched face)
        set_px(g, 6, 5 + bob, BD)
        set_px(g, 7, 5 + bob, DT)
        set_px(g, 8, 5 + bob, DT)
        set_px(g, 9, 5 + bob, BD)
        set_px(g, 6, 4 + bob, DT)
        set_px(g, 7, 4 + bob, SN)
        set_px(g, 8, 4 + bob, SN)
        set_px(g, 9, 4 + bob, DT)
        # Top of head (pointed)
        set_px(g, 7, 3 + bob, DT)
        set_px(g, 8, 3 + bob, BD)

        # Hat (floppy scarecrow hat)
        set_px(g, 5, 3 + bob, BD)
        set_px(g, 6, 3 + bob, DK)
        set_px(g, 9, 3 + bob, DK)
        set_px(g, 10, 3 + bob, BD)
        set_px(g, 6, 2 + bob, BD)
        set_px(g, 7, 2 + bob, DK)
        set_px(g, 8, 2 + bob, DK)
        set_px(g, 9, 2 + bob, BD)

        # Glowing eyes (enemy red, sinister)
        set_px(g, 7, 4 + bob, BR)
        set_px(g, 8, 4 + bob, ER)

        # Stitched mouth
        set_px(g, 7, 5 + bob, K)
        set_px(g, 8, 5 + bob, K)

        if is_attack:
            # Shadow lunge — dark tendrils extend
            lunge_len = [1, 2, 3, 2][anim]
            for ld in range(1, lunge_len + 1):
                set_px(g, 7, 14 + bob + ld, DK)
                set_px(g, 8, 14 + bob + ld, K)
            if lunge_len >= 2:
                set_px(g, 6, 14 + bob + lunge_len, DK)
                set_px(g, 9, 14 + bob + lunge_len, DK)

        # Shadow wisps
        wisp_sets = [
            [(5, 12), (10, 11)],
            [(4, 11), (11, 12)],
            [(5, 11), (10, 12)],
            [(4, 12), (11, 11)],
        ]
        for wx, wy in wisp_sets[anim]:
            set_px(g, wx, wy + bob, DK)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_scarecrow_shade.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# ENEMY 3: PUMPKIN WRAITH — floating jack-o-lantern ghost, 16×16, 8 frames
# Frames 0-3: idle float/bob, Frames 4-7: attack (fire breath)
# Color: orange pumpkin (FR/EM), green stem (FG/DF), fire glow (YL/GD)
# ═══════════════════════════════════════════════════════════════════════════════

def make_pumpkin_wraith():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        # Float bob (ghostly hovering)
        bob = [0, -1, -2, -1][anim]

        # Pumpkin body (round orange mass)
        cy = 8 + bob
        # Core pumpkin shape
        fill_rect(g, 5, cy - 1, 6, 4, FR)
        set_px(g, 4, cy, FR)
        set_px(g, 4, cy + 1, FR)
        set_px(g, 11, cy, FR)
        set_px(g, 11, cy + 1, FR)
        # Pumpkin ridges (darker orange lines)
        set_px(g, 6, cy - 1, EM)
        set_px(g, 9, cy - 1, EM)
        set_px(g, 6, cy + 2, EM)
        set_px(g, 9, cy + 2, EM)
        # Pumpkin highlight
        set_px(g, 7, cy - 1, EM)
        set_px(g, 8, cy - 1, EM)

        # Carved face (glowing yellow)
        # Eyes (triangular)
        set_px(g, 6, cy, YL)
        set_px(g, 7, cy, GD)
        set_px(g, 9, cy, GD)
        set_px(g, 10, cy, YL)
        # Nose
        set_px(g, 8, cy + 1, YL)
        # Mouth (jagged grin)
        set_px(g, 6, cy + 2, GD)
        set_px(g, 7, cy + 2, YL)
        set_px(g, 8, cy + 2, GD)
        set_px(g, 9, cy + 2, YL)
        set_px(g, 10, cy + 2, GD)

        # Stem (green top)
        set_px(g, 7, cy - 2, FG)
        set_px(g, 8, cy - 2, DF)
        set_px(g, 7, cy - 3, DF)

        # Ghost wisp trail below
        trail_y = cy + 3
        for i, dx in enumerate([-1, 0, 1, 2]):
            if (i + anim) % 2 == 0:
                set_px(g, 7 + dx, trail_y, MV)
        set_px(g, 7, trail_y + 1, SG)
        set_px(g, 8, trail_y + 1, MV)

        # Ambient flame flickers
        flicker_sets = [
            [(5, cy - 2), (10, cy + 3)],
            [(4, cy - 1), (11, cy + 2)],
            [(5, cy + 3), (10, cy - 2)],
            [(4, cy + 2), (11, cy - 1)],
        ]
        for fx, fy in flicker_sets[anim]:
            set_px(g, fx, fy, EM)

        if is_attack:
            # Fire breath — flames shoot forward
            fire_len = [1, 2, 3, 2][anim]
            for fd in range(1, fire_len + 1):
                set_px(g, 7 - fd - 2, cy + 1, FR)
                set_px(g, 8 + fd + 3, cy + 1, FR)
                if fd > 1:
                    set_px(g, 7 - fd - 2, cy, YL)
                    set_px(g, 8 + fd + 3, cy + 2, YL)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_pumpkin_wraith.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# ENEMY 4: MAPLE TREANT — walking autumn tree creature, 16×16, 8 frames
# Frames 0-3: idle rustle, Frames 4-7: attack (root sweep)
# Color: brown trunk (BN/DT/BD), red/orange leaves (FR/BR/ER), gold accents (GD)
# ═══════════════════════════════════════════════════════════════════════════════

def make_maple_treant():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, 0, -1, 0][anim] if not is_attack else 0

        # Root feet
        set_px(g, 5, 14, BD)
        set_px(g, 6, 14, BN)
        set_px(g, 6, 15, BD)
        set_px(g, 9, 14, BN)
        set_px(g, 10, 14, BD)
        set_px(g, 9, 15, BD)

        # Trunk body
        for dy in range(8, 14):
            set_px(g, 6, dy + bob, BD)
            set_px(g, 7, dy + bob, BN)
            set_px(g, 8, dy + bob, DT)
            set_px(g, 9, dy + bob, BD)
        # Bark texture
        set_px(g, 7, 10 + bob, DT)
        set_px(g, 8, 12 + bob, BN)

        # Branch arms
        if not is_attack:
            arm_sway = [0, 1, 0, -1][anim]
            # Left branch
            set_px(g, 5, 9 + bob + arm_sway, BN)
            set_px(g, 4, 8 + bob + arm_sway, DT)
            set_px(g, 3, 7 + bob + arm_sway, BN)
            # Right branch
            set_px(g, 10, 9 + bob - arm_sway, BN)
            set_px(g, 11, 8 + bob - arm_sway, DT)
            set_px(g, 12, 7 + bob - arm_sway, BN)
            # Leaf clusters on branch tips
            set_px(g, 2, 6 + bob + arm_sway, FR)
            set_px(g, 3, 6 + bob + arm_sway, BR)
            set_px(g, 13, 6 + bob - arm_sway, FR)
            set_px(g, 12, 6 + bob - arm_sway, ER)
        else:
            # Root sweep — roots extend along ground
            sweep_ext = [1, 2, 3, 2][anim]
            set_px(g, 5, 9 + bob, BN)
            set_px(g, 4, 9 + bob, DT)
            set_px(g, 10, 9 + bob, BN)
            set_px(g, 11, 9 + bob, DT)
            for sx in range(1, sweep_ext + 1):
                set_px(g, 4 - sx, 14, BD)
                set_px(g, 11 + sx, 14, BD)
            if sweep_ext >= 3:
                set_px(g, 1, 13, FR)  # impact spark
                set_px(g, 14, 13, FR)

        # Canopy / leaf crown (autumn colors)
        leaf_colors = [FR, BR, ER, GD]
        set_px(g, 6, 6 + bob, leaf_colors[(0 + anim) % 4])
        set_px(g, 7, 6 + bob, leaf_colors[(1 + anim) % 4])
        set_px(g, 8, 6 + bob, leaf_colors[(2 + anim) % 4])
        set_px(g, 9, 6 + bob, leaf_colors[(3 + anim) % 4])
        set_px(g, 5, 5 + bob, leaf_colors[(1 + anim) % 4])
        set_px(g, 6, 5 + bob, leaf_colors[(2 + anim) % 4])
        set_px(g, 7, 5 + bob, leaf_colors[(3 + anim) % 4])
        set_px(g, 8, 5 + bob, leaf_colors[(0 + anim) % 4])
        set_px(g, 9, 5 + bob, leaf_colors[(1 + anim) % 4])
        set_px(g, 10, 5 + bob, leaf_colors[(2 + anim) % 4])
        set_px(g, 6, 4 + bob, leaf_colors[(3 + anim) % 4])
        set_px(g, 7, 4 + bob, leaf_colors[(0 + anim) % 4])
        set_px(g, 8, 4 + bob, leaf_colors[(1 + anim) % 4])
        set_px(g, 9, 4 + bob, leaf_colors[(2 + anim) % 4])
        set_px(g, 7, 3 + bob, leaf_colors[(2 + anim) % 4])
        set_px(g, 8, 3 + bob, leaf_colors[(3 + anim) % 4])

        # Eyes (glowing in trunk face, enemy red)
        set_px(g, 7, 8 + bob, BR)
        set_px(g, 8, 8 + bob, ER)

        # Falling leaf particles
        leaf_drift = [
            [(3, 12), (12, 10)],
            [(4, 11), (13, 11)],
            [(2, 10), (11, 12)],
            [(3, 11), (12, 11)],
        ]
        for lx, ly in leaf_drift[anim]:
            set_px(g, lx, ly + bob, FR)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_maple_treant.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# BOSS: HARVEST KING — large 32×32, 8 frames
# Frames 0-3: idle (leaves swirl, crown glows), Frames 4-7: attack (vine slam)
# Color: bark body (BD/BN/DT), autumn leaves crown (FR/BR/GD), golden scepter (YL/GD)
# ═══════════════════════════════════════════════════════════════════════════════

def make_harvest_king():
    frames = []
    for f in range(8):
        g = blank(32, 32)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, 0, -1, 0][anim] if not is_attack else 0

        # Earth base (root-covered ground)
        for wx in range(6, 26):
            set_px(g, wx, 30, BD)
            set_px(g, wx, 31, DK)
        for wx in range(4, 28):
            set_px(g, wx, 29, BN)
        # Root tendrils
        root_off = [0, 1, 0, -1][anim]
        set_px(g, 5 + root_off, 29, DT)
        set_px(g, 10 - root_off, 29, BD)
        set_px(g, 20 + root_off, 29, DT)
        set_px(g, 25 - root_off, 29, BD)

        # Main body (thick bark humanoid torso)
        for dy in range(12, 29):
            y = dy + bob
            if y < 0 or y >= 32:
                continue
            body_width = 10 if dy < 20 else 12
            start_x = 16 - body_width // 2
            for dx in range(body_width):
                px = start_x + dx
                if dx == 0 or dx == body_width - 1:
                    set_px(g, px, y, K)
                elif dx == 1 or dx == body_width - 2:
                    set_px(g, px, y, BD)
                else:
                    set_px(g, px, y, BN)

        # Body bark texture rings
        for ty in [14, 18, 22, 26]:
            y = ty + bob
            if 0 <= y < 32:
                set_px(g, 13, y, DT)
                set_px(g, 18, y, DT)

        # Shoulder vine formations
        shoulder_y = 14 + bob
        # Left shoulder vines
        for cx in range(6, 11):
            set_px(g, cx, shoulder_y, DF)
            set_px(g, cx, shoulder_y - 1, FG)
        set_px(g, 5, shoulder_y - 1, LG)
        set_px(g, 5, shoulder_y - 2, FG)
        set_px(g, 6, shoulder_y - 2, DF)
        # Right shoulder vines
        for cx in range(21, 26):
            set_px(g, cx, shoulder_y, DF)
            set_px(g, cx, shoulder_y - 1, FG)
        set_px(g, 26, shoulder_y - 1, LG)
        set_px(g, 26, shoulder_y - 2, FG)
        set_px(g, 25, shoulder_y - 2, DF)

        # Vine arms
        if not is_attack:
            arm_sway = [-1, 0, 1, 0][anim]
            # Left vine arm
            for ay in range(16, 26):
                ax = 10 - (ay - 16) // 2 + arm_sway + bob
                set_px(g, ax, ay + bob, BN)
                set_px(g, ax - 1, ay + bob, BD)
            # Right vine arm
            for ay in range(16, 26):
                ax = 21 + (ay - 16) // 2 - arm_sway + bob
                set_px(g, ax, ay + bob, BN)
                set_px(g, ax + 1, ay + bob, BD)
        else:
            # Vine slam — arms crash down with root extension
            slam_ext = [0, 2, 4, 2][anim]
            # Left arm
            for ay in range(16, 26 + slam_ext):
                ax = 8 if ay < 22 else 7
                y = ay + bob
                if 0 <= y < 32:
                    set_px(g, ax, y, BN)
                    set_px(g, ax - 1, y, BD)
            # Right arm
            for ay in range(16, 26 + slam_ext):
                ax = 23 if ay < 22 else 24
                y = ay + bob
                if 0 <= y < 32:
                    set_px(g, ax, y, BN)
                    set_px(g, ax + 1, y, BD)
            # Leaf burst at impact
            if slam_ext >= 4:
                for sx in [-2, -1, 0, 1, 2]:
                    set_px(g, 7 + sx, 28, FR)
                    set_px(g, 24 + sx, 28, FR)
                set_px(g, 5, 27, EM)
                set_px(g, 26, 27, EM)

        # Face (carved into bark)
        face_y = 16 + bob
        # Eyes (glowing golden amber)
        set_px(g, 14, face_y, GD)
        set_px(g, 15, face_y, YL)
        set_px(g, 17, face_y, YL)
        set_px(g, 18, face_y, GD)
        # Brow (bark ridge)
        set_px(g, 13, face_y - 1, BD)
        set_px(g, 14, face_y - 1, BN)
        set_px(g, 18, face_y - 1, BN)
        set_px(g, 19, face_y - 1, BD)
        # Mouth (dark hollow)
        set_px(g, 15, face_y + 2, K)
        set_px(g, 16, face_y + 2, DK)
        set_px(g, 17, face_y + 2, K)
        if is_attack:
            set_px(g, 15, face_y + 3, K)
            set_px(g, 16, face_y + 3, DK)
            set_px(g, 17, face_y + 3, K)

        # Autumn leaf crown (top of head — swirling fall foliage)
        crown_y = 8 + bob
        leaf_colors = [FR, BR, ER, GD, EM, YL]
        # Central crown structure
        set_px(g, 15, crown_y, GD)
        set_px(g, 16, crown_y, YL)
        set_px(g, 15, crown_y - 1, DG)
        set_px(g, 16, crown_y - 1, GD)
        # Crown leaf ring
        crown_positions = [
            (14, crown_y), (17, crown_y),
            (13, crown_y + 1), (18, crown_y + 1),
            (13, crown_y + 2), (18, crown_y + 2),
            (14, crown_y + 3), (15, crown_y + 3), (16, crown_y + 3), (17, crown_y + 3),
        ]
        for i, (cpx, cpy) in enumerate(crown_positions):
            c = leaf_colors[(i + anim) % len(leaf_colors)]
            set_px(g, cpx, cpy, c)

        # Side leaf sprays on crown
        for sx, sy in [(11, crown_y + 1), (20, crown_y + 1)]:
            set_px(g, sx, sy, GD)
            set_px(g, sx - 1, sy, FR)
            set_px(g, sx + 1, sy, BR)
            set_px(g, sx, sy - 1, EM)
            set_px(g, sx, sy + 1, ER)

        # Golden pumpkin accent on crown top
        set_px(g, 14, crown_y - 2, FR)
        set_px(g, 15, crown_y - 2, EM)
        set_px(g, 16, crown_y - 2, EM)
        set_px(g, 17, crown_y - 2, FR)
        set_px(g, 15, crown_y - 3, GD)
        set_px(g, 16, crown_y - 3, GD)

        # Ambient falling leaves
        leaf_drift = [
            [(5, 8), (22, 12), (10, 4)],
            [(7, 10), (24, 8), (12, 3)],
            [(4, 12), (21, 10), (9, 6)],
            [(6, 7), (23, 14), (11, 5)],
        ]
        for lpx, lpy in leaf_drift[anim]:
            lc = leaf_colors[(lpx + lpy + anim) % len(leaf_colors)]
            set_px(g, lpx, lpy + bob, lc)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_boss_harvest_king.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# FALL DECORATION TILESET — 128×48 (8 columns × 3 rows of 16×16 tiles)
# Row 0: Ground overlays (leaf piles, mushrooms, acorns, puddle, fallen bark)
# Row 1: Vegetation (autumn tree top/trunk, berry bush, wheat, pumpkin vine)
# Row 2: Structures (jack-o-lantern, cornucopia, harvest banner, hay bale, event marker)
# ═══════════════════════════════════════════════════════════════════════════════

def make_fall_tileset():
    tiles = []

    # ── Row 0: Ground overlays ──

    # Tile 0,0: Scattered fallen leaves
    t = blank(16, 16)
    leaf_spots = [(2, 3), (5, 8), (10, 2), (13, 11), (7, 13), (1, 10), (12, 6), (4, 1)]
    leaf_colors = [FR, BR, ER, GD, EM, YL, FR, BR]
    for i, (sx, sy) in enumerate(leaf_spots):
        set_px(t, sx, sy, leaf_colors[i % len(leaf_colors)])
        if i % 2 == 0:
            set_px(t, sx + 1, sy, leaf_colors[(i + 1) % len(leaf_colors)])
    tiles.append(t)

    # Tile 1,0: Dense leaf ground cover
    t = blank(16, 16)
    for y in range(16):
        for x in range(16):
            if (x + y) % 5 == 0:
                set_px(t, x, y, FR)
            elif (x * 3 + y * 7) % 11 == 0:
                set_px(t, x, y, BR)
            elif (x * 5 + y * 3) % 13 == 0:
                set_px(t, x, y, ER)
            elif (x * 2 + y * 5) % 17 == 0:
                set_px(t, x, y, GD)
    tiles.append(t)

    # Tile 2,0: Muddy path with leaves
    t = blank(16, 16)
    # Mud surface
    for y in range(16):
        for x in range(16):
            if (x + y * 3) % 7 == 0:
                set_px(t, x, y, BN)
            elif (x * 2 + y) % 9 == 0:
                set_px(t, x, y, DT)
    # Scattered leaves on mud
    set_px(t, 3, 5, FR)
    set_px(t, 8, 11, BR)
    set_px(t, 12, 3, GD)
    set_px(t, 6, 14, EM)
    # Puddle
    fill_rect(t, 5, 8, 4, 2, ST)
    set_px(t, 6, 8, MG)
    tiles.append(t)

    # Tile 3,0: Acorns on ground
    t = blank(16, 16)
    # Acorn 1
    set_px(t, 5, 7, DT)   # cap
    set_px(t, 6, 7, BN)
    set_px(t, 5, 8, BN)   # nut
    set_px(t, 6, 8, SN)
    set_px(t, 5, 9, DT)
    # Acorn 2
    set_px(t, 10, 10, DT)
    set_px(t, 11, 10, BN)
    set_px(t, 10, 11, BN)
    set_px(t, 11, 11, SN)
    set_px(t, 10, 12, DT)
    # Acorn 3
    set_px(t, 3, 13, DT)
    set_px(t, 3, 14, BN)
    # Leaf near acorn
    set_px(t, 8, 5, FR)
    set_px(t, 13, 4, GD)
    tiles.append(t)

    # Tile 4,0: Mushroom cluster
    t = blank(16, 16)
    # Large mushroom
    fill_rect(t, 5, 7, 4, 2, BR)
    set_px(t, 6, 6, ER)
    set_px(t, 7, 6, BR)
    set_px(t, 6, 7, NW)  # spots
    set_px(t, 8, 7, PG)
    # Stem
    set_px(t, 6, 9, PS)
    set_px(t, 7, 9, NW)
    set_px(t, 6, 10, PS)
    set_px(t, 7, 10, PG)
    # Small mushroom
    set_px(t, 11, 10, BR)
    set_px(t, 12, 10, ER)
    set_px(t, 11, 11, PS)
    set_px(t, 12, 11, NW)
    set_px(t, 11, 12, PS)
    # Ground debris
    set_px(t, 3, 12, BN)
    set_px(t, 14, 8, DT)
    tiles.append(t)

    # Tile 5,0: Rain puddle (autumn rain)
    t = blank(16, 16)
    for y in range(5, 12):
        for x in range(4, 12):
            cx, cy = 8.0, 8.5
            if ((x - cx) / 4.0) ** 2 + ((y - cy) / 3.5) ** 2 <= 1.0:
                set_px(t, x, y, ST)
    # Shimmer highlights
    set_px(t, 6, 7, MG)
    set_px(t, 9, 8, LS)
    # Fallen leaf floating
    set_px(t, 7, 8, FR)
    set_px(t, 8, 8, EM)
    tiles.append(t)

    # Tile 6,0: Fallen bark pieces
    t = blank(16, 16)
    # Bark strip 1
    for x in range(3, 10):
        set_px(t, x, 9, BD)
        set_px(t, x, 10, BN)
    set_px(t, 5, 9, DT)
    # Bark strip 2
    for x in range(7, 13):
        set_px(t, x, 13, BD)
        set_px(t, x, 14, DT)
    # Moss on bark
    set_px(t, 4, 9, DF)
    set_px(t, 8, 13, FG)
    tiles.append(t)

    # Tile 7,0: Pine cone and needles
    t = blank(16, 16)
    # Pine cone
    set_px(t, 7, 6, BD)
    set_px(t, 8, 6, BN)
    set_px(t, 7, 7, BN)
    set_px(t, 8, 7, DT)
    set_px(t, 6, 7, BD)
    set_px(t, 9, 7, BD)
    set_px(t, 7, 8, DT)
    set_px(t, 8, 8, BN)
    set_px(t, 7, 9, BD)
    set_px(t, 8, 9, BD)
    # Pine needles
    set_px(t, 3, 4, DF)
    set_px(t, 4, 3, FG)
    set_px(t, 12, 11, DF)
    set_px(t, 11, 12, FG)
    set_px(t, 5, 13, DF)
    tiles.append(t)

    row0 = hstack(tiles[:8])

    # ── Row 1: Vegetation ──
    tiles_r1 = []

    # Tile 0,1: Autumn tree canopy (orange/red leaves, left half)
    t = blank(16, 16)
    for y in range(2, 14):
        for x in range(0, 14):
            if ((x - 10) ** 2 + (y - 7) ** 2) < 40:
                c_idx = (x + y) % 4
                if c_idx == 0:
                    set_px(t, x, y, FR)
                elif c_idx == 1:
                    set_px(t, x, y, BR)
                elif c_idx == 2:
                    set_px(t, x, y, ER)
                else:
                    set_px(t, x, y, GD)
    # Branch visible through leaves
    set_px(t, 9, 9, BN)
    set_px(t, 10, 10, BD)
    set_px(t, 11, 9, DT)
    tiles_r1.append(t)

    # Tile 1,1: Autumn tree trunk
    t = blank(16, 16)
    for y in range(16):
        set_px(t, 7, y, BN)
        set_px(t, 8, y, DT)
    # Bark texture rings
    for ly in [2, 6, 10, 14]:
        set_px(t, 6, ly, BD)
        set_px(t, 9, ly, BD)
        set_px(t, 7, ly, DT)
        set_px(t, 8, ly, BN)
    # Knot hole
    set_px(t, 7, 8, K)
    set_px(t, 8, 8, DK)
    tiles_r1.append(t)

    # Tile 2,1: Berry bush (autumn berries)
    t = blank(16, 16)
    # Bush body (muted autumn green)
    fill_rect(t, 3, 6, 10, 8, DF)
    fill_rect(t, 4, 5, 8, 1, FG)
    fill_rect(t, 5, 4, 6, 1, LG)
    # Red berries
    for bx, by in [(4, 6), (7, 5), (10, 7), (5, 9), (9, 8), (12, 6)]:
        set_px(t, bx, by, BR)
    for bx, by in [(6, 7), (8, 6), (11, 8)]:
        set_px(t, bx, by, ER)
    # Dark base
    fill_rect(t, 3, 13, 10, 1, BD)
    tiles_r1.append(t)

    # Tile 3,1: Wheat stalks
    t = blank(16, 16)
    # Wheat stems
    for x_base, h in [(3, 10), (6, 12), (9, 9), (12, 11)]:
        for y in range(16 - h, 16):
            wave = 1 if (y + x_base) % 4 < 2 else 0
            c = DS if y > 12 else SN
            set_px(t, x_base + wave, y, c)
        # Wheat head (golden)
        set_px(t, x_base, 16 - h - 1, GD)
        set_px(t, x_base, 16 - h - 2, YL)
    tiles_r1.append(t)

    # Tile 4,1: Pumpkin vine with small pumpkin
    t = blank(16, 16)
    # Vine (snaking along ground)
    for x in [2, 3, 4, 5, 6, 7]:
        set_px(t, x, 11, FG)
    set_px(t, 8, 10, FG)
    set_px(t, 9, 10, DF)
    # Small pumpkin
    fill_rect(t, 10, 9, 3, 3, FR)
    set_px(t, 11, 8, FG)  # stem
    set_px(t, 11, 10, EM)  # ridge
    # Leaves on vine
    set_px(t, 3, 10, LG)
    set_px(t, 6, 10, FG)
    tiles_r1.append(t)

    # Tile 5,1: Autumn fern (browned, dying)
    t = blank(16, 16)
    # Fern fronds (brown/gold tones)
    for y in range(4, 14):
        x_off = 1 if y % 3 == 0 else 0
        set_px(t, 7 + x_off, y, DT)
        set_px(t, 8 - x_off, y, BN)
    # Side fronds
    set_px(t, 5, 6, SN)
    set_px(t, 6, 7, DT)
    set_px(t, 10, 6, DS)
    set_px(t, 9, 7, BN)
    set_px(t, 4, 9, DS)
    set_px(t, 11, 10, SN)
    # Tips
    set_px(t, 4, 8, GD)
    set_px(t, 11, 9, GD)
    tiles_r1.append(t)

    # Tile 6,1: Toadstool ring (fairy ring)
    t = blank(16, 16)
    # Ring of small toadstools
    ring_spots = [(4, 5), (8, 3), (12, 5), (13, 9), (11, 12), (7, 13), (3, 11), (2, 8)]
    for i, (rx, ry) in enumerate(ring_spots):
        cap_c = BR if i % 2 == 0 else ER
        set_px(t, rx, ry, cap_c)
        set_px(t, rx, ry + 1, PS)
    # Magic glow center
    set_px(t, 7, 8, SG)
    set_px(t, 8, 8, MV)
    tiles_r1.append(t)

    # Tile 7,1: Fallen log
    t = blank(16, 16)
    # Log body (horizontal)
    fill_rect(t, 1, 8, 14, 4, BN)
    fill_rect(t, 2, 9, 12, 2, DT)
    # End rings
    set_px(t, 0, 9, BD)
    set_px(t, 0, 10, BD)
    set_px(t, 15, 9, BD)
    set_px(t, 15, 10, BD)
    # Moss patches
    set_px(t, 5, 8, FG)
    set_px(t, 6, 8, DF)
    set_px(t, 10, 8, FG)
    # Bark detail
    set_px(t, 3, 9, BD)
    set_px(t, 8, 10, BD)
    set_px(t, 12, 9, BD)
    tiles_r1.append(t)

    row1 = hstack(tiles_r1[:8])

    # ── Row 2: Structures / Event objects ──
    tiles_r2 = []

    # Tile 0,2: Jack-o-lantern
    t = blank(16, 16)
    # Pumpkin body
    fill_rect(t, 3, 6, 10, 7, FR)
    fill_rect(t, 4, 5, 8, 1, EM)
    set_px(t, 2, 8, FR)
    set_px(t, 2, 9, FR)
    set_px(t, 13, 8, FR)
    set_px(t, 13, 9, FR)
    # Ridges
    set_px(t, 5, 6, EM)
    set_px(t, 8, 6, EM)
    set_px(t, 11, 6, EM)
    # Carved face (glowing)
    set_px(t, 5, 8, YL)
    set_px(t, 6, 8, GD)
    set_px(t, 9, 8, GD)
    set_px(t, 10, 8, YL)
    set_px(t, 7, 9, YL)  # nose
    set_px(t, 5, 10, GD)
    set_px(t, 6, 10, YL)
    set_px(t, 7, 10, GD)
    set_px(t, 8, 10, YL)
    set_px(t, 9, 10, GD)
    set_px(t, 10, 10, YL)
    # Stem
    set_px(t, 7, 4, FG)
    set_px(t, 8, 4, DF)
    set_px(t, 7, 3, DF)
    # Inner glow
    set_px(t, 7, 8, PY)
    set_px(t, 8, 9, PY)
    # Ground
    set_px(t, 4, 13, BN)
    set_px(t, 11, 13, DT)
    tiles_r2.append(t)

    # Tile 1,2: Cornucopia (horn of plenty)
    t = blank(16, 16)
    # Horn (curved basket)
    fill_rect(t, 2, 8, 8, 4, DT)
    fill_rect(t, 3, 7, 6, 1, BN)
    set_px(t, 10, 9, BN)
    set_px(t, 11, 10, DT)
    set_px(t, 12, 11, BN)
    set_px(t, 13, 12, DT)
    # Weave texture
    set_px(t, 4, 9, SN)
    set_px(t, 6, 10, SN)
    set_px(t, 8, 9, SN)
    # Overflowing produce
    set_px(t, 3, 7, FR)   # pumpkin
    set_px(t, 5, 6, BR)   # apple
    set_px(t, 7, 6, GD)   # corn
    set_px(t, 4, 6, FG)   # leaf
    set_px(t, 6, 5, YL)   # squash
    set_px(t, 8, 7, ER)   # berry
    tiles_r2.append(t)

    # Tile 2,2: Harvest festival banner
    t = blank(16, 16)
    # Pole
    for y in range(2, 16):
        set_px(t, 3, y, DT)
    set_px(t, 3, 1, GD)   # gold finial
    # Banner fabric (warm autumn orange/red)
    fill_rect(t, 4, 2, 8, 10, FR)
    fill_rect(t, 5, 3, 6, 8, EM)
    # Leaf emblem
    set_px(t, 7, 6, GD)
    set_px(t, 8, 6, YL)
    set_px(t, 6, 5, BR)
    set_px(t, 9, 5, BR)
    set_px(t, 6, 7, FR)
    set_px(t, 9, 7, FR)
    set_px(t, 7, 5, ER)
    set_px(t, 8, 7, ER)
    # Banner bottom (pointed)
    set_px(t, 5, 12, EM)
    set_px(t, 10, 12, EM)
    set_px(t, 6, 13, FR)
    set_px(t, 9, 13, FR)
    set_px(t, 7, 14, EM)
    set_px(t, 8, 14, EM)
    tiles_r2.append(t)

    # Tile 3,2: Hay bale
    t = blank(16, 16)
    # Bale body
    fill_rect(t, 3, 6, 10, 8, DS)
    fill_rect(t, 4, 7, 8, 6, SN)
    # Hay texture (horizontal strands)
    for y in range(7, 13):
        if y % 2 == 0:
            set_px(t, 5, y, PS)
            set_px(t, 9, y, DS)
    # Binding twine
    set_px(t, 3, 9, BN)
    set_px(t, 12, 9, BN)
    set_px(t, 3, 10, DT)
    set_px(t, 12, 10, DT)
    # Loose straw
    set_px(t, 2, 13, DS)
    set_px(t, 13, 14, SN)
    set_px(t, 1, 12, PS)
    tiles_r2.append(t)

    # Tile 4,2: Cauldron (harvest brew)
    t = blank(16, 16)
    # Cauldron body
    fill_rect(t, 4, 7, 8, 6, DK)
    fill_rect(t, 5, 6, 6, 1, ST)
    # Legs
    set_px(t, 4, 13, ST)
    set_px(t, 11, 13, ST)
    set_px(t, 7, 14, MG)
    # Brew (green/purple magical)
    fill_rect(t, 5, 7, 6, 2, FG)
    set_px(t, 6, 7, LG)
    set_px(t, 9, 7, BG)
    # Bubbles
    set_px(t, 7, 5, LG)
    set_px(t, 8, 4, BG)
    # Handle
    set_px(t, 3, 7, ST)
    set_px(t, 12, 7, ST)
    tiles_r2.append(t)

    # Tile 5,2: Scarecrow post
    t = blank(16, 16)
    # Vertical post
    for y in range(4, 16):
        set_px(t, 7, y, DT)
        set_px(t, 8, y, BN)
    # Cross beam
    for x in range(3, 13):
        set_px(t, x, 6, BN)
    # Hat
    set_px(t, 6, 2, DK)
    set_px(t, 7, 2, BD)
    set_px(t, 8, 2, BD)
    set_px(t, 9, 2, DK)
    fill_rect(t, 5, 3, 6, 2, DK)
    # Sack head
    set_px(t, 7, 5, SN)
    set_px(t, 8, 5, DT)
    # Cloth scraps
    set_px(t, 3, 7, BD)
    set_px(t, 12, 7, BD)
    set_px(t, 3, 8, DK)
    set_px(t, 12, 8, DK)
    tiles_r2.append(t)

    # Tile 6,2: Apple barrel
    t = blank(16, 16)
    # Barrel body
    fill_rect(t, 4, 5, 8, 9, BN)
    fill_rect(t, 5, 4, 6, 1, DT)
    fill_rect(t, 5, 14, 6, 1, DT)
    # Barrel bands
    set_px(t, 4, 7, ST)
    set_px(t, 11, 7, ST)
    set_px(t, 4, 11, ST)
    set_px(t, 11, 11, ST)
    # Apples on top
    set_px(t, 6, 4, BR)
    set_px(t, 7, 3, ER)
    set_px(t, 8, 4, BR)
    set_px(t, 9, 3, FR)
    # Apple leaf
    set_px(t, 7, 2, FG)
    tiles_r2.append(t)

    # Tile 7,2: Fall event quest marker (leaf orb)
    t = blank(16, 16)
    # Glowing leaf orb
    fill_rect(t, 5, 4, 6, 6, GD)
    fill_rect(t, 6, 3, 4, 1, YL)
    fill_rect(t, 6, 10, 4, 1, YL)
    set_px(t, 5, 5, FR)
    set_px(t, 10, 5, BR)
    set_px(t, 5, 8, ER)
    set_px(t, 10, 8, FR)
    # Inner glow
    set_px(t, 7, 6, PY)
    set_px(t, 8, 6, NW)
    set_px(t, 7, 7, NW)
    set_px(t, 8, 7, PY)
    # Leaf ray accents
    set_px(t, 7, 2, EM)
    set_px(t, 8, 2, FR)
    set_px(t, 4, 6, EM)
    set_px(t, 11, 7, BR)
    # Base leaf shimmer
    set_px(t, 6, 12, FR)
    set_px(t, 9, 13, EM)
    set_px(t, 7, 14, GD)
    tiles_r2.append(t)

    row2 = hstack(tiles_r2[:8])
    full_tileset = vstack([row0, row1, row2])
    write_png(os.path.join(TILESET_DIR, 'tileset_seasonal_fall.png'), full_tileset)


# ═══════════════════════════════════════════════════════════════════════════════
# FALL REWARD ITEMS — 16×16 each
# Follow icon style: clear silhouette, 4-6 palette colors per icon
# ═══════════════════════════════════════════════════════════════════════════════

def make_fall_rewards():

    # 1. Harvest Scythe — curved blade with wooden handle
    t = blank(16, 16)
    # Blade (curved arc, top-right)
    for i in range(6):
        set_px(t, 8 + i, 3 + i, LS)
        set_px(t, 9 + i, 3 + i, MG)
    # Blade edge (sharp silver)
    for i in range(6):
        set_px(t, 7 + i, 4 + i, NW)
    # Inner curve
    set_px(t, 10, 4, PG)
    set_px(t, 11, 5, LS)
    # Handle (wooden, diagonal)
    for i in range(6):
        set_px(t, 7 - i, 4 + i, BN)
        set_px(t, 8 - i, 5 + i, DT)
    # Grip wrap
    set_px(t, 4, 8, DS)
    set_px(t, 3, 9, SN)
    set_px(t, 2, 10, DS)
    # Pommel
    set_px(t, 1, 11, GD)
    # Blade tip sparkle
    set_px(t, 13, 8, NW)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_fall_harvest_scythe.png'), t)

    # 2. Autumn Crown — leaf wreath crown with gold accents
    t = blank(16, 16)
    # Crown band (curved wreath)
    for x in range(4, 12):
        y = 8 + int(1.5 * ((x - 8) / 4.0) ** 2)
        set_px(t, x, y, DG)
        set_px(t, x, y + 1, BN)
    # Leaves on crown
    set_px(t, 5, 7, FR)
    set_px(t, 7, 6, BR)
    set_px(t, 8, 5, GD)
    set_px(t, 9, 6, ER)
    set_px(t, 11, 7, FR)
    # Gold accents between leaves
    set_px(t, 6, 7, YL)
    set_px(t, 10, 7, YL)
    set_px(t, 8, 6, PY)
    # Side leaf drops
    set_px(t, 3, 9, FR)
    set_px(t, 3, 10, EM)
    set_px(t, 12, 9, BR)
    set_px(t, 12, 10, ER)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_fall_autumn_crown.png'), t)

    # 3. Leaf Cloak — flowing autumn-colored cape
    t = blank(16, 16)
    # Cloak body (flowing shape)
    fill_rect(t, 5, 3, 6, 10, FR)
    fill_rect(t, 6, 2, 4, 1, EM)
    # Leaf pattern overlay
    set_px(t, 6, 4, BR)
    set_px(t, 9, 5, ER)
    set_px(t, 7, 7, GD)
    set_px(t, 8, 9, BR)
    set_px(t, 6, 8, YL)
    set_px(t, 10, 6, EM)
    # Clasp at top
    set_px(t, 7, 2, GD)
    set_px(t, 8, 2, YL)
    # Flowing bottom edge (tattered leaves)
    set_px(t, 4, 12, FR)
    set_px(t, 5, 13, EM)
    set_px(t, 6, 13, BR)
    set_px(t, 7, 14, FR)
    set_px(t, 8, 13, ER)
    set_px(t, 9, 13, GD)
    set_px(t, 10, 12, FR)
    set_px(t, 11, 13, EM)
    # Shadow
    set_px(t, 4, 4, BD)
    set_px(t, 11, 4, BD)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_fall_leaf_cloak.png'), t)

    # 4. Acorn Amulet — enchanted acorn pendant
    t = blank(16, 16)
    # Chain
    set_px(t, 6, 2, GD)
    set_px(t, 7, 3, DG)
    set_px(t, 8, 4, GD)
    set_px(t, 9, 3, DG)
    set_px(t, 10, 2, GD)
    # Acorn cap
    fill_rect(t, 6, 6, 4, 2, DT)
    set_px(t, 7, 5, BN)
    set_px(t, 8, 5, DT)
    # Cap texture
    set_px(t, 7, 6, SN)
    set_px(t, 8, 6, BN)
    # Acorn nut body (glowing)
    fill_rect(t, 6, 8, 4, 3, SN)
    set_px(t, 7, 8, DS)
    set_px(t, 8, 8, PS)
    set_px(t, 7, 9, GD)  # magic glow
    set_px(t, 8, 9, YL)
    # Bottom point
    set_px(t, 7, 11, DT)
    set_px(t, 8, 11, BN)
    # Magic sparkle
    set_px(t, 5, 8, PY)
    set_px(t, 10, 9, PY)
    set_px(t, 7, 12, SG)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_fall_acorn_amulet.png'), t)

    # 5. Pumpkin Shield — orange shield with carved face
    t = blank(16, 16)
    # Shield body (pumpkin-shaped)
    fill_rect(t, 4, 3, 8, 10, FR)
    fill_rect(t, 5, 2, 6, 1, EM)
    fill_rect(t, 5, 13, 6, 1, EM)
    # Shield edges (darker)
    set_px(t, 4, 4, ER)
    set_px(t, 11, 4, ER)
    set_px(t, 4, 11, ER)
    set_px(t, 11, 11, ER)
    # Point at bottom
    set_px(t, 6, 14, FR)
    set_px(t, 9, 14, FR)
    set_px(t, 7, 15, EM)
    set_px(t, 8, 15, EM)
    # Carved face emblem (glowing)
    set_px(t, 6, 6, YL)
    set_px(t, 9, 6, YL)
    set_px(t, 7, 7, GD)   # nose
    set_px(t, 6, 9, GD)
    set_px(t, 7, 9, YL)
    set_px(t, 8, 9, GD)
    set_px(t, 9, 9, YL)
    # Ridges
    set_px(t, 5, 5, EM)
    set_px(t, 10, 5, EM)
    # Stem at top
    set_px(t, 7, 2, FG)
    set_px(t, 8, 1, DF)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_fall_pumpkin_shield.png'), t)

    # 6. Season Coin — fall seasonal currency
    t = blank(16, 16)
    # Coin body (circular gold)
    fill_rect(t, 5, 4, 6, 8, GD)
    fill_rect(t, 6, 3, 4, 1, DG)
    fill_rect(t, 6, 12, 4, 1, DG)
    set_px(t, 4, 6, DG)
    set_px(t, 4, 9, DG)
    set_px(t, 11, 6, DG)
    set_px(t, 11, 9, DG)
    # Inner design (leaf)
    set_px(t, 7, 6, FR)
    set_px(t, 8, 6, EM)
    set_px(t, 7, 7, ER)
    set_px(t, 8, 7, FR)
    set_px(t, 7, 8, FR)
    set_px(t, 8, 8, BR)
    set_px(t, 7, 9, EM)
    set_px(t, 8, 9, FR)
    # Coin rim highlight
    set_px(t, 6, 4, YL)
    set_px(t, 9, 4, PY)
    set_px(t, 5, 5, YL)
    set_px(t, 10, 5, PY)
    # Sparkle
    set_px(t, 6, 3, PY)
    set_px(t, 10, 11, PY)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_fall_season_coin.png'), t)


# ═══════════════════════════════════════════════════════════════════════════════
# FALL EVENT BANNER — 128×48 (matches existing seasonal banner format)
# Autumn tree silhouettes, "AUTUMN HARVEST" event title area,
# warm orange/red/gold color scheme
# ═══════════════════════════════════════════════════════════════════════════════

def make_fall_banner():
    g = blank(128, 48)

    # Background gradient (warm autumn tones)
    for y in range(48):
        for x in range(128):
            if y < 16:
                g[y][x] = DS  # golden sky
            elif y < 32:
                g[y][x] = DT  # warm brown mid
            else:
                g[y][x] = BN  # rich earth bottom

    # Border frame
    draw_rect_outline(g, 0, 0, 128, 48, BD)
    draw_rect_outline(g, 1, 1, 126, 46, DK)

    # Autumn tree (left side)
    # Trunk
    for y in range(20, 46):
        set_px(g, 14, y, BN)
        set_px(g, 15, y, DT)
        set_px(g, 16, y, BN)
    # Bark rings
    for ry in range(22, 44, 4):
        set_px(g, 14, ry, BD)
        set_px(g, 16, ry, BD)
    # Canopy (autumn leaves)
    for y in range(4, 22):
        for x in range(4, 28):
            dist = ((x - 15) ** 2 + (y - 12) ** 2)
            if dist < 80:
                c_idx = (x + y) % 4
                if c_idx == 0:
                    g[y][x] = FR
                elif c_idx == 1:
                    g[y][x] = BR
                elif c_idx == 2:
                    g[y][x] = ER
                else:
                    g[y][x] = GD
    # Acorns
    set_px(g, 13, 18, BD)
    set_px(g, 17, 19, BN)

    # Autumn tree (right side, mirrored)
    for y in range(22, 46):
        set_px(g, 112, y, BN)
        set_px(g, 113, y, DT)
        set_px(g, 114, y, BN)
    for ry in range(24, 44, 4):
        set_px(g, 112, ry, BD)
        set_px(g, 114, ry, BD)
    for y in range(6, 24):
        for x in range(100, 124):
            dist = ((x - 113) ** 2 + (y - 14) ** 2)
            if dist < 80:
                c_idx = (x + y) % 4
                if c_idx == 0:
                    g[y][x] = FR
                elif c_idx == 1:
                    g[y][x] = ER
                elif c_idx == 2:
                    g[y][x] = GD
                else:
                    g[y][x] = BR
    set_px(g, 115, 20, BD)
    set_px(g, 111, 21, BN)

    # Center text area (dark background panel)
    fill_rect(g, 30, 10, 68, 28, BD)
    fill_rect(g, 31, 11, 66, 26, DK)
    fill_rect(g, 32, 12, 64, 24, DT)
    draw_rect_outline(g, 31, 11, 66, 26, GD)

    # "AUTUMN" text (pixel font, ~5px tall)
    # A
    set_px(g, 36, 16, K)
    set_px(g, 37, 16, K)
    fill_rect(g, 35, 17, 1, 4, K)
    fill_rect(g, 38, 17, 1, 4, K)
    fill_rect(g, 36, 18, 2, 1, K)
    # U
    fill_rect(g, 40, 16, 1, 4, K)
    fill_rect(g, 43, 16, 1, 4, K)
    fill_rect(g, 41, 20, 2, 1, K)
    # T
    fill_rect(g, 45, 16, 5, 1, K)
    fill_rect(g, 47, 17, 1, 4, K)
    # U
    fill_rect(g, 51, 16, 1, 4, K)
    fill_rect(g, 54, 16, 1, 4, K)
    fill_rect(g, 52, 20, 2, 1, K)
    # M
    fill_rect(g, 56, 16, 1, 5, K)
    set_px(g, 57, 17, K)
    set_px(g, 58, 18, K)
    set_px(g, 59, 17, K)
    fill_rect(g, 60, 16, 1, 5, K)
    # N
    fill_rect(g, 62, 16, 1, 5, K)
    set_px(g, 63, 17, K)
    set_px(g, 64, 18, K)
    set_px(g, 65, 19, K)
    fill_rect(g, 66, 16, 1, 5, K)

    # "HARVEST" subtitle text
    # H
    fill_rect(g, 40, 25, 1, 5, K)
    fill_rect(g, 43, 25, 1, 5, K)
    fill_rect(g, 41, 27, 2, 1, K)
    # A
    set_px(g, 46, 25, K)
    set_px(g, 47, 25, K)
    fill_rect(g, 45, 26, 1, 4, K)
    fill_rect(g, 48, 26, 1, 4, K)
    fill_rect(g, 46, 27, 2, 1, K)
    # R
    fill_rect(g, 50, 25, 1, 5, K)
    fill_rect(g, 51, 25, 3, 1, K)
    set_px(g, 53, 26, K)
    fill_rect(g, 51, 27, 3, 1, K)
    set_px(g, 52, 28, K)
    set_px(g, 53, 29, K)
    # V
    fill_rect(g, 55, 25, 1, 3, K)
    fill_rect(g, 59, 25, 1, 3, K)
    set_px(g, 56, 28, K)
    set_px(g, 58, 28, K)
    set_px(g, 57, 29, K)
    # E
    fill_rect(g, 61, 25, 1, 5, K)
    fill_rect(g, 62, 25, 3, 1, K)
    fill_rect(g, 62, 27, 2, 1, K)
    fill_rect(g, 62, 29, 3, 1, K)
    # S
    fill_rect(g, 66, 25, 3, 1, K)
    set_px(g, 65, 26, K)
    fill_rect(g, 66, 27, 2, 1, K)
    set_px(g, 68, 28, K)
    fill_rect(g, 65, 29, 3, 1, K)
    # T
    fill_rect(g, 70, 25, 5, 1, K)
    fill_rect(g, 72, 26, 1, 4, K)

    # Decorative leaves in banner corners
    leaf_positions = [(33, 13), (93, 13), (33, 33), (93, 33)]
    corner_colors = [FR, BR, ER, GD]
    for i, (lx, ly) in enumerate(leaf_positions):
        set_px(g, lx, ly, corner_colors[i])
        set_px(g, lx - 1, ly, corner_colors[(i + 1) % 4])
        set_px(g, lx + 1, ly, corner_colors[(i + 2) % 4])
        set_px(g, lx, ly - 1, corner_colors[(i + 3) % 4])
        set_px(g, lx, ly + 1, corner_colors[(i + 1) % 4])

    # Falling leaves along bottom area
    for x in range(32, 96, 4):
        lc = [FR, BR, GD, EM][x % 4]
        set_px(g, x, 40, lc)
        set_px(g, x + 1, 41, EM)
        set_px(g, x + 2, 40, lc)

    # Gold sparkles from top
    for x in range(40, 90, 8):
        set_px(g, x, 3, YL)
        set_px(g, x + 1, 4, GD)
        set_px(g, x + 2, 5, DG)

    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_seasonal_banner_fall_event.png'), g)


# ═══════════════════════════════════════════════════════════════════════════════
# FALL UI DECORATIONS — corner and divider pieces (16×16 each)
# ═══════════════════════════════════════════════════════════════════════════════

def make_fall_ui_decor():
    # Corner decoration (leaf/vine corner piece for UI panels)
    t = blank(16, 16)
    # Vine L-shape
    for x in range(16):
        set_px(t, x, 15, BN)
    for y in range(16):
        set_px(t, 0, y, BN)
    # Corner leaf cluster
    set_px(t, 1, 14, FR)
    set_px(t, 0, 13, BR)
    set_px(t, 2, 13, GD)
    set_px(t, 1, 12, ER)
    set_px(t, 1, 15, EM)
    # Leaf accents along vine
    set_px(t, 5, 14, FR)
    set_px(t, 9, 14, BR)
    set_px(t, 13, 14, GD)
    set_px(t, 1, 10, FR)
    set_px(t, 1, 6, ER)
    set_px(t, 1, 3, GD)
    # Small acorn
    set_px(t, 7, 13, DT)
    set_px(t, 2, 8, BN)
    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_fall_decor_corner.png'), t)

    # Divider (horizontal vine/leaf divider)
    t = blank(16, 16)
    # Vine line (undulating)
    for x in range(16):
        wave_y = 7 if x % 4 < 2 else 8
        set_px(t, x, wave_y, BN)
        set_px(t, x, wave_y + 1, BD)
    # Leaf crests
    set_px(t, 2, 6, FR)
    set_px(t, 6, 7, BR)
    set_px(t, 10, 6, GD)
    set_px(t, 14, 7, ER)
    # Acorn accents
    set_px(t, 4, 5, DT)
    set_px(t, 4, 4, BN)
    set_px(t, 12, 5, DT)
    set_px(t, 12, 4, SN)
    # Berry details
    set_px(t, 0, 6, BR)
    set_px(t, 0, 5, ER)
    set_px(t, 15, 9, FR)
    set_px(t, 15, 10, EM)
    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_fall_decor_divider.png'), t)


# ═══════════════════════════════════════════════════════════════════════════════
# FALL CHARACTER OVERLAY HAT — 16×16 (scarecrow/harvest hat overlay)
# ═══════════════════════════════════════════════════════════════════════════════

def make_fall_hat_overlay():
    t = blank(16, 16)
    # Hat brim (wide)
    fill_rect(t, 3, 10, 10, 2, BD)
    fill_rect(t, 4, 10, 8, 1, DK)
    # Hat body (tall pointed)
    fill_rect(t, 5, 5, 6, 5, DK)
    fill_rect(t, 6, 4, 4, 1, BD)
    # Hat tip (bent)
    set_px(t, 7, 3, DK)
    set_px(t, 8, 3, BD)
    set_px(t, 9, 2, DK)
    set_px(t, 10, 1, BD)
    # Hat band (autumn-colored ribbon)
    fill_rect(t, 5, 9, 6, 1, FR)
    set_px(t, 7, 9, GD)
    set_px(t, 8, 9, YL)
    # Small leaf on band
    set_px(t, 10, 8, BR)
    set_px(t, 11, 8, FR)
    set_px(t, 11, 7, ER)
    write_png(os.path.join(CHARACTER_DIR, 'char_overlay_hat_fall.png'), t)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print('=== Fall Seasonal Event Art Pack (PIX-264) ===\n')

    print('-- Fall Event Enemies --')
    make_harvest_golem()
    make_scarecrow_shade()
    make_pumpkin_wraith()
    make_maple_treant()

    print('\n-- Harvest King Boss --')
    make_harvest_king()

    print('\n-- Fall Decoration Tileset --')
    make_fall_tileset()

    print('\n-- Fall Reward Items --')
    make_fall_rewards()

    print('\n-- Fall Event Banner --')
    make_fall_banner()

    print('\n-- Fall UI Decorations --')
    make_fall_ui_decor()

    print('\n-- Fall Character Overlay Hat --')
    make_fall_hat_overlay()

    print('\n=== Done! All fall event assets generated. ===')
