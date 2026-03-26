#!/usr/bin/env python3
"""
Generate class-specific equipment and weapon sprites for PixelRealm (PIX-306).
Uses only Python stdlib (struct + zlib) — no PIL required.

4 classes × (2 weapons + 3 armor tiers) = 20 equipment overlays (32×24)
4 classes × 5 items = 20 inventory icons (16×16)
4 class equipment sprite sheets (all weapons + armor in one row)

Warrior:  sword + shield,   leather → chainmail → ornate plate
Mage:     staff + orb,      cloth   → mystic    → arcane vestments
Ranger:   bow   + daggers,  hide    → reinforced → shadow cloak
Artisan:  hammer + tools,   apron   → studded    → master regalia
"""

import struct
import zlib
import os
import math

REPO_ROOT = os.path.join(os.path.dirname(__file__), '..')

# Output directories
EQUIP_DIR  = os.path.join(REPO_ROOT, 'assets', 'sprites', 'characters', 'equipment')
ICON_DIR   = os.path.join(REPO_ROOT, 'assets', 'ui', 'icons')
SHEET_DIR  = os.path.join(REPO_ROOT, 'assets', 'sprites', 'characters', 'equipment')

for d in [EQUIP_DIR, ICON_DIR, SHEET_DIR]:
    os.makedirs(d, exist_ok=True)

# ─── Master Palette (RGBA) ──────────────────────────────────────────────────

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
DP  = (26,  74,  138, 255)  # ocean blue
SB  = (42,  122, 192, 255)  # sky blue
PB  = (80,  168, 232, 255)  # player blue
HB  = (144, 208, 248, 255)  # ice / highlight
IW  = (200, 240, 255, 255)  # ice white

# Red / enemy
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


# ═══════════════════════════════════════════════════════════════════════════════
# WARRIOR EQUIPMENT
# Color identity: steel grays + cyan/blue accents (player color)
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Warrior Sword (32×24) ────────────────────────────────────────────────────
# Broad iron sword with blue gem pommel, warrior's signature weapon
WARRIOR_SWORD = blank(32, 24)
# Blade (diagonal from bottom-left to top-right)
for i in range(16):
    bx, by = 8 + i, 20 - i
    if 0 <= bx < 32 and 0 <= by < 24:
        WARRIOR_SWORD[by][bx] = LS
        if bx + 1 < 32:
            WARRIOR_SWORD[by][bx + 1] = NW  # highlight edge
        if by + 1 < 24:
            WARRIOR_SWORD[by + 1][bx] = MG  # shadow edge
# Blade tip
for dx, dy in [(0, -1), (1, -1), (1, 0)]:
    tx, ty = 24 + dx, 4 + dy
    if 0 <= tx < 32 and 0 <= ty < 24:
        WARRIOR_SWORD[ty][tx] = NW
# Crossguard (horizontal bar at handle)
for x in range(5, 13):
    WARRIOR_SWORD[19][x] = ST
    WARRIOR_SWORD[20][x] = MG
# Crossguard blue accent
WARRIOR_SWORD[19][8] = PB
WARRIOR_SWORD[19][9] = PB
# Handle
for i in range(3):
    hx, hy = 5 + i, 21 + i // 2
    if 0 <= hy < 24:
        WARRIOR_SWORD[hy][hx] = BN
        if hx + 1 < 32:
            WARRIOR_SWORD[hy][hx + 1] = DT
# Pommel (blue gem)
WARRIOR_SWORD[22][4] = DP
WARRIOR_SWORD[22][5] = SB
WARRIOR_SWORD[23][4] = PB
WARRIOR_SWORD[23][5] = HB
# Blade outline
for i in range(16):
    bx, by = 8 + i, 20 - i
    if 0 <= bx < 32 and 0 <= by < 24:
        if by - 1 >= 0 and bx - 1 >= 0:
            if WARRIOR_SWORD[by - 1][bx - 1] == _:
                WARRIOR_SWORD[by - 1][bx - 1] = K
        if by + 2 < 24:
            if WARRIOR_SWORD[by + 2][bx] == _:
                WARRIOR_SWORD[by + 2][bx] = K
check('WARRIOR_SWORD', WARRIOR_SWORD, 32, 24)

# ─── Warrior Shield (32×24) ──────────────────────────────────────────────────
# Kite shield with blue chevron, steel body
WARRIOR_SHIELD = blank(32, 24)
# Shield body (kite shape: wider at top, narrows to point at bottom)
for y in range(2, 22):
    hw = max(1, 8 - max(0, (y - 12)))  # half-width narrows after row 12
    cx = 16
    for x in range(cx - hw, cx + hw + 1):
        if 0 <= x < 32:
            WARRIOR_SHIELD[y][x] = LS
# Shield outline
for y in range(2, 22):
    hw = max(1, 8 - max(0, (y - 12)))
    cx = 16
    lx, rx = cx - hw, cx + hw
    if 0 <= lx < 32:
        WARRIOR_SHIELD[y][lx] = K
    if 0 <= rx < 32:
        WARRIOR_SHIELD[y][rx] = K
for x in range(8, 25):
    if WARRIOR_SHIELD[2][x] != _:
        WARRIOR_SHIELD[1][x] = K
# Shield boss (center circle)
for y in range(7, 13):
    for x in range(13, 20):
        dx, dy = x - 16, y - 9.5
        if dx * dx + dy * dy <= 6:
            WARRIOR_SHIELD[y][x] = MG
        if dx * dx + dy * dy <= 3:
            WARRIOR_SHIELD[y][x] = NW
