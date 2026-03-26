#!/usr/bin/env python3
"""
Generate Artisan class art assets for PixelRealm (PIX-287).
Uses only Python stdlib (struct + zlib) — no PIL required.

Artisan is the 4th and final playable class with 3 archetypes:
  - Blacksmith: melee/support, hammer strikes, forging
  - Alchemist: potion-based AoE, elemental concoctions
  - Enchanter: magical buffs/debuffs, rune-based utility

Assets generated:
  Character sprite:
    - char_player_artisan.png          (16×24)
  Equipment:
    - equip_weapon_hammer.png          (32×24) Blacksmith
    - equip_weapon_mortar.png          (32×24) Alchemist
    - equip_weapon_runestave.png       (32×24) Enchanter
    - equip_armor_artisan_apron.png    (32×24) Artisan work apron
    - equip_armor_enchanter_robe.png   (32×24) Enchanter robe
  Archetype badges (32×32):
    - ui_archetype_badge_blacksmith.png  (anvil + hammer)
    - ui_archetype_badge_alchemist.png   (flask + bubbles)
    - ui_archetype_badge_enchanter.png   (rune circle)
  Class emblem (32×32):
    - ui_class_emblem_artisan.png        (anvil + gear)
  Class portrait:
    - ui_portrait_artisan.png            (32×32)
  Skill VFX (192×32, 6-frame spritesheets):
    Blacksmith: hammer_strike, forge_blast, anvil_guard
    Alchemist:  potion_throw, elixir_burst, concoction_heal
    Enchanter:  rune_bolt, spell_weave, arcane_bind
  Skill icons (16×16, 15 total):
    Blacksmith: hammer_strike, forge_blast, anvil_guard, tempered_steel, master_craft
    Alchemist:  potion_throw, elixir_burst, concoction_heal, brew_mastery, volatile_mix
    Enchanter:  rune_bolt, spell_weave, arcane_bind, mana_flow, enchant_mastery
"""

import struct
import zlib
import os

REPO_ROOT = os.path.join(os.path.dirname(__file__), '..')

# Output directories
SPRITE_DIR   = os.path.join(REPO_ROOT, 'assets', 'sprites', 'characters')
EQUIP_DIR    = os.path.join(REPO_ROOT, 'assets', 'sprites', 'characters', 'equipment')
VFX_DIR      = os.path.join(REPO_ROOT, 'assets', 'vfx')
ICON_DIR     = os.path.join(REPO_ROOT, 'assets', 'ui', 'icons')
SKILL_DIR    = os.path.join(REPO_ROOT, 'assets', 'ui', 'skill_tree')
SELECT_DIR   = os.path.join(REPO_ROOT, 'assets', 'ui', 'character_select')

for d in [SPRITE_DIR, EQUIP_DIR, VFX_DIR, ICON_DIR, SKILL_DIR, SELECT_DIR]:
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
    print(f'  wrote {path}  ({width}×{height})')


# ─── Helpers ─────────────────────────────────────────────────────────────────

def blank(w, h, fill=None):
    fill = fill or _
    return [[fill]*w for rr in range(h)]

def hstack(frames):
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result

def check(name, pixels, w, h):
    assert len(pixels) == h, f'{name}: expected {h} rows, got {len(pixels)}'
    for i, row in enumerate(pixels):
        assert len(row) == w, f'{name} row {i}: expected {w} cols, got {len(row)}'


# ─── 1. CHARACTER SPRITE: Artisan (16×24) ───────────────────────────────────
# Artisan wears warm brown/gold leather apron over cyan armor.
# Distinctive: tool belt, shorter stocky build feel, work gloves.

ARTISAN_SPRITE = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 1 head top
    [ _, _,  _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 2
    [ _, _,  _,  _,  K,  PG, NW, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 3 brow highlight
    [ _, _,  _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _],  # 4 eyes
    [ _, _,  _,  _,  K,  PG, PG, K,  PG, PG, K,  _,  _,  _,  _,  _],  # 5 mouth
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 6 chin
    [ _, _,  _,  K,  SN, DT, DT, DT, DT, DT, DT, K,  _,  _,  _,  _],  # 7 shoulders (brown leather)
    [ _, _,  K,  DT, DT, SN, SN, SN, SN, SN, DT, DT, K,  _,  _,  _],  # 8 apron top
    [ _, K,  DT, SN, DS, SN, SN, SN, SN, SN, SN, DS, DT, K,  _,  _],  # 9 apron w/ gold stitching
    [ _, K,  DT, SN, SN, SN, SN, SN, SN, SN, SN, SN, DT, K,  _,  _],  # 10
    [ _, K,  DT, SN, SN, SN, SN, SN, SN, SN, SN, SN, DT, K,  _,  _],  # 11
    [ _, K,  DT, SN, SN, SN, SN, SN, SN, SN, SN, SN, DT, K,  _,  _],  # 12
    [ _, K,  DT, BN, BN, BN, BN, BN, BN, BN, BN, BN, DT, K,  _,  _],  # 13 shadow
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, GD, K,  _,  _,  _],  # 14 tool belt (gold)
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],  # 15 legs (brown pants)
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],  # 16
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],  # 17
    [ _, _,  _,  K,  DT, DT, DT, K,  _,  K,  DT, DT, DT, K,  _,  _],  # 18
    [ _, _,  _,  K,  BN, BN, BN, K,  _,  K,  BN, BN, BN, K,  _,  _],  # 19 shadow
    [ _, _,  _,  K,  BD, BD, BD, K,  _,  K,  BD, BD, BD, K,  _,  _],  # 20 boots (dark leather)
    [ _, _,  K,  BD, BD, BD, BD, K,  _,  K,  BD, BD, BD, BD, K,  _],  # 21
    [ _, _,  K,  BD, BD, BD, BD, K,  _,  K,  BD, BD, BD, BD, K,  _],  # 22
    [ _, _,  K,  K,  K,  K,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _],  # 23
]

check('ARTISAN_SPRITE', ARTISAN_SPRITE, 16, 24)


# ─── 2. ARCHETYPE BADGES (32×32) ────────────────────────────────────────────

