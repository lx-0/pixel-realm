#!/usr/bin/env python3
"""
Generate winter seasonal event art pack for PixelRealm (PIX-266).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md exactly:
  - 32-color master palette, SNES-era RPG style
  - Nearest-neighbor pixel art, no anti-aliasing
  - Naming convention: {category}_{name}_{variant}.{ext}

Completes the four-season cycle (spring PIX-255, summer PIX-260, fall PIX-264).

Outputs:
  -- Winter Event Enemies (128x16 horizontal strips, 8 frames x 16px) --
  assets/sprites/enemies/event/char_enemy_frost_wraith.png   (small 12x12 centered in 16x16)
  assets/sprites/enemies/event/char_enemy_ice_golem.png      (small 12x12 centered in 16x16)
  assets/sprites/enemies/event/char_enemy_blizzard_elemental.png (small 12x12 centered in 16x16)
  assets/sprites/enemies/event/char_enemy_snow_stalker.png   (small 12x12 centered in 16x16)

  -- Winter Event Boss: Frost Monarch (256x32, 8 frames x 32px) --
  assets/sprites/enemies/event/char_enemy_boss_frost_monarch.png

  -- Winter Decoration Tileset (128x48, 8x3 tiles of 16x16) --
  assets/tiles/tilesets/tileset_seasonal_winter.png

  -- Winter Reward Item Sprites (16x16 each) --
  assets/sprites/pickups/icon_reward_winter_glacial_staff.png
  assets/sprites/pickups/icon_reward_winter_frostbite_blade.png
  assets/sprites/pickups/icon_reward_winter_snowdrift_cloak.png
  assets/sprites/pickups/icon_reward_winter_aurora_crown.png
  assets/sprites/pickups/icon_reward_winter_icicle_amulet.png
  assets/sprites/pickups/icon_reward_winter_season_coin.png

  -- Winter Event Banner (128x48) --
  assets/ui/seasonal/ui_seasonal_banner_winter_event.png

  -- Winter Event UI Decorations (16x16 each) --
  assets/ui/seasonal/ui_winter_decor_corner.png
  assets/ui/seasonal/ui_winter_decor_divider.png

  -- Winter Character Overlay --
  assets/sprites/characters/char_overlay_hat_winter.png
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

# --- Palette (RGBA tuples) --- from ART-STYLE-GUIDE.md ----------------------

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

# --- Winter-specific color shortcuts -----------------------------------------
# Winter uses icy blues, silver-whites, deep purples, frosty cyan accents
# Ice core: HB (ice/pale water), IW (ice white), PB (player blue)
# Frost: PG (pale gray), NW (near white), LS (light stone)
# Deep cold: DP (ocean blue), OC (deep ocean), SB (sky blue)
# Aurora: MV (mana violet), SG (spell glow), MP (magic purple)
IC  = HB   # ice core (pale blue)
FW  = IW   # frost white (shimmer)
DI  = DP   # deep ice (dark blue)
SY  = SB   # sky ice (mid blue)
AU  = MV   # aurora violet
AG  = SG   # aurora glow

# --- PNG writer --------------------------------------------------------------

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

# --- Sprite helpers ----------------------------------------------------------

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


# =============================================================================
# ENEMY 1: FROST WRAITH -- spectral ice ghost, 16x16, 8 frames
# Frames 0-3: idle float/shimmer, Frames 4-7: attack (frost beam)
# Color: pale ice body (HB/IW), deep blue core (DP/SB), purple eyes (MV/SG)
# =============================================================================

def make_frost_wraith():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        # Ghostly float bob
        bob = [0, -1, -2, -1][anim]

        # Wispy tail (bottom, fading translucent)
        tail_y = 12 + bob
        set_px(g, 7, tail_y + 1, SY)
        set_px(g, 8, tail_y + 1, DI)
        set_px(g, 7, tail_y + 2, DI)
        set_px(g, 6, tail_y + 2, OC)
        trail_sway = [-1, 0, 1, 0][anim]
        set_px(g, 7 + trail_sway, tail_y + 3, OC)

        # Body (ethereal ice form)
        cy = 7 + bob
        fill_rect(g, 6, cy, 4, 5, IC)
        set_px(g, 5, cy + 1, IC)
        set_px(g, 5, cy + 2, SY)
        set_px(g, 10, cy + 1, IC)
        set_px(g, 10, cy + 2, SY)
        # Core shimmer
        set_px(g, 7, cy + 1, FW)
        set_px(g, 8, cy + 2, IW)
        set_px(g, 7, cy + 3, PG)

        # Arms (wispy tendrils)
        if not is_attack:
            arm_sway = [0, -1, 0, 1][anim]
            set_px(g, 4, cy + 2 + arm_sway, IC)
            set_px(g, 3, cy + 1 + arm_sway, SY)
            set_px(g, 11, cy + 2 - arm_sway, IC)
            set_px(g, 12, cy + 1 - arm_sway, SY)
        else:
            # Frost beam -- arms extend with ice particles
            beam_len = [1, 2, 3, 2][anim]
            for bd in range(1, beam_len + 1):
                set_px(g, 4 - bd, cy + 2, IC)
                set_px(g, 11 + bd, cy + 2, IC)
            if beam_len >= 2:
                set_px(g, 2, cy + 1, FW)
                set_px(g, 13, cy + 1, FW)
            if beam_len >= 3:
                set_px(g, 1, cy + 2, NW)
                set_px(g, 14, cy + 2, NW)

        # Head (hooded spectral form)
        set_px(g, 6, cy - 2, DI)
        set_px(g, 7, cy - 2, SY)
        set_px(g, 8, cy - 2, SY)
        set_px(g, 9, cy - 2, DI)
        set_px(g, 6, cy - 1, SY)
        set_px(g, 7, cy - 1, IC)
        set_px(g, 8, cy - 1, IC)
        set_px(g, 9, cy - 1, SY)
        # Hood peak
        set_px(g, 7, cy - 3, DI)
        set_px(g, 8, cy - 3, OC)

        # Eyes (glowing purple, spectral)
        set_px(g, 7, cy - 1, AU)
        set_px(g, 8, cy - 1, AG)

        # Frost particles drifting
        particle_sets = [
            [(3, 5), (12, 9)],
            [(4, 6), (11, 8)],
            [(3, 8), (12, 6)],
            [(4, 7), (11, 7)],
        ]
        for px, py in particle_sets[anim]:
            set_px(g, px, py + bob, FW)

        # Outline key pixels
        set_px(g, 6, cy - 3, K)
        set_px(g, 9, cy - 3, K)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_frost_wraith.png'), sheet)


# =============================================================================
# ENEMY 2: ICE GOLEM -- chunky ice/stone construct, 16x16, 8 frames
# Frames 0-3: idle sway (crystal shimmer), Frames 4-7: attack (ice smash)
# Color: blue-gray body (ST/LS/MG), ice crystals (HB/IW), red eyes (BR/ER)
# =============================================================================

def make_ice_golem():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, 0, -1, 0][anim] if not is_attack else 0
        slam = [0, 1, 2, 1][anim] if is_attack else 0

        # Feet (heavy stone blocks)
        set_px(g, 5, 14 + bob, ST)
        set_px(g, 6, 14 + bob, MG)
        set_px(g, 9, 14 + bob, MG)
        set_px(g, 10, 14 + bob, ST)
        set_px(g, 5, 15, DK)
        set_px(g, 6, 15, ST)
        set_px(g, 9, 15, ST)
        set_px(g, 10, 15, DK)

        # Body (massive ice-stone torso)
        for dy in range(7, 14 + bob):
            set_px(g, 5, dy, DK)
            set_px(g, 6, dy, ST)
            set_px(g, 7, dy, MG)
            set_px(g, 8, dy, LS)
            set_px(g, 9, dy, ST)
            set_px(g, 10, dy, DK)
        # Ice crystal veins on body
        set_px(g, 7, 9 + bob, IC)
        set_px(g, 8, 10 + bob, HB)
        set_px(g, 6, 11 + bob, SY)

        # Arms (stone/ice fists)
        if not is_attack:
            arm_y = 10 + bob + [0, 0, -1, 0][anim]
            set_px(g, 3, arm_y, ST)
            set_px(g, 4, arm_y, MG)
            set_px(g, 11, arm_y, MG)
            set_px(g, 12, arm_y, ST)
            # Ice fist accents
            set_px(g, 2, arm_y - 1, IC)
            set_px(g, 13, arm_y - 1, IC)
        else:
            # Ice smash -- fists slam down
            arm_y = 10
            set_px(g, 3, arm_y, MG)
            set_px(g, 4, arm_y, ST)
            set_px(g, 11, arm_y, ST)
            set_px(g, 12, arm_y, MG)
            sy = arm_y + slam
            set_px(g, 2, sy, IC)
            set_px(g, 13, sy, IC)
            if slam >= 2:
                set_px(g, 1, sy, FW)  # ice shatter spark
                set_px(g, 14, sy, FW)
                set_px(g, 2, sy + 1, NW)
                set_px(g, 13, sy + 1, NW)

        # Head (angular ice-stone block)
        set_px(g, 6, 5 + bob, DK)
        set_px(g, 7, 5 + bob, ST)
        set_px(g, 8, 5 + bob, MG)
        set_px(g, 9, 5 + bob, DK)
        set_px(g, 6, 4 + bob, ST)
        set_px(g, 7, 4 + bob, LS)
        set_px(g, 8, 4 + bob, LS)
        set_px(g, 9, 4 + bob, ST)
        # Ice crystal crown
        set_px(g, 7, 3 + bob, IC)
        set_px(g, 8, 3 + bob, HB)
        set_px(g, 6, 3 + bob, SY)
        set_px(g, 9, 3 + bob, SY)
        set_px(g, 7, 2 + bob, FW)

        # Eyes (enemy red, menacing)
        set_px(g, 7, 5 + bob, BR)
        set_px(g, 8, 5 + bob, ER)

        # Frost particles
        particle_sets = [
            [(3, 6), (12, 8)],
            [(4, 5), (11, 9)],
            [(3, 8), (12, 6)],
            [(4, 7), (11, 7)],
        ]
        for px, py in particle_sets[anim]:
            set_px(g, px, py + bob, FW)

        # Outline key pixels
        set_px(g, 6, 2 + bob, K)
        set_px(g, 9, 2 + bob, K)
        set_px(g, 4, 7 + bob, K)
        set_px(g, 11, 7 + bob, K)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_ice_golem.png'), sheet)


# =============================================================================
# ENEMY 3: BLIZZARD ELEMENTAL -- swirling snow vortex, 16x16, 8 frames
# Frames 0-3: idle spin/swirl, Frames 4-7: attack (snowstorm blast)
# Color: white snow (NW/PG), ice blue swirl (HB/SB), dark center (OC/DP)
# =============================================================================

def make_blizzard_elemental():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        # Slight float
        bob = [0, -1, 0, -1][anim]

        # Vortex body (swirling mass)
        cy = 8 + bob
        # Core (dark eye of the storm)
        set_px(g, 7, cy, OC)
        set_px(g, 8, cy, DI)
        set_px(g, 7, cy + 1, DI)
        set_px(g, 8, cy + 1, OC)

        # Inner swirl ring (rotates with anim)
        inner_ring = [
            (6, cy - 1), (7, cy - 1), (8, cy - 1), (9, cy - 1),
            (9, cy), (9, cy + 1),
            (9, cy + 2), (8, cy + 2), (7, cy + 2), (6, cy + 2),
            (6, cy + 1), (6, cy),
        ]
        inner_colors = [SY, IC, HB, SY, IC, FW, SY, IC, HB, SY, IC, FW]
        for i, (ix, iy) in enumerate(inner_ring):
            c = inner_colors[(i + anim * 3) % len(inner_colors)]
            set_px(g, ix, iy, c)

        # Outer swirl (snow particles rotating)
        outer_positions = [
            [(5, cy - 2), (10, cy - 1), (11, cy + 1), (10, cy + 3),
             (5, cy + 3), (4, cy + 1)],
            [(6, cy - 2), (10, cy), (11, cy + 2), (9, cy + 3),
             (4, cy + 2), (4, cy)],
            [(7, cy - 2), (11, cy), (10, cy + 3), (8, cy + 3),
             (4, cy + 2), (5, cy - 1)],
            [(8, cy - 2), (11, cy + 1), (9, cy + 3), (6, cy + 3),
             (4, cy + 1), (5, cy - 2)],
        ]
        for ox, oy in outer_positions[anim]:
            set_px(g, ox, oy, NW)

        # Snow dust cloud (wider halo)
        dust_sets = [
            [(3, cy - 1), (12, cy + 2), (8, cy - 3)],
            [(3, cy + 1), (12, cy), (6, cy - 3)],
            [(3, cy + 2), (12, cy - 1), (9, cy - 3)],
            [(3, cy), (12, cy + 1), (7, cy - 3)],
        ]
        for dx, dy in dust_sets[anim]:
            set_px(g, dx, dy, PG)

        if is_attack:
            # Snowstorm blast -- particles fly outward
            blast_ext = [1, 2, 3, 2][anim]
            for bd in range(1, blast_ext + 1):
                set_px(g, 7 - bd - 2, cy, NW)
                set_px(g, 8 + bd + 2, cy, NW)
                set_px(g, 7, cy - bd - 2, PG)
                set_px(g, 8, cy + bd + 2, PG)
            if blast_ext >= 2:
                set_px(g, 3, cy - 1, FW)
                set_px(g, 12, cy + 2, FW)

        # Eye glint (enemy indicator)
        set_px(g, 7, cy, BR)
        set_px(g, 8, cy, ER)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_blizzard_elemental.png'), sheet)


# =============================================================================
# ENEMY 4: SNOW STALKER -- wolf-like ice predator, 16x16, 8 frames
# Frames 0-3: idle prowl, Frames 4-7: attack (pounce/bite)
# Color: white fur (NW/PG), blue-gray undercoat (LS/ST), red eyes (BR/ER)
# =============================================================================

def make_snow_stalker():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, 0, -1, 0][anim] if not is_attack else 0

        # Hind legs
        set_px(g, 4, 14, ST)
        set_px(g, 5, 14, MG)
        set_px(g, 4, 15, DK)
        set_px(g, 5, 15, ST)

        # Front legs
        front_step = [0, 1, 0, -1][anim] if not is_attack else [0, -1, -2, -1][anim]
        set_px(g, 10, 14 + front_step, ST)
        set_px(g, 11, 14 + front_step, MG)
        set_px(g, 10, 15, DK)
        set_px(g, 11, 15, ST)

        # Body (low-slung predator form, horizontal)
        for bx in range(4, 12):
            set_px(g, bx, 11 + bob, PG)
            set_px(g, bx, 12 + bob, NW)
            set_px(g, bx, 13 + bob, LS)
        # Belly (lighter)
        for bx in range(5, 11):
            set_px(g, bx, 13 + bob, PG)
        # Fur texture
        set_px(g, 6, 11 + bob, NW)
        set_px(g, 9, 11 + bob, NW)
        set_px(g, 7, 12 + bob, IW)

        # Tail (bushy, curving up)
        tail_wave = [0, -1, 0, 1][anim]
        set_px(g, 3, 11 + bob + tail_wave, PG)
        set_px(g, 2, 10 + bob + tail_wave, NW)
        set_px(g, 1, 9 + bob + tail_wave, LS)

        # Head
        head_x = 11
        if is_attack:
            head_x = 11 + [0, 1, 2, 1][anim]  # lunge forward
        set_px(g, head_x, 10 + bob, ST)
        set_px(g, head_x + 1, 10 + bob, MG)
        set_px(g, head_x, 9 + bob, PG)
        set_px(g, head_x + 1, 9 + bob, NW)
        set_px(g, head_x + 2, 10 + bob, LS)
        # Snout
        set_px(g, head_x + 2, 11 + bob, ST)
        # Ears
        set_px(g, head_x, 8 + bob, PG)
        set_px(g, head_x + 1, 8 + bob, NW)

        # Eyes (red, predatory)
        set_px(g, head_x + 1, 9 + bob, BR)

        # Jaw (open during attack)
        if is_attack:
            jaw_ext = [0, 1, 1, 0][anim]
            if jaw_ext:
                set_px(g, head_x + 2, 11 + bob + 1, NW)  # teeth
                set_px(g, head_x + 3, 11 + bob, ER)       # bite spark

        # Frost breath particles
        breath_sets = [
            [(13, 9)],
            [(14, 10)],
            [(13, 10)],
            [(14, 9)],
        ]
        for bpx, bpy in breath_sets[anim]:
            set_px(g, bpx, bpy + bob, FW)

        # Snow dust from paws
        dust_sets = [
            [(3, 14)],
            [(4, 13)],
            [(3, 13)],
            [(5, 14)],
        ]
        for dpx, dpy in dust_sets[anim]:
            set_px(g, dpx, dpy, PG)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_snow_stalker.png'), sheet)


# =============================================================================
# BOSS: FROST MONARCH -- large 32x32, 8 frames
# Frames 0-3: idle (ice crystals orbit, crown glows), Frames 4-7: attack (blizzard slam)
# Color: ice armor (HB/IW/SB), frost cape (DP/PB), crystal crown (NW/PY), purple magic (MV/SG)
# =============================================================================

def make_frost_monarch():
    frames = []
    for f in range(8):
        g = blank(32, 32)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, 0, -1, 0][anim] if not is_attack else 0

        # Frozen ground base (ice platform)
        for wx in range(6, 26):
            set_px(g, wx, 30, DI)
            set_px(g, wx, 31, OC)
        for wx in range(4, 28):
            set_px(g, wx, 29, SY)
        # Ice crack details
        ice_off = [0, 1, 0, -1][anim]
        set_px(g, 5 + ice_off, 29, IC)
        set_px(g, 10 - ice_off, 29, HB)
        set_px(g, 20 + ice_off, 29, IC)
        set_px(g, 25 - ice_off, 29, HB)

        # Main body (ice-armored humanoid torso)
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
                    set_px(g, px, y, DI)
                else:
                    set_px(g, px, y, SY)

        # Ice armor plate lines
        for ty in [14, 18, 22, 26]:
            y = ty + bob
            if 0 <= y < 32:
                set_px(g, 13, y, IC)
                set_px(g, 18, y, IC)

        # Shoulder ice crystal formations
        shoulder_y = 14 + bob
        # Left shoulder crystals
        for cx in range(6, 11):
            set_px(g, cx, shoulder_y, IC)
            set_px(g, cx, shoulder_y - 1, HB)
        set_px(g, 5, shoulder_y - 1, FW)
        set_px(g, 5, shoulder_y - 2, IC)
        set_px(g, 6, shoulder_y - 2, SY)
        # Right shoulder crystals
        for cx in range(21, 26):
            set_px(g, cx, shoulder_y, IC)
            set_px(g, cx, shoulder_y - 1, HB)
        set_px(g, 26, shoulder_y - 1, FW)
        set_px(g, 26, shoulder_y - 2, IC)
        set_px(g, 25, shoulder_y - 2, SY)

        # Ice arms
        if not is_attack:
            arm_sway = [-1, 0, 1, 0][anim]
            # Left ice arm
            for ay in range(16, 26):
                ax = 10 - (ay - 16) // 2 + arm_sway + bob
                set_px(g, ax, ay + bob, SY)
                set_px(g, ax - 1, ay + bob, DI)
            # Right ice arm
            for ay in range(16, 26):
                ax = 21 + (ay - 16) // 2 - arm_sway + bob
                set_px(g, ax, ay + bob, SY)
                set_px(g, ax + 1, ay + bob, DI)
        else:
            # Blizzard slam -- arms crash with ice shards
            slam_ext = [0, 2, 4, 2][anim]
            # Left arm
            for ay in range(16, 26 + slam_ext):
                ax = 8 if ay < 22 else 7
                y = ay + bob
                if 0 <= y < 32:
                    set_px(g, ax, y, SY)
                    set_px(g, ax - 1, y, DI)
            # Right arm
            for ay in range(16, 26 + slam_ext):
                ax = 23 if ay < 22 else 24
                y = ay + bob
                if 0 <= y < 32:
                    set_px(g, ax, y, SY)
                    set_px(g, ax + 1, y, DI)
            # Ice shard burst at impact
            if slam_ext >= 4:
                for sx in [-2, -1, 0, 1, 2]:
                    set_px(g, 7 + sx, 28, FW)
                    set_px(g, 24 + sx, 28, FW)
                set_px(g, 5, 27, NW)
                set_px(g, 26, 27, NW)

        # Face (frozen mask)
        face_y = 16 + bob
        # Eyes (glowing icy blue with purple)
        set_px(g, 14, face_y, AU)
        set_px(g, 15, face_y, AG)
        set_px(g, 17, face_y, AG)
        set_px(g, 18, face_y, AU)
        # Brow (ice ridge)
        set_px(g, 13, face_y - 1, DI)
        set_px(g, 14, face_y - 1, SY)
        set_px(g, 18, face_y - 1, SY)
        set_px(g, 19, face_y - 1, DI)
        # Mouth (frozen slit)
        set_px(g, 15, face_y + 2, K)
        set_px(g, 16, face_y + 2, DK)
        set_px(g, 17, face_y + 2, K)
        if is_attack:
            set_px(g, 15, face_y + 3, DI)
            set_px(g, 16, face_y + 3, OC)
            set_px(g, 17, face_y + 3, DI)

        # Crystal ice crown (top of head -- geometric ice shards)
        crown_y = 8 + bob
        crystal_colors = [IC, HB, FW, NW, IW, PG]
        # Central crown spires
        set_px(g, 15, crown_y, FW)
        set_px(g, 16, crown_y, NW)
        set_px(g, 15, crown_y - 1, IC)
        set_px(g, 16, crown_y - 1, HB)
        # Crystal crown ring
        crown_positions = [
            (14, crown_y), (17, crown_y),
            (13, crown_y + 1), (18, crown_y + 1),
            (13, crown_y + 2), (18, crown_y + 2),
            (14, crown_y + 3), (15, crown_y + 3), (16, crown_y + 3), (17, crown_y + 3),
        ]
        for i, (cpx, cpy) in enumerate(crown_positions):
            c = crystal_colors[(i + anim) % len(crystal_colors)]
            set_px(g, cpx, cpy, c)

        # Tall ice spires on crown
        set_px(g, 14, crown_y - 2, IC)
        set_px(g, 15, crown_y - 2, FW)
        set_px(g, 16, crown_y - 2, FW)
        set_px(g, 17, crown_y - 2, IC)
        set_px(g, 15, crown_y - 3, NW)
        set_px(g, 16, crown_y - 3, IW)
        # Side crystal sprays
        for sx, sy in [(11, crown_y + 1), (20, crown_y + 1)]:
            set_px(g, sx, sy, IC)
            set_px(g, sx - 1, sy, HB)
            set_px(g, sx + 1, sy, SY)
            set_px(g, sx, sy - 1, FW)
            set_px(g, sx, sy + 1, DI)

        # Frost cape (flowing behind)
        cape_sway = [0, 1, 0, -1][anim]
        for cy_off in range(20, 28):
            y = cy_off + bob
            if 0 <= y < 32:
                set_px(g, 10 - cape_sway, y, DI)
                set_px(g, 21 + cape_sway, y, DI)

        # Ambient snowflake particles
        snow_drift = [
            [(5, 8), (22, 12), (10, 4)],
            [(7, 10), (24, 8), (12, 3)],
            [(4, 12), (21, 10), (9, 6)],
            [(6, 7), (23, 14), (11, 5)],
        ]
        for spx, spy in snow_drift[anim]:
            sc = crystal_colors[(spx + spy + anim) % len(crystal_colors)]
            set_px(g, spx, spy + bob, sc)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_boss_frost_monarch.png'), sheet)


# =============================================================================
# WINTER DECORATION TILESET -- 128x48 (8 columns x 3 rows of 16x16 tiles)
# Row 0: Ground overlays (snow patches, ice puddles, frost crystals, icicle debris)
# Row 1: Vegetation (frozen tree top/trunk, snow bush, dead reed, ice crystal cluster)
# Row 2: Structures (ice lantern, frozen fountain, winter banner, snow drift, event marker)
# =============================================================================

def make_winter_tileset():
    tiles = []

    # -- Row 0: Ground overlays --

    # Tile 0,0: Light snow cover
    t = blank(16, 16)
    snow_spots = [(2, 3), (5, 8), (10, 2), (13, 11), (7, 13), (1, 10), (12, 6), (4, 1)]
    for i, (sx, sy) in enumerate(snow_spots):
        set_px(t, sx, sy, NW)
        if i % 2 == 0:
            set_px(t, sx + 1, sy, PG)
    tiles.append(t)

    # Tile 1,0: Dense snow ground cover
    t = blank(16, 16)
    for y in range(16):
        for x in range(16):
            if (x + y) % 5 == 0:
                set_px(t, x, y, NW)
            elif (x * 3 + y * 7) % 11 == 0:
                set_px(t, x, y, PG)
            elif (x * 5 + y * 3) % 13 == 0:
                set_px(t, x, y, IW)
            elif (x * 2 + y * 5) % 17 == 0:
                set_px(t, x, y, LS)
    tiles.append(t)

    # Tile 2,0: Icy path (frozen ground)
    t = blank(16, 16)
    for y in range(16):
        for x in range(16):
            if (x + y * 3) % 7 == 0:
                set_px(t, x, y, SY)
            elif (x * 2 + y) % 9 == 0:
                set_px(t, x, y, IC)
    # Frost cracks
    set_px(t, 3, 5, DI)
    set_px(t, 8, 11, HB)
    set_px(t, 12, 3, NW)
    set_px(t, 6, 14, PG)
    # Smooth ice patch
    fill_rect(t, 5, 8, 4, 2, IC)
    set_px(t, 6, 8, HB)
    tiles.append(t)

    # Tile 3,0: Frost crystal clusters on ground
    t = blank(16, 16)
    # Crystal 1 (upward spike)
    set_px(t, 5, 5, IC)
    set_px(t, 5, 6, HB)
    set_px(t, 5, 7, SY)
    set_px(t, 6, 6, FW)
    # Crystal 2
    set_px(t, 10, 9, HB)
    set_px(t, 10, 10, IC)
    set_px(t, 10, 11, SY)
    set_px(t, 11, 10, FW)
    # Crystal 3
    set_px(t, 3, 12, IC)
    set_px(t, 3, 13, HB)
    # Snow near crystals
    set_px(t, 8, 5, NW)
    set_px(t, 13, 4, PG)
    tiles.append(t)

    # Tile 4,0: Icicle debris
    t = blank(16, 16)
    # Fallen icicle 1 (horizontal)
    for x in range(3, 8):
        set_px(t, x, 9, IC)
    set_px(t, 8, 9, HB)
    set_px(t, 9, 9, FW)
    # Fallen icicle 2 (diagonal)
    set_px(t, 10, 11, IC)
    set_px(t, 11, 12, HB)
    set_px(t, 12, 13, FW)
    # Ice shards
    set_px(t, 5, 7, FW)
    set_px(t, 7, 12, IC)
    set_px(t, 2, 11, NW)
    tiles.append(t)

    # Tile 5,0: Frozen puddle
    t = blank(16, 16)
    for y in range(5, 12):
        for x in range(4, 12):
            cx, cy = 8.0, 8.5
            if ((x - cx) / 4.0) ** 2 + ((y - cy) / 3.5) ** 2 <= 1.0:
                set_px(t, x, y, IC)
    # Ice shimmer highlights
    set_px(t, 6, 7, HB)
    set_px(t, 9, 8, FW)
    # Crack in ice
    set_px(t, 7, 8, SY)
    set_px(t, 8, 8, DI)
    tiles.append(t)

    # Tile 6,0: Snow-covered rocks
    t = blank(16, 16)
    # Rock body
    fill_rect(t, 3, 9, 7, 4, ST)
    fill_rect(t, 4, 10, 5, 2, MG)
    set_px(t, 5, 9, DK)
    # Snow cap on rock
    fill_rect(t, 3, 8, 7, 1, NW)
    fill_rect(t, 4, 7, 5, 1, PG)
    set_px(t, 5, 7, IW)
    # Smaller rock
    set_px(t, 11, 12, ST)
    set_px(t, 12, 12, MG)
    set_px(t, 11, 11, NW)
    tiles.append(t)

    # Tile 7,0: Snowflake pattern ground
    t = blank(16, 16)
    # Central snowflake shape
    set_px(t, 7, 5, NW)
    set_px(t, 8, 5, PG)
    set_px(t, 7, 10, NW)
    set_px(t, 8, 10, PG)
    set_px(t, 5, 7, NW)
    set_px(t, 10, 7, NW)
    set_px(t, 5, 8, PG)
    set_px(t, 10, 8, PG)
    # Diagonal arms
    set_px(t, 6, 6, IC)
    set_px(t, 9, 6, IC)
    set_px(t, 6, 9, IC)
    set_px(t, 9, 9, IC)
    # Center
    set_px(t, 7, 7, FW)
    set_px(t, 8, 7, IW)
    set_px(t, 7, 8, IW)
    set_px(t, 8, 8, FW)
    tiles.append(t)

    row0 = hstack(tiles[:8])

    # -- Row 1: Vegetation --
    tiles_r1 = []

    # Tile 0,1: Frozen tree canopy (ice-laden branches)
    t = blank(16, 16)
    for y in range(2, 14):
        for x in range(0, 14):
            if ((x - 10) ** 2 + (y - 7) ** 2) < 40:
                c_idx = (x + y) % 4
                if c_idx == 0:
                    set_px(t, x, y, IC)
                elif c_idx == 1:
                    set_px(t, x, y, HB)
                elif c_idx == 2:
                    set_px(t, x, y, NW)
                else:
                    set_px(t, x, y, PG)
    # Branch showing through
    set_px(t, 9, 9, DK)
    set_px(t, 10, 10, ST)
    set_px(t, 11, 9, MG)
    tiles_r1.append(t)

    # Tile 1,1: Frozen tree trunk
    t = blank(16, 16)
    for y in range(16):
        set_px(t, 7, y, ST)
        set_px(t, 8, y, MG)
    # Frost on bark
    for ly in [2, 6, 10, 14]:
        set_px(t, 6, ly, DK)
        set_px(t, 9, ly, DK)
        set_px(t, 7, ly, IC)
        set_px(t, 8, ly, HB)
    # Ice vein
    set_px(t, 7, 8, FW)
    set_px(t, 8, 8, IC)
    tiles_r1.append(t)

    # Tile 2,1: Snow-covered bush
    t = blank(16, 16)
    # Bush body (dark frozen green)
    fill_rect(t, 3, 6, 10, 8, DF)
    fill_rect(t, 4, 5, 8, 1, DK)
    fill_rect(t, 5, 4, 6, 1, ST)
    # Snow cap
    fill_rect(t, 3, 5, 10, 2, NW)
    fill_rect(t, 4, 4, 8, 1, PG)
    set_px(t, 6, 4, IW)
    # Frozen berries (icy blue)
    for bx, by in [(4, 8), (7, 7), (10, 9), (5, 11), (9, 10)]:
        set_px(t, bx, by, IC)
    # Dark base
    fill_rect(t, 3, 13, 10, 1, DK)
    tiles_r1.append(t)

    # Tile 3,1: Dead winter reeds (frozen)
    t = blank(16, 16)
    for x_base, h in [(3, 10), (6, 12), (9, 9), (12, 11)]:
        for y in range(16 - h, 16):
            wave = 1 if (y + x_base) % 4 < 2 else 0
            c = ST if y > 12 else MG
            set_px(t, x_base + wave, y, c)
        # Frost on tips
        set_px(t, x_base, 16 - h - 1, IC)
        set_px(t, x_base, 16 - h - 2, FW)
    tiles_r1.append(t)

    # Tile 4,1: Ice crystal cluster (upright formation)
    t = blank(16, 16)
    # Large crystal (center)
    fill_rect(t, 6, 4, 3, 8, IC)
    set_px(t, 7, 3, HB)
    set_px(t, 7, 2, FW)
    set_px(t, 6, 5, SY)
    set_px(t, 8, 5, HB)
    set_px(t, 7, 6, FW)  # inner glow
    set_px(t, 7, 8, NW)  # shimmer
    # Small crystal (left)
    set_px(t, 4, 8, IC)
    set_px(t, 4, 7, HB)
    set_px(t, 4, 6, FW)
    # Small crystal (right)
    set_px(t, 10, 7, IC)
    set_px(t, 10, 6, HB)
    set_px(t, 10, 5, FW)
    # Ground snow
    fill_rect(t, 3, 12, 10, 1, NW)
    tiles_r1.append(t)

    # Tile 5,1: Frosted fern (dead, crystallized)
    t = blank(16, 16)
    for y in range(4, 14):
        x_off = 1 if y % 3 == 0 else 0
        set_px(t, 7 + x_off, y, ST)
        set_px(t, 8 - x_off, y, MG)
    # Frost-covered side fronds
    set_px(t, 5, 6, IC)
    set_px(t, 6, 7, HB)
    set_px(t, 10, 6, IC)
    set_px(t, 9, 7, HB)
    set_px(t, 4, 9, FW)
    set_px(t, 11, 10, FW)
    # Ice tips
    set_px(t, 4, 8, NW)
    set_px(t, 11, 9, NW)
    tiles_r1.append(t)

    # Tile 6,1: Snowman (whimsical winter decoration)
    t = blank(16, 16)
    # Bottom ball
    fill_rect(t, 5, 10, 6, 4, NW)
    set_px(t, 4, 11, PG)
    set_px(t, 4, 12, PG)
    set_px(t, 11, 11, PG)
    set_px(t, 11, 12, PG)
    # Middle ball
    fill_rect(t, 6, 6, 4, 4, NW)
    set_px(t, 5, 7, PG)
    set_px(t, 5, 8, PG)
    set_px(t, 10, 7, PG)
    set_px(t, 10, 8, PG)
    # Head
    set_px(t, 7, 4, NW)
    set_px(t, 8, 4, PG)
    set_px(t, 7, 3, PG)
    set_px(t, 8, 3, NW)
    # Eyes (coal)
    set_px(t, 7, 3, K)
    set_px(t, 8, 3, K)
    # Nose (carrot orange)
    set_px(t, 8, 4, FR)
    # Stick arms
    set_px(t, 4, 7, BN)
    set_px(t, 3, 6, DT)
    set_px(t, 11, 7, BN)
    set_px(t, 12, 6, DT)
    # Scarf
    set_px(t, 6, 5, BR)
    set_px(t, 7, 5, ER)
    set_px(t, 8, 5, BR)
    set_px(t, 9, 5, ER)
    tiles_r1.append(t)

    # Tile 7,1: Snow-covered fallen log
    t = blank(16, 16)
    # Log body
    fill_rect(t, 1, 8, 14, 4, ST)
    fill_rect(t, 2, 9, 12, 2, MG)
    # End rings
    set_px(t, 0, 9, DK)
    set_px(t, 0, 10, DK)
    set_px(t, 15, 9, DK)
    set_px(t, 15, 10, DK)
    # Snow on top
    fill_rect(t, 1, 7, 14, 1, NW)
    fill_rect(t, 2, 6, 12, 1, PG)
    # Ice patch
    set_px(t, 5, 7, IC)
    set_px(t, 10, 7, FW)
    # Bark detail
    set_px(t, 3, 9, DK)
    set_px(t, 8, 10, DK)
    set_px(t, 12, 9, DK)
    tiles_r1.append(t)

    row1 = hstack(tiles_r1[:8])

    # -- Row 2: Structures / Event objects --
    tiles_r2 = []

    # Tile 0,2: Holiday ice lantern
    t = blank(16, 16)
    # Lantern body (ice block with glow inside)
    fill_rect(t, 4, 5, 8, 8, IC)
    fill_rect(t, 5, 4, 6, 1, SY)
    set_px(t, 3, 7, IC)
    set_px(t, 3, 8, IC)
    set_px(t, 12, 7, IC)
    set_px(t, 12, 8, IC)
    # Inner glow (warm golden -- candle inside ice)
    fill_rect(t, 6, 7, 4, 3, GD)
    set_px(t, 7, 7, YL)
    set_px(t, 8, 7, PY)
    set_px(t, 7, 8, PY)
    set_px(t, 8, 8, YL)
    # Lantern cap
    fill_rect(t, 5, 3, 6, 1, ST)
    set_px(t, 7, 2, MG)
    set_px(t, 8, 2, ST)
    # Handle
    set_px(t, 7, 1, DK)
    set_px(t, 8, 1, DK)
    # Base
    fill_rect(t, 5, 13, 6, 1, ST)
    # Snow at base
    set_px(t, 3, 14, NW)
    set_px(t, 12, 14, PG)
    tiles_r2.append(t)

    # Tile 1,2: Frozen fountain
    t = blank(16, 16)
    # Basin (stone)
    fill_rect(t, 3, 9, 10, 4, ST)
    fill_rect(t, 4, 8, 8, 1, MG)
    set_px(t, 2, 10, ST)
    set_px(t, 13, 10, ST)
    # Frozen water (ice surface)
    fill_rect(t, 4, 9, 8, 2, IC)
    set_px(t, 6, 9, HB)
    set_px(t, 9, 9, FW)
    # Ice pillar (frozen spray)
    set_px(t, 7, 5, IC)
    set_px(t, 8, 5, HB)
    set_px(t, 7, 4, FW)
    set_px(t, 8, 4, NW)
    set_px(t, 7, 3, IW)
    set_px(t, 8, 6, IC)
    # Snow on rim
    set_px(t, 3, 8, NW)
    set_px(t, 12, 8, PG)
    tiles_r2.append(t)

    # Tile 2,2: Winter festival banner
    t = blank(16, 16)
    # Pole
    for y in range(2, 16):
        set_px(t, 3, y, ST)
    set_px(t, 3, 1, IC)   # ice crystal finial
    # Banner fabric (icy blue/purple)
    fill_rect(t, 4, 2, 8, 10, DI)
    fill_rect(t, 5, 3, 6, 8, SY)
    # Snowflake emblem
    set_px(t, 7, 6, NW)
    set_px(t, 8, 6, FW)
    set_px(t, 6, 5, IC)
    set_px(t, 9, 5, IC)
    set_px(t, 6, 7, HB)
    set_px(t, 9, 7, HB)
    set_px(t, 7, 5, FW)
    set_px(t, 8, 7, IW)
    # Banner bottom (pointed)
    set_px(t, 5, 12, SY)
    set_px(t, 10, 12, SY)
    set_px(t, 6, 13, DI)
    set_px(t, 9, 13, DI)
    set_px(t, 7, 14, SY)
    set_px(t, 8, 14, SY)
    tiles_r2.append(t)

    # Tile 3,2: Snow drift
    t = blank(16, 16)
    # Drift body (rounded mound)
    fill_rect(t, 2, 9, 12, 5, NW)
    fill_rect(t, 3, 8, 10, 1, PG)
    fill_rect(t, 4, 7, 8, 1, NW)
    fill_rect(t, 5, 6, 6, 1, IW)
    # Shadow / depth
    set_px(t, 2, 13, PG)
    set_px(t, 13, 13, LS)
    set_px(t, 3, 12, PG)
    # Sparkle highlights
    set_px(t, 6, 7, FW)
    set_px(t, 10, 8, IW)
    tiles_r2.append(t)

    # Tile 4,2: Hot cocoa / warming station
    t = blank(16, 16)
    # Cauldron body
    fill_rect(t, 4, 7, 8, 6, DK)
    fill_rect(t, 5, 6, 6, 1, ST)
    # Legs
    set_px(t, 4, 13, ST)
    set_px(t, 11, 13, ST)
    set_px(t, 7, 14, MG)
    # Hot cocoa (warm brown)
    fill_rect(t, 5, 7, 6, 2, BN)
    set_px(t, 6, 7, DT)
    set_px(t, 9, 7, SN)
    # Steam wisps (warm)
    set_px(t, 7, 5, PG)
    set_px(t, 8, 4, NW)
    set_px(t, 6, 3, PG)
    # Handle
    set_px(t, 3, 7, ST)
    set_px(t, 12, 7, ST)
    # Snow on ground
    set_px(t, 2, 14, NW)
    set_px(t, 13, 14, NW)
    tiles_r2.append(t)

    # Tile 5,2: Gift box / present
    t = blank(16, 16)
    # Box body
    fill_rect(t, 4, 7, 8, 6, BR)
    fill_rect(t, 5, 8, 6, 4, ER)
    # Ribbon (gold cross)
    for y in range(7, 13):
        set_px(t, 7, y, GD)
        set_px(t, 8, y, YL)
    for x in range(4, 12):
        set_px(t, x, 9, GD)
    # Bow on top
    set_px(t, 6, 6, GD)
    set_px(t, 7, 5, YL)
    set_px(t, 8, 5, GD)
    set_px(t, 9, 6, YL)
    set_px(t, 7, 6, PY)
    set_px(t, 8, 6, PY)
    # Snow fleck
    set_px(t, 5, 7, NW)
    set_px(t, 11, 8, PG)
    tiles_r2.append(t)

    # Tile 6,2: Frost-covered barrel
    t = blank(16, 16)
    # Barrel body
    fill_rect(t, 4, 5, 8, 9, ST)
    fill_rect(t, 5, 4, 6, 1, MG)
    fill_rect(t, 5, 14, 6, 1, MG)
    # Barrel bands
    set_px(t, 4, 7, DK)
    set_px(t, 11, 7, DK)
    set_px(t, 4, 11, DK)
    set_px(t, 11, 11, DK)
    # Snow on top
    set_px(t, 6, 3, NW)
    set_px(t, 7, 3, PG)
    set_px(t, 8, 3, NW)
    set_px(t, 9, 3, IW)
    # Frost on sides
    set_px(t, 5, 5, IC)
    set_px(t, 10, 6, IC)
    tiles_r2.append(t)

    # Tile 7,2: Winter event quest marker (ice orb)
    t = blank(16, 16)
    # Glowing ice orb
    fill_rect(t, 5, 4, 6, 6, IC)
    fill_rect(t, 6, 3, 4, 1, HB)
    fill_rect(t, 6, 10, 4, 1, HB)
    set_px(t, 5, 5, SY)
    set_px(t, 10, 5, DI)
    set_px(t, 5, 8, DI)
    set_px(t, 10, 8, SY)
    # Inner glow (brilliant white)
    set_px(t, 7, 6, NW)
    set_px(t, 8, 6, IW)
    set_px(t, 7, 7, IW)
    set_px(t, 8, 7, NW)
    # Aurora ray accents
    set_px(t, 7, 2, AU)
    set_px(t, 8, 2, AG)
    set_px(t, 4, 6, AU)
    set_px(t, 11, 7, AG)
    # Base frost shimmer
    set_px(t, 6, 12, IC)
    set_px(t, 9, 13, FW)
    set_px(t, 7, 14, HB)
    tiles_r2.append(t)

    row2 = hstack(tiles_r2[:8])
    full_tileset = vstack([row0, row1, row2])
    write_png(os.path.join(TILESET_DIR, 'tileset_seasonal_winter.png'), full_tileset)


# =============================================================================
# WINTER REWARD ITEMS -- 16x16 each
# Follow icon style: clear silhouette, 4-6 palette colors per icon
# =============================================================================

def make_winter_rewards():

    # 1. Glacial Staff -- ice crystal topped staff
    t = blank(16, 16)
    # Staff shaft (vertical, pale wood)
    for y in range(5, 15):
        set_px(t, 7, y, MG)
        set_px(t, 8, y, ST)
    # Ice crystal head
    set_px(t, 7, 3, IC)
    set_px(t, 8, 3, HB)
    set_px(t, 7, 2, HB)
    set_px(t, 8, 2, FW)
    set_px(t, 6, 3, SY)
    set_px(t, 9, 3, SY)
    set_px(t, 7, 1, NW)  # crystal tip
    # Side crystal prongs
    set_px(t, 5, 4, IC)
    set_px(t, 10, 4, IC)
    set_px(t, 6, 4, HB)
    set_px(t, 9, 4, HB)
    # Frost wrap on shaft
    set_px(t, 7, 7, IC)
    set_px(t, 8, 9, IC)
    set_px(t, 7, 11, HB)
    # Pommel
    set_px(t, 7, 15, DI)
    # Crystal glow sparkle
    set_px(t, 6, 1, FW)
    set_px(t, 9, 2, IW)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_winter_glacial_staff.png'), t)

    # 2. Frostbite Blade -- icy sword with frozen edge
    t = blank(16, 16)
    # Blade (diagonal ice crystal)
    for i in range(7):
        set_px(t, 8 + i, 2 + i, IC)
        set_px(t, 9 + i, 2 + i, HB)
    # Blade edge (frost white)
    for i in range(7):
        set_px(t, 7 + i, 3 + i, FW)
    # Inner ice
    set_px(t, 10, 3, NW)
    set_px(t, 11, 4, IW)
    # Handle / hilt
    for i in range(4):
        set_px(t, 7 - i, 4 + i, ST)
        set_px(t, 8 - i, 5 + i, MG)
    # Cross guard (ice)
    set_px(t, 5, 9, IC)
    set_px(t, 6, 8, HB)
    set_px(t, 8, 10, IC)
    set_px(t, 9, 9, HB)
    # Grip
    set_px(t, 4, 9, DK)
    set_px(t, 3, 10, ST)
    # Pommel gem
    set_px(t, 2, 11, AU)
    # Frost sparkle at tip
    set_px(t, 14, 8, NW)
    set_px(t, 13, 7, FW)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_winter_frostbite_blade.png'), t)

    # 3. Snowdrift Cloak -- flowing white winter cape
    t = blank(16, 16)
    # Cloak body
    fill_rect(t, 5, 3, 6, 10, NW)
    fill_rect(t, 6, 2, 4, 1, PG)
    # Frost pattern overlay
    set_px(t, 6, 4, IC)
    set_px(t, 9, 5, HB)
    set_px(t, 7, 7, FW)
    set_px(t, 8, 9, IC)
    set_px(t, 6, 8, IW)
    set_px(t, 10, 6, PG)
    # Clasp (icy crystal)
    set_px(t, 7, 2, IC)
    set_px(t, 8, 2, HB)
    # Flowing bottom edge (snow wisps)
    set_px(t, 4, 12, NW)
    set_px(t, 5, 13, PG)
    set_px(t, 6, 13, IW)
    set_px(t, 7, 14, NW)
    set_px(t, 8, 13, PG)
    set_px(t, 9, 13, FW)
    set_px(t, 10, 12, NW)
    set_px(t, 11, 13, PG)
    # Shadow / depth
    set_px(t, 4, 4, LS)
    set_px(t, 11, 4, LS)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_winter_snowdrift_cloak.png'), t)

    # 4. Aurora Crown -- magical crown with aurora lights
    t = blank(16, 16)
    # Crown band (ice/silver)
    for x in range(4, 12):
        y = 8 + int(1.5 * ((x - 8) / 4.0) ** 2)
        set_px(t, x, y, IC)
        set_px(t, x, y + 1, SY)
    # Aurora lights on crown (purple/violet glow)
    set_px(t, 5, 7, AU)
    set_px(t, 7, 6, AG)
    set_px(t, 8, 5, AU)
    set_px(t, 9, 6, MP)
    set_px(t, 11, 7, AG)
    # Crystal points between aurora
    set_px(t, 6, 7, FW)
    set_px(t, 10, 7, FW)
    set_px(t, 8, 6, NW)
    # Side aurora trails
    set_px(t, 3, 9, AU)
    set_px(t, 3, 10, SG)
    set_px(t, 12, 9, AG)
    set_px(t, 12, 10, MV)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_winter_aurora_crown.png'), t)

    # 5. Icicle Amulet -- enchanted icicle pendant
    t = blank(16, 16)
    # Chain
    set_px(t, 6, 2, LS)
    set_px(t, 7, 3, MG)
    set_px(t, 8, 4, LS)
    set_px(t, 9, 3, MG)
    set_px(t, 10, 2, LS)
    # Icicle cap (silver setting)
    fill_rect(t, 6, 6, 4, 2, ST)
    set_px(t, 7, 5, MG)
    set_px(t, 8, 5, ST)
    # Cap detail
    set_px(t, 7, 6, IC)
    set_px(t, 8, 6, HB)
    # Icicle body (tapering crystal)
    fill_rect(t, 7, 8, 2, 2, IC)
    set_px(t, 7, 8, HB)
    set_px(t, 8, 8, FW)
    set_px(t, 7, 9, IC)
    set_px(t, 8, 9, HB)
    # Tapered point
    set_px(t, 7, 10, SY)
    set_px(t, 8, 10, IC)
    set_px(t, 7, 11, FW)
    # Magic sparkle
    set_px(t, 5, 8, AG)
    set_px(t, 10, 9, AU)
    set_px(t, 7, 12, SG)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_winter_icicle_amulet.png'), t)

    # 6. Season Coin -- winter seasonal currency
    t = blank(16, 16)
    # Coin body (circular silver/ice)
    fill_rect(t, 5, 4, 6, 8, LS)
    fill_rect(t, 6, 3, 4, 1, ST)
    fill_rect(t, 6, 12, 4, 1, ST)
    set_px(t, 4, 6, ST)
    set_px(t, 4, 9, ST)
    set_px(t, 11, 6, ST)
    set_px(t, 11, 9, ST)
    # Inner design (snowflake)
    set_px(t, 7, 6, IC)
    set_px(t, 8, 6, HB)
    set_px(t, 7, 7, HB)
    set_px(t, 8, 7, IC)
    set_px(t, 7, 8, IC)
    set_px(t, 8, 8, FW)
    set_px(t, 7, 9, FW)
    set_px(t, 8, 9, IC)
    # Coin rim highlight
    set_px(t, 6, 4, PG)
    set_px(t, 9, 4, NW)
    set_px(t, 5, 5, PG)
    set_px(t, 10, 5, NW)
    # Sparkle
    set_px(t, 6, 3, IW)
    set_px(t, 10, 11, IW)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_winter_season_coin.png'), t)


# =============================================================================
# WINTER EVENT BANNER -- 128x48 (matches existing seasonal banner format)
# Snowy mountain silhouettes, "WINTER FROST" event title area,
# icy blue/white/purple color scheme with aurora accents
# =============================================================================

def make_winter_banner():
    g = blank(128, 48)

    # Background gradient (cold winter tones)
    for y in range(48):
        for x in range(128):
            if y < 16:
                g[y][x] = DI  # deep blue sky
            elif y < 32:
                g[y][x] = SY  # mid blue
            else:
                g[y][x] = OC  # deep night base

    # Border frame
    draw_rect_outline(g, 0, 0, 128, 48, OC)
    draw_rect_outline(g, 1, 1, 126, 46, DK)

    # Snowy mountain (left side)
    # Mountain face
    for y in range(8, 40):
        width = max(0, (y - 8) * 2 // 3)
        for x in range(max(2, 15 - width), min(26, 15 + width)):
            if y < 14:
                g[y][x] = NW  # snow cap
            elif y < 20:
                g[y][x] = PG  # upper snow
            else:
                g[y][x] = ST  # rock face
    # Snow highlights
    set_px(g, 14, 9, IW)
    set_px(g, 15, 10, FW)
    set_px(g, 13, 12, NW)
    # Icicles
    for y in range(14, 18):
        set_px(g, 12, y, IC)
        set_px(g, 17, y + 1, HB)

    # Snowy mountain (right side)
    for y in range(10, 40):
        width = max(0, (y - 10) * 2 // 3)
        for x in range(max(102, 113 - width), min(126, 113 + width)):
            if y < 16:
                g[y][x] = NW
            elif y < 22:
                g[y][x] = PG
            else:
                g[y][x] = ST
    set_px(g, 112, 11, IW)
    set_px(g, 113, 12, FW)
    set_px(g, 114, 14, NW)
    for y in range(16, 20):
        set_px(g, 111, y, IC)
        set_px(g, 115, y + 1, HB)

    # Center text area (dark background panel)
    fill_rect(g, 30, 10, 68, 28, OC)
    fill_rect(g, 31, 11, 66, 26, DK)
    fill_rect(g, 32, 12, 64, 24, DI)
    draw_rect_outline(g, 31, 11, 66, 26, IC)

    # "WINTER" text (pixel font, ~5px tall)
    # W
    fill_rect(g, 36, 16, 1, 5, K)
    fill_rect(g, 40, 16, 1, 5, K)
    set_px(g, 37, 19, K)
    set_px(g, 38, 18, K)
    set_px(g, 39, 19, K)
    # I
    fill_rect(g, 42, 16, 3, 1, K)
    fill_rect(g, 43, 17, 1, 3, K)
    fill_rect(g, 42, 20, 3, 1, K)
    # N
    fill_rect(g, 46, 16, 1, 5, K)
    set_px(g, 47, 17, K)
    set_px(g, 48, 18, K)
    set_px(g, 49, 19, K)
    fill_rect(g, 50, 16, 1, 5, K)
    # T
    fill_rect(g, 52, 16, 5, 1, K)
    fill_rect(g, 54, 17, 1, 4, K)
    # E
    fill_rect(g, 58, 16, 1, 5, K)
    fill_rect(g, 59, 16, 3, 1, K)
    fill_rect(g, 59, 18, 2, 1, K)
    fill_rect(g, 59, 20, 3, 1, K)
    # R
    fill_rect(g, 62, 16, 1, 5, K)
    fill_rect(g, 63, 16, 3, 1, K)
    set_px(g, 65, 17, K)
    fill_rect(g, 63, 18, 3, 1, K)
    set_px(g, 64, 19, K)
    set_px(g, 65, 20, K)

    # "FROST" subtitle text
    # F
    fill_rect(g, 43, 25, 1, 5, K)
    fill_rect(g, 44, 25, 3, 1, K)
    fill_rect(g, 44, 27, 2, 1, K)
    # R
    fill_rect(g, 47, 25, 1, 5, K)
    fill_rect(g, 48, 25, 3, 1, K)
    set_px(g, 50, 26, K)
    fill_rect(g, 48, 27, 3, 1, K)
    set_px(g, 49, 28, K)
    set_px(g, 50, 29, K)
    # O
    fill_rect(g, 52, 26, 1, 3, K)
    fill_rect(g, 55, 26, 1, 3, K)
    fill_rect(g, 53, 25, 2, 1, K)
    fill_rect(g, 53, 29, 2, 1, K)
    # S
    fill_rect(g, 58, 25, 3, 1, K)
    set_px(g, 57, 26, K)
    fill_rect(g, 58, 27, 2, 1, K)
    set_px(g, 60, 28, K)
    fill_rect(g, 57, 29, 3, 1, K)
    # T
    fill_rect(g, 62, 25, 5, 1, K)
    fill_rect(g, 64, 26, 1, 4, K)

    # Decorative snowflakes in banner corners
    flake_positions = [(33, 13), (93, 13), (33, 33), (93, 33)]
    flake_colors = [IC, HB, FW, NW]
    for i, (fx, fy) in enumerate(flake_positions):
        set_px(g, fx, fy, flake_colors[i])
        set_px(g, fx - 1, fy, flake_colors[(i + 1) % 4])
        set_px(g, fx + 1, fy, flake_colors[(i + 2) % 4])
        set_px(g, fx, fy - 1, flake_colors[(i + 3) % 4])
        set_px(g, fx, fy + 1, flake_colors[(i + 1) % 4])

    # Falling snowflakes along bottom area
    for x in range(32, 96, 4):
        sc = [NW, PG, IW, FW][x % 4]
        set_px(g, x, 40, sc)
        set_px(g, x + 1, 41, PG)
        set_px(g, x + 2, 40, sc)

    # Aurora lights from top (purple/violet streaks)
    for x in range(40, 90, 8):
        set_px(g, x, 3, AU)
        set_px(g, x + 1, 4, AG)
        set_px(g, x + 2, 5, MP)
    for x in range(44, 86, 12):
        set_px(g, x, 2, SG)
        set_px(g, x + 3, 3, AU)

    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_seasonal_banner_winter_event.png'), g)


# =============================================================================
# WINTER UI DECORATIONS -- corner and divider pieces (16x16 each)
# =============================================================================

def make_winter_ui_decor():
    # Corner decoration (ice crystal / icicle corner piece for UI panels)
    t = blank(16, 16)
    # Ice vine L-shape
    for x in range(16):
        set_px(t, x, 15, SY)
    for y in range(16):
        set_px(t, 0, y, SY)
    # Corner ice crystal cluster
    set_px(t, 1, 14, IC)
    set_px(t, 0, 13, HB)
    set_px(t, 2, 13, FW)
    set_px(t, 1, 12, NW)
    set_px(t, 1, 15, IW)
    # Icicle accents along edge
    set_px(t, 5, 14, IC)
    set_px(t, 9, 14, HB)
    set_px(t, 13, 14, FW)
    set_px(t, 1, 10, IC)
    set_px(t, 1, 6, HB)
    set_px(t, 1, 3, FW)
    # Snowflake detail
    set_px(t, 7, 13, NW)
    set_px(t, 2, 8, PG)
    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_winter_decor_corner.png'), t)

    # Divider (horizontal icicle/frost divider)
    t = blank(16, 16)
    # Ice line (undulating)
    for x in range(16):
        wave_y = 7 if x % 4 < 2 else 8
        set_px(t, x, wave_y, SY)
        set_px(t, x, wave_y + 1, DI)
    # Icicle drips from line
    set_px(t, 2, 9, IC)
    set_px(t, 2, 10, HB)
    set_px(t, 2, 11, FW)
    set_px(t, 6, 8, IC)
    set_px(t, 6, 9, HB)
    set_px(t, 10, 9, IC)
    set_px(t, 10, 10, FW)
    set_px(t, 14, 8, IC)
    set_px(t, 14, 9, HB)
    set_px(t, 14, 10, FW)
    # Frost crystals on top
    set_px(t, 4, 5, NW)
    set_px(t, 4, 4, IC)
    set_px(t, 12, 5, NW)
    set_px(t, 12, 4, HB)
    # Snowflake dots
    set_px(t, 0, 6, PG)
    set_px(t, 0, 5, NW)
    set_px(t, 15, 9, PG)
    set_px(t, 15, 10, NW)
    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_winter_decor_divider.png'), t)


# =============================================================================
# WINTER CHARACTER OVERLAY HAT -- 16x16 (warm winter beanie/fur hat)
# =============================================================================

def make_winter_hat_overlay():
    t = blank(16, 16)
    # Hat brim (fur-lined)
    fill_rect(t, 3, 10, 10, 2, PG)
    fill_rect(t, 4, 10, 8, 1, NW)
    # Hat body (deep blue knit)
    fill_rect(t, 5, 5, 6, 5, DI)
    fill_rect(t, 6, 4, 4, 1, SY)
    # Hat top (rounded beanie)
    set_px(t, 7, 3, DI)
    set_px(t, 8, 3, SY)
    # Pom-pom on top
    set_px(t, 7, 1, NW)
    set_px(t, 8, 1, PG)
    set_px(t, 7, 2, PG)
    set_px(t, 8, 2, NW)
    # Knit pattern stripe
    fill_rect(t, 5, 8, 6, 1, IC)
    set_px(t, 7, 8, HB)
    set_px(t, 8, 8, FW)
    # Snowflake detail on hat
    set_px(t, 7, 6, IC)
    set_px(t, 8, 6, HB)
    write_png(os.path.join(CHARACTER_DIR, 'char_overlay_hat_winter.png'), t)


# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    print('=== Winter Seasonal Event Art Pack (PIX-266) ===\n')

    print('-- Winter Event Enemies --')
    make_frost_wraith()
    make_ice_golem()
    make_blizzard_elemental()
    make_snow_stalker()

    print('\n-- Frost Monarch Boss --')
    make_frost_monarch()

    print('\n-- Winter Decoration Tileset --')
    make_winter_tileset()

    print('\n-- Winter Reward Items --')
    make_winter_rewards()

    print('\n-- Winter Event Banner --')
    make_winter_banner()

    print('\n-- Winter UI Decorations --')
    make_winter_ui_decor()

    print('\n-- Winter Character Overlay Hat --')
    make_winter_hat_overlay()

    print('\n=== Done! All winter event assets generated. ===')