# Blue chevron (V shape)
for i in range(6):
    WARRIOR_SHIELD[13 + i][13 - i // 2] = PB
    WARRIOR_SHIELD[13 + i][14 - i // 2] = SB
    WARRIOR_SHIELD[13 + i][18 + i // 2] = PB
    WARRIOR_SHIELD[13 + i][19 + i // 2] = SB
# Blue top stripe
for x in range(10, 23):
    if WARRIOR_SHIELD[4][x] == LS:
        WARRIOR_SHIELD[4][x] = PB
    if WARRIOR_SHIELD[5][x] == LS:
        WARRIOR_SHIELD[5][x] = SB
# Steel rivets
for rx, ry in [(11, 7), (21, 7), (11, 15), (21, 15)]:
    if 0 <= rx < 32 and 0 <= ry < 24 and WARRIOR_SHIELD[ry][rx] != _:
        WARRIOR_SHIELD[ry][rx] = ST
# Bottom point
WARRIOR_SHIELD[21][16] = K
check('WARRIOR_SHIELD', WARRIOR_SHIELD, 32, 24)

# ─── Warrior Armor Basic (32×24) — Leather jerkin with blue trim ─────────────
WARRIOR_ARMOR_BASIC = blank(32, 24)
# Torso body
for y in range(3, 19):
    w = 6 if y < 6 else 8
    for x in range(16 - w, 16 + w):
        WARRIOR_ARMOR_BASIC[y][x] = DT
# Shoulder pads
for y in range(2, 5):
    for x in range(7, 13):
        WARRIOR_ARMOR_BASIC[y][x] = BN
    for x in range(19, 25):
        WARRIOR_ARMOR_BASIC[y][x] = BN
# Outline
for y in range(3, 19):
    w = 6 if y < 6 else 8
    WARRIOR_ARMOR_BASIC[y][16 - w] = K
    WARRIOR_ARMOR_BASIC[y][16 + w - 1] = K
for x in range(10, 22):
    WARRIOR_ARMOR_BASIC[2][x] = K
    WARRIOR_ARMOR_BASIC[19][x] = K
# Blue trim at collar and hem
for x in range(11, 21):
    WARRIOR_ARMOR_BASIC[3][x] = PB
    WARRIOR_ARMOR_BASIC[18][x] = SB
# Belt
for x in range(9, 23):
    WARRIOR_ARMOR_BASIC[13][x] = BN
    WARRIOR_ARMOR_BASIC[14][x] = BD
# Belt buckle
WARRIOR_ARMOR_BASIC[13][15] = LS
WARRIOR_ARMOR_BASIC[13][16] = LS
WARRIOR_ARMOR_BASIC[14][15] = MG
WARRIOR_ARMOR_BASIC[14][16] = MG
check('WARRIOR_ARMOR_BASIC', WARRIOR_ARMOR_BASIC, 32, 24)

# ─── Warrior Armor Mid (32×24) — Chainmail with steel pauldrons ─────────────
WARRIOR_ARMOR_MID = blank(32, 24)
# Chain mail body (alternating gray pattern)
for y in range(3, 19):
    w = 7 if y < 6 else 9
    for x in range(16 - w, 16 + w):
        if (x + y) % 2 == 0:
            WARRIOR_ARMOR_MID[y][x] = MG
        else:
            WARRIOR_ARMOR_MID[y][x] = LS
# Steel pauldrons (larger)
for y in range(1, 6):
    for x in range(6, 13):
        WARRIOR_ARMOR_MID[y][x] = ST
    for x in range(19, 26):
        WARRIOR_ARMOR_MID[y][x] = ST
# Pauldron highlights
for x in range(7, 12):
    WARRIOR_ARMOR_MID[2][x] = LS
for x in range(20, 25):
    WARRIOR_ARMOR_MID[2][x] = LS
# Pauldron outlines
for y in range(1, 6):
    WARRIOR_ARMOR_MID[y][6] = K
    WARRIOR_ARMOR_MID[y][12] = K
    WARRIOR_ARMOR_MID[y][19] = K
    WARRIOR_ARMOR_MID[y][25] = K
for x in range(6, 13):
    WARRIOR_ARMOR_MID[1][x] = K
for x in range(19, 26):
    WARRIOR_ARMOR_MID[1][x] = K
# Body outline
for y in range(3, 19):
    w = 7 if y < 6 else 9
    WARRIOR_ARMOR_MID[y][16 - w] = K
    WARRIOR_ARMOR_MID[y][16 + w - 1] = K
for x in range(9, 23):
    WARRIOR_ARMOR_MID[2][x] = K
    WARRIOR_ARMOR_MID[19][x] = K
# Blue chest stripe
for y in range(7, 10):
    WARRIOR_ARMOR_MID[y][15] = PB
    WARRIOR_ARMOR_MID[y][16] = SB
# Belt with buckle
for x in range(8, 24):
    WARRIOR_ARMOR_MID[14][x] = ST
    WARRIOR_ARMOR_MID[15][x] = MG
WARRIOR_ARMOR_MID[14][15] = GD
WARRIOR_ARMOR_MID[14][16] = GD
check('WARRIOR_ARMOR_MID', WARRIOR_ARMOR_MID, 32, 24)

# ─── Warrior Armor Endgame (32×24) — Ornate plate with blue glow ────────────
WARRIOR_ARMOR_END = blank(32, 24)
# Plate body
for y in range(3, 20):
    w = 8 if y < 6 else 10
    for x in range(16 - w, 16 + w):
        WARRIOR_ARMOR_END[y][x] = LS
# Plate shading (darker at edges)
for y in range(4, 19):
    w = 7 if y < 6 else 9
    WARRIOR_ARMOR_END[y][16 - w] = ST
    WARRIOR_ARMOR_END[y][16 + w] = ST
# Grand pauldrons with blue gems
for y in range(0, 6):
    for x in range(4, 12):
        WARRIOR_ARMOR_END[y][x] = LS
    for x in range(20, 28):
        WARRIOR_ARMOR_END[y][x] = LS
# Pauldron spike accents
WARRIOR_ARMOR_END[0][7] = NW
WARRIOR_ARMOR_END[0][8] = NW
WARRIOR_ARMOR_END[0][23] = NW
WARRIOR_ARMOR_END[0][24] = NW
# Blue gems on pauldrons
WARRIOR_ARMOR_END[3][8] = PB
WARRIOR_ARMOR_END[3][9] = HB
WARRIOR_ARMOR_END[3][22] = PB
WARRIOR_ARMOR_END[3][23] = HB
# Pauldron outlines
for y in range(0, 6):
    WARRIOR_ARMOR_END[y][4] = K
    WARRIOR_ARMOR_END[y][11] = K
    WARRIOR_ARMOR_END[y][20] = K
    WARRIOR_ARMOR_END[y][27] = K
for x in range(4, 12):
    WARRIOR_ARMOR_END[0][x] = K
for x in range(20, 28):
    WARRIOR_ARMOR_END[0][x] = K
# Chest emblem (blue diamond)
for i in range(3):
    WARRIOR_ARMOR_END[8 - i][15 - i] = PB
    WARRIOR_ARMOR_END[8 - i][16 + i] = PB
    WARRIOR_ARMOR_END[10 + i][15 - i] = SB
    WARRIOR_ARMOR_END[10 + i][16 + i] = SB
WARRIOR_ARMOR_END[9][15] = HB
WARRIOR_ARMOR_END[9][16] = HB
# Body outline
for y in range(3, 20):
    w = 8 if y < 6 else 10
    WARRIOR_ARMOR_END[y][16 - w] = K
    WARRIOR_ARMOR_END[y][16 + w - 1] = K
for x in range(8, 24):
    WARRIOR_ARMOR_END[2][x] = K
    WARRIOR_ARMOR_END[20][x] = K
# Gold belt
for x in range(7, 25):
    WARRIOR_ARMOR_END[15][x] = GD
    WARRIOR_ARMOR_END[16][x] = DG
# Gold buckle
WARRIOR_ARMOR_END[15][15] = YL
WARRIOR_ARMOR_END[15][16] = YL
# Blue trim at bottom
for x in range(8, 24):
    WARRIOR_ARMOR_END[19][x] = PB
check('WARRIOR_ARMOR_END', WARRIOR_ARMOR_END, 32, 24)


# ═══════════════════════════════════════════════════════════════════════════════
# MAGE EQUIPMENT
# Color identity: purple/violet + spell glow accents
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Mage Staff (32×24) ──────────────────────────────────────────────────────
# Arcane staff with crystal head, purple rune markings
MAGE_STAFF = blank(32, 24)
# Staff shaft (vertical, centered)
for y in range(4, 22):
    MAGE_STAFF[y][15] = BN
    MAGE_STAFF[y][16] = DT
# Crystal head (diamond shape at top)
for i in range(4):
    for dx in range(-i, i + 1):
        x = 15 + dx
        if 0 <= x < 32:
            MAGE_STAFF[3 - i][x] = MV
            if abs(dx) <= i - 1:
                MAGE_STAFF[3 - i][x] = SG
# Crystal glow center
MAGE_STAFF[2][15] = NW
MAGE_STAFF[2][16] = NW
MAGE_STAFF[1][15] = SG
MAGE_STAFF[1][16] = SG
# Crystal outline
MAGE_STAFF[0][15] = K
MAGE_STAFF[0][16] = K
for i in range(4):
    lx = 15 - i - 1
    rx = 16 + i + 1
    if 0 <= lx < 32:
        MAGE_STAFF[3 - i][lx] = K
    if 0 <= rx < 32:
        MAGE_STAFF[3 - i][rx] = K
# Purple rune markings on shaft
for y in [7, 11, 15, 19]:
    MAGE_STAFF[y][15] = MP
    MAGE_STAFF[y][16] = MV
# Staff ferrule (bottom cap)
MAGE_STAFF[22][15] = ST
MAGE_STAFF[22][16] = LS
MAGE_STAFF[23][15] = MG
MAGE_STAFF[23][16] = ST
# Wrap detail
for y in range(5, 7):
    MAGE_STAFF[y][15] = MP
    MAGE_STAFF[y][16] = MP
check('MAGE_STAFF', MAGE_STAFF, 32, 24)

# ─── Mage Orb (32×24) ────────────────────────────────────────────────────────
# Floating arcane orb on a stand, purple glow
MAGE_ORB = blank(32, 24)
# Orb (circle, center)
for y in range(2, 16):
    for x in range(8, 24):
        dx, dy = x - 15.5, y - 8.5
        dist = (dx * dx + dy * dy) ** 0.5
        if dist <= 6:
            MAGE_ORB[y][x] = MP
        if dist <= 5:
            MAGE_ORB[y][x] = MV
        if dist <= 3:
            MAGE_ORB[y][x] = SG
        if dist <= 1.5:
            MAGE_ORB[y][x] = NW
# Orb outline
for y in range(2, 16):
    for x in range(8, 24):
        dx, dy = x - 15.5, y - 8.5
        dist = (dx * dx + dy * dy) ** 0.5
        if 5.5 <= dist <= 6.5:
            MAGE_ORB[y][x] = K
# Sparkle highlights
MAGE_ORB[4][12] = NW
MAGE_ORB[5][18] = NW
MAGE_ORB[10][13] = PY
# Stand (small pedestal below orb)
for y in range(15, 20):
    w = 5 - (y - 15)
    if w < 2:
        w = 2
    for x in range(16 - w, 16 + w):
        MAGE_ORB[y][x] = ST
# Stand base
for x in range(11, 21):
    MAGE_ORB[20][x] = MG
    MAGE_ORB[21][x] = ST
# Stand outline
for x in range(11, 21):
    MAGE_ORB[22][x] = K
for y in range(15, 22):
    for x in range(6, 26):
        if MAGE_ORB[y][x] != _ and (x == 0 or MAGE_ORB[y][x - 1] == _):
            MAGE_ORB[y][x] = K
        if MAGE_ORB[y][x] != _ and MAGE_ORB[y][x] != K and (x == 31 or MAGE_ORB[y][min(x + 1, 31)] == _):
            pass  # keep
check('MAGE_ORB', MAGE_ORB, 32, 24)

# ─── Mage Armor Basic (32×24) — Simple cloth robes ──────────────────────────
MAGE_ARMOR_BASIC = blank(32, 24)
# Robe body (flowing, wide at bottom)
for y in range(3, 22):
    w = min(10, 4 + y // 3)
    for x in range(16 - w, 16 + w):
        MAGE_ARMOR_BASIC[y][x] = PM
# Lighter inner
for y in range(4, 20):
    w = min(8, 3 + y // 3)
    for x in range(16 - w, 16 + w):
        MAGE_ARMOR_BASIC[y][x] = MP
# Collar
for x in range(13, 19):
    MAGE_ARMOR_BASIC[3][x] = PM
    MAGE_ARMOR_BASIC[4][x] = PM
# Hood shadow
for x in range(12, 20):
    MAGE_ARMOR_BASIC[2][x] = PM
# Outline
for y in range(2, 22):
    w = min(10, 4 + y // 3)
    lx = 16 - w
    rx = 16 + w - 1
    if 0 <= lx < 32:
        MAGE_ARMOR_BASIC[y][lx] = K
    if 0 <= rx < 32:
        MAGE_ARMOR_BASIC[y][rx] = K
for x in range(12, 20):
    MAGE_ARMOR_BASIC[1][x] = K
for x in range(6, 26):
    if MAGE_ARMOR_BASIC[21][x] != _:
        MAGE_ARMOR_BASIC[22][x] = K
# Simple rope belt
for x in range(10, 22):
    MAGE_ARMOR_BASIC[12][x] = SN
    MAGE_ARMOR_BASIC[13][x] = BN
check('MAGE_ARMOR_BASIC', MAGE_ARMOR_BASIC, 32, 24)

# ─── Mage Armor Mid (32×24) — Mystic robes with rune accents ────────────────
MAGE_ARMOR_MID = blank(32, 24)
# Robe body
for y in range(2, 22):
    w = min(11, 4 + y // 3)
    for x in range(16 - w, 16 + w):
        MAGE_ARMOR_MID[y][x] = MP
# Lighter center panel
for y in range(5, 20):
    for x in range(14, 18):
        MAGE_ARMOR_MID[y][x] = MV
# Rune markings along edges
for y in range(6, 20, 3):
    w = min(10, 3 + y // 3)
    MAGE_ARMOR_MID[y][16 - w + 1] = SG
    MAGE_ARMOR_MID[y][16 + w - 2] = SG
# Hood (pointed)
for x in range(11, 21):
    MAGE_ARMOR_MID[1][x] = PM
for x in range(13, 19):
    MAGE_ARMOR_MID[0][x] = K
MAGE_ARMOR_MID[0][15] = PM
MAGE_ARMOR_MID[0][16] = PM
# Shoulder epaulets
for y in range(3, 6):
    for x in range(7, 12):
        MAGE_ARMOR_MID[y][x] = MV
    for x in range(20, 25):
        MAGE_ARMOR_MID[y][x] = MV
# Outline
for y in range(1, 22):
    w = min(11, 4 + y // 3)
    MAGE_ARMOR_MID[y][16 - w] = K
    MAGE_ARMOR_MID[y][16 + w - 1] = K
for x in range(6, 26):
    if MAGE_ARMOR_MID[21][x] != _:
        MAGE_ARMOR_MID[22][x] = K
# Silver clasp belt
for x in range(9, 23):
    MAGE_ARMOR_MID[13][x] = LS
    MAGE_ARMOR_MID[14][x] = MG
MAGE_ARMOR_MID[13][15] = SG
MAGE_ARMOR_MID[13][16] = SG
check('MAGE_ARMOR_MID', MAGE_ARMOR_MID, 32, 24)

# ─── Mage Armor Endgame (32×24) — Arcane vestments with glow ────────────────
MAGE_ARMOR_END = blank(32, 24)
# Grand robe body
for y in range(1, 23):
    w = min(12, 5 + y // 3)
    for x in range(16 - w, 16 + w):
        MAGE_ARMOR_END[y][x] = MP
# Inner luminous panel
for y in range(4, 21):
    for x in range(13, 19):
        MAGE_ARMOR_END[y][x] = MV
# Glowing rune line down center
for y in range(5, 20):
    MAGE_ARMOR_END[y][15] = SG
    MAGE_ARMOR_END[y][16] = SG
# Arcane collar
for x in range(10, 22):
    MAGE_ARMOR_END[2][x] = SG
    MAGE_ARMOR_END[3][x] = MV
# Grand hood
for x in range(12, 20):
    MAGE_ARMOR_END[0][x] = PM
for x in range(14, 18):
    MAGE_ARMOR_END[0][x] = K  # deep shadow
# Ornate pauldrons
for y in range(2, 7):
    for x in range(4, 11):
        MAGE_ARMOR_END[y][x] = MV
    for x in range(21, 28):
        MAGE_ARMOR_END[y][x] = MV
# Pauldron gems
MAGE_ARMOR_END[4][7] = NW
MAGE_ARMOR_END[4][8] = SG
MAGE_ARMOR_END[4][23] = NW
MAGE_ARMOR_END[4][24] = SG
# Outline
for y in range(0, 23):
    w = min(12, 5 + y // 3)
    lx = 16 - w
    rx = 16 + w - 1
    if 0 <= lx < 32 and MAGE_ARMOR_END[y][lx] != _:
        MAGE_ARMOR_END[y][max(0, lx - 1)] = K
    if 0 <= rx < 32 and MAGE_ARMOR_END[y][rx] != _:
        MAGE_ARMOR_END[y][min(31, rx + 1)] = K
for y in range(2, 7):
    MAGE_ARMOR_END[y][4] = K
    MAGE_ARMOR_END[y][10] = K
    MAGE_ARMOR_END[y][21] = K
    MAGE_ARMOR_END[y][27] = K
for x in range(4, 11):
    MAGE_ARMOR_END[1][x] = K
for x in range(21, 28):
    MAGE_ARMOR_END[1][x] = K
for x in range(4, 28):
    if MAGE_ARMOR_END[22][x] != _:
        MAGE_ARMOR_END[23][x] = K
# Gold trim at hem
for x in range(5, 27):
    if MAGE_ARMOR_END[21][x] != _ and MAGE_ARMOR_END[21][x] != K:
        MAGE_ARMOR_END[21][x] = GD
    if MAGE_ARMOR_END[22][x] != _ and MAGE_ARMOR_END[22][x] != K:
        MAGE_ARMOR_END[22][x] = DG
check('MAGE_ARMOR_END', MAGE_ARMOR_END, 32, 24)


# ═══════════════════════════════════════════════════════════════════════════════
# RANGER EQUIPMENT
# Color identity: forest greens + earth browns, nature/stealth
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Ranger Bow (32×24) ──────────────────────────────────────────────────────
# Recurve bow with green accents
RANGER_BOW = blank(32, 24)
# Bow limb (curved arc from top to bottom, left side)
for y in range(1, 23):
    # Parabolic curve
    t = (y - 12) / 11.0  # -1 to 1
    bx = int(10 + 8 * (1 - t * t))  # peaks at center
    if 0 <= bx < 32:
        RANGER_BOW[y][bx] = BN
        if bx + 1 < 32:
            RANGER_BOW[y][bx + 1] = DT
# Green wraps at grip
for y in range(9, 15):
    t = (y - 12) / 11.0
    bx = int(10 + 8 * (1 - t * t))
    if 0 <= bx < 32:
        RANGER_BOW[y][bx] = FG
        if bx + 1 < 32:
            RANGER_BOW[y][bx + 1] = LG
# Bowstring (vertical, right of bow)
for y in range(2, 22):
    RANGER_BOW[y][10] = LS
# String nock points
RANGER_BOW[1][10] = K
RANGER_BOW[22][10] = K
# Bow tips
RANGER_BOW[0][14] = FG
RANGER_BOW[0][15] = K
RANGER_BOW[23][14] = FG
RANGER_BOW[23][15] = K
# Arrow (resting on bow, horizontal)
for x in range(4, 26):
    RANGER_BOW[12][x] = SN if x < 20 else ST
# Arrowhead
RANGER_BOW[11][25] = K
RANGER_BOW[12][26] = ST
RANGER_BOW[13][25] = K
# Fletching
RANGER_BOW[11][5] = FG
RANGER_BOW[12][4] = FG
RANGER_BOW[13][5] = FG
check('RANGER_BOW', RANGER_BOW, 32, 24)

# ─── Ranger Daggers (32×24) ──────────────────────────────────────────────────
# Paired daggers crossed, forest green handles
RANGER_DAGGERS = blank(32, 24)
# Left dagger (top-left to bottom-right)
for i in range(14):
    dx, dy = 5 + i, 4 + i
    if 0 <= dx < 32 and 0 <= dy < 24:
        RANGER_DAGGERS[dy][dx] = LS  # blade
        if dx + 1 < 32:
            RANGER_DAGGERS[dy][dx + 1] = NW  # highlight
# Left dagger handle
for i in range(4):
    hx, hy = 17 + i, 16 + i
    if 0 <= hx < 32 and 0 <= hy < 24:
        RANGER_DAGGERS[hy][hx] = FG
        if hx + 1 < 32:
            RANGER_DAGGERS[hy][hx + 1] = DF
# Left crossguard
if 16 < 24:
    for x in range(15, 20):
        RANGER_DAGGERS[15][x] = BN

# Right dagger (top-right to bottom-left)
for i in range(14):
    dx, dy = 26 - i, 4 + i
    if 0 <= dx < 32 and 0 <= dy < 24:
        RANGER_DAGGERS[dy][dx] = LS
        if dx - 1 >= 0:
            RANGER_DAGGERS[dy][dx - 1] = NW
# Right dagger handle
for i in range(4):
    hx, hy = 14 - i, 16 + i
    if 0 <= hx < 32 and 0 <= hy < 24:
        RANGER_DAGGERS[hy][hx] = FG
        if hx - 1 >= 0:
            RANGER_DAGGERS[hy][hx - 1] = DF
# Right crossguard
for x in range(12, 17):
    RANGER_DAGGERS[15][x] = BN
# Tips
RANGER_DAGGERS[3][5] = K
RANGER_DAGGERS[3][26] = K
check('RANGER_DAGGERS', RANGER_DAGGERS, 32, 24)

# ─── Ranger Armor Basic (32×24) — Light hide vest ───────────────────────────
RANGER_ARMOR_BASIC = blank(32, 24)
# Hide body
for y in range(3, 18):
    w = 6 if y < 6 else 7
    for x in range(16 - w, 16 + w):
        RANGER_ARMOR_BASIC[y][x] = DT
# Lighter chest area
for y in range(5, 14):
    for x in range(12, 20):
        RANGER_ARMOR_BASIC[y][x] = SN
# Outline
for y in range(3, 18):
    w = 6 if y < 6 else 7
    RANGER_ARMOR_BASIC[y][16 - w] = K
    RANGER_ARMOR_BASIC[y][16 + w - 1] = K
for x in range(10, 22):
    RANGER_ARMOR_BASIC[2][x] = K
    RANGER_ARMOR_BASIC[18][x] = K
# Green stitching along edges
for y in range(5, 16, 2):
    RANGER_ARMOR_BASIC[y][10] = FG
    RANGER_ARMOR_BASIC[y][21] = FG
# Simple cord belt
for x in range(10, 22):
    RANGER_ARMOR_BASIC[13][x] = BN
check('RANGER_ARMOR_BASIC', RANGER_ARMOR_BASIC, 32, 24)

# ─── Ranger Armor Mid (32×24) — Reinforced leather with leaf motif ──────────
RANGER_ARMOR_MID = blank(32, 24)
# Reinforced body
for y in range(3, 19):
    w = 7 if y < 5 else 8
    for x in range(16 - w, 16 + w):
        RANGER_ARMOR_MID[y][x] = BN
# Green leather overlay panels
for y in range(4, 17):
    for x in range(11, 21):
        RANGER_ARMOR_MID[y][x] = DF
# Leaf emblem on chest (small diamond)
RANGER_ARMOR_MID[7][15] = LG
RANGER_ARMOR_MID[7][16] = LG
RANGER_ARMOR_MID[8][14] = FG
RANGER_ARMOR_MID[8][15] = BG
RANGER_ARMOR_MID[8][16] = BG
RANGER_ARMOR_MID[8][17] = FG
RANGER_ARMOR_MID[9][15] = LG
RANGER_ARMOR_MID[9][16] = LG
# Shoulder guards
for y in range(2, 5):
    for x in range(7, 12):
        RANGER_ARMOR_MID[y][x] = DT
    for x in range(20, 25):
        RANGER_ARMOR_MID[y][x] = DT
# Green trim
for y in range(2, 5):
    RANGER_ARMOR_MID[y][7] = FG
    RANGER_ARMOR_MID[y][11] = FG
    RANGER_ARMOR_MID[y][20] = FG
    RANGER_ARMOR_MID[y][24] = FG
# Outline
for y in range(3, 19):
    w = 7 if y < 5 else 8
    RANGER_ARMOR_MID[y][16 - w] = K
    RANGER_ARMOR_MID[y][16 + w - 1] = K
for x in range(9, 23):
    RANGER_ARMOR_MID[2][x] = K
    RANGER_ARMOR_MID[19][x] = K
# Belt with green buckle
for x in range(9, 23):
    RANGER_ARMOR_MID[14][x] = BN
    RANGER_ARMOR_MID[15][x] = BD
RANGER_ARMOR_MID[14][15] = LG
RANGER_ARMOR_MID[14][16] = LG
check('RANGER_ARMOR_MID', RANGER_ARMOR_MID, 32, 24)

# ─── Ranger Armor Endgame (32×24) — Shadow cloak, dark green/black ──────────
RANGER_ARMOR_END = blank(32, 24)
# Cloak outer (flowing shape, dark)
for y in range(0, 23):
    w = min(13, 5 + (y * 2) // 3)
    for x in range(16 - w, 16 + w):
        RANGER_ARMOR_END[y][x] = DF
# Inner body (slightly lighter)
for y in range(4, 20):
    w = min(8, 3 + y // 3)
    for x in range(16 - w, 16 + w):
        RANGER_ARMOR_END[y][x] = FG
# Hood
for x in range(10, 22):
    RANGER_ARMOR_END[0][x] = DF
for x in range(12, 20):
    RANGER_ARMOR_END[1][x] = K  # shadow inside hood
# Cloak edge detail (lighter green scalloped edge)
for x in range(4, 28):
    if RANGER_ARMOR_END[22][x] != _:
        RANGER_ARMOR_END[22][x] = LG if x % 3 == 0 else FG
# Shadow armor chest plate
for y in range(6, 14):
    for x in range(12, 20):
        RANGER_ARMOR_END[y][x] = DK
# Leaf clasp at neck
RANGER_ARMOR_END[3][15] = BG
RANGER_ARMOR_END[3][16] = BG
RANGER_ARMOR_END[4][14] = LG
RANGER_ARMOR_END[4][15] = FL
RANGER_ARMOR_END[4][16] = FL
RANGER_ARMOR_END[4][17] = LG
# Outline
for y in range(0, 23):
    w = min(13, 5 + (y * 2) // 3)
    lx = 16 - w
    rx = 16 + w - 1
    if 0 <= lx < 32:
        RANGER_ARMOR_END[y][lx] = K
    if 0 <= rx < 32:
        RANGER_ARMOR_END[y][rx] = K
for x in range(3, 29):
    if RANGER_ARMOR_END[22][x] != _ and (x == 3 or RANGER_ARMOR_END[22][x - 1] == _):
        pass
    if RANGER_ARMOR_END[22][x] != _:
        RANGER_ARMOR_END[23][x] = K  # bottom outline
# Belt with hidden daggers
for x in range(9, 23):
    RANGER_ARMOR_END[14][x] = BD
# Small dagger handles on belt
RANGER_ARMOR_END[14][11] = LS
RANGER_ARMOR_END[14][20] = LS
check('RANGER_ARMOR_END', RANGER_ARMOR_END, 32, 24)


# ═══════════════════════════════════════════════════════════════════════════════
# ARTISAN EQUIPMENT
# Color identity: warm browns/gold, earth tones, crafting motifs
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Artisan Hammer (32×24) ──────────────────────────────────────────────────
# Master crafting hammer, gold-inlaid
ARTISAN_HAMMER = blank(32, 24)
# Handle (diagonal)
for i in range(12):
    hx, hy = 6 + i, 18 - i
    if 0 <= hx < 32 and 0 <= hy < 24:
        ARTISAN_HAMMER[hy][hx] = BN
        if hx + 1 < 32:
            ARTISAN_HAMMER[hy][hx + 1] = DT
# Handle wrapping (gold accent)
for i in [2, 4, 6, 8]:
    hx, hy = 6 + i, 18 - i
    if 0 <= hx < 32 and 0 <= hy < 24:
        ARTISAN_HAMMER[hy][hx] = DG
        if hx + 1 < 32:
            ARTISAN_HAMMER[hy][hx + 1] = GD
# Hammer head (larger, ornate)
for y in range(3, 11):
    for x in range(14, 27):
        ARTISAN_HAMMER[y][x] = LS
# Head outline
for y in range(2, 12):
    for x in range(13, 28):
        if y == 2 or y == 11 or x == 13 or x == 27:
            ARTISAN_HAMMER[y][x] = K
# Gold inlay stripe
for x in range(15, 26):
    ARTISAN_HAMMER[6][x] = GD
    ARTISAN_HAMMER[7][x] = DG
# Highlight
for x in range(15, 26):
    ARTISAN_HAMMER[4][x] = NW
# Shadow
for x in range(15, 26):
    ARTISAN_HAMMER[10][x] = ST
check('ARTISAN_HAMMER', ARTISAN_HAMMER, 32, 24)

# ─── Artisan Tools (32×24) ──────────────────────────────────────────────────
# Toolkit: tongs + chisel crossed, with small gem
ARTISAN_TOOLS = blank(32, 24)
# Tongs (left diagonal)
for i in range(16):
    tx, ty = 4 + i, 3 + i
    if 0 <= tx < 32 and 0 <= ty < 24:
        ARTISAN_TOOLS[ty][tx] = ST
# Tongs handle
for i in range(5):
    ARTISAN_TOOLS[18 + i // 2][18 + i] = BN if i < 3 else SN
# Chisel (right diagonal, crossing)
for i in range(16):
    cx, cy = 26 - i, 3 + i
    if 0 <= cx < 32 and 0 <= cy < 24:
        ARTISAN_TOOLS[cy][cx] = LS
# Chisel handle
for i in range(5):
    ARTISAN_TOOLS[18 + i // 2][12 - i] = BN if i < 3 else SN
# Chisel tip (sharp)
ARTISAN_TOOLS[3][26] = NW
ARTISAN_TOOLS[4][25] = NW
# Tongs grip (at center crossing)
for x in range(14, 18):
    ARTISAN_TOOLS[11][x] = DG
    ARTISAN_TOOLS[12][x] = GD
# Small gem held by tongs
ARTISAN_TOOLS[9][14] = PB
ARTISAN_TOOLS[9][15] = HB
ARTISAN_TOOLS[10][14] = SB
ARTISAN_TOOLS[10][15] = PB
check('ARTISAN_TOOLS', ARTISAN_TOOLS, 32, 24)

# ─── Artisan Armor Basic (32×24) — Simple work apron ────────────────────────
ARTISAN_ARMOR_BASIC = blank(32, 24)
# Apron body
for y in range(4, 20):
    for x in range(10, 22):
        ARTISAN_ARMOR_BASIC[y][x] = SN
# Apron straps
for y in range(2, 6):
    ARTISAN_ARMOR_BASIC[y][11] = DT
    ARTISAN_ARMOR_BASIC[y][12] = DT
    ARTISAN_ARMOR_BASIC[y][19] = DT
    ARTISAN_ARMOR_BASIC[y][20] = DT
# Outline
for y in range(4, 20):
    ARTISAN_ARMOR_BASIC[y][9] = K
    ARTISAN_ARMOR_BASIC[y][22] = K
for x in range(9, 23):
    ARTISAN_ARMOR_BASIC[3][x] = K
    ARTISAN_ARMOR_BASIC[20][x] = K
# Pocket
for y in range(12, 16):
    for x in range(13, 19):
        ARTISAN_ARMOR_BASIC[y][x] = DT
for x in range(13, 19):
    ARTISAN_ARMOR_BASIC[12][x] = BN
# Simple cord belt
for x in range(10, 22):
    ARTISAN_ARMOR_BASIC[10][x] = BN
    ARTISAN_ARMOR_BASIC[11][x] = BD
check('ARTISAN_ARMOR_BASIC', ARTISAN_ARMOR_BASIC, 32, 24)

# ─── Artisan Armor Mid (32×24) — Studded leather apron ──────────────────────
ARTISAN_ARMOR_MID = blank(32, 24)
# Reinforced body
for y in range(3, 20):
    w = 7 if y < 5 else 8
    for x in range(16 - w, 16 + w):
        ARTISAN_ARMOR_MID[y][x] = DT
# Leather plate center
for y in range(5, 17):
    for x in range(11, 21):
        ARTISAN_ARMOR_MID[y][x] = SN
# Metal studs
for y in range(6, 16, 3):
    for x in range(12, 20, 3):
        ARTISAN_ARMOR_MID[y][x] = LS
# Shoulder guards (leather)
for y in range(2, 5):
    for x in range(7, 12):
        ARTISAN_ARMOR_MID[y][x] = BN
    for x in range(20, 25):
        ARTISAN_ARMOR_MID[y][x] = BN
# Outline
for y in range(3, 20):
    w = 7 if y < 5 else 8
    ARTISAN_ARMOR_MID[y][16 - w] = K
    ARTISAN_ARMOR_MID[y][16 + w - 1] = K
for x in range(9, 23):
    ARTISAN_ARMOR_MID[2][x] = K
    ARTISAN_ARMOR_MID[20][x] = K
# Gold belt with tool loops
for x in range(9, 23):
    ARTISAN_ARMOR_MID[13][x] = GD
    ARTISAN_ARMOR_MID[14][x] = DG
# Tool loop details
ARTISAN_ARMOR_MID[14][11] = ST
ARTISAN_ARMOR_MID[14][15] = ST
ARTISAN_ARMOR_MID[14][20] = ST
# Gold stitching
for y in range(5, 18, 3):
    ARTISAN_ARMOR_MID[y][10] = DS
    ARTISAN_ARMOR_MID[y][21] = DS
check('ARTISAN_ARMOR_MID', ARTISAN_ARMOR_MID, 32, 24)

# ─── Artisan Armor Endgame (32×24) — Master craftsman regalia ───────────────
ARTISAN_ARMOR_END = blank(32, 24)
# Grand body
for y in range(2, 21):
    w = 8 if y < 5 else 10
    for x in range(16 - w, 16 + w):
        ARTISAN_ARMOR_END[y][x] = DT
# Rich leather center
for y in range(4, 19):
    for x in range(10, 22):
        ARTISAN_ARMOR_END[y][x] = SN
# Gold filigree trim
for y in range(5, 18):
    ARTISAN_ARMOR_END[y][10] = GD
    ARTISAN_ARMOR_END[y][21] = GD
# Master emblem (anvil + star, center)
ARTISAN_ARMOR_END[7][15] = GD
ARTISAN_ARMOR_END[7][16] = GD
ARTISAN_ARMOR_END[8][14] = YL
ARTISAN_ARMOR_END[8][15] = NW
ARTISAN_ARMOR_END[8][16] = NW
ARTISAN_ARMOR_END[8][17] = YL
ARTISAN_ARMOR_END[9][15] = GD
ARTISAN_ARMOR_END[9][16] = GD
ARTISAN_ARMOR_END[10][14] = ST  # anvil base
ARTISAN_ARMOR_END[10][15] = LS
ARTISAN_ARMOR_END[10][16] = LS
ARTISAN_ARMOR_END[10][17] = ST
# Ornate pauldrons
for y in range(1, 6):
    for x in range(5, 12):
        ARTISAN_ARMOR_END[y][x] = SN
    for x in range(20, 27):
        ARTISAN_ARMOR_END[y][x] = SN
# Gold rivets on pauldrons
ARTISAN_ARMOR_END[3][7] = GD
ARTISAN_ARMOR_END[3][8] = GD
ARTISAN_ARMOR_END[3][23] = GD
ARTISAN_ARMOR_END[3][24] = GD
# Pauldron outlines
for y in range(1, 6):
    ARTISAN_ARMOR_END[y][5] = K
    ARTISAN_ARMOR_END[y][11] = K
    ARTISAN_ARMOR_END[y][20] = K
    ARTISAN_ARMOR_END[y][26] = K
for x in range(5, 12):
    ARTISAN_ARMOR_END[0][x] = K
for x in range(20, 27):
    ARTISAN_ARMOR_END[0][x] = K
# Body outline
for y in range(2, 21):
    w = 8 if y < 5 else 10
    ARTISAN_ARMOR_END[y][16 - w] = K
    ARTISAN_ARMOR_END[y][16 + w - 1] = K
for x in range(8, 24):
    ARTISAN_ARMOR_END[1][x] = K
    ARTISAN_ARMOR_END[21][x] = K
# Grand gold belt
for x in range(7, 25):
    ARTISAN_ARMOR_END[14][x] = GD
    ARTISAN_ARMOR_END[15][x] = YL
# Belt buckle (gem)
ARTISAN_ARMOR_END[14][15] = NW
ARTISAN_ARMOR_END[14][16] = NW
ARTISAN_ARMOR_END[15][15] = PY
ARTISAN_ARMOR_END[15][16] = PY
check('ARTISAN_ARMOR_END', ARTISAN_ARMOR_END, 32, 24)


# ═══════════════════════════════════════════════════════════════════════════════
# 16×16 INVENTORY ICONS
# Miniature versions of each equipment piece for the inventory UI
# ═══════════════════════════════════════════════════════════════════════════════

def make_icon_sword(blade_color, hilt_color, gem_color):
    """Generic sword icon 16×16"""
    icon = blank(16, 16)
    # Blade diagonal
    for i in range(9):
        bx, by = 3 + i, 12 - i
        if 0 <= bx < 16 and 0 <= by < 16:
            icon[by][bx] = blade_color
            if bx + 1 < 16 and by >= 0:
                icon[by][bx + 1] = NW
    # Crossguard
    for x in range(2, 6):
        icon[11][x] = hilt_color
    # Handle
    icon[13][2] = BN
    icon[14][1] = BN
    # Pommel gem
    icon[15][1] = gem_color
    # Tip
    icon[3][12] = K
    return icon

def make_icon_shield(body_color, accent_color, boss_color):
    """Generic shield icon 16×16"""
    icon = blank(16, 16)
    # Shield body (kite)
    for y in range(1, 14):
        hw = max(1, 5 - max(0, (y - 7)))
        for x in range(8 - hw, 8 + hw + 1):
            if 0 <= x < 16:
                icon[y][x] = body_color
    # Outline
    for y in range(1, 14):
        hw = max(1, 5 - max(0, (y - 7)))
        if 8 - hw >= 0:
            icon[y][8 - hw] = K
        if 8 + hw < 16:
            icon[y][8 + hw] = K
    for x in range(3, 13):
        if icon[1][x] != _:
            icon[0][x] = K
    icon[14][8] = K
    # Boss
    icon[5][8] = boss_color
    icon[6][7] = boss_color
    icon[6][8] = NW
    icon[6][9] = boss_color
    # Accent stripe
    for x in range(5, 12):
        if icon[3][x] != _ and icon[3][x] != K:
            icon[3][x] = accent_color
    return icon

def make_icon_staff(shaft_color, crystal_color, glow_color):
    """Generic staff icon 16×16"""
    icon = blank(16, 16)
    # Shaft
    for y in range(4, 15):
        icon[y][7] = shaft_color
        icon[y][8] = shaft_color
    # Crystal (diamond)
    icon[1][7] = crystal_color
    icon[1][8] = crystal_color
    icon[2][6] = crystal_color
    icon[2][7] = glow_color
    icon[2][8] = glow_color
    icon[2][9] = crystal_color
    icon[3][7] = crystal_color
    icon[3][8] = crystal_color
    # Glow
    icon[0][7] = K
    icon[0][8] = K
    # Rune marks
    icon[7][7] = crystal_color
    icon[7][8] = glow_color
    icon[11][7] = crystal_color
    icon[11][8] = glow_color
    # Ferrule
    icon[15][7] = MG
    icon[15][8] = ST
    return icon

def make_icon_orb(orb_color, glow_color, inner_color):
    """Generic orb icon 16×16"""
    icon = blank(16, 16)
    for y in range(2, 11):
        for x in range(4, 13):
            dx, dy = x - 8, y - 6
            dist = (dx * dx + dy * dy) ** 0.5
            if dist <= 4:
                icon[y][x] = orb_color
            if dist <= 3:
                icon[y][x] = glow_color
            if dist <= 1.5:
                icon[y][x] = inner_color
            if 3.5 <= dist <= 4.5:
                icon[y][x] = K
    # Sparkle
    icon[3][6] = NW
    # Stand
    for x in range(6, 11):
        icon[11][x] = MG
        icon[12][x] = ST
    return icon

def make_icon_bow(limb_color, grip_color):
    """Generic bow icon 16×16"""
    icon = blank(16, 16)
    # Bow arc
    for y in range(1, 15):
        t = (y - 8) / 7.0
        bx = int(5 + 5 * (1 - t * t))
        if 0 <= bx < 16:
            icon[y][bx] = limb_color
    # Grip
    for y in range(6, 10):
        t = (y - 8) / 7.0
        bx = int(5 + 5 * (1 - t * t))
        if 0 <= bx < 16:
            icon[y][bx] = grip_color
    # String
    for y in range(2, 14):
        icon[y][5] = LS
    # Arrow
    for x in range(3, 14):
        icon[8][x] = SN if x < 11 else ST
    icon[7][13] = K
    icon[8][14] = ST
    icon[9][13] = K
    return icon

def make_icon_daggers(blade_color, handle_color):
    """Crossed daggers icon 16×16"""
    icon = blank(16, 16)
    # Left dagger
    for i in range(10):
        dx, dy = 2 + i, 2 + i
        if 0 <= dx < 16 and 0 <= dy < 16:
            icon[dy][dx] = blade_color if i < 7 else handle_color
    # Right dagger
    for i in range(10):
        dx, dy = 13 - i, 2 + i
        if 0 <= dx < 16 and 0 <= dy < 16:
            icon[dy][dx] = blade_color if i < 7 else handle_color
    # Crossguards
    for x in range(7, 10):
        icon[8][x] = BN
    return icon

def make_icon_hammer(head_color, handle_color, accent_color):
    """Hammer icon 16×16"""
    icon = blank(16, 16)
    # Handle
    for i in range(8):
        hx, hy = 3 + i, 12 - i
        if 0 <= hx < 16 and 0 <= hy < 16:
            icon[hy][hx] = handle_color
    # Head
    for y in range(2, 7):
        for x in range(9, 15):
            icon[y][x] = head_color
    # Outline
    for y in range(1, 8):
        for x in range(8, 16):
            if y == 1 or y == 7 or x == 8 or x == 15:
                if 0 <= x < 16:
                    icon[y][x] = K
    # Accent
    for x in range(10, 14):
        icon[4][x] = accent_color
    # Highlight
    for x in range(10, 14):
        icon[3][x] = NW
    return icon

def make_icon_tools(metal_color, handle_color):
    """Tools icon 16×16"""
    icon = blank(16, 16)
    # Tongs (left diagonal)
    for i in range(10):
        tx, ty = 2 + i, 2 + i
        if 0 <= tx < 16 and 0 <= ty < 16:
            icon[ty][tx] = metal_color
    # Chisel (right diagonal)
    for i in range(10):
        cx, cy = 13 - i, 2 + i
        if 0 <= cx < 16 and 0 <= cy < 16:
            icon[cy][cx] = LS
    # Handles
    for i in range(3):
        icon[12 + i][12 + i // 2] = handle_color
        icon[12 + i][3 - i // 2] = handle_color
    # Center gem
    icon[6][7] = PB
    icon[6][8] = HB
    return icon

def make_icon_armor(body_color, accent_color, trim_color):
    """Generic armor icon 16×16 (vest shape)"""
    icon = blank(16, 16)
    # Body
    for y in range(2, 13):
        w = 4 if y < 4 else 5
        for x in range(8 - w, 8 + w):
            icon[y][x] = body_color
    # Collar
    for x in range(5, 11):
        icon[2][x] = trim_color
    # Accent stripe
    for y in range(5, 11):
        icon[y][7] = accent_color
        icon[y][8] = accent_color
    # Outline
    for y in range(2, 13):
        w = 4 if y < 4 else 5
        icon[y][8 - w] = K
        icon[y][8 + w - 1] = K
    for x in range(4, 12):
        icon[1][x] = K
        icon[13][x] = K
    # Belt
    for x in range(4, 12):
        icon[10][x] = trim_color
    return icon


# ═══════════════════════════════════════════════════════════════════════════════
# CREATE ALL ICONS
# ═══════════════════════════════════════════════════════════════════════════════

# Warrior icons
ICON_WARRIOR_SWORD   = make_icon_sword(LS, ST, PB)
ICON_WARRIOR_SHIELD  = make_icon_shield(LS, PB, NW)
ICON_ARMOR_WARRIOR_B = make_icon_armor(DT, SN, PB)
ICON_ARMOR_WARRIOR_M = make_icon_armor(MG, LS, PB)
ICON_ARMOR_WARRIOR_E = make_icon_armor(LS, NW, GD)

# Mage icons
ICON_MAGE_STAFF      = make_icon_staff(BN, MV, SG)
ICON_MAGE_ORB        = make_icon_orb(MP, MV, NW)
ICON_ARMOR_MAGE_B    = make_icon_armor(MP, MV, SN)
ICON_ARMOR_MAGE_M    = make_icon_armor(MV, SG, LS)
ICON_ARMOR_MAGE_E    = make_icon_armor(MV, NW, GD)

# Ranger icons
ICON_RANGER_BOW      = make_icon_bow(BN, FG)
ICON_RANGER_DAGGERS  = make_icon_daggers(LS, FG)
ICON_ARMOR_RANGER_B  = make_icon_armor(DT, SN, FG)
ICON_ARMOR_RANGER_M  = make_icon_armor(BN, FG, LG)
ICON_ARMOR_RANGER_E  = make_icon_armor(DF, FG, LG)

# Artisan icons
ICON_ARTISAN_HAMMER  = make_icon_hammer(LS, BN, GD)
ICON_ARTISAN_TOOLS   = make_icon_tools(ST, BN)
ICON_ARMOR_ARTISAN_B = make_icon_armor(SN, DT, BN)
ICON_ARMOR_ARTISAN_M = make_icon_armor(DT, SN, GD)
ICON_ARMOR_ARTISAN_E = make_icon_armor(SN, GD, YL)


# ═══════════════════════════════════════════════════════════════════════════════
# SPRITE SHEETS (one per class: 5 items × 32px wide = 160×24)
# ═══════════════════════════════════════════════════════════════════════════════

SHEET_WARRIOR = hstack([WARRIOR_SWORD, WARRIOR_SHIELD, WARRIOR_ARMOR_BASIC, WARRIOR_ARMOR_MID, WARRIOR_ARMOR_END])
SHEET_MAGE    = hstack([MAGE_STAFF, MAGE_ORB, MAGE_ARMOR_BASIC, MAGE_ARMOR_MID, MAGE_ARMOR_END])
SHEET_RANGER  = hstack([RANGER_BOW, RANGER_DAGGERS, RANGER_ARMOR_BASIC, RANGER_ARMOR_MID, RANGER_ARMOR_END])
SHEET_ARTISAN = hstack([ARTISAN_HAMMER, ARTISAN_TOOLS, ARTISAN_ARMOR_BASIC, ARTISAN_ARMOR_MID, ARTISAN_ARMOR_END])

# Icon sheets (one per class: 5 items × 16px wide = 80×16)
ICON_SHEET_WARRIOR = hstack([ICON_WARRIOR_SWORD, ICON_WARRIOR_SHIELD, ICON_ARMOR_WARRIOR_B, ICON_ARMOR_WARRIOR_M, ICON_ARMOR_WARRIOR_E])
ICON_SHEET_MAGE    = hstack([ICON_MAGE_STAFF, ICON_MAGE_ORB, ICON_ARMOR_MAGE_B, ICON_ARMOR_MAGE_M, ICON_ARMOR_MAGE_E])
ICON_SHEET_RANGER  = hstack([ICON_RANGER_BOW, ICON_RANGER_DAGGERS, ICON_ARMOR_RANGER_B, ICON_ARMOR_RANGER_M, ICON_ARMOR_RANGER_E])
ICON_SHEET_ARTISAN = hstack([ICON_ARTISAN_HAMMER, ICON_ARTISAN_TOOLS, ICON_ARMOR_ARTISAN_B, ICON_ARMOR_ARTISAN_M, ICON_ARMOR_ARTISAN_E])


# ═══════════════════════════════════════════════════════════════════════════════
# WRITE ALL FILES
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print('=== PIX-306: Class Equipment & Weapon Sprites ===\n')

    # ── Individual equipment overlays (32×24) ──
    print('Equipment overlays (32x24):')
    equip_items = {
        # Warrior
        'equip_weapon_warrior_sword':   WARRIOR_SWORD,
        'equip_weapon_warrior_shield':  WARRIOR_SHIELD,
        'equip_armor_warrior_basic':    WARRIOR_ARMOR_BASIC,
        'equip_armor_warrior_mid':      WARRIOR_ARMOR_MID,
        'equip_armor_warrior_endgame':  WARRIOR_ARMOR_END,
        # Mage
        'equip_weapon_mage_staff':      MAGE_STAFF,
        'equip_weapon_mage_orb':        MAGE_ORB,
        'equip_armor_mage_basic':       MAGE_ARMOR_BASIC,
        'equip_armor_mage_mid':         MAGE_ARMOR_MID,
        'equip_armor_mage_endgame':     MAGE_ARMOR_END,
        # Ranger
        'equip_weapon_ranger_bow':      RANGER_BOW,
        'equip_weapon_ranger_daggers':  RANGER_DAGGERS,
        'equip_armor_ranger_basic':     RANGER_ARMOR_BASIC,
        'equip_armor_ranger_mid':       RANGER_ARMOR_MID,
        'equip_armor_ranger_endgame':   RANGER_ARMOR_END,
        # Artisan
        'equip_weapon_artisan_hammer':  ARTISAN_HAMMER,
        'equip_weapon_artisan_tools':   ARTISAN_TOOLS,
        'equip_armor_artisan_basic':    ARTISAN_ARMOR_BASIC,
        'equip_armor_artisan_mid':      ARTISAN_ARMOR_MID,
        'equip_armor_artisan_endgame':  ARTISAN_ARMOR_END,
    }
    for name, pixels in equip_items.items():
        write_png(os.path.join(EQUIP_DIR, f'{name}.png'), pixels)

    # ── Inventory icons (16×16) ──
    print('\nInventory icons (16x16):')
    icon_items = {
        # Warrior
        'icon_equip_warrior_sword':      ICON_WARRIOR_SWORD,
        'icon_equip_warrior_shield':     ICON_WARRIOR_SHIELD,
        'icon_equip_armor_warrior_basic':    ICON_ARMOR_WARRIOR_B,
        'icon_equip_armor_warrior_mid':      ICON_ARMOR_WARRIOR_M,
        'icon_equip_armor_warrior_endgame':  ICON_ARMOR_WARRIOR_E,
        # Mage
        'icon_equip_mage_staff':         ICON_MAGE_STAFF,
        'icon_equip_mage_orb':           ICON_MAGE_ORB,
        'icon_equip_armor_mage_basic':       ICON_ARMOR_MAGE_B,
        'icon_equip_armor_mage_mid':         ICON_ARMOR_MAGE_M,
        'icon_equip_armor_mage_endgame':     ICON_ARMOR_MAGE_E,
        # Ranger
        'icon_equip_ranger_bow':         ICON_RANGER_BOW,
        'icon_equip_ranger_daggers':     ICON_RANGER_DAGGERS,
        'icon_equip_armor_ranger_basic':     ICON_ARMOR_RANGER_B,
        'icon_equip_armor_ranger_mid':       ICON_ARMOR_RANGER_M,
        'icon_equip_armor_ranger_endgame':   ICON_ARMOR_RANGER_E,
        # Artisan
        'icon_equip_artisan_hammer':     ICON_ARTISAN_HAMMER,
        'icon_equip_artisan_tools':      ICON_ARTISAN_TOOLS,
        'icon_equip_armor_artisan_basic':    ICON_ARMOR_ARTISAN_B,
        'icon_equip_armor_artisan_mid':      ICON_ARMOR_ARTISAN_M,
        'icon_equip_armor_artisan_endgame':  ICON_ARMOR_ARTISAN_E,
    }
    for name, pixels in icon_items.items():
        write_png(os.path.join(ICON_DIR, f'{name}.png'), pixels)

    # ── Class equipment sprite sheets (160×24) ──
    print('\nEquipment sprite sheets (160x24):')
    write_png(os.path.join(SHEET_DIR, 'equip_sheet_warrior.png'), SHEET_WARRIOR)
    write_png(os.path.join(SHEET_DIR, 'equip_sheet_mage.png'),    SHEET_MAGE)
    write_png(os.path.join(SHEET_DIR, 'equip_sheet_ranger.png'),   SHEET_RANGER)
    write_png(os.path.join(SHEET_DIR, 'equip_sheet_artisan.png'),  SHEET_ARTISAN)

    # ── Icon sprite sheets (80×16) ──
    print('\nIcon sprite sheets (80x16):')
    write_png(os.path.join(ICON_DIR, 'icon_sheet_equip_warrior.png'), ICON_SHEET_WARRIOR)
    write_png(os.path.join(ICON_DIR, 'icon_sheet_equip_mage.png'),    ICON_SHEET_MAGE)
    write_png(os.path.join(ICON_DIR, 'icon_sheet_equip_ranger.png'),   ICON_SHEET_RANGER)
    write_png(os.path.join(ICON_DIR, 'icon_sheet_equip_artisan.png'),  ICON_SHEET_ARTISAN)

    total = len(equip_items) + len(icon_items) + 8  # sheets
    print(f'\n✓ Generated {total} PNG files for class equipment.')
    print(f'  - {len(equip_items)} equipment overlays (32x24)')
    print(f'  - {len(icon_items)} inventory icons (16x16)')
    print(f'  - 4 equipment sprite sheets (160x24)')
    print(f'  - 4 icon sprite sheets (80x16)')


if __name__ == '__main__':
    main()