# Blacksmith badge: anvil with hammer on gold/brown background
BADGE_BLACKSMITH = blank(32, 32)
# Background circle (warm gold)
for y in range(32):
    for x in range(32):
        dx, dy = x - 15.5, y - 15.5
        dist = (dx*dx + dy*dy) ** 0.5
        if dist <= 14:
            BADGE_BLACKSMITH[y][x] = DG
        if dist <= 13:
            BADGE_BLACKSMITH[y][x] = SN
        if dist > 13 and dist <= 14:
            BADGE_BLACKSMITH[y][x] = K
# Anvil body (center)
for y in range(14, 24):
    for x in range(10, 22):
        BADGE_BLACKSMITH[y][x] = ST
# Anvil top (wider)
for x in range(8, 24):
    BADGE_BLACKSMITH[13][x] = MG
    BADGE_BLACKSMITH[12][x] = LS
# Anvil horn (left side)
for x in range(6, 10):
    BADGE_BLACKSMITH[13][x] = MG
    BADGE_BLACKSMITH[12][x] = LS
# Anvil base
for x in range(8, 24):
    BADGE_BLACKSMITH[24][x] = ST
    BADGE_BLACKSMITH[25][x] = MG
# Hammer (diagonal, top-right)
for i in range(8):
    hx, hy = 18 + i // 2, 6 + i // 2
    if 0 <= hx < 32 and 0 <= hy < 32:
        BADGE_BLACKSMITH[hy][hx] = BN  # handle
# Hammer head
for y in range(5, 9):
    for x in range(21, 26):
        if 0 <= x < 32 and 0 <= y < 32:
            BADGE_BLACKSMITH[y][x] = LS
# Hammer head outline
for y in range(4, 10):
    for x in range(20, 27):
        dx, dy = x - 23, y - 6.5
        if abs(dx) <= 3 and abs(dy) <= 2:
            if abs(dx) == 3 or abs(dy) == 2:
                BADGE_BLACKSMITH[y][x] = K
            elif BADGE_BLACKSMITH[y][x] == SN:
                BADGE_BLACKSMITH[y][x] = LS

check('BADGE_BLACKSMITH', BADGE_BLACKSMITH, 32, 32)

# Alchemist badge: flask with bubbles on green background
BADGE_ALCHEMIST = blank(32, 32)
# Background circle (green)
for y in range(32):
    for x in range(32):
        dx, dy = x - 15.5, y - 15.5
        dist = (dx*dx + dy*dy) ** 0.5
        if dist <= 14:
            BADGE_ALCHEMIST[y][x] = DF
        if dist <= 13:
            BADGE_ALCHEMIST[y][x] = FG
        if dist > 13 and dist <= 14:
            BADGE_ALCHEMIST[y][x] = K
# Flask neck (top center)
for y in range(6, 12):
    for x in range(14, 18):
        BADGE_ALCHEMIST[y][x] = LS
# Flask neck outline
for y in range(6, 12):
    BADGE_ALCHEMIST[y][13] = K
    BADGE_ALCHEMIST[y][18] = K
# Flask body (wider, rounded bottom)
for y in range(12, 25):
    for x in range(32):
        dx = x - 15.5
        dy = y - 18
        # Ellipse shape
        if (dx*dx) / 64 + (dy*dy) / 49 <= 1:
            BADGE_ALCHEMIST[y][x] = LG
# Flask body outline
for y in range(12, 25):
    for x in range(32):
        dx = x - 15.5
        dy = y - 18
        ratio = (dx*dx) / 64 + (dy*dy) / 49
        if 0.85 <= ratio <= 1.0:
            BADGE_ALCHEMIST[y][x] = K
# Liquid inside (lower half of flask, bright green)
for y in range(17, 24):
    for x in range(32):
        dx = x - 15.5
        dy = y - 18
        if (dx*dx) / 56 + (dy*dy) / 42 <= 1:
            BADGE_ALCHEMIST[y][x] = BG
# Bubbles
for bx, by in [(13, 16), (17, 15), (15, 13), (19, 17)]:
    if 0 <= bx < 32 and 0 <= by < 32:
        BADGE_ALCHEMIST[by][bx] = FL
# Flask cap
for x in range(13, 19):
    BADGE_ALCHEMIST[5][x] = DG
    BADGE_ALCHEMIST[6][x] = GD

check('BADGE_ALCHEMIST', BADGE_ALCHEMIST, 32, 32)

# Enchanter badge: glowing rune circle on purple background
BADGE_ENCHANTER = blank(32, 32)
# Background circle (purple)
for y in range(32):
    for x in range(32):
        dx, dy = x - 15.5, y - 15.5
        dist = (dx*dx + dy*dy) ** 0.5
        if dist <= 14:
            BADGE_ENCHANTER[y][x] = PM
        if dist <= 13:
            BADGE_ENCHANTER[y][x] = MP
        if dist > 13 and dist <= 14:
            BADGE_ENCHANTER[y][x] = K
# Rune circle (ring)
for y in range(32):
    for x in range(32):
        dx, dy = x - 15.5, y - 15.5
        dist = (dx*dx + dy*dy) ** 0.5
        if 8 <= dist <= 10:
            BADGE_ENCHANTER[y][x] = MV
        if 8.5 <= dist <= 9.5:
            BADGE_ENCHANTER[y][x] = SG
# Rune symbol (diamond/cross in center)
# Vertical line
for y in range(9, 23):
    BADGE_ENCHANTER[y][15] = SG
    BADGE_ENCHANTER[y][16] = SG
# Horizontal line
for x in range(9, 23):
    BADGE_ENCHANTER[15][x] = SG
    BADGE_ENCHANTER[16][x] = SG
# Diamond points
for i in range(4):
    BADGE_ENCHANTER[12 - i][15 - i] = MV  # top-left
    BADGE_ENCHANTER[12 - i][16 + i] = MV  # top-right
    BADGE_ENCHANTER[19 + i][15 - i] = MV  # bottom-left
    BADGE_ENCHANTER[19 + i][16 + i] = MV  # bottom-right
# Glow spots at cardinal points
for cx, cy in [(15, 6), (15, 25), (6, 15), (25, 15)]:
    if 0 <= cx < 32 and 0 <= cy < 32:
        BADGE_ENCHANTER[cy][cx] = NW
        BADGE_ENCHANTER[cy][cx+1] = NW

