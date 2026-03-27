#!/usr/bin/env python3
"""
Generate procedural dungeon boss variant sprites and loot chest art for PixelRealm (PIX-356).
Uses only Python stdlib (struct + zlib) — no PIL required.
Follows docs/ART-STYLE-GUIDE.md and the master 32-color palette exactly.

Assets produced (placed in public/assets/dungeon-variants/):
  Boss variant spritesheets (384x32 each, 12 frames x 32x32):
    boss_variant_fire_1.png    — Fire theme boss variant 1 (Ember Warden)
    boss_variant_fire_2.png    — Fire theme boss variant 2 (Magma Sentinel)
    boss_variant_fire_3.png    — Fire theme boss variant 3 (Inferno Lord)
    boss_variant_ice_1.png     — Ice theme boss variant 1 (Frost Warden)
    boss_variant_ice_2.png     — Ice theme boss variant 2 (Glacial Sentinel)
    boss_variant_ice_3.png     — Ice theme boss variant 3 (Blizzard Lord)
    boss_variant_shadow_1.png  — Shadow theme boss variant 1 (Shade Warden)
    boss_variant_shadow_2.png  — Shadow theme boss variant 2 (Void Sentinel)
    boss_variant_shadow_3.png  — Shadow theme boss variant 3 (Abyss Lord)

  Loot chest sprites (32x16 each, 2 frames x 16x16: closed + open):
    chest_common.png           — Common wood chest
    chest_ornate.png           — Ornate silver chest
    chest_legendary.png        — Legendary gold chest

  Dungeon entrance portal (128x32, 4 frames x 32x32 animated):
    portal_dungeon_entry.png   — Animated swirl portal

  Mini-boss indicator icon (8x8):
    icon_minimap_miniboss.png  — Skull badge for minimap overlay
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
OUT_DIR = os.path.join(SCRIPT_DIR, '..', 'public', 'assets', 'dungeon-variants')
os.makedirs(OUT_DIR, exist_ok=True)

# --- Palette (RGBA tuples) --- master 32-color palette ---

_ = (0, 0, 0, 0)          # transparent

# Neutrals
K   = (13,  13,  13,  255)   # shadow black / outline
DK  = (43,  43,  43,  255)   # dark rock
ST  = (74,  74,  74,  255)   # stone gray
MG  = (110, 110, 110, 255)   # mid gray
LS  = (150, 150, 150, 255)   # light stone
PG  = (200, 200, 200, 255)   # pale gray
NW  = (240, 240, 240, 255)   # near white

# Warm earth
BD  = (59,  32,  16,  255)   # deep soil
BN  = (107, 58,  31,  255)   # rich earth
DT  = (139, 92,  42,  255)   # dirt / wood
SN  = (184, 132, 63,  255)   # sand / light wood
DS  = (212, 168, 90,  255)   # desert gold
PS  = (232, 208, 138, 255)   # pale sand

# Greens
DF  = (26,  58,  26,  255)   # deep forest
FG  = (45,  110, 45,  255)   # forest green
LG  = (76,  155, 76,  255)   # leaf green
BG  = (120, 200, 120, 255)   # bright grass
FL  = (168, 228, 160, 255)   # light foliage

# Cyan / blue
OC  = (10,  26,  58,  255)   # deep ocean
DP  = (26,  74,  138, 255)   # ocean blue
SB  = (42,  122, 192, 255)   # sky blue
PB  = (80,  168, 232, 255)   # player blue
HB  = (144, 208, 248, 255)   # ice / highlight
IW  = (200, 240, 255, 255)   # shimmer

# Red / enemy / fire
DB  = (90,  10,  10,  255)   # deep blood
ER  = (160, 16,  16,  255)   # enemy red
BR  = (212, 32,  32,  255)   # bright red
FR  = (240, 96,  32,  255)   # fire orange
EM  = (248, 160, 96,  255)   # ember

# Yellow / gold
DG  = (168, 112, 0,   255)   # dark gold
GD  = (232, 184, 0,   255)   # gold
YL  = (255, 224, 64,  255)   # bright yellow
PY  = (255, 248, 160, 255)   # pale highlight

# Purple / magic
PM  = (26,  10,  58,  255)   # deep magic
MP  = (90,  32,  160, 255)   # magic purple
MV  = (144, 80,  224, 255)   # mana violet
SG  = (208, 144, 255, 255)   # spell glow


# --- PNG writer ---

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
    print(f'  wrote {os.path.relpath(path)}  ({width}x{height})')


# --- Pixel helpers ---

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


def dot(grid, x, y, color):
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color


def hline(grid, x, y, w, color):
    rect(grid, x, y, w, 1, color)


def vline(grid, x, y, h, color):
    rect(grid, x, y, 1, h, color)


def outline(grid, x, y, w, h, color):
    hline(grid, x, y, w, color)
    hline(grid, x, y + h - 1, w, color)
    vline(grid, x, y, h, color)
    vline(grid, x + w - 1, y, h, color)


def copy_frame(src):
    return [row[:] for row in src]


# ==============================================================================
# THEME COLOR PALETTES
# Each theme defines: armor_dark, armor_mid, rune_core, rune_glow, rune_bright,
#                      eye_color, eye_bright, aura_color, weapon_dark, weapon_light
# ==============================================================================

FIRE_PALETTE = {
    'armor_dark':   DB,    # deep blood
    'armor_mid':    ER,    # enemy red
    'rune_core':    FR,    # fire orange
    'rune_glow':    EM,    # ember
    'rune_bright':  YL,    # bright yellow
    'eye_color':    FR,    # fire orange
    'eye_bright':   YL,    # bright yellow
    'aura_color':   EM,    # ember
    'weapon_dark':  ER,    # enemy red
    'weapon_light': FR,    # fire orange
    'pauldron':     DK,    # dark rock
    'pauldron_mid': ST,    # stone gray
    'gem':          FR,    # fire orange
}

ICE_PALETTE = {
    'armor_dark':   OC,    # deep ocean
    'armor_mid':    DP,    # ocean blue
    'rune_core':    SB,    # sky blue
    'rune_glow':    PB,    # player blue
    'rune_bright':  HB,    # ice highlight
    'eye_color':    HB,    # ice highlight
    'eye_bright':   IW,    # shimmer
    'aura_color':   PB,    # player blue
    'weapon_dark':  SB,    # sky blue
    'weapon_light': HB,    # ice highlight
    'pauldron':     DP,    # ocean blue
    'pauldron_mid': SB,    # sky blue
    'gem':          HB,    # ice highlight
}

SHADOW_PALETTE = {
    'armor_dark':   K,     # shadow black
    'armor_mid':    PM,    # deep magic
    'rune_core':    MP,    # magic purple
    'rune_glow':    MV,    # mana violet
    'rune_bright':  SG,    # spell glow
    'eye_color':    MV,    # mana violet
    'eye_bright':   SG,    # spell glow
    'aura_color':   MP,    # magic purple
    'weapon_dark':  MP,    # magic purple
    'weapon_light': MV,    # mana violet
    'pauldron':     DK,    # dark rock
    'pauldron_mid': ST,    # stone gray
    'gem':          MV,    # mana violet
}

# Variant modifiers — shift key colors slightly for visual differentiation
def _shift_color(c, dr, dg, db):
    """Shift a color by delta, clamping to 0-255."""
    return (
        max(0, min(255, c[0] + dr)),
        max(0, min(255, c[1] + dg)),
        max(0, min(255, c[2] + db)),
        c[3]
    )

def _make_variant_palette(base, variant_idx):
    """Create a palette variant by shifting colors based on variant index.
    variant_idx 0 = base, 1 = brighter/warmer, 2 = darker/more saturated."""
    if variant_idx == 0:
        return dict(base)
    pal = dict(base)
    if variant_idx == 1:
        # Brighter variant — shift highlights up
        for key in ['rune_glow', 'rune_bright', 'eye_bright', 'aura_color']:
            pal[key] = _shift_color(pal[key], 20, 20, 20)
        pal['armor_mid'] = _shift_color(pal['armor_mid'], 15, 15, 15)
    elif variant_idx == 2:
        # Darker variant — deeper, more saturated
        for key in ['armor_dark', 'armor_mid', 'pauldron']:
            pal[key] = _shift_color(pal[key], -20, -15, -10)
        for key in ['rune_core', 'rune_glow']:
            pal[key] = _shift_color(pal[key], 10, -10, -10)
    return pal


# ==============================================================================
# BOSS VARIANT DRAWING — themed recolor of the Shadow Archon structure
# 12 frames x 32x32: idle(0-1), walk(2-5), attack(6-9), death(10-11)
# ==============================================================================

def _draw_boss_variant(g, frame, pal):
    """Draw a themed boss variant using the provided color palette."""
    is_idle   = frame < 2
    is_walk   = 2 <= frame < 6
    is_attack = 6 <= frame < 10
    is_death  = frame >= 10

    bob = 0
    if is_idle:
        bob = 1 if frame % 2 == 0 else 0
    if is_walk:
        bob = [0, 1, 0, -1][frame - 2]
    if is_death:
        bob = 4

    ad = pal['armor_dark']
    am = pal['armor_mid']
    rc = pal['rune_core']
    rg = pal['rune_glow']
    rb = pal['rune_bright']
    ec = pal['eye_color']
    eb = pal['eye_bright']
    ac = pal['aura_color']
    wd = pal['weapon_dark']
    wl = pal['weapon_light']
    pa = pal['pauldron']
    pm = pal['pauldron_mid']
    gm = pal['gem']

    # Legs
    if not is_death:
        leg_spread = 1 if (is_walk and frame % 2 == 0) else 0
        # Left leg
        rect(g, 8 - leg_spread, 22 + bob, 5, 10 - bob, ad)
        rect(g, 9 - leg_spread, 23 + bob, 3, 8 - bob, am)
        # Right leg
        rect(g, 19 + leg_spread, 22 + bob, 5, 10 - bob, ad)
        rect(g, 20 + leg_spread, 23 + bob, 3, 8 - bob, am)
        # Boots
        rect(g, 7 - leg_spread, 29, 6, 3, ad)
        rect(g, 19 + leg_spread, 29, 6, 3, ad)
        # Trim on boots
        hline(g, 7 - leg_spread, 29, 6, rc)
        hline(g, 19 + leg_spread, 29, 6, rc)
    else:
        # Collapsed
        rect(g, 5, 26, 22, 5, ad)
        rect(g, 6, 27, 20, 3, am)
        for x in range(7, 25, 3):
            dot(g, x, 28, rc)

    # Body — themed plate armor
    body_y = 10 + bob
    rect(g, 7, body_y, 18, 14, ad)
    rect(g, 8, body_y + 1, 16, 12, am)
    # Chest plate
    rect(g, 10, body_y + 2, 12, 8, K)
    rect(g, 11, body_y + 3, 10, 6, am)
    # Glowing rune on chest
    rect(g, 13, body_y + 3, 6, 6, rc)
    rect(g, 14, body_y + 4, 4, 4, rg)
    dot(g, 15, body_y + 5, rb)
    dot(g, 16, body_y + 5, rb)
    dot(g, 15, body_y + 6, rb)
    dot(g, 16, body_y + 6, rb)
    # Shoulder pauldrons
    rect(g, 4, body_y, 5, 4, pa)
    rect(g, 5, body_y + 1, 3, 2, pm)
    rect(g, 23, body_y, 5, 4, pa)
    rect(g, 24, body_y + 1, 3, 2, pm)
    # Gems on pauldrons
    dot(g, 6, body_y + 1, gm)
    dot(g, 25, body_y + 1, gm)

    # Head — horned helmet
    head_y = 2 + bob
    if not is_death:
        rect(g, 10, head_y, 12, 9, ad)
        rect(g, 11, head_y + 1, 10, 7, am)
        # Visor
        rect(g, 12, head_y + 3, 8, 3, K)
        # Glowing eyes behind visor
        rect(g, 13, head_y + 4, 2, 2, ec)
        rect(g, 17, head_y + 4, 2, 2, ec)
        dot(g, 13, head_y + 4, eb)
        dot(g, 18, head_y + 4, eb)
        # Horns
        rect(g, 9, head_y - 2, 2, 4, pa)
        rect(g, 21, head_y - 2, 2, 4, pa)
        dot(g, 9, head_y - 3, pm)
        dot(g, 22, head_y - 3, pm)
        # Crown ridge
        hline(g, 11, head_y, 10, pa)
    else:
        # Fallen head
        rect(g, 8, head_y + 6, 10, 6, ad)
        rect(g, 9, head_y + 7, 8, 4, am)
        dot(g, 10, head_y + 9, ec)
        dot(g, 15, head_y + 9, ec)

    # Arms / weapon
    if not is_death:
        if is_attack:
            swing = frame - 6
            # Raised themed sword
            sword_y = body_y - 4 - swing * 2
            rect(g, 26, sword_y, 3, 14, wd)
            rect(g, 27, sword_y, 1, 14, wl)
            dot(g, 27, sword_y, rb)
            # Guard
            hline(g, 25, sword_y + 10, 5, DG)
            hline(g, 25, sword_y + 11, 5, GD)
            # Arm
            rect(g, 24, body_y + 2, 4, 8, ad)
            rect(g, 25, body_y + 3, 2, 6, am)
            # Spell glow in left hand
            glow_phase = (frame - 6) % 4
            gx = 2
            gy = body_y + 2 - glow_phase
            rect(g, gx, gy, 4, 4, rg)
            rect(g, gx + 1, gy + 1, 2, 2, rb)
            # Left arm
            rect(g, 4, body_y + 2, 4, 8, ad)
            rect(g, 5, body_y + 3, 2, 6, am)
        else:
            # Resting arms
            rect(g, 3, body_y + 2, 5, 10, ad)
            rect(g, 4, body_y + 3, 3, 8, am)
            rect(g, 24, body_y + 2, 5, 10, ad)
            rect(g, 25, body_y + 3, 3, 8, am)
            # Sword held down
            vline(g, 28, body_y + 4, 12, wd)
            vline(g, 29, body_y + 4, 12, wl)
            dot(g, 28, body_y + 4, rb)
            hline(g, 27, body_y + 14, 4, DG)

    # Phase-transition glow (attack frames 8-9)
    if is_attack and frame >= 8:
        for (px, py) in [(3, 5), (28, 3), (6, 28), (25, 27), (15, 1)]:
            dot(g, px, py + bob, rb)
        for (px, py) in [(1, 10), (30, 8), (2, 22), (29, 20)]:
            dot(g, px, py + bob, rg)

    # Aura particles (idle)
    if is_idle:
        aura_dots = [(2, 15), (29, 12), (4, 27), (27, 26)] if frame == 0 else \
                    [(3, 12), (28, 15), (5, 26), (26, 28)]
        for (ax, ay) in aura_dots:
            dot(g, ax, ay, ac)


def gen_boss_variants():
    """Generate 3 boss variants x 3 themes = 9 boss spritesheets."""
    themes = [
        ('fire',   FIRE_PALETTE),
        ('ice',    ICE_PALETTE),
        ('shadow', SHADOW_PALETTE),
    ]
    for theme_name, base_pal in themes:
        for variant_idx in range(3):
            pal = _make_variant_palette(base_pal, variant_idx)
            frames = []
            for i in range(12):
                g = blank(32, 32)
                _draw_boss_variant(g, i, pal)
                frames.append(g)
            sheet = hstack(frames)
            filename = f'boss_variant_{theme_name}_{variant_idx + 1}.png'
            write_png(os.path.join(OUT_DIR, filename), sheet)


# ==============================================================================
# LOOT CHESTS — 3 tiers, each 32x16 (closed 16x16 + open 16x16)
# ==============================================================================

def _draw_chest(g, tier, is_open, x_off=0):
    """Draw a 16x16 loot chest at x_off within the grid.
    tier: 'common' (wood), 'ornate' (silver), 'legendary' (gold)
    """
    if tier == 'common':
        body_dark  = BD   # deep soil
        body_mid   = BN   # rich earth
        body_light = DT   # dirt / wood
        trim       = SN   # sand / light wood
        lock       = MG   # mid gray
        lock_hi    = LS   # light stone
    elif tier == 'ornate':
        body_dark  = ST   # stone gray
        body_mid   = MG   # mid gray
        body_light = LS   # light stone
        trim       = PG   # pale gray
        lock       = DP   # ocean blue
        lock_hi    = SB   # sky blue
    else:  # legendary
        body_dark  = DG   # dark gold
        body_mid   = GD   # gold
        body_light = YL   # bright yellow
        trim       = PY   # pale highlight
        lock       = ER   # enemy red
        lock_hi    = FR   # fire orange

    ox = x_off

    if not is_open:
        # Closed chest
        # Body
        rect(g, ox + 2, 6, 12, 8, body_dark)
        rect(g, ox + 3, 7, 10, 6, body_mid)
        # Lid
        rect(g, ox + 1, 4, 14, 4, body_dark)
        rect(g, ox + 2, 5, 12, 2, body_mid)
        # Trim band
        hline(g, ox + 2, 8, 12, trim)
        # Lock
        rect(g, ox + 6, 7, 4, 4, lock)
        rect(g, ox + 7, 8, 2, 2, lock_hi)
        # Outline
        outline(g, ox + 1, 4, 14, 10, K)
        # Bottom shadow
        hline(g, ox + 2, 14, 12, DK)
    else:
        # Open chest — lid raised
        # Body
        rect(g, ox + 2, 8, 12, 6, body_dark)
        rect(g, ox + 3, 9, 10, 4, body_mid)
        # Lid (tilted back)
        rect(g, ox + 1, 2, 14, 3, body_dark)
        rect(g, ox + 2, 3, 12, 1, body_mid)
        # Hinge connectors
        dot(g, ox + 2, 5, MG)
        dot(g, ox + 13, 5, MG)
        # Interior glow
        rect(g, ox + 3, 6, 10, 3, body_light)
        rect(g, ox + 4, 7, 8, 1, trim)
        # Trim band on body
        hline(g, ox + 2, 10, 12, trim)
        # Outline
        outline(g, ox + 1, 2, 14, 3, K)
        outline(g, ox + 2, 8, 12, 6, K)
        # Bottom shadow
        hline(g, ox + 2, 14, 12, DK)
        # Sparkle for legendary
        if tier == 'legendary':
            dot(g, ox + 5, 7, PY)
            dot(g, ox + 10, 6, PY)
            dot(g, ox + 7, 5, YL)


def gen_loot_chests():
    """Generate 3 tier loot chests with closed + open states."""
    tiers = ['common', 'ornate', 'legendary']
    for tier in tiers:
        g = blank(32, 16)
        _draw_chest(g, tier, is_open=False, x_off=0)
        _draw_chest(g, tier, is_open=True, x_off=16)
        write_png(os.path.join(OUT_DIR, f'chest_{tier}.png'), g)


# ==============================================================================
# DUNGEON ENTRANCE PORTAL — 4 frames x 32x32 = 128x32 animated swirl
# ==============================================================================

def _draw_portal(g, frame):
    """Draw a 32x32 dungeon entry portal with animated swirl effect.
    4 frames of rotation animation.
    """
    cx, cy = 15, 15  # center

    # Stone arch frame
    # Left pillar
    rect(g, 4, 8, 5, 22, DK)
    rect(g, 5, 9, 3, 20, ST)
    vline(g, 6, 10, 18, MG)
    # Right pillar
    rect(g, 23, 8, 5, 22, DK)
    rect(g, 24, 9, 3, 20, ST)
    vline(g, 25, 10, 18, MG)
    # Arch top
    rect(g, 6, 4, 20, 5, DK)
    rect(g, 7, 5, 18, 3, ST)
    hline(g, 8, 6, 16, MG)
    # Arch keystone
    rect(g, 14, 3, 4, 3, MG)
    rect(g, 15, 3, 2, 2, LS)
    # Rune markings on pillars
    dot(g, 6, 12, MP)
    dot(g, 6, 16, MP)
    dot(g, 6, 20, MP)
    dot(g, 25, 12, MP)
    dot(g, 25, 16, MP)
    dot(g, 25, 20, MP)

    # Portal swirl interior (9x18 area between pillars)
    # Base portal fill
    rect(g, 9, 9, 14, 19, PM)

    # Animated swirl rings — rotate position based on frame
    import math
    swirl_colors = [MP, MV, SG, MV]
    for ring in range(4):
        radius = 3 + ring * 1.5
        angle_offset = (frame * 1.57) + (ring * 0.785)  # ~90 deg per frame, staggered
        for step in range(8):
            angle = angle_offset + (step * 0.785)
            px = int(cx + radius * math.cos(angle))
            py = int(cy + radius * math.sin(angle))
            if 9 <= px <= 22 and 9 <= py <= 27:
                color = swirl_colors[ring % len(swirl_colors)]
                dot(g, px, py, color)

    # Central bright core
    rect(g, cx - 1, cy - 1, 3, 3, MV)
    dot(g, cx, cy, SG)

    # Animated bright pixels near center
    bright_offsets = [
        [(cx - 2, cy), (cx + 2, cy), (cx, cy - 2), (cx, cy + 2)],
        [(cx - 2, cy - 1), (cx + 2, cy + 1), (cx + 1, cy - 2), (cx - 1, cy + 2)],
        [(cx - 1, cy - 2), (cx + 1, cy + 2), (cx + 2, cy - 1), (cx - 2, cy + 1)],
        [(cx, cy - 2), (cx, cy + 2), (cx - 2, cy), (cx + 2, cy)],
    ]
    for (bx, by) in bright_offsets[frame % 4]:
        if 9 <= bx <= 22 and 9 <= by <= 27:
            dot(g, bx, by, SG)

    # Outer glow particles
    particle_sets = [
        [(8, 14), (23, 18), (15, 8), (16, 28)],
        [(8, 18), (23, 14), (14, 8), (17, 28)],
        [(9, 12), (22, 20), (13, 9), (18, 27)],
        [(9, 20), (22, 12), (18, 9), (13, 27)],
    ]
    for (px, py) in particle_sets[frame % 4]:
        dot(g, px, py, MV)

    # Floor glow
    rect(g, 10, 28, 12, 2, PM)
    for x in range(11, 21, 2):
        dot(g, x, 29, MP)

    # Pillar base stones
    rect(g, 4, 28, 5, 4, DK)
    rect(g, 5, 29, 3, 2, ST)
    rect(g, 23, 28, 5, 4, DK)
    rect(g, 24, 29, 3, 2, ST)


def gen_portal():
    """Generate dungeon entry portal — 4 frames x 32x32 = 128x32."""
    frames = []
    for i in range(4):
        g = blank(32, 32)
        _draw_portal(g, i)
        frames.append(g)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'portal_dungeon_entry.png'), sheet)


# ==============================================================================
# MINI-BOSS INDICATOR ICON — 8x8 skull badge
# ==============================================================================

def gen_miniboss_icon():
    """Generate 8x8 mini-boss skull badge for dungeon minimap overlay."""
    g = blank(8, 8)

    # Skull shape
    # Top of skull
    rect(g, 1, 0, 6, 2, NW)
    # Skull body
    rect(g, 0, 2, 8, 3, NW)
    rect(g, 1, 2, 6, 3, PG)
    # Eye sockets
    rect(g, 1, 3, 2, 2, K)
    rect(g, 5, 3, 2, 2, K)
    # Eye glow (red for danger)
    dot(g, 1, 3, ER)
    dot(g, 5, 3, ER)
    # Nose
    dot(g, 3, 4, DK)
    dot(g, 4, 4, DK)
    # Jaw
    rect(g, 1, 5, 6, 2, PG)
    # Teeth
    dot(g, 2, 5, K)
    dot(g, 4, 5, K)
    dot(g, 6, 5, K)
    dot(g, 1, 6, K)
    dot(g, 3, 6, K)
    dot(g, 5, 6, K)
    # Outline
    dot(g, 0, 0, K)
    dot(g, 7, 0, K)
    dot(g, 0, 1, K)
    dot(g, 7, 1, K)
    hline(g, 1, 7, 6, K)
    dot(g, 0, 6, K)
    dot(g, 7, 6, K)

    write_png(os.path.join(OUT_DIR, 'icon_minimap_miniboss.png'), g)


# ==============================================================================
# MAIN
# ==============================================================================

if __name__ == '__main__':
    print('Generating dungeon variant assets (PIX-356)...\n')

    print('--- Boss Variants (9 spritesheets) ---')
    gen_boss_variants()

    print('\n--- Loot Chests (3 tiers) ---')
    gen_loot_chests()

    print('\n--- Dungeon Entry Portal ---')
    gen_portal()

    print('\n--- Mini-boss Indicator Icon ---')
    gen_miniboss_icon()

    print('\nDone! All assets in public/assets/dungeon-variants/')
