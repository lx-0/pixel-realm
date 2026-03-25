#!/usr/bin/env python3
"""
Generate summer seasonal event art pack for PixelRealm (PIX-260).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md exactly:
  - 32-color master palette, SNES-era RPG style
  - Nearest-neighbor pixel art, no anti-aliasing
  - Naming convention: {category}_{name}_{variant}.{ext}

Outputs:
  -- Summer Event Enemies (128×16 horizontal strips, 8 frames × 16px) --
  assets/sprites/enemies/event/char_enemy_sun_elemental.png    (small 12×12 centered in 16×16)
  assets/sprites/enemies/event/char_enemy_sandstorm_golem.png  (small 12×12 centered in 16×16)
  assets/sprites/enemies/event/char_enemy_coral_guardian.png    (small 12×12 centered in 16×16)
  assets/sprites/enemies/event/char_enemy_heatwave_spirit.png  (small 12×12 centered in 16×16)

  -- Summer Event Boss: Tide Lord (256×32, 8 frames × 32px) --
  assets/sprites/enemies/event/char_enemy_boss_tide_lord.png

  -- Summer Decoration Tileset (128×48, 8×3 tiles of 16×16) --
  assets/tiles/tilesets/tileset_seasonal_summer.png

  -- Summer Reward Item Sprites (16×16 each) --
  assets/sprites/pickups/icon_reward_summer_sun_blade.png
  assets/sprites/pickups/icon_reward_summer_coral_shield.png
  assets/sprites/pickups/icon_reward_summer_tide_armor.png
  assets/sprites/pickups/icon_reward_summer_shell_crown.png
  assets/sprites/pickups/icon_reward_summer_tidal_wings.png
  assets/sprites/pickups/icon_reward_summer_treasure_chest.png

  -- Summer Event Banner (128×48) --
  assets/ui/seasonal/ui_seasonal_banner_summer_event.png

  -- Summer Event UI Decorations (16×16 each) --
  assets/ui/seasonal/ui_summer_decor_corner.png
  assets/ui/seasonal/ui_summer_decor_divider.png
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

# ─── Summer-specific color shortcuts ──────────────────────────────────────────
# Summer uses warm golds/oranges for sun + blues for ocean
# Sun fire: FR (fire orange), EM (ember), YL (bright yellow)
# Sand/beach: SN (sand), DS (desert gold), PS (pale sand)
# Ocean/coral: SB (sky blue), HB (pale water), DP (ocean blue)
SU  = YL   # sun glow
SF  = FR   # sun fire
WM  = EM   # warm ember
SH  = PS   # shell/sand highlight
WV  = SB   # wave blue
WH  = HB   # wave highlight
CR  = DP   # coral/deep water

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
# ENEMY 1: SUN ELEMENTAL — floating fire/sun creature, 16×16, 8 frames
# Frames 0-3: idle pulse, Frames 4-7: attack (solar flare)
# Color: yellow/gold core (YL/GD), fire corona (FR/EM), red eyes (BR)
# ═══════════════════════════════════════════════════════════════════════════════

def make_sun_elemental():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        # Float bob
        bob = [0, -1, -1, 0][anim]

        # Core body (bright sun orb)
        cy = 8 + bob
        cx = 7
        # Inner core (bright)
        fill_rect(g, 6, cy - 1, 4, 3, YL)
        set_px(g, 7, cy, PY)
        set_px(g, 8, cy, PY)

        # Outer glow ring
        for gx, gy in [(5, cy - 1), (10, cy - 1), (5, cy + 1), (10, cy + 1),
                        (6, cy - 2), (7, cy - 2), (8, cy - 2), (9, cy - 2),
                        (6, cy + 2), (7, cy + 2), (8, cy + 2), (9, cy + 2)]:
            set_px(g, gx, gy, GD)

        # Corona rays (rotate each frame)
        ray_sets = [
            [(4, cy - 3), (11, cy - 3), (4, cy + 3), (11, cy + 3)],
            [(3, cy - 2), (12, cy - 2), (3, cy + 2), (12, cy + 2)],
            [(4, cy - 3), (11, cy + 3), (3, cy), (12, cy)],
            [(3, cy - 2), (12, cy + 2), (4, cy + 3), (11, cy - 3)],
        ]
        for rx, ry in ray_sets[anim]:
            set_px(g, rx, ry, FR)

        # Fire wisps around body
        wisp_sets = [
            [(5, cy - 3), (10, cy + 3)],
            [(4, cy - 2), (11, cy + 2)],
            [(5, cy + 3), (10, cy - 3)],
            [(4, cy + 2), (11, cy - 2)],
        ]
        for wx, wy in wisp_sets[anim]:
            set_px(g, wx, wy, EM)

        # Eyes (enemy red, glowing)
        set_px(g, 7, cy, BR)
        set_px(g, 8, cy, BR)

        if is_attack:
            # Solar flare — fire beams shoot outward
            flare_len = [1, 2, 3, 2][anim]
            for fl in range(1, flare_len + 1):
                set_px(g, cx - fl - 3, cy, FR)
                set_px(g, cx + fl + 4, cy, FR)
                set_px(g, cx, cy - fl - 3, FR)
                if fl > 1:
                    set_px(g, cx - fl - 3, cy - 1, EM)
                    set_px(g, cx + fl + 4, cy + 1, EM)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_sun_elemental.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# ENEMY 2: SANDSTORM GOLEM — hulking sand creature, 16×16, 8 frames
# Frames 0-3: idle sway, Frames 4-7: attack (sand slam)
# Color: sand body (SN/DS), brown core (BN/DT), red eyes (BR)
# ═══════════════════════════════════════════════════════════════════════════════

def make_sandstorm_golem():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, 0, -1, 0][anim] if not is_attack else 0
        slam = [0, 1, 2, 1][anim] if is_attack else 0

        # Feet (base)
        set_px(g, 5, 14 + bob, DT)
        set_px(g, 6, 14 + bob, SN)
        set_px(g, 9, 14 + bob, SN)
        set_px(g, 10, 14 + bob, DT)
        set_px(g, 5, 15, BN)
        set_px(g, 6, 15, BN)
        set_px(g, 9, 15, BN)
        set_px(g, 10, 15, BN)

        # Body (bulky sand mass)
        for dy in range(7, 14 + bob):
            set_px(g, 5, dy, BN)
            set_px(g, 6, dy, SN)
            set_px(g, 7, dy, DS)
            set_px(g, 8, dy, DS)
            set_px(g, 9, dy, SN)
            set_px(g, 10, dy, BN)
        # Body highlights (shimmer)
        set_px(g, 7, 9 + bob, PS)
        set_px(g, 8, 10 + bob, PS)

        # Arms
        if not is_attack:
            arm_y = 10 + bob + [0, 0, -1, 0][anim]
            set_px(g, 3, arm_y, SN)
            set_px(g, 4, arm_y, DT)
            set_px(g, 11, arm_y, DT)
            set_px(g, 12, arm_y, SN)
            set_px(g, 2, arm_y - 1, DS)
            set_px(g, 13, arm_y - 1, DS)
        else:
            # Sand slam — arms extend down
            arm_y = 10
            set_px(g, 3, arm_y, DT)
            set_px(g, 4, arm_y, SN)
            set_px(g, 11, arm_y, SN)
            set_px(g, 12, arm_y, DT)
            sy = arm_y + slam
            set_px(g, 2, sy, DS)
            set_px(g, 13, sy, DS)
            if slam >= 2:
                set_px(g, 2, sy + 1, FR)  # impact spark
                set_px(g, 13, sy + 1, FR)

        # Head (rough angular shape)
        set_px(g, 6, 5 + bob, BN)
        set_px(g, 7, 5 + bob, SN)
        set_px(g, 8, 5 + bob, SN)
        set_px(g, 9, 5 + bob, BN)
        set_px(g, 6, 4 + bob, DT)
        set_px(g, 7, 4 + bob, DS)
        set_px(g, 8, 4 + bob, DS)
        set_px(g, 9, 4 + bob, DT)
        set_px(g, 7, 3 + bob, SN)
        set_px(g, 8, 3 + bob, SN)

        # Eyes (enemy red)
        set_px(g, 7, 5 + bob, BR)
        set_px(g, 8, 5 + bob, BR)

        # Sand particles drifting
        particle_sets = [
            [(3, 6), (12, 8)],
            [(4, 5), (11, 9)],
            [(3, 8), (12, 6)],
            [(4, 7), (11, 7)],
        ]
        for px, py in particle_sets[anim]:
            set_px(g, px, py + bob, PS)

        # Outline key pixels
        set_px(g, 6, 3 + bob, K)
        set_px(g, 9, 3 + bob, K)
        set_px(g, 4, 7 + bob, K)
        set_px(g, 11, 7 + bob, K)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_sandstorm_golem.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# ENEMY 3: CORAL GUARDIAN — oceanic defender, 16×16, 8 frames
# Frames 0-3: idle sway, Frames 4-7: attack (water jet)
# Color: coral body (FR/EM), ocean accents (SB/HB), red eyes (BR)
# ═══════════════════════════════════════════════════════════════════════════════

def make_coral_guardian():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, -1, 0, -1][anim]

        # Base/feet (rock foundation)
        fill_rect(g, 5, 14, 6, 2, ST)
        set_px(g, 5, 14, MG)
        set_px(g, 10, 14, MG)

        # Body (coral formation — branching shape)
        for dy in range(7, 14):
            y = dy + bob
            set_px(g, 6, y, FR)
            set_px(g, 7, y, EM)
            set_px(g, 8, y, EM)
            set_px(g, 9, y, FR)
        # Body highlight
        set_px(g, 7, 9 + bob, PS)
        set_px(g, 8, 10 + bob, DS)

        # Coral branches (arms)
        branch_sway = [0, 1, 0, -1][anim]
        # Left branch
        set_px(g, 4, 8 + bob + branch_sway, FR)
        set_px(g, 3, 7 + bob + branch_sway, EM)
        set_px(g, 2, 6 + bob + branch_sway, FR)
        set_px(g, 2, 5 + bob + branch_sway, BR)  # tip
        # Right branch
        set_px(g, 11, 8 + bob - branch_sway, FR)
        set_px(g, 12, 7 + bob - branch_sway, EM)
        set_px(g, 13, 6 + bob - branch_sway, FR)
        set_px(g, 13, 5 + bob - branch_sway, BR)  # tip

        # Head (rounded coral top)
        set_px(g, 6, 5 + bob, EM)
        set_px(g, 7, 5 + bob, FR)
        set_px(g, 8, 5 + bob, FR)
        set_px(g, 9, 5 + bob, EM)
        set_px(g, 7, 4 + bob, EM)
        set_px(g, 8, 4 + bob, EM)
        # Crown spikes
        set_px(g, 6, 3 + bob, BR)
        set_px(g, 9, 3 + bob, BR)
        set_px(g, 7, 3 + bob, FR)
        set_px(g, 8, 3 + bob, FR)

        # Eyes (glowing blue for ocean creature)
        set_px(g, 7, 5 + bob, HB)
        set_px(g, 8, 5 + bob, SB)

        # Water droplets / bubbles
        bubble_sets = [
            [(5, 4), (10, 6)],
            [(4, 5), (11, 5)],
            [(5, 6), (10, 4)],
            [(4, 4), (11, 6)],
        ]
        for bx, by in bubble_sets[anim]:
            set_px(g, bx, by + bob, HB)

        if is_attack:
            # Water jet — shoots forward
            jet_len = [1, 2, 3, 2][anim]
            for jd in range(1, jet_len + 1):
                set_px(g, 7, 14 + jd, SB)
                set_px(g, 8, 14 + jd, HB)
                if jd > 1:
                    set_px(g, 6, 14 + jd, PB)
                    set_px(g, 9, 14 + jd, PB)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_coral_guardian.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# ENEMY 4: HEATWAVE SPIRIT — shimmering heat mirage, 16×16, 8 frames
# Frames 0-3: shimmer float, Frames 4-7: attack (heat burst)
# Color: orange/yellow body (FR/EM/YL), heat shimmer (PY/NW), red eyes (BR)
# ═══════════════════════════════════════════════════════════════════════════════

def make_heatwave_spirit():
    frames = []
    for f in range(8):
        g = blank(16, 16)
        is_attack = f >= 4
        anim = f % 4

        # Shimmer bob (more floaty)
        bob = [0, -1, -2, -1][anim]

        # Wispy body (tapers from bottom to top)
        cy = 8 + bob
        # Bottom wisp (wide)
        set_px(g, 5, cy + 3, EM)
        set_px(g, 6, cy + 3, FR)
        set_px(g, 7, cy + 3, FR)
        set_px(g, 8, cy + 3, FR)
        set_px(g, 9, cy + 3, FR)
        set_px(g, 10, cy + 3, EM)
        # Mid body
        set_px(g, 6, cy + 2, FR)
        set_px(g, 7, cy + 2, YL)
        set_px(g, 8, cy + 2, YL)
        set_px(g, 9, cy + 2, FR)
        # Upper body
        set_px(g, 6, cy + 1, EM)
        set_px(g, 7, cy + 1, YL)
        set_px(g, 8, cy + 1, YL)
        set_px(g, 9, cy + 1, EM)
        # Core
        set_px(g, 7, cy, PY)
        set_px(g, 8, cy, PY)
        # Head
        set_px(g, 7, cy - 1, YL)
        set_px(g, 8, cy - 1, YL)
        set_px(g, 7, cy - 2, GD)
        set_px(g, 8, cy - 2, GD)

        # Eyes (enemy red)
        set_px(g, 7, cy - 1, BR)
        set_px(g, 8, cy - 1, BR)

        # Shimmer particles (heat haze)
        shimmer_sets = [
            [(5, cy - 2), (10, cy + 4), (4, cy + 1)],
            [(10, cy - 2), (5, cy + 4), (11, cy)],
            [(4, cy - 1), (11, cy + 3), (6, cy - 3)],
            [(11, cy - 1), (4, cy + 3), (9, cy - 3)],
        ]
        for sx, sy in shimmer_sets[anim]:
            set_px(g, sx, sy, PY)

        # Trailing heat below
        trail_y = cy + 4
        for i, dx in enumerate([-1, 0, 1, 2]):
            if (i + anim) % 2 == 0:
                set_px(g, 7 + dx, trail_y + 1, EM)

        if is_attack:
            # Heat burst — expanding ring of fire
            burst_radius = [1, 2, 3, 2][anim]
            ring_positions = [
                [(cx, cy - burst_radius), (cx, cy + burst_radius + 3),
                 (cx - burst_radius - 2, cy + 1), (cx + burst_radius + 3, cy + 1)]
                for cx in [7]
            ][0]
            for bx, by in ring_positions:
                set_px(g, bx, by, FR)
                set_px(g, bx + 1, by, EM)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_heatwave_spirit.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# BOSS: TIDE LORD — large 32×32, 8 frames
# Frames 0-3: idle (waves crash, tentacles sway), Frames 4-7: attack (tidal slam)
# Color: ocean body (DP/SB/HB), coral crown (FR/EM), trident (GD/YL)
# ═══════════════════════════════════════════════════════════════════════════════

def make_tide_lord():
    frames = []
    for f in range(8):
        g = blank(32, 32)
        is_attack = f >= 4
        anim = f % 4

        bob = [0, 0, -1, 0][anim] if not is_attack else 0

        # Wave base (water pool)
        for wx in range(6, 26):
            set_px(g, wx, 30, DP)
            set_px(g, wx, 31, OC)
        for wx in range(4, 28):
            set_px(g, wx, 29, SB)
        # Wave foam
        foam_off = [0, 1, 0, -1][anim]
        set_px(g, 5 + foam_off, 29, HB)
        set_px(g, 10 - foam_off, 29, IW)
        set_px(g, 20 + foam_off, 29, HB)
        set_px(g, 25 - foam_off, 29, IW)

        # Main body (water/ocean humanoid torso)
        for dy in range(12, 29):
            y = dy + bob
            if y < 0 or y >= 32:
                continue
            body_width = 10 if dy < 20 else 12
            start_x = 16 - body_width // 2
            for dx in range(body_width):
                px = start_x + dx
                if dx == 0 or dx == body_width - 1:
                    set_px(g, px, y, OC)
                elif dx == 1 or dx == body_width - 2:
                    set_px(g, px, y, DP)
                else:
                    set_px(g, px, y, SB)

        # Body wave texture
        for ty in [14, 18, 22, 26]:
            y = ty + bob
            if 0 <= y < 32:
                set_px(g, 13, y, HB)
                set_px(g, 18, y, HB)

        # Shoulder coral formations
        shoulder_y = 14 + bob
        # Left coral
        for cx in range(6, 11):
            set_px(g, cx, shoulder_y, FR)
            set_px(g, cx, shoulder_y - 1, EM)
        set_px(g, 5, shoulder_y - 1, BR)
        set_px(g, 5, shoulder_y - 2, FR)
        set_px(g, 6, shoulder_y - 2, EM)

        # Right coral
        for cx in range(21, 26):
            set_px(g, cx, shoulder_y, FR)
            set_px(g, cx, shoulder_y - 1, EM)
        set_px(g, 26, shoulder_y - 1, BR)
        set_px(g, 26, shoulder_y - 2, FR)
        set_px(g, 25, shoulder_y - 2, EM)

        # Tentacle arms
        if not is_attack:
            arm_sway = [-1, 0, 1, 0][anim]
            # Left tentacle
            for ay in range(16, 26):
                ax = 10 - (ay - 16) // 2 + arm_sway + bob
                set_px(g, ax, ay + bob, SB)
                set_px(g, ax - 1, ay + bob, DP)
            # Right tentacle
            for ay in range(16, 26):
                ax = 21 + (ay - 16) // 2 - arm_sway + bob
                set_px(g, ax, ay + bob, SB)
                set_px(g, ax + 1, ay + bob, DP)
        else:
            # Tidal slam — tentacles crash down
            slam_ext = [0, 2, 4, 2][anim]
            # Left tentacle slams
            for ay in range(16, 26 + slam_ext):
                ax = 8 if ay < 22 else 7
                y = ay + bob
                if 0 <= y < 32:
                    set_px(g, ax, y, SB)
                    set_px(g, ax - 1, y, DP)
            # Right tentacle slams
            for ay in range(16, 26 + slam_ext):
                ax = 23 if ay < 22 else 24
                y = ay + bob
                if 0 <= y < 32:
                    set_px(g, ax, y, SB)
                    set_px(g, ax + 1, y, DP)
            # Water splash at impact
            if slam_ext >= 4:
                for sx in [-2, -1, 0, 1, 2]:
                    set_px(g, 7 + sx, 28, HB)
                    set_px(g, 24 + sx, 28, HB)
                set_px(g, 5, 27, IW)
                set_px(g, 26, 27, IW)

        # Face (on body)
        face_y = 16 + bob
        # Eyes (glowing gold/amber)
        set_px(g, 14, face_y, GD)
        set_px(g, 15, face_y, YL)
        set_px(g, 17, face_y, YL)
        set_px(g, 18, face_y, GD)
        # Brow
        set_px(g, 13, face_y - 1, DP)
        set_px(g, 14, face_y - 1, SB)
        set_px(g, 18, face_y - 1, SB)
        set_px(g, 19, face_y - 1, DP)
        # Mouth (dark hollow)
        set_px(g, 15, face_y + 2, K)
        set_px(g, 16, face_y + 2, OC)
        set_px(g, 17, face_y + 2, K)
        if is_attack:
            set_px(g, 15, face_y + 3, K)
            set_px(g, 16, face_y + 3, DK)
            set_px(g, 17, face_y + 3, K)

        # Coral crown (top of head)
        crown_y = 8 + bob
        # Trident-like crown center
        set_px(g, 15, crown_y, GD)
        set_px(g, 16, crown_y, YL)
        set_px(g, 15, crown_y - 1, GD)
        set_px(g, 16, crown_y - 1, GD)
        # Crown coral ring
        crown_positions = [
            (14, crown_y), (17, crown_y),
            (13, crown_y + 1), (18, crown_y + 1),
            (13, crown_y + 2), (18, crown_y + 2),
            (14, crown_y + 3), (15, crown_y + 3), (16, crown_y + 3), (17, crown_y + 3),
        ]
        for i, (cpx, cpy) in enumerate(crown_positions):
            c = FR if (i + anim) % 3 != 0 else EM
            set_px(g, cpx, cpy, c)

        # Side coral spires on crown
        for sx, sy in [(11, crown_y + 1), (20, crown_y + 1)]:
            set_px(g, sx, sy, GD)
            set_px(g, sx - 1, sy, FR)
            set_px(g, sx + 1, sy, FR)
            set_px(g, sx, sy - 1, EM)
            set_px(g, sx, sy + 1, BR)

        # Seashell accent on crown top
        set_px(g, 14, crown_y - 2, PS)
        set_px(g, 15, crown_y - 2, SH)
        set_px(g, 16, crown_y - 2, SH)
        set_px(g, 17, crown_y - 2, PS)
        set_px(g, 15, crown_y - 3, DS)
        set_px(g, 16, crown_y - 3, DS)

        # Ambient bubbles
        bubble_drift = [
            [(5, 8), (22, 12), (10, 4)],
            [(7, 10), (24, 8), (12, 3)],
            [(4, 12), (21, 10), (9, 6)],
            [(6, 7), (23, 14), (11, 5)],
        ]
        for bpx, bpy in bubble_drift[anim]:
            set_px(g, bpx, bpy + bob, HB)

        frames.append(g)

    sheet = hstack(frames)
    write_png(os.path.join(ENEMY_EVENT_DIR, 'char_enemy_boss_tide_lord.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMER DECORATION TILESET — 128×48 (8 columns × 3 rows of 16×16 tiles)
# Row 0: Ground overlays (sand patches, seashells, coral pieces, footprints)
# Row 1: Vegetation (palm tree top/trunk, tropical flowers, seaweed, cactus)
# Row 2: Structures (tiki torch, sandcastle, beach umbrella, event marker)
# ═══════════════════════════════════════════════════════════════════════════════

def make_summer_tileset():
    tiles = []

    # ── Row 0: Ground overlays ──

    # Tile 0,0: Sand with scattered seashells
    t = blank(16, 16)
    shell_spots = [(2, 4), (6, 9), (11, 3), (14, 12), (8, 14), (1, 11), (13, 7), (4, 1)]
    for i, (sx, sy) in enumerate(shell_spots):
        c = PS if i % 2 == 0 else SH
        set_px(t, sx, sy, c)
        if i % 3 == 0:
            set_px(t, sx + 1, sy, NW)
    tiles.append(t)

    # Tile 1,0: Dense coral ground cover
    t = blank(16, 16)
    for y in range(16):
        for x in range(16):
            if (x + y) % 5 == 0:
                set_px(t, x, y, FR)
            elif (x * 3 + y * 7) % 11 == 0:
                set_px(t, x, y, EM)
            elif (x * 5 + y * 3) % 13 == 0:
                set_px(t, x, y, BR)
    tiles.append(t)

    # Tile 2,0: Beach sand with tide line
    t = blank(16, 16)
    # Dry sand top
    for y in range(8):
        for x in range(16):
            if (x + y * 3) % 7 == 0:
                set_px(t, x, y, PS)
            elif (x * 2 + y) % 9 == 0:
                set_px(t, x, y, DS)
    # Wet sand bottom
    for y in range(8, 12):
        for x in range(16):
            if (x + y) % 4 == 0:
                set_px(t, x, y, SN)
    # Water edge
    for x in range(16):
        set_px(t, x, 12, HB)
        set_px(t, x, 13, SB)
    # Foam line
    for x in range(0, 16, 3):
        set_px(t, x, 11, IW)
    tiles.append(t)

    # Tile 3,0: Starfish on sand
    t = blank(16, 16)
    # Starfish center
    set_px(t, 7, 8, FR)
    set_px(t, 8, 8, EM)
    # Five arms
    set_px(t, 7, 6, FR)
    set_px(t, 7, 5, EM)
    set_px(t, 7, 10, FR)
    set_px(t, 7, 11, EM)
    set_px(t, 5, 7, FR)
    set_px(t, 4, 7, EM)
    set_px(t, 10, 7, FR)
    set_px(t, 11, 7, EM)
    set_px(t, 9, 9, FR)
    set_px(t, 10, 10, EM)
    # Sand grains around
    set_px(t, 3, 3, PS)
    set_px(t, 12, 12, DS)
    set_px(t, 2, 13, PS)
    tiles.append(t)

    # Tile 4,0: Driftwood piece
    t = blank(16, 16)
    for x in range(2, 14):
        set_px(t, x, 10, BN)
        set_px(t, x, 11, DT)
    # Knots and grain
    set_px(t, 5, 10, BD)
    set_px(t, 9, 11, BD)
    # Sand around
    set_px(t, 3, 12, PS)
    set_px(t, 10, 12, DS)
    tiles.append(t)

    # Tile 5,0: Tidal pool (small water)
    t = blank(16, 16)
    for y in range(5, 12):
        for x in range(4, 12):
            cx, cy = 8.0, 8.5
            if ((x - cx) / 4.0) ** 2 + ((y - cy) / 3.5) ** 2 <= 1.0:
                set_px(t, x, y, SB)
    # Shimmer highlights
    set_px(t, 6, 7, HB)
    set_px(t, 9, 8, IW)
    # Tiny coral inside
    set_px(t, 7, 9, FR)
    set_px(t, 8, 10, EM)
    tiles.append(t)

    # Tile 6,0: Coconut halves
    t = blank(16, 16)
    # Coconut 1 (half shell)
    fill_rect(t, 3, 9, 4, 3, BN)
    set_px(t, 4, 9, DT)
    set_px(t, 5, 10, NW)  # white flesh
    # Coconut 2
    fill_rect(t, 9, 10, 3, 2, BD)
    set_px(t, 10, 10, BN)
    tiles.append(t)

    # Tile 7,0: Crab tracks / footprints in sand
    t = blank(16, 16)
    # Footprint pairs
    for y_off in [3, 8, 13]:
        set_px(t, 6, y_off, SN)
        set_px(t, 7, y_off, SN)
        set_px(t, 6, y_off + 1, SN)
        set_px(t, 9, y_off, SN)
        set_px(t, 10, y_off, SN)
        set_px(t, 10, y_off + 1, SN)
    tiles.append(t)

    row0 = hstack(tiles[:8])

    # ── Row 1: Vegetation ──
    tiles_r1 = []

    # Tile 0,1: Palm tree top (canopy, left half)
    t = blank(16, 16)
    # Palm fronds radiating out
    for y in range(2, 14):
        for x in range(0, 14):
            if ((x - 10) ** 2 + (y - 7) ** 2) < 40:
                c = FG if (x + y) % 4 == 0 else (LG if (x + y) % 3 == 0 else DF)
                set_px(t, x, y, c)
    # Frond veins
    for i in range(6):
        set_px(t, 4 + i, 5 + i, BG)
    # Coconuts
    set_px(t, 9, 9, BN)
    set_px(t, 10, 10, BD)
    set_px(t, 11, 9, BN)
    tiles_r1.append(t)

    # Tile 1,1: Palm tree trunk (vertical)
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
    tiles_r1.append(t)

    # Tile 2,1: Tropical flower bush
    t = blank(16, 16)
    # Bush body
    fill_rect(t, 3, 6, 10, 8, FG)
    fill_rect(t, 4, 5, 8, 1, LG)
    fill_rect(t, 5, 4, 6, 1, BG)
    # Tropical flowers (warm colors)
    for fx, fy in [(4, 6), (7, 5), (10, 7), (5, 9), (9, 8), (12, 6)]:
        set_px(t, fx, fy, FR)
    for fx, fy in [(6, 7), (8, 6), (11, 8)]:
        set_px(t, fx, fy, YL)
    # Dark base
    fill_rect(t, 3, 13, 10, 1, DF)
    tiles_r1.append(t)

    # Tile 3,1: Seaweed patch (tall)
    t = blank(16, 16)
    # Seaweed strands
    for x_base, h in [(3, 10), (6, 12), (9, 9), (12, 11)]:
        for y in range(16 - h, 16):
            wave = 1 if (y + x_base) % 4 < 2 else 0
            c = FG if y > 12 else LG
            set_px(t, x_base + wave, y, c)
        set_px(t, x_base, 16 - h - 1, BG)  # tip
    tiles_r1.append(t)

    # Tile 4,1: Beach grass / dune grass
    t = blank(16, 16)
    # Grass clumps
    for x in [2, 5, 8, 11, 14]:
        for y in range(8, 16):
            set_px(t, x, y, DS if y > 12 else SN)
        set_px(t, x, 7, PS)
        set_px(t, x - 1, 9, SN)
        set_px(t, x + 1, 10, DS)
    tiles_r1.append(t)

    # Tile 5,1: Cactus (small desert plant)
    t = blank(16, 16)
    # Main stem
    for y in range(5, 14):
        set_px(t, 7, y, FG)
        set_px(t, 8, y, DF)
    # Left arm
    set_px(t, 5, 8, FG)
    set_px(t, 6, 8, FG)
    set_px(t, 5, 7, LG)
    set_px(t, 5, 6, FG)
    # Right arm
    set_px(t, 9, 9, FG)
    set_px(t, 10, 9, FG)
    set_px(t, 10, 8, LG)
    set_px(t, 10, 7, FG)
    # Flower on top
    set_px(t, 7, 4, YL)
    set_px(t, 8, 4, FR)
    # Base sand
    set_px(t, 6, 14, SN)
    set_px(t, 9, 14, DS)
    tiles_r1.append(t)

    # Tile 6,1: Coral reef piece
    t = blank(16, 16)
    # Coral formation
    fill_rect(t, 4, 8, 8, 6, FR)
    fill_rect(t, 5, 6, 6, 2, EM)
    # Branch coral
    set_px(t, 3, 7, BR)
    set_px(t, 3, 6, FR)
    set_px(t, 12, 7, BR)
    set_px(t, 12, 6, FR)
    # Polyp details
    set_px(t, 6, 9, YL)
    set_px(t, 9, 10, PY)
    set_px(t, 7, 11, EM)
    # Water around
    set_px(t, 2, 10, SB)
    set_px(t, 13, 9, HB)
    tiles_r1.append(t)

    # Tile 7,1: Beach pond / oasis edge
    t = blank(16, 16)
    # Water
    fill_rect(t, 0, 8, 16, 8, SB)
    fill_rect(t, 0, 8, 16, 2, HB)
    # Sand bank
    fill_rect(t, 0, 6, 16, 2, DS)
    fill_rect(t, 0, 5, 16, 1, PS)
    # Small palm shadow
    set_px(t, 4, 10, DP)
    set_px(t, 5, 11, DP)
    # Shell on bank
    set_px(t, 10, 6, NW)
    set_px(t, 11, 6, PS)
    tiles_r1.append(t)

    row1 = hstack(tiles_r1[:8])

    # ── Row 2: Structures / Event objects ──
    tiles_r2 = []

    # Tile 0,2: Tiki torch
    t = blank(16, 16)
    # Torch post
    for y in range(6, 16):
        set_px(t, 7, y, BN)
        set_px(t, 8, y, DT)
    # Cross piece
    set_px(t, 5, 10, BN)
    set_px(t, 6, 10, DT)
    set_px(t, 9, 10, DT)
    set_px(t, 10, 10, BN)
    # Fire bowl
    fill_rect(t, 5, 5, 6, 2, DT)
    set_px(t, 6, 5, BN)
    set_px(t, 9, 5, BN)
    # Flame
    set_px(t, 7, 3, FR)
    set_px(t, 8, 3, YL)
    set_px(t, 7, 2, YL)
    set_px(t, 8, 2, EM)
    set_px(t, 7, 1, EM)
    tiles_r2.append(t)

    # Tile 1,2: Sandcastle
    t = blank(16, 16)
    # Main tower
    fill_rect(t, 5, 6, 6, 8, SN)
    fill_rect(t, 6, 4, 4, 2, DS)
    # Battlements
    set_px(t, 6, 3, SN)
    set_px(t, 9, 3, SN)
    # Flag
    set_px(t, 7, 1, ER)
    set_px(t, 8, 1, ER)
    set_px(t, 7, 2, BR)
    # Side towers
    fill_rect(t, 2, 8, 3, 6, SN)
    set_px(t, 3, 7, DS)
    fill_rect(t, 11, 8, 3, 6, SN)
    set_px(t, 12, 7, DS)
    # Door
    set_px(t, 7, 13, BD)
    set_px(t, 8, 13, BD)
    set_px(t, 7, 12, BD)
    set_px(t, 8, 12, BD)
    # Sand base
    fill_rect(t, 1, 14, 14, 2, PS)
    tiles_r2.append(t)

    # Tile 2,2: Beach umbrella
    t = blank(16, 16)
    # Umbrella canopy
    for x in range(3, 13):
        set_px(t, x, 3, BR if x % 4 < 2 else NW)
        set_px(t, x, 4, ER if x % 4 < 2 else PG)
    set_px(t, 4, 2, BR)
    set_px(t, 5, 2, NW)
    set_px(t, 10, 2, BR)
    set_px(t, 11, 2, NW)
    # Pole
    for y in range(5, 15):
        set_px(t, 8, y, DT)
    set_px(t, 8, 15, BN)
    # Sand base
    set_px(t, 7, 15, PS)
    set_px(t, 9, 15, PS)
    tiles_r2.append(t)

    # Tile 3,2: Event flag/banner pole (summer themed)
    t = blank(16, 16)
    # Pole
    for y in range(2, 16):
        set_px(t, 3, y, DT)
    set_px(t, 3, 1, GD)  # gold finial
    # Banner fabric (warm orange/gold)
    fill_rect(t, 4, 2, 8, 10, DS)
    fill_rect(t, 5, 3, 6, 8, SN)
    # Sun emblem
    set_px(t, 7, 6, YL)
    set_px(t, 8, 6, GD)
    set_px(t, 6, 5, FR)
    set_px(t, 9, 5, FR)
    set_px(t, 6, 7, FR)
    set_px(t, 9, 7, FR)
    set_px(t, 7, 5, EM)
    set_px(t, 8, 7, EM)
    # Banner bottom (pointed)
    set_px(t, 5, 12, SN)
    set_px(t, 10, 12, SN)
    set_px(t, 6, 13, DS)
    set_px(t, 9, 13, DS)
    set_px(t, 7, 14, SN)
    set_px(t, 8, 14, SN)
    tiles_r2.append(t)

    # Tile 4,2: Treasure chest (half buried in sand)
    t = blank(16, 16)
    # Chest body
    fill_rect(t, 4, 8, 8, 5, BN)
    fill_rect(t, 4, 8, 8, 1, DT)
    # Lid
    fill_rect(t, 3, 6, 10, 2, DT)
    fill_rect(t, 4, 5, 8, 1, BN)
    # Gold trim
    set_px(t, 3, 7, GD)
    set_px(t, 12, 7, GD)
    set_px(t, 7, 7, GD)
    set_px(t, 8, 7, GD)
    # Lock
    set_px(t, 7, 9, GD)
    set_px(t, 8, 9, DG)
    # Sand around base
    fill_rect(t, 2, 13, 12, 3, PS)
    set_px(t, 3, 12, SN)
    set_px(t, 11, 12, DS)
    tiles_r2.append(t)

    # Tile 5,2: Surfboard in sand
    t = blank(16, 16)
    # Board (angled)
    for i in range(10):
        set_px(t, 5 + i, 12 - i, PB)
        set_px(t, 6 + i, 12 - i, SB)
    # Fin
    set_px(t, 13, 4, HB)
    # Sand mound
    fill_rect(t, 3, 13, 6, 3, PS)
    set_px(t, 4, 12, SN)
    tiles_r2.append(t)

    # Tile 6,2: Conch shell (large decorative)
    t = blank(16, 16)
    # Shell spiral
    fill_rect(t, 5, 6, 6, 6, EM)
    fill_rect(t, 6, 7, 4, 4, FR)
    set_px(t, 7, 8, PS)
    set_px(t, 8, 9, NW)
    # Spiral line
    set_px(t, 5, 8, BN)
    set_px(t, 6, 9, DT)
    set_px(t, 7, 10, BN)
    # Opening
    set_px(t, 10, 8, PY)
    set_px(t, 10, 9, PS)
    set_px(t, 11, 8, NW)
    # Lip
    set_px(t, 4, 7, BR)
    set_px(t, 4, 10, FR)
    tiles_r2.append(t)

    # Tile 7,2: Summer event quest marker (sun orb)
    t = blank(16, 16)
    # Glowing sun orb
    fill_rect(t, 5, 4, 6, 6, GD)
    fill_rect(t, 6, 3, 4, 1, YL)
    fill_rect(t, 6, 10, 4, 1, YL)
    set_px(t, 5, 5, FR)
    set_px(t, 10, 5, FR)
    set_px(t, 5, 8, FR)
    set_px(t, 10, 8, FR)
    # Inner glow
    set_px(t, 7, 6, PY)
    set_px(t, 8, 6, NW)
    set_px(t, 7, 7, NW)
    set_px(t, 8, 7, PY)
    # Sun ray accents
    set_px(t, 7, 2, EM)
    set_px(t, 8, 2, EM)
    set_px(t, 4, 6, EM)
    set_px(t, 11, 7, EM)
    # Base heat shimmer
    set_px(t, 6, 12, DS)
    set_px(t, 9, 13, DS)
    set_px(t, 7, 14, SN)
    tiles_r2.append(t)

    row2 = hstack(tiles_r2[:8])
    full_tileset = vstack([row0, row1, row2])
    write_png(os.path.join(TILESET_DIR, 'tileset_seasonal_summer.png'), full_tileset)


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMER REWARD ITEMS — 16×16 each
# Follow icon style: clear silhouette, 4-6 palette colors per icon
# ═══════════════════════════════════════════════════════════════════════════════

def make_summer_rewards():

    # 1. Sun Blade — fiery gold sword with sun guard
    t = blank(16, 16)
    # Blade (diagonal, bottom-left to top-right)
    for i in range(8):
        set_px(t, 4 + i, 11 - i, GD)
        set_px(t, 5 + i, 11 - i, YL)
    # Fire edge
    for i in range(8):
        set_px(t, 3 + i, 12 - i, FR)
    # Guard (sun-shaped)
    set_px(t, 4, 12, GD)
    set_px(t, 5, 12, YL)
    set_px(t, 3, 11, FR)
    set_px(t, 6, 11, FR)
    set_px(t, 4, 13, EM)
    set_px(t, 5, 13, EM)
    # Handle
    set_px(t, 3, 13, BN)
    set_px(t, 2, 14, BN)
    set_px(t, 1, 15, DT)
    # Tip sparkle
    set_px(t, 12, 3, NW)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_summer_sun_blade.png'), t)

    # 2. Coral Shield — ocean blue shield with coral accent
    t = blank(16, 16)
    # Shield body
    fill_rect(t, 4, 3, 8, 10, SB)
    fill_rect(t, 5, 2, 6, 1, DP)
    fill_rect(t, 5, 13, 6, 1, DP)
    # Shield edges
    set_px(t, 4, 4, DP)
    set_px(t, 11, 4, DP)
    set_px(t, 4, 11, DP)
    set_px(t, 11, 11, DP)
    # Point at bottom
    set_px(t, 6, 14, SB)
    set_px(t, 9, 14, SB)
    set_px(t, 7, 15, DP)
    set_px(t, 8, 15, DP)
    # Coral emblem center
    set_px(t, 7, 7, FR)
    set_px(t, 8, 7, EM)
    set_px(t, 6, 6, FR)
    set_px(t, 9, 6, FR)
    set_px(t, 7, 5, EM)
    set_px(t, 8, 8, FR)
    # Wave highlight
    set_px(t, 5, 5, HB)
    set_px(t, 10, 5, HB)
    set_px(t, 7, 3, IW)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_summer_coral_shield.png'), t)

    # 3. Tide Armor — ocean blue chest piece with wave motif
    t = blank(16, 16)
    # Armor body
    fill_rect(t, 4, 4, 8, 9, SB)
    fill_rect(t, 5, 3, 6, 1, DP)
    # Shoulder pads
    fill_rect(t, 2, 4, 2, 3, DP)
    fill_rect(t, 12, 4, 2, 3, DP)
    # Wave detail (horizontal wavy lines)
    for x in range(5, 11):
        wave_y = 7 if x % 2 == 0 else 8
        set_px(t, x, wave_y, HB)
    for x in range(5, 11):
        wave_y = 10 if x % 2 == 0 else 9
        set_px(t, x, wave_y, IW)
    # Center shell emblem
    set_px(t, 7, 6, PS)
    set_px(t, 8, 6, NW)
    # Bottom edge
    fill_rect(t, 4, 13, 8, 1, OC)
    set_px(t, 4, 12, DP)
    set_px(t, 11, 12, DP)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_summer_tide_armor.png'), t)

    # 4. Shell Crown — sand/pearl cosmetic headpiece
    t = blank(16, 16)
    # Crown band (curved)
    for x in range(4, 12):
        y = 8 + int(1.5 * ((x - 8) / 4.0) ** 2)
        set_px(t, x, y, DS)
        set_px(t, x, y + 1, SN)
    # Shells on top
    set_px(t, 5, 7, PS)
    set_px(t, 7, 6, NW)
    set_px(t, 8, 5, PS)
    set_px(t, 9, 6, SH)
    set_px(t, 11, 7, PS)
    # Pearl accents between shells
    set_px(t, 6, 7, IW)
    set_px(t, 10, 7, IW)
    set_px(t, 8, 6, HB)
    # Side drops (shell dangles)
    set_px(t, 3, 9, DS)
    set_px(t, 3, 10, PS)
    set_px(t, 12, 9, DS)
    set_px(t, 12, 10, PS)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_summer_shell_crown.png'), t)

    # 5. Tidal Wings — water/ice blue wing back piece (cosmetic)
    t = blank(16, 16)
    # Left wing (upper)
    fill_rect(t, 2, 3, 4, 4, SB)
    set_px(t, 3, 4, HB)
    set_px(t, 4, 5, IW)
    set_px(t, 2, 3, DP)
    # Left wing (lower)
    fill_rect(t, 3, 8, 3, 3, SB)
    set_px(t, 4, 9, HB)
    # Right wing (upper)
    fill_rect(t, 10, 3, 4, 4, SB)
    set_px(t, 12, 4, HB)
    set_px(t, 11, 5, IW)
    set_px(t, 13, 3, DP)
    # Right wing (lower)
    fill_rect(t, 10, 8, 3, 3, SB)
    set_px(t, 11, 9, HB)
    # Body center
    set_px(t, 7, 5, K)
    set_px(t, 8, 5, K)
    set_px(t, 7, 6, K)
    set_px(t, 8, 6, K)
    set_px(t, 7, 7, K)
    set_px(t, 8, 7, K)
    # Wing edges
    set_px(t, 1, 4, IW)
    set_px(t, 14, 4, IW)
    # Water trail
    set_px(t, 5, 11, HB)
    set_px(t, 10, 12, HB)
    set_px(t, 7, 13, SB)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_summer_tidal_wings.png'), t)

    # 6. Treasure Chest — gold/brown treasure container
    t = blank(16, 16)
    # Chest body
    fill_rect(t, 4, 7, 8, 6, BN)
    fill_rect(t, 5, 6, 6, 1, DT)
    # Lid (slightly open, showing gold)
    fill_rect(t, 3, 4, 10, 2, DT)
    fill_rect(t, 4, 3, 8, 1, BN)
    # Gold trim
    set_px(t, 3, 5, GD)
    set_px(t, 12, 5, GD)
    set_px(t, 7, 5, GD)
    set_px(t, 8, 5, GD)
    # Lock
    set_px(t, 7, 8, GD)
    set_px(t, 8, 8, DG)
    # Glint of gold inside
    set_px(t, 6, 5, YL)
    set_px(t, 9, 5, YL)
    set_px(t, 7, 4, PY)
    # Shadow
    fill_rect(t, 5, 13, 6, 1, BD)
    write_png(os.path.join(PICKUP_DIR, 'icon_reward_summer_treasure_chest.png'), t)


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMER EVENT BANNER — 128×48 (matches existing seasonal banner format)
# Palm tree silhouettes, "SUMMER TIDE" event title area,
# warm orange/gold/blue color scheme
# ═══════════════════════════════════════════════════════════════════════════════

def make_summer_banner():
    g = blank(128, 48)

    # Background gradient (warm gold to sand)
    for y in range(48):
        for x in range(128):
            if y < 16:
                g[y][x] = SB  # sky blue top
            elif y < 32:
                g[y][x] = DS  # desert gold mid
            else:
                g[y][x] = SN  # sand bottom

    # Border frame
    draw_rect_outline(g, 0, 0, 128, 48, BD)
    draw_rect_outline(g, 1, 1, 126, 46, BN)

    # Palm tree (left side)
    # Trunk
    for y in range(20, 46):
        set_px(g, 14, y, BN)
        set_px(g, 15, y, DT)
        set_px(g, 16, y, BN)
    # Bark rings
    for ry in range(22, 44, 4):
        set_px(g, 14, ry, BD)
        set_px(g, 16, ry, BD)
    # Fronds
    for y in range(4, 22):
        for x in range(4, 28):
            dist = ((x - 15) ** 2 + (y - 12) ** 2)
            if dist < 80:
                if (x + y) % 3 == 0:
                    g[y][x] = FG
                elif (x + y) % 4 == 0:
                    g[y][x] = DF
                elif (x + y) % 5 == 0:
                    g[y][x] = BG
                else:
                    g[y][x] = LG
    # Coconuts
    set_px(g, 13, 18, BD)
    set_px(g, 17, 19, BN)

    # Palm tree (right side, mirrored)
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
                if (x + y) % 3 == 0:
                    g[y][x] = FG
                elif (x + y) % 4 == 0:
                    g[y][x] = DF
                elif (x + y) % 5 == 0:
                    g[y][x] = BG
                else:
                    g[y][x] = LG
    set_px(g, 115, 20, BD)
    set_px(g, 111, 21, BN)

    # Center text area (darker background panel)
    fill_rect(g, 30, 10, 68, 28, BD)
    fill_rect(g, 31, 11, 66, 26, BN)
    fill_rect(g, 32, 12, 64, 24, DS)
    draw_rect_outline(g, 31, 11, 66, 26, GD)

    # "SUMMER" text (pixel font, ~5px tall)
    # S
    fill_rect(g, 36, 16, 4, 1, K)
    set_px(g, 35, 17, K)
    fill_rect(g, 36, 18, 3, 1, K)
    set_px(g, 38, 19, K)
    fill_rect(g, 35, 20, 4, 1, K)
    # U
    fill_rect(g, 40, 16, 1, 4, K)
    fill_rect(g, 44, 16, 1, 4, K)
    fill_rect(g, 41, 20, 3, 1, K)
    # M
    fill_rect(g, 46, 16, 1, 5, K)
    set_px(g, 47, 17, K)
    set_px(g, 48, 18, K)
    set_px(g, 49, 17, K)
    fill_rect(g, 50, 16, 1, 5, K)
    # M
    fill_rect(g, 52, 16, 1, 5, K)
    set_px(g, 53, 17, K)
    set_px(g, 54, 18, K)
    set_px(g, 55, 17, K)
    fill_rect(g, 56, 16, 1, 5, K)
    # E
    fill_rect(g, 58, 16, 1, 5, K)
    fill_rect(g, 59, 16, 3, 1, K)
    fill_rect(g, 59, 18, 2, 1, K)
    fill_rect(g, 59, 20, 3, 1, K)
    # R
    fill_rect(g, 63, 16, 1, 5, K)
    fill_rect(g, 64, 16, 3, 1, K)
    set_px(g, 66, 17, K)
    fill_rect(g, 64, 18, 3, 1, K)
    set_px(g, 65, 19, K)
    set_px(g, 66, 20, K)

    # "TIDE" subtitle text
    # T
    fill_rect(g, 46, 25, 5, 1, K)
    fill_rect(g, 48, 26, 1, 4, K)
    # I
    fill_rect(g, 52, 25, 3, 1, K)
    set_px(g, 53, 26, K)
    set_px(g, 53, 27, K)
    set_px(g, 53, 28, K)
    fill_rect(g, 52, 29, 3, 1, K)
    # D
    fill_rect(g, 56, 25, 1, 5, K)
    fill_rect(g, 57, 25, 2, 1, K)
    set_px(g, 59, 26, K)
    set_px(g, 59, 27, K)
    set_px(g, 59, 28, K)
    fill_rect(g, 57, 29, 2, 1, K)
    # E
    fill_rect(g, 61, 25, 1, 5, K)
    fill_rect(g, 62, 25, 3, 1, K)
    fill_rect(g, 62, 27, 2, 1, K)
    fill_rect(g, 62, 29, 3, 1, K)

    # Decorative suns in banner corners
    sun_positions = [(33, 13), (93, 13), (33, 33), (93, 33)]
    for sx, sy in sun_positions:
        set_px(g, sx, sy, YL)
        set_px(g, sx - 1, sy, FR)
        set_px(g, sx + 1, sy, FR)
        set_px(g, sx, sy - 1, FR)
        set_px(g, sx, sy + 1, FR)

    # Wave/water elements along bottom
    for x in range(32, 96, 4):
        set_px(g, x, 40, HB)
        set_px(g, x + 1, 41, SB)
        set_px(g, x + 2, 40, HB)

    # Sun rays from top
    for x in range(40, 90, 8):
        set_px(g, x, 3, YL)
        set_px(g, x + 1, 4, GD)
        set_px(g, x + 2, 5, EM)

    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_seasonal_banner_summer_event.png'), g)


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMER UI DECORATIONS — corner and divider pieces (16×16 each)
# ═══════════════════════════════════════════════════════════════════════════════

def make_summer_ui_decor():
    # Corner decoration (wave/shell corner piece for UI panels)
    t = blank(16, 16)
    # Wave L-shape
    for x in range(16):
        set_px(t, x, 15, SB)
    for y in range(16):
        set_px(t, 0, y, SB)
    # Corner shell
    set_px(t, 1, 14, PS)
    set_px(t, 0, 13, DS)
    set_px(t, 2, 13, NW)
    set_px(t, 1, 12, SN)
    set_px(t, 1, 15, SH)
    # Foam dots along wave
    set_px(t, 5, 14, HB)
    set_px(t, 9, 14, IW)
    set_px(t, 13, 14, HB)
    set_px(t, 1, 10, HB)
    set_px(t, 1, 6, IW)
    set_px(t, 1, 3, HB)
    # Small bubbles
    set_px(t, 7, 13, IW)
    set_px(t, 2, 8, HB)
    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_summer_decor_corner.png'), t)

    # Divider (horizontal wave divider)
    t = blank(16, 16)
    # Wave line (undulating)
    for x in range(16):
        wave_y = 7 if x % 4 < 2 else 8
        set_px(t, x, wave_y, SB)
        set_px(t, x, wave_y + 1, DP)
    # Foam crests
    set_px(t, 2, 6, HB)
    set_px(t, 6, 7, IW)
    set_px(t, 10, 6, HB)
    set_px(t, 14, 7, IW)
    # Shell accents
    set_px(t, 4, 5, PS)
    set_px(t, 4, 4, DS)
    set_px(t, 12, 5, PS)
    set_px(t, 12, 4, NW)
    # Bubble details
    set_px(t, 0, 6, IW)
    set_px(t, 0, 5, HB)
    set_px(t, 15, 9, HB)
    set_px(t, 15, 10, SB)
    write_png(os.path.join(SEASONAL_UI_DIR, 'ui_summer_decor_divider.png'), t)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print('=== Summer Seasonal Event Art Pack (PIX-260) ===\n')

    print('-- Summer Event Enemies --')
    make_sun_elemental()
    make_sandstorm_golem()
    make_coral_guardian()
    make_heatwave_spirit()

    print('\n-- Tide Lord Boss --')
    make_tide_lord()

    print('\n-- Summer Decoration Tileset --')
    make_summer_tileset()

    print('\n-- Summer Reward Items --')
    make_summer_rewards()

    print('\n-- Summer Event Banner --')
    make_summer_banner()

    print('\n-- Summer UI Decorations --')
    make_summer_ui_decor()

    print('\n=== Done! All summer event assets generated. ===')