check('BADGE_ENCHANTER', BADGE_ENCHANTER, 32, 32)


# ─── 3. CLASS EMBLEM (32×32) ────────────────────────────────────────────────
# Artisan emblem: anvil with gear/cog motif

EMBLEM_ARTISAN = blank(32, 32)
# Background circle (warm brown)
for y in range(32):
    for x in range(32):
        dx, dy = x - 15.5, y - 15.5
        dist = (dx*dx + dy*dy) ** 0.5
        if dist <= 14:
            EMBLEM_ARTISAN[y][x] = BD
        if dist <= 13:
            EMBLEM_ARTISAN[y][x] = BN
        if dist <= 12:
            EMBLEM_ARTISAN[y][x] = DT
        if dist > 13 and dist <= 14:
            EMBLEM_ARTISAN[y][x] = K
# Gear/cog outer ring
for y in range(32):
    for x in range(32):
        dx, dy = x - 15.5, y - 15.5
        dist = (dx*dx + dy*dy) ** 0.5
        if 9 <= dist <= 11:
            EMBLEM_ARTISAN[y][x] = GD
        if 9.5 <= dist <= 10.5:
            EMBLEM_ARTISAN[y][x] = YL
# Gear teeth (8 teeth around the ring)
import math
for tooth in range(8):
    angle = tooth * math.pi / 4
    for r in range(10, 13):
        tx = int(15.5 + r * math.cos(angle))
        ty = int(15.5 + r * math.sin(angle))
        if 0 <= tx < 32 and 0 <= ty < 32:
            EMBLEM_ARTISAN[ty][tx] = GD
# Inner gear hole
for y in range(32):
    for x in range(32):
        dx, dy = x - 15.5, y - 15.5
        dist = (dx*dx + dy*dy) ** 0.5
        if dist <= 5:
            EMBLEM_ARTISAN[y][x] = DT
        if dist <= 4:
            EMBLEM_ARTISAN[y][x] = SN
# Center anvil silhouette (small)
for y in range(13, 19):
    for x in range(13, 19):
        EMBLEM_ARTISAN[y][x] = LS
for x in range(12, 20):
    EMBLEM_ARTISAN[13][x] = MG
    EMBLEM_ARTISAN[18][x] = MG

check('EMBLEM_ARTISAN', EMBLEM_ARTISAN, 32, 32)


# ─── 4. CLASS PORTRAIT (32×32) ──────────────────────────────────────────────
# Artisan portrait for character creation screen

PORTRAIT_ARTISAN = blank(32, 32)
# Background (warm gradient)
for y in range(32):
    for x in range(32):
        PORTRAIT_ARTISAN[y][x] = BD
for y in range(2, 30):
    for x in range(2, 30):
        PORTRAIT_ARTISAN[y][x] = BN
# Border
for x in range(32):
    PORTRAIT_ARTISAN[0][x] = K
    PORTRAIT_ARTISAN[31][x] = K
for y in range(32):
    PORTRAIT_ARTISAN[y][0] = K
    PORTRAIT_ARTISAN[y][31] = K
for x in range(32):
    PORTRAIT_ARTISAN[1][x] = DG
    PORTRAIT_ARTISAN[30][x] = DG
for y in range(32):
    PORTRAIT_ARTISAN[y][1] = DG
    PORTRAIT_ARTISAN[y][30] = DG
# Head (centered, larger scale portrait)
# Hair
for y in range(4, 8):
    for x in range(10, 22):
        PORTRAIT_ARTISAN[y][x] = BN
# Face
for y in range(7, 16):
    for x in range(11, 21):
        PORTRAIT_ARTISAN[y][x] = PG
# Face outline
for y in range(7, 16):
    PORTRAIT_ARTISAN[y][10] = K
    PORTRAIT_ARTISAN[y][21] = K
for x in range(10, 22):
    PORTRAIT_ARTISAN[6][x] = K
    PORTRAIT_ARTISAN[16][x] = K
# Eyes
PORTRAIT_ARTISAN[10][13] = K
PORTRAIT_ARTISAN[10][14] = K
PORTRAIT_ARTISAN[10][18] = K
PORTRAIT_ARTISAN[10][19] = K
# Nose
PORTRAIT_ARTISAN[12][15] = K
PORTRAIT_ARTISAN[12][16] = K
# Mouth
for x in range(14, 18):
    PORTRAIT_ARTISAN[14][x] = K
# Shoulders and apron (below face)
for y in range(17, 28):
    for x in range(6, 26):
        PORTRAIT_ARTISAN[y][x] = SN
# Apron stitching
for y in range(18, 27):
    PORTRAIT_ARTISAN[y][8] = DS
    PORTRAIT_ARTISAN[y][23] = DS
# Collar
for x in range(12, 20):
    PORTRAIT_ARTISAN[17][x] = DT
# Gold belt
for x in range(8, 24):
    PORTRAIT_ARTISAN[24][x] = GD
    PORTRAIT_ARTISAN[25][x] = DG

check('PORTRAIT_ARTISAN', PORTRAIT_ARTISAN, 32, 32)


# ─── 5. EQUIPMENT ASSETS (32×24) ────────────────────────────────────────────

# Blacksmith hammer: heavy forging hammer
EQUIP_HAMMER = blank(32, 24)
# Handle (diagonal from bottom-left to center)
for i in range(12):
    hx, hy = 6 + i, 18 - i
    if 0 <= hx < 32 and 0 <= hy < 24:
        EQUIP_HAMMER[hy][hx] = BN
        if hx + 1 < 32:
            EQUIP_HAMMER[hy][hx + 1] = DT
# Hammer head (rectangular, at top of handle)
for y in range(4, 10):
    for x in range(15, 26):
        EQUIP_HAMMER[y][x] = LS
# Hammer head outline
for y in range(3, 11):
    for x in range(14, 27):
        if y == 3 or y == 10 or x == 14 or x == 26:
            EQUIP_HAMMER[y][x] = K
# Hammer head highlight
for x in range(16, 25):
    EQUIP_HAMMER[5][x] = NW
# Hammer head shadow
for x in range(16, 25):
    EQUIP_HAMMER[9][x] = ST

