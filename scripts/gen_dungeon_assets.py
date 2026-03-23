#!/usr/bin/env python3
"""
Generate dungeon system art assets for PixelRealm (PIX-102).
Uses only Python stdlib (struct + zlib) — no PIL required.
Follows docs/ART-STYLE-GUIDE.md exactly.

Assets produced:
  Dungeon decoration sprites:
    sprite_dun_decor_torch.png         — animated torch (4 frames × 16×16 = 64×16)
    sprite_dun_decor_crystal.png       — glowing crystal (4 frames × 16×16 = 64×16)
    sprite_dun_decor_rubble.png        — 16×16 rubble pile
    sprite_dun_decor_barrel.png        — 16×16 barrel
    sprite_dun_decor_bones.png         — 16×16 bone pile

  Dungeon enemy spritesheets (192×24, 12 frames × 16×24):
    char_enemy_dun_skeleton.png        — skeleton warrior
    char_enemy_dun_spider.png          — cave spider
    char_enemy_dun_mage.png            — dark mage
    char_enemy_dun_golem.png           — stone golem

  Dungeon boss spritesheet (384×32, 12 frames × 32×32):
    char_boss_dungeon.png              — dungeon boss (Shadow Archon)

  Dungeon entrance UI:
    ui_panel_dungeon_entrance.png      — 200×160 entrance panel

  Dungeon HUD elements:
    ui_dungeon_room_progress.png       — 120×12 room progress bar
    ui_dungeon_boss_hp_frame.png       — 160×14 boss HP bar frame
    ui_dungeon_timer.png               — 60×16 timer display

  Dungeon loot icons (16×16):
    icon_dun_loot_shadow_blade.png     — shadow sword
    icon_dun_loot_cursed_helm.png      — cursed helmet
    icon_dun_loot_soul_gem.png         — soul gem
    icon_dun_loot_bone_shield.png      — bone shield
    icon_dun_loot_dark_staff.png       — dark staff
    icon_dun_loot_crypt_ring.png       — crypt ring

  Boss chamber background:
    bg_boss_chamber.png                — 320×180 dark chamber backdrop
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
OUT_DIR    = os.path.join(SCRIPT_DIR, '..', 'public', 'assets')
ART_UI     = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui')
ART_DUN    = os.path.join(ART_UI, 'dungeon')
ART_ICONS  = os.path.join(ART_UI, 'icons')
ART_SPRITES = os.path.join(SCRIPT_DIR, '..', 'assets', 'sprites')
ART_BG     = os.path.join(SCRIPT_DIR, '..', 'assets', 'backgrounds')

for d in [OUT_DIR, ART_DUN, ART_ICONS, ART_SPRITES, ART_BG]:
    os.makedirs(d, exist_ok=True)

# ─── Palette (RGBA tuples) — master 32-color palette ─────────────────────────

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
    print(f'  wrote {os.path.relpath(path)}  ({width}×{height})')


# ─── Pixel helpers ───────────────────────────────────────────────────────────

def blank(w, h, fill=None):
    fill = fill or _
    return [[fill] * w for _ in range(h)]


def hstack(frames):
    result = []
    for r in range(len(frames[0])):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result


def vstack(grids):
    result = []
    for g in grids:
        result.extend(g)
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


def mirror_h(src):
    return [row[::-1] for row in src]


def tint_frame(src, color, strength=0.25):
    tr, tg, tb = color[:3]
    result = []
    for row in src:
        new_row = []
        for (r, g, b, a) in row:
            if a == 0:
                new_row.append((r, g, b, a))
            else:
                nr = int(r * (1 - strength) + tr * strength)
                ng = int(g * (1 - strength) + tg * strength)
                nb = int(b * (1 - strength) + tb * strength)
                new_row.append((nr, ng, nb, a))
        result.append(new_row)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# DUNGEON DECORATION SPRITES
# ═══════════════════════════════════════════════════════════════════════════════

def gen_dun_decor_torch():
    """Animated wall torch — 4 frames × 16×16 = 64×16."""
    frames = []
    # Flame flicker patterns: each frame varies the flame top
    flame_tops = [
        [(6, 2), (7, 1), (8, 1), (9, 2)],
        [(6, 3), (7, 2), (8, 1), (9, 3)],
        [(6, 1), (7, 2), (8, 2), (9, 1)],
        [(6, 2), (7, 1), (8, 2), (9, 3)],
    ]
    glow_positions = [
        [(4, 6), (11, 6), (5, 3)],
        [(3, 7), (10, 5), (5, 4)],
        [(4, 5), (11, 7), (10, 3)],
        [(3, 6), (12, 6), (5, 5)],
    ]
    for fi in range(4):
        g = blank(16, 16, DK)
        # Torch bracket on wall
        rect(g, 6, 8, 4, 7, ST)
        rect(g, 7, 9, 2, 5, MG)
        hline(g, 5, 15, 6, ST)
        # Flame body
        rect(g, 6, 4, 4, 5, FR)
        rect(g, 7, 3, 2, 4, YL)
        # Flickering top
        for (fx, fy) in flame_tops[fi]:
            dot(g, fx, fy, PY)
        dot(g, 7, 2, NW)
        # Ember glow
        for (gx, gy) in glow_positions[fi]:
            dot(g, gx, gy, EM)
        frames.append(g)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'sprite_dun_decor_torch.png'), sheet)
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_decor_torch.png'), sheet)


def gen_dun_decor_crystal():
    """Glowing dungeon crystal — 4 frames × 16×16 = 64×16, purple pulse."""
    frames = []
    glow_colors = [MP, MV, SG, MV]
    highlight_positions = [
        [(6, 3), (9, 5)],
        [(5, 4), (10, 3)],
        [(7, 2), (10, 6)],
        [(5, 5), (9, 3)],
    ]
    for fi in range(4):
        g = blank(16, 16, DK)
        # Crystal base — dark stone
        rect(g, 4, 12, 8, 4, ST)
        rect(g, 5, 13, 6, 2, MG)
        # Crystal body
        rect(g, 6, 4, 4, 9, glow_colors[fi])
        rect(g, 7, 3, 2, 10, MV)
        # Crystal facets
        vline(g, 5, 6, 6, MP)
        vline(g, 10, 6, 6, MP)
        # Top point
        dot(g, 7, 2, SG)
        dot(g, 8, 2, SG)
        dot(g, 7, 1, glow_colors[fi])
        # Highlights
        for (hx, hy) in highlight_positions[fi]:
            dot(g, hx, hy, SG)
        # Base glow on floor
        for x in [4, 5, 10, 11]:
            dot(g, x, 14, PM)
        frames.append(g)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'sprite_dun_decor_crystal.png'), sheet)
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_decor_crystal.png'), sheet)


def gen_dun_decor_rubble():
    """Static rubble pile — 16×16."""
    g = blank(16, 16, DK)
    # Large rocks
    rect(g, 2, 8, 5, 5, ST)
    rect(g, 3, 9, 3, 3, MG)
    rect(g, 8, 9, 4, 4, ST)
    rect(g, 9, 10, 2, 2, LS)
    # Small rocks
    rect(g, 6, 11, 2, 2, MG)
    dot(g, 12, 11, ST)
    dot(g, 1, 12, MG)
    # Dust/debris
    for (x, y) in [(4, 13), (7, 14), (10, 13), (13, 12), (2, 14)]:
        dot(g, x, y, ST)
    # Highlights
    dot(g, 3, 8, LS)
    dot(g, 9, 9, LS)
    write_png(os.path.join(OUT_DIR, 'sprite_dun_decor_rubble.png'), g)
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_decor_rubble.png'), g)


def gen_dun_decor_barrel():
    """Dungeon barrel — 16×16."""
    g = blank(16, 16, DK)
    # Barrel body
    rect(g, 4, 3, 8, 12, BN)
    rect(g, 5, 4, 6, 10, DT)
    # Staves (vertical lines)
    for x in [5, 7, 9, 11]:
        vline(g, x, 3, 12, BN)
    # Metal bands
    for y in [5, 10]:
        hline(g, 4, y, 8, MG)
        hline(g, 5, y, 6, LS)
    # Top rim
    rect(g, 5, 2, 6, 2, DT)
    hline(g, 5, 2, 6, SN)
    # Highlight
    dot(g, 6, 4, SN)
    dot(g, 6, 7, SN)
    # Shadow
    hline(g, 4, 14, 8, BD)
    write_png(os.path.join(OUT_DIR, 'sprite_dun_decor_barrel.png'), g)
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_decor_barrel.png'), g)


def gen_dun_decor_bones():
    """Bone pile — 16×16."""
    g = blank(16, 16, DK)
    # Skull
    rect(g, 3, 3, 5, 4, PG)
    rect(g, 4, 4, 3, 2, NW)
    dot(g, 4, 4, K)
    dot(g, 6, 4, K)
    hline(g, 4, 6, 3, LS)
    # Ribcage / bones scattered
    hline(g, 1, 8, 6, PG)
    hline(g, 1, 10, 5, PG)
    hline(g, 9, 9, 5, PG)
    # Femur
    vline(g, 10, 4, 6, PG)
    dot(g, 10, 3, LS)
    dot(g, 10, 10, LS)
    # Small bone fragments
    hline(g, 8, 12, 4, LS)
    hline(g, 2, 13, 3, LS)
    dot(g, 13, 7, PG)
    dot(g, 12, 13, PG)
    write_png(os.path.join(OUT_DIR, 'sprite_dun_decor_bones.png'), g)
    write_png(os.path.join(ART_SPRITES, 'sprite_dun_decor_bones.png'), g)


# ═══════════════════════════════════════════════════════════════════════════════
# DUNGEON ENEMY SPRITESHEETS — 12 frames × 16×24 = 192×24
# Layout: idle(0-1), walk(2-5), attack(6-9), death(10-11)
# ═══════════════════════════════════════════════════════════════════════════════

def _make_enemy_sheet(draw_fn):
    """Build a 12-frame horizontal strip (192×24) from a drawing function."""
    frames = []
    for i in range(12):
        g = blank(16, 24)
        draw_fn(g, i)
        frames.append(g)
    return hstack(frames)


def _draw_dun_skeleton(g, frame):
    """Skeleton warrior — bone-colored humanoid with sword, warm red eyes."""
    # Animation offsets
    is_idle   = frame < 2
    is_walk   = 2 <= frame < 6
    is_attack = 6 <= frame < 10
    is_death  = frame >= 10

    bob = 0
    if is_walk:
        bob = 1 if frame % 2 == 0 else -1
    if is_death:
        bob = 2

    # Legs
    if not is_death:
        leg_spread = 1 if (is_walk and frame % 2 == 0) else 0
        rect(g, 4 - leg_spread, 18 + bob, 3, 6 - bob, PG)
        rect(g, 9 + leg_spread, 18 + bob, 3, 6 - bob, PG)
        # Bone joint dots
        dot(g, 5, 20 + bob, LS)
        dot(g, 10, 20 + bob, LS)
    else:
        # Collapsed legs
        rect(g, 3, 20, 10, 3, PG)
        hline(g, 3, 22, 10, LS)

    # Body — ribcage
    body_y = 8 + bob
    rect(g, 4, body_y, 8, 10, PG)
    # Ribs
    for ry in range(body_y + 1, body_y + 9, 2):
        hline(g, 5, ry, 6, NW)
        dot(g, 5, ry, LS)
        dot(g, 10, ry, LS)
    vline(g, 7, body_y + 1, 8, PG)
    vline(g, 8, body_y + 1, 8, PG)

    # Head — skull
    head_y = 1 + bob
    if not is_death:
        rect(g, 4, head_y, 8, 7, PG)
        rect(g, 5, head_y + 1, 6, 5, NW)
        # Eyes (red — enemy)
        dot(g, 6, head_y + 3, ER)
        dot(g, 9, head_y + 3, ER)
        # Jaw
        hline(g, 5, head_y + 5, 6, LS)
        for x in [5, 6, 7, 8, 9, 10]:
            dot(g, x, head_y + 6, PG)
    else:
        rect(g, 3, head_y + 4, 8, 5, PG)
        dot(g, 5, head_y + 6, ER)
        dot(g, 8, head_y + 6, ER)

    # Weapon — sword in right hand
    if is_attack:
        swing = (frame - 6) * 2
        sword_x = 12
        sword_y = 6 + bob - swing
        vline(g, sword_x, sword_y, 8, LS)
        vline(g, sword_x + 1, sword_y, 8, MG)
        dot(g, sword_x, sword_y, NW)
        # Guard
        hline(g, sword_x - 1, sword_y + 6, 4, DG)
    elif not is_death:
        vline(g, 13, 10 + bob, 8, LS)
        dot(g, 13, 10 + bob, NW)
        hline(g, 12, 16 + bob, 3, DG)

    # Outline
    if not is_death:
        outline(g, 4, head_y, 8, 7, K)


def _draw_dun_spider(g, frame):
    """Cave spider — wide 12×12 body centered in 16×24, 8 legs."""
    is_idle   = frame < 2
    is_walk   = 2 <= frame < 6
    is_attack = 6 <= frame < 10
    is_death  = frame >= 10

    bob = 0
    if is_walk:
        bob = 1 if frame % 2 == 0 else 0
    if is_death:
        bob = 3

    cy = 12 + bob  # center y

    if is_death:
        # Flipped spider
        rect(g, 3, cy - 2, 10, 4, DB)
        rect(g, 4, cy - 1, 8, 2, ER)
        # Curled legs
        for x in [2, 5, 8, 11]:
            dot(g, x, cy + 2, DK)
            dot(g, x + 1, cy + 3, DK)
        return

    # Body — dark abdomen
    rect(g, 4, cy - 3, 8, 6, DB)
    rect(g, 5, cy - 2, 6, 4, ER)
    # Head / fangs
    rect(g, 6, cy - 5, 4, 3, DB)
    rect(g, 7, cy - 4, 2, 2, ER)
    # Eyes — 4 red dots
    dot(g, 6, cy - 5, BR)
    dot(g, 9, cy - 5, BR)
    dot(g, 7, cy - 5, FR)
    dot(g, 8, cy - 5, FR)
    # Fangs
    if is_attack:
        dot(g, 6, cy - 2, NW)
        dot(g, 9, cy - 2, NW)
        # Venom drip
        dot(g, 7, cy - 1, LG)
    else:
        dot(g, 7, cy - 2, NW)
        dot(g, 8, cy - 2, NW)

    # Legs — 4 pairs
    leg_anim = 1 if (is_walk and frame % 2 == 0) else 0
    # Left legs
    for i, ly in enumerate([cy - 3, cy - 1, cy + 1, cy + 3]):
        lx = 3 - (i % 2) - leg_anim
        dot(g, lx, ly, DK)
        dot(g, lx + 1, ly + (1 if i < 2 else -1), DK)
    # Right legs
    for i, ly in enumerate([cy - 3, cy - 1, cy + 1, cy + 3]):
        rx = 12 + (i % 2) + leg_anim
        dot(g, rx, ly, DK)
        dot(g, rx - 1, ly + (1 if i < 2 else -1), DK)

    # Abdomen pattern (cross)
    dot(g, 7, cy - 1, FR)
    dot(g, 8, cy - 1, FR)
    dot(g, 7, cy, FR)
    dot(g, 8, cy, FR)


def _draw_dun_mage(g, frame):
    """Dark mage — robed figure with purple magic, staff."""
    is_idle   = frame < 2
    is_walk   = 2 <= frame < 6
    is_attack = 6 <= frame < 10
    is_death  = frame >= 10

    bob = 0
    if is_walk:
        bob = 1 if frame % 2 == 0 else -1
    if is_death:
        bob = 2

    # Robe bottom / legs hidden under robe
    if not is_death:
        rect(g, 4, 16 + bob, 8, 8 - bob, PM)
        rect(g, 5, 17 + bob, 6, 6 - bob, MP)
        # Robe hem
        hline(g, 3, 23, 10, PM)
    else:
        rect(g, 2, 18, 12, 5, PM)
        rect(g, 3, 19, 10, 3, MP)

    # Body — dark robe
    body_y = 8 + bob
    rect(g, 4, body_y, 8, 9, PM)
    rect(g, 5, body_y + 1, 6, 7, MP)
    # Robe belt
    hline(g, 4, body_y + 6, 8, DG)
    dot(g, 8, body_y + 6, GD)

    # Head — hood
    head_y = 1 + bob
    if not is_death:
        rect(g, 4, head_y, 8, 7, PM)
        rect(g, 5, head_y + 1, 6, 5, MP)
        # Shadow face
        rect(g, 5, head_y + 2, 6, 3, K)
        # Glowing eyes
        dot(g, 6, head_y + 3, MV)
        dot(g, 9, head_y + 3, MV)
        # Hood point
        dot(g, 7, head_y, PM)
        dot(g, 8, head_y, PM)
    else:
        rect(g, 3, head_y + 4, 8, 5, PM)
        dot(g, 5, head_y + 6, MV)
        dot(g, 8, head_y + 6, MV)

    # Staff (left hand)
    if not is_death:
        staff_x = 2
        vline(g, staff_x, 3 + bob, 16, BN)
        # Orb on top
        rect(g, staff_x - 1, 2 + bob, 3, 3, MV)
        dot(g, staff_x, 2 + bob, SG)

    # Attack: spell cast glow
    if is_attack:
        spell_phase = frame - 6
        glow_x = 12
        glow_y = 8 + bob - spell_phase
        rect(g, glow_x, glow_y, 3, 3, MV)
        dot(g, glow_x + 1, glow_y, SG)
        dot(g, glow_x, glow_y + 1, SG)
        dot(g, glow_x + 2, glow_y + 1, SG)
        dot(g, glow_x + 1, glow_y + 2, SG)


def _draw_dun_golem(g, frame):
    """Stone golem — chunky stone creature, gray/brown tones."""
    is_idle   = frame < 2
    is_walk   = 2 <= frame < 6
    is_attack = 6 <= frame < 10
    is_death  = frame >= 10

    bob = 0
    if is_walk:
        bob = 1 if frame % 2 == 0 else 0
    if is_death:
        bob = 3

    # Legs — thick stone pillars
    if not is_death:
        leg_spread = 1 if (is_walk and frame % 2 == 0) else 0
        rect(g, 3 - leg_spread, 17 + bob, 4, 7 - bob, ST)
        rect(g, 9 + leg_spread, 17 + bob, 4, 7 - bob, ST)
        # Stone texture
        dot(g, 4, 19 + bob, MG)
        dot(g, 10, 20 + bob, MG)
        # Feet
        hline(g, 2 - leg_spread, 23, 5, DK)
        hline(g, 9 + leg_spread, 23, 5, DK)
    else:
        # Collapsed rubble
        rect(g, 2, 19, 12, 4, ST)
        for (x, y) in [(3, 20), (7, 19), (11, 20), (5, 21)]:
            dot(g, x, y, MG)

    # Body — massive stone torso
    body_y = 6 + bob
    rect(g, 2, body_y, 12, 12, ST)
    rect(g, 3, body_y + 1, 10, 10, MG)
    # Stone crack details
    vline(g, 6, body_y + 2, 4, DK)
    hline(g, 4, body_y + 5, 8, DK)
    vline(g, 10, body_y + 3, 3, DK)
    # Glowing rune on chest
    dot(g, 7, body_y + 3, MV)
    dot(g, 8, body_y + 3, MV)
    dot(g, 7, body_y + 4, SG)
    dot(g, 8, body_y + 4, SG)

    # Head — small stone block
    head_y = 2 + bob
    if not is_death:
        rect(g, 5, head_y, 6, 5, ST)
        rect(g, 6, head_y + 1, 4, 3, MG)
        # Glowing eyes
        dot(g, 6, head_y + 2, MV)
        dot(g, 9, head_y + 2, MV)
        # Brow
        hline(g, 5, head_y, 6, DK)

    # Arms — thick stone
    if not is_death:
        if is_attack:
            swing = frame - 6
            # Raised fist
            arm_y = body_y - 1 - swing
            rect(g, 0, arm_y, 3, 6, ST)
            rect(g, 13, arm_y, 3, 6, ST)
            dot(g, 1, arm_y, LS)
            dot(g, 14, arm_y, LS)
        else:
            rect(g, 0, body_y + 2, 3, 8, ST)
            rect(g, 13, body_y + 2, 3, 8, ST)
            dot(g, 1, body_y + 2, LS)
            dot(g, 14, body_y + 2, LS)


def gen_dun_enemies():
    """Generate all 4 dungeon enemy spritesheets."""
    enemies = [
        ('char_enemy_dun_skeleton.png', _draw_dun_skeleton),
        ('char_enemy_dun_spider.png',   _draw_dun_spider),
        ('char_enemy_dun_mage.png',     _draw_dun_mage),
        ('char_enemy_dun_golem.png',    _draw_dun_golem),
    ]
    for name, draw_fn in enemies:
        sheet = _make_enemy_sheet(draw_fn)
        write_png(os.path.join(OUT_DIR, name), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# DUNGEON BOSS — Shadow Archon — 12 frames × 32×32 = 384×32
# ═══════════════════════════════════════════════════════════════════════════════

def _draw_boss_dungeon(g, frame):
    """Shadow Archon — imposing dark figure with glowing purple magic.
    32×32 frame. Idle(0-1), walk(2-5), attack(6-9), death(10-11).
    """
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

    # Legs — dark armored
    if not is_death:
        leg_spread = 1 if (is_walk and frame % 2 == 0) else 0
        # Left leg
        rect(g, 8 - leg_spread, 22 + bob, 5, 10 - bob, DK)
        rect(g, 9 - leg_spread, 23 + bob, 3, 8 - bob, PM)
        # Right leg
        rect(g, 19 + leg_spread, 22 + bob, 5, 10 - bob, DK)
        rect(g, 20 + leg_spread, 23 + bob, 3, 8 - bob, PM)
        # Boots
        rect(g, 7 - leg_spread, 29, 6, 3, DK)
        rect(g, 19 + leg_spread, 29, 6, 3, DK)
        # Purple trim on boots
        hline(g, 7 - leg_spread, 29, 6, MP)
        hline(g, 19 + leg_spread, 29, 6, MP)
    else:
        # Collapsed
        rect(g, 5, 26, 22, 5, DK)
        rect(g, 6, 27, 20, 3, PM)
        for x in range(7, 25, 3):
            dot(g, x, 28, MP)

    # Body — dark plate armor
    body_y = 10 + bob
    rect(g, 7, body_y, 18, 14, DK)
    rect(g, 8, body_y + 1, 16, 12, PM)
    # Chest plate
    rect(g, 10, body_y + 2, 12, 8, K)
    rect(g, 11, body_y + 3, 10, 6, PM)
    # Glowing rune on chest (large purple sigil)
    rect(g, 13, body_y + 3, 6, 6, MP)
    rect(g, 14, body_y + 4, 4, 4, MV)
    dot(g, 15, body_y + 5, SG)
    dot(g, 16, body_y + 5, SG)
    dot(g, 15, body_y + 6, SG)
    dot(g, 16, body_y + 6, SG)
    # Shoulder pauldrons
    rect(g, 4, body_y, 5, 4, ST)
    rect(g, 5, body_y + 1, 3, 2, MG)
    rect(g, 23, body_y, 5, 4, ST)
    rect(g, 24, body_y + 1, 3, 2, MG)
    # Purple gems on pauldrons
    dot(g, 6, body_y + 1, MV)
    dot(g, 25, body_y + 1, MV)

    # Head — horned helmet
    head_y = 2 + bob
    if not is_death:
        rect(g, 10, head_y, 12, 9, DK)
        rect(g, 11, head_y + 1, 10, 7, PM)
        # Visor
        rect(g, 12, head_y + 3, 8, 3, K)
        # Glowing eyes behind visor
        rect(g, 13, head_y + 4, 2, 2, MV)
        rect(g, 17, head_y + 4, 2, 2, MV)
        dot(g, 13, head_y + 4, SG)
        dot(g, 18, head_y + 4, SG)
        # Horns
        rect(g, 9, head_y - 2, 2, 4, ST)
        rect(g, 21, head_y - 2, 2, 4, ST)
        dot(g, 9, head_y - 3, MG)
        dot(g, 22, head_y - 3, MG)
        # Crown ridge
        hline(g, 11, head_y, 10, ST)
    else:
        # Fallen head
        rect(g, 8, head_y + 6, 10, 6, DK)
        rect(g, 9, head_y + 7, 8, 4, PM)
        dot(g, 10, head_y + 9, MV)
        dot(g, 15, head_y + 9, MV)

    # Arms / weapon
    if not is_death:
        if is_attack:
            swing = frame - 6
            # Raised dark sword
            sword_y = body_y - 4 - swing * 2
            rect(g, 26, sword_y, 3, 14, MG)
            rect(g, 27, sword_y, 1, 14, LS)
            dot(g, 27, sword_y, NW)
            # Guard
            hline(g, 25, sword_y + 10, 5, DG)
            hline(g, 25, sword_y + 11, 5, GD)
            # Arm
            rect(g, 24, body_y + 2, 4, 8, DK)
            rect(g, 25, body_y + 3, 2, 6, PM)
            # Spell glow in left hand
            glow_phase = (frame - 6) % 4
            gx = 2
            gy = body_y + 2 - glow_phase
            rect(g, gx, gy, 4, 4, MV)
            rect(g, gx + 1, gy + 1, 2, 2, SG)
            # Left arm
            rect(g, 4, body_y + 2, 4, 8, DK)
            rect(g, 5, body_y + 3, 2, 6, PM)
        else:
            # Resting arms
            rect(g, 3, body_y + 2, 5, 10, DK)
            rect(g, 4, body_y + 3, 3, 8, PM)
            rect(g, 24, body_y + 2, 5, 10, DK)
            rect(g, 25, body_y + 3, 3, 8, PM)
            # Sword held down
            vline(g, 28, body_y + 4, 12, MG)
            vline(g, 29, body_y + 4, 12, LS)
            dot(g, 28, body_y + 4, NW)
            hline(g, 27, body_y + 14, 4, DG)

    # Phase-transition glow (attack frames 8-9 get extra particles)
    if is_attack and frame >= 8:
        for (px, py) in [(3, 5), (28, 3), (6, 28), (25, 27), (15, 1)]:
            dot(g, px, py + bob, SG)
        for (px, py) in [(1, 10), (30, 8), (2, 22), (29, 20)]:
            dot(g, px, py + bob, MV)

    # Dark aura particles (idle)
    if is_idle:
        aura_dots = [(2, 15), (29, 12), (4, 27), (27, 26)] if frame == 0 else \
                    [(3, 12), (28, 15), (5, 26), (26, 28)]
        for (ax, ay) in aura_dots:
            dot(g, ax, ay, MP)


def gen_boss_dungeon():
    """Generate Shadow Archon boss spritesheet — 12 frames × 32×32 = 384×32."""
    frames = []
    for i in range(12):
        g = blank(32, 32)
        _draw_boss_dungeon(g, i)
        frames.append(g)
    sheet = hstack(frames)
    write_png(os.path.join(OUT_DIR, 'char_boss_dungeon.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# DUNGEON LOOT ICONS — 16×16 each
# ═══════════════════════════════════════════════════════════════════════════════

def gen_loot_shadow_blade():
    """Shadow blade — dark sword with purple glow."""
    g = blank(16, 16)
    # Blade
    vline(g, 7, 1, 9, MG)
    vline(g, 8, 1, 9, LS)
    dot(g, 7, 1, NW)
    dot(g, 8, 1, NW)
    # Edge glow
    vline(g, 6, 2, 7, MP)
    vline(g, 9, 2, 7, MP)
    # Guard
    hline(g, 5, 10, 6, DG)
    hline(g, 5, 11, 6, GD)
    # Grip
    rect(g, 7, 12, 2, 3, BN)
    # Pommel
    rect(g, 6, 15, 4, 1, ST)
    # Shadow glow
    dot(g, 5, 4, MV)
    dot(g, 10, 6, MV)
    dot(g, 4, 7, SG)
    write_png(os.path.join(OUT_DIR, 'icon_dun_loot_shadow_blade.png'), g)
    write_png(os.path.join(ART_ICONS, 'icon_dun_loot_shadow_blade.png'), g)


def gen_loot_cursed_helm():
    """Cursed helmet — dark iron with red glow visor."""
    g = blank(16, 16)
    # Helm dome
    rect(g, 3, 2, 10, 10, DK)
    rect(g, 4, 3, 8, 8, ST)
    # Visor slit
    rect(g, 5, 7, 6, 2, K)
    dot(g, 6, 7, ER)
    dot(g, 9, 7, ER)
    # Nose guard
    vline(g, 8, 5, 5, DK)
    # Crest / ridge
    hline(g, 5, 2, 6, MG)
    vline(g, 8, 1, 3, LS)
    # Cursed glow
    dot(g, 4, 5, ER)
    dot(g, 11, 5, ER)
    # Brim
    hline(g, 2, 11, 12, DK)
    hline(g, 3, 12, 10, ST)
    # Outline
    outline(g, 3, 2, 10, 10, K)
    write_png(os.path.join(OUT_DIR, 'icon_dun_loot_cursed_helm.png'), g)
    write_png(os.path.join(ART_ICONS, 'icon_dun_loot_cursed_helm.png'), g)


def gen_loot_soul_gem():
    """Soul gem — glowing purple gemstone."""
    g = blank(16, 16)
    # Gem facets
    rect(g, 5, 3, 6, 8, MP)
    rect(g, 6, 4, 4, 6, MV)
    # Top point
    dot(g, 7, 2, MP)
    dot(g, 8, 2, MP)
    dot(g, 7, 1, MV)
    # Bottom point
    dot(g, 7, 11, MP)
    dot(g, 8, 11, MP)
    dot(g, 7, 12, PM)
    # Side facets
    dot(g, 4, 5, PM)
    dot(g, 4, 8, PM)
    dot(g, 11, 5, PM)
    dot(g, 11, 8, PM)
    # Inner glow
    dot(g, 7, 6, SG)
    dot(g, 8, 6, SG)
    dot(g, 7, 7, NW)
    dot(g, 8, 7, NW)
    # Sparkle
    dot(g, 6, 4, SG)
    dot(g, 9, 9, SG)
    # Outline
    outline(g, 5, 3, 6, 8, K)
    dot(g, 5, 3, K)
    dot(g, 10, 3, K)
    dot(g, 5, 10, K)
    dot(g, 10, 10, K)
    write_png(os.path.join(OUT_DIR, 'icon_dun_loot_soul_gem.png'), g)
    write_png(os.path.join(ART_ICONS, 'icon_dun_loot_soul_gem.png'), g)


def gen_loot_bone_shield():
    """Bone shield — round shield made of bone with skull emblem."""
    g = blank(16, 16)
    # Shield body
    rect(g, 3, 2, 10, 12, PG)
    rect(g, 4, 3, 8, 10, LS)
    # Shield border
    outline(g, 3, 2, 10, 12, BN)
    # Rounded corners
    dot(g, 3, 2, _)
    dot(g, 12, 2, _)
    dot(g, 3, 13, _)
    dot(g, 12, 13, _)
    # Skull emblem center
    rect(g, 6, 4, 4, 4, PG)
    dot(g, 6, 5, K)
    dot(g, 9, 5, K)
    hline(g, 6, 7, 4, K)
    # Bone ribbing
    hline(g, 4, 9, 8, BN)
    hline(g, 5, 11, 6, BN)
    # Highlight
    dot(g, 5, 3, NW)
    dot(g, 6, 3, NW)
    write_png(os.path.join(OUT_DIR, 'icon_dun_loot_bone_shield.png'), g)
    write_png(os.path.join(ART_ICONS, 'icon_dun_loot_bone_shield.png'), g)


def gen_loot_dark_staff():
    """Dark staff — twisted wood with purple orb on top."""
    g = blank(16, 16)
    # Staff shaft
    vline(g, 8, 5, 10, BN)
    vline(g, 7, 6, 9, BD)
    # Twisted detail
    dot(g, 7, 7, DT)
    dot(g, 8, 9, DT)
    dot(g, 7, 11, DT)
    # Orb on top
    rect(g, 6, 1, 4, 4, MP)
    rect(g, 7, 2, 2, 2, MV)
    dot(g, 7, 2, SG)
    # Orb glow
    dot(g, 5, 2, SG)
    dot(g, 10, 2, SG)
    dot(g, 7, 0, MV)
    # Orb outline
    outline(g, 6, 1, 4, 4, K)
    # Base
    hline(g, 6, 15, 4, BD)
    dot(g, 7, 14, BN)
    dot(g, 8, 14, BN)
    write_png(os.path.join(OUT_DIR, 'icon_dun_loot_dark_staff.png'), g)
    write_png(os.path.join(ART_ICONS, 'icon_dun_loot_dark_staff.png'), g)


def gen_loot_crypt_ring():
    """Crypt ring — gold ring with embedded dark gem."""
    g = blank(16, 16)
    # Ring band
    rect(g, 4, 6, 8, 5, DG)
    rect(g, 5, 7, 6, 3, GD)
    # Ring opening (center transparent)
    rect(g, 6, 7, 4, 3, _)
    # Top with gem setting
    rect(g, 5, 4, 6, 3, GD)
    rect(g, 6, 5, 4, 1, DG)
    # Dark gem
    rect(g, 7, 3, 2, 3, MP)
    dot(g, 7, 4, MV)
    dot(g, 8, 4, SG)
    # Gem outline
    outline(g, 7, 3, 2, 3, K)
    # Band highlights
    dot(g, 5, 6, YL)
    dot(g, 10, 6, YL)
    dot(g, 4, 8, DG)
    dot(g, 11, 8, DG)
    write_png(os.path.join(OUT_DIR, 'icon_dun_loot_crypt_ring.png'), g)
    write_png(os.path.join(ART_ICONS, 'icon_dun_loot_crypt_ring.png'), g)


def gen_all_loot():
    gen_loot_shadow_blade()
    gen_loot_cursed_helm()
    gen_loot_soul_gem()
    gen_loot_bone_shield()
    gen_loot_dark_staff()
    gen_loot_crypt_ring()


# ═══════════════════════════════════════════════════════════════════════════════
# DUNGEON UI PANELS & HUD
# ═══════════════════════════════════════════════════════════════════════════════

def gen_panel_dungeon_entrance():
    """200×160 dungeon entrance panel with difficulty selector and party slots."""
    W, H = 200, 160
    g = blank(W, H)

    # Outer border
    rect(g, 0, 0, W, H, K)
    rect(g, 1, 1, W - 2, H - 2, DK)
    rect(g, 2, 2, W - 4, H - 4, ST)

    # Title bar (dark purple — dungeon theme)
    rect(g, 2, 2, W - 4, 16, PM)
    rect(g, 3, 3, W - 6, 14, MP)
    hline(g, 4, 4, W - 8, MV)   # top highlight
    hline(g, 4, 15, W - 8, PM)  # bottom shadow

    # "DUNGEON" label area in title
    rect(g, 60, 6, 80, 8, PM)
    rect(g, 61, 7, 78, 6, MV)

    # Content area
    rect(g, 4, 20, W - 8, H - 26, DK)
    rect(g, 5, 21, W - 10, H - 28, ST)

    # Dungeon name area
    rect(g, 8, 24, W - 16, 12, DK)
    rect(g, 9, 25, W - 18, 10, MG)
    hline(g, 10, 26, W - 20, LS)

    # Difficulty selector — 3 buttons: Normal / Hard / Nightmare
    diff_y = 40
    diff_w = 52
    diff_colors = [LG, FR, BR]
    diff_bgs    = [DF, BD, DB]
    for i in range(3):
        dx = 10 + i * (diff_w + 6)
        rect(g, dx, diff_y, diff_w, 14, K)
        rect(g, dx + 1, diff_y + 1, diff_w - 2, 12, diff_bgs[i])
        rect(g, dx + 2, diff_y + 2, diff_w - 4, 10, diff_colors[i])
        hline(g, dx + 3, diff_y + 3, diff_w - 6, NW)  # highlight
        # Selected indicator (first one)
        if i == 0:
            outline(g, dx, diff_y, diff_w, 14, GD)

    # Party readiness area — 4 slots
    party_y = 60
    rect(g, 8, party_y, W - 16, 50, DK)
    rect(g, 9, party_y + 1, W - 18, 48, MG)
    # Header
    hline(g, 10, party_y + 2, W - 20, LS)
    rect(g, 60, party_y + 2, 80, 8, DK)
    rect(g, 61, party_y + 3, 78, 6, LS)

    # 4 party member readiness slots
    for i in range(4):
        sx = 14 + i * 44
        sy = party_y + 14
        # Slot background
        rect(g, sx, sy, 38, 30, DK)
        rect(g, sx + 1, sy + 1, 36, 28, ST)
        # Player icon placeholder
        rect(g, sx + 10, sy + 3, 16, 16, K)
        rect(g, sx + 11, sy + 4, 14, 14, PB if i == 0 else MG)
        # Ready indicator (green check for first, grey for others)
        ready_color = LG if i == 0 else DK
        rect(g, sx + 12, sy + 22, 12, 6, ready_color)

    # Enter button at bottom
    btn_y = 118
    btn_w = 100
    btn_x = (W - btn_w) // 2
    rect(g, btn_x, btn_y, btn_w, 20, K)
    rect(g, btn_x + 1, btn_y + 1, btn_w - 2, 18, PM)
    rect(g, btn_x + 2, btn_y + 2, btn_w - 4, 16, MP)
    rect(g, btn_x + 3, btn_y + 3, btn_w - 6, 14, MV)
    hline(g, btn_x + 4, btn_y + 4, btn_w - 8, SG)  # highlight

    # "ENTER" label area
    rect(g, btn_x + 30, btn_y + 6, 40, 8, MP)
    rect(g, btn_x + 31, btn_y + 7, 38, 6, SG)

    # Decorative skull corners
    for (cx, cy) in [(8, 142), (W - 18, 142)]:
        rect(g, cx, cy, 8, 6, PG)
        rect(g, cx + 1, cy + 1, 6, 4, NW)
        dot(g, cx + 2, cy + 2, K)
        dot(g, cx + 5, cy + 2, K)

    write_png(os.path.join(OUT_DIR, 'ui_panel_dungeon_entrance.png'), g)
    write_png(os.path.join(ART_DUN, 'ui_panel_dungeon_entrance.png'), g)


def gen_dungeon_room_progress():
    """120×12 room progress indicator — shows dungeon room advancement."""
    W, H = 120, 12
    g = blank(W, H)

    # Background
    rect(g, 0, 0, W, H, K)
    rect(g, 1, 1, W - 2, H - 2, DK)

    # 5 room segments separated by dividers
    seg_w = 22
    for i in range(5):
        sx = 2 + i * (seg_w + 1)
        if i < 2:
            # Completed rooms — green
            rect(g, sx, 2, seg_w, H - 4, DF)
            rect(g, sx + 1, 3, seg_w - 2, H - 6, LG)
        elif i == 2:
            # Current room — gold pulse
            rect(g, sx, 2, seg_w, H - 4, DG)
            rect(g, sx + 1, 3, seg_w - 2, H - 6, GD)
            hline(g, sx + 2, 4, seg_w - 4, YL)
        else:
            # Future rooms — dark/locked
            rect(g, sx, 2, seg_w, H - 4, K)
            rect(g, sx + 1, 3, seg_w - 2, H - 6, DK)

        # Divider
        if i < 4:
            vline(g, sx + seg_w, 2, H - 4, MG)

    # Boss indicator on last segment — skull icon
    bx = 2 + 4 * (seg_w + 1) + 6
    rect(g, bx, 3, 6, 5, PG)
    dot(g, bx + 1, 4, K)
    dot(g, bx + 4, 4, K)
    hline(g, bx, 7, 6, PG)

    write_png(os.path.join(OUT_DIR, 'ui_dungeon_room_progress.png'), g)
    write_png(os.path.join(ART_DUN, 'ui_dungeon_room_progress.png'), g)


def gen_dungeon_boss_hp_frame():
    """160×14 boss HP bar frame — ornate frame for the boss health bar."""
    W, H = 160, 14
    g = blank(W, H)

    # Outer frame
    rect(g, 0, 0, W, H, K)
    rect(g, 1, 1, W - 2, H - 2, DK)
    rect(g, 2, 2, W - 4, H - 4, ST)

    # Inner HP track
    rect(g, 4, 4, W - 8, H - 8, K)
    rect(g, 5, 5, W - 10, H - 10, DB)

    # Decorative end caps — purple gems
    for ex in [2, W - 6]:
        rect(g, ex, 3, 4, 8, DK)
        rect(g, ex + 1, 4, 2, 6, MP)
        dot(g, ex + 1, 6, MV)

    # Top/bottom accent lines
    hline(g, 6, 2, W - 12, MP)
    hline(g, 6, H - 3, W - 12, MP)

    # Skull ornament center-top
    cx = W // 2 - 3
    rect(g, cx, 0, 6, 4, PG)
    rect(g, cx + 1, 1, 4, 2, NW)
    dot(g, cx + 1, 1, K)
    dot(g, cx + 4, 1, K)

    write_png(os.path.join(OUT_DIR, 'ui_dungeon_boss_hp_frame.png'), g)
    write_png(os.path.join(ART_DUN, 'ui_dungeon_boss_hp_frame.png'), g)


def gen_dungeon_timer():
    """60×16 timer display — dark framed countdown box."""
    W, H = 60, 16
    g = blank(W, H)

    # Frame
    rect(g, 0, 0, W, H, K)
    rect(g, 1, 1, W - 2, H - 2, DK)
    rect(g, 2, 2, W - 4, H - 4, ST)

    # Inner display area
    rect(g, 4, 4, W - 8, H - 8, K)
    rect(g, 5, 5, W - 10, H - 10, PM)

    # Time digits area (placeholder)
    rect(g, 8, 5, 16, 6, MP)   # minutes
    rect(g, 8, 6, 14, 4, MV)
    # Colon
    dot(g, 26, 6, SG)
    dot(g, 26, 9, SG)
    # Seconds
    rect(g, 30, 5, 16, 6, MP)
    rect(g, 30, 6, 14, 4, MV)

    # Hourglass icon on left edge
    dot(g, 2, 5, GD)
    dot(g, 3, 5, GD)
    dot(g, 2, 6, DG)
    dot(g, 3, 7, DG)
    dot(g, 2, 8, GD)
    dot(g, 3, 8, GD)

    write_png(os.path.join(OUT_DIR, 'ui_dungeon_timer.png'), g)
    write_png(os.path.join(ART_DUN, 'ui_dungeon_timer.png'), g)


# ═══════════════════════════════════════════════════════════════════════════════
# BOSS CHAMBER BACKGROUND — 320×180
# ═══════════════════════════════════════════════════════════════════════════════

def gen_bg_boss_chamber():
    """320×180 dark boss chamber with stone pillars and purple glow."""
    W, H = 320, 180
    g = blank(W, H)

    # Dark gradient background (ceiling to floor)
    gradient_colors = [K, K, K, DK, DK, DK, ST, ST, DK, DK]
    for y in range(H):
        band = min(y * len(gradient_colors) // H, len(gradient_colors) - 1)
        for x in range(W):
            g[y][x] = gradient_colors[band]

    # Stone floor (bottom third)
    floor_y = 120
    for y in range(floor_y, H):
        for x in range(W):
            g[y][x] = ST
    # Floor tile lines
    for y in range(floor_y, H, 8):
        hline(g, 0, y, W, MG)
    for x in range(0, W, 16):
        offset = 8 if ((x // 16) % 2 == 0) else 0
        for y in range(floor_y + offset, H, 16):
            vline(g, x, y, min(8, H - y), MG)
    # Floor highlight
    hline(g, 0, floor_y, W, LS)

    # Ceiling stone (top section)
    for y in range(0, 20):
        for x in range(W):
            g[y][x] = K
    # Stalactites
    for sx in range(10, W, 40):
        for dy in range(8):
            w = max(1, 4 - dy)
            rect(g, sx - w // 2, 18 + dy, w, 1, DK)

    # Stone pillars (left and right)
    pillar_positions = [30, 80, 240, 290]
    for px in pillar_positions:
        # Pillar shaft
        rect(g, px - 6, 18, 12, floor_y - 18, DK)
        rect(g, px - 5, 19, 10, floor_y - 20, ST)
        rect(g, px - 4, 20, 8, floor_y - 22, MG)
        # Highlight edge
        vline(g, px - 4, 20, floor_y - 22, LS)
        # Shadow edge
        vline(g, px + 3, 20, floor_y - 22, DK)
        # Pillar base
        rect(g, px - 8, floor_y - 4, 16, 4, DK)
        rect(g, px - 7, floor_y - 3, 14, 2, ST)
        # Pillar capital
        rect(g, px - 8, 16, 16, 4, DK)
        rect(g, px - 7, 17, 14, 2, ST)

    # Purple magic torches on pillars
    torch_y = 60
    for px in pillar_positions:
        # Flame
        rect(g, px - 2, torch_y, 4, 6, MV)
        rect(g, px - 1, torch_y - 2, 2, 4, SG)
        dot(g, px, torch_y - 3, NW)
        # Glow on pillar
        for dy in range(-4, 8):
            for dx in range(-3, 4):
                tx, ty = px + dx, torch_y + dy
                if 0 <= tx < W and 0 <= ty < H:
                    if g[ty][tx] == MG or g[ty][tx] == ST:
                        g[ty][tx] = MP

    # Center arena glow (purple magic circle on floor)
    cx, cy = W // 2, floor_y + 20
    for r in range(30, 0, -1):
        color = PM if r > 20 else MP if r > 10 else MV
        for angle_step in range(0, 360, 5):
            import math
            ax = int(cx + r * math.cos(math.radians(angle_step)))
            ay = int(cy + r * 0.4 * math.sin(math.radians(angle_step)))
            if 0 <= ax < W and 0 <= ay < H:
                g[ay][ax] = color

    # Rune marks on circle perimeter
    rune_angles = [0, 45, 90, 135, 180, 225, 270, 315]
    import math
    for angle in rune_angles:
        rx = int(cx + 28 * math.cos(math.radians(angle)))
        ry = int(cy + 28 * 0.4 * math.sin(math.radians(angle)))
        if 0 <= rx < W - 2 and 0 <= ry < H - 2:
            rect(g, rx, ry, 3, 3, SG)
            dot(g, rx + 1, ry + 1, NW)

    # Dark vignette edges
    for x in range(W):
        for dy in range(8):
            alpha = dy / 8
            if alpha < 0.5:
                g[H - 1 - dy][x] = K
    for y in range(H):
        for dx in range(12):
            alpha = dx / 12
            if alpha < 0.5:
                g[y][dx] = K
                g[y][W - 1 - dx] = K

    write_png(os.path.join(OUT_DIR, 'bg_boss_chamber.png'), g)
    write_png(os.path.join(ART_BG, 'bg_boss_chamber.png'), g)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print('Generating dungeon art assets (PIX-102)...\n')

    print('── Decoration sprites ──')
    gen_dun_decor_torch()
    gen_dun_decor_crystal()
    gen_dun_decor_rubble()
    gen_dun_decor_barrel()
    gen_dun_decor_bones()

    print('\n── Dungeon enemies ──')
    gen_dun_enemies()

    print('\n── Dungeon boss (Shadow Archon) ──')
    gen_boss_dungeon()

    print('\n── Dungeon loot icons ──')
    gen_all_loot()

    print('\n── Dungeon UI panels & HUD ──')
    gen_panel_dungeon_entrance()
    gen_dungeon_room_progress()
    gen_dungeon_boss_hp_frame()
    gen_dungeon_timer()

    print('\n── Boss chamber background ──')
    gen_bg_boss_chamber()

    print('\nDone! All dungeon assets generated.')


if __name__ == '__main__':
    main()
