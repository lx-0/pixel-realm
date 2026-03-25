#!/usr/bin/env python3
"""
Generate spring seasonal event art pack for PixelRealm (PIX-255).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md exactly:
  - 32-color master palette, SNES-era RPG style
  - Nearest-neighbor pixel art, no anti-aliasing
  - Naming convention: {category}_{name}_{variant}.{ext}

Outputs:
  -- Spring Event Enemies (128×16 horizontal strips, 8 frames × 16px) --
  assets/sprites/enemies/event/char_enemy_flower_golem.png    (small 12×12 centered in 16×16)
  assets/sprites/enemies/event/char_enemy_pollen_wisp.png     (small 12×12 centered in 16×16)
  assets/sprites/enemies/event/char_enemy_thorn_beetle.png    (small 12×12 centered in 16×16)
  assets/sprites/enemies/event/char_enemy_bloom_spider.png    (small 12×12 centered in 16×16)

  -- Spring Event Boss: Spring Guardian (256×32, 8 frames × 32px) --
  assets/sprites/enemies/event/char_enemy_boss_spring_guardian.png

  -- Spring Decoration Tileset (128×48, 8×3 tiles of 16×16) --
  assets/tiles/tilesets/tileset_seasonal_spring.png

  -- Spring Reward Item Sprites (16×16 each) --
  assets/sprites/pickups/icon_reward_spring_blossom_blade.png
  assets/sprites/pickups/icon_reward_spring_petal_bow.png
  assets/sprites/pickups/icon_reward_spring_vine_armor.png
  assets/sprites/pickups/icon_reward_spring_flower_crown.png
  assets/sprites/pickups/icon_reward_spring_butterfly_wings.png
  assets/sprites/pickups/icon_reward_spring_seed_pouch.png

  -- Spring Event Banner (128×48) --
  assets/ui/seasonal/ui_seasonal_banner_spring_event.png

  -- Spring Event UI Decorations (16×16 each) --
  assets/ui/seasonal/ui_spring_decor_corner.png
  assets/ui/seasonal/ui_spring_decor_divider.png
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

for d in [ENEMY_EVENT_DIR, TILESET_DIR, PICKUP_DIR, SEASONAL_UI_DIR]:
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

# ─── Spring-specific color shortcuts ────────────────────────────────────────
# Spring uses greens + pinks/magentas for blossoms
# Cherry blossom pink uses palette ember/fire shifted toward magenta feel
# We stay on-palette: pink = SG (spell glow), coral = EM (ember)
PK  = SG   # pink petals (spell glow #d090ff)
LP  = PY   # light petal highlight (#fff8a0)
RP  = MV   # rose/dark petal (#9050e0)
VN  = FG   # vine green
LF  = BG   # leaf bright
DL  = DF   # dark leaf

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
# ENEMY 1: FLOWER GOLEM — stumpy plant creature, 16×16, 8 frames
# Frames 0-3: idle sway, Frames 4-7: attack (vine whip)
# Color: green body (DF/FG/LG), flower head (PK/RP), red enemy eyes (BR)
# ═══════════════════════════════════════════════════════════════════════════════

def make_flower_golem():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        # Body bob for idle
        bob = [0, 0, -1, 0][anim] if not is_attack else 0
        # Attack lunge
        lunge = [0, 1, 2, 1][anim] if is_attack else 0

        # Roots/feet (bottom)
        set_px(g, 5, 14 + bob, DL)
        set_px(g, 6, 14 + bob, VN)
        set_px(g, 9, 14 + bob, VN)
        set_px(g, 10, 14 + bob, DL)
        set_px(g, 5, 15, DL)
        set_px(g, 6, 15, DL)
        set_px(g, 9, 15, DL)
        set_px(g, 10, 15, DL)

        # Trunk body (mossy green)
        for dy in range(8, 14 + bob):
            set_px(g, 6, dy, DF)
            set_px(g, 7, dy, FG)
            set_px(g, 8, dy, FG)
            set_px(g, 9, dy, DF)
        # Body highlights
        set_px(g, 7, 9 + bob, LG)
        set_px(g, 8, 10 + bob, LG)

        # Leaf arms
        if not is_attack:
            arm_y = 10 + bob + [0, 0, -1, 0][anim]
            set_px(g, 4, arm_y, LG)
            set_px(g, 5, arm_y, FG)
            set_px(g, 10, arm_y, FG)
            set_px(g, 11, arm_y, LG)
            set_px(g, 3, arm_y - 1, BG)
            set_px(g, 12, arm_y - 1, BG)
        else:
            # Vine whip attack — arm extends forward
            arm_y = 10
            set_px(g, 4, arm_y, FG)
            set_px(g, 5, arm_y, FG)
            set_px(g, 10, arm_y, FG)
            set_px(g, 11, arm_y, FG)
            # Whip extends
            wx = 11 + lunge
            set_px(g, wx, arm_y, LG)
            set_px(g, wx + 1, arm_y - 1, BG)
            if lunge >= 2:
                set_px(g, wx + 1, arm_y, BR)  # thorn tip

        # Flower head (circular petals)
        # Center
        set_px(g, 7, 6 + bob, GD)
        set_px(g, 8, 6 + bob, YL)
        # Petals around center
        for px_x, px_y in [(6,5), (9,5), (6,7), (9,7), (7,4), (8,4), (7,8), (8,8)]:
            petal_color = PK if (px_x + px_y + anim) % 3 != 0 else RP
            set_px(g, px_x, px_y + bob, petal_color)
        # Top petals
        set_px(g, 7, 3 + bob, FL)
        set_px(g, 8, 3 + bob, FL)

        # Eyes (enemy red)
        set_px(g, 7, 6 + bob, BR)
        set_px(g, 8, 6 + bob, BR)

        # Outline key pixels
        set_px(g, 6, 3 + bob, K)
        set_px(g, 9, 3 + bob, K)
        set_px(g, 5, 5 + bob, K)
        set_px(g, 10, 5 + bob, K)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_flower_golem.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# ENEMY 2: POLLEN WISP — floating sparkle creature, 16×16, 8 frames
# Frames 0-3: float/bob, Frames 4-7: attack (pollen burst)
# Color: yellow-green glow (YL/BG/FL), trail particles (PY/GD)
# ═══════════════════════════════════════════════════════════════════════════════

def make_pollen_wisp():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        # Float bob
        bob = [0, -1, -2, -1][anim]

        # Core glow (small bright center)
        cy = 7 + bob
        set_px(g, 7, cy, YL)
        set_px(g, 8, cy, YL)
        set_px(g, 7, cy + 1, GD)
        set_px(g, 8, cy + 1, GD)

        # Outer glow ring
        for gx, gy in [(6, cy), (9, cy), (6, cy+1), (9, cy+1),
                        (7, cy-1), (8, cy-1), (7, cy+2), (8, cy+2)]:
            set_px(g, gx, gy, BG)

        # Sparkle halo (alternates each frame)
        sparkle_positions = [
            [(5, cy-1), (10, cy+2), (7, cy-2)],
            [(10, cy-1), (5, cy+2), (8, cy+3)],
            [(5, cy), (10, cy), (6, cy-2)],
            [(9, cy-2), (6, cy+3), (10, cy+1)],
        ]
        for sx, sy in sparkle_positions[anim]:
            set_px(g, sx, sy, FL)

        # Pollen trail below
        trail_y = cy + 3
        trail_offsets = [(-1, 0), (0, 1), (1, 0), (2, 1)]
        for i, (dx, dy) in enumerate(trail_offsets):
            if (i + anim) % 2 == 0:
                set_px(g, 7 + dx, trail_y + dy, PY)

        # Eyes
        set_px(g, 7, cy, ER)
        set_px(g, 8, cy, ER)

        if is_attack:
            # Pollen burst — particles spray outward
            burst = [
                [(4, cy-2), (11, cy-2), (4, cy+3), (11, cy+3)],
                [(3, cy-3), (12, cy-3), (3, cy+4), (12, cy+4)],
                [(3, cy-2), (12, cy-2), (4, cy+4), (11, cy+4)],
                [(4, cy-3), (11, cy-3), (3, cy+3), (12, cy+3)],
            ]
            for bx, by in burst[anim]:
                set_px(g, bx, by, YL)
                set_px(g, bx + 1, by, GD)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_pollen_wisp.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# ENEMY 3: THORN BEETLE — armored insect, 16×16, 8 frames
# Frames 0-3: scuttle walk, Frames 4-7: attack (charge + spike)
# Color: dark green shell (DF/FG), red thorns (BR/ER), brown legs (BN/DT)
# ═══════════════════════════════════════════════════════════════════════════════

def make_thorn_beetle():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, -1, 0, -1][anim]
        charge = [0, 1, 2, 1][anim] if is_attack else 0

        # Shell body (top-down oval)
        by = 6 + bob
        for dy in range(5):
            for dx in range(6):
                cx, cy_off = 3.0, 2.0
                if ((dx - cx) / 3.5) ** 2 + ((dy - cy_off) / 2.5) ** 2 <= 1.0:
                    set_px(g, 5 + dx + charge, by + dy, DF)
        # Shell highlight
        set_px(g, 7 + charge, by + 1, FG)
        set_px(g, 8 + charge, by + 1, FG)
        set_px(g, 7 + charge, by + 2, LG)

        # Shell ridge (center line)
        for dy in range(1, 4):
            set_px(g, 8 + charge, by + dy, FG)

        # Thorns on shell (red spikes)
        set_px(g, 6 + charge, by, BR)
        set_px(g, 9 + charge, by, BR)
        set_px(g, 5 + charge, by + 1, ER)
        set_px(g, 10 + charge, by + 1, ER)

        # Head
        set_px(g, 6 + charge, by + 4, BN)
        set_px(g, 7 + charge, by + 4, DT)
        set_px(g, 8 + charge, by + 4, DT)
        set_px(g, 9 + charge, by + 4, BN)

        # Mandibles
        if is_attack and anim >= 1:
            set_px(g, 6 + charge, by + 5, BR)
            set_px(g, 9 + charge, by + 5, BR)
        else:
            set_px(g, 7 + charge, by + 5, BN)
            set_px(g, 8 + charge, by + 5, BN)

        # Eyes
        set_px(g, 7 + charge, by + 4, BR)
        set_px(g, 8 + charge, by + 4, BR)

        # Legs (3 per side, alternate walk)
        leg_phases = [
            [(0, 0), (0, 1), (1, 0)],
            [(1, 0), (0, 0), (0, 1)],
            [(0, 1), (1, 0), (0, 0)],
            [(0, 0), (0, 1), (1, 0)],
        ]
        phase = leg_phases[anim]
        for i, (lx_off, ly_off) in enumerate(phase):
            ly = by + 1 + i * 2
            set_px(g, 4 + charge - lx_off, ly + ly_off, BN)
            set_px(g, 11 + charge + lx_off, ly + ly_off, BN)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_thorn_beetle.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# ENEMY 4: BLOOM SPIDER — web-spinning plant spider, 16×16, 8 frames
# Frames 0-3: creep walk, Frames 4-7: attack (web spit)
# Color: green body (FG/LG), pink flower abdomen (PK/RP), dark legs (DF/K)
# ═══════════════════════════════════════════════════════════════════════════════

def make_bloom_spider():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, 0, -1, 0][anim]

        # Abdomen (flower-like, round with petal marks)
        aby = 5 + bob
        fill_rect(g, 6, aby, 4, 4, FG)
        set_px(g, 7, aby, PK)
        set_px(g, 8, aby, PK)
        set_px(g, 6, aby + 1, RP)
        set_px(g, 9, aby + 1, RP)
        set_px(g, 7, aby + 1, LG)
        set_px(g, 8, aby + 1, LG)
        # Petal accents
        set_px(g, 7, aby + 3, PK)
        set_px(g, 8, aby + 3, PK)

        # Head (small, in front of abdomen)
        hy = aby + 4
        set_px(g, 7, hy, DF)
        set_px(g, 8, hy, DF)
        set_px(g, 7, hy + 1, FG)
        set_px(g, 8, hy + 1, FG)

        # Eyes (enemy red, 2 pairs)
        set_px(g, 7, hy, BR)
        set_px(g, 8, hy, BR)

        # Fangs
        if is_attack:
            set_px(g, 7, hy + 2, NW)
            set_px(g, 8, hy + 2, NW)

        # Legs (4 per side, angled out)
        leg_y_base = aby + 1
        leg_configs = [
            # (x_inner, y_offset, x_outer_delta, y_outer_delta)
            (5, 0, -2, -1),
            (5, 1, -2, 0),
            (5, 2, -2, 1),
            (5, 3, -1, 2),
        ]
        for i, (lx, ly_off, dx, dy) in enumerate(leg_configs):
            leg_bob = 1 if (i + anim) % 2 == 0 else 0
            # Left legs
            set_px(g, lx, leg_y_base + ly_off + leg_bob, K)
            set_px(g, lx + dx, leg_y_base + ly_off + dy + leg_bob, DF)
            # Right legs (mirrored)
            rx = 15 - lx
            set_px(g, rx, leg_y_base + ly_off + leg_bob, K)
            set_px(g, rx - dx, leg_y_base + ly_off + dy + leg_bob, DF)

        # Web spit attack
        if is_attack:
            web_y = hy + 2
            web_dist = [1, 2, 3, 2][anim]
            for wd in range(1, web_dist + 1):
                set_px(g, 7, web_y + wd, NW)
                if wd > 1:
                    set_px(g, 6, web_y + wd, PG)
                    set_px(g, 9, web_y + wd, PG)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_bloom_spider.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# BOSS: SPRING GUARDIAN — large 32×32, 8 frames
# Frames 0-3: idle (breathing, petals drift), Frames 4-7: attack (vine slam)
# Color: green trunk (DF/FG/LG), flower crown (PK/RP/YL), magic eyes (SG/MV)
# ═══════════════════════════════════════════════════════════════════════════════

def make_spring_guardian():
    frames = []
    for f in range(8):
        g = blank(32, 32)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, 0, -1, 0][anim] if not is_attack else 0

        # Roots (base)
        for rx in range(8, 24):
            set_px(g, rx, 30, BD)
            set_px(g, rx, 31, BD)
        for rx in range(6, 26):
            set_px(g, rx, 29, DF)
        # Root tendrils
        set_px(g, 6, 30, DF)
        set_px(g, 7, 30, FG)
        set_px(g, 25, 30, FG)
        set_px(g, 26, 30, DF)
        set_px(g, 5, 31, DL)
        set_px(g, 27, 31, DL)

        # Main trunk body
        for dy in range(12, 29):
            y = dy + bob
            if y < 0 or y >= 32:
                continue
            trunk_width = 8 if dy < 20 else 10
            start_x = 16 - trunk_width // 2
            for dx in range(trunk_width):
                px = start_x + dx
                if dx == 0 or dx == trunk_width - 1:
                    set_px(g, px, y, DF)
                elif dx == 1 or dx == trunk_width - 2:
                    set_px(g, px, y, FG)
                else:
                    set_px(g, px, y, LG)

        # Bark texture
        for ty in [14, 18, 22, 26]:
            y = ty + bob
            if 0 <= y < 32:
                set_px(g, 13, y, DF)
                set_px(g, 18, y, DF)

        # Shoulder branches
        branch_y = 14 + bob
        # Left branch
        for bx in range(6, 12):
            set_px(g, bx, branch_y, FG)
            set_px(g, bx, branch_y - 1, DF)
        # Leaves on left branch
        set_px(g, 5, branch_y - 1, BG)
        set_px(g, 5, branch_y - 2, FL)
        set_px(g, 6, branch_y - 2, LG)

        # Right branch
        for bx in range(20, 26):
            set_px(g, bx, branch_y, FG)
            set_px(g, bx, branch_y - 1, DF)
        # Leaves on right branch
        set_px(g, 26, branch_y - 1, BG)
        set_px(g, 26, branch_y - 2, FL)
        set_px(g, 25, branch_y - 2, LG)

        # Vine arms
        if not is_attack:
            arm_sway = [-1, 0, 1, 0][anim]
            # Left arm
            for ay in range(16, 24):
                ax = 10 - (ay - 16) // 2 + arm_sway + bob
                set_px(g, ax, ay + bob, FG)
                set_px(g, ax - 1, ay + bob, DF)
            # Right arm
            for ay in range(16, 24):
                ax = 21 + (ay - 16) // 2 - arm_sway + bob
                set_px(g, ax, ay + bob, FG)
                set_px(g, ax + 1, ay + bob, DF)
        else:
            # Attack: vine slam downward
            slam_ext = [0, 2, 4, 2][anim]
            # Left arm slams down
            for ay in range(16, 24 + slam_ext):
                ax = 8 if ay < 22 else 7
                y = ay + bob
                if 0 <= y < 32:
                    set_px(g, ax, y, FG)
                    set_px(g, ax - 1, y, DF)
            # Right arm slams down
            for ay in range(16, 24 + slam_ext):
                ax = 23 if ay < 22 else 24
                y = ay + bob
                if 0 <= y < 32:
                    set_px(g, ax, y, FG)
                    set_px(g, ax + 1, y, DF)
            # Impact sparks at slam point
            if slam_ext >= 4:
                for sx in [-2, -1, 0, 1, 2]:
                    set_px(g, 7 + sx, 28, YL)
                    set_px(g, 24 + sx, 28, YL)

        # Face (on trunk)
        face_y = 16 + bob
        # Eyes (magic purple glow)
        set_px(g, 14, face_y, MV)
        set_px(g, 15, face_y, SG)
        set_px(g, 17, face_y, SG)
        set_px(g, 18, face_y, MV)
        # Brow
        set_px(g, 13, face_y - 1, DF)
        set_px(g, 14, face_y - 1, FG)
        set_px(g, 18, face_y - 1, FG)
        set_px(g, 19, face_y - 1, DF)
        # Mouth (dark hollow)
        set_px(g, 15, face_y + 2, K)
        set_px(g, 16, face_y + 2, K)
        set_px(g, 17, face_y + 2, K)
        if is_attack:
            # Open mouth wider during attack
            set_px(g, 15, face_y + 3, K)
            set_px(g, 16, face_y + 3, DK)
            set_px(g, 17, face_y + 3, K)

        # Flower crown (top of head)
        crown_y = 8 + bob
        # Large center flower
        set_px(g, 15, crown_y, GD)
        set_px(g, 16, crown_y, YL)
        # Petals (ring around center)
        petal_positions = [
            (14, crown_y-1), (15, crown_y-1), (16, crown_y-1), (17, crown_y-1),
            (13, crown_y), (18, crown_y),
            (13, crown_y+1), (18, crown_y+1),
            (14, crown_y+2), (15, crown_y+2), (16, crown_y+2), (17, crown_y+2),
        ]
        for i, (px, py) in enumerate(petal_positions):
            c = PK if (i + anim) % 3 != 0 else RP
            set_px(g, px, py, c)

        # Side flowers on crown
        for sx, sy in [(11, crown_y+1), (20, crown_y+1)]:
            set_px(g, sx, sy, YL)
            set_px(g, sx-1, sy, PK)
            set_px(g, sx+1, sy, PK)
            set_px(g, sx, sy-1, RP)
            set_px(g, sx, sy+1, PK)

        # Top leaves
        set_px(g, 14, crown_y - 2, BG)
        set_px(g, 15, crown_y - 2, FL)
        set_px(g, 16, crown_y - 2, FL)
        set_px(g, 17, crown_y - 2, BG)
        set_px(g, 15, crown_y - 3, LG)
        set_px(g, 16, crown_y - 3, LG)

        # Drifting petals (ambient particles)
        petal_drift = [
            [(5, 8), (22, 12), (10, 4)],
            [(7, 10), (24, 8), (12, 3)],
            [(4, 12), (21, 10), (9, 6)],
            [(6, 7), (23, 14), (11, 5)],
        ]
        for dpx, dpy in petal_drift[anim]:
            set_px(g, dpx, dpy + bob, PK)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_boss_spring_guardian.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# SPRING DECORATION TILESET — 128×48 (8 columns × 3 rows of 16×16 tiles)
# Row 0: Ground overlays (cherry blossom petals, flower patches)
# Row 1: Vegetation (flower beds, vines, bushes)
# Row 2: Structures (trellis, lantern, fountain piece, event marker)
# ═══════════════════════════════════════════════════════════════════════════════

def make_spring_tileset():
    tiles = []

    # ── Row 0: Ground overlays ──

    # Tile 0,0: Cherry blossom petals (scattered on ground)
    t = blank(16, 16)
    petal_spots = [(2,3), (5,8), (10,2), (13,11), (7,14), (1,12), (14,6), (9,9)]
    for i, (px, py) in enumerate(petal_spots):
        c = PK if i % 2 == 0 else RP
        set_px(t, px, py, c)
        if i % 3 == 0:
            set_px(t, px + 1, py, FL)
    tiles.append(t)

    # Tile 1,0: Dense flower patch (ground cover)
    t = blank(16, 16)
    for y in range(16):
        for x in range(16):
            if (x + y) % 5 == 0:
                set_px(t, x, y, LG)
            elif (x * 3 + y * 7) % 11 == 0:
                set_px(t, x, y, PK)
            elif (x * 5 + y * 3) % 13 == 0:
                set_px(t, x, y, YL)
    tiles.append(t)

    # Tile 2,0: Grass with wildflowers
    t = blank(16, 16)
    # Grass base strokes
    for x in range(0, 16, 3):
        set_px(t, x, 10, FG)
        set_px(t, x, 11, LG)
        set_px(t, x + 1, 9, BG)
    # Flowers poking up
    set_px(t, 3, 7, PK)
    set_px(t, 3, 8, FG)
    set_px(t, 8, 6, YL)
    set_px(t, 8, 7, FG)
    set_px(t, 12, 8, RP)
    set_px(t, 12, 9, FG)
    tiles.append(t)

    # Tile 3,0: Mushroom patch
    t = blank(16, 16)
    # Mushroom 1
    fill_rect(t, 3, 10, 4, 1, RP)
    fill_rect(t, 4, 11, 2, 3, PS)
    set_px(t, 4, 10, PK)
    set_px(t, 5, 10, NW)  # spot
    # Mushroom 2 (smaller)
    fill_rect(t, 10, 12, 3, 1, PK)
    set_px(t, 11, 13, PS)
    set_px(t, 11, 14, PS)
    tiles.append(t)

    # Tile 4,0: Fallen cherry blossom branch
    t = blank(16, 16)
    for x in range(2, 14):
        set_px(t, x, 10, BN)
    set_px(t, 4, 9, PK)
    set_px(t, 5, 8, PK)
    set_px(t, 6, 9, RP)
    set_px(t, 10, 9, PK)
    set_px(t, 11, 8, FL)
    set_px(t, 12, 9, PK)
    tiles.append(t)

    # Tile 5,0: Petal puddle (pink water)
    t = blank(16, 16)
    # Water oval
    for y in range(6, 12):
        for x in range(4, 12):
            cx, cy = 8.0, 9.0
            if ((x - cx) / 4.0) ** 2 + ((y - cy) / 3.0) ** 2 <= 1.0:
                set_px(t, x, y, HB)
    # Petals floating
    set_px(t, 6, 8, PK)
    set_px(t, 9, 7, RP)
    set_px(t, 7, 9, PK)
    tiles.append(t)

    # Tile 6,0: Clover patch
    t = blank(16, 16)
    def draw_clover(grid, cx, cy):
        set_px(grid, cx, cy - 1, LG)
        set_px(grid, cx - 1, cy, LG)
        set_px(grid, cx + 1, cy, LG)
        set_px(grid, cx, cy + 1, FG)  # stem
    draw_clover(t, 4, 6)
    draw_clover(t, 10, 8)
    draw_clover(t, 7, 12)
    tiles.append(t)

    # Tile 7,0: Butterfly rest spot (small stones + butterfly)
    t = blank(16, 16)
    set_px(t, 6, 12, ST)
    set_px(t, 7, 12, MG)
    set_px(t, 8, 12, ST)
    set_px(t, 9, 11, LS)
    # Butterfly
    set_px(t, 8, 6, K)  # body
    set_px(t, 7, 5, PK)  # left wing
    set_px(t, 6, 5, RP)
    set_px(t, 9, 5, PK)  # right wing
    set_px(t, 10, 5, RP)
    set_px(t, 7, 7, FL)
    set_px(t, 9, 7, FL)
    tiles.append(t)

    row0 = hstack(tiles[:8])

    # ── Row 1: Vegetation ──
    tiles_r1 = []

    # Tile 0,1: Flower bush (dense)
    t = blank(16, 16)
    # Bush body
    fill_rect(t, 3, 6, 10, 8, FG)
    fill_rect(t, 4, 5, 8, 1, LG)
    fill_rect(t, 5, 4, 6, 1, BG)
    # Flowers
    for fx, fy in [(4, 6), (7, 5), (10, 7), (5, 9), (9, 8), (12, 6)]:
        set_px(t, fx, fy, PK)
    for fx, fy in [(6, 7), (8, 6), (11, 8)]:
        set_px(t, fx, fy, YL)
    # Dark base
    fill_rect(t, 3, 13, 10, 1, DF)
    tiles_r1.append(t)

    # Tile 1,1: Vine column (vertical)
    t = blank(16, 16)
    for y in range(16):
        set_px(t, 7, y, FG)
        set_px(t, 8, y, DF)
    # Leaves branching off
    for ly in [2, 6, 10, 14]:
        set_px(t, 5, ly, LG)
        set_px(t, 6, ly, BG)
        set_px(t, 9, ly + 1, BG)
        set_px(t, 10, ly + 1, LG)
    # Small flowers on vine
    set_px(t, 5, 4, PK)
    set_px(t, 10, 9, PK)
    tiles_r1.append(t)

    # Tile 2,1: Cherry blossom tree top (left half)
    t = blank(16, 16)
    # Canopy
    for y in range(2, 12):
        for x in range(0, 14):
            if ((x - 8) ** 2 + (y - 6) ** 2) < 36:
                c = PK if (x + y) % 4 == 0 else (RP if (x + y) % 5 == 0 else FL)
                set_px(t, x, y, c)
    # Trunk peek
    set_px(t, 7, 12, BN)
    set_px(t, 8, 12, BN)
    set_px(t, 7, 13, BN)
    set_px(t, 8, 13, DT)
    set_px(t, 7, 14, BN)
    set_px(t, 8, 14, BN)
    set_px(t, 7, 15, BD)
    set_px(t, 8, 15, BD)
    tiles_r1.append(t)

    # Tile 3,1: Cherry blossom tree top (right half)
    t = blank(16, 16)
    for y in range(2, 12):
        for x in range(2, 16):
            if ((x - 8) ** 2 + (y - 6) ** 2) < 36:
                c = PK if (x + y) % 3 == 0 else (RP if (x + y) % 5 == 0 else FL)
                set_px(t, x, y, c)
    set_px(t, 7, 12, BN)
    set_px(t, 8, 12, BN)
    set_px(t, 7, 13, DT)
    set_px(t, 8, 13, BN)
    set_px(t, 7, 14, BN)
    set_px(t, 8, 14, BN)
    set_px(t, 7, 15, BD)
    set_px(t, 8, 15, BD)
    tiles_r1.append(t)

    # Tile 4,1: Flower bed border (horizontal)
    t = blank(16, 16)
    # Soil base
    fill_rect(t, 0, 10, 16, 6, BD)
    fill_rect(t, 0, 10, 16, 2, BN)
    # Row of flowers
    for x in range(1, 15, 3):
        stem_h = 3 if x % 6 == 1 else 4
        for sy in range(10 - stem_h, 10):
            set_px(t, x, sy, FG)
        set_px(t, x, 10 - stem_h - 1, PK if x % 2 == 0 else YL)
        set_px(t, x - 1, 10 - stem_h, LG)
        set_px(t, x + 1, 10 - stem_h, LG)
    tiles_r1.append(t)

    # Tile 5,1: Hanging vine (top attachment)
    t = blank(16, 16)
    # Main vine drops
    for y in range(16):
        wave = 1 if y % 6 < 3 else 0
        set_px(t, 4 + wave, y, FG)
        set_px(t, 11 - wave, y, FG)
    # Leaves
    for y in [3, 7, 11]:
        set_px(t, 3, y, LG)
        set_px(t, 5, y + 1, BG)
        set_px(t, 10, y, BG)
        set_px(t, 12, y + 1, LG)
    # Small blossoms
    set_px(t, 3, 5, PK)
    set_px(t, 12, 9, PK)
    tiles_r1.append(t)

    # Tile 6,1: Tall grass with butterflies
    t = blank(16, 16)
    # Tall grass blades
    for x in [2, 5, 8, 11, 14]:
        for y in range(7, 16):
            set_px(t, x, y, FG if y > 10 else LG)
        set_px(t, x, 6, BG)
    # Butterfly
    set_px(t, 7, 3, K)
    set_px(t, 6, 2, MV)
    set_px(t, 8, 2, MV)
    set_px(t, 5, 3, SG)
    set_px(t, 9, 3, SG)
    tiles_r1.append(t)

    # Tile 7,1: Spring pond edge (water + lily pad)
    t = blank(16, 16)
    # Water
    fill_rect(t, 0, 8, 16, 8, SB)
    fill_rect(t, 0, 8, 16, 2, HB)
    # Bank edge
    fill_rect(t, 0, 6, 16, 2, BG)
    fill_rect(t, 0, 5, 16, 1, LG)
    # Lily pad
    fill_rect(t, 5, 10, 4, 2, LG)
    set_px(t, 5, 10, FG)
    set_px(t, 8, 10, FG)
    # Lily flower
    set_px(t, 6, 9, PK)
    set_px(t, 7, 9, NW)
    tiles_r1.append(t)

    row1 = hstack(tiles_r1[:8])

    # ── Row 2: Structures / Event objects ──
    tiles_r2 = []

    # Tile 0,2: Wooden trellis with flowers
    t = blank(16, 16)
    # Vertical posts
    for y in range(16):
        set_px(t, 2, y, BN)
        set_px(t, 13, y, BN)
    # Horizontal bars
    for x in range(2, 14):
        set_px(t, x, 3, DT)
        set_px(t, x, 10, DT)
    # Flowers growing on trellis
    set_px(t, 5, 2, PK)
    set_px(t, 8, 1, YL)
    set_px(t, 11, 2, PK)
    set_px(t, 4, 9, RP)
    set_px(t, 9, 8, PK)
    # Vines
    set_px(t, 3, 5, FG)
    set_px(t, 4, 6, LG)
    set_px(t, 12, 6, FG)
    set_px(t, 11, 7, LG)
    tiles_r2.append(t)

    # Tile 1,2: Spring lantern (paper lantern on post)
    t = blank(16, 16)
    # Post
    for y in range(8, 16):
        set_px(t, 7, y, BN)
        set_px(t, 8, y, DT)
    # Lantern body
    fill_rect(t, 5, 2, 6, 6, PK)
    fill_rect(t, 6, 2, 4, 6, RP)
    # Glow center
    set_px(t, 7, 4, YL)
    set_px(t, 8, 4, GD)
    # Top/bottom caps
    fill_rect(t, 5, 1, 6, 1, ER)
    fill_rect(t, 5, 8, 6, 1, ER)
    # String
    set_px(t, 8, 0, K)
    tiles_r2.append(t)

    # Tile 2,2: Wishing well (spring decorated)
    t = blank(16, 16)
    # Well body
    fill_rect(t, 3, 8, 10, 6, ST)
    fill_rect(t, 4, 8, 8, 1, MG)
    # Water inside
    fill_rect(t, 5, 10, 6, 3, SB)
    set_px(t, 6, 10, HB)
    # Roof
    fill_rect(t, 2, 4, 12, 2, BN)
    fill_rect(t, 3, 3, 10, 1, DT)
    # Posts
    set_px(t, 4, 6, BN)
    set_px(t, 4, 7, BN)
    set_px(t, 11, 6, BN)
    set_px(t, 11, 7, BN)
    # Flower decorations
    set_px(t, 3, 3, PK)
    set_px(t, 12, 3, PK)
    set_px(t, 7, 2, YL)
    set_px(t, 8, 2, FL)
    tiles_r2.append(t)

    # Tile 3,2: Event flag/banner pole
    t = blank(16, 16)
    # Pole
    for y in range(2, 16):
        set_px(t, 3, y, DT)
    set_px(t, 3, 1, GD)  # gold finial
    # Banner fabric
    fill_rect(t, 4, 2, 8, 10, FL)
    fill_rect(t, 5, 3, 6, 8, BG)
    # Flower emblem
    set_px(t, 7, 6, YL)
    set_px(t, 8, 6, GD)
    set_px(t, 6, 5, PK)
    set_px(t, 9, 5, PK)
    set_px(t, 6, 7, PK)
    set_px(t, 9, 7, PK)
    set_px(t, 7, 5, RP)
    set_px(t, 8, 7, RP)
    # Banner bottom (pointed)
    set_px(t, 5, 12, BG)
    set_px(t, 10, 12, BG)
    set_px(t, 6, 13, FL)
    set_px(t, 9, 13, FL)
    set_px(t, 7, 14, BG)
    set_px(t, 8, 14, BG)
    tiles_r2.append(t)

    # Tile 4,2: Stone planter with spring flowers
    t = blank(16, 16)
    # Stone pot
    fill_rect(t, 4, 10, 8, 5, ST)
    fill_rect(t, 5, 10, 6, 1, MG)
    fill_rect(t, 3, 14, 10, 2, ST)
    # Soil
    fill_rect(t, 5, 9, 6, 1, BD)
    # Flowers
    set_px(t, 6, 6, PK)
    set_px(t, 6, 7, FG)
    set_px(t, 6, 8, FG)
    set_px(t, 8, 5, YL)
    set_px(t, 8, 6, FG)
    set_px(t, 8, 7, FG)
    set_px(t, 8, 8, FG)
    set_px(t, 10, 7, RP)
    set_px(t, 10, 8, FG)
    # Leaves
    set_px(t, 5, 7, LG)
    set_px(t, 7, 6, BG)
    set_px(t, 9, 6, LG)
    tiles_r2.append(t)

    # Tile 5,2: Fairy ring (mushroom circle)
    t = blank(16, 16)
    ring_positions = [(3,4), (7,2), (11,4), (13,8), (11,12), (7,14), (3,12), (1,8)]
    for i, (rx, ry) in enumerate(ring_positions):
        cap_c = PK if i % 2 == 0 else RP
        set_px(t, rx, ry, cap_c)
        set_px(t, rx + 1, ry, cap_c)
        set_px(t, rx, ry + 1, PS)
    # Magic glow in center
    set_px(t, 7, 8, SG)
    set_px(t, 8, 8, MV)
    tiles_r2.append(t)

    # Tile 6,2: Bee hive (spring pollination)
    t = blank(16, 16)
    # Hive body (hanging from top)
    set_px(t, 7, 0, BN)
    set_px(t, 8, 0, BN)
    fill_rect(t, 6, 1, 4, 2, DG)
    fill_rect(t, 5, 3, 6, 4, GD)
    fill_rect(t, 6, 7, 4, 3, DG)
    set_px(t, 7, 10, BN)
    set_px(t, 8, 10, BN)
    # Entrance
    set_px(t, 7, 8, K)
    set_px(t, 8, 8, K)
    # Bees (tiny dots)
    set_px(t, 3, 5, YL)
    set_px(t, 12, 3, YL)
    set_px(t, 10, 7, YL)
    tiles_r2.append(t)

    # Tile 7,2: Event quest marker (spring themed)
    t = blank(16, 16)
    # Glowing spring orb
    fill_rect(t, 5, 4, 6, 6, BG)
    fill_rect(t, 6, 3, 4, 1, LG)
    fill_rect(t, 6, 10, 4, 1, LG)
    set_px(t, 5, 5, FG)
    set_px(t, 10, 5, FG)
    set_px(t, 5, 8, FG)
    set_px(t, 10, 8, FG)
    # Inner glow
    set_px(t, 7, 6, FL)
    set_px(t, 8, 6, NW)
    set_px(t, 7, 7, NW)
    set_px(t, 8, 7, FL)
    # Petal accents
    set_px(t, 7, 3, PK)
    set_px(t, 8, 3, PK)
    set_px(t, 5, 6, PK)
    set_px(t, 10, 7, PK)
    # Base sparkles
    set_px(t, 6, 12, SG)
    set_px(t, 9, 13, SG)
    set_px(t, 7, 14, MV)
    tiles_r2.append(t)

    row2 = hstack(tiles_r2[:8])
    full_tileset = vstack([row0, row1, row2])
    write_png(os.path.join(TILESET_DIR, 'tileset_seasonal_spring.png'), full_tileset)


# ═══════════════════════════════════════════════════════════════════════════════
# SPRING REWARD ITEMS — 16×16 each
# Follow icon style: clear silhouette, 4-6 palette colors per icon
# ═══════════════════════════════════════════════════════════════════════════════

def make_spring_rewards():

    # 1. Blossom Blade — pink-edged sword with flower guard
    t = blank(16, 16)
    # Blade (diagonal, bottom-left to top-right)
    for i in range(8):
        set_px(t, 4 + i, 11 - i, PG)
        set_px(t, 5 + i, 11 - i, NW)
    # Pink edge
    for i in range(8):
        set_px(t, 3 + i, 12 - i, PK)
    # Guard (flower-shaped)
    set_px(t, 4, 12, GD)
    set_px(t, 5, 12, YL)
    set_px(t, 3, 11, PK)
    set_px(t, 6, 11, PK)
    set_px(t, 4, 13, RP)
    set_px(t, 5, 13, RP)
    # Handle
    set_px(t, 3, 13, BN)
    set_px(t, 2, 14, BN)
    set_px(t, 1, 15, DT)
    # Tip sparkle
    set_px(t, 12, 3, NW)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_spring_blossom_blade.png'), t)

    # 2. Petal Bow — curved bow with flower string
    t = blank(16, 16)
    # Bow body (curved)
    for y in range(2, 14):
        x_off = int(2.5 * ((y - 8) / 6.0) ** 2)
        set_px(t, 4 + x_off, y, FG)
    # Bow tips
    set_px(t, 5, 1, LG)
    set_px(t, 5, 14, LG)
    # String
    for y in range(3, 13):
        set_px(t, 10, y, PG)
    # Petal decorations
    set_px(t, 5, 5, PK)
    set_px(t, 5, 11, PK)
    set_px(t, 4, 8, YL)
    # Arrow
    set_px(t, 11, 7, LS)
    set_px(t, 12, 7, MG)
    set_px(t, 13, 7, ST)
    set_px(t, 14, 7, K)
    set_px(t, 14, 6, K)
    set_px(t, 14, 8, K)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_spring_petal_bow.png'), t)

    # 3. Vine Armor — green chest piece with vine motif
    t = blank(16, 16)
    # Armor body
    fill_rect(t, 4, 4, 8, 9, FG)
    fill_rect(t, 5, 3, 6, 1, LG)
    # Shoulder pads
    fill_rect(t, 2, 4, 2, 3, DF)
    fill_rect(t, 12, 4, 2, 3, DF)
    # Vine detail (diagonal cross)
    for i in range(5):
        set_px(t, 5 + i, 5 + i, BG)
        set_px(t, 10 - i, 5 + i, BG)
    # Center flower
    set_px(t, 7, 7, PK)
    set_px(t, 8, 7, YL)
    # Leaf accents
    set_px(t, 5, 6, FL)
    set_px(t, 10, 6, FL)
    # Bottom edge
    fill_rect(t, 4, 13, 8, 1, DF)
    set_px(t, 4, 12, LG)
    set_px(t, 11, 12, LG)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_spring_vine_armor.png'), t)

    # 4. Flower Crown — circlet with flowers (cosmetic headpiece)
    t = blank(16, 16)
    # Crown band (curved)
    for x in range(4, 12):
        y = 8 + int(1.5 * ((x - 8) / 4.0) ** 2)
        set_px(t, x, y, GD)
        set_px(t, x, y + 1, DG)
    # Flowers on top
    set_px(t, 5, 7, PK)
    set_px(t, 7, 6, YL)
    set_px(t, 8, 5, PK)
    set_px(t, 9, 6, RP)
    set_px(t, 11, 7, PK)
    # Leaves between flowers
    set_px(t, 6, 7, LG)
    set_px(t, 10, 7, LG)
    set_px(t, 8, 6, BG)
    # Side drops
    set_px(t, 3, 9, GD)
    set_px(t, 3, 10, PK)
    set_px(t, 12, 9, GD)
    set_px(t, 12, 10, PK)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_spring_flower_crown.png'), t)

    # 5. Butterfly Wings — ethereal wing back piece (cosmetic)
    t = blank(16, 16)
    # Left wing (upper)
    fill_rect(t, 2, 3, 4, 4, MV)
    set_px(t, 3, 4, SG)
    set_px(t, 4, 5, PK)
    set_px(t, 2, 3, RP)
    # Left wing (lower)
    fill_rect(t, 3, 8, 3, 3, MV)
    set_px(t, 4, 9, SG)
    # Right wing (upper)
    fill_rect(t, 10, 3, 4, 4, MV)
    set_px(t, 12, 4, SG)
    set_px(t, 11, 5, PK)
    set_px(t, 13, 3, RP)
    # Right wing (lower)
    fill_rect(t, 10, 8, 3, 3, MV)
    set_px(t, 11, 9, SG)
    # Body center
    set_px(t, 7, 5, K)
    set_px(t, 8, 5, K)
    set_px(t, 7, 6, K)
    set_px(t, 8, 6, K)
    set_px(t, 7, 7, K)
    set_px(t, 8, 7, K)
    # Wing edges
    set_px(t, 1, 4, FL)
    set_px(t, 14, 4, FL)
    # Sparkle trail
    set_px(t, 5, 11, SG)
    set_px(t, 10, 12, SG)
    set_px(t, 7, 13, MV)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_spring_butterfly_wings.png'), t)

    # 6. Seed Pouch — cloth bag with seeds spilling out
    t = blank(16, 16)
    # Bag body
    fill_rect(t, 4, 6, 8, 8, BN)
    fill_rect(t, 5, 5, 6, 1, DT)
    # Tie/drawstring
    set_px(t, 7, 4, GD)
    set_px(t, 8, 4, GD)
    set_px(t, 6, 3, GD)
    set_px(t, 9, 3, GD)
    # Bag texture
    set_px(t, 6, 8, DT)
    set_px(t, 9, 10, DT)
    # Seeds spilling
    set_px(t, 3, 13, LG)
    set_px(t, 5, 14, FG)
    set_px(t, 2, 14, BG)
    set_px(t, 4, 15, LG)
    # Flower emblem on bag
    set_px(t, 7, 9, PK)
    set_px(t, 8, 9, YL)
    set_px(t, 7, 10, LG)
    # Shadow
    fill_rect(t, 5, 14, 6, 1, BD)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_spring_seed_pouch.png'), t)


# ═══════════════════════════════════════════════════════════════════════════════
# SPRING EVENT BANNER — 128×48 (matches existing seasonal banner format)
# Cherry blossom tree silhouette, "SPRING BLOOM" event title area,
# flower border, green/pink color scheme
# ═══════════════════════════════════════════════════════════════════════════════

def make_spring_banner():
    g = blank(128, 48)

    # Background gradient (light green to pale)
    for y in range(48):
        for x in range(128):
            if y < 16:
                g[y][x] = FL
            elif y < 32:
                g[y][x] = BG
            else:
                g[y][x] = LG

    # Border frame
    draw_rect_outline(g, 0, 0, 128, 48, DF)
    draw_rect_outline(g, 1, 1, 126, 46, FG)

    # Cherry blossom tree (left side)
    # Trunk
    for y in range(18, 46):
        set_px(g, 14, y, BN)
        set_px(g, 15, y, DT)
        set_px(g, 16, y, BN)
    # Branches
    for x in range(10, 25):
        set_px(g, x, 18, BN)
    for x in range(8, 20):
        set_px(g, x, 14, BN)
    # Canopy blossoms
    for y in range(4, 22):
        for x in range(4, 28):
            dist = ((x - 15) ** 2 + (y - 12) ** 2)
            if dist < 80:
                if (x + y) % 3 == 0:
                    g[y][x] = PK
                elif (x + y) % 4 == 0:
                    g[y][x] = RP
                elif (x + y) % 5 == 0:
                    g[y][x] = NW
                else:
                    g[y][x] = FL

    # Cherry blossom tree (right side, mirrored)
    for y in range(20, 46):
        set_px(g, 112, y, BN)
        set_px(g, 113, y, DT)
        set_px(g, 114, y, BN)
    for x in range(105, 120):
        set_px(g, x, 20, BN)
    for x in range(108, 122):
        set_px(g, x, 16, BN)
    for y in range(6, 24):
        for x in range(100, 124):
            dist = ((x - 113) ** 2 + (y - 14) ** 2)
            if dist < 80:
                if (x + y) % 3 == 0:
                    g[y][x] = PK
                elif (x + y) % 4 == 0:
                    g[y][x] = RP
                elif (x + y) % 5 == 0:
                    g[y][x] = NW
                else:
                    g[y][x] = FL

    # Center text area (darker background panel)
    fill_rect(g, 30, 10, 68, 28, DF)
    fill_rect(g, 31, 11, 66, 26, FG)
    fill_rect(g, 32, 12, 64, 24, LG)
    draw_rect_outline(g, 31, 11, 66, 26, GD)

    # "SPRING" text (pixel font, ~5px tall)
    # S
    fill_rect(g, 38, 16, 4, 1, K)
    set_px(g, 37, 17, K)
    fill_rect(g, 38, 18, 3, 1, K)
    set_px(g, 40, 19, K)
    fill_rect(g, 37, 20, 4, 1, K)
    # P
    fill_rect(g, 43, 16, 1, 5, K)
    fill_rect(g, 44, 16, 3, 1, K)
    set_px(g, 46, 17, K)
    fill_rect(g, 44, 18, 3, 1, K)
    # R
    fill_rect(g, 48, 16, 1, 5, K)
    fill_rect(g, 49, 16, 3, 1, K)
    set_px(g, 51, 17, K)
    fill_rect(g, 49, 18, 3, 1, K)
    set_px(g, 50, 19, K)
    set_px(g, 51, 20, K)
    # I
    fill_rect(g, 53, 16, 3, 1, K)
    set_px(g, 54, 17, K)
    set_px(g, 54, 18, K)
    set_px(g, 54, 19, K)
    fill_rect(g, 53, 20, 3, 1, K)
    # N
    fill_rect(g, 57, 16, 1, 5, K)
    set_px(g, 58, 17, K)
    set_px(g, 59, 18, K)
    set_px(g, 60, 19, K)
    fill_rect(g, 61, 16, 1, 5, K)
    # G
    fill_rect(g, 63, 16, 4, 1, K)
    set_px(g, 63, 17, K)
    set_px(g, 63, 18, K)
    set_px(g, 65, 18, K)
    set_px(g, 66, 18, K)
    set_px(g, 63, 19, K)
    set_px(g, 66, 19, K)
    fill_rect(g, 63, 20, 4, 1, K)

    # "BLOOM" subtitle text
    # B
    fill_rect(g, 42, 25, 1, 5, K)
    fill_rect(g, 43, 25, 2, 1, K)
    set_px(g, 44, 26, K)
    fill_rect(g, 43, 27, 2, 1, K)
    set_px(g, 44, 28, K)
    fill_rect(g, 43, 29, 2, 1, K)
    # L
    fill_rect(g, 47, 25, 1, 5, K)
    fill_rect(g, 48, 29, 3, 1, K)
    # O
    fill_rect(g, 52, 25, 3, 1, K)
    set_px(g, 51, 26, K)
    set_px(g, 54, 26, K)
    set_px(g, 51, 27, K)
    set_px(g, 54, 27, K)
    set_px(g, 51, 28, K)
    set_px(g, 54, 28, K)
    fill_rect(g, 52, 29, 3, 1, K)
    # O
    fill_rect(g, 57, 25, 3, 1, K)
    set_px(g, 56, 26, K)
    set_px(g, 59, 26, K)
    set_px(g, 56, 27, K)
    set_px(g, 59, 27, K)
    set_px(g, 56, 28, K)
    set_px(g, 59, 28, K)
    fill_rect(g, 57, 29, 3, 1, K)
    # M
    fill_rect(g, 61, 25, 1, 5, K)
    set_px(g, 62, 26, K)
    set_px(g, 63, 27, K)
    set_px(g, 64, 26, K)
    fill_rect(g, 65, 25, 1, 5, K)

    # Decorative flowers in banner corners
    flower_positions = [(33, 13), (93, 13), (33, 33), (93, 33)]
    for fx, fy in flower_positions:
        set_px(g, fx, fy, YL)
        set_px(g, fx - 1, fy, PK)
        set_px(g, fx + 1, fy, PK)
        set_px(g, fx, fy - 1, PK)
        set_px(g, fx, fy + 1, PK)

    # Falling petals
    petal_scatter = [
        (35, 42), (42, 44), (50, 40), (62, 43), (78, 41),
        (85, 45), (95, 42), (55, 3), (72, 5), (45, 6),
    ]
    for px, py in petal_scatter:
        set_px(g, px, py, PK)

    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_seasonal_banner_spring_event.png'), g)


# ═══════════════════════════════════════════════════════════════════════════════
# SPRING UI DECORATIONS — corner and divider pieces (16×16 each)
# ═══════════════════════════════════════════════════════════════════════════════

def make_spring_ui_decor():
    # Corner decoration (flower vine corner piece for UI panels)
    t = blank(16, 16)
    # Vine L-shape
    for x in range(16):
        set_px(t, x, 15, FG)
    for y in range(16):
        set_px(t, 0, y, FG)
    # Corner flower
    set_px(t, 1, 14, YL)
    set_px(t, 0, 13, PK)
    set_px(t, 2, 13, PK)
    set_px(t, 1, 12, PK)
    set_px(t, 1, 15, RP)
    # Leaves along vine
    set_px(t, 5, 14, LG)
    set_px(t, 9, 14, BG)
    set_px(t, 13, 14, LG)
    set_px(t, 1, 10, LG)
    set_px(t, 1, 6, BG)
    set_px(t, 1, 3, LG)
    # Small buds
    set_px(t, 7, 13, PK)
    set_px(t, 2, 8, PK)
    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_spring_decor_corner.png'), t)

    # Divider (horizontal flower vine divider)
    t = blank(16, 16)
    # Center vine line
    for x in range(16):
        set_px(t, x, 7, FG)
        set_px(t, x, 8, DF)
    # Flowers along divider
    set_px(t, 3, 6, PK)
    set_px(t, 3, 5, RP)
    set_px(t, 8, 6, YL)
    set_px(t, 8, 5, PK)
    set_px(t, 13, 6, PK)
    set_px(t, 13, 5, RP)
    # Leaves
    set_px(t, 1, 6, LG)
    set_px(t, 5, 9, BG)
    set_px(t, 10, 6, LG)
    set_px(t, 15, 9, BG)
    # Vine curls
    set_px(t, 0, 6, BG)
    set_px(t, 0, 5, FG)
    set_px(t, 15, 9, BG)
    set_px(t, 15, 10, FG)
    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_spring_decor_divider.png'), t)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print('=== Spring Seasonal Event Art Pack (PIX-255) ===\n')

    print('-- Spring Event Enemies --')
    make_flower_golem()
    make_pollen_wisp()
    make_thorn_beetle()
    make_bloom_spider()

    print('\n-- Spring Guardian Boss --')
    make_spring_guardian()

    print('\n-- Spring Decoration Tileset --')
    make_spring_tileset()

    print('\n-- Spring Reward Items --')
    make_spring_rewards()

    print('\n-- Spring Event Banner --')
    make_spring_banner()

    print('\n-- Spring UI Decorations --')
    make_spring_ui_decor()

    print('\n=== Done! All spring event assets generated. ===')