check('EQUIP_HAMMER', EQUIP_HAMMER, 32, 24)

# Alchemist mortar and pestle
EQUIP_MORTAR = blank(32, 24)
# Mortar bowl
for y in range(10, 20):
    for x in range(32):
        dx = x - 15.5
        dy = y - 15
        if (dx*dx) / 64 + (dy*dy) / 25 <= 1:
            EQUIP_MORTAR[y][x] = LS
# Mortar outline
for y in range(10, 20):
    for x in range(32):
        dx = x - 15.5
        dy = y - 15
        ratio = (dx*dx) / 64 + (dy*dy) / 25
        if 0.75 <= ratio <= 1.0:
            EQUIP_MORTAR[y][x] = ST
# Inner bowl (darker)
for y in range(11, 16):
    for x in range(32):
        dx = x - 15.5
        dy = y - 13
        if (dx*dx) / 36 + (dy*dy) / 9 <= 1:
            EQUIP_MORTAR[y][x] = MG
# Pestle (diagonal stick)
for i in range(14):
    px, py = 8 + i, 3 + i // 2
    if 0 <= px < 32 and 0 <= py < 24:
        EQUIP_MORTAR[py][px] = SN
# Pestle tip
EQUIP_MORTAR[3][8] = NW
EQUIP_MORTAR[3][9] = NW
# Green liquid in bowl
for y in range(13, 16):
    for x in range(12, 20):
        dx = x - 15.5
        if abs(dx) < 4:
            EQUIP_MORTAR[y][x] = LG

check('EQUIP_MORTAR', EQUIP_MORTAR, 32, 24)

# Enchanter runestave
EQUIP_RUNESTAVE = blank(32, 24)
# Staff shaft (vertical, slightly left of center)
for y in range(1, 22):
    EQUIP_RUNESTAVE[y][14] = BN
    EQUIP_RUNESTAVE[y][15] = DT
# Staff head (glowing crystal)
for y in range(0, 5):
    for x in range(12, 19):
        dx = x - 15
        dy = y - 2
        if abs(dx) + abs(dy) <= 3:
            EQUIP_RUNESTAVE[y][x] = MV
        if abs(dx) + abs(dy) <= 2:
            EQUIP_RUNESTAVE[y][x] = SG
        if abs(dx) + abs(dy) <= 1:
            EQUIP_RUNESTAVE[y][x] = NW
# Rune markings on shaft
for y in [6, 10, 14, 18]:
    EQUIP_RUNESTAVE[y][14] = MV
    EQUIP_RUNESTAVE[y][15] = SG
# Staff base
EQUIP_RUNESTAVE[22][14] = ST
EQUIP_RUNESTAVE[22][15] = LS
EQUIP_RUNESTAVE[23][14] = MG
EQUIP_RUNESTAVE[23][15] = ST

check('EQUIP_RUNESTAVE', EQUIP_RUNESTAVE, 32, 24)

# Artisan apron
EQUIP_APRON = blank(32, 24)
# Apron body
for y in range(4, 20):
    for x in range(10, 22):
        EQUIP_APRON[y][x] = SN
# Apron straps
for y in range(2, 6):
    EQUIP_APRON[y][11] = DT
    EQUIP_APRON[y][12] = DT
    EQUIP_APRON[y][19] = DT
    EQUIP_APRON[y][20] = DT
# Apron outline
for y in range(4, 20):
    EQUIP_APRON[y][9] = K
    EQUIP_APRON[y][22] = K
for x in range(9, 23):
    EQUIP_APRON[3][x] = K
    EQUIP_APRON[20][x] = K
# Pocket
for y in range(12, 16):
    for x in range(13, 19):
        EQUIP_APRON[y][x] = DT
for x in range(13, 19):
    EQUIP_APRON[12][x] = BN
# Belt
for x in range(10, 22):
    EQUIP_APRON[10][x] = GD
    EQUIP_APRON[11][x] = DG
# Gold stitch accents
for y in range(5, 19, 3):
    EQUIP_APRON[y][10] = DS
    EQUIP_APRON[y][21] = DS

check('EQUIP_APRON', EQUIP_APRON, 32, 24)

# Enchanter robe
EQUIP_ROBE = blank(32, 24)
# Robe body
for y in range(3, 22):
    w = min(10, 4 + y // 3)
    for x in range(16 - w, 16 + w):
        EQUIP_ROBE[y][x] = MP
# Robe highlight (left side)
for y in range(4, 20):
    EQUIP_ROBE[y][16 - min(9, 3 + y // 3)] = MV
# Robe outline
for y in range(3, 22):
    w = min(10, 4 + y // 3)
    EQUIP_ROBE[y][16 - w - 1] = K
    EQUIP_ROBE[y][16 + w] = K
# Collar
for x in range(12, 20):
    EQUIP_ROBE[3][x] = GD
    EQUIP_ROBE[4][x] = DG
# Rune symbols on robe
for y in [9, 13, 17]:
    EQUIP_ROBE[y][15] = SG
    EQUIP_ROBE[y][16] = SG
# Bottom trim
for x in range(6, 26):
    if 0 <= x < 32:
        EQUIP_ROBE[21][x] = MV

check('EQUIP_ROBE', EQUIP_ROBE, 32, 24)


# ─── 6. SKILL VFX SPRITESHEETS (192×32, 6 frames of 32×32) ─────────────────

def make_vfx_frame(draw_func, frame_idx):
    """Create a single 32×32 VFX frame."""
    grid = blank(32, 32)
    draw_func(grid, frame_idx)
    return grid

def make_vfx_sheet(draw_func, name):
    """Create a 6-frame VFX spritesheet (192×32)."""
    frames = [make_vfx_frame(draw_func, i) for i in range(6)]
    sheet = hstack(frames)
    check(name, sheet, 192, 32)
    return sheet

# --- Blacksmith VFX ---

def draw_hammer_strike(grid, frame):
    """Hammer impact with sparks and shockwave."""
    intensity = [0.3, 0.6, 1.0, 0.8, 0.5, 0.2][frame]
    # Impact flash at center
    cx, cy = 15, 15
    radius = int(6 * intensity)
    for y in range(32):
        for x in range(32):
            dist = ((x - cx)**2 + (y - cy)**2) ** 0.5
            if dist <= radius * 0.3:
                grid[y][x] = NW
            elif dist <= radius * 0.6:
                grid[y][x] = YL
            elif dist <= radius:
                grid[y][x] = FR
    # Sparks flying outward
    spark_dist = int(4 + 8 * intensity)
    for angle_idx in range(8):
        a = angle_idx * math.pi / 4 + frame * 0.3
        sx = int(cx + spark_dist * math.cos(a))
        sy = int(cy + spark_dist * math.sin(a))
        if 0 <= sx < 32 and 0 <= sy < 32:
            grid[sy][sx] = EM
            if sx + 1 < 32:
                grid[sy][sx + 1] = FR

def draw_forge_blast(grid, frame):
    """Burst of flame and molten metal."""
    intensity = [0.2, 0.5, 1.0, 0.9, 0.6, 0.3][frame]
    # Upward flame column
    for y in range(32):
        for x in range(32):
            dx = abs(x - 15)
            flame_width = int(4 * intensity * (1 - y / 32))
            if dx <= flame_width and y < int(28 * intensity):
                if dx <= flame_width * 0.3:
                    grid[y][x] = NW
                elif dx <= flame_width * 0.6:
                    grid[y][x] = YL
                else:
                    grid[y][x] = FR
    # Embers (scattered)
    for i in range(6):
        ex = int(8 + 16 * ((frame * 3 + i * 7) % 16) / 16)
        ey = int(4 + 20 * ((frame * 5 + i * 11) % 20) / 20)
        if 0 <= ex < 32 and 0 <= ey < 32 and intensity > 0.4:
            grid[ey][ex] = EM

def draw_anvil_guard(grid, frame):
    """Protective shield of molten metal forming around player."""
    phase = [0.2, 0.5, 0.8, 1.0, 0.7, 0.4][frame]
    # Shield arc (semicircle)
    for y in range(32):
        for x in range(32):
            dx, dy = x - 15.5, y - 15.5
            dist = (dx*dx + dy*dy) ** 0.5
            if 10 * phase <= dist <= 12 * phase:
                grid[y][x] = GD
            if 11 * phase <= dist <= 11.5 * phase:
                grid[y][x] = YL
    # Center glow
    if phase > 0.5:
        for y in range(13, 19):
            for x in range(13, 19):
                grid[y][x] = DS

# --- Alchemist VFX ---

def draw_potion_throw(grid, frame):
    """Arcing potion bottle, then splash."""
    # Bottle trajectory (arc across frames)
    if frame < 3:
        bx = 5 + frame * 8
        by = 12 - frame * 2 + frame * frame
        # Flask shape
        for dy in range(-2, 3):
            for dx in range(-1, 2):
                px, py = bx + dx, by + dy
                if 0 <= px < 32 and 0 <= py < 32:
                    grid[py][px] = LG
                    if dy == -2:
                        grid[py][px] = LS  # cap
    else:
        # Splash / explosion
        intensity = [0, 0, 0, 1.0, 0.7, 0.3][frame]
        radius = int(8 * intensity)
        for y in range(32):
            for x in range(32):
                dist = ((x - 22)**2 + (y - 16)**2) ** 0.5
                if dist <= radius * 0.4:
                    grid[y][x] = FL
                elif dist <= radius * 0.7:
                    grid[y][x] = BG
                elif dist <= radius:
                    grid[y][x] = LG

def draw_elixir_burst(grid, frame):
    """Expanding ring of alchemical energy."""
    phase = [0.2, 0.4, 0.7, 1.0, 0.8, 0.5][frame]
    radius = int(13 * phase)
    for y in range(32):
        for x in range(32):
            dist = ((x - 15)**2 + (y - 15)**2) ** 0.5
            if abs(dist - radius) <= 1.5:
                grid[y][x] = BG
            if abs(dist - radius) <= 0.8:
                grid[y][x] = FL
    # Center particles
    if phase < 0.8:
        for i in range(4):
            a = i * math.pi / 2 + frame * 0.5
            px = int(15 + 4 * math.cos(a))
            py = int(15 + 4 * math.sin(a))
            if 0 <= px < 32 and 0 <= py < 32:
                grid[py][px] = NW

def draw_concoction_heal(grid, frame):
    """Rising green healing bubbles and mist."""
    phase = [0.3, 0.5, 0.8, 1.0, 0.7, 0.4][frame]
    # Mist base
    for y in range(20, 28):
        for x in range(6, 26):
            if ((x + y + frame) % 4 < 2) and phase > 0.3:
                grid[y][x] = FG
    # Rising bubbles
    for i in range(5):
        bx = 8 + i * 4
        by = int(24 - (frame + i * 2) * 3 * phase) % 28
        if 0 <= by < 32:
            grid[by][bx] = BG
            if by - 1 >= 0:
                grid[by - 1][bx] = FL
    # Sparkles
    for i in range(3):
        sx = 10 + i * 5
        sy = int(10 + 6 * math.sin(frame + i * 2))
        if 0 <= sy < 32 and 0 <= sx < 32 and phase > 0.5:
            grid[sy][sx] = NW

# --- Enchanter VFX ---

def draw_rune_bolt(grid, frame):
    """Projectile rune symbol traveling forward."""
    # Bolt position (moves right across frames)
    bx = 4 + frame * 5
    by = 15
    # Rune glow
    for y in range(32):
        for x in range(32):
            dist = ((x - bx)**2 + (y - by)**2) ** 0.5
            if dist <= 4:
                grid[y][x] = MP
            if dist <= 2.5:
                grid[y][x] = MV
            if dist <= 1.2:
                grid[y][x] = SG
    # Trail
    for i in range(1, min(bx, 8)):
        tx = bx - i
        if 0 <= tx < 32:
            grid[by][tx] = MP if i % 2 == 0 else PM

def draw_spell_weave(grid, frame):
    """Interlocking rune patterns forming a web."""
    phase = [0.2, 0.4, 0.6, 0.8, 1.0, 0.7][frame]
    # Multiple rune circles
    for ring in range(3):
        r = int((4 + ring * 4) * phase)
        offset = ring * math.pi / 3
        for a_step in range(36):
            angle = a_step * math.pi / 18 + offset + frame * 0.3
            px = int(15 + r * math.cos(angle))
            py = int(15 + r * math.sin(angle))
            if 0 <= px < 32 and 0 <= py < 32:
                if ring == 0:
                    grid[py][px] = SG
                elif ring == 1:
                    grid[py][px] = MV
                else:
                    grid[py][px] = MP
    # Center glow
    for y in range(13, 18):
        for x in range(13, 18):
            dist = ((x - 15)**2 + (y - 15)**2) ** 0.5
            if dist <= 2 and phase > 0.5:
                grid[y][x] = NW

def draw_arcane_bind(grid, frame):
    """Binding runes forming a cage around target."""
    phase = [0.3, 0.6, 0.9, 1.0, 0.8, 0.5][frame]
    # Vertical bars
    for bar in range(4):
        bx = 6 + bar * 7
        for y in range(32):
            wave = int(2 * math.sin(y * 0.5 + frame + bar))
            px = bx + wave
            if 0 <= px < 32 and phase > 0.3:
                grid[y][px] = MV
    # Horizontal binding rings
    for ring_y in [8, 16, 24]:
        ry = ring_y
        if 0 <= ry < 32:
            for x in range(4, 28):
                if ((x + frame) % 3 < 2) and phase > 0.4:
                    grid[ry][x] = SG
    # Corner rune markers
    for cx, cy in [(6, 6), (25, 6), (6, 25), (25, 25)]:
        if phase > 0.6:
            grid[cy][cx] = NW
            if cx + 1 < 32:
                grid[cy][cx + 1] = SG

# Build all VFX sheets
VFX_HAMMER_STRIKE    = make_vfx_sheet(draw_hammer_strike,    'VFX_HAMMER_STRIKE')
VFX_FORGE_BLAST      = make_vfx_sheet(draw_forge_blast,      'VFX_FORGE_BLAST')
VFX_ANVIL_GUARD      = make_vfx_sheet(draw_anvil_guard,      'VFX_ANVIL_GUARD')
VFX_POTION_THROW     = make_vfx_sheet(draw_potion_throw,     'VFX_POTION_THROW')
VFX_ELIXIR_BURST     = make_vfx_sheet(draw_elixir_burst,     'VFX_ELIXIR_BURST')
VFX_CONCOCTION_HEAL  = make_vfx_sheet(draw_concoction_heal,  'VFX_CONCOCTION_HEAL')
VFX_RUNE_BOLT        = make_vfx_sheet(draw_rune_bolt,        'VFX_RUNE_BOLT')
VFX_SPELL_WEAVE      = make_vfx_sheet(draw_spell_weave,      'VFX_SPELL_WEAVE')
VFX_ARCANE_BIND      = make_vfx_sheet(draw_arcane_bind,      'VFX_ARCANE_BIND')


# ─── 7. SKILL ICONS (16×16) ─────────────────────────────────────────────────

def make_icon(draw_func, name):
    grid = blank(16, 16)
    draw_func(grid)
    check(name, grid, 16, 16)
    return grid

# --- Blacksmith skill icons ---

def draw_icon_hammer_strike(g):
    """Hammer coming down with impact lines."""
    # Hammer head
    for y in range(2, 6):
        for x in range(8, 14):
            g[y][x] = LS
    for x in range(8, 14):
        g[2][x] = NW  # highlight
    # Handle
    for y in range(6, 12):
        g[y][10] = BN
        g[y][11] = DT
    # Impact lines
    g[12][7] = YL; g[13][6] = YL
    g[12][14] = YL; g[13][15] = YL
    g[13][10] = FR; g[13][11] = FR

def draw_icon_forge_blast(g):
    """Upward flame burst."""
    for y in range(3, 14):
        w = max(1, int(4 * (1 - y / 14)))
        for dx in range(-w, w + 1):
            x = 7 + dx
            if 0 <= x < 16:
                if abs(dx) <= w // 3:
                    g[y][x] = NW
                elif abs(dx) <= w * 2 // 3:
                    g[y][x] = YL
                else:
                    g[y][x] = FR
    # Base
    for x in range(4, 12):
        g[14][x] = EM

def draw_icon_anvil_guard(g):
    """Shield with anvil emblem."""
    # Shield shape
    for y in range(2, 14):
        w = max(1, 6 - max(0, y - 8))
        for x in range(8 - w, 8 + w):
            if 0 <= x < 16:
                g[y][x] = GD
    # Shield border
    for y in range(2, 14):
        w = max(1, 6 - max(0, y - 8))
        if 8 - w >= 0:
            g[y][8 - w] = DG
        if 8 + w - 1 < 16:
            g[y][8 + w - 1] = DG
    # Anvil on shield (small)
    for x in range(6, 10):
        g[6][x] = LS
    for y in range(7, 10):
        for x in range(7, 9):
            g[y][x] = ST

def draw_icon_tempered_steel(g):
    """Passive: glowing sword blade (buff icon)."""
    # Blade diagonal
    for i in range(10):
        x, y = 3 + i, 12 - i
        if 0 <= x < 16 and 0 <= y < 16:
            g[y][x] = LS
            if x + 1 < 16:
                g[y][x + 1] = NW
    # Glow aura
    for i in range(10):
        x, y = 3 + i, 12 - i
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            px, py = x + dx, y + dy
            if 0 <= px < 16 and 0 <= py < 16 and g[py][px] == _:
                g[py][px] = DS

def draw_icon_master_craft(g):
    """Passive: gear/cog with sparkle."""
    # Small gear
    cx, cy = 7, 8
    for y in range(16):
        for x in range(16):
            dist = ((x - cx)**2 + (y - cy)**2) ** 0.5
            if 3 <= dist <= 5:
                g[y][x] = GD
            if dist < 2:
                g[y][x] = DG
    # Gear teeth
    for a_idx in range(6):
        angle = a_idx * math.pi / 3
        tx = int(cx + 5.5 * math.cos(angle))
        ty = int(cy + 5.5 * math.sin(angle))
        if 0 <= tx < 16 and 0 <= ty < 16:
            g[ty][tx] = YL
    # Sparkle top-right
    g[2][12] = NW; g[1][13] = NW; g[3][13] = NW; g[2][14] = NW

# --- Alchemist skill icons ---

def draw_icon_potion_throw(g):
    """Flask being thrown (angled)."""
    # Flask body
    for y in range(6, 13):
        for x in range(5, 11):
            g[y][x] = LG
    # Flask neck
    for y in range(3, 6):
        g[y][7] = LS
        g[y][8] = LS
    # Cap
    for x in range(6, 10):
        g[3][x] = DG
    # Outline
    for y in range(6, 13):
        g[y][4] = K; g[y][11] = K
    for x in range(5, 11):
        g[5][x] = K; g[13][x] = K
    # Motion lines
    g[7][13] = FG; g[9][14] = FG; g[11][13] = FG

def draw_icon_elixir_burst(g):
    """Explosion ring of green energy."""
    cx, cy = 7, 7
    for y in range(16):
        for x in range(16):
            dist = ((x - cx)**2 + (y - cy)**2) ** 0.5
            if 4 <= dist <= 6:
                g[y][x] = BG
            if 4.5 <= dist <= 5.5:
                g[y][x] = FL
    # Center spark
    g[7][7] = NW; g[7][8] = NW

def draw_icon_concoction_heal(g):
    """Bubbling healing potion with plus sign."""
    # Potion bottle
    for y in range(7, 14):
        for x in range(5, 11):
            g[y][x] = FG
    # Liquid
    for y in range(9, 13):
        for x in range(6, 10):
            g[y][x] = BG
    # Neck
    g[5][7] = LS; g[5][8] = LS
    g[6][7] = LS; g[6][8] = LS
    # Plus sign (healing)
    g[2][7] = FL; g[2][8] = FL
    g[3][6] = FL; g[3][7] = NW; g[3][8] = NW; g[3][9] = FL
    g[4][7] = FL; g[4][8] = FL
    # Bubbles
    g[8][7] = FL; g[7][9] = FL

def draw_icon_brew_mastery(g):
    """Passive: bubbling cauldron."""
    # Cauldron body
    for y in range(8, 14):
        for x in range(3, 13):
            g[y][x] = DK
    # Rim
    for x in range(2, 14):
        g[7][x] = ST
    # Legs
    g[14][4] = ST; g[14][5] = ST
    g[14][10] = ST; g[14][11] = ST
    # Green liquid
    for y in range(9, 13):
        for x in range(4, 12):
            g[y][x] = FG
    # Bubbles
    g[8][6] = BG; g[7][8] = LG; g[8][10] = BG
    g[6][7] = FL  # rising bubble

def draw_icon_volatile_mix(g):
    """Passive: two flasks crossed with spark."""
    # Left flask (tilted)
    for y in range(5, 12):
        g[y][4] = LG; g[y][5] = BG
    # Right flask (tilted)
    for y in range(5, 12):
        g[y][10] = FR; g[y][11] = EM
    # Cross point
    g[8][7] = YL; g[8][8] = YL
    # Spark at intersection
    g[6][7] = NW; g[7][8] = NW; g[9][7] = NW; g[8][6] = NW
    # Flask caps
    g[4][4] = DG; g[4][5] = DG
    g[4][10] = DG; g[4][11] = DG

# --- Enchanter skill icons ---

def draw_icon_rune_bolt(g):
    """Glowing purple projectile."""
    # Bolt core
    for x in range(4, 12):
        g[7][x] = SG
        g[8][x] = SG
    # Glow around bolt
    for x in range(3, 13):
        g[6][x] = MV
        g[9][x] = MV
    # Bright tip
    g[7][12] = NW; g[8][12] = NW
    # Trail fade
    g[7][3] = PM; g[8][3] = PM
    g[7][2] = PM

def draw_icon_spell_weave(g):
    """Interlocking rune circles."""
    cx, cy = 7, 7
    for y in range(16):
        for x in range(16):
            dist = ((x - cx)**2 + (y - cy)**2) ** 0.5
            if 3 <= dist <= 4:
                g[y][x] = MV
            if 5 <= dist <= 6:
                g[y][x] = MP
    # Cross rune in center
    g[7][6] = SG; g[7][7] = SG; g[7][8] = SG
    g[6][7] = SG; g[8][7] = SG

def draw_icon_arcane_bind(g):
    """Binding chains of purple energy."""
    # Vertical bars
    for y in range(2, 14):
        g[y][4] = MV; g[y][11] = MV
    # Horizontal bands
    for x in range(4, 12):
        g[5][x] = SG; g[10][x] = SG
    # Corner runes
    g[3][5] = NW; g[3][10] = NW
    g[12][5] = NW; g[12][10] = NW
    # Center lock
    g[7][7] = MP; g[7][8] = MP; g[8][7] = MP; g[8][8] = MP

def draw_icon_mana_flow(g):
    """Passive: flowing mana stream."""
    # Wavy line flowing down
    for y in range(2, 14):
        wave_x = int(7 + 3 * math.sin(y * 0.8))
        if 0 <= wave_x < 16:
            g[y][wave_x] = SG
            if wave_x + 1 < 16:
                g[y][wave_x + 1] = MV
            if wave_x - 1 >= 0:
                g[y][wave_x - 1] = MP
    # Sparkles
    g[3][10] = NW; g[8][4] = NW; g[12][11] = NW

def draw_icon_enchant_mastery(g):
    """Passive: glowing book with rune."""
    # Book body
    for y in range(5, 13):
        for x in range(3, 13):
            g[y][x] = PM
    # Pages
    for y in range(5, 13):
        g[y][8] = MP  # spine
    for y in range(6, 12):
        for x in range(4, 8):
            g[y][x] = MP
        for x in range(9, 12):
            g[y][x] = MP
    # Cover
    for x in range(3, 13):
        g[4][x] = K; g[13][x] = K
    for y in range(4, 14):
        g[y][2] = K; g[y][13] = K
    # Rune on left page
    g[7][5] = SG; g[8][5] = SG; g[7][6] = SG
    # Rune on right page
    g[8][10] = SG; g[9][10] = SG; g[8][11] = SG
    # Glow
    g[3][7] = MV; g[3][8] = MV

# Build all skill icons
ICON_HAMMER_STRIKE   = make_icon(draw_icon_hammer_strike,   'ICON_HAMMER_STRIKE')
ICON_FORGE_BLAST     = make_icon(draw_icon_forge_blast,     'ICON_FORGE_BLAST')
ICON_ANVIL_GUARD     = make_icon(draw_icon_anvil_guard,     'ICON_ANVIL_GUARD')
ICON_TEMPERED_STEEL  = make_icon(draw_icon_tempered_steel,  'ICON_TEMPERED_STEEL')
ICON_MASTER_CRAFT    = make_icon(draw_icon_master_craft,    'ICON_MASTER_CRAFT')
ICON_POTION_THROW    = make_icon(draw_icon_potion_throw,    'ICON_POTION_THROW')
ICON_ELIXIR_BURST    = make_icon(draw_icon_elixir_burst,    'ICON_ELIXIR_BURST')
ICON_CONCOCTION_HEAL = make_icon(draw_icon_concoction_heal, 'ICON_CONCOCTION_HEAL')
ICON_BREW_MASTERY    = make_icon(draw_icon_brew_mastery,    'ICON_BREW_MASTERY')
ICON_VOLATILE_MIX    = make_icon(draw_icon_volatile_mix,    'ICON_VOLATILE_MIX')
ICON_RUNE_BOLT       = make_icon(draw_icon_rune_bolt,       'ICON_RUNE_BOLT')
ICON_SPELL_WEAVE     = make_icon(draw_icon_spell_weave,     'ICON_SPELL_WEAVE')
ICON_ARCANE_BIND     = make_icon(draw_icon_arcane_bind,     'ICON_ARCANE_BIND')
ICON_MANA_FLOW       = make_icon(draw_icon_mana_flow,       'ICON_MANA_FLOW')
ICON_ENCHANT_MASTERY = make_icon(draw_icon_enchant_mastery, 'ICON_ENCHANT_MASTERY')


# ─── WRITE ALL ASSETS ───────────────────────────────────────────────────────

print('Generating Artisan class assets (PIX-287)...\n')

# Character sprite
print('Character sprite:')
write_png(os.path.join(SPRITE_DIR, 'char_player_artisan.png'), ARTISAN_SPRITE)

# Equipment
print('\nEquipment:')
write_png(os.path.join(EQUIP_DIR, 'equip_weapon_hammer.png'),         EQUIP_HAMMER)
write_png(os.path.join(EQUIP_DIR, 'equip_weapon_mortar.png'),         EQUIP_MORTAR)
write_png(os.path.join(EQUIP_DIR, 'equip_weapon_runestave.png'),      EQUIP_RUNESTAVE)
write_png(os.path.join(EQUIP_DIR, 'equip_armor_artisan_apron.png'),   EQUIP_APRON)
write_png(os.path.join(EQUIP_DIR, 'equip_armor_enchanter_robe.png'),  EQUIP_ROBE)

# Archetype badges
print('\nArchetype badges:')
write_png(os.path.join(SKILL_DIR, 'ui_archetype_badge_blacksmith.png'), BADGE_BLACKSMITH)
write_png(os.path.join(SKILL_DIR, 'ui_archetype_badge_alchemist.png'),  BADGE_ALCHEMIST)
write_png(os.path.join(SKILL_DIR, 'ui_archetype_badge_enchanter.png'),  BADGE_ENCHANTER)

# Class emblem
print('\nClass emblem:')
write_png(os.path.join(SKILL_DIR, 'ui_class_emblem_artisan.png'), EMBLEM_ARTISAN)

# Class portrait
print('\nClass portrait:')
write_png(os.path.join(SELECT_DIR, 'ui_portrait_artisan.png'), PORTRAIT_ARTISAN)

# VFX spritesheets
print('\nSkill VFX (192×32, 6-frame):')
write_png(os.path.join(VFX_DIR, 'vfx_skill_hammer_strike.png'),   VFX_HAMMER_STRIKE)
write_png(os.path.join(VFX_DIR, 'vfx_skill_forge_blast.png'),     VFX_FORGE_BLAST)
write_png(os.path.join(VFX_DIR, 'vfx_skill_anvil_guard.png'),     VFX_ANVIL_GUARD)
write_png(os.path.join(VFX_DIR, 'vfx_skill_potion_throw.png'),    VFX_POTION_THROW)
write_png(os.path.join(VFX_DIR, 'vfx_skill_elixir_burst.png'),    VFX_ELIXIR_BURST)
write_png(os.path.join(VFX_DIR, 'vfx_skill_concoction_heal.png'), VFX_CONCOCTION_HEAL)
write_png(os.path.join(VFX_DIR, 'vfx_skill_rune_bolt.png'),       VFX_RUNE_BOLT)
write_png(os.path.join(VFX_DIR, 'vfx_skill_spell_weave.png'),     VFX_SPELL_WEAVE)
write_png(os.path.join(VFX_DIR, 'vfx_skill_arcane_bind.png'),     VFX_ARCANE_BIND)

# Skill icons
print('\nSkill icons (16×16):')
# Blacksmith
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_hammer_strike.png'),  ICON_HAMMER_STRIKE)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_forge_blast.png'),    ICON_FORGE_BLAST)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_anvil_guard.png'),    ICON_ANVIL_GUARD)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_tempered_steel.png'), ICON_TEMPERED_STEEL)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_master_craft.png'),   ICON_MASTER_CRAFT)
# Alchemist
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_potion_throw.png'),    ICON_POTION_THROW)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_elixir_burst.png'),    ICON_ELIXIR_BURST)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_concoction_heal.png'), ICON_CONCOCTION_HEAL)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_brew_mastery.png'),    ICON_BREW_MASTERY)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_volatile_mix.png'),    ICON_VOLATILE_MIX)
# Enchanter
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_rune_bolt.png'),       ICON_RUNE_BOLT)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_spell_weave.png'),     ICON_SPELL_WEAVE)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_arcane_bind.png'),     ICON_ARCANE_BIND)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_mana_flow.png'),       ICON_MANA_FLOW)
write_png(os.path.join(ICON_DIR, 'icon_skill_artisan_enchant_mastery.png'), ICON_ENCHANT_MASTERY)

print('\nDone! Generated 33 Artisan class assets.')
